/**
 * RetirementsScreen - Retiring players display
 * Per Ralph Framework S-E005, S-E006
 *
 * Features:
 * - Retirees listed with career summaries
 * - Jersey retirement eligibility shown
 * - HOF eligibility badge for career WAR > threshold
 */

interface Retiree {
  playerId: string;
  playerName: string;
  teamName: string;
  position: string;
  age: number;
  yearsPlayed: number;
  careerWAR: number;
  keyStats: {
    label: string;
    value: string;
  }[];
  achievements: string[];
  jerseyRetirementEligible: boolean;
  hofEligible: boolean;
}

interface RetirementsScreenProps {
  retirees: Retiree[];
  hofThreshold?: number;
  onPlayerClick?: (playerId: string) => void;
  onHOFInduction?: (playerId: string) => void;
  onContinue: () => void;
}

export default function RetirementsScreen({
  retirees,
  hofThreshold = 40,
  onPlayerClick,
  onHOFInduction,
  onContinue,
}: RetirementsScreenProps) {
  const hofEligibleCount = retirees.filter((r) => r.hofEligible).length;
  const jerseyRetirementCount = retirees.filter((r) => r.jerseyRetirementEligible).length;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.icon}>👋</div>
        <h1 style={styles.title}>Retirements</h1>
        <p style={styles.subtitle}>
          {retirees.length} player{retirees.length !== 1 ? 's' : ''} ending{' '}
          {retirees.length !== 1 ? 'their' : "their"} career
          {retirees.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Summary */}
      {(hofEligibleCount > 0 || jerseyRetirementCount > 0) && (
        <div style={styles.summaryRow}>
          {hofEligibleCount > 0 && (
            <div style={styles.summaryCard}>
              <span style={styles.summaryIcon}>🏛️</span>
              <span style={styles.summaryValue}>{hofEligibleCount}</span>
              <span style={styles.summaryLabel}>HOF Eligible</span>
            </div>
          )}
          {jerseyRetirementCount > 0 && (
            <div style={styles.summaryCard}>
              <span style={styles.summaryIcon}>🏆</span>
              <span style={styles.summaryValue}>{jerseyRetirementCount}</span>
              <span style={styles.summaryLabel}>Jersey Retirement</span>
            </div>
          )}
        </div>
      )}

      {/* HOF Threshold Info */}
      <div style={styles.thresholdInfo}>
        Hall of Fame threshold: {hofThreshold}+ career WAR
      </div>

      {/* Retirees List */}
      <div style={styles.retireesList}>
        {retirees.map((retiree) => (
          <div
            key={retiree.playerId}
            style={styles.retireeCard}
            onClick={() => onPlayerClick?.(retiree.playerId)}
          >
            {/* Badges */}
            <div style={styles.badgesRow}>
              {retiree.hofEligible && (
                <div
                  style={styles.hofBadge}
                  onClick={(e) => {
                    e.stopPropagation();
                    onHOFInduction?.(retiree.playerId);
                  }}
                >
                  🏛️ HOF Eligible
                </div>
              )}
              {retiree.jerseyRetirementEligible && (
                <div style={styles.jerseyBadge}>🏆 Jersey Retirement Eligible</div>
              )}
            </div>

            {/* Player Info */}
            <div style={styles.retireeHeader}>
              <div style={styles.nameSection}>
                <span style={styles.playerName}>{retiree.playerName}</span>
                <span style={styles.playerDetails}>
                  {retiree.teamName} · {retiree.position} · Age {retiree.age}
                </span>
              </div>
              <div style={styles.careerWAR}>
                <span style={styles.warValue}>{retiree.careerWAR.toFixed(1)}</span>
                <span style={styles.warLabel}>Career WAR</span>
              </div>
            </div>

            {/* Career Summary */}
            <div style={styles.careerSummary}>
              <div style={styles.yearsPlayed}>
                {retiree.yearsPlayed} seasons in the league
              </div>

              {/* Key Stats */}
              <div style={styles.statsGrid}>
                {retiree.keyStats.map((stat, index) => (
                  <div key={index} style={styles.statItem}>
                    <span style={styles.statValue}>{stat.value}</span>
                    <span style={styles.statLabel}>{stat.label}</span>
                  </div>
                ))}
              </div>

              {/* Achievements */}
              {retiree.achievements.length > 0 && (
                <div style={styles.achievements}>
                  {retiree.achievements.map((achievement, index) => (
                    <span key={index} style={styles.achievement}>
                      {achievement}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {retirees.length === 0 && (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>🎉</span>
          <span>No retirements this season</span>
        </div>
      )}

      {/* Continue Button */}
      <button style={styles.continueButton} onClick={onContinue}>
        Continue to FA Protection
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
    marginBottom: '24px',
  },
  icon: {
    fontSize: '4rem',
    marginBottom: '16px',
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
    marginBottom: '16px',
  },
  summaryCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: '100px',
    border: '1px solid rgba(251, 191, 36, 0.3)',
  },
  summaryIcon: {
    fontSize: '1.5rem',
  },
  summaryValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#fbbf24',
  },
  summaryLabel: {
    fontSize: '0.8125rem',
    color: '#fbbf24',
  },
  thresholdInfo: {
    textAlign: 'center',
    fontSize: '0.8125rem',
    color: '#64748b',
    marginBottom: '32px',
  },
  retireesList: {
    maxWidth: '700px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  retireeCard: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #334155',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  badgesRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  hofBadge: {
    padding: '6px 16px',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: '100px',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#fbbf24',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  jerseyBadge: {
    padding: '6px 16px',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderRadius: '100px',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#a855f7',
  },
  retireeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  nameSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  playerName: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#fff',
  },
  playerDetails: {
    fontSize: '0.875rem',
    color: '#94a3b8',
  },
  careerWAR: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: '#0f172a',
    borderRadius: '12px',
  },
  warValue: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#22c55e',
  },
  warLabel: {
    fontSize: '0.6875rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  careerSummary: {
    borderTop: '1px solid #334155',
    paddingTop: '16px',
  },
  yearsPlayed: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    marginBottom: '16px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
  },
  statValue: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  statLabel: {
    fontSize: '0.625rem',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  achievements: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  achievement: {
    padding: '4px 12px',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: '100px',
    fontSize: '0.75rem',
    color: '#3b82f6',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '60px 20px',
    color: '#64748b',
    fontSize: '1rem',
  },
  emptyIcon: {
    fontSize: '3rem',
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
