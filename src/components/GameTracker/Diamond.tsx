import type { Bases, Runner } from '../../types/game';

interface DiamondProps {
  bases: Bases;
  onBaseClick: (base: 'first' | 'second' | 'third' | 'home') => void;
}

export default function Diamond({ bases, onBaseClick }: DiamondProps) {
  const getRunnerName = (runner: Runner | null) => {
    if (!runner) return null;
    // Get last name
    const parts = runner.playerName.split(' ');
    return parts[parts.length - 1];
  };

  return (
    <div style={styles.container}>
      {/* Second Base */}
      <div style={styles.secondBaseRow}>
        <div
          style={{
            ...styles.base,
            backgroundColor: bases.second ? '#FFEB3B' : '#333',
            cursor: 'pointer'
          }}
          onClick={() => onBaseClick('second')}
        >
          {bases.second && (
            <span style={styles.runnerName}>{getRunnerName(bases.second)}</span>
          )}
        </div>
      </div>

      {/* Third and First Base Row */}
      <div style={styles.middleRow}>
        <div
          style={{
            ...styles.base,
            backgroundColor: bases.third ? '#FFEB3B' : '#333',
            cursor: 'pointer'
          }}
          onClick={() => onBaseClick('third')}
        >
          {bases.third && (
            <span style={styles.runnerName}>{getRunnerName(bases.third)}</span>
          )}
        </div>

        <div style={styles.diamondCenter} />

        <div
          style={{
            ...styles.base,
            backgroundColor: bases.first ? '#FFEB3B' : '#333',
            cursor: 'pointer'
          }}
          onClick={() => onBaseClick('first')}
        >
          {bases.first && (
            <span style={styles.runnerName}>{getRunnerName(bases.first)}</span>
          )}
        </div>
      </div>

      {/* Home Plate */}
      <div style={styles.homeRow}>
        <div
          style={styles.homePlate}
          onClick={() => onBaseClick('home')}
        />
      </div>

      {/* Base Labels */}
      <div style={styles.labels}>
        <span style={{ ...styles.label, top: '-5px', left: '50%', transform: 'translateX(-50%)' }}>2B</span>
        <span style={{ ...styles.label, top: '50%', left: '-20px', transform: 'translateY(-50%)' }}>3B</span>
        <span style={{ ...styles.label, top: '50%', right: '-20px', transform: 'translateY(-50%)' }}>1B</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '120px',
    height: '120px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondBaseRow: {
    display: 'flex',
    justifyContent: 'center',
  },
  middleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginTop: '-10px',
    marginBottom: '-10px',
  },
  homeRow: {
    display: 'flex',
    justifyContent: 'center',
  },
  base: {
    width: '36px',
    height: '36px',
    transform: 'rotate(45deg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    border: '2px solid #555',
    transition: 'background-color 0.2s',
  },
  runnerName: {
    transform: 'rotate(-45deg)',
    fontSize: '9px',
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    maxWidth: '30px',
    overflow: 'hidden',
  },
  diamondCenter: {
    width: '20px',
  },
  homePlate: {
    width: '24px',
    height: '24px',
    backgroundColor: '#fff',
    clipPath: 'polygon(50% 0%, 100% 25%, 100% 100%, 0% 100%, 0% 25%)',
    cursor: 'pointer',
  },
  labels: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  label: {
    position: 'absolute',
    fontSize: '10px',
    color: '#666',
  },
};
