/**
 * AwardsSummary - Complete awards recap
 * Per Ralph Framework S-D010
 *
 * Features:
 * - All award winners listed
 * - Quick stats for each
 * - Total Fame earned summary
 * - Links to player cards
 */

interface AwardWinner {
  playerId: string;
  playerName: string;
  teamName: string;
  awardName: string;
  stat: string;
  statValue: string;
  fameEarned: number;
}

interface AwardsSummaryProps {
  winners: AwardWinner[];
  totalFameAwarded: number;
  onPlayerClick?: (playerId: string) => void;
  onFinish: () => void;
}

export default function AwardsSummary({
  winners,
  totalFameAwarded,
  onPlayerClick,
  onFinish,
}: AwardsSummaryProps) {
  // Group winners by award type
  const majorAwards = winners.filter((w) =>
    ['MVP', 'Cy Young', 'Rookie of the Year'].includes(w.awardName)
  );
  const positionAwards = winners.filter((w) =>
    ['Gold Glove', 'Silver Slugger'].includes(w.awardName)
  );
  const statLeaders = winners.filter((w) =>
    ['Batting Champion', 'Home Run Leader', 'ERA Leader', 'Strikeout Leader'].includes(
      w.awardName
    )
  );

  const renderWinnerCard = (winner: AwardWinner, index: number) => (
    <div
      key={`${winner.awardName}-${winner.playerId}-${index}`}
      style={styles.winnerCard}
      onClick={() => onPlayerClick?.(winner.playerId)}
    >
      <div style={styles.awardName}>{winner.awardName}</div>
      <div style={styles.playerName}>{winner.playerName}</div>
      <div style={styles.teamName}>{winner.teamName}</div>
      <div style={styles.statLine}>
        <span style={styles.statLabel}>{winner.stat}:</span>
        <span style={styles.statValue}>{winner.statValue}</span>
      </div>
      <div style={styles.fameBadge}>+{winner.fameEarned} Fame</div>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.trophy}>🏆</div>
        <h1 style={styles.title}>Season Awards Summary</h1>
        <p style={styles.subtitle}>Celebrating excellence across the league</p>
      </div>

      {/* Total Fame */}
      <div style={styles.totalFameCard}>
        <span style={styles.totalFameIcon}>⭐</span>
        <div style={styles.totalFameInfo}>
          <span style={styles.totalFameValue}>{totalFameAwarded}</span>
          <span style={styles.totalFameLabel}>Total Fame Awarded</span>
        </div>
      </div>

      {/* Major Awards Section */}
      {majorAwards.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Major Awards</h2>
          <div style={styles.winnersGrid}>
            {majorAwards.map((w, i) => renderWinnerCard(w, i))}
          </div>
        </div>
      )}

      {/* Position Awards Section */}
      {positionAwards.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Position Awards</h2>
          <div style={styles.winnersGrid}>
            {positionAwards.map((w, i) => renderWinnerCard(w, i))}
          </div>
        </div>
      )}

      {/* Stat Leaders Section */}
      {statLeaders.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Statistical Leaders</h2>
          <div style={styles.winnersGrid}>
            {statLeaders.map((w, i) => renderWinnerCard(w, i))}
          </div>
        </div>
      )}

      {/* Finish Button */}
      <button style={styles.finishButton} onClick={onFinish}>
        Complete Awards Ceremony
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
  trophy: {
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
  totalFameCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '24px',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: '16px',
    border: '2px solid rgba(251, 191, 36, 0.3)',
    marginBottom: '40px',
    maxWidth: '400px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  totalFameIcon: {
    fontSize: '3rem',
  },
  totalFameInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  totalFameValue: {
    fontSize: '2.5rem',
    fontWeight: 900,
    color: '#fbbf24',
  },
  totalFameLabel: {
    fontSize: '0.875rem',
    color: '#fbbf24',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#e2e8f0',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  winnersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  winnerCard: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #334155',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  awardName: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#fbbf24',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '8px',
  },
  playerName: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#fff',
    marginBottom: '4px',
  },
  teamName: {
    fontSize: '0.8125rem',
    color: '#64748b',
    marginBottom: '12px',
  },
  statLine: {
    display: 'flex',
    justifyContent: 'center',
    gap: '6px',
    marginBottom: '12px',
  },
  statLabel: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
  },
  statValue: {
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: '#22c55e',
  },
  fameBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: '100px',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#fbbf24',
  },
  finishButton: {
    display: 'block',
    margin: '40px auto 0',
    padding: '16px 48px',
    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
};
