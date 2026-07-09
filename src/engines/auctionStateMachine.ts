import {
  DEFAULT_AUCTION_SETUP_CONFIG,
  DEFAULT_NOMINATION_WEIGHT_EXPONENT,
  type AuctionSetupConfig,
} from '../data/auctionEngineConstants';
import {
  LEAGUE_MINIMUM_SALARY,
  auctionMaxBid,
  reservePriceCurve,
} from '../data/rosterEngineConstants';
import { RESERVE_PRICE_OFF_K, normalizeReservePriceK, reserveP } from './auctionReservePrice';
import { LEGAL_ROSTER, canCover, isCloser, isLegalRoster, type RosterSlotPlayer } from '../data/rosterConstruction';
import {
  cheapestLegalCompletion,
  completionBidCeiling,
  conservativePoolReserve,
  type CompletionCandidate,
} from './auctionCompletionFloor';
import {
  playerFillsHardRequirement,
  rosterNeedBreakdown,
  wouldStrandRoster,
  type RosterNeedBreakdown,
  type RosterPositionMap,
} from './rosterNeed';
import { settleFromShillsCore } from './auctionSettleFromShills';

export type AuctionState =
  | 'SETUP'
  | 'NOMINATION'
  | 'OPEN_BIDDING'
  | 'RESOLVE'
  | 'SOLD'
  | 'PASSED'
  | 'AUCTION_COMPLETE';

export interface AuctionPlayer {
  playerId: string;
  iv: number;
  ivPercentile: number;
  /**
   * Position/legality info for the position-aware own_need guard (FABLE-C1, spec §5 — audit RCI-01).
   * OPTIONAL and additive: sessions saved before C1, or built without enrichment (e.g. the farm
   * auction, whose 10-man roster has different legality), lack it and keep the flat-scalar behavior.
   */
  pos?: RosterSlotPlayer;
}

export interface AuctionTeamState {
  teamId: string;
  budgetRemaining: number;
  rosterSlotsRemaining: number;
  minSalary: number;
  projectedTax: number;
  roster: readonly AuctionRosterAssignment[];
}

export interface AuctionTeamInput {
  teamId: string;
  budgetRemaining: number;
  rosterSlotsRemaining: number;
  minSalary?: number;
  roster?: readonly AuctionRosterAssignment[];
}

/**
 * One entry of a lot's bid history (FABLE-C2B, audit AUC-3: log-first-consume-later — the v1.1
 * Underbidder Memory consumes this). OPTIONAL/additive on the persisted session shape.
 */
export interface BidLogEntry {
  teamId: string;
  action: 'bid' | 'pass' | 'claim' | 'forced-fill';
  /** The bid/claim/fill amount; null for a pass. */
  amount: number | null;
}

export interface Lot {
  playerId: string;
  nominatorTeamId: string;
  openingAsk: number;
  highBid: number | null;
  highBidder: string | null;
  stillIn: readonly string[];
  bidTurnTeamId: string | null;
  /** Full bid history for this lot (absent on sessions saved before FABLE-C2B). */
  bidLog?: readonly BidLogEntry[];
}

export interface PendingClaim {
  playerId: string;
  teamId: string;
  price: number;
}

export interface AuctionRosterAssignment {
  playerId: string;
  salary: number;
}

export type AuctionResultDisposition = 'SOLD' | 'PASSED' | 'SET_ASIDE';

export interface AuctionResult {
  playerId: string;
  disposition: AuctionResultDisposition;
  nominatorTeamId: string;
  winnerTeamId: string | null;
  salary: number | null;
  /** Teams that put money on this lot (bid/claim/forced-fill). Absent on pre-C2B results. */
  bidderSet?: readonly string[];
  /** The last non-winner to place a bid — the second-price revealer. Absent on pre-C2B results. */
  underbidder?: string | null;
  /** `bidderSet.length` denormalized for cheap reads. Absent on pre-C2B results. */
  numBidders?: number;
  /** Provenance for complete-screen settle-from-shills repair. Absent on pre-settle sessions. */
  settled?: true;
  /** Index of the later result that replaced this PASSED row. Append-only audit log stays intact. */
  supersededByResultIndex?: number;
}

export interface AuctionSession {
  state: AuctionState;
  config: AuctionSetupConfig;
  /** Per-draft-instance nonce; present on F1+ sessions so new drafts do not reuse pool/league seed order. */
  sessionLaunchNonce?: string;
  /** Original setup/pool seed retained for regeneration paths that should not consume the instance seed. */
  sessionBaseSeed?: string;
  teams: readonly AuctionTeamState[];
  nominationOrder: readonly string[];
  nominationIndex: number;
  nominationRound: number;
  players: Readonly<Record<string, AuctionPlayer>>;
  playerOrder: readonly string[];
  availablePlayerIds: readonly string[];
  currentLot: Lot | null;
  pendingClaim: PendingClaim | null;
  results: readonly AuctionResult[];
  saleCount: number;
  /** Positive-k sessions bound renominations by player; absent preserves pre-Lever-A saved sessions. */
  passCountByPlayerId?: Readonly<Record<string, number>>;
  /** Explicit terminal marker when an enriched MLB auction cannot legally complete. */
  terminalShortfall?: {
    status: 'uncompletable';
    teamIds: readonly string[];
  };
}

export interface InitAuctionSessionInput {
  teams: readonly AuctionTeamInput[];
  players: readonly AuctionPlayer[];
  config?: Partial<AuctionSetupConfig>;
  nominationOrder?: readonly string[];
  sessionId?: string;
  sessionLaunchNonce?: string;
}

export type AuctionRejectionReason =
  | 'auction-complete'
  | 'auction-uncompletable'
  | 'bid-above-solvency-cap'
  | 'bid-below-minimum'
  | 'bid-strands-roster'
  | 'claim-above-solvency-cap'
  | 'current-lot-open'
  | 'expected-nomination'
  | 'expected-open-bidding'
  | 'expected-passed-or-sold'
  | 'expected-resolve'
  | 'nominator-full'
  | 'no-current-lot'
  | 'no-open-nominator'
  | 'no-pending-claim'
  | 'player-already-sold-or-unavailable'
  | 'team-full'
  | 'team-not-found'
  | 'team-not-in-lot'
  | 'unknown-player';

export type AuctionTransitionResult =
  | { ok: true; session: AuctionSession }
  | { ok: false; session: AuctionSession; reason: AuctionRejectionReason };

export const MAX_RESERVE_RENOMINATION_PASSES = 2;

export function createAuctionSessionLaunchNonce(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint32Array(4);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(36).padStart(7, '0')).join('-');
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function deriveAuctionSessionNominationSeed(input: {
  sessionId: string;
  launchNonce: string;
  baseSeed: string;
}): string {
  return `${input.baseSeed}:session:${input.sessionId}:launch:${input.launchNonce}`;
}

