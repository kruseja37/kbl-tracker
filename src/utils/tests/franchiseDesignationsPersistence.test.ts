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
    seasonContext: {
      gamesPerTeam: 20,
      inningsPerGame: 9,
    },
    playerId: 'player-a',
    playerName: 'Player A',
    valuePosition: 'SS',
    currentTeamId: 'team-a',
    rosterStatus: 'MLB',
    salaryBaselineAvailable: true,
    teamSalaryBaseline: 100,
    seasonStatsAvailability: {
      any: true,
    },
    warInputAvailability: {
      any: true,
      pitchingWar: false,
    },
    warPreviewValues: {
      totalWar: 1,
      pitchingWar: null,
    },
    warConsumerTrust: {
      teamMvpDesignations: true,
      aceDesignations: false,
      fanFavoriteAlbatrossDesignations: false,
      blockers: [],
    },
    wpaInputAvailability: {
      archiveBacked: true,
    },
    parkFactorAvailability: {
      seedParkFactorsAvailable: true,
      parkAdjustedValueInputsAvailable: true,
    },
    limitations: [],
    ...overrides,
  };
}

function valueReport(rows: Array<Record<string, unknown>>, gamesPerTeam = 20) {
  return {
    contractVersion: 'test-value-input-contract',
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    seasonNumber: 1,
    seasonContext: {
      gamesPerTeam,
      inningsPerGame: 9,
    },
    rows,
    limitations: [],
  };
}

function queueValueInputReport(report: ReturnType<typeof valueReport>): void {
  mocks.buildFranchiseValueInputRows
    .mockResolvedValueOnce(report)
    .mockResolvedValueOnce(report);
}

function queueTrueValueRows(rows: Array<Record<string, unknown>>): void {
  mocks.getFranchiseTrueValueRows
    .mockResolvedValueOnce(rows)
    .mockResolvedValueOnce(rows);
}

