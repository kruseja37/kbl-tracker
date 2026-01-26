/**
 * Season Summary Component
 * Per IMPLEMENTATION_PLAN.md v3 - Day 8: Season Summary View
 *
 * End-of-season report showing:
 * - Season metadata (games played, etc.)
 * - Batting leaders (top 5)
 * - Pitching leaders (top 5)
 * - WAR leaders (top 5 position, top 5 pitchers)
 * - Fame leaders
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSeasonStats, type BattingLeaderEntry, type PitchingLeaderEntry } from '../../hooks/useSeasonStats';
import { useWARCalculations, formatWAR, getWARColor, type PlayerBWAR, type PlayerPWAR } from '../../hooks/useWARCalculations';
import { getSeasonMetadata, type SeasonMetadata } from '../../utils/seasonStorage';
import { useFanMorale } from '../../hooks/useFanMorale';
import { FanMoraleSection, FanMoraleBar } from './FanMoraleDisplay';
import { NarrativePreview } from './NarrativeDisplay';

// ============================================
// TYPES
// ============================================

interface SeasonSummaryProps {
  seasonId?: string;
  onPlayerClick?: (playerId: string, playerName: string, teamId: string) => void;
}

// ============================================
// MINI LEADERBOARD COMPONENT
// ============================================

interface MiniLeaderboardProps {
  title: string;
  data: Array<{
    rank: number;
    playerName: string;
    teamId: string;
    playerId: string;
    value: string;
  }>;
  onPlayerClick?: (playerId: string, playerName: string, teamId: string) => void;
  valueColor?: string;
}

function MiniLeaderboard({ title, data, onPlayerClick, valueColor = '#f59e0b' }: MiniLeaderboardProps) {
  if (data.length === 0) {
    return (
      <div style={styles.miniLeaderboard}>
        <div style={styles.miniTitle}>{title}</div>
        <div style={styles.noData}>No data</div>
      </div>
    );
  }

  return (
    <div style={styles.miniLeaderboard}>
      <div style={styles.miniTitle}>{title}</div>
      <div style={styles.miniList}>
        {data.map((item) => (
          <div
            key={item.playerId}
            style={styles.miniRow}
            onClick={() => onPlayerClick?.(item.playerId, item.playerName, item.teamId)}
          >
            <span style={styles.miniRank}>{item.rank}</span>
            <span style={styles.miniName}>{item.playerName}</span>
            <span style={{ ...styles.miniValue, color: valueColor }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// SEASON SUMMARY COMPONENT
// ============================================

export function SeasonSummary({ seasonId = 'season-2026', onPlayerClick }: SeasonSummaryProps) {
  const [metadata, setMetadata] = useState<SeasonMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { getBattingLeaders, getPitchingLeaders, refresh: refreshStats } = useSeasonStats(seasonId);
  const { leaderboards: warLeaderboards, refresh: refreshWAR } = useWARCalculations();
  const { currentMorale, state, trend, trendStreak, riskLevel } = useFanMorale();

  // Load season metadata
  useEffect(() => {
    async function loadMetadata() {
      setIsLoading(true);
      try {
        const data = await getSeasonMetadata(seasonId);
        setMetadata(data);
      } catch (err) {
        console.error('[SeasonSummary] Failed to load metadata:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadMetadata();
  }, [seasonId]);

  const refresh = useCallback(() => {
    refreshStats();
    refreshWAR();
  }, [refreshStats, refreshWAR]);

  // Get top 5 for each category
  const battingAvg = getBattingLeaders('avg', 5);
  const battingHR = getBattingLeaders('hr', 5);
  const battingRBI = getBattingLeaders('rbi', 5);
  const battingOPS = getBattingLeaders('ops', 5);
  const battingFame = getBattingLeaders('fameNet', 5);

  const pitchingERA = getPitchingLeaders('era', 5);
  const pitchingWins = getPitchingLeaders('wins', 5);
  const pitchingK = getPitchingLeaders('strikeouts', 5);
  const pitchingSaves = getPitchingLeaders('saves', 5);
  const pitchingFame = getPitchingLeaders('fameNet', 5);

  // WAR leaders
  const battingWAR = warLeaderboards.battingWAR.slice(0, 5);
  const pitchingWAR = warLeaderboards.pitchingWAR.slice(0, 5);

  // Format helpers
  const formatBattingEntry = (entry: BattingLeaderEntry, stat: 'avg' | 'hr' | 'rbi' | 'ops' | 'fame') => ({
    rank: entry.rank,
    playerName: entry.playerName,
    teamId: entry.teamId,
    playerId: entry.playerId,
    value: stat === 'avg' ? entry.avg.toFixed(3).replace(/^0/, '') :
           stat === 'ops' ? entry.ops.toFixed(3) :
           stat === 'hr' ? entry.homeRuns.toString() :
           stat === 'rbi' ? entry.rbi.toString() :
           entry.fameNet > 0 ? `+${entry.fameNet}` : entry.fameNet.toString(),
  });

  const formatPitchingEntry = (entry: PitchingLeaderEntry, stat: 'era' | 'wins' | 'k' | 'saves' | 'fame') => ({
    rank: entry.rank,
    playerName: entry.playerName,
    teamId: entry.teamId,
    playerId: entry.playerId,
    value: stat === 'era' ? entry.era.toFixed(2) :
           stat === 'wins' ? entry.wins.toString() :
           stat === 'k' ? entry.strikeouts.toString() :
           stat === 'saves' ? entry.saves.toString() :
           entry.fameNet > 0 ? `+${entry.fameNet}` : entry.fameNet.toString(),
  });

  const formatWAREntry = (entry: PlayerBWAR | PlayerPWAR, rank: number, type: 'batting' | 'pitching') => ({
    rank,
    playerName: entry.playerName,
    teamId: entry.teamId,
    playerId: entry.playerId,
    value: formatWAR(type === 'batting' ? (entry as PlayerBWAR).bWAR : (entry as PlayerPWAR).pWAR),
  });

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading season summary...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.title}>{metadata?.seasonName || 'Season Summary'}</div>
          <div style={styles.subtitle}>
            {metadata ? `${metadata.gamesPlayed} / ${metadata.totalGames} games played` : 'Loading...'}
          </div>
        </div>
        <button onClick={refresh} style={styles.refreshButton} title="Refresh">↻</button>
      </div>

      {/* Fan Morale Section */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Fan Morale</div>
        <FanMoraleSection
          morale={currentMorale}
          trend={trend}
          trendStreak={trendStreak}
        />
        <div style={{ marginTop: '8px' }}>
          <FanMoraleBar morale={currentMorale} showLabels={true} />
        </div>
      </div>

      {/* Beat Reporter Section */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Media Coverage</div>
        <NarrativePreview
          teamName={metadata?.seasonName?.replace('Season ', 'Team ') || 'Your Team'}
          gameResult={{
            won: true,
            score: { team: 5, opponent: 3 },
            opponentName: 'Opponents',
          }}
        />
      </div>

      {/* Batting Leaders Section */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Batting Leaders</div>
        <div style={styles.leaderboardGrid}>
          <MiniLeaderboard
            title="AVG"
            data={battingAvg.map(e => formatBattingEntry(e, 'avg'))}
            onPlayerClick={onPlayerClick}
          />
          <MiniLeaderboard
            title="HR"
            data={battingHR.map(e => formatBattingEntry(e, 'hr'))}
            onPlayerClick={onPlayerClick}
          />
          <MiniLeaderboard
            title="RBI"
            data={battingRBI.map(e => formatBattingEntry(e, 'rbi'))}
            onPlayerClick={onPlayerClick}
          />
          <MiniLeaderboard
            title="OPS"
            data={battingOPS.map(e => formatBattingEntry(e, 'ops'))}
            onPlayerClick={onPlayerClick}
          />
        </div>
      </div>

      {/* Pitching Leaders Section */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Pitching Leaders</div>
        <div style={styles.leaderboardGrid}>
          <MiniLeaderboard
            title="ERA"
            data={pitchingERA.map(e => formatPitchingEntry(e, 'era'))}
            onPlayerClick={onPlayerClick}
            valueColor="#10b981"
          />
          <MiniLeaderboard
            title="Wins"
            data={pitchingWins.map(e => formatPitchingEntry(e, 'wins'))}
            onPlayerClick={onPlayerClick}
          />
          <MiniLeaderboard
            title="K"
            data={pitchingK.map(e => formatPitchingEntry(e, 'k'))}
            onPlayerClick={onPlayerClick}
          />
          <MiniLeaderboard
            title="Saves"
            data={pitchingSaves.map(e => formatPitchingEntry(e, 'saves'))}
            onPlayerClick={onPlayerClick}
          />
        </div>
      </div>

      {/* WAR Leaders Section */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>WAR Leaders</div>
        <div style={styles.leaderboardGrid}>
          <MiniLeaderboard
            title="Position Player WAR"
            data={battingWAR.map((e, i) => formatWAREntry(e, i + 1, 'batting'))}
            onPlayerClick={onPlayerClick}
            valueColor="#3b82f6"
          />
          <MiniLeaderboard
            title="Pitcher WAR"
            data={pitchingWAR.map((e, i) => formatWAREntry(e, i + 1, 'pitching'))}
            onPlayerClick={onPlayerClick}
            valueColor="#8b5cf6"
          />
        </div>
      </div>

      {/* Fame Leaders Section */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Fame Leaders</div>
        <div style={styles.leaderboardGrid}>
          <MiniLeaderboard
            title="Batting Fame"
            data={battingFame.map(e => formatBattingEntry(e, 'fame'))}
            onPlayerClick={onPlayerClick}
            valueColor="#10b981"
          />
          <MiniLeaderboard
            title="Pitching Fame"
            data={pitchingFame.map(e => formatPitchingEntry(e, 'fame'))}
            onPlayerClick={onPlayerClick}
            valueColor="#10b981"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// SEASON SUMMARY MODAL
// ============================================

interface SeasonSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  seasonId?: string;
  onPlayerClick?: (playerId: string, playerName: string, teamId: string) => void;
}

export function SeasonSummaryModal({ isOpen, onClose, seasonId, onPlayerClick }: SeasonSummaryModalProps) {
  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeButton}>X</button>
        <SeasonSummary seasonId={seasonId} onPlayerClick={onPlayerClick} />
      </div>
    </div>
  );
}

// ============================================
// STYLES
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1f2937',
    borderRadius: '12px',
    border: '1px solid #374151',
    padding: '16px',
    color: '#f3f4f6',
  },
  loading: {
    textAlign: 'center',
    color: '#9ca3af',
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    borderBottom: '1px solid #374151',
    paddingBottom: '12px',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#9ca3af',
    marginTop: '4px',
  },
  refreshButton: {
    padding: '8px 12px',
    borderRadius: '6px',
    backgroundColor: '#374151',
    color: '#9ca3af',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '12px',
    borderBottom: '1px solid #374151',
    paddingBottom: '8px',
  },
  leaderboardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
  },
  miniLeaderboard: {
    backgroundColor: '#111827',
    borderRadius: '8px',
    padding: '12px',
  },
  miniTitle: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: '8px',
    textTransform: 'uppercase',
  },
  miniList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  miniRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  miniRank: {
    color: '#6b7280',
    width: '16px',
    flexShrink: 0,
  },
  miniName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  miniValue: {
    fontWeight: 600,
    flexShrink: 0,
  },
  noData: {
    color: '#6b7280',
    fontSize: '0.75rem',
    fontStyle: 'italic',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    maxHeight: '90vh',
    maxWidth: '800px',
    width: '100%',
    overflow: 'auto',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: '1.25rem',
    cursor: 'pointer',
    padding: '4px 8px',
    zIndex: 10,
  },
};

// ============================================
// EXPORTS
// ============================================

export default SeasonSummary;
