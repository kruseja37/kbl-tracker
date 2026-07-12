/**
 * STAKES-1-CORE / Living Season Narrative Mathematics §1, §4, §8.
 *
 * Read-only pre-game anticipation compute.  This leaf intentionally does not
 * register a store, emit reporter copy, or write through any accessor.
 */

import {
  CAREER_BATTING_TIERS,
  CAREER_PITCHING_TIERS,
  SEASON_BATTING_THRESHOLDS,
  SEASON_PITCHING_THRESHOLDS,
} from './milestoneDetector';
import { getCareerStats, type CareerStats } from './careerStorage';
import {
  getSeasonBattingStats,
  getSeasonPitchingStats,
  type PlayerSeasonBatting,
  type PlayerSeasonPitching,
} from './seasonStorage';
import { getGame, type ScheduledGame } from './scheduleStorage';
import { getAllFranchisePlayers, getAllFranchiseTeams } from './franchisePlayerStorage';
import {
  getPlayerRosterStatusForLeague,
  getPlayerTeamIdForLeague,
  type Player,
  type Team,
} from './leagueBuilderStorage';
import {
  FRANCHISE_STADIUM_RECORD_TYPE_POLARITY,
  listFranchiseStadiumRecords,
  type FranchiseStadiumRecord,
} from './franchiseStadiumRecordsStorage';
import {
  getFranchiseRelationshipEdgesByScope,
  type RelationshipEdgeRow,
} from './franchiseRelationshipEdgesStorage';
import { getFranchiseTrueValueRows, type FranchiseTrueValueRow } from './franchiseTrueValueStorage';
import {
  recomputeFranchiseL12StandingsForCompletedGame,
  type RecomputeL12Result,
} from './franchiseRaceStandingsCompute';
import { getFranchiseMoraleSnapshot } from './franchiseMoraleState';
import { getRecentGames, type CompletedGameRecord, type PersistedGameState } from './gameStorage';
import {
  isFranchisePhase2FameEnabled,
  isFranchisePhase2L11Enabled,
  isFranchisePhase2L12Enabled,
  isFranchisePhase2L13Enabled,
  isFranchisePhase2MoraleEnabled,
  isFranchisePhase2StadiumRecordsEnabled,
} from './franchisePhase2Flags';
import { L11_AUTO_BACKSTOP_TUNING } from './franchiseManagerAutoBackstop';
import { fnv1aRelationshipIntelSeed } from './franchiseRelationshipIntel';

export const STAKES_TUNING = {
  /** §16 SIM-TUNE placeholders: shapes are locked; magnitudes await the Simulation Gate. */
  milestoneStakeFloor: 0.6,
  milestoneDefaultWindow: 5,
  milestoneWindows: {
    homeRuns: 5,
    wins: 3,
    strikeouts: 100,
    saves: 5,
    hits: 25,
    rbi: 25,
    runs: 25,
    stolenBases: 10,
    walks: 25,
    doubles: 10,
    triples: 5,
    losses: 3,
    blownSaves: 3,
    homeRunsAllowed: 5,
    walksAllowed: 10,
  },
  recordSingleGameReachableValue: 0.75,
  recordCountingWindow: 5,
  grudgeIntensityFloor: 0.18,
  revengeFormationSource: 'overtake' as const,
  raceSwingBand: 0.5,
  hotSeatBand: 6,
  liveStreakMinimumGames: 3,
  liveStreakFullValueGames: 7,
  completedGameReadLimit: 1000,
  familyWeights: {
    milestoneProximity: 1,
    recordProximity: 0.9,
    grudgeLines: 1.1,
    racePressure: 1.15,
    hotSeat: 1.05,
    liveStreaks: 0.85,
  },
  zero: 0,
  full: 1,
  hashMaxExclusive: 0x100000000,
} as const;

export type StakesFamily =
  | 'milestoneProximity'
  | 'recordProximity'
  | 'grudgeLines'
  | 'racePressure'
  | 'hotSeat'
  | 'liveStreaks';

export const STAKES_FAMILIES: readonly StakesFamily[] = [
  'milestoneProximity',
  'recordProximity',
  'grudgeLines',
  'racePressure',
  'hotSeat',
  'liveStreaks',
] as const;

export interface FranchiseStakesScope {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  /** Optional because the canonical franchise team snapshot already carries it. */
  leagueId?: string;
}

export type StakeFactValue = string | number | boolean | null | readonly string[] | readonly number[];
export type StakeFacts = Readonly<Record<string, StakeFactValue>>;

