import React from 'react';
import { getMojoColor, type MojoLevel } from '../../../engines/mojoEngine';
import type { FitnessState } from '../../../engines/fitnessEngine';
import { toFitnessLabel, toMojoLabel } from '../../../types/game';
import chalkBgImg from '../../../assets/chalk-bg.png';
import { getPlayerLineupMetaParts, type PlayerLineupMetaSource } from '../utils/playerLineupMeta';


interface DefensiveLineupPlayer extends PlayerLineupMetaSource {
  playerId: string;
  name: string;
  position?: string;
  battingOrder: number;
  isPitcher: boolean;
  pitchCount?: number;
  gameLine?: string;
}

// UX-024: Position number lookup for enrichment mode
const POSITION_TO_NUMBER: Record<string, number> = {
  P: 1, C: 2, '1B': 3, '2B': 4, '3B': 5, SS: 6, LF: 7, CF: 8, RF: 9,
};

/** §5.4: Enrichment mode config — passed from GameTracker when enriching fielding sequence */
export interface DefensiveEnrichmentMode {
  active: boolean;
  sequence: number[];
  onFielderTap: (posNum: number) => void;
  onDone: () => void;
  onClear: () => void;
}

interface PlayerMojoFitness {
  mojo: MojoLevel;
  fitness: FitnessState;
}

interface DefensiveLineupColumnProps {
  players: DefensiveLineupPlayer[];
  currentPitcherName: string;
  nextLeadoffIndex: number; // 1-based batting order of next inning's leadoff
  teamName?: string;
  teamPrimaryColor: string;
  teamSecondaryColor: string;
  playerStates?: Record<string, PlayerMojoFitness>;
  getMojoForPlayer?: (playerId: string) => MojoLevel | undefined;
  getFitnessForPlayer?: (playerId: string) => FitnessState | undefined;
  onPlayerTap: (playerId: string, playerName: string) => void;
  onMojoAdjust?: (playerId: string, playerName: string, delta: -1 | 1) => void;
  headerAction?: {
    label: string;
    onClick: () => void;
  };
  /** §5.4: When set, column toggles into fielding sequence enrichment mode */
  enrichmentMode?: DefensiveEnrichmentMode;
}

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

