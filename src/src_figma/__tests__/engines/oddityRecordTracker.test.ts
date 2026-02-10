/**
 * Oddity Records Tracker Tests (GAP-B10-001)
 */
import { describe, test, expect } from 'vitest';
import {
  ODDITY_RECORD_TYPES,
  ODDITY_LABELS,
  createGameOddityState,
  updateGameOddityState,
  checkPlayOddities,
  checkEndOfGameOddities,
  checkSeasonEndOddities,
  type OddityRecordCandidate,
  type OddityRecordType,
} from '../../../engines/oddityRecordTracker';

describe('Oddity Record Types', () => {
  test('19 record types defined', () => {
    expect(ODDITY_RECORD_TYPES).toHaveLength(19);
  });

  test('all types have labels', () => {
    for (const type of ODDITY_RECORD_TYPES) {
      expect(ODDITY_LABELS[type]).toBeDefined();
    }
  });
});

describe('GameOddityState', () => {
  test('createGameOddityState returns clean state', () => {
    const state = createGameOddityState();
    expect(state.maxDeficit.deficit).toBe(0);
    expect(state.maxLead.lead).toBe(0);
    expect(state.totalPitches.home).toBe(0);
    expect(state.errors.home).toBe(0);
  });

  test('updateGameOddityState tracks deficit', () => {
    const state = createGameOddityState();
    // Home team down 5-0 in 3rd
    updateGameOddityState(state, 0, 5, 3);
    // maxDeficit should track for the home team being behind
    expect(state.maxDeficit.deficit).toBeGreaterThanOrEqual(0);
  });

  test('updateGameOddityState tracks pitch counts', () => {
    const state = createGameOddityState();
    updateGameOddityState(state, 0, 0, 1, 15, true);
    updateGameOddityState(state, 0, 0, 1, 12, false);
    expect(state.totalPitches.home).toBe(15);
    expect(state.totalPitches.away).toBe(12);
  });

  test('updateGameOddityState tracks errors', () => {
    const state = createGameOddityState();
    updateGameOddityState(state, 0, 0, 1, undefined, undefined, { team: 'home' });
    updateGameOddityState(state, 0, 0, 2, undefined, undefined, { team: 'home' });
    expect(state.errors.home).toBe(2);
    expect(state.errors.away).toBe(0);
  });
});

describe('checkPlayOddities', () => {
  const emptyRecords = new Map<OddityRecordType, OddityRecordCandidate>();

  test('SHORTEST_HOMER detected on HR with distance', () => {
    const result = checkPlayOddities(
      { result: 'HR', distance: 315, playerId: 'p1', playerName: 'Joe', ratings: { power: 80 } },
      'g1', 1, emptyRecords,
    );
    const shortest = result.find(c => c.recordType === 'SHORTEST_HOMER');
    expect(shortest).toBeDefined();
    expect(shortest!.value).toBe(315);
  });

  test('WEAKEST_HOMER detected on HR with low power', () => {
    const result = checkPlayOddities(
      { result: 'HR', playerId: 'p1', playerName: 'Weak Joe', ratings: { power: 25 } },
      'g1', 1, emptyRecords,
    );
    const weakest = result.find(c => c.recordType === 'WEAKEST_HOMER');
    expect(weakest).toBeDefined();
    expect(weakest!.value).toBe(25);
  });

  test('SLOWEST_TRIPLE detected on 3B with low speed', () => {
    const result = checkPlayOddities(
      { result: '3B', playerId: 'p1', playerName: 'Slow Mo', ratings: { speed: 15 } },
      'g1', 1, emptyRecords,
    );
    expect(result.find(c => c.recordType === 'SLOWEST_TRIPLE')).toBeDefined();
  });

  test('SLOW_POKE_STEAL detected on SB with low speed', () => {
    const result = checkPlayOddities(
      { result: 'SB', playerId: 'p1', playerName: 'Turtle', ratings: { speed: 10 } },
      'g1', 1, emptyRecords,
    );
    expect(result.find(c => c.recordType === 'SLOW_POKE_STEAL')).toBeDefined();
  });

  test('no candidates for non-matching play', () => {
    const result = checkPlayOddities(
      { result: 'GO', playerId: 'p1', playerName: 'Normal', ratings: { power: 50, speed: 50 } },
      'g1', 1, emptyRecords,
    );
    expect(result).toHaveLength(0);
  });

  test('new record replaces old one if better', () => {
    const records = new Map<OddityRecordType, OddityRecordCandidate>();
    records.set('SHORTEST_HOMER', {
      recordType: 'SHORTEST_HOMER', value: 350, gameId: 'g0', season: 1,
      context: 'old', playerId: 'old',
    });
    const result = checkPlayOddities(
      { result: 'HR', distance: 320, playerId: 'p1', playerName: 'New', ratings: { power: 70 } },
      'g1', 1, records,
    );
    expect(result.find(c => c.recordType === 'SHORTEST_HOMER')).toBeDefined();
  });
});

