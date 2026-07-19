import { describe, expect, it } from 'vitest';

import type { LeagueBuilderMlbDraftSession } from '../leagueBuilderStorage';
import {
  buildSnakeLivePublicState,
  legacySnakeCompanionState,
  readSnakeLivePublicSession,
  SNAKE_LIVE_PUBLIC_STATE_FORMAT,
  snakeLiveRoomRunKey,
} from '../snakeLiveRoomSession';
import type { SnakeLiveClaim, SnakeLiveIntent, SnakeLiveRoom } from '../snakeLiveRoomTypes';

function session(): LeagueBuilderMlbDraftSession {
  return {
    id: 'league:1:snake', leagueId: 'league', seasonNumber: 1, seed: 'seed',
    workflowVersion: 'test', engineMethodVersion: 'test', tier: 'standard', balanceMode: 'STANDARD',
    rounds: 22, pickOrder: [{ round: 1, pick: 1, teamId: 'team-a' }], completedPicks: [],
    currentPickIndex: 0, createdDate: '2026-07-19T00:00:00.000Z', lastModified: '2026-07-19T00:00:00.000Z',
    seatBoards: { 'team-a': { teamId: 'team-a', revision: 1, rankingsByPosition: {}, slots: [] } },
    roomLogByTeamId: { 'team-a': [] },
    openTradeOffers: [],
    correctionSnapshots: [],
    farmProspectSnapshot: [],
    snakeCompanions: { roomCode: '1234', claims: [] },
    snakeSetup: {
      poolPlayerIds: ['p1'], versionSelections: {}, orderSeed: 'order',
      clubs: [{ teamId: 'team-a', hotseat: false, gmName: 'GM' }],
      seatingCertificate: {
        feasible: true,
        assignments: [{ teamId: 'team-a', playerIds: ['secret'], salaryCost: 1, addedTax: 0, allInCost: 1 }],
        shortfall: null,
        message: 'secret',
      },
    },
  } as LeagueBuilderMlbDraftSession;
}

function room(publicState = buildSnakeLivePublicState(session())): SnakeLiveRoom {
  return {
    id: 'room', ownerUserId: 'user', sessionId: 'league:1:snake', roomCode: '1234', phase: 'MLB',
    status: 'open', publicRevision: 1, publicState, hostDeviceId: 'host',
    createdAt: '2026-07-19T00:00:00.000Z', updatedAt: '2026-07-19T00:00:00.000Z',
  };
}

describe('Snake live public session boundary', () => {
  it('removes every private and duplicate authority field', () => {
    const publicState = buildSnakeLivePublicState(session());
    expect(publicState.formatVersion).toBe(SNAKE_LIVE_PUBLIC_STATE_FORMAT);
    const stored = publicState.session as Record<string, unknown>;
    expect(stored).not.toHaveProperty('seatBoards');
    expect(stored).not.toHaveProperty('farmSeatBoards');
    expect(stored).not.toHaveProperty('roomLogByTeamId');
    expect(stored).not.toHaveProperty('openTradeOffers');
    expect(stored).not.toHaveProperty('snakeCompanions');
    expect(stored).not.toHaveProperty('correctionSnapshots');
    expect(stored).not.toHaveProperty('farmProspectSnapshot');
    expect(stored).not.toHaveProperty('companionRoomPublication');
    expect((stored.snakeSetup as Record<string, unknown>)).not.toHaveProperty('seatingCertificate');
  });

  it('rejects private data in a public room', () => {
    const publicState = buildSnakeLivePublicState(session());
    const stored = publicState.session as Record<string, unknown>;
    stored.seatBoards = { 'team-a': {} };
    expect(() => readSnakeLivePublicSession(room(publicState))).toThrow('PRIVATE DRAFT DATA');
  });

  it('uses one stable cloud key per persisted run and a new key after Run It Back', () => {
    const first = session();
    const replay = structuredClone(first);
    const second = { ...first, createdDate: '2026-07-19T01:00:00.000Z' };
    expect(snakeLiveRoomRunKey(replay)).toBe(snakeLiveRoomRunKey(first));
    expect(snakeLiveRoomRunKey(second)).not.toBe(snakeLiveRoomRunKey(first));
    expect(readSnakeLivePublicSession({
      ...room(),
      sessionId: snakeLiveRoomRunKey(first),
    }).id).toBe(first.id);
  });

  it('rebuilds legacy control state from scoped server rows', () => {
    const claim: SnakeLiveClaim = {
      id: 'claim', roomId: 'room', requestKey: 'request', deviceId: 'device', gmName: 'GM', teamId: 'team-a',
      status: 'approved', revision: 2, createdAt: '2026-07-19T00:00:00.000Z', resolvedAt: '2026-07-19T00:00:01.000Z',
    };
    const intent: SnakeLiveIntent = {
      id: 'intent', roomId: 'room', idempotencyKey: 'intent-key', deviceId: 'device', teamId: 'team-a',
      kind: 'pick', status: 'pending', intentRevision: 1, expectedRoomRevision: 4,
      payload: {
        playerId: 'p1', pick: 5, sessionRevision: 12,
        submittedAt: '2026-07-19T00:00:02.000Z',
      },
      createdAt: '2026-07-19T00:00:02.000Z', resolvedAt: null,
    };
    const state = legacySnakeCompanionState({ roomCode: '1234', claims: [claim], intents: [intent] });
    expect(state.claims[0]).toMatchObject({ claimId: 'claim', claimVersion: 2, status: 'approved' });
    expect(state.pickRequest).toMatchObject({ id: 'intent', playerId: 'p1', pick: 5, sessionRevision: 12 });
  });

  it('does not confuse the server revision with a missing draft-session revision', () => {
    const intent: SnakeLiveIntent = {
      id: 'intent', roomId: 'room', idempotencyKey: 'intent-key', deviceId: 'device', teamId: 'team-a',
      kind: 'pick', status: 'pending', intentRevision: 1, expectedRoomRevision: 99,
      payload: { playerId: 'p1', pick: 5, submittedAt: '2026-07-19T00:00:02.000Z' },
      createdAt: '2026-07-19T00:00:02.000Z', resolvedAt: null,
    };
    const state = legacySnakeCompanionState({ roomCode: '1234', claims: [], intents: [intent] });
    expect(state.pickRequest).toBeUndefined();
  });
});
