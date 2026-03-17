import type {
  PitcherRunnerStats,
  RunnerTrackingState,
  TrackedRunner,
} from '../engines/inheritedRunnerTracker';
import type { AtBatEvent, RunnerState } from '../../../utils/eventLog';
import type { HowReached } from '../types/substitution';

type LiveBases = { first: boolean; second: boolean; third: boolean };
type PersistedRunnerOutcome = NonNullable<AtBatEvent['runnerOutcomes']>[number];

function getBatterDestinationBase(
  result?: AtBatEvent['result'],
  enrichment?: AtBatEvent['enrichment'],
): 'first' | 'second' | 'third' | null {
  if (!result || enrichment?.batterOutAdvancing) {
    return null;
  }

  if (
    result === '1B' ||
    result === 'BB' ||
    result === 'IBB' ||
    result === 'HBP' ||
    result === 'WP_K' ||
    result === 'PB_K' ||
    result === 'FC' ||
    result === 'D3K'
  ) {
    return 'first';
  }
  if (result === '2B' || result === 'GRD') {
    return 'second';
  }
  if (result === '3B') {
    return 'third';
  }

  return null;
}

const onBaseOrder: Record<'1B' | '2B' | '3B', number> = {
  '3B': 0,
  '2B': 1,
  '1B': 2,
};

function createEmptyPitcherRunnerStats(pitcherId: string, pitcherName: string): PitcherRunnerStats {
  return {
    pitcherId,
    pitcherName,
    runnersOnBase: [],
    runnersScored: [],
    inheritedRunners: [],
    inheritedRunnersScored: [],
    bequeathedRunnerCount: 0,
  };
}

export function buildLiveBasesFromRunnerOutcomes(
  runnerOutcomes: PersistedRunnerOutcome[] | undefined,
  options?: {
    result?: AtBatEvent['result'];
    enrichment?: AtBatEvent['enrichment'];
  },
): LiveBases {
  const bases: LiveBases = { first: false, second: false, third: false };
  const batterBase = getBatterDestinationBase(options?.result, options?.enrichment);

  if (batterBase === 'first') {
    bases.first = true;
  } else if (batterBase === 'second') {
    bases.second = true;
  } else if (batterBase === 'third') {
    bases.third = true;
  }

  for (const outcome of runnerOutcomes || []) {
    const runnerIsOut = outcome.toBase === 'out' || outcome.isTootblan || outcome.isOutAdvancing;
    if (runnerIsOut) {
      continue;
    }

    if (outcome.toBase === 'first') {
      bases.first = true;
    } else if (outcome.toBase === 'second') {
      bases.second = true;
    } else if (outcome.toBase === 'third') {
      bases.third = true;
    }
  }

  return bases;
}

export function buildLiveBasesFromRunnersAfter(
  runnersAfter: RunnerState,
): LiveBases {
  return {
    first: !!runnersAfter.first,
    second: !!runnersAfter.second,
    third: !!runnersAfter.third,
  };
}

export function reconcileRunnerTrackerBases(
  state: RunnerTrackingState,
  bases: LiveBases,
): RunnerTrackingState {
  const activeRunners = state.runners
    .filter(
      (runner): runner is TrackedRunner & { currentBase: '1B' | '2B' | '3B' } =>
        runner.currentBase === '1B' || runner.currentBase === '2B' || runner.currentBase === '3B'
    )
    .sort((left, right) => onBaseOrder[left.currentBase] - onBaseOrder[right.currentBase]);

  const desiredBases = ([
    bases.third ? '3B' : null,
    bases.second ? '2B' : null,
    bases.first ? '1B' : null,
  ].filter(Boolean) as Array<'1B' | '2B' | '3B'>);

  const updatedActiveRunners = activeRunners
    .slice(0, desiredBases.length)
    .map((runner, index) => ({
      ...runner,
      currentBase: desiredBases[index],
    }));

  const rebuiltPitcherStats = new Map<string, PitcherRunnerStats>(
    Array.from(state.pitcherStats.entries()).map(([pitcherId, stats]) => [
      pitcherId,
      {
        ...stats,
        runnersOnBase: [],
        inheritedRunners: [],
      },
    ])
  );

  const ensurePitcherStats = (pitcherId: string, pitcherName: string) => {
    let stats = rebuiltPitcherStats.get(pitcherId);
    if (!stats) {
      stats = createEmptyPitcherRunnerStats(pitcherId, pitcherName);
      rebuiltPitcherStats.set(pitcherId, stats);
    }
    return stats;
  };

  const currentPitcherStats = ensurePitcherStats(state.currentPitcherId, state.currentPitcherName);

  for (const runner of updatedActiveRunners) {
    const responsibleStats = ensurePitcherStats(runner.responsiblePitcherId, runner.responsiblePitcherName);
    responsibleStats.runnersOnBase.push(runner);
    if (runner.isInherited) {
      currentPitcherStats.inheritedRunners.push(runner);
    }
  }

  return {
    ...state,
    runners: updatedActiveRunners,
    pitcherStats: rebuiltPitcherStats,
  };
}

