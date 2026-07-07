import {
  LEGAL_ROSTER,
  type RosterSlotPlayer,
} from '../../data/rosterConstruction';
import {
  cheapestLegalCompletion,
  type CompletionCandidate,
} from '../auctionCompletionFloor';
import { cheapestAuctionSimCompletion } from './legalCompletionCost';
import { percentile, resolveNumericGrade } from './poolDiagnostics';
import { playerCompletionPrice } from './reservePrice';
import type {
  AuctionSimConfig,
  AuctionSimPlayer,
  AuctionSimRosterEntry,
} from './types';

export interface AuctionSimQualityCompletionRead {
  feasible: boolean;
  qualityFeasible: boolean;
  cheapestLegalCompletionCost: number;
  qualityAdjustedCompletionCost: number;
  qualityCompletionSurplus: number;
  qualityCompletionRisk: number;
  targetCompletionGrade: number | null;
  targetCompletionValue: number | null;
  projectedRemainingSlotCost: number;
  pickIds: readonly string[];
  qualityPickIds: readonly string[];
  belowTargetPickCount: number;
  missingQualityCandidateCount: number;
  warnings: readonly string[];
}

const DEFAULT_QUALITY_TARGET_PERCENTILE = 0.5;
const DEFAULT_GRADE_POINT_COST_RATIO = 0.08;
const QUALITY_COMPLETION_CACHE_LIMIT = 10_000;
const qualityCompletionCache = new Map<string, AuctionSimQualityCompletionRead>();

export function clearAuctionSimQualityCompletionCache(): void {
  qualityCompletionCache.clear();
}

function qualityCompletionCacheKey(
  roster: readonly AuctionSimPlayer[],
  remainingPlayers: readonly AuctionSimPlayer[],
  cashRemaining: number,
  config: AuctionSimConfig,
): string {
  const budgetBucket = Math.floor(cashRemaining / Math.max(1, config.bidIncrement));
  return [
    config.rosterSize,
    config.reserveFractionK,
    config.autoFillPriceMode,
    config.minimumCompletionPrice,
    config.bidIncrement,
    config.budgetPerTeam,
    config.completionSearchMode ?? 'beam',
    config.qualityCompletionTargetPercentile ?? DEFAULT_QUALITY_TARGET_PERCENTILE,
    budgetBucket,
    roster.map((player) => player.playerId).sort().join(','),
    remainingPlayers.map((player) => player.playerId).sort().join(','),
  ].join('|');
}

function cacheQualityCompletion(
  key: string,
  value: AuctionSimQualityCompletionRead,
): AuctionSimQualityCompletionRead {
  if (qualityCompletionCache.size >= QUALITY_COMPLETION_CACHE_LIMIT) {
    const firstKey = qualityCompletionCache.keys().next().value;
    if (firstKey !== undefined) qualityCompletionCache.delete(firstKey);
  }
  qualityCompletionCache.set(key, value);
  return value;
}

export function rosterEntryToQualityPlayer(entry: AuctionSimRosterEntry): AuctionSimPlayer {
  return {
    playerId: entry.playerId,
    iv: entry.iv,
    numericGrade: entry.numericGrade ?? undefined,
    grade: entry.grade,
    salary: entry.salary,
    capHit: entry.salary,
    baseValue: entry.iv,
    pos: entry.pos,
  };
}

function allHaveShapes(players: readonly AuctionSimPlayer[]): players is Array<AuctionSimPlayer & { pos: RosterSlotPlayer }> {
  return players.every((player) => player.pos !== undefined);
}

function numericGrades(players: readonly AuctionSimPlayer[]): number[] {
  return players
    .map((player) => resolveNumericGrade(player).numericGrade)
    .filter((grade): grade is number => grade !== null && Number.isFinite(grade));
}

function targetCompletionGrade(
  remainingPlayers: readonly AuctionSimPlayer[],
  config: AuctionSimConfig,
): number | null {
  const grades = numericGrades(remainingPlayers);
  return percentile(grades, config.qualityCompletionTargetPercentile ?? DEFAULT_QUALITY_TARGET_PERCENTILE);
}

