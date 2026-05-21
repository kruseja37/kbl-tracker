import type { CompletedGameRecord } from "./gameStorage";
import { resolveExhibitionLeagueId } from "./gameStorage";
import { getExhibitionGames, getInstanceGames } from "./almanacQueries";
import {
  getBetweenPlayEvents,
  getGameEvents,
  getGameFieldingEvents,
  getGameHeader,
  type AtBatEvent,
} from "./eventLog";
import {
  deriveKblWpaCredits,
  type KblWpaCredit,
  type KblWpaPlayerTotal,
} from "./kblWpaAttribution";
import {
  getGamePogAwardSet,
  MIN_POSITIVE_WPA,
  type PogAward,
  type PogAwardSet,
  type PogDataQualitySource,
  type PogManagerValueTotal,
} from "./pogAwards";

export type TeamImpactMode = "elimination" | "exhibition";

export interface RoleWpaBreakdown {
  total: number;
  batting: number;
  pitching: number;
  fielding: number;
  baserunning: number;
  catching: number;
}

export interface ManagerWpaBreakdown {
  tacticalManagerWpa: number;
  deploymentWpa: number;
  lineupDeltaWpa: number;
  managerValue: number;
}

export interface TeamMostDecoratedPlayer {
  playerId: string;
  playerName: string;
  points: number;
}

export interface TeamPogSummary {
  points: number;
  rank: number;
  teamCount: number;
  overallWins: number;
  bestHitter: number;
  bestPitcher: number;
  bestBaserunner: number;
  bestFielder: number;
  bestManager: number;
  bestManagerWins: number;
  mostDecoratedPlayer?: TeamMostDecoratedPlayer;
}

export interface TeamImpactBenchmarks {
  totalPlayerWpaRank: number;
  teamCount: number;
  instanceAverageTotalPlayerWpa: number;
  perGameTotalPlayerWpa: number;
  identityLabel: string;
}

export interface TeamImpactAwardCounts {
  overall: number;
  bestHitter: number;
  bestPitcher: number;
  bestBaserunner: number;
  bestFielder: number;
}

export interface TeamImpactPlayContext {
  gameId: string;
  eventId: string;
  value: number;
  label: string;
  inningLabel?: string;
  leverageIndex?: number;
}

export interface PlayerImpactSummary {
  playerId: string;
  playerName: string;
  teamId: string;
  games: number;
  wpa: RoleWpaBreakdown;
  pogPoints: number;
  perGameWpa: number;
  awards: TeamImpactAwardCounts;
  biggestPositivePlay?: TeamImpactPlayContext;
  biggestNegativePlay?: TeamImpactPlayContext;
  highLeverageWpa?: number;
}

export interface TeamImpactDataQuality {
  fullKblWpaGames: number;
  legacyAtBatWpaGames: number;
  storedPogGames: number;
  managerValueOnlyGames: number;
  unavailableGames: number;
  eventLogFailedGames: number;
  warnings: string[];
}

export interface TeamImpactSummary {
  mode: TeamImpactMode;
  instanceId: string;
  teamId: string;
  teamName: string;
  games: number;
  playerWpa: RoleWpaBreakdown;
  managerWpa: ManagerWpaBreakdown;
  pog: TeamPogSummary;
  benchmarks: TeamImpactBenchmarks;
  playerLeaders: PlayerImpactSummary[];
  dataQuality: TeamImpactDataQuality;
}

export interface TeamImpactLeaderboardDataQuality {
  teamCount: number;
  teamGameCount: number;
  fullKblWpaTeamGames: number;
  legacyAtBatWpaTeamGames: number;
  storedPogTeamGames: number;
  managerValueOnlyTeamGames: number;
  unavailableTeamGames: number;
  eventLogFailedTeamGames: number;
  warnings: string[];
}

export interface TeamWpaLeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  games: number;
  value: number;
  perGameWpa: number;
  identityLabel: string;
}

export interface TeamPogPointsLeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  games: number;
  points: number;
  overallWins: number;
  bestManagerWins: number;
  mostDecoratedPlayer?: TeamMostDecoratedPlayer;
}

export interface PlayerWpaLeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  games: number;
  value: number;
  perGameWpa: number;
  roleSplit: RoleWpaBreakdown;
  pogPoints: number;
}

export interface PlayerPogPointsLeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  games: number;
  points: number;
  totalWpa: number;
  perGameWpa: number;
  roleSplit: RoleWpaBreakdown;
  awardCounts: TeamImpactAwardCounts;
}

export interface PlayerAwardLeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  count: number;
  pogPoints: number;
}

export interface BestManagerLeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  count: number;
  managerValue: number;
}

export type TeamImpactRoleLeaderboardKey =
  | "batting"
  | "pitching"
  | "defense"
  | "baserunning";

export interface RoleWpaLeaderboardEntry {
  rank: number;
  role: TeamImpactRoleLeaderboardKey;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  games: number;
  value: number;
  perGameWpa: number;
  roleSplit: RoleWpaBreakdown;
  pogPoints: number;
}

export interface ManagerValueTeamLeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  games: number;
  value: number;
  managerWpa: ManagerWpaBreakdown;
  bestManagerWins: number;
}

export interface HighLeverageWpaLeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  games: number;
  value: number;
  totalWpa: number;
  perGameWpa: number;
  pogPoints: number;
}

export interface TeamImpactLeaderboards {
  teamWpaLeaders: TeamWpaLeaderboardEntry[];
  teamPogPointsLeaders: TeamPogPointsLeaderboardEntry[];
  playerTotalWpaLeaders: PlayerWpaLeaderboardEntry[];
  playerPogPointsLeaders: PlayerPogPointsLeaderboardEntry[];
  overallPogLeaders: PlayerAwardLeaderboardEntry[];
  bestHitterLeaders: PlayerAwardLeaderboardEntry[];
  bestPitcherLeaders: PlayerAwardLeaderboardEntry[];
  bestBaserunnerLeaders: PlayerAwardLeaderboardEntry[];
  bestFielderLeaders: PlayerAwardLeaderboardEntry[];
  bestManagerLeaders: BestManagerLeaderboardEntry[];
  roleWpaLeaders: Record<TeamImpactRoleLeaderboardKey, RoleWpaLeaderboardEntry[]>;
  managerValueTeamLeaders: ManagerValueTeamLeaderboardEntry[];
  highLeverageWpaLeaders: HighLeverageWpaLeaderboardEntry[];
  dataQuality: TeamImpactLeaderboardDataQuality;
}

