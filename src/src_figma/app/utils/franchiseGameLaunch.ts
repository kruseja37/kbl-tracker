import { getTeamColors } from "@/config/teamColors";
import type { Player as TeamRosterPlayer, Pitcher as TeamRosterPitcher } from "@/app/components/TeamRoster";
import type {
  GameLockLineupSnapshots,
  OpposingPitcherHand,
  OptimalLineupSnapshot,
} from "../../../types/managerWpa";
import type { ScheduledGame } from "../../../utils/scheduleStorage";
import { getTeam, type Team } from "../../../utils/leagueBuilderStorage";
import { getFranchiseTeam } from "../../../utils/franchisePlayerStorage";
import { getReporterForTeam } from "../../../utils/reporterStorage";
import { autoGenerateReporterForTeam } from "../../../utils/reporterAssignment";
import {
  LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
  resolveManagerForTeam,
} from "../../../utils/managerIdentityStorage";
import { getApproachingMilestones, type MilestoneWatch } from "../../../utils/milestoneDetector";
import { getAllCareerBatting, getAllCareerPitching } from "../../../utils/careerStorage";
import { getSeasonBattingStats, getSeasonPitchingStats } from "../../../utils/seasonStorage";
import {
  applyFranchiseStarterSelectionToRosterSnapshot,
  buildFranchiseGameTrackerRoster,
  buildFranchisePregameReadiness,
  collectFranchiseRosterPlayerIds,
  type FranchiseGameTrackerRoster,
} from "./franchiseGameTrackerRoster";
import { withPregameManagerNavigationState } from "./pregameNavigationState";
import { selectOptimalLineupForOpposingPitcher } from "../../../utils/optimalLineup";

export interface FranchiseGameSeasonConfig {
  league?: string | null;
  season?: {
    useDH?: boolean;
    inningsPerGame?: number;
    extraInningsRule?: string;
    extraInningsRunnerDelay?: 1 | 2;
  };
}

export interface FranchisePregameData {
  awayPlayers: TeamRosterPlayer[];
  awayPitchers: TeamRosterPitcher[];
  homePlayers: TeamRosterPlayer[];
  homePitchers: TeamRosterPitcher[];
  awayTeamId: string;
  homeTeamId: string;
  awayTeamName: string;
  homeTeamName: string;
  gameNumber: number;
  scheduleGameId?: string;
  useDH: boolean;
  selectedAwayStarterIdx: number;
  selectedHomeStarterIdx: number;
  awayOptimalLineups?: {
    vsRHP?: OptimalLineupSnapshot;
    vsLHP?: OptimalLineupSnapshot;
  };
  homeOptimalLineups?: {
    vsRHP?: OptimalLineupSnapshot;
    vsLHP?: OptimalLineupSnapshot;
  };
  milestoneWatches?: MilestoneWatch[];
}

export class FranchiseGameLaunchBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FranchiseGameLaunchBlockedError";
  }
}

export function resolveFranchiseGameUseDH(franchiseConfig: FranchiseGameSeasonConfig | null | undefined): boolean {
  return franchiseConfig?.season?.useDH ?? false;
}

export function resolveFranchiseExtraInnings(
  franchiseConfig: FranchiseGameSeasonConfig | null | undefined,
): { extraInningRunner: boolean; extraInningRunnerDelay: 1 | 2 } {
  switch (franchiseConfig?.season?.extraInningsRule) {
    case "Runner on 2nd":
      return {
        extraInningRunner: true,
        extraInningRunnerDelay: franchiseConfig.season.extraInningsRunnerDelay ?? 1,
      };
    case "Standard":
      return { extraInningRunner: false, extraInningRunnerDelay: 1 };
    case "Sudden Death":
      return { extraInningRunner: false, extraInningRunnerDelay: 1 };
    default:
      return { extraInningRunner: false, extraInningRunnerDelay: 1 };
  }
}

export function getFranchiseStarterHand(
  pitcher: TeamRosterPitcher | undefined,
): OpposingPitcherHand {
  return (pitcher?.throwingHand || "R") === "L" ? "L" : "R";
}

function getSelectedStarterIndex(pitchers: TeamRosterPitcher[]): number {
  const starterIndex = pitchers.findIndex((pitcher) => pitcher.isStarter);
  return starterIndex >= 0 ? starterIndex : 0;
}

async function getVisibleFranchiseTeam(franchiseId: string | undefined, teamId: string) {
  if (franchiseId) {
    const franchiseTeam = await getFranchiseTeam(franchiseId, teamId);
    if (franchiseTeam) return franchiseTeam;
  }
  return getTeam(teamId);
}