export interface StakesCandidate {
  /** Internal deterministic identity; intentionally not a prose/display field. */
  id: string;
  family: StakesFamily;
  playerIds: string[];
  teamIds: string[];
  value: number;
  oneLineFacts: StakeFacts;
}

export interface StakesFamilyVector {
  family: StakesFamily;
  value: number;
  candidates: StakesCandidate[];
}

export interface StakesVector {
  scope: FranchiseStakesScope;
  scheduleGameId: string;
  families: Record<StakesFamily, StakesFamilyVector>;
}

export interface TonightStakeItem {
  family: StakesFamily;
  playerIds: string[];
  teamIds: string[];
  value: number;
  oneLineFacts: StakeFacts;
}

type RosterContext = {
  players: Player[];
  teams: Team[];
  awayTeamId: string;
  homeTeamId: string;
  awayPlayers: Player[];
  homePlayers: Player[];
  playersById: Map<string, Player>;
  teamsById: Map<string, Team>;
  leagueId: string | null;
};

type ThresholdDefinition = {
  threshold: number;
  description: string;
};

type CareerThresholdDefinition = {
  stat: string;
  tiers: Array<{ threshold: number }>;
};

type MilestoneProbe = {
  player: Player;
  source: 'season' | 'career';
  stat: string;
  currentValue: number;
  threshold: number;
  description: string;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clamp01(value: number): number {
  return Math.min(STAKES_TUNING.full, Math.max(STAKES_TUNING.zero, value));
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right);
}

function playerName(player: Player | undefined, playerId: string): string {
  if (!player) return playerId;
  const name = [player.firstName, player.lastName].filter(Boolean).join(' ').trim();
  return name || playerId;
}

function teamName(team: Team | undefined, teamId: string): string {
  return team?.name?.trim() || teamId;
}

function familyVector(family: StakesFamily, candidates: StakesCandidate[]): StakesFamilyVector {
  const ordered = candidates
    .filter((candidate) => candidate.value > STAKES_TUNING.zero)
    .map((candidate) => ({ ...candidate, value: clamp01(candidate.value) }))
    .sort((left, right) =>
      right.value - left.value ||
      compareText(left.id, right.id),
    );
  return {
    family,
    value: ordered.reduce<number>(
      (highest, candidate) => Math.max(highest, candidate.value),
      STAKES_TUNING.zero,
    ),
    candidates: ordered,
  };
}

function emptyFamily(family: StakesFamily): StakesFamilyVector {
  return familyVector(family, []);
}

function emptyVector(scope: FranchiseStakesScope, scheduleGameId: string): StakesVector {
  return {
    scope: { ...scope },
    scheduleGameId,
    families: Object.fromEntries(
      STAKES_FAMILIES.map((family) => [family, emptyFamily(family)]),
    ) as Record<StakesFamily, StakesFamilyVector>,
  };
}

function playerValue(player: Player, stat: string): number {
  const value = (player as unknown as Record<string, unknown>)[stat];
  return isFiniteNumber(value) ? value : STAKES_TUNING.zero;
}

function statsValue(stats: unknown, stat: string): number {
  const value = (stats as Record<string, unknown> | null | undefined)?.[stat];
  return isFiniteNumber(value) ? value : STAKES_TUNING.zero;
}

function milestoneWindow(stat: string): number {
  return STAKES_TUNING.milestoneWindows[
    stat as keyof typeof STAKES_TUNING.milestoneWindows
  ] ?? STAKES_TUNING.milestoneDefaultWindow;
}

function milestoneProximity(currentValue: number, threshold: number, window: number): number {
  if (!isFiniteNumber(currentValue) || !isFiniteNumber(threshold) || !isFiniteNumber(window) || window <= STAKES_TUNING.zero) {
    return STAKES_TUNING.zero;
  }
  return clamp01(STAKES_TUNING.full - ((threshold - currentValue) / window));
}

function nextThreshold<T extends { threshold: number }>(
  currentValue: number,
  definitions: readonly T[],
): T | null {
  return definitions
    .filter((definition) => definition.threshold > currentValue)
    .sort((left, right) => left.threshold - right.threshold)[0] ?? null;
}

