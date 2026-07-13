import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  data: {} as Record<string, unknown>,
  roomState: null as LeagueBuilderMlbDraftSession | null,
  saveRoom: vi.fn(),
  patchBoard: vi.fn(),
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
  return {
    ...actual,
    primeSnakeGuideSeatingProof: vi.fn((input: Parameters<typeof actual.primeSnakeGuideSeatingProof>[0]) => (
      actual.primeSnakeGuideSeatingProof(input)
    )),
  };
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
    updateMlbDraftSessionAtomically: async (
      _leagueId: string,
      _seasonNumber: number,
      update: (current: LeagueBuilderMlbDraftSession) => LeagueBuilderMlbDraftSession,
    ) => {
      const prior = mocks.roomState!;
      const next = update(prior);
      mocks.roomState = next;
      const roomLogOnly = prior.completedPicks.length === next.completedPicks.length
        && prior.currentPickIndex === next.currentPickIndex
        && prior.paused === next.paused
        && JSON.stringify(prior.pickOrder) === JSON.stringify(next.pickOrder)
        && JSON.stringify(prior.seatBoards) === JSON.stringify(next.seatBoards)
        && JSON.stringify(prior.openTradeOffers) === JSON.stringify(next.openTradeOffers)
        && JSON.stringify(prior.trades) === JSON.stringify(next.trades);
      return roomLogOnly ? next : mocks.saveRoom(next);
    },
    patchMlbDraftSessionSeatBoard: (...args: unknown[]) => mocks.patchBoard(...args),
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
import { canonicalDeskEligiblePositions, isCandidateEligibleForBoardSlot } from '../../app/components/snake/desk/deskModel';
import { resolveLockedSeat } from '../../app/components/snake/desk/deskRoomModel';
import SnakeDraftRoom from '../../app/pages/SnakeDraftRoom';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function changedSlotCount(before: SnakeSeatBoardRecord, after: SnakeSeatBoardRecord): number {
  return (Object.keys(before.slots) as SnakeBoardSlotId[])
    .filter((slotId) => before.slots[slotId] !== after.slots[slotId]).length;
}

function truthMoney(testId: string, label: string): string {
  const strip = screen.getByTestId(testId);
  const heading = Array.from(strip.querySelectorAll('p')).find((node) => node.textContent === label);
  return heading?.parentElement?.querySelector('strong')?.textContent ?? '';
}

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
  const replacement = id === 'a-replacement';
  return {
    id, firstName: id, lastName: 'Player', gender: 'F', age: 25, bats: 'R', throws: 'R',
    primaryPosition: position, secondaryPosition,
    power: replacement ? 90 : pitcher ? 20 : 60, contact: pitcher ? 20 : 60, speed: 60, fielding: 60, arm: 60,
    velocity: pitcher ? 60 : 0, junk: pitcher ? 60 : 0, accuracy: pitcher ? 60 : 0, arsenal: pitcher ? ['4F'] : [],
    overallGrade: 'B', personality: replacement ? 'Spirited' : 'Competitive', chemistry: replacement ? 'Spirited' : 'Competitive', morale: 50, mojo: 'Normal', fame: 0,
    salary: 10_000, leagueAssignments: [], hiddenPersonalityModifiers: { loyalty: 50, ambition: 50, resilience: 50, charisma: 50 },
    createdDate: '2026-07-12', lastModified: '2026-07-12', isCustom: true,
  } as Player;
}

function legalDepth(prefix: string): Player[] {
  return [
    player(`${prefix}-c`, 'C'), player(`${prefix}-1b`, '1B'), player(`${prefix}-2b`, '2B'),
    player(`${prefix}-3b`, '3B'), player(`${prefix}-ss`, 'SS'), player(`${prefix}-lf`, 'LF'),
    player(`${prefix}-cf`, 'CF'), player(`${prefix}-rf`, 'RF'), player(`${prefix}-backup-c`, '1B', 'C'),
    ...Array.from({ length: 4 }, (_, index) => player(`${prefix}-sp-${index + 1}`, 'SP')),
    ...Array.from({ length: 3 }, (_, index) => player(`${prefix}-rp-${index + 1}`, 'RP')),
    player(`${prefix}-cp`, 'CP'),
    player(`${prefix}-flex-1`, '1B'), player(`${prefix}-flex-2`, '2B'),
    player(`${prefix}-flex-3`, '3B'), player(`${prefix}-flex-4`, 'SS'),
    player(`${prefix}-swing`, 'SP/RP'),
  ];
}

