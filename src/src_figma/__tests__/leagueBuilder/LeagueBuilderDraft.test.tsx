import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LeagueBuilderDraft } from '../../app/pages/LeagueBuilderDraft';
import {
  confirmLeagueBuilderProspectPick,
  createLeagueBuilderStartupDraftSession,
  draftLeagueBuilderScout,
  getLeagueBuilderStartupDraftView,
} from '../../../utils/leagueBuilderStartupFarmDraft';
import { useLeagueBuilderData } from '../../hooks/useLeagueBuilderData';

const mockNavigate = vi.fn();
const mockRefresh = vi.fn().mockResolvedValue(undefined);

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../utils/leagueBuilderStartupFarmDraft', async () => {
  const actual = await vi.importActual<typeof import('../../../utils/leagueBuilderStartupFarmDraft')>(
    '../../../utils/leagueBuilderStartupFarmDraft',
  );
  return {
    ...actual,
    createLeagueBuilderStartupDraftSession: vi.fn(),
    draftLeagueBuilderScout: vi.fn(),
    confirmLeagueBuilderProspectPick: vi.fn(),
    getLeagueBuilderStartupDraftView: vi.fn(),
  };
});

const baseLeague = {
  id: 'league-1',
  name: 'League One',
  teamIds: ['team-1', 'team-2'],
  conferences: [],
  divisions: [],
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
    leagueIds: ['league-1'],
  },
  {
    id: 'team-2',
    name: 'Tigers',
    location: 'Detroit',
    abbreviation: 'DET',
    colors: { primary: '#FF6600', secondary: '#000000' },
    leagueIds: ['league-1'],
  },
];

function makePlayer(teamId: string, index: number, rosterStatus: 'MLB' | 'FARM') {
  return {
    id: `${teamId}-${rosterStatus.toLowerCase()}-${index}`,
    firstName: rosterStatus,
    lastName: `${index}`,
    primaryPosition: rosterStatus === 'MLB' ? 'C' : 'CF',
    overallGrade: 'B',
    salary: rosterStatus === 'MLB' ? 4 : 0.5,
    leagueAssignments: [{ leagueId: 'league-1', teamId, rosterStatus }],
    ratingRevealState: rosterStatus === 'FARM' ? 'hidden' : undefined,
  };
}

function makePlayers(farmCount = 0) {
  return baseTeams.flatMap((team) => [
    ...Array.from({ length: 22 }, (_, index) => makePlayer(team.id, index + 1, 'MLB')),
    ...Array.from({ length: farmCount }, (_, index) => makePlayer(team.id, index + 1, 'FARM')),
  ]);
}

const scoutOne = {
  id: 'scout-1',
  leagueId: 'league-1',
  name: 'Riley Kline',
  specialties: ['outfield'],
  weaknesses: ['CP'],
  accuracyByPosition: { CF: 88, SP: 66, CP: 52 },
  seed: 'scout-seed-1',
  createdDate: '2026-01-01',
  lastModified: '2026-01-01',
};

const scoutTwo = {
  id: 'scout-2',
  leagueId: 'league-1',
  name: 'Morgan Vale',
  specialties: ['pitching'],
  weaknesses: ['1B'],
  accuracyByPosition: { SP: 87, CF: 61, CP: 80 },
  seed: 'scout-seed-2',
  createdDate: '2026-01-01',
  lastModified: '2026-01-01',
};

const scoutThree = {
  id: 'scout-3',
  leagueId: 'league-1',
  name: 'Casey Soto',
  specialties: ['infield'],
  weaknesses: ['LF'],
  accuracyByPosition: { SS: 86, CF: 60, CP: 64 },
  seed: 'scout-seed-3',
  createdDate: '2026-01-01',
  lastModified: '2026-01-01',
};

