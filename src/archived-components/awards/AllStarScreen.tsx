/**
 * AllStarScreen - All-Star Team selection display
 * Per Ralph Framework S-D011
 *
 * Features:
 * - All-Star team roster by position
 * - Top 2 at each position
 * - Stats justifying selection
 * - Fame bonuses shown (+3 Starter, +2 Reserve)
 */

interface AllStarPlayer {
  playerId: string;
  playerName: string;
  teamName: string;
  position: string;
  isStarter: boolean;
  stat: string;
  statValue: string;
  fameEarned: number;
}

interface AllStarScreenProps {
  players: AllStarPlayer[];
  seasonYear: number;
  onPlayerClick?: (playerId: string) => void;
  onContinue: () => void;
}

export default function AllStarScreen({
  players,
  seasonYear,
  onPlayerClick,
  onContinue,
}: AllStarScreenProps) {
  // Group by position
  const positionGroups: Record<string, AllStarPlayer[]> = {};
  players.forEach((p) => {
    if (!positionGroups[p.position]) {
      positionGroups[p.position] = [];
    }
    positionGroups[p.position].push(p);
  });

  // Order positions
  const positionOrder = [
    'C',
    '1B',
    '2B',
    '3B',
    'SS',
    'LF',
    'CF',
    'RF',
    'DH',
    'SP',
    'RP',
  ];

  const orderedPositions = positionOrder.filter((pos) => positionGroups[pos]);

  const starters = players.filter((p) => p.isStarter);
  const reserves = players.filter((p) => !p.isStarter);
  const totalFame = players.reduce((sum, p) => sum + p.fameEarned, 0);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.stars}>⭐ ⭐ ⭐</div>
        <h1 style={styles.title}>{seasonYear} All-Star Team</h1>
        <p style={styles.subtitle}>The best of the best</p>
      </div>

      {/* Summary Stats */}
      <div style={styles.summaryRow}>
        <div style={styles.summaryItem}>
          <span style={styles.summaryValue}>{starters.length}</span>
          <span style={styles.summaryLabel}>Starters</span>
        </div>
        <div style={styles.summaryItem}>
          <span style={styles.summaryValue}>{reserves.length}</span>
          <span style={styles.summaryLabel}>Reserves</span>
        </div>
        <div style={styles.summaryItem}>
          <span style={{ ...styles.summaryValue, color: '#fbbf24' }}>
            +{totalFame}
          </span>
          <span style={styles.summaryLabel}>Fame</span>
        </div>
      </div>

      {/* Roster by Position */}
      <div style={styles.roster}>
        {orderedPositions.map((position) => (
          <div key={position} style={styles.positionGroup}>
            <div style={styles.positionLabel}>{position}</div>
            <div style={styles.playersColumn}>
              {positionGroups[position]
                .sort((a, b) => (b.isStarter ? 1 : 0) - (a.isStarter ? 1 : 0))
                .map((player) => (
                  <div
                    key={player.playerId}
                    style={{
                      ...styles.playerCard,
                      ...(player.isStarter ? styles.starterCard : {}),
                    }}
                    onClick={() => onPlayerClick?.(player.playerId)}
                  >
                    <div style={styles.playerHeader}>
                      <span style={styles.playerName}>{player.playerName}</span>
                      {player.isStarter && (
                        <span style={styles.starterBadge}>★</span>
                      )}
                    </div>
                    <div style={styles.teamName}>{player.teamName}</div>
                    <div style={styles.statLine}>
                      <span style={styles.statLabel}>{player.stat}:</span>
                      <span style={styles.statValue}>{player.statValue}</span>
                    </div>
                    <div style={styles.fameBadge}>
                      +{player.fameEarned} Fame
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <span style={styles.starterBadge}>★</span>
          <span>Starter (+3 Fame)</span>
        </div>
        <div style={styles.legendItem}>
          <span style={styles.reserveIndicator}>○</span>
          <span>Reserve (+2 Fame)</span>
        </div>
      </div>

      {/* Continue Button */}
      <button style={styles.continueButton} onClick={onContinue}>
        Continue
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
  stars: {
    fontSize: '2rem',
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
    gap: '40px',
    marginBottom: '32px',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  summaryValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#fff',
  },
  summaryLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  roster: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    maxWidth: '1000px',
    margin: '0 auto 32px',
  },
  positionGroup: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #334155',
  },
  positionLabel: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#3b82f6',
    textAlign: 'center',
    marginBottom: '12px',
    letterSpacing: '0.1em',
  },
  playersColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  playerCard: {
    padding: '12px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  starterCard: {
    border: '1px solid rgba(251, 191, 36, 0.3)',
    backgroundColor: 'rgba(251, 191, 36, 0.05)',
  },
  playerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  playerName: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#fff',
  },
  starterBadge: {
    fontSize: '0.875rem',
    color: '#fbbf24',
  },
  teamName: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginBottom: '8px',
  },
  statLine: {
    display: 'flex',
    gap: '4px',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  statValue: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#22c55e',
  },
  fameBadge: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    color: '#fbbf24',
    padding: '2px 8px',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: '100px',
    display: 'inline-block',
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    marginBottom: '32px',
    fontSize: '0.8125rem',
    color: '#94a3b8',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  reserveIndicator: {
    color: '#64748b',
  },
  continueButton: {
    display: 'block',
    margin: '0 auto',
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
