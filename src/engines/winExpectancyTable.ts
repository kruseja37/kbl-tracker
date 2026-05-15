/**
 * WPA v2 win expectancy compatibility facade.
 *
 * The old module name is retained because existing callers import
 * getWinExpectancy/lookupWinExpectancy directly. Values now come from the
 * versioned WPA v2 model instead of a generated -5..+5 synthetic table.
 */

import {
  BaseState,
  encodeBaseState,
  type RunnersOnBase,
} from "./leverageCalculator";
import {
  baseStateToBases,
  getBaseOutRunExpectancy,
  getHomeWinExpectancyV2,
  WPA_MODEL_VERSION,
} from "./winExpectancyModelV2";

export interface WEGameState {
  inning: number;
  isTop: boolean;
  outs: 0 | 1 | 2;
  baseState: BaseState;
  homeScore: number;
  awayScore: number;
  totalInnings?: number;
  runEnvironment?: number;
}

export function buildWEGameState(
  inning: number,
  isTop: boolean,
  outs: number,
  bases: { first: boolean; second: boolean; third: boolean },
  homeScore: number,
  awayScore: number,
  totalInnings?: number,
): WEGameState {
  return {
    inning,
    isTop,
    outs: Math.min(Math.max(outs, 0), 2) as 0 | 1 | 2,
    baseState: encodeBaseState(bases),
    homeScore,
    awayScore,
    totalInnings,
  };
}

export const MIN_DIFF = -15;
export const MAX_DIFF = 15;
export const DIFF_RANGE = MAX_DIFF - MIN_DIFF + 1;

export function getWinExpectancy(state: WEGameState): number {
  return getHomeWinExpectancyV2({
    inning: state.inning,
    halfInning: state.isTop ? "TOP" : "BOTTOM",
    outs: state.outs,
    bases: baseStateToBases(state.baseState),
    homeScore: state.homeScore,
    awayScore: state.awayScore,
    scheduledInnings: state.totalInnings ?? 9,
    runEnvironment: state.runEnvironment,
  }).homeWinProbability;
}

export function lookupWinExpectancy(
  inning: number,
  isTop: boolean,
  outs: number,
  runners: RunnersOnBase,
  homeScore: number,
  awayScore: number,
  totalInnings?: number,
): number {
  return getWinExpectancy({
    inning,
    isTop,
    outs: Math.min(Math.max(outs, 0), 2) as 0 | 1 | 2,
    baseState: encodeBaseState(runners),
    homeScore,
    awayScore,
    totalInnings,
  });
}

export function getHalfInningStartWE(
  inning: number,
  isTop: boolean,
  homeScore: number,
  awayScore: number,
  totalInnings: number = 9,
): number {
  return getWinExpectancy({
    inning,
    isTop,
    outs: 0,
    baseState: BaseState.EMPTY,
    homeScore,
    awayScore,
    totalInnings,
  });
}

export const INNING_PARAMS = {
  modelVersion: WPA_MODEL_VERSION,
  scoreDifferentialRange: [MIN_DIFF, MAX_DIFF] as const,
  source: "continuous-v2",
} as const;

export const RUNNER_BOOST: Record<number, number> = {
  0: getBaseOutRunExpectancy({ first: false, second: false, third: false }, 0),
  1: getBaseOutRunExpectancy({ first: true, second: false, third: false }, 0),
  2: getBaseOutRunExpectancy({ first: false, second: true, third: false }, 0),
  3: getBaseOutRunExpectancy({ first: true, second: true, third: false }, 0),
  4: getBaseOutRunExpectancy({ first: false, second: false, third: true }, 0),
  5: getBaseOutRunExpectancy({ first: true, second: false, third: true }, 0),
  6: getBaseOutRunExpectancy({ first: false, second: true, third: true }, 0),
  7: getBaseOutRunExpectancy({ first: true, second: true, third: true }, 0),
};

export const OUT_PENALTY: Record<number, number> = {
  0: 0,
  1: getBaseOutRunExpectancy({ first: false, second: false, third: false }, 1),
  2: getBaseOutRunExpectancy({ first: false, second: false, third: false }, 2),
};

export const OUT_RUNNER_SCALE: Record<number, number> = {
  0: 1,
  1: 0.75,
  2: 0.4,
};
