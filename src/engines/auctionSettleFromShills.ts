import { LEGAL_ROSTER, type RosterSlotPlayer } from '../data/rosterConstruction';
import {
  cheapestLegalCompletion,
  type CompletionCandidate,
} from './auctionCompletionFloor';
import {
  auctionReservePriceEnabled,
  isActivePassedResult,
  lotOpeningAsk,
  type AuctionResult,
  type AuctionRosterAssignment,
  type AuctionSession,
  type AuctionTeamState,
} from './auctionStateMachine';
import type { RosterPositionMap } from './rosterNeed';

export interface SettleFitTable {
  /** teamId -> playerId -> fit score (higher = better fit). Sparse; missing = 0. */
  readonly [teamId: string]: Readonly<Record<string, number>>;
}

export interface SettleFromShillsInput {
  session: AuctionSession;
  positions: RosterPositionMap;
  shillTeamIds: readonly string[];
  fitScores?: SettleFitTable;
}

export interface SettleFromShillsOptions {
  /**
   * F21 terminal-cascade reclamation (auctionStateMachine.ts finalizeTerminalAuction): caps each
   * reclaimed pick's charge at the team's per-open-slot affordable price — Lever A's own
   * `max(minSalary, min(ask, budgetRemaining / openSlots))` rule, the SAME formula
   * `backfillFromPassedLots` already applies to passed-lot cleanup fills. Absent/false preserves
   * the post-completion "Settle Short Clubs" screen's existing flat-ask charge byte-identically.
   */
  affordableCapped?: boolean;
}

export type SettleClubStatus =
  | 'settled'
  | 'already-complete'
  | 'unreadable'
  | 'no-legal-completion'
  | 'insufficient-budget';

export interface SettleClubOutcome {
  teamId: string;
  status: SettleClubStatus;
  seatsFilled: number;
  pickIds: readonly string[];
  cost: number;
}

export interface SettleFromShillsResult {
  ok: boolean;
  rejected?: 'expected-auction-complete';
  session: AuctionSession;
  outcomes: readonly SettleClubOutcome[];
}

type SourceAssignment = {
  teamId: string;
  assignment: AuctionRosterAssignment;
};

interface SettleCompletionCandidate extends CompletionCandidate {
  chargePrice: number;
}

function resolveRosterShapes(
  roster: readonly AuctionRosterAssignment[],
  positions: RosterPositionMap,
): RosterSlotPlayer[] | null {
  const shapes: RosterSlotPlayer[] = [];
  for (const assignment of roster) {
    const shape = positions[assignment.playerId];
    if (!shape) return null;
    shapes.push(shape);
  }
  return shapes;
}

function nominationOrderedTeams(
  session: AuctionSession,
  shillIds: ReadonlySet<string>,
): AuctionTeamState[] {
  const byId = new Map(session.teams.map((team) => [team.teamId, team]));
  const teams: AuctionTeamState[] = [];
  for (const teamId of session.nominationOrder) {
    const team = byId.get(teamId);
    if (!team || shillIds.has(teamId)) continue;
    teams.push(team);
  }
  return teams;
}

function buildLeftoverPool(session: AuctionSession, shillIds: ReadonlySet<string>): {
  ids: Set<string>;
  sourceByPlayerId: Map<string, SourceAssignment>;
} {
  const ids = new Set<string>();
  const sourceByPlayerId = new Map<string, SourceAssignment>();

  for (const team of session.teams) {
    if (!shillIds.has(team.teamId)) continue;
    for (const assignment of team.roster) {
      ids.add(assignment.playerId);
      sourceByPlayerId.set(assignment.playerId, { teamId: team.teamId, assignment });
    }
  }

  for (const [index, result] of session.results.entries()) {
    if (isActivePassedResult(session, result, index)) ids.add(result.playerId);
  }

  return { ids, sourceByPlayerId };
}

