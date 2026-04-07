/**
 * Data Integrity Hook
 *
 * Runs on app startup to:
 * 1. Check for unaggregated games
 * 2. Re-run aggregation for any failed games
 * 3. Warn about incomplete games
 * 4. Verify data integrity
 */

import { useState, useEffect, useCallback } from 'react';
import {
  checkDataIntegrity,
  markGameAggregated,
  markAggregationFailed,
  type GameHeader,
} from '../utils/eventLog';
import { getCompletedGameById, type PersistedGameState } from '../utils/gameStorage';
import { aggregateGameToSeason } from '../utils/seasonAggregator';
import { registerAlmanacPlayers } from '../utils/registerAlmanacPlayers';
import { resolveExhibitionLeagueId } from '../utils/gameStorage';

// ============================================
// TYPES
// ============================================

export interface IntegrityStatus {
  checked: boolean;
  checking: boolean;
  needsAggregation: number;
  hasErrors: number;
  incompleteGames: number;
  lastError: string | null;
}

export interface UseDataIntegrityReturn {
  status: IntegrityStatus;
  isRecovering: boolean;
  recoveryProgress: { current: number; total: number };
  runIntegrityCheck: () => Promise<{
    needsAggregation: GameHeader[];
    hasErrors: GameHeader[];
    incompleteGames: GameHeader[];
  } | undefined>;
  recoverUnaggregatedGames: () => Promise<void>;
}

// ============================================
// AGGREGATION FROM EVENT LOG
// ============================================

/**
 * Re-aggregate a completed game from its archived record.
 *
 * Loads the CompletedGameRecord from IndexedDB and runs it through
 * the real aggregation pipeline (aggregateGameToSeason + registerAlmanacPlayers).
 * This is the recovery path for games where processCompletedGame failed or timed out.
 */
async function reAggregateFromArchive(header: GameHeader): Promise<boolean> {
  const archived = await getCompletedGameById(header.gameId);
  if (!archived) {
    console.warn(`[DataIntegrity] Game ${header.gameId} not found in completedGames — cannot recover`);
    return false;
  }

  // Build a minimal PersistedGameState from the archived record
  const gameStateForAggregation: PersistedGameState = {
    id: 'recovery',
    gameId: archived.gameId,
    savedAt: archived.date,
    inning: archived.innings,
    halfInning: 'BOTTOM',
    outs: 3,
    homeScore: archived.finalScore.home,
    awayScore: archived.finalScore.away,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: 0,
    awayTeamId: archived.awayTeamId,
    homeTeamId: archived.homeTeamId,
    awayTeamName: archived.awayTeamName,
    homeTeamName: archived.homeTeamName,
    seasonNumber: archived.seasonNumber ?? 1,
    playerStats: archived.playerStats,
    pitcherGameStats: archived.pitcherGameStats,
    fameEvents: archived.fameEvents,
    lastHRBatterId: null,
    consecutiveHRCount: 0,
    inningStrikeouts: 0,
    maxDeficitAway: 0,
    maxDeficitHome: 0,
    activityLog: [],
    // Preserve scope fields for correct aggregation target
    seasonId: archived.seasonId,
    statsScopeId: archived.statsScopeId,
    competitionType: archived.competitionType,
    competitionId: archived.competitionId,
    leagueId: archived.leagueId,
  };

  // Run through real aggregation pipeline
  await aggregateGameToSeason(gameStateForAggregation, {
    seasonId: archived.statsScopeId || archived.seasonId,
  });

  // Register players in Almanac
  const resolvedLeagueId = resolveExhibitionLeagueId(archived);
  if (resolvedLeagueId) {
    await registerAlmanacPlayers(gameStateForAggregation, resolvedLeagueId);
  }

  console.log(`[DataIntegrity] Re-aggregated game ${header.gameId} to season stats`);
  return true;
}

// ============================================
// HOOK
// ============================================

export function useDataIntegrity(): UseDataIntegrityReturn {
  const [status, setStatus] = useState<IntegrityStatus>({
    checked: false,
    checking: false,
    needsAggregation: 0,
    hasErrors: 0,
    incompleteGames: 0,
    lastError: null,
  });

  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryProgress, setRecoveryProgress] = useState({ current: 0, total: 0 });

  // Run integrity check
  const runIntegrityCheck = useCallback(async () => {
    setStatus(prev => ({ ...prev, checking: true }));

    try {
      const result = await checkDataIntegrity();

      setStatus({
        checked: true,
        checking: false,
        needsAggregation: result.needsAggregation.length,
        hasErrors: result.hasErrors.length,
        incompleteGames: result.incompleteGames.length,
        lastError: null,
      });

      // Log findings
      if (result.needsAggregation.length > 0) {
        console.warn(`[DataIntegrity] Found ${result.needsAggregation.length} games needing aggregation`);
      }
      if (result.hasErrors.length > 0) {
        console.warn(`[DataIntegrity] Found ${result.hasErrors.length} games with aggregation errors`);
      }
      if (result.incompleteGames.length > 0) {
        console.info(`[DataIntegrity] Found ${result.incompleteGames.length} incomplete games`);
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setStatus(prev => ({
        ...prev,
        checking: false,
        lastError: errorMsg,
      }));
      throw err;
    }
  }, []);

  // Recover unaggregated games
  const recoverUnaggregatedGames = useCallback(async () => {
    setIsRecovering(true);

    try {
      const result = await checkDataIntegrity();
      const gamesToProcess = [...result.needsAggregation, ...result.hasErrors];

      if (gamesToProcess.length === 0) {
        console.log('[DataIntegrity] No games need recovery');
        setIsRecovering(false);
        return;
      }

      setRecoveryProgress({ current: 0, total: gamesToProcess.length });

      for (let i = 0; i < gamesToProcess.length; i++) {
        const game = gamesToProcess[i];
        setRecoveryProgress({ current: i + 1, total: gamesToProcess.length });

        try {
          console.log(`[DataIntegrity] Recovering game ${game.gameId} (${i + 1}/${gamesToProcess.length})`);

          // Re-aggregate from archived CompletedGameRecord
          const success = await reAggregateFromArchive(game);
          if (!success) {
            throw new Error('Game not found in completedGames archive');
          }

          // Mark as aggregated
          await markGameAggregated(game.gameId);

          console.log(`[DataIntegrity] Successfully recovered game ${game.gameId}`);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          console.error(`[DataIntegrity] Failed to recover game ${game.gameId}:`, errorMsg);
          await markAggregationFailed(game.gameId, errorMsg);
        }
      }

      // Re-check status
      await runIntegrityCheck();
    } finally {
      setIsRecovering(false);
      setRecoveryProgress({ current: 0, total: 0 });
    }
  }, [runIntegrityCheck]);

  // Run check on mount
  useEffect(() => {
    runIntegrityCheck().catch(console.error);
  }, [runIntegrityCheck]);

  return {
    status,
    isRecovering,
    recoveryProgress,
    runIntegrityCheck,
    recoverUnaggregatedGames,
  };
}
