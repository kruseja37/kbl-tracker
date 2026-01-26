/**
 * StatsByParkView - Player stats by stadium
 * Per Ralph Framework S-F009
 *
 * Features:
 * - Stats grouped by stadium
 * - Home park highlighted
 * - Sample size shown
 */

import { useState, useMemo } from 'react';

interface StadiumStats {
  stadiumId: string;
  stadiumName: string;
  games: number;
  pa: number;
  avg: number;
  obp: number;
  slg: number;
  hr: number;
  rbi: number;
  runs: number;
}

interface StatsByParkViewProps {
  playerName: string;
  homeStadium: string;
  stadiumStats: StadiumStats[];
  onBack?: () => void;
}

export default function StatsByParkView({
  playerName,
  homeStadium,
  stadiumStats,
  onBack,
}: StatsByParkViewProps) {
  const [sortBy, setSortBy] = useState<'games' | 'avg' | 'hr'>('games');

  const sortedStats = useMemo(() => {
    return [...stadiumStats].sort((a, b) => {
      if (sortBy === 'games') return b.games - a.games;
      if (sortBy === 'avg') return b.avg - a.avg;
      return b.hr - a.hr;
    });
  }, [stadiumStats, sortBy]);

  const formatAvg = (avg: number): string => avg.toFixed(3).replace(/^0/, '');

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        {onBack && (
          <button style={styles.backButton} onClick={onBack}>
            ← Back
          </button>
        )}
        <h1 style={styles.title}>Stats by Stadium</h1>
        <p style={styles.playerName}>{playerName}</p>
      </div>

      {/* Sort Controls */}
      <div style={styles.sortControls}>
        <span style={styles.sortLabel}>Sort by:</span>
        {(['games', 'avg', 'hr'] as const).map((option) => (
          <button
            key={option}
            style={{
              ...styles.sortButton,
              backgroundColor: sortBy === option ? '#3b82f6' : '#334155',
            }}
            onClick={() => setSortBy(option)}
          >
            {option === 'games' ? 'Games' : option === 'avg' ? 'AVG' : 'HR'}
          </button>
        ))}
      </div>

      {/* Stadium Cards */}
      <div style={styles.cardList}>
        {sortedStats.map((stadium) => {
          const isHome = stadium.stadiumName === homeStadium;
          return (
            <div
              key={stadium.stadiumId}
              style={{
                ...styles.card,
                borderColor: isHome ? '#22c55e' : '#334155',
              }}
            >
              {/* Stadium Header */}
              <div style={styles.cardHeader}>
                <div style={styles.stadiumInfo}>
                  <span style={styles.stadiumIcon}>🏟️</span>
                  <span style={styles.stadiumName}>{stadium.stadiumName}</span>
                  {isHome && <span style={styles.homeBadge}>HOME</span>}
                </div>
                <span style={styles.gameCount}>
                  {stadium.games} G ({stadium.pa} PA)
                </span>
              </div>

              {/* Stats Row */}
              <div style={styles.statsRow}>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{formatAvg(stadium.avg)}</span>
                  <span style={styles.statLabel}>AVG</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{formatAvg(stadium.obp)}</span>
                  <span style={styles.statLabel}>OBP</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{formatAvg(stadium.slg)}</span>
                  <span style={styles.statLabel}>SLG</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{stadium.hr}</span>
                  <span style={styles.statLabel}>HR</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{stadium.rbi}</span>
                  <span style={styles.statLabel}>RBI</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{stadium.runs}</span>
                  <span style={styles.statLabel}>R</span>
                </div>
              </div>

              {/* Sample Size Warning */}
              {stadium.games < 10 && (
                <div style={styles.sampleWarning}>
                  ⚠️ Small sample size
                </div>
              )}
            </div>
          );
        })}
      </div>

      {stadiumStats.length === 0 && (
        <div style={styles.empty}>No stadium data available</div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
    padding: '20px',
  },
  header: {
    marginBottom: '24px',
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#94a3b8',
    fontSize: '0.875rem',
    cursor: 'pointer',
    marginBottom: '16px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '1.75rem',
    fontWeight: 900,
    color: '#fff',
  },
  playerName: {
    margin: 0,
    fontSize: '1.125rem',
    color: '#94a3b8',
  },
  sortControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
  },
  sortLabel: {
    fontSize: '0.875rem',
    color: '#64748b',
    marginRight: '8px',
  },
  sortButton: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  cardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxWidth: '600px',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '16px',
    border: '2px solid',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  stadiumInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  stadiumIcon: {
    fontSize: '1.25rem',
  },
  stadiumName: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#fff',
  },
  homeBadge: {
    padding: '2px 8px',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: '4px',
    fontSize: '0.625rem',
    fontWeight: 700,
    color: '#22c55e',
    letterSpacing: '0.05em',
  },
  gameCount: {
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '8px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px',
    backgroundColor: '#0f172a',
    borderRadius: '6px',
  },
  statValue: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  statLabel: {
    fontSize: '0.625rem',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  sampleWarning: {
    marginTop: '12px',
    fontSize: '0.75rem',
    color: '#fbbf24',
    textAlign: 'center',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#64748b',
  },
};
