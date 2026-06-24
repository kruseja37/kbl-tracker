import type { MoraleEventType as FanMoraleEventType } from './fanMoraleEngine';
import type { HiddenModifiers } from '../types/game';
import type { RelationshipEdgeType } from '../utils/franchiseRelationshipEdgesStorage';
import {
  MORALE_EFFECTS,
  RELATIONSHIP_6_TO_9_COVERAGE,
  RelationshipType,
  type RelationshipType as LegacyRelationshipType,
} from './relationshipEngine';

export type CanonicalPersonality =
  | 'COMPETITIVE'
  | 'RELAXED'
  | 'DROOPY'
  | 'JOLLY'
  | 'TOUGH'
  | 'TIMID'
  | 'EGOTISTICAL';

export type PlayerCentricMoraleEventType =
  | 'PLAYER_HOT_STREAK'
  | 'PLAYER_SLUMP'
  | 'CLUTCH_HIT'
  | 'CLUTCH_OUT'
  | 'BLOWN_SAVE'
  | 'GAME_SAVING_PLAY'
  | 'ROOKIE_BREAKOUT'
  | 'ROOKIE_STRUGGLE'
  | 'TEAMMATE_AWARD'
  | 'TEAMMATE_INJURY'
  | 'MANAGER_FIRED'
  | 'TRADE_DEMAND'
  | 'FAN_FAVORITE_LOCKED'
  | 'ALBATROSS_LOCKED'
  | 'CAPTAIN_BIG_GAME'
  | 'CAPTAIN_SLUMP';

export type MasterMoraleEventType = FanMoraleEventType | PlayerCentricMoraleEventType;

export type MoraleRelation =
  | 'teammate'
  | 'captain_teammate'
  | 'young_teammate'
  | 'position_group'
  | 'clubhouse';

export interface OtherTouchedBase {
  relation: MoraleRelation;
  delta: number;
}

export interface BaseMoraleConsequence {
  selfPlayerMoraleDelta: number;
  teamFanMoraleDelta: number;
  otherTouched: OtherTouchedBase[];
  reason: string;
}

export interface ResolvedOtherTouched extends OtherTouchedBase {
  baseDelta: number;
}

export interface ResolvedMoraleConsequence {
  eventType: MasterMoraleEventType | string;
  personality: CanonicalPersonality;
  base: BaseMoraleConsequence;
  selfPlayerMoraleDelta: number;
  teamFanMoraleDelta: number;
  fanMoraleToPlayerMoraleDelta: number;
  totalPlayerMoraleDelta: number;
  projectedPlayerMorale: number;
  projectedFanMorale: number;
  otherTouched: ResolvedOtherTouched[];
  reason: string;
  isNeutral: boolean;
}

export type MoraleMatrixTapKind = 'fame' | 'designation' | 'race' | 'relationship';

export type MoraleMatrixEvent =
  | {
      kind?: 'event';
      type: MasterMoraleEventType | string;
    }
  | {
      kind: MoraleMatrixTapKind;
      type: string;
      relationshipRole?: 'player1' | 'player2';
      chargedMatchupResult?: 'win' | 'loss';
      exactSelfPlayerMoraleDelta?: number;
      heatDelta?: number;
    };

type PersonalityTuning = {
  positiveSelfMultiplier: number;
  negativeSelfMultiplier: number;
  positiveFanMultiplier: number;
  negativeFanMultiplier: number;
  fanMoraleSensitivity: number;
};

