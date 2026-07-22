import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  data: {} as Record<string, unknown>,
  farmPool: null as unknown,
  commitMlb: vi.fn(),
  commitFarm: vi.fn(),
  saveRoom: vi.fn(async (session: unknown) => session),
  markHandoff: vi.fn(),
  pull: vi.fn(async () => undefined),
  flush: vi.fn(async () => undefined),
  refresh: vi.fn(async () => undefined),
  closeRoom: vi.fn(),
  getLiveRoom: vi.fn(),
  findRoomByCode: vi.fn(),
  getCatalog: vi.fn(),
  restoreLiveRoom: vi.fn(),
  restoreFarmLiveRoom: vi.fn(),
  liveSession: null as LeagueBuilderMlbDraftSession | null,
  liveRoomStatus: 'complete' as 'open' | 'complete' | 'closed',
  liveCorrectionAvailable: false,
  restorePreviousPublicState: vi.fn(),
  forceMissingLiveRoom: false,
  lastSaved: null as LeagueBuilderMlbDraftSession | null,
}));

vi.mock('../../../supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { user: { id: 'completion-owner' } } },
        error: null,
      })),
    },
  },
}));

vi.mock('../../hooks/useLeagueBuilderData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useLeagueBuilderData')>();
  return { ...actual, useLeagueBuilderData: () => mocks.data };
});

vi.mock('../../../utils/franchisePhase2Flags', () => ({ isSnakeDraftV1Enabled: () => true }));
vi.mock('../../../utils/syncEngine', () => ({ syncEngine: { pull: mocks.pull, flush: mocks.flush } }));
vi.mock('../../utils/snakeSounds', () => ({
  loadSnakeSoundsEnabled: () => false,
  saveSnakeSoundsEnabled: vi.fn(),
  createSnakeSoundPlayer: () => ({ play: vi.fn() }),
}));
vi.mock('../../../utils/leagueBuilderAuctionPipeline', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/leagueBuilderAuctionPipeline')>();
  return {
    ...actual,
    finalizeCompletedSnakeSessionToLeagueRosters: mocks.commitMlb,
    commitCompletedSnakeFarmSessionToLeagueRosters: mocks.commitFarm,
  };
});
vi.mock('../../../utils/farmAuctionPool', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/farmAuctionPool')>();
  return { ...actual, buildFarmAuctionPool: () => mocks.farmPool };
});
vi.mock('../../../utils/leagueBuilderStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/leagueBuilderStorage')>();
  return {
    ...actual,
    getAllLeagueTemplates: vi.fn(async () => mocks.data.leagues ?? []),
    getAllTeams: vi.fn(async () => mocks.data.teams ?? []),
    getAllPlayers: vi.fn(async () => mocks.data.durablePlayers ?? mocks.data.players ?? []),
    getRegisteredPool: vi.fn(async () => (
      mocks.data.durablePool
        ?? (mocks.data.getRegisteredPool as (() => Promise<unknown>) | undefined)?.()
        ?? null
    )),
    getTeamRoster: vi.fn(async (teamId: string) => (
      (mocks.data.getRoster as ((teamId: string) => Promise<unknown>) | undefined)?.(teamId) ?? null
    )),
    getScoutProfilesForLeague: vi.fn(async () => [
      { id: 'scout-a', leagueId: 'completion-league', teamId: 'a', name: 'Kodiaks Eyes', specialties: [], weaknesses: [] },
      { id: 'scout-b', leagueId: 'completion-league', teamId: 'b', name: 'Comets Eyes', specialties: [], weaknesses: [] },
    ]),
    saveMlbDraftRoomSession: mocks.saveRoom,
    freezeMlbDraftRoomSessionWithRegisteredPool: ({ session }: { session: unknown }) => mocks.saveRoom(session),
    markSnakeRosterHandoff: mocks.markHandoff,
    restoreSnakeLiveRoomLocally: mocks.restoreLiveRoom,
    restoreSnakeLiveFarmRoomLocally: mocks.restoreFarmLiveRoom,
  };
});
vi.mock('../../../utils/snakeRosterHandoff', () => ({
  assertSnakeRosterHandoffReady: vi.fn(async () => undefined),
}));
vi.mock('../../../utils/snakeLiveCapabilityStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/snakeLiveCapabilityStore')>();
  return { ...actual, getOrCreateSnakeLiveDeviceId: vi.fn(async () => 'completion-host-device') };
});
vi.mock('../../../utils/snakeLiveRoomTransport', () => ({
  createSnakeLiveRoomTransport: () => ({
    getRoom: mocks.getLiveRoom,
    findRoomByCode: mocks.findRoomByCode,
    getCatalog: mocks.getCatalog,
  }),
}));
vi.mock('../../app/components/snake/companion/useSnakeLiveHostRoom', () => ({
  useSnakeLiveHostRoom: (options: {
    session: LeagueBuilderMlbDraftSession | null;
    enabled?: boolean;
    catalog?: Record<string, unknown> | null;
  }) => {
    const publicSession = options.enabled && !mocks.forceMissingLiveRoom
      ? mocks.liveSession ?? options.session
      : null;
    const room = publicSession ? {
      id: `live:${publicSession.id}`,
      ownerUserId: 'completion-owner',
      sessionId: publicSession.id,
      roomCode: publicSession.snakeCompanions?.roomCode ?? '2468',
      phase: publicSession.draftPhase ?? 'MLB',
      status: mocks.liveRoomStatus,
      publicRevision: publicSession.revision ?? 0,
      publicState: {},
      correctionAvailable: mocks.liveCorrectionAvailable,
      hostDeviceId: 'completion-host-device',
      createdAt: publicSession.createdDate,
      updatedAt: publicSession.lastModified,
    } : null;
    return {
      room,
      publicSession,
      catalog: room && options.catalog ? {
        roomId: room.id,
        catalogRevision: 1,
        catalog: options.catalog,
        createdAt: publicSession?.createdDate ?? '2026-07-19T00:00:00.000Z',
      } : null,
      claims: [],
      intents: [],
      events: [],
      status: room ? 'live' : 'idle',
      subscriptionStatus: room ? 'SUBSCRIBED' : null,
      error: null,
      working: false,
      hostAccessReady: Boolean(room),
      liveRoomReady: Boolean(room),
      refresh: vi.fn(async () => undefined),
      publishSession: vi.fn(),
      resolveClaim: vi.fn(),
      resolveIntent: vi.fn(),
      restorePreviousPublicState: mocks.restorePreviousPublicState,
      submitTradeIntent: vi.fn(),
      seedBoard: vi.fn(),
      closeRoom: mocks.closeRoom,
    };
  },
}));

