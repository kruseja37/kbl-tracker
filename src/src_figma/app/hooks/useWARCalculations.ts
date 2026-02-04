/**
 * useWARCalculations Hook
 *
 * Per FIGMA_IMPLEMENTATION_PLAN.md Phase 2
 *
 * Provides WAR calculations for the Figma GameTracker UI.
 * Wraps the legacy WAR calculators with simplified interfaces.
 *
 * WAR Components:
 * - bWAR: Batting WAR (offensive value)
 * - pWAR: Pitching WAR (pitching value)
 * - fWAR: Fielding WAR (defensive value)
 * - rWAR: Baserunning WAR (running value)
 */

import { useState, useCallback, useMemo } from 'react';

// Import calculators - use dynamic imports to avoid tight coupling
import {
  calculateBWAR,
  calculateWOBA,
  getWOBAQuality,
} from '../../../engines/bwarCalculator';
import {
  calculatePWAR,
  calculateFIP,
} from '../../../engines/pwarCalculator';
import {
  calculateRWARSimplified,
} from '../../../engines/rwarCalculator';
import {
  createDefaultLeagueContext,
  SMB4_BASELINES,
} from '../../../types/war';

// ============================================
// SIMPLIFIED INPUT TYPES
// ============================================

/**
 * Simplified batting stats for WAR calculation
 */
export interface SimpleBattingStats {
  // Core counting stats
  ab: number;          // At-bats
  hits: number;        // Total hits
  singles: number;     // 1B
  doubles: number;     // 2B
  triples: number;     // 3B
  homeRuns: number;    // HR
  walks: number;       // BB (includes IBB)
  intentionalWalks: number; // IBB
  hitByPitch: number;  // HBP
  strikeouts: number;  // K
  sacFlies: number;    // SF
  sacBunts: number;    // SH
  groundedIntoDP: number; // GIDP

  // Optional identifiers
  playerId?: string;
  playerName?: string;
}

/**
 * Simplified pitching stats for WAR calculation
 */
export interface SimplePitchingStats {
  innings: number;     // IP (as decimal, e.g., 6.1 = 6 1/3)
  earnedRuns: number;  // ER
  runs: number;        // R (total)
  hits: number;        // H
  walks: number;       // BB
  strikeouts: number;  // K
  homeRuns: number;    // HR
  hitByPitch: number;  // HBP
  isStarter: boolean;  // SP vs RP

  // Optional identifiers
  playerId?: string;
  playerName?: string;
}

/**
 * Simplified baserunning stats for WAR calculation
 */
export interface SimpleBaserunningStats {
  stolenBases: number;
  caughtStealing: number;
  extraBasesTaken: number;     // Extra bases taken on hits
  extraBasesOpportunities: number;
  outsOnBases: number;         // TOOTBLANs etc.
  timesOnBase: number;         // For rate calculations
}

// ============================================
// OUTPUT TYPES
// ============================================

export interface WARResult {
  war: number;
  components: Record<string, number>;
  quality: string;
}

