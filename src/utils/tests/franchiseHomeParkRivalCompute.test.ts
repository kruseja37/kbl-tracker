import { describe, expect, test } from 'vitest';

import { computeHomeParkRival, type HomeParkRivalCandidate } from '../franchiseHomeParkRivalCompute';

function compute(
  candidates: HomeParkRivalCandidate[],
  overrides: Partial<Parameters<typeof computeHomeParkRival>[0]> = {},
) {
  return computeHomeParkRival({
    homeTeamId: 'home',
    candidates,
    distinctVisitorCount: 2,
    currentRivalTeamId: null,
    ...overrides,
  });
}

describe('computeHomeParkRival', () => {
  test('returns no-eligible when no visitor has won', () => {
    expect(compute([
      { teamId: 'away-a', winsAtPark: 0, recordsHeld: 5 },
      { teamId: 'away-b', winsAtPark: 0, recordsHeld: 1 },
    ])).toEqual({
      rivalTeamId: null,
      rivalWinsAtPark: 0,
      rivalRecordsHeld: 0,
      outcome: 'no-eligible',
    });
  });

  test('returns no-eligible when only one visiting team has played', () => {
    expect(compute([
      { teamId: 'away-a', winsAtPark: 3, recordsHeld: 0 },
    ], { distinctVisitorCount: 1 })).toEqual({
      rivalTeamId: null,
      rivalWinsAtPark: 0,
      rivalRecordsHeld: 0,
      outcome: 'no-eligible',
    });
  });

  test('crowns a clear wins leader with zero records held', () => {
    expect(compute([
      { teamId: 'away-a', winsAtPark: 3, recordsHeld: 0 },
      { teamId: 'away-b', winsAtPark: 1, recordsHeld: 7 },
    ])).toEqual({
      rivalTeamId: 'away-a',
      rivalWinsAtPark: 3,
      rivalRecordsHeld: 0,
      outcome: 'crowned',
    });
  });

  test('crowns the top eligible candidate', () => {
    expect(compute([
      { teamId: 'away-a', winsAtPark: 1, recordsHeld: 0 },
      { teamId: 'away-b', winsAtPark: 2, recordsHeld: 0 },
    ])).toMatchObject({
      rivalTeamId: 'away-b',
      outcome: 'crowned',
    });
  });

  test('ranks by wins, then records only when wins tie, then teamId', () => {
    expect(compute([
      { teamId: 'away-c', winsAtPark: 2, recordsHeld: 10 },
      { teamId: 'away-b', winsAtPark: 3, recordsHeld: 0 },
      { teamId: 'away-a', winsAtPark: 3, recordsHeld: 0 },
    ])).toMatchObject({
      rivalTeamId: 'away-a',
      rivalWinsAtPark: 3,
      rivalRecordsHeld: 0,
      outcome: 'crowned',
    });

    expect(compute([
      { teamId: 'away-a', winsAtPark: 2, recordsHeld: 1 },
      { teamId: 'away-b', winsAtPark: 2, recordsHeld: 4 },
    ])).toMatchObject({
      rivalTeamId: 'away-b',
      rivalWinsAtPark: 2,
      rivalRecordsHeld: 4,
      outcome: 'crowned',
    });
  });

  test('retains the incumbent on a pure tie', () => {
    expect(compute([
      { teamId: 'away-a', winsAtPark: 2, recordsHeld: 1 },
      { teamId: 'away-b', winsAtPark: 2, recordsHeld: 1 },
    ], { currentRivalTeamId: 'away-b' })).toEqual({
      rivalTeamId: 'away-b',
      rivalWinsAtPark: 2,
      rivalRecordsHeld: 1,
      outcome: 'retained',
    });
  });

  test('overtakes on more wins', () => {
    expect(compute([
      { teamId: 'away-a', winsAtPark: 3, recordsHeld: 0 },
      { teamId: 'away-b', winsAtPark: 2, recordsHeld: 10 },
    ], { currentRivalTeamId: 'away-b' })).toEqual({
      rivalTeamId: 'away-a',
      rivalWinsAtPark: 3,
      rivalRecordsHeld: 0,
      outcome: 'overtaken',
    });
  });

  test('overtakes on equal wins and more records', () => {
    expect(compute([
      { teamId: 'away-a', winsAtPark: 2, recordsHeld: 3 },
      { teamId: 'away-b', winsAtPark: 2, recordsHeld: 2 },
    ], { currentRivalTeamId: 'away-b' })).toEqual({
      rivalTeamId: 'away-a',
      rivalWinsAtPark: 2,
      rivalRecordsHeld: 3,
      outcome: 'overtaken',
    });
  });

  test('does not overtake with more records but fewer wins', () => {
    expect(compute([
      { teamId: 'away-a', winsAtPark: 1, recordsHeld: 10 },
      { teamId: 'away-b', winsAtPark: 2, recordsHeld: 0 },
    ], { currentRivalTeamId: 'away-b' })).toEqual({
      rivalTeamId: 'away-b',
      rivalWinsAtPark: 2,
      rivalRecordsHeld: 0,
      outcome: 'retained',
    });
  });

  test('retains incumbent after it loses records when no challenger has more wins', () => {
    expect(compute([
      { teamId: 'away-a', winsAtPark: 2, recordsHeld: 0 },
      { teamId: 'away-b', winsAtPark: 2, recordsHeld: 0 },
    ], { currentRivalTeamId: 'away-b' })).toEqual({
      rivalTeamId: 'away-b',
      rivalWinsAtPark: 2,
      rivalRecordsHeld: 0,
      outcome: 'retained',
    });
  });

  test('excludes the home team from its own candidates', () => {
    expect(compute([
      { teamId: 'home', winsAtPark: 99, recordsHeld: 99 },
      { teamId: 'away-a', winsAtPark: 1, recordsHeld: 0 },
    ])).toEqual({
      rivalTeamId: 'away-a',
      rivalWinsAtPark: 1,
      rivalRecordsHeld: 0,
      outcome: 'crowned',
    });
  });
});