const EVENT_DELTA = {
  neutral: 0,
  winFan: 1,
  lossFan: -1,
  walkOffWinFan: 3,
  walkOffLossFan: -3,
  noHitterFan: 5,
  gotNoHitFan: -4,
  shutoutWinFan: 2,
  shutoutLossFan: -2,
  winStreak3Fan: 2,
  winStreak5Fan: 5,
  winStreak7Fan: 8,
  loseStreak3Fan: -2,
  loseStreak5Fan: -5,
  loseStreak7Fan: -10,
  winStreakBrokenFan: -3,
  loseStreakBrokenFan: 4,
  tradeAcquireStarFan: 8,
  tradeLoseStarFan: -10,
  tradeSalaryDumpFan: -8,
  tradeDepthFan: 1,
  callUpTopProspectFan: 5,
  callUpRegularFan: 2,
  starToIlFan: -5,
  starReturnsFan: 5,
  playerDfaFan: -2,
  playerMilestoneFan: 4,
  weeklyAwardFan: 2,
  allStarSelectionFan: 3,
  leadDivisionFan: 5,
  clinchPlayoffFan: 15,
  clinchDivisionFan: 20,
  eliminatedFan: -15,
  openingDayFan: 10,
  rivalrySweepFan: 8,
  sweptByRivalFan: -8,
  championshipFan: 20,

  winSelf: 1,
  lossSelf: -1,
  walkOffWinSelf: 4,
  walkOffLossSelf: -4,
  noHitterSelf: 6,
  gotNoHitSelf: -4,
  shutoutWinSelf: 2,
  shutoutLossSelf: -2,
  playerHotStreakSelf: 4,
  playerSlumpSelf: -4,
  clutchHitSelf: 5,
  clutchOutSelf: -4,
  blownSaveSelf: -6,
  gameSavingPlaySelf: 5,
  rookieBreakoutSelf: 5,
  rookieStruggleSelf: -3,
  teammateAwardSelf: 1,
  teammateInjurySelf: -2,
  managerFiredSelf: -2,
  tradeDemandSelf: -3,
  raceSnubSelf: -4,
  fanFavoriteLockedSelf: 4,
  albatrossLockedSelf: -5,
  captainBigGameSelf: 3,
  captainSlumpSelf: -3,

  smallTeammateLift: 1,
  mediumTeammateLift: 2,
  largeTeammateLift: 3,
  smallTeammateDrop: -1,
  mediumTeammateDrop: -2,
  largeTeammateDrop: -3,
} as const;

// SIM-TUNE: every magnitude and multiplier below is a placeholder owned by the Simulation Gate (§16).
export const MORALE_TUNING = {
  scale: {
    modifierNeutral: 50,
    modifierRangeHalf: 50,
    moraleMin: 0,
    moraleMax: 99,
    deltaPrecision: 100,
    fanMoraleNeutral: 50,
    fanMoraleRangeHalf: 50,
  },
  eventDelta: EVENT_DELTA,
  modifierMultipliers: {
    ambitionUpSwing: 0.35,
    resilienceDownSwing: 0.35,
    charismaOtherTouchedSwing: 0.5,
    loyaltyFanLinkSwing: 0.35,
    fameHeatDeltaMoraleScale: 0.25,
  },
  fanMoraleLink: {
    maxPlayerDelta: 2,
  },
  personality: {
    COMPETITIVE: {
      positiveSelfMultiplier: 1.15,
      negativeSelfMultiplier: 1.05,
      positiveFanMultiplier: 1.05,
      negativeFanMultiplier: 1,
      fanMoraleSensitivity: 1.15,
    },
    RELAXED: {
      positiveSelfMultiplier: 0.85,
      negativeSelfMultiplier: 0.75,
      positiveFanMultiplier: 0.9,
      negativeFanMultiplier: 0.85,
      fanMoraleSensitivity: 0.5,
    },
    DROOPY: {
      positiveSelfMultiplier: 0.8,
      negativeSelfMultiplier: 1.25,
      positiveFanMultiplier: 0.9,
      negativeFanMultiplier: 1.1,
      fanMoraleSensitivity: 1,
    },
    JOLLY: {
      positiveSelfMultiplier: 1.1,
      negativeSelfMultiplier: 0.9,
      positiveFanMultiplier: 1.1,
      negativeFanMultiplier: 0.9,
      fanMoraleSensitivity: 0.9,
    },
    TOUGH: {
      positiveSelfMultiplier: 1,
      negativeSelfMultiplier: 0.8,
      positiveFanMultiplier: 1,
      negativeFanMultiplier: 0.9,
      fanMoraleSensitivity: 0.85,
    },
    TIMID: {
      positiveSelfMultiplier: 0.9,
      negativeSelfMultiplier: 1.2,
      positiveFanMultiplier: 0.95,
      negativeFanMultiplier: 1.05,
      fanMoraleSensitivity: 1.1,
    },
    EGOTISTICAL: {
      positiveSelfMultiplier: 1.25,
      negativeSelfMultiplier: 1.15,
      positiveFanMultiplier: 1.05,
      negativeFanMultiplier: 1.1,
      fanMoraleSensitivity: 1.5,
    },
  } satisfies Record<CanonicalPersonality, PersonalityTuning>,
  relation: {
    teammate: 1,
    captain_teammate: 2,
    young_teammate: 1.5,
    position_group: 1,
    clubhouse: 1.25,
  } satisfies Record<MoraleRelation, number>,
} as const;

export const CANONICAL_PERSONALITIES: CanonicalPersonality[] = [
  'COMPETITIVE',
  'RELAXED',
  'DROOPY',
  'JOLLY',
  'TOUGH',
  'TIMID',
  'EGOTISTICAL',
];

