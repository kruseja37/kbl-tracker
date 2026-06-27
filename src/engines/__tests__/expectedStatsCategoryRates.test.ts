import { describe, expect, test } from 'vitest';

import {
  toExpectedStatsCategoryRates,
  type CategoryRateResult,
} from '../expectedStatsCategoryRates';
import type { ExpectedStatsCategory } from '../expectedStatsEngine';
import type {
  PlayerSeasonBatting,
  PlayerSeasonFielding,
  PlayerSeasonPitching,
} from '../../utils/seasonStorage';

const HITTER_LIVE_CATEGORIES: ExpectedStatsCategory[] = [
  'powerSlugging',
  'powerHomeRunRate',
  'contactAvoidStrikeoutRate',
  'contactQualityRate',
  'speedStealTripleRate',
  'speedBaserunningRate',
  'fieldingFieldingPct',
  'fieldingRangeRate',
];

const PITCHER_LIVE_CATEGORIES: ExpectedStatsCategory[] = [
  'pitchingStrikeoutRate',
  'pitchingWalkAvoidanceRate',
  'pitchingHomeRunSuppressionRate',
  'pitchingWeakContactRate',
];

const DORMANT_CATEGORIES: ExpectedStatsCategory[] = [
  'armThrowingRate',
  'fieldingAvoidErrorRate',
];

const baseBatting = (overrides: Partial<PlayerSeasonBatting> = {}): PlayerSeasonBatting => ({
  seasonId: 'season-1',
  playerId: 'hitter-1',
  playerName: 'Hitter One',
  teamId: 'team-a',
  games: 20,
  pa: 0,
  ab: 0,
  hits: 0,
  singles: 0,
  doubles: 0,
  triples: 0,
  homeRuns: 0,
  rbi: 0,
  runs: 0,
  walks: 0,
  strikeouts: 0,
  hitByPitch: 0,
  sacFlies: 0,
  sacBunts: 0,
  stolenBases: 0,
  caughtStealing: 0,
  gidp: 0,
  fameBonuses: 0,
  fameBoners: 0,
  fameNet: 0,
  lastUpdated: 1,
  ...overrides,
});

const baseFielding = (overrides: Partial<PlayerSeasonFielding> = {}): PlayerSeasonFielding => ({
  seasonId: 'season-1',
  playerId: 'hitter-1',
  playerName: 'Hitter One',
  teamId: 'team-a',
  games: 0,
  putouts: 0,
  assists: 0,
  errors: 0,
  doublePlays: 0,
  gamesByPosition: {},
  putoutsByPosition: {},
  assistsByPosition: {},
  errorsByPosition: {},
  lastUpdated: 1,
  ...overrides,
});

const basePitching = (overrides: Partial<PlayerSeasonPitching> = {}): PlayerSeasonPitching => ({
  seasonId: 'season-1',
  playerId: 'pitcher-1',
  playerName: 'Pitcher One',
  teamId: 'team-a',
  games: 10,
  gamesStarted: 4,
  outsRecorded: 0,
  hitsAllowed: 0,
  runsAllowed: 0,
  earnedRuns: 0,
  walksAllowed: 0,
  strikeouts: 0,
  homeRunsAllowed: 0,
  hitBatters: 0,
  wildPitches: 0,
  wins: 0,
  losses: 0,
  saves: 0,
  holds: 0,
  blownSaves: 0,
  qualityStarts: 0,
  completeGames: 0,
  shutouts: 0,
  noHitters: 0,
  perfectGames: 0,
  fameBonuses: 0,
  fameBoners: 0,
  fameNet: 0,
  lastUpdated: 1,
  ...overrides,
});

function expectCategoriesAbsent(
  result: CategoryRateResult,
  categories: ExpectedStatsCategory[],
): void {
  for (const category of categories) {
    expect(category in result.actualByCat).toBe(false);
    expect(category in result.sampleSizeByCat).toBe(false);
  }
}

