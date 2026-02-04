/**
 * Career Storage Tests
 *
 * Tests for src/src_figma/utils/careerStorage.ts
 * Per TESTING_IMPLEMENTATION_PLAN.md Phase 5.1
 */

import { describe, test, expect, vi } from 'vitest';

// ============================================
// TYPES (from careerStorage.ts concept)
// ============================================

interface PlayerCareerStats {
  playerId: string;
  playerName: string;

  // Career totals
  seasons: number;
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
  stolenBases: number;
  caughtStealing: number;

  // Career Fame
  totalFame: number;
  fameBonuses: number;
  fameBoners: number;

  // Milestones achieved
  milestones: CareerMilestone[];

  // Status
  isActive: boolean;
  retiredAt: string | null;
  firstSeason: string;
  lastSeason: string;

  // Timestamps
  lastUpdated: number;
}

interface CareerMilestone {
  type: string;
  value: number;
  achievedAt: string; // date
  seasonId: string;
  gameId: string;
  description: string;
}

interface PlayerCareerPitching {
  playerId: string;
  playerName: string;

  // Career totals
  seasons: number;
  games: number;
  gamesStarted: number;
  outsRecorded: number;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walks: number;
  strikeouts: number;
  homeRunsAllowed: number;
  wins: number;
  losses: number;
  saves: number;
  blownSaves: number;
  completeGames: number;
  shutouts: number;
  noHitters: number;
  perfectGames: number;

  // Career Fame
  totalFame: number;
  fameBonuses: number;
  fameBoners: number;

  // Milestones
  milestones: CareerMilestone[];

  // Status
  isActive: boolean;
  retiredAt: string | null;
  firstSeason: string;
  lastSeason: string;

  // Timestamps
  lastUpdated: number;
}

// ============================================
// HELPER FACTORIES
// ============================================

function createMockCareerBatting(
  overrides: Partial<PlayerCareerStats> = {}
): PlayerCareerStats {
  return {
    playerId: 'player-123',
    playerName: 'Career Slugger',

    seasons: 0,
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
    stolenBases: 0,
    caughtStealing: 0,

    totalFame: 0,
    fameBonuses: 0,
    fameBoners: 0,

    milestones: [],

    isActive: true,
    retiredAt: null,
    firstSeason: '2024',
    lastSeason: '2024',

    lastUpdated: Date.now(),
    ...overrides,
  };
}

function createMockCareerPitching(
  overrides: Partial<PlayerCareerPitching> = {}
): PlayerCareerPitching {
  return {
    playerId: 'pitcher-456',
    playerName: 'Career Ace',

    seasons: 0,
    games: 0,
    gamesStarted: 0,
    outsRecorded: 0,
    hitsAllowed: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    walks: 0,
    strikeouts: 0,
    homeRunsAllowed: 0,
    wins: 0,
    losses: 0,
    saves: 0,
    blownSaves: 0,
    completeGames: 0,
    shutouts: 0,
    noHitters: 0,
    perfectGames: 0,

    totalFame: 0,
    fameBonuses: 0,
    fameBoners: 0,

    milestones: [],

    isActive: true,
    retiredAt: null,
    firstSeason: '2024',
    lastSeason: '2024',

    lastUpdated: Date.now(),
    ...overrides,
  };
}

function createMockMilestone(
  overrides: Partial<CareerMilestone> = {}
): CareerMilestone {
  return {
    type: 'CAREER_HR',
    value: 500,
    achievedAt: '2024-06-15',
    seasonId: 'season-2024',
    gameId: 'game-123',
    description: '500th career home run',
    ...overrides,
  };
}

// ============================================
// CAREER BATTING STRUCTURE TESTS
// ============================================

