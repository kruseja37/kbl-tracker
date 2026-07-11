/**
 * §9/§10/§11 — dark ratings-development checkpoint sweep.
 *
 * Doubly-dark by default: a default-OFF Phase-2 checkpoint flag guards the
 * whole compute, and every overlay written here is `pending`, so L2b's merge
 * ignores it until a post-D13 confirmation UI promotes it.
 *
 * DEFAULTS-TAKEN:
 * - cadence denominator = league-wide `totalGames`, matching the scheduled
 *   league-wide gameNumber, not gamesPerTeam.
 * - performance signal = RA-2c category-rate signal, pre-normalized to [-1, 1]
 *   by `computeCheckpointRatingSignals`.
 * - fan-morale fallback = 50, which is dark-safe and neutral when the morale
 *   store is empty under the default-OFF morale flag.
 * - overlay = permanent + pending. Checkpoints stack by distinct
 *   `sourceEventId`; replaying the same checkpoint overwrites the same id.
 * - per-rating fan-out = one overlay per finite MOVED rating signal.
 *
 * Determinism: no runtime randomness, caller timestamps, or direct IndexedDB opens.
 * `createdAt` comes from the persisted True Value row's `computedAt`.
 */

import {
  computeCheckpointRatingDevelopment,
  RATINGS_DEVELOPMENT_TUNING,
  type RatingsDevelopmentTuning,
} from '../engines/ratingsDevelopment';
import { checkpointCountForCadence } from '../data/rosterEngineConstants';
import {
  normalizePersonality,
  type CanonicalPersonality,
} from '../engines/masterMoraleMatrix';
import type { HiddenModifiers } from '../types/game';
import type { PersistedGameState } from './gameStorage';
import {
  getAllFranchisePlayers,
  getAllFranchiseTeams,
} from './franchisePlayerStorage';
import {
  getPlayerTeamIdForLeague,
  type Player,
} from './leagueBuilderStorage';
import { getFranchiseTrueValueRows } from './franchiseTrueValueStorage';
import { getFranchiseMoraleSnapshot } from './franchiseMoraleState';
import {
  getAllFieldingStats,
  getSeasonBattingStats,
  getSeasonMetadata,
  getSeasonPitchingStats,
} from './seasonStorage';
import { getGame as getScheduledGame } from './scheduleStorage';
import { getGameEvents, getGameHeadersForScope, type AtBatEvent } from './eventLog';
import { buildFranchiseEffectivePositionReport } from './franchiseEffectivePosition';
import {
  toExpectedStatsCategoryRates,
  type CategoryRateResult,
} from '../engines/expectedStatsCategoryRates';
import {
  aggregateCheckpointWindowedCategoryRates,
  type CheckpointWindowedCategoryRateMaps,
} from '../engines/checkpointWindowedCategoryRates';
import {
  classifyRatingsPoolKey,
  computeCheckpointRatingSignals,
  type CheckpointSignalMember,
} from './checkpointRatingSignal';
import {
  EXPECTED_STATS_CATEGORIES,
  EXPECTED_STATS_CATEGORY_META,
  type ExpectedStatsAgeBand,
  type ExpectedStatsRatingKey,
} from '../engines/expectedStatsEngine';
import {
  putFranchiseRatingsOverlay,
  type FranchiseRatingsOverlayRow,
  type FranchiseRatingsOverlayScopeInput,
} from './franchiseRatingsOverlayStorage';
import { isFranchisePhase2CheckpointEnabled } from './franchisePhase2Flags';
import {
  DEFAULT_ADAPTIVE_STANDARDS_CONFIG,
  scaledThreshold,
  type AdaptiveThresholdBasis,
} from './franchiseAdaptiveStandards';

// §16 placeholder: performanceSignalScale is vestigial in this path because
// RA-2c signals arrive pre-normalized to [-1, 1]; computeRawRatingDelta scales
// by baseDeltaScale. normalizePerformanceSignal is not called here.
export const CHECKPOINT_DEV_TUNING: RatingsDevelopmentTuning = {
  ...RATINGS_DEVELOPMENT_TUNING,
  performanceSignalScale: 200000,
};

// Kept identical to processCompletedGame.ts without importing it, avoiding a
// runtime cycle once processCompletedGame imports this compute.
const NEUTRAL_HIDDEN_MODIFIERS: HiddenModifiers = {
  loyalty: 50,
  ambition: 50,
  resilience: 50,
  charisma: 50,
};

const PITCHER_POSITIONS = new Set(['SP', 'RP', 'CP', 'SP/RP', 'TWO-WAY', 'P']);

