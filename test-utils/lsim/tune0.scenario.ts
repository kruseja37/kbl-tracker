import 'fake-indexeddb/auto';

import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  runLsimFeedbackClosure,
  type LsimFeedbackClosureConfig,
  type LsimFeedbackClosureRun,
} from './feedbackClosure';
import { runLsimSeason } from './seasonRunner';
import type { LsimPerformanceRegime } from './syntheticGame';
import { tune0CheckpointSeriesFromSnapshotChain, type Tune0CheckpointMetrics } from './tune0Metrics';
import {
  describeTune0Override,
  withTune0Override,
  type Tune0SweepableKnobId,
} from './tune0Overrides';
import {
  buildTune0SensitivityRanking,
  type Tune0VariantForRanking,
} from './tune0Sensitivity';

const RESULT_DIR = path.resolve(process.cwd(), 'test-utils/lsim/results/tune0');
const GENERATED_AT = '2026-07-11T12:00:00.000Z';
const SWEEP_SEED = 'lsim-fidelity-1';
const BASELINE_GAMES_PER_TEAM = 10;
const SWEEP_GAMES_PER_TEAM = 4;
const TRACKED_PLAYER_IDS = Array.from(
  { length: 9 },
  (_, index) => `lsim-team-02-mlb-${String(index + 1).padStart(2, '0')}-${
    ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH'][index]
  }`,
);

function slumpRecoveryRegime(totalScheduledGames: number): {
  regime: LsimPerformanceRegime;
  recoveryStartsAtGameNumber: number;
} {
  const recoveryStartsAtGameNumber = Math.floor(totalScheduledGames * 0.6) + 1;
  return {
    recoveryStartsAtGameNumber,
    regime: {
      id: 'slump-then-recovery',
      phases: [
    {
      id: 'slump',
      startGameNumber: 1,
          endGameNumber: recoveryStartsAtGameNumber - 1,
      playerIds: TRACKED_PLAYER_IDS,
      hitTendencyMultiplier: 0.42,
      powerTendencyMultiplier: 0.28,
      seededJitter: 0.025,
    },
    {
      id: 'recovery',
          startGameNumber: recoveryStartsAtGameNumber,
          endGameNumber: totalScheduledGames,
      playerIds: TRACKED_PLAYER_IDS,
      hitTendencyMultiplier: 1,
      powerTendencyMultiplier: 1,
      seededJitter: 0.025,
    },
      ],
    },
  };
}

interface Tune0VariantArtifact {
  schemaVersion: 'tune0-variant-v1';
  generatedAt: string;
  knobId: string;
  variantId: string;
  setting: string;
  factor: number | null;
  status: 'SWEEPED' | 'NOT-SWEEPABLE' | 'UNSTABLE-RUNTIME';
  reason?: string;
  injected: Record<string, unknown> | null;
  seed: string;
  gamesPerTeam: number;
  totalScheduledGames: number | null;
  checkpointCount: number | null;
  checkpointGameNumbers: number[] | null;
  checkpoints: Tune0CheckpointMetrics[] | null;
  finalDigest: string | null;
}

function closureConfig(
  checkpointCadence: 'standard' | 'frequent' = 'standard',
  gamesPerTeam = SWEEP_GAMES_PER_TEAM,
): LsimFeedbackClosureConfig {
  const totalScheduledGames = Math.floor((6 * gamesPerTeam) / 2);
  const { regime, recoveryStartsAtGameNumber } = slumpRecoveryRegime(totalScheduledGames);
  return {
    seed: SWEEP_SEED,
    gamesPerTeam,
    trackedPlayerIds: TRACKED_PLAYER_IDS,
    regime,
    recoveryStartsAtGameNumber,
    checkpointCadence,
    captureCheckpointStoreDigest: false,
    condition: {
      playerIds: TRACKED_PLAYER_IDS,
      mojoLevel: -1,
      fitnessState: 'WELL',
    },
  };
}

