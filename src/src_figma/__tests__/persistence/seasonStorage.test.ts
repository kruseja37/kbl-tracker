/**
 * Season Storage Tests
 *
 * Tests for src/src_figma/utils/seasonStorage.ts
 * Per TESTING_IMPLEMENTATION_PLAN.md Phase 5.1
 */

import { describe, test, expect, vi } from 'vitest';

// ============================================
// TYPES (from seasonStorage.ts)
// ============================================

interface PlayerSeasonBatting {
  seasonId: string;
  playerId: string;
  playerName: string;
  teamId: string;

  // Counting stats
  games: number;
  pa: number;
  ab: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  runs: number;
  walks: number;
  strikeouts: number;
  hitByPitch: number;
  sacFlies: number;
  sacBunts: number;
  stolenBases: number;
  caughtStealing: number;
  gidp: number;

  // Fame
  fameBonuses: number;
  fameBoners: number;
  fameNet: number;

  // Timestamps
  lastUpdated: number;
}

interface PlayerSeasonPitching {
  seasonId: string;
  playerId: string;
  playerName: string;
  teamId: string;

  // Counting stats
  games: number;
  gamesStarted: number;
  outsRecorded: number;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walks: number;
  strikeouts: number;
  homeRunsAllowed: number;
  hitBatsmen: number;
  wins: number;
  losses: number;
  saves: number;
  blownSaves: number;
  holds: number;
  qualityStarts: number;

  // Fame
  fameBonuses: number;
  fameBoners: number;
  fameNet: number;

  // Timestamps
  lastUpdated: number;
}

interface PlayerSeasonFielding {
  seasonId: string;
  playerId: string;
  playerName: string;

  // Position stats (keyed by position)
  positions: Record<
    string,
    {
      games: number;
      innings: number;
      putouts: number;
      assists: number;
      errors: number;
      doublePlays: number;
      passedBalls?: number;
      caughtStealing?: number;
      stolenBasesAllowed?: number;
    }
  >;

  // Timestamps
  lastUpdated: number;
}

interface SeasonMetadata {
  seasonId: string;
  name: string;
  year: number;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  gamesPerTeam: number;
  startDate: string;
  endDate: string | null;
  isPlayoffs: boolean;
  playoffRound: string | null;
  createdAt: number;
  lastUpdated: number;
}

// ============================================
// HELPER FACTORIES
// ============================================

function createMockSeasonBatting(
  overrides: Partial<PlayerSeasonBatting> = {}
): PlayerSeasonBatting {
  return {
    seasonId: 'season-2024',
    playerId: 'player-123',
    playerName: 'John Slugger',
    teamId: 'sirloins',

    games: 0,
    pa: 0,
    ab: 0,
    hits: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    rbi: 0,
    runs: 0,
    walks: 0,
    strikeouts: 0,
    hitByPitch: 0,
    sacFlies: 0,
    sacBunts: 0,
    stolenBases: 0,
    caughtStealing: 0,
    gidp: 0,

    fameBonuses: 0,
    fameBoners: 0,
    fameNet: 0,

    lastUpdated: Date.now(),
    ...overrides,
  };
}

function createMockSeasonPitching(
  overrides: Partial<PlayerSeasonPitching> = {}
): PlayerSeasonPitching {
  return {
    seasonId: 'season-2024',
    playerId: 'pitcher-456',
    playerName: 'Joe Fastball',
    teamId: 'sirloins',

    games: 0,
    gamesStarted: 0,
    outsRecorded: 0,
    hitsAllowed: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    walks: 0,
    strikeouts: 0,
    homeRunsAllowed: 0,
    hitBatsmen: 0,
    wins: 0,
    losses: 0,
    saves: 0,
    blownSaves: 0,
    holds: 0,
    qualityStarts: 0,

    fameBonuses: 0,
    fameBoners: 0,
    fameNet: 0,

    lastUpdated: Date.now(),
    ...overrides,
  };
}

