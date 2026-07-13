import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  data: {} as Record<string, unknown>,
  farmPool: null as unknown,
  commitMlb: vi.fn(),
  commitFarm: vi.fn(),
  saveRoom: vi.fn(async (session: unknown) => session),
}));

vi.mock('../../hooks/useLeagueBuilderData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useLeagueBuilderData')>();
  return { ...actual, useLeagueBuilderData: () => mocks.data };
});

vi.mock('../../../utils/franchisePhase2Flags', () => ({ isSnakeDraftV1Enabled: () => true }));
vi.mock('../../utils/snakeSounds', () => ({
  loadSnakeSoundsEnabled: () => false,
  saveSnakeSoundsEnabled: vi.fn(),
  createSnakeSoundPlayer: () => ({ play: vi.fn() }),
}));
vi.mock('../../../utils/leagueBuilderAuctionPipeline', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/leagueBuilderAuctionPipeline')>();
  return {
    ...actual,
    commitCompletedSnakeSessionToLeagueRosters: mocks.commitMlb,
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
    getScoutProfilesForLeague: vi.fn(async () => []),
    saveMlbDraftRoomSession: mocks.saveRoom,
    freezeMlbDraftRoomSessionWithRegisteredPool: ({ session }: { session: unknown }) => mocks.saveRoom(session),
  };
});

import type { LeagueBuilderMlbDraftSession, LeagueTemplate, Player, RegisteredPool, Team } from '../../hooks/useLeagueBuilderData';
import SnakeDraftRoom from '../../app/pages/SnakeDraftRoom';
import { freezeSnakeDraftSession } from '../../../utils/snakeDraftManifest';

const league: LeagueTemplate = {
  id: 'completion-league', name: 'Completion League', teamIds: ['a', 'b'], conferences: [], divisions: [],
  defaultRulesPreset: 'standard', draftFormat: 'snake', tier: 'standard', balanceMode: 'taxed', salaryCap: 1_000_000,
  createdDate: '2026-01-01', lastModified: '2026-01-01',
};
const teams: Team[] = [
  { id: 'a', name: 'Kodiaks', abbreviation: 'KOD', location: 'North', nickname: 'Kodiaks', colors: { primary: '#234f32', secondary: '#f5d77a' }, stadium: 'A', controlledBy: 'human', leagueIds: [league.id], createdDate: '2026-01-01', lastModified: '2026-01-01' },
  { id: 'b', name: 'Comets', abbreviation: 'COM', location: 'South', nickname: 'Comets', colors: { primary: '#31543d', secondary: '#f3efdc' }, stadium: 'B', controlledBy: 'human', leagueIds: [league.id], createdDate: '2026-01-01', lastModified: '2026-01-01' },
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
    leagues: [league], teams, players, isLoading: false, error: null,
    getRegisteredPool: vi.fn(async () => pool), getMlbDraftSession: vi.fn(async () => session),
    saveMlbDraftSession: vi.fn(async (next) => next), getRoster: vi.fn(async () => ({ teamId: 'a', mlbRoster: [], farmRoster: [] })),
  };
  return session;
}

function setFarmData(session = completedSession('FARM')) {
  const prospects = [
    { ...player('f1', 'Fog', 'One', 'SS'), prospectProfile: { trueGrade: 'A', scoutedGrade: 'B', potentialGrade: 'A', scoutAccuracy: 50, scoutConfidence: 'low', scoutGradeError: 1, scoutSpecialtiesVisible: [], scoutWeaknessesVisible: [], methodVersion: 'v1', source: 'test', draftYear: 1, draftRound: 1, draftPick: 1, teamId: 'pool' } },
    { ...player('f2', 'Fog', 'Two', 'CF'), prospectProfile: { trueGrade: 'B', scoutedGrade: 'C', potentialGrade: 'B', scoutAccuracy: 50, scoutConfidence: 'low', scoutGradeError: 1, scoutSpecialtiesVisible: [], scoutWeaknessesVisible: [], methodVersion: 'v1', source: 'test', draftYear: 1, draftRound: 1, draftPick: 2, teamId: 'pool' } },
  ];
  mocks.farmPool = { leagueId: league.id, seasonNumber: 1, prospects, auctionPlayers: prospects.map((row, index) => ({ id: row.id, iv: 20_000 + index * 10_000 })) };
  mocks.data = {
    leagues: [league], teams, players: [], isLoading: false, error: null,
    getMlbDraftSession: vi.fn(async (_leagueId: string, seasonNumber: number) => seasonNumber === 2 ? session : completedSession('MLB')),
    saveMlbDraftSession: vi.fn(async (next) => next), getRoster: vi.fn(async (teamId: string) => ({ teamId, mlbRoster: [], farmRoster: [] })),
  };
  return session;
}

