import React from 'react';
import { getMojoColor, type MojoLevel } from '../../../engines/mojoEngine';
import type { FitnessState } from '../../../engines/fitnessEngine';
import { toFitnessLabel, toMojoLabel } from '../../../types/game';
import chalkBgImg from '../../../assets/chalk-bg.png';
import batterIconImg from '../../../assets/baseball-player-icon.png';
import { getPlayerLineupMetaParts, type PlayerLineupMetaSource } from '../utils/playerLineupMeta';

const ASH_WOOD_COLOR = '#CBB89C';

interface BattingLineupPlayer extends PlayerLineupMetaSource {
  playerId: string;
  name: string;
  position?: string;
  battingOrder: number;
  gameLine?: string;
}

interface PlayerMojoFitness {
  mojo: MojoLevel;
  fitness: FitnessState;
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
  teamName?: string;
  teamPrimaryColor: string;
  teamSecondaryColor: string;
  /** Direct mojo/fitness data map — keyed by playerId */
  playerStates?: Record<string, PlayerMojoFitness>;
  /** @deprecated Use playerStates instead */
  getMojoForPlayer?: (playerId: string) => MojoLevel | undefined;
  /** @deprecated Use playerStates instead */
  getFitnessForPlayer?: (playerId: string) => FitnessState | undefined;
  onPlayerTap: (playerId: string, playerName: string) => void;
  onMojoAdjust?: (playerId: string, playerName: string, delta: -1 | 1) => void;
}

// FITNESS_ABBREVIATIONS kept for reference but no longer rendered as text
// Color-coded name styling replaces text indicators

/** Get player name styles based on mojo level — use canonical palette for all defined states */
function getMojoNameStyle(level: MojoLevel | undefined): React.CSSProperties | undefined {
  if (level === undefined) {
    return undefined;
  }

  const color = getMojoColor(level);
  const outerOutlineColor =
    level === -2
      ? 'rgba(139,111,71,0.95)'
      : level === -1 || level === 1
        ? 'rgba(255,255,255,0)'
      : level === 2
        ? 'rgba(192,192,192,0.95)'
        : 'rgba(255,255,255,0.9)';
  return {
    color: '#FFFFFF',
    opacity: 1,
    textShadow:
      level === 0
        ? 'none'
        : `-1px 0 0 ${color}, 1px 0 0 ${color}, 0 -1px 0 ${color}, 0 1px 0 ${color}, -1px -1px 0 ${color}, 1px -1px 0 ${color}, -1px 1px 0 ${color}, 1px 1px 0 ${color}, -1.35px 0 0 ${outerOutlineColor}, 1.35px 0 0 ${outerOutlineColor}, 0 -1.35px 0 ${outerOutlineColor}, 0 1.35px 0 ${outerOutlineColor}`,
  };
}

// Fitness uses style-only (no colors) to avoid collision with mojo colors

/** Get player name style overrides based on fitness */
function getFitnessNameStyle(state: FitnessState | undefined): React.CSSProperties | undefined {
  switch (state) {
    case 'JUICED': return { fontWeight: 900 };
    case 'STRAINED': return { fontStyle: 'italic' as const };
    case 'WEAK': return { opacity: 0.8, textDecoration: 'underline', textDecorationStyle: 'dotted' as const };
    case 'HURT': return { opacity: 0.6, textDecoration: 'line-through' };
    default: return undefined;
  }
}

