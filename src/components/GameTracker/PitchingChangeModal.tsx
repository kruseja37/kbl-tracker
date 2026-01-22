import { useState } from 'react';
import type {
  LineupState,
  BenchPlayer,
  PitchingChangeEvent,
  HalfInning,
  Bases,
} from '../../types/game';

interface PitchingChangeModalProps {
  lineupState: LineupState;
  bases: Bases;
  inning: number;
  halfInning: HalfInning;
  outs: number;
  gameId: string;
  onComplete: (event: PitchingChangeEvent) => void;
  onCancel: () => void;
}

export default function PitchingChangeModal({
  lineupState,
  bases,
  inning,
  halfInning,
  outs,
  gameId,
  onComplete,
  onCancel,
}: PitchingChangeModalProps) {
  const currentPitcher = lineupState.currentPitcher;

  // Form state
  const [pitchCount, setPitchCount] = useState<string>('');
  const [selectedReliever, setSelectedReliever] = useState<BenchPlayer | null>(null);
  const [pitcherRole, setPitcherRole] = useState<'SP' | 'RP' | 'CL'>('RP');

  // Validation
  const [errors, setErrors] = useState<string[]>([]);

  // Get available pitchers from bench
  const availablePitchers = lineupState.bench.filter(
    (p) => p.isAvailable && p.positions.includes('P')
  );

  // Calculate bequeathed runners (runners currently on base)
  const bequeathedRunners: PitchingChangeEvent['bequeathedRunners'] = [];
  if (bases.first) {
    bequeathedRunners.push({
      base: '1B',
      runnerId: bases.first.playerId,
      runnerName: bases.first.playerName,
      howReached: bases.first.howReached || 'hit', // Use actual reach method if tracked
    });
  }
  if (bases.second) {
    bequeathedRunners.push({
      base: '2B',
      runnerId: bases.second.playerId,
      runnerName: bases.second.playerName,
      howReached: bases.second.howReached || 'hit',
    });
  }
  if (bases.third) {
    bequeathedRunners.push({
      base: '3B',
      runnerId: bases.third.playerId,
      runnerName: bases.third.playerName,
      howReached: bases.third.howReached || 'hit',
    });
  }

  const handleConfirm = () => {
    const newErrors: string[] = [];

    // Validate pitch count
    const pc = parseInt(pitchCount, 10);
    if (isNaN(pc) || pc < 0) {
      newErrors.push('Please enter a valid pitch count');
    }

    // Validate reliever selection
    if (!selectedReliever) {
      newErrors.push('Please select an incoming pitcher');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!currentPitcher || !selectedReliever) return;

    const event: PitchingChangeEvent = {
      eventType: 'PITCH_CHANGE',
      gameId,
      inning,
      halfInning,
      outs,
      timestamp: Date.now(),
      outgoingPitcherId: currentPitcher.playerId,
      outgoingPitcherName: currentPitcher.playerName,
      outgoingPitchCount: pc,
      bequeathedRunners,
      incomingPitcherId: selectedReliever.playerId,
      incomingPitcherName: selectedReliever.playerName,
      incomingPitcherRole: pitcherRole,
      inheritedRunners: bequeathedRunners.length,
    };

    onComplete(event);
  };

  if (!currentPitcher) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.header}>Error</div>
          <div style={styles.body}>No current pitcher found</div>
          <button style={styles.cancelButton} onClick={onCancel}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>⚾ PITCHING CHANGE</div>

        {/* Outgoing Pitcher Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>OUTGOING PITCHER</div>
          <div style={styles.pitcherCard}>
            <div style={styles.pitcherName}>{currentPitcher.playerName}</div>
            <div style={styles.pitcherInfo}>
              Entered: {currentPitcher.isStarter ? 'Started' : `Inning ${currentPitcher.enteredInning}`}
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Pitch Count (REQUIRED)</label>
            <input
              type="number"
              value={pitchCount}
              onChange={(e) => setPitchCount(e.target.value)}
              style={styles.input}
              placeholder="Enter pitch count"
              min="0"
              max="200"
            />
          </div>

          {bequeathedRunners.length > 0 && (
            <div style={styles.runnersWarning}>
              ⚠️ Runners left on base: {bequeathedRunners.length}
              <div style={styles.runnersDetail}>
                {bequeathedRunners.map((r) => (
                  <span key={r.base} style={styles.runnerBadge}>
                    {r.base}: {r.runnerName}
                  </span>
                ))}
              </div>
              <div style={styles.runnersNote}>
                These runners will be charged to {currentPitcher.playerName} if they score.
              </div>
            </div>
          )}
        </div>

        {/* Incoming Pitcher Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>SELECT INCOMING PITCHER</div>

          {availablePitchers.length === 0 ? (
            <div style={styles.noOptions}>No pitchers available on bench</div>
          ) : (
            <div style={styles.playerList}>
              {availablePitchers.map((pitcher) => (
                <button
                  key={pitcher.playerId}
                  onClick={() => setSelectedReliever(pitcher)}
                  style={{
                    ...styles.playerOption,
                    ...(selectedReliever?.playerId === pitcher.playerId
                      ? styles.playerOptionSelected
                      : {}),
                  }}
                >
                  <div style={styles.playerOptionName}>{pitcher.playerName}</div>
                  <div style={styles.playerOptionInfo}>
                    {pitcher.batterHand ? `${pitcher.batterHand} ` : ''}Pitcher
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedReliever && (
            <div style={styles.roleSelection}>
              <label style={styles.label}>Pitcher Role</label>
              <div style={styles.roleButtons}>
                {(['RP', 'CL'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => setPitcherRole(role)}
                    style={{
                      ...styles.roleButton,
                      ...(pitcherRole === role ? styles.roleButtonSelected : {}),
                    }}
                  >
                    {role === 'RP' ? 'Reliever' : 'Closer'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div style={styles.errorBox}>
            {errors.map((err, i) => (
              <div key={i} style={styles.errorText}>
                ❌ {err}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          <button style={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
          <button
            style={{
              ...styles.confirmButton,
              opacity: !selectedReliever || !pitchCount ? 0.5 : 1,
            }}
            onClick={handleConfirm}
            disabled={!selectedReliever || !pitchCount}
          >
            Confirm Pitching Change
          </button>
        </div>
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#1a1a2e',
    borderRadius: '16px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    border: '1px solid #333',
  },
  header: {
    backgroundColor: '#0f3460',
    padding: '16px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    borderBottom: '1px solid #333',
  },
  section: {
    padding: '16px',
    borderBottom: '1px solid #333',
  },
  sectionHeader: {
    fontSize: '12px',
    color: '#888',
    letterSpacing: '1px',
    marginBottom: '12px',
  },
  pitcherCard: {
    backgroundColor: '#16213e',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  pitcherName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
  },
  pitcherInfo: {
    fontSize: '13px',
    color: '#888',
    marginTop: '4px',
  },
  inputGroup: {
    marginBottom: '12px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    color: '#888',
    marginBottom: '4px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#16213e',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '16px',
    boxSizing: 'border-box',
  },
  runnersWarning: {
    backgroundColor: '#3d2914',
    border: '1px solid #f57c00',
    borderRadius: '8px',
    padding: '12px',
    marginTop: '12px',
  },
  runnersDetail: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
    flexWrap: 'wrap',
  },
  runnerBadge: {
    backgroundColor: '#16213e',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#fff',
  },
  runnersNote: {
    fontSize: '11px',
    color: '#f57c00',
    marginTop: '8px',
    fontStyle: 'italic',
  },
  noOptions: {
    color: '#666',
    fontSize: '14px',
    textAlign: 'center',
    padding: '20px',
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  playerOption: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#16213e',
    border: '1px solid #333',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#fff',
    textAlign: 'left',
  },
  playerOptionSelected: {
    backgroundColor: '#0f3460',
    borderColor: '#4CAF50',
  },
  playerOptionName: {
    fontSize: '14px',
    fontWeight: 'bold',
  },
  playerOptionInfo: {
    fontSize: '12px',
    color: '#888',
  },
  roleSelection: {
    marginTop: '16px',
  },
  roleButtons: {
    display: 'flex',
    gap: '8px',
  },
  roleButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#16213e',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
  },
  roleButtonSelected: {
    backgroundColor: '#0f3460',
    borderColor: '#4CAF50',
  },
  errorBox: {
    margin: '0 16px 16px',
    backgroundColor: '#3d1414',
    border: '1px solid #f44336',
    borderRadius: '8px',
    padding: '12px',
  },
  errorText: {
    color: '#f44336',
    fontSize: '13px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
  },
  cancelButton: {
    flex: 1,
    padding: '14px',
    backgroundColor: 'transparent',
    border: '1px solid #666',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
  },
  confirmButton: {
    flex: 2,
    padding: '14px',
    backgroundColor: '#4CAF50',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
};
