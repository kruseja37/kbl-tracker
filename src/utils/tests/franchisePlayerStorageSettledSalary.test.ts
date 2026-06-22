import 'fake-indexeddb/auto';

import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

import {
  deleteFranchiseDatabase,
  getFranchisePlayer,
  saveFranchisePlayer,
  type Player,
} from '../franchisePlayerStorage';

const franchiseId = 'franchise-settled-salary';

function makePlayer(overrides: Partial<Player> & { id: string }): Player {
  return {
    id: overrides.id,
    firstName: 'Salary',
    lastName: 'Tester',
    gender: 'M',
    age: 27,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    power: 50,
    contact: 50,
    speed: 50,
    fielding: 50,
    arm: 50,
    velocity: 50,
    junk: 50,
    accuracy: 50,
    arsenal: [],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 1000,
    leagueAssignments: [],
    editHistory: [],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: false,
    ...overrides,
  } as Player;
}

describe('franchisePlayerStorage settledSalary saved shape', () => {
  afterEach(async () => {
    await deleteFranchiseDatabase(franchiseId);
  });

  test('round-trips settledSalary when present', async () => {
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: 'player-with-settled-salary',
      settledSalary: 1234,
    }));

    const stored = await getFranchisePlayer(franchiseId, 'player-with-settled-salary');

    expect(stored?.settledSalary).toBe(1234);
  });

  test('does not default settledSalary when absent', async () => {
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: 'player-without-settled-salary',
    }));

    const stored = await getFranchisePlayer(franchiseId, 'player-without-settled-salary');

    expect(stored?.settledSalary).toBeUndefined();
  });
});