export function initAuctionSession(input: InitAuctionSessionInput): AuctionSession {
  const baseConfig: AuctionSetupConfig = {
    ...DEFAULT_AUCTION_SETUP_CONFIG,
    ...input.config,
  };
  const config: AuctionSetupConfig = {
    ...baseConfig,
    nominationOrderSeed: input.sessionId && input.sessionLaunchNonce
      ? deriveAuctionSessionNominationSeed({
          sessionId: input.sessionId,
          launchNonce: input.sessionLaunchNonce,
          baseSeed: baseConfig.nominationOrderSeed,
        })
      : baseConfig.nominationOrderSeed,
  };
  const teams = input.teams.map(normalizeTeam);
  const teamIds = teams.map((team) => team.teamId);
  const nominationOrder = sanitizeNominationOrder(
    input.nominationOrder ?? seededNominationOrder(teamIds, config.nominationOrderSeed),
    teamIds,
  );
  const nominationIndex = findNextOpenNominationIndex(teams, nominationOrder, 0);
  const players = Object.fromEntries(input.players.map((player) => [player.playerId, { ...player }]));
  const playerOrder = input.players.map((player) => player.playerId);
  // END-CHECKPOINT (FABLE-C3): a session whose COMPLETING teams are already full is born
  // complete — shill-only open slots never justify running lots.
  const bornComplete =
    nominationIndex === -1 ||
    teams.every(
      (team) =>
        team.rosterSlotsRemaining <= 0 ||
        (config.nonCompletingTeamIds?.includes(team.teamId) ?? false),
    );

  return {
    state: bornComplete ? 'AUCTION_COMPLETE' : 'NOMINATION',
    config,
    ...(input.sessionLaunchNonce ? { sessionLaunchNonce: input.sessionLaunchNonce } : {}),
    ...(input.sessionId && input.sessionLaunchNonce ? { sessionBaseSeed: baseConfig.nominationOrderSeed } : {}),
    teams,
    nominationOrder,
    nominationIndex: nominationIndex === -1 ? 0 : nominationIndex,
    nominationRound: 0,
    players,
    playerOrder,
    availablePlayerIds: [...playerOrder],
    currentLot: null,
    pendingClaim: null,
    results: [],
    saleCount: 0,
  };
}

export function isActivePassedResult(
  session: AuctionSession,
  result: AuctionResult,
  resultIndex: number,
): boolean {
  if (result.disposition !== 'PASSED') return false;
  if (result.supersededByResultIndex !== undefined) return false;
  if (session.availablePlayerIds.includes(result.playerId)) return false;
  return !session.results.some(
    (candidate, index) =>
      index !== resultIndex &&
      candidate.playerId === result.playerId &&
      candidate.disposition === 'SOLD',
  );
}

export function getCurrentBidderTeamId(session: AuctionSession | null): string | null {
  if (session === null || session.state !== 'OPEN_BIDDING' || session.currentLot === null) return null;
  const lot = session.currentLot;
  if (lot.stillIn.length <= 1) return null;
  return lot.bidTurnTeamId ?? nextBidTurn(
    session.nominationOrder,
    lot.stillIn,
    lot.highBidder ?? '__auction-legacy-start__',
    lot.highBidder,
  );
}

export function nextBidTurn(
  nominationOrder: readonly string[],
  stillIn: readonly string[],
  afterTeamId: string | null,
  highBidder: string | null,
): string | null {
  if (nominationOrder.length === 0 || stillIn.length === 0) return null;

  const stillInSet = new Set(stillIn);
  const afterIndex = afterTeamId === null ? -1 : nominationOrder.indexOf(afterTeamId);
  const startIndex = afterIndex === -1 ? 0 : (afterIndex + 1) % nominationOrder.length;

  for (let offset = 0; offset < nominationOrder.length; offset += 1) {
    const teamId = nominationOrder[(startIndex + offset) % nominationOrder.length];
    if (teamId !== highBidder && stillInSet.has(teamId)) return teamId;
  }

  return null;
}

export function selectNextNominee(session: AuctionSession): string | null {
  const step = session.results.length;
  const seed = session.config.nominationOrderSeed;
  const exponent = session.config.nominationWeightExponent ?? DEFAULT_NOMINATION_WEIGHT_EXPONENT;
  let selectedId: string | null = null;
  let selectedKey = Number.NEGATIVE_INFINITY;

  for (const playerId of session.availablePlayerIds) {
    const player = session.players[playerId];
    if (player === undefined) continue;

    const pctile01 = Math.min(Math.max(player.ivPercentile / 100, 0), 1);
    const weight = Math.pow(Math.max(pctile01, 0.02), exponent);
    const u = (hashString(`${seed}:surface:${step}:${playerId}`) + 0.5) / 0x100000000;
    const key = Math.pow(u, 1 / weight);

    if (
      selectedId === null ||
      key > selectedKey ||
      (key === selectedKey && playerId.localeCompare(selectedId) < 0)
    ) {
      selectedId = playerId;
      selectedKey = key;
    }
  }

  return selectedId;
}

/** The opening ask a lot for `player` would carry — single-math with `surfaceNextPlayer`. */
export function lotOpeningAsk(player: AuctionPlayer, config: AuctionSetupConfig): number {
  const legacyOpeningAsk = config.flatReserveFloor != null
    ? config.flatReserveFloor
    : reservePriceCurve(player.ivPercentile) * player.iv;
  return reserveP({
    iv: player.iv,
    k: auctionReservePriceK(config),
    minimumSalary: LEAGUE_MINIMUM_SALARY,
    passthroughPrice: legacyOpeningAsk,
  });
}

export function auctionReservePriceK(config: AuctionSetupConfig): number {
  return normalizeReservePriceK(config.reserveFractionK, RESERVE_PRICE_OFF_K);
}

export function auctionReservePriceEnabled(config: AuctionSetupConfig): boolean {
  return auctionReservePriceK(config) !== RESERVE_PRICE_OFF_K;
}

/**
 * The ACCURATE completion-based solvency ceiling (FABLE-C2B; spec §6:186-193, audit AUC-2/RCI-04):
 * the most this team can pay right now while the cheapest VERIFIED-legal completion of its roster
 * — from the players ACTUALLY LEFT, at their opening asks — stays affordable. When a lot is open,
 * the ceiling prices winning THAT candidate (his position joins the roster; the completion covers
 * the remaining slots). The phantom FULL-roster projectedTax reservation was STRIPPED per spec §6
 * (it recomputed every team's entire hypothetical tax bill on every lot, collapsing every ceiling
 * league-wide late in a draft — the exact bug C2B was chartered to fix).
 *
 * TAXTEETH (JK ruling 2026-07-08): team.projectedTax was repointed at a DIFFERENT, narrower
 * quantity than the one C2B stripped -- the MARGINAL tax of winning only the CURRENT lot's
 * candidate (auctionMarginalTax, the same formula the whisper's TRUE COST line uses), not the
 * team's full cumulative tax bill. It is reserved here so a bid can never be accepted that the
 * team could not actually settle (spec-docs/contracts/CONTRACT_TAXTEETH_2026-07-08.md). Only
 * meaningful while a specific lot is open (it is 0 between lots, and always 0 for farm/shill
 * sessions, which never populate it) -- so this is a no-op everywhere it doesn't apply.
 *
 * Fallbacks (C2B-FIX F1 split the two tiers):
 * - Position info MISSING (pre-C1 saved sessions, the farm auction, unenriched pools): the
 *   permissive scalar reserve `budget − (slots−1)×minSalary − marginalTax` — the pre-C2B formula
 *   with the phantom full-tax term removed and the real marginal tax term restored.
 * - ENRICHED but no verified completion exists: the price-aware conservative reserve — the
 *   cheapest real opening asks still in the pool, capped at the scalar — so a (genuinely or
 *   spuriously) infeasible read can never under-reserve into an endgame strand.
 */