export const LEGACY_PERSONALITY_RECONCILIATION: Record<string, CanonicalPersonality> = {
  GRUMPY: 'DROOPY',
  FIERY: 'COMPETITIVE',
  SPIRITED: 'JOLLY',
  ECCENTRIC: 'JOLLY',
  NORMAL: 'RELAXED',
  DISCIPLINED: 'TOUGH',
  CRAFTY: 'TOUGH',
  GRITTY: 'TOUGH',
};

const NEUTRAL_BASE_CONSEQUENCE: BaseMoraleConsequence = {
  selfPlayerMoraleDelta: MORALE_TUNING.eventDelta.neutral,
  teamFanMoraleDelta: MORALE_TUNING.eventDelta.neutral,
  otherTouched: [],
  reason: 'neutral',
};

const RELATIONSHIP_MORALE_REPRESENTATIVE_9 = {
  RIVALRY: RelationshipType.RIVALS,
  FEUD: RelationshipType.BULLY_VICTIM,
  FRIENDSHIP: RelationshipType.BEST_FRIENDS,
  MENTORSHIP: RelationshipType.MENTOR_PROTEGE,
} as const satisfies Partial<Record<RelationshipEdgeType, LegacyRelationshipType>>;

export const RELATIONSHIP_MORALE_BASE_DELTAS: Readonly<
  Partial<Record<RelationshipEdgeType, { player1: number; player2: number }>>
> = Object.freeze({
  RIVALRY: derivedRelationshipMoraleBaseDeltas('RIVALRY'),
  FEUD: derivedRelationshipMoraleBaseDeltas('FEUD'),
  FRIENDSHIP: derivedRelationshipMoraleBaseDeltas('FRIENDSHIP'),
  MENTORSHIP: derivedRelationshipMoraleBaseDeltas('MENTORSHIP'),
});

