/**
 * Position Switch Modal
 * Allows swapping positions between players without removing them from the game.
 * Useful for mid-game defensive realignment.
 */

import { useState } from 'react';
import type {
  LineupState,
  PositionSwitchEvent,
  HalfInning,
  Position,
  LineupPlayer,
} from '../../types/game';

interface PositionSwitchModalProps {
  lineupState: LineupState;
  inning: number;
  halfInning: HalfInning;
  outs: number;
  gameId: string;
  onComplete: (event: PositionSwitchEvent) => void;
  onCancel: () => void;
}

interface PendingSwitch {
  player: LineupPlayer;
  newPosition: Position;
}

export default function PositionSwitchModal({
  lineupState,
  inning,
  halfInning,
  outs,
  gameId,
  onComplete,
  onCancel,
}: PositionSwitchModalProps) {
  const [pendingSwitches, setPendingSwitches] = useState<PendingSwitch[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<LineupPlayer | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Get players not yet having a pending switch
  const availablePlayers = lineupState.lineup.filter(
    (p) => !pendingSwitches.some((sw) => sw.player.playerId === p.playerId) && p.position !== 'DH'
  );

  // Position options (defensive positions only)
  const positions: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

  // Validate that after switches, all positions are covered
  const validateAlignment = (): string[] => {
    const validationErrors: string[] = [];
    const positionMap = new Map<Position, string>();

    // Build position map with switches applied
    for (const player of lineupState.lineup) {
      if (player.position === 'DH') continue;

      const pendingSwitch = pendingSwitches.find(sw => sw.player.playerId === player.playerId);
      const effectivePosition = pendingSwitch ? pendingSwitch.newPosition : player.position;

      if (positionMap.has(effectivePosition)) {
        validationErrors.push(
          `Duplicate position: ${effectivePosition} has both ${positionMap.get(effectivePosition)} and ${player.playerName}`
        );
      } else {
        positionMap.set(effectivePosition, player.playerName);
      }
    }

    // Check for missing positions
    for (const pos of positions) {
      if (!positionMap.has(pos)) {
        validationErrors.push(`Missing position: No one assigned to ${pos}`);
      }
    }

    return validationErrors;
  };

  const handleAddSwitch = () => {
    if (!selectedPlayer || !selectedPosition) {
      setErrors(['Please select a player and position']);
      return;
    }

    if (selectedPlayer.position === selectedPosition) {
      setErrors(['Player is already at this position']);
      return;
    }

    const newSwitches: PendingSwitch[] = [];

    // Add the primary switch
    newSwitches.push({
      player: selectedPlayer,
      newPosition: selectedPosition,
    });

    // AUTO-SWAP: Find who currently has the target position and swap them to the selected player's old position
    // This avoids requiring the user to manually add the reverse swap
    const playerAtTargetPosition = lineupState.lineup.find(
      (p) =>
        p.position === selectedPosition &&
        p.playerId !== selectedPlayer.playerId &&
        !pendingSwitches.some((sw) => sw.player.playerId === p.playerId)
    );

    if (playerAtTargetPosition) {
      // Check if this swap would conflict with an already-pending switch
      const alreadySwapped = pendingSwitches.some(
        (sw) => sw.newPosition === selectedPlayer.position
      );

      if (!alreadySwapped) {
        // Auto-add the reverse swap
        newSwitches.push({
          player: playerAtTargetPosition,
          newPosition: selectedPlayer.position,
        });
      }
    }

    setPendingSwitches([...pendingSwitches, ...newSwitches]);

    setSelectedPlayer(null);
    setSelectedPosition(null);
    setErrors([]);
  };

  const handleRemoveSwitch = (index: number) => {
    setPendingSwitches(pendingSwitches.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (pendingSwitches.length === 0) {
      setErrors(['Please add at least one position switch']);
      return;
    }

    const alignmentErrors = validateAlignment();
    if (alignmentErrors.length > 0) {
      setErrors(alignmentErrors);
      return;
    }

    const event: PositionSwitchEvent = {
      eventType: 'POS_SWITCH',
      gameId,
      inning,
      halfInning,
      outs,
      timestamp: Date.now(),
      switches: pendingSwitches.map((sw) => ({
        playerId: sw.player.playerId,
        playerName: sw.player.playerName,
        fromPosition: sw.player.position,
        toPosition: sw.newPosition,
      })),
    };

    onComplete(event);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>🔄 POSITION SWITCH</div>

        {/* Pending Switches */}
        {pendingSwitches.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>PENDING SWITCHES</div>
            <div style={styles.pendingList}>
              {pendingSwitches.map((sw, idx) => (
                <div key={idx} style={styles.pendingItem}>
                  <div style={styles.pendingText}>
                    <span style={styles.playerName}>{sw.player.playerName}</span>
                    <span style={styles.arrow}>
                      {' '}{sw.player.position} → {sw.newPosition}
                    </span>
                  </div>
                  <button
                    style={styles.removeButton}
                    onClick={() => handleRemoveSwitch(idx)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Switch */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            {pendingSwitches.length > 0 ? 'ADD ANOTHER SWITCH' : 'SELECT PLAYER AND NEW POSITION'}
          </div>

          {/* Player Selection */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Player</label>
            <div style={styles.playerList}>
              {availablePlayers.map((player) => (
                <button
                  key={player.playerId}
                  onClick={() => {
                    setSelectedPlayer(player);
                    setSelectedPosition(null);
                  }}
                  style={{
                    ...styles.playerOption,
                    ...(selectedPlayer?.playerId === player.playerId
                      ? styles.playerOptionSelected
                      : {}),
                  }}
                >
                  <div style={styles.playerOptionName}>
                    #{player.battingOrder} {player.playerName}
                  </div>
                  <div style={styles.playerOptionInfo}>
                    Currently: {player.position}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Position Selection */}
          {selectedPlayer && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>New Position</label>
              <div style={styles.positionGrid}>
                {positions.map((pos) => {
                  const isCurrentPosition = selectedPlayer.position === pos;
                  return (
                    <button
                      key={pos}
                      onClick={() => !isCurrentPosition && setSelectedPosition(pos)}
                      style={{
                        ...styles.positionButton,
                        ...(selectedPosition === pos ? styles.positionButtonSelected : {}),
                        ...(isCurrentPosition ? styles.positionButtonDisabled : {}),
                      }}
                      disabled={isCurrentPosition}
                      title={isCurrentPosition ? 'Current position' : undefined}
                    >
                      {pos}
                      {isCurrentPosition && <span style={styles.currentBadge}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add Button */}
          {selectedPlayer && selectedPosition && (
            <button style={styles.addButton} onClick={handleAddSwitch}>
              + Add Switch
            </button>
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
              opacity: pendingSwitches.length === 0 ? 0.5 : 1,
            }}
            onClick={handleConfirm}
            disabled={pendingSwitches.length === 0}
          >
            Confirm Switch{pendingSwitches.length !== 1 ? 'es' : ''}
            {pendingSwitches.length > 0 ? ` (${pendingSwitches.length})` : ''}
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
  pendingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  pendingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#16213e',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #4CAF50',
  },
  pendingText: {
    fontSize: '14px',
    color: '#fff',
  },
  playerName: {
    fontWeight: 'bold',
  },
  arrow: {
    color: '#4CAF50',
    marginLeft: '8px',
  },
  removeButton: {
    background: 'none',
    border: 'none',
    color: '#f44336',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px 8px',
  },
  inputGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    color: '#888',
    marginBottom: '8px',
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
    padding: '10px 12px',
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
  },
  playerOptionInfo: {
    fontSize: '12px',
    color: '#888',
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
    position: 'relative',
  },
  positionButtonSelected: {
    backgroundColor: '#0f3460',
    borderColor: '#4CAF50',
  },
  positionButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  currentBadge: {
    position: 'absolute',
    top: '2px',
    right: '4px',
    fontSize: '10px',
    color: '#4CAF50',
  },
  addButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#16213e',
    border: '1px dashed #4CAF50',
    borderRadius: '8px',
    color: '#4CAF50',
    cursor: 'pointer',
    fontSize: '14px',
    marginTop: '8px',
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
