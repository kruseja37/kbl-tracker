import { type BaseState, decodeBaseState, encodeBaseState } from "./leverageCalculator";

export const WPA_MODEL_VERSION = "kbl-wpa-v2" as const;
export type WpaModelVersion = typeof WPA_MODEL_VERSION;

export interface WpaBases {
  first: boolean;
  second: boolean;
  third: boolean;
}

export interface WpaGameState {
  inning: number;
  halfInning: "TOP" | "BOTTOM";
  outs: 0 | 1 | 2;
  bases: WpaBases;
  homeScore: number;
  awayScore: number;
  scheduledInnings: number;
  runEnvironment?: number;
}

export interface WinExpectancyResultV2 {
  modelVersion: WpaModelVersion;
  homeWinProbability: number;
  validationWarnings: string[];
}

export interface WinExpectancyFeaturesV2 {
  averageRunsPerHalfInning: number;
  battingRunExpectancy: number;
  homeFutureRuns: number;
  awayFutureRuns: number;
  expectedHomeRunDifferential: number;
  probabilityScale: number;
  remainingRegulationOuts: number;
}

const DEFAULT_RUN_ENVIRONMENT = 4.8;
const MIN_RUN_ENVIRONMENT = 2.5;
const MAX_RUN_ENVIRONMENT = 8.5;
const HOME_FIELD_ADVANTAGE_RUNS = 0.5;
const NON_TERMINAL_MIN_PROBABILITY = 0.01;
const NON_TERMINAL_MAX_PROBABILITY = 0.99;

const BASE_OUT_RUN_EXPECTANCY: Record<BaseState, readonly [number, number, number]> = {
  0: [0.461, 0.243, 0.095],
  1: [0.831, 0.489, 0.214],
  2: [1.068, 0.644, 0.305],
  3: [1.373, 0.908, 0.343],
  4: [1.426, 0.865, 0.413],
  5: [1.798, 1.14, 0.471],
  6: [1.92, 1.352, 0.57],
  7: [2.282, 1.52, 0.736],
};

export function normalizeScheduledInnings(
  scheduledInnings: number | undefined,
  validationWarnings: string[] = [],
): number {
  if (
    typeof scheduledInnings === "number" &&
    Number.isInteger(scheduledInnings) &&
    scheduledInnings >= 1 &&
    scheduledInnings <= 9
  ) {
    return scheduledInnings;
  }

  if (scheduledInnings !== undefined) {
    validationWarnings.push(
      `Invalid scheduledInnings ${scheduledInnings}; defaulted to 9 for WPA v2.`,
    );
  }
  return 9;
}

export function normalizeRunEnvironment(
  runEnvironment: number | undefined,
  validationWarnings: string[] = [],
): number {
  if (runEnvironment === undefined) return DEFAULT_RUN_ENVIRONMENT;
  if (!Number.isFinite(runEnvironment) || runEnvironment <= 0) {
    validationWarnings.push(
      `Invalid runEnvironment ${runEnvironment}; defaulted to ${DEFAULT_RUN_ENVIRONMENT}.`,
    );
    return DEFAULT_RUN_ENVIRONMENT;
  }

  return clamp(runEnvironment, MIN_RUN_ENVIRONMENT, MAX_RUN_ENVIRONMENT);
}

export function getBaseOutRunExpectancy(
  bases: WpaBases,
  outs: 0 | 1 | 2,
  runEnvironment?: number,
): number {
  const baseState = encodeBaseState(bases);
  const environmentScale =
    normalizeRunEnvironment(runEnvironment) / DEFAULT_RUN_ENVIRONMENT;
  return BASE_OUT_RUN_EXPECTANCY[baseState][outs] * environmentScale;
}

