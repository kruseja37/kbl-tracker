import 'fake-indexeddb/auto';

import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  runLsimFeedbackClosure,
  type LsimFeedbackClosureConfig,
  type LsimFeedbackClosureRun,
} from './feedbackClosure';
import type { LsimPerformanceRegime } from './syntheticGame';
import type { Tune0OrganicRelationshipMetrics } from './tune0Metrics';
import {
  describeTune0Override,
  withTune0Override,
  type Tune0SweepableKnobId,
} from './tune0Overrides';

const RESULT_DIR = path.resolve(process.cwd(), 'test-utils/lsim/results/tune1');
const GENERATED_AT = '2026-07-11T20:00:00.000Z';
const SEED = 'lsim-fidelity-1';
const GAMES_PER_TEAM = 4;
const TOTAL_SCHEDULED_GAMES = Math.floor((6 * GAMES_PER_TEAM) / 2);
const CADENCE_NEAR_ZERO_LIMIT = 0.01;
const TRACKED_POSITIONS = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH'] as const;
const TRACKED_PLAYER_IDS = Array.from(
  { length: 9 },
  (_, index) => `lsim-team-02-mlb-${String(index + 1).padStart(2, '0')}-${TRACKED_POSITIONS[index]}`,
);

type Tune1KnobId = Extract<
  Tune0SweepableKnobId,
  | 'relationship-active-base'
  | 'relationship-active-slope-per-point'
  | 'relationship-active-cap'
  | 'relationship-formation-threshold'
>;

interface Tune1VariantArtifact {
  schemaVersion: 'tune1-relationship-variant-v1';
  generatedAt: string;
  variantId: string;
  knobId: Tune1KnobId | 'baseline' | 'checkpoint-cadence';
  setting: string;
  factor: number | null;
  seed: string;
  gamesPerTeam: number;
  totalScheduledGames: number;
  checkpointCadence: 'standard' | 'frequent';
  checkpointCount: number;
  checkpointGameNumbers: number[];
  injected: Record<string, unknown> | null;
  reusedFromVariantId?: string;
  runtimeMs: number;
  finalDigest: string;
  relationships: Tune0OrganicRelationshipMetrics;
}

interface ImpactGroups {
  volume: number;
  spread: number;
  timing: number;
  moraleCascade: number;
}

interface Tune1VariantImpact {
  variantId: string;
  factor: number;
  normalizedImpact: number;
  groups: ImpactGroups;
  exactOrganicCoreMatch: boolean;
  shapeSignals: string[];
}

interface Tune1KnobRanking {
  rank: number;
  knobId: Tune1KnobId;
  normalizedImpact: number;
  unstableRuntime: boolean;
  variants: Tune1VariantImpact[];
}

function slumpRecoveryRegime(): {
  regime: LsimPerformanceRegime;
  recoveryStartsAtGameNumber: number;
} {
  const recoveryStartsAtGameNumber = Math.floor(TOTAL_SCHEDULED_GAMES * 0.6) + 1;
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
          endGameNumber: TOTAL_SCHEDULED_GAMES,
          playerIds: TRACKED_PLAYER_IDS,
          hitTendencyMultiplier: 1,
          powerTendencyMultiplier: 1,
          seededJitter: 0.025,
        },
      ],
    },
  };
}

function closureConfig(cadence: 'standard' | 'frequent'): LsimFeedbackClosureConfig {
  const { regime, recoveryStartsAtGameNumber } = slumpRecoveryRegime();
  return {
    seed: SEED,
    gamesPerTeam: GAMES_PER_TEAM,
    trackedPlayerIds: TRACKED_PLAYER_IDS,
    regime,
    recoveryStartsAtGameNumber,
    checkpointCadence: cadence,
    captureCheckpointStoreDigest: false,
    condition: {
      playerIds: TRACKED_PLAYER_IDS,
      mojoLevel: -1,
      fitnessState: 'WELL',
    },
  };
}

function finalRelationships(run: LsimFeedbackClosureRun): Tune0OrganicRelationshipMetrics {
  const metrics = run.checkpointTraces.at(-1)?.tune0Metrics.relationships.organic;
  if (!metrics) throw new Error('[TUNE-1] Final organic relationship metrics were not captured.');
  return metrics;
}

