/**
 * Fan Favorite / Albatross Engine
 *
 * Per FAN_FAVORITE_SYSTEM_SPEC.md:
 * - Fan Favorite = highest positive Value Delta on team
 * - Albatross = most negative Value Delta on team (min salary threshold)
 * - One of each per team, position-relative
 * - Dynamic "projected" status → season-locked at season end
 *
 * Covers: GAP-B4-012 through GAP-B4-025
 */

import type { FameEventType } from '../types/game';

// ============================================
// TYPES
// ============================================

export interface FanFavoriteCandidate {
  playerId: string;
  playerName: string;
  position: string;
  salary: number;
  actualWAR: number;
  trueValue: number;
  valueDelta: number;
  valueOverContractPct: number;
  designation: 'FAN_FAVORITE';
  reason: string;
  status: 'projected' | 'locked';
}

export interface AlbatrossCandidate {
  playerId: string;
  playerName: string;
  position: string;
  salary: number;
  actualWAR: number;
  trueValue: number;
  valueDelta: number;
  valueOverContractPct: number;
  designation: 'ALBATROSS';
  reason: string;
  status: 'projected' | 'locked';
}

export interface PlayerSeasonData {
  playerId: string;
  playerName: string;
  position: string;
  salary: number;
  gamesPlayed: number;
  war: number;
  trueValue: number; // calculated from performance
}

export interface LeagueContext {
  gamesPerTeam: number;
  leagueMinSalary: number;
  seasonProgress: number; // 0.0 to 1.0
}

export interface FanFavoriteResult {
  fanFavorite: FanFavoriteCandidate | null;
  albatross: AlbatrossCandidate | null;
}

export interface FameEventOutput {
  type: FameEventType;
  playerId: string;
  fameValue: number;
}

export interface HappinessEffect {
  type: string;
  value: number;
  description: string;
}

export interface EndOfSeasonResult {
  fanFavorite: FanFavoriteCandidate | null;
  albatross: AlbatrossCandidate | null;
  fameEvents: FameEventOutput[];
  happinessEffects: HappinessEffect[];
}

// ============================================
// CONSTANTS
// ============================================

/** GAP-B4-015: In-season happiness effects */
export const IN_SEASON_HAPPINESS_EFFECTS = {
  FF_BIG_GAME: 0.75,
  FF_CLUTCH_HIT: 1.0,
  FF_WALKOFF: 2.0,
  ALB_CLUTCH_FAILURE: -0.75,
  ALB_COSTLY_ERROR: -1.0,
  ALB_BENCHED: -0.5,
} as const;

/** Season progress scaling factors */
export const SEASON_SCALE_FACTORS = {
  EARLY: 0.5,    // < 25%
  MID: 1.0,      // 25-50%
  LATE: 1.25,    // 50-75%
  FINAL: 1.5,    // 75-100%
} as const;

/** GAP-B4-016: Roster transaction happiness effects */
export const TRANSACTION_HAPPINESS_EFFECTS = {
  TRADED_FAN_FAVORITE: -15,
  RELEASED_FAN_FAVORITE: -20,
  FAN_FAVORITE_RETIRES: -5,
  FAN_FAVORITE_FREE_AGENCY_LOSS: -10,
  TRADED_ALBATROSS: 10,
  RELEASED_ALBATROSS: 15,
  ALBATROSS_RETIRES: 5,
  ALBATROSS_FREE_AGENCY_LOSS: 8,
} as const;

/** GAP-B4-017: Trade value modifiers */
export const TRADE_VALUE_MODIFIERS = {
  FAN_FAVORITE_PREMIUM: 1.15,
  ALBATROSS_DISCOUNT: 0.70,
} as const;

/** GAP-B4-018: Contract negotiation modifiers */
export const CONTRACT_MODIFIERS = {
  FF_SALARY_DEMAND: 1.15,
  FF_LOYALTY_DISCOUNT: 0.10,
  ALB_SALARY_DEMAND: 0.90,
  ALB_LOYALTY: 0,
} as const;

/** Minimum underperformance threshold for Albatross */
const ALBATROSS_UNDERPERFORMANCE_THRESHOLD = -0.25; // 25% under

/** Carryover threshold for next season */
const CARRYOVER_THRESHOLD = 0.10; // 10% of season

// ============================================
// DETECTION (GAP-B4-012, GAP-B4-013, GAP-B4-014)
// ============================================

/**
 * GAP-B4-014: Minimum games for qualification
 * 10% of season, floor of 3 games
 */
export function getMinGamesForQualification(gamesPerTeam: number): number {
  return Math.max(3, Math.ceil(gamesPerTeam * 0.10));
}

