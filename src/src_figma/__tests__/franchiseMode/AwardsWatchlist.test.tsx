import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getFranchiseAwardRowsByScope: vi.fn(),
  saveFranchiseAwardRows: vi.fn(),
  replaceFranchiseAwardRowsForScope: vi.fn(),
  computeFranchiseAwardsPreview: vi.fn(),
  getAllFranchisePlayers: vi.fn(),
  listManagerProfiles: vi.fn(),
}));

vi.mock('../../../utils/franchiseAwardsStorage', () => ({
  getFranchiseAwardRowsByScope: mocks.getFranchiseAwardRowsByScope,
  saveFranchiseAwardRows: mocks.saveFranchiseAwardRows,
  replaceFranchiseAwardRowsForScope: mocks.replaceFranchiseAwardRowsForScope,
}));

vi.mock('../../../utils/franchiseAwardsEngine', () => ({
  computeFranchiseAwardsPreview: mocks.computeFranchiseAwardsPreview,
}));

vi.mock('../../../utils/franchisePlayerStorage', () => ({
  getAllFranchisePlayers: mocks.getAllFranchisePlayers,
}));

vi.mock('../../../utils/managerIdentityStorage', () => ({
  listManagerProfiles: mocks.listManagerProfiles,
}));

import { AwardsWatchlist } from '../../app/components/AwardsWatchlist';
import type { FranchiseAwardRow } from '../../../utils/franchiseAwardsStorage';

const scope = {
  franchiseId: 'franchise-awards-ui',
  seasonId: 'franchise-awards-ui-season-1',
  statsScopeId: 'franchise-awards-ui-season-1',
  seasonNumber: 1,
};

function awardRow(overrides: Partial<FranchiseAwardRow> = {}): FranchiseAwardRow {
  return {
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    category: 'MVP',
    winnerPlayerId: 'player-mvp',
    winnerTeamId: 'team-a',
    candidates: [
      { playerId: 'player-mvp', teamId: 'team-a', score: 6.5, marginToWinner: 0 },
      { playerId: 'player-runner-up', teamId: 'team-b', score: 5.75, marginToWinner: -0.75 },
    ],
    goldGloveSplit: null,
    voteWeight: null,
    finalized: true,
    computedAt: '2026-06-17T12:00:00.000Z',
    ...overrides,
  };
}

function renderWatchlist(rivalTeamId?: string | null) {
  return render(
    <AwardsWatchlist
      franchiseId={scope.franchiseId}
      seasonId={scope.seasonId}
      statsScopeId={scope.statsScopeId}
      seasonNumber={scope.seasonNumber}
      rivalTeamId={rivalTeamId}
    />,
  );
}

