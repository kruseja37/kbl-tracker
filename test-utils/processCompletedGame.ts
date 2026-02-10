/**
 * Extracted Game Completion Orchestrator
 *
 * Extracted from useGameState.ts:completeGameInternal (lines 2821-2971)
 * so the pipeline can be called from Node/Vitest without React.
 *
 * Pipeline classification: B (Orchestrated but Extractable)
 * Per FRANCHISE_API_MAP.md §11
 *
 * This function runs the same steps as completeGameInternal:
 *   1. aggregateGameToSeason() — batting/pitching/fielding/fame/milestone aggregation
 *   2. archiveCompletedGame() — writes to completedGames store
 *
 * Omitted React-only steps:
 *   - completeGame() from eventLog (marks game header — simulator has no game header)
 *   - markGameAggregated() from eventLog (same)
 *   - setIsSaving / setLastSavedAt (React state)
 *   - pitchCountPrompt (React UI)
 */

import type { PersistedGameState } from '../src/utils/gameStorage';
import {
  aggregateGameToSeason,
  type GameAggregationOptions,
  type GameAggregationResult,
} from '../src/utils/seasonAggregator';
import { archiveCompletedGame } from '../src/utils/gameStorage';

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
  });

  return { aggregation };
}
