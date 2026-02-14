/**
 * ROYReveal - Rookie of the Year Award announcement
 * Per Ralph Framework S-D009
 *
 * Features:
 * - Winner revealed with dramatic buildup
 * - Key rookie stats displayed
 * - Age shown (confirms rookie eligibility)
 * - +6 Fame bonus shown
 */

interface ROYData {
  playerId: string;
  playerName: string;
  teamName: string;
  age: number;
  isPitcher: boolean;
  // Batter stats
  bwar?: number;
  avg?: number;
  hr?: number;
  rbi?: number;
  sb?: number;
  // Pitcher stats
  pwar?: number;
  wins?: number;
  losses?: number;
  era?: number;
  strikeouts?: number;
}

interface ROYRevealProps {
  winner: ROYData;
  onContinue: () => void;
  onPlayerClick?: (playerId: string) => void;
}

export default function ROYReveal({
  winner,
  onContinue,
  onPlayerClick,
}: ROYRevealProps) {
  const formatAvg = (avg: number): string => avg.toFixed(3).replace(/^0/, '');
  const formatEra = (era: number): string => era.toFixed(2);

  return (
    <div style={styles.container}>
      {/* Trophy */}
      <div style={styles.trophy}>🌟</div>

      {/* Label */}
      <div style={styles.awardLabel}>ROOKIE OF THE YEAR</div>

      {/* Winner Name */}
      <div
        style={styles.winnerName}
        onClick={() => onPlayerClick?.(winner.playerId)}
      >
        {winner.playerName}
      </div>

      {/* Team */}
      <div style={styles.teamName}>{winner.teamName}</div>

      {/* Age Badge */}
      <div style={styles.ageBadge}>
        <span style={styles.ageValue}>{winner.age}</span>
        <span style={styles.ageLabel}>years old</span>
      </div>

      {/* WAR */}
      <div style={styles.warSection}>
        <span style={styles.warValue}>
          {winner.isPitcher
            ? winner.pwar?.toFixed(1)
            : winner.bwar?.toFixed(1)}
        </span>
        <span style={styles.warLabel}>{winner.isPitcher ? 'pWAR' : 'bWAR'}</span>
      </div>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        {winner.isPitcher ? (
          <>
            <div style={styles.statCard}>
              <span style={styles.statValue}>
                {winner.wins}-{winner.losses}
              </span>
              <span style={styles.statLabel}>W-L</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statValue}>
                {formatEra(winner.era || 0)}
              </span>
              <span style={styles.statLabel}>ERA</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{winner.strikeouts}</span>
              <span style={styles.statLabel}>K</span>
            </div>
          </>
        ) : (
          <>
            <div style={styles.statCard}>
              <span style={styles.statValue}>
                {formatAvg(winner.avg || 0)}
              </span>
              <span style={styles.statLabel}>AVG</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{winner.hr}</span>
              <span style={styles.statLabel}>HR</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{winner.rbi}</span>
              <span style={styles.statLabel}>RBI</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{winner.sb}</span>
              <span style={styles.statLabel}>SB</span>
            </div>
          </>
        )}
      </div>

      {/* Fame Bonus */}
      <div style={styles.fameBonus}>
        <span style={styles.fameIcon}>⭐</span>
        <span style={styles.fameText}>+6 Fame</span>
      </div>

      {/* Continue Button */}
      <button style={styles.continueButton} onClick={onContinue}>
        Continue to Season Summary
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
    color: '#22c55e',
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
    marginBottom: '24px',
  },
  ageBadge: {
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: '6px',
    padding: '8px 20px',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: '100px',
    marginBottom: '24px',
  },
  ageValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#22c55e',
  },
  ageLabel: {
    fontSize: '0.875rem',
    color: '#22c55e',
  },
  warSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 40px',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: '12px',
    marginBottom: '24px',
    border: '1px solid rgba(34, 197, 94, 0.3)',
  },
  warValue: {
    fontSize: '2.5rem',
    fontWeight: 900,
    color: '#22c55e',
  },
  warLabel: {
    fontSize: '0.875rem',
    color: '#22c55e',
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
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
};
