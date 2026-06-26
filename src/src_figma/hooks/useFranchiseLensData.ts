/**
 * useFranchiseLensData — the GREENLIGHT-GATED real-data adapter for the aged-Fenway
 * franchise-lens hub (Stream A).
 *
 * Per FRANCHISE_LENS_REALDATA_ADAPTER_PLAN.md: the FranchiseLensHub is a PURE VIEW
 * component fed one `{ teams, active, hub }` bundle. This hook produces that bundle from the
 * real franchise engines/stores (the same reads the legacy hub uses), so the view is unchanged.
 *
 * Phase 1 (DONE): teams / active / roster / pulse / standings.
 * Phase 2 (THIS): stadium identity + park factors, schedule, almanac (leaders + trophy case).
 *   - Stadium spray/records/aggregates are EVENT-driven (completed-game archive); that event load
 *     is shared with the Phase-3 player-drawer per-player spray, so it is folded into Phase 3.
 *     Phase 2 wires the real stadium IDENTITY + FACTORS (off the Team object) + an empty spray shell.
 * Phases 3-4 (player drawer depth / news / moments / checkpoint): still undefined here.
 *
 * With the living-season Phase-2 flags OFF (normal save), soul surfaces read their real-but-neutral
 * state. With a GAMELESS save the schedule/almanac-leaders/spray are legitimately empty until games
 * are played — CORRECT, not a bug; the surfaces fill against a real played save.
 *
 * Lens team is pinned to controlledTeams[0] (v1; multi-team selector deferred). Rival-red is left
 * undefined until this branch rebases onto the trunk's home-park-rivalry seam — degrades gracefully.
 */
import { useEffect, useMemo, useState } from "react";

import {
  useSeasonStats,
  type BattingLeaderEntry,
  type BattingSortKey,
  type PitchingLeaderEntry,
  type PitchingSortKey,
  type UseSeasonStatsReturn,
} from "../../hooks/useSeasonStats";
import { getFranchiseConfig } from "../../utils/franchiseManager";
import { getFranchiseSeasonId } from "../../utils/franchisePersistenceContract";
import {
  getAllFranchisePlayers,
  getAllFranchiseTeams,
} from "../../utils/franchisePlayerStorage";
import {
  getAllTeams,
  type Player,
  type Team,
} from "../../utils/leagueBuilderStorage";
import { calculateStandings, type TeamStanding } from "../../utils/seasonStorage";
import { getFranchiseDesignationRows } from "../../utils/franchiseDesignationStorage";
import {
  getLiveDesignationBadge,
  getProjectedDesignationBadge,
  type FranchisePlayerDesignationRecord,
} from "../../utils/franchiseDesignations";
import {
  listFranchiseMoraleSnapshots,
  type FranchiseMoraleSnapshot,
} from "../../utils/franchiseMoraleState";
import { getPlayerMoraleSpecState } from "../../utils/franchisePlayerMoraleSpecAdapter";
import {
  getAllGamesByFranchise,
  type ScheduledGame,
} from "../../utils/scheduleStorage";
import {
  getAwardWinners,
  getChampionships,
  type AwardWinner,
  type ChampionshipRecord,
} from "../../utils/museumStorage";
import type { StoredFranchiseConfig } from "../../types/franchise";
import type {
  ActiveTeamVM,
  AlmanacVM,
  HubVM,
  LeaderboardVM,
  LeaderEntryVM,
  MoraleHistoryVM,
  PlayerMoraleVM,
  PlayerRowVM,
  PulseVM,
  ScheduleGameVM,
  ScheduleVM,
  SprayRoleVM,
  StadiumVM,
  StandingRowVM,
  StandingsRacesVM,
  TeamPickerVM,
  TrophyVM,
} from "../app/components/franchise/FranchiseLensHub";

const PITCHER_POSITIONS = new Set(["SP", "RP", "CP", "P", "SP/RP"]);
const WHITE = "#F4F1E4";
const NAVY = "#1A2433";

interface TeamMeta {
  abbr: string;
  name: string;
}

interface RawData {
  config: StoredFranchiseConfig | null;
  teams: Team[];
  players: Player[];
  standings: TeamStanding[];
  designations: FranchisePlayerDesignationRecord[];
  moraleSnapshots: FranchiseMoraleSnapshot[];
  schedule: ScheduledGame[];
  championships: ChampionshipRecord[];
  awards: AwardWinner[];
}

