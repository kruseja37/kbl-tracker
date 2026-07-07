import type {
  AuctionSimAutoFillLogEntry,
  AuctionSimConfig,
  AuctionSimEconomyDiagnostics,
  AuctionSimGradeBand,
  AuctionSimInvariantFailure,
  AuctionSimPickLogEntry,
  AuctionSimPlayer,
  AuctionSimPoolMetrics,
  AuctionSimRosterEntry,
  AuctionSimRosterStrengthMetrics,
  AuctionSimTeamState,
} from './types';
import {
  buildNumericPoolDiagnostics,
  gradeBandForNumericPlayer,
  letterGradeForPlayer,
  resolveNumericGrade,
} from './poolDiagnostics';
import { cheapestAuctionSimCompletion } from './legalCompletionCost';
import { qualityAdjustedCompletionCostForRosterEntries } from './qualityCompletion';

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
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

export function resolveAuctionSimGrade(
  player: AuctionSimPlayer,
): { grade: string | null; source: 'smb4' | 'provided' | 'percentile' } {
  const read = resolveNumericGrade(player);
  if (read.source === 'smb4') return { grade: read.letterGrade, source: 'smb4' };
  if (read.letterGrade) return { grade: read.letterGrade, source: 'provided' };
  return { grade: null, source: 'percentile' };
}

export function gradeBandForPlayer(
  player: AuctionSimPlayer,
): AuctionSimGradeBand {
  return gradeBandForNumericPlayer(player);
}

export function buildPoolMetrics(
  players: readonly AuctionSimPlayer[],
  rosterSize: number,
): AuctionSimPoolMetrics {
  return buildNumericPoolDiagnostics(players, { rosterSize });
}

export function buildRosterStrengthMetrics(
  rosters: Record<string, readonly AuctionSimRosterEntry[]>,
): AuctionSimRosterStrengthMetrics {
  const rosterStrengthByTeam = Object.fromEntries(
    Object.entries(rosters).map(([teamId, roster]) => [
      teamId,
      roster.reduce((sum, entry) => sum + entry.iv, 0),
    ]),
  );
  const values = Object.values(rosterStrengthByTeam);
  const meanRosterStrength = values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
  const rosterStrengthSpread = meanRosterStrength <= 0
    ? 0
    : Math.max(...values.map((value) => Math.abs(value - meanRosterStrength) / meanRosterStrength));

  const eliteCounts = Object.values(rosters).map((roster) =>
    roster.filter((entry) => entry.gradeBand === 'elite').length,
  );
  const totalElite = eliteCounts.reduce((sum, value) => sum + value, 0);
  const eliteConcentration = totalElite === 0 ? 0 : Math.max(...eliteCounts) / totalElite;

  return {
    rosterStrengthByTeam,
    meanRosterStrength,
    rosterStrengthSpread,
    eliteConcentration,
  };
}

