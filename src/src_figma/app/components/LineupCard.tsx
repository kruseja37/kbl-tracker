/**
 * LineupCard - Substitution system for the GameTracker
 *
 * Per GAMETRACKER_DRAGDROP_SPEC.md Phase 6:
 * - Lineup card handles all position player substitutions
 * - Bullpen section handles pitching changes
 * - Bench section shows available players
 * - Used players shown grayed + strikethrough + ❌
 * - Drag bench player → lineup slot = substitution
 * - Drag lineup player ↔ lineup player = position swap
 */

import { useState, useCallback } from 'react';
import { useDrag, useDrop } from 'react-dnd';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DndRef = any; // React-dnd connector refs compatibility

// ============================================
// TYPES
// ============================================

export interface LineupPlayer {
  id: string;
  name: string;
  position: string;
  battingOrder: number;
  stats?: {
    avg?: string;
    ab?: number;
    h?: number;
    rbi?: number;
  };
  battingHand?: 'L' | 'R' | 'S';
  isUsed?: boolean;
  isCurrentBatter?: boolean;
}

export interface BenchPlayer {
  id: string;
  name: string;
  positions: string[]; // Can play multiple positions
  battingHand?: 'L' | 'R' | 'S';
  isUsed?: boolean;
}

export interface BullpenPitcher {
  id: string;
  name: string;
  throwingHand: 'L' | 'R';
  fitness?: 'FIT' | 'WELL' | 'STRAINED' | 'WEAK';
  isUsed?: boolean;
  isCurrentPitcher?: boolean;
}

export interface SubstitutionData {
  type: 'player_sub' | 'position_swap' | 'pitching_change' | 'double_switch';
  incomingPlayerId: string;
  incomingPlayerName?: string;
  outgoingPlayerId: string;
  outgoingPlayerName?: string;
  newPosition?: string;
  lineupSpot?: number;
}

export interface LineupCardProps {
  lineup: LineupPlayer[];
  bench: BenchPlayer[];
  bullpen: BullpenPitcher[];
  currentPitcher: BullpenPitcher;
  onSubstitution: (sub: SubstitutionData) => void;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

const ItemTypes = {
  LINEUP_PLAYER: 'LINEUP_PLAYER',
  BENCH_PLAYER: 'BENCH_PLAYER',
  BULLPEN_PITCHER: 'BULLPEN_PITCHER',
};

// ============================================
// LINEUP SLOT COMPONENT
// ============================================

interface LineupSlotProps {
  player: LineupPlayer;
  onDrop: (incomingPlayer: { id: string; type: string; from: 'lineup' | 'bench' }, targetPlayer: LineupPlayer) => void;
}

function LineupSlot({ player, onDrop }: LineupSlotProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.LINEUP_PLAYER,
    item: { id: player.id, type: ItemTypes.LINEUP_PLAYER, from: 'lineup' as const, player },
    canDrag: !player.isUsed,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [player]);

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: [ItemTypes.LINEUP_PLAYER, ItemTypes.BENCH_PLAYER],
    canDrop: () => !player.isUsed,
    drop: (item: { id: string; type: string; from: 'lineup' | 'bench' }) => {
      onDrop(item, player);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [player, onDrop]);

  // Combine drag and drop refs
  const combinedRef = (node: HTMLDivElement | null) => {
    drag(node);
    drop(node);
  };

  const isHighlighted = isOver && canDrop;
  const bgColor = player.isCurrentBatter
    ? '#4CAF50'
    : player.isUsed
    ? '#444'
    : isHighlighted
    ? '#3366FF'
    : '#2a2a2a';

