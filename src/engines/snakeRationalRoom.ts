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
import {
  auctionMarginalTaxWithCaps,
  computeAuctionTeamProjectedTaxWithCaps,
  normalizeAuctionLuxuryCapsForLeagueSize,
} from './auctionLuxuryTax';
import { computeOwnValue } from './auctionMarketModel';
import {
  luxuryTax,
  shiftLuxuryCaps,
  type Band,
  type BandPriorities,
  type TeamCapIdentity,
} from './leagueConstruction';
import { rosterNeedBreakdown } from './rosterNeed';
import {
  proveSnakePickKeepsAllClubsSeated,
  proveSimultaneousSnakeSeating,
  type SimultaneousSnakeSeatingInput,
  type SnakeSeatingPlayer,
  type SnakeSeatingProof,
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
  proof: SnakeSeatingProof;
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
      roster: seat.roster,
      budgetRemaining: seat.budget - seat.committedSpent - currentTax,
      committedConstruction: seat.roster.map((entry) => entry.construction),
      capIdentity: seat.capIdentity,
    };
  });
  if (clubs.some((club) => club === null)) return null;
  return {
    clubs: clubs as NonNullable<(typeof clubs)[number]>[],
    pool: [...input.available.values()],
    baseCaps: input.room.baseCaps,
    realTeamCount: input.room.realTeamCount,
  };
}

function proveSharedCandidate(input: {
  seatingInput: SimultaneousSnakeSeatingInput;
  currentProof: SnakeSeatingProof;
  teamId: string;
  player: SnakeRationalPlayer;
  allInCost: number;
  stateKey: string;
  proofCache: Map<string, SnakeSeatingProof>;
}): SnakeSeatingProof | null {
  if (!Number.isFinite(input.allInCost) || input.allInCost < 0) return null;
  const key = `${input.stateKey}::${input.teamId}::${input.player.playerId}::${input.allInCost}`;
  const cached = input.proofCache.get(key);
  if (cached) return cached;
  try {
    const proof = advanceFinalSeatCertificate(input) ?? proveSnakePickKeepsAllClubsSeated({
      current: input.seatingInput,
      teamId: input.teamId,
      player: input.player,
      allInCost: input.allInCost,
      currentProof: input.currentProof,
    });
    input.proofCache.set(key, proof);
    return proof;
  } catch {
    return null;
  }
}

/**
 * Exact fast path for the common final roster seat. The current proof already gives every club a
 * globally unique legal completion. Replace the selecting club's single future card with the pick,
 * swap that outgoing card to the pick's certificate owner when necessary, and recompute the exact
 * settlement bill for every changed assignment. Anything less direct falls back to the canonical
 * all-club prover above.
 */
