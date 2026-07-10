import {
  LEGAL_ROSTER,
  canCover,
  isCloser,
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
  type PositionSupplyFloorTarget,
} from './poolFromDemand';
import { rosterNeedBreakdown } from './rosterNeed';
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

function copyLawMessage(shortfall: SnakeSeatingShortfall): string {
  if (shortfall.reason === 'affordability') {
    return `NOT ENOUGH BUDGET ROOM FOR ${shortfall.affectedClubs} CLUB — SHORT ${shortfall.shortBy}.`;
  }
  return `NOT ENOUGH ${shortfall.label} FOR ${shortfall.affectedClubs} CLUBS — SHORT ${shortfall.shortBy}. ADD PLAYERS OR REMOVE A CLUB.`;
}

function availableCards(input: SimultaneousSnakeSeatingInput): SnakeSeatingPlayer[] {
  const unavailable = unavailableVersionPlayerIds(input.versionState);
  const draftedGroups = new Set(Object.keys(input.versionState?.draftedPlayerIdByGroupId ?? {}));
  return input.pool.filter((player) => (
    !unavailable.has(player.playerId) && !draftedGroups.has(deriveVersionGroupId(player))
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
