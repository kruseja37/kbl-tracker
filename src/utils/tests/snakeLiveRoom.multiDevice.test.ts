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
      session: {
        snakeSetup: {
          clubs: teamIds.map((teamId) => ({ teamId })),
          poolPlayerIds: ['player-1', 'player-2'],
        },
      },
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

  test('shares one host-seeded catalog and rejects a changed replay', async () => {
    const server = new SnakeLiveRoomTestServer();
    const { host, hostAccess, room } = await roomFixture(server, 2);
    const companion = device(server, 'companion-mac-1');
    const catalog = {
      formatVersion: 'snake-live-catalog-v1',
      league: { id: 'league-1', teamIds: ['team-1', 'team-2'] },
      teams: [{ id: 'team-1' }, { id: 'team-2' }],
      players: [{ id: 'player-1' }, { id: 'player-2' }],
      registeredPool: {
        leagueId: 'league-1',
        players: [
          { id: 'player-1', iv: 100, salary: 100 },
          { id: 'player-2', iv: 90, salary: 90 },
        ],
      },
    };
    await expect(host.transport.seedCatalog({
      ...hostAccess,
      catalog: {
        ...catalog,
        players: [catalog.players[0]],
        registeredPool: { ...catalog.registeredPool, players: [catalog.registeredPool.players[0]] },
      },
    })).rejects.toThrow('invalid or contains private data');
    await expect(host.transport.seedCatalog({
      ...hostAccess,
      catalog: {
        ...catalog,
        league: { id: 'league-1', teamIds: ['team-3', 'team-4'] },
        teams: [{ id: 'team-3' }, { id: 'team-4' }],
      },
    })).rejects.toThrow('invalid or contains private data');
    const seeded = await host.transport.seedCatalog({ ...hostAccess, catalog });
    await expect(host.transport.seedCatalog({ ...hostAccess, catalog })).resolves.toEqual(seeded);
    await expect(companion.transport.getCatalog(room.id)).resolves.toEqual(seeded);
    await expect(host.transport.seedCatalog({
      ...hostAccess,
      catalog: { ...catalog, players: [{ id: 'player-1', firstName: 'Changed' }, catalog.players[1]] },
    })).rejects.toMatchObject({ code: 'conflict' });

    await host.transport.publishRoom({
      ...hostAccess,
      expectedRoomRevision: 0,
      idempotencyKey: 'pick-1',
      publicState: { currentPickIndex: 1, completedPlayerIds: ['player-1'] },
      eventKind: 'PICK_RECORDED',
      publicEvent: { playerId: 'player-1', pick: 1 },
    });
    await expect(companion.transport.getCatalog(room.id)).resolves.toEqual(seeded);
  });

  test('shares one FARM catalog and rejects true prospect data at the server boundary', async () => {
    const server = new SnakeLiveRoomTestServer();
    const host = device(server, 'farm-hotseat-mac');
    const teamIds = ['team-1', 'team-2'];
    const prospectIds = ['prospect-1', 'prospect-2'];
    const farmSession = {
      id: 'farm-live-room',
      leagueId: 'farm-league',
      seasonNumber: 2,
      seed: 'farm-seed',
      workflowVersion: 'snake-v1-farm',
      engineMethodVersion: 'snake-s6',
      tier: 'standard',
      balanceMode: 'taxed',
      rounds: 1,
      draftPhase: 'FARM',
      farmSlotSalaries: [30_000, 10_000],
      pickOrder: [
        { round: 1, pick: 1, teamId: 'team-1' },
        { round: 1, pick: 2, teamId: 'team-2' },
      ],
      completedPicks: [],
      trades: [],
      currentPickIndex: 0,
      revision: 0,
      createdDate: '2026-07-19T00:00:00.000Z',
      lastModified: '2026-07-19T00:00:00.000Z',
      snakeSetup: {
        clubs: teamIds.map((teamId) => ({ teamId })),
        poolPlayerIds: prospectIds,
        versionSelections: {},
        orderSeed: 'farm-seed',
      },
    };
    const initialPublicState = {
      formatVersion: 'snake-live-public-state-v1',
      session: farmSession,
    };
    const room = await host.transport.createRoom({
      sessionId: 'farm-live-room',
      roomCode: '8642',
      phase: 'FARM',
      hostDeviceId: host.id,
      hostToken: host.token,
      publicState: initialPublicState,
    });
    const hostAccess = {
      roomId: room.id,
      hostDeviceId: host.id,
      hostToken: host.token,
    };
    const catalog = {
      formatVersion: 'snake-live-farm-catalog-v1',
      league: { id: 'farm-league', name: 'Farm League', teamIds },
      teams: teamIds.map((id, index) => ({
        id,
        name: `Farm Team ${index + 1}`,
        abbreviation: `F${index + 1}`,
        colors: { primary: '#123456', secondary: '#ffffff' },
        farmArchetypeKey: index === 0 ? 'web-gems' : 'bomba-squad',
      })),
      prospects: [
        { id: 'prospect-1', firstName: 'Mara', lastName: 'Diaz', primaryPosition: 'SS' },
        { id: 'prospect-2', firstName: 'Jo', lastName: 'Arm', primaryPosition: 'SP' },
      ],
      existingFarmRostersByTeamId: { 'team-1': [], 'team-2': [] },
      farmTarget: 10,
    };

    await expect(host.transport.seedCatalog({
      ...hostAccess,
      catalog: {
        ...catalog,
        prospects: [{ ...catalog.prospects[0], trueGrade: 'A+' }, catalog.prospects[1]],
      },
    })).rejects.toThrow('invalid or contains private data');
    await expect(host.transport.seedCatalog({
      ...hostAccess,
      catalog: { ...catalog, trueGrade: 'A+' },
    })).rejects.toThrow('invalid or contains private data');
    await expect(host.transport.seedCatalog({
      ...hostAccess,
      catalog: { ...catalog, league: { ...catalog.league, salary: 99_000 } },
    })).rejects.toThrow('invalid or contains private data');
    await expect(host.transport.seedCatalog({
      ...hostAccess,
      catalog: { ...catalog, league: { ...catalog.league, name: { display: 'Farm League' } } },
    })).rejects.toThrow('invalid or contains private data');
    await expect(host.transport.seedCatalog({
      ...hostAccess,
      catalog: {
        ...catalog,
        teams: [{ ...catalog.teams[0], iv: 99 }, catalog.teams[1]],
      },
    })).rejects.toThrow('invalid or contains private data');
    await expect(host.transport.seedCatalog({
      ...hostAccess,
      catalog: {
        ...catalog,
        teams: [{
          ...catalog.teams[0],
          colors: { ...catalog.teams[0].colors, accent: { display: '#ffffff' } },
        }, catalog.teams[1]],
      },
    })).rejects.toThrow('invalid or contains private data');
    const seeded = await host.transport.seedCatalog({ ...hostAccess, catalog });
    const companion = device(server, 'farm-companion-mac');
    await expect(companion.transport.getCatalog(room.id)).resolves.toEqual(seeded);

    const teamAccess = await approve(room.id, host, hostAccess, companion, 'team-1');
    await expect(companion.transport.submitIntent({
      ...teamAccess,
      idempotencyKey: 'farm-pick-intent',
      kind: 'pick',
      expectedRoomRevision: 0,
      payload: { playerId: 'prospect-1', pick: 1, sessionRevision: 0 },
    })).resolves.toMatchObject({ kind: 'pick', teamId: 'team-1' });
    const tradePayload = {
      action: 'POST', offerId: 'farm-offer', buyerTeamId: 'team-1', sellerTeamId: 'team-2',
    };
    await expect(companion.transport.submitIntent({
      ...teamAccess,
      idempotencyKey: 'farm-trade-intent',
      kind: 'trade',
      expectedRoomRevision: 0,
      payload: tradePayload,
    })).rejects.toThrow('FARM trade intents are not allowed');
    await expect(host.transport.submitIntentAsHost({
      ...hostAccess,
      teamId: 'team-1',
      idempotencyKey: 'farm-host-trade-intent',
      expectedRoomRevision: 0,
      payload: tradePayload,
    })).rejects.toThrow('FARM trade intents are not allowed');
    await expect(host.transport.publishRoom({
      ...hostAccess,
      expectedRoomRevision: 0,
      idempotencyKey: 'farm-trade-publish',
      publicState: room.publicState,
      eventKind: 'TRADE_EXECUTED',
      publicEvent: { offerId: 'farm-offer' },
    })).rejects.toThrow('FARM public actions can record picks only');
    await expect(host.transport.publishRoom({
      ...hostAccess,
      expectedRoomRevision: 0,
      idempotencyKey: 'farm-pause-publish',
      publicState: initialPublicState,
      eventKind: 'PAUSE_CHANGED',
      publicEvent: { paused: true },
    })).rejects.toThrow('FARM public actions can record picks only');
    const pickedPublicState = {
      formatVersion: 'snake-live-public-state-v1',
      session: {
        ...farmSession,
        completedPicks: [{
          round: 1,
          pick: 1,
          teamId: 'team-1',
          playerId: 'prospect-1',
          settledSalary: 30_000,
          marginalTax: 0,
        }],
        currentPickIndex: 1,
        revision: 1,
        lastModified: '2026-07-19T00:01:00.000Z',
      },
    };
    const rejectedFarmRewrites = [
      { key: 'paused', publicState: { ...pickedPublicState, session: { ...pickedPublicState.session, paused: true } } },
      { key: 'trades', publicState: { ...pickedPublicState, session: { ...pickedPublicState.session, trades: [{ id: 'hidden-trade' }] } } },
      { key: 'order', publicState: { ...pickedPublicState, session: { ...pickedPublicState.session, pickOrder: [...farmSession.pickOrder].reverse() } } },
      { key: 'version', publicState: { ...pickedPublicState, session: { ...pickedPublicState.session, versionState: { private: true } } } },
    ];
    for (const attempt of rejectedFarmRewrites) {
      await expect(host.transport.publishRoom({
        ...hostAccess,
        expectedRoomRevision: 0,
        idempotencyKey: `farm-invalid-${attempt.key}`,
        publicState: attempt.publicState,
        eventKind: 'PICK_RECORDED',
        publicEvent: { playerId: 'prospect-1', pick: 1, teamId: 'team-1' },
        status: 'open',
      })).rejects.toThrow('FARM pick transition is invalid');
    }
    await expect(host.transport.publishRoom({
      ...hostAccess,
      expectedRoomRevision: 0,
      idempotencyKey: 'farm-invalid-event-shape',
      publicState: pickedPublicState,
      eventKind: 'PICK_RECORDED',
      publicEvent: { playerId: 'prospect-1', pick: 1, teamId: 'team-1', note: 'extra' },
      status: 'open',
    })).rejects.toThrow('FARM pick transition is invalid');
    const published = await host.transport.publishRoom({
      ...hostAccess,
      expectedRoomRevision: 0,
      idempotencyKey: 'farm-pick-publish',
      publicState: pickedPublicState,
      eventKind: 'PICK_RECORDED',
      publicEvent: { playerId: 'prospect-1', pick: 1, teamId: 'team-1' },
      status: 'open',
    });
    expect(published).toMatchObject({ publicRevision: 1, correctionAvailable: true });
    const corrected = await host.transport.restorePreviousPublicState({
      ...hostAccess,
      expectedRoomRevision: published.publicRevision,
      idempotencyKey: 'farm-correct-pick',
    });
    expect(corrected).toMatchObject({ publicRevision: 2, correctionAvailable: false });
    expect(corrected.publicState).toEqual(initialPublicState);

    const republishedFirst = await host.transport.publishRoom({
      ...hostAccess,
      expectedRoomRevision: corrected.publicRevision,
      idempotencyKey: 'farm-pick-publish-after-correction',
      publicState: pickedPublicState,
      eventKind: 'PICK_RECORDED',
      publicEvent: { playerId: 'prospect-1', pick: 1, teamId: 'team-1' },
      status: 'open',
    });
    const completedPublicState = {
      ...pickedPublicState,
      session: {
        ...pickedPublicState.session,
        completedPicks: [
          ...pickedPublicState.session.completedPicks,
          {
            round: 1,
            pick: 2,
            teamId: 'team-2',
            playerId: 'prospect-2',
            settledSalary: 10_000,
            marginalTax: 0,
          },
        ],
        currentPickIndex: 2,
        revision: 2,
        lastModified: '2026-07-19T00:02:00.000Z',
      },
    };
    const finalPublish = {
      ...hostAccess,
      expectedRoomRevision: republishedFirst.publicRevision,
      idempotencyKey: 'farm-pick-final',
      publicState: completedPublicState,
      eventKind: 'PICK_RECORDED' as const,
      publicEvent: { playerId: 'prospect-2', pick: 2, teamId: 'team-2' },
      status: 'complete' as const,
    };
    const completed = await host.transport.publishRoom(finalPublish);
    expect(completed).toMatchObject({ publicRevision: 4, status: 'complete' });
    await expect(host.transport.publishRoom(finalPublish)).resolves.toEqual(completed);
  });

  test.each([
    { eventKind: 'PICK_RECORDED', action: 'pick', status: 'complete' as const },
    { eventKind: 'TRADE_EXECUTED', action: 'trade', status: undefined },
  ])('restores one private server snapshot after a $action publish and host reload', async ({
    eventKind, action, status,
  }) => {
    const server = new SnakeLiveRoomTestServer();
    const { host, hostAccess, room } = await roomFixture(server, 2);
    const originalState = room.publicState;
    const published = await host.transport.publishRoom({
      ...hostAccess,
      expectedRoomRevision: 0,
      idempotencyKey: `publish-${action}`,
      publicState: {
        teamIds: ['team-1', 'team-2'],
        currentPickIndex: action === 'pick' ? 1 : 0,
        completedPlayerIds: action === 'pick' ? ['player-1'] : [],
        tradeCount: action === 'trade' ? 1 : 0,
      },
      eventKind,
      publicEvent: action === 'pick'
        ? { pick: 1, teamId: 'team-1', playerId: 'player-1' }
        : { offerId: 'offer-1', buyerTeamId: 'team-1', sellerTeamId: 'team-2' },
      ...(status ? { status } : {}),
    });
    expect(published).toMatchObject({ publicRevision: 1, correctionAvailable: true });

    // This new transport models a reload after the local mirror was lost.
    const reloadedHost = createSnakeLiveRoomTransport(server.createClient(`reloaded-${action}`));
    await expect(reloadedHost.getRoom(room.id)).resolves.toMatchObject({
      publicRevision: 1,
      correctionAvailable: true,
    });
    const unapprovedDevice = device(server, `unapproved-${action}`);
    await expect(unapprovedDevice.transport.restorePreviousPublicState({
      roomId: room.id,
      hostDeviceId: unapprovedDevice.id,
      hostToken: unapprovedDevice.token,
      expectedRoomRevision: 1,
      idempotencyKey: `forbidden-correct-${action}`,
    })).rejects.toMatchObject({ code: 'forbidden' });

    const correctionInput = {
      ...hostAccess,
      expectedRoomRevision: 1,
      idempotencyKey: `correct-${action}`,
    };
    const restored = await reloadedHost.restorePreviousPublicState(correctionInput);
    expect(restored).toMatchObject({
      publicRevision: 2,
      publicState: originalState,
      status: 'open',
      correctionAvailable: false,
    });
    await expect(reloadedHost.restorePreviousPublicState(correctionInput)).resolves.toEqual(restored);
    await expect(reloadedHost.restorePreviousPublicState({
      ...correctionInput,
      idempotencyKey: `second-correct-${action}`,
      expectedRoomRevision: restored.publicRevision,
    })).rejects.toThrow('No completed pick or trade is available to correct.');

    const correctionEvents = (await reloadedHost.listEvents(room.id)).filter((event) => (
      event.kind === 'CORRECTION_APPLIED'
    ));
    expect(correctionEvents).toEqual([expect.objectContaining({
      roomRevision: 2,
      publicPayload: { roomRevision: 2, correctedRevision: 1, action },
    })]);
    expect(JSON.stringify(correctionEvents)).not.toContain('prior_public_state');
    expect(server.rows('snake_live_recovery_slots')).toEqual([]);
  });

  test('keeps the latest pick recovery slot through a later pause update', async () => {
    const server = new SnakeLiveRoomTestServer();
    const { host, hostAccess, room } = await roomFixture(server, 2);
    const originalState = room.publicState;
    const afterPick = await host.transport.publishRoom({
      ...hostAccess,
      expectedRoomRevision: 0,
      idempotencyKey: 'pick-before-pause',
      publicState: { currentPickIndex: 1, completedPlayerIds: ['player-1'] },
      eventKind: 'PICK_RECORDED',
      publicEvent: { pick: 1, teamId: 'team-1', playerId: 'player-1' },
    });
    const afterPause = await host.transport.publishRoom({
      ...hostAccess,
      expectedRoomRevision: afterPick.publicRevision,
      idempotencyKey: 'pause-after-pick',
      publicState: { ...afterPick.publicState, paused: true },
      eventKind: 'PAUSE_CHANGED',
      publicEvent: { paused: true },
    });
    expect(afterPause.correctionAvailable).toBe(true);

    const restored = await host.transport.restorePreviousPublicState({
      ...hostAccess,
      expectedRoomRevision: afterPause.publicRevision,
      idempotencyKey: 'correct-pick-after-pause',
    });
    expect(restored).toMatchObject({
      publicRevision: 3,
      publicState: originalState,
      correctionAvailable: false,
    });
  });

  test('clears the correction slot when the host closes the room', async () => {
    const server = new SnakeLiveRoomTestServer();
    const { host, hostAccess } = await roomFixture(server, 2);
    const afterPick = await host.transport.publishRoom({
      ...hostAccess,
      expectedRoomRevision: 0,
      idempotencyKey: 'pick-before-close',
      publicState: { currentPickIndex: 1, completedPlayerIds: ['player-1'] },
      eventKind: 'PICK_RECORDED',
      publicEvent: { pick: 1, teamId: 'team-1', playerId: 'player-1' },
    });
    expect(afterPick.correctionAvailable).toBe(true);
    const closed = await host.transport.closeRoom(
      hostAccess,
      afterPick.publicRevision,
      'close-after-pick',
    );
    expect(closed).toMatchObject({ status: 'closed', correctionAvailable: false });
    await expect(host.transport.restorePreviousPublicState({
      ...hostAccess,
      expectedRoomRevision: closed.publicRevision,
      idempotencyKey: 'correct-after-close',
    })).rejects.toThrow('The closed live room cannot be corrected.');
  });

  test('allows the same pick to be made and corrected again as a new room revision', async () => {
    const server = new SnakeLiveRoomTestServer();
    const { host, hostAccess, room } = await roomFixture(server, 2);
    const pickState = { currentPickIndex: 1, completedPlayerIds: ['player-1'] };
    const firstPick = await host.transport.publishRoom({
      ...hostAccess,
      expectedRoomRevision: 0,
      idempotencyKey: 'pick-room-revision-0',
      publicState: pickState,
      eventKind: 'PICK_RECORDED',
      publicEvent: { pick: 1, teamId: 'team-1', playerId: 'player-1' },
    });
    const firstCorrection = await host.transport.restorePreviousPublicState({
      ...hostAccess,
      expectedRoomRevision: firstPick.publicRevision,
      idempotencyKey: 'correct-room-revision-1',
    });
    expect(firstCorrection.publicState).toEqual(room.publicState);

    const secondPick = await host.transport.publishRoom({
      ...hostAccess,
      expectedRoomRevision: firstCorrection.publicRevision,
      idempotencyKey: 'pick-room-revision-2',
      publicState: pickState,
      eventKind: 'PICK_RECORDED',
      publicEvent: { pick: 1, teamId: 'team-1', playerId: 'player-1' },
    });
    const secondCorrection = await host.transport.restorePreviousPublicState({
      ...hostAccess,
      expectedRoomRevision: secondPick.publicRevision,
      idempotencyKey: 'correct-room-revision-3',
    });
    expect(secondCorrection).toMatchObject({
      publicRevision: 4,
      publicState: room.publicState,
      correctionAvailable: false,
    });
    const events = await host.transport.listEvents(room.id);
    expect(events.filter((event) => event.kind === 'PICK_RECORDED')).toHaveLength(2);
    expect(events.filter((event) => event.kind === 'CORRECTION_APPLIED')).toHaveLength(2);
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
        eventKind: 'PICK_RECORDED',
        publicEvent: { pick: 1, teamId: 'team-1', playerId: 'player-1' },
      }),
    ]);
    await Promise.resolve();

    expect(pickedRoom.publicRevision).toBe(1);
    expect(companionEdit).toMatchObject({ boardRevision: 2, board: { rankedPlayerIds: ['player-19', 'player-1', 'player-8'] } });
    expect(await companion.transport.getBoard(teamAccess)).toEqual(companionEdit);
    expect(observedEvents).toEqual(['PICK_RECORDED']);
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
        eventKind: 'PICK_RECORDED',
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
      eventKind: 'TRADE_EXECUTED',
      publicEvent: { offerId: 'offer-1' },
    });
    const afterCorrection = await host.transport.restorePreviousPublicState({
      ...hostAccess,
      expectedRoomRevision: afterTrade.publicRevision,
      idempotencyKey: 'public-correction-with-stale-private-board',
    });

    expect(afterCorrection.publicRevision).toBe(3);
    expect((await host.transport.listEvents(room.id)).map((event) => event.kind)).toEqual([
      'ROOM_CREATED',
      'CLAIM_ACTIVITY',
      'CLAIM_ACTIVITY',
      'PICK_RECORDED',
      'TRADE_EXECUTED',
      'CORRECTION_APPLIED',
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
      board: {
        rankedPlayerIds: ['private-player'],
        designSlots: [{ slotId: 'SP1', playerId: 'private-player' }],
      },
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
    expect((await companion.transport.getBoard(teamAccess))?.board).toEqual({
      rankedPlayerIds: ['private-player'],
      designSlots: [{ slotId: 'SP1', playerId: 'private-player' }],
    });
    expect(JSON.stringify(await host.transport.getRoom(room.id))).not.toContain('private-player');
    expect(JSON.stringify(await host.transport.listEvents(room.id))).not.toContain('private-player');
  });

  test('lets the signed-in owner explicitly recover Hotseat authority without changing draft truth', async () => {
    const server = new SnakeLiveRoomTestServer();
    const { host, hostAccess, room } = await roomFixture(server, 2);
    const recoveredHost = device(server, 'recovered-hotseat-mac');
    const catalog = {
      formatVersion: 'snake-live-catalog-v1',
      league: { id: 'league-1', teamIds: ['team-1', 'team-2'] },
      teams: [{ id: 'team-1' }, { id: 'team-2' }],
      players: [{ id: 'player-1' }, { id: 'player-2' }],
      registeredPool: {
        leagueId: 'league-1',
        players: [
          { id: 'player-1', iv: 100, salary: 100 },
          { id: 'player-2', iv: 90, salary: 90 },
        ],
      },
    };

    await recoveredHost.transport.recoverHost({
      roomId: room.id,
      roomCode: room.roomCode,
      expectedRoomRevision: 0,
      hostDeviceId: recoveredHost.id,
      hostToken: recoveredHost.token,
      catalog,
    });

    expect(await recoveredHost.transport.getRoom(room.id)).toMatchObject({
      hostDeviceId: recoveredHost.id,
      publicRevision: 0,
      publicState: { currentPickIndex: 0 },
    });
    await expect(recoveredHost.transport.getCatalog(room.id)).resolves.toMatchObject({ catalog });
    await expect(recoveredHost.transport.listClaims({
      roomId: room.id,
      hostDeviceId: recoveredHost.id,
      hostToken: recoveredHost.token,
    })).resolves.toEqual([]);
    await expect(host.transport.listClaims(hostAccess)).rejects.toMatchObject({ code: 'forbidden' });
    expect(await recoveredHost.transport.listEvents(room.id)).toMatchObject([{
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
      eventKind: 'PICK_RECORDED',
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
        eventKind: 'PICK_RECORDED',
        publicEvent: { pick: 1, teamId: 'team-1', playerId: 'player-7' },
      } as const;
      const afterPick = await host.transport.publishRoom(publishPickInput);
      const afterTrade = await host.transport.publishRoom({
        ...hostAccess,
        expectedRoomRevision: afterPick.publicRevision,
        idempotencyKey: 'publish-trade-1',
        publicState: { currentPickIndex: 1, completedPlayerIds: ['player-7'], tradeCount: 1 },
        eventKind: 'TRADE_EXECUTED',
        publicEvent: { offerId: 'offer-1', buyerTeamId: 'team-1', sellerTeamId: 'team-2' },
      });
      const afterCorrection = await host.transport.restorePreviousPublicState({
        ...hostAccess,
        expectedRoomRevision: afterTrade.publicRevision,
        idempotencyKey: 'correct-pick-1',
      });

      const replayAfterLaterWrites = await host.transport.publishRoom(publishPickInput);
      expect(replayAfterLaterWrites.publicRevision).toBe(afterCorrection.publicRevision);
      const eventsBeforeCompletion = await host.transport.listEvents(room.id);
      expect(eventsBeforeCompletion).toHaveLength((2 * teamCount) + 10);
      expect(eventsBeforeCompletion.filter((event) => event.kind === 'ROOM_CREATED')).toHaveLength(1);
      expect(eventsBeforeCompletion.filter((event) => event.kind === 'CLAIM_ACTIVITY')).toHaveLength(2 * teamCount);
      expect(eventsBeforeCompletion.filter((event) => event.kind === 'BOARD_ACTIVITY')).toHaveLength(0);
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
        eventKind: 'PICK_RECORDED',
        publicEvent: { pickCount: teamCount * 22 },
        status: 'complete',
      });
      expect(completed).toMatchObject({ publicRevision: 4, status: 'complete' });
      expect(await host.transport.listEvents(room.id)).toHaveLength((2 * teamCount) + 11);
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
        eventKind: 'PICK_RECORDED',
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
    expect(events.at(-1)).toMatchObject({ roomRevision: 176, kind: 'PICK_RECORDED' });
    expect(observed.map((entries) => entries.size)).toEqual([176, 176, 176]);
    await Promise.all(subscriptions.map((subscription) => subscription.unsubscribe()));
  });
});