async function ensureFranchiseReporterForTeam({
  teamId,
  teamName,
  leagueId,
  franchiseId,
  colors,
}: {
  teamId: string;
  teamName: string;
  leagueId?: string;
  franchiseId?: string;
  colors?: {
    primary?: string;
    secondary?: string;
  };
}) {
  const existing = await getReporterForTeam(teamId, leagueId, franchiseId);
  if (existing) return;

  await autoGenerateReporterForTeam(
    {
      id: teamId,
      name: teamName,
      colors,
    },
    leagueId,
    franchiseId,
  );
}

function countCompletedGamesForTeam(games: ScheduledGame[], teamId: string): number {
  return games.filter((game) => game.awayTeamId === teamId || game.homeTeamId === teamId).length;
}

export function getFranchisePregameReadiness(data: FranchisePregameData) {
  return buildFranchisePregameReadiness({
    teams: [
      {
        teamName: data.awayTeamName,
        players: data.awayPlayers,
        pitchers: data.awayPitchers,
        selectedStarterIdx: data.selectedAwayStarterIdx,
        useDH: data.useDH,
      },
      {
        teamName: data.homeTeamName,
        players: data.homePlayers,
        pitchers: data.homePitchers,
        selectedStarterIdx: data.selectedHomeStarterIdx,
        useDH: data.useDH,
      },
    ],
  });
}

export async function prepareFranchisePregameData({
  franchiseId,
  leagueId,
  useDH,
  nextGame,
  completedGames,
  teamNameMap,
  repairFranchisePersistence,
}: {
  franchiseId?: string;
  leagueId?: string;
  useDH: boolean;
  nextGame: ScheduledGame | null | undefined;
  completedGames: ScheduledGame[];
  teamNameMap?: Record<string, string>;
  repairFranchisePersistence?: () => Promise<void>;
}): Promise<FranchisePregameData> {
  if (!nextGame) {
    throw new FranchiseGameLaunchBlockedError("No scheduled game is ready to score.");
  }

  await repairFranchisePersistence?.();

  const awayTeamId = nextGame.awayTeamId;
  const homeTeamId = nextGame.homeTeamId;
  const awayTeamName = teamNameMap?.[awayTeamId] || awayTeamId;
  const homeTeamName = teamNameMap?.[homeTeamId] || homeTeamId;
  const awayGamesPlayed = countCompletedGamesForTeam(completedGames, awayTeamId);
  const homeGamesPlayed = countCompletedGamesForTeam(completedGames, homeTeamId);

  const [awayRoster, homeRoster] = await Promise.all([
    buildFranchiseGameTrackerRoster(awayTeamId, {
      franchiseId,
      leagueId,
      useDH,
      teamGamesPlayed: awayGamesPlayed,
    }),
    buildFranchiseGameTrackerRoster(homeTeamId, {
      franchiseId,
      leagueId,
      useDH,
      teamGamesPlayed: homeGamesPlayed,
    }),
  ]);

  const missingRosterTeams: string[] = [];
  if (awayRoster.players.length === 0 || awayRoster.pitchers.length === 0) {
    missingRosterTeams.push(awayTeamName.toUpperCase());
  }
  if (homeRoster.players.length === 0 || homeRoster.pitchers.length === 0) {
    missingRosterTeams.push(homeTeamName.toUpperCase());
  }
  if (missingRosterTeams.length > 0) {
    throw new FranchiseGameLaunchBlockedError(
      `Franchise roster data is incomplete for ${missingRosterTeams.join(" and ")}. Game launch blocked.`,
    );
  }

  return {
    awayPlayers: awayRoster.players,
    awayPitchers: awayRoster.pitchers,
    homePlayers: homeRoster.players,
    homePitchers: homeRoster.pitchers,
    awayTeamId,
    homeTeamId,
    awayTeamName: awayTeamName.toUpperCase(),
    homeTeamName: homeTeamName.toUpperCase(),
    gameNumber: nextGame.gameNumber ?? 1,
    scheduleGameId: nextGame.id,
    useDH,
    selectedAwayStarterIdx: getSelectedStarterIndex(awayRoster.pitchers),
    selectedHomeStarterIdx: getSelectedStarterIndex(homeRoster.pitchers),
    awayOptimalLineups: awayRoster.optimalLineups,
    homeOptimalLineups: homeRoster.optimalLineups,
  };
}

