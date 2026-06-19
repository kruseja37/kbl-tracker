/**
 * L9b-3a / TRAIT_SIGNAL_CERTIFICATION §B, §VI.2, §VI.4, §VI.5.
 *
 * PURE, build-dark trait-from-reality candidate builder. The caller supplies
 * already-loaded season events and aggregates; this module reconstructs the
 * event-derived activation context, builds raw per-player signals for the v1
 * buildable traits only, and delegates all percentile/sufficiency decisions to
 * the frozen L9b-1 scorer.
 */

import { activeTraitNames } from './effectiveRatings';
import {
  CANONICAL_TRAIT_NAMES,
  computeTraitRealityScore,
  isTraitEligibleForRole,
  type PlayerRole,
} from './traitRealityScorer';
import type { TraitCandidate } from './traitAcquisition';
import type {
  EffectiveRatingsPlayer,
  GameContext,
} from './effectiveRatings';
import type {
  AdaptiveStandardsConfig,
} from '../utils/franchiseAdaptiveStandards';
import {
  DEFAULT_ADAPTIVE_STANDARDS_CONFIG,
} from '../utils/franchiseAdaptiveStandards';
import type {
  AtBatEvent,
  BetweenPlayEvent,
  FieldingEvent,
  RunnerState,
} from '../utils/eventLog';
import type { AtBatResult } from '../types/game';
import { getPercentile } from './percentile';

export const BUILDABLE_TRAITS: readonly string[] = [
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
  // R1-a: clean outcome-proxy traits (TRAIT_MEASUREMENT_SPEC §0.6). Build-dark.
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
  // R1-b1: Big/Little Hack (HR-rate × AVG percentile-merge), Base Rounder
  // (extra-base advancement over the forced minimum), Distractor (batter reaches
  // with this owner-runner on 1B/2B). All position-role. Build-dark.
  'Big Hack',
  'Little Hack',
  'Base Rounder',
  'Distractor',
  // R1-b2: Utility (fielding perf at a non-primary position), Crossed Up
  // (passed balls per batters-faced, pitcher), Bunter (SAC volume per PA). Two
  // Way is SPLIT to its own ticket (R1-b3 / R3-adjacent) — NOT here. Build-dark.
  'Utility',
  'Crossed Up',
  'Bunter',
];

for (const traitName of BUILDABLE_TRAITS) {
  if (!CANONICAL_TRAIT_NAMES.has(traitName)) {
    throw new Error(`Non-canonical buildable trait: ${traitName}`);
  }
}

/**
 * L9b-3a's output = L9b-2's `TraitCandidate` ({ traitName, score: TraitRealityScore })
 * PLUS the raw signal/sample (debug + L9b-3b logging). The {traitName, score}
 * subset is the EXACT seam `computeTraitAcquisition` consumes (it reads
 * `candidate.score.sufficient` / `.score.realityPercentile`), so an array of
 * these feeds it directly as a structural subtype. DO NOT flatten the score
 * onto the candidate — that breaks the L9b-2 seam (the bug FINDING-149 caught).
 */
export interface SeasonTraitCandidate extends TraitCandidate {
  /** The raw reality signal value (rate) used for the percentile ranking. */
  signalValue: number;
  /** The opportunity sample backing the signal. */
  sampleSize: number;
}

export interface SeasonTraitPlayer {
  playerId: string;
  role: PlayerRole;
}

export interface SeasonTraitCandidateInput {
  players: readonly SeasonTraitPlayer[];
  atBatEvents: readonly AtBatEvent[];
  betweenPlayEvents: readonly BetweenPlayEvent[];
  fieldingEvents: readonly FieldingEvent[];
  seasonFieldingByPlayer: ReadonlyMap<string, { outfieldAssists?: number; baserunnersHeld?: number; games?: number }>;
  injuryCountsByPlayer: ReadonlyMap<string, number>;
  gamesByPlayer: ReadonlyMap<string, number>;
  /**
   * R1-b2 (Utility) — OPTIONAL. The player's primary fielding position keyed by
   * playerId; a fielding chance at any OTHER position counts toward the Utility
   * non-primary success rate. A player absent from the map gets NO Utility signal
   * (the trait stays dormant until a later wiring step populates this — the hook
   * that derives primary position is a deferred step, NOT part of this ticket).
   */
  primaryPositionByPlayer?: ReadonlyMap<string, string>;
}

export interface AtBatContextRunningState {
  /**
   * Consecutive no-out reaches keyed by game/pitcher/inning/half. The context
   * receives the value as of this at-bat, then this scratch state is advanced
   * for subsequent at-bats.
   */
  consecutiveBaserunnersAllowedByUnit: Map<string, number>;
}

interface RawSignal {
  signalValue: number;
  sampleSize: number;
}

interface Accumulator {
  successes: number;
  sampleSize: number;
}

type RawSignalMap = Map<string, Map<string, RawSignal>>;

const AT_BAT_PROBE_TRAITS: readonly string[] = [
  'Clutch',
  'Choker',
  'RBI Hero',
  'RBI Zero',
  'Rally Stopper',
  'Surrounded',
  'Rally Starter',
  'Meltdown',
  'Pinch Perfect',
];

const BATTING_TRAITS = new Set([
  'Clutch',
  'Choker',
  'RBI Hero',
  'RBI Zero',
  'Rally Starter',
  'Pinch Perfect',
]);

const PITCHING_TRAITS = new Set([
  'Clutch',
  'Choker',
  'Rally Stopper',
  'Surrounded',
  'Meltdown',
]);