// §16 sim-tune placeholder: full-season samples where confidence reaches 1 before season scaling.
export const CHECKPOINT_FULL_SEASON_SAMPLE: Record<ExpectedStatsRatingKey, number> = {
  power: 502,
  contact: 502,
  speed: 40,
  fielding: 350,
  arm: 80,
  velocity: 600,
  junk: 600,
  accuracy: 600,
};

const CHECKPOINT_RATING_KEYS = Object.keys(
  CHECKPOINT_FULL_SEASON_SAMPLE,
) as ExpectedStatsRatingKey[];

export interface CompletedGameArchiveOptions {
  context?: {
    scheduleGameId?: string;
  };
}

export type CheckpointSweepScope = FranchiseRatingsOverlayScopeInput & {
  franchiseId: string;
  seasonNumber: number;
};

export interface CheckpointRosterEntry {
  playerId: string;
  teamId: string;
  isPitcher: boolean;
  baseRatings: Record<string, number>;
  personality: CanonicalPersonality;
  modifiers: Pick<HiddenModifiers, 'loyalty' | 'ambition' | 'resilience'>;
  playerMorale: number;
  teamFanMorale: number;
  ageBand: ExpectedStatsAgeBand;
  signalByRatingKey: Partial<Record<ExpectedStatsRatingKey, number>>;
  recentSignalByRatingKey: Partial<Record<ExpectedStatsRatingKey, number>>;
  sampleByRatingKey: Partial<Record<ExpectedStatsRatingKey, number>>;
  createdAt: string | null;
}

export type PersistDarkCheckpointSweepResult = {
  status: 'dark-noop' | 'not-checkpoint' | 'written';
  written: number;
  reason?: string;
};

export function isCheckpointBoundary(gameNumber: number, totalGames: number, checkpointCount = 5): boolean {
  return (
    Number.isInteger(gameNumber) &&
    gameNumber > 0 &&
    totalGames > 0 &&
    Number.isInteger(checkpointCount) &&
    checkpointCount > 0 &&
    Math.floor(((gameNumber - 1) * checkpointCount) / totalGames) !==
      Math.floor((gameNumber * checkpointCount) / totalGames)
  );
}

export function resolvePreviousCheckpointGameNumber(
  currentGameNumber: number,
  totalGames: number,
  checkpointCount: number,
): number {
  for (let gameNumber = currentGameNumber - 1; gameNumber >= 1; gameNumber -= 1) {
    if (isCheckpointBoundary(gameNumber, totalGames, checkpointCount)) {
      return gameNumber;
    }
  }
  return 0;
}

function confidenceBasisForRating(ratingKey: ExpectedStatsRatingKey): AdaptiveThresholdBasis {
  for (const category of EXPECTED_STATS_CATEGORIES) {
    const meta = EXPECTED_STATS_CATEGORY_META[category];
    if (meta.ratingKey === ratingKey && meta.basis === 'season') {
      return 'season';
    }
  }

  for (const category of EXPECTED_STATS_CATEGORIES) {
    const meta = EXPECTED_STATS_CATEGORY_META[category];
    if (meta.ratingKey === ratingKey && meta.basis !== 'none') {
      return meta.basis;
    }
  }

  return 'none';
}

export function ratingConfidence(
  ratingKey: ExpectedStatsRatingKey,
  sample: number,
  totalGames: number,
): number {
  const basis = confidenceBasisForRating(ratingKey);
  const denom = scaledThreshold(
    CHECKPOINT_FULL_SEASON_SAMPLE[ratingKey],
    { ...DEFAULT_ADAPTIVE_STANDARDS_CONFIG, gamesPerSeason: totalGames },
    basis,
  );
  if (denom <= 0) return 1;

  const finiteSample = Number.isFinite(sample) ? sample : 0;
  return clamp(finiteSample / denom, 0, 1);
}

function sampleByRatingKeyFromCategoryRates(
  categoryRates: CategoryRateResult,
): Partial<Record<ExpectedStatsRatingKey, number>> {
  const sampleByRatingKey: Partial<Record<ExpectedStatsRatingKey, number>> = {};

  for (const ratingKey of CHECKPOINT_RATING_KEYS) {
    let maxSample = 0;
    for (const category of EXPECTED_STATS_CATEGORIES) {
      if (EXPECTED_STATS_CATEGORY_META[category].ratingKey !== ratingKey) continue;
      const sample = categoryRates.sampleSizeByCat[category];
      if (typeof sample === 'number' && Number.isFinite(sample)) {
        maxSample = Math.max(maxSample, sample);
      }
    }
    sampleByRatingKey[ratingKey] = maxSample;
  }

  return sampleByRatingKey;
}

