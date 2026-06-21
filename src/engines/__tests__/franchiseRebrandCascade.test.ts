import { describe, expect, test } from 'vitest';

import {
  FAME_TUNING,
  applyTradeReset,
  type FameModelRecord,
} from '../fameModel';
import {
  REBRAND_BADGE_TYPES,
  REBRAND_RESET_MORALE,
  applyRebrandFameReset,
  buildRelocationMarker,
  selectRebrandDesignationRowsToClear,
  type RebrandBadgeType,
} from '../franchiseRebrandCascade';

interface FameRow extends FameModelRecord {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  playerId: string;
  updatedAt: string;
}

function fameRow(overrides: Partial<FameRow> = {}): FameRow {
  return {
    franchiseId: 'franchise-1',
    seasonId: 'season-1',
    statsScopeId: 'regular',
    playerId: 'player-1',
    heat: 24,
    reachFloor: 3,
    wasNegative: false,
    updatedAt: '2026-06-21T00:00:00.000Z',
    ...overrides,
  };
}

describe('franchiseRebrandCascade L14-2a pure transforms', () => {
  test('applyRebrandFameReset reuses the trade-style reset math and preserves row metadata', () => {
    const input = fameRow();
    const before = { ...input };

    const result = applyRebrandFameReset(input);
    const tradeReset = applyTradeReset(input);

    expect(result).toEqual({
      ...input,
      heat: tradeReset.heat,
      reachFloor: FAME_TUNING.tradeReset.reachFloorAfterTrade,
      wasNegative: tradeReset.wasNegative,
    });
    expect(result.heat).toBe(8.4);
    expect(result.playerId).toBe('player-1');
    expect(result.updatedAt).toBe('2026-06-21T00:00:00.000Z');
    expect(input).toEqual(before);
    expect(result).not.toBe(input);
  });

  test('applyRebrandFameReset carries wasNegative after cooling a negative row', () => {
    const input = fameRow({ heat: -12, reachFloor: 2, wasNegative: false });

    const result = applyRebrandFameReset(input);

    expect(result.heat).toBe(-4.2);
    expect(result.reachFloor).toBe(FAME_TUNING.tradeReset.reachFloorAfterTrade);
    expect(result.wasNegative).toBe(true);
    expect(input).toMatchObject({ heat: -12, reachFloor: 2, wasNegative: false });
  });

  test('selectRebrandDesignationRowsToClear returns exactly the four rebrand-cleared badge types', () => {
    const rows = [
      { id: 'mvp', type: 'TEAM_MVP', playerId: 'mvp-player' },
      { id: 'ace', type: 'ACE', playerId: 'ace-player' },
      { id: 'albatross', type: 'ALBATROSS', playerId: 'albatross-player' },
      { id: 'fan', type: 'FAN_FAVORITE', playerId: 'fan-player' },
      { id: 'fan-hopeful', type: 'FAN_HOPEFUL', playerId: 'hopeful-player' },
      { id: 'captain-sentinel', type: 'CAPTAIN', playerId: 'captain-player' },
    ] as const;

    const selected = selectRebrandDesignationRowsToClear(rows);

    expect(REBRAND_BADGE_TYPES).toEqual([
      'TEAM_MVP',
      'ACE',
      'ALBATROSS',
      'FAN_FAVORITE',
    ] satisfies RebrandBadgeType[]);
    expect(selected.map((row) => row.type)).toEqual(REBRAND_BADGE_TYPES);
    expect(selected.some((row) => row.type === 'FAN_HOPEFUL')).toBe(false);
    expect(selected.some((row) => row.type === 'CAPTAIN')).toBe(false);
  });

  test('buildRelocationMarker returns the L14-Q5 teamHistory append shape', () => {
    const marker = buildRelocationMarker({
      formerTeamName: 'Moose',
      formerStadiumName: 'Sakura Hills',
      relocatedAtSeason: 3,
      relocatedAtGame: 41,
    });

    expect(marker).toEqual({
      formerTeamName: 'Moose',
      formerStadiumName: 'Sakura Hills',
      relocatedAtSeason: 3,
      relocatedAtGame: 41,
    });
    expect(Object.keys(marker)).toEqual([
      'formerTeamName',
      'formerStadiumName',
      'relocatedAtSeason',
      'relocatedAtGame',
    ]);
  });

  test('re-exports the L14-1 morale reset constant for the impure orchestrator', () => {
    expect(REBRAND_RESET_MORALE).toBe(70);
  });
});