function rankCandidates(input: {
  session: AuctionSession;
  positions: RosterPositionMap;
  teamId: string;
  leftoverIds: ReadonlySet<string>;
  fitScores?: SettleFitTable;
  /** Open seats for this buyer — only consulted when `affordableCapped` is set. */
  openSlots: number;
  affordableCapped?: boolean;
}): SettleCompletionCandidate[] {
  const reserveEnabled = auctionReservePriceEnabled(input.session.config);
  const team = input.session.teams.find((candidate) => candidate.teamId === input.teamId);
  const teamMinSalary = team?.minSalary ?? 0;
  // F21 Lever-A cap (mirrors backfillFromPassedLots's per-slot affordable price exactly): only
  // evaluated when the caller opts in; +Infinity otherwise so `chargeFor` is a no-op passthrough.
  const affordableSlotPrice = input.affordableCapped && team && input.openSlots > 0
    ? team.budgetRemaining / input.openSlots
    : Number.POSITIVE_INFINITY;
  const chargeFor = (ask: number): number =>
    input.affordableCapped ? Math.max(teamMinSalary, Math.min(ask, affordableSlotPrice)) : ask;
  const sorted = [...input.leftoverIds]
    .map((id) => {
      const player = input.session.players[id];
      const shape = input.positions[id];
      if (!player || !shape) return null;
      return {
        id,
        shape,
        fit: input.fitScores?.[input.teamId]?.[id] ?? 0,
        ask: lotOpeningAsk(player, input.session.config),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((left, right) =>
      right.fit - left.fit ||
      left.ask - right.ask ||
      left.id.localeCompare(right.id),
    );

  return sorted.map((entry, rank) => ({
    id: entry.id,
    shape: entry.shape,
    price: reserveEnabled ? chargeFor(entry.ask) : rank,
    chargePrice: reserveEnabled ? chargeFor(entry.ask) : teamMinSalary,
  }));
}

function applySettledPicks(input: {
  teams: AuctionTeamState[];
  results: AuctionResult[];
  saleCount: number;
  buyer: AuctionTeamState;
  pickIds: readonly string[];
  priceByPlayerId: ReadonlyMap<string, number>;
  sourceByPlayerId: ReadonlyMap<string, SourceAssignment>;
}): { teams: AuctionTeamState[]; results: AuctionResult[]; saleCount: number } {
  const pickSet = new Set(input.pickIds);
  const buyerCost = input.pickIds.reduce(
    (sum, playerId) => sum + (input.priceByPlayerId.get(playerId) ?? input.buyer.minSalary),
    0,
  );
  const sourceByTeam = new Map<string, Set<string>>();
  for (const playerId of input.pickIds) {
    const source = input.sourceByPlayerId.get(playerId);
    if (!source) continue;
    const set = sourceByTeam.get(source.teamId) ?? new Set<string>();
    set.add(playerId);
    sourceByTeam.set(source.teamId, set);
  }

  const teams = input.teams.map((team) => {
    if (team.teamId === input.buyer.teamId) {
      return {
        ...team,
        budgetRemaining: team.budgetRemaining - buyerCost,
        rosterSlotsRemaining: Math.max(0, team.rosterSlotsRemaining - input.pickIds.length),
        roster: [
          ...team.roster,
          ...input.pickIds.map((playerId) => ({
            playerId,
            salary: input.priceByPlayerId.get(playerId) ?? team.minSalary,
          })),
        ],
      };
    }

    const sourcedIds = sourceByTeam.get(team.teamId);
    if (!sourcedIds) return team;
    let refund = 0;
    const roster = team.roster.filter((assignment) => {
      if (!sourcedIds.has(assignment.playerId)) return true;
      refund += assignment.salary;
      return false;
    });
    return {
      ...team,
      budgetRemaining: team.budgetRemaining + refund,
      rosterSlotsRemaining: team.rosterSlotsRemaining + sourcedIds.size,
      roster,
    };
  });

  let saleCount = input.saleCount;
  const soldIds = new Set(
    input.results
      .filter((result) => result.disposition === 'SOLD')
      .map((result) => result.playerId),
  );
  const results = input.results.map((result) => {
    if (!pickSet.has(result.playerId)) return result;
    const activePassed =
      result.disposition === 'PASSED' &&
      result.supersededByResultIndex === undefined &&
      !soldIds.has(result.playerId);
    if (result.disposition === 'PASSED' && !activePassed) return result;
    if (activePassed) saleCount += 1;
    return {
      ...result,
      disposition: 'SOLD' as const,
      winnerTeamId: input.buyer.teamId,
      salary: input.priceByPlayerId.get(result.playerId) ?? input.buyer.minSalary,
      settled: true as const,
    };
  });

  return { teams, results, saleCount };
}

export function settleFromShills(input: SettleFromShillsInput): SettleFromShillsResult {
  const { session } = input;
  if (session.state !== 'AUCTION_COMPLETE') {
    return {
      ok: false,
      rejected: 'expected-auction-complete',
      session,
      outcomes: [],
    };
  }

  return settleFromShillsCore(input);
}

/**
 * The state-agnostic settlement core (F21 — extracted so `finalizeTerminalAuction`'s terminal
 * cascade in auctionStateMachine.ts can reclaim shill-held players BEFORE the engine ever
 * declares AUCTION_COMPLETE, not just after). `settleFromShills` above is the public,
 * state-gated entry point the post-completion "Settle Short Clubs" UI action calls; it is
 * unchanged and remains byte-identical. Callers invoking this directly are responsible for only
 * doing so when settlement is actually appropriate for their session's current state.
 */
export function settleFromShillsCore(
  input: SettleFromShillsInput,
  options: SettleFromShillsOptions = {},
): SettleFromShillsResult {
  const { session } = input;
  const shillIds = new Set(input.shillTeamIds);
  const { ids: leftovers, sourceByPlayerId } = buildLeftoverPool(session, shillIds);
  let teams = [...session.teams];
  let results = [...session.results];
  let saleCount = session.saleCount;
  const outcomes: SettleClubOutcome[] = [];
  let changed = false;

  for (const orderTeam of nominationOrderedTeams(session, shillIds)) {
    const index = teams.findIndex((team) => team.teamId === orderTeam.teamId);
    if (index < 0) continue;
    const team = teams[index];
    const openSlots = LEGAL_ROSTER.size - team.roster.length;

    if (openSlots <= 0) {
      outcomes.push({
        teamId: team.teamId,
        status: 'already-complete',
        seatsFilled: 0,
        pickIds: [],
        cost: 0,
      });
      continue;
    }

    const rosterShapes = resolveRosterShapes(team.roster, input.positions);
    if (rosterShapes === null) {
      outcomes.push({
        teamId: team.teamId,
        status: 'unreadable',
        seatsFilled: 0,
        pickIds: [],
        cost: 0,
      });
      continue;
    }

    const candidates = rankCandidates({
      session,
      positions: input.positions,
      teamId: team.teamId,
      leftoverIds: leftovers,
      fitScores: input.fitScores,
      openSlots,
      affordableCapped: options.affordableCapped,
    });
    const quote = cheapestLegalCompletion(rosterShapes, candidates, openSlots);
    if (!quote.feasible) {
      outcomes.push({
        teamId: team.teamId,
        status: 'no-legal-completion',
        seatsFilled: 0,
        pickIds: [],
        cost: 0,
      });
      continue;
    }

    const priceByPlayerId = new Map(candidates.map((candidate) => [candidate.id, candidate.chargePrice]));
    const cost = quote.pickIds.reduce(
      (sum, playerId) => sum + (priceByPlayerId.get(playerId) ?? team.minSalary),
      0,
    );
    if (cost > team.budgetRemaining) {
      outcomes.push({
        teamId: team.teamId,
        status: 'insufficient-budget',
        seatsFilled: 0,
        pickIds: [],
        cost: 0,
      });
      continue;
    }

    const applied = applySettledPicks({
      teams,
      results,
      saleCount,
      buyer: team,
      pickIds: quote.pickIds,
      priceByPlayerId,
      sourceByPlayerId,
    });
    teams = applied.teams;
    results = applied.results;
    saleCount = applied.saleCount;
    for (const playerId of quote.pickIds) leftovers.delete(playerId);
    changed = true;
    outcomes.push({
      teamId: team.teamId,
      status: 'settled',
      seatsFilled: quote.pickIds.length,
      pickIds: quote.pickIds,
      cost,
    });
  }

  return {
    ok: changed,
    session: changed ? { ...session, teams, results, saleCount } : session,
    outcomes,
  };
}
