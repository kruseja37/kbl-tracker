import { playerCompletionPrice, reservePrice } from './reservePrice';
import { resolveNumericGrade } from './poolDiagnostics';
import type {
  AuctionSimConfig,
  AuctionSimPlayer,
  AuctionSimRosterEntry,
  AuctionSimTeamState,
} from './types';

export interface AuctionSimEconomyPlayer {
  playerId: string;
  auctionCash: null;
  salary: number;
  capHit: number;
  baseValue: number;
  numericGrade: number | null;
  letterGrade: string | null;
  archetypeAdjustedValue: number;
  auctionPrice: number | null;
  reservePrice: number;
  taxExposure: null;
  completionCost: null;
  completionSurplus: null;
  warnings: readonly string[];
}

export interface AuctionSimEconomyTeam {
  teamId: string;
  auctionCash: number;
  salaryCap: number;
  currentSalary: number;
  taxExposure: null;
  completionCost: null;
  completionSurplus: null;
  warnings: readonly string[];
}

export function rosterEntryToAuctionSimPlayer(entry: AuctionSimRosterEntry): AuctionSimPlayer {
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

export function adaptEconomyPlayer(
  player: AuctionSimPlayer,
  config: Pick<AuctionSimConfig, 'autoFillPriceMode' | 'reserveFractionK' | 'bidIncrement' | 'minimumCompletionPrice'>,
  options: {
    archetypeAdjustedValue?: number;
    auctionPrice?: number | null;
  } = {},
): AuctionSimEconomyPlayer {
  const gradeRead = resolveNumericGrade(player);
  const floorPrice = playerCompletionPrice(player, config);
  const salary = player.salary ?? floorPrice;
  const capHit = player.capHit ?? salary;
  const baseValue = player.baseValue ?? player.iv;
  const warnings: string[] = [];

  if (player.salary === undefined) {
    warnings.push('SIM_FALLBACK salary uses reserve/completion floor because canonical salary was not provided');
  }
  if (player.capHit === undefined) {
    warnings.push('SIM_FALLBACK capHit mirrors salary because cap-hit semantics are MODEL_AFTER_CORE_ECONOMY');
  }
  if (gradeRead.numericGrade === null) {
    warnings.push('SIM_FALLBACK numericGrade missing; letter grade is report-only');
  }

  return {
    playerId: player.playerId,
    auctionCash: null,
    salary,
    capHit,
    baseValue,
    numericGrade: gradeRead.numericGrade,
    letterGrade: gradeRead.letterGrade,
    archetypeAdjustedValue: options.archetypeAdjustedValue ?? baseValue,
    auctionPrice: options.auctionPrice ?? null,
    reservePrice: reservePrice(player, config.reserveFractionK, config.bidIncrement),
    taxExposure: null,
    completionCost: null,
    completionSurplus: null,
    warnings,
  };
}

export function adaptEconomyTeam(
  team: AuctionSimTeamState,
  config: Pick<AuctionSimConfig, 'budgetPerTeam'>,
): AuctionSimEconomyTeam {
  const salaryCap = team.salaryCap ?? config.budgetPerTeam;
  const currentSalary =
    team.currentSalary ??
    team.roster.reduce((sum, entry) => sum + entry.salary, 0);
  const warnings: string[] = [];

  if (team.salaryCap === undefined) {
    warnings.push('SIM_FALLBACK salaryCap uses budgetPerTeam because salary-cap source was not provided');
  }
  warnings.push('SIM_DEFERRED taxExposure is null because luxury-tax enforcement is NEEDS_DECISION');

  return {
    teamId: team.teamId,
    auctionCash: team.budgetRemaining,
    salaryCap,
    currentSalary,
    taxExposure: null,
    completionCost: null,
    completionSurplus: null,
    warnings,
  };
}
