import { processCompletedGame } from '../../src/utils/processCompletedGame';
import { getFranchisePlayer } from '../../src/utils/franchisePlayerStorage';
import { resolveRatingsProposal } from '../../src/utils/franchiseConsoleMirror';
import { saveFranchiseFitness } from '../../src/utils/mojoFitnessStorage';
import { applyCombinedMultiplier, type FitnessState } from '../../src/engines/fitnessEngine';
import { getMojoStatMultiplier, type MojoLevel } from '../../src/engines/mojoEngine';
import {
  CHECKPOINT_CADENCE_DEFAULT,
  checkpointCountForCadence,
  normalizeCheckpointCadence,
  type CheckpointCadence,
} from '../../src/data/rosterEngineConstants';
import { forceAllPhase2FlagsOn } from './flags';
import { setupLsimSandbox } from './sandbox';
import { checkpointGameNumbers } from './snapshots';
import { dumpLsimStores, stableStringify } from './storeDump';
import { seedSyntheticEventLog } from './seasonRunner';
import {
  generateRatingsAwareLsimSyntheticCompletedGame,
  sampleLsimBattingWindow,
  type LsimPerformanceRegime,
  type LsimPlayerPerformanceRead,
  type LsimRatingKey,
} from './syntheticGame';
import {
  CONFIRM_AS_PROPOSED_POLICY,
  driveLsimDevelopmentConfirmPolicy,
  type LsimDevelopmentConfirmPolicy,
  type LsimDevelopmentResolutionTrace,
} from './feedbackPolicy';
import {
  buildTune0CheckpointMetrics,
  readTune0MetricSnapshot,
  type Tune0CheckpointMetrics,
} from './tune0Metrics';
import type { LsimStateSnapshot } from './invariants/types';

export interface LsimFeedbackClosureConfig {
  seed: string;
  gamesPerTeam: number;
  trackedPlayerIds: string[];
  regime: LsimPerformanceRegime;
  recoveryStartsAtGameNumber: number;
  policy?: LsimDevelopmentConfirmPolicy;
  checkpointCadence?: CheckpointCadence;
  /** TUNE-0 can skip expensive intermediate whole-DB digests; finalDigest is always captured. */
  captureCheckpointStoreDigest?: boolean;
  condition?: {
    playerIds: string[];
    mojoLevel: MojoLevel;
    fitnessState: FitnessState;
  };
}

export interface LsimFeedbackGameTrace {
  gameNumber: number;
  reads: LsimPlayerPerformanceRead[];
  trackedGameStats: Record<string, { pa: number; h: number; doubles: number; triples: number; hr: number }>;
}

export interface LsimFeedbackCheckpointTrace {
  boundaryGameNumber: number;
  resolutions: LsimDevelopmentResolutionTrace[];
  trackedNegativePressure: number;
  trackedProposalCount: number;
  storeDigest: string;
  tune0Metrics: Tune0CheckpointMetrics;
}

export interface LsimFeedbackClosureRun {
  seed: string;
  regimeId: string;
  totalScheduledGames: number;
  checkpointGameNumbers: number[];
  gameTraces: LsimFeedbackGameTrace[];
  checkpointTraces: LsimFeedbackCheckpointTrace[];
  finalDigest: string;
  finalStoreDatabases: Record<string, Record<string, unknown[]>>;
}

export interface LsimFeedbackClosureProof {
  target: {
    playerId: string;
    ratingKey: LsimRatingKey;
    firstBoundary: number;
    laterBoundary: number;
    priorValue: number;
    appliedValue: number;
    laterExpectedPriorValue: number;
    nextGameNumber: number;
    counterfactualWindow: ReturnType<typeof sampleLsimBattingWindow>;
    appliedWindow: ReturnType<typeof sampleLsimBattingWindow>;
  };
  steps: {
    checkpointProposedTargetChange: boolean;
    confirmPolicyAppliedThroughRealService: boolean;
    storedValueChangedExactlyOnce: boolean;
    nextSyntheticGameReadAppliedValue: boolean;
    outputMovedExpectedDirection: boolean;
    laterProposalBaselinedFromChangedValue: boolean;
    sameSeedReplayByteIdentical: boolean;
  };
  slumpRecoveryPressureReleased: boolean;
  neutralControlOutperformedSlump: boolean;
  firstDigest: string;
  replayDigest: string;
  byteIdenticalArtifact: boolean;
  slumpPressure: number;
  recoveryPressure: number;
}

