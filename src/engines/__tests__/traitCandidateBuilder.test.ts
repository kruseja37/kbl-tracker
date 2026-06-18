import { describe, expect, it } from 'vitest';
import { activeTraitNames } from '../effectiveRatings';
import {
  BUILDABLE_TRAITS,
  computeSeasonTraitCandidates,
  reconstructAtBatContext,
  type AtBatContextRunningState,
  type SeasonTraitCandidateInput,
  type SeasonTraitPlayer,
  type TraitCandidate,
} from '../traitCandidateBuilder';
import { CANONICAL_TRAIT_NAMES } from '../traitRealityScorer';
import type { EffectiveRatingsPlayer, GameContext } from '../effectiveRatings';
import type { AtBatEvent, BetweenPlayEvent, FieldingEvent, RunnerState } from '../../utils/eventLog';

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

function candidate(map: Map<string, TraitCandidate[]>, playerId: string, traitName: string): TraitCandidate | undefined {
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
    expect(candidate(result, 'b2', 'Injury Prone')?.realityPercentile).toBeNull();
    expect(candidate(result, 'b2', 'Injury Prone')?.sufficiency).toBe('thin_sample');
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
    expect(candidate(result, 'p1', 'Clutch')?.peerPoolSize).toBe(3);
    expect(candidate(result, 'b1', 'Clutch')?.peerPoolSize).toBe(1);
  });

  it('lets the scorer valve mark thin samples dormant', () => {
    const result = computeSeasonTraitCandidates(baseInput({
      players: players(['b1'], 'position'),
      atBatEvents: [atBat({ batterId: 'b1', isClutch: true, battingTeamDelta: 0.2 })],
    }));
    expect(candidate(result, 'b1', 'Clutch')?.realityPercentile).toBeNull();
    expect(candidate(result, 'b1', 'Clutch')?.sufficiency).not.toBe('sufficient');
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
