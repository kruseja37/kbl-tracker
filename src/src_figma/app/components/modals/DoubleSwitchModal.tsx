/**
 * DoubleSwitchModal - Handle double switch substitutions
 *
 * Per FIGMA_IMPLEMENTATION_PLAN.md Phase 1.1
 * Per substitution.ts types
 *
 * A double switch involves:
 * 1. A pitching change
 * 2. A position player swap where batting orders are changed
 *
 * This is typically done to move the pitcher's batting spot lower in the order
 * by having the new position player take the departing pitcher's batting spot,
 * and the new pitcher takes the departing position player's spot.
 *
 * Features:
 * - Pitching change component
 * - Position player swap with batting order adjustment
 * - Validate no position duplicates
 * - Track inherited runners for new pitcher
 */

import { useState, useEffect } from 'react';
import {
  SubstitutionModalBase,
  ModalSection,
  PlayerSelect,
  PositionSelect,
  ModalButton,
  ModalActions,
  RunnerDisplay,
  PitcherLineDisplay,
} from './SubstitutionModalBase';
import type {
  DoubleSwitchEvent,
  BenchPlayer,
  LineupPlayer,
  Position,
  PitcherRole,
  PitcherLine,
  BequeathedRunner,
  Bases,
} from '../../types/substitution';

// Defensive positions (excluding DH for position player swap)
const DEFENSIVE_POSITIONS: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

interface DoubleSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: Omit<DoubleSwitchEvent, 'gameId' | 'timestamp'>) => void;

  // Current game state
  gameId: string;
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  outs: number;

  // Current pitcher info
  currentPitcher: LineupPlayer | null;
  currentPitcherStats: PitcherLine;
  currentPitchCount: number;

  // Runners on base (for bequeathed tracking)
  bases: Bases;

  // Current lineup (excluding pitcher)
  lineup: LineupPlayer[];

  // Available players
  availablePitchers: BenchPlayer[];
  availableBench: BenchPlayer[];
}