function seasonMilestoneProbes(
  player: Player,
  batting: PlayerSeasonBatting | undefined,
  pitching: PlayerSeasonPitching | undefined,
): MilestoneProbe[] {
  const probes: MilestoneProbe[] = [];
  const sources: Array<{
    stats: PlayerSeasonBatting | PlayerSeasonPitching | undefined;
    definitions: Record<string, readonly ThresholdDefinition[]>;
  }> = [
    { stats: batting, definitions: SEASON_BATTING_THRESHOLDS },
    { stats: pitching, definitions: SEASON_PITCHING_THRESHOLDS },
  ];

  for (const source of sources) {
    if (!source.stats) continue;
    for (const [stat, definitions] of Object.entries(source.definitions)) {
      const currentValue = statsValue(source.stats, stat);
      const nearest = nextThreshold(currentValue, definitions);
      if (!nearest) continue;
      probes.push({
        player,
        source: 'season',
        stat,
        currentValue,
        threshold: nearest.threshold,
        description: nearest.description,
      });
    }
  }
  return probes;
}

function careerMilestoneProbes(player: Player, career: CareerStats): MilestoneProbe[] {
  const probes: MilestoneProbe[] = [];
  const sources: Array<{
    stats: CareerStats['batting'] | CareerStats['pitching'];
    definitions: Record<string, CareerThresholdDefinition>;
  }> = [
    { stats: career.batting, definitions: CAREER_BATTING_TIERS },
    { stats: career.pitching, definitions: CAREER_PITCHING_TIERS },
  ];

  for (const source of sources) {
    if (!source.stats) continue;
    for (const definition of Object.values(source.definitions)) {
      const currentValue = statsValue(source.stats, definition.stat);
      const nearest = nextThreshold(currentValue, definition.tiers);
      if (!nearest) continue;
      probes.push({
        player,
        source: 'career',
        stat: definition.stat,
        currentValue,
        threshold: nearest.threshold,
        description: `${definition.stat} career milestone`,
      });
    }
  }
  return probes;
}

function nearestMilestoneProbe(probes: MilestoneProbe[]): MilestoneProbe | null {
  return probes.sort((left, right) =>
    (left.threshold - left.currentValue) - (right.threshold - right.currentValue) ||
    compareText(left.source, right.source) ||
    compareText(left.stat, right.stat),
  )[0] ?? null;
}

function resolveLeagueId(scope: FranchiseStakesScope, teams: readonly Team[]): string | null {
  if (scope.leagueId?.trim()) return scope.leagueId;
  return teams
    .flatMap((team) => team.leagueIds ?? [])
    .filter((leagueId) => leagueId.trim().length > STAKES_TUNING.zero)
    .sort(compareText)[0] ?? null;
}

function resolveRosterContext(
  scope: FranchiseStakesScope,
  game: ScheduledGame,
  players: Player[],
  teams: Team[],
): RosterContext {
  const leagueId = resolveLeagueId(scope, teams);
  const awayPlayers = leagueId
    ? players.filter((player) =>
      getPlayerRosterStatusForLeague(player, leagueId) === 'MLB' &&
      getPlayerTeamIdForLeague(player, leagueId) === game.awayTeamId,
    )
    : [];
  const homePlayers = leagueId
    ? players.filter((player) =>
      getPlayerRosterStatusForLeague(player, leagueId) === 'MLB' &&
      getPlayerTeamIdForLeague(player, leagueId) === game.homeTeamId,
    )
    : [];
  return {
    players,
    teams,
    awayTeamId: game.awayTeamId,
    homeTeamId: game.homeTeamId,
    awayPlayers: awayPlayers.sort((left, right) => compareText(left.id, right.id)),
    homePlayers: homePlayers.sort((left, right) => compareText(left.id, right.id)),
    playersById: new Map(players.map((player) => [player.id, player])),
    teamsById: new Map(teams.map((team) => [team.id, team])),
    leagueId,
  };
}

function allGameRosterPlayers(context: RosterContext): Player[] {
  return [...context.awayPlayers, ...context.homePlayers]
    .sort((left, right) => compareText(left.id, right.id));
}

async function readOr<T>(loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader();
  } catch {
    return fallback;
  }
}

