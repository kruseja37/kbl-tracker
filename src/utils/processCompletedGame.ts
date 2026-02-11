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

import type { PersistedGameState } from './gameStorage';
import {
  aggregateGameToSeason,
  type GameAggregationOptions,
  type GameAggregationResult,
} from './seasonAggregator';
import { archiveCompletedGame } from './gameStorage';

export interface ProcessGameResult {
  aggregation: GameAggregationResult;
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
  options?: GameAggregationOptions
): Promise<ProcessGameResult> {
  // Step 1: Aggregate game stats to season totals
  const aggregation = await aggregateGameToSeason(gameState, options);

  // Step 2: Archive to completedGames store
  await archiveCompletedGame(gameState, {
    away: gameState.awayScore,
    home: gameState.homeScore,
  }, options?.seasonId);

  return { aggregation };
}