function summarizeClosure(
  run: LsimFeedbackClosureRun,
  input: Omit<Tune0VariantArtifact, 'schemaVersion' | 'generatedAt' | 'totalScheduledGames' | 'checkpointCount' | 'checkpointGameNumbers' | 'checkpoints' | 'finalDigest'>,
): Tune0VariantArtifact {
  return {
    schemaVersion: 'tune0-variant-v1',
    generatedAt: GENERATED_AT,
    ...input,
    totalScheduledGames: run.totalScheduledGames,
    checkpointCount: run.checkpointGameNumbers.length,
    checkpointGameNumbers: run.checkpointGameNumbers,
    checkpoints: run.checkpointTraces.map((trace) => trace.tune0Metrics),
    finalDigest: run.finalDigest,
  };
}

async function writeJson(fileName: string, value: unknown): Promise<void> {
  await writeFile(path.join(RESULT_DIR, fileName), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function defaultVariant(
  knobId: string,
  baseline: Tune0VariantArtifact,
  injected: Record<string, unknown>,
): Tune0VariantArtifact {
  return {
    ...baseline,
    knobId,
    variantId: `${knobId}-default`,
    setting: 'default (1x)',
    factor: 1,
    injected,
  };
}

async function runOverrideVariant(
  knobId: Tune0SweepableKnobId,
  setting: 'low' | 'high',
  factor: number,
  gamesPerTeam = SWEEP_GAMES_PER_TEAM,
): Promise<Tune0VariantArtifact> {
  const run = await withTune0Override(
    { knobId, factor },
    () => runLsimFeedbackClosure(closureConfig('standard', gamesPerTeam)),
  );
  return summarizeClosure(run, {
    knobId,
    variantId: `${knobId}-${setting}`,
    setting: `${setting} (${factor}x${gamesPerTeam === SWEEP_GAMES_PER_TEAM ? '' : `; runtime-reduced to ${gamesPerTeam} games/team`})`,
    factor,
    status: 'SWEEPED',
    injected: describeTune0Override({ knobId, factor }),
    seed: SWEEP_SEED,
    gamesPerTeam,
  });
}

function rankingEntry(artifact: Tune0VariantArtifact): Tune0VariantForRanking {
  return {
    knobId: artifact.knobId,
    variantId: artifact.variantId,
    setting: artifact.setting,
    status: artifact.status,
    checkpoints: artifact.checkpoints,
  };
}

describe('TUNE-0 baseline and one-factor sensitivity sweep', () => {
  const RealDate = Date;
  const originalConsoleLog = console.log;
  const fixedNow = Date.UTC(2026, 6, 11, 12, 0, 0);

  beforeEach(() => {
    class FrozenDate extends RealDate {
      constructor(...args: ConstructorParameters<DateConstructor>) {
        if (args.length === 0) super(fixedNow);
        else super(...args);
      }
      static now(): number { return fixedNow; }
      static parse(value: string): number { return RealDate.parse(value); }
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
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    globalThis.Date = RealDate;
    vi.restoreAllMocks();
  });

  test('archives every default and sweep variant, then ranks normalized output impact', async () => {
    await rm(RESULT_DIR, { recursive: true, force: true });
    await mkdir(RESULT_DIR, { recursive: true });

    const baselineRun = await runLsimFeedbackClosure(closureConfig('standard', BASELINE_GAMES_PER_TEAM));
    const baseline = summarizeClosure(baselineRun, {
      knobId: 'baseline-closure',
      variantId: 'baseline-closure-defaults',
      setting: 'current defaults',
      factor: 1,
      status: 'SWEEPED',
      injected: null,
      seed: SWEEP_SEED,
      gamesPerTeam: BASELINE_GAMES_PER_TEAM,
    });
    await writeJson('baseline-closure.json', baseline);

    const sweepBaselineRun = await runLsimFeedbackClosure(closureConfig());
    const sweepBaseline = summarizeClosure(sweepBaselineRun, {
      knobId: 'sweep-baseline',
      variantId: 'sweep-baseline-defaults',
      setting: 'current defaults (runtime-reduced sensitivity schedule)',
      factor: 1,
      status: 'SWEEPED',
      injected: null,
      seed: SWEEP_SEED,
      gamesPerTeam: SWEEP_GAMES_PER_TEAM,
    });
    await writeJson('sweep-baseline.json', sweepBaseline);

    const artifacts: Tune0VariantArtifact[] = [];
    const sweepable: Tune0SweepableKnobId[] = [
      'performance-signal-scale',
      'fan-dampener-strength',
      'age-gravity-band-slopes',
      'fame-decay-per-update',
      'morale-personality-spread',
      'relationship-formation-threshold',
      'k5-backlash-curve',
    ];
    for (const knobId of sweepable) {
      const lowFactor = knobId === 'age-gravity-band-slopes' ? 0 : 0.5;
      const low: Tune0VariantArtifact = knobId === 'relationship-formation-threshold'
        ? {
            schemaVersion: 'tune0-variant-v1',
            generatedAt: GENERATED_AT,
            knobId,
            variantId: `${knobId}-low`,
            setting: 'low (0.5x; runtime runaway at both 4 and 2 games/team)',
            factor: lowFactor,
            status: 'UNSTABLE-RUNTIME',
            reason: 'The leg exceeded six minutes after uniform reduction to 4 games/team, then exceeded six minutes again at 2 games/team. No numeric checkpoint result is claimed.',
            injected: describeTune0Override({ knobId, factor: lowFactor }),
            seed: SWEEP_SEED,
            gamesPerTeam: 2,
            totalScheduledGames: 6,
            checkpointCount: 5,
            checkpointGameNumbers: [2, 3, 4, 5, 6],
            checkpoints: null,
            finalDigest: null,
          }
        : await runOverrideVariant(knobId, 'low', lowFactor);
      await writeJson(`${low.variantId}.json`, low);
      artifacts.push(low);

      const currentDefault = defaultVariant(knobId, sweepBaseline, describeTune0Override({ knobId, factor: 1 }));
      await writeJson(`${currentDefault.variantId}.json`, currentDefault);
      artifacts.push(currentDefault);

      const high = await runOverrideVariant(knobId, 'high', 2);
      await writeJson(`${high.variantId}.json`, high);
      artifacts.push(high);
    }

    const cadence5 = defaultVariant('checkpoint-cadence', sweepBaseline, { cadence: 'standard', checkpointCount: 5 });
    cadence5.variantId = 'checkpoint-cadence-5';
    cadence5.setting = 'standard (5 checkpoints)';
    await writeJson(`${cadence5.variantId}.json`, cadence5);
    artifacts.push(cadence5);

    const cadence10Run = await runLsimFeedbackClosure(closureConfig('frequent'));
    const cadence10 = summarizeClosure(cadence10Run, {
      knobId: 'checkpoint-cadence',
      variantId: 'checkpoint-cadence-10',
      setting: 'frequent (10 checkpoints)',
      factor: 2,
      status: 'SWEEPED',
      injected: { cadence: 'frequent', checkpointCount: 10 },
      seed: SWEEP_SEED,
      gamesPerTeam: SWEEP_GAMES_PER_TEAM,
    });
    await writeJson(`${cadence10.variantId}.json`, cadence10);
    artifacts.push(cadence10);

    const notSweepableReason =
      'FAME_INPUT_TUNING is module-private in src/utils/franchiseFameCompute.ts; varying it requires a production src edit, forbidden by TUNE-0.';
    for (const [setting, factor] of [['low', 0.5], ['default', 1], ['high', 2]] as const) {
      const artifact: Tune0VariantArtifact = {
        schemaVersion: 'tune0-variant-v1',
        generatedAt: GENERATED_AT,
        knobId: 'wpa-to-heat-scale',
        variantId: `wpa-to-heat-scale-${setting}`,
        setting: `${setting} (${factor}x)`,
        factor,
        status: 'NOT-SWEEPABLE',
        reason: notSweepableReason,
        injected: null,
        seed: SWEEP_SEED,
        gamesPerTeam: SWEEP_GAMES_PER_TEAM,
        totalScheduledGames: null,
        checkpointCount: null,
        checkpointGameNumbers: null,
        checkpoints: null,
        finalDigest: null,
      };
      await writeJson(`${artifact.variantId}.json`, artifact);
      artifacts.push(artifact);
    }

    const ranking = buildTune0SensitivityRanking(
      sweepBaseline.checkpoints ?? [],
      artifacts.map(rankingEntry),
    );
    await writeJson('ranking.json', ranking);

    // Run smoke LAST. Its final snapshot retains a full per-game previous-chain;
    // keeping that graph alive during the sweep causes avoidable GC pressure.
    const smoke = await runLsimSeason({
      seed: 'opus-audit-scaled',
      gamesPerTeam: 8,
      writeCheckpoints: false,
      runPersistenceProof: true,
      runInvariantChecks: true,
      runReplayIdempotency: true,
      stopOnCritical: false,
    });
    const smokeArtifact = {
      schemaVersion: 'tune0-smoke-v1',
      generatedAt: GENERATED_AT,
      seed: smoke.seed,
      gamesPerTeam: smoke.gamesPerTeam,
      gamesSimulated: smoke.gamesSimulated,
      totalScheduledGames: smoke.totalScheduledGames,
      checkpointCadence: smoke.checkpointCadence,
      checkpointGameNumbers: smoke.checkpointGameNumbers,
      stoppedEarly: smoke.stoppedEarly,
      finalDigest: smoke.finalDigest,
      invariantResults: smoke.invariantResults,
      findings: smoke.findings,
      finalDistributions: smoke.distributions,
      checkpoints: tune0CheckpointSeriesFromSnapshotChain(smoke.finalSnapshot),
    };
    await writeJson('baseline-smoke.json', smokeArtifact);

    const files = (await readdir(RESULT_DIR)).sort();
    await writeJson('manifest.json', {
      schemaVersion: 'tune0-manifest-v1',
      generatedAt: GENERATED_AT,
      closureSeed: SWEEP_SEED,
      smokeSeed: smoke.seed,
      comparisonRule: 'same seed and 4 games/team (12 scheduled games, five standard checkpoints) for every sensitivity variant; no seed reduction',
      runtimeReduction: 'T1 baseline remains 10 games/team. Sensitivity legs were uniformly reduced after the 0.5x relationship-threshold leg produced combinatorial runtime at 10 games/team.',
      relationshipLowException: 'The 0.5x relationship-threshold leg exceeded six minutes at both 4 and 2 games/team. It is archived without fabricated metrics as UNSTABLE-RUNTIME; default/high still rank numerically, and the runtime explosion independently forces the UNSTABLE flag.',
      files: [...files, 'manifest.json'].sort(),
    });

    originalConsoleLog('[TUNE-0] artifacts', JSON.stringify({
      files: (await readdir(RESULT_DIR)).length,
      ranked: ranking.ranking.length,
      inert: ranking.inertKnobs,
      unstable: ranking.unstableKnobs,
      notSweepable: ranking.notSweepable,
    }));

    expect(baseline.checkpoints).toHaveLength(5);
    expect(sweepBaseline.checkpoints).toHaveLength(5);
    expect(smoke.gamesSimulated).toBe(smoke.totalScheduledGames);
    expect(smoke.findings).toEqual([]);
    expect(cadence10.checkpoints).toHaveLength(10);
    expect(ranking.ranking).toHaveLength(8);
    expect(ranking.notSweepable).toEqual(['wpa-to-heat-scale']);
  }, 1_800_000);
});
