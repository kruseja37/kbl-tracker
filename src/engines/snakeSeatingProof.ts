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
import type { LuxuryCapRow } from '../data/tierParams';
import type { TierKey } from '../data/tierParams';
import type { SnakeVersionState } from '../utils/leagueBuilderStorage';
import { snakeLuxuryCaps } from './snakeLuxuryTax';
import {
  cheapestLegalCompletion,
  type CompletionCandidate,
} from './auctionCompletionFloor';
import {
  luxuryTax,
  shiftLuxuryCaps,
  type ConstructionPlayer,
  type TeamCapIdentity,
} from './leagueConstruction';
import { poolDemandModel } from './auctionPoolSizing';
import {
  snakeMoneyAffordable,
  snakeMoneyOverage,
  snakeMoneyRemaining,
} from './snakeMoney';
import {
  deriveHardPositionSupplyFloorTargets,
  derivePositionSupplyFloorTargets,
  matchesPositionSupplyFloor,
  type PositionSupplyFloorKind,
  type PositionSupplyFloorResult,
} from './poolFromDemand';
import { rosterNeedBreakdown } from './rosterNeed';
import {
  buildDefaultDesignSlots,
  isDesignPlayerEligibleForSlot,
  seatAllClubs,
  type DesignPoolPlayer,
} from './rosterDesignFeasibility';
import {
  deriveVersionGroupId,
  unavailableVersionPlayerIds,
  type VersionedPlayerIdentity,
} from './snakeVersioning';
import {
  archetypeFitScorer,
  buildIdentityRoster,
  buildIdentityValueBaseline,
  identityEmbodiment,
  type SimArchetype,
  type SimPlayer,
} from './archetypeBalanceSimulator';

export interface SnakeSeatingPlayer extends VersionedPlayerIdentity {
  price: number;
  shape: RosterSlotPlayer;
  construction: ConstructionPlayer;
}

export interface SnakeSeatingClub {
  teamId: string;
  roster: readonly SnakeSeatingPlayer[];
  /** Remaining all-in budget available from this point forward. */
  budgetRemaining: number;
  committedConstruction?: readonly ConstructionPlayer[];
  capIdentity?: TeamCapIdentity;
  /** Chosen club identity; setup certificates prove all chosen identities simultaneously. */
  identityArchetype?: SimArchetype;
}

export interface SnakeSeatingAssignment {
  teamId: string;
  playerIds: string[];
  salaryCost: number;
  addedTax: number;
  allInCost: number;
}

export interface SnakeSeatingShortfall {
  /** Same base fields as POOLFLOOR's positionFloorReasons, extended for joint/money failures. */
  kind: PositionSupplyFloorKind | 'body-count' | 'joint-assignment' | 'affordability' | 'identity-proof-unknown';
  position: string;
  label: string;
  minimumPerTeam: number;
  teams: number;
  slack: number;
  needed: number;
  available: number;
  missing: number;
  reason: 'position-floor' | 'body-count' | 'joint-assignment' | 'affordability' | 'identity-proof-unknown';
  shortBy: number;
  affectedClubs: number;
  /** Exact club when one club owns the failed proof resource. Omitted for shared supply failures. */
  teamId?: string;
  /** Selected identity name for an identity-certificate failure. */
  identityName?: string;
  /** Exact proof resource that stayed unresolved. UNKNOWN remains UNKNOWN. */
  detail?:
    | 'identity-legal-roster'
    | 'identity-affordability'
    | 'identity-value-floor'
    | 'identity-embodiment'
    | 'identity-joint-assignment'
    | 'roster-composition';
}

export interface SnakeSeatingProof {
  feasible: boolean;
  assignments: SnakeSeatingAssignment[];
  shortfall: SnakeSeatingShortfall | null;
  message: string;
}

export interface SnakeIdentitySupportCertificate {
  readonly version: 1;
  readonly sourceFingerprint: string;
  readonly assignmentFingerprint: string;
  readonly assignments: readonly SnakeSeatingAssignment[];
}

export interface SimultaneousSnakeSeatingInput {
  clubs: readonly SnakeSeatingClub[];
  pool: readonly SnakeSeatingPlayer[];
  /**
   * Immutable selected-source universe for setup identity baselines. Shaped pools search only
   * `pool`, but adding/removing curve filler may not redefine what the chosen identity means.
   */
  identityReferencePool?: readonly SnakeSeatingPlayer[];
  /** Source-bound Full Sources identity certificate retained inside the same shaped-build action. */
  identitySupportCertificate?: SnakeIdentitySupportCertificate;
  baseCaps: readonly LuxuryCapRow[];
  realTeamCount: number;
  tier?: TierKey;
  versionState?: SnakeVersionState;
}

/**
 * Opaque, immutable certificate owned by one semantic seating request. Callers
 * can inspect the constructive truth, but only this module can mint or advance
 * the trust token behind it.
 */
export interface TrustedSnakeSeatingCertificate {
  readonly input: SimultaneousSnakeSeatingInput;
  readonly proof: SnakeSeatingProof;
}

function canonicalCertificateJson(value: unknown): string {
  return JSON.stringify(value, (_key, current) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return current;
    return Object.keys(current as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((sorted, key) => {
        const entry = (current as Record<string, unknown>)[key];
        if (entry !== undefined) sorted[key] = entry;
        return sorted;
      }, {});
  });
}

function compactCertificateFingerprint(value: unknown): string {
  const source = canonicalCertificateJson(value);
  let left = 0x811c9dc5;
  let right = 0x9e3779b9;
  for (let index = 0; index < source.length; index += 1) {
    const code = source.charCodeAt(index);
    left = Math.imul(left ^ code, 0x01000193) >>> 0;
    right = Math.imul(right ^ (code + index), 0x85ebca6b) >>> 0;
  }
  // This is an in-process identity checksum, not a security boundary. Two independent 32-bit
  // streams plus the canonical byte length keep the structured-clone receipt compact.
  return `${source.length.toString(36)}:${left.toString(16).padStart(8, '0')}:${right.toString(16).padStart(8, '0')}`;
}

function identityCertificateSourceFingerprint(input: SimultaneousSnakeSeatingInput): string {
  return `snake-identity-source-v1:${compactCertificateFingerprint({
    ...input,
    pool: input.identityReferencePool ?? input.pool,
    identityReferencePool: undefined,
    identitySupportCertificate: undefined,
  })}`;
}

function identityCertificateAssignmentFingerprint(
  sourceFingerprint: string,
  assignments: readonly SnakeSeatingAssignment[],
): string {
  return `snake-identity-assignments-v1:${compactCertificateFingerprint({
    sourceFingerprint,
    assignments,
  })}`;
}

/** Mint support only after the exact Full Sources proof passes the independent setup validator. */
export function createSnakeIdentitySupportCertificate(
  input: SimultaneousSnakeSeatingInput,
  proof: SnakeSeatingProof,
): SnakeIdentitySupportCertificate | null {
  if (input.identityReferencePool || input.identitySupportCertificate) return null;
  if (!validateConstructiveSnakeSeatingProof(input, proof)) return null;
  const sourceFingerprint = identityCertificateSourceFingerprint(input);
  const assignments = proof.assignments.map((assignment) => ({
    ...assignment,
    playerIds: [...assignment.playerIds],
  }));
  return {
    version: 1,
    sourceFingerprint,
    assignmentFingerprint: identityCertificateAssignmentFingerprint(sourceFingerprint, assignments),
    assignments,
  };
}

export type SnakePickFinishStatus = 'DRAFTABLE' | 'OPEN' | 'BLOCKED';

export interface SnakePickFinishSafetyRow {
  playerId: string;
  status: SnakePickFinishStatus;
  message: string;
  finalSalary: number | null;
  finalTax: number | null;
  moneyLeft: number | null;
}

const TRUSTED_SNAKE_CERTIFICATES = new WeakSet<TrustedSnakeSeatingCertificate>();

interface TrustedSnakeAssignmentOwner {
  teamId: string;
  playerId: string;
}

interface TrustedSnakeOwnerIndex {
  parent: TrustedSnakeOwnerIndex | null;
  changes: ReadonlyMap<string, TrustedSnakeAssignmentOwner | null>;
}

interface TrustedSnakeCertificateIndex {
  /** Stable source-card index. Committed groups are excluded separately. */
  playerById: ReadonlyMap<string, SnakeSeatingPlayer>;
  committedGroups: ReadonlySet<string>;
  owners: TrustedSnakeOwnerIndex;
}

const TRUSTED_SNAKE_CERTIFICATE_INDEX = new WeakMap<
  TrustedSnakeSeatingCertificate,
  TrustedSnakeCertificateIndex
>();

function trustedAssignmentOwner(
  index: TrustedSnakeOwnerIndex,
  groupId: string,
): TrustedSnakeAssignmentOwner | null {
  for (let cursor: TrustedSnakeOwnerIndex | null = index; cursor; cursor = cursor.parent) {
    if (cursor.changes.has(groupId)) return cursor.changes.get(groupId) ?? null;
  }
  return null;
}

function buildRootTrustedIndex(certificate: TrustedSnakeSeatingCertificate): TrustedSnakeCertificateIndex {
  const players = availableCards(certificate.input);
  const playerById = new Map(players.map((player) => [player.playerId, player]));
  const owners = new Map<string, TrustedSnakeAssignmentOwner | null>();
  for (const assignment of certificate.proof.assignments) {
    for (const playerId of assignment.playerIds) {
      const player = playerById.get(playerId);
      if (player) owners.set(deriveVersionGroupId(player), { teamId: assignment.teamId, playerId });
    }
  }
  return {
    playerById,
    committedGroups: new Set(certificate.input.clubs.flatMap((club) => (
      club.roster.map(deriveVersionGroupId)
    ))),
    owners: { parent: null, changes: owners },
  };
}

function trustedCertificateIndex(certificate: TrustedSnakeSeatingCertificate): TrustedSnakeCertificateIndex {
  const cached = TRUSTED_SNAKE_CERTIFICATE_INDEX.get(certificate);
  if (cached) return cached;
  const built = buildRootTrustedIndex(certificate);
  TRUSTED_SNAKE_CERTIFICATE_INDEX.set(certificate, built);
  return built;
}

function buildChildTrustedIndex(input: {
  parent: TrustedSnakeSeatingCertificate;
  childProof: SnakeSeatingProof;
  committedGroupId: string;
}): TrustedSnakeCertificateIndex {
  const parentIndex = trustedCertificateIndex(input.parent);
  const parentByTeamId = new Map(input.parent.proof.assignments.map((assignment) => [
    assignment.teamId,
    assignment,
  ]));
  const changes = new Map<string, TrustedSnakeAssignmentOwner | null>();
  for (const assignment of input.childProof.assignments) {
    const parent = parentByTeamId.get(assignment.teamId);
    if (parent === assignment) continue;
    for (const playerId of parent?.playerIds ?? []) {
      const player = parentIndex.playerById.get(playerId);
      if (player) changes.set(deriveVersionGroupId(player), null);
    }
    for (const playerId of assignment.playerIds) {
      const player = parentIndex.playerById.get(playerId);
      if (player) changes.set(deriveVersionGroupId(player), { teamId: assignment.teamId, playerId });
    }
  }
  const committedGroups = new Set(parentIndex.committedGroups);
  committedGroups.add(input.committedGroupId);
  return {
    playerById: parentIndex.playerById,
    committedGroups,
    owners: { parent: parentIndex.owners, changes },
  };
}

export function proveSnakePickKeepsAllClubsSeated(input: {
  current: SimultaneousSnakeSeatingInput;
  teamId: string;
  player: SnakeSeatingPlayer;
  allInCost: number;
  /** Current constructive certificate; when present, the next certificate advances incrementally. */
  currentProof?: SnakeSeatingProof | null;
}): SnakeSeatingProof {
  const groupId = deriveVersionGroupId(input.player);
  const clubExists = input.current.clubs.some((club) => club.teamId === input.teamId);
  if (!clubExists || !Number.isFinite(input.allInCost)) {
    throw new Error('The proposed snake pick has invalid seating-proof inputs.');
  }
  const postPickInput: SimultaneousSnakeSeatingInput = {
    ...input.current,
    clubs: input.current.clubs.map((club) => club.teamId === input.teamId ? {
      ...club,
      roster: [...club.roster, input.player],
      budgetRemaining: snakeMoneyRemaining(club.budgetRemaining, input.allInCost),
      committedConstruction: [...(club.committedConstruction ?? club.roster.map((row) => row.construction)), input.player.construction],
    } : club),
    pool: input.current.pool.filter((candidate) => deriveVersionGroupId(candidate) !== groupId),
  };
  const advanced = input.currentProof?.feasible
    ? advanceSnakeSeatingCertificate({
      current: input.current,
      postPick: postPickInput,
      proof: input.currentProof,
      teamId: input.teamId,
      player: input.player,
    })
    : null;
  return advanced ?? proveSimultaneousSnakeSeating(postPickInput);
}

function proofRosters(
  input: SimultaneousSnakeSeatingInput,
  proof: SnakeSeatingProof,
): SnakeSeatingPlayer[][] | null {
  if (!proof.feasible || proof.assignments.length !== input.clubs.length) return null;
  const assignmentByTeamId = new Map(proof.assignments.map((assignment) => [assignment.teamId, assignment]));
  if (assignmentByTeamId.size !== input.clubs.length) return null;
  const availableById = new Map(availableCards(input).map((player) => [player.playerId, player]));
  const rosters: SnakeSeatingPlayer[][] = [];
  for (const club of input.clubs) {
    const assignment = assignmentByTeamId.get(club.teamId);
    if (!assignment) return null;
    const future = assignment.playerIds
      .map((playerId) => availableById.get(playerId))
      .filter((player): player is SnakeSeatingPlayer => Boolean(player));
    if (future.length !== assignment.playerIds.length) return null;
    const roster = [...club.roster, ...future];
    if (roster.length !== LEGAL_ROSTER.size || !isLegalRoster(roster.map((player) => player.shape))) return null;
    rosters.push(roster);
  }
  return rosters;
}

/** Lightweight integrity check for a persisted/current constructive certificate. */
export function validateSnakeSeatingProof(
  input: SimultaneousSnakeSeatingInput,
  proof: SnakeSeatingProof,
): boolean {
  if (!validateConstructiveSnakeSeatingProof(input, proof)) return false;
  const rosters = proofRosters(input, proof);
  if (!rosters) return false;
  const available = availableCards(input);
  const assignedIds = new Set(proof.assignments.flatMap((assignment) => assignment.playerIds));
  const assigned = available.filter((player) => assignedIds.has(player.playerId));
  const assignedGroups = new Set(assigned.map(deriveVersionGroupId));
  const representatives = [
    ...assigned,
    ...representativeCards(available.filter((player) => !assignedGroups.has(deriveVersionGroupId(player)))),
  ];
  const verified = repairMatchedRosters(input, representatives, rosters);
  if (!verified) return false;
  const expectedByTeamId = new Map(proof.assignments.map((assignment) => [assignment.teamId, assignment]));
  return verified.every((assignment) => {
    const expected = expectedByTeamId.get(assignment.teamId);
    return Boolean(expected)
      && [...assignment.playerIds].sort().join('|') === [...expected!.playerIds].sort().join('|')
      && Math.abs(assignment.salaryCost - expected!.salaryCost) <= 1e-6
      && Math.abs(assignment.addedTax - expected!.addedTax) <= 1e-6
      && Math.abs(assignment.allInCost - expected!.allInCost) <= 1e-6;
  });
}

/**
 * Independently verify an already-constructed legal-finish certificate without searching for a
 * different seating. This is the worker-to-UI proof seam: it checks exact player availability,
 * version disjointness, canonical 22-player roster law, settlement tax, and every club budget in
 * one linear pass over the supplied assignments. It never calls the seating solver or any repair
 * search, so a UI can cheaply validate many candidate deltas against one root certificate.
 */
export function validateConstructiveSnakeSeatingProof(
  input: SimultaneousSnakeSeatingInput,
  proof: SnakeSeatingProof,
): boolean {
  return validateConstructiveSnakeSeatingProofCore(input, proof, true);
}

/**
 * Live-draft certificate validation. Identity was certified when the pool was locked; after that,
 * pick safety is exact roster law, version disjointness, salary, tax and budget truth. Re-running
 * the setup identity optimizer here would add seconds without changing whether clubs can finish.
 */
