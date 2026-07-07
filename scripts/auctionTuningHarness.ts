import { DEFAULT_AUCTION_SETUP_CONFIG } from '../src/data/auctionEngineConstants';
import {
  LEAGUE_MINIMUM_SALARY,
} from '../src/data/rosterEngineConstants';
import type { RosterSlotPlayer } from '../src/data/rosterConstruction';
import {
  BANDS,
  type Band,
  type BandPriorities,
} from '../src/engines/leagueConstruction';
import {
  advanceLot,
  claimLoneSurvivor,
  getCurrentBidderTeamId,
  getTeamAuctionMaxBid,
  initAuctionSession,
  isActivePassedResult,
  passBid,
  passLoneSurvivorOut,
  recordBid,
  resolveLot,
  surfaceNextPlayer,
  type AuctionPlayer,
  type AuctionResult,
  type AuctionSession,
  type AuctionTeamInput,
  type AuctionTeamState,
  type AuctionTransitionResult,
  type Lot,
} from '../src/engines/auctionStateMachine';
import {
  cpuBidOnLot,
  cpuDecideLoneSurvivor,
  type CpuShillAuctionPlayer,
  type CpuShillAuctionSession,
  type CpuShillPersonality,
  type CpuShillProfile,
} from '../src/engines/cpuShillBidding';
import { computeFarmTierCap } from '../src/utils/farmAuctionWallet';

export type AuctionKind = 'MLB' | 'FARM';
export type AuctionTuningScenario = 'all-pass' | 'value-bidding' | 'pass-heavy-real';
export type ArchetypeAssignmentMode = 'neutral' | 'six-band-cycle' | 'offense-vs-pitching';
export type TeamProfileAssignmentMode = 'seeded-balanced' | 'spender-wildcards' | 'zealot-pitching';

export interface AuctionTuningCase {
  label: string;
  kind: AuctionKind;
  slotsPerTeam: number;
  poolSize: number;
  scenario: AuctionTuningScenario;
  archetypeAssignment: ArchetypeAssignmentMode;
  teamProfileAssignment: TeamProfileAssignmentMode;
  includePositionInfo?: boolean;
  carryoverPct?: number;
  /** ADDITIVE (FABLE-C3): override the default 8-real / 2-shill team mix. */
  realTeams?: number;
  shillTeams?: number;
  /** ADDITIVE (FABLE-C3): run with the end-checkpoint — shills never complete a roster. */
  endCheckpoint?: boolean;
  /** ADDITIVE (FABLE-C3): real teams use the need-aware endgame override (never the shills). */
  needAwareRealTeams?: boolean;
  /** ADDITIVE (FABLE-C3): cap each shill's wins (the aggression lever; absent = uncapped). */
  shillMaxWins?: number;
}

export interface AuctionPriceBand {
  low: number;
  median: number;
  high: number;
  predictorId?: string;
}

export interface AuctionPricePredictionContext {
  caseLabel: string;
  kind: AuctionKind;
  scenario: AuctionTuningScenario;
  runIndex: number;
  lotIndex: number;
  step: number;
  seed: string;
  player: CpuShillAuctionPlayer;
  lot: Lot;
  teamStates: readonly AuctionTeamState[];
  shillTeamIds: readonly string[];
  teamProfiles: Readonly<Record<string, CpuShillProfile>>;
  realOpenSlots: number;
  availablePlayerCount: number;
  bidIncrement: number;
}

export type AuctionPriceBandPredictor = (context: AuctionPricePredictionContext) => AuctionPriceBand;

export interface AuctionLotObservation {
  caseLabel: string;
  kind: AuctionKind;
  scenario: AuctionTuningScenario;
  archetypeAssignment: ArchetypeAssignmentMode;
  teamProfileAssignment: TeamProfileAssignmentMode;
  runIndex: number;
  lotIndex: number;
  playerId: string;
  playerIv: number;
  playerIvPercentile: number;
  openingAsk: number;
  predictedLow: number;
  predictedMedian: number;
  predictedHigh: number;
  predictorId: string;
  disposition: AuctionResult['disposition'] | 'UNRESOLVED';
  winnerTeamId: string | null;
  winnerKind: 'real' | 'shill' | null;
  clearingPrice: number | null;
  covered: boolean | null;
}

export interface AuctionTuningRunResult {
  completed: boolean;
  surfacedLots: number;
  realShortfall: number;
  salaryFloorViolations: number;
  minRealRoster: number;
  shillWins: number;
  passedLots: number;
  realSpend: number;
  farmCarryover: number;
  lotObservations: readonly AuctionLotObservation[];
}

export interface AuctionTuningFailure {
  case: string;
  runIndex: number;
  kind: 'incomplete' | 'real-shortfall' | 'salary-floor';
  realShortfall?: number;
  minRealRoster?: number;
  shillWins?: number;
  passedLots?: number;
  surfacedLots?: number;
  realSpend?: number;
  salaryFloorViolations?: number;
}

