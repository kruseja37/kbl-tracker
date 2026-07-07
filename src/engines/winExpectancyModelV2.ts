import { type BaseState, decodeBaseState, encodeBaseState } from "./leverageCalculator";
import {
  lookupMlbSavantHomeWinExpectancy,
  MLB_SAVANT_WPA_MODEL_VERSION,
  type MlbSavantWinExpectancyTrace,
  type SavantFallbackReason,
} from "./mlbSavantWinExpectancy";

export const WPA_MODEL_VERSION = MLB_SAVANT_WPA_MODEL_VERSION;
export const WPA_FALLBACK_MODEL_VERSION = "kbl-wpa-v3" as const;
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
  useGhostRunner?: boolean;
  extraInningRunner?: boolean;
  extraInningRunnerDelay?: 1 | 2;
}

export interface WinExpectancyResultV2 {
  modelVersion: WpaModelVersion;
  homeWinProbability: number;
  validationWarnings: string[];
  trace: WinExpectancyTraceV2;
}

export interface WpaFallbackTrace extends MlbSavantWinExpectancyTrace {
  fallback: SavantFallbackReason;
  fallbackModelVersion: typeof WPA_FALLBACK_MODEL_VERSION;
  homeWinProbability: number;
}

export interface WpaTerminalTrace {
  modelVersion: WpaModelVersion;
  source: "KBL terminal state";
  homeWinProbability: number;
  terminal: true;
}

