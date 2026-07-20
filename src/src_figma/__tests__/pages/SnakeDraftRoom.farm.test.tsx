import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { FarmSeatBoardRecord, LeagueBuilderMlbDraftSession } from '../../../utils/leagueBuilderStorage';
import { buildSnakeOrder } from '../../../engines/leagueConstruction';

const { saveSession, getSession, getRoster, refresh, playerRows, farmLeagueRows, farmTeamRows } = vi.hoisted(() => ({
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
  };
});

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

describe('S6 farm room continuation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    playerRows.length = 0;
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
});
