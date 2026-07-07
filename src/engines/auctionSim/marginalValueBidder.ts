import { maxLegalBidForPlayer } from './legalCompletionCost';
import { reservePrice } from './reservePrice';
import { bestProjectedRosterValue } from './rosterValue';
import { rosterEntryToAuctionSimPlayer } from './economyAdapter';
import { countWtpEvaluation } from './profiling';
import {
  qualityAdjustedCompletionCostForRosterEntries,
  type AuctionSimQualityCompletionRead,
} from './qualityCompletion';
import type {
  AuctionSimBidRead,
  AuctionSimConfig,
  AuctionSimLiquidityAuditRead,
  AuctionSimPlayer,
  AuctionSimTeamState,
} from './types';

function roundDownToIncrement(value: number, increment: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const step = Number.isFinite(increment) && increment > 0 ? increment : 1;
  return Math.floor(value / step) * step;
}

function withCandidateRoster(
  team: AuctionSimTeamState,
  player: AuctionSimPlayer,
  price: number,
) {
  return [
    ...team.roster,
    {
      playerId: player.playerId,
      iv: player.iv,
      numericGrade: player.numericGrade ?? null,
      letterGrade: player.grade,
      grade: player.grade,
      gradeBand: 'core' as const,
      salary: price,
      source: 'auction' as const,
      pos: player.pos,
    },
  ];
}

function floorLegalValueDelta(value: number, increment: number): number {
  return roundDownToIncrement(Math.max(0, value), increment);
}

export interface MarginalValueBidRead extends AuctionSimBidRead {
  passValue: number;
  winValueAtWtp: number;
  completionCost: number;
  completionSurplus: number;
  modelWarnings: readonly string[];
}

interface LiquidityRead {
  projectionValue: number;
  projectedRosterValue: number;
  quality: AuctionSimQualityCompletionRead;
  liquidityAudit: AuctionSimLiquidityAuditRead;
  liquidityPenalty: number;
  utility: number;
  warnings: readonly string[];
}

interface LiquidityCapRead {
  cap: number;
  liquidityCapApplied: boolean;
  liquidityCapSaturated: boolean;
  qualityCapBinding: boolean;
  cashPaceCapBinding: boolean;
}