const players: Player[] = [
  player('gone-c', 'C'), player('a-replacement', '1B', 'C'), player('b-replacement', 'C'), player('c-replacement', 'C'), player('backup-c', 'C'),
  player('one-b', '1B'), player('two-b', '2B'), player('three-b', '3B'), player('short', 'SS'),
  player('left', 'LF'), player('center', 'CF'), player('right', 'RF'),
  ...Array.from({ length: 4 }, (_, index) => player(`sp-${index + 1}`, 'SP')),
  ...Array.from({ length: 3 }, (_, index) => player(`rp-${index + 1}`, 'RP')),
  player('closer', 'CP'), player('swing', 'SP/RP'),
  ...Array.from({ length: 8 }, (_, index) => player(`flex-${index + 1}`, index % 2 === 0 ? 'CF' : '1B')),
  ...Array.from({ length: 4 }, (_, index) => legalDepth(`depth-${index + 1}`)).flat(),
];

const pool: RegisteredPool = {
  leagueId: league.id, tier: 'standard', balanceMode: 'taxed',
  players: players.map((row, index) => ({ id: row.id, iv: 10_000 + index * 100, salary: 10_000 + index * 100 })),
  tierCap: 10_000_000,
  luxuryCaps: [{ group: 'hitters', stat: 'POW', topN: 1, cap: 0, penaltyCurve: 1, penaltyPer100: 1_000, minAdder: 100 }],
  pickValueChart: [], totalSlots: players.length,
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

async function revealSeatAndSettle(teamName: string): Promise<void> {
  mocks.saveRoom.mockClear();
  fireEvent.click(screen.getByRole('button', { name: `REVEAL ${teamName.toUpperCase()} SEAT` }));
  await screen.findByTestId('private-draft-desk');
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 75)); });
  mocks.saveRoom.mockClear();
}

