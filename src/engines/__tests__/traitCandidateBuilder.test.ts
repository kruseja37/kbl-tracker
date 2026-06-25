import { describe, expect, it } from 'vitest';
import { activeTraitNames } from '../effectiveRatings';
import {
  BUILDABLE_TRAITS,
  FAILED_ROBBERY_BUTTER_FINGERS_WEIGHT,
  HITTER_PITCH_OUTCOME_WEIGHTS,
  PITCHER_PITCH_OUTCOME_WEIGHTS,
  PITCH_OUTCOME_CLASSES,
  PITCH_OUTCOME_RESULTS_BY_CLASS,
  buildRawSignals,
  classifyPitchOutcome,
  computeSeasonTraitCandidates,
  reconstructAtBatContext,
  type AtBatContextRunningState,
  type SeasonTraitCandidate,
  type SeasonTraitCandidateInput,
  type SeasonTraitPlayer,
} from '../traitCandidateBuilder';
import { CANONICAL_TRAIT_NAMES, type TraitRealityScore } from '../traitRealityScorer';
import { computeTraitAcquisition } from '../traitAcquisition';
import { calculateWOBA } from '../bwarCalculator';
import type { Smb4Grade } from '../smb4GradeEmulator';
import type { EffectiveRatingsPlayer, GameContext } from '../effectiveRatings';
import type { AtBatEvent, BetweenPlayEvent, ErrorAttribution, FieldingEvent, RunnerState } from '../../utils/eventLog';
import type { AtBatResult } from '../../types/game';
import { computeTraitWeight } from '../../data/traitTierConfig';

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

function wildPitch(pitcherId: string, overrides: Partial<BetweenPlayEvent> = {}): BetweenPlayEvent {
  bpIndex += 1;
  return {
    eventId: `bp-${bpIndex}`,
    gameId: 'g1',
    timestamp: bpIndex,
    eventIndex: bpIndex,
    type: 'wild_pitch',
    wildPitchOrPassedBall: { wpOrPb: 'wild_pitch', pitcherId },
    ...overrides,
  } as unknown as BetweenPlayEvent;
}

function errorAdvance(attributions: ErrorAttribution[], overrides: Partial<BetweenPlayEvent> = {}): BetweenPlayEvent {
  bpIndex += 1;
  return {
    eventId: `bp-${bpIndex}`,
    gameId: 'g1',
    timestamp: bpIndex,
    eventIndex: bpIndex,
    type: 'runner_advance',
    errorAttributions: attributions,
    ...overrides,
  } as unknown as BetweenPlayEvent;
}

function mojoChange(
  playerId: string,
  previousValue: string | number,
  newValue: string | number,
  overrides: Partial<BetweenPlayEvent> = {},
): BetweenPlayEvent {
  bpIndex += 1;
  return {
    eventId: `bp-${bpIndex}`,
    gameId: 'g1',
    timestamp: bpIndex,
    eventIndex: bpIndex,
    type: 'mojo_change',
    playerStateChange: {
      playerId,
      playerName: playerId,
      stateType: 'mojo',
      previousValue,
      newValue,
    },
    ...overrides,
  } as unknown as BetweenPlayEvent;
}

function runnerError(type: ErrorAttribution['type'], fielderIds: string[]): AtBatEvent {
  return atBat({
    runnerOutcomes: [{
      runnerId: 'r1',
      runnerName: 'Runner 1',
      fromBase: 'first',
      toBase: 'second',
      errorAttributions: [{ type, fielderIds }],
    }],
  });
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

function acquisitionScore(traitName: string, realityPercentile: number): TraitRealityScore {
  return {
    traitName,
    realityPercentile,
    sufficient: true,
    sufficiency: 'sufficient',
    scaledMinSample: 10,
    peerPoolSize: 10,
  };
}

function repeat(count: number, fn: (index: number) => AtBatEvent): AtBatEvent[] {
  return Array.from({ length: count }, (_, index) => fn(index));
}

// PRE-ACT-TRAITS-1: a test-local re-derivation of the builder's deterministic Two Way
// variant seed (FNV-1a 32-bit of playerId mod 3 → C/IF/OF). Re-computed here rather
// than imported so the test independently PINS the expected variant for a fixed id.
const TWO_WAY_VARIANTS_TEST = ['Two Way (C)', 'Two Way (IF)', 'Two Way (OF)'] as const;
function fnv1a(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function expectedTwoWayVariant(playerId: string): (typeof TWO_WAY_VARIANTS_TEST)[number] {
  return TWO_WAY_VARIANTS_TEST[fnv1a(playerId) % 3];
}

const ALL_AT_BAT_RESULTS: readonly AtBatResult[] = [
  '1B',
  '2B',
  '3B',
  'HR',
  'ITPHR',
  'BB',
  'IBB',
  'K',
  'Kc',
  'Ꝁ',
  'GO',
  'FO',
  'FLO',
  'LO',
  'PO',
  'DP',
  'TP',
  'SF',
  'SAC',
  'HBP',
  'E',
  'FC',
  'D3K',
  'WP_K',
  'PB_K',
  'GRD',
];

const T9B_PITCH_TYPE_TRAITS = [
  'Elite 4F',
  'Elite 2F',
  'Elite CF',
  'Elite CB',
  'Elite CH',
  'Elite FK',
  'Elite SB',
  'Elite SL',
  'Fastball Hitter',
  'Off-Speed Hitter',
] as const;

const DTB_PITCH_LOCATION_TRAITS = [
  'High Pitch',
  'Low Pitch',
  'Inside Pitch',
  'Outside Pitch',
] as const;

const DTC1_CHASE_TRAITS = [
  'Bad Ball Hitter',
] as const;

const DTC2_WEB_GEM_TRAITS = [
  'Magic Hands',
  'Dive Wizard',
] as const;

const DTD_ERROR_TRAITS = [
  'Wild Thrower',
  'Noodle Arm',
] as const;

const DTE_MOJO_TRAITS = [
  'Volatile',
  'Consistent',
] as const;

const DTF1_BESPOKE_TRAITS = [
  'Base Jogger',
  'Wild Thing',
] as const;

const DTF2_BESPOKE_TRAITS = [
  'Workhorse',
] as const;

const DTF3_BESPOKE_TRAITS = [
  'Metal Head',
] as const;

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
      // R1-b3 / PRE-ACT-TRAITS-1: Two Way earn-signal (pitcher batting wOBA). Full
      // C/IF/OF family — each pitcher's variant seeded by FNV-1a(playerId) mod 3; all
      // three pool together as ONE 'Two Way' family.
      'Two Way (C)',
      'Two Way (IF)',
      'Two Way (OF)',
      // R3: Ace Exterminator (reached-base rate vs A−+ opposing pitchers).
      'Ace Exterminator',
      // T-9b: per-pitch-type net-quality earn-signals.
      'Elite 4F',
      'Elite 2F',
      'Elite CF',
      'Elite CB',
      'Elite CH',
      'Elite FK',
      'Elite SB',
      'Elite SL',
      'Fastball Hitter',
      'Off-Speed Hitter',
      // DT-B: per-pitch-location net-quality earn-signals.
      'High Pitch',
      'Low Pitch',
      'Inside Pitch',
      'Outside Pitch',
      // DT-C1: Bad Ball Hitter chase hit-rate earn-signal.
      'Bad Ball Hitter',
      // DT-C2: web-gem fielding earn-signals with rating-gated cohorts.
      'Magic Hands',
      'Dive Wizard',
      // DT-D: error-attribution earn-signals.
      'Wild Thrower',
      'Noodle Arm',
      // DT-E: mojo-change-rate earn-signals.
      'Volatile',
      'Consistent',
      // DT-F1: bespoke grounded earn-signals.
      'Base Jogger',
      'Wild Thing',
      // DT-F2: Workhorse IP/game earn-signal.
      'Workhorse',
      // DT-F3: Metal Head KP/NUT pitcher-victim earn-signal.
      'Metal Head',
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

  it('computes Butter Fingers from missed gems plus fielding errors over the shared hands denominator', () => {
    const raw = buildRawSignals(baseInput({
      fieldingEvents: [
        fielding({ playerId: 'b1', specialPlayType: 'Diving', success: true }),
        fielding({ playerId: 'b1', specialPlayType: 'Missed Dive', success: false }),
        fielding({ playerId: 'b1', specialPlayType: 'Failed Robbery', success: false }),
        fielding({ playerId: 'b1', specialPlayType: 'Routine', success: true }),
      ],
      atBatEvents: [
        runnerError('fielding', ['b1']),
      ],
    }));

    const butter = raw.get('b1')?.get('Butter Fingers');
    expect(butter?.signalValue).toBeCloseTo((1 + FAILED_ROBBERY_BUTTER_FINGERS_WEIGHT + 1) / 4, 10);
    expect(butter?.sampleSize).toBe(4);
  });

  it('emits near-zero Butter Fingers for made-gem fielders and high Butter Fingers for flubbers', () => {
    const raw = buildRawSignals(baseInput({
      fieldingEvents: [
        ...webGemChances('gem-machine', 5, 5),
        ...webGemChances('flubber', 1, 5),
      ],
    }));

    expect(raw.get('gem-machine')?.get('Butter Fingers')).toEqual({ signalValue: 0, sampleSize: 5 });
    expect(raw.get('flubber')?.get('Butter Fingers')).toEqual({ signalValue: 4 / 5, sampleSize: 5 });
  });

  it('dedups a missed gem and fielding error on the same at-bat, with missed gem winning', () => {
    const raw = buildRawSignals(baseInput({
      fieldingEvents: [
        fielding({
          playerId: 'fielder',
          atBatEventId: 'ab-dedup',
          specialPlayType: 'Missed Dive',
          success: false,
        }),
      ],
      atBatEvents: [
        atBat({
          eventId: 'ab-dedup',
          runnerOutcomes: [
            {
              runnerId: 'r1',
              runnerName: 'Runner 1',
              fromBase: 'first',
              toBase: 'second',
              errorAttributions: [{ type: 'fielding', fielderIds: ['fielder'] }],
            },
          ],
        }),
      ],
    }));

    expect(raw.get('fielder')?.get('Butter Fingers')).toEqual({ signalValue: 1, sampleSize: 1 });
  });

  it('counts between-play fielding errors without an at-bat join as standalone hands errors', () => {
    const raw = buildRawSignals(baseInput({
      fieldingEvents: [
        fielding({
          playerId: 'fielder',
          atBatEventId: 'ab-miss',
          specialPlayType: 'Missed Dive',
          success: false,
        }),
      ],
      betweenPlayEvents: [
        errorAdvance([{ type: 'fielding', fielderIds: ['fielder'] }]),
      ],
    }));

    expect(raw.get('fielder')?.get('Butter Fingers')).toEqual({ signalValue: 1, sampleSize: 2 });
  });

  it('ignores throwing and mental errors for Butter Fingers', () => {
    const raw = buildRawSignals(baseInput({
      atBatEvents: [
        runnerError('throwing', ['fielder']),
        runnerError('mental', ['fielder']),
        runnerError('fielding', ['fielder']),
      ],
      betweenPlayEvents: [
        errorAdvance([{ type: 'throwing', fielderIds: ['fielder'] }]),
        errorAdvance([{ type: 'mental', fielderIds: ['fielder'] }]),
      ],
    }));

    expect(raw.get('fielder')?.get('Butter Fingers')).toEqual({ signalValue: 1, sampleSize: 1 });
  });

  it('weights failed robberies lighter while keeping them in the shared denominator', () => {
    const raw = buildRawSignals(baseInput({
      fielderRatingsByPlayer: new Map([['fielder', { fielding: 60, arm: 90 }]]),
      fieldingEvents: [
        fielding({ playerId: 'fielder', specialPlayType: 'Diving', success: true }),
        fielding({ playerId: 'fielder', specialPlayType: 'Robbed HR', success: true }),
        fielding({ playerId: 'fielder', specialPlayType: 'Failed Robbery', success: false }),
        fielding({ playerId: 'fielder', specialPlayType: 'Failed Robbery', success: false }),
      ],
    }));

    expect(raw.get('fielder')?.get('Magic Hands')).toEqual({ signalValue: 2 / 4, sampleSize: 4 });
    expect(raw.get('fielder')?.get('Dive Wizard')).toEqual({ signalValue: 2 / 4, sampleSize: 4 });
    expect(raw.get('fielder')?.get('Butter Fingers')).toEqual({
      signalValue: (2 * FAILED_ROBBERY_BUTTER_FINGERS_WEIGHT) / 4,
      sampleSize: 4,
    });
  });

  it('computes Cannon Arm from OF-arm activity per game while emitting zero-rate error traits without attributions', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      seasonFieldingByPlayer: new Map([['b1', { outfieldAssists: 2, baserunnersHeld: 4, games: 12 }]]),
    }));
    expect(candidate(result, 'b1', 'Cannon Arm')?.signalValue).toBeCloseTo(0.5, 10);
    expect(candidate(result, 'b1', 'Wild Thrower')?.signalValue).toBe(0);
    expect(candidate(result, 'b1', 'Wild Thrower')?.sampleSize).toBe(12);
    expect(candidate(result, 'b1', 'Noodle Arm')?.signalValue).toBe(0);
    expect(candidate(result, 'b1', 'Noodle Arm')?.sampleSize).toBe(12);
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

