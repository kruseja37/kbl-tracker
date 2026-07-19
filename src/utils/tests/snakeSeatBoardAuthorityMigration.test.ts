import { describe, expect, test } from 'vitest';

import {
  createMlbDraftSessionId,
  normalizeSnakeSeatBoardAuthorityRecords,
  SNAKE_SEAT_BOARD_AUTHORITY_FORMAT,
  type LeagueBuilderMlbDraftSession,
  type SnakeSeatBoardRecord,
  type SnakeSeatBoardStoreRecord,
} from '../leagueBuilderStorage';

function board(revision: number, marker: string): SnakeSeatBoardRecord {
  return {
    slots: { marker } as unknown as SnakeSeatBoardRecord['slots'],
    rankings: { global: [marker] },
    revision,
  };
}

function session(embedded?: SnakeSeatBoardRecord): LeagueBuilderMlbDraftSession {
  const id = createMlbDraftSessionId('migration-league', 1);
  return {
    id,
    leagueId: 'migration-league',
    seasonNumber: 1,
    seed: 'migration-seed',
    workflowVersion: 'snake-v1',
    engineMethodVersion: 'snake-s1a',
    tier: 'standard',
    balanceMode: 'taxed',
    rounds: 22,
    pickOrder: [{ round: 1, pick: 1, teamId: 'team-a' }],
    completedPicks: [],
    snakeSetup: {
      poolPlayerIds: ['player-a'],
      versionSelections: {},
      clubs: [{ teamId: 'team-a', hotseat: false }],
      orderSeed: 'order',
    },
    revision: 0,
    currentPickIndex: 0,
    createdDate: '2026-07-19T00:00:00.000Z',
    lastModified: '2026-07-19T00:00:00.000Z',
    ...(embedded ? { seatBoards: { 'team-a': embedded } } : {}),
  };
}

function row(value: SnakeSeatBoardRecord): SnakeSeatBoardStoreRecord {
  const base = session();
  return {
    id: `${base.id}::mlb-seat::team-a`,
    sessionId: base.id,
    leagueId: base.leagueId,
    seasonNumber: base.seasonNumber,
    teamId: 'team-a',
    phase: 'MLB',
    board: value,
    revision: value.revision,
    lastModified: '2026-07-19T00:00:00.000Z',
  };
}

describe('single snake seat-board authority migration', () => {
  test.each([
    {
      label: 'embedded only',
      stored: session(board(12, 'embedded-only')),
      rows: [],
      expected: board(12, 'embedded-only'),
    },
    {
      label: 'standalone only',
      stored: session(),
      rows: [row(board(12, 'standalone-only'))],
      expected: board(12, 'standalone-only'),
    },
    {
      label: 'higher embedded revision',
      stored: session(board(13, 'embedded-newer')),
      rows: [row(board(12, 'standalone-older'))],
      expected: board(13, 'embedded-newer'),
    },
    {
      label: 'higher standalone revision',
      stored: session(board(12, 'embedded-older')),
      rows: [row(board(13, 'standalone-newer'))],
      expected: board(13, 'standalone-newer'),
    },
    {
      label: 'equal identical revision',
      stored: session(board(13, 'same')),
      rows: [row(board(13, 'same'))],
      expected: board(13, 'same'),
    },
  ])('converts $label to one standalone row', ({ stored, rows, expected }) => {
    const normalized = normalizeSnakeSeatBoardAuthorityRecords({
      sessions: [stored],
      boardRows: rows,
      modifiedAt: '2026-07-19T01:00:00.000Z',
    });

    expect(normalized.sessions).toHaveLength(1);
    expect(normalized.sessions[0].seatBoardAuthorityFormat)
      .toBe(SNAKE_SEAT_BOARD_AUTHORITY_FORMAT);
    expect(normalized.sessions[0]).not.toHaveProperty('seatBoards');
    expect(normalized.sessions[0]).not.toHaveProperty('farmSeatBoards');
    expect(normalized.boardRows).toHaveLength(1);
    expect(normalized.boardRows[0].board).toEqual(expected);
  });

  test('rejects an equal-revision conflict without choosing a board', () => {
    expect(() => normalizeSnakeSeatBoardAuthorityRecords({
      sessions: [session(board(13, 'embedded'))],
      boardRows: [row(board(13, 'standalone'))],
      modifiedAt: '2026-07-19T01:00:00.000Z',
    })).toThrow(/corrupt/i);
  });
});
