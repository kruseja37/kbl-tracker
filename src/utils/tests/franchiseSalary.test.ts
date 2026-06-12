import { describe, expect, test } from 'vitest';
import { MAX_SALARY, MIN_SALARY } from '../../engines/salaryCalculator';
import type { Player } from '../franchisePlayerStorage';
import {
  calculateFranchiseCurrentSalary,
  calculateHiddenFarmProspectSalaryFromPublicContext,
  calculateFranchisePlayerSalary,
  FRANCHISE_CURRENT_SALARY_CALCULATION_VERSION,
  getVisibleSafeFranchisePlayerSalary,
  withInitialFranchiseSalary,
} from '../franchiseSalary';
import { prospectSalaryForDraftRound } from '../prospectSalary';

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
  test('bridges hidden FARM prospect draft placeholders into canonical salary dollars', () => {
    const values = [1, 2, 3, 4].map(prospectSalaryForDraftRound);

    expect(values).toEqual([6665.94, 3999.57, 2333.08, MIN_SALARY]);
    expect(prospectSalaryForDraftRound(4)).toBe(MIN_SALARY);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(MIN_SALARY);
      expect(value).toBeLessThanOrEqual(MAX_SALARY);
    }
    expect(values[0]).toBeGreaterThan(values[1]);
    expect(values[1]).toBeGreaterThan(values[2]);
    expect(values[2]).toBeGreaterThan(values[3]);
  });

  test('calculates deterministic ratings-only salary for initial franchise persistence', () => {
    const player = makePlayer();

    expect(calculateFranchisePlayerSalary(player)).toBe(calculateFranchisePlayerSalary(player));
    expect(calculateFranchisePlayerSalary(player)).toBeGreaterThan(0.5);
  });

  test('calculates v1 multifactor current salary with neutral fame and adaptive performance context', () => {
    const player = makePlayer({
      age: 31,
      trait1: 'Clutch',
      personality: 'Competitive',
      fame: 100,
    });

    const neutral = calculateFranchiseCurrentSalary(player, {
      seasonContext: { gamesPerTeam: 32, inningsPerGame: 6 },
    });
    const withPerformance = calculateFranchiseCurrentSalary(player, {
      seasonContext: { gamesPerTeam: 32, inningsPerGame: 6 },
      seasonStats: {
        battingWar: 2.5,
        fieldingWar: 0.2,
        baserunningWar: 0.1,
        totalWar: 2.8,
      },
      isNewTeam: true,
    });

    expect(withPerformance.calculationVersion).toBe(FRANCHISE_CURRENT_SALARY_CALCULATION_VERSION);
    expect(withPerformance.status).toBe('calculated');
    expect(withPerformance.adaptiveStandards.gamesPerSeason).toBe(32);
    expect(withPerformance.breakdown?.ivBase).toBe(withPerformance.breakdown?.baseSalary);
    expect(withPerformance.breakdown?.baseSalary).toBeGreaterThan(1666.49);
    expect(withPerformance.breakdown?.positionMultiplier).toBe(1);
    expect(withPerformance.breakdown?.traitModifier).toBe(1);
    expect(withPerformance.breakdown?.ageFactor).toBe(1.1);
    expect(withPerformance.breakdown?.performanceModifier).toBeGreaterThan(1);
    expect(withPerformance.breakdown?.personalityModifier).toBe(1.05);
    expect(withPerformance.breakdown?.fameModifier).toBe(1);
    expect(withPerformance.expectedPerformance?.total).toBeLessThan(2);
    expect(withPerformance.salary).toBeGreaterThan(neutral.salary ?? 0);
  });

  test('fame remains neutral for franchise v1 salary even when player fame differs', () => {
    const anonymous = makePlayer({ fame: 0 });
    const famous = makePlayer({ fame: 100 });

    expect(calculateFranchisePlayerSalary(famous)).toBe(calculateFranchisePlayerSalary(anonymous));
    expect(calculateFranchiseCurrentSalary(famous).breakdown?.fameModifier).toBe(1);
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

    expect(calculateHiddenFarmProspectSalaryFromPublicContext(highTrueRatings)).toBe(3999.57);
    expect(calculateHiddenFarmProspectSalaryFromPublicContext(lowTrueRatings)).toBe(3999.57);
    expect(withInitialFranchiseSalary(highTrueRatings).salary).toBe(3999.57);
    expect(withInitialFranchiseSalary(lowTrueRatings).salary).toBe(3999.57);
    expect(withInitialFranchiseSalary(highTrueRatings).salary).not.toBe(calculateFranchisePlayerSalary({
      ...highTrueRatings,
      ratingRevealState: 'revealed',
    }));
    expect(getVisibleSafeFranchisePlayerSalary(highTrueRatings)).toBe(3999.57);
    expect(calculateFranchiseCurrentSalary(highTrueRatings).salary).toBe(3999.57);
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
