import { describe, expect, test } from 'vitest';

import type { SnakeOpenTradeOffer } from '../leagueBuilderStorage';
import {
  buildSnakeLiveTradeActionPayload,
  buildSnakeLiveTradePostPayload,
  projectSnakeLiveTradeOffers,
} from '../snakeLiveTradeIntents';
import type { SnakeLiveIntent, SnakeLiveJsonObject } from '../snakeLiveRoomTypes';

const REVISION = 12;

function offer(overrides: Partial<SnakeOpenTradeOffer> = {}): SnakeOpenTradeOffer {
  return {
    id: 'offer-1',
    phase: 'MLB',
    buyerTeamId: 'buyer',
    sellerTeamId: 'seller',
    targetPick: 19,
    offerPickNumbers: [24, 36],
    receivePickNumbers: [19, 41],
    offerValue: 98,
    receiveValue: 95,
    sellerPremium: 3,
    postedSessionRevision: 7,
    buyerNod: false,
    sellerNod: false,
    postedAt: '2026-07-19T12:00:00.000Z',
    ...overrides,
  };
}

function intent(overrides: Partial<SnakeLiveIntent> = {}): SnakeLiveIntent {
  return {
    id: 'intent-1',
    roomId: 'room-1',
    idempotencyKey: 'op-1',
    deviceId: 'device-1',
    teamId: 'buyer',
    kind: 'trade',
    status: 'pending',
    intentRevision: 1,
    expectedRoomRevision: REVISION,
    payload: buildSnakeLiveTradePostPayload(offer()),
    createdAt: '2026-07-19T12:00:00.000Z',
    resolvedAt: null,
    ...overrides,
  };
}

