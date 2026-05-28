import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LeagueBuilderDraft } from '../../app/pages/LeagueBuilderDraft';
import {
  applyLeagueBuilderStartupFarmDraft,
  createLeagueBuilderStartupFarmDraftPreview,
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
    createLeagueBuilderStartupFarmDraftPreview: vi.fn(),
    applyLeagueBuilderStartupFarmDraft: vi.fn(),
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

function makePreview(overrides: Record<string, unknown> = {}) {
  return {
    workflowVersion: 'league-builder-startup-farm-draft-v1',
    engineMethodVersion: 'league-builder-startup-prospect-scouting-draft-v1',
    leagueId: 'league-1',
    seasonNumber: 1,
    rounds: 10,
    seed: 'ui-seed',
    valid: true,
    prepared: false,
    totalVacancies: 2,
    blockers: [],
    warnings: [],
    limitations: [],
    teams: [
      { teamId: 'team-1', teamName: 'Boston Sox', farmCount: 9, mlbCount: 22, missingFarm: 1, prepared: false },
      { teamId: 'team-2', teamName: 'Detroit Tigers', farmCount: 9, mlbCount: 22, missingFarm: 1, prepared: false },
    ],
    selectedPicks: [
      {
        round: 1,
        pickNumber: 1,
        teamId: 'team-1',
        playerId: 'prospect-league-1-1-team-1-1-1',
        playerName: 'Ari Banks',
        position: 'CF',
        trueGrade: 'A',
        scoutedGrade: 'B+',
        potentialGrade: 'A-',
        scoutAccuracy: 70,
        scoutConfidence: 'medium',
        salary: 2,
        player: {
          prospectProfile: {
            trueGrade: 'A',
            scoutedGrade: 'B+',
            scoutSpecialtiesVisible: ['outfield'],
            scoutWeaknessesVisible: ['CP'],
          },
          hiddenPersonalityModifiers: {
            leadership: 90,
          },
        },
        visibleReport: {
          candidateId: 'candidate-1',
          playerId: 'prospect-league-1-1-team-1-1-1',
          playerName: 'Ari Banks',
          position: 'CF',
          age: 20,
          bats: 'R',
          throws: 'R',
          scoutedGrade: 'B+',
          potentialGrade: 'A-',
          scoutConfidence: 'medium',
          chemistry: 'Crafty',
          personality: 'Competitive',
          salary: 2,
        },
      },
    ],
    visibleReports: [
      {
        candidateId: 'candidate-1',
        playerId: 'prospect-league-1-1-team-1-1-1',
        playerName: 'Ari Banks',
        position: 'CF',
        age: 20,
        bats: 'R',
        throws: 'R',
        scoutedGrade: 'B+',
        potentialGrade: 'A-',
        scoutConfidence: 'medium',
        chemistry: 'Crafty',
        personality: 'Competitive',
        salary: 2,
        teamId: 'team-1',
        round: 1,
        pickNumber: 1,
        scoutName: 'Startup Farm Scout 1',
        scoutSpecialtiesVisible: ['outfield'],
        scoutWeaknessesVisible: ['CP'],
      },
    ],
    ...overrides,
  };
}

describe('LeagueBuilderDraft startup farm draft UI', () => {
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
    vi.mocked(createLeagueBuilderStartupFarmDraftPreview).mockResolvedValue(makePreview() as any);
    vi.mocked(applyLeagueBuilderStartupFarmDraft).mockResolvedValue({
      workflowVersion: 'league-builder-startup-farm-draft-v1',
      leagueId: 'league-1',
      valid: true,
      applied: true,
      createdPlayerIds: ['prospect-league-1-1-team-1-1-1'],
      updatedTeamIds: ['team-1'],
      issues: [],
      rollbackErrors: [],
    });
  });

  test('renders startup farm draft controls', () => {
    render(<LeagueBuilderDraft />);

    expect(screen.getByText('STARTUP FARM DRAFT')).toBeInTheDocument();
    expect(screen.getByText('LEAGUE BUILDER SETUP')).toBeInTheDocument();
    expect(screen.getByLabelText(/DETERMINISTIC SEED/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /GENERATE STARTUP FARM DRAFT/i })).toBeInTheDocument();
    expect(screen.getByText('TEAM FARM READINESS')).toBeInTheDocument();
  });

  test('back button navigates to League Builder', () => {
    render(<LeagueBuilderDraft />);

    fireEvent.click(screen.getByRole('button', { name: /Back to League Builder/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/league-builder');
  });

  test('prepared league shows no required draft apply action', async () => {
    vi.mocked(createLeagueBuilderStartupFarmDraftPreview).mockResolvedValueOnce(makePreview({
      prepared: true,
      totalVacancies: 0,
      selectedPicks: [],
      visibleReports: [],
      teams: [
        { teamId: 'team-1', teamName: 'Boston Sox', farmCount: 10, mlbCount: 22, missingFarm: 0, prepared: true },
        { teamId: 'team-2', teamName: 'Detroit Tigers', farmCount: 10, mlbCount: 22, missingFarm: 0, prepared: true },
      ],
    }) as any);

    render(<LeagueBuilderDraft />);
    fireEvent.click(screen.getByRole('button', { name: /GENERATE STARTUP FARM DRAFT/i }));

    await screen.findByText('PREPARED');
    expect(screen.getByText(/already has 10 FARM players per team/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /APPLY DRAFT TO LEAGUE BUILDER/i })).not.toBeInTheDocument();
  });

  test('incomplete league can generate, review, and apply draft', async () => {
    render(<LeagueBuilderDraft />);
    fireEvent.click(screen.getByRole('button', { name: /GENERATE STARTUP FARM DRAFT/i }));

    await screen.findByText('Ari Banks');
    expect(screen.getByText('Scouted B+')).toBeInTheDocument();
    expect(screen.getByText('Specialties: outfield')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /APPLY DRAFT TO LEAGUE BUILDER/i }));

    await waitFor(() => {
      expect(applyLeagueBuilderStartupFarmDraft).toHaveBeenCalled();
      expect(mockRefresh).toHaveBeenCalled();
    });
    expect(await screen.findByText(/Applied 1 FARM prospects/i)).toBeInTheDocument();
  });

  test('does not render hidden true ratings or hidden personality modifiers', async () => {
    render(<LeagueBuilderDraft />);
    fireEvent.click(screen.getByRole('button', { name: /GENERATE STARTUP FARM DRAFT/i }));

    await screen.findByText('Ari Banks');
    expect(screen.queryByText(/true grade/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/hiddenPersonalityModifiers/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/leadership/i)).not.toBeInTheDocument();
  });

  test('blocked farm state reports blocker and hides apply action', async () => {
    vi.mocked(createLeagueBuilderStartupFarmDraftPreview).mockResolvedValueOnce(makePreview({
      valid: false,
      blockers: ['Boston Sox: FARM roster does not match player FARM assignments.'],
      selectedPicks: [],
      visibleReports: [],
    }) as any);

    render(<LeagueBuilderDraft />);
    fireEvent.click(screen.getByRole('button', { name: /GENERATE STARTUP FARM DRAFT/i }));

    await screen.findByText('BLOCKED');
    expect(screen.getByText(/does not match player FARM assignments/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /APPLY DRAFT TO LEAGUE BUILDER/i })).not.toBeInTheDocument();
  });

  test('no-team league blocks generation', async () => {
    vi.mocked(useLeagueBuilderData).mockReturnValue({
      leagues: [{ ...baseLeague, teamIds: [] }],
      teams: [],
      players: [],
      rulesPresets: [],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    } as any);

    render(<LeagueBuilderDraft />);

    expect(screen.getByText('Selected league has no teams.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /GENERATE STARTUP FARM DRAFT/i })).toBeDisabled();
  });
});