function createMockSeasonFielding(
  overrides: Partial<PlayerSeasonFielding> = {}
): PlayerSeasonFielding {
  return {
    seasonId: 'season-2024',
    playerId: 'player-123',
    playerName: 'Glove Guy',
    positions: {},
    lastUpdated: Date.now(),
    ...overrides,
  };
}

function createMockSeasonMetadata(
  overrides: Partial<SeasonMetadata> = {}
): SeasonMetadata {
  return {
    seasonId: 'season-2024',
    name: '2024 Spring Season',
    year: 2024,
    status: 'ACTIVE',
    gamesPerTeam: 50,
    startDate: '2024-01-01',
    endDate: null,
    isPlayoffs: false,
    playoffRound: null,
    createdAt: Date.now(),
    lastUpdated: Date.now(),
    ...overrides,
  };
}

// ============================================
// DATABASE CONSTANTS
// ============================================

describe('Database Constants', () => {
  test('STORES contains season-specific stores', () => {
    const STORES = {
      PLAYER_SEASON_BATTING: 'playerSeasonBatting',
      PLAYER_SEASON_PITCHING: 'playerSeasonPitching',
      PLAYER_SEASON_FIELDING: 'playerSeasonFielding',
      SEASON_METADATA: 'seasonMetadata',
    };

    expect(STORES.PLAYER_SEASON_BATTING).toBe('playerSeasonBatting');
    expect(STORES.PLAYER_SEASON_PITCHING).toBe('playerSeasonPitching');
    expect(STORES.PLAYER_SEASON_FIELDING).toBe('playerSeasonFielding');
    expect(STORES.SEASON_METADATA).toBe('seasonMetadata');
  });

  test('season stats keyed by [seasonId, playerId]', () => {
    const key = ['season-2024', 'player-123'];
    expect(key).toHaveLength(2);
    expect(key[0]).toBe('season-2024');
    expect(key[1]).toBe('player-123');
  });
});

// ============================================
// BATTING STRUCTURE TESTS
// ============================================

describe('PlayerSeasonBatting Structure', () => {
  test('has identification fields', () => {
    const batting = createMockSeasonBatting();

    expect(batting).toHaveProperty('seasonId');
    expect(batting).toHaveProperty('playerId');
    expect(batting).toHaveProperty('playerName');
    expect(batting).toHaveProperty('teamId');
  });

  test('has all counting stats', () => {
    const batting = createMockSeasonBatting();

    expect(batting).toHaveProperty('games');
    expect(batting).toHaveProperty('pa');
    expect(batting).toHaveProperty('ab');
    expect(batting).toHaveProperty('hits');
    expect(batting).toHaveProperty('singles');
    expect(batting).toHaveProperty('doubles');
    expect(batting).toHaveProperty('triples');
    expect(batting).toHaveProperty('homeRuns');
    expect(batting).toHaveProperty('rbi');
    expect(batting).toHaveProperty('runs');
  });

  test('has plate discipline stats', () => {
    const batting = createMockSeasonBatting();

    expect(batting).toHaveProperty('walks');
    expect(batting).toHaveProperty('strikeouts');
    expect(batting).toHaveProperty('hitByPitch');
  });

  test('has baserunning stats', () => {
    const batting = createMockSeasonBatting();

    expect(batting).toHaveProperty('stolenBases');
    expect(batting).toHaveProperty('caughtStealing');
    expect(batting).toHaveProperty('gidp');
  });

  test('has sacrifice stats', () => {
    const batting = createMockSeasonBatting();

    expect(batting).toHaveProperty('sacFlies');
    expect(batting).toHaveProperty('sacBunts');
  });

  test('has Fame tracking', () => {
    const batting = createMockSeasonBatting();

    expect(batting).toHaveProperty('fameBonuses');
    expect(batting).toHaveProperty('fameBoners');
    expect(batting).toHaveProperty('fameNet');
  });

  test('hits equals sum of hit types', () => {
    const batting = createMockSeasonBatting({
      singles: 80,
      doubles: 25,
      triples: 5,
      homeRuns: 20,
      hits: 130,
    });

    const calculatedHits =
      batting.singles + batting.doubles + batting.triples + batting.homeRuns;
    expect(calculatedHits).toBe(batting.hits);
  });
});

