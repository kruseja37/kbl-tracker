import { useState } from 'react';
import type { GameEvent, Bases, Runner, EventResult } from '../../types/game';

interface EventFlowProps {
  event: GameEvent;
  bases: Bases;
  onComplete: (result: EventResult) => void;
  onCancel: () => void;
}

export default function EventFlow({ event, bases, onComplete, onCancel }: EventFlowProps) {
  const [selectedRunner, setSelectedRunner] = useState<'first' | 'second' | 'third' | null>(null);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null);

  interface OutcomeOption {
    id: string;
    value: 'ADVANCE' | 'SCORE' | 'OUT';
    label: string;
    toBase?: 'second' | 'third' | 'home';
  }

  const getRunnerName = (runner: Runner | null) => {
    if (!runner) return '';
    const parts = runner.playerName.split(' ');
    return parts[parts.length - 1];
  };

  // Get available runners based on event type
  const getAvailableRunners = (): ('first' | 'second' | 'third')[] => {
    const runners: ('first' | 'second' | 'third')[] = [];
    if (bases.first) runners.push('first');
    if (bases.second) runners.push('second');
    if (bases.third) runners.push('third');
    return runners;
  };

  // Get available outcomes based on event and runner
  const getAvailableOutcomes = (): OutcomeOption[] => {
    if (!selectedRunner) return [];

    if (event === 'CS' || event === 'PK') {
      // For caught stealing and pickoff, runner is out
      return [{ id: 'OUT', value: 'OUT', label: 'Out' }];
    }

    if (event === 'SB' || event === 'WP' || event === 'PB') {
      const outcomes: OutcomeOption[] = [];

      if (selectedRunner === 'third') {
        outcomes.push({ id: 'SCORE_HOME', value: 'SCORE', label: 'Scores', toBase: 'home' });
        if (event === 'SB') {
          outcomes.push({ id: 'OUT_HOME', value: 'OUT', label: 'Out at Home' });
        }
      } else if (selectedRunner === 'second') {
        outcomes.push({ id: 'ADVANCE_3B', value: 'ADVANCE', label: 'To 3rd', toBase: 'third' });
        outcomes.push({ id: 'SCORE_HOME', value: 'SCORE', label: 'Scores', toBase: 'home' });
        if (event === 'SB') {
          outcomes.push({ id: 'OUT', value: 'OUT', label: 'Out' });
        }
      } else {
        // first base
        outcomes.push({ id: 'ADVANCE_2B', value: 'ADVANCE', label: 'To 2nd', toBase: 'second' });
        outcomes.push({ id: 'ADVANCE_3B', value: 'ADVANCE', label: 'To 3rd', toBase: 'third' });
        if (event === 'SB') {
          outcomes.push({ id: 'OUT', value: 'OUT', label: 'Out' });
        }
      }

      return outcomes;
    }

    return [];
  };

  const canSubmit = () => {
    return selectedRunner !== null && selectedOutcomeId !== null;
  };

  const handleSubmit = () => {
    if (!selectedRunner || !selectedOutcomeId) return;
    const selectedOutcome = getAvailableOutcomes().find((outcome) => outcome.id === selectedOutcomeId);
    if (!selectedOutcome) return;

    onComplete({
      event,
      runner: selectedRunner,
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
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.eventBadge}>{getEventTitle()}</span>
          <button style={styles.cancelBtn} onClick={onCancel}>✕</button>
        </div>

        {/* Runner Selection */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>SELECT RUNNER:</div>
          <div style={styles.buttonRow}>
            {availableRunners.map(base => (
              <button
                key={base}
                style={{
                  ...styles.runnerButton,
                  backgroundColor: selectedRunner === base ? '#4CAF50' : '#333',
                  color: selectedRunner === base ? '#000' : '#fff',
                }}
                onClick={() => {
                  setSelectedRunner(base);
                  setSelectedOutcomeId(null);
                }}
              >
                {getRunnerName(bases[base])} ({base === 'first' ? '1B' : base === 'second' ? '2B' : '3B'})
              </button>
            ))}
          </div>
        </div>

        {/* Outcome Selection */}
        {selectedRunner && (
          <div style={styles.section}>
            <div style={styles.sectionLabel}>OUTCOME:</div>
            <div style={styles.buttonRow}>
              {getAvailableOutcomes().map(outcome => (
                <button
                  key={outcome.id}
                  style={{
                    ...styles.outcomeButton,
                    backgroundColor: selectedOutcomeId === outcome.id ? '#4CAF50' : '#333',
                    color: selectedOutcomeId === outcome.id ? '#000' : '#fff',
                  }}
                  onClick={() => setSelectedOutcomeId(outcome.id)}
                >
                  {outcome.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
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
