import { describe, expect, test } from 'vitest';

import { SUB_REC_THRESHOLD } from '../../data/rosterEngineConstants';
import {
  effectiveRatings,
  type EffectiveRatingsPlayer,
  type GameContext,
  type PlayerState,
} from '../effectiveRatings';
import { computeIV, type IVPlayerInput } from '../ivEngine';
import { recommendSubs, type SubCandidate, type SubRecThresholds, type SubRecType } from '../subRecommendations';

const baseCtx: GameContext = {
  pressure: 'none',
  runnersOn: false,
  risp: false,
  opposingHand: 'R',
  inning: 7,
  basesEmpty: true,
  batterHand: 'R',
  pitcherHand: 'R',
};

const normalState: PlayerState = { mojo: 'Normal', fitness: 'FIT' };

function player(overrides: Partial<EffectiveRatingsPlayer> = {}): EffectiveRatingsPlayer {
  return {
    id: 'player',
    name: 'Player',
    primaryPosition: 'DH',
    secondaryPosition: null,
    bats: 'R',
    throws: 'R',
    grade: 'B',
    traits: [],
    power: 50,
    contact: 50,
    speed: 50,
    fielding: 50,
    arm: 50,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    ...overrides,
  };
}

function pitcher(overrides: Partial<EffectiveRatingsPlayer> = {}): EffectiveRatingsPlayer {
  return player({
    primaryPosition: 'SP',
    role: 'SP',
    power: 15,
    contact: 15,
    speed: 25,
    fielding: 55,
    arm: 55,
    velocity: 55,
    junk: 55,
    accuracy: 55,
    ...overrides,
  });
}

function candidate(playerInput: EffectiveRatingsPlayer, overrides: Partial<SubCandidate> = {}): SubCandidate {
  return {
    player: playerInput,
    state: normalState,
    ...overrides,
  };
}

function manualIvOfEffectiveRatings(
  inputPlayer: EffectiveRatingsPlayer,
  state: PlayerState,
  ctx: GameContext,
): number {
  const eff = effectiveRatings(inputPlayer, state, ctx);
  const input: IVPlayerInput = {
    id: inputPlayer.id,
    name: inputPlayer.name,
    isPitcher: ['SP', 'SP/RP', 'RP', 'CP'].includes(String(inputPlayer.primaryPosition ?? inputPlayer.role)),
    bats: inputPlayer.bats,
    primaryPosition: String(inputPlayer.primaryPosition ?? '1B').toUpperCase(),
    secondaryPosition: inputPlayer.secondaryPosition ?? null,
    pitcherRole: inputPlayer.role ?? String(inputPlayer.primaryPosition ?? 'SP'),
    traits: Array.isArray(inputPlayer.traits) ? inputPlayer.traits : [],
    arsenal: (inputPlayer as { arsenal?: string[] }).arsenal,
    armSlot: null,
    ratings: {
      POW: clamp(eff.POW),
      CON: clamp(eff.CON),
      SPD: clamp(eff.SPD),
      FLD: clamp(eff.FLD),
      ARM: clamp(eff.ARM),
    },
    pitcherRatings: {
      velocity: clamp(eff.VEL),
      junk: clamp(eff.JNK),
      accuracy: clamp(eff.ACC),
    },
  };
  return computeIV(input).kblIV;
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(99, value));
}