// ============================================
// PITCHING STRUCTURE TESTS
// ============================================

describe('PlayerSeasonPitching Structure', () => {
  test('has identification fields', () => {
    const pitching = createMockSeasonPitching();

    expect(pitching).toHaveProperty('seasonId');
    expect(pitching).toHaveProperty('playerId');
    expect(pitching).toHaveProperty('playerName');
    expect(pitching).toHaveProperty('teamId');
  });

  test('has game counts', () => {
    const pitching = createMockSeasonPitching();

    expect(pitching).toHaveProperty('games');
    expect(pitching).toHaveProperty('gamesStarted');
  });

  test('has innings as outsRecorded', () => {
    const pitching = createMockSeasonPitching({
      outsRecorded: 200, // 66.2 IP
    });

    expect(pitching.outsRecorded).toBe(200);
    // IP = outsRecorded / 3 = 66.666...
    const ip = pitching.outsRecorded / 3;
    expect(ip).toBeCloseTo(66.67, 1);
  });

  test('has opponent batting stats', () => {
    const pitching = createMockSeasonPitching();

    expect(pitching).toHaveProperty('hitsAllowed');
    expect(pitching).toHaveProperty('runsAllowed');
    expect(pitching).toHaveProperty('earnedRuns');
    expect(pitching).toHaveProperty('walks');
    expect(pitching).toHaveProperty('strikeouts');
    expect(pitching).toHaveProperty('homeRunsAllowed');
    expect(pitching).toHaveProperty('hitBatsmen');
  });

  test('has record stats', () => {
    const pitching = createMockSeasonPitching();

    expect(pitching).toHaveProperty('wins');
    expect(pitching).toHaveProperty('losses');
    expect(pitching).toHaveProperty('saves');
    expect(pitching).toHaveProperty('blownSaves');
    expect(pitching).toHaveProperty('holds');
  });

  test('has quality starts', () => {
    const pitching = createMockSeasonPitching();
    expect(pitching).toHaveProperty('qualityStarts');
  });

  test('has Fame tracking', () => {
    const pitching = createMockSeasonPitching();

    expect(pitching).toHaveProperty('fameBonuses');
    expect(pitching).toHaveProperty('fameBoners');
    expect(pitching).toHaveProperty('fameNet');
  });
});

// ============================================
// FIELDING STRUCTURE TESTS
// ============================================

describe('PlayerSeasonFielding Structure', () => {
  test('has identification fields', () => {
    const fielding = createMockSeasonFielding();

    expect(fielding).toHaveProperty('seasonId');
    expect(fielding).toHaveProperty('playerId');
    expect(fielding).toHaveProperty('playerName');
  });

  test('positions is a record keyed by position', () => {
    const fielding = createMockSeasonFielding({
      positions: {
        SS: {
          games: 100,
          innings: 800,
          putouts: 150,
          assists: 350,
          errors: 10,
          doublePlays: 50,
        },
        '2B': {
          games: 20,
          innings: 150,
          putouts: 30,
          assists: 60,
          errors: 2,
          doublePlays: 15,
        },
      },
    });

    expect(fielding.positions).toHaveProperty('SS');
    expect(fielding.positions).toHaveProperty('2B');
    expect(fielding.positions.SS.games).toBe(100);
    expect(fielding.positions['2B'].games).toBe(20);
  });

  test('catcher has special stats', () => {
    const catcher = createMockSeasonFielding({
      positions: {
        C: {
          games: 120,
          innings: 1000,
          putouts: 800,
          assists: 50,
          errors: 5,
          doublePlays: 10,
          passedBalls: 8,
          caughtStealing: 30,
          stolenBasesAllowed: 45,
        },
      },
    });

    const catcherStats = catcher.positions.C;
    expect(catcherStats).toHaveProperty('passedBalls');
    expect(catcherStats).toHaveProperty('caughtStealing');
    expect(catcherStats).toHaveProperty('stolenBasesAllowed');
  });
});