export interface AuctionCoverageSummary {
  observedLots: number;
  soldLots: number;
  passedLots: number;
  coveredLots: number;
  missedLow: number;
  missedHigh: number;
  coverageRate: number;
  realSoldLots: number;
  realCoverageRate: number;
  shillSoldLots: number;
  shillCoverageRate: number;
  avgBandWidth: number;
  avgBandWidthPctOfPrice: number;
  medianAbsPctError: number;
  p90AbsPctError: number;
  runCoverageP05: number;
  runCoverageP50: number;
  runCoverageP95: number;
  targetCoverageLow: 0.85;
  targetCoverageHigh: 0.9;
}

export interface AuctionTuningSummary extends AuctionTuningCase {
  runs: number;
  shortfallRuns: number;
  maxShortfall: number;
  salaryFloorViolationRuns: number;
  avgShortfall: number;
  avgMinRealRoster: number;
  avgShillWins: number;
  p95ShillWins: number;
  avgPassedLots: number;
  avgSurfacedLots: number;
  avgRealSpend: number;
  avgFarmCarryover: number;
  coverage: AuctionCoverageSummary;
  failures: readonly AuctionTuningFailure[];
}

const REAL_TEAM_COUNT = 8;
const SHILL_TEAM_COUNT = 2;
const TOTAL_TEAM_COUNT = REAL_TEAM_COUNT + SHILL_TEAM_COUNT;
const MAX_STEPS = 20_000;

const MLB_ROSTER_TEMPLATE: readonly RosterSlotPlayer[] = [
  { isPitcher: false, position: 'C', secondaryPosition: null },
  { isPitcher: false, position: '1B', secondaryPosition: '1B/OF' },
  { isPitcher: false, position: '2B', secondaryPosition: 'IF' },
  { isPitcher: false, position: '3B', secondaryPosition: 'IF' },
  { isPitcher: false, position: 'SS', secondaryPosition: 'IF' },
  { isPitcher: false, position: 'LF', secondaryPosition: 'OF' },
  { isPitcher: false, position: 'CF', secondaryPosition: 'OF' },
  { isPitcher: false, position: 'RF', secondaryPosition: 'OF' },
  { isPitcher: false, position: 'C', secondaryPosition: '1B' },
  { isPitcher: false, position: '1B', secondaryPosition: '1B/OF' },
  { isPitcher: false, position: '2B', secondaryPosition: 'IF/OF' },
  { isPitcher: false, position: 'LF', secondaryPosition: 'OF' },
  { isPitcher: false, position: 'CF', secondaryPosition: 'OF' },
  { isPitcher: false, position: 'SS', secondaryPosition: 'IF' },
  { isPitcher: true, position: 'P', role: 'SP' },
  { isPitcher: true, position: 'P', role: 'SP' },
  { isPitcher: true, position: 'P', role: 'SP' },
  { isPitcher: true, position: 'P', role: 'SP/RP', twoWayVariant: 'C' },
  { isPitcher: true, position: 'P', role: 'RP' },
  { isPitcher: true, position: 'P', role: 'RP' },
  { isPitcher: true, position: 'P', role: 'RP' },
  { isPitcher: true, position: 'P', role: 'CP' },
];

