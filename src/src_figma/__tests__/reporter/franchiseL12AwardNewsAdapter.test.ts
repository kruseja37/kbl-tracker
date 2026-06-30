import { describe, it, expect } from 'vitest';
import {
  buildFranchiseAwardSeasonNewsEvent,
  L12_NEWS_DRAMATIC_WEIGHT,
  type FranchiseHonorKind,
  type FranchiseHonorNewsInput,
} from '../../app/engines/reporter/franchiseL12AwardNewsAdapter';

const FRANCHISE_ID = 'franchise-1';
const SEASON_ID = 'season-4';
const SEASON_NUMBER = 4;

function awardInput(
  overrides: Partial<FranchiseHonorNewsInput> = {},
): FranchiseHonorNewsInput {
  return {
    franchiseId: FRANCHISE_ID,
    seasonId: SEASON_ID,
    seasonNumber: SEASON_NUMBER,
    honorKind: 'MVP',
    triggerPhase: 'season-end',
    subjectIds: ['player-mvp'],
    facts: {
      winnerId: 'player-mvp',
      winnerName: 'Marina Moon',
      honorKind: 'caller-value-must-not-win',
      triggerPhase: 'caller-value-must-not-win',
    },
    magnitude: 0.5,
    ...overrides,
  };
}

function build(overrides: Partial<FranchiseHonorNewsInput> = {}) {
  return buildFranchiseAwardSeasonNewsEvent(awardInput(overrides));
}

describe('buildFranchiseAwardSeasonNewsEvent', () => {
  it('maps an MVP season-end honor to AWARD_RESULT and preserves deterministic facts', () => {
    const input = awardInput();
    const result = buildFranchiseAwardSeasonNewsEvent(input);

    expect(result.eventType).toBe('AWARD_RESULT');
    expect(result.franchiseId).toBe(FRANCHISE_ID);
    expect(result.seasonId).toBe(SEASON_ID);
    expect(result.seasonNumber).toBe(SEASON_NUMBER);
    expect(result.subjectIds).toEqual(['player-mvp']);
    expect(result.subjectIds).not.toBe(input.subjectIds);
    expect(result.facts).toEqual({
      winnerId: 'player-mvp',
      winnerName: 'Marina Moon',
      honorKind: 'MVP',
      triggerPhase: 'season-end',
    });
    expect(result.dramaticWeight).toBeCloseTo(
      L12_NEWS_DRAMATIC_WEIGHT.base.MVP +
        L12_NEWS_DRAMATIC_WEIGHT.magnitudeScale * 0.5,
    );
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('createdAt');
  });

  it('maps a CY_YOUNG honor and uses the default magnitude when omitted', () => {
    const input = awardInput({
      honorKind: 'CY_YOUNG',
      subjectIds: ['pitcher-cy'],
      facts: { winnerId: 'pitcher-cy', pitchingWpa: 2.4 },
    });
    delete input.magnitude;

    const result = buildFranchiseAwardSeasonNewsEvent(input);

    expect(result.eventType).toBe('AWARD_RESULT');
    expect(result.subjectIds).toEqual(['pitcher-cy']);
    expect(result.facts).toEqual({
      winnerId: 'pitcher-cy',
      pitchingWpa: 2.4,
      honorKind: 'CY_YOUNG',
      triggerPhase: 'season-end',
    });
    expect(result.dramaticWeight).toBeCloseTo(
      L12_NEWS_DRAMATIC_WEIGHT.base.CY_YOUNG +
        L12_NEWS_DRAMATIC_WEIGHT.magnitudeScale * 0.4,
    );
  });

  it('maps an ALL_STAR all-star-lock honor and clamps magnitude above 1', () => {
    const result = build({
      honorKind: 'ALL_STAR',
      triggerPhase: 'all-star-lock',
      subjectIds: ['starter-1', 'reserve-1', 'wildcard-1'],
      facts: {
        rosterId: 'franchise-1:season-4:allstar',
        selectedCount: 26,
      },
      magnitude: 2,
    });

    expect(result.eventType).toBe('AWARD_RESULT');
    expect(result.subjectIds).toEqual([
      'starter-1',
      'reserve-1',
      'wildcard-1',
    ]);
    expect(result.facts).toEqual({
      rosterId: 'franchise-1:season-4:allstar',
      selectedCount: 26,
      honorKind: 'ALL_STAR',
      triggerPhase: 'all-star-lock',
    });
    expect(result.dramaticWeight).toBeCloseTo(
      L12_NEWS_DRAMATIC_WEIGHT.base.ALL_STAR +
        L12_NEWS_DRAMATIC_WEIGHT.magnitudeScale * 1,
    );
  });

  it.each([
    ['GOLD_GLOVE', 0.25],
    ['BOOGER_GLOVE', 0.75],
  ] satisfies Array<[FranchiseHonorKind, number]>)(
    'maps a %s season-end honor using its per-award dramatic weight',
    (honorKind, magnitude) => {
      const result = build({
        honorKind,
        subjectIds: [`winner-${honorKind.toLowerCase()}`],
        facts: { winnerId: `winner-${honorKind.toLowerCase()}` },
        magnitude,
      });

      expect(result.eventType).toBe('AWARD_RESULT');
      expect(result.facts.honorKind).toBe(honorKind);
      expect(result.dramaticWeight).toBeCloseTo(
        L12_NEWS_DRAMATIC_WEIGHT.base[honorKind] +
          L12_NEWS_DRAMATIC_WEIGHT.magnitudeScale * magnitude,
      );
    },
  );

  it('is deterministic: same input yields a deeply-equal SeasonNewsEvent', () => {
    const input = awardInput({
      facts: { winnerId: 'player-mvp', marginToRunnerUp: 0.12 },
    });

    const first = buildFranchiseAwardSeasonNewsEvent(input);
    const second = buildFranchiseAwardSeasonNewsEvent(input);

    expect(second).toEqual(first);
  });
});
