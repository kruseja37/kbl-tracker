import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { LeagueBuilderMlbDraftSession, LeagueTemplate, Team } from '../../../utils/leagueBuilderStorage';
import { buildSnakeLiveFarmCatalog } from '../../../utils/snakeLiveCatalog';
import {
  buildFarmLivePrivateBoard,
  seedFarmSeatBoard,
} from '../../app/components/snake/farm/farmRoomModel';

const mocks = vi.hoisted(() => ({
  writeBoard: vi.fn(),
  submitIntent: vi.fn(),
  refresh: vi.fn(async () => undefined),
  publicSession: null as LeagueBuilderMlbDraftSession | null,
  publicRevision: 1,
  intents: [] as Array<Record<string, unknown>>,
}));

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'owner', email: 'owner@example.test' },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    signIn: vi.fn(),
    signOut: vi.fn(async () => undefined),
  }),
}));

vi.mock('../../../utils/syncEngine', () => ({
  syncEngine: {
    enterLiveRoomIsolation: vi.fn(async () => undefined),
    leaveLiveRoomIsolation: vi.fn(),
  },
}));

vi.mock('../../../utils/franchisePhase2Flags', () => ({ isSnakeDraftV1Enabled: () => true }));
vi.mock('../../app/components/snake/setup/snakeSetupProofClient', () => ({
  fingerprintSnakeSetupProofInput: () => 'farm-proof',
  useSnakeSetupProofClient: () => ({ runProof: vi.fn() }),
}));
vi.mock('../../utils/snakeSounds', () => ({
  loadSnakeSoundsEnabled: () => true,
  createSnakeSoundPlayer: () => ({ play: vi.fn() }),
}));

const league: LeagueTemplate = {
  id: 'farm-league', name: 'Farm League', createdDate: 'now', lastModified: 'now',
  teamIds: ['a'], conferences: [], divisions: [], defaultRulesPreset: 'standard',
  draftFormat: 'snake', tier: 'standard', salaryCap: 1_000_000, balanceMode: 'taxed',
};

const team: Team = {
  id: 'a', name: 'Beewolves', abbreviation: 'BEES', location: 'Big Sky', nickname: 'Beewolves',
  colors: { primary: '#008f8c', secondary: '#ffcf2f' }, stadium: 'Founders Field',
  leagueIds: ['farm-league'], farmArchetypeKey: 'web-gems', mlbArchetypeKey: 'launch-and-leather',
  createdDate: 'now', lastModified: 'now',
};

const cards = [
  {
    id: 'p1', name: 'Mara Diaz', position: 'SS', scoutedGrade: 'A-' as const, gradeRange: 'A+–B',
    confidence: 'high' as const, scoutName: 'Own Scout', scoutsCall: 'SCOUT READ ONE.', eligiblePositions: ['SS', '2B'],
  },
  {
    id: 'p2', name: 'Jo Arm', position: 'SP', scoutedGrade: 'B' as const, gradeRange: 'A–C',
    confidence: 'medium' as const, scoutName: 'Own Scout', scoutsCall: 'SCOUT READ TWO.', eligiblePositions: ['SP'],
  },
];

const board = seedFarmSeatBoard({
  candidates: cards.map((card) => ({ id: card.id, eligiblePositions: card.eligiblePositions })),
  rankedIds: cards.map((card) => card.id),
  remainingTurns: 2,
});

const session: LeagueBuilderMlbDraftSession = {
  id: 'farm-session', leagueId: league.id, seasonNumber: 2, seed: 'farm-seed',
  workflowVersion: 'snake-v1-farm', engineMethodVersion: 'snake-s6', tier: 'standard',
  balanceMode: 'taxed', rounds: 2, draftPhase: 'FARM', farmSlotSalaries: [30_000, 10_000],
  pickOrder: [
    { round: 1, pick: 1, teamId: 'a' },
    { round: 2, pick: 2, teamId: 'a' },
  ],
  completedPicks: [], currentPickIndex: 0, revision: 1,
  snakeSetup: {
    poolPlayerIds: ['p1', 'p2'], versionSelections: {}, orderSeed: 'order',
    clubs: [{ teamId: 'a', gmName: 'GM One', hotseat: false, archetypeId: 'web-gems' }],
  },
  createdDate: 'now', lastModified: 'now',
};

const catalog = buildSnakeLiveFarmCatalog({
  league,
  teams: [team],
  prospects: [
    { id: 'p1', firstName: 'Mara', lastName: 'Diaz', primaryPosition: 'SS', secondaryPosition: '2B' },
    { id: 'p2', firstName: 'Jo', lastName: 'Arm', primaryPosition: 'SP' },
  ],
  existingFarmRostersByTeamId: { a: [] },
  activeTeamIds: ['a'],
  activeProspectIds: ['p1', 'p2'],
  farmTarget: 10,
});

