import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  data: {} as Record<string, unknown>,
  currentSession: null as unknown,
  patchBoard: vi.fn(),
  refresh: vi.fn(async () => undefined),
  assistantRequests: [] as Array<{ key: string; input: Record<string, unknown> }>,
  assistantResults: [] as Array<Record<string, unknown>>,
  mainSave: vi.fn(),
  omitContextPlayerId: null as string | null,
  riskMode: 'NONE' as 'NONE' | 'SAFE' | 'URGENT',
  riskRequests: [] as unknown[],
  guideMode: 'NONE' as 'NONE' | 'READY' | 'MALFORMED',
  assistantFailureReason: null as null | 'PIN_UNMATCHED' | 'INSOLVENT_BOARD',
  guideRequests: [] as unknown[],
  manualGuideCalls: [] as unknown[],
  manualGuidePromise: null as Promise<unknown> | null,
  companionFreshnessRefresh: null as null | (() => void | Promise<void>),
  mainFreshnessRefresh: null as null | (() => void | Promise<void>),
  freshData: null as null | Record<string, unknown>,
  liveIntents: [] as Array<Record<string, unknown>>,
  liveIntentSequence: 0,
  liveAutoResumed: false,
  liveBoardDesignSlots: null as Array<Record<string, unknown>> | null,
  soundEvents: [] as string[],
  forceOpenFinishSafety: false,
  forceBlockedFinishSafety: false,
  holdFinishSafety: false,
}));