  return (
    <div
      ref={combinedRef as DndRef}
      className={`flex items-center gap-2 px-2 py-1.5 border-b border-[#444] transition-all ${
        isDragging ? 'opacity-50' : ''
      } ${player.isUsed ? 'opacity-60' : 'cursor-grab active:cursor-grabbing'}`}
      style={{ backgroundColor: bgColor }}
    >
      {/* Batting order */}
      <div className="w-5 text-center text-[10px] font-bold text-[#C4A853]">
        {player.battingOrder}
      </div>

      {/* Position */}
      <div className={`w-8 text-center text-[9px] font-bold px-1 py-0.5 rounded ${
        player.isUsed ? 'bg-[#333] text-[#666]' : 'bg-[#555] text-white'
      }`}>
        {player.position}
      </div>

      {/* Name */}
      <div className={`flex-1 text-[10px] font-bold ${
        player.isUsed ? 'text-[#666] line-through' : 'text-[#E8E8D8]'
      }`}>
        {player.name}
        {player.isUsed && ' ❌'}
      </div>

      {/* Stats */}
      {player.stats?.avg && (
        <div className={`text-[9px] ${player.isUsed ? 'text-[#555]' : 'text-[#888]'}`}>
          {player.stats.avg}
        </div>
      )}

      {/* Batting hand */}
      {player.battingHand && (
        <div className={`text-[8px] ${player.isUsed ? 'text-[#444]' : 'text-[#666]'}`}>
          {player.battingHand}
        </div>
      )}
    </div>
  );
}

// ============================================
// BENCH PLAYER COMPONENT
// ============================================

interface BenchPlayerItemProps {
  player: BenchPlayer;
}

function BenchPlayerItem({ player }: BenchPlayerItemProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.BENCH_PLAYER,
    item: { id: player.id, type: ItemTypes.BENCH_PLAYER, from: 'bench' as const, player },
    canDrag: !player.isUsed,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [player]);

  return (
    <div
      ref={drag as DndRef}
      className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all ${
        isDragging ? 'opacity-50' : ''
      } ${player.isUsed
        ? 'bg-[#333] opacity-60 cursor-not-allowed'
        : 'bg-[#3a5a3d] cursor-grab active:cursor-grabbing hover:bg-[#4a6a4d]'
      }`}
    >
      <div className={`text-[9px] font-bold ${player.isUsed ? 'text-[#666] line-through' : 'text-[#E8E8D8]'}`}>
        {player.name}
        {player.isUsed && ' ❌'}
      </div>
      <div className={`text-[8px] ${player.isUsed ? 'text-[#555]' : 'text-[#888]'}`}>
        ({player.positions.join('/')})
      </div>
      {player.battingHand && (
        <div className={`text-[7px] ${player.isUsed ? 'text-[#444]' : 'text-[#666]'}`}>
          {player.battingHand}
        </div>
      )}
    </div>
  );
}

// ============================================
// BULLPEN PITCHER COMPONENT
// ============================================

interface BullpenPitcherItemProps {
  pitcher: BullpenPitcher;
}

function BullpenPitcherItem({ pitcher }: BullpenPitcherItemProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.BULLPEN_PITCHER,
    item: { id: pitcher.id, type: ItemTypes.BULLPEN_PITCHER, pitcher },
    canDrag: !pitcher.isUsed && !pitcher.isCurrentPitcher,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [pitcher]);

  const fitnessColor = {
    FIT: '#4CAF50',
    WELL: '#8BC34A',
    STRAINED: '#FF9800',
    WEAK: '#f44336',
  };

  const canDrag = !pitcher.isUsed && !pitcher.isCurrentPitcher;

  return (
    <div
      ref={drag as DndRef}
      className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all ${
        isDragging ? 'opacity-50' : ''
      } ${pitcher.isCurrentPitcher
        ? 'bg-[#4CAF50] border border-[#FFD700]'
        : pitcher.isUsed
        ? 'bg-[#333] opacity-60 cursor-not-allowed'
        : canDrag
        ? 'bg-[#3a3a5a] cursor-grab active:cursor-grabbing hover:bg-[#4a4a6a]'
        : 'bg-[#333]'
      }`}
    >
      <div className={`text-[9px] font-bold ${
        pitcher.isUsed ? 'text-[#666] line-through' : 'text-[#E8E8D8]'
      }`}>
        {pitcher.name}
        {pitcher.isUsed && ' ❌'}
        {pitcher.isCurrentPitcher && ' ⚾'}
      </div>
      <div className={`text-[8px] ${pitcher.isUsed ? 'text-[#555]' : 'text-[#888]'}`}>
        ({pitcher.throwingHand})
      </div>
      {pitcher.fitness && (
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: fitnessColor[pitcher.fitness] }}
          title={pitcher.fitness}
        />
      )}
    </div>
  );
}

