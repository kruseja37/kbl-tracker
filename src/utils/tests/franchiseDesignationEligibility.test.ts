import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  buildFranchiseDesignationEligibility,
  classifyFranchiseDesignationEligibility,
  FRANCHISE_DESIGNATION_V1_POLICY_MATRIX,
  type FranchiseDesignationEligibilityRecord,
} from '../franchiseDesignationEligibility';
import {
  FRANCHISE_VALUE_INPUT_CONTRACT_VERSION,
  type BuildFranchiseValueInputRowsInput,
  type FranchiseValueInputReport,
  type FranchiseValueInputRow,
} from '../franchiseValueInputs';

const mocks = vi.hoisted(() => ({
  buildFranchiseValueInputRows: vi.fn(),
  getFranchiseTrueValueRows: vi.fn(),
  saveFranchisePlayer: vi.fn(),
}));

vi.mock('../franchiseValueInputs', () => {
  return {
    FRANCHISE_VALUE_INPUT_CONTRACT_VERSION: 'franchise-mode2-value-inputs-v1-readonly',
    buildFranchiseValueInputRows: mocks.buildFranchiseValueInputRows,
  };
});

vi.mock('../franchisePlayerStorage', () => ({
  saveFranchisePlayer: mocks.saveFranchisePlayer,
}));

vi.mock('../franchiseTrueValueStorage', () => ({
  getFranchiseTrueValueRows: mocks.getFranchiseTrueValueRows,
}));

function makeSeasonContext(overrides: Partial<FranchiseValueInputRow['seasonContext']> = {}): FranchiseValueInputRow['seasonContext'] {
  return {
    seasonId: 'season-1',
    statsScopeId: 'season-1',
    seasonNumber: 1,
    gamesPerTeam: 24,
    inningsPerGame: 6,
    seasonLengthSource: 'stored-franchise-config',
    scheduleRowCount: 0,
    scheduleRowsUsedAsSeasonLength: false,
    seasonMetadataTotalGames: 0,
    ...overrides,
  };
}

function warConsumerTrust(row: FranchiseValueInputRow): FranchiseValueInputRow['warConsumerTrust'] {
  const metadataReady = row.seasonContext.gamesPerTeam !== null && row.seasonContext.inningsPerGame !== null;
  const commonReady = row.currentTeamId !== null && row.rosterStatus === 'MLB' && metadataReady && row.seasonStatsAvailability.any;
  const blockers = commonReady ? [] : ['Fixture row does not meet scoped MLB WAR trust prerequisites.'];
  if (!row.warInputAvailability.any || row.warPreviewValues.totalWar === null) {
    blockers.push('TEAM_MVP WAR trust requires a numeric total WAR value from scoped season stats.');
  }
  if (!row.warInputAvailability.pitchingWar || row.warPreviewValues.pitchingWar === null) {
    blockers.push('ACE WAR trust requires a numeric pitching WAR value from scoped season stats.');
  }
  return {
    teamMvpDesignations: commonReady && row.warInputAvailability.any && row.warPreviewValues.totalWar !== null,
    aceDesignations: commonReady && row.warInputAvailability.pitchingWar && row.warPreviewValues.pitchingWar !== null,
    fanFavoriteAlbatrossDesignations: false,
    awards: false,
    salaryMovement: false,
    trueValue: false,
    morale: false,
    mode3Handoff: false,
    blockers,
    limitations: [
      'WAR consumer trust is limited to TEAM_MVP/ACE designation input gating; it does not trust final True Value, value delta, awards, salary movement, morale, relationships, or Mode 3.',
    ],
  };
}

