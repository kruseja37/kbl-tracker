import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const saveSession = vi.fn(async (session) => ({ ...session }));
const getSession = vi.fn();
const getRoster = vi.fn();

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
  return { ...actual, getScoutProfilesForLeague: vi.fn(async () => []) };
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
    expect(screen.getByRole('button', { name: 'COVER & ARM' })).toBeInTheDocument();
    expect(screen.getAllByText(/PICK 1 PAYS/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SCOUT’S CALL/).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/TRUE COST|SAFE TO WAIT|LIKELY GONE|LEGAL-FINISH|\bIV\b/);
  });
});
