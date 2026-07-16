/**
 * WT-C: FranchiseSetup Season Settings custom games/innings entry.
 *
 * Covers the free-entry "Custom" inputs added alongside the preset buttons for
 * games-per-team and innings-per-game, including clamp behavior at the documented
 * bounds (games 8-200 per MODE_1_LEAGUE_BUILDER_FINAL.md §C-071; innings 3-9 per
 * SMB4 regulation-length range) and that both values persist into the initialized
 * franchise config.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { FranchiseSetup } from '../../app/pages/FranchiseSetup';

const mockNavigate = vi.fn();
const mockInitializeFranchise = vi.fn();
const mockLoadFranchiseFreezeSummary = vi.fn();
const mockValidatePreparedLeagueBuilderFarmScoutingState = vi.fn();

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

vi.mock('../../../utils/mlbDraftCompletion', () => ({
  readMlbDraftCompletion: vi.fn(async () => ({
    auctionSession: { session: { state: 'AUCTION_COMPLETE' } },
    snakeSession: null,
    auctionComplete: true,
    snakeComplete: false,
    complete: true,
  })),
  isCompletedLegacySnakeDraftSession: vi.fn(() => false),
}));

vi.mock('../../../utils/leagueBuilderStorage', () => ({
  getLeagueTemplate: vi.fn(async (leagueId: string) => ({ id: leagueId, draftFormat: 'auction' })),
  getMlbDraftSession: vi.fn(async () => null),
  getAuctionSessionById: vi.fn(async () => ({ session: { state: 'AUCTION_COMPLETE' } })),
  createFarmAuctionSessionId: (leagueId: string, seasonNumber = 1) => `farm-auction-${leagueId}-${seasonNumber}`,
}));

vi.mock('../../hooks/useLeagueBuilderData', () => ({
  useLeagueBuilderData: vi.fn(() => ({
    leagues: [
      {
        id: 'kbl',
        name: 'Kruse Baseball League',
        description: 'The premier league',
        teamIds: Array.from({ length: 16 }, (_, i) => `team-${i + 1}`),
        conferences: [],
        divisions: [],
        defaultRulesPreset: 'preset-1',
        createdDate: '2026-01-01',
        lastModified: '2026-01-01',
      },
    ],
    teams: Array.from({ length: 16 }, (_, i) => ({
      id: `team-${i + 1}`,
      name: `Team ${i + 1}`,
      abbreviation: `T${i + 1}`,
      location: 'City',
      nickname: `Nickname ${i + 1}`,
    })),
    players: [],
    rulesPresets: [],
    isLoading: false,
    error: null,
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
    refresh: vi.fn(),
  })),
}));

async function renderSeasonStep() {
  render(<FranchiseSetup />);
  await screen.findAllByText('Draft complete');
  await act(async () => {
    fireEvent.click(screen.getByText('KRUSE BASEBALL LEAGUE'));
  });
  await waitFor(() => expect(screen.getByRole('button', { name: /NEXT/i })).not.toBeDisabled());
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
  });
  await waitFor(() => expect(screen.getByText('SEASON SETTINGS')).toBeInTheDocument());
}

async function finishFranchiseSetup() {
  fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
  fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
  fireEvent.click(screen.getAllByRole('button', { name: /Team 1/i })[0]);
  fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
  fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
  fireEvent.click(screen.getByRole('button', { name: /START FRANCHISE/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Start Franchise' }));

  await waitFor(() => expect(mockInitializeFranchise).toHaveBeenCalled());
}

describe('FranchiseSetup Season Settings custom games/innings entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitializeFranchise.mockResolvedValue('franchise-1');
    mockLoadFranchiseFreezeSummary.mockResolvedValue({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-1',
      leagueName: 'Kruse Baseball League',
      teamCount: 0,
      frozenPlayerRows: 0,
      settledSalaryPlayerRows: 0,
      draftBaselineRows: 0,
      draftBaselineContractRows: 0,
      rosterTotals: { mlb: 0, farm: 0 },
      morale: {
        playerCount: 0,
        playerAverage: null,
        playerMin: null,
        playerMax: null,
        teamFanCount: 0,
        teamFanAverage: null,
        teamFanMin: null,
        teamFanMax: null,
      },
      teams: [],
      notDisplayable: [],
    });
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

  test('accepts an in-range custom games-per-team value and persists it', async () => {
    await renderSeasonStep();

    const customGames = document.getElementById('season-games-per-team-custom') as HTMLInputElement;
    expect(customGames).toBeInTheDocument();

    fireEvent.change(customGames, { target: { value: '50' } });
    fireEvent.blur(customGames);

    expect(customGames.value).toBe('50');

    await finishFranchiseSetup();

    expect(mockInitializeFranchise).toHaveBeenCalledWith(
      expect.objectContaining({
        season: expect.objectContaining({ gamesPerTeam: 50 }),
      }),
      undefined,
    );
  });

  test('clamps a custom games-per-team value above 200 down to 200', async () => {
    await renderSeasonStep();

    const customGames = document.getElementById('season-games-per-team-custom') as HTMLInputElement;
    fireEvent.change(customGames, { target: { value: '9999' } });
    fireEvent.blur(customGames);

    expect(customGames.value).toBe('200');
  });

  test('clamps a custom games-per-team value below 8 up to 8', async () => {
    await renderSeasonStep();

    const customGames = document.getElementById('season-games-per-team-custom') as HTMLInputElement;
    fireEvent.change(customGames, { target: { value: '1' } });
    fireEvent.blur(customGames);

    expect(customGames.value).toBe('8');
  });

  test('accepts an in-range custom innings-per-game value and persists it', async () => {
    await renderSeasonStep();

    const customInnings = document.getElementById('season-innings-per-game-custom') as HTMLInputElement;
    expect(customInnings).toBeInTheDocument();

    fireEvent.change(customInnings, { target: { value: '5' } });
    fireEvent.blur(customInnings);

    expect(customInnings.value).toBe('5');

    await finishFranchiseSetup();

    expect(mockInitializeFranchise).toHaveBeenCalledWith(
      expect.objectContaining({
        season: expect.objectContaining({ inningsPerGame: 5 }),
      }),
      undefined,
    );
  });

  test('rejects (clamps) a custom innings-per-game value above 9 down to 9', async () => {
    await renderSeasonStep();

    const customInnings = document.getElementById('season-innings-per-game-custom') as HTMLInputElement;
    fireEvent.change(customInnings, { target: { value: '20' } });
    fireEvent.blur(customInnings);

    expect(customInnings.value).toBe('9');
  });

  test('rejects (clamps) a custom innings-per-game value below 3 up to 3', async () => {
    await renderSeasonStep();

    const customInnings = document.getElementById('season-innings-per-game-custom') as HTMLInputElement;
    fireEvent.change(customInnings, { target: { value: '1' } });
    fireEvent.blur(customInnings);

    expect(customInnings.value).toBe('3');
  });

  test('committing a custom games value on Enter blurs and clamps without needing a separate blur', async () => {
    await renderSeasonStep();

    const customGames = document.getElementById('season-games-per-team-custom') as HTMLInputElement;
    fireEvent.change(customGames, { target: { value: '500' } });
    fireEvent.keyDown(customGames, { key: 'Enter' });

    expect(customGames.value).toBe('200');
  });

  test('clicking a preset button after a custom entry resyncs the custom input display', async () => {
    await renderSeasonStep();

    const customGames = document.getElementById('season-games-per-team-custom') as HTMLInputElement;
    fireEvent.change(customGames, { target: { value: '50' } });
    fireEvent.blur(customGames);
    expect(customGames.value).toBe('50');

    fireEvent.click(screen.getByRole('button', { name: '162' }));

    expect(customGames.value).toBe('162');
  });
});
