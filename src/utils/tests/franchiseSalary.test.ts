import { describe, expect, test } from 'vitest';
import type { Player } from '../franchisePlayerStorage';
import {
  calculateHiddenFarmProspectSalaryFromPublicContext,
  calculateFranchisePlayerSalary,
  getVisibleSafeFranchisePlayerSalary,
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

  test('hidden FARM prospect salary uses draft/scouting-safe context instead of true ratings', () => {
    const highTrueRatings = makePlayer({
      id: 'hidden-high',
      primaryPosition: 'CF',
      power: 99,
      contact: 99,
      speed: 99,
      fielding: 99,
      arm: 99,
      overallGrade: 'A',
      salary: 40,
      ratingRevealState: 'hidden',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'FARM' }],
      prospectProfile: {
        draftRound: 2,
        draftPick: 7,
        scoutedGrade: 'B',
        potentialGrade: 'A-',
        trueGrade: 'A',
      },
    } as Partial<Player> & Record<string, unknown>);
    const lowTrueRatings = makePlayer({
      id: 'hidden-low',
      primaryPosition: 'CF',
      power: 20,
      contact: 20,
      speed: 20,
      fielding: 20,
      arm: 20,
      overallGrade: 'D',
      salary: 0.5,
      ratingRevealState: 'hidden',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'FARM' }],
      prospectProfile: {
        draftRound: 2,
        draftPick: 8,
        scoutedGrade: 'B',
        potentialGrade: 'A-',
        trueGrade: 'D',
      },
    } as Partial<Player> & Record<string, unknown>);

    expect(calculateHiddenFarmProspectSalaryFromPublicContext(highTrueRatings)).toBe(1.2);
    expect(calculateHiddenFarmProspectSalaryFromPublicContext(lowTrueRatings)).toBe(1.2);
    expect(withInitialFranchiseSalary(highTrueRatings).salary).toBe(1.2);
    expect(withInitialFranchiseSalary(lowTrueRatings).salary).toBe(1.2);
    expect(withInitialFranchiseSalary(highTrueRatings).salary).not.toBe(calculateFranchisePlayerSalary(highTrueRatings));
    expect(getVisibleSafeFranchisePlayerSalary(highTrueRatings)).toBe(1.2);
  });

  test('revealed FARM players keep known salary context instead of hidden prospect fallback', () => {
    const revealedFarm = makePlayer({
      salary: 6.4,
      ratingRevealState: 'revealed',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'FARM' }],
      prospectProfile: {
        draftRound: 4,
        scoutedGrade: 'C',
      },
    } as Partial<Player> & Record<string, unknown>);

    expect(calculateHiddenFarmProspectSalaryFromPublicContext(revealedFarm)).toBeNull();
    expect(getVisibleSafeFranchisePlayerSalary(revealedFarm)).toBe(6.4);
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