export const DEFAULT_AUCTION_TUNING_CASES: readonly AuctionTuningCase[] = [
  {
    label: 'MLB exact total 10x22 / six-band shills',
    kind: 'MLB',
    slotsPerTeam: 22,
    poolSize: TOTAL_TEAM_COUNT * 22,
    scenario: 'value-bidding',
    archetypeAssignment: 'six-band-cycle',
    teamProfileAssignment: 'seeded-balanced',
  },
  {
    label: 'MLB 1.2x total 10x22 / six-band shills',
    kind: 'MLB',
    slotsPerTeam: 22,
    poolSize: Math.ceil(TOTAL_TEAM_COUNT * 22 * 1.2),
    scenario: 'value-bidding',
    archetypeAssignment: 'six-band-cycle',
    teamProfileAssignment: 'seeded-balanced',
  },
  {
    label: 'MLB 1.2x pass-heavy real teams / spender wildcards',
    kind: 'MLB',
    slotsPerTeam: 22,
    poolSize: Math.ceil(TOTAL_TEAM_COUNT * 22 * 1.2),
    scenario: 'pass-heavy-real',
    archetypeAssignment: 'offense-vs-pitching',
    teamProfileAssignment: 'spender-wildcards',
  },
  {
    label: 'MLB 1.2x all-pass tail-fill / neutral',
    kind: 'MLB',
    slotsPerTeam: 22,
    poolSize: Math.ceil(TOTAL_TEAM_COUNT * 22 * 1.2),
    scenario: 'all-pass',
    archetypeAssignment: 'neutral',
    teamProfileAssignment: 'seeded-balanced',
  },
  {
    label: 'FARM exact total 10x10 / six-band shills',
    kind: 'FARM',
    slotsPerTeam: 10,
    poolSize: TOTAL_TEAM_COUNT * 10,
    scenario: 'value-bidding',
    archetypeAssignment: 'six-band-cycle',
    teamProfileAssignment: 'zealot-pitching',
  },
  {
    label: 'FARM 1.2x total 10x10 / six-band shills',
    kind: 'FARM',
    slotsPerTeam: 10,
    poolSize: Math.ceil(TOTAL_TEAM_COUNT * 10 * 1.2),
    scenario: 'value-bidding',
    archetypeAssignment: 'six-band-cycle',
    teamProfileAssignment: 'seeded-balanced',
  },
  {
    label: 'FARM 1.2x pass-heavy real teams / spender wildcards',
    kind: 'FARM',
    slotsPerTeam: 10,
    poolSize: Math.ceil(TOTAL_TEAM_COUNT * 10 * 1.2),
    scenario: 'pass-heavy-real',
    archetypeAssignment: 'offense-vs-pitching',
    teamProfileAssignment: 'spender-wildcards',
  },
  {
    label: 'FARM 1.2x all-pass tail-fill / neutral',
    kind: 'FARM',
    slotsPerTeam: 10,
    poolSize: Math.ceil(TOTAL_TEAM_COUNT * 10 * 1.2),
    scenario: 'all-pass',
    archetypeAssignment: 'neutral',
    teamProfileAssignment: 'seeded-balanced',
  },
];

export const placeholderAuctionPriceBandPredictor: AuctionPriceBandPredictor = (context) => {
  const percentilePressure = 0.78 + clamp(context.player.ivPercentile / 100, 0, 1) * 0.14;
  const median = roundToIncrement(
    Math.max(context.lot.openingAsk, context.player.iv * percentilePressure),
    context.bidIncrement,
    'nearest',
  );
  const earlyAuctionPressure = context.realOpenSlots / Math.max(1, context.availablePlayerCount);
  const shillUncertainty = context.shillTeamIds.length * 0.055;
  const spread = 0.38 + earlyAuctionPressure * 0.18 + shillUncertainty;
  const low = roundToIncrement(Math.max(0, median * (1 - spread)), context.bidIncrement, 'down');
  const high = roundToIncrement(
    Math.max(context.lot.openingAsk, median * (1 + spread)),
    context.bidIncrement,
    'up',
  );

  return {
    low,
    median: clamp(median, low, high),
    high,
    predictorId: 'placeholder-iv-wide-v0',
  };
};

export function runAuctionTuningSuite(input: {
  cases?: readonly AuctionTuningCase[];
  runs: number;
  predictor?: AuctionPriceBandPredictor;
}): AuctionTuningSummary[] {
  const predictor = input.predictor ?? placeholderAuctionPriceBandPredictor;
  const cases = input.cases ?? DEFAULT_AUCTION_TUNING_CASES;
  return cases.map((simCase) => summarizeAuctionTuningCase(simCase, input.runs, predictor));
}

export function summarizeAuctionTuningCase(
  input: AuctionTuningCase,
  runs: number,
  predictor: AuctionPriceBandPredictor = placeholderAuctionPriceBandPredictor,
): AuctionTuningSummary {
  const results = Array.from({ length: runs }, (_, index) => runAuctionTuningCase(input, index, predictor));
  const shortfalls = results.map((result) => result.realShortfall);
  const shillWins = results.map((result) => result.shillWins);
  const failures = collectFailures(input, results);

  return {
    ...input,
    runs,
    shortfallRuns: results.filter((result) => result.realShortfall > 0).length,
    maxShortfall: Math.max(...shortfalls),
    salaryFloorViolationRuns: results.filter((result) => result.salaryFloorViolations > 0).length,
    avgShortfall: average(shortfalls),
    avgMinRealRoster: average(results.map((result) => result.minRealRoster)),
    avgShillWins: average(shillWins),
    p95ShillWins: quantile(shillWins, 0.95),
    avgPassedLots: average(results.map((result) => result.passedLots)),
    avgSurfacedLots: average(results.map((result) => result.surfacedLots)),
    avgRealSpend: average(results.map((result) => result.realSpend)),
    avgFarmCarryover: average(results.map((result) => result.farmCarryover)),
    coverage: summarizeCoverage(results),
    failures,
  };
}