describe('traitCandidateBuilder DT-D error-attribution signals', () => {
  it('makes Wild Thrower and Noodle Arm buildable from playerId-keyed error attributions', () => {
    for (const traitName of DTD_ERROR_TRAITS) {
      expect(BUILDABLE_TRAITS).toContain(traitName);
    }

    const raw = buildRawSignals(baseInput({
      gamesByPlayer: new Map([
        ['fielder', 10],
        ['ghost-position-only', 10],
      ]),
      atBatEvents: [
        atBat({
          runnerOutcomes: [
            {
              runnerId: 'r1',
              runnerName: 'Runner 1',
              fromBase: 'first',
              toBase: 'second',
              errorAttributions: [{ type: 'mental', fielderIds: ['fielder'] }],
            },
            {
              runnerId: 'r2',
              runnerName: 'Runner 2',
              fromBase: 'second',
              toBase: 'third',
              errorAttributions: [{ type: 'fielding', fielderIds: ['fielder'] }],
            },
          ],
          enrichment: {
            errors: [{ position: 6, type: 'mental' }],
          },
        }),
      ],
      betweenPlayEvents: [
        errorAdvance([{ type: 'throwing', fielderIds: ['fielder'] }]),
        errorAdvance([{ type: 'mental', fielderIds: ['fielder'] }]),
        errorAdvance([{ type: 'mental', fielderIds: ['no-games'] }]),
      ],
    }));

    expect(raw.get('fielder')?.get('Noodle Arm')).toEqual({ signalValue: 0.2, sampleSize: 10 });
    expect(raw.get('fielder')?.get('Wild Thrower')).toEqual({ signalValue: 0.1, sampleSize: 10 });
    expect(raw.get('ghost-position-only')?.get('Noodle Arm')).toEqual({ signalValue: 0, sampleSize: 10 });
    expect(raw.get('ghost-position-only')?.get('Wild Thrower')).toEqual({ signalValue: 0, sampleSize: 10 });
    expect(raw.get('no-games')?.get('Noodle Arm')).toBeUndefined();
  });

  it('credits every fielderId listed on one attribution', () => {
    const raw = buildRawSignals(baseInput({
      gamesByPlayer: new Map([
        ['f1', 10],
        ['f2', 10],
      ]),
      atBatEvents: [runnerError('throwing', ['f1', 'f2'])],
    }));

    expect(raw.get('f1')?.get('Wild Thrower')).toEqual({ signalValue: 0.1, sampleSize: 10 });
    expect(raw.get('f2')?.get('Wild Thrower')).toEqual({ signalValue: 0.1, sampleSize: 10 });
  });

  it('emits zero-rate error traits for clean fielders across the league-wide cohort', () => {
    const raw = buildRawSignals(baseInput({
      gamesByPlayer: new Map([['games-only', 10]]),
      seasonFieldingByPlayer: new Map([['season-only', { games: 8 }]]),
    }));

    expect(raw.get('games-only')?.get('Wild Thrower')).toEqual({ signalValue: 0, sampleSize: 10 });
    expect(raw.get('games-only')?.get('Noodle Arm')).toEqual({ signalValue: 0, sampleSize: 10 });
    expect(raw.get('season-only')?.get('Wild Thrower')).toEqual({ signalValue: 0, sampleSize: 8 });
    expect(raw.get('season-only')?.get('Noodle Arm')).toEqual({ signalValue: 0, sampleSize: 8 });
  });

  it('credits fielding-type attributions to neither Wild Thrower nor Noodle Arm', () => {
    const raw = buildRawSignals(baseInput({
      gamesByPlayer: new Map([['fielder', 10]]),
      atBatEvents: [runnerError('fielding', ['fielder'])],
    }));

    expect(raw.get('fielder')?.get('Wild Thrower')).toEqual({ signalValue: 0, sampleSize: 10 });
    expect(raw.get('fielder')?.get('Noodle Arm')).toEqual({ signalValue: 0, sampleSize: 10 });
  });

  it('excludes undone at-bat and between-play error attributions', () => {
    const raw = buildRawSignals(baseInput({
      gamesByPlayer: new Map([['fielder', 10]]),
      atBatEvents: [
        runnerError('mental', ['fielder']),
        atBat({
          undoneAt: 1,
          runnerOutcomes: [{
            runnerId: 'r2',
            runnerName: 'Runner 2',
            fromBase: 'first',
            toBase: 'second',
            errorAttributions: [{ type: 'mental', fielderIds: ['fielder'] }],
          }],
        }),
      ],
      betweenPlayEvents: [
        errorAdvance([{ type: 'throwing', fielderIds: ['fielder'] }]),
        errorAdvance([{ type: 'throwing', fielderIds: ['fielder'] }], { undoneAt: 1 }),
      ],
    }));

    expect(raw.get('fielder')?.get('Noodle Arm')).toEqual({ signalValue: 0.1, sampleSize: 10 });
    expect(raw.get('fielder')?.get('Wild Thrower')).toEqual({ signalValue: 0.1, sampleSize: 10 });
  });

  it('emits zero-rate error traits when only position-keyed enrichment errors exist', () => {
    const input = baseInput({
      players: players(['fielder'], 'position'),
      gamesByPlayer: new Map([['fielder', 10]]),
      atBatEvents: [
        atBat({
          batterId: 'b1',
          enrichment: {
            errors: [{ position: 6, type: 'mental' }],
          },
        }),
      ],
    });
    const raw = buildRawSignals(input);
    const result = computeSeasonTraitCandidates(input);

    expect(raw.get('fielder')?.get('Noodle Arm')).toEqual({ signalValue: 0, sampleSize: 10 });
    expect(raw.get('fielder')?.get('Wild Thrower')).toEqual({ signalValue: 0, sampleSize: 10 });
    expect(candidate(result, 'fielder', 'Noodle Arm')?.signalValue).toBe(0);
    expect(candidate(result, 'fielder', 'Wild Thrower')?.signalValue).toBe(0);
  });

  it('uses games as the denominator and sample-size valve for mental-error Noodle Arm', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['thin', 'full', 'peer-zero', 'peer-mid'], 'position'),
      gamesByPlayer: new Map([
        ['thin', 9],
        ['full', 10],
        ['peer-zero', 10],
        ['peer-mid', 10],
      ]),
      atBatEvents: [
        runnerError('mental', ['thin']),
        runnerError('mental', ['full']),
        runnerError('mental', ['full']),
        runnerError('throwing', ['peer-zero']),
        runnerError('mental', ['peer-mid']),
      ],
    }));

    const thin = candidate(result, 'thin', 'Noodle Arm');
    const full = candidate(result, 'full', 'Noodle Arm');

    expect(thin).toBeDefined();
    expect(thin?.sampleSize).toBe(9);
    expect(thin?.score.sufficient).toBe(false);
    expect(thin?.score.sufficiency).not.toBe('sufficient');
    expect(full).toBeDefined();
    expect(full?.signalValue).toBeCloseTo(0.2, 10);
    expect(full?.sampleSize).toBe(10);
    expect(full?.score.sufficient).toBe(true);
    expect(full?.score.realityPercentile).not.toBeNull();
    expect(Number.isFinite(full?.score.realityPercentile)).toBe(true);
  });
});

describe('traitCandidateBuilder DT-E mojo-change signals', () => {
  it('makes Volatile and Consistent buildable from real mojo-change rate per game', () => {
    for (const traitName of DTE_MOJO_TRAITS) {
      expect(BUILDABLE_TRAITS).toContain(traitName);
    }

    const raw = buildRawSignals(baseInput({
      gamesByPlayer: new Map([['hitter', 4]]),
      betweenPlayEvents: [
        mojoChange('hitter', 0, 1),
        mojoChange('hitter', 1, 2),
        mojoChange('hitter', 2, 3),
      ],
    }));

    expect(raw.get('hitter')?.get('Volatile')).toEqual({ signalValue: 0.75, sampleSize: 4 });
    expect(raw.get('hitter')?.get('Consistent')).toEqual({ signalValue: -0.75, sampleSize: 4 });
  });

  it('ranks more mojo changes higher for Volatile and lower for Consistent', () => {
    const mojoChanges = (playerId: string, count: number): BetweenPlayEvent[] => (
      Array.from({ length: count }, (_, index) => mojoChange(playerId, index, index + 1))
    );
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['fewer', 'middle', 'more'], 'position'),
      gamesByPlayer: new Map([
        ['fewer', 10],
        ['middle', 10],
        ['more', 10],
      ]),
      betweenPlayEvents: [
        ...mojoChanges('fewer', 1),
        ...mojoChanges('middle', 3),
        ...mojoChanges('more', 5),
      ],
    }));

    const fewerVolatile = candidate(result, 'fewer', 'Volatile');
    const moreVolatile = candidate(result, 'more', 'Volatile');
    const fewerConsistent = candidate(result, 'fewer', 'Consistent');
    const moreConsistent = candidate(result, 'more', 'Consistent');

    expect(fewerVolatile?.score.sufficient).toBe(true);
    expect(moreVolatile?.score.sufficient).toBe(true);
    expect(fewerConsistent?.score.sufficient).toBe(true);
    expect(moreConsistent?.score.sufficient).toBe(true);
    expect(moreVolatile?.score.realityPercentile ?? 0).toBeGreaterThan(fewerVolatile?.score.realityPercentile ?? 0);
    expect(moreConsistent?.score.realityPercentile ?? 0).toBeLessThan(fewerConsistent?.score.realityPercentile ?? 0);
  });

  it('keeps mojo traits dormant with zero mojo-change events or zero games', () => {
    const raw = buildRawSignals(baseInput({
      gamesByPlayer: new Map([
        ['quiet', 10],
        ['zero-games', 0],
      ]),
      betweenPlayEvents: [
        mojoChange('zero-games', 0, 1),
      ],
    }));

    expect(raw.get('quiet')?.get('Volatile')).toBeUndefined();
    expect(raw.get('quiet')?.get('Consistent')).toBeUndefined();
    expect(raw.get('zero-games')?.get('Volatile')).toBeUndefined();
    expect(raw.get('zero-games')?.get('Consistent')).toBeUndefined();
  });

  it('excludes no-op, undone, fitness-state, and injury-state events', () => {
    const raw = buildRawSignals(baseInput({
      gamesByPlayer: new Map([['ignored', 10]]),
      betweenPlayEvents: [
        mojoChange('ignored', 1, 1),
        mojoChange('ignored', 1, 2, { undoneAt: 1 }),
        mojoChange('ignored', 'FIT', 'WELL', {
          playerStateChange: {
            playerId: 'ignored',
            playerName: 'ignored',
            stateType: 'fitness',
            previousValue: 'FIT',
            newValue: 'WELL',
          },
        }),
        mojoChange('ignored', 'healthy', 'injured', {
          playerStateChange: {
            playerId: 'ignored',
            playerName: 'ignored',
            stateType: 'injury',
            previousValue: 'healthy',
            newValue: 'injured',
          },
        }),
      ],
    }));

    expect(raw.get('ignored')?.get('Volatile')).toBeUndefined();
    expect(raw.get('ignored')?.get('Consistent')).toBeUndefined();
  });

  it('emits mojo signals for both position players and pitchers', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: [
        { playerId: 'hitter', role: 'position' },
        { playerId: 'pitcher', role: 'pitcher' },
      ],
      gamesByPlayer: new Map([
        ['hitter', 10],
        ['pitcher', 10],
      ]),
      betweenPlayEvents: [
        mojoChange('hitter', 0, 1),
        mojoChange('pitcher', 0, 1),
      ],
    }));

    expect(candidate(result, 'hitter', 'Volatile')).toBeDefined();
    expect(candidate(result, 'hitter', 'Consistent')).toBeDefined();
    expect(candidate(result, 'pitcher', 'Volatile')).toBeDefined();
    expect(candidate(result, 'pitcher', 'Consistent')).toBeDefined();
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

