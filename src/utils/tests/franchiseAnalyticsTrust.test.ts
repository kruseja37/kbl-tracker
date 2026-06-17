import { describe, expect, test } from 'vitest';

import {
  buildFranchiseAnalyticsTrustReport,
  FRANCHISE_ANALYTICS_TRUST_CONTRACT_VERSION,
} from '../franchiseAnalyticsTrust';
import type { CompletedGameRecord } from '../gameStorage';
import type {
  FranchiseValueInputReport,
  FranchiseValueInputRow,
  FranchiseValueParkFactorStatus,
} from '../franchiseValueInputs';
import { FRANCHISE_VALUE_INPUT_CONTRACT_VERSION } from '../franchiseValueInputs';
import type { ScheduledGame } from '../scheduleStorage';
import type { FranchisePlayerTeamStatStint } from '../franchiseStatAttribution';

function valueRow(overrides: Partial<FranchiseValueInputRow> = {}): FranchiseValueInputRow {
  const parkStatus = overrides.parkFactorAvailability?.status ?? 'seed-only';
  const row: FranchiseValueInputRow = {
    contractVersion: FRANCHISE_VALUE_INPUT_CONTRACT_VERSION,
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-1',
    statsScopeId: 'franchise-1-season-1',
    seasonNumber: 1,
    playerId: 'player-1',
    playerName: 'Trust Player',
    valuePosition: 'SS',
    currentTeamId: 'team-1',
    rosterStatus: 'MLB',
    salary: 8.5,
    contractYears: 2,
    salaryBaselineCalculationVersion: 'salary-v1',
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
      seedParkFactorsAvailable: parkStatus === 'seed-only',
      customParkFactorsAvailable: false,
      status: parkStatus,
      parkAdjustedValueInputsAvailable: false,
      ...overrides.parkFactorAvailability,
    },
    limitations: [],
    ...overrides,
  };
  const metadataReady = row.seasonContext.gamesPerTeam !== null && row.seasonContext.inningsPerGame !== null;
  const commonReady = row.currentTeamId !== null && row.rosterStatus === 'MLB' && metadataReady && row.seasonStatsAvailability.any;
  return {
    ...row,
    warConsumerTrust: row.warConsumerTrust ?? {
      teamMvpDesignations: commonReady && row.warInputAvailability.any && row.warPreviewValues.totalWar !== null,
      aceDesignations: commonReady && row.warInputAvailability.pitchingWar && row.warPreviewValues.pitchingWar !== null,
      fanFavoriteAlbatrossDesignations: false,
      awards: false,
      salaryMovement: false,
      trueValue: false,
      morale: false,
      mode3Handoff: false,
      blockers: commonReady ? [] : ['Fixture row does not meet scoped MLB WAR trust prerequisites.'],
      limitations: [
        'WAR consumer trust is limited to TEAM_MVP/ACE designation input gating; it does not trust final True Value, value delta, awards, salary movement, morale, relationships, or Mode 3.',
      ],
    },
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
    seasonContext: rows[0]?.seasonContext ?? {
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
        playerName: 'Trust Player',
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

function teamStint(overrides: Partial<FranchisePlayerTeamStatStint> = {}): FranchisePlayerTeamStatStint {
  return {
    id: 'franchise-1::franchise-1-season-1::franchise::team-1::player-1',
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-1',
    statsScopeId: 'franchise-1-season-1',
    competitionType: 'franchise',
    playerId: 'player-1',
    playerName: 'Trust Player',
    teamId: 'team-1',
    gameIds: ['game-1'],
    games: 1,
    firstGameDate: 100,
    lastGameDate: 100,
    batting: {
      games: 1,
      pa: 4,
      ab: 4,
      hits: 1,
      singles: 1,
      doubles: 0,
      triples: 0,
      homeRuns: 0,
      rbi: 0,
      runs: 0,
      walks: 0,
      strikeouts: 1,
      hitByPitch: 0,
      sacFlies: 0,
      sacBunts: 0,
      stolenBases: 0,
      caughtStealing: 0,
      gidp: 0,
    },
    pitching: {
      games: 0,
      gamesStarted: 0,
      outsRecorded: 0,
      hitsAllowed: 0,
      runsAllowed: 0,
      earnedRuns: 0,
      walksAllowed: 0,
      strikeouts: 0,
      homeRunsAllowed: 0,
      hitBatters: 0,
      wildPitches: 0,
      wins: 0,
      losses: 0,
      saves: 0,
      holds: 0,
      blownSaves: 0,
    },
    fielding: {
      games: 1,
      putouts: 1,
      assists: 0,
      errors: 0,
    },
    ...overrides,
  };
}

function reportForParkStatus(status: FranchiseValueParkFactorStatus) {
  return valueReport({
    rows: [valueRow({
      stadiumId: status === 'unadjusted' ? null : 'stadium-1',
      parkFactorAvailability: {
        stadiumIdAvailable: status !== 'unadjusted',
        seedParkFactorsAvailable: status === 'seed-only',
        customParkFactorsAvailable: false,
        status,
        parkAdjustedValueInputsAvailable: false,
      },
    })],
  });
}

describe('franchise analytics trust report', () => {
  test('trusts core franchise archive/stat scope for read-only reporting', () => {
    const report = buildFranchiseAnalyticsTrustReport({
      valueInputReport: valueReport(),
      completedGames: [completedGame()],
      teamStints: [teamStint()],
    });

    expect(report.contractVersion).toBe(FRANCHISE_ANALYTICS_TRUST_CONTRACT_VERSION);
    expect(report.coreStats).toMatchObject({
      status: 'trusted',
      seasonStatsRows: 1,
      completedArchiveRows: 1,
      scopedArchiveRows: 1,
      teamStintRows: 1,
    });
    expect(report.coreStats.reasons.join(' ')).toMatch(/franchiseId, seasonId, and statsScopeId/i);
  });

  test('does not trust archive or team stint rows missing explicit stats scope identity', () => {
    const report = buildFranchiseAnalyticsTrustReport({
      valueInputReport: valueReport(),
      completedGames: [
        completedGame({ statsScopeId: undefined }),
      ],
      teamStints: [
        teamStint({ statsScopeId: undefined }),
      ],
    });

    expect(report.coreStats).toMatchObject({
      status: 'preview-only',
      seasonStatsRows: 1,
      completedArchiveRows: 1,
      scopedArchiveRows: 0,
      teamStintRows: 0,
    });
    expect(report.downstreamConsumers.mode3Handoff.status).toBe('blocked');
  });

  test('score-only rows are trusted only for schedule and standings, not player analytics', () => {
    const report = buildFranchiseAnalyticsTrustReport({
      valueInputReport: valueReport(),
      scheduledGames: [scoreOnlyGame()],
    });

    expect(report.scoreOnlyBoundary).toMatchObject({
      status: 'trusted',
      scoreOnlyRows: 1,
      trustedForScheduleAndStandings: true,
      trustedForPlayerStats: false,
      trustedForWpa: false,
      trustedForWar: false,
      trustedForAwards: false,
      trustedForDesignations: false,
      trustedForSalaryMovement: false,
      trustedForMorale: false,
      trustedForRelationships: false,
      trustedForNarrative: false,
    });
    expect(report.scoreOnlyBoundary.limitations.join(' ')).toMatch(/do not create player archives/i);
  });

  test('does not trust score-only rows missing explicit stats scope identity', () => {
    const report = buildFranchiseAnalyticsTrustReport({
      valueInputReport: valueReport(),
      scheduledGames: [
        scoreOnlyGame({ statsScopeId: undefined }),
      ],
    });

    expect(report.scoreOnlyBoundary).toMatchObject({
      status: 'not-applicable',
      scoreOnlyRows: 0,
      trustedForScheduleAndStandings: false,
      trustedForPlayerStats: false,
      trustedForWpa: false,
      trustedForWar: false,
      trustedForAwards: false,
      trustedForDesignations: false,
      trustedForSalaryMovement: false,
      trustedForMorale: false,
      trustedForRelationships: false,
      trustedForNarrative: false,
    });
  });

  test('WPA and Manager WPA can be archive-backed but are not final value trusted', () => {
    const report = buildFranchiseAnalyticsTrustReport({
      valueInputReport: valueReport({
        rows: [valueRow({
          wpaInputAvailability: {
            playerWpa: true,
            managerWpa: true,
            archiveBacked: true,
            trustedForFinalValue: false,
          },
        })],
      }),
    });

    expect(report.wpa).toMatchObject({
      status: 'preview-only',
      playerWpaArchiveBacked: true,
      managerWpaArchiveBacked: true,
      finalValueTrusted: false,
    });
    expect(report.downstreamConsumers.salaryMovement.status).toBe('blocked');
  });

  test('WAR can be trusted only for MVP/Ace designation input gating while final consumers remain blocked', () => {
    const report = buildFranchiseAnalyticsTrustReport({
      valueInputReport: valueReport(),
    });

    expect(report.war).toMatchObject({
      status: 'trusted',
      warLikePreviewAvailable: true,
      trustedForTeamMvpDesignations: true,
      trustedForAceDesignations: false,
      trustedForFanFavoriteAlbatrossDesignations: false,
      trustedForAwards: false,
      trustedForSalaryMovement: false,
      trustedForTrueValue: false,
      trustedForMorale: false,
      trustedForMode3Handoff: false,
      finalWarTrusted: false,
      components: {
        batting: true,
        pitching: false,
        fielding: true,
        baserunning: true,
      },
    });
    expect(report.war.reasons.join(' ')).toMatch(/TEAM_MVP\/ACE designation input gating/i);
    expect(report.war.limitations.join(' ')).toMatch(/Final WAR remains untrusted/i);
  });

  test('D6 artifact-backed rows promote True Value and value-delta trust but not awards or final WAR', () => {
    const trustedRow = valueRow({
      warInputAvailability: {
        battingWar: true,
        pitchingWar: false,
        fieldingWar: true,
        baserunningWar: true,
        any: true,
        trustedForFinalValue: true,
      },
      warConsumerTrust: {
        teamMvpDesignations: false,
        aceDesignations: false,
        fanFavoriteAlbatrossDesignations: false,
        awards: false,
        salaryMovement: false,
        trueValue: true,
        morale: false,
        mode3Handoff: false,
        blockers: [],
        limitations: ['True Value trust is read only from the D6 trusted-value artifact.'],
      },
    });
    const report = buildFranchiseAnalyticsTrustReport({
      valueInputReport: valueReport({ rows: [trustedRow] }),
    });

    expect(report.war).toMatchObject({
      status: 'trusted',
      trustedForFanFavoriteAlbatrossDesignations: true,
      trustedForTrueValue: true,
      trustedForAwards: false,
      trustedForSalaryMovement: false,
      trustedForMorale: false,
      finalWarTrusted: false,
    });
  });

  test('missing season metadata blocks adaptive and final analytics trust', () => {
    const missingMetadataRow = valueRow({
      seasonContext: {
        seasonId: 'franchise-1-season-1',
        statsScopeId: 'franchise-1-season-1',
        seasonNumber: 1,
        gamesPerTeam: null,
        inningsPerGame: null,
        seasonLengthSource: 'missing',
        scheduleRowCount: 0,
        scheduleRowsUsedAsSeasonLength: false,
        seasonMetadataTotalGames: null,
      },
    });

    const report = buildFranchiseAnalyticsTrustReport({
      valueInputReport: valueReport({
        seasonContext: missingMetadataRow.seasonContext,
        rows: [missingMetadataRow],
      }),
    });

    expect(report.adaptiveStandards).toMatchObject({
      status: 'blocked',
      seasonLengthMetadataAvailable: false,
      inningsMetadataAvailable: false,
      consumerThresholdsProven: false,
    });
    expect(report.war).toMatchObject({
      status: 'preview-only',
      trustedForTeamMvpDesignations: false,
      trustedForAceDesignations: false,
      finalWarTrusted: false,
    });
    expect(report.adaptiveStandards.reasons.join(' ')).toMatch(/metadata is missing/i);
  });

  test('stored seed park factors classify differently from missing or custom-unavailable factors', () => {
    const seed = buildFranchiseAnalyticsTrustReport({ valueInputReport: reportForParkStatus('seed-only') });
    const customUnavailable = buildFranchiseAnalyticsTrustReport({ valueInputReport: reportForParkStatus('custom-unavailable') });
    const missing = buildFranchiseAnalyticsTrustReport({ valueInputReport: reportForParkStatus('unadjusted') });

    expect(seed.parkFactors).toMatchObject({
      status: 'trusted',
      seedParkFactorsAvailable: true,
      customParkFactorsAvailable: false,
      parkAdjustedAnalyticsTrusted: false,
    });
    expect(customUnavailable.parkFactors.status).toBe('preview-only');
    expect(missing.parkFactors.status).toBe('blocked');
  });

  test('downstream consumers keep narrow WAR trust separate from blocked final systems', () => {
    const report = buildFranchiseAnalyticsTrustReport({
      valueInputReport: valueReport(),
      completedGames: [completedGame()],
    });

    expect(report.downstreamConsumers.salaryMovement.status).toBe('blocked');
    expect(report.downstreamConsumers.dynamicDesignations.status).toBe('trusted');
    expect(report.downstreamConsumers.dynamicDesignations.reasons.join(' ')).toMatch(/TEAM_MVP\/ACE designation input gating/i);
    expect(report.downstreamConsumers.dynamicDesignations.limitations.join(' ')).toMatch(/Fan Favorite, Albatross/i);
    expect(report.downstreamConsumers.awards.status).toBe('preview-only');
    expect(report.downstreamConsumers.moraleRelationships.status).toBe('blocked');
    expect(report.downstreamConsumers.narrativeRandomEvents.status).toBe('blocked');
    expect(report.downstreamConsumers.mode3Handoff.status).toBe('preview-only');
    expect(report.limitations.join(' ')).toMatch(/does not calculate WAR, True Value, salary movement/i);
  });

  test('utility is read-only and exposes no persistable/recalculation approvals', () => {
    const report = buildFranchiseAnalyticsTrustReport({
      valueInputReport: valueReport(),
      completedGames: [completedGame()],
      scheduledGames: [scoreOnlyGame()],
    });

    expect(JSON.stringify(report)).not.toMatch(/persistable":true|recalculable":true/);
    expect(report.downstreamConsumers.salaryMovement.status).toBe('blocked');
    expect(report.downstreamConsumers.dynamicDesignations.limitations.join(' ')).toMatch(/No designation records are persistable/i);
  });
});