function makeRow(overrides: Partial<FranchiseValueInputRow> = {}): FranchiseValueInputRow {
  const row: FranchiseValueInputRow = {
    contractVersion: FRANCHISE_VALUE_INPUT_CONTRACT_VERSION,
    franchiseId: 'franchise-1',
    seasonId: 'season-1',
    statsScopeId: 'season-1',
    seasonNumber: 1,
    playerId: 'player-1',
    playerName: 'Canon Input',
    valuePosition: 'SS',
    currentTeamId: 'team-1',
    rosterStatus: 'MLB',
    salary: 8.5,
    contractYears: 2,
    salaryBaselineCalculationVersion: 'salary-baseline-v1',
    teamSalaryBaseline: 8.5,
    salaryBaselineAvailable: true,
    seasonStatsAvailability: {
      batting: false,
      pitching: false,
      fielding: false,
      any: false,
    },
    warInputAvailability: {
      battingWar: false,
      pitchingWar: false,
      fieldingWar: false,
      baserunningWar: false,
      any: false,
      trustedForFinalValue: false,
    },
    warPreviewValues: {
      battingWar: null,
      pitchingWar: null,
      fieldingWar: null,
      baserunningWar: null,
      totalWar: null,
      totalWarSource: 'unavailable',
      trustedForFinalValue: false,
    },
    wpaInputAvailability: {
      playerWpa: false,
      managerWpa: false,
      archiveBacked: false,
      trustedForFinalValue: false,
    },
    seasonContext: makeSeasonContext(),
    stadiumId: 'stadium-apple-field',
    parkFactorAvailability: {
      stadiumIdAvailable: true,
      seedParkFactorsAvailable: true,
      customParkFactorsAvailable: false,
      status: 'seed-only',
      parkAdjustedValueInputsAvailable: false,
    },
    limitations: [
      'Final True Value and dynamic designations are not calculated by this read-only contract.',
    ],
    ...overrides,
  };
  return {
    ...row,
    warConsumerTrust: row.warConsumerTrust ?? warConsumerTrust(row),
  };
}

function makeReport(rows: FranchiseValueInputRow[]): FranchiseValueInputReport {
  return {
    contractVersion: FRANCHISE_VALUE_INPUT_CONTRACT_VERSION,
    franchiseId: 'franchise-1',
    seasonId: 'season-1',
    statsScopeId: 'season-1',
    seasonNumber: 1,
    generatedAt: 1,
    seasonContext: makeSeasonContext(),
    trustedValueArtifactFrozen: false,
    rows,
    trueValuePolicy: {
      finalTrueValueCalculated: false,
      persistedTrueValueCreated: false,
    },
    designationPolicy: {
      finalDesignationsCalculated: false,
      persistedDesignationRecordsCreated: false,
      inventedDesignationTypes: [],
    },
    limitations: rows.flatMap((row) => row.limitations),
  };
}

function findRecord(
  records: FranchiseDesignationEligibilityRecord[],
  playerId: string,
  designationType: FranchiseDesignationEligibilityRecord['designationType'],
): FranchiseDesignationEligibilityRecord {
  const record = records.find((candidate) =>
    candidate.playerId === playerId && candidate.designationType === designationType,
  );
  expect(record).toBeTruthy();
  return record!;
}

