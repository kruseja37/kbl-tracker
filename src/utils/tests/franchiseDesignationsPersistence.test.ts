import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  buildFranchiseValueInputRows: vi.fn(),
  getAllBattingStats: vi.fn(),
  getAllPitchingStats: vi.fn(),
  getFranchiseTrueValueRows: vi.fn(),
}));

vi.mock('../franchiseValueInputs', () => ({
  buildFranchiseValueInputRows: mocks.buildFranchiseValueInputRows,
}));

vi.mock('../seasonStorage', () => ({
  getAllBattingStats: mocks.getAllBattingStats,
  getAllPitchingStats: mocks.getAllPitchingStats,
}));

vi.mock('../franchiseTrueValueStorage', () => ({
  getFranchiseTrueValueRows: mocks.getFranchiseTrueValueRows,
}));

import {
  calculateAndPersistProjectedFranchiseDesignationsForSeason,
  clearFranchiseDesignationDatabaseForTests,
  getFranchiseDesignationRow,
  getFranchiseDesignationRows,
  replaceFranchiseDesignationRowsForScope,
  resetFranchiseDesignationDatabaseForTests,
  saveFranchiseDesignationRows,
} from '../franchiseDesignationStorage';
import type { FranchisePlayerDesignationRecord } from '../franchiseDesignations';

const scope = {
  franchiseId: 'franchise-a',
  seasonId: 'franchise-a-season-1',
  statsScopeId: 'franchise-a-season-1',
};

function designation(overrides: Partial<FranchisePlayerDesignationRecord> = {}): FranchisePlayerDesignationRecord {
  return {
    ...scope,
    seasonNumber: 1,
    teamId: 'team-a',
    playerId: 'player-a',
    playerName: 'Player A',
    type: 'FAN_FAVORITE',
    status: 'projected',
    sourceInputs: {
      valueDelta: 5,
    },
    sourceEvidence: ['MODE_2_CANON §17.3 fixture'],
    calculationVersion: 'test-designations',
    calculatedAt: '2026-06-12T00:00:00.000Z',
    lockedAt: null,
    carryover: {
      carriesOver: true,
      untilSeasonProgress: 0.1,
      previousSeasonId: 'franchise-a-season-0',
      previousPlayerId: 'player-a',
      note: 'fixture carryover metadata',
    },
    ...overrides,
  };
}

function valueRow(overrides: Record<string, unknown> = {}) {
  return {
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    seasonNumber: 1,
    playerId: 'player-a',
    playerName: 'Player A',
    valuePosition: 'SS',
    currentTeamId: 'team-a',
    rosterStatus: 'MLB',
    warPreviewValues: {
      totalWar: 1,
      pitchingWar: null,
    },
    ...overrides,
  };
}

function valueReport(rows: Array<Record<string, unknown>>, gamesPerTeam = 20) {
  return {
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    seasonNumber: 1,
    seasonContext: {
      gamesPerTeam,
    },
    rows,
  };
}

