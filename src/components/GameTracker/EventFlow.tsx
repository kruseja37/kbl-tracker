import { useReducer } from 'react';
import type { GameEvent, Bases, Runner, EventResult } from '../../types/game';
import { BaseKey, getEventOutcomes } from './atBatLogic';

interface EventFlowProps {
  event: GameEvent;
  bases: Bases;
  onComplete: (result: EventResult) => void;
  onCancel: () => void;
}

export default function EventFlow({ event, bases, onComplete, onCancel }: EventFlowProps) {
  type EventFlowState = {
    selectedRunner: BaseKey | null;
    selectedOutcomeId: string | null;
  };

  type EventFlowAction =
    | { type: 'SET_RUNNER'; runner: BaseKey }
    | { type: 'SET_OUTCOME'; outcomeId: string };

  const initialState: EventFlowState = { selectedRunner: null, selectedOutcomeId: null };

  const reducer = (state: EventFlowState, action: EventFlowAction): EventFlowState => {
    switch (action.type) {
      case 'SET_RUNNER':
        return { selectedRunner: action.runner, selectedOutcomeId: null };
      case 'SET_OUTCOME':
        return { ...state, selectedOutcomeId: action.outcomeId };
      default:
        return state;
    }
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  const getRunnerName = (runner: Runner | null) => {
    if (!runner) return '';
    const parts = runner.playerName.split(' ');
    return parts[parts.length - 1];
  };

  // Get available runners based on event type
  const getAvailableRunners = (): BaseKey[] => {
    const runners: BaseKey[] = [];
    if (bases.first) runners.push('first');
    if (bases.second) runners.push('second');
    if (bases.third) runners.push('third');
    return runners;
  };

  const canSubmit = () => state.selectedRunner !== null && state.selectedOutcomeId !== null;

  const outcomeOptions = state.selectedRunner ? getEventOutcomes(event, state.selectedRunner, bases) : [];

  const handleSubmit = () => {
    if (!state.selectedRunner || !state.selectedOutcomeId) return;
    const selectedOutcome = outcomeOptions.find((outcome) => outcome.id === state.selectedOutcomeId);
    if (!selectedOutcome) return;

    onComplete({
      event,
      runner: state.selectedRunner,
      outcome: selectedOutcome.value,
      toBase: selectedOutcome.toBase,
    });
  };

  const getEventTitle = () => {
    switch (event) {
      case 'SB': return 'Stolen Base';
      case 'CS': return 'Caught Stealing';
      case 'WP': return 'Wild Pitch';
      case 'PB': return 'Passed Ball';
      case 'PK': return 'Pickoff';
      default: return event;
    }
  };

  const availableRunners = getAvailableRunners();

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <span style={styles.eventBadge}>{getEventTitle()}</span>
          <button style={styles.cancelBtn} onClick={onCancel}>✕</button>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionLabel}>SELECT RUNNER:</div>
          <div style={styles.buttonRow}>
            {availableRunners.map(base => (
              <button
                key={base}
                style={{
                  ...styles.runnerButton,
                  backgroundColor: state.selectedRunner === base ? '#4CAF50' : '#333',
                  color: state.selectedRunner === base ? '#000' : '#fff',
                }}
                onClick={() => dispatch({ type: 'SET_RUNNER', runner: base })}
              >
                {getRunnerName(bases[base])} ({base === 'first' ? '1B' : base === 'second' ? '2B' : '3B'})
              </button>
            ))}
          </div>
        </div>

        {state.selectedRunner && (
          <div style={styles.section}>
            <div style={styles.sectionLabel}>OUTCOME:</div>
            <div style={styles.buttonRow}>
              {outcomeOptions.map(outcome => (
                <button
                  key={outcome.id}
                  style={{
                    ...styles.outcomeButton,
                    backgroundColor: state.selectedOutcomeId === outcome.id ? '#4CAF50' : '#333',
                    color: state.selectedOutcomeId === outcome.id ? '#000' : '#fff',
                  }}
                  onClick={() => dispatch({ type: 'SET_OUTCOME', outcomeId: outcome.id })}
                >
                  {outcome.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          style={{
            ...styles.submitButton,
            opacity: canSubmit() ? 1 : 0.5,
          }}
          onClick={handleSubmit}
          disabled={!canSubmit()}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#1a1a2e',
    borderRadius: '12px',
    padding: '16px',
    width: '100%',
    maxWidth: '400px',
    border: '1px solid #333',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #333',
  },
  eventBadge: {
    backgroundColor: '#FF9800',
    color: '#000',
    padding: '6px 12px',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  cancelBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  section: {
    marginBottom: '16px',
  },
  sectionLabel: {
    fontSize: '11px',
    color: '#888',
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  buttonRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  runnerButton: {
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    flex: 1,
    minWidth: '100px',
  },
  outcomeButton: {
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    flex: 1,
  },
  submitButton: {
    width: '100%',
    padding: '16px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#4CAF50',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '8px',
  },
};