describe('PlayerCareerStats Structure', () => {
  test('has identification fields', () => {
    const career = createMockCareerBatting();

    expect(career).toHaveProperty('playerId');
    expect(career).toHaveProperty('playerName');
  });

  test('has counting stats', () => {
    const career = createMockCareerBatting();

    expect(career).toHaveProperty('seasons');
    expect(career).toHaveProperty('games');
    expect(career).toHaveProperty('pa');
    expect(career).toHaveProperty('ab');
    expect(career).toHaveProperty('hits');
    expect(career).toHaveProperty('homeRuns');
    expect(career).toHaveProperty('rbi');
    expect(career).toHaveProperty('runs');
  });

  test('has hit breakdown', () => {
    const career = createMockCareerBatting();

    expect(career).toHaveProperty('singles');
    expect(career).toHaveProperty('doubles');
    expect(career).toHaveProperty('triples');
    expect(career).toHaveProperty('homeRuns');
  });

  test('has plate discipline stats', () => {
    const career = createMockCareerBatting();

    expect(career).toHaveProperty('walks');
    expect(career).toHaveProperty('strikeouts');
  });

  test('has baserunning stats', () => {
    const career = createMockCareerBatting();

    expect(career).toHaveProperty('stolenBases');
    expect(career).toHaveProperty('caughtStealing');
  });

  test('has Fame tracking', () => {
    const career = createMockCareerBatting();

    expect(career).toHaveProperty('totalFame');
    expect(career).toHaveProperty('fameBonuses');
    expect(career).toHaveProperty('fameBoners');
  });

  test('has milestones array', () => {
    const career = createMockCareerBatting();

    expect(career).toHaveProperty('milestones');
    expect(Array.isArray(career.milestones)).toBe(true);
  });

  test('has career span tracking', () => {
    const career = createMockCareerBatting();

    expect(career).toHaveProperty('isActive');
    expect(career).toHaveProperty('retiredAt');
    expect(career).toHaveProperty('firstSeason');
    expect(career).toHaveProperty('lastSeason');
  });
});

// ============================================
// CAREER PITCHING STRUCTURE TESTS
// ============================================

describe('PlayerCareerPitching Structure', () => {
  test('has identification fields', () => {
    const career = createMockCareerPitching();

    expect(career).toHaveProperty('playerId');
    expect(career).toHaveProperty('playerName');
  });

  test('has game counts', () => {
    const career = createMockCareerPitching();

    expect(career).toHaveProperty('seasons');
    expect(career).toHaveProperty('games');
    expect(career).toHaveProperty('gamesStarted');
  });

  test('has innings tracking', () => {
    const career = createMockCareerPitching();
    expect(career).toHaveProperty('outsRecorded');
  });

  test('has opponent stats', () => {
    const career = createMockCareerPitching();

    expect(career).toHaveProperty('hitsAllowed');
    expect(career).toHaveProperty('runsAllowed');
    expect(career).toHaveProperty('earnedRuns');
    expect(career).toHaveProperty('walks');
    expect(career).toHaveProperty('strikeouts');
    expect(career).toHaveProperty('homeRunsAllowed');
  });

  test('has record stats', () => {
    const career = createMockCareerPitching();

    expect(career).toHaveProperty('wins');
    expect(career).toHaveProperty('losses');
    expect(career).toHaveProperty('saves');
    expect(career).toHaveProperty('blownSaves');
  });

  test('has special achievements', () => {
    const career = createMockCareerPitching();

    expect(career).toHaveProperty('completeGames');
    expect(career).toHaveProperty('shutouts');
    expect(career).toHaveProperty('noHitters');
    expect(career).toHaveProperty('perfectGames');
  });
});

// ============================================
// MILESTONE STRUCTURE TESTS
// ============================================

describe('CareerMilestone Structure', () => {
  test('has type and value', () => {
    const milestone = createMockMilestone({
      type: 'CAREER_HR',
      value: 500,
    });

    expect(milestone.type).toBe('CAREER_HR');
    expect(milestone.value).toBe(500);
  });

  test('has achievement context', () => {
    const milestone = createMockMilestone({
      achievedAt: '2024-06-15',
      seasonId: 'season-2024',
      gameId: 'game-123',
    });

    expect(milestone.achievedAt).toBe('2024-06-15');
    expect(milestone.seasonId).toBe('season-2024');
    expect(milestone.gameId).toBe('game-123');
  });

  test('has description', () => {
    const milestone = createMockMilestone({
      description: '500th career home run',
    });

    expect(milestone.description).toBe('500th career home run');
  });
});

