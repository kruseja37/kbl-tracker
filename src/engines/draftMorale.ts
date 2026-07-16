import type { HiddenModifiers } from '../types/game';
import {
  applyPersonalityToSelfMoraleDelta,
  clampMorale,
} from './masterMoraleMatrix';

export type DraftSlotClass = 'early' | 'middle' | 'late';
export type DraftPayClass = 'above' | 'within' | 'below';

export interface DraftMoraleInput {
  slotClass: DraftSlotClass;
  payClass: DraftPayClass;
  personality: string | undefined;
  modifiers: HiddenModifiers;
}

export interface DraftMoraleResult {
  startingMorale: number;
  slotBase: number;
  payBase: number;
  totalDelta: number;
}

export const DRAFT_MORALE_TUNING = {
  slotBoost: 15, // RB-16 sim-tune §11/§13
  slotPenalty: -15, // RB-16 sim-tune §11/§13
  payBoost: 10, // RB-16 sim-tune §11/§13
  payPenalty: -10, // RB-16 sim-tune §11/§13
  neutralMorale: 50, // RB-16 sim-tune §11/§13
} as const;

export function classifyDraftSlot(orderIndex: number, totalWon: number): DraftSlotClass {
  if (!Number.isFinite(orderIndex) || !Number.isFinite(totalWon)) return 'middle';

  const wonCount = Math.trunc(totalWon);
  const index = Math.trunc(orderIndex);

  if (wonCount <= 1 || index < 0 || index >= wonCount) return 'middle';

  const endBucketSize = Math.max(1, Math.floor(wonCount / 3));
  if (index < endBucketSize) return 'early';
  if (index >= wonCount - endBucketSize) return 'late';
  return 'middle';
}

export function classifyDraftPay(
  winningBid: number,
  range: { low: number; high: number },
): DraftPayClass {
  if (!Number.isFinite(winningBid) || !Number.isFinite(range.low) || !Number.isFinite(range.high)) {
    return 'within';
  }

  const low = Math.min(range.low, range.high);
  const high = Math.max(range.low, range.high);

  if (winningBid > high) return 'above';
  if (winningBid < low) return 'below';
  return 'within';
}

export function computeDraftMorale(input: DraftMoraleInput): DraftMoraleResult {
  const slotBase = getSlotBase(input.slotClass);
  const payBase = getPayBase(input.payClass);
  const baseDelta = slotBase + payBase;
  const totalDelta = applyPersonalityToSelfMoraleDelta(
    baseDelta,
    input.personality,
    input.modifiers,
  );

  return {
    startingMorale: clampMorale(DRAFT_MORALE_TUNING.neutralMorale + totalDelta),
    slotBase,
    payBase,
    totalDelta,
  };
}

export function computeDraftMoraleFromRaw(
  orderIndex: number,
  totalWon: number,
  winningBid: number,
  range: { low: number; high: number },
  personality: string | undefined,
  modifiers: HiddenModifiers,
  payClassOverride?: DraftPayClass,
  slotClassOverride?: DraftSlotClass,
): DraftMoraleResult {
  return computeDraftMorale({
    slotClass: slotClassOverride ?? classifyDraftSlot(orderIndex, totalWon),
    payClass: payClassOverride ?? classifyDraftPay(winningBid, range),
    personality,
    modifiers,
  });
}

function getSlotBase(slotClass: DraftSlotClass): number {
  switch (slotClass) {
    case 'early':
      return DRAFT_MORALE_TUNING.slotBoost;
    case 'late':
      return DRAFT_MORALE_TUNING.slotPenalty;
    case 'middle':
      return 0;
  }
}

function getPayBase(payClass: DraftPayClass): number {
  switch (payClass) {
    case 'above':
      return DRAFT_MORALE_TUNING.payBoost;
    case 'below':
      return DRAFT_MORALE_TUNING.payPenalty;
    case 'within':
      return 0;
  }
}