import type { LeagueBuilderMlbDraftSession, LeagueTemplate, Player, RegisteredPool, Team } from '../../hooks/useLeagueBuilderData';
import SnakeDraftRoom from '../../app/pages/SnakeDraftRoom';
import {
  buildSnakeRosterHandoff,
  freezeSnakeDraftSession,
} from '../../../utils/snakeDraftManifest';
import { buildSnakeLiveCatalog } from '../../../utils/snakeLiveCatalog';
import { buildSnakeLivePublicState } from '../../../utils/snakeLiveRoomSession';

const league: LeagueTemplate = {
  id: 'completion-league', name: 'Completion League', teamIds: ['a', 'b'], conferences: [], divisions: [],
  defaultRulesPreset: 'standard', draftFormat: 'snake', tier: 'standard', balanceMode: 'taxed', salaryCap: 1_000_000,
  createdDate: '2026-01-01', lastModified: '2026-01-01',
};
const teams: Team[] = [
  { id: 'a', name: 'Kodiaks', abbreviation: 'KOD', location: 'North', nickname: 'Kodiaks', colors: { primary: '#234f32', secondary: '#f5d77a' }, stadium: 'A', controlledBy: 'human', mlbArchetypeKey: 'bash-brothers', farmArchetypeKey: 'web-gems', leagueIds: [league.id], createdDate: '2026-01-01', lastModified: '2026-01-01' },
  { id: 'b', name: 'Comets', abbreviation: 'COM', location: 'South', nickname: 'Comets', colors: { primary: '#31543d', secondary: '#f3efdc' }, stadium: 'B', controlledBy: 'human', mlbArchetypeKey: 'whiteyball', farmArchetypeKey: 'bomba-squad', leagueIds: [league.id], createdDate: '2026-01-01', lastModified: '2026-01-01' },
];

function player(id: string, firstName: string, lastName: string, position: Player['primaryPosition']): Player {
  return {
    id, firstName, lastName, gender: 'F', age: 25, bats: 'R', throws: 'R', primaryPosition: position,
    power: 60, contact: 60, speed: 60, fielding: 60, arm: 60, velocity: 0, junk: 0, accuracy: 0,
    arsenal: [], overallGrade: 'B', personality: 'Competitive', chemistry: 'Spirited', morale: 50,
    mojo: 'Normal', fame: 0, salary: 10_000, leagueAssignments: [],
    hiddenPersonalityModifiers: { loyalty: 50, ambition: 50, resilience: 50, charisma: 50 },
    createdDate: '2026-01-01', lastModified: '2026-01-01', isCustom: true,
  };
}

const players = [player('p1', 'Mara', 'Diaz', 'SS'), player('p2', 'Jo', 'Stone', 'CF')];
const pool: RegisteredPool = {
  leagueId: league.id, tier: 'standard', balanceMode: 'taxed',
  players: [{ id: 'p1', iv: 100_000, salary: 100_000 }, { id: 'p2', iv: 120_000, salary: 120_000 }],
  tierCap: 1_000_000, luxuryCaps: [], pickValueChart: [], totalSlots: 2, poolSurplusWarning: false, locked: true, lockedAt: 1,
};

