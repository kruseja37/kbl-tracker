/**
 * PinchRunnerModal - Handle pinch runner substitutions with ER inheritance
 *
 * Per FIGMA_IMPLEMENTATION_PLAN.md Phase 1.1
 * Per substitution.ts types
 *
 * Features:
 * - Select runner being replaced (must be on base)
 * - Select pinch runner from bench
 * - CRITICAL: Track pitcher responsibility for ER
 * - Show how the original runner reached base
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
  PinchRunnerEvent,
  BenchPlayer,
  LineupPlayer,
  Position,
  HowReached,
  Runner,
  Bases,
} from '../../types/substitution';

// Defensive positions
const DEFENSIVE_POSITIONS: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];

interface RunnerOnBase {
  base: '1B' | '2B' | '3B';
  runner: Runner;
  lineupPlayer: LineupPlayer;
}

interface PinchRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: Omit<PinchRunnerEvent, 'gameId' | 'timestamp'>) => void;

  // Current game state
  gameId: string;
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  outs: number;

  // Current bases state with runner info
  bases: Bases;

  // Lineup for looking up runner info
  lineup: LineupPlayer[];

  // Available bench players
  availableBench: BenchPlayer[];

  // Current pitcher ID (for ER tracking)
  currentPitcherId: string;

  // Pre-select a base (e.g., if user clicked on a specific runner)
  defaultBase?: '1B' | '2B' | '3B';
}

export function PinchRunnerModal({
  isOpen,
  onClose,
  onSubmit,
  gameId,
  inning,
  halfInning,
  outs,
  bases,
  lineup,
  availableBench,
  currentPitcherId,
  defaultBase,
}: PinchRunnerModalProps) {
  // Form state
  const [selectedBase, setSelectedBase] = useState<'1B' | '2B' | '3B' | ''>('');
  const [pinchRunnerId, setPinchRunnerId] = useState('');
  const [fieldingPosition, setFieldingPosition] = useState<Position | ''>('');
  const [error, setError] = useState('');

  // Filter bench to position players only
  const positionPlayersBench = availableBench.filter(p => !p.isPitcher && p.isAvailable);

  // Build list of runners on base
  const runnersOnBase: RunnerOnBase[] = [];
  if (bases.first) {
    const lineupPlayer = lineup.find(p => p.playerId === bases.first!.playerId);
    if (lineupPlayer) {
      runnersOnBase.push({ base: '1B', runner: bases.first, lineupPlayer });
    }
  }
  if (bases.second) {
    const lineupPlayer = lineup.find(p => p.playerId === bases.second!.playerId);
    if (lineupPlayer) {
      runnersOnBase.push({ base: '2B', runner: bases.second, lineupPlayer });
    }
  }
  if (bases.third) {
    const lineupPlayer = lineup.find(p => p.playerId === bases.third!.playerId);
    if (lineupPlayer) {
      runnersOnBase.push({ base: '3B', runner: bases.third, lineupPlayer });
    }
  }

  // Get selected runner info
  const selectedRunner = runnersOnBase.find(r => r.base === selectedBase);
  const pinchRunner = positionPlayersBench.find(p => p.playerId === pinchRunnerId);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedBase(defaultBase || '');
      setPinchRunnerId('');
      setFieldingPosition('');
      setError('');
    }
  }, [isOpen, defaultBase]);

  // Auto-set fielding position to replaced player's position
  useEffect(() => {
    if (selectedRunner && !fieldingPosition) {
      setFieldingPosition(selectedRunner.lineupPlayer.position);
    }
  }, [selectedRunner, fieldingPosition]);

  const handleSubmit = () => {
    if (!selectedBase || !selectedRunner) {
      setError('Please select a runner to replace');
      return;
    }

    if (!pinchRunnerId || !pinchRunner) {
      setError('Please select a pinch runner');
      return;
    }

    if (!fieldingPosition) {
      setError('Please select a defensive position');
      return;
    }

    // CRITICAL: Determine who is responsible for ER
    // If the runner was inherited, the original pitcher is responsible
    // Otherwise, the current pitcher is responsible
    const pitcherResponsible = selectedRunner.runner.inheritedFrom || currentPitcherId;

    const event: Omit<PinchRunnerEvent, 'gameId' | 'timestamp'> = {
      eventType: 'PINCH_RUN',
      inning,
      halfInning,
      outs,
      replacedPlayerId: selectedRunner.lineupPlayer.playerId,
      replacedPlayerName: selectedRunner.lineupPlayer.playerName,
      replacedBattingOrder: selectedRunner.lineupPlayer.battingOrder,
      base: selectedBase,
      pinchRunnerId: pinchRunner.playerId,
      pinchRunnerName: pinchRunner.playerName,
      fieldingPosition: fieldingPosition as Position,
      pitcherResponsible,
      howOriginalReached: selectedRunner.runner.howReached || 'hit',
    };

    onSubmit(event);
    onClose();
  };

  return (
    <SubstitutionModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="PINCH RUNNER"
      icon="🏃"
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

      {/* No runners warning */}
      {runnersOnBase.length === 0 ? (
        <div className="bg-[#DD0000]/20 border-[3px] border-[#DD0000] p-4 text-center mb-4">
          <div className="text-sm text-[#E8E8D8] font-bold">No runners on base</div>
          <div className="text-xs text-[#E8E8D8]/60 mt-1">
            Pinch runners can only replace runners currently on base.
          </div>
        </div>
      ) : (
        <>
          {/* Select Runner to Replace */}
          <ModalSection title="RUNNER BEING REPLACED">
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(['1B', '2B', '3B'] as const).map((base) => {
                const runner = runnersOnBase.find(r => r.base === base);
                const isSelected = selectedBase === base;
                const hasRunner = !!runner;

                return (
                  <button
                    key={base}
                    onClick={() => hasRunner && setSelectedBase(base)}
                    disabled={!hasRunner}
                    className={`p-3 border-[3px] transition-all ${
                      isSelected
                        ? 'bg-[#5599FF] border-[#3366FF]'
                        : hasRunner
                          ? 'bg-[#3A5434] border-[#5599FF] hover:bg-[#4A6844]'
                          : 'bg-[#3A5434] border-[#3F5A3A] opacity-40'
                    }`}
                  >
                    <div className="text-xs text-[#FFD700] font-bold mb-1">{base}</div>
                    {runner ? (
                      <>
                        <div className="text-[10px] text-[#E8E8D8] font-bold truncate">
                          {runner.lineupPlayer.playerName}
                        </div>
                        <div className="text-[8px] text-[#E8E8D8]/60">
                          {runner.runner.howReached || 'hit'}
                        </div>
                      </>
                    ) : (
                      <div className="text-[10px] text-[#E8E8D8]/40">Empty</div>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedRunner && (
              <div className="bg-[#3A5434] border-[2px] border-[#DD0000] p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs text-[#E8E8D8] font-bold">
                      {selectedRunner.lineupPlayer.playerName}
                    </div>
                    <div className="text-[10px] text-[#E8E8D8]/60">
                      {selectedRunner.lineupPlayer.position} • Batting #
                      {selectedRunner.lineupPlayer.battingOrder}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-[#E8E8D8]/80">Reached via</div>
                    <div className="text-xs text-[#5599FF] font-bold">
                      {selectedRunner.runner.howReached || 'hit'}
                    </div>
                  </div>
                </div>

                {/* ER Responsibility Warning */}
                {selectedRunner.runner.inheritedFrom && (
                  <div className="bg-[#FFD700]/20 border-[2px] border-[#FFD700] p-2 mt-2">
                    <div className="text-[10px] text-[#E8E8D8]">
                      ⚠️ <strong>Inherited runner</strong> - ER responsibility stays with original
                      pitcher
                    </div>
                  </div>
                )}
              </div>
            )}
          </ModalSection>

          {/* Pinch Runner Selection */}
          <ModalSection title="PINCH RUNNER" variant="highlight">
            <PlayerSelect
              label="Select from bench:"
              value={pinchRunnerId}
              onChange={setPinchRunnerId}
              players={positionPlayersBench.map(p => ({
                id: p.playerId,
                name: p.playerName,
                position: p.positions.join('/'),
              }))}
              placeholder="Select pinch runner..."
            />

            {pinchRunner && (
              <div className="bg-[#3A5434] border-[2px] border-[#5599FF] p-3 mb-3">
                <div className="text-xs text-[#E8E8D8] font-bold">{pinchRunner.playerName}</div>
                <div className="text-[10px] text-[#E8E8D8]/60">
                  Positions: {pinchRunner.positions.join(', ')}
                </div>
              </div>
            )}

            <PositionSelect
              label="Defensive position after play:"
              value={fieldingPosition}
              onChange={(val) => setFieldingPosition(val as Position)}
              positions={DEFENSIVE_POSITIONS}
              placeholder="Select position..."
            />
          </ModalSection>

          {/* ER Tracking Notice */}
          <div className="bg-[#4A6844] border-[3px] border-[#FFD700] p-3 mb-4">
            <div className="text-xs text-[#E8E8D8] font-bold mb-1">📊 ER TRACKING</div>
            <div className="text-[10px] text-[#E8E8D8]/80">
              The pinch runner inherits the ER responsibility of the replaced runner.
              {selectedRunner?.runner.inheritedFrom
                ? ' This runner was inherited, so if they score, the ER counts against the original pitcher.'
                : ' If this runner scores, the ER counts against the current pitcher.'}
            </div>
          </div>
        </>
      )}

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
          disabled={!selectedBase || !pinchRunnerId || !fieldingPosition || runnersOnBase.length === 0}
        >
          Confirm Pinch Runner
        </ModalButton>
      </ModalActions>
    </SubstitutionModalBase>
  );
}
