/**
 * Game Completion Orchestrator
 *
 * Runs a completed game through the full stats pipeline:
 *   1. aggregateGameToSeason() — batting/pitching/fielding/fame/milestone aggregation
 *   2. archiveCompletedGame() — writes to completedGames store
 *
 * Adapted from test-utils/processCompletedGame.ts for production use.
 * Import paths fixed for src/utils/ location.
 *
 * Pipeline classification: B (Orchestrated but Extractable)
 * Per FRANCHISE_API_MAP.md §11
 */

import type { PersistedGameState, PlayerRatingsSnapshot } from './gameStorage';
import {
  aggregateGameToSeason,
  type GameAggregationOptions,
  type GameAggregationResult,
} from './seasonAggregator';
import { archiveCompletedGame, resolveExhibitionLeagueId } from './gameStorage';
import { getEffectivePlayer } from './playerOverrides';
import { registerAlmanacPlayers } from './registerAlmanacPlayers';

export interface ProcessGameResult {
  aggregation: GameAggregationResult;
}

export function assertProcessGameSucceeded(
  result: ProcessGameResult,
  context = 'completed game',
): void {
  if (result.aggregation.success) {
    return;
  }

  throw new Error(
    `${context} aggregation failed: ${result.aggregation.error || 'unknown error'}`,
  );
}

export interface CompletedGameArchiveOptions {
  finalScore?: { away: number; home: number };
  inningScores?: { away: number; home: number }[];
  seasonId?: string;
  context?: Parameters<typeof archiveCompletedGame>[4];
}

function buildPlayerRatingsSnapshot(
  playerId: string,
  player: NonNullable<Awaited<ReturnType<typeof getEffectivePlayer>>>
): PlayerRatingsSnapshot {
  return {
    playerId,
    firstName: player.firstName,
    lastName: player.lastName,
    nickname: player.nickname,
    hometown: player.hometown,
    age: player.age,
    gender: player.gender,
    bats: player.bats,
    throws: player.throws,
    primaryPosition: player.primaryPosition,
    secondaryPosition: player.secondaryPosition,
    power: player.power,
    contact: player.contact,
    speed: player.speed,
    fielding: player.fielding,
    arm: player.arm,
    velocity: player.velocity,
    junk: player.junk,
    accuracy: player.accuracy,
    arsenal: [...player.arsenal],
    overallGrade: player.overallGrade,
    trait1: player.trait1,
    trait2: player.trait2,
    personality: player.personality,
    chemistry: player.chemistry,
    morale: player.morale,
    mojo: player.mojo,
    fame: player.fame,
    salary: player.salary,
  };
}

async function capturePlayerRatingsSnapshots(
  gameState: PersistedGameState,
  leagueId: string
): Promise<void> {
  const playerIds = new Set<string>([
    ...Object.keys(gameState.playerStats),
    ...gameState.pitcherGameStats.map((stats) => stats.pitcherId),
  ]);

  const snapshots = await Promise.all(
    Array.from(playerIds).map(async (playerId) => {
      const effectivePlayer = await getEffectivePlayer(playerId, leagueId);
      if (!effectivePlayer) {
        return null;
      }

      return [playerId, buildPlayerRatingsSnapshot(playerId, effectivePlayer)] as const;
    })
  );

  gameState.playerRatingsSnapshots = Object.fromEntries(
    snapshots.filter((entry): entry is readonly [string, PlayerRatingsSnapshot] => entry !== null)
  );
}

/**
 * Process a completed game through the full pipeline.
 *
 * This is the non-React equivalent of completeGameInternal.
 * Accepts a fully-built PersistedGameState (with pitcher decisions
 * already calculated) and runs it through aggregation + archival.
 */
export async function processCompletedGame(
  gameState: PersistedGameState,
  options?: GameAggregationOptions,
  leagueId?: string,
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<ProcessGameResult> {
  const resolvedLeagueId = leagueId ?? resolveExhibitionLeagueId(gameState);

  // Step 1: Aggregate game stats to season totals
  const aggregation = await aggregateGameToSeason(gameState, options);
  if (!aggregation.success) {
    return { aggregation };
  }

  if (resolvedLeagueId) {
    await capturePlayerRatingsSnapshots(gameState, resolvedLeagueId);
  }

  // Step 2: Archive to completedGames store
  await archiveCompletedGame(
    gameState,
    archiveOptions?.finalScore ?? {
      away: gameState.awayScore,
      home: gameState.homeScore,
    },
    archiveOptions?.inningScores ?? [],
    archiveOptions?.seasonId ?? options?.seasonId,
    archiveOptions?.context ?? {
      leagueId: resolvedLeagueId,
    }
  );

  // Step 3: Register players in Almanac canonical registry
  if (resolvedLeagueId) {
    await registerAlmanacPlayers(gameState, resolvedLeagueId);
  }

  return { aggregation };
}