function completedSession(phase: 'MLB' | 'FARM'): LeagueBuilderMlbDraftSession {
  return {
    id: `${phase.toLowerCase()}-complete`, leagueId: league.id, seasonNumber: phase === 'FARM' ? 2 : 1,
    seed: 'complete-seed', workflowVersion: phase === 'FARM' ? 'snake-v1-farm' : 'snake-v1', engineMethodVersion: 'snake-s1a',
    draftPhase: phase, tier: 'standard', balanceMode: 'taxed', rounds: 1,
    pickOrder: [{ round: 1, pick: 1, teamId: 'a' }, { round: 1, pick: 2, teamId: 'b' }],
    completedPicks: phase === 'MLB'
      ? [
          { round: 1, pick: 1, teamId: 'a', playerId: 'p1', settledSalary: 100_000, marginalTax: 5_000 },
          { round: 1, pick: 2, teamId: 'b', playerId: 'p2', settledSalary: 120_000, marginalTax: -2_000 },
        ]
      : [
          { round: 1, pick: 1, teamId: 'a', playerId: 'f1', settledSalary: 30_000, marginalTax: 0 },
          { round: 1, pick: 2, teamId: 'b', playerId: 'f2', settledSalary: 20_000, marginalTax: 0 },
        ],
    currentPickIndex: 2, trades: [], revision: 2,
    farmSlotSalaries: phase === 'FARM' ? [30_000, 20_000] : undefined,
    snakeSetup: {
      poolPlayerIds: phase === 'FARM' ? ['f1', 'f2'] : ['p1', 'p2'],
      versionSelections: {},
      clubs: [
        { teamId: 'a', hotseat: true, archetypeId: 'bash-brothers', farmArchetypeId: 'web-gems' },
        { teamId: 'b', hotseat: true, archetypeId: 'whiteyball', farmArchetypeId: 'bomba-squad' },
      ],
      orderSeed: 'complete-seed',
    },
    snakeCompanions: phase === 'MLB' ? { roomCode: '2468', claims: [] } : undefined,
    createdDate: '2026-01-01', lastModified: '2026-01-01',
  } as LeagueBuilderMlbDraftSession;
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="navigation-target">{location.pathname}{location.search}</div>;
}

function renderRoom(url: string) {
  return render(<MemoryRouter initialEntries={[url]}><Routes>
    <Route path="/snake-room" element={<SnakeDraftRoom />} />
    <Route path="*" element={<LocationProbe />} />
  </Routes></MemoryRouter>);
}

function setMlbData(session = completedSession('MLB')) {
  mocks.data = {
    leagues: [league], teams, players, durablePlayers: players, durablePool: pool, isLoading: false, error: null,
    getRegisteredPool: vi.fn(async () => pool), getMlbDraftSession: vi.fn(async () => mocks.lastSaved ?? session),
    saveMlbDraftSession: vi.fn(async (next) => next), getRoster: vi.fn(async () => ({ teamId: 'a', mlbRoster: [], farmRoster: [] })),
    refresh: mocks.refresh,
  };
  return session;
}

async function successfulMlbFinalization(input: {
  leagueId: string;
  session: LeagueBuilderMlbDraftSession;
  committedAt: string;
}) {
  const finalizedSession = input.session.rosterHandoff
    ? input.session
    : {
        ...input.session,
        rosterHandoff: buildSnakeRosterHandoff(input.session, 'MLB', input.committedAt),
      };
  return {
    leagueId: input.leagueId,
    rosterStatus: 'MLB',
    committedPlayerIds: finalizedSession.completedPicks.map((pick) => pick.playerId),
    teamRosterCounts: { a: 1, b: 1 },
    session: finalizedSession,
  };
}

function setFarmData(session = completedSession('FARM')) {
  const prospects = [
    { ...player('f1', 'Fog', 'One', 'SS'), prospectProfile: { trueGrade: 'A', scoutedGrade: 'B', potentialGrade: 'A', scoutAccuracy: 50, scoutConfidence: 'low', scoutGradeError: 1, scoutSpecialtiesVisible: [], scoutWeaknessesVisible: [], methodVersion: 'v1', source: 'test', draftYear: 1, draftRound: 1, draftPick: 1, teamId: 'pool' } },
    { ...player('f2', 'Fog', 'Two', 'CF'), prospectProfile: { trueGrade: 'B', scoutedGrade: 'C', potentialGrade: 'B', scoutAccuracy: 50, scoutConfidence: 'low', scoutGradeError: 1, scoutSpecialtiesVisible: [], scoutWeaknessesVisible: [], methodVersion: 'v1', source: 'test', draftYear: 1, draftRound: 1, draftPick: 2, teamId: 'pool' } },
  ];
  mocks.farmPool = { leagueId: league.id, seasonNumber: 1, prospects, auctionPlayers: prospects.map((row, index) => ({ id: row.id, iv: 20_000 + index * 10_000 })) };
  const frozenMlb = freezeSnakeDraftSession({
    session: completedSession('MLB'),
    expectedPhase: 'MLB',
    poolPlayerIds: pool.players.map((row) => row.id),
    salaryByPlayerId: new Map(pool.players.map((row) => [row.id, row.iv])),
    frozenAt: '2026-07-12T11:00:00.000Z',
  });
  const handedOffMlb = {
    ...frozenMlb,
    rosterHandoff: buildSnakeRosterHandoff(frozenMlb, 'MLB', '2026-07-12T11:01:00.000Z'),
  };
  const storedFarm = { ...session, farmProspectSnapshot: prospects };
  mocks.data = {
    leagues: [league], teams, players: [], isLoading: false, error: null,
    getMlbDraftSession: vi.fn(async (_leagueId: string, seasonNumber: number) => seasonNumber === 2 ? mocks.lastSaved ?? storedFarm : handedOffMlb),
    saveMlbDraftSession: vi.fn(async (next) => next), getRoster: vi.fn(async (teamId: string) => ({ teamId, mlbRoster: [], farmRoster: [] })),
    refresh: mocks.refresh,
  };
  return storedFarm;
}