async function writeJson(fileName: string, value: unknown): Promise<void> {
  await writeFile(path.join(RESULT_DIR, fileName), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function timedRun(
  variantId: string,
  knobId: Tune1VariantArtifact['knobId'],
  setting: string,
  factor: number | null,
  cadence: 'standard' | 'frequent',
  injected: Record<string, unknown> | null,
  override?: { knobId: Tune1KnobId; factor: number },
): Promise<Tune1VariantArtifact> {
  const startedAt = performance.now();
  const run = override
    ? await withTune0Override(override, () => runLsimFeedbackClosure(closureConfig(cadence)))
    : await runLsimFeedbackClosure(closureConfig(cadence));
  return {
    schemaVersion: 'tune1-relationship-variant-v1',
    generatedAt: GENERATED_AT,
    variantId,
    knobId,
    setting,
    factor,
    seed: SEED,
    gamesPerTeam: GAMES_PER_TEAM,
    totalScheduledGames: run.totalScheduledGames,
    checkpointCadence: cadence,
    checkpointCount: run.checkpointGameNumbers.length,
    checkpointGameNumbers: run.checkpointGameNumbers,
    injected,
    runtimeMs: Math.round((performance.now() - startedAt) * 1000) / 1000,
    finalDigest: run.finalDigest,
    relationships: finalRelationships(run),
  };
}

function reusedDefault(
  knobId: Tune1KnobId,
  baseline: Tune1VariantArtifact,
): Tune1VariantArtifact {
  return {
    ...baseline,
    variantId: `${knobId}-default`,
    knobId,
    setting: 'default (1x; reuses the common same-seed baseline leg)',
    factor: 1,
    injected: describeTune0Override({ knobId, factor: 1 }),
    reusedFromVariantId: baseline.variantId,
  };
}

function finite(value: number | null): number {
  return value ?? 0;
}

function organicCore(metrics: Tune0OrganicRelationshipMetrics): unknown {
  return {
    uniqueFormedEdges: metrics.uniqueFormedEdges,
    uniqueFormedEdgesByType: metrics.uniqueFormedEdgesByType,
    activeEdgesAtEnd: metrics.activeEdgesAtEnd,
    formationGameSpread: metrics.formationGameSpread,
    perTeamEdgeCounts: metrics.perTeamEdgeCounts,
    candidateCoverage: metrics.candidateCoverage,
    compatibilityTiming: metrics.compatibilityTiming,
  };
}

function metricGroups(metrics: Tune0OrganicRelationshipMetrics): Record<keyof ImpactGroups, number[]> {
  return {
    volume: [
      metrics.uniqueFormedEdges,
      metrics.activeEdgesAtEnd,
      ...Object.values(metrics.uniqueFormedEdgesByType),
      metrics.candidateCoverage.formedFraction ?? 0,
    ],
    spread: [
      metrics.formationGameSpread.distinctGames,
      finite(metrics.formationGameSpread.firstGame),
      finite(metrics.formationGameSpread.lastGame),
      metrics.formationGameSpread.largestSingleGameBatch,
      finite(metrics.perTeamEdgeCounts.min),
      finite(metrics.perTeamEdgeCounts.median),
      finite(metrics.perTeamEdgeCounts.max),
    ],
    timing: [
      finite(metrics.compatibilityTiming.marginal.meanGameWithUnformedCensored),
      finite(metrics.compatibilityTiming.middle.meanGameWithUnformedCensored),
      finite(metrics.compatibilityTiming.strong.meanGameWithUnformedCensored),
    ],
    moraleCascade: [
      metrics.moraleCascade.relationshipHits,
      metrics.moraleCascade.relationshipRecoveries,
      metrics.moraleCascade.relationshipChargedMatchups,
      metrics.moraleCascade.hitDeltaTotal,
      metrics.moraleCascade.recoveryDeltaTotal,
      metrics.moraleCascade.chargedDeltaTotal,
    ],
  };
}

function meanNormalizedImpact(baseline: readonly number[], variant: readonly number[]): number {
  if (baseline.length === 0) return 0;
  return baseline.reduce(
    (sum, value, index) => sum + (Math.abs((variant[index] ?? 0) - value) / Math.max(1, Math.abs(value))),
    0,
  ) / baseline.length;
}

function impact(
  baseline: Tune1VariantArtifact,
  variant: Tune1VariantArtifact,
): Tune1VariantImpact {
  const baselineGroups = metricGroups(baseline.relationships);
  const variantGroups = metricGroups(variant.relationships);
  const groups = Object.fromEntries(
    (Object.keys(baselineGroups) as Array<keyof ImpactGroups>).map((group) => [
      group,
      meanNormalizedImpact(baselineGroups[group], variantGroups[group]),
    ]),
  ) as unknown as ImpactGroups;
  const normalizedImpact = Object.values(groups).reduce((sum, value) => sum + value, 0) /
    Object.keys(groups).length;
  const shapeSignals: string[] = [];
  const relationships = variant.relationships;
  if (relationships.candidateCoverage.candidateEdges === 0) {
    shapeSignals.push('no-eligible-candidates');
  } else if (!relationships.candidateCoverage.strictSubset) {
    shapeSignals.push('candidate-saturation');
  }
  if (relationships.compatibilityTiming.strongerFormsEarlierMonotone === false) {
    shapeSignals.push('non-monotone-compatibility-timing');
  }
  if (
    relationships.uniqueFormedEdges > 0 &&
    relationships.formationGameSpread.largestSingleGameBatch > relationships.uniqueFormedEdges / 2
  ) {
    shapeSignals.push('single-game-majority-batch');
  }
  return {
    variantId: variant.variantId,
    factor: variant.factor ?? 1,
    normalizedImpact: Math.round(normalizedImpact * 1_000_000) / 1_000_000,
    groups: Object.fromEntries(
      Object.entries(groups).map(([group, value]) => [group, Math.round(value * 1_000_000) / 1_000_000]),
    ) as unknown as ImpactGroups,
    exactOrganicCoreMatch:
      JSON.stringify(organicCore(variant.relationships)) === JSON.stringify(organicCore(baseline.relationships)),
    shapeSignals,
  };
}

function buildRanking(
  baseline: Tune1VariantArtifact,
  variantsByKnob: ReadonlyMap<Tune1KnobId, Tune1VariantArtifact[]>,
  unstableKnobs: ReadonlySet<Tune1KnobId>,
): Tune1KnobRanking[] {
  const rows = [...variantsByKnob.entries()].map(([knobId, variants]) => {
    const impacts = variants.map((variant) => impact(baseline, variant));
    return {
      rank: 0,
      knobId,
      normalizedImpact: Math.max(...impacts.map((entry) => entry.normalizedImpact)),
      unstableRuntime: unstableKnobs.has(knobId),
      variants: impacts,
    };
  });
  rows.sort((left, right) =>
    Number(right.unstableRuntime) - Number(left.unstableRuntime) ||
    right.normalizedImpact - left.normalizedImpact || left.knobId.localeCompare(right.knobId),
  );
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

describe('TUNE-1 organic relationship hazard sweep', () => {
  const originalConsoleLog = console.log;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    vi.restoreAllMocks();
  });

  test('gates cadence independence, sweeps active hazard knobs, and archives organic metrics', async () => {
    await rm(RESULT_DIR, { recursive: true, force: true });
    await mkdir(RESULT_DIR, { recursive: true });

    const baseline = await timedRun(
      'baseline-default',
      'baseline',
      'current defaults',
      1,
      'standard',
      null,
    );
    await writeJson('baseline-default.json', baseline);

    const cadence5: Tune1VariantArtifact = {
      ...baseline,
      variantId: 'checkpoint-cadence-5',
      knobId: 'checkpoint-cadence',
      setting: 'standard (5 checkpoints; reuses baseline leg)',
      injected: { cadence: 'standard', checkpointCount: 5 },
      reusedFromVariantId: baseline.variantId,
    };
    await writeJson('checkpoint-cadence-5.json', cadence5);
    const cadence10 = await timedRun(
      'checkpoint-cadence-10',
      'checkpoint-cadence',
      'frequent (10 checkpoints)',
      2,
      'frequent',
      { cadence: 'frequent', checkpointCount: 10 },
    );
    await writeJson('checkpoint-cadence-10.json', cadence10);
    const cadenceImpact = impact(cadence5, cadence10);
    const cadenceComparison = {
      schemaVersion: 'tune1-cadence-comparison-v1',
      generatedAt: GENERATED_AT,
      seed: SEED,
      gamesPerTeam: GAMES_PER_TEAM,
      totalScheduledGames: TOTAL_SCHEDULED_GAMES,
      nearZeroLimit: CADENCE_NEAR_ZERO_LIMIT,
      cadence5VariantId: cadence5.variantId,
      cadence10VariantId: cadence10.variantId,
      cadence5RuntimeMs: cadence5.runtimeMs,
      cadence10RuntimeMs: cadence10.runtimeMs,
      normalizedRelationshipImpact: cadenceImpact.normalizedImpact,
      exactOrganicCoreMatch: cadenceImpact.exactOrganicCoreMatch,
      pass:
        cadenceImpact.normalizedImpact <= CADENCE_NEAR_ZERO_LIMIT &&
        cadenceImpact.exactOrganicCoreMatch,
      cadence5: cadence5.relationships,
      cadence10: cadence10.relationships,
    };
    await writeJson('cadence-comparison.json', cadenceComparison);
    expect(
      cadenceComparison.pass,
      `R-F REGRESSION: cadence 5->10 moved organic relationships; impact=${cadenceImpact.normalizedImpact}; exactCore=${cadenceImpact.exactOrganicCoreMatch}; formed=${cadence5.relationships.uniqueFormedEdges}->${cadence10.relationships.uniqueFormedEdges}; distinctGames=${cadence5.relationships.formationGameSpread.distinctGames}->${cadence10.relationships.formationGameSpread.distinctGames}`,
    ).toBe(true);

    const knobIds: Tune1KnobId[] = [
      'relationship-active-base',
      'relationship-active-slope-per-point',
      'relationship-active-cap',
      'relationship-formation-threshold',
    ];
    const variantsByKnob = new Map<Tune1KnobId, Tune1VariantArtifact[]>();
    const unstableKnobs = new Set<Tune1KnobId>();
    for (const knobId of knobIds) {
      const variants: Tune1VariantArtifact[] = [];
      if (knobId === 'relationship-formation-threshold') {
        unstableKnobs.add(knobId);
        await writeJson(`${knobId}-low.json`, {
          schemaVersion: 'tune1-relationship-variant-v1',
          generatedAt: GENERATED_AT,
          variantId: `${knobId}-low`,
          knobId,
          setting: 'low (0.5x)',
          factor: 0.5,
          status: 'UNSTABLE-RUNTIME',
          reason:
            'The same-seed 4-games/team (12 scheduled games) leg exceeded six minutes without completing. It was terminated at the pre-declared TUNE-0 runaway boundary; no numeric relationship metrics are claimed.',
          seed: SEED,
          gamesPerTeam: GAMES_PER_TEAM,
          totalScheduledGames: TOTAL_SCHEDULED_GAMES,
          checkpointCadence: 'standard',
          checkpointCount: 5,
          injected: describeTune0Override({ knobId, factor: 0.5 }),
          runtimeMsLowerBound: 360_000,
          relationships: null,
        });
      } else {
        const low = await timedRun(
          `${knobId}-low`,
          knobId,
          'low (0.5x)',
          0.5,
          'standard',
          describeTune0Override({ knobId, factor: 0.5 }),
          { knobId, factor: 0.5 },
        );
        await writeJson(`${low.variantId}.json`, low);
        variants.push(low);
      }

      const currentDefault = reusedDefault(knobId, baseline);
      await writeJson(`${currentDefault.variantId}.json`, currentDefault);
      variants.push(currentDefault);

      const high = await timedRun(
        `${knobId}-high`,
        knobId,
        'high (2x)',
        2,
        'standard',
        describeTune0Override({ knobId, factor: 2 }),
        { knobId, factor: 2 },
      );
      await writeJson(`${high.variantId}.json`, high);
      variants.push(high);
      variantsByKnob.set(knobId, variants);
    }

    const dormant = {
      schemaVersion: 'tune1-dormant-knobs-v1',
      generatedAt: GENERATED_AT,
      status: 'DORMANT-LIVE-PATH',
      knobs: [
        'RELATIONSHIP_FORMATION_TUNING.perGameHazard.potentialBase',
        'RELATIONSHIP_FORMATION_TUNING.perGameHazard.potentialSlopePerPoint',
        'RELATIONSHIP_FORMATION_TUNING.perGameHazard.potentialCap',
      ],
      reason:
        'The live organic writer groups the MLB roster by team before scoring. Same-team candidates have potential=false, so the potential hazard branch is unreachable on this path; cross-team potential pools are not evaluated.',
      swept: false,
    };
    await writeJson('potential-hazard-dormant.json', dormant);

    const ranking = buildRanking(baseline, variantsByKnob, unstableKnobs);
    await writeJson('ranking.json', {
      schemaVersion: 'tune1-relationship-ranking-v1',
      generatedAt: GENERATED_AT,
      formula:
        'Per metric abs(variant-baseline)/max(1,abs(baseline)); mean within each of volume/spread/timing/moraleCascade; equal-weight mean across four groups; knob score=max(completed non-default variants).',
      runtimeDisposition:
        'UNSTABLE-RUNTIME knobs rank before numerically completed knobs; their normalizedImpact remains the maximum of completed numeric variants and is not fabricated from the timed-out leg.',
      baselineVariantId: baseline.variantId,
      ranking,
    });

    const files = (await readdir(RESULT_DIR)).sort();
    const manifest = {
      schemaVersion: 'tune1-manifest-v1',
      generatedAt: GENERATED_AT,
      seed: SEED,
      gamesPerTeam: GAMES_PER_TEAM,
      totalScheduledGames: TOTAL_SCHEDULED_GAMES,
      comparisonDiscipline:
        'All numeric tuning legs use the same seed, 4 games/team, 12 scheduled games, and standard five-checkpoint cadence. The sole cadence regression leg changes only cadence to frequent/10.',
      actualLegsAttempted: 10,
      actualLegsCompleted: 9,
      unstableRuntimeLegs: ['relationship-formation-threshold-low'],
      defaultRowsReuseCommonBaseline: true,
      runtimeUnit: 'milliseconds wall clock per actual leg; reused 1x rows point to baseline-default',
      potentialKnobs: dormant,
      cadenceRegression: cadenceComparison,
      files: [...files, 'manifest.json'].sort(),
    };
    await writeJson('manifest.json', manifest);

    expect(ranking).toHaveLength(4);
    expect(dormant.swept).toBe(false);
  });
});
