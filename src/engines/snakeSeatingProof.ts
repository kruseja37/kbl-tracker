import {
  LEGAL_ROSTER,
  isLegalRoster,
  type FieldPosition,
  type RosterSlotPlayer,
} from '../data/rosterConstruction';
import type { LuxuryCapRow } from '../data/tierParams';
import type { SnakeVersionState } from '../utils/leagueBuilderStorage';
import { normalizeAuctionLuxuryCapsForLeagueSize } from './auctionLuxuryTax';
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
  kind: PositionSupplyFloorKind | 'body-count' | 'joint-assignment' | 'affordability';
  position: string;
  label: string;
  minimumPerTeam: number;
  teams: number;
  slack: number;
  needed: number;
  available: number;
  missing: number;
  reason: 'position-floor' | 'body-count' | 'joint-assignment' | 'affordability';
  shortBy: number;
  affectedClubs: number;
}

export interface SnakeSeatingProof {
  feasible: boolean;
  assignments: SnakeSeatingAssignment[];
  shortfall: SnakeSeatingShortfall | null;
  message: string;
}

export interface SimultaneousSnakeSeatingInput {
  clubs: readonly SnakeSeatingClub[];
  pool: readonly SnakeSeatingPlayer[];
  baseCaps: readonly LuxuryCapRow[];
  realTeamCount: number;
  versionState?: SnakeVersionState;
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
  if (!clubExists || !Number.isFinite(input.allInCost) || input.allInCost < 0) {
    throw new Error('The proposed snake pick has invalid seating-proof inputs.');
  }
  const postPickInput: SimultaneousSnakeSeatingInput = {
    ...input.current,
    clubs: input.current.clubs.map((club) => club.teamId === input.teamId ? {
      ...club,
      roster: [...club.roster, input.player],
      budgetRemaining: club.budgetRemaining - input.allInCost,
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
  const rosters = proofRosters(input, proof);
  if (!rosters) return false;
  const representatives = representativeCards(availableCards(input));
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
  return derivePositionSupplyFloorTargets(teamCount).map((target) => {
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
  return floor ? {
    ...floor,
    reason: 'position-floor',
    shortBy: floor.missing,
    affectedClubs: clubs.length,
  } : null;
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
  const normalizedCaps = normalizeAuctionLuxuryCapsForLeagueSize([...input.baseCaps], input.realTeamCount);

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
    const addedTax = Math.max(0, finalTax - currentTax);
    return { salaryCost, addedTax, allInCost: salaryCost + addedTax };
  };
  const overage = (clubIndex: number, roster: readonly SnakeSeatingPlayer[]) => (
    Math.max(0, bill(clubIndex, roster).allInCost - input.clubs[clubIndex].budgetRemaining)
  );
  const taxExposure = (player: SnakeSeatingPlayer) => {
    const bat = player.construction.bat;
    const pit = player.construction.pit;
    return bat.POW + bat.CON + bat.SPD + bat.FLD + bat.ARM
      + (pit?.VEL ?? 0) + (pit?.JNK ?? 0) + (pit?.ACC ?? 0);
  };
  const usedIds = new Set(rosters.flatMap((roster) => roster.filter(isFuture).map((player) => player.playerId)));
  const unused = representatives.filter((player) => isFuture(player) && !usedIds.has(player.playerId));

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
        const nextOverage = Math.max(0, nextOverBill - input.clubs[overClubIndex].budgetRemaining);
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
          const nextOverage = Math.max(0, nextOverBill - input.clubs[overClubIndex].budgetRemaining);
          const nextOtherOverage = Math.max(0, nextOtherBill - input.clubs[otherClubIndex].budgetRemaining);
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
      assignment.allInCost > input.clubs[index].budgetRemaining + 1e-9
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
  const normalizedCaps = normalizeAuctionLuxuryCapsForLeagueSize([...input.baseCaps], input.realTeamCount);

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
      return { feasible: false, assignments: [], shortfall: fallback, message: copyLawMessage(fallback) };
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
    const addedTax = Math.max(0, finalTax - currentTax);
    const allInCost = salaryCost + addedTax;
    if (allInCost > club.budgetRemaining + 1e-9) {
      const missing = Math.ceil(allInCost - club.budgetRemaining);
      const shortfall: SnakeSeatingShortfall = {
        kind: 'affordability', position: 'MONEY', label: 'BUDGET ROOM', minimumPerTeam: 0,
        teams: input.clubs.length, slack: 0, needed: Math.ceil(allInCost),
        available: Math.floor(club.budgetRemaining), missing, reason: 'affordability',
        shortBy: missing, affectedClubs: 1,
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
