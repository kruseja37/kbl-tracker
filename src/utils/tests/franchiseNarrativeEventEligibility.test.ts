import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import {
  buildFranchiseAnalyticsTrustReport,
  type FranchiseAnalyticsTrustReport,
} from '../franchiseAnalyticsTrust';
import { classifyFranchiseDesignationEligibility } from '../franchiseDesignationEligibility';
import type { CompletedGameRecord } from '../gameStorage';
import type { Player } from '../leagueBuilderStorage';
import {
  buildFranchiseMoraleRelationshipTrustReport,
  type FranchiseMoraleRelationshipTrustReport,
} from '../franchiseMoraleRelationshipTrust';
import {
  buildFranchiseNarrativeEventEligibilityReport,
  FRANCHISE_NARRATIVE_EVENT_ELIGIBILITY_CONTRACT_VERSION,
} from '../franchiseNarrativeEventEligibility';
import { classifyFranchiseSalaryLifecycle } from '../franchiseSalaryLifecycle';
import {
  FRANCHISE_VALUE_INPUT_CONTRACT_VERSION,
  type FranchiseValueInputReport,
  type FranchiseValueInputRow,
} from '../franchiseValueInputs';
import type { ScheduledGame } from '../scheduleStorage';
import type { TransactionLogEntry } from '../transactionStorage';

function valueRow(overrides: Partial<FranchiseValueInputRow> = {}): FranchiseValueInputRow {
  return {
    contractVersion: FRANCHISE_VALUE_INPUT_CONTRACT_VERSION,
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-1',
    statsScopeId: 'franchise-1-season-1',
    seasonNumber: 1,
    playerId: 'player-1',
    playerName: 'Narrative Player',
    currentTeamId: 'team-1',
    rosterStatus: 'MLB',
    salary: 8.5,
    contractYears: 2,
    salaryBaselineCalculationVersion: 'franchise-initial-salary-v1-ratings-only',
    teamSalaryBaseline: 80,
    salaryBaselineAvailable: true,
    seasonStatsAvailability: {
      batting: true,
      pitching: false,
      fielding: true,
      any: true,
    },
    warInputAvailability: {
      battingWar: true,
      pitchingWar: false,
      fieldingWar: true,
      baserunningWar: true,
      any: true,
      trustedForFinalValue: false,
    },
    warPreviewValues: {
      battingWar: 0.2,
      pitchingWar: null,
      fieldingWar: 0.1,
      baserunningWar: 0.1,
      totalWar: 0.4,
      totalWarSource: 'stat-row',
      trustedForFinalValue: false,
    },
    wpaInputAvailability: {
      playerWpa: false,
      managerWpa: false,
      archiveBacked: false,
      trustedForFinalValue: false,
    },
    seasonContext: {
      seasonId: 'franchise-1-season-1',
      statsScopeId: 'franchise-1-season-1',
      seasonNumber: 1,
      gamesPerTeam: 24,
      inningsPerGame: 6,
      seasonLengthSource: 'stored-franchise-config',
      scheduleRowCount: 2,
      scheduleRowsUsedAsSeasonLength: false,
      seasonMetadataTotalGames: 2,
    },
    stadiumId: 'stadium-1',
    parkFactorAvailability: {
      stadiumIdAvailable: true,
      seedParkFactorsAvailable: true,
      customParkFactorsAvailable: false,
      status: 'seed-only',
      parkAdjustedValueInputsAvailable: false,
    },
    limitations: [],
    ...overrides,
  };
}

function valueReport(overrides: Partial<FranchiseValueInputReport> = {}): FranchiseValueInputReport {
  const rows = overrides.rows ?? [valueRow()];
  return {
    contractVersion: FRANCHISE_VALUE_INPUT_CONTRACT_VERSION,
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-1',
    statsScopeId: 'franchise-1-season-1',
    seasonNumber: 1,
    generatedAt: 1,
    seasonContext: rows[0]?.seasonContext ?? valueRow().seasonContext,
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
    limitations: [],
    ...overrides,
  };
}

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-1',
    firstName: 'Narrative',
    lastName: 'Player',
    gender: 'M',
    age: 27,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    power: 70,
    contact: 72,
    speed: 65,
    fielding: 80,
    arm: 78,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    arsenal: [],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 8.5,
    contractYears: 2,
    leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: false,
    editHistory: [
      { date: '2026-01-01', field: 'nickname', oldValue: '', newValue: 'Spark' },
    ],
    ...overrides,
  };
}

