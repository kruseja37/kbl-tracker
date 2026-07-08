import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

import { registerLeaguePoolForLeague } from '../leagueBuilderPoolRegistration';
import {
  listRosteredButUnassigned,
  lockLeaguePool,
} from '../leagueBuilderPoolBuilder';
import {
  __resetLeagueBuilderDatabaseForTests,
  clearAllLeagueBuilderData,
  createEmptyTeamRoster,
  getPlayer,
  saveLeagueTemplate,
  savePlayer,
  saveTeamRoster,
  type DraftPoolMode,
  type Player,
} from '../leagueBuilderStorage';

const LEAGUE_ID = 'dj05-league';
const TEAM_ID = 'dj05-team';

function makePlayer(id: string, assignmentLeagueIds: string[] = []): Player {
  return {
    id,
    firstName: id,
    lastName: 'DJ05',
    gender: 'M',
    age: 25,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    power: 60,
    contact: 60,
    speed: 60,
    fielding: 60,
    arm: 60,
    velocity: 30,
    junk: 30,
    accuracy: 30,
    arsenal: ['4F'],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Crafty',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 10_000,
    leagueAssignments: assignmentLeagueIds.map((leagueId) => ({
      leagueId,
      teamId: '',
      rosterStatus: 'FREE_AGENT',
    })),
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: true,
  };
}

async function seedFixture(mode?: DraftPoolMode, assignedIds: string[] = ['A']): Promise<void> {
  await saveLeagueTemplate({
    id: LEAGUE_ID,
    name: 'DJ-05 League',
    teamIds: [TEAM_ID],
    conferences: [],
    divisions: [],
    defaultRulesPreset: 'standard',
    draftFormat: 'auction',
    ...(mode ? { draftPoolMode: mode } : {}),
  });

  for (const id of ['A', 'B', 'C', 'D']) {
    await savePlayer(makePlayer(id, assignedIds.includes(id) ? [LEAGUE_ID] : []));
  }

  await saveTeamRoster({
    ...createEmptyTeamRoster(TEAM_ID),
    mlbRoster: ['B'],
    farmRoster: ['C'],
  });
}

function ids(rows: Array<{ id: string }>): string[] {
  return rows.map((row) => row.id).sort();
}

beforeEach(async () => {
  __resetLeagueBuilderDatabaseForTests();
  await clearAllLeagueBuilderData().catch(() => undefined);
});

afterEach(async () => {
  await clearAllLeagueBuilderData().catch(() => undefined);
  __resetLeagueBuilderDatabaseForTests();
});

describe('DJ-05 league pool membership', () => {
  test('T1: design-first excludes the roster union', async () => {
    await seedFixture('design-first');

    const pool = await registerLeaguePoolForLeague(LEAGUE_ID);

    expect(ids(pool.players)).toEqual(['A']);
  });

  test('T2: pool-first and absent mode keep the Source-A plus Source-B union', async () => {
    await seedFixture('pool-first');
    expect(ids((await registerLeaguePoolForLeague(LEAGUE_ID)).players)).toEqual(['A', 'B', 'C']);

    await clearAllLeagueBuilderData();
    __resetLeagueBuilderDatabaseForTests();
    await seedFixture(undefined);
    expect(ids((await registerLeaguePoolForLeague(LEAGUE_ID)).players)).toEqual(['A', 'B', 'C']);
  });

  test('T3: lock-time regen covers the frozen set itself', async () => {
    await seedFixture('pool-first');

    const poolFirstLocked = await lockLeaguePool(LEAGUE_ID);
    expect(ids(poolFirstLocked.players)).toEqual(['A', 'B', 'C']);
    expect((await getPlayer('B'))?.hiddenPersonalityModifiers).toBeTruthy();

    await clearAllLeagueBuilderData();
    __resetLeagueBuilderDatabaseForTests();
    await seedFixture('design-first');

    const designFirstLocked = await lockLeaguePool(LEAGUE_ID);
    expect(ids(designFirstLocked.players)).toEqual(['A']);
    expect((await getPlayer('B'))?.hiddenPersonalityModifiers).toBeUndefined();
  });

  test('T4: design-first See == Freeze equals the assignment set at lock time', async () => {
    await seedFixture('design-first', ['A', 'D']);

    const locked = await lockLeaguePool(LEAGUE_ID);

    expect(ids(locked.players)).toEqual(['A', 'D']);
  });

  test('F20: lock rejects registration drift from the displayed player ids', async () => {
    await seedFixture('pool-first', ['A']);

    await expect(lockLeaguePool(LEAGUE_ID, { expectedPlayerIds: ['A'] })).rejects.toThrow(
      /Draft pool changed while locking/i,
    );
  });

  test('T5: listRosteredButUnassigned reports only design-first roster strays', async () => {
    await seedFixture('design-first');
    expect(ids(await listRosteredButUnassigned(LEAGUE_ID))).toEqual(['B', 'C']);

    await savePlayer(makePlayer('B', [LEAGUE_ID]));
    await savePlayer(makePlayer('C', [LEAGUE_ID]));
    expect(await listRosteredButUnassigned(LEAGUE_ID)).toEqual([]);

    await clearAllLeagueBuilderData();
    __resetLeagueBuilderDatabaseForTests();
    await seedFixture('pool-first');
    expect(await listRosteredButUnassigned(LEAGUE_ID)).toEqual([]);
  });
});