const PLAYER_EVENT_BASE_TABLE = {
  WIN: row(EVENT_DELTA.winSelf, EVENT_DELTA.winFan, [], 'game.win'),
  LOSS: row(EVENT_DELTA.lossSelf, EVENT_DELTA.lossFan, [], 'game.loss'),
  WALK_OFF_WIN: row(EVENT_DELTA.walkOffWinSelf, EVENT_DELTA.walkOffWinFan, [
    touch('clubhouse', EVENT_DELTA.mediumTeammateLift),
  ], 'game.walk_off_win'),
  WALK_OFF_LOSS: row(EVENT_DELTA.walkOffLossSelf, EVENT_DELTA.walkOffLossFan, [
    touch('clubhouse', EVENT_DELTA.mediumTeammateDrop),
  ], 'game.walk_off_loss'),
  NO_HITTER: row(EVENT_DELTA.noHitterSelf, EVENT_DELTA.noHitterFan, [
    touch('teammate', EVENT_DELTA.mediumTeammateLift),
  ], 'game.no_hitter'),
  GOT_NO_HIT: row(EVENT_DELTA.gotNoHitSelf, EVENT_DELTA.gotNoHitFan, [], 'game.got_no_hit'),
  SHUTOUT_WIN: row(EVENT_DELTA.shutoutWinSelf, EVENT_DELTA.shutoutWinFan, [], 'game.shutout_win'),
  SHUTOUT_LOSS: row(EVENT_DELTA.shutoutLossSelf, EVENT_DELTA.shutoutLossFan, [], 'game.shutout_loss'),
  WIN_STREAK_3: row(EVENT_DELTA.winSelf, EVENT_DELTA.winStreak3Fan, [], 'streak.win_3'),
  WIN_STREAK_5: row(EVENT_DELTA.winSelf, EVENT_DELTA.winStreak5Fan, [], 'streak.win_5'),
  WIN_STREAK_7: row(EVENT_DELTA.winSelf, EVENT_DELTA.winStreak7Fan, [
    touch('clubhouse', EVENT_DELTA.smallTeammateLift),
  ], 'streak.win_7'),
  LOSE_STREAK_3: row(EVENT_DELTA.lossSelf, EVENT_DELTA.loseStreak3Fan, [], 'streak.lose_3'),
  LOSE_STREAK_5: row(EVENT_DELTA.lossSelf, EVENT_DELTA.loseStreak5Fan, [], 'streak.lose_5'),
  LOSE_STREAK_7: row(EVENT_DELTA.playerSlumpSelf, EVENT_DELTA.loseStreak7Fan, [
    touch('clubhouse', EVENT_DELTA.smallTeammateDrop),
  ], 'streak.lose_7'),
  WIN_STREAK_BROKEN: row(EVENT_DELTA.lossSelf, EVENT_DELTA.winStreakBrokenFan, [], 'streak.win_broken'),
  LOSE_STREAK_BROKEN: row(EVENT_DELTA.winSelf, EVENT_DELTA.loseStreakBrokenFan, [], 'streak.lose_broken'),
  TRADE_ACQUIRE_STAR: row(EVENT_DELTA.smallTeammateLift, EVENT_DELTA.tradeAcquireStarFan, [
    touch('clubhouse', EVENT_DELTA.mediumTeammateLift),
  ], 'trade.acquire_star'),
  TRADE_LOSE_STAR: row(EVENT_DELTA.smallTeammateDrop, EVENT_DELTA.tradeLoseStarFan, [
    touch('clubhouse', EVENT_DELTA.mediumTeammateDrop),
  ], 'trade.lose_star'),
  TRADE_SALARY_DUMP: row(EVENT_DELTA.tradeDemandSelf, EVENT_DELTA.tradeSalaryDumpFan, [], 'trade.salary_dump'),
  TRADE_DEPTH: row(EVENT_DELTA.neutral, EVENT_DELTA.tradeDepthFan, [], 'trade.depth'),
  CALL_UP_TOP_PROSPECT: row(EVENT_DELTA.rookieBreakoutSelf, EVENT_DELTA.callUpTopProspectFan, [
    touch('young_teammate', EVENT_DELTA.mediumTeammateLift),
  ], 'roster.call_up_top_prospect'),
  CALL_UP_REGULAR: row(EVENT_DELTA.winSelf, EVENT_DELTA.callUpRegularFan, [], 'roster.call_up_regular'),
  STAR_TO_IL: row(EVENT_DELTA.teammateInjurySelf, EVENT_DELTA.starToIlFan, [
    touch('clubhouse', EVENT_DELTA.smallTeammateDrop),
  ], 'roster.star_to_il'),
  STAR_RETURNS: row(EVENT_DELTA.winSelf, EVENT_DELTA.starReturnsFan, [
    touch('clubhouse', EVENT_DELTA.smallTeammateLift),
  ], 'roster.star_returns'),
  PLAYER_DFA: row(EVENT_DELTA.playerSlumpSelf, EVENT_DELTA.playerDfaFan, [], 'roster.player_dfa'),
  PLAYER_MILESTONE: row(EVENT_DELTA.clutchHitSelf, EVENT_DELTA.playerMilestoneFan, [
    touch('teammate', EVENT_DELTA.smallTeammateLift),
  ], 'achievement.player_milestone'),
  WEEKLY_AWARD: row(EVENT_DELTA.playerHotStreakSelf, EVENT_DELTA.weeklyAwardFan, [
    touch('teammate', EVENT_DELTA.smallTeammateLift),
  ], 'achievement.weekly_award'),
  ALL_STAR_SELECTION: row(EVENT_DELTA.playerHotStreakSelf, EVENT_DELTA.allStarSelectionFan, [
    touch('teammate', EVENT_DELTA.smallTeammateLift),
  ], 'achievement.all_star_selection'),
  LEAD_DIVISION: row(EVENT_DELTA.winSelf, EVENT_DELTA.leadDivisionFan, [], 'season.lead_division'),
  CLINCH_PLAYOFF: row(EVENT_DELTA.playerHotStreakSelf, EVENT_DELTA.clinchPlayoffFan, [
    touch('clubhouse', EVENT_DELTA.mediumTeammateLift),
  ], 'season.clinch_playoff'),
  CLINCH_DIVISION: row(EVENT_DELTA.playerHotStreakSelf, EVENT_DELTA.clinchDivisionFan, [
    touch('clubhouse', EVENT_DELTA.largeTeammateLift),
  ], 'season.clinch_division'),
  ELIMINATED: row(EVENT_DELTA.playerSlumpSelf, EVENT_DELTA.eliminatedFan, [
    touch('clubhouse', EVENT_DELTA.mediumTeammateDrop),
  ], 'season.eliminated'),
  OPENING_DAY: row(EVENT_DELTA.neutral, EVENT_DELTA.openingDayFan, [], 'season.opening_day'),
  ALL_STAR_BREAK: row(EVENT_DELTA.neutral, EVENT_DELTA.neutral, [], 'season.all_star_break'),
  RIVALRY_SWEEP: row(EVENT_DELTA.clutchHitSelf, EVENT_DELTA.rivalrySweepFan, [
    touch('clubhouse', EVENT_DELTA.mediumTeammateLift),
  ], 'season.rivalry_sweep'),
  SWEPT_BY_RIVAL: row(EVENT_DELTA.clutchOutSelf, EVENT_DELTA.sweptByRivalFan, [
    touch('clubhouse', EVENT_DELTA.mediumTeammateDrop),
  ], 'season.swept_by_rival'),
  EXPECTED_WINS_UPDATE: row(EVENT_DELTA.neutral, EVENT_DELTA.neutral, [], 'system.expected_wins_update'),
  NATURAL_DRIFT: row(EVENT_DELTA.neutral, EVENT_DELTA.neutral, [], 'system.natural_drift'),
  SEASON_ASSESSMENT: row(EVENT_DELTA.neutral, EVENT_DELTA.neutral, [], 'system.season_assessment'),
  CHAMPIONSHIP: row(EVENT_DELTA.playerHotStreakSelf, EVENT_DELTA.championshipFan, [
    touch('clubhouse', EVENT_DELTA.largeTeammateLift),
  ], 'season.championship'),
  PLAYER_HOT_STREAK: row(EVENT_DELTA.playerHotStreakSelf, EVENT_DELTA.neutral, [
    touch('teammate', EVENT_DELTA.smallTeammateLift),
  ], 'player.hot_streak'),
  PLAYER_SLUMP: row(EVENT_DELTA.playerSlumpSelf, EVENT_DELTA.neutral, [], 'player.slump'),
  CLUTCH_HIT: row(EVENT_DELTA.clutchHitSelf, EVENT_DELTA.neutral, [
    touch('teammate', EVENT_DELTA.smallTeammateLift),
  ], 'player.clutch_hit'),
  CLUTCH_OUT: row(EVENT_DELTA.clutchOutSelf, EVENT_DELTA.neutral, [], 'player.clutch_out'),
  BLOWN_SAVE: row(EVENT_DELTA.blownSaveSelf, EVENT_DELTA.neutral, [
    touch('position_group', EVENT_DELTA.smallTeammateDrop),
  ], 'player.blown_save'),
  GAME_SAVING_PLAY: row(EVENT_DELTA.gameSavingPlaySelf, EVENT_DELTA.neutral, [
    touch('teammate', EVENT_DELTA.smallTeammateLift),
  ], 'player.game_saving_play'),
  ROOKIE_BREAKOUT: row(EVENT_DELTA.rookieBreakoutSelf, EVENT_DELTA.callUpRegularFan, [
    touch('young_teammate', EVENT_DELTA.mediumTeammateLift),
  ], 'player.rookie_breakout'),
  ROOKIE_STRUGGLE: row(EVENT_DELTA.rookieStruggleSelf, EVENT_DELTA.neutral, [], 'player.rookie_struggle'),
  TEAMMATE_AWARD: row(EVENT_DELTA.teammateAwardSelf, EVENT_DELTA.neutral, [
    touch('teammate', EVENT_DELTA.smallTeammateLift),
  ], 'player.teammate_award'),
  TEAMMATE_INJURY: row(EVENT_DELTA.teammateInjurySelf, EVENT_DELTA.neutral, [
    touch('clubhouse', EVENT_DELTA.smallTeammateDrop),
  ], 'player.teammate_injury'),
  MANAGER_FIRED: row(EVENT_DELTA.managerFiredSelf, EVENT_DELTA.loseStreakBrokenFan, [
    touch('clubhouse', EVENT_DELTA.smallTeammateDrop),
  ], 'manager.fired'),
  TRADE_DEMAND: row(EVENT_DELTA.tradeDemandSelf, EVENT_DELTA.tradeSalaryDumpFan, [
    touch('clubhouse', EVENT_DELTA.smallTeammateDrop),
  ], 'player.trade_demand'),
  FAN_FAVORITE_LOCKED: row(EVENT_DELTA.fanFavoriteLockedSelf, EVENT_DELTA.playerMilestoneFan, [
    touch('teammate', EVENT_DELTA.mediumTeammateLift),
  ], 'designation.fan_favorite_locked'),
  ALBATROSS_LOCKED: row(EVENT_DELTA.albatrossLockedSelf, EVENT_DELTA.playerDfaFan, [], 'designation.albatross_locked'),
  CAPTAIN_BIG_GAME: row(EVENT_DELTA.captainBigGameSelf, EVENT_DELTA.neutral, [
    touch('captain_teammate', EVENT_DELTA.mediumTeammateLift),
  ], 'designation.captain_big_game'),
  CAPTAIN_SLUMP: row(EVENT_DELTA.captainSlumpSelf, EVENT_DELTA.neutral, [
    touch('captain_teammate', EVENT_DELTA.mediumTeammateDrop),
  ], 'designation.captain_slump'),
} satisfies Record<MasterMoraleEventType, BaseMoraleConsequence>;