export function buildEconomyDiagnostics(
  teams: readonly AuctionSimTeamState[],
  autoFillLog: readonly AuctionSimAutoFillLogEntry[],
  pickLog: readonly AuctionSimPickLogEntry[],
  poolMetrics: AuctionSimPoolMetrics,
  rosterStrengthMetrics: AuctionSimRosterStrengthMetrics,
  config: AuctionSimConfig,
  invariantFailures: readonly AuctionSimInvariantFailure[] = [],
): AuctionSimEconomyDiagnostics {
  const ratios = teams
    .map((team) =>
      team.budgetAtRosterSpot11 === null ? null : team.budgetAtRosterSpot11 / config.budgetPerTeam,
    )
    .filter((value): value is number => value !== null);
  const completionSurplusRatios = teams
    .map((team) =>
      team.completionSurplusAtRosterSpot11 === null
        ? null
        : team.completionSurplusAtRosterSpot11 / config.budgetPerTeam,
    )
    .filter((value): value is number => value !== null);
  const qualityCompletionSurplusRatios = teams
    .map((team) =>
      team.qualityCompletionSurplusAtRosterSpot11 === null
        ? null
        : team.qualityCompletionSurplusAtRosterSpot11 / config.budgetPerTeam,
    )
    .filter((value): value is number => value !== null);
  const finalCashRatios = teams.map((team) => team.budgetRemaining / config.budgetPerTeam);
  const finalCompletionSurplusByTeam: Record<string, number> = {};
  const finalQualityCompletionSurplusByTeam: Record<string, number> = {};

  for (const team of teams) {
    const finalQuote = cheapestAuctionSimCompletion(rosterEntriesToPlayers(team.roster), [], config);
    finalCompletionSurplusByTeam[team.teamId] = finalQuote.feasible
      ? team.budgetRemaining - finalQuote.cost
      : -config.budgetPerTeam;
    const finalQuality = qualityAdjustedCompletionCostForRosterEntries(team.roster, [], team.budgetRemaining, config);
    finalQualityCompletionSurplusByTeam[team.teamId] = finalQuality.feasible
      ? finalQuality.qualityCompletionSurplus
      : -config.budgetPerTeam;
  }

  const finalCompletionSurplusRatios = Object.values(finalCompletionSurplusByTeam).map(
    (value) => value / config.budgetPerTeam,
  );
  const finalQualityCompletionSurplusRatios = Object.values(finalQualityCompletionSurplusByTeam).map(
    (value) => value / config.budgetPerTeam,
  );
  const coreLots = pickLog.filter((entry) => entry.gradeBand === 'core');
  const coreSold = coreLots.filter((entry) => entry.disposition === 'sold');
  const middleClassBidRate = coreLots.length === 0 ? null : coreSold.length / coreLots.length;
  const observations: string[] = [];
  const medSpot11 = ratios.length === 0 ? null : median(ratios);

  if (medSpot11 !== null && medSpot11 < 0.30) observations.push('budget collapse before roster spot 11');
  if (autoFillLog.some((entry) => entry.price === 0)) observations.push('free auto-fill value exists');
  if (poolMetrics.barbellIndex > 0.25) observations.push('pool shape is barbell-heavy');
  if (rosterStrengthMetrics.rosterStrengthSpread > 0.05) observations.push('rational roster strength spread exceeds ±5%');
  if (observations.length === 0) observations.push('no configured red-flag threshold tripped');

  return {
    medianBudgetRemainingAtRosterSpot11Ratio: medSpot11,
    minBudgetRemainingAtRosterSpot11Ratio: ratios.length === 0 ? null : Math.min(...ratios),
    maxBudgetRemainingAtRosterSpot11Ratio: ratios.length === 0 ? null : Math.max(...ratios),
    medianCompletionSurplusAtRosterSpot11Ratio: completionSurplusRatios.length === 0
      ? null
      : median(completionSurplusRatios),
    minCompletionSurplusAtRosterSpot11Ratio: completionSurplusRatios.length === 0
      ? null
      : Math.min(...completionSurplusRatios),
    maxCompletionSurplusAtRosterSpot11Ratio: completionSurplusRatios.length === 0
      ? null
      : Math.max(...completionSurplusRatios),
    medianQualityCompletionSurplusAtRosterSpot11Ratio: qualityCompletionSurplusRatios.length === 0
      ? null
      : median(qualityCompletionSurplusRatios),
    minQualityCompletionSurplusAtRosterSpot11Ratio: qualityCompletionSurplusRatios.length === 0
      ? null
      : Math.min(...qualityCompletionSurplusRatios),
    maxQualityCompletionSurplusAtRosterSpot11Ratio: qualityCompletionSurplusRatios.length === 0
      ? null
      : Math.max(...qualityCompletionSurplusRatios),
    finalBudgetByTeam: Object.fromEntries(teams.map((team) => [team.teamId, team.budgetRemaining])),
    finalCompletionSurplusByTeam,
    finalQualityCompletionSurplusByTeam,
    finalCashRemainingRatio: finalCashRatios.length === 0 ? null : median(finalCashRatios),
    finalCompletionSurplusRatio: finalCompletionSurplusRatios.length === 0
      ? null
      : median(finalCompletionSurplusRatios),
    finalQualityCompletionSurplusRatio: finalQualityCompletionSurplusRatios.length === 0
      ? null
      : median(finalQualityCompletionSurplusRatios),
    autoFillCount: autoFillLog.length,
    freeAutoFillCount: autoFillLog.filter((entry) => entry.price === 0).length,
    paidAutoFillCount: autoFillLog.filter((entry) => entry.price > 0).length,
    middleClassBidRate,
    coreBidRate: middleClassBidRate,
    invariantFailures: [...invariantFailures],
    observations,
  };
}

export { letterGradeForPlayer, resolveNumericGrade };
