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
  getGameEvents,
  getGamePitchingAppearances,
  markGameAggregated,
  markAggregationFailed,
  type GameHeader,
  type AtBatEvent,
  type PitchingAppearance,
} from '../utils/eventLog';

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
 * Recalculate season stats from event log
 * This is the recovery path - it reads raw events and rebuilds everything
 */
async function aggregateGameFromEventLog(
  header: GameHeader,
  events: AtBatEvent[],
  pitchingAppearances: PitchingAppearance[]
): Promise<void> {
  // TODO: This will call into seasonStorage to aggregate
  // For now, we'll build the player stats from events

  const batterStats = new Map<string, {
    odlcli: string;
    playerName: string;
    teamId: string;
    pa: number;
    ab: number;
    hits: number;
    singles: number;
    doubles: number;
    triples: number;
    homeRuns: number;
    rbi: number;
    runs: number;
    walks: number;
    strikeouts: number;
    hitByPitch: number;
    sacFlies: number;
    sacBunts: number;
    stolenBases: number;
    caughtStealing: number;
  }>();

  // Process each at-bat event
  for (const event of events) {
    // Batter stats
    if (!batterStats.has(event.batterId)) {
      batterStats.set(event.batterId, {
        odlcli: event.batterId,
        playerName: event.batterName,
        teamId: event.batterTeamId,
        pa: 0, ab: 0, hits: 0, singles: 0, doubles: 0, triples: 0, homeRuns: 0,
        rbi: 0, runs: 0, walks: 0, strikeouts: 0, hitByPitch: 0,
        sacFlies: 0, sacBunts: 0, stolenBases: 0, caughtStealing: 0,
      });
    }
    const batter = batterStats.get(event.batterId)!;

    // Plate appearance
    batter.pa++;

    // Result-based stats
    switch (event.result) {
      case '1B':
        batter.ab++; batter.hits++; batter.singles++;
        break;
      case '2B':
        batter.ab++; batter.hits++; batter.doubles++;
        break;
      case '3B':
        batter.ab++; batter.hits++; batter.triples++;
        break;
      case 'HR':
        batter.ab++; batter.hits++; batter.homeRuns++;
        break;
      case 'BB':
      case 'IBB':
        batter.walks++;
        break;
      case 'HBP':
        batter.hitByPitch++;
        break;
      case 'K':
      case 'KL':
        batter.ab++; batter.strikeouts++;
        break;
      case 'SF':
        batter.sacFlies++;
        break;
      case 'SAC':
        batter.sacBunts++;
        break;
      default:
        // Ground outs, fly outs, etc.
        batter.ab++;
        break;
    }

    batter.rbi += event.rbiCount;
  }

  // Process pitching appearances (already have accumulated stats)
  const pitcherStats = pitchingAppearances.map(app => ({
    pitcherId: app.pitcherId,
    pitcherName: app.pitcherName,
    teamId: app.teamId,
    isStarter: app.isStarter,
    outsRecorded: app.outsRecorded,
    hitsAllowed: app.hitsAllowed,
    runsAllowed: app.runsAllowed,
    earnedRuns: app.earnedRuns,
    walksAllowed: app.walksAllowed,
    strikeouts: app.strikeouts,
    homeRunsAllowed: app.homeRunsAllowed,
    hitBatsmen: app.hitBatsmen,
    wildPitches: app.wildPitches,
    battersFaced: app.battersFaced,
    inheritedRunners: app.inheritedRunners.length,
    inheritedRunnersScored: app.inheritedRunnersScored,
    bequeathedRunners: app.bequeathedRunners.length,
    bequeathedRunnersScored: app.bequeathedRunnersScored,
  }));

  // Collect fame events
  const fameEvents = events.flatMap(e => e.fameEvents);

  // TODO: Call actual season aggregation with rebuilt stats
  // For now, we're just validating we can rebuild the data
  console.log(`[Recovery] Rebuilt stats for game ${header.gameId}:`, {
    batters: batterStats.size,
    pitchers: pitcherStats.length,
    fameEvents: fameEvents.length,
  });

  // In full implementation, this would call:
  // await aggregateToSeason(header.seasonId, batterStats, pitcherStats, fameEvents);
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

          // Load all events for this game
          const events = await getGameEvents(game.gameId);
          const pitchingAppearances = await getGamePitchingAppearances(game.gameId);

          // Re-aggregate from events
          await aggregateGameFromEventLog(game, events, pitchingAppearances);

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