export interface WARCalculationState {
  isCalculating: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

// ============================================
// CONVERSION HELPERS
// ============================================

/**
 * Convert simple batting stats to full format
 * NOTE: Uses type assertion for missing fields that aren't tracked in simple stats
 */
function convertBattingStats(stats: SimpleBattingStats) {
  return {
    pa: stats.ab + stats.walks + stats.hitByPitch + stats.sacFlies + stats.sacBunts,
    ab: stats.ab,
    hits: stats.hits,
    singles: stats.singles,
    doubles: stats.doubles,
    triples: stats.triples,
    homeRuns: stats.homeRuns,
    walks: stats.walks,
    intentionalWalks: stats.intentionalWalks,
    hitByPitch: stats.hitByPitch,
    strikeouts: stats.strikeouts,
    sacFlies: stats.sacFlies,
    sacBunts: stats.sacBunts,
    gidp: stats.groundedIntoDP,
    stolenBases: 0, // TODO: Add to SimpleBattingStats
    caughtStealing: 0, // TODO: Add to SimpleBattingStats
  };
}

/**
 * Convert simple pitching stats to full format
 */
function convertPitchingStats(stats: SimplePitchingStats) {
  return {
    ip: stats.innings,
    er: stats.earnedRuns,
    r: stats.runs,
    h: stats.hits,
    bb: stats.walks,
    k: stats.strikeouts,
    hr: stats.homeRuns,
    hbp: stats.hitByPitch,
    isStarter: stats.isStarter,
    // Derived
    era: stats.innings > 0 ? (stats.earnedRuns / stats.innings) * 9 : 0,
    whip: stats.innings > 0 ? (stats.walks + stats.hits) / stats.innings : 0,
  };
}

/**
 * Convert simple baserunning stats to full format
 */
function convertBaserunningStats(stats: SimpleBaserunningStats) {
  return {
    stolenBases: stats.stolenBases,
    caughtStealing: stats.caughtStealing,
    stolenBaseOpportunities: stats.stolenBases + stats.caughtStealing,
    extraBasesTaken: stats.extraBasesTaken,
    extraBasesOpportunities: stats.extraBasesOpportunities,
    outsOnBases: stats.outsOnBases,
    timesOnBase: stats.timesOnBase,
  };
}

// ============================================
// HOOK: useWARCalculations
// ============================================

export function useWARCalculations(
  seasonId: string = 'default',
  seasonGames: number = 50
) {
  const [state, setState] = useState<WARCalculationState>({
    isCalculating: false,
    lastUpdated: null,
    error: null,
  });

  // Create league context for calculations
  const leagueContext = useMemo(() => {
    return createDefaultLeagueContext(seasonId, seasonGames);
  }, [seasonId, seasonGames]);

  /**
   * Calculate bWAR for a batter
   */
  const calculateBatterWAR = useCallback((
    stats: SimpleBattingStats
  ): WARResult => {
    try {
      const fullStats = convertBattingStats(stats);
      const result = calculateBWAR(fullStats, leagueContext);
      return {
        war: result.bWAR,
        components: {
          wOBA: result.wOBA,
          wRAA: result.wRAA,
          positionalAdj: 0, // Calculated separately in the engine
          replacement: 0,   // Calculated separately in the engine
        },
        quality: getWOBAQuality(result.wOBA),
      };
    } catch (error) {
      console.error('[useWARCalculations] bWAR error:', error);
      return { war: 0, components: {}, quality: 'Unknown' };
    }
  }, [leagueContext]);

  /**
   * Calculate pWAR for a pitcher
   */
  const calculatePitcherWAR = useCallback((
    stats: SimplePitchingStats
  ): WARResult => {
    try {
      const fullStats = convertPitchingStats(stats);
      const result = calculatePWAR(fullStats as any, leagueContext as any);
      return {
        war: result.pWAR,
        components: {
          fip: result.fip,
          era: fullStats.era,
          runsAboveAverage: 0, // Calculated internally
          replacement: 0,       // Calculated internally
        },
        quality: getFIPQualityLabel(result.fip),
      };
    } catch (error) {
      console.error('[useWARCalculations] pWAR error:', error);
      return { war: 0, components: {}, quality: 'Unknown' };
    }
  }, [leagueContext]);

  /**
   * Calculate rWAR for baserunning
   */
  const calculateBaserunningWAR = useCallback((
    stats: SimpleBaserunningStats
  ): WARResult => {
    try {
      const fullStats = convertBaserunningStats(stats);
      const result = calculateRWARSimplified(fullStats as any, seasonGames);
      return {
        war: result.rWAR,
        components: {
          wSB: result.wSB || 0,
          UBR: result.UBR || 0,
          wGDP: result.wGDP || 0,
          BsR: result.BsR || 0,
        },
        quality: result.rWAR > 0.5 ? 'Excellent' : result.rWAR > 0 ? 'Above Average' : 'Below Average',
      };
    } catch (error) {
      console.error('[useWARCalculations] rWAR error:', error);
      return { war: 0, components: {}, quality: 'Unknown' };
    }
  }, [seasonGames]);

  /**
   * Quick wOBA calculation
   */
  const quickWOBA = useCallback((stats: SimpleBattingStats): number => {
    try {
      const fullStats = convertBattingStats(stats);
      return calculateWOBA(fullStats);
    } catch (error) {
      console.error('[useWARCalculations] wOBA error:', error);
      return 0;
    }
  }, []);

  /**
   * Quick FIP calculation
   */
  const quickFIP = useCallback((stats: SimplePitchingStats): number => {
    try {
      const fullStats = convertPitchingStats(stats);
      return calculateFIP(fullStats as any);
    } catch (error) {
      console.error('[useWARCalculations] FIP error:', error);
      return 0;
    }
  }, []);

  /**
   * Get quality label for wOBA
   */
  const getWOBALabel = useCallback((woba: number): string => {
    return getWOBAQuality(woba);
  }, []);

  /**
   * Get quality label for FIP
   */
  const getFIPLabel = useCallback((fip: number): string => {
    return getFIPQualityLabel(fip);
  }, []);

  return {
    // State
    state,

    // WAR calculations
    calculateBatterWAR,
    calculatePitcherWAR,
    calculateBaserunningWAR,

    // Quick calculations
    quickWOBA,
    quickFIP,

    // Labels
    getWOBALabel,
    getFIPLabel,

    // Context
    leagueContext,
    baselines: SMB4_BASELINES,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get FIP quality label
 */
function getFIPQualityLabel(fip: number): string {
  if (fip <= 2.90) return 'Excellent';
  if (fip <= 3.50) return 'Great';
  if (fip <= 4.00) return 'Above Average';
  if (fip <= 4.40) return 'Average';
  if (fip <= 5.00) return 'Below Average';
  if (fip <= 5.50) return 'Poor';
  return 'Awful';
}

/**
 * Format WAR value for display
 */
export function formatWAR(war: number, decimals: number = 1): string {
  return war.toFixed(decimals);
}

/**
 * Get WAR quality tier (scaled for SMB4's shorter seasons)
 */
export function getWARQuality(war: number, seasonGames: number = 50): {
  label: string;
  color: string;
  tier: 'elite' | 'all-star' | 'starter' | 'average' | 'below' | 'replacement';
} {
  // Scale thresholds based on season length
  // 162-game reference: 6.0/4.0/2.0/0.5/0.0 WAR
  const scale = seasonGames / 162;

  const elite = 6.0 * scale;
  const allStar = 4.0 * scale;
  const starter = 2.0 * scale;
  const average = 0.5 * scale;

  if (war >= elite) {
    return { label: 'MVP Candidate', color: '#FFD700', tier: 'elite' };
  }
  if (war >= allStar) {
    return { label: 'All-Star', color: '#5599FF', tier: 'all-star' };
  }
  if (war >= starter) {
    return { label: 'Starter', color: '#5A8352', tier: 'starter' };
  }
  if (war >= average) {
    return { label: 'Average', color: '#808080', tier: 'average' };
  }
  if (war >= 0.0) {
    return { label: 'Below Average', color: '#AA6600', tier: 'below' };
  }
  return { label: 'Replacement Level', color: '#DD0000', tier: 'replacement' };
}

/**
 * Convert outs pitched to IP display format
 * e.g., 6 outs = "2.0", 7 outs = "2.1"
 */
export function formatIP(outs: number): string {
  const fullInnings = Math.floor(outs / 3);
  const partialOuts = outs % 3;
  return `${fullInnings}.${partialOuts}`;
}

/**
 * Convert IP display format to outs
 * e.g., "2.1" = 7 outs
 */
export function parseIP(ip: string): number {
  const parts = ip.split('.');
  const fullInnings = parseInt(parts[0]) || 0;
  const partialOuts = parseInt(parts[1]) || 0;
  return fullInnings * 3 + partialOuts;
}