export function runAuctionTuningCase(
  input: AuctionTuningCase,
  runIndex: number,
  predictor: AuctionPriceBandPredictor = placeholderAuctionPriceBandPredictor,
): AuctionTuningRunResult {
  const caseSeed = `${input.kind}:${input.scenario}:${input.archetypeAssignment}:${input.teamProfileAssignment}:${input.poolSize}:${runIndex}`;
  const teamIds = makeTeamIds(
    input.kind.toLowerCase(),
    input.realTeams ?? REAL_TEAM_COUNT,
    input.shillTeams ?? SHILL_TEAM_COUNT,
  );
  const teamProfiles = buildTeamProfiles(teamIds.allTeamIds, teamIds.shillTeamIds, input.teamProfileAssignment, caseSeed, input.shillMaxWins);
  let session = buildSession({
    caseSeed,
    kind: input.kind,
    slotsPerTeam: input.slotsPerTeam,
    poolSize: input.poolSize,
    archetypeAssignment: input.archetypeAssignment,
    includePositionInfo: input.includePositionInfo ?? false,
    endCheckpoint: input.endCheckpoint ?? false,
    teamIds,
    teamProfiles,
  });
  const predictedLots: AuctionLotObservation[] = [];
  let surfacedLots = 0;

  for (let step = 0; step < MAX_STEPS && session.state !== 'AUCTION_COMPLETE'; step += 1) {
    // Supply invariant, cleanup-aware (FABLE-C3): PASSED lots are no longer destroyed supply —
    // the machine's exhaustion backfill re-offers them at minimum salary — so a run is only
    // provably wedged when live + passed supply together cannot cover the open real seats.
    const passedRecoverable = session.results.filter((result, index) =>
      isActivePassedResult(session, result, index),
    ).length;
    if (
      session.state === 'NOMINATION' &&
      session.availablePlayerIds.length + passedRecoverable < realOpenSlotCount(session)
    ) {
      throw new Error(JSON.stringify({
        case: input.label,
        runIndex,
        step,
        remainingPlayers: session.availablePlayerIds.length,
        realOpenSlots: realOpenSlotCount(session),
        lastResult: session.results.at(-1) ?? null,
        realTeams: session.teams
          .filter((team) => isRealTeam(team.teamId) && team.rosterSlotsRemaining > 0)
          .map((team) => ({
            teamId: team.teamId,
            budgetRemaining: team.budgetRemaining,
            rosterSlotsRemaining: team.rosterSlotsRemaining,
            minSalary: team.minSalary,
            maxBid: getTeamAuctionMaxBid(session, team.teamId),
          })),
      }));
    }

    if (session.state === 'NOMINATION') {
      session = ok(surfaceNextPlayer(session));
      if (session.state !== 'AUCTION_COMPLETE') {
        surfacedLots += 1;
        predictedLots.push(recordPrediction({
          input,
          runIndex,
          step,
          seed: caseSeed,
          session,
          teamIds,
          teamProfiles,
          predictor,
          lotIndex: predictedLots.length,
        }));
      }
    } else if (session.state === 'OPEN_BIDDING') {
      if (!session.currentLot) throw new Error('Missing current lot.');
      if (session.currentLot.stillIn.length <= 1) {
        session = ok(resolveLot(session));
        continue;
      }
      const bidder = getCurrentBidderTeamId(session);
      if (!bidder) {
        session = ok(resolveLot(session));
        continue;
      }

      if (
        input.scenario === 'all-pass' ||
        (input.scenario === 'pass-heavy-real' && isRealTeam(bidder) && shouldRealTeamPassHeavy(caseSeed, bidder, step))
      ) {
        session = ok(passBid(session, bidder));
        continue;
      }

      const decision = cpuBidOnLot(
        session,
        bidder,
        `${caseSeed}:bid:${step}`,
        input.needAwareRealTeams && isRealTeam(bidder) ? { needAwareCompletion: true } : undefined,
      );
      session = decision.kind === 'bid'
        ? recordBidOrPassIfStranded(session, bidder, decision.bid)
        : ok(passBid(session, bidder));
    } else if (session.state === 'RESOLVE') {
      if (session.pendingClaim) {
        if (input.scenario === 'all-pass') {
          session = ok(passLoneSurvivorOut(session));
          continue;
        }
        const decision = cpuDecideLoneSurvivor(
          session,
          session.pendingClaim.teamId,
          `${caseSeed}:claim:${step}`,
          input.needAwareRealTeams && isRealTeam(session.pendingClaim.teamId)
            ? { needAwareCompletion: true }
            : undefined,
        );
        session = decision.kind === 'claim'
          ? claimOrPassIfStranded(session)
          : ok(passLoneSurvivorOut(session));
      } else {
        session = ok(resolveLot(session));
      }
    } else if (session.state === 'SOLD' || session.state === 'PASSED') {
      session = ok(advanceLot(session));
    } else {
      throw new Error(`Unexpected auction state ${(session as AuctionSession).state}`);
    }
  }

  const realTeams = session.teams.filter((team) => isRealTeam(team.teamId));
  const shillTeamIdSet = new Set(teamIds.shillTeamIds);
  const realShortfall = realTeams.reduce((sum, team) => sum + Math.max(0, team.rosterSlotsRemaining), 0);
  const salaryFloorViolations = session.teams.reduce(
    (sum, team) => sum + team.roster.filter((assignment) => assignment.salary < team.minSalary).length,
    0,
  );
  const realSpend = realTeams.reduce(
    (sum, team) => sum + team.roster.reduce((rosterSum, assignment) => rosterSum + assignment.salary, 0),
    0,
  );
  const shillWins = session.results.filter((result) =>
    result.disposition === 'SOLD' &&
    result.winnerTeamId !== null &&
    shillTeamIdSet.has(result.winnerTeamId),
  ).length;
  const passedLots = session.results.filter((result, index) =>
    isActivePassedResult(session, result, index),
  ).length;
  const carryoverPct = input.carryoverPct ?? 0.5;
  const farmCarryover = input.kind === 'MLB'
    ? realTeams.reduce((sum, team) => sum + Math.max(0, team.budgetRemaining) * carryoverPct, 0)
    : 0;
  const lotObservations = attachClearingPrices(predictedLots, session.results, shillTeamIdSet);

  return {
    completed: session.state === 'AUCTION_COMPLETE',
    surfacedLots,
    realShortfall,
    salaryFloorViolations,
    minRealRoster: Math.min(...realTeams.map((team) => input.slotsPerTeam - team.rosterSlotsRemaining)),
    shillWins,
    passedLots,
    realSpend,
    farmCarryover,
    lotObservations,
  };
}

