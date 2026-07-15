/**
 * FranchiseSetup Component Tests
 *
 * Tests the franchise setup wizard with step navigation.
 * Updated 2026-02-07: Aligned mocks with data-driven component (useLeagueBuilderData).
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { FranchiseSetup } from '../../app/pages/FranchiseSetup';

// ============================================
// MOCKS
// ============================================

const mockNavigate = vi.fn();
const mockInitializeFranchise = vi.fn();
const mockLoadFranchiseFreezeSummary = vi.fn();
const mockValidatePreparedLeagueBuilderFarmScoutingState = vi.fn();
const mockGetAuctionSession = vi.fn();
const mockGetAuctionSessionById = vi.fn();
const mockGetMlbDraftSession = vi.fn();
const mockGetLeagueTemplate = vi.fn();
const mockLeagueRefresh = vi.hoisted(() => vi.fn(async () => undefined));
const leagueHookFlags = vi.hoisted(() => ({ baseError: null as string | null, multiGm: false, snakeKbl: false }));

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../utils/franchiseInitializer', () => ({
  initializeFranchise: (...args: unknown[]) => mockInitializeFranchise(...args),
}));

vi.mock('../../../utils/franchiseFreezeSummary', () => ({
  loadFranchiseFreezeSummary: (...args: unknown[]) => mockLoadFranchiseFreezeSummary(...args),
}));

vi.mock('../../../utils/leagueBuilderFarmScoutingHandoff', () => ({
  validatePreparedLeagueBuilderFarmScoutingState: (...args: unknown[]) =>
    mockValidatePreparedLeagueBuilderFarmScoutingState(...args),
}));

vi.mock('../../../utils/leagueBuilderStorage', () => ({
  FARM_SNAKE_SESSION_NUMBER: 2,
  getAuctionSession: (...args: unknown[]) => mockGetAuctionSession(...args),
  getAuctionSessionById: (...args: unknown[]) => mockGetAuctionSessionById(...args),
  getMlbDraftSession: (...args: unknown[]) => mockGetMlbDraftSession(...args),
  getLeagueTemplate: (...args: unknown[]) => mockGetLeagueTemplate(...args),
  createFarmAuctionSessionId: (leagueId: string, seasonNumber = 1) => `farm-auction-${leagueId}-${seasonNumber}`,
}));

// Mock league data — FranchiseSetup uses { leagues, teams, isLoading, error } from this hook
vi.mock('../../hooks/useLeagueBuilderData', () => ({
  useLeagueBuilderData: vi.fn(() => ({
    leagues: [
      {
        id: 'kbl',
        name: 'Kruse Baseball League',
        description: 'The premier league',
        teamIds: Array.from({ length: 16 }, (_, i) => `team-${i + 1}`),
        conferences: [
          { id: 'conf-1', name: 'National', divisionIds: ['div-1', 'div-2'] },
          { id: 'conf-2', name: 'American', divisionIds: ['div-3', 'div-4'] },
        ],
        divisions: [
          { id: 'div-1', name: 'East', teamIds: ['team-1', 'team-2', 'team-3', 'team-4'] },
          { id: 'div-2', name: 'West', teamIds: ['team-5', 'team-6', 'team-7', 'team-8'] },
          { id: 'div-3', name: 'Central', teamIds: ['team-9', 'team-10', 'team-11', 'team-12'] },
          { id: 'div-4', name: 'South', teamIds: ['team-13', 'team-14', 'team-15', 'team-16'] },
        ],
        draftSeats: leagueHookFlags.multiGm
          ? [{ id: 'seat-alex', name: 'Alex' }, { id: 'seat-blair', name: 'Blair' }]
          : undefined,
        defaultRulesPreset: 'preset-1',
        createdDate: '2026-01-01',
        lastModified: '2026-01-01',
      },
      {
        id: 'summer',
        name: 'Summer League',
        description: 'Casual summer play',
        teamIds: ['team-17', 'team-18', 'team-19', 'team-20'],
        conferences: [],
        divisions: [],
        defaultRulesPreset: 'preset-1',
        createdDate: '2026-01-01',
        lastModified: '2026-01-01',
      },
      {
        id: 'duel',
        name: 'Duel League',
        description: 'Two-team test league',
        teamIds: ['team-21', 'team-22'],
        conferences: [],
        divisions: [],
        defaultRulesPreset: 'preset-1',
        createdDate: '2026-01-01',
        lastModified: '2026-01-01',
      },
    ],
    teams: Array.from({ length: 22 }, (_, i) => ({
      id: `team-${i + 1}`,
      name: `Team ${i + 1}`,
      abbreviation: `T${i + 1}`,
      location: 'City',
      nickname: `Nickname ${i + 1}`,
      controlledBy: leagueHookFlags.multiGm && i >= 2 ? 'ai' : undefined,
      gmSeatId: leagueHookFlags.multiGm && i < 2 ? (i === 0 ? 'seat-alex' : 'seat-blair') : undefined,
      gmSeatName: leagueHookFlags.multiGm && i < 2 ? (i === 0 ? 'Alex' : 'Blair') : undefined,
    })),
    players: [],
    rulesPresets: [],
    isLoading: false,
    error: leagueHookFlags.baseError,
    // All required hook functions (not used by FranchiseSetup but must exist)
    getLeague: vi.fn(),
    createLeague: vi.fn(),
    updateLeague: vi.fn(),
    removeLeague: vi.fn(),
    duplicateLeague: vi.fn(),
    getTeamById: vi.fn(),
    createTeam: vi.fn(),
    updateTeam: vi.fn(),
    removeTeam: vi.fn(),
    getPlayerById: vi.fn(),
    getTeamPlayers: vi.fn(),
    createPlayer: vi.fn(),
    updatePlayer: vi.fn(),
    removePlayer: vi.fn(),
    getRulesById: vi.fn(),
    createRulesPreset: vi.fn(),
    updateRulesPreset: vi.fn(),
    removeRulesPreset: vi.fn(),
    getRoster: vi.fn(),
    updateRoster: vi.fn(),
    removeRoster: vi.fn(),
    seedSMB4Data: vi.fn(),
    isSMB4Seeded: vi.fn(() => Promise.resolve(false)),
    refresh: mockLeagueRefresh,
  })),
}));

// ============================================
// TESTS
// ============================================

describe('FranchiseSetup Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leagueHookFlags.baseError = null;
    leagueHookFlags.multiGm = false;
    leagueHookFlags.snakeKbl = false;
    window.history.pushState({}, '', '/franchise/setup');
    mockInitializeFranchise.mockResolvedValue('franchise-1');
    mockLoadFranchiseFreezeSummary.mockResolvedValue({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-1',
      leagueName: 'Kruse Baseball League',
      teamCount: 2,
      frozenPlayerRows: 64,
      settledSalaryPlayerRows: 44,
      draftBaselineRows: 44,
      draftBaselineContractRows: 44,
      rosterTotals: {
        mlb: 44,
        farm: 20,
      },
      morale: {
        playerCount: 44,
        playerAverage: 54,
        playerMin: 41,
        playerMax: 68,
        teamFanCount: 2,
        teamFanAverage: 50,
        teamFanMin: 46,
        teamFanMax: 54,
      },
      teams: [
        {
          teamId: 'team-1',
          teamName: 'Team 1',
          payrollBaseline: 123456,
          mlbRosterCount: 22,
          farmRosterCount: 10,
          fanMoraleBaseline: 54,
        },
        {
          teamId: 'team-2',
          teamName: 'Team 2',
          payrollBaseline: 98765,
          mlbRosterCount: 22,
          farmRosterCount: 10,
          fanMoraleBaseline: 46,
        },
      ],
      notDisplayable: [
        'Exact freeze-engine team payroll totals are not persisted as a team aggregate; only player-level contract values and the roster-copy salary baseline are readable.',
        'Draft slot class and pay class are not persisted; only the final starting morale baseline is readable.',
      ],
    });
    mockGetAuctionSession.mockResolvedValue({ session: { state: 'AUCTION_COMPLETE' } });
    mockGetAuctionSessionById.mockResolvedValue({ session: { state: 'AUCTION_COMPLETE' } });
    mockGetMlbDraftSession.mockResolvedValue(null);
    mockGetLeagueTemplate.mockImplementation(async (leagueId: string) => ({
      id: leagueId,
      draftFormat: leagueId === 'kbl' && leagueHookFlags.snakeKbl ? 'snake' : 'auction',
    }));
    mockValidatePreparedLeagueBuilderFarmScoutingState.mockResolvedValue({
      validationVersion: 'league-builder-farm-scouting-v1',
      ownership: 'league-builder-mode-1',
      bridgePolicy: 'temporary-franchise-setup-repair-only',
      leagueId: 'kbl',
      status: 'prepared',
      prepared: true,
      bridgeRequired: false,
      bridgeAllowed: true,
      blockers: [],
      warnings: [],
      limitations: [],
      teams: [],
    });
  });

  async function selectLeagueAndAdvance(times = 1) {
    await screen.findAllByText('Draft complete');
    fireEvent.click(screen.getByText('KRUSE BASEBALL LEAGUE'));
    const next = () => fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /NEXT/i })).not.toBeDisabled());
    for (let index = 0; index < times; index += 1) {
      next();
    }
  }

  describe('Header', () => {
    test('renders NEW FRANCHISE title', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText('NEW FRANCHISE')).toBeInTheDocument();
    });

    test('shows step progress indicator', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText(/Step 1 of 6/)).toBeInTheDocument();
    });
  });

  describe('Progress Indicators', () => {
    test('renders step labels', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText('League')).toBeInTheDocument();
      expect(screen.getByText('Season')).toBeInTheDocument();
      expect(screen.getByText('Playoffs')).toBeInTheDocument();
      expect(screen.getByText('Teams')).toBeInTheDocument();
      expect(screen.getByText('Rosters')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    test('shows 6 progress step buttons', () => {
      render(<FranchiseSetup />);
      const stepButtons = screen.getAllByRole('button');
      // Should have 6 step buttons plus navigation buttons
      expect(stepButtons.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Step 1 - League Selection', () => {
    test('shows SELECT A LEAGUE title', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText('SELECT A LEAGUE')).toBeInTheDocument();
    });

    test('shows league options from hook data', () => {
      render(<FranchiseSetup />);
      // League names are uppercased in the component
      expect(screen.getByText('KRUSE BASEBALL LEAGUE')).toBeInTheDocument();
      expect(screen.getByText('SUMMER LEAGUE')).toBeInTheDocument();
    });

    test('keeps league selection instructions behind Help', () => {
      render(<FranchiseSetup />);
      expect(screen.queryByText(/Choose the league template/i)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'LEAGUE SELECTION HELP' }));
      expect(screen.getByText(/Choose the league template/i)).toBeInTheDocument();
    });

    test('auto-selects the leagueId passed from draft staffing handoff', async () => {
      window.history.pushState({}, '', '/franchise/setup?leagueId=summer');

      render(<FranchiseSetup />);

      expect(await screen.findByText('FRANCHISE LAUNCH')).toBeInTheDocument();
      expect(screen.getByText('SEASON SETTINGS')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      expect(screen.getByText('CONFIRM & LAUNCH')).toBeInTheDocument();
    });

    test('completed draft handoff uses the compact launch path and starts with an empty schedule', async () => {
      window.history.pushState({}, '', '/franchise/setup?leagueId=kbl');
      mockGetAuctionSession.mockResolvedValue({ session: { state: 'AUCTION_COMPLETE' } });
      mockGetAuctionSessionById.mockResolvedValue({ session: { state: 'AUCTION_COMPLETE' } });

      render(<FranchiseSetup />);

      expect(await screen.findByText('FRANCHISE LAUNCH')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
      expect(screen.getByText('SEASON SETTINGS')).toBeInTheDocument();
      expect(screen.queryByText('Playoffs')).not.toBeInTheDocument();
      expect(screen.queryByText('Rosters')).not.toBeInTheDocument();
      expect(screen.getByText('SCHEDULE AT LAUNCH: EMPTY')).toBeInTheDocument();
      expect(screen.queryByText(/add games manually or import a CSV/i)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'FRANCHISE SETUP HELP' }));
      expect(screen.getByText(/starts with an empty schedule/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));

      expect(screen.getByText('CONFIRM & LAUNCH')).toBeInTheDocument();
      expect(screen.getByText('MLB + FARM DRAFT PICKS COMPLETE')).toBeInTheDocument();
      expect(screen.getByText('ROSTERS READY')).toBeInTheDocument();
      expect(screen.getByText('Team 1')).toBeInTheDocument();
      expect(screen.queryByText(/FANTASY DRAFT/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/PLAYOFF SETTINGS/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/run League Builder startup scout/i)).not.toBeInTheDocument();
      expect(screen.getByRole('switch', { name: /LIVING SEASON/i })).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(screen.getByRole('button', { name: /START FRANCHISE/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Start Franchise' }));

      await waitFor(() => {
        expect(mockInitializeFranchise).toHaveBeenCalledWith(
          expect.objectContaining({
            league: 'kbl',
            roster: expect.objectContaining({ mode: 'existing' }),
            teams: expect.objectContaining({
              selectedTeams: expect.arrayContaining(['team-1', 'team-16']),
              playerAssignments: expect.objectContaining({ 'team-1': 'seat-you', 'team-16': 'seat-you' }),
            }),
          }),
          { livingSeason: true },
        );
      });
    });

    test('does not collapse an incomplete farm leg into generic setup and can recheck it', async () => {
      window.history.pushState({}, '', '/franchise/setup?leagueId=kbl');
      mockGetAuctionSession.mockImplementation(async (leagueId: string) => (
        leagueId === 'kbl' ? { session: { state: 'AUCTION_COMPLETE' } } : null
      ));
      mockGetAuctionSessionById
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ session: { state: 'AUCTION_COMPLETE' } });

      render(<FranchiseSetup />);

      expect(await screen.findByText('DRAFT HANDOFF NOT READY')).toBeInTheDocument();
      expect(screen.getByText(/FARM DRAFT IS NOT COMPLETE/i)).toBeInTheDocument();
      expect(screen.queryByText('SELECT A LEAGUE')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /RECHECK DRAFTS/i }));
      expect(await screen.findByText('FRANCHISE LAUNCH')).toBeInTheDocument();
    });

    test('keeps completed picks blocked when the farm roster handoff is not prepared', async () => {
      window.history.pushState({}, '', '/franchise/setup?leagueId=kbl');
      mockGetAuctionSession.mockImplementation(async (leagueId: string) => (
        leagueId === 'kbl' ? { session: { state: 'AUCTION_COMPLETE' } } : null
      ));
      mockGetAuctionSessionById.mockResolvedValue({ session: { state: 'AUCTION_COMPLETE' } });
      mockValidatePreparedLeagueBuilderFarmScoutingState.mockResolvedValue({
        validationVersion: 'league-builder-farm-scouting-v1',
        ownership: 'league-builder-mode-1',
        bridgePolicy: 'temporary-franchise-setup-repair-only',
        leagueId: 'kbl',
        status: 'blocked',
        prepared: false,
        bridgeRequired: false,
        bridgeAllowed: false,
        blockers: ['Team 1 farm roster does not match the frozen draft.'],
        warnings: [],
        limitations: [],
        teams: [],
      });

      render(<FranchiseSetup />);

      expect(await screen.findByText('FRANCHISE LAUNCH')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      expect(await screen.findByText('ROSTER HANDOFF BLOCKED')).toBeInTheDocument();
      expect(screen.getByText(/does not match the frozen draft/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /START FRANCHISE/i })).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: /RECHECK HANDOFF/i }));
      expect(mockValidatePreparedLeagueBuilderFarmScoutingState.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    test('shows a completion-read failure and retries instead of silently opening generic setup', async () => {
      let failKblRead = true;
      window.history.pushState({}, '', '/franchise/setup?leagueId=kbl');
      mockGetAuctionSession.mockImplementation(async (leagueId: string) => {
        if (leagueId === 'kbl' && failKblRead) {
          failKblRead = false;
          throw new Error('DRAFT DATABASE UNAVAILABLE');
        }
        return null;
      });

      render(<FranchiseSetup />);

      expect(await screen.findByText('DRAFT HANDOFF COULD NOT LOAD')).toBeInTheDocument();
      expect(screen.getByText('DRAFT DATABASE UNAVAILABLE')).toBeInTheDocument();
      expect(screen.queryByText('SELECT A LEAGUE')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /RETRY DRAFT HANDOFF/i }));
      expect(await screen.findByText('DRAFT HANDOFF NOT READY')).toBeInTheDocument();
    });

    test('preserves persisted multi-GM seats and team assignments in the compact handoff', async () => {
      leagueHookFlags.multiGm = true;
      window.history.pushState({}, '', '/franchise/setup?leagueId=kbl');
      mockGetAuctionSession.mockImplementation(async (leagueId: string) => (
        leagueId === 'kbl' ? { session: { state: 'AUCTION_COMPLETE' } } : null
      ));
      mockGetAuctionSessionById.mockResolvedValue({ session: { state: 'AUCTION_COMPLETE' } });

      render(<FranchiseSetup />);

      expect(await screen.findByText('FRANCHISE LAUNCH')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      expect(screen.getByText('Team 1')).toBeInTheDocument();
      expect(screen.getByText('Team 2')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /START FRANCHISE/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Start Franchise' }));

      await waitFor(() => expect(mockInitializeFranchise).toHaveBeenCalledWith(
        expect.objectContaining({
          teams: expect.objectContaining({
            selectedTeams: ['team-1', 'team-2'],
            mode: 'multiplayer',
            playerAssignments: expect.objectContaining({
              'team-1': 'seat-alex',
              'team-2': 'seat-blair',
              'team-3': 'cpu',
            }),
            seats: expect.arrayContaining([
              { id: 'seat-alex', name: 'Alex' },
              { id: 'seat-blair', name: 'Blair' },
            ]),
          }),
        }),
        { livingSeason: true },
      ));
    });

    test('leagueId without a completed draft blocks the setup flow', async () => {
      window.history.pushState({}, '', '/franchise/setup?leagueId=kbl');
      mockGetAuctionSession.mockResolvedValue(null);
      mockGetAuctionSessionById.mockResolvedValue(null);

      render(<FranchiseSetup />);

      expect(await screen.findByText('NEW FRANCHISE')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 6')).toBeInTheDocument();
      expect(screen.getByText('DRAFT HANDOFF NOT READY')).toBeInTheDocument();
      expect(screen.getByText('Playoffs')).toBeInTheDocument();
      expect(screen.getByText('Rosters')).toBeInTheDocument();
    });

    test('keeps manual setup entry on the full picker without a leagueId param', () => {
      render(<FranchiseSetup />);

      expect(screen.getByText('SELECT A LEAGUE')).toBeInTheDocument();
      expect(screen.getByText('KRUSE BASEBALL LEAGUE')).toBeInTheDocument();
      expect(screen.getByText('SUMMER LEAGUE')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /NEXT/i })).toBeDisabled();
      expect(screen.queryByText('FREEZE SUMMARY')).not.toBeInTheDocument();
    });

    test('badges only leagues with completed auction sessions', async () => {
      mockGetAuctionSession.mockImplementation(async (leagueId: string) => {
        if (leagueId === 'summer') return { session: { state: 'AUCTION_COMPLETE' } };
        if (leagueId === 'kbl') return { session: { state: 'OPEN_BIDDING' } };
        return null;
      });
      mockGetAuctionSessionById.mockImplementation(async (id: string) => (
        id.includes('summer') ? { session: { state: 'AUCTION_COMPLETE' } } : null
      ));

      render(<FranchiseSetup />);

      expect(await screen.findByText('Draft complete')).toBeInTheDocument();
      expect(screen.getAllByText('Draft complete')).toHaveLength(1);
      expect(
        within(screen.getByText('SUMMER LEAGUE').parentElement as HTMLElement).getByText('Draft complete'),
      ).toBeInTheDocument();
      expect(
        within(screen.getByText('KRUSE BASEBALL LEAGUE').parentElement as HTMLElement).queryByText('Draft complete'),
      ).not.toBeInTheDocument();
    });

    test('D1 repro: badges a league with a completed snake session', async () => {
      leagueHookFlags.snakeKbl = true;
      mockGetMlbDraftSession.mockImplementation(async (leagueId: string, seasonNumber = 1) => {
        if (leagueId !== 'kbl') return null;
        if (seasonNumber === 2) {
          return {
            draftPhase: 'FARM',
            pickOrder: [{ round: 1, pick: 1, teamId: 'team-1' }],
            completedPicks: [{ round: 1, pick: 1, teamId: 'team-1', playerId: 'farm-1' }],
            currentPickIndex: 1,
          };
        }
        return {
          pickOrder: [{ round: 1, pick: 1, teamId: 'team-1' }],
          completedPicks: [{ round: 1, pick: 1, teamId: 'team-1', playerId: 'player-1' }],
          currentPickIndex: 1,
        };
      });

      render(<FranchiseSetup />);

      await waitFor(() => expect(
        within(screen.getByText('KRUSE BASEBALL LEAGUE').parentElement as HTMLElement).getByText('Draft complete'),
      ).toBeInTheDocument());
      expect(mockGetMlbDraftSession).toHaveBeenCalledWith('kbl', 2);
    });
  });

  describe('Navigation', () => {
    test('CANCEL button navigates home', () => {
      render(<FranchiseSetup />);
      fireEvent.click(screen.getByRole('button', { name: /CANCEL/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    test('no BACK button on step 1', () => {
      render(<FranchiseSetup />);
      expect(screen.queryByRole('button', { name: /BACK/i })).not.toBeInTheDocument();
    });

    test('base league-data errors expose a retry action', () => {
      leagueHookFlags.baseError = 'LEAGUE DATABASE OFFLINE';
      render(<FranchiseSetup />);

      expect(screen.getByText('LEAGUE DATABASE OFFLINE')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /RETRY LEAGUES/i }));
      expect(mockLeagueRefresh).toHaveBeenCalledOnce();
    });
  });

  describe('Generic fallback Help law', () => {
    test('keeps every cited generic-step explainer behind its own Help affordance', async () => {
      render(<FranchiseSetup />);

      expect(screen.queryByText(/Choose the league template/i)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'LEAGUE SELECTION HELP' }));
      expect(screen.getByText(/CHOOSE THE LEAGUE TEMPLATE/i)).toBeInTheDocument();

      await selectLeagueAndAdvance(2);

      expect(screen.queryByText(/Traditional elimination tournament/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Higher seed hosts/i)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'PLAYOFF SETTINGS HELP' }));
      expect(screen.getByText(/TRADITIONAL ELIMINATION TOURNAMENT/i)).toBeInTheDocument();
      expect(screen.getByText(/HIGHER SEED GAMES 1-2 AND 6-7/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      expect(screen.queryByText(/SELECT THE TEAMS YOU CONTROL/i)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'TEAM CONTROL HELP' }));
      expect(screen.getByText(/SELECT THE TEAMS YOU CONTROL/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      expect(screen.queryByText(/Choose how team rosters will be populated/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Startup farm\/scouting belongs to League Builder/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Use League Builder Draft to hire one scout/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Franchise v1 uses existing League Builder MLB rosters/i)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'ROSTER MODE HELP' }));
      expect(screen.getByText(/Choose how team rosters will be populated/i)).toBeInTheDocument();
      expect(screen.getByText(/Startup farm\/scouting belongs to League Builder/i)).toBeInTheDocument();
      expect(screen.getByText(/Use League Builder Draft to hire one scout/i)).toBeInTheDocument();
      expect(screen.getByText(/Franchise v1 uses existing League Builder MLB rosters/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      expect(screen.queryByText(/LIVING SEASON LETS RATINGS/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/GM NAME APPEARS/i)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'FRANCHISE CONFIRM HELP' }));
      expect(screen.getByText(/LIVING SEASON LETS RATINGS/i)).toBeInTheDocument();
      expect(screen.getByText(/GM NAME APPEARS/i)).toBeInTheDocument();
    });
  });

  describe('League Details', () => {
    test('shows team count in league info', () => {
      render(<FranchiseSetup />);
      // KBL has 16 teams in our mock data
      expect(screen.getByText(/16 teams/)).toBeInTheDocument();
    });

    test('shows Create New League option', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText(/Create New League/i)).toBeInTheDocument();
    });

    test('shows conference info for KBL', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText(/2 conferences/)).toBeInTheDocument();
    });

    test('shows divisions info for KBL', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText(/4 divisions/)).toBeInTheDocument();
    });
  });

  describe('League Card Expansion', () => {
    test('shows expand button for leagues with structure', () => {
      render(<FranchiseSetup />);
      // KBL has conferences and should have expand button (▼ or ▲)
      const expandButtons = screen.getAllByRole('button').filter((btn) =>
        btn.textContent === '▼' || btn.textContent === '▲'
      );
      expect(expandButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Franchise v1 release gates', () => {
    test('removes unsupported setup event controls instead of showing decorative knobs', async () => {
      render(<FranchiseSetup />);
      await selectLeagueAndAdvance(1);

      expect(screen.queryByRole('button', { name: /All-Star Game/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Trade Deadline/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Mercy Rule/i })).not.toBeInTheDocument();
      expect(screen.queryByText('ADDITIONAL OPTIONS')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      expect(screen.getByText('PLAYOFF SETTINGS (playoffs deferred -- settings saved for later)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Pool Play.*deferred/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Best Record Bye.*deferred/i })).toBeDisabled();
    });

    test('keeps team control explicit with no AI or random team shortcut copy', async () => {
      render(<FranchiseSetup />);
      await selectLeagueAndAdvance(3);

      expect(screen.queryByText(/Unselected teams remain uncontrolled/i)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'TEAM CONTROL HELP' }));
      expect(screen.getByText(/UNSELECTED TEAMS USE MANUAL SCORE ENTRY/i)).toBeInTheDocument();
      expect(screen.getByText(/UNCONTROLLED:/i)).toBeInTheDocument();
      expect(screen.queryByText(/AI-CONTROLLED/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Random 1/i })).not.toBeInTheDocument();
    });

    test('defers fantasy draft and points farm setup to League Builder scout and prospect draft', async () => {
      render(<FranchiseSetup />);
      await selectLeagueAndAdvance(3);
      fireEvent.click(screen.getAllByRole('button', { name: /Team 1/i })[0]);
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));

      expect(screen.getByRole('button', { name: /Fantasy Draft.*Deferred/i })).toBeDisabled();
      expect(screen.getByText(/22 MLB \+ 10 FARM/i)).toBeInTheDocument();
      expect(screen.queryByText(/Startup farm\/scouting belongs to League Builder/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/hire one scout for every team/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Franchise Setup does not auto-fill farms/i)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'ROSTER MODE HELP' }));
      expect(screen.getByText(/Startup farm\/scouting belongs to League Builder/i)).toBeInTheDocument();
      expect(screen.getByText(/hire one scout for every team/i)).toBeInTheDocument();
      expect(screen.getByText(/Franchise Setup does not auto-fill farms/i)).toBeInTheDocument();
      expect(screen.queryByText(/Generate new fictional players/i)).not.toBeInTheDocument();
    });

    test('renders the post-freeze summary with persisted fixture values before entering the lens', async () => {
      render(<FranchiseSetup />);
      await selectLeagueAndAdvance(3);
      fireEvent.click(screen.getAllByRole('button', { name: /Team 1/i })[0]);
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      fireEvent.click(screen.getByRole('button', { name: /START FRANCHISE/i }));
      // #8: START FRANCHISE now opens a freeze-confirmation modal; confirm to run the freeze.
      fireEvent.click(screen.getByRole('button', { name: 'Start Franchise' }));

      await waitFor(() => {
        expect(mockInitializeFranchise).toHaveBeenCalled();
      });
      expect(mockInitializeFranchise).toHaveBeenCalledWith(expect.any(Object), undefined);
      expect(mockLoadFranchiseFreezeSummary).toHaveBeenCalledWith('franchise-1');
      expect(await screen.findByText('FREEZE SUMMARY')).toBeInTheDocument();
      expect(screen.getByText('Kruse Baseball League')).toBeInTheDocument();
      expect(screen.getAllByText('44').length).toBeGreaterThan(0);
      expect(screen.getByText('$123,456')).toBeInTheDocument();
      expect(screen.getAllByText('22 MLB / 10 FARM')).toHaveLength(2);
      expect(screen.getByText('41 / 54 / 68')).toBeInTheDocument();
      expect(screen.getByText(/Exact freeze-engine team payroll totals are not persisted/i)).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalledWith('/franchise/franchise-1', expect.anything());

      fireEvent.click(screen.getByRole('button', { name: /ENTER YOUR FRANCHISE/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/franchise/franchise-1', {
        replace: true,
        state: {
          createdFromSetup: true,
          franchiseId: 'franchise-1',
        },
      });
      expect(screen.queryByText(/CREATING FRANCHISE/i)).not.toBeInTheDocument();
    });

    test('passes typed GM name to franchise initialization config', async () => {
      render(<FranchiseSetup />);
      await selectLeagueAndAdvance(3);
      fireEvent.click(screen.getAllByRole('button', { name: /Team 1/i })[0]);
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      fireEvent.change(screen.getByPlaceholderText(/Enter your GM name/i), {
        target: { value: 'Casey Ledger' },
      });
      fireEvent.click(screen.getByRole('button', { name: /START FRANCHISE/i }));
      // #8: START FRANCHISE now opens a freeze-confirmation modal; confirm to run the freeze.
      fireEvent.click(screen.getByRole('button', { name: 'Start Franchise' }));

      await waitFor(() => {
        expect(mockInitializeFranchise).toHaveBeenCalledWith(
          expect.objectContaining({ gmName: 'Casey Ledger' }),
          undefined,
        );
      });
    });

    test('keeps living season off by default and locks an enabled choice into creation', async () => {
      render(<FranchiseSetup />);
      await selectLeagueAndAdvance(3);
      fireEvent.click(screen.getAllByRole('button', { name: /Team 1/i })[0]);
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));

      const livingSeason = screen.getByRole('switch', { name: /LIVING SEASON/i });
      expect(livingSeason).toHaveAttribute('aria-checked', 'false');
      expect(screen.queryByText(/THIS CHOICE LOCKS AT CREATION/i)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'FRANCHISE CONFIRM HELP' }));
      expect(screen.getByText(/THIS CHOICE LOCKS AT CREATION/i)).toBeInTheDocument();
      fireEvent.click(livingSeason);
      expect(livingSeason).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(screen.getByRole('button', { name: /START FRANCHISE/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Start Franchise' }));

      await waitFor(() => {
        expect(mockInitializeFranchise).toHaveBeenCalledWith(
          expect.any(Object),
          { livingSeason: true },
        );
      });
    });

    test('blocks franchise initialization when farms are incomplete instead of running a setup bridge', async () => {
      const incompleteReport = {
        validationVersion: 'league-builder-farm-scouting-v1',
        ownership: 'league-builder-mode-1',
        bridgePolicy: 'internal-test-legacy-repair-only',
        leagueId: 'kbl',
        status: 'blocked',
        prepared: false,
        bridgeRequired: true,
        bridgeAllowed: false,
        blockers: ['Team 1: has 0/10 FARM players; run the League Builder startup prospect draft.'],
        warnings: [],
        limitations: [],
        teams: [],
      };
      mockValidatePreparedLeagueBuilderFarmScoutingState
        .mockResolvedValueOnce(incompleteReport)
        .mockResolvedValueOnce(incompleteReport);

      render(<FranchiseSetup />);
      await selectLeagueAndAdvance(3);
      fireEvent.click(screen.getAllByRole('button', { name: /Team 1/i })[0]);
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      fireEvent.click(screen.getByRole('button', { name: /START FRANCHISE/i }));
      // #8: START FRANCHISE now opens a freeze-confirmation modal; confirm to run the freeze.
      fireEvent.click(screen.getByRole('button', { name: 'Start Franchise' }));

      expect(await screen.findByText(/farm\/scouting handoff blocked/i)).toBeInTheDocument();
      expect(mockInitializeFranchise).not.toHaveBeenCalled();
    });

    test('blocks franchise initialization when League Builder farm validation is blocked', async () => {
      const blockedReport = {
        validationVersion: 'league-builder-farm-scouting-v1',
        ownership: 'league-builder-mode-1',
        bridgePolicy: 'temporary-franchise-setup-repair-only',
        leagueId: 'kbl',
        status: 'blocked',
        prepared: false,
        bridgeRequired: false,
        bridgeAllowed: false,
        blockers: ['Team 1: FARM roster does not match player FARM assignments.'],
        warnings: [],
        limitations: ['Scouting output remains imperfect and true ratings stay hidden until call-up/reveal.'],
        teams: [],
      };
      mockValidatePreparedLeagueBuilderFarmScoutingState
        .mockResolvedValueOnce(blockedReport)
        .mockResolvedValueOnce(blockedReport);

      render(<FranchiseSetup />);
      await selectLeagueAndAdvance(3);
      fireEvent.click(screen.getAllByRole('button', { name: /Team 1/i })[0]);
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      fireEvent.click(screen.getByRole('button', { name: /START FRANCHISE/i }));
      // #8: START FRANCHISE now opens a freeze-confirmation modal; confirm to run the freeze.
      fireEvent.click(screen.getByRole('button', { name: 'Start Franchise' }));

      expect(await screen.findByText(/farm\/scouting handoff blocked/i)).toBeInTheDocument();
      expect(mockInitializeFranchise).not.toHaveBeenCalled();
    });

    test('does not mutate League Builder when franchise initialization fails after prepared validation', async () => {
      mockInitializeFranchise.mockRejectedValueOnce(new Error('copy failed'));

      render(<FranchiseSetup />);
      await selectLeagueAndAdvance(3);
      fireEvent.click(screen.getAllByRole('button', { name: /Team 1/i })[0]);
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      fireEvent.click(screen.getByRole('button', { name: /START FRANCHISE/i }));
      // #8: START FRANCHISE now opens a freeze-confirmation modal; confirm to run the freeze.
      fireEvent.click(screen.getByRole('button', { name: 'Start Franchise' }));

      expect(await screen.findByText(/copy failed/i)).toBeInTheDocument();
      expect(mockValidatePreparedLeagueBuilderFarmScoutingState).toHaveBeenCalled();
    });
  });

  describe('Step 3 - Playoff Team Count Guard', () => {
    test('hides impossible Top 4 qualifier option for a 2-team league', async () => {
      render(<FranchiseSetup />);

      await screen.findAllByText('Draft complete');
      fireEvent.click(screen.getByText('DUEL LEAGUE'));
      await waitFor(() => expect(screen.getByRole('button', { name: /NEXT/i })).not.toBeDisabled());
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));

      expect(screen.getByText(/With 2 teams in league: Top 2 teams qualify/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Top 2 teams qualify/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Top 4 teams qualify/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/Top 4 teams qualify/i)).not.toBeInTheDocument();
    });

    test('preserves standard playoff qualifier options for a 16-team league', async () => {
      render(<FranchiseSetup />);

      await selectLeagueAndAdvance(2);

      expect(screen.getByText(/With 16 teams in league: Top 4 teams qualify/i)).toBeInTheDocument();
      for (const count of ['4', '6', '8', '10', '12']) {
        expect(screen.getByRole('button', { name: `Top ${count} teams qualify` })).toBeInTheDocument();
      }
      expect(screen.queryByRole('button', { name: /Top 2 teams qualify/i })).not.toBeInTheDocument();
    });

    test('clamps playoff qualifier count when switching to a smaller league', async () => {
      render(<FranchiseSetup />);

      await selectLeagueAndAdvance(2);
      fireEvent.click(screen.getByRole('button', { name: /Top 12 teams qualify/i }));
      expect(screen.getByText(/With 16 teams in league: Top 12 teams qualify/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /BACK/i }));
      fireEvent.click(screen.getByRole('button', { name: /BACK/i }));
      fireEvent.click(screen.getByText('DUEL LEAGUE'));
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));

      expect(screen.getByText(/With 2 teams in league: Top 2 teams qualify/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Top 12 teams qualify/i })).not.toBeInTheDocument();
    });
  });
});
