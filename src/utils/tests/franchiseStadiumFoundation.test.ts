import { describe, expect, test, vi } from 'vitest';

import {
  buildFranchiseStadiumFoundationReport,
  filterAndSortFranchiseSprayChartRows,
  FRANCHISE_STADIUM_FOUNDATION_CONTRACT_VERSION,
} from '../franchiseStadiumFoundation';
import { getDerivedParkFactorsIfAvailable } from '../../engines/parkFactorDeriver';
import type { AtBatEvent, FieldingEvent } from '../eventLog';
import type { CompletedGameRecord } from '../gameStorage';
import type { FranchiseTeamStadiumSnapshot } from '../../types/franchise';
import type { ParkFactors } from '../../types/war';

const scope = {
  franchiseId: 'franchise-1',
  seasonId: 'franchise-1-season-1',
  statsScopeId: 'franchise-1-season-1',
  seasonNumber: 1,
};

const seedParkFactors: ParkFactors = {
  stadiumId: 'apple-field',
  stadiumName: 'Apple Field',
  overall: 1.02,
  runs: 1.01,
  homeRuns: 0.99,
  hits: 1,
  doubles: 1,
  triples: 1,
  strikeouts: 1,
  walks: 1,
  leftHandedHR: 1,
  rightHandedHR: 1,
  leftHandedAVG: 1,
  rightHandedAVG: 1,
  gamesIncluded: 0,
  lastUpdated: 'seed',
  confidence: 'LOW',
  source: 'SEED',
};

const trustedAppleSeedParkFactors = getDerivedParkFactorsIfAvailable('Apple Field')!;

function completedGame(overrides: Partial<CompletedGameRecord> = {}): CompletedGameRecord {
  return {
    gameId: 'game-1',
    date: 100,
    ...scope,
    competitionType: 'franchise',
    competitionId: 'franchise-1',
    awayTeamId: 'team-away',
    homeTeamId: 'team-home',
    awayTeamName: 'Away Club',
    homeTeamName: 'Home Club',
    stadiumName: 'Apple Field',
    stadiumId: 'apple-field',
    parkFactors: seedParkFactors,
    finalScore: { away: 4, home: 3 },
    innings: 6,
    totalInnings: 6,
    fameEvents: [],
    playerStats: {},
    pitcherGameStats: [],
    aggregationStatus: 'aggregated',
    ...overrides,
  };
}

function atBat(overrides: Partial<AtBatEvent> = {}): AtBatEvent {
  return {
    eventId: 'game-1-1',
    gameId: 'game-1',
    eventIndex: 1,
    timestamp: 101,
    batterId: 'batter-1',
    batterName: 'Batter One',
    batterTeamId: 'team-away',
    pitcherId: 'pitcher-1',
    pitcherName: 'Pitcher One',
    pitcherTeamId: 'team-home',
    result: '1B',
    rbiCount: 0,
    runsScored: [],
    inning: 1,
    halfInning: 'TOP',
    outs: 0,
    runners: { first: null, second: null, third: null },
    awayScore: 0,
    homeScore: 0,
    outsAfter: 0,
    runnersAfter: { first: { runnerId: 'batter-1', runnerName: 'Batter One', responsiblePitcherId: 'pitcher-1' }, second: null, third: null },
    awayScoreAfter: 0,
    homeScoreAfter: 0,
    leverageIndex: 1,
    winProbabilityBefore: 0.5,
    winProbabilityAfter: 0.48,
    wpa: 0.02,
    ballInPlay: {
      trajectory: 'line',
      zone: 0,
      velocity: 'hard',
      fielderIds: ['fielder-1'],
      primaryFielderId: 'fielder-1',
    },
    fameEvents: [],
    isLeadoff: true,
    isClutch: false,
    isWalkOff: false,
    ...scope,
    parkContext: {
      stadiumId: 'apple-field',
      stadiumName: 'Apple Field',
      parkFactors: seedParkFactors,
    },
    teamContext: {
      battingTeam: { teamId: 'team-away', teamName: 'Away Club' },
      fieldingTeam: { teamId: 'team-home', teamName: 'Home Club' },
    },
    batterContext: {
      playerId: 'batter-1',
      playerName: 'Batter One',
      handedness: 'R',
    },
    pitcherContext: {
      playerId: 'pitcher-1',
      playerName: 'Pitcher One',
      handedness: 'L',
    },
    enrichment: {
      fieldLocation: { x: 74, y: 48, zone: 'Z05' },
      exitType: 'line_drive',
    },
    ...overrides,
  } as AtBatEvent;
}

