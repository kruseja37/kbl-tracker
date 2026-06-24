/**
 * RA-2a season-row -> expected-stats category-rate adapter.
 *
 * Dormant/null-gated categories from RATINGS_ADJUSTMENT_SPEC §3B +
 * DECISIONS_LOG 2026-06-23 RA-2:
 * - armThrowingRate: RA-8 catcher caught-stealing season fields are not stored yet.
 * - pitcher non-pitching power/contact/speed/fielding categories: RA-11/B14 co-design.
 * - speedBaserunningRate: steal-attempts+triples is the speedStealTripleRate
 *   sample; UBR/baserunning-advancement is RA-2c-3 and still dormant.
 * - fieldingAvoidErrorRate: collinear with fieldingFieldingPct, folded for v1.
 *
 * RA-2CQ-2c: contactQualityRate and pitchingWeakContactRate are live from
 * RA-2CQ-2a season counts.
 */

import { calculateFIP } from './pwarCalculator';
import type { ExpectedStatsCategory } from './expectedStatsEngine';
import {
  calcBattingAvg,
  calcOBP,
  calcSLG,
  type PlayerSeasonBatting,
  type PlayerSeasonFielding,
  type PlayerSeasonPitching,
} from '../utils/seasonStorage';

export interface CategoryRateInput {
  role: 'hitter' | 'pitcher';
  batting?: PlayerSeasonBatting;
  pitching?: PlayerSeasonPitching;
  fielding?: PlayerSeasonFielding;
}

export interface CategoryRateResult {
  actualByCat: Partial<Record<ExpectedStatsCategory, number>>;
  sampleSizeByCat: Partial<Record<ExpectedStatsCategory, number>>;
}

const setSample = (
  sampleSizeByCat: Partial<Record<ExpectedStatsCategory, number>>,
  category: ExpectedStatsCategory,
  sampleSize: number,
): void => {
  sampleSizeByCat[category] = sampleSize;
};

const emitActual = (
  actualByCat: Partial<Record<ExpectedStatsCategory, number>>,
  category: ExpectedStatsCategory,
  value: number,
): void => {
  actualByCat[category] = value;
};

function addHitterRates(
  result: CategoryRateResult,
  batting?: PlayerSeasonBatting,
  fielding?: PlayerSeasonFielding,
): void {
  const battingSample = batting?.pa ?? 0;

  setSample(result.sampleSizeByCat, 'powerIso', battingSample);
  setSample(result.sampleSizeByCat, 'powerSlugging', battingSample);
  setSample(result.sampleSizeByCat, 'powerHomeRunRate', battingSample);
  setSample(result.sampleSizeByCat, 'contactAverage', battingSample);
  setSample(result.sampleSizeByCat, 'contactOnBase', battingSample);
  setSample(result.sampleSizeByCat, 'contactAvoidStrikeoutRate', battingSample);
  setSample(
    result.sampleSizeByCat,
    'speedStealTripleRate',
    (batting?.stolenBases ?? 0) + (batting?.caughtStealing ?? 0) + (batting?.triples ?? 0),
  );
  setSample(result.sampleSizeByCat, 'contactQualityRate', batting?.contactQualityTracked ?? 0);

  if (batting) {
    const battingAverage = calcBattingAvg(batting);
    const slugging = calcSLG(batting);
    const obpDenominator = batting.ab + batting.walks + batting.hitByPitch + batting.sacFlies;

    if (batting.ab > 0) {
      emitActual(result.actualByCat, 'powerIso', slugging - battingAverage);
      emitActual(result.actualByCat, 'powerSlugging', slugging);
      emitActual(result.actualByCat, 'contactAverage', battingAverage);
    }
    if (obpDenominator > 0) {
      emitActual(result.actualByCat, 'contactOnBase', calcOBP(batting));
    }
    if (batting.pa > 0) {
      emitActual(result.actualByCat, 'powerHomeRunRate', batting.homeRuns / batting.pa);
      emitActual(
        result.actualByCat,
        'contactAvoidStrikeoutRate',
        1 - (batting.strikeouts / batting.pa),
      );
      emitActual(
        result.actualByCat,
        'speedStealTripleRate',
        (batting.stolenBases + batting.triples) / batting.pa,
      );
    }
    const contactQualityTracked = batting.contactQualityTracked ?? 0;
    if (contactQualityTracked > 0) {
      emitActual(
        result.actualByCat,
        'contactQualityRate',
        (batting.contactQualityGood ?? 0) / contactQualityTracked,
      );
    }
  }

  const chances = fielding ? fielding.putouts + fielding.assists + fielding.errors : 0;
  setSample(result.sampleSizeByCat, 'fieldingFieldingPct', chances);
  setSample(result.sampleSizeByCat, 'fieldingRangeRate', chances);

  if (fielding) {
    if (chances > 0) {
      emitActual(
        result.actualByCat,
        'fieldingFieldingPct',
        (fielding.putouts + fielding.assists) / chances,
      );
    }
    if (fielding.games > 0) {
      emitActual(
        result.actualByCat,
        'fieldingRangeRate',
        (fielding.putouts + fielding.assists) / fielding.games,
      );
    }
  }
}

