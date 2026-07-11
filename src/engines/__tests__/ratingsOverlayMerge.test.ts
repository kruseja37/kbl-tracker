import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import {
  mergeRatingsOverlays,
  resolveActiveOverlayDeltas,
  selectExpiredTemporaryOverlays,
} from '../ratingsOverlayMerge';
import type { FranchiseRatingsOverlayRow } from '../../utils/franchiseRatingsOverlayStorage';

function overlay(
  overrides: Partial<FranchiseRatingsOverlayRow> = {},
): FranchiseRatingsOverlayRow {
  return {
    id: 'overlay-1',
    franchiseId: 'franchise-1',
    seasonId: 'season-1',
    statsScopeId: 'scope-1',
    playerId: 'player-1',
    ratingKey: 'power',
    delta: 1,
    kind: 'permanent',
    expiresAtGameNumber: null,
    confirmationStatus: 'confirmed',
    source: 'test',
    sourceEventId: 'event-1',
    createdAtGameNumber: 1,
    createdAt: '2026-06-18T00:00:00.000Z',
    ...overrides,
  };
}

describe('ratingsOverlayMerge L2b pure engine', () => {
  test('no overlays returns a copied base unchanged', () => {
    const baseRatings = { power: 50, contact: 60 };
    const merged = mergeRatingsOverlays(baseRatings, [], 5);

    expect(merged).toEqual({ power: 50, contact: 60 });
    expect(merged).not.toBe(baseRatings);
  });

  test('applies a confirmed permanent delta', () => {
    expect(
      mergeRatingsOverlays(
        { power: 50, contact: 60 },
        [overlay({ delta: 5 })],
        5,
      ),
    ).toEqual({ power: 55, contact: 60 });
  });

  test('applies confirmed temporary overlays before expiry but not at or after expiry', () => {
    const temporaryOverlay = overlay({
      id: 'temporary-contact',
      ratingKey: 'contact',
      delta: 4,
      kind: 'temporary',
      expiresAtGameNumber: 10,
    });
    const baseRatings = { power: 50, contact: 60 };

    expect(mergeRatingsOverlays(baseRatings, [temporaryOverlay], 9)).toEqual({
      power: 50,
      contact: 64,
    });
    expect(mergeRatingsOverlays(baseRatings, [temporaryOverlay], 10)).toEqual({
      power: 50,
      contact: 60,
    });
    expect(mergeRatingsOverlays(baseRatings, [temporaryOverlay], 11)).toEqual({
      power: 50,
      contact: 60,
    });
  });

  test('excludes pending overlays from the merge', () => {
    expect(
      mergeRatingsOverlays(
        { power: 50, contact: 60 },
        [overlay({ delta: 5, confirmationStatus: 'pending' })],
        5,
      ),
    ).toEqual({ power: 50, contact: 60 });
  });

  test('excludes applied legacy-confirmed rows because the player record is already truth', () => {
    expect(
      mergeRatingsOverlays(
        { power: 55, contact: 60 },
        [overlay({ delta: 5, applied: true })],
        5,
      ),
    ).toEqual({ power: 55, contact: 60 });
  });

  test('sums multiple confirmed active overlays on the same rating key', () => {
    const overlays = [
      overlay({ id: 'power-plus', sourceEventId: 'event-plus', delta: 3 }),
      overlay({ id: 'power-minus', sourceEventId: 'event-minus', delta: -1 }),
    ];

    expect(mergeRatingsOverlays({ power: 50, contact: 60 }, overlays, 5)).toEqual({
      power: 52,
      contact: 60,
    });
  });

  test('ignores overlays for unknown rating keys when merging', () => {
    const merged = mergeRatingsOverlays(
      { power: 50, contact: 60 },
      [overlay({ ratingKey: 'madeUpKey', delta: 99 })],
      5,
    );

    expect(merged).toEqual({ power: 50, contact: 60 });
    expect(merged).not.toHaveProperty('madeUpKey');
  });

  test('never mutates the base ratings object', () => {
    const baseRatings = { power: 50, contact: 60 };
    const before = { ...baseRatings };

    mergeRatingsOverlays(baseRatings, [overlay({ delta: 5 })], 5);

    expect(baseRatings).toEqual(before);
  });

  test('resolves active overlay deltas from confirmed and active overlays only', () => {
    const overlays = [
      overlay({ id: 'power-plus', sourceEventId: 'event-1', ratingKey: 'power', delta: 3 }),
      overlay({ id: 'power-minus', sourceEventId: 'event-2', ratingKey: 'power', delta: -1 }),
      overlay({
        id: 'contact-active',
        sourceEventId: 'event-3',
        ratingKey: 'contact',
        delta: 4,
        kind: 'temporary',
        expiresAtGameNumber: 10,
      }),
      overlay({
        id: 'contact-expired',
        sourceEventId: 'event-4',
        ratingKey: 'contact',
        delta: 7,
        kind: 'temporary',
        expiresAtGameNumber: 9,
      }),
      overlay({
        id: 'power-pending',
        sourceEventId: 'event-5',
        ratingKey: 'power',
        delta: 99,
        confirmationStatus: 'pending',
      }),
    ];

    expect(resolveActiveOverlayDeltas(overlays, 9)).toEqual({
      power: 2,
      contact: 4,
    });
  });

  test('selects expired temporary overlay ids regardless of confirmation status', () => {
    const overlays = [
      overlay({ id: 'permanent', sourceEventId: 'event-1', kind: 'permanent', expiresAtGameNumber: null }),
      overlay({
        id: 'temporary-before-expiry',
        sourceEventId: 'event-2',
        kind: 'temporary',
        expiresAtGameNumber: 11,
      }),
      overlay({
        id: 'temporary-at-expiry',
        sourceEventId: 'event-3',
        kind: 'temporary',
        expiresAtGameNumber: 10,
      }),
      overlay({
        id: 'temporary-after-expiry',
        sourceEventId: 'event-4',
        kind: 'temporary',
        expiresAtGameNumber: 9,
      }),
      overlay({
        id: 'pending-expired',
        sourceEventId: 'event-5',
        kind: 'temporary',
        expiresAtGameNumber: 10,
        confirmationStatus: 'pending',
      }),
      overlay({
        id: 'temporary-null-expiry',
        sourceEventId: 'event-6',
        kind: 'temporary',
        expiresAtGameNumber: null,
      }),
    ];

    expect(selectExpiredTemporaryOverlays(overlays, 10)).toEqual([
      'temporary-at-expiry',
      'temporary-after-expiry',
      'pending-expired',
    ]);
  });

  test('engine is deterministic and does not mutate overlay inputs', () => {
    const overlays = [
      overlay({ id: 'power-plus', sourceEventId: 'event-1', delta: 3 }),
      overlay({
        id: 'contact-active',
        sourceEventId: 'event-2',
        ratingKey: 'contact',
        delta: 4,
        kind: 'temporary',
        expiresAtGameNumber: null,
      }),
    ];
    const before = overlays.map((row) => ({ ...row }));

    const firstMerge = mergeRatingsOverlays({ power: 50, contact: 60 }, overlays, 5);
    const secondMerge = mergeRatingsOverlays({ power: 50, contact: 60 }, overlays, 5);
    const firstDeltas = resolveActiveOverlayDeltas(overlays, 5);
    const secondDeltas = resolveActiveOverlayDeltas(overlays, 5);
    const firstExpired = selectExpiredTemporaryOverlays(overlays, 5);
    const secondExpired = selectExpiredTemporaryOverlays(overlays, 5);

    expect(secondMerge).toEqual(firstMerge);
    expect(secondDeltas).toEqual(firstDeltas);
    expect(secondExpired).toEqual(firstExpired);
    expect(overlays).toEqual(before);
  });

  test('engine source does not use nondeterministic primitives', () => {
    const source = readFileSync('src/engines/ratingsOverlayMerge.ts', 'utf8');

    expect(source).not.toMatch(/Math\.random/);
    expect(source).not.toMatch(/Date\.now/);
    expect(source).not.toMatch(/new\s+Date/);
  });
});