// ============================================
// CURRENT PITCHER SLOT (DROP TARGET)
// ============================================

interface CurrentPitcherSlotProps {
  pitcher: BullpenPitcher;
  onPitchingChange: (newPitcherId: string) => void;
}

function CurrentPitcherSlot({ pitcher, onPitchingChange }: CurrentPitcherSlotProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.BULLPEN_PITCHER,
    drop: (item: { id: string; pitcher: BullpenPitcher }) => {
      onPitchingChange(item.id);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [onPitchingChange]);

  const isHighlighted = isOver && canDrop;

  return (
    <div
      ref={drop as DndRef}
      className={`p-2 rounded border-2 transition-all ${
        isHighlighted
          ? 'bg-[#2a4a6a] border-[#FFD700]'
          : 'bg-[#2a2a2a] border-[#555]'
      }`}
    >
      <div className="text-[8px] text-[#888] mb-1">CURRENT PITCHER</div>
      <div className="flex items-center gap-2">
        <div className="text-[11px] font-bold text-[#E8E8D8]">{pitcher.name}</div>
        <div className="text-[9px] text-[#888]">({pitcher.throwingHand})</div>
      </div>
      {isHighlighted && (
        <div className="text-[8px] text-[#FFD700] mt-1">Drop to make pitching change</div>
      )}
    </div>
  );
}

// ============================================
// SUBSTITUTION CONFIRMATION MODAL
// ============================================

