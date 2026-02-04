/**
 * PositionSwitchModal - Handle defensive position switches (no new players)
 *
 * Per FIGMA_IMPLEMENTATION_PLAN.md Phase 1.1
 * Per substitution.ts types
 *
 * This is for when players swap defensive positions WITHOUT any new players
 * entering the game. Example: Moving the 1B to LF and the LF to 1B.
 *
 * Features:
 * - Select multiple players to switch positions
 * - Validate all positions are covered
 * - No duplicate positions
 * - Support for multiple simultaneous switches
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
  PositionSwitchEvent,
  PositionSwitch,
  LineupPlayer,
  Position,
} from '../../types/substitution';

// Defensive positions
const DEFENSIVE_POSITIONS: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];

interface SwitchEntry {
  id: string;
  playerId: string;
  playerName: string;
  fromPosition: Position;
  toPosition: Position;
}

interface PositionSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: Omit<PositionSwitchEvent, 'gameId' | 'timestamp'>) => void;

  // Current game state
  gameId: string;
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  outs: number;

  // Current lineup
  lineup: LineupPlayer[];
}

export function PositionSwitchModal({
  isOpen,
  onClose,
  onSubmit,
  gameId,
  inning,
  halfInning,
  outs,
  lineup,
}: PositionSwitchModalProps) {
  // Form state
  const [switches, setSwitches] = useState<SwitchEntry[]>([]);
  const [error, setError] = useState('');

  // Current switch being edited
  const [currentPlayerId, setCurrentPlayerId] = useState('');
  const [currentToPosition, setCurrentToPosition] = useState<Position | ''>('');

  // Get current selections
  const currentPlayer = lineup.find(p => p.playerId === currentPlayerId);

  // Calculate which positions are currently assigned (accounting for pending switches)
  const getEffectivePositions = (): Map<Position, string> => {
    const positionMap = new Map<Position, string>();

    // Start with current lineup positions
    for (const player of lineup) {
      positionMap.set(player.position, player.playerId);
    }

    // Apply pending switches
    for (const sw of switches) {
      // Remove from old position
      if (positionMap.get(sw.fromPosition) === sw.playerId) {
        positionMap.delete(sw.fromPosition);
      }
      // Add to new position
      positionMap.set(sw.toPosition, sw.playerId);
    }

    return positionMap;
  };

  // Get available positions (not currently assigned after switches)
  const getAvailablePositions = (): Position[] => {
    const effectivePositions = getEffectivePositions();
    return DEFENSIVE_POSITIONS.filter(pos => !effectivePositions.has(pos));
  };

  // Get players not already in pending switches
  const getAvailablePlayers = (): LineupPlayer[] => {
    const switchedPlayerIds = new Set(switches.map(s => s.playerId));
    return lineup.filter(p => !switchedPlayerIds.has(p.playerId));
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSwitches([]);
      setCurrentPlayerId('');
      setCurrentToPosition('');
      setError('');
    }
  }, [isOpen]);

  const handleAddSwitch = () => {
    if (!currentPlayerId || !currentToPosition) {
      setError('Please select a player and target position');
      return;
    }

    if (!currentPlayer) {
      setError('Invalid player selection');
      return;
    }

    if (currentPlayer.position === currentToPosition) {
      setError('Player is already at this position');
      return;
    }

    // Check if target position is taken (by someone not being switched)
    const effectivePositions = getEffectivePositions();
    const currentHolder = effectivePositions.get(currentToPosition);
    if (currentHolder && currentHolder !== currentPlayerId) {
      // The position is taken - check if that player is being switched too
      const holderBeingSwitched = switches.some(s => s.playerId === currentHolder);
      if (!holderBeingSwitched) {
        const holderName = lineup.find(p => p.playerId === currentHolder)?.playerName;
        setError(
          `Position ${currentToPosition} is taken by ${holderName}. Add a switch for them first.`
        );
        return;
      }
    }

    const newSwitch: SwitchEntry = {
      id: `${Date.now()}`,
      playerId: currentPlayerId,
      playerName: currentPlayer.playerName,
      fromPosition: currentPlayer.position,
      toPosition: currentToPosition,
    };

    setSwitches([...switches, newSwitch]);
    setCurrentPlayerId('');
    setCurrentToPosition('');
    setError('');
  };

  const handleRemoveSwitch = (id: string) => {
    setSwitches(switches.filter(s => s.id !== id));
  };

  const validateSwitches = (): string | null => {
    if (switches.length === 0) {
      return 'Please add at least one position switch';
    }

    // Build the final position map
    const finalPositions = new Map<Position, string>();

    // Start with positions of players NOT being switched
    const switchedPlayerIds = new Set(switches.map(s => s.playerId));
    for (const player of lineup) {
      if (!switchedPlayerIds.has(player.playerId)) {
        finalPositions.set(player.position, player.playerId);
      }
    }

    // Add switched positions
    for (const sw of switches) {
      if (finalPositions.has(sw.toPosition)) {
        const conflictPlayer = lineup.find(p => p.playerId === finalPositions.get(sw.toPosition));
        return `Position ${sw.toPosition} would have two players: ${sw.playerName} and ${conflictPlayer?.playerName}`;
      }
      finalPositions.set(sw.toPosition, sw.playerId);
    }

    // Check for missing required positions (P, C, 1B, 2B, 3B, SS, LF, CF, RF required for defense)
    const requiredPositions: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
    const hasDH = lineup.some(p => p.position === 'DH');

    for (const pos of requiredPositions) {
      if (!finalPositions.has(pos)) {
        return `Missing position: ${pos}`;
      }
    }

    return null;
  };

  const handleSubmit = () => {
    const validationError = validateSwitches();
    if (validationError) {
      setError(validationError);
      return;
    }

    const event: Omit<PositionSwitchEvent, 'gameId' | 'timestamp'> = {
      eventType: 'POS_SWITCH',
      inning,
      halfInning,
      outs,
      switches: switches.map(s => ({
        playerId: s.playerId,
        playerName: s.playerName,
        fromPosition: s.fromPosition,
        toPosition: s.toPosition,
      })),
    };

    onSubmit(event);
    onClose();
  };

  return (
    <SubstitutionModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="POSITION SWITCH"
      icon="↔️"
      width="lg"
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

      {/* Explanation */}
      <div className="bg-[#4A6844] border-[3px] border-[#5599FF] p-3 mb-4">
        <div className="text-xs text-[#E8E8D8] font-bold mb-1">📋 POSITION SWITCH</div>
        <div className="text-[10px] text-[#E8E8D8]/80">
          Move current players to different defensive positions without bringing in new players.
          Useful for late-game defensive adjustments.
        </div>
      </div>

      {/* Pending Switches */}
      {switches.length > 0 && (
        <ModalSection title="PENDING SWITCHES">
          <div className="space-y-2">
            {switches.map((sw) => (
              <div
                key={sw.id}
                className="bg-[#3A5434] border-[2px] border-[#5599FF] p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="text-xs text-[#E8E8D8] font-bold">{sw.playerName}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#DD0000] font-bold">{sw.fromPosition}</span>
                    <span className="text-[#FFD700]">➜</span>
                    <span className="text-xs text-[#5599FF] font-bold">{sw.toPosition}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveSwitch(sw.id)}
                  className="text-[#DD0000] hover:text-[#FF0000] text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </ModalSection>
      )}

      {/* Add New Switch */}
      <ModalSection title="ADD POSITION SWITCH" variant="highlight">
        <PlayerSelect
          label="Player:"
          value={currentPlayerId}
          onChange={setCurrentPlayerId}
          players={getAvailablePlayers().map(p => ({
            id: p.playerId,
            name: p.playerName,
            position: p.position,
            number: `#${p.battingOrder}`,
          }))}
          placeholder="Select player to move..."
        />

        {currentPlayer && (
          <div className="bg-[#3A5434] border-[2px] border-[#3F5A3A] p-2 mb-3">
            <div className="text-[10px] text-[#E8E8D8]/60">
              Current position: <span className="text-[#FFD700] font-bold">{currentPlayer.position}</span>
            </div>
          </div>
        )}

        <PositionSelect
          label="Move to Position:"
          value={currentToPosition}
          onChange={(val) => setCurrentToPosition(val as Position)}
          positions={DEFENSIVE_POSITIONS.filter(p => p !== currentPlayer?.position)}
          placeholder="Select new position..."
        />

        <div className="flex justify-end mt-3">
          <ModalButton
            onClick={handleAddSwitch}
            variant="secondary"
            disabled={!currentPlayerId || !currentToPosition}
          >
            + Add Switch
          </ModalButton>
        </div>
      </ModalSection>

      {/* Current Lineup Preview */}
      <div className="bg-[#3A5434] border-[2px] border-[#3F5A3A] p-3 mb-4">
        <div className="text-xs text-[#E8E8D8] font-bold mb-2">DEFENSIVE ALIGNMENT AFTER SWITCHES</div>
        <div className="grid grid-cols-3 gap-2">
          {DEFENSIVE_POSITIONS.map((pos) => {
            const effectivePositions = getEffectivePositions();
            const playerId = effectivePositions.get(pos);
            const player = lineup.find(p => p.playerId === playerId);
            const wasSwitch = switches.some(s => s.toPosition === pos);

            return (
              <div
                key={pos}
                className={`p-2 text-center border-[2px] ${
                  wasSwitch
                    ? 'border-[#5599FF] bg-[#5599FF]/20'
                    : 'border-[#3F5A3A]'
                }`}
              >
                <div className="text-[10px] text-[#FFD700] font-bold">{pos}</div>
                <div className={`text-[10px] ${player ? 'text-[#E8E8D8]' : 'text-[#DD0000]'}`}>
                  {player?.playerName || 'EMPTY'}
                </div>
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
          disabled={switches.length === 0}
        >
          Confirm {switches.length} Switch{switches.length !== 1 ? 'es' : ''}
        </ModalButton>
      </ModalActions>
    </SubstitutionModalBase>
  );
}
