import type { LuxuryCapRow } from '../data/tierParams';
import {
  LEGAL_ROSTER,
  canCover,
  canRelieve,
  canStart,
  isCloser,
  isLegalRoster,
  type FieldPosition,
  type RosterSlotPlayer,
} from '../data/rosterConstruction';
import { snakeLuxuryCaps } from './snakeLuxuryTax';
import { snakeMoneyAffordable, snakeMoneyNonnegative } from './snakeMoney';
import { computeOwnValue } from './auctionMarketModel';
import { constructionArchetypeFitMultiplier } from './archetypeIdentity';
import {
  luxuryTax,
  shiftLuxuryCaps,
  type Band,
  type BandPriorities,
  type TeamCapIdentity,
} from './leagueConstruction';
import { rosterNeedBreakdown } from './rosterNeed';
import {
  advanceTrustedSnakeSeatingCertificate,
  createTrustedSnakeSeatingCertificate,
  proveSimultaneousSnakeSeating,
  validateConstructiveSnakeSeatingProof,
  type SimultaneousSnakeSeatingInput,
  type SnakeSeatingAssignment,
  type SnakeSeatingPlayer,
  type SnakeSeatingProof,
  type TrustedSnakeSeatingCertificate,
} from './snakeSeatingProof';
import { deriveVersionGroupId } from './snakeVersioning';

export const SNAKE_RATIONAL_ROOM_TUNING = {
  trueCostDragLambda: 1.15,
} as const;

export type SnakeRiskRead = 'SAFE_TO_WAIT' | 'AT_RISK' | 'LIKELY_GONE';
export type SnakeRationalRoomStatus = 'ready' | 'unavailable';
export type SnakeScenarioId = 'BASE' | `RIVAL_SECOND:${string}`;
export type SnakeCanonicalRole = FieldPosition | 'CATCHER_DEPTH' | 'SP' | 'RP' | 'CP';

export interface SnakeRationalPlayer extends SnakeSeatingPlayer {
  /** Frozen public worth seed. Team-specific fit and need remain derived in this engine. */
  worth: number;
  archetypeWeights?: Partial<Record<Band, number>>;
}

export interface SnakeSettledRosterPrice {
  playerId: string;
  settledPrice: number;
}

export interface SnakeRationalSeat {
  teamId: string;
  roster: readonly SnakeSeatingPlayer[];
  /** Public settled prices are key material even though the engine spends their exact total. */
  settledRosterPrices: readonly SnakeSettledRosterPrice[];
  committedSpent: number;
  budget: number;
  /** Locked at GO and public. Mid-draft archetype edits are not an input to this engine. */
  lockedArchetype: BandPriorities;
  capIdentity?: TeamCapIdentity;
}

export interface SnakeRationalPick {
  pick: number;
  pickIndex: number;
  teamId: string;
  playerId: string;
  versionGroupId: string;
  interest: number;
}

export interface SnakeRationalScenario {
  id: SnakeScenarioId;
  status: 'valid' | 'invalid';
  picks: SnakeRationalPick[];
}

export interface SnakeRiskRow {
  playerId: string;
  risk: SnakeRiskRead;
  nextPick: number;
  earliestSelectingPick: number | null;
  latestSelectingPick: number;
  latestSelectingPickIsAskingTurn: boolean;
  interestedClubCount: number;
  /** Compatibility aliases retained until Batch 4B removes the old one-playout presentation. */
  draftedAtPick: number | null;
  rationalBuyersBeforeTurn: number;
}

export interface SnakeScarcityRow {
  playerId: string;
  role: SnakeCanonicalRole;
  viablePeopleLeft: number;
  clubsStillNeeding: number;
  lowestViableTrueCost: number | null;
  highestViableTrueCost: number | null;
  targetContextualWorth: number | null;
  replacementPlayerId: string | null;
  replacementContextualWorth: number | null;
  contextualWorthDrop: number | null;
  replacementState: 'AVAILABLE' | 'NO_REPLACEMENT';
}

export interface SnakeScarcityWitnessCard {
  playerId: string;
  versionGroupId: string;
  trueCost: number | null;
  contextualWorth: number | null;
  finish: SnakeScarcityFinishWitness;
}

export interface SnakeScarcityViableFinishWitness {
  kind: 'VIABLE';
  /** Only assignments changed from the independently verified root certificate. */
  assignmentDelta: SnakeScarcityAssignmentDelta[];
}

export interface SnakeScarcityAssignmentDelta {
  teamId: string;
  removePlayerIds: string[];
  addPlayerIds: string[];
  salaryCost: number;
  addedTax: number;
  allInCost: number;
}

export type SnakeScarcityNonviabilityWitness =
  | { kind: 'ECONOMIC' }
  | { kind: 'CANONICAL_ROSTER'; openSlots: number; minimumAdditions: number }
  | { kind: 'AFFORDABILITY'; budgetRemaining: number; completionSalaryFloor: number }
  | { kind: 'SHARED_BODY'; needed: number; available: number }
  | { kind: 'SHARED_ROLE'; role: SnakeCanonicalRole; needed: number; available: number };

export interface SnakeScarcityNonviableFinishWitness {
  kind: 'NONVIABLE';
  reason: SnakeScarcityNonviabilityWitness;
}

export type SnakeScarcityFinishWitness =
  | SnakeScarcityViableFinishWitness
  | SnakeScarcityNonviableFinishWitness;

export interface SnakeScarcityWitnessRole {
  role: SnakeCanonicalRole;
  clubsStillNeeding: number;
}

export interface SnakeScarcityWitnessPayload {
  schemaVersion: 2;
  requestKey: string;
  decision: {
    nextPick: number;
    risks: SnakeRiskRow[];
    scenarios: SnakeRationalScenario[];
  };
  /** Verified once; every viable card supplies a constructive delta from this proof. */
  rootProof: SnakeSeatingProof;
  /** Every card eligible for at least one requested role, once, in frozen pool order. */
  cards: SnakeScarcityWitnessCard[];
  rowIdentities: Array<{ playerId: string; role: SnakeCanonicalRole }>;
  roles: SnakeScarcityWitnessRole[];
}

export interface SnakeScarcityWitness extends SnakeScarcityWitnessPayload {
  /** Per-request keyed authenticator; the secret never returns in the worker response. */
  authTag: string;
}

/**
 * Compatibility seam for the current page callers. Batch 4A's ensemble is the complete risk truth:
 * local board cushion/depth may explain a decision later, but may never rewrite market survival.
 */
export function applyCanonicalSnakeRiskTriggers<T extends SnakeRiskRead | null>(input: {
  playoutRisk: T;
  planCushion: number | null;
  cheapestFinishPositionDepth: number | null;
}): T {
  return input.playoutRisk;
}

/** Canonical hard-role scarcity, including secondary catcher and swing-arm paths. */
export function canonicalSnakeRoleDepth(
  target: RosterSlotPlayer,
  available: readonly RosterSlotPlayer[],
): number {
  const depths: number[] = [];
  if (!target.isPitcher) {
    depths.push(available.filter((player) => !player.isPitcher && player.position === target.position).length);
  }
  if (canCover(target, 'C')) depths.push(available.filter((player) => canCover(player, 'C')).length);
  if (canStart(target)) depths.push(available.filter(canStart).length);
  if (canRelieve(target)) depths.push(available.filter(canRelieve).length);
  if (isCloser(target)) depths.push(available.filter(isCloser).length);
  return depths.length > 0 ? Math.min(...depths) : available.length;
}

export interface SnakeRationalRoomResult {
  status: SnakeRationalRoomStatus;
  unavailableReason: string | null;
  askingTeamId: string;
  nextPick: number | null;
  scenarios: SnakeRationalScenario[];
  /** BASE scenario compatibility alias. */
  playout: SnakeRationalPick[];
  risks: SnakeRiskRow[];
  scarcity: SnakeScarcityRow[];
  scarcityWitness: SnakeScarcityWitness | null;
  availableHumanCountAfter: number;
}

export interface PlaySnakeRationalRoomInput {
  currentPickIndex: number;
  pickOrder: readonly { pick: number; teamId: string }[];
  askingTeamId: string;
  askedPlayerIds: readonly string[];
  players: readonly SnakeRationalPlayer[];
  seats: readonly SnakeRationalSeat[];
  baseCaps: readonly LuxuryCapRow[];
  realTeamCount: number;
  taxLambda?: number;
  /** Exact risk now; exact scarcity may expand in the worker background. */
  includeScarcity?: boolean;
}

export type SnakeRationalDecisionListener = (decision: SnakeRationalRoomResult) => void;

export interface SnakeScarcityWitnessBinding {
  requestKey: string;
  witnessSecret: string;
}

export function countRationalRoomHumans(players: readonly SnakeRationalPlayer[]): number {
  return new Set(players.map(deriveVersionGroupId)).size;
}

/** Compatibility helper. Batch 4A's richer scarcity rows use only viable, version-deduped people. */
export function computeSnakeScarcity(input: {
  players: readonly SnakeRationalPlayer[];
  teamsStillNeeding: number;
}): number {
  if (input.teamsStillNeeding <= 0) return Number.POSITIVE_INFINITY;
  return countRationalRoomHumans(input.players) / input.teamsStillNeeding;
}

const ROLE_ORDER: readonly SnakeCanonicalRole[] = [
  ...LEGAL_ROSTER.fieldPositions,
  'CATCHER_DEPTH',
  'SP',
  'RP',
  'CP',
];

