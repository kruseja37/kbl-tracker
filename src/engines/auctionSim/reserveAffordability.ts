import { cheapestAuctionSimCompletion, clearAuctionSimCompletionCache } from './legalCompletionCost';
import { reservePrice } from './reservePrice';
import { normalizeAuctionSimConfig } from './types';
import { percentile } from './poolDiagnostics';
import type {
  AuctionSimConfig,
  AuctionSimPlayer,
  AuctionSimTeamInput,
} from './types';

export interface ReserveBasisAudit {
  status: 'RESOLVED' | 'NEEDS_DECISION';
  basis: 'IV';
  formula: string;
}

export type ReserveFeasibilityStatus =
  | 'LEGALLY_IMPOSSIBLE_AT_K0'
  | 'RESERVE_UNAFFORDABLE'
  | 'TEAM_COMPLETION_UNAFFORDABLE'
  | 'LEAGUE_COMPLETION_UNAFFORDABLE'
  | 'OK';

export type KMaxBindingReason = 'LEAGUE_AGGREGATE' | 'WORST_TEAM' | 'LEGALITY';

export interface ReserveFeasibilityDiagnostics {
  totalLeagueBudget: number;
  requiredRosteredPlayers: number;
  poolSize: number;
  averageReservePrice: number;
  medianReservePrice: number | null;
  totalReservePriceOfPool: number;
  cheapestLegalLeagueCompletionCost: number | null;
  cheapestLegalLeagueCompletionMethod: 'APPROXIMATE' | 'INFEASIBLE';
  minimumTeamCompletionCost: Record<string, number | null>;
  maximumTeamCompletionCost: Record<string, number | null>;
  medianTeamCompletionCost: number | null;
  minimumTeamCompletionCostValue: number | null;
  maximumTeamCompletionCostValue: number | null;
  kMaxLeagueAggregate: number | null;
  kMaxWorstTeam: number | null;
  kMaxBindingReason: KMaxBindingReason;
  feasibilityStatus: ReserveFeasibilityStatus;
  kMaxFeasibleGlobal: number | null;
  kMaxFeasibleByTeam: Record<string, number | null>;
  reserveFeasible: boolean;
  reserveInfeasibilityReason: string | null;
  reserveBasisAudit: ReserveBasisAudit;
}

interface LeagueCompletionApproximation {
  feasible: boolean;
  totalCost: number | null;
  assignedCostByTeam: Record<string, number | null>;
  reason: string | null;
}

function teamInputs(teams: readonly AuctionSimTeamInput[], config: AuctionSimConfig): AuctionSimTeamInput[] {
  return teams.length > 0
    ? [...teams].sort((left, right) => left.teamId.localeCompare(right.teamId))
    : Array.from({ length: config.teamCount }, (_, index) => ({ teamId: `team-${index + 1}` }));
}

function teamBudget(team: AuctionSimTeamInput, config: AuctionSimConfig): number {
  return team.budget ?? config.budgetPerTeam;
}

function withReserveConfig(
  config: AuctionSimConfig,
  reserveFractionK: number,
  autoFillPriceMode: AuctionSimConfig['autoFillPriceMode'],
): AuctionSimConfig {
  return {
    ...config,
    reserveFractionK,
    autoFillPriceMode,
    reserveCostBasis: 'iv',
    valueBasis: config.valueBasis ?? 'iv',
  };
}

function removePickedPlayers(
  pool: readonly AuctionSimPlayer[],
  pickedIds: readonly string[],
): AuctionSimPlayer[] {
  const picked = new Set(pickedIds);
  return pool.filter((player) => !picked.has(player.playerId));
}