async function computeMilestoneFamily(
  scope: FranchiseStakesScope,
  context: RosterContext,
): Promise<StakesFamilyVector> {
  if (!franchiseStakesComputeSeam.isFameEnabled()) return emptyFamily('milestoneProximity');

  const rosteredPlayers = allGameRosterPlayers(context);
  const [battingRows, pitchingRows] = await Promise.all([
    readOr(() => franchiseStakesComputeSeam.getSeasonBattingStats(scope.statsScopeId), [] as PlayerSeasonBatting[]),
    readOr(() => franchiseStakesComputeSeam.getSeasonPitchingStats(scope.statsScopeId), [] as PlayerSeasonPitching[]),
  ]);
  const battingByPlayerId = new Map(battingRows.map((row) => [row.playerId, row]));
  const pitchingByPlayerId = new Map(pitchingRows.map((row) => [row.playerId, row]));
  const careers = await Promise.all(rosteredPlayers.map(async (player) => [
    player.id,
    await readOr(() => franchiseStakesComputeSeam.getCareerStats(player.id), {
      batting: null,
      pitching: null,
      fielding: null,
    } as CareerStats),
  ] as const));
  const careerByPlayerId = new Map(careers);

  const candidates = rosteredPlayers.flatMap((player): StakesCandidate[] => {
    const probe = nearestMilestoneProbe([
      ...seasonMilestoneProbes(player, battingByPlayerId.get(player.id), pitchingByPlayerId.get(player.id)),
      ...careerMilestoneProbes(player, careerByPlayerId.get(player.id) ?? {
        batting: null,
        pitching: null,
        fielding: null,
      }),
    ]);
    if (!probe) return [];
    const window = milestoneWindow(probe.stat);
    const value = milestoneProximity(probe.currentValue, probe.threshold, window);
    if (value < STAKES_TUNING.milestoneStakeFloor) return [];
    return [{
      id: `milestone:${player.id}:${probe.source}:${probe.stat}:${probe.threshold}`,
      family: 'milestoneProximity',
      playerIds: [player.id],
      teamIds: [],
      value,
      oneLineFacts: {
        playerName: playerName(player, player.id),
        milestoneSource: probe.source,
        stat: probe.stat,
        currentValue: probe.currentValue,
        threshold: probe.threshold,
        remaining: probe.threshold - probe.currentValue,
        window,
        milestone: probe.description,
      },
    }];
  });

  // Keep team ids alongside the fact without trusting player names/strings as identity.
  const withTeamIds = candidates.map((candidate) => ({
    ...candidate,
    teamIds: rosteredTeamIds(candidate.playerIds, context),
  }));
  return familyVector('milestoneProximity', withTeamIds);
}

function rosteredTeamIds(playerIds: readonly string[], context: RosterContext): string[] {
  const awayIds = new Set(context.awayPlayers.map((player) => player.id));
  const homeIds = new Set(context.homePlayers.map((player) => player.id));
  return [
    ...(playerIds.some((playerId) => awayIds.has(playerId)) ? [context.awayTeamId] : []),
    ...(playerIds.some((playerId) => homeIds.has(playerId)) ? [context.homeTeamId] : []),
  ].filter((teamId): teamId is string => Boolean(teamId));
}

function gameTeamIdForPlayer(playerId: string, game: ScheduledGame, context: RosterContext): string | null {
  if (context.awayPlayers.some((player) => player.id === playerId)) return game.awayTeamId;
  if (context.homePlayers.some((player) => player.id === playerId)) return game.homeTeamId;
  return null;
}

function isCountingRecord(record: FranchiseStadiumRecord): boolean {
  return record.recordType === 'most-hr-here-season';
}

function leagueRecordValue(record: FranchiseStadiumRecord, allRecords: readonly FranchiseStadiumRecord[]): number {
  const matching = allRecords.filter((candidate) =>
    candidate.recordType === record.recordType && candidate.recordKey === record.recordKey,
  );
  const values = matching.map((candidate) => candidate.value).filter(isFiniteNumber);
  if (values.length === STAKES_TUNING.zero) return record.value;
  return FRANCHISE_STADIUM_RECORD_TYPE_POLARITY[record.recordType] === -1
    ? Math.min(...values)
    : Math.max(...values);
}