function finiteDeep(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(finiteDeep);
  if (value && typeof value === 'object') return Object.values(value).every(finiteDeep);
  return true;
}

function stableWitnessSerialization(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Nonfinite witness value');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableWitnessSerialization).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableWitnessSerialization(child)}`)
      .join(',')}}`;
  }
  throw new Error('Unsupported witness value');
}

/** Per-request keyed authenticator. Unlike a plain row digest, its secret stays in the UI closure. */
export function snakeScarcityWitnessAuthTag(
  payload: SnakeScarcityWitnessPayload,
  witnessSecret: string,
): string {
  if (!/^[0-9a-f]{64}$/i.test(witnessSecret)) return '';
  const text = `${witnessSecret}\u0000${stableWitnessSerialization(payload)}\u0000${[...witnessSecret].reverse().join('')}`;
  const state = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
  const multipliers = [0x01000193, 0x27d4eb2d, 0x165667b1, 0x9e3779b1];
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    for (let lane = 0; lane < state.length; lane += 1) {
      state[lane] ^= code + lane * 0x9e37 + index;
      state[lane] = Math.imul(state[lane], multipliers[lane]);
      state[lane] ^= state[lane] >>> 16;
    }
  }
  return state.map((part) => (part >>> 0).toString(16).padStart(8, '0')).join('');
}

function applicableRoles(shape: RosterSlotPlayer): SnakeCanonicalRole[] {
  const roles = new Set<SnakeCanonicalRole>();
  if (!shape.isPitcher && LEGAL_ROSTER.fieldPositions.includes(shape.position as FieldPosition)) {
    roles.add(shape.position as FieldPosition);
  }
  if (canCover(shape, 'C')) roles.add('CATCHER_DEPTH');
  if (canStart(shape)) roles.add('SP');
  if (canRelieve(shape)) roles.add('RP');
  if (isCloser(shape)) roles.add('CP');
  return ROLE_ORDER.filter((role) => roles.has(role));
}

function eligibleForRole(shape: RosterSlotPlayer, role: SnakeCanonicalRole): boolean {
  if (role === 'CATCHER_DEPTH') return canCover(shape, 'C');
  if (role === 'SP') return canStart(shape);
  if (role === 'RP') return canRelieve(shape);
  if (role === 'CP') return isCloser(shape);
  return !shape.isPitcher && shape.position === role;
}

function canonicalRoleNeeds(roster: readonly SnakeSeatingPlayer[]): Set<SnakeCanonicalRole> {
  const shapes = roster.map((player) => player.shape);
  const need = rosterNeedBreakdown(shapes);
  const roles = new Set<SnakeCanonicalRole>(need.missingPrimaries);
  if (need.catcherCoverNeed > 0) roles.add('CATCHER_DEPTH');
  if (need.closerDeficit > 0) roles.add('CP');

  const pitchers = shapes.filter((shape) => shape.isPitcher);
  const pureSp = pitchers.filter((shape) => shape.role === 'SP').length;
  const pureRelief = pitchers.filter((shape) => shape.role === 'RP' || shape.role === 'CP').length;
  const swings = pitchers.filter((shape) => shape.role === 'SP/RP').length;
  // Match rosterNeed's canonical x=0..swings search, including its first-minimum tie break.
  for (let swingsToRotation = 0; swingsToRotation <= swings; swingsToRotation += 1) {
    const rotationNeed = Math.max(0, LEGAL_ROSTER.startingPitchers - pureSp - swingsToRotation);
    const reliefClassNeed = Math.max(
      0,
      LEGAL_ROSTER.minRelievers - pureRelief - (swings - swingsToRotation),
    );
    const reliefNeed = Math.max(reliefClassNeed, need.closerDeficit);
    if (rotationNeed + reliefNeed !== need.pitcherNeed) continue;
    if (rotationNeed > 0) roles.add('SP');
    if (reliefNeed > 0) roles.add('RP');
    break;
  }
  return roles;
}

function unavailableResult(input: PlaySnakeRationalRoomInput, reason: string): SnakeRationalRoomResult {
  return {
    status: 'unavailable',
    unavailableReason: reason,
    askingTeamId: input.askingTeamId,
    nextPick: null,
    scenarios: [],
    playout: [],
    risks: [],
    scarcity: [],
    scarcityWitness: null,
    availableHumanCountAfter: countRationalRoomHumans(input.players),
  };
}

function validatePublicInput(input: PlaySnakeRationalRoomInput): string | null {
  if (!Number.isInteger(input.currentPickIndex) || input.currentPickIndex < 0 || input.currentPickIndex >= input.pickOrder.length) {
    return 'CURRENT_PICK_UNAVAILABLE';
  }
  if (!input.askingTeamId || !Number.isInteger(input.realTeamCount) || input.realTeamCount <= 0) {
    return 'PUBLIC_ROOM_INCOMPLETE';
  }
  if (!Number.isFinite(input.taxLambda ?? SNAKE_RATIONAL_ROOM_TUNING.trueCostDragLambda)) {
    return 'NONFINITE_ECONOMICS';
  }
  if (input.pickOrder.some((slot) => !Number.isInteger(slot.pick) || slot.pick <= 0 || !slot.teamId)) {
    return 'PUBLIC_ORDER_INCOMPLETE';
  }
  const playerIds = new Set<string>();
  for (const player of input.players) {
    if (!player.playerId || playerIds.has(player.playerId)) return 'PUBLIC_POOL_INCOMPLETE';
    playerIds.add(player.playerId);
    if (!Number.isFinite(player.price) || player.price < 0 || !Number.isFinite(player.worth) || !finiteDeep(player.archetypeWeights) || !finiteDeep(player.construction)) {
      return 'NONFINITE_ECONOMICS';
    }
  }
  if (input.askedPlayerIds.some((playerId) => !playerIds.has(playerId))) return 'REQUESTED_PLAYER_UNAVAILABLE';
  const seatIds = new Set<string>();
  const committedGroups = new Set<string>();
  for (const seat of input.seats) {
    if (!seat.teamId || seatIds.has(seat.teamId) || seat.roster.length > LEGAL_ROSTER.size) return 'PUBLIC_SEATS_INCOMPLETE';
    seatIds.add(seat.teamId);
    if (
      !Number.isFinite(seat.committedSpent)
      || seat.committedSpent < 0
      || !Number.isFinite(seat.budget)
      || seat.budget < 0
      || !finiteDeep(seat.lockedArchetype)
      || !finiteDeep(seat.capIdentity)
      || seat.settledRosterPrices.length !== seat.roster.length
      || seat.settledRosterPrices.some((row) => !row.playerId || !Number.isFinite(row.settledPrice) || row.settledPrice < 0)
    ) return 'NONFINITE_ECONOMICS';
    const rosterIds = [...seat.roster.map((player) => player.playerId)].sort();
    const settledIds = [...seat.settledRosterPrices.map((row) => row.playerId)].sort();
    if (
      rosterIds.join('|') !== settledIds.join('|')
      || Math.abs(seat.settledRosterPrices.reduce((sum, row) => sum + row.settledPrice, 0) - seat.committedSpent) > 1e-6
      || seat.roster.some((player) => !player.playerId || !Number.isFinite(player.price) || player.price < 0 || !finiteDeep(player.construction))
    ) return 'PUBLIC_SEATS_INCOMPLETE';
    for (const player of seat.roster) {
      const groupId = deriveVersionGroupId(player);
      if (committedGroups.has(groupId)) return 'PUBLIC_SEATS_INCOMPLETE';
      committedGroups.add(groupId);
    }
  }
  if (!seatIds.has(input.askingTeamId) || input.realTeamCount !== input.seats.length) return 'PUBLIC_SEATS_INCOMPLETE';
  if (input.players.some((player) => committedGroups.has(deriveVersionGroupId(player)))) return 'PUBLIC_POOL_INCOMPLETE';
  if (!finiteDeep(input.baseCaps)) return 'NONFINITE_ECONOMICS';
  return null;
}

function nextAskingPickIndex(input: PlaySnakeRationalRoomInput): number {
  return input.pickOrder.findIndex((slot, index) => (
    index > input.currentPickIndex && slot.teamId === input.askingTeamId
  ));
}

function simulationStartIndex(input: PlaySnakeRationalRoomInput): number {
  return input.pickOrder[input.currentPickIndex]?.teamId === input.askingTeamId
    ? input.currentPickIndex + 1
    : input.currentPickIndex;
}

interface MutableSeat extends Omit<SnakeRationalSeat, 'roster' | 'settledRosterPrices'> {
  roster: SnakeSeatingPlayer[];
  settledRosterPrices: SnakeSettledRosterPrice[];
}

interface FeasibleCandidate {
  player: SnakeRationalPlayer;
  interest: number;
  certificate: TrustedSnakeSeatingCertificate;
}

interface RankedCandidate {
  player: SnakeRationalPlayer;
  interest: number;
  allInCost: number;
}

function toSeatingPlayer(player: SnakeSeatingPlayer): SnakeSeatingPlayer {
  return {
    playerId: player.playerId,
    sourceId: player.sourceId,
    versionGroupId: player.versionGroupId,
    price: player.price,
    shape: player.shape,
    construction: player.construction,
  };
}

function buildSharedSeatingInput(input: {
  room: PlaySnakeRationalRoomInput;
  seats: ReadonlyMap<string, MutableSeat>;
  available: ReadonlyMap<string, SnakeRationalPlayer>;
  normalizedCaps: readonly LuxuryCapRow[];
}): SimultaneousSnakeSeatingInput | null {
  const clubs = input.room.seats.map((source) => {
    const seat = input.seats.get(source.teamId);
    if (!seat) return null;
    const shiftedCaps = seat.capIdentity
      ? shiftLuxuryCaps([...input.normalizedCaps], seat.capIdentity)
      : [...input.normalizedCaps];
    const currentTax = luxuryTax(
      seat.roster.map((entry) => entry.construction),
      shiftedCaps,
      'taxed',
    ).charged;
    if (!Number.isFinite(currentTax)) return null;
    return {
      teamId: seat.teamId,
      roster: seat.roster.map(toSeatingPlayer),
      budgetRemaining: seat.budget - seat.committedSpent - currentTax,
      committedConstruction: seat.roster.map((entry) => entry.construction),
      capIdentity: seat.capIdentity,
    };
  });
  if (clubs.some((club) => club === null)) return null;
  return {
    clubs: clubs as NonNullable<(typeof clubs)[number]>[],
    pool: [...input.available.values()].map(toSeatingPlayer),
    baseCaps: input.room.baseCaps,
    realTeamCount: input.room.realTeamCount,
  };
}

function proveSharedCandidate(input: {
  currentCertificate: TrustedSnakeSeatingCertificate;
  teamId: string;
  player: SnakeRationalPlayer;
  allInCost: number;
  stateKey: string;
  proofCache: Map<string, TrustedSnakeSeatingCertificate>;
}): TrustedSnakeSeatingCertificate | null {
  if (!Number.isFinite(input.allInCost)) return null;
  const key = `${input.stateKey}::${input.teamId}::${input.player.playerId}::${input.allInCost}`;
  const cached = input.proofCache.get(key);
  if (cached) return cached;
  try {
    const certificate = advanceTrustedSnakeSeatingCertificate({
      certificate: input.currentCertificate,
      teamId: input.teamId,
      playerId: input.player.playerId,
      allInCost: input.allInCost,
    });
    if (certificate) input.proofCache.set(key, certificate);
    return certificate;
  } catch {
    return null;
  }
}

function rankedCandidates(input: {
  room: PlaySnakeRationalRoomInput;
  seat: MutableSeat;
  normalizedCaps: readonly LuxuryCapRow[];
  rankingCache: Map<string, readonly RankedCandidate[]>;
}): readonly RankedCandidate[] | null {
  const taxLambda = input.room.taxLambda ?? SNAKE_RATIONAL_ROOM_TUNING.trueCostDragLambda;
  const rankingKey = JSON.stringify({
    roster: input.seat.roster.map((player) => player.playerId),
    committedSpent: input.seat.committedSpent,
    budget: input.seat.budget,
    lockedArchetype: input.seat.lockedArchetype,
    capIdentity: input.seat.capIdentity ?? null,
    taxLambda,
  });
  const cached = input.rankingCache.get(rankingKey);
  if (cached) return cached;
  const need = rosterNeedBreakdown(input.seat.roster.map((entry) => entry.shape));
  const constructions = input.seat.roster.map((entry) => entry.construction);
  const shiftedCaps = input.seat.capIdentity
    ? shiftLuxuryCaps([...input.normalizedCaps], input.seat.capIdentity)
    : [...input.normalizedCaps];
  const currentTax = luxuryTax(constructions, shiftedCaps, 'taxed').charged;
  const built: RankedCandidate[] = [];
  for (const player of input.room.players) {
    // The club-specific cap shift is invariant across this entire ranking. Applying it once
    // avoids rebuilding the same cap table for every one of 500+ candidates.
    const taxAfterCandidate = luxuryTax(
      [...constructions, player.construction],
      shiftedCaps,
      'taxed',
    ).charged;
    const budgetAfterCandidate = input.seat.budget
      - input.seat.committedSpent
      - player.price
      - taxAfterCandidate;
    if (!Number.isFinite(budgetAfterCandidate) || !snakeMoneyNonnegative(budgetAfterCandidate)) continue;
    const fitWorth = computeOwnValue({
      iv: player.worth,
      archetypeWeights: player.archetypeWeights,
      ownBandPriorities: input.seat.lockedArchetype,
      archetypeFitMultiplierOverride: constructionArchetypeFitMultiplier(
        input.seat.capIdentity,
        player.construction,
      ),
      needBreakdown: need,
      shape: player.shape,
      openSlots: LEGAL_ROSTER.size - input.seat.roster.length,
    });
    const marginalTax = taxAfterCandidate - currentTax;
    const interest = fitWorth - taxLambda * marginalTax;
    if (!Number.isFinite(interest)) return null;
    built.push({ player, interest, allInCost: player.price + marginalTax });
  }
  built.sort((left, right) => (
    right.interest - left.interest || left.player.playerId.localeCompare(right.player.playerId)
  ));
  input.rankingCache.set(rankingKey, built);
  return built;
}

function feasibleChoices(input: {
  room: PlaySnakeRationalRoomInput;
  seat: MutableSeat;
  available: ReadonlyMap<string, SnakeRationalPlayer>;
  normalizedCaps: readonly LuxuryCapRow[];
  currentCertificate: TrustedSnakeSeatingCertificate;
  stateKey: string;
  proofCache: Map<string, TrustedSnakeSeatingCertificate>;
  rankingCache: Map<string, readonly RankedCandidate[]>;
  choiceCache: Map<string, readonly FeasibleCandidate[]>;
  limit: number;
}): FeasibleCandidate[] | null {
  const choiceKey = `${input.stateKey}::${input.seat.teamId}::${input.limit}`;
  const cachedChoices = input.choiceCache.get(choiceKey);
  if (cachedChoices) return [...cachedChoices];
  const ranked = rankedCandidates(input);
  if (!ranked) return null;

  const feasible: FeasibleCandidate[] = [];
  const feasibleGroups = new Set<string>();
  for (const candidate of ranked) {
    if (!input.available.has(candidate.player.playerId)) continue;
    const groupId = deriveVersionGroupId(candidate.player);
    if (feasibleGroups.has(groupId)) continue;
    const certificate = proveSharedCandidate({
      currentCertificate: input.currentCertificate,
      teamId: input.seat.teamId,
      player: candidate.player,
      allInCost: candidate.allInCost,
      stateKey: input.stateKey,
      proofCache: input.proofCache,
    });
    if (!certificate?.proof.feasible) continue;
    feasibleGroups.add(groupId);
    feasible.push({ player: candidate.player, interest: candidate.interest, certificate });
    if (feasible.length >= input.limit) break;
  }
  input.choiceCache.set(choiceKey, feasible);
  return feasible;
}

function simulateScenario(input: {
  room: PlaySnakeRationalRoomInput;
  id: SnakeScenarioId;
  secondChoiceTeamId: string | null;
  startIndex: number;
  stopIndex: number;
  normalizedCaps: readonly LuxuryCapRow[];
  initialCertificate: TrustedSnakeSeatingCertificate;
  proofCache: Map<string, TrustedSnakeSeatingCertificate>;
  rankingCache: Map<string, readonly RankedCandidate[]>;
  choiceCache: Map<string, readonly FeasibleCandidate[]>;
}): SnakeRationalScenario {
  const available = new Map(input.room.players.map((player) => [player.playerId, player]));
  const seats = new Map(input.room.seats.map((seat): [string, MutableSeat] => [seat.teamId, {
    ...seat,
    roster: [...seat.roster],
    settledRosterPrices: [...seat.settledRosterPrices],
  }]));
  const picks: SnakeRationalPick[] = [];
  let sensitivityApplied = false;
  let currentCertificate = input.initialCertificate;

  try {
    for (let pickIndex = input.startIndex; pickIndex < input.stopIndex; pickIndex += 1) {
      const slot = input.room.pickOrder[pickIndex];
      const seat = slot ? seats.get(slot.teamId) : null;
      if (!slot || !seat || seat.roster.length >= LEGAL_ROSTER.size) {
        return { id: input.id, status: 'invalid', picks: [] };
      }
      if (!currentCertificate.proof.feasible) return { id: input.id, status: 'invalid', picks: [] };
      const useSecond = !sensitivityApplied && input.secondChoiceTeamId === slot.teamId;
      const stateKey = picks.map((pick) => `${pick.teamId}=${pick.playerId}`).join('|') || 'ROOT';
      const choices = feasibleChoices({
        room: input.room,
        seat,
        available,
        normalizedCaps: input.normalizedCaps,
        currentCertificate,
        stateKey,
        proofCache: input.proofCache,
        rankingCache: input.rankingCache,
        choiceCache: input.choiceCache,
        limit: useSecond ? 2 : 1,
      });
      if (!choices || choices.length < (useSecond ? 2 : 1)) {
        return { id: input.id, status: 'invalid', picks: [] };
      }
      const choice = choices[useSecond ? 1 : 0];
      currentCertificate = choice.certificate;
      if (useSecond) sensitivityApplied = true;
      const versionGroupId = deriveVersionGroupId(choice.player);
      picks.push({
        pick: slot.pick,
        pickIndex,
        teamId: slot.teamId,
        playerId: choice.player.playerId,
        versionGroupId,
        interest: choice.interest,
      });
      seat.roster.push(choice.player);
      seat.committedSpent += choice.player.price;
      seat.settledRosterPrices.push({ playerId: choice.player.playerId, settledPrice: choice.player.price });
      for (const [playerId, player] of available) {
        if (deriveVersionGroupId(player) === versionGroupId) available.delete(playerId);
      }
    }
  } catch {
    return { id: input.id, status: 'invalid', picks: [] };
  }
  if (input.secondChoiceTeamId && !sensitivityApplied) return { id: input.id, status: 'invalid', picks: [] };
  return { id: input.id, status: 'valid', picks };
}

interface ViableAssessment {
  player: SnakeRationalPlayer;
  versionGroupId: string;
  trueCost: number;
  contextualWorth: number;
}

interface CertifiedViableAssessment extends ViableAssessment {
  certificate: TrustedSnakeSeatingCertificate;
}

interface AskingEconomicContext {
  shiftedCaps: LuxuryCapRow[];
  constructions: SnakeRationalSeat['roster'][number]['construction'][];
  currentTax: number;
  needBreakdown: ReturnType<typeof rosterNeedBreakdown>;
  openSlots: number;
}

function buildAskingEconomicContext(input: {
  askingSeat: SnakeRationalSeat;
  normalizedCaps: readonly LuxuryCapRow[];
}): AskingEconomicContext {
  const shiftedCaps = input.askingSeat.capIdentity
    ? shiftLuxuryCaps([...input.normalizedCaps], input.askingSeat.capIdentity)
    : [...input.normalizedCaps];
  const constructions = input.askingSeat.roster.map((entry) => entry.construction);
  return {
    shiftedCaps,
    constructions,
    currentTax: luxuryTax(constructions, shiftedCaps, 'taxed').charged,
    needBreakdown: rosterNeedBreakdown(input.askingSeat.roster.map((entry) => entry.shape)),
    openSlots: LEGAL_ROSTER.size - input.askingSeat.roster.length,
  };
}

function economicAssessmentForAskingClub(input: {
  room: PlaySnakeRationalRoomInput;
  askingSeat: SnakeRationalSeat;
  player: SnakeRationalPlayer;
  normalizedCaps: readonly LuxuryCapRow[];
  economicContext?: AskingEconomicContext;
}): ViableAssessment | null {
  if (input.askingSeat.roster.length >= LEGAL_ROSTER.size) return null;
  const context = input.economicContext ?? buildAskingEconomicContext(input);
  const taxAfterCandidate = luxuryTax(
    [...context.constructions, input.player.construction],
    context.shiftedCaps,
    'taxed',
  ).charged;
  const budgetAfterCandidate = input.askingSeat.budget
    - input.askingSeat.committedSpent
    - input.player.price
    - taxAfterCandidate;
  if (!Number.isFinite(budgetAfterCandidate) || !snakeMoneyNonnegative(budgetAfterCandidate)) return null;
  const marginalTax = taxAfterCandidate - context.currentTax;
  const trueCost = input.player.price + marginalTax;
  const contextualWorth = computeOwnValue({
    iv: input.player.worth,
    archetypeWeights: input.player.archetypeWeights,
    ownBandPriorities: input.askingSeat.lockedArchetype,
    archetypeFitMultiplierOverride: constructionArchetypeFitMultiplier(
      input.askingSeat.capIdentity,
      input.player.construction,
    ),
    needBreakdown: context.needBreakdown,
    shape: input.player.shape,
    openSlots: context.openSlots,
  });
  if (!Number.isFinite(contextualWorth) || !Number.isFinite(trueCost)) return null;
  return {
    player: input.player,
    versionGroupId: deriveVersionGroupId(input.player),
    trueCost,
    contextualWorth,
  };
}

function assessForAskingClub(input: {
  room: PlaySnakeRationalRoomInput;
  askingSeat: SnakeRationalSeat;
  player: SnakeRationalPlayer;
  normalizedCaps: readonly LuxuryCapRow[];
  currentCertificate: TrustedSnakeSeatingCertificate;
  proofCache: Map<string, TrustedSnakeSeatingCertificate>;
  proofFeasibilityKey?: (player: SnakeRationalPlayer, allInCost: number) => string;
  proofFeasibilityCache?: Map<string, boolean>;
  economicContext?: AskingEconomicContext;
}): CertifiedViableAssessment | null {
  const economic = economicAssessmentForAskingClub(input);
  if (!economic) return null;
  const proofFeasibilityKey = input.proofFeasibilityKey?.(input.player, economic.trueCost);
  const cachedFeasibility = proofFeasibilityKey === undefined
    ? undefined
    : input.proofFeasibilityCache?.get(proofFeasibilityKey);
  if (cachedFeasibility === false) return null;
  const certificate = proveSharedCandidate({
    currentCertificate: input.currentCertificate,
    teamId: input.askingSeat.teamId,
    player: input.player,
    allInCost: economic.trueCost,
    stateKey: 'ROOT',
    proofCache: input.proofCache,
  });
  const finishFeasible = Boolean(certificate?.proof.feasible);
  if (proofFeasibilityKey !== undefined) {
    input.proofFeasibilityCache?.set(proofFeasibilityKey, finishFeasible);
  }
  return certificate && finishFeasible ? { ...economic, certificate } : null;
}

function postPickSeatingInput(input: {
  root: SimultaneousSnakeSeatingInput;
  askingTeamId: string;
  player: SnakeSeatingPlayer;
  trueCost: number;
}): SimultaneousSnakeSeatingInput | null {
  const clubIndex = input.root.clubs.findIndex((club) => club.teamId === input.askingTeamId);
  if (clubIndex < 0 || !Number.isFinite(input.trueCost)) return null;
  const groupId = deriveVersionGroupId(input.player);
  if (input.root.clubs.some((club) => club.roster.some((row) => deriveVersionGroupId(row) === groupId))) {
    return null;
  }
  return {
    ...input.root,
    clubs: input.root.clubs.map((club, index) => index === clubIndex ? {
      ...club,
      roster: [...club.roster, input.player],
      budgetRemaining: club.budgetRemaining - input.trueCost,
      committedConstruction: [
        ...(club.committedConstruction ?? club.roster.map((row) => row.construction)),
        input.player.construction,
      ],
    } : club),
    // The constructive verifier excludes every committed version group, so the immutable source
    // pool can be shared exactly as it is by trusted child certificates.
    pool: input.root.pool,
  };
}

function hardRoleDemand(roster: readonly SnakeSeatingPlayer[]): Map<SnakeCanonicalRole, number> {
  const need = rosterNeedBreakdown(roster.map((player) => player.shape));
  const demand = new Map<SnakeCanonicalRole, number>();
  const add = (role: SnakeCanonicalRole, count: number) => {
    if (count > 0) demand.set(role, (demand.get(role) ?? 0) + count);
  };
  for (const position of need.missingPrimaries) add(position, 1);
  add('CATCHER_DEPTH', need.catcherCoverNeed);
  add('SP', need.rotationDeficit);
  add('RP', need.bullpenDeficit);
  add('CP', need.closerDeficit);
  return demand;
}

function remainingVersionRepresentatives(
  input: SimultaneousSnakeSeatingInput,
): SnakeSeatingPlayer[] {
  const committedGroups = new Set(input.clubs.flatMap((club) => club.roster.map(deriveVersionGroupId)));
  const preferred = new Map<string, SnakeSeatingPlayer>();
  for (const player of input.pool) {
    const groupId = deriveVersionGroupId(player);
    if (committedGroups.has(groupId)) continue;
    const current = preferred.get(groupId);
    if (!current || player.price < current.price
      || (player.price === current.price && player.playerId.localeCompare(current.playerId) < 0)) {
      preferred.set(groupId, player);
    }
  }
  return [...preferred.values()];
}

/** A necessary, independently recomputable reason that a candidate cannot preserve legal finish. */
function cheapNonviabilityWitness(input: {
  root: SimultaneousSnakeSeatingInput;
  askingTeamId: string;
  player: SnakeRationalPlayer;
  economic: ViableAssessment | null;
}): SnakeScarcityNonviabilityWitness | null {
  if (!input.economic) return { kind: 'ECONOMIC' };
  const postPick = postPickSeatingInput({
    root: input.root,
    askingTeamId: input.askingTeamId,
    player: input.player,
    trueCost: input.economic.trueCost,
  });
  if (!postPick) return null;
  const askingClub = postPick.clubs.find((club) => club.teamId === input.askingTeamId);
  if (!askingClub) return null;
  const remaining = remainingVersionRepresentatives(postPick);
  const openSlots = LEGAL_ROSTER.size - askingClub.roster.length;
  const askingNeed = rosterNeedBreakdown(askingClub.roster.map((player) => player.shape));
  if (askingNeed.infeasible || askingNeed.minimumAdditions > openSlots) {
    return { kind: 'CANONICAL_ROSTER', openSlots, minimumAdditions: askingNeed.minimumAdditions };
  }
  const totalOpenSlots = postPick.clubs.reduce(
    (sum, club) => sum + LEGAL_ROSTER.size - club.roster.length,
    0,
  );
  if (remaining.length < totalOpenSlots) {
    return { kind: 'SHARED_BODY', needed: totalOpenSlots, available: remaining.length };
  }
  const salaryFloor = [...remaining]
    .sort((left, right) => left.price - right.price || left.playerId.localeCompare(right.playerId))
    .slice(0, openSlots)
    .reduce((sum, player) => sum + player.price, 0);
  if (!snakeMoneyAffordable(salaryFloor, askingClub.budgetRemaining)) {
    return {
      kind: 'AFFORDABILITY',
      budgetRemaining: askingClub.budgetRemaining,
      completionSalaryFloor: salaryFloor,
    };
  }

  const demand = new Map<SnakeCanonicalRole, number>();
  for (const club of postPick.clubs) {
    for (const [role, count] of hardRoleDemand(club.roster)) {
      demand.set(role, (demand.get(role) ?? 0) + count);
    }
  }
  for (const role of ROLE_ORDER) {
    const needed = demand.get(role) ?? 0;
    if (needed <= 0) continue;
    const available = remaining.filter((player) => eligibleForRole(player.shape, role)).length;
    if (available < needed) return { kind: 'SHARED_ROLE', role, needed, available };
  }
  return null;
}

function constructiveAssignmentDelta(
  rootProof: SnakeSeatingProof,
  childProof: SnakeSeatingProof,
  clubs: readonly { teamId: string }[],
): SnakeScarcityAssignmentDelta[] | null {
  if (!childProof.feasible || childProof.shortfall !== null) return null;
  const rootByTeamId = new Map(rootProof.assignments.map((assignment) => [assignment.teamId, assignment]));
  const childByTeamId = new Map(childProof.assignments.map((assignment) => [assignment.teamId, assignment]));
  if (rootByTeamId.size !== clubs.length || childByTeamId.size !== clubs.length) return null;
  const delta: SnakeScarcityAssignmentDelta[] = [];
  for (const club of clubs) {
    const root = rootByTeamId.get(club.teamId);
    const child = childByTeamId.get(club.teamId);
    if (!root || !child) return null;
    if (!stableEqual(root, child)) {
      const rootIds = new Set(root.playerIds);
      const childIds = new Set(child.playerIds);
      delta.push({
        teamId: child.teamId,
        removePlayerIds: root.playerIds.filter((playerId) => !childIds.has(playerId)),
        addPlayerIds: child.playerIds
          .filter((playerId) => !rootIds.has(playerId))
          .sort((left, right) => left.localeCompare(right)),
        salaryCost: child.salaryCost,
        addedTax: child.addedTax,
        allInCost: child.allInCost,
      });
    }
  }
  return delta;
}

function preferredVersion(left: ViableAssessment, right: ViableAssessment): ViableAssessment {
  if (left.contextualWorth !== right.contextualWorth) {
    return left.contextualWorth > right.contextualWorth ? left : right;
  }
  if (left.trueCost !== right.trueCost) return left.trueCost < right.trueCost ? left : right;
  return left.player.playerId.localeCompare(right.player.playerId) <= 0 ? left : right;
}

function buildScarcityRows(input: {
  room: PlaySnakeRationalRoomInput;
  askedPlayers: readonly SnakeRationalPlayer[];
  askingSeat: SnakeRationalSeat;
  normalizedCaps: readonly LuxuryCapRow[];
  currentCertificate: TrustedSnakeSeatingCertificate;
  proofCache: Map<string, TrustedSnakeSeatingCertificate>;
}): {
  rows: SnakeScarcityRow[];
  witnessCards: SnakeScarcityWitnessCard[];
  witnessRoles: SnakeScarcityWitnessRole[];
} | null {
  const proofOwnerByGroup = new Map<string, string>();
  const playerById = new Map(input.currentCertificate.input.pool.map((player) => [player.playerId, player]));
  for (const assignment of input.currentCertificate.proof.assignments) {
    for (const playerId of assignment.playerIds) {
      const player = playerById.get(playerId);
      if (player) proofOwnerByGroup.set(deriveVersionGroupId(player), assignment.teamId);
    }
  }
  const committedOwnerByGroup = new Map<string, string>();
  for (const club of input.currentCertificate.input.clubs) {
    for (const player of club.roster) committedOwnerByGroup.set(deriveVersionGroupId(player), club.teamId);
  }
  const structuralCardSignature = (player: SnakeSeatingPlayer) => JSON.stringify({
    price: player.price,
    shape: player.shape,
    construction: player.construction,
  });
  const structuralGroupSignatures = new Map<string, string[]>();
  for (const player of input.currentCertificate.input.pool) {
    const groupId = deriveVersionGroupId(player);
    const signatures = structuralGroupSignatures.get(groupId) ?? [];
    signatures.push(structuralCardSignature(player));
    structuralGroupSignatures.set(groupId, signatures);
  }
  for (const signatures of structuralGroupSignatures.values()) signatures.sort();
  const proofFeasibilityCache = new Map<string, boolean>();
  const proofFeasibilityKey = (player: SnakeRationalPlayer, allInCost: number) => {
    const groupId = deriveVersionGroupId(player);
    return JSON.stringify({
      askingTeamId: input.askingSeat.teamId,
      allInCost,
      selected: structuralCardSignature(player),
      group: structuralGroupSignatures.get(groupId) ?? [],
      proofOwner: proofOwnerByGroup.get(groupId) ?? null,
      committedOwner: committedOwnerByGroup.get(groupId) ?? null,
    });
  };
  const economicContext = buildAskingEconomicContext({
    askingSeat: input.askingSeat,
    normalizedCaps: input.normalizedCaps,
  });
  const assessmentByPlayerId = new Map<string, CertifiedViableAssessment | null>();
  const assess = (player: SnakeRationalPlayer) => {
    if (!assessmentByPlayerId.has(player.playerId)) {
      assessmentByPlayerId.set(player.playerId, assessForAskingClub({
        room: input.room,
        askingSeat: input.askingSeat,
        player,
        normalizedCaps: input.normalizedCaps,
        currentCertificate: input.currentCertificate,
        proofCache: input.proofCache,
        proofFeasibilityKey,
        proofFeasibilityCache,
        economicContext,
      }));
    }
    return assessmentByPlayerId.get(player.playerId) ?? null;
  };
  const needsByTeamId = new Map(input.room.seats.map((seat) => [seat.teamId, canonicalRoleNeeds(seat.roster)]));

  interface RoleScarcitySummary {
    preferredByGroup: Map<string, ViableAssessment>;
    viablePeople: ViableAssessment[];
    clubsStillNeeding: number;
    lowestViableTrueCost: number | null;
    highestViableTrueCost: number | null;
  }

  const requestedRoles = new Set(
    input.askedPlayers.flatMap((player) => applicableRoles(player.shape)),
  );
  const witnessPlayers = input.room.players.filter((player) => (
    [...requestedRoles].some((role) => eligibleForRole(player.shape, role))
  ));
  const witnessCards: SnakeScarcityWitnessCard[] = [];
  for (const player of witnessPlayers) {
    const assessment = assess(player);
    if (assessment) {
      const assignmentDelta = constructiveAssignmentDelta(
        input.currentCertificate.proof,
        assessment.certificate.proof,
        input.currentCertificate.input.clubs,
      );
      if (!assignmentDelta) return null;
      witnessCards.push({
        playerId: player.playerId,
        versionGroupId: deriveVersionGroupId(player),
        trueCost: assessment.trueCost,
        contextualWorth: assessment.contextualWorth,
        finish: { kind: 'VIABLE', assignmentDelta },
      });
      continue;
    }
    const economic = economicAssessmentForAskingClub({
      room: input.room,
      askingSeat: input.askingSeat,
      player,
      normalizedCaps: input.normalizedCaps,
      economicContext,
    });
    const reason = cheapNonviabilityWitness({
      root: input.currentCertificate.input,
      askingTeamId: input.askingSeat.teamId,
      player,
      economic,
    });
    // Solver rejection is not an unsatisfiability proof. Never turn an unproved omission into a
    // smaller scarcity count; close the entire late phase and preserve the exact decision.
    if (!reason) return null;
    witnessCards.push({
      playerId: player.playerId,
      versionGroupId: deriveVersionGroupId(player),
      trueCost: null,
      contextualWorth: null,
      finish: { kind: 'NONVIABLE', reason },
    });
  }
  const summaryByRole = new Map<SnakeCanonicalRole, RoleScarcitySummary>();
  const witnessRoles: SnakeScarcityWitnessRole[] = [];
  for (const role of ROLE_ORDER) {
    if (!requestedRoles.has(role)) continue;
    const preferredByGroup = new Map<string, ViableAssessment>();
    for (const player of witnessPlayers) {
      if (!eligibleForRole(player.shape, role)) continue;
      const assessment = assess(player);
      if (!assessment) continue;
      const current = preferredByGroup.get(assessment.versionGroupId);
      preferredByGroup.set(
        assessment.versionGroupId,
        current ? preferredVersion(current, assessment) : assessment,
      );
    }
    const viablePeople = [...preferredByGroup.values()].sort((left, right) => (
      right.contextualWorth - left.contextualWorth
      || left.trueCost - right.trueCost
      || left.player.playerId.localeCompare(right.player.playerId)
    ));
    let lowestViableTrueCost: number | null = null;
    let highestViableTrueCost: number | null = null;
    for (const entry of viablePeople) {
      lowestViableTrueCost = lowestViableTrueCost === null
        ? entry.trueCost
        : Math.min(lowestViableTrueCost, entry.trueCost);
      highestViableTrueCost = highestViableTrueCost === null
        ? entry.trueCost
        : Math.max(highestViableTrueCost, entry.trueCost);
    }
    const clubsStillNeeding = [...needsByTeamId.values()].filter((roles) => roles.has(role)).length;
    summaryByRole.set(role, {
      preferredByGroup,
      viablePeople,
      clubsStillNeeding,
      lowestViableTrueCost,
      highestViableTrueCost,
    });
    witnessRoles.push({ role, clubsStillNeeding });
  }

  const rows = input.askedPlayers.flatMap((target) => applicableRoles(target.shape).map((role): SnakeScarcityRow => {
    const summary = summaryByRole.get(role);
    if (!summary) throw new Error(`Missing scarcity summary for ${role}`);
    const targetGroupId = deriveVersionGroupId(target);
    const targetAssessment = summary.preferredByGroup.get(targetGroupId) ?? null;
    const replacement = summary.viablePeople[0]?.versionGroupId === targetGroupId
      ? summary.viablePeople[1] ?? null
      : summary.viablePeople[0] ?? null;
    return {
      playerId: target.playerId,
      role,
      viablePeopleLeft: summary.viablePeople.length,
      clubsStillNeeding: summary.clubsStillNeeding,
      lowestViableTrueCost: summary.lowestViableTrueCost,
      highestViableTrueCost: summary.highestViableTrueCost,
      targetContextualWorth: targetAssessment?.contextualWorth ?? null,
      replacementPlayerId: replacement?.player.playerId ?? null,
      replacementContextualWorth: replacement?.contextualWorth ?? null,
      contextualWorthDrop: targetAssessment && replacement
        ? targetAssessment.contextualWorth - replacement.contextualWorth
        : null,
      replacementState: replacement ? 'AVAILABLE' : 'NO_REPLACEMENT',
    };
  }));
  return { rows, witnessCards, witnessRoles };
}

function runtimeRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function stableEqual(left: unknown, right: unknown): boolean {
  try {
    return stableWitnessSerialization(left) === stableWitnessSerialization(right);
  } catch {
    return false;
  }
}

function validateConstructiveAssignmentDeltaAgainstRoot(input: {
  root: SimultaneousSnakeSeatingInput;
  rootProof: SnakeSeatingProof;
  postPick: SimultaneousSnakeSeatingInput;
  askingTeamId: string;
  selectedGroupId: string;
  assignmentDelta: readonly SnakeScarcityAssignmentDelta[];
}): boolean {
  try {
    const rootAssignments = new Map(input.rootProof.assignments.map((assignment) => [
      assignment.teamId,
      assignment,
    ]));
    const deltaByTeamId = new Map<string, SnakeSeatingAssignment>();
    for (const compact of input.assignmentDelta) {
      const root = rootAssignments.get(compact.teamId);
      if (!root || deltaByTeamId.has(compact.teamId)) return false;
      const removed = new Set(compact.removePlayerIds);
      const added = new Set(compact.addPlayerIds);
      if (removed.size !== compact.removePlayerIds.length || added.size !== compact.addPlayerIds.length
        || compact.removePlayerIds.some((playerId) => !root.playerIds.includes(playerId))
        || compact.addPlayerIds.some((playerId) => root.playerIds.includes(playerId) && !removed.has(playerId))) {
        return false;
      }
      const playerIds = [
        ...root.playerIds.filter((playerId) => !removed.has(playerId)),
        ...compact.addPlayerIds,
      ];
      if (playerIds.length === root.playerIds.length && stableEqual(playerIds, root.playerIds)
        && compact.salaryCost === root.salaryCost && compact.addedTax === root.addedTax
        && compact.allInCost === root.allInCost) return false;
      deltaByTeamId.set(compact.teamId, {
        teamId: compact.teamId,
        playerIds,
        salaryCost: compact.salaryCost,
        addedTax: compact.addedTax,
        allInCost: compact.allInCost,
      });
    }
    if (rootAssignments.size !== input.root.clubs.length
      || deltaByTeamId.size !== input.assignmentDelta.length
      || !deltaByTeamId.has(input.askingTeamId)) return false;
    const rootPlayerById = new Map(input.root.pool.map((player) => [player.playerId, player]));
    let rootOwnerTeamId: string | null = null;
    for (const assignment of input.rootProof.assignments) {
      for (const playerId of assignment.playerIds) {
        const player = rootPlayerById.get(playerId);
        if (player && deriveVersionGroupId(player) === input.selectedGroupId) {
          if (rootOwnerTeamId !== null) return false;
          rootOwnerTeamId = assignment.teamId;
        }
      }
    }
    if (rootOwnerTeamId && !deltaByTeamId.has(rootOwnerTeamId)) return false;

    const postCommittedGroups = new Set(input.postPick.clubs.flatMap((club) => (
      club.roster.map(deriveVersionGroupId)
    )));
    const postAvailableById = new Map(input.postPick.pool
      .filter((player) => !postCommittedGroups.has(deriveVersionGroupId(player)))
      .map((player) => [player.playerId, player]));
    const usedIds = new Set<string>();
    const usedGroups = new Set<string>();
    const normalizedCaps = snakeLuxuryCaps([...input.postPick.baseCaps]);

    for (const club of input.postPick.clubs) {
      const assignment = deltaByTeamId.get(club.teamId) ?? rootAssignments.get(club.teamId);
      if (!assignment) return false;
      if (!deltaByTeamId.has(club.teamId)) {
        // The only changed public club is the asker, and the only newly unavailable reservation
        // owner is the selected group owner. Every other root assignment remains exact by the
        // already-verified root proof.
        if (club.teamId === input.askingTeamId || club.teamId === rootOwnerTeamId) return false;
        for (const playerId of assignment.playerIds) {
          const player = rootPlayerById.get(playerId);
          if (!player) return false;
          const groupId = deriveVersionGroupId(player);
          if (postCommittedGroups.has(groupId) || usedIds.has(playerId) || usedGroups.has(groupId)) return false;
          usedIds.add(playerId);
          usedGroups.add(groupId);
        }
        continue;
      }

      if (assignment.playerIds.length !== LEGAL_ROSTER.size - club.roster.length) return false;
      const future = assignment.playerIds.map((playerId) => postAvailableById.get(playerId));
      if (future.some((player) => !player)) return false;
      const players = future as SnakeSeatingPlayer[];
      for (const player of players) {
        const groupId = deriveVersionGroupId(player);
        if (usedIds.has(player.playerId) || usedGroups.has(groupId)) return false;
        usedIds.add(player.playerId);
        usedGroups.add(groupId);
      }
      if (!isLegalRoster([...club.roster, ...players].map((player) => player.shape))) return false;
      const shiftedCaps = club.capIdentity
        ? shiftLuxuryCaps([...normalizedCaps], club.capIdentity)
        : [...normalizedCaps];
      const committed = club.committedConstruction
        ? [...club.committedConstruction]
        : club.roster.map((player) => player.construction);
      const currentTax = luxuryTax(committed, shiftedCaps, 'taxed').charged;
      const finalTax = luxuryTax(
        [...committed, ...players.map((player) => player.construction)],
        shiftedCaps,
        'taxed',
      ).charged;
      const salaryCost = players.reduce((sum, player) => sum + player.price, 0);
      const addedTax = finalTax - currentTax;
      const allInCost = salaryCost + addedTax;
      if (!Number.isFinite(allInCost)
        || Math.abs(assignment.salaryCost - salaryCost) > 1e-6
        || Math.abs(assignment.addedTax - addedTax) > 1e-6
        || Math.abs(assignment.allInCost - allInCost) > 1e-6
        || !snakeMoneyAffordable(allInCost, club.budgetRemaining)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Cheap UI-side proof check. Authentication binds transport identity; semantic trust comes from
 * independently verifying the root legal-finish certificate and every viable candidate's exact
 * constructive delta. Null cards must carry a recomputable necessary rejection. No seating search
 * or repair runs here.
 */
export function validateSnakeScarcityWitness(input: {
  requestKey: string;
  witnessSecret: string;
  room: PlaySnakeRationalRoomInput;
  nextPick: number;
  risks: readonly SnakeRiskRow[];
  scenarios: readonly SnakeRationalScenario[];
  scarcity: readonly SnakeScarcityRow[];
  witness: unknown;
}): input is typeof input & { witness: SnakeScarcityWitness } {
  try {
    const witness = runtimeRecord(input.witness);
    if (!witness || !exactKeys(witness, [
      'schemaVersion', 'requestKey', 'decision', 'rootProof', 'cards', 'rowIdentities', 'roles', 'authTag',
    ]) || witness.schemaVersion !== 2 || witness.requestKey !== input.requestKey
      || typeof witness.authTag !== 'string' || !Array.isArray(witness.rowIdentities)
      || !Array.isArray(witness.cards) || !Array.isArray(witness.roles)) return false;
    const decision = runtimeRecord(witness.decision);
    if (!decision || !exactKeys(decision, ['nextPick', 'risks', 'scenarios'])
      || decision.nextPick !== input.nextPick || !stableEqual(decision.risks, input.risks)
      || !stableEqual(decision.scenarios, input.scenarios)) return false;
    const payload: SnakeScarcityWitnessPayload = {
      schemaVersion: 2,
      requestKey: witness.requestKey as string,
      decision: decision as unknown as SnakeScarcityWitnessPayload['decision'],
      rootProof: witness.rootProof as SnakeSeatingProof,
      cards: witness.cards as SnakeScarcityWitnessCard[],
      rowIdentities: witness.rowIdentities as SnakeScarcityWitnessPayload['rowIdentities'],
      roles: witness.roles as SnakeScarcityWitnessRole[],
    };
    if (witness.authTag !== snakeScarcityWitnessAuthTag(payload, input.witnessSecret)) return false;

    const playersById = new Map(input.room.players.map((player) => [player.playerId, player]));
    const askedPlayers = input.room.askedPlayerIds.map((playerId) => playersById.get(playerId) ?? null);
    if (askedPlayers.some((player) => player === null)) return false;
    const expectedRowIdentities = askedPlayers.flatMap((player) => (
      applicableRoles(player!.shape).map((role) => ({ playerId: player!.playerId, role }))
    ));
    if (!stableEqual(witness.rowIdentities, expectedRowIdentities)) return false;
    const requestedRoles = ROLE_ORDER.filter((role) => expectedRowIdentities.some((row) => row.role === role));
    if (witness.roles.length !== requestedRoles.length) return false;

    const normalizedCaps = snakeLuxuryCaps([...input.room.baseCaps]);
    if (!finiteDeep(normalizedCaps)) return false;
    const askingSeat = input.room.seats.find((seat) => seat.teamId === input.room.askingTeamId);
    if (!askingSeat) return false;
    const economicContext = buildAskingEconomicContext({ askingSeat, normalizedCaps });
    const rootSeats = new Map(input.room.seats.map((seat): [string, MutableSeat] => [seat.teamId, {
      ...seat,
      roster: [...seat.roster],
      settledRosterPrices: [...seat.settledRosterPrices],
    }]));
    const rootInput = buildSharedSeatingInput({
      room: input.room,
      seats: rootSeats,
      available: new Map(input.room.players.map((player) => [player.playerId, player])),
      normalizedCaps,
    });
    const rootProof = witness.rootProof as SnakeSeatingProof;
    if (!rootInput || !validateConstructiveSnakeSeatingProof(rootInput, rootProof)) return false;
    const expectedWitnessPlayers = input.room.players.filter((player) => (
      requestedRoles.some((role) => eligibleForRole(player.shape, role))
    ));
    if (witness.cards.length !== expectedWitnessPlayers.length) return false;
    const viableByPlayerId = new Map<string, ViableAssessment>();
    for (let cardIndex = 0; cardIndex < expectedWitnessPlayers.length; cardIndex += 1) {
      const player = expectedWitnessPlayers[cardIndex];
      const card = runtimeRecord(witness.cards[cardIndex]);
      const groupId = deriveVersionGroupId(player);
      if (!card || !exactKeys(card, [
        'playerId', 'versionGroupId', 'trueCost', 'contextualWorth', 'finish',
      ])
        || card.playerId !== player.playerId || card.versionGroupId !== groupId
        || (card.trueCost === null) !== (card.contextualWorth === null)
        || (card.trueCost !== null && (typeof card.trueCost !== 'number' || !Number.isFinite(card.trueCost)))
        || (card.contextualWorth !== null
          && (typeof card.contextualWorth !== 'number' || !Number.isFinite(card.contextualWorth)))) return false;
      const economic = economicAssessmentForAskingClub({
        room: input.room,
        askingSeat,
        player,
        normalizedCaps,
        economicContext,
      });
      const finish = runtimeRecord(card.finish);
      if (card.trueCost === null || card.contextualWorth === null) {
        if (!finish || !exactKeys(finish, ['kind', 'reason']) || finish.kind !== 'NONVIABLE') return false;
        const reason = cheapNonviabilityWitness({
          root: rootInput,
          askingTeamId: askingSeat.teamId,
          player,
          economic,
        });
        if (!reason || !stableEqual(finish.reason, reason)) return false;
        continue;
      }
      if (!economic || economic.trueCost !== card.trueCost
        || economic.contextualWorth !== card.contextualWorth
        || !finish || !exactKeys(finish, ['kind', 'assignmentDelta'])
        || finish.kind !== 'VIABLE' || !Array.isArray(finish.assignmentDelta)) return false;
      const assignmentDelta: SnakeScarcityAssignmentDelta[] = [];
      let priorClubIndex = -1;
      for (const rawDelta of finish.assignmentDelta) {
        const delta = runtimeRecord(rawDelta);
        if (!delta || !exactKeys(delta, [
          'teamId', 'removePlayerIds', 'addPlayerIds', 'salaryCost', 'addedTax', 'allInCost',
        ]) || typeof delta.teamId !== 'string' || !Array.isArray(delta.removePlayerIds)
          || !Array.isArray(delta.addPlayerIds)
          || delta.removePlayerIds.some((playerId) => typeof playerId !== 'string')
          || delta.addPlayerIds.some((playerId) => typeof playerId !== 'string')
          || !Number.isFinite(delta.salaryCost) || !Number.isFinite(delta.addedTax)
          || !Number.isFinite(delta.allInCost)) return false;
        const clubIndex = rootInput.clubs.findIndex((club) => club.teamId === delta.teamId);
        if (clubIndex <= priorClubIndex) return false;
        priorClubIndex = clubIndex;
        if (!rootProof.assignments.some((row) => row.teamId === delta.teamId)) return false;
        const additions = delta.addPlayerIds as string[];
        if (!stableEqual(additions, [...additions].sort((left, right) => left.localeCompare(right)))) return false;
        assignmentDelta.push(delta as unknown as SnakeScarcityAssignmentDelta);
      }
      const postPick = postPickSeatingInput({
        root: rootInput,
        askingTeamId: askingSeat.teamId,
        player,
        trueCost: economic.trueCost,
      });
      if (!postPick || !validateConstructiveAssignmentDeltaAgainstRoot({
        root: rootInput,
        rootProof,
        postPick,
        askingTeamId: askingSeat.teamId,
        selectedGroupId: groupId,
        assignmentDelta,
      })) return false;
      viableByPlayerId.set(player.playerId, economic);
    }

    const needsByTeamId = new Map(input.room.seats.map((seat) => [
      seat.teamId,
      canonicalRoleNeeds(seat.roster),
    ]));
    const summaryByRole = new Map<SnakeCanonicalRole, {
      preferredByGroup: Map<string, ViableAssessment>;
      viablePeople: ViableAssessment[];
      clubsStillNeeding: number;
      lowestViableTrueCost: number | null;
      highestViableTrueCost: number | null;
    }>();

    for (let roleIndex = 0; roleIndex < requestedRoles.length; roleIndex += 1) {
      const expectedRole = requestedRoles[roleIndex];
      const rawRole = runtimeRecord(witness.roles[roleIndex]);
      if (!rawRole || !exactKeys(rawRole, ['role', 'clubsStillNeeding'])
        || rawRole.role !== expectedRole || !Number.isInteger(rawRole.clubsStillNeeding)
        || Number(rawRole.clubsStillNeeding) < 0) return false;
      const clubsStillNeeding = [...needsByTeamId.values()].filter((roles) => roles.has(expectedRole)).length;
      if (rawRole.clubsStillNeeding !== clubsStillNeeding) return false;
      const preferredByGroup = new Map<string, ViableAssessment>();
      for (const player of expectedWitnessPlayers) {
        if (!eligibleForRole(player.shape, expectedRole)) continue;
        const economic = viableByPlayerId.get(player.playerId);
        if (!economic) continue;
        const groupId = deriveVersionGroupId(player);
        const current = preferredByGroup.get(groupId);
        preferredByGroup.set(groupId, current ? preferredVersion(current, economic) : economic);
      }
      const viablePeople = [...preferredByGroup.values()].sort((left, right) => (
        right.contextualWorth - left.contextualWorth
        || left.trueCost - right.trueCost
        || left.player.playerId.localeCompare(right.player.playerId)
      ));
      const costs = viablePeople.map((entry) => entry.trueCost);
      summaryByRole.set(expectedRole, {
        preferredByGroup,
        viablePeople,
        clubsStillNeeding,
        lowestViableTrueCost: costs.length > 0 ? Math.min(...costs) : null,
        highestViableTrueCost: costs.length > 0 ? Math.max(...costs) : null,
      });
    }

    const recomputedRows = askedPlayers.flatMap((target) => applicableRoles(target!.shape).map((role): SnakeScarcityRow => {
      const summary = summaryByRole.get(role);
      if (!summary) throw new Error(`Missing witness role ${role}`);
      const targetGroupId = deriveVersionGroupId(target!);
      const targetAssessment = summary.preferredByGroup.get(targetGroupId) ?? null;
      const replacement = summary.viablePeople[0]?.versionGroupId === targetGroupId
        ? summary.viablePeople[1] ?? null
        : summary.viablePeople[0] ?? null;
      return {
        playerId: target!.playerId,
        role,
        viablePeopleLeft: summary.viablePeople.length,
        clubsStillNeeding: summary.clubsStillNeeding,
        lowestViableTrueCost: summary.lowestViableTrueCost,
        highestViableTrueCost: summary.highestViableTrueCost,
        targetContextualWorth: targetAssessment?.contextualWorth ?? null,
        replacementPlayerId: replacement?.player.playerId ?? null,
        replacementContextualWorth: replacement?.contextualWorth ?? null,
        contextualWorthDrop: targetAssessment && replacement
          ? targetAssessment.contextualWorth - replacement.contextualWorth
          : null,
        replacementState: replacement ? 'AVAILABLE' : 'NO_REPLACEMENT',
      };
    }));
    return stableEqual(input.scarcity, recomputedRows);
  } catch {
    return false;
  }
}

interface PreparedSnakeRationalRoom {
  kind: 'ready';
  input: PlaySnakeRationalRoomInput;
  normalizedCaps: readonly LuxuryCapRow[];
  initialCertificate: TrustedSnakeSeatingCertificate;
  proofCache: Map<string, TrustedSnakeSeatingCertificate>;
  askingSeat: SnakeRationalSeat;
  askedPlayers: readonly SnakeRationalPlayer[];
  base: SnakeRationalScenario;
  scenarios: SnakeRationalScenario[];
  risks: SnakeRiskRow[];
  nextPick: number;
  availableHumanCountAfter: number;
}

interface TerminalSnakeRationalRoom {
  kind: 'terminal';
  result: SnakeRationalRoomResult;
}

function terminal(result: SnakeRationalRoomResult): TerminalSnakeRationalRoom {
  return { kind: 'terminal', result };
}

/** Build and validate the shared proof, certificate, and rival ensemble exactly once. */
function prepareSnakeRationalRoom(
  input: PlaySnakeRationalRoomInput,
): PreparedSnakeRationalRoom | TerminalSnakeRationalRoom {
  const invalid = validatePublicInput(input);
  if (invalid) return terminal(unavailableResult(input, invalid));
  const nextAskingIndex = nextAskingPickIndex(input);
  if (nextAskingIndex < 0) return terminal(unavailableResult(input, 'NO_NEXT_ASKING_PICK'));
  const startIndex = simulationStartIndex(input);
  if (startIndex > nextAskingIndex) return terminal(unavailableResult(input, 'PUBLIC_ORDER_INCOMPLETE'));
  const interval = input.pickOrder.slice(startIndex, nextAskingIndex);
  const seatIds = new Set(input.seats.map((seat) => seat.teamId));
  if (interval.some((slot) => !seatIds.has(slot.teamId) || slot.teamId === input.askingTeamId)) {
    return terminal(unavailableResult(input, 'PUBLIC_SEATS_INCOMPLETE'));
  }
  const normalizedCaps = snakeLuxuryCaps([...input.baseCaps]);
  if (!finiteDeep(normalizedCaps)) return terminal(unavailableResult(input, 'NONFINITE_ECONOMICS'));
  const initialSeats = new Map(input.seats.map((seat): [string, MutableSeat] => [seat.teamId, {
    ...seat,
    roster: [...seat.roster],
    settledRosterPrices: [...seat.settledRosterPrices],
  }]));
  const initialAvailable = new Map(input.players.map((player) => [player.playerId, player]));
  const initialSeatingInput = buildSharedSeatingInput({
    room: input,
    seats: initialSeats,
    available: initialAvailable,
    normalizedCaps,
  });
  if (!initialSeatingInput) return terminal(unavailableResult(input, 'NONFINITE_ECONOMICS'));
  const initialProof = proveSimultaneousSnakeSeating(initialSeatingInput);
  if (!initialProof.feasible) return terminal(unavailableResult(input, 'PUBLIC_SHARED_PLAN_INFEASIBLE'));
  const initialCertificate = createTrustedSnakeSeatingCertificate(initialSeatingInput, initialProof);
  if (!initialCertificate) return terminal(unavailableResult(input, 'PUBLIC_SHARED_PLAN_INFEASIBLE'));
  const proofCache = new Map<string, TrustedSnakeSeatingCertificate>();
  const rankingCache = new Map<string, readonly RankedCandidate[]>();
  const choiceCache = new Map<string, readonly FeasibleCandidate[]>();

  const firstPickByRival = new Map<string, number>();
  for (const slot of interval) {
    if (!firstPickByRival.has(slot.teamId)) firstPickByRival.set(slot.teamId, slot.pick);
  }
  const rivalIds = [...firstPickByRival].sort((left, right) => (
    left[1] - right[1] || left[0].localeCompare(right[0])
  )).map(([teamId]) => teamId);
  const definitions: Array<{ id: SnakeScenarioId; secondChoiceTeamId: string | null }> = [
    { id: 'BASE', secondChoiceTeamId: null },
    ...rivalIds.map((teamId) => ({
      id: `RIVAL_SECOND:${teamId}` as const,
      secondChoiceTeamId: teamId,
    })),
  ];
  const scenarios = definitions.map((definition) => simulateScenario({
      room: input,
      ...definition,
      startIndex,
      stopIndex: nextAskingIndex,
      normalizedCaps,
      initialCertificate,
      proofCache,
      rankingCache,
      choiceCache,
  }));
  const base = scenarios[0];
  const validScenarios = scenarios.filter((scenario) => scenario.status === 'valid');
  if (base?.status !== 'valid' || validScenarios.length === 0) {
    return terminal({
      ...unavailableResult(input, 'ZERO_VALID_SCENARIOS'),
      nextPick: input.pickOrder[nextAskingIndex].pick,
      scenarios,
    });
  }

  const playersById = new Map(input.players.map((player) => [player.playerId, player]));
  const nextPick = input.pickOrder[nextAskingIndex].pick;
  const risks = input.askedPlayerIds.map((playerId): SnakeRiskRow => {
    const player = playersById.get(playerId)!;
    const groupId = deriveVersionGroupId(player);
    const selections = validScenarios.map((scenario) => (
      scenario.picks.find((pick) => pick.versionGroupId === groupId) ?? null
    ));
    const selected = selections.filter((pick): pick is SnakeRationalPick => Boolean(pick));
    const risk: SnakeRiskRead = selected.length === 0
      ? 'SAFE_TO_WAIT'
      : selected.length === validScenarios.length
        ? 'LIKELY_GONE'
        : 'AT_RISK';
    const interestedClubCount = new Set(selected.map((pick) => pick.teamId)).size;
    const baseSelection = base.picks.find((pick) => pick.versionGroupId === groupId) ?? null;
    return {
      playerId,
      risk,
      nextPick,
      earliestSelectingPick: selected.length > 0 ? Math.min(...selected.map((pick) => pick.pick)) : null,
      latestSelectingPick: selected.length === validScenarios.length
        ? Math.max(...selected.map((pick) => pick.pick))
        : nextPick,
      latestSelectingPickIsAskingTurn: selected.length !== validScenarios.length,
      interestedClubCount,
      draftedAtPick: baseSelection?.pick ?? null,
      rationalBuyersBeforeTurn: interestedClubCount,
    };
  });
  const askingSeat = input.seats.find((seat) => seat.teamId === input.askingTeamId)!;
  const askedPlayers = input.askedPlayerIds.map((playerId) => playersById.get(playerId)!);
  const baseAvailableGroups = new Set(input.players.map(deriveVersionGroupId));
  for (const pick of base.picks) baseAvailableGroups.delete(pick.versionGroupId);
  return {
    kind: 'ready',
    input,
    normalizedCaps,
    initialCertificate,
    proofCache,
    askingSeat,
    askedPlayers,
    base,
    scenarios,
    risks,
    nextPick,
    availableHumanCountAfter: baseAvailableGroups.size,
  };
}

function decisionResult(prepared: PreparedSnakeRationalRoom): SnakeRationalRoomResult {
  return {
    status: 'ready',
    unavailableReason: null,
    askingTeamId: prepared.input.askingTeamId,
    nextPick: prepared.nextPick,
    scenarios: prepared.scenarios,
    playout: prepared.base.picks,
    risks: prepared.risks,
    scarcity: [],
    scarcityWitness: null,
    availableHumanCountAfter: prepared.availableHumanCountAfter,
  };
}

/**
 * Deterministic public-information ensemble with an optional progressive decision seam. BASE is
 * canonical; every other scenario changes only one rival's first intervening choice to its second
 * legal/affordable/completion-safe option. The decision listener runs after the one shared ensemble
 * is complete and before scarcity continues from that same certificate and proof cache.
 */
export function playSnakeRationalRoomProgressively(
  input: PlaySnakeRationalRoomInput,
  onDecision?: SnakeRationalDecisionListener,
  witnessBinding?: SnakeScarcityWitnessBinding,
): SnakeRationalRoomResult {
  const prepared = prepareSnakeRationalRoom(input);
  if (prepared.kind === 'terminal') return prepared.result;
  const decision = decisionResult(prepared);
  if (input.includeScarcity === false) return decision;
  onDecision?.(decision);
  const scarcity = buildScarcityRows({
    room: prepared.input,
    askedPlayers: prepared.askedPlayers,
    askingSeat: prepared.askingSeat,
    normalizedCaps: prepared.normalizedCaps,
    currentCertificate: prepared.initialCertificate,
    proofCache: prepared.proofCache,
  });
  if (!scarcity) return unavailableResult(prepared.input, 'SCARCITY_PROOF_UNAVAILABLE');
  let scarcityWitness: SnakeScarcityWitness | null = null;
  if (witnessBinding?.requestKey && /^[0-9a-f]{64}$/i.test(witnessBinding.witnessSecret)) {
    const payload: SnakeScarcityWitnessPayload = {
      schemaVersion: 2,
      requestKey: witnessBinding.requestKey,
      decision: {
        nextPick: decision.nextPick!,
        risks: decision.risks,
        scenarios: decision.scenarios,
      },
      rootProof: prepared.initialCertificate.proof,
      cards: scarcity.witnessCards,
      rowIdentities: scarcity.rows.map((row) => ({ playerId: row.playerId, role: row.role })),
      roles: scarcity.witnessRoles,
    };
    scarcityWitness = {
      ...payload,
      authTag: snakeScarcityWitnessAuthTag(payload, witnessBinding.witnessSecret),
    };
  }
  return { ...decision, scarcity: scarcity.rows, scarcityWitness };
}

/** Synchronous compatibility API. */
export function playSnakeRationalRoom(input: PlaySnakeRationalRoomInput): SnakeRationalRoomResult {
  return playSnakeRationalRoomProgressively(input);
}
