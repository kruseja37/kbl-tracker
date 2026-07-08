/**
 * LeagueBuilderLeagues Component Tests
 *
 * Tests the leagues management page with CRUD operations.
 * Per Ralph Framework S-B017
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { LeagueBuilderLeagues } from '../../app/pages/LeagueBuilderLeagues';
import {
  draftRouteForFormat,
  draftRouteForLeague,
  farmDraftRouteForFormat,
  farmDraftRouteForLeague,
} from '../../app/utils/draftRouting';
import { getAuctionSession } from '../../../utils/leagueBuilderStorage';
import { TIER_CAPS } from '../../../data/tierParams';
import { SALARY_CAP_FLOOR, salaryCapHardError } from '../../app/utils/salaryCapInput';

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

const mockCreateLeague = vi.fn().mockResolvedValue(undefined);
const mockUpdateLeague = vi.fn().mockResolvedValue(undefined);
const mockRemoveLeague = vi.fn().mockResolvedValue(undefined);
const mockDuplicateLeague = vi.fn().mockResolvedValue(undefined);

vi.mock('../../hooks/useLeagueBuilderData', () => ({
  useLeagueBuilderData: vi.fn(() => ({
    leagues: [
      {
        id: 'league-1',
        name: 'Kruse Baseball',
        description: 'Main league',
        teamIds: ['team-1', 'team-2'],
        conferences: [],
        divisions: [],
        defaultRulesPreset: 'preset-1',
        draftFormat: 'auction',
        color: '#5A8352',
        createdDate: '2026-01-15T00:00:00.000Z',
      },
      {
        id: 'league-2',
        name: 'Minor League',
        teamIds: ['team-3'],
        conferences: [],
        divisions: [],
        defaultRulesPreset: 'preset-1',
        draftFormat: 'snake',
        color: '#CC44CC',
        createdDate: '2026-01-20T00:00:00.000Z',
      },
    ],
    teams: [
      { id: 'team-1', name: 'Sox', colors: { primary: '#FF0000', secondary: '#FFFFFF' } },
      { id: 'team-2', name: 'Tigers', colors: { primary: '#FF6600', secondary: '#000000' } },
      { id: 'team-3', name: 'Bears', colors: { primary: '#0000FF', secondary: '#FFFFFF' } },
    ],
    rulesPresets: [
      { id: 'preset-1', name: 'Standard', isDefault: true },
      { id: 'preset-2', name: 'Quick Game', isDefault: false },
    ],
    isLoading: false,
    error: null,
    createLeague: mockCreateLeague,
    updateLeague: mockUpdateLeague,
    removeLeague: mockRemoveLeague,
    duplicateLeague: mockDuplicateLeague,
  })),
}));

const openCreateLeagueModal = async () => {
  fireEvent.click(screen.getByText('CREATE NEW LEAGUE'));
  expect(await screen.findByText('Create New League')).toBeInTheDocument();
};

const createLeagueFromModal = async (name: string) => {
  fireEvent.change(screen.getByPlaceholderText('e.g., Kruse Baseball League'), {
    target: { value: name },
  });
  fireEvent.click(screen.getByRole('button', { name: /^create league$/i }));
  await waitFor(() => {
    expect(screen.queryByText('Create New League')).not.toBeInTheDocument();
  });
};

const renderSettledLeagueBuilderLeagues = async () => {
  const result = render(<LeagueBuilderLeagues />);
  await waitFor(() => {
    expect(vi.mocked(getAuctionSession)).toHaveBeenCalledWith('league-1', expect.any(Number));
    expect(vi.mocked(getAuctionSession)).toHaveBeenCalledWith('league-2', expect.any(Number));
  });
  return result;
};

// ============================================
// TESTS
// ============================================

describe('LeagueBuilderLeagues Component', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(getAuctionSession).mockResolvedValue(null);
    const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
    vi.mocked(useLeagueBuilderData).mockReturnValue({
      leagues: [
        {
          id: 'league-1',
          name: 'Kruse Baseball',
          description: 'Main league',
          teamIds: ['team-1', 'team-2'],
          conferences: [],
          divisions: [],
          defaultRulesPreset: 'preset-1',
          draftFormat: 'auction',
          color: '#5A8352',
          createdDate: '2026-01-15T00:00:00.000Z',
        },
        {
          id: 'league-2',
          name: 'Minor League',
          teamIds: ['team-3'],
          conferences: [],
          divisions: [],
          defaultRulesPreset: 'preset-1',
          draftFormat: 'snake',
          color: '#CC44CC',
          createdDate: '2026-01-20T00:00:00.000Z',
        },
      ],
      teams: [
        { id: 'team-1', name: 'Sox', colors: { primary: '#FF0000', secondary: '#FFFFFF' } },
        { id: 'team-2', name: 'Tigers', colors: { primary: '#FF6600', secondary: '#000000' } },
        { id: 'team-3', name: 'Bears', colors: { primary: '#0000FF', secondary: '#FFFFFF' } },
      ],
      rulesPresets: [
        { id: 'preset-1', name: 'Standard', isDefault: true },
        { id: 'preset-2', name: 'Quick Game', isDefault: false },
      ],
      isLoading: false,
      error: null,
      createLeague: mockCreateLeague,
      updateLeague: mockUpdateLeague,
      removeLeague: mockRemoveLeague,
      duplicateLeague: mockDuplicateLeague,
    });
  });

  describe('Header', () => {
    test('renders LEAGUES title', async () => {
      await renderSettledLeagueBuilderLeagues();
      expect(screen.getByText('LEAGUES')).toBeInTheDocument();
    });

    test('renders back button', async () => {
      await renderSettledLeagueBuilderLeagues();
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toBeInTheDocument();
    });

    test('back button navigates to league builder', async () => {
      await renderSettledLeagueBuilderLeagues();
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/league-builder');
    });
  });

  describe('Create Button', () => {
    test('renders CREATE NEW LEAGUE button', async () => {
      await renderSettledLeagueBuilderLeagues();
      expect(screen.getByText('CREATE NEW LEAGUE')).toBeInTheDocument();
    });

    test('clicking CREATE NEW LEAGUE opens modal', async () => {
      await renderSettledLeagueBuilderLeagues();
      fireEvent.click(screen.getByText('CREATE NEW LEAGUE'));
      await waitFor(() => {
        expect(screen.getByText('Create New League')).toBeInTheDocument();
      });
    });

    test('does not show the unconsumed default rules preset selector', async () => {
      await renderSettledLeagueBuilderLeagues();
      await openCreateLeagueModal();

      expect(screen.queryByText('Default Rules Preset')).not.toBeInTheDocument();
      expect(screen.queryByDisplayValue('Standard')).not.toBeInTheDocument();
      expect(screen.queryByDisplayValue('Quick Game')).not.toBeInTheDocument();
    });

    test('salary cap seeds from tier and reseeds only before the field is edited', async () => {
      await renderSettledLeagueBuilderLeagues();
      await openCreateLeagueModal();

      const capInput = screen.getByLabelText('Salary cap');
      expect(capInput).toHaveValue(TIER_CAPS.juiced.tierCap.toLocaleString());
      expect(screen.getByText(`TIER REFERENCE: $${TIER_CAPS.juiced.tierCap.toLocaleString()}`)).toBeInTheDocument();

      fireEvent.change(screen.getByDisplayValue('Juiced'), { target: { value: 'standard' } });
      expect(capInput).toHaveValue(TIER_CAPS.standard.tierCap.toLocaleString());
      expect(screen.getByText(`TIER REFERENCE: $${TIER_CAPS.standard.tierCap.toLocaleString()}`)).toBeInTheDocument();

      fireEvent.change(capInput, { target: { value: '900000' } });
      expect(capInput).toHaveValue('900,000');
      fireEvent.change(screen.getByDisplayValue('Standard'), { target: { value: 'nerfed' } });
      expect(capInput).toHaveValue('900,000');
      expect(screen.getByText(`TIER REFERENCE: $${TIER_CAPS.nerfed.tierCap.toLocaleString()}`)).toBeInTheDocument();
    });

    test('salary cap hard-blocks impossible values and soft-warns loose values without blocking save', async () => {
      await renderSettledLeagueBuilderLeagues();
      await openCreateLeagueModal();

      const capInput = screen.getByLabelText('Salary cap');
      fireEvent.change(capInput, { target: { value: String(SALARY_CAP_FLOOR - 1) } });
      expect(screen.getByText(salaryCapHardError(SALARY_CAP_FLOOR - 1)!)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^create league$/i })).toBeDisabled();

      fireEvent.change(capInput, { target: { value: '3000000' } });
      expect(screen.getByText('Rarely binding for this tier.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^create league$/i })).toBeDisabled();

      fireEvent.change(screen.getByPlaceholderText('e.g., Kruse Baseball League'), {
        target: { value: 'Cap League' },
      });
      expect(screen.getByRole('button', { name: /^create league$/i })).not.toBeDisabled();
    });

    test('persists the salary cap through league creation', async () => {
      await renderSettledLeagueBuilderLeagues();
      await openCreateLeagueModal();

      fireEvent.change(screen.getByPlaceholderText('e.g., Kruse Baseball League'), {
        target: { value: 'Cap League' },
      });
      fireEvent.change(screen.getByLabelText('Salary cap'), { target: { value: '1000000' } });
      fireEvent.click(screen.getByRole('button', { name: /^create league$/i }));

      await waitFor(() => {
        expect(mockCreateLeague).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Cap League',
          salaryCap: 1_000_000,
          defaultRulesPreset: 'standard',
        }));
      });
    });

    test('keeps untouched conference fields empty on default league creation', async () => {
      await renderSettledLeagueBuilderLeagues();
      await openCreateLeagueModal();
      await createLeagueFromModal('Plain League');

      await waitFor(() => {
        expect(mockCreateLeague).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Plain League',
          conferences: [],
          divisions: [],
        }));
      });
    });

    test('persists balanced conference assignments when the editor is used', async () => {
      await renderSettledLeagueBuilderLeagues();
      await openCreateLeagueModal();

      fireEvent.change(screen.getByPlaceholderText('e.g., Kruse Baseball League'), {
        target: { value: 'Conference League' },
      });
      fireEvent.click(screen.getByLabelText('Sox'));
      fireEvent.click(screen.getByLabelText('Tigers'));
      fireEvent.click(screen.getByText('Balanced split'));
      fireEvent.click(screen.getByRole('button', { name: /^create league$/i }));

      await waitFor(() => {
        expect(mockCreateLeague).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Conference League',
          conferences: [
            { id: 'conf-1', name: 'Eastern', abbreviation: 'EAST', divisionIds: ['division-conf-1'] },
            { id: 'conf-2', name: 'Western', abbreviation: 'WEST', divisionIds: ['division-conf-2'] },
          ],
          divisions: [
            { id: 'division-conf-1', name: 'Eastern', conferenceId: 'conf-1', teamIds: ['team-1'] },
            { id: 'division-conf-2', name: 'Western', conferenceId: 'conf-2', teamIds: ['team-2'] },
          ],
        }));
      });
    });
  });

  describe('Leagues List', () => {
    test('renders league names', async () => {
      await renderSettledLeagueBuilderLeagues();
      expect(screen.getByText('Kruse Baseball')).toBeInTheDocument();
      expect(screen.getByText('Minor League')).toBeInTheDocument();
    });

    test('renders league descriptions', async () => {
      await renderSettledLeagueBuilderLeagues();
      expect(screen.getByText('Main league')).toBeInTheDocument();
    });

    test('renders team counts', async () => {
      await renderSettledLeagueBuilderLeagues();
      expect(screen.getByText('2 teams')).toBeInTheDocument();
      expect(screen.getByText('1 team')).toBeInTheDocument();
    });

    test('renders edit buttons for each league', async () => {
      await renderSettledLeagueBuilderLeagues();
      const editButtons = screen.getAllByTitle('Edit league');
      expect(editButtons.length).toBe(2);
    });

    test('renders duplicate buttons for each league', async () => {
      await renderSettledLeagueBuilderLeagues();
      const duplicateButtons = screen.getAllByTitle('Duplicate league');
      expect(duplicateButtons.length).toBe(2);
    });

    test('renders delete buttons for each league', async () => {
      await renderSettledLeagueBuilderLeagues();
      const deleteButtons = screen.getAllByTitle('Delete league');
      expect(deleteButtons.length).toBe(2);
    });

    test('draft route helper maps every legacy format to auction routes', () => {
      expect(draftRouteForFormat('snake')).toBe('/league-builder/auction-draft');
      expect(draftRouteForFormat('auction')).toBe('/league-builder/auction-draft');
      expect(draftRouteForFormat(undefined)).toBe('/league-builder/auction-draft');
      expect(farmDraftRouteForFormat('snake')).toBe('/league-builder/farm-auction-draft');
      expect(farmDraftRouteForFormat('auction')).toBe('/league-builder/farm-auction-draft');
      expect(farmDraftRouteForFormat(undefined)).toBe('/league-builder/farm-auction-draft');
    });

    test('per-league Draft action opens Draft Setup threading leagueId; retired formats fall back to auction', async () => {
      expect(draftRouteForLeague({ id: 'league-2', draftFormat: 'snake' })).toBe(
        '/league-builder/auction-draft?leagueId=league-2',
      );
      expect(farmDraftRouteForLeague({ id: 'league-2', draftFormat: 'snake' })).toBe(
        '/league-builder/farm-auction-draft?leagueId=league-2',
      );

      await renderSettledLeagueBuilderLeagues();
      const draftButtons = screen.getAllByTitle('Draft setup');

      fireEvent.click(draftButtons[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/league-builder/draft-setup?leagueId=league-1');

      fireEvent.click(draftButtons[1]);
      expect(mockNavigate).toHaveBeenCalledWith('/league-builder/draft-setup?leagueId=league-2');
    });
  });

  describe('Edit League', () => {
    test('clicking edit button opens modal with league data', async () => {
      await renderSettledLeagueBuilderLeagues();
      const editButtons = screen.getAllByTitle('Edit league');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Edit League')).toBeInTheDocument();
      });
    });

    test('modal shows league name label', async () => {
      await renderSettledLeagueBuilderLeagues();
      fireEvent.click(screen.getByText('CREATE NEW LEAGUE'));
      await waitFor(() => {
        expect(screen.getByText(/League Name/)).toBeInTheDocument();
      });
    });

    test('blocks edits to a league while its saved auction is in progress', async () => {
      vi.mocked(getAuctionSession).mockImplementation(async (leagueId) => (
        leagueId === 'league-1'
          ? ({
              leagueId: 'league-1',
              session: {
                state: 'OPEN_BIDDING',
                players: {},
              },
            } as Awaited<ReturnType<typeof getAuctionSession>>)
          : null
      ));

      await renderSettledLeagueBuilderLeagues();
      fireEvent.click(screen.getAllByTitle('Edit league')[0]);

      expect((await screen.findAllByText(/A saved auction is in progress/i)).length).toBeGreaterThan(0);
      const bearsCheckbox = screen.getByLabelText('Bears');
      expect(bearsCheckbox).toBeDisabled();

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      expect(saveButton).toBeDisabled();
      fireEvent.click(saveButton);
      expect(mockUpdateLeague).not.toHaveBeenCalled();
    });

    test('allows edits to an unrelated league after the saved-auction lookup resolves', async () => {
      vi.mocked(getAuctionSession).mockImplementation(async (leagueId) => (
        leagueId === 'league-1'
          ? ({
              leagueId: 'league-1',
              session: {
                state: 'OPEN_BIDDING',
                players: {},
              },
            } as Awaited<ReturnType<typeof getAuctionSession>>)
          : null
      ));

      await renderSettledLeagueBuilderLeagues();

      fireEvent.click(screen.getAllByTitle('Edit league')[1]);
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });

      await waitFor(() => {
        expect(saveButton).not.toBeDisabled();
      });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateLeague).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'league-2',
          }),
        );
      });
    });

    test('reloads, edits, and persists existing conference assignments', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        leagues: [
          {
            id: 'league-1',
            name: 'Kruse Baseball',
            description: 'Main league',
            teamIds: ['team-1', 'team-2', 'team-3'],
            conferences: [
              { id: 'conf-east', name: 'East Circuit', abbreviation: 'EC', divisionIds: ['div-east'] },
              { id: 'conf-west', name: 'West Circuit', abbreviation: 'WC', divisionIds: ['div-west'] },
            ],
            divisions: [
              { id: 'div-east', name: 'East Circuit', conferenceId: 'conf-east', teamIds: ['team-1'] },
              { id: 'div-west', name: 'West Circuit', conferenceId: 'conf-west', teamIds: ['team-2', 'team-3'] },
            ],
            defaultRulesPreset: 'preset-1',
            draftFormat: 'auction',
            color: '#5A8352',
            createdDate: '2026-01-15T00:00:00.000Z',
          },
          {
            id: 'league-2',
            name: 'Minor League',
            teamIds: ['team-3'],
            conferences: [],
            divisions: [],
            defaultRulesPreset: 'preset-1',
            draftFormat: 'auction',
            color: '#CC44CC',
            createdDate: '2026-01-20T00:00:00.000Z',
          },
        ],
        teams: [
          { id: 'team-1', name: 'Sox', colors: { primary: '#FF0000', secondary: '#FFFFFF' } },
          { id: 'team-2', name: 'Tigers', colors: { primary: '#FF6600', secondary: '#000000' } },
          { id: 'team-3', name: 'Bears', colors: { primary: '#0000FF', secondary: '#FFFFFF' } },
        ],
        rulesPresets: [
          { id: 'preset-1', name: 'Standard', isDefault: true },
        ],
        isLoading: false,
        error: null,
        createLeague: mockCreateLeague,
        updateLeague: mockUpdateLeague,
        removeLeague: mockRemoveLeague,
        duplicateLeague: mockDuplicateLeague,
      });

      await renderSettledLeagueBuilderLeagues();
      fireEvent.click(screen.getAllByTitle('Edit league')[0]);

      expect(await screen.findByLabelText('Conference name East Circuit')).toBeInTheDocument();
      expect(screen.getByLabelText('Sox conference')).toHaveValue('conf-east');
      expect(screen.getByLabelText('Bears conference')).toHaveValue('conf-west');

      fireEvent.change(screen.getByLabelText('Conference name East Circuit'), {
        target: { value: 'North Circuit' },
      });
      fireEvent.change(screen.getByLabelText('Bears conference'), {
        target: { value: 'conf-east' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

      await waitFor(() => {
        expect(mockUpdateLeague).toHaveBeenCalledWith(expect.objectContaining({
          id: 'league-1',
          conferences: [
            { id: 'conf-east', name: 'North Circuit', abbreviation: 'NC', divisionIds: ['division-conf-east'] },
            { id: 'conf-west', name: 'West Circuit', abbreviation: 'WC', divisionIds: ['division-conf-west'] },
          ],
          divisions: [
            { id: 'division-conf-east', name: 'North Circuit', conferenceId: 'conf-east', teamIds: ['team-1', 'team-3'] },
            { id: 'division-conf-west', name: 'West Circuit', conferenceId: 'conf-west', teamIds: ['team-2'] },
          ],
        }));
      });
    });
  });

  describe('Duplicate League', () => {
    test('clicking duplicate calls duplicateLeague', async () => {
      await renderSettledLeagueBuilderLeagues();
      const duplicateButtons = screen.getAllByTitle('Duplicate league');
      fireEvent.click(duplicateButtons[0]);

      await waitFor(() => {
        expect(mockDuplicateLeague).toHaveBeenCalledWith('league-1');
      });
    });
  });

  describe('Delete League', () => {
    test('clicking delete shows confirmation buttons', async () => {
      await renderSettledLeagueBuilderLeagues();
      const deleteButtons = screen.getAllByTitle('Delete league');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByTitle('Confirm delete')).toBeInTheDocument();
      expect(screen.getByTitle('Cancel')).toBeInTheDocument();
    });

    test('clicking cancel hides confirmation buttons', async () => {
      await renderSettledLeagueBuilderLeagues();
      const deleteButtons = screen.getAllByTitle('Delete league');
      fireEvent.click(deleteButtons[0]);

      fireEvent.click(screen.getByTitle('Cancel'));
      expect(screen.queryByTitle('Confirm delete')).not.toBeInTheDocument();
    });

    test('clicking confirm delete calls removeLeague', async () => {
      await renderSettledLeagueBuilderLeagues();
      const deleteButtons = screen.getAllByTitle('Delete league');
      fireEvent.click(deleteButtons[0]);
      fireEvent.click(screen.getByTitle('Confirm delete'));

      await waitFor(() => {
        expect(mockRemoveLeague).toHaveBeenCalledWith('league-1');
      });
    });

    test('blocks deleting a league while its saved auction is in progress', async () => {
      vi.mocked(getAuctionSession).mockImplementation(async (leagueId) => (
        leagueId === 'league-1'
          ? ({
              leagueId: 'league-1',
              session: {
                state: 'OPEN_BIDDING',
                players: {},
              },
            } as Awaited<ReturnType<typeof getAuctionSession>>)
          : null
      ));

      await renderSettledLeagueBuilderLeagues();
      fireEvent.click(screen.getAllByTitle('Delete league')[0]);
      fireEvent.click(screen.getByTitle('Confirm delete'));

      expect((await screen.findAllByText(/A saved auction is in progress/i)).length).toBeGreaterThan(0);
      expect(mockRemoveLeague).not.toHaveBeenCalled();
    });
  });

  describe('Modal', () => {
    test('modal has close button', async () => {
      await renderSettledLeagueBuilderLeagues();
      fireEvent.click(screen.getByText('CREATE NEW LEAGUE'));

      await waitFor(() => {
        expect(screen.getByText('Create New League')).toBeInTheDocument();
      });

      // Find the X button in modal header - there should be multiple buttons
      const closeButtons = screen.getAllByRole('button');
      expect(closeButtons.length).toBeGreaterThan(1);
    });

    test('modal can be closed', async () => {
      await renderSettledLeagueBuilderLeagues();
      fireEvent.click(screen.getByText('CREATE NEW LEAGUE'));

      await waitFor(() => {
        expect(screen.getByText('Create New League')).toBeInTheDocument();
      });

      // Find close button in modal header (has X icon) - it's after the title
      const modalHeader = screen.getByText('Create New League').parentElement;
      const closeButton = modalHeader?.querySelector('button');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    test('shows loading indicator when isLoading', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        leagues: [],
        teams: [],
        rulesPresets: [],
        isLoading: true,
        error: null,
        createLeague: mockCreateLeague,
        updateLeague: mockUpdateLeague,
        removeLeague: mockRemoveLeague,
        duplicateLeague: mockDuplicateLeague,
        createTeam: vi.fn(),
        updateTeam: vi.fn(),
        removeTeam: vi.fn(),
        createPlayer: vi.fn(),
        updatePlayer: vi.fn(),
        removePlayer: vi.fn(),
        createRulesPreset: vi.fn(),
        updateRulesPreset: vi.fn(),
        removeRulesPreset: vi.fn(),
        refresh: vi.fn(),
      });

      render(<LeagueBuilderLeagues />);
      expect(screen.getByText('Loading leagues...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    test('shows error message when error occurs', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        leagues: [],
        teams: [],
        rulesPresets: [],
        isLoading: false,
        error: 'Failed to load leagues',
        createLeague: mockCreateLeague,
        updateLeague: mockUpdateLeague,
        removeLeague: mockRemoveLeague,
        duplicateLeague: mockDuplicateLeague,
        createTeam: vi.fn(),
        updateTeam: vi.fn(),
        removeTeam: vi.fn(),
        createPlayer: vi.fn(),
        updatePlayer: vi.fn(),
        removePlayer: vi.fn(),
        createRulesPreset: vi.fn(),
        updateRulesPreset: vi.fn(),
        removeRulesPreset: vi.fn(),
        refresh: vi.fn(),
      });

      render(<LeagueBuilderLeagues />);
      expect(screen.getByText('Failed to load leagues')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    test('shows empty message when no leagues exist', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        leagues: [],
        teams: [],
        rulesPresets: [{ id: 'preset-1', name: 'Standard', isDefault: true }],
        isLoading: false,
        error: null,
        createLeague: mockCreateLeague,
        updateLeague: mockUpdateLeague,
        removeLeague: mockRemoveLeague,
        duplicateLeague: mockDuplicateLeague,
        createTeam: vi.fn(),
        updateTeam: vi.fn(),
        removeTeam: vi.fn(),
        createPlayer: vi.fn(),
        updatePlayer: vi.fn(),
        removePlayer: vi.fn(),
        createRulesPreset: vi.fn(),
        updateRulesPreset: vi.fn(),
        removeRulesPreset: vi.fn(),
        refresh: vi.fn(),
      });

      render(<LeagueBuilderLeagues />);
      expect(screen.getByText('No Leagues Yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first league to get started')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('save button exists in modal', async () => {
      await renderSettledLeagueBuilderLeagues();
      fireEvent.click(screen.getByText('CREATE NEW LEAGUE'));

      await waitFor(() => {
        expect(screen.getByText('Create New League')).toBeInTheDocument();
      });

      // Look for save/create button - may be "Create League" or "Save"
      const buttons = screen.getAllByRole('button');
      const saveButton = buttons.find(btn =>
        btn.textContent?.toLowerCase().includes('save') ||
        btn.textContent?.toLowerCase().includes('create league')
      );
      expect(saveButton).toBeInTheDocument();
    });
  });

  describe('Draft Format', () => {
    test('draft format selector only offers auction', async () => {
      await renderSettledLeagueBuilderLeagues();
      await openCreateLeagueModal();

      const options = within(screen.getByLabelText('Draft format')).getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveValue('auction');
      expect(options[0]).toHaveTextContent('Auction (default)');
      expect(screen.queryByRole('option', { name: /snake/i })).not.toBeInTheDocument();
    });

    test('creating a league persists default auction draft format', async () => {
      await renderSettledLeagueBuilderLeagues();
      await openCreateLeagueModal();
      await createLeagueFromModal('Auction Draft League');

      await waitFor(() => {
        expect(mockCreateLeague).toHaveBeenCalledWith(
          expect.objectContaining({ draftFormat: 'auction' })
        );
      });
    });
  });

});