function findPitcherName(
  state: RunnerTrackingState,
  pitcherId: string,
  fallbackName?: string,
): string {
  if (pitcherId === state.currentPitcherId) {
    return state.currentPitcherName;
  }
  return state.pitcherStats.get(pitcherId)?.pitcherName ?? fallbackName ?? pitcherId;
}

export function reconcileRunnerTrackerFromRunnersAfter(
  state: RunnerTrackingState,
  runnersAfter: RunnerState,
  howReachedForNewRunners: HowReached = 'hit',
): RunnerTrackingState {
  const existingRunners = new Map(
    state.runners.map((runner) => [runner.runnerId, runner]),
  );
  const rebuiltPitcherStats = new Map<string, PitcherRunnerStats>(
    Array.from(state.pitcherStats.entries()).map(([pitcherId, stats]) => [
      pitcherId,
      {
        ...stats,
        runnersOnBase: [],
        inheritedRunners: [],
      },
    ]),
  );

  const ensurePitcherStats = (pitcherId: string, pitcherName: string) => {
    let stats = rebuiltPitcherStats.get(pitcherId);
    if (!stats) {
      stats = createEmptyPitcherRunnerStats(pitcherId, pitcherName);
      rebuiltPitcherStats.set(pitcherId, stats);
    }
    return stats;
  };

  const rebuiltRunners: TrackedRunner[] = [];
  const currentPitcherStats = ensurePitcherStats(state.currentPitcherId, state.currentPitcherName);
  const baseEntries: Array<['1B' | '2B' | '3B', RunnerState[keyof RunnerState]]> = [
    ['3B', runnersAfter.third],
    ['2B', runnersAfter.second],
    ['1B', runnersAfter.first],
  ];

  for (const [base, runnerInfo] of baseEntries) {
    if (!runnerInfo) continue;

    const existingRunner = existingRunners.get(runnerInfo.runnerId);
    const responsiblePitcherName = findPitcherName(
      state,
      runnerInfo.responsiblePitcherId,
      existingRunner?.responsiblePitcherName,
    );
    const isInherited = runnerInfo.responsiblePitcherId !== state.currentPitcherId;
    const trackedRunner: TrackedRunner = existingRunner
      ? {
          ...existingRunner,
          runnerId: runnerInfo.runnerId,
          runnerName: runnerInfo.runnerName,
          currentBase: base,
          responsiblePitcherId: runnerInfo.responsiblePitcherId,
          responsiblePitcherName,
          isInherited,
          inheritedFromPitcherId: isInherited ? runnerInfo.responsiblePitcherId : null,
        }
      : {
          runnerId: runnerInfo.runnerId,
          runnerName: runnerInfo.runnerName,
          currentBase: base,
          startingBase: base,
          howReached: howReachedForNewRunners,
          responsiblePitcherId: runnerInfo.responsiblePitcherId,
          responsiblePitcherName,
          isInherited,
          inheritedFromPitcherId: isInherited ? runnerInfo.responsiblePitcherId : null,
          inningReached: state.inning,
          atBatReached: state.atBatNumber,
        };

    rebuiltRunners.push(trackedRunner);

    const responsibleStats = ensurePitcherStats(trackedRunner.responsiblePitcherId, trackedRunner.responsiblePitcherName);
    responsibleStats.runnersOnBase.push(trackedRunner);
    if (trackedRunner.isInherited) {
      currentPitcherStats.inheritedRunners.push(trackedRunner);
    }
  }

  return {
    ...state,
    runners: rebuiltRunners,
    pitcherStats: rebuiltPitcherStats,
  };
}
