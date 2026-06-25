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
  ErrorAttribution,
  FieldingEvent,
  RunnerState,
} from '../utils/eventLog';
import type { AtBatResult } from '../types/game';
import { isOut } from '../types/game';
import { getPercentile } from './percentile';
import { calculateWOBA } from './bwarCalculator';
import type { BattingStatsForWAR } from '../types/war';
import { SMB4_GRADE_TO_INDEX, type Smb4Grade } from './smb4GradeEmulator';

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
  // R2 (TRAIT_MEASUREMENT_SPEC §0.10): pitcher count-family (walks-allowed rate
  // proxy — BB Prone/Falls Behind = walkRate, Composed/Gets Ahead = 1−walkRate,
  // pair-mates share the signal, personality TILT differentiates §0.7); the
  // position First-Pitch pair (hits/(hits+outs) on logged first-pitch PAs); and
  // the 6 handedness splits (DORMANT until the handedness-map join is wired — the
  // maps mirror Utility's primaryPositionByPlayer deferred seam). Build-dark.
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
  // R1-b3 / PRE-ACT-TRAITS-1 (TRAIT_MEASUREMENT_SPEC §0.9): Two Way earn-signal =
  // elite hitting for a pitcher = the pitcher's batting wOBA (calculateWOBA) vs the
  // PITCHER peer pool (valve-gated → super-rare). Each two-way pitcher's variant is
  // assigned by a deterministic FNV-1a hash of playerId mod 3 → C/IF/OF (stable
  // forever, pseudo-random across pitchers, no Math.random). All 3 variants are
  // canonical + pitcher-only and pool together as ONE 'Two Way' family (poolTraitKey)
  // so wOBA is percentiled vs ALL two-way pitchers regardless of assigned variant.
  'Two Way (C)',
  'Two Way (IF)',
  'Two Way (OF)',
  // R3 (TRAIT_MEASUREMENT_SPEC §0.11): Ace Exterminator earn-signal = the batter's
  // reached-base rate (hit/walk/HBP) vs A−-or-better opposing pitchers. DORMANT
  // until the E1 grade join (`pitcherGradeByPlayer`) is fed — the grade-freshness
  // hook is a deferred step, NOT this ticket. Position-role. Build-dark.
  'Ace Exterminator',
  // T-9b (TRAIT_MEASUREMENT_SPEC §0.6b): per-pitch-type net-quality earn-signals
  // (T-9a aggregator). Pitcher Elite-<pitch> + position Fastball/Off-Speed Hitter;
  // dormant until ≥10 tagged ABs of that pitch (rate-basis minSampleRate valve).
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
  // DT-B (TRAIT_MEASUREMENT_SPEC §0.6b row B): per-pitch-LOCATION net-quality
  // earn-signals (reuses the T-9a hitter scorer over enrichment.pitchLocation);
  // hitter-only; dormant until ≥10 tagged ABs in that zone (rate-basis valve).
  'High Pitch',
  'Low Pitch',
  'Inside Pitch',
  'Outside Pitch',
  // DT-C1 (TRAIT_MEASUREMENT_SPEC §0.6b row C): chase hit-rate earn-signal
  // (hits-on-chase / (hits + outs-on-chase) over enrichment.chased ABs);
  // hitter-only; dormant until ≥10 chased hit-or-out ABs (rate-basis valve).
  'Bad Ball Hitter',
  // DT-C2 (TRAIT_MEASUREMENT_SPEC §0.6b row C): fielder web-gem rate
  // earn-signals; gated at signal emission by fielding/arm ratings so peer pools
  // are rating-eligible cohorts only.
  'Magic Hands',
  'Dive Wizard',
  // DT-D (TRAIT_MEASUREMENT_SPEC §0.6b row D): error-attribution earn-signals
  // from playerId-keyed errorAttributions (NOT enrichment.errors): throwing +
  // fielding errors → Wild Thrower; mental errors → Noodle Arm.
  'Wild Thrower',
  'Noodle Arm',
  // DT-E (TRAIT_MEASUREMENT_SPEC §0.6b row E): mojo-change-rate earn-signals.
  // Volatile = many real mojo transitions per game; Consistent = inverse rate.
  'Volatile',
  'Consistent',
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
  /**
   * DT-C2 (Magic Hands / Dive Wizard) — OPTIONAL. The fielder's current SMB4
   * fielding + arm ratings keyed by playerId. These are cohort filters, applied
   * at signal emission: fielding < 80 emits Magic Hands; arm > 80 emits Dive
   * Wizard. When absent or a fielder is missing, both web-gem traits stay
   * dormant for that fielder.
   */
  fielderRatingsByPlayer?: ReadonlyMap<string, { fielding: number; arm: number }>;
  /**
   * R2 (handedness splits) — OPTIONAL. The throwing hand ('L'|'R') of each pitcher
   * keyed by pitcherId, used to bucket the position batter's CON/POW splits and to
   * classify same/opposite for the pitcher's Specialist/Reverse Splits. When this
   * map is absent or empty, ALL 6 handedness splits stay DORMANT (the
   * `addHandednessSplitSignals` early-return). This is the deferred-wiring seam —
   * the hook that joins roster handedness is NOT part of this ticket (mirrors
   * Utility's `primaryPositionByPlayer`).
   */
  pitcherHandByPlayer?: ReadonlyMap<string, 'L' | 'R'>;
  /**
   * R2 (handedness splits) — OPTIONAL. The batting hand ('L'|'R'|'S') of each
   * batter keyed by batterId. Only consumed by the pitcher's Specialist/Reverse
   * Splits (the same/opposite cohort split); a switch hitter ('S') has no fixed
   * hand and is EXCLUDED from both cohorts. An at-bat whose batter is absent from
   * this map is skipped for the Specialist/Reverse cohort accounting.
   */
  batterHandByPlayer?: ReadonlyMap<string, 'L' | 'R' | 'S'>;
  /**
   * R3 (Ace Exterminator) — OPTIONAL. The opposing pitcher's SMB4 roster grade
   * keyed by pitcherId, joined on `atBat.pitcherId`. Only PAs vs an A−-or-better
   * pitcher (`SMB4_GRADE_TO_INDEX[grade] >= SMB4_GRADE_TO_INDEX['A-']`) count toward
   * the batter's Ace Exterminator reached-base rate. When this map is absent or
   * empty, Ace Exterminator stays DORMANT (the `addAceExterminatorSignals`
   * early-return). This is the deferred-wiring seam — the app-wide grade-freshness
   * hook that derives + refreshes grades is NOT part of this ticket (mirrors
   * Utility's `primaryPositionByPlayer` and the handedness maps).
   */
  pitcherGradeByPlayer?: ReadonlyMap<string, Smb4Grade>;
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