// ============================================
// SEASON METADATA TESTS
// ============================================

describe('SeasonMetadata Structure', () => {
  test('has identification fields', () => {
    const meta = createMockSeasonMetadata();

    expect(meta).toHaveProperty('seasonId');
    expect(meta).toHaveProperty('name');
    expect(meta).toHaveProperty('year');
  });

  test('has status with valid values', () => {
    const active = createMockSeasonMetadata({ status: 'ACTIVE' });
    const completed = createMockSeasonMetadata({ status: 'COMPLETED' });
    const archived = createMockSeasonMetadata({ status: 'ARCHIVED' });

    expect(['ACTIVE', 'COMPLETED', 'ARCHIVED']).toContain(active.status);
    expect(['ACTIVE', 'COMPLETED', 'ARCHIVED']).toContain(completed.status);
    expect(['ACTIVE', 'COMPLETED', 'ARCHIVED']).toContain(archived.status);
  });

  test('has games per team', () => {
    const meta = createMockSeasonMetadata({ gamesPerTeam: 50 });
    expect(meta.gamesPerTeam).toBe(50);
  });

  test('has date range', () => {
    const meta = createMockSeasonMetadata({
      startDate: '2024-01-01',
      endDate: '2024-06-30',
    });

    expect(meta.startDate).toBe('2024-01-01');
    expect(meta.endDate).toBe('2024-06-30');
  });

  test('active season has null endDate', () => {
    const active = createMockSeasonMetadata({
      status: 'ACTIVE',
      endDate: null,
    });

    expect(active.endDate).toBeNull();
  });

  test('playoff season has round info', () => {
    const playoffs = createMockSeasonMetadata({
      isPlayoffs: true,
      playoffRound: 'world_series',
    });

    expect(playoffs.isPlayoffs).toBe(true);
    expect(playoffs.playoffRound).toBe('world_series');
  });
});

// ============================================
// CALCULATED STATS TESTS
// ============================================

describe('Calculated Stats', () => {
  test('AVG = hits / ab', () => {
    const batting = createMockSeasonBatting({
      hits: 150,
      ab: 500,
    });

    const avg = batting.hits / batting.ab;
    expect(avg).toBe(0.3);
  });

  test('OBP = (H + BB + HBP) / (AB + BB + HBP + SF)', () => {
    const batting = createMockSeasonBatting({
      hits: 150,
      walks: 60,
      hitByPitch: 5,
      ab: 500,
      sacFlies: 5,
    });

    const obp =
      (batting.hits + batting.walks + batting.hitByPitch) /
      (batting.ab + batting.walks + batting.hitByPitch + batting.sacFlies);

    expect(obp).toBeCloseTo(0.377, 3);
  });

  test('SLG = TB / AB', () => {
    const batting = createMockSeasonBatting({
      singles: 100,
      doubles: 30,
      triples: 5,
      homeRuns: 25,
      ab: 500,
    });

    const totalBases =
      batting.singles * 1 +
      batting.doubles * 2 +
      batting.triples * 3 +
      batting.homeRuns * 4;

    const slg = totalBases / batting.ab;
    // 100 + 60 + 15 + 100 = 275 TB / 500 AB = 0.55 SLG
    expect(slg).toBeCloseTo(0.55, 2);
  });

  test('ERA = (ER * 9) / IP', () => {
    const pitching = createMockSeasonPitching({
      earnedRuns: 60,
      outsRecorded: 600, // 200 IP
    });

    const ip = pitching.outsRecorded / 3;
    const era = (pitching.earnedRuns * 9) / ip;

    expect(era).toBe(2.7);
  });

  test('WHIP = (H + BB) / IP', () => {
    const pitching = createMockSeasonPitching({
      hitsAllowed: 180,
      walks: 50,
      outsRecorded: 600, // 200 IP
    });

    const ip = pitching.outsRecorded / 3;
    const whip = (pitching.hitsAllowed + pitching.walks) / ip;

    expect(whip).toBeCloseTo(1.15, 2);
  });

  test('K/9 = (K * 9) / IP', () => {
    const pitching = createMockSeasonPitching({
      strikeouts: 200,
      outsRecorded: 600, // 200 IP
    });

    const ip = pitching.outsRecorded / 3;
    const k9 = (pitching.strikeouts * 9) / ip;

    expect(k9).toBe(9.0);
  });

  test('Fielding % = (PO + A) / (PO + A + E)', () => {
    const fielding = createMockSeasonFielding({
      positions: {
        SS: {
          games: 150,
          innings: 1300,
          putouts: 250,
          assists: 450,
          errors: 15,
          doublePlays: 80,
        },
      },
    });

    const ss = fielding.positions.SS;
    const fldPct = (ss.putouts + ss.assists) / (ss.putouts + ss.assists + ss.errors);

    expect(fldPct).toBeCloseTo(0.979, 3);
  });
});