function approximateLeagueCompletion(
  players: readonly AuctionSimPlayer[],
  teams: readonly AuctionSimTeamInput[],
  config: AuctionSimConfig,
): LeagueCompletionApproximation {
  clearAuctionSimCompletionCache();
  let remaining = [...players];
  let totalCost = 0;
  const assignedCostByTeam: Record<string, number | null> = {};

  for (const team of teamInputs(teams, config)) {
    const quote = cheapestAuctionSimCompletion([], remaining, config);
    if (!quote.feasible) {
      assignedCostByTeam[team.teamId] = null;
      return {
        feasible: false,
        totalCost: null,
        assignedCostByTeam,
        reason: `${team.teamId} cannot complete a legal roster from remaining pool`,
      };
    }
    assignedCostByTeam[team.teamId] = quote.cost;
    totalCost += quote.cost;
    remaining = removePickedPlayers(remaining, quote.pickIds);
  }

  return { feasible: true, totalCost, assignedCostByTeam, reason: null };
}

function independentCompletionCost(
  players: readonly AuctionSimPlayer[],
  config: AuctionSimConfig,
): number | null {
  clearAuctionSimCompletionCache();
  const quote = cheapestAuctionSimCompletion([], players, config);
  return quote.feasible ? quote.cost : null;
}

function binarySearchKMax(
  isFeasible: (k: number) => boolean,
): number | null {
  if (!isFeasible(0)) return null;
  const upperLimit = 4;
  if (isFeasible(upperLimit)) return upperLimit;
  let low = 0;
  let high = upperLimit;
  for (let i = 0; i < 22; i += 1) {
    const mid = (low + high) / 2;
    if (isFeasible(mid)) low = mid;
    else high = mid;
  }
  return low;
}

function minFinite(values: readonly (number | null)[]): number | null {
  const finite = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return finite.length === 0 ? null : Math.min(...finite);
}

function maxFinite(values: readonly (number | null)[]): number | null {
  const finite = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return finite.length === 0 ? null : Math.max(...finite);
}

function worstTeamKMax(values: Record<string, number | null>): number | null {
  return minFinite(Object.values(values));
}

function bindingReason(
  kMaxLeagueAggregate: number | null,
  kMaxWorstTeam: number | null,
): KMaxBindingReason {
  if (kMaxLeagueAggregate === null || kMaxWorstTeam === null) return 'LEGALITY';
  return kMaxLeagueAggregate <= kMaxWorstTeam ? 'LEAGUE_AGGREGATE' : 'WORST_TEAM';
}

