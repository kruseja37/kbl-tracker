/**
 * FreeAgencyHub - Free agency management
 * Per Ralph Framework S-E007
 *
 * Features:
 * - FA pool displayed with key stats
 * - Cap space shown
 * - Round indicator
 */

import { useState, useMemo } from 'react';

interface FreeAgent {
  playerId: string;
  playerName: string;
  position: string;
  age: number;
  overall: string;
  salary: number;
  isPitcher: boolean;
  // Batter stats
  power?: number;
  contact?: number;
  speed?: number;
  // Pitcher stats
  velocity?: number;
  junk?: number;
  accuracy?: number;
  // Performance
  lastSeasonWAR: number;
}

interface FreeAgencyHubProps {
  freeAgents: FreeAgent[];
  currentRound: number;
  totalRounds: number;
  capSpace: number;
  onSignPlayer: (playerId: string) => void;
  onContinue: () => void;
}

type SortField = 'name' | 'overall' | 'salary' | 'war';

export default function FreeAgencyHub({
  freeAgents,
  currentRound,
  totalRounds,
  capSpace,
  onSignPlayer,
  onContinue,
}: FreeAgencyHubProps) {
  const [sortField, setSortField] = useState<SortField>('war');
  const [filterPosition, setFilterPosition] = useState<string>('all');

  const positions = useMemo(() => {
    const posSet = new Set(freeAgents.map((fa) => fa.position));
    return ['all', ...Array.from(posSet).sort()];
  }, [freeAgents]);

  const sortedAgents = useMemo(() => {
    let filtered = [...freeAgents];

    if (filterPosition !== 'all') {
      filtered = filtered.filter((fa) => fa.position === filterPosition);
    }

    filtered.sort((a, b) => {
      switch (sortField) {
        case 'name':
          return a.playerName.localeCompare(b.playerName);
        case 'overall':
          return b.overall.localeCompare(a.overall);
        case 'salary':
          return b.salary - a.salary;
        case 'war':
          return b.lastSeasonWAR - a.lastSeasonWAR;
        default:
          return 0;
      }
    });

    return filtered;
  }, [freeAgents, filterPosition, sortField]);

  const formatSalary = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  const canAfford = (salary: number): boolean => salary <= capSpace;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Free Agency</h1>
        <div style={styles.roundIndicator}>
          Round {currentRound}/{totalRounds}
        </div>
      </div>

      {/* Cap Space */}
      <div style={styles.capSpaceCard}>
        <div style={styles.capSpaceLabel}>Available Cap Space</div>
        <div style={styles.capSpaceValue}>{formatSalary(capSpace)}</div>
      </div>

      {/* Filters */}
      <div style={styles.controlsRow}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Position:</label>
          <select
            style={styles.filterSelect}
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
          >
            {positions.map((pos) => (
              <option key={pos} value={pos}>
                {pos === 'all' ? 'All Positions' : pos}
              </option>
            ))}
          </select>
        </div>
        <div style={styles.sortGroup}>
          <label style={styles.filterLabel}>Sort:</label>
          <select
            style={styles.filterSelect}
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
          >
            <option value="war">Last Season WAR</option>
            <option value="overall">Overall</option>
            <option value="salary">Salary</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Available Count */}
      <div style={styles.availableCount}>
        {sortedAgents.length} free agent{sortedAgents.length !== 1 ? 's' : ''} available
      </div>

      {/* FA List */}
      <div style={styles.faList}>
        {sortedAgents.map((fa) => (
          <div key={fa.playerId} style={styles.faCard}>
            <div style={styles.faHeader}>
              <div style={styles.faInfo}>
                <span style={styles.faName}>{fa.playerName}</span>
                <span style={styles.faDetails}>
                  {fa.position} · Age {fa.age} · {fa.overall}
                </span>
              </div>
              <div style={styles.faWAR}>
                <span style={styles.warValue}>{fa.lastSeasonWAR.toFixed(1)}</span>
                <span style={styles.warLabel}>WAR</span>
              </div>
            </div>

            {/* Stats */}
            <div style={styles.statsRow}>
              {fa.isPitcher ? (
                <>
                  <div style={styles.statItem}>
                    <span style={styles.statValue}>{fa.velocity}</span>
                    <span style={styles.statLabel}>VEL</span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statValue}>{fa.junk}</span>
                    <span style={styles.statLabel}>JNK</span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statValue}>{fa.accuracy}</span>
                    <span style={styles.statLabel}>ACC</span>
                  </div>
                </>
              ) : (
                <>
                  <div style={styles.statItem}>
                    <span style={styles.statValue}>{fa.power}</span>
                    <span style={styles.statLabel}>POW</span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statValue}>{fa.contact}</span>
                    <span style={styles.statLabel}>CON</span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statValue}>{fa.speed}</span>
                    <span style={styles.statLabel}>SPD</span>
                  </div>
                </>
              )}
            </div>

            {/* Salary & Sign Button */}
            <div style={styles.faFooter}>
              <div style={styles.salaryInfo}>
                <span style={styles.salaryLabel}>Asking:</span>
                <span style={styles.salaryValue}>{formatSalary(fa.salary)}</span>
              </div>
              <button
                style={{
                  ...styles.signButton,
                  ...(canAfford(fa.salary) ? {} : styles.signButtonDisabled),
                }}
                onClick={() => onSignPlayer(fa.playerId)}
                disabled={!canAfford(fa.salary)}
              >
                {canAfford(fa.salary) ? 'Sign Player' : 'Over Budget'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {sortedAgents.length === 0 && (
        <div style={styles.empty}>No free agents match your filters</div>
      )}

      {/* Continue Button */}
      <button style={styles.continueButton} onClick={onContinue}>
        {currentRound < totalRounds ? 'End Round' : 'Continue to Draft'}
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '800px',
    margin: '0 auto 24px',
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: 900,
    color: '#fff',
  },
  roundIndicator: {
    padding: '8px 20px',
    backgroundColor: '#3b82f6',
    borderRadius: '100px',
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#fff',
  },
  capSpaceCard: {
    maxWidth: '300px',
    margin: '0 auto 32px',
    padding: '20px',
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    border: '2px solid #22c55e',
    textAlign: 'center',
  },
  capSpaceLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '8px',
  },
  capSpaceValue: {
    fontSize: '2rem',
    fontWeight: 900,
    color: '#22c55e',
  },
  controlsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sortGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
  },
  filterSelect: {
    padding: '8px 12px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#e2e8f0',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  availableCount: {
    textAlign: 'center',
    fontSize: '0.875rem',
    color: '#64748b',
    marginBottom: '24px',
  },
  faList: {
    maxWidth: '800px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  faCard: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #334155',
  },
  faHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  faInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  faName: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#fff',
  },
  faDetails: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
  },
  faWAR: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
  },
  warValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#22c55e',
  },
  warLabel: {
    fontSize: '0.625rem',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  statsRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 16px',
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
  faFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '16px',
    borderTop: '1px solid #334155',
  },
  salaryInfo: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
  },
  salaryLabel: {
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  salaryValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#fbbf24',
  },
  signButton: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  signButtonDisabled: {
    background: '#334155',
    color: '#64748b',
    cursor: 'not-allowed',
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
