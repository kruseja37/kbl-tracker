import { FAME_VALUES, type FameEventType } from '../types/game';
import { calculateFame, getLIMultiplier, getPlayoffMultiplier } from './fameEngine';

export { calculateFame, getLIMultiplier, getPlayoffMultiplier };

export type FameTier =
  | 'IMMORTAL_LEGEND'
  | 'GLOBAL_SUPERSTAR'
  | 'NATIONAL_ICON'
  | 'REGIONAL_STAR'
  | 'LOCAL_HERO'
  | 'UNKNOWN'
  | 'POLARIZING'
  | 'NOTORIOUS'
  | 'DESPISED';

export type FameMeritLevel = 'low' | 'average' | 'high' | 'elite';
export type FameVsMeritClassification = 'snub' | 'bust' | 'darling' | 'aligned';

export type FameAttributionChannel =
  | 'wpa_spine'
  | 'iconic_event'
  | 'status'
  | 'defensive'
  | 'role_player';

export interface FameModelRecord {
  heat: number;
  /** Nonnegative §20.3 reach magnitude: 0 Unknown, 1 Local/Polarizing impression, up to 5 Immortal. */
  reachFloor: number;
  wasNegative: boolean;
}

export interface ChannelTaggedFameInput {
  channel: FameAttributionChannel;
  fame: number;
  weight?: number;
}

export interface ChannelFameBreakdown {
  total: number;
  byChannel: Record<FameAttributionChannel, number>;
}

export interface IconicFameInput {
  eventType: FameEventType;
  leverageIndex?: number;
  playoffContext?: Parameters<typeof calculateFame>[2];
  channel?: FameAttributionChannel;
}

type FameTuning = typeof FAME_TUNING;

export const FAME_TIER_ORDER: readonly FameTier[] = [
  'IMMORTAL_LEGEND',
  'GLOBAL_SUPERSTAR',
  'NATIONAL_ICON',
  'REGIONAL_STAR',
  'LOCAL_HERO',
  'UNKNOWN',
  'POLARIZING',
  'NOTORIOUS',
  'DESPISED',
] as const;

export const FAME_TIER_RANK: Record<FameTier, number> = {
  IMMORTAL_LEGEND: 5,
  GLOBAL_SUPERSTAR: 4,
  NATIONAL_ICON: 3,
  REGIONAL_STAR: 2,
  LOCAL_HERO: 1,
  UNKNOWN: 0,
  POLARIZING: -1,
  NOTORIOUS: -2,
  DESPISED: -3,
};

const FAME_TIER_BY_RANK: Record<number, FameTier> = {
  5: 'IMMORTAL_LEGEND',
  4: 'GLOBAL_SUPERSTAR',
  3: 'NATIONAL_ICON',
  2: 'REGIONAL_STAR',
  1: 'LOCAL_HERO',
  0: 'UNKNOWN',
  [-1]: 'POLARIZING',
  [-2]: 'NOTORIOUS',
  [-3]: 'DESPISED',
};

// SIM-TUNE: every magnitude below is a placeholder owned by the Simulation Gate (§20.9).
export const FAME_TUNING = {
  heat: {
    neutral: 0,
    decayPerUpdate: 0.85,
    min: -30,
    max: 50,
    precision: 1000,
  },
  tierThresholds: {
    immortalLegend: 34,
    globalSuperstar: 24,
    nationalIcon: 15,
    regionalStar: 8,
    localHero: 3,
    unknownBand: 2.999,
    polarizing: -3,
    notorious: -9,
    despised: -18,
  },
  warGravity: {
    strength: 0.2,
    meritHeatTarget: {
      low: 0,
      average: 4,
      high: 12,
      elite: 24,
    } satisfies Record<FameMeritLevel, number>,
  },
  tradeReset: {
    heatRetention: 0.35,
    reachFloorAfterTrade: 0,
  },
  channelWeights: {
    wpa_spine: 1,
    iconic_event: 1,
    status: 1,
    defensive: 1,
    role_player: 1,
  } satisfies Record<FameAttributionChannel, number>,
  classifier: {
    lowFameMaxRank: 1,
    highFameMinRank: 3,
    bustMeritMaxScore: 1,
    darlingMeritMaxScore: 2,
    snubMeritMinScore: 3,
  },
} as const;

