/**
 * Season Stats Hook
 * Per STAT_TRACKING_ARCHITECTURE_SPEC.md - Phase 3: Season Stats Querying
 *
 * Provides React hook interface for accessing season stats.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  type PlayerSeasonBatting,
  type PlayerSeasonPitching,
  type PlayerSeasonFielding,
  type SeasonMetadata,
  getAllBattingStats,
  getAllPitchingStats,
  getAllFieldingStats,
  getSeasonMetadata,
  getOrCreateSeason,
  calculateBattingDerived,
  calculatePitchingDerived,
  calculateFieldingDerived,
} from '../utils/seasonStorage';

// Default season
const DEFAULT_SEASON_ID = 'season-1';
const DEFAULT_SEASON_NUMBER = 1;
const DEFAULT_SEASON_NAME = 'Season 1';
const DEFAULT_TOTAL_GAMES = 162;

// ============================================
// TYPES
// ============================================

export interface BattingLeaderEntry extends PlayerSeasonBatting {
  rank: number;
  avg: number;
  obp: number;
  slg: number;
  ops: number;
}

export interface PitchingLeaderEntry extends PlayerSeasonPitching {
  rank: number;
  era: number;
  whip: number;
  ip: string;  // Formatted innings pitched (e.g., "45.2")
}

export interface FieldingLeaderEntry extends PlayerSeasonFielding {
  rank: number;
  fieldingPct: number;
}

export type BattingSortKey = 'avg' | 'obp' | 'slg' | 'ops' | 'hr' | 'rbi' | 'hits' | 'runs' | 'sb' | 'fameNet';
export type PitchingSortKey = 'era' | 'whip' | 'wins' | 'strikeouts' | 'saves' | 'ip' | 'fameNet';
export type FieldingSortKey = 'fieldingPct' | 'putouts' | 'assists' | 'errors';

export interface UseSeasonStatsReturn {
  // State
  isLoading: boolean;
  error: string | null;
  seasonId: string;
  seasonMetadata: SeasonMetadata | null;

  // Batting leaderboard
  battingLeaders: BattingLeaderEntry[];
  getBattingLeaders: (sortBy: BattingSortKey, limit?: number) => BattingLeaderEntry[];

  // Pitching leaderboard
  pitchingLeaders: PitchingLeaderEntry[];
  getPitchingLeaders: (sortBy: PitchingSortKey, limit?: number) => PitchingLeaderEntry[];

  // Fielding leaderboard
  fieldingLeaders: FieldingLeaderEntry[];
  getFieldingLeaders: (sortBy: FieldingSortKey, limit?: number) => FieldingLeaderEntry[];

  // Refresh
  refresh: () => Promise<void>;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format outs recorded as innings pitched (e.g., 136 outs = "45.1")
 */
function formatInningsPitched(outsRecorded: number): string {
  const fullInnings = Math.floor(outsRecorded / 3);
  const partialOuts = outsRecorded % 3;
  return partialOuts === 0 ? `${fullInnings}.0` : `${fullInnings}.${partialOuts}`;
}

/**
 * Convert batting stats to leaderboard entry with derived stats
 */
function toBattingLeaderEntry(stats: PlayerSeasonBatting, rank: number): BattingLeaderEntry {
  const derived = calculateBattingDerived(stats);
  return {
    ...stats,
    rank,
    avg: derived.avg,
    obp: derived.obp,
    slg: derived.slg,
    ops: derived.ops,
  };
}

/**
 * Convert pitching stats to leaderboard entry with derived stats
 */
function toPitchingLeaderEntry(stats: PlayerSeasonPitching, rank: number): PitchingLeaderEntry {
  const derived = calculatePitchingDerived(stats);
  return {
    ...stats,
    rank,
    era: derived.era,
    whip: derived.whip,
    ip: formatInningsPitched(stats.outsRecorded),
  };
}

/**
 * Convert fielding stats to leaderboard entry with derived stats
 */
function toFieldingLeaderEntry(stats: PlayerSeasonFielding, rank: number): FieldingLeaderEntry {
  const derived = calculateFieldingDerived(stats);
  return {
    ...stats,
    rank,
    fieldingPct: derived.fieldingPct,
  };
}

// ============================================
// HOOK
// ============================================