const REACHED_BASE_RESULTS: ReadonlySet<AtBatResult> = new Set([
  '1B',
  '2B',
  '3B',
  'HR',
  'ITPHR',
  'GRD',
  'BB',
  'IBB',
  'HBP',
  'E',
  'FC',
  'D3K',
  'WP_K',
  'PB_K',
]);

// R1-a: a strikeout is the FULL K-family, not just K/Kc — a dropped-third-strike
// reach (D3K/WP_K/PB_K) and the regional 'Ꝁ' all still count toward K-rate.
const STRIKEOUT_RESULTS: ReadonlySet<AtBatResult> = new Set([
  'K',
  'Kc',
  'Ꝁ',
  'D3K',
  'WP_K',
  'PB_K',
]);

// R1-b1: a home run for HR-rate is the over-fence HR plus the inside-the-park HR
// (ITPHR). NOTE: the game.ts `isHit`/`reachesBase` OMIT ITPHR, so these LOCAL
// sets are intentionally NOT derived from them — ITPHR counts as both a HR and a
// hit here (§0.9). GRD (ground-rule double) is a hit but not a HR.
const HOME_RUN_RESULTS: ReadonlySet<AtBatResult> = new Set(['HR', 'ITPHR']);

const HIT_RESULTS: ReadonlySet<AtBatResult> = new Set([
  '1B',
  '2B',
  '3B',
  'HR',
  'ITPHR',
  'GRD',
]);

// R1-b1: AB = PA − (BB + IBB + HBP + SF + SAC) — the non-AB plate appearances.
const NON_AB_RESULTS: ReadonlySet<AtBatResult> = new Set([
  'BB',
  'IBB',
  'HBP',
  'SF',
  'SAC',
]);

// R1-b1 (Distractor): the batter "reached base" via a HIT, WALK, or HBP while the
// owner-runner is on 1B/2B. Excludes E/FC/D3K/WP_K/PB_K reaches (§0.9).
const DISTRACTOR_REACH_RESULTS: ReadonlySet<AtBatResult> = new Set([
  '1B',
  '2B',
  '3B',
  'HR',
  'ITPHR',
  'GRD',
  'BB',
  'IBB',
  'HBP',
]);

const PROBE_PLAYER: EffectiveRatingsPlayer = {
  id: 'trait-builder-probe',
  traits: [...AT_BAT_PROBE_TRAITS],
};

function emptyRunningState(): AtBatContextRunningState {
  return { consecutiveBaserunnersAllowedByUnit: new Map() };
}

function undoneAt(event: { undoneAt?: number | null }): boolean {
  return event.undoneAt != null;
}

function fieldingUndoneAt(event: FieldingEvent): boolean {
  return (event as FieldingEvent & { undoneAt?: number | null }).undoneAt != null;
}

function runnerCount(runners: RunnerState | undefined): number {
  if (!runners) return 0;
  return Number(runners.first != null) + Number(runners.second != null) + Number(runners.third != null);
}

function hasRisp(runners: RunnerState | undefined): boolean {
  return Boolean(runners?.second) || Boolean(runners?.third);
}

function battingTeamIsLosing(atBat: AtBatEvent): boolean {
  if (atBat.halfInning === 'TOP') return atBat.awayScore < atBat.homeScore;
  return atBat.homeScore < atBat.awayScore;
}

function reachedBase(result: AtBatResult): boolean {
  return REACHED_BASE_RESULTS.has(result);
}

function runsScoredCount(atBat: AtBatEvent): number {
  if (Array.isArray(atBat.runsScored)) return atBat.runsScored.length;
  return Number.isFinite(atBat.runsScored) ? atBat.runsScored : 0;
}

function anyRunScored(atBat: AtBatEvent): boolean {
  return (atBat.rbiCount ?? 0) > 0 || runsScoredCount(atBat) > 0;
}

function outRecorded(atBat: AtBatEvent): boolean {
  return atBat.outsAfter > atBat.outs;
}

function pitcherFavorable(atBat: AtBatEvent): boolean {
  return outRecorded(atBat) && !anyRunScored(atBat);
}

function pitcherUnfavorable(atBat: AtBatEvent): boolean {
  return reachedBase(atBat.result) || anyRunScored(atBat);
}

function battingDelta(atBat: AtBatEvent): number {
  return atBat.battingTeamDelta ?? atBat.wpa;
}

function fieldingDelta(atBat: AtBatEvent): number {
  return atBat.fieldingTeamDelta ?? -atBat.wpa;
}

function favorableToBattingTeam(atBat: AtBatEvent): boolean {
  return battingDelta(atBat) > 0;
}

function unfavorableToBattingTeam(atBat: AtBatEvent): boolean {
  return battingDelta(atBat) < 0;
}

function favorableToPitchingTeam(atBat: AtBatEvent): boolean {
  return fieldingDelta(atBat) > 0;
}

function unfavorableToPitchingTeam(atBat: AtBatEvent): boolean {
  return fieldingDelta(atBat) < 0;
}

function unitKey(atBat: AtBatEvent): string {
  return `${atBat.gameId}|${atBat.pitcherId}|${atBat.inning}|${atBat.halfInning}`;
}

function sortAtBats(events: readonly AtBatEvent[]): AtBatEvent[] {
  return [...events].sort((left, right) => {
    const game = left.gameId.localeCompare(right.gameId);
    if (game !== 0) return game;
    if (left.eventIndex !== right.eventIndex) return left.eventIndex - right.eventIndex;
    if (left.timestamp !== right.timestamp) return left.timestamp - right.timestamp;
    return left.eventId.localeCompare(right.eventId);
  });
}