function gradePointCost(config: AuctionSimConfig): number {
  const slotBudget = config.rosterSize <= 0 ? config.budgetPerTeam : config.budgetPerTeam / config.rosterSize;
  return Math.max(config.bidIncrement, slotBudget * DEFAULT_GRADE_POINT_COST_RATIO);
}

function qualityAdjustedPlayerPrice(
  player: AuctionSimPlayer,
  targetGrade: number | null,
  config: AuctionSimConfig,
): number {
  const grade = resolveNumericGrade(player).numericGrade;
  const shortfall = targetGrade === null || grade === null ? 0 : Math.max(0, targetGrade - grade);
  return playerCompletionPrice(player, config) + shortfall * gradePointCost(config);
}

function scalarQualityCompletion(
  remainingPlayers: readonly AuctionSimPlayer[],
  openSlots: number,
  targetGrade: number | null,
  config: AuctionSimConfig,
): { feasible: boolean; cost: number; pickIds: readonly string[] } {
  if (openSlots <= 0) return { feasible: true, cost: 0, pickIds: [] };
  if (remainingPlayers.length < openSlots) return { feasible: false, cost: 0, pickIds: [] };
  const picks = [...remainingPlayers]
    .sort(
      (left, right) =>
        qualityAdjustedPlayerPrice(left, targetGrade, config) - qualityAdjustedPlayerPrice(right, targetGrade, config) ||
        left.playerId.localeCompare(right.playerId),
    )
    .slice(0, openSlots);
  return {
    feasible: true,
    cost: picks.reduce((sum, player) => sum + qualityAdjustedPlayerPrice(player, targetGrade, config), 0),
    pickIds: picks.map((player) => player.playerId),
  };
}

function positionAwareQualityCompletion(
  roster: readonly AuctionSimPlayer[],
  remainingPlayers: readonly AuctionSimPlayer[],
  openSlots: number,
  targetGrade: number | null,
  config: AuctionSimConfig,
): { feasible: boolean; cost: number; pickIds: readonly string[] } {
  if (
    config.rosterSize !== LEGAL_ROSTER.size ||
    !allHaveShapes(roster) ||
    !allHaveShapes(remainingPlayers)
  ) {
    return scalarQualityCompletion(remainingPlayers, openSlots, targetGrade, config);
  }

  const candidates: CompletionCandidate[] = remainingPlayers.map((player) => ({
    id: player.playerId,
    price: qualityAdjustedPlayerPrice(player, targetGrade, config),
    shape: player.pos,
  }));
  const quote = cheapestLegalCompletion(roster.map((player) => player.pos), candidates, openSlots);
  return quote.feasible
    ? { feasible: true, cost: quote.cost, pickIds: quote.pickIds }
    : { feasible: false, cost: 0, pickIds: [] };
}