const privatePayload = buildFarmLivePrivateBoard({ board, cards, farmBudget: 250_000 });

vi.mock('../../app/components/snake/companion/useSnakeLiveCompanionRoom', () => ({
  useSnakeLiveCompanionRoom: () => ({
    room: {
      id: 'room', ownerUserId: 'owner', sessionId: session.id, roomCode: '4321', phase: 'FARM', status: 'open',
      publicRevision: mocks.publicRevision, publicState: {}, hostDeviceId: 'host', createdAt: 'now', updatedAt: 'now',
    },
    catalog: { roomId: 'room', catalogRevision: 1, catalog, createdAt: 'now' },
    activeRoomId: 'room', publicSession: mocks.publicSession ?? session, deviceId: 'device-a',
    claims: [{
      id: 'claim', roomId: 'room', requestKey: 'claim', deviceId: 'device-a', gmName: 'GM One', teamId: 'a',
      status: 'approved', revision: 1, createdAt: 'now', resolvedAt: 'now',
    }],
    intents: mocks.intents,
    boardsByTeamId: {
      a: { roomId: 'room', teamId: 'a', boardRevision: 1, board: privatePayload, updatedByDeviceId: 'host', updatedAt: 'now' },
    },
    events: [], status: 'live', subscriptionStatus: 'SUBSCRIBED', error: null,
    working: false, accessReady: true, resumedFromCapability: false,
    refresh: mocks.refresh,
    claimDesk: vi.fn(),
    writeBoard: mocks.writeBoard,
    submitIntent: mocks.submitIntent,
    disconnect: vi.fn(async () => undefined),
  }),
}));

import SnakeCompanion from '../../app/pages/SnakeCompanion';

describe('FARM companion desk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.publicSession = session;
    mocks.publicRevision = 1;
    mocks.intents.length = 0;
    mocks.writeBoard.mockImplementation(async (input) => ({
      roomId: 'room', teamId: 'a', boardRevision: 2, board: input.board,
      updatedByDeviceId: 'device-a', updatedAt: 'later',
    }));
    mocks.submitIntent.mockResolvedValue({ id: 'intent' });
  });

  test('shows only scout-safe FARM data, saves its private board, and sends a pick without trades', async () => {
    render(<SnakeCompanion />);

    expect(await screen.findByRole('heading', { name: /Mara Diaz/i })).toBeInTheDocument();
    expect(screen.getByTestId('selected-farm-prospect-card')).toHaveTextContent('A-');
    expect(screen.queryByRole('button', { name: 'TRADE PICKS' })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/TRUE GRADE|POWER|VELOCITY|PROSPECT PROFILE/i);

    fireEvent.click(screen.getByRole('button', { name: 'Move Mara Diaz down' }));
    await waitFor(() => expect(mocks.writeBoard).toHaveBeenCalledOnce());
    const written = mocks.writeBoard.mock.calls[0][0];
    expect(written).toEqual(expect.objectContaining({ teamId: 'a', expectedBoardRevision: 1 }));
    expect(JSON.stringify(written.board)).not.toMatch(/trueGrade|prospectProfile|power|velocity/i);

    fireEvent.click(screen.getByRole('button', { name: 'SEND PICK TO HOTSEAT' }));
    await waitFor(() => expect(mocks.submitIntent).toHaveBeenCalledWith(expect.objectContaining({
      teamId: 'a', kind: 'pick', expectedRoomRevision: 1,
    })));
  });

  test('applies a host pick, removes the prospect from the private board, and advances the next request', async () => {
    const view = render(<SnakeCompanion />);
    expect(await screen.findByRole('heading', { name: /Mara Diaz/i })).toBeInTheDocument();

    mocks.publicRevision = 2;
    mocks.publicSession = {
      ...session,
      completedPicks: [{
        round: 1, pick: 1, teamId: 'a', playerId: 'p1', settledSalary: 30_000, marginalTax: 0,
      }],
      currentPickIndex: 1,
      revision: 2,
    };
    view.rerender(<SnakeCompanion />);

    expect(await screen.findByRole('heading', { name: /Jo Arm/i })).toBeInTheDocument();
    const boardRegion = screen.getByLabelText('Scouted prospect board');
    expect(within(boardRegion).queryByText('Mara Diaz')).not.toBeInTheDocument();
    expect(within(screen.getByLabelText('Drafted farm roster')).getByText(/SS · Mara Diaz/i)).toBeInTheDocument();
    expect(screen.getByText(/DRAFTED 1 · SPENT \$30,000/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'SEND PICK TO HOTSEAT' }));
    await waitFor(() => expect(mocks.submitIntent).toHaveBeenCalledWith(expect.objectContaining({
      teamId: 'a', kind: 'pick', expectedRoomRevision: 2,
      payload: expect.objectContaining({ playerId: 'p2', pick: 2, sessionRevision: 2 }),
    })));
  });
});