function fieldingEvent(overrides: Partial<FieldingEvent> = {}): FieldingEvent {
  return {
    fieldingEventId: 'fielding-1',
    gameId: 'game-1',
    atBatEventId: 'game-1-1',
    sequence: 0,
    playerId: 'fielder-1',
    playerName: 'Fielder One',
    position: 'RF',
    teamId: 'team-home',
    playType: 'putout',
    difficulty: 'routine',
    ballInPlay: {
      trajectory: 'fly',
      zone: 5,
      velocity: 'medium',
      fielderIds: ['fielder-1'],
      primaryFielderId: 'fielder-1',
    },
    success: true,
    runsPreventedOrAllowed: 0,
    ...overrides,
  };
}

function stadiumSnapshot(overrides: Partial<FranchiseTeamStadiumSnapshot> = {}): FranchiseTeamStadiumSnapshot {
  return {
    teamId: 'team-home',
    teamName: 'Home Club',
    stadium: 'Apple Field',
    stadiumId: 'apple-field',
    hasSeedParkFactors: true,
    ...overrides,
  };
}

describe('franchise stadium foundation', () => {
  test('builds a read-only stadium report from scoped stadium snapshots and completed archives', () => {
    vi.setSystemTime(new Date('2026-06-02T12:00:00.000Z'));

    const report = buildFranchiseStadiumFoundationReport({
      ...scope,
      stadiumSnapshots: [stadiumSnapshot()],
      completedGames: [completedGame()],
      atBatEvents: [atBat()],
      fieldingEvents: [fieldingEvent()],
    });

    expect(report.contractVersion).toBe(FRANCHISE_STADIUM_FOUNDATION_CONTRACT_VERSION);
    expect(report.scope.status).toBe('trusted');
    expect(report.stadiumIdentity.status).toBe('trusted');
    expect(report.stadiumIdentity.stadiums).toHaveLength(1);
    expect(report.stadiumIdentity.stadiums[0]).toMatchObject({
      stadiumId: 'apple-field',
      stadiumName: 'Apple Field',
      teamId: 'team-home',
      archiveGameRows: 1,
      sprayEventRows: 3,
      seedParkFactorsTrusted: true,
      adaptiveParkFactorPreview: {
        status: 'preview-only',
        gamesIncluded: 1,
        trustedForPersistence: false,
      },
      stadiumRecords: {
        status: 'blocked',
        persisted: false,
      },
    });
    expect(report.stadiumIdentity.stadiums[0].dimensions).toMatchObject({
      name: 'Apple Field',
      lf: 337,
      cf: 419,
      rf: 347,
    });
    expect(report.parkFactors).toMatchObject({
      status: 'trusted',
      seedFactorsTrusted: true,
      adaptiveFactorsPreviewOnly: true,
      adaptiveFactorsPersisted: false,
    });
  });

  test('trusts SMB4 stadium dimensions and seed factors from copied Mode 1 snapshots without archive games', () => {
    const report = buildFranchiseStadiumFoundationReport({
      ...scope,
      stadiumSnapshots: [stadiumSnapshot()],
      completedGames: [],
      atBatEvents: [],
      fieldingEvents: [],
    });

    expect(report.stadiumIdentity.status).toBe('trusted');
    expect(report.stadiumIdentity.reasons.join(' ')).toContain('Mode 1 handoff snapshots');
    expect(report.stadiumIdentity.stadiums[0]).toMatchObject({
      stadiumId: 'apple-field',
      stadiumName: 'Apple Field',
      teamId: 'team-home',
      archiveGameRows: 0,
      sprayEventRows: 0,
      seedParkFactorsTrusted: true,
      seedParkFactors: {
        stadiumName: 'Apple Field',
        source: 'SEED',
      },
      adaptiveParkFactorPreview: {
        status: 'not-applicable',
        gamesIncluded: 0,
        trustedForPersistence: false,
      },
    });
    expect(report.stadiumIdentity.stadiums[0].dimensions).toMatchObject({
      name: 'Apple Field',
      lf: 337,
      cf: 419,
      rf: 347,
    });
    expect(report.parkFactors.status).toBe('trusted');
    expect(report.parkFactors.seedFactorsTrusted).toBe(true);
  });

  test('trusts valid SMB4 seed park factors from scoped completed-game archives', () => {
    const report = buildFranchiseStadiumFoundationReport({
      ...scope,
      stadiumSnapshots: [],
      completedGames: [
        completedGame({
          parkFactors: trustedAppleSeedParkFactors,
        }),
      ],
      atBatEvents: [],
      fieldingEvents: [],
    });

    expect(report.stadiumIdentity.status).toBe('trusted');
    expect(report.stadiumIdentity.stadiums[0]).toMatchObject({
      stadiumId: 'apple-field',
      stadiumName: 'Apple Field',
      archiveGameRows: 1,
      seedParkFactorsTrusted: true,
      seedParkFactors: {
        stadiumId: 'apple-field',
        stadiumName: 'Apple Field',
        source: 'SEED',
      },
      dimensions: {
        name: 'Apple Field',
      },
    });
    expect(report.parkFactors.status).toBe('trusted');
    expect(report.parkFactors.seedFactorsTrusted).toBe(true);
  });

  test('blocks malformed archive park factors from creating seed trust', () => {
    const report = buildFranchiseStadiumFoundationReport({
      ...scope,
      stadiumSnapshots: [],
      completedGames: [
        completedGame({
          parkFactors: {
            ...trustedAppleSeedParkFactors,
            source: 'SEED',
            homeRuns: 1.3,
          },
        }),
      ],
      atBatEvents: [],
      fieldingEvents: [],
    });

    expect(report.stadiumIdentity.status).toBe('trusted');
    expect(report.stadiumIdentity.stadiums[0]).toMatchObject({
      stadiumId: 'apple-field',
      stadiumName: 'Apple Field',
      archiveGameRows: 1,
      dimensions: {
        name: 'Apple Field',
      },
      seedParkFactors: null,
      seedParkFactorsTrusted: false,
      adaptiveParkFactorPreview: {
        status: 'preview-only',
        gamesIncluded: 1,
        trustedForPersistence: false,
      },
    });
    expect(report.parkFactors.status).toBe('blocked');
    expect(report.parkFactors.seedFactorsTrusted).toBe(false);
  });

  test('blocks custom archive park factors while preserving copied custom stadium context', () => {
    const report = buildFranchiseStadiumFoundationReport({
      ...scope,
      stadiumSnapshots: [],
      completedGames: [
        completedGame({
          stadiumName: 'Custom Backyard',
          stadiumId: 'custom-backyard',
          parkFactors: {
            ...trustedAppleSeedParkFactors,
            stadiumId: 'custom-backyard',
            stadiumName: 'Custom Backyard',
            source: 'SEED',
          },
        }),
      ],
      atBatEvents: [],
      fieldingEvents: [],
    });

    expect(report.stadiumIdentity.status).toBe('trusted');
    expect(report.stadiumIdentity.stadiums[0]).toMatchObject({
      stadiumId: 'custom-backyard',
      stadiumName: 'Custom Backyard',
      archiveGameRows: 1,
      dimensions: null,
      seedParkFactors: null,
      seedParkFactorsTrusted: false,
    });
    expect(report.parkFactors.status).toBe('blocked');
    expect(report.parkFactors.reasons.join(' ')).toContain('Seed/static park factors are unavailable');
  });

  test('copies unmatched League Builder stadium names but blocks dimensions and seed factors', () => {
    const report = buildFranchiseStadiumFoundationReport({
      ...scope,
      stadiumSnapshots: [
        stadiumSnapshot({
          stadium: 'Custom Backyard',
          stadiumId: 'custom-backyard',
          hasSeedParkFactors: false,
        }),
      ],
      completedGames: [],
      atBatEvents: [],
      fieldingEvents: [],
    });

    expect(report.stadiumIdentity.status).toBe('trusted');
    expect(report.stadiumIdentity.stadiums[0]).toMatchObject({
      stadiumId: 'custom-backyard',
      stadiumName: 'Custom Backyard',
      dimensions: null,
      seedParkFactors: null,
      seedParkFactorsTrusted: false,
      archiveGameRows: 0,
      sprayEventRows: 0,
    });
    expect(report.parkFactors.status).toBe('blocked');
    expect(report.parkFactors.reasons.join(' ')).toContain('Seed/static park factors are unavailable');
    expect(report.parkFactors.limitations.join(' ')).toContain('No scoped archive sample exists yet');
  });

  test('projects batting, pitching, and fielding spray rows from scoped archive event evidence', () => {
    const report = buildFranchiseStadiumFoundationReport({
      ...scope,
      stadiumSnapshots: [stadiumSnapshot()],
      completedGames: [completedGame()],
      atBatEvents: [atBat()],
      fieldingEvents: [fieldingEvent()],
    });

    expect(report.sprayCharts.status).toBe('trusted');
    expect(report.sprayCharts.source).toBe('completed-game-archive-events');
    expect(report.sprayCharts.summary).toMatchObject({
      rows: 3,
      battingRows: 1,
      pitchingRows: 1,
      fieldingRows: 1,
      stadiumIds: ['apple-field'],
      teamIds: ['team-away', 'team-home'],
    });
    expect(report.sprayCharts.trustedForBatting).toBe(true);
    expect(report.sprayCharts.trustedForPitching).toBe(true);
    expect(report.sprayCharts.trustedForFielding).toBe(true);

    const batting = report.sprayCharts.rows.find((row) => row.role === 'batting');
    expect(batting).toMatchObject({
      playerId: 'batter-1',
      teamId: 'team-away',
      stadiumId: 'apple-field',
      zoneId: 'Z05',
      zoneName: 'Shallow RF',
      direction: 'oppo',
      depth: 'shallow',
      outcome: '1B',
    });

    const pitching = report.sprayCharts.rows.find((row) => row.role === 'pitching');
    expect(pitching).toMatchObject({
      playerId: 'pitcher-1',
      teamId: 'team-home',
      opponentTeamId: 'team-away',
      batterId: 'batter-1',
    });

    const fielding = report.sprayCharts.rows.find((row) => row.role === 'fielding');
    expect(fielding).toMatchObject({
      playerId: 'fielder-1',
      teamId: 'team-home',
      source: 'fielding-event',
      outcome: 'putout',
      zoneId: 'legacy-5',
      zoneName: 'Legacy zone 5',
    });
  });

  test('maps legacy name-as-id archive spray events to the selected stable stadium id', () => {
    const report = buildFranchiseStadiumFoundationReport({
      ...scope,
      stadiumSnapshots: [stadiumSnapshot()],
      completedGames: [completedGame()],
      atBatEvents: [
        atBat({
          parkContext: {
            stadiumId: 'Apple Field',
            stadiumName: 'Apple Field',
            parkFactors: seedParkFactors,
          },
        }),
      ],
      fieldingEvents: [],
    });

    expect(report.sprayCharts.status).toBe('trusted');
    expect(report.sprayCharts.summary).toMatchObject({
      rows: 2,
      battingRows: 1,
      pitchingRows: 1,
      fieldingRows: 0,
      stadiumIds: ['apple-field'],
    });
    expect(filterAndSortFranchiseSprayChartRows(report.sprayCharts.rows, {
      stadiumId: 'apple-field',
    })).toHaveLength(2);
    expect(filterAndSortFranchiseSprayChartRows(report.sprayCharts.rows, {
      stadiumId: 'Apple Field',
    })).toHaveLength(0);
    expect(report.stadiumIdentity.stadiums[0]).toMatchObject({
      stadiumId: 'apple-field',
      sprayEventRows: 2,
    });
  });

  test('strictly excludes mismatched franchise season or stats scope event evidence', () => {
    const report = buildFranchiseStadiumFoundationReport({
      ...scope,
      stadiumSnapshots: [stadiumSnapshot()],
      completedGames: [
        completedGame({ gameId: 'other-game', statsScopeId: 'other-scope' }),
      ],
      atBatEvents: [
        atBat({ gameId: 'other-game', eventId: 'other-event', statsScopeId: 'other-scope' }),
      ],
      fieldingEvents: [
        fieldingEvent({ gameId: 'other-game', atBatEventId: 'other-event' }),
      ],
    });

    expect(report.sprayCharts.status).toBe('blocked');
    expect(report.sprayCharts.summary.rows).toBe(0);
    expect(report.stadiumIdentity.stadiums[0]).toMatchObject({
      archiveGameRows: 0,
      sprayEventRows: 0,
      adaptiveParkFactorPreview: {
        status: 'not-applicable',
        trustedForPersistence: false,
      },
    });
  });

  test('excludes orphan fielding events that lack a linked scoped at-bat', () => {
    const report = buildFranchiseStadiumFoundationReport({
      ...scope,
      stadiumSnapshots: [stadiumSnapshot()],
      completedGames: [completedGame()],
      atBatEvents: [],
      fieldingEvents: [
        fieldingEvent({
          fieldingEventId: 'orphan-fielding',
          atBatEventId: 'missing-at-bat',
        }),
      ],
    });

    expect(report.sprayCharts.summary.fieldingRows).toBe(0);
    expect(report.sprayCharts.rows).toEqual([]);
    expect(report.stadiumIdentity.stadiums[0]).toMatchObject({
      archiveGameRows: 1,
      sprayEventRows: 0,
    });
  });

  test('supports v1 spray chart filtering and sorting by role team player stadium handedness outcome and zone', () => {
    const report = buildFranchiseStadiumFoundationReport({
      ...scope,
      stadiumSnapshots: [stadiumSnapshot()],
      completedGames: [completedGame()],
      atBatEvents: [
        atBat({ eventId: 'game-1-2', timestamp: 102, result: 'HR', batterId: 'batter-2', batterName: 'Batter Two', batterContext: { playerId: 'batter-2', playerName: 'Batter Two', handedness: 'L' } }),
        atBat(),
      ],
      fieldingEvents: [fieldingEvent()],
    });

    expect(filterAndSortFranchiseSprayChartRows(report.sprayCharts.rows, {
      role: 'batting',
      teamId: 'team-away',
      stadiumId: 'apple-field',
      handedness: 'L',
      outcome: 'HR',
      zoneId: 'Z05',
    }).map((row) => row.playerId)).toEqual(['batter-2']);

    expect(filterAndSortFranchiseSprayChartRows(report.sprayCharts.rows, {
      playerId: 'pitcher-1',
      sortBy: 'outcome',
      sortDirection: 'desc',
    }).map((row) => row.role)).toEqual(['pitching', 'pitching']);

    expect(filterAndSortFranchiseSprayChartRows(report.sprayCharts.rows, {
      role: 'fielding',
      zoneId: 'legacy-5',
      sortBy: 'player',
    }).map((row) => row.playerName)).toEqual(['Fielder One']);
  });

  test('does not enable random events morale mutation or adaptive factor persistence', () => {
    const report = buildFranchiseStadiumFoundationReport({
      ...scope,
      stadiumSnapshots: [stadiumSnapshot()],
      completedGames: [completedGame()],
      atBatEvents: [atBat()],
      fieldingEvents: [fieldingEvent()],
    });

    expect(report.downstreamConsumers.randomEventGenerator.status).toBe('preview-only');
    expect(report.downstreamConsumers.randomEventGenerator.limitations.join(' ')).toContain('No random-event generation');
    expect(report.downstreamConsumers.fanPlayerMorale.status).toBe('preview-only');
    expect(report.downstreamConsumers.fanPlayerMorale.limitations.join(' ')).toContain('No fan morale or player morale mutation');
    expect(report.parkFactors.adaptiveFactorsPersisted).toBe(false);
  });
});
