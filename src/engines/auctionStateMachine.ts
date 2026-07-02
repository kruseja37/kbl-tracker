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
import type { RosterSlotPlayer } from '../data/rosterConstruction';
import { wouldStrandRoster } from './rosterNeed';

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
  projectedTax?: number;
  roster?: readonly AuctionRosterAssignment[];
}

export interface Lot {
  playerId: string;
  nominatorTeamId: string;
  openingAsk: number;
  highBid: number | null;
  highBidder: string | null;
  stillIn: readonly string[];
  bidTurnTeamId: string | null;
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
}

export interface AuctionSession {
  state: AuctionState;
  config: AuctionSetupConfig;
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
}

export interface InitAuctionSessionInput {
  teams: readonly AuctionTeamInput[];
  players: readonly AuctionPlayer[];
  config?: Partial<AuctionSetupConfig>;
  nominationOrder?: readonly string[];
}

export type AuctionRejectionReason =
  | 'auction-complete'
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

export function initAuctionSession(input: InitAuctionSessionInput): AuctionSession {
  const config: AuctionSetupConfig = {
    ...DEFAULT_AUCTION_SETUP_CONFIG,
    ...input.config,
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

  return {
    state: nominationIndex === -1 ? 'AUCTION_COMPLETE' : 'NOMINATION',
    config,
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

export function getTeamAuctionMaxBid(session: AuctionSession, teamId: string): number | null {
  const team = findTeam(session, teamId);
  if (team === null) return null;
  return auctionMaxBid(
    team.budgetRemaining,
    team.rosterSlotsRemaining,
    team.minSalary,
    team.projectedTax,
  );
}

export function surfaceNextPlayer(session: AuctionSession): AuctionTransitionResult {
  if (session.state === 'AUCTION_COMPLETE') return rejected(session, 'auction-complete');
  if (session.state !== 'NOMINATION') return rejected(session, 'expected-nomination');
  if (session.currentLot !== null) return rejected(session, 'current-lot-open');

  const playerId = selectNextNominee(session);
  if (playerId === null) {
    return accepted({
      ...session,
      state: 'AUCTION_COMPLETE',
      currentLot: null,
      pendingClaim: null,
    });
  }

  const player = session.players[playerId];
  const openingAsk = session.config.flatReserveFloor != null
    ? session.config.flatReserveFloor
    : reservePriceCurve(player.ivPercentile) * player.iv;
  const stillIn = session.teams
    .filter((team) => team.rosterSlotsRemaining > 0)
    .map((team) => team.teamId);
  if (stillIn.length === 0) {
    return accepted({
      ...session,
      state: 'AUCTION_COMPLETE',
      currentLot: null,
      pendingClaim: null,
    });
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
  return wouldStrandRoster(
    team.roster.map((assignment) => assignment.playerId),
    playerId,
    positions,
  );
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

  const maxBid = auctionMaxBid(team.budgetRemaining, team.rosterSlotsRemaining, team.minSalary, team.projectedTax);
  if (bid > maxBid) return rejected(session, 'bid-above-solvency-cap');

  if (bidWouldStrand(session, team, lot.playerId)) return rejected(session, 'bid-strands-roster');

  return accepted({
    ...session,
    currentLot: {
      ...lot,
      highBid: bid,
      highBidder: teamId,
      bidTurnTeamId: nextBidTurn(session.nominationOrder, lot.stillIn, teamId, teamId),
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
    return accepted(finalizeSoldLot(session, lot.highBidder, lot.highBid));
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

  return accepted(resolveNoBidLot(session));
}

export function claimLoneSurvivor(session: AuctionSession): AuctionTransitionResult {
  if (session.state !== 'RESOLVE') return rejected(session, 'expected-resolve');
  const claim = session.pendingClaim;
  if (claim === null) return rejected(session, 'no-pending-claim');
  const team = findTeam(session, claim.teamId);
  if (team === null) return rejected(session, 'team-not-found');
  if (team.rosterSlotsRemaining <= 0) return rejected(session, 'team-full');

  const maxBid = auctionMaxBid(team.budgetRemaining, team.rosterSlotsRemaining, team.minSalary, team.projectedTax);
  if (claim.price > maxBid) return rejected(session, 'claim-above-solvency-cap');

  if (bidWouldStrand(session, team, claim.playerId)) return rejected(session, 'bid-strands-roster');

  return accepted(finalizeSoldLot(session, claim.teamId, claim.price));
}

export function passLoneSurvivorOut(session: AuctionSession): AuctionTransitionResult {
  if (session.state !== 'RESOLVE') return rejected(session, 'expected-resolve');
  if (session.pendingClaim === null) return rejected(session, 'no-pending-claim');

  return accepted(resolveNoBidLot(session));
}

export function advanceLot(session: AuctionSession): AuctionTransitionResult {
  if (session.state === 'AUCTION_COMPLETE') return accepted(session);
  if (session.state !== 'SOLD' && session.state !== 'PASSED') {
    return rejected(session, 'expected-passed-or-sold');
  }
  if (isAuctionComplete(session) || session.availablePlayerIds.length === 0) {
    return accepted({
      ...session,
      state: 'AUCTION_COMPLETE',
      currentLot: null,
      pendingClaim: null,
    });
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

export function seededNominationOrder(teamIds: readonly string[], seed: string): string[] {
  return [...teamIds].sort((left, right) =>
    hashString(`${seed}:${left}`) - hashString(`${seed}:${right}`) ||
    left.localeCompare(right),
  );
}

function finalizeSoldLot(session: AuctionSession, winnerTeamId: string, salary: number): AuctionSession {
  const lot = requireLot(session);
  const saleCount = session.saleCount + 1;
  const teams = session.teams.map((team) => {
    if (team.teamId !== winnerTeamId) return team;
    return {
      ...team,
      budgetRemaining: team.budgetRemaining - salary,
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
      ...session.results,
      {
        playerId: lot.playerId,
        disposition: 'SOLD',
        nominatorTeamId: lot.nominatorTeamId,
        winnerTeamId,
        salary,
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

function finalizePassedLotPermanent(session: AuctionSession): AuctionSession {
  const lot = requireLot(session);

  return {
    ...session,
    state: 'PASSED',
    currentLot: lot,
    pendingClaim: null,
    results: [
      ...session.results,
      {
        playerId: lot.playerId,
        disposition: 'PASSED',
        nominatorTeamId: lot.nominatorTeamId,
        winnerTeamId: null,
        salary: null,
      },
    ],
  };
}

function resolveNoBidLot(session: AuctionSession): AuctionSession {
  const lot = requireLot(session);
  const totalOpenSlots = session.teams.reduce(
    (sum, team) => sum + Math.max(0, team.rosterSlotsRemaining),
    0,
  );
  const remainingPool = session.availablePlayerIds.length;

  // One-chance no-bid invariant: when upstream supplies players >= open slots,
  // keep available + current lot >= open slots by forcing a cheap filler before
  // a PASSED result could strand a roster slot.
  if (remainingPool >= totalOpenSlots) return finalizePassedLotPermanent(session);

  const forcedTeam = selectForcedFillerTeam(session, lot.openingAsk, lot.playerId);
  if (forcedTeam === null) return finalizePassedLotPermanent(session);

  return finalizeSoldLot(session, forcedTeam.teamId, lot.openingAsk);
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
    // Audit R2-2: the forced filler is a SALE — it must honor the same position-aware strand guard
    // as the two bidding paths, or a no-bid lot can hand a team a wrong-position player and
    // complete an ILLEGAL roster. When every otherwise-eligible team would strand, the existing
    // no-taker fallback (permanent pass-out) applies.
    if (bidWouldStrand(session, team, playerId)) return false;
    return auctionMaxBid(
      team.budgetRemaining,
      team.rosterSlotsRemaining,
      team.minSalary,
      team.projectedTax,
    ) >= openingAsk;
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
    projectedTax: team.projectedTax ?? 0,
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

function isAuctionComplete(session: AuctionSession): boolean {
  return session.teams.every((team) => team.rosterSlotsRemaining <= 0);
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
