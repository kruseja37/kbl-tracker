import type {
  AtBatFlowState,
  AtBatResult,
  Bases,
  HalfInning,
  RunnerOutcome,
} from '../../types/game';
import { isOut } from '../../types/game';

export interface PitcherGameStats {
  pitcherId: string;
  pitcherName: string;
  teamId: string;
  isStarter: boolean;
  entryInning: number;
  outsRecorded: number;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walksAllowed: number;
  strikeoutsThrown: number;
  homeRunsAllowed: number;
  hitBatters: number;
  basesReachedViaError: number;
  wildPitches: number;
  pitchCount: number;
  battersFaced: number;
  consecutiveHRsAllowed: number;
  firstInningRuns: number;
  basesLoadedWalks: number;
  inningsComplete: number;
  decision: 'W' | 'L' | 'ND' | null;
  save: boolean;
  hold: boolean;
  blownSave: boolean;
}

export interface ProcessRunnerOutcomesResult {
  updatedBases: Bases;
  runsScored: string[];
  outsRecorded: number;
}

export interface ProcessRunnerOutcomesOptions {
  flowState: AtBatFlowState;
  batterResult: AtBatResult;
  bases: Bases;
  currentOuts: number;
}

export const isForceOut = (
  outcome: RunnerOutcome | null,
  fromBase: 'first' | 'second' | 'third',
  currentBases: Bases
): boolean => {
  if (!outcome) return false;

  if (fromBase === 'first' && outcome === 'OUT_2B') {
    return true;
  }

  if (fromBase === 'second' && outcome === 'OUT_3B' && currentBases.first) {
    return true;
  }

  if (
    fromBase === 'third' &&
    outcome === 'OUT_HOME' &&
    currentBases.first &&
    currentBases.second
  ) {
    return true;
  }

  return false;
};

export const processRunnerOutcomes = ({
  flowState,
  batterResult,
  bases,
  currentOuts,
}: ProcessRunnerOutcomesOptions): ProcessRunnerOutcomesResult => {
  const runnerOutcomes = flowState.runnerOutcomes;
  const updatedBases: Bases = { ...bases };
  const runnerResults: {
    third?: { action: 'score' | 'out' | 'advance' | 'hold'; isForceOut: boolean };
    second?: { action: 'score' | 'out' | 'advance' | 'hold'; isForceOut: boolean };
    first?: { action: 'score' | 'out' | 'advance' | 'hold'; isForceOut: boolean };
  } = {};
  let runnerOutsRecorded = 0;

  if (bases.third && runnerOutcomes.third) {
    const forceOut = isForceOut(runnerOutcomes.third, 'third', bases);
    if (runnerOutcomes.third === 'SCORED') {
      runnerResults.third = { action: 'score', isForceOut: false };
    } else if (runnerOutcomes.third === 'OUT_HOME') {
      runnerResults.third = { action: 'out', isForceOut: forceOut };
      runnerOutsRecorded++;
    } else if (runnerOutcomes.third === 'HELD') {
      runnerResults.third = { action: 'hold', isForceOut: false };
    }
  }

  if (bases.second && runnerOutcomes.second) {
    const forceOut = isForceOut(runnerOutcomes.second, 'second', bases);
    if (runnerOutcomes.second === 'SCORED') {
      runnerResults.second = { action: 'score', isForceOut: false };
    } else if (runnerOutcomes.second === 'TO_3B') {
      runnerResults.second = { action: 'advance', isForceOut: false };
    } else if (
      runnerOutcomes.second === 'OUT_HOME' ||
      runnerOutcomes.second === 'OUT_3B'
    ) {
      runnerResults.second = { action: 'out', isForceOut: forceOut };
      runnerOutsRecorded++;
    } else if (runnerOutcomes.second === 'HELD') {
      runnerResults.second = { action: 'hold', isForceOut: false };
    }
  }

  if (bases.first && runnerOutcomes.first) {
    const forceOut = isForceOut(runnerOutcomes.first, 'first', bases);
    if (runnerOutcomes.first === 'SCORED') {
      runnerResults.first = { action: 'score', isForceOut: false };
    } else if (runnerOutcomes.first === 'TO_3B' || runnerOutcomes.first === 'TO_2B') {
      runnerResults.first = { action: 'advance', isForceOut: false };
    } else if (
      runnerOutcomes.first === 'OUT_HOME' ||
      runnerOutcomes.first === 'OUT_3B' ||
      runnerOutcomes.first === 'OUT_2B'
    ) {
      runnerResults.first = { action: 'out', isForceOut: forceOut };
      runnerOutsRecorded++;
    } else if (runnerOutcomes.first === 'HELD') {
      runnerResults.first = { action: 'hold', isForceOut: false };
    }
  }

  const batterOuts = isOut(batterResult) ? (batterResult === 'DP' ? 2 : 1) : 0;
  const totalOutsOnPlay = batterOuts + runnerOutsRecorded;
  const finalOutCount = currentOuts + totalOutsOnPlay;

  const hasForceOut =
    Boolean(runnerResults.third?.isForceOut) ||
    Boolean(runnerResults.second?.isForceOut) ||
    Boolean(runnerResults.first?.isForceOut) ||
    batterResult === 'GO' ||
    batterResult === 'DP' ||
    batterResult === 'FC';

  const runsNegatedByForceOut = finalOutCount >= 3 && hasForceOut;
  const validRunsScored: string[] = [];

  if (bases.third && runnerResults.third) {
    if (runnerResults.third.action === 'score' && !runsNegatedByForceOut) {
      validRunsScored.push(bases.third.playerId);
    }
    if (runnerResults.third.action === 'score' || runnerResults.third.action === 'out') {
      updatedBases.third = null;
    }
  }

  if (bases.second && runnerResults.second) {
    if (runnerResults.second.action === 'score' && !runsNegatedByForceOut) {
      validRunsScored.push(bases.second.playerId);
    }
    if (runnerResults.second.action === 'advance') {
      updatedBases.third = bases.second;
      updatedBases.second = null;
    } else if (
      runnerResults.second.action === 'score' ||
      runnerResults.second.action === 'out'
    ) {
      updatedBases.second = null;
    }
  }

  if (bases.first && runnerResults.first) {
    if (runnerResults.first.action === 'score' && !runsNegatedByForceOut) {
      validRunsScored.push(bases.first.playerId);
    }
    if (runnerOutcomes.first === 'TO_3B') {
      updatedBases.third = bases.first;
      updatedBases.first = null;
    } else if (runnerOutcomes.first === 'TO_2B') {
      updatedBases.second = bases.first;
      updatedBases.first = null;
    } else if (
      runnerResults.first.action === 'score' ||
      runnerResults.first.action === 'out'
    ) {
      updatedBases.first = null;
    }
  }

  return {
    updatedBases,
    runsScored: validRunsScored,
    outsRecorded: runnerOutsRecorded,
  };
};