async function computeRecordFamily(
  scope: FranchiseStakesScope,
  game: ScheduledGame,
  context: RosterContext,
): Promise<StakesFamilyVector> {
  if (!franchiseStakesComputeSeam.isStadiumRecordsEnabled()) return emptyFamily('recordProximity');
  const homeTeam = context.teamsById.get(game.homeTeamId);
  const stadiumId = homeTeam?.stadiumId ?? homeTeam?.stadium ?? null;
  if (!stadiumId) return emptyFamily('recordProximity');

  const records = await readOr(
    () => franchiseStakesComputeSeam.listStadiumRecords(scope),
    [] as FranchiseStadiumRecord[],
  );
  const homeRecords = records.filter((record) => record.stadiumId === stadiumId);
  const battingRows = await readOr(
    () => franchiseStakesComputeSeam.getSeasonBattingStats(scope.statsScopeId),
    [] as PlayerSeasonBatting[],
  );
  const battingByPlayerId = new Map(battingRows.map((row) => [row.playerId, row]));
  const rosteredPlayers = allGameRosterPlayers(context);

  const candidates = homeRecords.flatMap((record): StakesCandidate[] => {
    const leagueValue = leagueRecordValue(record, records);
    if (!isCountingRecord(record)) {
      return [{
        id: `record:${record.id}:single-game`,
        family: 'recordProximity',
        playerIds: [...record.leaderPlayerIds].sort(compareText),
        teamIds: [...record.leaderTeamIds].sort(compareText),
        value: STAKES_TUNING.recordSingleGameReachableValue,
        oneLineFacts: {
          recordScope: 'park-and-league',
          stadiumName: record.stadiumName,
          recordType: record.recordType,
          parkRecordValue: record.value,
          leagueRecordValue: leagueValue,
          reachability: 'single-game',
          leaderNames: [...record.leaderPlayerNames].sort(compareText),
        },
      }];
    }

    return rosteredPlayers.flatMap((player): StakesCandidate[] => {
      const currentValue = battingByPlayerId.get(player.id)?.homeRuns ?? STAKES_TUNING.zero;
      const threshold = Math.max(record.value, leagueValue);
      const value = milestoneProximity(currentValue, threshold, STAKES_TUNING.recordCountingWindow);
      if (value < STAKES_TUNING.milestoneStakeFloor) return [];
      const teamId = gameTeamIdForPlayer(player.id, game, context);
      return [{
        id: `record:${record.id}:counting:${player.id}`,
        family: 'recordProximity',
        playerIds: [player.id],
        teamIds: teamId ? [teamId] : [],
        value,
        oneLineFacts: {
          recordScope: 'park-and-league',
          playerName: playerName(player, player.id),
          stadiumName: record.stadiumName,
          recordType: record.recordType,
          currentValue,
          parkRecordValue: record.value,
          leagueRecordValue: leagueValue,
          remaining: threshold - currentValue,
          window: STAKES_TUNING.recordCountingWindow,
        },
      }];
    });
  });

  return familyVector('recordProximity', candidates);
}

async function computeGrudgeFamily(
  scope: FranchiseStakesScope,
  game: ScheduledGame,
  context: RosterContext,
): Promise<StakesFamilyVector> {
  if (!franchiseStakesComputeSeam.isL13Enabled()) return emptyFamily('grudgeLines');
  const edges = await readOr(
    () => franchiseStakesComputeSeam.getRelationshipEdges(scope),
    [] as RelationshipEdgeRow[],
  );
  const awayIds = new Set(context.awayPlayers.map((player) => player.id));
  const homeIds = new Set(context.homePlayers.map((player) => player.id));
  const candidates = edges.flatMap((edge): StakesCandidate[] => {
    const opposing = (awayIds.has(edge.player1Id) && homeIds.has(edge.player2Id)) ||
      (awayIds.has(edge.player2Id) && homeIds.has(edge.player1Id));
    const intensity = clamp01(edge.intensity);
    if (!opposing || edge.potential || edge.dissolvedAtGameNumber !== null || intensity < STAKES_TUNING.grudgeIntensityFloor) {
      return [];
    }
    const playerIds = [edge.player1Id, edge.player2Id].sort(compareText);
    return [{
      id: `grudge:${edge.id}`,
      family: 'grudgeLines',
      playerIds,
      teamIds: [game.awayTeamId, game.homeTeamId].sort(compareText),
      value: intensity,
      oneLineFacts: {
        playerNames: playerIds.map((playerId) => playerName(context.playersById.get(playerId), playerId)),
        relationshipType: edge.type,
        intensity,
        formationSource: edge.formationSource ?? 'formation',
        revenge: edge.formationSource === STAKES_TUNING.revengeFormationSource,
      },
    }];
  });
  return familyVector('grudgeLines', candidates);
}

function playerIsInTonightRoster(playerId: string, context: RosterContext): boolean {
  return context.awayPlayers.some((player) => player.id === playerId) ||
    context.homePlayers.some((player) => player.id === playerId);
}