describe('franchise designation eligibility adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFranchiseTrueValueRows.mockResolvedValue([]);
  });

  test('stable salary baseline alone does not make any designation persistable', () => {
    const report = classifyFranchiseDesignationEligibility(makeReport([makeRow()]));

    expect(report.anyPersistable).toBe(false);
    expect(report.records.every((record) => record.persistable === false)).toBe(true);
    expect(report.records.some((record) => record.status === 'eligible')).toBe(false);
    expect(findRecord(report.records, 'player-1', 'TEAM_MVP')).toEqual(expect.objectContaining({
      status: 'blocked',
      persistable: false,
    }));
    expect(findRecord(report.records, 'player-1', 'TEAM_MVP').reasons.join(' ')).toContain('WAR-like season inputs');
  });

  test('policy matrix documents every designation family and promotes MVP/Ace/Fan Favorite/Albatross as active', () => {
    expect(FRANCHISE_DESIGNATION_V1_POLICY_MATRIX.map((policy) => policy.designationType)).toEqual([
      'TEAM_MVP',
      'ACE',
      'FAN_FAVORITE',
      'ALBATROSS',
      'CAPTAIN',
      'FAN_HOPEFUL',
    ]);
    expect(FRANCHISE_DESIGNATION_V1_POLICY_MATRIX.filter((policy) => policy.status === 'active').map((policy) => policy.designationType)).toEqual([
      'TEAM_MVP',
      'ACE',
      'FAN_FAVORITE',
      'ALBATROSS',
    ]);
    expect(FRANCHISE_DESIGNATION_V1_POLICY_MATRIX.filter((policy) => policy.persistable).map((policy) => policy.designationType)).toEqual([
      'TEAM_MVP',
      'ACE',
      'FAN_FAVORITE',
      'ALBATROSS',
    ]);
    expect(FRANCHISE_DESIGNATION_V1_POLICY_MATRIX.find((policy) => policy.designationType === 'TEAM_MVP')?.blockers.join(' ')).toMatch(/TWO-WAY.*ACE/i);
    expect(FRANCHISE_DESIGNATION_V1_POLICY_MATRIX.find((policy) => policy.designationType === 'FAN_FAVORITE')?.summary).toMatch(/highest positive trusted Value Delta/i);
    expect(FRANCHISE_DESIGNATION_V1_POLICY_MATRIX.find((policy) => policy.designationType === 'ALBATROSS')?.summary).toMatch(/worst negative trusted Value Delta/i);
    expect(FRANCHISE_DESIGNATION_V1_POLICY_MATRIX.find((policy) => policy.designationType === 'CAPTAIN')?.summary).toMatch(/hidden charisma\/leadership/i);
    expect(FRANCHISE_DESIGNATION_V1_POLICY_MATRIX.find((policy) => policy.designationType === 'FAN_HOPEFUL')?.summary).toMatch(/visible-safe prospect/i);
  });

  test('TEAM_MVP and ACE return active with trusted WAR input and become persistable', () => {
    const mvp = makeRow({
      playerId: 'mvp',
      playerName: 'Preview MVP',
      valuePosition: 'SS',
      seasonStatsAvailability: { batting: true, pitching: false, fielding: true, any: true },
      warInputAvailability: {
        battingWar: true,
        pitchingWar: false,
        fieldingWar: true,
        baserunningWar: true,
        any: true,
        trustedForFinalValue: false,
      },
      warPreviewValues: {
        battingWar: 1.4,
        pitchingWar: null,
        fieldingWar: 0.2,
        baserunningWar: 0.1,
        totalWar: 1.7,
        totalWarSource: 'stat-row',
        trustedForFinalValue: false,
      },
    });
    const ace = makeRow({
      playerId: 'ace',
      playerName: 'Preview Ace',
      valuePosition: 'P',
      seasonStatsAvailability: { batting: false, pitching: true, fielding: false, any: true },
      warInputAvailability: {
        battingWar: false,
        pitchingWar: true,
        fieldingWar: false,
        baserunningWar: false,
        any: true,
        trustedForFinalValue: false,
      },
      warPreviewValues: {
        battingWar: null,
        pitchingWar: 1.2,
        fieldingWar: null,
        baserunningWar: null,
        totalWar: 1.2,
        totalWarSource: 'derived-from-components',
        trustedForFinalValue: false,
      },
    });

    const report = classifyFranchiseDesignationEligibility(makeReport([mvp, ace]));

    expect(findRecord(report.records, 'mvp', 'TEAM_MVP')).toMatchObject({
      status: 'active',
      persistable: true,
      teamId: 'team-1',
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
    });
    expect(findRecord(report.records, 'ace', 'ACE')).toMatchObject({
      status: 'active',
      persistable: true,
      teamId: 'team-1',
      statsScopeId: 'season-1',
    });
    expect(report.anyPersistable).toBe(true);
  });

  test.each(['SP', 'RP', 'CP', 'SP/RP', 'TWO-WAY', 'P'])(
    'TEAM_MVP blocks positive-WAR pitcher identity shape %s',
    (valuePosition) => {
      const report = classifyFranchiseDesignationEligibility(makeReport([
        makeRow({
          playerId: `pitcher-${valuePosition.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`,
          playerName: `${valuePosition} Pitcher`,
          valuePosition,
          currentTeamId: `team-${valuePosition.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`,
          seasonStatsAvailability: { batting: true, pitching: true, fielding: false, any: true },
          warInputAvailability: {
            battingWar: true,
            pitchingWar: true,
            fieldingWar: false,
            baserunningWar: false,
            any: true,
            trustedForFinalValue: false,
          },
          warPreviewValues: {
            battingWar: 0.2,
            pitchingWar: 1.1,
            fieldingWar: null,
            baserunningWar: null,
            totalWar: 1.3,
            totalWarSource: 'derived-from-components',
            trustedForFinalValue: false,
          },
        }),
      ]));

      const mvp = report.records.find((record) => record.designationType === 'TEAM_MVP');
      expect(mvp).toMatchObject({
        status: 'blocked',
        persistable: false,
      });
      const reasonText = mvp?.reasons.join(' ') ?? '';
      if (valuePosition === 'TWO-WAY') {
        expect(reasonText).toContain('TWO-WAY players are routed as pitcher-only');
        expect(reasonText).toContain('stricter two-way TEAM_MVP criteria are deferred');
      } else {
        expect(reasonText).toContain('pitcher recognition uses ACE');
      }
    },
  );

  test.each(['SP', 'RP', 'CP', 'SP/RP', 'TWO-WAY', 'P'])(
    'ACE can consider repo-native pitcher identity shape %s with pWAR at or above threshold',
    (valuePosition) => {
      const safePosition = valuePosition.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const report = classifyFranchiseDesignationEligibility(makeReport([
        makeRow({
          playerId: `ace-${safePosition}`,
          playerName: `${valuePosition} Ace`,
          valuePosition,
          currentTeamId: `team-${safePosition}`,
          seasonStatsAvailability: { batting: false, pitching: true, fielding: false, any: true },
          warInputAvailability: {
            battingWar: false,
            pitchingWar: true,
            fieldingWar: false,
            baserunningWar: false,
            any: true,
            trustedForFinalValue: false,
          },
          warPreviewValues: {
            battingWar: null,
            pitchingWar: 0.5,
            fieldingWar: null,
            baserunningWar: null,
            totalWar: 0.5,
            totalWarSource: 'derived-from-components',
            trustedForFinalValue: false,
          },
        }),
      ]));

      expect(findRecord(report.records, `ace-${safePosition}`, 'ACE')).toMatchObject({
        status: 'active',
        persistable: true,
      });
    },
  );

  test('negative-WAR player is not a Team MVP candidate even with broad input readiness', () => {
    const report = classifyFranchiseDesignationEligibility(makeReport([
      makeRow({
        playerId: 'negative-pitcher',
        playerName: 'Bad Start',
        valuePosition: 'P',
        seasonStatsAvailability: { batting: false, pitching: true, fielding: false, any: true },
        warInputAvailability: {
          battingWar: false,
          pitchingWar: true,
          fieldingWar: false,
          baserunningWar: false,
          any: true,
          trustedForFinalValue: false,
        },
        warPreviewValues: {
          battingWar: null,
          pitchingWar: -0.4,
          fieldingWar: null,
          baserunningWar: null,
          totalWar: -0.4,
          totalWarSource: 'derived-from-components',
          trustedForFinalValue: false,
        },
      }),
    ]));

    const mvp = findRecord(report.records, 'negative-pitcher', 'TEAM_MVP');
    const ace = findRecord(report.records, 'negative-pitcher', 'ACE');
    expect(mvp.status).toBe('blocked');
    expect(mvp.reasons.join(' ')).toMatch(/positive season\/team-relative WAR|position-player/i);
    expect(ace.status).toBe('blocked');
    expect(ace.reasons.join(' ')).toContain('pWAR of at least 0.5');
  });

  test('broad input-ready roster does not produce a Team MVP active designation flood', () => {
    const rows = [
      makeRow({
        playerId: 'strong-batter',
        playerName: 'Strong Batter',
        valuePosition: 'SS',
        seasonStatsAvailability: { batting: true, pitching: false, fielding: true, any: true },
        warInputAvailability: {
          battingWar: true,
          pitchingWar: false,
          fieldingWar: true,
          baserunningWar: true,
          any: true,
          trustedForFinalValue: false,
        },
        warPreviewValues: {
          battingWar: 1.3,
          pitchingWar: null,
          fieldingWar: 0.2,
          baserunningWar: 0.1,
          totalWar: 1.6,
          totalWarSource: 'stat-row',
          trustedForFinalValue: false,
        },
      }),
      makeRow({
        playerId: 'input-ready-runner-up',
        playerName: 'Runner Up',
        valuePosition: 'CF',
        seasonStatsAvailability: { batting: true, pitching: false, fielding: true, any: true },
        warInputAvailability: {
          battingWar: true,
          pitchingWar: false,
          fieldingWar: true,
          baserunningWar: true,
          any: true,
          trustedForFinalValue: false,
        },
        warPreviewValues: {
          battingWar: 0.7,
          pitchingWar: null,
          fieldingWar: 0.1,
          baserunningWar: 0.1,
          totalWar: 0.9,
          totalWarSource: 'stat-row',
          trustedForFinalValue: false,
        },
      }),
    ];

    const report = classifyFranchiseDesignationEligibility(makeReport(rows));
    const mvpPreviews = report.records.filter((record) => record.designationType === 'TEAM_MVP' && record.status === 'active');

    expect(mvpPreviews).toHaveLength(1);
    expect(mvpPreviews[0].playerId).toBe('strong-batter');
    expect(findRecord(report.records, 'input-ready-runner-up', 'TEAM_MVP').reasons.join(' ')).toContain('ranked/selective');
  });

  test('strongest positive pitcher can become the only active Ace', () => {
    const report = classifyFranchiseDesignationEligibility(makeReport([
      makeRow({
        playerId: 'weaker-pitcher',
        playerName: 'Weaker Pitcher',
        valuePosition: 'P',
        seasonStatsAvailability: { batting: false, pitching: true, fielding: false, any: true },
        warInputAvailability: {
          battingWar: false,
          pitchingWar: true,
          fieldingWar: false,
          baserunningWar: false,
          any: true,
          trustedForFinalValue: false,
        },
        warPreviewValues: {
          battingWar: null,
          pitchingWar: 0.7,
          fieldingWar: null,
          baserunningWar: null,
          totalWar: 0.7,
          totalWarSource: 'derived-from-components',
          trustedForFinalValue: false,
        },
      }),
      makeRow({
        playerId: 'ace-leader',
        playerName: 'Ace Leader',
        valuePosition: 'P',
        seasonStatsAvailability: { batting: false, pitching: true, fielding: false, any: true },
        warInputAvailability: {
          battingWar: false,
          pitchingWar: true,
          fieldingWar: false,
          baserunningWar: false,
          any: true,
          trustedForFinalValue: false,
        },
        warPreviewValues: {
          battingWar: null,
          pitchingWar: 1.4,
          fieldingWar: null,
          baserunningWar: null,
          totalWar: 1.4,
          totalWarSource: 'derived-from-components',
          trustedForFinalValue: false,
        },
      }),
    ]));

    const acePreviews = report.records.filter((record) => record.designationType === 'ACE' && record.status === 'active');
    expect(acePreviews).toHaveLength(1);
    expect(acePreviews[0].playerId).toBe('ace-leader');
    expect(findRecord(report.records, 'weaker-pitcher', 'ACE').reasons.join(' ')).toContain('ranked/selective');
  });

  test('no MVP or Ace active designation emits when performance evidence is insufficient', () => {
    const report = classifyFranchiseDesignationEligibility(makeReport([
      makeRow({
        playerId: 'low-batter',
        playerName: 'Low Batter',
        valuePosition: 'SS',
        seasonStatsAvailability: { batting: true, pitching: false, fielding: false, any: true },
        warInputAvailability: {
          battingWar: true,
          pitchingWar: false,
          fieldingWar: false,
          baserunningWar: false,
          any: true,
          trustedForFinalValue: false,
        },
        warPreviewValues: {
          battingWar: 0,
          pitchingWar: null,
          fieldingWar: null,
          baserunningWar: null,
          totalWar: 0,
          totalWarSource: 'stat-row',
          trustedForFinalValue: false,
        },
      }),
      makeRow({
        playerId: 'low-pitcher',
        playerName: 'Low Pitcher',
        valuePosition: 'P',
        seasonStatsAvailability: { batting: false, pitching: true, fielding: false, any: true },
        warInputAvailability: {
          battingWar: false,
          pitchingWar: true,
          fieldingWar: false,
          baserunningWar: false,
          any: true,
          trustedForFinalValue: false,
        },
        warPreviewValues: {
          battingWar: null,
          pitchingWar: 0.2,
          fieldingWar: null,
          baserunningWar: null,
          totalWar: 0.2,
          totalWarSource: 'derived-from-components',
          trustedForFinalValue: false,
        },
      }),
    ]));

    expect(report.records.filter((record) =>
      (record.designationType === 'TEAM_MVP' || record.designationType === 'ACE') &&
      record.status === 'active',
    )).toHaveLength(0);
  });

  test('FAN_FAVORITE and ALBATROSS block without persisted canonical True Value and value delta', () => {
    const report = classifyFranchiseDesignationEligibility(makeReport([
      makeRow({
        seasonStatsAvailability: { batting: true, pitching: false, fielding: true, any: true },
        warInputAvailability: {
          battingWar: true,
          pitchingWar: false,
          fieldingWar: true,
          baserunningWar: false,
          any: true,
          trustedForFinalValue: false,
        },
      }),
    ]));

    const fanFavorite = findRecord(report.records, 'player-1', 'FAN_FAVORITE');
    const albatross = findRecord(report.records, 'player-1', 'ALBATROSS');

    expect(fanFavorite.status).toBe('blocked');
    expect(fanFavorite.reasons.join(' ')).toContain('persisted canonical True Value and Value Delta rows');
    expect(albatross.status).toBe('blocked');
    expect(albatross.reasons.join(' ')).toContain('persisted canonical True Value and Value Delta rows');
  });

  test('value designations become active only for trusted ranked candidates with Albatross floor and materiality gates', () => {
    const trustedWorst = makeRow({
      playerId: 'trusted-worst',
      playerName: 'Trusted Worst',
      currentTeamId: 'team-1',
      salary: 5_000,
      warConsumerTrust: {
        ...warConsumerTrust(makeRow()),
        fanFavoriteAlbatrossDesignations: true,
        trueValue: true,
        blockers: [],
      },
    });
    const untrustedWorst = makeRow({
      playerId: 'untrusted-worst',
      playerName: 'Untrusted Worst',
      currentTeamId: 'team-1',
      salary: 6_000,
      warConsumerTrust: {
        ...warConsumerTrust(makeRow()),
        fanFavoriteAlbatrossDesignations: false,
        trueValue: false,
        blockers: ['D6 blocked fixture'],
      },
    });
    const trustedPositive = makeRow({
      playerId: 'trusted-positive',
      playerName: 'Trusted Positive',
      currentTeamId: 'team-2',
      salary: 1_000,
      warConsumerTrust: {
        ...warConsumerTrust(makeRow()),
        fanFavoriteAlbatrossDesignations: true,
        trueValue: true,
        blockers: [],
      },
    });
    const report = classifyFranchiseDesignationEligibility(makeReport([
      trustedWorst,
      untrustedWorst,
      trustedPositive,
    ]), [
      { franchiseId: 'franchise-1', seasonId: 'season-1', statsScopeId: 'season-1', playerId: 'trusted-worst', trueValue: 3_000, contractValue: 5_000, valueDelta: -2_000, warPercentile: 0.2, position: 'SS', peerPoolSize: 4, calculationVersion: 'true-value-v1', computedAt: 'now' },
      { franchiseId: 'franchise-1', seasonId: 'season-1', statsScopeId: 'season-1', playerId: 'untrusted-worst', trueValue: 1_000, contractValue: 6_000, valueDelta: -5_000, warPercentile: 0.1, position: 'SS', peerPoolSize: 1, calculationVersion: 'true-value-v1', computedAt: 'now' },
      { franchiseId: 'franchise-1', seasonId: 'season-1', statsScopeId: 'season-1', playerId: 'trusted-positive', trueValue: 6_000, contractValue: 1_000, valueDelta: 5_000, warPercentile: 0.9, position: 'SS', peerPoolSize: 4, calculationVersion: 'true-value-v1', computedAt: 'now' },
    ]);

    expect(findRecord(report.records, 'trusted-worst', 'ALBATROSS')).toMatchObject({
      status: 'active',
      persistable: true,
    });
    expect(findRecord(report.records, 'untrusted-worst', 'ALBATROSS')).toMatchObject({
      status: 'blocked',
      persistable: false,
    });
    expect(findRecord(report.records, 'untrusted-worst', 'ALBATROSS').reasons.join(' ')).toMatch(/D6 trusted-value artifact membership/i);
    expect(findRecord(report.records, 'trusted-positive', 'ALBATROSS').status).toBe('blocked');
    expect(findRecord(report.records, 'trusted-positive', 'ALBATROSS').reasons.join(' ')).toMatch(/valueDelta divided by contractValue/i);
    expect(findRecord(report.records, 'trusted-positive', 'FAN_FAVORITE')).toMatchObject({
      status: 'active',
      persistable: true,
    });
    expect(findRecord(report.records, 'trusted-worst', 'FAN_FAVORITE').status).toBe('blocked');
  });

  test('future narrative/value designations are blocked with deferred input reasons', () => {
    const report = classifyFranchiseDesignationEligibility(makeReport([makeRow()]));

    expect(findRecord(report.records, 'player-1', 'CAPTAIN').reasons.join(' ')).toContain('hidden charisma/leadership safety policy');
    expect(findRecord(report.records, 'player-1', 'FAN_HOPEFUL').reasons.join(' ')).toContain('visible-safe prospect assignment source');
    expect(report.records.map((record) => String(record.designationType))).not.toContain('CORNERSTONE');
  });

  test('every live designation family is evaluated but only trusted ranked inputs can become active in v1', () => {
    const report = classifyFranchiseDesignationEligibility(makeReport([
      makeRow({
        playerId: 'position-leader',
        playerName: 'Position Leader',
        valuePosition: 'SS',
        seasonStatsAvailability: { batting: true, pitching: false, fielding: true, any: true },
        warInputAvailability: {
          battingWar: true,
          pitchingWar: false,
          fieldingWar: true,
          baserunningWar: true,
          any: true,
          trustedForFinalValue: false,
        },
        warPreviewValues: {
          battingWar: 1.5,
          pitchingWar: null,
          fieldingWar: 0.2,
          baserunningWar: 0.1,
          totalWar: 1.8,
          totalWarSource: 'derived-from-components',
          trustedForFinalValue: false,
        },
      }),
      makeRow({
        playerId: 'two-way-ace',
        playerName: 'Two Way Ace',
        valuePosition: 'TWO-WAY',
        currentTeamId: 'team-2',
        seasonStatsAvailability: { batting: true, pitching: true, fielding: true, any: true },
        warInputAvailability: {
          battingWar: true,
          pitchingWar: true,
          fieldingWar: true,
          baserunningWar: true,
          any: true,
          trustedForFinalValue: false,
        },
        warPreviewValues: {
          battingWar: 1.4,
          pitchingWar: 1.1,
          fieldingWar: 0.1,
          baserunningWar: 0.1,
          totalWar: 2,
          totalWarSource: 'derived-from-components',
          trustedForFinalValue: false,
        },
      }),
    ]));

    expect(report.records).toHaveLength(12);
    expect(report.records.filter((record) => record.status === 'active').map((record) => `${record.playerId}:${record.designationType}`).sort()).toEqual([
      'position-leader:TEAM_MVP',
      'two-way-ace:ACE',
    ]);
    expect(findRecord(report.records, 'two-way-ace', 'TEAM_MVP').reasons.join(' ')).toMatch(/TWO-WAY players are routed as pitcher-only/i);
    for (const designationType of ['FAN_FAVORITE', 'ALBATROSS', 'CAPTAIN', 'FAN_HOPEFUL'] as const) {
      expect(findRecord(report.records, 'position-leader', designationType).status).toBe('blocked');
      expect(findRecord(report.records, 'two-way-ace', designationType).status).toBe('blocked');
    }
    expect(report.limitations.join(' ')).toMatch(/Only TEAM_MVP, ACE, FAN_FAVORITE, and ALBATROSS can persist as active v1 designations/i);
    expect(report.limitations.join(' ')).toMatch(/TWO-WAY players are routed as pitcher-only/i);
  });

  test('missing metadata, missing team payroll, FARM/free-agent status, and unavailable park factors are surfaced clearly', () => {
    const farm = makeRow({
      playerId: 'farm-player',
      rosterStatus: 'FARM',
      teamSalaryBaseline: null,
      seasonContext: makeSeasonContext({ gamesPerTeam: null, inningsPerGame: null, seasonLengthSource: 'missing' }),
      parkFactorAvailability: {
        stadiumIdAvailable: true,
        seedParkFactorsAvailable: false,
        customParkFactorsAvailable: false,
        status: 'custom-unavailable',
        parkAdjustedValueInputsAvailable: false,
      },
      limitations: [
        'Stored season length or innings metadata is missing.',
        'Team payroll baseline is missing for this player/team.',
        'Seed park factors are unavailable; park context is stored as unadjusted.',
      ],
    });
    const freeAgent = makeRow({
      playerId: 'free-agent',
      currentTeamId: null,
      rosterStatus: null,
      teamSalaryBaseline: null,
      stadiumId: null,
      parkFactorAvailability: {
        stadiumIdAvailable: false,
        seedParkFactorsAvailable: false,
        customParkFactorsAvailable: false,
        status: 'unadjusted',
        parkAdjustedValueInputsAvailable: false,
      },
    });

    const report = classifyFranchiseDesignationEligibility(makeReport([farm, freeAgent]));
    const farmMvp = findRecord(report.records, 'farm-player', 'TEAM_MVP');
    const freeAgentMvp = findRecord(report.records, 'free-agent', 'TEAM_MVP');

    expect(farmMvp.reasons.join(' ')).toContain('Current MLB roster status is required; found FARM.');
    expect(farmMvp.reasons.join(' ')).toContain('Stored season length and innings metadata are missing');
    expect(farmMvp.limitations).toEqual(expect.arrayContaining([
      'Team payroll baseline is unavailable for salary/value designation checks.',
      'Park-factor state is not trusted for final designation or value output in internal v1.',
      'Stored games-per-team and innings metadata are required for stable designation lifecycle decisions.',
    ]));
    expect(freeAgentMvp.reasons.join(' ')).toContain('Current franchise team context is required');
    expect(freeAgentMvp.reasons.join(' ')).toContain('unassigned/free-agent');
  });

  test('async adapter consumes the value-input contract and does not call persist/save APIs', async () => {
    const input: BuildFranchiseValueInputRowsInput = {
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      seasonNumber: 1,
    };
    mocks.buildFranchiseValueInputRows.mockResolvedValue(makeReport([
      makeRow({
        seasonStatsAvailability: { batting: true, pitching: false, fielding: false, any: true },
        warInputAvailability: {
          battingWar: true,
          pitchingWar: false,
          fieldingWar: false,
          baserunningWar: false,
          any: true,
          trustedForFinalValue: false,
        },
      }),
    ]));
    mocks.getFranchiseTrueValueRows.mockResolvedValue([]);

    const report = await buildFranchiseDesignationEligibility(input);

    expect(mocks.buildFranchiseValueInputRows).toHaveBeenCalledWith(input);
    expect(mocks.getFranchiseTrueValueRows).toHaveBeenCalledWith({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
    });
    expect(mocks.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(report.records.every((record) => record.persistable === false)).toBe(true);
    expect(report.anyPersistable).toBe(false);
  });
});