export async function loadFranchisePregameMilestoneWatches({
  awayRoster,
  homeRoster,
  seasonId,
}: {
  awayRoster: FranchiseGameTrackerRoster;
  homeRoster: FranchiseGameTrackerRoster;
  seasonId: string;
}): Promise<MilestoneWatch[]> {
  const [careerBatters, careerPitchers] = await Promise.all([
    getAllCareerBatting(),
    getAllCareerPitching(),
  ]);
  const [seasonBatters, seasonPitchers] = seasonId
    ? await Promise.all([
        getSeasonBattingStats(seasonId),
        getSeasonPitchingStats(seasonId),
      ])
    : [[], []];

  const careerBatMap = new Map(careerBatters.map((b) => [b.playerId, b]));
  const careerPitMap = new Map(careerPitchers.map((p) => [p.playerId, p]));
  const seasonBatMap = new Map(seasonBatters.map((b) => [b.playerId, b]));
  const seasonPitMap = new Map(seasonPitchers.map((p) => [p.playerId, p]));
  const achieved = new Set<string>();
  const playerIds = collectFranchiseRosterPlayerIds([awayRoster, homeRoster]);

  const watches: MilestoneWatch[] = [];
  for (const playerId of playerIds) {
    watches.push(
      ...getApproachingMilestones(
        careerBatMap.get(playerId) || null,
        careerPitMap.get(playerId) || null,
        seasonBatMap.get(playerId) || null,
        seasonPitMap.get(playerId) || null,
        achieved,
      ),
    );
  }
  watches.sort((a, b) => a.neededForMilestone - b.neededForMilestone);
  return watches;
}

export function loadFranchisePregameMilestoneWatchesForData({
  data,
  seasonId,
}: {
  data: FranchisePregameData;
  seasonId: string;
}) {
  return loadFranchisePregameMilestoneWatches({
    awayRoster: {
      players: data.awayPlayers,
      pitchers: data.awayPitchers,
      optimalLineups: data.awayOptimalLineups,
    },
    homeRoster: {
      players: data.homePlayers,
      pitchers: data.homePitchers,
      optimalLineups: data.homeOptimalLineups,
    },
    seasonId,
  });
}

export function markFranchisePostGameColumnsPending(): void {
  sessionStorage.setItem(
    "kbl-pending-post-game-columns-enabled",
    JSON.stringify(true),
  );
}

