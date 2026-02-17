import type { AtBatResult, Bases, RunnerOutcome, GameEvent } from '../../types/game';
import { isOut } from '../../types/game';

export type BaseKey = 'first' | 'second' | 'third';

export type RunnerOutcomes = {
  first: RunnerOutcome | null;
  second: RunnerOutcome | null;
  third: RunnerOutcome | null;
};

const walkForceResults: AtBatResult[] = ['BB', 'IBB', 'HBP'];

const isWalkForce = (result: AtBatResult): boolean => walkForceResults.includes(result);

export const isRunnerForced = (
  base: BaseKey,
  result: AtBatResult,
  bases: Bases,
  outs: number
): boolean => {
  const walkOrSpecialForce = isWalkForce(result) || (result === 'D3K' && (outs === 2 || !bases.first));

  if (walkOrSpecialForce) {
    if (base === 'first') return true;
    if (base === 'second') return Boolean(bases.first);
    return Boolean(bases.first && bases.second);
  }

  if (result === '1B') {
    return base === 'first';
  }

  if (result === '2B') {
    return base === 'first' || base === 'second';
  }

  if (result === '3B') {
    return true;
  }

  if (result === 'FC') {
    return base === 'first';
  }

  if (result === 'DP') {
    if (base === 'first') return true;
    if (base === 'second') return Boolean(bases.first);
    return Boolean(bases.first && bases.second);
  }

  return false;
};

export const getMinimumAdvancement = (
  base: BaseKey,
  result: AtBatResult,
  bases: Bases,
  outs: number
): 'second' | 'third' | 'home' | null => {
  if (!isRunnerForced(base, result, bases, outs)) return null;

  if (result === '2B') {
    if (base === 'first' || base === 'second') return 'third';
  }

  if (result === '3B') {
    return 'home';
  }

  if (base === 'first') return 'second';
  if (base === 'second') return 'third';
  return 'home';
};

export const outcomeToDestination = (outcome: RunnerOutcome): '2B' | '3B' | 'HOME' | null => {
  switch (outcome) {
    case 'TO_2B':
      return '2B';
    case 'TO_3B':
      return '3B';
    case 'SCORED':
      return 'HOME';
    default:
      return null;
  }
};

export const isExtraAdvancement = (
  base: BaseKey,
  outcome: RunnerOutcome,
  result: AtBatResult,
  bases: Bases,
  outs: number
): boolean => {
  const destination = outcomeToDestination(outcome);
  if (!destination) return false;

  if (['BB', 'IBB', 'HBP'].includes(result)) {
    if (base === 'first') {
      return destination !== '2B';
    }

    if (base === 'second') {
      if (isRunnerForced('second', result, bases, outs)) {
        return destination === 'HOME';
      }
      return true;
    }

    if (base === 'third') {
      if (isRunnerForced('third', result, bases, outs)) {
        return false;
      }
      return destination === 'HOME';
    }
  }

  if (['K', 'KL'].includes(result)) {
    return true;
  }

  if (result === '1B' && base === 'first' && destination === 'HOME') {
    return true;
  }

  return false;
};

