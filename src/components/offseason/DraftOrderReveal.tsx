/**
 * DraftOrderReveal - Show how draft order was determined
 * Per Ralph Framework S-E011
 *
 * Features:
 * - Lottery results for bottom teams
 * - Final order listed
 * - User position highlighted
 */

interface LotteryResult {
  teamId: string;
  teamName: string;
  previousStanding: number;
  lotteryNumber: number;
  finalPosition: number;
  movedUp: boolean;
}

interface DraftOrderRevealProps {
  lotteryResults: LotteryResult[];
  userTeamId: string;
  onContinue: () => void;
}

export default function DraftOrderReveal({
  lotteryResults,
  userTeamId,
  onContinue,
}: DraftOrderRevealProps) {
  const userResult = lotteryResults.find((r) => r.teamId === userTeamId);
  const sortedByFinal = [...lotteryResults].sort(
    (a, b) => a.finalPosition - b.finalPosition
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.icon}>🎰</div>
        <h1 style={styles.title}>Draft Lottery Results</h1>
        <p style={styles.subtitle}>Bottom teams determine draft order by lottery</p>
      </div>

      {/* User Position Highlight */}
      {userResult && (
        <div style={styles.userPositionCard}>
          <span style={styles.userPositionLabel}>Your Draft Position</span>
          <span style={styles.userPositionNumber}>#{userResult.finalPosition}</span>
          {userResult.movedUp && (
            <span style={styles.movedUpBadge}>
              Moved up from #{userResult.previousStanding}!
            </span>
          )}
        </div>
      )}

      {/* Lottery Animation Area */}
      <div style={styles.lotterySection}>
        <h2 style={styles.sectionTitle}>Lottery Drawing</h2>
        <div style={styles.lotteryGrid}>
          {lotteryResults
            .sort((a, b) => a.previousStanding - b.previousStanding)
            .map((result) => (
              <div
                key={result.teamId}
                style={{
                  ...styles.lotteryCard,
                  ...(result.teamId === userTeamId ? styles.userCard : {}),
                }}
              >
                <div style={styles.standingBefore}>
                  <span style={styles.standingLabel}>Previous</span>
                  <span style={styles.standingValue}>#{result.previousStanding}</span>
                </div>
                <div style={styles.teamNameLottery}>{result.teamName}</div>
                <div style={styles.lotteryNumber}>
                  <span style={styles.numberLabel}>Drew</span>
                  <span style={styles.numberValue}>{result.lotteryNumber}</span>
                </div>
                <div
                  style={{
                    ...styles.arrowSection,
                    color: result.movedUp ? '#22c55e' : '#64748b',
                  }}
                >
                  {result.movedUp ? '↑' : result.previousStanding > result.finalPosition ? '↓' : '→'}
                </div>
                <div style={styles.finalPosition}>
                  <span style={styles.finalLabel}>Picks</span>
                  <span style={styles.finalValue}>#{result.finalPosition}</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Final Draft Order */}
      <div style={styles.finalOrderSection}>
        <h2 style={styles.sectionTitle}>Final Draft Order</h2>
        <div style={styles.orderList}>
          {sortedByFinal.map((result) => (
            <div
              key={result.teamId}
              style={{
                ...styles.orderRow,
                ...(result.teamId === userTeamId ? styles.userOrderRow : {}),
              }}
            >
              <span style={styles.orderNumber}>#{result.finalPosition}</span>
              <span style={styles.orderTeam}>{result.teamName}</span>
              {result.teamId === userTeamId && (
                <span style={styles.youBadge}>YOU</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Continue Button */}
      <button style={styles.continueButton} onClick={onContinue}>
        Begin Draft
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
  userPositionCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: '300px',
    margin: '0 auto 32px',
    padding: '24px',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: '16px',
    border: '2px solid #22c55e',
  },
  userPositionLabel: {
    fontSize: '0.75rem',
    color: '#22c55e',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '8px',
  },
  userPositionNumber: {
    fontSize: '3rem',
    fontWeight: 900,
    color: '#22c55e',
  },
  movedUpBadge: {
    marginTop: '8px',
    padding: '6px 16px',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: '100px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#22c55e',
  },
  lotterySection: {
    maxWidth: '800px',
    margin: '0 auto 40px',
  },
  sectionTitle: {
    margin: '0 0 20px 0',
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#e2e8f0',
    textAlign: 'center',
  },
  lotteryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
  },
  lotteryCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    gap: '8px',
  },
  userCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
    borderColor: '#22c55e',
  },
  standingBefore: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  standingLabel: {
    fontSize: '0.625rem',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  standingValue: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#94a3b8',
  },
  teamNameLottery: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: '#fff',
    textAlign: 'center',
  },
  lotteryNumber: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
  },
  numberLabel: {
    fontSize: '0.5rem',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  numberValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#fbbf24',
  },
  arrowSection: {
    fontSize: '1.5rem',
    fontWeight: 700,
  },
  finalPosition: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  finalLabel: {
    fontSize: '0.625rem',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  finalValue: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#3b82f6',
  },
  finalOrderSection: {
    maxWidth: '400px',
    margin: '0 auto 32px',
  },
  orderList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  orderRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    border: '1px solid #334155',
  },
  userOrderRow: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: '#22c55e',
  },
  orderNumber: {
    width: '40px',
    fontSize: '1rem',
    fontWeight: 700,
    color: '#3b82f6',
  },
  orderTeam: {
    flex: 1,
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  youBadge: {
    padding: '4px 10px',
    backgroundColor: '#22c55e',
    borderRadius: '100px',
    fontSize: '0.625rem',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '0.1em',
  },
  continueButton: {
    display: 'block',
    margin: '0 auto',
    padding: '16px 48px',
    background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
};