describe('subRecommendations T9a pure engine', () => {
  test('scoring one truth equals kblIV from effectiveRatings into computeIV', () => {
    const liveCtx: GameContext = { ...baseCtx, pressure: 'high', isSubstitutionAB: true };
    const benchBat = player({
      id: 'bench',
      name: 'Bench Bat',
      traits: ['Pinch Perfect'],
      power: 62,
      contact: 64,
      speed: 41,
      fielding: 35,
      arm: 35,
    });
    const rec = recommendSubs({
      type: 'pinch_hit',
      current: candidate(player({ id: 'starter', name: 'Starter', power: 45, contact: 45 })),
      candidates: [candidate(benchBat)],
      ctx: liveCtx,
    });

    expect(rec.rankedCandidates[0].rawKblIV).toBe(manualIvOfEffectiveRatings(benchBat, normalState, liveCtx));
  });

  test('pinch_hit recommends a clearly better bat and suppresses a marginal bat', () => {
    const current = candidate(player({ id: 'current', name: 'Current Bat', power: 35, contact: 35, speed: 30 }));
    const clearUpgrade = candidate(player({
      id: 'upgrade',
      name: 'Clear Upgrade',
      power: 92,
      contact: 90,
      speed: 70,
      fielding: 55,
      arm: 55,
    }));
    const marginal = candidate(player({
      id: 'marginal',
      name: 'Marginal Bat',
      power: 36,
      contact: 36,
      speed: 30,
    }));

    const clearRec = recommendSubs({ type: 'pinch_hit', current, candidates: [clearUpgrade], ctx: baseCtx });
    const marginalRec = recommendSubs({ type: 'pinch_hit', current, candidates: [marginal], ctx: baseCtx });

    expect(clearRec.recommend).toBe(true);
    expect(clearRec.bestDelta).toBeGreaterThan(SUB_REC_THRESHOLD.pinch_hit);
    expect(clearRec.confidence).toBeDefined();
    expect(marginalRec.recommend).toBe(false);
  });

  test('pressure amplifies mojo inside effectiveRatings scoring', () => {
    const hotBat = candidate(
      player({ id: 'hot', name: 'Hot Bat', power: 60, contact: 60 }),
      { state: { mojo: 'On Fire', fitness: 'FIT' } },
    );
    const none = recommendSubs({
      type: 'pinch_hit',
      current: candidate(player({ id: 'current', power: 50, contact: 50 })),
      candidates: [hotBat],
      ctx: { ...baseCtx, pressure: 'none' },
    });
    const extreme = recommendSubs({
      type: 'pinch_hit',
      current: candidate(player({ id: 'current', power: 50, contact: 50 })),
      candidates: [hotBat],
      ctx: { ...baseCtx, pressure: 'extreme' },
    });

    expect(extreme.rankedCandidates[0].rawKblIV).not.toBe(none.rankedCandidates[0].rawKblIV);
    expect(extreme.rankedCandidates[0].rawKblIV).toBeGreaterThan(none.rankedCandidates[0].rawKblIV);
  });

  test('trait activation names Pinch Perfect and trait-vs-trait standoffs', () => {
    const pinchPerfect = candidate(player({
      id: 'pinch-perfect',
      name: 'Pinch Perfect Bat',
      traits: ['Pinch Perfect'],
      power: 62,
      contact: 62,
    }));
    const pinchRec = recommendSubs({
      type: 'pinch_hit',
      current: candidate(player({ id: 'current', power: 50, contact: 50 })),
      candidates: [pinchPerfect],
      ctx: { ...baseCtx, isSubstitutionAB: true },
    });

    expect(pinchRec.rankedCandidates[0].activeTraits).toContain('Pinch Perfect');
    expect(pinchRec.rankedCandidates[0].justification).toBe('Pinch Perfect active');

    const toughOut = candidate(player({
      id: 'tough-out',
      name: 'Tough Out Bat',
      traits: ['Tough Out'],
      power: 55,
      contact: 55,
    }));
    const standoffRec = recommendSubs({
      type: 'pinch_hit',
      current: candidate(player({ id: 'current', power: 50, contact: 50 })),
      candidates: [toughOut],
      ctx: {
        ...baseCtx,
        count: { balls: 0, strikes: 2 },
        opposingPlayer: pitcher({ id: 'collector', name: 'Collector', traits: ['K Collector'] }),
      },
    });

    expect(standoffRec.rankedCandidates[0].activeTraits).toContain('Tough Out');
    expect(standoffRec.rankedCandidates[0].justification).toBe('Tough Out vs K Collector');
  });

  test('pitcher_change role misuse shifts mojo before scoring', () => {
    const current = candidate(pitcher({ id: 'current-p', name: 'Current Pitcher', velocity: 45, junk: 45, accuracy: 45 }));
    const spRelief = candidate(
      pitcher({ id: 'starter', name: 'Starter In Relief', role: 'SP', primaryPosition: 'SP', velocity: 80, junk: 78, accuracy: 76 }),
      { enteringInRelief: true },
    );
    const spStarting = candidate(
      pitcher({ id: 'starter', name: 'Starter In Relief', role: 'SP', primaryPosition: 'SP', velocity: 80, junk: 78, accuracy: 76 }),
      { enteringInRelief: false },
    );
    const swingman = candidate(
      pitcher({ id: 'swingman', name: 'Swingman', role: 'SP/RP', primaryPosition: 'SP/RP', velocity: 80, junk: 78, accuracy: 76 }),
      { enteringInRelief: true },
    );
    const closerStarting = candidate(
      pitcher({ id: 'closer', name: 'Closer Starting', role: 'CP', primaryPosition: 'CP', velocity: 80, junk: 78, accuracy: 76 }),
      { enteringInRelief: false },
    );

    const reliefRec = recommendSubs({ type: 'pitcher_change', current, candidates: [spRelief], ctx: baseCtx });
    const noShiftRec = recommendSubs({ type: 'pitcher_change', current, candidates: [spStarting], ctx: baseCtx });
    const swingmanRec = recommendSubs({ type: 'pitcher_change', current, candidates: [swingman], ctx: baseCtx });
    const closerRec = recommendSubs({ type: 'pitcher_change', current, candidates: [closerStarting], ctx: baseCtx });

    expect(reliefRec.rankedCandidates[0].mojoLevelShift).toBe(1);
    expect(reliefRec.rankedCandidates[0].rawKblIV).toBeLessThan(noShiftRec.rankedCandidates[0].rawKblIV);
    expect(swingmanRec.rankedCandidates[0].mojoLevelShift).toBe(0);
    expect(closerRec.rankedCandidates[0].mojoLevelShift).toBe(2);
  });

  test('defensive_replacement subtracts defensive risk and can reorder better bats', () => {
    const current = candidate(
      player({ id: 'current-ss', name: 'Current SS', primaryPosition: 'SS', power: 45, contact: 45, fielding: 60, arm: 60 }),
      { position: 'SS' },
    );
    const riskyBat = candidate(
      player({ id: 'risky', name: 'Risky Bat', primaryPosition: '1B', power: 95, contact: 92, fielding: 5, arm: 5 }),
      { position: 'SS' },
    );
    const safeGlove = candidate(
      player({ id: 'safe', name: 'Safe Glove', primaryPosition: 'SS', power: 58, contact: 58, fielding: 96, arm: 94 }),
      { position: 'SS' },
    );

    const rec = recommendSubs({
      type: 'defensive_replacement',
      current,
      candidates: [riskyBat, safeGlove],
      ctx: baseCtx,
    });
    const riskyScore = rec.rankedCandidates.find((score) => score.candidateId === 'risky');
    const safeScore = rec.rankedCandidates.find((score) => score.candidateId === 'safe');

    expect(riskyScore?.rawKblIV).toBeGreaterThan(safeScore?.rawKblIV ?? 0);
    expect(riskyScore?.defensivePenalty).toBeGreaterThan(safeScore?.defensivePenalty ?? 0);
    expect(rec.rankedCandidates[0].candidateId).toBe('safe');
  });

  test('threshold per type uses that type entry and custom overrides', () => {
    const thresholds: SubRecThresholds = {
      pinch_hit: 1,
      defensive_replacement: 1_000_000,
      pitcher_change: 1_000_000,
    };
    const current = candidate(player({ id: 'current', power: 50, contact: 50 }));
    const upgrade = candidate(player({ id: 'upgrade', power: 60, contact: 60 }), { position: 'DH' });

    const pinch = recommendSubs({ type: 'pinch_hit', current, candidates: [upgrade], ctx: baseCtx, thresholds });
    const defensive = recommendSubs({
      type: 'defensive_replacement',
      current: { ...current, position: 'DH' },
      candidates: [upgrade],
      ctx: baseCtx,
      thresholds,
    });
    const defaultsByType = (['pinch_hit', 'defensive_replacement', 'pitcher_change'] as SubRecType[])
      .map((type) => recommendSubs({ type, current, candidates: [upgrade], ctx: baseCtx }).threshold);

    expect(pinch.recommend).toBe(true);
    expect(defensive.recommend).toBe(false);
    expect(defaultsByType).toEqual([
      SUB_REC_THRESHOLD.pinch_hit,
      SUB_REC_THRESHOLD.defensive_replacement,
      SUB_REC_THRESHOLD.pitcher_change,
    ]);
  });
});
