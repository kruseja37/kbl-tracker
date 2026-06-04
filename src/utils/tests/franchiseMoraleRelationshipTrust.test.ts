import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import type { CompletedGameRecord } from '../gameStorage';
import type { Player } from '../leagueBuilderStorage';
import {
  buildFranchiseMoraleRelationshipTrustReport,
  FRANCHISE_MORALE_RELATIONSHIP_TRUST_CONTRACT_VERSION,
} from '../franchiseMoraleRelationshipTrust';
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
    playerName: 'Trust Player',
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
    firstName: 'Trust',
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
    editHistory: [],
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
    playerStats: {},
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

describe('franchise morale/relationship trust contract', () => {
  test('MLB/revealed player context exposes stable identity fields but blocks mutation', () => {
    const report = buildFranchiseMoraleRelationshipTrustReport({
      valueInputReport: valueReport(),
      players: [player()],
    });

    expect(report.contractVersion).toBe(FRANCHISE_MORALE_RELATIONSHIP_TRUST_CONTRACT_VERSION);
    expect(report.scope.status).toBe('trusted');
    expect(report.anyMutable).toBe(false);
    expect(report.anyPersistable).toBe(false);

    const record = report.playerRecords[0];
    expect(record.revealState).toBe('revealed');
    expect(record.personality).toMatchObject({
      status: 'trusted',
      visibleValue: 'Competitive',
      trustedForIdentityContext: true,
      trustedForMoraleMutation: false,
      trustedForRelationshipMutation: false,
    });
    expect(record.chemistry).toMatchObject({
      status: 'trusted',
      visibleValue: 'Competitive',
      trustedForRelationshipMutation: false,
    });
    expect(record.moraleChanges.status).toBe('blocked');
    expect(record.relationshipChanges.status).toBe('blocked');
  });

  test('unrevealed FARM/prospect context keeps hidden personality modifiers blocked and unexposed', () => {
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
      primaryPosition: 'CF',
      ratingRevealState: 'hidden',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
      hiddenPersonalityModifiers: { leadership: 99, volatility: 1 },
      editHistory: [
        { date: '2026-01-01', field: 'hiddenPersonalityModifiers', oldValue: null, newValue: { leadership: 99 } },
      ],
    } as Partial<Player>);

    const report = buildFranchiseMoraleRelationshipTrustReport({
      valueInputReport: valueReport({ rows: [farmRow] }),
      players: [farmPlayer],
    });
    const record = report.playerRecords[0];

    expect(record.hiddenSafe).toBe(true);
    expect(record.hiddenProspectPersonalityModifiers).toMatchObject({
      status: 'blocked',
      present: true,
      exposed: false,
      trustedForMoraleMutation: false,
      trustedForRelationshipMutation: false,
    });
    expect(JSON.stringify(report)).not.toContain('"leadership":99');
    expect(JSON.stringify(report)).not.toContain('"volatility":1');
    expect(record.limitations.join(' ')).toMatch(/hidden-safe/i);
  });

  test('GameTracker archives are stable fact context while score-only rows remain schedule/standings only', () => {
    const report = buildFranchiseMoraleRelationshipTrustReport({
      valueInputReport: valueReport(),
      players: [player()],
      completedGames: [completedGame()],
      scheduledGames: [scoreOnlyGame()],
    });

    expect(report.gameTrackerArchives).toMatchObject({
      status: 'preview-only',
      scopedRows: 1,
      archiveBacked: true,
      trustedForStableGameFacts: true,
      trustedForPlayerMorale: false,
      trustedForRelationships: false,
      trustedForNarrativeEvents: false,
    });
    expect(report.scoreOnlyResults).toMatchObject({
      status: 'trusted',
      scopedRows: 1,
      trustedForScheduleAndStandings: true,
      trustedForPlayerMorale: false,
      trustedForRelationships: false,
      trustedForNarrativeEvents: false,
    });
  });

  test('roster movement history is context-only and does not unlock relationship mutation', () => {
    const report = buildFranchiseMoraleRelationshipTrustReport({
      valueInputReport: valueReport(),
      players: [player()],
      transactions: [
        transaction({ type: 'call_up' }),
        transaction({ id: 'txn-2', type: 'send_down' }),
        transaction({ id: 'txn-3', type: 'trade', data: { playerId: 'player-1', sourceTeamId: 'team-1', targetTeamId: 'team-2' } }),
        transaction({ id: 'txn-cross', franchiseId: 'other-franchise', type: 'trade' }),
      ],
    });

    expect(report.rosterMovementHistory).toMatchObject({
      status: 'preview-only',
      scopedRows: 3,
      callUps: 1,
      sendDowns: 1,
      trades: 1,
      contextOnly: true,
      trustedForRelationshipMutation: false,
      trustedForMoraleMutation: false,
    });
  });

  test('salary movement, designation prerequisites, morale, relationship, and narrative consumers remain blocked or deferred', () => {
    const report = buildFranchiseMoraleRelationshipTrustReport({
      valueInputReport: valueReport(),
      players: [player()],
    });

    expect(report.salary.baseline.status).toBe('trusted');
    expect(report.salary.baseline.trustedForMoraleMutation).toBe(false);
    expect(report.salary.movement).toMatchObject({ status: 'blocked', active: false });
    expect(report.designationPrerequisites.fanFavorite.status).toBe('blocked');
    expect(report.designationPrerequisites.albatross.status).toBe('blocked');
    expect(report.designationPrerequisites.captain.status).toBe('deferred');
    expect(report.designationPrerequisites.fanHopeful.status).toBe('deferred');
    expect(report.designationPrerequisites.cornerstone.status).toBe('deferred');
    expect(report.downstreamConsumers.moraleChanges).toMatchObject({ status: 'blocked', mutable: false, persistable: false });
    expect(report.downstreamConsumers.relationshipChanges).toMatchObject({ status: 'blocked', mutable: false, persistable: false });
    expect(report.downstreamConsumers.narrativeRandomEvents).toMatchObject({ status: 'blocked', active: false, mutable: false });
    expect(report.downstreamConsumers.mode3Offseason).toMatchObject({ status: 'deferred', active: false });
  });

  test('missing franchise/season/stats scope blocks scoped evidence trust', () => {
    const missingScopeReport = valueReport({
      franchiseId: '',
      seasonId: '',
      statsScopeId: '',
      rows: [valueRow({ franchiseId: '', seasonId: '', statsScopeId: '' })],
    });

    const report = buildFranchiseMoraleRelationshipTrustReport({
      valueInputReport: missingScopeReport,
      players: [player()],
      transactions: [transaction()],
      completedGames: [completedGame()],
      scheduledGames: [scoreOnlyGame()],
    });

    expect(report.scope.status).toBe('blocked');
    expect(report.rosterMovementHistory.scopedRows).toBe(0);
    expect(report.gameTrackerArchives.scopedRows).toBe(0);
    expect(report.scoreOnlyResults.scopedRows).toBe(0);
    expect(report.playerRecords[0].personality).toMatchObject({
      status: 'blocked',
      visibleValue: 'Competitive',
      trustedForIdentityContext: false,
    });
    expect(report.playerRecords[0].chemistry).toMatchObject({
      status: 'blocked',
      visibleValue: 'Competitive',
      trustedForIdentityContext: false,
    });
    expect(report.salary.baseline).toMatchObject({
      status: 'blocked',
      playerRowsWithBaseline: 1,
      trustedForReadOnlyContext: false,
    });
  });

  test('utility is read-only and imports no save/persist APIs', () => {
    const source = readFileSync('src/utils/franchiseMoraleRelationshipTrust.ts', 'utf8');
    const report = buildFranchiseMoraleRelationshipTrustReport({
      valueInputReport: valueReport(),
      players: [player()],
      transactions: [transaction()],
    });

    expect(source).not.toMatch(/save[A-Z]|set[A-Z]|persist[A-Z]|logMode2V1Transaction|syncEngine|indexedDB/);
    expect(JSON.stringify(report)).not.toMatch(/"mutable":true|"persistable":true/);
  });
});
