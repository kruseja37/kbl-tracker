/**
 * useWARCalculations Hook
 * Per IMPLEMENTATION_PLAN.md v5 - Day 1: Wire fWAR + rWAR
 *
 * Bridges seasonStorage data to WAR calculators (bWAR, pWAR, fWAR, rWAR).
 * Provides calculated WAR values for display in UI.
 */

import { useState, useEffect, useCallback } from 'react';
import { type MojoLevel, getMojoWARMultiplier } from '../engines/mojoEngine';
import { type FitnessState, getFitnessWARMultiplier } from '../engines/fitnessEngine';
import {
  getSeasonBattingStats,
  getSeasonPitchingStats,
  getAllFieldingStats,
  getActiveSeason,
  type PlayerSeasonBatting,
  type PlayerSeasonPitching,
  type PlayerSeasonFielding,
} from '../utils/seasonStorage';
import {
  calculateBWARSimplified,
  formatWAR,
  type BWARResult,
} from '../engines/bwarCalculator';
import {
  calculatePWARSimplified,
  type PWARResult,
} from '../engines/pwarCalculator';
import {
  calculateFWARFromStats,
  type FWARResult,
  type Position,
} from '../engines/fwarCalculator';
import {
  calculateRWARSimplified,
  type RWARResult,
  type BaserunningStats,
} from '../engines/rwarCalculator';
import {
  type BattingStatsForWAR,
} from '../types/war';

// ============================================
// TYPES
// ============================================

export interface PlayerBWAR {
  playerId: string;
  playerName: string;
  teamId: string;
  bWAR: number;
  wOBA: number;
  wRAA: number;
  pa: number;
  result: BWARResult;
}

export interface PlayerPWAR {
  playerId: string;
  playerName: string;
  teamId: string;
  pWAR: number;
  fip: number;
  ip: number;
  role: 'starter' | 'reliever' | 'swingman';
  result: PWARResult;
}

export interface PlayerFWAR {
  playerId: string;
  playerName: string;
  teamId: string;
  fWAR: number;
  runsSaved: number;
  games: number;
  position: Position;
  result: FWARResult;
}

export interface PlayerRWAR {
  playerId: string;
  playerName: string;
  teamId: string;
  rWAR: number;
  wSB: number;
  wGDP: number;
  BsR: number;
  result: RWARResult;
}

export interface PlayerTotalWAR {
  playerId: string;
  playerName: string;
  teamId: string;
  totalWAR: number;
  bWAR: number;
  fWAR: number;
  rWAR: number;
  pWAR: number;
  isPitcher: boolean;
}

export interface WARLeaderboards {
  battingWAR: PlayerBWAR[];
  pitchingWAR: PlayerPWAR[];
  fieldingWAR: PlayerFWAR[];
  baserunningWAR: PlayerRWAR[];
  totalWAR: PlayerTotalWAR[];
}

export interface UseWARCalculationsResult {
  // Individual player lookups
  getPlayerBWAR: (playerId: string) => PlayerBWAR | null;
  getPlayerPWAR: (playerId: string) => PlayerPWAR | null;
  getPlayerFWAR: (playerId: string) => PlayerFWAR | null;
  getPlayerRWAR: (playerId: string) => PlayerRWAR | null;
  getPlayerTotalWAR: (playerId: string) => PlayerTotalWAR | null;

  // Leaderboards
  leaderboards: WARLeaderboards;

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Refresh
  refresh: () => Promise<void>;

  // Season info
  seasonId: string | null;
  seasonGames: number;
}

// ============================================
// CONVERSION FUNCTIONS
// ============================================

/**
 * Convert PlayerSeasonBatting to BattingStatsForWAR
 * Maps the stored stats to the format expected by bwarCalculator
 */
