/**
 * DefensiveSubModal - Handle defensive substitutions
 *
 * Per FIGMA_IMPLEMENTATION_PLAN.md Phase 1.1
 * Per substitution.ts types
 *
 * Features:
 * - Select player being replaced from current lineup
 * - Select replacement player from bench
 * - Confirm position assignment
 * - Support multiple substitutions at once
 * - Validate no position duplicates
 */

import { useState, useEffect } from 'react';
import {
  SubstitutionModalBase,
  ModalSection,
  PlayerSelect,
  PositionSelect,
  ModalButton,
  ModalActions,
} from './SubstitutionModalBase';
import type {
  DefensiveSubEvent,
  DefensiveSub,
  BenchPlayer,
  LineupPlayer,
  Position,
} from '../../types/substitution';

// Defensive positions
const DEFENSIVE_POSITIONS: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];

interface SubstitutionEntry {
  id: string;
  playerOutId: string;
  playerOutName: string;
  playerInId: string;
  playerInName: string;
  position: Position | '';
  battingOrder: number;
}

interface DefensiveSubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: Omit<DefensiveSubEvent, 'gameId' | 'timestamp'>) => void;

  // Current game state
  gameId: string;
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  outs: number;

  // Current lineup
  lineup: LineupPlayer[];

  // Available bench players
  availableBench: BenchPlayer[];
}