export function sessionBidCeiling(session: AuctionSession, teamId: string): number | null {
  const team = findTeam(session, teamId);
  if (team === null) return null;
  // END-CHECKPOINT (FABLE-C3): a non-completing shill has no roster completion to reserve for —
  // its ceiling is simply its remaining budget (pure price pressure, spec §6 shill semantics).
  if (isNonCompletingTeam(session, teamId)) return Math.max(0, team.budgetRemaining);
  // TAXTEETH: projectedTax is the marginal tax of the CURRENT lot's candidate -- meaningless (and
  // stale, referring to a since-resolved lot) with no lot open, so it is ignored between lots.
  const marginalTax = session.currentLot ? team.projectedTax : 0;
  const scalar = auctionMaxBid(team.budgetRemaining, team.rosterSlotsRemaining, team.minSalary, marginalTax);

  const rosterShapes: RosterSlotPlayer[] = [];
  for (const assignment of team.roster) {
    const info = session.players[assignment.playerId]?.pos;
    if (!info) return scalar;
    rosterShapes.push(info);
  }

  let openSlots = team.rosterSlotsRemaining;
  const candidate = session.currentLot ? session.players[session.currentLot.playerId] : null;
  if (session.currentLot) {
    if (!candidate?.pos) return scalar;
    rosterShapes.push(candidate.pos);
    openSlots -= 1;
  }
  if (openSlots < 0) return scalar;

  const pool: CompletionCandidate[] = [];
  for (const playerId of session.availablePlayerIds) {
    const player = session.players[playerId];
    if (!player?.pos) return scalar;
    pool.push({ id: playerId, price: lotOpeningAsk(player, session.config), shape: player.pos });
  }

  // MINIMUM-SALARY reserve floor (FABLE-C3-FIX F1): live MLB opening asks are reserveCurve×IV
  // with NO flat floor, so a cheap player's ask can sit BELOW the league minimum — a completion
  // reserve priced purely at asks could leave a team with less than minSalary per open slot,
  // which the exhaustion cleanup (which prices at minSalary) then cannot rescue. Every ceiling on
  // the enriched path therefore reserves at least minSalary per remaining slot, restoring the
  // invariant the backfill's affordability rests on: after ANY acquisition,
  // budgetRemaining ≥ openSlots × minSalary.
  const minReserveCeiling = Math.max(0, team.budgetRemaining - openSlots * team.minSalary);

  const ceiling = completionBidCeiling(team.budgetRemaining, rosterShapes, pool, openSlots);
  // TAXTEETH: the primary (feasible-completion) path did not reserve for tax at all before this
  // fix -- most real bids are gated here, not by the scalar below, so the subtraction must happen
  // on this return too or the ceiling stays exactly as permissive as pre-fix.
  if (ceiling !== null) return Math.max(0, Math.min(ceiling, minReserveCeiling) - marginalTax);

  // Defense-in-depth (C2B-FIX F1): on the ENRICHED path an infeasible completion read must never
  // hand back a ceiling looser than the prices actually left can honor — the bare scalar reserves
  // league minimums (~1.7k/slot) while every remaining lot clears at ≥ its opening ask, so the
  // scalar alone can bless an overspend into a strand. Reserve the cheapest real asks instead,
  // and never exceed the scalar (the pre-C2B permissiveness bound; already tax-aware above).
  const reserve = conservativePoolReserve(pool, openSlots);
  return Math.min(scalar, minReserveCeiling, Math.max(0, team.budgetRemaining - reserve));
}

export function getTeamAuctionMaxBid(session: AuctionSession, teamId: string): number | null {
  return sessionBidCeiling(session, teamId);
}

export function surfaceNextPlayer(session: AuctionSession): AuctionTransitionResult {
  if (session.state === 'AUCTION_COMPLETE') return rejected(session, 'auction-complete');
  if (session.state !== 'NOMINATION') return rejected(session, 'expected-nomination');
  if (session.currentLot !== null) return rejected(session, 'current-lot-open');

  const playerId = selectNextNominee(session);
  if (playerId === null) {
    return finalizeTerminalAuction(session, true);
  }

  const player = session.players[playerId];
  const openingAsk = lotOpeningAsk(player, session.config);
  const stillIn = session.teams
    .filter((team) => team.rosterSlotsRemaining > 0)
    .map((team) => team.teamId);
  if (stillIn.length === 0) {
    return finalizeTerminalAuction(session, session.availablePlayerIds.length === 0);
  }

  const openingBidderIndex = findNextOpenNominationIndex(
    session.teams,
    session.nominationOrder,
    session.nominationIndex,
  );
  const openingBidderFromOrder = openingBidderIndex === -1
    ? null
    : session.nominationOrder[openingBidderIndex] ?? null;
  const openingBidder = openingBidderFromOrder !== null && stillIn.includes(openingBidderFromOrder)
    ? openingBidderFromOrder
    : stillIn[0];

  return accepted({
    ...session,
    state: 'OPEN_BIDDING',
    currentLot: {
      playerId,
      // One-chance nomination is engine-driven; this vestigial field records the opening bidder.
      nominatorTeamId: openingBidder,
      openingAsk,
      highBid: null,
      highBidder: null,
      stillIn,
      bidTurnTeamId: openingBidder,
      bidLog: [],
    },
    pendingClaim: null,
    availablePlayerIds: session.availablePlayerIds.filter((id) => id !== playerId),
  });
}

/**
 * The position-aware forced-filler guard (FABLE-C1, spec §5 own_need): winning this player must
 * leave the team able to complete a LEGAL roster within its remaining slots. Permissive by design —
 * if the candidate or ANY current roster member lacks position info (pre-C1 saved sessions, the farm
 * auction, unenriched pools), the guard stands down and the flat-scalar behavior applies.
 */
function bidWouldStrand(session: AuctionSession, team: AuctionTeamState, playerId: string): boolean {
  const candidate = session.players[playerId];
  if (!candidate?.pos) return false;
  const positions: Record<string, RosterSlotPlayer> = { [playerId]: candidate.pos };
  for (const assignment of team.roster) {
    const info = session.players[assignment.playerId]?.pos;
    if (!info) return false;
    positions[assignment.playerId] = info;
  }
  if (
    wouldStrandRoster(
      team.roster.map((assignment) => assignment.playerId),
      playerId,
      positions,
    )
  ) {
    return true;
  }

  // POOL-AWARE strand strengthening (FABLE-C3, the coverage-doom root cause): the count-only law
  // above assumes need-sharing players exist (e.g. a 3B whose secondary is C can fill a missing
  // primary AND catcher depth in one body) — but the ACTUAL pool may hold no such player, letting
  // a team buy itself into a roster no remaining player can legally complete (the sweep's wedge:
  // one catcher, no Two-Way arm, one slot, two needs). A win that leaves NO verified-legal
  // completion from the players actually left is a true impossibility — reject it (spec §6 "the
  // floor fires ONLY at true impossibility and guarantees everyone ends with a legal roster").
  // Permissive on any missing position info, like everything else in this guard.
  const rosterShapes: RosterSlotPlayer[] = team.roster.map(
    (assignment) => positions[assignment.playerId],
  );
  const pool: CompletionCandidate[] = [];
  for (const id of session.availablePlayerIds) {
    if (id === playerId) continue;
    const player = session.players[id];
    if (!player?.pos) return false;
    pool.push({ id, price: lotOpeningAsk(player, session.config), shape: player.pos });
  }
  const quote = cheapestLegalCompletion(
    [...rosterShapes, candidate.pos],
    pool,
    team.rosterSlotsRemaining - 1,
  );
  return !quote.feasible;
}

