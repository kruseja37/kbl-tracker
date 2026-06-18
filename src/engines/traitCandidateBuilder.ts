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

type StolenBasePayload = NonNullable<BetweenPlayEvent['stolenBase']> & {
  runnerId?: string;
  isSuccessful?: boolean;
};

function addStealSignals(input: SeasonTraitCandidateInput, raw: RawSignalMap): void {
  const attempts = new Map<string, Accumulator>();
  for (const event of sortBetweenPlayEvents(input.betweenPlayEvents).filter((item) => !undoneAt(item))) {
    const payload = event.stolenBase as StolenBasePayload | undefined;
    if (!payload?.runnerId || typeof payload.isSuccessful !== 'boolean') continue;
    const acc = attempts.get(payload.runnerId) ?? { successes: 0, sampleSize: 0 };
    acc.sampleSize += 1;
    if (payload.isSuccessful) acc.successes += 1;
    attempts.set(payload.runnerId, acc);
  }
  for (const [runnerId, acc] of attempts) {
    if (acc.sampleSize <= 0) continue;
    const successRate = acc.successes / acc.sampleSize;
    addRawSignal(raw, runnerId, 'Stealer', { signalValue: successRate, sampleSize: acc.sampleSize });
    addRawSignal(raw, runnerId, 'Bad Jumps', { signalValue: 1 - successRate, sampleSize: acc.sampleSize });
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
  addStealSignals(input, raw);
  addButterFingersSignals(input, raw);
  addArmSignals(input, raw);
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
