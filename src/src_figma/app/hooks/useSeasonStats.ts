/**
 * useSeasonStats Hook
 *
 * MAJ-01: Load real season stats from IndexedDB for TeamHub display.
 * Combines batting, pitching, and fielding stats into unified player rows
 * matching the format expected by TeamHubContent.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  type PlayerSeasonBatting,
  type PlayerSeasonPitching,
  type PlayerSeasonFielding,
  getSeasonBattingStats,
  getSeasonPitchingStats,
  getAllFieldingStats,
  getActiveSeason,
  calcBattingAvg,
  calcOPS,
  calcERA,
  formatIP,
} from '../../../utils/seasonStorage';

// ============================================
// TYPES
// ============================================

/**
 * Unified player stats row matching TeamHubContent's expected format.
 */
export interface PlayerStatsRow {
  playerId: string;
  name: string;
  pos: string;

  // WAR
  war: number;
  pwar: number;
  bwar: number;
  rwar: number;
  fwar: number;

  // Batting stats (position players)
  avg?: number;
  hr?: number;
  rbi?: number;
  sb?: number;
  ops?: number;

  // Pitching stats
  era?: number;
  ip?: number;
  k?: number;
  w?: number;
  l?: number;
  sv?: number;
}

export interface UseSeasonStatsReturn {
  playerStats: PlayerStatsRow[];
  isLoading: boolean;
  hasRealData: boolean;
  seasonId: string | null;
}

// ============================================
// HOOK
// ============================================

export function useSeasonStats(): UseSeasonStatsReturn {
  const [batting, setBatting] = useState<PlayerSeasonBatting[]>([]);
  const [pitching, setPitching] = useState<PlayerSeasonPitching[]>([]);
  const [fielding, setFielding] = useState<PlayerSeasonFielding[]>([]);
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load season data from IndexedDB
  useEffect(() => {
    async function loadData() {
      try {
        // Try to find active season, fall back to default
        const activeSeason = await getActiveSeason();
        const sid = activeSeason?.seasonId || 'season-2024';
        setSeasonId(sid);

        const [battingData, pitchingData, fieldingData] = await Promise.all([
          getSeasonBattingStats(sid),
          getSeasonPitchingStats(sid),
          getAllFieldingStats(sid),
        ]);

        setBatting(battingData);
        setPitching(pitchingData);
        setFielding(fieldingData);
      } catch (err) {
        console.warn('[useSeasonStats] Failed to load season data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Build unified player stats
  const playerStats = useMemo((): PlayerStatsRow[] => {
    if (batting.length === 0 && pitching.length === 0) return [];

    const rows: PlayerStatsRow[] = [];
    const processedIds = new Set<string>();

    // Process batters
    for (const b of batting) {
      if (b.pa === 0) continue;

      // Extract abbreviated name (J. Rodriguez format)
      const nameParts = b.playerName.split(' ');
      const abbrevName = nameParts.length > 1
        ? `${nameParts[0][0]}. ${nameParts.slice(1).join(' ')}`
        : b.playerName;

      // Determine position from playerId (e.g., "away-john-smith")
      // Default to batting position if we can infer
      const pos = 'POS'; // Will be overridden by fielding data

      rows.push({
        playerId: b.playerId,
        name: abbrevName,
        pos,
        war: b.totalWar ?? 0,
        pwar: 0,
        bwar: b.bwar ?? 0,
        rwar: b.rwar ?? 0,
        fwar: b.fwar ?? 0,
        avg: calcBattingAvg(b),
        hr: b.homeRuns,
        rbi: b.rbi,
        sb: b.stolenBases,
        ops: calcOPS(b),
      });
      processedIds.add(b.playerId);
    }

    // Process pitchers
    for (const p of pitching) {
      if (p.outsRecorded === 0) continue;

      const nameParts = p.playerName.split(' ');
      const abbrevName = nameParts.length > 1
        ? `${nameParts[0][0]}. ${nameParts.slice(1).join(' ')}`
        : p.playerName;

      // Check if this pitcher already has a batter row
      const existingRow = rows.find(r => r.playerId === p.playerId);
      if (existingRow) {
        // Merge pitching data into existing row
        existingRow.pwar = p.pwar ?? 0;
        existingRow.war = (existingRow.bwar + existingRow.rwar + existingRow.fwar + existingRow.pwar);
        existingRow.era = calcERA(p);
        existingRow.ip = p.outsRecorded / 3;
        existingRow.k = p.strikeouts;
        existingRow.w = p.wins;
        existingRow.l = p.losses;
        existingRow.sv = p.saves;
        existingRow.pos = p.gamesStarted > 0 ? 'SP' : 'RP';
      } else {
        rows.push({
          playerId: p.playerId,
          name: abbrevName,
          pos: p.gamesStarted > 0 ? 'SP' : 'RP',
          war: p.pwar ?? 0,
          pwar: p.pwar ?? 0,
          bwar: 0,
          rwar: 0,
          fwar: 0,
          era: calcERA(p),
          ip: p.outsRecorded / 3,
          k: p.strikeouts,
          w: p.wins,
          l: p.losses,
          sv: p.saves,
        });
        processedIds.add(p.playerId);
      }
    }

    // Update positions from fielding data where possible
    for (const f of fielding) {
      const row = rows.find(r => r.playerId === f.playerId);
      if (row && row.pos === 'POS') {
        // Find most-played position
        const positions = Object.entries(f.gamesByPosition);
        if (positions.length > 0) {
          positions.sort((a, b) => b[1] - a[1]);
          row.pos = positions[0][0];
        }
      }
    }

    // Sort by total WAR descending
    rows.sort((a, b) => b.war - a.war);

    return rows;
  }, [batting, pitching, fielding]);

  return {
    playerStats,
    isLoading,
    hasRealData: playerStats.length > 0,
    seasonId,
  };
}

export default useSeasonStats;