export function recordBid(session: AuctionSession, teamId: string, bid: number): AuctionTransitionResult {
  if (session.state !== 'OPEN_BIDDING') return rejected(session, 'expected-open-bidding');
  const lot = session.currentLot;
  if (lot === null) return rejected(session, 'no-current-lot');
  if (!lot.stillIn.includes(teamId)) return rejected(session, 'team-not-in-lot');

  const team = findTeam(session, teamId);
  if (team === null) return rejected(session, 'team-not-found');
  if (team.rosterSlotsRemaining <= 0) return rejected(session, 'team-full');

  const minimumBid = minimumLegalBid(lot, session.config.bidIncrement);
  if (!Number.isFinite(bid) || bid < minimumBid) return rejected(session, 'bid-below-minimum');

  const maxBid = sessionBidCeiling(session, teamId);
  if (maxBid === null || bid > maxBid) return rejected(session, 'bid-above-solvency-cap');

  if (bidWouldStrand(session, team, lot.playerId)) return rejected(session, 'bid-strands-roster');

  return accepted({
    ...session,
    currentLot: {
      ...lot,
      highBid: bid,
      highBidder: teamId,
      bidTurnTeamId: nextBidTurn(session.nominationOrder, lot.stillIn, teamId, teamId),
      bidLog: appendBidLog(lot, { teamId, action: 'bid', amount: bid }),
    },
  });
}

export function passBid(session: AuctionSession, teamId: string): AuctionTransitionResult {
  if (session.state !== 'OPEN_BIDDING') return rejected(session, 'expected-open-bidding');
  const lot = session.currentLot;
  if (lot === null) return rejected(session, 'no-current-lot');
  if (!lot.stillIn.includes(teamId)) return rejected(session, 'team-not-in-lot');

  const stillIn = lot.stillIn.filter((id) => id !== teamId);

  return accepted({
    ...session,
    state: stillIn.length <= 1 ? 'RESOLVE' : 'OPEN_BIDDING',
    currentLot: {
      ...lot,
      stillIn,
      bidTurnTeamId: stillIn.length <= 1
        ? null
        : nextBidTurn(session.nominationOrder, stillIn, teamId, lot.highBidder),
      bidLog: appendBidLog(lot, { teamId, action: 'pass', amount: null }),
    },
  });
}

export function resolveLot(session: AuctionSession): AuctionTransitionResult {
  if (session.state !== 'OPEN_BIDDING' && session.state !== 'RESOLVE') {
    return rejected(session, 'expected-resolve');
  }
  const lot = session.currentLot;
  if (lot === null) return rejected(session, 'no-current-lot');
  if (lot.stillIn.length > 1) {
    return accepted({ ...session, state: 'OPEN_BIDDING', pendingClaim: null });
  }
  if (lot.highBid !== null && lot.highBidder !== null) {
    return acceptedAfterLotFinalization(finalizeSoldLot(session, lot.highBidder, lot.highBid));
  }
  if (lot.stillIn.length === 1) {
    return accepted({
      ...session,
      state: 'RESOLVE',
      pendingClaim: {
        playerId: lot.playerId,
        teamId: lot.stillIn[0],
        price: lot.openingAsk,
      },
    });
  }

  return acceptedAfterLotFinalization(resolveNoBidLot(session));
}

export function claimLoneSurvivor(session: AuctionSession): AuctionTransitionResult {
  if (session.state !== 'RESOLVE') return rejected(session, 'expected-resolve');
  const claim = session.pendingClaim;
  if (claim === null) return rejected(session, 'no-pending-claim');
  const team = findTeam(session, claim.teamId);
  if (team === null) return rejected(session, 'team-not-found');
  if (team.rosterSlotsRemaining <= 0) return rejected(session, 'team-full');

  const maxBid = sessionBidCeiling(session, claim.teamId);
  if (maxBid === null || claim.price > maxBid) return rejected(session, 'claim-above-solvency-cap');

  if (bidWouldStrand(session, team, claim.playerId)) return rejected(session, 'bid-strands-roster');

  return acceptedAfterLotFinalization(finalizeSoldLot(
    withBidLogEntry(session, { teamId: claim.teamId, action: 'claim', amount: claim.price }),
    claim.teamId,
    claim.price,
  ));
}

export function passLoneSurvivorOut(session: AuctionSession): AuctionTransitionResult {
  if (session.state !== 'RESOLVE') return rejected(session, 'expected-resolve');
  if (session.pendingClaim === null) return rejected(session, 'no-pending-claim');

  return acceptedAfterLotFinalization(resolveNoBidLot(session));
}

export function advanceLot(session: AuctionSession): AuctionTransitionResult {
  if (session.state === 'AUCTION_COMPLETE') return accepted(session);
  if (session.state !== 'SOLD' && session.state !== 'PASSED') {
    return rejected(session, 'expected-passed-or-sold');
  }
  if (isAuctionComplete(session) || session.availablePlayerIds.length === 0) {
    return finalizeTerminalAuction(session, session.availablePlayerIds.length === 0);
  }

  const next = findNextOpenNominationIndex(session.teams, session.nominationOrder, session.nominationIndex + 1);
  const nominationIndex = next === -1 ? session.nominationIndex : next;
  const nominationRound = next === -1
    ? session.nominationRound
    : session.nominationRound + (next <= session.nominationIndex ? 1 : 0);

  return accepted({
    ...session,
    state: 'NOMINATION',
    currentLot: null,
    pendingClaim: null,
    nominationIndex,
    nominationRound,
  });
}

function finalizeTerminalAuction(session: AuctionSession, mayBackfill: boolean): AuctionTransitionResult {
  // CLEANUP BACKFILL (FABLE-C3 + M1J): every terminal path, including nomination exhaustion,
  // must flow through the same passed-lot completion cascade before AUCTION_COMPLETE is allowed.
  const passBackfilled = mayBackfill && !isAuctionComplete(session)
    ? backfillFromPassedLots(session)
    : session;
  let backfilled = passBackfilled;
  let shortfallTeamIds = enrichedCompletingShortfallTeamIds(backfilled);

  // SHILL RECLAMATION (F21 — the terminal-cascade deadlock): shills are pure market pressure whose
  // rosters dissolve at completion anyway (auctionSettleFromShills.ts, today only reachable AFTER
  // AUCTION_COMPLETE). When the pool is exhausted and real clubs are STILL short after the
  // passed-lot cleanup above, their held players are a legitimate backfill source — reclaim them
  // here, BEFORE the engine ever refuses completion, so a short real club and a stocked shill can
  // no longer deadlock each other (can't complete because short; can't settle because not
  // complete). No-ops when the session carries no shill teams — every pre-F21 / shill-less session
  // keeps this exact shortfall behavior byte-identical.
  if (shortfallTeamIds.length > 0) {
    backfilled = reclaimShillHeldForShortfall(backfilled);
    shortfallTeamIds = enrichedCompletingShortfallTeamIds(backfilled);
  }

  if (shortfallTeamIds.length > 0) {
    return rejected({
      ...backfilled,
      currentLot: null,
      pendingClaim: null,
      terminalShortfall: {
        status: 'uncompletable',
        teamIds: shortfallTeamIds,
      },
    }, 'auction-uncompletable');
  }

  return accepted({
    ...backfilled,
    state: 'AUCTION_COMPLETE',
    currentLot: null,
    pendingClaim: null,
    terminalShortfall: undefined,
  });
}