describe('DT-F1 Base Jogger (reverse Base Rounder predicate over the same chances)', () => {
  function ro(runnerId: string, fromBase: 'batter' | 'first' | 'second' | 'third', toBase: 'first' | 'second' | 'third' | 'home' | 'out' | 'end') {
    return { runnerId, runnerName: runnerId.toUpperCase(), fromBase, toBase };
  }

  it('is registered as a buildable canonical trait', () => {
    for (const traitName of DTF1_BESPOKE_TRAITS) {
      expect(BUILDABLE_TRAITS).toContain(traitName);
    }
  });

  it('scores forced-minimum and thrown-out runners as successes, but extra-base advances as non-successes', () => {
    const on1B: RunnerState = { first: { runnerId: 'r1', runnerName: 'R1', responsiblePitcherId: 'p1' }, second: null, third: null };
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['r1'], 'position'),
      atBatEvents: [
        // On a 1B, r1 is forced to 2nd; exactly 2nd is a Base Jogger success.
        atBat({ batterId: 'b1', result: '1B', outsAfter: 0, runners: on1B, runnerOutcomes: [ro('r1', 'first', 'second')] }),
        // A throw-out trying to stretch is a Base Jogger success and Base Rounder non-success.
        atBat({ batterId: 'b1', result: '1B', outsAfter: 1, runners: on1B, runnerOutcomes: [ro('r1', 'first', 'out')] }),
        // Taking the extra base is a Base Jogger non-success and Base Rounder success.
        atBat({ batterId: 'b1', result: '1B', outsAfter: 0, runners: on1B, runnerOutcomes: [ro('r1', 'first', 'third')] }),
      ],
    }));

    expect(candidate(result, 'r1', 'Base Jogger')?.signalValue).toBeCloseTo(2 / 3, 10);
    expect(candidate(result, 'r1', 'Base Jogger')?.sampleSize).toBe(3);
    expect(candidate(result, 'r1', 'Base Rounder')?.signalValue).toBeCloseTo(1 / 3, 10);
    expect(candidate(result, 'r1', 'Base Rounder')?.sampleSize).toBe(3);
  });

  it('excludes held end runners from both Base Jogger and Base Rounder denominators', () => {
    const on1B: RunnerState = { first: { runnerId: 'r1', runnerName: 'R1', responsiblePitcherId: 'p1' }, second: null, third: null };
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['r1'], 'position'),
      atBatEvents: [
        // Held runners are explicitly not opportunities for either trait.
        ...repeat(3, () => atBat({ batterId: 'b1', result: '1B', outsAfter: 0, runners: on1B, runnerOutcomes: [ro('r1', 'first', 'end')] })),
        // These two are the only chances: one Base Jogger success, one Base Rounder success.
        atBat({ batterId: 'b1', result: '1B', outsAfter: 0, runners: on1B, runnerOutcomes: [ro('r1', 'first', 'second')] }),
        atBat({ batterId: 'b1', result: '1B', outsAfter: 0, runners: on1B, runnerOutcomes: [ro('r1', 'first', 'third')] }),
      ],
    }));

    expect(candidate(result, 'r1', 'Base Jogger')?.signalValue).toBeCloseTo(0.5, 10);
    expect(candidate(result, 'r1', 'Base Jogger')?.sampleSize).toBe(2);
    expect(candidate(result, 'r1', 'Base Rounder')?.signalValue).toBeCloseTo(0.5, 10);
    expect(candidate(result, 'r1', 'Base Rounder')?.sampleSize).toBe(2);
  });

  it('keeps Base Jogger out of the pitcher pool (position-only)', () => {
    const on1B: RunnerState = { first: { runnerId: 'pr1', runnerName: 'PR1', responsiblePitcherId: 'p1' }, second: null, third: null };
    const result = computeSeasonTraitCandidates(baseInput({
      players: [{ playerId: 'pr1', role: 'pitcher' }],
      atBatEvents: repeat(5, () => atBat({ batterId: 'b1', result: '1B', outsAfter: 1, runners: on1B, runnerOutcomes: [ro('pr1', 'first', 'out')] })),
    }));

    expect(candidate(result, 'pr1', 'Base Jogger')).toBeUndefined();
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

describe('DT-F1 Wild Thing (wild pitches plus WP_K per batters-faced)', () => {
  it('computes Wild Thing as wild_pitch events plus WP_K at-bats over pitcher BF', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p1'], 'pitcher'),
      atBatEvents: [
        ...repeat(8, () => atBat({ pitcherId: 'p1', batterId: 'opp', result: 'GO', outsAfter: 1 })),
        ...repeat(2, () => atBat({ pitcherId: 'p1', batterId: 'opp', result: 'WP_K', outsAfter: 1 })),
      ],
      // 2 wild pitches + 2 WP_K = 4 wildness events over 10 BF. The passed ball
      // sibling must not count toward Wild Thing.
      betweenPlayEvents: [wildPitch('p1'), wildPitch('p1'), passedBall('p1')],
    }));

    expect(candidate(result, 'p1', 'Wild Thing')?.signalValue).toBeCloseTo(0.4, 10);
    expect(candidate(result, 'p1', 'Wild Thing')?.sampleSize).toBe(10);
  });

  it('keys wild pitches to the matching pitcher and excludes undone events and at-bats', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p1', 'p2'], 'pitcher'),
      atBatEvents: [
        atBat({ pitcherId: 'p1', batterId: 'opp', result: 'WP_K', outsAfter: 1, undoneAt: 1 }),
        ...repeat(10, () => atBat({ pitcherId: 'p1', batterId: 'opp', result: 'GO', outsAfter: 1 })),
        ...repeat(9, () => atBat({ pitcherId: 'p2', batterId: 'opp', result: 'GO', outsAfter: 1 })),
        atBat({ pitcherId: 'p2', batterId: 'opp', result: 'WP_K', outsAfter: 1 }),
      ],
      betweenPlayEvents: [
        wildPitch('p1'),
        wildPitch('p1', { undoneAt: 1 } as Partial<BetweenPlayEvent>),
        wildPitch('p2'),
        passedBall('p2'),
      ],
    }));

    // p1: undone WP_K and undone wild pitch excluded => 1/10.
    expect(candidate(result, 'p1', 'Wild Thing')?.signalValue).toBeCloseTo(0.1, 10);
    expect(candidate(result, 'p1', 'Wild Thing')?.sampleSize).toBe(10);
    // p2: one WP_K + one wild_pitch, passed ball ignored => 2/10.
    expect(candidate(result, 'p2', 'Wild Thing')?.signalValue).toBeCloseTo(0.2, 10);
    expect(candidate(result, 'p2', 'Wild Thing')?.sampleSize).toBe(10);
  });

  it('keeps Wild Thing out of the position pool (pitcher-only role eligibility)', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: [{ playerId: 'p1', role: 'position' }],
      atBatEvents: repeat(10, () => atBat({ pitcherId: 'p1', batterId: 'opp', result: 'WP_K', outsAfter: 1 })),
      betweenPlayEvents: [wildPitch('p1'), wildPitch('p1')],
    }));

    expect(candidate(result, 'p1', 'Wild Thing')).toBeUndefined();
  });
});

describe('DT-F2 Workhorse (IP/game with SP/RP peer-pool split)', () => {
  it('is registered as a buildable canonical trait', () => {
    for (const traitName of DTF2_BESPOKE_TRAITS) {
      expect(BUILDABLE_TRAITS).toContain(traitName);
    }
  });

  it('computes Workhorse as innings pitched per game from season pitching totals', () => {
    const raw = buildRawSignals(baseInput({
      players: players(['p-workhorse'], 'pitcher'),
      seasonPitchingByPlayer: new Map([
        ['p-workhorse', { outsRecorded: 54, games: 9, gamesStarted: 9 }],
      ]),
    }));

    expect(raw.get('p-workhorse')?.get('Workhorse')).toEqual({
      signalValue: 2,
      sampleSize: 9,
    });
  });

  it('percentiles starters and relievers in separate Workhorse peer pools', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['sp-top', 'sp-mid', 'sp-low', 'rp-top', 'rp-mid', 'rp-low'], 'pitcher'),
      seasonPitchingByPlayer: new Map([
        ['sp-top', { outsRecorded: 216, games: 12, gamesStarted: 12 }], // 6.0 IP/G
        ['sp-mid', { outsRecorded: 162, games: 12, gamesStarted: 12 }], // 4.5 IP/G
        ['sp-low', { outsRecorded: 72, games: 12, gamesStarted: 12 }], // 2.0 IP/G
        ['rp-top', { outsRecorded: 54, games: 12, gamesStarted: 0 }], // 1.5 IP/G
        ['rp-mid', { outsRecorded: 36, games: 12, gamesStarted: 0 }], // 1.0 IP/G
        ['rp-low', { outsRecorded: 18, games: 12, gamesStarted: 0 }], // 0.5 IP/G
      ]),
    }));
    const starter = candidate(result, 'sp-top', 'Workhorse');
    const reliever = candidate(result, 'rp-top', 'Workhorse');

    expect(starter).toBeDefined();
    expect(starter?.signalValue).toBeCloseTo(6, 10);
    expect(starter?.score.peerPoolSize).toBe(3);
    expect(starter?.score.sufficient).toBe(true);
    expect(starter?.score.realityPercentile).toBeCloseTo(1, 10);

    expect(reliever).toBeDefined();
    expect(reliever?.signalValue).toBeCloseTo(1.5, 10);
    expect(reliever?.score.peerPoolSize).toBe(3);
    expect(reliever?.score.sufficient).toBe(true);
    expect(reliever?.score.realityPercentile).toBeCloseTo(1, 10);
  });

  it('keeps Workhorse dormant for zero games and out of the position pool', () => {
    const input = baseInput({
      players: [
        { playerId: 'zero-games', role: 'pitcher' },
        { playerId: 'position-player', role: 'position' },
      ],
      seasonPitchingByPlayer: new Map([
        ['zero-games', { outsRecorded: 54, games: 0, gamesStarted: 1 }],
        ['position-player', { outsRecorded: 216, games: 12, gamesStarted: 12 }],
      ]),
    });
    const raw = buildRawSignals(input);
    const result = computeSeasonTraitCandidates(input);

    expect(raw.get('zero-games')?.get('Workhorse')).toBeUndefined();
    expect(raw.get('position-player')?.get('Workhorse')).toBeUndefined();
    expect(candidate(result, 'zero-games', 'Workhorse')).toBeUndefined();
    expect(candidate(result, 'position-player', 'Workhorse')).toBeUndefined();
  });
});

