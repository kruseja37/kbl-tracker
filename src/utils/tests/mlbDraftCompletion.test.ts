import { describe, expect, test } from 'vitest';

import type { RegisteredPool } from '../../engines/leagueConstruction';
import type { LeagueBuilderMlbDraftSession } from '../leagueBuilderStorage';
import {
  deriveSnakeMlbUnspentByTeamId,
  isCompletedSnakeMlbDraftSession,
} from '../mlbDraftCompletion';

function session(overrides: Partial<LeagueBuilderMlbDraftSession> = {}): LeagueBuilderMlbDraftSession {
  return {
    id: 'completion-test::startup-mlb-draft::1',
    leagueId: 'completion-test',
    seasonNumber: 1,
    seed: 'completion-test',
    workflowVersion: 'startup-mlb-draft-v1',
    engineMethodVersion: 'leagueConstruction.t8d-1',
    tier: 'standard',
    balanceMode: 'taxed',
    rounds: 1,
    pickOrder: [
      { round: 1, pick: 1, teamId: 'team-a' },
      { round: 1, pick: 2, teamId: 'team-b' },
    ],
    completedPicks: [
      { round: 1, pick: 1, teamId: 'team-a', playerId: 'player-a' },
      { round: 1, pick: 2, teamId: 'team-b', playerId: 'player-b', settledSalary: 400 },
    ],
    currentPickIndex: 2,
    createdDate: '2026-01-01',
    lastModified: '2026-01-01',
    ...overrides,
  };
}

const pool: RegisteredPool = {
  leagueId: 'completion-test',
  tier: 'standard',
  balanceMode: 'taxed',
  players: [
    { id: 'player-a', iv: 250, salary: 10 },
    { id: 'player-b', iv: 400, salary: 10 },
  ],
  tierCap: 1_000,
  luxuryCaps: [],
  pickValueChart: [],
  totalSlots: 2,
  poolSurplusWarning: false,
};

describe('D1 MLB draft completion helpers', () => {
  test('snake completion is currentPickIndex at or beyond pickOrder length', () => {
    expect(isCompletedSnakeMlbDraftSession(null)).toBe(false);
    expect(isCompletedSnakeMlbDraftSession(session({ currentPickIndex: 1 }))).toBe(false);
    expect(isCompletedSnakeMlbDraftSession(session({ currentPickIndex: 2 }))).toBe(true);
    expect(isCompletedSnakeMlbDraftSession(session({ currentPickIndex: 3 }))).toBe(true);
  });

  test('snake unspent uses persisted settlement or IV fallback and clamps cap headroom at zero', () => {
    expect(Object.fromEntries(deriveSnakeMlbUnspentByTeamId({
      session: session(),
      pool,
      salaryCap: 500,
    }))).toEqual({
      'team-a': 250,
      'team-b': 100,
    });

    expect(Object.fromEntries(deriveSnakeMlbUnspentByTeamId({
      session: session(),
      pool,
      salaryCap: 300,
    }))).toEqual({
      'team-a': 50,
      'team-b': 0,
    });
  });
});