export const MASTER_MORALE_BASE_TABLE: Readonly<Record<MasterMoraleEventType, BaseMoraleConsequence>> =
  PLAYER_EVENT_BASE_TABLE;

export type MoraleTapResolver = (event: MoraleMatrixEvent) => BaseMoraleConsequence;

function resolveFameTap(event: MoraleMatrixEvent): BaseMoraleConsequence {
  const heatDelta =
    event.kind === 'fame' && typeof event.heatDelta === 'number' && Number.isFinite(event.heatDelta)
      ? event.heatDelta
      : 0;
  if (heatDelta === 0) return NEUTRAL_BASE_CONSEQUENCE; // zero/undefined → frozen neutral SINGLETON (isNeutral is `base === NEUTRAL_BASE_CONSEQUENCE`)
  return {
    selfPlayerMoraleDelta: heatDelta * MORALE_TUNING.modifierMultipliers.fameHeatDeltaMoraleScale, // un-rounded; compose rounds + applies personality/ambition tilt downstream
    teamFanMoraleDelta: 0, // never push §20.6 fan morale
    otherTouched: [],
    reason: `fame.${String(event.type).toLowerCase()}`,
  };
}

export const MORALE_TAP_REGISTRY: Readonly<Record<MoraleMatrixTapKind, MoraleTapResolver>> = {
  fame: resolveFameTap,
  designation: () => NEUTRAL_BASE_CONSEQUENCE,
  race: (event) => ({
    selfPlayerMoraleDelta: EVENT_DELTA.raceSnubSelf,
    teamFanMoraleDelta: 0,
    otherTouched: [],
    reason: event.type,
  }),
  relationship: resolveRelationshipTap,
};

