import { describe, expect, test } from 'vitest';

import {
  buildFarmAuctionPool,
  priceFarmAuctionProspect,
  toFarmAuctionSalaryPlayer,
} from '../farmAuctionPool';
import { calculateIvBaseSalary, type PlayerForSalary, type PlayerPosition } from '../../engines/salaryCalculator';
import type { LeagueBuilderProspectPlayerDto } from '../prospectScoutingDraftEngine';

const BASE_INPUT = {
  leagueId: 'auc-5-1a-league',
  seasonNumber: 1,
  teamCount: 4,
  seed: 'auc-5.1a-farm-pool-seed',
  poolMultiplier: 3,
} as const;

const SALARY_POSITIONS = new Set<string>([
  'C',
  '1B',
  '2B',
  'SS',
  '3B',
  'LF',
  'CF',
  'RF',
  'DH',
  'SP',
  'RP',
  'CP',
  'SP/RP',
]);

function expectedSalaryPosition(position: string | undefined): PlayerPosition {
  return position && SALARY_POSITIONS.has(position) ? position as PlayerPosition : 'UTIL';
}

function expectedPitcherRole(position: LeagueBuilderProspectPlayerDto['primaryPosition']): PlayerForSalary['pitcherRole'] {
  return position === 'SP' || position === 'RP' || position === 'CP' || position === 'SP/RP'
    ? position
    : 'SP';
}

function expectedSalaryPlayer(prospect: LeagueBuilderProspectPlayerDto): PlayerForSalary {
  const isPitcher = prospect.primaryPosition === 'SP'
    || prospect.primaryPosition === 'RP'
    || prospect.primaryPosition === 'CP'
    || prospect.primaryPosition === 'SP/RP'
    || (prospect.primaryPosition as string) === 'P';

  return {
    id: prospect.id,
    name: `${prospect.firstName} ${prospect.lastName}`.trim(),
    isPitcher,
    primaryPosition: expectedSalaryPosition(prospect.primaryPosition),
    secondaryPosition: prospect.secondaryPosition ? expectedSalaryPosition(prospect.secondaryPosition) : undefined,
    pitcherRole: isPitcher ? expectedPitcherRole(prospect.primaryPosition) : undefined,
    ratings: isPitcher
      ? { velocity: prospect.velocity, junk: prospect.junk, accuracy: prospect.accuracy }
      : {
          power: prospect.power,
          contact: prospect.contact,
          speed: prospect.speed,
          fielding: prospect.fielding,
          arm: prospect.arm,
        },
    battingRatings: isPitcher
      ? {
          power: prospect.power,
          contact: prospect.contact,
          speed: prospect.speed,
          fielding: prospect.fielding,
          arm: prospect.arm,
        }
      : undefined,
    age: prospect.age,
    bats: prospect.bats,
    fame: prospect.fame,
    traits: [prospect.trait1, prospect.trait2].filter((trait): trait is string => Boolean(trait)),
    arsenal: prospect.arsenal,
    armSlot: prospect.armSlot ?? null,
  };
}

function makeProspect(
  overrides: Partial<LeagueBuilderProspectPlayerDto> & Pick<LeagueBuilderProspectPlayerDto, 'id' | 'primaryPosition'>,
): LeagueBuilderProspectPlayerDto {
  return {
    id: overrides.id,
    firstName: 'Known',
    lastName: 'Prospect',
    gender: 'M',
    jerseyNumber: 71,
    age: 18,
    bats: 'R',
    throws: 'R',
    armSlot: null,
    primaryPosition: overrides.primaryPosition,
    secondaryPosition: undefined,
    power: 72,
    contact: 68,
    speed: 61,
    fielding: 66,
    arm: 64,
    velocity: 74,
    junk: 69,
    accuracy: 63,
    arsenal: ['4F', 'SL', 'CH'],
    overallGrade: 'B',
    trait1: 'Tough Out',
    trait2: undefined,
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 75,
    mojo: 'Normal',
    fame: 2,
    salary: 1,
    contractYears: 3,
    leagueAssignments: [],
    ratingRevealState: 'hidden',
    isCustom: false,
    sourceDatabase: 'league-builder-startup-prospect-draft',
    hometown: { city: 'Denver', state: 'CO' },
    prospectProfile: {
      methodVersion: 'league-builder-startup-prospect-scouting-draft-v1',
      source: 'league-builder-startup-prospect-draft',
      draftYear: 1,
      draftRound: 1,
      draftPick: 1,
      teamId: '__farm_auction_pool_unassigned__',
      trueGrade: 'B',
      scoutedGrade: 'B',
      potentialGrade: 'B+',
      scoutAccuracy: 70,
      scoutConfidence: 'medium',
      scoutGradeError: 0,
      scoutSpecialtiesVisible: [],
      scoutWeaknessesVisible: [],
    },
    hiddenPersonalityModifiers: {
      loyalty: 50,
      ambition: 50,
      resilience: 50,
      charisma: 50,
    },
    ...overrides,
  };
}

function serializePool(pool: ReturnType<typeof buildFarmAuctionPool>) {
  return {
    prospectIds: pool.prospects.map((prospect) => prospect.id),
    auctionPlayers: pool.auctionPlayers.map((player) => ({
      playerId: player.playerId,
      iv: player.iv,
      ivPercentile: player.ivPercentile,
    })),
  };
}

