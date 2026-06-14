import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  BAT_USAGE_ATTRS,
  DEFENSIVE_PLACEMENT_SCALING,
  DEFENSIVE_POSITION_PENALTY_MULTIPLIER,
  FATIGUE_MODEL,
  MOJO_DELTAS,
  MOJO_STATES,
  OUT_OF_POSITION_MOJO_PENALTY,
  PITCHER_ASSUMED_ARM,
  PITCH_ATTRS,
  POSITION_CHANCE_FREQUENCY,
  POTENCY_SCALE,
  ROLE_MISUSE_MOJO_PENALTY,
  SP_RP_FLEX_PREMIUM,
  SP_RP_INNINGS_ALPHA,
  TWO_WAY_ARM_BY_TIER,
  TWO_WAY_TRAIT_POSITION,
  TWO_WAY_USAGE,
  USAGE_INPUTS,
  deriveUsageWeights,
} from '../../data/rosterEngineConstants';
import { defensivePlacementRisk, effectiveRatings } from '../effectiveRatings';

type EffectiveRatingsPlayer = Parameters<typeof effectiveRatings>[0];
type PlayerState = Parameters<typeof effectiveRatings>[1];
type GameContext = Parameters<typeof effectiveRatings>[2];

const basePlayer: EffectiveRatingsPlayer = {
  id: 'base',
  name: 'Base Player',
  primaryPosition: 'SS',
  secondaryPosition: '2B',
  bats: 'R',
  throws: 'R',
  grade: 'B',
  power: 50,
  contact: 51,
  speed: 52,
  fielding: 53,
  arm: 54,
  velocity: 55,
  junk: 56,
  accuracy: 57,
  traits: [],
};

const normalState: PlayerState = { mojo: 'Normal', fitness: 'FIT' };
const baseCtx: GameContext = {
  pressure: 'none',
  runnersOn: false,
  risp: false,
  opposingHand: 'R',
  inning: 1,
};

function player(overrides: Partial<EffectiveRatingsPlayer>): EffectiveRatingsPlayer {
  return { ...basePlayer, ...overrides };
}

function ratings(overrides: Partial<EffectiveRatingsPlayer> = {}, ctx: Partial<GameContext> = {}, state: Partial<PlayerState> = {}) {
  return effectiveRatings(player(overrides), { ...normalState, ...state }, { ...baseCtx, ...ctx });
}

