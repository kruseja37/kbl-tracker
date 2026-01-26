import { useState } from 'react';
import type {
  LineupState,
  BenchPlayer,
  DefensiveSubEvent,
  HalfInning,
  Position,
  LineupPlayer,
} from '../../types/game';

interface DefensiveSubModalProps {
  lineupState: LineupState;
  inning: number;
  halfInning: HalfInning;
  outs: number;
  gameId: string;
  onComplete: (event: DefensiveSubEvent) => void;
  onCancel: () => void;
}

interface PendingSub {
  playerOut: LineupPlayer;
  playerIn: BenchPlayer;
  position: Position;
}

export default function DefensiveSubModal({
  lineupState,
  inning,
  halfInning,
  outs,
  gameId,
  onComplete,
  onCancel,
}: DefensiveSubModalProps) {
  // Form state
  const [pendingSubs, setPendingSubs] = useState<PendingSub[]>([]);
  const [selectedPlayerOut, setSelectedPlayerOut] = useState<LineupPlayer | null>(null);
  const [selectedPlayerIn, setSelectedPlayerIn] = useState<BenchPlayer | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Get players not yet being subbed out
  const availableLineupPlayers = lineupState.lineup.filter(
    (p) => !pendingSubs.some((sub) => sub.playerOut.playerId === p.playerId)
  );

  // Get bench players not yet being subbed in
  const availableBenchPlayers = lineupState.bench.filter(
    (p) => p.isAvailable && !pendingSubs.some((sub) => sub.playerIn.playerId === p.playerId)
  );

  // Position options (includes DH for SMB4 DH-enabled games)
  const positions: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];

  const handleAddSub = () => {
    if (!selectedPlayerOut || !selectedPlayerIn || !selectedPosition) {
      setErrors(['Please select player out, player in, and position']);
      return;
    }

    setPendingSubs([
      ...pendingSubs,
      {
        playerOut: selectedPlayerOut,
        playerIn: selectedPlayerIn,
        position: selectedPosition,
      },
    ]);

    // Reset form for another sub
    setSelectedPlayerOut(null);
    setSelectedPlayerIn(null);
    setSelectedPosition(null);
    setErrors([]);
  };

  const handleRemoveSub = (index: number) => {
    setPendingSubs(pendingSubs.filter((_, i) => i !== index));
  };

  // Validate defensive alignment after substitutions (BUG-001, BUG-002 fix)
  const validateDefensiveAlignment = (): string[] => {
    const validationErrors: string[] = [];
    const defensivePositions: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

    // Build the post-sub position map: position -> player name
    const positionMap = new Map<Position, string>();

    // First, add all current lineup players (except those being subbed out)
    for (const player of lineupState.lineup) {
      const isBeingSubbedOut = pendingSubs.some(sub => sub.playerOut.playerId === player.playerId);
      if (!isBeingSubbedOut && player.position !== 'DH') {
        // Check for duplicate before adding
        if (positionMap.has(player.position)) {
          validationErrors.push(
            `Duplicate position: ${player.position} has both ${positionMap.get(player.position)} and ${player.playerName}`
          );
        } else {
          positionMap.set(player.position, player.playerName);
        }
      }
    }

    // Add the incoming players at their new positions
    for (const sub of pendingSubs) {
      if (sub.position !== 'DH') {
        if (positionMap.has(sub.position)) {
          validationErrors.push(
            `Duplicate position: ${sub.position} will have both ${positionMap.get(sub.position)} and ${sub.playerIn.playerName}`
          );
        } else {
          positionMap.set(sub.position, sub.playerIn.playerName);
        }
      }
    }

    // Check for missing defensive positions
    for (const pos of defensivePositions) {
      if (!positionMap.has(pos)) {
        validationErrors.push(`Missing position: No one assigned to ${pos}`);
      }
    }

    return validationErrors;
  };

  const handleConfirm = () => {
    if (pendingSubs.length === 0) {
      setErrors(['Please add at least one substitution']);
      return;
    }

    // Validate defensive alignment before confirming (BUG-001, BUG-002 fix)
    const alignmentErrors = validateDefensiveAlignment();
    if (alignmentErrors.length > 0) {
      setErrors(alignmentErrors);
      return;
    }

    const event: DefensiveSubEvent = {
      eventType: 'DEF_SUB',
      gameId,
      inning,
      halfInning,
      outs,
      timestamp: Date.now(),
      substitutions: pendingSubs.map((sub) => ({
        playerOutId: sub.playerOut.playerId,
        playerOutName: sub.playerOut.playerName,
        playerInId: sub.playerIn.playerId,
        playerInName: sub.playerIn.playerName,
        position: sub.position,
        battingOrder: sub.playerOut.battingOrder,
      })),
    };

    onComplete(event);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>🛡️ DEFENSIVE SUBSTITUTION</div>

        {/* Pending Subs */}
        {pendingSubs.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>PENDING CHANGES</div>
            <div style={styles.pendingList}>
              {pendingSubs.map((sub, idx) => (
                <div key={idx} style={styles.pendingItem}>
                  <div style={styles.pendingText}>
                    <span style={styles.outName}>{sub.playerOut.playerName}</span>
                    <span style={styles.arrow}> → </span>
                    <span style={styles.inName}>{sub.playerIn.playerName}</span>
                    <span style={styles.posLabel}> at {sub.position}</span>
                  </div>
                  <button
                    style={styles.removeButton}
                    onClick={() => handleRemoveSub(idx)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Sub */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            {pendingSubs.length > 0 ? 'ADD ANOTHER SUBSTITUTION' : 'ADD SUBSTITUTION'}
          </div>

          {/* Player Out */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Player OUT</label>
            <div style={styles.playerList}>
              {availableLineupPlayers.map((player) => (
                <button
                  key={player.playerId}
                  onClick={() => {
                    setSelectedPlayerOut(player);
                    setSelectedPosition(player.position);
                  }}
                  style={{
                    ...styles.playerOption,
                    ...(selectedPlayerOut?.playerId === player.playerId
                      ? styles.playerOptionSelected
                      : {}),
                  }}
                >
                  <div style={styles.playerOptionName}>
                    #{player.battingOrder} {player.playerName}
                  </div>
                  <div style={styles.playerOptionInfo}>{player.position}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Player In */}
          {selectedPlayerOut && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Player IN</label>
              {availableBenchPlayers.length === 0 ? (
                <div style={styles.noOptions}>No players available on bench</div>
              ) : (
                <div style={styles.playerList}>
                  {availableBenchPlayers.map((player) => (
                    <button
                      key={player.playerId}
                      onClick={() => setSelectedPlayerIn(player)}
                      style={{
                        ...styles.playerOption,
                        ...(selectedPlayerIn?.playerId === player.playerId
                          ? styles.playerOptionSelected
                          : {}),
                      }}
                    >
                      <div style={styles.playerOptionName}>{player.playerName}</div>
                      <div style={styles.playerOptionInfo}>
                        {player.positions.join(', ')}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Position */}
          {selectedPlayerOut && selectedPlayerIn && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Position</label>
              <div style={styles.positionGrid}>
                {positions.map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setSelectedPosition(pos)}
                    style={{
                      ...styles.positionButton,
                      ...(selectedPosition === pos ? styles.positionButtonSelected : {}),
                    }}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add Button */}
          {selectedPlayerOut && selectedPlayerIn && selectedPosition && (
            <button style={styles.addButton} onClick={handleAddSub}>
              + Add Substitution
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
              opacity: pendingSubs.length === 0 ? 0.5 : 1,
            }}
            onClick={handleConfirm}
            disabled={pendingSubs.length === 0}
          >
            Confirm {pendingSubs.length > 0 ? `(${pendingSubs.length})` : ''} Substitution
            {pendingSubs.length !== 1 ? 's' : ''}
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
  },
  outName: {
    color: '#f44336',
  },
  arrow: {
    color: '#888',
  },
  inName: {
    color: '#4CAF50',
  },
  posLabel: {
    color: '#888',
    fontSize: '12px',
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
    maxHeight: '150px',
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
  },
  positionButtonSelected: {
    backgroundColor: '#0f3460',
    borderColor: '#4CAF50',
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
