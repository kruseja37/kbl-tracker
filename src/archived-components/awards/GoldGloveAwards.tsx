/**
 * GoldGloveAwards - Defensive excellence by position
 * Per Ralph Framework S-D004
 *
 * Features:
 * - Winner for each of 9 positions
 * - fWAR value shown
 * - Gold glove icon
 */

interface GoldGloveWinner {
  playerId: string;
  playerName: string;
  teamName: string;
  position: string;
  fwar: number;
  defensiveRunsSaved?: number;
  fieldingPct?: number;
}

interface GoldGloveAwardsProps {
  winners: GoldGloveWinner[];
  onContinue: () => void;
  onPlayerClick?: (playerId: string) => void;
}

const POSITION_ORDER = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'P'];
const POSITION_NAMES: Record<string, string> = {
  C: 'Catcher',
  '1B': 'First Base',
  '2B': 'Second Base',
  '3B': 'Third Base',
  SS: 'Shortstop',
  LF: 'Left Field',
  CF: 'Center Field',
  RF: 'Right Field',
  P: 'Pitcher',
};

export default function GoldGloveAwards({
  winners,
  onContinue,
  onPlayerClick,
}: GoldGloveAwardsProps) {
  // Sort winners by position order
  const sortedWinners = [...winners].sort((a, b) => {
    return POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position);
  });

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.gloveIcon}>🧤</div>
        <h1 style={styles.title}>Gold Glove Awards</h1>
        <p style={styles.subtitle}>Defensive Excellence</p>
      </div>

      {/* Winners Grid */}
      <div style={styles.winnersGrid}>
        {sortedWinners.map((winner) => (
          <div
            key={winner.position}
            style={styles.winnerCard}
            onClick={() => onPlayerClick?.(winner.playerId)}
          >
            <div style={styles.cardHeader}>
              <span style={styles.goldGlove}>🧤</span>
              <span style={styles.position}>{winner.position}</span>
            </div>
            <div style={styles.positionName}>
              {POSITION_NAMES[winner.position] || winner.position}
            </div>
            <div style={styles.playerName}>{winner.playerName}</div>
            <div style={styles.teamName}>{winner.teamName}</div>
            <div style={styles.statsRow}>
              <div style={styles.stat}>
                <span style={styles.statValue}>{winner.fwar.toFixed(1)}</span>
                <span style={styles.statLabel}>fWAR</span>
              </div>
              {winner.defensiveRunsSaved !== undefined && (
                <div style={styles.stat}>
                  <span style={styles.statValue}>
                    {winner.defensiveRunsSaved > 0 ? '+' : ''}
                    {winner.defensiveRunsSaved}
                  </span>
                  <span style={styles.statLabel}>DRS</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Fame Bonus Note */}
      <div style={styles.fameNote}>
        <span style={styles.fameIcon}>⭐</span>
        <span style={styles.fameText}>+5 Fame awarded to each Gold Glove winner</span>
      </div>

      {/* Continue Button */}
      <button style={styles.continueButton} onClick={onContinue}>
        Continue to Silver Slugger Awards
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
  gloveIcon: {
    fontSize: '4rem',
    marginBottom: '16px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '2rem',
    fontWeight: 800,
    color: '#fbbf24',
  },
  subtitle: {
    margin: 0,
    fontSize: '1rem',
    color: '#94a3b8',
  },
  winnersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '16px',
    maxWidth: '900px',
    margin: '0 auto 24px',
  },
  winnerCard: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #334155',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'center',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  goldGlove: {
    fontSize: '1.5rem',
  },
  position: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: '#fbbf24',
  },
  positionName: {
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '12px',
  },
  playerName: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: '4px',
  },
  teamName: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
    marginBottom: '12px',
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statValue: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#22c55e',
  },
  statLabel: {
    fontSize: '0.625rem',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  fameNote: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    maxWidth: '400px',
    margin: '0 auto 24px',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: '8px',
  },
  fameIcon: {
    fontSize: '1.25rem',
  },
  fameText: {
    fontSize: '0.875rem',
    color: '#22c55e',
  },
  continueButton: {
    display: 'block',
    maxWidth: '500px',
    width: '100%',
    margin: '0 auto',
    padding: '16px',
    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
};