/**
 * GAP-B4-014: Minimum salary for Albatross qualification
 * 2× league minimum
 */
export function getMinSalaryForAlbatross(leagueMinSalary: number): number {
  return leagueMinSalary * 2;
}

/**
 * GAP-B4-014: Should we recalculate Fan Favorite/Albatross?
 */
export function shouldRecalculate(event: string): boolean {
  const recalcTriggers = new Set(['GAME_END', 'TRADE_COMPLETED', 'PLAYER_INJURED']);
  return recalcTriggers.has(event);
}

/**
 * GAP-B4-012 + GAP-B4-025: Generate Fan Favorite reason text
 */
export function generateFanFavoriteReason(valueOverContractPct: number): string {
  if (valueOverContractPct >= 500) return 'An absolute steal — delivering elite production at a bargain price';
  if (valueOverContractPct >= 200) return 'Massively outperforming their contract with star-level numbers';
  if (valueOverContractPct >= 100) return 'Providing double the value of their salary';
  return 'Exceeding expectations and delivering consistent value beyond their contract';
}

/**
 * GAP-B4-013 + GAP-B4-025: Generate Albatross reason text
 * 3 severity tiers per spec
 */
export function generateAlbatrossReason(valueOverContractPct: number): string {
  if (valueOverContractPct <= -75) return 'Complete bust — production nowhere near matching their massive salary';
  if (valueOverContractPct <= -50) return 'Severely underperforming their contract with replacement-level numbers';
  return 'Not living up to their contract — production lags well behind salary expectations';
}

/**
 * GAP-B4-012: Detect Fan Favorite on a team
 * Highest positive Value Delta among qualified players
 */
export function detectFanFavorite(
  players: PlayerSeasonData[],
  context: LeagueContext
): FanFavoriteCandidate | null {
  const minGames = getMinGamesForQualification(context.gamesPerTeam);

  const qualified = players.filter(p => p.gamesPlayed >= minGames);
  if (qualified.length === 0) return null;

  // Calculate value deltas
  const withDelta = qualified.map(p => ({
    ...p,
    valueDelta: p.trueValue - p.salary,
    valueOverContractPct: p.salary > 0 ? ((p.trueValue - p.salary) / p.salary) * 100 : 0,
  }));

  // Find highest positive delta
  const candidates = withDelta.filter(p => p.valueDelta > 0);
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.valueDelta - a.valueDelta);
  const best = candidates[0];

  const status: 'projected' | 'locked' = context.seasonProgress >= 1.0 ? 'locked' : 'projected';

  return {
    playerId: best.playerId,
    playerName: best.playerName,
    position: best.position,
    salary: best.salary,
    actualWAR: best.war,
    trueValue: best.trueValue,
    valueDelta: best.valueDelta,
    valueOverContractPct: best.valueOverContractPct,
    designation: 'FAN_FAVORITE',
    reason: generateFanFavoriteReason(best.valueOverContractPct),
    status,
  };
}

/**
 * GAP-B4-013: Detect Albatross on a team
 * Most negative Value Delta, min salary ≥2× league min, ≥25% underperformance
 */
export function detectAlbatross(
  players: PlayerSeasonData[],
  context: LeagueContext
): AlbatrossCandidate | null {
  const minGames = getMinGamesForQualification(context.gamesPerTeam);
  const minSalary = getMinSalaryForAlbatross(context.leagueMinSalary);

  const qualified = players.filter(
    p => p.gamesPlayed >= minGames && p.salary >= minSalary
  );
  if (qualified.length === 0) return null;

  const withDelta = qualified.map(p => ({
    ...p,
    valueDelta: p.trueValue - p.salary,
    valueOverContractPct: p.salary > 0 ? ((p.trueValue - p.salary) / p.salary) * 100 : 0,
  }));

  // Must be at least 25% under value
  const candidates = withDelta.filter(
    p => p.valueOverContractPct <= ALBATROSS_UNDERPERFORMANCE_THRESHOLD * 100
  );
  if (candidates.length === 0) return null;

  // Most negative delta
  candidates.sort((a, b) => a.valueDelta - b.valueDelta);
  const worst = candidates[0];

  const status: 'projected' | 'locked' = context.seasonProgress >= 1.0 ? 'locked' : 'projected';

  return {
    playerId: worst.playerId,
    playerName: worst.playerName,
    position: worst.position,
    salary: worst.salary,
    actualWAR: worst.war,
    trueValue: worst.trueValue,
    valueDelta: worst.valueDelta,
    valueOverContractPct: worst.valueOverContractPct,
    designation: 'ALBATROSS',
    reason: generateAlbatrossReason(worst.valueOverContractPct),
    status,
  };
}