export function qualityAdjustedCompletionCost(
  roster: readonly AuctionSimPlayer[],
  remainingPlayers: readonly AuctionSimPlayer[],
  cashRemaining: number,
  config: AuctionSimConfig,
): AuctionSimQualityCompletionRead {
  const cacheKey = qualityCompletionCacheKey(roster, remainingPlayers, cashRemaining, config);
  const cached = qualityCompletionCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const openSlots = config.rosterSize - roster.length;
  const legal = cheapestAuctionSimCompletion(roster, remainingPlayers, config);
  const targetGrade = targetCompletionGrade(remainingPlayers, config);
  const warnings: string[] = [];

  if (openSlots <= 0) {
    return cacheQualityCompletion(cacheKey, {
      feasible: legal.feasible,
      qualityFeasible: legal.feasible,
      cheapestLegalCompletionCost: legal.cost,
      qualityAdjustedCompletionCost: 0,
      qualityCompletionSurplus: cashRemaining,
      qualityCompletionRisk: legal.feasible ? 0 : 1,
      targetCompletionGrade: targetGrade,
      targetCompletionValue: targetGrade,
      projectedRemainingSlotCost: 0,
      pickIds: legal.pickIds,
      qualityPickIds: [],
      belowTargetPickCount: 0,
      missingQualityCandidateCount: 0,
      warnings: legal.feasible ? [] : ['SIM_INFEASIBLE complete roster fails legal completion check'],
    });
  }

  if (!legal.feasible) {
    return cacheQualityCompletion(cacheKey, {
      feasible: false,
      qualityFeasible: false,
      cheapestLegalCompletionCost: legal.cost,
      qualityAdjustedCompletionCost: config.budgetPerTeam,
      qualityCompletionSurplus: cashRemaining - config.budgetPerTeam,
      qualityCompletionRisk: 1,
      targetCompletionGrade: targetGrade,
      targetCompletionValue: targetGrade,
      projectedRemainingSlotCost: config.budgetPerTeam / Math.max(1, openSlots),
      pickIds: [],
      qualityPickIds: [],
      belowTargetPickCount: openSlots,
      missingQualityCandidateCount: openSlots,
      warnings: ['SIM_INFEASIBLE quality completion cannot run because legal completion is impossible'],
    });
  }

  const quality = positionAwareQualityCompletion(roster, remainingPlayers, openSlots, targetGrade, config);
  const byId = new Map(remainingPlayers.map((player) => [player.playerId, player]));
  const qualityPlayers = quality.pickIds
    .map((playerId) => byId.get(playerId))
    .filter((player): player is AuctionSimPlayer => player !== undefined);
  const belowTargetPickCount = qualityPlayers.filter((player) => {
    const grade = resolveNumericGrade(player).numericGrade;
    return targetGrade !== null && grade !== null && grade < targetGrade;
  }).length;
  const qualityCandidateCount = targetGrade === null
    ? remainingPlayers.length
    : remainingPlayers.filter((player) => {
      const grade = resolveNumericGrade(player).numericGrade;
      return grade !== null && grade >= targetGrade;
    }).length;
  const missingQualityCandidateCount = Math.max(0, openSlots - qualityCandidateCount);
  const qualityFeasible = quality.feasible;
  const qualityAdjustedCost = qualityFeasible
    ? quality.cost
    : Math.max(legal.cost, config.budgetPerTeam);
  const projectedRemainingSlotCost = qualityAdjustedCost / Math.max(1, openSlots);
  const qualityRisk = Math.min(
    1,
    (qualityFeasible ? 0 : 1) +
    belowTargetPickCount / Math.max(1, openSlots) +
    missingQualityCandidateCount / Math.max(1, openSlots),
  );

  if (!qualityFeasible) warnings.push('SIM_QUALITY_SHORTFALL no legal completion exists at the quality-adjusted target');
  if (belowTargetPickCount > 0) warnings.push(`SIM_QUALITY_SHORTFALL ${belowTargetPickCount} selected completion picks fall below target grade`);
  if (missingQualityCandidateCount > 0) warnings.push(`SIM_QUALITY_SHORTFALL pool is short ${missingQualityCandidateCount} target-grade candidates`);

  return cacheQualityCompletion(cacheKey, {
    feasible: legal.feasible,
    qualityFeasible,
    cheapestLegalCompletionCost: legal.cost,
    qualityAdjustedCompletionCost: qualityAdjustedCost,
    qualityCompletionSurplus: cashRemaining - qualityAdjustedCost,
    qualityCompletionRisk: qualityRisk,
    targetCompletionGrade: targetGrade,
    targetCompletionValue: targetGrade,
    projectedRemainingSlotCost,
    pickIds: legal.pickIds,
    qualityPickIds: quality.pickIds,
    belowTargetPickCount,
    missingQualityCandidateCount,
    warnings,
  });
}

export function qualityAdjustedCompletionCostForRosterEntries(
  roster: readonly AuctionSimRosterEntry[],
  remainingPlayers: readonly AuctionSimPlayer[],
  cashRemaining: number,
  config: AuctionSimConfig,
): AuctionSimQualityCompletionRead {
  return qualityAdjustedCompletionCost(
    roster.map(rosterEntryToQualityPlayer),
    remainingPlayers,
    cashRemaining,
    config,
  );
}