describe('AwardsWatchlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAllFranchisePlayers.mockResolvedValue([
      { id: 'player-mvp', firstName: 'Mira', lastName: 'Voss' },
      { id: 'player-runner-up', firstName: 'Rae', lastName: 'Knox' },
      { id: 'player-glove', firstName: 'Gio', lastName: 'Field' },
    ]);
    mocks.listManagerProfiles.mockResolvedValue([
      { managerId: 'manager-winner', displayName: 'Skipper Vale' },
    ]);
  });

  test('renders finalized award rows with emblem labels, resolved winners, margins, and award splits', async () => {
    mocks.getFranchiseAwardRowsByScope.mockResolvedValue([
      awardRow(),
      awardRow({
        category: 'GOLD_GLOVE',
        winnerPlayerId: 'player-glove',
        winnerTeamId: 'team-a',
        candidates: [
          { playerId: 'player-glove', teamId: 'team-a', score: 2.9, marginToWinner: 0 },
          { playerId: 'player-runner-up', teamId: 'team-b', score: 2.25, marginToWinner: -0.65 },
        ],
        goldGloveSplit: { fWar: 2.9, totalWar: 4.2 },
      }),
      awardRow({
        category: 'MANAGER_OF_YEAR',
        winnerPlayerId: 'manager-winner',
        winnerTeamId: null,
        candidates: [
          { playerId: 'manager-winner', teamId: null, score: 0.875, marginToWinner: 0 },
          { playerId: 'manager-runner-up', teamId: null, score: 0.7, marginToWinner: -0.175 },
        ],
        managerActualWins: 22,
        managerExpectedWins: 18.4,
      }),
    ]);
    mocks.computeFranchiseAwardsPreview.mockResolvedValue([]);

    renderWatchlist();

    await waitFor(() => expect(screen.getByText('FINALIZED')).toBeInTheDocument());
    expect(screen.getByText(/MVP/)).toBeInTheDocument();
    expect(screen.getByText(/GG/)).toBeInTheDocument();
    expect(screen.getByText(/MOY/)).toBeInTheDocument();
    expect(screen.getByTestId('award-winner-MVP')).toHaveTextContent('Mira Voss');
    expect(screen.getByTestId('award-winner-GOLD_GLOVE')).toHaveTextContent('Gio Field');
    expect(screen.getByTestId('award-winner-MANAGER_OF_YEAR')).toHaveTextContent('Skipper Vale');
    expect(screen.getByText('-0.750')).toBeInTheDocument();
    expect(screen.getByText('fWAR Split')).toBeInTheDocument();
    expect(screen.getByText('Expected Wins')).toBeInTheDocument();
    expect(mocks.computeFranchiseAwardsPreview).not.toHaveBeenCalled();
  });

  test('renders projected preview when no finalized rows exist and never writes award rows', async () => {
    mocks.getFranchiseAwardRowsByScope.mockResolvedValue([]);
    mocks.computeFranchiseAwardsPreview.mockResolvedValue([
      awardRow({
        finalized: false,
        winnerPlayerId: 'player-runner-up',
        winnerTeamId: 'team-b',
        candidates: [
          { playerId: 'player-runner-up', teamId: 'team-b', score: 4.25, marginToWinner: 0 },
          { playerId: 'player-mvp', teamId: 'team-a', score: 4, marginToWinner: -0.25 },
        ],
      }),
    ]);

    renderWatchlist();

    await waitFor(() => expect(screen.getByText('PROJECTED')).toBeInTheDocument());
    expect(screen.getByText('Projected — finalizes at season end.')).toBeInTheDocument();
    expect(screen.getByTestId('award-winner-MVP')).toHaveTextContent('Rae Knox');
    expect(screen.getByText('-0.250')).toBeInTheDocument();
    expect(mocks.computeFranchiseAwardsPreview).toHaveBeenCalledWith(scope);
    expect(mocks.saveFranchiseAwardRows).not.toHaveBeenCalled();
    expect(mocks.replaceFranchiseAwardRowsForScope).not.toHaveBeenCalled();
  });

  test('colors rival winners and candidates red only when rivalTeamId is provided', async () => {
    mocks.getFranchiseAwardRowsByScope.mockResolvedValue([awardRow()]);
    mocks.computeFranchiseAwardsPreview.mockResolvedValue([]);

    const { rerender } = renderWatchlist('team-b');

    await waitFor(() => expect(screen.getByText('FINALIZED')).toBeInTheDocument());
    expect(screen.getByTestId('award-winner-MVP').className).toContain('text-[var(--franchise-text)]');
    const rivalCandidate = screen.getAllByText('Rae Knox')
      .find((element) => element.className.includes('text-[var(--franchise-rival)]'));
    expect(rivalCandidate).toBeTruthy();

    rerender(
      <AwardsWatchlist
        franchiseId={scope.franchiseId}
        seasonId={scope.seasonId}
        statsScopeId={scope.statsScopeId}
        seasonNumber={scope.seasonNumber}
        rivalTeamId={null}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('award-winner-MVP').className).toContain('text-[var(--franchise-text)]');
    });
    expect(screen.queryAllByText('Rae Knox').some((element) =>
      element.className.includes('text-[var(--franchise-rival)]'),
    )).toBe(false);
  });
});
