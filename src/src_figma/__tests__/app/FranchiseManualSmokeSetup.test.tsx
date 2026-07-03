import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';

const { mockPrepareFranchiseManualSmokeFixture } = vi.hoisted(() => ({
  mockPrepareFranchiseManualSmokeFixture: vi.fn(),
}));

vi.mock('../../../utils/franchiseManualSmokeFixture', () => ({
  FRANCHISE_MANUAL_SMOKE_LEAGUE_ID: 'manual-smoke-v1-league',
  prepareFranchiseManualSmokeFixture: mockPrepareFranchiseManualSmokeFixture,
}));

import { FranchiseManualSmokeSetup } from '../../app/pages/FranchiseManualSmokeSetup';

describe('FranchiseManualSmokeSetup', () => {
  test('renders preview-only setup copy without seeding on mount', () => {
    render(
      <MemoryRouter>
        <FranchiseManualSmokeSetup />
      </MemoryRouter>,
    );

    expect(screen.getByText('Mode 1/2 Manual Smoke Setup')).toBeInTheDocument();
    expect(screen.getByText('DEV / TEST PREVIEW ONLY')).toBeInTheDocument();
    expect(screen.getByText(/This is not product auto-draft/i)).toBeInTheDocument();
    expect(screen.getByText(/does not create a Franchise, schedule, GameTracker result/i)).toBeInTheDocument();
    expect(mockPrepareFranchiseManualSmokeFixture).not.toHaveBeenCalled();
  });

  test('explicit click prepares named smoke league and displays handoff counts', async () => {
    mockPrepareFranchiseManualSmokeFixture.mockResolvedValueOnce({
      fixtureVersion: 'franchise-manual-smoke-fixture-v1',
      enabled: true,
      leagueId: 'manual-smoke-v1-league',
      leagueName: 'Manual Smoke Mode 1/2 League',
      seasonNumber: 1,
      teamCount: 6,
      mlbPlayersPerTeam: 22,
      farmPlayersPerTeam: 10,
      scoutsPerTeam: 1,
      createdMlbPlayers: 132,
      createdFarmPlayers: 60,
      hiredScouts: 6,
      prepared: true,
      blockers: [],
      warnings: [],
      limitations: [],
      teamSummaries: [{
        teamId: 'manual-smoke-v1-team-01',
        teamName: 'Manual Smoke 1',
        stadium: 'Apple Field',
        mlbPlayers: 22,
        farmPlayers: 10,
        hiredScouts: 1,
        payroll: 31_500_000,
      }],
      nextSteps: [],
    });

    render(
      <MemoryRouter>
        <FranchiseManualSmokeSetup />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /prepare smoke league/i }));

    await waitFor(() => {
      expect(mockPrepareFranchiseManualSmokeFixture).toHaveBeenCalledWith({ forceReset: true });
    });
    expect(await screen.findByText('Prepared')).toBeInTheDocument();
    expect(screen.getByText(/6 teams · 132 MLB · 60 FARM · 6 scouts/i)).toBeInTheDocument();
    expect(screen.getByText('Manual Smoke 1')).toBeInTheDocument();
    expect(screen.getByText(/MLB 22\/22 · FARM 10\/10 · Scouts 1\/1/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open franchise setup/i })).toHaveAttribute('href', '/franchise/setup');
    expect(screen.getByRole('link', { name: /inspect draft readiness/i })).toHaveAttribute(
      'href',
      '/league-builder/farm-auction-draft?leagueId=manual-smoke-v1-league',
    );
  });
});