function raceCandidate(
  familyId: string,
  category: string,
  playerId: string,
  leaderPlayerId: string,
  gap: number,
  context: RosterContext,
): StakesCandidate | null {
  if (!playerIsInTonightRoster(playerId, context) || gap > STAKES_TUNING.raceSwingBand) return null;
  const value = clamp01(STAKES_TUNING.full - (gap / STAKES_TUNING.raceSwingBand));
  return {
    id: `race:${familyId}:${category}:${playerId}:${leaderPlayerId}`,
    family: 'racePressure',
    playerIds: [playerId, leaderPlayerId].filter((value, index, values) => values.indexOf(value) === index).sort(compareText),
    teamIds: rosteredTeamIds([playerId, leaderPlayerId], context),
    value,
    oneLineFacts: {
      raceFamily: familyId,
      category,
      playerName: playerName(context.playersById.get(playerId), playerId),
      leaderName: playerName(context.playersById.get(leaderPlayerId), leaderPlayerId),
      gap,
      swingBand: STAKES_TUNING.raceSwingBand,
    },
  };
}

function raceCandidatesFromResult(result: RecomputeL12Result, context: RosterContext): StakesCandidate[] {
  if (result.status !== 'computed' || !result.standings) return [];
  const candidates: StakesCandidate[] = [];
  for (const [category, standing] of Object.entries(result.standings.meritRaces)) {
    const leader = standing?.[0];
    if (!leader) continue;
    for (const contender of standing ?? []) {
      if (contender.playerId === leader.playerId) continue;
      const candidate = raceCandidate(
        'merit',
        category,
        contender.playerId,
        leader.playerId,
        Math.abs(contender.marginToWinner),
        context,
      );
      if (candidate) candidates.push(candidate);
    }
  }
  for (const [category, standing] of Object.entries(result.standings.tvFamily)) {
    const leader = standing[0];
    if (!leader) continue;
    for (const contender of standing) {
      if (contender.playerId === leader.playerId) continue;
      const candidate = raceCandidate(
        'true-value',
        category,
        contender.playerId,
        leader.playerId,
        Math.abs(leader.score - contender.score),
        context,
      );
      if (candidate) candidates.push(candidate);
    }
  }
  return candidates;
}

async function computeRaceFamily(
  scope: FranchiseStakesScope,
  game: ScheduledGame,
  context: RosterContext,
): Promise<StakesFamilyVector> {
  if (!franchiseStakesComputeSeam.isL12Enabled()) return emptyFamily('racePressure');
  const rows = await readOr(
    () => franchiseStakesComputeSeam.getTrueValueRows(scope),
    [] as FranchiseTrueValueRow[],
  );
  const result = await readOr(
    () => franchiseStakesComputeSeam.recomputeL12Standings(
      { gameId: game.id } as PersistedGameState,
      { ...scope, rows },
    ),
    { status: 'dark-noop', reason: 'L12 standings unavailable.' } as RecomputeL12Result,
  );
  return familyVector('racePressure', raceCandidatesFromResult(result, context));
}

async function computeHotSeatFamily(
  scope: FranchiseStakesScope,
  game: ScheduledGame,
  context: RosterContext,
): Promise<StakesFamilyVector> {
  if (!franchiseStakesComputeSeam.isL11Enabled()) return emptyFamily('hotSeat');
  const teamIds = [game.awayTeamId, game.homeTeamId].sort(compareText);
  const candidates = (await Promise.all(teamIds.map(async (teamId): Promise<StakesCandidate | null> => {
    const snapshot = await readOr(
      () => franchiseStakesComputeSeam.getTeamFanMorale(scope, teamId),
      null,
    );
    if (!snapshot || !isFiniteNumber(snapshot.currentValue)) return null;
    const distance = Math.max(
      STAKES_TUNING.zero,
      snapshot.currentValue - L11_AUTO_BACKSTOP_TUNING.armingThreshold,
    );
    if (distance > STAKES_TUNING.hotSeatBand) return null;
    return {
      id: `hot-seat:${teamId}`,
      family: 'hotSeat',
      playerIds: [],
      teamIds: [teamId],
      value: clamp01(STAKES_TUNING.full - (distance / STAKES_TUNING.hotSeatBand)),
      oneLineFacts: {
        teamName: teamName(context.teamsById.get(teamId), teamId),
        fanMorale: snapshot.currentValue,
        firingThreshold: L11_AUTO_BACKSTOP_TUNING.armingThreshold,
        hotSeatBand: STAKES_TUNING.hotSeatBand,
        distanceToThreshold: distance,
      },
    };
  }))).filter((candidate): candidate is StakesCandidate => candidate !== null);
  return familyVector('hotSeat', candidates);
}

