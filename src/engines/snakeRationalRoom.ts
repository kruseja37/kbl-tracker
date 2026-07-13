import type { LuxuryCapRow } from '../data/tierParams';
import {
  auctionMarginalTaxWithCaps,
  computeAuctionTeamProjectedTaxWithCaps,
  normalizeAuctionLuxuryCapsForLeagueSize,
} from './auctionLuxuryTax';
import { computeOwnValue } from './auctionMarketModel';
import { luxuryTax, shiftLuxuryCaps, type Band, type BandPriorities, type TeamCapIdentity } from './leagueConstruction';
import {
  proveSimultaneousSnakeSeating,
  type SnakeSeatingPlayer,
} from './snakeSeatingProof';
import { rosterNeedBreakdown } from './rosterNeed';
import { deriveVersionGroupId } from './snakeVersioning';
import { canCover, canRelieve, canStart, isCloser, type RosterSlotPlayer } from '../data/rosterConstruction';

export const SNAKE_RATIONAL_ROOM_TUNING = {
  trueCostDragLambda: 1.15,
  atRiskPickMargin: 2,
} as const;

export type SnakeRiskRead = 'SAFE_TO_WAIT' | 'AT_RISK' | 'LIKELY_GONE';

export interface SnakeRationalPlayer extends SnakeSeatingPlayer {
  /** Public fit-worth seed: assembleBoard worth (IV plus public chemistry premium), never rank. */
  worth?: number;
  archetypeWeights?: Partial<Record<Band, number>>;
}