describe('expectedStatsCategoryRates RA-2a adapter', () => {
  test('maps a full hitter season row to hand-worked live rates and samples', () => {
    const result = toExpectedStatsCategoryRates({
      role: 'hitter',
      batting: baseBatting({
        pa: 120,
        ab: 100,
        hits: 30,
        singles: 18,
        doubles: 7,
        triples: 2,
        homeRuns: 3,
        walks: 12,
        strikeouts: 20,
        hitByPitch: 5,
        sacFlies: 3,
        stolenBases: 8,
      }),
      fielding: baseFielding({
        games: 25,
        putouts: 40,
        assists: 35,
        errors: 5,
        difficultyWeightedConversion: 2.25,
        difficultyFieldingOpportunities: 5,
      }),
    });

    expect(result.actualByCat.powerSlugging).toBeCloseTo(0.500, 10);
    expect(result.actualByCat.powerHomeRunRate).toBeCloseTo(3 / 120, 10);
    expect(result.actualByCat.contactAvoidStrikeoutRate).toBeCloseTo(1 - (20 / 120), 10);
    expect(result.actualByCat.speedStealTripleRate).toBeCloseTo(10 / 120, 10);
    expect(result.actualByCat.fieldingFieldingPct).toBeCloseTo(75 / 80, 10);
    expect(result.actualByCat.fieldingRangeRate).toBeCloseTo(2.25 / 5, 10);

    expect(result.sampleSizeByCat).toEqual({
      powerSlugging: 120,
      powerHomeRunRate: 120,
      contactAvoidStrikeoutRate: 120,
      contactQualityRate: 0,
      speedStealTripleRate: 10,
      speedBaserunningRate: 0,
      fieldingFieldingPct: 80,
      fieldingRangeRate: 5,
    });
  });

  test('uses speed events as the speed sample while keeping the SB+3B per-PA actual', () => {
    const result = toExpectedStatsCategoryRates({
      role: 'hitter',
      batting: baseBatting({
        pa: 50,
        ab: 45,
        hits: 12,
        triples: 2,
        stolenBases: 3,
        caughtStealing: 1,
      }),
    });

    expect(result.sampleSizeByCat.speedStealTripleRate).toBe(6);
    expect(result.actualByCat.speedStealTripleRate).toBeCloseTo(5 / 50, 10);
  });

  test('maps baserunning advancement counts to hitter actual and sample', () => {
    const result = toExpectedStatsCategoryRates({
      role: 'hitter',
      batting: baseBatting({
        advancementOpportunities: 10,
        extraBasesTaken: 4,
      }),
    });

    expect(result.sampleSizeByCat.speedBaserunningRate).toBe(10);
    expect(result.actualByCat.speedBaserunningRate).toBeCloseTo(0.4, 10);
  });

  test('omits baserunning advancement actual when advancement opportunities are zero', () => {
    const result = toExpectedStatsCategoryRates({
      role: 'hitter',
      batting: baseBatting({
        advancementOpportunities: 0,
        extraBasesTaken: 4,
      }),
    });

    expect(result.sampleSizeByCat.speedBaserunningRate).toBe(0);
    expect('speedBaserunningRate' in result.actualByCat).toBe(false);
  });

  test('maps a full pitcher season row to hand-worked live rates and samples', () => {
    const result = toExpectedStatsCategoryRates({
      role: 'pitcher',
      pitching: basePitching({
        games: 8,
        gamesStarted: 4,
        outsRecorded: 90,
        hitsAllowed: 24,
        walksAllowed: 9,
        strikeouts: 36,
        homeRunsAllowed: 4,
        hitBatters: 3,
      }),
    });
    const battersFaced = 90 + 24 + 9 + 3;

    expect(result.actualByCat.pitchingStrikeoutRate).toBeCloseTo(36 / battersFaced, 10);
    expect(result.actualByCat.pitchingWalkAvoidanceRate).toBeCloseTo(1 - (9 / battersFaced), 10);
    expect(result.actualByCat.pitchingHomeRunSuppressionRate).toBeCloseTo(1 - (4 / battersFaced), 10);

    expect(result.sampleSizeByCat).toEqual({
      pitchingStrikeoutRate: battersFaced,
      pitchingWalkAvoidanceRate: battersFaced,
      pitchingHomeRunSuppressionRate: battersFaced,
      pitchingWeakContactRate: 0,
    });
  });

  test('maps pitcher batting and fielding rows to non-pitching rates without arm', () => {
    const result = toExpectedStatsCategoryRates({
      role: 'pitcher',
      batting: baseBatting({
        pa: 40,
        ab: 35,
        hits: 12,
        singles: 5,
        doubles: 4,
        triples: 1,
        homeRuns: 2,
        walks: 3,
        strikeouts: 6,
        hitByPitch: 1,
        stolenBases: 3,
        caughtStealing: 1,
        contactQualityGood: 9,
        contactQualityTracked: 15,
        extraBasesTaken: 4,
        advancementOpportunities: 10,
      }),
      pitching: basePitching({
        outsRecorded: 60,
        hitsAllowed: 15,
        walksAllowed: 5,
        strikeouts: 21,
        homeRunsAllowed: 2,
        hitBatters: 1,
        weakContactInduced: 12,
        weakContactTracked: 20,
      }),
      fielding: baseFielding({
        putouts: 10,
        assists: 8,
        errors: 2,
        difficultyWeightedConversion: 7.2,
        difficultyFieldingOpportunities: 9,
      }),
    });
    const battersFaced = 60 + 15 + 5 + 1;

    expect(result.actualByCat.pitchingStrikeoutRate).toBeCloseTo(21 / battersFaced, 10);
    expect(result.actualByCat.pitchingWalkAvoidanceRate).toBeCloseTo(1 - (5 / battersFaced), 10);
    expect(result.actualByCat.pitchingHomeRunSuppressionRate).toBeCloseTo(1 - (2 / battersFaced), 10);
    expect(result.actualByCat.pitchingWeakContactRate).toBeCloseTo(12 / 20, 10);
    expect(result.actualByCat.powerSlugging).toBeCloseTo(24 / 35, 10);
    expect(result.actualByCat.powerHomeRunRate).toBeCloseTo(2 / 40, 10);
    expect(result.actualByCat.contactAvoidStrikeoutRate).toBeCloseTo(1 - (6 / 40), 10);
    expect(result.actualByCat.contactQualityRate).toBeCloseTo(9 / 15, 10);
    expect(result.actualByCat.speedStealTripleRate).toBeCloseTo(4 / 40, 10);
    expect(result.actualByCat.speedBaserunningRate).toBeCloseTo(4 / 10, 10);
    expect(result.actualByCat.fieldingFieldingPct).toBeCloseTo(18 / 20, 10);
    expect(result.actualByCat.fieldingRangeRate).toBeCloseTo(7.2 / 9, 10);

    expect(result.sampleSizeByCat).toEqual({
      pitchingStrikeoutRate: battersFaced,
      pitchingWalkAvoidanceRate: battersFaced,
      pitchingHomeRunSuppressionRate: battersFaced,
      pitchingWeakContactRate: 20,
      powerSlugging: 40,
      powerHomeRunRate: 40,
      contactAvoidStrikeoutRate: 40,
      contactQualityRate: 15,
      speedStealTripleRate: 5,
      speedBaserunningRate: 10,
      fieldingFieldingPct: 20,
      fieldingRangeRate: 9,
    });
    expectCategoriesAbsent(result, DORMANT_CATEGORIES);
  });

  test('omits all actual rates for a zero-PA hitter while emitting zero samples', () => {
    const result = toExpectedStatsCategoryRates({
      role: 'hitter',
      batting: baseBatting(),
      fielding: baseFielding(),
    });

    expect(result.actualByCat).toEqual({});
    expect(result.sampleSizeByCat).toEqual({
      powerSlugging: 0,
      powerHomeRunRate: 0,
      contactAvoidStrikeoutRate: 0,
      contactQualityRate: 0,
      speedStealTripleRate: 0,
      speedBaserunningRate: 0,
      fieldingFieldingPct: 0,
      fieldingRangeRate: 0,
    });
  });

  test('maps contact-quality season counts to hitter actual and sample', () => {
    const result = toExpectedStatsCategoryRates({
      role: 'hitter',
      batting: baseBatting({
        pa: 120,
        ab: 100,
        hits: 30,
        contactQualityGood: 30,
        contactQualityTracked: 60,
      }),
    });

    expect(result.actualByCat.contactQualityRate).toBeCloseTo(0.5, 10);
    expect(result.sampleSizeByCat.contactQualityRate).toBe(60);
  });

  test('maps weak-contact season counts to pitcher actual and sample', () => {
    const result = toExpectedStatsCategoryRates({
      role: 'pitcher',
      pitching: basePitching({
        outsRecorded: 90,
        weakContactInduced: 25,
        weakContactTracked: 50,
      }),
    });

    expect(result.actualByCat.pitchingWeakContactRate).toBeCloseTo(0.5, 10);
    expect(result.sampleSizeByCat.pitchingWeakContactRate).toBe(50);
  });

  test('never emits dormant category keys in actual or sample maps', () => {
    const hitter = toExpectedStatsCategoryRates({
      role: 'hitter',
      batting: baseBatting({ pa: 20, ab: 18, hits: 6, singles: 4, doubles: 1, homeRuns: 1 }),
      fielding: baseFielding({ games: 5, putouts: 8, assists: 4, errors: 1 }),
    });
    const pitcher = toExpectedStatsCategoryRates({
      role: 'pitcher',
      batting: baseBatting({ pa: 20, ab: 18, hits: 6, singles: 4, doubles: 1, homeRuns: 1 }),
      pitching: basePitching({
        outsRecorded: 30,
        hitsAllowed: 9,
        walksAllowed: 4,
        strikeouts: 12,
        homeRunsAllowed: 1,
      }),
      fielding: baseFielding({ games: 5, putouts: 8, assists: 4, errors: 1 }),
    });

    expectCategoriesAbsent(hitter, DORMANT_CATEGORIES);
    expectCategoriesAbsent(pitcher, DORMANT_CATEGORIES);
  });

  test('hitter ignores pitching rows while pitcher combines pitching with non-pitching rows', () => {
    const hitter = toExpectedStatsCategoryRates({
      role: 'hitter',
      batting: baseBatting({ pa: 20, ab: 18, hits: 6, singles: 4, doubles: 1, homeRuns: 1 }),
      pitching: basePitching({ outsRecorded: 30, strikeouts: 12 }),
      fielding: baseFielding({ games: 5, putouts: 8, assists: 4, errors: 1 }),
    });
    const pitcher = toExpectedStatsCategoryRates({
      role: 'pitcher',
      batting: baseBatting({ pa: 20, ab: 18, hits: 6, singles: 4, doubles: 1, homeRuns: 1 }),
      pitching: basePitching({ outsRecorded: 30, hitsAllowed: 9, walksAllowed: 4, strikeouts: 12 }),
      fielding: baseFielding({ games: 5, putouts: 8, assists: 4, errors: 1 }),
    });

    expectCategoriesAbsent(hitter, PITCHER_LIVE_CATEGORIES);
    for (const category of [...PITCHER_LIVE_CATEGORIES, ...HITTER_LIVE_CATEGORIES]) {
      expect(category in pitcher.sampleSizeByCat).toBe(true);
    }
    expectCategoriesAbsent(pitcher, DORMANT_CATEGORIES);
  });
});