function sortBetweenPlayEvents(events: readonly BetweenPlayEvent[]): BetweenPlayEvent[] {
  return [...events].sort((left, right) => {
    const game = left.gameId.localeCompare(right.gameId);
    if (game !== 0) return game;
    if (left.eventIndex !== right.eventIndex) return left.eventIndex - right.eventIndex;
    if (left.timestamp !== right.timestamp) return left.timestamp - right.timestamp;
    return left.eventId.localeCompare(right.eventId);
  });
}

function updateRunningState(atBat: AtBatEvent, runningState: AtBatContextRunningState): void {
  const key = unitKey(atBat);
  const current = runningState.consecutiveBaserunnersAllowedByUnit.get(key) ?? 0;
  if (outRecorded(atBat)) {
    runningState.consecutiveBaserunnersAllowedByUnit.set(key, 0);
    return;
  }
  if (reachedBase(atBat.result)) {
    runningState.consecutiveBaserunnersAllowedByUnit.set(key, current + 1);
    return;
  }
  runningState.consecutiveBaserunnersAllowedByUnit.set(key, 0);
}

/**
 * Reconstruct one persisted at-bat's matrix context. The Meltdown counter is
 * the count of prior consecutive no-out reaches in the same
 * game/pitcher/inning/half unit; the scratch running state is then advanced.
 */
export function reconstructAtBatContext(
  atBat: AtBatEvent,
  runningState: AtBatContextRunningState,
): Partial<GameContext> {
  const runnersOn = runnerCount(atBat.runners);
  const key = unitKey(atBat);
  const consecutiveBaserunnersAllowed =
    runningState.consecutiveBaserunnersAllowedByUnit.get(key) ?? 0;
  const context: GameContext = {
    pressure: atBat.isClutch === true ? 'high' : 'none',
    runnersOn,
    risp: hasRisp(atBat.runners),
    opposingHand: 'R',
    inning: atBat.inning,
    basesEmpty: runnersOn === 0,
    teamLosing: battingTeamIsLosing(atBat),
    isSubstitutionAB: atBat.batterContext?.enteredAs === 'pinch_hit',
    consecutiveBaserunnersAllowed,
  };
  updateRunningState(atBat, runningState);
  return context;
}

function getAccumulator(raw: Map<string, Map<string, Accumulator>>, playerId: string, traitName: string): Accumulator {
  let byTrait = raw.get(playerId);
  if (!byTrait) {
    byTrait = new Map();
    raw.set(playerId, byTrait);
  }
  let acc = byTrait.get(traitName);
  if (!acc) {
    acc = { successes: 0, sampleSize: 0 };
    byTrait.set(traitName, acc);
  }
  return acc;
}

function addOpportunity(
  raw: Map<string, Map<string, Accumulator>>,
  playerId: string,
  traitName: string,
  success: boolean,
): void {
  const acc = getAccumulator(raw, playerId, traitName);
  acc.sampleSize += 1;
  if (success) acc.successes += 1;
}

function addRawSignal(raw: RawSignalMap, playerId: string, traitName: string, signal: RawSignal): void {
  let byTrait = raw.get(playerId);
  if (!byTrait) {
    byTrait = new Map();
    raw.set(playerId, byTrait);
  }
  byTrait.set(traitName, signal);
}

function addAccumulatorSignals(raw: RawSignalMap, accumulators: Map<string, Map<string, Accumulator>>): void {
  for (const [playerId, byTrait] of accumulators) {
    for (const [traitName, acc] of byTrait) {
      if (acc.sampleSize <= 0) continue;
      addRawSignal(raw, playerId, traitName, {
        signalValue: acc.successes / acc.sampleSize,
        sampleSize: acc.sampleSize,
      });
    }
  }
}

function addAtBatSignals(input: SeasonTraitCandidateInput, raw: RawSignalMap): void {
  const runningState = emptyRunningState();
  const rateAccumulators = new Map<string, Map<string, Accumulator>>();
  const meltdownCounts = new Map<string, number>();
  const pitcherUnits = new Map<string, Set<string>>();

  for (const atBat of sortAtBats(input.atBatEvents).filter((event) => !undoneAt(event))) {
    pitcherUnits.set(atBat.pitcherId, pitcherUnits.get(atBat.pitcherId) ?? new Set());
    pitcherUnits.get(atBat.pitcherId)?.add(`${atBat.gameId}|${atBat.inning}|${atBat.halfInning}`);

    const ctx = reconstructAtBatContext(atBat, runningState) as GameContext;
    const fired = new Set(activeTraitNames(PROBE_PLAYER, ctx));

    for (const traitName of fired) {
      if (BATTING_TRAITS.has(traitName)) {
        if (traitName === 'Clutch') addOpportunity(rateAccumulators, atBat.batterId, traitName, favorableToBattingTeam(atBat));
        if (traitName === 'Choker') addOpportunity(rateAccumulators, atBat.batterId, traitName, unfavorableToBattingTeam(atBat));
        if (traitName === 'RBI Hero') addOpportunity(rateAccumulators, atBat.batterId, traitName, atBat.rbiCount > 0);
        if (traitName === 'RBI Zero') addOpportunity(rateAccumulators, atBat.batterId, traitName, atBat.rbiCount === 0);
        if (traitName === 'Rally Starter') addOpportunity(rateAccumulators, atBat.batterId, traitName, reachedBase(atBat.result));
        if (traitName === 'Pinch Perfect') {
          addOpportunity(
            rateAccumulators,
            atBat.batterId,
            traitName,
            reachedBase(atBat.result) || favorableToBattingTeam(atBat),
          );
        }
      }

      if (PITCHING_TRAITS.has(traitName)) {
        if (traitName === 'Clutch') addOpportunity(rateAccumulators, atBat.pitcherId, traitName, favorableToPitchingTeam(atBat));
        if (traitName === 'Choker') addOpportunity(rateAccumulators, atBat.pitcherId, traitName, unfavorableToPitchingTeam(atBat));
        if (traitName === 'Rally Stopper') addOpportunity(rateAccumulators, atBat.pitcherId, traitName, pitcherFavorable(atBat));
        if (traitName === 'Surrounded') addOpportunity(rateAccumulators, atBat.pitcherId, traitName, pitcherUnfavorable(atBat));
        if (traitName === 'Meltdown') {
          meltdownCounts.set(atBat.pitcherId, (meltdownCounts.get(atBat.pitcherId) ?? 0) + 1);
        }
      }
    }
  }

  addAccumulatorSignals(raw, rateAccumulators);

  for (const [pitcherId, count] of meltdownCounts) {
    const sampleSize = pitcherUnits.get(pitcherId)?.size ?? 0;
    if (sampleSize <= 0) continue;
    addRawSignal(raw, pitcherId, 'Meltdown', {
      // Denominator choice per contract: distinct game/inning/half units worked.
      signalValue: count / sampleSize,
      sampleSize,
    });
  }
}

