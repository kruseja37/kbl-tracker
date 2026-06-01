import { describe, expect, test } from 'vitest';

import {
  buildFranchisePlayerContinuity,
  FRANCHISE_PLAYER_CONTINUITY_VERSION,
} from '../franchisePlayerContinuity';
import type { CompletedGameRecord } from '../gameStorage';
import type { Player } from '../leagueBuilderStorage';
import type { FranchisePlayerTeamStatStint } from '../franchiseStatAttribution';
import type { ScheduledGame } from '../scheduleStorage';
import type { TransactionLogEntry } from '../transactionStorage';

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-1',
    firstName: 'Jordan',
    lastName: 'Switch',
    gender: 'M',
    age: 25,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: '2B',
    power: 61,
    contact: 62,
    speed: 63,
    fielding: 64,
    arm: 65,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    arsenal: [],
    overallGrade: 'B',
    personality: 'Jolly',
    chemistry: 'Spirited',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 3000000,
    leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-current', rosterStatus: 'MLB' }],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    editHistory: [],
    isCustom: false,
    ...overrides,
  };
}

function tx(overrides: Partial<TransactionLogEntry> = {}): TransactionLogEntry {
  return {
    id: 'tx-1',
    timestamp: '2026-02-01T00:00:00.000Z',
    season: 2,
    gameNumber: null,
    phase: 'REGULAR_SEASON',
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-2',
    statsScopeId: 'franchise-1-season-2',
    type: 'call_up',
    actor: 'USER',
    data: {
      playerId: 'player-1',
      playerIds: ['player-1'],
      sourceTeamId: 'team-current',
      targetTeamId: 'team-current',
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
    gameId: 'game-log-1',
    date: 100,
    seasonId: 'franchise-1-season-2',
    statsScopeId: 'franchise-1-season-2',
    franchiseId: 'franchise-1',
    competitionType: 'franchise',
    competitionId: 'franchise-1',
    scheduleGameId: 'schedule-archive-1',
    seasonNumber: 2,
    awayTeamId: 'team-current',
    homeTeamId: 'team-opponent',
    awayTeamName: 'Current',
    homeTeamName: 'Opponent',
    finalScore: { away: 4, home: 2 },
    innings: 9,
    totalInnings: 9,
    fameEvents: [],
    playerStats: {
      'player-1': {
        playerName: 'Jordan Switch',
        teamId: 'team-current',
        pa: 4,
        ab: 4,
        h: 2,
        singles: 2,
        doubles: 0,
        triples: 0,
        hr: 0,
        rbi: 1,
        r: 1,
        bb: 0,
        hbp: 0,
        k: 1,
        sb: 0,
        cs: 0,
        sf: 0,
        sh: 0,
        gidp: 0,
        putouts: 1,
        assists: 2,
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
    seasonId: 'franchise-1-season-2',
    statsScopeId: 'franchise-1-season-2',
    seasonNumber: 2,
    gameNumber: 2,
    dayNumber: 2,
    awayTeamId: 'team-current',
    homeTeamId: 'team-opponent',
    status: 'COMPLETED',
    result: {
      awayScore: 3,
      homeScore: 1,
      winningTeamId: 'team-current',
      losingTeamId: 'team-opponent',
    },
    completionSource: 'score-only',
    resultEnteredAt: 110,
    scoreOnlyResultId: 'score-only-1',
    completedAt: 110,
    createdAt: 1,
    source: 'manual',
    ...overrides,
  };
}

function stint(overrides: Partial<FranchisePlayerTeamStatStint> = {}): FranchisePlayerTeamStatStint {
  return {
    id: 'franchise-1::franchise-1-season-2::franchise::team-current::player-1',
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-2',
    statsScopeId: 'franchise-1-season-2',
    competitionType: 'franchise',
    playerId: 'player-1',
    playerName: 'Jordan Switch',
    teamId: 'team-current',
    gameIds: ['game-log-1'],
    games: 1,
    firstGameDate: 100,
    lastGameDate: 100,
    batting: {
      games: 1,
      pa: 4,
      ab: 4,
      hits: 2,
      singles: 2,
      doubles: 0,
      triples: 0,
      homeRuns: 0,
      rbi: 1,
      runs: 1,
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
      assists: 2,
      errors: 0,
    },
    ...overrides,
  };
}

const baseInput = {
  franchiseId: 'franchise-1',
  seasonId: 'franchise-1-season-2',
  statsScopeId: 'franchise-1-season-2',
  seasonNumber: 2,
  teamId: 'team-current',
  leagueId: 'league-1',
};

describe('franchise player continuity projection', () => {
  test('profile edits appear as player-local changes, not official transactions', () => {
    const report = buildFranchisePlayerContinuity({
      ...baseInput,
      player: player({
        editHistory: [{
          field: 'nickname',
          oldValue: '',
          newValue: 'Switch',
          date: '2026-02-02T00:00:00.000Z',
          context: 'base',
        }],
      }),
      transactions: [tx({ id: 'other-player', data: { playerId: 'other-player' } })],
    });

    expect(report.contractVersion).toBe(FRANCHISE_PLAYER_CONTINUITY_VERSION);
    expect(report.profileEdits).toEqual([
      expect.objectContaining({
        kind: 'profile-edit',
        source: 'player.editHistory',
        playerLocalOnly: true,
        officialTransaction: false,
        field: 'nickname',
        oldValue: '—',
        newValue: 'Switch',
      }),
    ]);
    expect(report.rosterTransactions).toEqual([]);
  });

  test('call-up and send-down rows appear with playerId, team, and roster-status continuity', () => {
    const report = buildFranchisePlayerContinuity({
      ...baseInput,
      player: player(),
      transactions: [
        tx({
          id: 'send-down-1',
          timestamp: '2026-02-03T00:00:00.000Z',
          type: 'send_down',
          data: {
            playerId: 'player-1',
            playerIds: ['player-1'],
            sourceTeamId: 'team-current',
            targetTeamId: 'team-current',
            sourceRosterStatus: 'MLB',
            targetRosterStatus: 'FARM',
          },
        }),
        tx({
          id: 'call-up-1',
          timestamp: '2026-02-04T00:00:00.000Z',
          type: 'call_up',
        }),
      ],
    });

    expect(report.rosterTransactions.map((entry) => entry.transactionId)).toEqual(['call-up-1', 'send-down-1']);
    expect(report.rosterTransactions[0]).toMatchObject({
      playerId: 'player-1',
      sourceTeamId: 'team-current',
      targetTeamId: 'team-current',
      targetRosterStatus: 'MLB',
    });
    expect(report.rosterTransactions[1]).toMatchObject({
      transactionType: 'send_down',
      sourceRosterStatus: 'MLB',
      targetRosterStatus: 'FARM',
    });
  });

  test('manual trade row follows playerId across source and target teams', () => {
    const report = buildFranchisePlayerContinuity({
      ...baseInput,
      player: player({
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-target', rosterStatus: 'MLB' }],
      }),
      teamId: 'team-target',
      transactions: [
        tx({
          id: 'trade-1',
          type: 'trade',
          data: {
            sourceTeamId: 'team-source',
            targetTeamId: 'team-target',
            playerIds: ['player-1', 'incoming-1'],
            playersFromSource: ['player-1'],
            playersFromTarget: ['incoming-1'],
            sourcePlayers: [{
              playerId: 'player-1',
              playerName: 'Jordan Switch',
              previousTeamId: 'team-source',
              newTeamId: 'team-target',
              rosterStatus: 'MLB',
            }],
          },
        }),
      ],
    });

    expect(report.rosterTransactions).toHaveLength(1);
    expect(report.rosterTransactions[0]).toMatchObject({
      transactionType: 'trade',
      playerIds: ['player-1', 'incoming-1'],
      sourceTeamId: 'team-source',
      targetTeamId: 'team-target',
    });
    expect(report.knownTeamIds).toEqual(expect.arrayContaining(['team-source', 'team-target']));
  });

  test('GameTracker archive-backed evidence includes game, schedule, team, and scope identity', () => {
    const report = buildFranchisePlayerContinuity({
      ...baseInput,
      player: player(),
      completedGames: [completedGame()],
    });

    expect(report.gameEvidence).toEqual([
      expect.objectContaining({
        kind: 'game-archive',
        archiveBacked: true,
        playerStatsAvailable: true,
        gameId: 'game-log-1',
        gameLogId: 'game-log-1',
        scheduleGameId: 'schedule-archive-1',
        teamId: 'team-current',
        opponentTeamId: 'team-opponent',
        statsScopeId: 'franchise-1-season-2',
        competitionType: 'franchise',
      }),
    ]);
  });

  test('score-only schedule result is team context only with no archive/player-stat claim', () => {
    const report = buildFranchisePlayerContinuity({
      ...baseInput,
      player: player(),
      scheduledGames: [
        scoreOnlyGame(),
        scoreOnlyGame({
          id: 'other-team-score-only',
          awayTeamId: 'other-a',
          homeTeamId: 'other-b',
        }),
      ],
    });

    expect(report.scoreOnlyResults).toEqual([
      expect.objectContaining({
        kind: 'score-only-schedule',
        source: 'scheduledGames',
        scheduleGameId: 'schedule-score-only-1',
        archiveBacked: false,
        playerStatsAvailable: false,
        teamContextIds: ['team-current'],
      }),
    ]);
    expect(report.scoreOnlyResults[0].label).toMatch(/no player archive or player stats/i);
  });

  test('team stints preserve historical team context', () => {
    const report = buildFranchisePlayerContinuity({
      ...baseInput,
      player: player({
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-current', rosterStatus: 'MLB' }],
      }),
      teamStints: [
        stint({ teamId: 'team-old', gameIds: ['pre-trade'], games: 1, firstGameDate: 10, lastGameDate: 10 }),
        stint({ teamId: 'team-current', gameIds: ['post-trade'], games: 1, firstGameDate: 20, lastGameDate: 20 }),
      ],
    });

    expect(report.teamStints.map((entry) => ({
      teamId: entry.teamId,
      gameIds: entry.gameIds,
    }))).toEqual([
      { teamId: 'team-current', gameIds: ['post-trade'] },
      { teamId: 'team-old', gameIds: ['pre-trade'] },
    ]);
    expect(report.knownTeamIds).toEqual(expect.arrayContaining(['team-old', 'team-current']));
  });

  test('unrevealed FARM continuity redacts or omits sensitive hidden fields', () => {
    const report = buildFranchisePlayerContinuity({
      ...baseInput,
      player: player({
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-current', rosterStatus: 'FARM' }],
        ratingRevealState: 'hidden',
        prospectProfile: {
          scoutedGrade: 'B',
          trueGrade: 'S',
          hiddenScoutTruth: { exact: 99 },
        },
        hiddenPersonalityModifiers: { leadership: 99 },
        editHistory: [
          { field: 'firstName', oldValue: 'Farm', newValue: 'Visible', date: '2026-01-01T00:00:00.000Z', context: 'base' },
          { field: 'power', oldValue: 20, newValue: 99, date: '2026-01-02T00:00:00.000Z', context: 'base' },
          { field: 'trueGrade', oldValue: 'C', newValue: 'S', date: '2026-01-03T00:00:00.000Z', context: 'base' },
          { field: 'hiddenPersonalityModifiers', oldValue: { leadership: 10 }, newValue: { leadership: 99 }, date: '2026-01-04T00:00:00.000Z', context: 'base' },
        ],
      } as Partial<Player>),
      farmRecord: {
        id: 'farm-record-1',
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-2',
        seasonNumber: 2,
        teamId: 'team-current',
        playerId: 'player-1',
        rosterLevel: 'AAA',
        rosterStatus: 'FARM',
        optionsUsed: 0,
        optionDates: [],
        ratingRevealState: 'hidden',
        assignedAt: '2026-01-01T00:00:00.000Z',
        lastModified: '2026-01-01T00:00:00.000Z',
      },
    });

    const serialized = JSON.stringify(report);
    expect(report.hiddenSafe).toBe(true);
    expect(report.profileEdits).toEqual([
      expect.objectContaining({
        field: 'firstName',
        oldValue: 'Farm',
        newValue: 'Visible',
      }),
    ]);
    expect(serialized).not.toContain('trueGrade');
    expect(serialized).not.toContain('hiddenPersonalityModifiers');
    expect(serialized).not.toContain('leadership');
    expect(serialized).not.toContain('99');
    expect(report.limitations.join(' ')).toMatch(/hidden-safe/i);
  });
});