vi.mock('../../hooks/useLeagueBuilderData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useLeagueBuilderData')>();
  return { ...actual, useLeagueBuilderData: () => mocks.data };
});
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'owner', email: 'owner@example.com' }, isAuthenticated: true, isLoading: false, error: null,
    signIn: vi.fn(), signOut: vi.fn(async () => undefined),
  }),
}));
vi.mock('../../../utils/franchisePhase2Flags', () => ({ isSnakeDraftV1Enabled: () => true }));
vi.mock('../../../engines/rosterIntelligencePayload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../engines/rosterIntelligencePayload')>();
  return {
    ...actual,
    assembleBoard: (input: Parameters<typeof actual.assembleBoard>[0]) => actual.assembleBoard(input)
      .filter((row) => row.playerId !== mocks.omitContextPlayerId),
  };
});
vi.mock('../../app/components/snake/companion/useSnakeLiveCompanionRoom', async () => {
  const React = await import('react');
  const { buildSnakeLiveCatalog } = await import('../../../utils/snakeLiveCatalog');

  function roomId(source: LeagueBuilderMlbDraftSession): string {
    return `live:${source.id}`;
  }

  function liveClaims(source: LeagueBuilderMlbDraftSession) {
    const id = roomId(source);
    return (source.snakeCompanions?.claims ?? []).map((claim) => ({
      id: claim.claimId ?? `claim:${claim.deviceId}:${claim.teamId}`,
      roomId: id,
      requestKey: claim.claimId ?? `claim:${claim.deviceId}:${claim.teamId}`,
      deviceId: claim.deviceId,
      gmName: claim.gmName,
      teamId: claim.teamId,
      status: claim.status,
      revision: claim.claimVersion ?? 1,
      createdAt: source.createdDate,
      resolvedAt: claim.status === 'pending' ? null : source.lastModified,
    }));
  }

  function liveBoards(source: LeagueBuilderMlbDraftSession) {
    const id = roomId(source);
    return Object.fromEntries(Object.entries(source.seatBoards ?? {}).map(([teamId, record]) => [teamId, {
      roomId: id,
      teamId,
      boardRevision: record.revision,
      board: {
        ...structuredClone(record) as unknown as Record<string, unknown>,
        ...(mocks.liveBoardDesignSlots ? { designSlots: structuredClone(mocks.liveBoardDesignSlots) } : {}),
      },
      updatedByDeviceId: 'ipad-a',
      updatedAt: source.lastModified,
    }]));
  }

  function publicSession(source: LeagueBuilderMlbDraftSession): LeagueBuilderMlbDraftSession {
    const publicState = structuredClone(source);
    delete publicState.seatBoards;
    delete publicState.farmSeatBoards;
    return publicState;
  }

  return {
    useSnakeLiveCompanionRoom: () => {
      const [version, setVersion] = React.useState(0);
      const [disconnected, setDisconnected] = React.useState(false);
      const [snapshotSource, setSnapshotSource] = React.useState(
        () => mocks.currentSession as LeagueBuilderMlbDraftSession | null,
      );
      const catalogRef = React.useRef<{
        roomId: string;
        catalogRevision: number;
        catalog: Record<string, unknown>;
        createdAt: string;
      } | null>(null);
      const refresh = React.useCallback(async () => {
        await mocks.refresh();
        setSnapshotSource(mocks.currentSession as LeagueBuilderMlbDraftSession | null);
        setVersion((value) => value + 1);
      }, []);

      React.useEffect(() => {
        const refreshCurrent = async () => {
          setSnapshotSource(mocks.currentSession as LeagueBuilderMlbDraftSession | null);
          setVersion((value) => value + 1);
        };
        mocks.companionFreshnessRefresh = refreshCurrent;
        return () => {
          if (mocks.companionFreshnessRefresh === refreshCurrent) mocks.companionFreshnessRefresh = null;
        };
      }, []);

      const source = disconnected ? null : snapshotSource;
      if (source && !catalogRef.current) {
        const selectedIds = new Set(source.snakeSetup?.poolPlayerIds ?? pool.players.map((row) => row.id));
        catalogRef.current = {
          roomId: roomId(source),
          catalogRevision: 1,
          catalog: buildSnakeLiveCatalog({
            league,
            teams,
            players: mocks.data.players as Player[],
            registeredPool: {
              ...pool,
              players: pool.players.filter((row) => selectedIds.has(row.id)),
            },
            activeTeamIds: source.snakeSetup?.clubs.map((club) => club.teamId) ?? league.teamIds,
            activePoolPlayerIds: source.snakeSetup?.poolPlayerIds ?? [],
          }),
          createdAt: source.createdDate,
        };
      }
      const liveSnapshot = React.useMemo(() => {
        void version;
        if (!source) return null;
        const id = roomId(source);
        const claims = liveClaims(source);
        return {
          id,
          claims,
          room: {
            id,
            ownerUserId: 'owner',
            sessionId: source.id,
            roomCode: source.snakeCompanions?.roomCode ?? '',
            phase: 'MLB' as const,
            status: source.currentPickIndex >= source.pickOrder.length ? 'complete' as const : 'open' as const,
            publicRevision: source.revision ?? 0,
            publicState: {},
            hostDeviceId: 'host',
            createdAt: source.createdDate,
            updatedAt: source.lastModified,
          },
          publicSession: publicSession(source),
          boardsByTeamId: liveBoards(source),
          intents: [...mocks.liveIntents],
        };
      }, [source, version]);
      if (!source) {
        return {
          room: null,
          catalog: null,
          activeRoomId: null,
          publicSession: null,
          deviceId: disconnected ? null : 'ipad-a',
          claims: [],
          intents: [],
          boardsByTeamId: {},
          events: [],
          status: 'idle',
          subscriptionStatus: null,
          error: null,
          working: false,
          accessReady: false,
          resumedFromCapability: false,
          refresh,
          claimDesk: async () => [],
          writeBoard: async () => { throw new Error('THE LIVE ROOM IS NOT AVAILABLE.'); },
          submitIntent: async () => { throw new Error('THE LIVE ROOM IS NOT AVAILABLE.'); },
          disconnect: async () => setDisconnected(true),
        };
      }

      if (!liveSnapshot) throw new Error('THE LIVE ROOM IS NOT AVAILABLE.');
      const { id, claims, room } = liveSnapshot;

      return {
        room,
        catalog: catalogRef.current,
        activeRoomId: id,
        publicSession: liveSnapshot.publicSession,
        deviceId: 'ipad-a',
        claims,
        intents: liveSnapshot.intents,
        boardsByTeamId: liveSnapshot.boardsByTeamId,
        events: [],
        status: claims.some((claim) => claim.status === 'approved') ? 'live' : 'waiting',
        subscriptionStatus: 'SUBSCRIBED',
        error: null,
        working: false,
        accessReady: true,
        resumedFromCapability: mocks.liveAutoResumed,
        refresh,
        claimDesk: async (gmName: string, suppliedRoomCode: string) => {
          if (suppliedRoomCode !== room.roomCode) throw new Error('ROOM CODE DOES NOT MATCH.');
          setDisconnected(false);
          return claims.filter((claim) => claim.gmName === gmName);
        },
        writeBoard: async (input: {
          teamId: string;
          expectedBoardRevision: number;
          board: Record<string, unknown>;
        }) => {
          const saved = await mocks.patchBoard({
            deviceId: 'ipad-a',
            teamId: input.teamId,
            expectedBoardRevision: input.expectedBoardRevision,
            board: input.board,
          }) as LeagueBuilderMlbDraftSession;
          const record = saved.seatBoards?.[input.teamId];
          if (!record) throw new Error('THE PRIVATE BOARD WAS NOT SAVED.');
          setSnapshotSource((current) => current ? {
            ...current,
            seatBoards: { ...current.seatBoards, [input.teamId]: record },
          } : current);
          setVersion((value) => value + 1);
          return {
            roomId: id,
            teamId: input.teamId,
            boardRevision: record.revision,
            board: structuredClone(record) as unknown as Record<string, unknown>,
            updatedByDeviceId: 'ipad-a',
            updatedAt: saved.lastModified,
          };
        },
        submitIntent: async (input: {
          teamId: string;
          kind: 'pick' | 'trade';
          expectedRoomRevision?: number;
          payload: Record<string, unknown>;
          idempotencyKey?: string;
        }) => {
          mocks.liveIntentSequence += 1;
          const intent = {
            id: `intent:${mocks.liveIntentSequence}`,
            roomId: id,
            idempotencyKey: input.idempotencyKey ?? `intent:${mocks.liveIntentSequence}`,
            deviceId: 'ipad-a',
            teamId: input.teamId,
            kind: input.kind,
            status: 'pending' as const,
            intentRevision: 1,
            expectedRoomRevision: input.expectedRoomRevision ?? room.publicRevision,
            payload: structuredClone(input.payload),
            createdAt: source.lastModified,
            resolvedAt: null,
          };
          mocks.liveIntents.push(intent);
          setVersion((value) => value + 1);
          return intent;
        },
        disconnect: async () => {
          setDisconnected(true);
          setVersion((value) => value + 1);
        },
      };
    },
  };
});
vi.mock('../../utils/snakeSounds', () => ({
  loadSnakeSoundsEnabled: () => true,
  saveSnakeSoundsEnabled: vi.fn(),
  createSnakeSoundPlayer: () => ({ play: (sound: string) => mocks.soundEvents.push(sound) }),
}));
vi.mock('../../app/components/snake/desk/useSnakeSelectedConsequences', async () => {
  const model = await import('../../app/components/snake/desk/snakeDeskIntelligenceModel');
  return {
    useSnakeSelectedConsequences: (request: import('../../app/workers/snakeSelectedConsequences.worker').SnakeSelectedConsequencesWorkerRequest | null) => {
      if (!request) return { status: 'idle', consequenceByPlayerId: new Map() };
      const results = request.selectedPlayerIds.map((selectedPlayerId) => model.buildSelectedPlayerConsequence({
        ...request.input,
        selectedPlayerId,
      }));
      return {
        status: 'ready',
        consequenceByPlayerId: new Map(results.map((result) => [result.selectedPlayerId, result])),
      };
    },
  };
});
vi.mock('../../app/components/snake/desk/useSnakePickFinishSafety', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../app/components/snake/desk/useSnakePickFinishSafety')>();
  const seating = await import('../../../engines/snakeSeatingProof');
  return {
    ...actual,
    useSnakePickFinishSafety: (request: import('../../app/workers/snakePickFinish.worker').SnakePickFinishWorkerRequest | null) => {
      if (mocks.holdFinishSafety) return { status: 'pending', rows: new Map() };
      if (mocks.forceOpenFinishSafety) {
        const openRow = (playerId: string) => ({
          playerId,
          status: 'OPEN' as const,
          message: 'FINISH PROOF UNAVAILABLE.',
          finalSalary: null,
          finalTax: null,
          moneyLeft: null,
        });
        const rows = new Map((request?.candidatePlayerIds ?? []).map((playerId) => [playerId, openRow(playerId)]));
        const getKnownRow = rows.get.bind(rows);
        rows.get = (playerId: string) => getKnownRow(playerId) ?? openRow(playerId);
        return {
          status: 'ready',
          rows,
        };
      }
      if (mocks.forceBlockedFinishSafety) {
        const blockedRow = (playerId: string) => ({
          playerId,
          status: 'BLOCKED' as const,
          message: 'LOCAL FINISH CHECK WOULD BLOCK THIS PICK.',
          finalSalary: null,
          finalTax: null,
          moneyLeft: null,
        });
        const rows = new Map((request?.candidatePlayerIds ?? []).map((playerId) => [playerId, blockedRow(playerId)]));
        const getKnownRow = rows.get.bind(rows);
        rows.get = (playerId: string) => getKnownRow(playerId) ?? blockedRow(playerId);
        return { status: 'ready', rows };
      }
      if (!request) return { status: 'idle', rows: new Map() };
      const rows = seating.createSnakePickFinishSafetyClassifier(request)(request.candidatePlayerIds);
      return { status: 'ready', rows: new Map(rows.map((row) => [row.playerId, row])) };
    },
  };
});
vi.mock('../../app/components/snake/companion/companionFreshness', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../app/components/snake/companion/companionFreshness')>();
  return {
    ...actual,
    startCompanionFreshness: (input: { pullAndRefresh: () => void | Promise<void> }) => {
      mocks.companionFreshnessRefresh = input.pullAndRefresh;
      return () => { mocks.companionFreshnessRefresh = null; };
    },
  };
});
vi.mock('../../app/components/snake/snakeRoomFreshness', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../app/components/snake/snakeRoomFreshness')>();
  return {
    ...actual,
    startSnakeRoomFreshness: (input: { pullAndRefresh: () => void | Promise<void> }) => {
      mocks.mainFreshnessRefresh = input.pullAndRefresh;
      return () => { mocks.mainFreshnessRefresh = null; };
    },
  };
});
vi.mock('../../app/components/snake/desk/useSnakeAssistantBoard', async () => {
  const model = await import('../../app/components/snake/desk/snakeDeskIntelligenceModel');
  return {
    useSnakeAssistantBoard: (request: Parameters<typeof model.runSnakeAssistantBoardRequest>[0] | null) => {
      if (!request) return { status: 'idle', board: null, infeasibleReason: null };
      const snapshot = structuredClone(request);
      if (request.input.selectedPinPlayerId && mocks.assistantFailureReason) {
        mocks.assistantRequests.push(snapshot as unknown as { key: string; input: Record<string, unknown> });
        mocks.assistantResults.push({ status: 'unavailable', reason: mocks.assistantFailureReason });
        return {
          status: 'unavailable',
          board: null,
          infeasibleReason: mocks.assistantFailureReason === 'PIN_UNMATCHED' ? 'PIN_UNMATCHED' : null,
        };
      }
      const result = model.runSnakeAssistantBoardRequest(snapshot);
      mocks.assistantRequests.push(snapshot as unknown as { key: string; input: Record<string, unknown> });
      mocks.assistantResults.push(result as unknown as Record<string, unknown>);
      return result.status === 'ready'
        ? { status: 'ready', board: result.board, infeasibleReason: null }
        : { status: 'unavailable', board: null, infeasibleReason: null };
    },
  };
});
vi.mock('../../app/components/snake/desk/useSnakeRationalRisks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../app/components/snake/desk/useSnakeRationalRisks')>();
  return { ...actual, useSnakeRationalRisks: (request: unknown) => {
    mocks.riskRequests.push(request ? structuredClone(request) : null);
    if (!request || mocks.riskMode === 'NONE') {
      return { status: request ? 'unavailable' : 'idle', risks: null, scarcity: null };
    }
    const safe = mocks.riskMode === 'SAFE';
    return {
      status: 'ready',
      risks: [{
        playerId: 'dual', risk: safe ? 'SAFE_TO_WAIT' : 'AT_RISK', nextPick: 2,
        earliestSelectingPick: safe ? null : 1, latestSelectingPick: safe ? 2 : 1,
        latestSelectingPickIsAskingTurn: safe, interestedClubCount: safe ? 0 : 1,
        draftedAtPick: safe ? null : 1, rationalBuyersBeforeTurn: safe ? 0 : 1,
      }],
      scarcity: [{
        playerId: 'dual', role: 'C', viablePeopleLeft: 1, clubsStillNeeding: 1,
        lowestViableTrueCost: 10_000, highestViableTrueCost: 10_000,
        targetContextualWorth: 100, replacementPlayerId: null, replacementContextualWorth: null,
        contextualWorthDrop: null, replacementState: 'UNAVAILABLE',
      }],
    };
  } };
});
vi.mock('../../app/components/snake/desk/useSnakeGuideRecommendation', () => ({
  useSnakeGuideRecommendation: (request: unknown) => {
    if (request) mocks.guideRequests.push(structuredClone(request));
    if (!request || mocks.guideMode === 'NONE') return { status: request ? 'unavailable' : 'idle', proposal: null };
    if (mocks.guideMode === 'MALFORMED') return { status: 'unavailable', proposal: null };
    const typed = request as { input: { session: { revision: number } } };
    return {
      status: 'ready',
      proposal: {
        buyerTeamId: 'a', sellerTeamId: 'b', targetPick: 1,
        offerPickNumbers: [2, 3], receivePickNumbers: [1, 4],
        offerValue: 200, receiveValue: 200, sessionRevision: typed.input.session.revision,
      },
    };
  },
}));
vi.mock('../../app/components/snake/trade/tradeGuideModel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../app/components/snake/trade/tradeGuideModel')>();
  return {
    ...actual,
    guideForAskedPick: (input: Parameters<typeof actual.guideForAskedPick>[0]) => {
      mocks.manualGuideCalls.push(structuredClone(input));
      return mocks.manualGuidePromise ?? actual.guideForAskedPick(input);
    },
  };
});
vi.mock('../../../utils/leagueBuilderStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/leagueBuilderStorage')>();
  return {
    ...actual,
    getAllLeagueTemplates: vi.fn(async () => (mocks.freshData?.leagues ?? mocks.data.leagues ?? [])),
    getAllTeams: vi.fn(async () => (mocks.freshData?.teams ?? mocks.data.teams ?? [])),
    getAllPlayers: vi.fn(async () => (mocks.freshData?.players ?? mocks.data.players ?? [])),
    getMlbDraftSession: vi.fn(async () => mocks.currentSession),
    getRegisteredPool: vi.fn(async () => (
      mocks.freshData?.pool ?? await (mocks.data.getRegisteredPool as () => Promise<unknown>)()
    )),
    patchApprovedCompanionSeatBoard: (...args: unknown[]) => mocks.patchBoard(...args),
    patchMlbDraftSessionSnakeCompanions: vi.fn(),
    saveMlbDraftRoomSession: async (next: LeagueBuilderMlbDraftSession) => {
      mocks.currentSession = next;
      return mocks.mainSave(next);
    },
    updateMlbDraftSessionAtomically: async (
      _leagueId: string,
      _seasonNumber: number,
      update: (current: LeagueBuilderMlbDraftSession) => LeagueBuilderMlbDraftSession,
    ) => {
      const next = update(mocks.currentSession as LeagueBuilderMlbDraftSession);
      mocks.currentSession = next;
      return next;
    },
    getScoutProfilesForLeague: vi.fn(async () => []),
  };
});

import type {
  LeagueBuilderMlbDraftSession,
  LeagueTemplate,
  Player,
  RegisteredPool,
  SnakeBoardSlotId,
  SnakeSeatBoardRecord,
  Team,
} from '../../../utils/leagueBuilderStorage';
import { LUXURY_CAP_TABLES } from '../../../data/tierParams';
import { runSnakeAssistantBoardRequest } from '../../app/components/snake/desk/snakeDeskIntelligenceModel';
import SnakeCompanion from '../../app/pages/SnakeCompanion';
import SnakeDraftRoom from '../../app/pages/SnakeDraftRoom';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

