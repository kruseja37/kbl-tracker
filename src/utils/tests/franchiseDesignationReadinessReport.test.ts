import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import {
  buildFranchiseDesignationReadinessReport,
  FRANCHISE_DESIGNATION_READINESS_REPORT_VERSION,
  type FranchiseDesignationReadinessReport,
  type FranchiseDesignationReadinessRow,
} from '../franchiseDesignationReadinessReport';
import {
  FRANCHISE_DESIGNATION_ELIGIBILITY_CONTRACT_VERSION,
  type FranchiseDesignationEligibilityReport,
} from '../franchiseDesignationEligibility';
import {
  FRANCHISE_TRUE_VALUE_PREVIEW_CONTRACT_VERSION,
  type FranchiseTrueValuePreviewPlayerRow,
  type FranchiseTrueValuePreviewReport,
} from '../franchiseTrueValuePreview';
import { FRANCHISE_VALUE_INPUT_CONTRACT_VERSION } from '../franchiseValueInputs';

function playerRow(overrides: Partial<FranchiseTrueValuePreviewPlayerRow> = {}): FranchiseTrueValuePreviewPlayerRow {
  return {
    contractVersion: FRANCHISE_TRUE_VALUE_PREVIEW_CONTRACT_VERSION,
    franchiseId: 'franchise-1',
    seasonId: 'season-1',
    statsScopeId: 'season-1',
    seasonNumber: 1,
    playerId: 'player-1',
    playerName: 'Preview Player',
    valuePosition: 'SS',
    teamId: 'team-1',
    rosterStatus: 'MLB',
    salary: 4,
    salaryBaselineAvailable: true,
    warInputAvailable: true,
    warPreviewTotal: 2,
    seasonMetadataAvailable: true,
    status: 'preview-only',
    previewValueEstimate: 8,
    valueDeltaEstimate: 4,
    valueDeltaTrustedForDesignations: false,
    expectedWinsTrusted: false,
    salaryMovementAllowed: false,
    designationFinalizationAllowed: false,
    persistable: false,
    reasons: ['Preview value context only.'],
    limitations: ['True Value preview remains untrusted.'],
    ...overrides,
  };
}

function previewReport(overrides: Partial<FranchiseTrueValuePreviewReport> = {}): FranchiseTrueValuePreviewReport {
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
    playerRows: [playerRow()],
    teamSummaries: [],
    policies: {
      finalTrueValueCalculated: false,
      persistedTrueValueCreated: false,
      valueDeltaTrustedForDesignations: false,
      expectedWinsTrusted: false,
      salaryMovementAllowed: false,
      designationFinalizationAllowed: false,
      moraleMutationAllowed: false,
    },
    limitations: ['Preview True Value is not final.'],
    ...overrides,
  };
}

function eligibilityReport(overrides: Partial<FranchiseDesignationEligibilityReport> = {}): FranchiseDesignationEligibilityReport {
  return {
    contractVersion: FRANCHISE_DESIGNATION_ELIGIBILITY_CONTRACT_VERSION,
    franchiseId: 'franchise-1',
    seasonId: 'season-1',
    statsScopeId: 'season-1',
    seasonNumber: 1,
    valueInputContractVersion: FRANCHISE_VALUE_INPUT_CONTRACT_VERSION,
    generatedAt: 100,
    records: [],
    anyPersistable: false,
    limitations: [],
    ...overrides,
  };
}

function row(
  report: FranchiseDesignationReadinessReport,
  playerId: string,
  designationType: FranchiseDesignationReadinessRow['designationType'],
): FranchiseDesignationReadinessRow {
  const found = report.rows.find((candidate) =>
    candidate.playerId === playerId &&
    candidate.designationType === designationType
  );
  expect(found).toBeDefined();
  return found!;
}