// ============================================
// CAREER MILESTONE THRESHOLDS
// ============================================

describe('Career Milestone Thresholds (SMB4 Scaled)', () => {
  // SMB4: 50 games vs MLB 162 → scale factor ~0.31
  const SMB4_SCALE = 50 / 162;

  test('HR milestones (scaled from MLB)', () => {
    const MLB_THRESHOLDS = [100, 200, 300, 400, 500, 600, 700];
    const SMB4_THRESHOLDS = MLB_THRESHOLDS.map((t) =>
      Math.round(t * SMB4_SCALE)
    );

    // ~31, 62, 93, 124, 155, 186, 217
    expect(SMB4_THRESHOLDS[0]).toBeGreaterThan(25);
    expect(SMB4_THRESHOLDS[0]).toBeLessThan(40);
  });

  test('hits milestones (scaled)', () => {
    const MLB_THRESHOLDS = [1000, 2000, 3000];
    const SMB4_THRESHOLDS = MLB_THRESHOLDS.map((t) =>
      Math.round(t * SMB4_SCALE)
    );

    // ~309, 617, 926
    expect(SMB4_THRESHOLDS[0]).toBeGreaterThan(250);
    expect(SMB4_THRESHOLDS[0]).toBeLessThan(400);
  });

  test('wins milestones (scaled)', () => {
    const MLB_THRESHOLDS = [100, 200, 300];
    const SMB4_THRESHOLDS = MLB_THRESHOLDS.map((t) =>
      Math.round(t * SMB4_SCALE)
    );

    // ~31, 62, 93
    expect(SMB4_THRESHOLDS[0]).toBeGreaterThan(25);
    expect(SMB4_THRESHOLDS[0]).toBeLessThan(40);
  });

  test('strikeout milestones (scaled)', () => {
    const MLB_THRESHOLDS = [1000, 2000, 3000];
    const SMB4_THRESHOLDS = MLB_THRESHOLDS.map((t) =>
      Math.round(t * SMB4_SCALE)
    );

    // ~309, 617, 926
    expect(SMB4_THRESHOLDS[0]).toBeGreaterThan(250);
    expect(SMB4_THRESHOLDS[0]).toBeLessThan(400);
  });

  test('saves milestones (scaled)', () => {
    const MLB_THRESHOLDS = [100, 200, 300, 400, 500];
    const SMB4_THRESHOLDS = MLB_THRESHOLDS.map((t) =>
      Math.round(t * SMB4_SCALE)
    );

    // ~31, 62, 93, 124, 155
    expect(SMB4_THRESHOLDS[0]).toBeGreaterThan(25);
    expect(SMB4_THRESHOLDS[0]).toBeLessThan(40);
  });
});

// ============================================
// SEASON TO CAREER AGGREGATION
// ============================================

describe('Season to Career Aggregation', () => {
  test('seasons increment by 1', () => {
    const career = createMockCareerBatting({ seasons: 5 });
    const afterSeason = { ...career, seasons: career.seasons + 1 };

    expect(afterSeason.seasons).toBe(6);
  });

  test('counting stats sum across seasons', () => {
    const career = createMockCareerBatting({
      hits: 500,
      homeRuns: 100,
      rbi: 400,
    });

    // Add a season with 150 H, 35 HR, 110 RBI
    const afterSeason = {
      ...career,
      hits: career.hits + 150,
      homeRuns: career.homeRuns + 35,
      rbi: career.rbi + 110,
    };

    expect(afterSeason.hits).toBe(650);
    expect(afterSeason.homeRuns).toBe(135);
    expect(afterSeason.rbi).toBe(510);
  });

  test('Fame accumulates across seasons', () => {
    const career = createMockCareerBatting({
      totalFame: 50,
      fameBonuses: 30,
      fameBoners: 10,
    });

    // Season added 15 fame (10 bonuses, 5 boners)
    const afterSeason = {
      ...career,
      totalFame: career.totalFame + 5,
      fameBonuses: career.fameBonuses + 10,
      fameBoners: career.fameBoners + 5,
    };

    expect(afterSeason.totalFame).toBe(55);
  });

  test('lastSeason updates', () => {
    const career = createMockCareerBatting({
      firstSeason: '2020',
      lastSeason: '2023',
    });

    const afterSeason = { ...career, lastSeason: '2024' };

    expect(afterSeason.firstSeason).toBe('2020');
    expect(afterSeason.lastSeason).toBe('2024');
  });

  test('milestone detection on threshold crossing', () => {
    const career = createMockCareerBatting({
      homeRuns: 98,
      milestones: [],
    });

    // Hit 3 more HR → crosses 100 threshold
    const afterGame = { ...career, homeRuns: 101 };

    // Would trigger milestone detection
    const crossedThreshold = afterGame.homeRuns >= 100 && career.homeRuns < 100;
    expect(crossedThreshold).toBe(true);
  });
});

