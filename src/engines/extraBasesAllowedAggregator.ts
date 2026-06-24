// BUILD-DARK / derive-on-read: the OF-arm DENOMINATOR term; numerator (outfieldAssists+baserunnersHeld) already persists; no new field, no persist, no live wire (RA-2). SEASON-only (career parity deferred).

import type { AtBatEvent } from '../utils/eventLog';

type RunnerOutcome = NonNullable<AtBatEvent['runnerOutcomes']>[number];
export type OutfieldPosition = 'LF' | 'CF' | 'RF';

export interface ExtraBasesAllowedAggregate {
  extraBasesAllowed: number;
  // Most recent counted stamped OF position for this fielderId.
  position: OutfieldPosition;
}

export interface OutfieldArmRateInput {
  outfieldAssists?: number | null;
  baserunnersHeld?: number | null;
  extraBasesAllowed?: number | null;
}

const OUTFIELD_POSITIONS = new Set<string>(['LF', 'CF', 'RF']);

const BASE_INDEX = {
  batter: 0,
  first: 1,
  second: 2,
  third: 3,
  home: 4,
} as const satisfies Record<'batter' | 'first' | 'second' | 'third' | 'home', number>;

function isOutfieldPosition(position: unknown): position is OutfieldPosition {
  return typeof position === 'string' && OUTFIELD_POSITIONS.has(position);
}

function baseIndex(base: RunnerOutcome['fromBase'] | RunnerOutcome['toBase']): number | null {
  if (base in BASE_INDEX) {
    return BASE_INDEX[base as keyof typeof BASE_INDEX];
  }

  return null;
}

function finiteOrZero(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function didAllowExtraBase(outcome: RunnerOutcome): outcome is RunnerOutcome & {
  fielderId: string;
  fielderPosition: OutfieldPosition;
} {
  if (!isOutfieldPosition(outcome.fielderPosition) || !outcome.fielderId) {
    return false;
  }

  if (outcome.fromBase === 'batter') {
    return false;
  }

  if (outcome.heldByOf === true) {
    return false;
  }

  if (outcome.isOutAdvancing === true || outcome.toBase === 'out') {
    return false;
  }

  const fromIndex = baseIndex(outcome.fromBase);
  const toIndex = baseIndex(outcome.toBase);

  if (fromIndex === null || toIndex === null) {
    return false;
  }

  // §16 / RA-2 sim-tune: >=2-base 'extra base' threshold may over-count a routine 2nd->home on a single.
  return toIndex - fromIndex >= 2;
}

export function aggregateExtraBasesAllowed(
  atBats: AtBatEvent[],
): Record<string, ExtraBasesAllowedAggregate> {
  const aggregates: Record<string, ExtraBasesAllowedAggregate> = {};

  for (const atBat of atBats) {
    for (const outcome of atBat.runnerOutcomes ?? []) {
      if (!didAllowExtraBase(outcome)) {
        continue;
      }

      const aggregate = aggregates[outcome.fielderId] ??= {
        extraBasesAllowed: 0,
        position: outcome.fielderPosition,
      };

      aggregate.extraBasesAllowed += 1;
      aggregate.position = outcome.fielderPosition;
    }
  }

  return aggregates;
}

export function outfieldArmRate(input: OutfieldArmRateInput): number | null {
  const numerator = finiteOrZero(input.outfieldAssists) + finiteOrZero(input.baserunnersHeld);
  const denominator = numerator + finiteOrZero(input.extraBasesAllowed);

  return denominator === 0 ? null : numerator / denominator;
}
