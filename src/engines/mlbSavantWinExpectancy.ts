import savantArtifact from "./data/mlbSavantWpa2016_2025.json";
import { encodeBaseState, type BaseState } from "./leverageCalculator";

export const MLB_SAVANT_WPA_MODEL_VERSION =
  "mlb-savant-wpa-2016-2025-v1" as const;
export const SAVANT_SCORE_DIFF_MIN = -5;
export const SAVANT_SCORE_DIFF_MAX = 5;

export type SavantHalfInning = "Top" | "Bottom";
type SavantDiffSuffix =
  | "minus_5"
  | "minus_4"
  | "minus_3"
  | "minus_2"
  | "minus_1"
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5";
type BattingWinColumn =
  | "bat_wins_minus_5"
  | "bat_wins_minus_4"
  | "bat_wins_minus_3"
  | "bat_wins_minus_2"
  | "bat_wins_minus_1"
  | "bat_wins_0"
  | "bat_wins_1"
  | "bat_wins_2"
  | "bat_wins_3"
  | "bat_wins_4"
  | "bat_wins_5";
type LeverageIndexColumn =
  | "leverage_index_minus_5"
  | "leverage_index_minus_4"
  | "leverage_index_minus_3"
  | "leverage_index_minus_2"
  | "leverage_index_minus_1"
  | "leverage_index_0"
  | "leverage_index_1"
  | "leverage_index_2"
  | "leverage_index_3"
  | "leverage_index_4"
  | "leverage_index_5";
export type SavantFallbackReason =
  | "score-diff-out-of-savant-range"
  | "missing-savant-row";
export type SavantInningMappingReason =
  | "regulation-nine-inning-game"
  | "short-game-regulation-scaling"
  | "short-game-final-inning"
  | "extra-inning-automatic-runner"
  | "extra-inning-no-automatic-runner";

export interface MlbSavantBases {
  first: boolean;
  second: boolean;
  third: boolean;
}

export interface MlbSavantLookupState {
  inning: number;
  halfInning: "TOP" | "BOTTOM";
  outs: 0 | 1 | 2;
  bases: MlbSavantBases;
  homeScore: number;
  awayScore: number;
  scheduledInnings: number;
  extraInningRunner?: boolean;
  extraInningRunnerDelay?: 1 | 2;
}

export interface SavantWinExpRow {
  season_id: number;
  inning: number;
  bottom_top: SavantHalfInning;
  top_inning_sw: "Y" | "N";
  bases_cd: BaseState;
  bases: string;
  outs: 0 | 1 | 2;
  bat_wins_minus_5: number;
  bat_wins_minus_4: number;
  bat_wins_minus_3: number;
  bat_wins_minus_2: number;
  bat_wins_minus_1: number;
  bat_wins_0: number;
  bat_wins_1: number;
  bat_wins_2: number;
  bat_wins_3: number;
  bat_wins_4: number;
  bat_wins_5: number;
  leverage_index_minus_5: number;
  leverage_index_minus_4: number;
  leverage_index_minus_3: number;
  leverage_index_minus_2: number;
  leverage_index_minus_1: number;
  leverage_index_0: number;
  leverage_index_1: number;
  leverage_index_2: number;
  leverage_index_3: number;
  leverage_index_4: number;
  leverage_index_5: number;
}

export interface SavantWpaArtifact {
  modelVersion: typeof MLB_SAVANT_WPA_MODEL_VERSION;
  source: "Baseball Savant Game Strategy Explorer";
  sourceUrl: "https://baseballsavant.mlb.com/game-strategy-explorer";
  fetchedAt: string;
  regularSeasonYears: [2016, 2025];
  endpointTypes: ["winexp"];
  requestCount?: number;
  rows: SavantWinExpRow[];
}