function ok(result: AuctionTransitionResult): CpuShillAuctionSession {
  if (!result.ok) throw new Error(`Auction transition rejected: ${result.reason}`);
  return result.session as CpuShillAuctionSession;
}

function recordBidOrPassIfStranded(
  session: CpuShillAuctionSession,
  bidder: string,
  bid: number,
): CpuShillAuctionSession {
  const result = recordBid(session, bidder, bid);
  if (result.ok) return result.session as CpuShillAuctionSession;
  if (result.reason === 'bid-strands-roster') return ok(passBid(session, bidder));
  return ok(result);
}

function claimOrPassIfStranded(session: CpuShillAuctionSession): CpuShillAuctionSession {
  const result = claimLoneSurvivor(session);
  if (result.ok) return result.session as CpuShillAuctionSession;
  if (result.reason === 'bid-strands-roster') return ok(passLoneSurvivorOut(session));
  return ok(result);
}

function makeTeamIds(
  prefix: string,
  realCount: number = REAL_TEAM_COUNT,
  shillCount: number = SHILL_TEAM_COUNT,
): { allTeamIds: string[]; realTeamIds: string[]; shillTeamIds: string[] } {
  const realTeamIds = Array.from({ length: realCount }, (_, index) => `${prefix}-real-${index + 1}`);
  const shillTeamIds = Array.from({ length: shillCount }, (_, index) => `${prefix}-shill-${index + 1}`);
  return { allTeamIds: [...realTeamIds, ...shillTeamIds], realTeamIds, shillTeamIds };
}

function buildSession(input: {
  caseSeed: string;
  kind: AuctionKind;
  slotsPerTeam: number;
  poolSize: number;
  archetypeAssignment: ArchetypeAssignmentMode;
  includePositionInfo: boolean;
  endCheckpoint: boolean;
  teamIds: { allTeamIds: readonly string[]; shillTeamIds: readonly string[] };
  teamProfiles: Readonly<Record<string, CpuShillProfile>>;
}): CpuShillAuctionSession {
  const players = makePlayers(
    input.caseSeed,
    input.kind,
    input.poolSize,
    input.archetypeAssignment,
    input.includePositionInfo,
  );
  const budget = teamBudget(input.kind, input.slotsPerTeam, players);
  const teams: AuctionTeamInput[] = input.teamIds.allTeamIds.map((teamId) => ({
    teamId,
    budgetRemaining: budget,
    rosterSlotsRemaining: input.slotsPerTeam,
    minSalary: LEAGUE_MINIMUM_SALARY,
    projectedTax: 0,
    roster: [],
  }));

  return {
    ...(initAuctionSession({
      teams,
      players,
      nominationOrder: input.teamIds.allTeamIds,
      config: {
        ...DEFAULT_AUCTION_SETUP_CONFIG,
        bidIncrement: input.kind === 'MLB' ? 5_000 : 1_000,
        nominationOrderSeed: input.caseSeed,
        nominationWeightExponent: input.kind === 'MLB' ? 2 : 3,
        flatReserveFloor: input.kind === 'FARM' ? LEAGUE_MINIMUM_SALARY : undefined,
        cpuShillCount: input.teamIds.shillTeamIds.length,
        excludeFromLeague: true,
        ...(input.endCheckpoint ? { nonCompletingTeamIds: [...input.teamIds.shillTeamIds] } : {}),
      },
    }) as CpuShillAuctionSession),
    cpuShills: input.teamProfiles,
  };
}