export const getDefaultOutcome = (
  base: BaseKey,
  result: AtBatResult,
  bases: Bases,
  outs: number
): RunnerOutcome | null => {
  const minAdvance = getMinimumAdvancement(base, result, bases, outs);
  const forced = isRunnerForced(base, result, bases, outs);

  if (result === '2B') {
    if (base === 'third') return 'SCORED';
    if (base === 'second') return 'SCORED';
    if (base === 'first') return 'TO_3B';
  }

  if (result === '3B') {
    return 'SCORED';
  }

  if (result === '1B') {
    if (base === 'third') return 'SCORED';
    if (base === 'second') return 'TO_3B';
    if (base === 'first') return 'TO_2B';
  }

  if (result === 'HR') {
    return 'SCORED';
  }

  if (['BB', 'IBB', 'HBP'].includes(result)) {
    if (forced && minAdvance) {
      if (minAdvance === 'home') return 'SCORED';
      if (minAdvance === 'third') return 'TO_3B';
      if (minAdvance === 'second') return 'TO_2B';
    }
    return 'HELD';
  }

  if (['K', 'KL', 'D3K'].includes(result)) {
    return 'HELD';
  }

  if (result === 'GO') {
    return 'HELD';
  }

  if (['FO', 'LO', 'PO'].includes(result)) {
    if (base === 'third' && result === 'FO' && outs < 2) {
      return 'SCORED';
    }
    return 'HELD';
  }

  if (result === 'DP') {
    if (base === 'first') return 'OUT_2B';
    return 'HELD';
  }

  if (result === 'SF') {
    if (base === 'third') return 'SCORED';
    return 'HELD';
  }

  if (result === 'SAC') {
    if (base === 'first') return 'TO_2B';
    if (base === 'second') return 'TO_3B';
    return 'HELD';
  }

  if (result === 'FC') {
    if (base === 'first') return 'OUT_2B';
    return 'HELD';
  }

  if (result === 'E') {
    if (base === 'third') return 'SCORED';
    if (base === 'second') return 'TO_3B';
    if (base === 'first') return 'TO_2B';
  }

  if (isOut(result)) {
    return 'HELD';
  }

  return null;
};

export interface CalculateRBIsParams {
  result: AtBatResult;
  bases: Bases;
  runnerOutcomes: RunnerOutcomes;
  forceDoublePlay?: boolean;
}

export const calculateRBIs = ({
  result,
  bases,
  runnerOutcomes,
  forceDoublePlay,
}: CalculateRBIsParams): number => {
  let rbis = 0;

  if (runnerOutcomes.first === 'SCORED') rbis++;
  if (runnerOutcomes.second === 'SCORED') rbis++;
  if (runnerOutcomes.third === 'SCORED') rbis++;

  if (result === 'HR') {
    rbis = (bases.first ? 1 : 0) + (bases.second ? 1 : 0) + (bases.third ? 1 : 0) + 1;
  }

  if (result === 'E') {
    rbis = 0;
  }

  const forcePlayApplies = result === 'DP' && (forceDoublePlay ?? true);
  if (forcePlayApplies) {
    rbis = 0;
  }

  return rbis;
};

export type EventOutcomeValue = 'ADVANCE' | 'SCORE' | 'OUT';

export interface EventOutcomeOption {
  id: string;
  value: EventOutcomeValue;
  label: string;
  toBase?: 'second' | 'third' | 'home';
}

export const getEventOutcomes = (
  event: GameEvent,
  base: BaseKey,
  bases: Bases
): EventOutcomeOption[] => {
  if (!bases[base]) return [];

  if (event === 'CS' || event === 'PK') {
    return [{ id: 'OUT', value: 'OUT', label: 'Out' }];
  }

  if (event === 'SB' || event === 'WP' || event === 'PB') {
    const outcomes: EventOutcomeOption[] = [];

    if (base === 'third') {
      outcomes.push({ id: 'SCORE_HOME', value: 'SCORE', label: 'Scores', toBase: 'home' });
      if (event === 'SB') {
        outcomes.push({ id: 'OUT_HOME', value: 'OUT', label: 'Out at Home' });
      }
    }

    if (base === 'second') {
      outcomes.push({ id: 'ADVANCE_3B', value: 'ADVANCE', label: 'To 3rd', toBase: 'third' });
      outcomes.push({ id: 'SCORE_HOME', value: 'SCORE', label: 'Scores', toBase: 'home' });
      if (event === 'SB') {
        outcomes.push({ id: 'OUT', value: 'OUT', label: 'Out' });
      }
    }

    if (base === 'first') {
      outcomes.push({ id: 'ADVANCE_2B', value: 'ADVANCE', label: 'To 2nd', toBase: 'second' });
      outcomes.push({ id: 'ADVANCE_3B', value: 'ADVANCE', label: 'To 3rd', toBase: 'third' });
      if (event === 'SB') {
        outcomes.push({ id: 'OUT', value: 'OUT', label: 'Out' });
      }
    }

    return outcomes;
  }

  return [];
};
