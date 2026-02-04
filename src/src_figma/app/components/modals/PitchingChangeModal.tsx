/**
 * PitchingChangeModal - Handle pitching changes with bequeathed runner tracking
 *
 * Per FIGMA_IMPLEMENTATION_PLAN.md Phase 1.1
 * Per substitution.ts types
 *
 * Features:
 * - Select outgoing pitcher with pitch count and line
 * - Show bequeathed runners (who the new pitcher inherits)
 * - Select incoming pitcher from available bullpen
 * - Track inherited runners for ER attribution
 */

import { useState, useEffect } from 'react';
import {
  SubstitutionModalBase,
  ModalSection,
  PlayerSelect,
  NumberInput,
  ModalButton,
  ModalActions,
  RunnerDisplay,
  PitcherLineDisplay,
} from './SubstitutionModalBase';
import type {
  PitchingChangeEvent,
  PitcherLine,
  BequeathedRunner,
  PitcherRole,
  BenchPlayer,
  LineupPlayer,
  Bases,
  buildBequeathedRunners,
} from '../../types/substitution';

interface PitchingChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: Omit<PitchingChangeEvent, 'gameId' | 'timestamp'>) => void;

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

  // Available pitchers
  availablePitchers: BenchPlayer[];
}

export function PitchingChangeModal({
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
  availablePitchers,
}: PitchingChangeModalProps) {
  // Form state
  const [selectedPitcherId, setSelectedPitcherId] = useState('');
  const [pitcherRole, setPitcherRole] = useState<PitcherRole>('RP');
  const [error, setError] = useState('');

  // Build bequeathed runners from current bases
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

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPitcherId('');
      setPitcherRole('RP');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!currentPitcher) {
      setError('No current pitcher to replace');
      return;
    }

    if (!selectedPitcherId) {
      setError('Please select an incoming pitcher');
      return;
    }

    const incomingPitcher = availablePitchers.find(p => p.playerId === selectedPitcherId);
    if (!incomingPitcher) {
      setError('Invalid pitcher selection');
      return;
    }

    const event: Omit<PitchingChangeEvent, 'gameId' | 'timestamp'> = {
      eventType: 'PITCH_CHANGE',
      inning,
      halfInning,
      outs,
      outgoingPitcherId: currentPitcher.playerId,
      outgoingPitcherName: currentPitcher.playerName,
      outgoingPitchCount: currentPitchCount,
      outgoingLine: currentPitcherStats,
      bequeathedRunners,
      incomingPitcherId: selectedPitcherId,
      incomingPitcherName: incomingPitcher.playerName,
      incomingPitcherRole: pitcherRole,
      inheritedRunners: bequeathedRunners.length,
    };

    onSubmit(event);
    onClose();
  };

  return (
    <SubstitutionModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="PITCHING CHANGE"
      icon="⚾"
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

      {/* Outgoing Pitcher */}
      <ModalSection title="OUTGOING PITCHER">
        {currentPitcher ? (
          <>
            <div className="bg-[#3A5434] border-[2px] border-[#DD0000] p-3 mb-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs text-[#E8E8D8] font-bold">{currentPitcher.playerName}</div>
                  <div className="text-[10px] text-[#E8E8D8]/60">{currentPitcher.position}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#E8E8D8]/80">PITCHES</div>
                  <div className="text-lg text-[#FFD700] font-bold">{currentPitchCount}</div>
                </div>
              </div>
            </div>
            <PitcherLineDisplay label="FINAL LINE" stats={currentPitcherStats} />
          </>
        ) : (
          <div className="text-xs text-[#E8E8D8]/60 text-center p-4">
            No pitcher currently on the mound
          </div>
        )}
      </ModalSection>

      {/* Bequeathed Runners */}
      {bequeathedRunners.length > 0 && (
        <RunnerDisplay
          runners={bequeathedRunners}
          title="⚠️ BEQUEATHED RUNNERS (Will inherit to new pitcher)"
        />
      )}

      {/* Incoming Pitcher */}
      <ModalSection title="INCOMING PITCHER" variant="highlight">
        <PlayerSelect
          label="Select Pitcher:"
          value={selectedPitcherId}
          onChange={setSelectedPitcherId}
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

        {bequeathedRunners.length > 0 && (
          <div className="bg-[#DD0000]/20 border-[2px] border-[#DD0000] p-3 mt-3">
            <div className="text-[10px] text-[#E8E8D8] text-center">
              ⚠️ New pitcher inherits <strong>{bequeathedRunners.length} runner(s)</strong>
              <br />
              <span className="text-[#E8E8D8]/60">
                If they score, they count against the outgoing pitcher&apos;s ER
              </span>
            </div>
          </div>
        )}
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
          disabled={!selectedPitcherId || !currentPitcher}
        >
          Confirm Change
        </ModalButton>
      </ModalActions>
    </SubstitutionModalBase>
  );
}