describe('franchise projected designation storage', () => {
  beforeEach(async () => {
    resetFranchiseDesignationDatabaseForTests();
    await clearFranchiseDesignationDatabaseForTests();
    vi.clearAllMocks();
    mocks.getFranchiseTrueValueRows.mockResolvedValue([]);
  });

  test('round-trips projected rows and carryover metadata in the shared DB', async () => {
    const row = designation();

    await saveFranchiseDesignationRows([row]);

    expect(await getFranchiseDesignationRows(scope)).toEqual([row]);
    await expect(getFranchiseDesignationRow({ ...scope, teamId: 'team-a', type: 'FAN_FAVORITE' }))
      .resolves.toEqual(row);
  });

  test('recomputes after a completed game and clears stale rows when every holder falls below §17 floors', async () => {
    queueValueInputReport(valueReport([
      valueRow({ playerId: 'mvp', playerName: 'MVP', valuePosition: 'SS', warPreviewValues: { totalWar: 3.2, pitchingWar: null } }),
      valueRow({
        playerId: 'ace',
        playerName: 'Ace',
        valuePosition: 'SP',
        warPreviewValues: { totalWar: 1.1, pitchingWar: 1.1 },
        warInputAvailability: { any: true, pitchingWar: true },
        warConsumerTrust: {
          teamMvpDesignations: false,
          aceDesignations: true,
          fanFavoriteAlbatrossDesignations: false,
          blockers: [],
        },
      }),
      valueRow({ playerId: 'fan', playerName: 'Fan', valuePosition: 'CF', warPreviewValues: { totalWar: 0.8, pitchingWar: null } }),
      valueRow({
        playerId: 'alb',
        playerName: 'Alb',
        valuePosition: '1B',
        warPreviewValues: { totalWar: 0.2, pitchingWar: null },
        warConsumerTrust: {
          teamMvpDesignations: true,
          aceDesignations: false,
          fanFavoriteAlbatrossDesignations: true,
          blockers: [],
        },
      }),
    ]));
    mocks.getAllBattingStats.mockResolvedValueOnce([
      { playerId: 'mvp', games: 5 },
      { playerId: 'fan', games: 3 },
      { playerId: 'alb', games: 3 },
    ]);
    mocks.getAllPitchingStats.mockResolvedValueOnce([
      { playerId: 'ace', games: 4, pwar: 1.1 },
    ]);
    queueTrueValueRows([
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

    queueValueInputReport(valueReport([
      valueRow({ playerId: 'short', playerName: 'Short', valuePosition: 'SS', warPreviewValues: { totalWar: 9, pitchingWar: null } }),
    ]));
    mocks.getAllBattingStats.mockResolvedValueOnce([{ playerId: 'short', games: 1 }]);
    mocks.getAllPitchingStats.mockResolvedValueOnce([]);
    queueTrueValueRows([{ playerId: 'short', trueValue: 9, contractValue: 1, valueDelta: 8 }]);

    const second = await calculateAndPersistProjectedFranchiseDesignationsForSeason({
      ...scope,
      seasonNumber: 1,
    }, { calculatedAt: '2026-06-13T00:00:00.000Z' });

    expect(second.persisted).toBe(true);
    expect(second.rows).toEqual([]);
    expect(await getFranchiseDesignationRows(scope)).toEqual([]);
  });

  test('promotes exact trusted TEAM_MVP, ACE, and ALBATROSS holders to active while Fan Favorite stays projected', async () => {
    queueValueInputReport(valueReport([
      valueRow({ playerId: 'mvp', playerName: 'Trusted MVP', teamId: 'team-a', valuePosition: 'SS', currentTeamId: 'team-a', warPreviewValues: { totalWar: 3.2, pitchingWar: null } }),
      valueRow({
        playerId: 'ace',
        playerName: 'Trusted Ace',
        teamId: 'team-a',
        valuePosition: 'SP',
        currentTeamId: 'team-a',
        warPreviewValues: { totalWar: 0.8, pitchingWar: 1.3 },
        warInputAvailability: { any: true, pitchingWar: true },
        warConsumerTrust: {
          teamMvpDesignations: false,
          aceDesignations: true,
          fanFavoriteAlbatrossDesignations: false,
          blockers: [],
        },
      }),
      valueRow({ playerId: 'fan', playerName: 'Fan', teamId: 'team-a', valuePosition: 'CF', currentTeamId: 'team-a', warPreviewValues: { totalWar: 0.4, pitchingWar: null } }),
      valueRow({
        playerId: 'alb',
        playerName: 'Alb',
        teamId: 'team-a',
        valuePosition: '1B',
        currentTeamId: 'team-a',
        warPreviewValues: { totalWar: 0.2, pitchingWar: null },
        warConsumerTrust: {
          teamMvpDesignations: true,
          aceDesignations: false,
          fanFavoriteAlbatrossDesignations: true,
          blockers: [],
        },
      }),
      valueRow({
        playerId: 'untrusted-alb',
        playerName: 'Untrusted Alb',
        teamId: 'team-b',
        valuePosition: '1B',
        currentTeamId: 'team-b',
        warPreviewValues: { totalWar: 0.1, pitchingWar: null },
        warConsumerTrust: {
          teamMvpDesignations: false,
          aceDesignations: false,
          fanFavoriteAlbatrossDesignations: false,
          blockers: ['fixture trust blocker'],
        },
      }),
      valueRow({
        playerId: 'positive-alb',
        playerName: 'Positive Alb',
        teamId: 'team-d',
        valuePosition: '1B',
        currentTeamId: 'team-d',
        warPreviewValues: { totalWar: 0.1, pitchingWar: null },
        warConsumerTrust: {
          teamMvpDesignations: false,
          aceDesignations: false,
          fanFavoriteAlbatrossDesignations: true,
          blockers: [],
        },
      }),
      valueRow({
        playerId: 'untrusted-mvp',
        playerName: 'Untrusted MVP',
        teamId: 'team-b',
        valuePosition: 'SS',
        currentTeamId: 'team-b',
        warPreviewValues: { totalWar: 4.1, pitchingWar: null },
        warConsumerTrust: {
          teamMvpDesignations: false,
          aceDesignations: false,
          fanFavoriteAlbatrossDesignations: false,
          blockers: ['fixture trust blocker'],
        },
      }),
      valueRow({
        playerId: 'pitcher-mvp',
        playerName: 'Pitcher MVP',
        teamId: 'team-c',
        valuePosition: 'SP',
        currentTeamId: 'team-c',
        warPreviewValues: { totalWar: 5.2, pitchingWar: null },
      }),
      valueRow({
        playerId: 'position-runner-up',
        playerName: 'Position Runner Up',
        teamId: 'team-c',
        valuePosition: 'SS',
        currentTeamId: 'team-c',
        warPreviewValues: { totalWar: 4.8, pitchingWar: null },
      }),
    ]));
    mocks.getAllBattingStats.mockResolvedValueOnce([
      { playerId: 'mvp', games: 5 },
      { playerId: 'fan', games: 3 },
      { playerId: 'alb', games: 3 },
      { playerId: 'untrusted-alb', games: 3 },
      { playerId: 'positive-alb', games: 3 },
      { playerId: 'untrusted-mvp', games: 5 },
      { playerId: 'pitcher-mvp', games: 5 },
      { playerId: 'position-runner-up', games: 5 },
    ]);
    mocks.getAllPitchingStats.mockResolvedValueOnce([
      { playerId: 'ace', games: 4, pwar: 1.3 },
    ]);
    queueTrueValueRows([
      { playerId: 'mvp', trueValue: 8, contractValue: 8, valueDelta: null },
      { playerId: 'ace', trueValue: 8, contractValue: 8, valueDelta: null },
      { playerId: 'fan', trueValue: 10, contractValue: 2, valueDelta: 8 },
      { playerId: 'alb', trueValue: 2, contractValue: 11, valueDelta: -9 },
      { playerId: 'untrusted-alb', trueValue: 2, contractValue: 30, valueDelta: -28 },
      { playerId: 'positive-alb', trueValue: 18, contractValue: 10, valueDelta: 8 },
      { playerId: 'untrusted-mvp', trueValue: 9, contractValue: 9, valueDelta: null },
      { playerId: 'pitcher-mvp', trueValue: 9, contractValue: 9, valueDelta: null },
      { playerId: 'position-runner-up', trueValue: 8, contractValue: 8, valueDelta: null },
    ]);

    const result = await calculateAndPersistProjectedFranchiseDesignationsForSeason({
      ...scope,
      seasonNumber: 1,
    }, { calculatedAt: '2026-06-12T00:00:00.000Z' });

    const statusByTypeTeam = new Map(result.rows.map((row) => [`${row.type}:${row.teamId}`, row.status]));
    expect(statusByTypeTeam.get('TEAM_MVP:team-a')).toBe('active');
    expect(statusByTypeTeam.get('ACE:team-a')).toBe('active');
    expect(statusByTypeTeam.get('FAN_FAVORITE:team-a')).toBe('projected');
    expect(statusByTypeTeam.get('ALBATROSS:team-a')).toBe('active');
    expect(statusByTypeTeam.has('ALBATROSS:team-b')).toBe(false);
    expect(statusByTypeTeam.has('ALBATROSS:team-d')).toBe(false);
    expect(statusByTypeTeam.get('TEAM_MVP:team-b')).toBe('projected');
    expect(statusByTypeTeam.get('TEAM_MVP:team-c')).toBe('projected');
    expect(result.designationEvents.map((event) => [event.transition, event.designationType, event.playerId])).toEqual([
      ['granted', 'ACE', 'ace'],
      ['granted', 'ALBATROSS', 'alb'],
      ['granted', 'TEAM_MVP', 'mvp'],
    ]);
    expect(result.designationEvents.every((event) =>
      event.moraleMutationApplied === false &&
      event.relationshipMutationApplied === false &&
      event.salaryMovementApplied === false,
    )).toBe(true);
  });

  test('emits changed-only active designation events across recomputes', async () => {
    const firstReport = valueReport([
      valueRow({ playerId: 'mvp-a', playerName: 'MVP A', warPreviewValues: { totalWar: 3, pitchingWar: null } }),
      valueRow({ playerId: 'mvp-b', playerName: 'MVP B', warPreviewValues: { totalWar: 2, pitchingWar: null } }),
    ]);
    queueValueInputReport(firstReport);
    mocks.getAllBattingStats.mockResolvedValueOnce([
      { playerId: 'mvp-a', games: 5 },
      { playerId: 'mvp-b', games: 5 },
    ]);
    mocks.getAllPitchingStats.mockResolvedValueOnce([]);
    mocks.getFranchiseTrueValueRows.mockResolvedValueOnce([]);

    const first = await calculateAndPersistProjectedFranchiseDesignationsForSeason({
      ...scope,
      seasonNumber: 1,
    }, { calculatedAt: '2026-06-12T00:00:00.000Z' });
    expect(first.designationEvents.map((event) => [event.transition, event.playerId])).toEqual([
      ['granted', 'mvp-a'],
    ]);

    queueValueInputReport(firstReport);
    mocks.getAllBattingStats.mockResolvedValueOnce([
      { playerId: 'mvp-a', games: 5 },
      { playerId: 'mvp-b', games: 5 },
    ]);
    mocks.getAllPitchingStats.mockResolvedValueOnce([]);
    mocks.getFranchiseTrueValueRows.mockResolvedValueOnce([]);

    const second = await calculateAndPersistProjectedFranchiseDesignationsForSeason({
      ...scope,
      seasonNumber: 1,
    }, { calculatedAt: '2026-06-13T00:00:00.000Z' });
    expect(second.designationEvents).toEqual([]);

    queueValueInputReport(valueReport([
      valueRow({ playerId: 'mvp-a', playerName: 'MVP A', warPreviewValues: { totalWar: 3, pitchingWar: null } }),
      valueRow({ playerId: 'mvp-b', playerName: 'MVP B', warPreviewValues: { totalWar: 4, pitchingWar: null } }),
    ]));
    mocks.getAllBattingStats.mockResolvedValueOnce([
      { playerId: 'mvp-a', games: 5 },
      { playerId: 'mvp-b', games: 5 },
    ]);
    mocks.getAllPitchingStats.mockResolvedValueOnce([]);
    mocks.getFranchiseTrueValueRows.mockResolvedValueOnce([]);

    const third = await calculateAndPersistProjectedFranchiseDesignationsForSeason({
      ...scope,
      seasonNumber: 1,
    }, { calculatedAt: '2026-06-14T00:00:00.000Z' });
    expect(third.designationEvents).toEqual([
      expect.objectContaining({
        transition: 'changed',
        designationType: 'TEAM_MVP',
        playerId: 'mvp-b',
        previousPlayerId: 'mvp-a',
      }),
    ]);
  });

  test('surfaces non-canonical position labels as R-6 data defects', async () => {
    queueValueInputReport(valueReport([
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
    expect(combined).not.toMatch(/from '\.\/(fanMoraleEngine|fameEngine|teamMVP|fanFavoriteEngine)'/);
    expect(combined).not.toMatch(/\b(applyFranchiseMoraleEffect|calculateFame|applyFame|TEAM_MVP_FAME|fanFavoriteEngine)\b/);
    expect(combined).not.toMatch(new RegExp(['total', 'Games'].join('')));
  });
});
