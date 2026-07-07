import { describe, expect, test } from 'vitest';

import {
  applyTraitDisplacement,
  buildTraitConfirmationRequest,
  confirmTraitOverlay,
  summarizeTraitOverlayChangeLog,
} from '../traitOverlayConfirmation';
import type { FranchiseTraitOverlayRow } from '../../utils/franchiseTraitOverlayStorage';

function overlay(
  overrides: Partial<FranchiseTraitOverlayRow> = {},
): FranchiseTraitOverlayRow {
  return {
    id: 'trait-overlay-1',
    franchiseId: 'franchise-1',
    seasonId: 'season-1',
    statsScopeId: 'scope-1',
    playerId: 'player-1',
    valence: 'gain',
    traitName: 'Clutch',
    displacesTraitName: null,
    realityPercentile: 0.85,
    probability: 0.76,
    confirmationStatus: 'pending',
    applied: false,
    source: 'test',
    sourceEventId: 'event-1',
    createdAtGameNumber: 12,
    createdAt: '2026-06-18T00:00:00.000Z',
    ...overrides,
  };
}

describe('traitOverlayConfirmation L9b-3c pure engine', () => {
  test('gain fills the first free slot', () => {
    expect(
      applyTraitDisplacement(
        { trait1: null, trait2: 'Choker' },
        overlay({ traitName: 'Clutch' }),
      ),
    ).toEqual({
      trait1: 'Clutch',
      trait2: 'Choker',
      applied: true,
    });
  });

  test('gain replaces the named held displacement trait', () => {
    expect(
      applyTraitDisplacement(
        { trait1: 'Choker', trait2: 'Cannon Arm' },
        overlay({ traitName: 'Clutch', displacesTraitName: 'Choker' }),
      ),
    ).toEqual({
      trait1: 'Clutch',
      trait2: 'Cannon Arm',
      applied: true,
    });
  });

  test('gain is idempotent when the trait is already held', () => {
    expect(
      applyTraitDisplacement(
        { trait1: 'Clutch', trait2: 'Cannon Arm' },
        overlay({ traitName: 'Clutch' }),
      ),
    ).toEqual({
      trait1: 'Clutch',
      trait2: 'Cannon Arm',
      applied: false,
      reason: 'already-held',
    });
  });

  test('gain at the two-trait cap without a valid displacement is not applied', () => {
    expect(
      applyTraitDisplacement(
        { trait1: 'Choker', trait2: 'Cannon Arm' },
        overlay({ traitName: 'Clutch' }),
      ),
    ).toEqual({
      trait1: 'Choker',
      trait2: 'Cannon Arm',
      applied: false,
      reason: 'cap-no-displacement',
    });
  });

  test('lose removes a held trait from its slot', () => {
    expect(
      applyTraitDisplacement(
        { trait1: 'Choker', trait2: 'Clutch' },
        overlay({ valence: 'lose', traitName: 'Clutch' }),
      ),
    ).toEqual({
      trait1: 'Choker',
      trait2: null,
      applied: true,
    });
  });

  test('lose is a no-op when the trait is not held', () => {
    expect(
      applyTraitDisplacement(
        { trait1: 'Choker', trait2: 'Cannon Arm' },
        overlay({ valence: 'lose', traitName: 'Clutch' }),
      ),
    ).toEqual({
      trait1: 'Choker',
      trait2: 'Cannon Arm',
      applied: false,
      reason: 'not-held',
    });
  });

  test('non-canonical trait names throw instead of being coerced', () => {
    expect(() =>
      applyTraitDisplacement(
        { trait1: null, trait2: null },
        overlay({ traitName: 'Cltuch' }),
      ),
    ).toThrow('Non-canonical traitName: Cltuch');

    expect(() =>
      applyTraitDisplacement(
        { trait1: 'Choker', trait2: 'Cannon Arm' },
        overlay({ traitName: 'Clutch', displacesTraitName: 'Weakest Trait' }),
      ),
    ).toThrow('Non-canonical displacesTraitName: Weakest Trait');
  });

  test('confirmTraitOverlay flips status and applied without mutating input', () => {
    const pending = overlay({ confirmationStatus: 'pending', applied: false });
    const before = { ...pending };
    const confirmed = confirmTraitOverlay(pending);

    expect(confirmed).toEqual({
      ...pending,
      confirmationStatus: 'confirmed',
      applied: true,
    });
    expect(confirmed).not.toBe(pending);
    expect(pending).toEqual(before);
  });

  test('buildTraitConfirmationRequest builds gain, displaced gain, and lose instructions with resulting slots', () => {
    expect(
      buildTraitConfirmationRequest(
        overlay({ id: 'gain-1', traitName: 'Clutch' }),
        { trait1: null, trait2: 'Choker' },
      ),
    ).toEqual({
      overlayId: 'gain-1',
      playerId: 'player-1',
      valence: 'gain',
      traitName: 'Clutch',
      displacesTraitName: null,
      resultingTrait1: 'Clutch',
      resultingTrait2: 'Choker',
      consoleInstruction: 'On your SMB4 console, give player-1 the Clutch trait',
    });

    expect(
      buildTraitConfirmationRequest(
        overlay({
          id: 'gain-displace-1',
          traitName: 'Clutch',
          displacesTraitName: 'Choker',
        }),
        { trait1: 'Choker', trait2: 'Cannon Arm' },
      ),
    ).toEqual({
      overlayId: 'gain-displace-1',
      playerId: 'player-1',
      valence: 'gain',
      traitName: 'Clutch',
      displacesTraitName: 'Choker',
      resultingTrait1: 'Clutch',
      resultingTrait2: 'Cannon Arm',
      consoleInstruction:
        'On your SMB4 console, give player-1 the Clutch trait (replacing Choker)',
    });

    expect(
      buildTraitConfirmationRequest(
        overlay({ id: 'lose-1', valence: 'lose', traitName: 'Clutch' }),
        { trait1: 'Choker', trait2: 'Clutch' },
      ),
    ).toEqual({
      overlayId: 'lose-1',
      playerId: 'player-1',
      valence: 'lose',
      traitName: 'Clutch',
      displacesTraitName: null,
      resultingTrait1: 'Choker',
      resultingTrait2: null,
      consoleInstruction:
        'On your SMB4 console, remove the Clutch trait from player-1.',
    });
  });

  test('summarizeTraitOverlayChangeLog sorts deterministically and does not mutate input', () => {
    const rows = [
      overlay({
        id: 'z-cannon',
        playerId: 'player-b',
        traitName: 'Cannon Arm',
        sourceEventId: 'event-2',
        confirmationStatus: 'confirmed',
        applied: true,
      }),
      overlay({
        id: 'b-clutch',
        playerId: 'player-a',
        traitName: 'Clutch',
        sourceEventId: 'event-2',
      }),
      overlay({
        id: 'a-clutch',
        playerId: 'player-a',
        valence: 'lose',
        traitName: 'Clutch',
        sourceEventId: 'event-1',
      }),
      overlay({
        id: 'a-choker',
        playerId: 'player-a',
        traitName: 'Choker',
        displacesTraitName: 'Cannon Arm',
        sourceEventId: 'event-1',
      }),
    ];
    const before = rows.map((row) => ({ ...row }));

    const firstSummary = summarizeTraitOverlayChangeLog(rows);
    const secondSummary = summarizeTraitOverlayChangeLog(rows);

    expect(firstSummary).toEqual([
      {
        overlayId: 'a-choker',
        playerId: 'player-a',
        valence: 'gain',
        traitName: 'Choker',
        displacesTraitName: 'Cannon Arm',
        confirmationStatus: 'pending',
        applied: false,
        summary: 'player-a gain Choker replacing Cannon Arm [pending/unapplied]',
      },
      {
        overlayId: 'a-clutch',
        playerId: 'player-a',
        valence: 'lose',
        traitName: 'Clutch',
        displacesTraitName: null,
        confirmationStatus: 'pending',
        applied: false,
        summary: 'player-a lose Clutch [pending/unapplied]',
      },
      {
        overlayId: 'b-clutch',
        playerId: 'player-a',
        valence: 'gain',
        traitName: 'Clutch',
        displacesTraitName: null,
        confirmationStatus: 'pending',
        applied: false,
        summary: 'player-a gain Clutch [pending/unapplied]',
      },
      {
        overlayId: 'z-cannon',
        playerId: 'player-b',
        valence: 'gain',
        traitName: 'Cannon Arm',
        displacesTraitName: null,
        confirmationStatus: 'confirmed',
        applied: true,
        summary: 'player-b gain Cannon Arm [confirmed/applied]',
      },
    ]);
    expect(secondSummary).toEqual(firstSummary);
    expect(rows).toEqual(before);
  });
});