export async function resolveWindowActivePlayerIds(
  scope: FranchiseRatingsOverlayScopeInput,
  prevBoundaryGameNumber: number,
  currentGameNumber: number,
): Promise<{ hitters: Set<string>; pitchers: Set<string> }> {
  const events = await resolveWindowAtBatEvents(scope, prevBoundaryGameNumber, currentGameNumber);
  return activePlayerIdsFromWindowEvents(events);
}

export async function resolveWindowAtBatEvents(
  scope: FranchiseRatingsOverlayScopeInput,
  prevBoundaryGameNumber: number,
  currentGameNumber: number,
): Promise<AtBatEvent[]> {
  const events: AtBatEvent[] = [];
  const headers = await getGameHeadersForScope({
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    isComplete: true,
  });

  for (const header of headers) {
    if (!header.scheduleGameId) continue;

    let gameNumber: number | null = null;
    try {
      const scheduledGame = await getScheduledGame(header.scheduleGameId);
      if (scheduledGame && Number.isInteger(scheduledGame.gameNumber) && scheduledGame.gameNumber > 0) {
        gameNumber = scheduledGame.gameNumber;
      }
    } catch {
      continue;
    }

    if (gameNumber == null || gameNumber <= prevBoundaryGameNumber || gameNumber > currentGameNumber) {
      continue;
    }

    events.push(...await getGameEvents(header.gameId));
  }

  return events;
}

function activePlayerIdsFromWindowEvents(
  events: readonly AtBatEvent[],
): { hitters: Set<string>; pitchers: Set<string> } {
  const hitters = new Set<string>();
  const pitchers = new Set<string>();

  for (const event of events) {
    if (event.undoneAt) continue;
    hitters.add(event.batterId);
    pitchers.add(event.pitcherId);
  }

  return { hitters, pitchers };
}

function ageToExpectedStatsBand(age: number): ExpectedStatsAgeBand {
  // Prime-band default for missing/non-finite ages; age remains inert in RA-2c-2b.
  if (!Number.isFinite(age)) return '25-31';
  if (age <= 21) return '18-21';
  if (age <= 24) return '22-24';
  if (age <= 31) return '25-31';
  if (age <= 35) return '32-35';
  return '36+';
}

function mapByPlayerId<T extends { playerId: string }>(rows: readonly T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.playerId, row]));
}