describe('T-3a pitcher SP/RP peer-pool split', () => {
  function pitcherKRateAtBats(pitcherId: string, strikeouts: number): AtBatEvent[] {
    return repeat(10, (index) => atBat({
      pitcherId,
      batterId: `${pitcherId}-batter-${index}`,
      result: index < strikeouts ? 'K' : 'GO',
      outsAfter: 1,
    }));
  }

  function pitchingRows(rows: Array<readonly [string, number]>): SeasonTraitCandidateInput['seasonPitchingByPlayer'] {
    return new Map(rows.map(([playerId, gamesStarted]) => [
      playerId,
      { outsRecorded: 30, games: 10, gamesStarted },
    ]));
  }

  it('percentiles a second pitcher trait inside separate starter and reliever cohorts', () => {
    const cohort = [
      ['sp-high', 9, 10],
      ['sp-mid', 5, 10],
      ['sp-low', 1, 10],
      ['rp-high', 3, 0],
      ['rp-mid', 2, 0],
      ['rp-low', 1, 0],
    ] as const;
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(cohort.map(([playerId]) => playerId), 'pitcher'),
      atBatEvents: cohort.flatMap(([playerId, strikeouts]) => pitcherKRateAtBats(playerId, strikeouts)),
      seasonPitchingByPlayer: pitchingRows(cohort.map(([playerId, , gamesStarted]) => [playerId, gamesStarted] as const)),
    }));
    const starter = candidate(result, 'sp-mid', 'K Collector');
    const reliever = candidate(result, 'rp-high', 'K Collector');

    expect(starter?.signalValue).toBeCloseTo(0.5, 10);
    expect(starter?.score.peerPoolSize).toBe(3);
    expect(starter?.score.sufficient).toBe(true);
    expect(starter?.score.realityPercentile).toBeCloseTo(2 / 3, 10);
    expect(starter?.score.realityPercentile).not.toBeCloseTo(5 / 6, 10);

    expect(reliever?.signalValue).toBeCloseTo(0.3, 10);
    expect(reliever?.score.peerPoolSize).toBe(3);
    expect(reliever?.score.sufficient).toBe(true);
    expect(reliever?.score.realityPercentile).toBeCloseTo(1, 10);
    expect(reliever?.score.realityPercentile).not.toBeCloseTo(4 / 6, 10);
  });

  it('falls starter pitcher-trait cohorts below the min-peer valve back to the full pitcher pool', () => {
    const cohort = [
      ['sp-high', 9, 10],
      ['sp-mid', 5, 10],
      ['rp-high', 4, 0],
      ['rp-mid', 3, 0],
      ['rp-low', 2, 0],
      ['rp-bottom', 1, 0],
    ] as const;
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(cohort.map(([playerId]) => playerId), 'pitcher'),
      atBatEvents: cohort.flatMap(([playerId, strikeouts]) => pitcherKRateAtBats(playerId, strikeouts)),
      seasonPitchingByPlayer: pitchingRows(cohort.map(([playerId, , gamesStarted]) => [playerId, gamesStarted] as const)),
    }));
    const starter = candidate(result, 'sp-mid', 'K Collector');
    const reliever = candidate(result, 'rp-high', 'K Collector');

    expect(starter?.signalValue).toBeCloseTo(0.5, 10);
    expect(starter?.score.peerPoolSize).toBe(6);
    expect(starter?.score.sufficient).toBe(true);
    expect(starter?.score.realityPercentile).toBeCloseTo(5 / 6, 10);
    expect(starter?.score.realityPercentile).not.toBeCloseTo(1 / 2, 10);

    expect(reliever?.signalValue).toBeCloseTo(0.4, 10);
    expect(reliever?.score.peerPoolSize).toBe(4);
    expect(reliever?.score.sufficient).toBe(true);
    expect(reliever?.score.realityPercentile).toBeCloseTo(1, 10);
    expect(reliever?.score.realityPercentile).not.toBeCloseTo(4 / 6, 10);
  });

  it('leaves hitter position-trait peer pools unchanged', () => {
    const cohort = [
      ['h-low', 1],
      ['h-mid', 5],
      ['h-high', 9],
    ] as const;
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(cohort.map(([playerId]) => playerId), 'position'),
      atBatEvents: cohort.flatMap(([playerId, strikeouts]) => (
        repeat(10, (index) => atBat({
          batterId: playerId,
          pitcherId: `${playerId}-pitcher-${index}`,
          result: index < strikeouts ? 'K' : 'GO',
          outsAfter: 1,
        }))
      )),
    }));
    const hitter = candidate(result, 'h-mid', 'Whiffer');

    expect(hitter?.signalValue).toBeCloseTo(0.5, 10);
    expect(hitter?.score.peerPoolSize).toBe(3);
    expect(hitter?.score.sufficient).toBe(true);
    expect(hitter?.score.realityPercentile).toBeCloseTo(2 / 3, 10);
  });
});