/** Every enriched player's legality shape on this session — engine-internal, no Player-record
 * dependency (unlike the UI's buildSettleFromShillsInput), since AuctionPlayer.pos already carries
 * it for any session enrichedCompletingShortfallTeamIds would consider. */
function sessionPositionMap(session: AuctionSession): RosterPositionMap {
  const positions: Record<string, RosterSlotPlayer> = {};
  for (const [playerId, player] of Object.entries(session.players)) {
    if (player.pos) positions[playerId] = player.pos;
  }
  return positions;
}

/**
 * F21 terminal-cascade shill reclamation: reuses the settle-from-shills CORE (same candidate
 * ranking, cheapest-legal-completion assembly, and double-entry source-team bookkeeping as the
 * post-completion "Settle Short Clubs" screen) rather than a parallel implementation, with the
 * Lever-A affordable price cap opted in (see auctionSettleFromShills.ts SettleFromShillsOptions).
 * No-ops when the session carries no shill teams (config.nonCompletingTeamIds empty/absent).
 */
function reclaimShillHeldForShortfall(session: AuctionSession): AuctionSession {
  const shillTeamIds = session.config.nonCompletingTeamIds ?? [];
  if (shillTeamIds.length === 0) return session;
  const result = settleFromShillsCore(
    { session, positions: sessionPositionMap(session), shillTeamIds },
    { affordableCapped: true },
  );
  return result.ok ? result.session : session;
}

function acceptedAfterLotFinalization(session: AuctionSession): AuctionTransitionResult {
  return session.state === 'AUCTION_COMPLETE'
    ? finalizeTerminalAuction(session, false)
    : accepted(session);
}

export function seededNominationOrder(teamIds: readonly string[], seed: string): string[] {
  return [...teamIds].sort((left, right) =>
    hashString(`${seed}:${left}`) - hashString(`${seed}:${right}`) ||
    left.localeCompare(right),
  );
}

/**
 * The exhaustion-state completion guarantee (FABLE-C3): when the pool runs dry with completing
 * teams still unfilled, buy their cheapest VERIFIED-legal completions out of the PASSED lots.
 * k=0 preserves the legacy league-minimum cleanup price. Positive-k reserve sessions charge the
 * reserve unless that would block legal completion; at exhaustion, each cleanup fill is capped at
 * the team's affordable per-open-slot price and never drops below minSalary. Completion legality
 * outranks reserve purity only in this pool-exhausted cleanup state. Deterministic (nomination
 * order; the completion floor's own cheapest-first math). Teams whose completion is positionally
 * impossible from the passed set stay short — nothing more can be done; the shortfall then
 * surfaces downstream instead of silently. No-ops entirely when any position info is missing
 * (legacy sessions).
 */
function backfillFromPassedLots(session: AuctionSession): AuctionSession {
  const passedIds = Array.from(new Set(
    session.results
      .filter((result, index) => isActivePassedResult(session, result, index))
      .map((result) => result.playerId),
  ));
  if (passedIds.length === 0) return session;

  let passedPool: CompletionCandidate[] = [];
  for (const id of passedIds) {
    const player = session.players[id];
    if (!player?.pos) return session;
    passedPool.push({ id, price: lotOpeningAsk(player, session.config), shape: player.pos });
  }

  let teams = [...session.teams];
  let results = [...session.results];
  let saleCount = session.saleCount;

  for (const teamId of session.nominationOrder) {
    const index = teams.findIndex((team) => team.teamId === teamId);
    if (index === -1) continue;
    const team = teams[index];
    if (team.rosterSlotsRemaining <= 0) continue;
    if (isNonCompletingTeam(session, teamId)) continue;

    const rosterShapes: RosterSlotPlayer[] = [];
    let resolvable = true;
    for (const assignment of team.roster) {
      const info = session.players[assignment.playerId]?.pos;
      if (!info) {
        resolvable = false;
        break;
      }
      rosterShapes.push(info);
    }
    if (!resolvable) continue;

    const affordableSlotPrice = team.rosterSlotsRemaining > 0
      ? team.budgetRemaining / team.rosterSlotsRemaining
      : team.minSalary;
    const cleanupPool = passedPool.map((entry) => ({
      ...entry,
      price: auctionReservePriceEnabled(session.config)
        ? Math.max(team.minSalary, Math.min(entry.price, affordableSlotPrice))
        : team.minSalary,
    }));
    const quote = cheapestLegalCompletion(rosterShapes, cleanupPool, team.rosterSlotsRemaining);
    if (!quote.feasible || quote.cost > team.budgetRemaining) continue;

    const pickSet = new Set(quote.pickIds);
    const fillPriceByPlayerId = new Map(cleanupPool.map((entry) => [entry.id, entry.price]));
    const cost = quote.pickIds.reduce(
      (sum, playerId) => sum + (fillPriceByPlayerId.get(playerId) ?? team.minSalary),
      0,
    );
    teams[index] = {
      ...team,
      budgetRemaining: team.budgetRemaining - cost,
      rosterSlotsRemaining: 0,
      roster: [
        ...team.roster,
        ...quote.pickIds.map((playerId) => ({
          playerId,
          salary: fillPriceByPlayerId.get(playerId) ?? team.minSalary,
        })),
      ],
    };
    const sessionForResultRead = { ...session, results };
    results = results.map((result, resultIndex) =>
      pickSet.has(result.playerId) && isActivePassedResult(sessionForResultRead, result, resultIndex)
        ? {
            ...result,
            disposition: 'SOLD' as const,
            winnerTeamId: teamId,
            salary: fillPriceByPlayerId.get(result.playerId) ?? team.minSalary,
            bidderSet: [teamId],
            underbidder: null,
            numBidders: 1,
          }
        : result,
    );
    saleCount += quote.pickIds.length;
    passedPool = passedPool.filter((entry) => !pickSet.has(entry.id));
  }

  return { ...session, teams, results, saleCount };
}

function enrichedCompletingShortfallTeamIds(session: AuctionSession): string[] {
  if (!Object.values(session.players).some((player) => player.pos !== undefined)) return [];
  const shortfallTeamIds: string[] = [];
  for (const team of session.teams) {
    if (isNonCompletingTeam(session, team.teamId)) continue;

    const rosterShapes: RosterSlotPlayer[] = [];
    let enriched = true;
    for (const assignment of team.roster) {
      const shape = session.players[assignment.playerId]?.pos;
      if (!shape) {
        enriched = false;
        break;
      }
      rosterShapes.push(shape);
    }

    // Farm/legacy sessions do not carry MLB legality shapes. Preserve their existing terminal
    // behavior; MLB auctions with enriched positions get the strict no-short-complete guard.
    if (!enriched) continue;
    if (team.roster.length + team.rosterSlotsRemaining !== LEGAL_ROSTER.size) continue;
    if (team.rosterSlotsRemaining > 0 || !isLegalRoster(rosterShapes)) {
      shortfallTeamIds.push(team.teamId);
    }
  }
  return shortfallTeamIds;
}

