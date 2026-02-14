/**
 * Season Stats Hook
 * Per STAT_TRACKING_ARCHITECTURE_SPEC.md - Phase 3: Season Stats Querying
 *
 * Provides React hook interface for accessing season stats.
 * WAR is computed on-the-fly from season stats (no schema migration).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
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

// WAR calculator imports
import { calculateBWARSimplified } from '../engines/bwarCalculator';
import { calculatePWARSimplified, type PitchingStatsForWAR } from '../engines/pwarCalculator';
import { calculateFWARFromStats, type Position } from '../engines/fwarCalculator';
import { calculateRWARSimplified, type BaserunningStats } from '../engines/rwarCalculator';
import type { BattingStatsForWAR } from '../types/war';

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
  // WAR fields (computed on-the-fly)
  bWAR: number;
  fWAR: number;
  rWAR: number;
  totalWAR: number;  // bWAR + fWAR + rWAR
}

export interface PitchingLeaderEntry extends PlayerSeasonPitching {
  rank: number;
  era: number;
  whip: number;
  ip: string;  // Formatted innings pitched (e.g., "45.2")
  // WAR fields (computed on-the-fly)
  pWAR: number;
}

export interface FieldingLeaderEntry extends PlayerSeasonFielding {
  rank: number;
  fieldingPct: number;
}

export type BattingSortKey = 'avg' | 'obp' | 'slg' | 'ops' | 'hr' | 'rbi' | 'hits' | 'runs' | 'sb' | 'fameNet' | 'bWAR' | 'fWAR' | 'rWAR' | 'totalWAR';
export type PitchingSortKey = 'era' | 'whip' | 'wins' | 'strikeouts' | 'saves' | 'ip' | 'fameNet' | 'pWAR';
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
// WAR CONVERSION FUNCTIONS
// ============================================

/**
 * Convert PlayerSeasonBatting to BattingStatsForWAR
 */
