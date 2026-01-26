/**
 * FranchiseRecords - Franchise record holders
 * Per Ralph Framework S-G004
 *
 * Features:
 * - Season and career categories
 * - Record holder and value shown
 * - Category filter (batting/pitching)
 */

import { useState, useMemo } from 'react';

interface FranchiseRecord {
  recordId: string;
  category: 'BATTING' | 'PITCHING' | 'FIELDING';
  timeframe: 'SEASON' | 'CAREER';
  statName: string;
  statAbbrev: string;
  value: number | string;
  playerId: string;
  playerName: string;
  year?: number; // For season records
  yearsActive?: string; // For career records
  dateSet: number; // timestamp
}

interface FranchiseRecordsProps {
  records: FranchiseRecord[];
  onPlayerClick?: (playerId: string) => void;
  onBack?: () => void;
}

export default function FranchiseRecords({
  records,
  onPlayerClick,
  onBack,
}: FranchiseRecordsProps) {
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'BATTING' | 'PITCHING' | 'FIELDING'>('ALL');
  const [filterTimeframe, setFilterTimeframe] = useState<'ALL' | 'SEASON' | 'CAREER'>('ALL');

  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (filterCategory !== 'ALL') {
      result = result.filter((r) => r.category === filterCategory);
    }

    if (filterTimeframe !== 'ALL') {
      result = result.filter((r) => r.timeframe === filterTimeframe);
    }

    // Sort by category, then timeframe, then stat name
    result.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      if (a.timeframe !== b.timeframe) {
        return a.timeframe === 'SEASON' ? -1 : 1;
      }
      return a.statName.localeCompare(b.statName);
    });

    return result;
  }, [records, filterCategory, filterTimeframe]);

  const groupedRecords = useMemo(() => {
    const groups: Record<string, FranchiseRecord[]> = {};

    for (const record of filteredRecords) {
      const key = `${record.timeframe}_${record.category}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(record);
    }

    return groups;
  }, [filteredRecords]);

  const getGroupTitle = (key: string): string => {
    const [timeframe, category] = key.split('_');
    return `${timeframe === 'SEASON' ? 'Season' : 'Career'} ${category.charAt(0) + category.slice(1).toLowerCase()} Records`;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        {onBack && (
          <button style={styles.backButton} onClick={onBack}>
            ← Back to Museum
          </button>
        )}
        <div style={styles.icon}>📊</div>
        <h1 style={styles.title}>Franchise Records</h1>
        <p style={styles.subtitle}>
          {records.length} record{records.length !== 1 ? 's' : ''} tracked
        </p>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Category:</span>
          {(['ALL', 'BATTING', 'PITCHING', 'FIELDING'] as const).map((cat) => (
            <button
              key={cat}
              style={{
                ...styles.filterButton,
                backgroundColor: filterCategory === cat ? '#3b82f6' : '#334155',
              }}
              onClick={() => setFilterCategory(cat)}
            >
              {cat === 'ALL' ? 'All' : cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Type:</span>
          {(['ALL', 'SEASON', 'CAREER'] as const).map((tf) => (
            <button
              key={tf}
              style={{
                ...styles.filterButton,
                backgroundColor: filterTimeframe === tf ? '#3b82f6' : '#334155',
              }}
              onClick={() => setFilterTimeframe(tf)}
            >
              {tf === 'ALL' ? 'All' : tf.charAt(0) + tf.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Records by Group */}
      <div style={styles.recordsContainer}>
        {Object.entries(groupedRecords).map(([groupKey, groupRecords]) => (
          <div key={groupKey} style={styles.recordGroup}>
            <h2 style={styles.groupTitle}>{getGroupTitle(groupKey)}</h2>
            <div style={styles.recordsList}>
              {groupRecords.map((record) => (
                <div
                  key={record.recordId}
                  style={styles.recordCard}
                  onClick={() => onPlayerClick?.(record.playerId)}
                >
                  <div style={styles.recordInfo}>
                    <span style={styles.statName}>{record.statName}</span>
                    <span style={styles.statAbbrev}>({record.statAbbrev})</span>
                  </div>
                  <div style={styles.recordHolder}>
                    <span style={styles.playerName}>{record.playerName}</span>
                    <span style={styles.recordYear}>
                      {record.year || record.yearsActive}
                    </span>
                  </div>
                  <div style={styles.recordValue}>{record.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredRecords.length === 0 && (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>📊</span>
          <span>No records match your filters</span>
        </div>
      )}
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
  backButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#94a3b8',
    fontSize: '0.875rem',
    cursor: 'pointer',
    marginBottom: '24px',
  },
  icon: {
    fontSize: '3rem',
    marginBottom: '12px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '2rem',
    fontWeight: 900,
    color: '#3b82f6',
  },
  subtitle: {
    margin: 0,
    fontSize: '1rem',
    color: '#94a3b8',
  },
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    justifyContent: 'center',
    marginBottom: '32px',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '0.875rem',
    color: '#64748b',
  },
  filterButton: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  recordsContainer: {
    maxWidth: '800px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  recordGroup: {},
  groupTitle: {
    margin: '0 0 16px 0',
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#fff',
    borderBottom: '1px solid #334155',
    paddingBottom: '8px',
  },
  recordsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  recordCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  recordInfo: {
    flex: 2,
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
  },
  statName: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#fff',
  },
  statAbbrev: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  recordHolder: {
    flex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  playerName: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#3b82f6',
  },
  recordYear: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  recordValue: {
    flex: 1,
    fontSize: '1.25rem',
    fontWeight: 900,
    color: '#22c55e',
    textAlign: 'right',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '60px 20px',
    color: '#64748b',
  },
  emptyIcon: {
    fontSize: '3rem',
  },
};