export interface TeamImpactGameInput {
  game: CompletedGameRecord;
  kblWpaCredits?: KblWpaCredit[];
  awardSet?: PogAwardSet;
  atBatEvents?: AtBatEvent[];
  eventLogAvailable?: boolean;
  eventLogError?: string;
}

export interface BuildTeamImpactSummariesInput {
  mode: TeamImpactMode;
  instanceId: string;
  games: TeamImpactGameInput[];
}

interface PlayerImpactAccumulator {
  playerId: string;
  playerName: string;
  teamId: string;
  gameIds: Set<string>;
  wpa: RoleWpaBreakdown;
  pogPoints: number;
  awards: TeamImpactAwardCounts;
  biggestPositivePlay?: TeamImpactPlayContext;
  biggestNegativePlay?: TeamImpactPlayContext;
  highLeverageWpa: number;
  playContextAvailable: boolean;
  highLeverageMetadataAvailable: boolean;
}

interface TeamImpactAccumulator {
  mode: TeamImpactMode;
  instanceId: string;
  teamId: string;
  teamName: string;
  gameIds: Set<string>;
  playerWpa: RoleWpaBreakdown;
  managerWpa: ManagerWpaBreakdown;
  pog: Omit<TeamPogSummary, "rank" | "teamCount" | "mostDecoratedPlayer">;
  decoratedPlayers: Map<string, TeamMostDecoratedPlayer>;
  playerLeaders: Map<string, PlayerImpactAccumulator>;
  dataQuality: Omit<TeamImpactDataQuality, "warnings">;
}

const DEFAULT_TEAM_COUNT = 0;
const DEFAULT_RANK = 0;

export async function getInstanceTeamImpactSummaries(
  mode: TeamImpactMode,
  instanceId: string,
): Promise<TeamImpactSummary[]> {
  const games = await getInstanceGames(mode, instanceId);
  const impactGames = await Promise.all(games.map(loadTeamImpactGameInput));

  return buildTeamImpactSummaries({
    mode,
    instanceId,
    games: impactGames,
  });
}

export async function getTeamImpactSummary(
  mode: TeamImpactMode,
  instanceId: string,
  teamId: string,
): Promise<TeamImpactSummary | undefined> {
  const summaries = await getInstanceTeamImpactSummaries(mode, instanceId);
  return summaries.find((summary) => summary.teamId === teamId);
}

export async function getInstanceTeamImpactLeaderboards(
  mode: TeamImpactMode,
  instanceId: string,
  limit?: number,
): Promise<TeamImpactLeaderboards> {
  const summaries = await getInstanceTeamImpactSummaries(mode, instanceId);
  return buildTeamImpactLeaderboards(summaries, limit);
}

export async function getAllExhibitionTeamImpactLeaderboards(
  limit?: number,
): Promise<TeamImpactLeaderboards> {
  const games = await getExhibitionGames();
  const impactGames = await Promise.all(games.map(loadTeamImpactGameInput));
  return buildAllExhibitionTeamImpactLeaderboards(impactGames, limit);
}

export function buildAllExhibitionTeamImpactLeaderboards(
  games: TeamImpactGameInput[],
  limit?: number,
): TeamImpactLeaderboards {
  const gamesByLeague = new Map<string, TeamImpactGameInput[]>();

  for (const gameInput of games) {
    const { game } = gameInput;
    if (game.competitionType && game.competitionType !== "exhibition") {
      continue;
    }

    const leagueId = resolveExhibitionLeagueId(game);
    if (!leagueId) continue;

    gamesByLeague.set(leagueId, [...(gamesByLeague.get(leagueId) ?? []), gameInput]);
  }

  const summaries = Array.from(gamesByLeague.entries()).flatMap(([leagueId, leagueGames]) =>
    buildTeamImpactSummaries({
      mode: "exhibition",
      instanceId: leagueId,
      games: leagueGames,
    }),
  );

  return buildTeamImpactLeaderboards(summaries, limit);
}

