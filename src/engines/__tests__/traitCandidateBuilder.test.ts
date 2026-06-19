import { describe, expect, it } from 'vitest';
import { activeTraitNames } from '../effectiveRatings';
import {
  BUILDABLE_TRAITS,
  computeSeasonTraitCandidates,
  reconstructAtBatContext,
  type AtBatContextRunningState,
  type SeasonTraitCandidate,
  type SeasonTraitCandidateInput,
  type SeasonTraitPlayer,
} from '../traitCandidateBuilder';
import { CANONICAL_TRAIT_NAMES } from '../traitRealityScorer';
import { computeTraitAcquisition } from '../traitAcquisition';
import { calculateWOBA } from '../bwarCalculator';
import type { Smb4Grade } from '../smb4GradeEmulator';
import type { EffectiveRatingsPlayer, GameContext } from '../effectiveRatings';
import type { AtBatEvent, BetweenPlayEvent, FieldingEvent, RunnerState } from '../../utils/eventLog';
import type { AtBatResult } from '../../types/game';

const noRunners: RunnerState = { first: null, second: null, third: null };

function runners(bases: Array<'first' | 'second' | 'third'>): RunnerState {
  return {
    first: bases.includes('first') ? { runnerId: 'r1', runnerName: 'R1', responsiblePitcherId: 'p1' } : null,
    second: bases.includes('second') ? { runnerId: 'r2', runnerName: 'R2', responsiblePitcherId: 'p1' } : null,
    third: bases.includes('third') ? { runnerId: 'r3', runnerName: 'R3', responsiblePitcherId: 'p1' } : null,
  };
}

let abIndex = 0;
function atBat(overrides: Partial<AtBatEvent> = {}): AtBatEvent {
  abIndex += 1;
  return {
    eventId: `ab-${abIndex}`,
    gameId: 'g1',
    eventIndex: abIndex,
    timestamp: abIndex,
    batterId: 'b1',
    batterName: 'Batter 1',
    batterTeamId: 'away',
    pitcherId: 'p1',
    pitcherName: 'Pitcher 1',
    pitcherTeamId: 'home',
    result: 'GO',
    rbiCount: 0,
    runsScored: [],
    inning: 1,
    halfInning: 'TOP',
    outs: 0,
    runners: noRunners,
    awayScore: 0,
    homeScore: 0,
    outsAfter: 1,
    runnersAfter: noRunners,
    awayScoreAfter: 0,
    homeScoreAfter: 0,
    leverageIndex: 1,
    winProbabilityBefore: 0.5,
    winProbabilityAfter: 0.5,
    wpa: 0,
    ballInPlay: null,
    fameEvents: [],
    isLeadoff: false,
    isClutch: false,
    isWalkOff: false,
    ...overrides,
  } as AtBatEvent;
}

let bpIndex = 0;
function steal(runnerId: string, isSuccessful: boolean, overrides: Partial<BetweenPlayEvent> = {}): BetweenPlayEvent {
  bpIndex += 1;
  return {
    eventId: `bp-${bpIndex}`,
    gameId: 'g1',
    timestamp: bpIndex,
    eventIndex: bpIndex,
    type: 'stolen_base',
    stolenBase: { runnerId, isSuccessful },
    ...overrides,
  } as unknown as BetweenPlayEvent;
}

function passedBall(pitcherId: string, overrides: Partial<BetweenPlayEvent> = {}): BetweenPlayEvent {
  bpIndex += 1;
  return {
    eventId: `bp-${bpIndex}`,
    gameId: 'g1',
    timestamp: bpIndex,
    eventIndex: bpIndex,
    type: 'passed_ball',
    wildPitchOrPassedBall: { wpOrPb: 'passed_ball', pitcherId },
    ...overrides,
  } as unknown as BetweenPlayEvent;
}

let fieldingIndex = 0;
function fielding(overrides: Partial<FieldingEvent> = {}): FieldingEvent {
  fieldingIndex += 1;
  return {
    fieldingEventId: `fe-${fieldingIndex}`,
    gameId: 'g1',
    atBatEventId: `ab-${fieldingIndex}`,
    sequence: fieldingIndex,
    playerId: 'b1',
    playerName: 'Batter 1',
    position: 'CF',
    teamId: 'away',
    playType: 'putout',
    difficulty: 'routine',
    ballInPlay: {
      trajectory: 'fly',
      zone: 1,
      velocity: 'medium',
      fielderIds: ['b1'],
      primaryFielderId: 'b1',
    },
    success: true,
    runsPreventedOrAllowed: 0,
    ...overrides,
  } as FieldingEvent;
}

function baseInput(overrides: Partial<SeasonTraitCandidateInput> = {}): SeasonTraitCandidateInput {
  return {
    players: [],
    atBatEvents: [],
    betweenPlayEvents: [],
    fieldingEvents: [],
    seasonFieldingByPlayer: new Map(),
    injuryCountsByPlayer: new Map(),
    gamesByPlayer: new Map(),
    ...overrides,
  };
}

function candidate(map: Map<string, SeasonTraitCandidate[]>, playerId: string, traitName: string): SeasonTraitCandidate | undefined {
  return map.get(playerId)?.find((item) => item.traitName === traitName);
}

function players(ids: string[], role: SeasonTraitPlayer['role']): SeasonTraitPlayer[] {
  return ids.map((playerId) => ({ playerId, role }));
}

function repeat(count: number, fn: (index: number) => AtBatEvent): AtBatEvent[] {
  return Array.from({ length: count }, (_, index) => fn(index));
}

const probe: EffectiveRatingsPlayer = {
  id: 'probe',
  traits: [
    'Clutch',
    'Choker',
    'RBI Hero',
    'RBI Zero',
    'Rally Stopper',
    'Surrounded',
    'Rally Starter',
    'Meltdown',
    'Pinch Perfect',
  ],
};

describe('BUILDABLE_TRAITS', () => {
  it('contains exactly the v1 buildable canonical set', () => {
    expect(BUILDABLE_TRAITS).toEqual([
      'Clutch',
      'Choker',
      'RBI Hero',
      'RBI Zero',
      'Rally Stopper',
      'Surrounded',
      'Rally Starter',
      'Meltdown',
      'Stealer',
      'Bad Jumps',
      'Pinch Perfect',
      'Butter Fingers',
      'Cannon Arm',
      'Noodle Arm',
      'Durable',
      'Injury Prone',
      // R1-a: clean outcome-proxy traits.
      'K Collector',
      'K Neglector',
      'Whiffer',
      'Tough Out',
      'Easy Target',
      'Slow Poke',
      'Sprinter',
      'Mind Gamer',
      'Pick Officer',
      'Easy Jumps',
      // R1-b1: Big/Little Hack, Base Rounder, Distractor.
      'Big Hack',
      'Little Hack',
      'Base Rounder',
      'Distractor',
      // R1-b2: Utility, Crossed Up, Bunter (Two Way SPLIT out).
      'Utility',
      'Crossed Up',
      'Bunter',
      // R2: pitcher count-family, First-Pitch pair, 6 handedness splits.
      'BB Prone',
      'Composed',
      'Gets Ahead',
      'Falls Behind',
      'First Pitch Slayer',
      'First Pitch Prayer',
      'CON vs LHP',
      'CON vs RHP',
      'POW vs LHP',
      'POW vs RHP',
      'Specialist',
      'Reverse Splits',
      // R1-b3: Two Way earn-signal (pitcher batting wOBA). C/IF/OF family + random
      // position deferred — Two Way (IF)/(OF) intentionally NOT here.
      'Two Way (C)',
      // R3: Ace Exterminator (reached-base rate vs A−+ opposing pitchers).
      'Ace Exterminator',
    ]);
  });

  it('uses only canonical trait names', () => {
    for (const traitName of BUILDABLE_TRAITS) {
      expect(CANONICAL_TRAIT_NAMES.has(traitName)).toBe(true);
    }
  });
});

describe('reconstructAtBatContext', () => {
  it('reconstructs RISP, runner count, bases empty, top/bottom team losing, and pinch-hit status', () => {
    const state: AtBatContextRunningState = { consecutiveBaserunnersAllowedByUnit: new Map() };
    const top = reconstructAtBatContext(
      atBat({
        runners: runners(['first', 'third']),
        halfInning: 'TOP',
        awayScore: 1,
        homeScore: 3,
        isClutch: true,
        batterContext: { playerId: 'b1', playerName: 'B1', enteredAs: 'pinch_hit' },
      }),
      state,
    ) as GameContext;
    expect(top.risp).toBe(true);
    expect(top.runnersOn).toBe(2);
    expect(top.basesEmpty).toBe(false);
    expect(top.teamLosing).toBe(true);
    expect(top.pressure).toBe('high');
    expect(top.isSubstitutionAB).toBe(true);

    const bottom = reconstructAtBatContext(
      atBat({ runners: noRunners, halfInning: 'BOTTOM', awayScore: 4, homeScore: 2 }),
      state,
    ) as GameContext;
    expect(bottom.risp).toBe(false);
    expect(bottom.runnersOn).toBe(0);
    expect(bottom.basesEmpty).toBe(true);
    expect(bottom.teamLosing).toBe(true);
  });

  it('increments consecutive no-out reaches and resets on an out', () => {
    const state: AtBatContextRunningState = { consecutiveBaserunnersAllowedByUnit: new Map() };
    const first = reconstructAtBatContext(atBat({ result: '1B', outsAfter: 0 }), state) as GameContext;
    const second = reconstructAtBatContext(atBat({ result: 'BB', outsAfter: 0 }), state) as GameContext;
    const third = reconstructAtBatContext(atBat({ result: 'GO', outsAfter: 1 }), state) as GameContext;
    const afterReset = reconstructAtBatContext(atBat({ result: '1B', outsAfter: 1 }), state) as GameContext;
    expect(first.consecutiveBaserunnersAllowed).toBe(0);
    expect(second.consecutiveBaserunnersAllowed).toBe(1);
    expect(third.consecutiveBaserunnersAllowed).toBe(2);
    expect(afterReset.consecutiveBaserunnersAllowed).toBe(0);
  });
});

describe('matrix opportunity probe', () => {
  it('surfaces pressure, RISP, two-on, rally starter, pinch, and meltdown opportunities', () => {
    expect(activeTraitNames(probe, {
      pressure: 'high',
      runnersOn: 0,
      risp: false,
      opposingHand: 'R',
      inning: 1,
    })).toEqual(expect.arrayContaining(['Clutch', 'Choker']));
    expect(activeTraitNames(probe, {
      pressure: 'none',
      runnersOn: 1,
      risp: true,
      opposingHand: 'R',
      inning: 1,
    })).toEqual(expect.arrayContaining(['RBI Hero', 'RBI Zero']));
    expect(activeTraitNames(probe, {
      pressure: 'none',
      runnersOn: 2,
      risp: true,
      opposingHand: 'R',
      inning: 1,
    })).toEqual(expect.arrayContaining(['Rally Stopper', 'Surrounded']));
    expect(activeTraitNames(probe, {
      pressure: 'none',
      runnersOn: 0,
      risp: false,
      opposingHand: 'R',
      inning: 1,
      teamLosing: true,
      basesEmpty: true,
      isSubstitutionAB: true,
      consecutiveBaserunnersAllowed: 4,
    })).toEqual(expect.arrayContaining(['Rally Starter', 'Pinch Perfect', 'Meltdown']));
  });
});

