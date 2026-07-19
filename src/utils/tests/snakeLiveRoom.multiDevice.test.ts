import { describe, expect, test } from 'vitest';
import {
  createSnakeLiveRoomTransport,
  type SnakeLiveRoomTransport,
} from '../snakeLiveRoomTransport';
import type {
  SnakeLiveDeviceAccess,
  SnakeLiveHostAccess,
  SnakeLiveRoom,
  SnakeLiveTeamAccess,
} from '../snakeLiveRoomTypes';
import { snakeLiveRoomRunKey } from '../snakeLiveRoomSession';
import { SnakeLiveRoomTestServer } from './support/snakeLiveRoomTestServer';

interface DeviceFixture {
  id: string;
  token: string;
  transport: SnakeLiveRoomTransport;
}

function device(server: SnakeLiveRoomTestServer, id: string): DeviceFixture {
  return {
    id,
    token: `token-${id}`.padEnd(48, 'x'),
    transport: createSnakeLiveRoomTransport(server.createClient(id)),
  };
}

async function roomFixture(server: SnakeLiveRoomTestServer, teamCount = 8): Promise<{
  host: DeviceFixture;
  hostAccess: SnakeLiveHostAccess;
  room: SnakeLiveRoom;
}> {
  const host = device(server, 'hotseat-mac');
  const teamIds = Array.from({ length: teamCount }, (_, index) => `team-${index + 1}`);
  const room = await host.transport.createRoom({
    sessionId: `${teamCount}-team-snake`,
    roomCode: '2468',
    phase: 'MLB',
    hostDeviceId: host.id,
    hostToken: host.token,
    publicState: {
      teamIds,
      currentPickIndex: 0,
      completedPlayerIds: [],
    },
  });
  return {
    host,
    room,
    hostAccess: {
      roomId: room.id,
      hostDeviceId: host.id,
      hostToken: host.token,
    },
  };
}

async function approve(
  roomId: string,
  host: DeviceFixture,
  hostAccess: SnakeLiveHostAccess,
  companion: DeviceFixture,
  teamId: string,
): Promise<SnakeLiveTeamAccess> {
  const access: SnakeLiveDeviceAccess = {
    roomId,
    deviceId: companion.id,
    deviceToken: companion.token,
  };
  const claim = await companion.transport.submitClaim({
    ...access,
    requestKey: `request-${companion.id}-${teamId}`,
    gmName: `GM ${companion.id}`,
    teamId,
  });
  await host.transport.resolveClaim({
    ...hostAccess,
    claimId: claim.id,
    expectedClaimRevision: claim.revision,
    idempotencyKey: `resolve-${claim.id}-approved`,
    status: 'approved',
  });
  return { ...access, teamId };
}