export function buildTeamImpactLeaderboards(
  summaries: TeamImpactSummary[],
  limit?: number,
): TeamImpactLeaderboards {
  const normalizedLimit = normalizeLeaderboardLimit(limit);
  const playerRows = summaries.flatMap((summary) =>
    summary.playerLeaders.map((player) => ({ summary, player })),
  );

  return {
    teamWpaLeaders: limitEntries(
      summaries
        .filter(hasUsablePlayerWpaData)
        .map((summary) => ({
          teamId: summary.teamId,
          teamName: summary.teamName,
          games: summary.games,
          value: summary.playerWpa.total,
          perGameWpa: summary.benchmarks.perGameTotalPlayerWpa,
          identityLabel: summary.benchmarks.identityLabel,
        }))
        .sort(compareTeamWpaLeaderboardEntries)
        .map((entry, index) => ({ rank: index + 1, ...entry })),
      normalizedLimit,
    ),
    teamPogPointsLeaders: limitEntries(
      summaries
        .filter((summary) => summary.pog.points > 0)
        .map((summary) => ({
          teamId: summary.teamId,
          teamName: summary.teamName,
          games: summary.games,
          points: summary.pog.points,
          overallWins: summary.pog.overallWins,
          bestManagerWins: summary.pog.bestManagerWins,
          mostDecoratedPlayer: summary.pog.mostDecoratedPlayer,
        }))
        .sort(compareTeamPogLeaderboardEntries)
        .map((entry, index) => ({ rank: index + 1, ...entry })),
      normalizedLimit,
    ),
    playerTotalWpaLeaders: limitEntries(
      playerRows
        .filter(({ player }) => isMeaningfulLeaderboardValue(player.wpa.total))
        .map(({ summary, player }) => toPlayerWpaLeaderboardEntry(summary, player))
        .sort(comparePlayerWpaLeaderboardEntries)
        .map((entry, index) => ({ rank: index + 1, ...entry })),
      normalizedLimit,
    ),
    playerPogPointsLeaders: limitEntries(
      playerRows
        .filter(({ player }) => player.pogPoints > 0)
        .map(({ summary, player }) => toPlayerPogLeaderboardEntry(summary, player))
        .sort(comparePlayerPogLeaderboardEntries)
        .map((entry, index) => ({ rank: index + 1, ...entry })),
      normalizedLimit,
    ),
    overallPogLeaders: buildPlayerAwardLeaderboard(
      playerRows,
      "overall",
      normalizedLimit,
    ),
    bestHitterLeaders: buildPlayerAwardLeaderboard(
      playerRows,
      "bestHitter",
      normalizedLimit,
    ),
    bestPitcherLeaders: buildPlayerAwardLeaderboard(
      playerRows,
      "bestPitcher",
      normalizedLimit,
    ),
    bestBaserunnerLeaders: buildPlayerAwardLeaderboard(
      playerRows,
      "bestBaserunner",
      normalizedLimit,
    ),
    bestFielderLeaders: buildPlayerAwardLeaderboard(
      playerRows,
      "bestFielder",
      normalizedLimit,
    ),
    bestManagerLeaders: buildBestManagerLeaderboard(summaries, normalizedLimit),
    roleWpaLeaders: {
      batting: buildRoleWpaLeaderboard(playerRows, "batting", normalizedLimit),
      pitching: buildRoleWpaLeaderboard(playerRows, "pitching", normalizedLimit),
      defense: buildRoleWpaLeaderboard(playerRows, "defense", normalizedLimit),
      baserunning: buildRoleWpaLeaderboard(playerRows, "baserunning", normalizedLimit),
    },
    managerValueTeamLeaders: limitEntries(
      summaries
        .filter((summary) => isMeaningfulLeaderboardValue(summary.managerWpa.managerValue))
        .map((summary) => ({
          teamId: summary.teamId,
          teamName: summary.teamName,
          games: summary.games,
          value: summary.managerWpa.managerValue,
          managerWpa: summary.managerWpa,
          bestManagerWins: summary.pog.bestManagerWins,
        }))
        .sort(compareManagerValueLeaderboardEntries)
        .map((entry, index) => ({ rank: index + 1, ...entry })),
      normalizedLimit,
    ),
    highLeverageWpaLeaders: limitEntries(
      playerRows
        .filter(
          ({ player }) =>
            player.highLeverageWpa !== undefined &&
            isMeaningfulLeaderboardValue(player.highLeverageWpa),
        )
        .map(({ summary, player }) => ({
          playerId: player.playerId,
          playerName: player.playerName,
          teamId: player.teamId,
          teamName: summary.teamName,
          games: player.games,
          value: player.highLeverageWpa ?? 0,
          totalWpa: player.wpa.total,
          perGameWpa: player.perGameWpa,
          pogPoints: player.pogPoints,
        }))
        .sort(compareHighLeverageLeaderboardEntries)
        .map((entry, index) => ({ rank: index + 1, ...entry })),
      normalizedLimit,
    ),
    dataQuality: buildLeaderboardDataQuality(summaries),
  };
}

export function buildTeamImpactSummaries(
  input: BuildTeamImpactSummariesInput,
): TeamImpactSummary[] {
  const teamAccumulators = new Map<string, TeamImpactAccumulator>();

  for (const gameInput of input.games) {
    const { game } = gameInput;
    if (!isGameInTeamImpactScope(game, input.mode, input.instanceId)) {
      continue;
    }

    const awardSet = gameInput.awardSet ?? buildAwardSetForGame(gameInput);
    const awayTeam = getTeamAccumulator(
      teamAccumulators,
      input.mode,
      input.instanceId,
      game.awayTeamId,
      game.awayTeamName,
    );
    const homeTeam = getTeamAccumulator(
      teamAccumulators,
      input.mode,
      input.instanceId,
      game.homeTeamId,
      game.homeTeamName,
    );

    registerGameForTeam(awayTeam, game, awardSet, gameInput);
    registerGameForTeam(homeTeam, game, awardSet, gameInput);

    for (const playerTotal of awardSet.playerTotals) {
      const team = teamAccumulators.get(playerTotal.teamId);
      if (!team) continue;
      addPlayerWpaTotal(team, game.gameId, playerTotal);
    }

    for (const managerTotal of awardSet.managerTotals) {
      const team = teamAccumulators.get(managerTotal.teamId);
      if (!team) continue;
      addManagerValueTotal(team, managerTotal);
    }

    for (const award of awardSet.awards) {
      const team = teamAccumulators.get(award.teamId);
      if (!team) continue;
      addPogAward(team, game, award);
    }

    addPlayerPlayContexts(teamAccumulators, gameInput);
  }

  const summaries = Array.from(teamAccumulators.values()).map(toTeamImpactSummary);
  applyBenchmarksAndRanks(summaries);
  return summaries.sort((left, right) => left.teamName.localeCompare(right.teamName));
}

