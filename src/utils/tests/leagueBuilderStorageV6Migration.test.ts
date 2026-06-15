import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

import { LUXURY_CAP_TABLES, TIER_CAPS } from '../../data/tierParams';
import {
  __resetLeagueBuilderDatabaseForTests,
  deleteRegisteredPool,
  getTeam,
  getLeagueTemplate,
  getRegisteredPool,
  initLeagueBuilderDatabase,
  saveTeam,
  saveRegisteredPool,
} from '../leagueBuilderStorage';
import type { RegisteredPool } from '../../engines/leagueConstruction';

const DB_NAME = 'kbl-league-builder';

const expectedStores = [
  'globalPlayers',
  'globalTeams',
  'leaguePlayerOverrides',
  'leagueTemplates',
  'registeredPools',
  'rulesPresets',
  'scoutProfiles',
  'startupDraftSessions',
  'teamRosters',
];

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function openRawDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function seedV5LeagueBuilderDatabase(): Promise<void> {
  await deleteDatabase(DB_NAME).catch(() => undefined);

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 5);

    request.onupgradeneeded = () => {
      const db = request.result;
      const leagues = db.createObjectStore('leagueTemplates', { keyPath: 'id' });
      leagues.createIndex('name', 'name', { unique: false });
      leagues.put({
        id: 'league-v5',
        name: 'Legacy V5 League',
        description: 'Pre-T8b template',
        createdDate: '2026-06-01T00:00:00.000Z',
        lastModified: '2026-06-01T00:00:00.000Z',
        teamIds: ['team-a', 'team-b'],
        conferences: [],
        divisions: [],
        defaultRulesPreset: 'rules-default',
        color: '#5A8352',
      });

      const teams = db.createObjectStore('globalTeams', { keyPath: 'id' });
      teams.createIndex('name', 'name', { unique: false });
      teams.createIndex('abbreviation', 'abbreviation', { unique: false });

      const players = db.createObjectStore('globalPlayers', { keyPath: 'id' });
      players.createIndex('lastName', 'lastName', { unique: false });
      players.createIndex('primaryPosition', 'primaryPosition', { unique: false });
      players.createIndex('overallGrade', 'overallGrade', { unique: false });

      const overrides = db.createObjectStore('leaguePlayerOverrides', { keyPath: 'id' });
      overrides.createIndex('leagueId', 'leagueId', { unique: false });
      overrides.createIndex('playerId', 'playerId', { unique: false });

      db.createObjectStore('rulesPresets', { keyPath: 'id' });
      db.createObjectStore('teamRosters', { keyPath: 'teamId' });

      const scoutProfiles = db.createObjectStore('scoutProfiles', { keyPath: 'id' });
      scoutProfiles.createIndex('leagueId', 'leagueId', { unique: false });
      scoutProfiles.createIndex('teamId', 'teamId', { unique: false });

      const startupDraftSessions = db.createObjectStore('startupDraftSessions', { keyPath: 'id' });
      startupDraftSessions.createIndex('leagueId', 'leagueId', { unique: false });
    };

    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

describe('leagueBuilderStorage v6 registered pool migration', () => {
  beforeEach(async () => {
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  afterEach(async () => {
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  test('fresh v6 database creates registeredPools and preserves all prior stores', async () => {
    const db = await initLeagueBuilderDatabase();

    expect(db.name).toBe(DB_NAME);
    expect(db.version).toBe(6);
    expect(Array.from(db.objectStoreNames).sort()).toEqual(expectedStores);
  });

  test('v5-shaped LeagueTemplate upgrades without rewrite and read defaults applied', async () => {
    await seedV5LeagueBuilderDatabase();

    const db = await initLeagueBuilderDatabase();
    expect(db.version).toBe(6);
    expect(Array.from(db.objectStoreNames).sort()).toEqual(expectedStores);

    const template = await getLeagueTemplate('league-v5');
    expect(template).toEqual(expect.objectContaining({
      id: 'league-v5',
      name: 'Legacy V5 League',
      teamIds: ['team-a', 'team-b'],
      tier: 'juiced',
      balanceMode: 'taxed',
    }));

    __resetLeagueBuilderDatabaseForTests();
    db.close();
    const rawDb = await openRawDatabase(DB_NAME);
    const tx = rawDb.transaction('leagueTemplates', 'readonly');
    const rawTemplate = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const request = tx.objectStore('leagueTemplates').get('league-v5');
      request.onsuccess = () => resolve(request.result as Record<string, unknown>);
      request.onerror = () => reject(request.error);
    });

    expect(rawTemplate.name).toBe('Legacy V5 League');
    expect(rawTemplate.tier).toBeUndefined();
    expect(rawTemplate.balanceMode).toBeUndefined();
    rawDb.close();
  });

  test('saveRegisteredPool, getRegisteredPool, and deleteRegisteredPool round-trip', async () => {
    const pool: RegisteredPool = {
      leagueId: 'league-pool',
      tier: 'standard',
      balanceMode: 'advisory',
      players: [
        { id: 'player-a', iv: 90_000, salary: 91_000 },
        { id: 'player-b', iv: 45_000, salary: 46_000 },
      ],
      tierCap: TIER_CAPS.standard.tierCap,
      luxuryCaps: LUXURY_CAP_TABLES.standard,
      pickValueChart: [
        { pick: 1, value: 90_000 },
        { pick: 2, value: 45_000 },
      ],
      totalSlots: 44,
      poolSurplusWarning: false,
    };

    await saveRegisteredPool(pool);
    await expect(getRegisteredPool(pool.leagueId)).resolves.toEqual(pool);

    await deleteRegisteredPool(pool.leagueId);
    await expect(getRegisteredPool(pool.leagueId)).resolves.toBeNull();
  });

  test('capIdentity is an additive Team field that round-trips when present and stays undefined when absent', async () => {
    const savedWithoutIdentity = await saveTeam({
      name: 'No Identity Club',
      abbreviation: 'NIC',
      location: 'Nowhere',
      nickname: 'Blank',
      colors: { primary: '#111111', secondary: '#eeeeee' },
      stadium: 'Plain Park',
      leagueIds: ['league-a'],
    });

    await expect(getTeam(savedWithoutIdentity.id)).resolves.toEqual(
      expect.not.objectContaining({ capIdentity: expect.anything() }),
    );

    const capIdentity = {
      bandPriorities: {
        Power: 5,
        Contact: 1,
        Speed: 0,
        Defense: 3,
        Rotation: 4,
        Bullpen: 2,
      },
      increase: ['Defense First', 'Fireballers'],
      decrease: ['Small Ballers'],
    };

    const savedWithIdentity = await saveTeam({
      name: 'Identity Club',
      abbreviation: 'IDC',
      location: 'Texture',
      nickname: 'Stack',
      colors: { primary: '#224466', secondary: '#ffee99' },
      stadium: 'Cap Yard',
      leagueIds: ['league-a'],
      capIdentity,
    });

    await expect(getTeam(savedWithIdentity.id)).resolves.toEqual(
      expect.objectContaining({ capIdentity }),
    );
  });
});
