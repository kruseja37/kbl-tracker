import { describe, expect, test } from 'vitest';

import { buildSnakePickTicker } from '../snakePickTicker';

describe('snake pick ticker version receipts', () => {
  const players = [
    { id: 'ruth-peak', firstName: 'Babe', lastName: 'Ruth', versionGroupId: 'historical:ruth' },
    { id: 'ruth-career', firstName: 'Babe', lastName: 'Ruth', versionGroupId: 'historical:ruth' },
    { id: 'ruth-draft', firstName: 'Babe', lastName: 'Ruth', versionGroupId: 'historical:ruth' },
  ];
  const picks = [{ round: 1, pick: 1, playerId: 'ruth-peak', teamId: 'beewolves' }];

  test('adds a neutral receipt for sibling versions retired by the pick', () => {
    const ticker = buildSnakePickTicker({
      picks,
      players,
      teams: [{ id: 'beewolves', name: 'Beewolves' }],
      versionState: {
        draftedPlayerIdByGroupId: { 'historical:ruth': 'ruth-peak' },
        retiredPlayerIdsByGroupId: { 'historical:ruth': ['ruth-career', 'ruth-draft'] },
      },
      unknownPlayer: 'UNKNOWN PLAYER',
      unknownTeam: 'UNKNOWN TEAM',
    });

    expect(ticker.map((item) => item.text)).toEqual([
      'PICK #1 · BEEWOLVES SELECTED BABE RUTH',
      'BABE RUTH DRAFTED — 2 OTHER VERSIONS RETIRED.',
    ]);
  });

  test('undo naturally removes the receipt with the restored pre-pick truth', () => {
    expect(buildSnakePickTicker({
      picks: [],
      players,
      teams: [{ id: 'beewolves', name: 'Beewolves' }],
      versionState: { draftedPlayerIdByGroupId: {}, retiredPlayerIdsByGroupId: {} },
      unknownPlayer: 'UNKNOWN PLAYER',
      unknownTeam: 'UNKNOWN TEAM',
    })).toEqual([]);
  });
});