export interface SnakeRationalSeat {
  teamId: string;
  roster: readonly SnakeSeatingPlayer[];
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

export interface SnakeRiskRow {
  playerId: string;
  risk: SnakeRiskRead;
  nextPick: number | null;
  draftedAtPick: number | null;
  rationalBuyersBeforeTurn: number;
}

/** Binding appendix #3 overlay: public plan pressure can only raise, never lower, the playout read. */
export function applyCanonicalSnakeRiskTriggers(input: {
  playoutRisk: SnakeRiskRead;
  planCushion: number | null;
  cheapestFinishPositionDepth: number | null;
}): SnakeRiskRead {
  if (input.playoutRisk === 'LIKELY_GONE') return 'LIKELY_GONE';
  if (
    (input.planCushion !== null && input.planCushion < 0)
    || (input.cheapestFinishPositionDepth !== null && input.cheapestFinishPositionDepth <= 2)
  ) return 'AT_RISK';
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
  askingTeamId: string;
  nextPick: number | null;
  playout: SnakeRationalPick[];
  risks: SnakeRiskRow[];
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
  atRiskPickMargin?: number;
}

export function countRationalRoomHumans(players: readonly SnakeRationalPlayer[]): number {
  return new Set(players.map(deriveVersionGroupId)).size;
}

/** Scarcity is public remaining humans per still-open club need, never card count. */
export function computeSnakeScarcity(input: {
  players: readonly SnakeRationalPlayer[];
  teamsStillNeeding: number;
}): number {
  if (input.teamsStillNeeding <= 0) return Number.POSITIVE_INFINITY;
  return countRationalRoomHumans(input.players) / input.teamsStillNeeding;
}

function riskFromPlayout(input: {
  draftedPick: number | null;
  nextPick: number | null;
  margin: number;
}): SnakeRiskRead {
  if (input.draftedPick === null || input.nextPick === null) return 'SAFE_TO_WAIT';
  if (input.draftedPick < input.nextPick) return 'LIKELY_GONE';
  if (input.draftedPick <= input.nextPick + input.margin) return 'AT_RISK';
  return 'SAFE_TO_WAIT';
}

/**
 * One deterministic public-information playout. There are no seeds, sampling, private boards,
 * rankings, personality spreads, or shill layers. The asking club's next turn is a checkpoint (it
 * does not auto-pick); the engine continues K rival picks only to distinguish AT_RISK from safe.
 */
export function playSnakeRationalRoom(input: PlaySnakeRationalRoomInput): SnakeRationalRoomResult {
  const nextAskingIndex = input.pickOrder.findIndex((slot, index) => (
    index > input.currentPickIndex && slot.teamId === input.askingTeamId
  ));
  const nextPick = nextAskingIndex >= 0 ? input.pickOrder[nextAskingIndex].pick : null;
  const margin = input.atRiskPickMargin ?? SNAKE_RATIONAL_ROOM_TUNING.atRiskPickMargin;
  const stopIndex = nextAskingIndex >= 0
    ? Math.min(input.pickOrder.length - 1, nextAskingIndex + margin)
    : input.pickOrder.length - 1;
  const taxLambda = input.taxLambda ?? SNAKE_RATIONAL_ROOM_TUNING.trueCostDragLambda;
  const normalizedCaps = normalizeAuctionLuxuryCapsForLeagueSize([...input.baseCaps], input.realTeamCount);
  const available = new Map(input.players.map((player) => [player.playerId, player]));
  const seatState = new Map(input.seats.map((seat) => [seat.teamId, {
    ...seat,
    roster: [...seat.roster],
  }]));
  const playout: SnakeRationalPick[] = [];

  for (let pickIndex = input.currentPickIndex + 1; pickIndex <= stopIndex; pickIndex += 1) {
    const slot = input.pickOrder[pickIndex];
    if (!slot || (pickIndex === nextAskingIndex && slot.teamId === input.askingTeamId)) continue;
    const seat = seatState.get(slot.teamId);
    if (!seat || seat.roster.length >= 22) continue;

    const shiftedCaps = seat.capIdentity
      ? shiftLuxuryCaps(normalizedCaps, seat.capIdentity)
      : normalizedCaps;
    const currentTax = luxuryTax(
      seat.roster.map((entry) => entry.construction),
      shiftedCaps,
      'taxed',
    ).charged;
    const finishBeforePick = proveSimultaneousSnakeSeating({
      clubs: [{
        teamId: seat.teamId,
        roster: seat.roster,
        budgetRemaining: seat.budget - seat.committedSpent - currentTax,
        committedConstruction: seat.roster.map((entry) => entry.construction),
        capIdentity: seat.capIdentity,
      }],
      pool: [...available.values()],
      baseCaps: input.baseCaps,
      realTeamCount: input.realTeamCount,
    });
    if (!finishBeforePick.feasible) continue;

    const ranked: Array<{
      player: SnakeRationalPlayer;
      interest: number;
      budgetAfterCandidate: number;
    }> = [];
    for (const player of available.values()) {
      const taxAfterCandidate = computeAuctionTeamProjectedTaxWithCaps(
        seat.roster.map((entry) => entry.construction),
        player.construction,
        seat.capIdentity,
        normalizedCaps,
      );
      const budgetAfterCandidate = seat.budget - seat.committedSpent - player.price - taxAfterCandidate;
      if (budgetAfterCandidate < 0) continue;
      const need = rosterNeedBreakdown(seat.roster.map((entry) => entry.shape));
      const fitWorth = computeOwnValue({
        iv: player.worth ?? player.price,
        archetypeWeights: player.archetypeWeights,
        ownBandPriorities: seat.lockedArchetype,
        needBreakdown: need,
        shape: player.shape,
        openSlots: 22 - seat.roster.length,
      });
      const marginalTax = auctionMarginalTaxWithCaps(
        seat.roster.map((entry) => entry.construction),
        player.construction,
        seat.capIdentity,
        normalizedCaps,
      );
      const interest = fitWorth - taxLambda * marginalTax;
      ranked.push({ player, interest, budgetAfterCandidate });
    }
    ranked.sort((left, right) => (
      right.interest - left.interest || left.player.playerId.localeCompare(right.player.playerId)
    ));

    // Interest is independent of the completion proof. Rank once, then prove
    // candidates in order and stop at the first feasible one. This returns the
    // same highest-interest legal pick without solving 250 completions at each
    // simulated turn.
    let best: { player: SnakeRationalPlayer; interest: number } | null = null;
    for (const candidate of ranked) {
      const groupId = deriveVersionGroupId(candidate.player);
      const finish = proveSimultaneousSnakeSeating({
        clubs: [{
          teamId: seat.teamId,
          roster: [...seat.roster, candidate.player],
          budgetRemaining: candidate.budgetAfterCandidate,
          capIdentity: seat.capIdentity,
        }],
        pool: [...available.values()].filter((player) => deriveVersionGroupId(player) !== groupId),
        baseCaps: input.baseCaps,
        realTeamCount: input.realTeamCount,
      });
      if (!finish.feasible) continue;
      best = { player: candidate.player, interest: candidate.interest };
      break;
    }
    if (!best) continue;

    const versionGroupId = deriveVersionGroupId(best.player);
    playout.push({
      pick: slot.pick,
      pickIndex,
      teamId: slot.teamId,
      playerId: best.player.playerId,
      versionGroupId,
      interest: best.interest,
    });
    seat.roster.push(best.player);
    seat.committedSpent += best.player.price;
    for (const [playerId, player] of available) {
      if (deriveVersionGroupId(player) === versionGroupId) available.delete(playerId);
    }
  }

  const playersById = new Map(input.players.map((player) => [player.playerId, player]));
  const risks = input.askedPlayerIds.map((playerId): SnakeRiskRow => {
    const player = playersById.get(playerId);
    const groupId = player ? deriveVersionGroupId(player) : `player:${playerId}`;
    const drafted = playout.find((pick) => pick.versionGroupId === groupId);
    const draftedAtPick = drafted?.pick ?? null;
    return {
      playerId,
      risk: riskFromPlayout({ draftedPick: draftedAtPick, nextPick, margin }),
      nextPick,
      draftedAtPick,
      rationalBuyersBeforeTurn: draftedAtPick !== null && nextPick !== null && draftedAtPick < nextPick ? 1 : 0,
    };
  });

  return {
    askingTeamId: input.askingTeamId,
    nextPick,
    playout,
    risks,
    availableHumanCountAfter: countRationalRoomHumans([...available.values()]),
  };
}
