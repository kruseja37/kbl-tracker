import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  data: {} as Record<string, unknown>,
  saveRoom: vi.fn(),
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
vi.mock('../../../utils/leagueBuilderStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/leagueBuilderStorage')>();
  return {
    ...actual,
    saveMlbDraftRoomSession: (...args: unknown[]) => mocks.saveRoom(...args),
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

function renderRoom(source: LeagueBuilderMlbDraftSession) {
  mocks.data = {
    leagues: [league], teams, players, isLoading: false, error: null,
    getRegisteredPool: vi.fn(async () => pool), getMlbDraftSession: vi.fn(async () => source),
    saveMlbDraftSession: vi.fn(async (next) => next),
  };
  return render(<MemoryRouter initialEntries={[`/snake-room?leagueId=${league.id}`]}><SnakeDraftRoom /></MemoryRouter>);
}

describe('SNAKE-MOCK-2A real page persistence seam', () => {
  beforeEach(() => mocks.saveRoom.mockReset().mockImplementation(async (next) => next));
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
});
