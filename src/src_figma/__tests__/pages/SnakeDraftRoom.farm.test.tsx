import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { saveSession, getSession, getRoster } = vi.hoisted(() => ({
  saveSession: vi.fn(async (session) => ({ ...session })),
  getSession: vi.fn(),
  getRoster: vi.fn(),
}));

vi.mock('../../hooks/useLeagueBuilderData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useLeagueBuilderData')>();
  const leagues = [{ id: 'league-farm', name: 'Farm League', teamIds: ['a', 'b'], draftFormat: 'snake', tier: 'standard', balanceMode: 'taxed', salaryCap: 1_000_000 }];
  const teams = [
    { id: 'a', name: 'Comets', abbreviation: 'COM', colors: { primary: '#123', secondary: '#fff' }, controlledBy: 'human' },
    { id: 'b', name: 'Bears', abbreviation: 'BER', colors: { primary: '#456', secondary: '#fff' }, controlledBy: 'ai' },
  ];
  const players: never[] = [];
  return {
    ...actual,
    useLeagueBuilderData: () => ({
      leagues, teams, players, isLoading: false, error: null,
      getMlbDraftSession: getSession,
      saveMlbDraftSession: saveSession,
      getRoster,
    }),
  };
});

vi.mock('../../../utils/leagueBuilderStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/leagueBuilderStorage')>();
  return {
    ...actual,
    getScoutProfilesForLeague: vi.fn(async () => [
      { id: 'scout-a', leagueId: 'league-farm', teamId: 'a', name: 'Comets Eyes', specialties: [], weaknesses: [], accuracyByPosition: {}, seed: 'a', createdDate: 'now', lastModified: 'now' },
      { id: 'scout-b', leagueId: 'league-farm', teamId: 'b', name: 'Bears Eyes', specialties: [], weaknesses: [], accuracyByPosition: {}, seed: 'b', createdDate: 'now', lastModified: 'now' },
    ]),
    saveMlbDraftRoomSession: saveSession,
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
vi.mock('../../../utils/snakeSounds', () => ({ createSnakeSoundPlayer: () => ({ play: vi.fn() }) }));
vi.mock('../../../utils/leagueBuilderAuctionPipeline', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/leagueBuilderAuctionPipeline')>();
  return { ...actual, commitCompletedSnakeFarmSessionToLeagueRosters: vi.fn() };
});

import SnakeDraftRoom from '../../app/pages/SnakeDraftRoom';

describe('S6 farm room continuation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRoster.mockResolvedValue({ teamId: 'a', mlbRoster: [], farmRoster: [] });
    const mlbSession = {
      id: 'mlb-session', leagueId: 'league-farm', seasonNumber: 1, seed: 'mlb-seed',
      workflowVersion: 'snake-v1', engineMethodVersion: 'snake-s1a', tier: 'standard', balanceMode: 'taxed', rounds: 1,
      pickOrder: [{ round: 1, pick: 1, teamId: 'a' }, { round: 1, pick: 2, teamId: 'b' }],
      completedPicks: [{ round: 1, pick: 1, teamId: 'a', playerId: 'mlb-a' }, { round: 1, pick: 2, teamId: 'b', playerId: 'mlb-b' }],
      currentPickIndex: 2, revision: 0, createdDate: '2026-07-10', lastModified: '2026-07-10',
      snakeSetup: { poolPlayerIds: ['mlb-a', 'mlb-b'], versionSelections: {}, clubs: [{ teamId: 'a', hotseat: true }, { teamId: 'b', hotseat: true }], orderSeed: 'order' },
    };
    getSession.mockImplementation(async (_leagueId: string, seasonNumber: number) => seasonNumber === 2 ? null : mlbSession);
  });

  test('turns the completed MLB session into a frozen farm session and opens the same ritual room', async () => {
    render(<MemoryRouter initialEntries={['/snake-room?leagueId=league-farm&phase=farm']}><SnakeDraftRoom /></MemoryRouter>);

    await waitFor(() => expect(saveSession).toHaveBeenCalled());
    const created = saveSession.mock.calls[0][0];
    expect(created).toEqual(expect.objectContaining({ draftPhase: 'FARM', workflowVersion: 'snake-v1-farm', currentPickIndex: 0 }));
    expect(created.pickOrder).toHaveLength(20);
    expect(created.farmSlotSalaries).toHaveLength(20);
    expect(created.farmSlotSalaries[0]).toBe(3 * created.farmSlotSalaries.at(-1));
    expect(await screen.findByTestId('snake-draft-room')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /REVEAL COMETS SEAT/i }));
    expect(screen.getByRole('button', { name: 'DRAFT PROSPECT' })).toBeInTheDocument();
    expect(screen.getAllByText(/PICK 1 PAYS/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SCOUT’S CALL/).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/TRUE COST|SAFE TO WAIT|LIKELY GONE|LEGAL-FINISH|\bIV\b/);
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
});