describe('at-bat outcome signals', () => {
  it('splits batter Clutch and Choker rates from batting-team WPA direction', () => {
    const events = [
      ...repeat(7, () => atBat({ batterId: 'b1', isClutch: true, battingTeamDelta: 0.1, wpa: 0.1 })),
      ...repeat(3, () => atBat({ batterId: 'b1', isClutch: true, battingTeamDelta: -0.1, wpa: -0.1 })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: events,
    }));
    expect(candidate(result, 'b1', 'Clutch')?.signalValue).toBeCloseTo(0.7, 10);
    expect(candidate(result, 'b1', 'Choker')?.signalValue).toBeCloseTo(0.3, 10);
  });

  it('uses fielding-team delta for pitcher Clutch and Choker', () => {
    const events = [
      ...repeat(6, () => atBat({ pitcherId: 'p1', isClutch: true, fieldingTeamDelta: 0.2, wpa: -0.2 })),
      ...repeat(4, () => atBat({ pitcherId: 'p1', isClutch: true, fieldingTeamDelta: -0.2, wpa: 0.2 })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p1'], 'pitcher'),
      atBatEvents: events,
    }));
    expect(candidate(result, 'p1', 'Clutch')?.signalValue).toBeCloseTo(0.6, 10);
    expect(candidate(result, 'p1', 'Choker')?.signalValue).toBeCloseTo(0.4, 10);
  });

  it('computes RBI Hero and RBI Zero rates from rbiCount', () => {
    const risp = runners(['second']);
    const events = [
      ...repeat(4, () => atBat({ batterId: 'b1', runners: risp, rbiCount: 1 })),
      ...repeat(6, () => atBat({ batterId: 'b1', runners: risp, rbiCount: 0 })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: events,
    }));
    expect(candidate(result, 'b1', 'RBI Hero')?.signalValue).toBeCloseTo(0.4, 10);
    expect(candidate(result, 'b1', 'RBI Zero')?.signalValue).toBeCloseTo(0.6, 10);
  });

  it('computes Rally Starter reach rate', () => {
    const events = [
      ...repeat(3, () => atBat({ batterId: 'b1', halfInning: 'TOP', awayScore: 0, homeScore: 1, result: '1B', outsAfter: 0 })),
      ...repeat(7, () => atBat({ batterId: 'b1', halfInning: 'TOP', awayScore: 0, homeScore: 1, result: 'GO', outsAfter: 1 })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: events,
    }));
    expect(candidate(result, 'b1', 'Rally Starter')?.signalValue).toBeCloseTo(0.3, 10);
  });

  it('computes Pinch Perfect from reach or favorable WPA', () => {
    const events = [
      ...repeat(2, () => atBat({ batterId: 'b1', batterContext: { playerId: 'b1', playerName: 'B1', enteredAs: 'pinch_hit' }, result: '1B', outsAfter: 0 })),
      ...repeat(3, () => atBat({ batterId: 'b1', batterContext: { playerId: 'b1', playerName: 'B1', enteredAs: 'pinch_hit' }, result: 'GO', outsAfter: 1, battingTeamDelta: 0.2 })),
      ...repeat(5, () => atBat({ batterId: 'b1', batterContext: { playerId: 'b1', playerName: 'B1', enteredAs: 'pinch_hit' }, result: 'GO', outsAfter: 1, battingTeamDelta: -0.2 })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: events,
    }));
    expect(candidate(result, 'b1', 'Pinch Perfect')?.signalValue).toBeCloseTo(0.5, 10);
  });

  it('computes Rally Stopper and Surrounded from two-on pitcher outcomes', () => {
    const twoOn = runners(['first', 'second']);
    const events = [
      ...repeat(4, () => atBat({ pitcherId: 'p1', runners: twoOn, result: 'GO', outsAfter: 1, rbiCount: 0, runsScored: [] })),
      ...repeat(6, () => atBat({ pitcherId: 'p1', runners: twoOn, result: '1B', outsAfter: 0, rbiCount: 1, runsScored: ['r2'] })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p1'], 'pitcher'),
      atBatEvents: events,
    }));
    expect(candidate(result, 'p1', 'Rally Stopper')?.signalValue).toBeCloseTo(0.4, 10);
    expect(candidate(result, 'p1', 'Surrounded')?.signalValue).toBeCloseTo(0.6, 10);
  });

  it('computes Meltdown frequency per distinct game/inning/half unit pitched', () => {
    const events = [
      ...repeat(4, () => atBat({ pitcherId: 'p1', result: '1B', outsAfter: 0 })),
      atBat({ pitcherId: 'p1', result: 'BB', outsAfter: 0 }),
      atBat({ pitcherId: 'p1', inning: 2, result: 'GO', outsAfter: 1 }),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p1'], 'pitcher'),
      atBatEvents: events,
    }));
    expect(candidate(result, 'p1', 'Meltdown')?.signalValue).toBeCloseTo(0.5, 10);
    expect(candidate(result, 'p1', 'Meltdown')?.sampleSize).toBe(2);
  });

  it('skips undone at-bat opportunities', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: [
        atBat({ batterId: 'b1', isClutch: true, battingTeamDelta: 0.2, undoneAt: 1 }),
      ],
    }));
    expect(candidate(result, 'b1', 'Clutch')).toBeUndefined();
  });
});

describe('direct-source signals', () => {
  it('computes Stealer and Bad Jumps from stolenBase attempts by runnerId', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      betweenPlayEvents: [steal('b1', true), steal('b1', true), steal('b1', false), steal('other', false)],
    }));
    expect(candidate(result, 'b1', 'Stealer')?.signalValue).toBeCloseTo(2 / 3, 10);
    expect(candidate(result, 'b1', 'Bad Jumps')?.signalValue).toBeCloseTo(1 / 3, 10);
  });

  it('computes Butter Fingers as error or failed-fielding rate', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      fieldingEvents: [
        fielding({ playerId: 'b1', playType: 'error', success: false }),
        fielding({ playerId: 'b1', playType: 'putout', success: false }),
        fielding({ playerId: 'b1', playType: 'putout', success: true }),
      ],
    }));
    expect(candidate(result, 'b1', 'Butter Fingers')?.signalValue).toBeCloseTo(2 / 3, 10);
  });

  it('computes Cannon Arm and Noodle Arm as inverted OF-arm activity per game', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      seasonFieldingByPlayer: new Map([['b1', { outfieldAssists: 2, baserunnersHeld: 4, games: 12 }]]),
    }));
    expect(candidate(result, 'b1', 'Cannon Arm')?.signalValue).toBeCloseTo(0.5, 10);
    expect(candidate(result, 'b1', 'Noodle Arm')?.signalValue).toBeCloseTo(-0.5, 10);
  });

  it('computes Durable and Injury Prone from injury rate and gates zero-game rows', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1', 'b2'], 'position'),
      injuryCountsByPlayer: new Map([['b1', 2], ['b2', 1]]),
      gamesByPlayer: new Map([['b1', 20], ['b2', 0]]),
    }));
    expect(candidate(result, 'b1', 'Injury Prone')?.signalValue).toBeCloseTo(0.1, 10);
    expect(candidate(result, 'b1', 'Durable')?.signalValue).toBeCloseTo(-0.1, 10);
    expect(candidate(result, 'b2', 'Injury Prone')?.score.realityPercentile).toBeNull();
    expect(candidate(result, 'b2', 'Injury Prone')?.score.sufficiency).toBe('thin_sample');
  });
});

describe('R1-a outcome-rate signals (per-PA proxies)', () => {
  it('computes pitcher K Collector and K Neglector as K-rate / 1 - K-rate per PA', () => {
    const events = [
      ...repeat(3, () => atBat({ pitcherId: 'p1', batterId: 'opp', result: 'K' })),
      ...repeat(7, () => atBat({ pitcherId: 'p1', batterId: 'opp', result: 'GO', outsAfter: 1 })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p1'], 'pitcher'),
      atBatEvents: events,
    }));
    expect(candidate(result, 'p1', 'K Collector')?.signalValue).toBeCloseTo(0.3, 10);
    expect(candidate(result, 'p1', 'K Collector')?.sampleSize).toBe(10);
    expect(candidate(result, 'p1', 'K Neglector')?.signalValue).toBeCloseTo(0.7, 10);
    expect(candidate(result, 'p1', 'K Neglector')?.sampleSize).toBe(10);
  });

  it('computes batter Whiffer, Tough Out, and Easy Target from K-rate per PA', () => {
    const events = [
      ...repeat(4, () => atBat({ batterId: 'b1', result: 'Kc' })),
      ...repeat(6, () => atBat({ batterId: 'b1', result: 'GO', outsAfter: 1 })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: events,
    }));
    expect(candidate(result, 'b1', 'Whiffer')?.signalValue).toBeCloseTo(0.4, 10);
    expect(candidate(result, 'b1', 'Tough Out')?.signalValue).toBeCloseTo(0.6, 10);
    expect(candidate(result, 'b1', 'Easy Target')?.signalValue).toBeCloseTo(0.4, 10);
    expect(candidate(result, 'b1', 'Whiffer')?.sampleSize).toBe(10);
  });

  it('counts a non-K/Kc strikeout (D3K) toward K-rate', () => {
    const events = [
      atBat({ batterId: 'b1', result: 'D3K', outsAfter: 0 }),
      ...repeat(9, () => atBat({ batterId: 'b1', result: 'GO', outsAfter: 1 })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: events,
    }));
    // D3K is a reach, but it is still a strikeout for K-rate purposes.
    expect(candidate(result, 'b1', 'Whiffer')?.signalValue).toBeCloseTo(0.1, 10);
    expect(candidate(result, 'b1', 'Easy Target')?.signalValue).toBeCloseTo(0.1, 10);
    expect(candidate(result, 'b1', 'Tough Out')?.signalValue).toBeCloseTo(0.9, 10);
  });

  it('computes Slow Poke from DP-rate per PA', () => {
    const events = [
      ...repeat(2, () => atBat({ batterId: 'b1', result: 'DP', outsAfter: 2 })),
      ...repeat(6, () => atBat({ batterId: 'b1', result: 'GO', outsAfter: 1 })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: events,
    }));
    expect(candidate(result, 'b1', 'Slow Poke')?.signalValue).toBeCloseTo(0.25, 10);
    expect(candidate(result, 'b1', 'Slow Poke')?.sampleSize).toBe(8);
  });

  it('computes Sprinter from FC-rate per PA', () => {
    const events = [
      ...repeat(3, () => atBat({ batterId: 'b1', result: 'FC', outsAfter: 1 })),
      ...repeat(7, () => atBat({ batterId: 'b1', result: 'GO', outsAfter: 1 })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: events,
    }));
    expect(candidate(result, 'b1', 'Sprinter')?.signalValue).toBeCloseTo(0.3, 10);
  });

  it('computes Mind Gamer from walk-rate (BB or IBB) per PA', () => {
    const events = [
      ...repeat(2, () => atBat({ batterId: 'b1', result: 'BB', outsAfter: 0 })),
      ...repeat(3, () => atBat({ batterId: 'b1', result: 'IBB', outsAfter: 0 })),
      ...repeat(5, () => atBat({ batterId: 'b1', result: 'GO', outsAfter: 1 })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: events,
    }));
    expect(candidate(result, 'b1', 'Mind Gamer')?.signalValue).toBeCloseTo(0.5, 10);
  });

  it('computes pitcher Easy Jumps and Pick Officer from opposing steal success via runnerAttribution', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p1'], 'pitcher'),
      betweenPlayEvents: [
        steal('r1', true, { runnerAttribution: { pitcherId: 'p1' } } as Partial<BetweenPlayEvent>),
        steal('r2', false, { runnerAttribution: { pitcherId: 'p1' } } as Partial<BetweenPlayEvent>),
        steal('r3', false, { runnerAttribution: { pitcherId: 'p1' } } as Partial<BetweenPlayEvent>),
        steal('r4', false, { runnerAttribution: { pitcherId: 'p1' } } as Partial<BetweenPlayEvent>),
      ],
    }));
    expect(candidate(result, 'p1', 'Easy Jumps')?.signalValue).toBeCloseTo(0.25, 10);
    expect(candidate(result, 'p1', 'Pick Officer')?.signalValue).toBeCloseTo(0.75, 10);
    expect(candidate(result, 'p1', 'Easy Jumps')?.sampleSize).toBe(4);
  });

  it('keeps pitcher-K and batter-K in separate role pools via role eligibility', () => {
    // p1 is a pitcher; b1 is a position player. Each appears as BOTH batter and
    // pitcher in some at-bat, but only the role-eligible trait is emitted.
    const result = computeSeasonTraitCandidates(baseInput({
      players: [{ playerId: 'p1', role: 'pitcher' }, { playerId: 'b1', role: 'position' }],
      atBatEvents: [
        // p1 pitches and strikes batters out (pitcher K Collector eligible).
        ...repeat(10, () => atBat({ pitcherId: 'p1', batterId: 'opp', result: 'K' })),
        // p1 also takes an at-bat as batter and whiffs — but Whiffer is position-only.
        ...repeat(10, () => atBat({ pitcherId: 'opp-p', batterId: 'p1', result: 'K' })),
        // b1 bats and whiffs (position Whiffer eligible).
        ...repeat(10, () => atBat({ pitcherId: 'opp-p', batterId: 'b1', result: 'K' })),
        // b1 also "pitches" — but K Collector is pitcher-only.
        ...repeat(10, () => atBat({ pitcherId: 'b1', batterId: 'opp', result: 'K' })),
      ],
    }));
    // Pitcher gets the pitcher-K trait, NOT the batter-K trait.
    expect(candidate(result, 'p1', 'K Collector')?.signalValue).toBeCloseTo(1, 10);
    expect(candidate(result, 'p1', 'Whiffer')).toBeUndefined();
    // Position player gets the batter-K trait, NOT the pitcher-K trait.
    expect(candidate(result, 'b1', 'Whiffer')?.signalValue).toBeCloseTo(1, 10);
    expect(candidate(result, 'b1', 'K Collector')).toBeUndefined();
  });

  it('skips undone at-bats when accumulating outcome rates', () => {
    const events = [
      atBat({ batterId: 'b1', result: 'K', undoneAt: 1 }),
      ...repeat(4, () => atBat({ batterId: 'b1', result: 'K' })),
      ...repeat(6, () => atBat({ batterId: 'b1', result: 'GO', outsAfter: 1 })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: events,
    }));
    // The undone K is excluded: 4 K of 10 live PA, not 5 of 11.
    expect(candidate(result, 'b1', 'Whiffer')?.signalValue).toBeCloseTo(0.4, 10);
    expect(candidate(result, 'b1', 'Whiffer')?.sampleSize).toBe(10);
  });
});

