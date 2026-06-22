import { describe, expect, test } from 'vitest';

import { computeDraftMoraleFromRaw } from '../draftMorale';
import {
  computeDraftFreeze,
  type DraftFreezePlayerInput,
  type DraftFreezeResult,
} from '../draftFreeze';
import type { HiddenModifiers } from '../../types/game';

const neutralModifiers: HiddenModifiers = {
  loyalty: 50,
  ambition: 50,
  resilience: 50,
  charisma: 50,
};

function player(
  overrides: Partial<DraftFreezePlayerInput> & Pick<DraftFreezePlayerInput, 'playerId' | 'teamId' | 'tier'>,
): DraftFreezePlayerInput {
  return {
    settledSalary: 100,
    scoutRange: { low: 90, high: 110 },
    personality: 'Competitive',
    modifiers: neutralModifiers,
    ...overrides,
  };
}

function playerById(result: DraftFreezeResult, playerId: string) {
  const match = result.players.find((row) => row.playerId === playerId);
  expect(match).toBeDefined();
  return match!;
}

function teamById(result: DraftFreezeResult, teamId: string) {
  const match = result.teams.find((row) => row.teamId === teamId);
  expect(match).toBeDefined();
  return match!;
}

describe('draftFreeze RB-7a pure freeze bridge', () => {
  test('computes won index and total within tier while preserving interleaved input order', () => {
    const result = computeDraftFreeze([
      player({ playerId: 'mlb-early', teamId: 'alpha', tier: 'MLB' }),
      player({ playerId: 'farm-early', teamId: 'beta', tier: 'FARM' }),
      player({ playerId: 'mlb-middle', teamId: 'beta', tier: 'MLB' }),
      player({ playerId: 'farm-middle', teamId: 'alpha', tier: 'FARM' }),
      player({ playerId: 'mlb-late', teamId: 'gamma', tier: 'MLB' }),
      player({ playerId: 'farm-late', teamId: 'gamma', tier: 'FARM' }),
    ]);

    expect(playerById(result, 'mlb-early')).toMatchObject({
      wonOrderIndex: 0,
      totalWonInTier: 3,
      slotClass: 'early',
    });
    expect(playerById(result, 'mlb-middle')).toMatchObject({
      wonOrderIndex: 1,
      totalWonInTier: 3,
      slotClass: 'middle',
    });
    expect(playerById(result, 'mlb-late')).toMatchObject({
      wonOrderIndex: 2,
      totalWonInTier: 3,
      slotClass: 'late',
    });
    expect(playerById(result, 'farm-early')).toMatchObject({
      wonOrderIndex: 0,
      totalWonInTier: 3,
      slotClass: 'early',
    });
    expect(playerById(result, 'farm-middle')).toMatchObject({
      wonOrderIndex: 1,
      totalWonInTier: 3,
      slotClass: 'middle',
    });
    expect(playerById(result, 'farm-late')).toMatchObject({
      wonOrderIndex: 2,
      totalWonInTier: 3,
      slotClass: 'late',
    });
  });

  test('early won order gives higher starting morale than late won order for the same inputs', () => {
    const early = computeDraftFreeze([
      player({ playerId: 'target', teamId: 'alpha', tier: 'MLB' }),
      player({ playerId: 'filler-1', teamId: 'beta', tier: 'MLB' }),
      player({ playerId: 'filler-2', teamId: 'gamma', tier: 'MLB' }),
    ]);
    const late = computeDraftFreeze([
      player({ playerId: 'filler-1', teamId: 'beta', tier: 'MLB' }),
      player({ playerId: 'filler-2', teamId: 'gamma', tier: 'MLB' }),
      player({ playerId: 'target', teamId: 'alpha', tier: 'MLB' }),
    ]);

    expect(playerById(early, 'target').startingMorale)
      .toBeGreaterThan(playerById(late, 'target').startingMorale);
  });

  test('passes settledSalary through unchanged', () => {
    const result = computeDraftFreeze([
      player({
        playerId: 'salary-check',
        teamId: 'alpha',
        tier: 'MLB',
        settledSalary: 123.45,
      }),
    ]);

    expect(playerById(result, 'salary-check').settledSalary).toBe(123.45);
  });

  test('fan morale payroll defaults to MLB bids only and can include farm bids by option', () => {
    const inputs = [
      player({ playerId: 'high-mlb', teamId: 'high', tier: 'MLB', settledSalary: 600 }),
      player({ playerId: 'median-mlb', teamId: 'median', tier: 'MLB', settledSalary: 300 }),
      player({ playerId: 'farm-only', teamId: 'farm-heavy', tier: 'FARM', settledSalary: 900 }),
    ];
    const defaultScope = computeDraftFreeze(inputs);
    const farmIncluded = computeDraftFreeze(inputs, { fanMoralePayrollScope: 'mlb+farm' });

    expect(teamById(defaultScope, 'high').payroll).toBe(600);
    expect(teamById(defaultScope, 'median').payroll).toBe(300);
    expect(teamById(defaultScope, 'farm-heavy').payroll).toBe(0);
    expect(teamById(defaultScope, 'high').startingFanMorale)
      .toBeLessThan(teamById(defaultScope, 'median').startingFanMorale);

    expect(teamById(farmIncluded, 'farm-heavy').payroll).toBe(900);
    expect(teamById(farmIncluded, 'farm-heavy').startingFanMorale)
      .toBeLessThan(teamById(farmIncluded, 'median').startingFanMorale);
  });

  test('player starting morale equals the raw draft morale engine for identical args', () => {
    const input = player({
      playerId: 'morale-check',
      teamId: 'alpha',
      tier: 'MLB',
      settledSalary: 80,
      scoutRange: { low: 90, high: 110 },
      personality: 'Relaxed',
    });
    const result = computeDraftFreeze([
      input,
      player({ playerId: 'filler-1', teamId: 'beta', tier: 'MLB' }),
      player({ playerId: 'filler-2', teamId: 'gamma', tier: 'MLB' }),
    ]);
    const row = playerById(result, 'morale-check');
    const direct = computeDraftMoraleFromRaw(
      row.wonOrderIndex,
      row.totalWonInTier,
      input.settledSalary,
      input.scoutRange,
      input.personality,
      input.modifiers,
    );

    expect(row.startingMorale).toBe(direct.startingMorale);
    expect(row.morale).toEqual(direct);
  });

  test('empty input returns empty player and team result arrays', () => {
    expect(computeDraftFreeze([])).toEqual({ players: [], teams: [] });
  });
});