export function DefensiveSubModal({
  isOpen,
  onClose,
  onSubmit,
  gameId,
  inning,
  halfInning,
  outs,
  lineup,
  availableBench,
}: DefensiveSubModalProps) {
  // Form state - support multiple subs
  const [substitutions, setSubstitutions] = useState<SubstitutionEntry[]>([]);
  const [error, setError] = useState('');

  // Current sub being edited
  const [currentPlayerOutId, setCurrentPlayerOutId] = useState('');
  const [currentPlayerInId, setCurrentPlayerInId] = useState('');
  const [currentPosition, setCurrentPosition] = useState<Position | ''>('');

  // Filter bench to available players not already used in this batch
  const usedPlayerInIds = substitutions.map(s => s.playerInId);
  const availableForSub = availableBench.filter(
    p => p.isAvailable && !usedPlayerInIds.includes(p.playerId)
  );

  // Filter lineup to players not already being replaced
  const usedPlayerOutIds = substitutions.map(s => s.playerOutId);
  const availableToReplace = lineup.filter(p => !usedPlayerOutIds.includes(p.playerId));

  // Get current selections
  const playerOut = lineup.find(p => p.playerId === currentPlayerOutId);
  const playerIn = availableForSub.find(p => p.playerId === currentPlayerInId);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSubstitutions([]);
      setCurrentPlayerOutId('');
      setCurrentPlayerInId('');
      setCurrentPosition('');
      setError('');
    }
  }, [isOpen]);

  // Auto-set position when player out is selected
  useEffect(() => {
    if (playerOut && !currentPosition) {
      setCurrentPosition(playerOut.position);
    }
  }, [playerOut, currentPosition]);

  const handleAddSubstitution = () => {
    if (!currentPlayerOutId || !currentPlayerInId || !currentPosition) {
      setError('Please complete all fields');
      return;
    }

    if (!playerOut || !playerIn) {
      setError('Invalid player selection');
      return;
    }

    // Check for position conflict with existing lineup (excluding player being replaced)
    const remainingLineup = lineup.filter(p => {
      // Exclude player being replaced
      if (p.playerId === currentPlayerOutId) return false;
      // Exclude players already being replaced in this batch
      if (usedPlayerOutIds.includes(p.playerId)) return false;
      return true;
    });

    // Check if position is already taken
    const positionTaken = remainingLineup.some(p => p.position === currentPosition);
    // Also check substitutions being added
    const positionInSubs = substitutions.some(s => s.position === currentPosition);

    if (positionTaken || positionInSubs) {
      setError(`Position ${currentPosition} is already assigned`);
      return;
    }

    const newSub: SubstitutionEntry = {
      id: `${Date.now()}`,
      playerOutId: currentPlayerOutId,
      playerOutName: playerOut.playerName,
      playerInId: currentPlayerInId,
      playerInName: playerIn.playerName,
      position: currentPosition,
      battingOrder: playerOut.battingOrder,
    };

    setSubstitutions([...substitutions, newSub]);
    setCurrentPlayerOutId('');
    setCurrentPlayerInId('');
    setCurrentPosition('');
    setError('');
  };

  const handleRemoveSubstitution = (id: string) => {
    setSubstitutions(substitutions.filter(s => s.id !== id));
  };

  const handleSubmit = () => {
    if (substitutions.length === 0) {
      setError('Please add at least one substitution');
      return;
    }

    const event: Omit<DefensiveSubEvent, 'gameId' | 'timestamp'> = {
      eventType: 'DEF_SUB',
      inning,
      halfInning,
      outs,
      substitutions: substitutions.map(s => ({
        playerOutId: s.playerOutId,
        playerOutName: s.playerOutName,
        playerInId: s.playerInId,
        playerInName: s.playerInName,
        position: s.position as Position,
        battingOrder: s.battingOrder,
      })),
    };

    onSubmit(event);
    onClose();
  };

  return (
    <SubstitutionModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="DEFENSIVE SUBSTITUTION"
      icon="🛡️"
      width="xl"
    >
      {/* Game Situation */}
      <div className="bg-[#3A5434] border-[2px] border-[#FFD700] p-3 mb-4 flex justify-center gap-6">
        <div className="text-center">
          <div className="text-[10px] text-[#E8E8D8]/80">INNING</div>
          <div className="text-sm text-[#E8E8D8] font-bold">
            {halfInning === 'TOP' ? '▲' : '▼'} {inning}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-[#E8E8D8]/80">OUTS</div>
          <div className="text-sm text-[#E8E8D8] font-bold">{outs}</div>
        </div>
      </div>

      {/* Pending Substitutions */}
      {substitutions.length > 0 && (
        <ModalSection title="PENDING SUBSTITUTIONS">
          <div className="space-y-2">
            {substitutions.map((sub) => (
              <div
                key={sub.id}
                className="bg-[#3A5434] border-[2px] border-[#5599FF] p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className="text-[8px] text-[#E8E8D8]/60">OUT</div>
                    <div className="text-xs text-[#DD0000] font-bold">{sub.playerOutName}</div>
                  </div>
                  <div className="text-[#FFD700]">➜</div>
                  <div className="text-center">
                    <div className="text-[8px] text-[#E8E8D8]/60">IN</div>
                    <div className="text-xs text-[#5599FF] font-bold">{sub.playerInName}</div>
                  </div>
                  <div className="text-center ml-4">
                    <div className="text-[8px] text-[#E8E8D8]/60">POS</div>
                    <div className="text-xs text-[#E8E8D8] font-bold">{sub.position}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveSubstitution(sub.id)}
                  className="text-[#DD0000] hover:text-[#FF0000] text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </ModalSection>
      )}

      {/* Add New Substitution */}
      <ModalSection title="ADD SUBSTITUTION" variant="highlight">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <PlayerSelect
              label="Player OUT:"
              value={currentPlayerOutId}
              onChange={setCurrentPlayerOutId}
              players={availableToReplace.map(p => ({
                id: p.playerId,
                name: p.playerName,
                position: p.position,
                number: `#${p.battingOrder}`,
              }))}
              placeholder="Select player to replace..."
            />
          </div>

          <div>
            <PlayerSelect
              label="Player IN:"
              value={currentPlayerInId}
              onChange={setCurrentPlayerInId}
              players={availableForSub.map(p => ({
                id: p.playerId,
                name: p.playerName,
                position: p.positions.join('/'),
              }))}
              placeholder="Select replacement..."
            />
          </div>
        </div>

        <PositionSelect
          label="Defensive Position:"
          value={currentPosition}
          onChange={(val) => setCurrentPosition(val as Position)}
          positions={DEFENSIVE_POSITIONS}
          placeholder="Select position..."
        />

        <div className="flex justify-end mt-3">
          <ModalButton
            onClick={handleAddSubstitution}
            variant="secondary"
            disabled={!currentPlayerOutId || !currentPlayerInId || !currentPosition}
          >
            + Add Substitution
          </ModalButton>
        </div>
      </ModalSection>

      {/* Current Lineup Preview (simplified) */}
      <div className="bg-[#3A5434] border-[2px] border-[#3F5A3A] p-3 mb-4">
        <div className="text-xs text-[#E8E8D8] font-bold mb-2">LINEUP AFTER SUBSTITUTIONS</div>
        <div className="grid grid-cols-3 gap-1 text-[10px]">
          {lineup.map((player) => {
            const isBeingReplaced = substitutions.some(s => s.playerOutId === player.playerId);
            const replacement = substitutions.find(s => s.playerOutId === player.playerId);

            return (
              <div
                key={player.playerId}
                className={`p-1 ${isBeingReplaced ? 'text-[#5599FF]' : 'text-[#E8E8D8]/60'}`}
              >
                #{player.battingOrder}: {replacement ? replacement.playerInName : player.playerName}{' '}
                ({replacement ? replacement.position : player.position})
              </div>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[#DD0000] border-[3px] border-[#000] p-3 text-xs text-[#E8E8D8] mb-4">
          ⚠️ {error}
        </div>
      )}

      {/* Actions */}
      <ModalActions>
        <ModalButton onClick={onClose} variant="secondary">
          Cancel
        </ModalButton>
        <ModalButton
          onClick={handleSubmit}
          variant="primary"
          disabled={substitutions.length === 0}
        >
          Confirm {substitutions.length} Substitution{substitutions.length !== 1 ? 's' : ''}
        </ModalButton>
      </ModalActions>
    </SubstitutionModalBase>
  );
}
