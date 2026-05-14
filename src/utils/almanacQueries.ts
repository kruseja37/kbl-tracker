import type { CompletedGameRecord } from './gameStorage';
import { getAllCompletedGames, resolveExhibitionLeagueId } from './gameStorage';
import type { AtBatEvent } from './eventLog';
import { getGameEvents } from './eventLog';
import { getAllCanonicalPlayers } from './almanacStorage';
import type { CanonicalPlayer } from './almanacStorage';
import type {
  ManagerDeploymentStintRecord,
  ManagerDecisionRecord,
  ManagerDecisionType,
  ManagerLineupDeltaRecord,
  ManagerProfile,
} from '../types/managerWpa';
import {
  getEliminationAllTimePlayerStats,
  type EliminationAllTimePlayerStats,
} from './eliminationAllTimeStatsStorage';

export interface ExhibitionGameFilters {
  teamId?: string;
  opponentId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface EliminationGameFilters extends ExhibitionGameFilters {
  runId?: string;
}

export type ExhibitionBattingLeaderStat =
  | 'ba'
  | 'hr'
  | 'rbi'
  | 'h'
  | 'r'
  | 'doubles'
  | 'triples'
  | 'sb'
  | 'bb';

export type ExhibitionPitchingLeaderStat =
  | 'era'
  | 'w'
  | 'sv'
  | 'so'
  | 'ip'
  | 'cg'
  | 'sho';

export interface ExhibitionLeaderEntry {
  leagueId: string;
  instanceId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  canonicalId: string;
  value: number;
}

export interface ExhibitionPlayerSearchEntry {
  playerId: string;
  playerName: string;
  leagueId: string;
  instanceId: string;
  canonicalId: string;
  teamId: string;
  teamName: string;
  games: number;
  mode: AlmanacInstanceMode;
}

export interface BattingLine {
  G: number;
  AB: number;
  H: number;
  R: number;
  '2B': number;
  '3B': number;
  HR: number;
  RBI: number;
  SB: number;
  BB: number;
  SO: number;
  BA: number;
}

export interface PitchingLine {
  G: number;
  IP: string;
  H: number;
  R: number;
  ER: number;
  BB: number;
  SO: number;
  CG: number;
  SHO: number;
  SV: number;
  W: number;
  L: number;
  ERA: number;
}

export type AlmanacInstanceMode = 'exhibition' | 'franchise' | 'elimination';

export type ManagerAlmanacModeFilter = AlmanacInstanceMode | 'all';

export interface ManagerAlmanacFilters {
  mode?: ManagerAlmanacModeFilter;
  instanceId?: string;
  teamId?: string;
  managerId?: string;
  seasonId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ManagerAlmanacDecisionSummary {
  decisionId: string;
  gameId: string;
  date: number;
  managerId: string;
  managerName: string;
  teamId: string;
  teamName: string;
  opponentTeamId?: string;
  opponentTeamName?: string;
  decisionType: ManagerDecisionType;
  title: string;
  summary: string;
  value: number;
  inning: number;
  half: 'top' | 'bottom';
  mode: AlmanacInstanceMode;
  instanceId: string;
}

export interface ManagerAlmanacLineupDeltaSummary {
  decisionId: string;
  gameId: string;
  date: number;
  managerId: string;
  managerName: string;
  teamId: string;
  teamName: string;
  chosenLabel: string;
  optimalLabel: string;
  projectedOpportunityCost?: number;
  actualVsOptimalProjection?: number;
  managerWpa: number;
}

export interface ManagerDecisionTendencies {
  decisionTypeCounts: Partial<Record<ManagerDecisionType, number>>;
  tacticalDecisionCount: number;
  lineupDecisionCount: number;
  stealRate: number;
  buntRate: number;
  bullpenAggressiveness: number;
  pinchHitRate: number;
  pinchRunRate: number;
  intentionalWalkRate: number;
  defensiveSubRate: number;
  lineupConstructionRate: number;
}

export interface ManagerTeamTenureAggregate {
  managerId: string;
  managerName: string;
  teamId: string;
  teamName: string;
  mode: AlmanacInstanceMode;
  instanceId: string;
  instanceName: string;
  gamesManaged: number;
  wins: number;
  losses: number;
  tacticalManagerWpa: number;
  deploymentWpa: number;
  lineupDeltaWpa: number;
  managerValue: number;
  decisionCount: number;
  tacticalDecisionCount: number;
  deploymentStintCount: number;
  lineupDecisionCount: number;
  resolvedDecisionCount: number;
  pendingDecisionCount: number;
  bestDecision?: ManagerAlmanacDecisionSummary;
  worstDecision?: ManagerAlmanacDecisionSummary;
  lineupDeltaDetails: ManagerAlmanacLineupDeltaSummary[];
  tendencies: ManagerDecisionTendencies;
}

export interface ManagerAlmanacAggregate {
  managerId: string;
  managerName: string;
  teamIds: string[];
  teamNames: string[];
  modeInstances: Array<{
    mode: AlmanacInstanceMode;
    instanceId: string;
    instanceName: string;
  }>;
  gamesManaged: number;
  wins: number;
  losses: number;
  tacticalManagerWpa: number;
  deploymentWpa: number;
  lineupDeltaWpa: number;
  managerValue: number;
  decisionCount: number;
  tacticalDecisionCount: number;
  deploymentStintCount: number;
  lineupDecisionCount: number;
  resolvedDecisionCount: number;
  pendingDecisionCount: number;
  bestDecision?: ManagerAlmanacDecisionSummary;
  worstDecision?: ManagerAlmanacDecisionSummary;
  lineupDeltaDetails: ManagerAlmanacLineupDeltaSummary[];
  tendencies: ManagerDecisionTendencies;
  tenures: ManagerTeamTenureAggregate[];
}

export type ManagerLeaderboardCategory =
  | 'managerValue'
  | 'tacticalManagerWpa'
  | 'deploymentWpa'
  | 'lineupDeltaWpa'
  | 'decisionCount'
  | 'bestDecision'
  | 'worstDecision'
  | 'decisionTypeTendencies';

export interface ManagerLeaderboardEntry {
  managerId: string;
  managerName: string;
  teamNames: string[];
  gamesManaged: number;
  value: number;
  tacticalManagerWpa: number;
  deploymentWpa: number;
  lineupDeltaWpa: number;
  managerValue: number;
  decisionCount: number;
  bestDecision?: ManagerAlmanacDecisionSummary;
  worstDecision?: ManagerAlmanacDecisionSummary;
  tendencies: ManagerDecisionTendencies;
}

export type ManagerAlmanacLeaderboards = Record<
  ManagerLeaderboardCategory,
  ManagerLeaderboardEntry[]
>;

export interface ManagerAlmanacFilterOptions {
  modes: AlmanacInstanceMode[];
  instances: Array<{
    mode: AlmanacInstanceMode;
    instanceId: string;
    instanceName: string;
    games: number;
  }>;
  teams: Array<{
    teamId: string;
    teamName: string;
  }>;
}

interface BattingAggregate {
  leagueId: string;
  canonicalId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  lastSeenDate: number;
  games: Set<string>;
  pa: number;
  ab: number;
  h: number;
  r: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  sb: number;
  bb: number;
  so: number;
}

interface PitchingAggregate {
  leagueId: string;
  canonicalId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  lastSeenDate: number;
  games: Set<string>;
  outsRecorded: number;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walksAllowed: number;
  strikeouts: number;
  wins: number;
  losses: number;
  saves: number;
  completeGames: number;
  shutouts: number;
}

interface ManagerWorkingTenure {
  managerId: string;
  managerName: string;
  teamId: string;
  teamName: string;
  mode: AlmanacInstanceMode;
  instanceId: string;
  instanceName: string;
  gameKeys: Set<string>;
  wins: number;
  losses: number;
  tacticalManagerWpa: number;
  deploymentWpa: number;
  lineupDeltaWpa: number;
  tacticalDecisionCount: number;
  deploymentStintCount: number;
  lineupDecisionCount: number;
  resolvedDecisionCount: number;
  pendingDecisionCount: number;
  bestDecision?: ManagerAlmanacDecisionSummary;
  worstDecision?: ManagerAlmanacDecisionSummary;
  lineupDeltaDetails: ManagerAlmanacLineupDeltaSummary[];
  decisionTypeCounts: Partial<Record<ManagerDecisionType, number>>;
}

interface ManagerWorkingAggregate {
  managerId: string;
  managerName: string;
  teamNamesById: Map<string, string>;
  modeInstancesByKey: Map<
    string,
    {
      mode: AlmanacInstanceMode;
      instanceId: string;
      instanceName: string;
    }
  >;
  gameTeamKeys: Set<string>;
  wins: number;
  losses: number;
  tacticalManagerWpa: number;
  deploymentWpa: number;
  lineupDeltaWpa: number;
  tacticalDecisionCount: number;
  deploymentStintCount: number;
  lineupDecisionCount: number;
  resolvedDecisionCount: number;
  pendingDecisionCount: number;
  bestDecision?: ManagerAlmanacDecisionSummary;
  worstDecision?: ManagerAlmanacDecisionSummary;
  lineupDeltaDetails: ManagerAlmanacLineupDeltaSummary[];
  decisionTypeCounts: Partial<Record<ManagerDecisionType, number>>;
  tenures: Map<string, ManagerWorkingTenure>;
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function battingAverage(hits: number, atBats: number): number {
  return atBats > 0 ? roundTo(hits / atBats, 3) : 0;
}

function earnedRunAverage(earnedRuns: number, outsRecorded: number): number {
  return outsRecorded > 0 ? roundTo((earnedRuns / (outsRecorded / 3)) * 9, 2) : 0;
}

function outsToDisplay(outsRecorded: number): string {
  const innings = Math.floor(outsRecorded / 3);
  const remainder = outsRecorded % 3;
  return `${innings}.${remainder}`;
}

function outsToDisplayNumber(outsRecorded: number): number {
  const innings = Math.floor(outsRecorded / 3);
  const remainder = outsRecorded % 3;
  return innings + remainder / 10;
}

function parseDateBoundary(value?: string, endOfDay: boolean = false): number | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (endOfDay) {
      parsed.setHours(23, 59, 59, 999);
    } else {
      parsed.setHours(0, 0, 0, 0);
    }
  }