// §0.6b row C web-gem set; Robbed HR INCLUDED per JK 2026-06-25.
// Over Shoulder / Wall Catch remain excluded for v1.
const WEB_GEM_PLAY_TYPES: ReadonlySet<string> = new Set(['Diving', 'Leaping', 'Sliding', 'Robbed HR']);

const ELITE_PITCH_CODES = ['4F', '2F', 'CF', 'CB', 'CH', 'FK', 'SB', 'SL'] as const;
type ElitePitchCode = (typeof ELITE_PITCH_CODES)[number];

const ELITE_PITCH_BY_CODE: Record<string, string> = {
  '4F': 'Elite 4F',
  '2F': 'Elite 2F',
  CF: 'Elite CF',
  CB: 'Elite CB',
  CH: 'Elite CH',
  FK: 'Elite FK',
  SB: 'Elite SB',
  SL: 'Elite SL',
};

const FASTBALL_PITCH_CODES = new Set<string>(['4F', '2F', 'CF']);
const OFFSPEED_PITCH_CODES = new Set<string>(['SL', 'CB', 'CH', 'FK', 'SB']);

export type PitchOutcomeClass = 'K' | 'BB' | 'HR' | 'SINGLE' | 'BIGHIT' | 'OUT' | 'NEUTRAL';

export const PITCH_OUTCOME_CLASSES: readonly PitchOutcomeClass[] = [
  'K',
  'BB',
  'HR',
  'SINGLE',
  'BIGHIT',
  'OUT',
  'NEUTRAL',
];

export const PITCH_OUTCOME_RESULTS_BY_CLASS: Record<PitchOutcomeClass, readonly AtBatResult[]> = {
  K: [...STRIKEOUT_RESULTS],
  BB: ['BB', 'IBB'],
  HR: [...HOME_RUN_RESULTS],
  SINGLE: ['1B'],
  BIGHIT: ['2B', '3B', 'GRD'],
  OUT: ['GO', 'FO', 'FLO', 'LO', 'PO', 'DP', 'TP'],
  NEUTRAL: ['SF', 'SAC', 'HBP', 'E', 'FC'],
};

const PITCH_OUTCOME_CLASS_BY_RESULT = new Map<AtBatResult, PitchOutcomeClass>(
  PITCH_OUTCOME_CLASSES.flatMap((outcomeClass) => (
    PITCH_OUTCOME_RESULTS_BY_CLASS[outcomeClass].map((result) => [result, outcomeClass] as const)
  )),
);

// Section 16 sim-tune defaults. SF/SAC/HBP fold to NEUTRAL until RBI/runner
// context is wired; downstream peer-percentiles make magnitudes secondary to
// monotonicity and HR-as-heaviest on each side.
export const PITCHER_PITCH_OUTCOME_WEIGHTS: Record<PitchOutcomeClass, number> = {
  K: 1.0,
  OUT: 0.3,
  NEUTRAL: 0,
  BB: -1.0,
  SINGLE: -2.0,
  BIGHIT: -2.0,
  HR: -3.0,
};

export const HITTER_PITCH_OUTCOME_WEIGHTS: Record<PitchOutcomeClass, number> = {
  HR: 3.0,
  BIGHIT: 2.0,
  SINGLE: 1.0,
  BB: 0.5,
  OUT: 0,
  NEUTRAL: 0,
  K: -1.0,
};

export function classifyPitchOutcome(result: AtBatResult): PitchOutcomeClass {
  const outcomeClass = PITCH_OUTCOME_CLASS_BY_RESULT.get(result);
  if (!outcomeClass) {
    throw new Error(`Unclassified pitch outcome: ${result}`);
  }
  return outcomeClass;
}

