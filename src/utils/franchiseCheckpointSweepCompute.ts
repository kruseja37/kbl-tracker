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
 * - performance signal = True Value `valueDelta` in signed dollars; no-TV-row
 *   MLB players do not develop because there is no measurable earned signal.
 * - fan-morale fallback = 50, which is dark-safe and neutral when the morale
 *   store is empty under the default-OFF morale flag.
 * - overlay = permanent + pending. Checkpoints stack by distinct
 *   `sourceEventId`; replaying the same checkpoint overwrites the same id.
 * - which-key = one deterministic stable-hash rating key per shifter/checkpoint
 *   (sim-refinable later; no randomization).
 *
 * Determinism: no runtime randomness, caller timestamps, or direct IndexedDB opens.
 * `createdAt` comes from the persisted True Value row's `computedAt`.
 */

import {
  computeCheckpointRatingDevelopment,
  normalizePerformanceSignal,
  RATINGS_DEVELOPMENT_TUNING,
  type RatingsDevelopmentTuning,
} from '../engines/ratingsDevelopment';
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
  getPlayerRosterStatusForLeague,
  getPlayerTeamIdForLeague,
  type Player,
} from './leagueBuilderStorage';
import { getFranchiseTrueValueRows } from './franchiseTrueValueStorage';
import { getFranchiseMoraleSnapshot } from './franchiseMoraleState';
import { getSeasonMetadata } from './seasonStorage';
import { getGame as getScheduledGame } from './scheduleStorage';
import {
  putFranchiseRatingsOverlay,
  type FranchiseRatingsOverlayRow,
  type FranchiseRatingsOverlayScopeInput,
} from './franchiseRatingsOverlayStorage';
import { isFranchisePhase2CheckpointEnabled } from './franchisePhase2Flags';

// §16 placeholder: valueDelta is signed dollars (~+/-$50k-$500k), so L8b owns
// the dollar-to-signal scale instead of L8a's small-signal default.
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

const PITCHER_RATING_KEYS = ['velocity', 'junk', 'accuracy'] as const;
const HITTER_RATING_KEYS = ['power', 'contact', 'speed', 'fielding', 'arm'] as const;
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
  performanceSignal: number;
  createdAt: string;
}

export type PersistDarkCheckpointSweepResult = {
  status: 'dark-noop' | 'not-checkpoint' | 'written';
  written: number;
  reason?: string;
};

export function isCheckpointBoundary(gameNumber: number, totalGames: number): boolean {
  return (
    Number.isInteger(gameNumber) &&
    gameNumber > 0 &&
    totalGames > 0 &&
    Math.floor(((gameNumber - 1) * 5) / totalGames) !==
      Math.floor((gameNumber * 5) / totalGames)
  );
}

export async function resolveCheckpointRoster(
  scope: FranchiseRatingsOverlayScopeInput,
  _gameState: PersistedGameState,
): Promise<CheckpointRosterEntry[]> {
  const leagueId = (await getAllFranchiseTeams(scope.franchiseId))[0]?.leagueIds?.[0];
  if (!leagueId) return [];

  const [players, trueValueRows] = await Promise.all([
    getAllFranchisePlayers(scope.franchiseId),
    getFranchiseTrueValueRows({
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
    }),
  ]);
  const trueValueRowsByPlayerId = new Map(trueValueRows.map((row) => [row.playerId, row]));
  const teamFanMoraleByTeamId = new Map<string, Promise<number>>();
  const roster: CheckpointRosterEntry[] = [];

  for (const player of players) {
    if (getPlayerRosterStatusForLeague(player, leagueId) !== 'MLB') continue;

    const trueValueRow = trueValueRowsByPlayerId.get(player.id);
    if (!trueValueRow) continue;

    const teamId = getPlayerTeamIdForLeague(player, leagueId);
    if (!teamId) continue;

    if (!teamFanMoraleByTeamId.has(teamId)) {
      teamFanMoraleByTeamId.set(
        teamId,
        getFranchiseMoraleSnapshot(scope, 'team-fan', teamId).then(
          (snapshot) => snapshot?.currentValue ?? 50,
        ),
      );
    }

    const isPitcher = getPlayerIsPitcher(player);
    const hidden = player.hiddenPersonalityModifiers ?? NEUTRAL_HIDDEN_MODIFIERS;

    roster.push({
      playerId: player.id,
      teamId,
      isPitcher,
      baseRatings: isPitcher
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
          },
      personality: normalizePersonality(player.personality),
      modifiers: {
        loyalty: hidden.loyalty,
        ambition: hidden.ambition,
        resilience: hidden.resilience,
      },
      playerMorale: player.morale,
      teamFanMorale: await teamFanMoraleByTeamId.get(teamId)!,
      performanceSignal: normalizePerformanceSignal(trueValueRow.valueDelta, CHECKPOINT_DEV_TUNING),
      createdAt: trueValueRow.computedAt,
    });
  }

  return roster;
}

export const checkpointSweepSeam = {
  resolveCheckpointRoster,
};

export function selectDevelopmentRatingKey(entry: CheckpointRosterEntry): string {
  const keySet = entry.isPitcher ? PITCHER_RATING_KEYS : HITTER_RATING_KEYS;
  return keySet[stableHash(entry.playerId) % keySet.length];
}

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

  const totalGames = (await getSeasonMetadata(scope.seasonId))?.totalGames;
  if (!totalGames || totalGames <= 0) {
    return {
      status: 'dark-noop',
      written: 0,
      reason: 'No season totalGames; cannot place a checkpoint.',
    };
  }

  if (!isCheckpointBoundary(gameNumber, totalGames)) {
    return { status: 'not-checkpoint', written: 0 };
  }

  const roster = await checkpointSweepSeam.resolveCheckpointRoster(scope, gameState);
  if (roster.length === 0) {
    return { status: 'dark-noop', written: 0, reason: 'Empty checkpoint roster.' };
  }

  const rows: FranchiseRatingsOverlayRow[] = [];
  const sourceEventId = `checkpoint-${gameNumber}`;

  for (const entry of roster) {
    const ratingKey = selectDevelopmentRatingKey(entry);
    const baseRatingValue = entry.baseRatings[ratingKey];
    if (!Number.isFinite(baseRatingValue)) continue;

    const dev = computeCheckpointRatingDevelopment(
      {
        ratingKey,
        baseRatingValue,
        performanceSignal: entry.performanceSignal,
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

  for (const row of rows) {
    await putFranchiseRatingsOverlay(row);
  }

  return { status: 'written', written: rows.length };
}

async function resolveCheckpointGameNumber(
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

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash += value.charCodeAt(index);
  }
  return hash;
}

function getPlayerIsPitcher(player: Player): boolean {
  return (
    (player as Player & { isPitcher?: boolean }).isPitcher === true ||
    PITCHER_POSITIONS.has(player.primaryPosition)
  );
}