function advanceFinalSeatCertificate(input: {
  seatingInput: SimultaneousSnakeSeatingInput;
  currentProof: SnakeSeatingProof;
  teamId: string;
  player: SnakeRationalPlayer;
  allInCost: number;
}): SnakeSeatingProof | null {
  if (!input.currentProof.feasible
    || input.currentProof.assignments.length !== input.seatingInput.clubs.length) return null;
  const clubIndex = input.seatingInput.clubs.findIndex((club) => club.teamId === input.teamId);
  if (clubIndex < 0) return null;
  const selectingClub = input.seatingInput.clubs[clubIndex];
  if (selectingClub.roster.length !== LEGAL_ROSTER.size - 1
    || !isLegalRoster([...selectingClub.roster.map((player) => player.shape), input.player.shape])) return null;
  const assignmentByTeamId = new Map(
    input.currentProof.assignments.map((assignment) => [assignment.teamId, assignment]),
  );
  if (assignmentByTeamId.size !== input.seatingInput.clubs.length) return null;
  const selectingAssignment = assignmentByTeamId.get(input.teamId);
  if (!selectingAssignment || selectingAssignment.playerIds.length !== 1) return null;

  const playerById = new Map(input.seatingInput.pool.map((player) => [player.playerId, player]));
  const selectedGroupId = deriveVersionGroupId(input.player);
  if (!input.seatingInput.pool.some((player) => deriveVersionGroupId(player) === selectedGroupId)) return null;
  if (input.seatingInput.clubs.some((club) => club.roster.some((player) => (
    deriveVersionGroupId(player) === selectedGroupId
  )))) return null;
  const outgoing = playerById.get(selectingAssignment.playerIds[0]);
  if (!outgoing) return null;

  let ownerTeamId: string | null = null;
  let ownerAssignedPlayerId: string | null = null;
  for (const assignment of input.currentProof.assignments) {
    for (const playerId of assignment.playerIds) {
      const player = playerById.get(playerId);
      if (!player || deriveVersionGroupId(player) !== selectedGroupId) continue;
      if (ownerTeamId !== null) return null;
      ownerTeamId = assignment.teamId;
      ownerAssignedPlayerId = playerId;
    }
  }

  const nextPlayerIdsByTeamId = new Map(
    input.currentProof.assignments.map((assignment) => [assignment.teamId, [...assignment.playerIds]]),
  );
  nextPlayerIdsByTeamId.set(input.teamId, []);
  if (ownerTeamId && ownerTeamId !== input.teamId) {
    const ownerIds = nextPlayerIdsByTeamId.get(ownerTeamId);
    const ownerIndex = ownerIds?.indexOf(ownerAssignedPlayerId!) ?? -1;
    if (!ownerIds || ownerIndex < 0) return null;
    ownerIds[ownerIndex] = outgoing.playerId;
  }

  const normalizedCaps = normalizeAuctionLuxuryCapsForLeagueSize(
    [...input.seatingInput.baseCaps],
    input.seatingInput.realTeamCount,
  );
  const bill = (club: SimultaneousSnakeSeatingInput['clubs'][number], future: readonly SnakeSeatingPlayer[]) => {
    const shiftedCaps = club.capIdentity ? shiftLuxuryCaps(normalizedCaps, club.capIdentity) : normalizedCaps;
    const committed = club.committedConstruction
      ? [...club.committedConstruction]
      : club.roster.map((player) => player.construction);
    const currentTax = luxuryTax(committed, shiftedCaps, 'taxed').charged;
    const finalTax = luxuryTax(
      [...committed, ...future.map((player) => player.construction)],
      shiftedCaps,
      'taxed',
    ).charged;
    const salaryCost = future.reduce((sum, player) => sum + player.price, 0);
    const addedTax = Math.max(0, finalTax - currentTax);
    return { salaryCost, addedTax, allInCost: salaryCost + addedTax };
  };

  const assignments: SnakeSeatingProof['assignments'] = [];
  const usedGroups = new Set<string>();
  for (const club of input.seatingInput.clubs) {
    const playerIds = nextPlayerIdsByTeamId.get(club.teamId);
    if (!playerIds) return null;
    const future = playerIds
      .map((playerId) => playerById.get(playerId))
      .filter((player): player is SnakeSeatingPlayer => Boolean(player));
    if (future.length !== playerIds.length) return null;
    const futureGroups = future.map(deriveVersionGroupId);
    if (futureGroups.some((groupId) => groupId === selectedGroupId || usedGroups.has(groupId))) return null;
    futureGroups.forEach((groupId) => usedGroups.add(groupId));
    const finalShapes = club.teamId === input.teamId
      ? [...club.roster.map((player) => player.shape), input.player.shape]
      : [...club.roster.map((player) => player.shape), ...future.map((player) => player.shape)];
    if (finalShapes.length !== LEGAL_ROSTER.size || !isLegalRoster(finalShapes)) return null;
    const postClub = club.teamId === input.teamId ? {
      ...club,
      roster: [...club.roster, input.player],
      budgetRemaining: club.budgetRemaining - input.allInCost,
      committedConstruction: [
        ...(club.committedConstruction ?? club.roster.map((player) => player.construction)),
        input.player.construction,
      ],
    } : club;
    const assignmentBill = bill(postClub, future);
    if (!Number.isFinite(assignmentBill.allInCost)
      || assignmentBill.allInCost > postClub.budgetRemaining + 1e-9) return null;
    assignments.push({ teamId: club.teamId, playerIds, ...assignmentBill });
  }
  return {
    feasible: true,
    assignments,
    shortfall: null,
    message: 'EVERY CLUB CAN FINISH A LEGAL 22.',
  };
}

