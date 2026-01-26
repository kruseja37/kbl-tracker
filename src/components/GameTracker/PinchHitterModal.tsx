import { useState } from 'react';
import type {
  LineupState,
  BenchPlayer,
  PinchHitterEvent,
  HalfInning,
  Position,
} from '../../types/game';

interface PinchHitterModalProps {
  lineupState: LineupState;
  currentBatterId: string;
  currentBatterName: string;
  currentBatterPosition: Position;
  battingOrder: number;
  inning: number;
  halfInning: HalfInning;
  outs: number;
  gameId: string;
  opposingPitcher?: string;
  onComplete: (event: PinchHitterEvent) => void;
  onCancel: () => void;
}

export default function PinchHitterModal({
  lineupState,
  currentBatterId,
  currentBatterName,
  currentBatterPosition,
  battingOrder,
  inning,
  halfInning,
  outs,
  gameId,
  opposingPitcher,
  onComplete,
  onCancel,
}: PinchHitterModalProps) {
  // Form state
  const [selectedPH, setSelectedPH] = useState<BenchPlayer | null>(null);
  const [fieldingPosition, setFieldingPosition] = useState<Position>(currentBatterPosition);
  const [errors, setErrors] = useState<string[]>([]);

  // Get available bench players (non-pitchers preferred for PH)
  const availablePlayers = lineupState.bench.filter((p) => p.isAvailable);

  // Position options - includes P because pitchers CAN pinch hit in SMB4
  const positions: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];

  // Validate defensive alignment after pinch hit (BUG-001 fix)
  const validateDefensiveAlignment = (): string[] => {
    const validationErrors: string[] = [];
    const defensivePositions: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

    // Build post-sub position map: position -> player name
    const positionMap = new Map<Position, string>();

    // Add all current lineup players except the one being replaced
    for (const player of lineupState.lineup) {
      if (player.playerId !== currentBatterId && player.position !== 'DH') {
        if (positionMap.has(player.position)) {
          // This shouldn't happen if existing lineup is valid, but check anyway
          validationErrors.push(
            `Current lineup error: ${player.position} already has ${positionMap.get(player.position)}`
          );
        } else {
          positionMap.set(player.position, player.playerName);
        }
      }
    }

    // Add the pinch hitter at their new fielding position
    if (selectedPH && fieldingPosition !== 'DH') {
      if (positionMap.has(fieldingPosition)) {
        validationErrors.push(
          `Position conflict: ${fieldingPosition} is already occupied by ${positionMap.get(fieldingPosition)}. ` +
          `Either choose a different position for ${selectedPH.playerName}, or make a defensive substitution first.`
        );
      } else {
        positionMap.set(fieldingPosition, selectedPH.playerName);
      }
    }

    // Check for missing defensive positions (unless going to DH)
    if (fieldingPosition !== 'DH') {
      for (const pos of defensivePositions) {
        if (!positionMap.has(pos)) {
          validationErrors.push(
            `Missing position: No one will be playing ${pos}. Consider a defensive substitution to fill this position.`
          );
        }
      }
    }

    return validationErrors;
  };

  const handleConfirm = () => {
    const newErrors: string[] = [];

    if (!selectedPH) {
      newErrors.push('Please select a pinch hitter');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!selectedPH) return;

    // Validate defensive alignment (BUG-001 fix)
    const alignmentErrors = validateDefensiveAlignment();
    if (alignmentErrors.length > 0) {
      setErrors(alignmentErrors);
      return;
    }

    const event: PinchHitterEvent = {
      eventType: 'PINCH_HIT',
      gameId,
      inning,
      halfInning,
      outs,
      timestamp: Date.now(),
      replacedPlayerId: currentBatterId,
      replacedPlayerName: currentBatterName,
      replacedBattingOrder: battingOrder,
      pinchHitterId: selectedPH.playerId,
      pinchHitterName: selectedPH.playerName,
      fieldingPosition,
      pitcherFacing: opposingPitcher,
    };

    onComplete(event);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>🏏 PINCH HITTER</div>

        {/* Current Batter Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>BATTING FOR</div>
          <div style={styles.playerCard}>
            <div style={styles.playerName}>{currentBatterName}</div>
            <div style={styles.playerInfo}>
              #{battingOrder} in order • {currentBatterPosition}
            </div>
          </div>
        </div>

        {/* Select PH Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>SELECT PINCH HITTER</div>

          {availablePlayers.length === 0 ? (
            <div style={styles.noOptions}>No players available on bench</div>
          ) : (
            <div style={styles.playerList}>
              {availablePlayers.map((player) => (
                <button
                  key={player.playerId}
                  onClick={() => setSelectedPH(player)}
                  style={{
                    ...styles.playerOption,
                    ...(selectedPH?.playerId === player.playerId
                      ? styles.playerOptionSelected
                      : {}),
                  }}
                >
                  <div style={styles.playerOptionLeft}>
                    <div style={styles.playerOptionName}>{player.playerName}</div>
                    <div style={styles.playerOptionInfo}>
                      {player.positions.join(', ')}
                      {player.batterHand ? ` • ${player.batterHand} bat` : ''}
                    </div>
                  </div>
                  {selectedPH?.playerId === player.playerId && (
                    <span style={styles.checkmark}>✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Defensive Position Section */}
        {selectedPH && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>DEFENSIVE POSITION AFTER AT-BAT</div>
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
              {selectedPH.playerName} will play {fieldingPosition} after the at-bat
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
              opacity: !selectedPH ? 0.5 : 1,
            }}
            onClick={handleConfirm}
            disabled={!selectedPH}
          >
            Confirm Pinch Hitter
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
  playerCard: {
    backgroundColor: '#16213e',
    padding: '12px',
    borderRadius: '8px',
  },
  playerName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
  },
  playerInfo: {
    fontSize: '13px',
    color: '#888',
    marginTop: '4px',
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
  playerOptionLeft: {
    flex: 1,
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
