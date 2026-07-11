import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: vi.fn(() => true),
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

import {
  FranchiseConsoleMirrorValidationError,
  franchiseConsoleMirrorSeam,
  getDevelopmentHistory,
  listUnresolvedDevelopment,
  resolveRatingsProposal,
  resolveTraitProposal,
} from '../franchiseConsoleMirror';
import {
  applyConfirmedTraitOverlay,
  TraitOverlayPersistenceError,
} from '../franchiseTraitConfirmApply';
import {
  deleteFranchiseDatabase,
  getFranchisePlayer,
  saveFranchisePlayer,
  type Player,
} from '../franchisePlayerStorage';
import {
  getFranchiseRatingsOverlayById,
  putFranchiseRatingsOverlay,
  resetFranchiseRatingsOverlaysForTests,
  type FranchiseRatingsOverlayRow,
} from '../franchiseRatingsOverlayStorage';
import {
  getFranchiseTraitOverlayById,
  putFranchiseTraitOverlay,
  type FranchiseTraitOverlayRow,
} from '../franchiseTraitOverlayStorage';

const TRACKER_DB_NAME = 'kbl-tracker';
const franchiseId = 'franchise-console-mirror';
const seasonId = `${franchiseId}-season-1`;
const scope = { franchiseId, seasonId, statsScopeId: seasonId };
const originalSeam = { ...franchiseConsoleMirrorSeam };

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
    firstName: 'Mirror',
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

function ratingsOverlay(
  overrides: Partial<FranchiseRatingsOverlayRow> = {},
): FranchiseRatingsOverlayRow {
  const playerId = overrides.playerId ?? 'player-ratings';
  const boundaryGameNumber = overrides.createdAtGameNumber ?? 24;
  const sourceEventId = overrides.sourceEventId ?? `checkpoint-${boundaryGameNumber}`;
  return {
    ...scope,
    id: `${franchiseId}:${seasonId}:${seasonId}:${playerId}:power:${sourceEventId}`,
    playerId,
    ratingKey: 'power',
    delta: 5,
    kind: 'permanent',
    expiresAtGameNumber: null,
    confirmationStatus: 'pending',
    applied: false,
    source: 'ratings-development',
    sourceEventId,
    createdAtGameNumber: boundaryGameNumber,
    createdAt: `2026-07-11T00:${String(boundaryGameNumber).padStart(2, '0')}:00.000Z`,
    ...overrides,
  };
}

function traitOverlay(
  overrides: Partial<FranchiseTraitOverlayRow> = {},
): FranchiseTraitOverlayRow {
  const playerId = overrides.playerId ?? 'player-traits';
  const boundaryGameNumber = overrides.createdAtGameNumber ?? 24;
  const sourceEventId = overrides.sourceEventId ?? `trait-grant-${boundaryGameNumber}`;
  return {
    ...scope,
    id: `${franchiseId}:${seasonId}:${seasonId}:${playerId}:Clutch:${sourceEventId}`,
    playerId,
    valence: 'gain',
    traitName: 'Clutch',
    displacesTraitName: null,
    realityPercentile: 0.9,
    probability: 0.8,
    confirmationStatus: 'pending',
    applied: false,
    source: 'trait-grant',
    sourceEventId,
    createdAtGameNumber: boundaryGameNumber,
    createdAt: `2026-07-11T01:${String(boundaryGameNumber).padStart(2, '0')}:00.000Z`,
    ...overrides,
  };
}