/**
 * R1-a — clean per-PA outcome-rate proxies (TRAIT_MEASUREMENT_SPEC §0.6).
 *
 * One pass over the sorted, non-undone at-bats accumulates per-BATTER PA/K/DP/FC/
 * walk and per-PITCHER PA/K, then emits the rate signals. A player's PA = the
 * count of at-bats where they are the batter (batter traits) or the pitcher
 * (pitcher traits) — the documented R1-a denominator. Strikeouts use the FULL
 * K-family (STRIKEOUT_RESULTS), not just K/Kc. Role eligibility (VI.2) keeps a
 * pitcher's batter-K signals out of the position pool and vice-versa downstream.
 */
function addOutcomeRateSignals(input: SeasonTraitCandidateInput, raw: RawSignalMap): void {
  interface BatterCounts { pa: number; k: number; dp: number; fc: number; walk: number; }
  interface PitcherCounts { pa: number; k: number; }
  const batterCounts = new Map<string, BatterCounts>();
  const pitcherCounts = new Map<string, PitcherCounts>();

  for (const atBat of sortAtBats(input.atBatEvents).filter((event) => !undoneAt(event))) {
    const batter = batterCounts.get(atBat.batterId) ?? { pa: 0, k: 0, dp: 0, fc: 0, walk: 0 };
    batter.pa += 1;
    if (STRIKEOUT_RESULTS.has(atBat.result)) batter.k += 1;
    if (atBat.result === 'DP') batter.dp += 1;
    if (atBat.result === 'FC') batter.fc += 1;
    if (atBat.result === 'BB' || atBat.result === 'IBB') batter.walk += 1;
    batterCounts.set(atBat.batterId, batter);

    const pitcher = pitcherCounts.get(atBat.pitcherId) ?? { pa: 0, k: 0 };
    pitcher.pa += 1;
    if (STRIKEOUT_RESULTS.has(atBat.result)) pitcher.k += 1;
    pitcherCounts.set(atBat.pitcherId, pitcher);
  }

  for (const [batterId, counts] of batterCounts) {
    if (counts.pa <= 0) continue;
    const kRate = counts.k / counts.pa;
    addRawSignal(raw, batterId, 'Whiffer', { signalValue: kRate, sampleSize: counts.pa });
    addRawSignal(raw, batterId, 'Tough Out', { signalValue: 1 - kRate, sampleSize: counts.pa });
    addRawSignal(raw, batterId, 'Easy Target', { signalValue: kRate, sampleSize: counts.pa });
    addRawSignal(raw, batterId, 'Slow Poke', { signalValue: counts.dp / counts.pa, sampleSize: counts.pa });
    addRawSignal(raw, batterId, 'Sprinter', { signalValue: counts.fc / counts.pa, sampleSize: counts.pa });
    addRawSignal(raw, batterId, 'Mind Gamer', { signalValue: counts.walk / counts.pa, sampleSize: counts.pa });
  }

  for (const [pitcherId, counts] of pitcherCounts) {
    if (counts.pa <= 0) continue;
    const kRate = counts.k / counts.pa;
    addRawSignal(raw, pitcherId, 'K Collector', { signalValue: kRate, sampleSize: counts.pa });
    addRawSignal(raw, pitcherId, 'K Neglector', { signalValue: 1 - kRate, sampleSize: counts.pa });
  }
}

/**
 * R1-b1 — Big Hack / Little Hack (TRAIT_MEASUREMENT_SPEC §0.9, Option B
 * percentile-merge). A position-role pull-power proxy: a Big Hacker swings for
 * the fences (high HR-rate, low AVG); a Little Hacker slaps for contact (low
 * HR-rate, high AVG).
 *
 * Cohort = position players with PA ≥ 1 AND AB ≥ 1 (a player with only walks —
 * AB = 0 — gets no Hack signal). PA = at-bats where they are the batter
 * (non-undone). HR-rate = HR/PA where HR ∈ {HR, ITPHR}. AVG = hits/AB where hits
 * ∈ {1B, 2B, 3B, HR, ITPHR, GRD} and AB = PA − (BB + IBB + HBP + SF + SAC).
 *
 * A within-builder percentile PRE-PASS ranks each player's HR-rate and AVG vs the
 * cohort pools (sorted ascending). The merged signalValue is then:
 *   Big Hack    = (hrPct + (1 − avgPct)) / 2
 *   Little Hack = ((1 − hrPct) + avgPct) / 2
 * sampleSize = PA for both. (This merged score then flows through the normal
 * scorer, which re-percentiles it vs the position pool — the intended double
 * percentile per §0.9: "the merged score is the signalValue".)
 */