describe('buildFarmAuctionPool AUC-5.1a', () => {
  test('prices known hitter and pitcher prospects through the MLB salary-IV path', () => {
    const hitter = makeProspect({
      id: 'known-hitter',
      primaryPosition: 'SS',
      secondaryPosition: '2B',
      salary: 1,
    });
    const sameHitterWithDifferentSalary = { ...hitter, salary: 999_999 };
    const pitcher = makeProspect({
      id: 'known-pitcher',
      firstName: 'Known',
      lastName: 'Pitcher',
      primaryPosition: 'SP',
      trait1: 'K Collector',
      salary: 1,
    });

    for (const prospect of [hitter, pitcher]) {
      const expectedSalaryInput = expectedSalaryPlayer(prospect);
      const expectedIv = calculateIvBaseSalary(expectedSalaryInput).ivBase;

      expect(toFarmAuctionSalaryPlayer(prospect)).toEqual(expectedSalaryInput);
      expect(priceFarmAuctionProspect(prospect)).toBe(expectedIv);
      expect(priceFarmAuctionProspect(prospect)).toBeGreaterThan(0);
    }
    expect(priceFarmAuctionProspect(sameHitterWithDifferentSalary)).toBe(priceFarmAuctionProspect(hitter));
  });

  test('F12a passes generated pitcher arm slots into farm IV pricing', () => {
    const pitcher = makeProspect({
      id: 'known-sub-slot-pitcher',
      firstName: 'Known',
      lastName: 'Subslot',
      primaryPosition: 'SP',
      trait1: undefined,
      trait2: undefined,
      armSlot: 'Sub',
      salary: 1,
    });
    const neutralPitcher = {
      ...pitcher,
      armSlot: null,
    };
    const subIv = calculateIvBaseSalary(toFarmAuctionSalaryPlayer(pitcher));
    const neutralIv = calculateIvBaseSalary(toFarmAuctionSalaryPlayer(neutralPitcher));

    expect(toFarmAuctionSalaryPlayer(pitcher).armSlot).toBe('Sub');
    expect(subIv.ivBreakdown.angle).toBeGreaterThan(0);
    expect(priceFarmAuctionProspect(pitcher) - priceFarmAuctionProspect(neutralPitcher)).toBe(subIv.ivBreakdown.angle);
    expect(priceFarmAuctionProspect(pitcher) - priceFarmAuctionProspect(neutralPitcher)).toBe(subIv.ivBase - neutralIv.ivBase);
  });

  test('builds generated prospects as unassigned AuctionPlayer records priced by the MLB path', () => {
    const pool = buildFarmAuctionPool(BASE_INPUT);
    const hitter = pool.prospects.find((prospect) => !['SP', 'SP/RP', 'RP', 'CP'].includes(prospect.primaryPosition));
    const pitcher = pool.prospects.find((prospect) => ['SP', 'SP/RP', 'RP', 'CP'].includes(prospect.primaryPosition));

    expect(hitter).toBeDefined();
    expect(pitcher).toBeDefined();
    expect(pool.prospects.every((prospect) => prospect.leagueAssignments.length === 0)).toBe(true);

    for (const prospect of [hitter!, pitcher!]) {
      const auctionPlayer = pool.auctionPlayers.find((player) => player.playerId === prospect.id);
      const expectedIv = calculateIvBaseSalary(expectedSalaryPlayer(prospect)).ivBase;

      expect(auctionPlayer).toBeDefined();
      expect(auctionPlayer?.iv).toBe(expectedIv);
      expect(auctionPlayer?.iv).toBeGreaterThan(0);
    }
  });

  test('computes IV percentiles in range, monotonic by IV, with the top unique IV at 100', () => {
    const pool = buildFarmAuctionPool(BASE_INPUT);
    const sorted = [...pool.auctionPlayers].sort((left, right) =>
      left.iv - right.iv || left.playerId.localeCompare(right.playerId),
    );

    for (const player of sorted) {
      expect(player.ivPercentile).toBeGreaterThanOrEqual(0);
      expect(player.ivPercentile).toBeLessThanOrEqual(100);
    }
    for (let index = 1; index < sorted.length; index += 1) {
      expect(sorted[index].ivPercentile).toBeGreaterThanOrEqual(sorted[index - 1].ivPercentile);
    }
    expect(sorted.at(-1)?.ivPercentile).toBeCloseTo(100, 10);
  });

  test('is deterministic for the same seed, including ids, IVs, and order', () => {
    const first = buildFarmAuctionPool(BASE_INPUT);
    const second = buildFarmAuctionPool(BASE_INPUT);

    expect(serializePool(second)).toEqual(serializePool(first));
  });

  test('uses 10 farm slots times teamCount times poolMultiplier for pool size', () => {
    const pool = buildFarmAuctionPool({
      ...BASE_INPUT,
      teamCount: 3,
      poolMultiplier: 4,
    });

    expect(pool.prospects).toHaveLength(10 * 3 * 4);
    expect(pool.auctionPlayers).toHaveLength(10 * 3 * 4);
  });
});
