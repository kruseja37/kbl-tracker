import type { AtBatEvent } from '../../../utils/eventLog';

export type PersistedRunnerOutcome = NonNullable<AtBatEvent['runnerOutcomes']>[number];

type BaseKey = 'first' | 'second' | 'third';
type RunnerInfo = NonNullable<AtBatEvent['runnersAfter'][BaseKey]>;

export interface CompleteRunnerOutcomesForDerivationResult {
  runnerOutcomes: PersistedRunnerOutcome[];
  diagnostics: string[];
}

export interface DeriveEnrichedAtBatStateInput {
  existingAtBat: AtBatEvent;
  runnerOutcomes: PersistedRunnerOutcome[];
  result?: AtBatEvent['result'];
  totalInnings?: number;
}

export interface DerivedEnrichedAtBatState {
  runnerOutcomes: PersistedRunnerOutcome[];
  runnersAfter: AtBatEvent['runnersAfter'];
  runsScored: string[];
  rbiCount: number;
  outsRecorded: number;
  outsAfter: number;
  awayScoreAfter: number;
  homeScoreAfter: number;
  isWalkOff: boolean;
  result: AtBatEvent['result'];
  batterReachedOnError?: boolean;
  batterErrorType?: AtBatEvent['batterErrorType'];
  batterErrorChargedToPosition?: AtBatEvent['batterErrorChargedToPosition'];
  batterCorrectionOriginalResult?: AtBatEvent['batterCorrectionOriginalResult'];
  diagnostics: string[];
}

const RBI_EXCLUDED_RESULTS = new Set<AtBatEvent['result']>(['DP', 'TP', 'E']);
const BATTER_OUT_RESULTS = new Set<AtBatEvent['result']>([
  'GO',
  'DP',
  'TP',
  'FO',
  'FLO',
  'LO',
  'PO',
  'K',
  'Kc',
  'Ꝁ',
  'SF',
  'SAC',
  'D3K',
  'WP_K',
  'PB_K',
]);

function getDefaultBatterDestination(
  result: AtBatEvent['result'],
): PersistedRunnerOutcome['toBase'] | null {
  if (
    result === '1B' ||
    result === 'BB' ||
    result === 'IBB' ||
    result === 'HBP' ||
    result === 'E' ||
    result === 'FC'
  ) {
    return 'first';
  }

  if (result === '2B' || result === 'GRD') return 'second';
  if (result === '3B') return 'third';
  if (result === 'HR' || result === 'ITPHR') return 'home';
  if (BATTER_OUT_RESULTS.has(result)) return 'out';

  return null;
}

function outcomeCountsAsOut(
  outcome: Pick<PersistedRunnerOutcome, 'toBase' | 'isTootblan' | 'isOutAdvancing'>,
): boolean {
  if (outcome.toBase === 'end') return false;
  return Boolean(
    outcome.toBase === 'out' ||
      (outcome.toBase === 'home' && (outcome.isTootblan || outcome.isOutAdvancing)),
  );
}

function outcomeCountsAsRun(
  outcome: Pick<PersistedRunnerOutcome, 'toBase' | 'isTootblan' | 'isOutAdvancing'>,
): boolean {
  return Boolean(
    outcome.toBase === 'home' &&
      !outcome.isTootblan &&
      !outcome.isOutAdvancing,
  );
}

function isBaseDestination(toBase: PersistedRunnerOutcome['toBase']): toBase is BaseKey {
  return toBase === 'first' || toBase === 'second' || toBase === 'third';
}

function findBatterBaseInRunnersAfter(existingAtBat: AtBatEvent): BaseKey | null {
  for (const base of ['first', 'second', 'third'] as const) {
    if (existingAtBat.runnersAfter[base]?.runnerId === existingAtBat.batterId) {
      return base;
    }
  }

  return null;
}

function sameRunner(
  before: RunnerInfo | null | undefined,
  after: RunnerInfo | null | undefined,
): boolean {
  if (!before || !after) return false;
  if (before.runnerId && after.runnerId) {
    return before.runnerId === after.runnerId;
  }
  return before.runnerName === after.runnerName;
}