export function getHomeWinExpectancyV2(
  state: WpaGameState,
): WinExpectancyResultV2 {
  const validationWarnings: string[] = [];
  const scheduledInnings = normalizeScheduledInnings(
    state.scheduledInnings,
    validationWarnings,
  );
  const inning = Math.max(1, Math.floor(state.inning));
  const outs = clamp(Math.floor(state.outs), 0, 2) as 0 | 1 | 2;
  const normalizedState: WpaGameState = {
    ...state,
    inning,
    outs,
    scheduledInnings,
  };

  const terminal = getTerminalHomeWinProbability(normalizedState);
  if (terminal !== null) {
    return {
      modelVersion: WPA_MODEL_VERSION,
      homeWinProbability: terminal,
      validationWarnings,
    };
  }

  const features = getWinExpectancyFeaturesV2(normalizedState, validationWarnings);
  const probability = logistic(
    features.expectedHomeRunDifferential / features.probabilityScale,
  );

  return {
    modelVersion: WPA_MODEL_VERSION,
    homeWinProbability: clamp(
      probability,
      NON_TERMINAL_MIN_PROBABILITY,
      NON_TERMINAL_MAX_PROBABILITY,
    ),
    validationWarnings,
  };
}

export function getWinExpectancyFeaturesV2(
  state: WpaGameState,
  validationWarnings: string[] = [],
): WinExpectancyFeaturesV2 {
  const runEnvironment = normalizeRunEnvironment(
    state.runEnvironment,
    validationWarnings,
  );
  const averageRunsPerHalfInning = runEnvironment / 9;
  const battingRunExpectancy = getBaseOutRunExpectancy(
    state.bases,
    state.outs,
    runEnvironment,
  );
  const inningsRemainingAfterCurrent = Math.max(
    0,
    state.scheduledInnings - state.inning,
  );
  const isRegulation = state.inning <= state.scheduledInnings;
  let homeFutureRuns = 0;
  let awayFutureRuns = 0;

  if (isRegulation && state.halfInning === "TOP") {
    awayFutureRuns =
      battingRunExpectancy + inningsRemainingAfterCurrent * averageRunsPerHalfInning;
    homeFutureRuns =
      (inningsRemainingAfterCurrent + 1) * averageRunsPerHalfInning;
  } else if (isRegulation) {
    homeFutureRuns =
      battingRunExpectancy + inningsRemainingAfterCurrent * averageRunsPerHalfInning;
    awayFutureRuns =
      inningsRemainingAfterCurrent * averageRunsPerHalfInning;
  } else if (state.halfInning === "TOP") {
    awayFutureRuns = battingRunExpectancy;
    homeFutureRuns = averageRunsPerHalfInning;
  } else {
    homeFutureRuns = battingRunExpectancy;
    awayFutureRuns = 0;
  }

  const expectedRunsRemaining = Math.max(
    0.15,
    homeFutureRuns + awayFutureRuns,
  );
  const scoreDifferential = state.homeScore - state.awayScore;
  const expectedHomeRunDifferential =
    scoreDifferential +
    homeFutureRuns -
    awayFutureRuns +
    HOME_FIELD_ADVANTAGE_RUNS;
  const probabilityScale =
    0.65 + Math.sqrt(expectedRunsRemaining * 1.1 + 0.15);

  return {
    averageRunsPerHalfInning,
    battingRunExpectancy,
    homeFutureRuns,
    awayFutureRuns,
    expectedHomeRunDifferential,
    probabilityScale,
    remainingRegulationOuts: getRemainingRegulationOuts(state),
  };
}

export function baseStateToBases(baseState: BaseState): WpaBases {
  return decodeBaseState(baseState);
}

export function basesToBaseState(bases: WpaBases): BaseState {
  return encodeBaseState(bases);
}

export function getRemainingRegulationOuts(state: WpaGameState): number {
  if (state.inning > state.scheduledInnings) return 0;
  const completedOuts =
    (state.inning - 1) * 6 +
    (state.halfInning === "BOTTOM" ? 3 : 0) +
    state.outs;
  return Math.max(0, state.scheduledInnings * 6 - completedOuts);
}

function getTerminalHomeWinProbability(state: WpaGameState): number | null {
  if (
    state.halfInning === "BOTTOM" &&
    state.inning >= state.scheduledInnings &&
    state.homeScore > state.awayScore
  ) {
    return 1;
  }

  return null;
}

function logistic(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