export function applyHeatUpdate(
  currentHeat: number,
  gameHeatInput: number,
  config: FameTuning = FAME_TUNING,
): number {
  return clampAndRoundHeat((currentHeat * config.heat.decayPerUpdate) + gameHeatInput, config);
}

export function applyWarLegitimacyGravity(
  currentHeat: number,
  warJustifiedHeatOrMerit: number | FameMeritLevel,
  config: FameTuning = FAME_TUNING,
): number {
  const targetHeat = typeof warJustifiedHeatOrMerit === 'number'
    ? warJustifiedHeatOrMerit
    : config.warGravity.meritHeatTarget[warJustifiedHeatOrMerit];

  return clampAndRoundHeat(
    currentHeat + ((targetHeat - currentHeat) * config.warGravity.strength),
    config,
  );
}

export function heatToFameTier(heat: number, config: FameTuning = FAME_TUNING): FameTier {
  const thresholds = config.tierThresholds;

  if (heat >= thresholds.immortalLegend) return 'IMMORTAL_LEGEND';
  if (heat >= thresholds.globalSuperstar) return 'GLOBAL_SUPERSTAR';
  if (heat >= thresholds.nationalIcon) return 'NATIONAL_ICON';
  if (heat >= thresholds.regionalStar) return 'REGIONAL_STAR';
  if (heat >= thresholds.localHero) return 'LOCAL_HERO';
  if (heat > thresholds.polarizing) return 'UNKNOWN';
  if (heat > thresholds.notorious) return 'POLARIZING';
  if (heat > thresholds.despised) return 'NOTORIOUS';
  return 'DESPISED';
}

export function updateReachFloor(
  currentReachFloor: number,
  heat: number,
  config: FameTuning = FAME_TUNING,
): number {
  const heatRank = FAME_TIER_RANK[heatToFameTier(heat, config)];

  if (heatRank === FAME_TIER_RANK.UNKNOWN) {
    return currentReachFloor;
  }

  const reachedMagnitude = Math.abs(heatRank);
  return Math.max(currentReachFloor, reachedMagnitude);
}

export function resolveFameTier(
  heat: number,
  reachFloor: number,
  config: FameTuning = FAME_TUNING,
): FameTier {
  const heatRank = FAME_TIER_RANK[heatToFameTier(heat, config)];

  if (reachFloor === FAME_TIER_RANK.UNKNOWN) {
    return FAME_TIER_BY_RANK[heatRank];
  }

  if (reachFloor > FAME_TIER_RANK.UNKNOWN && heatRank > FAME_TIER_RANK.UNKNOWN) {
    return FAME_TIER_BY_RANK[Math.max(heatRank, reachFloor)];
  }

  if (reachFloor > FAME_TIER_RANK.UNKNOWN && heatRank === FAME_TIER_RANK.UNKNOWN) {
    return 'LOCAL_HERO';
  }

  return FAME_TIER_BY_RANK[heatRank];
}

export function applyTradeReset(
  record: FameModelRecord,
  config: FameTuning = FAME_TUNING,
): FameModelRecord {
  const heat = clampAndRoundHeat(record.heat * config.tradeReset.heatRetention, config);

  return {
    heat,
    reachFloor: config.tradeReset.reachFloorAfterTrade,
    wasNegative: record.wasNegative || record.heat < config.heat.neutral,
  };
}

