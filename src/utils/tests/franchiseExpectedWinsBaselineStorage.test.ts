import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

import {
  buildFranchiseExpectedWinsPreviewReport,
  FRANCHISE_EXPECTED_WINS_PREVIEW_CONTRACT_VERSION,
  type FranchiseExpectedWinsPreviewReport,
} from '../franchiseExpectedWinsPreview';
import {
  clearFranchiseExpectedWinsBaselineDatabaseForTests,
  getLatestFranchiseExpectedWinsBaselineSnapshotForTeam,
  listFranchiseExpectedWinsBaselineSnapshots,
  resetFranchiseExpectedWinsBaselineDatabaseForTests,
  upsertFranchiseExpectedWinsBaselineSnapshotsFromPreview,
} from '../franchiseExpectedWinsBaselineStorage';
import {
  FRANCHISE_TRUE_VALUE_PREVIEW_CONTRACT_VERSION,
  type FranchiseTrueValuePreviewReport,
  type FranchiseTrueValuePreviewTeamSummary,
} from '../franchiseTrueValuePreview';
import { FRANCHISE_VALUE_INPUT_CONTRACT_VERSION } from '../franchiseValueInputs';

function teamSummary(overrides: Partial<FranchiseTrueValuePreviewTeamSummary> = {}): FranchiseTrueValuePreviewTeamSummary {
  return {
    contractVersion: FRANCHISE_TRUE_VALUE_PREVIEW_CONTRACT_VERSION,
    franchiseId: 'franchise-1',
    seasonId: 'season-1',
    statsScopeId: 'season-1',
    seasonNumber: 1,
    teamId: 'team-1',
    previewPlayerCount: 2,
    blockedPlayerCount: 0,
    salaryTotal: 10,
    previewValueEstimateTotal: 10,
    valueDeltaEstimateTotal: 0,
    status: 'preview-only',
    expectedWinsTrusted: false,
    valueDeltaTrustedForDesignations: false,
    salaryMovementAllowed: false,
    limitations: ['Team summary is preview-only.'],
    ...overrides,
  };
}

function trueValueReport(overrides: Partial<FranchiseTrueValuePreviewReport> = {}): FranchiseTrueValuePreviewReport {
  return {
    contractVersion: FRANCHISE_TRUE_VALUE_PREVIEW_CONTRACT_VERSION,
    generatedAt: 100,
    franchiseId: 'franchise-1',
    seasonId: 'season-1',
    statsScopeId: 'season-1',
    seasonNumber: 1,
    sourceContractVersion: FRANCHISE_VALUE_INPUT_CONTRACT_VERSION,
    seasonContext: {
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
      gamesPerTeam: 24,
      inningsPerGame: 6,
      seasonLengthSource: 'stored-franchise-config',
      scheduleRowCount: 0,
      scheduleRowsUsedAsSeasonLength: false,
      seasonMetadataTotalGames: 0,
    },
    playerRows: [],
    teamSummaries: [
      teamSummary({ teamId: 'team-high', previewValueEstimateTotal: 30 }),
      teamSummary({ teamId: 'team-low', previewValueEstimateTotal: 10 }),
    ],
    policies: {
      finalTrueValueCalculated: false,
      persistedTrueValueCreated: false,
      valueDeltaTrustedForDesignations: false,
      expectedWinsTrusted: false,
      salaryMovementAllowed: false,
      designationFinalizationAllowed: false,
      moraleMutationAllowed: false,
    },
    limitations: ['True Value preview remains untrusted.'],
    ...overrides,
  };
}

function expectedWinsReport(overrides: Partial<FranchiseExpectedWinsPreviewReport> = {}): FranchiseExpectedWinsPreviewReport {
  return {
    ...buildFranchiseExpectedWinsPreviewReport(trueValueReport()),
    ...overrides,
  };
}