function addHackSignals(input: SeasonTraitCandidateInput, raw: RawSignalMap): void {
  const positionIds = new Set<string>(
    input.players.filter((player) => player.role === 'position').map((player) => player.playerId),
  );

  interface HackCounts { pa: number; hr: number; hits: number; nonAb: number; }
  const counts = new Map<string, HackCounts>();

  for (const atBat of sortAtBats(input.atBatEvents).filter((event) => !undoneAt(event))) {
    if (!positionIds.has(atBat.batterId)) continue;
    const entry = counts.get(atBat.batterId) ?? { pa: 0, hr: 0, hits: 0, nonAb: 0 };
    entry.pa += 1;
    if (HOME_RUN_RESULTS.has(atBat.result)) entry.hr += 1;
    if (HIT_RESULTS.has(atBat.result)) entry.hits += 1;
    if (NON_AB_RESULTS.has(atBat.result)) entry.nonAb += 1;
    counts.set(atBat.batterId, entry);
  }

  // Cohort = PA ≥ 1 AND AB ≥ 1, iterated in id order for deterministic pools.
  interface CohortRow { playerId: string; pa: number; hrRate: number; avg: number; }
  const cohort: CohortRow[] = [];
  for (const playerId of [...counts.keys()].sort((a, b) => a.localeCompare(b))) {
    const entry = counts.get(playerId);
    if (!entry) continue;
    const ab = entry.pa - entry.nonAb;
    if (entry.pa < 1 || ab < 1) continue;
    cohort.push({
      playerId,
      pa: entry.pa,
      hrRate: entry.hr / entry.pa,
      avg: entry.hits / ab,
    });
  }
  if (cohort.length === 0) return;

  const hrPool = cohort.map((row) => row.hrRate).sort((a, b) => a - b);
  const avgPool = cohort.map((row) => row.avg).sort((a, b) => a - b);

  for (const row of cohort) {
    const hrPct = getPercentile(row.hrRate, hrPool);
    const avgPct = getPercentile(row.avg, avgPool);
    addRawSignal(raw, row.playerId, 'Big Hack', {
      signalValue: (hrPct + (1 - avgPct)) / 2,
      sampleSize: row.pa,
    });
    addRawSignal(raw, row.playerId, 'Little Hack', {
      signalValue: ((1 - hrPct) + avgPct) / 2,
      sampleSize: row.pa,
    });
  }
}

/**
 * R1-b1 — Distractor (TRAIT_MEASUREMENT_SPEC §0.9). "The pitcher fails more with
 * this runner on": a success is the BATTER reaching base (hit OR walk OR HBP)
 * while the Distractor-OWNER is the runner on 1B or 2B (3B is NOT counted).
 *
 * For each non-undone at-bat, each present owner on 1B/2B adds one opportunity
 * keyed to that owner's id (both 1B and 2B owners credited when both occupied).
 * Denominator = PAs where the owner is on 1B/2B; numerator = those where the
 * batter reached via DISTRACTOR_REACH_RESULTS. Credited to the OWNER, not the
 * batter.
 */
function addDistractorSignals(input: SeasonTraitCandidateInput, raw: RawSignalMap): void {
  const accumulators = new Map<string, Map<string, Accumulator>>();

  for (const atBat of sortAtBats(input.atBatEvents).filter((event) => !undoneAt(event))) {
    const reached = DISTRACTOR_REACH_RESULTS.has(atBat.result);
    const owners = [atBat.runners.first?.runnerId, atBat.runners.second?.runnerId];
    for (const ownerId of owners) {
      if (!ownerId) continue;
      addOpportunity(accumulators, ownerId, 'Distractor', reached);
    }
  }

  addAccumulatorSignals(raw, accumulators);
}

// R1-b1 (Base Rounder): self-contained port of the canonical forced-advance
// model from `src/components/GameTracker/atBatLogic.ts` (do NOT import the
// UI-layer file). Operates on base-occupancy booleans + outs + result.
type BaseKey = 'first' | 'second' | 'third';
interface BaseBooleans { first: boolean; second: boolean; third: boolean; }

const WALK_FORCE_RESULTS: ReadonlySet<AtBatResult> = new Set(['BB', 'IBB', 'HBP']);

function isRunnerForced(
  base: BaseKey,
  result: AtBatResult,
  bases: BaseBooleans,
  outs: number,
): boolean {
  const walkOrSpecialForce =
    WALK_FORCE_RESULTS.has(result) || (result === 'D3K' && (outs === 2 || !bases.first));

  if (walkOrSpecialForce) {
    if (base === 'first') return true;
    if (base === 'second') return bases.first;
    return bases.first && bases.second;
  }

  if (result === '1B') return base === 'first';
  if (result === '2B') return base === 'first' || base === 'second';
  if (result === '3B') return true;
  if (result === 'FC') return base === 'first';
  if (result === 'DP') {
    if (base === 'first') return true;
    if (base === 'second') return bases.first;
    return bases.first && bases.second;
  }

  return false;
}

function getMinimumAdvancement(
  base: BaseKey,
  result: AtBatResult,
  bases: BaseBooleans,
  outs: number,
): 'second' | 'third' | 'home' | null {
  if (!isRunnerForced(base, result, bases, outs)) return null;

  if (result === '2B') {
    if (base === 'first' || base === 'second') return 'third';
  }
  if (result === '3B') return 'home';

  if (base === 'first') return 'second';
  if (base === 'second') return 'third';
  return 'home';
}