describe('DT-F3 Metal Head (KP/NUT pitcher-victim events per batters-faced)', () => {
  it('is registered as a buildable canonical trait', () => {
    for (const traitName of DTF3_BESPOKE_TRAITS) {
      expect(BUILDABLE_TRAITS).toContain(traitName);
    }
  });

  it('computes Metal Head from KILLED_PITCHER and NUT_SHOT modifiers over pitcher BF', () => {
    const raw = buildRawSignals(baseInput({
      atBatEvents: [
        atBat({
          pitcherId: 'p-victim',
          batterId: 'b-delivered',
          result: 'GO',
          enrichment: { modifiers: ['KILLED_PITCHER'] },
        }),
        atBat({
          pitcherId: 'p-victim',
          batterId: 'b-delivered',
          result: 'GO',
          enrichment: { modifiers: ['NUT_SHOT'] },
        }),
        atBat({
          pitcherId: 'p-victim',
          batterId: 'b-delivered',
          result: 'GO',
          enrichment: { modifiers: ['KILLED_PITCHER', 'NUT_SHOT'] },
        }),
        atBat({
          pitcherId: 'p-victim',
          batterId: 'b-delivered',
          result: 'GO',
          enrichment: { modifiers: ['KILLED_PITCHER'] },
          undoneAt: 1,
        }),
        atBat({
          pitcherId: 'p-victim',
          batterId: 'b-delivered',
          result: 'GO',
          enrichment: { modifiers: ['ifr'] },
        }),
        atBat({
          pitcherId: 'p-victim',
          batterId: 'b-delivered',
          result: 'GO',
        }),
      ],
    }));

    expect(raw.get('p-victim')?.get('Metal Head')).toEqual({
      signalValue: 3 / 5,
      sampleSize: 5,
    });
    expect(raw.get('b-delivered')?.get('Metal Head')).toBeUndefined();
  });

  it('keys Metal Head by each at-bat pitcherId and emits zero-rate BF rows when no victim event exists', () => {
    const raw = buildRawSignals(baseInput({
      atBatEvents: [
        ...repeat(4, () => atBat({ pitcherId: 'p1', batterId: 'b1', result: 'GO' })),
        atBat({ pitcherId: 'p1', batterId: 'b1', result: 'GO', enrichment: { modifiers: ['NUT_SHOT'] } }),
        ...repeat(3, () => atBat({ pitcherId: 'p2', batterId: 'b1', result: 'GO' })),
      ],
    }));

    expect(raw.get('p1')?.get('Metal Head')).toEqual({
      signalValue: 1 / 5,
      sampleSize: 5,
    });
    expect(raw.get('p2')?.get('Metal Head')).toEqual({
      signalValue: 0,
      sampleSize: 3,
    });
  });

  it('keeps Metal Head out of the position pool (pitcher-only role eligibility)', () => {
    const input = baseInput({
      players: [{ playerId: 'p-victim', role: 'position' }],
      atBatEvents: repeat(10, () => atBat({
        pitcherId: 'p-victim',
        batterId: 'b-delivered',
        result: 'GO',
        enrichment: { modifiers: ['KILLED_PITCHER'] },
      })),
    });
    const raw = buildRawSignals(input);
    const result = computeSeasonTraitCandidates(input);

    expect(raw.get('p-victim')?.get('Metal Head')).toBeDefined();
    expect(candidate(result, 'p-victim', 'Metal Head')).toBeUndefined();
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

describe('R1-b3 / PRE-ACT-TRAITS-1 Two Way C/IF/OF family (pitcher batting wOBA earn-signal)', () => {
  // Fixed-id seed pins (verified vs the builder's FNV-1a(playerId) mod 3):
  //   p1 → 'Two Way (IF)'   p2 → 'Two Way (OF)'   p3 → 'Two Way (C)'
  // These three ids cover all three variants, which the family-pooling test relies on.

  it('seeds a deterministic, stable Two Way variant per pitcher (FNV-1a of playerId)', () => {
    // PIN the expected variant for each fixed id (recomputed independently in-test).
    expect(expectedTwoWayVariant('p1')).toBe('Two Way (IF)');
    expect(expectedTwoWayVariant('p2')).toBe('Two Way (OF)');
    expect(expectedTwoWayVariant('p3')).toBe('Two Way (C)');

    const events = repeat(10, () => atBat({ pitcherId: 'opp', batterId: 'p1', result: '1B', outsAfter: 0 }));
    const build = () => computeSeasonTraitCandidates(baseInput({
      players: players(['p1'], 'pitcher'),
      atBatEvents: events,
    }));
    const first = build();
    const second = build();
    // Exactly ONE Two Way variant emitted — the seeded one — and stable across builds.
    const variantsOf = (result: ReturnType<typeof build>) =>
      (result.get('p1') ?? []).filter((c) => c.traitName.startsWith('Two Way')).map((c) => c.traitName);
    expect(variantsOf(first)).toEqual([expectedTwoWayVariant('p1')]);
    expect(variantsOf(second)).toEqual([expectedTwoWayVariant('p1')]);
  });

  it('emits a higher Two Way wOBA for a well-hitting pitcher than a poor-hitting one', () => {
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
    // Each pitcher's candidate carries their OWN seeded variant (p1→IF, p2→OF).
    const good = candidate(result, 'p1', expectedTwoWayVariant('p1'));
    const bad = candidate(result, 'p2', expectedTwoWayVariant('p2'));
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

  it('family pooling: 3 pitchers on DIFFERENT variants are percentiled against each other', () => {
    // p1/p2/p3 seed to IF/OF/C respectively — all three variant names differ, yet they
    // must share ONE 'Two Way' family pool so wOBA percentiles rank across them.
    expect(new Set([
      expectedTwoWayVariant('p1'),
      expectedTwoWayVariant('p2'),
      expectedTwoWayVariant('p3'),
    ]).size).toBe(3);
    const events = [
      // p1 best (all HR), p2 middling (half on base), p3 worst (all K) — enough PA to clear the valve.
      ...repeat(40, () => atBat({ pitcherId: 'opp', batterId: 'p1', result: 'HR', outsAfter: 0 })),
      ...repeat(20, () => atBat({ pitcherId: 'opp', batterId: 'p2', result: '1B', outsAfter: 0 })),
      ...repeat(20, () => atBat({ pitcherId: 'opp', batterId: 'p2', result: 'GO', outsAfter: 1 })),
      ...repeat(40, () => atBat({ pitcherId: 'opp', batterId: 'p3', result: 'K' })),
    ];
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p1', 'p2', 'p3'], 'pitcher'),
      atBatEvents: events,
    }));
    const best = candidate(result, 'p1', expectedTwoWayVariant('p1')); // Two Way (IF)
    const mid = candidate(result, 'p2', expectedTwoWayVariant('p2'));  // Two Way (OF)
    const worst = candidate(result, 'p3', expectedTwoWayVariant('p3')); // Two Way (C)
    expect(best?.score.realityPercentile).not.toBeNull();
    expect(mid?.score.realityPercentile).not.toBeNull();
    expect(worst?.score.realityPercentile).not.toBeNull();
    // Despite carrying three DIFFERENT variant names, they are ranked against each
    // other (shared 'Two Way' pool): best > mid > worst by realityPercentile.
    expect(best!.score.realityPercentile!).toBeGreaterThan(mid!.score.realityPercentile!);
    expect(mid!.score.realityPercentile!).toBeGreaterThan(worst!.score.realityPercentile!);
    // The top-wOBA pitcher gets the top percentile (1.0 = fraction <= value) of the
    // shared 3-pitcher pool. Without family pooling each variant's pool would be size 1
    // (< minPeerPool 3) → all three would be null; reaching a real percentile here is
    // itself the proof the three variants share ONE 'Two Way' pool.
    expect(best!.score.realityPercentile!).toBe(1);
  });

  it('computes the Two Way signalValue = calculateWOBA over the mapped batting line', () => {
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
    const variant = expectedTwoWayVariant('p1'); // Two Way (IF)
    expect(candidate(result, 'p1', variant)?.signalValue).toBeCloseTo(expected, 10);
    expect(candidate(result, 'p1', variant)?.sampleSize).toBe(12);
  });

  it('keeps Two Way out of the position pool (pitcher-only role eligibility)', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      // b1 is a POSITION player who batted — must get NO Two Way variant at all.
      players: players(['b1'], 'position'),
      atBatEvents: repeat(10, () => atBat({ pitcherId: 'opp', batterId: 'b1', result: 'HR', outsAfter: 0 })),
    }));
    expect(candidate(result, 'b1', 'Two Way (C)')).toBeUndefined();
    expect(candidate(result, 'b1', 'Two Way (IF)')).toBeUndefined();
    expect(candidate(result, 'b1', 'Two Way (OF)')).toBeUndefined();
  });

  it('only emits Two Way for a player whose role is pitcher (not by batting alone)', () => {
    // p1 (pitcher) and b1 (position) both bat identically; only p1 earns the signal.
    const result = computeSeasonTraitCandidates(baseInput({
      players: [{ playerId: 'p1', role: 'pitcher' }, { playerId: 'b1', role: 'position' }],
      atBatEvents: [
        ...repeat(10, () => atBat({ pitcherId: 'opp', batterId: 'p1', result: 'HR', outsAfter: 0 })),
        ...repeat(10, () => atBat({ pitcherId: 'opp', batterId: 'b1', result: 'HR', outsAfter: 0 })),
      ],
    }));
    expect(candidate(result, 'p1', expectedTwoWayVariant('p1'))).toBeDefined();
    expect(candidate(result, 'b1', 'Two Way (C)')).toBeUndefined();
    expect(candidate(result, 'b1', 'Two Way (IF)')).toBeUndefined();
    expect(candidate(result, 'b1', 'Two Way (OF)')).toBeUndefined();
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
    const variant = expectedTwoWayVariant('p1');
    expect(candidate(result, 'p1', variant)?.signalValue).toBeCloseTo(expected, 10);
    expect(candidate(result, 'p1', variant)?.sampleSize).toBe(10);
  });

  it('goes dormant for a pitcher under the valve PA floor (< minSampleRate of 10 batting PA)', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p1'], 'pitcher'),
      // Only 5 batting PA → below the basis:'none' floor of 10 → not sufficient.
      atBatEvents: repeat(5, () => atBat({ pitcherId: 'opp', batterId: 'p1', result: 'HR', outsAfter: 0 })),
    }));
    const twoWay = candidate(result, 'p1', expectedTwoWayVariant('p1'));
    // The signal still emits (PA > 0) but the valve marks it dormant.
    expect(twoWay).toBeDefined();
    expect(twoWay?.sampleSize).toBe(5);
    expect(twoWay?.score.sufficiency).not.toBe('sufficient');
    expect(twoWay?.score.realityPercentile).toBeNull();
  });

  it('makes all three Two Way variants buildable (C/IF/OF family)', () => {
    expect(BUILDABLE_TRAITS).toContain('Two Way (C)');
    expect(BUILDABLE_TRAITS).toContain('Two Way (IF)');
    expect(BUILDABLE_TRAITS).toContain('Two Way (OF)');
  });

  it('feeds the seeded Two Way variant through the L9b-2 seam to computeTraitAcquisition', () => {
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
    const variant = expectedTwoWayVariant('p1'); // Two Way (IF)
    const twoWay = candidate(result, 'p1', variant);
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
    // The specific seeded variant is neither role-rejected nor unknown to acquisition.
    const skip = acquisition.skipped.find((s) => s.traitName === variant);
    expect(skip?.reason).not.toBe('ineligible_role');
    expect(skip?.reason).not.toBe('unknown_trait');
  });
});

describe('T-9a pitch-type net-quality raw signals (build-dark)', () => {
  it('classifies every AtBatResult into exactly one of the seven outcome classes', () => {
    expect(ALL_AT_BAT_RESULTS).toHaveLength(26);
    expect(PITCH_OUTCOME_CLASSES).toEqual(['K', 'BB', 'HR', 'SINGLE', 'BIGHIT', 'OUT', 'NEUTRAL']);

    const seen = new Set<AtBatResult>();
    for (const outcomeClass of PITCH_OUTCOME_CLASSES) {
      const members = PITCH_OUTCOME_RESULTS_BY_CLASS[outcomeClass];
      expect(members.length).toBeGreaterThan(0);
      for (const result of members) {
        expect(seen.has(result)).toBe(false);
        seen.add(result);
        expect(classifyPitchOutcome(result)).toBe(outcomeClass);
      }
    }

    for (const result of ALL_AT_BAT_RESULTS) {
      expect(classifyPitchOutcome(result)).toBeDefined();
    }
    expect([...seen].sort()).toEqual([...ALL_AT_BAT_RESULTS].sort());
  });

  it('pins the section-16 pitcher and hitter pitch-outcome weight tables', () => {
    expect(PITCHER_PITCH_OUTCOME_WEIGHTS).toEqual({
      K: 1.0,
      OUT: 0.3,
      NEUTRAL: 0,
      BB: -1.0,
      SINGLE: -2.0,
      BIGHIT: -2.0,
      HR: -3.0,
    });
    expect(HITTER_PITCH_OUTCOME_WEIGHTS).toEqual({
      HR: 3.0,
      BIGHIT: 2.0,
      SINGLE: 1.0,
      BB: 0.5,
      OUT: 0,
      NEUTRAL: 0,
      K: -1.0,
    });
    expect(PITCHER_PITCH_OUTCOME_WEIGHTS.HR).toBeLessThan(PITCHER_PITCH_OUTCOME_WEIGHTS.SINGLE);
    expect(PITCHER_PITCH_OUTCOME_WEIGHTS.HR).toBeLessThan(PITCHER_PITCH_OUTCOME_WEIGHTS.BB);
    expect(HITTER_PITCH_OUTCOME_WEIGHTS.HR).toBeGreaterThan(HITTER_PITCH_OUTCOME_WEIGHTS.BIGHIT);
  });

  it('emits separate pitcher net-quality averages per elite pitch code', () => {
    const events = [
      ...repeat(3, (index) => atBat({ pitcherId: 'p1', batterId: `b4f-k-${index}`, result: 'K', enrichment: { pitchType: '4F' } })),
      ...repeat(2, (index) => atBat({ pitcherId: 'p1', batterId: `b4f-go-${index}`, result: 'GO', enrichment: { pitchType: '4F' } })),
      atBat({ pitcherId: 'p1', batterId: 'b4f-bb', result: 'BB', enrichment: { pitchType: '4F' } }),
      ...repeat(2, (index) => atBat({ pitcherId: 'p1', batterId: `b4f-1b-${index}`, result: '1B', enrichment: { pitchType: '4F' } })),
      ...repeat(2, (index) => atBat({ pitcherId: 'p1', batterId: `b4f-hr-${index}`, result: 'HR', enrichment: { pitchType: '4F' } })),
      ...repeat(2, (index) => atBat({ pitcherId: 'p1', batterId: `bsl-k-${index}`, result: 'K', enrichment: { pitchType: 'SL' } })),
      ...repeat(3, (index) => atBat({ pitcherId: 'p1', batterId: `bsl-go-${index}`, result: 'GO', enrichment: { pitchType: 'SL' } })),
      atBat({ pitcherId: 'p1', batterId: 'bsl-bb', result: 'BB', enrichment: { pitchType: 'SL' } }),
      ...repeat(2, (index) => atBat({ pitcherId: 'p1', batterId: `bsl-2b-${index}`, result: '2B', enrichment: { pitchType: 'SL' } })),
      ...repeat(2, (index) => atBat({ pitcherId: 'p1', batterId: `bsl-hr-${index}`, result: 'HR', enrichment: { pitchType: 'SL' } })),
    ];
    const raw = buildRawSignals(baseInput({ atBatEvents: events }));

    const fourSeam = raw.get('p1')?.get('Elite 4F');
    expect(fourSeam?.sampleSize).toBe(10);
    expect(fourSeam?.signalValue).toBeCloseTo(-7.4 / 10, 10);

    const slider = raw.get('p1')?.get('Elite SL');
    expect(slider?.sampleSize).toBe(10);
    expect(slider?.signalValue).toBeCloseTo(-8.1 / 10, 10);
  });

  it('applies the HR-allowed debit as the heaviest pitcher-side outcome', () => {
    const allGrounders = repeat(10, (index) => atBat({
      pitcherId: 'p-go',
      batterId: `b-go-${index}`,
      result: 'GO',
      enrichment: { pitchType: '4F' },
    }));
    const oneHomer = repeat(10, (index) => atBat({
      pitcherId: 'p-hr',
      batterId: `b-hr-${index}`,
      result: index === 0 ? 'HR' : 'GO',
      enrichment: { pitchType: '4F' },
    }));
    const raw = buildRawSignals(baseInput({ atBatEvents: [...allGrounders, ...oneHomer] }));
    const baseScore = raw.get('p-go')?.get('Elite 4F')?.signalValue;
    const swappedScore = raw.get('p-hr')?.get('Elite 4F')?.signalValue;

    expect(baseScore).toBeCloseTo(0.3, 10);
    expect(swappedScore).toBeCloseTo(-0.03, 10);
    expect((swappedScore ?? 0) - (baseScore ?? 0)).toBeCloseTo((-3.0 - 0.3) / 10, 10);
  });

  it('emits hitter fastball and off-speed net-outcome averages from only their pitch-code buckets', () => {
    const events = [
      atBat({ batterId: 'h1', pitcherId: 'p-fb-1', result: 'HR', enrichment: { pitchType: '4F' } }),
      atBat({ batterId: 'h1', pitcherId: 'p-fb-2', result: '2B', enrichment: { pitchType: '2F' } }),
      atBat({ batterId: 'h1', pitcherId: 'p-fb-3', result: '1B', enrichment: { pitchType: 'CF' } }),
      atBat({ batterId: 'h1', pitcherId: 'p-fb-4', result: 'BB', enrichment: { pitchType: '4F' } }),
      atBat({ batterId: 'h1', pitcherId: 'p-fb-5', result: 'GO', enrichment: { pitchType: 'CF' } }),
      atBat({ batterId: 'h1', pitcherId: 'p-fb-6', result: 'K', enrichment: { pitchType: '2F' } }),
      atBat({ batterId: 'h1', pitcherId: 'p-os-1', result: 'HR', enrichment: { pitchType: 'SL' } }),
      atBat({ batterId: 'h1', pitcherId: 'p-os-2', result: 'GRD', enrichment: { pitchType: 'CB' } }),
      atBat({ batterId: 'h1', pitcherId: 'p-os-3', result: '3B', enrichment: { pitchType: 'CH' } }),
      atBat({ batterId: 'h1', pitcherId: 'p-os-4', result: 'IBB', enrichment: { pitchType: 'FK' } }),
      atBat({ batterId: 'h1', pitcherId: 'p-os-5', result: 'FO', enrichment: { pitchType: 'SB' } }),
      atBat({ batterId: 'h1', pitcherId: 'p-os-6', result: 'K', enrichment: { pitchType: 'SL' } }),
    ];
    const raw = buildRawSignals(baseInput({ atBatEvents: events }));

    const fastball = raw.get('h1')?.get('Fastball Hitter');
    expect(fastball?.sampleSize).toBe(6);
    expect(fastball?.signalValue).toBeCloseTo(5.5 / 6, 10);

    const offspeed = raw.get('h1')?.get('Off-Speed Hitter');
    expect(offspeed?.sampleSize).toBe(6);
    expect(offspeed?.signalValue).toBeCloseTo(6.5 / 6, 10);
    expect(HITTER_PITCH_OUTCOME_WEIGHTS.HR).toBe(3.0);
  });

  it('ignores untagged, unknown-pitch, empty-pitch, and undone at-bats', () => {
    const raw = buildRawSignals(baseInput({
      atBatEvents: [
        atBat({ pitcherId: 'p-tag', batterId: 'b-tag', result: 'GO', enrichment: { pitchType: '4F' } }),
        atBat({ pitcherId: 'p-tag', batterId: 'b-tag', result: 'HR' }),
        atBat({ pitcherId: 'p-tag', batterId: 'b-tag', result: 'HR', enrichment: { pitchType: 'CUT' } }),
        atBat({ pitcherId: 'p-tag', batterId: 'b-tag', result: 'K', enrichment: { pitchType: '' } }),
        atBat({ pitcherId: 'p-tag', batterId: 'b-tag', result: 'HR', enrichment: { pitchType: '4F' }, undoneAt: 1 }),
        atBat({ pitcherId: 'p-tag', batterId: 'b-tag', result: 'K', enrichment: { pitchType: 'SL' }, undoneAt: 1 }),
      ],
    }));

    expect(raw.get('p-tag')?.get('Elite 4F')).toEqual({ signalValue: 0.3, sampleSize: 1 });
    expect(raw.get('p-tag')?.get('Elite SL')).toBeUndefined();
    expect(raw.get('b-tag')?.get('Fastball Hitter')).toEqual({ signalValue: 0, sampleSize: 1 });
    expect(raw.get('b-tag')?.get('Off-Speed Hitter')).toBeUndefined();
  });

  it('makes the 10 pitch-type traits buildable candidates only when tagged pitch data exists', () => {
    for (const traitName of T9B_PITCH_TYPE_TRAITS) {
      expect(BUILDABLE_TRAITS).toContain(traitName);
    }

    const taggedEvents = ['1', '2', '3'].flatMap((suffix, playerIndex) => (
      repeat(10, (index) => atBat({
        pitcherId: `p${suffix}`,
        batterId: `h${suffix}`,
        result: index < 7 - playerIndex ? 'K' : 'GO',
        enrichment: { pitchType: '4F' },
      }))
    ));
    const playersUnderTest: SeasonTraitPlayer[] = [
      ...players(['p1', 'p2', 'p3'], 'pitcher'),
      ...players(['h1', 'h2', 'h3'], 'position'),
    ];
    const tagged = computeSeasonTraitCandidates(baseInput({
      players: playersUnderTest,
      atBatEvents: taggedEvents,
    }));
    const untagged = computeSeasonTraitCandidates(baseInput({
      players: playersUnderTest,
      atBatEvents: taggedEvents.map((event) => ({ ...event, enrichment: undefined })),
    }));
    const pitchTraitSet = new Set<string>(T9B_PITCH_TYPE_TRAITS);

    expect(candidate(tagged, 'p1', 'Elite 4F')).toBeDefined();
    expect(candidate(tagged, 'h1', 'Fastball Hitter')).toBeDefined();
    expect([...untagged.values()].flat().filter((item) => pitchTraitSet.has(item.traitName))).toEqual([]);
  });
});