function convertToBattingStatsForWAR(stats: PlayerSeasonBatting): BattingStatsForWAR {
  return {
    pa: stats.pa,
    ab: stats.ab,
    hits: stats.hits,
    singles: stats.singles,
    doubles: stats.doubles,
    triples: stats.triples,
    homeRuns: stats.homeRuns,
    walks: stats.walks,
    intentionalWalks: 0, // Not tracked separately in seasonStorage
    hitByPitch: stats.hitByPitch,
    sacFlies: stats.sacFlies,
    sacBunts: stats.sacBunts,
    strikeouts: stats.strikeouts,
    gidp: stats.gidp,
    stolenBases: stats.stolenBases,
    caughtStealing: stats.caughtStealing,
  };
}

/**
 * Convert PlayerSeasonPitching to PitchingStatsForWAR
 * Maps the stored stats to the format expected by pwarCalculator
 */
function convertToPitchingStatsForWAR(stats: PlayerSeasonPitching): {
  ip: number;
  strikeouts: number;
  walks: number;
  hitByPitch: number;
  homeRunsAllowed: number;
  gamesStarted: number;
  gamesAppeared: number;
  saves: number;
  holds: number;
} {
  return {
    ip: stats.outsRecorded / 3, // Convert outs to innings
    strikeouts: stats.strikeouts,
    walks: stats.walksAllowed,
    hitByPitch: stats.hitBatters,
    homeRunsAllowed: stats.homeRunsAllowed,
    gamesStarted: stats.gamesStarted,
    gamesAppeared: stats.games,
    saves: stats.saves,
    holds: stats.holds,
  };
}

/**
 * Convert PlayerSeasonBatting to BaserunningStats for rWAR
 */
function convertToBaserunningStats(stats: PlayerSeasonBatting): BaserunningStats {
  return {
    // StolenBaseStats (required by interface)
    stolenBases: stats.stolenBases,
    caughtStealing: stats.caughtStealing,
    singles: stats.singles,
    walks: stats.walks,
    hitByPitch: stats.hitByPitch,
    intentionalWalks: 0, // Not tracked in SMB4 - default to 0
    // GIDPStats (required by interface)
    gidp: stats.gidp,
    gidpOpportunities: Math.round(stats.pa * 0.15), // Estimate: ~15% of PA are GDP opportunities
    // Optional fields
    plateAppearances: stats.pa,
    // speedRating not available from seasonStorage - rWAR will estimate UBR
  };
}

/**
 * Get primary position from fielding stats (most games played)
 */
function getPrimaryPosition(stats: PlayerSeasonFielding): Position {
  const positions = Object.entries(stats.gamesByPosition);
  if (positions.length === 0) return 'SS' as Position; // Default

  positions.sort((a, b) => b[1] - a[1]);
  return positions[0][0] as Position;
}

// ============================================
// MINIMUM THRESHOLDS
// ============================================

// Minimum PA for qualified batter (scales with season length)
const MIN_PA_PER_GAME = 3.1; // ~3.1 PA/game for qualified

// Minimum IP for qualified pitcher (scales with season length)
const MIN_IP_PER_GAME = 1.0; // ~1 IP/game for qualified

// ============================================
// HOOK
// ============================================