export interface UpdatePitcherStatsOptions {
  stats: PitcherGameStats;
  result: AtBatResult;
  outsOnPlay: number;
  runsScored: number;
  basesLoaded: boolean;
  inning: number;
  pitchesThisAtBat?: number;
}

const ESTIMATED_PITCHES: Record<AtBatResult, number> = {
  K: 4,
  KL: 4,
  D3K: 4,
  BB: 5,
  IBB: 4,
  HBP: 2,
  '1B': 3,
  '2B': 3,
  '3B': 3,
  HR: 3,
  GO: 3,
  FO: 3,
  LO: 3,
  PO: 2,
  DP: 3,
  FC: 3,
  SF: 3,
  SAC: 3,
  E: 3,
  TP: 3,
};

export const updatePitcherStats = ({
  stats,
  result,
  outsOnPlay,
  runsScored,
  basesLoaded,
  inning,
  pitchesThisAtBat,
}: UpdatePitcherStatsOptions): PitcherGameStats => {
  const updated: PitcherGameStats = { ...stats };
  updated.battersFaced += 1;

  if (pitchesThisAtBat !== undefined) {
    updated.pitchCount += pitchesThisAtBat;
  } else {
    updated.pitchCount += ESTIMATED_PITCHES[result] ?? 3;
  }

  switch (result) {
    case '1B':
    case '2B':
    case '3B':
      updated.hitsAllowed += 1;
      updated.consecutiveHRsAllowed = 0;
      break;
    case 'HR':
      updated.hitsAllowed += 1;
      updated.homeRunsAllowed += 1;
      updated.consecutiveHRsAllowed += 1;
      break;
    case 'K':
    case 'KL':
      updated.strikeoutsThrown += 1;
      updated.outsRecorded += 1;
      updated.consecutiveHRsAllowed = 0;
      break;
    case 'D3K':
      updated.strikeoutsThrown += 1;
      updated.outsRecorded += outsOnPlay;
      break;
    case 'BB':
      updated.walksAllowed += 1;
      if (basesLoaded) {
        updated.basesLoadedWalks += 1;
      }
      updated.consecutiveHRsAllowed = 0;
      break;
    case 'IBB':
      updated.consecutiveHRsAllowed = 0;
      break;
    case 'HBP':
      updated.hitBatters += 1;
      updated.consecutiveHRsAllowed = 0;
      break;
    case 'E':
      updated.basesReachedViaError += 1;
      updated.consecutiveHRsAllowed = 0;
      break;
    case 'GO':
    case 'FO':
    case 'LO':
    case 'PO':
    case 'SF':
    case 'SAC':
      updated.outsRecorded += outsOnPlay;
      updated.consecutiveHRsAllowed = 0;
      break;
    case 'DP':
    case 'TP':
      updated.outsRecorded += outsOnPlay;
      updated.consecutiveHRsAllowed = 0;
      break;
    case 'FC':
      updated.outsRecorded += outsOnPlay;
      updated.consecutiveHRsAllowed = 0;
      break;
  }

  updated.runsAllowed += runsScored;

  if (updated.isStarter && updated.entryInning === 1 && inning === 1) {
    updated.firstInningRuns += runsScored;
  }

  return updated;
};

export const calculateSimpleWinProbability = (
  inn: number,
  half: HalfInning,
  away: number,
  home: number,
  outs: number
): number => {
  const diff = home - away;

  let halfInningsRemaining: number;
  if (half === 'TOP') {
    halfInningsRemaining = Math.max(0, (9 - inn) * 2 + 1);
  } else {
    halfInningsRemaining = Math.max(0, (9 - inn) * 2);
  }

  const runsPerWinPct = halfInningsRemaining > 0
    ? 0.15 / Math.sqrt(halfInningsRemaining / 2 + 1)
    : 0.35;

  let prob = 0.5 + (diff * runsPerWinPct);

  if (half === 'BOTTOM' && inn >= 9 && diff <= 0) {
    prob += 0.05;
  }

  if (inn >= 9 && half === 'BOTTOM' && home > away) {
    return 1.0;
  }
  if (inn >= 9 && half === 'TOP' && away > home && outs === 3) {
    return 0.0;
  }

  return Math.max(0.01, Math.min(0.99, Math.round(prob * 100) / 100));
};

export const calculateLOB = (bases: Bases): number => {
  return (bases.first ? 1 : 0) + (bases.second ? 1 : 0) + (bases.third ? 1 : 0);
};
