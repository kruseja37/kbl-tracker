import { useState, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
// EXH-036: Import Mojo/Fitness types for editing
import type { MojoLevel } from '../../../engines/mojoEngine';
import type { FitnessState } from '../../../engines/fitnessEngine';
import { MOJO_STATES, getMojoColor } from '../../../engines/mojoEngine';
import { FITNESS_STATES } from '../../../engines/fitnessEngine';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DndRef = any; // React-dnd connector refs are not fully compatible with React 19 ref types

const DragTypes = {
  BENCH_PLAYER: 'bench_player',
  LINEUP_PLAYER: 'lineup_player',
  PITCHER: 'pitcher',
};

interface PlayerStats {
  ab: number;
  h: number;
  r: number;
  rbi: number;
  bb: number;
  k: number;
}

interface PitcherStats {
  ip: string;
  h: number;
  r: number;
  er: number;
  bb: number;
  k: number;
  pitches: number;
}

export interface Player {
  name: string;
  position?: string; // undefined for bench/substituted out players
  battingOrder?: number; // undefined for bench players
  stats: PlayerStats;
  battingHand: 'L' | 'R' | 'S';
  mojo?: MojoLevel;
  fitness?: FitnessState;
  isOutOfGame?: boolean; // Track if player was substituted out
}

export interface Pitcher {
  name: string;
  stats: PitcherStats;
  throwingHand: 'L' | 'R';
  mojo?: MojoLevel;
  fitness?: FitnessState;
  isStarter?: boolean;
  isActive?: boolean; // Currently pitching in the game
  isOutOfGame?: boolean; // Track if pitcher was substituted out
}

interface TeamRosterProps {
  teamName: string;
  teamColor: string;
  teamBorderColor?: string; // Add optional secondary color for border
  players: Player[];
  pitchers: Pitcher[];
  isAway: boolean;
  isInGame?: boolean; // New prop to distinguish pre-game from live game
  onSubstitution?: (benchPlayerName: string, lineupPlayerName: string) => void;
  onPitcherSubstitution?: (newPitcherName: string, replacedName: string, replacedType: 'player' | 'pitcher') => void;
  onPositionSwap?: (player1Name: string, player2Name: string) => void;
  // EXH-036: Mojo/Fitness editing callbacks
  getPlayerMojo?: (playerName: string) => MojoLevel | undefined;
  getPlayerFitness?: (playerName: string) => FitnessState | undefined;
  onMojoChange?: (playerName: string, newMojo: MojoLevel) => void;
  onFitnessChange?: (playerName: string, newFitness: FitnessState) => void;
}

interface PlayerCardModalProps {
  player: Player | null;
  pitcher: Pitcher | null;
  onClose: () => void;
  teamColor: string;
  teamName: string;
  // EXH-036: Mojo/Fitness editing support
  currentMojo?: MojoLevel;
  currentFitness?: FitnessState;
  onMojoChange?: (newMojo: MojoLevel) => void;
  onFitnessChange?: (newFitness: FitnessState) => void;
}

interface DraggableBenchPlayerProps {
  player: Player;
  onClick: () => void;
}

interface DraggableLineupPlayerProps {
  player: Player;
  onClick: () => void;
  onDrop: (benchPlayer: Player) => void;
  onPitcherDrop: (pitcher: Pitcher) => void;
  onLineupPlayerDrop: (lineupPlayer: Player) => void;
}

interface DraggablePitcherProps {
  pitcher: Pitcher;
  onClick: () => void;
  onPitcherDrop?: (droppedPitcher: Pitcher) => void;
  isInGame?: boolean;
}

function DraggableBenchPlayer({ player, onClick }: DraggableBenchPlayerProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DragTypes.BENCH_PLAYER,
    item: { player },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [player]);

  return (
    <button
      ref={drag as DndRef}
      onClick={(e) => {
        // Only trigger onClick if not currently dragging
        if (!isDragging) {
          onClick();
        }
      }}
      className={`w-full bg-[#5A7A52] border-[2px] border-[#E8E8D8] p-1.5 text-left transition-transform ${
        player.isOutOfGame
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:scale-[1.02] active:scale-[0.98] cursor-move'
      } ${isDragging ? 'opacity-50' : ''}`}
      disabled={player.isOutOfGame}
      style={{ position: 'relative' }}
    >
      <div className="flex items-center justify-between">
        <div className="relative">
          <div className="text-[9px] text-[#E8E8D8] font-bold leading-tight" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{player.name}</div>
          <div className="text-[7px] text-[#E8E8D8]/80 leading-tight" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{player.position} • {player.battingHand}</div>
          {player.isOutOfGame && (
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-[2px] bg-[#DD0000] transform rotate-[-10deg]" />
            </div>
          )}
        </div>
        <div className="text-[8px] text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
          {player.stats.h}-{player.stats.ab}
        </div>
      </div>
    </button>
  );
}

function DraggablePitcher({ pitcher, onClick, onPitcherDrop, isInGame }: DraggablePitcherProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DragTypes.PITCHER,
    item: { pitcher },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [pitcher]);

  // Only allow drops on the active pitcher during live games
  const [{ isOver, canDrop }, drop] = useDrop<{ pitcher: Pitcher }, void, { isOver: boolean; canDrop: boolean }>(() => ({
    accept: DragTypes.PITCHER,
    drop: (item: { pitcher: Pitcher }) => {
      if (onPitcherDrop && item.pitcher.name !== pitcher.name && !item.pitcher.isOutOfGame) {
        onPitcherDrop(item.pitcher);
      }
    },
    canDrop: (item: { pitcher: Pitcher }): boolean => {
      // Can only drop on the active pitcher, and can't drop on yourself
      return Boolean(pitcher.isActive && item.pitcher.name !== pitcher.name && !item.pitcher.isOutOfGame);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [pitcher, onPitcherDrop]);

  const isDropTarget = isOver && canDrop;

  // Combine drag and drop refs
  const combinedRef = (el: HTMLButtonElement | null) => {
    drag(el);
    drop(el);
  };

  return (
    <button
      ref={combinedRef}
      onClick={(e) => {
        if (!isDragging) {
          onClick();
        }
      }}
      className={`w-full bg-[#5A7A52] p-1.5 text-left transition-all ${
        pitcher.isActive ? 'border-[3px] border-[#C4A853]' : 'border-[2px] border-[#E8E8D8]'
      } ${
        pitcher.isOutOfGame
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:scale-[1.02] active:scale-[0.98] cursor-move'
      } ${isDragging ? 'opacity-50' : ''} ${
        isDropTarget ? 'border-[#0066FF] border-[4px] bg-[#6A8A62] scale-105' : ''
      } ${canDrop && !isDropTarget && pitcher.isActive ? 'border-[#7733DD]' : ''}`}
      disabled={pitcher.isOutOfGame}
      style={{ position: 'relative' }}
    >
      <div className="flex items-center justify-between">
        <div className="relative">
          <div className="text-[9px] text-[#E8E8D8] font-bold leading-tight" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{pitcher.name}</div>
          <div className="text-[7px] text-[#E8E8D8]/80 leading-tight" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
            P • {pitcher.throwingHand} {pitcher.isActive ? '• PITCHING' : ''}
          </div>
          {pitcher.isOutOfGame && (
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-[2px] bg-[#DD0000] transform rotate-[-10deg]" />
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-[8px] text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{pitcher.stats.ip} IP</div>
          <div className="text-[7px] text-[#E8E8D8]/80" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{pitcher.stats.pitches}p</div>
        </div>
      </div>
      {/* Visual hint for drop target */}
      {pitcher.isActive && isInGame && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-[6px] text-[#C4A853] font-bold whitespace-nowrap" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.5)' }}>
          ▼ DROP TO REPLACE
        </div>
      )}
    </button>
  );
}

function DraggableLineupPlayer({ player, onClick, onDrop, onPitcherDrop, onLineupPlayerDrop }: DraggableLineupPlayerProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DragTypes.LINEUP_PLAYER,
    item: { player },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [player]);

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: [DragTypes.BENCH_PLAYER, DragTypes.PITCHER, DragTypes.LINEUP_PLAYER],
    drop: (item: { player?: Player; pitcher?: Pitcher }) => {
      if (item.player && item.player.battingOrder !== undefined) {
        // Lineup player dropped on another lineup player - swap positions only
        onLineupPlayerDrop(item.player);
      } else if (item.player && !item.player.isOutOfGame) {
        // Bench player dropped on lineup player - substitution
        onDrop(item.player);
      } else if (item.pitcher && !item.pitcher.isOutOfGame) {
        // Pitcher dropped on lineup player
        onPitcherDrop(item.pitcher);
      }
    },
    canDrop: (item: { player?: Player; pitcher?: Pitcher }) => {
      if (item.player && item.player.battingOrder !== undefined) {
        // Can swap with another lineup player
        return item.player.name !== player.name;
      }
      if (item.player) return !item.player.isOutOfGame;
      if (item.pitcher) return !item.pitcher.isOutOfGame;
      return false;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [onDrop, onPitcherDrop, onLineupPlayerDrop, player]);

  const isActive = isOver && canDrop;

  // Combine drag and drop refs
  const combinedRef = (el: HTMLButtonElement | null) => {
    drag(el);
    drop(el);
  };

  return (
    <button
      ref={combinedRef}
      onClick={onClick}
      className={`w-full bg-[#5A7A52] border-[2px] p-1.5 text-left hover:scale-[1.02] active:scale-[0.98] transition-all cursor-move ${
        isActive 
          ? 'border-[#0066FF] border-[4px] bg-[#6A8A62] scale-105' 
          : 'border-[#E8E8D8]'
      } ${canDrop && !isActive ? 'border-[#7733DD]' : ''} ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-[9px] text-[#E8E8D8] font-bold w-4" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>#{player.battingOrder}</div>
          <div>
            <div className="text-[9px] text-[#E8E8D8] font-bold leading-tight" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{player.name}</div>
            <div className="text-[7px] text-[#E8E8D8]/80 leading-tight" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{player.position} • {player.battingHand}</div>
          </div>
        </div>
        <div className="text-[8px] text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
          {player.stats.h}-{player.stats.ab}
        </div>
      </div>
    </button>
  );
}

function PlayerCardModal({ player, pitcher, onClose, teamColor, teamName, currentMojo, currentFitness, onMojoChange, onFitnessChange }: PlayerCardModalProps) {
  // EXH-036: State for editing mojo/fitness
  const [isEditingMojo, setIsEditingMojo] = useState(false);
  const [isEditingFitness, setIsEditingFitness] = useState(false);

  if (!player && !pitcher) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[100]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" />
      
      {/* Modal */}
      <div 
        className="relative bg-[#6B9462] border-[6px] border-[#E8E8D8] p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {player && (
          <>
            {/* Header */}
            <div 
              className="bg-[#6B9462] border-[4px] border-[#E8E8D8] p-3 mb-3"
            >
              <div className="text-xs text-[#E8E8D8] font-bold mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                #{player.battingOrder || 'BENCH'} • {player.position}
              </div>
              <div className="text-lg text-[#E8E8D8] font-bold flex items-center gap-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                {player.name} <span className="text-xs">• {teamName}</span>
              </div>
              <div className="text-[10px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>BATS: {player.battingHand}</div>
            </div>

            {/* Game Stats */}
            <div className="bg-[#6B9462] border-[3px] border-[#E8E8D8] p-3 mb-3">
              <div className="text-[8px] text-[#E8E8D8] font-bold mb-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>TODAY'S GAME:</div>
              <div className="grid grid-cols-6 gap-2 text-center">
                <div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>AB</div>
                  <div className="text-sm text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{player.stats.ab}</div>
                </div>
                <div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>H</div>
                  <div className="text-sm text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{player.stats.h}</div>
                </div>
                <div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>R</div>
                  <div className="text-sm text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{player.stats.r}</div>
                </div>
                <div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>RBI</div>
                  <div className="text-sm text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{player.stats.rbi}</div>
                </div>
                <div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>BB</div>
                  <div className="text-sm text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{player.stats.bb}</div>
                </div>
                <div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>K</div>
                  <div className="text-sm text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{player.stats.k}</div>
                </div>
              </div>
            </div>

            {/* Season Stats Placeholder */}
            <div className="bg-[#6B9462] border-[3px] border-[#E8E8D8] p-3 mb-3">
              <div className="text-[8px] text-[#E8E8D8] font-bold mb-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>SEASON STATS:</div>
              <div className="text-[10px] text-[#E8E8D8] space-y-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                <div className="flex justify-between">
                  <span>AVG:</span>
                  <span className="font-bold">.{Math.floor(Math.random() * 200 + 200)}</span>
                </div>
                <div className="flex justify-between">
                  <span>HR:</span>
                  <span className="font-bold">{Math.floor(Math.random() * 20 + 5)}</span>
                </div>
                <div className="flex justify-between">
                  <span>RBI:</span>
                  <span className="font-bold">{Math.floor(Math.random() * 60 + 30)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {pitcher && (
          <>
            {/* Header */}
            <div 
              className="bg-[#6B9462] border-[4px] border-[#E8E8D8] p-3 mb-3"
            >
              <div className="text-xs text-[#E8E8D8] font-bold mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                {pitcher.isStarter ? 'STARTER' : 'RELIEVER'} • P
              </div>
              <div className="text-lg text-[#E8E8D8] font-bold flex items-center gap-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                {pitcher.name} <span className="text-xs">• {teamName}</span>
              </div>
              <div className="text-[10px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>THROWS: {pitcher.throwingHand}</div>
            </div>

            {/* Game Stats */}
            <div className="bg-[#6B9462] border-[3px] border-[#E8E8D8] p-3 mb-3">
              <div className="text-[8px] text-[#E8E8D8] font-bold mb-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>TODAY'S GAME:</div>
              <div className="grid grid-cols-6 gap-2 text-center">
                <div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>IP</div>
                  <div className="text-sm text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{pitcher.stats.ip}</div>
                </div>
                <div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>H</div>
                  <div className="text-sm text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{pitcher.stats.h}</div>
                </div>
                <div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>R</div>
                  <div className="text-sm text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{pitcher.stats.r}</div>
                </div>
                <div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>ER</div>
                  <div className="text-sm text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{pitcher.stats.er}</div>
                </div>
                <div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>BB</div>
                  <div className="text-sm text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{pitcher.stats.bb}</div>
                </div>
                <div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>K</div>
                  <div className="text-sm text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{pitcher.stats.k}</div>
                </div>
              </div>
              <div className="text-center mt-2">
                <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>PITCHES</div>
                <div className="text-base text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{pitcher.stats.pitches}</div>
              </div>
            </div>

            {/* Season Stats Placeholder */}
            <div className="bg-[#6B9462] border-[3px] border-[#E8E8D8] p-3 mb-3">
              <div className="text-[8px] text-[#E8E8D8] font-bold mb-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>SEASON STATS:</div>
              <div className="text-[10px] text-[#E8E8D8] space-y-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                <div className="flex justify-between">
                  <span>ERA:</span>
                  <span className="font-bold">{(Math.random() * 2 + 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>W-L:</span>
                  <span className="font-bold">{Math.floor(Math.random() * 10 + 3)}-{Math.floor(Math.random() * 8 + 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>K:</span>
                  <span className="font-bold">{Math.floor(Math.random() * 100 + 50)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* EXH-036: Mojo/Fitness Editing Section */}
        {(currentMojo !== undefined || currentFitness !== undefined) && (
          <div className="bg-[#5A7A52] border-[3px] border-[#E8E8D8] p-3 mb-3 space-y-2">
            <div className="text-[8px] text-[#E8E8D8] font-bold mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
              CONDITION
            </div>

            {/* Mojo Row */}
            {currentMojo !== undefined && onMojoChange && (
              <div className="flex items-center gap-2">
                <span className="text-[7px] text-[#E8E8D8] w-12" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>MOJO</span>
                {isEditingMojo ? (
                  <div className="flex gap-1 flex-wrap">
                    {([-2, -1, 0, 1, 2] as MojoLevel[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => {
                          onMojoChange(level);
                          setIsEditingMojo(false);
                        }}
                        className={`px-2 py-1 text-[8px] font-bold border-2 transition-all ${
                          level === currentMojo
                            ? 'border-[#C4A853] bg-[#C4A853]/30'
                            : 'border-[#E8E8D8]/50 hover:border-[#E8E8D8]'
                        }`}
                        style={{ color: getMojoColor(level) }}
                      >
                        {MOJO_STATES[level].emoji} {MOJO_STATES[level].displayName}
                      </button>
                    ))}
                    <button
                      onClick={() => setIsEditingMojo(false)}
                      className="px-1 text-[#E8E8D8]/70 hover:text-[#E8E8D8]"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-1 cursor-pointer hover:bg-[#6B9462] px-1 rounded"
                    onClick={() => setIsEditingMojo(true)}
                  >
                    <span
                      className="text-xs font-bold"
                      style={{ color: getMojoColor(currentMojo), textShadow: '1px 1px 0px rgba(0,0,0,0.5)' }}
                    >
                      {MOJO_STATES[currentMojo].emoji} {MOJO_STATES[currentMojo].displayName}
                    </span>
                    <span className="text-[8px] text-[#E8E8D8]/70">
                      ({MOJO_STATES[currentMojo].statMultiplier.toFixed(2)}x)
                    </span>
                    <span className="text-[8px] text-[#C4A853]">✏️</span>
                  </div>
                )}
              </div>
            )}

            {/* Fitness Row */}
            {currentFitness !== undefined && onFitnessChange && (
              <div className="flex items-center gap-2">
                <span className="text-[7px] text-[#E8E8D8] w-12" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>FITNESS</span>
                {isEditingFitness ? (
                  <div className="flex gap-1 flex-wrap">
                    {(['JUICED', 'FIT', 'WELL', 'STRAINED', 'WEAK', 'HURT'] as FitnessState[]).map((state) => (
                      <button
                        key={state}
                        onClick={() => {
                          onFitnessChange(state);
                          setIsEditingFitness(false);
                        }}
                        className={`px-2 py-1 text-[8px] font-bold border-2 transition-all ${
                          state === currentFitness
                            ? 'border-[#C4A853] bg-[#C4A853]/30'
                            : 'border-[#E8E8D8]/50 hover:border-[#E8E8D8]'
                        }`}
                        style={{ color: FITNESS_STATES[state].color }}
                      >
                        {FITNESS_STATES[state].emoji} {FITNESS_STATES[state].displayName}
                      </button>
                    ))}
                    <button
                      onClick={() => setIsEditingFitness(false)}
                      className="px-1 text-[#E8E8D8]/70 hover:text-[#E8E8D8]"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-1 cursor-pointer hover:bg-[#6B9462] px-1 rounded"
                    onClick={() => setIsEditingFitness(true)}
                  >
                    <span
                      className="text-xs font-bold"
                      style={{ color: FITNESS_STATES[currentFitness].color, textShadow: '1px 1px 0px rgba(0,0,0,0.5)' }}
                    >
                      {FITNESS_STATES[currentFitness].emoji} {FITNESS_STATES[currentFitness].displayName}
                    </span>
                    <span className="text-[8px] text-[#E8E8D8]/70">
                      ({FITNESS_STATES[currentFitness].multiplier.toFixed(2)}x)
                    </span>
                    <span className="text-[8px] text-[#C4A853]">✏️</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full bg-[#E8E8D8] border-[4px] border-[#6B9462] px-4 py-2 text-[#6B9462] text-sm font-bold hover:bg-white active:scale-95 transition-transform"
        >
          ✕ CLOSE
        </button>
      </div>
    </div>
  );
}

export function TeamRoster({ teamName, teamColor, teamBorderColor, players, pitchers, isAway, isInGame, onSubstitution, onPitcherSubstitution, onPositionSwap, getPlayerMojo, getPlayerFitness, onMojoChange, onFitnessChange }: TeamRosterProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedPitcher, setSelectedPitcher] = useState<Pitcher | null>(null);
  const [localPlayers, setLocalPlayers] = useState<Player[]>(players);
  const [localPitchers, setLocalPitchers] = useState<Pitcher[]>(pitchers);

  // Update local state when props change
  useEffect(() => {
    setLocalPlayers(players);
    setLocalPitchers(pitchers);
  }, [players, pitchers]);

  // Separate players into lineup and bench
  const lineupPlayers = localPlayers
    .filter(p => p.battingOrder !== undefined)
    .sort((a, b) => (a.battingOrder || 0) - (b.battingOrder || 0));
  
  const benchPlayers = localPlayers.filter(p => p.battingOrder === undefined);

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer(player);
    setSelectedPitcher(null);
  };

  const handlePitcherClick = (pitcher: Pitcher) => {
    setSelectedPitcher(pitcher);
    setSelectedPlayer(null);
  };

  const handleCloseModal = () => {
    setSelectedPlayer(null);
    setSelectedPitcher(null);
  };

  const handleSubstitution = (benchPlayer: Player, lineupPlayer: Player) => {
    // Create new player objects with swapped properties
    const newLineupPlayer: Player = {
      ...benchPlayer,
      battingOrder: lineupPlayer.battingOrder,
      position: lineupPlayer.position, // Bench player takes the position of lineup player
    };

    const newBenchPlayer: Player = {
      ...lineupPlayer,
      battingOrder: undefined,
      // In pre-game mode: clear position (player goes to bench pool)
      // In live game mode: preserve position but mark as out of game
      position: isInGame ? lineupPlayer.position : undefined,
      isOutOfGame: isInGame ? true : undefined,
    };

    // Update the local players state
    setLocalPlayers(prevPlayers => {
      return prevPlayers.map(p => {
        if (p.name === benchPlayer.name) {
          return newLineupPlayer;
        }
        if (p.name === lineupPlayer.name) {
          return newBenchPlayer;
        }
        return p;
      });
    });

    // Notify parent component
    if (onSubstitution) {
      onSubstitution(benchPlayer.name, lineupPlayer.name);
    }
  };

  const handlePositionSwap = (player1: Player, player2: Player) => {
    // In pre-game mode: swap BOTH batting order AND position
    // In live game mode: only swap positions (keeping batting order)
    setLocalPlayers(prevPlayers => {
      return prevPlayers.map(p => {
        if (p.name === player1.name) {
          return {
            ...p,
            position: player2.position,
            // Swap batting order in pre-game, keep same in live game
            battingOrder: isInGame ? p.battingOrder : player2.battingOrder,
          };
        }
        if (p.name === player2.name) {
          return {
            ...p,
            position: player1.position,
            // Swap batting order in pre-game, keep same in live game
            battingOrder: isInGame ? p.battingOrder : player1.battingOrder,
          };
        }
        return p;
      });
    });

    // Notify parent component
    if (onPositionSwap) {
      onPositionSwap(player1.name, player2.name);
    }
  };

  const handlePitcherToPlayerSubstitution = (pitcher: Pitcher, lineupPlayer: Player) => {
    // Pitcher replaces a position player (two-way player scenario or pinch-hitting)
    // In pre-game, we want the new pitcher to become the active starter

    // Create a new player from the pitcher
    const newLineupPlayer: Player = {
      name: pitcher.name,
      position: lineupPlayer.position,
      battingOrder: lineupPlayer.battingOrder,
      battingHand: 'R', // Default, would need to be tracked properly in real app
      stats: {
        ab: 0,
        h: 0,
        r: 0,
        rbi: 0,
        bb: 0,
        k: 0,
      },
    };

    const removedPlayer: Player = {
      ...lineupPlayer,
      battingOrder: undefined,
      // Mark as out of game only during live gameplay
      isOutOfGame: isInGame ? true : undefined,
    };

    // Check if the removed player is actually a pitcher who was in the lineup
    const removedPlayerWasPitcher = localPitchers.some(p => p.name === lineupPlayer.name);

    // Update players
    setLocalPlayers(prevPlayers => {
      return prevPlayers.map(p => {
        if (p.name === lineupPlayer.name) {
          return removedPlayer;
        }
        return p;
      }).concat(newLineupPlayer);
    });

    // Update pitcher list - new pitcher becomes active, old pitcher (if any) becomes inactive
    // During live gameplay, mark the replaced pitcher as out of game
    setLocalPitchers(prevPitchers => {
      return prevPitchers.map(p => {
        if (p.name === pitcher.name) {
          // New pitcher becomes the active starter
          return { ...p, isActive: true };
        } else if (p.name === lineupPlayer.name) {
          // If the player being replaced is a pitcher, deactivate and mark as out during live game
          return { 
            ...p, 
            isActive: false,
            isOutOfGame: isInGame ? true : undefined,
          };
        } else if (p.isActive) {
          // Deactivate the previous active pitcher and mark as out during live game
          return { 
            ...p, 
            isActive: false,
            isOutOfGame: isInGame ? true : undefined,
          };
        }
        return p;
      });
    });

    // Notify parent
    if (onPitcherSubstitution) {
      onPitcherSubstitution(pitcher.name, lineupPlayer.name, 'player');
    }
  };

  // Handle pitcher-to-pitcher substitution (e.g., reliever replacing starter)
  const handlePitcherToPitcherSubstitution = (newPitcher: Pitcher, activePitcher: Pitcher) => {
    // Update pitcher list - new pitcher becomes active, old pitcher becomes inactive
    setLocalPitchers(prevPitchers => {
      return prevPitchers.map(p => {
        if (p.name === newPitcher.name) {
          // New pitcher becomes active
          return { ...p, isActive: true };
        } else if (p.name === activePitcher.name) {
          // Old pitcher becomes inactive and marked as out of game during live play
          return {
            ...p,
            isActive: false,
            isOutOfGame: isInGame ? true : undefined,
          };
        }
        return p;
      });
    });

    // Notify parent
    if (onPitcherSubstitution) {
      onPitcherSubstitution(newPitcher.name, activePitcher.name, 'pitcher');
    }
  };

  return (
    <>
      <div
        className="bg-[#4A6A42] border-[4px] p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
        style={{ borderColor: teamBorderColor || '#E8E8D8' }}
      >
        {/* Team Header */}
        <div
          className="text-[10px] font-bold mb-2 flex items-center gap-1"
          style={{
            color: teamColor || '#E8E8D8',
            textShadow: `2px 2px 0px ${teamBorderColor || 'rgba(0,0,0,0.5)'}`,
          }}
        >
          {isAway ? '▲' : '▼'} {teamName}
        </div>

        {/* Batting Order */}
        <div className="space-y-1 mb-2">
          {lineupPlayers.map((player) => (
            <DraggableLineupPlayer
              key={player.name}
              player={player}
              onClick={() => handlePlayerClick(player)}
              onDrop={(benchPlayer) => handleSubstitution(benchPlayer, player)}
              onPitcherDrop={(pitcher) => handlePitcherToPlayerSubstitution(pitcher, player)}
              onLineupPlayerDrop={(lineupPlayer) => handlePositionSwap(lineupPlayer, player)}
            />
          ))}
        </div>

        {/* Bench Players */}
        {benchPlayers.length > 0 && (
          <>
            <div className="text-[7px] text-white font-bold mb-1 mt-2">BENCH:</div>
            <div className="space-y-1 mb-2">
              {benchPlayers.map((player) => (
                <DraggableBenchPlayer
                  key={player.name}
                  player={player}
                  onClick={() => handlePlayerClick(player)}
                />
              ))}
            </div>
          </>
        )}

        {/* Bullpen - All Pitchers */}
        {localPitchers.length > 0 && (
          <>
            <div className="text-[7px] text-white font-bold mb-1 mt-2">BULLPEN:</div>
            <div className="space-y-1">
              {localPitchers.map((pitcher) => (
                <DraggablePitcher
                  key={pitcher.name}
                  pitcher={pitcher}
                  onClick={() => handlePitcherClick(pitcher)}
                  onPitcherDrop={(droppedPitcher) => handlePitcherToPitcherSubstitution(droppedPitcher, pitcher)}
                  isInGame={isInGame}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Player Card Modal - EXH-036: Now with mojo/fitness editing */}
      <PlayerCardModal
        player={selectedPlayer}
        pitcher={selectedPitcher}
        onClose={handleCloseModal}
        teamColor={teamColor}
        teamName={teamName}
        currentMojo={selectedPlayer ? getPlayerMojo?.(selectedPlayer.name) : selectedPitcher ? getPlayerMojo?.(selectedPitcher.name) : undefined}
        currentFitness={selectedPlayer ? getPlayerFitness?.(selectedPlayer.name) : selectedPitcher ? getPlayerFitness?.(selectedPitcher.name) : undefined}
        onMojoChange={selectedPlayer ? (newMojo) => onMojoChange?.(selectedPlayer.name, newMojo) : selectedPitcher ? (newMojo) => onMojoChange?.(selectedPitcher.name, newMojo) : undefined}
        onFitnessChange={selectedPlayer ? (newFitness) => onFitnessChange?.(selectedPlayer.name, newFitness) : selectedPitcher ? (newFitness) => onFitnessChange?.(selectedPitcher.name, newFitness) : undefined}
      />
    </>
  );
}
