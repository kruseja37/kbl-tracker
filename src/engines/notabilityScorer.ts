import { estimateWinProbability, type GameStateForLI } from "./leverageCalculator";
import { resolveMood, type MoodState } from "./moodEngine";

export interface BaseOccupancy {
  first: boolean;
  second: boolean;
  third: boolean;
}

export interface NotabilityPlayContext {
  inning: number;
  halfInning: "TOP" | "BOTTOM";
  outsBefore: 0 | 1 | 2;
  outsAfter: number;
  basesBefore: BaseOccupancy;
  basesAfter: BaseOccupancy;
  homeScoreBefore: number;
  awayScoreBefore: number;
  homeScoreAfter: number;
  awayScoreAfter: number;
  totalInnings?: number;
  wpaOverride?: number;
  result: string;
  runsScored?: number;
  isError?: boolean;
  isFirstAB?: boolean;
  batterHitStreak?: number;
  pitcherStrikeoutStreak?: number;
  isNoHitterActive?: boolean;
  isPerfectGameActive?: boolean;
  isImmaculateInning?: boolean;
  pitchingMilestone?: string;
}

export interface NotabilityResult {
  score: number;
  shouldComment: boolean;
  reason: string;
}

const BASE_NOTABILITY_THRESHOLD = 0.05;

const MOOD_THRESHOLD_MULTIPLIER = {
  euphoric: 0.8,
  optimistic: 0.9,
  neutral: 1,
  frustrated: 1.2,
  bitter: 1.35,
} as const;

function clampScore(score: number): number {
  return Math.max(0, Math.min(1, score));
}

function buildBeforeState(play: NotabilityPlayContext): GameStateForLI {
  return {
    inning: play.inning,
    halfInning: play.halfInning,
    outs: play.outsBefore,
    runners: play.basesBefore,
    homeScore: play.homeScoreBefore,
    awayScore: play.awayScoreBefore,
    totalInnings: play.totalInnings,
  };
}

function buildAfterState(play: NotabilityPlayContext): GameStateForLI {
  return {
    inning: play.inning,
    halfInning: play.halfInning,
    outs: Math.min(play.outsAfter, 2) as 0 | 1 | 2,
    runners: play.basesAfter,
    homeScore: play.homeScoreAfter,
    awayScore: play.awayScoreAfter,
    totalInnings: play.totalInnings,
  };
}

function getTotalInnings(play: NotabilityPlayContext): number {
  return play.totalInnings ?? 9;
}

function getMoodAdjustedThreshold(mood: MoodState): number {
  const label = resolveMood(mood);
  return BASE_NOTABILITY_THRESHOLD * MOOD_THRESHOLD_MULTIPLIER[label];
}

function didBattingTeamWin(play: NotabilityPlayContext): boolean {
  return play.halfInning === "BOTTOM"
    ? play.homeScoreAfter > play.awayScoreAfter
    : play.awayScoreAfter > play.homeScoreAfter;
}

function didBattingTeamLose(play: NotabilityPlayContext): boolean {
  return play.halfInning === "BOTTOM"
    ? play.homeScoreAfter < play.awayScoreAfter
    : play.awayScoreAfter < play.homeScoreAfter;
}

function estimateBattingTeamWinProbabilityAfter(play: NotabilityPlayContext): number {
  const totalInnings = getTotalInnings(play);
  const isBottom = play.halfInning === "BOTTOM";

  if (isWalkOffPlay(play)) {
    return 1;
  }

  if (play.outsAfter < 3) {
    return estimateWinProbability(buildAfterState(play), totalInnings);
  }

  if (isBottom && play.inning >= totalInnings && didBattingTeamLose(play)) {
    return 0;
  }

  if (!isBottom && play.inning >= totalInnings && play.homeScoreAfter > play.awayScoreAfter) {
    return 0;
  }

  const nextState: GameStateForLI = isBottom
    ? {
        inning: play.inning + 1,
        halfInning: "TOP",
        outs: 0,
        runners: { first: false, second: false, third: false },
        homeScore: play.homeScoreAfter,
        awayScore: play.awayScoreAfter,
        totalInnings,
      }
    : {
        inning: play.inning,
        halfInning: "BOTTOM",
        outs: 0,
        runners: { first: false, second: false, third: false },
        homeScore: play.homeScoreAfter,
        awayScore: play.awayScoreAfter,
        totalInnings,
      };

  return 1 - estimateWinProbability(nextState, totalInnings);
}

function calculateWpaFromPlay(play: NotabilityPlayContext): number {
  if (Number.isFinite(play.wpaOverride)) {
    return Math.abs(play.wpaOverride ?? 0);
  }

  const totalInnings = getTotalInnings(play);
  const before = estimateWinProbability(buildBeforeState(play), totalInnings);
  const after = estimateBattingTeamWinProbabilityAfter(play);

  return Math.abs(after - before);
}

function isHomeRunPlay(play: NotabilityPlayContext): boolean {
  return play.result.toUpperCase().includes("HOME_RUN") || play.result.toUpperCase() === "HR";
}

function isErrorPlay(play: NotabilityPlayContext): boolean {
  return play.isError === true || play.result.toUpperCase().includes("ERROR");
}

function isHitStreakPlay(play: NotabilityPlayContext): boolean {
  return (play.batterHitStreak ?? 0) >= 3;
}

function isStrikeoutStreakPlay(play: NotabilityPlayContext): boolean {
  return (play.pitcherStrikeoutStreak ?? 0) >= 3;
}

function isFirstAtBatPlay(play: NotabilityPlayContext): boolean {
  return play.isFirstAB === true;
}

function isWalkOffPlay(play: NotabilityPlayContext): boolean {
  return (
    play.halfInning === "BOTTOM" &&
    play.inning >= getTotalInnings(play) &&
    play.homeScoreBefore <= play.awayScoreBefore &&
    play.homeScoreAfter > play.awayScoreAfter
  );
}

function isPitchingMilestonePlay(play: NotabilityPlayContext): boolean {
  return Boolean(
    play.isNoHitterActive ||
      play.isPerfectGameActive ||
      play.isImmaculateInning ||
      play.pitchingMilestone,
  );
}

function resolveBypassReason(play: NotabilityPlayContext): string | null {
  if (isWalkOffPlay(play)) return "WALK_OFF";
  if (isHomeRunPlay(play)) return "HR";
  if (isErrorPlay(play)) return "ERROR";
  if (isFirstAtBatPlay(play)) return "FIRST_AB";
  if (isPitchingMilestonePlay(play)) return "PITCHING_MILESTONE";
  if (isHitStreakPlay(play)) return "HIT_STREAK";
  if (isStrikeoutStreakPlay(play)) return "STRIKEOUT_STREAK";
  return null;
}

function classifyWpaReason(absWpa: number): string {
  if (absWpa >= 0.3) return "BIG_WPA";
  if (absWpa >= 0.15) return "HIGH_WPA";
  if (absWpa >= BASE_NOTABILITY_THRESHOLD) return "WPA";
  return "LOW_WPA";
}

export function scoreNotability(play: NotabilityPlayContext, mood: MoodState): NotabilityResult {
  const threshold = getMoodAdjustedThreshold(mood);
  const rawScore = clampScore(calculateWpaFromPlay(play));
  const bypassReason = resolveBypassReason(play);

  if (bypassReason) {
    return {
      score: Math.max(rawScore, threshold),
      shouldComment: true,
      reason: bypassReason,
    };
  }

  return {
    score: rawScore,
    shouldComment: rawScore >= threshold,
    reason: classifyWpaReason(rawScore),
  };
}
