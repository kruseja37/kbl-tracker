import {
  getHomeWinExpectancyV2,
  normalizeScheduledInnings,
  WPA_MODEL_VERSION,
  type WpaBases,
  type WpaGameState,
  type WpaModelVersion,
} from "./winExpectancyModelV2";

export type { WpaBases, WpaGameState, WpaModelVersion };
export { WPA_MODEL_VERSION };

export interface WpaPlayAfterState {
  outs: number;
  bases: WpaBases;
  homeScore: number;
  awayScore: number;
}

export interface WpaResultV2 {
  modelVersion: WpaModelVersion;
  homeWinProbabilityBefore: number;
  homeWinProbabilityAfter: number;
  homeDelta: number;
  battingTeamDelta: number;
  fieldingTeamDelta: number;
  battingTeamId?: string;
  fieldingTeamId?: string;
  validationWarnings: string[];
}

export interface WpaCalculationOptions {
  battingTeamId?: string;
  fieldingTeamId?: string;
}

export function calculateWpaV2(
  before: WpaGameState,
  after: WpaPlayAfterState,
  options: WpaCalculationOptions = {},
): WpaResultV2 {
  const validationWarnings: string[] = [];
  const scheduledInnings = normalizeScheduledInnings(
    before.scheduledInnings,
    validationWarnings,
  );
  const canonicalBefore = normalizeBeforeState(before, scheduledInnings);
  const beforeResult = getHomeWinExpectancyV2(canonicalBefore);
  const afterResult = resolveAfterHomeWinProbability(
    canonicalBefore,
    after,
    scheduledInnings,
  );
  const homeWinProbabilityBefore = beforeResult.homeWinProbability;
  const homeWinProbabilityAfter = afterResult.homeWinProbability;
  const homeDelta = homeWinProbabilityAfter - homeWinProbabilityBefore;
  const isHomeBatting = canonicalBefore.halfInning === "BOTTOM";
  const battingTeamDelta = isHomeBatting ? homeDelta : -homeDelta;

  return {
    modelVersion: WPA_MODEL_VERSION,
    homeWinProbabilityBefore,
    homeWinProbabilityAfter,
    homeDelta,
    battingTeamDelta,
    fieldingTeamDelta: -battingTeamDelta,
    battingTeamId: options.battingTeamId,
    fieldingTeamId: options.fieldingTeamId,
    validationWarnings: [
      ...validationWarnings,
      ...beforeResult.validationWarnings,
      ...afterResult.validationWarnings,
    ],
  };
}

function resolveAfterHomeWinProbability(
  before: WpaGameState,
  after: WpaPlayAfterState,
  scheduledInnings: number,
): { homeWinProbability: number; validationWarnings: string[] } {
  const isHomeBatting = before.halfInning === "BOTTOM";
  const isFinalOrExtras = before.inning >= scheduledInnings;

  if (isHomeBatting && isFinalOrExtras && after.homeScore > after.awayScore) {
    return { homeWinProbability: 1, validationWarnings: [] };
  }

  if (after.outs >= 3) {
    if (before.halfInning === "TOP") {
      if (isFinalOrExtras && after.homeScore > after.awayScore) {
        return { homeWinProbability: 1, validationWarnings: [] };
      }

      const nextState = normalizeBeforeState(
        {
          ...before,
          halfInning: "BOTTOM",
          outs: 0,
          bases: emptyBases(),
          homeScore: after.homeScore,
          awayScore: after.awayScore,
        },
        scheduledInnings,
      );
      return getHomeWinExpectancyV2(nextState);
    }

    if (isFinalOrExtras && after.awayScore > after.homeScore) {
      return { homeWinProbability: 0, validationWarnings: [] };
    }

    if (isFinalOrExtras && after.homeScore > after.awayScore) {
      return { homeWinProbability: 1, validationWarnings: [] };
    }

    const nextState = normalizeBeforeState(
      {
        ...before,
        inning: before.inning + 1,
        halfInning: "TOP",
        outs: 0,
        bases: emptyBases(),
        homeScore: after.homeScore,
        awayScore: after.awayScore,
      },
      scheduledInnings,
    );
    return getHomeWinExpectancyV2(nextState);
  }

  const afterState = normalizeBeforeState(
    {
      ...before,
      outs: Math.max(0, Math.min(2, Math.floor(after.outs))) as 0 | 1 | 2,
      bases: after.bases,
      homeScore: after.homeScore,
      awayScore: after.awayScore,
    },
    scheduledInnings,
  );
  return getHomeWinExpectancyV2(afterState);
}

function normalizeBeforeState(
  state: WpaGameState,
  scheduledInnings: number,
): WpaGameState {
  return {
    ...state,
    inning: Math.max(1, Math.floor(state.inning)),
    outs: Math.max(0, Math.min(2, Math.floor(state.outs))) as 0 | 1 | 2,
    bases: {
      first: Boolean(state.bases.first),
      second: Boolean(state.bases.second),
      third: Boolean(state.bases.third),
    },
    homeScore: Math.max(0, state.homeScore),
    awayScore: Math.max(0, state.awayScore),
    scheduledInnings,
  };
}

function emptyBases(): WpaBases {
  return { first: false, second: false, third: false };
}
