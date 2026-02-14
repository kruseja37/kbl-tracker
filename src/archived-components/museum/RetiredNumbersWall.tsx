/**
 * RetiredNumbersWall - Retired jersey numbers display
 * Per Ralph Framework S-G003
 *
 * Features:
 * - Numbers displayed in wall format
 * - Player association shown
 * - Retirement date visible
 */

interface RetiredNumber {
  numberId: string;
  jerseyNumber: number;
  playerName: string;
  playerId: string;
  position: string;
  retirementYear: number;
  yearsActive: string;
  careerWAR?: number;
}

interface RetiredNumbersWallProps {
  numbers: RetiredNumber[];
  onNumberClick?: (playerId: string) => void;
  onBack?: () => void;
}

export default function RetiredNumbersWall({
  numbers,
  onNumberClick,
  onBack,
}: RetiredNumbersWallProps) {
  const sortedNumbers = [...numbers].sort(
    (a, b) => a.jerseyNumber - b.jerseyNumber
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        {onBack && (
          <button style={styles.backButton} onClick={onBack}>
            ← Back to Museum
          </button>
        )}
        <div style={styles.icon}>👕</div>
        <h1 style={styles.title}>Retired Numbers</h1>
        <p style={styles.subtitle}>
          {numbers.length} {numbers.length === 1 ? 'number' : 'numbers'} retired
        </p>
      </div>

      {/* Numbers Wall */}
      <div style={styles.wall}>
        {sortedNumbers.map((num) => (
          <div
            key={num.numberId}
            style={styles.numberCard}
            onClick={() => onNumberClick?.(num.playerId)}
          >
            {/* Jersey Number */}
            <div style={styles.jerseyNumber}>{num.jerseyNumber}</div>

            {/* Player Info */}
            <div style={styles.playerInfo}>
              <span style={styles.playerName}>{num.playerName}</span>
              <span style={styles.position}>{num.position}</span>
            </div>

            {/* Years */}
            <div style={styles.yearsActive}>{num.yearsActive}</div>

            {/* Career WAR */}
            {num.careerWAR !== undefined && (
              <div style={styles.warBadge}>
                {num.careerWAR.toFixed(1)} WAR
              </div>
            )}

            {/* Retirement Date */}
            <div style={styles.retirementDate}>
              Retired: {num.retirementYear}
            </div>
          </div>
        ))}
      </div>

      {numbers.length === 0 && (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>👕</span>
          <span>No retired numbers yet</span>
          <span style={styles.emptySubtext}>
            Honor your franchise legends by retiring their numbers
          </span>
        </div>
      )}
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
    marginBottom: '40px',
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#94a3b8',
    fontSize: '0.875rem',
    cursor: 'pointer',
    marginBottom: '24px',
  },
  icon: {
    fontSize: '3rem',
    marginBottom: '12px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '2rem',
    fontWeight: 900,
    color: '#a855f7',
  },
  subtitle: {
    margin: 0,
    fontSize: '1rem',
    color: '#94a3b8',
  },
  wall: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '24px',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  numberCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px',
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    border: '2px solid #a855f7',
    cursor: 'pointer',
    minWidth: '180px',
    transition: 'all 0.15s ease',
  },
  jerseyNumber: {
    fontSize: '4rem',
    fontWeight: 900,
    color: '#a855f7',
    lineHeight: 1,
    marginBottom: '12px',
  },
  playerInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '8px',
  },
  playerName: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#fff',
    textAlign: 'center',
  },
  position: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
  },
  yearsActive: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginBottom: '12px',
  },
  warBadge: {
    padding: '4px 12px',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: '100px',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#22c55e',
    marginBottom: '12px',
  },
  retirementDate: {
    fontSize: '0.6875rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '60px 20px',
    color: '#64748b',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '3rem',
  },
  emptySubtext: {
    fontSize: '0.875rem',
    maxWidth: '280px',
  },
};
