import type { TierKey } from '../data/tierParams';
import type { HiddenModifiers } from '../types/game';
import type { CanonicalPersonality } from './masterMoraleMatrix';

/**
 * §13 lines 235-236 — in-season trade-request propensity (pure engine).
 *
 * AUTH-4 DEFAULTS-TAKEN: the §13 235-vs-236 tension is reconciled by a
 * SIGNED loyalty term gated on fanSentiment. Angry fans make loyalty a positive
 * leave force (the loyal player's bond was to the fans/city); content fans make
 * loyalty protective. Setting loyaltyInversionWeight=0 recovers the obvious
 * pure-discontent model.
 *
 * L5c emits PROPENSITY only. The WHO-fires roll is L10's seeded job, so this
 * module is pure + deterministic: no nondeterministic random/time source, IO,
 * store, reporter, or UI dependency.
 */
export interface TradeRequestTuning {
  neutralMorale: number;
  discontentWeight: number;
  loyaltyInversionWeight: number;
  angerWeight: number;
  baseAngerFloor: number;
  requestThreshold: number;
  personalitySensitivity: Record<CanonicalPersonality, number>;
  intensityMultiplier: Record<TierKey, number>;
}

// §16 SIM-TUNE placeholders — shape locked, values owned by the Simulation Gate.
export const TRADE_REQUEST_TUNING: TradeRequestTuning = {
  neutralMorale: 50,
  discontentWeight: 0.6,
  loyaltyInversionWeight: 0.5,
  angerWeight: 1.0,
  baseAngerFloor: 0.0,
  requestThreshold: 0.5,
  personalitySensitivity: {
    COMPETITIVE: 1.15,
    RELAXED: 0.5,
    DROOPY: 1.0,
    JOLLY: 0.9,
    TOUGH: 0.85,
    TIMID: 1.1,
    EGOTISTICAL: 1.5,
  },
  intensityMultiplier: {
    juiced: 1.3,
    standard: 1.0,
    nerfed: 0.6,
  },
};

export interface TradeRequestPlayer extends Pick<HiddenModifiers, 'loyalty'> {
  id?: string;
  personality: CanonicalPersonality;
  playerMorale: number;
}

export type RankedTradeRequestPlayer = Required<Pick<TradeRequestPlayer, 'id'>>
  & Omit<TradeRequestPlayer, 'id'>
  & TradeRequestResult;

export interface TradeRequestResult {
  propensity: number;
  wouldRequest: boolean;
  reason: string;
  components: {
    fanAnger: number;
    playerDiscontent: number;
    loyaltyContribution: number;
    personalityScale: number;
    angerGate: number;
    intensity: TierKey;
  };
}

export function computeTradeRequestPropensity(
  player: TradeRequestPlayer,
  teamFanMorale: number,
  intensity: TierKey,
  config: TradeRequestTuning = TRADE_REQUEST_TUNING,
): TradeRequestResult {
  const fanSentiment = getFanSentiment(teamFanMorale, config.neutralMorale);
  const fanAnger = Math.max(0, -fanSentiment);
  const playerDiscontent = getPlayerDiscontent(player.playerMorale, config.neutralMorale);
  const loyaltyContribution = -(clamp(player.loyalty / 100, 0, 1))
    * fanSentiment
    * config.loyaltyInversionWeight;
  const personalityScale = config.personalitySensitivity[player.personality];
  const angerGate = config.baseAngerFloor + (fanAnger * config.angerWeight);
  const discontentTerm = playerDiscontent * config.discontentWeight;
  const propensity = clamp(
    (discontentTerm + loyaltyContribution)
      * angerGate
      * personalityScale
      * config.intensityMultiplier[intensity],
    0,
    1,
  );
  const wouldRequest = propensity >= config.requestThreshold;

  return {
    propensity,
    wouldRequest,
    reason: getReason(wouldRequest, fanAnger, loyaltyContribution, discontentTerm),
    components: {
      fanAnger,
      playerDiscontent,
      loyaltyContribution,
      personalityScale,
      angerGate,
      intensity,
    },
  };
}

export function rankTradeRequestCandidates(
  players: Array<TradeRequestPlayer & { id: string }>,
  teamFanMorale: number,
  intensity: TierKey,
  config: TradeRequestTuning = TRADE_REQUEST_TUNING,
): RankedTradeRequestPlayer[] {
  return players
    .map((player) => ({
      ...player,
      ...computeTradeRequestPropensity(player, teamFanMorale, intensity, config),
    }))
    .filter((player) => player.wouldRequest)
    .sort(compareRankedTradeRequestPlayers);
}

function getFanSentiment(teamFanMorale: number, neutralMorale: number): number {
  if (neutralMorale <= 0) {
    return 0;
  }

  return clamp((teamFanMorale - neutralMorale) / neutralMorale, -1, 1);
}

function getPlayerDiscontent(playerMorale: number, neutralMorale: number): number {
  if (neutralMorale <= 0) {
    return 0;
  }

  return clamp((neutralMorale - playerMorale) / neutralMorale, 0, 1);
}

function getReason(
  wouldRequest: boolean,
  fanAnger: number,
  loyaltyContribution: number,
  discontentTerm: number,
): string {
  if (!wouldRequest) {
    return fanAnger > 0
      ? 'trade_request.below_threshold'
      : 'trade_request.content_no_request';
  }

  if (loyaltyContribution > 0 && loyaltyContribution >= discontentTerm) {
    return 'trade_request.angry_fans_betrayed_loyalty';
  }

  return 'trade_request.low_morale_discontent';
}

function compareRankedTradeRequestPlayers(
  first: RankedTradeRequestPlayer,
  second: RankedTradeRequestPlayer,
): number {
  if (second.propensity !== first.propensity) {
    return second.propensity - first.propensity;
  }

  if (first.id < second.id) {
    return -1;
  }

  if (first.id > second.id) {
    return 1;
  }

  return 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
