/**
 * ProspectList - Detailed prospect list with filtering
 * Per Ralph Framework S-E012
 *
 * Features:
 * - All prospects listed with ratings
 * - Sortable and filterable
 * - Detailed view for evaluation
 */

import { useState, useMemo } from 'react';

interface Prospect {
  prospectId: string;
  playerName: string;
  position: string;
  age: number;
  overall: string;
  potential: string;
  isPitcher: boolean;
  // Batter ratings
  power?: number;
  contact?: number;
  speed?: number;
  fielding?: number;
  arm?: number;
  // Pitcher ratings
  velocity?: number;
  junk?: number;
  accuracy?: number;
  // Additional info
  hometown?: string;
  scoutReport?: string;
}

interface ProspectListProps {
  prospects: Prospect[];
  onProspectClick?: (prospectId: string) => void;
}

type SortField = 'name' | 'overall' | 'potential' | 'age' | 'position';

export default function ProspectList({
  prospects,
  onProspectClick,
}: ProspectListProps) {
  const [sortField, setSortField] = useState<SortField>('overall');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const positions = useMemo(() => {
    const posSet = new Set(prospects.map((p) => p.position));
    return ['all', ...Array.from(posSet).sort()];
  }, [prospects]);

  const filteredAndSorted = useMemo(() => {
    let result = [...prospects];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((p) =>
        p.playerName.toLowerCase().includes(query)
      );
    }

    // Position filter
    if (filterPosition !== 'all') {
      if (filterPosition === 'batters') {
        result = result.filter((p) => !p.isPitcher);
      } else if (filterPosition === 'pitchers') {
        result = result.filter((p) => p.isPitcher);
      } else {
        result = result.filter((p) => p.position === filterPosition);
      }
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.playerName.localeCompare(b.playerName);
          break;
        case 'overall':
          comparison = a.overall.localeCompare(b.overall);
          break;
        case 'potential':
          comparison = a.potential.localeCompare(b.potential);
          break;
        case 'age':
          comparison = a.age - b.age;
          break;
        case 'position':
          comparison = a.position.localeCompare(b.position);
          break;
      }
      return sortAsc ? comparison : -comparison;
    });

    return result;
  }, [prospects, filterPosition, sortField, sortAsc, searchQuery]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getGradeColor = (grade: string): string => {
    if (grade.startsWith('S') || grade.startsWith('A')) return '#22c55e';
    if (grade.startsWith('B')) return '#3b82f6';
    if (grade.startsWith('C')) return '#fbbf24';
    return '#64748b';
  };

  return (
    <div style={styles.container}>
      {/* Controls */}
      <div style={styles.controls}>
        {/* Search */}
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search prospects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* Position Filter */}
        <div style={styles.filterGroup}>
          <select
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Positions</option>
            <option value="batters">Batters Only</option>
            <option value="pitchers">Pitchers Only</option>
            <optgroup label="Specific Position">
              {positions.filter((p) => p !== 'all').map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Sort Headers */}
      <div style={styles.sortHeaders}>
        <button
          style={{ ...styles.sortButton, flex: 2 }}
          onClick={() => handleSort('name')}
        >
          Name {sortField === 'name' && (sortAsc ? '↑' : '↓')}
        </button>
        <button style={styles.sortButton} onClick={() => handleSort('position')}>
          POS {sortField === 'position' && (sortAsc ? '↑' : '↓')}
        </button>
        <button style={styles.sortButton} onClick={() => handleSort('age')}>
          Age {sortField === 'age' && (sortAsc ? '↑' : '↓')}
        </button>
        <button style={styles.sortButton} onClick={() => handleSort('overall')}>
          OVR {sortField === 'overall' && (sortAsc ? '↑' : '↓')}
        </button>
        <button style={styles.sortButton} onClick={() => handleSort('potential')}>
          POT {sortField === 'potential' && (sortAsc ? '↑' : '↓')}
        </button>
        <div style={{ ...styles.sortButton, flex: 2 }}>Ratings</div>
      </div>

      {/* Prospect Count */}
      <div style={styles.resultCount}>
        {filteredAndSorted.length} prospect{filteredAndSorted.length !== 1 ? 's' : ''}
      </div>

      {/* Prospect Cards */}
      <div style={styles.prospectList}>
        {filteredAndSorted.map((prospect) => (
          <div
            key={prospect.prospectId}
            style={styles.prospectRow}
            onClick={() => onProspectClick?.(prospect.prospectId)}
          >
            <div style={{ ...styles.cell, flex: 2 }}>
              <span style={styles.playerName}>{prospect.playerName}</span>
            </div>
            <div style={styles.cell}>
              <span style={styles.position}>{prospect.position}</span>
            </div>
            <div style={styles.cell}>
              <span style={styles.age}>{prospect.age}</span>
            </div>
            <div style={styles.cell}>
              <span
                style={{
                  ...styles.grade,
                  color: getGradeColor(prospect.overall),
                }}
              >
                {prospect.overall}
              </span>
            </div>
            <div style={styles.cell}>
              <span
                style={{
                  ...styles.grade,
                  color: getGradeColor(prospect.potential),
                }}
              >
                {prospect.potential}
              </span>
            </div>
            <div style={{ ...styles.cell, flex: 2 }}>
              <div style={styles.ratingsContainer}>
                {prospect.isPitcher ? (
                  <>
                    <span style={styles.rating}>VEL: {prospect.velocity}</span>
                    <span style={styles.rating}>JNK: {prospect.junk}</span>
                    <span style={styles.rating}>ACC: {prospect.accuracy}</span>
                  </>
                ) : (
                  <>
                    <span style={styles.rating}>POW: {prospect.power}</span>
                    <span style={styles.rating}>CON: {prospect.contact}</span>
                    <span style={styles.rating}>SPD: {prospect.speed}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAndSorted.length === 0 && (
        <div style={styles.empty}>No prospects match your filters</div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #334155',
  },
  controls: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  searchContainer: {
    flex: 1,
    minWidth: '200px',
  },
  searchInput: {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '0.875rem',
    outline: 'none',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterSelect: {
    padding: '10px 14px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  sortHeaders: {
    display: 'flex',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  sortButton: {
    flex: 1,
    padding: '6px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#64748b',
    fontSize: '0.6875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    cursor: 'pointer',
    textAlign: 'center',
  },
  resultCount: {
    fontSize: '0.8125rem',
    color: '#64748b',
    marginBottom: '12px',
  },
  prospectList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '500px',
    overflowY: 'auto',
  },
  prospectRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  cell: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerName: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#fff',
  },
  position: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#3b82f6',
    padding: '2px 8px',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: '4px',
  },
  age: {
    fontSize: '0.875rem',
    color: '#94a3b8',
  },
  grade: {
    fontSize: '0.9375rem',
    fontWeight: 700,
  },
  ratingsContainer: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  rating: {
    fontSize: '0.6875rem',
    color: '#94a3b8',
    padding: '2px 6px',
    backgroundColor: '#1e293b',
    borderRadius: '4px',
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: '#64748b',
  },
};
