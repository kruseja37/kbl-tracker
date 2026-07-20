import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { FarmSeatBoardRecord, LeagueBuilderMlbDraftSession } from '../../../utils/leagueBuilderStorage';
import { buildSnakeOrder } from '../../../engines/leagueConstruction';

const { saveSession, getSession, getRoster, refresh, playerRows, farmLeagueRows, farmTeamRows, live } = vi.hoisted(() => ({
  saveSession: vi.fn(async (session) => ({ ...session })),
  getSession: vi.fn(),
  getRoster: vi.fn(),
  refresh: vi.fn(async () => undefined),
  playerRows: [] as Array<Record<string, unknown>>,
  farmLeagueRows: [{ id: 'league-farm', name: 'Farm League', teamIds: ['a', 'b'], draftFormat: 'snake', tier: 'standard', balanceMode: 'taxed', salaryCap: 1_000_000 }],
  farmTeamRows: [
    { id: 'a', name: 'Comets', abbreviation: 'COM', colors: { primary: '#123', secondary: '#fff' }, controlledBy: 'human', farmArchetypeKey: 'web-gems' },
    { id: 'b', name: 'Bears', abbreviation: 'BER', colors: { primary: '#456', secondary: '#fff' }, controlledBy: 'ai', farmArchetypeKey: 'bomba-squad' },
  ],
  live: {
    enabled: false,
    correctionAvailable: false,
    claims: [] as Array<Record<string, unknown>>,
    intents: [] as Array<Record<string, unknown>>,
    seedBoard: vi.fn(async () => ({ teamId: 'a' })),
    resolveClaim: vi.fn(async (claim) => claim),
    resolveIntent: vi.fn(async (intent) => intent),
    publishSession: vi.fn(async () => null),
    restorePreviousPublicState: vi.fn(),
    refresh: vi.fn(async () => undefined),
    closeRoom: vi.fn(async () => null),
  },
}));

vi.mock('../../hooks/useLeagueBuilderData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useLeagueBuilderData')>();
  return {
    ...actual,
    useLeagueBuilderData: () => ({
      leagues: farmLeagueRows, teams: farmTeamRows, players: playerRows, isLoading: false, error: null,
      getMlbDraftSession: getSession,
      saveMlbDraftSession: saveSession,
      refresh,
    }),
  };
});

vi.mock('../../../utils/leagueBuilderStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/leagueBuilderStorage')>();
  const saveMergedSession = async (next: LeagueBuilderMlbDraftSession) => {
    const current = saveSession.mock.calls.at(-1)?.[0];
    const farmSeatBoards = { ...(current?.farmSeatBoards ?? {}), ...(next.farmSeatBoards ?? {}) };
    for (const [teamId, board] of Object.entries(current?.farmSeatBoards ?? {}) as Array<[string, FarmSeatBoardRecord]>) {
      if ((board.revision ?? 0) > (farmSeatBoards[teamId]?.revision ?? -1)) farmSeatBoards[teamId] = board;
    }
    return saveSession({ ...next, farmSeatBoards });
  };
  return {
    ...actual,
    getAllLeagueTemplates: vi.fn(async () => farmLeagueRows),
    getAllTeams: vi.fn(async () => farmTeamRows),
    getAllPlayers: vi.fn(async () => playerRows),
    getTeamRoster: (...args: unknown[]) => getRoster(...args),
    getScoutProfilesForLeague: vi.fn(async () => [
      { id: 'scout-a', leagueId: 'league-farm', teamId: 'a', name: 'Comets Eyes', specialties: [], weaknesses: [], accuracyByPosition: {}, seed: 'a', createdDate: 'now', lastModified: 'now' },
      { id: 'scout-b', leagueId: 'league-farm', teamId: 'b', name: 'Bears Eyes', specialties: [], weaknesses: [], accuracyByPosition: {}, seed: 'b', createdDate: 'now', lastModified: 'now' },
    ]),
    saveMlbDraftRoomSession: vi.fn(saveMergedSession),
    patchMlbDraftSessionFarmSeatBoard: vi.fn(async (input) => {
      const current = saveSession.mock.calls.at(-1)?.[0] ?? await getSession(input.leagueId, input.seasonNumber);
      return saveSession({
        ...current,
        farmSeatBoards: { ...current.farmSeatBoards, [input.teamId]: input.board },
      });
    }),
    patchMlbDraftSessionSnakeCompanions: vi.fn(async (input) => {
      const current = saveSession.mock.calls.at(-1)?.[0] ?? await getSession(input.leagueId, input.seasonNumber);
      return saveSession({
        ...current,
        snakeCompanions: input.patch(current.snakeCompanions, current),
      });
    }),
  };
});