// Ordinal of a base label (the runner's reflexive position is its own ordinal).
const BASE_ORDINAL: Readonly<Record<'first' | 'second' | 'third' | 'home', number>> = {
  first: 1,
  second: 2,
  third: 3,
  home: 4,
};

/**
 * The base ordinal a batter is ENTITLED to by the result (the batter's forced
 * minimum). Hits → the bag the hit reaches; HR/ITPHR → home; every other reach
 * (walk/HBP/error/FC/dropped-3rd) → first.
 */
function batterEntitledOrdinal(result: AtBatResult): number {
  switch (result) {
    case '1B':
      return 1;
    case '2B':
    case 'GRD':
      return 2;
    case '3B':
      return 3;
    case 'HR':
    case 'ITPHR':
      return 4;
    default:
      // BB/IBB/HBP/E/FC/D3K/WP_K/PB_K → first.
      return 1;
  }
}

/**
 * R1-b1 — Base Rounder (TRAIT_MEASUREMENT_SPEC §0.9 + JK rulings 2026-06-18). A
 * success is a runner advancing BEYOND the forced minimum (1st→3rd on a single,
 * scoring from 2nd on a single, the batter stretching a single into a double),
 * over the runner's advancement opportunities, read from `atBat.runnerOutcomes`.
 *
 * JK ruling 1: every RECORDED advancement is a chance, INCLUDING being thrown out
 * trying for the extra base (`toBase:'out'` is a non-success opportunity); a held
 * runner (`toBase:'end'`) is NOT a chance.
 * JK ruling 2: SCOPE includes the batter-runner's own stretches
 * (`fromBase:'batter'`); the batter's forced minimum = the base the result
 * entitles them to. Credited to `entry.runnerId`.
 */
function addBaseRounderSignals(input: SeasonTraitCandidateInput, raw: RawSignalMap): void {
  const accumulators = new Map<string, Map<string, Accumulator>>();

  for (const atBat of sortAtBats(input.atBatEvents).filter((event) => !undoneAt(event))) {
    if (!Array.isArray(atBat.runnerOutcomes)) continue;
    const bases: BaseBooleans = {
      first: !!atBat.runners.first,
      second: !!atBat.runners.second,
      third: !!atBat.runners.third,
    };

    for (const entry of atBat.runnerOutcomes) {
      const { runnerId, fromBase, toBase } = entry;

      // Opportunity iff a recorded advancement OR a throw-out (ruling 1); a held
      // 'end' is not a chance.
      const isChance = toBase !== 'end';
      if (!isChance) continue;

      let forcedMinOrdinal: number;
      if (fromBase === 'batter') {
        forcedMinOrdinal = batterEntitledOrdinal(atBat.result);
      } else {
        const currentOrdinal = BASE_ORDINAL[fromBase];
        if (isRunnerForced(fromBase, atBat.result, bases, atBat.outs)) {
          const forcedTo = getMinimumAdvancement(fromBase, atBat.result, bases, atBat.outs);
          forcedMinOrdinal = forcedTo ? BASE_ORDINAL[forcedTo] : currentOrdinal;
        } else {
          // Not forced ⇒ the minimum is to stay put.
          forcedMinOrdinal = currentOrdinal;
        }
      }

      // Success iff the runner reached a REAL base (not out/end) beyond the
      // forced minimum.
      const reachedRealBase = toBase !== 'out';
      const toBaseOrdinal = reachedRealBase ? BASE_ORDINAL[toBase] : 0;
      const success = reachedRealBase && toBaseOrdinal > forcedMinOrdinal;

      addOpportunity(accumulators, runnerId, 'Base Rounder', success);
    }
  }

  addAccumulatorSignals(raw, accumulators);
}

type StolenBasePayload = NonNullable<BetweenPlayEvent['stolenBase']> & {
  runnerId?: string;
  isSuccessful?: boolean;
};

function addStealSignals(input: SeasonTraitCandidateInput, raw: RawSignalMap): void {
  const attempts = new Map<string, Accumulator>();
  const pitcherAttempts = new Map<string, Accumulator>();
  for (const event of sortBetweenPlayEvents(input.betweenPlayEvents).filter((item) => !undoneAt(item))) {
    const payload = event.stolenBase as StolenBasePayload | undefined;
    if (!payload?.runnerId || typeof payload.isSuccessful !== 'boolean') continue;
    const acc = attempts.get(payload.runnerId) ?? { successes: 0, sampleSize: 0 };
    acc.sampleSize += 1;
    if (payload.isSuccessful) acc.successes += 1;
    attempts.set(payload.runnerId, acc);

    // R1-a: opposing-steal outcomes joined to the pitcher who allowed/suppressed
    // them via runnerAttribution.pitcherId. SB ⇒ success, CS ⇒ failure.
    const pitcherId = event.runnerAttribution?.pitcherId;
    if (pitcherId) {
      const pAcc = pitcherAttempts.get(pitcherId) ?? { successes: 0, sampleSize: 0 };
      pAcc.sampleSize += 1;
      if (payload.isSuccessful) pAcc.successes += 1;
      pitcherAttempts.set(pitcherId, pAcc);
    }
  }
  for (const [runnerId, acc] of attempts) {
    if (acc.sampleSize <= 0) continue;
    const successRate = acc.successes / acc.sampleSize;
    addRawSignal(raw, runnerId, 'Stealer', { signalValue: successRate, sampleSize: acc.sampleSize });
    addRawSignal(raw, runnerId, 'Bad Jumps', { signalValue: 1 - successRate, sampleSize: acc.sampleSize });
  }
  for (const [pitcherId, acc] of pitcherAttempts) {
    if (acc.sampleSize <= 0) continue;
    const pitcherSuccessRate = acc.successes / acc.sampleSize;
    addRawSignal(raw, pitcherId, 'Easy Jumps', { signalValue: pitcherSuccessRate, sampleSize: acc.sampleSize });
    addRawSignal(raw, pitcherId, 'Pick Officer', { signalValue: 1 - pitcherSuccessRate, sampleSize: acc.sampleSize });
  }
}