function transaction(overrides: Partial<TransactionLogEntry> = {}): TransactionLogEntry {
  return {
    id: 'txn-1',
    timestamp: '2026-01-02T00:00:00.000Z',
    season: 1,
    gameNumber: null,
    phase: 'REGULAR_SEASON',
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-1',
    statsScopeId: 'franchise-1-season-1',
    type: 'call_up',
    actor: 'USER',
    data: {
      playerId: 'player-1',
      teamId: 'team-1',
      sourceRosterStatus: 'FARM',
      targetRosterStatus: 'MLB',
    },
    previousState: null,
    undone: false,
    undoneAt: null,
    undoneBy: null,
    ...overrides,
  };
}

function completedGame(overrides: Partial<CompletedGameRecord> = {}): CompletedGameRecord {
  return {
    gameId: 'game-1',
    date: 100,
    seasonId: 'franchise-1-season-1',
    statsScopeId: 'franchise-1-season-1',
    franchiseId: 'franchise-1',
    competitionType: 'franchise',
    competitionId: 'franchise-1',
    seasonNumber: 1,
    awayTeamId: 'team-1',
    homeTeamId: 'team-2',
    awayTeamName: 'Team 1',
    homeTeamName: 'Team 2',
    finalScore: { away: 3, home: 2 },
    innings: 6,
    totalInnings: 6,
    fameEvents: [],
    playerStats: {
      'player-1': {
        playerName: 'Narrative Player',
        teamId: 'team-1',
        pa: 4,
        ab: 4,
        h: 1,
        singles: 1,
        doubles: 0,
        triples: 0,
        hr: 0,
        rbi: 0,
        r: 0,
        bb: 0,
        hbp: 0,
        k: 1,
        sb: 0,
        cs: 0,
        sf: 0,
        sh: 0,
        gidp: 0,
        putouts: 1,
        assists: 0,
        fieldingErrors: 0,
      },
    },
    pitcherGameStats: [],
    activityLog: [],
    inningScores: [],
    aggregationStatus: 'aggregated',
    ...overrides,
  };
}

function scoreOnlyGame(overrides: Partial<ScheduledGame> = {}): ScheduledGame {
  return {
    id: 'schedule-score-only-1',
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-1',
    statsScopeId: 'franchise-1-season-1',
    seasonNumber: 1,
    gameNumber: 2,
    dayNumber: 2,
    awayTeamId: 'team-1',
    homeTeamId: 'team-2',
    status: 'COMPLETED',
    result: {
      awayScore: 4,
      homeScore: 2,
      winningTeamId: 'team-1',
      losingTeamId: 'team-2',
    },
    completionSource: 'score-only',
    resultEnteredAt: 100,
    scoreOnlyResultId: 'score-only-1',
    createdAt: 1,
    completedAt: 100,
    source: 'manual',
    ...overrides,
  };
}

function foundationReports(input: {
  valueInputReport?: FranchiseValueInputReport;
  players?: Player[];
  transactions?: TransactionLogEntry[];
  completedGames?: CompletedGameRecord[];
  scheduledGames?: ScheduledGame[];
  playoffStatsPresent?: boolean;
} = {}) {
  const valueInputReport = input.valueInputReport ?? valueReport();
  const analyticsTrustReport = buildFranchiseAnalyticsTrustReport({
    valueInputReport,
    completedGames: input.completedGames ?? [completedGame()],
    scheduledGames: input.scheduledGames ?? [scoreOnlyGame()],
    playoffStatsPresent: input.playoffStatsPresent,
  });
  const salaryLifecycleReport = classifyFranchiseSalaryLifecycle(valueInputReport);
  const designationEligibilityReport = classifyFranchiseDesignationEligibility(valueInputReport);
  const moraleRelationshipTrustReport = buildFranchiseMoraleRelationshipTrustReport({
    valueInputReport,
    players: input.players ?? [player()],
    transactions: input.transactions ?? [transaction()],
    completedGames: input.completedGames ?? [completedGame()],
    scheduledGames: input.scheduledGames ?? [scoreOnlyGame()],
  });
  return {
    valueInputReport,
    analyticsTrustReport,
    salaryLifecycleReport,
    designationEligibilityReport,
    moraleRelationshipTrustReport,
  };
}

function buildReport(overrides: Partial<ReturnType<typeof foundationReports>> = {}) {
  const reports = { ...foundationReports(), ...overrides };
  return buildFranchiseNarrativeEventEligibilityReport(reports);
}

