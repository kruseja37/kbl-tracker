import React from 'react';
import type { MojoLevel } from '../../../engines/mojoEngine';
import type { FitnessState } from '../../../engines/fitnessEngine';
import { toFitnessLabel, toMojoLabel } from '../../../types/game';

interface BattingLineupPlayer {
  playerId: string;
  name: string;
  position?: string;
  battingOrder: number;
}

interface BattingLineupColumnProps {
  players: BattingLineupPlayer[];
  currentBatterIndex: number; // 1-based batting order of current batter
  runners: {
    first?: { name: string; playerId?: string };
    second?: { name: string; playerId?: string };
    third?: { name: string; playerId?: string };
  };
  nextLeadoffIndex: number; // 1-based batting order of next inning's leadoff
  teamPrimaryColor: string;
  teamSecondaryColor: string;
  getMojoForPlayer: (playerId: string) => MojoLevel | undefined;
  getFitnessForPlayer: (playerId: string) => FitnessState | undefined;
  onPlayerTap: (playerId: string, playerName: string) => void;
}

const FITNESS_ABBREVIATIONS: Record<Exclude<FitnessState, 'FIT'>, string> = {
  JUICED: 'JCD',
  WELL: 'WEL',
  STRAINED: 'STR',
  WEAK: 'WK',
  HURT: 'HRT',
};

function getMojoIndicator(level: MojoLevel | undefined) {
  if (level === undefined || level === 0) {
    return null;
  }

  return {
    text: level > 0 ? '▲' : '▼',
    color: level > 0 ? '#22c55e' : '#ef4444',
    label: toMojoLabel(level),
  };
}

function getFitnessIndicator(state: FitnessState | undefined) {
  if (state === undefined || state === 'FIT') {
    return null;
  }

  return {
    text: FITNESS_ABBREVIATIONS[state],
    label: toFitnessLabel(state),
  };
}

/** §5.2: Batting Lineup Column — ordered by batting order, 9 players always visible */
export function BattingLineupColumn({
  players,
  currentBatterIndex,
  runners,
  nextLeadoffIndex,
  teamPrimaryColor,
  teamSecondaryColor,
  getMojoForPlayer,
  getFitnessForPlayer,
  onPlayerTap,
}: BattingLineupColumnProps) {
  const [highlightedBatterIndex, setHighlightedBatterIndex] = React.useState<number | null>(null);
  const previousCurrentBatterIndex = React.useRef(currentBatterIndex);

  React.useEffect(() => {
    if (currentBatterIndex !== previousCurrentBatterIndex.current) {
      setHighlightedBatterIndex(currentBatterIndex);
    }

    previousCurrentBatterIndex.current = currentBatterIndex;
  }, [currentBatterIndex]);

  // Prefer stable player identity for lineup markers; fall back to names if needed.
  const runnerBaseMap = new Map<string, number>();
  if (runners.first?.playerId) runnerBaseMap.set(runners.first.playerId, 1);
  if (runners.second?.playerId) runnerBaseMap.set(runners.second.playerId, 2);
  if (runners.third?.playerId) runnerBaseMap.set(runners.third.playerId, 3);
  if (runners.first?.name) runnerBaseMap.set(runners.first.name, 1);
  if (runners.second?.name) runnerBaseMap.set(runners.second.name, 2);
  if (runners.third?.name) runnerBaseMap.set(runners.third.name, 3);
  console.log('[M1-2] [R3-R4] BattingLineupColumn runner map:', Object.fromEntries(runnerBaseMap));
  console.log('[M1-2] [R3-R4] BattingLineupColumn players:', players.map((player) => ({
    playerId: player.playerId,
    name: player.name,
  })));

  return (
    <div className="bg-[#2a3a2d] border border-[#3d5240] flex flex-col h-full">
      <style>{`
        @keyframes batting-lineup-row-highlight {
          0% {
            background-color: rgba(242, 191, 22, 0);
          }
          45% {
            background-color: rgba(242, 191, 22, 0.22);
          }
          100% {
            background-color: rgba(242, 191, 22, 0);
          }
        }
      `}</style>
      <div className="text-[10px] text-[#88AA88] font-bold tracking-wider px-2 pt-1.5 pb-1 border-b border-[#3d5240]">
        BATTING
      </div>
      <div className="flex flex-col flex-1 justify-evenly">
        {players.map((player) => {
          const isCurrent = player.battingOrder === currentBatterIndex;
          const isNextLeadoff = player.battingOrder === nextLeadoffIndex && !isCurrent;
          const onBase =
            runnerBaseMap.get(player.playerId) ?? runnerBaseMap.get(player.name);
          const shouldHighlightRow = highlightedBatterIndex === player.battingOrder;
          const mojoIndicator = getMojoIndicator(getMojoForPlayer(player.playerId));
          const fitnessIndicator = getFitnessIndicator(getFitnessForPlayer(player.playerId));

          return (
            <button
              key={player.playerId}
              onClick={() => onPlayerTap(player.playerId, player.name)}
              className="text-left px-2 py-0.5 transition-colors hover:bg-[#3d5240]/50 active:bg-[#3d5240]"
              style={{
                animation: shouldHighlightRow ? 'batting-lineup-row-highlight 200ms ease-out' : undefined,
                border: isCurrent
                  ? `2px solid ${teamPrimaryColor}`
                  : isNextLeadoff
                    ? `2px dotted ${teamSecondaryColor}`
                    : '2px solid transparent',
              }}
              onAnimationEnd={() => {
                if (shouldHighlightRow) {
                  setHighlightedBatterIndex(null);
                }
              }}
            >
              <div className={`text-[9px] leading-tight tracking-wide ${onBase ? 'font-black text-white' : 'font-bold text-[#E8E8D8]'}`}>
                <span className="text-[#88AA88] mr-0.5">{player.battingOrder}.</span>
                {player.position && (
                  <span className="text-[#C4A853] mr-1">{player.position}</span>
                )}
                <span>{player.name}</span>
                {mojoIndicator && (
                  <span
                    className="ml-1 font-semibold align-baseline"
                    style={{ color: mojoIndicator.color }}
                    title={`Mojo: ${mojoIndicator.label}`}
                  >
                    {mojoIndicator.text}
                  </span>
                )}
                {fitnessIndicator && (
                  <span
                    className="ml-1 text-[#C4A853] align-baseline"
                    title={`Fitness: ${fitnessIndicator.label}`}
                  >
                    {fitnessIndicator.text}
                  </span>
                )}
                {onBase !== undefined && (
                  <sup className="text-[7px] text-[#F2BF16] ml-0.5">{onBase}</sup>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default BattingLineupColumn;