describe('projectSnakeLiveTradeOffers', () => {
  test('projects a sanitized POST and auto-nods only the authenticated actor', () => {
    const payload = {
      ...buildSnakeLiveTradePostPayload(offer({ buyerNod: true, sellerNod: true })),
      seatBoards: { buyer: { slots: { SP1: 'private-player' } } },
    } as SnakeLiveJsonObject;
    const result = projectSnakeLiveTradeOffers([intent({ payload })], REVISION);

    expect(result.invalidIntentIds).toEqual([]);
    expect(result.openOffers).toEqual([expect.objectContaining({
      id: 'offer-1',
      buyerNod: true,
      sellerNod: false,
    })]);
    expect(result.executableOffers).toEqual([]);
    expect(JSON.stringify(result)).not.toContain('seatBoards');
    expect(JSON.stringify(result)).not.toContain('private-player');
  });

  test('expires the negotiation when the public draft revision advances', () => {
    const stalePost = intent({ expectedRoomRevision: REVISION });
    expect(projectSnakeLiveTradeOffers([stalePost], REVISION).openOffers).toHaveLength(1);
    expect(projectSnakeLiveTradeOffers([stalePost], REVISION + 1).openOffers).toEqual([]);
  });

  test('includes pending and accepted current intents but excludes rejected and cancelled intents', () => {
    const post = intent();
    const acceptedNod = intent({
      id: 'intent-2',
      idempotencyKey: 'op-2',
      teamId: 'seller',
      status: 'accepted',
      intentRevision: 2,
      payload: buildSnakeLiveTradeActionPayload('NOD', offer()),
      createdAt: '2026-07-19T12:01:00.000Z',
      resolvedAt: '2026-07-19T12:01:01.000Z',
    });
    const rejectedClose = intent({
      id: 'intent-3',
      idempotencyKey: 'op-3',
      teamId: 'seller',
      status: 'rejected',
      payload: buildSnakeLiveTradeActionPayload('DECLINE', offer()),
      createdAt: '2026-07-19T12:02:00.000Z',
      resolvedAt: '2026-07-19T12:02:01.000Z',
    });
    const cancelledClose = intent({
      id: 'intent-4',
      idempotencyKey: 'op-4',
      status: 'cancelled',
      payload: buildSnakeLiveTradeActionPayload('WITHDRAW', offer()),
      createdAt: '2026-07-19T12:03:00.000Z',
      resolvedAt: '2026-07-19T12:03:01.000Z',
    });

    const result = projectSnakeLiveTradeOffers(
      [cancelledClose, rejectedClose, acceptedNod, post],
      REVISION,
    );
    expect(result.openOffers[0]).toMatchObject({ buyerNod: true, sellerNod: true });
    expect(result.executableOffers.map((row) => row.id)).toEqual(['offer-1']);
  });

  test.each([
    ['WITHDRAW', 'buyer'],
    ['DECLINE', 'seller'],
  ] as const)('%s removes an open offer', (action, teamId) => {
    const close = intent({
      id: 'intent-2',
      idempotencyKey: 'op-2',
      teamId,
      payload: buildSnakeLiveTradeActionPayload(action, offer()),
      createdAt: '2026-07-19T12:01:00.000Z',
    });
    expect(projectSnakeLiveTradeOffers([close, intent()], REVISION).openOffers).toEqual([]);
  });

  test('rejects malformed envelopes, outsider actors, and empty POST offers without throwing', () => {
    const sameClub = intent({
      id: 'bad-pair',
      idempotencyKey: 'bad-pair-key',
      payload: {
        action: 'POST', offerId: 'x', buyerTeamId: 'buyer', sellerTeamId: 'buyer', offer: {},
      },
    });
    const outsider = intent({
      id: 'bad-actor',
      idempotencyKey: 'bad-actor-key',
      teamId: 'outsider',
    });
    const emptyOffer = intent({
      id: 'bad-offer',
      idempotencyKey: 'bad-offer-key',
      payload: {
        action: 'POST', offerId: 'offer-1', buyerTeamId: 'buyer', sellerTeamId: 'seller', offer: {},
      },
    });

    const result = projectSnakeLiveTradeOffers([sameClub, outsider, emptyOffer], REVISION);
    expect(result.openOffers).toEqual([]);
    expect(result.invalidIntentIds).toEqual(['bad-actor', 'bad-offer', 'bad-pair']);
  });

  test('uses receipt order, replaces the same club pair, and applies one idempotency key once', () => {
    const firstPost = intent({
      id: 'post-old',
      idempotencyKey: 'post-old-key',
      payload: buildSnakeLiveTradePostPayload(offer({ id: 'offer-old' })),
      createdAt: '2026-07-19T12:00:00.000Z',
    });
    const duplicateKey = intent({
      id: 'post-duplicate',
      idempotencyKey: 'post-old-key',
      payload: buildSnakeLiveTradePostPayload(offer({ id: 'offer-ignored' })),
      createdAt: '2026-07-19T12:00:30.000Z',
    });
    const replacement = intent({
      id: 'post-new',
      idempotencyKey: 'post-new-key',
      payload: buildSnakeLiveTradePostPayload(offer({ id: 'offer-new', targetPick: 21 })),
      createdAt: '2026-07-19T12:01:00.000Z',
    });
    const sellerNod = intent({
      id: 'seller-nod',
      idempotencyKey: 'seller-nod-key',
      teamId: 'seller',
      payload: buildSnakeLiveTradeActionPayload('NOD', offer({ id: 'offer-new' })),
      createdAt: '2026-07-19T12:02:00.000Z',
    });

    const forward = projectSnakeLiveTradeOffers(
      [firstPost, duplicateKey, replacement, sellerNod],
      REVISION,
    );
    const reversed = projectSnakeLiveTradeOffers(
      [sellerNod, replacement, duplicateKey, firstPost],
      REVISION,
    );
    expect(forward).toEqual(reversed);
    expect(forward.openOffers).toEqual([expect.objectContaining({
      id: 'offer-new',
      targetPick: 21,
      buyerNod: true,
      sellerNod: true,
    })]);
  });

  test('treats a repeated close after the first close as a harmless no-op', () => {
    const firstClose = intent({
      id: 'close-1',
      idempotencyKey: 'close-key-1',
      payload: buildSnakeLiveTradeActionPayload('WITHDRAW', offer()),
      createdAt: '2026-07-19T12:01:00.000Z',
    });
    const repeatedClose = intent({
      id: 'close-2',
      idempotencyKey: 'close-key-2',
      payload: buildSnakeLiveTradeActionPayload('WITHDRAW', offer()),
      createdAt: '2026-07-19T12:02:00.000Z',
    });
    const result = projectSnakeLiveTradeOffers([repeatedClose, intent(), firstClose], REVISION);
    expect(result.openOffers).toEqual([]);
    expect(result.invalidIntentIds).toEqual([]);
  });
});
