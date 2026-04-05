import React from 'react';
import { getMojoColor, type MojoLevel } from '../../../engines/mojoEngine';

function abbreviateTeamName(name: string): string {
  const cleaned = name.trim().toUpperCase();
  if (cleaned.length <= 4) return cleaned;
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const initials = words.map((word) => word[0]).join('');
    if (initials.length >= 2 && initials.length <= 4) return initials;
  }
  return cleaned.slice(0, 4);
}

interface FenwayBoardProps {
  // Scoreboard props
  awayTeamName: string;
  homeTeamName: string;
  awayRuns: number;
  homeRuns: number;
  awayErrors: number;
  homeErrors: number;
  inning: number;
  isTop: boolean;
  outs: number;

  // Batter context
  currentBatterName?: string;
  batterStats?: { ab: number; h: number; hr: number; rbi: number; bb: number; k: number };
  batterAvg?: string;
  batterMojo?: string;
  batterMojoColor?: string;
  batterFitness?: string;
  batterHand?: 'L' | 'R' | 'S';

  // Pitcher context
  currentPitcherName?: string;
  pitcherPitchCount?: number;
  pitcherGameERA?: string;
  pitcherOuts?: number;
  pitcherHits?: number;
  pitcherK?: number;
  pitcherBB?: number;
  pitcherMojo?: string;
  pitcherMojoColor?: string;
  pitcherFitness?: string;
  pitcherHand?: 'L' | 'R';

  // Matchup (batter vs pitcher this game)
  matchupRecord?: string;   // "3-7" or null
  matchupAvg?: string;      // ".429" or null
  historicalMatchupRecord?: string;
  historicalMatchupAvg?: string;

  // Milestone proximity
  milestoneAlerts?: string[];
  showScoreboard?: boolean;
  onBatterTap?: () => void;

  /** Callback when pitcher name is tapped — triggers pitching change per §5.2 / ticket 4.6 */
  onPitcherTap?: () => void;
}

/** Format IP from outs recorded: 6 outs → "2.0", 7 outs → "2.1" */
function formatIP(outs: number): string {
  const full = Math.floor(outs / 3);
  const partial = outs % 3;
  return `${full}.${partial}`;
}

function inferMojoLevelFromLabel(label?: string): MojoLevel | undefined {
  switch (label?.trim().toLowerCase()) {
    case 'rattled':
      return -2;
    case 'tense':
    case 'cold':
      return -1;
    case 'normal':
    case 'neutral':
      return 0;
    case 'locked in':
    case 'hot':
      return 1;
    case 'on fire':
      return 2;
    case 'jacked':
      return 3;
    default:
      return undefined;
  }
}

function resolveMojoColor(label?: string, color?: string): string {
  if (color) {
    return color;
  }

  const inferredLevel = inferMojoLevelFromLabel(label);
  return getMojoColor(inferredLevel ?? 0);
}

/**
 * Fenway Board — Top-left zone of the 5-zone GameTracker layout (§3.7).
 * Contains: scoreboard, pitcher context, batter context, matchup history, milestone proximity.
 */
