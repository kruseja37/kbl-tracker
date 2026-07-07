import { describe, expect, test } from 'vitest';

import {
  ALGORITHM_VERSION,
  OPTIMIZER_CONSTANTS_VERSION,
  SCOUT_DECISION_WPA_DIVISOR,
  SCOUT_THRESHOLD_KBL_WPA,
  evaluateScoutMove,
  type ScoutDecisionContext,
  type ScoutPlayer,
} from '../scoutMove';
import { computeTrueValue } from '../trueValue';

function batter(overrides: Partial<ScoutPlayer> = {}): ScoutPlayer {
  return {
    playerId: 'player',
    playerName: 'Player',
    bats: 'R',
    primaryPosition: 'SS',
    currentPosition: 'SS',
    secondaryPosition: undefined,
    power: 50,
    contact: 50,
    speed: 50,
    fielding: 50,
    arm: 50,
    mojo: 'Normal',
    fitness: 'FIT',
    traits: [],
    ...overrides,
  };
}

function pitcher(overrides: Partial<ScoutPlayer> = {}): ScoutPlayer {
  return {
    playerId: 'pitcher',
    playerName: 'Pitcher',
    bats: 'R',
    primaryPosition: 'SP',
    currentPosition: 'SP',
    pitcherRole: 'SP',
    power: 10,
    contact: 10,
    speed: 20,
    fielding: 50,
    arm: 50,
    velocity: 50,
    junk: 50,
    accuracy: 50,
    mojo: 'Normal',
    fitness: 'FIT',
    traits: [],
    ...overrides,
  };
}

function context(overrides: Partial<ScoutDecisionContext> = {}): ScoutDecisionContext {
  return {
    decisionType: 'defensive_replacement',
    gameId: 'game-1',
    inning: 7,
    half: 'top',
    outs: 1,
    totalInnings: 9,
    leverageIndex: 1,
    count: { balls: 1, strikes: 1 },
    basesOccupied: { first: true, second: false, third: false },
    scoreDifferentialForFieldingTeam: 0,
    battingTeamId: 'away',
    fieldingTeamId: 'home',
    incumbent: batter({ playerId: 'incumbent', playerName: 'Incumbent' }),
    candidates: [],
    opposingPitcher: pitcher({ playerId: 'opp-p', playerName: 'Opposing Pitcher', throws: 'R' }),
    opposingBatter: batter({ playerId: 'opp-b', playerName: 'Opposing Batter', bats: 'R' }),
    ...overrides,
  };
}

