/**
 * Season Leaderboards Component
 * Per IMPLEMENTATION_PLAN.md v3 - Day 7: Leaderboards Dashboard
 *
 * Multiple leaderboard views for season stats.
 */

import React, { useState } from 'react';
import {
  useSeasonStats,
  type BattingLeaderEntry,
  type PitchingLeaderEntry,
  type BattingSortKey,
  type PitchingSortKey,
} from '../../hooks/useSeasonStats';

// ============================================
// TYPES
// ============================================

interface LeaderboardProps {
  onPlayerClick?: (playerId: string, playerName: string, teamId: string) => void;
}

// ============================================
// BATTING LEADERBOARD
// ============================================

interface BattingLeaderboardProps extends LeaderboardProps {
  sortBy?: BattingSortKey;
  limit?: number;
  title?: string;
}

export function SeasonBattingLeaderboard({
  sortBy = 'ops',
  limit = 10,
  title,
  onPlayerClick,
}: BattingLeaderboardProps) {
  const { getBattingLeaders, isLoading, error, refresh } = useSeasonStats();

  const data = getBattingLeaders(sortBy, limit);

  const titleMap: Record<BattingSortKey, string> = {
    ops: 'OPS Leaders',
    avg: 'Batting Average Leaders',
    obp: 'OBP Leaders',
    slg: 'Slugging Leaders',
    hr: 'Home Run Leaders',
    rbi: 'RBI Leaders',
    hits: 'Hits Leaders',
    runs: 'Runs Leaders',
    sb: 'Stolen Base Leaders',
    fameNet: 'Fame Leaders (Batting)',
  };

  const displayTitle = title || titleMap[sortBy];

  if (isLoading) {
    return (
      <div style={styles.loading}>Loading season stats...</div>
    );
  }

  if (error) {
    return (
      <div style={styles.error}>
        Error: {error}
        <button onClick={refresh} style={styles.retryButton}>Retry</button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={styles.empty}>No batting data yet. Play some games!</div>
    );
  }

  return (
    <div style={styles.leaderboard}>
      <div style={styles.header}>
        <span>{displayTitle}</span>
        <button onClick={refresh} style={styles.refreshButton} title="Refresh">↻</button>
      </div>

      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            <th style={styles.rankCell}>#</th>
            <th style={styles.nameCell}>Player</th>
            <th style={styles.statCell}>{getStatHeader(sortBy)}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((player, idx) => (
            <tr
              key={player.playerId}
              style={styles.dataRow}
              onClick={() => onPlayerClick?.(player.playerId, player.playerName, player.teamId)}
            >
              <td style={styles.rankCell}>{idx + 1}</td>
              <td style={styles.nameCell}>
                <span style={styles.playerName}>{player.playerName}</span>
                <span style={styles.teamName}>{player.teamId}</span>
              </td>
              <td style={styles.statCell}>
                <span style={styles.statValue}>{formatBattingStat(sortBy, player)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// PITCHING LEADERBOARD
// ============================================

interface PitchingLeaderboardProps extends LeaderboardProps {
  sortBy?: PitchingSortKey;
  limit?: number;
  title?: string;
}

export function SeasonPitchingLeaderboard({
  sortBy = 'era',
  limit = 10,
  title,
  onPlayerClick,
}: PitchingLeaderboardProps) {
  const { getPitchingLeaders, isLoading, error, refresh } = useSeasonStats();

  const data = getPitchingLeaders(sortBy, limit);

  const titleMap: Record<PitchingSortKey, string> = {
    era: 'ERA Leaders',
    whip: 'WHIP Leaders',
    wins: 'Wins Leaders',
    strikeouts: 'Strikeout Leaders',
    saves: 'Saves Leaders',
    ip: 'Innings Pitched Leaders',
    fameNet: 'Fame Leaders (Pitching)',
  };

  const displayTitle = title || titleMap[sortBy];

  if (isLoading) {
    return (
      <div style={styles.loading}>Loading season stats...</div>
    );
  }

  if (error) {
    return (
      <div style={styles.error}>
        Error: {error}
        <button onClick={refresh} style={styles.retryButton}>Retry</button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={styles.empty}>No pitching data yet. Play some games!</div>
    );
  }

  return (
    <div style={styles.leaderboard}>
      <div style={styles.header}>
        <span>{displayTitle}</span>
        <button onClick={refresh} style={styles.refreshButton} title="Refresh">↻</button>
      </div>

      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            <th style={styles.rankCell}>#</th>
            <th style={styles.nameCell}>Player</th>
            <th style={styles.statCell}>{getPitchingStatHeader(sortBy)}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((player, idx) => (
            <tr
              key={player.playerId}
              style={styles.dataRow}
              onClick={() => onPlayerClick?.(player.playerId, player.playerName, player.teamId)}
            >
              <td style={styles.rankCell}>{idx + 1}</td>
              <td style={styles.nameCell}>
                <span style={styles.playerName}>{player.playerName}</span>
                <span style={styles.teamName}>{player.teamId}</span>
              </td>
              <td style={styles.statCell}>
                <span style={styles.statValue}>{formatPitchingStat(sortBy, player)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// COMBINED LEADERBOARDS PANEL
// ============================================

type LeaderboardTab = 'batting' | 'pitching';

interface SeasonLeaderboardsPanelProps extends LeaderboardProps {
  defaultTab?: LeaderboardTab;
}

export function SeasonLeaderboardsPanel({
  defaultTab = 'batting',
  onPlayerClick,
}: SeasonLeaderboardsPanelProps) {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>(defaultTab);
  const [battingSort, setBattingSort] = useState<BattingSortKey>('ops');
  const [pitchingSort, setPitchingSort] = useState<PitchingSortKey>('era');
  const { battingLeaders, pitchingLeaders, isLoading } = useSeasonStats();

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: '4px 4px 0 0',
    backgroundColor: isActive ? '#1f2937' : 'transparent',
    color: isActive ? '#f3f4f6' : '#6b7280',
    border: 'none',
    borderBottom: isActive ? '2px solid #f59e0b' : '2px solid transparent',
    cursor: 'pointer',
    fontWeight: isActive ? 600 : 400,
  });

  const sortButtonStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: isActive ? '#374151' : 'transparent',
    color: isActive ? '#f3f4f6' : '#6b7280',
    border: '1px solid #374151',
    cursor: 'pointer',
    fontSize: '0.75rem',
  });

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '-1px' }}>
        <button style={tabStyle(activeTab === 'batting')} onClick={() => setActiveTab('batting')}>
          Season Batting
          {!isLoading && (
            <span style={{ marginLeft: '8px', fontSize: '0.75rem', opacity: 0.7 }}>
              ({battingLeaders.length})
            </span>
          )}
        </button>
        <button style={tabStyle(activeTab === 'pitching')} onClick={() => setActiveTab('pitching')}>
          Season Pitching
          {!isLoading && (
            <span style={{ marginLeft: '8px', fontSize: '0.75rem', opacity: 0.7 }}>
              ({pitchingLeaders.length})
            </span>
          )}
        </button>
      </div>

      {/* Sort Options */}
      <div style={styles.sortBar}>
        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Sort by:</span>
        {activeTab === 'batting' ? (
          <>
            <button style={sortButtonStyle(battingSort === 'ops')} onClick={() => setBattingSort('ops')}>OPS</button>
            <button style={sortButtonStyle(battingSort === 'avg')} onClick={() => setBattingSort('avg')}>AVG</button>
            <button style={sortButtonStyle(battingSort === 'hr')} onClick={() => setBattingSort('hr')}>HR</button>
            <button style={sortButtonStyle(battingSort === 'rbi')} onClick={() => setBattingSort('rbi')}>RBI</button>
            <button style={sortButtonStyle(battingSort === 'sb')} onClick={() => setBattingSort('sb')}>SB</button>
            <button style={sortButtonStyle(battingSort === 'fameNet')} onClick={() => setBattingSort('fameNet')}>Fame</button>
          </>
        ) : (
          <>
            <button style={sortButtonStyle(pitchingSort === 'era')} onClick={() => setPitchingSort('era')}>ERA</button>
            <button style={sortButtonStyle(pitchingSort === 'whip')} onClick={() => setPitchingSort('whip')}>WHIP</button>
            <button style={sortButtonStyle(pitchingSort === 'wins')} onClick={() => setPitchingSort('wins')}>W</button>
            <button style={sortButtonStyle(pitchingSort === 'strikeouts')} onClick={() => setPitchingSort('strikeouts')}>K</button>
            <button style={sortButtonStyle(pitchingSort === 'saves')} onClick={() => setPitchingSort('saves')}>SV</button>
            <button style={sortButtonStyle(pitchingSort === 'fameNet')} onClick={() => setPitchingSort('fameNet')}>Fame</button>
          </>
        )}
      </div>

      {/* Content */}
      {activeTab === 'batting' ? (
        <SeasonBattingLeaderboard sortBy={battingSort} limit={10} onPlayerClick={onPlayerClick} />
      ) : (
        <SeasonPitchingLeaderboard sortBy={pitchingSort} limit={10} onPlayerClick={onPlayerClick} />
      )}
    </div>
  );
}

// ============================================
// HELPERS
// ============================================

function getStatHeader(sortBy: BattingSortKey): string {
  const headers: Record<BattingSortKey, string> = {
    ops: 'OPS',
    avg: 'AVG',
    obp: 'OBP',
    slg: 'SLG',
    hr: 'HR',
    rbi: 'RBI',
    hits: 'H',
    runs: 'R',
    sb: 'SB',
    fameNet: 'Fame',
  };
  return headers[sortBy];
}

function getPitchingStatHeader(sortBy: PitchingSortKey): string {
  const headers: Record<PitchingSortKey, string> = {
    era: 'ERA',
    whip: 'WHIP',
    wins: 'W',
    strikeouts: 'K',
    saves: 'SV',
    ip: 'IP',
    fameNet: 'Fame',
  };
  return headers[sortBy];
}

function formatBattingStat(sortBy: BattingSortKey, player: BattingLeaderEntry): string {
  switch (sortBy) {
    case 'avg':
      return player.avg.toFixed(3).replace(/^0/, '');
    case 'obp':
      return player.obp.toFixed(3).replace(/^0/, '');
    case 'slg':
      return player.slg.toFixed(3).replace(/^0/, '');
    case 'ops':
      return player.ops.toFixed(3);
    case 'hr':
      return player.homeRuns.toString();
    case 'rbi':
      return player.rbi.toString();
    case 'hits':
      return player.hits.toString();
    case 'runs':
      return player.runs.toString();
    case 'sb':
      return player.stolenBases.toString();
    case 'fameNet':
      return player.fameNet > 0 ? `+${player.fameNet}` : player.fameNet.toString();
    default:
      return '';
  }
}

function formatPitchingStat(sortBy: PitchingSortKey, player: PitchingLeaderEntry): string {
  switch (sortBy) {
    case 'era':
      return player.era.toFixed(2);
    case 'whip':
      return player.whip.toFixed(2);
    case 'wins':
      return player.wins.toString();
    case 'strikeouts':
      return player.strikeouts.toString();
    case 'saves':
      return player.saves.toString();
    case 'ip':
      return player.ip;
    case 'fameNet':
      return player.fameNet > 0 ? `+${player.fameNet}` : player.fameNet.toString();
    default:
      return '';
  }
}

// ============================================
// STYLES
// ============================================

const styles: Record<string, React.CSSProperties> = {
  leaderboard: {
    borderRadius: '8px',
    backgroundColor: '#1f2937',
    border: '1px solid #374151',
    overflow: 'hidden',
  },
  loading: {
    padding: '16px',
    borderRadius: '8px',
    backgroundColor: '#1f2937',
    color: '#9ca3af',
    textAlign: 'center',
  },
  error: {
    padding: '16px',
    borderRadius: '8px',
    backgroundColor: '#1f2937',
    color: '#ef4444',
  },
  empty: {
    padding: '16px',
    borderRadius: '8px',
    backgroundColor: '#1f2937',
    color: '#6b7280',
    textAlign: 'center',
  },
  header: {
    padding: '12px 16px',
    backgroundColor: '#111827',
    borderBottom: '1px solid #374151',
    fontWeight: 600,
    color: '#f3f4f6',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refreshButton: {
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: '#374151',
    color: '#9ca3af',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  retryButton: {
    marginLeft: '8px',
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: '#374151',
    color: '#f3f4f6',
    border: 'none',
    cursor: 'pointer',
  },
  sortBar: {
    padding: '8px 12px',
    backgroundColor: '#1f2937',
    borderBottom: '1px solid #374151',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  headerRow: {
    color: '#9ca3af',
    fontSize: '0.75rem',
    textAlign: 'left',
  },
  dataRow: {
    borderTop: '1px solid #374151',
    color: '#d1d5db',
    cursor: 'pointer',
  },
  rankCell: {
    padding: '10px 16px',
    color: '#6b7280',
    fontSize: '0.85rem',
    width: '40px',
  },
  nameCell: {
    padding: '10px 8px',
  },
  playerName: {
    fontWeight: 500,
    display: 'block',
  },
  teamName: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  statCell: {
    padding: '10px 16px',
    textAlign: 'right',
  },
  statValue: {
    fontWeight: 700,
    color: '#f59e0b',
  },
};

// ============================================
// EXPORTS
// ============================================

export default SeasonLeaderboardsPanel;