function seasonBattingToWAR(stats: PlayerSeasonBatting): BattingStatsForWAR {
  return {
    pa: stats.pa,
    ab: stats.ab,
    hits: stats.hits,
    singles: stats.singles,
    doubles: stats.doubles,
    triples: stats.triples,
    homeRuns: stats.homeRuns,
    walks: stats.walks,
    intentionalWalks: 0,  // Not tracked in SMB4
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
 */
function seasonPitchingToWAR(stats: PlayerSeasonPitching): PitchingStatsForWAR {
  return {
    ip: stats.outsRecorded / 3,
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
function seasonBattingToBaserunning(stats: PlayerSeasonBatting): BaserunningStats {
  return {
    stolenBases: stats.stolenBases,
    caughtStealing: stats.caughtStealing,
    singles: stats.singles,
    walks: stats.walks,
    hitByPitch: stats.hitByPitch,
    intentionalWalks: 0,
    gidp: stats.gidp,
    gidpOpportunities: Math.round(stats.pa * 0.15),  // Estimate: ~15% of PA
  };
}

/**
 * Get primary position from fielding stats
 */
function getPrimaryPosition(fielding: PlayerSeasonFielding | undefined): Position {
  if (!fielding || !fielding.gamesByPosition) return 'SS';

  let maxGames = 0;
  let primaryPos: Position = 'SS';
  for (const [pos, games] of Object.entries(fielding.gamesByPosition)) {
    if (games > maxGames) {
      maxGames = games;
      primaryPos = pos as Position;
    }
  }
  return primaryPos;
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
 * Convert batting stats to leaderboard entry with derived stats and WAR
 */
function toBattingLeaderEntry(
  stats: PlayerSeasonBatting,
  rank: number,
  seasonGames: number,
  fielding: PlayerSeasonFielding | undefined
): BattingLeaderEntry {
  const derived = calculateBattingDerived(stats);

  // Compute WAR components
  let bWAR = 0;
  let fWAR = 0;
  let rWAR = 0;

  try {
    if (stats.pa > 0) {
      const bwarResult = calculateBWARSimplified(seasonBattingToWAR(stats), seasonGames);
      bWAR = bwarResult.bWAR;
    }
  } catch { /* WAR calc may fail for edge cases — default to 0 */ }

  try {
    if (fielding && fielding.games > 0) {
      const pos = getPrimaryPosition(fielding);
      const fwarResult = calculateFWARFromStats(
        { putouts: fielding.putouts, assists: fielding.assists, errors: fielding.errors, doublePlays: fielding.doublePlays },
        pos,
        fielding.games,
        seasonGames
      );
      fWAR = fwarResult.fWAR;
    }
  } catch { /* fWAR calc may fail — default to 0 */ }

  try {
    if (stats.stolenBases > 0 || stats.caughtStealing > 0 || stats.gidp > 0) {
      const rwarResult = calculateRWARSimplified(seasonBattingToBaserunning(stats), seasonGames);
      rWAR = rwarResult.rWAR;
    }
  } catch { /* rWAR calc may fail — default to 0 */ }

  return {
    ...stats,
    rank,
    avg: derived.avg,
    obp: derived.obp,
    slg: derived.slg,
    ops: derived.ops,
    bWAR,
    fWAR,
    rWAR,
    totalWAR: bWAR + fWAR + rWAR,
  };
}

/**
 * Convert pitching stats to leaderboard entry with derived stats and WAR
 */
function toPitchingLeaderEntry(
  stats: PlayerSeasonPitching,
  rank: number,
  seasonGames: number
): PitchingLeaderEntry {
  const derived = calculatePitchingDerived(stats);

  let pWAR = 0;
  try {
    if (stats.outsRecorded > 0) {
      const pwarResult = calculatePWARSimplified(seasonPitchingToWAR(stats), seasonGames);
      pWAR = pwarResult.pWAR;
    }
  } catch { /* pWAR calc may fail — default to 0 */ }

  return {
    ...stats,
    rank,
    era: derived.era,
    whip: derived.whip,
    ip: formatInningsPitched(stats.outsRecorded),
    pWAR,
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
// SORT HELPERS
// ============================================

function getBattingSortValue(entry: BattingLeaderEntry, sortBy: BattingSortKey): number {
  switch (sortBy) {
    case 'avg': return entry.avg;
    case 'obp': return entry.obp;
    case 'slg': return entry.slg;
    case 'ops': return entry.ops;
    case 'hr': return entry.homeRuns;
    case 'rbi': return entry.rbi;
    case 'hits': return entry.hits;
    case 'runs': return entry.runs;
    case 'sb': return entry.stolenBases;
    case 'fameNet': return entry.fameNet;
    case 'bWAR': return entry.bWAR;
    case 'fWAR': return entry.fWAR;
    case 'rWAR': return entry.rWAR;
    case 'totalWAR': return entry.totalWAR;
    default: return 0;
  }
}

function getPitchingSortValue(entry: PitchingLeaderEntry, sortBy: PitchingSortKey): number {
  switch (sortBy) {
    case 'era': return entry.era;
    case 'whip': return entry.whip;
    case 'wins': return entry.wins;
    case 'strikeouts': return entry.strikeouts;
    case 'saves': return entry.saves;
    case 'ip': return entry.outsRecorded;
    case 'fameNet': return entry.fameNet;
    case 'pWAR': return entry.pWAR;
    default: return 0;
  }
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

  // Fielding lookup by playerId for WAR computation
  const fieldingByPlayer = useMemo(() => {
    const map = new Map<string, PlayerSeasonFielding>();
    for (const f of fieldingStats) {
      map.set(f.playerId, f);
    }
    return map;
  }, [fieldingStats]);

  const seasonGames = seasonMetadata?.totalGames ?? DEFAULT_TOTAL_GAMES;

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
  // Strategy: pre-compute all entries (with WAR), then sort, then slice
  const getBattingLeaders = useCallback((sortBy: BattingSortKey, limit: number = 10): BattingLeaderEntry[] => {
    // Filter out players with insufficient at-bats for rate stats
    const isRateStat = sortBy === 'avg' || sortBy === 'obp' || sortBy === 'slg' || sortBy === 'ops';
    const qualifyingAB = isRateStat ? 10 : 0;

    const qualified = battingStats.filter(s => s.ab >= qualifyingAB);

    // Pre-compute all entries with WAR
    const entries = qualified.map((s, _i) =>
      toBattingLeaderEntry(s, 0, seasonGames, fieldingByPlayer.get(s.playerId))
    );

    // Lower-is-better stats (none for batting currently)
    const sorted = [...entries].sort((a, b) =>
      getBattingSortValue(b, sortBy) - getBattingSortValue(a, sortBy)
    );

    // Re-assign ranks after sort
    return sorted.slice(0, limit).map((entry, i) => ({ ...entry, rank: i + 1 }));
  }, [battingStats, seasonGames, fieldingByPlayer]);

  // Get pitching leaderboard sorted by specified stat
  const getPitchingLeaders = useCallback((sortBy: PitchingSortKey, limit: number = 10): PitchingLeaderEntry[] => {
    // Filter out pitchers with insufficient innings for rate stats
    const qualifyingOuts = sortBy === 'era' || sortBy === 'whip' ? 9 : 0;  // At least 3 IP

    const qualified = pitchingStats.filter(s => s.outsRecorded >= qualifyingOuts);

    // Pre-compute all entries with WAR
    const entries = qualified.map((s, _i) =>
      toPitchingLeaderEntry(s, 0, seasonGames)
    );

    // Lower-is-better stats
    const lowerIsBetter = sortBy === 'era' || sortBy === 'whip';
    const sorted = [...entries].sort((a, b) => {
      const aVal = getPitchingSortValue(a, sortBy);
      const bVal = getPitchingSortValue(b, sortBy);
      return lowerIsBetter ? aVal - bVal : bVal - aVal;
    });

    // Re-assign ranks after sort
    return sorted.slice(0, limit).map((entry, i) => ({ ...entry, rank: i + 1 }));
  }, [pitchingStats, seasonGames]);

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
