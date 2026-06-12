import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { formatSalary } from '../../../engines/salaryCalculator';
import {
  buildFreeAgentSigningFromMove,
  ExchangeScreen,
  getFreeAgencyExchangeSalaryWindow,
  type Move,
  type Player,
  type Team,
} from '../../app/components/FreeAgencyFlow';

const fromTeam: Team = {
  id: 'team-from',
  name: 'From City',
  shortName: 'FROM',
  record: { wins: 88, losses: 74 },
  primaryColor: '#123456',
  secondaryColor: '#abcdef',
};

const toTeam: Team = {
  id: 'team-to',
  name: 'To City',
  shortName: 'TO',
  record: { wins: 82, losses: 80 },
  primaryColor: '#654321',
  secondaryColor: '#fedcba',
};

function player(overrides: Partial<Player>): Player {
  return {
    id: 'player-1',
    name: 'Canon Dollars',
    position: 'SS',
    grade: 'A',
    personality: 'COMPETITIVE',
    salary: 143_641,
    teamId: fromTeam.id,
    ...overrides,
  };
}

describe('FreeAgencyFlow denomination handling', () => {
  test('persists canonical contract dollars without multiplying by the old $M scale', () => {
    const incoming = player({ id: 'incoming', salary: 143_641 });
    const move: Move = {
      player: incoming,
      fromTeam,
      toTeam,
      reason: 'Signed by destination',
      outcome: 'MOVED',
      round: 1,
    };

    const signing = buildFreeAgentSigningFromMove(move, 123_456);

    expect(signing.contractValue).toBe(143_641);
    expect(signing.contractValue).not.toBe(143_641_000_000);
    expect(signing.signedAt).toBe(123_456);
  });

  test('renders salary with the canonical formatter instead of raw M-suffixed text', () => {
    const incoming = player({ id: 'incoming', salary: 143_641, teamId: fromTeam.id });
    const returnPlayer = player({
      id: 'return',
      name: 'Return Value',
      salary: 140_000,
      teamId: toTeam.id,
    });

    render(
      <ExchangeScreen
        incomingPlayer={incoming}
        fromTeam={fromTeam}
        toTeam={toTeam}
        selectedReturn={returnPlayer}
        onSelectReturn={vi.fn()}
        onConfirm={vi.fn()}
        allPlayers={[incoming, returnPlayer]}
      />,
    );

    expect(screen.getByText(`True Value: ${formatSalary(143_641)}`)).toBeInTheDocument();
    expect(screen.getByText(`True Value: ${formatSalary(140_000)}`)).toBeInTheDocument();
    expect(screen.getByText(`SS • ${formatSalary(140_000)}`)).toBeInTheDocument();
    expect(screen.queryByText(/143641\.0M/)).not.toBeInTheDocument();
    expect(screen.queryByText(/140000\.0M/)).not.toBeInTheDocument();
  });

  test('keeps the plus-minus ten percent match window in canonical dollars', () => {
    const { salaryMin, salaryMax } = getFreeAgencyExchangeSalaryWindow(143_641);

    expect(salaryMin).toBeCloseTo(129_276.9, 5);
    expect(salaryMax).toBeCloseTo(158_005.1, 5);
  });
});
