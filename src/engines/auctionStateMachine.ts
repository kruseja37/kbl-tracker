import {
  DEFAULT_AUCTION_SETUP_CONFIG,
  type AuctionSetupConfig,
} from '../data/auctionEngineConstants';
import {
  LEAGUE_MINIMUM_SALARY,
  auctionMaxBid,
  reservePriceCurve,
} from '../data/rosterEngineConstants';

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

export interface PassedPlayerTracker {
  totalPasses: number;
  passCountSinceLastSale: number;
  lastPassSaleCount: number;
  blockedUntilSaleCount: number;
  lastPassNominatorTeamId: string;
  lastPassNominationRound: number;
  setAside: boolean;
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
  setAsidePlayerIds: readonly string[];
  passedTracker: Readonly<Record<string, PassedPlayerTracker>>;
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
  | 'player-blocked-by-nominator-cycle'
  | 'player-blocked-until-sale'
  | 'player-set-aside'
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
    setAsidePlayerIds: [],
    passedTracker: {},
    currentLot: null,
    pendingClaim: null,
    results: [],
    saleCount: 0,
  };
}

export function getCurrentNominator(session: AuctionSession): string | null {
  if (session.state === 'AUCTION_COMPLETE' || session.nominationOrder.length === 0) return null;
  return session.nominationOrder[session.nominationIndex] ?? null;
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

export function nominatePlayer(session: AuctionSession, playerId: string): AuctionTransitionResult {
  if (session.state === 'AUCTION_COMPLETE') return rejected(session, 'auction-complete');
  if (session.state !== 'NOMINATION') return rejected(session, 'expected-nomination');
  if (session.currentLot !== null) return rejected(session, 'current-lot-open');

  const nominatorTeamId = getCurrentNominator(session);
  if (nominatorTeamId === null) return rejected(session, 'no-open-nominator');

  const nominator = findTeam(session, nominatorTeamId);
  if (nominator === null) return rejected(session, 'team-not-found');
  if (nominator.rosterSlotsRemaining <= 0) return rejected(session, 'nominator-full');

  const availability = getNominationBlockReason(session, playerId, nominatorTeamId);
  if (availability !== null) return rejected(session, availability);

  const player = session.players[playerId];
  const openingAsk = reservePriceCurve(player.ivPercentile) * player.iv;
  const stillIn = session.teams
    .filter((team) => team.rosterSlotsRemaining > 0)
    .map((team) => team.teamId);

  return accepted({
    ...session,
    state: 'OPEN_BIDDING',
    currentLot: {
      playerId,
      nominatorTeamId,
      openingAsk,
      highBid: null,
      highBidder: null,
      stillIn,
    },
    pendingClaim: null,
    availablePlayerIds: session.availablePlayerIds.filter((id) => id !== playerId),
  });
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

  return accepted({
    ...session,
    currentLot: {
      ...lot,
      highBid: bid,
      highBidder: teamId,
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
    },
  });
}

export function evaluateResolve(session: AuctionSession): AuctionTransitionResult {
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

  return accepted(finalizePassedLot(session));
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

  return accepted(finalizeSoldLot(session, claim.teamId, claim.price));
}

export function passLoneSurvivor(session: AuctionSession): AuctionTransitionResult {
  if (session.state !== 'RESOLVE') return rejected(session, 'expected-resolve');
  if (session.pendingClaim === null) return rejected(session, 'no-pending-claim');

  return accepted(finalizePassedLot(session));
}

export function rotateNomination(session: AuctionSession): AuctionTransitionResult {
  if (session.state === 'AUCTION_COMPLETE') return accepted(session);
  if (session.state !== 'SOLD' && session.state !== 'PASSED') {
    return rejected(session, 'expected-passed-or-sold');
  }
  if (isAuctionComplete(session)) {
    return accepted({
      ...session,
      state: 'AUCTION_COMPLETE',
      currentLot: null,
      pendingClaim: null,
    });
  }

  const next = findNextOpenNominationIndex(session.teams, session.nominationOrder, session.nominationIndex + 1);
  if (next === -1) {
    return accepted({
      ...session,
      state: 'AUCTION_COMPLETE',
      currentLot: null,
      pendingClaim: null,
    });
  }

  return accepted({
    ...session,
    state: 'NOMINATION',
    currentLot: null,
    pendingClaim: null,
    nominationIndex: next,
    nominationRound: session.nominationRound + (next <= session.nominationIndex ? 1 : 0),
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
  const releasedSession = releaseEligiblePassedPlayers({
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
  });

  if (isAuctionComplete(releasedSession)) {
    return {
      ...releasedSession,
      state: 'AUCTION_COMPLETE',
      currentLot: null,
      pendingClaim: null,
    };
  }

  return releasedSession;
}

function finalizePassedLot(session: AuctionSession): AuctionSession {
  const lot = requireLot(session);
  const previous = session.passedTracker[lot.playerId];
  const sameSaleWindow = previous?.lastPassSaleCount === session.saleCount;
  const passCountSinceLastSale = sameSaleWindow ? previous.passCountSinceLastSale + 1 : 1;
  const setAside = passCountSinceLastSale >= 2;
  const tracker: PassedPlayerTracker = {
    totalPasses: (previous?.totalPasses ?? 0) + 1,
    passCountSinceLastSale,
    lastPassSaleCount: session.saleCount,
    blockedUntilSaleCount: session.saleCount + 1,
    lastPassNominatorTeamId: lot.nominatorTeamId,
    lastPassNominationRound: session.nominationRound,
    setAside,
  };
  const setAsidePlayerIds = setAside
    ? sortPlayerIds(session, unique([...session.setAsidePlayerIds, lot.playerId]))
    : session.setAsidePlayerIds;

  return {
    ...session,
    state: 'PASSED',
    currentLot: lot,
    pendingClaim: null,
    passedTracker: {
      ...session.passedTracker,
      [lot.playerId]: tracker,
    },
    setAsidePlayerIds,
    results: [
      ...session.results,
      {
        playerId: lot.playerId,
        disposition: setAside ? 'SET_ASIDE' : 'PASSED',
        nominatorTeamId: lot.nominatorTeamId,
        winnerTeamId: null,
        salary: null,
      },
    ],
  };
}

function releaseEligiblePassedPlayers(session: AuctionSession): AuctionSession {
  const releasable = Object.entries(session.passedTracker)
    .filter(([, tracker]) => !tracker.setAside && tracker.blockedUntilSaleCount <= session.saleCount)
    .map(([playerId]) => playerId);
  if (releasable.length === 0) return session;

  return {
    ...session,
    availablePlayerIds: sortPlayerIds(
      session,
      unique([
        ...session.availablePlayerIds,
        ...releasable.filter((playerId) => session.players[playerId] !== undefined),
      ]),
    ),
  };
}

function getNominationBlockReason(
  session: AuctionSession,
  playerId: string,
  nominatorTeamId: string,
): AuctionRejectionReason | null {
  if (session.players[playerId] === undefined) return 'unknown-player';
  if (session.setAsidePlayerIds.includes(playerId)) return 'player-set-aside';

  const tracker = session.passedTracker[playerId];
  if (!session.availablePlayerIds.includes(playerId)) {
    if (tracker !== undefined && tracker.blockedUntilSaleCount > session.saleCount) {
      return 'player-blocked-until-sale';
    }
    return 'player-already-sold-or-unavailable';
  }
  if (
    tracker !== undefined &&
    !tracker.setAside &&
    tracker.lastPassNominatorTeamId === nominatorTeamId &&
    tracker.lastPassNominationRound >= session.nominationRound
  ) {
    return 'player-blocked-by-nominator-cycle';
  }

  return null;
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

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function sortPlayerIds(session: AuctionSession, playerIds: readonly string[]): string[] {
  const order = new Map(session.playerOrder.map((playerId, index) => [playerId, index]));
  return [...playerIds].sort((left, right) =>
    (order.get(left) ?? Number.MAX_SAFE_INTEGER) - (order.get(right) ?? Number.MAX_SAFE_INTEGER) ||
    left.localeCompare(right),
  );
}

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}
