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

const STANDARD_HINT = "ℹ️ Standard: No runner placed, play until there's a winner";

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

function dotClass(buttonName: string): string {
  const button = screen.getByRole('button', { name: buttonName });
  return button.firstElementChild?.className ?? '';
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

describe('FranchiseSetup extra innings runner delay', () => {
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

  test('keeps the ghost-runner sub-choice hidden under the Standard default', async () => {
    await renderSeasonStep();

    expect(screen.queryByText('GHOST RUNNER ARRIVES')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '1st extra inning' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '2nd extra inning' })).not.toBeInTheDocument();
    expect(screen.getByText(STANDARD_HINT)).toBeInTheDocument();
  });

  test('reveals Runner on 2nd delay choices with the 1st extra inning selected', async () => {
    await renderSeasonStep();

    fireEvent.click(screen.getByRole('button', { name: 'Runner on 2nd' }));

    expect(screen.getByText('GHOST RUNNER ARRIVES')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1st extra inning' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2nd extra inning' })).toBeInTheDocument();
    expect(dotClass('1st extra inning')).toContain('bg-[#C4A853]');
    expect(dotClass('2nd extra inning')).not.toContain('bg-[#C4A853]');
  });

  test('writes delay 2 and shows the concrete 9-inning ghost-runner start inning', async () => {
    await renderSeasonStep();

    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: 'Runner on 2nd' }));
    fireEvent.click(screen.getByRole('button', { name: '2nd extra inning' }));

    expect(dotClass('2nd extra inning')).toContain('bg-[#C4A853]');
    expect(screen.getByText('ℹ️ Ghost runner takes second starting the 11th inning')).toBeInTheDocument();

    await finishFranchiseSetup();

    expect(mockInitializeFranchise).toHaveBeenCalledWith(
      expect.objectContaining({
        season: expect.objectContaining({
          inningsPerGame: 9,
          extraInningsRule: 'Runner on 2nd',
          extraInningsRunnerDelay: 2,
        }),
      }),
      undefined,
    );
  });

  test('does not expose the unwired Sudden Death option', async () => {
    await renderSeasonStep();

    fireEvent.click(screen.getByRole('button', { name: 'Runner on 2nd' }));

    expect(screen.queryByRole('button', { name: 'Sudden Death' })).not.toBeInTheDocument();
    expect(screen.queryByText('ℹ️ Sudden Death: not tracked in v1 — plays as Standard')).not.toBeInTheDocument();
  });

  test('restores the byte-identical Standard hint after switching back', async () => {
    await renderSeasonStep();

    fireEvent.click(screen.getByRole('button', { name: 'Runner on 2nd' }));
    fireEvent.click(screen.getByRole('button', { name: 'Standard' }));

    expect(screen.getByText(STANDARD_HINT)).toBeInTheDocument();
  });

  // WT-C: JK's walkthrough missed this control entirely because it rendered as a plain
  // radio-dot row while every other Season Settings choice used a bold box-button. This
  // locks the box-button treatment in so the control stays visually on par going forward.
  test('renders the extra innings rule as bold box-buttons matching Games/Innings (WT-C visibility fix)', async () => {
    await renderSeasonStep();

    const standardButton = screen.getByRole('button', { name: 'Standard' });
    const runnerButton = screen.getByRole('button', { name: 'Runner on 2nd' });

    expect(standardButton.className).toContain('border-4');
    expect(standardButton.className).toContain('bg-[#C4A853]'); // Standard is selected by default
    expect(runnerButton.className).toContain('border-4');
    expect(runnerButton.className).not.toContain('bg-[#C4A853]');
  });

  test('persists the Standard extra-innings rule into the initialized franchise config', async () => {
    await renderSeasonStep();

    await finishFranchiseSetup();

    expect(mockInitializeFranchise).toHaveBeenCalledWith(
      expect.objectContaining({
        season: expect.objectContaining({
          extraInningsRule: 'Standard',
        }),
      }),
      undefined,
    );
  });
});