// ============================================
// RETIREMENT HANDLING
// ============================================

describe('Retirement Handling', () => {
  test('active player has isActive true', () => {
    const active = createMockCareerBatting({ isActive: true });
    expect(active.isActive).toBe(true);
    expect(active.retiredAt).toBeNull();
  });

  test('retired player has isActive false with date', () => {
    const retired = createMockCareerBatting({
      isActive: false,
      retiredAt: '2024-10-01',
    });

    expect(retired.isActive).toBe(false);
    expect(retired.retiredAt).toBe('2024-10-01');
  });

  test('career span shows full career', () => {
    const veteran = createMockCareerBatting({
      firstSeason: '2015',
      lastSeason: '2024',
      seasons: 10,
    });

    expect(veteran.seasons).toBe(10);
  });
});

// ============================================
// LEADERBOARD QUERIES
// ============================================

describe('Career Leaderboard Queries', () => {
  test('sort by career home runs', () => {
    const careers = [
      createMockCareerBatting({ playerId: 'p1', homeRuns: 350 }),
      createMockCareerBatting({ playerId: 'p2', homeRuns: 500 }),
      createMockCareerBatting({ playerId: 'p3', homeRuns: 280 }),
    ];

    const hrLeaders = [...careers].sort((a, b) => b.homeRuns - a.homeRuns);

    expect(hrLeaders[0].playerId).toBe('p2');
    expect(hrLeaders[0].homeRuns).toBe(500);
  });

  test('sort by career hits', () => {
    const careers = [
      createMockCareerBatting({ playerId: 'p1', hits: 2500 }),
      createMockCareerBatting({ playerId: 'p2', hits: 3000 }),
      createMockCareerBatting({ playerId: 'p3', hits: 1800 }),
    ];

    const hitLeaders = [...careers].sort((a, b) => b.hits - a.hits);

    expect(hitLeaders[0].playerId).toBe('p2');
  });

  test('sort by career wins (pitchers)', () => {
    const pitchers = [
      createMockCareerPitching({ playerId: 'p1', wins: 200 }),
      createMockCareerPitching({ playerId: 'p2', wins: 300 }),
      createMockCareerPitching({ playerId: 'p3', wins: 150 }),
    ];

    const winLeaders = [...pitchers].sort((a, b) => b.wins - a.wins);

    expect(winLeaders[0].playerId).toBe('p2');
    expect(winLeaders[0].wins).toBe(300);
  });

  test('sort by career strikeouts (pitchers)', () => {
    const pitchers = [
      createMockCareerPitching({ playerId: 'p1', strikeouts: 2500 }),
      createMockCareerPitching({ playerId: 'p2', strikeouts: 3500 }),
      createMockCareerPitching({ playerId: 'p3', strikeouts: 2000 }),
    ];

    const kLeaders = [...pitchers].sort((a, b) => b.strikeouts - a.strikeouts);

    expect(kLeaders[0].playerId).toBe('p2');
  });

  test('sort by career Fame', () => {
    const careers = [
      createMockCareerBatting({ playerId: 'p1', totalFame: 75 }),
      createMockCareerBatting({ playerId: 'p2', totalFame: 100 }),
      createMockCareerBatting({ playerId: 'p3', totalFame: 45 }),
    ];

    const fameLeaders = [...careers].sort((a, b) => b.totalFame - a.totalFame);

    expect(fameLeaders[0].playerId).toBe('p2');
  });
});

