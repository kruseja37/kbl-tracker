import type { HalfInning } from '../../types/game';

interface ScoreboardProps {
  awayName: string;
  homeName: string;
  awayScore: number;
  homeScore: number;
  inning: number;
  halfInning: HalfInning;
  outs: number;
  gameNumber: number;
}

export default function Scoreboard({
  awayName,
  homeName,
  awayScore,
  homeScore,
  inning,
  halfInning,
  outs,
  gameNumber
}: ScoreboardProps) {
  return (
    <div style={styles.container}>
      {/* Game Info */}
      <div style={styles.gameInfo}>
        GAME {gameNumber}: {awayName} @ {homeName}
      </div>

      {/* Main Scoreboard */}
      <div style={styles.scoreRow}>
        {/* Away Team */}
        <div style={styles.teamScore}>
          <span style={styles.teamName}>{awayName}</span>
          <span style={styles.score}>{awayScore}</span>
        </div>

        {/* Inning */}
        <div style={styles.inningContainer}>
          <span style={styles.inningArrow}>
            {halfInning === 'TOP' ? '▲' : '▼'}
          </span>
          <span style={styles.inningNumber}>{inning}</span>
        </div>

        {/* Home Team */}
        <div style={styles.teamScore}>
          <span style={styles.teamName}>{homeName}</span>
          <span style={styles.score}>{homeScore}</span>
        </div>
      </div>

      {/* Outs */}
      <div style={styles.outsRow}>
        <span style={styles.outsLabel}>OUTS:</span>
        {[0, 1, 2].map(i => (
          <span
            key={i}
            style={{
              ...styles.outDot,
              color: i < outs ? '#f44336' : '#444'
            }}
          >
            ●
          </span>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#16213e',
    padding: '12px 16px',
    borderRadius: '12px',
    marginBottom: '12px',
  },
  gameInfo: {
    fontSize: '11px',
    color: '#888',
    textAlign: 'center',
    marginBottom: '8px',
    letterSpacing: '1px',
  },
  scoreRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamScore: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '80px',
  },
  teamName: {
    fontSize: '12px',
    color: '#aaa',
    marginBottom: '2px',
  },
  score: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#fff',
  },
  inningContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  inningArrow: {
    fontSize: '14px',
    color: '#4CAF50',
  },
  inningNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#fff',
  },
  outsRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '8px',
    gap: '4px',
  },
  outsLabel: {
    fontSize: '12px',
    color: '#888',
    marginRight: '4px',
  },
  outDot: {
    fontSize: '16px',
  },
};
