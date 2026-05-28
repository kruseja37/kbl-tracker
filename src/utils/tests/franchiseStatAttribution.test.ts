import { describe, expect, test } from 'vitest';

import {
  buildFranchisePlayerTeamStatStints,
} from '../franchiseStatAttribution';
import type { CompletedGameRecord } from '../gameStorage';

function game(
  overrides: Partial<CompletedGameRecord> = {},
): CompletedGameRecord {
  return {
    gameId: 'game-1',
    date: 1,
    seasonId: 'franchise-a-season-1',
    statsScopeId: 'franchise-a-season-1',
    franchiseId: 'franchise-a',
    competitionType: 'franchise',
    competitionId: 'franchise-a',
    seasonNumber: 1,
    awayTeamId: 'team-a',
    homeTeamId: 'team-b',
    awayTeamName: 'Team A',
    homeTeamName: 'Team B',
    finalScore: { away: 3, home: 2 },
    innings: 9,
    fameEvents: [],
    playerStats: {},
    pitcherGameStats: [],
    activityLog: [],
    inningScores: [],
    aggregationStatus: 'aggregated',
    ...overrides,
  };
}

function batter(
  playerName: string,
  teamId: string,
  overrides: Partial<CompletedGameRecord['playerStats'][string]> = {},
): CompletedGameRecord['playerStats'][string] {
  return {
    playerName,
    teamId,
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
    ...overrides,
  };
}

function pitcher(
  pitcherId: string,
  pitcherName: string,
  teamId: string,
  overrides: Partial<CompletedGameRecord['pitcherGameStats'][number]> = {},
): CompletedGameRecord['pitcherGameStats'][number] {
  return {
    pitcherId,
    pitcherName,
    teamId,
    isStarter: true,
    entryInning: 1,
    outsRecorded: 18,
    hitsAllowed: 3,
    runsAllowed: 1,
    earnedRuns: 1,
    walksAllowed: 1,
    strikeoutsThrown: 6,
    homeRunsAllowed: 0,
    hitBatters: 0,
    basesReachedViaError: 0,
    wildPitches: 0,
    pitchCount: 88,
    battersFaced: 24,
    consecutiveHRsAllowed: 0,
    firstInningRuns: 0,
    basesLoadedWalks: 0,
    inningsComplete: 6,
    decision: 'W',
    save: false,
    hold: false,
    blownSave: false,
    ...overrides,
  };
}

describe('franchise stat attribution projection', () => {
  test('keeps regular-season team stints explicit across a post-trade team change', () => {
    const stints = buildFranchisePlayerTeamStatStints(
      [
        game({
          gameId: 'pre-trade',
          date: 10,
          playerStats: {
            'player-1': batter('Jordan Switch', 'team-a', { h: 1, singles: 1 }),
          },
        }),
        game({
          gameId: 'post-trade',
          date: 20,
          playerStats: {
            'player-1': batter('Jordan Switch', 'team-b', { h: 2, singles: 0, doubles: 2 }),
          },
        }),
      ],
      {
        franchiseId: 'franchise-a',
        seasonId: 'franchise-a-season-1',
        statsScopeId: 'franchise-a-season-1',
      },
    );

    expect(stints).toHaveLength(2);
    expect(stints.map((stint) => ({
      playerId: stint.playerId,
      teamId: stint.teamId,
      hits: stint.batting.hits,
      gameIds: stint.gameIds,
    }))).toEqual([
      {
        playerId: 'player-1',
        teamId: 'team-a',
        hits: 1,
        gameIds: ['pre-trade'],
      },
      {
        playerId: 'player-1',
        teamId: 'team-b',
        hits: 2,
        gameIds: ['post-trade'],
      },
    ]);
  });

  test('excludes playoff, cross-franchise, orphan, and incomplete rows from regular-season projection', () => {
    const stints = buildFranchisePlayerTeamStatStints(
      [
        game({
          gameId: 'regular',
          playerStats: {
            'player-1': batter('Scoped Player', 'team-a', { h: 1 }),
          },
        }),
        game({
          gameId: 'playoff',
          competitionType: 'playoff',
          playoffId: 'playoff-1',
          playerStats: {
            'player-1': batter('Scoped Player', 'team-a', { h: 5 }),
          },
        }),
        game({
          gameId: 'other-franchise',
          franchiseId: 'franchise-b',
          playerStats: {
            'player-1': batter('Scoped Player', 'team-a', { h: 5 }),
          },
        }),
        game({
          gameId: 'orphan',
          franchiseId: undefined,
          playerStats: {
            'player-1': batter('Scoped Player', 'team-a', { h: 5 }),
          },
        }),
        game({
          gameId: 'incomplete',
          aggregationStatus: 'incomplete',
          playerStats: {
            'player-1': batter('Scoped Player', 'team-a', { h: 5 }),
          },
        }),
      ],
      {
        franchiseId: 'franchise-a',
        seasonId: 'franchise-a-season-1',
        statsScopeId: 'franchise-a-season-1',
      },
    );

    expect(stints).toHaveLength(1);
    expect(stints[0]).toMatchObject({
      playerId: 'player-1',
      teamId: 'team-a',
      gameIds: ['regular'],
      batting: expect.objectContaining({ hits: 1 }),
    });
  });

  test('can project postseason stints separately from regular-season stints', () => {
    const stints = buildFranchisePlayerTeamStatStints(
      [
        game({
          gameId: 'regular',
          playerStats: {
            'player-1': batter('Two Scope', 'team-a', { h: 1 }),
          },
        }),
        game({
          gameId: 'playoff',
          competitionType: 'playoff',
          playoffId: 'playoff-1',
          playerStats: {
            'player-1': batter('Two Scope', 'team-a', { h: 3, hr: 1 }),
          },
          pitcherGameStats: [
            pitcher('player-1', 'Two Scope', 'team-a', { strikeoutsThrown: 4 }),
          ],
        }),
      ],
      {
        franchiseId: 'franchise-a',
        seasonId: 'franchise-a-season-1',
        statsScopeId: 'franchise-a-season-1',
        competitionType: 'playoff',
      },
    );

    expect(stints).toHaveLength(1);
    expect(stints[0]).toMatchObject({
      competitionType: 'playoff',
      playerId: 'player-1',
      teamId: 'team-a',
      games: 1,
      gameIds: ['playoff'],
      batting: expect.objectContaining({ hits: 3, homeRuns: 1 }),
      pitching: expect.objectContaining({ games: 1, strikeouts: 4 }),
    });
  });
});
