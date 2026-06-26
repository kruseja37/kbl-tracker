import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { formatSalary } from '../../../engines/salaryCalculator';
import type { OffseasonPlayer } from '../../hooks/useOffseasonData';
import {
  calculateAwardWinnerVotePct,
  convertToAwardPlayer,
  CyYoungScreen,
  ManagerYearScreen,
  type Player,
} from '../../app/components/AwardsCeremonyFlow';
import type { FranchiseAwardRow } from '../../../utils/franchiseAwardsStorage';
import type { ManagerProfile } from '../../../types/managerWpa';

function offseasonPlayer(overrides: Partial<OffseasonPlayer>): OffseasonPlayer {
  return {
    id: 'player-1',
    name: 'Canon Dollars',
    position: 'SS',
    grade: 'A',
    personality: 'COMPETITIVE',
    salary: 80_000,
    teamId: 'team-1',
    age: 27,
    seasons: 5,
    war: 4,
    jerseyNumber: 12,
    awards: [],
    careerStats: 'Test stats',
    ...overrides,
  };
}

function awardPlayer(overrides: Partial<Player>): Player {
  return {
    id: 'player-1',
    name: 'Canon Dollars',
    team: 'BOS',
    position: 'P',
    grade: 'A',
    age: 27,
    salary: 80_000,
    league: 'AL',
    traits: [],
    ...overrides,
  };
}

function managerAwardRow(overrides: Partial<FranchiseAwardRow> = {}): FranchiseAwardRow {
  return {
    franchiseId: 'franchise-awards',
    seasonId: 'franchise-awards-season-1',
    statsScopeId: 'franchise-awards-season-1',
    category: 'MANAGER_OF_YEAR',
    winnerPlayerId: 'manager-winner',
    winnerTeamId: null,
    candidates: [
      { playerId: 'manager-winner', teamId: null, score: 0.875, marginToWinner: 0 },
      { playerId: 'manager-runner-up', teamId: null, score: 0.7, marginToWinner: -0.175 },
    ],
    goldGloveSplit: null,
    managerActualWins: 22,
    managerExpectedWins: 18.4,
    voteWeight: null,
    finalized: true,
    computedAt: '2026-06-26T12:00:00.000Z',
    ...overrides,
  };
}

describe('AwardsCeremonyFlow denomination handling', () => {
  test('converts offseason players without multiplying canonical salaries by the old dollar-M scale', () => {
    const converted = convertToAwardPlayer(offseasonPlayer({ salary: 143_641 }), 'BOS');

    expect(converted.salary).toBe(143_641);
    expect(converted.salary).not.toBe(143_641_000_000);
  });

  test('rebases vote percentage salary spread math to canonical dollars', () => {
    const winnerSalary = 80_000;
    const runnerUpSalary = 63_340;

    expect(calculateAwardWinnerVotePct(winnerSalary, runnerUpSalary, 70, 55, 97, 87)).toBe(80);
    expect(calculateAwardWinnerVotePct(winnerSalary, runnerUpSalary, 75, 55, 98, 92)).toBe(85);
  });

  test('renders winner salary with the canonical formatter instead of raw M-suffixed text', () => {
    render(
      <CyYoungScreen
        league="AL"
        onContinue={vi.fn()}
        allPlayers={[
          awardPlayer({ id: 'winner', name: 'Canon Ace', salary: 80_000 }),
          awardPlayer({ id: 'runner-up', name: 'Bridge Arm', salary: 63_340 }),
        ]}
      />,
    );

    expect(screen.getByText(formatSalary(80_000))).toBeInTheDocument();
    expect(screen.queryByText('$0.1M')).not.toBeInTheDocument();
    expect(screen.queryByText('80000.0M')).not.toBeInTheDocument();
  });

  test('renders Manager of the Year from the finalized franchise award row', () => {
    render(
      <ManagerYearScreen
        league="AL"
        onContinue={vi.fn()}
        managerAwardRow={managerAwardRow()}
        managerProfiles={[
          {
            managerId: 'manager-winner',
            displayName: 'Skipper Vale',
            createdByUser: false,
            defaultManager: false,
            teamName: 'Sharks',
          } as ManagerProfile & { teamName: string },
          {
            managerId: 'manager-runner-up',
            displayName: 'Coach Runner',
            createdByUser: false,
            defaultManager: false,
          },
        ]}
      />,
    );

    expect(screen.getAllByText('Skipper Vale').length).toBeGreaterThan(0);
    expect(screen.getByText('Sharks')).toBeInTheDocument();
    expect(screen.getByText('Actual Wins:')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument();
    expect(screen.getByText('Expected Wins:')).toBeInTheDocument();
    expect(screen.getByText('18.4')).toBeInTheDocument();
    expect(screen.getByText('Wins Above Expected:')).toBeInTheDocument();
    expect(screen.getByText('+3.6')).toBeInTheDocument();
    expect(screen.getByText('Coach Runner')).toBeInTheDocument();
    expect(screen.getByText('-0.175')).toBeInTheDocument();
    expect(screen.queryByText(/No manager data/i)).not.toBeInTheDocument();
  });

  test('uses a not-finalized state instead of telling users to play a season first', () => {
    render(
      <ManagerYearScreen
        league="NL"
        onContinue={vi.fn()}
        managerAwardRow={managerAwardRow({ finalized: false })}
        managerProfiles={[]}
      />,
    );

    expect(screen.getByText('Manager of the Year not finalized yet')).toBeInTheDocument();
    expect(screen.queryByText(/play a season first/i)).not.toBeInTheDocument();
  });
});
