/**
 * PinchHitterModal - Handle pinch hitter substitutions
 *
 * Per FIGMA_IMPLEMENTATION_PLAN.md Phase 1.1
 * Per substitution.ts types
 *
 * Features:
 * - Select player being replaced (from current lineup)
 * - Select pinch hitter from bench
 * - Assign defensive position after AB
 * - Optional: Show opposing pitcher for L/R matchup info
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
  PinchHitterEvent,
  BenchPlayer,
  LineupPlayer,
  Position,
} from '../../types/substitution';

// Defensive positions (not including SP/RP/CL which are pitching designations)
const DEFENSIVE_POSITIONS: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];

interface PinchHitterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: Omit<PinchHitterEvent, 'gameId' | 'timestamp'>) => void;

  // Current game state
  gameId: string;
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  outs: number;

  // Current lineup (players that can be replaced)
  lineup: LineupPlayer[];

  // Available bench players
  availableBench: BenchPlayer[];

  // Optional: Opposing pitcher info for matchup display
  opposingPitcher?: {
    name: string;
    throws: 'L' | 'R';
  };

  // Pre-select the player being replaced (e.g., current batter)
  defaultReplacedPlayerId?: string;
}

export function PinchHitterModal({
  isOpen,
  onClose,
  onSubmit,
  gameId,
  inning,
  halfInning,
  outs,
  lineup,
  availableBench,
  opposingPitcher,
  defaultReplacedPlayerId,
}: PinchHitterModalProps) {
  // Form state
  const [replacedPlayerId, setReplacedPlayerId] = useState('');
  const [pinchHitterId, setPinchHitterId] = useState('');
  const [fieldingPosition, setFieldingPosition] = useState<Position | ''>('');
  const [error, setError] = useState('');

  // Filter bench to position players only (not pitchers)
  const positionPlayersBench = availableBench.filter(p => !p.isPitcher && p.isAvailable);

  // Get the replaced player's info
  const replacedPlayer = lineup.find(p => p.playerId === replacedPlayerId);
  const pinchHitter = positionPlayersBench.find(p => p.playerId === pinchHitterId);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setReplacedPlayerId(defaultReplacedPlayerId || '');
      setPinchHitterId('');
      setFieldingPosition('');
      setError('');
    }
  }, [isOpen, defaultReplacedPlayerId]);

  // Auto-set fielding position to replaced player's position
  useEffect(() => {
    if (replacedPlayer && !fieldingPosition) {
      setFieldingPosition(replacedPlayer.position);
    }
  }, [replacedPlayer, fieldingPosition]);

  const handleSubmit = () => {
    if (!replacedPlayerId) {
      setError('Please select a player to replace');
      return;
    }

    if (!pinchHitterId) {
      setError('Please select a pinch hitter');
      return;
    }

    if (!fieldingPosition) {
      setError('Please select a defensive position');
      return;
    }

    if (!replacedPlayer || !pinchHitter) {
      setError('Invalid player selection');
      return;
    }

    const event: Omit<PinchHitterEvent, 'gameId' | 'timestamp'> = {
      eventType: 'PINCH_HIT',
      inning,
      halfInning,
      outs,
      replacedPlayerId: replacedPlayer.playerId,
      replacedPlayerName: replacedPlayer.playerName,
      replacedBattingOrder: replacedPlayer.battingOrder,
      pinchHitterId: pinchHitter.playerId,
      pinchHitterName: pinchHitter.playerName,
      fieldingPosition: fieldingPosition as Position,
      pitcherFacing: opposingPitcher?.name,
    };

    onSubmit(event);
    onClose();
  };

  return (
    <SubstitutionModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="PINCH HITTER"
      icon="🏏"
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

      {/* Opposing Pitcher Matchup */}
      {opposingPitcher && (
        <div className="bg-[#4A6844] border-[3px] border-[#5599FF] p-3 mb-4">
          <div className="text-xs text-[#E8E8D8] font-bold mb-1">OPPOSING PITCHER</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#E8E8D8]">{opposingPitcher.name}</span>
            <span
              className={`text-sm font-bold px-2 py-1 border-2 ${
                opposingPitcher.throws === 'L'
                  ? 'bg-[#5599FF]/20 border-[#5599FF] text-[#5599FF]'
                  : 'bg-[#DD0000]/20 border-[#DD0000] text-[#DD0000]'
              }`}
            >
              {opposingPitcher.throws}HP
            </span>
          </div>
        </div>
      )}

      {/* Player Being Replaced */}
      <ModalSection title="PLAYER BEING REPLACED">
        <PlayerSelect
          label="Select from lineup:"
          value={replacedPlayerId}
          onChange={setReplacedPlayerId}
          players={lineup.map(p => ({
            id: p.playerId,
            name: p.playerName,
            position: p.position,
            number: `#${p.battingOrder}`,
          }))}
          placeholder="Select player to replace..."
        />

        {replacedPlayer && (
          <div className="bg-[#3A5434] border-[2px] border-[#DD0000] p-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs text-[#E8E8D8] font-bold">{replacedPlayer.playerName}</div>
                <div className="text-[10px] text-[#E8E8D8]/60">
                  {replacedPlayer.position} • Batting #{replacedPlayer.battingOrder}
                </div>
              </div>
              <div className="text-[#DD0000] text-xs">➜ OUT</div>
            </div>
          </div>
        )}
      </ModalSection>

      {/* Pinch Hitter Selection */}
      <ModalSection title="PINCH HITTER" variant="highlight">
        <PlayerSelect
          label="Select from bench:"
          value={pinchHitterId}
          onChange={setPinchHitterId}
          players={positionPlayersBench.map(p => ({
            id: p.playerId,
            name: p.playerName,
            position: p.positions.join('/'),
          }))}
          placeholder="Select pinch hitter..."
        />

        {pinchHitter && (
          <div className="bg-[#3A5434] border-[2px] border-[#5599FF] p-3 mb-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs text-[#E8E8D8] font-bold">{pinchHitter.playerName}</div>
                <div className="text-[10px] text-[#E8E8D8]/60">
                  Positions: {pinchHitter.positions.join(', ')}
                </div>
              </div>
              <div className="text-right">
                {pinchHitter.batterHand && (
                  <span
                    className={`text-xs font-bold px-2 py-1 border-2 ${
                      pinchHitter.batterHand === 'L'
                        ? 'bg-[#5599FF]/20 border-[#5599FF] text-[#5599FF]'
                        : pinchHitter.batterHand === 'S'
                          ? 'bg-[#FFD700]/20 border-[#FFD700] text-[#FFD700]'
                          : 'bg-[#DD0000]/20 border-[#DD0000] text-[#DD0000]'
                    }`}
                  >
                    {pinchHitter.batterHand === 'S' ? 'SWITCH' : `${pinchHitter.batterHand}HB`}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <PositionSelect
          label="Defensive position after AB:"
          value={fieldingPosition}
          onChange={(val) => setFieldingPosition(val as Position)}
          positions={DEFENSIVE_POSITIONS}
          placeholder="Select position..."
        />
      </ModalSection>

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
          disabled={!replacedPlayerId || !pinchHitterId || !fieldingPosition}
        >
          Confirm Pinch Hitter
        </ModalButton>
      </ModalActions>
    </SubstitutionModalBase>
  );
}