  return parsed.getTime();
}

interface CanonicalRegistry {
  canonicalIdByLeaguePlayerId: Map<string, string>;
  canonicalIdByPlayerId: Map<string, string>;
  playerIdsByLeagueCanonical: Map<string, Set<string>>;
  preferredPlayerIdByLeagueCanonical: Map<string, string>;
}

function buildCanonicalRegistry(
  canonicalPlayers: CanonicalPlayer[],
): CanonicalRegistry {
  const canonicalIdByLeaguePlayerId = new Map<string, string>();
  const canonicalIdByPlayerId = new Map<string, string>();
  const playerIdsByLeagueCanonical = new Map<string, Set<string>>();
  const preferredPlayerIdByLeagueCanonical = new Map<string, string>();

  for (const player of canonicalPlayers) {
    for (const instance of player.instances) {
      const leaguePlayerKey = `${instance.instanceId}::${instance.playerIdInInstance}`;
      const leagueCanonicalKey = `${instance.instanceId}::${player.canonicalId}`;

      canonicalIdByLeaguePlayerId.set(leaguePlayerKey, player.canonicalId);
      canonicalIdByPlayerId.set(instance.playerIdInInstance, player.canonicalId);

      const playerIds =
        playerIdsByLeagueCanonical.get(leagueCanonicalKey) ?? new Set<string>();
      playerIds.add(instance.playerIdInInstance);
      playerIdsByLeagueCanonical.set(leagueCanonicalKey, playerIds);

      if (!preferredPlayerIdByLeagueCanonical.has(leagueCanonicalKey)) {
        preferredPlayerIdByLeagueCanonical.set(
          leagueCanonicalKey,
          instance.playerIdInInstance,
        );
      }
    }
  }

  return {
    canonicalIdByLeaguePlayerId,
    canonicalIdByPlayerId,
    playerIdsByLeagueCanonical,
    preferredPlayerIdByLeagueCanonical,
  };
}

async function getCanonicalRegistry(): Promise<CanonicalRegistry> {
  return buildCanonicalRegistry(await getAllCanonicalPlayers());
}

function resolveCanonicalIdForLeague(
  registry: CanonicalRegistry,
  leagueId: string,
  playerId: string,
): string | null {
  const byLeague = registry.canonicalIdByLeaguePlayerId.get(
    `${leagueId}::${playerId}`,
  );
  if (byLeague) {
    return byLeague;
  }

  const directCanonicalKey = `${leagueId}::${playerId}`;
  if (registry.playerIdsByLeagueCanonical.has(directCanonicalKey)) {
    return playerId;
  }

  return registry.canonicalIdByPlayerId.get(playerId) ?? null;
}

function resolveCanonicalAggregateIdentity(
  registry: CanonicalRegistry,
  leagueId: string,
  playerId: string,
): { aggregateKey: string; canonicalId: string; preferredPlayerId: string } {
  const canonicalId = resolveCanonicalIdForLeague(registry, leagueId, playerId);

  if (!canonicalId) {
    return {
      aggregateKey: playerId,
      canonicalId: playerId,
      preferredPlayerId: playerId,
    };
  }

  const leagueCanonicalKey = `${leagueId}::${canonicalId}`;
  return {
    aggregateKey: canonicalId,
    canonicalId,
    preferredPlayerId:
      registry.preferredPlayerIdByLeagueCanonical.get(leagueCanonicalKey) ??
      playerId,
  };
}

function resolvePlayerAliasesForLeague(
  registry: CanonicalRegistry,
  leagueId: string,
  playerId: string,
): Set<string> {
  const canonicalId = resolveCanonicalIdForLeague(registry, leagueId, playerId);
  if (!canonicalId) {
    return new Set([playerId]);
  }

  const aliases = registry.playerIdsByLeagueCanonical.get(
    `${leagueId}::${canonicalId}`,
  );
  return new Set([playerId, ...(aliases ?? [])]);
}

function getBattingEntryForAliases(
  game: CompletedGameRecord,
  playerIds: Set<string>,
): { matchedPlayerId: string; stats: CompletedGameRecord['playerStats'][string] } | null {
  for (const candidateId of playerIds) {
    const stats = game.playerStats[candidateId];
    if (stats) {
      return { matchedPlayerId: candidateId, stats };
    }
  }

  return null;
}

function getPitchingEntryForAliases(
  game: CompletedGameRecord,
  playerIds: Set<string>,
): CompletedGameRecord['pitcherGameStats'][number] | null {
  return (
    game.pitcherGameStats.find((pitcher) => playerIds.has(pitcher.pitcherId)) ??
    null
  );
}

export function getExhibitionLeagueId(game: CompletedGameRecord): string | null {
  return resolveExhibitionLeagueId(game) ?? null;
}

function isExhibitionGame(game: CompletedGameRecord): boolean {
  return game.competitionType === 'exhibition' || (!game.competitionType && Boolean(game.leagueId ?? game.competitionId));
}

function getGameInstanceDescriptor(
  game: CompletedGameRecord,
): { mode: AlmanacInstanceMode; instanceId: string } | null {
  if (game.competitionType === 'elimination' && game.competitionId) {
    return {
      mode: 'elimination',
      instanceId: game.competitionId,
    };
  }

  if (
    (game.competitionType === 'franchise' || game.competitionType === 'playoff') &&
    game.competitionId
  ) {
    return {
      mode: 'franchise',
      instanceId: game.competitionId,
    };
  }

  const exhibitionLeagueId = getExhibitionLeagueId(game);
  if (exhibitionLeagueId) {
    return {
      mode: 'exhibition',
      instanceId: exhibitionLeagueId,
    };
  }

  return null;
}

function inferInstanceModeFromGames(
  games: CompletedGameRecord[],
  instanceId: string,
): AlmanacInstanceMode | null {
  const modes: AlmanacInstanceMode[] = ['elimination', 'franchise', 'exhibition'];

  for (const mode of modes) {
    if (games.some((game) => isGameInInstance(game, mode, instanceId))) {
      return mode;
    }
  }

  return null;
}

export function getArchiveInstanceIdForGame(
  game: CompletedGameRecord,
): string | null {
  return getGameInstanceDescriptor(game)?.instanceId ?? null;
}

export async function getArchiveInstanceMode(
  instanceId: string,
): Promise<AlmanacInstanceMode | null> {
  const allGames = await getAllCompletedGames();
  return inferInstanceModeFromGames(allGames, instanceId);
}

function getInstanceGameId(
  game: CompletedGameRecord,
  mode: AlmanacInstanceMode,
): string | null {
  if (mode === 'exhibition') {
    return getExhibitionLeagueId(game);
  }

  if (mode === 'elimination' && game.competitionType === 'elimination') {
    return game.competitionId ?? null;
  }

  if (
    mode === 'franchise' &&
    (game.competitionType === 'franchise' || game.competitionType === 'playoff')
  ) {
    return game.competitionId ?? null;
  }

  return null;
}

function isGameInInstance(
  game: CompletedGameRecord,
  mode: AlmanacInstanceMode,
  instanceId: string,
): boolean {
  return getInstanceGameId(game, mode) === instanceId;
}

async function getCanonicalIdLookup(): Promise<Map<string, string>> {
  const lookup = new Map<string, string>();
  const canonicalPlayers = await getAllCanonicalPlayers();

  for (const player of canonicalPlayers) {
    for (const instance of player.instances) {
      lookup.set(instance.playerIdInInstance, player.canonicalId);
    }
  }

  return lookup;
}

function buildTeamGameCounts(games: CompletedGameRecord[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const game of games) {
    const leagueId = getExhibitionLeagueId(game);
    if (!leagueId) {
      continue;
    }

    const awayKey = `${leagueId}::${game.awayTeamId}`;
    const homeKey = `${leagueId}::${game.homeTeamId}`;

    counts.set(awayKey, (counts.get(awayKey) ?? 0) + 1);
    counts.set(homeKey, (counts.get(homeKey) ?? 0) + 1);
  }

  return counts;
}

function findTeamName(
  games: CompletedGameRecord[],
  leagueId: string,
  teamId: string
): string {
  const matchingGame = games.find(
    (game) =>
      getExhibitionLeagueId(game) === leagueId &&
      (game.awayTeamId === teamId || game.homeTeamId === teamId)
  );

  if (!matchingGame) {
    return teamId;
  }

  return matchingGame.awayTeamId === teamId ? matchingGame.awayTeamName : matchingGame.homeTeamName;
}

function titleCaseIdentifier(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ');
}

function buildManagerProfileLookup(
  profiles: ManagerProfile[] | Map<string, ManagerProfile>,
): Map<string, ManagerProfile> {
  if (profiles instanceof Map) {
    return profiles;
  }

  return new Map(profiles.map((profile) => [profile.managerId, profile]));
}

export function getDefaultManagerLabel(
  managerId: string,
  teamId: string,
  teamName: string,
  profile?: ManagerProfile,
): string {
  if (profile?.displayName?.trim()) {
    return profile.displayName.trim();
  }

  if (managerId === `${teamId}-manager`) {
    return `${teamName} Manager`;
  }

  return titleCaseIdentifier(managerId) || `${teamName} Manager`;
}

function getTeamNameForGame(game: CompletedGameRecord, teamId: string): string {
  if (teamId === game.awayTeamId) {
    return game.awayTeamName;
  }

  if (teamId === game.homeTeamId) {
    return game.homeTeamName;
  }

  return teamId;
}

function getOpponentTeamIdForGame(
  game: CompletedGameRecord,
  teamId: string,
): string | undefined {
  if (teamId === game.awayTeamId) {
    return game.homeTeamId;
  }

  if (teamId === game.homeTeamId) {
    return game.awayTeamId;
  }

  return undefined;
}

function getInstanceNameForGame(
  game: CompletedGameRecord,
  descriptor: { mode: AlmanacInstanceMode; instanceId: string },
): string {
  if (descriptor.mode === 'exhibition') {
    return game.competitionName ?? game.leagueId ?? descriptor.instanceId;
  }

  return game.competitionName ?? descriptor.instanceId;
}

function gameMatchesManagerFilters(
  game: CompletedGameRecord,
  descriptor: { mode: AlmanacInstanceMode; instanceId: string },
  filters: ManagerAlmanacFilters,
): boolean {
  const fromTs = parseDateBoundary(filters.dateFrom);
  const toTs = parseDateBoundary(filters.dateTo, true);

  if (fromTs !== null && game.date < fromTs) {
    return false;
  }

  if (toTs !== null && game.date > toTs) {
    return false;
  }

  if (filters.seasonId && game.seasonId !== filters.seasonId) {
    return false;
  }

  if (filters.mode && filters.mode !== 'all' && descriptor.mode !== filters.mode) {
    return false;
  }

  if (filters.instanceId && descriptor.instanceId !== filters.instanceId) {
    return false;
  }

  return true;
}

function managerRecordMatchesFilters(
  managerId: string,
  teamId: string,
  filters: ManagerAlmanacFilters,
): boolean {
  if (filters.managerId && managerId !== filters.managerId) {
    return false;
  }

  if (filters.teamId && teamId !== filters.teamId) {
    return false;
  }

  return true;
}

function getTeamResultForGame(
  game: CompletedGameRecord,
  teamId: string,
): 'win' | 'loss' | 'tie' | null {
  const isAway = teamId === game.awayTeamId;
  const isHome = teamId === game.homeTeamId;

  if (!isAway && !isHome) {
    return null;
  }

  const teamRuns = isAway ? game.finalScore.away : game.finalScore.home;
  const opponentRuns = isAway ? game.finalScore.home : game.finalScore.away;

  if (teamRuns > opponentRuns) {
    return 'win';
  }

  if (teamRuns < opponentRuns) {
    return 'loss';
  }

  return 'tie';
}

function addDecisionTypeCount(
  counts: Partial<Record<ManagerDecisionType, number>>,
  decisionType: ManagerDecisionType,
): void {
  counts[decisionType] = (counts[decisionType] ?? 0) + 1;
}

function buildManagerDecisionSummary(
  game: CompletedGameRecord,
  descriptor: { mode: AlmanacInstanceMode; instanceId: string },
  decision: ManagerDecisionRecord,
  managerName: string,
): ManagerAlmanacDecisionSummary | null {
  if (typeof decision.managerWpa !== 'number') {
    return null;
  }

  const opponentTeamId =
    decision.opponentTeamId || getOpponentTeamIdForGame(game, decision.teamId);

  return {
    decisionId: decision.decisionId,
    gameId: decision.gameId,
    date: game.date,
    managerId: decision.managerId,
    managerName,
    teamId: decision.teamId,
    teamName: getTeamNameForGame(game, decision.teamId),
    opponentTeamId,
    opponentTeamName: opponentTeamId
      ? getTeamNameForGame(game, opponentTeamId)
      : undefined,
    decisionType: decision.decisionType,
    title: decision.displayTitle,
    summary: decision.displaySummary,
    value: decision.managerWpa,
    inning: decision.inning,
    half: decision.half,
    mode: descriptor.mode,
    instanceId: descriptor.instanceId,
  };
}

function formatLineupDeltaSummarySlot(
  playerName: string | undefined,
  battingOrderSlot: number | undefined,
  defensivePosition: string | undefined,
): string {
  const order = battingOrderSlot ? `#${battingOrderSlot}` : 'slot ?';
  const position = defensivePosition || 'POS';
  return `${order} ${position} ${playerName || 'Unknown player'}`;
}

function buildManagerLineupDeltaSummary(
  game: CompletedGameRecord,
  delta: ManagerLineupDeltaRecord,
  managerName: string,
): ManagerAlmanacLineupDeltaSummary {
  return {
    decisionId: delta.decisionId,
    gameId: delta.gameId,
    date: game.date,
    managerId: delta.managerId,
    managerName,
    teamId: delta.teamId,
    teamName: getTeamNameForGame(game, delta.teamId),
    chosenLabel: formatLineupDeltaSummarySlot(
      delta.chosenPlayerName ?? delta.starterPlayerName,
      delta.chosenBattingOrderSlot ?? delta.battingOrderSlot,
      delta.chosenDefensivePosition ?? delta.defensivePosition,
    ),
    optimalLabel: formatLineupDeltaSummarySlot(
      delta.optimalPlayerName,
      delta.optimalBattingOrderSlot,
      delta.optimalDefensivePosition,
    ),
    projectedOpportunityCost: delta.projectedOpportunityCost,
    actualVsOptimalProjection: delta.actualVsOptimalProjection,
    managerWpa: delta.managerWpa,
  };
}

function compareBestDecision(
  current: ManagerAlmanacDecisionSummary | undefined,
  candidate: ManagerAlmanacDecisionSummary,
): ManagerAlmanacDecisionSummary {
  if (!current) {
    return candidate;
  }

  if (candidate.value !== current.value) {
    return candidate.value > current.value ? candidate : current;
  }

  return candidate.date > current.date ? candidate : current;
}

function compareWorstDecision(
  current: ManagerAlmanacDecisionSummary | undefined,
  candidate: ManagerAlmanacDecisionSummary,
): ManagerAlmanacDecisionSummary {
  if (!current) {
    return candidate;
  }

  if (candidate.value !== current.value) {
    return candidate.value < current.value ? candidate : current;
  }

  return candidate.date > current.date ? candidate : current;
}

function createEmptyTendencies(
  decisionTypeCounts: Partial<Record<ManagerDecisionType, number>>,
  tacticalDecisionCount: number,
  lineupDecisionCount: number,
): ManagerDecisionTendencies {
  const tacticalDenominator = Math.max(tacticalDecisionCount, 0);
  const totalDecisionCount = tacticalDecisionCount + lineupDecisionCount;
  const count = (decisionType: ManagerDecisionType): number =>
    decisionTypeCounts[decisionType] ?? 0;
  const rate = (value: number, denominator: number): number =>
    denominator > 0 ? roundTo(value / denominator, 3) : 0;

  return {
    decisionTypeCounts: { ...decisionTypeCounts },
    tacticalDecisionCount,
    lineupDecisionCount,
    stealRate: rate(count('steal_send'), tacticalDenominator),
    buntRate: rate(count('bunt_call') + count('squeeze_call'), tacticalDenominator),
    bullpenAggressiveness: rate(
      count('pitching_change') + count('leave_pitcher_in'),
      tacticalDenominator,
    ),
    pinchHitRate: rate(
      count('pinch_hitter') + count('let_batter_hit'),
      tacticalDenominator,
    ),
    pinchRunRate: rate(count('pinch_runner'), tacticalDenominator),
    intentionalWalkRate: rate(count('intentional_walk'), tacticalDenominator),
    defensiveSubRate: rate(
      count('defensive_sub') + count('position_change'),
      tacticalDenominator,
    ),
    lineupConstructionRate: rate(lineupDecisionCount, totalDecisionCount),
  };
}

function createManagerWorkingAggregate(
  managerId: string,
  managerName: string,
): ManagerWorkingAggregate {
  return {
    managerId,
    managerName,
    teamNamesById: new Map(),
    modeInstancesByKey: new Map(),
    gameTeamKeys: new Set(),
    wins: 0,
    losses: 0,
    tacticalManagerWpa: 0,
    deploymentWpa: 0,
    lineupDeltaWpa: 0,
    tacticalDecisionCount: 0,
    deploymentStintCount: 0,
    lineupDecisionCount: 0,
    resolvedDecisionCount: 0,
    pendingDecisionCount: 0,
    decisionTypeCounts: {},
    lineupDeltaDetails: [],
    tenures: new Map(),
  };
}

function getOrCreateManagerAggregate(
  aggregates: Map<string, ManagerWorkingAggregate>,
  managerId: string,
  managerName: string,
): ManagerWorkingAggregate {
  const existing = aggregates.get(managerId);
  if (existing) {
    if (!existing.managerName && managerName) {
      existing.managerName = managerName;
    }
    return existing;
  }

  const aggregate = createManagerWorkingAggregate(managerId, managerName);
  aggregates.set(managerId, aggregate);
  return aggregate;
}

function getOrCreateManagerTenure(
  aggregate: ManagerWorkingAggregate,
  params: {
    managerId: string;
    managerName: string;
    teamId: string;
    teamName: string;
    mode: AlmanacInstanceMode;
    instanceId: string;
    instanceName: string;
  },
): ManagerWorkingTenure {
  const key = `${params.teamId}::${params.mode}::${params.instanceId}`;
  const existing = aggregate.tenures.get(key);
  if (existing) {
    return existing;
  }

  const tenure: ManagerWorkingTenure = {
    ...params,
    gameKeys: new Set(),
    wins: 0,
    losses: 0,
    tacticalManagerWpa: 0,
    deploymentWpa: 0,
    lineupDeltaWpa: 0,
    tacticalDecisionCount: 0,
    deploymentStintCount: 0,
    lineupDecisionCount: 0,
    resolvedDecisionCount: 0,
    pendingDecisionCount: 0,
    decisionTypeCounts: {},
    lineupDeltaDetails: [],
  };
  aggregate.tenures.set(key, tenure);
  return tenure;
}

function registerManagerTeamGame(
  aggregate: ManagerWorkingAggregate,
  tenure: ManagerWorkingTenure,
  game: CompletedGameRecord,
  teamId: string,
): void {
  const gameTeamKey = `${game.gameId}::${teamId}`;
  if (!aggregate.gameTeamKeys.has(gameTeamKey)) {
    aggregate.gameTeamKeys.add(gameTeamKey);
    const result = getTeamResultForGame(game, teamId);
    if (result === 'win') {
      aggregate.wins += 1;
    } else if (result === 'loss') {
      aggregate.losses += 1;
    }
  }

  if (!tenure.gameKeys.has(gameTeamKey)) {
    tenure.gameKeys.add(gameTeamKey);
    const result = getTeamResultForGame(game, teamId);
    if (result === 'win') {
      tenure.wins += 1;
    } else if (result === 'loss') {
      tenure.losses += 1;
    }
  }
}

function addManagerDecisionToAggregate(
  aggregate: ManagerWorkingAggregate,
  tenure: ManagerWorkingTenure,
  decision: ManagerDecisionRecord,
  summary: ManagerAlmanacDecisionSummary | null,
): void {
  aggregate.tacticalDecisionCount += 1;
  tenure.tacticalDecisionCount += 1;
  addDecisionTypeCount(aggregate.decisionTypeCounts, decision.decisionType);
  addDecisionTypeCount(tenure.decisionTypeCounts, decision.decisionType);

  if (decision.resolved && typeof decision.managerWpa === 'number') {
    aggregate.resolvedDecisionCount += 1;
    tenure.resolvedDecisionCount += 1;
    aggregate.tacticalManagerWpa += decision.managerWpa;
    tenure.tacticalManagerWpa += decision.managerWpa;
  } else {
    aggregate.pendingDecisionCount += 1;
    tenure.pendingDecisionCount += 1;
  }

  if (summary) {
    aggregate.bestDecision = compareBestDecision(aggregate.bestDecision, summary);
    aggregate.worstDecision = compareWorstDecision(aggregate.worstDecision, summary);
    tenure.bestDecision = compareBestDecision(tenure.bestDecision, summary);
    tenure.worstDecision = compareWorstDecision(tenure.worstDecision, summary);
  }
}

function addManagerLineupDeltaToAggregate(
  aggregate: ManagerWorkingAggregate,
  tenure: ManagerWorkingTenure,
  delta: ManagerLineupDeltaRecord,
  summary: ManagerAlmanacLineupDeltaSummary,
): void {
  aggregate.lineupDecisionCount += 1;
  tenure.lineupDecisionCount += 1;
  aggregate.lineupDeltaWpa += delta.managerWpa;
  tenure.lineupDeltaWpa += delta.managerWpa;
  aggregate.lineupDeltaDetails.push(summary);
  tenure.lineupDeltaDetails.push(summary);
  addDecisionTypeCount(aggregate.decisionTypeCounts, delta.decisionType);
  addDecisionTypeCount(tenure.decisionTypeCounts, delta.decisionType);
}

function addManagerDeploymentStintToAggregate(
  aggregate: ManagerWorkingAggregate,
  tenure: ManagerWorkingTenure,
  stint: ManagerDeploymentStintRecord,
): void {
  aggregate.deploymentStintCount += 1;
  tenure.deploymentStintCount += 1;
  aggregate.deploymentWpa += stint.managerDeploymentWpa;
  tenure.deploymentWpa += stint.managerDeploymentWpa;
}

function finalizeManagerTenure(
  tenure: ManagerWorkingTenure,
): ManagerTeamTenureAggregate {
  const decisionCount =
    tenure.tacticalDecisionCount +
    tenure.deploymentStintCount +
    tenure.lineupDecisionCount;
  const tacticalManagerWpa = roundTo(tenure.tacticalManagerWpa, 6);
  const deploymentWpa = roundTo(tenure.deploymentWpa, 6);
  const lineupDeltaWpa = roundTo(tenure.lineupDeltaWpa, 6);

  return {
    managerId: tenure.managerId,
    managerName: tenure.managerName,
    teamId: tenure.teamId,
    teamName: tenure.teamName,
    mode: tenure.mode,
    instanceId: tenure.instanceId,
    instanceName: tenure.instanceName,
    gamesManaged: tenure.gameKeys.size,
    wins: tenure.wins,
    losses: tenure.losses,
    tacticalManagerWpa,
    deploymentWpa,
    lineupDeltaWpa,
    managerValue: roundTo(tacticalManagerWpa + deploymentWpa + lineupDeltaWpa, 6),
    decisionCount,
    tacticalDecisionCount: tenure.tacticalDecisionCount,
    deploymentStintCount: tenure.deploymentStintCount,
    lineupDecisionCount: tenure.lineupDecisionCount,
    resolvedDecisionCount: tenure.resolvedDecisionCount,
    pendingDecisionCount: tenure.pendingDecisionCount,
    bestDecision: tenure.bestDecision,
    worstDecision: tenure.worstDecision,
    lineupDeltaDetails: [...tenure.lineupDeltaDetails]
      .sort((left, right) => right.date - left.date)
      .slice(0, 8),
    tendencies: createEmptyTendencies(
      tenure.decisionTypeCounts,
      tenure.tacticalDecisionCount,
      tenure.lineupDecisionCount,
    ),
  };
}

function finalizeManagerAggregate(
  aggregate: ManagerWorkingAggregate,
): ManagerAlmanacAggregate {
  const decisionCount =
    aggregate.tacticalDecisionCount +
    aggregate.deploymentStintCount +
    aggregate.lineupDecisionCount;
  const tacticalManagerWpa = roundTo(aggregate.tacticalManagerWpa, 6);
  const deploymentWpa = roundTo(aggregate.deploymentWpa, 6);
  const lineupDeltaWpa = roundTo(aggregate.lineupDeltaWpa, 6);
  const tenures = Array.from(aggregate.tenures.values())
    .map(finalizeManagerTenure)
    .sort(
      (left, right) =>
        right.managerValue - left.managerValue ||
        right.gamesManaged - left.gamesManaged ||
        left.teamName.localeCompare(right.teamName),
    );

  return {
    managerId: aggregate.managerId,
    managerName: aggregate.managerName,
    teamIds: Array.from(aggregate.teamNamesById.keys()),
    teamNames: Array.from(aggregate.teamNamesById.values()),
    modeInstances: Array.from(aggregate.modeInstancesByKey.values()).sort(
      (left, right) =>
        left.mode.localeCompare(right.mode) ||
        left.instanceName.localeCompare(right.instanceName),
    ),
    gamesManaged: aggregate.gameTeamKeys.size,
    wins: aggregate.wins,
    losses: aggregate.losses,
    tacticalManagerWpa,
    deploymentWpa,
    lineupDeltaWpa,
    managerValue: roundTo(tacticalManagerWpa + deploymentWpa + lineupDeltaWpa, 6),
    decisionCount,
    tacticalDecisionCount: aggregate.tacticalDecisionCount,
    deploymentStintCount: aggregate.deploymentStintCount,
    lineupDecisionCount: aggregate.lineupDecisionCount,
    resolvedDecisionCount: aggregate.resolvedDecisionCount,
    pendingDecisionCount: aggregate.pendingDecisionCount,
    bestDecision: aggregate.bestDecision,
    worstDecision: aggregate.worstDecision,
    lineupDeltaDetails: [...aggregate.lineupDeltaDetails]
      .sort((left, right) => right.date - left.date)
      .slice(0, 8),
    tendencies: createEmptyTendencies(
      aggregate.decisionTypeCounts,
      aggregate.tacticalDecisionCount,
      aggregate.lineupDecisionCount,
    ),
    tenures,
  };
}

function didPitchCompleteGame(
  game: CompletedGameRecord,
  pitcher: CompletedGameRecord['pitcherGameStats'][number]
): boolean {
  if (!pitcher.isStarter) {
    return false;
  }

  const teamOutsRecorded = game.pitcherGameStats
    .filter((stats) => stats.teamId === pitcher.teamId)
    .reduce((sum, stats) => sum + stats.outsRecorded, 0);

  return teamOutsRecorded > 0 && pitcher.outsRecorded === teamOutsRecorded;
}

function didPitchShutout(
  game: CompletedGameRecord,
  pitcher: CompletedGameRecord['pitcherGameStats'][number]
): boolean {
  if (!didPitchCompleteGame(game, pitcher)) {
    return false;
  }

  const opponentRuns = pitcher.teamId === game.awayTeamId
    ? game.finalScore.home
    : game.finalScore.away;

  return opponentRuns === 0;
}

export async function getExhibitionGames(
  filters: ExhibitionGameFilters = {}
): Promise<CompletedGameRecord[]> {
  const allGames = await getAllCompletedGames();
  const fromTs = parseDateBoundary(filters.dateFrom);
  const toTs = parseDateBoundary(filters.dateTo, true);

  const exhibitionGames = allGames
    .filter(isExhibitionGame)
    .filter((game) => {
      if (fromTs !== null && game.date < fromTs) {
        return false;
      }

      if (toTs !== null && game.date > toTs) {
        return false;
      }

      const involvesTeam = !filters.teamId ||
        game.awayTeamId === filters.teamId ||
        game.homeTeamId === filters.teamId;
      if (!involvesTeam) {
        return false;
      }

      if (!filters.opponentId) {
        return true;
      }

      if (filters.teamId) {
        const matchupIds = new Set([game.awayTeamId, game.homeTeamId]);
        return matchupIds.has(filters.teamId) && matchupIds.has(filters.opponentId);
      }

      return game.awayTeamId === filters.opponentId || game.homeTeamId === filters.opponentId;
    })
    .sort((a, b) => b.date - a.date);

  console.log('[M4-1] getExhibitionGames', {
    filters,
    count: exhibitionGames.length,
    games: exhibitionGames.map((game) => ({
      gameId: game.gameId,
      leagueId: getExhibitionLeagueId(game),
      competitionType: game.competitionType ?? null,
    })),
  });

  return exhibitionGames;
}

export async function getEliminationGames(
  filters: EliminationGameFilters = {},
): Promise<CompletedGameRecord[]> {
  const allGames = await getAllCompletedGames();
  const fromTs = parseDateBoundary(filters.dateFrom);
  const toTs = parseDateBoundary(filters.dateTo, true);

  return allGames
    .filter((game) => game.competitionType === 'elimination')
    .filter((game) => {
      if (filters.runId && game.competitionId !== filters.runId) {
        return false;
      }
      if (fromTs !== null && game.date < fromTs) {
        return false;
      }
      if (toTs !== null && game.date > toTs) {
        return false;
      }
      if (
        filters.teamId &&
        game.awayTeamId !== filters.teamId &&
        game.homeTeamId !== filters.teamId
      ) {
        return false;
      }
      if (!filters.opponentId) {
        return true;
      }
      if (filters.teamId) {
        const matchupIds = new Set([game.awayTeamId, game.homeTeamId]);
        return matchupIds.has(filters.teamId) && matchupIds.has(filters.opponentId);
      }
      return (
        game.awayTeamId === filters.opponentId ||
        game.homeTeamId === filters.opponentId
      );
    })
    .sort((left, right) => right.date - left.date);
}

export async function getInstanceGames(
  mode: AlmanacInstanceMode,
  instanceId: string,
): Promise<CompletedGameRecord[]> {
  if (mode === 'exhibition') {
    return getExhibitionGames().then((games) =>
      games.filter((game) => getExhibitionLeagueId(game) === instanceId),
    );
  }

  const allGames = await getAllCompletedGames();
  return allGames
    .filter((game) => isGameInInstance(game, mode, instanceId))
    .sort((a, b) => b.date - a.date);
}

export function aggregateCommittedManagerAlmanac(
  games: CompletedGameRecord[],
  filters: ManagerAlmanacFilters = {},
  profiles: ManagerProfile[] | Map<string, ManagerProfile> = [],
): ManagerAlmanacAggregate[] {
  const profileByManagerId = buildManagerProfileLookup(profiles);
  const aggregates = new Map<string, ManagerWorkingAggregate>();

  for (const game of games) {
    const descriptor = getGameInstanceDescriptor(game);
    if (!descriptor || !gameMatchesManagerFilters(game, descriptor, filters)) {
      continue;
    }

    const instanceName = getInstanceNameForGame(game, descriptor);
    const committedDecisions = game.managerDecisions ?? [];
    const committedDeploymentStints = game.managerDeploymentStints ?? [];
    const committedLineupDeltas = game.managerLineupDeltas ?? [];

    for (const decision of committedDecisions) {
      if (!managerRecordMatchesFilters(decision.managerId, decision.teamId, filters)) {
        continue;
      }

      const teamName = getTeamNameForGame(game, decision.teamId);
      const managerName = getDefaultManagerLabel(
        decision.managerId,
        decision.teamId,
        teamName,
        profileByManagerId.get(decision.managerId),
      );
      const aggregate = getOrCreateManagerAggregate(
        aggregates,
        decision.managerId,
        managerName,
      );
      const tenure = getOrCreateManagerTenure(aggregate, {
        managerId: decision.managerId,
        managerName,
        teamId: decision.teamId,
        teamName,
        mode: descriptor.mode,
        instanceId: descriptor.instanceId,
        instanceName,
      });
      const instanceKey = `${descriptor.mode}::${descriptor.instanceId}`;

      aggregate.teamNamesById.set(decision.teamId, teamName);
      aggregate.modeInstancesByKey.set(instanceKey, {
        mode: descriptor.mode,
        instanceId: descriptor.instanceId,
        instanceName,
      });
      registerManagerTeamGame(aggregate, tenure, game, decision.teamId);
      addManagerDecisionToAggregate(
        aggregate,
        tenure,
        decision,
        buildManagerDecisionSummary(game, descriptor, decision, managerName),
      );
    }

    for (const stint of committedDeploymentStints) {
      if (!managerRecordMatchesFilters(stint.managerId, stint.teamId, filters)) {
        continue;
      }

      const teamName = getTeamNameForGame(game, stint.teamId);
      const managerName = getDefaultManagerLabel(
        stint.managerId,
        stint.teamId,
        teamName,
        profileByManagerId.get(stint.managerId),
      );
      const aggregate = getOrCreateManagerAggregate(
        aggregates,
        stint.managerId,
        managerName,
      );
      const tenure = getOrCreateManagerTenure(aggregate, {
        managerId: stint.managerId,
        managerName,
        teamId: stint.teamId,
        teamName,
        mode: descriptor.mode,
        instanceId: descriptor.instanceId,
        instanceName,
      });
      const instanceKey = `${descriptor.mode}::${descriptor.instanceId}`;

      aggregate.teamNamesById.set(stint.teamId, teamName);
      aggregate.modeInstancesByKey.set(instanceKey, {
        mode: descriptor.mode,
        instanceId: descriptor.instanceId,
        instanceName,
      });
      registerManagerTeamGame(aggregate, tenure, game, stint.teamId);
      addManagerDeploymentStintToAggregate(aggregate, tenure, stint);
    }

    for (const delta of committedLineupDeltas) {
      if (!managerRecordMatchesFilters(delta.managerId, delta.teamId, filters)) {
        continue;
      }

      const teamName = getTeamNameForGame(game, delta.teamId);
      const managerName = getDefaultManagerLabel(
        delta.managerId,
        delta.teamId,
        teamName,
        profileByManagerId.get(delta.managerId),
      );
      const aggregate = getOrCreateManagerAggregate(
        aggregates,
        delta.managerId,
        managerName,
      );
      const tenure = getOrCreateManagerTenure(aggregate, {
        managerId: delta.managerId,
        managerName,
        teamId: delta.teamId,
        teamName,
        mode: descriptor.mode,
        instanceId: descriptor.instanceId,
        instanceName,
      });
      const instanceKey = `${descriptor.mode}::${descriptor.instanceId}`;

      aggregate.teamNamesById.set(delta.teamId, teamName);
      aggregate.modeInstancesByKey.set(instanceKey, {
        mode: descriptor.mode,
        instanceId: descriptor.instanceId,
        instanceName,
      });
      registerManagerTeamGame(aggregate, tenure, game, delta.teamId);
      addManagerLineupDeltaToAggregate(
        aggregate,
        tenure,
        delta,
        buildManagerLineupDeltaSummary(game, delta, managerName),
      );
    }
  }

  return Array.from(aggregates.values())
    .map(finalizeManagerAggregate)
    .sort(
      (left, right) =>
        right.managerValue - left.managerValue ||
        right.gamesManaged - left.gamesManaged ||
        left.managerName.localeCompare(right.managerName),
    );
}

function createManagerLeaderboardEntry(
  aggregate: ManagerAlmanacAggregate,
  value: number,
): ManagerLeaderboardEntry {
  return {
    managerId: aggregate.managerId,
    managerName: aggregate.managerName,
    teamNames: aggregate.teamNames,
    gamesManaged: aggregate.gamesManaged,
    value,
    tacticalManagerWpa: aggregate.tacticalManagerWpa,
    deploymentWpa: aggregate.deploymentWpa,
    lineupDeltaWpa: aggregate.lineupDeltaWpa,
    managerValue: aggregate.managerValue,
    decisionCount: aggregate.decisionCount,
    bestDecision: aggregate.bestDecision,
    worstDecision: aggregate.worstDecision,
    tendencies: aggregate.tendencies,
  };
}

function sortManagerLeaderboardEntries(
  entries: ManagerLeaderboardEntry[],
  direction: 'asc' | 'desc' = 'desc',
): ManagerLeaderboardEntry[] {
  return entries.sort((left, right) => {
    if (left.value !== right.value) {
      return direction === 'asc'
        ? left.value - right.value
        : right.value - left.value;
    }

    return left.managerName.localeCompare(right.managerName);
  });
}

export function buildManagerAlmanacLeaderboards(
  aggregates: ManagerAlmanacAggregate[],
  limit: number = 10,
): ManagerAlmanacLeaderboards {
  const top = (
    entries: ManagerLeaderboardEntry[],
    direction: 'asc' | 'desc' = 'desc',
  ) => sortManagerLeaderboardEntries(entries, direction).slice(0, limit);

  return {
    managerValue: top(
      aggregates.map((aggregate) =>
        createManagerLeaderboardEntry(aggregate, aggregate.managerValue),
      ),
    ),
    tacticalManagerWpa: top(
      aggregates.map((aggregate) =>
        createManagerLeaderboardEntry(aggregate, aggregate.tacticalManagerWpa),
      ),
    ),
    deploymentWpa: top(
      aggregates.map((aggregate) =>
        createManagerLeaderboardEntry(aggregate, aggregate.deploymentWpa),
      ),
    ),
    lineupDeltaWpa: top(
      aggregates.map((aggregate) =>
        createManagerLeaderboardEntry(aggregate, aggregate.lineupDeltaWpa),
      ),
    ),
    decisionCount: top(
      aggregates.map((aggregate) =>
        createManagerLeaderboardEntry(aggregate, aggregate.decisionCount),
      ),
    ),
    bestDecision: top(
      aggregates
        .filter((aggregate) => aggregate.bestDecision)
        .map((aggregate) =>
          createManagerLeaderboardEntry(
            aggregate,
            aggregate.bestDecision?.value ?? 0,
          ),
        ),
    ),
    worstDecision: top(
      aggregates
        .filter((aggregate) => aggregate.worstDecision)
        .map((aggregate) =>
          createManagerLeaderboardEntry(
            aggregate,
            aggregate.worstDecision?.value ?? 0,
          ),
        ),
      'asc',
    ),
    decisionTypeTendencies: top(
      aggregates.map((aggregate) =>
        createManagerLeaderboardEntry(aggregate, aggregate.decisionCount),
      ),
    ),
  };
}

export async function getManagerAlmanacAggregates(
  filters: ManagerAlmanacFilters = {},
): Promise<ManagerAlmanacAggregate[]> {
  return aggregateCommittedManagerAlmanac(
    await getAllCompletedGames(),
    filters,
  );
}

export async function getManagerAlmanacLeaderboards(
  filters: ManagerAlmanacFilters = {},
  limit: number = 10,
): Promise<ManagerAlmanacLeaderboards> {
  const aggregates = await getManagerAlmanacAggregates(filters);
  return buildManagerAlmanacLeaderboards(aggregates, limit);
}

export async function getManagerTeamTenures(
  filters: ManagerAlmanacFilters = {},
): Promise<ManagerTeamTenureAggregate[]> {
  const aggregates = await getManagerAlmanacAggregates(filters);
  return aggregates
    .flatMap((aggregate) => aggregate.tenures)
    .sort(
      (left, right) =>
        right.managerValue - left.managerValue ||
        right.gamesManaged - left.gamesManaged ||
        left.teamName.localeCompare(right.teamName) ||
        left.managerName.localeCompare(right.managerName),
    );
}

export async function getManagerAlmanacFilterOptions(): Promise<ManagerAlmanacFilterOptions> {
  const games = await getAllCompletedGames();
  const modes = new Set<AlmanacInstanceMode>();
  const instances = new Map<
    string,
    {
      mode: AlmanacInstanceMode;
      instanceId: string;
      instanceName: string;
      gameIds: Set<string>;
    }
  >();
  const teams = new Map<string, string>();

  for (const game of games) {
    const descriptor = getGameInstanceDescriptor(game);
    const managerTeamIds = new Set([
      ...(game.managerDecisions ?? []).map((decision) => decision.teamId),
      ...(game.managerDeploymentStints ?? []).map((stint) => stint.teamId),
      ...(game.managerLineupDeltas ?? []).map((delta) => delta.teamId),
    ]);

    if (!descriptor || managerTeamIds.size === 0) {
      continue;
    }

    modes.add(descriptor.mode);
    const instanceName = getInstanceNameForGame(game, descriptor);
    const instanceKey = `${descriptor.mode}::${descriptor.instanceId}`;
    const instance = instances.get(instanceKey) ?? {
      mode: descriptor.mode,
      instanceId: descriptor.instanceId,
      instanceName,
      gameIds: new Set<string>(),
    };
    instance.gameIds.add(game.gameId);
    instances.set(instanceKey, instance);

    for (const teamId of managerTeamIds) {
      teams.set(teamId, getTeamNameForGame(game, teamId));
    }
  }

  return {
    modes: Array.from(modes).sort(),
    instances: Array.from(instances.values())
      .map((instance) => ({
        mode: instance.mode,
        instanceId: instance.instanceId,
        instanceName: instance.instanceName,
        games: instance.gameIds.size,
      }))
      .sort(
        (left, right) =>
          left.mode.localeCompare(right.mode) ||
          left.instanceName.localeCompare(right.instanceName),
      ),
    teams: Array.from(teams.entries())
      .map(([teamId, teamName]) => ({ teamId, teamName }))
      .sort((left, right) => left.teamName.localeCompare(right.teamName)),
  };
}

export async function resolvePlayerIdsForInstance(
  playerId: string,
  mode: AlmanacInstanceMode,
  instanceId: string,
): Promise<string[]> {
  const registry = await getCanonicalRegistry();
  return Array.from(resolvePlayerAliasesForLeague(registry, instanceId, playerId));
}

export async function getPlayerInstanceStats(
  playerId: string,
  mode: AlmanacInstanceMode,
  instanceId: string,
): Promise<{ batting: BattingLine | null; pitching: PitchingLine | null }> {
  if (mode === 'exhibition') {
    return getPlayerExhibitionStats(playerId, instanceId);
  }

  const games = await getInstanceGames(mode, instanceId);
  const canonicalRegistry = await getCanonicalRegistry();
  const playerIds = resolvePlayerAliasesForLeague(
    canonicalRegistry,
    instanceId,
    playerId,
  );

  const battingTotals = {
    games: new Set<string>(),
    ab: 0,
    h: 0,
    r: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    rbi: 0,
    sb: 0,
    bb: 0,
    so: 0,
  };
  const pitchingTotals = {
    games: new Set<string>(),
    outsRecorded: 0,
    hitsAllowed: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    walksAllowed: 0,
    strikeouts: 0,
    completeGames: 0,
    shutouts: 0,
    saves: 0,
    wins: 0,
    losses: 0,
  };

  for (const game of games) {
    const battingEntry = getBattingEntryForAliases(game, playerIds);
    if (battingEntry) {
      const battingStats = battingEntry.stats;
      battingTotals.games.add(game.gameId);
      battingTotals.ab += battingStats.ab;
      battingTotals.h += battingStats.h;
      battingTotals.r += battingStats.r;
      battingTotals.doubles += battingStats.doubles;
      battingTotals.triples += battingStats.triples;
      battingTotals.hr += battingStats.hr;
      battingTotals.rbi += battingStats.rbi;
      battingTotals.sb += battingStats.sb;
      battingTotals.bb += battingStats.bb;
      battingTotals.so += battingStats.k;
    }

    const pitchingStats = getPitchingEntryForAliases(game, playerIds);
    if (pitchingStats) {
      pitchingTotals.games.add(game.gameId);
      pitchingTotals.outsRecorded += pitchingStats.outsRecorded;
      pitchingTotals.hitsAllowed += pitchingStats.hitsAllowed;
      pitchingTotals.runsAllowed += pitchingStats.runsAllowed;
      pitchingTotals.earnedRuns += pitchingStats.earnedRuns;
      pitchingTotals.walksAllowed += pitchingStats.walksAllowed;
      pitchingTotals.strikeouts += pitchingStats.strikeoutsThrown;
      pitchingTotals.completeGames += didPitchCompleteGame(game, pitchingStats) ? 1 : 0;
      pitchingTotals.shutouts += didPitchShutout(game, pitchingStats) ? 1 : 0;
      pitchingTotals.saves += pitchingStats.save ? 1 : 0;
      pitchingTotals.wins += pitchingStats.decision === 'W' ? 1 : 0;
      pitchingTotals.losses += pitchingStats.decision === 'L' ? 1 : 0;
    }
  }

  return {
    batting:
      battingTotals.games.size > 0
        ? {
            G: battingTotals.games.size,
            AB: battingTotals.ab,
            H: battingTotals.h,
            R: battingTotals.r,
            '2B': battingTotals.doubles,
            '3B': battingTotals.triples,
            HR: battingTotals.hr,
            RBI: battingTotals.rbi,
            SB: battingTotals.sb,
            BB: battingTotals.bb,
            SO: battingTotals.so,
            BA: battingAverage(battingTotals.h, battingTotals.ab),
          }
        : null,
    pitching:
      pitchingTotals.games.size > 0
        ? {
            G: pitchingTotals.games.size,
            IP: outsToDisplay(pitchingTotals.outsRecorded),
            H: pitchingTotals.hitsAllowed,
            R: pitchingTotals.runsAllowed,
            ER: pitchingTotals.earnedRuns,
            BB: pitchingTotals.walksAllowed,
            SO: pitchingTotals.strikeouts,
            CG: pitchingTotals.completeGames,
            SHO: pitchingTotals.shutouts,
            SV: pitchingTotals.saves,
            W: pitchingTotals.wins,
            L: pitchingTotals.losses,
            ERA: earnedRunAverage(
              pitchingTotals.earnedRuns,
              pitchingTotals.outsRecorded,
            ),
          }
        : null,
  };
}

export async function getPlayerEliminationAllTimeStats(
  playerId: string,
): Promise<{ batting: BattingLine | null; pitching: PitchingLine | null }> {
  const totals = await getEliminationAllTimePlayerStats(playerId);
  if (!totals) {
    return { batting: null, pitching: null };
  }

  return {
    batting:
      totals.battingGames > 0
        ? {
            G: totals.battingGames,
            AB: totals.atBats,
            H: totals.hits,
            R: totals.runs,
            '2B': totals.doubles,
            '3B': totals.triples,
            HR: totals.homeRuns,
            RBI: totals.rbi,
            SB: totals.stolenBases,
            BB: totals.walks,
            SO: totals.strikeouts,
            BA: battingAverage(totals.hits, totals.atBats),
          }
        : null,
    pitching:
      totals.pitchingGames > 0
        ? {
            G: totals.pitchingGames,
            IP: outsToDisplay(totals.outsRecorded),
            H: totals.hitsAllowed,
            R: totals.runsAllowed,
            ER: totals.earnedRuns,
            BB: totals.walksAllowed,
            SO: totals.pitchingStrikeouts,
            CG: totals.completeGames,
            SHO: totals.shutouts,
            SV: totals.saves,
            W: totals.wins,
            L: totals.losses,
            ERA: earnedRunAverage(totals.earnedRuns, totals.outsRecorded),
          }
        : null,
  };
}

export async function getExhibitionBattingLeaders(
  stat: ExhibitionBattingLeaderStat,
  qualified: boolean,
  limit: number
): Promise<ExhibitionLeaderEntry[]> {
  const games = await getExhibitionGames();
  const canonicalRegistry = await getCanonicalRegistry();
  const teamGameCounts = buildTeamGameCounts(games);
  const aggregates = new Map<string, BattingAggregate>();

  for (const game of games) {
    const leagueId = getExhibitionLeagueId(game);
    if (!leagueId) {
      continue;
    }

    for (const [playerId, stats] of Object.entries(game.playerStats)) {
      const identity = resolveCanonicalAggregateIdentity(
        canonicalRegistry,
        leagueId,
        playerId,
      );
      const key = `${leagueId}::${identity.aggregateKey}`;
      const aggregate = aggregates.get(key) ?? {
        leagueId,
        canonicalId: identity.canonicalId,
        playerId: identity.preferredPlayerId,
        playerName: stats.playerName,
        teamId: stats.teamId,
        lastSeenDate: game.date,
        games: new Set<string>(),
        pa: 0,
        ab: 0,
        h: 0,
        r: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        rbi: 0,
        sb: 0,
        bb: 0,
        so: 0,
      };

      if (game.date >= aggregate.lastSeenDate) {
        aggregate.playerId = identity.preferredPlayerId;
        aggregate.playerName = stats.playerName;
        aggregate.teamId = stats.teamId;
        aggregate.lastSeenDate = game.date;
      }

      aggregate.games.add(game.gameId);
      aggregate.pa += stats.pa;
      aggregate.ab += stats.ab;
      aggregate.h += stats.h;
      aggregate.r += stats.r;
      aggregate.doubles += stats.doubles;
      aggregate.triples += stats.triples;
      aggregate.hr += stats.hr;
      aggregate.rbi += stats.rbi;
      aggregate.sb += stats.sb;
      aggregate.bb += stats.bb;
      aggregate.so += stats.k;

      aggregates.set(key, aggregate);
    }
  }

  const isRateStat = stat === 'ba';

  const leaders = Array.from(aggregates.values())
    .filter((aggregate) => {
      if (!qualified || !isRateStat) {
        return true;
      }

      const teamGames = teamGameCounts.get(`${aggregate.leagueId}::${aggregate.teamId}`) ?? 0;
      return aggregate.pa >= 2 * teamGames;
    })
    .map<ExhibitionLeaderEntry>((aggregate) => {
      const valueMap: Record<ExhibitionBattingLeaderStat, number> = {
        ba: battingAverage(aggregate.h, aggregate.ab),
        hr: aggregate.hr,
        rbi: aggregate.rbi,
        h: aggregate.h,
        r: aggregate.r,
        doubles: aggregate.doubles,
        triples: aggregate.triples,
        sb: aggregate.sb,
        bb: aggregate.bb,
      };

      return {
        leagueId: aggregate.leagueId,
        instanceId: aggregate.leagueId,
        playerId: aggregate.playerId,
        playerName: aggregate.playerName,
        teamId: aggregate.teamId,
        teamName: findTeamName(games, aggregate.leagueId, aggregate.teamId),
        canonicalId: aggregate.canonicalId,
        value: valueMap[stat],
      };
    })
    .sort((a, b) => b.value - a.value || a.playerName.localeCompare(b.playerName));

  console.log('[M4-1] getExhibitionBattingLeaders', {
    stat,
    qualified,
    limit,
    returned: leaders.slice(0, limit).map((leader) => ({
      canonicalId: leader.canonicalId,
      playerId: leader.playerId,
      leagueId: leader.leagueId,
      value: leader.value,
    })),
  });

  return leaders.slice(0, limit);
}

export async function getExhibitionPitchingLeaders(
  stat: ExhibitionPitchingLeaderStat,
  qualified: boolean,
  limit: number
): Promise<ExhibitionLeaderEntry[]> {
  const games = await getExhibitionGames();
  const canonicalRegistry = await getCanonicalRegistry();
  const teamGameCounts = buildTeamGameCounts(games);
  const aggregates = new Map<string, PitchingAggregate>();

  for (const game of games) {
    const leagueId = getExhibitionLeagueId(game);
    if (!leagueId) {
      continue;
    }

    for (const pitcher of game.pitcherGameStats) {
      const identity = resolveCanonicalAggregateIdentity(
        canonicalRegistry,
        leagueId,
        pitcher.pitcherId,
      );
      const key = `${leagueId}::${identity.aggregateKey}`;
      const aggregate = aggregates.get(key) ?? {
        leagueId,
        canonicalId: identity.canonicalId,
        playerId: identity.preferredPlayerId,
        playerName: pitcher.pitcherName,
        teamId: pitcher.teamId,
        lastSeenDate: game.date,
        games: new Set<string>(),
        outsRecorded: 0,
        hitsAllowed: 0,
        runsAllowed: 0,
        earnedRuns: 0,
        walksAllowed: 0,
        strikeouts: 0,
        wins: 0,
        losses: 0,
        saves: 0,
        completeGames: 0,
        shutouts: 0,
      };

      if (game.date >= aggregate.lastSeenDate) {
        aggregate.playerId = identity.preferredPlayerId;
        aggregate.playerName = pitcher.pitcherName;
        aggregate.teamId = pitcher.teamId;
        aggregate.lastSeenDate = game.date;
      }

      aggregate.games.add(game.gameId);
      aggregate.outsRecorded += pitcher.outsRecorded;
      aggregate.hitsAllowed += pitcher.hitsAllowed;
      aggregate.runsAllowed += pitcher.runsAllowed;
      aggregate.earnedRuns += pitcher.earnedRuns;
      aggregate.walksAllowed += pitcher.walksAllowed;
      aggregate.strikeouts += pitcher.strikeoutsThrown;
      aggregate.wins += pitcher.decision === 'W' ? 1 : 0;
      aggregate.losses += pitcher.decision === 'L' ? 1 : 0;
      aggregate.saves += pitcher.save ? 1 : 0;
      aggregate.completeGames += didPitchCompleteGame(game, pitcher) ? 1 : 0;
      aggregate.shutouts += didPitchShutout(game, pitcher) ? 1 : 0;

      aggregates.set(key, aggregate);
    }
  }

  const isRateStat = stat === 'era';

  const leaders = Array.from(aggregates.values())
    .filter((aggregate) => {
      if (!qualified || !isRateStat) {
        return true;
      }

      const teamGames = teamGameCounts.get(`${aggregate.leagueId}::${aggregate.teamId}`) ?? 0;
      return aggregate.outsRecorded / 3 >= 0.8 * teamGames;
    })
    .map<ExhibitionLeaderEntry>((aggregate) => {
      const valueMap: Record<ExhibitionPitchingLeaderStat, number> = {
        era: earnedRunAverage(aggregate.earnedRuns, aggregate.outsRecorded),
        w: aggregate.wins,
        sv: aggregate.saves,
        so: aggregate.strikeouts,
        ip: outsToDisplayNumber(aggregate.outsRecorded),
        cg: aggregate.completeGames,
        sho: aggregate.shutouts,
      };

      return {
        leagueId: aggregate.leagueId,
        instanceId: aggregate.leagueId,
        playerId: aggregate.playerId,
        playerName: aggregate.playerName,
        teamId: aggregate.teamId,
        teamName: findTeamName(games, aggregate.leagueId, aggregate.teamId),
        canonicalId: aggregate.canonicalId,
        value: valueMap[stat],
      };
    })
    .sort((a, b) => {
      if (stat === 'era') {
        return a.value - b.value || a.playerName.localeCompare(b.playerName);
      }

      return b.value - a.value || a.playerName.localeCompare(b.playerName);
    });

  console.log('[M4-1] getExhibitionPitchingLeaders', {
    stat,
    qualified,
    limit,
    returned: leaders.slice(0, limit).map((leader) => ({
      canonicalId: leader.canonicalId,
      playerId: leader.playerId,
      leagueId: leader.leagueId,
      value: leader.value,
    })),
  });

  return leaders.slice(0, limit);
}

export async function resolveExhibitionPlayerIds(
  playerId: string,
  leagueId: string,
): Promise<string[]> {
  const registry = await getCanonicalRegistry();
  return Array.from(resolvePlayerAliasesForLeague(registry, leagueId, playerId));
}

export async function getPlayerExhibitionStats(
  playerId: string,
  leagueId: string
): Promise<{ batting: BattingLine | null; pitching: PitchingLine | null }> {
  const games = await getExhibitionGames();
  const canonicalRegistry = await getCanonicalRegistry();
  const playerIds = resolvePlayerAliasesForLeague(
    canonicalRegistry,
    leagueId,
    playerId,
  );
  console.log('[M4-1] getPlayerExhibitionStats query', {
    playerId,
    leagueId,
    totalGames: games.length,
    aliases: Array.from(playerIds),
  });

  const battingTotals = {
    games: new Set<string>(),
    ab: 0,
    h: 0,
    r: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    rbi: 0,
    sb: 0,
    bb: 0,
    so: 0,
  };

  const pitchingTotals = {
    games: new Set<string>(),
    outsRecorded: 0,
    hitsAllowed: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    walksAllowed: 0,
    strikeouts: 0,
    completeGames: 0,
    shutouts: 0,
    saves: 0,
    wins: 0,
    losses: 0,
  };

  for (const game of games) {
    const gameLeagueId = getExhibitionLeagueId(game);
    if (gameLeagueId !== leagueId) {
      continue;
    }

    const battingEntry = getBattingEntryForAliases(game, playerIds);
    console.log('[M4-1] getPlayerExhibitionStats game scan', {
      gameId: game.gameId,
      gameLeagueId,
      playerId,
      matchedBattingPlayerId: battingEntry?.matchedPlayerId ?? null,
      battingKeys: Object.keys(game.playerStats),
      pitcherIds: game.pitcherGameStats.map((pitcher) => pitcher.pitcherId),
    });
    if (battingEntry) {
      if (battingEntry.matchedPlayerId !== playerId) {
        console.log('[M4-1] getPlayerExhibitionStats batting alias match', {
          queriedPlayerId: playerId,
          matchedPlayerId: battingEntry.matchedPlayerId,
          gameId: game.gameId,
        });
      }

      const battingStats = battingEntry.stats;
      battingTotals.games.add(game.gameId);
      battingTotals.ab += battingStats.ab;
      battingTotals.h += battingStats.h;
      battingTotals.r += battingStats.r;
      battingTotals.doubles += battingStats.doubles;
      battingTotals.triples += battingStats.triples;
      battingTotals.hr += battingStats.hr;
      battingTotals.rbi += battingStats.rbi;
      battingTotals.sb += battingStats.sb;
      battingTotals.bb += battingStats.bb;
      battingTotals.so += battingStats.k;
    }

    const pitchingStats = getPitchingEntryForAliases(game, playerIds);
    if (pitchingStats) {
      if (pitchingStats.pitcherId !== playerId) {
        console.log('[M4-1] getPlayerExhibitionStats pitching alias match', {
          queriedPlayerId: playerId,
          matchedPlayerId: pitchingStats.pitcherId,
          gameId: game.gameId,
        });
      }

      pitchingTotals.games.add(game.gameId);
      pitchingTotals.outsRecorded += pitchingStats.outsRecorded;
      pitchingTotals.hitsAllowed += pitchingStats.hitsAllowed;
      pitchingTotals.runsAllowed += pitchingStats.runsAllowed;
      pitchingTotals.earnedRuns += pitchingStats.earnedRuns;
      pitchingTotals.walksAllowed += pitchingStats.walksAllowed;
      pitchingTotals.strikeouts += pitchingStats.strikeoutsThrown;
      pitchingTotals.completeGames += didPitchCompleteGame(game, pitchingStats) ? 1 : 0;
      pitchingTotals.shutouts += didPitchShutout(game, pitchingStats) ? 1 : 0;
      pitchingTotals.saves += pitchingStats.save ? 1 : 0;
      pitchingTotals.wins += pitchingStats.decision === 'W' ? 1 : 0;
      pitchingTotals.losses += pitchingStats.decision === 'L' ? 1 : 0;
    }
  }

  console.log('[M4-1] getPlayerExhibitionStats result', {
    playerId,
    leagueId,
    battingGames: battingTotals.games.size,
    battingRbi: battingTotals.rbi,
    pitchingGames: pitchingTotals.games.size,
  });

  const batting = battingTotals.games.size > 0
    ? {
        G: battingTotals.games.size,
        AB: battingTotals.ab,
        H: battingTotals.h,
        R: battingTotals.r,
        '2B': battingTotals.doubles,
        '3B': battingTotals.triples,
        HR: battingTotals.hr,
        RBI: battingTotals.rbi,
        SB: battingTotals.sb,
        BB: battingTotals.bb,
        SO: battingTotals.so,
        BA: battingAverage(battingTotals.h, battingTotals.ab),
      }
    : null;

  const pitching = pitchingTotals.games.size > 0
    ? {
        G: pitchingTotals.games.size,
        IP: outsToDisplay(pitchingTotals.outsRecorded),
        H: pitchingTotals.hitsAllowed,
        R: pitchingTotals.runsAllowed,
        ER: pitchingTotals.earnedRuns,
        BB: pitchingTotals.walksAllowed,
        SO: pitchingTotals.strikeouts,
        CG: pitchingTotals.completeGames,
        SHO: pitchingTotals.shutouts,
        SV: pitchingTotals.saves,
        W: pitchingTotals.wins,
        L: pitchingTotals.losses,
        ERA: earnedRunAverage(pitchingTotals.earnedRuns, pitchingTotals.outsRecorded),
      }
    : null;

  return { batting, pitching };
}

export async function getTeamRosterFromGames(
  instanceId: string,
  teamId: string
): Promise<Array<{ playerId: string; playerName: string; canonicalId: string; instanceId: string; games: number }>> {
  const allGames = await getAllCompletedGames();
  const mode = inferInstanceModeFromGames(allGames, instanceId) ?? 'exhibition';
  const games = allGames
    .filter((game) => isGameInInstance(game, mode, instanceId))
    .filter((game) => game.awayTeamId === teamId || game.homeTeamId === teamId)
    .sort((a, b) => b.date - a.date);
  const canonicalRegistry = await getCanonicalRegistry();
  const roster = new Map<
    string,
    {
      canonicalId: string;
      playerId: string;
      playerName: string;
      games: Set<string>;
    }
  >();

  for (const game of games) {
    for (const [playerId, stats] of Object.entries(game.playerStats)) {
      if (stats.teamId !== teamId) {
        continue;
      }

      const identity = resolveCanonicalAggregateIdentity(
        canonicalRegistry,
        instanceId,
        playerId,
      );
      const entry = roster.get(identity.aggregateKey) ?? {
        canonicalId: identity.canonicalId,
        playerId: identity.preferredPlayerId,
        playerName: stats.playerName,
        games: new Set<string>(),
      };
      entry.playerId = identity.preferredPlayerId;
      entry.playerName = stats.playerName;
      entry.games.add(game.gameId);
      roster.set(identity.aggregateKey, entry);
    }

    for (const pitcher of game.pitcherGameStats) {
      if (pitcher.teamId !== teamId) {
        continue;
      }

      const identity = resolveCanonicalAggregateIdentity(
        canonicalRegistry,
        instanceId,
        pitcher.pitcherId,
      );
      const entry = roster.get(identity.aggregateKey) ?? {
        canonicalId: identity.canonicalId,
        playerId: identity.preferredPlayerId,
        playerName: pitcher.pitcherName,
        games: new Set<string>(),
      };
      entry.playerId = identity.preferredPlayerId;
      entry.playerName = pitcher.pitcherName;
      entry.games.add(game.gameId);
      roster.set(identity.aggregateKey, entry);
    }
  }

  return Array.from(roster.values())
    .map((entry) => ({
      playerId: entry.playerId,
      playerName: entry.playerName,
      canonicalId: entry.canonicalId,
      instanceId,
      games: entry.games.size,
    }))
    .sort((a, b) => b.games - a.games || a.playerName.localeCompare(b.playerName));
}

export async function searchArchivedPlayerInstances(
  query: string,
  modes: AlmanacInstanceMode[] = ['exhibition', 'elimination', 'franchise'],
): Promise<ExhibitionPlayerSearchEntry[]> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const games = await getAllCompletedGames();
  const allowedModes = new Set(modes);
  const canonicalRegistry = await getCanonicalRegistry();
  const players = new Map<string, ExhibitionPlayerSearchEntry>();