function changedSlotCount(before: SnakeSeatBoardRecord, after: SnakeSeatBoardRecord): number {
  return (Object.keys(before.slots) as SnakeBoardSlotId[])
    .filter((slotId) => before.slots[slotId] !== after.slots[slotId]).length;
}

const league: LeagueTemplate = {
  id: 'companion-2b', name: 'Companion 2B', teamIds: ['a', 'b'], conferences: [], divisions: [],
  defaultRulesPreset: 'standard', draftFormat: 'snake', tier: 'standard', balanceMode: 'taxed', salaryCap: 10_000_000,
  createdDate: '2026-07-12', lastModified: '2026-07-12',
};
const teams: Team[] = ['a', 'b'].map((id) => ({
  id, name: `Club ${id.toUpperCase()}`, abbreviation: id.toUpperCase(), location: 'Test', nickname: 'Club',
  colors: { primary: '#234f32', secondary: '#f5d77a' }, stadium: 'Test Park', controlledBy: 'human',
  mlbArchetypeKey: id === 'a' ? 'bash-brothers' : 'whiteyball',
  farmArchetypeKey: id === 'a' ? 'web-gems' : 'bomba-squad',
  leagueIds: [league.id], createdDate: '2026-07-12', lastModified: '2026-07-12',
}));

function player(id: string, position: Player['primaryPosition'], secondaryPosition?: Player['secondaryPosition']): Player {
  const pitcher = ['SP', 'SP/RP', 'RP', 'CP'].includes(position);
  return {
    id, firstName: id, lastName: 'Player', gender: 'F', age: 25, bats: 'R', throws: 'R', primaryPosition: position, secondaryPosition,
    power: pitcher ? 20 : 60, contact: pitcher ? 20 : 60, speed: 60, fielding: 60, arm: 60,
    velocity: pitcher ? 60 : 0, junk: pitcher ? 60 : 0, accuracy: pitcher ? 60 : 0, arsenal: pitcher ? ['4F'] : [],
    overallGrade: 'B', personality: 'Competitive', chemistry: 'Competitive', morale: 50, mojo: 'Normal', fame: 0,
    salary: 10_000, leagueAssignments: [], hiddenPersonalityModifiers: { loyalty: 50, ambition: 50, resilience: 50, charisma: 50 },
    createdDate: '2026-07-12', lastModified: '2026-07-12', isCustom: true,
  } as Player;
}

const players: Player[] = [
  player('catcher', 'C'), player('dual', '1B', 'C'), player('backup-c', 'C'), player('one-b', '1B'),
  player('two-b', '2B'), player('three-b', '3B'), player('short', 'SS'), player('left', 'LF'), player('center', 'CF'), player('right', 'RF'),
  ...Array.from({ length: 4 }, (_, index) => player(`sp-${index + 1}`, 'SP')),
  ...Array.from({ length: 3 }, (_, index) => player(`rp-${index + 1}`, 'RP')),
  player('closer', 'CP'), player('swing', 'SP/RP'),
  ...Array.from({ length: 8 }, (_, index) => player(`flex-${index + 1}`, index % 2 === 0 ? 'CF' : '1B')),
];
const pool: RegisteredPool = {
  leagueId: league.id, tier: 'standard', balanceMode: 'taxed',
  players: players.map((row, index) => ({ id: row.id, iv: 10_000 + index * 100, salary: 10_000 + index * 100 })),
  tierCap: 10_000_000, luxuryCaps: LUXURY_CAP_TABLES.standard, pickValueChart: [], totalSlots: players.length,
  poolSurplusWarning: false, locked: true, lockedAt: 1,
};
const slots: Record<SnakeBoardSlotId, string> = {
  C: 'catcher', '1B': 'one-b', '2B': 'two-b', '3B': 'three-b', SS: 'short', LF: 'left', CF: 'center', RF: 'right', BACKUP_C: 'backup-c',
  SP1: 'sp-1', SP2: 'sp-2', SP3: 'sp-3', SP4: 'sp-4', RP1: 'rp-1', RP2: 'rp-2', RP3: 'rp-3', CP: 'closer',
  FLEX1: 'flex-1', FLEX2: 'flex-2', FLEX3: 'flex-3', FLEX4: 'flex-4', SWING: 'swing',
};

function board(prefix: string): SnakeSeatBoardRecord {
  return {
    slots: { ...slots },
    rankings: {
      global: ['dual', 'catcher', 'one-b', ...players.map((row) => row.id).filter((id) => !['dual', 'catcher', 'one-b'].includes(id))],
      byPosition: {
        C: ['catcher', 'dual', 'backup-c'], '1B': ['dual', 'one-b', 'flex-2'], '2B': ['two-b'], '3B': ['three-b'], SS: ['short'],
        LF: ['left'], CF: ['center', 'flex-1', 'flex-3', 'flex-5', 'flex-7'], RF: ['right'], SP: ['sp-1', 'sp-2', 'sp-3', 'sp-4'],
        'SP/RP': ['swing'], RP: ['rp-1', 'rp-2', 'rp-3'], CP: ['closer'],
      },
      frozenPlayerIds: [prefix],
    },
    revision: 1,
  };
}

function session(): LeagueBuilderMlbDraftSession {
  return {
    id: 'mlb:companion-2b:1', leagueId: league.id, seasonNumber: 1, seed: 'seed', workflowVersion: 'snake-v1', engineMethodVersion: 'snake-s1a',
    tier: 'standard', balanceMode: 'taxed', rounds: 2,
    pickOrder: [
      { round: 1, pick: 1, teamId: 'b' }, { round: 1, pick: 2, teamId: 'a' },
      { round: 2, pick: 3, teamId: 'a' }, { round: 2, pick: 4, teamId: 'b' },
    ], completedPicks: [], currentPickIndex: 0,
    revision: 4, seatBoards: { a: board('a-only'), b: board('b-only') },
    snakeSetup: {
      poolPlayerIds: players.map((row) => row.id),
      versionSelections: {},
      clubs: [
        { teamId: 'a', gmName: 'Alex', hotseat: false, archetypeId: 'bash-brothers', farmArchetypeId: 'web-gems' },
        { teamId: 'b', gmName: 'Blair', hotseat: false, archetypeId: 'whiteyball', farmArchetypeId: 'bomba-squad' },
      ],
      orderSeed: 'seed',
    },
    snakeCompanions: { roomCode: '4821', claims: [{ deviceId: 'ipad-a', gmName: 'Alex', teamId: 'a', status: 'approved' }] },
    createdDate: '2026-07-12', lastModified: '2026-07-12',
  };
}

function prepare(source = session(), activePlayers = players) {
  mocks.currentSession = source;
  mocks.data = {
    leagues: [league], teams, players: activePlayers, isLoading: false, error: null, refresh: mocks.refresh,
    getRegisteredPool: vi.fn(async () => pool),
    getMlbDraftSession: vi.fn(async () => mocks.currentSession as LeagueBuilderMlbDraftSession),
  };
  mocks.patchBoard.mockImplementation(async (input: {
    deviceId: string;
    teamId: string;
    board: SnakeSeatBoardRecord;
    expectedBoardRevision: number;
  }) => {
    const current = mocks.currentSession as LeagueBuilderMlbDraftSession;
    const claim = current.snakeCompanions?.claims.find((candidate) => (
      candidate.deviceId === input.deviceId
      && candidate.teamId === input.teamId
      && candidate.status === 'approved'
    ));
    if (!claim) throw new Error('MAIN-DEVICE APPROVAL IS REQUIRED.');
    if (current.currentPickIndex >= current.pickOrder.length) throw new Error('THIS DRAFT IS COMPLETE.');
    if (current.seatBoards?.[input.teamId]?.revision !== input.expectedBoardRevision) throw new Error('board revision changed');
    const saved = { ...current, seatBoards: { ...current.seatBoards, [input.teamId]: input.board }, revision: (current.revision ?? 0) + 1 };
    mocks.currentSession = saved;
    return saved;
  });
}

function selectMainTeam(teamId: string): void {
  fireEvent.change(screen.getByRole('combobox', { name: 'TEAM' }), { target: { value: teamId } });
}

function companionBoardSlot(slotId: SnakeBoardSlotId): HTMLElement {
  const row = screen.getByTestId('my-board-view').querySelector<HTMLElement>(`[data-board-slot="${slotId}"]`);
  expect(row).not.toBeNull();
  return row!;
}

function sessionWithDualAsSavedFirstBaseman(): LeagueBuilderMlbDraftSession {
  const source = session();
  const saved = source.seatBoards!.a;
  source.seatBoards = {
    ...source.seatBoards,
    a: {
      ...saved,
      slots: { ...saved.slots, '1B': 'dual' },
      rankings: {
        ...saved.rankings,
        byPosition: {
          ...saved.rankings.byPosition,
          '1B': ['dual', 'one-b', 'flex-2'],
        },
      },
    },
  };
  return source;
}