/**
 * Detect both Fan Favorite and Albatross for a team
 */
export function detectDesignations(
  players: PlayerSeasonData[],
  context: LeagueContext
): FanFavoriteResult {
  return {
    fanFavorite: detectFanFavorite(players, context),
    albatross: detectAlbatross(players, context),
  };
}

// ============================================
// GAMEPLAY EFFECTS (GAP-B4-015, GAP-B4-016, GAP-B4-017, GAP-B4-018)
// ============================================

/**
 * GAP-B4-015: Get season scale factor for happiness effects
 */
export function getSeasonScaleFactor(seasonProgress: number): number {
  if (seasonProgress < 0.25) return SEASON_SCALE_FACTORS.EARLY;
  if (seasonProgress < 0.50) return SEASON_SCALE_FACTORS.MID;
  if (seasonProgress < 0.75) return SEASON_SCALE_FACTORS.LATE;
  return SEASON_SCALE_FACTORS.FINAL;
}

/**
 * GAP-B4-015: Calculate in-season happiness effect
 */
export function calculateInSeasonHappiness(
  event: keyof typeof IN_SEASON_HAPPINESS_EFFECTS,
  seasonProgress: number
): number {
  return IN_SEASON_HAPPINESS_EFFECTS[event] * getSeasonScaleFactor(seasonProgress);
}

/**
 * GAP-B4-016: Get roster transaction happiness effect
 */
export function getTransactionHappiness(
  event: keyof typeof TRANSACTION_HAPPINESS_EFFECTS
): number {
  return TRANSACTION_HAPPINESS_EFFECTS[event];
}

/**
 * GAP-B4-017: Apply trade value modifier based on FF/Albatross status
 */
export function applyTradeValueModifier(
  baseTradeValue: number,
  designation: 'FAN_FAVORITE' | 'ALBATROSS' | null
): number {
  if (designation === 'FAN_FAVORITE') return baseTradeValue * TRADE_VALUE_MODIFIERS.FAN_FAVORITE_PREMIUM;
  if (designation === 'ALBATROSS') return baseTradeValue * TRADE_VALUE_MODIFIERS.ALBATROSS_DISCOUNT;
  return baseTradeValue;
}

/**
 * GAP-B4-018: Calculate free agency salary demand with FF/Albatross modifier
 */
export function calculateFreeAgencyDemand(
  baseSalary: number,
  designation: 'FAN_FAVORITE' | 'ALBATROSS' | null,
  isReSign: boolean
): number {
  if (designation === 'FAN_FAVORITE') {
    const demand = baseSalary * CONTRACT_MODIFIERS.FF_SALARY_DEMAND;
    return isReSign ? demand * (1 - CONTRACT_MODIFIERS.FF_LOYALTY_DISCOUNT) : demand;
  }
  if (designation === 'ALBATROSS') {
    return baseSalary * CONTRACT_MODIFIERS.ALB_SALARY_DEMAND;
  }
  return baseSalary;
}

// ============================================
// NARRATIVE (GAP-B4-019)
// ============================================

type HeadlineCategory = 'NEW_FAN_FAVORITE' | 'FAN_FAVORITE_TRADED' | 'ALBATROSS_EMERGES' | 'ALBATROSS_TRADED';

const HEADLINE_TEMPLATES: Record<HeadlineCategory, string[]> = {
  NEW_FAN_FAVORITE: [
    '{player} emerges as the heart and soul of {team}',
    '{team} fans rally behind {player} — the ultimate bargain at {pct}% over value',
    'Fan Favorite alert: {player} is stealing hearts (and wins) in {team}',
  ],
  FAN_FAVORITE_TRADED: [
    'Heartbreak in {team}: Beloved {player} traded away',
    '{team} fans in uproar after Fan Favorite {player} dealt',
    'Front office under fire: {player} trade stuns {team} fanbase',
  ],
  ALBATROSS_EMERGES: [
    '{player}\'s massive contract weighs down {team}',
    'Buyer\'s remorse: {team}\'s {player} deal looking bleak',
    '{team} stuck with underperforming {player} — {pct}% under value',
  ],
  ALBATROSS_TRADED: [
    '{team} finally unloads {player}\'s contract — fans rejoice',
    'Freedom! {team} trades away Albatross {player}',
    '{team} finds a taker for {player} — relief in the stands',
  ],
};

/**
 * GAP-B4-019: Generate Fan Favorite/Albatross headline
 */