describe('SNAKE-MOCK-2A real page persistence seam', () => {
  beforeEach(() => {
    mocks.saveRoom.mockReset().mockImplementation(async (next) => next);
    mocks.patchBoard.mockReset().mockImplementation(async (input: {
      teamId: string;
      board: SnakeSeatBoardRecord;
      expectedBoardRevision: number;
    }) => {
      const current = mocks.roomState!;
      if (current.seatBoards?.[input.teamId]?.revision !== input.expectedBoardRevision) {
        throw new Error('board revision changed');
      }
      const next = { ...current, seatBoards: { ...current.seatBoards, [input.teamId]: input.board } };
      mocks.roomState = next;
      return mocks.saveRoom(next);
    });
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

  test('refits only the active club plan after every reorder and restores the exact prior board with Undo', async () => {
    const source = session(false);
    const originalA = structuredClone(source.seatBoards!.a);
    const untouchedB = structuredClone(source.seatBoards!.b);
    const untouchedC = structuredClone(source.seatBoards!.c);
    renderRoom(source);
    await screen.findByTestId('snake-draft-room');
    await revealSeatAndSettle('Club A');
    fireEvent.click(screen.getByRole('button', { name: 'BOARD' }));
    const initialPlanTruth = screen.getByTestId('plan-truth-strip').textContent;
    const initialTax = truthMoney('plan-truth-strip', 'TAX');
    expect(initialTax).toBe('$700');
    expect(screen.getByTestId('plan-truth-strip')).toHaveTextContent('Competitive22 · L3');
    expect(screen.getByTestId('plan-truth-strip')).toHaveTextContent('Spirited0 · L1');
    fireEvent.click(await screen.findByRole('button', { name: 'RANKINGS' }));

    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(mocks.saveRoom).toHaveBeenCalledTimes(1));
    const afterOverall = mocks.saveRoom.mock.calls[0][0] as LeagueBuilderMlbDraftSession;
    expect(mocks.patchBoard.mock.calls[0][0]).toMatchObject({ teamId: 'a', expectedBoardRevision: originalA.revision });
    expect(afterOverall.seatBoards?.a.rankings.global?.slice(0, 2)).toEqual(['gone-c', 'a-replacement']);
    expect(Object.values(afterOverall.seatBoards!.a.slots)).toContain('a-replacement');
    expect(new Set(Object.values(afterOverall.seatBoards!.a.slots))).toHaveLength(22);
    expect(Object.entries(afterOverall.seatBoards!.a.slots).every(([slotId, playerId]) => {
      const stored = players.find((entry) => entry.id === playerId)!;
      const eligiblePositions = canonicalDeskEligiblePositions(stored.primaryPosition, stored.secondaryPosition);
      return isCandidateEligibleForBoardSlot(slotId as SnakeBoardSlotId, {
        id: stored.id,
        position: eligiblePositions[0]!,
        eligiblePositions,
      });
    })).toBe(true);
    expect(afterOverall.seatBoards?.b).toEqual(untouchedB);
    expect(afterOverall.seatBoards?.c).toEqual(untouchedC);
    const firstChangedCount = changedSlotCount(originalA, afterOverall.seatBoards!.a);
    expect(firstChangedCount).toBeGreaterThan(0);
    expect(await screen.findByTestId('main-board-update-banner'))
      .toHaveTextContent(`MY BOARD UPDATED — ${firstChangedCount} SLOT${firstChangedCount === 1 ? '' : 'S'} CHANGED.`);

    fireEvent.click(screen.getByRole('button', { name: 'BOARD' }));
    expect(screen.getByTestId('plan-truth-strip').textContent).not.toBe(initialPlanTruth);
    const frozenIv = new Map(pool.players.map((row) => [row.id, row.iv]));
    const expectedSalary = Object.values(afterOverall.seatBoards!.a.slots)
      .reduce((sum, playerId) => sum + frozenIv.get(playerId)!, 0);
    const expectedTax = 1_000;
    const expectedAllIn = expectedSalary + expectedTax;
    const expectedMoneyLeft = pool.tierCap - expectedAllIn;
    expect(truthMoney('plan-truth-strip', 'SALARY')).toBe(`$${expectedSalary.toLocaleString()}`);
    expect(truthMoney('plan-truth-strip', 'TAX')).toBe(`$${expectedTax.toLocaleString()}`);
    expect(truthMoney('plan-truth-strip', 'ALL-IN')).toBe(`$${expectedAllIn.toLocaleString()}`);
    expect(truthMoney('plan-truth-strip', 'MONEY LEFT')).toBe(`$${expectedMoneyLeft.toLocaleString()}`);
    expect(screen.getByTestId('plan-truth-strip')).toHaveTextContent('22/22');
    expect(screen.getByTestId('plan-truth-strip')).toHaveTextContent('Competitive21 · L3');
    expect(screen.getByTestId('plan-truth-strip')).toHaveTextContent('Spirited1 · L1');
    expect(screen.getByTestId('plan-truth-strip')).toHaveTextContent('Crafty0 · L1');
    expect(screen.getByTestId('plan-truth-strip')).toHaveTextContent('Disciplined0 · L1');
    expect(screen.getByTestId('plan-truth-strip')).toHaveTextContent('Scholarly0 · L1');
    fireEvent.click(screen.getByRole('button', { name: 'RANKINGS' }));

    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(mocks.saveRoom).toHaveBeenCalledTimes(2));
    const afterPosition = mocks.saveRoom.mock.calls[1][0] as LeagueBuilderMlbDraftSession;
    expect(mocks.patchBoard.mock.calls[1][0]).toMatchObject({ teamId: 'a', expectedBoardRevision: afterOverall.seatBoards!.a.revision });
    expect(afterPosition.seatBoards?.a.rankings.byPosition?.C?.slice(0, 2)).toEqual(['a-replacement', 'gone-c']);
    expect(afterPosition.seatBoards?.a.slots).not.toEqual(afterOverall.seatBoards?.a.slots);
    expect(new Set(Object.values(afterPosition.seatBoards!.a.slots))).toHaveLength(22);
    expect(afterPosition.seatBoards?.b).toEqual(untouchedB);
    expect(afterPosition.seatBoards?.c).toEqual(untouchedC);

    fireEvent.click(await screen.findByRole('button', { name: 'UNDO BOARD UPDATE' }));
    await waitFor(() => expect(mocks.saveRoom).toHaveBeenCalledTimes(3));
    const restored = (mocks.saveRoom.mock.calls[2][0] as LeagueBuilderMlbDraftSession).seatBoards!.a;
    expect(mocks.patchBoard.mock.calls[2][0]).toMatchObject({ teamId: 'a', expectedBoardRevision: afterPosition.seatBoards!.a.revision });
    expect(restored.slots).toEqual(afterOverall.seatBoards!.a.slots);
    expect(restored.rankings).toEqual(afterOverall.seatBoards!.a.rankings);
    expect(restored.revision).toBe(afterPosition.seatBoards!.a.revision + 1);
    expect(screen.queryByRole('button', { name: 'UNDO BOARD UPDATE' })).not.toBeInTheDocument();
  }, 10_000);

  test('rapid double Undo produces exactly one revision-safe restore and no false stale error', async () => {
    const source = session(false);
    const originalA = structuredClone(source.seatBoards!.a);
    renderRoom(source);
    await screen.findByTestId('snake-draft-room');
    await revealSeatAndSettle('Club A');
    fireEvent.click(await screen.findByRole('button', { name: 'RANKINGS' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(mocks.patchBoard).toHaveBeenCalledTimes(1));

    const undo = await screen.findByRole('button', { name: 'UNDO BOARD UPDATE' });
    fireEvent.click(undo);
    fireEvent.click(undo);
    await waitFor(() => expect(mocks.patchBoard).toHaveBeenCalledTimes(2));

    const restored = mocks.patchBoard.mock.calls[1][0].board as SnakeSeatBoardRecord;
    expect(restored.slots).toEqual(originalA.slots);
    expect(restored.rankings).toEqual(originalA.rankings);
    expect(mocks.patchBoard.mock.calls[1][0]).toMatchObject({ expectedBoardRevision: originalA.revision + 1 });
    expect(mocks.patchBoard).toHaveBeenCalledTimes(2);
    expect(mocks.saveRoom).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('room-write-notice')).not.toBeInTheDocument();
    expect(screen.queryByText(/THE DRAFT MOVED BEFORE UNDO/i)).not.toBeInTheDocument();
  });

  test('an unrelated room write error does not consume a valid private-board Undo', async () => {
    renderRoom(session(false));
    await screen.findByTestId('snake-draft-room');
    await revealSeatAndSettle('Club A');
    fireEvent.click(await screen.findByRole('button', { name: 'RANKINGS' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(mocks.patchBoard).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('main-board-update-banner')).toBeInTheDocument();

    mocks.saveRoom.mockRejectedValueOnce(new Error('unrelated commissioner sync error'));
    fireEvent.click(screen.getByRole('button', { name: 'PAUSE' }));
    expect(await screen.findByTestId('room-write-notice')).toHaveTextContent('UNRELATED COMMISSIONER SYNC ERROR');
    expect(screen.getByTestId('main-board-update-banner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'UNDO BOARD UPDATE' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'DISMISS' }));
    expect(screen.queryByTestId('room-write-notice')).not.toBeInTheDocument();
    expect(screen.getByTestId('main-board-update-banner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'UNDO BOARD UPDATE' })).toBeInTheDocument();
  }, 10_000);

  test('a deferred private-board save cannot restore its banner after cover and a seat switch', async () => {
    const source = session(false);
    const pending = deferred<LeagueBuilderMlbDraftSession>();
    mocks.patchBoard.mockImplementationOnce(() => pending.promise);
    renderRoom(source);
    await screen.findByTestId('snake-draft-room');
    await revealSeatAndSettle('Club A');
    fireEvent.click(await screen.findByRole('button', { name: 'RANKINGS' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(mocks.patchBoard).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'COVER' }));
    expect(screen.queryByTestId('private-draft-desk')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'CLUB B' }));
    const passButton = screen.queryByRole('button', { name: 'I HAVE THE ROOM' });
    if (passButton) fireEvent.click(passButton);

    const input = mocks.patchBoard.mock.calls[0][0] as { teamId: string; board: SnakeSeatBoardRecord };
    const saved = { ...source, seatBoards: { ...source.seatBoards, [input.teamId]: input.board } };
    mocks.roomState = saved;
    await act(async () => { pending.resolve(saved); await pending.promise; });

    expect(screen.queryByTestId('main-board-update-banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'UNDO BOARD UPDATE' })).not.toBeInTheDocument();
    await revealSeatAndSettle('Club B');
    expect(screen.queryByTestId('main-board-update-banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'UNDO BOARD UPDATE' })).not.toBeInTheDocument();
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
    await revealSeatAndSettle('Club B');
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
    await revealSeatAndSettle('Club A');
    expect(await screen.findByRole('button', { name: 'DRAFT PLAYER' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'CLUB B' }));
    await revealSeatAndSettle('Club B');
    expect(screen.getByTestId('selected-player-card')).toHaveTextContent(selectedName);
  });

  test('a recorded live pick selects the new on-clock club and opens its private seat covered', async () => {
    renderRoom(session(false));
    await screen.findByTestId('snake-draft-room');
    await revealSeatAndSettle('Club A');
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

    await revealSeatAndSettle('Club A');
    expect(await screen.findByTestId('plan-truth-strip')).toHaveTextContent('22/22');
    fireEvent.click(screen.getByRole('button', { name: 'DRAFT PLAYER' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'HOLD THE GAVEL' }));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1_100)); });
    await waitFor(() => expect(mocks.saveRoom).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'CLUB A' }));
    expect(screen.getByTestId('drafted-truth-a')).toHaveTextContent('1/22');
    expect(screen.getByTestId('drafted-truth-a')).toHaveTextContent('$10,100');
    expect(screen.getByTestId('drafted-truth-a')).toHaveTextContent('Competitive0 · L1');
    expect(screen.getByTestId('drafted-truth-a')).toHaveTextContent('Spirited1 · L1');

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
    await revealSeatAndSettle('Club A');
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
