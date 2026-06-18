import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import {
  buildExpiryRevertReminder,
  buildOverlayConfirmationRequest,
  confirmOverlay,
  summarizeOverlayChangeLog,
} from '../ratingsOverlayConfirmation';
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
    delta: 5,
    kind: 'permanent',
    expiresAtGameNumber: null,
    confirmationStatus: 'pending',
    source: 'test',
    sourceEventId: 'event-1',
    createdAtGameNumber: 1,
    createdAt: '2026-06-18T00:00:00.000Z',
    ...overrides,
  };
}

describe('ratingsOverlayConfirmation L2c pure engine', () => {
  test('builds a confirmation request with a resulting rating when base is supplied', () => {
    const request = buildOverlayConfirmationRequest(overlay(), 50);

    expect(request).toEqual({
      overlayId: 'overlay-1',
      playerId: 'player-1',
      ratingKey: 'power',
      delta: 5,
      kind: 'permanent',
      expiresAtGameNumber: null,
      resultingRating: 55,
      consoleInstruction: 'Set player-1 power to 55 on your SMB4 console (+5).',
    });
    expect(request.consoleInstruction).toContain('to 55');
    expect(request.consoleInstruction).toContain('+5');
  });

  test('builds a confirmation request without a resulting rating when no base is supplied', () => {
    const request = buildOverlayConfirmationRequest(overlay());

    expect(request.resultingRating).toBeNull();
    expect(request.consoleInstruction).toBe(
      'Apply +5 to player-1 power on your SMB4 console.',
    );
    expect(request.consoleInstruction).toContain('+5');
    expect(request.consoleInstruction).not.toContain('to 55');
  });

  test('adds a temporary revert and expiry note to console instructions', () => {
    const request = buildOverlayConfirmationRequest(
      overlay({ kind: 'temporary', expiresAtGameNumber: 24 }),
      50,
    );

    expect(request.kind).toBe('temporary');
    expect(request.expiresAtGameNumber).toBe(24);
    expect(request.consoleInstruction).toContain(
      'Temporary — revert on your console when it expires (game 24).',
    );
  });

  test('formats negative deltas with a minus sign', () => {
    const request = buildOverlayConfirmationRequest(overlay({ delta: -3 }), 50);

    expect(request.resultingRating).toBe(47);
    expect(request.consoleInstruction).toContain('-3');
  });

  test('confirms overlays idempotently without mutating the input', () => {
    const pending = overlay({ confirmationStatus: 'pending' });
    const pendingBefore = { ...pending };
    const confirmed = confirmOverlay(pending);

    expect(confirmed).toEqual({
      ...pending,
      confirmationStatus: 'confirmed',
    });
    expect(confirmed).not.toBe(pending);
    expect(pending).toEqual(pendingBefore);

    const alreadyConfirmed = overlay({ confirmationStatus: 'confirmed' });
    const alreadyConfirmedBefore = { ...alreadyConfirmed };
    const confirmedAgain = confirmOverlay(alreadyConfirmed);

    expect(confirmedAgain).toEqual(alreadyConfirmed);
    expect(confirmedAgain).not.toBe(alreadyConfirmed);
    expect(alreadyConfirmed).toEqual(alreadyConfirmedBefore);
  });

  test('builds an expiry revert reminder with signed delta and set-back value', () => {
    const reminder = buildExpiryRevertReminder(
      overlay({ kind: 'temporary', expiresAtGameNumber: 24 }),
      50,
    );

    expect(reminder).toBe(
      'Revert player-1 power on your SMB4 console — the temporary change (+5) has expired; set it back to 50.',
    );
    expect(reminder).toContain('Revert player-1 power');
    expect(reminder).toContain('+5');
    expect(reminder).toContain('set it back to 50');
  });

  test('summarizes overlay change logs in deterministic storage order', () => {
    const overlays = [
      overlay({
        id: 'z-contact',
        playerId: 'player-b',
        ratingKey: 'contact',
        delta: -2,
        kind: 'temporary',
        confirmationStatus: 'confirmed',
        sourceEventId: 'event-2',
      }),
      overlay({
        id: 'b-power',
        playerId: 'player-a',
        ratingKey: 'power',
        delta: 3,
        sourceEventId: 'event-2',
      }),
      overlay({
        id: 'a-power',
        playerId: 'player-a',
        ratingKey: 'power',
        delta: 1,
        sourceEventId: 'event-1',
      }),
    ];
    const before = overlays.map((row) => ({ ...row }));

    const firstSummary = summarizeOverlayChangeLog(overlays);
    const secondSummary = summarizeOverlayChangeLog(overlays);

    expect(firstSummary).toEqual([
      {
        overlayId: 'a-power',
        playerId: 'player-a',
        ratingKey: 'power',
        delta: 1,
        kind: 'permanent',
        confirmationStatus: 'pending',
        summary: 'player-a power +1 [permanent/pending]',
      },
      {
        overlayId: 'b-power',
        playerId: 'player-a',
        ratingKey: 'power',
        delta: 3,
        kind: 'permanent',
        confirmationStatus: 'pending',
        summary: 'player-a power +3 [permanent/pending]',
      },
      {
        overlayId: 'z-contact',
        playerId: 'player-b',
        ratingKey: 'contact',
        delta: -2,
        kind: 'temporary',
        confirmationStatus: 'confirmed',
        summary: 'player-b contact -2 [temporary/confirmed]',
      },
    ]);
    expect(secondSummary).toEqual(firstSummary);
    expect(overlays).toEqual(before);
  });

  test('summarizes an empty overlay change log', () => {
    expect(summarizeOverlayChangeLog([])).toEqual([]);
  });

  test('engine is deterministic and does not mutate overlay inputs', () => {
    const overlays = [
      overlay({ id: 'power-plus', sourceEventId: 'event-1', delta: 3 }),
      overlay({
        id: 'contact-active',
        sourceEventId: 'event-2',
        ratingKey: 'contact',
        delta: -1,
        kind: 'temporary',
        expiresAtGameNumber: null,
      }),
    ];
    const before = overlays.map((row) => ({ ...row }));

    const firstRequests = overlays.map((row) => buildOverlayConfirmationRequest(row, 50));
    const secondRequests = overlays.map((row) => buildOverlayConfirmationRequest(row, 50));
    const firstConfirmed = overlays.map((row) => confirmOverlay(row));
    const secondConfirmed = overlays.map((row) => confirmOverlay(row));
    const firstReminders = overlays.map((row) => buildExpiryRevertReminder(row, 50));
    const secondReminders = overlays.map((row) => buildExpiryRevertReminder(row, 50));
    const firstSummary = summarizeOverlayChangeLog(overlays);
    const secondSummary = summarizeOverlayChangeLog(overlays);

    expect(secondRequests).toEqual(firstRequests);
    expect(secondConfirmed).toEqual(firstConfirmed);
    expect(secondReminders).toEqual(firstReminders);
    expect(secondSummary).toEqual(firstSummary);
    expect(overlays).toEqual(before);
  });

  test('engine source does not use nondeterministic primitives or forbidden imports', () => {
    const source = readFileSync('src/engines/ratingsOverlayConfirmation.ts', 'utf8');
    const importLines = source.split('\n').filter((line) => line.startsWith('import '));

    expect(importLines).toEqual([
      "import type { FranchiseRatingsOverlayRow } from '../utils/franchiseRatingsOverlayStorage';",
    ]);
    expect(source).not.toMatch(/Math\.random/);
    expect(source).not.toMatch(/Date\.now/);
    expect(source).not.toMatch(/new\s+Date/);
    expect(source).not.toMatch(/from ['"].*ratingsOverlayMerge/);
    expect(source).not.toMatch(/from ['"].*(value|designation|morale|reporter|React)/i);
  });
});
