/**
 * LeagueBuilderTeams Component Tests
 *
 * Tests the teams management page with CRUD operations.
 * Per Ralph Framework S-B017
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LeagueBuilderTeams } from '../../app/pages/LeagueBuilderTeams';
import { getAuctionSession } from '../../../utils/leagueBuilderStorage';

// ============================================
// MOCKS
// ============================================

const mockNavigate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../utils/leagueBuilderStorage', async () => {
  const actual = await vi.importActual<typeof import('../../../utils/leagueBuilderStorage')>(
    '../../../utils/leagueBuilderStorage',
  );
  return {
    ...actual,
    getAuctionSession: vi.fn(async () => null),
  };
});

const mockCreateTeam = vi.fn(async (team) => team);
const mockUpdateTeam = vi.fn(async (team) => team);
const mockRemoveTeam = vi.fn().mockResolvedValue(undefined);

vi.mock('../../hooks/useLeagueBuilderData', () => ({
  useLeagueBuilderData: vi.fn(() => ({
    teams: [
      {
        id: 'team-1',
        name: 'Boston Sox',
        abbreviation: 'SOX',
        location: 'Boston',
        nickname: 'Sox',
        stadium: 'Fenway Park',
        stadiumCapacity: 37000,
        colors: { primary: '#FF0000', secondary: '#FFFFFF' },
        foundedYear: 1901,
        championships: 9,
        backstory: 'A city club built around the old rail yards.',
        era: 'CLASSIC_TV',
        cityVibe: 'Tin-roof neighborhoods and late-night diners',
        ballparkNickname: 'The Yard',
      },
      {
        id: 'team-2',
        name: 'Detroit Tigers',
        abbreviation: 'DET',
        location: 'Detroit',
        nickname: 'Tigers',
        stadium: 'Tiger Stadium',
        stadiumCapacity: 41000,
        colors: { primary: '#FF6600', secondary: '#000000' },
        foundedYear: 1894,
        championships: 4,
      },
    ],
    leagues: [
      { id: 'league-1', name: 'Kruse Baseball', teamIds: ['team-1', 'team-2'] },
    ],
    isLoading: false,
    error: null,
    createTeam: mockCreateTeam,
    updateTeam: mockUpdateTeam,
    removeTeam: mockRemoveTeam,
  })),
}));

vi.mock('../../../utils/managerIdentityStorage', () => ({
  LEAGUE_BUILDER_MANAGER_INSTANCE_ID: 'league-builder-template',
  ensureDefaultManagerProfile: vi.fn(async (team) => ({
    managerId: `default-manager-${team.id}`,
    displayName: `${team.name} Manager`,
    defaultManager: true,
  })),
  ensureDefaultManagerProfiles: vi.fn().mockResolvedValue(undefined),
  listManagerAssignments: vi.fn().mockResolvedValue([]),
  listManagerProfiles: vi.fn().mockResolvedValue([]),
  saveManagerAssignment: vi.fn().mockResolvedValue(undefined),
  saveManagerProfile: vi.fn(async (profile) => ({
    ...profile,
    managerId: profile.managerId || 'saved-manager',
    displayName: profile.displayName,
    defaultManager: profile.defaultManager ?? false,
  })),
}));

// ============================================
// TESTS
// ============================================

describe('LeagueBuilderTeams Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuctionSession).mockResolvedValue(null);
  });

  describe('Header', () => {
    test('renders TEAMS title', () => {
      render(<LeagueBuilderTeams />);
      expect(screen.getByText('TEAMS')).toBeInTheDocument();
    });

    test('renders back button', () => {
      render(<LeagueBuilderTeams />);
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toBeInTheDocument();
    });

    test('back button navigates to league builder', () => {
      render(<LeagueBuilderTeams />);
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/league-builder');
    });
  });

  describe('Create Button', () => {
    test('renders CREATE NEW TEAM button', () => {
      render(<LeagueBuilderTeams />);
      expect(screen.getByText('CREATE NEW TEAM')).toBeInTheDocument();
    });

    test('clicking CREATE NEW TEAM opens modal', async () => {
      render(<LeagueBuilderTeams />);
      fireEvent.click(screen.getByText('CREATE NEW TEAM'));
      await waitFor(() => {
        expect(screen.getByText('Create New Team')).toBeInTheDocument();
      });
    });
  });

  describe('Teams List', () => {
    test('renders team names', () => {
      render(<LeagueBuilderTeams />);
      expect(screen.getByText('Boston Sox')).toBeInTheDocument();
      expect(screen.getByText('Detroit Tigers')).toBeInTheDocument();
    });

    test('renders team abbreviations', () => {
      render(<LeagueBuilderTeams />);
      expect(screen.getByText('SOX')).toBeInTheDocument();
      expect(screen.getByText('DET')).toBeInTheDocument();
    });

    test('renders location info', () => {
      render(<LeagueBuilderTeams />);
      // Teams display location, not stadium, in the list
      expect(screen.getByText('Boston Sox')).toBeInTheDocument();
      expect(screen.getByText('Detroit Tigers')).toBeInTheDocument();
    });

    test('renders edit buttons for each team', () => {
      render(<LeagueBuilderTeams />);
      const editButtons = screen.getAllByTitle('Edit team');
      expect(editButtons.length).toBe(2);
    });

    test('renders delete buttons for each team', () => {
      render(<LeagueBuilderTeams />);
      const deleteButtons = screen.getAllByTitle('Delete team');
      expect(deleteButtons.length).toBe(2);
    });
  });

  describe('Edit Team', () => {
    test('clicking edit button opens modal', async () => {
      render(<LeagueBuilderTeams />);
      const editButtons = screen.getAllByTitle('Edit team');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Edit Team')).toBeInTheDocument();
      });
    });

    test('modal shows team name input with value', async () => {
      render(<LeagueBuilderTeams />);
      const editButtons = screen.getAllByTitle('Edit team');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Boston Sox')).toBeInTheDocument();
      });
    });

    test('shows League Builder stadium source guidance for unmatched custom stadium names', async () => {
      render(<LeagueBuilderTeams />);
      fireEvent.click(screen.getAllByTitle('Edit team')[0]);

      expect(await screen.findByText('Stadium source')).toBeInTheDocument();
      expect(screen.getByText('MODE 2 COPY')).toBeInTheDocument();
      expect(screen.getByText('DIMENSIONS MISSING')).toBeInTheDocument();
      expect(screen.getByText(/Mode 2 copies this name/i)).toBeInTheDocument();
      expect(screen.getByText(/Custom dimensions and adaptive park-factor persistence remain blocked/i)).toBeInTheDocument();
    });

    test('shows matched SMB4 stadium dimensions as the seed source', async () => {
      render(<LeagueBuilderTeams />);
      fireEvent.click(screen.getAllByTitle('Edit team')[0]);

      const stadiumInput = await screen.findByDisplayValue('Fenway Park');
      fireEvent.change(stadiumInput, { target: { value: 'Apple Field' } });

      expect(screen.getByText('SMB4 MATCH')).toBeInTheDocument();
      expect(screen.getByText(/Apple Field: LF 337 · CF 419 · RF 347/i)).toBeInTheDocument();
      expect(screen.queryByText('DIMENSIONS MISSING')).not.toBeInTheDocument();
    });

    test('round-trips team editorial identity fields through updateTeam', async () => {
      render(<LeagueBuilderTeams />);
      fireEvent.click(screen.getAllByTitle('Edit team')[0]);

      expect(await screen.findByText('Editorial Identity')).toBeInTheDocument();
      expect(screen.getByDisplayValue('A city club built around the old rail yards.')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Tin-roof neighborhoods and late-night diners')).toBeInTheDocument();
      expect(screen.getByDisplayValue('The Yard')).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Backstory'), {
        target: { value: 'Born from a smoky depot league and still allergic to polish.' },
      });
      fireEvent.change(screen.getByLabelText('Era'), {
        target: { value: 'GOLDEN_AGE' },
      });
      fireEvent.change(screen.getByLabelText('City Vibe'), {
        target: { value: 'Wharf bells, brass bands, and stubborn optimism' },
      });
      fireEvent.change(screen.getByLabelText('Ballpark Nickname'), {
        target: { value: 'The Kettle' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

      await waitFor(() => {
        expect(mockUpdateTeam).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'team-1',
            backstory: 'Born from a smoky depot league and still allergic to polish.',
            era: 'GOLDEN_AGE',
            cityVibe: 'Wharf bells, brass bands, and stubborn optimism',
            ballparkNickname: 'The Kettle',
          }),
        );
      });
    });

    test('round-trips farm cap identity independently through updateTeam', async () => {
      render(<LeagueBuilderTeams />);
      fireEvent.click(screen.getAllByTitle('Edit team')[0]);

      expect(await screen.findByText('Farm Identity (Cap)')).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Farm Power priority'), {
        target: { value: '4' },
      });
      fireEvent.change(screen.getByLabelText('Farm increase cap modification 1'), {
        target: { value: 'POW' },
      });
      fireEvent.change(screen.getByLabelText('Farm decrease cap modification 1'), {
        target: { value: 'ARM' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

      await waitFor(() => {
        expect(mockUpdateTeam).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'team-1',
            capIdentity: {
              bandPriorities: {
                Power: 0,
                Contact: 0,
                Speed: 0,
                Defense: 0,
                Rotation: 0,
                Bullpen: 0,
              },
              increase: [],
              decrease: [],
            },
            farmCapIdentity: {
              bandPriorities: {
                Power: 4,
                Contact: 0,
                Speed: 0,
                Defense: 0,
                Rotation: 0,
                Bullpen: 0,
              },
              increase: ['POW'],
              decrease: ['ARM'],
            },
          }),
        );
      });
    });

    test('allows team abbreviations longer than four characters in edit mode', async () => {
      render(<LeagueBuilderTeams />);
      fireEvent.click(screen.getAllByTitle('Edit team')[0]);

      const abbreviationInput = await screen.findByDisplayValue('SOX');
      fireEvent.change(abbreviationInput, { target: { value: 'LONGFORM' } });

      expect(abbreviationInput).toHaveValue('LONGFORM');

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

      await waitFor(() => {
        expect(mockUpdateTeam).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'team-1',
            abbreviation: 'LONGFORM',
          }),
        );
      });
    });

    test('blocks edits to league teams while a saved auction is in progress', async () => {
      vi.mocked(getAuctionSession).mockResolvedValue({
        leagueId: 'league-1',
        session: {
          state: 'OPEN_BIDDING',
          players: {},
        },
      } as Awaited<ReturnType<typeof getAuctionSession>>);

      render(<LeagueBuilderTeams />);
      fireEvent.click(screen.getAllByTitle('Edit team')[0]);

      expect((await screen.findAllByText(/A saved auction is in progress/i)).length).toBeGreaterThan(0);
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      expect(saveButton).toBeDisabled();

      fireEvent.click(saveButton);
      expect(mockUpdateTeam).not.toHaveBeenCalled();
    });
  });

  describe('Delete Team', () => {
    test('clicking delete shows confirmation buttons', () => {
      render(<LeagueBuilderTeams />);
      const deleteButtons = screen.getAllByTitle('Delete team');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByTitle('Confirm delete')).toBeInTheDocument();
      expect(screen.getByTitle('Cancel')).toBeInTheDocument();
    });

    test('clicking cancel hides confirmation buttons', () => {
      render(<LeagueBuilderTeams />);
      const deleteButtons = screen.getAllByTitle('Delete team');
      fireEvent.click(deleteButtons[0]);

      fireEvent.click(screen.getByTitle('Cancel'));
      expect(screen.queryByTitle('Confirm delete')).not.toBeInTheDocument();
    });

    test('clicking confirm delete calls removeTeam', async () => {
      render(<LeagueBuilderTeams />);
      await act(async () => {
        await Promise.resolve();
      });
      const deleteButtons = screen.getAllByTitle('Delete team');
      fireEvent.click(deleteButtons[0]);
      fireEvent.click(screen.getByTitle('Confirm delete'));

      await waitFor(() => {
        expect(mockRemoveTeam).toHaveBeenCalledWith('team-1');
      });
    });
  });

  describe('Modal', () => {
    test('modal has close button', async () => {
      render(<LeagueBuilderTeams />);
      fireEvent.click(screen.getByText('CREATE NEW TEAM'));

      await waitFor(() => {
        expect(screen.getByText('Create New Team')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(1);
    });

    test('modal shows form fields', async () => {
      render(<LeagueBuilderTeams />);
      fireEvent.click(screen.getByText('CREATE NEW TEAM'));

      await waitFor(() => {
        expect(screen.getByText(/Team Name/)).toBeInTheDocument();
        expect(screen.getByText(/Abbreviation/)).toBeInTheDocument();
      });
    });

    test('enforces the team backstory character cap with a live counter', async () => {
      render(<LeagueBuilderTeams />);
      fireEvent.click(screen.getByText('CREATE NEW TEAM'));

      const backstory = await screen.findByLabelText('Backstory');
      fireEvent.change(backstory, { target: { value: 'B'.repeat(520) } });

      expect(backstory).toHaveValue('B'.repeat(500));
      expect(screen.getByText('500/500')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    test('shows loading indicator when isLoading', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        teams: [],
        leagues: [],
        players: [],
        rulesPresets: [],
        isLoading: true,
        error: null,
        createTeam: mockCreateTeam,
        updateTeam: mockUpdateTeam,
        removeTeam: mockRemoveTeam,
        createLeague: vi.fn(),
        updateLeague: vi.fn(),
        removeLeague: vi.fn(),
        duplicateLeague: vi.fn(),
        createPlayer: vi.fn(),
        updatePlayer: vi.fn(),
        removePlayer: vi.fn(),
        createRulesPreset: vi.fn(),
        updateRulesPreset: vi.fn(),
        removeRulesPreset: vi.fn(),
        refresh: vi.fn(),
      });

      render(<LeagueBuilderTeams />);
      expect(screen.getByText('Loading teams...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    test('shows error message when error occurs', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        teams: [],
        leagues: [],
        players: [],
        rulesPresets: [],
        isLoading: false,
        error: 'Failed to load teams',
        createTeam: mockCreateTeam,
        updateTeam: mockUpdateTeam,
        removeTeam: mockRemoveTeam,
        createLeague: vi.fn(),
        updateLeague: vi.fn(),
        removeLeague: vi.fn(),
        duplicateLeague: vi.fn(),
        createPlayer: vi.fn(),
        updatePlayer: vi.fn(),
        removePlayer: vi.fn(),
        createRulesPreset: vi.fn(),
        updateRulesPreset: vi.fn(),
        removeRulesPreset: vi.fn(),
        refresh: vi.fn(),
      });

      render(<LeagueBuilderTeams />);
      expect(screen.getByText('Failed to load teams')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    test('shows empty message when no teams exist', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        teams: [],
        leagues: [],
        players: [],
        rulesPresets: [],
        isLoading: false,
        error: null,
        createTeam: mockCreateTeam,
        updateTeam: mockUpdateTeam,
        removeTeam: mockRemoveTeam,
        createLeague: vi.fn(),
        updateLeague: vi.fn(),
        removeLeague: vi.fn(),
        duplicateLeague: vi.fn(),
        createPlayer: vi.fn(),
        updatePlayer: vi.fn(),
        removePlayer: vi.fn(),
        createRulesPreset: vi.fn(),
        updateRulesPreset: vi.fn(),
        removeRulesPreset: vi.fn(),
        refresh: vi.fn(),
      });

      render(<LeagueBuilderTeams />);
      expect(screen.getByText('No Teams Yet')).toBeInTheDocument();
    });
  });

});