function finalizeSoldLot(session: AuctionSession, winnerTeamId: string, salary: number): AuctionSession {
  const lot = requireLot(session);
  const saleCount = session.saleCount + 1;
  const resultIndex = session.results.length;
  const teams = session.teams.map((team) => {
    if (team.teamId !== winnerTeamId) return team;
    return {
      ...team,
      // TAXTEETH (JK ruling 2026-07-08, spec-docs/contracts/CONTRACT_TAXTEETH_2026-07-08.md):
      // team.projectedTax is the marginal luxury tax THIS team owes for winning THIS lot's
      // candidate -- recomputed every lot by useAuctionDraft.ts's applyAuctionLuxuryTaxForLot via
      // the canonical auctionMarginalTax engine (the exact formula the whisper's TRUE COST line
      // uses). Charging it here, alongside salary, is what makes TRUE COST an honest number: the
      // whisper's displayed price now equals what actually drains the team's budget. Teams under
      // the tax threshold (the vast majority) carry projectedTax === 0, so this is byte-identical
      // to the pre-fix salary-only settlement for them.
      budgetRemaining: team.budgetRemaining - salary - team.projectedTax,
      rosterSlotsRemaining: Math.max(0, team.rosterSlotsRemaining - 1),
      roster: [...team.roster, { playerId: lot.playerId, salary }],
    };
  });
  const soldSession: AuctionSession = {
    ...session,
    teams,
    state: 'SOLD',
    currentLot: lot,
    pendingClaim: null,
    saleCount,
    results: [
      ...supersedePassedResults(session.results, lot.playerId, resultIndex),
      {
        playerId: lot.playerId,
        disposition: 'SOLD',
        nominatorTeamId: lot.nominatorTeamId,
        winnerTeamId,
        salary,
        ...bidHistorySummary(lot, winnerTeamId),
      },
    ],
  };

  if (isAuctionComplete(soldSession)) {
    return {
      ...soldSession,
      state: 'AUCTION_COMPLETE',
      currentLot: null,
      pendingClaim: null,
    };
  }

  return soldSession;
}

function finalizePassedLot(session: AuctionSession): AuctionSession {
  const lot = requireLot(session);
  const reserveEnabled = auctionReservePriceEnabled(session.config);
  const nextPassCount = passCountFor(session, lot.playerId) + 1;
  const availablePlayerIds = reserveEnabled &&
    nextPassCount < MAX_RESERVE_RENOMINATION_PASSES &&
    !session.availablePlayerIds.includes(lot.playerId)
    ? [...session.availablePlayerIds, lot.playerId]
    : session.availablePlayerIds;
  const resultIndex = session.results.length;
  const passCountByPlayerId = reserveEnabled
    ? { ...(session.passCountByPlayerId ?? {}), [lot.playerId]: nextPassCount }
    : session.passCountByPlayerId;

  const next: AuctionSession = {
    ...session,
    state: 'PASSED',
    currentLot: lot,
    pendingClaim: null,
    availablePlayerIds,
    ...(passCountByPlayerId !== undefined ? { passCountByPlayerId } : {}),
    results: [
      ...supersedePassedResults(session.results, lot.playerId, resultIndex),
      {
        playerId: lot.playerId,
        disposition: 'PASSED',
        nominatorTeamId: lot.nominatorTeamId,
        winnerTeamId: null,
        salary: null,
        ...bidHistorySummary(lot, null),
      },
    ],
  };
  return next;
}

function passCountFor(session: AuctionSession, playerId: string): number {
  const stored = session.passCountByPlayerId?.[playerId];
  if (stored !== undefined) return stored;
  return session.results.filter(
    (result) => result.playerId === playerId && result.disposition === 'PASSED',
  ).length;
}

function supersedePassedResults(
  results: readonly AuctionResult[],
  playerId: string,
  supersededByResultIndex: number,
): AuctionResult[] {
  return results.map((result) =>
    result.playerId === playerId &&
      result.disposition === 'PASSED' &&
      result.supersededByResultIndex === undefined
      ? { ...result, supersededByResultIndex }
      : result,
  );
}

function appendBidLog(lot: Lot, entry: BidLogEntry): readonly BidLogEntry[] {
  return [...(lot.bidLog ?? []), entry];
}

/** Append a bid-log entry to the open lot without any other state change. */
function withBidLogEntry(session: AuctionSession, entry: BidLogEntry): AuctionSession {
  const lot = requireLot(session);
  return { ...session, currentLot: { ...lot, bidLog: appendBidLog(lot, entry) } };
}

/** The AUC-3 result summary derived from a lot's bid log at finalize time. */
function bidHistorySummary(
  lot: Lot,
  winnerTeamId: string | null,
): Pick<AuctionResult, 'bidderSet' | 'underbidder' | 'numBidders'> {
  const log = lot.bidLog ?? [];
  const moneyActions = log.filter((entry) => entry.action !== 'pass');
  const bidderSet = [...new Set(moneyActions.map((entry) => entry.teamId))];
  const lastRivalBid = [...log]
    .reverse()
    .find((entry) => entry.action === 'bid' && entry.teamId !== winnerTeamId);
  return {
    bidderSet,
    underbidder: lastRivalBid?.teamId ?? null,
    numBidders: bidderSet.length,
  };
}

/**
 * LOAD-BEARING SUPPLY GUARD (FABLE-C3 sweep finding): one-chance passes may burn SURPLUS, never
 * the last supply a completing team's legal completion depends on. A no-bid lot whose player is
 * the difference between "this team can still finish legally within budget" and "it cannot" must
 * be force-filled rather than passed out — need-blind pass-outs were draining needed classes
 * while wrong-class surplus remained, wedging full-CPU drafts. Returns the neediest such team,
 * or null when the player is genuinely surplus (or position info is missing — legacy behavior).
 */
/**
 * The joint-class market view (FABLE-C3): remaining pool shapes + every completing team's need
 * breakdown. Null when any position info is missing (legacy sessions — all guards stand down).
 */
function jointClassView(session: AuctionSession): {
  pool: CompletionCandidate[];
  teamStates: Array<{ team: AuctionTeamState; shapes: RosterSlotPlayer[]; need: RosterNeedBreakdown }>;
} | null {
  const pool: CompletionCandidate[] = [];
  for (const id of session.availablePlayerIds) {
    const player = session.players[id];
    if (!player?.pos) return null;
    pool.push({ id, price: lotOpeningAsk(player, session.config), shape: player.pos });
  }
  const teamStates: Array<{ team: AuctionTeamState; shapes: RosterSlotPlayer[]; need: RosterNeedBreakdown }> = [];
  for (const team of session.teams) {
    if (team.rosterSlotsRemaining <= 0) continue;
    if (isNonCompletingTeam(session, team.teamId)) continue;
    const rosterShapes: RosterSlotPlayer[] = [];
    let resolvable = true;
    for (const assignment of team.roster) {
      const info = session.players[assignment.playerId]?.pos;
      if (!info) {
        resolvable = false;
        break;
      }
      rosterShapes.push(info);
    }
    if (!resolvable) continue;
    teamStates.push({ team, shapes: rosterShapes, need: rosterNeedBreakdown(rosterShapes) });
  }
  return { pool, teamStates };
}