function liquidityParam(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function openSlotPressure(openSlots: number, config: AuctionSimConfig): number {
  const exponent = Math.max(0.1, liquidityParam(config.openSlotPenaltyExponent, 1.25));
  const ratio = Math.max(0, Math.min(1, openSlots / Math.max(1, config.rosterSize)));
  return Math.pow(ratio, exponent);
}

function spot11CashFloor(openSlots: number, config: AuctionSimConfig): number {
  const targetRatio = Math.max(0, liquidityParam(config.targetSpot11CashRatio, 0.40));
  const slotsBeforeCheckpoint = Math.max(1, config.rosterSize - config.spotBudgetCheckpoint);
  const checkpointPressure = Math.min(1, Math.max(0, openSlots / slotsBeforeCheckpoint));
  return config.budgetPerTeam * targetRatio * checkpointPressure;
}

function liquidityPenaltyShape(config: AuctionSimConfig): NonNullable<AuctionSimConfig['liquidityPenaltyShape']> {
  return config.liquidityPenaltyShape ?? 'linear';
}

function smoothHinge(rawShortfall: number, config: AuctionSimConfig): number {
  if (rawShortfall <= 0) return 0;
  const scale = Math.max(config.bidIncrement, config.budgetPerTeam * 0.05);
  const x = rawShortfall / scale;
  const softplus = x > 50 ? rawShortfall : scale * Math.log1p(Math.exp(x));
  return Math.max(0, softplus - scale * Math.log(2));
}

function quadraticAfterThreshold(rawShortfall: number, config: AuctionSimConfig): number {
  if (rawShortfall <= 0) return 0;
  const threshold = Math.max(config.bidIncrement, config.budgetPerTeam * 0.05);
  if (rawShortfall <= threshold) return rawShortfall;
  const excess = rawShortfall - threshold;
  return threshold + (excess * excess) / Math.max(1, config.budgetPerTeam);
}

function slotScheduleMultiplier(rosterSize: number, config: AuctionSimConfig): number {
  const filledSlots = Math.max(0, rosterSize);
  if (filledSlots < 12) return 1.25;
  const remainingAfterTwelve = Math.max(1, config.rosterSize - 12);
  const fadeProgress = Math.min(1, Math.max(0, (filledSlots - 12) / remainingAfterTwelve));
  return 1.25 - fadeProgress * 0.75;
}

function shapeShortfall(rawShortfall: number, rosterSize: number, config: AuctionSimConfig): {
  shapedShortfall: number;
  slotScheduleMultiplier: number;
} {
  const shape = liquidityPenaltyShape(config);
  const schedule = shape === 'slotScheduled' ? slotScheduleMultiplier(rosterSize, config) : 1;
  if (shape === 'softplus') return { shapedShortfall: smoothHinge(rawShortfall, config), slotScheduleMultiplier: schedule };
  if (shape === 'quadraticAfterThreshold') {
    return { shapedShortfall: quadraticAfterThreshold(rawShortfall, config), slotScheduleMultiplier: schedule };
  }
  return { shapedShortfall: rawShortfall, slotScheduleMultiplier: schedule };
}

function liquidityPenaltyAudit(
  rosterSize: number,
  cashRemaining: number,
  quality: AuctionSimQualityCompletionRead,
  config: AuctionSimConfig,
): AuctionSimLiquidityAuditRead {
  const weight = Math.max(0, liquidityParam(config.liquidityPenaltyWeight, 1));
  const openSlots = Math.max(0, config.rosterSize - rosterSize);
  const pressure = openSlotPressure(openSlots, config);
  const minimumQualitySurplus = config.budgetPerTeam * Math.max(0, liquidityParam(config.minQualitySurplusRatio, 0.05));
  const qualityShortfall = Math.max(0, minimumQualitySurplus - quality.qualityCompletionSurplus);
  const cashPaceShortfall = Math.max(0, spot11CashFloor(openSlots, config) - cashRemaining);
  const scarcityPenalty = quality.qualityCompletionRisk * config.budgetPerTeam * pressure;
  const rawShortfall = qualityShortfall + cashPaceShortfall + scarcityPenalty;
  const shaped = shapeShortfall(rawShortfall, rosterSize, config);
  const liquidityPenalty = weight * pressure * shaped.slotScheduleMultiplier * shaped.shapedShortfall;
  return {
    liquidityPenaltyShape: liquidityPenaltyShape(config),
    liquidityPenalty,
    qualitySurplusShortfall: qualityShortfall,
    cashPaceShortfall,
    scarcityPenalty,
    openSlotPressure: pressure,
    rawShortfall,
    shapedShortfall: shaped.shapedShortfall,
    slotScheduleMultiplier: shaped.slotScheduleMultiplier,
    qualitySurplusShortfallZero: qualityShortfall <= 0,
    cashPaceShortfallZero: cashPaceShortfall <= 0,
    scarcityPenaltyZero: scarcityPenalty <= 0,
    openSlotPressureZero: pressure <= 0,
    openSlotPressureSaturated: pressure >= 0.999,
    liquidityCapApplied: false,
    liquidityCapSaturated: false,
    qualityCapBinding: false,
    cashPaceCapBinding: false,
  };
}

function liquidityCapAtZero(
  rosterSizeAfterWin: number,
  cashBeforeBid: number,
  qualityAtZero: AuctionSimQualityCompletionRead,
  maxLegalBid: number,
  config: AuctionSimConfig,
): LiquidityCapRead {
  const weight = Math.max(0, liquidityParam(config.liquidityPenaltyWeight, 1));
  if (weight === 0) {
    return {
      cap: maxLegalBid,
      liquidityCapApplied: false,
      liquidityCapSaturated: false,
      qualityCapBinding: false,
      cashPaceCapBinding: false,
    };
  }
  const openSlotsAfterWin = Math.max(0, config.rosterSize - rosterSizeAfterWin);
  const minimumQualitySurplus = config.budgetPerTeam * Math.max(0, liquidityParam(config.minQualitySurplusRatio, 0.05));
  const qualityCap = cashBeforeBid - qualityAtZero.qualityAdjustedCompletionCost - minimumQualitySurplus;
  const paceCap = cashBeforeBid - spot11CashFloor(openSlotsAfterWin, config);
  const rawCap = Math.max(0, Math.min(maxLegalBid, qualityCap, paceCap));
  const cappedWeight = Math.min(1, weight);
  const cap = maxLegalBid - (maxLegalBid - rawCap) * cappedWeight;
  const liquidityCapApplied = rawCap < maxLegalBid;
  return {
    cap,
    liquidityCapApplied,
    liquidityCapSaturated: liquidityCapApplied && weight >= 1,
    qualityCapBinding: qualityCap <= paceCap && qualityCap <= maxLegalBid,
    cashPaceCapBinding: paceCap <= qualityCap && paceCap <= maxLegalBid,
  };
}

function evaluateLiquidityState(
  roster: ReturnType<typeof withCandidateRoster>,
  cashRemaining: number,
  remainingPlayers: readonly AuctionSimPlayer[],
  config: AuctionSimConfig,
  team: AuctionSimTeamState,
): LiquidityRead {
  const projection = bestProjectedRosterValue(roster, cashRemaining, remainingPlayers, config, {
    ...team,
    budgetRemaining: cashRemaining,
    roster,
  });
  const quality = qualityAdjustedCompletionCostForRosterEntries(roster, remainingPlayers, cashRemaining, config);
  const audit = liquidityPenaltyAudit(roster.length, cashRemaining, quality, config);
  const projectedRosterValue = projection.feasible ? projection.value : Number.NEGATIVE_INFINITY;
  return {
    projectionValue: projectedRosterValue,
    projectedRosterValue,
    quality,
    liquidityAudit: audit,
    liquidityPenalty: audit.liquidityPenalty,
    utility: projectedRosterValue - audit.liquidityPenalty,
    warnings: [
      ...projection.warnings,
      ...quality.warnings,
    ],
  };
}

export function evaluateMarginalValueBid(
  player: AuctionSimPlayer,
  team: AuctionSimTeamState,
  remainingAfterPlayer: readonly AuctionSimPlayer[],
  config: AuctionSimConfig,
): MarginalValueBidRead {
  countWtpEvaluation();
  const reserve = reservePrice(player, config.reserveFractionK, config.bidIncrement);
  const legal = maxLegalBidForPlayer(team, player, remainingAfterPlayer, config);
  const warnings: string[] = [];

  if (team.roster.length >= config.rosterSize || !legal.feasible || legal.maxBid < reserve) {
    if (team.roster.length >= config.rosterSize) {
      warnings.push('WIN:SIM_INVALID team roster is already full');
    }
    if (!legal.feasible) {
      warnings.push('WIN:SIM_INFEASIBLE candidate cannot be seated with a legal completion');
    }
    if (legal.feasible && legal.maxBid < reserve) {
      warnings.push('WIN:SIM_RESERVE_UNAFFORDABLE reserve exceeds max legal completion-safe bid');
    }
    return {
      teamId: team.teamId,
      rawWillingness: 0,
      maxLegalBid: legal.maxBid,
      wtp: 0,
      eligible: false,
      passValue: 0,
      winValueAtWtp: Number.NEGATIVE_INFINITY,
      completionCost: legal.completionCost,
      completionSurplus: team.budgetRemaining - legal.completionCost,
      modelWarnings: warnings,
    };
  }

  const passProjection = bestProjectedRosterValue(
    team.roster,
    team.budgetRemaining,
    remainingAfterPlayer,
    config,
    team,
  );
  warnings.push(...passProjection.warnings.map((warning) => `PASS:${warning}`));

  const passValue = passProjection.feasible ? passProjection.value : 0;
  const maxLegalBid = roundDownToIncrement(legal.maxBid, config.bidIncrement);
  const step = Math.max(1, config.bidIncrement);

  const projectWinAtPrice = (price: number) => {
    const rosterAfterWin = withCandidateRoster(team, player, price);
    return bestProjectedRosterValue(
      rosterAfterWin,
      team.budgetRemaining - price,
      remainingAfterPlayer,
      config,
      {
        ...team,
        budgetRemaining: team.budgetRemaining - price,
        roster: rosterAfterWin,
      },
    );
  };

  const winAtZero = projectWinAtPrice(0);
  warnings.push(...winAtZero.warnings.map((warning) => `WIN:${warning}`));
  const upperBound = Math.min(
    maxLegalBid,
    floorLegalValueDelta(winAtZero.value - passValue, config.bidIncrement),
  );

  let best = -1;
  let bestWinValue = Number.NEGATIVE_INFINITY;
  if (
    config.marginalBidSearchMode === 'singlePass' &&
    config.completionSearchMode !== 'exact' &&
    winAtZero.feasible &&
    upperBound >= reserve
  ) {
    best = upperBound;
    bestWinValue = winAtZero.value - upperBound;
    warnings.push('WIN:SIM_APPROXIMATION single-pass marginal WTP used for matrix performance');
  } else if (winAtZero.feasible && upperBound >= reserve) {
    const upperProjection = projectWinAtPrice(upperBound);
    warnings.push(...upperProjection.warnings.map((warning) => `WIN:${warning}`));
    if (upperProjection.feasible && upperProjection.value >= passValue) {
      best = upperBound;
      bestWinValue = upperProjection.value;
    }
  }

  if (best < 0) {
    const maxStep = Math.floor(upperBound / step);
    let low = 0;
    let high = maxStep;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const price = mid * step;
      const winProjection = projectWinAtPrice(price);
      warnings.push(...winProjection.warnings.map((warning) => `WIN:${warning}`));

      if (winProjection.feasible && winProjection.value >= passValue) {
        best = price;
        bestWinValue = winProjection.value;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
  }

  const wtp = Math.max(0, best);
  const rawWillingness = wtp;
  const candidateAfterWin = withCandidateRoster(team, player, wtp).map(rosterEntryToAuctionSimPlayer);
  const completionSurplus = team.budgetRemaining - wtp - legal.completionCost;

  if (best < 0) {
    warnings.push('WIN:SIM_NEGATIVE_MARGINAL_VALUE candidate does not beat pass projection at any legal price');
  }
  if (candidateAfterWin.length > config.rosterSize) {
    warnings.push('WIN:SIM_INVALID candidate would exceed roster size');
  }

  return {
    teamId: team.teamId,
    rawWillingness,
    maxLegalBid,
    wtp,
    eligible: team.roster.length < config.rosterSize && legal.feasible && wtp >= reserve,
    passValue,
    winValueAtWtp: bestWinValue,
    completionCost: legal.completionCost,
    completionSurplus,
    modelWarnings: [...new Set(warnings)],
  };
}

export function evaluateMarginalValueV2LiquidityBid(
  player: AuctionSimPlayer,
  team: AuctionSimTeamState,
  remainingAfterPlayer: readonly AuctionSimPlayer[],
  config: AuctionSimConfig,
  v1BaselineWtp?: number,
): MarginalValueBidRead {
  countWtpEvaluation();
  const reserve = reservePrice(player, config.reserveFractionK, config.bidIncrement);
  const legal = maxLegalBidForPlayer(team, player, remainingAfterPlayer, config);
  const warnings: string[] = [];

  if (team.roster.length >= config.rosterSize || !legal.feasible || legal.maxBid < reserve) {
    if (team.roster.length >= config.rosterSize) {
      warnings.push('WIN:SIM_INVALID team roster is already full');
    }
    if (!legal.feasible) {
      warnings.push('WIN:SIM_INFEASIBLE candidate cannot be seated with a legal completion');
    }
    if (legal.feasible && legal.maxBid < reserve) {
      warnings.push('WIN:SIM_RESERVE_UNAFFORDABLE reserve exceeds max legal completion-safe bid');
    }
    return {
      teamId: team.teamId,
      rawWillingness: 0,
      maxLegalBid: legal.maxBid,
      wtp: 0,
      eligible: false,
      passValue: 0,
      winValueAtWtp: Number.NEGATIVE_INFINITY,
      completionCost: legal.completionCost,
      completionSurplus: team.budgetRemaining - legal.completionCost,
      qualityCompletionCost: 0,
      qualityCompletionSurplus: team.budgetRemaining,
      liquidityPenalty: 0,
      liquidityAudit: undefined,
      passLiquidityAudit: undefined,
      wtpReductionVsV1: v1BaselineWtp === undefined ? undefined : v1BaselineWtp,
      liquidityRosterSlotNumber: team.roster.length + 1,
      utilityIfPass: 0,
      utilityIfWin: Number.NEGATIVE_INFINITY,
      modelWarnings: warnings,
    };
  }

  const passState = evaluateLiquidityState(
    team.roster,
    team.budgetRemaining,
    remainingAfterPlayer,
    config,
    team,
  );
  warnings.push(...passState.warnings.map((warning) => `PASS:${warning}`));

  const maxLegalBid = roundDownToIncrement(legal.maxBid, config.bidIncrement);
  const step = Math.max(1, config.bidIncrement);

  const projectWinAtPrice = (price: number): LiquidityRead => {
    const rosterAfterWin = withCandidateRoster(team, player, price);
    return evaluateLiquidityState(
      rosterAfterWin,
      team.budgetRemaining - price,
      remainingAfterPlayer,
      config,
      team,
    );
  };

  const winAtZero = projectWinAtPrice(0);
  warnings.push(...winAtZero.warnings.map((warning) => `WIN:${warning}`));

  const valueBound = floorLegalValueDelta(winAtZero.utility - passState.utility, config.bidIncrement);
  const liquidityCap = liquidityCapAtZero(
    team.roster.length + 1,
    team.budgetRemaining,
    winAtZero.quality,
    maxLegalBid,
    config,
  );
  const upperBound = Math.min(maxLegalBid, valueBound, roundDownToIncrement(liquidityCap.cap, config.bidIncrement));

  let best = -1;
  let bestWinState: LiquidityRead | null = null;

  if (
    config.marginalBidSearchMode === 'singlePass' &&
    config.completionSearchMode !== 'exact' &&
    winAtZero.quality.feasible &&
    upperBound >= reserve
  ) {
    best = upperBound;
    bestWinState = projectWinAtPrice(best);
    warnings.push('WIN:SIM_APPROXIMATION single-pass liquidity WTP used for matrix performance');
  }

  if (best < 0) {
    const maxStep = Math.floor(upperBound / step);
    let low = 0;
    let high = maxStep;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const price = mid * step;
      const winState = projectWinAtPrice(price);
      warnings.push(...winState.warnings.map((warning) => `WIN:${warning}`));

      if (winState.quality.feasible && winState.utility >= passState.utility) {
        best = price;
        bestWinState = winState;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
  }

  const wtp = Math.max(0, best);
  const rawWillingness = wtp;
  const candidateAfterWin = withCandidateRoster(team, player, wtp).map(rosterEntryToAuctionSimPlayer);
  const completionSurplus = team.budgetRemaining - wtp - legal.completionCost;
  const finalWinState = bestWinState ?? projectWinAtPrice(wtp);
  const finalLiquidityAudit: AuctionSimLiquidityAuditRead = {
    ...finalWinState.liquidityAudit,
    liquidityCapApplied: liquidityCap.liquidityCapApplied,
    liquidityCapSaturated: liquidityCap.liquidityCapSaturated,
    qualityCapBinding: liquidityCap.qualityCapBinding,
    cashPaceCapBinding: liquidityCap.cashPaceCapBinding,
  };

  if (best < 0) {
    warnings.push('WIN:SIM_NEGATIVE_LIQUIDITY_UTILITY candidate does not beat pass utility at any legal price');
  }
  if (candidateAfterWin.length > config.rosterSize) {
    warnings.push('WIN:SIM_INVALID candidate would exceed roster size');
  }

  return {
    teamId: team.teamId,
    rawWillingness,
    maxLegalBid,
    wtp,
    eligible: team.roster.length < config.rosterSize && legal.feasible && wtp >= reserve,
    passValue: passState.projectionValue,
    winValueAtWtp: finalWinState.projectionValue,
    completionCost: legal.completionCost,
    completionSurplus,
    qualityCompletionCost: finalWinState.quality.qualityAdjustedCompletionCost,
    qualityCompletionSurplus: finalWinState.quality.qualityCompletionSurplus,
    liquidityPenalty: finalWinState.liquidityPenalty,
    liquidityAudit: finalLiquidityAudit,
    passLiquidityAudit: passState.liquidityAudit,
    wtpReductionVsV1: v1BaselineWtp === undefined ? undefined : Math.max(0, v1BaselineWtp - wtp),
    liquidityRosterSlotNumber: team.roster.length + 1,
    utilityIfPass: passState.utility,
    utilityIfWin: finalWinState.utility,
    modelWarnings: [...new Set(warnings)],
  };
}

export function buildMarginalValueBidSheet(
  player: AuctionSimPlayer,
  teams: readonly AuctionSimTeamState[],
  remainingAfterPlayer: readonly AuctionSimPlayer[],
  config: AuctionSimConfig,
): MarginalValueBidRead[] {
  if (config.biddingPolicy === 'marginalValueV2Liquidity') {
    const v1Baselines = config.liquidityAuditV1Baseline
      ? teams.map((team) => evaluateMarginalValueBid(player, team, remainingAfterPlayer, {
        ...config,
        biddingPolicy: 'marginalValueV1',
        liquidityPenaltyWeight: 0,
      }))
      : [];
    return teams.map((team, index) =>
      evaluateMarginalValueV2LiquidityBid(
        player,
        team,
        remainingAfterPlayer,
        config,
        v1Baselines[index]?.wtp,
      ),
    );
  }
  return teams.map((team) => evaluateMarginalValueBid(player, team, remainingAfterPlayer, config));
}
