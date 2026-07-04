import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { FranchiseSetup } from '../../app/pages/FranchiseSetup';

const mockNavigate = vi.fn();
const mockInitializeFranchise = vi.fn();
const mockValidatePreparedLeagueBuilderFarmScoutingState = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../utils/franchiseInitializer', () => ({
  initializeFranchise: (...args: unknown[]) => mockInitializeFranchise(...args),
}));

vi.mock('../../../utils/leagueBuilderFarmScoutingHandoff', () => ({
  validatePreparedLeagueBuilderFarmScoutingState: (...args: unknown[]) =>
    mockValidatePreparedLeagueBuilderFarmScoutingState(...args),
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
  await act(async () => {
    fireEvent.click(screen.getByText('KRUSE BASEBALL LEAGUE'));
  });
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
    );
  });

  test('hides the sub-choice and shows the Sudden Death v1 hint', async () => {
    await renderSeasonStep();

    fireEvent.click(screen.getByRole('button', { name: 'Runner on 2nd' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sudden Death' }));

    expect(screen.queryByText('GHOST RUNNER ARRIVES')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '1st extra inning' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '2nd extra inning' })).not.toBeInTheDocument();
    expect(screen.getByText('ℹ️ Sudden Death: not tracked in v1 — plays as Standard')).toBeInTheDocument();
  });

  test('restores the byte-identical Standard hint after switching back', async () => {
    await renderSeasonStep();

    fireEvent.click(screen.getByRole('button', { name: 'Runner on 2nd' }));
    fireEvent.click(screen.getByRole('button', { name: 'Standard' }));

    expect(screen.getByText(STANDARD_HINT)).toBeInTheDocument();
  });
});