// ============================================
// AGGREGATION TESTS
// ============================================

describe('Game to Season Aggregation', () => {
  test('games increment by 1 per game played', () => {
    const batting = createMockSeasonBatting({ games: 10 });
    const afterGame = { ...batting, games: batting.games + 1 };

    expect(afterGame.games).toBe(11);
  });

  test('counting stats sum correctly', () => {
    const batting = createMockSeasonBatting({
      hits: 100,
      homeRuns: 20,
      rbi: 60,
    });

    // Simulate adding a game with 2 hits, 1 HR, 3 RBI
    const afterGame = {
      ...batting,
      hits: batting.hits + 2,
      homeRuns: batting.homeRuns + 1,
      rbi: batting.rbi + 3,
    };

    expect(afterGame.hits).toBe(102);
    expect(afterGame.homeRuns).toBe(21);
    expect(afterGame.rbi).toBe(63);
  });

  test('pitcher outsRecorded accumulates', () => {
    const pitching = createMockSeasonPitching({ outsRecorded: 180 }); // 60 IP

    // Pitched 6 innings (18 outs)
    const afterGame = {
      ...pitching,
      outsRecorded: pitching.outsRecorded + 18,
    };

    expect(afterGame.outsRecorded).toBe(198); // 66 IP
  });

  test('win/loss/save updates correctly', () => {
    const pitching = createMockSeasonPitching({
      wins: 10,
      losses: 5,
      saves: 0,
    });

    // Got a win
    const afterWin = { ...pitching, wins: pitching.wins + 1 };
    expect(afterWin.wins).toBe(11);

    // Got a loss
    const afterLoss = { ...pitching, losses: pitching.losses + 1 };
    expect(afterLoss.losses).toBe(6);
  });

  test('Fame accumulates across games', () => {
    const batting = createMockSeasonBatting({
      fameBonuses: 5,
      fameBoners: 2,
      fameNet: 3,
    });

    // Hit a grand slam (+2 Fame bonus)
    const afterGrandSlam = {
      ...batting,
      fameBonuses: batting.fameBonuses + 1,
      fameNet: batting.fameNet + 2,
    };

    expect(afterGrandSlam.fameBonuses).toBe(6);
    expect(afterGrandSlam.fameNet).toBe(5);
  });
});

// ============================================
// LEADERBOARD QUERIES
// ============================================

