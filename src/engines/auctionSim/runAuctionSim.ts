import { cheapestAuctionSimCompletion, clearAuctionSimCompletionCache } from './legalCompletionCost';
import { selectAuctionSimNominee } from './nominationPolicies';
import { clearAuctionLot } from './clearAuction';
import { playerCompletionPrice } from './reservePrice';
import { auctionSimProfileSnapshot, resetAuctionSimProfile } from './profiling';
import { clearAuctionSimRosterValueCache } from './rosterValue';
import {
  clearAuctionSimQualityCompletionCache,
  qualityAdjustedCompletionCostForRosterEntries,
} from './qualityCompletion';
import {
  buildEconomyDiagnostics,
  buildPoolMetrics,
  buildRosterStrengthMetrics,
  gradeBandForPlayer,
  letterGradeForPlayer,
  resolveNumericGrade,
} from './metrics';
import type {
  AuctionSimAutoFillLogEntry,
  AuctionSimConfig,
  AuctionSimInvariantFailure,
  AuctionSimInvariantName,
  AuctionSimPlayer,
  AuctionSimResult,
  AuctionSimRosterEntry,
  AuctionSimTeamInput,
  AuctionSimTeamState,
} from './types';
import { normalizeAuctionSimConfig, teamBudgetSnapshot } from './types';

interface CompletionRead {
  cost: number | null;
  surplus: number | null;
}

function makeRosterEntry(
  player: AuctionSimPlayer,
  salary: number,
  source: AuctionSimRosterEntry['source'],
): AuctionSimRosterEntry {
  return {
    playerId: player.playerId,
    iv: player.iv,
    numericGrade: resolveNumericGrade(player).numericGrade,
    letterGrade: letterGradeForPlayer(player) ?? undefined,
    grade: player.grade,
    gradeBand: gradeBandForPlayer(player),
    salary,
    source,
    pos: player.pos,
  };
}

function roleBucketForPlayer(player: AuctionSimPlayer): string {
  if (!player.pos) return 'unknown';
  if (player.pos.isPitcher) return player.pos.role ?? player.pos.position ?? 'P';
  const position = player.pos.position;
  if (position === 'C') return 'C';
  if (position === '1B' || position === '2B' || position === '3B' || position === 'SS') return 'IF';
  if (position === 'LF' || position === 'CF' || position === 'RF') return 'OF';
  return position ?? 'unknown';
}

function normalizeTeams(
  teams: readonly AuctionSimTeamInput[],
  config: AuctionSimConfig,
): AuctionSimTeamState[] {
  const inputs: AuctionSimTeamInput[] = teams.length > 0
    ? [...teams]
    : Array.from({ length: config.teamCount }, (_, index) => ({ teamId: `team-${index + 1}` }));
  return inputs.map((team) => ({
    teamId: team.teamId,
    budgetRemaining: team.budget ?? config.budgetPerTeam,
    salaryCap: team.salaryCap,
    currentSalary: team.currentSalary,
    bandPriorities: team.bandPriorities,
    roster: [],
    budgetAtRosterSpot11: null,
    completionSurplusAtRosterSpot11: null,
    qualityCompletionSurplusAtRosterSpot11: null,
  }));
}

function rosterEntriesToPlayers(roster: readonly AuctionSimRosterEntry[]): AuctionSimPlayer[] {
  return roster.map((entry) => ({
    playerId: entry.playerId,
    iv: entry.iv,
    numericGrade: entry.numericGrade ?? undefined,
    grade: entry.grade,
    salary: entry.salary,
    capHit: entry.salary,
    baseValue: entry.iv,
    pos: entry.pos,
  }));
}

function completionRead(
  roster: readonly AuctionSimRosterEntry[],
  remainingPlayers: readonly AuctionSimPlayer[],
  cash: number,
  config: AuctionSimConfig,
): CompletionRead {
  const quote = cheapestAuctionSimCompletion(rosterEntriesToPlayers(roster), remainingPlayers, config);
  return {
    cost: quote.feasible ? quote.cost : null,
    surplus: quote.feasible ? cash - quote.cost : null,
  };
}

function invariantFailure(
  invariantName: AuctionSimInvariantName,
  config: AuctionSimConfig,
  fields: Omit<
    AuctionSimInvariantFailure,
    'invariantName' | 'seed' | 'biddingPolicy' | 'reserveFractionK' | 'autoFillPriceMode'
  >,
): AuctionSimInvariantFailure {
  return {
    invariantName,
    seed: config.seed,
    biddingPolicy: config.biddingPolicy,
    reserveFractionK: config.reserveFractionK,
    autoFillPriceMode: config.autoFillPriceMode,
    ...fields,
  };
}

