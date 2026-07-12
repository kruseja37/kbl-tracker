import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  data: {} as Record<string, unknown>,
  currentSession: null as unknown,
  patchBoard: vi.fn(),
  refresh: vi.fn(async () => undefined),
  pull: vi.fn(async () => undefined),
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
vi.mock('../../../utils/syncEngine', () => ({ syncEngine: { pull: mocks.pull } }));
vi.mock('../../app/components/snake/companion/companionFreshness', () => ({ startCompanionFreshness: () => () => undefined }));
vi.mock('../../../utils/leagueBuilderStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/leagueBuilderStorage')>();
  return {
    ...actual,
    patchMlbDraftSessionSeatBoard: (...args: unknown[]) => mocks.patchBoard(...args),
    patchMlbDraftSessionSnakeCompanions: vi.fn(),
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
import SnakeCompanion from '../../app/pages/SnakeCompanion';

const league: LeagueTemplate = {
  id: 'companion-2b', name: 'Companion 2B', teamIds: ['a', 'b'], conferences: [], divisions: [],
  defaultRulesPreset: 'standard', draftFormat: 'snake', tier: 'standard', balanceMode: 'taxed', salaryCap: 10_000_000,
  createdDate: '2026-07-12', lastModified: '2026-07-12',
};
const teams: Team[] = ['a', 'b'].map((id) => ({
  id, name: `Club ${id.toUpperCase()}`, abbreviation: id.toUpperCase(), location: 'Test', nickname: 'Club',
  colors: { primary: '#234f32', secondary: '#f5d77a' }, stadium: 'Test Park', controlledBy: 'human',
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
  tierCap: 10_000_000, luxuryCaps: [], pickValueChart: [], totalSlots: players.length,
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
    tier: 'standard', balanceMode: 'taxed', rounds: 1,
    pickOrder: [{ round: 1, pick: 1, teamId: 'b' }, { round: 1, pick: 2, teamId: 'a' }], completedPicks: [], currentPickIndex: 0,
    revision: 4, seatBoards: { a: board('a-only'), b: board('b-only') },
    snakeSetup: { poolPlayerIds: players.map((row) => row.id), versionSelections: {}, clubs: [{ teamId: 'a', gmName: 'Alex', hotseat: false }, { teamId: 'b', gmName: 'Blair', hotseat: false }], orderSeed: 'seed' },
    snakeCompanions: { roomCode: '4821', claims: [{ deviceId: 'ipad-a', gmName: 'Alex', teamId: 'a', status: 'approved' }] },
    createdDate: '2026-07-12', lastModified: '2026-07-12',
  };
}

function prepare(source = session()) {
  mocks.currentSession = source;
  mocks.data = {
    leagues: [league], teams, players, isLoading: false, error: null, refresh: mocks.refresh,
    getRegisteredPool: vi.fn(async () => pool),
    getMlbDraftSession: vi.fn(async () => mocks.currentSession as LeagueBuilderMlbDraftSession),
  };
  mocks.patchBoard.mockImplementation(async (input: { teamId: string; board: SnakeSeatBoardRecord }) => {
    const current = mocks.currentSession as LeagueBuilderMlbDraftSession;
    const saved = { ...current, seatBoards: { ...current.seatBoards, [input.teamId]: input.board }, revision: (current.revision ?? 0) + 1 };
    mocks.currentSession = saved;
    return saved;
  });
}

describe('SNAKE-MOCK-2B companion board parity', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('kbl-snake-companion-device-id', 'ipad-a');
    mocks.patchBoard.mockReset();
    mocks.pull.mockClear();
    mocks.refresh.mockClear();
    prepare();
  });
  afterEach(() => cleanup());

  test('an approved off-clock companion refits overall and secondary-position reorders and writes only its claimed board', async () => {
    const originalB = structuredClone((mocks.currentSession as LeagueBuilderMlbDraftSession).seatBoards!.b);
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RANKINGS' }));
    expect(screen.getByRole('heading', { name: 'OVERALL RANKINGS' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(mocks.patchBoard).toHaveBeenCalledTimes(1));
    expect(mocks.patchBoard.mock.calls[0][0]).toMatchObject({ teamId: 'a' });
    let saved = mocks.patchBoard.mock.calls[0][0].board as SnakeSeatBoardRecord;
    expect(new Set(Object.values(saved.slots))).toHaveLength(22);

    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    expect(screen.getByText('DUAL PLAYER')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(mocks.patchBoard).toHaveBeenCalledTimes(2));
    saved = mocks.patchBoard.mock.calls[1][0].board as SnakeSeatBoardRecord;
    expect(saved.rankings.byPosition?.C?.slice(0, 2)).toEqual(['dual', 'catcher']);
    expect(saved.slots.C).toBe('dual');
    expect((mocks.currentSession as LeagueBuilderMlbDraftSession).seatBoards?.b).toEqual(originalB);
    expect(document.body.textContent).not.toMatch(/\b(?:he|she|him|her)\b/i);
  });

  test('a revoked approval fails closed before the companion board patch', async () => {
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    const current = mocks.currentSession as LeagueBuilderMlbDraftSession;
    mocks.currentSession = {
      ...current,
      snakeCompanions: { ...current.snakeCompanions!, claims: current.snakeCompanions!.claims.map((claim) => ({ ...claim, status: 'revoked' as const })) },
    };
    fireEvent.click(screen.getByRole('button', { name: 'RANKINGS' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(screen.getByText('MAIN-DEVICE APPROVAL IS REQUIRED.')).toBeInTheDocument());
    expect(mocks.patchBoard).not.toHaveBeenCalled();
    expect(mocks.refresh).toHaveBeenCalled();
  });

  test('a stale companion board write shows the existing stale message and refreshes', async () => {
    mocks.patchBoard.mockRejectedValueOnce(new Error('board revision changed'));
    render(<SnakeCompanion />);
    expect(await screen.findByTestId('snake-companion-frame')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RANKINGS' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Move .* down$/ })[0]);
    await waitFor(() => expect(screen.getByText('THE DRAFT MOVED ON — REFRESH')).toBeInTheDocument());
    expect(mocks.patchBoard).toHaveBeenCalledTimes(1);
    expect(mocks.refresh).toHaveBeenCalled();
  });
});