export function useWARCalculations(): UseWARCalculationsResult {
  const [battingWARMap, setBattingWARMap] = useState<Map<string, PlayerBWAR>>(new Map());
  const [pitchingWARMap, setPitchingWARMap] = useState<Map<string, PlayerPWAR>>(new Map());
  const [fieldingWARMap, setFieldingWARMap] = useState<Map<string, PlayerFWAR>>(new Map());
  const [baserunningWARMap, setBaserunningWARMap] = useState<Map<string, PlayerRWAR>>(new Map());
  const [totalWARMap, setTotalWARMap] = useState<Map<string, PlayerTotalWAR>>(new Map());
  const [leaderboards, setLeaderboards] = useState<WARLeaderboards>({
    battingWAR: [],
    pitchingWAR: [],
    fieldingWAR: [],
    baserunningWAR: [],
    totalWAR: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [seasonGames, setSeasonGames] = useState(48); // Default SMB4 season

  const calculateAllWAR = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get active season
      const activeSeason = await getActiveSeason();
      if (!activeSeason) {
        // No active season - use defaults
        setSeasonId(null);
        setBattingWARMap(new Map());
        setPitchingWARMap(new Map());
        setFieldingWARMap(new Map());
        setBaserunningWARMap(new Map());
        setTotalWARMap(new Map());
        setLeaderboards({
          battingWAR: [],
          pitchingWAR: [],
          fieldingWAR: [],
          baserunningWAR: [],
          totalWAR: [],
        });
        setIsLoading(false);
        return;
      }

      setSeasonId(activeSeason.seasonId);
      setSeasonGames(activeSeason.totalGames);

      // Fetch all stats in parallel
      const [battingStats, pitchingStats, fieldingStats] = await Promise.all([
        getSeasonBattingStats(activeSeason.seasonId),
        getSeasonPitchingStats(activeSeason.seasonId),
        getAllFieldingStats(activeSeason.seasonId),
      ]);

      // Create maps for easy lookup
      const fieldingByPlayer = new Map<string, PlayerSeasonFielding>();
      for (const fs of fieldingStats) {
        fieldingByPlayer.set(fs.playerId, fs);
      }

      // Calculate bWAR for all batters
      const newBattingWARMap = new Map<string, PlayerBWAR>();
      const battingWARList: PlayerBWAR[] = [];

      for (const stats of battingStats) {
        if (stats.pa === 0) continue; // Skip players with no PA

        const battingForWAR = convertToBattingStatsForWAR(stats);
        const result = calculateBWARSimplified(battingForWAR, activeSeason.totalGames);

        const playerBWAR: PlayerBWAR = {
          playerId: stats.playerId,
          playerName: stats.playerName,
          teamId: stats.teamId,
          bWAR: result.bWAR,
          wOBA: result.wOBA,
          wRAA: result.wRAA,
          pa: stats.pa,
          result,
        };

        newBattingWARMap.set(stats.playerId, playerBWAR);
        battingWARList.push(playerBWAR);
      }

      // Calculate pWAR for all pitchers
      const newPitchingWARMap = new Map<string, PlayerPWAR>();
      const pitchingWARList: PlayerPWAR[] = [];

      for (const stats of pitchingStats) {
        if (stats.outsRecorded === 0) continue; // Skip pitchers with no IP

        const pitchingForWAR = convertToPitchingStatsForWAR(stats);
        const result = calculatePWARSimplified(pitchingForWAR, activeSeason.totalGames);

        const playerPWAR: PlayerPWAR = {
          playerId: stats.playerId,
          playerName: stats.playerName,
          teamId: stats.teamId,
          pWAR: result.pWAR,
          fip: result.fip,
          ip: pitchingForWAR.ip,
          role: result.role,
          result,
        };

        newPitchingWARMap.set(stats.playerId, playerPWAR);
        pitchingWARList.push(playerPWAR);
      }

      // Calculate fWAR for all fielders
      const newFieldingWARMap = new Map<string, PlayerFWAR>();
      const fieldingWARList: PlayerFWAR[] = [];

      for (const stats of fieldingStats) {
        if (stats.games === 0) continue; // Skip players with no fielding games

        const position = getPrimaryPosition(stats);
        const result = calculateFWARFromStats(
          {
            putouts: stats.putouts,
            assists: stats.assists,
            errors: stats.errors,
            doublePlays: stats.doublePlays,
          },
          position,
          stats.games,
          activeSeason.totalGames
        );

        const playerFWAR: PlayerFWAR = {
          playerId: stats.playerId,
          playerName: stats.playerName,
          teamId: stats.teamId,
          fWAR: result.fWAR,
          runsSaved: result.totalRunsSaved,
          games: stats.games,
          position,
          result,
        };

        newFieldingWARMap.set(stats.playerId, playerFWAR);
        fieldingWARList.push(playerFWAR);
      }

      // Calculate rWAR for all batters (baserunning)
      const newBaserunningWARMap = new Map<string, PlayerRWAR>();
      const baserunningWARList: PlayerRWAR[] = [];

      for (const stats of battingStats) {
        if (stats.pa === 0) continue; // Skip players with no PA

        const baserunningStats = convertToBaserunningStats(stats);
        const result = calculateRWARSimplified(baserunningStats, activeSeason.totalGames);

        const playerRWAR: PlayerRWAR = {
          playerId: stats.playerId,
          playerName: stats.playerName,
          teamId: stats.teamId,
          rWAR: result.rWAR,
          wSB: result.wSB,
          wGDP: result.wGDP,
          BsR: result.BsR,
          result,
        };

        newBaserunningWARMap.set(stats.playerId, playerRWAR);
        baserunningWARList.push(playerRWAR);
      }

      // Calculate total WAR for all players
      const newTotalWARMap = new Map<string, PlayerTotalWAR>();
      const totalWARList: PlayerTotalWAR[] = [];

      // Process all unique players
      const allPlayerIds = new Set<string>();
      battingStats.forEach(s => allPlayerIds.add(s.playerId));
      pitchingStats.forEach(s => allPlayerIds.add(s.playerId));
      fieldingStats.forEach(s => allPlayerIds.add(s.playerId));

      for (const playerId of allPlayerIds) {
        const bwar = newBattingWARMap.get(playerId);
        const pwar = newPitchingWARMap.get(playerId);
        const fwar = newFieldingWARMap.get(playerId);
        const rwar = newBaserunningWARMap.get(playerId);

        const bWARValue = bwar?.bWAR ?? 0;
        const pWARValue = pwar?.pWAR ?? 0;
        const fWARValue = fwar?.fWAR ?? 0;
        const rWARValue = rwar?.rWAR ?? 0;

        // For position players: bWAR + fWAR + rWAR
        // For pitchers: pWAR (batting contribution usually minimal)
        const isPitcher = pwar !== undefined && pwar.ip >= 10; // At least 10 IP
        const totalWAR = isPitcher
          ? pWARValue + (bWARValue * 0.1) // Pitchers get 10% of their batting WAR
          : bWARValue + fWARValue + rWARValue;

        // Get player name from whichever source has it
        const playerName = bwar?.playerName ?? pwar?.playerName ?? fwar?.playerName ?? 'Unknown';
        const teamId = bwar?.teamId ?? pwar?.teamId ?? fwar?.teamId ?? '';

        const playerTotal: PlayerTotalWAR = {
          playerId,
          playerName,
          teamId,
          totalWAR: Math.round(totalWAR * 100) / 100,
          bWAR: bWARValue,
          fWAR: fWARValue,
          rWAR: rWARValue,
          pWAR: pWARValue,
          isPitcher,
        };

        newTotalWARMap.set(playerId, playerTotal);
        totalWARList.push(playerTotal);
      }

      // Sort leaderboards by WAR (descending)
      battingWARList.sort((a, b) => b.bWAR - a.bWAR);
      pitchingWARList.sort((a, b) => b.pWAR - a.pWAR);
      fieldingWARList.sort((a, b) => b.fWAR - a.fWAR);
      baserunningWARList.sort((a, b) => b.rWAR - a.rWAR);
      totalWARList.sort((a, b) => b.totalWAR - a.totalWAR);

      // Update state
      setBattingWARMap(newBattingWARMap);
      setPitchingWARMap(newPitchingWARMap);
      setFieldingWARMap(newFieldingWARMap);
      setBaserunningWARMap(newBaserunningWARMap);
      setTotalWARMap(newTotalWARMap);
      setLeaderboards({
        battingWAR: battingWARList.slice(0, 20), // Top 20 for leaderboard
        pitchingWAR: pitchingWARList.slice(0, 20),
        fieldingWAR: fieldingWARList.slice(0, 20),
        baserunningWAR: baserunningWARList.slice(0, 20),
        totalWAR: totalWARList.slice(0, 20),
      });
    } catch (err) {
      console.error('Error calculating WAR:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate WAR');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    calculateAllWAR();
  }, [calculateAllWAR]);

  // Lookup functions
  const getPlayerBWAR = useCallback(
    (playerId: string): PlayerBWAR | null => {
      return battingWARMap.get(playerId) || null;
    },
    [battingWARMap]
  );

  const getPlayerPWAR = useCallback(
    (playerId: string): PlayerPWAR | null => {
      return pitchingWARMap.get(playerId) || null;
    },
    [pitchingWARMap]
  );

  const getPlayerFWAR = useCallback(
    (playerId: string): PlayerFWAR | null => {
      return fieldingWARMap.get(playerId) || null;
    },
    [fieldingWARMap]
  );

  const getPlayerRWAR = useCallback(
    (playerId: string): PlayerRWAR | null => {
      return baserunningWARMap.get(playerId) || null;
    },
    [baserunningWARMap]
  );

  const getPlayerTotalWAR = useCallback(
    (playerId: string): PlayerTotalWAR | null => {
      return totalWARMap.get(playerId) || null;
    },
    [totalWARMap]
  );

  return {
    getPlayerBWAR,
    getPlayerPWAR,
    getPlayerFWAR,
    getPlayerRWAR,
    getPlayerTotalWAR,
    leaderboards,
    isLoading,
    error,
    refresh: calculateAllWAR,
    seasonId,
    seasonGames,
  };
}