describe('snake draft durable completion and recap', () => {
  beforeEach(() => {
    mocks.commitMlb.mockReset().mockResolvedValue(undefined);
    mocks.commitFarm.mockReset().mockResolvedValue(undefined);
    mocks.saveRoom.mockClear();
  });
  afterEach(() => cleanup());

  test('a completed MLB reload opens truthful recap and commits once before Scout Hire navigation', async () => {
    const session = setMlbData();
    renderRoom(`/snake-room?leagueId=${league.id}`);
    expect(await screen.findByRole('heading', { name: 'MLB DRAFT RECAP' })).toBeInTheDocument();
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
    expect(mocks.saveRoom.mock.invocationCallOrder[0]).toBeLessThan(mocks.commitMlb.mock.invocationCallOrder[0]);
    expect(mocks.commitMlb).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('navigation-target')).toHaveTextContent(`/league-builder/scout-hire?leagueId=${league.id}`);
  });

  test('an MLB commit failure stays on recap and retries without premature navigation', async () => {
    setMlbData();
    mocks.commitMlb.mockRejectedValueOnce(new Error('MLB commit failed')).mockResolvedValueOnce(undefined);
    renderRoom(`/snake-room?leagueId=${league.id}`);
    fireEvent.click(await screen.findByRole('button', { name: 'CONFIRM MLB DRAFT' }));
    expect(await screen.findByText('MLB COMMIT FAILED')).toBeInTheDocument();
    expect(screen.queryByTestId('navigation-target')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'CONFIRM MLB DRAFT' }));
    expect(await screen.findByTestId('navigation-target')).toBeInTheDocument();
    const manifests = mocks.commitMlb.mock.calls.map(([input]) => JSON.stringify(input.session.draftManifest));
    expect(manifests[1]).toBe(manifests[0]);
  });

  test('a frozen reload recaps manifest picks even if mutable room progress is later corrupted', async () => {
    const frozen = freezeSnakeDraftSession({
      session: completedSession('MLB'),
      expectedPhase: 'MLB',
      poolPlayerIds: pool.players.map((player) => player.id),
      salaryByPlayerId: new Map(pool.players.map((player) => [player.id, player.iv])),
      frozenAt: '2026-07-12T12:00:00.000Z',
    });
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
    fireEvent.click(screen.getByRole('button', { name: 'CONFIRM MLB DRAFT' }));
    await waitFor(() => expect(mocks.commitMlb).toHaveBeenCalledWith(expect.objectContaining({
      session: expect.objectContaining({ draftManifest: frozen.draftManifest }),
    })));
    expect(await screen.findByTestId('navigation-target')).toHaveTextContent('/league-builder/scout-hire');
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
      pool: mocks.farmPool,
      session: { id: session.id, draftManifest: { phase: 'FARM', source: { sessionId: session.id } } },
    });
    expect(mocks.saveRoom.mock.invocationCallOrder[0]).toBeLessThan(mocks.commitFarm.mock.invocationCallOrder[0]);
    expect(await screen.findByTestId('navigation-target')).toHaveTextContent(`/league-builder/staff-hire?leagueId=${league.id}`);
  });

  test('a farm commit failure remains on recap and never navigates', async () => {
    setFarmData();
    mocks.commitFarm.mockRejectedValue(new Error('Farm commit failed'));
    renderRoom(`/snake-room?leagueId=${league.id}&phase=farm`);
    fireEvent.click(await screen.findByRole('button', { name: 'CONFIRM FARM DRAFT' }));
    expect(await screen.findByText('FARM COMMIT FAILED')).toBeInTheDocument();
    expect(screen.queryByTestId('navigation-target')).not.toBeInTheDocument();
  });
});