async function loadTeamImpactGameInput(
  game: CompletedGameRecord,
): Promise<TeamImpactGameInput> {
  try {
    const [atBatEvents, fieldingEvents, betweenPlayEvents, gameHeader] =
      await Promise.all([
        getGameEvents(game.gameId),
        getGameFieldingEvents(game.gameId),
        getBetweenPlayEvents(game.gameId),
        getGameHeader(game.gameId),
      ]);
    const totalInnings = game.totalInnings ?? gameHeader?.totalInnings;

    return {
      game,
      atBatEvents,
      kblWpaCredits: deriveKblWpaCredits({
        atBatEvents,
        fieldingEvents,
        betweenPlayEvents,
        totalInnings,
        extraInningRunner: game.extraInningRunner ?? gameHeader?.extraInningRunner,
        extraInningRunnerDelay:
          game.extraInningRunnerDelay ?? gameHeader?.extraInningRunnerDelay,
        awayTeamId: game.awayTeamId,
        homeTeamId: game.homeTeamId,
        startingLineups: gameHeader?.startingLineups,
      }),
      eventLogAvailable: true,
    };
  } catch (error) {
    return {
      game,
      kblWpaCredits: [],
      eventLogAvailable: false,
      eventLogError: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildAwardSetForGame(input: TeamImpactGameInput): PogAwardSet {
  return getGamePogAwardSet({
    kblWpaCredits: input.kblWpaCredits ?? [],
    playersOfTheGame: input.game.playersOfTheGame,
    pogPlayerId: input.game.pogPlayerId,
    playerStats: input.game.playerStats,
    pitcherGameStats: input.game.pitcherGameStats,
    managerDecisions: input.game.managerDecisions,
    managerDeploymentStints: input.game.managerDeploymentStints,
    managerLineupDeltas: input.game.managerLineupDeltas,
    eventLogAvailable: input.eventLogAvailable,
  });
}

function isGameInTeamImpactScope(
  game: CompletedGameRecord,
  mode: TeamImpactMode,
  instanceId: string,
): boolean {
  if (mode === "elimination") {
    return game.competitionType === "elimination" && game.competitionId === instanceId;
  }

  if (game.competitionType && game.competitionType !== "exhibition") {
    return false;
  }

  return resolveExhibitionLeagueId(game) === instanceId;
}

function getTeamAccumulator(
  teams: Map<string, TeamImpactAccumulator>,
  mode: TeamImpactMode,
  instanceId: string,
  teamId: string,
  teamName: string,
): TeamImpactAccumulator {
  const current = teams.get(teamId);
  if (current) return current;

  const created: TeamImpactAccumulator = {
    mode,
    instanceId,
    teamId,
    teamName,
    gameIds: new Set<string>(),
    playerWpa: emptyRoleWpa(),
    managerWpa: emptyManagerWpa(),
    pog: {
      points: 0,
      overallWins: 0,
      bestHitter: 0,
      bestPitcher: 0,
      bestBaserunner: 0,
      bestFielder: 0,
      bestManager: 0,
      bestManagerWins: 0,
    },
    decoratedPlayers: new Map<string, TeamMostDecoratedPlayer>(),
    playerLeaders: new Map<string, PlayerImpactAccumulator>(),
    dataQuality: {
      fullKblWpaGames: 0,
      legacyAtBatWpaGames: 0,
      storedPogGames: 0,
      managerValueOnlyGames: 0,
      unavailableGames: 0,
      eventLogFailedGames: 0,
    },
  };

  teams.set(teamId, created);
  return created;
}

function registerGameForTeam(
  team: TeamImpactAccumulator,
  game: CompletedGameRecord,
  awardSet: PogAwardSet,
  gameInput: TeamImpactGameInput,
): void {
  team.gameIds.add(game.gameId);
  incrementSourceCount(team, awardSet.dataQuality.source);
  if (gameInput.eventLogError) {
    team.dataQuality.eventLogFailedGames += 1;
  }
}

function incrementSourceCount(
  team: TeamImpactAccumulator,
  source: PogDataQualitySource,
): void {
  if (source === "kbl_wpa") {
    team.dataQuality.fullKblWpaGames += 1;
  } else if (source === "legacy_at_bat_wpa") {
    team.dataQuality.legacyAtBatWpaGames += 1;
  } else if (source === "stored_pog") {
    team.dataQuality.storedPogGames += 1;
  } else if (source === "manager_value") {
    team.dataQuality.managerValueOnlyGames += 1;
  } else if (source === "unavailable") {
    team.dataQuality.unavailableGames += 1;
  }
}

function addPlayerWpaTotal(
  team: TeamImpactAccumulator,
  gameId: string,
  total: KblWpaPlayerTotal,
): void {
  addRoleWpa(team.playerWpa, total);
  const player = getPlayerAccumulator(team, total.playerId, total.playerName);
  player.gameIds.add(gameId);
  addRoleWpa(player.wpa, total);
}

function addManagerValueTotal(
  team: TeamImpactAccumulator,
  total: PogManagerValueTotal,
): void {
  team.managerWpa.tacticalManagerWpa += total.tacticalManagerWpa;
  team.managerWpa.deploymentWpa += total.deploymentWpa;
  team.managerWpa.lineupDeltaWpa += total.lineupDeltaWpa;
  team.managerWpa.managerValue += total.managerValue;
}

function addPogAward(
  team: TeamImpactAccumulator,
  game: CompletedGameRecord,
  award: PogAward,
): void {
  if (award.awardType === "team_standout") {
    return;
  }

  team.pog.points += award.points;

  if (award.awardType === "overall") {
    team.pog.overallWins += 1;
  } else if (award.awardType === "best_hitter") {
    team.pog.bestHitter += 1;
  } else if (award.awardType === "best_pitcher") {
    team.pog.bestPitcher += 1;
  } else if (award.awardType === "best_baserunner") {
    team.pog.bestBaserunner += 1;
  } else if (award.awardType === "best_fielder") {
    team.pog.bestFielder += 1;
  } else if (award.awardType === "best_manager") {
    team.pog.bestManager += 1;
    team.pog.bestManagerWins += 1;
  }

  if (award.playerId && award.points > 0) {
    const player = getPlayerAccumulator(
      team,
      award.playerId,
      award.playerName ?? award.playerId,
    );
    player.gameIds.add(game.gameId);
    player.pogPoints += award.points;
    incrementPlayerAwardCount(player, award.awardType);

    const decorated = team.decoratedPlayers.get(award.playerId) ?? {
      playerId: award.playerId,
      playerName: award.playerName ?? award.playerId,
      points: 0,
    };
    decorated.points += award.points;
    team.decoratedPlayers.set(award.playerId, decorated);
  }
}

function incrementPlayerAwardCount(
  player: PlayerImpactAccumulator,
  awardType: PogAward["awardType"],
): void {
  if (awardType === "overall") {
    player.awards.overall += 1;
  } else if (awardType === "best_hitter") {
    player.awards.bestHitter += 1;
  } else if (awardType === "best_pitcher") {
    player.awards.bestPitcher += 1;
  } else if (awardType === "best_baserunner") {
    player.awards.bestBaserunner += 1;
  } else if (awardType === "best_fielder") {
    player.awards.bestFielder += 1;
  }
}

function getPlayerAccumulator(
  team: TeamImpactAccumulator,
  playerId: string,
  playerName: string,
): PlayerImpactAccumulator {
  const current = team.playerLeaders.get(playerId);
  if (current) {
    if (current.playerName === playerId && playerName !== playerId) {
      current.playerName = playerName;
    }
    return current;
  }

  const created: PlayerImpactAccumulator = {
    playerId,
    playerName,
    teamId: team.teamId,
    gameIds: new Set<string>(),
    wpa: emptyRoleWpa(),
    pogPoints: 0,
    highLeverageWpa: 0,
    playContextAvailable: false,
    highLeverageMetadataAvailable: false,
    awards: {
      overall: 0,
      bestHitter: 0,
      bestPitcher: 0,
      bestBaserunner: 0,
      bestFielder: 0,
    },
  };
  team.playerLeaders.set(playerId, created);
  return created;
}

function addPlayerPlayContexts(
  teams: Map<string, TeamImpactAccumulator>,
  gameInput: TeamImpactGameInput,
): void {
  const atBatEventsById = new Map(
    (gameInput.atBatEvents ?? []).map((event) => [event.eventId, event]),
  );
  if (atBatEventsById.size === 0) {
    return;
  }

  const eventsByPlayer = new Map<
    string,
    {
      credit: KblWpaCredit;
      event: AtBatEvent;
      value: number;
    }
  >();

  for (const credit of gameInput.kblWpaCredits ?? []) {
    if (!Number.isFinite(credit.wpa)) continue;
    if (credit.isOverlay || credit.role === "managing") continue;
    if (credit.source !== "at_bat") continue;

    const event = atBatEventsById.get(credit.eventId);
    if (!event) continue;

    const label = getAtBatPlayLabel(event);
    if (!label) continue;

    const key = `${credit.teamId}::${credit.playerId}::${credit.eventId}`;
    const current = eventsByPlayer.get(key);
    if (current) {
      current.value += credit.wpa;
    } else {
      eventsByPlayer.set(key, {
        credit,
        event,
        value: credit.wpa,
      });
    }
  }

  for (const entry of eventsByPlayer.values()) {
    const team = teams.get(entry.credit.teamId);
    if (!team) continue;

    const player = getPlayerAccumulator(
      team,
      entry.credit.playerId,
      entry.credit.playerName,
    );

    const context = buildPlayContext(
      gameInput.game.gameId,
      entry.event,
      entry.value,
    );
    if (!context) continue;

    player.playContextAvailable = true;
    if (hasHighLeverageMetadata(entry.event)) {
      player.highLeverageMetadataAvailable = true;
    }

    if (
      context.value > 0 &&
      (!player.biggestPositivePlay ||
        comparePositivePlayContext(context, player.biggestPositivePlay) < 0)
    ) {
      player.biggestPositivePlay = context;
    }

    if (
      context.value < 0 &&
      (!player.biggestNegativePlay ||
        compareNegativePlayContext(context, player.biggestNegativePlay) < 0)
    ) {
      player.biggestNegativePlay = context;
    }

    if (isHighLeverageEvent(entry.event)) {
      player.highLeverageWpa += entry.value;
    }
  }
}

function addRoleWpa(
  target: RoleWpaBreakdown,
  total: Pick<
    KblWpaPlayerTotal,
    | "totalWpa"
    | "battingWpa"
    | "pitchingWpa"
    | "fieldingWpa"
    | "baserunningWpa"
    | "catchingWpa"
  >,
): void {
  target.total += total.totalWpa;
  target.batting += total.battingWpa;
  target.pitching += total.pitchingWpa;
  target.fielding += total.fieldingWpa;
  target.baserunning += total.baserunningWpa;
  target.catching += total.catchingWpa;
}

function toTeamImpactSummary(team: TeamImpactAccumulator): TeamImpactSummary {
  const games = team.gameIds.size;
  const playerLeaders = Array.from(team.playerLeaders.values())
    .map((player) => {
      const playerGames = player.gameIds.size;
      const wpa = roundRoleWpa(player.wpa);
      const summary: PlayerImpactSummary = {
        playerId: player.playerId,
        playerName: player.playerName,
        teamId: player.teamId,
        games: playerGames,
        wpa,
        pogPoints: player.pogPoints,
        perGameWpa: playerGames > 0 ? roundWpa(wpa.total / playerGames) : 0,
        awards: { ...player.awards },
      };

      if (player.biggestPositivePlay) {
        summary.biggestPositivePlay = player.biggestPositivePlay;
      }
      if (player.biggestNegativePlay) {
        summary.biggestNegativePlay = player.biggestNegativePlay;
      }
      if (player.highLeverageMetadataAvailable) {
        summary.highLeverageWpa = roundWpa(player.highLeverageWpa);
      }

      return summary;
    })
    .sort(comparePlayerLeaders);

  return {
    mode: team.mode,
    instanceId: team.instanceId,
    teamId: team.teamId,
    teamName: team.teamName,
    games,
    playerWpa: roundRoleWpa(team.playerWpa),
    managerWpa: roundManagerWpa(team.managerWpa),
    pog: {
      points: team.pog.points,
      rank: DEFAULT_RANK,
      teamCount: DEFAULT_TEAM_COUNT,
      overallWins: team.pog.overallWins,
      bestHitter: team.pog.bestHitter,
      bestPitcher: team.pog.bestPitcher,
      bestBaserunner: team.pog.bestBaserunner,
      bestFielder: team.pog.bestFielder,
      bestManager: team.pog.bestManager,
      bestManagerWins: team.pog.bestManagerWins,
      mostDecoratedPlayer: getMostDecoratedPlayer(team),
    },
    benchmarks: {
      totalPlayerWpaRank: DEFAULT_RANK,
      teamCount: DEFAULT_TEAM_COUNT,
      instanceAverageTotalPlayerWpa: 0,
      perGameTotalPlayerWpa: games > 0 ? roundWpa(team.playerWpa.total / games) : 0,
      identityLabel: buildIdentityLabel(team),
    },
    playerLeaders,
    dataQuality: {
      ...team.dataQuality,
      warnings: buildDataQualityWarnings(team),
    },
  };
}

function applyBenchmarksAndRanks(summaries: TeamImpactSummary[]): void {
  const teamCount = summaries.length;
  const averageTotal =
    teamCount > 0
      ? roundWpa(
          summaries.reduce((sum, summary) => sum + summary.playerWpa.total, 0) /
            teamCount,
        )
      : 0;

  const byWpa = [...summaries].sort(
    (left, right) =>
      right.playerWpa.total - left.playerWpa.total ||
      left.teamName.localeCompare(right.teamName) ||
      left.teamId.localeCompare(right.teamId),
  );
  const byPog = [...summaries].sort(
    (left, right) =>
      right.pog.points - left.pog.points ||
      left.teamName.localeCompare(right.teamName) ||
      left.teamId.localeCompare(right.teamId),
  );

  for (const summary of summaries) {
    summary.benchmarks.teamCount = teamCount;
    summary.benchmarks.instanceAverageTotalPlayerWpa = averageTotal;
    summary.benchmarks.totalPlayerWpaRank = byWpa.indexOf(summary) + 1;
    summary.pog.teamCount = teamCount;
    summary.pog.rank = byPog.indexOf(summary) + 1;
  }
}

function normalizeLeaderboardLimit(limit: number | undefined): number | undefined {
  if (limit === undefined) return undefined;
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  return Math.floor(limit);
}

function limitEntries<T>(entries: T[], limit: number | undefined): T[] {
  return limit === undefined ? entries : entries.slice(0, limit);
}

function hasUsablePlayerWpaData(summary: TeamImpactSummary): boolean {
  return (
    summary.dataQuality.fullKblWpaGames > 0 ||
    summary.dataQuality.legacyAtBatWpaGames > 0
  );
}

function isMeaningfulLeaderboardValue(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value) > MIN_POSITIVE_WPA;
}

function toPlayerWpaLeaderboardEntry(
  summary: TeamImpactSummary,
  player: PlayerImpactSummary,
): Omit<PlayerWpaLeaderboardEntry, "rank"> {
  return {
    playerId: player.playerId,
    playerName: player.playerName,
    teamId: player.teamId,
    teamName: summary.teamName,
    games: player.games,
    value: player.wpa.total,
    perGameWpa: player.perGameWpa,
    roleSplit: player.wpa,
    pogPoints: player.pogPoints,
  };
}

function toPlayerPogLeaderboardEntry(
  summary: TeamImpactSummary,
  player: PlayerImpactSummary,
): Omit<PlayerPogPointsLeaderboardEntry, "rank"> {
  return {
    playerId: player.playerId,
    playerName: player.playerName,
    teamId: player.teamId,
    teamName: summary.teamName,
    games: player.games,
    points: player.pogPoints,
    totalWpa: player.wpa.total,
    perGameWpa: player.perGameWpa,
    roleSplit: player.wpa,
    awardCounts: player.awards,
  };
}

function buildRoleWpaLeaderboard(
  playerRows: Array<{ summary: TeamImpactSummary; player: PlayerImpactSummary }>,
  role: TeamImpactRoleLeaderboardKey,
  limit: number | undefined,
): RoleWpaLeaderboardEntry[] {
  return limitEntries(
    playerRows
      .filter(({ summary }) => summary.dataQuality.fullKblWpaGames > 0)
      .map(({ summary, player }) => ({
        role,
        playerId: player.playerId,
        playerName: player.playerName,
        teamId: player.teamId,
        teamName: summary.teamName,
        games: player.games,
        value: getRoleLeaderboardValue(player, role),
        perGameWpa:
          player.games > 0 ? roundWpa(getRoleLeaderboardValue(player, role) / player.games) : 0,
        roleSplit: player.wpa,
        pogPoints: player.pogPoints,
      }))
      .filter((entry) => entry.value > MIN_POSITIVE_WPA)
      .sort(compareRoleWpaLeaderboardEntries)
      .map((entry, index) => ({ rank: index + 1, ...entry })),
    limit,
  );
}

function getRoleLeaderboardValue(
  player: PlayerImpactSummary,
  role: TeamImpactRoleLeaderboardKey,
): number {
  if (role === "defense") {
    return roundWpa(player.wpa.fielding + player.wpa.catching);
  }

  return player.wpa[role];
}

function buildPlayerAwardLeaderboard(
  playerRows: Array<{ summary: TeamImpactSummary; player: PlayerImpactSummary }>,
  awardKey: keyof TeamImpactAwardCounts,
  limit: number | undefined,
): PlayerAwardLeaderboardEntry[] {
  return limitEntries(
    playerRows
      .map(({ summary, player }) => ({
        playerId: player.playerId,
        playerName: player.playerName,
        teamId: player.teamId,
        teamName: summary.teamName,
        count: player.awards[awardKey],
        pogPoints: player.pogPoints,
      }))
      .filter((entry) => entry.count > 0)
      .sort(comparePlayerAwardLeaderboardEntries)
      .map((entry, index) => ({ rank: index + 1, ...entry })),
    limit,
  );
}

function buildBestManagerLeaderboard(
  summaries: TeamImpactSummary[],
  limit: number | undefined,
): BestManagerLeaderboardEntry[] {
  return limitEntries(
    summaries
      .map((summary) => ({
        teamId: summary.teamId,
        teamName: summary.teamName,
        count: summary.pog.bestManagerWins,
        managerValue: summary.managerWpa.managerValue,
      }))
      .filter((entry) => entry.count > 0)
      .sort(compareBestManagerLeaderboardEntries)
      .map((entry, index) => ({ rank: index + 1, ...entry })),
    limit,
  );
}

function buildLeaderboardDataQuality(
  summaries: TeamImpactSummary[],
): TeamImpactLeaderboardDataQuality {
  const warnings = new Set<string>();
  const dataQuality = summaries.reduce(
    (acc, summary) => {
      acc.teamGameCount += summary.games;
      acc.fullKblWpaTeamGames += summary.dataQuality.fullKblWpaGames;
      acc.legacyAtBatWpaTeamGames += summary.dataQuality.legacyAtBatWpaGames;
      acc.storedPogTeamGames += summary.dataQuality.storedPogGames;
      acc.managerValueOnlyTeamGames += summary.dataQuality.managerValueOnlyGames;
      acc.unavailableTeamGames += summary.dataQuality.unavailableGames;
      acc.eventLogFailedTeamGames += summary.dataQuality.eventLogFailedGames;
      summary.dataQuality.warnings.forEach((warning) => warnings.add(warning));
      return acc;
    },
    {
      teamCount: summaries.length,
      teamGameCount: 0,
      fullKblWpaTeamGames: 0,
      legacyAtBatWpaTeamGames: 0,
      storedPogTeamGames: 0,
      managerValueOnlyTeamGames: 0,
      unavailableTeamGames: 0,
      eventLogFailedTeamGames: 0,
    },
  );

  return {
    ...dataQuality,
    warnings: Array.from(warnings),
  };
}

function compareTeamWpaLeaderboardEntries(
  left: Omit<TeamWpaLeaderboardEntry, "rank">,
  right: Omit<TeamWpaLeaderboardEntry, "rank">,
): number {
  return (
    right.value - left.value ||
    left.teamName.localeCompare(right.teamName) ||
    left.teamId.localeCompare(right.teamId)
  );
}

function compareTeamPogLeaderboardEntries(
  left: Omit<TeamPogPointsLeaderboardEntry, "rank">,
  right: Omit<TeamPogPointsLeaderboardEntry, "rank">,
): number {
  return (
    right.points - left.points ||
    right.overallWins - left.overallWins ||
    right.bestManagerWins - left.bestManagerWins ||
    left.teamName.localeCompare(right.teamName) ||
    left.teamId.localeCompare(right.teamId)
  );
}

function comparePlayerWpaLeaderboardEntries(
  left: Omit<PlayerWpaLeaderboardEntry, "rank">,
  right: Omit<PlayerWpaLeaderboardEntry, "rank">,
): number {
  return (
    right.value - left.value ||
    right.pogPoints - left.pogPoints ||
    left.playerName.localeCompare(right.playerName) ||
    left.playerId.localeCompare(right.playerId) ||
    left.teamName.localeCompare(right.teamName) ||
    left.teamId.localeCompare(right.teamId)
  );
}

function comparePlayerPogLeaderboardEntries(
  left: Omit<PlayerPogPointsLeaderboardEntry, "rank">,
  right: Omit<PlayerPogPointsLeaderboardEntry, "rank">,
): number {
  return (
    right.points - left.points ||
    right.totalWpa - left.totalWpa ||
    left.playerName.localeCompare(right.playerName) ||
    left.playerId.localeCompare(right.playerId) ||
    left.teamName.localeCompare(right.teamName) ||
    left.teamId.localeCompare(right.teamId)
  );
}

function comparePlayerAwardLeaderboardEntries(
  left: Omit<PlayerAwardLeaderboardEntry, "rank">,
  right: Omit<PlayerAwardLeaderboardEntry, "rank">,
): number {
  return (
    right.count - left.count ||
    right.pogPoints - left.pogPoints ||
    left.playerName.localeCompare(right.playerName) ||
    left.teamName.localeCompare(right.teamName) ||
    left.playerId.localeCompare(right.playerId) ||
    left.teamId.localeCompare(right.teamId)
  );
}

function compareBestManagerLeaderboardEntries(
  left: Omit<BestManagerLeaderboardEntry, "rank">,
  right: Omit<BestManagerLeaderboardEntry, "rank">,
): number {
  return (
    right.count - left.count ||
    right.managerValue - left.managerValue ||
    left.teamName.localeCompare(right.teamName) ||
    left.teamId.localeCompare(right.teamId)
  );
}

function compareRoleWpaLeaderboardEntries(
  left: Omit<RoleWpaLeaderboardEntry, "rank">,
  right: Omit<RoleWpaLeaderboardEntry, "rank">,
): number {
  return (
    right.value - left.value ||
    right.roleSplit.total - left.roleSplit.total ||
    left.playerName.localeCompare(right.playerName) ||
    left.playerId.localeCompare(right.playerId) ||
    left.teamName.localeCompare(right.teamName) ||
    left.teamId.localeCompare(right.teamId)
  );
}

function compareManagerValueLeaderboardEntries(
  left: Omit<ManagerValueTeamLeaderboardEntry, "rank">,
  right: Omit<ManagerValueTeamLeaderboardEntry, "rank">,
): number {
  return (
    right.value - left.value ||
    right.bestManagerWins - left.bestManagerWins ||
    left.teamName.localeCompare(right.teamName) ||
    left.teamId.localeCompare(right.teamId)
  );
}

function compareHighLeverageLeaderboardEntries(
  left: Omit<HighLeverageWpaLeaderboardEntry, "rank">,
  right: Omit<HighLeverageWpaLeaderboardEntry, "rank">,
): number {
  return (
    right.value - left.value ||
    right.totalWpa - left.totalWpa ||
    left.playerName.localeCompare(right.playerName) ||
    left.playerId.localeCompare(right.playerId) ||
    left.teamName.localeCompare(right.teamName) ||
    left.teamId.localeCompare(right.teamId)
  );
}

function getMostDecoratedPlayer(
  team: TeamImpactAccumulator,
): TeamMostDecoratedPlayer | undefined {
  return Array.from(team.decoratedPlayers.values()).sort(
    (left, right) =>
      right.points - left.points ||
      left.playerName.localeCompare(right.playerName) ||
      left.playerId.localeCompare(right.playerId),
  )[0];
}

function buildIdentityLabel(team: TeamImpactAccumulator): string {
  if (
    team.dataQuality.fullKblWpaGames === 0 &&
    team.dataQuality.legacyAtBatWpaGames === 0
  ) {
    return "Impact detail unavailable";
  }

  if (
    team.dataQuality.fullKblWpaGames === 0 &&
    team.dataQuality.legacyAtBatWpaGames > 0
  ) {
    return "Legacy batting WPA only";
  }

  const buckets = [
    { role: "batting", value: team.playerWpa.batting, label: "Lineup carried them" },
    { role: "pitching", value: team.playerWpa.pitching, label: "Pitching carried them" },
    {
      role: "fielding",
      value: team.playerWpa.fielding + team.playerWpa.catching,
      label: "Glove-first run",
    },
    {
      role: "baserunning",
      value: team.playerWpa.baserunning,
      label: "Pressure on the bases",
    },
  ].sort(
    (left, right) =>
      right.value - left.value || left.role.localeCompare(right.role),
  );

  const strongest = buckets[0];
  if (!strongest || strongest.value <= MIN_POSITIVE_WPA) {
    const mostNegative = [...buckets].sort((left, right) => left.value - right.value)[0];
    if (mostNegative && mostNegative.value < -MIN_POSITIVE_WPA) {
      return `Costly ${mostNegative.role} swings`;
    }
    return "Impact detail unavailable";
  }

  return strongest.label;
}

function buildDataQualityWarnings(team: TeamImpactAccumulator): string[] {
  const warnings: string[] = [];
  const games = team.gameIds.size;

  if (games === 0) {
    warnings.push("No completed games were available for this team in the instance.");
    return warnings;
  }

  if (team.dataQuality.eventLogFailedGames > 0) {
    warnings.push(
      `${team.dataQuality.eventLogFailedGames} game(s) could not load event logs; impact is partial.`,
    );
  }
  if (team.dataQuality.fullKblWpaGames === 0) {
    warnings.push("No full KBL WPA games were available for this team.");
  }
  if (team.dataQuality.legacyAtBatWpaGames > 0) {
    warnings.push(
      `${team.dataQuality.legacyAtBatWpaGames} game(s) use legacy at-bat WPA fallback; role awards are limited.`,
    );
  }
  if (team.dataQuality.storedPogGames > 0) {
    warnings.push(
      `${team.dataQuality.storedPogGames} game(s) use stored legacy POG only.`,
    );
  }
  if (team.dataQuality.managerValueOnlyGames > 0) {
    warnings.push(
      `${team.dataQuality.managerValueOnlyGames} game(s) include Manager Value only; player awards are unavailable.`,
    );
  }
  if (team.dataQuality.unavailableGames > 0) {
    warnings.push(
      `${team.dataQuality.unavailableGames} game(s) have no usable POG or WPA impact data.`,
    );
  }

  return warnings;
}

function comparePlayerLeaders(
  left: PlayerImpactSummary,
  right: PlayerImpactSummary,
): number {
  return (
    right.wpa.total - left.wpa.total ||
    right.pogPoints - left.pogPoints ||
    left.playerName.localeCompare(right.playerName) ||
    left.playerId.localeCompare(right.playerId)
  );
}

function buildPlayContext(
  gameId: string,
  event: AtBatEvent,
  value: number,
): TeamImpactPlayContext | undefined {
  const label = getAtBatPlayLabel(event);
  if (!label) return undefined;

  const context: TeamImpactPlayContext = {
    gameId,
    eventId: event.eventId,
    value: roundWpa(value),
    label,
  };
  const inningLabel = getInningLabel(event);
  if (inningLabel) {
    context.inningLabel = inningLabel;
  }
  if (Number.isFinite(event.leverageIndex)) {
    context.leverageIndex = roundWpa(event.leverageIndex);
  }

  return context;
}

function getAtBatPlayLabel(event: AtBatEvent): string | undefined {
  const batterName = event.batterName?.trim();
  const result = event.result?.trim();
  if (!batterName || !result) return undefined;

  const pitcherName = event.pitcherName?.trim();
  return pitcherName ? `${batterName} ${result} vs ${pitcherName}` : `${batterName} ${result}`;
}

function getInningLabel(event: AtBatEvent): string | undefined {
  if (!Number.isFinite(event.inning)) return undefined;
  if (event.halfInning === "TOP") return `Top ${event.inning}`;
  if (event.halfInning === "BOTTOM") return `Bot ${event.inning}`;
  return undefined;
}

function isHighLeverageEvent(event: AtBatEvent): boolean {
  return (
    (Number.isFinite(event.leverageIndex) && event.leverageIndex >= 1.5) ||
    event.isClutch === true
  );
}

function hasHighLeverageMetadata(event: AtBatEvent): boolean {
  return Number.isFinite(event.leverageIndex) || event.isClutch === true;
}

function comparePositivePlayContext(
  left: TeamImpactPlayContext,
  right: TeamImpactPlayContext,
): number {
  return (
    right.value - left.value ||
    left.eventId.localeCompare(right.eventId)
  );
}

function compareNegativePlayContext(
  left: TeamImpactPlayContext,
  right: TeamImpactPlayContext,
): number {
  return (
    left.value - right.value ||
    left.eventId.localeCompare(right.eventId)
  );
}

function emptyRoleWpa(): RoleWpaBreakdown {
  return {
    total: 0,
    batting: 0,
    pitching: 0,
    fielding: 0,
    baserunning: 0,
    catching: 0,
  };
}

function emptyManagerWpa(): ManagerWpaBreakdown {
  return {
    tacticalManagerWpa: 0,
    deploymentWpa: 0,
    lineupDeltaWpa: 0,
    managerValue: 0,
  };
}

function roundRoleWpa(wpa: RoleWpaBreakdown): RoleWpaBreakdown {
  return {
    total: roundWpa(wpa.total),
    batting: roundWpa(wpa.batting),
    pitching: roundWpa(wpa.pitching),
    fielding: roundWpa(wpa.fielding),
    baserunning: roundWpa(wpa.baserunning),
    catching: roundWpa(wpa.catching),
  };
}

function roundManagerWpa(wpa: ManagerWpaBreakdown): ManagerWpaBreakdown {
  return {
    tacticalManagerWpa: roundWpa(wpa.tacticalManagerWpa),
    deploymentWpa: roundWpa(wpa.deploymentWpa),
    lineupDeltaWpa: roundWpa(wpa.lineupDeltaWpa),
    managerValue: roundWpa(wpa.managerValue),
  };
}

function roundWpa(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