export function FenwayBoard({
  awayTeamName,
  homeTeamName,
  awayRuns,
  homeRuns,
  awayErrors,
  homeErrors,
  inning,
  isTop,
  outs,
  currentBatterName,
  batterStats,
  batterAvg,
  batterMojo,
  batterMojoColor,
  batterFitness,
  batterHand,
  currentPitcherName,
  pitcherPitchCount,
  pitcherGameERA,
  pitcherOuts,
  pitcherHits,
  pitcherK,
  pitcherBB,
  pitcherMojo,
  pitcherMojoColor,
  pitcherFitness,
  pitcherHand,
  matchupRecord,
  matchupAvg,
  historicalMatchupRecord,
  historicalMatchupAvg,
  milestoneAlerts,
  showScoreboard = true,
  onBatterTap,
  onPitcherTap,
}: FenwayBoardProps) {
  const awayLabel = abbreviateTeamName(awayTeamName);
  const homeLabel = abbreviateTeamName(homeTeamName);
  const resolvedPitcherMojoColor = resolveMojoColor(pitcherMojo, pitcherMojoColor);
  const resolvedBatterMojoColor = resolveMojoColor(batterMojo, batterMojoColor);

  return (
    <div className="bg-[#556B55] border-[3px] border-[#3d5240] h-full overflow-hidden flex flex-col">
      {showScoreboard && (
        <div className="bg-[rgb(133,181,229)] border-b-[3px] border-[#1a3020] px-3 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="text-[#1a3020] text-[11px] font-bold tracking-wide truncate">{awayLabel}</span>
              <div className="bg-[#3d5240] border-2 border-[#2a3a2d] px-2 py-0.5 min-w-[28px] text-center">
                <span className="text-[#E8E8D8] text-sm font-bold">{awayRuns}</span>
              </div>
              {awayErrors > 0 && (
                <span className="text-[#DC3545] text-[9px] font-bold flex-shrink-0">E:{awayErrors}</span>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-[#1a3020] text-sm font-bold">{isTop ? '▲' : '▼'}{inning}</span>
              <div className="flex gap-0.5 ml-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full border-[1.5px] ${
                      i < outs
                        ? 'bg-[#DC3545] border-[#8B0000]'
                        : 'bg-[#1a1a1a] border-[#2a3a2d]'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1">
              {homeErrors > 0 && (
                <span className="text-[#DC3545] text-[9px] font-bold flex-shrink-0">E:{homeErrors}</span>
              )}
              <div className="bg-[#3d5240] border-2 border-[#2a3a2d] px-2 py-0.5 min-w-[28px] text-center">
                <span className="text-[#E8E8D8] text-sm font-bold">{homeRuns}</span>
              </div>
              <span className="text-[#1a3020] text-[11px] font-bold tracking-wide truncate">{homeLabel}</span>
            </div>
          </div>
        </div>
      )}

      {/* Context cards */}
      <div className="flex-1 px-2 py-1.5 space-y-1 overflow-y-auto">

        {/* Pitcher context card */}
        <div className="bg-[#3d5240] border border-[#2a3a2d] px-2 py-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-[7px] text-[#88AA88] font-bold tracking-wider">PITCHING</span>
              {pitcherHand && (
                <span className="text-[7px] text-[#aaccaa]">({pitcherHand}HP)</span>
              )}
            </div>
            {pitcherMojo && pitcherMojo !== 'Neutral' && (
              <span
                className="text-[7px] font-bold px-1 rounded"
                style={{ color: resolvedPitcherMojoColor, backgroundColor: 'rgba(0,0,0,0.3)' }}
              >
                {pitcherMojo}
              </span>
            )}
          </div>
          <div
            className={`text-[12px] text-[#E8E8D8] font-bold leading-tight${onPitcherTap ? ' cursor-pointer hover:text-[#5dade2] hover:underline transition-colors' : ''}`}
            onClick={onPitcherTap}
            title={onPitcherTap ? 'Tap for pitching change' : undefined}
          >
            {currentPitcherName || '—'}
          </div>
          {pitcherPitchCount !== undefined && (
            <div className="flex gap-2 mt-0.5">
              <span className="text-[8px] text-[#aaccaa]">
                PC: <span className="text-[#E8E8D8] font-bold">{pitcherPitchCount}</span>
              </span>
              {pitcherOuts !== undefined && (
                <span className="text-[8px] text-[#aaccaa]">
                  IP: <span className="text-[#E8E8D8] font-bold">{formatIP(pitcherOuts)}</span>
                </span>
              )}
              {pitcherK !== undefined && (
                <span className="text-[8px] text-[#aaccaa]">
                  K: <span className="text-[#E8E8D8] font-bold">{pitcherK}</span>
                </span>
              )}
            </div>
          )}
          {(pitcherGameERA || pitcherHits !== undefined || pitcherBB !== undefined) && (
            <div className="flex gap-2">
              {pitcherGameERA && (
                <span className="text-[8px] text-[#aaccaa]">
                  ERA: <span className="text-[#E8E8D8] font-bold">{pitcherGameERA}</span>
                </span>
              )}
              {pitcherHits !== undefined && (
                <span className="text-[8px] text-[#aaccaa]">
                  H: <span className="text-[#E8E8D8] font-bold">{pitcherHits}</span>
                </span>
              )}
              {pitcherBB !== undefined && (
                <span className="text-[8px] text-[#aaccaa]">
                  BB: <span className="text-[#E8E8D8] font-bold">{pitcherBB}</span>
                </span>
              )}
            </div>
          )}
          {pitcherFitness && pitcherFitness !== 'Fit' && (
            <div className="text-[7px] text-[#f59e0b] mt-0.5">{pitcherFitness}</div>
          )}
        </div>

        {/* Batter context card */}
        <div className="bg-[#3d5240] border border-[#2a3a2d] px-2 py-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-[7px] text-[#88AA88] font-bold tracking-wider">AT BAT</span>
              {batterHand && (
                <span className="text-[7px] text-[#aaccaa]">({batterHand})</span>
              )}
            </div>
            {batterMojo && batterMojo !== 'Neutral' && (
              <span
                className="text-[7px] font-bold px-1 rounded"
                style={{ color: resolvedBatterMojoColor, backgroundColor: 'rgba(0,0,0,0.3)' }}
              >
                {batterMojo}
              </span>
            )}
          </div>
          <div
            className={`text-[12px] text-[#E8E8D8] font-bold leading-tight${onBatterTap ? ' cursor-pointer hover:text-[#5dade2] hover:underline transition-colors' : ''}`}
            onClick={onBatterTap}
            title={onBatterTap ? 'Tap for player card' : undefined}
          >
            {currentBatterName || '—'}
          </div>
          {batterStats && (
            <>
              <div className="flex gap-2 mt-0.5">
                <span className="text-[8px] text-[#aaccaa]">
                  <span className="text-[#E8E8D8] font-bold">{batterStats.h}</span>-<span className="text-[#E8E8D8] font-bold">{batterStats.ab}</span>
                </span>
                {batterAvg && (
                  <span className="text-[8px] text-[#aaccaa]">
                    AVG: <span className="text-[#E8E8D8] font-bold">{batterAvg}</span>
                  </span>
                )}
                {batterStats.hr > 0 && (
                  <span className="text-[8px] text-[#aaccaa]">
                    HR: <span className="text-[#E8E8D8] font-bold">{batterStats.hr}</span>
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {batterStats.rbi > 0 && (
                  <span className="text-[8px] text-[#aaccaa]">
                    RBI: <span className="text-[#E8E8D8] font-bold">{batterStats.rbi}</span>
                  </span>
                )}
                {batterStats.bb > 0 && (
                  <span className="text-[8px] text-[#aaccaa]">
                    BB: <span className="text-[#E8E8D8] font-bold">{batterStats.bb}</span>
                  </span>
                )}
                {batterStats.k > 0 && (
                  <span className="text-[8px] text-[#aaccaa]">
                    K: <span className="text-[#E8E8D8] font-bold">{batterStats.k}</span>
                  </span>
                )}
              </div>
            </>
          )}
          {batterFitness && batterFitness !== 'Fit' && (
            <div className="text-[7px] text-[#f59e0b] mt-0.5">{batterFitness}</div>
          )}
        </div>

        {/* Matchup card — batter vs pitcher this game + milestone */}
        {(matchupRecord || historicalMatchupRecord || currentBatterName || (milestoneAlerts?.length ?? 0) > 0) && currentPitcherName && (
          <div className="bg-[#2a3a2d] border border-[#1a2a1d] px-2 py-1">
            <div className="text-[8px] text-[#88AA88] leading-tight">
              {matchupRecord ? (
                <>
                  <span className="text-[#aaccaa]">This game vs {currentPitcherName}: </span>
                  <span className="text-[#E8E8D8] font-bold">{matchupRecord}</span>
                  {matchupAvg && (
                    <span className="text-[#aaccaa]"> ({matchupAvg})</span>
                  )}
                </>
              ) : (
                <span className="text-[#aaccaa]">This game vs {currentPitcherName}: <span className="italic">First meeting</span></span>
              )}
            </div>
            {historicalMatchupRecord && (
              <div className="text-[8px] text-[#88AA88] leading-tight mt-0.5">
                <span className="text-[#aaccaa]">History vs {currentPitcherName}: </span>
                <span className="text-[#E8E8D8] font-bold">{historicalMatchupRecord}</span>
                {historicalMatchupAvg && (
                  <span className="text-[#aaccaa]"> ({historicalMatchupAvg})</span>
                )}
              </div>
            )}
            {(milestoneAlerts?.length ?? 0) > 0 && (
              <div className="mt-1 space-y-0.5">
                {milestoneAlerts?.map((alert) => (
                  <div key={alert} className="text-[8px] text-[#fbbf24] font-bold">
                    ⚡ {alert}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default FenwayBoard;
