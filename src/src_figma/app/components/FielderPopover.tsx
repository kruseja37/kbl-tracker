/**
 * FielderPopover — Contextual action menu for tapping a fielder on the diamond.
 *
 * Per MODE_2_V1_FINAL §5.2 / §7.2:
 * Tap fielder → popover: [Pinch Hit] (if current batter) [Substitute] [Move Position]
 *
 * Tickets: 4.3 (GAP-GT-7-A), 4.5 (GAP-GT-5-F)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  SubstitutionModalBase,
  ModalSection,
  ModalButton,
  ModalActions,
  PositionSelect,
} from './modals/SubstitutionModalBase';

export interface FielderInfo {
  positionNumber: number;
  positionLabel: string;  // 'SS', '3B', etc.
  playerName: string;
  playerId: string;
  isCurrentBatter: boolean;
}

export interface BenchPlayerInfo {
  id: string;
  name: string;
  position: string;
  isUsed: boolean;
}

export interface FielderPopoverProps {
  /** The fielder that was tapped */
  fielder: FielderInfo;
  /** Anchor position (CSS left/top in %) */
  anchorPosition: { left: string; top: string };
  /** Available bench players for substitution */
  benchPlayers: BenchPlayerInfo[];
  /** Handler: defensive substitution — benchPlayerId replaces fielder */
  onSubstitute: (benchPlayerId: string, benchPlayerName: string, fielderId: string, fielderName: string) => void;
  /** Handler: pinch hit — benchPlayerId replaces current batter */
  onPinchHit: (benchPlayerId: string, benchPlayerName: string, fielderId: string, fielderName: string) => void;
  /** Handler: position change — fielder moves to new position */
  onMovePosition: (playerId: string, newPosition: string) => void;
  /** Close the popover */
  onClose: () => void;
}

type ModalMode = 'substitute' | 'pinchHit' | 'movePosition' | null;

const FIELD_POSITIONS = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'P', 'DH'];

export function FielderPopover({
  fielder,
  anchorPosition,
  benchPlayers,
  onSubstitute,
  onPinchHit,
  onMovePosition,
  onClose,
}: FielderPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedPosition, setSelectedPosition] = useState('');

  // Close on outside click (only when no modal is open)
  useEffect(() => {
    if (modalMode) return; // Don't close popover when modal is open
    function handlePointerDown(e: PointerEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [onClose, modalMode]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (modalMode) {
          setModalMode(null);
        } else {
          onClose();
        }
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, modalMode]);

  const availableBench = benchPlayers.filter(p => !p.isUsed);

  const handlePlayerSelect = useCallback((benchPlayer: BenchPlayerInfo) => {
    if (modalMode === 'substitute') {
      onSubstitute(benchPlayer.id, benchPlayer.name, fielder.playerId, fielder.playerName);
    } else if (modalMode === 'pinchHit') {
      onPinchHit(benchPlayer.id, benchPlayer.name, fielder.playerId, fielder.playerName);
    }
  }, [modalMode, fielder, onSubstitute, onPinchHit]);

  const handleMovePosition = useCallback(() => {
    if (selectedPosition) {
      onMovePosition(fielder.playerId, selectedPosition);
    }
  }, [selectedPosition, fielder.playerId, onMovePosition]);

  // Substitution/PinchHit modal — player picker
  if (modalMode === 'substitute' || modalMode === 'pinchHit') {
    const title = modalMode === 'pinchHit' ? 'Pinch Hitter' : 'Defensive Substitution';
    const icon = modalMode === 'pinchHit' ? '🏏' : '🔄';
    return (
      <SubstitutionModalBase
        isOpen={true}
        onClose={() => setModalMode(null)}
        title={`${title} — replacing ${fielder.playerName}`}
        icon={icon}
        width="sm"
      >
        <ModalSection title="SELECT REPLACEMENT">
          {availableBench.length === 0 ? (
            <div className="text-xs text-[#E8E8D8]/60 text-center py-2">No available bench players</div>
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {availableBench.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handlePlayerSelect(player)}
                  className="w-full flex items-center justify-between bg-[#3A5434] hover:bg-[#4A6844] border-[2px] border-[#5599FF] p-2 transition-colors"
                >
                  <span className="text-xs text-[#E8E8D8] font-bold">{player.name}</span>
                  <span className="text-[10px] text-[#88AA88]">{player.position}</span>
                </button>
              ))}
            </div>
          )}
        </ModalSection>
        <ModalActions>
          <ModalButton variant="secondary" onClick={() => setModalMode(null)}>Cancel</ModalButton>
        </ModalActions>
      </SubstitutionModalBase>
    );
  }

  // Move Position modal — position picker (ticket 4.5)
  if (modalMode === 'movePosition') {
    const otherPositions = FIELD_POSITIONS.filter(p => p !== fielder.positionLabel);
    return (
      <SubstitutionModalBase
        isOpen={true}
        onClose={() => setModalMode(null)}
        title={`Move ${fielder.playerName} — currently ${fielder.positionLabel}`}
        icon="↔️"
        width="sm"
      >
        <ModalSection title="SELECT NEW POSITION">
          <PositionSelect
            label="New Position"
            value={selectedPosition}
            onChange={setSelectedPosition}
            positions={otherPositions}
            placeholder="Select position..."
          />
        </ModalSection>
        <ModalActions>
          <ModalButton variant="secondary" onClick={() => setModalMode(null)}>Cancel</ModalButton>
          <ModalButton
            variant="primary"
            disabled={!selectedPosition}
            onClick={handleMovePosition}
          >
            Confirm
          </ModalButton>
        </ModalActions>
      </SubstitutionModalBase>
    );
  }

  // Main popover
  return (
    <div
      ref={popoverRef}
      className="absolute z-50 transform -translate-x-1/2"
      style={{ left: anchorPosition.left, top: anchorPosition.top }}
    >
      <div className="bg-[#333] border-[3px] border-[#88AA88] p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] min-w-[140px]">
        {/* Header */}
        <div className="text-[8px] text-[#88AA88] font-bold mb-1.5 flex items-center gap-1">
          <span className="bg-[#88AA88] text-[#1a1a1a] px-1 rounded text-[7px]">{fielder.positionLabel}</span>
          {fielder.playerName.split(' ').pop()?.toUpperCase() || fielder.positionLabel}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-1">
          {fielder.isCurrentBatter && (
            <button
              onClick={() => setModalMode('pinchHit')}
              className="w-full bg-[#6c3483] border-[2px] border-[#af7ac5] px-2 py-1.5 text-[10px] font-bold text-white hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
            >
              Pinch Hit
            </button>
          )}
          <button
            onClick={() => setModalMode('substitute')}
            className="w-full bg-[#4A6844] border-[2px] border-[#88AA88] px-2 py-1.5 text-[10px] font-bold text-white hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
          >
            Substitute
          </button>
          <button
            onClick={() => setModalMode('movePosition')}
            className="w-full bg-[#1a5276] border-[2px] border-[#5dade2] px-2 py-1.5 text-[10px] font-bold text-white hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
          >
            Move Position
          </button>
        </div>
      </div>
    </div>
  );
}

export default FielderPopover;