export async function buildFranchiseGameTrackerNavigation({
  data,
  franchiseId,
  leagueId,
  seasonId,
  seasonNumber,
  franchiseConfig,
  stadiumMap,
  getTeamRecord,
}: {
  data: FranchisePregameData;
  franchiseId?: string;
  leagueId?: string;
  seasonId: string;
  seasonNumber: number;
  franchiseConfig?: FranchiseGameSeasonConfig | null;
  stadiumMap?: Record<string, string>;
  getTeamRecord: (teamId: string) => string;
}): Promise<{ pathname: string; state: Record<string, unknown> }> {
  const readiness = getFranchisePregameReadiness(data);
  if (!readiness.isReady) {
    throw new FranchiseGameLaunchBlockedError(`Lineup readiness required: ${readiness.issues.join(" | ")}`);
  }

  const [awayTeamData, homeTeamData] = await Promise.all([
    getVisibleFranchiseTeam(franchiseId, data.awayTeamId),
    getVisibleFranchiseTeam(franchiseId, data.homeTeamId),
  ]);
  const managerInstanceId = franchiseId || leagueId || LEAGUE_BUILDER_MANAGER_INSTANCE_ID;
  const [awayManager, homeManager] = await Promise.all([
    resolveManagerForTeam({
      team: {
        id: data.awayTeamId,
        name: data.awayTeamName,
        managerId: awayTeamData?.managerId,
        managerName: awayTeamData?.managerName,
      },
      mode: "franchise",
      instanceId: managerInstanceId,
      fallbackMode: "franchise",
      fallbackInstanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
      persistAssignment: true,
    }),
    resolveManagerForTeam({
      team: {
        id: data.homeTeamId,
        name: data.homeTeamName,
        managerId: homeTeamData?.managerId,
        managerName: homeTeamData?.managerName,
      },
      mode: "franchise",
      instanceId: managerInstanceId,
      fallbackMode: "franchise",
      fallbackInstanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
      persistAssignment: true,
    }),
  ]);

  const finalAwayRoster = applyFranchiseStarterSelectionToRosterSnapshot({
    players: data.awayPlayers,
    pitchers: data.awayPitchers,
    selectedStarterIdx: data.selectedAwayStarterIdx,
    useDH: data.useDH,
  });
  const finalHomeRoster = applyFranchiseStarterSelectionToRosterSnapshot({
    players: data.homePlayers,
    pitchers: data.homePitchers,
    selectedStarterIdx: data.selectedHomeStarterIdx,
    useDH: data.useDH,
  });
  const finalAwayPitchers = finalAwayRoster.pitchers;
  const finalHomePitchers = finalHomeRoster.pitchers;
  const awayStarter = finalAwayPitchers.find((pitcher) => pitcher.isStarter);
  const homeStarter = finalHomePitchers.find((pitcher) => pitcher.isStarter);
  const optimalLineupSnapshots: GameLockLineupSnapshots = {
    away: selectOptimalLineupForOpposingPitcher(data.awayOptimalLineups, homeStarter),
    home: selectOptimalLineupForOpposingPitcher(data.homeOptimalLineups, awayStarter),
  };

  await Promise.all([
    ensureFranchiseReporterForTeam({
      teamId: data.awayTeamId,
      teamName: data.awayTeamName,
      leagueId,
      franchiseId,
      colors: {
        primary: awayTeamData?.colors.primary,
        secondary: awayTeamData?.colors.secondary,
      },
    }),
    ensureFranchiseReporterForTeam({
      teamId: data.homeTeamId,
      teamName: data.homeTeamName,
      leagueId,
      franchiseId,
      colors: {
        primary: homeTeamData?.colors.primary,
        secondary: homeTeamData?.colors.secondary,
      },
    }),
  ]);

  const extraInningsLaunchState = resolveFranchiseExtraInnings(franchiseConfig);
  return {
    pathname: `/game-tracker/franchise-g${data.gameNumber}`,
    state: withPregameManagerNavigationState({
      gameMode: "franchise" as const,
      awayTeamId: data.awayTeamId,
      homeTeamId: data.homeTeamId,
      awayTeamName: data.awayTeamName,
      homeTeamName: data.homeTeamName,
      awayTeamAbbreviation: awayTeamData?.abbreviation,
      homeTeamAbbreviation: homeTeamData?.abbreviation,
      awayPlayers: finalAwayRoster.players.length > 0 ? finalAwayRoster.players : undefined,
      awayPitchers: finalAwayPitchers.length > 0 ? finalAwayPitchers : undefined,
      homePlayers: finalHomeRoster.players.length > 0 ? finalHomeRoster.players : undefined,
      homePitchers: finalHomePitchers.length > 0 ? finalHomePitchers : undefined,
      awayTeamColor: awayTeamData?.colors.primary || getTeamColors(data.awayTeamId).primary,
      awayTeamBorderColor: awayTeamData?.colors.secondary || getTeamColors(data.awayTeamId).secondary,
      homeTeamColor: homeTeamData?.colors.primary || getTeamColors(data.homeTeamId).primary,
      homeTeamBorderColor: homeTeamData?.colors.secondary || getTeamColors(data.homeTeamId).secondary,
      awayRecord: getTeamRecord(data.awayTeamId),
      homeRecord: getTeamRecord(data.homeTeamId),
      stadiumName: stadiumMap?.[data.homeTeamId] ?? data.homeTeamName,
      franchiseId,
      leagueId,
      seasonId,
      statsScopeId: seasonId,
      competitionType: "franchise" as const,
      competitionId: franchiseId,
      useDH: data.useDH,
      optimalLineupSnapshots,
      liveBeatReporterEnabled: false,
      postGameColumnsEnabled: true,
      scheduleGameId: data.scheduleGameId,
      seasonNumber,
      gameNumber: data.gameNumber,
      totalInnings: franchiseConfig?.season?.inningsPerGame ?? 9,
      ...extraInningsLaunchState,
    }, {
      awayManagerId: awayManager.managerId,
      awayManagerName: awayManager.managerName,
      homeManagerId: homeManager.managerId,
      homeManagerName: homeManager.managerName,
    }),
  };
}

export function getRecordLabelFromStandings(standings: unknown, teamId: string): string {
  if (!standings || typeof standings !== "object") return "0-0";
  try {
    for (const conference of Object.values(standings)) {
      if (!conference || typeof conference !== "object") continue;
      for (const division of Object.values(conference as Record<string, unknown>)) {
        if (!Array.isArray(division)) continue;
        const entry = division.find(
          (standing: { team?: string; wins?: number; losses?: number }) =>
            standing.team && standing.team.toLowerCase() === teamId.toLowerCase(),
        );
        if (entry) return `${entry.wins}-${entry.losses}`;
      }
    }
  } catch {
    return "0-0";
  }
  return "0-0";
}