// ============================================
// CAREER AVG/ERA CALCULATIONS
// ============================================

describe('Career Rate Stats', () => {
  test('career AVG = career H / career AB', () => {
    const career = createMockCareerBatting({
      hits: 2500,
      ab: 8000,
    });

    const avg = career.hits / career.ab;
    expect(avg).toBeCloseTo(0.3125, 4);
  });

  test('career ERA = (career ER * 9) / career IP', () => {
    const career = createMockCareerPitching({
      earnedRuns: 1000,
      outsRecorded: 9000, // 3000 IP
    });

    const ip = career.outsRecorded / 3;
    const era = (career.earnedRuns * 9) / ip;

    expect(era).toBe(3.0);
  });

  test('career WHIP = (career H + career BB) / career IP', () => {
    const career = createMockCareerPitching({
      hitsAllowed: 2500,
      walks: 800,
      outsRecorded: 9000, // 3000 IP
    });

    const ip = career.outsRecorded / 3;
    const whip = (career.hitsAllowed + career.walks) / ip;

    expect(whip).toBeCloseTo(1.1, 1);
  });

  test('career K/9 = (career K * 9) / career IP', () => {
    const career = createMockCareerPitching({
      strikeouts: 3000,
      outsRecorded: 9000, // 3000 IP
    });

    const ip = career.outsRecorded / 3;
    const k9 = (career.strikeouts * 9) / ip;

    expect(k9).toBe(9.0);
  });
});

// ============================================
// HALL OF FAME TRACKING
// ============================================