export function DoubleSwitchModal({
  isOpen,
  onClose,
  onSubmit,
  gameId,
  inning,
  halfInning,
  outs,
  currentPitcher,
  currentPitcherStats,
  currentPitchCount,
  bases,
  lineup,
  availablePitchers,
  availableBench,
}: DoubleSwitchModalProps) {
  // Pitching change state
  const [incomingPitcherId, setIncomingPitcherId] = useState('');
  const [pitcherRole, setPitcherRole] = useState<PitcherRole>('RP');

  // Position player swap state
  const [positionPlayerOutId, setPositionPlayerOutId] = useState('');
  const [positionPlayerInId, setPositionPlayerInId] = useState('');
  const [newPitcherPosition, setNewPitcherPosition] = useState<Position | ''>('');

  const [error, setError] = useState('');

  // Build bequeathed runners
  const bequeathedRunners: BequeathedRunner[] = [];
  if (bases.first) {
    bequeathedRunners.push({
      base: '1B',
      runnerId: bases.first.playerId,
      runnerName: bases.first.playerName,
      howReached: bases.first.howReached || 'hit',
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

  // Get selected players
  const incomingPitcher = availablePitchers.find(p => p.playerId === incomingPitcherId);
  const positionPlayerOut = lineup.find(p => p.playerId === positionPlayerOutId);
  const positionPlayerIn = availableBench.find(
    p => p.playerId === positionPlayerInId && !p.isPitcher
  );

  // Filter bench to position players not already selected
  const availablePositionPlayers = availableBench.filter(
    p => p.isAvailable && !p.isPitcher && p.playerId !== incomingPitcherId
  );

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setIncomingPitcherId('');
      setPitcherRole('RP');
      setPositionPlayerOutId('');
      setPositionPlayerInId('');
      setNewPitcherPosition('');
      setError('');
    }
  }, [isOpen]);

  // Auto-set position when position player out is selected
  useEffect(() => {
    if (positionPlayerOut && !newPitcherPosition) {
      setNewPitcherPosition(positionPlayerOut.position);
    }
  }, [positionPlayerOut, newPitcherPosition]);

  const handleSubmit = () => {
    if (!currentPitcher) {
      setError('No current pitcher to replace');
      return;
    }

    if (!incomingPitcherId || !incomingPitcher) {
      setError('Please select an incoming pitcher');
      return;
    }

    if (!positionPlayerOutId || !positionPlayerOut) {
      setError('Please select a position player to switch out');
      return;
    }

    if (!positionPlayerInId || !positionPlayerIn) {
      setError('Please select a position player to switch in');
      return;
    }

    if (!newPitcherPosition) {
      setError('Please select the new pitcher\'s defensive position');
      return;
    }

    // In a double switch:
    // - New pitcher takes the position player OUT's batting order
    // - New position player takes the old pitcher's batting order
    const newPitcherBattingOrder = positionPlayerOut.battingOrder;
    const newPositionPlayerBattingOrder = currentPitcher.battingOrder;

    const event: Omit<DoubleSwitchEvent, 'gameId' | 'timestamp'> = {
      eventType: 'DOUBLE_SWITCH',
      inning,
      halfInning,
      outs,
      pitchingChange: {
        outgoingPitcherId: currentPitcher.playerId,
        outgoingPitcherName: currentPitcher.playerName,
        outgoingPitchCount: currentPitchCount,
        outgoingLine: currentPitcherStats,
        bequeathedRunners,
        incomingPitcherId: incomingPitcher.playerId,
        incomingPitcherName: incomingPitcher.playerName,
        incomingPitcherRole: pitcherRole,
        inheritedRunners: bequeathedRunners.length,
      },
      positionSwap: {
        playerOutId: positionPlayerOut.playerId,
        playerOutPosition: positionPlayerOut.position,
        playerOutBattingOrder: positionPlayerOut.battingOrder,
        playerInId: positionPlayerIn.playerId,
        playerInPosition: newPitcherPosition as Position,
        playerInBattingOrder: newPositionPlayerBattingOrder,
      },
      newPitcherBattingOrder,
      newPositionPlayerBattingOrder,
    };

    onSubmit(event);
    onClose();
  };

  return (
    <SubstitutionModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="DOUBLE SWITCH"
      icon="🔀"
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

      {/* Explanation */}
      <div className="bg-[#4A6844] border-[3px] border-[#5599FF] p-3 mb-4">
        <div className="text-xs text-[#E8E8D8] font-bold mb-1">📋 HOW IT WORKS</div>
        <div className="text-[10px] text-[#E8E8D8]/80">
          A double switch changes both the pitcher AND a position player, swapping their batting
          order spots. This is typically used to move the pitcher&apos;s spot lower in the batting
          order.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* LEFT SIDE: Pitching Change */}
        <div>
          <ModalSection title="PITCHING CHANGE">
            {/* Outgoing Pitcher */}
            {currentPitcher ? (
              <div className="bg-[#3A5434] border-[2px] border-[#DD0000] p-3 mb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs text-[#E8E8D8] font-bold">{currentPitcher.playerName}</div>
                    <div className="text-[10px] text-[#E8E8D8]/60">
                      Batting #{currentPitcher.battingOrder}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-[#E8E8D8]/80">PITCHES</div>
                    <div className="text-sm text-[#FFD700] font-bold">{currentPitchCount}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#E8E8D8]/60 text-center p-4">No current pitcher</div>
            )}

            <PlayerSelect
              label="Incoming Pitcher:"
              value={incomingPitcherId}
              onChange={setIncomingPitcherId}
              players={availablePitchers.map(p => ({
                id: p.playerId,
                name: p.playerName,
                position: p.positions.join('/'),
              }))}
              placeholder="Select from bullpen..."
            />

            <div className="mb-3">
              <label className="block text-[10px] text-[#E8E8D8]/80 mb-1">Role:</label>
              <div className="flex gap-2">
                {(['SP', 'RP', 'CL'] as PitcherRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => setPitcherRole(role)}
                    className={`flex-1 py-2 text-xs font-bold border-[2px] transition-colors ${
                      pitcherRole === role
                        ? 'bg-[#5599FF] border-[#3366FF] text-[#E8E8D8]'
                        : 'bg-[#3A5434] border-[#3F5A3A] text-[#E8E8D8]/60 hover:border-[#5599FF]'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </ModalSection>

          {/* Bequeathed Runners */}
          {bequeathedRunners.length > 0 && (
            <RunnerDisplay runners={bequeathedRunners} title="⚠️ INHERITED RUNNERS" />
          )}
        </div>

        {/* RIGHT SIDE: Position Player Swap */}
        <div>
          <ModalSection title="POSITION PLAYER SWAP" variant="highlight">
            <PlayerSelect
              label="Position Player OUT:"
              value={positionPlayerOutId}
              onChange={setPositionPlayerOutId}
              players={lineup
                .filter(p => p.playerId !== currentPitcher?.playerId)
                .map(p => ({
                  id: p.playerId,
                  name: p.playerName,
                  position: p.position,
                  number: `#${p.battingOrder}`,
                }))}
              placeholder="Select player to switch out..."
            />

            <PlayerSelect
              label="Position Player IN:"
              value={positionPlayerInId}
              onChange={setPositionPlayerInId}
              players={availablePositionPlayers.map(p => ({
                id: p.playerId,
                name: p.playerName,
                position: p.positions.join('/'),
              }))}
              placeholder="Select replacement..."
            />

            <PositionSelect
              label="New Pitcher's Defensive Position:"
              value={newPitcherPosition}
              onChange={(val) => setNewPitcherPosition(val as Position)}
              positions={DEFENSIVE_POSITIONS}
              placeholder="Select position..."
            />
          </ModalSection>

          {/* Batting Order Preview */}
          {currentPitcher && positionPlayerOut && (
            <div className="bg-[#3A5434] border-[2px] border-[#FFD700] p-3">
              <div className="text-xs text-[#E8E8D8] font-bold mb-2">BATTING ORDER CHANGES</div>
              <div className="space-y-2 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-[#E8E8D8]/60">New Pitcher batting:</span>
                  <span className="text-[#5599FF] font-bold">#{positionPlayerOut.battingOrder}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#E8E8D8]/60">New Pos Player batting:</span>
                  <span className="text-[#5599FF] font-bold">#{currentPitcher.battingOrder}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[#DD0000] border-[3px] border-[#000] p-3 text-xs text-[#E8E8D8] mb-4 mt-4">
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
          disabled={
            !incomingPitcherId ||
            !positionPlayerOutId ||
            !positionPlayerInId ||
            !newPitcherPosition ||
            !currentPitcher
          }
        >
          Confirm Double Switch
        </ModalButton>
      </ModalActions>
    </SubstitutionModalBase>
  );
}