export interface MlbSavantWinExpectancyTrace {
  modelVersion: typeof MLB_SAVANT_WPA_MODEL_VERSION;
  source: "Baseball Savant Game Strategy Explorer";
  sourceUrl: "https://baseballsavant.mlb.com/game-strategy-explorer";
  rowKey: string;
  originalInning: number;
  scheduledInnings: number;
  savantInning: number;
  savantInningMappingReason: SavantInningMappingReason;
  extraInningRunnerActive: boolean;
  half: SavantHalfInning;
  outs: 0 | 1 | 2;
  basesCd: BaseState;
  battingTeamIsHome: boolean;
  battingRunDifferential: number;
  savantScoreDifferential?: number;
  battingWinProbability?: number;
  homeWinProbability?: number;
  leverageIndex?: number;
  fallback?: SavantFallbackReason;
}

export type MlbSavantWinExpectancyLookup =
  | {
      supported: true;
      homeWinProbability: number;
      battingWinProbability: number;
      leverageIndex: number;
      trace: MlbSavantWinExpectancyTrace;
    }
  | {
      supported: false;
      fallback: SavantFallbackReason;
      trace: MlbSavantWinExpectancyTrace;
    };

const artifact = savantArtifact as SavantWpaArtifact;
const EXPECTED_SAVANT_ROW_COUNT = 480;
const SAVANT_ARTIFACT_INNINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const SAVANT_ARTIFACT_HALVES = ["Bottom", "Top"] as const;
const SAVANT_ARTIFACT_OUTS = [0, 1, 2] as const;
const SAVANT_ARTIFACT_BASE_STATES = [0, 1, 2, 3, 4, 5, 6, 7] as const;
const SAVANT_ARTIFACT_SCORE_DIFFS = [
  -5,
  -4,
  -3,
  -2,
  -1,
  0,
  1,
  2,
  3,
  4,
  5,
] as const;

if (artifact.modelVersion !== MLB_SAVANT_WPA_MODEL_VERSION) {
  throw new Error(
    `Unexpected Savant WPA artifact version ${artifact.modelVersion}; expected ${MLB_SAVANT_WPA_MODEL_VERSION}.`,
  );
}

const rowsByKey = validateSavantArtifactRows(artifact.rows);

export function lookupMlbSavantHomeWinExpectancy(
  state: MlbSavantLookupState,
): MlbSavantWinExpectancyLookup {
  const inningMapping = mapKblInningToSavantWithTrace(
    state.inning,
    state.scheduledInnings,
    {
      extraInningRunner: state.extraInningRunner,
      extraInningRunnerDelay: state.extraInningRunnerDelay,
    },
  );
  const savantInning = inningMapping.savantInning;
  const half = toSavantHalf(state.halfInning);
  const basesCd = encodeBaseState(state.bases);
  const battingTeamIsHome = state.halfInning === "BOTTOM";
  const battingScore = battingTeamIsHome ? state.homeScore : state.awayScore;
  const fieldingScore = battingTeamIsHome ? state.awayScore : state.homeScore;
  const battingRunDifferential = battingScore - fieldingScore;
  const rowKey = buildTraceRowKey(
    savantInning,
    half,
    state.outs,
    basesCd,
    battingRunDifferential,
  );
  const baseTrace = {
    modelVersion: MLB_SAVANT_WPA_MODEL_VERSION,
    source: artifact.source,
    sourceUrl: artifact.sourceUrl,
    rowKey,
    originalInning: state.inning,
    scheduledInnings: state.scheduledInnings,
    savantInning,
    savantInningMappingReason: inningMapping.reason,
    extraInningRunnerActive: inningMapping.extraInningRunnerActive,
    half,
    outs: state.outs,
    basesCd,
    battingTeamIsHome,
    battingRunDifferential,
  } satisfies MlbSavantWinExpectancyTrace;

  if (
    battingRunDifferential < SAVANT_SCORE_DIFF_MIN ||
    battingRunDifferential > SAVANT_SCORE_DIFF_MAX
  ) {
    return {
      supported: false,
      fallback: "score-diff-out-of-savant-range",
      trace: {
        ...baseTrace,
        fallback: "score-diff-out-of-savant-range",
      },
    };
  }

  const row = rowsByKey.get(buildRowKey(savantInning, half, state.outs, basesCd));
  if (!row) {
    return {
      supported: false,
      fallback: "missing-savant-row",
      trace: {
        ...baseTrace,
        fallback: "missing-savant-row",
      },
    };
  }

  const battingWinProbability = row[getBattingWinColumn(battingRunDifferential)];
  const leverageIndex = row[getLeverageIndexColumn(battingRunDifferential)];
  const homeWinProbability = battingTeamIsHome
    ? battingWinProbability
    : 1 - battingWinProbability;

  return {
    supported: true,
    homeWinProbability,
    battingWinProbability,
    leverageIndex,
    trace: {
      ...baseTrace,
      savantScoreDifferential: battingRunDifferential,
      battingWinProbability,
      homeWinProbability,
      leverageIndex,
    },
  };
}