describe('R1-b1 Big Hack / Little Hack (percentile-merge of HR-rate × AVG)', () => {
  // 3-player cohort with clean within-builder percentiles:
  //   A: HR-rate 0.30, AVG 0.30 (big hacker)
  //   B: HR-rate 0.10, AVG 0.50 (middle)
  //   C: HR-rate 0.00, AVG 0.70 (little hacker)
  // hrPool asc [0, .1, .3] → hrPct A=1, B=2/3, C=1/3
  // avgPool asc [.3, .5, .7] → avgPct A=1/3, B=2/3, C=1
  function hackCohort(): AtBatEvent[] {
    return [
      // A: 3 HR + 7 outs of 10 PA → HR/PA=.3, hits=3, AB=10, AVG=.3
      ...repeat(3, () => atBat({ batterId: 'A', result: 'HR', outsAfter: 0 })),
      ...repeat(7, () => atBat({ batterId: 'A', result: 'GO', outsAfter: 1 })),
      // B: 1 HR + 4 1B + 5 outs of 10 → HR/PA=.1, hits=5, AB=10, AVG=.5
      ...repeat(1, () => atBat({ batterId: 'B', result: 'HR', outsAfter: 0 })),
      ...repeat(4, () => atBat({ batterId: 'B', result: '1B', outsAfter: 0 })),
      ...repeat(5, () => atBat({ batterId: 'B', result: 'GO', outsAfter: 1 })),
      // C: 0 HR + 7 1B + 3 outs of 10 → HR/PA=0, hits=7, AB=10, AVG=.7
      ...repeat(7, () => atBat({ batterId: 'C', result: '1B', outsAfter: 0 })),
      ...repeat(3, () => atBat({ batterId: 'C', result: 'GO', outsAfter: 1 })),
    ];
  }

  it('scores a high-HR/low-AVG player high Big Hack and low Little Hack, and mirrors for the contact hitter', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['A', 'B', 'C'], 'position'),
      atBatEvents: hackCohort(),
    }));
    // A (big hacker): Big = (1 + (1 - 1/3))/2 = 0.8333..., Little = ((1-1) + 1/3)/2 = 0.16667
    expect(candidate(result, 'A', 'Big Hack')?.signalValue).toBeCloseTo((1 + (1 - 1 / 3)) / 2, 10);
    expect(candidate(result, 'A', 'Little Hack')?.signalValue).toBeCloseTo(((1 - 1) + 1 / 3) / 2, 10);
    expect(candidate(result, 'A', 'Big Hack')?.sampleSize).toBe(10);
    // C (little hacker): the exact mirror of A.
    expect(candidate(result, 'C', 'Big Hack')?.signalValue).toBeCloseTo((1 / 3 + (1 - 1)) / 2, 10);
    expect(candidate(result, 'C', 'Little Hack')?.signalValue).toBeCloseTo(((1 - 1 / 3) + 1) / 2, 10);
    // Big Hack and Little Hack are complementary per player (sum to 1).
    const aBig = candidate(result, 'A', 'Big Hack')?.signalValue ?? 0;
    const aLittle = candidate(result, 'A', 'Little Hack')?.signalValue ?? 0;
    expect(aBig + aLittle).toBeCloseTo(1, 10);
    expect(aBig).toBeGreaterThan(candidate(result, 'C', 'Big Hack')?.signalValue ?? 1);
  });

  it('counts ITPHR as both a home run and a hit', () => {
    // X hits 4 ITPHR + 6 outs of 10 → HR/PA=.4, hits=4, AB=10, AVG=.4
    // Y all outs → HR/PA=0, hits=0, AVG=0. ITPHR must register as HR + hit for X.
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['X', 'Y'], 'position'),
      atBatEvents: [
        ...repeat(4, () => atBat({ batterId: 'X', result: 'ITPHR', outsAfter: 0 })),
        ...repeat(6, () => atBat({ batterId: 'X', result: 'GO', outsAfter: 1 })),
        ...repeat(10, () => atBat({ batterId: 'Y', result: 'GO', outsAfter: 1 })),
      ],
    }));
    // X HR-rate 0.4 > Y 0 → X hrPct = 1.0; X AVG 0.4 > Y 0 → X avgPct = 1.0.
    // Big Hack X = (1 + (1 - 1))/2 = 0.5 (ITPHR pulled into BOTH pools).
    expect(candidate(result, 'X', 'Big Hack')?.signalValue).toBeCloseTo((1 + (1 - 1)) / 2, 10);
    expect(candidate(result, 'X', 'Little Hack')?.signalValue).toBeCloseTo(((1 - 1) + 1) / 2, 10);
  });

  it('excludes BB/IBB/HBP/SF/SAC from AB so AVG denominator is hits-eligible PAs only', () => {
    // P: 10 PA = 2 1B + 4 BB + 4 outs. AB = 10 - 4(BB) = 6. AVG = 2/6 = 0.3333.
    // Q: a contrast player so the cohort/percentiles are well-defined.
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['P', 'Q'], 'position'),
      atBatEvents: [
        ...repeat(2, () => atBat({ batterId: 'P', result: '1B', outsAfter: 0 })),
        ...repeat(4, () => atBat({ batterId: 'P', result: 'BB', outsAfter: 0 })),
        ...repeat(4, () => atBat({ batterId: 'P', result: 'GO', outsAfter: 1 })),
        // Q: 1 1B + 9 outs, no walks → AVG = 1/10 = 0.1 (< P's 0.3333).
        ...repeat(1, () => atBat({ batterId: 'Q', result: '1B', outsAfter: 0 })),
        ...repeat(9, () => atBat({ batterId: 'Q', result: 'GO', outsAfter: 1 })),
      ],
    }));
    // P AVG = 2/6 > Q AVG = 1/10 → P avgPct = 1.0, both HR-rate 0 → both hrPct = 1.0.
    // Little Hack P = ((1 - 1) + 1)/2 = 0.5 (confirms AB excludes the 4 walks; if
    // walks were in AB, P AVG would be 2/10 = 0.2 < Q and avgPct would flip to 0.5).
    expect(candidate(result, 'P', 'Little Hack')?.signalValue).toBeCloseTo(((1 - 1) + 1) / 2, 10);
    expect(candidate(result, 'P', 'Big Hack')?.signalValue).toBeCloseTo((1 + (1 - 1)) / 2, 10);
    // sampleSize = PA (not AB) = 10.
    expect(candidate(result, 'P', 'Big Hack')?.sampleSize).toBe(10);
  });

  it('emits no Hack signal for a player with PA but AB = 0 (all walks)', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['W', 'N'], 'position'),
      atBatEvents: [
        // W: 5 walks, 0 AB → no Hack signal.
        ...repeat(5, () => atBat({ batterId: 'W', result: 'BB', outsAfter: 0 })),
        // N: a normal hitter so the cohort is non-empty.
        ...repeat(3, () => atBat({ batterId: 'N', result: '1B', outsAfter: 0 })),
        ...repeat(7, () => atBat({ batterId: 'N', result: 'GO', outsAfter: 1 })),
      ],
    }));
    expect(candidate(result, 'W', 'Big Hack')).toBeUndefined();
    expect(candidate(result, 'W', 'Little Hack')).toBeUndefined();
    expect(candidate(result, 'N', 'Big Hack')).toBeDefined();
  });

  it('skips undone at-bats when computing Hack rates', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['A', 'B'], 'position'),
      atBatEvents: [
        // An undone HR for A must not inflate A's HR-rate.
        atBat({ batterId: 'A', result: 'HR', outsAfter: 0, undoneAt: 1 }),
        ...repeat(10, () => atBat({ batterId: 'A', result: '1B', outsAfter: 0 })),
        ...repeat(2, () => atBat({ batterId: 'B', result: 'HR', outsAfter: 0 })),
        ...repeat(8, () => atBat({ batterId: 'B', result: 'GO', outsAfter: 1 })),
      ],
    }));
    // A live HR-rate = 0 (the only HR is undone). B HR-rate = 0.2 > A.
    // A hrPct = 1/2 = 0.5; sampleSize = 10 (the undone PA excluded).
    expect(candidate(result, 'A', 'Big Hack')?.sampleSize).toBe(10);
    expect(candidate(result, 'A', 'Big Hack')?.signalValue).toBeLessThan(
      candidate(result, 'B', 'Big Hack')?.signalValue ?? 0,
    );
  });

  it('keeps Big/Little Hack out of the pitcher pool (position-only role eligibility)', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: [{ playerId: 'pitcherBat', role: 'pitcher' }],
      atBatEvents: repeat(10, () => atBat({ batterId: 'pitcherBat', result: 'HR', outsAfter: 0 })),
    }));
    expect(candidate(result, 'pitcherBat', 'Big Hack')).toBeUndefined();
    expect(candidate(result, 'pitcherBat', 'Little Hack')).toBeUndefined();
  });
});

describe('R1-b1 Distractor (batter reaches with the owner-runner on 1B/2B)', () => {
  it('credits the owner on 1B and the owner on 2B, not the batter, and not a 3B runner', () => {
    // owner o1 on 1B: 4 batter-reaches of 8 PA → rate 0.5.
    // owner o2 on 2B: a separate set crediting o2.
    // owner o3 on 3B only: never credited.
    const on1B: RunnerState = { first: { runnerId: 'o1', runnerName: 'O1', responsiblePitcherId: 'p1' }, second: null, third: null };
    const on2B: RunnerState = { first: null, second: { runnerId: 'o2', runnerName: 'O2', responsiblePitcherId: 'p1' }, third: null };
    const on3B: RunnerState = { first: null, second: null, third: { runnerId: 'o3', runnerName: 'O3', responsiblePitcherId: 'p1' } };
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['o1', 'o2', 'o3', 'b1'], 'position'),
      atBatEvents: [
        ...repeat(4, () => atBat({ batterId: 'b1', runners: on1B, result: '1B', outsAfter: 0 })),
        ...repeat(4, () => atBat({ batterId: 'b1', runners: on1B, result: 'GO', outsAfter: 1 })),
        ...repeat(6, () => atBat({ batterId: 'b1', runners: on2B, result: 'BB', outsAfter: 0 })),
        ...repeat(4, () => atBat({ batterId: 'b1', runners: on2B, result: 'K' })),
        ...repeat(5, () => atBat({ batterId: 'b1', runners: on3B, result: '1B', outsAfter: 0 })),
      ],
    }));
    // o1 (1B owner): 4 reaches / 8 PA = 0.5.
    expect(candidate(result, 'o1', 'Distractor')?.signalValue).toBeCloseTo(0.5, 10);
    expect(candidate(result, 'o1', 'Distractor')?.sampleSize).toBe(8);
    // o2 (2B owner): 6 reaches / 10 PA = 0.6.
    expect(candidate(result, 'o2', 'Distractor')?.signalValue).toBeCloseTo(0.6, 10);
    expect(candidate(result, 'o2', 'Distractor')?.sampleSize).toBe(10);
    // o3 was only ever on 3B → never an owner.
    expect(candidate(result, 'o3', 'Distractor')).toBeUndefined();
    // The batter (b1) is NOT credited the runner's Distractor.
    expect(candidate(result, 'b1', 'Distractor')).toBeUndefined();
  });

  it('credits BOTH owners one opportunity each when 1B and 2B are occupied', () => {
    const firstAndSecond: RunnerState = {
      first: { runnerId: 'o1', runnerName: 'O1', responsiblePitcherId: 'p1' },
      second: { runnerId: 'o2', runnerName: 'O2', responsiblePitcherId: 'p1' },
      third: null,
    };
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['o1', 'o2'], 'position'),
      atBatEvents: [
        ...repeat(7, () => atBat({ batterId: 'b1', runners: firstAndSecond, result: '1B', outsAfter: 0 })),
        ...repeat(3, () => atBat({ batterId: 'b1', runners: firstAndSecond, result: 'GO', outsAfter: 1 })),
      ],
    }));
    // Both owners get 10 opportunities, 7 successes each.
    expect(candidate(result, 'o1', 'Distractor')?.signalValue).toBeCloseTo(0.7, 10);
    expect(candidate(result, 'o1', 'Distractor')?.sampleSize).toBe(10);
    expect(candidate(result, 'o2', 'Distractor')?.signalValue).toBeCloseTo(0.7, 10);
    expect(candidate(result, 'o2', 'Distractor')?.sampleSize).toBe(10);
  });

  it('counts hit/walk/HBP as reaches but NOT E/FC/D3K reaches', () => {
    const on1B: RunnerState = { first: { runnerId: 'o1', runnerName: 'O1', responsiblePitcherId: 'p1' }, second: null, third: null };
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['o1'], 'position'),
      atBatEvents: [
        atBat({ batterId: 'b1', runners: on1B, result: '1B', outsAfter: 0 }),  // success
        atBat({ batterId: 'b1', runners: on1B, result: 'HR', outsAfter: 0 }),  // success
        atBat({ batterId: 'b1', runners: on1B, result: 'BB', outsAfter: 0 }),  // success
        atBat({ batterId: 'b1', runners: on1B, result: 'HBP', outsAfter: 0 }), // success
        atBat({ batterId: 'b1', runners: on1B, result: 'E', outsAfter: 0 }),   // NOT a reach
        atBat({ batterId: 'b1', runners: on1B, result: 'FC', outsAfter: 1 }),  // NOT a reach
        atBat({ batterId: 'b1', runners: on1B, result: 'D3K', outsAfter: 0 }), // NOT a reach
        atBat({ batterId: 'b1', runners: on1B, result: 'GO', outsAfter: 1 }),  // out
      ],
    }));
    // 4 reaches of 8 opportunities = 0.5 (E/FC/D3K excluded).
    expect(candidate(result, 'o1', 'Distractor')?.signalValue).toBeCloseTo(0.5, 10);
    expect(candidate(result, 'o1', 'Distractor')?.sampleSize).toBe(8);
  });

  it('skips undone at-bats for Distractor', () => {
    const on1B: RunnerState = { first: { runnerId: 'o1', runnerName: 'O1', responsiblePitcherId: 'p1' }, second: null, third: null };
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['o1'], 'position'),
      atBatEvents: [
        atBat({ batterId: 'b1', runners: on1B, result: '1B', outsAfter: 0, undoneAt: 1 }),
        ...repeat(2, () => atBat({ batterId: 'b1', runners: on1B, result: '1B', outsAfter: 0 })),
        ...repeat(2, () => atBat({ batterId: 'b1', runners: on1B, result: 'GO', outsAfter: 1 })),
      ],
    }));
    // The undone reach is excluded: 2 reaches of 4, not 3 of 5.
    expect(candidate(result, 'o1', 'Distractor')?.signalValue).toBeCloseTo(0.5, 10);
    expect(candidate(result, 'o1', 'Distractor')?.sampleSize).toBe(4);
  });
});