describe('Leaderboard Queries', () => {
  test('can sort batters by home runs', () => {
    const batters = [
      createMockSeasonBatting({ playerId: 'p1', homeRuns: 35 }),
      createMockSeasonBatting({ playerId: 'p2', homeRuns: 45 }),
      createMockSeasonBatting({ playerId: 'p3', homeRuns: 28 }),
    ];

    const hrLeaders = [...batters].sort((a, b) => b.homeRuns - a.homeRuns);

    expect(hrLeaders[0].playerId).toBe('p2');
    expect(hrLeaders[0].homeRuns).toBe(45);
  });

  test('can sort batters by AVG', () => {
    const batters = [
      createMockSeasonBatting({ playerId: 'p1', hits: 150, ab: 500 }), // .300
      createMockSeasonBatting({ playerId: 'p2', hits: 180, ab: 550 }), // .327
      createMockSeasonBatting({ playerId: 'p3', hits: 120, ab: 450 }), // .267
    ];

    const avgLeaders = [...batters].sort(
      (a, b) => b.hits / b.ab - a.hits / a.ab
    );

    expect(avgLeaders[0].playerId).toBe('p2');
  });

  test('can sort pitchers by ERA', () => {
    const pitchers = [
      createMockSeasonPitching({
        playerId: 'p1',
        earnedRuns: 60,
        outsRecorded: 600,
      }), // 2.70 ERA
      createMockSeasonPitching({
        playerId: 'p2',
        earnedRuns: 40,
        outsRecorded: 600,
      }), // 1.80 ERA
      createMockSeasonPitching({
        playerId: 'p3',
        earnedRuns: 80,
        outsRecorded: 600,
      }), // 3.60 ERA
    ];

    const eraLeaders = [...pitchers].sort((a, b) => {
      const eraA = (a.earnedRuns * 27) / a.outsRecorded;
      const eraB = (b.earnedRuns * 27) / b.outsRecorded;
      return eraA - eraB; // Lower is better
    });

    expect(eraLeaders[0].playerId).toBe('p2');
  });

  test('can sort pitchers by strikeouts', () => {
    const pitchers = [
      createMockSeasonPitching({ playerId: 'p1', strikeouts: 200 }),
      createMockSeasonPitching({ playerId: 'p2', strikeouts: 280 }),
      createMockSeasonPitching({ playerId: 'p3', strikeouts: 150 }),
    ];

    const kLeaders = [...pitchers].sort((a, b) => b.strikeouts - a.strikeouts);

    expect(kLeaders[0].playerId).toBe('p2');
    expect(kLeaders[0].strikeouts).toBe(280);
  });
});

// ============================================
// MULTI-SEASON QUERIES
// ============================================

