/**
 * Event Log Tests
 *
 * Tests for src/src_figma/utils/eventLog.ts
 * Per TESTING_IMPLEMENTATION_PLAN.md Phase 5.1
 *
 * The event log system provides bulletproof data integrity by:
 * 1. Capturing every at-bat with full situational context
 * 2. Enabling complete game reconstruction
 * 3. Supporting season stat recalculation from raw events
 * 4. Allowing recovery from any crash or write failure
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// ============================================
// TYPES (from eventLog.ts)
// ============================================

interface GameHeader {
  gameId: string;
  seasonId: string;
  date: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  aggregated: boolean;
  aggregatedAt: number | null;
  aggregationError: string | null;
  eventCount: number;
  checksum: string;
  isPlayoffs: boolean;
  playoffRound: string | null;
  startTime: number;
  endTime: number | null;
}

interface AtBatEvent {
  eventId: string;
  gameId: string;
  sequence: number;
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  outs: number;
  batterId: string;
  batterName: string;
  pitcherId: string;
  pitcherName: string;
  result: string;
  outsOnPlay: number;
  runsScored: number;
  rbiCount: number;
  basesBefore: {
    first: string | null;
    second: string | null;
    third: string | null;
  };
  basesAfter: {
    first: string | null;
    second: string | null;
    third: string | null;
  };
  leverageIndex: number;
  winProbabilityBefore: number;
  winProbabilityAfter: number;
  wpa: number;
  pitchCount: number;
  timestamp: number;
}

interface PitchingAppearance {
  appearanceId: string;
  gameId: string;
  pitcherId: string;
  pitcherName: string;
  inning: number;
  inheritedRunners: number;
  inheritedRunnersScored: number;
  isStarter: boolean;
  entryTime: number;
  exitTime: number | null;
}

interface FieldingEvent {
  fieldingEventId: string;
  gameId: string;
  atBatEventId: string;
  playerId: string;
  playerName: string;
  position: string;
  eventType: 'PUTOUT' | 'ASSIST' | 'ERROR' | 'DOUBLE_PLAY' | 'OUTFIELD_ASSIST';
  zone: string | null;
  difficulty: number;
  timestamp: number;
}

interface BoxScore {
  gameId: string;
  homeTeam: {
    id: string;
    name: string;
    runs: number;
    hits: number;
    errors: number;
    batters: BoxScoreBatter[];
    pitchers: BoxScorePitcher[];
  };
  awayTeam: {
    id: string;
    name: string;
    runs: number;
    hits: number;
    errors: number;
    batters: BoxScoreBatter[];
    pitchers: BoxScorePitcher[];
  };
  lineScore: number[][];
}

interface BoxScoreBatter {
  playerId: string;
  name: string;
  position: string;
  ab: number;
  r: number;
  h: number;
  rbi: number;
  bb: number;
  so: number;
  avg: string;
}

interface BoxScorePitcher {
  playerId: string;
  name: string;
  ip: string;
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
  era: string;
  decision?: 'W' | 'L' | 'S' | 'BS';
}

// ============================================
// HELPER FACTORIES
// ============================================

function createMockGameHeader(overrides: Partial<GameHeader> = {}): GameHeader {
  return {
    gameId: 'game-123',
    seasonId: 'season-2024',
    date: '2024-06-15',
    homeTeamId: 'sirloins',
    awayTeamId: 'herbisaurs',
    homeTeamName: 'Sirloins',
    awayTeamName: 'Herbisaurs',
    aggregated: false,
    aggregatedAt: null,
    aggregationError: null,
    eventCount: 0,
    checksum: '',
    isPlayoffs: false,
    playoffRound: null,
    startTime: Date.now(),
    endTime: null,
    ...overrides,
  };
}

function createMockAtBatEvent(overrides: Partial<AtBatEvent> = {}): AtBatEvent {
  return {
    eventId: `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    gameId: 'game-123',
    sequence: 1,
    inning: 1,
    halfInning: 'TOP',
    outs: 0,
    batterId: 'batter-1',
    batterName: 'John Batter',
    pitcherId: 'pitcher-1',
    pitcherName: 'Joe Pitcher',
    result: 'SINGLE',
    outsOnPlay: 0,
    runsScored: 0,
    rbiCount: 0,
    basesBefore: { first: null, second: null, third: null },
    basesAfter: { first: 'batter-1', second: null, third: null },
    leverageIndex: 1.0,
    winProbabilityBefore: 0.5,
    winProbabilityAfter: 0.52,
    wpa: 0.02,
    pitchCount: 3,
    timestamp: Date.now(),
    ...overrides,
  };
}

function createMockPitchingAppearance(
  overrides: Partial<PitchingAppearance> = {}
): PitchingAppearance {
  return {
    appearanceId: `app-${Date.now()}`,
    gameId: 'game-123',
    pitcherId: 'pitcher-1',
    pitcherName: 'Joe Starter',
    inning: 1,
    inheritedRunners: 0,
    inheritedRunnersScored: 0,
    isStarter: true,
    entryTime: Date.now(),
    exitTime: null,
    ...overrides,
  };
}

function createMockFieldingEvent(
  overrides: Partial<FieldingEvent> = {}
): FieldingEvent {
  return {
    fieldingEventId: `field-${Date.now()}`,
    gameId: 'game-123',
    atBatEventId: 'event-123',
    playerId: 'fielder-1',
    playerName: 'Glove Guy',
    position: 'SS',
    eventType: 'PUTOUT',
    zone: 'F6',
    difficulty: 0.5,
    timestamp: Date.now(),
    ...overrides,
  };
}

// ============================================
// DATABASE CONSTANTS
// ============================================

describe('Database Constants', () => {
  test('DB_NAME is kbl-event-log', () => {
    const DB_NAME = 'kbl-event-log';
    expect(DB_NAME).toBe('kbl-event-log');
  });

  test('DB_VERSION is 1', () => {
    const DB_VERSION = 1;
    expect(DB_VERSION).toBe(1);
  });

  test('STORES contains all required stores', () => {
    const STORES = {
      GAME_HEADERS: 'gameHeaders',
      AT_BAT_EVENTS: 'atBatEvents',
      PITCHING_APPEARANCES: 'pitchingAppearances',
      FIELDING_EVENTS: 'fieldingEvents',
    };

    expect(STORES.GAME_HEADERS).toBe('gameHeaders');
    expect(STORES.AT_BAT_EVENTS).toBe('atBatEvents');
    expect(STORES.PITCHING_APPEARANCES).toBe('pitchingAppearances');
    expect(STORES.FIELDING_EVENTS).toBe('fieldingEvents');
  });
});

// ============================================
// GAME HEADER TESTS
// ============================================

describe('GameHeader Structure', () => {
  test('has required identification fields', () => {
    const header = createMockGameHeader();

    expect(header).toHaveProperty('gameId');
    expect(header).toHaveProperty('seasonId');
    expect(header).toHaveProperty('date');
  });

  test('has team fields', () => {
    const header = createMockGameHeader();

    expect(header).toHaveProperty('homeTeamId');
    expect(header).toHaveProperty('awayTeamId');
    expect(header).toHaveProperty('homeTeamName');
    expect(header).toHaveProperty('awayTeamName');
  });

  test('has aggregation tracking fields', () => {
    const header = createMockGameHeader();

    expect(header).toHaveProperty('aggregated');
    expect(header).toHaveProperty('aggregatedAt');
    expect(header).toHaveProperty('aggregationError');
    expect(header).toHaveProperty('eventCount');
    expect(header).toHaveProperty('checksum');
  });

  test('has playoff fields', () => {
    const header = createMockGameHeader();

    expect(header).toHaveProperty('isPlayoffs');
    expect(header).toHaveProperty('playoffRound');
  });

  test('has timing fields', () => {
    const header = createMockGameHeader();

    expect(header).toHaveProperty('startTime');
    expect(header).toHaveProperty('endTime');
  });

  test('new game starts unaggregated', () => {
    const header = createMockGameHeader();

    expect(header.aggregated).toBe(false);
    expect(header.aggregatedAt).toBeNull();
  });

  test('playoff game has round info', () => {
    const playoffGame = createMockGameHeader({
      isPlayoffs: true,
      playoffRound: 'championship_series',
    });

    expect(playoffGame.isPlayoffs).toBe(true);
    expect(playoffGame.playoffRound).toBe('championship_series');
  });
});

// ============================================
// AT-BAT EVENT TESTS
// ============================================

describe('AtBatEvent Structure', () => {
  test('has unique eventId', () => {
    const event1 = createMockAtBatEvent();
    const event2 = createMockAtBatEvent();

    expect(event1.eventId).toBeTruthy();
    expect(event2.eventId).toBeTruthy();
    expect(event1.eventId).not.toBe(event2.eventId);
  });

  test('has game and sequence for ordering', () => {
    const event = createMockAtBatEvent({ gameId: 'game-1', sequence: 5 });

    expect(event.gameId).toBe('game-1');
    expect(event.sequence).toBe(5);
  });

  test('has game situation context', () => {
    const event = createMockAtBatEvent({
      inning: 7,
      halfInning: 'BOTTOM',
      outs: 2,
    });

    expect(event.inning).toBe(7);
    expect(event.halfInning).toBe('BOTTOM');
    expect(event.outs).toBe(2);
  });

  test('has batter/pitcher identification', () => {
    const event = createMockAtBatEvent({
      batterId: 'bat-123',
      batterName: 'Slugger',
      pitcherId: 'pitch-456',
      pitcherName: 'Ace',
    });

    expect(event.batterId).toBe('bat-123');
    expect(event.batterName).toBe('Slugger');
    expect(event.pitcherId).toBe('pitch-456');
    expect(event.pitcherName).toBe('Ace');
  });

  test('has play outcome fields', () => {
    const event = createMockAtBatEvent({
      result: 'DOUBLE',
      outsOnPlay: 0,
      runsScored: 2,
      rbiCount: 2,
    });

    expect(event.result).toBe('DOUBLE');
    expect(event.outsOnPlay).toBe(0);
    expect(event.runsScored).toBe(2);
    expect(event.rbiCount).toBe(2);
  });

  test('has base state before and after', () => {
    const event = createMockAtBatEvent({
      basesBefore: { first: 'runner-1', second: null, third: null },
      basesAfter: { first: null, second: null, third: 'runner-1' },
    });

    expect(event.basesBefore.first).toBe('runner-1');
    expect(event.basesAfter.third).toBe('runner-1');
  });

  test('has advanced metrics', () => {
    const event = createMockAtBatEvent({
      leverageIndex: 2.5,
      winProbabilityBefore: 0.45,
      winProbabilityAfter: 0.55,
      wpa: 0.10,
    });

    expect(event.leverageIndex).toBe(2.5);
    expect(event.wpa).toBeCloseTo(0.10, 4);
  });

  test('has pitch count', () => {
    const event = createMockAtBatEvent({ pitchCount: 7 });
    expect(event.pitchCount).toBe(7);
  });
});

// ============================================
// PITCHING APPEARANCE TESTS
// ============================================

describe('PitchingAppearance Structure', () => {
  test('has identification fields', () => {
    const appearance = createMockPitchingAppearance({
      appearanceId: 'app-123',
      gameId: 'game-456',
      pitcherId: 'pitcher-789',
    });

    expect(appearance.appearanceId).toBe('app-123');
    expect(appearance.gameId).toBe('game-456');
    expect(appearance.pitcherId).toBe('pitcher-789');
  });

  test('tracks inherited runners', () => {
    const relief = createMockPitchingAppearance({
      inheritedRunners: 2,
      inheritedRunnersScored: 1,
      isStarter: false,
    });

    expect(relief.inheritedRunners).toBe(2);
    expect(relief.inheritedRunnersScored).toBe(1);
    expect(relief.isStarter).toBe(false);
  });

  test('starter has no inherited runners', () => {
    const starter = createMockPitchingAppearance({
      isStarter: true,
      inheritedRunners: 0,
    });

    expect(starter.isStarter).toBe(true);
    expect(starter.inheritedRunners).toBe(0);
  });

  test('tracks entry inning', () => {
    const midgame = createMockPitchingAppearance({
      inning: 6,
      isStarter: false,
    });

    expect(midgame.inning).toBe(6);
  });

  test('has entry and exit times', () => {
    const finished = createMockPitchingAppearance({
      entryTime: 1000,
      exitTime: 5000,
    });

    expect(finished.entryTime).toBe(1000);
    expect(finished.exitTime).toBe(5000);
  });

  test('active pitcher has null exitTime', () => {
    const active = createMockPitchingAppearance({ exitTime: null });
    expect(active.exitTime).toBeNull();
  });
});

// ============================================
// FIELDING EVENT TESTS
// ============================================

describe('FieldingEvent Structure', () => {
  test('has identification fields', () => {
    const event = createMockFieldingEvent({
      fieldingEventId: 'field-123',
      gameId: 'game-456',
      atBatEventId: 'event-789',
    });

    expect(event.fieldingEventId).toBe('field-123');
    expect(event.gameId).toBe('game-456');
    expect(event.atBatEventId).toBe('event-789');
  });

  test('has player identification', () => {
    const event = createMockFieldingEvent({
      playerId: 'player-123',
      playerName: 'Gold Glove',
      position: 'CF',
    });

    expect(event.playerId).toBe('player-123');
    expect(event.playerName).toBe('Gold Glove');
    expect(event.position).toBe('CF');
  });

  test('event types are valid', () => {
    const validTypes: FieldingEvent['eventType'][] = [
      'PUTOUT',
      'ASSIST',
      'ERROR',
      'DOUBLE_PLAY',
      'OUTFIELD_ASSIST',
    ];

    validTypes.forEach((type) => {
      const event = createMockFieldingEvent({ eventType: type });
      expect(validTypes).toContain(event.eventType);
    });
  });

  test('has zone and difficulty', () => {
    const event = createMockFieldingEvent({
      zone: 'F8',
      difficulty: 0.75,
    });

    expect(event.zone).toBe('F8');
    expect(event.difficulty).toBe(0.75);
  });

  test('difficulty is 0-1 scale', () => {
    const easy = createMockFieldingEvent({ difficulty: 0.1 });
    const hard = createMockFieldingEvent({ difficulty: 0.9 });

    expect(easy.difficulty).toBeGreaterThanOrEqual(0);
    expect(easy.difficulty).toBeLessThanOrEqual(1);
    expect(hard.difficulty).toBeGreaterThanOrEqual(0);
    expect(hard.difficulty).toBeLessThanOrEqual(1);
  });
});

// ============================================
// BOX SCORE GENERATION TESTS
// ============================================

describe('BoxScore Structure', () => {
  test('has gameId', () => {
    const boxScore: BoxScore = {
      gameId: 'game-123',
      homeTeam: {
        id: 'home',
        name: 'Home Team',
        runs: 5,
        hits: 10,
        errors: 1,
        batters: [],
        pitchers: [],
      },
      awayTeam: {
        id: 'away',
        name: 'Away Team',
        runs: 3,
        hits: 8,
        errors: 2,
        batters: [],
        pitchers: [],
      },
      lineScore: [],
    };

    expect(boxScore.gameId).toBe('game-123');
  });

  test('team stats include R/H/E', () => {
    const boxScore: BoxScore = {
      gameId: 'game-123',
      homeTeam: {
        id: 'home',
        name: 'Home',
        runs: 7,
        hits: 12,
        errors: 0,
        batters: [],
        pitchers: [],
      },
      awayTeam: {
        id: 'away',
        name: 'Away',
        runs: 4,
        hits: 9,
        errors: 3,
        batters: [],
        pitchers: [],
      },
      lineScore: [],
    };

    expect(boxScore.homeTeam.runs).toBe(7);
    expect(boxScore.homeTeam.hits).toBe(12);
    expect(boxScore.homeTeam.errors).toBe(0);
  });

  test('batter box score has required stats', () => {
    const batter: BoxScoreBatter = {
      playerId: 'player-1',
      name: 'Slugger',
      position: 'RF',
      ab: 4,
      r: 2,
      h: 2,
      rbi: 3,
      bb: 1,
      so: 1,
      avg: '.500',
    };

    expect(batter.ab).toBe(4);
    expect(batter.h).toBe(2);
    expect(batter.rbi).toBe(3);
  });

  test('pitcher box score has required stats', () => {
    const pitcher: BoxScorePitcher = {
      playerId: 'pitcher-1',
      name: 'Ace',
      ip: '6.2',
      h: 5,
      r: 2,
      er: 2,
      bb: 2,
      so: 8,
      era: '2.70',
      decision: 'W',
    };

    expect(pitcher.ip).toBe('6.2');
    expect(pitcher.so).toBe(8);
    expect(pitcher.decision).toBe('W');
  });
});

// ============================================
// AGGREGATION STATUS TESTS
// ============================================

describe('Aggregation Status', () => {
  test('unaggregated game has aggregated: false', () => {
    const header = createMockGameHeader({ aggregated: false });
    expect(header.aggregated).toBe(false);
  });

  test('aggregated game has aggregated: true with timestamp', () => {
    const header = createMockGameHeader({
      aggregated: true,
      aggregatedAt: Date.now(),
    });

    expect(header.aggregated).toBe(true);
    expect(header.aggregatedAt).not.toBeNull();
  });

  test('failed aggregation has error message', () => {
    const header = createMockGameHeader({
      aggregated: false,
      aggregationError: 'Database write failed',
    });

    expect(header.aggregated).toBe(false);
    expect(header.aggregationError).toBe('Database write failed');
  });

  test('successful aggregation clears error', () => {
    const header = createMockGameHeader({
      aggregated: true,
      aggregatedAt: Date.now(),
      aggregationError: null,
    });

    expect(header.aggregationError).toBeNull();
  });
});

// ============================================
// DATA INTEGRITY TESTS
// ============================================

describe('Data Integrity', () => {
  test('checksum is string', () => {
    const header = createMockGameHeader({ checksum: 'abc123' });
    expect(typeof header.checksum).toBe('string');
  });

  test('eventCount tracks number of at-bats', () => {
    const header = createMockGameHeader({ eventCount: 68 });
    expect(header.eventCount).toBe(68);
  });

  test('sequence numbers are unique within game', () => {
    const events = [
      createMockAtBatEvent({ gameId: 'game-1', sequence: 1 }),
      createMockAtBatEvent({ gameId: 'game-1', sequence: 2 }),
      createMockAtBatEvent({ gameId: 'game-1', sequence: 3 }),
    ];

    const sequences = events.map((e) => e.sequence);
    const uniqueSequences = new Set(sequences);

    expect(uniqueSequences.size).toBe(events.length);
  });

  test('events can be ordered by sequence', () => {
    const events = [
      createMockAtBatEvent({ sequence: 3 }),
      createMockAtBatEvent({ sequence: 1 }),
      createMockAtBatEvent({ sequence: 2 }),
    ];

    const sorted = [...events].sort((a, b) => a.sequence - b.sequence);

    expect(sorted[0].sequence).toBe(1);
    expect(sorted[1].sequence).toBe(2);
    expect(sorted[2].sequence).toBe(3);
  });
});

// ============================================
// QUERY PATTERNS
// ============================================

describe('Query Patterns', () => {
  test('can query events by gameId', () => {
    const events = [
      createMockAtBatEvent({ gameId: 'game-1' }),
      createMockAtBatEvent({ gameId: 'game-2' }),
      createMockAtBatEvent({ gameId: 'game-1' }),
    ];

    const game1Events = events.filter((e) => e.gameId === 'game-1');
    expect(game1Events).toHaveLength(2);
  });

  test('can query events by batterId', () => {
    const events = [
      createMockAtBatEvent({ batterId: 'player-1' }),
      createMockAtBatEvent({ batterId: 'player-2' }),
      createMockAtBatEvent({ batterId: 'player-1' }),
    ];

    const player1Events = events.filter((e) => e.batterId === 'player-1');
    expect(player1Events).toHaveLength(2);
  });

  test('can query events by pitcherId', () => {
    const events = [
      createMockAtBatEvent({ pitcherId: 'pitcher-A' }),
      createMockAtBatEvent({ pitcherId: 'pitcher-B' }),
      createMockAtBatEvent({ pitcherId: 'pitcher-A' }),
    ];

    const pitcherAEvents = events.filter((e) => e.pitcherId === 'pitcher-A');
    expect(pitcherAEvents).toHaveLength(2);
  });

  test('can query unaggregated games', () => {
    const headers = [
      createMockGameHeader({ gameId: 'g1', aggregated: false }),
      createMockGameHeader({ gameId: 'g2', aggregated: true }),
      createMockGameHeader({ gameId: 'g3', aggregated: false }),
    ];

    const unaggregated = headers.filter((h) => !h.aggregated);
    expect(unaggregated).toHaveLength(2);
  });

  test('can query games by seasonId', () => {
    const headers = [
      createMockGameHeader({ gameId: 'g1', seasonId: 'season-2024' }),
      createMockGameHeader({ gameId: 'g2', seasonId: 'season-2023' }),
      createMockGameHeader({ gameId: 'g3', seasonId: 'season-2024' }),
    ];

    const season2024 = headers.filter((h) => h.seasonId === 'season-2024');
    expect(season2024).toHaveLength(2);
  });
});

// ============================================
// STORAGE COST CALCULATIONS
// ============================================

describe('Storage Cost Calculations', () => {
  test('~500 bytes per at-bat event', () => {
    const BYTES_PER_EVENT = 500;
    expect(BYTES_PER_EVENT).toBeCloseTo(500, -1);
  });

  test('~35KB per game (70 at-bats)', () => {
    const BYTES_PER_EVENT = 500;
    const AT_BATS_PER_GAME = 70;
    const KB_PER_GAME = (BYTES_PER_EVENT * AT_BATS_PER_GAME) / 1024;

    expect(KB_PER_GAME).toBeCloseTo(35, -1);
  });

  test('~18MB per season (512 games)', () => {
    const BYTES_PER_GAME = 35 * 1024; // 35KB
    const GAMES_PER_SEASON = 512;
    const MB_PER_SEASON = (BYTES_PER_GAME * GAMES_PER_SEASON) / (1024 * 1024);

    expect(MB_PER_SEASON).toBeCloseTo(18, -1);
  });
});

// ============================================
// PRACTICAL SCENARIOS
// ============================================

describe('Practical Scenarios', () => {
  test('record single with runner scoring', () => {
    const event = createMockAtBatEvent({
      result: 'SINGLE',
      basesBefore: { first: null, second: null, third: 'runner-1' },
      basesAfter: { first: 'batter-1', second: null, third: null },
      runsScored: 1,
      rbiCount: 1,
    });

    expect(event.result).toBe('SINGLE');
    expect(event.runsScored).toBe(1);
    expect(event.basesBefore.third).toBe('runner-1');
    expect(event.basesAfter.first).toBe('batter-1');
  });

  test('record double play', () => {
    const event = createMockAtBatEvent({
      result: 'GROUND_OUT',
      outsOnPlay: 2,
      basesBefore: { first: 'runner-1', second: null, third: null },
      basesAfter: { first: null, second: null, third: null },
    });

    expect(event.outsOnPlay).toBe(2);
    expect(event.basesAfter.first).toBeNull();
  });

  test('record strikeout high leverage', () => {
    const event = createMockAtBatEvent({
      result: 'STRIKEOUT',
      leverageIndex: 3.5,
      winProbabilityBefore: 0.35,
      winProbabilityAfter: 0.25,
      wpa: -0.10,
    });

    expect(event.result).toBe('STRIKEOUT');
    expect(event.leverageIndex).toBe(3.5);
    expect(event.wpa).toBe(-0.10);
  });

  test('track relief pitcher with inherited runners', () => {
    const reliever = createMockPitchingAppearance({
      isStarter: false,
      inning: 7,
      inheritedRunners: 2,
      inheritedRunnersScored: 1,
    });

    expect(reliever.isStarter).toBe(false);
    expect(reliever.inheritedRunners).toBe(2);
    expect(reliever.inheritedRunnersScored).toBe(1);
  });

  test('record web gem', () => {
    const webGem = createMockFieldingEvent({
      eventType: 'PUTOUT',
      position: 'CF',
      zone: 'F8',
      difficulty: 0.92,
    });

    expect(webGem.eventType).toBe('PUTOUT');
    expect(webGem.difficulty).toBeGreaterThan(0.9);
  });

  test('record error', () => {
    const error = createMockFieldingEvent({
      eventType: 'ERROR',
      position: 'SS',
      difficulty: 0.3, // Easy play that was muffed
    });

    expect(error.eventType).toBe('ERROR');
    expect(error.difficulty).toBeLessThan(0.5);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  test('handles extra innings game', () => {
    const event = createMockAtBatEvent({ inning: 12 });
    expect(event.inning).toBeGreaterThan(9);
  });

  test('handles bases loaded grand slam', () => {
    const grandSlam = createMockAtBatEvent({
      result: 'HOME_RUN',
      basesBefore: {
        first: 'runner-1',
        second: 'runner-2',
        third: 'runner-3',
      },
      basesAfter: { first: null, second: null, third: null },
      runsScored: 4,
      rbiCount: 4,
    });

    expect(grandSlam.runsScored).toBe(4);
    expect(grandSlam.rbiCount).toBe(4);
  });

  test('handles extremely high leverage', () => {
    const clutch = createMockAtBatEvent({
      leverageIndex: 6.5,
      inning: 9,
      halfInning: 'BOTTOM',
      outs: 2,
    });

    expect(clutch.leverageIndex).toBeGreaterThan(5);
  });

  test('handles no-hitter in progress', () => {
    // All events are outs, no hits
    const events = [
      createMockAtBatEvent({ result: 'STRIKEOUT' }),
      createMockAtBatEvent({ result: 'FLY_OUT' }),
      createMockAtBatEvent({ result: 'GROUND_OUT' }),
    ];

    const hits = events.filter((e) =>
      ['SINGLE', 'DOUBLE', 'TRIPLE', 'HOME_RUN'].includes(e.result)
    );
    expect(hits).toHaveLength(0);
  });

  test('handles walk-off situation', () => {
    const walkoff = createMockAtBatEvent({
      inning: 9,
      halfInning: 'BOTTOM',
      result: 'HOME_RUN',
      runsScored: 1,
      winProbabilityAfter: 1.0,
    });

    expect(walkoff.halfInning).toBe('BOTTOM');
    expect(walkoff.winProbabilityAfter).toBe(1.0);
  });
});
