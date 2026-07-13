import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  data: {} as Record<string, unknown>,
  roomState: null as LeagueBuilderMlbDraftSession | null,
  saveRoom: vi.fn(),
  guideAsk: vi.fn(),
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
vi.mock('../../../engines/snakeGuideTrade', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../engines/snakeGuideTrade')>();
  return { ...actual, primeSnakeGuideSeatingProof: vi.fn() };
});
vi.mock('../../app/components/snake/trade/tradeGuideModel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../app/components/snake/trade/tradeGuideModel')>();
  return {
    ...actual,
    guideForAskedPick: (input: Parameters<typeof actual.guideForAskedPick>[0]) => {
      mocks.guideAsk(input);
      return actual.guideForAskedPick(input);
    },
  };
});
vi.mock('../../../utils/leagueBuilderStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/leagueBuilderStorage')>();
  return {
    ...actual,
    saveMlbDraftRoomSession: async (next: LeagueBuilderMlbDraftSession, ...args: unknown[]) => {
      mocks.roomState = next;
      return mocks.saveRoom(next, ...args);
    },
    patchMlbDraftSessionSeatBoard: async (input: { teamId: string; board: SnakeSeatBoardRecord }) => {
      const current = mocks.roomState!;
      const next = { ...current, seatBoards: { ...current.seatBoards, [input.teamId]: input.board } };
      mocks.roomState = next;
      return mocks.saveRoom(next);
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
import { auctionMarginalTaxWithCaps, normalizeAuctionLuxuryCapsForLeagueSize } from '../../../engines/auctionLuxuryTax';
import { toConstructionPlayer } from '../../hooks/useLeagueBuilderData';
import { resolveLockedSeat } from '../../app/components/snake/desk/deskRoomModel';
import SnakeDraftRoom from '../../app/pages/SnakeDraftRoom';

const TEAM_IDS = ['a', 'b', 'c'] as const;
const league: LeagueTemplate = {
  id: 'snake-2a', name: 'Snake 2A', teamIds: [...TEAM_IDS], conferences: [], divisions: [],
  defaultRulesPreset: 'standard', draftFormat: 'snake', tier: 'standard', balanceMode: 'taxed', salaryCap: 10_000_000,
  createdDate: '2026-07-12', lastModified: '2026-07-12',
};
const teams = TEAM_IDS.map((id): Team => ({
  id, name: `Club ${id.toUpperCase()}`, abbreviation: id.toUpperCase(), location: 'Test', nickname: 'Club',
  colors: { primary: '#234f32', secondary: '#f5d77a' }, stadium: 'Test Park', controlledBy: 'human',
  leagueIds: [league.id], createdDate: '2026-07-12', lastModified: '2026-07-12',
}));

function player(id: string, position: Player['primaryPosition'], secondaryPosition?: Player['secondaryPosition']): Player {
  const pitcher = ['SP', 'SP/RP', 'RP', 'CP'].includes(position);
  return {
    id, firstName: id, lastName: 'Player', gender: 'F', age: 25, bats: 'R', throws: 'R',
    primaryPosition: position, secondaryPosition,
    power: pitcher ? 20 : 60, contact: pitcher ? 20 : 60, speed: 60, fielding: 60, arm: 60,
    velocity: pitcher ? 60 : 0, junk: pitcher ? 60 : 0, accuracy: pitcher ? 60 : 0, arsenal: pitcher ? ['4F'] : [],
    overallGrade: 'B', personality: 'Competitive', chemistry: 'Competitive', morale: 50, mojo: 'Normal', fame: 0,
    salary: 10_000, leagueAssignments: [], hiddenPersonalityModifiers: { loyalty: 50, ambition: 50, resilience: 50, charisma: 50 },
    createdDate: '2026-07-12', lastModified: '2026-07-12', isCustom: true,
  } as Player;
}

const players: Player[] = [
  player('gone-c', 'C'), player('a-replacement', '1B', 'C'), player('b-replacement', 'C'), player('c-replacement', 'C'), player('backup-c', 'C'),
  player('one-b', '1B'), player('two-b', '2B'), player('three-b', '3B'), player('short', 'SS'),
  player('left', 'LF'), player('center', 'CF'), player('right', 'RF'),
  ...Array.from({ length: 4 }, (_, index) => player(`sp-${index + 1}`, 'SP')),
  ...Array.from({ length: 3 }, (_, index) => player(`rp-${index + 1}`, 'RP')),
  player('closer', 'CP'), player('swing', 'SP/RP'),
  ...Array.from({ length: 8 }, (_, index) => player(`flex-${index + 1}`, index % 2 === 0 ? 'CF' : '1B')),
];

const pool: RegisteredPool = {
  leagueId: league.id, tier: 'standard', balanceMode: 'taxed',
  players: players.map((row, index) => ({ id: row.id, iv: 10_000 + index * 100, salary: 10_000 + index * 100 })),
  tierCap: 10_000_000, luxuryCaps: [], pickValueChart: [], totalSlots: players.length,
  poolSurplusWarning: false, locked: true, lockedAt: 1,
};

const baseSlots: Record<SnakeBoardSlotId, string> = {
  C: 'gone-c', '1B': 'one-b', '2B': 'two-b', '3B': 'three-b', SS: 'short', LF: 'left', CF: 'center', RF: 'right', BACKUP_C: 'backup-c',
  SP1: 'sp-1', SP2: 'sp-2', SP3: 'sp-3', SP4: 'sp-4', RP1: 'rp-1', RP2: 'rp-2', RP3: 'rp-3', CP: 'closer',
  FLEX1: 'flex-1', FLEX2: 'flex-2', FLEX3: 'flex-3', FLEX4: 'flex-4', SWING: 'swing',
};

function board(teamId: string): SnakeSeatBoardRecord {
  const replacement = `${teamId}-replacement`;
  return {
    slots: { ...baseSlots },
    rankings: {
      global: [replacement, ...players.map((row) => row.id).filter((id) => id !== replacement)],
      byPosition: {
        C: ['gone-c', replacement, 'backup-c'], '1B': ['one-b', 'a-replacement', 'flex-2'], '2B': ['two-b'], '3B': ['three-b'], SS: ['short'],
        LF: ['left'], CF: ['center', 'flex-1', 'flex-3', 'flex-5', 'flex-7'], RF: ['right'],
        SP: ['sp-1', 'sp-2', 'sp-3', 'sp-4'], 'SP/RP': ['swing'], RP: ['rp-1', 'rp-2', 'rp-3'], CP: ['closer'],
      },
      frozenPlayerIds: [],
    },
    revision: 1,
  };
}

function session(withCompletedPick: boolean): LeagueBuilderMlbDraftSession {
  return {
    id: 'mlb:snake-2a:1', leagueId: league.id, seasonNumber: 1, seed: 'snake-2a', workflowVersion: 'snake-v1', engineMethodVersion: 'snake-s1a',
    tier: 'standard', balanceMode: 'taxed', rounds: 1,
    pickOrder: TEAM_IDS.map((teamId, index) => ({ round: 1, pick: index + 1, teamId })),
    completedPicks: withCompletedPick ? [{ round: 1, pick: 1, teamId: 'a', playerId: 'gone-c', settledSalary: 10_000, marginalTax: 0 }] : [],
    currentPickIndex: withCompletedPick ? 1 : 0, revision: 1,
    seatBoards: Object.fromEntries(TEAM_IDS.map((teamId) => [teamId, board(teamId)])),
    snakeSetup: { poolPlayerIds: players.map((row) => row.id), versionSelections: {}, clubs: TEAM_IDS.map((teamId) => ({ teamId, hotseat: true })), orderSeed: 'snake-2a' },
    createdDate: '2026-07-12', lastModified: '2026-07-12',
  };
}

function renderRoom(source: LeagueBuilderMlbDraftSession, overrides: { teams?: Team[]; pool?: RegisteredPool; players?: Player[] } = {}) {
  mocks.roomState = source;
  mocks.data = {
    leagues: [league], teams: overrides.teams ?? teams, players: overrides.players ?? players, isLoading: false, error: null,
    getRegisteredPool: vi.fn(async () => overrides.pool ?? pool), getMlbDraftSession: vi.fn(async () => source),
    saveMlbDraftSession: vi.fn(async (next) => next),
  };
  return render(<MemoryRouter initialEntries={[`/snake-room?leagueId=${league.id}`]}><SnakeDraftRoom /></MemoryRouter>);
}

describe('SNAKE-MOCK-2A real page persistence seam', () => {
  beforeEach(() => {
    mocks.saveRoom.mockReset().mockImplementation(async (next) => next);
    mocks.guideAsk.mockReset();
  });
  afterEach(() => cleanup());

  test('reconciles three saved boards in one write without revealing any private seat', async () => {
    renderRoom(session(true));
    await screen.findByTestId('snake-draft-room');
    await waitFor(() => expect(mocks.saveRoom).toHaveBeenCalledTimes(1));
    const saved = mocks.saveRoom.mock.calls[0][0] as LeagueBuilderMlbDraftSession;
    for (const teamId of TEAM_IDS) expect(saved.seatBoards?.[teamId].slots.C).toBe(`${teamId}-replacement`);
    expect(screen.queryByTestId('private-draft-desk')).not.toBeInTheDocument();
    await act(async () => { await Promise.resolve(); });
    expect(mocks.saveRoom).toHaveBeenCalledTimes(1);
  });

  test('persists overall and position reorders through the page and refits the chosen slot', async () => {
    renderRoom(session(false));
    await screen.findByTestId('snake-draft-room');
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL CLUB A SEAT' }));
    fireEvent.click(await screen.findByRole('button', { name: 'RANKINGS' }));

    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(mocks.saveRoom).toHaveBeenCalledTimes(1));
    const afterOverall = mocks.saveRoom.mock.calls[0][0] as LeagueBuilderMlbDraftSession;
    expect(afterOverall.seatBoards?.a.rankings.global?.slice(0, 2)).toEqual(['gone-c', 'a-replacement']);

    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(mocks.saveRoom).toHaveBeenCalledTimes(2));
    const afterPosition = mocks.saveRoom.mock.calls[1][0] as LeagueBuilderMlbDraftSession;
    expect(afterPosition.seatBoards?.a.rankings.byPosition?.C?.slice(0, 2)).toEqual(['a-replacement', 'gone-c']);
    expect(afterPosition.seatBoards?.a.slots.C).toBe('a-replacement');
  });

  test('shows a recoverable room notice when a revision-safe write is rejected', async () => {
    renderRoom(session(false));
    await screen.findByTestId('snake-draft-room');
    mocks.saveRoom.mockClear();
    mocks.saveRoom.mockRejectedValueOnce(new Error('The draft moved before this action could be saved. Refresh and try again.'));
    fireEvent.click(screen.getByRole('button', { name: 'PAUSE' }));
    const notice = await screen.findByTestId('room-write-notice');
    expect(notice).toHaveTextContent('THE DRAFT MOVED BEFORE THIS ACTION COULD BE SAVED');
    expect(screen.getByTestId('snake-draft-room')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'DISMISS' }));
    expect(screen.queryByTestId('room-write-notice')).not.toBeInTheDocument();
  });

  test('retries a terminal room load failure without leaving the draft path', async () => {
    const source = session(false);
    mocks.roomState = source;
    const getRegisteredPool = vi.fn()
      .mockRejectedValueOnce(new Error('temporary room read failure'))
      .mockResolvedValueOnce(pool);
    mocks.data = {
      leagues: [league], teams, players, isLoading: false, error: null,
      getRegisteredPool,
      getMlbDraftSession: vi.fn(async () => source),
      saveMlbDraftSession: vi.fn(async (next) => next),
    };
    render(<MemoryRouter initialEntries={[`/snake-room?leagueId=${league.id}`]}><SnakeDraftRoom /></MemoryRouter>);
    expect(await screen.findByText(/temporary room read failure/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RETRY' }));
    expect(await screen.findByTestId('snake-draft-room')).toBeInTheDocument();
    expect(getRegisteredPool).toHaveBeenCalledTimes(2);
  });

  test('edits only an explicitly revealed off-clock board, fixes its trade-guide buyer, and restores the live draft path', async () => {
    const source = session(false);
    const originalA = structuredClone(source.seatBoards!.a);
    renderRoom(source);
    await screen.findByTestId('snake-draft-room');

    fireEvent.click(screen.getByRole('button', { name: 'CLUB B' }));
    expect(screen.queryByTestId('private-draft-desk')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'REVEAL CLUB B SEAT' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL CLUB B SEAT' }));
    const alternate = (await screen.findAllByRole('button', { name: /^SELECT / }))[1];
    const selectedId = alternate.getAttribute('data-player-id')!;
    const selectedPlayer = players.find((row) => row.id === selectedId)!;
    const selectedName = `${selectedPlayer.firstName} ${selectedPlayer.lastName}`;
    fireEvent.click(alternate);
    expect(screen.getByTestId('selected-player-card')).toHaveTextContent(selectedName);
    fireEvent.click(await screen.findByRole('button', { name: 'RANKINGS' }));
    expect(screen.queryByRole('button', { name: 'DRAFT PLAYER' })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(mocks.saveRoom).toHaveBeenCalledTimes(1));
    const saved = mocks.saveRoom.mock.calls[0][0] as LeagueBuilderMlbDraftSession;
    expect(saved.seatBoards?.a).toEqual(originalA);
    expect(saved.seatBoards?.b.rankings.global).not.toEqual(source.seatBoards?.b.rankings.global);
    expect(new Set(Object.values(saved.seatBoards!.b.slots))).toHaveLength(22);

    fireEvent.click(screen.getByRole('button', { name: 'GUIDE' }));
    fireEvent.change(screen.getByLabelText('WHAT WOULD IT COST TO REACH PICK N?'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'CHECK PICK 2' }));
    await waitFor(() => expect(mocks.guideAsk).toHaveBeenCalledWith(expect.objectContaining({ buyerTeamId: 'b', targetPick: 2 })));

    fireEvent.click(screen.getByRole('button', { name: 'CLUB A' }));
    expect(screen.queryByTestId('private-draft-desk')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL CLUB A SEAT' }));
    expect(await screen.findByRole('button', { name: 'DRAFT PLAYER' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'CLUB B' }));
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL CLUB B SEAT' }));
    expect(screen.getByTestId('selected-player-card')).toHaveTextContent(selectedName);
  });

  test('a recorded live pick selects the new on-clock club and opens its private seat covered', async () => {
    renderRoom(session(false));
    await screen.findByTestId('snake-draft-room');
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL CLUB A SEAT' }));
    fireEvent.click(await screen.findByRole('button', { name: 'DRAFT PLAYER' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'HOLD THE GAVEL' }));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1_100)); });
    await waitFor(() => expect(mocks.saveRoom).toHaveBeenCalledTimes(1));
    expect((mocks.saveRoom.mock.calls[0][0] as LeagueBuilderMlbDraftSession).completedPicks).toHaveLength(1);
    expect(screen.queryByTestId('private-draft-desk')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'REVEAL CLUB B SEAT' })).toBeInTheDocument();
  });

  test('public drafted money and chemistry update after a persisted pick and its correction while the private plan stays distinct', async () => {
    renderRoom(session(false));
    await screen.findByTestId('snake-draft-room');
    expect(screen.getByTestId('drafted-truth-a')).toHaveTextContent('0/22');
    expect(screen.getByTestId('drafted-truth-a')).toHaveTextContent('Competitive0 · L1');

    fireEvent.click(screen.getByRole('button', { name: 'REVEAL CLUB A SEAT' }));
    expect(await screen.findByTestId('plan-truth-strip')).toHaveTextContent('22/22');
    fireEvent.click(screen.getByRole('button', { name: 'DRAFT PLAYER' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'HOLD THE GAVEL' }));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1_100)); });
    await waitFor(() => expect(mocks.saveRoom).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'CLUB A' }));
    expect(screen.getByTestId('drafted-truth-a')).toHaveTextContent('1/22');
    expect(screen.getByTestId('drafted-truth-a')).toHaveTextContent('$10,100');
    expect(screen.getByTestId('drafted-truth-a')).toHaveTextContent('Competitive1 · L1');

    fireEvent.click(screen.getByRole('button', { name: 'CORRECT LAST ACTION' }));
    fireEvent.click(screen.getByRole('button', { name: 'UNDO LAST ACTION' }));
    await waitFor(() => expect(mocks.saveRoom).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('drafted-truth-a')).toHaveTextContent('0/22');
    expect(screen.getByTestId('drafted-truth-a')).toHaveTextContent('Competitive0 · L1');
  });

  test('records marginal tax with the session-locked archetype identity instead of mutable team identity', async () => {
    const source = session(false);
    source.snakeSetup!.clubs = source.snakeSetup!.clubs.map((club) => club.teamId === 'a' ? { ...club, archetypeId: 'murderers-row' } : club);
    const identityTeams = teams.map((team) => team.id === 'a'
      ? { ...team, capIdentity: { increase: [], decrease: ['POW'] } }
      : team);
    const identityPool: RegisteredPool = {
      ...pool,
      luxuryCaps: [{ group: 'hitters', stat: 'POW', topN: 1, cap: 1, penaltyCurve: 1, penaltyPer100: 100_000, minAdder: 1_000 }],
    };
    renderRoom(source, { teams: identityTeams, pool: identityPool });
    await screen.findByTestId('snake-draft-room');
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL CLUB A SEAT' }));
    fireEvent.click(await screen.findByRole('button', { name: 'DRAFT PLAYER' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'HOLD THE GAVEL' }));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1_100)); });
    await waitFor(() => expect(mocks.saveRoom).toHaveBeenCalledTimes(1));

    const saved = mocks.saveRoom.mock.calls[0][0] as LeagueBuilderMlbDraftSession;
    const pick = saved.completedPicks[0];
    const pickedPlayer = players.find((entry) => entry.id === pick.playerId)!;
    const normalized = normalizeAuctionLuxuryCapsForLeagueSize(identityPool.luxuryCaps, identityTeams.length);
    const lockedIdentity = resolveLockedSeat({ team: identityTeams[0], session: source }).capIdentity;
    const expected = auctionMarginalTaxWithCaps([], toConstructionPlayer(pickedPlayer), lockedIdentity, normalized);
    const mutable = auctionMarginalTaxWithCaps([], toConstructionPlayer(pickedPlayer), identityTeams[0].capIdentity, normalized);
    expect(expected).not.toBe(mutable);
    expect(pick.marginalTax).toBe(expected);
  });
});
