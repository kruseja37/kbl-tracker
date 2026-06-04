import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import {
  buildFranchiseFanMoralePerformanceGapEffects,
  FRANCHISE_FAN_MORALE_PERFORMANCE_GAP_FORMULA_VERSION,
  type FranchiseFanMoralePerformanceGapInput,
} from '../franchiseFanMoralePerformanceGapFormula';

const scope = {
  franchiseId: 'franchise-1',
  seasonId: 'season-1',
  statsScopeId: 'season-1',
  seasonNumber: 1,
};

function input(overrides: Partial<FranchiseFanMoralePerformanceGapInput> = {}): FranchiseFanMoralePerformanceGapInput {
  return {
    ...scope,
    teamId: 'team-1',
    teamName: 'Alpha',
    baseline: {
      id: 'baseline-1',
      identityKey: 'baseline-key-1',
      storageVersion: 'franchise-expected-wins-baseline-storage-v1',
      expectedWinsPreviewContractVersion: 'franchise-expected-wins-preview-v1-readonly',
      trueValuePreviewContractVersion: 'franchise-true-value-preview-v1-readonly',
      ...scope,
      teamId: 'team-1',
      expectedWinsEstimate: 10,
      gamesPerTeam: 20,
      status: 'preview-only',
    },
    actualWins: 7,
    actualLosses: 3,
    ...overrides,
  };
}

describe('franchise fan morale performance-gap formula', () => {
  test('gap at plus four produces a plus two team fan morale effect', () => {
    const result = buildFranchiseFanMoralePerformanceGapEffects(input({
      actualWins: 9,
      actualLosses: 1,
    }));

    expect(result.formulaVersion).toBe(FRANCHISE_FAN_MORALE_PERFORMANCE_GAP_FORMULA_VERSION);
    expect(result.effects[0]).toMatchObject({
      teamId: 'team-1',
      band: 'over-plus-4',
      delta: 2,
      expectedWinsToDate: 5,
      performanceGap: 4,
      gamesPlayed: 10,
    });
  });

  test('gap at plus two produces a plus one team fan morale effect', () => {
    const result = buildFranchiseFanMoralePerformanceGapEffects(input({
      actualWins: 7,
      actualLosses: 3,
    }));

    expect(result.effects[0]).toMatchObject({
      band: 'over-plus-2',
      delta: 1,
      performanceGap: 2,
    });
  });

  test('gap at minus two produces a minus one team fan morale effect', () => {
    const result = buildFranchiseFanMoralePerformanceGapEffects(input({
      actualWins: 3,
      actualLosses: 7,
    }));

    expect(result.effects[0]).toMatchObject({
      band: 'under-minus-2',
      delta: -1,
      performanceGap: -2,
    });
  });

  test('gap at minus four produces a minus two team fan morale effect', () => {
    const result = buildFranchiseFanMoralePerformanceGapEffects(input({
      actualWins: 1,
      actualLosses: 9,
    }));

    expect(result.effects[0]).toMatchObject({
      band: 'under-minus-4',
      delta: -2,
      performanceGap: -4,
    });
  });

  test('below-threshold gap produces no effect with a blocker', () => {
    const result = buildFranchiseFanMoralePerformanceGapEffects(input({
      actualWins: 6,
      actualLosses: 4,
    }));

    expect(result.effects).toEqual([]);
    expect(result.blockers.join(' ')).toMatch(/below the \+\/-2 game v1 fan morale prompt threshold/i);
  });

  test('missing and mismatched scope blocks performance-gap prompts', () => {
    const missing = buildFranchiseFanMoralePerformanceGapEffects(input({
      franchiseId: '',
      seasonId: '',
      statsScopeId: '',
      seasonNumber: 0,
    }));
    const mismatched = buildFranchiseFanMoralePerformanceGapEffects(input({
      baseline: {
        ...input().baseline!,
        franchiseId: 'other-franchise',
      },
    }));

    expect(missing.effects).toEqual([]);
    expect(missing.blockers.join(' ')).toMatch(/Explicit franchise, season, stats scope/i);
    expect(mismatched.effects).toEqual([]);
    expect(mismatched.blockers.join(' ')).toMatch(/baseline scope must exactly match/i);
  });

  test('missing baseline missing games-per-team blank team id and invalid records block', () => {
    const missingBaseline = buildFranchiseFanMoralePerformanceGapEffects(input({ baseline: null }));
    const missingGames = buildFranchiseFanMoralePerformanceGapEffects(input({
      baseline: {
        ...input().baseline!,
        gamesPerTeam: null,
      },
    }));
    const blankTeam = buildFranchiseFanMoralePerformanceGapEffects(input({ teamId: '   ' }));
    const invalidRecord = buildFranchiseFanMoralePerformanceGapEffects(input({
      actualWins: 11,
      actualLosses: undefined,
      gamesPlayed: 10,
    }));

    expect(missingBaseline.blockers.join(' ')).toMatch(/baseline snapshot is required/i);
    expect(missingGames.blockers.join(' ')).toMatch(/games-per-team metadata is required/i);
    expect(blankTeam.blockers.join(' ')).toMatch(/non-empty team id/i);
    expect(invalidRecord.blockers.join(' ')).toMatch(/Actual wins cannot exceed games played/i);
  });

  test('formula imports no storage or mutation APIs', () => {
    const source = readFileSync('src/utils/franchiseFanMoralePerformanceGapFormula.ts', 'utf8');

    expect(source).not.toMatch(/from '\.\/(franchiseMoraleState|franchiseRandomEventLogStorage|syncEngine|franchiseExpectedWinsBaselineStorage)'/);
    expect(source).not.toMatch(/save|persist|upsert|applyFranchiseMoraleEffect|confirmFranchiseRandomEvent/i);
  });
});
