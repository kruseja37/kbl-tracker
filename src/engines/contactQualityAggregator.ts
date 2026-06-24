// BUILD-DARK / PURE: RULED contact-quality measurement for RA-2CQ-1.
// Source refs: RATINGS_MEASUREMENT_WORKSHEET.md §3/§9; DECISIONS_LOG 2026-06-23 fork-sweep item 2;
// JK rulings 2026-06-23: rate shape, HARD-only good contact, hard PO neutral, FLO graded by contactType.

import type { AtBatResult } from '../types/game';

export type ContactQualityTag = 'hard' | 'normal' | 'weak' | 'bloop' | 'bunt';
export type ContactQualityClass = 'good' | 'neutral' | 'weak' | 'excluded';

export interface ContactQualityEvent {
  result: AtBatResult;
  contactType?: ContactQualityTag | null;
}

export interface ContactQualityKeyedEvent {
  key: string;
  result: AtBatResult;
  contactType?: ContactQualityTag | null;
}

export const DEFAULT_CONTACT_QUALITY_MIN_SAMPLE = 10;

export interface ContactQualityRateResult {
  rate: number | null;
  trackedCount: number;
  goodCount: number;
  neutralCount: number;
  weakCount: number;
}

const CONTACT_QUALITY_EXCLUDED_RESULTS: ReadonlySet<AtBatResult> = new Set([
  'K',
  'Kc',
  'Ꝁ',
  'D3K',
  'WP_K',
  'PB_K',
  'BB',
  'IBB',
  'HBP',
  'SAC',
]);

const CONTACT_QUALITY_TAGS: ReadonlySet<string> = new Set([
  'hard',
  'normal',
  'weak',
  'bloop',
  'bunt',
]);

function emptyRateResult(): ContactQualityRateResult {
  return {
    rate: null,
    trackedCount: 0,
    goodCount: 0,
    neutralCount: 0,
    weakCount: 0,
  };
}

function isMappableContactQualityTag(
  contactType: ContactQualityTag | null | undefined,
): contactType is ContactQualityTag {
  return typeof contactType === 'string' && CONTACT_QUALITY_TAGS.has(contactType);
}

export function extractContactQualityTag(exitType: string | null | undefined): ContactQualityTag | null {
  return typeof exitType === 'string' && CONTACT_QUALITY_TAGS.has(exitType)
    ? exitType as ContactQualityTag
    : null;
}

export function classifyContactQuality(
  contactType: ContactQualityTag | null | undefined,
  result: AtBatResult,
): ContactQualityClass {
  if (
    CONTACT_QUALITY_EXCLUDED_RESULTS.has(result)
    || !isMappableContactQualityTag(contactType)
    || contactType === 'bunt'
  ) {
    return 'excluded';
  }

  if (result === 'PO') {
    return contactType === 'hard' ? 'neutral' : 'weak';
  }

  if (result === 'FLO') {
    if (contactType === 'hard') {
      return 'good';
    }

    return contactType === 'normal' ? 'neutral' : 'weak';
  }

  if (contactType === 'hard') {
    return 'good';
  }

  return contactType === 'normal' ? 'neutral' : 'weak';
}

function aggregateContactQuality(
  events: ContactQualityEvent[],
  minSample: number,
  numeratorClass: 'good' | 'weak',
): ContactQualityRateResult {
  const aggregate = emptyRateResult();

  for (const event of events) {
    const contactQuality = classifyContactQuality(event.contactType, event.result);

    if (contactQuality === 'excluded') {
      continue;
    }

    aggregate.trackedCount += 1;

    if (contactQuality === 'good') {
      aggregate.goodCount += 1;
    } else if (contactQuality === 'neutral') {
      aggregate.neutralCount += 1;
    } else {
      aggregate.weakCount += 1;
    }
  }

  if (aggregate.trackedCount >= minSample) {
    const numerator = numeratorClass === 'good' ? aggregate.goodCount : aggregate.weakCount;
    aggregate.rate = numerator / aggregate.trackedCount;
  }

  return aggregate;
}

export function aggregateBatterContactQuality(
  events: ContactQualityEvent[],
  minSample = DEFAULT_CONTACT_QUALITY_MIN_SAMPLE,
): ContactQualityRateResult {
  return aggregateContactQuality(events, minSample, 'good');
}

export function aggregatePitcherWeakContact(
  events: ContactQualityEvent[],
  minSample = DEFAULT_CONTACT_QUALITY_MIN_SAMPLE,
): ContactQualityRateResult {
  return aggregateContactQuality(events, minSample, 'weak');
}

export function tallyContactQualityByPlayer(
  events: ContactQualityKeyedEvent[],
): Map<string, ContactQualityRateResult> {
  const tallies = new Map<string, ContactQualityRateResult>();

  for (const event of events) {
    const contactQuality = classifyContactQuality(event.contactType, event.result);
    if (contactQuality === 'excluded') {
      continue;
    }

    const aggregate = tallies.get(event.key) ?? emptyRateResult();
    aggregate.trackedCount += 1;

    if (contactQuality === 'good') {
      aggregate.goodCount += 1;
    } else if (contactQuality === 'neutral') {
      aggregate.neutralCount += 1;
    } else {
      aggregate.weakCount += 1;
    }

    tallies.set(event.key, aggregate);
  }

  return tallies;
}
