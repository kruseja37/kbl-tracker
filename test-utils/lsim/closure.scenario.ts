import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  buildLsimFeedbackClosureProof,
  getFeedbackClosureInvariantChecks,
  runLsimFeedbackClosure,
  type LsimFeedbackClosureConfig,
} from './feedbackClosure';
import type { LsimPerformanceRegime } from './syntheticGame';

const TRACKED_PLAYER_IDS = Array.from(
  { length: 9 },
  (_, index) => `lsim-team-02-mlb-${String(index + 1).padStart(2, '0')}-${
    ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH'][index]
  }`,
);
const RECOVERY_START = 19;

const NEUTRAL_REGIME: LsimPerformanceRegime = {
  id: 'neutral-control',
  phases: [{
    id: 'neutral',
    startGameNumber: 1,
    endGameNumber: 30,
    playerIds: TRACKED_PLAYER_IDS,
    hitTendencyMultiplier: 1,
    powerTendencyMultiplier: 1,
  }],
};

const SLUMP_RECOVERY_REGIME: LsimPerformanceRegime = {
  id: 'slump-then-recovery',
  phases: [
    {
      id: 'slump',
      startGameNumber: 1,
      endGameNumber: RECOVERY_START - 1,
      playerIds: TRACKED_PLAYER_IDS,
      hitTendencyMultiplier: 0.42,
      powerTendencyMultiplier: 0.28,
      seededJitter: 0.025,
    },
    {
      id: 'recovery',
      startGameNumber: RECOVERY_START,
      endGameNumber: 30,
      playerIds: TRACKED_PLAYER_IDS,
      hitTendencyMultiplier: 1,
      powerTendencyMultiplier: 1,
      seededJitter: 0.025,
    },
  ],
};

function config(regime: LsimPerformanceRegime): LsimFeedbackClosureConfig {
  return {
    seed: 'lsim-fidelity-1',
    gamesPerTeam: 10,
    trackedPlayerIds: TRACKED_PLAYER_IDS,
    regime,
    recoveryStartsAtGameNumber: RECOVERY_START,
    condition: {
      playerIds: TRACKED_PLAYER_IDS,
      mojoLevel: -1,
      fitnessState: 'WELL',
    },
  };
}

describe('FIDELITY-1 L-SIM minimal feedback bridge', () => {
  const RealDate = Date;
  const originalConsoleLog = console.log;
  const fixedNow = Date.UTC(2026, 6, 11, 12, 0, 0);

  beforeEach(() => {
    class FrozenDate extends RealDate {
      constructor(...args: ConstructorParameters<DateConstructor>) {
        if (args.length === 0) super(fixedNow);
        else super(...args);
      }

      static now(): number {
        return fixedNow;
      }

      static parse(value: string): number {
        return RealDate.parse(value);
      }

      static UTC(
        year: number,
        monthIndex: number,
        date?: number,
        hours?: number,
        minutes?: number,
        seconds?: number,
        ms?: number,
      ): number {
        return RealDate.UTC(year, monthIndex, date ?? 1, hours ?? 0, minutes ?? 0, seconds ?? 0, ms ?? 0);
      }
    }
    globalThis.Date = FrozenDate as DateConstructor;
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].startsWith('[L-SIM FIDELITY-1]')) {
        originalConsoleLog(...args);
      }
    });
  });

  afterEach(() => {
    globalThis.Date = RealDate;
    vi.restoreAllMocks();
  });

  test('proves all seven closure steps, deterministic replay, and slump-to-recovery release', async () => {
    const slumpRecovery = await runLsimFeedbackClosure(config(SLUMP_RECOVERY_REGIME));
    const replay = await runLsimFeedbackClosure(config(SLUMP_RECOVERY_REGIME));
    const neutral = await runLsimFeedbackClosure(config(NEUTRAL_REGIME));
    const proof = buildLsimFeedbackClosureProof({
      slumpRecovery,
      replay,
      neutral,
      recoveryStartsAtGameNumber: RECOVERY_START,
    });
    const [closureCheck] = getFeedbackClosureInvariantChecks();
    const invariant = closureCheck(proof);

    console.log('[L-SIM FIDELITY-1] 7-step closure proof', JSON.stringify({
      steps: proof.steps,
      target: proof.target,
      slumpRecoveryPressureReleased: proof.slumpRecoveryPressureReleased,
      neutralControlOutperformedSlump: proof.neutralControlOutperformedSlump,
      slumpPressure: proof.slumpPressure,
      recoveryPressure: proof.recoveryPressure,
      firstDigest: proof.firstDigest,
      replayDigest: proof.replayDigest,
      byteIdenticalArtifact: proof.byteIdenticalArtifact,
      invariant,
    }));

    for (const [step, pass] of Object.entries(proof.steps)) {
      expect(pass, `closure step failed: ${step}`).toBe(true);
    }
    expect(proof.slumpRecoveryPressureReleased).toBe(true);
    expect(proof.neutralControlOutperformedSlump).toBe(true);
    expect(invariant.pass, invariant.detail).toBe(true);
  }, 900_000);
});