describe('evaluateScoutMove SCOUT-1', () => {
  test('recommends a clearly better defensive replacement by kbl-WPA true-value gain', () => {
    const clearUpgrade = batter({
      playerId: 'glove-star',
      playerName: 'Glove Star',
      power: 82,
      contact: 86,
      speed: 80,
      fielding: 96,
      arm: 92,
    });
    const evalResult = evaluateScoutMove(context({
      leverageIndex: 1.8,
      incumbent: batter({
        playerId: 'weak-glove',
        playerName: 'Weak Glove',
        power: 30,
        contact: 32,
        speed: 35,
        fielding: 20,
        arm: 25,
      }),
      candidates: [
        batter({ playerId: 'bench-depth', playerName: 'Bench Depth', power: 40, contact: 42, fielding: 45 }),
        clearUpgrade,
      ],
    }));

    expect(evalResult.algorithmVersion).toBe(ALGORITHM_VERSION);
    expect(evalResult.optimizerConstantsVersion).toBe(OPTIMIZER_CONSTANTS_VERSION);
    expect(evalResult.bestMoveKblWpaGain).toBeGreaterThan(0);
    expect(evalResult.recommend).toBe(true);
    expect(evalResult.rankedCandidates[0].candidateId).toBe('glove-star');
    expect(evalResult.bestCandidateId).toBe('glove-star');
  });

  test('returns populated rankings but no recommendation when every option is worse', () => {
    const evalResult = evaluateScoutMove(context({
      incumbent: batter({
        playerId: 'star-incumbent',
        playerName: 'Star Incumbent',
        power: 90,
        contact: 90,
        speed: 82,
        fielding: 92,
        arm: 88,
      }),
      candidates: [
        batter({ playerId: 'bad-option', playerName: 'Bad Option', power: 20, contact: 20, fielding: 20 }),
        batter({ playerId: 'least-bad', playerName: 'Least Bad', power: 55, contact: 55, fielding: 45 }),
      ],
    }));

    expect(evalResult.recommend).toBe(false);
    expect(evalResult.bestMoveKblWpaGain).toBeLessThanOrEqual(0);
    expect(evalResult.rankedCandidates).toHaveLength(2);
    expect(evalResult.bestCandidateId).toBe('least-bad');
  });

  test('guarantees nonnegative gain whenever recommend is true', () => {
    const evalResult = evaluateScoutMove(context({
      leverageIndex: 2,
      incumbent: batter({ playerId: 'inc', playerName: 'Inc', power: 20, contact: 20, fielding: 20 }),
      candidates: [batter({ playerId: 'upgrade', playerName: 'Upgrade', power: 95, contact: 95, fielding: 95, arm: 95 })],
    }));

    expect(evalResult.recommend).toBe(true);
    expect(evalResult.bestMoveKblWpaGain).toBeGreaterThanOrEqual(0);
  });

  test('scales linearly with intrinsic leverage index and applies no second multiplier', () => {
    const incumbent = batter({ playerId: 'inc', playerName: 'Inc', power: 45, contact: 45, fielding: 45 });
    const upgrade = batter({ playerId: 'up', playerName: 'Up', power: 76, contact: 76, fielding: 76, arm: 76 });
    const lowLeverage = evaluateScoutMove(context({ leverageIndex: 1, incumbent, candidates: [upgrade] }));
    const highLeverage = evaluateScoutMove(context({ leverageIndex: 2, incumbent, candidates: [upgrade] }));
    // Wide spread crosses what used to be a pressure-band boundary — proves leverage is applied EXACTLY
    // once (no double-count via pressure→effectiveRatings): the gain stays perfectly linear in leverage.
    const extremeLeverage = evaluateScoutMove(context({ leverageIndex: 6, incumbent, candidates: [upgrade] }));

    expect(highLeverage.bestMoveKblWpaGain).toBeCloseTo(lowLeverage.bestMoveKblWpaGain * 2, 8);
    expect(extremeLeverage.bestMoveKblWpaGain).toBeCloseTo(lowLeverage.bestMoveKblWpaGain * 6, 8);
  });

  test('uses the true-value fielding yardstick for a glove-up defensive replacement', () => {
    const incumbent = batter({
      playerId: 'neutral-glove',
      playerName: 'Neutral Glove',
      power: 55,
      contact: 55,
      speed: 55,
      fielding: 50,
      arm: 55,
    });
    const gloveUp = batter({
      playerId: 'glove-up',
      playerName: 'Glove Up',
      power: 55,
      contact: 55,
      speed: 55,
      fielding: 95,
      arm: 95,
    });
    const fieldingTerm = computeTrueValue(
      { kblIV: 100_000, traits: [], fielding: 95, isPitcher: false },
      {},
    );

    const evalResult = evaluateScoutMove(context({ incumbent, candidates: [gloveUp] }));

    expect(fieldingTerm.fieldingAdjustment).toBeGreaterThan(0);
    expect(evalResult.bestMoveKblWpaGain).toBeGreaterThan(0);
    expect(evalResult.bestCandidateId).toBe('glove-up');
  });

  test('prices pitcher_change through pitcher IV while true-value fielding correction stays zero', () => {
    const incumbent = pitcher({
      playerId: 'current-sp',
      playerName: 'Current SP',
      velocity: 42,
      junk: 42,
      accuracy: 42,
      fielding: 10,
    });
    const upgrade = pitcher({
      playerId: 'better-sp',
      playerName: 'Better SP',
      velocity: 88,
      junk: 84,
      accuracy: 86,
      fielding: 95,
    });
    const pitcherTrueValue = computeTrueValue(
      { kblIV: 100_000, traits: [], fielding: 95, isPitcher: true },
      {},
    );

    const evalResult = evaluateScoutMove(context({
      decisionType: 'pitcher_change',
      incumbent,
      candidates: [upgrade],
    }));

    expect(pitcherTrueValue.fieldingAdjustment).toBe(0);
    expect(evalResult.bestMoveKblWpaGain).toBeGreaterThan(0);
    expect(evalResult.bestCandidateId).toBe('better-sp');
  });

  test('breaks identical-score ties by candidateName then candidateId deterministically', () => {
    const tied = [
      batter({ playerId: 'beta', playerName: 'Beta' }),
      batter({ playerId: 'alpha-2', playerName: 'Alpha' }),
      batter({ playerId: 'alpha-1', playerName: 'Alpha' }),
    ];

    const evalResult = evaluateScoutMove(context({ candidates: tied }));

    expect(evalResult.rankedCandidates.map((candidate) => candidate.candidateId)).toEqual([
      'alpha-1',
      'alpha-2',
      'beta',
    ]);
  });

  test('is complete for empty candidates without throwing', () => {
    const evalResult = evaluateScoutMove(context({ candidates: [] }));

    expect(evalResult.recommend).toBe(false);
    expect(evalResult.bestCandidateId).toBeNull();
    expect(evalResult.bestCandidateName).toBeNull();
    expect(evalResult.bestMoveKblWpaGain).toBe(0);
    expect(evalResult.rankedCandidates).toEqual([]);
    expect(evalResult.thresholdKblWpa).toBe(SCOUT_THRESHOLD_KBL_WPA.defensive_replacement);
  });

  test('returns byte-identical JSON for identical contexts', () => {
    const input = context({
      leverageIndex: 1.4,
      candidates: [
        batter({ playerId: 'a', playerName: 'A', power: 70, contact: 70, fielding: 70 }),
        batter({ playerId: 'b', playerName: 'B', power: 60, contact: 60, fielding: 60 }),
      ],
    });

    expect(JSON.stringify(evaluateScoutMove(input))).toBe(JSON.stringify(evaluateScoutMove(input)));
  });

  test('exports the provisional WPA conversion constants', () => {
    expect(SCOUT_DECISION_WPA_DIVISOR).toBe(1_000_000);
    expect(SCOUT_THRESHOLD_KBL_WPA.pitcher_change).toBeGreaterThan(0);
    expect(SCOUT_THRESHOLD_KBL_WPA.pinch_hit).toBeGreaterThan(0);
    expect(SCOUT_THRESHOLD_KBL_WPA.defensive_replacement).toBeGreaterThan(0);
  });
});