function makePlayers(
  caseSeed: string,
  kind: AuctionKind,
  poolSize: number,
  archetypeAssignment: ArchetypeAssignmentMode,
  includePositionInfo: boolean,
): CpuShillAuctionPlayer[] {
  const raw = Array.from({ length: poolSize }, (_, index) => {
    const rank = index / Math.max(1, poolSize - 1);
    const noise = 0.78 + randomUnit(`${caseSeed}:player:${index}:noise`) * 0.44;
    const base = kind === 'MLB' ? 12_000 : 4_000;
    const spread = kind === 'MLB' ? 155_000 : 55_000;
    const pos = kind === 'MLB' && includePositionInfo
      ? MLB_ROSTER_TEMPLATE[index % MLB_ROSTER_TEMPLATE.length]
      : undefined;
    const player: CpuShillAuctionPlayer = {
      playerId: `${kind.toLowerCase()}-${caseSeed}-${index + 1}`,
      iv: Math.round((base + spread * Math.pow(rank, 1.85)) * noise),
      ivPercentile: 0,
      archetypeWeights: archetypeWeightsForPlayer(caseSeed, index, archetypeAssignment, pos),
    };
    if (pos !== undefined) player.pos = { ...pos };
    return player;
  });
  const sorted = [...raw].sort((left, right) => left.iv - right.iv || left.playerId.localeCompare(right.playerId));
  const percentileById = new Map(
    sorted.map((player, index) => [
      player.playerId,
      sorted.length <= 1 ? 100 : (index / (sorted.length - 1)) * 100,
    ]),
  );

  return raw.map((player) => ({
    ...player,
    ivPercentile: percentileById.get(player.playerId) ?? 0,
  }));
}

function archetypeWeightsForPlayer(
  seed: string,
  index: number,
  mode: ArchetypeAssignmentMode,
  pos: RosterSlotPlayer | undefined,
): Partial<Record<Band, number>> | undefined {
  if (mode === 'neutral') return undefined;

  if (mode === 'offense-vs-pitching') {
    if (pos?.isPitcher) {
      return weightsForBands(index % 2 === 0 ? 'Rotation' : 'Bullpen', 'Defense', 0.35);
    }
    return weightsForBands(index % 2 === 0 ? 'Power' : 'Contact', 'Speed', 0.42);
  }

  const primary = BANDS[(hashString(`${seed}:player-band:${index}`) + index) % BANDS.length];
  const secondary = BANDS[(BANDS.indexOf(primary) + 2 + (index % (BANDS.length - 1))) % BANDS.length];
  return weightsForBands(primary, secondary, 0.45);
}

function weightsForBands(primary: Band, secondary: Band, secondaryWeight: number): Record<Band, number> {
  return Object.fromEntries(
    BANDS.map((band) => [band, band === primary ? 1 : band === secondary ? secondaryWeight : 0]),
  ) as Record<Band, number>;
}

function buildTeamProfiles(
  allTeamIds: readonly string[],
  shillTeamIds: readonly string[],
  mode: TeamProfileAssignmentMode,
  seed: string,
  shillMaxWins?: number,
): Record<string, CpuShillProfile> {
  const shillSet = new Set(shillTeamIds);
  return Object.fromEntries(allTeamIds.map((teamId, index) => {
    const isShill = shillSet.has(teamId);
    const personality = personalityForTeam(teamId, index, isShill, mode, seed);
    const bandPriorities = bandPrioritiesForTeam(teamId, index, isShill, mode, seed);
    return [teamId, {
      teamId,
      personality,
      bandPriorities,
      ...(isShill && shillMaxWins != null ? { shillMaxWins } : {}),
    }];
  }));
}

function personalityForTeam(
  teamId: string,
  index: number,
  isShill: boolean,
  mode: TeamProfileAssignmentMode,
  seed: string,
): CpuShillPersonality {
  if (mode === 'spender-wildcards' && isShill) return 'spender';
  if (mode === 'zealot-pitching' && isShill) return 'zealot';
  const personalities: readonly CpuShillPersonality[] = ['sniper', 'spender', 'zealot'];
  return personalities[(hashString(`${seed}:${teamId}:personality`) + index) % personalities.length];
}

