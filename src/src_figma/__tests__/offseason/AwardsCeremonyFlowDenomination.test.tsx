import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { formatSalary } from '../../../engines/salaryCalculator';
import type { OffseasonPlayer } from '../../hooks/useOffseasonData';
import {
  calculateAwardWinnerVotePct,
  convertToAwardPlayer,
  CyYoungScreen,
  type Player,
} from '../../app/components/AwardsCeremonyFlow';

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
});
