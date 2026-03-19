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
import { archiveCompletedGame } from './gameStorage';
import { getEffectivePlayer } from './playerOverrides';
import { registerAlmanacPlayers } from './registerAlmanacPlayers';

export interface ProcessGameResult {
  aggregation: GameAggregationResult;
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
  leagueId?: string
): Promise<ProcessGameResult> {
  // Step 1: Aggregate game stats to season totals
  const aggregation = await aggregateGameToSeason(gameState, options);

  if (leagueId) {
    await capturePlayerRatingsSnapshots(gameState, leagueId);
  }

  // Step 2: Archive to completedGames store
  await archiveCompletedGame(
    gameState,
    {
      away: gameState.awayScore,
      home: gameState.homeScore,
    },
    [],
    options?.seasonId,
    {
      leagueId,
    }
  );

  // Step 3: Register players in Almanac canonical registry
  if (leagueId) {
    await registerAlmanacPlayers(gameState, leagueId);
  }

  return { aggregation };
}
