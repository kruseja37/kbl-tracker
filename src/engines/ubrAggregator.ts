// BUILD-DARK / compute-only: no persist, no rwar write, no mapBaserunningStats re-wire (deferred to RA-2); SEASON-derivable from persisted AtBatEvents.

import type { AtBatEvent } from '../utils/eventLog';
import type { AtBatResult } from '../types/game';
import {
  accumulateAdvancement,
  calculateUBR,
  classifyAdvancement,
  createBlankAdvancementStats,
  type AdvancementStats,
  type LeagueBaserunningStats,
  type RunnerAdvancement,
} from './rwarCalculator';

type RunnerOutcome = NonNullable<AtBatEvent['runnerOutcomes']>[number];
type UbrOnPlay = 'single' | 'double' | 'triple' | 'flyOut' | 'sacFly';

export interface UbrRunnerAggregate {
  advancementStats: AdvancementStats;
  ubr: number;
}

export const UBR_ON_PLAY_BY_RESULT = {
  '1B': 'single',
  '2B': 'double',
  '3B': 'triple',
  HR: null,
  ITPHR: null,
  BB: null,
  IBB: null,
  K: null,
  Kc: null,
  'Ꝁ': null,
  GO: null,
  FO: 'flyOut',
  FLO: null,
  LO: 'flyOut',
  PO: null,
  DP: null,
  TP: null,
  SF: 'sacFly',
  SAC: null,
  HBP: null,
  E: null,
  FC: null,
  D3K: null,
  WP_K: null,
  PB_K: null,
  GRD: 'double',
} satisfies Record<AtBatResult, UbrOnPlay | null>;

export const DEFAULT_UBR_LEAGUE_STATS: LeagueBaserunningStats = {
  runsPerGame: 4.8,
  totalSB: 200,
  totalCS: 60,
  totalSingles: 1500,
  totalWalks: 600,
  totalHBP: 80,
  totalIBB: 30,
  totalGIDP: 150,
  totalGIDPOpportunities: 1250,
  totalExtraBasesTaken: 300,
  totalAdvancementOpportunities: 1000,
};

function mapFromBase(fromBase: RunnerOutcome['fromBase']): RunnerAdvancement['fromBase'] | null {
  switch (fromBase) {
    case 'first':
      return '1B';
    case 'second':
      return '2B';
    case 'third':
      return '3B';
    case 'batter':
      return null;
  }
}

function mapToBase(toBase: RunnerOutcome['toBase']): RunnerAdvancement['toBase'] | null {
  switch (toBase) {
    case 'second':
      return '2B';
    case 'third':
      return '3B';
    case 'home':
      return 'HOME';
    case 'out':
      return 'OUT';
    case 'first':
    case 'end':
      return null;
  }
}

function advancementTypeFor(
  outcome: RunnerOutcome,
  fromBase: RunnerAdvancement['fromBase'],
  toBase: RunnerAdvancement['toBase'],
  onPlay: UbrOnPlay | null,
  result: AtBatResult,
): RunnerAdvancement['advancementType'] {
  if (outcome.isOutAdvancing === true || toBase === 'OUT') {
    return 'out';
  }

  if (outcome.heldByOf === true) {
    return 'held';
  }

  // GRD maps to "double" for the play label, but the dead-ball advance is forced:
  // no extra-base-running skill credit until RA-2 chooses a richer live treatment.
  const isForced = onPlay === null || result === 'GRD';

  return classifyAdvancement(fromBase, toBase, onPlay ?? '', isForced);
}

function isAutomaticHomeRunResult(result: AtBatResult): boolean {
  return result === 'HR' || result === 'ITPHR';
}

export function aggregateUbrFromEvents(
  atBats: AtBatEvent[],
  leagueStats: LeagueBaserunningStats = DEFAULT_UBR_LEAGUE_STATS,
): Record<string, UbrRunnerAggregate> {
  const statsByRunnerId: Record<string, AdvancementStats> = {};

  for (const atBat of atBats) {
    if (isAutomaticHomeRunResult(atBat.result)) {
      continue;
    }

    const onPlay = UBR_ON_PLAY_BY_RESULT[atBat.result];

    for (const outcome of atBat.runnerOutcomes ?? []) {
      const fromBase = mapFromBase(outcome.fromBase);
      const toBase = mapToBase(outcome.toBase);

      if (fromBase === null || toBase === null) {
        continue;
      }

      const advancementType = advancementTypeFor(outcome, fromBase, toBase, onPlay, atBat.result);
      const advancement: RunnerAdvancement = {
        runnerId: outcome.runnerId,
        fromBase,
        toBase,
        advancementType,
        onPlay: onPlay ?? '',
        couldHaveAdvanced: advancementType !== 'forced',
      };

      const runnerStats = statsByRunnerId[outcome.runnerId] ??= createBlankAdvancementStats();
      accumulateAdvancement(runnerStats, advancement);
    }
  }

  return Object.fromEntries(
    Object.entries(statsByRunnerId).map(([runnerId, advancementStats]) => [
      runnerId,
      {
        advancementStats,
        ubr: calculateUBR(advancementStats, leagueStats),
      },
    ]),
  );
}