export function getBaseMoraleConsequence(event: MoraleMatrixEvent): BaseMoraleConsequence {
  if (event.kind && event.kind !== 'event') {
    return MORALE_TAP_REGISTRY[event.kind]?.(event) ?? NEUTRAL_BASE_CONSEQUENCE;
  }

  return lookupBaseRow(event.type);
}

export function composeMoraleConsequence(
  event: MoraleMatrixEvent,
  personality: string | undefined,
  modifiers: HiddenModifiers,
  currentPlayerMorale: number,
  currentFanMorale: number,
): ResolvedMoraleConsequence {
  const canonicalPersonality = normalizePersonality(personality);
  const base = getBaseMoraleConsequence(event);
  const personalityTuning = MORALE_TUNING.personality[canonicalPersonality];
  const eventType = event.type;
  const isNeutral = base === NEUTRAL_BASE_CONSEQUENCE;
  const exactRecoveryDelta = getExactRelationshipRecoveryDelta(event);

  if (isNeutral) {
    return {
      eventType,
      personality: canonicalPersonality,
      base,
      selfPlayerMoraleDelta: MORALE_TUNING.eventDelta.neutral,
      teamFanMoraleDelta: MORALE_TUNING.eventDelta.neutral,
      fanMoraleToPlayerMoraleDelta: MORALE_TUNING.eventDelta.neutral,
      totalPlayerMoraleDelta: MORALE_TUNING.eventDelta.neutral,
      projectedPlayerMorale: clampMorale(currentPlayerMorale),
      projectedFanMorale: clampMorale(currentFanMorale),
      otherTouched: [],
      reason: base.reason,
      isNeutral,
    };
  }

  if (exactRecoveryDelta !== null) {
    return {
      eventType,
      personality: canonicalPersonality,
      base,
      selfPlayerMoraleDelta: exactRecoveryDelta,
      teamFanMoraleDelta: MORALE_TUNING.eventDelta.neutral,
      fanMoraleToPlayerMoraleDelta: MORALE_TUNING.eventDelta.neutral,
      totalPlayerMoraleDelta: exactRecoveryDelta,
      projectedPlayerMorale: clampMorale(currentPlayerMorale + exactRecoveryDelta),
      projectedFanMorale: clampMorale(currentFanMorale),
      otherTouched: [],
      reason: base.reason,
      isNeutral: false,
    };
  }

  const selfPlayerMoraleDelta = applyPersonalityToSelfMoraleDelta(
    base.selfPlayerMoraleDelta,
    personality,
    modifiers,
  );
  const teamFanMoraleDelta = roundDelta(applyPersonalityMultiplier(
    base.teamFanMoraleDelta,
    personalityTuning.positiveFanMultiplier,
    personalityTuning.negativeFanMultiplier,
  ));
  const fanMoraleToPlayerMoraleDelta = getChargedMatchupResult(event)
    ? MORALE_TUNING.eventDelta.neutral
    : roundDelta(calculateFanMoraleLink(
      currentFanMorale,
      personalityTuning.fanMoraleSensitivity,
      modifiers.loyalty,
    ));
  const totalPlayerMoraleDelta = roundDelta(selfPlayerMoraleDelta + fanMoraleToPlayerMoraleDelta);
  const otherTouched = base.otherTouched.map((other) => {
    const resolvedDelta = roundDelta(
      other.delta *
      MORALE_TUNING.relation[other.relation] *
      calculateCharismaOtherTouchedMultiplier(modifiers.charisma),
    );

    return {
      relation: other.relation,
      baseDelta: other.delta,
      delta: resolvedDelta,
    };
  });

  return {
    eventType,
    personality: canonicalPersonality,
    base,
    selfPlayerMoraleDelta,
    teamFanMoraleDelta,
    fanMoraleToPlayerMoraleDelta,
    totalPlayerMoraleDelta,
    projectedPlayerMorale: clampMorale(currentPlayerMorale + totalPlayerMoraleDelta),
    projectedFanMorale: clampMorale(currentFanMorale + teamFanMoraleDelta),
    otherTouched,
    reason: base.reason,
    isNeutral,
  };
}