vi.mock('../../app/components/snake/companion/useSnakeLiveHostRoom', () => ({
  useSnakeLiveHostRoom: (options: { session: LeagueBuilderMlbDraftSession | null }) => {
    const ready = live.enabled && Boolean(options.session?.snakeCompanions?.roomCode);
    const room = ready ? {
      id: 'farm-room', ownerUserId: 'owner', sessionId: options.session!.id,
      roomCode: options.session!.snakeCompanions!.roomCode, phase: 'FARM', status: 'open',
      publicRevision: 1, publicState: {}, hostDeviceId: 'host',
      correctionAvailable: live.correctionAvailable,
      createdAt: 'now', updatedAt: 'now',
    } : null;
    return {
      room,
      publicSession: room ? options.session : null,
      claims: live.claims,
      intents: live.intents,
      events: [], status: ready ? 'live' : 'idle', subscriptionStatus: ready ? 'SUBSCRIBED' : null,
      error: null, working: false, hostAccessReady: ready, liveRoomReady: ready, catalog: null,
      refresh: live.refresh,
      publishSession: live.publishSession,
      resolveClaim: live.resolveClaim,
      resolveIntent: live.resolveIntent,
      submitTradeIntent: vi.fn(),
      restorePreviousPublicState: live.restorePreviousPublicState,
      seedBoard: live.seedBoard,
      closeRoom: live.closeRoom,
    };
  },
}));

vi.mock('../../../utils/snakeLiveCapabilityStore', () => ({
  getOrCreateSnakeLiveDeviceId: vi.fn(async () => 'host-device'),
}));

vi.mock('../../../utils/franchisePhase2Flags', () => ({ isSnakeDraftV1Enabled: () => true }));
vi.mock('../../../utils/snakeRosterHandoff', () => ({
  assertSnakeRosterHandoffReady: vi.fn(async () => undefined),
}));
vi.mock('../../../utils/snakeSounds', () => ({ createSnakeSoundPlayer: () => ({ play: vi.fn() }) }));
vi.mock('../../../utils/leagueBuilderAuctionPipeline', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/leagueBuilderAuctionPipeline')>();
  return { ...actual, commitCompletedSnakeFarmSessionToLeagueRosters: vi.fn() };
});

import SnakeDraftRoom from '../../app/pages/SnakeDraftRoom';
import {
  buildSnakeRosterHandoff,
  freezeSnakeDraftSession,
} from '../../../utils/snakeDraftManifest';
import { buildSnakeLivePublicState } from '../../../utils/snakeLiveRoomSession';