/** §5.2: Batting Lineup Column — ordered by batting order, 9 players always visible */
export function BattingLineupColumn({
  players,
  currentBatterIndex,
  runners,
  nextLeadoffIndex,
  teamName,
  teamPrimaryColor,
  teamSecondaryColor,
  playerStates,
  getMojoForPlayer,
  getFitnessForPlayer,
  onPlayerTap,
  onMojoAdjust,
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
    <div className="bg-[#3d4a42] flex h-full min-h-0 flex-col overflow-hidden">
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
      <div className="relative flex items-center justify-center px-7 pt-1.5 pb-1 text-[10px] text-white font-bold tracking-wider" style={{ background: `linear-gradient(${teamPrimaryColor}40, ${teamPrimaryColor}40), #1a2420`, backgroundImage: `url(${chalkBgImg}), linear-gradient(${teamPrimaryColor}40, ${teamPrimaryColor}40)`, backgroundRepeat: 'repeat', backgroundColor: '#1a2420' }}>
        <span
          aria-hidden="true"
          className="absolute right-2 top-1/2 h-[15px] w-[15px] -translate-y-1/2"
          style={{
            backgroundColor: ASH_WOOD_COLOR,
            WebkitMaskImage: `url(${batterIconImg})`,
            maskImage: `url(${batterIconImg})`,
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
          }}
        />
        <span className="min-w-0 truncate">{teamName || 'BATTING'}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ borderRight: '2px solid rgba(242, 192, 65, 0.08)' }}>
        {players.map((player) => {
          const isCurrent = player.battingOrder === currentBatterIndex;
          const isNextLeadoff = player.battingOrder === nextLeadoffIndex && !isCurrent;
          const onBase =
            runnerBaseMap.get(player.playerId) ?? runnerBaseMap.get(player.name);
          const shouldHighlightRow = highlightedBatterIndex === player.battingOrder;
          const state = playerStates?.[player.playerId];
          const playerMojo = state?.mojo ?? getMojoForPlayer?.(player.playerId);
          const playerFitness = state?.fitness ?? getFitnessForPlayer?.(player.playerId);
          const mojoForControls = playerMojo ?? 0;
          const mojoStyle = getMojoNameStyle(playerMojo);
          const fitnessStyle = getFitnessNameStyle(playerFitness);
          const playerMeta = getPlayerLineupMetaParts(player);

          return (
            <div
              key={player.playerId}
              className="flex min-h-0 flex-1 items-stretch gap-1 px-2 py-[1px]"
              style={{
                animation: shouldHighlightRow ? 'batting-lineup-row-highlight 200ms ease-out' : undefined,
              }}
              onAnimationEnd={() => {
                if (shouldHighlightRow) {
                  setHighlightedBatterIndex(null);
                }
              }}
            >
              <button
                type="button"
                onClick={() => onPlayerTap(player.playerId, player.name)}
                className="h-full min-w-0 flex-1 overflow-hidden text-left px-0 py-0 transition-colors hover:bg-[#1E3218]/50 active:bg-[#1E3218]"
                style={{
                  border: !isCurrent && isNextLeadoff
                    ? `2px dotted ${teamSecondaryColor}`
                    : '2px solid transparent',
                }}
              >
                <div className="flex h-full min-h-0 flex-col overflow-hidden">
                  <div
                    data-testid={`batting-lineup-name-row-${player.playerId}`}
                    className={`flex min-h-[22px] shrink-0 items-start text-[10px] leading-[11px] tracking-wide ${onBase ? 'font-black text-white' : 'font-bold text-[#E8E8D8]'}`}
                  >
                    <span
                      className="inline-flex w-[26px] shrink-0 items-start text-[#CBB89C]"
                      style={{
                        fontFamily: "'Moms Typewriter', monospace",
                        fontSize: '11px',
                        lineHeight: '13px',
                      }}
                    >
                      {player.battingOrder}.
                    </span>
                    <span
                      data-testid={`batting-lineup-name-highlight-${player.playerId}`}
                      className="flex min-w-0 flex-1 items-center"
                      style={{
                        backgroundImage: isCurrent ? `url(${chalkBgImg})` : undefined,
                        backgroundRepeat: isCurrent ? 'repeat' : undefined,
                        backgroundColor: isCurrent ? 'rgba(242, 192, 65, 0.03)' : undefined,
                      }}
                    >
                      {onBase !== undefined && (
                        <span
                          data-testid={`batting-lineup-runner-base-${player.playerId}`}
                          aria-label={`${onBase}B runner`}
                          className="mr-[2px] inline-flex shrink-0 self-start font-black"
                          style={{
                            color: teamSecondaryColor,
                            fontFamily: "'Moms Typewriter', monospace",
                            fontSize: '8px',
                            letterSpacing: '0',
                            lineHeight: '8px',
                            textShadow: '0 1px 1px rgba(0,0,0,0.9)',
                          }}
                          title={`${player.name} on ${onBase}B`}
                        >
                          {onBase}
                        </span>
                      )}
                      <span
                        className="min-w-0 flex-1 whitespace-normal break-words"
                        style={{
                          ...mojoStyle,
                          ...fitnessStyle,
                          fontFamily: "'Tox Typewriter', monospace",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                        title={[
                          playerMojo !== 0 && playerMojo !== undefined
                            ? `Mojo: ${toMojoLabel(playerMojo!)}`
                            : null,
                          playerFitness !== 'FIT' && playerFitness !== undefined
                            ? `Fitness: ${toFitnessLabel(playerFitness!)}`
                            : null,
                        ].filter(Boolean).join(' | ') || undefined}
                      >{player.name}</span>
                      {player.position && (
                        <span className="ml-1 shrink-0 text-[#D4B85A] text-[7px]">{player.position}</span>
                      )}
                    </span>
                  </div>
                  <div
                    data-testid={`batting-lineup-meta-${player.playerId}`}
                    className="ml-[26px] flex h-[9px] max-h-[9px] shrink-0 min-w-0 items-center gap-[2px] overflow-hidden text-[#CBB89C]/65"
                    style={{
                      backgroundImage: isCurrent ? `url(${chalkBgImg})` : undefined,
                      backgroundRepeat: isCurrent ? 'repeat' : undefined,
                      backgroundColor: isCurrent ? 'rgba(242, 192, 65, 0.03)' : undefined,
                      fontFamily: "'Tox Typewriter', monospace",
                      lineHeight: "9px",
                      letterSpacing: "0px",
                    }}
                  >
                    {playerMeta.jersey && (
                      <span
                        className="shrink-0 font-bold"
                        style={{ fontSize: "9px", lineHeight: "9px", color: "#D4B85A" }}
                      >
                        {playerMeta.jersey}
                      </span>
                    )}
                    {playerMeta.jersey && playerMeta.hometown && (
                      <span className="shrink-0" aria-hidden="true">
                        {" "}
                      </span>
                    )}
                    {playerMeta.hometown && (
                      <span
                        className="truncate font-bold"
                        style={{ fontSize: "8px", lineHeight: "9px" }}
                      >
                        {playerMeta.hometown}
                      </span>
                    )}
                  </div>
                  <div
                    data-testid={`batting-lineup-game-line-${player.playerId}`}
                    className="ml-[34px] mt-[1px] h-[18px] min-w-0 overflow-hidden text-[#A9B9A2]"
                    style={{
                      fontFamily: "'Tox Typewriter', monospace",
                      fontSize: "8.5px",
                      lineHeight: "9px",
                      letterSpacing: "0px",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      whiteSpace: "normal",
                    }}
                  >
                    {player.gameLine || "0 for 0"}
                  </div>
                </div>
              </button>
              {onMojoAdjust && (
                <div className="flex flex-col justify-center gap-[2px]">
                  <button
                    type="button"
                    aria-label={`Increase mojo for ${player.name}`}
                    disabled={mojoForControls >= 3}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onMojoAdjust(player.playerId, player.name, 1);
                    }}
                    className="h-[10px] w-[14px] text-[8px] font-bold text-[#D4B85A]/40 leading-none hover:text-[#F2C041]/70 disabled:cursor-not-allowed disabled:opacity-40" style={{ fontFamily: "'Chalk', monospace" }}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label={`Decrease mojo for ${player.name}`}
                    disabled={mojoForControls <= -2}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onMojoAdjust(player.playerId, player.name, -1);
                    }}
                    className="h-[10px] w-[14px] text-[8px] font-bold text-[#D4B85A]/40 leading-none hover:text-[#F2C041]/70 disabled:cursor-not-allowed disabled:opacity-40" style={{ fontFamily: "'Chalk', monospace" }}
                  >
                    ▼
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BattingLineupColumn;