describe('Snake live-room multi-device contract', () => {
  test('matches migration replay and capability-token rules', async () => {
    const server = new SnakeLiveRoomTestServer();
    const host = device(server, 'hotseat-mac');
    const createInput = {
      sessionId: 'exact-create-replay',
      roomCode: '2468',
      phase: 'MLB' as const,
      hostDeviceId: host.id,
      hostToken: host.token,
      publicState: { currentPickIndex: 0 },
    };
    const created = await host.transport.createRoom(createInput);
    await expect(host.transport.createRoom(createInput)).resolves.toEqual(created);
    expect(await host.transport.listEvents(created.id)).toHaveLength(1);
    await expect(host.transport.createRoom({
      ...createInput,
      roomCode: '1357',
    })).rejects.toMatchObject({ code: 'conflict' });

    await expect(host.transport.createRoom({
      ...createInput,
      sessionId: 'short-token-room',
      hostToken: 'too-short',
    })).rejects.toThrow('at least 32 characters');
  });

  test('matches migration claim replay data, room-wide intent keys, and team reassignment', async () => {
    const server = new SnakeLiveRoomTestServer();
    const { host, hostAccess, room } = await roomFixture(server, 2);
    const first = device(server, 'companion-mac-1');
    const second = device(server, 'companion-mac-2');
    const firstDeviceAccess: SnakeLiveDeviceAccess = {
      roomId: room.id,
      deviceId: first.id,
      deviceToken: first.token,
    };
    await expect(first.transport.submitClaim({
      ...firstDeviceAccess,
      deviceToken: 'too-short',
      requestKey: 'short-device-token',
      gmName: 'First GM',
      teamId: 'team-1',
    })).rejects.toThrow('at least 32 characters');
    const firstClaimInput = {
      ...firstDeviceAccess,
      requestKey: 'claim-replay-key',
      gmName: 'First GM',
      teamId: 'team-1',
    };
    const firstClaim = await first.transport.submitClaim(firstClaimInput);
    await expect(first.transport.submitClaim(firstClaimInput)).resolves.toEqual(firstClaim);
    await expect(first.transport.submitClaim({
      ...firstClaimInput,
      gmName: 'Changed GM',
    })).rejects.toMatchObject({ code: 'conflict' });
    expect((await host.transport.listEvents(room.id)).filter((event) => (
      event.kind === 'CLAIM_ACTIVITY'
      && event.publicPayload.claimId === firstClaim.id
      && event.publicPayload.action === 'submitted'
    ))).toHaveLength(1);
    await host.transport.resolveClaim({
      ...hostAccess,
      claimId: firstClaim.id,
      expectedClaimRevision: firstClaim.revision,
      idempotencyKey: 'approve-first-team-1',
      status: 'approved',
    });

    const secondDeviceAccess: SnakeLiveDeviceAccess = {
      roomId: room.id,
      deviceId: second.id,
      deviceToken: second.token,
    };
    const secondClaim = await second.transport.submitClaim({
      ...secondDeviceAccess,
      requestKey: 'claim-second-team-1',
      gmName: 'Second GM',
      teamId: 'team-1',
    });
    await host.transport.resolveClaim({
      ...hostAccess,
      claimId: secondClaim.id,
      expectedClaimRevision: secondClaim.revision,
      idempotencyKey: 'approve-second-team-1',
      status: 'approved',
    });
    const reassignedClaims = await host.transport.listClaims(hostAccess);
    expect(reassignedClaims.find((claim) => claim.id === firstClaim.id)).toMatchObject({
      status: 'revoked',
      revision: 3,
    });
    expect(reassignedClaims.find((claim) => claim.id === secondClaim.id)).toMatchObject({
      status: 'approved',
      revision: 2,
    });

    const firstTeamAccess = { ...firstDeviceAccess, teamId: 'team-1' };
    const secondTeamAccess = { ...secondDeviceAccess, teamId: 'team-1' };
    await expect(first.transport.submitIntent({
      ...firstTeamAccess,
      idempotencyKey: 'room-wide-intent-key',
      kind: 'pick',
      expectedRoomRevision: 0,
      payload: { playerId: 'player-1', pick: 1, sessionRevision: 0 },
    })).rejects.toMatchObject({ code: 'forbidden' });
    await second.transport.submitIntent({
      ...secondTeamAccess,
      idempotencyKey: 'room-wide-intent-key',
      kind: 'pick',
      expectedRoomRevision: 0,
      payload: { playerId: 'player-1', pick: 1, sessionRevision: 0 },
    });

    const thirdClaim = await first.transport.submitClaim({
      ...firstDeviceAccess,
      requestKey: 'claim-first-team-2',
      gmName: 'First GM',
      teamId: 'team-2',
    });
    await host.transport.resolveClaim({
      ...hostAccess,
      claimId: thirdClaim.id,
      expectedClaimRevision: thirdClaim.revision,
      idempotencyKey: 'approve-first-team-2',
      status: 'approved',
    });
    await expect(first.transport.submitIntent({
      ...firstDeviceAccess,
      teamId: 'team-2',
      idempotencyKey: 'room-wide-intent-key',
      kind: 'pick',
      expectedRoomRevision: 0,
      payload: { playerId: 'player-2', pick: 2, sessionRevision: 0 },
    })).rejects.toMatchObject({ code: 'conflict' });
  });

  test('lets a public pick and a private board edit commit concurrently', async () => {
    const server = new SnakeLiveRoomTestServer();
    const { host, hostAccess, room } = await roomFixture(server);
    const companion = device(server, 'companion-mac-1');
    const seedReceipt = await host.transport.seedBoardAsHost({
      ...hostAccess,
      teamId: 'team-1',
      idempotencyKey: 'seed-team-1',
      board: { rankedPlayerIds: ['player-8', 'player-1', 'player-19'] },
    });
    expect(seedReceipt).toEqual({ roomId: room.id, teamId: 'team-1', boardRevision: 1, seeded: true });
    expect(seedReceipt).not.toHaveProperty('board');
    const teamAccess = await approve(room.id, host, hostAccess, companion, 'team-1');
    const observedEvents: string[] = [];
    const subscription = companion.transport.subscribe(room.id, {
      onEvent: (event) => observedEvents.push(event.kind),
    });

    const [companionEdit, pickedRoom] = await Promise.all([
      companion.transport.writeBoard({
        ...teamAccess,
        expectedBoardRevision: seedReceipt.boardRevision,
        idempotencyKey: 'board-team-1-v2',
        board: { rankedPlayerIds: ['player-19', 'player-1', 'player-8'] },
      }),
      host.transport.publishRoom({
        ...hostAccess,
        expectedRoomRevision: 0,
        idempotencyKey: 'pick-1',
        publicState: {
          teamIds: Array.from({ length: 8 }, (_, index) => `team-${index + 1}`),
          currentPickIndex: 1,
          completedPlayerIds: ['player-1'],
        },
        eventKind: 'pick-recorded',
        publicEvent: { pick: 1, teamId: 'team-1', playerId: 'player-1' },
      }),
    ]);
    await Promise.resolve();

    expect(pickedRoom.publicRevision).toBe(1);
    expect(companionEdit).toMatchObject({ boardRevision: 2, board: { rankedPlayerIds: ['player-19', 'player-1', 'player-8'] } });
    expect(await companion.transport.getBoard(teamAccess)).toEqual(companionEdit);
    expect(observedEvents).toEqual(['BOARD_ACTIVITY', 'pick-recorded']);
    await subscription.unsubscribe();
  });

  test('does not let a stale private board block pick, trade, or correction truth', async () => {
    const server = new SnakeLiveRoomTestServer();
    const { host, hostAccess, room } = await roomFixture(server);
    const companion = device(server, 'companion-mac-1');
    const seedReceipt = await host.transport.seedBoardAsHost({
      ...hostAccess,
      teamId: 'team-1',
      idempotencyKey: 'seed-stale-team-1',
      board: { rankedPlayerIds: ['player-1', 'player-2'] },
    });
    const teamAccess = await approve(room.id, host, hostAccess, companion, 'team-1');
    const board = await companion.transport.writeBoard({
      ...teamAccess,
      expectedBoardRevision: seedReceipt.boardRevision,
      idempotencyKey: 'fresh-private-edit',
      board: { rankedPlayerIds: ['player-2', 'player-1'] },
    });

    const [staleWrite, afterPick] = await Promise.allSettled([
      companion.transport.writeBoard({
        ...teamAccess,
        expectedBoardRevision: seedReceipt.boardRevision,
        idempotencyKey: 'stale-private-edit',
        board: { rankedPlayerIds: ['player-1'] },
      }),
      host.transport.publishRoom({
        ...hostAccess,
        expectedRoomRevision: 0,
        idempotencyKey: 'public-pick-with-stale-private-board',
        publicState: { currentPickIndex: 1, completedPlayerIds: ['player-1'] },
        eventKind: 'pick-recorded',
        publicEvent: { pick: 1, playerId: 'player-1' },
      }),
    ]);
    expect(staleWrite).toMatchObject({ status: 'rejected', reason: { code: 'stale-revision' } });
    expect(afterPick).toMatchObject({ status: 'fulfilled', value: { publicRevision: 1 } });

    const afterTrade = await host.transport.publishRoom({
      ...hostAccess,
      expectedRoomRevision: 1,
      idempotencyKey: 'public-trade-with-stale-private-board',
      publicState: { currentPickIndex: 1, completedPlayerIds: ['player-1'], tradeCount: 1 },
      eventKind: 'trade-recorded',
      publicEvent: { offerId: 'offer-1' },
    });
    const afterCorrection = await host.transport.publishRoom({
      ...hostAccess,
      expectedRoomRevision: afterTrade.publicRevision,
      idempotencyKey: 'public-correction-with-stale-private-board',
      publicState: { currentPickIndex: 0, completedPlayerIds: [], tradeCount: 1 },
      eventKind: 'pick-corrected',
      publicEvent: { correctedPick: 1 },
    });

    expect(afterCorrection.publicRevision).toBe(3);
    expect((await host.transport.listEvents(room.id)).map((event) => event.kind)).toEqual([
      'ROOM_CREATED',
      'CLAIM_ACTIVITY',
      'CLAIM_ACTIVITY',
      'BOARD_ACTIVITY',
      'pick-recorded',
      'trade-recorded',
      'pick-corrected',
    ]);
    expect(await companion.transport.getBoard(teamAccess)).toEqual(board);
  });

  test('keeps board contents private from the host and unapproved devices', async () => {
    const server = new SnakeLiveRoomTestServer();
    const { host, hostAccess, room } = await roomFixture(server);
    const receipt = await host.transport.seedBoardAsHost({
      ...hostAccess,
      teamId: 'team-1',
      idempotencyKey: 'private-seed-team-1',
      board: { rankedPlayerIds: ['private-player'] },
    });
    expect(receipt).not.toHaveProperty('board');
    expect('getBoardAsHost' in host.transport).toBe(false);
    expect('writeBoardAsHost' in host.transport).toBe(false);
    await expect(host.transport.seedBoardAsHost({
      ...hostAccess,
      teamId: 'team-1',
      idempotencyKey: 'host-overwrite-attempt',
      board: { rankedPlayerIds: ['host-replacement'] },
    })).resolves.toEqual({
      roomId: room.id,
      teamId: 'team-1',
      boardRevision: receipt.boardRevision,
      seeded: false,
    });

    const intruder = device(server, 'unapproved-mac');
    const intruderAccess = {
      roomId: room.id,
      deviceId: intruder.id,
      deviceToken: intruder.token,
      teamId: 'team-1',
    };
    await expect(intruder.transport.getBoard(intruderAccess)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(intruder.transport.writeBoard({
      ...intruderAccess,
      expectedBoardRevision: receipt.boardRevision,
      idempotencyKey: 'intruder-write',
      board: { rankedPlayerIds: [] },
    })).rejects.toMatchObject({ code: 'forbidden' });

    const companion = device(server, 'approved-mac');
    const teamAccess = await approve(room.id, host, hostAccess, companion, 'team-1');
    expect((await companion.transport.getBoard(teamAccess))?.board).toEqual({ rankedPlayerIds: ['private-player'] });
  });

  test('does not let another device on the same account reclaim Hotseat authority', async () => {
    const server = new SnakeLiveRoomTestServer();
    const { hostAccess, room } = await roomFixture(server);
    const companion = device(server, 'same-account-companion-mac');

    // All test clients share the same server account and can read public room
    // truth. Account access must not grant the host capability.
    expect((await companion.transport.findRoomByCode(room.roomCode))?.id).toBe(room.id);
    expect('rotateHostToken' in companion.transport).toBe(false);
    await expect(companion.transport.publishRoom({
      roomId: room.id,
      hostDeviceId: companion.id,
      hostToken: companion.token,
      expectedRoomRevision: 0,
      idempotencyKey: 'same-account-takeover-attempt',
      publicState: { currentPickIndex: 99 },
      eventKind: 'takeover-attempt',
      publicEvent: {},
    })).rejects.toMatchObject({ code: 'forbidden' });

    expect(await companion.transport.getRoom(room.id)).toMatchObject({
      hostDeviceId: hostAccess.hostDeviceId,
      publicRevision: 0,
      publicState: { currentPickIndex: 0 },
    });
    expect(await companion.transport.listEvents(room.id)).toMatchObject([{
      roomRevision: 0,
      kind: 'ROOM_CREATED',
      publicPayload: { roomRevision: 0, phase: 'MLB' },
    }]);
  });

  test('keeps two Run It Back drafts with the same local id in distinct cloud rooms', async () => {
    const server = new SnakeLiveRoomTestServer();
    const host = device(server, 'hotseat-mac');
    const localSessionId = 'mlb:league-one:1';
    const firstRunKey = snakeLiveRoomRunKey({
      id: localSessionId,
      createdDate: '2026-07-19T01:00:00.000Z',
    });
    const secondRunKey = snakeLiveRoomRunKey({
      id: localSessionId,
      createdDate: '2026-07-19T02:00:00.000Z',
    });
    const first = await host.transport.createRoom({
      sessionId: firstRunKey,
      roomCode: '2468',
      phase: 'MLB',
      hostDeviceId: host.id,
      hostToken: host.token,
      publicState: { localSessionId, currentPickIndex: 0 },
    });
    const firstAccess: SnakeLiveHostAccess = {
      roomId: first.id,
      hostDeviceId: host.id,
      hostToken: host.token,
    };
    const completed = await host.transport.publishRoom({
      ...firstAccess,
      expectedRoomRevision: 0,
      idempotencyKey: 'complete-first-run',
      publicState: { localSessionId, currentPickIndex: 176 },
      eventKind: 'draft-completed',
      publicEvent: { pickCount: 176 },
      status: 'complete',
    });

    const second = await host.transport.createRoom({
      sessionId: secondRunKey,
      roomCode: '9753',
      phase: 'MLB',
      hostDeviceId: host.id,
      hostToken: host.token,
      publicState: { localSessionId, currentPickIndex: 0 },
    });

    expect(second.id).not.toBe(first.id);
    expect(await host.transport.findRoomBySession(firstRunKey)).toMatchObject({
      id: first.id,
      status: 'complete',
      publicRevision: completed.publicRevision,
    });
    expect(await host.transport.findRoomBySession(secondRunKey)).toMatchObject({
      id: second.id,
      status: 'open',
      publicRevision: 0,
    });
  });

  test.each([2, 4, 8])(
    'keeps claims, intents, reconnects, corrections, and completion faithful for %i teams',
    async (teamCount) => {
      const server = new SnakeLiveRoomTestServer();
      const { host, hostAccess, room } = await roomFixture(server, teamCount);
      const teamIds = Array.from({ length: teamCount }, (_, index) => `team-${index + 1}`);
      const companions = Array.from(
        { length: Math.min(3, teamCount) },
        (_, index) => device(server, `companion-mac-${index + 1}`),
      );
      const seedReceipts = await Promise.all(teamIds.map((teamId, index) => (
        host.transport.seedBoardAsHost({
          ...hostAccess,
          teamId,
          idempotencyKey: `seed-${teamId}`,
          board: { owner: teamId, rankedPlayerIds: [`player-${index + 1}`] },
        })
      )));
      const teamAccesses = new Map<string, SnakeLiveTeamAccess>();

      for (let index = 0; index < teamIds.length; index += 1) {
        const companion = companions[index % companions.length];
        teamAccesses.set(
          teamIds[index],
          await approve(room.id, host, hostAccess, companion, teamIds[index]),
        );
      }

      const claims = await host.transport.listClaims(hostAccess);
      expect(claims).toHaveLength(teamCount);
      expect(new Set(claims.map((claim) => claim.deviceId)).size).toBe(companions.length);
      if (teamCount > 2) {
        expect(claims.filter((claim) => claim.deviceId === companions[0].id).length).toBeGreaterThan(1);
      }

      const teamOneAccess = teamAccesses.get('team-1');
      if (!teamOneAccess) throw new Error('The team-one test access is missing.');
      const teamOneCompanion = companions[0];
      const boardV2 = await teamOneCompanion.transport.writeBoard({
        ...teamOneAccess,
        expectedBoardRevision: seedReceipts[0].boardRevision,
        idempotencyKey: 'team-1-board-v2',
        board: { owner: 'team-1', rankedPlayerIds: ['player-7', 'player-1'] },
      });

      const pickIntent = await teamOneCompanion.transport.submitIntent({
        ...teamOneAccess,
        idempotencyKey: 'pick-intent-1',
        kind: 'pick',
        expectedRoomRevision: 0,
        payload: { playerId: 'player-7', pick: 1, sessionRevision: 0 },
      });
      const tradeIntent = await teamOneCompanion.transport.submitIntent({
        ...teamOneAccess,
        idempotencyKey: 'trade-intent-1',
        kind: 'trade',
        expectedRoomRevision: 0,
        payload: {
          action: 'POST',
          offerId: 'offer-1',
          buyerTeamId: 'team-1',
          sellerTeamId: 'team-2',
          givePicks: [4, 21],
          receivePicks: [9, 12],
        },
      });
      const hostTradeIntent = await host.transport.submitIntentAsHost({
        ...hostAccess,
        teamId: 'team-2',
        idempotencyKey: 'host-trade-intent-1',
        expectedRoomRevision: 0,
        payload: {
          action: 'NOD',
          offerId: 'offer-1',
          buyerTeamId: 'team-1',
          sellerTeamId: 'team-2',
          givePicks: [4, 21],
          receivePicks: [9, 12],
        },
      });
      await Promise.all([pickIntent, tradeIntent, hostTradeIntent].map((intent) => host.transport.resolveIntent({
        ...hostAccess,
        intentId: intent.id,
        expectedIntentRevision: intent.intentRevision,
        idempotencyKey: `resolve-${intent.id}`,
        status: 'accepted',
      })));

      const publishPickInput = {
        ...hostAccess,
        expectedRoomRevision: 0,
        idempotencyKey: 'publish-pick-1',
        publicState: { currentPickIndex: 1, completedPlayerIds: ['player-7'] },
        eventKind: 'pick-recorded',
        publicEvent: { pick: 1, teamId: 'team-1', playerId: 'player-7' },
      } as const;
      const afterPick = await host.transport.publishRoom(publishPickInput);
      const afterTrade = await host.transport.publishRoom({
        ...hostAccess,
        expectedRoomRevision: afterPick.publicRevision,
        idempotencyKey: 'publish-trade-1',
        publicState: { currentPickIndex: 1, completedPlayerIds: ['player-7'], tradeCount: 1 },
        eventKind: 'trade-recorded',
        publicEvent: { offerId: 'offer-1', buyerTeamId: 'team-1', sellerTeamId: 'team-2' },
      });
      const afterCorrection = await host.transport.publishRoom({
        ...hostAccess,
        expectedRoomRevision: afterTrade.publicRevision,
        idempotencyKey: 'correct-pick-1',
        publicState: { currentPickIndex: 0, completedPlayerIds: [], tradeCount: 1 },
        eventKind: 'pick-corrected',
        publicEvent: { correctedPick: 1 },
      });

      const replayAfterLaterWrites = await host.transport.publishRoom(publishPickInput);
      expect(replayAfterLaterWrites.publicRevision).toBe(afterCorrection.publicRevision);
      const eventsBeforeCompletion = await host.transport.listEvents(room.id);
      expect(eventsBeforeCompletion).toHaveLength((2 * teamCount) + 11);
      expect(eventsBeforeCompletion.filter((event) => event.kind === 'ROOM_CREATED')).toHaveLength(1);
      expect(eventsBeforeCompletion.filter((event) => event.kind === 'CLAIM_ACTIVITY')).toHaveLength(2 * teamCount);
      expect(eventsBeforeCompletion.filter((event) => event.kind === 'BOARD_ACTIVITY')).toHaveLength(1);
      expect(eventsBeforeCompletion.filter((event) => event.kind === 'INTENT_ACTIVITY')).toHaveLength(6);
      const teamOneClaim = claims.find((claim) => claim.teamId === 'team-1');
      expect(teamOneClaim).toBeDefined();
      expect(eventsBeforeCompletion).toContainEqual(expect.objectContaining({
        roomRevision: 0,
        kind: 'CLAIM_ACTIVITY',
        publicPayload: {
          teamId: 'team-1',
          claimId: teamOneClaim?.id,
          claimRevision: 1,
          action: 'submitted',
        },
      }));
      expect(eventsBeforeCompletion).toContainEqual(expect.objectContaining({
        roomRevision: 0,
        kind: 'BOARD_ACTIVITY',
        publicPayload: { teamId: 'team-1', boardRevision: 2, action: 'changed' },
      }));
      expect(eventsBeforeCompletion).toContainEqual(expect.objectContaining({
        roomRevision: 0,
        kind: 'INTENT_ACTIVITY',
        publicPayload: {
          teamId: 'team-2',
          intentId: hostTradeIntent.id,
          intentRevision: 1,
          kind: 'trade',
          action: 'submitted',
        },
      }));
      expect(eventsBeforeCompletion).toContainEqual(expect.objectContaining({
        roomRevision: 0,
        kind: 'INTENT_ACTIVITY',
        publicPayload: {
          teamId: 'team-2',
          intentId: hostTradeIntent.id,
          intentRevision: 2,
          kind: 'trade',
          action: 'accepted',
        },
      }));

      const reconnected = device(server, teamOneCompanion.id);
      const deviceAccess: SnakeLiveDeviceAccess = {
        roomId: room.id,
        deviceId: reconnected.id,
        deviceToken: reconnected.token,
      };
      expect((await reconnected.transport.getRoom(room.id))?.publicRevision).toBe(3);
      expect(await reconnected.transport.listDeviceClaims(deviceAccess)).toHaveLength(
        claims.filter((claim) => claim.deviceId === reconnected.id).length,
      );
      expect(await reconnected.transport.listDeviceIntents(deviceAccess)).toHaveLength(3);
      expect(await reconnected.transport.getBoard(teamOneAccess)).toEqual(boardV2);

      await expect(reconnected.transport.writeBoard({
        ...teamOneAccess,
        expectedBoardRevision: seedReceipts[0].boardRevision,
        idempotencyKey: 'team-1-stale-board',
        board: { owner: 'team-1', rankedPlayerIds: ['stale-player'] },
      })).rejects.toMatchObject({ code: 'stale-revision' });

      if (teamCount === 8) {
        const fourthDevice = device(server, 'companion-mac-4');
        await expect(fourthDevice.transport.submitClaim({
          roomId: room.id,
          deviceId: fourthDevice.id,
          deviceToken: fourthDevice.token,
          requestKey: 'fourth-device-claim',
          gmName: 'GM 4',
          teamId: 'team-8',
        })).rejects.toMatchObject({ code: 'conflict' });
      }

      const completed = await host.transport.publishRoom({
        ...hostAccess,
        expectedRoomRevision: afterCorrection.publicRevision,
        idempotencyKey: 'complete-room',
        publicState: { currentPickIndex: teamCount * 22, completedPlayerIds: ['player-7'], tradeCount: 1 },
        eventKind: 'draft-completed',
        publicEvent: { pickCount: teamCount * 22 },
        status: 'complete',
      });
      expect(completed).toMatchObject({ publicRevision: 4, status: 'complete' });
      expect(await host.transport.listEvents(room.id)).toHaveLength((2 * teamCount) + 12);
    },
  );

  test('completes a bounded 176-pick eight-team stream without duplicate events', async () => {
    const server = new SnakeLiveRoomTestServer();
    const { host, hostAccess, room } = await roomFixture(server);
    const observers = [1, 2, 3].map((number) => device(server, `observer-mac-${number}`));
    const observed = observers.map(() => new Set<number>());
    const subscriptions = observers.map((observer, index) => observer.transport.subscribe(room.id, {
      onEvent: (event) => observed[index].add(event.id),
    }));
    const completedPlayerIds: string[] = [];

    let current = room;
    for (let pickIndex = 0; pickIndex < 176; pickIndex += 1) {
      const playerId = `player-${pickIndex + 1}`;
      completedPlayerIds.push(playerId);
      const teamId = `team-${(pickIndex % 8) + 1}`;
      current = await host.transport.publishRoom({
        ...hostAccess,
        expectedRoomRevision: current.publicRevision,
        idempotencyKey: `pick-${pickIndex + 1}`,
        publicState: {
          currentPickIndex: pickIndex + 1,
          completedPlayerIds: [...completedPlayerIds],
        },
        eventKind: 'pick-recorded',
        publicEvent: { pick: pickIndex + 1, teamId, playerId },
        status: pickIndex === 175 ? 'complete' : undefined,
      });
    }
    await Promise.resolve();

    expect(current.publicRevision).toBe(176);
    expect(current.status).toBe('complete');
    const events = await host.transport.listEvents(room.id);
    expect(events).toHaveLength(177);
    expect(new Set(events.map((event) => event.id)).size).toBe(177);
    expect(events[0]).toMatchObject({ roomRevision: 0, kind: 'ROOM_CREATED' });
    expect(events.at(-1)).toMatchObject({ roomRevision: 176, kind: 'pick-recorded' });
    expect(observed.map((entries) => entries.size)).toEqual([176, 176, 176]);
    await Promise.all(subscriptions.map((subscription) => subscription.unsubscribe()));
  });
});