function completedGameMatchesScope(game: CompletedGameRecord, scope: FranchiseStakesScope): boolean {
  return game.franchiseId === scope.franchiseId &&
    game.seasonId === scope.seasonId &&
    game.statsScopeId === scope.statsScopeId;
}

function completedGameOrder(left: CompletedGameRecord, right: CompletedGameRecord): number {
  return left.date - right.date || compareText(left.gameId, right.gameId);
}

function teamResult(game: CompletedGameRecord, teamId: string): 'W' | 'L' | null {
  if (game.finalScore.away === game.finalScore.home) return null;
  if (game.awayTeamId === teamId) return game.finalScore.away > game.finalScore.home ? 'W' : 'L';
  if (game.homeTeamId === teamId) return game.finalScore.home > game.finalScore.away ? 'W' : 'L';
  return null;
}

function activeTeamStreak(games: readonly CompletedGameRecord[], teamId: string): { kind: 'W' | 'L'; count: number } | null {
  const relevant = games.filter((game) => teamResult(game, teamId) !== null).sort(completedGameOrder);
  const latest = relevant[relevant.length - STAKES_TUNING.full];
  if (!latest) return null;
  const kind = teamResult(latest, teamId);
  if (!kind) return null;
  let count = STAKES_TUNING.zero;
  for (const game of [...relevant].reverse()) {
    if (teamResult(game, teamId) !== kind) break;
    count += STAKES_TUNING.full;
  }
  return { kind, count };
}

function activePlayerHitStreak(
  games: readonly CompletedGameRecord[],
  playerId: string,
): number {
  const appearances = games
    .slice()
    .sort(completedGameOrder)
    .map((game) => game.playerStats[playerId])
    .filter((stats): stats is NonNullable<typeof stats> => Boolean(stats));
  let count = STAKES_TUNING.zero;
  for (const stats of [...appearances].reverse()) {
    if (stats.h <= STAKES_TUNING.zero) break;
    count += STAKES_TUNING.full;
  }
  return count;
}

function streakValue(count: number): number {
  return clamp01(
    (count - STAKES_TUNING.liveStreakMinimumGames + STAKES_TUNING.full) /
      (STAKES_TUNING.liveStreakFullValueGames - STAKES_TUNING.liveStreakMinimumGames + STAKES_TUNING.full),
  );
}

async function computeLiveStreakFamily(
  scope: FranchiseStakesScope,
  game: ScheduledGame,
  context: RosterContext,
): Promise<StakesFamilyVector> {
  // The active source is the fan-morale streak family, so its morale gate owns this read.
  if (!franchiseStakesComputeSeam.isMoraleEnabled()) return emptyFamily('liveStreaks');
  const allCompleted = await readOr(
    () => franchiseStakesComputeSeam.getCompletedGames(STAKES_TUNING.completedGameReadLimit, scope),
    [] as CompletedGameRecord[],
  );
  const games = allCompleted.filter((completed) => completedGameMatchesScope(completed, scope));
  const teamCandidates = [game.awayTeamId, game.homeTeamId].sort(compareText).flatMap((teamId): StakesCandidate[] => {
    const streak = activeTeamStreak(games, teamId);
    if (!streak || streak.count < STAKES_TUNING.liveStreakMinimumGames) return [];
    return [{
      id: `streak:team:${teamId}:${streak.kind}:${streak.count}`,
      family: 'liveStreaks',
      playerIds: [],
      teamIds: [teamId],
      value: streakValue(streak.count),
      oneLineFacts: {
        streakSubject: 'team',
        teamName: teamName(context.teamsById.get(teamId), teamId),
        streakKind: streak.kind,
        streakGames: streak.count,
        decidableTonight: true,
      },
    }];
  });
  const playerCandidates = allGameRosterPlayers(context).flatMap((player): StakesCandidate[] => {
    const count = activePlayerHitStreak(games, player.id);
    if (count < STAKES_TUNING.liveStreakMinimumGames) return [];
    const teamId = gameTeamIdForPlayer(player.id, game, context);
    return [{
      id: `streak:player:${player.id}:hit:${count}`,
      family: 'liveStreaks',
      playerIds: [player.id],
      teamIds: teamId ? [teamId] : [],
      value: streakValue(count),
      oneLineFacts: {
        streakSubject: 'player',
        playerName: playerName(player, player.id),
        streakKind: 'hit',
        streakGames: count,
        decidableTonight: true,
      },
    }];
  });
  return familyVector('liveStreaks', [...teamCandidates, ...playerCandidates]);
}

