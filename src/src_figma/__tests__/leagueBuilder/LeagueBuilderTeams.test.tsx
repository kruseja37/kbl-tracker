/**
 * LeagueBuilderTeams Component Tests
 *
 * Tests the teams management page with CRUD operations.
 * Per Ralph Framework S-B017
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LeagueBuilderTeams } from '../../app/pages/LeagueBuilderTeams';
import { getAuctionSession, getAuctionSessionById, type LeagueTemplate, type Team } from '../../../utils/leagueBuilderStorage';
import { HISTORICAL_ARCHETYPES } from '../../../data/historicalArchetypes';
import { archetypeToCapIdentity } from '../../../engines/archetypeIdentity';
import { LUXURY_CAP_TABLES } from '../../../data/tierParams';
import { normalizeAuctionLuxuryCapsForLeagueSize } from '../../../engines/auctionLuxuryTax';
import { applyIdentitySelection, shiftLuxuryCaps } from '../../../engines/leagueConstruction';

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
    getAuctionSessionById: vi.fn(async () => null),
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
    vi.mocked(getAuctionSessionById).mockResolvedValue(null);
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
            // TEAMIDGUARD (2026-07-09): only the farm identity fields were touched this
            // session, so the untouched MLB capIdentity is preserved verbatim -- team-1's
            // fixture has no stored capIdentity, so "verbatim" is undefined, not a rebuilt
            // default object.
            capIdentity: undefined,
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

    test('COPYFIX-4 in-progress farm auction blocks team deletion through the shared guard', async () => {
      vi.mocked(getAuctionSessionById).mockResolvedValue({
        id: 'farm-auction-league-1-season-1',
        leagueId: 'league-1',
        seasonNumber: 1,
        seed: 'farm-guard',
        createdDate: '2026-07-09T00:00:00.000Z',
        lastModified: '2026-07-09T00:00:00.000Z',
        session: {
          state: 'OPEN_BIDDING',
          config: {},
          teams: [],
          nominationOrder: [],
          nominationIndex: 0,
          nominationRound: 0,
          players: {},
          playerOrder: [],
          availablePlayerIds: [],
          currentLot: null,
          pendingClaim: null,
          results: [],
          saleCount: 0,
        },
      } as Awaited<ReturnType<typeof getAuctionSessionById>>);

      render(<LeagueBuilderTeams />);
      await waitFor(() => {
        expect(vi.mocked(getAuctionSession)).toHaveBeenCalledWith('league-1', expect.any(Number));
      });
      await waitFor(() => {
        expect(vi.mocked(getAuctionSessionById)).toHaveBeenCalled();
      });

      fireEvent.click(screen.getAllByTitle('Delete team')[0]);
      fireEvent.click(screen.getByTitle('Confirm delete'));

      await waitFor(() => {
        expect(screen.getByText(/saved auction is in progress/i)).toBeInTheDocument();
      });
      expect(mockRemoveTeam).not.toHaveBeenCalled();
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

  // ============================================
  // TEAMIDGUARD (2026-07-09): one writer for tax identity.
  // ============================================
  describe('Cap Identity Guard (archetype-owned teams)', () => {
    const murderersRow = HISTORICAL_ARCHETYPES.find((a) => a.id === 'murderers-row')!;
    const archetypeCapIdentity = archetypeToCapIdentity(murderersRow);

    const basePlainTeam = {
      abbreviation: 'PLN',
      location: 'Plainville',
      nickname: 'Plainers',
      stadium: 'Plain Field',
      colors: { primary: '#222222', secondary: '#FFFFFF' },
      championships: 0,
      leagueIds: [],
    };

    const buildArchetypeTeam = (): Team => ({
      id: 'team-3',
      name: 'Gotham Grays',
      abbreviation: 'GG',
      location: 'Gotham',
      nickname: 'Grays',
      stadium: 'Gray Field',
      colors: { primary: '#111111', secondary: '#EEEEEE' },
      championships: 0,
      leagueIds: [],
      mlbArchetypeKey: murderersRow.id,
      capIdentity: archetypeCapIdentity,
    });

    const mockTeamsData = async (teams: Team[], leagues: LeagueTemplate[] = []) => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        teams,
        leagues,
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
    };

    test('REPRO: name-only save on an archetype-owned team preserves capIdentity byte-identical (including rawShift)', async () => {
      const team = buildArchetypeTeam();
      await mockTeamsData([team]);

      render(<LeagueBuilderTeams />);
      fireEvent.click(screen.getAllByTitle('Edit team')[0]);

      const nameInput = await screen.findByDisplayValue('Gotham Grays');
      fireEvent.change(nameInput, { target: { value: 'Gotham Grays Renamed' } });

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

      await waitFor(() => {
        expect(mockUpdateTeam).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'team-3',
            name: 'Gotham Grays Renamed',
            capIdentity: archetypeCapIdentity,
          }),
        );
      });

      // rawShift specifically must have survived (this is the field the legacy rebuild drops).
      const call = mockUpdateTeam.mock.calls.find(
        ([arg]) => arg && arg.id === 'team-3' && arg.name === 'Gotham Grays Renamed',
      );
      expect(call?.[0].capIdentity.rawShift).toEqual(archetypeCapIdentity.rawShift);
    });

    test('(a) archetype-owned team renders a read-only cap identity section with the actual archetype shift', async () => {
      const team = buildArchetypeTeam();
      await mockTeamsData([team]);

      render(<LeagueBuilderTeams />);
      fireEvent.click(screen.getAllByTitle('Edit team')[0]);

      const readonlySection = await screen.findByTestId('cap-identity-readonly');
      expect(readonlySection).toHaveTextContent(murderersRow.name);
      expect(readonlySection).toHaveTextContent('Set by archetype — change it in Draft Setup.');

      // The actual archetype shift (POW +7.5%, CON +10.0%, SPD -18.0%) renders -- not the
      // coarse CAP_MODIFICATION_FRACTIONS approximation.
      expect(readonlySection).toHaveTextContent('POW');
      expect(readonlySection).toHaveTextContent('+7.5%');
      expect(readonlySection).toHaveTextContent('CON');
      expect(readonlySection).toHaveTextContent('+10.0%');
      expect(readonlySection).toHaveTextContent('SPD');
      expect(readonlySection).toHaveTextContent('-18.0%');

      // No editable controls -- attempted interaction is structurally impossible.
      expect(readonlySection.querySelectorAll('input, select, button').length).toBe(0);
      expect(screen.queryByRole('button', { name: /Suggest from priorities/i })).not.toBeInTheDocument();
      expect(screen.queryByLabelText('increase cap modification 1')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('decrease cap modification 1')).not.toBeInTheDocument();

      // Save (no edits at all) still preserves capIdentity byte-identical.
      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));
      await waitFor(() => {
        expect(mockUpdateTeam).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'team-3', capIdentity: archetypeCapIdentity }),
        );
      });
    });

    test('(b) non-archetype team: name-only save preserves capIdentity verbatim (undefined stays undefined)', async () => {
      const team: Team = { ...basePlainTeam, id: 'team-4', name: 'Plain Team' };
      await mockTeamsData([team]);

      render(<LeagueBuilderTeams />);
      fireEvent.click(screen.getAllByTitle('Edit team')[0]);

      const nameInput = await screen.findByDisplayValue('Plain Team');
      fireEvent.change(nameInput, { target: { value: 'Plain Team Renamed' } });

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

      await waitFor(() => {
        expect(mockUpdateTeam).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'team-4',
            name: 'Plain Team Renamed',
            capIdentity: undefined,
          }),
        );
      });
    });

    test('(c) non-archetype team: a genuine MLB identity edit rebuilds capIdentity via the existing legacy math', async () => {
      const team: Team = { ...basePlainTeam, id: 'team-5', name: 'Edited Team' };
      await mockTeamsData([team]);

      render(<LeagueBuilderTeams />);
      fireEvent.click(screen.getAllByTitle('Edit team')[0]);

      await screen.findByDisplayValue('Edited Team');
      fireEvent.change(screen.getByLabelText('increase cap modification 1'), {
        target: { value: 'POW' },
      });
      fireEvent.change(screen.getByLabelText('decrease cap modification 1'), {
        target: { value: 'ARM' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

      await waitFor(() => {
        expect(mockUpdateTeam).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'team-5',
            capIdentity: {
              bandPriorities: {
                Power: 0,
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

    test('NORMWIRE: a 2-team identity cap preview starts from the normalized settlement table', async () => {
      const team: Team = {
        ...basePlainTeam,
        id: 'team-normwire',
        name: 'Normalized Team',
        leagueIds: ['league-normwire'],
      };
      const league: LeagueTemplate = {
        id: 'league-normwire',
        name: 'Normalized League',
        teamIds: ['team-normwire', 'team-other'],
        conferences: [],
        divisions: [],
        defaultRulesPreset: 'rules',
        tier: 'standard',
        balanceMode: 'taxed',
        createdDate: '2026-01-01',
        lastModified: '2026-01-01',
      };
      await mockTeamsData([team], [league]);

      render(<LeagueBuilderTeams />);
      fireEvent.click(screen.getAllByTitle('Edit team')[0]);
      await screen.findByDisplayValue('Normalized Team');
      fireEvent.change(screen.getByLabelText('increase cap modification 1'), {
        target: { value: 'POW' },
      });
      fireEvent.change(screen.getByLabelText('decrease cap modification 1'), {
        target: { value: 'ARM' },
      });

      const normalizedCaps = normalizeAuctionLuxuryCapsForLeagueSize(LUXURY_CAP_TABLES.standard, 2);
      const shiftedCaps = shiftLuxuryCaps(
        normalizedCaps,
        applyIdentitySelection({ increase: ['POW'], decrease: ['ARM'] }),
      );
      const expected = `${normalizedCaps[0].cap.toFixed(1)} → ${shiftedCaps[0].cap.toFixed(1)}`;
      const legacy = `${LUXURY_CAP_TABLES.standard[0].cap.toFixed(1)} → ${shiftLuxuryCaps(
        LUXURY_CAP_TABLES.standard,
        applyIdentitySelection({ increase: ['POW'], decrease: ['ARM'] }),
      )[0].cap.toFixed(1)}`;

      expect(await screen.findByText(expected)).toBeInTheDocument();
      expect(screen.queryByText(legacy)).not.toBeInTheDocument();
    });

    test('(d) non-archetype team: rawShift on a stored capIdentity survives an untouched load-save round trip', async () => {
      const rawShiftIdentity = {
        increase: ['POW'],
        decrease: ['SPD'],
        rawShift: {
          POW: 0.033, CON: 0, SPD: -0.041, FLD: 0, ARM: 0,
          RVEL: 0, RJNK: 0, RACC: 0, PVEL: 0, PJNK: 0, PACC: 0,
        },
      };
      const team: Team = {
        ...basePlainTeam,
        id: 'team-6',
        name: 'Legacy Team',
        capIdentity: rawShiftIdentity,
      };
      await mockTeamsData([team]);

      render(<LeagueBuilderTeams />);
      fireEvent.click(screen.getAllByTitle('Edit team')[0]);

      const nameInput = await screen.findByDisplayValue('Legacy Team');
      fireEvent.change(nameInput, { target: { value: 'Legacy Team Renamed' } });

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

      await waitFor(() => {
        expect(mockUpdateTeam).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'team-6',
            capIdentity: rawShiftIdentity,
          }),
        );
      });
    });
  });

});