export function classifyFameVsMerit(
  fameTier: FameTier,
  meritLevel: FameMeritLevel,
  config: FameTuning = FAME_TUNING,
): FameVsMeritClassification {
  const fameRank = FAME_TIER_RANK[fameTier];
  const fameMagnitude = Math.abs(fameRank);
  const meritScore = meritLevelToScore(meritLevel);

  if (meritScore >= config.classifier.snubMeritMinScore && fameRank <= config.classifier.lowFameMaxRank) {
    return 'snub';
  }

  if (
    meritScore <= config.classifier.bustMeritMaxScore
    && fameMagnitude >= config.classifier.highFameMinRank
  ) {
    return 'bust';
  }

  if (
    meritScore <= config.classifier.darlingMeritMaxScore
    && fameRank >= FAME_TIER_RANK.REGIONAL_STAR
  ) {
    return 'darling';
  }

  return 'aligned';
}

export function aggregateChannelFame(
  inputs: readonly ChannelTaggedFameInput[],
  config: FameTuning = FAME_TUNING,
): ChannelFameBreakdown {
  const byChannel = emptyChannelBreakdown();

  for (const input of inputs) {
    byChannel[input.channel] += input.fame * (input.weight ?? config.channelWeights[input.channel]);
  }

  return {
    total: roundToPrecision(Object.values(byChannel).reduce((sum, value) => sum + value, 0), config.heat.precision),
    byChannel: roundChannelBreakdown(byChannel, config),
  };
}

export function aggregateDefensiveFame(
  inputs: readonly ChannelTaggedFameInput[],
  config: FameTuning = FAME_TUNING,
): number {
  return aggregateChannels(inputs, ['defensive'], config);
}

export function aggregateRolePlayerFame(
  inputs: readonly ChannelTaggedFameInput[],
  config: FameTuning = FAME_TUNING,
): number {
  return aggregateChannels(inputs, ['role_player'], config);
}

export function getBaseIconicFameValue(eventType: FameEventType): number {
  return FAME_VALUES[eventType];
}

export function createIconicEventFameInput({
  eventType,
  leverageIndex = 1,
  playoffContext,
  channel = 'iconic_event',
}: IconicFameInput): ChannelTaggedFameInput {
  return {
    channel,
    fame: calculateFame(eventType, leverageIndex, playoffContext).finalFame,
  };
}

function aggregateChannels(
  inputs: readonly ChannelTaggedFameInput[],
  channels: readonly FameAttributionChannel[],
  config: FameTuning,
): number {
  const channelSet = new Set(channels);
  return roundToPrecision(
    inputs.reduce((sum, input) => {
      if (!channelSet.has(input.channel)) return sum;
      return sum + (input.fame * (input.weight ?? config.channelWeights[input.channel]));
    }, 0),
    config.heat.precision,
  );
}

function emptyChannelBreakdown(): Record<FameAttributionChannel, number> {
  return {
    wpa_spine: 0,
    iconic_event: 0,
    status: 0,
    defensive: 0,
    role_player: 0,
  };
}

function roundChannelBreakdown(
  byChannel: Record<FameAttributionChannel, number>,
  config: FameTuning,
): Record<FameAttributionChannel, number> {
  return {
    wpa_spine: roundToPrecision(byChannel.wpa_spine, config.heat.precision),
    iconic_event: roundToPrecision(byChannel.iconic_event, config.heat.precision),
    status: roundToPrecision(byChannel.status, config.heat.precision),
    defensive: roundToPrecision(byChannel.defensive, config.heat.precision),
    role_player: roundToPrecision(byChannel.role_player, config.heat.precision),
  };
}

function clampAndRoundHeat(heat: number, config: FameTuning): number {
  return roundToPrecision(Math.max(config.heat.min, Math.min(config.heat.max, heat)), config.heat.precision);
}

function roundToPrecision(value: number, precision: number): number {
  return Math.round(value * precision) / precision;
}

function meritLevelToScore(meritLevel: FameMeritLevel): number {
  switch (meritLevel) {
    case 'elite':
      return 4;
    case 'high':
      return 3;
    case 'average':
      return 2;
    case 'low':
      return 1;
  }
}