function feasibleChoices(input: {
  room: PlaySnakeRationalRoomInput;
  seat: MutableSeat;
  available: ReadonlyMap<string, SnakeRationalPlayer>;
  normalizedCaps: readonly LuxuryCapRow[];
  seatingInput: SimultaneousSnakeSeatingInput;
  currentProof: SnakeSeatingProof;
  stateKey: string;
  proofCache: Map<string, SnakeSeatingProof>;
  limit: number;
}): FeasibleCandidate[] | null {
  const taxLambda = input.room.taxLambda ?? SNAKE_RATIONAL_ROOM_TUNING.trueCostDragLambda;
  const need = rosterNeedBreakdown(input.seat.roster.map((entry) => entry.shape));
  const ranked: Array<Omit<FeasibleCandidate, 'proof'> & { allInCost: number }> = [];
  for (const player of input.available.values()) {
    const taxAfterCandidate = computeAuctionTeamProjectedTaxWithCaps(
      input.seat.roster.map((entry) => entry.construction),
      player.construction,
      input.seat.capIdentity,
      [...input.normalizedCaps],
    );
    const budgetAfterCandidate = input.seat.budget - input.seat.committedSpent - player.price - taxAfterCandidate;
    if (!Number.isFinite(budgetAfterCandidate) || budgetAfterCandidate < 0) continue;
    const fitWorth = computeOwnValue({
      iv: player.worth,
      archetypeWeights: player.archetypeWeights,
      ownBandPriorities: input.seat.lockedArchetype,
      needBreakdown: need,
      shape: player.shape,
      openSlots: LEGAL_ROSTER.size - input.seat.roster.length,
    });
    const marginalTax = auctionMarginalTaxWithCaps(
      input.seat.roster.map((entry) => entry.construction),
      player.construction,
      input.seat.capIdentity,
      [...input.normalizedCaps],
    );
    const interest = fitWorth - taxLambda * marginalTax;
    if (!Number.isFinite(interest)) return null;
    ranked.push({ player, interest, allInCost: player.price + marginalTax });
  }
  ranked.sort((left, right) => (
    right.interest - left.interest || left.player.playerId.localeCompare(right.player.playerId)
  ));

  const feasible: FeasibleCandidate[] = [];
  const feasibleGroups = new Set<string>();
  for (const candidate of ranked) {
    const groupId = deriveVersionGroupId(candidate.player);
    if (feasibleGroups.has(groupId)) continue;
    const proof = proveSharedCandidate({
      seatingInput: input.seatingInput,
      currentProof: input.currentProof,
      teamId: input.seat.teamId,
      player: candidate.player,
      allInCost: candidate.allInCost,
      stateKey: input.stateKey,
      proofCache: input.proofCache,
    });
    if (!proof?.feasible) continue;
    feasibleGroups.add(groupId);
    feasible.push({ player: candidate.player, interest: candidate.interest, proof });
    if (feasible.length >= input.limit) break;
  }
  return feasible;
}