export interface LsimClosureInvariantResult {
  name: 'fidelity.feedback-loop-closes';
  tag: 'CRITICAL';
  pass: boolean;
  detail: string;
}

function seededRandom(seed: string): () => number {
  let state = 2166136261;
  for (const char of seed) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function isTracked(config: LsimFeedbackClosureConfig, playerId: string): boolean {
  return config.trackedPlayerIds.includes(playerId);
}

export async function runLsimFeedbackClosure(
  config: LsimFeedbackClosureConfig,
): Promise<LsimFeedbackClosureRun> {
  const teamCount = 6;
  const totalScheduledGames = Math.floor((teamCount * config.gamesPerTeam) / 2);
  const checkpointCadence = normalizeCheckpointCadence(
    config.checkpointCadence ?? CHECKPOINT_CADENCE_DEFAULT,
  );
  const boundaries = checkpointGameNumbers(
    totalScheduledGames,
    checkpointCountForCadence(checkpointCadence),
  );
  const boundarySet = new Set(boundaries);
  const gameTraces: LsimFeedbackGameTrace[] = [];
  const checkpointTraces: LsimFeedbackCheckpointTrace[] = [];
  let previousCheckpointSnapshot: LsimStateSnapshot | undefined;
  const originalRandom = Math.random;
  const flags = forceAllPhase2FlagsOn();

  try {
    Math.random = seededRandom(config.seed);
    const context = await setupLsimSandbox({
      totalScheduledGames,
      initialGamesPlayed: 0,
      preseedPriorStats: false,
      deterministicScheduleIds: true,
      checkpointCadence,
    });
    if (config.condition) {
      for (const playerId of config.condition.playerIds) {
        await saveFranchiseFitness(
          context.ids.franchiseId,
          playerId,
          config.condition.fitnessState,
          config.condition.mojoLevel,
        );
      }
    }

    for (let gameNumber = 1; gameNumber <= totalScheduledGames; gameNumber += 1) {
      const synthetic = await generateRatingsAwareLsimSyntheticCompletedGame(context, {
        gameNumber,
        seed: `${config.seed}:game-${gameNumber}`,
        regime: config.regime,
      });
      const processOptions = {
        ...context.processOptions,
        currentGame: gameNumber,
        seasonTotalGames: totalScheduledGames,
        gamesPerTeam: config.gamesPerTeam,
        gamesPerSeason: config.gamesPerTeam,
        milestoneConfig: {
          ...context.processOptions?.milestoneConfig,
          gamesPerSeason: config.gamesPerTeam,
          inningsPerGame: context.ids.inningsPerGame,
        },
      };
      await seedSyntheticEventLog(context, synthetic, gameNumber, config.seed);
      await processCompletedGame(
        synthetic.gameState,
        processOptions,
        context.ids.leagueId,
        synthetic.archiveOptions,
      );
      const trackedGameStats = Object.fromEntries(
        Object.entries(synthetic.gameState.playerStats)
          .filter(([playerId]) => isTracked(config, playerId))
          .map(([playerId, stats]) => [playerId, {
            pa: stats.pa,
            h: stats.h,
            doubles: stats.doubles,
            triples: stats.triples,
            hr: stats.hr,
          }]),
      );
      gameTraces.push({
        gameNumber,
        reads: (synthetic.performanceReads ?? []).filter((read) => isTracked(config, read.playerId)),
        trackedGameStats,
      });

      if (!boundarySet.has(gameNumber)) continue;
      const resolutions = await driveLsimDevelopmentConfirmPolicy({
        franchiseId: context.ids.franchiseId,
        seasonId: context.ids.seasonId,
        boundaryGameNumber: gameNumber,
        policy: config.policy ?? CONFIRM_AS_PROPOSED_POLICY,
      });
      for (const resolution of resolutions) {
        if (
          resolution.proposalKind !== 'rating' ||
          resolution.confirmationStatus !== 'confirmed-applied' ||
          typeof resolution.expectedPriorValue !== 'number'
        ) continue;
        const probe = await resolveRatingsProposal(resolution.overlayId, {
          action: 'confirm',
          actor: 'L-SIM FIDELITY-1 idempotency probe',
          observedPriorValue: resolution.expectedPriorValue,
        });
        const afterProbe = await getFranchisePlayer(context.ids.franchiseId, resolution.playerId);
        const postProbeValue = afterProbe && resolution.ratingKey
          ? (afterProbe as unknown as Record<string, unknown>)[resolution.ratingKey]
          : undefined;
        if (probe.outcome === 'noop' && typeof postProbeValue === 'number') {
          resolution.idempotencyProbeOutcome = 'noop';
          resolution.postProbeValue = postProbeValue;
        }
      }
      const trackedRatings = resolutions.filter((resolution) =>
        resolution.proposalKind === 'rating' && isTracked(config, resolution.playerId),
      );
      const snapshot = await readTune0MetricSnapshot(context, gameNumber, boundaries);
      const dump = config.captureCheckpointStoreDigest === false ? null : await dumpLsimStores();
      checkpointTraces.push({
        boundaryGameNumber: gameNumber,
        resolutions,
        trackedNegativePressure: trackedRatings.reduce(
          (sum, resolution) => sum + Math.max(0, -(resolution.delta ?? 0)),
          0,
        ),
        trackedProposalCount: trackedRatings.length,
        storeDigest: dump?.digest ?? 'not-captured',
        tune0Metrics: buildTune0CheckpointMetrics(snapshot, previousCheckpointSnapshot),
      });
      previousCheckpointSnapshot = snapshot;
    }

    const finalStore = await dumpLsimStores();
    return {
      seed: config.seed,
      regimeId: config.regime.id,
      totalScheduledGames,
      checkpointGameNumbers: boundaries,
      gameTraces,
      checkpointTraces,
      finalDigest: finalStore.digest,
      finalStoreDatabases: finalStore.databases,
    };
  } finally {
    Math.random = originalRandom;
    flags.restore();
  }
}

function effectiveRating(storedValue: number, read: LsimPlayerPerformanceRead): number {
  return applyCombinedMultiplier(
    storedValue,
    getMojoStatMultiplier(read.mojoLevel),
    read.fitnessState,
  );
}

function counterfactualWindowFor(
  read: LsimPlayerPerformanceRead,
  ratingKey: 'contact' | 'power',
  priorValue: number,
  seed: string,
): ReturnType<typeof sampleLsimBattingWindow> {
  let hitTendency = read.hitTendency;
  let powerTendency = read.powerTendency;
  if (ratingKey === 'contact') {
    const actualBase = 0.08 + (read.effectiveRatings.contact / 250);
    const phaseMultiplier = read.hitTendency / actualBase;
    hitTendency = Math.min(0.72, Math.max(0.02, (0.08 + (effectiveRating(priorValue, read) / 250)) * phaseMultiplier));
  } else {
    const actualBase = 0.03 + (read.effectiveRatings.power / 360);
    const phaseMultiplier = read.powerTendency / actualBase;
    powerTendency = Math.min(0.55, Math.max(0.005, (0.03 + (effectiveRating(priorValue, read) / 360)) * phaseMultiplier));
  }
  return sampleLsimBattingWindow({
    seed,
    playerId: read.playerId,
    hitTendency,
    powerTendency,
  });
}

function averageTrackedOutput(run: LsimFeedbackClosureRun, endGameNumber: number): number {
  const reads = run.gameTraces
    .filter((game) => game.gameNumber <= endGameNumber)
    .flatMap((game) => game.reads);
  return reads.length === 0
    ? 0
    : reads.reduce((sum, read) => sum + read.sampledWindow.weightedOutput, 0) / reads.length;
}

export function buildLsimFeedbackClosureProof(input: {
  slumpRecovery: LsimFeedbackClosureRun;
  replay: LsimFeedbackClosureRun;
  neutral: LsimFeedbackClosureRun;
  recoveryStartsAtGameNumber: number;
}): LsimFeedbackClosureProof {
  const ratingResolutions = input.slumpRecovery.checkpointTraces
    .flatMap((checkpoint) => checkpoint.resolutions)
    .filter((resolution) =>
      resolution.proposalKind === 'rating' &&
      (resolution.ratingKey === 'contact' || resolution.ratingKey === 'power') &&
      resolution.confirmationStatus === 'confirmed-applied' &&
      typeof resolution.expectedPriorValue === 'number' &&
      typeof resolution.actualEnteredValue === 'number' &&
      resolution.expectedPriorValue !== resolution.actualEnteredValue,
    );
  const first = ratingResolutions.find((candidate) =>
    ratingResolutions.some((later) =>
      later.playerId === candidate.playerId &&
      later.ratingKey === candidate.ratingKey &&
      later.boundaryGameNumber > candidate.boundaryGameNumber,
    ),
  );
  if (!first || !first.ratingKey || typeof first.expectedPriorValue !== 'number' || typeof first.actualEnteredValue !== 'number') {
    throw new Error(`[L-SIM FIDELITY-1] No repeat contact/power proposal found for a confirmed tracked player. resolutions=${JSON.stringify(
      input.slumpRecovery.checkpointTraces.map((checkpoint) => ({
        boundary: checkpoint.boundaryGameNumber,
        pressure: checkpoint.trackedNegativePressure,
        proposals: checkpoint.resolutions
          .filter((resolution) => resolution.proposalKind === 'rating' && resolution.ratingKey)
          .map((resolution) => ({
            playerId: resolution.playerId,
            ratingKey: resolution.ratingKey,
            delta: resolution.delta,
            prior: resolution.expectedPriorValue,
            actual: resolution.actualEnteredValue,
            status: resolution.confirmationStatus,
          })),
      })),
    )}`);
  }
  const later = ratingResolutions.find((candidate) =>
    candidate.playerId === first.playerId &&
    candidate.ratingKey === first.ratingKey &&
    candidate.boundaryGameNumber > first.boundaryGameNumber,
  );
  if (!later || typeof later.expectedPriorValue !== 'number') {
    throw new Error('[L-SIM FIDELITY-1] Later proposal baseline was not captured.');
  }
  const nextGameNumber = first.boundaryGameNumber + 1;
  const nextRead = input.slumpRecovery.gameTraces
    .find((game) => game.gameNumber === nextGameNumber)
    ?.reads.find((read) => read.playerId === first.playerId);
  if (!nextRead) throw new Error('[L-SIM FIDELITY-1] Next-game rating read is missing.');
  const counterfactualWindow = counterfactualWindowFor(
    nextRead,
    first.ratingKey,
    first.expectedPriorValue,
    `${input.slumpRecovery.seed}:game-${nextGameNumber}`,
  );
  const appliedWindow = nextRead.sampledWindow;
  const outputMovedExpectedDirection = first.actualEnteredValue > first.expectedPriorValue
    ? appliedWindow.weightedOutput > counterfactualWindow.weightedOutput
    : appliedWindow.weightedOutput < counterfactualWindow.weightedOutput;
  const slumpCheckpoints = input.slumpRecovery.checkpointTraces.filter(
    (checkpoint) => checkpoint.boundaryGameNumber < input.recoveryStartsAtGameNumber,
  );
  const recoveryCheckpoints = input.slumpRecovery.checkpointTraces.filter(
    (checkpoint) => checkpoint.boundaryGameNumber >= input.recoveryStartsAtGameNumber,
  );
  const slumpPressure = Math.max(...slumpCheckpoints.map((checkpoint) => checkpoint.trackedNegativePressure), 0);
  const recoveryPressure = recoveryCheckpoints.at(-1)?.trackedNegativePressure ?? Number.POSITIVE_INFINITY;
  const byteIdenticalArtifact = stableStringify(input.slumpRecovery) === stableStringify(input.replay);

  return {
    target: {
      playerId: first.playerId,
      ratingKey: first.ratingKey,
      firstBoundary: first.boundaryGameNumber,
      laterBoundary: later.boundaryGameNumber,
      priorValue: first.expectedPriorValue,
      appliedValue: first.actualEnteredValue,
      laterExpectedPriorValue: later.expectedPriorValue,
      nextGameNumber,
      counterfactualWindow,
      appliedWindow,
    },
    steps: {
      checkpointProposedTargetChange: Boolean(first.overlayId && first.delta),
      confirmPolicyAppliedThroughRealService:
        first.outcome === 'resolved' && first.confirmationStatus === 'confirmed-applied',
      storedValueChangedExactlyOnce:
        first.actualEnteredValue === first.expectedPriorValue + (first.delta ?? 0) &&
        first.idempotencyProbeOutcome === 'noop' &&
        first.postProbeValue === first.actualEnteredValue,
      nextSyntheticGameReadAppliedValue:
        nextRead.storedRatings[first.ratingKey] === first.actualEnteredValue,
      outputMovedExpectedDirection,
      laterProposalBaselinedFromChangedValue:
        later.expectedPriorValue === first.actualEnteredValue,
      sameSeedReplayByteIdentical:
        byteIdenticalArtifact &&
        input.slumpRecovery.finalDigest === input.replay.finalDigest,
    },
    slumpRecoveryPressureReleased:
      Number.isFinite(recoveryPressure) && slumpPressure > recoveryPressure,
    neutralControlOutperformedSlump:
      averageTrackedOutput(input.neutral, input.recoveryStartsAtGameNumber - 1) >
      averageTrackedOutput(input.slumpRecovery, input.recoveryStartsAtGameNumber - 1),
    firstDigest: input.slumpRecovery.finalDigest,
    replayDigest: input.replay.finalDigest,
    byteIdenticalArtifact,
    slumpPressure,
    recoveryPressure,
  };
}

export function feedbackClosureInvariant(proof: LsimFeedbackClosureProof): LsimClosureInvariantResult {
  const failedSteps = Object.entries(proof.steps)
    .filter(([, pass]) => !pass)
    .map(([name]) => name);
  if (!proof.slumpRecoveryPressureReleased) failedSteps.push('slumpRecoveryPressureReleased');
  if (!proof.neutralControlOutperformedSlump) failedSteps.push('neutralControlOutperformedSlump');
  return {
    name: 'fidelity.feedback-loop-closes',
    tag: 'CRITICAL',
    pass: failedSteps.length === 0,
    detail: failedSteps.length === 0
      ? `target=${proof.target.playerId}:${proof.target.ratingKey}; ${proof.target.priorValue}->${proof.target.appliedValue}; laterBaseline=${proof.target.laterExpectedPriorValue}; nextGame=${proof.target.nextGameNumber}; output=${proof.target.counterfactualWindow.weightedOutput}->${proof.target.appliedWindow.weightedOutput}; pressure=${proof.slumpPressure}->${proof.recoveryPressure}; digest=${proof.firstDigest}`
      : `failed=${failedSteps.join(',')}`,
  };
}

export function getFeedbackClosureInvariantChecks(): Array<
  (proof: LsimFeedbackClosureProof) => LsimClosureInvariantResult
> {
  return [feedbackClosureInvariant];
}