export type WinExpectancyTraceV2 =
  | MlbSavantWinExpectancyTrace
  | WpaFallbackTrace
  | WpaTerminalTrace;

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
const EXTRA_INNING_HOME_WIN_PROBABILITY = 0.54;
const RUN_DISTRIBUTION_MAX_RUNS = 30;
const RUN_DISTRIBUTION_MIN_SIZE = 0.55;
const RUN_DISTRIBUTION_SIZE_PER_EXPECTED_RUN = 1.55;
const NON_TERMINAL_MIN_PROBABILITY = 0.001;
const NON_TERMINAL_MAX_PROBABILITY = 0.999;

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
      `Invalid scheduledInnings ${scheduledInnings}; defaulted to 9 for ${WPA_MODEL_VERSION}.`,
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
      trace: {
        modelVersion: WPA_MODEL_VERSION,
        source: "KBL terminal state",
        homeWinProbability: terminal,
        terminal: true,
      },
    };
  }

  const savantLookup = lookupMlbSavantHomeWinExpectancy(normalizedState);
  if (savantLookup.supported) {
    return {
      modelVersion: WPA_MODEL_VERSION,
      homeWinProbability: clamp(
        savantLookup.homeWinProbability,
        NON_TERMINAL_MIN_PROBABILITY,
        NON_TERMINAL_MAX_PROBABILITY,
      ),
      validationWarnings,
      trace: savantLookup.trace,
    };
  }

  const features = getWinExpectancyFeaturesV2(normalizedState, validationWarnings);
  const probability = calculateHistoricalHomeWinProbability(
    normalizedState,
    features,
  );
  const homeWinProbability = clamp(
    probability,
    NON_TERMINAL_MIN_PROBABILITY,
    NON_TERMINAL_MAX_PROBABILITY,
  );

  return {
    modelVersion: WPA_MODEL_VERSION,
    homeWinProbability,
    validationWarnings,
    trace: {
      ...savantLookup.trace,
      fallback: savantLookup.fallback,
      fallbackModelVersion: WPA_FALLBACK_MODEL_VERSION,
      homeWinProbability,
    },
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

function calculateHistoricalHomeWinProbability(
  state: WpaGameState,
  features: WinExpectancyFeaturesV2,
): number {
  const isFinalOrExtras = state.inning >= state.scheduledInnings;

  if (isFinalOrExtras && state.halfInning === "TOP") {
    return calculateTopFinalHomeWinProbability(
      state.homeScore,
      state.awayScore,
      features.battingRunExpectancy,
      features.averageRunsPerHalfInning,
    );
  }

  if (isFinalOrExtras) {
    return calculateBottomFinalHomeWinProbability(
      state.homeScore,
      state.awayScore,
      features.battingRunExpectancy,
    );
  }

  return calculateHomeWinProbabilityFromRunDistributions(
    state.homeScore,
    state.awayScore,
    features.homeFutureRuns,
    features.awayFutureRuns,
  );
}

function calculateHomeWinProbabilityFromRunDistributions(
  homeScore: number,
  awayScore: number,
  homeExpectedRuns: number,
  awayExpectedRuns: number,
): number {
  const homeDistribution = getRunDistribution(homeExpectedRuns);
  const awayDistribution = getRunDistribution(awayExpectedRuns);
  let homeWinProbability = 0;

  for (let homeRuns = 0; homeRuns < homeDistribution.length; homeRuns += 1) {
    for (let awayRuns = 0; awayRuns < awayDistribution.length; awayRuns += 1) {
      const probability = homeDistribution[homeRuns] * awayDistribution[awayRuns];
      const projectedHomeScore = homeScore + homeRuns;
      const projectedAwayScore = awayScore + awayRuns;

      if (projectedHomeScore > projectedAwayScore) {
        homeWinProbability += probability;
      } else if (projectedHomeScore === projectedAwayScore) {
        homeWinProbability += probability * EXTRA_INNING_HOME_WIN_PROBABILITY;
      }
    }
  }

  return homeWinProbability;
}

function calculateTopFinalHomeWinProbability(
  homeScore: number,
  awayScore: number,
  awayExpectedRuns: number,
  homeBottomExpectedRuns: number,
): number {
  const awayDistribution = getRunDistribution(awayExpectedRuns);
  const homeDistribution = getRunDistribution(homeBottomExpectedRuns);
  let homeWinProbability = 0;

  for (let awayRuns = 0; awayRuns < awayDistribution.length; awayRuns += 1) {
    const awayProbability = awayDistribution[awayRuns];
    const projectedAwayScore = awayScore + awayRuns;

    if (homeScore > projectedAwayScore) {
      homeWinProbability += awayProbability;
      continue;
    }

    for (let homeRuns = 0; homeRuns < homeDistribution.length; homeRuns += 1) {
      const probability = awayProbability * homeDistribution[homeRuns];
      const projectedHomeScore = homeScore + homeRuns;

      if (projectedHomeScore > projectedAwayScore) {
        homeWinProbability += probability;
      } else if (projectedHomeScore === projectedAwayScore) {
        homeWinProbability += probability * EXTRA_INNING_HOME_WIN_PROBABILITY;
      }
    }
  }

  return homeWinProbability;
}

function calculateBottomFinalHomeWinProbability(
  homeScore: number,
  awayScore: number,
  homeExpectedRuns: number,
): number {
  if (homeScore > awayScore) return 1;

  const homeDistribution = getRunDistribution(homeExpectedRuns);
  let homeWinProbability = 0;

  for (let homeRuns = 0; homeRuns < homeDistribution.length; homeRuns += 1) {
    const projectedHomeScore = homeScore + homeRuns;

    if (projectedHomeScore > awayScore) {
      homeWinProbability += homeDistribution[homeRuns];
    } else if (projectedHomeScore === awayScore) {
      homeWinProbability +=
        homeDistribution[homeRuns] * EXTRA_INNING_HOME_WIN_PROBABILITY;
    }
  }

  return homeWinProbability;
}

function getRunDistribution(expectedRuns: number): number[] {
  const mean = Math.max(0, expectedRuns);
  const distribution = Array.from(
    { length: RUN_DISTRIBUTION_MAX_RUNS + 1 },
    () => 0,
  );

  if (mean <= 0) {
    distribution[0] = 1;
    return distribution;
  }

  // A negative-binomial run model keeps MLB-like crooked-inning tails that a
  // plain Poisson distribution would wash out, especially in the final inning.
  const size = Math.max(
    RUN_DISTRIBUTION_MIN_SIZE,
    mean * RUN_DISTRIBUTION_SIZE_PER_EXPECTED_RUN,
  );
  const successProbability = size / (size + mean);
  let probability = Math.pow(successProbability, size);
  let distributedProbability = 0;

  for (let runs = 0; runs < RUN_DISTRIBUTION_MAX_RUNS; runs += 1) {
    distribution[runs] = probability;
    distributedProbability += probability;
    probability *=
      ((runs + size) / (runs + 1)) * (1 - successProbability);
  }

  distribution[RUN_DISTRIBUTION_MAX_RUNS] = Math.max(
    0,
    1 - distributedProbability,
  );
  return distribution;
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