function bandPrioritiesForTeam(
  teamId: string,
  index: number,
  isShill: boolean,
  mode: TeamProfileAssignmentMode,
  seed: string,
): BandPriorities {
  if (mode === 'spender-wildcards' && isShill) {
    return weightsForBands(index % 2 === 0 ? 'Power' : 'Contact', 'Speed', 0.7);
  }
  if (mode === 'zealot-pitching' && isShill) {
    return weightsForBands(index % 2 === 0 ? 'Rotation' : 'Bullpen', 'Defense', 0.65);
  }
  const primary = BANDS[(hashString(`${seed}:${teamId}:primary-band`) + index) % BANDS.length];
  const secondary = BANDS[(BANDS.indexOf(primary) + 1 + (index % (BANDS.length - 1))) % BANDS.length];
  return weightsForBands(primary, secondary, 0.65);
}

function recordPrediction(input: {
  input: AuctionTuningCase;
  runIndex: number;
  step: number;
  seed: string;
  session: CpuShillAuctionSession;
  teamIds: { shillTeamIds: readonly string[] };
  teamProfiles: Readonly<Record<string, CpuShillProfile>>;
  predictor: AuctionPriceBandPredictor;
  lotIndex: number;
}): AuctionLotObservation {
  const lot = input.session.currentLot;
  if (lot === null) throw new Error('Cannot record an auction prediction without a current lot.');
  const player = input.session.players[lot.playerId] as CpuShillAuctionPlayer | undefined;
  if (player === undefined) throw new Error(`Cannot record prediction for unknown player ${lot.playerId}.`);
  const rawBand = input.predictor({
    caseLabel: input.input.label,
    kind: input.input.kind,
    scenario: input.input.scenario,
    runIndex: input.runIndex,
    lotIndex: input.lotIndex,
    step: input.step,
    seed: input.seed,
    player,
    lot,
    teamStates: input.session.teams,
    shillTeamIds: input.teamIds.shillTeamIds,
    teamProfiles: input.teamProfiles,
    realOpenSlots: realOpenSlotCount(input.session),
    availablePlayerCount: input.session.availablePlayerIds.length,
    bidIncrement: input.session.config.bidIncrement,
  });
  const band = normalizeBand(rawBand, input.session.config.bidIncrement);

  return {
    caseLabel: input.input.label,
    kind: input.input.kind,
    scenario: input.input.scenario,
    archetypeAssignment: input.input.archetypeAssignment,
    teamProfileAssignment: input.input.teamProfileAssignment,
    runIndex: input.runIndex,
    lotIndex: input.lotIndex,
    playerId: lot.playerId,
    playerIv: player.iv,
    playerIvPercentile: player.ivPercentile,
    openingAsk: lot.openingAsk,
    predictedLow: band.low,
    predictedMedian: band.median,
    predictedHigh: band.high,
    predictorId: band.predictorId ?? 'unknown-predictor',
    disposition: 'UNRESOLVED',
    winnerTeamId: null,
    winnerKind: null,
    clearingPrice: null,
    covered: null,
  };
}

function attachClearingPrices(
  observations: readonly AuctionLotObservation[],
  results: readonly AuctionResult[],
  shillTeamIds: ReadonlySet<string>,
): AuctionLotObservation[] {
  const resultByPlayerId = new Map(results.map((result) => [result.playerId, result]));
  return observations.map((observation) => {
    const result = resultByPlayerId.get(observation.playerId);
    if (result === undefined) return observation;
    const clearingPrice = result.salary;
    const winnerKind = result.winnerTeamId === null
      ? null
      : shillTeamIds.has(result.winnerTeamId)
        ? 'shill'
        : 'real';
    return {
      ...observation,
      disposition: result.disposition,
      winnerTeamId: result.winnerTeamId,
      winnerKind,
      clearingPrice,
      covered: clearingPrice === null
        ? null
        : clearingPrice >= observation.predictedLow && clearingPrice <= observation.predictedHigh,
    };
  });
}