function addPitcherRates(
  result: CategoryRateResult,
  pitching?: PlayerSeasonPitching,
): void {
  const battersFaced =
    pitching
      ? pitching.outsRecorded + pitching.hitsAllowed + pitching.walksAllowed + pitching.hitBatters
      : 0;
  const outsRecorded = pitching?.outsRecorded ?? 0;

  setSample(result.sampleSizeByCat, 'pitchingStrikeoutRate', battersFaced);
  setSample(result.sampleSizeByCat, 'pitchingWalkAvoidanceRate', battersFaced);
  setSample(result.sampleSizeByCat, 'pitchingHomeRunSuppressionRate', battersFaced);
  setSample(result.sampleSizeByCat, 'pitchingFipPrevention', outsRecorded);
  setSample(result.sampleSizeByCat, 'pitchingWeakContactRate', pitching?.weakContactTracked ?? 0);

  if (!pitching) {
    return;
  }

  if (battersFaced > 0) {
    emitActual(result.actualByCat, 'pitchingStrikeoutRate', pitching.strikeouts / battersFaced);
    emitActual(
      result.actualByCat,
      'pitchingWalkAvoidanceRate',
      1 - (pitching.walksAllowed / battersFaced),
    );
    emitActual(
      result.actualByCat,
      'pitchingHomeRunSuppressionRate',
      1 - (pitching.homeRunsAllowed / battersFaced),
    );
  }

  const ip = pitching.outsRecorded / 3;
  if (ip > 0) {
    const fip = calculateFIP({
      ip,
      strikeouts: pitching.strikeouts,
      walks: pitching.walksAllowed,
      hitByPitch: pitching.hitBatters,
      homeRunsAllowed: pitching.homeRunsAllowed,
      gamesStarted: pitching.gamesStarted,
      gamesAppeared: pitching.games,
    });

    if (fip > 0) {
      emitActual(result.actualByCat, 'pitchingFipPrevention', 1 / fip);
    }
  }

  const weakContactTracked = pitching.weakContactTracked ?? 0;
  if (weakContactTracked > 0) {
    emitActual(
      result.actualByCat,
      'pitchingWeakContactRate',
      (pitching.weakContactInduced ?? 0) / weakContactTracked,
    );
  }
}

export function toExpectedStatsCategoryRates(input: CategoryRateInput): CategoryRateResult {
  const result: CategoryRateResult = {
    actualByCat: {},
    sampleSizeByCat: {},
  };

  if (input.role === 'hitter') {
    addHitterRates(result, input.batting, input.fielding);
  } else {
    addPitcherRates(result, input.pitching);
  }

  return result;
}