function isElitePitchCode(code: string | undefined): code is ElitePitchCode {
  return typeof code === 'string'
    && code.length > 0
    && Object.prototype.hasOwnProperty.call(ELITE_PITCH_BY_CODE, code);
}

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
  // R2: the pitcher side gains a `walk` count (the count-family walks-allowed
  // proxy: BB/IBB allowed to opposing batters). walkRate = walk / pa (pa = BF).
  interface PitcherCounts { pa: number; k: number; walk: number; }
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

    const pitcher = pitcherCounts.get(atBat.pitcherId) ?? { pa: 0, k: 0, walk: 0 };
    pitcher.pa += 1;
    if (STRIKEOUT_RESULTS.has(atBat.result)) pitcher.k += 1;
    if (atBat.result === 'BB' || atBat.result === 'IBB') pitcher.walk += 1;
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

    // R2 count-family (§0.10): walks-allowed rate. BB Prone / Falls Behind = the
    // rate (high walks); Composed / Gets Ahead = 1 − rate (low walks). Each pair
    // shares the SAME signal — personality TILT differentiates them (§0.7).
    const walkRate = counts.walk / counts.pa;
    addRawSignal(raw, pitcherId, 'BB Prone', { signalValue: walkRate, sampleSize: counts.pa });
    addRawSignal(raw, pitcherId, 'Falls Behind', { signalValue: walkRate, sampleSize: counts.pa });
    addRawSignal(raw, pitcherId, 'Composed', { signalValue: 1 - walkRate, sampleSize: counts.pa });
    addRawSignal(raw, pitcherId, 'Gets Ahead', { signalValue: 1 - walkRate, sampleSize: counts.pa });
  }
}

function addPitchTypeSignals(input: SeasonTraitCandidateInput, raw: RawSignalMap): void {
  interface NetBucket { sum: number; sampleSize: number; }
  interface HitterPitchBuckets {
    FB: NetBucket;
    OS: NetBucket;
  }

  const pitcherBuckets = new Map<string, Map<ElitePitchCode, NetBucket>>();
  const hitterBuckets = new Map<string, HitterPitchBuckets>();

  const getPitcherBucket = (pitcherId: string, code: ElitePitchCode): NetBucket => {
    let byCode = pitcherBuckets.get(pitcherId);
    if (!byCode) {
      byCode = new Map();
      pitcherBuckets.set(pitcherId, byCode);
    }
    let bucket = byCode.get(code);
    if (!bucket) {
      bucket = { sum: 0, sampleSize: 0 };
      byCode.set(code, bucket);
    }
    return bucket;
  };

  const getHitterBuckets = (batterId: string): HitterPitchBuckets => {
    let buckets = hitterBuckets.get(batterId);
    if (!buckets) {
      buckets = {
        FB: { sum: 0, sampleSize: 0 },
        OS: { sum: 0, sampleSize: 0 },
      };
      hitterBuckets.set(batterId, buckets);
    }
    return buckets;
  };

  for (const atBat of sortAtBats(input.atBatEvents).filter((event) => !undoneAt(event))) {
    const code = atBat.enrichment?.pitchType;
    if (!isElitePitchCode(code)) continue;

    const outcomeClass = classifyPitchOutcome(atBat.result);
    const pitcherBucket = getPitcherBucket(atBat.pitcherId, code);
    pitcherBucket.sum += PITCHER_PITCH_OUTCOME_WEIGHTS[outcomeClass];
    pitcherBucket.sampleSize += 1;

    const hitterBucket = FASTBALL_PITCH_CODES.has(code)
      ? getHitterBuckets(atBat.batterId).FB
      : OFFSPEED_PITCH_CODES.has(code)
        ? getHitterBuckets(atBat.batterId).OS
        : null;
    if (!hitterBucket) continue;
    hitterBucket.sum += HITTER_PITCH_OUTCOME_WEIGHTS[outcomeClass];
    hitterBucket.sampleSize += 1;
  }

  for (const pitcherId of [...pitcherBuckets.keys()].sort()) {
    const byCode = pitcherBuckets.get(pitcherId);
    if (!byCode) continue;
    for (const code of ELITE_PITCH_CODES) {
      const bucket = byCode.get(code);
      if (!bucket || bucket.sampleSize <= 0) continue;
      addRawSignal(raw, pitcherId, ELITE_PITCH_BY_CODE[code], {
        signalValue: bucket.sum / bucket.sampleSize,
        sampleSize: bucket.sampleSize,
      });
    }
  }

  for (const batterId of [...hitterBuckets.keys()].sort()) {
    const buckets = hitterBuckets.get(batterId);
    if (!buckets) continue;
    if (buckets.FB.sampleSize > 0) {
      addRawSignal(raw, batterId, 'Fastball Hitter', {
        signalValue: buckets.FB.sum / buckets.FB.sampleSize,
        sampleSize: buckets.FB.sampleSize,
      });
    }
    if (buckets.OS.sampleSize > 0) {
      addRawSignal(raw, batterId, 'Off-Speed Hitter', {
        signalValue: buckets.OS.sum / buckets.OS.sampleSize,
        sampleSize: buckets.OS.sampleSize,
      });
    }
  }
}