export function completeRunnerOutcomesForDerivation(
  existingAtBat: AtBatEvent,
  runnerOutcomes: PersistedRunnerOutcome[],
): CompleteRunnerOutcomesForDerivationResult {
  const diagnostics: string[] = [];
  const completedOutcomes = [...runnerOutcomes];
  const existingOutcomeKeys = new Set(
    completedOutcomes.map((outcome) => `${outcome.runnerId}:${outcome.fromBase}`),
  );

  for (const base of ['first', 'second', 'third'] as const) {
    const runnerBefore = existingAtBat.runners[base];
    const runnerAfter = existingAtBat.runnersAfter[base];
    if (!sameRunner(runnerBefore, runnerAfter)) continue;
    if (!runnerBefore) continue;

    const key = `${runnerBefore.runnerId}:${base}`;
    if (existingOutcomeKeys.has(key)) continue;
    completedOutcomes.push({
      runnerId: runnerBefore.runnerId,
      runnerName: runnerBefore.runnerName,
      fromBase: base,
      toBase: base,
    });
    existingOutcomeKeys.add(key);
  }

  if (completedOutcomes.some((outcome) => outcome.fromBase === 'batter')) {
    return { runnerOutcomes: completedOutcomes, diagnostics };
  }

  const batterBase = findBatterBaseInRunnersAfter(existingAtBat);
  const inferredBatterDestination =
    batterBase ?? getDefaultBatterDestination(existingAtBat.result);

  if (!inferredBatterDestination) {
    diagnostics.push(
      `Could not infer missing batter outcome for result ${existingAtBat.result}`,
    );
    return { runnerOutcomes: completedOutcomes, diagnostics };
  }

  return {
    runnerOutcomes: [
      ...completedOutcomes,
      {
        runnerId: existingAtBat.batterId,
        runnerName: existingAtBat.batterName,
        fromBase: 'batter',
        toBase: inferredBatterDestination,
      },
    ],
    diagnostics,
  };
}

function findExistingRunnerInfo(
  existingAtBat: AtBatEvent,
  outcome: PersistedRunnerOutcome,
): RunnerInfo | null {
  if (outcome.fromBase === 'batter') {
    return {
      runnerId: existingAtBat.batterId,
      runnerName: existingAtBat.batterName,
      responsiblePitcherId: existingAtBat.pitcherId,
    };
  }

  const directBefore = existingAtBat.runners[outcome.fromBase];
  if (directBefore) return directBefore;

  for (const base of ['first', 'second', 'third'] as const) {
    const runnerBefore = existingAtBat.runners[base];
    if (runnerBefore?.runnerId === outcome.runnerId) return runnerBefore;

    const runnerAfter = existingAtBat.runnersAfter[base];
    if (runnerAfter?.runnerId === outcome.runnerId) return runnerAfter;
  }

  return null;
}

function buildRunnerInfo(
  existingAtBat: AtBatEvent,
  outcome: PersistedRunnerOutcome,
): RunnerInfo {
  const existingRunnerInfo = findExistingRunnerInfo(existingAtBat, outcome);
  return {
    runnerId: outcome.runnerId,
    runnerName: outcome.runnerName,
    responsiblePitcherId:
      existingRunnerInfo?.responsiblePitcherId ?? existingAtBat.pitcherId,
  };
}

function deriveRunsScored(
  runnerOutcomes: PersistedRunnerOutcome[],
): string[] {
  const scoredIds: string[] = [];
  const seen = new Set<string>();

  for (const outcome of runnerOutcomes) {
    if (!outcomeCountsAsRun(outcome)) continue;
    if (seen.has(outcome.runnerId)) continue;
    seen.add(outcome.runnerId);
    scoredIds.push(outcome.runnerId);
  }

  return scoredIds;
}

function deriveRbiCount(
  result: AtBatEvent['result'],
  runnerOutcomes: PersistedRunnerOutcome[],
): number {
  // Conservative Prompt 2 rule: keep RBI derivation simple until the helper is
  // wired into live correction flows and full scorer rules can be validated.
  if (RBI_EXCLUDED_RESULTS.has(result)) return 0;

  return runnerOutcomes.filter(
    (outcome) => outcomeCountsAsRun(outcome) && !outcome.errorType,
  ).length;
}

function deriveIsWalkOff(
  existingAtBat: AtBatEvent,
  homeScoreAfter: number,
  awayScoreAfter: number,
  totalInnings: number,
): boolean {
  if (existingAtBat.inning < totalInnings) return false;
  if (existingAtBat.halfInning !== 'BOTTOM') return false;

  return (
    homeScoreAfter > awayScoreAfter &&
    existingAtBat.homeScore <= existingAtBat.awayScore
  );
}

