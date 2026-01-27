import type { HalfInning } from '../../types/game';
import type { MojoLevel } from '../../engines/mojoEngine';
import { MOJO_STATES, getMojoColor } from '../../engines/mojoEngine';

interface ScoreboardProps {
  awayName: string;
  homeName: string;
  awayScore: number;
  homeScore: number;
  inning: number;
  halfInning: HalfInning;
  outs: number;
  gameNumber: number;
  leverageIndex?: number;  // LI from engines/leverageCalculator
  batterMojo?: MojoLevel;
  batterName?: string;
  pitcherMojo?: MojoLevel;
  pitcherName?: string;
}

// Get LI category and color
function getLIDisplay(li: number): { category: string; color: string; emoji: string } {
  if (li >= 5.0) return { category: 'EXTREME', color: '#ef4444', emoji: '🔥' };
  if (li >= 2.5) return { category: 'HIGH', color: '#f97316', emoji: '⚠️' };
  if (li >= 1.5) return { category: 'CLUTCH', color: '#eab308', emoji: '⚡' };
  if (li >= 0.85) return { category: 'MEDIUM', color: '#22c55e', emoji: '' };
  return { category: 'LOW', color: '#6b7280', emoji: '' };
}

export default function Scoreboard({
  awayName,
  homeName,
  awayScore,
  homeScore,
  inning,
  halfInning,
  outs,
  gameNumber,
  leverageIndex = 1.0,
  batterMojo,
  batterName,
  pitcherMojo,
  pitcherName,
}: ScoreboardProps) {
  const liDisplay = getLIDisplay(leverageIndex);
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

      {/* Outs and Leverage Index Row */}
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

        {/* Leverage Index Display */}
        <div style={styles.liContainer}>
          <span style={styles.liLabel}>LI:</span>
          <span style={{ ...styles.liValue, color: liDisplay.color }}>
            {liDisplay.emoji}{leverageIndex.toFixed(2)}
          </span>
          {leverageIndex >= 1.5 && (
            <span style={{ ...styles.liCategory, color: liDisplay.color }}>
              {liDisplay.category}
            </span>
          )}
        </div>
      </div>

      {/* Batter/Pitcher Mojo Row */}
      {(batterMojo !== undefined || pitcherMojo !== undefined) && (
        <div style={styles.mojoRow}>
          {batterMojo !== undefined && (
            <div style={styles.mojoItem}>
              <span style={styles.mojoLabel}>BAT:</span>
              <span style={styles.mojoPlayerName}>{batterName || '?'}</span>
              <span
                style={{
                  ...styles.mojoBadge,
                  color: getMojoColor(batterMojo),
                  backgroundColor: `${getMojoColor(batterMojo)}20`,
                }}
              >
                {MOJO_STATES[batterMojo].emoji} {MOJO_STATES[batterMojo].displayName}
              </span>
            </div>
          )}
          {pitcherMojo !== undefined && (
            <div style={{ ...styles.mojoItem, marginLeft: 'auto' }}>
              <span style={styles.mojoLabel}>PIT:</span>
              <span style={styles.mojoPlayerName}>{pitcherName || '?'}</span>
              <span
                style={{
                  ...styles.mojoBadge,
                  color: getMojoColor(pitcherMojo),
                  backgroundColor: `${getMojoColor(pitcherMojo)}20`,
                }}
              >
                {MOJO_STATES[pitcherMojo].emoji} {MOJO_STATES[pitcherMojo].displayName}
              </span>
            </div>
          )}
        </div>
      )}
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
  liContainer: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: '4px',
  },
  liLabel: {
    fontSize: '11px',
    color: '#888',
  },
  liValue: {
    fontSize: '14px',
    fontWeight: 'bold',
  },
  liCategory: {
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '1px 4px',
    borderRadius: '3px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    marginLeft: '2px',
  },
  mojoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '6px',
    paddingTop: '6px',
    borderTop: '1px solid #1e3a5f',
    gap: '8px',
  },
  mojoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  mojoLabel: {
    fontSize: '10px',
    color: '#666',
    fontWeight: 'bold',
  },
  mojoPlayerName: {
    fontSize: '11px',
    color: '#aaa',
    maxWidth: '70px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  mojoBadge: {
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '1px 5px',
    borderRadius: '4px',
  },
};
