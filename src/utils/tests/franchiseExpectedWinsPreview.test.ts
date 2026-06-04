import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import {
  buildFranchiseExpectedWinsPreviewReport,
  FRANCHISE_EXPECTED_WINS_PREVIEW_CONTRACT_VERSION,
} from '../franchiseExpectedWinsPreview';
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

describe('franchise expected wins preview contract', () => {
  test('multiple team summaries produce preview expected wins around the league average baseline', () => {
    const report = buildFranchiseExpectedWinsPreviewReport(trueValueReport());

    expect(report.contractVersion).toBe(FRANCHISE_EXPECTED_WINS_PREVIEW_CONTRACT_VERSION);
    expect(report.gamesPerTeam).toBe(24);
    expect(report.leagueAveragePreviewValueBaseline).toBe(20);

    const high = report.teamRows.find((row) => row.teamId === 'team-high');
    const low = report.teamRows.find((row) => row.teamId === 'team-low');

    expect(high).toMatchObject({
      status: 'preview-only',
      teamPreviewValueTotal: 30,
      leagueAveragePreviewValueBaseline: 20,
      previewGapFromLeagueAverage: 10,
      expectedWinsEstimate: 17,
      expectedWinsTrusted: false,
      fanMoraleMutationAllowed: false,
      salaryMovementAllowed: false,
      designationFinalizationAllowed: false,
    });
    expect(low).toMatchObject({
      status: 'preview-only',
      teamPreviewValueTotal: 10,
      previewGapFromLeagueAverage: -10,
      expectedWinsEstimate: 7,
    });
    expect(high?.limitations.join(' ')).toMatch(/Expected wins are preview-only/i);
  });

  test('above-average and below-average team values move estimates in opposite directions', () => {
    const report = buildFranchiseExpectedWinsPreviewReport(trueValueReport({
      teamSummaries: [
        teamSummary({ teamId: 'alpha', previewValueEstimateTotal: 24 }),
        teamSummary({ teamId: 'beta', previewValueEstimateTotal: 18 }),
        teamSummary({ teamId: 'gamma', previewValueEstimateTotal: 12 }),
      ],
    }));

    const alpha = report.teamRows.find((row) => row.teamId === 'alpha');
    const beta = report.teamRows.find((row) => row.teamId === 'beta');
    const gamma = report.teamRows.find((row) => row.teamId === 'gamma');

    expect(report.leagueAveragePreviewValueBaseline).toBe(18);
    expect(alpha?.expectedWinsEstimate).toBeGreaterThan(beta?.expectedWinsEstimate ?? 0);
    expect(beta?.expectedWinsEstimate).toBe(12);
    expect(gamma?.expectedWinsEstimate).toBeLessThan(beta?.expectedWinsEstimate ?? 0);
  });

  test('missing blocked single-team and empty preview data block expected-wins preview', () => {
    const missingSeason = buildFranchiseExpectedWinsPreviewReport(trueValueReport({
      seasonContext: {
        ...trueValueReport().seasonContext,
        gamesPerTeam: null,
      },
    }));
    expect(missingSeason.teamRows[0].status).toBe('blocked');
    expect(missingSeason.teamRows[0].blockers.join(' ')).toMatch(/games-per-team/i);

    const singleTeam = buildFranchiseExpectedWinsPreviewReport(trueValueReport({
      teamSummaries: [teamSummary({ teamId: 'solo', previewValueEstimateTotal: 20 })],
    }));
    expect(singleTeam.teamRows[0].status).toBe('blocked');
    expect(singleTeam.teamRows[0].blockers.join(' ')).toMatch(/At least two teams/i);

    const blockedTeam = buildFranchiseExpectedWinsPreviewReport(trueValueReport({
      teamSummaries: [
        teamSummary({ teamId: 'blocked', previewPlayerCount: 0, previewValueEstimateTotal: 0 }),
        teamSummary({ teamId: 'eligible', previewValueEstimateTotal: 20 }),
      ],
    }));
    expect(blockedTeam.teamRows.find((row) => row.teamId === 'blocked')?.status).toBe('blocked');
    expect(blockedTeam.teamRows.find((row) => row.teamId === 'blocked')?.blockers.join(' ')).toMatch(/Team summary must have preview-only player value data/i);
    expect(blockedTeam.teamRows.every((row) => row.status === 'blocked')).toBe(true);

    const empty = buildFranchiseExpectedWinsPreviewReport(trueValueReport({ teamSummaries: [] }));
    expect(empty.teamRows).toEqual([]);
    expect(empty.leagueAveragePreviewValueBaseline).toBeNull();
  });

  test('all policy flags remain false and downstream mutation stays blocked', () => {
    const report = buildFranchiseExpectedWinsPreviewReport(trueValueReport());

    expect(report.policies).toEqual({
      expectedWinsTrusted: false,
      expectedWinsPersisted: false,
      fanMoraleMutationAllowed: false,
      gameTrackerMutationAllowed: false,
      dailySnapshotPersistenceAllowed: false,
      designationFinalizationAllowed: false,
      salaryMovementAllowed: false,
      relationshipEffectsAllowed: false,
      mode3HandoffAllowed: false,
    });
    expect(report.limitations.join(' ')).toMatch(/No fan morale, salary, designation, relationship, daily snapshot, GameTracker completion, offseason, or Mode 3 state is persisted or mutated/i);
  });

  test('utility imports no storage save set persist morale salary or designation mutation APIs', () => {
    const source = readFileSync('src/utils/franchiseExpectedWinsPreview.ts', 'utf8');
    const report = buildFranchiseExpectedWinsPreviewReport(trueValueReport());

    expect(source).not.toMatch(/indexedDB|syncEngine|save[A-Z]|set[A-Z]|persist[A-Z]|\bput\(|\bdelete\(|applyFranchiseMoraleEffect|confirmFranchiseRandomEvent|withInitialFranchiseSalary|persistFranchiseDesignations|saveFranchisePlayer|saveFranchiseTeam/);
    expect(report.policies.expectedWinsTrusted).toBe(false);
    expect(report.policies.fanMoraleMutationAllowed).toBe(false);
  });
});