export async function resolveCheckpointRoster(
  scope: FranchiseRatingsOverlayScopeInput,
  _gameState: PersistedGameState,
  options?: {
    recentCategoryRatesByPlayerId?: CheckpointWindowedCategoryRateMaps;
  },
): Promise<CheckpointRosterEntry[]> {
  const leagueId = (await getAllFranchiseTeams(scope.franchiseId))[0]?.leagueIds?.[0];
  if (!leagueId) return [];

  const [players, trueValueRows, battingStats, pitchingStats, fieldingStats] = await Promise.all([
    getAllFranchisePlayers(scope.franchiseId),
    getFranchiseTrueValueRows({
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
    }),
    getSeasonBattingStats(scope.seasonId),
    getSeasonPitchingStats(scope.seasonId),
    getAllFieldingStats(scope.seasonId),
  ]);
  const trueValueRowsByPlayerId = mapByPlayerId(trueValueRows);
  const battingByPlayerId = mapByPlayerId(battingStats);
  const pitchingByPlayerId = mapByPlayerId(pitchingStats);
  const fieldingByPlayerId = mapByPlayerId(fieldingStats);
  const teamIdByPlayerId = new Map(
    players.map((player) => [player.id, getPlayerTeamIdForLeague(player, leagueId)]),
  );
  const effectivePositionReport = await buildFranchiseEffectivePositionReport({
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    players: players.map((player) => ({
      playerId: player.id,
      profilePosition: player.primaryPosition,
      currentTeamId: teamIdByPlayerId.get(player.id) ?? null,
      trait1: player.trait1 ?? null,
      trait2: player.trait2 ?? null,
      pitcherRole: player.primaryPosition,
    })),
  });
  const teamFanMoraleByTeamId = new Map<string, Promise<number>>();
  const memberEntries: Array<{
    player: Player;
    teamId: string | null;
    isPitcher: boolean;
    baseRatings: Record<string, number>;
    ageBand: ExpectedStatsAgeBand;
    member: CheckpointSignalMember;
    sampleByRatingKey: Partial<Record<ExpectedStatsRatingKey, number>>;
  }> = [];

  for (const player of players) {
    const isPitcher = getPlayerIsPitcher(player);
    const role = isPitcher ? 'pitcher' : 'hitter';
    const ageBand = ageToExpectedStatsBand(player.age);
    const effectivePosition =
      effectivePositionReport.playerPositions[player.id]?.effectivePosition ?? player.primaryPosition;
    const startsShare = effectivePositionReport.playerPositions[player.id]?.startsShare ?? null;
    const poolKey = classifyRatingsPoolKey({ role, effectivePosition, startsShare });
    if (poolKey === null) continue;

    const baseRatings: Record<string, number> = isPitcher
      ? {
          power: player.power,
          contact: player.contact,
          speed: player.speed,
          fielding: player.fielding,
          velocity: player.velocity,
          junk: player.junk,
          accuracy: player.accuracy,
        }
      : {
          power: player.power,
          contact: player.contact,
          speed: player.speed,
          fielding: player.fielding,
          arm: player.arm,
        };
    const categoryRates = toExpectedStatsCategoryRates({
      role,
      batting: battingByPlayerId.get(player.id),
      pitching: pitchingByPlayerId.get(player.id),
      fielding: fieldingByPlayerId.get(player.id),
    });
    const recentCategoryRates =
      role === 'pitcher'
        ? options?.recentCategoryRatesByPlayerId?.pitchers.get(player.id)
        : options?.recentCategoryRatesByPlayerId?.hitters.get(player.id);

    memberEntries.push({
      player,
      teamId: teamIdByPlayerId.get(player.id) ?? null,
      isPitcher,
      baseRatings,
      ageBand,
      member: {
        playerId: player.id,
        role,
        ageBand,
        ratings: baseRatings as Partial<Record<ExpectedStatsRatingKey, number>>,
        poolKey,
        categoryRates,
        recentCategoryRates,
      },
      sampleByRatingKey: sampleByRatingKeyFromCategoryRates(categoryRates),
    });
  }

  const signalMaps = computeCheckpointRatingSignals(
    memberEntries.map((entry) => entry.member),
  );
  const signalMap = signalMaps.cumulative;
  const recentSignalMap = signalMaps.recent;
  const roster: CheckpointRosterEntry[] = [];

  for (const { player, teamId, isPitcher, baseRatings, ageBand, sampleByRatingKey } of memberEntries) {
    if (teamId && !teamFanMoraleByTeamId.has(teamId)) {
      teamFanMoraleByTeamId.set(
        teamId,
        getFranchiseMoraleSnapshot(scope, 'team-fan', teamId).then(
          (snapshot) => snapshot?.currentValue ?? 50,
        ),
      );
    }

    const hidden = player.hiddenPersonalityModifiers ?? NEUTRAL_HIDDEN_MODIFIERS;
    const playerMoraleSnapshot = await getFranchiseMoraleSnapshot(scope, 'player', player.id);

    roster.push({
      playerId: player.id,
      teamId: teamId ?? '',
      isPitcher,
      baseRatings,
      personality: normalizePersonality(player.personality),
      modifiers: {
        loyalty: hidden.loyalty,
        ambition: hidden.ambition,
        resilience: hidden.resilience,
      },
      playerMorale: playerMoraleSnapshot?.currentValue ?? player.morale,
      teamFanMorale: teamId ? await teamFanMoraleByTeamId.get(teamId)! : 50,
      ageBand,
      signalByRatingKey: signalMap.get(player.id) ?? {},
      recentSignalByRatingKey: recentSignalMap.get(player.id) ?? {},
      sampleByRatingKey,
      createdAt: trueValueRowsByPlayerId.get(player.id)?.computedAt ?? null,
    });
  }

  return roster;
}

export const checkpointSweepSeam = {
  resolveCheckpointRoster,
  resolveWindowActivePlayerIds,
  resolveWindowAtBatEvents,
};