function addButterFingersSignals(input: SeasonTraitCandidateInput, raw: RawSignalMap): void {
  const chances = new Map<string, Accumulator>();
  for (const event of input.fieldingEvents.filter((item) => !fieldingUndoneAt(item))) {
    const acc = chances.get(event.playerId) ?? { successes: 0, sampleSize: 0 };
    acc.sampleSize += 1;
    if (event.playType === 'error' || event.success === false) acc.successes += 1;
    chances.set(event.playerId, acc);
  }
  for (const [playerId, acc] of chances) {
    if (acc.sampleSize <= 0) continue;
    addRawSignal(raw, playerId, 'Butter Fingers', {
      signalValue: acc.successes / acc.sampleSize,
      sampleSize: acc.sampleSize,
    });
  }
}

function addArmSignals(input: SeasonTraitCandidateInput, raw: RawSignalMap): void {
  const playerIds = new Set<string>([
    ...input.seasonFieldingByPlayer.keys(),
    ...input.gamesByPlayer.keys(),
  ]);
  for (const playerId of playerIds) {
    const fielding = input.seasonFieldingByPlayer.get(playerId);
    const games = fielding?.games ?? input.gamesByPlayer.get(playerId) ?? 0;
    const arm = (fielding?.outfieldAssists ?? 0) + (fielding?.baserunnersHeld ?? 0);
    const rate = games > 0 ? arm / games : 0;
    // v1 approximation: no per-outfield-throw opportunity denominator exists.
    addRawSignal(raw, playerId, 'Cannon Arm', { signalValue: rate, sampleSize: games });
    addRawSignal(raw, playerId, 'Noodle Arm', { signalValue: -rate, sampleSize: games });
  }
}

/**
 * R1-b2 — Bunter (TRAIT_MEASUREMENT_SPEC §0.9 + JK ruling 2026-06-18). VOLUME /
 * frequency, NOT a success rate: signalValue = successful sacrifice bunts
 * (`result === 'SAC'`) PER PA, where PA = the batter's non-undone at-bat count.
 * Failures don't drag it — the numerator is SAC successes ONLY. Reads the
 * standard `SAC` result (NOT enrichment-gated). Position-role downstream.
 */
function addBunterSignals(input: SeasonTraitCandidateInput, raw: RawSignalMap): void {
  interface BunterCounts { pa: number; sac: number; }
  const counts = new Map<string, BunterCounts>();

  for (const atBat of sortAtBats(input.atBatEvents).filter((event) => !undoneAt(event))) {
    const entry = counts.get(atBat.batterId) ?? { pa: 0, sac: 0 };
    entry.pa += 1;
    if (atBat.result === 'SAC') entry.sac += 1;
    counts.set(atBat.batterId, entry);
  }

  for (const [batterId, entry] of counts) {
    if (entry.pa <= 0) continue;
    addRawSignal(raw, batterId, 'Bunter', {
      signalValue: entry.sac / entry.pa,
      sampleSize: entry.pa,
    });
  }
}

/**
 * R1-b2 — Crossed Up (TRAIT_MEASUREMENT_SPEC §0.9). A pitcher whose battery
 * crosses signals: passed-ball events attributed to the pitcher per
 * batters-faced. Numerator = non-undone `betweenPlayEvents` where
 * `wildPitchOrPassedBall?.wpOrPb === 'passed_ball'` AND
 * `wildPitchOrPassedBall.pitcherId === pitcherId`. Denominator = batters-faced =
 * that pitcher's non-undone at-bat count (as `pitcherId`). signalValue = pb / bf,
 * sampleSize = bf. OPT-IN: dormant until PBs are logged (the min-sample valve
 * handles the dormant case). Pitcher-role downstream.
 */
function addCrossedUpSignals(input: SeasonTraitCandidateInput, raw: RawSignalMap): void {
  // Batters-faced = the pitcher's non-undone PA count (the denominator).
  const battersFaced = new Map<string, number>();
  for (const atBat of sortAtBats(input.atBatEvents).filter((event) => !undoneAt(event))) {
    battersFaced.set(atBat.pitcherId, (battersFaced.get(atBat.pitcherId) ?? 0) + 1);
  }

  // Passed balls attributed to each pitcher (the numerator).
  const passedBalls = new Map<string, number>();
  for (const event of sortBetweenPlayEvents(input.betweenPlayEvents).filter((item) => !undoneAt(item))) {
    const payload = event.wildPitchOrPassedBall;
    if (payload?.wpOrPb !== 'passed_ball') continue;
    const pitcherId = payload.pitcherId;
    if (!pitcherId) continue;
    passedBalls.set(pitcherId, (passedBalls.get(pitcherId) ?? 0) + 1);
  }

  for (const [pitcherId, bf] of battersFaced) {
    if (bf <= 0) continue;
    const pb = passedBalls.get(pitcherId) ?? 0;
    addRawSignal(raw, pitcherId, 'Crossed Up', {
      signalValue: pb / bf,
      sampleSize: bf,
    });
  }
}