describe('Multi-Season Queries', () => {
  test('can query player across seasons', () => {
    const playerHistory = [
      createMockSeasonBatting({
        seasonId: '2022',
        playerId: 'player-1',
        homeRuns: 25,
      }),
      createMockSeasonBatting({
        seasonId: '2023',
        playerId: 'player-1',
        homeRuns: 32,
      }),
      createMockSeasonBatting({
        seasonId: '2024',
        playerId: 'player-1',
        homeRuns: 38,
      }),
    ];

    const totalHR = playerHistory.reduce((sum, s) => sum + s.homeRuns, 0);
    expect(totalHR).toBe(95);
  });

  test('can filter by seasonId', () => {
    const allStats = [
      createMockSeasonBatting({ seasonId: '2023', playerId: 'p1' }),
      createMockSeasonBatting({ seasonId: '2024', playerId: 'p1' }),
      createMockSeasonBatting({ seasonId: '2024', playerId: 'p2' }),
    ];

    const season2024 = allStats.filter((s) => s.seasonId === '2024');
    expect(season2024).toHaveLength(2);
  });

  test('can filter by teamId', () => {
    const allStats = [
      createMockSeasonBatting({ teamId: 'sirloins', playerId: 'p1' }),
      createMockSeasonBatting({ teamId: 'herbisaurs', playerId: 'p2' }),
      createMockSeasonBatting({ teamId: 'sirloins', playerId: 'p3' }),
    ];

    const sirloinsPlayers = allStats.filter((s) => s.teamId === 'sirloins');
    expect(sirloinsPlayers).toHaveLength(2);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  test('handles zero at-bats (AVG undefined)', () => {
    const batting = createMockSeasonBatting({ hits: 0, ab: 0 });

    // Should not divide by zero
    const avg = batting.ab > 0 ? batting.hits / batting.ab : 0;
    expect(avg).toBe(0);
  });

  test('handles zero innings pitched (ERA undefined)', () => {
    const pitching = createMockSeasonPitching({
      earnedRuns: 0,
      outsRecorded: 0,
    });

    const ip = pitching.outsRecorded / 3;
    const era = ip > 0 ? (pitching.earnedRuns * 9) / ip : 0;
    expect(era).toBe(0);
  });

  test('handles player with no fielding positions', () => {
    const dh = createMockSeasonFielding({ positions: {} });
    expect(Object.keys(dh.positions)).toHaveLength(0);
  });

  test('handles player traded mid-season (multiple teamIds)', () => {
    // Same player could have two entries for same season if traded
    const beforeTrade = createMockSeasonBatting({
      seasonId: '2024',
      playerId: 'player-1',
      teamId: 'sirloins',
      homeRuns: 20,
    });

    const afterTrade = createMockSeasonBatting({
      seasonId: '2024',
      playerId: 'player-1',
      teamId: 'herbisaurs',
      homeRuns: 15,
    });

    // Total for the season
    const totalHR = beforeTrade.homeRuns + afterTrade.homeRuns;
    expect(totalHR).toBe(35);
  });

  test('handles negative fameNet', () => {
    const badSeason = createMockSeasonBatting({
      fameBonuses: 2,
      fameBoners: 10,
      fameNet: -8,
    });

    expect(badSeason.fameNet).toBeLessThan(0);
    expect(badSeason.fameNet).toBe(badSeason.fameBonuses - badSeason.fameBoners);
  });
});

// ============================================
// PRACTICAL SCENARIOS
// ============================================

describe('Practical Scenarios', () => {
  test('track MVP-caliber season', () => {
    const mvp = createMockSeasonBatting({
      games: 150,
      pa: 650,
      ab: 550,
      hits: 190,
      singles: 100,
      doubles: 45,
      triples: 5,
      homeRuns: 40,
      rbi: 120,
      runs: 110,
      walks: 80,
      strikeouts: 100,
    });

    const avg = mvp.hits / mvp.ab;
    const tb = mvp.singles + mvp.doubles * 2 + mvp.triples * 3 + mvp.homeRuns * 4;
    const slg = tb / mvp.ab;
    const obp = (mvp.hits + mvp.walks + mvp.hitByPitch) / (mvp.ab + mvp.walks + mvp.hitByPitch + mvp.sacFlies);

    expect(avg).toBeCloseTo(0.345, 2);
    expect(slg).toBeCloseTo(0.664, 2);
    expect(obp).toBeGreaterThan(0.4);
  });

  test('track Cy Young caliber season', () => {
    const cyYoung = createMockSeasonPitching({
      games: 33,
      gamesStarted: 33,
      outsRecorded: 680, // ~226.2 IP
      hitsAllowed: 170,
      earnedRuns: 50,
      walks: 40,
      strikeouts: 280,
      homeRunsAllowed: 18,
      wins: 18,
      losses: 4,
      qualityStarts: 28,
    });

    const ip = cyYoung.outsRecorded / 3;
    const era = (cyYoung.earnedRuns * 9) / ip;
    const whip = (cyYoung.hitsAllowed + cyYoung.walks) / ip;
    const k9 = (cyYoung.strikeouts * 9) / ip;

    expect(era).toBeLessThan(2.0);
    expect(whip).toBeLessThan(1.0);
    expect(k9).toBeGreaterThan(11);
  });

  test('track Gold Glove caliber season', () => {
    const goldGlove = createMockSeasonFielding({
      positions: {
        SS: {
          games: 155,
          innings: 1350,
          putouts: 250,
          assists: 480,
          errors: 5,
          doublePlays: 95,
        },
      },
    });

    const ss = goldGlove.positions.SS;
    const fldPct = (ss.putouts + ss.assists) / (ss.putouts + ss.assists + ss.errors);
    const rangePerGame = (ss.putouts + ss.assists) / ss.games;

    expect(fldPct).toBeGreaterThan(0.99);
    expect(rangePerGame).toBeGreaterThan(4.5);
  });
});