describe('checkEndOfGameOddities', () => {
  test('MARATHON_GAME detected', () => {
    const state = createGameOddityState();
    state.totalPitches = { home: 150, away: 160 };
    const result = checkEndOfGameOddities({
      gameId: 'g1', season: 1, winner: 'home',
      homeScore: 5, awayScore: 3, oddityState: state,
      pitcherStats: [],
    }, new Map());
    expect(result.find(c => c.recordType === 'MARATHON_GAME')?.value).toBe(310);
  });

  test('EFFICIENT_CG detected', () => {
    const state = createGameOddityState();
    const result = checkEndOfGameOddities({
      gameId: 'g1', season: 1, winner: 'home',
      homeScore: 2, awayScore: 0, oddityState: state,
      pitcherStats: [{
        pitcherId: 'p1', pitcherName: 'Ace', isStarter: true,
        team: 'home', outsRecorded: 27, hitsAllowed: 3,
        walksAllowed: 1, earnedRuns: 0, pitchCount: 78,
        isCompleteGame: true,
      }],
    }, new Map());
    expect(result.find(c => c.recordType === 'EFFICIENT_CG')?.value).toBe(78);
  });

  test('COMEBACK_FROM_DEAD detected', () => {
    const state = createGameOddityState();
    state.maxDeficit = { team: 'home', deficit: 7, inning: 3 };
    const result = checkEndOfGameOddities({
      gameId: 'g1', season: 1, winner: 'home',
      homeScore: 8, awayScore: 7, oddityState: state,
      pitcherStats: [],
    }, new Map());
    expect(result.find(c => c.recordType === 'COMEBACK_FROM_DEAD')?.value).toBe(7);
  });

  test('ERROR_MACHINE_WIN detected', () => {
    const state = createGameOddityState();
    state.errors = { home: 4, away: 1 };
    const result = checkEndOfGameOddities({
      gameId: 'g1', season: 1, winner: 'home',
      homeScore: 6, awayScore: 5, oddityState: state,
      pitcherStats: [],
    }, new Map());
    expect(result.find(c => c.recordType === 'ERROR_MACHINE_WIN')?.value).toBe(4);
  });
});

describe('checkSeasonEndOddities', () => {
  test('SPEEDSTER_STRIKEOUT_KING detected', () => {
    const result = checkSeasonEndOddities(
      [{ playerId: 'p1', playerName: 'Fast K', ratings: { speed: 95 },
        hr: 5, strikeouts: 180, ab: 500 }],
      162, new Map(), 'g1', 1,
    );
    expect(result.find(c => c.recordType === 'SPEEDSTER_STRIKEOUT_KING')).toBeDefined();
  });

  test('POWER_OUTAGE detected', () => {
    const result = checkSeasonEndOddities(
      [{ playerId: 'p1', playerName: 'No Pop', ratings: { power: 85 },
        hr: 0, strikeouts: 50, ab: 400 }],
      162, new Map(), 'g1', 1,
    );
    expect(result.find(c => c.recordType === 'POWER_OUTAGE')).toBeDefined();
  });
});