describe('franchise designation readiness report', () => {
  test('positive preview value delta creates Fan Favorite preview context but finalization remains blocked', () => {
    const report = buildFranchiseDesignationReadinessReport(previewReport({
      playerRows: [playerRow({
        playerId: 'surplus-player',
        salary: 2,
        previewValueEstimate: 9,
        valueDeltaEstimate: 7,
      })],
    }));
    const fanFavorite = row(report, 'surplus-player', 'FAN_FAVORITE');
    const albatross = row(report, 'surplus-player', 'ALBATROSS');

    expect(report.contractVersion).toBe(FRANCHISE_DESIGNATION_READINESS_REPORT_VERSION);
    expect(fanFavorite).toMatchObject({
      readinessStatus: 'preview-only',
      candidateDirection: 'positive-surplus-preview-context',
      salaryBaseline: 2,
      previewValueEstimate: 9,
      previewValueDeltaEstimate: 7,
      finalizationAllowed: false,
      randomEventPromptAllowed: false,
    });
    expect(albatross.readinessStatus).toBe('blocked');
    expect(report.policies).toEqual({
      finalTrueValueTrusted: true,
      valueDeltaTrustedForDesignations: true,
      fanFavoriteFinalizationAllowed: false,
      albatrossFinalizationAllowed: false,
      designationPersistenceAllowed: true,
      randomEventPromptAllowed: false,
      moraleMutationAllowed: false,
      salaryMovementAllowed: false,
      relationshipMutationAllowed: false,
      mode3HandoffAllowed: false,
    });
  });

  test('negative preview value delta creates Albatross preview context but finalization remains blocked', () => {
    const report = buildFranchiseDesignationReadinessReport(previewReport({
      playerRows: [playerRow({
        playerId: 'deficit-player',
        salary: 12,
        previewValueEstimate: 3,
        valueDeltaEstimate: -9,
      })],
    }));
    const fanFavorite = row(report, 'deficit-player', 'FAN_FAVORITE');
    const albatross = row(report, 'deficit-player', 'ALBATROSS');

    expect(fanFavorite.readinessStatus).toBe('blocked');
    expect(albatross).toMatchObject({
      readinessStatus: 'preview-only',
      candidateDirection: 'negative-deficit-preview-context',
      salaryBaseline: 12,
      previewValueEstimate: 3,
      previewValueDeltaEstimate: -9,
      finalizationAllowed: false,
      randomEventPromptAllowed: false,
    });
  });

  test('neutral zero delta creates no actionable readiness', () => {
    const report = buildFranchiseDesignationReadinessReport(previewReport({
      playerRows: [playerRow({
        playerId: 'neutral-player',
        salary: 5,
        previewValueEstimate: 5,
        valueDeltaEstimate: 0,
      })],
    }));

    expect(row(report, 'neutral-player', 'FAN_FAVORITE')).toMatchObject({
      readinessStatus: 'blocked',
      candidateDirection: 'neutral-no-context',
    });
    expect(row(report, 'neutral-player', 'ALBATROSS')).toMatchObject({
      readinessStatus: 'blocked',
      candidateDirection: 'neutral-no-context',
    });
    expect(report.rows.map((candidate) => candidate.blockers.join(' ')).join(' ')).toMatch(/requires .* preview value-delta context/i);
  });

  test('blocked True Value preview row remains blocked', () => {
    const report = buildFranchiseDesignationReadinessReport(previewReport({
      playerRows: [playerRow({
        playerId: 'blocked-player',
        status: 'blocked',
        previewValueEstimate: null,
        valueDeltaEstimate: null,
      })],
    }));

    expect(row(report, 'blocked-player', 'FAN_FAVORITE').readinessStatus).toBe('blocked');
    expect(row(report, 'blocked-player', 'ALBATROSS').readinessStatus).toBe('blocked');
    expect(row(report, 'blocked-player', 'FAN_FAVORITE').blockers.join(' ')).toMatch(/True Value preview row must be preview-only/i);
  });

  test('missing or mismatched scope blocks readiness', () => {
    const missing = buildFranchiseDesignationReadinessReport(previewReport({
      franchiseId: '',
      seasonId: '',
      statsScopeId: '',
      seasonNumber: 0,
    }));
    expect(missing.blockers.join(' ')).toMatch(/Explicit franchise, season, stats scope/i);
    expect(missing.rows[0].readinessStatus).toBe('blocked');

    const mismatched = buildFranchiseDesignationReadinessReport(previewReport({
      playerRows: [playerRow({ seasonId: 'other-season' })],
    }));
    expect(row(mismatched, 'player-1', 'FAN_FAVORITE').blockers.join(' ')).toMatch(/row scope does not match/i);
  });

  test('whitespace-only report franchise id blocks all readiness rows', () => {
    const report = buildFranchiseDesignationReadinessReport(previewReport({
      franchiseId: '   ',
      playerRows: [playerRow({ franchiseId: '   ' })],
    }));

    expect(report.blockers.join(' ')).toMatch(/Explicit franchise, season, stats scope/i);
    expect(report.rows.every((candidate) => candidate.readinessStatus === 'blocked')).toBe(true);
    expect(row(report, 'player-1', 'FAN_FAVORITE').blockers.join(' ')).toMatch(/row requires explicit franchise/i);
  });

  test('whitespace-only report season id blocks all readiness rows', () => {
    const report = buildFranchiseDesignationReadinessReport(previewReport({
      seasonId: '  ',
      playerRows: [playerRow({ seasonId: '  ' })],
    }));

    expect(report.blockers.join(' ')).toMatch(/Explicit franchise, season, stats scope/i);
    expect(report.rows.every((candidate) => candidate.readinessStatus === 'blocked')).toBe(true);
  });

  test('whitespace-only report stats scope id blocks all readiness rows', () => {
    const report = buildFranchiseDesignationReadinessReport(previewReport({
      statsScopeId: '\t',
      playerRows: [playerRow({ statsScopeId: '\t' })],
    }));

    expect(report.blockers.join(' ')).toMatch(/Explicit franchise, season, stats scope/i);
    expect(report.rows.every((candidate) => candidate.readinessStatus === 'blocked')).toBe(true);
  });

  test('matching whitespace-only report and row scope does not produce preview readiness', () => {
    const report = buildFranchiseDesignationReadinessReport(previewReport({
      franchiseId: ' ',
      seasonId: ' ',
      statsScopeId: ' ',
      playerRows: [playerRow({
        franchiseId: ' ',
        seasonId: ' ',
        statsScopeId: ' ',
      })],
    }));

    expect(row(report, 'player-1', 'FAN_FAVORITE')).toMatchObject({
      readinessStatus: 'blocked',
      candidateDirection: 'positive-surplus-preview-context',
    });
    expect(row(report, 'player-1', 'FAN_FAVORITE').blockers.join(' ')).toMatch(/row requires explicit franchise/i);
  });

  test('optional eligibility-report whitespace scope does not make the readiness report valid', () => {
    const report = buildFranchiseDesignationReadinessReport(
      previewReport(),
      eligibilityReport({
        franchiseId: ' ',
        seasonId: ' ',
        statsScopeId: ' ',
      }),
    );

    expect(report.blockers.join(' ')).toMatch(/Optional designation eligibility report scope does not match/i);
    expect(row(report, 'player-1', 'FAN_FAVORITE').readinessStatus).toBe('preview-only');
    expect(report.policies.randomEventPromptAllowed).toBe(false);
  });

  test('fully valid non-whitespace scope still produces expected preview context', () => {
    const report = buildFranchiseDesignationReadinessReport(previewReport({
      franchiseId: 'franchise-valid',
      seasonId: 'season-valid',
      statsScopeId: 'scope-valid',
      playerRows: [playerRow({
        franchiseId: 'franchise-valid',
        seasonId: 'season-valid',
        statsScopeId: 'scope-valid',
        playerId: 'valid-player',
      })],
    }));

    expect(report.blockers).toEqual([]);
    expect(row(report, 'valid-player', 'FAN_FAVORITE')).toMatchObject({
      readinessStatus: 'preview-only',
      candidateDirection: 'positive-surplus-preview-context',
    });
    expect(row(report, 'valid-player', 'ALBATROSS').readinessStatus).toBe('blocked');
  });

  test('missing player team salary value and value delta block readiness', () => {
    const report = buildFranchiseDesignationReadinessReport(previewReport({
      playerRows: [
        playerRow({ playerId: '', playerName: 'Missing Player' }),
        playerRow({ playerId: 'missing-team', teamId: null }),
        playerRow({ playerId: 'farm-player', rosterStatus: 'FARM' }),
        playerRow({ playerId: 'missing-salary', salary: null, salaryBaselineAvailable: false }),
        playerRow({ playerId: 'missing-value', previewValueEstimate: null }),
        playerRow({ playerId: 'missing-delta', valueDeltaEstimate: null }),
      ],
    }));

    expect(report.rows.every((candidate) => candidate.readinessStatus === 'blocked')).toBe(true);
    expect(JSON.stringify(report.rows)).toMatch(/Player id is required/);
    expect(JSON.stringify(report.rows)).toMatch(/Current team id is required/);
    expect(JSON.stringify(report.rows)).toMatch(/Current MLB roster status is required/);
    expect(JSON.stringify(report.rows)).toMatch(/Stable salary baseline is required/);
    expect(JSON.stringify(report.rows)).toMatch(/Preview value estimate is required/);
    expect(JSON.stringify(report.rows)).toMatch(/Preview value-delta estimate is required/);
  });

  test('policy trusts projected designations only while mutation and prompt gates stay false', () => {
    const report = buildFranchiseDesignationReadinessReport(previewReport());

    expect(report.policies).toMatchObject({
      finalTrueValueTrusted: true,
      valueDeltaTrustedForDesignations: true,
      designationPersistenceAllowed: true,
      randomEventPromptAllowed: false,
      moraleMutationAllowed: false,
      salaryMovementAllowed: false,
      relationshipMutationAllowed: false,
      mode3HandoffAllowed: false,
    });
    expect(report.hiddenSafe).toBe(true);
    expect(report.readOnly).toBe(true);
    expect(report.limitations.join(' ')).toMatch(/projected value-delta designation trust is enabled/i);
    expect(report.limitations.join(' ')).toContain('peer pools are profile-position until EP1 (R-8)');
  });

  test('utility imports no storage save set persist or mutation APIs', () => {
    const source = readFileSync('src/utils/franchiseDesignationReadinessReport.ts', 'utf8');

    expect(source).not.toMatch(/indexedDB|syncEngine|save[A-Z]|set[A-Z]|persist[A-Z]|put\(|delete\(|confirmFranchiseRandomEvent|applyFranchiseMoraleEffect|franchiseRandomEventGenerator/);
  });
});