/** §5.3: Defensive Lineup Column — ordered by batting order, 9 players always visible */
export function DefensiveLineupColumn({
  players,
  currentPitcherName,
  nextLeadoffIndex,
  teamName,
  teamPrimaryColor,
  teamSecondaryColor,
  playerStates,
  getMojoForPlayer,
  getFitnessForPlayer,
  onPlayerTap,
  onMojoAdjust,
  headerAction,
  enrichmentMode,
}: DefensiveLineupColumnProps) {
  const isEnriching = enrichmentMode?.active ?? false;

  return (
    <div className="bg-[#3d4a42] flex h-full min-h-0 flex-col overflow-hidden">
      {/* Header — switches between FIELDING and FIELDING SEQUENCE */}
      <div className={`px-2 pt-1.5 pb-1 flex items-center justify-center gap-2 ${
        isEnriching ? 'text-white' : 'text-white'
      }`} style={isEnriching ? { backgroundColor: '#1a2420' } : { backgroundImage: `url(${chalkBgImg}), linear-gradient(${teamPrimaryColor}40, ${teamPrimaryColor}40)`, backgroundRepeat: 'repeat', backgroundColor: '#1a2420' }}>
        <div className="text-[10px] font-bold tracking-wider">
          {isEnriching ? 'FIELDING SEQUENCE' : teamName || 'FIELDING'}
        </div>
        {!isEnriching && headerAction && (
          <button
            type="button"
            onClick={headerAction.onClick}
            className="bg-[#5dade2] border border-[#d6efff] px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-[#082032] hover:bg-[#7ac4f5] active:scale-95 transition-transform"
          >
            {headerAction.label}
          </button>
        )}
      </div>

      {/* Sequence display + controls when enriching */}
      {isEnriching && enrichmentMode && (
        <div className="px-2 py-1 border-b border-[#4a6a4a] bg-[#1a2a1d]">
          <div className="text-[9px] text-[#E8E8D8] font-mono min-h-[14px]">
            {enrichmentMode.sequence.length > 0
              ? enrichmentMode.sequence.join(' → ')
              : <span className="text-[#6b7280] italic">Tap fielders below</span>}
          </div>
          <div className="flex gap-1 mt-1">
            <button
              onClick={enrichmentMode.onDone}
              className="text-[7px] text-[#34d399] bg-[#064e3b]/60 border border-[#34d399]/40 px-2 py-0.5 rounded hover:bg-[#064e3b]"
            >
              Done
            </button>
            <button
              onClick={enrichmentMode.onClear}
              disabled={enrichmentMode.sequence.length === 0}
              className="text-[7px] text-[#f87171] bg-[#7f1d1d]/30 border border-[#f87171]/30 px-2 py-0.5 rounded hover:bg-[#7f1d1d]/50 disabled:opacity-30"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ borderLeft: '2px solid rgba(242, 192, 65, 0.08)' }}>
        {players.map((player) => {
          const isPitching = player.name === currentPitcherName;
          const isNextLeadoff = player.battingOrder === nextLeadoffIndex && !isPitching;
          const posNum = POSITION_TO_NUMBER[player.position || ''] || 0;
          // In enrichment mode, highlight positions already in the sequence
          const isInSequence = isEnriching && posNum > 0 && enrichmentMode!.sequence.includes(posNum);
          const state = playerStates?.[player.playerId];
          const playerMojo = state?.mojo ?? getMojoForPlayer?.(player.playerId);
          const playerFitness = state?.fitness ?? getFitnessForPlayer?.(player.playerId);
          const mojoForControls = playerMojo ?? 0;
          const mojoStyle = getMojoNameStyle(playerMojo);
          const fitnessStyle = getFitnessNameStyle(playerFitness);
          const playerMeta = getPlayerLineupMetaParts(player);

          const handleClick = () => {
            if (isEnriching && posNum > 0) {
              enrichmentMode!.onFielderTap(posNum);
            } else {
              onPlayerTap(player.playerId, player.name);
            }
          };

          return (
            <div
              key={player.playerId}
              className="flex min-h-0 flex-1 items-stretch gap-1 px-2 py-[1px]"
              style={{
              }}
            >
              <button
                type="button"
                onClick={handleClick}
                className={`h-full min-w-0 flex-1 overflow-hidden text-left transition-colors ${
                  isEnriching
                    ? 'hover:bg-[#D4B85A]/20 active:bg-[#D4B85A]/30'
                    : 'hover:bg-[#1E3218]/50 active:bg-[#1E3218]'
                }`}
                style={{
                  borderLeft: isEnriching
                    ? isInSequence
                      ? '3px solid #D4B85A'
                      : '3px solid transparent'
                    : undefined,
                  border: '2px solid transparent',
                }}
              >
                <div className="flex h-full min-h-0 flex-col overflow-hidden">
                  {/* Top row: order + position + name */}
                  <div className={`flex h-[14px] shrink-0 items-center text-[11px] leading-[14px] tracking-wide font-bold ${
                    isEnriching && isInSequence ? 'text-[#D4B85A]' : 'text-[#E8E8D8]'
                  }`}>
                    <span
                      className="inline-flex w-[26px] shrink-0 items-center text-[#CBB89C]"
                      style={{
                        fontFamily: "'Moms Typewriter', monospace",
                        fontSize: '11px',
                        lineHeight: '13px',
                      }}
                    >
                      {player.battingOrder}.
                    </span>
                    <span
                      style={{
                        ...(!isEnriching ? mojoStyle : undefined),
                        ...(!isEnriching ? fitnessStyle : {}),
                        fontFamily: "'Tox Typewriter', monospace",
                      }}
                      title={!isEnriching ? [
                        playerMojo !== 0 && playerMojo !== undefined
                          ? `Mojo: ${toMojoLabel(playerMojo!)}`
                          : null,
                        playerFitness !== 'FIT' && playerFitness !== undefined
                          ? `Fitness: ${toFitnessLabel(playerFitness!)}`
                          : null,
                      ].filter(Boolean).join(' | ') || undefined : undefined}
                    >{player.name}</span>
                    {player.position && (
                      <span className="ml-1 text-[#D4B85A] text-[7px]">
                        {player.position}
                      </span>
                    )}
                    {!isEnriching && isNextLeadoff && (
                      <span className="text-[6px] ml-1 opacity-50" style={{ fontFamily: "'Chalk', monospace" }}>⚾</span>
                    )}
                  </div>
                  {/* Bottom row: in enrichment mode show position number, else pitch count / dash */}
                  <div
                    className="h-[9px] shrink-0 overflow-hidden text-[#6b7b6e]"
                    style={{
                      fontFamily: "'Tox Typewriter', monospace",
                      fontSize: "8px",
                      lineHeight: "9px",
                      letterSpacing: "0px",
                    }}
                  >
                    {isEnriching
                      ? posNum > 0
                        ? <span className="text-[#D4B85A]/60">#{posNum}</span>
                        : null
                      : (
                        <div
                          data-testid={`defensive-lineup-meta-${player.playerId}`}
                          className="ml-[26px] flex h-[9px] max-h-[9px] min-w-0 items-center gap-[2px] overflow-hidden"
                        >
                          {player.isPitcher && player.pitchCount !== undefined && (
                            <span className="shrink-0 font-bold">{`PC: ${player.pitchCount}`}</span>
                          )}
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
                              className="truncate font-bold text-[#CBB89C]/65"
                              style={{ fontSize: "8px", lineHeight: "9px" }}
                            >
                              {playerMeta.hometown}
                            </span>
                          )}
                        </div>
                      )}
                  </div>
                  <div
                    data-testid={`defensive-lineup-game-line-${player.playerId}`}
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

export default DefensiveLineupColumn;