export function normalizePersonality(personality: string | undefined): CanonicalPersonality {
  const normalized = String(personality ?? '').trim().toUpperCase();
  if (isCanonicalPersonality(normalized)) {
    return normalized;
  }

  return LEGACY_PERSONALITY_RECONCILIATION[normalized] ?? 'RELAXED';
}

export function applyPersonalityToSelfMoraleDelta(
  baseSelfDelta: number,
  personality: string | undefined,
  modifiers: HiddenModifiers,
): number {
  const tuning = MORALE_TUNING.personality[normalizePersonality(personality)];
  return roundDelta(applyPersonalityMultiplier(
    applyAmbitionOrResilience(baseSelfDelta, modifiers),
    tuning.positiveSelfMultiplier,
    tuning.negativeSelfMultiplier,
  ));
}

function row(
  selfPlayerMoraleDelta: number,
  teamFanMoraleDelta: number,
  otherTouched: OtherTouchedBase[],
  reason: string,
): BaseMoraleConsequence {
  return {
    selfPlayerMoraleDelta,
    teamFanMoraleDelta,
    otherTouched,
    reason,
  };
}

function touch(relation: MoraleRelation, delta: number): OtherTouchedBase {
  return { relation, delta };
}

function derivedRelationshipMoraleBaseDeltas(edgeType: keyof typeof RELATIONSHIP_MORALE_REPRESENTATIVE_9): {
  player1: number;
  player2: number;
} {
  const representative = RELATIONSHIP_MORALE_REPRESENTATIVE_9[edgeType];
  const coverage = RELATIONSHIP_6_TO_9_COVERAGE[edgeType] as readonly LegacyRelationshipType[];
  if (!coverage.includes(representative)) {
    throw new Error(`Relationship morale representative ${representative} does not cover ${edgeType}`);
  }
  return { ...MORALE_EFFECTS[representative] };
}

function resolveRelationshipTap(event: MoraleMatrixEvent): BaseMoraleConsequence {
  const exactRecoveryDelta = getExactRelationshipRecoveryDelta(event);
  if (exactRecoveryDelta !== null) {
    return {
      selfPlayerMoraleDelta: exactRecoveryDelta,
      teamFanMoraleDelta: 0,
      otherTouched: [],
      reason: 'relationship.recovery',
    };
  }

  const edgeType = normalizeRelationshipEdgeType(event.type);
  if (!edgeType) return NEUTRAL_BASE_CONSEQUENCE;

  const chargedMatchupResult = getChargedMatchupResult(event);
  if (chargedMatchupResult) {
    return {
      selfPlayerMoraleDelta: chargedMatchupResult === 'win'
        ? EVENT_DELTA.winSelf
        : EVENT_DELTA.lossSelf,
      teamFanMoraleDelta: 0,
      otherTouched: [],
      reason: `relationship.charged_matchup.${chargedMatchupResult}`,
    };
  }

  const deltas = RELATIONSHIP_MORALE_BASE_DELTAS[edgeType];
  if (!deltas) return NEUTRAL_BASE_CONSEQUENCE;

  const relationshipRole = getRelationshipEventRole(event, edgeType);
  return {
    selfPlayerMoraleDelta: deltas[relationshipRole],
    teamFanMoraleDelta: 0,
    otherTouched: [],
    reason: `relationship.${edgeType.toLowerCase()}.${relationshipRole}`,
  };
}

function normalizeRelationshipEdgeType(value: string): RelationshipEdgeType | null {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (
    normalized === 'RIVALRY' ||
    normalized === 'FEUD' ||
    normalized === 'MENTORSHIP' ||
    normalized === 'FRIENDSHIP' ||
    normalized === 'ROMANCE' ||
    normalized === 'HISTORY'
  ) {
    return normalized;
  }
  return null;
}