describe('R3 Ace Exterminator (reached-base rate vs A−+ opposing pitchers)', () => {
  it('computes the batter reached-base rate over PAs vs A−-or-better pitchers only', () => {
    // ace1 is grade A (qualifies), ace2 is grade S (qualifies), scrub is grade C (excluded).
    const gradeByPlayer = new Map<string, Smb4Grade>([
      ['ace1', 'A'],
      ['ace2', 'S'],
      ['scrub', 'C'],
    ]);
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      pitcherGradeByPlayer: gradeByPlayer,
      atBatEvents: [
        // vs ace1 (A): 3 reaches of 5 PA.
        ...repeat(3, () => atBat({ batterId: 'b1', pitcherId: 'ace1', result: '1B', outsAfter: 0 })),
        ...repeat(2, () => atBat({ batterId: 'b1', pitcherId: 'ace1', result: 'GO', outsAfter: 1 })),
        // vs ace2 (S): 1 reach of 5 PA.
        ...repeat(1, () => atBat({ batterId: 'b1', pitcherId: 'ace2', result: 'BB', outsAfter: 0 })),
        ...repeat(4, () => atBat({ batterId: 'b1', pitcherId: 'ace2', result: 'K' })),
        // vs scrub (C): all reaches, but EXCLUDED from the denominator.
        ...repeat(6, () => atBat({ batterId: 'b1', pitcherId: 'scrub', result: 'HR', outsAfter: 0 })),
      ],
    }));
    // 4 reaches of 10 PA vs A−+ pitchers = 0.4 (the 6 scrub PAs are excluded).
    expect(candidate(result, 'b1', 'Ace Exterminator')?.signalValue).toBeCloseTo(0.4, 10);
    expect(candidate(result, 'b1', 'Ace Exterminator')?.sampleSize).toBe(10);
  });

  it('counts hit/walk/HBP as reaches but NOT E/FC/D3K reaches', () => {
    const gradeByPlayer = new Map<string, Smb4Grade>([['ace1', 'A']]);
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      pitcherGradeByPlayer: gradeByPlayer,
      atBatEvents: [
        atBat({ batterId: 'b1', pitcherId: 'ace1', result: '1B', outsAfter: 0 }),  // success
        atBat({ batterId: 'b1', pitcherId: 'ace1', result: 'HR', outsAfter: 0 }),  // success
        atBat({ batterId: 'b1', pitcherId: 'ace1', result: 'BB', outsAfter: 0 }),  // success
        atBat({ batterId: 'b1', pitcherId: 'ace1', result: 'HBP', outsAfter: 0 }), // success
        atBat({ batterId: 'b1', pitcherId: 'ace1', result: 'E', outsAfter: 0 }),   // NOT a reach
        atBat({ batterId: 'b1', pitcherId: 'ace1', result: 'FC', outsAfter: 1 }),  // NOT a reach
        atBat({ batterId: 'b1', pitcherId: 'ace1', result: 'D3K', outsAfter: 0 }), // NOT a reach
        atBat({ batterId: 'b1', pitcherId: 'ace1', result: 'GO', outsAfter: 1 }),  // out
      ],
    }));
    // 4 reaches of 8 PA = 0.5 (E/FC/D3K excluded from the numerator, still in the denominator).
    expect(candidate(result, 'b1', 'Ace Exterminator')?.signalValue).toBeCloseTo(0.5, 10);
    expect(candidate(result, 'b1', 'Ace Exterminator')?.sampleSize).toBe(8);
  });

  it('treats the A− threshold as inclusive: an A− PA counts, a B+ PA does not', () => {
    // aMinus is exactly the threshold grade (counts); bPlus is one notch below (excluded).
    const gradeByPlayer = new Map<string, Smb4Grade>([
      ['aMinus', 'A-'],
      ['bPlus', 'B+'],
    ]);
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      pitcherGradeByPlayer: gradeByPlayer,
      atBatEvents: [
        // vs A- pitcher: 2 reaches of 4 PA → counts.
        ...repeat(2, () => atBat({ batterId: 'b1', pitcherId: 'aMinus', result: '1B', outsAfter: 0 })),
        ...repeat(2, () => atBat({ batterId: 'b1', pitcherId: 'aMinus', result: 'GO', outsAfter: 1 })),
        // vs B+ pitcher: all reaches, but EXCLUDED (below the threshold).
        ...repeat(5, () => atBat({ batterId: 'b1', pitcherId: 'bPlus', result: 'HR', outsAfter: 0 })),
      ],
    }));
    // Only the 4 A− PAs count: 2 of 4 = 0.5. The 5 B+ PAs are excluded.
    expect(candidate(result, 'b1', 'Ace Exterminator')?.signalValue).toBeCloseTo(0.5, 10);
    expect(candidate(result, 'b1', 'Ace Exterminator')?.sampleSize).toBe(4);
  });

  it('emits NO Ace Exterminator signal when the pitcher-grade map is omitted (dormant)', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      // No pitcherGradeByPlayer → Ace Exterminator dormant (deferred-wiring seam empty).
      atBatEvents: repeat(10, () => atBat({ batterId: 'b1', pitcherId: 'ace1', result: '1B', outsAfter: 0 })),
    }));
    expect(candidate(result, 'b1', 'Ace Exterminator')).toBeUndefined();
  });

  it('emits NO Ace Exterminator signal when the pitcher-grade map is empty (dormant)', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      pitcherGradeByPlayer: new Map<string, Smb4Grade>(),
      atBatEvents: repeat(10, () => atBat({ batterId: 'b1', pitcherId: 'ace1', result: '1B', outsAfter: 0 })),
    }));
    expect(candidate(result, 'b1', 'Ace Exterminator')).toBeUndefined();
  });

  it('skips a PA whose pitcher is absent from the grade map', () => {
    // ace1 graded; ungraded pitcher has no entry → those PAs are skipped entirely.
    const gradeByPlayer = new Map<string, Smb4Grade>([['ace1', 'A']]);
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      pitcherGradeByPlayer: gradeByPlayer,
      atBatEvents: [
        ...repeat(2, () => atBat({ batterId: 'b1', pitcherId: 'ace1', result: '1B', outsAfter: 0 })),
        ...repeat(2, () => atBat({ batterId: 'b1', pitcherId: 'ace1', result: 'GO', outsAfter: 1 })),
        // Ungraded pitcher → no grade entry → skipped (not in the denominator).
        ...repeat(5, () => atBat({ batterId: 'b1', pitcherId: 'ungraded', result: 'HR', outsAfter: 0 })),
      ],
    }));
    expect(candidate(result, 'b1', 'Ace Exterminator')?.signalValue).toBeCloseTo(0.5, 10);
    expect(candidate(result, 'b1', 'Ace Exterminator')?.sampleSize).toBe(4);
  });

  it('keeps Ace Exterminator out of the pitcher pool (position-only role eligibility)', () => {
    const gradeByPlayer = new Map<string, Smb4Grade>([['ace1', 'A']]);
    const result = computeSeasonTraitCandidates(baseInput({
      players: [{ playerId: 'pf1', role: 'pitcher' }],
      pitcherGradeByPlayer: gradeByPlayer,
      // pf1 bats vs an A pitcher — but as a pitcher-role player, Ace Exterminator
      // (position-only) is filtered out downstream.
      atBatEvents: repeat(8, () => atBat({ batterId: 'pf1', pitcherId: 'ace1', result: '1B', outsAfter: 0 })),
    }));
    expect(candidate(result, 'pf1', 'Ace Exterminator')).toBeUndefined();
  });

  it('skips undone at-bats for Ace Exterminator', () => {
    const gradeByPlayer = new Map<string, Smb4Grade>([['ace1', 'A']]);
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      pitcherGradeByPlayer: gradeByPlayer,
      atBatEvents: [
        atBat({ batterId: 'b1', pitcherId: 'ace1', result: '1B', outsAfter: 0, undoneAt: 1 }),
        ...repeat(2, () => atBat({ batterId: 'b1', pitcherId: 'ace1', result: '1B', outsAfter: 0 })),
        ...repeat(2, () => atBat({ batterId: 'b1', pitcherId: 'ace1', result: 'GO', outsAfter: 1 })),
      ],
    }));
    // The undone reach is excluded: 2 reaches of 4, not 3 of 5.
    expect(candidate(result, 'b1', 'Ace Exterminator')?.signalValue).toBeCloseTo(0.5, 10);
    expect(candidate(result, 'b1', 'Ace Exterminator')?.sampleSize).toBe(4);
  });
});

describe('R3 Ace Exterminator L9b-2 seam (feeds computeTraitAcquisition)', () => {
  it('emits Ace Exterminator in the { traitName, score } shape the acquisition combiner consumes', () => {
    const gradeByPlayer = new Map<string, Smb4Grade>([['ace1', 'A']]);
    // b1 mashes aces; peers b2/b3 flail vs the same ace so a real percentile forms.
    const events = [
      ...repeat(40, () => atBat({ batterId: 'b1', pitcherId: 'ace1', result: 'HR', outsAfter: 0 })),
      ...repeat(40, () => atBat({ batterId: 'b2', pitcherId: 'ace1', result: 'GO', outsAfter: 1 })),
      ...repeat(40, () => atBat({ batterId: 'b3', pitcherId: 'ace1', result: 'K' })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1', 'b2', 'b3'], 'position'),
      pitcherGradeByPlayer: gradeByPlayer,
      atBatEvents: events,
    }));
    const ace = candidate(result, 'b1', 'Ace Exterminator');
    expect(ace).toBeDefined();
    expect(ace?.score).toBeDefined();
    expect(typeof ace?.score.sufficient).toBe('boolean');

    const acquisition = computeTraitAcquisition({
      playerRole: 'position',
      personality: 'EGOTISTICAL',
      heldTraits: [],
      candidates: result.get('b1') ?? [],
    });
    expect(acquisition).toHaveProperty('proposals');
    expect(acquisition).toHaveProperty('skipped');
    // Ace Exterminator must not be dropped for ineligible/unknown reasons.
    const skip = acquisition.skipped.find((s) => s.traitName === 'Ace Exterminator');
    expect(skip?.reason).not.toBe('ineligible_role');
    expect(skip?.reason).not.toBe('unknown_trait');
  });
});

describe('R1-b1 Base Rounder (advancing beyond the forced minimum)', () => {
  function ro(runnerId: string, fromBase: 'batter' | 'first' | 'second' | 'third', toBase: 'first' | 'second' | 'third' | 'home' | 'out' | 'end') {
    return { runnerId, runnerName: runnerId.toUpperCase(), fromBase, toBase };
  }

  it('counts a runner taking 1st→3rd on a single as a success (forced min is 2nd)', () => {
    const on1B: RunnerState = { first: { runnerId: 'r1', runnerName: 'R1', responsiblePitcherId: 'p1' }, second: null, third: null };
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['r1'], 'position'),
      atBatEvents: [
        // On a 1B, r1 is forced to 2nd; reaching 3rd (ordinal 3 > 2) is a success.
        ...repeat(3, () => atBat({ batterId: 'b1', result: '1B', outsAfter: 0, runners: on1B, runnerOutcomes: [ro('r1', 'first', 'third')] })),
        // r1 only making the forced 2nd = opportunity, not success.
        ...repeat(1, () => atBat({ batterId: 'b1', result: '1B', outsAfter: 0, runners: on1B, runnerOutcomes: [ro('r1', 'first', 'second')] })),
      ],
    }));
    expect(candidate(result, 'r1', 'Base Rounder')?.signalValue).toBeCloseTo(0.75, 10);
    expect(candidate(result, 'r1', 'Base Rounder')?.sampleSize).toBe(4);
  });

  it('counts a runner only reaching the forced minimum as opportunity-not-success', () => {
    const on1B: RunnerState = { first: { runnerId: 'r1', runnerName: 'R1', responsiblePitcherId: 'p1' }, second: null, third: null };
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['r1'], 'position'),
      atBatEvents: repeat(4, () => atBat({ batterId: 'b1', result: '1B', outsAfter: 0, runners: on1B, runnerOutcomes: [ro('r1', 'first', 'second')] })),
    }));
    expect(candidate(result, 'r1', 'Base Rounder')?.signalValue).toBeCloseTo(0, 10);
    expect(candidate(result, 'r1', 'Base Rounder')?.sampleSize).toBe(4);
  });

  it('counts a thrown-out extra-base try as opportunity-not-success (JK ruling 1)', () => {
    const on1B: RunnerState = { first: { runnerId: 'r1', runnerName: 'R1', responsiblePitcherId: 'p1' }, second: null, third: null };
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['r1'], 'position'),
      atBatEvents: [
        // Two safe extra-base takes (success) + two thrown out (opportunity, not success).
        ...repeat(2, () => atBat({ batterId: 'b1', result: '1B', outsAfter: 0, runners: on1B, runnerOutcomes: [ro('r1', 'first', 'third')] })),
        ...repeat(2, () => atBat({ batterId: 'b1', result: '1B', outsAfter: 1, runners: on1B, runnerOutcomes: [ro('r1', 'first', 'out')] })),
      ],
    }));
    // 2 successes of 4 chances (the throw-outs ARE chances).
    expect(candidate(result, 'r1', 'Base Rounder')?.signalValue).toBeCloseTo(0.5, 10);
    expect(candidate(result, 'r1', 'Base Rounder')?.sampleSize).toBe(4);
  });

  it('counts the batter-runner stretching a single into a double as a success (JK ruling 2)', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: [
        // A 1B entitles the batter to 1st; reaching 2nd (ordinal 2 > 1) is a success.
        ...repeat(3, () => atBat({ batterId: 'b1', result: '1B', outsAfter: 0, runnerOutcomes: [ro('b1', 'batter', 'second')] })),
        // The batter only taking the entitled 1st = opportunity, not success.
        ...repeat(1, () => atBat({ batterId: 'b1', result: '1B', outsAfter: 0, runnerOutcomes: [ro('b1', 'batter', 'first')] })),
      ],
    }));
    expect(candidate(result, 'b1', 'Base Rounder')?.signalValue).toBeCloseTo(0.75, 10);
    expect(candidate(result, 'b1', 'Base Rounder')?.sampleSize).toBe(4);
  });

  it('does NOT count a held runner (toBase "end") as a chance', () => {
    const on2B: RunnerState = { first: null, second: { runnerId: 'r2', runnerName: 'R2', responsiblePitcherId: 'p1' }, third: null };
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['r2'], 'position'),
      atBatEvents: [
        // r2 on 2B with a walk is NOT forced; scoring (home, ordinal 4 > 2) = success.
        ...repeat(2, () => atBat({ batterId: 'b1', result: 'BB', outsAfter: 0, runners: on2B, runnerOutcomes: [ro('r2', 'second', 'home')] })),
        // r2 held at 2nd (toBase 'end') is NOT a chance at all.
        ...repeat(5, () => atBat({ batterId: 'b1', result: 'BB', outsAfter: 0, runners: on2B, runnerOutcomes: [ro('r2', 'second', 'end')] })),
      ],
    }));
    // 2 successes of 2 chances (the 5 holds are not chances) = 1.0.
    expect(candidate(result, 'r2', 'Base Rounder')?.signalValue).toBeCloseTo(1, 10);
    expect(candidate(result, 'r2', 'Base Rounder')?.sampleSize).toBe(2);
  });

  it('uses the forced minimum on a double — 1st→home is a success, 1st→3rd is the forced min', () => {
    const on1B: RunnerState = { first: { runnerId: 'r1', runnerName: 'R1', responsiblePitcherId: 'p1' }, second: null, third: null };
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['r1'], 'position'),
      atBatEvents: [
        // On a 2B, r1 from 1st is forced to 3rd; scoring (home > 3rd) is a success.
        ...repeat(2, () => atBat({ batterId: 'b1', result: '2B', outsAfter: 0, runners: on1B, runnerOutcomes: [ro('r1', 'first', 'home')] })),
        // Only reaching the forced 3rd = opportunity, not success.
        ...repeat(2, () => atBat({ batterId: 'b1', result: '2B', outsAfter: 0, runners: on1B, runnerOutcomes: [ro('r1', 'first', 'third')] })),
      ],
    }));
    expect(candidate(result, 'r1', 'Base Rounder')?.signalValue).toBeCloseTo(0.5, 10);
    expect(candidate(result, 'r1', 'Base Rounder')?.sampleSize).toBe(4);
  });

  it('skips undone at-bats for Base Rounder', () => {
    const on1B: RunnerState = { first: { runnerId: 'r1', runnerName: 'R1', responsiblePitcherId: 'p1' }, second: null, third: null };
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['r1'], 'position'),
      atBatEvents: [
        atBat({ batterId: 'b1', result: '1B', outsAfter: 0, runners: on1B, runnerOutcomes: [ro('r1', 'first', 'third')], undoneAt: 1 }),
        ...repeat(1, () => atBat({ batterId: 'b1', result: '1B', outsAfter: 0, runners: on1B, runnerOutcomes: [ro('r1', 'first', 'third')] })),
        ...repeat(1, () => atBat({ batterId: 'b1', result: '1B', outsAfter: 0, runners: on1B, runnerOutcomes: [ro('r1', 'first', 'second')] })),
      ],
    }));
    // Undone success excluded: 1 success of 2 chances = 0.5.
    expect(candidate(result, 'r1', 'Base Rounder')?.signalValue).toBeCloseTo(0.5, 10);
    expect(candidate(result, 'r1', 'Base Rounder')?.sampleSize).toBe(2);
  });

  it('keeps Base Rounder out of the pitcher pool (position-only)', () => {
    const on1B: RunnerState = { first: { runnerId: 'pr1', runnerName: 'PR1', responsiblePitcherId: 'p1' }, second: null, third: null };
    const result = computeSeasonTraitCandidates(baseInput({
      players: [{ playerId: 'pr1', role: 'pitcher' }],
      atBatEvents: repeat(5, () => atBat({ batterId: 'b1', result: '1B', outsAfter: 0, runners: on1B, runnerOutcomes: [ro('pr1', 'first', 'third')] })),
    }));
    expect(candidate(result, 'pr1', 'Base Rounder')).toBeUndefined();
  });
});