/**
 * R1-b2 — Utility (TRAIT_MEASUREMENT_SPEC §0.9). Fielding performance at a
 * NON-primary position. For each non-undone `fieldingEvent` whose `playerId` has
 * a primary position in `primaryPositionByPlayer` AND whose `event.position` is
 * NOT that primary → one non-primary chance; success = `event.success === true`.
 * signalValue = successful-non-primary / total-non-primary chances, sampleSize =
 * total-non-primary chances. A player ABSENT from the map gets NO Utility signal
 * (the map is the deferred-wiring seam — when it is empty, Utility is dormant).
 * Position-role downstream.
 */
function addUtilitySignals(input: SeasonTraitCandidateInput, raw: RawSignalMap): void {
  const primaryByPlayer = input.primaryPositionByPlayer;
  if (!primaryByPlayer || primaryByPlayer.size === 0) return;

  const chances = new Map<string, Accumulator>();
  for (const event of input.fieldingEvents.filter((item) => !fieldingUndoneAt(item))) {
    const primary = primaryByPlayer.get(event.playerId);
    if (primary == null) continue;           // absent from the map → no signal
    if (event.position === primary) continue; // a primary-position chance is excluded
    const acc = chances.get(event.playerId) ?? { successes: 0, sampleSize: 0 };
    acc.sampleSize += 1;
    if (event.success === true) acc.successes += 1;
    chances.set(event.playerId, acc);
  }

  for (const [playerId, acc] of chances) {
    if (acc.sampleSize <= 0) continue;
    addRawSignal(raw, playerId, 'Utility', {
      signalValue: acc.successes / acc.sampleSize,
      sampleSize: acc.sampleSize,
    });
  }
}

function addDurabilitySignals(input: SeasonTraitCandidateInput, raw: RawSignalMap): void {
  const playerIds = new Set<string>([
    ...input.gamesByPlayer.keys(),
    ...input.injuryCountsByPlayer.keys(),
  ]);
  for (const playerId of playerIds) {
    const games = input.gamesByPlayer.get(playerId) ?? 0;
    const injuries = input.injuryCountsByPlayer.get(playerId) ?? 0;
    const rate = games > 0 ? injuries / games : 0;
    addRawSignal(raw, playerId, 'Durable', { signalValue: -rate, sampleSize: games });
    addRawSignal(raw, playerId, 'Injury Prone', { signalValue: rate, sampleSize: games });
  }
}

function buildRawSignals(input: SeasonTraitCandidateInput): RawSignalMap {
  const raw: RawSignalMap = new Map();
  addAtBatSignals(input, raw);
  addOutcomeRateSignals(input, raw);
  // R1-b1 — Big/Little Hack, Distractor, Base Rounder (after the R1-a outcome rates).
  addHackSignals(input, raw);
  addDistractorSignals(input, raw);
  addBaseRounderSignals(input, raw);
  addStealSignals(input, raw);
  addButterFingersSignals(input, raw);
  addArmSignals(input, raw);
  // R1-b2 — Bunter (SAC volume per PA), Crossed Up (passed balls per batters-faced),
  // Utility (fielding perf at a non-primary position).
  addBunterSignals(input, raw);
  addCrossedUpSignals(input, raw);
  addUtilitySignals(input, raw);
  addDurabilitySignals(input, raw);
  return raw;
}

function roleKey(role: PlayerRole, traitName: string): string {
  return `${role}|${traitName}`;
}

function buildPeerPools(players: readonly SeasonTraitPlayer[], raw: RawSignalMap): Map<string, number[]> {
  const pools = new Map<string, number[]>();
  for (const player of [...players].sort((a, b) => a.playerId.localeCompare(b.playerId))) {
    const byTrait = raw.get(player.playerId);
    if (!byTrait) continue;
    for (const traitName of BUILDABLE_TRAITS) {
      if (!isTraitEligibleForRole(traitName, player.role)) continue;
      const signal = byTrait.get(traitName);
      if (!signal || signal.sampleSize <= 0) continue;
      const key = roleKey(player.role, traitName);
      pools.set(key, pools.get(key) ?? []);
      pools.get(key)?.push(signal.signalValue);
    }
  }
  return pools;
}

/**
 * Compute deterministic per-player trait candidates. The returned map includes
 * every input player id in sorted order; players with no raw eligible signals
 * map to an empty array.
 */
export function computeSeasonTraitCandidates(
  input: SeasonTraitCandidateInput,
  config: AdaptiveStandardsConfig = DEFAULT_ADAPTIVE_STANDARDS_CONFIG,
): Map<string, SeasonTraitCandidate[]> {
  const raw = buildRawSignals(input);
  const peerPools = buildPeerPools(input.players, raw);
  const results = new Map<string, SeasonTraitCandidate[]>();
  const sortedPlayers = [...input.players].sort((a, b) => a.playerId.localeCompare(b.playerId));

  for (const player of sortedPlayers) {
    const candidates: SeasonTraitCandidate[] = [];
    const byTrait = raw.get(player.playerId);
    if (byTrait) {
      for (const traitName of BUILDABLE_TRAITS) {
        if (!isTraitEligibleForRole(traitName, player.role)) continue;
        const signal = byTrait.get(traitName);
        if (!signal) continue;
        const score = computeTraitRealityScore({
          traitName,
          playerRole: player.role,
          signalValue: signal.signalValue,
          sampleSize: signal.sampleSize,
          peerValues: peerPools.get(roleKey(player.role, traitName)) ?? [],
          basis: 'none',
        }, config);
        // Emit the L9b-2 seam shape ({ traitName, score }) + raw debug fields.
        candidates.push({
          traitName,
          score,
          signalValue: signal.signalValue,
          sampleSize: signal.sampleSize,
        });
      }
    }
    results.set(player.playerId, candidates);
  }

  return results;
}