export function buildReserveFeasibilityDiagnostics(
  players: readonly AuctionSimPlayer[],
  teamsInput: readonly AuctionSimTeamInput[],
  configInput: Partial<AuctionSimConfig>,
): ReserveFeasibilityDiagnostics {
  const config = normalizeAuctionSimConfig(configInput);
  const teams = teamInputs(teamsInput, config);
  const totalLeagueBudget = teams.reduce((sum, team) => sum + teamBudget(team, config), 0);
  const reservePrices = players.map((player) => reservePrice(player, config.reserveFractionK, config.bidIncrement));
  const currentConfig = withReserveConfig(config, config.reserveFractionK, config.autoFillPriceMode);
  const leagueCompletion = approximateLeagueCompletion(players, teams, currentConfig);
  const minimumTeamCompletionCost: Record<string, number | null> = {};
  const maximumTeamCompletionCost: Record<string, number | null> = {};
  const kMaxFeasibleByTeam: Record<string, number | null> = {};

  for (const team of teams) {
    minimumTeamCompletionCost[team.teamId] = independentCompletionCost(players, currentConfig);
    maximumTeamCompletionCost[team.teamId] = leagueCompletion.assignedCostByTeam[team.teamId] ?? null;
    kMaxFeasibleByTeam[team.teamId] = binarySearchKMax((k) => {
      const cost = independentCompletionCost(
        players,
        withReserveConfig(config, k, 'reserve'),
      );
      return cost !== null && cost <= teamBudget(team, config);
    });
  }

  const kMaxFeasibleGlobal = binarySearchKMax((k) => {
    const approximation = approximateLeagueCompletion(
      players,
      teams,
      withReserveConfig(config, k, 'reserve'),
    );
    return approximation.feasible &&
      approximation.totalCost !== null &&
      approximation.totalCost <= totalLeagueBudget &&
      teams.every((team) => {
        const assigned = approximation.assignedCostByTeam[team.teamId];
        return assigned !== null && assigned <= teamBudget(team, config);
      });
  });
  const kMaxWorstTeam = worstTeamKMax(kMaxFeasibleByTeam);
  const kMaxBindingReason = bindingReason(kMaxFeasibleGlobal, kMaxWorstTeam);
  const reserveFeasible =
    leagueCompletion.feasible &&
    leagueCompletion.totalCost !== null &&
    leagueCompletion.totalCost <= totalLeagueBudget &&
    teams.every((team) => {
      const assigned = leagueCompletion.assignedCostByTeam[team.teamId];
      return assigned !== null && assigned <= teamBudget(team, config);
    });

  let reserveInfeasibilityReason: string | null = null;
  let feasibilityStatus: ReserveFeasibilityStatus = 'OK';
  if (!reserveFeasible) {
    if (!leagueCompletion.feasible) {
      feasibilityStatus = 'LEGALLY_IMPOSSIBLE_AT_K0';
      reserveInfeasibilityReason = leagueCompletion.reason;
    } else if ((leagueCompletion.totalCost ?? 0) > totalLeagueBudget) {
      feasibilityStatus = 'LEAGUE_COMPLETION_UNAFFORDABLE';
      reserveInfeasibilityReason = 'approximate league completion cost exceeds total league budget';
    } else {
      const blockedTeam = teams.find((team) => {
        const assigned = leagueCompletion.assignedCostByTeam[team.teamId];
        return assigned === null || assigned > teamBudget(team, config);
      });
      feasibilityStatus = blockedTeam ? 'TEAM_COMPLETION_UNAFFORDABLE' : 'RESERVE_UNAFFORDABLE';
      reserveInfeasibilityReason = blockedTeam
        ? `${blockedTeam.teamId} approximate completion cost exceeds team budget`
        : 'reserve completion is infeasible under current sim constraints';
    }
  } else if (
    config.autoFillPriceMode === 'reserve' &&
    kMaxFeasibleGlobal !== null &&
    config.reserveFractionK > kMaxFeasibleGlobal
  ) {
    feasibilityStatus = 'RESERVE_UNAFFORDABLE';
    reserveInfeasibilityReason = 'reserve k exceeds aggregate feasible kMax';
  }
  const teamCompletionCosts = Object.values(leagueCompletion.assignedCostByTeam).filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );

  return {
    totalLeagueBudget,
    requiredRosteredPlayers: config.teamCount * config.rosterSize,
    poolSize: players.length,
    averageReservePrice: reservePrices.length === 0
      ? 0
      : reservePrices.reduce((sum, price) => sum + price, 0) / reservePrices.length,
    medianReservePrice: percentile(reservePrices, 0.5),
    totalReservePriceOfPool: reservePrices.reduce((sum, price) => sum + price, 0),
    cheapestLegalLeagueCompletionCost: leagueCompletion.totalCost,
    cheapestLegalLeagueCompletionMethod: leagueCompletion.feasible ? 'APPROXIMATE' : 'INFEASIBLE',
    minimumTeamCompletionCost,
    maximumTeamCompletionCost,
    medianTeamCompletionCost: percentile(teamCompletionCosts, 0.5),
    minimumTeamCompletionCostValue: minFinite(teamCompletionCosts),
    maximumTeamCompletionCostValue: maxFinite(teamCompletionCosts),
    kMaxLeagueAggregate: kMaxFeasibleGlobal,
    kMaxWorstTeam,
    kMaxBindingReason,
    feasibilityStatus,
    kMaxFeasibleGlobal,
    kMaxFeasibleByTeam,
    reserveFeasible: feasibilityStatus === 'OK',
    reserveInfeasibilityReason,
    reserveBasisAudit: {
      status: 'RESOLVED',
      basis: 'IV',
      formula: 'reservePrice = k x IV, rounded up to the auction increment',
    },
  };
}
