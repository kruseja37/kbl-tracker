import { describe, expect, test } from 'vitest';
import type { Player } from '../franchisePlayerStorage';
import {
  calculateFranchisePlayerSalary,
  withInitialFranchiseSalary,
} from '../franchiseSalary';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-a',
    firstName: 'Initial',
    lastName: 'Salary',
    gender: 'M',
    age: 27,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: '2B',
    power: 80,
    contact: 75,
    speed: 70,
    fielding: 85,
    arm: 88,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    arsenal: [],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 0.5,
    leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'MLB' }],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: false,
    editHistory: [],
    ...overrides,
  };
}

describe('franchise salary helpers', () => {
  test('calculates deterministic ratings-only salary for initial franchise persistence', () => {
    const player = makePlayer();

    expect(calculateFranchisePlayerSalary(player)).toBe(calculateFranchisePlayerSalary(player));
    expect(calculateFranchisePlayerSalary(player)).toBeGreaterThan(0.5);
  });

  test('returns a franchise-owned copy with salary updated without mutating the source player', () => {
    const source = makePlayer({ salary: 0.5 });
    const copied = withInitialFranchiseSalary(source);

    expect(copied).not.toBe(source);
    expect(copied.id).toBe(source.id);
    expect(copied.salary).toBe(calculateFranchisePlayerSalary(source));
    expect(source.salary).toBe(0.5);
  });

  test('uses pitcher ratings and batting bonus inputs for pitcher salaries', () => {
    const pitcher = makePlayer({
      id: 'pitcher-a',
      primaryPosition: 'SP',
      power: 60,
      contact: 55,
      speed: 30,
      fielding: 40,
      arm: 55,
      velocity: 92,
      junk: 88,
      accuracy: 84,
    });

    expect(calculateFranchisePlayerSalary(pitcher)).toBeGreaterThan(10);
  });
});