describe('franchise console mirror service', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    Object.assign(franchiseConsoleMirrorSeam, originalSeam);
    franchiseConsoleMirrorSeam.getSeasonMetadata = vi.fn(async () => ({
      seasonId,
      seasonNumber: 1,
      seasonName: 'Season 1',
      status: 'active',
      startDate: 0,
      gamesPlayed: 0,
      totalGames: 60,
      gamesPerTeam: 4,
      checkpointCadence: 'standard',
    }));
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-07-11T18:00:00.000Z'));
    resetFranchiseRatingsOverlaysForTests();
    await deleteFranchiseDatabase(franchiseId);
    await deleteDatabase(TRACKER_DB_NAME);
  });

  test('CAS conflict marks the proposal conflict and never stacks a stale rating delta', async () => {
    const player = makePlayer({ id: 'player-conflict', power: 55 });
    const pending = ratingsOverlay({ playerId: player.id });
    await saveFranchisePlayer(franchiseId, player);
    await putFranchiseRatingsOverlay(pending);

    const result = await resolveRatingsProposal(pending.id, {
      action: 'confirm',
      observedPriorValue: 50,
      actor: 'ipad',
    });

    expect(result).toMatchObject({
      outcome: 'conflict',
      expectedPriorValue: 50,
      currentValue: 55,
      overlay: {
        confirmationStatus: 'conflict',
        applied: false,
        expectedPriorValue: 50,
        proposedValue: 55,
        actualEnteredValue: 55,
        boundaryGameNumber: 24,
        ordinal: 2,
      },
    });
    expect((await getFranchisePlayer(franchiseId, player.id))?.power).toBe(55);
  });

  test('reject requires a reason, records rejection, and leaves the player untouched', async () => {
    const player = makePlayer({ id: 'player-reject', power: 50 });
    const pending = ratingsOverlay({ playerId: player.id });
    await saveFranchisePlayer(franchiseId, player);
    await putFranchiseRatingsOverlay(pending);

    await expect(resolveRatingsProposal(pending.id, {
      action: 'reject',
      observedPriorValue: 50,
    })).rejects.toMatchObject<Partial<FranchiseConsoleMirrorValidationError>>({
      code: 'missing-reject-reason',
    });

    const result = await resolveRatingsProposal(pending.id, {
      action: 'reject',
      observedPriorValue: 50,
      rejectReason: 'The console value did not look right.',
    });

    expect(result.overlay).toMatchObject({
      confirmationStatus: 'rejected',
      applied: false,
      rejectReason: 'The console value did not look right.',
      proposedValue: 55,
      boundaryGameNumber: 24,
      ordinal: 2,
    });
    expect((await getFranchisePlayer(franchiseId, player.id))?.power).toBe(50);
  });

  test('confirm-adjusted writes the actual console value instead of the proposal', async () => {
    const player = makePlayer({ id: 'player-adjusted', power: 50 });
    const pending = ratingsOverlay({ playerId: player.id });
    await saveFranchisePlayer(franchiseId, player);
    await putFranchiseRatingsOverlay(pending);

    const result = await resolveRatingsProposal(pending.id, {
      action: 'confirm-adjusted',
      observedPriorValue: 50,
      actualValue: 54,
      actor: 'console-entry',
    });

    expect((await getFranchisePlayer(franchiseId, player.id))?.power).toBe(54);
    expect(result.overlay).toMatchObject({
      confirmationStatus: 'confirmed-applied',
      applied: true,
      expectedPriorValue: 50,
      proposedValue: 55,
      actualEnteredValue: 54,
      resolvedBy: 'console-entry',
      resolvedAt: Date.parse('2026-07-11T18:00:00.000Z'),
      resolvedCivilDate: '2026-07-11',
      boundaryGameNumber: 24,
      ordinal: 2,
    });
  });

  test('a stamped expected prior value takes precedence over caller-observed legacy input', async () => {
    const player = makePlayer({ id: 'player-stamped-prior', power: 50 });
    const pending = ratingsOverlay({
      playerId: player.id,
      expectedPriorValue: 50,
      proposedValue: 55,
    });
    await saveFranchisePlayer(franchiseId, player);
    await putFranchiseRatingsOverlay(pending);

    const result = await resolveRatingsProposal(pending.id, {
      action: 'confirm',
      observedPriorValue: 40,
    });

    expect(result.outcome).toBe('resolved');
    expect(result.overlay.expectedPriorValue).toBe(50);
    expect((await getFranchisePlayer(franchiseId, player.id))?.power).toBe(55);
  });

  test('ratings recovery completes an intent after the player write lands but terminal overlay write fails', async () => {
    const player = makePlayer({ id: 'player-rating-recovery', power: 50 });
    const pending = ratingsOverlay({ playerId: player.id });
    await saveFranchisePlayer(franchiseId, player);
    await putFranchiseRatingsOverlay(pending);

    let interrupted = false;
    franchiseConsoleMirrorSeam.putFranchiseRatingsOverlay = vi.fn(async (row) => {
      if (row.confirmationStatus === 'confirmed-applied' && !interrupted) {
        interrupted = true;
        throw new Error('terminal overlay write interrupted');
      }
      await originalSeam.putFranchiseRatingsOverlay(row);
    });

    await expect(resolveRatingsProposal(pending.id, {
      action: 'confirm',
      observedPriorValue: 50,
    })).rejects.toThrow('terminal overlay write interrupted');
    expect((await getFranchisePlayer(franchiseId, player.id))?.power).toBe(55);
    expect(await getFranchiseRatingsOverlayById(pending.id)).toMatchObject({
      confirmationStatus: 'pending',
      actualEnteredValue: 55,
      expectedPriorValue: 50,
    });

    const recovered = await resolveRatingsProposal(pending.id, {
      action: 'confirm',
      observedPriorValue: 50,
    });
    expect(recovered.outcome).toBe('recovered');
    expect(recovered.overlay).toMatchObject({
      confirmationStatus: 'confirmed-applied',
      applied: true,
      actualEnteredValue: 55,
    });
  });

  test('a compare-and-set race is recorded as conflict without overwriting the concurrent player value', async () => {
    const player = makePlayer({ id: 'player-cas-race', power: 50 });
    const pending = ratingsOverlay({ playerId: player.id });
    await saveFranchisePlayer(franchiseId, player);
    await putFranchiseRatingsOverlay(pending);

    franchiseConsoleMirrorSeam.compareAndSetFranchisePlayer = vi.fn(async () => {
      const current = await getFranchisePlayer(franchiseId, player.id);
      if (!current) return { status: 'not-found' as const };
      const raced = await saveFranchisePlayer(franchiseId, { ...current, power: 61 });
      return { status: 'conflict' as const, player: raced };
    });

    const result = await resolveRatingsProposal(pending.id, {
      action: 'confirm',
      observedPriorValue: 50,
    });

    expect(result).toMatchObject({
      outcome: 'conflict',
      currentValue: 61,
      overlay: { confirmationStatus: 'conflict', applied: false },
    });
    expect((await getFranchisePlayer(franchiseId, player.id))?.power).toBe(61);
  });

  test('a proven player-write failure is durable and stores only a bounded error', async () => {
    const player = makePlayer({ id: 'player-write-failure', power: 50 });
    const pending = ratingsOverlay({ playerId: player.id });
    await saveFranchisePlayer(franchiseId, player);
    await putFranchiseRatingsOverlay(pending);
    franchiseConsoleMirrorSeam.compareAndSetFranchisePlayer = vi.fn(async () => {
      throw new Error('write failed '.repeat(40));
    });

    const result = await resolveRatingsProposal(pending.id, {
      action: 'confirm',
      observedPriorValue: 50,
    });

    expect(result.outcome).toBe('apply-failed');
    expect(result.overlay).toMatchObject({
      confirmationStatus: 'apply-failed',
      applied: false,
      expectedPriorValue: 50,
      proposedValue: 55,
      actualEnteredValue: 55,
    });
    expect(result.overlay.applyError).toHaveLength(240);
    expect((await getFranchisePlayer(franchiseId, player.id))?.power).toBe(50);
  });

  test('re-resolving a terminal row is an idempotent no-op', async () => {
    const player = makePlayer({ id: 'player-idempotent', power: 50 });
    const pending = ratingsOverlay({ playerId: player.id });
    await saveFranchisePlayer(franchiseId, player);
    await putFranchiseRatingsOverlay(pending);
    const first = await resolveRatingsProposal(pending.id, {
      action: 'confirm',
      observedPriorValue: 50,
    });
    const playerAfterFirst = await getFranchisePlayer(franchiseId, player.id);

    const second = await resolveRatingsProposal(pending.id, { action: 'reject' });

    expect(second).toEqual({ outcome: 'noop', overlay: first.overlay });
    expect(await getFranchisePlayer(franchiseId, player.id)).toEqual(playerAfterFirst);
  });

  test('trait crash recovery completes a pending overlay after the player write already landed', async () => {
    const player = makePlayer({ id: 'player-trait-recovery', trait2: 'Choker' });
    const pending = traitOverlay({ playerId: player.id });
    await saveFranchisePlayer(franchiseId, player);
    await putFranchiseTraitOverlay(pending);

    franchiseConsoleMirrorSeam.applyConfirmedTraitOverlay = vi.fn(async (_franchise, _overlay, options) => {
      const current = await getFranchisePlayer(franchiseId, player.id);
      if (!current || !options?.targetTraitSlots) throw new Error('bad test setup');
      await saveFranchisePlayer(franchiseId, {
        ...current,
        trait1: options.targetTraitSlots.trait1 ?? undefined,
        trait2: options.targetTraitSlots.trait2 ?? undefined,
      });
      throw new TraitOverlayPersistenceError(new Error('overlay write interrupted'));
    });

    await expect(resolveTraitProposal(pending.id, {
      action: 'confirm',
      observedPriorValue: { trait1: null, trait2: 'Choker' },
    })).rejects.toBeInstanceOf(TraitOverlayPersistenceError);
    expect(await getFranchiseTraitOverlayById(pending.id)).toMatchObject({
      confirmationStatus: 'pending',
      applied: false,
      expectedPriorValue: { trait1: null, trait2: 'Choker' },
      proposedValue: { trait1: 'Clutch', trait2: 'Choker' },
      actualEnteredValue: { trait1: 'Clutch', trait2: 'Choker' },
      boundaryGameNumber: 24,
      ordinal: 2,
    });
    expect(await getFranchisePlayer(franchiseId, player.id)).toMatchObject({
      trait1: 'Clutch',
      trait2: 'Choker',
    });

    franchiseConsoleMirrorSeam.applyConfirmedTraitOverlay = applyConfirmedTraitOverlay;
    const recovered = await resolveTraitProposal(pending.id, {
      action: 'confirm',
      observedPriorValue: { trait1: null, trait2: 'Choker' },
    });

    expect(recovered.outcome).toBe('recovered');
    expect(recovered.overlay).toMatchObject({
      confirmationStatus: 'confirmed-applied',
      applied: true,
      expectedPriorValue: { trait1: null, trait2: 'Choker' },
      proposedValue: { trait1: 'Clutch', trait2: 'Choker' },
      actualEnteredValue: { trait1: 'Clutch', trait2: 'Choker' },
      boundaryGameNumber: 24,
      ordinal: 2,
    });
  });

  test('trait confirm-adjusted persists the full post-console trait slot state', async () => {
    const player = makePlayer({ id: 'player-trait-adjusted' });
    const pending = traitOverlay({ playerId: player.id });
    await saveFranchisePlayer(franchiseId, player);
    await putFranchiseTraitOverlay(pending);

    const result = await resolveTraitProposal(pending.id, {
      action: 'confirm-adjusted',
      observedPriorValue: { trait1: null, trait2: null },
      actualValue: { trait1: 'Clutch', trait2: 'Power Hitter' },
    });

    expect(await getFranchisePlayer(franchiseId, player.id)).toMatchObject({
      trait1: 'Clutch',
      trait2: 'Power Hitter',
    });
    expect(result.overlay).toMatchObject({
      confirmationStatus: 'confirmed-applied',
      applied: true,
      proposedValue: { trait1: 'Clutch', trait2: null },
      actualEnteredValue: { trait1: 'Clutch', trait2: 'Power Hitter' },
    });
  });

  test('a malformed trait proposal can still be rejected as the bug guard', async () => {
    const player = makePlayer({ id: 'player-trait-reject-invalid' });
    const pending = traitOverlay({
      playerId: player.id,
      valence: 'lose',
      traitName: 'Clutch',
    });
    await saveFranchisePlayer(franchiseId, player);
    await putFranchiseTraitOverlay(pending);

    const result = await resolveTraitProposal(pending.id, {
      action: 'reject',
      observedPriorValue: { trait1: null, trait2: null },
      rejectReason: 'The proposal does not match the console roster.',
    });

    expect(result.overlay).toMatchObject({
      confirmationStatus: 'rejected',
      applied: false,
      rejectReason: 'The proposal does not match the console roster.',
    });
    expect(result.overlay.proposedValue).toBeUndefined();
    const unchanged = await getFranchisePlayer(franchiseId, player.id);
    expect(unchanged?.trait1).toBeUndefined();
    expect(unchanged?.trait2).toBeUndefined();
  });

  test('oldest unresolved checkpoint is first and ordinals come from the season boundary plan', async () => {
    await putFranchiseRatingsOverlay(ratingsOverlay({
      id: 'rating-late',
      createdAtGameNumber: 48,
      sourceEventId: 'checkpoint-48',
    }));
    await putFranchiseTraitOverlay(traitOverlay({
      id: 'trait-early',
      createdAtGameNumber: 24,
      sourceEventId: 'trait-grant-24',
    }));

    const groups = await listUnresolvedDevelopment(franchiseId, seasonId);

    expect(groups.map(({ boundaryGameNumber, ordinal, ordinalCount }) => ({
      boundaryGameNumber,
      ordinal,
      ordinalCount,
    }))).toEqual([
      { boundaryGameNumber: 24, ordinal: 2, ordinalCount: 5 },
      { boundaryGameNumber: 48, ordinal: 4, ordinalCount: 5 },
    ]);
    expect(groups[0].proposals.map((proposal) => proposal.overlay.id)).toEqual(['trait-early']);
    expect(groups[1].proposals.map((proposal) => proposal.overlay.id)).toEqual(['rating-late']);
  });

  test('stale-plan proposals are quarantined after valid checkpoint groups', async () => {
    await putFranchiseRatingsOverlay(ratingsOverlay({
      id: 'rating-stale-plan',
      createdAtGameNumber: 18,
      sourceEventId: 'checkpoint-18',
    }));
    await putFranchiseTraitOverlay(traitOverlay({
      id: 'trait-valid-plan',
      createdAtGameNumber: 24,
      sourceEventId: 'trait-grant-24',
    }));

    const groups = await listUnresolvedDevelopment(franchiseId, seasonId);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      boundaryGameNumber: 24,
      ordinal: 2,
      ordinalCount: 5,
    });
    expect(groups[0].stalePlan).toBeUndefined();
    expect(groups[0].proposals.map((proposal) => proposal.overlay.id)).toEqual(['trait-valid-plan']);
    expect(groups[1]).toMatchObject({
      boundaryGameNumber: 18,
      ordinal: 0,
      ordinalCount: 5,
      stalePlan: true,
    });
    expect(groups[1].proposals.map((proposal) => proposal.overlay.id)).toEqual(['rating-stale-plan']);
  });

  test('unparseable source event ids are quarantined without throwing', async () => {
    await putFranchiseRatingsOverlay(ratingsOverlay({
      id: 'rating-unparseable',
      sourceEventId: 'legacy-development-event',
    }));

    const groups = await listUnresolvedDevelopment(franchiseId, seasonId);

    expect(groups).toEqual([
      expect.objectContaining({
        boundaryGameNumber: 0,
        ordinal: 0,
        ordinalCount: 5,
        stalePlan: true,
        proposals: [expect.objectContaining({
          kind: 'rating',
          overlay: expect.objectContaining({ id: 'rating-unparseable' }),
        })],
      }),
    ]);
  });

  test('stale-plan proposals can still be confirmed and rejected', async () => {
    const ratingsPlayer = makePlayer({ id: 'player-stale-confirm', power: 50 });
    const staleRating = ratingsOverlay({
      id: 'rating-stale-confirm',
      playerId: ratingsPlayer.id,
      createdAtGameNumber: 18,
      sourceEventId: 'checkpoint-18',
      boundaryGameNumber: 18,
      ordinal: 2,
    });
    const traitPlayer = makePlayer({ id: 'player-stale-reject' });
    const staleTrait = traitOverlay({
      id: 'trait-stale-reject',
      playerId: traitPlayer.id,
      createdAtGameNumber: 18,
      sourceEventId: 'trait-grant-18',
      boundaryGameNumber: 18,
      ordinal: 2,
    });
    await saveFranchisePlayer(franchiseId, ratingsPlayer);
    await saveFranchisePlayer(franchiseId, traitPlayer);
    await putFranchiseRatingsOverlay(staleRating);
    await putFranchiseTraitOverlay(staleTrait);
    const traitPlayerBefore = await getFranchisePlayer(franchiseId, traitPlayer.id);

    const confirmed = await resolveRatingsProposal(staleRating.id, {
      action: 'confirm',
      observedPriorValue: 50,
    });
    const rejected = await resolveTraitProposal(staleTrait.id, {
      action: 'reject',
      observedPriorValue: { trait1: null, trait2: null },
      rejectReason: 'Not present on the console roster.',
    });

    expect(confirmed).toMatchObject({
      outcome: 'resolved',
      overlay: {
        confirmationStatus: 'confirmed-applied',
        applied: true,
        boundaryGameNumber: undefined,
        ordinal: undefined,
      },
    });
    expect((await getFranchisePlayer(franchiseId, ratingsPlayer.id))?.power).toBe(55);
    expect(await getFranchiseRatingsOverlayById(staleRating.id)).toMatchObject({
      confirmationStatus: 'confirmed-applied',
      boundaryGameNumber: undefined,
      ordinal: undefined,
    });
    expect(rejected).toMatchObject({
      outcome: 'resolved',
      overlay: {
        confirmationStatus: 'rejected',
        applied: false,
        boundaryGameNumber: undefined,
        ordinal: undefined,
      },
    });
    expect(await getFranchisePlayer(franchiseId, traitPlayer.id)).toEqual(traitPlayerBefore);
    expect(await getFranchiseTraitOverlayById(staleTrait.id)).toMatchObject({
      confirmationStatus: 'rejected',
      boundaryGameNumber: undefined,
      ordinal: undefined,
    });
  });

  test('snapshot-less proposals fail closed when observedPriorValue is missing', async () => {
    const player = makePlayer({ id: 'player-missing-observed' });
    const pending = ratingsOverlay({ playerId: player.id });
    await saveFranchisePlayer(franchiseId, player);
    await putFranchiseRatingsOverlay(pending);

    await expect(resolveRatingsProposal(pending.id, { action: 'confirm' }))
      .rejects.toMatchObject<Partial<FranchiseConsoleMirrorValidationError>>({
        code: 'missing-observed-prior-value',
      });
    expect(await getFranchiseRatingsOverlayById(pending.id)).toEqual(pending);
  });

  test('development history combines both kinds in resolution chronology', async () => {
    await putFranchiseTraitOverlay(traitOverlay({
      id: 'trait-history',
      confirmationStatus: 'rejected',
      resolvedAt: 20,
      rejectReason: 'history',
    }));
    await putFranchiseRatingsOverlay(ratingsOverlay({
      id: 'rating-history',
      playerId: 'player-traits',
      confirmationStatus: 'confirmed-applied',
      applied: true,
      resolvedAt: 10,
    }));

    expect((await getDevelopmentHistory(franchiseId, 'player-traits')).map((entry) => ({
      kind: entry.kind,
      id: entry.overlay.id,
    }))).toEqual([
      { kind: 'rating', id: 'rating-history' },
      { kind: 'trait', id: 'trait-history' },
    ]);
  });
});