// ============================================
// UTILITY EXPORTS
// ============================================

export { formatWAR };

/**
 * Format WAR with color indicator
 */
export function getWARColor(war: number): string {
  if (war >= 4.0) return '#22c55e'; // Green - All-Star+
  if (war >= 2.0) return '#3b82f6'; // Blue - Above average
  if (war >= 0.0) return '#6b7280'; // Gray - Replacement level
  return '#ef4444'; // Red - Below replacement
}

/**
 * Get WAR tier description
 */
export function getWARTier(war: number, seasonGames: number): string {
  // Scale to 162-game equivalent
  const scale = seasonGames / 162;
  const scaledWAR = war / scale;

  if (scaledWAR >= 8.0) return 'MVP';
  if (scaledWAR >= 6.0) return 'Superstar';
  if (scaledWAR >= 4.0) return 'All-Star';
  if (scaledWAR >= 2.0) return 'Above Average';
  if (scaledWAR >= 1.0) return 'Starter';
  if (scaledWAR >= 0.0) return 'Replacement';
  return 'Below Replacement';
}

/**
 * Adjust WAR for current Mojo/Fitness condition.
 * Per MOJO_FITNESS_SYSTEM_SPEC.md Section 5.1:
 * - Rattled/Tense mojo → WAR bonus (harder conditions = more credit)
 * - Locked In/Jacked mojo → WAR penalty (easier conditions = less credit)
 * - Juiced fitness → WAR penalty (-15%)
 * - Strained/Weak fitness → WAR bonus (gutsy performance)
 *
 * NOTE: This applies the CURRENT mojo/fitness as a multiplier to total WAR.
 * Per-game mojo/fitness tracking for weighted aggregation is a future enhancement.
 */
export function adjustWARForCondition(
  baseWAR: number,
  mojo?: MojoLevel,
  fitness?: FitnessState,
): number {
  let adjusted = baseWAR;
  if (mojo !== undefined) {
    adjusted *= getMojoWARMultiplier(mojo);
  }
  if (fitness !== undefined) {
    adjusted *= getFitnessWARMultiplier(fitness);
  }
  return Math.round(adjusted * 100) / 100;
}