function baseView(overrides: Record<string, unknown> = {}) {
  return {
    session: null,
    teams: [
      { teamId: 'team-1', teamName: 'Boston Sox', farmCount: 0, mlbCount: 22, missingFarm: 10, prepared: false },
      { teamId: 'team-2', teamName: 'Detroit Tigers', farmCount: 0, mlbCount: 22, missingFarm: 10, prepared: false },
    ],
    blockers: [],
    warnings: [],
    prepared: false,
    scoutDraftComplete: false,
    prospectDraftComplete: false,
    currentScoutPick: null,
    availableScouts: [],
    currentProspectPick: null,
    prospectBoard: [],
    completedPicks: [],
    ...overrides,
  };
}

function scoutDraftView(overrides: Record<string, unknown> = {}) {
  return baseView({
    session: {
      id: 'startup-draft-league-1-1',
      leagueId: 'league-1',
      seasonNumber: 1,
      seed: 'ui-seed',
      workflowVersion: 'league-builder-startup-farm-draft-v1',
      engineMethodVersion: 'league-builder-startup-prospect-scouting-draft-v1',
      scoutOrder: ['team-1', 'team-2'],
      scoutPool: [scoutOne, scoutTwo, scoutThree],
      hiredScoutIdsByTeamId: { 'team-1': [], 'team-2': [] },
      prospectPickOrder: [],
      prospectPool: [],
      completedPicks: [],
      currentPickIndex: 0,
    },
    currentScoutPick: { round: 1, pickNumber: 1, teamId: 'team-1', teamName: 'Boston Sox' },
    availableScouts: [scoutOne, scoutTwo, scoutThree],
    ...overrides,
  });
}

function prospectDraftView(overrides: Record<string, unknown> = {}) {
  return scoutDraftView({
    scoutDraftComplete: true,
    currentScoutPick: null,
    session: {
      ...(scoutDraftView().session as any),
      hiredScoutIdsByTeamId: { 'team-1': ['scout-1', 'scout-2'], 'team-2': ['scout-3', 'scout-4'] },
    },
    currentProspectPick: { round: 1, pickNumber: 1, teamId: 'team-1', teamName: 'Boston Sox' },
    prospectBoard: [
      {
        candidateId: 'candidate-1',
        playerName: 'Ari Banks',
        position: 'CF',
        age: 18,
        bats: 'R',
        throws: 'R',
        scoutedGrade: 'B+',
        bestScoutedGrade: 'B+',
        potentialGrade: 'A',
        bestConfidence: 'high',
        scoutConfidence: 'high',
        chemistry: 'Crafty',
        personality: 'Competitive',
        trait1: 'RBI Man',
        trait2: 'First Pitch Slayer',
        salary: 2.0,
        reports: [
          {
            candidateId: 'candidate-1',
            playerName: 'Ari Banks',
            position: 'CF',
            age: 18,
            bats: 'R',
            throws: 'R',
            scoutedGrade: 'B+',
            potentialGrade: 'A',
            scoutConfidence: 'high',
            chemistry: 'Crafty',
            personality: 'Competitive',
            trait1: 'RBI Man',
            trait2: 'First Pitch Slayer',
            salary: 2.0,
            scoutId: 'scout-1',
            scoutName: 'Riley Kline',
            scoutAccuracy: 88,
            scoutSpecialtiesVisible: ['outfield'],
            scoutWeaknessesVisible: ['CP'],
          },
          {
            candidateId: 'candidate-1',
            playerName: 'Ari Banks',
            position: 'CF',
            age: 18,
            bats: 'R',
            throws: 'R',
            scoutedGrade: 'C+',
            potentialGrade: 'A',
            scoutConfidence: 'medium',
            chemistry: 'Crafty',
            personality: 'Competitive',
            trait1: 'RBI Man',
            trait2: 'First Pitch Slayer',
            salary: 2.0,
            scoutId: 'scout-2',
            scoutName: 'Morgan Vale',
            scoutAccuracy: 61,
            scoutSpecialtiesVisible: ['pitching'],
            scoutWeaknessesVisible: ['1B'],
          },
        ],
      },
    ],
    completedPicks: [],
    ...overrides,
  });
}

vi.mock('../../hooks/useLeagueBuilderData', () => ({
  useLeagueBuilderData: vi.fn(() => ({
    leagues: [baseLeague],
    teams: baseTeams,
    players: makePlayers(),
    rulesPresets: [],
    isLoading: false,
    error: null,
    refresh: mockRefresh,
  })),
}));