describe('R1-b1 L9b-2 seam (new traits feed computeTraitAcquisition)', () => {
  it('emits Big Hack / Base Rounder / Distractor in the { traitName, score } shape the acquisition combiner consumes', () => {
    const on1B: RunnerState = { first: { runnerId: 'b1', runnerName: 'B1', responsiblePitcherId: 'p1' }, second: null, third: null };
    // Build enough sample + peers so the valve can clear and a real percentile forms.
    const events = [
      // Big Hack inputs: b1 a big hacker, peers b2/b3 contact hitters.
      ...repeat(40, () => atBat({ batterId: 'b1', result: 'HR', outsAfter: 0 })),
      ...repeat(40, () => atBat({ batterId: 'b2', result: '1B', outsAfter: 0 })),
      ...repeat(40, () => atBat({ batterId: 'b3', result: '1B', outsAfter: 0 })),
      // Base Rounder + Distractor inputs crediting b1 as owner/runner.
      ...repeat(40, () => atBat({ batterId: 'opp', result: '1B', outsAfter: 0, runners: on1B, runnerOutcomes: [{ runnerId: 'b1', runnerName: 'B1', fromBase: 'first', toBase: 'third' }] })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1', 'b2', 'b3'], 'position'),
      atBatEvents: events,
    }));
    const bigHack = candidate(result, 'b1', 'Big Hack');
    expect(bigHack).toBeDefined();
    expect(bigHack?.score).toBeDefined();
    expect(typeof bigHack?.score.sufficient).toBe('boolean');

    const acquisition = computeTraitAcquisition({
      playerRole: 'position',
      personality: 'EGOTISTICAL',
      heldTraits: [],
      candidates: result.get('b1') ?? [],
    });
    expect(acquisition).toHaveProperty('proposals');
    expect(acquisition).toHaveProperty('skipped');
    // None of the new traits should be dropped for ineligible/unknown reasons.
    for (const traitName of ['Big Hack', 'Little Hack', 'Base Rounder', 'Distractor']) {
      const skip = acquisition.skipped.find((s) => s.traitName === traitName);
      expect(skip?.reason).not.toBe('ineligible_role');
      expect(skip?.reason).not.toBe('unknown_trait');
    }
  });
});

describe('R1-b2 Bunter (SAC volume per PA — frequency, not a success rate)', () => {
  it('computes Bunter as SAC successes per PA (numerator = SAC only)', () => {
    const events = [
      ...repeat(3, () => atBat({ batterId: 'b1', result: 'SAC', outsAfter: 1 })),
      ...repeat(7, () => atBat({ batterId: 'b1', result: 'GO', outsAfter: 1 })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: events,
    }));
    expect(candidate(result, 'b1', 'Bunter')?.signalValue).toBeCloseTo(0.3, 10);
    expect(candidate(result, 'b1', 'Bunter')?.sampleSize).toBe(10);
  });

  it('scores a frequent sac-bunter above a non-bunter (failures do not drag the rate)', () => {
    // bunter: 4 SAC of 10 PA = 0.4. nonBunter: 0 SAC of 10 = 0.
    const events = [
      ...repeat(4, () => atBat({ batterId: 'bunter', result: 'SAC', outsAfter: 1 })),
      ...repeat(6, () => atBat({ batterId: 'bunter', result: 'GO', outsAfter: 1 })),
      ...repeat(10, () => atBat({ batterId: 'nonBunter', result: 'GO', outsAfter: 1 })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['bunter', 'nonBunter'], 'position'),
      atBatEvents: events,
    }));
    expect(candidate(result, 'bunter', 'Bunter')?.signalValue).toBeCloseTo(0.4, 10);
    expect(candidate(result, 'nonBunter', 'Bunter')?.signalValue).toBeCloseTo(0, 10);
    expect(candidate(result, 'bunter', 'Bunter')?.signalValue ?? 0).toBeGreaterThan(
      candidate(result, 'nonBunter', 'Bunter')?.signalValue ?? 1,
    );
  });

  it('keeps Bunter out of the pitcher pool (position-only role eligibility)', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: [{ playerId: 'pitcherBat', role: 'pitcher' }],
      atBatEvents: repeat(10, () => atBat({ batterId: 'pitcherBat', result: 'SAC', outsAfter: 1 })),
    }));
    expect(candidate(result, 'pitcherBat', 'Bunter')).toBeUndefined();
  });

  it('skips undone at-bats for Bunter', () => {
    const events = [
      atBat({ batterId: 'b1', result: 'SAC', outsAfter: 1, undoneAt: 1 }),
      ...repeat(2, () => atBat({ batterId: 'b1', result: 'SAC', outsAfter: 1 })),
      ...repeat(8, () => atBat({ batterId: 'b1', result: 'GO', outsAfter: 1 })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: events,
    }));
    // Undone SAC excluded: 2 SAC of 10 live PA, not 3 of 11.
    expect(candidate(result, 'b1', 'Bunter')?.signalValue).toBeCloseTo(0.2, 10);
    expect(candidate(result, 'b1', 'Bunter')?.sampleSize).toBe(10);
  });
});

describe('R1-b2 Crossed Up (passed balls per batters-faced, attributed to the pitcher)', () => {
  it('computes Crossed Up as PB/BF via wildPitchOrPassedBall.pitcherId', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p1'], 'pitcher'),
      // 10 batters faced (p1 as pitcherId), 2 passed balls attributed to p1.
      atBatEvents: repeat(10, () => atBat({ pitcherId: 'p1', batterId: 'opp', result: 'GO', outsAfter: 1 })),
      betweenPlayEvents: [passedBall('p1'), passedBall('p1')],
    }));
    expect(candidate(result, 'p1', 'Crossed Up')?.signalValue).toBeCloseTo(0.2, 10);
    expect(candidate(result, 'p1', 'Crossed Up')?.sampleSize).toBe(10);
  });

  it('scores a pitcher with more PBs/BF higher and ignores PBs attributed to another pitcher', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p1', 'p2'], 'pitcher'),
      atBatEvents: [
        ...repeat(10, () => atBat({ pitcherId: 'p1', batterId: 'opp', result: 'GO', outsAfter: 1 })),
        ...repeat(10, () => atBat({ pitcherId: 'p2', batterId: 'opp', result: 'GO', outsAfter: 1 })),
      ],
      // 3 PBs on p1, 1 PB on p2 — only matching-pitcherId PBs count.
      betweenPlayEvents: [passedBall('p1'), passedBall('p1'), passedBall('p1'), passedBall('p2')],
    }));
    expect(candidate(result, 'p1', 'Crossed Up')?.signalValue).toBeCloseTo(0.3, 10);
    expect(candidate(result, 'p2', 'Crossed Up')?.signalValue).toBeCloseTo(0.1, 10);
    expect(candidate(result, 'p1', 'Crossed Up')?.signalValue ?? 0).toBeGreaterThan(
      candidate(result, 'p2', 'Crossed Up')?.signalValue ?? 1,
    );
  });

  it('is dormant (rate 0) when no passed balls are logged for the pitcher', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p1'], 'pitcher'),
      atBatEvents: repeat(10, () => atBat({ pitcherId: 'p1', batterId: 'opp', result: 'GO', outsAfter: 1 })),
      betweenPlayEvents: [],
    }));
    // The signal still emits (BF > 0) at a zero rate; the valve/percentile handle dormancy.
    expect(candidate(result, 'p1', 'Crossed Up')?.signalValue).toBeCloseTo(0, 10);
    expect(candidate(result, 'p1', 'Crossed Up')?.sampleSize).toBe(10);
  });

  it('keeps Crossed Up out of the position pool (pitcher-only role eligibility)', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: [{ playerId: 'b1', role: 'position' }],
      // b1 takes at-bats as a "pitcher" but is role=position → no Crossed Up.
      atBatEvents: repeat(10, () => atBat({ pitcherId: 'b1', batterId: 'opp', result: 'GO', outsAfter: 1 })),
      betweenPlayEvents: [passedBall('b1'), passedBall('b1')],
    }));
    expect(candidate(result, 'b1', 'Crossed Up')).toBeUndefined();
  });

  it('skips undone passed balls and undone batters-faced', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p1'], 'pitcher'),
      atBatEvents: [
        atBat({ pitcherId: 'p1', batterId: 'opp', result: 'GO', outsAfter: 1, undoneAt: 1 }),
        ...repeat(10, () => atBat({ pitcherId: 'p1', batterId: 'opp', result: 'GO', outsAfter: 1 })),
      ],
      betweenPlayEvents: [
        passedBall('p1', { undoneAt: 1 } as Partial<BetweenPlayEvent>),
        passedBall('p1'),
      ],
    }));
    // Undone PB excluded (1 live PB) and undone PA excluded (BF = 10, not 11): 1/10.
    expect(candidate(result, 'p1', 'Crossed Up')?.signalValue).toBeCloseTo(0.1, 10);
    expect(candidate(result, 'p1', 'Crossed Up')?.sampleSize).toBe(10);
  });
});