export function mapKblInningToSavant(
  inning: number,
  scheduledInnings: number,
  options: {
    extraInningRunner?: boolean;
    extraInningRunnerDelay?: 1 | 2;
  } = {},
): number {
  return mapKblInningToSavantWithTrace(
    inning,
    scheduledInnings,
    options,
  ).savantInning;
}

export function mapKblInningToSavantWithTrace(
  inning: number,
  scheduledInnings: number,
  options: {
    extraInningRunner?: boolean;
    extraInningRunnerDelay?: 1 | 2;
  } = {},
): {
  savantInning: number;
  reason: SavantInningMappingReason;
  extraInningRunnerActive: boolean;
} {
  const normalizedInning = Math.max(1, Math.floor(inning));
  const normalizedScheduledInnings = Math.max(
    1,
    Math.min(9, Math.floor(scheduledInnings)),
  );

  if (normalizedInning > normalizedScheduledInnings) {
    const delay = options.extraInningRunnerDelay ?? 1;
    const runnerStartInning = normalizedScheduledInnings + delay;
    const extraInningRunnerActive =
      options.extraInningRunner === true &&
      normalizedInning >= runnerStartInning;

    return {
      savantInning: extraInningRunnerActive ? 10 : 9,
      reason: extraInningRunnerActive
        ? "extra-inning-automatic-runner"
        : "extra-inning-no-automatic-runner",
      extraInningRunnerActive,
    };
  }

  if (normalizedScheduledInnings === 9) {
    return {
      savantInning: Math.min(normalizedInning, 9),
      reason: "regulation-nine-inning-game",
      extraInningRunnerActive: false,
    };
  }

  if (normalizedScheduledInnings <= 1) {
    return {
      savantInning: 9,
      reason: "short-game-final-inning",
      extraInningRunnerActive: false,
    };
  }

  return {
    savantInning: Math.round(
      1 + (normalizedInning - 1) * (8 / (normalizedScheduledInnings - 1)),
    ),
    reason:
      normalizedInning === normalizedScheduledInnings
        ? "short-game-final-inning"
        : "short-game-regulation-scaling",
    extraInningRunnerActive: false,
  };
}

export function getMlbSavantWpaArtifactMetadata() {
  return {
    modelVersion: artifact.modelVersion,
    source: artifact.source,
    sourceUrl: artifact.sourceUrl,
    fetchedAt: artifact.fetchedAt,
    regularSeasonYears: artifact.regularSeasonYears,
    endpointTypes: artifact.endpointTypes,
    rowCount: artifact.rows.length,
  };
}

