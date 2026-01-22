import { useState } from 'react';
import type {
  LineupState,
  BenchPlayer,
  PinchRunnerEvent,
  HalfInning,
  Position,
  Bases,
  Runner,
} from '../../types/game';

interface PinchRunnerModalProps {
  lineupState: LineupState;
  bases: Bases;
  inning: number;
  halfInning: HalfInning;
  outs: number;
  gameId: string;
  currentPitcherId?: string;  // Current pitcher for non-inherited runners
  onComplete: (event: PinchRunnerEvent) => void;
  onCancel: () => void;
}

interface RunnerOption {
  base: '1B' | '2B' | '3B';
  runner: Runner;
  lineupInfo?: {
    playerId: string;
    battingOrder: number;
    position: Position;
  };
}

export default function PinchRunnerModal({
  lineupState,
  bases,
  inning,
  halfInning,
  outs,
  gameId,
  currentPitcherId,
  onComplete,
  onCancel,
}: PinchRunnerModalProps) {
  // Build list of runners that can be replaced
  const runnerOptions: RunnerOption[] = [];
  if (bases.first) {
    const lineupPlayer = lineupState.lineup.find((p) => p.playerId === bases.first?.playerId);
    runnerOptions.push({
      base: '1B',
      runner: bases.first,
      lineupInfo: lineupPlayer
        ? {
            playerId: lineupPlayer.playerId,
            battingOrder: lineupPlayer.battingOrder,
            position: lineupPlayer.position,
          }
        : undefined,
    });
  }
  if (bases.second) {
    const lineupPlayer = lineupState.lineup.find((p) => p.playerId === bases.second?.playerId);
    runnerOptions.push({
      base: '2B',
      runner: bases.second,
      lineupInfo: lineupPlayer
        ? {
            playerId: lineupPlayer.playerId,
            battingOrder: lineupPlayer.battingOrder,
            position: lineupPlayer.position,
          }
        : undefined,
    });
  }
  if (bases.third) {
    const lineupPlayer = lineupState.lineup.find((p) => p.playerId === bases.third?.playerId);
    runnerOptions.push({
      base: '3B',
      runner: bases.third,
      lineupInfo: lineupPlayer
        ? {
            playerId: lineupPlayer.playerId,
            battingOrder: lineupPlayer.battingOrder,
            position: lineupPlayer.position,
          }
        : undefined,
    });
  }

  // Form state
  const [selectedRunner, setSelectedRunner] = useState<RunnerOption | null>(null);
  const [selectedPR, setSelectedPR] = useState<BenchPlayer | null>(null);
  const [fieldingPosition, setFieldingPosition] = useState<Position>('LF');
  const [errors, setErrors] = useState<string[]>([]);

  // Get available bench players
  const availablePlayers = lineupState.bench.filter((p) => p.isAvailable);

  // Position options (includes DH for SMB4 DH-enabled games)
  const positions: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];

  const handleConfirm = () => {
    const newErrors: string[] = [];

    if (!selectedRunner) {
      newErrors.push('Please select a runner to replace');
    }

    if (!selectedPR) {
      newErrors.push('Please select a pinch runner');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!selectedRunner || !selectedPR || !selectedRunner.lineupInfo) return;

    // Determine pitcher responsible: use inheritedFrom if present, otherwise current pitcher
    const pitcherResponsible = selectedRunner.runner.inheritedFrom || currentPitcherId || 'unknown';

    const event: PinchRunnerEvent = {
      eventType: 'PINCH_RUN',
      gameId,
      inning,
      halfInning,
      outs,
      timestamp: Date.now(),
      replacedPlayerId: selectedRunner.runner.playerId,
      replacedPlayerName: selectedRunner.runner.playerName,
      replacedBattingOrder: selectedRunner.lineupInfo.battingOrder,
      base: selectedRunner.base,
      pinchRunnerId: selectedPR.playerId,
      pinchRunnerName: selectedPR.playerName,
      fieldingPosition,
      // CRITICAL: Inherit pitcher responsibility
      pitcherResponsible,
      howOriginalReached: selectedRunner.runner.howReached || 'hit',
    };

    onComplete(event);
  };

  if (runnerOptions.length === 0) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.header}>🏃 PINCH RUNNER</div>
          <div style={styles.section}>
            <div style={styles.noOptions}>No runners on base</div>
          </div>
          <div style={styles.actions}>
            <button style={styles.cancelButton} onClick={onCancel}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>🏃 PINCH RUNNER</div>

        {/* Select Runner to Replace */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>SELECT RUNNER TO REPLACE</div>
          <div style={styles.playerList}>
            {runnerOptions.map((option) => (
              <button
                key={option.base}
                onClick={() => {
                  setSelectedRunner(option);
                  if (option.lineupInfo) {
                    setFieldingPosition(option.lineupInfo.position);
                  }
                }}
                style={{
                  ...styles.playerOption,
                  ...(selectedRunner?.base === option.base ? styles.playerOptionSelected : {}),
                }}
              >
                <div style={styles.playerOptionLeft}>
                  <div style={styles.baseBadge}>{option.base}</div>
                </div>
                <div style={styles.playerOptionCenter}>
                  <div style={styles.playerOptionName}>{option.runner.playerName}</div>
                  <div style={styles.playerOptionInfo}>
                    {option.lineupInfo
                      ? `#${option.lineupInfo.battingOrder} • ${option.lineupInfo.position}`
                      : 'Unknown'}
                  </div>
                </div>
                {selectedRunner?.base === option.base && (
                  <span style={styles.checkmark}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Select Pinch Runner */}
        {selectedRunner && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>SELECT PINCH RUNNER</div>
            {availablePlayers.length === 0 ? (
              <div style={styles.noOptions}>No players available on bench</div>
            ) : (
              <div style={styles.playerList}>
                {availablePlayers.map((player) => (
                  <button
                    key={player.playerId}
                    onClick={() => setSelectedPR(player)}
                    style={{
                      ...styles.playerOption,
                      ...(selectedPR?.playerId === player.playerId
                        ? styles.playerOptionSelected
                        : {}),
                    }}
                  >
                    <div style={styles.playerOptionLeft}>
                      <div style={styles.playerOptionName}>{player.playerName}</div>
                      <div style={styles.playerOptionInfo}>
                        {player.positions.join(', ')}
                      </div>
                    </div>
                    {selectedPR?.playerId === player.playerId && (
                      <span style={styles.checkmark}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Inherited runner warning */}
            {selectedRunner.runner.inheritedFrom && (
              <div style={styles.inheritedWarning}>
                ⚠️ If this runner scores, the run is charged to the pitcher who allowed them
                to reach base, NOT the current pitcher.
              </div>
            )}
          </div>
        )}

        {/* Defensive Position */}
        {selectedRunner && selectedPR && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>DEFENSIVE POSITION AFTER INNING</div>
            <div style={styles.positionGrid}>
              {positions.map((pos) => (
                <button
                  key={pos}
                  onClick={() => setFieldingPosition(pos)}
                  style={{
                    ...styles.positionButton,
                    ...(fieldingPosition === pos ? styles.positionButtonSelected : {}),
                  }}
                >
                  {pos}
                </button>
              ))}
            </div>
            <div style={styles.positionNote}>
              {selectedPR.playerName} will play {fieldingPosition} when the team takes the field
            </div>
          </div>
        )}

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
              opacity: !selectedRunner || !selectedPR ? 0.5 : 1,
            }}
            onClick={handleConfirm}
            disabled={!selectedRunner || !selectedPR}
          >
            Confirm Pinch Runner
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
    maxHeight: '200px',
    overflow: 'auto',
  },
  playerOption: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#16213e',
    border: '1px solid #333',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#fff',
    textAlign: 'left',
    gap: '12px',
  },
  playerOptionSelected: {
    backgroundColor: '#0f3460',
    borderColor: '#4CAF50',
  },
  playerOptionLeft: {
    flex: 0,
  },
  playerOptionCenter: {
    flex: 1,
  },
  baseBadge: {
    backgroundColor: '#FF9800',
    color: '#000',
    padding: '6px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  playerOptionName: {
    fontSize: '14px',
    fontWeight: 'bold',
  },
  playerOptionInfo: {
    fontSize: '12px',
    color: '#888',
    marginTop: '2px',
  },
  checkmark: {
    color: '#4CAF50',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  inheritedWarning: {
    backgroundColor: '#3d2914',
    border: '1px solid #f57c00',
    borderRadius: '8px',
    padding: '12px',
    marginTop: '12px',
    fontSize: '12px',
    color: '#f57c00',
  },
  positionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '8px',
  },
  positionButton: {
    padding: '10px',
    backgroundColor: '#16213e',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  positionButtonSelected: {
    backgroundColor: '#0f3460',
    borderColor: '#4CAF50',
  },
  positionNote: {
    fontSize: '12px',
    color: '#888',
    marginTop: '12px',
    textAlign: 'center',
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
