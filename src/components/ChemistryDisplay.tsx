/**
 * ChemistryDisplay - Team chemistry overview
 * Per Ralph Framework S-G008
 *
 * Features:
 * - Team chemistry score (0-100)
 * - Letter grade display
 * - Top pairings shown
 */

interface PlayerPairing {
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  chemistryBonus: number;
  relationshipType?: string;
}

interface ChemistryDisplayProps {
  teamName: string;
  chemistryScore: number; // 0-100
  topPairings: PlayerPairing[];
  worstPairings?: PlayerPairing[];
  onPlayerClick?: (playerId: string) => void;
}

export default function ChemistryDisplay({
  teamName,
  chemistryScore,
  topPairings,
  worstPairings = [],
  onPlayerClick,
}: ChemistryDisplayProps) {
  const getGrade = (score: number): string => {
    if (score >= 90) return 'S';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  };

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'S':
        return '#a855f7';
      case 'A':
        return '#22c55e';
      case 'B':
        return '#3b82f6';
      case 'C':
        return '#fbbf24';
      case 'D':
        return '#f97316';
      default:
        return '#ef4444';
    }
  };

  const getScoreDescription = (score: number): string => {
    if (score >= 90) return 'Elite Chemistry';
    if (score >= 80) return 'Excellent Chemistry';
    if (score >= 70) return 'Good Chemistry';
    if (score >= 60) return 'Average Chemistry';
    if (score >= 50) return 'Below Average';
    return 'Poor Chemistry';
  };

  const grade = getGrade(chemistryScore);
  const gradeColor = getGradeColor(grade);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.icon}>⚗️</span>
        <span style={styles.title}>{teamName} Chemistry</span>
      </div>

      {/* Main Score */}
      <div style={styles.scoreSection}>
        <div style={styles.gradeContainer}>
          <span style={{ ...styles.grade, color: gradeColor }}>{grade}</span>
          <span style={styles.gradeLabel}>Grade</span>
        </div>
        <div style={styles.scoreDetails}>
          <span style={styles.scoreValue}>{chemistryScore}</span>
          <span style={styles.scoreMax}>/100</span>
        </div>
        <span style={{ ...styles.description, color: gradeColor }}>
          {getScoreDescription(chemistryScore)}
        </span>
      </div>

      {/* Score Bar */}
      <div style={styles.barContainer}>
        <div
          style={{
            ...styles.barFill,
            width: `${chemistryScore}%`,
            backgroundColor: gradeColor,
          }}
        />
      </div>

      {/* Top Pairings */}
      {topPairings.length > 0 && (
        <div style={styles.pairingsSection}>
          <h3 style={styles.pairingsTitle}>
            <span style={styles.pairingIcon}>💚</span> Best Pairings
          </h3>
          <div style={styles.pairingsList}>
            {topPairings.slice(0, 3).map((pair, idx) => (
              <div key={idx} style={styles.pairingCard}>
                <div style={styles.pairingPlayers}>
                  <button
                    style={styles.playerButton}
                    onClick={() => onPlayerClick?.(pair.player1Id)}
                  >
                    {pair.player1Name}
                  </button>
                  <span style={styles.plusSign}>+</span>
                  <button
                    style={styles.playerButton}
                    onClick={() => onPlayerClick?.(pair.player2Id)}
                  >
                    {pair.player2Name}
                  </button>
                </div>
                <div style={styles.pairingBonus}>
                  <span style={styles.bonusValue}>+{pair.chemistryBonus}</span>
                  {pair.relationshipType && (
                    <span style={styles.relationshipType}>
                      {pair.relationshipType}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Worst Pairings */}
      {worstPairings.length > 0 && (
        <div style={styles.pairingsSection}>
          <h3 style={styles.pairingsTitle}>
            <span style={styles.pairingIcon}>💔</span> Problem Areas
          </h3>
          <div style={styles.pairingsList}>
            {worstPairings.slice(0, 3).map((pair, idx) => (
              <div
                key={idx}
                style={{ ...styles.pairingCard, borderColor: '#ef4444' }}
              >
                <div style={styles.pairingPlayers}>
                  <button
                    style={styles.playerButton}
                    onClick={() => onPlayerClick?.(pair.player1Id)}
                  >
                    {pair.player1Name}
                  </button>
                  <span style={{ ...styles.plusSign, color: '#ef4444' }}>×</span>
                  <button
                    style={styles.playerButton}
                    onClick={() => onPlayerClick?.(pair.player2Id)}
                  >
                    {pair.player2Name}
                  </button>
                </div>
                <div style={styles.pairingBonus}>
                  <span style={{ ...styles.bonusValue, color: '#ef4444' }}>
                    {pair.chemistryBonus}
                  </span>
                  {pair.relationshipType && (
                    <span style={styles.relationshipType}>
                      {pair.relationshipType}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {topPairings.length === 0 && worstPairings.length === 0 && (
        <div style={styles.empty}>
          <span>No significant pairings detected</span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #334155',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
  },
  icon: {
    fontSize: '1.25rem',
  },
  title: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#fff',
  },
  scoreSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '16px',
  },
  gradeContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#0f172a',
    borderRadius: '12px',
  },
  grade: {
    fontSize: '2.5rem',
    fontWeight: 900,
    lineHeight: 1,
  },
  gradeLabel: {
    fontSize: '0.6875rem',
    color: '#64748b',
    textTransform: 'uppercase',
    marginTop: '4px',
  },
  scoreDetails: {
    display: 'flex',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#fff',
  },
  scoreMax: {
    fontSize: '1rem',
    color: '#64748b',
  },
  description: {
    fontSize: '0.875rem',
    fontWeight: 600,
    marginLeft: 'auto',
  },
  barContainer: {
    height: '8px',
    backgroundColor: '#0f172a',
    borderRadius: '4px',
    marginBottom: '24px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  pairingsSection: {
    marginBottom: '20px',
  },
  pairingsTitle: {
    margin: '0 0 12px 0',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  pairingIcon: {
    fontSize: '1rem',
  },
  pairingsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  pairingCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    border: '1px solid #334155',
  },
  pairingPlayers: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  playerButton: {
    padding: '4px 10px',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    border: 'none',
    borderRadius: '100px',
    color: '#3b82f6',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  plusSign: {
    color: '#22c55e',
    fontWeight: 700,
  },
  pairingBonus: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  bonusValue: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#22c55e',
  },
  relationshipType: {
    fontSize: '0.6875rem',
    color: '#64748b',
  },
  empty: {
    textAlign: 'center',
    padding: '20px',
    color: '#64748b',
    fontSize: '0.875rem',
  },
};