describe('franchise expected-wins baseline snapshot storage', () => {
  beforeEach(async () => {
    resetFranchiseExpectedWinsBaselineDatabaseForTests();
    await clearFranchiseExpectedWinsBaselineDatabaseForTests();
  });

  afterEach(async () => {
    await clearFranchiseExpectedWinsBaselineDatabaseForTests();
    resetFranchiseExpectedWinsBaselineDatabaseForTests();
  });

  test('upserting preview rows creates one snapshot per scoped team row', async () => {
    const report = expectedWinsReport();
    const result = await upsertFranchiseExpectedWinsBaselineSnapshotsFromPreview(report, {
      timestamp: '2026-01-01T00:00:00.000Z',
    });

    expect(result.snapshots).toHaveLength(2);
    expect(result.policies.expectedWinsTrusted).toBe(false);
    expect(result.policies.fanMoraleMutationAllowed).toBe(false);
    expect(result.policies.mode3HandoffAllowed).toBe(false);

    const snapshots = await listFranchiseExpectedWinsBaselineSnapshots({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    });

    expect(snapshots).toHaveLength(2);
    expect(snapshots.map((snapshot) => snapshot.teamId)).toEqual(['team-high', 'team-low']);
    expect(snapshots[0]).toMatchObject({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
      sourceKind: 'true-value-preview',
      gamesPerTeam: 24,
      leagueAveragePreviewValueBaseline: 20,
      status: 'preview-only',
    });
    expect(snapshots[0].policies).toEqual({
      expectedWinsTrusted: false,
      fanMoraleMutationAllowed: false,
      gameTrackerMutationAllowed: false,
      dailySnapshotPersistenceAllowed: false,
      designationFinalizationAllowed: false,
      salaryMovementAllowed: false,
      relationshipEffectsAllowed: false,
      mode3HandoffAllowed: false,
    });
  });

  test('rerunning the same report is idempotent by scope team source and contract versions', async () => {
    const report = expectedWinsReport();
    await upsertFranchiseExpectedWinsBaselineSnapshotsFromPreview(report, {
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    await upsertFranchiseExpectedWinsBaselineSnapshotsFromPreview(report, {
      timestamp: '2026-01-02T00:00:00.000Z',
    });

    const snapshots = await listFranchiseExpectedWinsBaselineSnapshots({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    });

    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(snapshots[0].updatedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  test('mismatched row scope is skipped instead of normalized into the report scope', async () => {
    const report = expectedWinsReport();
    const result = await upsertFranchiseExpectedWinsBaselineSnapshotsFromPreview({
      ...report,
      teamRows: [
        report.teamRows[0],
        {
          ...report.teamRows[1],
          franchiseId: 'other-franchise',
          seasonId: 'other-season',
        },
      ],
    }, {
      timestamp: '2026-01-01T00:00:00.000Z',
    });

    expect(result.persisted).toBe(true);
    expect(result.snapshots).toHaveLength(1);
    expect(result.snapshots[0].teamId).toBe('team-high');
    expect(result.blockers.join(' ')).toMatch(/row scope mismatch/i);

    const snapshots = await listFranchiseExpectedWinsBaselineSnapshots({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    });

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].teamId).toBe('team-high');
  });

  test('blank team id rows are skipped before storage', async () => {
    const report = expectedWinsReport();
    const result = await upsertFranchiseExpectedWinsBaselineSnapshotsFromPreview({
      ...report,
      teamRows: [
        {
          ...report.teamRows[0],
          teamId: '   ',
        },
        report.teamRows[1],
      ],
    }, {
      timestamp: '2026-01-01T00:00:00.000Z',
    });

    expect(result.persisted).toBe(true);
    expect(result.snapshots).toHaveLength(1);
    expect(result.snapshots[0].teamId).toBe('team-low');
    expect(result.blockers.join(' ')).toMatch(/team id/i);

    expect(await getLatestFranchiseExpectedWinsBaselineSnapshotForTeam({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
      teamId: '',
    })).toBeNull();
    expect(await getLatestFranchiseExpectedWinsBaselineSnapshotForTeam({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
      teamId: '   ',
    })).toBeNull();
  });

  test('valid report scope with all invalid rows does not persist snapshots', async () => {
    const report = expectedWinsReport();
    const result = await upsertFranchiseExpectedWinsBaselineSnapshotsFromPreview({
      ...report,
      teamRows: report.teamRows.map((row) => ({
        ...row,
        seasonId: 'wrong-season',
      })),
    }, {
      timestamp: '2026-01-01T00:00:00.000Z',
    });

    expect(result.persisted).toBe(false);
    expect(result.snapshots).toEqual([]);
    expect(result.blockers.join(' ')).toMatch(/row scope mismatch/i);
    expect(await listFranchiseExpectedWinsBaselineSnapshots({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    })).toEqual([]);
  });

  test('list and latest APIs require exact franchise season stats scope and team identity', async () => {
    await upsertFranchiseExpectedWinsBaselineSnapshotsFromPreview(expectedWinsReport(), {
      timestamp: '2026-01-01T00:00:00.000Z',
    });

    expect(await listFranchiseExpectedWinsBaselineSnapshots({
      franchiseId: 'franchise-1',
      seasonId: 'season-other',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    })).toEqual([]);
    expect(await listFranchiseExpectedWinsBaselineSnapshots({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'other-scope',
      seasonNumber: 1,
    })).toEqual([]);
    expect(await getLatestFranchiseExpectedWinsBaselineSnapshotForTeam({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
      teamId: 'missing-team',
    })).toBeNull();

    const latest = await getLatestFranchiseExpectedWinsBaselineSnapshotForTeam({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
      teamId: 'team-high',
    });
    expect(latest?.teamId).toBe('team-high');
    expect(latest?.expectedWinsEstimate).toBe(17);
  });

  test('blocked expected-wins rows can be stored as untrusted baseline evidence', async () => {
    const blockedReport = buildFranchiseExpectedWinsPreviewReport(trueValueReport({
      teamSummaries: [
        teamSummary({ teamId: 'team-blocked', previewPlayerCount: 0, previewValueEstimateTotal: 0 }),
        teamSummary({ teamId: 'team-other', previewValueEstimateTotal: 20 }),
      ],
    }));

    await upsertFranchiseExpectedWinsBaselineSnapshotsFromPreview(blockedReport, {
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    const blocked = await getLatestFranchiseExpectedWinsBaselineSnapshotForTeam({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
      teamId: 'team-blocked',
    });

    expect(blocked).toMatchObject({
      status: 'blocked',
      expectedWinsEstimate: null,
      expectedWinsPreviewContractVersion: FRANCHISE_EXPECTED_WINS_PREVIEW_CONTRACT_VERSION,
      trueValuePreviewContractVersion: FRANCHISE_TRUE_VALUE_PREVIEW_CONTRACT_VERSION,
    });
    expect(blocked?.blockers.join(' ')).toMatch(/Team summary must have preview-only player value data/i);
    expect(blocked?.policies.expectedWinsTrusted).toBe(false);
    expect(blocked?.policies.fanMoraleMutationAllowed).toBe(false);
  });

  test('source contract versions are preserved and latest can select the newest versioned snapshot', async () => {
    const report = expectedWinsReport();
    await upsertFranchiseExpectedWinsBaselineSnapshotsFromPreview(report, {
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    await upsertFranchiseExpectedWinsBaselineSnapshotsFromPreview({
      ...report,
      contractVersion: 'franchise-expected-wins-preview-v2-readonly',
    } as FranchiseExpectedWinsPreviewReport, {
      timestamp: '2026-01-03T00:00:00.000Z',
    });

    const snapshots = await listFranchiseExpectedWinsBaselineSnapshots({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    });
    const highTeamSnapshots = snapshots.filter((snapshot) => snapshot.teamId === 'team-high');
    const latest = await getLatestFranchiseExpectedWinsBaselineSnapshotForTeam({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
      teamId: 'team-high',
    });

    expect(highTeamSnapshots).toHaveLength(2);
    expect(highTeamSnapshots.map((snapshot) => snapshot.trueValuePreviewContractVersion)).toEqual([
      FRANCHISE_TRUE_VALUE_PREVIEW_CONTRACT_VERSION,
      FRANCHISE_TRUE_VALUE_PREVIEW_CONTRACT_VERSION,
    ]);
    expect(highTeamSnapshots.map((snapshot) => snapshot.expectedWinsPreviewContractVersion)).toEqual([
      FRANCHISE_EXPECTED_WINS_PREVIEW_CONTRACT_VERSION,
      'franchise-expected-wins-preview-v2-readonly',
    ]);
    expect(latest?.expectedWinsPreviewContractVersion).toBe('franchise-expected-wins-preview-v2-readonly');
  });

  test('missing report scope is blocked before storage', async () => {
    const result = await upsertFranchiseExpectedWinsBaselineSnapshotsFromPreview({
      ...expectedWinsReport(),
      franchiseId: '',
      seasonId: '',
      statsScopeId: '',
      seasonNumber: 0,
    }, {
      timestamp: '2026-01-01T00:00:00.000Z',
    });

    expect(result.snapshots).toEqual([]);
    expect(result.blockers.join(' ')).toMatch(/Explicit franchise, season, stats scope/i);
    expect(await listFranchiseExpectedWinsBaselineSnapshots({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    })).toEqual([]);
  });

  test('storage utility imports no unsafe Mode 2 mutation APIs', () => {
    const source = readFileSync('src/utils/franchiseExpectedWinsBaselineStorage.ts', 'utf8');

    expect(source).not.toMatch(/from '\.\/(franchiseMoraleState|franchiseRandomEventLogStorage|franchiseRandomEventLog|franchiseSalary|franchiseDesignations|gameStorage|eventLog|syncEngine)'/);
    expect(source).not.toMatch(/saveFranchise|withInitialFranchiseSalary|confirmFranchiseRandomEvent|applyFranchiseMoraleEffect|persistFranchiseDesignations/);
  });
});
