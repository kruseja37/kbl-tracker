/**
 * CyYoungReveal - Cy Young Award announcement
 * Per Ralph Framework S-D008
 *
 * Features:
 * - Winner revealed
 * - W-L, ERA, K, pWAR stats
 * - +8 Fame bonus shown
 */

interface CyYoungData {
  playerId: string;
  playerName: string;
  teamName: string;
  pwar: number;
  wins: number;
  losses: number;
  era: number;
  strikeouts: number;
  ip: number;
  whip: number;
}

interface CyYoungRevealProps {
  winner: CyYoungData;
  onContinue: () => void;
  onPlayerClick?: (playerId: string) => void;
}

export default function CyYoungReveal({
  winner,
  onContinue,
  onPlayerClick,
}: CyYoungRevealProps) {
  const formatEra = (era: number): string => era.toFixed(2);
  const formatIp = (ip: number): string => {
    const full = Math.floor(ip);
    const outs = Math.round((ip - full) * 10);
    return `${full}.${outs}`;
  };

  return (
    <div style={styles.container}>
      {/* Trophy */}
      <div style={styles.trophy}>⚾</div>

      {/* Label */}
      <div style={styles.awardLabel}>CY YOUNG AWARD</div>

      {/* Winner Name */}
      <div
        style={styles.winnerName}
        onClick={() => onPlayerClick?.(winner.playerId)}
      >
        {winner.playerName}
      </div>

      {/* Team */}
      <div style={styles.teamName}>{winner.teamName}</div>

      {/* pWAR */}
      <div style={styles.pwarSection}>
        <span style={styles.pwarValue}>{winner.pwar.toFixed(1)}</span>
        <span style={styles.pwarLabel}>pWAR</span>
      </div>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statValue}>
            {winner.wins}-{winner.losses}
          </span>
          <span style={styles.statLabel}>W-L</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{formatEra(winner.era)}</span>
          <span style={styles.statLabel}>ERA</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{winner.strikeouts}</span>
          <span style={styles.statLabel}>K</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{formatIp(winner.ip)}</span>
          <span style={styles.statLabel}>IP</span>
        </div>
      </div>

      {/* Fame Bonus */}
      <div style={styles.fameBonus}>
        <span style={styles.fameIcon}>⭐</span>
        <span style={styles.fameText}>+8 Fame</span>
      </div>

      {/* Continue Button */}
      <button style={styles.continueButton} onClick={onContinue}>
        Continue to Rookie of the Year
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center',
  },
  trophy: {
    fontSize: '6rem',
    marginBottom: '24px',
  },
  awardLabel: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#3b82f6',
    letterSpacing: '0.3em',
    marginBottom: '16px',
  },
  winnerName: {
    fontSize: '2.5rem',
    fontWeight: 900,
    color: '#fff',
    marginBottom: '8px',
    cursor: 'pointer',
  },
  teamName: {
    fontSize: '1.25rem',
    color: '#94a3b8',
    marginBottom: '32px',
  },
  pwarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 40px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '12px',
    marginBottom: '24px',
    border: '1px solid rgba(59, 130, 246, 0.3)',
  },
  pwarValue: {
    fontSize: '2.5rem',
    fontWeight: 900,
    color: '#3b82f6',
  },
  pwarLabel: {
    fontSize: '0.875rem',
    color: '#3b82f6',
    textTransform: 'uppercase',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginBottom: '32px',
    maxWidth: '400px',
    width: '100%',
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
  },
  statValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  statLabel: {
    fontSize: '0.6875rem',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  fameBonus: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: '100px',
    marginBottom: '32px',
  },
  fameIcon: {
    fontSize: '1.5rem',
  },
  fameText: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#fbbf24',
  },
  continueButton: {
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