describe('S6 farm room continuation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    playerRows.length = 0;
    live.enabled = false;
    live.correctionAvailable = false;
    live.claims.length = 0;
    live.intents.length = 0;
    live.restorePreviousPublicState.mockReset();
    getRoster.mockResolvedValue({ teamId: 'a', mlbRoster: [], farmRoster: [] });
    const originalPickOrder = buildSnakeOrder(['a', 'b'], 22);
    const tradedPickOrder = originalPickOrder.map((slot) => {
      if (slot.pick === 1) return { ...slot, teamId: 'b' };
      if (slot.pick === 3) return { ...slot, teamId: 'a' };
      return slot;
    });
    const mlbPlayerIds = tradedPickOrder.map((slot) => `mlb-${slot.pick}`);
    const mlbSession = {
      id: 'mlb-session', leagueId: 'league-farm', seasonNumber: 1, seed: 'mlb-seed',
      workflowVersion: 'snake-v1', engineMethodVersion: 'snake-s1a', tier: 'standard', balanceMode: 'taxed', rounds: 22,
      pickOrder: tradedPickOrder,
      completedPicks: tradedPickOrder.map((slot, index) => ({
        ...slot,
        playerId: mlbPlayerIds[index],
        settledSalary: 100_000,
        marginalTax: 0,
      })),
      trades: [{
        id: 'round-one-guide-trade', atPickIndex: 0, humanTeamId: 'b', cpuTeamId: 'a',
        humanPickNumbers: [3], cpuPickNumbers: [1], humanValue: 100, cpuValue: 100, greedMargin: 0,
      }],
      currentPickIndex: tradedPickOrder.length, revision: 1, createdDate: '2026-07-10', lastModified: '2026-07-10',
      snakeSetup: {
        poolPlayerIds: mlbPlayerIds,
        versionSelections: {},
        clubs: [
          { teamId: 'b', hotseat: true, farmArchetypeId: 'bomba-squad' },
          { teamId: 'a', hotseat: true, farmArchetypeId: 'web-gems' },
        ],
        orderSeed: 'ranked-club-order-is-not-draft-order',
      },
    };
    const frozenMlb = freezeSnakeDraftSession({
      session: mlbSession,
      expectedPhase: 'MLB',
      poolPlayerIds: mlbPlayerIds,
      salaryByPlayerId: new Map(mlbPlayerIds.map((playerId) => [playerId, 100_000])),
      frozenAt: '2026-07-12T11:00:00.000Z',
    });
    const handedOffMlb = {
      ...frozenMlb,
      rosterHandoff: buildSnakeRosterHandoff(frozenMlb, 'MLB', '2026-07-12T11:01:00.000Z'),
    };
    getSession.mockImplementation(async (_leagueId: string, seasonNumber: number) => seasonNumber === 2 ? null : handedOffMlb);
  });

  test('turns the completed MLB session into a frozen farm session and opens the same ritual room', async () => {
    render(<MemoryRouter initialEntries={['/snake-room?leagueId=league-farm&phase=farm']}><SnakeDraftRoom /></MemoryRouter>);

    await waitFor(() => expect(saveSession).toHaveBeenCalled());
    const created = saveSession.mock.calls[0][0];
    expect(created).toEqual(expect.objectContaining({ draftPhase: 'FARM', workflowVersion: 'snake-v1-farm', currentPickIndex: 0 }));
    expect(created.pickOrder).toHaveLength(20);
    expect(created.pickOrder.slice(0, 2).map((slot) => slot.teamId)).toEqual(['a', 'b']);
    expect(created.snakeSetup.clubs.map((club) => club.teamId)).toEqual(['a', 'b']);
    expect(created.snakeSetup.clubs).toEqual([
      expect.objectContaining({ teamId: 'a', archetypeId: 'web-gems' }),
      expect.objectContaining({ teamId: 'b', archetypeId: 'bomba-squad' }),
    ]);
    expect(created.farmSlotSalaries).toHaveLength(20);
    expect(created.farmSlotSalaries[0]).toBe(3 * created.farmSlotSalaries.at(-1));
    expect(await screen.findByTestId('snake-draft-room')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /REVEAL COMETS SEAT/i }));
    expect(screen.getByRole('button', { name: 'DRAFT PROSPECT' })).toBeInTheDocument();
    expect(screen.getAllByText(/PICK 1 PAYS/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SCOUT’S CALL/).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/TRUE COST|SAFE TO WAIT|LIKELY GONE|LEGAL-FINISH|\bIV\b/);
  });

  test('opens the FARM recap directly when every canonical club already has ten prospects', async () => {
    getRoster.mockImplementation(async (teamId: string) => ({
      teamId,
      mlbRoster: [],
      farmRoster: Array.from({ length: 10 }, (_, index) => `${teamId}-existing-${index + 1}`),
    }));

    render(<MemoryRouter initialEntries={['/snake-room?leagueId=league-farm&phase=farm']}><SnakeDraftRoom /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'FARM DRAFT RECAP' })).toBeInTheDocument();
    const created = saveSession.mock.calls[0][0];
    expect(created.pickOrder).toEqual([]);
    expect(created.completedPicks).toEqual([]);
    expect(created.farmSlotSalaries).toEqual([]);
    expect(created.snakeSetup.clubs.map((club: { teamId: string }) => club.teamId)).toEqual(['a', 'b']);
    expect(screen.queryByRole('heading', { name: 'THE FARM ROOM COULD NOT OPEN' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CONFIRM FARM DRAFT' })).toBeInTheDocument();
  });

  test('shows saved partial FARM players in the public club lens before the first live pick', async () => {
    playerRows.push(
      { id: 'a-existing-c', firstName: 'Ari', lastName: 'Backstop', primaryPosition: 'C', salary: 10_000 },
      { id: 'a-existing-sp', firstName: 'Kai', lastName: 'Starter', primaryPosition: 'SP', salary: 10_000 },
      { id: 'b-existing-ss', firstName: 'Bo', lastName: 'Glove', primaryPosition: 'SS', salary: 10_000 },
    );
    getRoster.mockImplementation(async (teamId: string) => ({
      teamId,
      mlbRoster: [],
      farmRoster: teamId === 'a' ? ['a-existing-c', 'a-existing-sp'] : ['b-existing-ss'],
    }));

    render(<MemoryRouter initialEntries={['/snake-room?leagueId=league-farm&phase=farm']}><SnakeDraftRoom /></MemoryRouter>);

    expect(await screen.findByText('C · Ari Backstop')).toBeInTheDocument();
    expect(screen.getByText('SP · Kai Starter')).toBeInTheDocument();
    expect(screen.queryByText('NO PICKS RECORDED YET.')).not.toBeInTheDocument();
  });

  test('seeds all private farm boards once and lets an off-clock club reorder but not draft', async () => {
    render(<MemoryRouter initialEntries={['/snake-room?leagueId=league-farm&phase=farm']}><SnakeDraftRoom /></MemoryRouter>);

    await waitFor(() => expect(saveSession.mock.calls.some(([saved]) => saved.farmSeatBoards?.a && saved.farmSeatBoards?.b)).toBe(true));
    const seeded = saveSession.mock.calls.findLast(([saved]) => saved.farmSeatBoards?.a && saved.farmSeatBoards?.b)?.[0];
    expect(seeded.farmSeatBoards.a.plannedProspectIds).toHaveLength(10);
    expect(seeded.farmSeatBoards.b.plannedProspectIds).toHaveLength(10);
    expect(JSON.stringify(seeded.farmSeatBoards)).not.toMatch(/trueGrade|scoutedGrade|\biv\b|power|contact|velocity/i);

    fireEvent.click(screen.getByRole('button', { name: /Bears pick 2/i }));
    expect(document.body).not.toHaveTextContent('Comets Eyes');
    expect(await screen.findByRole('button', { name: /REVEAL BEARS SEAT/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /REVEAL BEARS SEAT/i }));
    expect(document.body).toHaveTextContent('Bears Eyes');
    expect(document.body).not.toHaveTextContent('Comets Eyes');
    expect(screen.queryByRole('button', { name: 'DRAFT PROSPECT' })).not.toBeInTheDocument();
    const moveDown = screen.getAllByRole('button', { name: /Move .* down/i }).find((button) => !button.hasAttribute('disabled'))!;
    fireEvent.click(moveDown);
    await waitFor(() => {
      const last = saveSession.mock.calls.at(-1)?.[0];
      expect(last.farmSeatBoards.b.revision).toBeGreaterThan(seeded.farmSeatBoards.b.revision);
      expect(last.farmSeatBoards.a).toEqual(seeded.farmSeatBoards.a);
    });
    const afterOverall = saveSession.mock.calls.at(-1)?.[0];
    const position = Object.keys(afterOverall.farmSeatBoards.b.byPosition).find((key) => afterOverall.farmSeatBoards.b.byPosition[key].length > 1)!;
    fireEvent.click(screen.getByRole('button', { name: position }));
    const positionMoveDown = screen.getAllByRole('button', { name: /Move .* down/i }).find((button) => !button.hasAttribute('disabled'))!;
    fireEvent.click(positionMoveDown);
    await waitFor(() => {
      const last = saveSession.mock.calls.at(-1)?.[0];
      expect(last.farmSeatBoards.b.byPosition[position]).not.toEqual(afterOverall.farmSeatBoards.b.byPosition[position]);
      expect(last.farmSeatBoards.b.overall).not.toEqual(afterOverall.farmSeatBoards.b.overall);
      expect(last.farmSeatBoards.a).toEqual(afterOverall.farmSeatBoards.a);
    });

    fireEvent.click(screen.getByRole('button', { name: /^Comets pick 1$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /REVEAL COMETS SEAT/i }));
    expect(screen.getByRole('button', { name: 'DRAFT PROSPECT' })).toBeInTheDocument();
  });

  test('does not expose a trade guide or commissioner trade path in the farm room', async () => {
    render(<MemoryRouter initialEntries={['/snake-room?leagueId=league-farm&phase=farm']}><SnakeDraftRoom /></MemoryRouter>);

    expect(await screen.findByTestId('snake-draft-room')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'THE GUIDE' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'TRADE' })).not.toBeInTheDocument();
    expect(screen.getByText('REMAINING PICKS')).toBeInTheDocument();
    expect(screen.queryByText('OWNED, TRADEABLE PICKS')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/tradeable|pick or trade/i);
  });

  test('publishes a FARM pick through the host authority before it advances the local room', async () => {
    live.enabled = true;
    render(<MemoryRouter initialEntries={['/snake-room?leagueId=league-farm&phase=farm']}><SnakeDraftRoom /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: /REVEAL COMETS SEAT/i }));
    const selectedCard = await screen.findByTestId('selected-farm-prospect-card');
    const selectedName = selectedCard.querySelector('h2')?.textContent;
    expect(selectedName).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'DRAFT PROSPECT' }));
    fireEvent.pointerDown(await screen.findByRole('button', { name: 'HOLD THE GAVEL' }));

    await waitFor(() => expect(live.publishSession).toHaveBeenCalledOnce(), { timeout: 2_500 });
    const publication = live.publishSession.mock.calls[0][0];
    expect(publication).toEqual(expect.objectContaining({
      expectedRoomRevision: 1,
      eventKind: 'PICK_RECORDED',
      status: 'open',
    }));
    expect(publication.session.currentPickIndex).toBe(1);
    expect(publication.session.completedPicks).toEqual([
      expect.objectContaining({ pick: 1, teamId: 'a' }),
    ]);
    expect(publication.session.farmSeatBoards).toBeUndefined();
    expect(publication.session.farmProspectSnapshot).toBeUndefined();
    expect(publication.publicEvent).toEqual(expect.objectContaining({ pick: 1, teamId: 'a' }));
  });

  test('uses the live recovery slot for FARM correction and has no pause action', async () => {
    live.enabled = true;
    live.correctionAvailable = true;
    live.restorePreviousPublicState.mockImplementation(async () => {
      const current = saveSession.mock.calls.at(-1)?.[0];
      return {
        id: 'farm-room', ownerUserId: 'owner', sessionId: current.id,
        roomCode: current.snakeCompanions.roomCode, phase: 'FARM', status: 'open',
        publicRevision: 2, publicState: buildSnakeLivePublicState(current),
        correctionAvailable: false, hostDeviceId: 'host', createdAt: 'now', updatedAt: 'later',
      };
    });
    render(<MemoryRouter initialEntries={['/snake-room?leagueId=league-farm&phase=farm']}><SnakeDraftRoom /></MemoryRouter>);

    await waitFor(() => expect(saveSession.mock.calls.some(([saved]) => (
      saved.farmSeatBoards?.a && saved.farmSeatBoards?.b
    ))).toBe(true));
    fireEvent.click(await screen.findByRole('button', { name: 'I HAVE THE ROOM' }));
    const correct = await screen.findByRole('button', { name: 'CORRECT LAST ACTION' });
    expect(screen.queryByRole('button', { name: 'PAUSE' })).not.toBeInTheDocument();
    await act(async () => { fireEvent.click(correct); });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'UNDO LAST ACTION' }));
    });

    await waitFor(() => expect(live.restorePreviousPublicState).toHaveBeenCalledWith({
      expectedRoomRevision: 1,
      idempotencyKey: 'farm-correct:farm-room:1',
    }));
  });

  test('opens FARM companion approvals and seeds only the approved club scout board', async () => {
    live.enabled = true;
    live.claims.push({
      id: 'claim-a', roomId: 'farm-room', requestKey: 'request-a', deviceId: 'device-a',
      gmName: 'GM A', teamId: 'a', status: 'pending', revision: 1,
      createdAt: 'now', resolvedAt: null,
    });
    render(<MemoryRouter initialEntries={['/snake-room?leagueId=league-farm&phase=farm']}><SnakeDraftRoom /></MemoryRouter>);

    const companions = await screen.findByRole('button', { name: /COMPANIONS/ });
    fireEvent.click(companions);
    const approve = await screen.findByRole('button', { name: 'APPROVE COMETS' });
    await waitFor(() => expect(approve).not.toBeDisabled());
    fireEvent.click(approve);

    await waitFor(() => expect(live.seedBoard).toHaveBeenCalledOnce());
    expect(live.resolveClaim).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'claim-a' }),
      'approved',
      'farm-claim:claim-a:1:approved',
    );
    const payload = live.seedBoard.mock.calls[0][0].board;
    expect(payload.formatVersion).toBe('snake-live-farm-private-board-v1');
    expect(JSON.stringify(payload)).toContain('Comets Eyes');
    expect(JSON.stringify(payload)).not.toMatch(/trueGrade|prospectProfile|power|contact|velocity|hiddenPersonality/i);
    expect(screen.queryByRole('button', { name: 'TRADE' })).not.toBeInTheDocument();
  });
});
