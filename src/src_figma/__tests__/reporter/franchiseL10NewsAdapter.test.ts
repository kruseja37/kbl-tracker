import { describe, it, expect } from 'vitest';
import type { FranchiseL10EventCandidate } from '../../../engines/franchiseL10EventEngine';
import {
  buildFranchiseL10SeasonNewsEvent,
  L10_NEWS_DRAMATIC_WEIGHT,
} from '../../app/engines/reporter/franchiseL10NewsAdapter';

function teamStadiumChangeEvent(
  overrides: Partial<FranchiseL10EventCandidate> = {},
): FranchiseL10EventCandidate {
  return {
    family: 'team',
    eventType: 'stadium_change',
    targetId: 'team-x',
    targetKind: 'team',
    valence: 'neutral',
    magnitude: 1,
    probability: 0.5,
    seed: 7,
    ...overrides,
  };
}

function playerHotStreakEvent(
  overrides: Partial<FranchiseL10EventCandidate> = {},
): FranchiseL10EventCandidate {
  return {
    family: 'performance',
    eventType: 'hot_streak',
    targetId: 'player-9',
    targetKind: 'player',
    valence: 'positive',
    magnitude: 1,
    probability: 0.4,
    seed: 3,
    ...overrides,
  };
}

const FRANCHISE_ID = 'franchise-1';
const SEASON_ID = 'season-1';
const SEASON_NUMBER = 4;

function build(event: FranchiseL10EventCandidate) {
  return buildFranchiseL10SeasonNewsEvent({
    event,
    franchiseId: FRANCHISE_ID,
    seasonId: SEASON_ID,
    seasonNumber: SEASON_NUMBER,
  });
}

describe('buildFranchiseL10SeasonNewsEvent', () => {
  it('maps every fired L10 event to eventType RANDOM_EVENT', () => {
    expect(build(teamStadiumChangeEvent()).eventType).toBe('RANDOM_EVENT');
    expect(build(playerHotStreakEvent()).eventType).toBe('RANDOM_EVENT');
  });

  it('sets subjectIds to a single-element array of the event targetId', () => {
    expect(build(teamStadiumChangeEvent()).subjectIds).toEqual(['team-x']);
    expect(build(playerHotStreakEvent()).subjectIds).toEqual(['player-9']);
  });

  it('carries the deterministic ground-truth fields in facts', () => {
    const result = build(playerHotStreakEvent());
    expect(result.facts).toEqual({
      family: 'performance',
      eventType: 'hot_streak',
      valence: 'positive',
      magnitude: 1,
      probability: 0.4,
      targetKind: 'player',
      targetId: 'player-9',
    });
  });

  it('passes through franchiseId, seasonId, and seasonNumber', () => {
    const result = build(teamStadiumChangeEvent());
    expect(result.franchiseId).toBe(FRANCHISE_ID);
    expect(result.seasonId).toBe(SEASON_ID);
    expect(result.seasonNumber).toBe(SEASON_NUMBER);
  });

  it('is deterministic: same input yields a deeply-equal SeasonNewsEvent', () => {
    const event = playerHotStreakEvent();
    const first = build(event);
    const second = build(event);
    expect(second).toEqual(first);
  });

  it('does not invent an id, createdAt, or any timestamp field on the result', () => {
    const result = build(teamStadiumChangeEvent());
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('createdAt');
    expect(result).not.toHaveProperty('timestamp');
    expect(Object.keys(result).sort()).toEqual(
      [
        'dramaticWeight',
        'eventType',
        'facts',
        'franchiseId',
        'seasonId',
        'seasonNumber',
        'subjectIds',
      ].sort(),
    );
  });

  it('produces a dramaticWeight that is a number within [0, 1] for several events', () => {
    const events: FranchiseL10EventCandidate[] = [
      teamStadiumChangeEvent(),
      playerHotStreakEvent(),
      playerHotStreakEvent({ valence: 'negative', magnitude: 3 }),
      teamStadiumChangeEvent({ valence: 'positive', magnitude: 100 }),
      playerHotStreakEvent({ valence: 'neutral', magnitude: 0 }),
    ];

    for (const event of events) {
      const { dramaticWeight } = build(event);
      expect(typeof dramaticWeight).toBe('number');
      expect(Number.isFinite(dramaticWeight)).toBe(true);
      expect(dramaticWeight).toBeGreaterThanOrEqual(0);
      expect(dramaticWeight).toBeLessThanOrEqual(1);
    }
  });

  it('weights negative and positive events at least as high as an otherwise-identical neutral event', () => {
    const base = playerHotStreakEvent({ magnitude: 1 });
    const neutral = build({ ...base, valence: 'neutral' }).dramaticWeight;
    const positive = build({ ...base, valence: 'positive' }).dramaticWeight;
    const negative = build({ ...base, valence: 'negative' }).dramaticWeight;

    expect(positive).toBeGreaterThanOrEqual(neutral);
    expect(negative).toBeGreaterThanOrEqual(neutral);
  });

  it('exposes conservative placeholder tuning constants', () => {
    expect(L10_NEWS_DRAMATIC_WEIGHT.base.neutral).toBeLessThanOrEqual(
      L10_NEWS_DRAMATIC_WEIGHT.base.positive,
    );
    expect(L10_NEWS_DRAMATIC_WEIGHT.base.positive).toBeLessThanOrEqual(
      L10_NEWS_DRAMATIC_WEIGHT.base.negative,
    );
    expect(L10_NEWS_DRAMATIC_WEIGHT.magnitudeScale).toBeGreaterThan(0);
  });
});
