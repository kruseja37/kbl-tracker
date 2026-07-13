import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../utils/syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

import {
  __resetLeagueBuilderDatabaseForTests,
  getAllOverridesForLeague,
  getLeagueTemplate,
  getPlayer,
  getTeam,
  initLeagueBuilderDatabase,
  saveLeagueTemplate,
  savePlayer,
  saveTeam,
  setLeaguePlayerOverride,
} from '../../../utils/leagueBuilderStorage';
import { FAME_TIER_LABEL, type FameTier } from '../../../types/reporter';

const DB_NAME = 'kbl-league-builder';

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Delete blocked for ${name}`));
  });
}

async function seedLegacyLeagueBuilderDatabase(): Promise<void> {
  await deleteDatabase(DB_NAME).catch(() => undefined);

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 3);

    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('leagueTemplates', { keyPath: 'id' }).createIndex('name', 'name', { unique: false });
      db.createObjectStore('globalTeams', { keyPath: 'id' }).createIndex('name', 'name', { unique: false });

      const players = db.createObjectStore('globalPlayers', { keyPath: 'id' });
      players.createIndex('lastName', 'lastName', { unique: false });
      players.createIndex('primaryPosition', 'primaryPosition', { unique: false });
      players.createIndex('overallGrade', 'overallGrade', { unique: false });

      const overrides = db.createObjectStore('leaguePlayerOverrides', { keyPath: 'id' });
      overrides.createIndex('leagueId', 'leagueId', { unique: false });
      overrides.createIndex('playerId', 'playerId', { unique: false });

      db.createObjectStore('rulesPresets', { keyPath: 'id' });
      db.createObjectStore('teamRosters', { keyPath: 'teamId' });
    };

    request.onsuccess = async () => {
      const db = request.result;
      const tx = db.transaction(['globalPlayers', 'leaguePlayerOverrides', 'globalTeams'], 'readwrite');

      tx.objectStore('globalPlayers').put({
        id: 'legacy-player',
        firstName: 'Manny',
        lastName: 'Ramirez',
        gender: 'M',
        age: 32,
        bats: 'R',
        throws: 'R',
        primaryPosition: 'LF',
        power: 92,
        contact: 88,
        speed: 41,
        fielding: 52,
        arm: 61,
        velocity: 0,
        junk: 0,
        accuracy: 0,
        arsenal: [],
        overallGrade: 'A',
        personality: 'Competitive',
        chemistry: 'Competitive',
        morale: 80,
        mojo: 'Normal',
        fame: 12,
        salary: 18000000,
        leagueAssignments: [],
        createdDate: '2026-04-01T00:00:00.000Z',
        lastModified: '2026-04-01T00:00:00.000Z',
        isCustom: true,
      });

      tx.objectStore('globalTeams').put({
        id: 'legacy-team',
        name: 'Denver Zephyrs',
        abbreviation: 'DNV',
        location: 'Denver',
        nickname: 'Zephyrs',
        colors: { primary: '#123456', secondary: '#654321' },
        stadium: 'Summit Yard',
        leagueIds: ['league-1'],
        createdDate: '2026-04-01T00:00:00.000Z',
        lastModified: '2026-04-01T00:00:00.000Z',
      });

      tx.objectStore('leaguePlayerOverrides').put({
        id: 'league-1::legacy-player',
        leagueId: 'league-1',
        playerId: 'legacy-player',
        overrides: { power: 95 },
        lastModified: '2026-04-01T00:00:00.000Z',
      });

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    };

    request.onerror = () => reject(request.error);
  });
}

describe('leagueBuilderStorage editorial schema migration', () => {
  beforeEach(async () => {
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  afterEach(async () => {
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  test('migrates legacy players to FameTier 3 without data loss', async () => {
    await seedLegacyLeagueBuilderDatabase();

    const db = await initLeagueBuilderDatabase();
    expect(db.version).toBe(9);
    expect(db.objectStoreNames.contains('scoutProfiles')).toBe(true);
    expect(db.objectStoreNames.contains('startupDraftSessions')).toBe(true);
    expect(db.objectStoreNames.contains('registeredPools')).toBe(true);
    expect(db.objectStoreNames.contains('mlbDraftSessions')).toBe(true);
    expect(db.objectStoreNames.contains('auctionSessions')).toBe(true);

    const scoutTx = db.transaction(['scoutProfiles', 'startupDraftSessions', 'mlbDraftSessions', 'auctionSessions'], 'readonly');
    const scoutStore = scoutTx.objectStore('scoutProfiles');
    const sessionStore = scoutTx.objectStore('startupDraftSessions');
    const mlbSessionStore = scoutTx.objectStore('mlbDraftSessions');
    const auctionSessionStore = scoutTx.objectStore('auctionSessions');
    expect(Array.from(scoutStore.indexNames)).toEqual(expect.arrayContaining(['leagueId', 'teamId']));
    expect(Array.from(sessionStore.indexNames)).toEqual(expect.arrayContaining(['leagueId']));
    expect(Array.from(mlbSessionStore.indexNames)).toEqual(expect.arrayContaining(['leagueId']));
    expect(Array.from(auctionSessionStore.indexNames)).toEqual(expect.arrayContaining(['leagueId']));

    const player = await getPlayer('legacy-player');
    expect(player).not.toBeNull();
    expect(player?.baseFameTier).toBe(3);
    expect(player?.firstName).toBe('Manny');
    expect(player?.power).toBe(92);

    __resetLeagueBuilderDatabaseForTests();
    const upgradedDb = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const tx = upgradedDb.transaction('globalPlayers', 'readonly');
    const rawPlayer = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const request = tx.objectStore('globalPlayers').get('legacy-player');
      request.onsuccess = () => resolve(request.result as Record<string, unknown>);
      request.onerror = () => reject(request.error);
    });

    expect(rawPlayer.baseFameTier).toBe(3);
    upgradedDb.close();
  });

  test('persists editorial player, team, and override fields', async () => {
    const savedTeam = await saveTeam({
      name: 'Portland Pines',
      abbreviation: 'POR',
      location: 'Portland',
      nickname: 'Pines',
      colors: { primary: '#0f5132', secondary: '#f4e4bc' },
      stadium: 'Timber Grounds',
      leagueIds: ['league-9'],
      backstory: 'A club with rainy-night mystique.',
      era: 'CLASSIC_TV',
      cityVibe: 'Northwest grit',
      ballparkNickname: 'The Mill',
    });

    const savedPlayer = await savePlayer({
      firstName: 'June',
      lastName: 'Mercer',
      nickname: 'Jukebox',
      backstory: 'A former sandlot legend with a cannon arm.',
      nicknames: ['Jukebox', 'June Bug'],
      archetype: 'CLUBHOUSE_LEADER',
      signatureMoment: 'Walk-off triple in the fog.',
      baseFameTier: 4,
      gender: 'F',
      age: 27,
      bats: 'R',
      throws: 'R',
      primaryPosition: 'CF',
      power: 71,
      contact: 80,
      speed: 88,
      fielding: 86,
      arm: 79,
      velocity: 0,
      junk: 0,
      accuracy: 0,
      arsenal: [],
      overallGrade: 'A-',
      personality: 'Spirited',
      chemistry: 'Spirited',
      morale: 78,
      mojo: 'Hot',
      fame: 0,
      salary: 4200000,
      leagueAssignments: [],
      isCustom: true,
    });

    await setLeaguePlayerOverride(
      'league-9',
      savedPlayer.id,
      { contact: 82 },
      { fameTierOverride: 5 satisfies FameTier },
    );

    const loadedTeam = await getTeam(savedTeam.id);
    const loadedPlayer = await getPlayer(savedPlayer.id);
    const overrides = await getAllOverridesForLeague('league-9');

    expect(loadedTeam?.era).toBe('CLASSIC_TV');
    expect(loadedTeam?.cityVibe).toBe('Northwest grit');
    expect(loadedTeam?.ballparkNickname).toBe('The Mill');

    expect(loadedPlayer?.backstory).toContain('sandlot');
    expect(loadedPlayer?.nicknames).toEqual(['Jukebox', 'June Bug']);
    expect(loadedPlayer?.archetype).toBe('CLUBHOUSE_LEADER');
    expect(loadedPlayer?.signatureMoment).toContain('Walk-off triple');
    expect(loadedPlayer?.baseFameTier).toBe(4);

    expect(overrides).toHaveLength(1);
    expect(overrides[0]?.overrides.contact).toBe(82);
    expect(overrides[0]?.fameTierOverride).toBe(5);
  });

  test('persists Draft Room seats and per-team GM names through fresh reads', async () => {
    await saveLeagueTemplate({
      id: 'draft-room-league',
      name: 'Draft Room League',
      teamIds: ['draft-room-team'],
      conferences: [],
      divisions: [],
      defaultRulesPreset: 'rules',
      draftPoolMode: 'pool-first',
      draftSeats: [{ id: 'seat-captain', name: 'Captain Jane' }],
    });

    await saveTeam({
      id: 'draft-room-team',
      name: 'Draft Room Club',
      abbreviation: 'DRC',
      location: 'Page',
      nickname: 'Club',
      colors: { primary: '#0f5132', secondary: '#f4e4bc' },
      stadium: 'Draft Yard',
      controlledBy: 'human',
      gmSeatId: 'seat-captain',
      gmSeatName: 'Captain Jane',
      leagueIds: ['draft-room-league'],
    });

    __resetLeagueBuilderDatabaseForTests();

    const loadedLeague = await getLeagueTemplate('draft-room-league');
    const loadedTeam = await getTeam('draft-room-team');

    expect(loadedLeague?.draftPoolMode).toBe('pool-first');
    expect(loadedLeague?.draftSeats).toEqual([{ id: 'seat-captain', name: 'Captain Jane' }]);
    expect(loadedTeam?.gmSeatId).toBe('seat-captain');
    expect(loadedTeam?.gmSeatName).toBe('Captain Jane');
  });

  test('exports the five-tier editorial fame labels distinctly from legacy FameLevel', () => {
    expect(FAME_TIER_LABEL).toEqual({
      1: 'Unknown',
      2: 'Prospect',
      3: 'Veteran',
      4: 'Captain',
      5: 'Superstar',
    });
  });
});