function getRelationshipEventRole(
  event: MoraleMatrixEvent,
  edgeType: RelationshipEdgeType,
): 'player1' | 'player2' {
  if ('relationshipRole' in event && event.relationshipRole === 'player2') {
    return 'player2';
  }
  if ('relationshipRole' in event && event.relationshipRole === 'player1') {
    return 'player1';
  }

  return edgeType === 'FEUD' ? 'player2' : 'player1';
}

function getChargedMatchupResult(event: MoraleMatrixEvent): 'win' | 'loss' | null {
  if (
    event.kind === 'relationship' &&
    'chargedMatchupResult' in event &&
    (event.chargedMatchupResult === 'win' || event.chargedMatchupResult === 'loss')
  ) {
    return event.chargedMatchupResult;
  }
  return null;
}

function getExactRelationshipRecoveryDelta(event: MoraleMatrixEvent): number | null {
  if (
    event.kind === 'relationship' &&
    event.type === 'relationship.recovery' &&
    'exactSelfPlayerMoraleDelta' in event &&
    typeof event.exactSelfPlayerMoraleDelta === 'number' &&
    Number.isFinite(event.exactSelfPlayerMoraleDelta) &&
    event.exactSelfPlayerMoraleDelta !== 0
  ) {
    return event.exactSelfPlayerMoraleDelta;
  }

  return null;
}

function lookupBaseRow(eventType: MasterMoraleEventType | string): BaseMoraleConsequence {
  return Object.prototype.hasOwnProperty.call(PLAYER_EVENT_BASE_TABLE, eventType)
    ? PLAYER_EVENT_BASE_TABLE[eventType as MasterMoraleEventType]
    : NEUTRAL_BASE_CONSEQUENCE;
}

function isCanonicalPersonality(personality: string): personality is CanonicalPersonality {
  return (CANONICAL_PERSONALITIES as string[]).includes(personality);
}

function applyAmbitionOrResilience(delta: number, modifiers: HiddenModifiers): number {
  if (delta > MORALE_TUNING.eventDelta.neutral) {
    return delta * calculateAmbitionUpMultiplier(modifiers.ambition);
  }
  if (delta < MORALE_TUNING.eventDelta.neutral) {
    return delta * calculateResilienceDownMultiplier(modifiers.resilience);
  }
  return delta;
}

function applyPersonalityMultiplier(
  delta: number,
  positiveMultiplier: number,
  negativeMultiplier: number,
): number {
  if (delta > MORALE_TUNING.eventDelta.neutral) return delta * positiveMultiplier;
  if (delta < MORALE_TUNING.eventDelta.neutral) return delta * negativeMultiplier;
  return delta;
}

function calculateAmbitionUpMultiplier(ambition: number): number {
  return 1 + centeredModifier(ambition) * MORALE_TUNING.modifierMultipliers.ambitionUpSwing;
}

function calculateResilienceDownMultiplier(resilience: number): number {
  return 1 - centeredModifier(resilience) * MORALE_TUNING.modifierMultipliers.resilienceDownSwing;
}

function calculateCharismaOtherTouchedMultiplier(charisma: number): number {
  return 1 + centeredModifier(charisma) * MORALE_TUNING.modifierMultipliers.charismaOtherTouchedSwing;
}

function calculateFanMoraleLink(
  currentFanMorale: number,
  personalityFanSensitivity: number,
  loyalty: number,
): number {
  const fanMoraleCentered = (
    clampMorale(currentFanMorale) - MORALE_TUNING.scale.fanMoraleNeutral
  ) / MORALE_TUNING.scale.fanMoraleRangeHalf;
  const loyaltyMultiplier = 1 + centeredModifier(loyalty) * MORALE_TUNING.modifierMultipliers.loyaltyFanLinkSwing;

  return fanMoraleCentered * MORALE_TUNING.fanMoraleLink.maxPlayerDelta * personalityFanSensitivity * loyaltyMultiplier;
}

function centeredModifier(value: number): number {
  const clamped = clamp(value, MORALE_TUNING.scale.moraleMin, MORALE_TUNING.scale.moraleMax + 1);
  return (clamped - MORALE_TUNING.scale.modifierNeutral) / MORALE_TUNING.scale.modifierRangeHalf;
}

export function clampMorale(value: number): number {
  return clamp(value, MORALE_TUNING.scale.moraleMin, MORALE_TUNING.scale.moraleMax);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function roundDelta(value: number): number {
  return Math.round(value * MORALE_TUNING.scale.deltaPrecision) / MORALE_TUNING.scale.deltaPrecision;
}