describe('traitCandidateBuilder DT-B pitch-location signals', () => {
  it('makes the 4 pitch-location traits buildable candidates only when tagged location data exists', () => {
    for (const traitName of DTB_PITCH_LOCATION_TRAITS) {
      expect(BUILDABLE_TRAITS).toContain(traitName);
    }

    const tagged = computeSeasonTraitCandidates(baseInput({
      players: players(['h-low', 'h-high', 'h-inside', 'h-outside', 'h-plain'], 'position'),
      atBatEvents: [
        ...repeat(10, () => atBat({ batterId: 'h-low', result: 'HR', outsAfter: 0, enrichment: { pitchLocation: 'low' } })),
        ...repeat(10, () => atBat({ batterId: 'h-high', result: '2B', outsAfter: 0, enrichment: { pitchLocation: 'high' } })),
        ...repeat(10, () => atBat({ batterId: 'h-inside', result: '1B', outsAfter: 0, enrichment: { pitchLocation: 'inside' } })),
        ...repeat(10, () => atBat({ batterId: 'h-outside', result: 'BB', outsAfter: 0, enrichment: { pitchLocation: 'outside' } })),
        ...repeat(10, () => atBat({ batterId: 'h-plain', result: 'HR', outsAfter: 0 })),
      ],
    }));
    const untagged = computeSeasonTraitCandidates(baseInput({
      players: players(['h-low', 'h-high', 'h-inside', 'h-outside', 'h-plain'], 'position'),
      atBatEvents: repeat(10, () => atBat({ batterId: 'h-plain', result: 'HR', outsAfter: 0 })),
    }));
    const locationTraitSet = new Set<string>(DTB_PITCH_LOCATION_TRAITS);

    expect(candidate(tagged, 'h-low', 'Low Pitch')).toBeDefined();
    expect(candidate(tagged, 'h-high', 'High Pitch')).toBeDefined();
    expect(candidate(tagged, 'h-inside', 'Inside Pitch')).toBeDefined();
    expect(candidate(tagged, 'h-outside', 'Outside Pitch')).toBeDefined();
    expect(candidate(tagged, 'h-plain', 'Low Pitch')).toBeUndefined();
    expect(candidate(tagged, 'h-plain', 'High Pitch')).toBeUndefined();
    expect(candidate(tagged, 'h-plain', 'Inside Pitch')).toBeUndefined();
    expect(candidate(tagged, 'h-plain', 'Outside Pitch')).toBeUndefined();
    expect([...untagged.values()].flat().filter((item) => locationTraitSet.has(item.traitName))).toEqual([]);
  });

  it('keeps pitch-location buckets separated per zone for the same batter', () => {
    const raw = buildRawSignals(baseInput({
      atBatEvents: [
        atBat({ batterId: 'h-zone', result: 'HR', outsAfter: 0, enrichment: { pitchLocation: 'low' } }),
        atBat({ batterId: 'h-zone', result: '2B', outsAfter: 0, enrichment: { pitchLocation: 'low' } }),
        atBat({ batterId: 'h-zone', result: '1B', outsAfter: 0, enrichment: { pitchLocation: 'low' } }),
        atBat({ batterId: 'h-zone', result: 'BB', outsAfter: 0, enrichment: { pitchLocation: 'low' } }),
        atBat({ batterId: 'h-zone', result: 'K', outsAfter: 1, enrichment: { pitchLocation: 'low' } }),
        atBat({ batterId: 'h-zone', result: 'K', outsAfter: 1, enrichment: { pitchLocation: 'high' } }),
        atBat({ batterId: 'h-zone', result: 'HR', outsAfter: 0, enrichment: { pitchLocation: 'inside' } }),
        atBat({ batterId: 'h-zone', result: 'HR', outsAfter: 0, enrichment: { pitchLocation: 'inside' } }),
        ...repeat(3, () => atBat({ batterId: 'h-zone', result: 'GO', outsAfter: 1, enrichment: { pitchLocation: 'outside' } })),
      ],
    }));

    expect(raw.get('h-zone')?.get('Low Pitch')).toEqual({ signalValue: 5.5 / 5, sampleSize: 5 });
    expect(raw.get('h-zone')?.get('High Pitch')).toEqual({ signalValue: -1, sampleSize: 1 });
    expect(raw.get('h-zone')?.get('Inside Pitch')).toEqual({ signalValue: 3, sampleSize: 2 });
    expect(raw.get('h-zone')?.get('Outside Pitch')).toEqual({ signalValue: 0, sampleSize: 3 });
  });

  it('skips outOfZone and undefined pitch-location tags', () => {
    const raw = buildRawSignals(baseInput({
      atBatEvents: [
        atBat({ batterId: 'h-skip', result: 'HR', outsAfter: 0, enrichment: { pitchLocation: 'outOfZone' } }),
        atBat({ batterId: 'h-skip', result: 'HR', outsAfter: 0 }),
        atBat({ batterId: 'h-skip', result: 'HR', outsAfter: 0, enrichment: {} }),
      ],
    }));

    for (const traitName of DTB_PITCH_LOCATION_TRAITS) {
      expect(raw.get('h-skip')?.get(traitName)).toBeUndefined();
    }
  });

  it('gates pitch-location traits at the rate min-sample boundary per zone', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['h-thin', 'h-full', 'h-peer-low', 'h-peer-mid'], 'position'),
      atBatEvents: [
        ...repeat(9, () => atBat({
          batterId: 'h-thin',
          result: 'HR',
          outsAfter: 0,
          enrichment: { pitchLocation: 'low' },
        })),
        ...repeat(10, (index) => atBat({
          batterId: 'h-full',
          result: index < 8 ? 'HR' : 'GO',
          outsAfter: index < 8 ? 0 : 1,
          enrichment: { pitchLocation: 'low' },
        })),
        ...repeat(10, (index) => atBat({
          batterId: 'h-peer-low',
          result: index < 5 ? 'HR' : 'GO',
          outsAfter: index < 5 ? 0 : 1,
          enrichment: { pitchLocation: 'low' },
        })),
        ...repeat(10, (index) => atBat({
          batterId: 'h-peer-mid',
          result: index < 7 ? 'HR' : 'GO',
          outsAfter: index < 7 ? 0 : 1,
          enrichment: { pitchLocation: 'low' },
        })),
      ],
    }));
    const thin = candidate(result, 'h-thin', 'Low Pitch');
    const full = candidate(result, 'h-full', 'Low Pitch');

    expect(thin).toBeDefined();
    expect(thin?.sampleSize).toBe(9);
    expect(thin?.score.sufficient).toBe(false);
    expect(thin?.score.sufficiency).not.toBe('sufficient');
    expect(full).toBeDefined();
    expect(full?.sampleSize).toBe(10);
    expect(full?.score.sufficient).toBe(true);
    expect(full?.score.realityPercentile).not.toBeNull();
    expect(Number.isFinite(full?.score.realityPercentile)).toBe(true);
  });

  it('keeps pitch-location traits behind position-role eligibility', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: [{ playerId: 'pitcher-bat', role: 'pitcher' }],
      atBatEvents: repeat(10, () => atBat({
        batterId: 'pitcher-bat',
        pitcherId: 'opp',
        result: 'HR',
        outsAfter: 0,
        enrichment: { pitchLocation: 'low' },
      })),
    }));
    const raw = buildRawSignals(baseInput({
      atBatEvents: repeat(10, () => atBat({
        batterId: 'pitcher-bat',
        pitcherId: 'opp',
        result: 'HR',
        outsAfter: 0,
        enrichment: { pitchLocation: 'low' },
      })),
    }));

    expect(raw.get('pitcher-bat')?.get('Low Pitch')).toBeDefined();
    expect(candidate(result, 'pitcher-bat', 'Low Pitch')).toBeUndefined();
    expect(candidate(result, 'pitcher-bat', 'High Pitch')).toBeUndefined();
    expect(candidate(result, 'pitcher-bat', 'Inside Pitch')).toBeUndefined();
    expect(candidate(result, 'pitcher-bat', 'Outside Pitch')).toBeUndefined();
  });
});