function addPitchLocationSignals(input: SeasonTraitCandidateInput, raw: RawSignalMap): void {
  type PitchLocationBucketKey = 'LOW' | 'HIGH' | 'INSIDE' | 'OUTSIDE';
  interface NetBucket { sum: number; sampleSize: number; }
  type HitterLocationBuckets = Record<PitchLocationBucketKey, NetBucket>;

  const locationBuckets = new Map<string, HitterLocationBuckets>();
  const bucketKeys: readonly PitchLocationBucketKey[] = ['LOW', 'HIGH', 'INSIDE', 'OUTSIDE'];
  const traitByBucket: Record<PitchLocationBucketKey, string> = {
    LOW: 'Low Pitch',
    HIGH: 'High Pitch',
    INSIDE: 'Inside Pitch',
    OUTSIDE: 'Outside Pitch',
  };

  const getHitterBuckets = (batterId: string): HitterLocationBuckets => {
    let buckets = locationBuckets.get(batterId);
    if (!buckets) {
      buckets = {
        LOW: { sum: 0, sampleSize: 0 },
        HIGH: { sum: 0, sampleSize: 0 },
        INSIDE: { sum: 0, sampleSize: 0 },
        OUTSIDE: { sum: 0, sampleSize: 0 },
      };
      locationBuckets.set(batterId, buckets);
    }
    return buckets;
  };

  for (const atBat of sortAtBats(input.atBatEvents).filter((event) => !undoneAt(event))) {
    const zone = atBat.enrichment?.pitchLocation;
    let bucketKey: PitchLocationBucketKey | null = null;
    if (zone === 'low') bucketKey = 'LOW';
    if (zone === 'high') bucketKey = 'HIGH';
    if (zone === 'inside') bucketKey = 'INSIDE';
    if (zone === 'outside') bucketKey = 'OUTSIDE';
    if (!bucketKey) continue;

    const outcomeClass = classifyPitchOutcome(atBat.result);
    const bucket = getHitterBuckets(atBat.batterId)[bucketKey];
    bucket.sum += HITTER_PITCH_OUTCOME_WEIGHTS[outcomeClass];
    bucket.sampleSize += 1;
  }

  for (const batterId of [...locationBuckets.keys()].sort()) {
    const buckets = locationBuckets.get(batterId);
    if (!buckets) continue;
    for (const bucketKey of bucketKeys) {
      const bucket = buckets[bucketKey];
      if (bucket.sampleSize <= 0) continue;
      addRawSignal(raw, batterId, traitByBucket[bucketKey], {
        signalValue: bucket.sum / bucket.sampleSize,
        sampleSize: bucket.sampleSize,
      });
    }
  }
}

function addChaseSignals(input: SeasonTraitCandidateInput, raw: RawSignalMap): void {
  interface ChaseBucket { hits: number; outs: number; }

  const chaseBuckets = new Map<string, ChaseBucket>();

  const getChaseBucket = (batterId: string): ChaseBucket => {
    let bucket = chaseBuckets.get(batterId);
    if (!bucket) {
      bucket = { hits: 0, outs: 0 };
      chaseBuckets.set(batterId, bucket);
    }
    return bucket;
  };

  for (const atBat of sortAtBats(input.atBatEvents).filter((event) => !undoneAt(event))) {
    if (atBat.enrichment?.chased !== true) continue;

    const outcomeClass = classifyPitchOutcome(atBat.result);
    const bucket = getChaseBucket(atBat.batterId);
    if (outcomeClass === 'HR' || outcomeClass === 'SINGLE' || outcomeClass === 'BIGHIT') {
      bucket.hits += 1;
    } else if (outcomeClass === 'K' || outcomeClass === 'OUT') {
      bucket.outs += 1;
    }
  }

  for (const batterId of [...chaseBuckets.keys()].sort()) {
    const bucket = chaseBuckets.get(batterId);
    if (!bucket) continue;
    const sampleSize = bucket.hits + bucket.outs;
    if (sampleSize <= 0) continue;
    addRawSignal(raw, batterId, 'Bad Ball Hitter', {
      signalValue: bucket.hits / sampleSize,
      sampleSize,
    });
  }
}