function summarizeCoverage(results: readonly AuctionTuningRunResult[]): AuctionCoverageSummary {
  const observations = results.flatMap((result) => result.lotObservations);
  const sold = observations.filter((observation) => observation.clearingPrice !== null);
  const covered = sold.filter((observation) => observation.covered === true);
  const missedLow = sold.filter((observation) =>
    observation.clearingPrice !== null && observation.clearingPrice < observation.predictedLow,
  );
  const missedHigh = sold.filter((observation) =>
    observation.clearingPrice !== null && observation.clearingPrice > observation.predictedHigh,
  );
  const realSold = sold.filter((observation) => observation.winnerKind === 'real');
  const shillSold = sold.filter((observation) => observation.winnerKind === 'shill');
  const runCoverageRates = results.map((result) => {
    const runSold = result.lotObservations.filter((observation) => observation.clearingPrice !== null);
    if (runSold.length === 0) return 0;
    return runSold.filter((observation) => observation.covered === true).length / runSold.length;
  });
  const bandWidths = sold.map((observation) => observation.predictedHigh - observation.predictedLow);
  const bandWidthPctOfPrice = sold.map((observation) => {
    const price = observation.clearingPrice ?? 0;
    return price > 0 ? (observation.predictedHigh - observation.predictedLow) / price : 0;
  });
  const absPctErrors = sold.map((observation) => {
    const price = observation.clearingPrice ?? 0;
    return price > 0 ? Math.abs(observation.predictedMedian - price) / price : 0;
  });

  return {
    observedLots: observations.length,
    soldLots: sold.length,
    passedLots: observations.filter((observation) => observation.disposition === 'PASSED').length,
    coveredLots: covered.length,
    missedLow: missedLow.length,
    missedHigh: missedHigh.length,
    coverageRate: ratio(covered.length, sold.length),
    realSoldLots: realSold.length,
    realCoverageRate: ratio(realSold.filter((observation) => observation.covered === true).length, realSold.length),
    shillSoldLots: shillSold.length,
    shillCoverageRate: ratio(shillSold.filter((observation) => observation.covered === true).length, shillSold.length),
    avgBandWidth: average(bandWidths),
    avgBandWidthPctOfPrice: average(bandWidthPctOfPrice),
    medianAbsPctError: quantile(absPctErrors, 0.5),
    p90AbsPctError: quantile(absPctErrors, 0.9),
    runCoverageP05: quantile(runCoverageRates, 0.05),
    runCoverageP50: quantile(runCoverageRates, 0.5),
    runCoverageP95: quantile(runCoverageRates, 0.95),
    targetCoverageLow: 0.85,
    targetCoverageHigh: 0.9,
  };
}

function collectFailures(
  input: AuctionTuningCase,
  results: readonly AuctionTuningRunResult[],
): AuctionTuningFailure[] {
  return results.flatMap((result, index) => {
    const failures: AuctionTuningFailure[] = [];
    if (!result.completed) {
      failures.push({ case: input.label, runIndex: index, kind: 'incomplete' });
    }
    if (result.realShortfall > 0) {
      failures.push({
        case: input.label,
        runIndex: index,
        kind: 'real-shortfall',
        realShortfall: result.realShortfall,
        minRealRoster: result.minRealRoster,
        shillWins: result.shillWins,
        passedLots: result.passedLots,
        surfacedLots: result.surfacedLots,
        realSpend: result.realSpend,
      });
    }
    if (result.salaryFloorViolations > 0) {
      failures.push({
        case: input.label,
        runIndex: index,
        kind: 'salary-floor',
        salaryFloorViolations: result.salaryFloorViolations,
      });
    }
    return failures;
  });
}

function shouldRealTeamPassHeavy(seed: string, bidder: string, step: number): boolean {
  return randomUnit(`${seed}:pass-heavy:${bidder}:${step}`) < 0.55;
}

function isRealTeam(teamId: string): boolean {
  return teamId.includes('-real-');
}

function realOpenSlotCount(session: AuctionSession): number {
  return session.teams
    .filter((team) => isRealTeam(team.teamId))
    .reduce((sum, team) => sum + Math.max(0, team.rosterSlotsRemaining), 0);
}

function teamBudget(kind: AuctionKind, slotsPerTeam: number, players: readonly AuctionPlayer[]): number {
  const ivs = players.map((player) => player.iv);
  if (kind === 'FARM') return computeFarmTierCap(ivs, slotsPerTeam);

  return Math.max(
    Math.max(...ivs) / 0.18,
    slotsPerTeam * median(ivs) * 2.25,
  );
}

function normalizeBand(band: AuctionPriceBand, increment: number): AuctionPriceBand {
  const low = finiteOrThrow(band.low, 'low');
  const median = finiteOrThrow(band.median, 'median');
  const high = finiteOrThrow(band.high, 'high');
  if (low > median || median > high) {
    throw new Error(`Invalid price band: low=${low}, median=${median}, high=${high}`);
  }
  return {
    low: roundToIncrement(low, increment, 'down'),
    median: clamp(roundToIncrement(median, increment, 'nearest'), low, high),
    high: roundToIncrement(high, increment, 'up'),
    predictorId: band.predictorId,
  };
}

function finiteOrThrow(value: number, field: string): number {
  if (!Number.isFinite(value)) throw new Error(`Predictor returned non-finite ${field}: ${value}`);
  return value;
}

function roundToIncrement(value: number, increment: number, direction: 'down' | 'nearest' | 'up'): number {
  const step = Number.isFinite(increment) && increment > 0 ? increment : 1;
  const scaled = value / step;
  if (direction === 'down') return Math.floor(scaled) * step;
  if (direction === 'up') return Math.ceil(scaled) * step;
  return Math.round(scaled) * step;
}

function quantile(values: readonly number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * q)));
  return sorted[index] ?? 0;
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function ratio(numerator: number, denominator: number): number {
  return denominator <= 0 ? 0 : numerator / denominator;
}

function randomUnit(seed: string): number {
  return (hashString(seed) + 0.5) / 0x100000000;
}

function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
