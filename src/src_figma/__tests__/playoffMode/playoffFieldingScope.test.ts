import { describe, expect, it } from 'vitest';

import {
  attachFieldingMetricsToPlayoffStats,
  buildPlayoffFieldingScopeQuery,
  type PlayoffConfig,
  type PlayoffPlayerStats,
} from '../../../utils/playoffStorage';
import type { FieldingEvent } from '../../../utils/eventLog';

function createPlayoffStats(overrides: Partial<PlayoffPlayerStats>): PlayoffPlayerStats {
  return {
    id: 'playoff-1-player-1',
    playoffId: 'playoff-1',
    playerId: 'player-1',
    playerName: 'Short Stop',
    teamId: 'TEAM-A',
    games: 3,
    atBats: 10,
    hits: 3,
    doubles: 1,
    triples: 0,
    homeRuns: 0,
    rbi: 2,
    runs: 1,
    walks: 1,
    strikeouts: 2,
    stolenBases: 0,
    caughtStealing: 0,
    avg: 0.3,
    obp: 0.364,
    slg: 0.4,
    ops: 0.764,
    ...overrides,
  };
}

function createFieldingEvent(overrides: Partial<FieldingEvent>): FieldingEvent {
  return {
    fieldingEventId: 'fe-1',
    gameId: 'game-1',
    atBatEventId: 'ab-1',
    sequence: 1,
    playerId: 'player-1',
    playerName: 'Short Stop',
    position: 'SS',
    teamId: 'TEAM-A',
    playType: 'putout',
    difficulty: 'routine',
    ballInPlay: {
      trajectory: 'ground',
      zone: 6,
      velocity: 'medium',
      fielderIds: ['player-1'],
      primaryFielderId: 'player-1',
    },
    success: true,
    runsPreventedOrAllowed: 0.12,
    ...overrides,
  };
}

describe('buildPlayoffFieldingScopeQuery', () => {
  it('uses playoff competition scope for franchise playoffs', () => {
    const playoff: PlayoffConfig = {
      id: 'playoff-1',
      seasonNumber: 2,
      seasonId: 'franchise-7-season-2',
      status: 'IN_PROGRESS',
      teamsQualifying: 8,
      rounds: 3,
      gamesPerRound: [3, 5, 7],
      inningsPerGame: 9,
      useDH: true,
      leagues: ['Eastern', 'Western'],
      conferenceChampionship: true,
      teams: [],
      currentRound: 2,
      createdAt: 1,
    };

    expect(buildPlayoffFieldingScopeQuery(playoff)).toEqual({
      statsScopeId: 'franchise-7-season-2',
      competitionType: 'playoff',
      competitionId: 'playoff-1',
      isComplete: true,
    });
  });

  it('uses elimination competition identity for bracket-local elimination reads', () => {
    const playoff: PlayoffConfig = {
      id: 'playoff-9',
      seasonNumber: 1,
      seasonId: 'elimination-elim-9',
      status: 'IN_PROGRESS',
      teamsQualifying: 8,
      rounds: 3,
      gamesPerRound: [1, 1, 1],
      inningsPerGame: 9,
      useDH: true,
      leagues: ['Eastern', 'Western'],
      conferenceChampionship: true,
      teams: [],
      currentRound: 1,
      sourceType: 'elimination',
      eliminationId: 'elim-9',
      createdAt: 1,
    };

    expect(buildPlayoffFieldingScopeQuery(playoff)).toEqual({
      statsScopeId: 'elimination-elim-9',
      competitionType: 'elimination',
      competitionId: 'elim-9',
      isComplete: true,
    });
  });
});

describe('attachFieldingMetricsToPlayoffStats', () => {
  it('adds bracket-local fielding metrics from direct stable-id events', () => {
    const stats = [
      createPlayoffStats({ playerId: 'player-1', playerName: 'Short Stop', teamId: 'TEAM-A', games: 3 }),
      createPlayoffStats({ id: 'playoff-1-player-2', playerId: 'player-2', playerName: 'Third Base', teamId: 'TEAM-A', games: 3 }),
    ];
    const events = [
      createFieldingEvent({ fieldingEventId: 'fe-1', playerId: 'player-1', position: 'SS', playType: 'putout' }),
      createFieldingEvent({ fieldingEventId: 'fe-2', playerId: 'player-1', position: 'SS', playType: 'assist' }),
      createFieldingEvent({
        fieldingEventId: 'fe-3',
        playerId: 'player-1',
        position: 'SS',
        playType: 'error',
        success: false,
        runsPreventedOrAllowed: -0.25,
      }),
      createFieldingEvent({ fieldingEventId: 'fe-4', playerId: 'player-2', position: '3B', teamId: 'TEAM-A' }),
      createFieldingEvent({
        fieldingEventId: 'fe-legacy',
        playerId: 'SS',
        playerName: 'Legacy Shortstop',
        position: 'SS',
        teamId: 'TEAM-A',
      }),
    ];

    const [shortStop, thirdBase] = attachFieldingMetricsToPlayoffStats(stats, events);

    expect(shortStop.fieldingPrimaryPosition).toBe('SS');
    expect(shortStop.fieldingPlays).toBe(3);
    expect(shortStop.fieldingErrors).toBe(1);
    expect(shortStop.fieldingRunsSaved).toBeTypeOf('number');
    expect(shortStop.fieldingWAR).toBeTypeOf('number');

    expect(thirdBase.fieldingPrimaryPosition).toBe('3B');
    expect(thirdBase.fieldingPlays).toBe(1);
    expect(thirdBase.fieldingErrors).toBe(0);
  });

  it('leaves playoff stats untouched when no direct stable-id fielding events exist', () => {
    const stats = [createPlayoffStats({ playerId: 'player-1', teamId: 'TEAM-A' })];
    const events = [
      createFieldingEvent({
        fieldingEventId: 'fe-legacy',
        playerId: 'SS',
        playerName: 'Legacy Shortstop',
        position: 'SS',
        teamId: 'TEAM-A',
      }),
    ];

    const [player] = attachFieldingMetricsToPlayoffStats(stats, events);

    expect(player.fieldingPrimaryPosition).toBeUndefined();
    expect(player.fieldingWAR).toBeUndefined();
    expect(player.fieldingPlays).toBeUndefined();
  });
});