/**
 * Existing source accessors are centralized only to make fixture-driven tests
 * prove this leaf never writes. Production callers use the functions assigned
 * here; this object contains no mutator.
 */
export const franchiseStakesComputeSeam = {
  getScheduleGame: getGame,
  getFranchisePlayers: getAllFranchisePlayers,
  getFranchiseTeams: getAllFranchiseTeams,
  getSeasonBattingStats,
  getSeasonPitchingStats,
  getCareerStats,
  listStadiumRecords: listFranchiseStadiumRecords,
  getRelationshipEdges: getFranchiseRelationshipEdgesByScope,
  getTrueValueRows: getFranchiseTrueValueRows,
  recomputeL12Standings: recomputeFranchiseL12StandingsForCompletedGame,
  getTeamFanMorale: (scope: FranchiseStakesScope, teamId: string) =>
    getFranchiseMoraleSnapshot(scope, 'team-fan', teamId),
  getCompletedGames: (limit: number, scope: FranchiseStakesScope) =>
    getRecentGames(limit, {
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
    }),
  isFameEnabled: isFranchisePhase2FameEnabled,
  isStadiumRecordsEnabled: isFranchisePhase2StadiumRecordsEnabled,
  isL13Enabled: isFranchisePhase2L13Enabled,
  isL12Enabled: isFranchisePhase2L12Enabled,
  isL11Enabled: isFranchisePhase2L11Enabled,
  isMoraleEnabled: isFranchisePhase2MoraleEnabled,
};

/**
 * Returns null only when the requested schedule game cannot be read.  A
 * legacy/dark franchise with a real scheduled game returns an empty vector.
 */
export async function computePregameStakes(
  scope: FranchiseStakesScope,
  scheduleGameId: string,
): Promise<StakesVector | null> {
  const game = await readOr(
    () => franchiseStakesComputeSeam.getScheduleGame(scheduleGameId),
    null,
  );
  if (!game) return null;

  const [players, teams] = await Promise.all([
    readOr(() => franchiseStakesComputeSeam.getFranchisePlayers(scope.franchiseId), [] as Player[]),
    readOr(() => franchiseStakesComputeSeam.getFranchiseTeams(scope.franchiseId), [] as Team[]),
  ]);
  const context = resolveRosterContext(scope, game, players, teams);
  const vector = emptyVector(scope, scheduleGameId);
  const [milestoneProximity, recordProximity, grudgeLines, racePressure, hotSeat, liveStreaks] = await Promise.all([
    computeMilestoneFamily(scope, context),
    computeRecordFamily(scope, game, context),
    computeGrudgeFamily(scope, game, context),
    computeRaceFamily(scope, game, context),
    computeHotSeatFamily(scope, game, context),
    computeLiveStreakFamily(scope, game, context),
  ]);
  return {
    ...vector,
    families: {
      milestoneProximity,
      recordProximity,
      grudgeLines,
      racePressure,
      hotSeat,
      liveStreaks,
    },
  };
}

function seededTieBreak(scope: FranchiseStakesScope, gameId: string, candidate: StakesCandidate): number {
  const seed = [
    scope.franchiseId,
    scope.seasonId,
    scope.statsScopeId,
    String(scope.seasonNumber),
    gameId,
    candidate.family,
    candidate.id,
  ].join(':');
  return fnv1aRelationshipIntelSeed(seed) / STAKES_TUNING.hashMaxExclusive;
}

/** §4 camera budget: select no more than K pre-game facts, deterministically. */
export function selectTonightStakes(vector: StakesVector, k = 2): TonightStakeItem[] {
  if (!Number.isInteger(k) || k <= STAKES_TUNING.zero) return [];
  const candidates = STAKES_FAMILIES.flatMap((family) => vector.families[family]?.candidates ?? [])
    .filter((candidate) => candidate.value > STAKES_TUNING.zero)
    .sort((left, right) => {
      const leftScore = left.value * STAKES_TUNING.familyWeights[left.family];
      const rightScore = right.value * STAKES_TUNING.familyWeights[right.family];
      return rightScore - leftScore ||
        seededTieBreak(vector.scope, vector.scheduleGameId, right) - seededTieBreak(vector.scope, vector.scheduleGameId, left) ||
        compareText(left.id, right.id);
    });
  return candidates.slice(STAKES_TUNING.zero, k).map((candidate) => ({
    family: candidate.family,
    playerIds: [...candidate.playerIds],
    teamIds: [...candidate.teamIds],
    value: candidate.value,
    oneLineFacts: candidate.oneLineFacts,
  }));
}
