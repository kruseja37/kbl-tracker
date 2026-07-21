import 'fake-indexeddb/auto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import type {
  HistoricalLegendAppPlayer,
  HistoricalLegendsAppPayload,
} from '../../data/historicalLegendsAppData';
import {
  HistoricalLegendsOwnershipCollisionError,
  importHistoricalLegendsPayload,
  isRecoverableHistoricalLegendsOwnershipCollision,
  parseHistoricalLegendsPayloadBytes,
  repairHistoricalLegendsPayload,
  validateHistoricalLegendsPayload,
} from '../historicalLegendsImport';
import {
  EXPECTED_HISTORICAL_LEGENDS_SOURCE_SHA256,
} from '../../data/historicalLegendsAppData';
import {
  __resetLeagueBuilderDatabaseForTests,
  clearAllLeagueBuilderData,
  createEmptyTeamRoster,
  getAllLeagueTemplates,
  getAllPlayers,
  getTeamRoster,
  savePlayer,
  saveTeamRoster,
  type Player,
} from '../leagueBuilderStorage';

const SOURCE_SHA = 'a'.repeat(64);

async function digest(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const result = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(result), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function card(
  profileType: HistoricalLegendAppPlayer['historicalProfileType'],
  suffix: 'career' | 'peak' | 'draft',
): HistoricalLegendAppPlayer {
  const playerId = 'aaroh101';
  const identity = `historical:${playerId}`;
  return {
    id: `hl:${playerId}:${suffix}`,
    firstName: 'Hank',
    lastName: 'Aaron',
    gender: 'M',
    age: profileType === 'Peak' ? 29 : 31,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'RF',
    power: 92,
    contact: 90,
    speed: 72,
    fielding: 76,
    arm: 82,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    arsenal: [],
    overallGrade: 'A+',
    trait1: 'Clutch',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 75,
    mojo: 'Normal',
    fame: 0,
    salary: 100_000,
    leagueAssignments: [],
    ratingRevealState: 'revealed',
    createdDate: '2026-07-14T00:00:00.000Z',
    lastModified: '2026-07-14T00:00:00.000Z',
    isCustom: false,
    sourceDatabase: 'HISTORICAL_LEGENDS',
    sourceId: identity,
    historicalSourceId: identity,
    versionGroupId: identity,
    historicalProfileType: profileType,
    historicalLegend: {
      playerId,
      displayName: 'Hank Aaron',
      profileType,
      sourceCardId: `source:${suffix}`,
      sourceWindowId: suffix,
      sourceVersionClass: suffix,
      imageAge: 31,
      lore: { backstory: 'Evidence-backed career story.' },
      rivalries: [{ rivalName: 'Willie Mays', confidence: 90 }],
      confidence: { overall: 94, fields: { power: { confidence: 95 } } },
      personalityEvidence: [],
      researchFlags: [],
      identityClaims: [{ id: '1', evidenceBacked: true }],
      provenance: { flags: [] },
    },
  };
}

function payload(players: HistoricalLegendAppPlayer[]): HistoricalLegendsAppPayload {
  const profileCounts = { Career: 0, Peak: 0, 'Draft Pool': 0 };
  for (const player of players) profileCounts[player.historicalProfileType] += 1;
  return {
    schemaVersion: 'historical-legends-app-v1',
    sourceEditionId: 'test-edition',
    sourceContentHash: 'test-content',
    sourceSha256: SOURCE_SHA,
    generatedAt: '2026-07-14T00:00:00.000Z',
    playerCount: new Set(players.map((player) => player.historicalLegend.playerId)).size,
    profileCount: players.length,
    profileCounts,
    players,
  };
}

function stockPlayer(): Player {
  return {
    ...card('Draft Pool', 'draft'),
    id: 'stock-player',
    sourceDatabase: 'SMB4',
    sourceId: undefined,
    historicalSourceId: undefined,
    versionGroupId: undefined,
    historicalProfileType: undefined,
    historicalLegend: undefined,
  };
}

describe('Historical Legends app import', () => {
  beforeEach(async () => clearAllLeagueBuilderData());
  afterEach(() => __resetLeagueBuilderDatabaseForTests());

  test('rejects an unpinned or mismatched source before writing', () => {
    const data = payload([card('Career', 'career')]);
    expect(() => validateHistoricalLegendsPayload(data, null)).toThrow(/not pinned/i);
    expect(() => validateHistoricalLegendsPayload(data, 'b'.repeat(64))).toThrow(/mismatch/i);
  });

  test('rejects pitcher secondary eligibility before writing any card', async () => {
    const pitcher: HistoricalLegendAppPlayer = {
      ...card('Draft Pool', 'draft'),
      primaryPosition: 'SP',
      secondaryPosition: 'RP',
      velocity: 80,
      junk: 70,
      accuracy: 60,
      arsenal: ['4F'],
      trait1: 'Two Way (OF)',
    };

    await expect(importHistoricalLegendsPayload(payload([pitcher]), SOURCE_SHA)).rejects.toThrow(
      /must not carry secondary position eligibility/i,
    );
    expect(await getAllPlayers()).toEqual([]);

    const invalidRole: HistoricalLegendAppPlayer = {
      ...pitcher,
      primaryPosition: 'P',
      secondaryPosition: undefined,
    };
    await expect(importHistoricalLegendsPayload(payload([invalidRole]), SOURCE_SHA)).rejects.toThrow(
      /invalid primary role P/i,
    );
    expect(await getAllPlayers()).toEqual([]);
  });

  test('rejects modified generated bytes even when embedded source provenance is unchanged', async () => {
    const data = payload([card('Career', 'career')]);
    const original = JSON.stringify(data);
    const pinnedAssetDigest = await digest(original);
    const verified = await parseHistoricalLegendsPayloadBytes(
      new TextEncoder().encode(original),
      pinnedAssetDigest,
    );
    expect(verified.sourceSha256).toBe(SOURCE_SHA);

    const modified = original.replace('"power":92', '"power":91');
    expect(JSON.parse(modified).sourceSha256).toBe(SOURCE_SHA);
    await expect(parseHistoricalLegendsPayloadBytes(
      new TextEncoder().encode(modified),
      pinnedAssetDigest,
    )).rejects.toThrow(/app-asset SHA-256 mismatch/i);
  });

  test('imports cards idempotently while preserving lore, rivalries, confidence, and non-Legends players', async () => {
    await savePlayer(stockPlayer());
    const data = payload([
      card('Career', 'career'),
      card('Peak', 'peak'),
      card('Draft Pool', 'draft'),
    ]);

    const first = await importHistoricalLegendsPayload(data, SOURCE_SHA);
    const second = await importHistoricalLegendsPayload(data, SOURCE_SHA);
    const players = await getAllPlayers();
    const legends = players.filter((player) => player.sourceDatabase === 'HISTORICAL_LEGENDS');

    expect(first).toMatchObject({ players: 3, playerGroups: 1, removedStaleCards: 0 });
    expect(second).toMatchObject({ players: 3, playerGroups: 1, removedStaleCards: 0 });
    expect(players).toHaveLength(4);
    expect(legends).toHaveLength(3);
    expect(new Set(legends.map((player) => player.id))).toEqual(new Set([
      'hl:aaroh101:career',
      'hl:aaroh101:peak',
      'hl:aaroh101:draft',
    ]));
    expect(legends[0].historicalLegend).toMatchObject({
      lore: { backstory: 'Evidence-backed career story.' },
      rivalries: [{ rivalName: 'Willie Mays', confidence: 90 }],
      confidence: { overall: 94 },
    });
    expect(players.some((player) => player.id === 'stock-player')).toBe(true);
  });

  test('removes only stale Historical Legends cards on refresh', async () => {
    const career = card('Career', 'career');
    const peak = card('Peak', 'peak');
    await importHistoricalLegendsPayload(payload([career, peak]), SOURCE_SHA);

    const refreshed = await importHistoricalLegendsPayload(payload([career]), SOURCE_SHA);
    const players = await getAllPlayers();
    expect(refreshed.removedStaleCards).toBe(1);
    expect(players.map((player) => player.id)).toEqual(['hl:aaroh101:career']);
  });

  test('preserves matching Legends league assignments on reimport', async () => {
    const career = card('Career', 'career');
    const assignment = { leagueId: 'legends-league', teamId: 'yankees', rosterStatus: 'MLB' as const };
    await savePlayer({ ...career, leagueAssignments: [assignment] });

    await importHistoricalLegendsPayload(payload([career]), SOURCE_SHA);

    expect((await getAllPlayers())[0].leagueAssignments).toEqual([assignment]);
  });

  test('removes stale stock-source assignments while preserving user-league assignments', async () => {
    const career = card('Career', 'career');
    await savePlayer({
      ...career,
      sourceDatabase: 'HISTORICAL_LEGENDS',
      leagueAssignments: [
        { leagueId: 'sml', teamId: 'sirloins', rosterStatus: 'MLB' },
        { leagueId: 'my-custom-league', teamId: 'legends', rosterStatus: 'MLB' },
      ],
    });

    await importHistoricalLegendsPayload(payload([career]), SOURCE_SHA);

    expect((await getAllPlayers())[0].leagueAssignments).toEqual([
      { leagueId: 'my-custom-league', teamId: 'legends', rosterStatus: 'MLB' },
    ]);
  });

  test('system-library assignment does not block removal of a stale Legends card', async () => {
    const stale = {
      ...card('Career', 'career'),
      id: 'hl:aaroh101:legacy-career',
      leagueAssignments: [{
        leagueId: 'legends-library-career',
        teamId: 'legends-library-career:team:boomers',
        rosterStatus: 'MLB' as const,
      }],
    };
    await savePlayer(stale);

    const refreshed = await importHistoricalLegendsPayload(payload([card('Peak', 'peak')]), SOURCE_SHA);
    expect(refreshed.removedStaleCards).toBe(1);
    expect((await getAllPlayers()).map((player) => player.id)).toEqual(['hl:aaroh101:peak']);
  });

  test('refuses every assigned stale Legends card before changing players or team rosters', async () => {
    const stale = {
      ...card('Career', 'career'),
      id: 'hl:aaroh101:legacy-career',
      leagueAssignments: [{ leagueId: 'legends-league', teamId: 'yankees', rosterStatus: 'MLB' as const }],
    };
    await savePlayer(stale);
    await saveTeamRoster({
      ...createEmptyTeamRoster('yankees'),
      mlbRoster: [stale.id],
    });
    const rosterBefore = await getTeamRoster('yankees');

    await expect(importHistoricalLegendsPayload(
      payload([card('Peak', 'peak')]),
      SOURCE_SHA,
    )).rejects.toThrow(/assigned stale.*cannot be removed by reimport/i);

    const players = await getAllPlayers();
    expect(players.map((player) => player.id)).toEqual(['hl:aaroh101:legacy-career']);
    expect(await getTeamRoster('yankees')).toEqual(rosterBefore);
  });

  test('preflights incoming card ids and never overwrites a non-Legends owner', async () => {
    const incoming = card('Career', 'career');
    const collision = { ...stockPlayer(), id: incoming.id };
    await savePlayer(collision);

    await expect(importHistoricalLegendsPayload(payload([incoming]), SOURCE_SHA)).rejects.toThrow(
      /already owned by non-Legends source SMB4/i,
    );

    const players = await getAllPlayers();
    expect(players).toHaveLength(1);
    expect(players[0]).toMatchObject({ id: incoming.id, sourceDatabase: 'SMB4' });
  });

  test('recognizes only the exact League Builder ownership collision as repairable UI state', () => {
    expect(isRecoverableHistoricalLegendsOwnershipCollision(
      new HistoricalLegendsOwnershipCollisionError(
        'Historical Legends card id hl:aaroh101:draft is already owned by non-Legends source League Builder.',
        true,
      ),
    )).toBe(true);
    expect(isRecoverableHistoricalLegendsOwnershipCollision(
      new HistoricalLegendsOwnershipCollisionError(
        'Historical Legends card id hl:aaroh101:draft is already owned by non-Legends source League Builder.',
        false,
      ),
    )).toBe(false);
    expect(isRecoverableHistoricalLegendsOwnershipCollision(
      new Error('Historical Legends card id hl:aaroh101:draft is already owned by non-Legends source League Builder.'),
    )).toBe(false);
    expect(isRecoverableHistoricalLegendsOwnershipCollision('network failed')).toBe(false);
  });

  test('recognizes the structured repair brand after HMR replaces the error class identity', () => {
    const hmrError = new HistoricalLegendsOwnershipCollisionError(
      'Historical Legends card id hl:aaroh101:draft is already owned by non-Legends source League Builder.',
      true,
    );
    Object.setPrototypeOf(hmrError, Error.prototype);

    expect(hmrError instanceof HistoricalLegendsOwnershipCollisionError).toBe(false);
    expect(isRecoverableHistoricalLegendsOwnershipCollision(hmrError)).toBe(true);
    expect(isRecoverableHistoricalLegendsOwnershipCollision({
      name: 'HistoricalLegendsOwnershipCollisionError',
      repairEligible: true,
    })).toBe(true);
    expect(isRecoverableHistoricalLegendsOwnershipCollision({
      name: 'HistoricalLegendsOwnershipCollisionError',
      repairEligible: 'true',
    })).toBe(false);
    expect(isRecoverableHistoricalLegendsOwnershipCollision({
      name: 'Error',
      repairEligible: true,
    })).toBe(false);
    expect(isRecoverableHistoricalLegendsOwnershipCollision({
      message: 'Historical Legends card id hl:aaroh101:draft is already owned by non-Legends source League Builder.',
    })).toBe(false);
  });

  test('ordinary import exposes repair eligibility only after full read-only collision preflight', async () => {
    const peak = card('Peak', 'peak');
    const draft = card('Draft Pool', 'draft');
    await savePlayer({ ...peak, sourceDatabase: 'League Builder' });
    await savePlayer({ ...draft, sourceDatabase: 'League Builder' });

    const eligibleFailure = await importHistoricalLegendsPayload(payload([peak, draft]), SOURCE_SHA)
      .then(() => null, (error: unknown) => error);
    expect(isRecoverableHistoricalLegendsOwnershipCollision(eligibleFailure)).toBe(true);

    await savePlayer({
      ...draft,
      sourceDatabase: 'League Builder',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
    });
    const blockedFailure = await importHistoricalLegendsPayload(payload([peak, draft]), SOURCE_SHA)
      .then(() => null, (error: unknown) => error);
    expect(isRecoverableHistoricalLegendsOwnershipCollision(blockedFailure)).toBe(false);
    expect((await getAllPlayers()).find((player) => player.id === peak.id)).toMatchObject({
      sourceDatabase: 'League Builder',
      leagueAssignments: [],
    });
  });

  test('repairs partial Draft/Peak legacy ownership into complete Career/Draft/Peak data', async () => {
    const career = card('Career', 'career');
    const peak = card('Peak', 'peak');
    const draft = card('Draft Pool', 'draft');
    await savePlayer(stockPlayer());
    await savePlayer({ ...peak, sourceDatabase: 'League Builder' });
    await savePlayer({ ...draft, sourceDatabase: 'League Builder' });

    const result = await repairHistoricalLegendsPayload(payload([career, peak, draft]), SOURCE_SHA);
    const players = await getAllPlayers();
    const legends = players.filter((player) => player.sourceDatabase === 'HISTORICAL_LEGENDS');

    expect(result).toMatchObject({ players: 3, playerGroups: 1 });
    expect(legends.map((player) => player.id).sort()).toEqual([
      'hl:aaroh101:career',
      'hl:aaroh101:draft',
      'hl:aaroh101:peak',
    ]);
    expect(players.find((player) => player.id === 'stock-player')).toMatchObject({ sourceDatabase: 'SMB4' });
  });

  test('repairs verified legacy Legends assigned only to a stock source league', async () => {
    const career = card('Career', 'career');
    await savePlayer({
      ...career,
      sourceDatabase: 'League Builder',
      leagueAssignments: [{ leagueId: 'sml', teamId: 'sirloins', rosterStatus: 'MLB' }],
    });

    const failure = await importHistoricalLegendsPayload(payload([career]), SOURCE_SHA)
      .then(() => null, (error: unknown) => error);
    expect(isRecoverableHistoricalLegendsOwnershipCollision(failure)).toBe(true);

    await repairHistoricalLegendsPayload(payload([career]), SOURCE_SHA);
    expect((await getAllPlayers())[0]).toMatchObject({
      sourceDatabase: 'HISTORICAL_LEGENDS',
      leagueAssignments: [],
    });
  });

  test.each([
    ['assigned League Builder', { sourceDatabase: 'League Builder', assigned: true }],
    ['SMB4', { sourceDatabase: 'SMB4', assigned: false }],
    ['MLB', { sourceDatabase: 'MLB', assigned: false }],
    ['custom source', { sourceDatabase: 'CUSTOM_DB', assigned: false }],
  ])('blocks %s ownership with zero mutation', async (_label, scenario) => {
    const incoming = card('Draft Pool', 'draft');
    await savePlayer({
      ...incoming,
      sourceDatabase: scenario.sourceDatabase,
      leagueAssignments: scenario.assigned
        ? [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' as const }]
        : [],
    });
    const before = await getAllPlayers();

    await expect(repairHistoricalLegendsPayload(payload([incoming]), SOURCE_SHA)).rejects.toThrow(/repair blocked/i);
    expect(await getAllPlayers()).toEqual(before);
  });

  test('a mixed safe and blocked set performs zero mutation', async () => {
    const peak = card('Peak', 'peak');
    const draft = card('Draft Pool', 'draft');
    await savePlayer({ ...peak, sourceDatabase: 'League Builder' });
    await savePlayer({ ...draft, sourceDatabase: 'League Builder', leagueAssignments: [
      { leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FREE_AGENT' as const },
    ] });
    const before = await getAllPlayers();

    await expect(repairHistoricalLegendsPayload(payload([peak, draft]), SOURCE_SHA)).rejects.toThrow(/assigned/i);
    expect(await getAllPlayers()).toEqual(before);
  });

  test('an hl card absent from the verified payload blocks all repair writes', async () => {
    const incoming = card('Draft Pool', 'draft');
    await savePlayer({ ...incoming, sourceDatabase: 'League Builder' });
    await savePlayer({ ...incoming, id: 'hl:not-in-payload:draft', sourceDatabase: 'League Builder' });
    const before = await getAllPlayers();

    await expect(repairHistoricalLegendsPayload(payload([incoming]), SOURCE_SHA)).rejects.toThrow(/non-payload card/i);
    expect(await getAllPlayers()).toEqual(before);
  });

  test('repair is idempotent', async () => {
    const cards = [card('Career', 'career'), card('Peak', 'peak'), card('Draft Pool', 'draft')];
    await savePlayer({ ...cards[2], sourceDatabase: 'League Builder' });

    const first = await repairHistoricalLegendsPayload(payload(cards), SOURCE_SHA);
    const afterFirst = await getAllPlayers();
    const second = await repairHistoricalLegendsPayload(payload(cards), SOURCE_SHA);
    const afterSecond = await getAllPlayers();

    expect(first).toMatchObject({ players: 3, playerGroups: 1 });
    expect(second).toMatchObject({ players: 3, playerGroups: 1 });
    expect(afterSecond).toEqual(afterFirst);
  });

  test('full pinned payload repair provisions all three Legends source libraries', async () => {
    const bytes = await readFile(resolve(process.cwd(), 'public/data/historical-legends-app-data.json'));
    const fullPayload = JSON.parse(bytes.toString()) as HistoricalLegendsAppPayload;
    const legacyDraft = fullPayload.players.find((player) => player.historicalProfileType === 'Draft Pool');
    if (!legacyDraft) throw new Error('Pinned fixture has no Draft Pool card.');
    await savePlayer({ ...legacyDraft, sourceDatabase: 'League Builder' });

    const result = await repairHistoricalLegendsPayload(
      fullPayload,
      EXPECTED_HISTORICAL_LEGENDS_SOURCE_SHA256,
    );
    const libraryIds = (await getAllLeagueTemplates())
      .filter((league) => league.sourceLibrary?.kind === 'historical-legends')
      .map((league) => league.id)
      .sort();

    expect(result).toMatchObject({ players: 835, playerGroups: 345 });
    expect(libraryIds).toEqual([
      'legends-library-career',
      'legends-library-draft',
      'legends-library-peak',
    ]);
  }, 30_000);
});
