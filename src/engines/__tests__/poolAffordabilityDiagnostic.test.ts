import { describe, expect, test } from 'vitest';

import {
  computePoolAffordabilityDiagnostic,
  type PoolAffordabilityPlayer,
} from '../poolAffordabilityDiagnostic';

function player(id: string, economicValue: number): PoolAffordabilityPlayer {
  return { id, economicValue };
}

describe('computePoolAffordabilityDiagnostic', () => {
  test('uses actual dollar IV/economic value instead of numeric quality score', () => {
    const diagnostic = computePoolAffordabilityDiagnostic({
      poolPlayers: [
        { id: 'low-quality-high-dollar', economicValue: 100_000, numericQuality: 1 },
        { id: 'high-quality-low-dollar', economicValue: 20_000, numericQuality: 99 },
      ] as unknown as PoolAffordabilityPlayer[],
      teamCount: 1,
      rosterSlotsPerTeam: 2,
      currentCapPerTeam: 120_000,
      minimumFillCost: 1_000,
    });

    expect(diagnostic.expectedDraftWindowValue).toBe(120_000);
    expect(diagnostic.draftedWindowIds).toEqual(['low-quality-high-dollar', 'high-quality-low-dollar']);
  });

  test('uses team count times roster slots as the expected drafted window, not the whole pool', () => {
    const basePlayers = [
      player('a', 100_000),
      player('b', 90_000),
      player('c', 80_000),
      player('d', 70_000),
    ];
    const withSlack = computePoolAffordabilityDiagnostic({
      poolPlayers: [...basePlayers, player('slack-a', 10_000), player('slack-b', 5_000)],
      teamCount: 2,
      rosterSlotsPerTeam: 2,
      currentCapPerTeam: 170_000,
      minimumFillCost: 1_000,
    });

    expect(withSlack.expectedDraftedCount).toBe(4);
    expect(withSlack.expectedDraftWindowValue).toBe(340_000);
    expect(withSlack.draftedWindowIds).toEqual(['a', 'b', 'c', 'd']);
  });

  test('is deterministic for repeated identical input', () => {
    const input = {
      poolPlayers: [player('b', 50_000), player('a', 50_000), player('c', 30_000)],
      teamCount: 1,
      rosterSlotsPerTeam: 2,
      currentCapPerTeam: 100_000,
      minimumFillCost: 1_000,
    };

    expect(computePoolAffordabilityDiagnostic(input)).toEqual(computePoolAffordabilityDiagnostic(input));
  });

  test('classifies cap as neutral near the recommendation', () => {
    const diagnostic = computePoolAffordabilityDiagnostic({
      poolPlayers: [player('a', 100_000), player('b', 80_000)],
      teamCount: 1,
      rosterSlotsPerTeam: 2,
      currentCapPerTeam: 180_000,
      minimumFillCost: 1_000,
    });

    expect(diagnostic.recommendedNeutralCapPerTeam).toBe(180_000);
    expect(diagnostic.affordabilityState).toBe('neutral');
    expect(diagnostic.reasonCodes).toContain('cap-near-neutral');
  });

  test('lower caps produce tight states', () => {
    const tooTight = computePoolAffordabilityDiagnostic({
      poolPlayers: [player('a', 100_000), player('b', 80_000)],
      teamCount: 1,
      rosterSlotsPerTeam: 2,
      currentCapPerTeam: 130_000,
      minimumFillCost: 1_000,
    });
    const bargainHeavy = computePoolAffordabilityDiagnostic({
      poolPlayers: [player('a', 100_000), player('b', 80_000)],
      teamCount: 1,
      rosterSlotsPerTeam: 2,
      currentCapPerTeam: 160_000,
      minimumFillCost: 1_000,
    });

    expect(tooTight.affordabilityState).toBe('too_tight');
    expect(bargainHeavy.affordabilityState).toBe('bargain_heavy');
  });

  test('higher caps produce loose states', () => {
    const inflationary = computePoolAffordabilityDiagnostic({
      poolPlayers: [player('a', 100_000), player('b', 80_000)],
      teamCount: 1,
      rosterSlotsPerTeam: 2,
      currentCapPerTeam: 210_000,
      minimumFillCost: 1_000,
    });
    const veryLoose = computePoolAffordabilityDiagnostic({
      poolPlayers: [player('a', 100_000), player('b', 80_000)],
      teamCount: 1,
      rosterSlotsPerTeam: 2,
      currentCapPerTeam: 230_000,
      minimumFillCost: 1_000,
    });

    expect(inflationary.affordabilityState).toBe('inflationary');
    expect(veryLoose.affordabilityState).toBe('very_loose');
  });

  test('respects the legal minimum fill floor', () => {
    const diagnostic = computePoolAffordabilityDiagnostic({
      poolPlayers: [player('a', 100), player('b', 100)],
      teamCount: 1,
      rosterSlotsPerTeam: 4,
      currentCapPerTeam: 4_000,
      minimumFillCost: 1_000,
    });

    expect(diagnostic.legalMinimumFillPerTeam).toBe(4_000);
    expect(diagnostic.recommendedNeutralCapPerTeam).toBeGreaterThanOrEqual(4_000);
    expect(diagnostic.reasonCodes).toContain('legal-fill-floor');
  });

  test('handles missing and invalid IV values conservatively', () => {
    const diagnostic = computePoolAffordabilityDiagnostic({
      poolPlayers: [
        { id: 'missing' },
        { id: 'zero', economicValue: 0 },
        { id: 'valid', economicValue: 10_000 },
      ],
      teamCount: 1,
      rosterSlotsPerTeam: 3,
      currentCapPerTeam: 12_000,
      minimumFillCost: 1_000,
    });

    expect(diagnostic.invalidValueCount).toBe(2);
    expect(diagnostic.expectedDraftWindowValue).toBe(12_000);
    expect(diagnostic.reasonCodes).toContain('invalid-values-discounted');
  });

  test('tie-breaks equal IV players by id', () => {
    const diagnostic = computePoolAffordabilityDiagnostic({
      poolPlayers: [player('z-last', 10_000), player('a-first', 10_000), player('m-middle', 10_000)],
      teamCount: 1,
      rosterSlotsPerTeam: 2,
      currentCapPerTeam: 20_000,
      minimumFillCost: 1_000,
    });

    expect(diagnostic.draftedWindowIds).toEqual(['a-first', 'm-middle']);
  });

  test('pool slack does not inflate the recommendation when it is outside the drafted window', () => {
    const baseInput = {
      poolPlayers: [player('a', 100_000), player('b', 90_000)],
      teamCount: 1,
      rosterSlotsPerTeam: 2,
      currentCapPerTeam: 190_000,
      minimumFillCost: 1_000,
    };
    const base = computePoolAffordabilityDiagnostic(baseInput);
    const withSlack = computePoolAffordabilityDiagnostic({
      ...baseInput,
      poolPlayers: [...baseInput.poolPlayers, player('slack-a', 5_000), player('slack-b', 4_000)],
    });

    expect(withSlack.poolSize).toBe(4);
    expect(withSlack.recommendedNeutralCapPerTeam).toBe(base.recommendedNeutralCapPerTeam);
  });

  test('star affordability guard keeps one top player plus minimum fill possible', () => {
    const diagnostic = computePoolAffordabilityDiagnostic({
      poolPlayers: [player('star', 200_000), player('cheap-a', 1_000), player('cheap-b', 1_000), player('cheap-c', 1_000)],
      teamCount: 2,
      rosterSlotsPerTeam: 2,
      currentCapPerTeam: 201_000,
      minimumFillCost: 1_000,
    });

    expect(diagnostic.starAffordabilityGuard).toBe(201_000);
    expect(diagnostic.recommendedNeutralCapPerTeam).toBeGreaterThanOrEqual(201_000);
    expect(diagnostic.reasonCodes).toContain('star-affordability-guard');
  });
});