export interface UseFranchiseLensDataReturn {
  teams: TeamPickerVM[];
  active: ActiveTeamVM | null;
  hub: HubVM;
  isLoading: boolean;
  error: string | null;
}

function isPitcher(player: Player): boolean {
  return PITCHER_POSITIONS.has(player.primaryPosition as string);
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function money(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${Math.round(value)}`;
}

function rate3(value: number): string {
  return value.toFixed(3).replace(/^0\./, ".");
}

function toMoraleHistory(snapshot: FranchiseMoraleSnapshot | null): MoraleHistoryVM[] {
  if (!snapshot) return [];
  return snapshot.history
    .slice(-6)
    .reverse()
    .map((entry) => ({ delta: Math.round(entry.delta), reason: entry.reason, week: "" }));
}

function mapDesignation(
  row: FranchisePlayerDesignationRecord | undefined,
): { label: string; kind: "gold" | "albatross" } | undefined {
  if (!row) return undefined;
  const badge =
    row.status === "active"
      ? getLiveDesignationBadge(row.type) ?? getProjectedDesignationBadge(row.type)
      : getProjectedDesignationBadge(row.type);
  if (!badge) return undefined;
  return { label: badge.label, kind: row.type === "ALBATROSS" ? "albatross" : "gold" };
}

function buildPlayerRow(
  player: Player,
  teamId: string,
  battingWar: Map<string, number>,
  pitchingWar: Map<string, number>,
  designations: FranchisePlayerDesignationRecord[],
  moraleByPlayer: Map<string, FranchiseMoraleSnapshot>,
): PlayerRowVM {
  const pitcher = isPitcher(player);
  const war = pitcher ? pitchingWar.get(player.id) : battingWar.get(player.id);
  const designation = mapDesignation(
    designations.find((row) => row.playerId === player.id && row.teamId === teamId),
  );
  const snapshot = moraleByPlayer.get(player.id) ?? null;
  const moraleValue = snapshot?.currentValue ?? player.morale ?? 50;
  const morale: PlayerMoraleVM = {
    value: moraleValue,
    state: getPlayerMoraleSpecState(moraleValue),
    trend: "flat",
    history: toMoraleHistory(snapshot),
  };
  return {
    id: player.id,
    number: player.jerseyNumber != null ? String(player.jerseyNumber) : undefined,
    position: player.primaryPosition,
    name: `${player.firstName} ${player.lastName}`.trim(),
    war,
    salary: Number(player.salary) || 0,
    designation,
    morale,
  };
}

function buildStandingsVM(
  teams: Team[],
  standingByTeam: Map<string, TeamStanding>,
  config: StoredFranchiseConfig | null,
): StandingsRacesVM {
  const rows: StandingRowVM[] = teams
    .map((team) => {
      const standing = standingByTeam.get(team.id);
      return {
        teamId: team.id,
        name: team.name,
        abbr: team.abbreviation,
        wins: standing?.wins ?? 0,
        losses: standing?.losses ?? 0,
        winPct: standing?.winPct ?? 0,
        gamesBack: standing?.gamesBack ?? 0,
        lastTenWins: standing?.lastTenWins ?? 0,
        streak: standing?.streak ?? { type: "W", count: 0 },
        runDiff: standing?.runDiff ?? 0,
        home: standing?.homeRecord ?? { wins: 0, losses: 0 },
        away: standing?.awayRecord ?? { wins: 0, losses: 0 },
      };
    })
    .sort((a, b) => b.winPct - a.winPct || b.wins - a.wins || a.name.localeCompare(b.name));
  const groupName = config?.leagueDetails?.name ?? config?.franchiseName ?? "League";
  return { divisions: [{ name: groupName, rows }], races: [] };
}

function buildPulse(
  teamPlayers: Player[],
  activeTeamId: string,
  fanSnapshot: FranchiseMoraleSnapshot | null,
  standings: TeamStanding[],
): PulseVM {
  const moraleValues = teamPlayers.map((player) => player.morale ?? 50);
  const clubhouseAvg = moraleValues.length
    ? Math.round(moraleValues.reduce((sum, value) => sum + value, 0) / moraleValues.length)
    : undefined;
  const payroll = teamPlayers.reduce((sum, player) => sum + (Number(player.salary) || 0), 0);

  const fanMorale = fanSnapshot
    ? { value: fanSnapshot.currentValue, trend: "flat" as const, history: toMoraleHistory(fanSnapshot) }
    : undefined;

  const ranked = [...standings].sort((a, b) => b.winPct - a.winPct);
  const rank = ranked.findIndex((standing) => standing.teamId === activeTeamId);
  const standingLabel =
    rank >= 0 && standings.length > 0 ? `${ordinal(rank + 1)} of ${standings.length}` : undefined;

  return {
    fanMorale,
    clubhouseLabel: clubhouseAvg != null ? getPlayerMoraleSpecState(clubhouseAvg) : undefined,
    clubhouseAvg,
    standingLabel,
    payrollLabel: `${money(payroll)} · ${teamPlayers.length}`,
  };
}

function deriveArchetype(overall: number): string {
  // ParkFactors are ratio-scaled (~1.0 = neutral); the UI renders Math.round(v*100).
  if (overall >= 1.05) return "Bandbox";
  if (overall <= 0.95) return "Pitcher's Cavern";
  return "Neutral";
}

function buildStadiumVM(team: Team): StadiumVM {
  const pf = team.parkFactors;
  const dims = team.stadiumDimensions;
  const factors = pf
    ? {
        overall: pf.overall,
        runs: pf.runs,
        hr: pf.homeRuns,
        confidence: pf.confidence,
        source: pf.source,
      }
    : undefined;
  const emptyRole = (role: SprayRoleVM["role"]): SprayRoleVM => ({
    role,
    dots: [],
    stats: [],
    note: "Batted-ball data fills as games are played.",
  });
  return {
    name: team.stadium || `${team.name} Park`,
    nickname: team.ballparkNickname,
    city: team.location,
    archetype: pf ? deriveArchetype(pf.overall) : undefined,
    dims: dims ? { lf: dims.lf, cf: dims.cf, rf: dims.rf } : undefined,
    factors,
    // homeParkRival deferred to the home-park-rivalry rebase; aggregates/performers/opponents/records
    // are event-driven (foundation report) and folded into Phase 3 with the drawer's per-player spray.
    spray: [emptyRole("batting"), emptyRole("pitching"), emptyRole("fielding")],
  };
}

function buildScheduleVM(
  games: ScheduledGame[],
  activeTeamId: string,
  teamMeta: Map<string, TeamMeta>,
): ScheduleVM | undefined {
  const teamGames = games.filter(
    (game) => game.homeTeamId === activeTeamId || game.awayTeamId === activeTeamId,
  );
  if (teamGames.length === 0) return undefined;

  const toVM = (game: ScheduledGame): ScheduleGameVM => {
    const home = game.homeTeamId === activeTeamId;
    const oppId = home ? game.awayTeamId : game.homeTeamId;
    const vm: ScheduleGameVM = {
      date: game.date || `Day ${game.dayNumber}`,
      opponent: teamMeta.get(oppId)?.abbr ?? oppId,
      home,
    };
    if (game.result) {
      const teamScore = home ? game.result.homeScore : game.result.awayScore;
      const oppScore = home ? game.result.awayScore : game.result.homeScore;
      vm.result = { teamScore, oppScore, win: game.result.winningTeamId === activeTeamId };
    }
    return vm;
  };

  const upcoming = teamGames.filter((game) => !game.result).map(toVM);
  const recent = teamGames.filter((game) => game.result).map(toVM);
  if (upcoming[0]) upcoming[0].isNext = true;
  return { upcoming: upcoming.slice(0, 10), recent: recent.slice(-10).reverse() };
}

function formatBatting(key: BattingSortKey, entry: BattingLeaderEntry): string {
  switch (key) {
    case "avg":
      return rate3(entry.avg);
    case "totalWAR":
      return entry.totalWAR.toFixed(1);
    case "hr":
      return String(entry.homeRuns);
    case "rbi":
      return String(entry.rbi);
    case "sb":
      return String(entry.stolenBases);
    default:
      return String((entry as unknown as Record<string, number>)[key] ?? 0);
  }
}

function formatPitching(key: PitchingSortKey, entry: PitchingLeaderEntry): string {
  switch (key) {
    case "era":
      return entry.era.toFixed(2);
    case "pWAR":
      return entry.pWAR.toFixed(1);
    case "wins":
      return String(entry.wins);
    case "strikeouts":
      return String(entry.strikeouts);
    case "saves":
      return String(entry.saves);
    default:
      return String((entry as unknown as Record<string, number>)[key] ?? 0);
  }
}

const BATTING_BOARDS: { key: BattingSortKey; label: string }[] = [
  { key: "avg", label: "AVG" },
  { key: "hr", label: "HR" },
  { key: "rbi", label: "RBI" },
  { key: "sb", label: "SB" },
  { key: "totalWAR", label: "WAR" },
];
const PITCHING_BOARDS: { key: PitchingSortKey; label: string }[] = [
  { key: "era", label: "ERA" },
  { key: "wins", label: "W" },
  { key: "strikeouts", label: "K" },
  { key: "saves", label: "SV" },
  { key: "pWAR", label: "WAR" },
];

function buildAlmanacVM(
  seasonStats: UseSeasonStatsReturn,
  statsReady: boolean,
  teamMeta: Map<string, TeamMeta>,
  championships: ChampionshipRecord[],
  awards: AwardWinner[],
): AlmanacVM | undefined {
  const battingLeaders: LeaderboardVM[] = [];
  const pitchingLeaders: LeaderboardVM[] = [];

  if (statsReady) {
    for (const board of BATTING_BOARDS) {
      const entries: LeaderEntryVM[] = seasonStats
        .getBattingLeaders(board.key, 3)
        .map((entry, index) => ({
          rank: index + 1,
          name: entry.playerName,
          teamId: entry.teamId,
          teamAbbr: teamMeta.get(entry.teamId)?.abbr ?? entry.teamId,
          value: formatBatting(board.key, entry),
        }));
      if (entries.length) battingLeaders.push({ stat: board.label, entries });
    }
    for (const board of PITCHING_BOARDS) {
      const entries: LeaderEntryVM[] = seasonStats
        .getPitchingLeaders(board.key, 3)
        .map((entry, index) => ({
          rank: index + 1,
          name: entry.playerName,
          teamId: entry.teamId,
          teamAbbr: teamMeta.get(entry.teamId)?.abbr ?? entry.teamId,
          value: formatPitching(board.key, entry),
        }));
      if (entries.length) pitchingLeaders.push({ stat: board.label, entries });
    }
  }

  const trophyCase: TrophyVM[] = [
    ...championships.map((record) => ({
      label: `${record.year} Champions`,
      holder: record.champion,
      teamId: record.championId,
    })),
    ...awards.map((award) => ({
      label: `${award.year} ${award.awardType}`,
      holder: award.playerName,
      teamId: award.teamId,
    })),
  ];

  if (!battingLeaders.length && !pitchingLeaders.length && !trophyCase.length) return undefined;
  return {
    battingLeaders,
    pitchingLeaders,
    trophyCase: trophyCase.length ? trophyCase : undefined,
  };
}

function buildReturn(
  raw: RawData | null,
  viewedTeamId: string | undefined,
  seasonNumber: number,
  seasonStats: UseSeasonStatsReturn,
  statsReady: boolean,
  isLoading: boolean,
  error: string | null,
): UseFranchiseLensDataReturn {
  if (!raw || raw.teams.length === 0) {
    return {
      teams: [],
      active: null,
      hub: {
        pulse: {},
        roster: [],
        loading: isLoading,
        emptyNote: isLoading
          ? undefined
          : "No franchise data found for this id (load a real save, or seed the demo franchise).",
      },
      isLoading,
      error,
    };
  }

  const { config, teams, players, standings, designations, moraleSnapshots, schedule, championships, awards } = raw;

  const teamMeta = new Map<string, TeamMeta>(
    teams.map((team) => [team.id, { abbr: team.abbreviation, name: team.name }]),
  );

  const teamPicker: TeamPickerVM[] = teams.map((team) => ({
    id: team.id,
    name: team.name,
    abbr: team.abbreviation,
    primary: team.colors?.primary ?? WHITE,
  }));

  const controlledFirst = config?.controlledTeams?.[0]?.teamId;
  const activeId = viewedTeamId ?? controlledFirst ?? teams[0].id;
  const activeTeam = teams.find((team) => team.id === activeId) ?? teams[0];

  const standingByTeam = new Map(standings.map((standing) => [standing.teamId, standing]));
  const activeStanding = standingByTeam.get(activeTeam.id);
  const recordLabel = activeStanding ? `${activeStanding.wins}-${activeStanding.losses}` : "0-0";

  const battingWar = new Map<string, number>();
  const pitchingWar = new Map<string, number>();
  if (statsReady) {
    for (const entry of seasonStats.getBattingLeaders("totalWAR", 1000)) {
      battingWar.set(entry.playerId, entry.totalWAR);
    }
    for (const entry of seasonStats.getPitchingLeaders("pWAR", 1000)) {
      pitchingWar.set(entry.playerId, entry.pWAR);
    }
  }

  const playerMoraleById = new Map(
    moraleSnapshots
      .filter((snapshot) => snapshot.targetType === "player" && snapshot.playerId)
      .map((snapshot) => [snapshot.playerId as string, snapshot]),
  );
  const fanSnapshot =
    moraleSnapshots.find(
      (snapshot) => snapshot.targetType === "team-fan" && snapshot.teamId === activeTeam.id,
    ) ?? null;

  const teamPlayers = players.filter((player) =>
    player.leagueAssignments?.some(
      (assignment) => assignment.teamId === activeTeam.id && assignment.rosterStatus === "MLB",
    ),
  );

  const roster: PlayerRowVM[] = teamPlayers
    .map((player) =>
      buildPlayerRow(player, activeTeam.id, battingWar, pitchingWar, designations, playerMoraleById),
    )
    .sort((a, b) => (b.war ?? -Infinity) - (a.war ?? -Infinity) || a.name.localeCompare(b.name));

  const active: ActiveTeamVM = {
    id: activeTeam.id,
    name: activeTeam.name,
    abbr: activeTeam.abbreviation,
    recordLabel,
    primary: activeTeam.colors?.primary ?? WHITE,
    secondary: activeTeam.colors?.secondary ?? NAVY,
    rivalName: undefined,
    rivalId: undefined,
    seasonLabel: `Season ${seasonNumber}`,
    ballparkNickname: activeTeam.ballparkNickname,
    gmName: config?.gm?.displayName ?? config?.gmName,
    managerName: activeTeam.managerName,
  };

  const hub: HubVM = {
    pulse: buildPulse(teamPlayers, activeTeam.id, fanSnapshot, standings),
    roster,
    standings: buildStandingsVM(teams, standingByTeam, config),
    stadium: buildStadiumVM(activeTeam),
    schedule: buildScheduleVM(schedule, activeTeam.id, teamMeta),
    almanac: buildAlmanacVM(seasonStats, statsReady, teamMeta, championships, awards),
    loading: false,
  };

  return { teams: teamPicker, active, hub, isLoading: false, error: null };
}

export function useFranchiseLensData(
  franchiseId: string | undefined,
  seasonNumber = 1,
  viewedTeamId?: string,
): UseFranchiseLensDataReturn {
  const seasonId = franchiseId ? getFranchiseSeasonId(franchiseId, seasonNumber) : "";
  const seasonStats = useSeasonStats(seasonId);

  const [raw, setRaw] = useState<RawData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!franchiseId) {
      setRaw(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    (async () => {
      try {
        const config = await getFranchiseConfig(franchiseId);
        let teams = await getAllFranchiseTeams(franchiseId);
        if (!teams || teams.length === 0) {
          teams = await getAllTeams();
        }
        const players = await getAllFranchisePlayers(franchiseId);
        const standings = await calculateStandings(seasonId);
        const designations = await getFranchiseDesignationRows({
          franchiseId,
          seasonId,
          statsScopeId: seasonId,
        });
        const moraleSnapshots = await listFranchiseMoraleSnapshots(
          franchiseId,
          seasonId,
          seasonId,
          seasonNumber,
        );
        const schedule = await getAllGamesByFranchise(franchiseId, seasonNumber);
        // Museum (champions / award winners) is global all-time history; empty on a fresh franchise.
        const championships = await getChampionships().catch(() => []);
        const awards = await getAwardWinners().catch(() => []);
        if (cancelled) return;
        setRaw({
          config,
          teams: teams ?? [],
          players: players ?? [],
          standings: standings ?? [],
          designations: designations ?? [],
          moraleSnapshots: moraleSnapshots ?? [],
          schedule: schedule ?? [],
          championships: championships ?? [],
          awards: awards ?? [],
        });
        setIsLoading(false);
      } catch (caught) {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : String(caught));
        setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [franchiseId, seasonId, seasonNumber]);

  const statsReady = !seasonStats.isLoading;
  return useMemo(
    () => buildReturn(raw, viewedTeamId, seasonNumber, seasonStats, statsReady, isLoading, error),
    // seasonStats getters are useCallback-stable; statsReady gates the stats-derived rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [raw, viewedTeamId, seasonNumber, statsReady, isLoading, error],
  );
}

export default useFranchiseLensData;
