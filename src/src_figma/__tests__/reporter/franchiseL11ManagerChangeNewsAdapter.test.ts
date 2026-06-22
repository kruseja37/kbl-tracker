import { describe, it, expect } from 'vitest';
import type { ManagerFiredReason } from '../../../types/managerWpa';
import {
  buildFranchiseManagerChangeSeasonNewsEvent,
  L11_NEWS_DRAMATIC_WEIGHT,
  type FranchiseManagerChangeNewsInput,
} from '../../app/engines/reporter/franchiseL11ManagerChangeNewsAdapter';

const FRANCHISE_ID = 'franchise-1';
const SEASON_ID = 'season-1';
const SEASON_NUMBER = 4;

function managerChangeInput(
  overrides: Partial<FranchiseManagerChangeNewsInput> = {},
): FranchiseManagerChangeNewsInput {
  return {
    franchiseId: FRANCHISE_ID,
    seasonId: SEASON_ID,
    seasonNumber: SEASON_NUMBER,
    teamId: 'team-7',
    teamName: 'Moonstars',
    firedManagerId: 'manager-old',
    firedManagerName: 'Pat Pine',
    successorManagerId: 'manager-new',
    successorManagerName: 'Alex Ash',
    reason: 'user',
    endDate: '2026-06-19',
    teamFanMoraleAtFiring: 18,
    ...overrides,
  };
}

function build(overrides: Partial<FranchiseManagerChangeNewsInput> = {}) {
  return buildFranchiseManagerChangeSeasonNewsEvent(
    managerChangeInput(overrides),
  );
}

describe('buildFranchiseManagerChangeSeasonNewsEvent', () => {
  it('locks the returned SeasonNewsEvent key set and facts key set', () => {
    const result = build();

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
    expect(Object.keys(result.facts).sort()).toEqual(
      [
        'teamId',
        'teamName',
        'gmId',
        'gmName',
        'firedManagerId',
        'firedManagerName',
        'successorManagerId',
        'successorManagerName',
        'reason',
        'endReason',
        'endDate',
        'teamFanMoraleAtFiring',
      ].sort(),
    );
  });

  it("maps reason 'user' to MANAGER_CHANGE with fired endReason and negative framing", () => {
    const result = build({ reason: 'user' });

    expect(result.eventType).toBe('MANAGER_CHANGE');
    expect(result.facts.endReason).toBe('fired');
    expect(result.subjectIds).toEqual(['manager-old', 'manager-new']);
    expect(result.dramaticWeight).toBeGreaterThan(
      L11_NEWS_DRAMATIC_WEIGHT.base.neutral,
    );
  });

  it("maps reason 'auto-backstop' to fired endReason with the same negative framing", () => {
    const userResult = build({ reason: 'user' });
    const autoResult = build({ reason: 'auto-backstop' });

    expect(autoResult.eventType).toBe('MANAGER_CHANGE');
    expect(autoResult.facts.endReason).toBe('fired');
    expect(autoResult.dramaticWeight).toBe(userResult.dramaticWeight);
  });

  it("maps reason 'rebrand' to relocated endReason with lower neutral framing", () => {
    const teamFanMoraleAtFiring = 15;
    const firing = build({ reason: 'user', teamFanMoraleAtFiring });
    const relocation = build({ reason: 'rebrand', teamFanMoraleAtFiring });

    expect(relocation.facts.endReason).toBe('relocated');
    expect(relocation.dramaticWeight).toBeLessThan(firing.dramaticWeight);
  });

  it('passes through optional GM identity facts verbatim without defaulting them', () => {
    const withGm = build({ gmId: 'fr-1-gm', gmName: 'Casey Ledger' });
    const withoutGm = build();

    expect(withGm.facts.gmId).toBe('fr-1-gm');
    expect(withGm.facts.gmName).toBe('Casey Ledger');
    expect(withoutGm.facts.gmName).toBeUndefined();
  });

  it('increases dramaticWeight as team fan morale at firing drops', () => {
    const highMorale = build({ teamFanMoraleAtFiring: 45 });
    const lowMorale = build({ teamFanMoraleAtFiring: 10 });

    expect(lowMorale.dramaticWeight).toBeGreaterThan(
      highMorale.dramaticWeight,
    );
  });

  it('uses only the fired manager as subject when no successor manager id is present', () => {
    const input = managerChangeInput();
    delete input.successorManagerId;
    const result = buildFranchiseManagerChangeSeasonNewsEvent(input);

    expect(result.subjectIds).toEqual(['manager-old']);
  });

  it('is deterministic: same input yields a deeply-equal SeasonNewsEvent', () => {
    const input = managerChangeInput();
    const first = buildFranchiseManagerChangeSeasonNewsEvent(input);
    const second = buildFranchiseManagerChangeSeasonNewsEvent(input);

    expect(second).toEqual(first);
  });

  it('produces a dramaticWeight within [0, 1] at the clamp boundary', () => {
    const reasons: ManagerFiredReason[] = ['user', 'auto-backstop', 'rebrand'];

    for (const reason of reasons) {
      const { dramaticWeight } = build({
        reason,
        teamFanMoraleAtFiring: 0,
      });
      expect(typeof dramaticWeight).toBe('number');
      expect(Number.isFinite(dramaticWeight)).toBe(true);
      expect(dramaticWeight).toBeGreaterThanOrEqual(0);
      expect(dramaticWeight).toBeLessThanOrEqual(1);
    }
  });

  it('passes through franchise, season, and deterministic fact fields without fabricating timestamps', () => {
    const result = build();

    expect(result.franchiseId).toBe(FRANCHISE_ID);
    expect(result.seasonId).toBe(SEASON_ID);
    expect(result.seasonNumber).toBe(SEASON_NUMBER);
    expect(result.facts).toEqual({
      teamId: 'team-7',
      teamName: 'Moonstars',
      gmId: undefined,
      gmName: undefined,
      firedManagerId: 'manager-old',
      firedManagerName: 'Pat Pine',
      successorManagerId: 'manager-new',
      successorManagerName: 'Alex Ash',
      reason: 'user',
      endReason: 'fired',
      endDate: '2026-06-19',
      teamFanMoraleAtFiring: 18,
    });
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('createdAt');
    expect(result).not.toHaveProperty('timestamp');
  });
});
