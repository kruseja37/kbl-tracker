import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  buildFranchiseDesignationEligibility,
  classifyFranchiseDesignationEligibility,
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
  persistFranchiseDesignationsForPlayers: vi.fn(),
  saveFranchisePlayer: vi.fn(),
}));

vi.mock('../franchiseValueInputs', () => {
  return {
    FRANCHISE_VALUE_INPUT_CONTRACT_VERSION: 'franchise-mode2-value-inputs-v1-readonly',
    buildFranchiseValueInputRows: mocks.buildFranchiseValueInputRows,
  };
});

vi.mock('../franchiseDesignations', () => ({
  persistFranchiseDesignationsForPlayers: mocks.persistFranchiseDesignationsForPlayers,
}));

vi.mock('../franchisePlayerStorage', () => ({
  saveFranchisePlayer: mocks.saveFranchisePlayer,
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

function makeRow(overrides: Partial<FranchiseValueInputRow> = {}): FranchiseValueInputRow {
  return {
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

  test('TEAM_MVP and ACE return preview-only with stat/WAR-like input but remain non-persistable', () => {
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
      status: 'preview-only',
      persistable: false,
      teamId: 'team-1',
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
    });
    expect(findRecord(report.records, 'ace', 'ACE')).toMatchObject({
      status: 'preview-only',
      persistable: false,
      teamId: 'team-1',
      statsScopeId: 'season-1',
    });
    expect(report.records.every((record) => record.persistable === false)).toBe(true);
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
      expect(mvp?.reasons.join(' ')).toContain('pitcher recognition uses ACE');
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
        status: 'preview-only',
        persistable: false,
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

  test('broad input-ready roster does not produce a Team MVP preview flood', () => {
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
    const mvpPreviews = report.records.filter((record) => record.designationType === 'TEAM_MVP' && record.status === 'preview-only');

    expect(mvpPreviews).toHaveLength(1);
    expect(mvpPreviews[0].playerId).toBe('strong-batter');
    expect(findRecord(report.records, 'input-ready-runner-up', 'TEAM_MVP').reasons.join(' ')).toContain('ranked/selective');
  });

  test('strongest positive pitcher can become the only Ace candidate', () => {
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

    const acePreviews = report.records.filter((record) => record.designationType === 'ACE' && record.status === 'preview-only');
    expect(acePreviews).toHaveLength(1);
    expect(acePreviews[0].playerId).toBe('ace-leader');
    expect(findRecord(report.records, 'weaker-pitcher', 'ACE').reasons.join(' ')).toContain('ranked/selective');
  });

  test('no MVP or Ace preview emits when performance evidence is insufficient', () => {
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
      record.status === 'preview-only',
    )).toHaveLength(0);
  });

  test('FAN_FAVORITE and ALBATROSS block without canonical True Value and value delta', () => {
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
    expect(fanFavorite.reasons.join(' ')).toContain('True Value and value-delta inputs');
    expect(fanFavorite.reasons.join(' ')).toContain('fan/morale systems');
    expect(albatross.status).toBe('blocked');
    expect(albatross.reasons.join(' ')).toContain('True Value and value-delta inputs');
  });

  test('future narrative/value designations are blocked with deferred input reasons', () => {
    const report = classifyFranchiseDesignationEligibility(makeReport([makeRow()]));

    expect(findRecord(report.records, 'player-1', 'CAPTAIN').reasons.join(' ')).toContain('leadership, morale, and relationship inputs');
    expect(findRecord(report.records, 'player-1', 'FAN_HOPEFUL').reasons.join(' ')).toContain('fan, morale, and True Value inputs');
    expect(findRecord(report.records, 'player-1', 'CORNERSTONE').reasons.join(' ')).toContain('future value, contract trajectory, morale, and relationship inputs');
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

    const report = await buildFranchiseDesignationEligibility(input);

    expect(mocks.buildFranchiseValueInputRows).toHaveBeenCalledWith(input);
    expect(mocks.persistFranchiseDesignationsForPlayers).not.toHaveBeenCalled();
    expect(mocks.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(report.records.every((record) => record.persistable === false)).toBe(true);
    expect(report.anyPersistable).toBe(false);
  });
});