function recordBudgetCheckpoint(
  team: AuctionSimTeamState,
  config: AuctionSimConfig,
  completionPool: readonly AuctionSimPlayer[],
): void {
  if (team.budgetAtRosterSpot11 === null && team.roster.length >= config.spotBudgetCheckpoint) {
    team.budgetAtRosterSpot11 = team.budgetRemaining;
    const quote = cheapestAuctionSimCompletion(rosterEntriesToPlayers(team.roster), completionPool, config);
    team.completionSurplusAtRosterSpot11 = quote.feasible
      ? team.budgetRemaining - quote.cost
      : -config.budgetPerTeam;
    const quality = qualityAdjustedCompletionCostForRosterEntries(
      team.roster,
      completionPool,
      team.budgetRemaining,
      config,
    );
    team.qualityCompletionSurplusAtRosterSpot11 = quality.feasible
      ? quality.qualityCompletionSurplus
      : -config.budgetPerTeam;
  }
}

function removePickedPlayers(
  pool: AuctionSimPlayer[],
  pickedIds: readonly string[],
): AuctionSimPlayer[] {
  const picked = new Set(pickedIds);
  return pool.filter((player) => !picked.has(player.playerId));
}

function fillTeamFromPool(
  team: AuctionSimTeamState,
  fillPool: AuctionSimPlayer[],
  config: AuctionSimConfig,
): {
  fillPool: AuctionSimPlayer[];
  log: AuctionSimAutoFillLogEntry[];
  invariantFailures: AuctionSimInvariantFailure[];
} {
  const openSlots = config.rosterSize - team.roster.length;
  if (openSlots <= 0) return { fillPool, log: [], invariantFailures: [] };

  const rosterPlayers = team.roster.map((entry): AuctionSimPlayer => ({
    playerId: entry.playerId,
    iv: entry.iv,
    grade: entry.grade,
    numericGrade: entry.numericGrade ?? undefined,
    pos: entry.pos,
  }));
  const quote = cheapestAuctionSimCompletion(rosterPlayers, fillPool, config);
  if (!quote.feasible) {
    return { fillPool, log: [], invariantFailures: [] };
  }

  const pickIds = quote.pickIds;
  const byId = new Map(fillPool.map((player) => [player.playerId, player]));
  const log: AuctionSimAutoFillLogEntry[] = [];
  const invariantFailures: AuctionSimInvariantFailure[] = [];

  for (const playerId of pickIds) {
    const player = byId.get(playerId);
    if (!player) continue;
    const price = playerCompletionPrice(player, config);
    const cashBefore = team.budgetRemaining;
    const affordable = team.budgetRemaining >= price;
    if (!affordable) {
      break;
    }
    const rosterSizeBefore = team.roster.length;
    team.budgetRemaining -= price;
    team.roster.push(makeRosterEntry(player, price, 'autoFill'));
    if (team.budgetRemaining < 0) {
      invariantFailures.push(invariantFailure('autoFillCreatesNegativeCash', config, {
        nominationNumber: null,
        teamId: team.teamId,
        playerId,
        cashBefore,
        bidPrice: price,
        cashAfter: team.budgetRemaining,
        wtp: null,
        maxLegalBid: null,
        cheapestCompletionCostBefore: quote.cost,
        cheapestCompletionCostAfter: null,
        completionSurplusBefore: cashBefore - quote.cost,
        completionSurplusAfter: null,
        rosterSizeBefore,
        rosterSizeAfter: team.roster.length,
        openSlotsBefore: config.rosterSize - rosterSizeBefore,
        openSlotsAfter: config.rosterSize - team.roster.length,
        autoFillInvolved: true,
      }));
    }
    recordBudgetCheckpoint(
      team,
      config,
      fillPool.filter((candidate) => candidate.playerId !== playerId),
    );
    log.push({
      teamId: team.teamId,
      playerId,
      numericGrade: resolveNumericGrade(player).numericGrade,
      letterGrade: letterGradeForPlayer(player) ?? undefined,
      grade: player.grade,
      gradeBand: gradeBandForPlayer(player),
      iv: player.iv,
      price,
      affordable,
      feasibleCompletion: quote.feasible,
    });
  }

  return { fillPool: removePickedPlayers(fillPool, log.map((entry) => entry.playerId)), log, invariantFailures };
}

