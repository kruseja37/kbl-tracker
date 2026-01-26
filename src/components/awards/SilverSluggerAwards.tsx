/**
 * SilverSluggerAwards - Offensive excellence by position
 * Per Ralph Framework S-D005
 *
 * Features:
 * - Winner for each position + DH
 * - AVG, HR, RBI visible
 * - Silver bat icon
 */

interface SilverSluggerWinner {
  playerId: string;
  playerName: string;
  teamName: string;
  position: string;
  avg: number;
  hr: number;
  rbi: number;
  ops?: number;
}

interface SilverSluggerAwardsProps {
  winners: SilverSluggerWinner[];
  onContinue: () => void;
  onPlayerClick?: (playerId: string) => void;
}

const POSITION_ORDER = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
const POSITION_NAMES: Record<string, string> = {
  C: 'Catcher',
  '1B': 'First Base',
  '2B': 'Second Base',
  '3B': 'Third Base',
  SS: 'Shortstop',
  LF: 'Left Field',
  CF: 'Center Field',
  RF: 'Right Field',
  DH: 'Designated Hitter',
};

export default function SilverSluggerAwards({
  winners,
  onContinue,
  onPlayerClick,
}: SilverSluggerAwardsProps) {
  // Sort winners by position order
  const sortedWinners = [...winners].sort((a, b) => {
    return POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position);
  });

  const formatAvg = (avg: number): string => {
    return avg.toFixed(3).replace(/^0/, '');
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.batIcon}>🏏</div>
        <h1 style={styles.title}>Silver Slugger Awards</h1>
        <p style={styles.subtitle}>Offensive Excellence</p>
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
              <span style={styles.silverBat}>🏏</span>
              <span style={styles.position}>{winner.position}</span>
            </div>
            <div style={styles.positionName}>
              {POSITION_NAMES[winner.position] || winner.position}
            </div>
            <div style={styles.playerName}>{winner.playerName}</div>
            <div style={styles.teamName}>{winner.teamName}</div>
            <div style={styles.statsRow}>
              <div style={styles.stat}>
                <span style={styles.statValue}>{formatAvg(winner.avg)}</span>
                <span style={styles.statLabel}>AVG</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statValue}>{winner.hr}</span>
                <span style={styles.statLabel}>HR</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statValue}>{winner.rbi}</span>
                <span style={styles.statLabel}>RBI</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fame Bonus Note */}
      <div style={styles.fameNote}>
        <span style={styles.fameIcon}>⭐</span>
        <span style={styles.fameText}>+5 Fame awarded to each Silver Slugger winner</span>
      </div>

      {/* Continue Button */}
      <button style={styles.continueButton} onClick={onContinue}>
        Continue to MVP Announcement
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
  batIcon: {
    fontSize: '4rem',
    marginBottom: '16px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '2rem',
    fontWeight: 800,
    color: '#94a3b8',
  },
  subtitle: {
    margin: 0,
    fontSize: '1rem',
    color: '#94a3b8',
  },
  winnersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
    maxWidth: '1000px',
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
  silverBat: {
    fontSize: '1.5rem',
  },
  position: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: '#94a3b8',
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
    gap: '12px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statValue: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: '#e2e8f0',
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