/** Does removing `candidateShape` from the market leave a class under-supplied for these needs? */
function candidateServesTightClass(
  candidateShape: RosterSlotPlayer,
  pool: readonly CompletionCandidate[],
  needs: readonly RosterNeedBreakdown[],
): boolean {
  const jointDemand = { startable: 0, relievable: 0, closers: 0, coverage: 0, pitcherBodies: 0, hitterBodies: 0 };
  const primaryDemand = new Map<string, number>();
  for (const need of needs) {
    jointDemand.startable += need.rotationDeficit;
    jointDemand.relievable += need.bullpenDeficit;
    jointDemand.closers += need.closerDeficit;
    jointDemand.coverage += need.catcherCoverNeed;
    // The role-agnostic BODY floors are joint classes too — the tail-game need is usually "any
    // 8th pitcher", which carries no rotation/bullpen deficit at all.
    jointDemand.pitcherBodies += need.pitcherNeed + need.pitcherFloorNeed;
    jointDemand.hitterBodies += need.missingPrimaries.length + need.hitterFloorNeed;
    for (const pos of need.missingPrimaries) {
      primaryDemand.set(pos, (primaryDemand.get(pos) ?? 0) + 1);
    }
  }
  const poolSupply = (predicate: (shape: RosterSlotPlayer) => boolean) =>
    pool.reduce((sum, entry) => sum + (predicate(entry.shape) ? 1 : 0), 0);
  if (candidateShape.isPitcher) {
    const startable = candidateShape.role === 'SP' || candidateShape.role === 'SP/RP';
    const relievable = candidateShape.role === 'RP' || candidateShape.role === 'CP' || candidateShape.role === 'SP/RP';
    if (startable && jointDemand.startable > 0 &&
      poolSupply((s) => s.isPitcher && (s.role === 'SP' || s.role === 'SP/RP')) < jointDemand.startable) return true;
    if (relievable && jointDemand.relievable > 0 &&
      poolSupply((s) => s.isPitcher && (s.role === 'RP' || s.role === 'CP' || s.role === 'SP/RP')) < jointDemand.relievable) return true;
    if (isCloser(candidateShape) && jointDemand.closers > 0 &&
      poolSupply(isCloser) < jointDemand.closers) return true;
    if (jointDemand.pitcherBodies > 0 &&
      poolSupply((s) => s.isPitcher) < jointDemand.pitcherBodies) return true;
  } else {
    const demandAtPos = primaryDemand.get(candidateShape.position) ?? 0;
    if (demandAtPos > 0 &&
      poolSupply((s) => !s.isPitcher && s.position === candidateShape.position) < demandAtPos) return true;
    if (jointDemand.hitterBodies > 0 &&
      poolSupply((s) => !s.isPitcher) < jointDemand.hitterBodies) return true;
  }
  if (jointDemand.coverage > 0 && canCover(candidateShape, 'C') &&
    poolSupply((s) => canCover(s, 'C')) < jointDemand.coverage) return true;
  return false;
}

/**
 * FABLE-C3 (the flex-absorption leak): true when `teamId` winning this player would starve a
 * jointly-tight class OTHER completing teams still need, while the player fills NO hard
 * requirement of the buyer's own. Used by the CPU bidder's opt-in politeness rule — the machine
 * never blocks a human's bid on this basis (sniping stays legal; CPUs just stop doing it blindly
 * at the tail). Permissive on any missing position info.
 */
/**
 * FABLE-C3: does this player serve a class that is TIGHT for `teamId`'s OWN needs (supply below
 * this team's demand once he's gone)? The CPU bidder's exact grab-now signal — fungible needs
 * with plentiful substitutes never trigger it.
 */
export function servesOwnTightClass(
  session: AuctionSession,
  teamId: string,
  playerId: string,
): boolean {
  const candidate = session.players[playerId];
  if (!candidate?.pos) return false;
  const view = jointClassView(session);
  if (view === null) return false;
  const mine = view.teamStates.find((entry) => entry.team.teamId === teamId);
  if (mine === undefined) return false;
  return candidateServesTightClass(candidate.pos, view.pool, [mine.need]);
}

export function wouldStarveJointDemand(
  session: AuctionSession,
  teamId: string,
  playerId: string,
): boolean {
  const candidate = session.players[playerId];
  if (!candidate?.pos) return false;
  const view = jointClassView(session);
  if (view === null) return false;
  // A buyer is a RIGHTFUL contender only when the candidate serves a class tight FOR HIM TOO.
  // "Fills my need" is not enough: a body-floor need is fungible (any hitter satisfies it), and
  // floor-filling buyers absorbing the last scarce primary at a position is exactly the starve
  // this rule exists to stop — the fungible buyer must yield to the position-starved one.
  const mine = view.teamStates.find((entry) => entry.team.teamId === teamId);
  if (mine !== undefined && candidateServesTightClass(candidate.pos, view.pool, [mine.need])) {
    return false;
  }
  const othersNeeds = view.teamStates
    .filter((entry) => entry.team.teamId !== teamId)
    .map((entry) => entry.need);
  return candidateServesTightClass(candidate.pos, view.pool, othersNeeds);
}

function loadBearingTeam(session: AuctionSession, playerId: string): AuctionTeamState | null {
  const candidate = session.players[playerId];
  if (!candidate?.pos) return null;
  const candidateShape = candidate.pos;
  const view = jointClassView(session);
  if (view === null) return null;
  const { pool, teamStates } = view;

  // Criterion 1 — PER-TEAM completion: losing this player breaks some team's only legal path.
  for (const { team, shapes, need } of teamStates) {
    const withCandidate = completionBidCeiling(
      team.budgetRemaining,
      [...shapes, candidateShape],
      pool,
      team.rosterSlotsRemaining - 1,
    );
    if (withCandidate === null) continue; // even WITH him no completion exists — not load-bearing
    const withoutCandidate = completionBidCeiling(
      team.budgetRemaining,
      shapes,
      pool,
      team.rosterSlotsRemaining,
    );
    if (withoutCandidate === null) {
      // FABLE-C3-FIX F2: the forced fill is a SALE at the opening ask — the recipient must be
      // able to AFFORD it (the same guard Criterion 2 already carries), or the rescue mints a
      // negative budget / tier-cap violation. An unaffordable-only team stays short here; the
      // minSalary-priced exhaustion cleanup is its remaining, affordable-by-construction net.
      return team; // losing him breaks this team's completion
    }
    // A zero ceiling still means "needed, but only affordable at the completion floor." Treat
    // that as load-bearing so the surplus branch cannot mistake unaffordable needed supply for
    // true surplus; resolveNoBidLot still refuses to force-sell above the team's ceiling.
    if (withoutCandidate === 0 && playerFillsHardRequirement(candidateShape, need)) return team;
  }

  // Criterion 2 — JOINT class demand (the musical-chairs case): each team can individually still
  // complete via the other remaining players, but the SUM of their class needs exceeds what the
  // pool holds once this player is gone. Per-team completion checks are blind to it by nature.
  if (candidateServesTightClass(candidateShape, pool, teamStates.map((entry) => entry.need))) {
    // Recipient: prefer the team for whom this player's class is TIGHT (a fungible floor-need
    // recipient would recreate the starve one level down), then the neediest.
    const ranked = [...teamStates].sort((l, r) => {
      const lTight = candidateServesTightClass(candidateShape, pool, [l.need]) ? 1 : 0;
      const rTight = candidateServesTightClass(candidateShape, pool, [r.need]) ? 1 : 0;
      return rTight - lTight
        || r.need.minimumAdditions - l.need.minimumAdditions
        || l.team.teamId.localeCompare(r.team.teamId);
    });
    for (const { team, need } of ranked) {
      if (!playerFillsHardRequirement(candidateShape, need)) continue;
      if ((sessionBidCeiling(session, team.teamId) ?? 0) < requireLot(session).openingAsk) continue;
      return team;
    }
  }
  return null;
}