export function generateHeadline(
  category: HeadlineCategory,
  player: string,
  team: string,
  pct?: number
): string {
  const templates = HEADLINE_TEMPLATES[category];
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template
    .replace('{player}', player)
    .replace('{team}', team)
    .replace('{pct}', pct != null ? Math.abs(Math.round(pct)).toString() : '');
}

// ============================================
// UI DISPLAY (GAP-B4-022, GAP-B4-023)
// ============================================

export type ValueDeltaColor = 'green-bright' | 'green' | 'gray' | 'orange' | 'red';

/**
 * GAP-B4-022: Get color for value delta display
 */
export function getValueDeltaColor(valueDelta: number, contractValue: number): ValueDeltaColor {
  if (contractValue <= 0) return 'gray';
  const pct = (valueDelta / contractValue) * 100;
  if (pct >= 100) return 'green-bright';
  if (pct >= 25) return 'green';
  if (pct >= -25) return 'gray';
  if (pct >= -50) return 'orange';
  return 'red';
}

/**
 * GAP-B4-022: Map ValueDeltaColor to hex color
 */
export function getValueDeltaHex(color: ValueDeltaColor): string {
  const map: Record<ValueDeltaColor, string> = {
    'green-bright': '#22c55e',
    'green': '#4ade80',
    'gray': '#9ca3af',
    'orange': '#f97316',
    'red': '#ef4444',
  };
  return map[color];
}

/**
 * GAP-B4-023: Get designation badge display
 */
export function getDesignationBadge(
  designation: 'FAN_FAVORITE' | 'ALBATROSS',
  status: 'projected' | 'locked'
): { emoji: string; label: string; borderStyle: string } {
  if (designation === 'FAN_FAVORITE') {
    return {
      emoji: '⭐',
      label: 'FAN FAV',
      borderStyle: status === 'locked' ? 'solid' : 'dashed',
    };
  }
  return {
    emoji: '💀',
    label: 'ALBATROSS',
    borderStyle: status === 'locked' ? 'solid' : 'dashed',
  };
}

// ============================================
// SEASON END PROCESSING (GAP-B4-021, GAP-B4-024)
// ============================================

/**
 * GAP-B4-021: Process end-of-season Fan Favorite/Albatross
 * Locks designations, awards Fame, records in player history
 */
export function processEndOfSeason(
  players: PlayerSeasonData[],
  context: LeagueContext
): EndOfSeasonResult {
  // Lock designations
  const lockedContext = { ...context, seasonProgress: 1.0 };
  const { fanFavorite, albatross } = detectDesignations(players, lockedContext);

  const fameEvents: FameEventOutput[] = [];
  const happinessEffects: HappinessEffect[] = [];

  // Award Fame
  if (fanFavorite) {
    fanFavorite.status = 'locked';
    fameEvents.push({
      type: 'FAN_FAVORITE_NAMED',
      playerId: fanFavorite.playerId,
      fameValue: 2.0,
    });
    happinessEffects.push({
      type: 'FF_SEASON_END',
      value: 2.0,
      description: `${fanFavorite.playerName} named Fan Favorite of the season`,
    });
  }

  if (albatross) {
    albatross.status = 'locked';
    fameEvents.push({
      type: 'ALBATROSS_NAMED',
      playerId: albatross.playerId,
      fameValue: -1.0,
    });
    happinessEffects.push({
      type: 'ALB_SEASON_END',
      value: -1.0,
      description: `${albatross.playerName} branded as team Albatross`,
    });
  }

  return { fanFavorite, albatross, fameEvents, happinessEffects };
}

/**
 * GAP-B4-024: Check if designations should carry over from previous season
 * Designations persist until 10% of new season
 */
export function shouldCarryOverDesignations(
  newSeasonGamesPlayed: number,
  newSeasonTotalGames: number
): boolean {
  if (newSeasonTotalGames <= 0) return false;
  return (newSeasonGamesPlayed / newSeasonTotalGames) < CARRYOVER_THRESHOLD;
}

export interface CarryoverDesignation {
  playerId: string;
  playerName: string;
  designation: 'FAN_FAVORITE' | 'ALBATROSS';
  previousSeasonId: string;
  previousTeamId: string;
  valueDelta: number;
}

/**
 * GAP-B4-024: Create carryover record for season transition
 */
export function createCarryoverRecord(
  candidate: FanFavoriteCandidate | AlbatrossCandidate,
  seasonId: string,
  teamId: string
): CarryoverDesignation {
  return {
    playerId: candidate.playerId,
    playerName: candidate.playerName,
    designation: candidate.designation,
    previousSeasonId: seasonId,
    previousTeamId: teamId,
    valueDelta: candidate.valueDelta,
  };
}
