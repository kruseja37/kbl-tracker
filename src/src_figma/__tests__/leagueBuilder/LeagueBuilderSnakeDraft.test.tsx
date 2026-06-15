import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

import { LeagueBuilderSnakeDraft, parseTradePickList } from '../../app/pages/LeagueBuilderSnakeDraft';
import { useLeagueBuilderData } from '../../hooks/useLeagueBuilderData';
import type {
  LeagueBuilderMlbDraftSession,
  Player,
  RegisteredPool,
  TeamRoster,
} from '../../hooks/useLeagueBuilderData';

const mockNavigate = vi.fn();
const mockRefresh = vi.fn().mockResolvedValue(undefined);
const mockGetRoster = vi.fn();
const mockUpdateRoster = vi.fn();
const mockUpdatePlayer = vi.fn();
const mockRegisterLeaguePool = vi.fn();
const mockGetRegisteredPool = vi.fn();
const mockGetMlbDraftSession = vi.fn();
const mockSaveMlbDraftSession = vi.fn();
const mockDeleteMlbDraftSession = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../hooks/useLeagueBuilderData', async () => {
  const actual = await vi.importActual<typeof import('../../hooks/useLeagueBuilderData')>(
    '../../hooks/useLeagueBuilderData',
  );
  return {
    ...actual,
    useLeagueBuilderData: vi.fn(),
  };
});

const baseLeague = {
  id: 'league-1',
  name: 'League One',
  teamIds: ['team-1', 'team-2'],
  conferences: [],
  divisions: [],
  defaultRulesPreset: 'rules-default',
  tier: 'standard',
  balanceMode: 'taxed',
  createdDate: '2026-01-01',
  lastModified: '2026-01-01',
};

const baseTeams = [
  {
    id: 'team-1',
    name: 'Sox',
    location: 'Boston',
    abbreviation: 'SOX',
    colors: { primary: '#FF0000', secondary: '#FFFFFF' },
    stadium: 'Park',
    leagueIds: ['league-1'],
    createdDate: '2026-01-01',
    lastModified: '2026-01-01',
  },
  {
    id: 'team-2',
    name: 'Tigers',
    location: 'Detroit',
    abbreviation: 'DET',
    colors: { primary: '#FF6600', secondary: '#000000' },
    stadium: 'Park',
    leagueIds: ['league-1'],
    createdDate: '2026-01-01',
    lastModified: '2026-01-01',
  },
];

function makePlayer(overrides: Partial<Player>): Player {
  return {
    id: 'player-1',
    firstName: 'Ari',
    lastName: 'Banks',
    gender: 'M',
    age: 25,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    power: 71,
    contact: 72,
    speed: 73,
    fielding: 74,
    arm: 75,
    velocity: 30,
    junk: 31,
    accuracy: 32,
    arsenal: ['4F'],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Crafty',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 100,
    leagueAssignments: [{ leagueId: 'league-old', teamId: 'old-team', rosterStatus: 'MLB' }],
    createdDate: '2026-01-01',
    lastModified: '2026-01-01',
    ...overrides,
  };
}

const draftPlayer = makePlayer({});
const players = [draftPlayer];

const pool: RegisteredPool = {
  leagueId: 'league-1',
  tier: 'standard',
  balanceMode: 'taxed',
  players: [
    { id: 'player-1', iv: 200, salary: 100 },
    ...Array.from({ length: 24 }, (_, index) => ({
      id: `fill-${index + 1}`,
      iv: 10 - index * 0.01,
      salary: 1,
    })),
  ],
  tierCap: 1_000_000,
  luxuryCaps: [],
  pickValueChart: [
    { pick: 1, value: 200 },
    { pick: 2, value: 190 },
    { pick: 3, value: 120 },
    { pick: 4, value: 50 },
  ],
  totalSlots: 44,
  poolSurplusWarning: false,
};

const session: LeagueBuilderMlbDraftSession = {
  id: 'league-1::startup-mlb-draft::1',
  leagueId: 'league-1',
  seasonNumber: 1,
  seed: 'seed-1',
  workflowVersion: 'startup-mlb-draft-v1',
  engineMethodVersion: 'leagueConstruction.t8d-1',
  tier: 'standard',
  balanceMode: 'taxed',
  rounds: 22,
  pickOrder: [
    { round: 1, pick: 1, teamId: 'team-1' },
    { round: 1, pick: 2, teamId: 'team-2' },
  ],
  completedPicks: [],
  currentPickIndex: 0,
  createdDate: '2026-01-01',
  lastModified: '2026-01-01',
};

const currentRoster: TeamRoster = {
  teamId: 'team-1',
  mlbRoster: ['existing-mlb'],
  farmRoster: ['farm-1'],
  lineupWithDH: [],
  lineupWithoutDH: [],
  startingRotation: [],
  longRelievers: [],
  closingPitcher: '',
  setupPitchers: [],
  depthChart: {
    C: [],
    '1B': [],
    '2B': [],
    SS: [],
    '3B': [],
    LF: [],
    CF: [],
    RF: [],
    DH: [],
    SP: [],
    RP: [],
    CP: [],
  },
  pinchHitOrder: [],
  pinchRunOrder: [],
  defensiveSubOrder: [],
  lastModified: '2026-01-01',
};

function mockHook(overrides: Record<string, unknown> = {}) {
  vi.mocked(useLeagueBuilderData).mockReturnValue({
    leagues: [baseLeague],
    teams: baseTeams,
    players,
    rulesPresets: [],
    isLoading: false,
    error: null,
    refresh: mockRefresh,
    getRoster: mockGetRoster,
    updateRoster: mockUpdateRoster,
    updatePlayer: mockUpdatePlayer,
    registerLeaguePool: mockRegisterLeaguePool,
    getRegisteredPool: mockGetRegisteredPool,
    getMlbDraftSession: mockGetMlbDraftSession,
    saveMlbDraftSession: mockSaveMlbDraftSession,
    deleteMlbDraftSession: mockDeleteMlbDraftSession,
    ...overrides,
  } as any);
}

describe('LeagueBuilderSnakeDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefresh.mockResolvedValue(undefined);
    mockGetRoster.mockResolvedValue(currentRoster);
    mockUpdateRoster.mockImplementation(async (roster) => roster);
    mockUpdatePlayer.mockImplementation(async (player) => player);
    mockRegisterLeaguePool.mockResolvedValue(pool);
    mockGetRegisteredPool.mockResolvedValue(pool);
    mockGetMlbDraftSession.mockResolvedValue(session);
    mockSaveMlbDraftSession.mockImplementation(async (nextSession) => ({
      ...nextSession,
      createdDate: nextSession.createdDate ?? session.createdDate,
      lastModified: '2026-01-02',
    }));
    mockHook();
  });

  test('mounts a resumed MLB draft board and shows the team on the clock', async () => {
    render(<LeagueBuilderSnakeDraft />);

    expect(screen.getByText('MLB SNAKE DRAFT')).toBeInTheDocument();
    expect(await screen.findByText(/ON THE CLOCK: Boston Sox/i)).toBeInTheDocument();
    expect(screen.getByText(/Chart \$200/i)).toBeInTheDocument();
    expect(screen.getByText('Ari Banks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /DRAFT TO MLB/i })).toBeEnabled();
  });

  test('pick-value chart renders rows from the registered pool snapshot', async () => {
    render(<LeagueBuilderSnakeDraft />);

    const panel = await screen.findByText('PICK VALUE CHART');
    const section = panel.closest('section');
    expect(section).not.toBeNull();
    expect(within(section as HTMLElement).getByText('Pick 1')).toBeInTheDocument();
    expect(within(section as HTMLElement).getByText('$200')).toBeInTheDocument();
    expect(within(section as HTMLElement).getByText('Pick 4')).toBeInTheDocument();
    expect(within(section as HTMLElement).getByText('$50')).toBeInTheDocument();
  });

  test('trade validator renders balanced, imbalanced, and out-of-range advisory results', async () => {
    render(<LeagueBuilderSnakeDraft />);

    await screen.findByText('TRADE VALIDATOR');
    const sideA = screen.getByLabelText('SIDE A');
    const sideB = screen.getByLabelText('SIDE B');
    const evaluate = screen.getByRole('button', { name: /EVALUATE/i });

    fireEvent.change(sideA, { target: { value: '1' } });
    fireEvent.change(sideB, { target: { value: '2' } });
    fireEvent.click(evaluate);
    expect(screen.getByText('BALANCED')).toBeInTheDocument();
    expect(screen.getByText(/Imbalance 5\.0% vs 15% band/i)).toBeInTheDocument();

    fireEvent.change(sideB, { target: { value: '4' } });
    fireEvent.click(evaluate);
    expect(screen.getByText('IMBALANCED')).toBeInTheDocument();
    expect(screen.getByText(/Imbalance 75\.0% vs 15% band/i)).toBeInTheDocument();
    expect(screen.getByText(/Favored Side A/i)).toBeInTheDocument();

    fireEvent.change(sideA, { target: { value: '99' } });
    fireEvent.change(sideB, { target: { value: '1' } });
    fireEvent.click(evaluate);
    expect(screen.getByText(/Use pick numbers 1-4/i)).toBeInTheDocument();
  });

  test('cross-team comparison renders one signal row for each league team on demand', async () => {
    render(<LeagueBuilderSnakeDraft />);

    fireEvent.click(await screen.findByRole('button', { name: /COMPARE TEAMS/i }));

    const panel = screen.getByText('CROSS-TEAM SOLVENCY').parentElement;
    expect(panel).not.toBeNull();
    expect(within(panel as HTMLElement).getByText('Boston Sox')).toBeInTheDocument();
    expect(within(panel as HTMLElement).getByText('Detroit Tigers')).toBeInTheDocument();
    expect(within(panel as HTMLElement).getAllByText('GREEN')).toHaveLength(2);
  });

  test('parseTradePickList ignores blanks and NaN tokens', () => {
    expect(parseTradePickList('1, 2   nope 4')).toEqual([{ pick: 1 }, { pick: 2 }, { pick: 4 }]);
  });

  test('confirmed pick performs roster write, player assignment write, and session cursor advance', async () => {
    render(<LeagueBuilderSnakeDraft />);

    fireEvent.click(await screen.findByRole('button', { name: /DRAFT TO MLB/i }));

    await waitFor(() => {
      expect(mockGetRoster).toHaveBeenCalledWith('team-1');
      expect(mockUpdateRoster).toHaveBeenCalledWith(expect.objectContaining({
        teamId: 'team-1',
        mlbRoster: ['existing-mlb', 'player-1'],
        farmRoster: ['farm-1'],
      }));
      expect(mockUpdatePlayer).toHaveBeenCalledWith(expect.objectContaining({
        id: 'player-1',
        leagueAssignments: [
          { leagueId: 'league-old', teamId: 'old-team', rosterStatus: 'MLB' },
          { leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' },
        ],
      }));
      expect(mockSaveMlbDraftSession).toHaveBeenCalledWith(expect.objectContaining({
        id: 'league-1::startup-mlb-draft::1',
        currentPickIndex: 1,
        completedPicks: [
          { round: 1, pick: 1, teamId: 'team-1', playerId: 'player-1' },
        ],
      }));
    });
  });
});
