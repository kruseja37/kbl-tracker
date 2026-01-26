/**
 * DoubleSwitchModal - Double switch substitution interface
 * Per Ralph Framework S-B013, S-B014
 *
 * A double switch is:
 * 1. Pitching change AND
 * 2. Position swap to change batting order
 *
 * Purpose: Avoid having the new pitcher bat soon
 */

import { useState, useMemo } from 'react';
import type { LineupPlayer } from '../../types/game';

interface BullpenPitcher {
  id: string;
  name: string;
  era: number;
  role: 'SP' | 'RP' | 'CL';
  pitchCount?: number;
}

interface BenchPlayer {
  id: string;
  name: string;
  positions: string[];
  avg?: number;
}

interface DoubleSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: DoubleSwitchData) => void;
  currentPitcher: { id: string; name: string; pitchCount: number; ip: string };
  lineup: LineupPlayer[];
  bullpen: BullpenPitcher[];
  bench: BenchPlayer[];
  currentInning: number;
}

interface DoubleSwitchData {
  // Pitching change
  outgoingPitcherId: string;
  outgoingPitcherName: string;
  outgoingPitchCount: number;
  incomingPitcherId: string;
  incomingPitcherName: string;
  // Position swap
  positionPlayerOutId: string;
  positionPlayerOutName: string;
  positionPlayerOutOrder: number;
  positionPlayerInId: string;
  positionPlayerInName: string;
  positionPlayerInPosition: string;
  // New batting order assignments
  newPitcherBattingOrder: number;
  newPositionPlayerBattingOrder: number;
}