describe('SNAKE-MOCK-2B companion board parity', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('kbl-snake-companion-device-id', 'ipad-a');
    mocks.patchBoard.mockReset();
    mocks.freshData = null;
    mocks.refresh.mockReset().mockImplementation(async () => {
      if (mocks.freshData) mocks.data = { ...mocks.data, ...mocks.freshData };
    });
    mocks.assistantRequests.length = 0;
    mocks.assistantResults.length = 0;
    mocks.omitContextPlayerId = null;
    mocks.riskMode = 'NONE';
    mocks.riskRequests.length = 0;
    mocks.guideMode = 'NONE';
    mocks.assistantFailureReason = null;
    mocks.guideRequests.length = 0;
    mocks.manualGuideCalls.length = 0;
    mocks.manualGuidePromise = null;
    mocks.companionFreshnessRefresh = null;
    mocks.mainFreshnessRefresh = null;
    mocks.liveIntents.length = 0;
    mocks.liveIntentSequence = 0;
    mocks.liveAutoResumed = false;
    mocks.liveBoardDesignSlots = null;
    mocks.soundEvents.length = 0;
    mocks.forceOpenFinishSafety = false;
    mocks.forceBlockedFinishSafety = false;
    mocks.holdFinishSafety = false;
    mocks.mainSave.mockReset().mockImplementation(async (next) => next);
    prepare();
  });
  afterEach(() => cleanup());

  test('an auto-resumed approved desk stays covered until live refresh succeeds', async () => {
    mocks.liveAutoResumed = true;
    mocks.refresh.mockRejectedValueOnce(new Error('LIVE REFRESH FAILED.'));
    render(<SnakeCompanion />);

    expect(await screen.findByTestId('snake-companion-covered')).toBeInTheDocument();
    expect(screen.queryByTestId('snake-companion-frame')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RETURN TO DESK' }));
    await waitFor(() => expect(screen.getByTestId('snake-companion-covered')).toHaveTextContent('LIVE REFRESH FAILED.'));
    expect(screen.queryByTestId('snake-companion-frame')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'RETURN TO DESK' }));
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
  });

  test('a privacy-cover storage read failure keeps an approved desk covered', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('STORAGE IS UNAVAILABLE.');
    });
    try {
      render(<SnakeCompanion />);
      expect(await screen.findByTestId('snake-companion-covered')).toBeInTheDocument();
      expect(screen.queryByTestId('snake-companion-frame')).not.toBeInTheDocument();
    } finally {
      getItem.mockRestore();
    }
  });

  test('recurring pulls leave the frozen player and pool authority in memory', async () => {
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    const freshPlayers = players.map((row) => row.id === 'dual'
      ? { ...row, firstName: 'Fresh', lastName: 'Authority' }
      : row);
    mocks.freshData = { leagues: [league], teams, players: freshPlayers, pool };
    const refreshesBefore = mocks.refresh.mock.calls.length;

    await act(async () => { await mocks.companionFreshnessRefresh?.(); });

    expect(mocks.refresh.mock.calls.length).toBe(refreshesBefore);
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    expect(screen.queryByText(/Fresh Authority/i)).not.toBeInTheDocument();
    expect(document.body).toHaveTextContent('dual Player');
  });

  test('an already-open companion adopts a standalone board revision even when room metadata is unchanged', async () => {
    const source = mocks.currentSession as LeagueBuilderMlbDraftSession;
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    const freshBoard = {
      ...structuredClone(source.seatBoards!.a),
      rankings: {
        ...structuredClone(source.seatBoards!.a.rankings),
        global: ['catcher', ...source.seatBoards!.a.rankings.global.filter((id) => id !== 'catcher')],
      },
      revision: 2,
    };
    mocks.currentSession = {
      ...source,
      seatBoards: { ...source.seatBoards, a: freshBoard },
    };

    await act(async () => { await mocks.companionFreshnessRefresh?.(); });
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    const firstMove = screen.getAllByRole('button', { name: /^Move .* down$/ })[0].getAttribute('aria-label');
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    expect(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]).not.toHaveAttribute('aria-label', firstMove);
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    expect(mocks.patchBoard).not.toHaveBeenCalled();

    await waitFor(() => expect(mocks.patchBoard).toHaveBeenCalledTimes(1));
    expect(mocks.patchBoard.mock.calls[0][0]).toMatchObject({
      teamId: 'a',
      expectedBoardRevision: 2,
    });
  });

  test('an already-open companion advances the live pick and removes the drafted player on its recurring pull', async () => {
    const source = structuredClone(mocks.currentSession as LeagueBuilderMlbDraftSession);
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    expect(screen.getByRole('button', { name: /SELECT DUAL PLAYER/ })).toBeInTheDocument();

    mocks.currentSession = {
      ...source,
      completedPicks: [{
        round: 1,
        pick: 1,
        teamId: 'b',
        playerId: 'dual',
        settledSalary: 10_100,
        marginalTax: 0,
      }],
      currentPickIndex: 1,
      revision: source.revision + 1,
      lastModified: '2026-07-12T00:00:01.000Z',
    };

    await act(async () => { await mocks.companionFreshnessRefresh?.(); });

    await waitFor(() => expect(screen.getByText('CLUB B SELECTED DUAL PLAYER')).toBeInTheDocument());
    expect(screen.getByTestId('companion-live-strip')).toHaveTextContent('CLUB A · PICK 2');
    expect(screen.queryByRole('button', { name: /SELECT DUAL PLAYER/ })).not.toBeInTheDocument();
  });

  test('plays the request cue after sending a pick and the draft cue after the public pick advances', async () => {
    const source = session();
    source.completedPicks = [{
      round: 1, pick: 1, teamId: 'b', playerId: 'dual', settledSalary: 10_100, marginalTax: 0,
    }];
    source.currentPickIndex = 1;
    mocks.forceOpenFinishSafety = true;
    prepare(source);
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    expect(mocks.soundEvents).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    fireEvent.click(screen.getByRole('button', { name: /SELECT ONE-B PLAYER/ }));
    const sendPick = await screen.findByRole('button', { name: 'SEND PICK TO HOTSEAT' });
    await waitFor(() => expect(sendPick).toBeEnabled());
    fireEvent.click(sendPick);

    await waitFor(() => expect(mocks.liveIntents).toHaveLength(1));
    expect(mocks.soundEvents).toEqual(['request']);

    mocks.currentSession = {
      ...source,
      completedPicks: [
        ...source.completedPicks,
        { round: 1, pick: 2, teamId: 'a', playerId: 'one-b', settledSalary: 10_300, marginalTax: 0 },
      ],
      currentPickIndex: 2,
      revision: source.revision + 1,
    };
    await act(async () => { await mocks.companionFreshnessRefresh?.(); });

    await waitFor(() => expect(mocks.soundEvents).toEqual(['request', 'drafted']));
  });

  test('the first club can send pick one while its local finish check is still calculating', async () => {
    const source = session();
    source.snakeCompanions = {
      roomCode: '4821',
      claims: [{ deviceId: 'ipad-a', gmName: 'Blair', teamId: 'b', status: 'approved' }],
    };
    mocks.holdFinishSafety = true;
    prepare(source);

    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    fireEvent.click(screen.getByRole('button', { name: /SELECT DUAL PLAYER/ }));

    const sendPick = await screen.findByRole('button', { name: 'SEND PICK TO HOTSEAT' });
    expect(sendPick).toBeEnabled();
    fireEvent.click(sendPick);

    await waitFor(() => expect(mocks.liveIntents).toHaveLength(1));
    expect(mocks.liveIntents[0]).toMatchObject({
      teamId: 'b',
      kind: 'pick',
      payload: { playerId: 'dual', pick: 1, sessionRevision: 4 },
    });
  });

  test('a local blocked forecast warns the companion but leaves the Hotseat request available', async () => {
    const source = session();
    source.completedPicks = [{
      round: 1, pick: 1, teamId: 'b', playerId: 'dual', settledSalary: 10_100, marginalTax: 0,
    }];
    source.currentPickIndex = 1;
    source.revision += 1;
    mocks.forceBlockedFinishSafety = true;
    prepare(source);

    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    fireEvent.click(screen.getByRole('button', { name: /SELECT ONE-B PLAYER/ }));

    expect(screen.getByText('LOCAL FINISH CHECK WOULD BLOCK THIS PICK.')).toBeInTheDocument();
    const sendPick = screen.getByRole('button', { name: 'SEND PICK TO HOTSEAT' });
    expect(sendPick).toBeEnabled();
    fireEvent.click(sendPick);

    await waitFor(() => expect(mocks.liveIntents).toHaveLength(1));
    expect(mocks.liveIntents[0]).toMatchObject({
      teamId: 'a',
      kind: 'pick',
      payload: { playerId: 'one-b', pick: 2, sessionRevision: 5 },
    });
  });

  test('a rival public pick removes the player from the displayed board without a private write', async () => {
    const source = sessionWithDualAsSavedFirstBaseman();
    prepare(source);
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    expect(companionBoardSlot('1B')).toHaveTextContent('DUAL PLAYER');

    mocks.currentSession = {
      ...source,
      completedPicks: [{
        round: 1, pick: 1, teamId: 'b', playerId: 'dual', settledSalary: 10_100, marginalTax: 0,
      }],
      currentPickIndex: 1,
      revision: source.revision + 1,
    };
    await act(async () => { await mocks.companionFreshnessRefresh?.(); });

    await waitFor(() => expect(companionBoardSlot('1B')).toHaveTextContent('ONE-B PLAYER'));
    expect(companionBoardSlot('1B')).not.toHaveTextContent('DUAL PLAYER');
    expect(mocks.patchBoard).not.toHaveBeenCalled();
    expect(source.seatBoards!.a.slots['1B']).toBe('dual');
  });

  test('an own public pick joins the displayed roster without a private write', async () => {
    const source = session();
    source.completedPicks = [{
      round: 1, pick: 2, teamId: 'a', playerId: 'dual', settledSalary: 10_100, marginalTax: 0,
    }];
    source.currentPickIndex = 2;
    prepare(source);
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();

    const rosterRows = [...screen.getByTestId('my-board-view').querySelectorAll<HTMLElement>('[data-board-state="ROSTER"]')];
    expect(rosterRows.some((row) => row.textContent?.includes('DUAL PLAYER'))).toBe(true);
    expect(Object.values(source.seatBoards!.a.slots)).not.toContain('dual');
    expect(mocks.patchBoard).not.toHaveBeenCalled();
  });

  test('a public correction restores the saved player in the displayed board', async () => {
    const saved = sessionWithDualAsSavedFirstBaseman();
    const drafted = {
      ...saved,
      completedPicks: [{
        round: 1, pick: 1, teamId: 'b', playerId: 'dual', settledSalary: 10_100, marginalTax: 0,
      }],
      currentPickIndex: 1,
      revision: saved.revision + 1,
    };
    prepare(drafted);
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    expect(companionBoardSlot('1B')).toHaveTextContent('ONE-B PLAYER');

    mocks.currentSession = {
      ...drafted,
      completedPicks: [],
      currentPickIndex: 0,
      revision: drafted.revision + 1,
    };
    await act(async () => { await mocks.companionFreshnessRefresh?.(); });

    await waitFor(() => expect(companionBoardSlot('1B')).toHaveTextContent('DUAL PLAYER'));
    expect(mocks.patchBoard).not.toHaveBeenCalled();
  });

  test('a correction restores the saved player after one user edit and public refreshes add no write', async () => {
    const saved = sessionWithDualAsSavedFirstBaseman();
    const drafted = {
      ...saved,
      completedPicks: [{
        round: 1, pick: 1, teamId: 'b', playerId: 'dual', settledSalary: 10_100, marginalTax: 0,
      }],
      currentPickIndex: 1,
      revision: saved.revision + 1,
    };
    prepare(drafted);
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    expect(companionBoardSlot('1B')).toHaveTextContent('ONE-B PLAYER');

    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(mocks.patchBoard).toHaveBeenCalledTimes(1));
    const storedEdit = mocks.patchBoard.mock.calls[0][0].board as SnakeSeatBoardRecord;
    expect(storedEdit.slots['1B']).toBe('dual');

    const editedPublic = mocks.currentSession as LeagueBuilderMlbDraftSession;
    mocks.currentSession = {
      ...editedPublic,
      completedPicks: [],
      currentPickIndex: 0,
      revision: (editedPublic.revision ?? 0) + 1,
    };
    await act(async () => { await mocks.companionFreshnessRefresh?.(); });

    fireEvent.click(screen.getByRole('button', { name: 'MY BOARD' }));
    await waitFor(() => expect(companionBoardSlot('1B')).toHaveTextContent('DUAL PLAYER'));
    expect(mocks.patchBoard).toHaveBeenCalledTimes(1);
  });

  test('an unrequested player-pool row never inherits another player risk calculation', async () => {
    mocks.riskMode = 'SAFE';
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    fireEvent.click(screen.getByRole('button', { name: 'NEXT' }));

    const unrequested = screen.getByRole('button', { name: /SELECT FLEX-8 PLAYER/i });
    expect(unrequested).not.toHaveTextContent('CALCULATING');
    expect(unrequested).not.toHaveTextContent('RISK UNAVAILABLE');
  });

  test('an approved off-clock companion refits only its plan and can undo the last reorder exactly', async () => {
    const originalA = structuredClone((mocks.currentSession as LeagueBuilderMlbDraftSession).seatBoards!.a);
    const originalB = structuredClone((mocks.currentSession as LeagueBuilderMlbDraftSession).seatBoards!.b);
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    expect(screen.getByTestId('companion-private-roster-alignment')).toHaveTextContent(/ARCHETYPE ALIGNMENT · (STRONG|SOLID|WEAK)/);
    expect(screen.getByTestId('companion-private-roster-alignment')).toHaveTextContent(/ROOM \d\/2 · FAN [+-]?\d/);
    expect(document.body.textContent).not.toMatch(/loyalty|ambition|resilience|charisma|hidden personality/i);
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    expect(screen.getByRole('heading', { name: 'OVERALL RANKINGS' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(mocks.patchBoard).toHaveBeenCalledTimes(1));
    expect(mocks.patchBoard.mock.calls[0][0]).toMatchObject({ teamId: 'a', expectedBoardRevision: originalA.revision });
    const afterOverall = mocks.patchBoard.mock.calls[0][0].board as SnakeSeatBoardRecord;
    expect(afterOverall.slots).not.toEqual(originalA.slots);
    expect(new Set(Object.values(afterOverall.slots))).toHaveLength(22);
    const firstChangedCount = changedSlotCount(originalA, afterOverall);
    expect(firstChangedCount).toBeGreaterThan(0);
    expect(screen.getByTestId('companion-board-update-banner'))
      .toHaveTextContent(`MY BOARD UPDATED — ${firstChangedCount} SLOT${firstChangedCount === 1 ? '' : 'S'} CHANGED.`);

    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    expect(screen.getByText('DUAL PLAYER')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(mocks.patchBoard).toHaveBeenCalledTimes(2));
    expect(mocks.patchBoard.mock.calls[1][0]).toMatchObject({ teamId: 'a', expectedBoardRevision: afterOverall.revision });
    const afterPosition = mocks.patchBoard.mock.calls[1][0].board as SnakeSeatBoardRecord;
    expect(afterPosition.rankings.byPosition?.C?.slice(0, 2)).toEqual(['dual', 'catcher']);
    expect(afterPosition.rankings).not.toEqual(afterOverall.rankings);
    expect(afterPosition.revision).toBe(afterOverall.revision + 1);
    expect(afterPosition.slots).toEqual(afterOverall.slots);
    expect(new Set(Object.values(afterPosition.slots))).toHaveLength(22);
    expect((mocks.currentSession as LeagueBuilderMlbDraftSession).seatBoards?.b).toEqual(originalB);
    expect(await screen.findByTestId('companion-board-update-banner'))
      .toHaveTextContent('MY BOARD UPDATED — 0 SLOTS CHANGED.');

    fireEvent.click(screen.getByRole('button', { name: 'UNDO BOARD UPDATE' }));
    await waitFor(() => expect(mocks.patchBoard).toHaveBeenCalledTimes(3));
    expect(mocks.patchBoard.mock.calls[2][0]).toMatchObject({ teamId: 'a', expectedBoardRevision: afterPosition.revision });
    const restored = mocks.patchBoard.mock.calls[2][0].board as SnakeSeatBoardRecord;
    expect(restored.slots).toEqual(afterOverall.slots);
    expect(restored.rankings).toEqual(afterOverall.rankings);
    expect(restored.revision).toBe(afterPosition.revision + 1);
    expect((mocks.currentSession as LeagueBuilderMlbDraftSession).seatBoards?.b).toEqual(originalB);
    expect(screen.queryByRole('button', { name: 'UNDO BOARD UPDATE' })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\b(?:he|she|him|her)\b/i);
  });

  test('uses private design slots for advice and preserves them through board edits', async () => {
    mocks.liveBoardDesignSlots = [{ slotId: '1B', kind: 'pos', position: '1B' }];
    prepare();
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();

    await waitFor(() => expect(mocks.assistantRequests.length).toBeGreaterThan(0));
    const assistantInput = mocks.assistantRequests.at(-1)!.input;
    expect(assistantInput.slots).toEqual(expect.arrayContaining([
      expect.objectContaining({ slotId: '1B', kind: 'pos', position: '1B' }),
    ]));

    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(mocks.patchBoard).toHaveBeenCalled());
    expect(mocks.patchBoard.mock.calls[0][0].board).toMatchObject({
      designSlots: [{ slotId: '1B', kind: 'pos', position: '1B' }],
    });
  });

  test('fails money, chemistry, and persistence closed for a complete nine-hitter, thirteen-pitcher refit', async () => {
    const source = session();
    source.snakeSetup!.poolPlayerIds = Object.values(slots);
    const illegalPlayers = players.map((row) => (
      ['flex-1', 'flex-2', 'flex-3', 'flex-4'].includes(row.id) ? player(row.id, 'SP') : row
    ));
    const before = structuredClone(source);
    prepare(source, illegalPlayers);
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();

    expect(screen.queryByTestId('plan-truth-strip')).not.toBeInTheDocument();
    expect(screen.queryByTestId('selected-player-consequence')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'KEEP ON MY BOARD' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);

    expect(await screen.findByText(/MY BOARD COULD NOT REFIT/)).toBeInTheDocument();
    expect(mocks.patchBoard).not.toHaveBeenCalled();
    expect(mocks.currentSession).toEqual(before);
  });

  test('assistant viewing and optimize never invent Revert; stale companion Keep fails closed', async () => {
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'KEEP ON MY BOARD' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'ASST GM BOARD' }));
    fireEvent.click(screen.getByRole('button', { name: 'OPTIMIZE AROUND' }));
    expect(screen.getByTestId('assistant-optimization-result')).toHaveTextContent('OPTIMIZED FOR');
    expect(screen.queryByRole('button', { name: 'REVERT' })).not.toBeInTheDocument();
    expect(mocks.patchBoard).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'MY BOARD' }));
    fireEvent.click(screen.getByRole('button', { name: 'OPTIMIZE AROUND' }));
    expect(screen.getByRole('button', { name: 'ASST GM BOARD' })).toHaveAttribute('aria-pressed', 'true');
    const keep = await screen.findByRole('button', { name: 'KEEP ON MY BOARD' });
    const current = mocks.currentSession as LeagueBuilderMlbDraftSession;
    mocks.currentSession = {
      ...current,
      seatBoards: {
        ...current.seatBoards,
        a: { ...current.seatBoards!.a, revision: current.seatBoards!.a.revision + 1 },
      },
    };
    fireEvent.click(keep);

    expect(await screen.findByText('THE DRAFT MOVED ON — REFRESH')).toBeInTheDocument();
    expect(mocks.patchBoard).toHaveBeenCalledTimes(1);
    expect(mocks.refresh).toHaveBeenCalled();
  });

  test('successful guarded companion Keep persists the exact preview and reloads as already on My Board', async () => {
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    const original = structuredClone((mocks.currentSession as LeagueBuilderMlbDraftSession).seatBoards!.a);

    fireEvent.click(await screen.findByRole('button', { name: 'KEEP ON MY BOARD' }));

    await waitFor(() => expect(mocks.patchBoard).toHaveBeenCalledTimes(1));
    const write = mocks.patchBoard.mock.calls[0][0] as {
      deviceId: string;
      teamId: string;
      expectedBoardRevision: number;
      board: SnakeSeatBoardRecord;
    };
    expect(write).toMatchObject({ deviceId: 'ipad-a', teamId: 'a', expectedBoardRevision: original.revision });
    expect(Object.values(write.board.slots)).toContain('dual');
    expect(write.board.revision).toBe(original.revision + 1);
    expect(await screen.findByText('ON MY BOARD')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'KEEP ON MY BOARD' })).not.toBeInTheDocument();
  });

  test('stores and restores zero-interest through the approved companion seat only', async () => {
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    const original = structuredClone((mocks.currentSession as LeagueBuilderMlbDraftSession).seatBoards!.a);

    fireEvent.click(await screen.findByRole('button', { name: 'ZERO INTEREST' }));
    await waitFor(() => expect(mocks.patchBoard).toHaveBeenCalledTimes(1));
    const excluded = mocks.patchBoard.mock.calls[0][0] as {
      deviceId: string;
      teamId: string;
      expectedBoardRevision: number;
      board: SnakeSeatBoardRecord;
    };
    expect(excluded).toMatchObject({ deviceId: 'ipad-a', teamId: 'a', expectedBoardRevision: original.revision });
    expect(excluded.board.rankings.zeroInterestPlayerIds).toEqual(['dual']);
    expect(excluded.board.slots).toEqual(original.slots);

    fireEvent.click(await screen.findByRole('button', { name: 'RESTORE INTEREST' }));
    await waitFor(() => expect(mocks.patchBoard).toHaveBeenCalledTimes(2));
    const restored = mocks.patchBoard.mock.calls[1][0] as {
      expectedBoardRevision: number;
      board: SnakeSeatBoardRecord;
    };
    expect(restored.expectedBoardRevision).toBe(excluded.board.revision);
    expect(restored.board.rankings.zeroInterestPlayerIds).toEqual([]);
    expect(restored.board.slots).toEqual(original.slots);
  });

  test('actual main and companion page requests match, and Optimize pins the selected player through the derived board', async () => {
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    await waitFor(() => expect(mocks.assistantRequests.length).toBeGreaterThan(0));
    const companionRequest = structuredClone(mocks.assistantRequests.at(-1)!);
    expect(companionRequest.input.selectedPinPlayerId).toBeNull();
    const invalidCapsRequest = structuredClone(companionRequest) as Parameters<typeof runSnakeAssistantBoardRequest>[0];
    invalidCapsRequest.input.baseCaps = [];
    expect(runSnakeAssistantBoardRequest(invalidCapsRequest)).toMatchObject({
      status: 'unavailable',
      reason: 'INVALID_NUMERIC_INPUT',
    });

    fireEvent.click(screen.getByRole('button', { name: 'OPTIMIZE AROUND' }));
    await waitFor(() => expect(mocks.assistantRequests.at(-1)?.input.selectedPinPlayerId).toBe('dual'));
    expect(screen.getByTestId('assistant-optimization-result')).toHaveTextContent('OPTIMIZED FOR');
    const optimized = mocks.assistantResults.at(-1) as {
      status: string;
      reason?: string;
      board?: { playerIds: string[]; slots: Array<{ playerId: string; pinned: boolean }> };
    };
    expect(optimized.reason).toBeUndefined();
    expect(optimized.status).toBe('ready');
    expect(optimized.board?.playerIds).toContain('dual');
    expect(optimized.board?.slots.find((slot) => slot.playerId === 'dual')?.pinned).toBe(true);

    cleanup();
    mocks.assistantRequests.length = 0;
    mocks.assistantResults.length = 0;
    localStorage.removeItem('kbl-snake-companion-device-covered');
    prepare(session());
    render(<MemoryRouter initialEntries={[`/snake-room?leagueId=${league.id}&practice=1`]}><SnakeDraftRoom /></MemoryRouter>);
    expect(await screen.findByTestId('snake-draft-room')).toBeInTheDocument();
    selectMainTeam('a');
    fireEvent.click(await screen.findByRole('button', { name: 'REVEAL CLUB A SEAT' }));
    await screen.findByTestId('private-draft-desk');
    await waitFor(() => expect(mocks.assistantRequests.some((request) => request.input.teamId === 'a')).toBe(true));
    const mainRequest = mocks.assistantRequests.filter((request) => request.input.teamId === 'a').at(-1)!;
    expect(mainRequest.input).toMatchObject(companionRequest.input);
    expect(JSON.stringify(companionRequest.input)).not.toContain('hiddenPersonalityModifiers');
  }, 10_000);

  test.each([
    ['SAFE_TO_WAIT', 'SAFE TO WAIT'],
    ['TAKE_NOW', 'TAKE NOW'],
    ['PASS', 'PASS'],
  ] as const)('main and companion render the same noninteractive %s decision from current facts', async (decision, label) => {
    const source = session();
    if (decision === 'TAKE_NOW') {
      source.pickOrder = [
        { round: 1, pick: 1, teamId: 'a' }, { round: 1, pick: 2, teamId: 'b' },
        { round: 2, pick: 3, teamId: 'b' }, { round: 2, pick: 4, teamId: 'a' },
      ];
    }
    mocks.riskMode = decision === 'SAFE_TO_WAIT' ? 'SAFE' : decision === 'TAKE_NOW' ? 'URGENT' : 'NONE';
    mocks.assistantFailureReason = decision === 'PASS' ? 'PIN_UNMATCHED' : null;
    prepare(source);
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    if (decision === 'PASS') fireEvent.click(screen.getByRole('button', { name: 'OPTIMIZE AROUND' }));
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    expect(await screen.findByTestId('selected-player-decision')).toHaveTextContent(label);
    expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();

    cleanup();
    mocks.assistantRequests.length = 0;
    mocks.assistantResults.length = 0;
    prepare(structuredClone(source));
    render(<MemoryRouter initialEntries={[`/snake-room?leagueId=${league.id}&practice=1`]}><SnakeDraftRoom /></MemoryRouter>);
    expect(await screen.findByTestId('snake-draft-room')).toBeInTheDocument();
    selectMainTeam('a');
    fireEvent.click(await screen.findByRole('button', { name: 'REVEAL CLUB A SEAT' }));
    await screen.findByTestId('private-draft-desk');
    if (decision === 'PASS') fireEvent.click(await screen.findByRole('button', { name: 'OPTIMIZE AROUND' }));
    fireEvent.click(await screen.findByRole('button', { name: 'PLAYER POOL' }));
    expect(await screen.findByTestId('selected-player-decision')).toHaveTextContent(label);
    expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();
  }, 15_000);

  test('main and companion use the same current trade decision, exact prefill, public proof, and zero automatic writes', async () => {
    mocks.riskMode = 'URGENT';
    mocks.guideMode = 'READY';
    const source = session();
    prepare(source);
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    const companionTrade = await screen.findByRole('button', { name: 'TRADE TO #1' });
    const companionRequest = structuredClone(mocks.guideRequests.at(-1)!);
    mocks.patchBoard.mockClear();
    mocks.mainSave.mockClear();
    mocks.manualGuideCalls.length = 0;
    fireEvent.click(companionTrade);
    expect(screen.getByLabelText('WHAT WOULD IT COST TO REACH PICK N?')).toHaveValue(1);
    expect(screen.getByText('OFFER 2+3; RECEIVE 1+4 — guide-matched and legal now.')).toBeInTheDocument();
    expect(mocks.manualGuideCalls).toHaveLength(0);
    expect(mocks.patchBoard).not.toHaveBeenCalled();
    expect(mocks.mainSave).not.toHaveBeenCalled();
    expect(screen.getByTestId('companion-team-header')).toHaveTextContent('CLUB A');
    expect((companionRequest as { input: { seatingProofInput: { clubs: Array<{ teamId: string }> } } })
      .input.seatingProofInput.clubs.map((club) => club.teamId).sort()).toEqual(['a', 'b']);

    cleanup();
    mocks.guideRequests.length = 0;
    mocks.manualGuideCalls.length = 0;
    prepare(structuredClone(source));
    render(<MemoryRouter initialEntries={[`/snake-room?leagueId=${league.id}&practice=1`]}><SnakeDraftRoom /></MemoryRouter>);
    expect(await screen.findByTestId('snake-draft-room')).toBeInTheDocument();
    selectMainTeam('a');
    fireEvent.click(await screen.findByRole('button', { name: 'REVEAL CLUB A SEAT' }));
    await screen.findByTestId('private-draft-desk');
    fireEvent.click(await screen.findByRole('button', { name: 'PLAYER POOL' }));
    const mainTrade = await screen.findByRole('button', { name: 'TRADE TO #1' });
    const mainRequest = structuredClone(mocks.guideRequests.at(-1)!);
    mocks.patchBoard.mockClear();
    mocks.mainSave.mockClear();
    fireEvent.click(mainTrade);
    expect(screen.getByLabelText('WHAT WOULD IT COST TO REACH PICK N?')).toHaveValue(1);
    expect(screen.getByText('OFFER 2+3; RECEIVE 1+4 — guide-matched and legal now.')).toBeInTheDocument();
    expect(mocks.manualGuideCalls).toHaveLength(0);
    expect(mocks.patchBoard).not.toHaveBeenCalled();
    expect(mocks.mainSave).not.toHaveBeenCalled();
    const companionInput = structuredClone((companionRequest as { input: Record<string, unknown> }).input);
    const mainInput = structuredClone((mainRequest as { input: Record<string, unknown> }).input);
    const companionPublicSession = companionInput.session as { revision: number };
    const mainPublicSession = mainInput.session as { revision: number };
    expect(companionPublicSession.revision).toBe(4);
    expect(mainPublicSession.revision).toBe((mocks.currentSession as LeagueBuilderMlbDraftSession).revision);
    companionPublicSession.revision = mainPublicSession.revision;
    const {
      seatingProofInput: companionProof,
      ...companionDecisionInput
    } = companionInput as { seatingProofInput: { pool: unknown; clubs: Array<{ teamId: string }> } } & Record<string, unknown>;
    const {
      seatingProofInput: mainProof,
      ...mainDecisionInput
    } = mainInput as { seatingProofInput: { pool: unknown; clubs: Array<{ teamId: string }> } } & Record<string, unknown>;
    expect(mainDecisionInput).toEqual(companionDecisionInput);
    expect(mainProof.pool).toEqual(companionProof.pool);
    expect(mainProof.clubs.map((club) => club.teamId).sort()).toEqual(
      companionProof.clubs.map((club) => club.teamId).sort(),
    );
  }, 15_000);

  test('cover nulls the companion rational-risk request and same-seat return cannot resurrect ready pre-cover advice', async () => {
    mocks.riskMode = 'URGENT';
    mocks.guideMode = 'READY';
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    expect(await screen.findByRole('button', { name: 'TRADE TO #1' })).toBeInTheDocument();
    expect(mocks.riskRequests.at(-1)).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'COVER THIS DEVICE' }));
    expect(await screen.findByTestId('snake-companion-covered')).toBeInTheDocument();
    expect(mocks.riskRequests.at(-1)).toBeNull();

    mocks.riskMode = 'NONE';
    fireEvent.click(screen.getByRole('button', { name: 'RETURN TO DESK' }));
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    expect(screen.queryByTestId('selected-player-decision')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /TRADE TO/ })).not.toBeInTheDocument();
  }, 15_000);

  test('missing companion ticker identities use exact neutral copy and never expose internal ids', async () => {
    const source = session();
    const missingPlayerId = 'companion-internal-player-77';
    source.completedPicks = [{
      round: 1,
      pick: 1,
      teamId: 'a',
      playerId: missingPlayerId,
      settledSalary: 10_000,
      marginalTax: 0,
    }];
    source.currentPickIndex = 1;
    prepare(source);
    render(<SnakeCompanion />);

    expect(await screen.findByText('CLUB A SELECTED UNKNOWN PLAYER')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(missingPlayerId);
    expect(document.body.innerHTML).not.toContain(missingPlayerId);
  });

  test('companion keeps an own pick on the private board with team branding and removes it from the pool', async () => {
    const source = session();
    source.completedPicks = [
      { round: 1, pick: 1, teamId: 'b', playerId: 'dual', settledSalary: 10_100, marginalTax: 0 },
      { round: 1, pick: 2, teamId: 'a', playerId: 'closer', settledSalary: 11_700, marginalTax: 0 },
    ];
    source.currentPickIndex = 2;
    prepare(source);
    render(<SnakeCompanion />);

    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    const committed = screen.getByRole('button', { name: /SELECT CLOSER PLAYER/ });
    expect(committed.closest('[data-board-state]')).toHaveAttribute('data-board-state', 'ROSTER');
    expect(committed).toHaveTextContent('ROSTER');
    expect(committed).toHaveStyle({
      borderLeftColor: '#234f32',
      borderLeftWidth: '8px',
      boxShadow: 'inset 0 -3px 0 #f5d77a',
    });

    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    expect(screen.queryByRole('button', { name: /SELECT CLOSER PLAYER/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /SELECT DUAL PLAYER/ })).not.toBeInTheDocument();
  });

  test('generic assistant failure and malformed guide state remain neutral on both pages', async () => {
    mocks.riskMode = 'URGENT';
    mocks.guideMode = 'MALFORMED';
    mocks.assistantFailureReason = 'INSOLVENT_BOARD';
    const source = session();
    prepare(source);
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'OPTIMIZE AROUND' }));
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    expect(screen.queryByTestId('selected-player-decision')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /TRADE TO/ })).not.toBeInTheDocument();

    cleanup();
    prepare(structuredClone(source));
    render(<MemoryRouter initialEntries={[`/snake-room?leagueId=${league.id}&practice=1`]}><SnakeDraftRoom /></MemoryRouter>);
    expect(await screen.findByTestId('snake-draft-room')).toBeInTheDocument();
    selectMainTeam('a');
    fireEvent.click(await screen.findByRole('button', { name: 'REVEAL CLUB A SEAT' }));
    await screen.findByTestId('private-draft-desk');
    fireEvent.click(await screen.findByRole('button', { name: 'OPTIMIZE AROUND' }));
    fireEvent.click(await screen.findByRole('button', { name: 'PLAYER POOL' }));
    expect(screen.queryByTestId('selected-player-decision')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /TRADE TO/ })).not.toBeInTheDocument();
  }, 15_000);

  test('deferred guide answers cannot cross companion cover/revoke or main revision/team boundaries', async () => {
    const answer = {
      message: 'OLD GUIDE ANSWER', proposal: null,
      nextPickMoves: [],
    };
    const source = session();
    prepare(source);
    const covered = deferred<unknown>();
    mocks.manualGuidePromise = covered.promise;
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'TRADE PICKS' }));
    fireEvent.change(screen.getByLabelText('WHAT WOULD IT COST TO REACH PICK N?'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'CHECK PICK 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'COVER THIS DEVICE' }));
    await screen.findByTestId('snake-companion-covered');
    await act(async () => { covered.resolve(answer); await covered.promise; });
    expect(screen.queryByText('OLD GUIDE ANSWER')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'RETURN TO DESK' }));
    await screen.findByTestId('snake-companion-frame');
    const revoked = deferred<unknown>();
    mocks.manualGuidePromise = revoked.promise;
    fireEvent.click(screen.getByRole('button', { name: 'TRADE PICKS' }));
    fireEvent.change(screen.getByLabelText('WHAT WOULD IT COST TO REACH PICK N?'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'CHECK PICK 1' }));
    const current = mocks.currentSession as LeagueBuilderMlbDraftSession;
    mocks.currentSession = {
      ...current,
      revision: (current.revision ?? 0) + 1,
      snakeCompanions: {
        ...current.snakeCompanions!,
        claims: current.snakeCompanions!.claims.map((claim) => ({ ...claim, status: 'revoked' as const })),
      },
    };
    await act(async () => { await mocks.companionFreshnessRefresh?.(); });
    expect(await screen.findByRole('heading', { name: 'CLAIM YOUR PRIVATE DESK' })).toBeInTheDocument();
    await act(async () => { revoked.resolve(answer); await revoked.promise; });
    expect(screen.queryByText('OLD GUIDE ANSWER')).not.toBeInTheDocument();

    cleanup();
    prepare(session());
    const revised = deferred<unknown>();
    mocks.manualGuidePromise = revised.promise;
    render(<MemoryRouter initialEntries={[`/snake-room?leagueId=${league.id}&practice=1`]}><SnakeDraftRoom /></MemoryRouter>);
    expect(await screen.findByTestId('snake-draft-room')).toBeInTheDocument();
    selectMainTeam('a');
    fireEvent.click(await screen.findByRole('button', { name: 'REVEAL CLUB A SEAT' }));
    await screen.findByTestId('private-draft-desk');
    fireEvent.click(await screen.findByRole('button', { name: 'TRADE PICKS' }));
    fireEvent.change(screen.getByLabelText('WHAT WOULD IT COST TO REACH PICK N?'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'CHECK PICK 1' }));
    const mainCurrent = mocks.currentSession as LeagueBuilderMlbDraftSession;
    mocks.currentSession = { ...mainCurrent, revision: (mainCurrent.revision ?? 0) + 1 };
    await act(async () => { await mocks.mainFreshnessRefresh?.(); });
    await act(async () => { revised.resolve(answer); await revised.promise; });
    expect(screen.queryByText('OLD GUIDE ANSWER')).not.toBeInTheDocument();
    expect(screen.getByLabelText('WHAT WOULD IT COST TO REACH PICK N?')).toHaveValue(null);

    const switched = deferred<unknown>();
    mocks.manualGuidePromise = switched.promise;
    fireEvent.change(screen.getByLabelText('WHAT WOULD IT COST TO REACH PICK N?'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'CHECK PICK 1' }));
    selectMainTeam('b');
    await act(async () => { switched.resolve(answer); await switched.promise; });
    expect(screen.queryByText('OLD GUIDE ANSWER')).not.toBeInTheDocument();
    expect(screen.queryByTestId('private-draft-desk')).not.toBeInTheDocument();
  }, 20_000);

  test('companion emits no assistant request, result, or board when one live player lacks contextual advisor worth', async () => {
    mocks.omitContextPlayerId = 'dual';
    prepare(session());
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();

    expect(mocks.assistantRequests).toHaveLength(0);
    expect(mocks.assistantResults).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'ASST GM BOARD' }));
    expect(screen.getByText('ASST GM 22 UNAVAILABLE')).toHaveAttribute('role', 'status');
    expect(screen.queryByTestId('assistant-plan-truth-strip')).not.toBeInTheDocument();
  });

  test('main emits no assistant request, result, or board when one live player lacks contextual advisor worth', async () => {
    mocks.omitContextPlayerId = 'dual';
    prepare(session());
    render(<MemoryRouter initialEntries={[`/snake-room?leagueId=${league.id}&practice=1`]}><SnakeDraftRoom /></MemoryRouter>);
    expect(await screen.findByTestId('snake-draft-room')).toBeInTheDocument();
    await act(async () => {
      selectMainTeam('a');
    });
    const reveal = await screen.findByRole('button', { name: 'REVEAL CLUB A SEAT' });
    await act(async () => {
      fireEvent.click(reveal);
    });
    const assistantTab = await screen.findByRole('button', { name: 'ASST GM BOARD' });

    expect(mocks.assistantRequests).toHaveLength(0);
    expect(mocks.assistantResults).toHaveLength(0);
    await act(async () => {
      fireEvent.click(assistantTab);
    });
    expect(screen.getByText('ASST GM 22 UNAVAILABLE')).toHaveAttribute('role', 'status');
    expect(screen.queryByTestId('assistant-plan-truth-strip')).not.toBeInTheDocument();
  });

  test('one device switches between two approved desks only through cover and keeps both boards isolated', async () => {
    const source = session();
    source.snakeSetup = {
      ...source.snakeSetup!,
      clubs: source.snakeSetup!.clubs.map((club) => ({ ...club, gmName: 'Alex' })),
    };
    source.snakeCompanions = {
      roomCode: '4821',
      claims: [
        { claimId: 'claim-a', claimVersion: 2, deviceId: 'ipad-a', gmName: 'Alex', teamId: 'a', status: 'approved' },
        { claimId: 'claim-b', claimVersion: 2, deviceId: 'ipad-a', gmName: 'Alex', teamId: 'b', status: 'approved' },
      ],
    };
    source.seatBoards!.b = {
      ...source.seatBoards!.b,
      rankings: {
        ...source.seatBoards!.b.rankings,
        global: ['one-b', ...source.seatBoards!.b.rankings.global.filter((id) => id !== 'one-b')],
      },
    };
    prepare(source);
    render(<SnakeCompanion />);

    expect(await screen.findByTestId('companion-team-header')).toHaveTextContent('CLUB A');
    expect(screen.getByTestId('companion-selected-player-pane')).toHaveTextContent('DUAL PLAYER');
    const switcher = screen.getByRole('combobox', { name: 'PRIVATE TEAM DESK' });
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['CLUB A', 'CLUB B']);

    fireEvent.change(switcher, { target: { value: 'b' } });
    expect(await screen.findByTestId('snake-companion-covered')).toBeInTheDocument();
    expect(screen.queryByTestId('snake-companion-frame')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RETURN TO DESK' })).toHaveTextContent('OPEN CLUB B DESK');
    fireEvent.click(screen.getByRole('button', { name: 'RETURN TO DESK' }));
    expect(await screen.findByTestId('companion-team-header')).toHaveTextContent('CLUB B');
    expect(screen.getByTestId('companion-selected-player-pane')).toHaveTextContent(/one-b Player/i);

    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(mocks.patchBoard).toHaveBeenCalledWith(expect.objectContaining({ teamId: 'b' })));

    fireEvent.change(screen.getByRole('combobox', { name: 'PRIVATE TEAM DESK' }), { target: { value: 'a' } });
    await screen.findByTestId('snake-companion-covered');
    fireEvent.click(screen.getByRole('button', { name: 'RETURN TO DESK' }));
    expect(await screen.findByTestId('companion-team-header')).toHaveTextContent('CLUB A');
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(mocks.patchBoard).toHaveBeenCalledWith(expect.objectContaining({ teamId: 'a' })));

    const current = mocks.currentSession as LeagueBuilderMlbDraftSession;
    mocks.currentSession = {
      ...current,
      snakeCompanions: {
        ...current.snakeCompanions!,
        claims: [...current.snakeCompanions!.claims].reverse(),
      },
    };
    await act(async () => { await mocks.companionFreshnessRefresh?.(); });
    expect(screen.getByTestId('companion-team-header')).toHaveTextContent('CLUB A');

    const reordered = mocks.currentSession as LeagueBuilderMlbDraftSession;
    mocks.currentSession = {
      ...reordered,
      snakeCompanions: {
        ...reordered.snakeCompanions!,
        claims: reordered.snakeCompanions!.claims.map((claim) => (
          claim.teamId === 'a' ? { ...claim, status: 'revoked' as const, claimVersion: (claim.claimVersion ?? 0) + 1 } : claim
        )),
      },
    };
    await act(async () => { await mocks.companionFreshnessRefresh?.(); });
    expect(await screen.findByTestId('snake-companion-covered')).toBeInTheDocument();
    expect(screen.queryByTestId('snake-companion-frame')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RETURN TO DESK' })).toHaveTextContent('OPEN CLUB B DESK');
  }, 20_000);

  test('a delayed Team A board save cannot restore Team A after the device selects Team B', async () => {
    const source = session();
    source.snakeCompanions = {
      roomCode: '4821',
      claims: [
        { claimId: 'claim-a', claimVersion: 2, deviceId: 'ipad-a', gmName: 'Alex', teamId: 'a', status: 'approved' },
        { claimId: 'claim-b', claimVersion: 2, deviceId: 'ipad-a', gmName: 'Alex', teamId: 'b', status: 'approved' },
      ],
    };
    const pending = deferred<LeagueBuilderMlbDraftSession>();
    prepare(source);
    mocks.patchBoard.mockImplementationOnce(() => pending.promise);
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('companion-team-header')).toHaveTextContent('CLUB A');

    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(mocks.patchBoard).toHaveBeenCalledTimes(1));
    const boardInput = mocks.patchBoard.mock.calls[0][0] as { teamId: string; board: SnakeSeatBoardRecord };
    expect(boardInput.teamId).toBe('a');

    fireEvent.change(screen.getByRole('combobox', { name: 'PRIVATE TEAM DESK' }), { target: { value: 'b' } });
    await screen.findByTestId('snake-companion-covered');
    fireEvent.click(screen.getByRole('button', { name: 'RETURN TO DESK' }));
    expect(await screen.findByTestId('companion-team-header')).toHaveTextContent('CLUB B');

    const staleA = {
      ...source,
      revision: (source.revision ?? 0) + 1,
      seatBoards: { ...source.seatBoards, a: boardInput.board },
    };
    await act(async () => { pending.resolve(staleA); await pending.promise; });
    expect(screen.getByTestId('companion-team-header')).toHaveTextContent('CLUB B');
    expect(screen.queryByTestId('companion-board-update-banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'UNDO BOARD UPDATE' })).not.toBeInTheDocument();
  }, 20_000);

  test('a revoked approval fails closed inside the atomic companion board patch', async () => {
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    const current = mocks.currentSession as LeagueBuilderMlbDraftSession;
    mocks.currentSession = {
      ...current,
      snakeCompanions: { ...current.snakeCompanions!, claims: current.snakeCompanions!.claims.map((claim) => ({ ...claim, status: 'revoked' as const })) },
    };
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(mocks.patchBoard).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'CLAIM YOUR PRIVATE DESK' })).toBeInTheDocument());
    expect(screen.queryByTestId('snake-companion-frame')).not.toBeInTheDocument();
    expect(screen.queryByText('MAIN-DEVICE APPROVAL IS REQUIRED.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'UNDO BOARD UPDATE' })).not.toBeInTheDocument();
  });

  test('a stale companion board write shows the existing stale message and refreshes', async () => {
    mocks.patchBoard.mockRejectedValueOnce(new Error('board revision changed'));
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(screen.getByText('THE DRAFT MOVED ON — REFRESH')).toBeInTheDocument());
    expect(mocks.patchBoard).toHaveBeenCalledTimes(1);
    expect(mocks.refresh).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'UNDO BOARD UPDATE' })).not.toBeInTheDocument();
  });

  test('cover and return synchronize immediately across two open companion instances and erase an old undo', async () => {
    render(<><SnakeCompanion /><SnakeCompanion /></>);
    await waitFor(() => expect(screen.getAllByTestId('snake-companion-frame')).toHaveLength(2));

    fireEvent.click(screen.getAllByRole('button', { name: 'PLAYER POOL' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(mocks.patchBoard).toHaveBeenCalledTimes(1));
    expect(screen.getAllByTestId('companion-board-update-banner')).toHaveLength(1);

    fireEvent.click(screen.getAllByRole('button', { name: 'COVER THIS DEVICE' })[1]);
    await waitFor(() => expect(screen.getAllByTestId('snake-companion-covered')).toHaveLength(2));
    expect(screen.queryByTestId('snake-companion-frame')).not.toBeInTheDocument();
    expect(localStorage.getItem('kbl-snake-companion-device-covered')).toBe('true');

    fireEvent.click(screen.getAllByRole('button', { name: 'RETURN TO DESK' })[0]);
    await waitFor(() => expect(screen.getAllByTestId('snake-companion-frame')).toHaveLength(2));
    expect(screen.queryByTestId('snake-companion-covered')).not.toBeInTheDocument();
    expect(localStorage.getItem('kbl-snake-companion-device-covered')).toBeNull();
    expect(screen.queryByTestId('companion-board-update-banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'UNDO BOARD UPDATE' })).not.toBeInTheDocument();
  });

  test('a deferred companion save resolved after cover cannot restore private status or undo', async () => {
    const source = structuredClone(mocks.currentSession as LeagueBuilderMlbDraftSession);
    const pending = deferred<LeagueBuilderMlbDraftSession>();
    mocks.patchBoard.mockImplementationOnce(() => pending.promise);
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(mocks.patchBoard).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'COVER THIS DEVICE' }));
    expect(await screen.findByTestId('snake-companion-covered')).toBeInTheDocument();
    const input = mocks.patchBoard.mock.calls[0][0] as { teamId: string; board: SnakeSeatBoardRecord };
    const saved = {
      ...source,
      revision: source.revision + 1,
      seatBoards: { ...source.seatBoards, [input.teamId]: input.board },
    };
    mocks.currentSession = saved;
    await act(async () => { pending.resolve(saved); await pending.promise; });
    expect(screen.queryByText(/MY BOARD UPDATED/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'RETURN TO DESK' }));
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    expect(screen.queryByTestId('companion-board-update-banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'UNDO BOARD UPDATE' })).not.toBeInTheDocument();
  });

  test('a deferred Room A save cannot reopen that room after the device forgets it', async () => {
    const source = structuredClone(mocks.currentSession as LeagueBuilderMlbDraftSession);
    const pending = deferred<LeagueBuilderMlbDraftSession>();
    mocks.patchBoard.mockImplementationOnce(() => pending.promise);
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(mocks.patchBoard).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'COVER THIS DEVICE' }));
    expect(await screen.findByTestId('snake-companion-covered')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'FORGET ROOM' }));
    expect(await screen.findByRole('heading', { name: 'CLAIM YOUR PRIVATE DESK' })).toBeInTheDocument();
    expect(screen.queryByTestId('snake-companion-covered')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'RETURN TO DESK' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('snake-companion-frame')).not.toBeInTheDocument();

    const input = mocks.patchBoard.mock.calls[0][0] as { teamId: string; board: SnakeSeatBoardRecord };
    const staleRoomA = {
      ...source,
      revision: source.revision + 1,
      seatBoards: { ...source.seatBoards, [input.teamId]: input.board },
    };
    mocks.currentSession = staleRoomA;
    await act(async () => { pending.resolve(staleRoomA); await pending.promise; });

    expect(screen.getByRole('heading', { name: 'CLAIM YOUR PRIVATE DESK' })).toBeInTheDocument();
    expect(screen.queryByTestId('snake-companion-frame')).not.toBeInTheDocument();
    expect(screen.queryByTestId('companion-board-update-banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'UNDO BOARD UPDATE' })).not.toBeInTheDocument();
  });

  test('a same-revision device reassignment cannot expose or undo the prior club snapshot', async () => {
    const source = structuredClone(mocks.currentSession as LeagueBuilderMlbDraftSession);
    const pending = deferred<LeagueBuilderMlbDraftSession>();
    mocks.patchBoard.mockImplementationOnce(() => pending.promise);
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(mocks.patchBoard).toHaveBeenCalledTimes(1));

    const input = mocks.patchBoard.mock.calls[0][0] as { teamId: string; board: SnakeSeatBoardRecord };
    const externalB = {
      ...source,
      revision: source.revision + 1,
      seatBoards: {
        ...source.seatBoards,
        b: { ...source.seatBoards!.b, revision: input.board.revision },
      },
      snakeCompanions: {
        ...source.snakeCompanions!,
        claims: source.snakeCompanions!.claims.map((claim) => ({ ...claim, teamId: 'b' })),
      },
    };
    mocks.currentSession = externalB;
    fireEvent.click(screen.getByRole('button', { name: 'COVER THIS DEVICE' }));
    expect(await screen.findByTestId('snake-companion-covered')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RETURN TO DESK' }));
    await waitFor(() => expect(screen.getByTestId('companion-team-header')).toHaveTextContent('CLUB B'));

    const staleRoomA = {
      ...source,
      revision: source.revision + 1,
      seatBoards: { ...source.seatBoards, a: input.board },
    };
    await act(async () => { pending.resolve(staleRoomA); await pending.promise; });

    expect(screen.getByTestId('companion-team-header')).toHaveTextContent('CLUB B');
    expect(externalB.seatBoards!.b.revision).toBe(input.board.revision);
    expect(screen.queryByTestId('companion-board-update-banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'UNDO BOARD UPDATE' })).not.toBeInTheDocument();
    expect(mocks.patchBoard).toHaveBeenCalledTimes(1);
  });
});