function simulateScenario(input: {
  room: PlaySnakeRationalRoomInput;
  id: SnakeScenarioId;
  secondChoiceTeamId: string | null;
  startIndex: number;
  stopIndex: number;
  normalizedCaps: readonly LuxuryCapRow[];
  initialProof: SnakeSeatingProof;
  proofCache: Map<string, SnakeSeatingProof>;
}): SnakeRationalScenario {
  const available = new Map(input.room.players.map((player) => [player.playerId, player]));
  const seats = new Map(input.room.seats.map((seat): [string, MutableSeat] => [seat.teamId, {
    ...seat,
    roster: [...seat.roster],
    settledRosterPrices: [...seat.settledRosterPrices],
  }]));
  const picks: SnakeRationalPick[] = [];
  let sensitivityApplied = false;
  let currentProof = input.initialProof;

  try {
    for (let pickIndex = input.startIndex; pickIndex < input.stopIndex; pickIndex += 1) {
      const slot = input.room.pickOrder[pickIndex];
      const seat = slot ? seats.get(slot.teamId) : null;
      if (!slot || !seat || seat.roster.length >= LEGAL_ROSTER.size) {
        return { id: input.id, status: 'invalid', picks: [] };
      }
      const seatingInput = buildSharedSeatingInput({
        room: input.room,
        seats,
        available,
        normalizedCaps: input.normalizedCaps,
      });
      if (!seatingInput || !currentProof.feasible) return { id: input.id, status: 'invalid', picks: [] };
      const useSecond = !sensitivityApplied && input.secondChoiceTeamId === slot.teamId;
      const stateKey = picks.map((pick) => `${pick.teamId}=${pick.playerId}`).join('|') || 'ROOT';
      const choices = feasibleChoices({
        room: input.room,
        seat,
        available,
        normalizedCaps: input.normalizedCaps,
        seatingInput,
        currentProof,
        stateKey,
        proofCache: input.proofCache,
        limit: useSecond ? 2 : 1,
      });
      if (!choices || choices.length < (useSecond ? 2 : 1)) {
        return { id: input.id, status: 'invalid', picks: [] };
      }
      const choice = choices[useSecond ? 1 : 0];
      currentProof = choice.proof;
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

function assessForAskingClub(input: {
  room: PlaySnakeRationalRoomInput;
  askingSeat: SnakeRationalSeat;
  player: SnakeRationalPlayer;
  normalizedCaps: readonly LuxuryCapRow[];
  seatingInput: SimultaneousSnakeSeatingInput;
  currentProof: SnakeSeatingProof;
  proofCache: Map<string, SnakeSeatingProof>;
  proofFeasibilityKey?: (player: SnakeRationalPlayer, allInCost: number) => string;
  proofFeasibilityCache?: Map<string, boolean>;
}): ViableAssessment | null {
  if (input.askingSeat.roster.length >= LEGAL_ROSTER.size) return null;
  const taxAfterCandidate = computeAuctionTeamProjectedTaxWithCaps(
    input.askingSeat.roster.map((entry) => entry.construction),
    input.player.construction,
    input.askingSeat.capIdentity,
    [...input.normalizedCaps],
  );
  const budgetAfterCandidate = input.askingSeat.budget
    - input.askingSeat.committedSpent
    - input.player.price
    - taxAfterCandidate;
  if (!Number.isFinite(budgetAfterCandidate) || budgetAfterCandidate < 0) return null;
  const marginalTax = auctionMarginalTaxWithCaps(
    input.askingSeat.roster.map((entry) => entry.construction),
    input.player.construction,
    input.askingSeat.capIdentity,
    [...input.normalizedCaps],
  );
  const groupId = deriveVersionGroupId(input.player);
  const trueCost = input.player.price + marginalTax;
  const proofFeasibilityKey = input.proofFeasibilityKey?.(input.player, trueCost);
  let finishFeasible = proofFeasibilityKey === undefined
    ? undefined
    : input.proofFeasibilityCache?.get(proofFeasibilityKey);
  if (finishFeasible === undefined) {
    finishFeasible = Boolean(proveSharedCandidate({
      seatingInput: input.seatingInput,
      currentProof: input.currentProof,
      teamId: input.askingSeat.teamId,
      player: input.player,
      allInCost: trueCost,
      stateKey: 'ROOT',
      proofCache: input.proofCache,
    })?.feasible);
    if (proofFeasibilityKey !== undefined) {
      input.proofFeasibilityCache?.set(proofFeasibilityKey, finishFeasible);
    }
  }
  if (!finishFeasible) return null;
  const contextualWorth = computeOwnValue({
    iv: input.player.worth,
    archetypeWeights: input.player.archetypeWeights,
    ownBandPriorities: input.askingSeat.lockedArchetype,
    needBreakdown: rosterNeedBreakdown(input.askingSeat.roster.map((entry) => entry.shape)),
    shape: input.player.shape,
    openSlots: LEGAL_ROSTER.size - input.askingSeat.roster.length,
  });
  if (!Number.isFinite(contextualWorth) || !Number.isFinite(trueCost)) return null;
  return { player: input.player, versionGroupId: groupId, trueCost, contextualWorth };
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
  seatingInput: SimultaneousSnakeSeatingInput;
  currentProof: SnakeSeatingProof;
  proofCache: Map<string, SnakeSeatingProof>;
}): SnakeScarcityRow[] {
  const proofOwnerByGroup = new Map<string, string>();
  const playerById = new Map(input.seatingInput.pool.map((player) => [player.playerId, player]));
  for (const assignment of input.currentProof.assignments) {
    for (const playerId of assignment.playerIds) {
      const player = playerById.get(playerId);
      if (player) proofOwnerByGroup.set(deriveVersionGroupId(player), assignment.teamId);
    }
  }
  const committedOwnerByGroup = new Map<string, string>();
  for (const club of input.seatingInput.clubs) {
    for (const player of club.roster) committedOwnerByGroup.set(deriveVersionGroupId(player), club.teamId);
  }
  const structuralCardSignature = (player: SnakeSeatingPlayer) => JSON.stringify({
    price: player.price,
    shape: player.shape,
    construction: player.construction,
  });
  const structuralGroupSignatures = new Map<string, string[]>();
  for (const player of input.seatingInput.pool) {
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
  const assessmentByPlayerId = new Map<string, ViableAssessment | null>();
  const assess = (player: SnakeRationalPlayer) => {
    if (!assessmentByPlayerId.has(player.playerId)) {
      assessmentByPlayerId.set(player.playerId, assessForAskingClub({
        room: input.room,
        askingSeat: input.askingSeat,
        player,
        normalizedCaps: input.normalizedCaps,
        seatingInput: input.seatingInput,
        currentProof: input.currentProof,
        proofCache: input.proofCache,
        proofFeasibilityKey,
        proofFeasibilityCache,
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
  const summaryByRole = new Map<SnakeCanonicalRole, RoleScarcitySummary>();
  for (const role of ROLE_ORDER) {
    if (!requestedRoles.has(role)) continue;
    const preferredByGroup = new Map<string, ViableAssessment>();
    for (const player of input.room.players) {
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
    summaryByRole.set(role, {
      preferredByGroup,
      viablePeople,
      clubsStillNeeding: [...needsByTeamId.values()].filter((roles) => roles.has(role)).length,
      lowestViableTrueCost,
      highestViableTrueCost,
    });
  }

  return input.askedPlayers.flatMap((target) => applicableRoles(target.shape).map((role): SnakeScarcityRow => {
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
}

/**
 * Deterministic public-information ensemble. BASE is canonical; every other scenario changes only
 * one rival's first intervening choice to its second legal/affordable/completion-safe option.
 */
export function playSnakeRationalRoom(input: PlaySnakeRationalRoomInput): SnakeRationalRoomResult {
  const invalid = validatePublicInput(input);
  if (invalid) return unavailableResult(input, invalid);
  const nextAskingIndex = nextAskingPickIndex(input);
  if (nextAskingIndex < 0) return unavailableResult(input, 'NO_NEXT_ASKING_PICK');
  const startIndex = simulationStartIndex(input);
  if (startIndex > nextAskingIndex) return unavailableResult(input, 'PUBLIC_ORDER_INCOMPLETE');
  const interval = input.pickOrder.slice(startIndex, nextAskingIndex);
  const seatIds = new Set(input.seats.map((seat) => seat.teamId));
  if (interval.some((slot) => !seatIds.has(slot.teamId) || slot.teamId === input.askingTeamId)) {
    return unavailableResult(input, 'PUBLIC_SEATS_INCOMPLETE');
  }
  const normalizedCaps = normalizeAuctionLuxuryCapsForLeagueSize([...input.baseCaps], input.realTeamCount);
  if (!finiteDeep(normalizedCaps)) return unavailableResult(input, 'NONFINITE_ECONOMICS');
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
  if (!initialSeatingInput) return unavailableResult(input, 'NONFINITE_ECONOMICS');
  const initialProof = proveSimultaneousSnakeSeating(initialSeatingInput);
  if (!initialProof.feasible) return unavailableResult(input, 'PUBLIC_SHARED_PLAN_INFEASIBLE');
  const proofCache = new Map<string, SnakeSeatingProof>();

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
    initialProof,
    proofCache,
  }));
  const base = scenarios[0];
  const validScenarios = scenarios.filter((scenario) => scenario.status === 'valid');
  if (base?.status !== 'valid' || validScenarios.length === 0) {
    return {
      ...unavailableResult(input, 'ZERO_VALID_SCENARIOS'),
      nextPick: input.pickOrder[nextAskingIndex].pick,
      scenarios,
    };
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
  const scarcity = buildScarcityRows({
    room: input,
    askedPlayers,
    askingSeat,
    normalizedCaps,
    seatingInput: initialSeatingInput,
    currentProof: initialProof,
    proofCache,
  });

  const baseAvailableGroups = new Set(input.players.map(deriveVersionGroupId));
  for (const pick of base.picks) baseAvailableGroups.delete(pick.versionGroupId);
  return {
    status: 'ready',
    unavailableReason: null,
    askingTeamId: input.askingTeamId,
    nextPick,
    scenarios,
    playout: base.picks,
    risks,
    scarcity,
    availableHumanCountAfter: baseAvailableGroups.size,
  };
}