describe('R1-b2 Utility (fielding perf at a non-primary position)', () => {
  it('computes Utility as the success rate at non-primary positions only', () => {
    // b1 primary CF. 4 chances at non-primary positions (3 success, 1 fail) = 0.75.
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      primaryPositionByPlayer: new Map([['b1', 'CF']]),
      fieldingEvents: [
        fielding({ playerId: 'b1', position: 'LF', success: true }),
        fielding({ playerId: 'b1', position: 'RF', success: true }),
        fielding({ playerId: 'b1', position: '2B', success: true }),
        fielding({ playerId: 'b1', position: 'SS', success: false }),
      ],
    }));
    expect(candidate(result, 'b1', 'Utility')?.signalValue).toBeCloseTo(0.75, 10);
    expect(candidate(result, 'b1', 'Utility')?.sampleSize).toBe(4);
  });

  it('excludes chances at the player primary position from the Utility sample', () => {
    // b1 primary CF: 2 primary-CF chances (excluded) + 2 non-primary chances (1 success).
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      primaryPositionByPlayer: new Map([['b1', 'CF']]),
      fieldingEvents: [
        fielding({ playerId: 'b1', position: 'CF', success: true }),
        fielding({ playerId: 'b1', position: 'CF', success: false }),
        fielding({ playerId: 'b1', position: 'LF', success: true }),
        fielding({ playerId: 'b1', position: 'RF', success: false }),
      ],
    }));
    // Only the 2 non-primary chances count: 1 of 2 = 0.5 (CF chances excluded).
    expect(candidate(result, 'b1', 'Utility')?.signalValue).toBeCloseTo(0.5, 10);
    expect(candidate(result, 'b1', 'Utility')?.sampleSize).toBe(2);
  });

  it('emits NO Utility signal for a player absent from the primary-position map', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1', 'b2'], 'position'),
      // Only b1 has a primary; b2 is absent → b2 gets no Utility signal.
      primaryPositionByPlayer: new Map([['b1', 'CF']]),
      fieldingEvents: [
        fielding({ playerId: 'b1', position: 'LF', success: true }),
        fielding({ playerId: 'b2', position: 'LF', success: true }),
        fielding({ playerId: 'b2', position: 'RF', success: false }),
      ],
    }));
    expect(candidate(result, 'b1', 'Utility')).toBeDefined();
    expect(candidate(result, 'b2', 'Utility')).toBeUndefined();
  });

  it('emits NO Utility signal at all when the primary-position map is omitted', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      // No primaryPositionByPlayer → Utility dormant (deferred-wiring seam empty).
      fieldingEvents: [
        fielding({ playerId: 'b1', position: 'LF', success: true }),
        fielding({ playerId: 'b1', position: 'RF', success: true }),
      ],
    }));
    expect(candidate(result, 'b1', 'Utility')).toBeUndefined();
  });

  it('keeps Utility out of the pitcher pool (position-only role eligibility)', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: [{ playerId: 'pf1', role: 'pitcher' }],
      primaryPositionByPlayer: new Map([['pf1', 'P']]),
      fieldingEvents: [
        fielding({ playerId: 'pf1', position: '1B', success: true }),
        fielding({ playerId: 'pf1', position: '2B', success: true }),
      ],
    }));
    expect(candidate(result, 'pf1', 'Utility')).toBeUndefined();
  });

  it('skips undone fielding events for Utility', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      primaryPositionByPlayer: new Map([['b1', 'CF']]),
      fieldingEvents: [
        fielding({ playerId: 'b1', position: 'LF', success: true, undoneAt: 1 } as Partial<FieldingEvent>),
        fielding({ playerId: 'b1', position: 'LF', success: true }),
        fielding({ playerId: 'b1', position: 'RF', success: false }),
      ],
    }));
    // Undone non-primary success excluded: 1 of 2 = 0.5, not 2 of 3.
    expect(candidate(result, 'b1', 'Utility')?.signalValue).toBeCloseTo(0.5, 10);
    expect(candidate(result, 'b1', 'Utility')?.sampleSize).toBe(2);
  });
});

describe('R1-b2 L9b-2 seam (Utility / Crossed Up / Bunter feed computeTraitAcquisition)', () => {
  it('emits Bunter / Utility in the { traitName, score } shape the acquisition combiner consumes', () => {
    // Enough sample + peers so the valve can clear and a real percentile forms.
    const bunterEvents = [
      ...repeat(40, () => atBat({ batterId: 'b1', result: 'SAC', outsAfter: 1 })),
      ...repeat(40, () => atBat({ batterId: 'b2', result: 'GO', outsAfter: 1 })),
      ...repeat(40, () => atBat({ batterId: 'b3', result: 'GO', outsAfter: 1 })),
    ];
    const fieldingEvents = [
      ...Array.from({ length: 40 }, () => fielding({ playerId: 'b1', position: 'LF', success: true })),
      ...Array.from({ length: 40 }, () => fielding({ playerId: 'b2', position: 'LF', success: false })),
      ...Array.from({ length: 40 }, () => fielding({ playerId: 'b3', position: 'LF', success: true })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1', 'b2', 'b3'], 'position'),
      atBatEvents: bunterEvents,
      fieldingEvents,
      primaryPositionByPlayer: new Map([['b1', 'CF'], ['b2', 'CF'], ['b3', 'CF']]),
    }));
    const bunter = candidate(result, 'b1', 'Bunter');
    expect(bunter).toBeDefined();
    expect(bunter?.score).toBeDefined();
    expect(typeof bunter?.score.sufficient).toBe('boolean');

    const acquisition = computeTraitAcquisition({
      playerRole: 'position',
      personality: 'TOUGH',
      heldTraits: [],
      candidates: result.get('b1') ?? [],
    });
    expect(acquisition).toHaveProperty('proposals');
    expect(acquisition).toHaveProperty('skipped');
    for (const traitName of ['Bunter', 'Utility']) {
      const skip = acquisition.skipped.find((s) => s.traitName === traitName);
      expect(skip?.reason).not.toBe('ineligible_role');
      expect(skip?.reason).not.toBe('unknown_trait');
    }
  });

  it('emits Crossed Up in the seam shape for a pitcher (pitcher pool)', () => {
    const events = ['p1', 'p2', 'p3'].flatMap((pitcherId) =>
      repeat(40, () => atBat({ pitcherId, batterId: 'opp', result: 'GO', outsAfter: 1 })),
    );
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p1', 'p2', 'p3'], 'pitcher'),
      atBatEvents: events,
      betweenPlayEvents: [
        ...Array.from({ length: 8 }, () => passedBall('p1')),
        ...Array.from({ length: 4 }, () => passedBall('p2')),
      ],
    }));
    const crossedUp = candidate(result, 'p1', 'Crossed Up');
    expect(crossedUp).toBeDefined();
    expect(typeof crossedUp?.score.sufficient).toBe('boolean');

    const acquisition = computeTraitAcquisition({
      playerRole: 'pitcher',
      personality: 'COMPETITIVE',
      heldTraits: [],
      candidates: result.get('p1') ?? [],
    });
    const skip = acquisition.skipped.find((s) => s.traitName === 'Crossed Up');
    expect(skip?.reason).not.toBe('ineligible_role');
    expect(skip?.reason).not.toBe('unknown_trait');
  });
});

describe('R2 pitcher count-family (walks-allowed rate proxy)', () => {
  it('computes BB Prone / Falls Behind = walkRate and Composed / Gets Ahead = 1 − walkRate per BF', () => {
    const events = [
      ...repeat(2, () => atBat({ pitcherId: 'p1', batterId: 'opp', result: 'BB', outsAfter: 0 })),
      ...repeat(1, () => atBat({ pitcherId: 'p1', batterId: 'opp', result: 'IBB', outsAfter: 0 })),
      ...repeat(7, () => atBat({ pitcherId: 'p1', batterId: 'opp', result: 'GO', outsAfter: 1 })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p1'], 'pitcher'),
      atBatEvents: events,
    }));
    // walkRate = (2 BB + 1 IBB) / 10 BF = 0.3.
    expect(candidate(result, 'p1', 'BB Prone')?.signalValue).toBeCloseTo(0.3, 10);
    expect(candidate(result, 'p1', 'Falls Behind')?.signalValue).toBeCloseTo(0.3, 10);
    expect(candidate(result, 'p1', 'Composed')?.signalValue).toBeCloseTo(0.7, 10);
    expect(candidate(result, 'p1', 'Gets Ahead')?.signalValue).toBeCloseTo(0.7, 10);
    expect(candidate(result, 'p1', 'BB Prone')?.sampleSize).toBe(10);
    expect(candidate(result, 'p1', 'Gets Ahead')?.sampleSize).toBe(10);
  });

  it('keeps the high pair (BB Prone = Falls Behind) and the low pair (Composed = Gets Ahead) equal — shared signal', () => {
    const events = [
      ...repeat(4, () => atBat({ pitcherId: 'p1', batterId: 'opp', result: 'BB', outsAfter: 0 })),
      ...repeat(6, () => atBat({ pitcherId: 'p1', batterId: 'opp', result: 'GO', outsAfter: 1 })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p1'], 'pitcher'),
      atBatEvents: events,
    }));
    const bbProne = candidate(result, 'p1', 'BB Prone')?.signalValue;
    const fallsBehind = candidate(result, 'p1', 'Falls Behind')?.signalValue;
    const composed = candidate(result, 'p1', 'Composed')?.signalValue;
    const getsAhead = candidate(result, 'p1', 'Gets Ahead')?.signalValue;
    expect(bbProne).toBeCloseTo(0.4, 10);
    expect(fallsBehind).toBe(bbProne);
    expect(composed).toBeCloseTo(0.6, 10);
    expect(getsAhead).toBe(composed);
  });

  it('keeps the count-family pitcher-only (a position batter gets no count-family signal via role eligibility)', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: [{ playerId: 'b1', role: 'position' }],
      // b1 takes at-bats as a "pitcher" but is role=position → no count-family trait.
      atBatEvents: repeat(10, () => atBat({ pitcherId: 'b1', batterId: 'opp', result: 'BB', outsAfter: 0 })),
    }));
    expect(candidate(result, 'b1', 'BB Prone')).toBeUndefined();
    expect(candidate(result, 'b1', 'Composed')).toBeUndefined();
    expect(candidate(result, 'b1', 'Gets Ahead')).toBeUndefined();
    expect(candidate(result, 'b1', 'Falls Behind')).toBeUndefined();
  });

  it('skips undone at-bats when accumulating the walks-allowed rate', () => {
    const events = [
      atBat({ pitcherId: 'p1', batterId: 'opp', result: 'BB', outsAfter: 0, undoneAt: 1 }),
      ...repeat(3, () => atBat({ pitcherId: 'p1', batterId: 'opp', result: 'BB', outsAfter: 0 })),
      ...repeat(7, () => atBat({ pitcherId: 'p1', batterId: 'opp', result: 'GO', outsAfter: 1 })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p1'], 'pitcher'),
      atBatEvents: events,
    }));
    // The undone BB is excluded: 3 BB of 10 live BF, not 4 of 11.
    expect(candidate(result, 'p1', 'BB Prone')?.signalValue).toBeCloseTo(0.3, 10);
    expect(candidate(result, 'p1', 'BB Prone')?.sampleSize).toBe(10);
  });
});

function firstPitch(result: AtBatResult, overrides: Partial<AtBatEvent> = {}): AtBatEvent {
  return atBat({
    batterId: 'b1',
    result,
    outsAfter: isOutResult(result) ? 1 : 0,
    enrichment: { pitchesInAtBat: 1 },
    ...overrides,
  });
}

function isOutResult(result: AtBatResult): boolean {
  return ['GO', 'FO', 'FLO', 'LO', 'PO', 'DP', 'SF', 'SAC'].includes(result);
}

describe('R2 First Pitch Slayer / Prayer (hit vs out on logged first-pitch PAs)', () => {
  it('computes Slayer = hits/(hits+outs) and Prayer = outs/(hits+outs) over first-pitch PAs', () => {
    const events = [
      ...repeat(3, () => firstPitch('1B')),
      ...repeat(7, () => firstPitch('GO')),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: events,
    }));
    expect(candidate(result, 'b1', 'First Pitch Slayer')?.signalValue).toBeCloseTo(0.3, 10);
    expect(candidate(result, 'b1', 'First Pitch Prayer')?.signalValue).toBeCloseTo(0.7, 10);
    expect(candidate(result, 'b1', 'First Pitch Slayer')?.sampleSize).toBe(10);
    expect(candidate(result, 'b1', 'First Pitch Prayer')?.sampleSize).toBe(10);
  });

  it('makes Slayer + Prayer = 1 over the same hit-or-out denominator', () => {
    const events = [
      ...repeat(4, () => firstPitch('HR')),
      ...repeat(1, () => firstPitch('ITPHR')),
      ...repeat(5, () => firstPitch('FO')),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: events,
    }));
    const slayer = candidate(result, 'b1', 'First Pitch Slayer')?.signalValue ?? 0;
    const prayer = candidate(result, 'b1', 'First Pitch Prayer')?.signalValue ?? 0;
    expect(slayer).toBeCloseTo(0.5, 10);
    expect(slayer + prayer).toBeCloseTo(1, 10);
  });

  it('ignores at-bats that were not first-pitch PAs (pitchesInAtBat !== 1 or absent)', () => {
    const events = [
      ...repeat(2, () => firstPitch('1B')),
      // Not first-pitch: enrichment with 4 pitches — excluded.
      ...repeat(5, () => atBat({ batterId: 'b1', result: '1B', outsAfter: 0, enrichment: { pitchesInAtBat: 4 } })),
      // No enrichment at all — excluded.
      ...repeat(5, () => atBat({ batterId: 'b1', result: 'GO', outsAfter: 1 })),
      ...repeat(2, () => firstPitch('GO')),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: events,
    }));
    // Only the 4 first-pitch PAs count: 2 hits, 2 outs → 0.5 each.
    expect(candidate(result, 'b1', 'First Pitch Slayer')?.signalValue).toBeCloseTo(0.5, 10);
    expect(candidate(result, 'b1', 'First Pitch Slayer')?.sampleSize).toBe(4);
  });

  it('excludes a first-pitch HBP / reached-on-error (neither a hit nor an out)', () => {
    const events = [
      ...repeat(3, () => firstPitch('1B')),
      ...repeat(1, () => firstPitch('GO')),
      // First-pitch HBP and E — neither hit nor out → excluded from the denominator.
      firstPitch('HBP', { outsAfter: 0 }),
      firstPitch('E', { outsAfter: 0 }),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: events,
    }));
    // 3 hits + 1 out = 4 hit-or-out PAs (HBP and E excluded): Slayer = 0.75.
    expect(candidate(result, 'b1', 'First Pitch Slayer')?.signalValue).toBeCloseTo(0.75, 10);
    expect(candidate(result, 'b1', 'First Pitch Slayer')?.sampleSize).toBe(4);
  });

  it('keeps the First-Pitch pair position-only (a pitcher batter gets no signal via role eligibility)', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: [{ playerId: 'p1', role: 'pitcher' }],
      atBatEvents: [
        ...repeat(5, () => firstPitch('1B', { batterId: 'p1' })),
        ...repeat(5, () => firstPitch('GO', { batterId: 'p1' })),
      ],
    }));
    expect(candidate(result, 'p1', 'First Pitch Slayer')).toBeUndefined();
    expect(candidate(result, 'p1', 'First Pitch Prayer')).toBeUndefined();
  });

  it('skips undone first-pitch PAs', () => {
    const events = [
      firstPitch('1B', { undoneAt: 1 }),
      ...repeat(2, () => firstPitch('1B')),
      ...repeat(2, () => firstPitch('GO')),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: events,
    }));
    // The undone hit is excluded: 2 hits, 2 outs = 0.5 (not 3/5).
    expect(candidate(result, 'b1', 'First Pitch Slayer')?.signalValue).toBeCloseTo(0.5, 10);
    expect(candidate(result, 'b1', 'First Pitch Slayer')?.sampleSize).toBe(4);
  });
});