describe('traitCandidateBuilder DT-C1 Bad Ball Hitter chase signals', () => {
  it('makes Bad Ball Hitter buildable only from tagged chase data and uses hits over hits plus outs', () => {
    for (const traitName of DTC1_CHASE_TRAITS) {
      expect(BUILDABLE_TRAITS).toContain(traitName);
    }

    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['h-good', 'h-chases-outs', 'h-peer', 'h-plain'], 'position'),
      atBatEvents: [
        ...repeat(7, () => atBat({ batterId: 'h-good', result: '1B', outsAfter: 0, enrichment: { chased: true } })),
        ...repeat(2, () => atBat({ batterId: 'h-good', result: 'GO', outsAfter: 1, enrichment: { chased: true } })),
        atBat({ batterId: 'h-good', result: 'K', outsAfter: 1, enrichment: { chased: true } }),
        ...repeat(2, () => atBat({ batterId: 'h-chases-outs', result: '2B', outsAfter: 0, enrichment: { chased: true } })),
        ...repeat(7, () => atBat({ batterId: 'h-chases-outs', result: 'FO', outsAfter: 1, enrichment: { chased: true } })),
        atBat({ batterId: 'h-chases-outs', result: 'K', outsAfter: 1, enrichment: { chased: true } }),
        ...repeat(5, () => atBat({ batterId: 'h-peer', result: 'HR', outsAfter: 0, enrichment: { chased: true } })),
        ...repeat(5, () => atBat({ batterId: 'h-peer', result: 'LO', outsAfter: 1, enrichment: { chased: true } })),
        ...repeat(10, () => atBat({ batterId: 'h-plain', result: 'HR', outsAfter: 0 })),
      ],
    }));

    const good = candidate(result, 'h-good', 'Bad Ball Hitter');
    const chasesOuts = candidate(result, 'h-chases-outs', 'Bad Ball Hitter');
    const peer = candidate(result, 'h-peer', 'Bad Ball Hitter');

    expect(good).toBeDefined();
    expect(good?.signalValue).toBeCloseTo(0.7, 10);
    expect(good?.sampleSize).toBe(10);
    expect(good?.score.sufficient).toBe(true);
    expect(chasesOuts?.signalValue).toBeCloseTo(0.2, 10);
    expect(chasesOuts?.sampleSize).toBe(10);
    expect(peer?.signalValue).toBeCloseTo(0.5, 10);
    expect((chasesOuts?.signalValue ?? 1) < (peer?.signalValue ?? 0)).toBe(true);
    expect(candidate(result, 'h-plain', 'Bad Ball Hitter')).toBeUndefined();
  });

  it('excludes neutral, walk, unchased, and undone at-bats from the chase denominator', () => {
    const raw = buildRawSignals(baseInput({
      atBatEvents: [
        atBat({ batterId: 'h-chase', result: 'HR', outsAfter: 0, enrichment: { chased: true } }),
        atBat({ batterId: 'h-chase', result: 'GO', outsAfter: 1, enrichment: { chased: true } }),
        atBat({ batterId: 'h-chase', result: 'E', outsAfter: 0, enrichment: { chased: true } }),
        atBat({ batterId: 'h-chase', result: 'FC', outsAfter: 1, enrichment: { chased: true } }),
        atBat({ batterId: 'h-chase', result: 'SF', outsAfter: 1, enrichment: { chased: true } }),
        atBat({ batterId: 'h-chase', result: 'SAC', outsAfter: 1, enrichment: { chased: true } }),
        atBat({ batterId: 'h-chase', result: 'HBP', outsAfter: 0, enrichment: { chased: true } }),
        atBat({ batterId: 'h-chase', result: 'BB', outsAfter: 0, enrichment: { chased: true } }),
        atBat({ batterId: 'h-chase', result: 'HR', outsAfter: 0 }),
        atBat({ batterId: 'h-chase', result: 'K', outsAfter: 1, enrichment: { chased: true }, undoneAt: 1 }),
      ],
    }));

    expect(raw.get('h-chase')?.get('Bad Ball Hitter')).toEqual({ signalValue: 0.5, sampleSize: 2 });
  });

  it('gates Bad Ball Hitter at the rate min-sample boundary', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['h-thin', 'h-full', 'h-peer-low', 'h-peer-mid'], 'position'),
      atBatEvents: [
        ...repeat(9, () => atBat({
          batterId: 'h-thin',
          result: 'HR',
          outsAfter: 0,
          enrichment: { chased: true },
        })),
        ...repeat(8, () => atBat({
          batterId: 'h-full',
          result: 'HR',
          outsAfter: 0,
          enrichment: { chased: true },
        })),
        ...repeat(2, () => atBat({
          batterId: 'h-full',
          result: 'GO',
          outsAfter: 1,
          enrichment: { chased: true },
        })),
        ...repeat(4, () => atBat({
          batterId: 'h-peer-low',
          result: '1B',
          outsAfter: 0,
          enrichment: { chased: true },
        })),
        ...repeat(6, () => atBat({
          batterId: 'h-peer-low',
          result: 'FO',
          outsAfter: 1,
          enrichment: { chased: true },
        })),
        ...repeat(6, () => atBat({
          batterId: 'h-peer-mid',
          result: '2B',
          outsAfter: 0,
          enrichment: { chased: true },
        })),
        ...repeat(4, () => atBat({
          batterId: 'h-peer-mid',
          result: 'K',
          outsAfter: 1,
          enrichment: { chased: true },
        })),
      ],
    }));
    const thin = candidate(result, 'h-thin', 'Bad Ball Hitter');
    const full = candidate(result, 'h-full', 'Bad Ball Hitter');

    expect(thin).toBeDefined();
    expect(thin?.sampleSize).toBe(9);
    expect(thin?.score.sufficient).toBe(false);
    expect(thin?.score.sufficiency).not.toBe('sufficient');
    expect(full).toBeDefined();
    expect(full?.sampleSize).toBe(10);
    expect(full?.score.sufficient).toBe(true);
    expect(full?.score.realityPercentile).not.toBeNull();
    expect(Number.isFinite(full?.score.realityPercentile)).toBe(true);
  });

  it('keeps Bad Ball Hitter behind position-role eligibility', () => {
    const input = baseInput({
      players: [{ playerId: 'pitcher-bat', role: 'pitcher' }],
      atBatEvents: repeat(10, () => atBat({
        batterId: 'pitcher-bat',
        pitcherId: 'opp',
        result: 'HR',
        outsAfter: 0,
        enrichment: { chased: true },
      })),
    });
    const raw = buildRawSignals(input);
    const result = computeSeasonTraitCandidates(input);

    expect(raw.get('pitcher-bat')?.get('Bad Ball Hitter')).toBeDefined();
    expect(candidate(result, 'pitcher-bat', 'Bad Ball Hitter')).toBeUndefined();
  });
});

function webGemChances(playerId: string, webGems: number, chances: number): FieldingEvent[] {
  const gemTypes = ['Diving', 'Leaping', 'Sliding'] as const;
  return Array.from({ length: chances }, (_, index) => fielding({
    playerId,
    playerName: playerId,
    specialPlayType: index < webGems ? gemTypes[index % gemTypes.length] : 'Missed Dive',
    success: index < webGems,
  }));
}