  const upsertEntry = (
    mode: AlmanacInstanceMode,
    instanceId: string,
    playerId: string,
    playerName: string,
    teamId: string,
    teamName: string,
  ) => {
    if (!playerName.toLowerCase().includes(normalizedQuery)) {
      return;
    }

    const identity = resolveCanonicalAggregateIdentity(
      canonicalRegistry,
      instanceId,
      playerId,
    );
    const key = `${mode}::${instanceId}::${identity.aggregateKey}`;
    const existing = players.get(key);
    if (existing) {
      existing.games += 1;
      existing.playerId = identity.preferredPlayerId;
      existing.playerName = playerName;
      existing.teamId = teamId;
      existing.teamName = teamName;
      return;
    }

    players.set(key, {
      playerId: identity.preferredPlayerId,
      playerName,
      leagueId: instanceId,
      instanceId,
      canonicalId: identity.canonicalId,
      teamId,
      teamName,
      games: 1,
      mode,
    });
  };

  for (const game of games) {
    const descriptor = getGameInstanceDescriptor(game);
    if (!descriptor || !allowedModes.has(descriptor.mode)) {
      continue;
    }

    for (const [playerId, stats] of Object.entries(game.playerStats)) {
      upsertEntry(
        descriptor.mode,
        descriptor.instanceId,
        playerId,
        stats.playerName,
        stats.teamId,
        stats.teamId === game.awayTeamId ? game.awayTeamName : game.homeTeamName,
      );
    }

    for (const pitcher of game.pitcherGameStats) {
      upsertEntry(
        descriptor.mode,
        descriptor.instanceId,
        pitcher.pitcherId,
        pitcher.pitcherName,
        pitcher.teamId,
        pitcher.teamId === game.awayTeamId ? game.awayTeamName : game.homeTeamName,
      );
    }
  }

  const results = Array.from(players.values()).sort(
    (a, b) => b.games - a.games || a.playerName.localeCompare(b.playerName),
  );

  console.log('[M4-1] searchArchivedPlayerInstances', {
    query,
    normalizedQuery,
    modes,
    results: results.map((result) => ({
      canonicalId: result.canonicalId,
      playerId: result.playerId,
      instanceId: result.instanceId,
      mode: result.mode,
      games: result.games,
    })),
  });

  return results;
}

export async function searchExhibitionPlayerInstances(
  query: string,
): Promise<ExhibitionPlayerSearchEntry[]> {
  return searchArchivedPlayerInstances(query, ['exhibition']);
}

export async function getGameAtBatEvents(gameId: string): Promise<AtBatEvent[]> {
  return getGameEvents(gameId);
}