describe('snake draft durable completion and recap', () => {
  beforeEach(() => {
    mocks.pull.mockReset().mockResolvedValue(undefined);
    mocks.refresh.mockReset().mockResolvedValue(undefined);
    mocks.commitMlb.mockReset().mockImplementation(successfulMlbFinalization);
    mocks.commitFarm.mockReset().mockResolvedValue(undefined);
    mocks.liveSession = null;
    mocks.liveRoomStatus = 'complete';
    mocks.liveCorrectionAvailable = false;
    mocks.restorePreviousPublicState.mockReset();
    mocks.forceMissingLiveRoom = false;
    mocks.getLiveRoom.mockReset().mockResolvedValue(null);
    mocks.findRoomByCode.mockReset().mockResolvedValue(null);
    mocks.getCatalog.mockReset().mockResolvedValue(null);
    mocks.restoreLiveRoom.mockReset().mockResolvedValue({
      leagueId: league.id,
      restoredLeague: false,
      restoredTeams: 0,
      restoredPlayers: 0,
      restoredPool: false,
      restoredSession: false,
    });
    mocks.restoreFarmLiveRoom.mockReset().mockImplementation(async (input: {
      session: LeagueBuilderMlbDraftSession;
      prospects: unknown[];
    }) => ({ ...input.session, farmProspectSnapshot: input.prospects }));
    mocks.closeRoom.mockReset().mockImplementation(async () => ({ status: 'closed' }));
    mocks.lastSaved = null;
    mocks.saveRoom.mockReset().mockImplementation(async (session: LeagueBuilderMlbDraftSession) => {
      mocks.lastSaved = session;
      return session;
    });
    mocks.markHandoff.mockReset().mockImplementation(async (input: { phase: 'MLB' | 'FARM'; committedAt: string; seasonNumber: number }) => {
      const loaded = await (mocks.data.getMlbDraftSession as (leagueId: string, seasonNumber: number) => Promise<LeagueBuilderMlbDraftSession>)(league.id, input.seasonNumber);
      const current = mocks.lastSaved ?? loaded;
      return { ...current, rosterHandoff: buildSnakeRosterHandoff(current, input.phase, input.committedAt) };
    });
  });
  afterEach(() => cleanup());

  test('a signed-in browser with only the league can restore a completed live room instead of restarting', async () => {
    const completed = completedSession('MLB');
    const catalog = buildSnakeLiveCatalog({
      league,
      teams,
      players,
      registeredPool: pool,
      activeTeamIds: league.teamIds,
      activePoolPlayerIds: pool.players.map((entry) => entry.id),
    });
    const room = {
      id: 'live-completed-room',
      ownerUserId: 'completion-owner',
      sessionId: completed.id,
      roomCode: '4352',
      phase: 'MLB' as const,
      status: 'complete' as const,
      publicRevision: completed.revision ?? 0,
      publicState: buildSnakeLivePublicState(completed),
      correctionAvailable: false,
      hostDeviceId: 'completion-host-device',
      createdAt: completed.createdDate,
      updatedAt: completed.lastModified,
    };
    mocks.data = {
      leagues: [league],
      teams,
      players: [],
      durablePlayers: [],
      isLoading: false,
      error: null,
      getRegisteredPool: vi.fn(async () => null),
      getMlbDraftSession: vi.fn(async () => null),
      refresh: mocks.refresh,
    };
    mocks.findRoomByCode.mockResolvedValue(room);
    mocks.getCatalog.mockResolvedValue({
      roomId: room.id,
      catalogRevision: 1,
      catalog,
      createdAt: completed.createdDate,
    });
    mocks.restoreLiveRoom.mockImplementation(async (input: { recovery: { roomCode: string } }) => {
      expect(input.recovery.roomCode).toBe('4352');
      mocks.data = {
        ...mocks.data,
        players,
        durablePlayers: players,
        durablePool: pool,
        getRegisteredPool: vi.fn(async () => pool),
        getMlbDraftSession: vi.fn(async () => completed),
      };
      return {
        leagueId: league.id,
        restoredLeague: false,
        restoredTeams: 0,
        restoredPlayers: players.length,
        restoredPool: true,
        restoredSession: true,
      };
    });

    renderRoom(`/snake-room?leagueId=${league.id}&roomCode=4352`);

    expect(await screen.findByRole('heading', { name: 'THE ROOM IS NOT READY' })).toBeInTheDocument();
    expect(screen.getByText('THE SAVED DRAFT POOL AND DRAFT SESSION ARE MISSING.')).toBeInTheDocument();
    expect(screen.queryByText(/START THE DRAFT AGAIN/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Live room code')).toHaveValue('4352');
    fireEvent.click(screen.getByRole('button', { name: 'RESTORE' }));

    await waitFor(() => expect(mocks.findRoomByCode).toHaveBeenCalledWith('4352'));
    await waitFor(() => expect(mocks.restoreLiveRoom).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('heading', { name: 'MLB DRAFT RECAP' })).toBeInTheDocument();
  });

  test('a signed-in owner can restore an open farm room from its code without the local farm session', async () => {
    const farmSession = completedSession('FARM');
    const prospects = [
      { ...player('f1', 'Fog', 'One', 'SS'), prospectProfile: { trueGrade: 'A', scoutedGrade: 'B', potentialGrade: 'A', scoutAccuracy: 50, scoutConfidence: 'low', scoutGradeError: 1, scoutSpecialtiesVisible: [], scoutWeaknessesVisible: [], methodVersion: 'v1', source: 'test', draftYear: 1, draftRound: 1, draftPick: 1, teamId: 'pool' } },
      { ...player('f2', 'Fog', 'Two', 'CF'), prospectProfile: { trueGrade: 'B', scoutedGrade: 'C', potentialGrade: 'B', scoutAccuracy: 50, scoutConfidence: 'low', scoutGradeError: 1, scoutSpecialtiesVisible: [], scoutWeaknessesVisible: [], methodVersion: 'v1', source: 'test', draftYear: 1, draftRound: 1, draftPick: 2, teamId: 'pool' } },
    ];
    mocks.farmPool = {
      leagueId: league.id,
      seasonNumber: 1,
      prospects,
      auctionPlayers: prospects.map((row, index) => ({ id: row.id, iv: 20_000 + index * 10_000 })),
    };
    const publicSession = {
      ...farmSession,
      completedPicks: farmSession.completedPicks.slice(0, 1),
      currentPickIndex: 1,
      revision: 1,
      snakeCompanions: { roomCode: '9412', claims: [] },
    };
    const room = {
      id: 'live-farm-room',
      ownerUserId: 'completion-owner',
      sessionId: publicSession.id,
      roomCode: '9412',
      phase: 'FARM' as const,
      status: 'open' as const,
      publicRevision: 1,
      publicState: buildSnakeLivePublicState(publicSession),
      correctionAvailable: false,
      hostDeviceId: 'old-farm-host',
      createdAt: publicSession.createdDate,
      updatedAt: publicSession.lastModified,
    };
    mocks.data = {
      leagues: [league],
      teams,
      players: [],
      durablePlayers: [],
      isLoading: false,
      error: null,
      getMlbDraftSession: vi.fn(async () => null),
      getRoster: vi.fn(async (teamId: string) => ({ teamId, mlbRoster: [], farmRoster: [] })),
      refresh: mocks.refresh,
    };
    mocks.findRoomByCode.mockResolvedValue(room);

    renderRoom(`/snake-room?phase=farm&leagueId=${league.id}&roomCode=9412&recover=1`);

    await waitFor(() => expect(mocks.findRoomByCode).toHaveBeenCalledWith('9412'));
    await waitFor(() => expect(mocks.restoreFarmLiveRoom).toHaveBeenCalledWith({
      session: expect.objectContaining({ id: publicSession.id, currentPickIndex: 1 }),
      prospects: expect.arrayContaining([
        expect.objectContaining({ id: 'f1' }),
        expect.objectContaining({ id: 'f2' }),
      ]),
      recovery: {
        roomId: room.id,
        roomCode: '9412',
        publicRevision: 1,
      },
    }));
    expect(await screen.findByText('COMETS IS REVIEWING THE BOARD')).toBeInTheDocument();
  });

  test('a completed MLB reload opens truthful recap and commits once before Scout Hire navigation', async () => {
    const session = setMlbData();
    renderRoom(`/snake-room?leagueId=${league.id}`);
    expect(await screen.findByRole('heading', { name: 'MLB DRAFT RECAP' })).toBeInTheDocument();
    expect(mocks.pull).not.toHaveBeenCalled();
    expect(screen.queryByText('KODIAKS IS REVIEWING THE BOARD')).not.toBeInTheDocument();
    expect(screen.getByText('MARA DIAZ')).toBeInTheDocument();
    expect(screen.getAllByText('$100,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$5,000').length).toBeGreaterThan(0);
    expect(screen.getByText('$105,000')).toBeInTheDocument();
    expect(mocks.commitMlb).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'CONFIRM MLB DRAFT' }));
    await waitFor(() => expect(mocks.commitMlb).toHaveBeenCalled());
    expect(mocks.commitMlb.mock.calls[0][0]).toMatchObject({
      leagueId: league.id,
      pool,
      session: { id: session.id, draftManifest: { phase: 'MLB', source: { sessionId: session.id } } },
    });
    const mlbMorale = mocks.commitMlb.mock.calls[0][0].session.draftManifest.morale;
    expect(Object.keys(mlbMorale.expectedTalentRankByPlayerId)).toHaveLength(pool.players.length);
    expect(Object.keys(mlbMorale.playerByPlayerId)).toHaveLength(session.completedPicks.length);
    expect(Object.keys(mlbMorale.fanByTeamId)).toHaveLength(teams.length);
    expect(JSON.stringify(mlbMorale)).not.toMatch(/loyalty|ambition|resilience|charisma/i);
    expect(mocks.saveRoom).not.toHaveBeenCalled();
    expect(mocks.commitMlb).toHaveBeenCalledTimes(1);
    expect(mocks.closeRoom).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('navigation-target')).toHaveTextContent(`/league-builder/scout-hire?leagueId=${league.id}`);
  });

  test('the first recap confirmation freezes the latest stored revision', async () => {
    const rendered = completedSession('MLB');
    const fresh = { ...rendered, revision: 3 };
    mocks.liveSession = fresh;
    let reads = 0;
    setMlbData(rendered);
    mocks.data.getMlbDraftSession = vi.fn(async () => {
      reads += 1;
      return reads === 1 ? rendered : fresh;
    });

    renderRoom(`/snake-room?leagueId=${league.id}`);
    fireEvent.click(await screen.findByRole('button', { name: 'CONFIRM MLB DRAFT' }));

    await waitFor(() => expect(mocks.commitMlb).toHaveBeenCalled());
    expect(mocks.commitMlb.mock.calls[0][0].session.draftManifest.source.revision).toBe(3);
    expect(await screen.findByTestId('navigation-target')).toHaveTextContent('/league-builder/scout-hire');
  });

  test('confirmation reloads the durable player catalog instead of trusting the rendered snapshot', async () => {
    setMlbData();
    mocks.data.players = players.map((row) => ({ ...row, morale: 1 }));
    mocks.data.durablePlayers = players;
    renderRoom(`/snake-room?leagueId=${league.id}`);
    fireEvent.click(await screen.findByRole('button', { name: 'CONFIRM MLB DRAFT' }));
    await waitFor(() => expect(mocks.commitMlb).toHaveBeenCalledTimes(1));
    expect(mocks.commitMlb.mock.calls[0][0].session.draftManifest.morale.playerByPlayerId.p1.startingMorale).toBe(50);
    expect(await screen.findByTestId('navigation-target')).toHaveTextContent('/league-builder/scout-hire');
  });

  test('authoritative completed picks confirm even if room status lags and room cleanup fails', async () => {
    const completed = setMlbData();
    mocks.liveSession = completed;
    mocks.liveRoomStatus = 'open';
    mocks.closeRoom.mockRejectedValueOnce(new Error('close transport unavailable'));

    renderRoom(`/snake-room?leagueId=${league.id}`);
    fireEvent.click(await screen.findByRole('button', { name: 'CONFIRM MLB DRAFT' }));

    await waitFor(() => expect(mocks.commitMlb).toHaveBeenCalledTimes(1));
    expect(mocks.closeRoom).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('navigation-target')).toHaveTextContent('/league-builder/scout-hire');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('a recovered completed draft advances when the live room is already unavailable', async () => {
    const completed = {
      ...completedSession('MLB'),
      liveRoomRecovery: {
        roomId: 'live:missing-complete-room',
        roomCode: '2468',
        publicRevision: 2,
      },
    };
    setMlbData(completed);
    mocks.forceMissingLiveRoom = true;

    renderRoom(`/snake-room?leagueId=${league.id}`);
    fireEvent.click(await screen.findByRole('button', { name: 'CONFIRM MLB DRAFT' }));

    await waitFor(() => expect(mocks.commitMlb).toHaveBeenCalledTimes(1));
    expect(mocks.getLiveRoom).toHaveBeenCalledWith('live:missing-complete-room');
    expect(mocks.closeRoom).not.toHaveBeenCalled();
    expect(await screen.findByTestId('navigation-target')).toHaveTextContent('/league-builder/scout-hire');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('an MLB commit failure stays on recap and retries without premature navigation', async () => {
    setMlbData();
    mocks.commitMlb.mockRejectedValueOnce(new Error('MLB commit failed')).mockImplementationOnce(successfulMlbFinalization);
    renderRoom(`/snake-room?leagueId=${league.id}`);
    fireEvent.click(await screen.findByRole('button', { name: 'CONFIRM MLB DRAFT' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('THE COMPLETED DRAFT IS SAFE. ROSTERS WERE NOT SAVED. TRY AGAIN.');
    expect(screen.queryByTestId('navigation-target')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'CONFIRM MLB DRAFT' }));
    expect(await screen.findByTestId('navigation-target')).toBeInTheDocument();
    const manifests = mocks.commitMlb.mock.calls.map(([input]) => JSON.stringify(input.session.draftManifest));
    expect(manifests[1]).toBe(manifests[0]);
  });

  test('an unconfirmed MLB recap can return to the room for the final correction', async () => {
    setMlbData();
    renderRoom(`/snake-room?leagueId=${league.id}`);
    fireEvent.click(await screen.findByRole('button', { name: 'BACK TO ROOM' }));
    expect(await screen.findByTestId('snake-draft-room')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'MLB DRAFT RECAP' })).not.toBeInTheDocument();
  });

  test('a frozen reload recaps manifest picks even if mutable room progress is later corrupted', async () => {
    const frozen = freezeSnakeDraftSession({
      session: completedSession('MLB'),
      expectedPhase: 'MLB',
      poolPlayerIds: pool.players.map((player) => player.id),
      salaryByPlayerId: new Map(pool.players.map((player) => [player.id, player.iv])),
      frozenAt: '2026-07-12T12:00:00.000Z',
    });
    mocks.liveSession = frozen;
    setMlbData({
      ...frozen,
      currentPickIndex: 0,
      pickOrder: [],
      completedPicks: [{ round: 1, pick: 1, teamId: 'b', playerId: 'attacker', settledSalary: 1 }],
    });
    renderRoom(`/snake-room?leagueId=${league.id}`);
    expect(await screen.findByRole('heading', { name: 'MLB DRAFT RECAP' })).toBeInTheDocument();
    expect(screen.getByText('MARA DIAZ')).toBeInTheDocument();
    expect(screen.getByText('JO STONE')).toBeInTheDocument();
    expect(screen.queryByText('attacker')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'BACK TO ROOM' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'CONFIRM MLB DRAFT' }));
    await waitFor(() => expect(mocks.commitMlb).toHaveBeenCalledWith(expect.objectContaining({
      session: expect.objectContaining({ draftManifest: frozen.draftManifest }),
    })));
    expect(await screen.findByTestId('navigation-target')).toHaveTextContent('/league-builder/scout-hire');
  });

  test('a missing MLB player lookup uses neutral copy in the recap and live ticker without exposing the internal id', async () => {
    const missingPlayerId = 'mlb-internal-player-id-99';
    const completed = completedSession('MLB');
    setMlbData({
      ...completed,
      completedPicks: [
        { ...completed.completedPicks[0], playerId: missingPlayerId },
        completed.completedPicks[1],
      ],
    });
    renderRoom(`/snake-room?leagueId=${league.id}`);

    expect(await screen.findByRole('heading', { name: 'MLB DRAFT RECAP' })).toBeInTheDocument();
    expect(screen.getByText('UNKNOWN PLAYER')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(missingPlayerId);
    expect(document.body.innerHTML).not.toContain(missingPlayerId);

    fireEvent.click(screen.getByRole('button', { name: 'BACK TO ROOM' }));
    expect(await screen.findByText('PICK #1 · KODIAKS SELECTED UNKNOWN PLAYER')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(missingPlayerId);
    expect(document.body.innerHTML).not.toContain(missingPlayerId);

    fireEvent.click(screen.getByRole('button', { name: 'VIEW DRAFT RECAP' }));
    fireEvent.click(await screen.findByRole('button', { name: 'CONFIRM MLB DRAFT' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('THE COMPLETED DRAFT IS SAFE. ROSTERS WERE NOT SAVED. TRY AGAIN.');
    expect(document.body).not.toHaveTextContent(missingPlayerId);
    expect(document.body.innerHTML).not.toContain(missingPlayerId);
  });

  test('a completed farm reload opens fog-safe recap and commits only before Staff Hire navigation', async () => {
    const session = setFarmData();
    renderRoom(`/snake-room?leagueId=${league.id}&phase=farm`);
    expect(await screen.findByRole('heading', { name: 'FARM DRAFT RECAP' })).toBeInTheDocument();
    expect(screen.getByText('FOG ONE')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/TRUE GRADE|POWER 60|CONTACT 60|\bTAX\b/);
    expect(mocks.commitFarm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'CONFIRM FARM DRAFT' }));
    await waitFor(() => expect(mocks.commitFarm).toHaveBeenCalled());
    expect(mocks.commitFarm.mock.calls[0][0]).toMatchObject({
      leagueId: league.id,
      pool: { prospects: expect.arrayContaining([expect.objectContaining({ id: 'f1' }), expect.objectContaining({ id: 'f2' })]) },
      session: { id: session.id, draftManifest: { phase: 'FARM', source: { sessionId: session.id } } },
    });
    const farmMorale = mocks.commitFarm.mock.calls[0][0].session.draftManifest.morale;
    expect(farmMorale.expectedTalentRankByPlayerId).toEqual({});
    expect(Object.keys(farmMorale.playerByPlayerId)).toHaveLength(session.completedPicks.length);
    expect(farmMorale.fanByTeamId).toBeNull();
    expect(JSON.stringify(farmMorale)).not.toMatch(/loyalty|ambition|resilience|charisma/i);
    expect(mocks.saveRoom.mock.invocationCallOrder[0]).toBeLessThan(mocks.commitFarm.mock.invocationCallOrder[0]);
    expect(await screen.findByTestId('navigation-target')).toHaveTextContent(`/league-builder/staff-hire?leagueId=${league.id}`);
  });

  test('a missing FARM player lookup uses neutral recap copy without exposing the internal id', async () => {
    const missingPlayerId = 'farm-internal-prospect-id-88';
    const completed = completedSession('FARM');
    setFarmData({
      ...completed,
      completedPicks: [
        { ...completed.completedPicks[0], playerId: missingPlayerId },
        completed.completedPicks[1],
      ],
    });
    renderRoom(`/snake-room?leagueId=${league.id}&phase=farm`);

    expect(await screen.findByRole('heading', { name: 'FARM DRAFT RECAP' })).toBeInTheDocument();
    expect(screen.getByText('UNKNOWN PLAYER')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(missingPlayerId);
    expect(document.body.innerHTML).not.toContain(missingPlayerId);

    fireEvent.click(screen.getByRole('button', { name: 'CONFIRM FARM DRAFT' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('THE DRAFT COULD NOT BE CONFIRMED. TRY AGAIN.');
    expect(document.body).not.toHaveTextContent(missingPlayerId);
    expect(document.body.innerHTML).not.toContain(missingPlayerId);
  });

  test('the first farm recap confirmation freezes the latest stored revision', async () => {
    const rendered = setFarmData();
    const fresh = { ...rendered, revision: 3 };
    const originalRead = mocks.data.getMlbDraftSession as (leagueId: string, seasonNumber: number) => Promise<LeagueBuilderMlbDraftSession>;
    let farmReads = 0;
    mocks.data.getMlbDraftSession = vi.fn(async (leagueId: string, seasonNumber: number) => {
      if (seasonNumber !== 2) return originalRead(leagueId, seasonNumber);
      farmReads += 1;
      return farmReads === 1 ? rendered : fresh;
    });

    renderRoom(`/snake-room?leagueId=${league.id}&phase=farm`);
    fireEvent.click(await screen.findByRole('button', { name: 'CONFIRM FARM DRAFT' }));

    await waitFor(() => expect(mocks.commitFarm).toHaveBeenCalled());
    expect(mocks.commitFarm.mock.calls[0][0].session.draftManifest.source.revision).toBe(3);
    expect(await screen.findByTestId('navigation-target')).toHaveTextContent('/league-builder/staff-hire');
  });

  test('an unconfirmed farm recap returns to a closed room and correction restores the actual prior slot', async () => {
    const completed = completedSession('FARM');
    const priorSession = {
      ...completed,
      completedPicks: completed.completedPicks.slice(0, 1),
      currentPickIndex: 1,
      revision: 1,
    };
    const session = {
      ...completed,
      snakeCompanions: { roomCode: '2468', claims: [] },
      correctionSnapshots: [{ action: 'pick' as const, priorSession }],
    };
    setFarmData(session);
    mocks.liveCorrectionAvailable = true;
    mocks.restorePreviousPublicState.mockResolvedValue({
      id: `live:${session.id}`,
      ownerUserId: 'completion-owner',
      sessionId: session.id,
      roomCode: session.snakeCompanions?.roomCode ?? '2468',
      phase: 'FARM',
      status: 'open',
      publicRevision: 2,
      publicState: buildSnakeLivePublicState(priorSession),
      correctionAvailable: false,
      hostDeviceId: 'completion-host-device',
      createdAt: session.createdDate,
      updatedAt: session.lastModified,
    });
    renderRoom(`/snake-room?leagueId=${league.id}&phase=farm`);

    fireEvent.click(await screen.findByRole('button', { name: 'BACK TO ROOM' }));
    expect(await screen.findByTestId('draft-complete-ritual-state')).toHaveTextContent('THE DRAFT IS COMPLETE');
    expect(screen.getByTestId('draft-complete-private-state')).toHaveTextContent('THE BOARD IS CLOSED');
    expect(screen.queryByRole('button', { name: 'DRAFT PROSPECT' })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain('PICK 2 PAYS');

    const correct = screen.getByRole('button', { name: 'CORRECT LAST ACTION' });
    await waitFor(() => expect(correct).not.toBeDisabled());
    fireEvent.click(correct);
    fireEvent.click(screen.getByRole('button', { name: 'UNDO LAST ACTION' }));
    await waitFor(() => expect(mocks.restorePreviousPublicState).toHaveBeenCalledWith({
      expectedRoomRevision: session.revision ?? 0,
      idempotencyKey: `farm-correct:live:${session.id}:${session.revision ?? 0}`,
    }));
    await waitFor(() => expect(mocks.saveRoom).toHaveBeenCalledWith(expect.objectContaining({
      currentPickIndex: 1,
      completedPicks: [expect.objectContaining({ playerId: 'f1' })],
    }), expect.any(Number)));
    expect(await screen.findByText('COMETS IS REVIEWING THE BOARD')).toBeInTheDocument();
    expect(screen.queryByTestId('draft-complete-ritual-state')).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'REVEAL COMETS SEAT' }));
    expect(await screen.findByRole('button', { name: 'DRAFT PROSPECT' })).toBeInTheDocument();
    expect(screen.getAllByText(/PICK 2 PAYS/).length).toBeGreaterThan(0);
  });

  test('a farm commit failure remains on recap and never navigates', async () => {
    setFarmData();
    mocks.commitFarm.mockRejectedValue(new Error('Farm commit failed'));
    renderRoom(`/snake-room?leagueId=${league.id}&phase=farm`);
    fireEvent.click(await screen.findByRole('button', { name: 'CONFIRM FARM DRAFT' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('THE DRAFT COULD NOT BE CONFIRMED. TRY AGAIN.');
    expect(screen.queryByTestId('navigation-target')).not.toBeInTheDocument();
  });
});