function addWebGemSignals(input: SeasonTraitCandidateInput, raw: RawSignalMap): void {
  interface WebGemBucket { webGems: number; chances: number; }

  const chancesByFielder = new Map<string, WebGemBucket>();

  for (const event of input.fieldingEvents.filter((item) => !fieldingUndoneAt(item))) {
    const bucket = chancesByFielder.get(event.playerId) ?? { webGems: 0, chances: 0 };
    bucket.chances += 1;
    if (event.success && event.specialPlayType && WEB_GEM_PLAY_TYPES.has(event.specialPlayType)) {
      bucket.webGems += 1;
    }
    chancesByFielder.set(event.playerId, bucket);
  }

  for (const playerId of [...chancesByFielder.keys()].sort()) {
    const bucket = chancesByFielder.get(playerId);
    if (!bucket || bucket.chances <= 0) continue;

    const ratings = input.fielderRatingsByPlayer?.get(playerId);
    if (!ratings) continue;

    const signal = {
      signalValue: bucket.webGems / bucket.chances,
      sampleSize: bucket.chances,
    };
    if (ratings.fielding < 80) {
      addRawSignal(raw, playerId, 'Magic Hands', signal);
    }
    if (ratings.arm > 80) {
      addRawSignal(raw, playerId, 'Dive Wizard', signal);
    }
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

/**
 * R3 — Ace Exterminator (TRAIT_MEASUREMENT_SPEC §0.11; JK ruling 2026-06-18). The
 * BATTER's reached-base rate vs A−-or-better opposing pitchers. DORMANT until the
 * E1 grade join is fed: if `pitcherGradeByPlayer` is absent or empty, return early
 * so the trait stays dormant (mirrors Utility / handedness deferred-wiring seams).
 *
 * For each non-undone at-bat, the opposing pitcher's grade =
 * `pitcherGradeByPlayer.get(atBat.pitcherId)`. The PA counts ONLY if that grade is
 * defined AND A− or better (`SMB4_GRADE_TO_INDEX[grade] >= SMB4_GRADE_TO_INDEX['A-']`,
 * higher index = better grade). A qualifying PA adds one opportunity keyed to the
 * BATTER; success = the batter reached base via hit/walk/HBP — REUSE the existing
 * `DISTRACTOR_REACH_RESULTS` set (excludes E/FC/D3K reaches). signalValue =
 * reached/(PAs vs A−+ pitchers), sampleSize = PAs vs A−+ pitchers. Position-role
 * downstream (the eligibility filter excludes pitcher batters).
 */
function addAceExterminatorSignals(input: SeasonTraitCandidateInput, raw: RawSignalMap): void {
  const gradeByPlayer = input.pitcherGradeByPlayer;
  if (!gradeByPlayer || gradeByPlayer.size === 0) return; // deferred-wiring seam empty → dormant

  const aceThreshold = SMB4_GRADE_TO_INDEX['A-'];
  const accumulators = new Map<string, Map<string, Accumulator>>();

  for (const atBat of sortAtBats(input.atBatEvents).filter((event) => !undoneAt(event))) {
    const grade = gradeByPlayer.get(atBat.pitcherId);
    if (grade == null) continue;                                  // pitcher grade absent → skip PA
    if (SMB4_GRADE_TO_INDEX[grade] < aceThreshold) continue;      // sub-A− pitcher → excluded
    const reached = DISTRACTOR_REACH_RESULTS.has(atBat.result);
    addOpportunity(accumulators, atBat.batterId, 'Ace Exterminator', reached);
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

function addErrorSignals(input: SeasonTraitCandidateInput, raw: RawSignalMap): void {
  const counts = new Map<string, { wildThrower: number; mental: number }>();

  const countAttribution = (attribution: ErrorAttribution): void => {
    for (const playerId of attribution.fielderIds ?? []) {
      const entry = counts.get(playerId) ?? { wildThrower: 0, mental: 0 };
      if (attribution.type === 'mental') {
        entry.mental += 1;
      } else if (attribution.type === 'throwing') {
        entry.wildThrower += 1;
      }
      counts.set(playerId, entry);
    }
  };

  for (const atBat of sortAtBats(input.atBatEvents).filter((event) => !undoneAt(event))) {
    for (const runnerOutcome of atBat.runnerOutcomes ?? []) {
      for (const attribution of runnerOutcome.errorAttributions ?? []) {
        countAttribution(attribution);
      }
    }
  }

  for (const event of sortBetweenPlayEvents(input.betweenPlayEvents).filter((item) => !undoneAt(item))) {
    for (const attribution of event.errorAttributions ?? []) {
      countAttribution(attribution);
    }
  }

  const playerIds = new Set<string>([
    ...input.seasonFieldingByPlayer.keys(),
    ...input.gamesByPlayer.keys(),
  ]);

  for (const playerId of [...playerIds].sort((left, right) => left.localeCompare(right))) {
    const fielding = input.seasonFieldingByPlayer.get(playerId);
    const games = fielding?.games ?? input.gamesByPlayer.get(playerId) ?? 0;
    if (games <= 0) continue;
    const entry = counts.get(playerId) ?? { wildThrower: 0, mental: 0 };
    addRawSignal(raw, playerId, 'Wild Thrower', {
      signalValue: entry.wildThrower / games,
      sampleSize: games,
    });
    addRawSignal(raw, playerId, 'Noodle Arm', {
      signalValue: entry.mental / games,
      sampleSize: games,
    });
  }
}

function addMojoSignals(input: SeasonTraitCandidateInput, raw: RawSignalMap): void {
  const changesByPlayer = new Map<string, number>();

  for (const event of sortBetweenPlayEvents(input.betweenPlayEvents).filter((item) => !undoneAt(item))) {
    const playerStateChange = event.playerStateChange;
    if (event.type !== 'mojo_change' || playerStateChange?.stateType !== 'mojo') continue;
    if (playerStateChange.previousValue === playerStateChange.newValue) continue;

    const playerId = playerStateChange.playerId;
    changesByPlayer.set(playerId, (changesByPlayer.get(playerId) ?? 0) + 1);
  }

  for (const [playerId, changes] of [...changesByPlayer.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const games = input.gamesByPlayer.get(playerId) ?? 0;
    if (games <= 0) continue;

    const rate = changes / games;
    addRawSignal(raw, playerId, 'Volatile', {
      signalValue: rate,
      sampleSize: games,
    });
    addRawSignal(raw, playerId, 'Consistent', {
      signalValue: -rate,
      sampleSize: games,
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

/**
 * R2 — First Pitch Slayer / Prayer (TRAIT_MEASUREMENT_SPEC §0.10; JK ruling
 * 2026-06-18 = HIT vs OUT). OPT-IN on `enrichment.pitchesInAtBat === 1`. For each
 * non-undone first-pitch PA that ended in a HIT (`HIT_RESULTS`) OR an OUT
 * (`isOut(result)`), add one opportunity to BOTH traits over the SAME hit-or-out
 * denominator: Slayer success = it was a hit; Prayer success = it was an out. A
 * first-pitch HBP / reached-on-error is NEITHER → excluded (not an opportunity).
 * Slayer = hits/(hits+outs), Prayer = outs/(hits+outs) = 1 − Slayer; sampleSize =
 * hit-or-out first-pitch PAs. Credited to the BATTER (position-role downstream).
 * (A first-pitch K is impossible — K needs ≥3 pitches — so K's presence in isOut
 * is harmless here.)
 */
function addFirstPitchSignals(input: SeasonTraitCandidateInput, raw: RawSignalMap): void {
  const accumulators = new Map<string, Map<string, Accumulator>>();

  for (const atBat of sortAtBats(input.atBatEvents).filter((event) => !undoneAt(event))) {
    if (atBat.enrichment?.pitchesInAtBat !== 1) continue;
    const isHit = HIT_RESULTS.has(atBat.result);
    const isOutPa = isOut(atBat.result);
    // Only hit-or-out first-pitch PAs are opportunities (HBP/E/FC are neither).
    if (!isHit && !isOutPa) continue;
    addOpportunity(accumulators, atBat.batterId, 'First Pitch Slayer', isHit);
    addOpportunity(accumulators, atBat.batterId, 'First Pitch Prayer', isOutPa);
  }

  addAccumulatorSignals(raw, accumulators);
}

// R2 (handedness POW splits): total-bases of a single AB-result (TB component of ISO).
function totalBasesOf(result: AtBatResult): number {
  if (result === '1B') return 1;
  if (result === '2B' || result === 'GRD') return 2;
  if (result === '3B') return 3;
  if (result === 'HR' || result === 'ITPHR') return 4;
  return 0;
}

/**
 * R2 — the 6 handedness platoon splits (TRAIT_MEASUREMENT_SPEC §0.10; JK rulings
 * 2026-06-18). DORMANT until the handedness join is fed: if `pitcherHandByPlayer`
 * is absent or empty, return early so all 6 traits stay dormant. `opposingHand`
 * is hardcoded 'R' in the reconstructor — these splits read the THREADED maps, NOT
 * that field.
 *
 *  - CON vs LHP / CON vs RHP (position, by opposing-pitcher hand) = avoid-strikeout
 *    rate `1 − K/PA` in PAs vs L / R pitchers. Bucketed by
 *    `pitcherHandByPlayer.get(pitcherId)`; an at-bat whose pitcher hand is absent
 *    is skipped for the batter splits. sampleSize = PA in that bucket.
 *  - POW vs LHP / POW vs RHP (position, by opposing-pitcher hand) = ISO
 *    `(TB − H)/AB` in that bucket. TB: 1B=1, 2B/GRD=2, 3B=3, HR/ITPHR=4; H =
 *    `HIT_RESULTS`; AB = bucket-PA − (BB+IBB+HBP+SF+SAC) (the `NON_AB_RESULTS`).
 *    sampleSize = AB in that bucket; skipped when AB ≤ 0.
 *  - Specialist / Reverse Splits (PITCHER, by batter-vs-pitcher hand) = `1 − BAA`
 *    vs SAME / OPPOSITE handed batters. Needs BOTH maps; an at-bat is skipped if
 *    the pitcher hand, the batter hand is absent, or `batterHand === 'S'` (switch
 *    hitters EXCLUDED — no fixed hand). BAA = hits-allowed/AB by that cohort; AB
 *    counts non-`NON_AB_RESULTS` PAs, hits = `HIT_RESULTS`. Low BAA ⇒ high signal
 *    (inverted so a tough pitcher ranks HIGH). sampleSize = cohort AB; skipped
 *    when AB ≤ 0.
 */
function addHandednessSplitSignals(input: SeasonTraitCandidateInput, raw: RawSignalMap): void {
  const pitcherHand = input.pitcherHandByPlayer;
  if (!pitcherHand || pitcherHand.size === 0) return;
  const batterHand = input.batterHandByPlayer;

  interface BatterSplit { pa: number; k: number; ab: number; tb: number; hits: number; }
  // Per batter, two oppHand buckets keyed 'L'/'R'.
  const batterSplits = new Map<string, { L: BatterSplit; R: BatterSplit }>();
  const newBatterSplit = (): BatterSplit => ({ pa: 0, k: 0, ab: 0, tb: 0, hits: 0 });

  interface PitcherCohort { ab: number; hits: number; }
  // Per pitcher, a SAME-handed cohort and an OPPOSITE-handed cohort.
  const pitcherCohorts = new Map<string, { same: PitcherCohort; opposite: PitcherCohort }>();
  const newPitcherCohort = (): PitcherCohort => ({ ab: 0, hits: 0 });

  for (const atBat of sortAtBats(input.atBatEvents).filter((event) => !undoneAt(event))) {
    const pHand = pitcherHand.get(atBat.pitcherId);

    // --- Position batter CON/POW splits (bucketed by the opposing pitcher's hand) ---
    if (pHand === 'L' || pHand === 'R') {
      let splits = batterSplits.get(atBat.batterId);
      if (!splits) {
        splits = { L: newBatterSplit(), R: newBatterSplit() };
        batterSplits.set(atBat.batterId, splits);
      }
      const bucket = splits[pHand];
      bucket.pa += 1;
      if (STRIKEOUT_RESULTS.has(atBat.result)) bucket.k += 1;
      if (!NON_AB_RESULTS.has(atBat.result)) bucket.ab += 1;
      bucket.tb += totalBasesOf(atBat.result);
      if (HIT_RESULTS.has(atBat.result)) bucket.hits += 1;
    }

    // --- Pitcher Specialist / Reverse Splits (by batter-vs-pitcher hand) ---
    const bHand = batterHand?.get(atBat.batterId);
    if ((pHand === 'L' || pHand === 'R') && (bHand === 'L' || bHand === 'R')) {
      let cohorts = pitcherCohorts.get(atBat.pitcherId);
      if (!cohorts) {
        cohorts = { same: newPitcherCohort(), opposite: newPitcherCohort() };
        pitcherCohorts.set(atBat.pitcherId, cohorts);
      }
      const cohort = bHand === pHand ? cohorts.same : cohorts.opposite;
      if (!NON_AB_RESULTS.has(atBat.result)) cohort.ab += 1;
      if (HIT_RESULTS.has(atBat.result)) cohort.hits += 1;
    }
  }

  for (const [batterId, splits] of batterSplits) {
    // CON: avoid-strikeout rate 1 − K/PA, per oppHand bucket (sampleSize = PA).
    if (splits.L.pa > 0) {
      addRawSignal(raw, batterId, 'CON vs LHP', { signalValue: 1 - splits.L.k / splits.L.pa, sampleSize: splits.L.pa });
    }
    if (splits.R.pa > 0) {
      addRawSignal(raw, batterId, 'CON vs RHP', { signalValue: 1 - splits.R.k / splits.R.pa, sampleSize: splits.R.pa });
    }
    // POW: ISO = (TB − H)/AB, per oppHand bucket (sampleSize = AB; skip AB ≤ 0).
    if (splits.L.ab > 0) {
      addRawSignal(raw, batterId, 'POW vs LHP', { signalValue: (splits.L.tb - splits.L.hits) / splits.L.ab, sampleSize: splits.L.ab });
    }
    if (splits.R.ab > 0) {
      addRawSignal(raw, batterId, 'POW vs RHP', { signalValue: (splits.R.tb - splits.R.hits) / splits.R.ab, sampleSize: splits.R.ab });
    }
  }

  for (const [pitcherId, cohorts] of pitcherCohorts) {
    // Specialist = 1 − BAA vs SAME-handed batters; Reverse Splits = 1 − BAA vs
    // OPPOSITE-handed. Low BAA ⇒ high signal (inverted). sampleSize = cohort AB.
    if (cohorts.same.ab > 0) {
      addRawSignal(raw, pitcherId, 'Specialist', { signalValue: 1 - cohorts.same.hits / cohorts.same.ab, sampleSize: cohorts.same.ab });
    }
    if (cohorts.opposite.ab > 0) {
      addRawSignal(raw, pitcherId, 'Reverse Splits', { signalValue: 1 - cohorts.opposite.hits / cohorts.opposite.ab, sampleSize: cohorts.opposite.ab });
    }
  }
}

/**
 * R1-b3 — Two Way (TRAIT_MEASUREMENT_SPEC §0.9; JK ruling 2026-06-18 "earn-signal
 * now, defer C/IF/OF"). The Two Way earn-signal = ELITE HITTING for a pitcher = the
 * pitcher's batting wOBA. Restricted to PITCHER-role players (mirrors
 * `addHackSignals`' position restriction): build a pitcher-id set from
 * `input.players`, accumulate each such player's BATTING counts from the non-undone
 * at-bats where they are the `batterId`, assemble a `BattingStatsForWAR`, and emit
 * ONE candidate under that pitcher's seeded variant `twoWayVariantForPitcher(id)`
 * (C/IF/OF) with signalValue = `calculateWOBA(stats)` (default SMB4 weights),
 * sampleSize = batting PA. The pitcher peer pool is the shared family key
 * (role|`Two Way` via `poolTraitKey`), automatically all pitchers who batted →
 * "percentile vs the pitcher pool" regardless of each pitcher's assigned variant. The
 * min-sample valve (basis `'none'`, floor 10 PA) keeps it super-rare. A pitcher with
 * PA ≤ 0 is skipped.
 *
 * Result → BattingStatsForWAR mapping (§0.9):
 *   singles = 1B; doubles = 2B + GRD; triples = 3B; homeRuns = HR + ITPHR;
 *   walks = BB + IBB (TOTAL); intentionalWalks = IBB; hitByPitch = HBP; sacFlies = SF;
 *   ab = PA − (BB + IBB + HBP + SF + SAC) (reuse NON_AB_RESULTS); hits = singles +
 *   doubles + triples + homeRuns; pa = batting PA; sacBunts = SAC; strikeouts =
 *   STRIKEOUT_RESULTS count; gidp = DP; stolenBases = 0; caughtStealing = 0 (not
 *   derivable from at-bats). (`calculateWOBA` consumes only uBB = walks − IBB, HBP,
 *   singles/doubles/triples/HR, ab, sacFlies — but every required field is filled.)
 *
 * PRE-ACT-TRAITS-1: the C/IF/OF position is now seeded deterministically at BUILD
 * (FNV-1a of playerId mod 3 — outcome-identical to a stable per-pitcher "at grant"
 * assignment) and all 3 variants pool as ONE `Two Way` family (`poolTraitKey`). The
 * scorer / acquisition / grant path are unchanged.
 */
/**
 * PRE-ACT-TRAITS-1: local deterministic FNV-1a 32-bit hash of a string. Used only to
 * assign each two-way pitcher a stable pseudo-random C/IF/OF variant from their
 * playerId. Intentionally local (NOT the L10 engine import) to keep this builder pure
 * and self-contained — no Math.random, no Date.now.
 */
function hashString(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const TWO_WAY_VARIANTS = ['Two Way (C)', 'Two Way (IF)', 'Two Way (OF)'] as const;
type TwoWayVariant = (typeof TWO_WAY_VARIANTS)[number];

/**
 * PRE-ACT-TRAITS-1: deterministic per-pitcher Two Way variant. Stable forever
 * (FNV-1a of playerId mod 3), pseudo-random across pitchers. The position assigned
 * at BUILD is outcome-identical to "at grant" — a stable C/IF/OF per pitcher — so the
 * grant path stays untouched.
 */
function twoWayVariantForPitcher(playerId: string): TwoWayVariant {
  return TWO_WAY_VARIANTS[hashString(playerId) % 3];
}

/**
 * PRE-ACT-TRAITS-1: canonicalize any of the 3 Two Way variants to a single 'Two Way'
 * family key so all two-way pitchers share ONE peer pool (wOBA percentiled vs ALL
 * two-way pitchers regardless of assigned variant). Every other trait keys on itself.
 */
function poolTraitKey(traitName: string): string {
  return (TWO_WAY_VARIANTS as readonly string[]).includes(traitName) ? 'Two Way' : traitName;
}

function addTwoWaySignals(input: SeasonTraitCandidateInput, raw: RawSignalMap): void {
  const pitcherIds = new Set<string>(
    input.players.filter((player) => player.role === 'pitcher').map((player) => player.playerId),
  );
  if (pitcherIds.size === 0) return;

  interface BattingCounts {
    pa: number;
    singles: number;
    doubles: number;
    triples: number;
    homeRuns: number;
    walks: number;          // BB + IBB (total)
    intentionalWalks: number; // IBB
    hitByPitch: number;
    sacFlies: number;
    sacBunts: number;
    strikeouts: number;
    gidp: number;
    nonAb: number;          // BB + IBB + HBP + SF + SAC
  }
  const counts = new Map<string, BattingCounts>();

  for (const atBat of sortAtBats(input.atBatEvents).filter((event) => !undoneAt(event))) {
    if (!pitcherIds.has(atBat.batterId)) continue;
    const entry = counts.get(atBat.batterId) ?? {
      pa: 0,
      singles: 0,
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
      nonAb: 0,
    };
    entry.pa += 1;
    const result = atBat.result;
    if (result === '1B') entry.singles += 1;
    if (result === '2B' || result === 'GRD') entry.doubles += 1;
    if (result === '3B') entry.triples += 1;
    if (result === 'HR' || result === 'ITPHR') entry.homeRuns += 1;
    if (result === 'BB' || result === 'IBB') entry.walks += 1;
    if (result === 'IBB') entry.intentionalWalks += 1;
    if (result === 'HBP') entry.hitByPitch += 1;
    if (result === 'SF') entry.sacFlies += 1;
    if (result === 'SAC') entry.sacBunts += 1;
    if (STRIKEOUT_RESULTS.has(result)) entry.strikeouts += 1;
    if (result === 'DP') entry.gidp += 1;
    if (NON_AB_RESULTS.has(result)) entry.nonAb += 1;
    counts.set(atBat.batterId, entry);
  }

  for (const [pitcherId, entry] of counts) {
    if (entry.pa <= 0) continue;
    const hits = entry.singles + entry.doubles + entry.triples + entry.homeRuns;
    const stats: BattingStatsForWAR = {
      pa: entry.pa,
      ab: entry.pa - entry.nonAb,
      hits,
      singles: entry.singles,
      doubles: entry.doubles,
      triples: entry.triples,
      homeRuns: entry.homeRuns,
      walks: entry.walks,
      intentionalWalks: entry.intentionalWalks,
      hitByPitch: entry.hitByPitch,
      sacFlies: entry.sacFlies,
      sacBunts: entry.sacBunts,
      strikeouts: entry.strikeouts,
      gidp: entry.gidp,
      stolenBases: 0,
      caughtStealing: 0,
    };
    addRawSignal(raw, pitcherId, twoWayVariantForPitcher(pitcherId), {
      signalValue: calculateWOBA(stats),
      sampleSize: entry.pa,
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

export function buildRawSignals(input: SeasonTraitCandidateInput): RawSignalMap {
  const raw: RawSignalMap = new Map();
  addAtBatSignals(input, raw);
  addOutcomeRateSignals(input, raw);
  // R1-b1 — Big/Little Hack, Distractor, Base Rounder (after the R1-a outcome rates).
  addHackSignals(input, raw);
  addDistractorSignals(input, raw);
  // R3 — Ace Exterminator (reached-base rate vs A−+ opposing pitchers; DORMANT
  // until the E1 grade map is threaded in).
  addAceExterminatorSignals(input, raw);
  addBaseRounderSignals(input, raw);
  addStealSignals(input, raw);
  addButterFingersSignals(input, raw);
  addErrorSignals(input, raw);
  addArmSignals(input, raw);
  // R1-b2 — Bunter (SAC volume per PA), Crossed Up (passed balls per batters-faced),
  // Utility (fielding perf at a non-primary position).
  addBunterSignals(input, raw);
  addCrossedUpSignals(input, raw);
  addUtilitySignals(input, raw);
  // R2 — First-Pitch pair (count-family is folded into addOutcomeRateSignals) +
  // the 6 handedness splits (DORMANT until the handedness maps are threaded in).
  addFirstPitchSignals(input, raw);
  addHandednessSplitSignals(input, raw);
  // R1-b3 / PRE-ACT-TRAITS-1 — Two Way earn-signal (PITCHER-role batting wOBA vs the
  // shared pitcher pool; valve-gated → super-rare). Each pitcher's C/IF/OF variant is
  // seeded deterministically (twoWayVariantForPitcher); all 3 pool as ONE family.
  addTwoWaySignals(input, raw);
  addDurabilitySignals(input, raw);
  // T-9a — per-pitch-type net-quality (INERT until T-9b adds the 10 traits to BUILDABLE_TRAITS).
  addPitchTypeSignals(input, raw);
  // DT-B — per-pitch-LOCATION net-quality (TRAIT_MEASUREMENT_SPEC §0.6b row B; reuses the T-9a hitter scorer).
  addPitchLocationSignals(input, raw);
  // DT-C1 — Bad Ball Hitter chase hit-rate (TRAIT_MEASUREMENT_SPEC §0.6b row C).
  addChaseSignals(input, raw);
  // DT-C2 — web-gem rate with rating-gated cohort filters (TRAIT_MEASUREMENT_SPEC §0.6b row C).
  addWebGemSignals(input, raw);
  // DT-E — mojo-change rate and inverse rate (TRAIT_MEASUREMENT_SPEC §0.6b row E).
  addMojoSignals(input, raw);
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
      const key = roleKey(player.role, poolTraitKey(traitName));
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
          peerValues: peerPools.get(roleKey(player.role, poolTraitKey(traitName))) ?? [],
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