export function simulateAuction(
  playerPool: readonly AuctionSimPlayer[],
  teamsInput: readonly AuctionSimTeamInput[] = [],
  configInput: Partial<AuctionSimConfig> = {},
): AuctionSimResult {
  const config = normalizeAuctionSimConfig(configInput);
  resetAuctionSimProfile();
  clearAuctionSimCompletionCache();
  clearAuctionSimRosterValueCache();
  clearAuctionSimQualityCompletionCache();
  const teams = normalizeTeams(teamsInput, config);
  const poolMetrics = buildPoolMetrics(playerPool, config.rosterSize);
  const budgetCurves: Record<string, { rosterSize: number; budgetRemaining: number }[]> =
    Object.fromEntries(teams.map((team) => [team.teamId, [{ rosterSize: 0, budgetRemaining: team.budgetRemaining }]]));
  const pickLog = [];
  const invariantFailures: AuctionSimInvariantFailure[] = [];
  const unsold: AuctionSimPlayer[] = [];
  let remaining = [...playerPool].sort((left, right) => left.playerId.localeCompare(right.playerId));
  const maxLots = config.maxLots ?? playerPool.length;

  for (let nominationNumber = 1; nominationNumber <= maxLots; nominationNumber += 1) {
    if (teams.every((team) => team.roster.length >= config.rosterSize)) break;
    const nominee = selectAuctionSimNominee(remaining, teams, nominationNumber, config);
    if (nominee === null) break;
    remaining = remaining.filter((player) => player.playerId !== nominee.playerId);
    clearAuctionSimCompletionCache();
    clearAuctionSimRosterValueCache();
    const clear = clearAuctionLot(nominee, teams, remaining, config);

    if (clear.winnerTeamId !== null && clear.price !== null) {
      const winner = teams.find((team) => team.teamId === clear.winnerTeamId);
      if (winner) {
        const bid = clear.bids.find((entry) => entry.teamId === winner.teamId);
        const cashBefore = winner.budgetRemaining;
        const rosterSizeBefore = winner.roster.length;
        const completionBefore = completionRead(winner.roster, [nominee, ...unsold, ...remaining], cashBefore, config);
        const rosterAfter = [...winner.roster, makeRosterEntry(nominee, clear.price, 'auction')];
        const cashAfter = cashBefore - clear.price;
        const completionAfter = completionRead(rosterAfter, [...unsold, ...remaining], cashAfter, config);
        const common = {
          nominationNumber,
          teamId: winner.teamId,
          playerId: nominee.playerId,
          cashBefore,
          bidPrice: clear.price,
          cashAfter,
          wtp: bid?.wtp ?? null,
          maxLegalBid: bid?.maxLegalBid ?? null,
          cheapestCompletionCostBefore: completionBefore.cost,
          cheapestCompletionCostAfter: completionAfter.cost,
          completionSurplusBefore: completionBefore.surplus,
          completionSurplusAfter: completionAfter.surplus,
          rosterSizeBefore,
          rosterSizeAfter: rosterAfter.length,
          openSlotsBefore: config.rosterSize - rosterSizeBefore,
          openSlotsAfter: config.rosterSize - rosterAfter.length,
          autoFillInvolved: false,
        };
        if (rosterSizeBefore >= config.rosterSize) {
          invariantFailures.push(invariantFailure('fullRosterBid', config, common));
        }
        if (clear.price > cashBefore) {
          invariantFailures.push(invariantFailure('acceptedPriceExceedsCash', config, common));
        }
        if (bid && clear.price > bid.wtp) {
          invariantFailures.push(invariantFailure('acceptedPriceExceedsWtp', config, common));
          invariantFailures.push(invariantFailure('clearingPriceExceedsWinnerWtp', config, common));
        }
        if (bid && clear.price > bid.maxLegalBid) {
          invariantFailures.push(invariantFailure('acceptedPriceExceedsMaxLegalBid', config, common));
          invariantFailures.push(invariantFailure('clearingPriceExceedsWinnerMaxLegalBid', config, common));
        }
        if (completionAfter.surplus !== null && completionAfter.surplus < 0) {
          invariantFailures.push(invariantFailure('completionSurplusNegativeAfterAcceptedBid', config, common));
        }
        if (cashAfter < 0) {
          invariantFailures.push(invariantFailure('cashBelowZero', config, common));
        }
        winner.budgetRemaining -= clear.price;
        winner.roster.push(rosterAfter[rosterAfter.length - 1]);
        recordBudgetCheckpoint(winner, config, [...unsold, ...remaining]);
        budgetCurves[winner.teamId].push({
          rosterSize: winner.roster.length,
          budgetRemaining: winner.budgetRemaining,
        });
      }
    } else {
      unsold.push(nominee);
    }

    pickLog.push({
      nominationNumber,
      playerId: nominee.playerId,
      numericGrade: resolveNumericGrade(nominee).numericGrade,
      letterGrade: letterGradeForPlayer(nominee) ?? undefined,
      grade: nominee.grade,
      gradeBand: gradeBandForPlayer(nominee),
      roleBucket: roleBucketForPlayer(nominee),
      iv: nominee.iv,
      reserve: clear.reserve,
      winnerTeamId: clear.winnerTeamId,
      price: clear.price,
      disposition: clear.disposition,
      teamBudgetsAfter: teamBudgetSnapshot(teams),
      bids: clear.bids,
    });
  }

  let fillPool = [...unsold, ...remaining];
  const autoFillLog: AuctionSimAutoFillLogEntry[] = [];
  for (const team of teams) {
    const filled = fillTeamFromPool(team, fillPool, config);
    fillPool = filled.fillPool;
    autoFillLog.push(...filled.log);
    invariantFailures.push(...filled.invariantFailures);
  }

  const rosters = Object.fromEntries(teams.map((team) => [team.teamId, team.roster]));
  const rosterStrengthMetrics = buildRosterStrengthMetrics(rosters);

  return {
    rosters,
    budgetCurves,
    pickLog,
    autoFillLog,
    poolMetrics,
    rosterStrengthMetrics,
    economyDiagnostics: buildEconomyDiagnostics(
      teams,
      autoFillLog,
      pickLog,
      poolMetrics,
      rosterStrengthMetrics,
      config,
      invariantFailures,
    ),
    profile: auctionSimProfileSnapshot(),
  };
}