describe('traitCandidateBuilder DT-C2 web-gem fielding signals', () => {
  it('makes Magic Hands and Dive Wizard buildable only from fielder-keyed web-gem data plus ratings', () => {
    for (const traitName of DTC2_WEB_GEM_TRAITS) {
      expect(BUILDABLE_TRAITS).toContain(traitName);
    }

    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['fielder', 'peer-low', 'peer-mid'], 'position'),
      fielderRatingsByPlayer: new Map([
        ['fielder', { fielding: 60, arm: 70 }],
        ['peer-low', { fielding: 65, arm: 70 }],
        ['peer-mid', { fielding: 70, arm: 70 }],
      ]),
      fieldingEvents: [
        ...webGemChances('fielder', 3, 10),
        ...webGemChances('peer-low', 1, 10),
        ...webGemChances('peer-mid', 2, 10),
      ],
    }));

    const magic = candidate(result, 'fielder', 'Magic Hands');
    expect(magic).toBeDefined();
    expect(magic?.signalValue).toBeCloseTo(0.3, 10);
    expect(magic?.sampleSize).toBe(10);
    expect(magic?.score.sufficient).toBe(true);
    expect(candidate(result, 'fielder', 'Dive Wizard')).toBeUndefined();
  });

  it('narrows the Magic Hands denominator to made gems, missed gems, and fielding errors', () => {
    const raw = buildRawSignals(baseInput({
      fielderRatingsByPlayer: new Map([['fielder', { fielding: 60, arm: 90 }]]),
      fieldingEvents: [
        ...webGemChances('fielder', 3, 5),
        ...Array.from({ length: 10 }, () => fielding({
          playerId: 'fielder',
          playerName: 'fielder',
          specialPlayType: 'Routine',
          success: true,
        })),
      ],
    }));

    expect(raw.get('fielder')?.get('Magic Hands')).toEqual({ signalValue: 3 / 5, sampleSize: 5 });
    expect(raw.get('fielder')?.get('Dive Wizard')).toEqual({ signalValue: 3 / 5, sampleSize: 5 });
  });

  it('applies strict rating gates at signal emission and allows Magic Hands plus Dive Wizard to co-hold', () => {
    const input = baseInput({
      players: players([
        'fielding-only',
        'arm-only',
        'both',
        'fielding-boundary',
        'arm-boundary',
        'absent-ratings',
      ], 'position'),
      fielderRatingsByPlayer: new Map([
        ['fielding-only', { fielding: 60, arm: 70 }],
        ['arm-only', { fielding: 85, arm: 90 }],
        ['both', { fielding: 60, arm: 90 }],
        ['fielding-boundary', { fielding: 80, arm: 90 }],
        ['arm-boundary', { fielding: 60, arm: 80 }],
      ]),
      fieldingEvents: [
        ...webGemChances('fielding-only', 2, 10),
        ...webGemChances('arm-only', 2, 10),
        ...webGemChances('both', 2, 10),
        ...webGemChances('fielding-boundary', 2, 10),
        ...webGemChances('arm-boundary', 2, 10),
        ...webGemChances('absent-ratings', 2, 10),
      ],
    });
    const raw = buildRawSignals(input);
    const result = computeSeasonTraitCandidates(input);

    expect(raw.get('fielding-only')?.has('Magic Hands')).toBe(true);
    expect(raw.get('fielding-only')?.has('Dive Wizard')).toBe(false);
    expect(candidate(result, 'fielding-only', 'Magic Hands')).toBeDefined();
    expect(candidate(result, 'fielding-only', 'Dive Wizard')).toBeUndefined();

    expect(raw.get('arm-only')?.has('Magic Hands')).toBe(false);
    expect(raw.get('arm-only')?.has('Dive Wizard')).toBe(true);
    expect(candidate(result, 'arm-only', 'Magic Hands')).toBeUndefined();
    expect(candidate(result, 'arm-only', 'Dive Wizard')).toBeDefined();

    expect(raw.get('both')?.has('Magic Hands')).toBe(true);
    expect(raw.get('both')?.has('Dive Wizard')).toBe(true);
    expect(candidate(result, 'both', 'Magic Hands')).toBeDefined();
    expect(candidate(result, 'both', 'Dive Wizard')).toBeDefined();

    expect(raw.get('fielding-boundary')?.has('Magic Hands')).toBe(false);
    expect(raw.get('fielding-boundary')?.has('Dive Wizard')).toBe(true);
    expect(candidate(result, 'fielding-boundary', 'Magic Hands')).toBeUndefined();
    expect(candidate(result, 'fielding-boundary', 'Dive Wizard')).toBeDefined();

    expect(raw.get('arm-boundary')?.has('Magic Hands')).toBe(true);
    expect(raw.get('arm-boundary')?.has('Dive Wizard')).toBe(false);
    expect(candidate(result, 'arm-boundary', 'Magic Hands')).toBeDefined();
    expect(candidate(result, 'arm-boundary', 'Dive Wizard')).toBeUndefined();

    expect(raw.get('absent-ratings')?.has('Magic Hands')).toBe(false);
    expect(raw.get('absent-ratings')?.has('Dive Wizard')).toBe(false);
    expect(candidate(result, 'absent-ratings', 'Magic Hands')).toBeUndefined();
    expect(candidate(result, 'absent-ratings', 'Dive Wizard')).toBeUndefined();
  });

  it('keeps web-gem traits dormant when the fielder ratings map is omitted', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['fielder'], 'position'),
      fieldingEvents: webGemChances('fielder', 10, 10),
    }));

    expect(candidate(result, 'fielder', 'Magic Hands')).toBeUndefined();
    expect(candidate(result, 'fielder', 'Dive Wizard')).toBeUndefined();
  });

  it('filters the Magic Hands comparison cohort before percentiling so elite fielders do not bury sub-80 overperformers', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['overperformer', 'eligible-low', 'eligible-mid', 'elite-glove'], 'position'),
      fielderRatingsByPlayer: new Map([
        ['overperformer', { fielding: 60, arm: 70 }],
        ['eligible-low', { fielding: 65, arm: 70 }],
        ['eligible-mid', { fielding: 75, arm: 70 }],
        ['elite-glove', { fielding: 90, arm: 70 }],
      ]),
      fieldingEvents: [
        ...webGemChances('overperformer', 6, 10),
        ...webGemChances('eligible-low', 2, 10),
        ...webGemChances('eligible-mid', 4, 10),
        ...webGemChances('elite-glove', 10, 10),
      ],
    }));

    const overperformer = candidate(result, 'overperformer', 'Magic Hands');
    expect(candidate(result, 'elite-glove', 'Magic Hands')).toBeUndefined();
    expect(overperformer).toBeDefined();
    expect(overperformer?.score.peerPoolSize).toBe(3);
    expect(overperformer?.score.sufficient).toBe(true);
    expect(overperformer?.score.realityPercentile).toBeCloseTo(1, 10);
  });

  it('gates web-gem traits at the rate min-sample boundary', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['thin', 'full', 'peer-low', 'peer-mid'], 'position'),
      fielderRatingsByPlayer: new Map([
        ['thin', { fielding: 60, arm: 70 }],
        ['full', { fielding: 60, arm: 70 }],
        ['peer-low', { fielding: 65, arm: 70 }],
        ['peer-mid', { fielding: 70, arm: 70 }],
      ]),
      fieldingEvents: [
        ...webGemChances('thin', 9, 9),
        ...webGemChances('full', 5, 10),
        ...webGemChances('peer-low', 2, 10),
        ...webGemChances('peer-mid', 8, 10),
      ],
    }));
    const thin = candidate(result, 'thin', 'Magic Hands');
    const full = candidate(result, 'full', 'Magic Hands');

    expect(thin).toBeDefined();
    expect(thin?.sampleSize).toBe(9);
    expect(thin?.score.sufficient).toBe(false);
    expect(thin?.score.sufficiency).not.toBe('sufficient');
    expect(full).toBeDefined();
    expect(full?.sampleSize).toBe(10);
    expect(full?.score.sufficient).toBe(true);
    expect(full?.score.realityPercentile).not.toBeNull();
    expect(Number.isFinite(full?.score.realityPercentile)).toBe(true);
  });

  it('counts made Diving/Leaping/Sliding/Robbed HR plays and missed spectacular attempts while skipping undone events', () => {
    const raw = buildRawSignals(baseInput({
      fielderRatingsByPlayer: new Map([['fielder', { fielding: 60, arm: 90 }]]),
      fieldingEvents: [
        fielding({ playerId: 'fielder', specialPlayType: 'Diving', success: true }),
        fielding({ playerId: 'fielder', specialPlayType: 'Missed Leap', success: false }),
        fielding({ playerId: 'fielder', specialPlayType: 'Robbed HR', success: true }),
        fielding({ playerId: 'fielder', specialPlayType: 'Sliding', success: true, undoneAt: 1 } as Partial<FieldingEvent>),
      ],
    }));

    expect(raw.get('fielder')?.get('Magic Hands')).toEqual({ signalValue: 2 / 3, sampleSize: 3 });
    expect(raw.get('fielder')?.get('Dive Wizard')).toEqual({ signalValue: 2 / 3, sampleSize: 3 });
  });

  it('feeds Magic Hands and Butter Fingers into the existing opposite-pair duel so only one gain survives', () => {
    expect(computeTraitWeight('Magic Hands')).toBeGreaterThan(0);
    expect(computeTraitWeight('Butter Fingers')).toBeGreaterThan(0);
    expect(1 * computeTraitWeight('Magic Hands')).toBeGreaterThan(0.9 * computeTraitWeight('Butter Fingers'));

    const acquisition = computeTraitAcquisition({
      playerRole: 'position',
      personality: 'Relaxed',
      heldTraits: [],
      candidates: [
        { traitName: 'Magic Hands', score: acquisitionScore('Magic Hands', 1) },
        { traitName: 'Butter Fingers', score: acquisitionScore('Butter Fingers', 0.9) },
      ],
    });

    expect(acquisition.proposals).toMatchObject([
      { traitName: 'Magic Hands', valence: 'gain' },
    ]);
    expect(acquisition.skipped).toEqual([
      { traitName: 'Butter Fingers', reason: 'offsetting_pair_held' },
    ]);
  });

  it('blocks either hands trait when the opposite trait is already held', () => {
    const butterBlocked = computeTraitAcquisition({
      playerRole: 'position',
      personality: 'Relaxed',
      heldTraits: [{ traitName: 'Magic Hands', strength: 0.8 }],
      candidates: [{ traitName: 'Butter Fingers', score: acquisitionScore('Butter Fingers', 1) }],
    });
    const magicBlocked = computeTraitAcquisition({
      playerRole: 'position',
      personality: 'Relaxed',
      heldTraits: [{ traitName: 'Butter Fingers', strength: 0.8 }],
      candidates: [{ traitName: 'Magic Hands', score: acquisitionScore('Magic Hands', 1) }],
    });

    expect(butterBlocked.proposals).toEqual([]);
    expect(butterBlocked.skipped).toEqual([
      { traitName: 'Butter Fingers', reason: 'offsetting_pair_held' },
    ]);
    expect(magicBlocked.proposals).toEqual([]);
    expect(magicBlocked.skipped).toEqual([
      { traitName: 'Magic Hands', reason: 'offsetting_pair_held' },
    ]);
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

  it('gates pitch-type traits at the rate min-sample boundary', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['p-thin', 'p-full', 'p-peer-low', 'p-peer-mid'], 'pitcher'),
      atBatEvents: [
        ...repeat(9, (index) => atBat({
          pitcherId: 'p-thin',
          batterId: `h-thin-${index}`,
          result: 'K',
          enrichment: { pitchType: '4F' },
        })),
        ...repeat(10, (index) => atBat({
          pitcherId: 'p-full',
          batterId: `h-full-${index}`,
          result: index < 8 ? 'K' : 'GO',
          enrichment: { pitchType: '4F' },
        })),
        ...repeat(10, (index) => atBat({
          pitcherId: 'p-peer-low',
          batterId: `h-low-${index}`,
          result: index < 5 ? 'K' : 'GO',
          enrichment: { pitchType: '4F' },
        })),
        ...repeat(10, (index) => atBat({
          pitcherId: 'p-peer-mid',
          batterId: `h-mid-${index}`,
          result: index < 7 ? 'K' : 'GO',
          enrichment: { pitchType: '4F' },
        })),
      ],
    }));
    const thin = candidate(result, 'p-thin', 'Elite 4F');
    const full = candidate(result, 'p-full', 'Elite 4F');

    expect(thin).toBeDefined();
    expect(thin?.sampleSize).toBe(9);
    expect(thin?.score.sufficient).toBe(false);
    expect(thin?.score.sufficiency).not.toBe('sufficient');
    expect(full).toBeDefined();
    expect(full?.sampleSize).toBe(10);
    expect(full?.score.sufficient).toBe(true);
    expect(full?.score.realityPercentile).not.toBeNull();
    expect(Number.isFinite(full?.score.realityPercentile)).toBe(true);
  });

  it('keeps pitch-type traits behind role eligibility', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: [
        { playerId: 'position-throwing', role: 'position' },
        { playerId: 'pitcher-hitting', role: 'pitcher' },
      ],
      atBatEvents: repeat(10, (index) => atBat({
        pitcherId: 'position-throwing',
        batterId: 'pitcher-hitting',
        result: index < 6 ? 'K' : 'GO',
        enrichment: { pitchType: '4F' },
      })),
    }));
    const raw = buildRawSignals(baseInput({ atBatEvents: repeat(10, (index) => atBat({
      pitcherId: 'position-throwing',
      batterId: 'pitcher-hitting',
      result: index < 6 ? 'K' : 'GO',
      enrichment: { pitchType: '4F' },
    })) }));

    expect(raw.get('position-throwing')?.get('Elite 4F')).toBeDefined();
    expect(raw.get('pitcher-hitting')?.get('Fastball Hitter')).toBeDefined();
    expect(candidate(result, 'position-throwing', 'Elite 4F')).toBeUndefined();
    expect(candidate(result, 'pitcher-hitting', 'Fastball Hitter')).toBeUndefined();
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