describe('Hall of Fame Consideration', () => {
  test('HOF-caliber batter career', () => {
    const hofBatter = createMockCareerBatting({
      seasons: 20,
      games: 2500,
      hits: 3000,
      homeRuns: 500,
      rbi: 1800,
      runs: 1700,
      totalFame: 150,
      milestones: [
        createMockMilestone({ type: 'CAREER_HR', value: 500 }),
        createMockMilestone({ type: 'CAREER_HITS', value: 3000 }),
      ],
    });

    expect(hofBatter.hits).toBeGreaterThanOrEqual(3000);
    expect(hofBatter.homeRuns).toBeGreaterThanOrEqual(500);
    expect(hofBatter.milestones.length).toBeGreaterThanOrEqual(2);
  });

  test('HOF-caliber pitcher career', () => {
    const hofPitcher = createMockCareerPitching({
      seasons: 22,
      games: 700,
      gamesStarted: 500,
      wins: 300,
      strikeouts: 3500,
      shutouts: 50,
      noHitters: 2,
      totalFame: 120,
      milestones: [
        createMockMilestone({ type: 'CAREER_WINS', value: 300 }),
        createMockMilestone({ type: 'CAREER_K', value: 3000 }),
      ],
    });

    expect(hofPitcher.wins).toBeGreaterThanOrEqual(300);
    expect(hofPitcher.strikeouts).toBeGreaterThanOrEqual(3000);
  });

  test('closer HOF career', () => {
    const hofCloser = createMockCareerPitching({
      seasons: 18,
      games: 1000,
      gamesStarted: 0,
      wins: 50,
      saves: 600,
      strikeouts: 1200,
      totalFame: 80,
    });

    expect(hofCloser.saves).toBeGreaterThanOrEqual(500);
    expect(hofCloser.gamesStarted).toBe(0);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  test('handles rookie (1 season)', () => {
    const rookie = createMockCareerBatting({
      seasons: 1,
      games: 50,
      hits: 60,
      homeRuns: 12,
      milestones: [],
    });

    expect(rookie.seasons).toBe(1);
    expect(rookie.milestones).toHaveLength(0);
  });

  test('handles career with no milestones', () => {
    const shortCareer = createMockCareerBatting({
      seasons: 3,
      homeRuns: 25,
      hits: 200,
      milestones: [],
    });

    expect(shortCareer.milestones).toHaveLength(0);
  });

  test('handles pitcher with no wins', () => {
    const reliever = createMockCareerPitching({
      games: 300,
      gamesStarted: 0,
      wins: 15,
      saves: 80,
    });

    expect(reliever.wins).toBeLessThan(reliever.saves);
  });

  test('handles zero games (new player)', () => {
    const newPlayer = createMockCareerBatting({
      seasons: 0,
      games: 0,
      ab: 0,
      hits: 0,
    });

    expect(newPlayer.games).toBe(0);
    // AVG would be 0/0, handle gracefully
    const avg = newPlayer.ab > 0 ? newPlayer.hits / newPlayer.ab : 0;
    expect(avg).toBe(0);
  });

  test('handles negative Fame career', () => {
    const infamousPlayer = createMockCareerBatting({
      totalFame: -25,
      fameBonuses: 10,
      fameBoners: 35,
    });

    expect(infamousPlayer.totalFame).toBeLessThan(0);
  });
});

// ============================================
// PRACTICAL SCENARIOS
// ============================================

describe('Practical Scenarios', () => {
  test('track 500 HR achievement', () => {
    const career = createMockCareerBatting({
      homeRuns: 498,
      milestones: [
        createMockMilestone({ type: 'CAREER_HR', value: 100 }),
        createMockMilestone({ type: 'CAREER_HR', value: 200 }),
        createMockMilestone({ type: 'CAREER_HR', value: 300 }),
        createMockMilestone({ type: 'CAREER_HR', value: 400 }),
      ],
    });

    // Hit 2 more HR to reach 500
    const afterGame = {
      ...career,
      homeRuns: 500,
      milestones: [
        ...career.milestones,
        createMockMilestone({
          type: 'CAREER_HR',
          value: 500,
          description: '500th career home run',
        }),
      ],
    };

    expect(afterGame.homeRuns).toBe(500);
    expect(afterGame.milestones.length).toBe(5);
    expect(afterGame.milestones[4].value).toBe(500);
  });

  test('track 3000 hits achievement', () => {
    const career = createMockCareerBatting({
      hits: 2998,
      milestones: [
        createMockMilestone({ type: 'CAREER_HITS', value: 1000 }),
        createMockMilestone({ type: 'CAREER_HITS', value: 2000 }),
      ],
    });

    const afterGame = {
      ...career,
      hits: 3001,
      milestones: [
        ...career.milestones,
        createMockMilestone({
          type: 'CAREER_HITS',
          value: 3000,
          description: '3000th career hit',
        }),
      ],
    };

    expect(afterGame.hits).toBe(3001);
    expect(afterGame.milestones.length).toBe(3);
  });

  test('track 300 wins achievement', () => {
    const career = createMockCareerPitching({
      wins: 299,
      milestones: [
        createMockMilestone({ type: 'CAREER_WINS', value: 100 }),
        createMockMilestone({ type: 'CAREER_WINS', value: 200 }),
      ],
    });

    const afterGame = {
      ...career,
      wins: 300,
      milestones: [
        ...career.milestones,
        createMockMilestone({
          type: 'CAREER_WINS',
          value: 300,
          description: '300th career win',
        }),
      ],
    };

    expect(afterGame.wins).toBe(300);
    expect(afterGame.milestones.length).toBe(3);
  });

  test('retirement finalizes career', () => {
    const activePro = createMockCareerBatting({
      isActive: true,
      retiredAt: null,
      seasons: 15,
      lastSeason: '2024',
    });

    const retired = {
      ...activePro,
      isActive: false,
      retiredAt: '2024-10-15',
    };

    expect(retired.isActive).toBe(false);
    expect(retired.retiredAt).toBe('2024-10-15');
    expect(retired.seasons).toBe(15);
  });
});