export function validateConstructiveSnakeFinishProof(
  input: SimultaneousSnakeSeatingInput,
  proof: SnakeSeatingProof,
): boolean {
  return validateConstructiveSnakeSeatingProofCore(input, proof, false);
}

function validateConstructiveSnakeSeatingProofCore(
  input: SimultaneousSnakeSeatingInput,
  proof: SnakeSeatingProof,
  verifySetupIdentity: boolean,
): boolean {
  try {
    if (!proof || proof.feasible !== true || proof.shortfall !== null
      || proof.assignments.length !== input.clubs.length) return false;
    const assignmentByTeamId = new Map(proof.assignments.map((assignment) => [
      assignment.teamId,
      assignment,
    ]));
    if (assignmentByTeamId.size !== input.clubs.length) return false;

    const availableById = new Map(availableCards(input).map((player) => [player.playerId, player]));
    const fixedPlayers = input.clubs.flatMap((club) => club.roster);
    const fixedIds = new Set(fixedPlayers.map((player) => player.playerId));
    const fixedGroups = new Set(fixedPlayers.map(deriveVersionGroupId));
    if (fixedIds.size !== fixedPlayers.length || fixedGroups.size !== fixedPlayers.length) return false;
    const usedIds = new Set<string>();
    const usedGroups = new Set<string>();
    const normalizedCaps = snakeLuxuryCaps([...input.baseCaps]);
    const finalRosters: SnakeSeatingPlayer[][] = [];

    for (const club of input.clubs) {
      const assignment = assignmentByTeamId.get(club.teamId);
      if (!assignment || assignment.teamId !== club.teamId
        || !Array.isArray(assignment.playerIds)
        || assignment.playerIds.length !== LEGAL_ROSTER.size - club.roster.length
        || !Number.isFinite(assignment.salaryCost)
        || !Number.isFinite(assignment.addedTax)
        || !Number.isFinite(assignment.allInCost)) return false;
      const future = assignment.playerIds.map((playerId) => (
        typeof playerId === 'string' ? availableById.get(playerId) : undefined
      ));
      if (future.some((player) => !player)) return false;
      for (const player of future as SnakeSeatingPlayer[]) {
        const groupId = deriveVersionGroupId(player);
        if (fixedIds.has(player.playerId) || fixedGroups.has(groupId)
          || usedIds.has(player.playerId) || usedGroups.has(groupId)) return false;
        usedIds.add(player.playerId);
        usedGroups.add(groupId);
      }
      const players = future as SnakeSeatingPlayer[];
      const finalRoster = [...club.roster, ...players];
      if (!isLegalRoster(finalRoster.map((player) => player.shape))) return false;
      finalRosters.push(finalRoster);

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
    if (!verifySetupIdentity) return true;
    const identitySourceAvailable = identityReferenceCards(input);
    return input.clubs.every((club, clubIndex) => identityRosterMeetsCanonicalFloor({
      seatingInput: input,
      club,
      roster: finalRosters[clubIndex],
      sourceAvailable: identitySourceAvailable,
    }));
  } catch {
    return false;
  }
}

function deepFreezeTrusted<T>(value: T, seen = new WeakSet<object>()): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  const object = value as object;
  if (seen.has(object)) return value;
  seen.add(object);
  for (const child of Object.values(object)) deepFreezeTrusted(child, seen);
  return Object.freeze(value);
}

function mintTrustedSnakeSeatingCertificate(
  input: SimultaneousSnakeSeatingInput,
  proof: SnakeSeatingProof,
  clone: boolean,
): TrustedSnakeSeatingCertificate {
  const owned = clone
    ? structuredClone({ input, proof })
    : { input, proof };
  const certificate = deepFreezeTrusted({
    input: owned.input,
    proof: owned.proof,
  });
  TRUSTED_SNAKE_CERTIFICATES.add(certificate);
  return certificate;
}

/** Validate an untrusted root exactly once, then detach it from caller mutation. */
export function createTrustedSnakeSeatingCertificate(
  input: SimultaneousSnakeSeatingInput,
  proof: SnakeSeatingProof,
): TrustedSnakeSeatingCertificate | null {
  if (!validateSnakeSeatingProof(input, proof)) return null;
  const certificate = mintTrustedSnakeSeatingCertificate(input, proof, true);
  TRUSTED_SNAKE_CERTIFICATE_INDEX.set(certificate, buildRootTrustedIndex(certificate));
  return certificate;
}

function exactTrustedPickCost(input: {
  seatingInput: SimultaneousSnakeSeatingInput;
  clubIndex: number;
  player: SnakeSeatingPlayer;
  normalizedCaps?: readonly LuxuryCapRow[];
}): number {
  const club = input.seatingInput.clubs[input.clubIndex];
  const normalizedCaps = input.normalizedCaps ?? snakeLuxuryCaps([...input.seatingInput.baseCaps]);
  const shiftedCaps = club.capIdentity
    ? shiftLuxuryCaps([...normalizedCaps], club.capIdentity)
    : [...normalizedCaps];
  const committed = club.committedConstruction
    ? [...club.committedConstruction]
    : club.roster.map((row) => row.construction);
  const currentTax = luxuryTax(committed, shiftedCaps, 'taxed').charged;
  const nextTax = luxuryTax([...committed, input.player.construction], shiftedCaps, 'taxed').charged;
  return input.player.price + (nextTax - currentTax);
}