export default function DoubleSwitchModal({
  isOpen,
  onClose,
  onConfirm,
  currentPitcher,
  lineup,
  bullpen,
  bench,
  currentInning,
}: DoubleSwitchModalProps) {
  // Step 1: Select reliever
  const [selectedReliever, setSelectedReliever] = useState<string>('');
  // Step 2: Select position player leaving
  const [positionPlayerOut, setPositionPlayerOut] = useState<string>('');
  // Step 3: Select bench player entering
  const [positionPlayerIn, setPositionPlayerIn] = useState<string>('');
  // Step 4: Select batting order swap
  const [pitcherNewOrder, setPitcherNewOrder] = useState<number>(0);

  // Get pitcher's current batting order
  const pitcherLineupSpot = useMemo(() => {
    return lineup.find(p => p.position === 'P');
  }, [lineup]);

  // Get non-pitcher position players
  const positionPlayers = useMemo(() => {
    return lineup.filter(p => p.position !== 'P');
  }, [lineup]);

  // Get selected position player's info
  const selectedPosPlayerOut = useMemo(() => {
    return lineup.find(p => p.playerId === positionPlayerOut);
  }, [lineup, positionPlayerOut]);

  // Calculate new batting orders
  const swapPreview = useMemo(() => {
    if (!pitcherLineupSpot || !selectedPosPlayerOut || !pitcherNewOrder) return null;

    const currentPitcherOrder = pitcherLineupSpot.battingOrder;
    const currentPosPlayerOrder = selectedPosPlayerOut.battingOrder;

    // Pitcher takes the position player's spot
    // Position player (new one) takes the pitcher's spot
    if (pitcherNewOrder === currentPosPlayerOrder) {
      return {
        pitcherOrder: currentPosPlayerOrder,
        posPlayerOrder: currentPitcherOrder,
      };
    }
    return null;
  }, [pitcherLineupSpot, selectedPosPlayerOut, pitcherNewOrder]);

  const handleConfirm = () => {
    if (!selectedReliever || !positionPlayerOut || !positionPlayerIn || !pitcherNewOrder) return;

    const reliever = bullpen.find(p => p.id === selectedReliever);
    const posPlayerOut = lineup.find(p => p.playerId === positionPlayerOut);
    const posPlayerIn = bench.find(p => p.id === positionPlayerIn);

    if (!reliever || !posPlayerOut || !posPlayerIn || !pitcherLineupSpot) return;

    onConfirm({
      outgoingPitcherId: currentPitcher.id,
      outgoingPitcherName: currentPitcher.name,
      outgoingPitchCount: currentPitcher.pitchCount,
      incomingPitcherId: reliever.id,
      incomingPitcherName: reliever.name,
      positionPlayerOutId: posPlayerOut.playerId,
      positionPlayerOutName: posPlayerOut.playerName,
      positionPlayerOutOrder: posPlayerOut.battingOrder,
      positionPlayerInId: posPlayerIn.id,
      positionPlayerInName: posPlayerIn.name,
      positionPlayerInPosition: posPlayerOut.position,
      newPitcherBattingOrder: posPlayerOut.battingOrder,
      newPositionPlayerBattingOrder: pitcherLineupSpot.battingOrder,
    });

    // Reset state
    setSelectedReliever('');
    setPositionPlayerOut('');
    setPositionPlayerIn('');
    setPitcherNewOrder(0);
    onClose();
  };

  const isValid = selectedReliever && positionPlayerOut && positionPlayerIn && pitcherNewOrder;

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.headerIcon}>🔄</span>
          <div>
            <h2 style={styles.title}>Double Switch</h2>
            <p style={styles.subtitle}>Pitching change + batting order swap</p>
          </div>
        </div>

        {/* Explanation */}
        <div style={styles.explainer}>
          A double switch moves the new pitcher to a different batting order spot,
          delaying when they'll come up to bat.
        </div>

        {/* Outgoing Pitcher Info */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>PITCHER OUT</div>
          <div style={styles.pitcherCard}>
            <div style={styles.pitcherName}>{currentPitcher.name}</div>
            <div style={styles.pitcherStats}>
              {currentPitcher.ip} IP • {currentPitcher.pitchCount} pitches
            </div>
            <div style={styles.pitcherOrder}>
              Batting #{pitcherLineupSpot?.battingOrder || '?'}
            </div>
          </div>
        </div>

        {/* Step 1: Select Reliever */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>PITCHER IN</div>
          <div style={styles.optionGrid}>
            {bullpen.map((pitcher) => (
              <button
                key={pitcher.id}
                style={{
                  ...styles.optionButton,
                  ...(selectedReliever === pitcher.id ? styles.optionSelected : {}),
                }}
                onClick={() => setSelectedReliever(pitcher.id)}
              >
                <div style={styles.optionName}>{pitcher.name}</div>
                <div style={styles.optionMeta}>
                  {pitcher.role} • {pitcher.era.toFixed(2)} ERA
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Select Position Player Out */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>POSITION PLAYER OUT</div>
          <div style={styles.optionGrid}>
            {positionPlayers.map((player) => (
              <button
                key={player.playerId}
                style={{
                  ...styles.optionButton,
                  ...(positionPlayerOut === player.playerId ? styles.optionSelected : {}),
                }}
                onClick={() => {
                  setPositionPlayerOut(player.playerId);
                  setPitcherNewOrder(player.battingOrder);
                }}
              >
                <div style={styles.optionName}>
                  #{player.battingOrder} {player.playerName}
                </div>
                <div style={styles.optionMeta}>{player.position}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Select Bench Player In */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>POSITION PLAYER IN</div>
          <div style={styles.optionGrid}>
            {bench.map((player) => (
              <button
                key={player.id}
                style={{
                  ...styles.optionButton,
                  ...(positionPlayerIn === player.id ? styles.optionSelected : {}),
                }}
                onClick={() => setPositionPlayerIn(player.id)}
              >
                <div style={styles.optionName}>{player.name}</div>
                <div style={styles.optionMeta}>
                  {player.positions.join('/')}
                  {player.avg !== undefined && ` • .${Math.round(player.avg * 1000)}`}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {swapPreview && selectedReliever && positionPlayerIn && (
          <div style={styles.preview}>
            <div style={styles.previewLabel}>RESULT</div>
            <div style={styles.previewRow}>
              <span style={styles.previewOrder}>#{swapPreview.pitcherOrder}</span>
              <span style={styles.previewPlayer}>
                {bullpen.find(p => p.id === selectedReliever)?.name} (P)
              </span>
              <span style={styles.previewNote}>was #{pitcherLineupSpot?.battingOrder}</span>
            </div>
            <div style={styles.previewRow}>
              <span style={styles.previewOrder}>#{swapPreview.posPlayerOrder}</span>
              <span style={styles.previewPlayer}>
                {bench.find(p => p.id === positionPlayerIn)?.name} ({selectedPosPlayerOut?.position})
              </span>
              <span style={styles.previewNote}>was #{selectedPosPlayerOut?.battingOrder}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          <button style={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{
              ...styles.confirmButton,
              opacity: isValid ? 1 : 0.5,
            }}
            onClick={handleConfirm}
            disabled={!isValid}
          >
            Confirm Double Switch
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#0f172a',
    borderRadius: '16px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    border: '1px solid #334155',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px',
    borderBottom: '1px solid #334155',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
  },
  headerIcon: {
    fontSize: '2rem',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#fff',
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '0.875rem',
    color: '#94a3b8',
  },
  explainer: {
    padding: '12px 20px',
    backgroundColor: '#1e293b',
    fontSize: '0.8125rem',
    color: '#94a3b8',
    borderBottom: '1px solid #334155',
  },
  section: {
    padding: '16px 20px',
    borderBottom: '1px solid #1e293b',
  },
  sectionLabel: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '10px',
  },
  pitcherCard: {
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    padding: '12px 16px',
    border: '1px solid #334155',
  },
  pitcherName: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#fff',
  },
  pitcherStats: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
    marginTop: '4px',
  },
  pitcherOrder: {
    fontSize: '0.75rem',
    color: '#60a5fa',
    marginTop: '4px',
  },
  optionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  optionButton: {
    padding: '10px 12px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  optionSelected: {
    backgroundColor: '#1e40af',
    borderColor: '#3b82f6',
  },
  optionName: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#fff',
  },
  optionMeta: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginTop: '2px',
  },
  preview: {
    margin: '16px 20px',
    padding: '16px',
    backgroundColor: '#064e3b',
    borderRadius: '8px',
    border: '1px solid #10b981',
  },
  previewLabel: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '10px',
  },
  previewRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 0',
  },
  previewOrder: {
    width: '28px',
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#10b981',
  },
  previewPlayer: {
    flex: 1,
    fontSize: '0.875rem',
    color: '#fff',
  },
  previewNote: {
    fontSize: '0.75rem',
    color: '#6ee7b7',
    fontStyle: 'italic',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    padding: '16px 20px',
    borderTop: '1px solid #334155',
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: 'transparent',
    border: '1px solid #475569',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  confirmButton: {
    flex: 2,
    padding: '12px',
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