function validateSavantArtifactRows(
  rows: SavantWinExpRow[],
): Map<string, SavantWinExpRow> {
  if (!Array.isArray(rows)) {
    throw new Error("Savant WPA artifact rows must be an array.");
  }
  if (rows.length !== EXPECTED_SAVANT_ROW_COUNT) {
    throw new Error(
      `Savant WPA artifact must contain ${EXPECTED_SAVANT_ROW_COUNT} rows, got ${rows.length}.`,
    );
  }

  const validatedRowsByKey = new Map<string, SavantWinExpRow>();
  for (const row of rows) {
    if (!includesReadonly(SAVANT_ARTIFACT_INNINGS, row.inning)) {
      throw new Error(`Savant WPA artifact has invalid inning ${row.inning}.`);
    }
    if (!includesReadonly(SAVANT_ARTIFACT_HALVES, row.bottom_top)) {
      throw new Error(`Savant WPA artifact has invalid half ${row.bottom_top}.`);
    }
    if (!includesReadonly(SAVANT_ARTIFACT_OUTS, row.outs)) {
      throw new Error(`Savant WPA artifact has invalid outs ${row.outs}.`);
    }
    if (!includesReadonly(SAVANT_ARTIFACT_BASE_STATES, row.bases_cd)) {
      throw new Error(`Savant WPA artifact has invalid base state ${row.bases_cd}.`);
    }

    const key = buildRowKey(
      row.inning,
      row.bottom_top,
      row.outs,
      row.bases_cd,
    );
    if (validatedRowsByKey.has(key)) {
      throw new Error(`Savant WPA artifact has duplicate row key ${key}.`);
    }

    for (const diff of SAVANT_ARTIFACT_SCORE_DIFFS) {
      const winProbability = row[getBattingWinColumn(diff)];
      const leverageIndex = row[getLeverageIndexColumn(diff)];
      assertFiniteRange(
        winProbability,
        0,
        1,
        `Savant WPA artifact ${key} batting WP diff ${diff}`,
      );
      assertFiniteRange(
        leverageIndex,
        0,
        Number.POSITIVE_INFINITY,
        `Savant WPA artifact ${key} LI diff ${diff}`,
      );
      if (
        leverageIndex === 0 &&
        winProbability !== 0 &&
        winProbability !== 1
      ) {
        throw new Error(
          `Savant WPA artifact ${key} LI diff ${diff} is zero before non-terminal WP ${winProbability}.`,
        );
      }
    }

    validatedRowsByKey.set(key, row);
  }

  for (const inning of SAVANT_ARTIFACT_INNINGS) {
    for (const half of SAVANT_ARTIFACT_HALVES) {
      for (const outs of SAVANT_ARTIFACT_OUTS) {
        for (const basesCd of SAVANT_ARTIFACT_BASE_STATES) {
          const key = buildRowKey(inning, half, outs, basesCd);
          if (!validatedRowsByKey.has(key)) {
            throw new Error(`Savant WPA artifact is missing row key ${key}.`);
          }
        }
      }
    }
  }

  return validatedRowsByKey;
}

function includesReadonly<T>(
  values: readonly T[],
  value: unknown,
): value is T {
  return values.includes(value as T);
}

function assertFiniteRange(
  value: unknown,
  min: number,
  max: number,
  label: string,
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  ) {
    throw new Error(`${label} must be finite and in range ${min}..${max}.`);
  }
}

function toSavantHalf(halfInning: "TOP" | "BOTTOM"): SavantHalfInning {
  return halfInning === "TOP" ? "Top" : "Bottom";
}

function buildRowKey(
  inning: number,
  half: SavantHalfInning,
  outs: 0 | 1 | 2,
  basesCd: BaseState,
): string {
  return `${inning}|${half}|${outs}|${basesCd}`;
}

function buildTraceRowKey(
  inning: number,
  half: SavantHalfInning,
  outs: 0 | 1 | 2,
  basesCd: BaseState,
  battingRunDifferential: number,
): string {
  return `${buildRowKey(inning, half, outs, basesCd)}|batDiff=${battingRunDifferential}`;
}

function getDiffSuffix(diff: number): SavantDiffSuffix {
  return diff < 0
    ? (`minus_${Math.abs(diff)}` as SavantDiffSuffix)
    : (String(diff) as SavantDiffSuffix);
}

function getBattingWinColumn(diff: number): BattingWinColumn {
  return `bat_wins_${getDiffSuffix(diff)}` as BattingWinColumn;
}

function getLeverageIndexColumn(diff: number): LeverageIndexColumn {
  return `leverage_index_${getDiffSuffix(diff)}` as LeverageIndexColumn;
}