function resolveNoBidLot(session: AuctionSession): AuctionSession {
  const lot = requireLot(session);
  // END-CHECKPOINT (FABLE-C3): only COMPLETING teams' open slots are real demand — a
  // non-completing shill's phantom 22 must not inflate the count and pass out lots the
  // completing teams will still need force-filled.
  const totalOpenSlots = session.teams.reduce(
    (sum, team) =>
      isNonCompletingTeam(session, team.teamId)
        ? sum
        : sum + Math.max(0, team.rosterSlotsRemaining),
    0,
  );
  const remainingPool = session.availablePlayerIds.length;

  // One-chance no-bid invariant: when upstream supplies players >= open slots,
  // keep available + current lot >= open slots by forcing a cheap filler before
  // a PASSED result could strand a roster slot — UNLESS this player is load-bearing supply for
  // some completing team, in which case count-surplus is a lie and he must be force-filled.
  if (remainingPool >= totalOpenSlots) {
    const needyTeam = loadBearingTeam(session, lot.playerId);
    if (needyTeam !== null && !bidWouldStrand(session, needyTeam, lot.playerId)) {
      const maxBid = sessionBidCeiling(session, needyTeam.teamId) ?? 0;
      if (maxBid < lot.openingAsk) return finalizePassedLot(session);
      return finalizeSoldLot(
        withBidLogEntry(session, { teamId: needyTeam.teamId, action: 'forced-fill', amount: lot.openingAsk }),
        needyTeam.teamId,
        lot.openingAsk,
      );
    }
    return finalizePassedLot(session);
  }

  const forcedTeam = selectForcedFillerTeam(session, lot.openingAsk, lot.playerId);
  if (forcedTeam === null) return finalizePassedLot(session);

  return finalizeSoldLot(
    withBidLogEntry(session, { teamId: forcedTeam.teamId, action: 'forced-fill', amount: lot.openingAsk }),
    forcedTeam.teamId,
    lot.openingAsk,
  );
}

function selectForcedFillerTeam(
  session: AuctionSession,
  openingAsk: number,
  playerId: string,
): AuctionTeamState | null {
  const nominationOrderIndex = new Map<string, number>();
  session.nominationOrder.forEach((teamId, index) => {
    nominationOrderIndex.set(teamId, index);
  });

  const eligible = session.teams.filter((team) => {
    if (team.rosterSlotsRemaining <= 0) return false;
    // END-CHECKPOINT (FABLE-C3): a no-bid lot must never be FORCED onto a pure-pressure shill —
    // it would silently eat supply the completing teams are entitled to.
    if (isNonCompletingTeam(session, team.teamId)) return false;
    // Audit R2-2: the forced filler is a SALE — it must honor the same position-aware strand guard
    // as the two bidding paths, or a no-bid lot can hand a team a wrong-position player and
    // complete an ILLEGAL roster. When every otherwise-eligible team would strand, the existing
    // no-taker fallback (permanent pass-out) applies.
    if (bidWouldStrand(session, team, playerId)) return false;
    return (sessionBidCeiling(session, team.teamId) ?? 0) >= openingAsk;
  });

  return eligible.sort((left, right) => {
    const slotDiff = right.rosterSlotsRemaining - left.rosterSlotsRemaining;
    if (slotDiff !== 0) return slotDiff;

    const leftOrder = nominationOrderIndex.get(left.teamId) ?? Number.POSITIVE_INFINITY;
    const rightOrder = nominationOrderIndex.get(right.teamId) ?? Number.POSITIVE_INFINITY;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;

    return left.teamId.localeCompare(right.teamId);
  })[0] ?? null;
}

function minimumLegalBid(lot: Lot, bidIncrement: number): number {
  return lot.highBid === null ? lot.openingAsk : lot.highBid + bidIncrement;
}

function normalizeTeam(team: AuctionTeamInput): AuctionTeamState {
  return {
    teamId: team.teamId,
    budgetRemaining: team.budgetRemaining,
    rosterSlotsRemaining: team.rosterSlotsRemaining,
    minSalary: team.minSalary ?? LEAGUE_MINIMUM_SALARY,
    // CALLFIX Item 5(b): AuctionTeamInput never carried a meaningful projectedTax -- every real
    // caller either omitted it or passed 0, and auctionMaxBid's own two call sites (below and
    // scripts/marketModelPredictor.ts) always pass a literal 0 for their projectedTax argument
    // too, never team.projectedTax -- so the old `team.projectedTax ?? 0` pass-through was dead on
    // arrival. AuctionTeamState.projectedTax stays a real, live field (useAuctionDraft.ts
    // recomputes it per-lot via computeAuctionTeamProjectedTaxWithCaps); only the dead INPUT
    // pass-through is removed here. TRUE COST is untouched -- it uses the separate
    // auctionMarginalTax path (LeagueBuilderAuctionDraft.tsx), not this field.
    projectedTax: 0,
    roster: team.roster ? [...team.roster] : [],
  };
}

function sanitizeNominationOrder(order: readonly string[], teamIds: readonly string[]): string[] {
  const validTeamIds = new Set(teamIds);
  const seen = new Set<string>();
  const sanitized: string[] = [];
  for (const teamId of order) {
    if (!validTeamIds.has(teamId) || seen.has(teamId)) continue;
    seen.add(teamId);
    sanitized.push(teamId);
  }
  for (const teamId of teamIds) {
    if (!seen.has(teamId)) sanitized.push(teamId);
  }
  return sanitized;
}

function findNextOpenNominationIndex(
  teams: readonly AuctionTeamState[],
  nominationOrder: readonly string[],
  startIndex: number,
): number {
  if (nominationOrder.length === 0) return -1;
  for (let offset = 0; offset < nominationOrder.length; offset += 1) {
    const index = (startIndex + offset) % nominationOrder.length;
    const teamId = nominationOrder[index];
    const team = teams.find((candidate) => candidate.teamId === teamId);
    if (team !== undefined && team.rosterSlotsRemaining > 0) return index;
  }
  return -1;
}

function findTeam(session: AuctionSession, teamId: string): AuctionTeamState | null {
  return session.teams.find((team) => team.teamId === teamId) ?? null;
}

/** END-CHECKPOINT membership (FABLE-C3): is this team exempt from roster completion? */
function isNonCompletingTeam(session: AuctionSession, teamId: string): boolean {
  return session.config.nonCompletingTeamIds?.includes(teamId) ?? false;
}

/**
 * The auction is complete when every COMPLETING team is full (FABLE-C3 end-checkpoint: teams in
 * `config.nonCompletingTeamIds` — pure-pressure shills — never block completion). Sessions
 * without the field keep the historical everyone-must-fill semantics.
 */
function isAuctionComplete(session: AuctionSession): boolean {
  return session.teams.every(
    (team) => team.rosterSlotsRemaining <= 0 || isNonCompletingTeam(session, team.teamId),
  );
}

function requireLot(session: AuctionSession): Lot {
  if (session.currentLot === null) {
    throw new Error('auction state machine invariant violated: current lot is required');
  }
  return session.currentLot;
}

function accepted(session: AuctionSession): AuctionTransitionResult {
  return { ok: true, session };
}

function rejected(session: AuctionSession, reason: AuctionRejectionReason): AuctionTransitionResult {
  return { ok: false, session, reason };
}

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}