export function useSeasonStats(seasonId: string = DEFAULT_SEASON_ID): UseSeasonStatsReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seasonMetadata, setSeasonMetadata] = useState<SeasonMetadata | null>(null);

  // Raw stats from storage
  const [battingStats, setBattingStats] = useState<PlayerSeasonBatting[]>([]);
  const [pitchingStats, setPitchingStats] = useState<PlayerSeasonPitching[]>([]);
  const [fieldingStats, setFieldingStats] = useState<PlayerSeasonFielding[]>([]);

  // Load all stats for the season
  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Ensure season exists
      await getOrCreateSeason(seasonId, DEFAULT_SEASON_NUMBER, DEFAULT_SEASON_NAME, DEFAULT_TOTAL_GAMES);

      // Load all data in parallel
      const [metadata, batting, pitching, fielding] = await Promise.all([
        getSeasonMetadata(seasonId),
        getAllBattingStats(seasonId),
        getAllPitchingStats(seasonId),
        getAllFieldingStats(seasonId),
      ]);

      setSeasonMetadata(metadata);
      setBattingStats(batting);
      setPitchingStats(pitching);
      setFieldingStats(fielding);
    } catch (err) {
      console.error('Failed to load season stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  }, [seasonId]);

  // Load on mount and when seasonId changes
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Get batting leaderboard sorted by specified stat
  const getBattingLeaders = useCallback((sortBy: BattingSortKey, limit: number = 10): BattingLeaderEntry[] => {
    // Filter out players with insufficient at-bats for rate stats
    const qualifyingAB = sortBy === 'avg' || sortBy === 'obp' || sortBy === 'slg' || sortBy === 'ops' ? 10 : 0;

    const qualified = battingStats.filter(s => s.ab >= qualifyingAB);

    // Sort based on stat type
    const sorted = [...qualified].sort((a, b) => {
      const aDerived = calculateBattingDerived(a);
      const bDerived = calculateBattingDerived(b);

      switch (sortBy) {
        case 'avg': return bDerived.avg - aDerived.avg;
        case 'obp': return bDerived.obp - aDerived.obp;
        case 'slg': return bDerived.slg - aDerived.slg;
        case 'ops': return bDerived.ops - aDerived.ops;
        case 'hr': return b.homeRuns - a.homeRuns;
        case 'rbi': return b.rbi - a.rbi;
        case 'hits': return b.hits - a.hits;
        case 'runs': return b.runs - a.runs;
        case 'sb': return b.stolenBases - a.stolenBases;
        case 'fameNet': return b.fameNet - a.fameNet;
        default: return 0;
      }
    });

    return sorted.slice(0, limit).map((s, i) => toBattingLeaderEntry(s, i + 1));
  }, [battingStats]);

  // Get pitching leaderboard sorted by specified stat
  const getPitchingLeaders = useCallback((sortBy: PitchingSortKey, limit: number = 10): PitchingLeaderEntry[] => {
    // Filter out pitchers with insufficient innings for rate stats
    const qualifyingOuts = sortBy === 'era' || sortBy === 'whip' ? 9 : 0;  // At least 3 IP

    const qualified = pitchingStats.filter(s => s.outsRecorded >= qualifyingOuts);

    const sorted = [...qualified].sort((a, b) => {
      const aDerived = calculatePitchingDerived(a);
      const bDerived = calculatePitchingDerived(b);

      switch (sortBy) {
        case 'era': return aDerived.era - bDerived.era;  // Lower is better
        case 'whip': return aDerived.whip - bDerived.whip;  // Lower is better
        case 'wins': return b.wins - a.wins;
        case 'strikeouts': return b.strikeouts - a.strikeouts;
        case 'saves': return b.saves - a.saves;
        case 'ip': return b.outsRecorded - a.outsRecorded;
        case 'fameNet': return b.fameNet - a.fameNet;
        default: return 0;
      }
    });

    return sorted.slice(0, limit).map((s, i) => toPitchingLeaderEntry(s, i + 1));
  }, [pitchingStats]);

  // Get fielding leaderboard sorted by specified stat
  const getFieldingLeaders = useCallback((sortBy: FieldingSortKey, limit: number = 10): FieldingLeaderEntry[] => {
    // Filter out players with insufficient chances
    const qualifyingChances = sortBy === 'fieldingPct' ? 10 : 0;

    const qualified = fieldingStats.filter(s =>
      (s.putouts + s.assists + s.errors) >= qualifyingChances
    );

    const sorted = [...qualified].sort((a, b) => {
      const aDerived = calculateFieldingDerived(a);
      const bDerived = calculateFieldingDerived(b);

      switch (sortBy) {
        case 'fieldingPct': return bDerived.fieldingPct - aDerived.fieldingPct;
        case 'putouts': return b.putouts - a.putouts;
        case 'assists': return b.assists - a.assists;
        case 'errors': return a.errors - b.errors;  // Lower is better
        default: return 0;
      }
    });

    return sorted.slice(0, limit).map((s, i) => toFieldingLeaderEntry(s, i + 1));
  }, [fieldingStats]);

  // Default leaderboards (top 10, sorted by common stats)
  const battingLeaders = getBattingLeaders('ops', 10);
  const pitchingLeaders = getPitchingLeaders('era', 10);
  const fieldingLeaders = getFieldingLeaders('fieldingPct', 10);

  return {
    isLoading,
    error,
    seasonId,
    seasonMetadata,
    battingLeaders,
    getBattingLeaders,
    pitchingLeaders,
    getPitchingLeaders,
    fieldingLeaders,
    getFieldingLeaders,
    refresh: loadStats,
  };
}
