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
import { getGameEvents, getGameHeadersForScope } from './eventLog';
import { buildFranchiseEffectivePositionReport } from './franchiseEffectivePosition';
import { toExpectedStatsCategoryRates } from '../engines/expectedStatsCategoryRates';
import {
  classifyRatingsPoolKey,
  computeCheckpointRatingSignals,
  type CheckpointSignalMember,
} from './checkpointRatingSignal';
import type { ExpectedStatsAgeBand, ExpectedStatsRatingKey } from '../engines/expectedStatsEngine';
import {
  putFranchiseRatingsOverlay,
  type FranchiseRatingsOverlayRow,
  type FranchiseRatingsOverlayScopeInput,
} from './franchiseRatingsOverlayStorage';
import { isFranchisePhase2CheckpointEnabled } from './franchisePhase2Flags';

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
  signalByRatingKey: Partial<Record<ExpectedStatsRatingKey, number>>;
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

export async function resolveWindowActivePlayerIds(
  scope: FranchiseRatingsOverlayScopeInput,
  prevBoundaryGameNumber: number,
  currentGameNumber: number,
): Promise<{ hitters: Set<string>; pitchers: Set<string> }> {
  const hitters = new Set<string>();
  const pitchers = new Set<string>();
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

    const events = await getGameEvents(header.gameId);
    for (const event of events) {
      hitters.add(event.batterId);
      pitchers.add(event.pitcherId);
    }
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
    member: CheckpointSignalMember;
  }> = [];

  for (const player of players) {
    const isPitcher = getPlayerIsPitcher(player);
    const role = isPitcher ? 'pitcher' : 'hitter';
    const effectivePosition =
      effectivePositionReport.playerPositions[player.id]?.effectivePosition ?? player.primaryPosition;
    const startsShare = effectivePositionReport.playerPositions[player.id]?.startsShare ?? null;
    const poolKey = classifyRatingsPoolKey({ role, effectivePosition, startsShare });
    if (poolKey === null) continue;

    const baseRatings: Record<string, number> = isPitcher
      ? {
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

    memberEntries.push({
      player,
      teamId: teamIdByPlayerId.get(player.id) ?? null,
      isPitcher,
      baseRatings,
      member: {
        playerId: player.id,
        role,
        ageBand: ageToExpectedStatsBand(player.age),
        ratings: baseRatings as Partial<Record<ExpectedStatsRatingKey, number>>,
        poolKey,
        categoryRates: toExpectedStatsCategoryRates({
          role,
          batting: battingByPlayerId.get(player.id),
          pitching: pitchingByPlayerId.get(player.id),
          fielding: fieldingByPlayerId.get(player.id),
        }),
      },
    });
  }

  const signalMap = computeCheckpointRatingSignals(memberEntries.map((entry) => entry.member));
  const roster: CheckpointRosterEntry[] = [];

  for (const { player, teamId, isPitcher, baseRatings } of memberEntries) {
    if (teamId && !teamFanMoraleByTeamId.has(teamId)) {
      teamFanMoraleByTeamId.set(
        teamId,
        getFranchiseMoraleSnapshot(scope, 'team-fan', teamId).then(
          (snapshot) => snapshot?.currentValue ?? 50,
        ),
      );
    }

    const hidden = player.hiddenPersonalityModifiers ?? NEUTRAL_HIDDEN_MODIFIERS;

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
      playerMorale: player.morale,
      teamFanMorale: teamId ? await teamFanMoraleByTeamId.get(teamId)! : 50,
      signalByRatingKey: signalMap.get(player.id) ?? {},
      createdAt: trueValueRowsByPlayerId.get(player.id)?.computedAt ?? null,
    });
  }

  return roster;
}

export const checkpointSweepSeam = {
  resolveCheckpointRoster,
  resolveWindowActivePlayerIds,
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

  const roster = await checkpointSweepSeam.resolveCheckpointRoster(scope, gameState);
  if (roster.length === 0) {
    return { status: 'dark-noop', written: 0, reason: 'Empty checkpoint roster.' };
  }

  const prevBoundaryGameNumber = resolvePreviousCheckpointGameNumber(gameNumber, totalGames, checkpointCount);
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
          playerMorale: entry.playerMorale,
          teamFanMorale: entry.teamFanMorale,
          personality: entry.personality,
          modifiers: entry.modifiers,
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