export async function persistDarkCheckpointSweepForCompletedGame(
  gameState: PersistedGameState,
  scope: CheckpointSweepScope,
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<PersistDarkCheckpointSweepResult> {
  if (!isFranchisePhase2CheckpointEnabled()) {
    return {
      status: 'dark-noop',
      written: 0,
      reason: 'Phase-2 checkpoint disabled; no ratings-development sweep.',
    };
  }

  const gameNumber = await resolveCheckpointGameNumber(gameState, archiveOptions);
  if (gameNumber == null) {
    return {
      status: 'dark-noop',
      written: 0,
      reason: 'Unresolved league game number; cannot place a checkpoint.',
    };
  }

  const seasonMetadata = await getSeasonMetadata(scope.seasonId);
  const totalGames = seasonMetadata?.totalGames;
  if (!totalGames || totalGames <= 0) {
    return {
      status: 'dark-noop',
      written: 0,
      reason: 'No season totalGames; cannot place a checkpoint.',
    };
  }

  const checkpointCount = checkpointCountForCadence(seasonMetadata?.checkpointCadence);
  if (!isCheckpointBoundary(gameNumber, totalGames, checkpointCount)) {
    return { status: 'not-checkpoint', written: 0 };
  }

  const prevBoundaryGameNumber = resolvePreviousCheckpointGameNumber(gameNumber, totalGames, checkpointCount);
  const recentCategoryRatesByPlayerId =
    prevBoundaryGameNumber > 0
      ? aggregateCheckpointWindowedCategoryRates(
          await checkpointSweepSeam.resolveWindowAtBatEvents(
            scope,
            prevBoundaryGameNumber,
            gameNumber,
          ),
        )
      : undefined;
  const roster = await checkpointSweepSeam.resolveCheckpointRoster(
    scope,
    gameState,
    { recentCategoryRatesByPlayerId },
  );
  if (roster.length === 0) {
    return { status: 'dark-noop', written: 0, reason: 'Empty checkpoint roster.' };
  }

  const windowActive = await checkpointSweepSeam.resolveWindowActivePlayerIds(
    scope,
    prevBoundaryGameNumber,
    gameNumber,
  );
  const rows: FranchiseRatingsOverlayRow[] = [];
  const sourceEventId = `checkpoint-${gameNumber}`;

  for (const entry of roster) {
    if (entry.createdAt == null) continue;
    const windowActiveForEntry = entry.isPitcher
      ? windowActive.pitchers.has(entry.playerId)
      : windowActive.hitters.has(entry.playerId);
    if (!windowActiveForEntry) continue;

    for (const ratingKey of Object.keys(entry.signalByRatingKey) as ExpectedStatsRatingKey[]) {
      const signal = entry.signalByRatingKey[ratingKey];
      if (signal == null || !Number.isFinite(signal)) continue;

      const baseRatingValue = entry.baseRatings[ratingKey];
      if (!Number.isFinite(baseRatingValue)) continue;

      const dev = computeCheckpointRatingDevelopment(
        {
          ratingKey,
          baseRatingValue,
          performanceSignal: signal,
          ageBand: entry.ageBand,
          playerMorale: entry.playerMorale,
          teamFanMorale: entry.teamFanMorale,
          personality: entry.personality,
          modifiers: entry.modifiers,
          confidence: ratingConfidence(ratingKey, entry.sampleByRatingKey[ratingKey] ?? 0, totalGames),
          recentSignal: entry.recentSignalByRatingKey[ratingKey],
        },
        CHECKPOINT_DEV_TUNING,
      );

      if (!dev.shouldShift) continue;

      rows.push({
        id: `${scope.franchiseId}:${scope.seasonId}:${scope.statsScopeId}:${entry.playerId}:${ratingKey}:${sourceEventId}`,
        franchiseId: scope.franchiseId,
        seasonId: scope.seasonId,
        statsScopeId: scope.statsScopeId,
        playerId: entry.playerId,
        ratingKey,
        delta: dev.appliedDelta,
        kind: 'permanent',
        expiresAtGameNumber: null,
        confirmationStatus: 'pending',
        source: 'ratings-development',
        sourceEventId,
        createdAtGameNumber: gameNumber,
        createdAt: entry.createdAt,
      });
    }
  }

  for (const row of rows) {
    await putFranchiseRatingsOverlay(row);
  }

  return { status: 'written', written: rows.length };
}

export async function resolveCheckpointGameNumber(
  gameState: PersistedGameState,
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<number | null> {
  const scheduleGameId = archiveOptions?.context?.scheduleGameId ?? gameState.scheduleGameId;
  if (!scheduleGameId) return null;

  try {
    const scheduledGame = await getScheduledGame(scheduleGameId);
    if (scheduledGame && Number.isInteger(scheduledGame.gameNumber) && scheduledGame.gameNumber > 0) {
      return scheduledGame.gameNumber;
    }
  } catch {
    // non-fatal: unresolved schedule ids dark-noop instead of blocking game completion
  }

  return null;
}

function getPlayerIsPitcher(player: Player): boolean {
  return (
    (player as Player & { isPitcher?: boolean }).isPitcher === true ||
    PITCHER_POSITIONS.has(player.primaryPosition)
  );
}

function clamp(amount: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, amount));
}
