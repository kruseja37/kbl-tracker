import type { AtBatResult, GameEvent, Bases } from '../../types/game';

interface AtBatButtonsProps {
  onResult: (result: AtBatResult) => void;
  onEvent: (event: GameEvent) => void;
  disabled?: boolean;
  outs: number;
  bases: Bases;
}

// Button configuration per spec
const resultButtons: { result: AtBatResult; label: string; color: string }[][] = [
  // Row 1: Hits and Walks
  [
    { result: '1B', label: '1B', color: '#4CAF50' },
    { result: '2B', label: '2B', color: '#8BC34A' },
    { result: '3B', label: '3B', color: '#CDDC39' },
    { result: 'HR', label: 'HR', color: '#FFEB3B' },
    { result: 'BB', label: 'BB', color: '#03A9F4' },
    { result: 'IBB', label: 'IBB', color: '#0288D1' },
    { result: 'K', label: 'K', color: '#f44336' },
  ],
  // Row 2: Outs
  [
    { result: 'KL', label: 'KL', color: '#E53935' },
    { result: 'GO', label: 'GO', color: '#757575' },
    { result: 'FO', label: 'FO', color: '#9E9E9E' },
    { result: 'LO', label: 'LO', color: '#BDBDBD' },
    { result: 'PO', label: 'PO', color: '#BDBDBD' },
    { result: 'DP', label: 'DP', color: '#795548' },
    { result: 'SF', label: 'SF', color: '#607D8B' },
  ],
  // Row 3: Special
  [
    { result: 'SAC', label: 'SAC', color: '#607D8B' },
    { result: 'HBP', label: 'HBP', color: '#E91E63' },
    { result: 'E', label: 'E', color: '#FF9800' },
    { result: 'FC', label: 'FC', color: '#FF5722' },
    { result: 'D3K', label: 'D3K', color: '#9C27B0' },
  ],
];

const eventButtons: { event: GameEvent; label: string; color: string }[] = [
  { event: 'SB', label: 'Steal', color: '#26A69A' },
  { event: 'CS', label: 'CS', color: '#EF5350' },
  { event: 'WP', label: 'WP', color: '#AB47BC' },
  { event: 'PB', label: 'PB', color: '#AB47BC' },
  { event: 'PK', label: 'Pickoff', color: '#EF5350' },
  { event: 'BALK', label: 'Balk', color: '#FFA726' },
];

const subButtons: { event: GameEvent; label: string }[] = [
  { event: 'PITCH_CHANGE', label: 'Pitching Change' },
  { event: 'PINCH_HIT', label: 'Pinch Hitter' },
  { event: 'PINCH_RUN', label: 'Pinch Runner' },
  { event: 'DEF_SUB', label: 'Def Sub' },
];

export default function AtBatButtons({ onResult, onEvent, disabled, outs, bases }: AtBatButtonsProps) {
  // D3K is only available when 1st base is empty OR there are 2 outs
  // (With 2 outs, batter can run even if 1st is occupied)
  const isD3KAvailable = !bases.first || outs === 2;

  // SAC (Sacrifice Bunt) requires:
  // 1. Less than 2 outs - batter out ends inning, runner can't advance
  // 2. Runners on base - can't sacrifice to advance nobody
  const hasRunners = !!(bases.first || bases.second || bases.third);
  const isSACAvailable = outs < 2 && hasRunners;

  // SF (Sacrifice Fly) not available with 2 outs - catch is 3rd out, runner can't tag up to score
  // Also requires runner on 3rd to be a true sac fly
  const isSFAvailable = outs < 2 && bases.third !== null;

  // DP not available with 2 outs - can't turn double play with 2 outs already
  // Also requires at least one runner on base
  const isDPAvailable = outs < 2 && (bases.first || bases.second || bases.third);

  // Check if a result button should be disabled based on game state
  const isResultDisabled = (result: AtBatResult): boolean => {
    if (disabled) return true;
    if (result === 'D3K' && !isD3KAvailable) return true;
    if (result === 'SAC' && !isSACAvailable) return true;
    if (result === 'SF' && !isSFAvailable) return true;
    if (result === 'DP' && !isDPAvailable) return true;
    return false;
  };

  // Get tooltip for disabled buttons
  const getDisabledTooltip = (result: AtBatResult): string | undefined => {
    if (result === 'D3K' && !isD3KAvailable) return 'D3K only available when 1st base empty or 2 outs';
    if (result === 'SAC' && !isSACAvailable) {
      if (outs >= 2) return 'Cannot sacrifice with 2 outs - batter out ends inning';
      if (!hasRunners) return 'SAC requires runners on base to advance';
    }
    if (result === 'SF' && !isSFAvailable) {
      if (outs >= 2) return 'Cannot sac fly with 2 outs - catch ends inning';
      if (!bases.third) return 'Sac fly requires runner on 3rd';
    }
    if (result === 'DP' && !isDPAvailable) {
      if (outs >= 2) return 'Cannot turn DP with 2 outs';
      if (!bases.first && !bases.second && !bases.third) return 'DP requires runner on base';
    }
    return undefined;
  };

  return (
    <div style={styles.container}>
      {/* Result Label */}
      <div style={styles.sectionLabel}>RESULT:</div>

      {/* At-Bat Result Buttons */}
      {resultButtons.map((row, rowIndex) => (
        <div key={rowIndex} style={styles.buttonRow}>
          {row.map(({ result, label, color }) => {
            const isButtonDisabled = isResultDisabled(result);
            const tooltip = getDisabledTooltip(result);

            return (
              <button
                key={result}
                style={{
                  ...styles.resultButton,
                  backgroundColor: color,
                  opacity: isButtonDisabled ? 0.3 : 1,
                }}
                onClick={() => onResult(result)}
                disabled={isButtonDisabled}
                title={tooltip}
              >
                {label}
              </button>
            );
          })}
        </div>
      ))}

      {/* Event Buttons */}
      <div style={styles.sectionLabel}>EVENTS:</div>
      <div style={styles.buttonRow}>
        {eventButtons.map(({ event, label, color }) => (
          <button
            key={event}
            style={{
              ...styles.eventButton,
              backgroundColor: color,
              opacity: disabled ? 0.5 : 1,
            }}
            onClick={() => onEvent(event)}
            disabled={disabled}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Substitution Buttons */}
      <div style={styles.buttonRow}>
        {subButtons.map(({ event, label }) => (
          <button
            key={event}
            style={{
              ...styles.subButton,
              opacity: disabled ? 0.5 : 1,
            }}
            onClick={() => onEvent(event)}
            disabled={disabled}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '12px',
  },
  sectionLabel: {
    fontSize: '11px',
    color: '#888',
    letterSpacing: '1px',
    marginBottom: '6px',
    marginTop: '8px',
  },
  buttonRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '6px',
  },
  resultButton: {
    padding: '12px 0',
    fontSize: '14px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#000',
    minWidth: '44px',
    flex: '1 1 auto',
  },
  eventButton: {
    padding: '10px 12px',
    fontSize: '12px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#fff',
  },
  subButton: {
    padding: '8px 12px',
    fontSize: '11px',
    fontWeight: 'normal',
    border: '1px solid #444',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#aaa',
    backgroundColor: 'transparent',
  },
};