describe('R2 handedness platoon splits (DORMANT until the handedness maps are threaded)', () => {
  it('emits NO handedness split signal when the pitcherHand map is omitted (all 6 dormant)', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: [...players(['b1'], 'position'), ...players(['p1'], 'pitcher')],
      atBatEvents: [
        ...repeat(5, () => atBat({ batterId: 'b1', pitcherId: 'p1', result: 'K' })),
        ...repeat(5, () => atBat({ batterId: 'b1', pitcherId: 'p1', result: '1B', outsAfter: 0 })),
      ],
      // No pitcherHandByPlayer / batterHandByPlayer → handedness splits dormant.
    }));
    expect(candidate(result, 'b1', 'CON vs LHP')).toBeUndefined();
    expect(candidate(result, 'b1', 'CON vs RHP')).toBeUndefined();
    expect(candidate(result, 'b1', 'POW vs LHP')).toBeUndefined();
    expect(candidate(result, 'b1', 'POW vs RHP')).toBeUndefined();
    expect(candidate(result, 'p1', 'Specialist')).toBeUndefined();
    expect(candidate(result, 'p1', 'Reverse Splits')).toBeUndefined();
  });

  it('emits NO handedness split signal when the pitcherHand map is present but empty', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: repeat(10, () => atBat({ batterId: 'b1', pitcherId: 'p1', result: 'K' })),
      pitcherHandByPlayer: new Map(),
    }));
    expect(candidate(result, 'b1', 'CON vs LHP')).toBeUndefined();
    expect(candidate(result, 'b1', 'CON vs RHP')).toBeUndefined();
  });

  it('computes CON vs LHP / CON vs RHP = 1 − K/PA bucketed by the opposing pitcher hand', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: [
        // vs LHP (pL): 2 K of 10 PA → CON vs LHP = 0.8.
        ...repeat(2, () => atBat({ batterId: 'b1', pitcherId: 'pL', result: 'K' })),
        ...repeat(8, () => atBat({ batterId: 'b1', pitcherId: 'pL', result: 'GO', outsAfter: 1 })),
        // vs RHP (pR): 6 K of 10 PA → CON vs RHP = 0.4.
        ...repeat(6, () => atBat({ batterId: 'b1', pitcherId: 'pR', result: 'K' })),
        ...repeat(4, () => atBat({ batterId: 'b1', pitcherId: 'pR', result: 'GO', outsAfter: 1 })),
      ],
      pitcherHandByPlayer: new Map([['pL', 'L'], ['pR', 'R']]),
    }));
    expect(candidate(result, 'b1', 'CON vs LHP')?.signalValue).toBeCloseTo(0.8, 10);
    expect(candidate(result, 'b1', 'CON vs LHP')?.sampleSize).toBe(10);
    expect(candidate(result, 'b1', 'CON vs RHP')?.signalValue).toBeCloseTo(0.4, 10);
    expect(candidate(result, 'b1', 'CON vs RHP')?.sampleSize).toBe(10);
  });

  it('computes POW vs LHP / POW vs RHP = ISO (TB − H)/AB bucketed by the opposing pitcher hand', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: [
        // vs LHP: 2 HR + 8 GO. AB = 10, TB = 8, H = 2 → ISO = (8−2)/10 = 0.6.
        ...repeat(2, () => atBat({ batterId: 'b1', pitcherId: 'pL', result: 'HR', outsAfter: 0 })),
        ...repeat(8, () => atBat({ batterId: 'b1', pitcherId: 'pL', result: 'GO', outsAfter: 1 })),
        // vs RHP: 2 walks (non-AB) + 1 single + 7 GO. AB = 8, TB = 1, H = 1 → ISO = 0.
        ...repeat(2, () => atBat({ batterId: 'b1', pitcherId: 'pR', result: 'BB', outsAfter: 0 })),
        ...repeat(1, () => atBat({ batterId: 'b1', pitcherId: 'pR', result: '1B', outsAfter: 0 })),
        ...repeat(7, () => atBat({ batterId: 'b1', pitcherId: 'pR', result: 'GO', outsAfter: 1 })),
      ],
      pitcherHandByPlayer: new Map([['pL', 'L'], ['pR', 'R']]),
    }));
    expect(candidate(result, 'b1', 'POW vs LHP')?.signalValue).toBeCloseTo(0.6, 10);
    expect(candidate(result, 'b1', 'POW vs LHP')?.sampleSize).toBe(10);
    expect(candidate(result, 'b1', 'POW vs RHP')?.signalValue).toBeCloseTo(0, 10);
    // AB excludes the 2 walks → 8.
    expect(candidate(result, 'b1', 'POW vs RHP')?.sampleSize).toBe(8);
  });

  it('computes Specialist = 1 − BAA same-hand and Reverse Splits = 1 − BAA opposite-hand for a pitcher', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['pR'], 'pitcher'),
      atBatEvents: [
        // pR is R-handed. Same-hand cohort = R batters (bR): 2 hits of 10 AB → BAA 0.2 → Specialist 0.8.
        ...repeat(2, () => atBat({ pitcherId: 'pR', batterId: 'bR', result: '1B', outsAfter: 0 })),
        ...repeat(8, () => atBat({ pitcherId: 'pR', batterId: 'bR', result: 'GO', outsAfter: 1 })),
        // Opposite-hand cohort = L batters (bL): 5 hits of 10 AB → BAA 0.5 → Reverse Splits 0.5.
        ...repeat(5, () => atBat({ pitcherId: 'pR', batterId: 'bL', result: '1B', outsAfter: 0 })),
        ...repeat(5, () => atBat({ pitcherId: 'pR', batterId: 'bL', result: 'GO', outsAfter: 1 })),
      ],
      pitcherHandByPlayer: new Map([['pR', 'R']]),
      batterHandByPlayer: new Map([['bR', 'R'], ['bL', 'L']]),
    }));
    expect(candidate(result, 'pR', 'Specialist')?.signalValue).toBeCloseTo(0.8, 10);
    expect(candidate(result, 'pR', 'Specialist')?.sampleSize).toBe(10);
    expect(candidate(result, 'pR', 'Reverse Splits')?.signalValue).toBeCloseTo(0.5, 10);
    expect(candidate(result, 'pR', 'Reverse Splits')?.sampleSize).toBe(10);
  });

  it('excludes switch hitters (batterHand === "S") from the Specialist / Reverse cohorts', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['pR'], 'pitcher'),
      atBatEvents: [
        // Same-hand R cohort: 1 hit of 5 AB → BAA 0.2 → Specialist 0.8.
        ...repeat(1, () => atBat({ pitcherId: 'pR', batterId: 'bR', result: '1B', outsAfter: 0 })),
        ...repeat(4, () => atBat({ pitcherId: 'pR', batterId: 'bR', result: 'GO', outsAfter: 1 })),
        // Switch hitter bS — ALL hits, but must NOT distort either cohort.
        ...repeat(10, () => atBat({ pitcherId: 'pR', batterId: 'bS', result: 'HR', outsAfter: 0 })),
      ],
      pitcherHandByPlayer: new Map([['pR', 'R']]),
      batterHandByPlayer: new Map([['bR', 'R'], ['bS', 'S']]),
    }));
    // Specialist sees only the 5 bR AB (switch hitter excluded): BAA 0.2 → 0.8.
    expect(candidate(result, 'pR', 'Specialist')?.signalValue).toBeCloseTo(0.8, 10);
    expect(candidate(result, 'pR', 'Specialist')?.sampleSize).toBe(5);
    // No opposite-hand AB at all → Reverse Splits dormant.
    expect(candidate(result, 'pR', 'Reverse Splits')).toBeUndefined();
  });

  it('skips at-bats whose pitcher hand is absent from the map (batter splits)', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: [
        // pL mapped L: 1 K of 5 → CON vs LHP = 0.8.
        ...repeat(1, () => atBat({ batterId: 'b1', pitcherId: 'pL', result: 'K' })),
        ...repeat(4, () => atBat({ batterId: 'b1', pitcherId: 'pL', result: 'GO', outsAfter: 1 })),
        // pUnknown absent from the map → these are skipped entirely.
        ...repeat(10, () => atBat({ batterId: 'b1', pitcherId: 'pUnknown', result: 'K' })),
      ],
      pitcherHandByPlayer: new Map([['pL', 'L']]),
    }));
    expect(candidate(result, 'b1', 'CON vs LHP')?.signalValue).toBeCloseTo(0.8, 10);
    expect(candidate(result, 'b1', 'CON vs LHP')?.sampleSize).toBe(5);
    // No R-handed pitcher in the map → CON vs RHP dormant.
    expect(candidate(result, 'b1', 'CON vs RHP')).toBeUndefined();
  });

  it('skips undone at-bats in the handedness buckets', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: [
        atBat({ batterId: 'b1', pitcherId: 'pL', result: 'K', undoneAt: 1 }),
        ...repeat(2, () => atBat({ batterId: 'b1', pitcherId: 'pL', result: 'K' })),
        ...repeat(8, () => atBat({ batterId: 'b1', pitcherId: 'pL', result: 'GO', outsAfter: 1 })),
      ],
      pitcherHandByPlayer: new Map([['pL', 'L']]),
    }));
    // The undone K is excluded: 2 K of 10 → CON vs LHP = 0.8 (not 3/11).
    expect(candidate(result, 'b1', 'CON vs LHP')?.signalValue).toBeCloseTo(0.8, 10);
    expect(candidate(result, 'b1', 'CON vs LHP')?.sampleSize).toBe(10);
  });

  it('keeps the splits role-bucketed (CON/POW position-only, Specialist/Reverse pitcher-only)', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: [{ playerId: 'b1', role: 'position' }, { playerId: 'pR', role: 'pitcher' }],
      atBatEvents: [
        // b1 is L-handed vs R-handed pR → the OPPOSITE cohort (Reverse Splits) for pR.
        ...repeat(10, () => atBat({ batterId: 'b1', pitcherId: 'pR', result: 'GO', outsAfter: 1 })),
      ],
      pitcherHandByPlayer: new Map([['pR', 'R']]),
      batterHandByPlayer: new Map([['b1', 'L']]),
    }));
    // Position batter is eligible for CON/POW, NOT for the pitcher Specialist/Reverse.
    expect(candidate(result, 'b1', 'CON vs RHP')).toBeDefined();
    expect(candidate(result, 'b1', 'Reverse Splits')).toBeUndefined();
    // Pitcher is eligible for Specialist/Reverse (here the opposite-hand cohort →
    // Reverse Splits), NOT for the position CON/POW splits.
    expect(candidate(result, 'pR', 'Reverse Splits')).toBeDefined();
    expect(candidate(result, 'pR', 'CON vs RHP')).toBeUndefined();
  });
});

describe('R2 L9b-2 seam (count-family + First-Pitch + handedness feed computeTraitAcquisition)', () => {
  it('emits the count-family in the { traitName, score } shape the acquisition combiner consumes', () => {
    // Three pitchers with different walk rates → a real pitcher peer pool.
    const events = [
      ...repeat(20, () => atBat({ pitcherId: 'p1', batterId: 'opp', result: 'BB', outsAfter: 0 })),
      ...repeat(20, () => atBat({ pitcherId: 'p1', batterId: 'opp', result: 'GO', outsAfter: 1 })),
      ...repeat(5, () => atBat({ pitcherId: 'p2', batterId: 'opp', result: 'BB', outsAfter: 0 })),
      ...repeat(35, () => atBat({ pitcherId: 'p2', batterId: 'opp', result: 'GO', outsAfter: 1 })),
      ...repeat(40, () => atBat({ pitcherId: 'p3', batterId: 'opp', result: 'GO', outsAfter: 1 })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p1', 'p2', 'p3'], 'pitcher'),
      atBatEvents: events,
    }));
    const bbProne = candidate(result, 'p1', 'BB Prone');
    expect(bbProne).toBeDefined();
    expect(typeof bbProne?.score.sufficient).toBe('boolean');

    const acquisition = computeTraitAcquisition({
      playerRole: 'pitcher',
      personality: 'TIMID',
      heldTraits: [],
      candidates: result.get('p1') ?? [],
    });
    expect(acquisition).toHaveProperty('proposals');
    expect(acquisition).toHaveProperty('skipped');
    for (const traitName of ['BB Prone', 'Composed', 'Gets Ahead', 'Falls Behind']) {
      const skip = acquisition.skipped.find((s) => s.traitName === traitName);
      expect(skip?.reason).not.toBe('ineligible_role');
      expect(skip?.reason).not.toBe('unknown_trait');
    }
  });

  it('emits the First-Pitch pair in the seam shape for a position player', () => {
    const events = ['b1', 'b2', 'b3'].flatMap((batterId, index) => [
      ...repeat(index + 1, () => firstPitch('1B', { batterId })),
      ...repeat(40 - (index + 1), () => firstPitch('GO', { batterId })),
    ]);
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1', 'b2', 'b3'], 'position'),
      atBatEvents: events,
    }));
    const slayer = candidate(result, 'b1', 'First Pitch Slayer');
    expect(slayer).toBeDefined();
    expect(typeof slayer?.score.sufficient).toBe('boolean');

    const acquisition = computeTraitAcquisition({
      playerRole: 'position',
      personality: 'COMPETITIVE',
      heldTraits: [],
      candidates: result.get('b1') ?? [],
    });
    for (const traitName of ['First Pitch Slayer', 'First Pitch Prayer']) {
      const skip = acquisition.skipped.find((s) => s.traitName === traitName);
      expect(skip?.reason).not.toBe('ineligible_role');
      expect(skip?.reason).not.toBe('unknown_trait');
    }
  });
});

