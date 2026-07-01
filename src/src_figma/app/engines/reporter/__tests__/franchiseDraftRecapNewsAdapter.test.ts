import { describe, expect, it } from 'vitest';
import {
  buildFranchiseDraftRecapSeasonNewsEvent,
  type FranchiseDraftRecapNewsInput,
} from '../franchiseDraftRecapNewsAdapter';

const FRANCHISE_ID = 'franchise-1';
const SEASON_ID = 'season-1';
const SEASON_NUMBER = 1;

function draftRecapInput(
  overrides: Partial<FranchiseDraftRecapNewsInput> = {},
): FranchiseDraftRecapNewsInput {
  return {
    franchiseId: FRANCHISE_ID,
    seasonId: SEASON_ID,
    seasonNumber: SEASON_NUMBER,
    facts: { biggestSigning: 'X', totalSpend: 1000 },
    ...overrides,
  };
}

describe('buildFranchiseDraftRecapSeasonNewsEvent', () => {
  it('maps deterministic draft facts to OFFSEASON_NEWS with recapKind DRAFT', () => {
    const result = buildFranchiseDraftRecapSeasonNewsEvent(draftRecapInput());

    expect(result.eventType).toBe('OFFSEASON_NEWS');
    expect(result.facts.recapKind).toBe('DRAFT');
    expect(result.facts.biggestSigning).toBe('X');
    expect(result.facts.totalSpend).toBe(1000);
    expect(result.dramaticWeight).toBeGreaterThanOrEqual(0);
    expect(result.dramaticWeight).toBeLessThanOrEqual(1);
  });

  it('increases dramaticWeight for higher magnitude until clamped', () => {
    const low = buildFranchiseDraftRecapSeasonNewsEvent(
      draftRecapInput({ magnitude: 0 }),
    );
    const high = buildFranchiseDraftRecapSeasonNewsEvent(
      draftRecapInput({ magnitude: 1 }),
    );

    expect(high.dramaticWeight).toBeGreaterThan(low.dramaticWeight);
    expect(high.dramaticWeight).toBeLessThanOrEqual(1);
  });

  it('defaults subjectIds to an empty array', () => {
    const result = buildFranchiseDraftRecapSeasonNewsEvent(draftRecapInput());

    expect(result.subjectIds).toEqual([]);
  });

  it('copies provided subjectIds instead of aliasing input', () => {
    const subjectIds = ['player-1', 'player-2'];
    const result = buildFranchiseDraftRecapSeasonNewsEvent(
      draftRecapInput({ subjectIds }),
    );

    expect(result.subjectIds).toEqual(subjectIds);
    expect(result.subjectIds).not.toBe(subjectIds);

    subjectIds.push('player-3');
    expect(result.subjectIds).toEqual(['player-1', 'player-2']);
  });

  it('adds recapKind without clobbering other input facts', () => {
    const result = buildFranchiseDraftRecapSeasonNewsEvent(
      draftRecapInput({
        facts: { biggestSigning: 'X', totalSpend: 1000, recapKind: 'INPUT' },
      }),
    );

    expect(result.facts).toMatchObject({
      biggestSigning: 'X',
      totalSpend: 1000,
      recapKind: 'DRAFT',
    });
  });
});