describe('franchise projected designation storage', () => {
  beforeEach(async () => {
    resetFranchiseDesignationDatabaseForTests();
    await clearFranchiseDesignationDatabaseForTests();
    vi.clearAllMocks();
  });

  test('round-trips projected rows and carryover metadata in the shared DB', async () => {
    const row = designation();

    await saveFranchiseDesignationRows([row]);

    expect(await getFranchiseDesignationRows(scope)).toEqual([row]);
    await expect(getFranchiseDesignationRow({ ...scope, teamId: 'team-a', type: 'FAN_FAVORITE' }))
      .resolves.toEqual(row);
  });

  test('recomputes after a completed game and clears stale rows when every holder falls below §17 floors', async () => {
    mocks.buildFranchiseValueInputRows.mockResolvedValueOnce(valueReport([
      valueRow({ playerId: 'mvp', playerName: 'MVP', valuePosition: 'SS', warPreviewValues: { totalWar: 3.2, pitchingWar: null } }),
      valueRow({ playerId: 'ace', playerName: 'Ace', valuePosition: 'SP', warPreviewValues: { totalWar: 1.1, pitchingWar: 1.1 } }),
      valueRow({ playerId: 'fan', playerName: 'Fan', valuePosition: 'CF', warPreviewValues: { totalWar: 0.8, pitchingWar: null } }),
      valueRow({ playerId: 'alb', playerName: 'Alb', valuePosition: '1B', warPreviewValues: { totalWar: 0.2, pitchingWar: null } }),
    ]));
    mocks.getAllBattingStats.mockResolvedValueOnce([
      { playerId: 'mvp', games: 5 },
      { playerId: 'fan', games: 3 },
      { playerId: 'alb', games: 3 },
    ]);
    mocks.getAllPitchingStats.mockResolvedValueOnce([
      { playerId: 'ace', games: 4, pwar: 1.1 },
    ]);
    mocks.getFranchiseTrueValueRows.mockResolvedValueOnce([
      { playerId: 'mvp', trueValue: 8, contractValue: 5, valueDelta: 3 },
      { playerId: 'ace', trueValue: 7, contractValue: 5, valueDelta: 2 },
      { playerId: 'fan', trueValue: 10, contractValue: 2, valueDelta: 8 },
      { playerId: 'alb', trueValue: 2, contractValue: 11, valueDelta: -9 },
    ]);

    const first = await calculateAndPersistProjectedFranchiseDesignationsForSeason({
      ...scope,
      seasonNumber: 1,
    }, { calculatedAt: '2026-06-12T00:00:00.000Z' });

    expect(first.persisted).toBe(true);
    expect(first.rows.map((row) => [row.type, row.playerId])).toEqual([
      ['TEAM_MVP', 'mvp'],
      ['ACE', 'ace'],
      ['FAN_FAVORITE', 'fan'],
      ['ALBATROSS', 'alb'],
    ]);
    expect(await getFranchiseDesignationRows(scope)).toHaveLength(4);

    mocks.buildFranchiseValueInputRows.mockResolvedValueOnce(valueReport([
      valueRow({ playerId: 'short', playerName: 'Short', valuePosition: 'SS', warPreviewValues: { totalWar: 9, pitchingWar: null } }),
    ]));
    mocks.getAllBattingStats.mockResolvedValueOnce([{ playerId: 'short', games: 1 }]);
    mocks.getAllPitchingStats.mockResolvedValueOnce([]);
    mocks.getFranchiseTrueValueRows.mockResolvedValueOnce([{ playerId: 'short', trueValue: 9, contractValue: 1, valueDelta: 8 }]);

    const second = await calculateAndPersistProjectedFranchiseDesignationsForSeason({
      ...scope,
      seasonNumber: 1,
    }, { calculatedAt: '2026-06-13T00:00:00.000Z' });

    expect(second.persisted).toBe(true);
    expect(second.rows).toEqual([]);
    expect(await getFranchiseDesignationRows(scope)).toEqual([]);
  });

  test('surfaces non-canonical position labels as R-6 data defects', async () => {
    mocks.buildFranchiseValueInputRows.mockResolvedValue(valueReport([
      valueRow({ playerId: 'bad-pos', valuePosition: 'P' }),
    ]));
    mocks.getAllBattingStats.mockResolvedValue([{ playerId: 'bad-pos', games: 5 }]);
    mocks.getAllPitchingStats.mockResolvedValue([{ playerId: 'bad-pos', games: 5, pwar: 1 }]);
    mocks.getFranchiseTrueValueRows.mockResolvedValue([{ playerId: 'bad-pos', trueValue: 8, contractValue: 5, valueDelta: 3 }]);

    const result = await calculateAndPersistProjectedFranchiseDesignationsForSeason({
      ...scope,
      seasonNumber: 1,
    });

    expect(result.persisted).toBe(true);
    expect(result.rows).toEqual([]);
    expect(result.skippedRows).toEqual([
      expect.objectContaining({
        playerId: 'bad-pos',
        reasons: [expect.stringContaining('P')],
      }),
    ]);
  });

  test('replace semantics remove old team/type winners in the same scope', async () => {
    await saveFranchiseDesignationRows([designation({ playerId: 'old-player' })]);
    await replaceFranchiseDesignationRowsForScope(scope, [
      designation({ playerId: 'new-player', playerName: 'New Player' }),
    ]);

    expect((await getFranchiseDesignationRows(scope)).map((row) => row.playerId)).toEqual(['new-player']);
  });

  test('keeps locked effects and aggregate season-total fallbacks out of the projected storage path', () => {
    const storageSource = readFileSync('src/utils/franchiseDesignationStorage.ts', 'utf8');
    const engineSource = readFileSync('src/utils/franchiseDesignations.ts', 'utf8');
    const combined = `${storageSource}\n${engineSource}`;

    const retiredMoraleEngine = ['fan', 'Morale', 'Engine'].join('');
    const retiredFavoriteEngine = ['fan', 'Favorite', 'Engine'].join('');
    const retiredApplyMorale = ['apply', 'Franchise', 'Morale', 'Effect'].join('');
    const retiredSavePlayer = ['save', 'Franchise', 'Player'].join('');
    const retiredAlbatrossMultiplier = ['FRANCHISE', 'ALBATROSS', 'TRADE', 'VALUE', 'MULTIPLIER'].join('_');
    const retiredTradeDiscountPhrase = ['trade', 'discount'].join(' ');
    expect(combined).not.toMatch(new RegExp(`${retiredMoraleEngine}|${retiredFavoriteEngine}|${retiredApplyMorale}|${retiredSavePlayer}|${retiredAlbatrossMultiplier}|${retiredTradeDiscountPhrase}`, 'i'));
    expect(combined).not.toMatch(new RegExp(['total', 'Games'].join('')));
  });
});