function deriveBatterErrorMetadata(
  existingAtBat: AtBatEvent,
  runnerOutcomes: PersistedRunnerOutcome[],
  baseResult: AtBatEvent['result'],
): Pick<
  DerivedEnrichedAtBatState,
  | 'result'
  | 'batterReachedOnError'
  | 'batterErrorType'
  | 'batterErrorChargedToPosition'
  | 'batterCorrectionOriginalResult'
> {
  const batterOutcome = runnerOutcomes.find(
    (outcome) => outcome.fromBase === 'batter',
  );

  if (
    batterOutcome?.toBase === 'first' &&
    !outcomeCountsAsOut(batterOutcome) &&
    batterOutcome.errorType
  ) {
    return {
      result: 'E',
      batterReachedOnError: true,
      batterErrorType: batterOutcome.errorType,
      batterErrorChargedToPosition: batterOutcome.errorChargedTo,
      batterCorrectionOriginalResult:
        existingAtBat.batterCorrectionOriginalResult ??
        (baseResult === 'E' ? undefined : baseResult),
    };
  }

  if (batterOutcome) {
    return {
      result: baseResult,
      batterReachedOnError: false,
      batterErrorType: undefined,
      batterErrorChargedToPosition: undefined,
      batterCorrectionOriginalResult: undefined,
    };
  }

  return {
    result: baseResult,
    batterReachedOnError: existingAtBat.batterReachedOnError,
    batterErrorType: existingAtBat.batterErrorType,
    batterErrorChargedToPosition: existingAtBat.batterErrorChargedToPosition,
    batterCorrectionOriginalResult: existingAtBat.batterCorrectionOriginalResult,
  };
}

export function deriveEnrichedAtBatState({
  existingAtBat,
  runnerOutcomes,
  result,
  totalInnings,
}: DeriveEnrichedAtBatStateInput): DerivedEnrichedAtBatState {
  const diagnostics: string[] = [];
  const baseResult = result ?? existingAtBat.result;
  const resultMetadata = deriveBatterErrorMetadata(
    existingAtBat,
    runnerOutcomes,
    baseResult,
  );
  const nextResult = resultMetadata.result;
  const runnersAfter: AtBatEvent['runnersAfter'] = {
    first: null,
    second: null,
    third: null,
  };

  for (const outcome of runnerOutcomes) {
    if (outcomeCountsAsOut(outcome)) continue;
    if (!isBaseDestination(outcome.toBase)) continue;

    const destination = outcome.toBase;
    const existingRunnerAtDestination = runnersAfter[destination];
    if (existingRunnerAtDestination) {
      diagnostics.push(
        `Destination conflict at ${destination}: kept ${existingRunnerAtDestination.runnerName}, ignored ${outcome.runnerName}`,
      );
      continue;
    }

    runnersAfter[destination] = buildRunnerInfo(existingAtBat, outcome);
  }

  const outsRecorded = runnerOutcomes.filter(outcomeCountsAsOut).length;
  const outsAfter = Math.min(3, Math.max(existingAtBat.outs, existingAtBat.outs + outsRecorded));
  const normalizedRunnersAfter =
    outsAfter >= 3
      ? { first: null, second: null, third: null }
      : runnersAfter;
  const runsScored = deriveRunsScored(runnerOutcomes);
  const scoreDelta = runsScored.length;
  const awayScoreAfter =
    existingAtBat.halfInning === 'TOP'
      ? existingAtBat.awayScore + scoreDelta
      : existingAtBat.awayScore;
  const homeScoreAfter =
    existingAtBat.halfInning === 'BOTTOM'
      ? existingAtBat.homeScore + scoreDelta
      : existingAtBat.homeScore;

  if (nextResult === 'DP' && outsRecorded !== 2) {
    diagnostics.push(`Result DP has ${outsRecorded} derived out(s)`);
  }
  if (nextResult === 'TP' && outsRecorded !== 3) {
    diagnostics.push(`Result TP has ${outsRecorded} derived out(s)`);
  }

  return {
    runnerOutcomes,
    runnersAfter: normalizedRunnersAfter,
    runsScored,
    rbiCount: deriveRbiCount(nextResult, runnerOutcomes),
    outsRecorded,
    outsAfter,
    awayScoreAfter,
    homeScoreAfter,
    isWalkOff: deriveIsWalkOff(
      existingAtBat,
      homeScoreAfter,
      awayScoreAfter,
      totalInnings ?? existingAtBat.totalInnings ?? 9,
    ),
    ...resultMetadata,
    diagnostics,
  };
}
