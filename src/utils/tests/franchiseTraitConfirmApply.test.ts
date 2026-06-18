import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: vi.fn(() => true),
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

import { applyConfirmedTraitOverlay } from '../franchiseTraitConfirmApply';
import {
  getFranchiseTraitOverlaysByPlayer,
  putFranchiseTraitOverlay,
  resetFranchiseTraitOverlaysForTests,
  type FranchiseTraitOverlayRow,
} from '../franchiseTraitOverlayStorage';
import {
  deleteFranchiseDatabase,
  getFranchisePlayer,
  saveFranchisePlayer,
  type Player,
} from '../franchisePlayerStorage';

const TRACKER_DB_NAME = 'kbl-tracker';
const franchiseId = 'franchise-trait-confirm';
const scope = {
  franchiseId,
  seasonId: `${franchiseId}-season-1`,
  statsScopeId: `${franchiseId}-season-1`,
};

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function makePlayer(overrides: Partial<Player> & { id: string }): Player {
  return {
    id: overrides.id,
    firstName: 'Trait',
    lastName: 'Tester',
    gender: 'M',
    age: 27,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    secondaryPosition: 'LF',
    power: 50,
    contact: 50,
    speed: 50,
    fielding: 50,
    arm: 50,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    arsenal: [],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 1000000,
    leagueAssignments: [],
    editHistory: [],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Player;
}

function overlay(
  overrides: Partial<FranchiseTraitOverlayRow> = {},
): FranchiseTraitOverlayRow {
  const playerId = overrides.playerId ?? 'player-1';
  const traitName = overrides.traitName ?? 'Clutch';
  const sourceEventId = overrides.sourceEventId ?? 'event-1';
  return {
    ...scope,
    id: `${scope.franchiseId}:${scope.seasonId}:${scope.statsScopeId}:${playerId}:${traitName}:${sourceEventId}`,
    playerId,
    valence: 'gain',
    traitName,
    displacesTraitName: null,
    realityPercentile: 0.88,
    probability: 0.79,
    confirmationStatus: 'pending',
    applied: false,
    source: 'trait_acquisition',
    sourceEventId,
    createdAtGameNumber: 16,
    createdAt: '2026-06-18T00:00:00.000Z',
    ...overrides,
  };
}

describe('applyConfirmedTraitOverlay', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetFranchiseTraitOverlaysForTests();
    await deleteFranchiseDatabase(franchiseId);
    await deleteDatabase(TRACKER_DB_NAME);
  });

  test('gain into a free slot writes flat player traits and confirms the overlay', async () => {
    const player = makePlayer({ id: 'player-free-slot', trait2: 'Choker' });
    const pending = overlay({
      playerId: player.id,
      traitName: 'Clutch',
      sourceEventId: 'event-free-slot',
    });
    await saveFranchisePlayer(franchiseId, player);
    await putFranchiseTraitOverlay(pending);

    const result = await applyConfirmedTraitOverlay(franchiseId, pending);

    expect(result.status).toBe('applied');
    if (result.status !== 'applied') throw new Error('expected applied result');
    expect(result.player.trait1).toBe('Clutch');
    expect(result.player.trait2).toBe('Choker');
    expect(result.overlay).toEqual({
      ...pending,
      confirmationStatus: 'confirmed',
      applied: true,
    });

    const storedPlayer = await getFranchisePlayer(franchiseId, player.id);
    expect(storedPlayer?.trait1).toBe('Clutch');
    expect(storedPlayer?.trait2).toBe('Choker');
    expect(await getFranchiseTraitOverlaysByPlayer(scope, player.id)).toEqual([
      result.overlay,
    ]);
  });

  test('gain with a displacement replaces exactly the named held slot', async () => {
    const player = makePlayer({
      id: 'player-displace',
      trait1: 'Choker',
      trait2: 'Cannon Arm',
    });
    const pending = overlay({
      playerId: player.id,
      traitName: 'Clutch',
      displacesTraitName: 'Choker',
      sourceEventId: 'event-displace',
    });
    await saveFranchisePlayer(franchiseId, player);
    await putFranchiseTraitOverlay(pending);

    const result = await applyConfirmedTraitOverlay(franchiseId, pending);

    expect(result.status).toBe('applied');
    const storedPlayer = await getFranchisePlayer(franchiseId, player.id);
    expect(storedPlayer?.trait1).toBe('Clutch');
    expect(storedPlayer?.trait2).toBe('Cannon Arm');
    expect(await getFranchiseTraitOverlaysByPlayer(scope, player.id)).toEqual([
      {
        ...pending,
        confirmationStatus: 'confirmed',
        applied: true,
      },
    ]);
  });

  test('already-applied overlays are idempotent and do not change the player again', async () => {
    const player = makePlayer({ id: 'player-idempotent', trait2: 'Choker' });
    const pending = overlay({
      playerId: player.id,
      traitName: 'Clutch',
      sourceEventId: 'event-idempotent',
    });
    await saveFranchisePlayer(franchiseId, player);
    await putFranchiseTraitOverlay(pending);

    const first = await applyConfirmedTraitOverlay(franchiseId, pending);
    expect(first.status).toBe('applied');
    const confirmed = (await getFranchiseTraitOverlaysByPlayer(scope, player.id))[0];
    const afterFirst = await getFranchisePlayer(franchiseId, player.id);

    const second = await applyConfirmedTraitOverlay(franchiseId, confirmed);

    expect(second).toEqual({ status: 'already-applied' });
    expect(await getFranchisePlayer(franchiseId, player.id)).toEqual(afterFirst);
  });

  test('returns no-player when the franchise player is absent', async () => {
    const pending = overlay({
      playerId: 'missing-player',
      traitName: 'Clutch',
      sourceEventId: 'event-missing',
    });
    await putFranchiseTraitOverlay(pending);

    await expect(applyConfirmedTraitOverlay(franchiseId, pending)).resolves.toEqual({
      status: 'no-player',
    });
  });

  test('returns not-applicable when the player already holds the gained trait', async () => {
    const player = makePlayer({
      id: 'player-already-held',
      trait1: 'Clutch',
      trait2: 'Cannon Arm',
    });
    const pending = overlay({
      playerId: player.id,
      traitName: 'Clutch',
      sourceEventId: 'event-already-held',
    });
    await saveFranchisePlayer(franchiseId, player);
    await putFranchiseTraitOverlay(pending);

    const result = await applyConfirmedTraitOverlay(franchiseId, pending);

    expect(result).toEqual({ status: 'not-applicable', reason: 'already-held' });
    expect(await getFranchisePlayer(franchiseId, player.id)).toMatchObject({
      trait1: 'Clutch',
      trait2: 'Cannon Arm',
    });
    expect(await getFranchiseTraitOverlaysByPlayer(scope, player.id)).toEqual([
      pending,
    ]);
  });
});