describe('R1-b3 Two Way (C) (pitcher batting wOBA earn-signal)', () => {
  // A pitcher who rakes vs a pitcher who can't hit. wOBA ranks the well-hitting
  // pitcher higher; the position-player pool never sees Two Way (C) (pitcher-only).
  it('emits a higher Two Way (C) wOBA for a well-hitting pitcher than a poor-hitting one', () => {
    const events = [
      // p1 mashes: 5 HR + 5 1B over 10 PA (all AB).
      ...repeat(5, () => atBat({ pitcherId: 'opp', batterId: 'p1', result: 'HR', outsAfter: 0 })),
      ...repeat(5, () => atBat({ pitcherId: 'opp', batterId: 'p1', result: '1B', outsAfter: 0 })),
      // p2 flails: 10 strikeouts over 10 PA.
      ...repeat(10, () => atBat({ pitcherId: 'opp', batterId: 'p2', result: 'K' })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p1', 'p2'], 'pitcher'),
      atBatEvents: events,
    }));
    const good = candidate(result, 'p1', 'Two Way (C)');
    const bad = candidate(result, 'p2', 'Two Way (C)');
    expect(good).toBeDefined();
    expect(bad).toBeDefined();
    // sampleSize = batting PA.
    expect(good?.sampleSize).toBe(10);
    expect(bad?.sampleSize).toBe(10);
    // The signal is the batting wOBA; the masher outranks the whiffer.
    expect(good!.signalValue).toBeGreaterThan(bad!.signalValue);
    // The poor hitter (no AB reaching base) has wOBA 0.
    expect(bad?.signalValue).toBeCloseTo(0, 10);
  });

  it('computes Two Way (C) signalValue = calculateWOBA over the mapped batting line', () => {
    // A mixed line exercising every mapping branch: 1B, GRD(→double), 3B, ITPHR(→HR),
    // BB, IBB, HBP, SF, SAC, K, DP, plus a plain GO (an out / AB / non-hit).
    const events = [
      atBat({ pitcherId: 'opp', batterId: 'p1', result: '1B', outsAfter: 0 }),
      atBat({ pitcherId: 'opp', batterId: 'p1', result: 'GRD', outsAfter: 0 }),
      atBat({ pitcherId: 'opp', batterId: 'p1', result: '3B', outsAfter: 0 }),
      atBat({ pitcherId: 'opp', batterId: 'p1', result: 'ITPHR', outsAfter: 0 }),
      atBat({ pitcherId: 'opp', batterId: 'p1', result: 'BB', outsAfter: 0 }),
      atBat({ pitcherId: 'opp', batterId: 'p1', result: 'IBB', outsAfter: 0 }),
      atBat({ pitcherId: 'opp', batterId: 'p1', result: 'HBP', outsAfter: 0 }),
      atBat({ pitcherId: 'opp', batterId: 'p1', result: 'SF', outsAfter: 1 }),
      atBat({ pitcherId: 'opp', batterId: 'p1', result: 'SAC', outsAfter: 1 }),
      atBat({ pitcherId: 'opp', batterId: 'p1', result: 'K' }),
      atBat({ pitcherId: 'opp', batterId: 'p1', result: 'DP', outsAfter: 1 }),
      atBat({ pitcherId: 'opp', batterId: 'p1', result: 'GO', outsAfter: 1 }),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p1'], 'pitcher'),
      atBatEvents: events,
    }));
    // PA = 12; nonAb = BB+IBB+HBP+SF+SAC = 5 → AB = 7. hits = 1B + (GRD=double) + 3B + (ITPHR=HR) = 4.
    const expected = calculateWOBA({
      pa: 12,
      ab: 7,
      hits: 4,
      singles: 1,
      doubles: 1,
      triples: 1,
      homeRuns: 1,
      walks: 2,            // BB + IBB
      intentionalWalks: 1, // IBB
      hitByPitch: 1,
      sacFlies: 1,
      sacBunts: 1,
      strikeouts: 1,       // K
      gidp: 1,             // DP
      stolenBases: 0,
      caughtStealing: 0,
    });
    expect(candidate(result, 'p1', 'Two Way (C)')?.signalValue).toBeCloseTo(expected, 10);
    expect(candidate(result, 'p1', 'Two Way (C)')?.sampleSize).toBe(12);
  });

  it('keeps Two Way (C) out of the position pool (pitcher-only role eligibility)', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      // b1 is a POSITION player who batted — must get NO Two Way (C).
      players: players(['b1'], 'position'),
      atBatEvents: repeat(10, () => atBat({ pitcherId: 'opp', batterId: 'b1', result: 'HR', outsAfter: 0 })),
    }));
    expect(candidate(result, 'b1', 'Two Way (C)')).toBeUndefined();
  });

  it('only emits Two Way (C) for a player whose role is pitcher (not by batting alone)', () => {
    // p1 (pitcher) and b1 (position) both bat identically; only p1 earns the signal.
    const result = computeSeasonTraitCandidates(baseInput({
      players: [{ playerId: 'p1', role: 'pitcher' }, { playerId: 'b1', role: 'position' }],
      atBatEvents: [
        ...repeat(10, () => atBat({ pitcherId: 'opp', batterId: 'p1', result: 'HR', outsAfter: 0 })),
        ...repeat(10, () => atBat({ pitcherId: 'opp', batterId: 'b1', result: 'HR', outsAfter: 0 })),
      ],
    }));
    expect(candidate(result, 'p1', 'Two Way (C)')).toBeDefined();
    expect(candidate(result, 'b1', 'Two Way (C)')).toBeUndefined();
  });

  it('skips undone at-bats when accumulating the pitcher batting line', () => {
    const events = [
      atBat({ pitcherId: 'opp', batterId: 'p1', result: 'HR', outsAfter: 0, undoneAt: 1 }),
      ...repeat(5, () => atBat({ pitcherId: 'opp', batterId: 'p1', result: '1B', outsAfter: 0 })),
      ...repeat(5, () => atBat({ pitcherId: 'opp', batterId: 'p1', result: 'GO', outsAfter: 1 })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p1'], 'pitcher'),
      atBatEvents: events,
    }));
    // The undone HR is excluded: 10 live PA, 5 singles of 10 AB.
    const expected = calculateWOBA({
      pa: 10,
      ab: 10,
      hits: 5,
      singles: 5,
      doubles: 0,
      triples: 0,
      homeRuns: 0,
      walks: 0,
      intentionalWalks: 0,
      hitByPitch: 0,
      sacFlies: 0,
      sacBunts: 0,
      strikeouts: 0,
      gidp: 0,
      stolenBases: 0,
      caughtStealing: 0,
    });
    expect(candidate(result, 'p1', 'Two Way (C)')?.signalValue).toBeCloseTo(expected, 10);
    expect(candidate(result, 'p1', 'Two Way (C)')?.sampleSize).toBe(10);
  });

  it('goes dormant for a pitcher under the valve PA floor (< minSampleRate of 10 batting PA)', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p1'], 'pitcher'),
      // Only 5 batting PA → below the basis:'none' floor of 10 → not sufficient.
      atBatEvents: repeat(5, () => atBat({ pitcherId: 'opp', batterId: 'p1', result: 'HR', outsAfter: 0 })),
    }));
    const twoWay = candidate(result, 'p1', 'Two Way (C)');
    // The signal still emits (PA > 0) but the valve marks it dormant.
    expect(twoWay).toBeDefined();
    expect(twoWay?.sampleSize).toBe(5);
    expect(twoWay?.score.sufficiency).not.toBe('sufficient');
    expect(twoWay?.score.realityPercentile).toBeNull();
  });

  it('does NOT make Two Way (IF) / Two Way (OF) buildable (only the (C) representative)', () => {
    expect(BUILDABLE_TRAITS).toContain('Two Way (C)');
    expect(BUILDABLE_TRAITS).not.toContain('Two Way (IF)');
    expect(BUILDABLE_TRAITS).not.toContain('Two Way (OF)');
  });

  it('feeds Two Way (C) through the L9b-2 seam to computeTraitAcquisition (pitcher pool)', () => {
    // Three hitting pitchers → a real pitcher peer pool + enough PA to clear the valve.
    const events = [
      ...repeat(40, () => atBat({ pitcherId: 'opp', batterId: 'p1', result: 'HR', outsAfter: 0 })),
      ...repeat(20, () => atBat({ pitcherId: 'opp', batterId: 'p2', result: '1B', outsAfter: 0 })),
      ...repeat(20, () => atBat({ pitcherId: 'opp', batterId: 'p2', result: 'GO', outsAfter: 1 })),
      ...repeat(40, () => atBat({ pitcherId: 'opp', batterId: 'p3', result: 'K' })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p1', 'p2', 'p3'], 'pitcher'),
      atBatEvents: events,
    }));
    const twoWay = candidate(result, 'p1', 'Two Way (C)');
    expect(twoWay).toBeDefined();
    expect(twoWay?.score).toBeDefined();
    expect(typeof twoWay?.score.sufficient).toBe('boolean');

    const acquisition = computeTraitAcquisition({
      playerRole: 'pitcher',
      personality: 'EGOTISTICAL',
      heldTraits: [],
      candidates: result.get('p1') ?? [],
    });
    expect(acquisition).toHaveProperty('proposals');
    expect(acquisition).toHaveProperty('skipped');
    const skip = acquisition.skipped.find((s) => s.traitName === 'Two Way (C)');
    expect(skip?.reason).not.toBe('ineligible_role');
    expect(skip?.reason).not.toBe('unknown_trait');
  });
});

describe('role eligibility, peer pools, valve, and determinism', () => {
  it('does not emit role-ineligible candidates', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: [{ playerId: 'p1', role: 'pitcher' }, { playerId: 'b1', role: 'position' }],
      atBatEvents: [
        atBat({ batterId: 'p1', runners: runners(['second']), rbiCount: 1 }),
        atBat({ pitcherId: 'b1', result: '1B', outsAfter: 0 }),
      ],
    }));
    expect(candidate(result, 'p1', 'RBI Hero')).toBeUndefined();
    expect(candidate(result, 'b1', 'Meltdown')).toBeUndefined();
  });

  it('keeps pitcher and position peer pools separate for universal traits', () => {
    const pitcherEvents = ['p1', 'p2', 'p3'].flatMap((pitcherId, pIndex) => (
      repeat(10, (index) => atBat({
        pitcherId,
        batterId: `bp-${pitcherId}-${index}`,
        isClutch: true,
        fieldingTeamDelta: index < pIndex + 1 ? 0.2 : -0.2,
      }))
    ));
    const positionEvents = repeat(10, (index) => atBat({
      batterId: 'b1',
      pitcherId: `pb-${index}`,
      isClutch: true,
      battingTeamDelta: index < 9 ? 0.2 : -0.2,
    }));
    const result = computeSeasonTraitCandidates(baseInput({
      players: [...players(['p1', 'p2', 'p3'], 'pitcher'), ...players(['b1'], 'position')],
      atBatEvents: [...pitcherEvents, ...positionEvents],
    }));
    expect(candidate(result, 'p1', 'Clutch')?.score.peerPoolSize).toBe(3);
    expect(candidate(result, 'b1', 'Clutch')?.score.peerPoolSize).toBe(1);
  });

  it('lets the scorer valve mark thin samples dormant', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: [atBat({ batterId: 'b1', isClutch: true, battingTeamDelta: 0.2 })],
    }));
    expect(candidate(result, 'b1', 'Clutch')?.score.realityPercentile).toBeNull();
    expect(candidate(result, 'b1', 'Clutch')?.score.sufficiency).not.toBe('sufficient');
  });

  it('returns a stable sorted map and deterministic contents across calls', () => {
    const input = baseInput({
      players: [{ playerId: 'z', role: 'position' }, { playerId: 'a', role: 'position' }],
      betweenPlayEvents: [steal('z', true), steal('a', false)],
    });
    const first = computeSeasonTraitCandidates(input);
    const second = computeSeasonTraitCandidates(input);
    expect([...first.keys()]).toEqual(['a', 'z']);
    expect(first).toEqual(second);
  });
});

describe('L9b-2 seam (output feeds computeTraitAcquisition directly)', () => {
  it('emits the { traitName, score } shape computeTraitAcquisition consumes', () => {
    // Enough clutch sample to clear the valve, plus peers for a real percentile.
    const events = [
      ...repeat(60, () => atBat({ batterId: 'b1', isClutch: true, battingTeamDelta: 0.2, wpa: 0.2 })),
      ...repeat(60, () => atBat({ batterId: 'b2', isClutch: true, battingTeamDelta: -0.2, wpa: -0.2 })),
      ...repeat(60, () => atBat({ batterId: 'b3', isClutch: true, battingTeamDelta: 0.05, wpa: 0.05 })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1', 'b2', 'b3'], 'position'),
      atBatEvents: events,
    }));
    const b1 = candidate(result, 'b1', 'Clutch');
    expect(b1).toBeDefined();
    // The seam: each candidate carries a nested `score: TraitRealityScore`.
    expect(b1?.score).toBeDefined();
    expect(typeof b1?.score.sufficient).toBe('boolean');

    // The actual seam call: L9b-3a output array → L9b-2 input WITHOUT an adapter.
    const acquisition = computeTraitAcquisition({
      playerRole: 'position',
      personality: 'COMPETITIVE',
      heldTraits: [],
      candidates: result.get('b1') ?? [],
    });
    expect(acquisition).toHaveProperty('proposals');
    expect(acquisition).toHaveProperty('skipped');
    // A strong clutch performer in a real pool should not be dropped for a bad
    // reason (ineligible/unknown); it is either proposed or dead-banded/thin.
    const clutchSkip = acquisition.skipped.find((s) => s.traitName === 'Clutch');
    expect(clutchSkip?.reason).not.toBe('ineligible_role');
    expect(clutchSkip?.reason).not.toBe('unknown_trait');
  });
});