describe('effectiveRatings T6 pure engine', () => {
  test('E1 baseRatings maps flat Player fields to the eight Attr vector', () => {
    expect(ratings()).toEqual({
      POW: 50,
      CON: 51,
      SPD: 52,
      FLD: 53,
      ARM: 54,
      VEL: 55,
      JNK: 56,
      ACC: 57,
    });
  });

  test('E2 mojoModifier applies each additive state delta and pressure scaling', () => {
    for (const mojo of MOJO_STATES) {
      const result = effectiveRatings(player({ power: 50 }), { mojo, fitness: 'FIT' }, baseCtx);
      expect(result.POW, mojo).toBe(50 + MOJO_DELTAS[mojo]);
    }

    expect(effectiveRatings(player({ power: 50 }), { mojo: 'Locked In', fitness: 'FIT' }, { ...baseCtx, pressure: 'high' }).POW)
      .toBe(50 + MOJO_DELTAS['Locked In'] * 1.5);
    expect(effectiveRatings(player({ power: 50 }), { mojo: 'On Fire', fitness: 'FIT' }, { ...baseCtx, pressure: 'extreme' }).POW)
      .toBe(50 + MOJO_DELTAS['On Fire'] * 2);
  });

  test('E3 predicate evaluator activates and suppresses representative predicate families', () => {
    expect(ratings({ traits: ['Gets Ahead'] }, { count: { balls: 0, strikes: 0 } }).ACC).toBe(82);
    expect(ratings({ traits: ['Gets Ahead'] }, { count: { balls: 1, strikes: 0 } }).ACC).toBe(57);

    expect(ratings({ traits: ['BB Prone'] }, { count: { balls: 3, strikes: 1 } }).ACC).toBe(32);
    expect(ratings({ traits: ['BB Prone'] }, { count: { balls: 2, strikes: 1 } }).ACC).toBe(57);

    expect(ratings({ traits: ['K Collector'] }, { count: { balls: 0, strikes: 2 } }).VEL).toBe(70);
    expect(ratings({ traits: ['K Collector'] }, { count: { balls: 0, strikes: 1 } }).VEL).toBe(55);

    expect(ratings({ traits: ['Clutch'] }, { pressure: 'high' }).POW).toBe(55);
    expect(ratings({ traits: ['Clutch'] }, { pressure: 'none' }).POW).toBe(50);

    expect(ratings({ traits: ['Rally Stopper'] }, { runnersOn: 2 }).VEL).toBe(65);
    expect(ratings({ traits: ['Rally Stopper'] }, { runnersOn: 1 }).VEL).toBe(55);

    expect(ratings({ traits: ['POW vs RHP'] }, { opposingHand: 'R' }).POW).toBe(60);
    expect(ratings({ traits: ['POW vs RHP'] }, { opposingHand: 'L' }).POW).toBe(50);

    expect(ratings({ traits: ['Ace Exterminator'] }, { opposingPlayer: player({ grade: 'A-' }) }).POW).toBe(70);
    expect(ratings({ traits: ['Ace Exterminator'] }, { opposingPlayer: player({ grade: 'B+' }) }).POW).toBe(50);

    expect(ratings({ traits: ['Pinch Perfect'] }, { isSubstitutionAB: true }).CON).toBe(63);
    expect(ratings({ traits: ['Pinch Perfect'] }, { isSubstitutionAB: false }).CON).toBe(51);

    expect(ratings({ traits: ['Stealer'] }, { stealAttempt: true }).SPD).toBe(59);
    expect(ratings({ traits: ['Base Rounder'] }, { roundingBase: true }).SPD).toBe(54.5);
    expect(ratings({ traits: ['Sprinter'] }, { runningOutOfBox: true }).SPD).toBe(57);
    expect(ratings({ traits: ['Bunter'] }, { buntAttempt: true }).CON).toBe(53);
    expect(ratings({ traits: ['Fastball Hitter'] }, { pitchType: '4F' }).CON).toBe(58);
    expect(ratings({ traits: ['High Pitch'] }, { pitchLocation: 'high' }).POW).toBe(55);
    expect(ratings({ traits: ['Rally Starter'] }, { teamLosing: true, basesEmpty: true, runnersOn: 0 }).CON).toBe(76);
    expect(ratings({ traits: ['Meltdown'] }, { consecutiveBaserunnersAllowed: 4 }).ACC).toBeLessThan(57);
  });

  test('E4 potency scaling handles positive, standardInverted, and guideExplicit traits', () => {
    const positiveL1 = effectiveRatings(player({ traits: ['Sprinter'] }), normalState, { ...baseCtx, runningOutOfBox: true }, 'L1');
    const positiveL2 = effectiveRatings(player({ traits: ['Sprinter'] }), normalState, { ...baseCtx, runningOutOfBox: true }, 'L2');
    const positiveL3 = effectiveRatings(player({ traits: ['Sprinter'] }), normalState, { ...baseCtx, runningOutOfBox: true }, 'L3');
    expect(positiveL1.SPD).toBeLessThan(positiveL2.SPD);
    expect(positiveL2.SPD).toBeLessThan(positiveL3.SPD);

    const invertedL1 = effectiveRatings(player({ traits: ['Whiffer'] }), normalState, { ...baseCtx, count: { balls: 0, strikes: 2 } }, 'L1');
    const invertedL2 = effectiveRatings(player({ traits: ['Whiffer'] }), normalState, { ...baseCtx, count: { balls: 0, strikes: 2 } }, 'L2');
    const invertedL3 = effectiveRatings(player({ traits: ['Whiffer'] }), normalState, { ...baseCtx, count: { balls: 0, strikes: 2 } }, 'L3');
    expect(invertedL1.CON).toBeLessThan(invertedL2.CON);
    expect(invertedL2.CON).toBeLessThan(invertedL3.CON);

    const explicitL1 = effectiveRatings(player({ traits: ['K Collector'] }), normalState, { ...baseCtx, count: { balls: 0, strikes: 2 } }, 'L1');
    const explicitL3 = effectiveRatings(player({ traits: ['K Collector'] }), normalState, { ...baseCtx, count: { balls: 0, strikes: 2 } }, 'L3');
    expect(explicitL1.VEL).toBe(63);
    expect(explicitL3.VEL).toBe(85);
  });

  test('E5 A14 doubles Clutch and Choker deltas at extreme pressure', () => {
    expect(ratings({ traits: ['Clutch'] }, { pressure: 'extreme' }).POW).toBe(60);
    expect(ratings({ traits: ['Choker'] }, { pressure: 'extreme' }).POW).toBe(40);
  });

  test('E6 opponentImposedDeltas applies Mind Gamer against our ACC', () => {
    const result = effectiveRatings(
      player({ accuracy: 60 }),
      normalState,
      { ...baseCtx, opposingPlayer: player({ traits: ['Mind Gamer'] }) },
    );
    expect(result.ACC).toBe(45);
  });

  test('E7 handedness split traits are applied from opposingHand', () => {
    expect(ratings({ traits: ['CON vs LHP'] }, { opposingHand: 'L' }).CON).toBe(61);
    expect(ratings({ traits: ['CON vs LHP'] }, { opposingHand: 'R' }).CON).toBe(51);
  });

  test('E8 fatigueDecay responds to role threshold, Durable/Injury Prone, and high mojo', () => {
    const tired = effectiveRatings(
      player({ primaryPosition: 'SP', traits: [] }),
      { mojo: 'Normal', fitness: 'FIT', workload: { role: 'SP', pitchesThrown: 80 } },
      baseCtx,
    );
    expect(tired.POW).toBe(46);

    const durable = effectiveRatings(
      player({ primaryPosition: 'SP', traits: ['Durable'] }),
      { mojo: 'Normal', fitness: 'FIT', workload: { role: 'SP', pitchesThrown: 80 } },
      baseCtx,
    );
    const injuryProne = effectiveRatings(
      player({ primaryPosition: 'SP', traits: ['Injury Prone'] }),
      { mojo: 'Normal', fitness: 'FIT', workload: { role: 'SP', pitchesThrown: 80 } },
      baseCtx,
    );
    expect(durable.POW).toBeGreaterThan(tired.POW);
    expect(injuryProne.POW).toBeLessThan(tired.POW);

    const normalMojo = effectiveRatings(
      player({ primaryPosition: 'SP' }),
      { mojo: 'Normal', fitness: 'FIT', workload: { role: 'SP', pitchesThrown: 80 } },
      baseCtx,
    );
    const highMojo = effectiveRatings(
      player({ primaryPosition: 'SP' }),
      { mojo: 'On Fire', fitness: 'FIT', workload: { role: 'SP', pitchesThrown: 80 } },
      baseCtx,
    );
    expect(highMojo.POW - MOJO_DELTAS['On Fire']).toBeGreaterThan(normalMojo.POW);
  });

  test('E9 defensivePlacementRisk prices traffic, fielding weakness, eligibility, Two Way, and Utility', () => {
    const weakShortstop = player({ primaryPosition: 'SS', fielding: 20, arm: 40, speed: 30, traits: [] });
    const weakSsRisk = defensivePlacementRisk(weakShortstop, 'SS');
    expect(weakSsRisk.chanceFrequency).toBe(POSITION_CHANCE_FREQUENCY.SS);
    expect(weakSsRisk.errorLikelihood).toBeGreaterThan(0.5);
    expect(weakSsRisk.expectedMojoDriftPerGame).toBeLessThan(0);

    const primary = defensivePlacementRisk(player({ primaryPosition: 'SS', secondaryPosition: '2B', fielding: 60, arm: 60 }), 'SS');
    const secondary = defensivePlacementRisk(player({ primaryPosition: 'SS', secondaryPosition: '2B', fielding: 60, arm: 60 }), '2B');
    const other = defensivePlacementRisk(player({ primaryPosition: 'SS', secondaryPosition: '2B', fielding: 60, arm: 60 }), 'CF');
    expect(secondary.expectedMojoDriftPerGame).toBeGreaterThan(other.expectedMojoDriftPerGame);
    expect(primary.expectedMojoDriftPerGame).toBeGreaterThan(other.expectedMojoDriftPerGame);
    expect(primary.expectedMojoDriftPerGame).toBeGreaterThan(secondary.expectedMojoDriftPerGame);
    expect(other.expectedMojoDriftPerGame).toBeLessThanOrEqual(-OUT_OF_POSITION_MOJO_PENALTY);

    const twoWay = defensivePlacementRisk(player({ primaryPosition: 'SP', fielding: 60, arm: 60, speed: 50, traits: ['Two Way (IF)'] }), 'SS');
    const noTwoWay = defensivePlacementRisk(player({ primaryPosition: 'SP', fielding: 60, arm: 60, speed: 50, traits: [] }), 'SS');
    expect(twoWay.expectedMojoDriftPerGame).toBeGreaterThan(noTwoWay.expectedMojoDriftPerGame);

    const utility = defensivePlacementRisk(player({ primaryPosition: 'SS', secondaryPosition: '2B', fielding: 60, arm: 60, speed: 50, traits: ['Utility'] }), '2B');
    const noUtility = defensivePlacementRisk(player({ primaryPosition: 'SS', secondaryPosition: '2B', fielding: 60, arm: 60, speed: 50, traits: [] }), '2B');
    const utilityOutOfPosition = defensivePlacementRisk(player({ primaryPosition: 'SS', secondaryPosition: '2B', fielding: 60, arm: 60, speed: 50, traits: ['Utility'] }), 'CF');
    expect(utility.errorLikelihood).toBeLessThan(noUtility.errorLikelihood);
    expect(utilityOutOfPosition.errorLikelihood).toBe(other.errorLikelihood);
  });

  test('E10 purity seam and determinism mirror the IV engine contract', () => {
    const source = readFileSync('src/engines/effectiveRatings.ts', 'utf8');
    expect(source).not.toMatch(/ivEngine|salaryCalculator|tierParams|playerDatabase|mojoEngine|fitnessEngine|indexedDB|gameStorage/);
    expect(source).toMatch(/TRAIT_INTERACTION_MATRIX/);
    const once = ratings({ traits: ['Clutch', 'Sprinter'] }, { pressure: 'high', runningOutOfBox: true });
    const twice = ratings({ traits: ['Clutch', 'Sprinter'] }, { pressure: 'high', runningOutOfBox: true });
    expect(twice).toEqual(once);
  });

  test('E11 registry non-mutation keeps pre-existing exports pinned and exposes new constants', () => {
    expect(USAGE_INPUTS).toEqual({
      SP: { startShare: 0.25, paRatio: 0.625, phFloor: 0.04, prFloor: 0.02, rangeFloor: 0.10 },
      'SP/RP': { startShare: 0.18, paRatio: 0.625, phFloor: 0.0375, prFloor: 0.02, rangeFloor: 0.08 },
      RP: { startShare: 0, paRatio: 0.625, phFloor: 0.08, prFloor: 0.02, rangeFloor: 0.06 },
      CP: { startShare: 0, paRatio: 0.625, phFloor: 0.05, prFloor: 0.01, rangeFloor: 0.05 },
    });
    expect(SP_RP_INNINGS_ALPHA).toBe(0.30);
    expect(SP_RP_FLEX_PREMIUM).toBe(1.12);
    expect(TWO_WAY_ARM_BY_TIER).toEqual({ L1: 60, L2: 80, L3: 99 });
    expect(TWO_WAY_USAGE).toBe(1);
    expect(POTENCY_SCALE).toEqual({
      positives: { L1: 0.5, L2: 1.0, L3: 2.0 },
      standardInverted: { L1: 2.0, L2: 1.0, L3: 0.5 },
    });
    expect(PITCHER_ASSUMED_ARM).toBe(99);
    expect(TWO_WAY_TRAIT_POSITION).toEqual({ 'Two Way (C)': 'C', 'Two Way (IF)': 'IF', 'Two Way (OF)': 'OF' });
    expect(deriveUsageWeights('SP')).toEqual({ POW: 0.19625, CON: 0.19625, SPD: 0.31625000000000003, FLD: 1 });
    expect(PITCH_ATTRS).toEqual(['VEL', 'JNK', 'ACC']);
    expect(BAT_USAGE_ATTRS).toEqual(['POW', 'CON', 'SPD', 'FLD']);

    expect(MOJO_STATES).toHaveLength(6);
    expect(ROLE_MISUSE_MOJO_PENALTY.cpStarting).toBe(2);
    expect(FATIGUE_MODEL.rolePitchThresholds.SP).toBe(70);
    expect(DEFENSIVE_POSITION_PENALTY_MULTIPLIER.other).toBeGreaterThan(DEFENSIVE_POSITION_PENALTY_MULTIPLIER.secondary);
    expect(DEFENSIVE_PLACEMENT_SCALING.errorFieldingWeight).toBeGreaterThan(0);
  });

  test('E12 first-consumer wire imports the TraitInteractionMatrix', () => {
    const source = readFileSync('src/engines/effectiveRatings.ts', 'utf8');
    expect(source).toMatch(/TRAIT_INTERACTION_MATRIX/);
    expect(source).toContain("from '../data/traitInteractionMatrix'");
  });
});