interface SubConfirmModalProps {
  subType: 'player_sub' | 'position_swap' | 'pitching_change';
  incomingPlayer: string;
  outgoingPlayer: string;
  newPosition?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function SubConfirmModal({
  subType,
  incomingPlayer,
  outgoingPlayer,
  newPosition,
  onConfirm,
  onCancel
}: SubConfirmModalProps) {
  const title = subType === 'pitching_change'
    ? 'PITCHING CHANGE'
    : subType === 'position_swap'
    ? 'POSITION SWAP'
    : 'SUBSTITUTION';

  const description = subType === 'pitching_change'
    ? `Replace ${outgoingPlayer} with ${incomingPlayer}?`
    : subType === 'position_swap'
    ? `Swap positions: ${incomingPlayer} ↔ ${outgoingPlayer}`
    : `${incomingPlayer} replaces ${outgoingPlayer}${newPosition ? ` at ${newPosition}` : ''}`;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-[#333] border-[4px] border-[#E8E8D8] p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] max-w-xs">
        <div className="text-[10px] text-[#E8E8D8] font-bold mb-2">{title}</div>
        <div className="text-[9px] text-[#C4A853] mb-4">{description}</div>

        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            className="flex-1 bg-[#4CAF50] border-[3px] border-white px-3 py-2 text-white text-[10px] font-bold hover:scale-105 transition-transform"
          >
            CONFIRM
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-[#666] border-[3px] border-white px-3 py-2 text-white text-[10px] font-bold hover:bg-[#888]"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function LineupCard({
  lineup,
  bench,
  bullpen,
  currentPitcher,
  onSubstitution,
  isExpanded = false,
  onToggleExpanded,
}: LineupCardProps) {
  // Pending substitution for confirmation
  const [pendingSub, setPendingSub] = useState<{
    type: 'player_sub' | 'position_swap' | 'pitching_change';
    incomingId: string;
    incomingName: string;
    outgoingId: string;
    outgoingName: string;
    newPosition?: string;
    lineupSpot?: number;
  } | null>(null);

  // Handle drop on lineup slot
  const handleLineupDrop = useCallback((
    incoming: { id: string; type: string; from: 'lineup' | 'bench' },
    target: LineupPlayer
  ) => {
    // Position swap (lineup to lineup)
    if (incoming.from === 'lineup') {
      const incomingPlayer = lineup.find(p => p.id === incoming.id);
      if (incomingPlayer) {
        setPendingSub({
          type: 'position_swap',
          incomingId: incoming.id,
          incomingName: incomingPlayer.name,
          outgoingId: target.id,
          outgoingName: target.name,
        });
      }
    }
    // Substitution (bench to lineup)
    else if (incoming.from === 'bench') {
      const incomingPlayer = bench.find(p => p.id === incoming.id);
      if (incomingPlayer) {
        setPendingSub({
          type: 'player_sub',
          incomingId: incoming.id,
          incomingName: incomingPlayer.name,
          outgoingId: target.id,
          outgoingName: target.name,
          newPosition: target.position,
          lineupSpot: target.battingOrder,
        });
      }
    }
  }, [lineup, bench]);

  // Handle pitching change
  const handlePitchingChange = useCallback((newPitcherId: string) => {
    const newPitcher = bullpen.find(p => p.id === newPitcherId);
    if (newPitcher) {
      setPendingSub({
        type: 'pitching_change',
        incomingId: newPitcherId,
        incomingName: newPitcher.name,
        outgoingId: currentPitcher.id,
        outgoingName: currentPitcher.name,
      });
    }
  }, [bullpen, currentPitcher]);

  // Confirm substitution
  const handleConfirmSub = useCallback(() => {
    if (pendingSub) {
      onSubstitution({
        type: pendingSub.type,
        incomingPlayerId: pendingSub.incomingId,
        incomingPlayerName: pendingSub.incomingName,
        outgoingPlayerId: pendingSub.outgoingId,
        outgoingPlayerName: pendingSub.outgoingName,
        newPosition: pendingSub.newPosition,
        lineupSpot: pendingSub.lineupSpot,
      });
      setPendingSub(null);
    }
  }, [pendingSub, onSubstitution]);

  // Cancel substitution
  const handleCancelSub = useCallback(() => {
    setPendingSub(null);
  }, []);

  return (
    <div className="bg-[#1a1a1a] border-[3px] border-[#E8E8D8] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
      {/* Header */}
      <div
        className="flex justify-between items-center px-3 py-2 bg-[#333] border-b-2 border-[#E8E8D8] cursor-pointer"
        onClick={onToggleExpanded}
      >
        <span className="text-[10px] font-bold text-[#E8E8D8]">LINEUP CARD</span>
        <span className="text-[12px] text-[#C4A853]">{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div className="p-2 space-y-3">
          {/* Lineup */}
          <div>
            <div className="text-[8px] text-[#888] mb-1 px-1">BATTING ORDER</div>
            <div className="border border-[#444] rounded overflow-hidden">
              {lineup.map(player => (
                <LineupSlot
                  key={player.id}
                  player={player}
                  onDrop={handleLineupDrop}
                />
              ))}
            </div>
          </div>

          {/* Bench */}
          <div>
            <div className="text-[8px] text-[#888] mb-1 px-1">BENCH</div>
            <div className="flex flex-wrap gap-1">
              {bench.map(player => (
                <BenchPlayerItem key={player.id} player={player} />
              ))}
              {bench.length === 0 && (
                <div className="text-[8px] text-[#555] italic">No players available</div>
              )}
            </div>
          </div>

          {/* Bullpen */}
          <div>
            <div className="text-[8px] text-[#888] mb-1 px-1">BULLPEN</div>
            <CurrentPitcherSlot
              pitcher={currentPitcher}
              onPitchingChange={handlePitchingChange}
            />
            <div className="flex flex-wrap gap-1 mt-1">
              {bullpen.filter(p => !p.isCurrentPitcher).map(pitcher => (
                <BullpenPitcherItem key={pitcher.id} pitcher={pitcher} />
              ))}
              {bullpen.filter(p => !p.isCurrentPitcher).length === 0 && (
                <div className="text-[8px] text-[#555] italic">No pitchers available</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Substitution confirmation modal */}
      {pendingSub && (
        <SubConfirmModal
          subType={pendingSub.type}
          incomingPlayer={pendingSub.incomingName}
          outgoingPlayer={pendingSub.outgoingName}
          newPosition={pendingSub.newPosition}
          onConfirm={handleConfirmSub}
          onCancel={handleCancelSub}
        />
      )}
    </div>
  );
}

export default LineupCard;
