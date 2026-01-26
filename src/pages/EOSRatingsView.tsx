/**
 * EOSRatingsView - End of Season Rating Changes
 * Per Ralph Framework S-E004
 *
 * Features:
 * - Players with rating changes listed
 * - Before/After shown with delta
 * - Sortable by change magnitude
 */

import { useState, useMemo } from 'react';

interface RatingChange {
  playerId: string;
  playerName: string;
  teamName: string;
  position: string;
  attribute: string;
  before: number;
  after: number;
}

interface EOSRatingsViewProps {
  changes: RatingChange[];
  onPlayerClick?: (playerId: string) => void;
  onContinue: () => void;
}

type SortField = 'player' | 'attribute' | 'change';
type SortDirection = 'asc' | 'desc';

export default function EOSRatingsView({
  changes,
  onPlayerClick,
  onContinue,
}: EOSRatingsViewProps) {
  const [sortField, setSortField] = useState<SortField>('change');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterType, setFilterType] = useState<'all' | 'positive' | 'negative'>('all');

  const filteredChanges = useMemo(() => {
    let filtered = [...changes];

    if (filterType === 'positive') {
      filtered = filtered.filter((c) => c.after > c.before);
    } else if (filterType === 'negative') {
      filtered = filtered.filter((c) => c.after < c.before);
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'player':
          comparison = a.playerName.localeCompare(b.playerName);
          break;
        case 'attribute':
          comparison = a.attribute.localeCompare(b.attribute);
          break;
        case 'change':
          comparison = Math.abs(b.after - b.before) - Math.abs(a.after - a.before);
          break;
      }
      return sortDirection === 'desc' ? comparison : -comparison;
    });

    return filtered;
  }, [changes, sortField, sortDirection, filterType]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getDelta = (change: RatingChange): number => change.after - change.before;

  const getDeltaColor = (delta: number): string => {
    if (delta > 0) return '#22c55e';
    if (delta < 0) return '#ef4444';
    return '#94a3b8';
  };

  const formatDelta = (delta: number): string => {
    if (delta > 0) return `+${delta}`;
    return delta.toString();
  };

  const improvementCount = changes.filter((c) => c.after > c.before).length;
  const declineCount = changes.filter((c) => c.after < c.before).length;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>End of Season Ratings</h1>
        <p style={styles.subtitle}>Player development and regression</p>
      </div>

      {/* Summary Stats */}
      <div style={styles.summaryRow}>
        <div style={styles.summaryCard}>
          <span style={{ ...styles.summaryValue, color: '#22c55e' }}>
            {improvementCount}
          </span>
          <span style={styles.summaryLabel}>Improvements</span>
        </div>
        <div style={styles.summaryCard}>
          <span style={{ ...styles.summaryValue, color: '#ef4444' }}>
            {declineCount}
          </span>
          <span style={styles.summaryLabel}>Declines</span>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.summaryValue}>{changes.length}</span>
          <span style={styles.summaryLabel}>Total Changes</span>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filterRow}>
        <div style={styles.filterGroup}>
          <button
            style={{
              ...styles.filterButton,
              ...(filterType === 'all' ? styles.filterActive : {}),
            }}
            onClick={() => setFilterType('all')}
          >
            All
          </button>
          <button
            style={{
              ...styles.filterButton,
              ...(filterType === 'positive' ? styles.filterActive : {}),
            }}
            onClick={() => setFilterType('positive')}
          >
            Improved
          </button>
          <button
            style={{
              ...styles.filterButton,
              ...(filterType === 'negative' ? styles.filterActive : {}),
            }}
            onClick={() => setFilterType('negative')}
          >
            Declined
          </button>
        </div>
        <button style={styles.sortButton} onClick={() => handleSort('change')}>
          Sort by Change {sortField === 'change' && (sortDirection === 'desc' ? '↓' : '↑')}
        </button>
      </div>

      {/* Changes List */}
      <div style={styles.changesList}>
        {filteredChanges.map((change, index) => {
          const delta = getDelta(change);
          return (
            <div
              key={`${change.playerId}-${change.attribute}-${index}`}
              style={styles.changeCard}
              onClick={() => onPlayerClick?.(change.playerId)}
            >
              <div style={styles.playerInfo}>
                <span style={styles.playerName}>{change.playerName}</span>
                <span style={styles.teamPosition}>
                  {change.teamName} · {change.position}
                </span>
              </div>
              <div style={styles.attributeInfo}>
                <span style={styles.attributeName}>{change.attribute}</span>
              </div>
              <div style={styles.changeInfo}>
                <span style={styles.beforeAfter}>
                  {change.before} → {change.after}
                </span>
                <span
                  style={{
                    ...styles.delta,
                    color: getDeltaColor(delta),
                  }}
                >
                  {formatDelta(delta)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredChanges.length === 0 && (
        <div style={styles.empty}>No rating changes to display</div>
      )}

      {/* Continue Button */}
      <button style={styles.continueButton} onClick={onContinue}>
        Continue to Retirements
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
    padding: '40px 20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '2rem',
    fontWeight: 900,
    color: '#fff',
  },
  subtitle: {
    margin: 0,
    fontSize: '1rem',
    color: '#94a3b8',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    marginBottom: '32px',
  },
  summaryCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  summaryValue: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#fff',
  },
  summaryLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '4px',
  },
  filterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '700px',
    margin: '0 auto 24px',
  },
  filterGroup: {
    display: 'flex',
    gap: '8px',
  },
  filterButton: {
    padding: '8px 16px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#94a3b8',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  filterActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    color: '#fff',
  },
  sortButton: {
    padding: '8px 16px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#94a3b8',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  changesList: {
    maxWidth: '700px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  changeCard: {
    display: 'grid',
    gridTemplateColumns: '1fr 100px 120px',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    border: '1px solid #334155',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  playerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  playerName: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#fff',
  },
  teamPosition: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  attributeInfo: {
    textAlign: 'center',
  },
  attributeName: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  changeInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '2px',
  },
  beforeAfter: {
    fontSize: '0.875rem',
    color: '#94a3b8',
  },
  delta: {
    fontSize: '1rem',
    fontWeight: 700,
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: '#64748b',
  },
  continueButton: {
    display: 'block',
    margin: '40px auto 0',
    padding: '16px 48px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
};
