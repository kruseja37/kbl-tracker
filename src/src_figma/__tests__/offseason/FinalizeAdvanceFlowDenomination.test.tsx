import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { formatSalary } from '../../../engines/salaryCalculator';
import {
  buildFinalizeAdvanceCallUpPlayer,
  calculateFinalizeAdvanceRetirementRisk,
  FinalizeAdvanceFlow,
  getFinalizeAdvanceSalaryRetirementRiskBonus,
  type Player,
} from '../../app/components/FinalizeAdvanceFlow';

const mocks = vi.hoisted(() => ({
  mockUseOffseasonData: vi.fn(),
}));

vi.mock('@/hooks/useOffseasonData', () => ({
  useOffseasonData: mocks.mockUseOffseasonData,
}));

vi.mock('@/app/components/SpringTrainingFlow', () => ({
  SpringTrainingFlow: () => <div data-testid="spring-training-flow" />,
}));

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-1',
    name: 'Canon Dollars',
    position: 'SS',
    grade: 'B',
    age: 25,
    salary: 143_641,
    war: 1,
    yearsOfService: 0,
    ...overrides,
  };
}

function offseasonPlayer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'player-1',
    name: 'Canon Dollars',
    position: 'SS',
    grade: 'B',
    personality: 'COMPETITIVE',
    salary: 143_641,
    teamId: 'team-a',
    age: 25,
    seasons: 1,
    war: 1,
    jerseyNumber: 1,
    awards: [],
    careerStats: '',
    ...overrides,
  };
}

function renderFinalizeAdvanceFlow(players = [offseasonPlayer()]) {
  mocks.mockUseOffseasonData.mockReturnValue({
    teams: [
      {
        id: 'team-a',
        name: 'Team A',
        shortName: 'A',
        stadium: 'Park',
        record: { wins: 0, losses: 0 },
        primaryColor: '#111111',
        secondaryColor: '#222222',
      },
    ],
    players,
    hasRealData: true,
    isLoading: false,
    error: null,
    getTeamById: vi.fn(),
    getPlayerById: vi.fn(),
    getTeamRoster: vi.fn(),
    retirementCandidates: [],
    getRetirementProbability: vi.fn(() => 0),
    freeAgents: [],
    refresh: vi.fn().mockResolvedValue(undefined),
  });

  render(<FinalizeAdvanceFlow onClose={vi.fn()} onAdvanceComplete={vi.fn()} />);
}

describe('FinalizeAdvanceFlow denomination handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('keeps selected player salary unchanged at call-up instead of recomputing from the old rookie grade table', () => {
    const selectedPlayer = player({
      grade: 'A+',
      salary: 42_424,
    });

    const calledUp = buildFinalizeAdvanceCallUpPlayer(selectedPlayer);

    expect(calledUp.salary).toBe(selectedPlayer.salary);
    expect(calledUp.salary).not.toBe(1_500_000);
    expect(calledUp.isRookie).toBe(true);
  });

  test('applies retirement-risk salary bonuses at the bridge-rebased thresholds', () => {
    expect(getFinalizeAdvanceSalaryRetirementRiskBonus(16_664)).toBe(0);
    expect(getFinalizeAdvanceSalaryRetirementRiskBonus(16_665)).toBe(10);
    expect(getFinalizeAdvanceSalaryRetirementRiskBonus(33_329)).toBe(10);
    expect(getFinalizeAdvanceSalaryRetirementRiskBonus(33_330)).toBe(15);

    expect(calculateFinalizeAdvanceRetirementRisk(player({ salary: 16_665 }))).toBe(10);
    expect(calculateFinalizeAdvanceRetirementRisk(player({ salary: 33_330 }))).toBe(15);
  });

  test('renders roster salary with the canonical formatter instead of raw M-suffixed math', () => {
    renderFinalizeAdvanceFlow([offseasonPlayer({ salary: 143_641 })]);

    expect(screen.getByText((content) => content.includes(`${formatSalary(143_641)} • WAR:`))).toBeInTheDocument();
    expect(screen.queryByText(/\$0\.1M/)).not.toBeInTheDocument();
  });

  test('preserves a legitimate zero salary instead of falling back to the old scale literal', () => {
    renderFinalizeAdvanceFlow([offseasonPlayer({ salary: 0 })]);

    expect(screen.getByText((content) => content.includes(`${formatSalary(0)} • WAR:`))).toBeInTheDocument();
    expect(screen.queryByText(/\$1\.00M|\$1\.0M/)).not.toBeInTheDocument();
  });
});