function directTrustedAdvance(input: {
  certificate: TrustedSnakeSeatingCertificate;
  teamId: string;
  playerId: string;
  allInCost: number;
}): { input: SimultaneousSnakeSeatingInput; proof: SnakeSeatingProof } | null {
  const current = input.certificate.input;
  const clubIndex = current.clubs.findIndex((club) => club.teamId === input.teamId);
  if (clubIndex < 0) return null;
  const trustedIndex = trustedCertificateIndex(input.certificate);
  const selected = trustedIndex.playerById.get(input.playerId);
  if (!selected) return null;
  const selectedGroup = deriveVersionGroupId(selected);
  if (trustedIndex.committedGroups.has(selectedGroup)) return null;
  const normalizedCaps = snakeLuxuryCaps([...current.baseCaps]);
  const exactCost = exactTrustedPickCost({
    seatingInput: current,
    clubIndex,
    player: selected,
    normalizedCaps,
  });
  if (!Number.isFinite(exactCost) || !Number.isFinite(input.allInCost)
    || Math.abs(input.allInCost - exactCost) > 1e-6) return null;

  const targetClub = current.clubs[clubIndex];
  if (targetClub.roster.length >= LEGAL_ROSTER.size) return null;
  const postPick: SimultaneousSnakeSeatingInput = {
    ...current,
    clubs: current.clubs.map((club, index) => index === clubIndex ? {
      ...club,
      roster: [...club.roster, selected],
      budgetRemaining: snakeMoneyRemaining(club.budgetRemaining, exactCost),
      committedConstruction: [
        ...(club.committedConstruction ?? club.roster.map((player) => player.construction)),
        selected.construction,
      ],
    } : club),
    // Keep the immutable source pool shared across trusted children. availableCards removes every
    // committed version group from club rosters, so copying/filtering 500+ cards per simulated
    // pick would change no semantic result.
    pool: current.pool,
  };
  const assignmentByTeamId = new Map(input.certificate.proof.assignments.map((assignment) => [
    assignment.teamId,
    assignment.playerIds,
  ]));
  const parentAssignmentByTeamId = new Map(input.certificate.proof.assignments.map((assignment) => [
    assignment.teamId,
    assignment,
  ]));
  if (assignmentByTeamId.size !== current.clubs.length) return null;
  const targetIds = assignmentByTeamId.get(input.teamId);
  if (!targetIds || targetIds.length !== LEGAL_ROSTER.size - targetClub.roster.length) return null;
  const currentById = trustedIndex.playerById;

  const owner = trustedAssignmentOwner(trustedIndex.owners, selectedGroup);
  const ownerTeamId = owner?.teamId ?? null;
  const ownerPlayerId = owner?.playerId ?? null;
  let unusedCache: SnakeSeatingPlayer[] | null = null;
  const unusedPlayers = () => {
    if (unusedCache) return unusedCache;
    unusedCache = [...currentById.values()]
      .filter((player) => {
        const groupId = deriveVersionGroupId(player);
        return !trustedIndex.committedGroups.has(groupId)
          && trustedAssignmentOwner(trustedIndex.owners, groupId) === null;
      })
      .sort((left, right) => left.price - right.price || left.playerId.localeCompare(right.playerId));
    return unusedCache;
  };
  const billingContextByClubIndex = new Map<number, {
    committed: ConstructionPlayer[];
    shiftedCaps: LuxuryCapRow[];
    currentTax: number;
  }>();
  const directAssignmentBill = (billClubIndex: number, future: readonly SnakeSeatingPlayer[]) => {
    const billClub = postPick.clubs[billClubIndex];
    let context = billingContextByClubIndex.get(billClubIndex);
    if (!context) {
      const shiftedCaps = billClub.capIdentity
        ? shiftLuxuryCaps([...normalizedCaps], billClub.capIdentity)
        : [...normalizedCaps];
      const committed = billClub.committedConstruction
        ? [...billClub.committedConstruction]
        : billClub.roster.map((player) => player.construction);
      context = {
        committed,
        shiftedCaps,
        currentTax: luxuryTax(committed, shiftedCaps, 'taxed').charged,
      };
      billingContextByClubIndex.set(billClubIndex, context);
    }
    const finalTax = luxuryTax(
      [...context.committed, ...future.map((player) => player.construction)],
      context.shiftedCaps,
      'taxed',
    ).charged;
    const salaryCost = future.reduce((sum, player) => sum + player.price, 0);
    const addedTax = finalTax - context.currentTax;
    return { salaryCost, addedTax, allInCost: salaryCost + addedTax };
  };

  const certify = (idsByTeamId: ReadonlyMap<string, readonly string[]>): SnakeSeatingProof | null => {
    // currentById still contains the selected card, but fixedGroups below rejects every committed
    // version. Reusing it avoids rebuilding a 500+ card index for each constructive child.
    const postAvailable = currentById;
    const fixedGroups = new Set(postPick.clubs.flatMap((club) => club.roster.map(deriveVersionGroupId)));
    const workingIds = new Map(idsByTeamId);
    const changedTeamIds = () => new Set(postPick.clubs.flatMap((club) => {
      const parentIds = assignmentByTeamId.get(club.teamId);
      const nextIds = workingIds.get(club.teamId);
      return parentIds === nextIds
        ? []
        : [club.teamId];
    }));
    const constructionExposure = (player: SnakeSeatingPlayer) => {
      const bat = player.construction.bat;
      const pit = player.construction.pit;
      return bat.POW + bat.CON + bat.SPD + bat.FLD + bat.ARM
        + (pit?.VEL ?? 0) + (pit?.JNK ?? 0) + (pit?.ACC ?? 0);
    };
    const futureFor = (clubIndex: number) => {
      const ids = workingIds.get(postPick.clubs[clubIndex].teamId);
      if (!ids) return null;
      const players = ids.map((playerId) => postAvailable.get(playerId));
      return players.some((player) => !player) ? null : players as SnakeSeatingPlayer[];
    };
    const billCache = new Map<string, {
      playerIds: readonly string[];
      bill: Omit<SnakeSeatingAssignment, 'teamId' | 'playerIds'>;
    }>();
    const billFor = (billClubIndex: number, future: readonly SnakeSeatingPlayer[]) => {
      const club = postPick.clubs[billClubIndex];
      const playerIds = workingIds.get(club.teamId);
      const cached = billCache.get(club.teamId);
      if (playerIds && cached?.playerIds === playerIds) return cached.bill;
      const bill = directAssignmentBill(billClubIndex, future);
      if (playerIds) billCache.set(club.teamId, { playerIds, bill });
      return bill;
    };

    // Repair the normal early-draft overage against unused slack without rescanning every club
    // for every trial. Each accepted substitution is exact-bill improving and law preserving;
    // changed reservations are checked below and the full rebuild remains the fail-closed tail.
    for (let round = 0; round < LEGAL_ROSTER.size; round += 1) {
      const changed = changedTeamIds();
      const over = postPick.clubs
        .map((club, clubIndex) => {
          if (!changed.has(club.teamId)) return null;
          const future = futureFor(clubIndex);
          if (!future) return null;
          const bill = billFor(clubIndex, future);
          return { club, clubIndex, future, bill };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
        .filter((row) => !snakeMoneyAffordable(row.bill.allInCost, row.club.budgetRemaining))
        .sort((left, right) => (
          (right.bill.allInCost - right.club.budgetRemaining)
          - (left.bill.allInCost - left.club.budgetRemaining)
          || left.clubIndex - right.clubIndex
        ))[0];
      if (!over) break;
      const assignedGroups = new Set(
        [...workingIds.values()].flatMap((ids) => ids.map((playerId) => {
          const player = postAvailable.get(playerId);
          return player ? deriveVersionGroupId(player) : '';
        })),
      );
      const incoming = [...postAvailable.values()]
        .filter((player) => {
          const groupId = deriveVersionGroupId(player);
          return !fixedGroups.has(groupId) && !assignedGroups.has(groupId);
        })
        .sort((left, right) => (
          (left.price + constructionExposure(left) * 0.1)
          - (right.price + constructionExposure(right) * 0.1)
          || left.playerId.localeCompare(right.playerId)
        ));
      const outgoing = over.future
        .map((player, index) => ({ player, index }))
        .sort((left, right) => (
          (right.player.price + constructionExposure(right.player) * 0.1)
          - (left.player.price + constructionExposure(left.player) * 0.1)
          || left.player.playerId.localeCompare(right.player.playerId)
        ));
      const fullShapes = [...over.club.roster, ...over.future].map((player) => player.shape);
      const hitterCount = fullShapes.filter((shape) => !shape.isPitcher).length;
      const pitcherCount = fullShapes.length - hitterCount;
      const primaryCounts = new Map(LEGAL_ROSTER.fieldPositions.map((position) => [
        position,
        fullShapes.filter((shape) => !shape.isPitcher && shape.position === position).length,
      ]));
      const catcherCount = fullShapes.filter((shape) => canCover(shape, 'C')).length;
      const starterCount = fullShapes.filter(canStart).length;
      const relieverCount = fullShapes.filter(canRelieve).length;
      const closerCount = fullShapes.filter(isCloser).length;
      const preservesRosterLaw = (removed: SnakeSeatingPlayer, replacement: SnakeSeatingPlayer) => {
        const removedShape = removed.shape;
        const replacementShape = replacement.shape;
        const nextHitterCount = hitterCount
          - (removedShape.isPitcher ? 0 : 1)
          + (replacementShape.isPitcher ? 0 : 1);
        const nextPitcherCount = pitcherCount
          - (removedShape.isPitcher ? 1 : 0)
          + (replacementShape.isPitcher ? 1 : 0);
        if (nextHitterCount < LEGAL_ROSTER.minPositionPlayers
          || nextHitterCount > LEGAL_ROSTER.maxPositionPlayers
          || nextPitcherCount < LEGAL_ROSTER.minPitchers
          || nextPitcherCount > LEGAL_ROSTER.maxPitchers) return false;
        if (!removedShape.isPitcher
          && LEGAL_ROSTER.fieldPositions.includes(removedShape.position as FieldPosition)
          && (primaryCounts.get(removedShape.position as FieldPosition) ?? 0) <= 1
          && (replacementShape.isPitcher || replacementShape.position !== removedShape.position)) return false;
        if (catcherCount - (canCover(removedShape, 'C') ? 1 : 0)
          + (canCover(replacementShape, 'C') ? 1 : 0) < LEGAL_ROSTER.minCatchers) return false;
        if (starterCount - (canStart(removedShape) ? 1 : 0)
          + (canStart(replacementShape) ? 1 : 0) < LEGAL_ROSTER.startingPitchers) return false;
        if (relieverCount - (canRelieve(removedShape) ? 1 : 0)
          + (canRelieve(replacementShape) ? 1 : 0) < LEGAL_ROSTER.minRelievers) return false;
        return closerCount - (isCloser(removedShape) ? 1 : 0)
          + (isCloser(replacementShape) ? 1 : 0) >= LEGAL_ROSTER.minClosers;
      };
      let applied = false;
      for (const replacement of incoming) {
        for (const removed of outgoing) {
          if (!preservesRosterLaw(removed.player, replacement)) continue;
          const nextSalaryCost = over.bill.salaryCost - removed.player.price + replacement.price;
          if (nextSalaryCost >= over.bill.allInCost - 1e-9) continue;
          const trial = [...over.future];
          trial[removed.index] = replacement;
          const nextBill = directAssignmentBill(over.clubIndex, trial);
          if (!Number.isFinite(nextBill.allInCost)
            || nextBill.allInCost >= over.bill.allInCost - 1e-9) continue;
          workingIds.set(over.club.teamId, trial.map((player) => player.playerId));
          applied = true;
          break;
        }
        if (applied) break;
      }
      if (!applied) break;
    }

    // The parent certificate is trusted and the pick only mutates the drafting club plus any
    // club whose reservation exchanges the selected card. Reuse untouched assignments exactly;
    // rebuild law, disjointness and the settlement bill only for the changed reservations. This
    // is the hot path used for every simulated intervening pick. Any unexpected shape falls
    // through to the full all-club reconstruction below.
    const changed = changedTeamIds();
    const fastChangedIds = new Set<string>();
    const fastChangedGroups = new Set<string>();
    const fastAssignments = new Map<string, SnakeSeatingAssignment>();
    let fastValid = true;
    for (const club of postPick.clubs) {
      if (changed.has(club.teamId)) continue;
      const parent = parentAssignmentByTeamId.get(club.teamId);
      const playerIds = workingIds.get(club.teamId);
      if (!parent || playerIds !== parent.playerIds) {
        fastValid = false;
        break;
      }
      fastAssignments.set(club.teamId, parent);
    }
    if (fastValid) {
      for (let index = 0; index < postPick.clubs.length; index += 1) {
        const club = postPick.clubs[index];
        if (!changed.has(club.teamId)) continue;
        const playerIds = workingIds.get(club.teamId);
        if (!playerIds || playerIds.length !== LEGAL_ROSTER.size - club.roster.length) {
          fastValid = false;
          break;
        }
        const future = playerIds.map((playerId) => postAvailable.get(playerId));
        if (future.some((player) => !player)) {
          fastValid = false;
          break;
        }
        const players = future as SnakeSeatingPlayer[];
        for (const player of players) {
          const groupId = deriveVersionGroupId(player);
          const parentOwner = trustedAssignmentOwner(trustedIndex.owners, groupId);
          if (fastChangedIds.has(player.playerId)
            || fastChangedGroups.has(groupId)
            || (parentOwner !== null && !changed.has(parentOwner.teamId))
            || fixedGroups.has(groupId)) {
            fastValid = false;
            break;
          }
          fastChangedIds.add(player.playerId);
          fastChangedGroups.add(groupId);
        }
        if (!fastValid || !isLegalRoster([...club.roster, ...players].map((player) => player.shape))) {
          fastValid = false;
          break;
        }
        const bill = billFor(index, players);
        if (!Number.isFinite(bill.allInCost) || !snakeMoneyAffordable(bill.allInCost, club.budgetRemaining)) {
          fastValid = false;
          break;
        }
        fastAssignments.set(club.teamId, { teamId: club.teamId, playerIds: [...playerIds], ...bill });
      }
    }
    if (fastValid && fastAssignments.size === postPick.clubs.length) {
      return {
        feasible: true,
        assignments: postPick.clubs.map((club) => fastAssignments.get(club.teamId)!),
        shortfall: null,
        message: 'EVERY CLUB CAN FINISH A LEGAL 22.',
      };
    }

    const assignedIds = new Set<string>();
    const assignedGroups = new Set<string>();
    const assignments: SnakeSeatingAssignment[] = [];
    const rosterSeeds: SnakeSeatingPlayer[][] = [];
    let requiresBudgetRepair = false;
    for (let index = 0; index < postPick.clubs.length; index += 1) {
      const club = postPick.clubs[index];
      const playerIds = workingIds.get(club.teamId);
      if (!playerIds || playerIds.length !== LEGAL_ROSTER.size - club.roster.length) return null;
      const future = playerIds.map((playerId) => postAvailable.get(playerId));
      if (future.some((player) => !player)) return null;
      const players = future as SnakeSeatingPlayer[];
      for (const player of players) {
        const groupId = deriveVersionGroupId(player);
        if (assignedIds.has(player.playerId) || assignedGroups.has(groupId) || fixedGroups.has(groupId)) return null;
        assignedIds.add(player.playerId);
        assignedGroups.add(groupId);
      }
      const fullRoster = [...club.roster, ...players];
      if (!isLegalRoster(fullRoster.map((player) => player.shape))) return null;
      rosterSeeds.push(fullRoster);
      const bill = billFor(index, players);
      if (!Number.isFinite(bill.allInCost)) return null;
      if (!snakeMoneyAffordable(bill.allInCost, club.budgetRemaining)) requiresBudgetRepair = true;
      assignments.push({ teamId: club.teamId, playerIds: [...playerIds], ...bill });
    }
    if (requiresBudgetRepair) {
      const repaired = repairMatchedRosters(
        postPick,
        representativeCards([...postAvailable.values()]),
        rosterSeeds,
      );
      if (!repaired) return null;
      return {
        feasible: true,
        assignments: repaired,
        shortfall: null,
        message: 'EVERY CLUB CAN FINISH A LEGAL 22.',
      };
    }
    return {
      feasible: true,
      assignments,
      shortfall: null,
      message: 'EVERY CLUB CAN FINISH A LEGAL 22.',
    };
  };

  if (ownerTeamId === input.teamId && ownerPlayerId) {
    const next = new Map(assignmentByTeamId);
    next.set(input.teamId, targetIds.filter((playerId) => playerId !== ownerPlayerId));
    const proof = certify(next);
    return proof ? { input: postPick, proof } : null;
  }

  for (const outgoingId of targetIds) {
    const outgoing = currentById.get(outgoingId);
    if (!outgoing || deriveVersionGroupId(outgoing) === selectedGroup) continue;
    const targetFuture = targetIds
      .filter((playerId) => playerId !== outgoingId)
      .map((playerId) => currentById.get(playerId));
    if (targetFuture.some((player) => !player)
      || !isLegalRoster([
        ...targetClub.roster,
        selected,
        ...(targetFuture as SnakeSeatingPlayer[]),
      ].map((player) => player.shape))) continue;
    const next = new Map(assignmentByTeamId);
    next.set(input.teamId, targetIds.filter((playerId) => playerId !== outgoingId));
    if (ownerTeamId && ownerPlayerId) {
      const ownerIds = assignmentByTeamId.get(ownerTeamId);
      if (!ownerIds) return null;
      const ownerClub = current.clubs.find((club) => club.teamId === ownerTeamId);
      const ownerFuture = ownerIds.map((playerId) => currentById.get(
        playerId === ownerPlayerId ? outgoingId : playerId,
      ));
      if (!ownerClub || ownerFuture.some((player) => !player)
        || !isLegalRoster([
          ...ownerClub.roster,
          ...(ownerFuture as SnakeSeatingPlayer[]),
        ].map((player) => player.shape))) continue;
      next.set(ownerTeamId, ownerIds.map((playerId) => (
        playerId === ownerPlayerId ? outgoingId : playerId
      )));
      const proof = certify(next);
      if (proof) return { input: postPick, proof };

      for (const replacement of unusedPlayers()) {
        const replacementGroup = deriveVersionGroupId(replacement);
        if (replacementGroup === selectedGroup || replacementGroup === deriveVersionGroupId(outgoing)) continue;
        const replacementFuture = ownerIds.map((playerId) => currentById.get(
          playerId === ownerPlayerId ? replacement.playerId : playerId,
        ));
        if (replacementFuture.some((player) => !player)
          || !ownerClub
          || !isLegalRoster([
            ...ownerClub.roster,
            ...(replacementFuture as SnakeSeatingPlayer[]),
          ].map((player) => player.shape))) continue;
        const withUnused = new Map(next);
        withUnused.set(ownerTeamId, ownerIds.map((playerId) => (
          playerId === ownerPlayerId ? replacement.playerId : playerId
        )));
        const replacementProof = certify(withUnused);
        if (replacementProof) return { input: postPick, proof: replacementProof };
      }
      continue;
    }
    const proof = certify(next);
    if (proof) return { input: postPick, proof };
  }
  return null;
}

/**
 * Advance only a certificate minted by this module. The fast path rewrites the
 * constructive reservations directly, preserves trusted unchanged assignments,
 * and rechecks exact law, disjointness and settlement for each changed club.
 * Canonical reproving remains the fail-closed tail.
 */
export function advanceTrustedSnakeSeatingCertificate(input: {
  certificate: TrustedSnakeSeatingCertificate;
  teamId: string;
  playerId: string;
  allInCost: number;
}): TrustedSnakeSeatingCertificate | null {
  if (!TRUSTED_SNAKE_CERTIFICATES.has(input.certificate)) return null;
  const direct = directTrustedAdvance(input);
  if (direct) {
    const selected = trustedCertificateIndex(input.certificate).playerById.get(input.playerId);
    if (!selected) return null;
    const certificate = mintTrustedSnakeSeatingCertificate(direct.input, direct.proof, false);
    TRUSTED_SNAKE_CERTIFICATE_INDEX.set(certificate, buildChildTrustedIndex({
      parent: input.certificate,
      childProof: direct.proof,
      committedGroupId: deriveVersionGroupId(selected),
    }));
    return certificate;
  }

  const current = input.certificate.input;
  const selected = availableCards(current).find((player) => player.playerId === input.playerId);
  const clubIndex = current.clubs.findIndex((club) => club.teamId === input.teamId);
  if (!selected || clubIndex < 0) return null;
  const exactCost = exactTrustedPickCost({ seatingInput: current, clubIndex, player: selected });
  if (!Number.isFinite(input.allInCost) || Math.abs(input.allInCost - exactCost) > 1e-6) return null;
  const groupId = deriveVersionGroupId(selected);
  const postPick: SimultaneousSnakeSeatingInput = {
    ...current,
    clubs: current.clubs.map((club, index) => index === clubIndex ? {
      ...club,
      roster: [...club.roster, selected],
      budgetRemaining: snakeMoneyRemaining(club.budgetRemaining, exactCost),
      committedConstruction: [
        ...(club.committedConstruction ?? club.roster.map((player) => player.construction)),
        selected.construction,
      ],
    } : club),
    pool: current.pool.filter((player) => deriveVersionGroupId(player) !== groupId),
  };
  const proof = proveSimultaneousSnakeSeating(postPick);
  if (!proof.feasible) return null;
  const certificate = mintTrustedSnakeSeatingCertificate(postPick, proof, false);
  TRUSTED_SNAKE_CERTIFICATE_INDEX.set(certificate, buildChildTrustedIndex({
    parent: input.certificate,
    childProof: proof,
    committedGroupId: groupId,
  }));
  return certificate;
}

/**
 * Classify a set of visible draft choices against one immutable room certificate.
 *
 * The root certificate is validated once. Each candidate first uses the constructive reservation
 * rewrite; only candidates that cannot reuse that proof enter the canonical solver. This function
 * is intentionally pure and worker-safe so hundreds of cards can be classified without blocking
 * the draft-room render thread.
 */
export function createSnakePickFinishSafetyClassifier(input: {
  current: SimultaneousSnakeSeatingInput;
  proof: SnakeSeatingProof;
  teamId: string;
}): (candidatePlayerIds: readonly string[]) => SnakePickFinishSafetyRow[] {
  const certificate = validateConstructiveSnakeFinishProof(input.current, input.proof)
    ? mintTrustedSnakeSeatingCertificate(input.current, input.proof, true)
    : null;
  if (certificate) {
    TRUSTED_SNAKE_CERTIFICATE_INDEX.set(certificate, buildRootTrustedIndex(certificate));
  }
  const current = certificate?.input ?? input.current;
  const clubIndex = current.clubs.findIndex((club) => club.teamId === input.teamId);
  if (!certificate || clubIndex < 0) {
    return (candidatePlayerIds) => [...new Set(candidatePlayerIds)].map((playerId) => ({
      playerId, status: 'OPEN', message: 'FINISH PROOF UNAVAILABLE.',
      finalSalary: null, finalTax: null, moneyLeft: null,
    }));
  }
  const availableById = new Map(availableCards(current).map((player) => [player.playerId, player]));
  const normalizedCaps = snakeLuxuryCaps([...current.baseCaps]);
  const draftableRow = (
    playerId: string,
    postPick: SimultaneousSnakeSeatingInput,
    proof: SnakeSeatingProof,
  ): SnakePickFinishSafetyRow => {
    const club = postPick.clubs[clubIndex];
    const assignment = proof.assignments.find((row) => row.teamId === input.teamId);
    const future = assignment?.playerIds.map((id) => availableById.get(id));
    if (!assignment || !future || future.some((player) => !player)) {
      return {
        playerId, status: 'OPEN', message: 'FINISH PROOF UNAVAILABLE.',
        finalSalary: null, finalTax: null, moneyLeft: null,
      };
    }
    const finalRoster = [...club.roster, ...(future as SnakeSeatingPlayer[])];
    const shiftedCaps = club.capIdentity
      ? shiftLuxuryCaps([...normalizedCaps], club.capIdentity)
      : [...normalizedCaps];
    const beforeClub = current.clubs[clubIndex];
    const beforeConstruction = beforeClub.committedConstruction
      ? [...beforeClub.committedConstruction]
      : beforeClub.roster.map((row) => row.construction);
    const beforeTax = luxuryTax(beforeConstruction, shiftedCaps, 'taxed').charged;
    const finalTax = luxuryTax(finalRoster.map((row) => row.construction), shiftedCaps, 'taxed').charged;
    const beforeSalary = beforeClub.roster.reduce((sum, row) => sum + row.price, 0);
    const finalSalary = finalRoster.reduce((sum, row) => sum + row.price, 0);
    return {
      playerId,
      status: 'DRAFTABLE',
      message: proof.message,
      finalSalary,
      finalTax,
      moneyLeft: beforeClub.budgetRemaining - (finalSalary - beforeSalary) - (finalTax - beforeTax),
    };
  };
  return (candidatePlayerIds) => [...new Set(candidatePlayerIds)].map((playerId): SnakePickFinishSafetyRow => {
    const player = availableById.get(playerId);
    if (!player) {
      return {
        playerId, status: 'BLOCKED', message: 'THIS CARD IS NO LONGER AVAILABLE.',
        finalSalary: null, finalTax: null, moneyLeft: null,
      };
    }
    const allInCost = exactTrustedPickCost({
      seatingInput: current,
      clubIndex,
      player,
      normalizedCaps,
    });
    const direct = directTrustedAdvance({
      certificate,
      teamId: input.teamId,
      playerId,
      allInCost,
    });
    if (direct) {
      return draftableRow(playerId, direct.input, direct.proof);
    }

    const groupId = deriveVersionGroupId(player);
    const postPick: SimultaneousSnakeSeatingInput = {
      ...current,
      clubs: current.clubs.map((club, index) => index === clubIndex ? {
        ...club,
        roster: [...club.roster, player],
        budgetRemaining: snakeMoneyRemaining(club.budgetRemaining, allInCost),
        committedConstruction: [
          ...(club.committedConstruction ?? club.roster.map((row) => row.construction)),
          player.construction,
        ],
      } : club),
      pool: current.pool.filter((candidate) => deriveVersionGroupId(candidate) !== groupId),
    };
    const necessary = setupFloorShortfall(postPick.clubs, availableCards(postPick))
      ?? namedNecessaryShortfall(postPick.clubs, availableCards(postPick));
    if (necessary) {
      return {
        playerId, status: 'BLOCKED', message: copyLawMessage(necessary),
        finalSalary: null, finalTax: null, moneyLeft: null,
      };
    }
    const activeClub = postPick.clubs[clubIndex];
    if (activeClub.roster.length >= LEGAL_ROSTER.size
      && !isLegalRoster(activeClub.roster.map((row) => row.shape))) {
      return {
        playerId, status: 'BLOCKED', message: 'THIS PICK LEAVES NO LEGAL 22 FOR THIS CLUB.',
        finalSalary: null, finalTax: null, moneyLeft: null,
      };
    }
    const proof = proveSimultaneousSnakeSeating(postPick);
    if (proof.feasible) {
      return draftableRow(playerId, postPick, proof);
    }
    return {
      playerId, status: 'OPEN', message: proof.message || 'FINISH PROOF UNAVAILABLE.',
      finalSalary: null, finalTax: null, moneyLeft: null,
    };
  });
}

export function classifySnakePickFinishSafety(input: {
  current: SimultaneousSnakeSeatingInput;
  proof: SnakeSeatingProof;
  teamId: string;
  candidatePlayerIds: readonly string[];
}): SnakePickFinishSafetyRow[] {
  return createSnakePickFinishSafetyClassifier(input)(input.candidatePlayerIds);
}

function advanceSnakeSeatingCertificate(input: {
  current: SimultaneousSnakeSeatingInput;
  postPick: SimultaneousSnakeSeatingInput;
  proof: SnakeSeatingProof;
  teamId: string;
  player: SnakeSeatingPlayer;
}): SnakeSeatingProof | null {
  if (!validateSnakeSeatingProof(input.current, input.proof)) return null;
  const baseRosters = proofRosters(input.current, input.proof);
  if (!baseRosters) return null;
  const targetClubIndex = input.current.clubs.findIndex((club) => club.teamId === input.teamId);
  if (targetClubIndex < 0) return null;
  const candidateGroup = deriveVersionGroupId(input.player);
  if (input.current.clubs.some((club) => club.roster.some((player) => (
    deriveVersionGroupId(player) === candidateGroup
  )))) return null;

  const assignmentByTeamId = new Map(input.proof.assignments.map((assignment) => [assignment.teamId, assignment]));
  const assignmentsByClub = input.current.clubs.map((club) => assignmentByTeamId.get(club.teamId));
  if (assignmentsByClub.some((assignment) => !assignment)) return null;
  const currentPoolById = new Map(input.current.pool.map((player) => [player.playerId, player]));
  const futureGroupsByClub = assignmentsByClub.map((assignment) => new Map(assignment!.playerIds.map((playerId) => {
    const player = currentPoolById.get(playerId);
    return player ? [deriveVersionGroupId(player), playerId] as const : ['', playerId] as const;
  })));
  const ownerClubIndex = futureGroupsByClub.findIndex((groups) => groups.has(candidateGroup));
  const targetFutureIds = new Set(assignmentsByClub[targetClubIndex]!.playerIds);
  const targetOutgoing = baseRosters[targetClubIndex]
    .filter((player) => targetFutureIds.has(player.playerId) && deriveVersionGroupId(player) !== candidateGroup)
    .sort((left, right) => left.playerId.localeCompare(right.playerId));
  const representatives = representativeCards(availableCards(input.postPick));
  const certify = (trialRosters: readonly (readonly SnakeSeatingPlayer[])[]): SnakeSeatingProof | null => {
    const assignments = repairMatchedRosters(input.postPick, representatives, trialRosters);
    return assignments
      ? { feasible: true, assignments, shortfall: null, message: 'EVERY CLUB CAN FINISH A LEGAL 22.' }
      : null;
  };

  if (ownerClubIndex === targetClubIndex) return certify(baseRosters);
  for (const outgoing of targetOutgoing) {
    const trial = baseRosters.map((roster) => [...roster]);
    const targetIndex = trial[targetClubIndex].findIndex((player) => player.playerId === outgoing.playerId);
    if (targetIndex < 0) continue;
    trial[targetClubIndex][targetIndex] = input.player;
    if (ownerClubIndex >= 0) {
      const ownerIndex = trial[ownerClubIndex].findIndex((player) => deriveVersionGroupId(player) === candidateGroup);
      if (ownerIndex < 0) continue;
      trial[ownerClubIndex][ownerIndex] = outgoing;
    }
    const certified = certify(trial);
    if (certified) return certified;
  }
  return null;
}

function copyLawMessage(shortfall: SnakeSeatingShortfall): string {
  if (shortfall.reason === 'identity-proof-unknown') {
    return 'THIS POOL COULD NOT CERTIFY EVERY CHOSEN IDENTITY TOGETHER. WIDEN THIS BUILD OR CHANGE A SOURCE OR CLUB IDENTITY.';
  }
  if (shortfall.reason === 'affordability') {
    return `NOT ENOUGH BUDGET ROOM FOR ${shortfall.affectedClubs} CLUB — SHORT ${shortfall.shortBy}.`;
  }
  return `NOT ENOUGH ${shortfall.label} FOR ${shortfall.affectedClubs} CLUBS — SHORT ${shortfall.shortBy}. ADD PLAYERS OR REMOVE A CLUB.`;
}

function availableCards(input: SimultaneousSnakeSeatingInput): SnakeSeatingPlayer[] {
  const unavailable = unavailableVersionPlayerIds(input.versionState);
  const draftedGroups = new Set(Object.keys(input.versionState?.draftedPlayerIdByGroupId ?? {}));
  const committedGroups = new Set(input.clubs.flatMap((club) => club.roster.map(deriveVersionGroupId)));
  return input.pool.filter((player) => (
    !unavailable.has(player.playerId)
    && !draftedGroups.has(deriveVersionGroupId(player))
    && !committedGroups.has(deriveVersionGroupId(player))
  ));
}

function identityReferenceCards(input: SimultaneousSnakeSeatingInput): SnakeSeatingPlayer[] {
  if (!input.identityReferencePool) return availableCards(input);
  return availableCards({
    ...input,
    pool: input.identityReferencePool,
    identityReferencePool: undefined,
  });
}

/** One human contributes at most one unit to each public position-supply bucket. */
export function countSnakeSupplyByPosition(
  players: readonly SnakeSeatingPlayer[],
): Record<string, number> {
  return Object.fromEntries(derivePositionSupplyFloorTargets(1).map((target) => [
    target.position,
    new Set(
      players
        .filter((player) => matchesPositionSupplyFloor(player.shape, target))
        .map(deriveVersionGroupId),
    ).size,
  ]));
}

function hardDemand(clubs: readonly SnakeSeatingClub[]): Map<string, number> {
  const demand = new Map<string, number>();
  const add = (position: string, count: number) => demand.set(position, (demand.get(position) ?? 0) + count);
  for (const club of clubs) {
    const need = rosterNeedBreakdown(club.roster.map((player) => player.shape));
    for (const position of need.missingPrimaries) add(position, 1);
    add('CATCHER_DEPTH', need.catcherCoverNeed);
    add('SP', need.rotationDeficit);
    add('RP', need.bullpenDeficit);
    add('CP', need.closerDeficit);
  }
  return demand;
}

function namedNecessaryShortfall(
  clubs: readonly SnakeSeatingClub[],
  pool: readonly SnakeSeatingPlayer[],
): SnakeSeatingShortfall | null {
  const demand = hardDemand(clubs);
  const supply = countSnakeSupplyByPosition(pool);
  const targets = derivePositionSupplyFloorTargets(Math.max(1, clubs.length));
  for (const target of targets) {
    const position = target.position;
    const needed = demand.get(position) ?? 0;
    const have = supply[position] ?? 0;
    if (have < needed) {
      const affectedClubs = clubs.filter((club) => {
        const need = rosterNeedBreakdown(club.roster.map((player) => player.shape));
        if (position === 'CATCHER_DEPTH') return need.catcherCoverNeed > 0;
        if (position === 'SP') return need.rotationDeficit > 0;
        if (position === 'RP') return need.bullpenDeficit > 0;
        if (position === 'CP') return need.closerDeficit > 0;
        return need.missingPrimaries.includes(position as FieldPosition);
      }).length;
      const missing = needed - have;
      return {
        ...target,
        kind: target.kind,
        needed,
        available: have,
        missing,
        reason: 'position-floor',
        shortBy: missing,
        affectedClubs,
      };
    }
  }
  const openSeats = clubs.reduce((sum, club) => sum + LEGAL_ROSTER.size - club.roster.length, 0);
  const humans = new Set(pool.map(deriveVersionGroupId)).size;
  return humans < openSeats
    ? {
      kind: 'body-count', position: 'ROSTER', label: 'PLAYERS', minimumPerTeam: 0,
      teams: clubs.length, slack: 0, needed: openSeats, available: humans,
      missing: openSeats - humans, reason: 'body-count', shortBy: openSeats - humans,
      affectedClubs: clubs.length,
    }
    : null;
}

function versionDedupePositionFloors(
  players: readonly SnakeSeatingPlayer[],
  teamCount: number,
): PositionSupplyFloorResult[] {
  return deriveHardPositionSupplyFloorTargets(teamCount).map((target) => {
    const available = new Set(
      players
        .filter((player) => matchesPositionSupplyFloor(player.shape, target))
        .map(deriveVersionGroupId),
    ).size;
    return { ...target, available, missing: Math.max(0, target.needed - available) };
  });
}

function setupFloorShortfall(
  clubs: readonly SnakeSeatingClub[],
  players: readonly SnakeSeatingPlayer[],
): SnakeSeatingShortfall | null {
  if (!clubs.every((club) => club.roster.length === 0)) return null;
  const humans = new Set(players.map(deriveVersionGroupId)).size;
  const demand = poolDemandModel(clubs.length, 0);
  if (humans < demand.feasibilityFloor) {
    const missing = demand.feasibilityFloor - humans;
    return {
      kind: 'body-count', position: 'ROSTER', label: 'PLAYERS', minimumPerTeam: 0,
      teams: clubs.length, slack: 0, needed: demand.feasibilityFloor, available: humans,
      missing, reason: 'body-count', shortBy: missing, affectedClubs: clubs.length,
    };
  }
  const floor = versionDedupePositionFloors(players, clubs.length).find((row) => row.missing > 0);
  if (floor) return {
    ...floor,
    reason: 'position-floor',
    shortBy: floor.missing,
    affectedClubs: clubs.length,
  };

  // The canonical 22 always needs at least 13 position players and 8 pitchers per club. The
  // remaining seat is the legal SWING between a fifth bench bat and a fifth reliever. These two
  // aggregate necessary floors expose a real composition shortage that the individual C/SP/RP/CP
  // floors cannot name. Version siblings still contribute one person to each eligible side.
  const positionPeople = new Set(
    players.filter((player) => !player.shape.isPitcher).map(deriveVersionGroupId),
  ).size;
  const neededPositionPeople = clubs.length * LEGAL_ROSTER.minPositionPlayers;
  if (positionPeople < neededPositionPeople) {
    const missing = neededPositionPeople - positionPeople;
    return {
      kind: 'joint-assignment', position: 'SWING', label: 'BENCH / SWING HITTERS',
      minimumPerTeam: LEGAL_ROSTER.minPositionPlayers, teams: clubs.length, slack: 0,
      needed: neededPositionPeople, available: positionPeople, missing,
      reason: 'joint-assignment', shortBy: missing, affectedClubs: clubs.length,
      detail: 'roster-composition',
    };
  }
  const pitcherPeople = new Set(
    players.filter((player) => player.shape.isPitcher).map(deriveVersionGroupId),
  ).size;
  const neededPitcherPeople = clubs.length * LEGAL_ROSTER.minPitchers;
  if (pitcherPeople < neededPitcherPeople) {
    const missing = neededPitcherPeople - pitcherPeople;
    return {
      kind: 'joint-assignment', position: 'SWING', label: 'STAFF / SWING ARMS',
      minimumPerTeam: LEGAL_ROSTER.minPitchers, teams: clubs.length, slack: 0,
      needed: neededPitcherPeople, available: pitcherPeople, missing,
      reason: 'joint-assignment', shortBy: missing, affectedClubs: clubs.length,
      detail: 'roster-composition',
    };
  }
  return null;
}

function representativeCards(players: readonly SnakeSeatingPlayer[]): SnakeSeatingPlayer[] {
  const byGroup = new Map<string, SnakeSeatingPlayer>();
  for (const player of [...players].sort((left, right) => left.price - right.price || left.playerId.localeCompare(right.playerId))) {
    const groupId = deriveVersionGroupId(player);
    if (!byGroup.has(groupId)) byGroup.set(groupId, player);
  }
  return [...byGroup.values()];
}

function scarcityScore(club: SnakeSeatingClub, pool: readonly SnakeSeatingPlayer[]): number {
  const supply = countSnakeSupplyByPosition(pool);
  const need = rosterNeedBreakdown(club.roster.map((player) => player.shape));
  const ratios = need.missingPrimaries.map((position) => supply[position] ?? 0);
  if (need.closerDeficit > 0) ratios.push(supply.CP ?? 0);
  return ratios.length > 0 ? Math.min(...ratios) : pool.length;
}

function toGlobalDesignPlayer(player: SnakeSeatingPlayer): DesignPoolPlayer {
  const bat = player.construction.bat;
  const pit = player.construction.pit;
  return {
    id: player.playerId,
    salary: player.price,
    slotPlayer: player.shape,
    profile: {
      isPitcher: player.shape.isPitcher,
      primaryPosition: player.shape.role ?? player.shape.position ?? '',
      secondaryPosition: player.shape.secondaryPosition ?? null,
      power: bat.POW,
      contact: bat.CON,
      speed: bat.SPD,
      fielding: bat.FLD,
      arm: bat.ARM,
      velocity: pit?.VEL,
      junk: pit?.JNK,
      accuracy: pit?.ACC,
    },
  };
}

function toIdentitySimPlayer(player: SnakeSeatingPlayer): SimPlayer {
  return {
    ...player.construction,
    id: player.playerId,
    iv: player.price,
    salary: player.price,
    position: player.shape.position ?? player.shape.role ?? '',
    secondaryPosition: player.shape.secondaryPosition ?? null,
    twoWayVariant: player.shape.twoWayVariant ?? player.construction.twoWayVariant ?? null,
  };
}

function uniqueIdentityReference(
  players: readonly SnakeSeatingPlayer[],
  archetype: SimArchetype,
  tier: TierKey,
): SimPlayer[] {
  const score = archetypeFitScorer(archetype, tier, 'optimal');
  const byGroup = new Map<string, SimPlayer>();
  for (const player of players) {
    const sim = toIdentitySimPlayer(player);
    const groupId = deriveVersionGroupId(player);
    const current = byGroup.get(groupId);
    if (!current || score(sim) > score(current) + 1e-9
      || (Math.abs(score(sim) - score(current)) <= 1e-9
        && (sim.iv > current.iv + 1e-9
          || (Math.abs(sim.iv - current.iv) <= 1e-9 && sim.id.localeCompare(current.id) < 0)))) {
      byGroup.set(groupId, sim);
    }
  }
  return [...byGroup.values()].sort((left, right) => left.id.localeCompare(right.id));
}

const IDENTITY_PROOF_FIELD_POSITIONS: readonly FieldPosition[] = [
  'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF',
];
const IDENTITY_PROOF_MIN_FIT_DEPTH = Math.ceil(LEGAL_ROSTER.size / 2);

/**
 * Bound setup identity work to cards that can actually influence the bounded roster optimizer.
 *
 * Full Sources can contain several thousand cards and multiple versions of the same person. The
 * identity builder itself only explores high-IV, high-fit, and low-cost shortlists for each roster
 * role. Feeding every other card through every club's repeated climb made adding an unrelated
 * source non-monotonic in practice: an eight-club proof could take minutes, then time out as UNKNOWN.
 * This deterministic union retains deep room-scaled role coverage under all three lenses for every
 * chosen identity. Small/normal sources keep their byte-path. The independent validator derives the
 * same shortlist from the original source and still checks the final 176 distinct people, exact
 * roster law, exact settlement bill, and source-relative identity embodiment.
 */
function identityProofCandidatePlayers(
  input: SimultaneousSnakeSeatingInput,
  players: readonly SnakeSeatingPlayer[],
): SnakeSeatingPlayer[] {
  const smallSourcePeopleLimit = Math.max(640, input.clubs.length * LEGAL_ROSTER.size * 3);
  const sourcePeople = new Set(players.map(deriveVersionGroupId)).size;
  if (sourcePeople <= smallSourcePeopleLimit) return [...players];

  const tier = input.tier ?? 'standard';
  const selectedIds = new Set<string>();
  const buckets: Array<{
    eligible: (player: SnakeSeatingPlayer) => boolean;
    globalDepth: number;
    fitDepthPerClub: number;
  }> = [
    ...IDENTITY_PROOF_FIELD_POSITIONS.map((position) => ({
      eligible: (player: SnakeSeatingPlayer) => canCover(player.shape, position),
      globalDepth: Math.max(12, input.clubs.length * (position === 'C' ? 3 : 2)),
      fitDepthPerClub: position === 'C' ? 3 : 2,
    })),
    { eligible: (player) => canStart(player.shape), globalDepth: input.clubs.length * 6, fitDepthPerClub: 6 },
    { eligible: (player) => canRelieve(player.shape), globalDepth: input.clubs.length * 5, fitDepthPerClub: 5 },
    { eligible: (player) => isCloser(player.shape), globalDepth: input.clubs.length * 3, fitDepthPerClub: 3 },
    { eligible: (player) => !player.shape.isPitcher, globalDepth: input.clubs.length * 6, fitDepthPerClub: 6 },
  ];

  const addTopUniqueGroups = (
    eligible: (player: SnakeSeatingPlayer) => boolean,
    score: (player: SnakeSeatingPlayer) => number,
    limit: number,
  ) => {
    const bestByGroup = new Map<string, SnakeSeatingPlayer>();
    for (const player of players) {
      if (!eligible(player)) continue;
      const groupId = deriveVersionGroupId(player);
      const current = bestByGroup.get(groupId);
      if (!current || score(player) > score(current) + 1e-9
        || (Math.abs(score(player) - score(current)) <= 1e-9
          && player.playerId.localeCompare(current.playerId) < 0)) {
        bestByGroup.set(groupId, player);
      }
    }
    for (const player of [...bestByGroup.values()]
      .sort((left, right) => score(right) - score(left)
        || left.playerId.localeCompare(right.playerId))
      .slice(0, limit)) {
      selectedIds.add(player.playerId);
    }
  };

  for (const bucket of buckets) {
    addTopUniqueGroups(bucket.eligible, (player) => player.price, bucket.globalDepth);
    addTopUniqueGroups(bucket.eligible, (player) => -player.price, Math.ceil(bucket.globalDepth / 2));
  }

  const archetypes = new Map<string, { archetype: SimArchetype; clubs: number }>();
  for (const club of input.clubs) {
    if (!club.identityArchetype) continue;
    const key = JSON.stringify(club.identityArchetype);
    const current = archetypes.get(key);
    archetypes.set(key, {
      archetype: club.identityArchetype,
      clubs: (current?.clubs ?? 0) + 1,
    });
  }
  for (const { archetype, clubs } of archetypes.values()) {
    const fullReference = uniqueIdentityReference(players, archetype, tier);
    const fitScore = archetypeFitScorer(archetype, tier, 'optimal', fullReference);
    for (const bucket of buckets) {
      addTopUniqueGroups(
        bucket.eligible,
        (player) => fitScore(toIdentitySimPlayer(player)),
        // Each identity lens must retain at least half a legal roster before the shared matcher
        // resolves overlap. The old floor of six was smaller than one four-club identity's real
        // support path and could make adding valid source cards turn SUCCESS into UNKNOWN.
        Math.max(IDENTITY_PROOF_MIN_FIT_DEPTH, clubs * bucket.fitDepthPerClub),
      );
    }
  }

  return players.filter((player) => selectedIds.has(player.playerId));
}

function buildIdentityCertificateRoster(input: {
  reference: SimPlayer[];
  embodimentReference: SimPlayer[];
  archetype: SimArchetype;
  tier: TierKey;
  budget: number;
  realTeamCount: number;
  taxCaps: readonly LuxuryCapRow[];
  valueFloorOverride?: number;
}) {
  const common = {
    realTeamCount: input.realTeamCount,
    taxCaps: [...input.taxCaps],
    affordabilityLaw: 'snake-money' as const,
    embodimentReference: input.embodimentReference,
    ...(input.valueFloorOverride === undefined
      ? {}
      : { valueFloorOverride: input.valueFloorOverride }),
  };
  const optimal = buildIdentityRoster(
    input.reference,
    input.archetype,
    input.tier,
    input.budget,
    { ...common, posture: 'optimal' },
  );
  if (optimal.embodiment.boostZ > 0) return optimal;
  const aggressive = buildIdentityRoster(
    input.reference,
    input.archetype,
    input.tier,
    input.budget,
    { ...common, posture: 'aggressive' },
  );
  const requiredIv = optimal.baselineIv * optimal.valueFloor;
  const selected = aggressive.legalRoster
    && aggressive.solvent
    && aggressive.floorMet
    && aggressive.totalIv >= requiredIv - 1e-9
    && aggressive.embodiment.boostZ > optimal.embodiment.boostZ
    ? aggressive
    : optimal;
  if (selected.embodiment.boostZ > 0) return selected;

  // `buildIdentityRoster` optimizes the tax-cap fit objective, while the setup authority enforces
  // the stricter source-relative embodiment z-score. On mixed SML/MLB/Legends sources those two
  // objectives can differ by one marginal player. Run a tiny deterministic swap neighborhood on
  // the actual enforced objective; every candidate must remain a legal 22, preserve the same 90%
  // IV floor, and settle salary plus tax under the same Snake budget.
  const fitScore = archetypeFitScorer(
    input.archetype,
    input.tier,
    'aggressive',
    input.embodimentReference,
  );
  const shortlist = [...new Map([
    ...[...input.reference]
      .sort((left, right) => fitScore(right) - fitScore(left) || right.iv - left.iv || left.id.localeCompare(right.id))
      .slice(0, 96),
    ...[...input.reference]
      .sort((left, right) => right.iv - left.iv || fitScore(right) - fitScore(left) || left.id.localeCompare(right.id))
      .slice(0, 64),
    ...[...input.reference]
      .sort((left, right) => left.salary - right.salary || fitScore(right) - fitScore(left) || left.id.localeCompare(right.id))
      .slice(0, 32),
  ].map((player) => [player.id, player] as const)).values()];
  type Assessed = {
    picks: Array<{ slotIndex: number; player: SimPlayer }>;
    players: SimPlayer[];
    totalIv: number;
    totalSalary: number;
    totalTax: number;
    embodiment: ReturnType<typeof identityEmbodiment>;
  };
  const assess = (picks: Array<{ slotIndex: number; player: SimPlayer }>): Assessed | null => {
    const players = picks.map((pick) => pick.player);
    if (!isLegalRoster(players)) return null;
    const totalIv = players.reduce((sum, player) => sum + player.iv, 0);
    if (totalIv < requiredIv - 1e-9) return null;
    const totalSalary = players.reduce((sum, player) => sum + player.salary, 0);
    const totalTax = luxuryTax(players, [...input.taxCaps], 'taxed').charged;
    if (!snakeMoneyAffordable(totalSalary + totalTax, input.budget)) return null;
    return {
      picks,
      players,
      totalIv,
      totalSalary,
      totalTax,
      embodiment: identityEmbodiment(
        players,
        input.archetype,
        input.tier,
        input.embodimentReference,
      ),
    };
  };
  const initial = assess(selected.slotPicks.map((pick) => ({ ...pick })));
  if (!initial) return selected;
  let current: Assessed = initial;
  for (let pass = 0; pass < 4 && current.embodiment.boostZ <= 0; pass += 1) {
    let best: Assessed = current;
    const used = new Set(current.players.map((player) => player.id));
    for (let pickIndex = 0; pickIndex < current.picks.length; pickIndex += 1) {
      const existing = current.picks[pickIndex].player;
      for (const candidate of shortlist) {
        if (candidate.id === existing.id || used.has(candidate.id)) continue;
        const nextPicks = current.picks.map((pick, index) => (
          index === pickIndex ? { slotIndex: pick.slotIndex, player: candidate } : pick
        ));
        const next = assess(nextPicks);
        if (!next) continue;
        const nextCost = next.totalSalary + next.totalTax;
        const bestCost = best.totalSalary + best.totalTax;
        if (next.embodiment.boostZ > best.embodiment.boostZ + 1e-9
          || (Math.abs(next.embodiment.boostZ - best.embodiment.boostZ) <= 1e-9
            && (next.totalIv > best.totalIv + 1e-9
              || (Math.abs(next.totalIv - best.totalIv) <= 1e-9 && nextCost < bestCost - 1e-9)))) {
          best = next;
        }
      }
    }
    if (best === current) break;
    current = best;
  }
  return current.embodiment.boostZ > selected.embodiment.boostZ
    ? {
        ...selected,
        players: current.players,
        slotPicks: current.picks,
        totalIv: current.totalIv,
        totalSalary: current.totalSalary,
        totalTax: current.totalTax,
        solvent: true,
        legalRoster: true,
        noTax: current.totalTax <= 1e-9,
        floorMet: true,
        embodiment: current.embodiment,
      }
    : selected;
}

function identityRosterMeetsCanonicalFloor(input: {
  seatingInput: SimultaneousSnakeSeatingInput;
  club: SnakeSeatingClub;
  roster: readonly SnakeSeatingPlayer[];
  sourceAvailable: readonly SnakeSeatingPlayer[];
}): boolean {
  const archetype = input.club.identityArchetype;
  if (!archetype) return true;
  // This certificate is a setup gate. Partial-room proofs deliberately do not infer a surviving
  // identity from an already drafted roster; room legality remains owned by its normal proof.
  if (input.club.roster.length > 0 || input.roster.length !== LEGAL_ROSTER.size) return false;
  const tier = input.seatingInput.tier ?? 'standard';
  const embodimentReference = uniqueIdentityReference(input.sourceAvailable, archetype, tier);
  const normalizedCaps = snakeLuxuryCaps([...input.seatingInput.baseCaps]);
  const taxCaps = input.club.capIdentity
    ? shiftLuxuryCaps([...normalizedCaps], input.club.capIdentity)
    : [...normalizedCaps];
  const baseline = buildIdentityValueBaseline(embodimentReference, archetype, tier, input.club.budgetRemaining, {
    realTeamCount: input.seatingInput.realTeamCount,
    taxCaps,
    affordabilityLaw: 'snake-money',
    posture: 'optimal',
  });
  const roster = input.roster.map(toIdentitySimPlayer);
  const totalIv = roster.reduce((sum, player) => sum + player.iv, 0);
  return baseline.optimizationComplete
    && baseline.baselineIv > 0
    && totalIv >= baseline.baselineIv * baseline.valueFloor - 1e-9
    && identityEmbodiment(roster, archetype, tier, embodimentReference).boostZ > 0;
}

/**
 * Verify and, when pool slack permits it, rebalance a set of globally matched final rosters
 * against the settlement bill. Players already on a club are immutable; only future cards can
 * move. Returned assignments therefore describe exactly what remains to be drafted from the
 * current state, not all 22 final players.
 */
function repairMatchedRosters(
  input: SimultaneousSnakeSeatingInput,
  representatives: readonly SnakeSeatingPlayer[],
  initialRosters: readonly (readonly SnakeSeatingPlayer[])[],
): SnakeSeatingAssignment[] | null {
  if (initialRosters.length !== input.clubs.length) return null;
  const fixedPlayers = input.clubs.flatMap((club) => club.roster);
  const fixedPlayerIds = fixedPlayers.map((player) => player.playerId);
  const fixedPlayerGroups = fixedPlayers.map(deriveVersionGroupId);
  if (new Set(fixedPlayerIds).size !== fixedPlayerIds.length
    || new Set(fixedPlayerGroups).size !== fixedPlayerGroups.length) return null;
  const fixedGroups = new Set(fixedPlayerGroups);
  for (let clubIndex = 0; clubIndex < input.clubs.length; clubIndex += 1) {
    const rosterGroups = new Set(initialRosters[clubIndex].map(deriveVersionGroupId));
    if (input.clubs[clubIndex].roster.some((player) => !rosterGroups.has(deriveVersionGroupId(player)))) return null;
  }
  const isFuture = (player: SnakeSeatingPlayer) => !fixedGroups.has(deriveVersionGroupId(player));
  const rosters = initialRosters.map((roster) => [...roster]);
  const normalizedCaps = snakeLuxuryCaps([...input.baseCaps]);

  const bill = (clubIndex: number, roster: readonly SnakeSeatingPlayer[]) => {
    const club = input.clubs[clubIndex];
    const shiftedCaps = club.capIdentity ? shiftLuxuryCaps(normalizedCaps, club.capIdentity) : normalizedCaps;
    const committed = club.committedConstruction
      ? [...club.committedConstruction]
      : club.roster.map((player) => player.construction);
    const future = roster.filter(isFuture);
    const currentTax = luxuryTax(committed, shiftedCaps, 'taxed').charged;
    const finalTax = luxuryTax(
      [...committed, ...future.map((player) => player.construction)],
      shiftedCaps,
      'taxed',
    ).charged;
    const salaryCost = future.reduce((sum, player) => sum + player.price, 0);
    const addedTax = finalTax - currentTax;
    return { salaryCost, addedTax, allInCost: salaryCost + addedTax };
  };
  const overage = (clubIndex: number, roster: readonly SnakeSeatingPlayer[]) => (
    snakeMoneyOverage(bill(clubIndex, roster).allInCost, input.clubs[clubIndex].budgetRemaining)
  );
  const taxExposure = (player: SnakeSeatingPlayer) => {
    const bat = player.construction.bat;
    const pit = player.construction.pit;
    return bat.POW + bat.CON + bat.SPD + bat.FLD + bat.ARM
      + (pit?.VEL ?? 0) + (pit?.JNK ?? 0) + (pit?.ACC ?? 0);
  };
  const usedIds = new Set(rosters.flatMap((roster) => roster.filter(isFuture).map((player) => player.playerId)));
  const unused = representatives.filter((player) => isFuture(player) && !usedIds.has(player.playerId));

  // Most early-draft advances have one newly expensive fixed card and ample pool slack. Repair
  // that common case constructively before the exhaustive cross-club search below: cheapest,
  // lowest-exposure slack is tried against the costliest future cards, and every accepted move
  // must preserve the canonical roster law and strictly lower the exact settlement bill. If the
  // greedy trial cannot finish every over-budget club, discard it and retain the complete search.
  const fastRosters = rosters.map((roster) => [...roster]);
  const fastUnused = [...unused];
  let fastFinished = false;
  for (let round = 0; round < Math.max(1, input.clubs.length * LEGAL_ROSTER.size); round += 1) {
    const bills = fastRosters.map((roster, clubIndex) => bill(clubIndex, roster).allInCost);
    const overClubIndex = bills
      .map((amount, clubIndex) => ({ amount, clubIndex }))
      .filter(({ amount, clubIndex }) => !snakeMoneyAffordable(amount, input.clubs[clubIndex].budgetRemaining))
      .sort((left, right) => (
        (right.amount - input.clubs[right.clubIndex].budgetRemaining)
        - (left.amount - input.clubs[left.clubIndex].budgetRemaining)
        || left.clubIndex - right.clubIndex
      ))[0]?.clubIndex;
    if (overClubIndex === undefined) {
      fastFinished = true;
      break;
    }
    const oldBill = bills[overClubIndex];
    const outgoingIndices = fastRosters[overClubIndex]
      .map((player, index) => ({ player, index }))
      .filter(({ player }) => isFuture(player))
      .sort((left, right) => (
        right.player.price - left.player.price
        || taxExposure(right.player) - taxExposure(left.player)
        || left.player.playerId.localeCompare(right.player.playerId)
      ));
    const incomingIndices = fastUnused
      .map((player, index) => ({ player, index }))
      .sort((left, right) => (
        left.player.price - right.player.price
        || taxExposure(left.player) - taxExposure(right.player)
        || left.player.playerId.localeCompare(right.player.playerId)
      ));
    let applied = false;
    for (const incoming of incomingIndices) {
      for (const outgoing of outgoingIndices) {
        const trial = [...fastRosters[overClubIndex]];
        trial[outgoing.index] = incoming.player;
        if (!isLegalRoster(trial.map((player) => player.shape))) continue;
        const nextBill = bill(overClubIndex, trial).allInCost;
        if (!Number.isFinite(nextBill) || nextBill >= oldBill - 1e-9) continue;
        fastRosters[overClubIndex] = trial;
        fastUnused[incoming.index] = outgoing.player;
        applied = true;
        break;
      }
      if (applied) break;
    }
    if (!applied) break;
  }
  if (fastFinished) {
    for (let index = 0; index < rosters.length; index += 1) rosters[index] = fastRosters[index];
    unused.splice(0, unused.length, ...fastUnused);
  }

  // Exact-tax repair. Pool-slack replacements can cross top-N tax plateaus one lower-exposure
  // card at a time. Cross-club swaps must immediately reduce total league overage. Every move
  // preserves the canonical 22-player law and can never dislodge an already drafted player.
  const maxRepairRounds = Math.max(1, input.clubs.length * LEGAL_ROSTER.size);
  for (let round = 0; round < maxRepairRounds; round += 1) {
    const currentOverages = rosters.map((roster, clubIndex) => overage(clubIndex, roster));
    const overClubIndex = currentOverages
      .map((amount, clubIndex) => ({ amount, clubIndex }))
      .filter(({ amount }) => amount > 1e-9)
      .sort((left, right) => right.amount - left.amount || left.clubIndex - right.clubIndex)[0]?.clubIndex;
    if (overClubIndex === undefined) break;

    const oldOverRoster = rosters[overClubIndex];
    const oldOverage = currentOverages[overClubIndex];
    type TaxRepairCandidate = {
      nextOverRoster: SnakeSeatingPlayer[];
      nextOtherRoster?: SnakeSeatingPlayer[];
      otherClubIndex?: number;
      unusedIndex?: number;
      outgoing: SnakeSeatingPlayer;
      incoming: SnakeSeatingPlayer;
      improvement: number;
      exposureImprovement: number;
      nextOverBill: number;
    };
    let best: TaxRepairCandidate | null = null;
    const consider = (candidate: TaxRepairCandidate) => {
      if (!best
        || candidate.improvement > best.improvement + 1e-9
        || (Math.abs(candidate.improvement - best.improvement) <= 1e-9
          && candidate.exposureImprovement > best.exposureImprovement + 1e-9)
        || (Math.abs(candidate.improvement - best.improvement) <= 1e-9
          && Math.abs(candidate.exposureImprovement - best.exposureImprovement) <= 1e-9
          && candidate.nextOverBill < best.nextOverBill - 1e-9)
        || (Math.abs(candidate.improvement - best.improvement) <= 1e-9
          && Math.abs(candidate.exposureImprovement - best.exposureImprovement) <= 1e-9
          && Math.abs(candidate.nextOverBill - best.nextOverBill) <= 1e-9
          && `${candidate.incoming.playerId}:${candidate.outgoing.playerId}`
            < `${best.incoming.playerId}:${best.outgoing.playerId}`)) {
        best = candidate;
      }
    };

    for (let outgoingIndex = 0; outgoingIndex < oldOverRoster.length; outgoingIndex += 1) {
      const outgoing = oldOverRoster[outgoingIndex];
      if (!isFuture(outgoing)) continue;
      for (let unusedIndex = 0; unusedIndex < unused.length; unusedIndex += 1) {
        const incoming = unused[unusedIndex];
        const nextOverRoster = [...oldOverRoster];
        nextOverRoster[outgoingIndex] = incoming;
        if (!isLegalRoster(nextOverRoster.map((player) => player.shape))) continue;
        const nextOverBill = bill(overClubIndex, nextOverRoster).allInCost;
        const nextOverage = snakeMoneyOverage(nextOverBill, input.clubs[overClubIndex].budgetRemaining);
        const improvement = oldOverage - nextOverage;
        const exposureImprovement = taxExposure(outgoing) - taxExposure(incoming);
        if (improvement < -1e-9 || (improvement <= 1e-9 && exposureImprovement <= 1e-9)) continue;
        consider({
          nextOverRoster,
          unusedIndex,
          outgoing,
          incoming,
          improvement,
          exposureImprovement,
          nextOverBill,
        });
      }
    }

    for (let otherClubIndex = 0; otherClubIndex < rosters.length; otherClubIndex += 1) {
      if (otherClubIndex === overClubIndex) continue;
      const oldOtherRoster = rosters[otherClubIndex];
      const oldOtherOverage = currentOverages[otherClubIndex];
      for (let outgoingIndex = 0; outgoingIndex < oldOverRoster.length; outgoingIndex += 1) {
        const outgoing = oldOverRoster[outgoingIndex];
        if (!isFuture(outgoing)) continue;
        for (let incomingIndex = 0; incomingIndex < oldOtherRoster.length; incomingIndex += 1) {
          const incoming = oldOtherRoster[incomingIndex];
          if (!isFuture(incoming)) continue;
          const nextOverRoster = [...oldOverRoster];
          const nextOtherRoster = [...oldOtherRoster];
          nextOverRoster[outgoingIndex] = incoming;
          nextOtherRoster[incomingIndex] = outgoing;
          if (!isLegalRoster(nextOverRoster.map((player) => player.shape))
            || !isLegalRoster(nextOtherRoster.map((player) => player.shape))) continue;
          const nextOverBill = bill(overClubIndex, nextOverRoster).allInCost;
          const nextOtherBill = bill(otherClubIndex, nextOtherRoster).allInCost;
          const nextOverage = snakeMoneyOverage(nextOverBill, input.clubs[overClubIndex].budgetRemaining);
          const nextOtherOverage = snakeMoneyOverage(nextOtherBill, input.clubs[otherClubIndex].budgetRemaining);
          const improvement = oldOverage + oldOtherOverage - nextOverage - nextOtherOverage;
          if (improvement <= 1e-9) continue;
          consider({
            nextOverRoster,
            nextOtherRoster,
            otherClubIndex,
            outgoing,
            incoming,
            improvement,
            exposureImprovement: 0,
            nextOverBill,
          });
        }
      }
    }

    if (!best) return null;
    const winner = best as TaxRepairCandidate;
    rosters[overClubIndex] = winner.nextOverRoster;
    if (winner.otherClubIndex !== undefined && winner.nextOtherRoster) {
      rosters[winner.otherClubIndex] = winner.nextOtherRoster;
    } else if (winner.unusedIndex !== undefined) {
      unused[winner.unusedIndex] = winner.outgoing;
    }
  }

  if (rosters.some((roster) => roster.length !== LEGAL_ROSTER.size
    || !isLegalRoster(roster.map((player) => player.shape)))) return null;
  const assignments: SnakeSeatingAssignment[] = rosters.map((roster, clubIndex) => ({
    teamId: input.clubs[clubIndex].teamId,
    playerIds: roster.filter(isFuture).map((player) => player.playerId),
    ...bill(clubIndex, roster),
  }));
  const representativeById = new Map(representatives.map((player) => [player.playerId, player]));
  const assignedIds = assignments.flatMap((assignment) => assignment.playerIds);
  const assignedPlayers = assignedIds
    .map((playerId) => representativeById.get(playerId))
    .filter((player): player is SnakeSeatingPlayer => Boolean(player));
  const assignedGroups = assignedPlayers.map(deriveVersionGroupId);
  if (assignedPlayers.length !== assignedIds.length
    || new Set(assignedIds).size !== assignedIds.length
    || new Set(assignedGroups).size !== assignedGroups.length
    || assignments.some((assignment, index) => (
      !snakeMoneyAffordable(assignment.allInCost, input.clubs[index].budgetRemaining)
    ))) return null;
  return assignments;
}

/**
 * Global matcher for an in-progress draft. Every already drafted player is first matched into a
 * slot owned by that club and remains mandatory while augmenting paths fill every open seat from
 * the one shared pool. This is the partial-state counterpart to `seatAllClubs`: it removes the
 * order-dependent false negatives caused by completing clubs one at a time.
 */
interface PartialMatcherRestriction {
  backupCHittersOnly?: boolean;
  swingHittersOnly?: boolean;
}

function provePartialSetupGlobally(
  input: SimultaneousSnakeSeatingInput,
  players: readonly SnakeSeatingPlayer[],
  restriction: PartialMatcherRestriction = {},
): SnakeSeatingProof | null {
  if (input.clubs.every((club) => club.roster.length === 0)) return null;
  const representatives = representativeCards(players);
  const fixedGroupOwners = new Map<string, number>();
  for (let clubIndex = 0; clubIndex < input.clubs.length; clubIndex += 1) {
    for (const player of input.clubs[clubIndex].roster) {
      const groupId = deriveVersionGroupId(player);
      if (fixedGroupOwners.has(groupId)) return null;
      fixedGroupOwners.set(groupId, clubIndex);
    }
  }
  const availableFuture = representatives.filter((player) => !fixedGroupOwners.has(deriveVersionGroupId(player)));
  const candidates = [
    ...input.clubs.flatMap((club, ownerClubIndex) => club.roster.map((player) => ({
      player,
      ownerClubIndex,
      fixed: true,
    }))),
    ...availableFuture.map((player) => ({ player, ownerClubIndex: -1, fixed: false })),
  ];
  const designPlayers = candidates.map(({ player }) => toGlobalDesignPlayer(player));
  const slots = buildDefaultDesignSlots();
  const globalSlots = input.clubs.flatMap((_, clubIndex) => slots.map((slot, localSlotIndex) => ({
    clubIndex,
    localSlotIndex,
    slot,
  })));
  const eligibleForPartialSlot = (slot: (typeof slots)[number], candidateIndex: number) => {
    const player = candidates[candidateIndex].player;
    if (restriction.backupCHittersOnly && slot.kind === 'backupC' && player.shape.isPitcher) return false;
    if (restriction.swingHittersOnly && slot.kind === 'swing' && player.shape.isPitcher) return false;
    return isDesignPlayerEligibleForSlot(slot, designPlayers[candidateIndex]);
  };
  const candidateIndicesBySlot = globalSlots.map(({ clubIndex, slot }) => candidates
    .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
    .filter(({ candidate }) => !candidate.fixed || candidate.ownerClubIndex === clubIndex)
    .filter(({ candidateIndex }) => eligibleForPartialSlot(slot, candidateIndex))
    .sort((left, right) => (
      Number(right.candidate.fixed) - Number(left.candidate.fixed)
      || left.candidate.player.price - right.candidate.player.price
      || left.candidate.player.playerId.localeCompare(right.candidate.player.playerId)
    ))
    .map(({ candidateIndex }) => candidateIndex));

  const playerOfSlot: (number | null)[] = globalSlots.map(() => null);
  const slotOfPlayer = new Map<number, number>();
  const eligibleSlotsByPlayer = candidates.map((candidate, candidateIndex) => globalSlots
    .map((slot, slotIndex) => ({ slot, slotIndex }))
    .filter(({ slot }) => !candidate.fixed || candidate.ownerClubIndex === slot.clubIndex)
    .filter(({ slot }) => eligibleForPartialSlot(slot.slot, candidateIndex))
    .map(({ slotIndex }) => slotIndex));

  const placeFixed = (candidateIndex: number, visitedSlots: Set<number>): boolean => {
    const orderedSlots = [...eligibleSlotsByPlayer[candidateIndex]].sort((left, right) => (
      candidateIndicesBySlot[left].length - candidateIndicesBySlot[right].length || left - right
    ));
    for (const slotIndex of orderedSlots) {
      if (visitedSlots.has(slotIndex)) continue;
      visitedSlots.add(slotIndex);
      const holder = playerOfSlot[slotIndex];
      if (holder === null || (candidates[holder].fixed && placeFixed(holder, visitedSlots))) {
        playerOfSlot[slotIndex] = candidateIndex;
        slotOfPlayer.set(candidateIndex, slotIndex);
        return true;
      }
    }
    return false;
  };
  const fixedIndices = candidates
    .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
    .filter(({ candidate }) => candidate.fixed)
    .sort((left, right) => (
      eligibleSlotsByPlayer[left.candidateIndex].length - eligibleSlotsByPlayer[right.candidateIndex].length
      || left.candidate.player.playerId.localeCompare(right.candidate.player.playerId)
    ));
  for (const { candidateIndex } of fixedIndices) {
    if (!placeFixed(candidateIndex, new Set())) return null;
  }

  // Match future players cheapest-first, augmenting their slot assignment as each card enters.
  // Matchable player sets form a transversal matroid, so this greedy basis is the minimum-salary
  // extension of the mandatory drafted set. A slot-first maximum match is legality-correct but can
  // needlessly select expensive slack and then falsely report that every club is over budget.
  const placeFuture = (candidateIndex: number, visitedSlots: Set<number>): boolean => {
    const orderedSlots = [...eligibleSlotsByPlayer[candidateIndex]].sort((left, right) => (
      candidateIndicesBySlot[left].length - candidateIndicesBySlot[right].length || left - right
    ));
    for (const slotIndex of orderedSlots) {
      if (visitedSlots.has(slotIndex)) continue;
      visitedSlots.add(slotIndex);
      const holder = playerOfSlot[slotIndex];
      if (holder === null || placeFuture(holder, visitedSlots)) {
        playerOfSlot[slotIndex] = candidateIndex;
        slotOfPlayer.set(candidateIndex, slotIndex);
        return true;
      }
    }
    return false;
  };
  let matchedCount = fixedIndices.length;
  const futureIndices = candidates
    .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
    .filter(({ candidate }) => !candidate.fixed)
    .sort((left, right) => (
      left.candidate.player.price - right.candidate.player.price
      || left.candidate.player.playerId.localeCompare(right.candidate.player.playerId)
    ));
  for (const { candidateIndex } of futureIndices) {
    if (matchedCount >= globalSlots.length) break;
    if (placeFuture(candidateIndex, new Set())) matchedCount += 1;
  }
  if (matchedCount !== globalSlots.length || playerOfSlot.some((candidateIndex) => candidateIndex === null)) return null;

  if (fixedIndices.some(({ candidateIndex }) => !slotOfPlayer.has(candidateIndex))) return null;
  const matchedRosters = input.clubs.map((_, clubIndex) => globalSlots
    .map((slot, slotIndex) => ({ slot, candidateIndex: playerOfSlot[slotIndex] }))
    .filter(({ slot }) => slot.clubIndex === clubIndex)
    .map(({ candidateIndex }) => candidateIndex === null ? null : candidates[candidateIndex].player)
    .filter((player): player is SnakeSeatingPlayer => Boolean(player)));
  const legal = matchedRosters.every((roster) => roster.length === LEGAL_ROSTER.size
    && isLegalRoster(roster.map((player) => player.shape)));
  if (!legal) {
    if (!restriction.backupCHittersOnly && !restriction.swingHittersOnly) {
      return provePartialSetupGlobally(input, players, { backupCHittersOnly: true })
        ?? provePartialSetupGlobally(input, players, { swingHittersOnly: true })
        ?? provePartialSetupGlobally(input, players, {
          backupCHittersOnly: true,
          swingHittersOnly: true,
        });
    }
    return null;
  }
  const assignments = repairMatchedRosters(input, availableFuture, matchedRosters);
  return assignments
    ? { feasible: true, assignments, shortfall: null, message: 'EVERY CLUB CAN FINISH A LEGAL 22.' }
    : null;
}

/**
 * Canonical-law fallback for partial states that cannot be represented by the design-slot
 * matcher (catcher coverage can satisfy two roster laws at once, while a one-card/one-slot frame
 * cannot express that overlap). All clubs are completed before any money verdict; the shared
 * repair then balances those legal rosters as a league instead of falsely failing the last club
 * that happened to receive the expensive half of the pool.
 */
function provePartialWithLeagueRepair(
  input: SimultaneousSnakeSeatingInput,
  players: readonly SnakeSeatingPlayer[],
): SnakeSeatingProof | null {
  if (input.clubs.every((club) => club.roster.length === 0)) return null;
  const representatives = representativeCards(players);
  const scarcityOrder = input.clubs
    .map((club, clubIndex) => ({ club, clubIndex }))
    .sort((left, right) => (
      scarcityScore(left.club, representatives) - scarcityScore(right.club, representatives)
      || left.club.teamId.localeCompare(right.club.teamId)
    ));
  const orders = [scarcityOrder, [...scarcityOrder].reverse()];

  for (const order of orders) {
    let remaining = [...representatives];
    const fullRosters: SnakeSeatingPlayer[][] = input.clubs.map(() => []);
    let complete = true;
    for (const { club, clubIndex } of order) {
      const openSlots = LEGAL_ROSTER.size - club.roster.length;
      const quote = cheapestLegalCompletion(
        club.roster.map((player) => player.shape),
        remaining.map((player) => ({ id: player.playerId, price: player.price, shape: player.shape })),
        openSlots,
      );
      const picked = quote.pickIds
        .map((playerId) => remaining.find((player) => player.playerId === playerId))
        .filter((player): player is SnakeSeatingPlayer => Boolean(player));
      const fullRoster = [...club.roster, ...picked];
      if (!quote.feasible || picked.length !== openSlots
        || !isLegalRoster(fullRoster.map((player) => player.shape))) {
        complete = false;
        break;
      }
      fullRosters[clubIndex] = fullRoster;
      const usedGroups = new Set(picked.map(deriveVersionGroupId));
      remaining = remaining.filter((player) => !usedGroups.has(deriveVersionGroupId(player)));
    }
    if (!complete) continue;
    const assignments = repairMatchedRosters(input, representatives, fullRosters);
    if (assignments) {
      return { feasible: true, assignments, shortfall: null, message: 'EVERY CLUB CAN FINISH A LEGAL 22.' };
    }
  }
  return null;
}

/**
 * At setup every club is empty, so the proof must allocate all 22×N seats in one shared
 * matching. Running `cheapestLegalCompletion` once per club is not a simultaneous proof: an
 * early club can consume the cheap cards and create a false affordability failure for the last
 * club even when a fair, disjoint allocation exists. The global roster-design matcher owns the
 * cross-club augmenting paths and budget swaps needed to produce that certificate.
 */
function proveEmptySetupGlobally(
  input: SimultaneousSnakeSeatingInput,
  players: readonly SnakeSeatingPlayer[],
): SnakeSeatingProof | null {
  if (!input.clubs.every((club) => club.roster.length === 0)) return null;
  const representatives = representativeCards(players);
  const minimumBudget = Math.min(...input.clubs.map((club) => club.budgetRemaining));
  const global = seatAllClubs(
    representatives.map(toGlobalDesignPlayer),
    input.clubs.length,
    minimumBudget,
  );
  const playerById = new Map(representatives.map((player) => [player.playerId, player]));
  const globalRosters = global.assemblies.map((assembly) => assembly
    .map((playerId) => playerById.get(playerId))
    .filter((player): player is SnakeSeatingPlayer => Boolean(player)));
  const globalMatchingUsable = globalRosters.length === input.clubs.length
    && globalRosters.every((roster) => roster.length === LEGAL_ROSTER.size
      && isLegalRoster(roster.map((player) => player.shape)));

  const buildSequentialRosters = (): SnakeSeatingPlayer[][] | null => {
    const rosters: SnakeSeatingPlayer[][] = [];
    let sequentialRemaining = [...representatives];
    for (let clubIndex = 0; clubIndex < input.clubs.length; clubIndex += 1) {
      const candidates: CompletionCandidate[] = sequentialRemaining.map((player) => ({
        id: player.playerId,
        price: player.price,
        shape: player.shape,
      }));
      const quote = cheapestLegalCompletion([], candidates, LEGAL_ROSTER.size);
      const picked = quote.pickIds
        .map((playerId) => sequentialRemaining.find((player) => player.playerId === playerId))
        .filter((player): player is SnakeSeatingPlayer => Boolean(player));
      if (!quote.feasible || picked.length !== LEGAL_ROSTER.size
        || !isLegalRoster(picked.map((player) => player.shape))) return null;
      rosters.push(picked);
      const usedGroups = new Set(picked.map(deriveVersionGroupId));
      sequentialRemaining = sequentialRemaining.filter((player) => !usedGroups.has(deriveVersionGroupId(player)));
    }
    return rosters;
  };

  // Try the true cross-club matching first even when its salary-only budget verdict was false;
  // its legal augmenting paths may preserve scarce-role combinations a sequential seed cannot.
  // If exact cost repair cannot balance that matching, independently try the cheapest-disjoint
  // seed. Either success is a fully checked certificate; neither failure is misreported as proof.
  const globalAssignments = globalMatchingUsable
    ? repairMatchedRosters(input, representatives, globalRosters)
    : null;
  if (globalAssignments) {
    return { feasible: true, assignments: globalAssignments, shortfall: null, message: 'EVERY CLUB CAN FINISH A LEGAL 22.' };
  }
  const sequentialRosters = buildSequentialRosters();
  const sequentialAssignments = sequentialRosters
    ? repairMatchedRosters(input, representatives, sequentialRosters)
    : null;
  return sequentialAssignments
    ? { feasible: true, assignments: sequentialAssignments, shortfall: null, message: 'EVERY CLUB CAN FINISH A LEGAL 22.' }
    : null;
}

type IdentityMatchStrategy = 'seed-fit' | 'fit-value' | 'value-fit' | 'cheap-fit';

type IdentityProofFailureDetail = Exclude<
  NonNullable<SnakeSeatingShortfall['detail']>,
  'roster-composition'
>;

interface IdentitySetupFailure {
  teamId?: string;
  identityName?: string;
  detail: IdentityProofFailureDetail;
  available: number;
  needed: number;
}

interface IdentitySetupAttempt {
  proof: SnakeSeatingProof | null;
  failure: IdentitySetupFailure | null;
}

/**
 * The slot matcher below is intentionally generic: it can find any legal global matching, then
 * asks the canonical validator whether each resulting roster embodies its club identity. On a
 * deep stock pool that can repeatedly land on legal/value-safe rosters whose boosted cohort sits
 * at or below the source mean even though disjoint identity-true rosters exist.
 *
 * Give the canonical identity builder a bounded chance to construct those rosters directly. Club
 * order is the only degree of freedom: every selected card is consumed by version group before the
 * next club builds. A resulting assignment is still only a candidate; the unchanged independent
 * validator below must recompute Full Sources baselines, exact settlement money, strict positive
 * embodiment, legality, and person/version disjointness before SUCCESS can escape this function.
 */
function proveIdentitySetupFromDisjointBuilds(
  input: SimultaneousSnakeSeatingInput,
  players: readonly SnakeSeatingPlayer[],
  contexts: readonly ({
    archetype: SimArchetype;
    reference: readonly SimPlayer[];
    taxCaps: readonly LuxuryCapRow[];
    seed: ReturnType<typeof buildIdentityRoster>;
    requiredIv: number;
    seedIds: ReadonlySet<string>;
  } | null)[],
): SnakeSeatingProof | null {
  if (contexts.some((context) => context === null)) return null;
  const completeContexts = contexts as readonly NonNullable<(typeof contexts)[number]>[];
  if (completeContexts.some((context) => (
    !context.seed.legalRoster
    || !context.seed.solvent
    || !context.seed.floorMet
    || context.seed.embodiment.boostZ <= 0
  ))) return null;

  const playerById = new Map(players.map((player) => [player.playerId, player]));
  const naturalOrder = input.clubs.map((_, clubIndex) => clubIndex);
  const seedGroups = completeContexts.map((context) => new Set(
    [...context.seedIds].flatMap((playerId) => {
      const player = playerById.get(playerId);
      return player ? [deriveVersionGroupId(player)] : [];
    }),
  ));
  const overlapCounts = completeContexts.map((_, clubIndex) => {
    let overlap = 0;
    for (const groupId of seedGroups[clubIndex]) {
      if (seedGroups.some((other, otherIndex) => (
        otherIndex !== clubIndex && other.has(groupId)
      ))) overlap += 1;
    }
    return overlap;
  });
  const rawOrders = [
    naturalOrder,
    [...naturalOrder].reverse(),
    [...naturalOrder].sort((left, right) => (
      overlapCounts[right] - overlapCounts[left]
      || input.clubs[left].teamId.localeCompare(input.clubs[right].teamId)
    )),
    [...naturalOrder].sort((left, right) => (
      overlapCounts[left] - overlapCounts[right]
      || input.clubs[left].teamId.localeCompare(input.clubs[right].teamId)
    )),
  ];
  const seenOrders = new Set<string>();

  for (const order of rawOrders) {
    const orderKey = order.join('|');
    if (seenOrders.has(orderKey)) continue;
    seenOrders.add(orderKey);
    let remaining = [...players];
    const rosters: SnakeSeatingPlayer[][] = input.clubs.map(() => []);
    let complete = true;

    for (const clubIndex of order) {
      const club = input.clubs[clubIndex];
      const context = completeContexts[clubIndex];
      const remainingReference = uniqueIdentityReference(remaining, context.archetype, input.tier ?? 'standard');
      const requiredIv = context.requiredIv;
      let built = remaining.length === players.length
        ? context.seed
        : buildIdentityCertificateRoster({
            reference: remainingReference,
            embodimentReference: [...context.reference],
            archetype: context.archetype,
            tier: input.tier ?? 'standard',
            budget: club.budgetRemaining,
            realTeamCount: input.realTeamCount,
            taxCaps: context.taxCaps,
          });
      if (built.totalIv < requiredIv - 1e-9) {
        if (!Number.isFinite(built.baselineIv) || built.baselineIv <= 0) {
          complete = false;
          break;
        }
        built = buildIdentityCertificateRoster({
          reference: remainingReference,
          embodimentReference: [...context.reference],
          archetype: context.archetype,
          tier: input.tier ?? 'standard',
          budget: club.budgetRemaining,
          realTeamCount: input.realTeamCount,
          taxCaps: context.taxCaps,
          // The public proof law anchors its IV floor to the immutable canonical source shortlist,
          // not to whichever cards a previous club left behind. Translate that exact floor onto
          // this remaining-pool build.
          valueFloorOverride: requiredIv / built.baselineIv,
        });
      }
      const roster = built.players
        .map((player) => playerById.get(player.id))
        .filter((player): player is SnakeSeatingPlayer => Boolean(player));
      if (roster.length !== LEGAL_ROSTER.size
        || !built.legalRoster
        || !built.solvent
        || !built.floorMet
        || built.totalIv < requiredIv - 1e-9
        || built.embodiment.boostZ <= 0
        || !isLegalRoster(roster.map((player) => player.shape))) {
        complete = false;
        break;
      }
      rosters[clubIndex] = roster;
      const usedGroups = new Set(roster.map(deriveVersionGroupId));
      remaining = remaining.filter((player) => !usedGroups.has(deriveVersionGroupId(player)));
    }
    if (!complete) continue;

    const repairRepresentativeByGroup = new Map(rosters.flatMap((roster) => roster.map((player) => [
      deriveVersionGroupId(player),
      player,
    ] as const)));
    for (const player of [...players].sort((left, right) => (
      left.price - right.price || left.playerId.localeCompare(right.playerId)
    ))) {
      const groupId = deriveVersionGroupId(player);
      if (!repairRepresentativeByGroup.has(groupId)) repairRepresentativeByGroup.set(groupId, player);
    }
    const assignments = repairMatchedRosters(input, [...repairRepresentativeByGroup.values()], rosters);
    if (!assignments) continue;
    const proof: SnakeSeatingProof = {
      feasible: true,
      assignments,
      shortfall: null,
      message: 'EVERY CLUB CAN FINISH A LEGAL, AFFORDABLE 22 THAT FITS ITS CHOSEN IDENTITY.',
    };
    if (validateConstructiveSnakeSeatingProof(input, proof)) return proof;
  }
  return null;
}

function proveIdentitySetupConstructively(
  input: SimultaneousSnakeSeatingInput,
  players: readonly SnakeSeatingPlayer[],
): IdentitySetupAttempt | null {
  if (!input.clubs.every((club) => club.roster.length === 0)
    || !input.clubs.some((club) => club.identityArchetype)) return null;
  const tier = input.tier ?? 'standard';
  const normalizedCaps = snakeLuxuryCaps([...input.baseCaps]);
  const proofPlayers = identityProofCandidatePlayers(input, players);
  const sourcePlayers = identityReferenceCards(input);
  const contexts = input.clubs.map((club) => {
    if (!club.identityArchetype) return null;
    const reference = uniqueIdentityReference(sourcePlayers, club.identityArchetype, tier);
    const candidateReference = uniqueIdentityReference(proofPlayers, club.identityArchetype, tier);
    const taxCaps = club.capIdentity
      ? shiftLuxuryCaps([...normalizedCaps], club.capIdentity)
      : [...normalizedCaps];
    const sourceBaseline = buildIdentityValueBaseline(
      reference,
      club.identityArchetype,
      tier,
      club.budgetRemaining,
      {
        realTeamCount: input.realTeamCount,
        taxCaps,
        affordabilityLaw: 'snake-money',
        posture: 'optimal',
      },
    );
    const requiredIv = sourceBaseline.baselineIv * sourceBaseline.valueFloor;
    let seed = buildIdentityCertificateRoster({
      reference: candidateReference,
      embodimentReference: reference,
      archetype: club.identityArchetype,
      tier,
      budget: club.budgetRemaining,
      realTeamCount: input.realTeamCount,
      taxCaps,
    });
    if (seed.totalIv < requiredIv - 1e-9 && seed.baselineIv > 0) {
      seed = buildIdentityCertificateRoster({
        reference: candidateReference,
        embodimentReference: reference,
        archetype: club.identityArchetype,
        tier,
        budget: club.budgetRemaining,
        realTeamCount: input.realTeamCount,
        taxCaps,
        valueFloorOverride: requiredIv / seed.baselineIv,
      });
    }
    return {
      archetype: club.identityArchetype,
      reference,
      taxCaps,
      seed,
      requiredIv,
      scorer: archetypeFitScorer(club.identityArchetype, tier, 'optimal', reference),
      seedIds: new Set(seed.players.map((player) => player.id)),
      zeroVarianceIdentity: seed.embodiment.boostRows.length > 0
        && seed.embodiment.boostRows.every((row) => row.poolStd <= 0),
    };
  });
  // Exact early impossibility under the canonical strict-z gate: when every boosted cohort has
  // zero variance, every possible roster has z=0 and no roster can clear the required >0.
  const zeroVarianceClubIndex = contexts.findIndex((context) => context?.zeroVarianceIdentity);
  if (zeroVarianceClubIndex >= 0) {
    const context = contexts[zeroVarianceClubIndex]!;
    return {
      proof: null,
      failure: {
        teamId: input.clubs[zeroVarianceClubIndex].teamId,
        identityName: context.archetype.name,
        detail: 'identity-embodiment',
        available: 0,
        needed: 0,
      },
    };
  }
  const directIdentityProof = proveIdentitySetupFromDisjointBuilds(input, proofPlayers, contexts);
  if (directIdentityProof) return { proof: directIdentityProof, failure: null };
  const slots = buildDefaultDesignSlots();
  const globalSlots = input.clubs.flatMap((_, clubIndex) => slots.map((slot, localSlotIndex) => ({
    clubIndex,
    localSlotIndex,
    slot,
  })));
  const designById = new Map(proofPlayers.map((player) => [player.playerId, toGlobalDesignPlayer(player)]));
  const exposure = (player: SnakeSeatingPlayer) => {
    const bat = player.construction.bat;
    const pit = player.construction.pit;
    return bat.POW + bat.CON + bat.SPD + bat.FLD + bat.ARM
      + (pit?.VEL ?? 0) + (pit?.JNK ?? 0) + (pit?.ACC ?? 0);
  };
  const strategies: readonly IdentityMatchStrategy[] = ['seed-fit', 'fit-value', 'value-fit', 'cheap-fit'];
  const restrictions = [
    { backupCHittersOnly: false, swingHittersOnly: false },
    { backupCHittersOnly: true, swingHittersOnly: false },
    { backupCHittersOnly: false, swingHittersOnly: true },
    { backupCHittersOnly: true, swingHittersOnly: true },
  ] as const;

  for (const restriction of restrictions) {
    for (const strategy of strategies) {
      const edgesBySlot = globalSlots.map(({ clubIndex, slot }) => {
        const context = contexts[clubIndex];
        const bestByGroup = new Map<string, SnakeSeatingPlayer>();
        const compare = (left: SnakeSeatingPlayer, right: SnakeSeatingPlayer) => {
          const leftSim = toIdentitySimPlayer(left);
          const rightSim = toIdentitySimPlayer(right);
          const leftSeed = Number(context?.seedIds.has(left.playerId) ?? false);
          const rightSeed = Number(context?.seedIds.has(right.playerId) ?? false);
          const leftFit = context?.scorer(leftSim) ?? 0;
          const rightFit = context?.scorer(rightSim) ?? 0;
          if (strategy === 'seed-fit') return rightSeed - leftSeed || rightFit - leftFit
            || right.price - left.price || left.playerId.localeCompare(right.playerId);
          if (strategy === 'fit-value') return rightFit - leftFit || right.price - left.price
            || left.playerId.localeCompare(right.playerId);
          if (strategy === 'value-fit') return right.price - left.price || rightFit - leftFit
            || left.playerId.localeCompare(right.playerId);
          return left.price - right.price || exposure(left) - exposure(right)
            || rightFit - leftFit || left.playerId.localeCompare(right.playerId);
        };
        for (const player of proofPlayers) {
          if (restriction.backupCHittersOnly && slot.kind === 'backupC' && player.shape.isPitcher) continue;
          if (restriction.swingHittersOnly && slot.kind === 'swing' && player.shape.isPitcher) continue;
          if (!isDesignPlayerEligibleForSlot(slot, designById.get(player.playerId)!)) continue;
          const groupId = deriveVersionGroupId(player);
          const current = bestByGroup.get(groupId);
          if (!current || compare(player, current) < 0) bestByGroup.set(groupId, player);
        }
        return [...bestByGroup.entries()]
          .map(([groupId, player]) => ({ groupId, player }))
          .sort((left, right) => compare(left.player, right.player));
      });

      for (const reverseOrder of [false, true]) {
        const slotOrder = globalSlots.map((_, slotIndex) => slotIndex).sort((left, right) => (
          edgesBySlot[left].length - edgesBySlot[right].length
          || (reverseOrder ? right - left : left - right)
        ));
        const ownerSlotByGroup = new Map<string, number>();
        const cardByGroup = new Map<string, SnakeSeatingPlayer>();
        const assign = (slotIndex: number, seenGroups: Set<string>): boolean => {
          for (const edge of edgesBySlot[slotIndex]) {
            if (seenGroups.has(edge.groupId)) continue;
            seenGroups.add(edge.groupId);
            const ownerSlot = ownerSlotByGroup.get(edge.groupId);
            if (ownerSlot !== undefined && !assign(ownerSlot, seenGroups)) continue;
            ownerSlotByGroup.set(edge.groupId, slotIndex);
            cardByGroup.set(edge.groupId, edge.player);
            return true;
          }
          return false;
        };
        if (slotOrder.some((slotIndex) => !assign(slotIndex, new Set()))) continue;
        const groupBySlot = new Map([...ownerSlotByGroup.entries()].map(([groupId, slotIndex]) => [slotIndex, groupId]));
        const rosters = input.clubs.map((_, clubIndex) => globalSlots
          .map((globalSlot, slotIndex) => ({ globalSlot, groupId: groupBySlot.get(slotIndex) }))
          .filter(({ globalSlot }) => globalSlot.clubIndex === clubIndex)
          .map(({ groupId }) => groupId ? cardByGroup.get(groupId) : undefined)
          .filter((player): player is SnakeSeatingPlayer => Boolean(player)));
        if (rosters.some((roster) => roster.length !== LEGAL_ROSTER.size
          || !isLegalRoster(roster.map((player) => player.shape)))) continue;

        const assignedCardByGroup = new Map(rosters.flatMap((roster) => roster.map((player) => [
          deriveVersionGroupId(player),
          player,
        ] as const)));
        const repairRepresentativeByGroup = new Map<string, SnakeSeatingPlayer>(assignedCardByGroup);
        for (const player of [...proofPlayers].sort((left, right) => (
          left.price - right.price || exposure(left) - exposure(right) || left.playerId.localeCompare(right.playerId)
        ))) {
          const groupId = deriveVersionGroupId(player);
          if (!repairRepresentativeByGroup.has(groupId)) repairRepresentativeByGroup.set(groupId, player);
        }
        const assignments = repairMatchedRosters(input, [...repairRepresentativeByGroup.values()], rosters);
        if (!assignments) continue;
        const proof: SnakeSeatingProof = {
          feasible: true,
          assignments,
          shortfall: null,
          message: 'EVERY CLUB CAN FINISH A LEGAL, AFFORDABLE 22 THAT FITS ITS CHOSEN IDENTITY.',
        };
        // Bounded search may miss a certificate; it may never mint one. This independent seam
        // rechecks unique people, roster law, exact money, optimal-posture value floor, and strict
        // positive embodiment before SUCCESS can reach Lock or GO.
        if (validateConstructiveSnakeSeatingProof(input, proof)) {
          return { proof, failure: null };
        }
      }
    }
  }
  return {
    proof: null,
    // Every search above is bounded. Failure to find one simultaneous certificate is UNKNOWN,
    // not proof that the first club seed or any one resource caused the joint search to stop.
    failure: {
      detail: 'identity-joint-assignment',
      available: 0,
      needed: input.clubs.length,
    },
  };
}

function identityProofUnknown(
  clubs: readonly SnakeSeatingClub[],
  failure: IdentitySetupFailure | null,
): SnakeSeatingProof {
  const detail = failure?.detail ?? 'identity-joint-assignment';
  const labelByDetail: Record<IdentityProofFailureDetail, string> = {
    'identity-legal-roster': 'IDENTITY LEGAL 22',
    'identity-affordability': 'IDENTITY BUDGET ROOM',
    'identity-value-floor': 'IDENTITY VALUE FLOOR',
    'identity-embodiment': 'IDENTITY FIT',
    'identity-joint-assignment': 'SHARED IDENTITY SUPPORT',
  };
  const available = failure?.available ?? 0;
  const needed = failure?.needed ?? clubs.length;
  const shortfall: SnakeSeatingShortfall = {
    kind: 'identity-proof-unknown',
    position: 'IDENTITY',
    label: labelByDetail[detail],
    minimumPerTeam: 0,
    teams: clubs.length,
    slack: 0,
    needed,
    available,
    missing: Math.max(0, needed - available),
    reason: 'identity-proof-unknown',
    shortBy: 0,
    affectedClubs: failure?.teamId ? 1 : clubs.length,
    teamId: failure?.teamId,
    identityName: failure?.identityName,
    detail,
  };
  return { feasible: false, assignments: [], shortfall, message: copyLawMessage(shortfall) };
}

/**
 * Exact final-round matcher. When every club is complete or missing one card, keep every version's
 * real roster shape while matching on unique people. This avoids collapsing a person with SP and
 * CP cards to whichever version happens to be cheaper.
 */
function proveSingleOpenSeatClubs(
  input: SimultaneousSnakeSeatingInput,
  players: readonly SnakeSeatingPlayer[],
): SnakeSeatingProof | null {
  const openByClub = input.clubs.map((club) => LEGAL_ROSTER.size - club.roster.length);
  if (openByClub.some((open) => open < 0 || open > 1)) return null;
  const normalizedCaps = snakeLuxuryCaps([...input.baseCaps]);
  type Edge = {
    groupId: string;
    player: SnakeSeatingPlayer;
    salaryCost: number;
    addedTax: number;
    allInCost: number;
  };
  const edgesByClub = input.clubs.map((club, clubIndex): Edge[] => {
    if (openByClub[clubIndex] === 0) return [];
    const shiftedCaps = club.capIdentity
      ? shiftLuxuryCaps([...normalizedCaps], club.capIdentity)
      : [...normalizedCaps];
    const committed = club.committedConstruction
      ? [...club.committedConstruction]
      : club.roster.map((player) => player.construction);
    const currentTax = luxuryTax(committed, shiftedCaps, 'taxed').charged;
    const bestByGroup = new Map<string, Edge>();
    for (const player of players) {
      if (!isLegalRoster([...club.roster, player].map((row) => row.shape))) continue;
      const finalTax = luxuryTax([...committed, player.construction], shiftedCaps, 'taxed').charged;
      const addedTax = finalTax - currentTax;
      const edge = {
        groupId: deriveVersionGroupId(player),
        player,
        salaryCost: player.price,
        addedTax,
        allInCost: player.price + addedTax,
      };
      if (!snakeMoneyAffordable(edge.allInCost, club.budgetRemaining)) continue;
      const prior = bestByGroup.get(edge.groupId);
      if (!prior || edge.allInCost < prior.allInCost
        || (edge.allInCost === prior.allInCost && edge.player.playerId.localeCompare(prior.player.playerId) < 0)) {
        bestByGroup.set(edge.groupId, edge);
      }
    }
    return [...bestByGroup.values()].sort((left, right) => (
      left.allInCost - right.allInCost || left.player.playerId.localeCompare(right.player.playerId)
    ));
  });
  const incompleteClubIndices = input.clubs
    .map((_, clubIndex) => clubIndex)
    .filter((clubIndex) => openByClub[clubIndex] === 1)
    .sort((left, right) => edgesByClub[left].length - edgesByClub[right].length || left - right);
  if (incompleteClubIndices.some((clubIndex) => edgesByClub[clubIndex].length === 0)) return null;

  const ownerByGroup = new Map<string, number>();
  const selectedByClub = new Map<number, Edge>();
  const assign = (clubIndex: number, seenGroups: Set<string>): boolean => {
    for (const edge of edgesByClub[clubIndex]) {
      if (seenGroups.has(edge.groupId)) continue;
      seenGroups.add(edge.groupId);
      const owner = ownerByGroup.get(edge.groupId);
      if (owner !== undefined && !assign(owner, seenGroups)) continue;
      ownerByGroup.set(edge.groupId, clubIndex);
      selectedByClub.set(clubIndex, edge);
      return true;
    }
    return false;
  };
  if (incompleteClubIndices.some((clubIndex) => !assign(clubIndex, new Set()))) return null;

  const proof: SnakeSeatingProof = {
    feasible: true,
    assignments: input.clubs.map((club, clubIndex) => {
      const edge = selectedByClub.get(clubIndex);
      return edge ? {
        teamId: club.teamId,
        playerIds: [edge.player.playerId],
        salaryCost: edge.salaryCost,
        addedTax: edge.addedTax,
        allInCost: edge.allInCost,
      } : {
        teamId: club.teamId,
        playerIds: [],
        salaryCost: 0,
        addedTax: 0,
        allInCost: 0,
      };
    }),
    shortfall: null,
    message: 'EVERY CLUB CAN FINISH A LEGAL 22.',
  };
  return validateConstructiveSnakeSeatingProof(input, proof) ? proof : null;
}

/**
 * Constructive simultaneous proof. Success is a certificate: every returned roster is verified by
 * the canonical law, every reserved human is disjoint, and each completion fits salary plus the
 * same normalized settlement tax. Clubs with the scarcest hard path reserve first; this can reject
 * conservatively, but it can never return the named per-club false pass because reservations are
 * consumed from one shared pool.
 */
export function proveSimultaneousSnakeSeating(input: SimultaneousSnakeSeatingInput): SnakeSeatingProof {
  let remaining = availableCards(input);
  const necessary = setupFloorShortfall(input.clubs, remaining)
    ?? namedNecessaryShortfall(input.clubs, remaining);
  if (necessary) return { feasible: false, assignments: [], shortfall: necessary, message: copyLawMessage(necessary) };

  const finalRoundProof = proveSingleOpenSeatClubs(input, remaining);
  if (finalRoundProof) return finalRoundProof;

  if (input.clubs.every((club) => club.roster.length === 0)
    && input.clubs.some((club) => club.identityArchetype)) {
    const supportCertificate = input.identitySupportCertificate;
    const supportBoundToSource = supportCertificate?.version === 1
      && Boolean(input.identityReferencePool)
      && supportCertificate.sourceFingerprint === identityCertificateSourceFingerprint(input)
      && supportCertificate.assignmentFingerprint === identityCertificateAssignmentFingerprint(
        supportCertificate.sourceFingerprint,
        supportCertificate.assignments,
      );
    if (supportCertificate && supportBoundToSource && supportCertificate.assignments.length === input.clubs.length) {
      const retainedSupport: SnakeSeatingProof = {
        feasible: true,
        assignments: supportCertificate.assignments.map((assignment) => ({
          ...assignment,
          playerIds: [...assignment.playerIds],
        })),
        shortfall: null,
        message: 'EVERY CLUB CAN FINISH A LEGAL, AFFORDABLE 22 THAT FITS ITS CHOSEN IDENTITY.',
      };
      // Identity was independently certified against the exact fingerprinted Full Sources input.
      // The shaped build retains those exact 176 IDs, so do not repeat the identity optimizer.
      // Recheck every property that the changed candidate membership can affect: availability,
      // distinct people, legal 22s, exact salary/tax bills, and affordability. Permanent source-
      // data regressions still run the full independent identity validator on the shaped result.
      if (validateConstructiveSnakeFinishProof(input, retainedSupport)) return retainedSupport;
    }
    const identityAttempt = proveIdentitySetupConstructively(input, remaining);
    if (identityAttempt?.proof) return identityAttempt.proof;
    const ordinaryInput: SimultaneousSnakeSeatingInput = {
      ...input,
      clubs: input.clubs.map((club) => ({ ...club, identityArchetype: undefined })),
    };
    const ordinaryProof = proveSimultaneousSnakeSeating(ordinaryInput);
    return ordinaryProof.feasible
      ? identityProofUnknown(input.clubs, identityAttempt?.failure ?? null)
      : ordinaryProof;
  }

  const globalSetupProof = proveEmptySetupGlobally(input, remaining);
  if (globalSetupProof) return globalSetupProof;
  const partialGlobalProof = provePartialSetupGlobally(input, remaining);
  if (partialGlobalProof) return partialGlobalProof;
  const partialLeagueRepairProof = provePartialWithLeagueRepair(input, remaining);
  if (partialLeagueRepairProof) return partialLeagueRepairProof;

  const assignments: SnakeSeatingAssignment[] = [];
  const clubs = [...input.clubs].sort((left, right) => (
    scarcityScore(left, remaining) - scarcityScore(right, remaining) || left.teamId.localeCompare(right.teamId)
  ));
  const normalizedCaps = snakeLuxuryCaps([...input.baseCaps]);

  for (const club of clubs) {
    const rosterShapes = club.roster.map((player) => player.shape);
    const rosterConstruction = club.committedConstruction
      ? [...club.committedConstruction]
      : club.roster.map((player) => player.construction);
    const openSlots = LEGAL_ROSTER.size - rosterShapes.length;
    const representatives = representativeCards(remaining);
    const candidates: CompletionCandidate[] = representatives.map((player) => ({
      id: player.playerId,
      price: player.price,
      shape: player.shape,
    }));
    const quote = cheapestLegalCompletion(rosterShapes, candidates, openSlots);
    const picked = quote.pickIds
      .map((playerId) => representatives.find((player) => player.playerId === playerId))
      .filter((player): player is SnakeSeatingPlayer => Boolean(player));
    if (!quote.feasible || picked.length !== openSlots || !isLegalRoster([
      ...rosterShapes,
      ...picked.map((player) => player.shape),
    ])) {
      const named = namedNecessaryShortfall([club], remaining);
      const catcherTarget = derivePositionSupplyFloorTargets(1)
        .find((target) => target.position === 'CATCHER_DEPTH')!;
      const jointMissing = Math.max(1, openSlots - picked.length);
      const fallback = named ?? (rosterNeedBreakdown(rosterShapes).catcherCoverNeed > 0
        ? {
          ...catcherTarget,
          kind: 'joint-assignment' as const,
          needed: rosterNeedBreakdown(rosterShapes).catcherCoverNeed,
          available: 0,
          missing: jointMissing,
          reason: 'joint-assignment' as const,
          shortBy: jointMissing,
          affectedClubs: input.clubs.length,
        }
        : {
          kind: 'joint-assignment' as const, position: 'ROSTER', label: 'LEGAL ROSTER PATHS',
          minimumPerTeam: 0, teams: input.clubs.length, slack: 0, needed: openSlots,
          available: picked.length, missing: jointMissing, reason: 'joint-assignment' as const,
          shortBy: jointMissing, affectedClubs: input.clubs.length,
        });
      const clubFallback: SnakeSeatingShortfall = {
        ...fallback,
        teamId: club.teamId,
        detail: fallback.detail ?? 'roster-composition',
      };
      return {
        feasible: false,
        assignments: [],
        shortfall: clubFallback,
        message: copyLawMessage(clubFallback),
      };
    }

    const shiftedCaps = club.capIdentity
      ? shiftLuxuryCaps(normalizedCaps, club.capIdentity)
      : normalizedCaps;
    const currentTax = luxuryTax(rosterConstruction, shiftedCaps, 'taxed').charged;
    const finalTax = luxuryTax(
      [...rosterConstruction, ...picked.map((player) => player.construction)],
      shiftedCaps,
      'taxed',
    ).charged;
    const salaryCost = picked.reduce((sum, player) => sum + player.price, 0);
    const addedTax = finalTax - currentTax;
    const allInCost = salaryCost + addedTax;
    if (!snakeMoneyAffordable(allInCost, club.budgetRemaining)) {
      const missing = Math.ceil(snakeMoneyOverage(allInCost, club.budgetRemaining));
      const shortfall: SnakeSeatingShortfall = {
        kind: 'affordability', position: 'MONEY', label: 'BUDGET ROOM', minimumPerTeam: 0,
        teams: input.clubs.length, slack: 0, needed: Math.ceil(allInCost),
        available: Math.floor(club.budgetRemaining), missing, reason: 'affordability',
        shortBy: missing, affectedClubs: 1, teamId: club.teamId,
      };
      return { feasible: false, assignments: [], shortfall, message: copyLawMessage(shortfall) };
    }

    assignments.push({
      teamId: club.teamId,
      playerIds: picked.map((player) => player.playerId),
      salaryCost,
      addedTax,
      allInCost,
    });
    const usedGroups = new Set(picked.map(deriveVersionGroupId));
    remaining = remaining.filter((player) => !usedGroups.has(deriveVersionGroupId(player)));
  }

  return { feasible: true, assignments, shortfall: null, message: 'EVERY CLUB CAN FINISH A LEGAL 22.' };
}