describe('franchise narrative/random-event eligibility gate', () => {
  test('archive-backed games are eligible read-only context but not event generation', () => {
    const report = buildReport();

    expect(report.contractVersion).toBe(FRANCHISE_NARRATIVE_EVENT_ELIGIBILITY_CONTRACT_VERSION);
    expect(report.gameTrackerArchiveBackedGames).toMatchObject({
      status: 'eligible-context',
      scopedRows: 1,
      archiveBacked: true,
      eligibleForReadOnlySummaryContext: true,
      eligibleForNarrativeGeneration: false,
      eligibleForRandomEventGeneration: false,
      persistable: false,
      mutable: false,
    });
    expect(report.downstreamConsumers.readOnlySummaries.status).toBe('eligible-context');
    expect(report.anyNarrativeGenerationAllowed).toBe(false);
    expect(report.anyRandomEventGenerationAllowed).toBe(false);
  });

  test('score-only rows are schedule and standings context only', () => {
    const report = buildReport();

    expect(report.scoreOnlyCompletedGames).toMatchObject({
      status: 'eligible-context',
      scopedRows: 1,
      scheduleStandingsContextOnly: true,
      eligibleForReadOnlySummaryContext: true,
      eligibleForNarrativeGeneration: false,
      eligibleForRandomEventGeneration: false,
    });
    expect(report.scoreOnlyCompletedGames.limitations.join(' ')).toMatch(/no player archive/i);
  });

  test('roster movement and player-local edits are context-only', () => {
    const report = buildReport();

    expect(report.rosterMovementTransactions).toMatchObject({
      status: 'eligible-context',
      scopedRows: 1,
      contextOnly: true,
      eligibleForReadOnlySummaryContext: true,
      eligibleForRandomEventGeneration: false,
    });
    expect(report.playerLocalProfileEdits).toMatchObject({
      status: 'eligible-context',
      entries: 1,
      playerLocalOnly: true,
      eligibleForNarrativeGeneration: false,
      persistable: false,
    });
  });

  test('hidden FARM/prospect data is blocked and hidden-safe', () => {
    const farmRow = valueRow({
      playerId: 'farm-1',
      playerName: 'Hidden Prospect',
      rosterStatus: 'FARM',
      salary: 0.7,
    });
    const farmPlayer = player({
      id: 'farm-1',
      firstName: 'Hidden',
      lastName: 'Prospect',
      ratingRevealState: 'hidden',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
      hiddenPersonalityModifiers: { leadership: 99, volatility: 1 },
    } as Partial<Player>);
    const reports = foundationReports({
      valueInputReport: valueReport({ rows: [farmRow] }),
      players: [farmPlayer],
      transactions: [],
      completedGames: [],
      scheduledGames: [],
    });

    const report = buildFranchiseNarrativeEventEligibilityReport(reports);

    expect(report.hiddenFarmProspectData).toMatchObject({
      status: 'blocked',
      hiddenSafeRows: 1,
      hiddenModifierRows: 1,
      hiddenDataExposed: false,
      eligibleForNarrativeGeneration: false,
      eligibleForRandomEventGeneration: false,
    });
    expect(report.hiddenSafe).toBe(true);
    expect(JSON.stringify(report)).not.toContain('"leadership":99');
    expect(JSON.stringify(report)).not.toContain('"volatility":1');
  });

  test('missing franchise/season/stats scope blocks narrative eligibility', () => {
    const missingScopeValueReport = valueReport({
      franchiseId: '',
      seasonId: '',
      statsScopeId: '',
      rows: [valueRow({ franchiseId: '', seasonId: '', statsScopeId: '' })],
    });
    const reports = foundationReports({
      valueInputReport: missingScopeValueReport,
      completedGames: [completedGame()],
      scheduledGames: [scoreOnlyGame()],
    });

    const report = buildFranchiseNarrativeEventEligibilityReport(reports);

    expect(report.scope.status).toBe('blocked');
    expect(report.gameTrackerArchiveBackedGames.status).toBe('blocked');
    expect(report.scoreOnlyCompletedGames.status).toBe('blocked');
    expect(report.rosterMovementTransactions.status).toBe('blocked');
    expect(report.personalityChemistryContext.status).toBe('blocked');
  });

  test('mismatched foundation report scope blocks narrative eligibility', () => {
    const reports = foundationReports();
    const mismatchedValueInputReport = valueReport({
      franchiseId: 'other-franchise',
      seasonId: 'other-season',
      statsScopeId: 'other-scope',
      rows: [valueRow({ franchiseId: 'other-franchise', seasonId: 'other-season', statsScopeId: 'other-scope' })],
    });

    const report = buildFranchiseNarrativeEventEligibilityReport({
      ...reports,
      valueInputReport: mismatchedValueInputReport,
    });

    expect(report.scope.status).toBe('blocked');
    expect(report.gameTrackerArchiveBackedGames.status).toBe('blocked');
    expect(report.scoreOnlyCompletedGames.status).toBe('blocked');
    expect(report.salaryBaseline.status).toBe('blocked');
    expect(report.downstreamConsumers.readOnlySummaries.status).toBe('not-applicable');
  });

  test('salary movement, True Value, morale, relationships, and random events stay blocked', () => {
    const report = buildReport();

    expect(report.salaryBaseline).toMatchObject({
      status: 'eligible-context',
      stableRows: 1,
      eligibleForReadOnlySummaryContext: true,
    });
    expect(report.salaryMovement.status).toBe('blocked');
    expect(report.trueValueAndValueDelta.status).toBe('blocked');
    expect(report.moraleRelationshipState.status).toBe('blocked');
    expect(report.downstreamConsumers.narrativeGeneration.status).toBe('blocked');
    expect(report.downstreamConsumers.randomEventGeneration.status).toBe('blocked');
    expect(report.downstreamConsumers.storyPersistence.status).toBe('blocked');
    expect(report.downstreamConsumers.moraleMutation.status).toBe('blocked');
    expect(report.downstreamConsumers.relationshipMutation.status).toBe('blocked');
    expect(report.downstreamConsumers.mode3OffseasonExecution.status).toBe('deferred');
  });

  test('TEAM_MVP/ACE are preview-only while future/value designations remain blocked or deferred', () => {
    const reports = foundationReports({
      valueInputReport: valueReport({
        rows: [
          valueRow({
            playerId: 'mvp',
            playerName: 'Preview MVP',
            seasonStatsAvailability: { batting: true, pitching: false, fielding: true, any: true },
            warInputAvailability: {
              battingWar: true,
              pitchingWar: false,
              fieldingWar: true,
              baserunningWar: true,
              any: true,
              trustedForFinalValue: false,
            },
          }),
          valueRow({
            playerId: 'ace',
            playerName: 'Preview Ace',
            seasonStatsAvailability: { batting: false, pitching: true, fielding: false, any: true },
            warInputAvailability: {
              battingWar: false,
              pitchingWar: true,
              fieldingWar: false,
              baserunningWar: false,
              any: true,
              trustedForFinalValue: false,
            },
          }),
        ],
      }),
    });

    const report = buildFranchiseNarrativeEventEligibilityReport(reports);

    expect(report.designationPrerequisites.teamMvpAcePreview).toMatchObject({
      status: 'preview-only',
      previewRecords: 3,
      eligibleForReadOnlySummaryContext: true,
      eligibleForNarrativeGeneration: false,
      persistable: false,
    });
    expect(report.designationPrerequisites.fanFavorite.status).toBe('blocked');
    expect(report.designationPrerequisites.albatross.status).toBe('blocked');
    expect(report.designationPrerequisites.captain.status).toBe('deferred');
    expect(report.designationPrerequisites.fanHopeful.status).toBe('deferred');
    expect(report.designationPrerequisites.cornerstone.status).toBe('deferred');
  });

  test('scope-blocked TEAM_MVP and ACE previews cannot create read-only eligibility', () => {
    const valueInputReport = valueReport({
      franchiseId: '',
      seasonId: '',
      statsScopeId: '',
      rows: [
        valueRow({
          franchiseId: '',
          seasonId: '',
          statsScopeId: '',
          playerId: 'mvp',
          playerName: 'Preview MVP',
          seasonStatsAvailability: { batting: true, pitching: false, fielding: true, any: true },
          warInputAvailability: {
            battingWar: true,
            pitchingWar: false,
            fieldingWar: true,
            baserunningWar: true,
            any: true,
            trustedForFinalValue: false,
          },
        }),
      ],
    });
    const reports = foundationReports({
      valueInputReport,
      completedGames: [],
      scheduledGames: [],
      transactions: [],
    });

    const report = buildFranchiseNarrativeEventEligibilityReport(reports);

    expect(report.scope.status).toBe('blocked');
    expect(report.designationPrerequisites.teamMvpAcePreview).toMatchObject({
      status: 'blocked',
      previewRecords: 0,
      eligibleForReadOnlySummaryContext: false,
    });
    expect(report.downstreamConsumers.readOnlySummaries.status).toBe('not-applicable');
  });

  test('playoff/champion context is read-only and cannot create ceremonies or events', () => {
    const reports = foundationReports({ playoffStatsPresent: true });
    const report = buildFranchiseNarrativeEventEligibilityReport(reports);

    expect(report.playoffChampionContext).toMatchObject({
      status: 'eligible-context',
      eligibleForReadOnlySummaryContext: true,
      eligibleForNarrativeGeneration: false,
      eligibleForRandomEventGeneration: false,
    });
    expect(report.playoffChampionContext.limitations.join(' ')).toMatch(/Champion ceremonies/i);
  });

  test('utility is read-only and imports no save/persist APIs', () => {
    const source = readFileSync('src/utils/franchiseNarrativeEventEligibility.ts', 'utf8');
    const report = buildReport();

    expect(source).not.toMatch(/save[A-Z]|set[A-Z]|persist[A-Z]|logMode2V1Transaction|syncEngine|indexedDB/);
    expect(JSON.stringify(report)).not.toMatch(/"mutable":true|"persistable":true/);
    expect(report.anyMutable).toBe(false);
    expect(report.anyPersistable).toBe(false);
  });
});
