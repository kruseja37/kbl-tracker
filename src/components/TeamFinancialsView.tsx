/**
 * TeamFinancialsView - Team financial overview
 * Per Ralph Framework S-C012
 *
 * Features:
 * - Total payroll display
 * - Cap space calculation
 * - Top 5 highest-paid players
 */

interface PlayerSalary {
  playerId: string;
  playerName: string;
  position: string;
  salary: number;
  contractYears?: number;
}

interface TeamFinancialsViewProps {
  teamName: string;
  payroll: number;
  salaryCap: number;
  luxuryTax?: number;
  players: PlayerSalary[];
  onPlayerClick?: (playerId: string) => void;
}

export default function TeamFinancialsView({
  teamName,
  payroll,
  salaryCap,
  luxuryTax,
  players,
  onPlayerClick,
}: TeamFinancialsViewProps) {
  const capSpace = salaryCap - payroll;
  const isOverCap = capSpace < 0;
  const payrollPercent = (payroll / salaryCap) * 100;

  // Sort by salary and take top 5
  const topSalaries = [...players]
    .sort((a, b) => b.salary - a.salary)
    .slice(0, 5);

  // Calculate average salary
  const avgSalary = players.length > 0
    ? players.reduce((sum, p) => sum + p.salary, 0) / players.length
    : 0;

  // Get salary distribution
  const getSalaryDistribution = () => {
    const tiers = {
      elite: players.filter(p => p.salary >= 20000000).length,
      star: players.filter(p => p.salary >= 10000000 && p.salary < 20000000).length,
      solid: players.filter(p => p.salary >= 5000000 && p.salary < 10000000).length,
      role: players.filter(p => p.salary >= 1000000 && p.salary < 5000000).length,
      minimum: players.filter(p => p.salary < 1000000).length,
    };
    return tiers;
  };

  const distribution = getSalaryDistribution();

  const formatMoney = (value: number, compact = false): string => {
    if (compact) {
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
      return `$${value}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{teamName} Finances</h2>

      {/* Payroll Overview */}
      <div style={styles.overviewGrid}>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Total Payroll</div>
          <div style={styles.cardValue}>{formatMoney(payroll)}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Salary Cap</div>
          <div style={styles.cardValue}>{formatMoney(salaryCap)}</div>
        </div>
        <div style={{
          ...styles.card,
          ...(isOverCap ? styles.cardDanger : styles.cardSuccess),
        }}>
          <div style={styles.cardLabel}>
            {isOverCap ? 'Over Cap' : 'Cap Space'}
          </div>
          <div style={styles.cardValue}>
            {isOverCap ? '-' : ''}{formatMoney(Math.abs(capSpace))}
          </div>
        </div>
      </div>

      {/* Cap Usage Bar */}
      <div style={styles.capBarSection}>
        <div style={styles.capBarHeader}>
          <span style={styles.capBarLabel}>Cap Usage</span>
          <span style={styles.capBarPercent}>{payrollPercent.toFixed(1)}%</span>
        </div>
        <div style={styles.capBar}>
          <div
            style={{
              ...styles.capBarFill,
              width: `${Math.min(payrollPercent, 100)}%`,
              backgroundColor: isOverCap ? '#ef4444' : payrollPercent > 90 ? '#f59e0b' : '#22c55e',
            }}
          />
          {luxuryTax && (
            <div
              style={{
                ...styles.luxuryLine,
                left: `${(luxuryTax / salaryCap) * 100}%`,
              }}
            />
          )}
        </div>
        {luxuryTax && (
          <div style={styles.capBarLegend}>
            <span style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: '#ef4444' }} />
              Luxury Tax: {formatMoney(luxuryTax, true)}
            </span>
          </div>
        )}
      </div>

      {/* Top Salaries */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>Top 5 Salaries</span>
        </div>
        <div style={styles.salaryList}>
          {topSalaries.map((player, index) => (
            <div
              key={player.playerId}
              style={styles.salaryRow}
              onClick={() => onPlayerClick?.(player.playerId)}
            >
              <div style={styles.salaryRank}>#{index + 1}</div>
              <div style={styles.salaryInfo}>
                <span style={styles.salaryName}>{player.playerName}</span>
                <span style={styles.salaryPosition}>{player.position}</span>
              </div>
              <div style={styles.salaryAmount}>
                {formatMoney(player.salary, true)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Salary Distribution */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>Salary Distribution</span>
        </div>
        <div style={styles.distributionGrid}>
          <div style={styles.distributionItem}>
            <span style={styles.distCount}>{distribution.elite}</span>
            <span style={styles.distLabel}>Elite ($20M+)</span>
          </div>
          <div style={styles.distributionItem}>
            <span style={styles.distCount}>{distribution.star}</span>
            <span style={styles.distLabel}>Star ($10-20M)</span>
          </div>
          <div style={styles.distributionItem}>
            <span style={styles.distCount}>{distribution.solid}</span>
            <span style={styles.distLabel}>Solid ($5-10M)</span>
          </div>
          <div style={styles.distributionItem}>
            <span style={styles.distCount}>{distribution.role}</span>
            <span style={styles.distLabel}>Role ($1-5M)</span>
          </div>
          <div style={styles.distributionItem}>
            <span style={styles.distCount}>{distribution.minimum}</span>
            <span style={styles.distLabel}>Min (&lt;$1M)</span>
          </div>
        </div>
      </div>

      {/* Average Salary */}
      <div style={styles.avgSection}>
        <span style={styles.avgLabel}>Average Salary</span>
        <span style={styles.avgValue}>{formatMoney(avgSalary, true)}</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #334155',
  },
  title: {
    margin: '0 0 20px 0',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#fff',
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '24px',
  },
  card: {
    padding: '16px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    textAlign: 'center',
  },
  cardSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
  },
  cardDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
  cardLabel: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '4px',
  },
  cardValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  capBarSection: {
    marginBottom: '24px',
  },
  capBarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  capBarLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#94a3b8',
  },
  capBarPercent: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  capBar: {
    position: 'relative',
    height: '12px',
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    overflow: 'visible',
  },
  capBarFill: {
    position: 'absolute',
    height: '100%',
    borderRadius: '6px',
    transition: 'width 0.3s ease',
  },
  luxuryLine: {
    position: 'absolute',
    top: '-4px',
    width: '2px',
    height: '20px',
    backgroundColor: '#ef4444',
  },
  capBarLegend: {
    display: 'flex',
    gap: '16px',
    marginTop: '8px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  section: {
    marginBottom: '20px',
  },
  sectionHeader: {
    marginBottom: '12px',
  },
  sectionTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  salaryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  salaryRow: {
    display: 'grid',
    gridTemplateColumns: '40px 1fr auto',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  salaryRank: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#64748b',
  },
  salaryInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  salaryName: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  salaryPosition: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  salaryAmount: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#22c55e',
  },
  distributionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '8px',
  },
  distributionItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '12px 8px',
    backgroundColor: '#0f172a',
    borderRadius: '6px',
  },
  distCount: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  distLabel: {
    fontSize: '0.625rem',
    color: '#64748b',
    textAlign: 'center',
  },
  avgSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
  },
  avgLabel: {
    fontSize: '0.875rem',
    color: '#94a3b8',
  },
  avgValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#3b82f6',
  },
};
