/**
 * Career Stats Hook
 * Per IMPLEMENTATION_PLAN.md v3 - Day 5: Career Aggregation Pipeline
 *
 * Provides career stats data for display components.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getAllCareerBatting,
  getAllCareerPitching,
  getCareerStats,
  type PlayerCareerBatting,
  type PlayerCareerPitching,
  type CareerStats,
} from '../utils/careerStorage';

// ============================================
// TYPES
// ============================================

export interface CareerBattingLeader extends PlayerCareerBatting {
  avg: number;
  obp: number;
  slg: number;
  ops: number;
}

export interface CareerPitchingLeader extends PlayerCareerPitching {
  ip: number;
  era: number;
  whip: number;
}

export interface CareerLeaderboards {
  battingByWAR: CareerBattingLeader[];
  battingByHR: CareerBattingLeader[];
  battingByHits: CareerBattingLeader[];
  battingByRBI: CareerBattingLeader[];
  pitchingByWAR: CareerPitchingLeader[];
  pitchingByWins: CareerPitchingLeader[];
  pitchingByStrikeouts: CareerPitchingLeader[];
  pitchingBySaves: CareerPitchingLeader[];
}

// ============================================
// CALCULATIONS
// ============================================

function calculateBattingDerived(batting: PlayerCareerBatting): CareerBattingLeader {
  const avg = batting.ab > 0 ? batting.hits / batting.ab : 0;
  const obp = (batting.pa > 0)
    ? (batting.hits + batting.walks + batting.hitByPitch) /
      (batting.ab + batting.walks + batting.hitByPitch + batting.sacFlies)
    : 0;
  const totalBases = batting.singles + (2 * batting.doubles) + (3 * batting.triples) + (4 * batting.homeRuns);
  const slg = batting.ab > 0 ? totalBases / batting.ab : 0;
  const ops = obp + slg;

  return {
    ...batting,
    avg,
    obp,
    slg,
    ops,
  };
}

function calculatePitchingDerived(pitching: PlayerCareerPitching): CareerPitchingLeader {
  const ip = pitching.outsRecorded / 3;
  const era = ip > 0 ? (pitching.earnedRuns / ip) * 9 : 0;
  const whip = ip > 0 ? (pitching.walksAllowed + pitching.hitsAllowed) / ip : 0;

  return {
    ...pitching,
    ip,
    era,
    whip,
  };
}

// ============================================
// HOOK
// ============================================

export function useCareerStats() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaderboards, setLeaderboards] = useState<CareerLeaderboards>({
    battingByWAR: [],
    battingByHR: [],
    battingByHits: [],
    battingByRBI: [],
    pitchingByWAR: [],
    pitchingByWins: [],
    pitchingByStrikeouts: [],
    pitchingBySaves: [],
  });

  const loadCareerStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [battingRaw, pitchingRaw] = await Promise.all([
        getAllCareerBatting(),
        getAllCareerPitching(),
      ]);

      // Calculate derived stats
      const battingWithDerived = battingRaw.map(calculateBattingDerived);
      const pitchingWithDerived = pitchingRaw.map(calculatePitchingDerived);

      // Sort for leaderboards
      const newLeaderboards: CareerLeaderboards = {
        battingByWAR: [...battingWithDerived].sort((a, b) => (b.totalWAR ?? 0) - (a.totalWAR ?? 0)),
        battingByHR: [...battingWithDerived].sort((a, b) => b.homeRuns - a.homeRuns),
        battingByHits: [...battingWithDerived].sort((a, b) => b.hits - a.hits),
        battingByRBI: [...battingWithDerived].sort((a, b) => b.rbi - a.rbi),
        pitchingByWAR: [...pitchingWithDerived].sort((a, b) => (b.pWAR ?? 0) - (a.pWAR ?? 0)),
        pitchingByWins: [...pitchingWithDerived].sort((a, b) => b.wins - a.wins),
        pitchingByStrikeouts: [...pitchingWithDerived].sort((a, b) => b.strikeouts - a.strikeouts),
        pitchingBySaves: [...pitchingWithDerived].sort((a, b) => b.saves - a.saves),
      };

      setLeaderboards(newLeaderboards);
    } catch (err) {
      console.error('[useCareerStats] Failed to load career stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load career stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadCareerStats();
  }, [loadCareerStats]);

  // Get specific player's career stats
  const getPlayerCareer = useCallback(async (playerId: string): Promise<CareerStats | null> => {
    try {
      return await getCareerStats(playerId);
    } catch (err) {
      console.error(`[useCareerStats] Failed to get career for ${playerId}:`, err);
      return null;
    }
  }, []);

  return {
    isLoading,
    error,
    leaderboards,
    refresh: loadCareerStats,
    getPlayerCareer,
  };
}

// ============================================
// FORMATTING UTILITIES
// ============================================

export function formatAvg(avg: number): string {
  return avg.toFixed(3).replace(/^0/, '');
}

export function formatERA(era: number): string {
  return era.toFixed(2);
}

export function formatIP(ip: number): string {
  const whole = Math.floor(ip);
  const partial = Math.round((ip - whole) * 3);
  return partial > 0 ? `${whole}.${partial}` : `${whole}.0`;
}

export function formatWAR(war: number): string {
  return war >= 0 ? `+${war.toFixed(1)}` : war.toFixed(1);
}

// Color coding for career milestones
export function getCareerTierColor(stat: string, value: number): string {
  // Simplified tier coloring based on impressive career numbers
  const tiers: Record<string, number[]> = {
    homeRuns: [100, 250, 400, 500],
    hits: [500, 1500, 2500, 3000],
    rbi: [500, 1000, 1500, 2000],
    wins: [50, 150, 250, 300],
    strikeouts: [500, 1500, 2500, 3000],
    saves: [100, 200, 300, 400],
  };

  const thresholds = tiers[stat] || [50, 100, 250, 500];
  if (value >= thresholds[3]) return '#fbbf24'; // Gold
  if (value >= thresholds[2]) return '#8b5cf6'; // Purple
  if (value >= thresholds[1]) return '#3b82f6'; // Blue
  if (value >= thresholds[0]) return '#10b981'; // Green
  return '#6b7280'; // Gray
}
