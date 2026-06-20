/**
 * L13-4 — pure relationship intensity lifecycle.
 *
 * Intensity is recomputed from stable edge fields plus the current game number.
 * It is not accumulated from the prior stored intensity, so replaying a
 * completed game writes the same value instead of double-decaying.
 */

import type { RelationshipEdgeRow } from '../utils/franchiseRelationshipEdgesStorage';

export interface RelationshipIntensityTuning {
  /** Minimum baseline for a newly formed active edge. */
  formationIntensityFloor: number;
  /** Stable seeded range added to the floor for per-edge variation. */
  formationIntensityRange: number;
  /** First elapsed game's lapse decay. */
  baseDecayPerGame: number;
  /** Each additional elapsed game adds this fraction of the base decay. */
  compoundPerGame: number;
  /** Per-game decay cap, mirroring the flashpoint "tax, not cliff" shape. */
  maxDecayPerGame: number;
  /** One-game bump when both players appear for opposing teams. */
  chargedMatchupBump: number;
  /** Form-above threshold. Newly formed baselines stay above this. */
  formThreshold: number;
  /** Dissolve-below threshold. Existing active edges do not flicker until here. */
  dissolveThreshold: number;
  /** Rounding precision for persisted scalar values. */
  precision: number;
}

// §16 SIM-TUNE placeholders — shape locked, numbers owned by the Simulation Gate.
export const RELATIONSHIP_INTENSITY_TUNING: RelationshipIntensityTuning = {
  formationIntensityFloor: 0.72,
  formationIntensityRange: 0.18,
  baseDecayPerGame: 0.012,
  compoundPerGame: 0.08,
  maxDecayPerGame: 0.06,
  chargedMatchupBump: 0.14,
  formThreshold: 0.6,
  dissolveThreshold: 0.25,
  precision: 10000,
};

export interface RelationshipIntensityInput {
  gameNumber: number;
  isChargedMatchup: boolean;
}

export type RelationshipIntensityState = 'potential' | 'active' | 'dissolved';

export interface RelationshipIntensityResult {
  intensity: number;
  lapsedIntensity: number;
  baselineIntensity: number;
  cumulativeDecay: number;
  chargedMatchupApplied: boolean;
  state: RelationshipIntensityState;
  dissolvedAtGameNumber: number | null;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function roundTo(value: number, precision: number): number {
  return Math.round(value * precision) / precision;
}

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

function stableUnitInterval(seed: string): number {
  return fnv1a32(seed) / 0xffffffff;
}

function fnv1a32(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function edgeSeed(edge: RelationshipEdgeRow): string {
  return [
    edge.franchiseId,
    edge.seasonId,
    edge.statsScopeId,
    edge.player1Id,
    edge.player2Id,
    edge.type,
    String(edge.formedAtGameNumber ?? 'potential'),
  ].join(':');
}

export function computeRelationshipFormationBaseline(
  edge: RelationshipEdgeRow,
  tuning: RelationshipIntensityTuning = RELATIONSHIP_INTENSITY_TUNING,
): number {
  const seeded = stableUnitInterval(edgeSeed(edge));
  return roundTo(
    clamp01(tuning.formationIntensityFloor + (seeded * tuning.formationIntensityRange)),
    tuning.precision,
  );
}

export function computeRelationshipCumulativeDecay(
  elapsedGames: number,
  tuning: RelationshipIntensityTuning = RELATIONSHIP_INTENSITY_TUNING,
): number {
  const games = Math.max(0, Math.floor(elapsedGames));
  if (games < 1) return 0;

  let total = 0;
  for (let game = 1; game <= games; game += 1) {
    const rampFactor = 1 + ((game - 1) * tuning.compoundPerGame);
    total += Math.min(tuning.maxDecayPerGame, tuning.baseDecayPerGame * rampFactor);
  }
  return roundTo(total, tuning.precision);
}

export function computeRelationshipIntensity(
  edge: RelationshipEdgeRow,
  input: RelationshipIntensityInput,
  tuning: RelationshipIntensityTuning = RELATIONSHIP_INTENSITY_TUNING,
): RelationshipIntensityResult {
  const gameNumber = positiveInteger(input.gameNumber);
  const formedAtGameNumber = positiveInteger(edge.formedAtGameNumber);
  const existingDissolvedAt = positiveInteger(edge.dissolvedAtGameNumber);
  const baselineIntensity = computeRelationshipFormationBaseline(edge, tuning);

  if (gameNumber === null || formedAtGameNumber === null || edge.potential) {
    const lapsedIntensity = roundTo(clamp01(edge.intensity), tuning.precision);
    const intensity = roundTo(
      clamp01(lapsedIntensity + (input.isChargedMatchup ? tuning.chargedMatchupBump : 0)),
      tuning.precision,
    );
    return {
      intensity,
      lapsedIntensity,
      baselineIntensity,
      cumulativeDecay: 0,
      chargedMatchupApplied: input.isChargedMatchup,
      state: 'potential',
      dissolvedAtGameNumber: edge.dissolvedAtGameNumber ?? null,
    };
  }

  const elapsedGames = Math.max(0, gameNumber - formedAtGameNumber);
  const cumulativeDecay = computeRelationshipCumulativeDecay(elapsedGames, tuning);
  const lapsedIntensity = roundTo(clamp01(baselineIntensity - cumulativeDecay), tuning.precision);
  const dissolvedAtGameNumber =
    existingDissolvedAt ??
    (lapsedIntensity < tuning.dissolveThreshold ? gameNumber : null);
  const state: RelationshipIntensityState =
    dissolvedAtGameNumber !== null || lapsedIntensity < tuning.dissolveThreshold
      ? 'dissolved'
      : 'active';
  const intensity = roundTo(
    clamp01(lapsedIntensity + (input.isChargedMatchup ? tuning.chargedMatchupBump : 0)),
    tuning.precision,
  );

  return {
    intensity,
    lapsedIntensity,
    baselineIntensity,
    cumulativeDecay,
    chargedMatchupApplied: input.isChargedMatchup,
    state,
    dissolvedAtGameNumber,
  };
}