describe('LeagueBuilderDraft scout and prospect draft UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefresh.mockResolvedValue(undefined);
    vi.mocked(useLeagueBuilderData).mockReturnValue({
      leagues: [baseLeague],
      teams: baseTeams,
      players: makePlayers(),
      rulesPresets: [],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    } as any);
    vi.mocked(getLeagueBuilderStartupDraftView).mockResolvedValue(baseView() as any);
    vi.mocked(createLeagueBuilderStartupDraftSession).mockResolvedValue(scoutDraftView() as any);
    vi.mocked(draftLeagueBuilderScout).mockResolvedValue(scoutDraftView({
      session: {
        ...(scoutDraftView().session as any),
        hiredScoutIdsByTeamId: { 'team-1': ['scout-1'], 'team-2': [] },
      },
    }) as any);
    vi.mocked(confirmLeagueBuilderProspectPick).mockResolvedValue(prospectDraftView({
      completedPicks: [
        {
          round: 1,
          pickNumber: 1,
          teamId: 'team-1',
          teamName: 'Boston Sox',
          candidateId: 'candidate-1',
          playerId: 'prospect-1',
          playerName: 'Ari Banks',
          position: 'CF',
          scoutedGrade: 'B+',
          potentialGrade: 'A',
          salary: 2.0,
          scoutReports: [],
        },
      ],
    }) as any);
  });

  test('renders scout-first startup draft controls and no bulk apply action', async () => {
    render(<LeagueBuilderDraft />);

    expect(screen.getByText('STARTUP SCOUT + PROSPECT DRAFT')).toBeInTheDocument();
    expect(screen.getByText('LEAGUE BUILDER SETUP')).toBeInTheDocument();
    expect(screen.getByLabelText(/DETERMINISTIC SEED/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /BEGIN SCOUT DRAFT/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /APPLY DRAFT TO LEAGUE BUILDER/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /GENERATE STARTUP FARM DRAFT/i })).not.toBeInTheDocument();
  });

  test('back button navigates to League Builder', async () => {
    render(<LeagueBuilderDraft />);

    fireEvent.click(await screen.findByRole('button', { name: /Back to League Builder/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/league-builder');
  });

  test('starts the scout draft with user ordered teams', async () => {
    render(<LeagueBuilderDraft />);

    fireEvent.click(await screen.findByRole('button', { name: /BEGIN SCOUT DRAFT/i }));

    await waitFor(() => {
      expect(createLeagueBuilderStartupDraftSession).toHaveBeenCalledWith(expect.objectContaining({
        leagueId: 'league-1',
        scoutOrder: ['team-1', 'team-2'],
      }));
    });
    expect(await screen.findByText('SCOUT DRAFT')).toBeInTheDocument();
  });

  test('scout draft lets the team on the clock hire one visible scout', async () => {
    vi.mocked(getLeagueBuilderStartupDraftView).mockResolvedValue(scoutDraftView() as any);

    render(<LeagueBuilderDraft />);

    expect(await screen.findByText('ON THE CLOCK: Boston Sox')).toBeInTheDocument();
    expect(screen.getByText('Riley Kline')).toBeInTheDocument();
    expect(screen.getByText(/Specialties: outfield/i)).toBeInTheDocument();
    expect(screen.getByText(/Weaknesses: CP/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /HIRE SCOUT/i })[0]);

    await waitFor(() => {
      expect(draftLeagueBuilderScout).toHaveBeenCalledWith({
        leagueId: 'league-1',
        seasonNumber: 1,
        scoutId: 'scout-1',
      });
    });
  });

  test('prospect board shows only current team scout reports and writes one pick at a time', async () => {
    vi.mocked(getLeagueBuilderStartupDraftView).mockResolvedValue(prospectDraftView() as any);

    render(<LeagueBuilderDraft />);

    expect(await screen.findByText('PROSPECT DRAFT BOARD')).toBeInTheDocument();
    expect(screen.getByText('ON THE CLOCK: Boston Sox')).toBeInTheDocument();
    expect(screen.getByText('Ari Banks')).toBeInTheDocument();
    expect(screen.getByText('Salary $2.0M')).toBeInTheDocument();
    expect(screen.getByText('Riley Kline')).toBeInTheDocument();
    expect(screen.getByText('Morgan Vale')).toBeInTheDocument();
    expect(screen.getByText(/Scouted B\+/i)).toBeInTheDocument();
    expect(screen.queryByText(/true grade/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/hiddenPersonalityModifiers/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/loyalty/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Detroit Tigers Scout/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /DRAFT TO FARM/i }));

    await waitFor(() => {
      expect(confirmLeagueBuilderProspectPick).toHaveBeenCalledWith({
        leagueId: 'league-1',
        seasonNumber: 1,
        candidateId: 'candidate-1',
      });
    });
    expect(await screen.findByText('RECENT PICKS')).toBeInTheDocument();
    expect((await screen.findAllByText('Salary $2.0M')).length).toBeGreaterThanOrEqual(1);
  });

  test('prepared league reports ready state without showing bulk apply', async () => {
    vi.mocked(getLeagueBuilderStartupDraftView).mockResolvedValue(baseView({
      prepared: true,
      scoutDraftComplete: true,
      prospectDraftComplete: true,
      teams: [
        { teamId: 'team-1', teamName: 'Boston Sox', farmCount: 10, mlbCount: 22, missingFarm: 0, scoutCount: 2, prepared: true },
        { teamId: 'team-2', teamName: 'Detroit Tigers', farmCount: 10, mlbCount: 22, missingFarm: 0, scoutCount: 2, prepared: true },
      ],
    }) as any);

    render(<LeagueBuilderDraft />);

    expect(await screen.findByText('PREPARED')).toBeInTheDocument();
    expect(screen.getByText(/each team has two hired scouts and 10 hidden-safe FARM prospects/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Scouts 2\/2/i)).toHaveLength(2);
    expect(screen.queryByText(/Scouts 0\/2/i)).not.toBeInTheDocument();
    expect(screen.getByText(/normal scout draft restart is blocked in v1/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /BEGIN SCOUT DRAFT/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /APPLY DRAFT TO LEAGUE BUILDER/i })).not.toBeInTheDocument();
  });

  test('durable scout restart blocker hides normal scout draft start action', async () => {
    vi.mocked(getLeagueBuilderStartupDraftView).mockResolvedValue(baseView({
      blockers: [
        'Normal startup scout draft restart is blocked because 4 durable scout profiles already exist for this league. V1 keeps the prepared scout state; reset flow is deferred.',
      ],
    }) as any);

    render(<LeagueBuilderDraft />);

    expect(await screen.findByText(/restart is blocked because 4 durable scout profiles already exist/i)).toBeInTheDocument();
    expect(screen.getByText(/normal scout draft restart is blocked in v1/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /BEGIN SCOUT DRAFT/i })).not.toBeInTheDocument();
  });

  test('blocked farm state reports blocker and hides draft actions', async () => {
    vi.mocked(getLeagueBuilderStartupDraftView).mockResolvedValue(baseView({
      blockers: ['Boston Sox: FARM roster does not match player FARM assignments.'],
    }) as any);

    render(<LeagueBuilderDraft />);

    await screen.findByText('BLOCKED');
    expect(screen.getByText(/does not match player FARM assignments/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /DRAFT TO FARM/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /APPLY DRAFT TO LEAGUE BUILDER/i })).not.toBeInTheDocument();
  });

  test('no-team league blocks draft start', async () => {
    vi.mocked(useLeagueBuilderData).mockReturnValue({
      leagues: [{ ...baseLeague, teamIds: [] }],
      teams: [],
      players: [],
      rulesPresets: [],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    } as any);
    vi.mocked(getLeagueBuilderStartupDraftView).mockResolvedValue(baseView({
      teams: [],
      blockers: ['Selected league has no teams.'],
    }) as any);

    render(<LeagueBuilderDraft />);

    expect(await screen.findByText('Selected league has no teams.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /BEGIN SCOUT DRAFT/i })).toBeDisabled();
  });
});
