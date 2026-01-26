/**
 * Fan Morale Engine - Dynamic Fan Sentiment System
 *
 * Tracks fan morale as a 0-99 scale with 7 states, driven by:
 * - Game results (wins, losses, walk-offs, no-hitters)
 * - Streaks (winning/losing)
 * - Trades (acquisitions, salary dumps)
 * - Roster moves (call-ups, injuries)
 * - Milestones and achievements
 * - Performance vs expectations
 *
 * Key Features:
 * - Trade scrutiny system (14-game post-trade tracking)
 * - Contextual modifiers (timing, recent history, performance)
 * - Natural drift toward baseline
 * - Integration with Expected Wins calculations
 *
 * @see FAN_MORALE_SYSTEM_SPEC.md
 */

// ============================================
// TYPES
// ============================================

export type FanState =
  | 'EUPHORIC'      // 90-99: Championship fever
  | 'EXCITED'       // 75-89: Playoff buzz
  | 'CONTENT'       // 55-74: Satisfied fanbase
  | 'RESTLESS'      // 40-54: Growing impatient
  | 'FRUSTRATED'    // 25-39: Angry but loyal
  | 'APATHETIC'     // 10-24: Checked out
  | 'HOSTILE';      // 0-9:  Demanding change

export type MoraleTrend = 'RISING' | 'STABLE' | 'FALLING';

export type RiskLevel = 'SAFE' | 'WATCH' | 'DANGER' | 'CRITICAL';

export interface GameDate {
  season: number;
  game: number;
  date?: string;
}

export interface FanMorale {
  current: number;           // 0-99 scale
  previous: number;          // Last recorded value (for trend)
  trend: MoraleTrend;
  trendStreak: number;       // Consecutive changes in same direction
  lastUpdated: GameDate;
  lastEvent: MoraleEvent | null;

  // Computed states
  state: FanState;
  riskLevel: RiskLevel;

  // History tracking
  seasonHigh: number;
  seasonLow: number;
  eventHistory: MoraleEvent[];

  // Active tracking
  activeTradeAftermaths: TradeAftermath[];
  activeProspectSpotlights: ProspectSpotlight[];
}

export type MoraleEventType =
  // Game events
  | 'WIN' | 'LOSS' | 'WALK_OFF_WIN' | 'WALK_OFF_LOSS'
  | 'NO_HITTER' | 'GOT_NO_HIT' | 'SHUTOUT_WIN' | 'SHUTOUT_LOSS'
  // Streak events
  | 'WIN_STREAK_3' | 'WIN_STREAK_5' | 'WIN_STREAK_7'
  | 'LOSE_STREAK_3' | 'LOSE_STREAK_5' | 'LOSE_STREAK_7'
  | 'WIN_STREAK_BROKEN' | 'LOSE_STREAK_BROKEN'
  // Trade events
  | 'TRADE_ACQUIRE_STAR' | 'TRADE_LOSE_STAR'
  | 'TRADE_SALARY_DUMP' | 'TRADE_DEPTH'
  // Roster events
  | 'CALL_UP_TOP_PROSPECT' | 'CALL_UP_REGULAR'
  | 'STAR_TO_IL' | 'STAR_RETURNS' | 'PLAYER_DFA'
  // Milestone events
  | 'PLAYER_MILESTONE' | 'WEEKLY_AWARD' | 'ALL_STAR_SELECTION'
  | 'LEAD_DIVISION' | 'CLINCH_PLAYOFF' | 'CLINCH_DIVISION' | 'ELIMINATED'
  // Season events
  | 'OPENING_DAY' | 'ALL_STAR_BREAK' | 'RIVALRY_SWEEP' | 'SWEPT_BY_RIVAL'
  // System events
  | 'EXPECTED_WINS_UPDATE' | 'NATURAL_DRIFT' | 'SEASON_ASSESSMENT';

export interface MoraleModifier {
  type: string;
  value: number;
  reason: string;
}

export interface MoraleEvent {
  id: string;
  type: MoraleEventType;
  timestamp: GameDate;
  baseImpact: number;
  modifiers: MoraleModifier[];
  finalImpact: number;
  previousMorale: number;
  newMorale: number;
  narrative: string;
  relatedEntities: {
    playerId?: string;
    tradeId?: string;
    gameId?: string;
  };
}

export interface MoraleUpdate {
  previousMorale: number;
  newMorale: number;
  change: number;
  event: MoraleEvent;
  trend: MoraleTrend;
  narrative: string;
}

export type PerformanceClass =
  | 'VASTLY_EXCEEDING'   // 10+ games better
  | 'EXCEEDING'          // 5-9 games better
  | 'SLIGHTLY_ABOVE'     // 1-4 games better
  | 'MEETING'            // Within 1 game
  | 'SLIGHTLY_BELOW'     // 1-4 games worse
  | 'UNDERPERFORMING'    // 5-9 games worse
  | 'VASTLY_UNDER';      // 10+ games worse

export interface PerformanceContext {
  expectedWinPct: number;
  actualWinPct: number;
  differential: number;      // Games above/below expected
  classification: PerformanceClass;
}

export interface SeasonContext {
  gamesPlayed: number;
  totalGames: number;
  month: number;             // 1-12
  inPlayoffRace: boolean;
  eliminated: boolean;
  isTradeDeadlineWeek: boolean;
  divisionRank: number;
}

export type ExpectedWinsTrigger =
  | 'SEASON_START'
  | 'TRADE'
  | 'CALL_UP'
  | 'SEND_DOWN'
  | 'INJURY'
  | 'INJURY_RETURN'
  | 'ALL_STAR_BREAK'
  | 'TRADE_DEADLINE';

export interface ExpectedWins {
  preseason: number;
  current: number;
  gamesPlayed: number;
  actualWins: number;
  remainingExpected: number;
  pace: 'EXCEEDING' | 'MEETING' | 'BELOW';
  differential: number;
}

export type FanReactionType =
  | 'OPTIMISTIC'
  | 'SUSPICIOUS'
  | 'WAIT_AND_SEE'
  | 'HOPEFUL'
  | 'CONCERNED'
  | 'NEUTRAL';

export interface FanReaction {
  type: FanReactionType;
  message: string;
  moraleImpact: number;
}

export interface ExpectedWinsUpdate {
  previousExpected: number;
  newExpected: number;
  change: number;
  trigger: ExpectedWinsTrigger;
  projectedFinal: number;
  fanReaction: FanReaction;
}

export type FanVerdict =
  | 'TOO_EARLY'
  | 'LOOKING_GOOD'
  | 'JURY_OUT'
  | 'LOOKING_BAD'
  | 'DISASTER';

export interface TradeAftermath {
  tradeId: string;
  completedAt: GameDate;
  expectedWinsChange: number;
  salarySent: number;
  salaryReceived: number;

  // Tracking period (14 games after trade)
  scrutinyPeriod: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    runDifferential: number;
  };

  // Acquired player performance
  acquiredPlayers: AcquiredPlayerTracking[];

  // Fan verdict (evolves over scrutiny period)
  fanVerdict: FanVerdict;
}

export interface AcquiredPlayerTracking {
  playerId: string;
  playerName: string;
  gamesPlayed: number;
  warContributed: number;
  keyMoments: string[];
}

export interface ProspectSpotlight {
  playerId: string;
  playerName: string;
  callUpDate: GameDate;
  gamesPlayed: number;
  keyMoments: string[];
  fanExcitement: number;  // 0-100
}

export interface GameResult {
  gameId: string;
  won: boolean;
  isWalkOff: boolean;
  isNoHitter: boolean;
  isShutout: boolean;
  isBlowout: boolean;
  vsRival: boolean;
  runDifferential: number;
  playerPerformances: PlayerGamePerformance[];
}

export interface PlayerGamePerformance {
  playerId: string;
  gameWAR: number;
  keyMoment?: string;
}

// ============================================
// CONSTANTS
// ============================================

export const FAN_STATE_THRESHOLDS: Record<FanState, [number, number]> = {
  EUPHORIC: [90, 99],
  EXCITED: [75, 89],
  CONTENT: [55, 74],
  RESTLESS: [40, 54],
  FRUSTRATED: [25, 39],
  APATHETIC: [10, 24],
  HOSTILE: [0, 9],
};

export const FAN_STATE_CONFIG: Record<FanState, {
  emoji: string;
  color: string;
  label: string;
  description: string;
}> = {
  EUPHORIC: {
    emoji: '🤩',
    color: '#00FF00',
    label: 'Championship Fever',
    description: 'Fans are ALL IN. Merchandise flying off shelves.',
  },
  EXCITED: {
    emoji: '😊',
    color: '#7FFF00',
    label: 'Playoff Buzz',
    description: 'Strong engagement. Fans showing up and loud.',
  },
  CONTENT: {
    emoji: '🙂',
    color: '#FFFF00',
    label: 'Satisfied',
    description: 'Fans are engaged but not emotionally invested.',
  },
  RESTLESS: {
    emoji: '😐',
    color: '#FFA500',
    label: 'Growing Impatient',
    description: 'Attendance dipping. Murmurs about management.',
  },
  FRUSTRATED: {
    emoji: '😤',
    color: '#FF4500',
    label: 'Frustrated',
    description: 'Boos heard. Trade demands. Media criticism.',
  },
  APATHETIC: {
    emoji: '😑',
    color: '#FF0000',
    label: 'Checked Out',
    description: 'Empty seats. Fans stopped caring.',
  },
  HOSTILE: {
    emoji: '😡',
    color: '#8B0000',
    label: 'Hostile',
    description: 'Protests. Ownership under fire. Contraction risk.',
  },
};

/**
 * Base morale impacts for events
 */
export const BASE_MORALE_IMPACTS: Partial<Record<MoraleEventType, number>> = {
  // Game results
  WIN: 1,
  LOSS: -1,
  WALK_OFF_WIN: 3,
  WALK_OFF_LOSS: -3,
  NO_HITTER: 5,
  GOT_NO_HIT: -4,
  SHUTOUT_WIN: 2,
  SHUTOUT_LOSS: -2,

  // Streaks
  WIN_STREAK_3: 2,
  WIN_STREAK_5: 5,
  WIN_STREAK_7: 8,
  LOSE_STREAK_3: -2,
  LOSE_STREAK_5: -5,
  LOSE_STREAK_7: -10,
  WIN_STREAK_BROKEN: -3,
  LOSE_STREAK_BROKEN: 4,

  // Trades
  TRADE_ACQUIRE_STAR: 8,
  TRADE_LOSE_STAR: -10,
  TRADE_SALARY_DUMP: -8,
  TRADE_DEPTH: 1,

  // Roster moves
  CALL_UP_TOP_PROSPECT: 5,
  CALL_UP_REGULAR: 2,
  STAR_TO_IL: -5,
  STAR_RETURNS: 5,
  PLAYER_DFA: -2,

  // Milestones
  PLAYER_MILESTONE: 4,
  WEEKLY_AWARD: 2,
  ALL_STAR_SELECTION: 3,
  LEAD_DIVISION: 5,
  CLINCH_PLAYOFF: 15,
  CLINCH_DIVISION: 20,
  ELIMINATED: -15,

  // Season events
  OPENING_DAY: 10,
  ALL_STAR_BREAK: 0,  // Depends on record
  RIVALRY_SWEEP: 8,
  SWEPT_BY_RIVAL: -8,

  // System
  EXPECTED_WINS_UPDATE: 0,  // Calculated dynamically
  NATURAL_DRIFT: 0,         // Calculated dynamically
  SEASON_ASSESSMENT: 0,     // Calculated dynamically
};

/**
 * Configuration constants
 */
export const FAN_MORALE_CONFIG = {
  // Drift settings
  driftFrequency: 3,      // Every N games
  driftAmount: 1,
  baselineRange: 5,       // How far from baseline before drift kicks in

  // Momentum settings
  maxMomentumBonus: 0.5,  // 50% max amplification
  momentumPerStreak: 0.1, // 10% per consecutive change

  // Trade scrutiny
  tradeScrutinyGames: 14,

  // Blowout threshold
  blowoutRunDifferential: 7,

  // Rival multiplier
  rivalMultiplier: 1.5,

  // Walk-off multiplier
  walkOffMultiplier: 3,

  // Playoff race month threshold
  playoffRaceMonth: 8,  // August onwards

  // Trade deadline week (games before deadline)
  tradeDeadlineWindow: 7,
};

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get fan state from morale value
 */
export function getFanState(morale: number): FanState {
  if (morale >= 90) return 'EUPHORIC';
  if (morale >= 75) return 'EXCITED';
  if (morale >= 55) return 'CONTENT';
  if (morale >= 40) return 'RESTLESS';
  if (morale >= 25) return 'FRUSTRATED';
  if (morale >= 10) return 'APATHETIC';
  return 'HOSTILE';
}

/**
 * Get risk level from morale
 */
export function getRiskLevel(morale: number): RiskLevel {
  if (morale >= 40) return 'SAFE';
  if (morale >= 25) return 'WATCH';
  if (morale >= 10) return 'DANGER';
  return 'CRITICAL';
}

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Initialize fan morale for a new team/season
 */
export function initializeFanMorale(
  initialMorale: number = 50,
  gameDate: GameDate = { season: 1, game: 0 }
): FanMorale {
  const morale = clamp(initialMorale, 0, 99);
  return {
    current: morale,
    previous: morale,
    trend: 'STABLE',
    trendStreak: 0,
    lastUpdated: gameDate,
    lastEvent: null,
    state: getFanState(morale),
    riskLevel: getRiskLevel(morale),
    seasonHigh: morale,
    seasonLow: morale,
    eventHistory: [],
    activeTradeAftermaths: [],
    activeProspectSpotlights: [],
  };
}

// ============================================
// PERFORMANCE CONTEXT
// ============================================

/**
 * Classify team performance relative to expectations
 */
export function classifyPerformance(differential: number): PerformanceClass {
  if (differential >= 10) return 'VASTLY_EXCEEDING';
  if (differential >= 5) return 'EXCEEDING';
  if (differential >= 1) return 'SLIGHTLY_ABOVE';
  if (differential >= -1) return 'MEETING';
  if (differential >= -4) return 'SLIGHTLY_BELOW';
  if (differential >= -9) return 'UNDERPERFORMING';
  return 'VASTLY_UNDER';
}

/**
 * Get performance multiplier for morale events
 */
export function getPerformanceMultiplier(
  classification: PerformanceClass,
  eventImpact: number
): number {
  // Positive events amplified when exceeding expectations
  if (eventImpact > 0) {
    switch (classification) {
      case 'VASTLY_EXCEEDING': return 1.5;  // "This team is magic!"
      case 'EXCEEDING': return 1.3;
      case 'SLIGHTLY_ABOVE': return 1.1;
      case 'MEETING': return 1.0;
      case 'SLIGHTLY_BELOW': return 0.9;
      case 'UNDERPERFORMING': return 0.7;   // "Finally something good"
      case 'VASTLY_UNDER': return 0.5;      // "Too little too late"
    }
  }

  // Negative events amplified when underperforming
  if (eventImpact < 0) {
    switch (classification) {
      case 'VASTLY_EXCEEDING': return 0.5;  // "Can't win em all"
      case 'EXCEEDING': return 0.7;
      case 'SLIGHTLY_ABOVE': return 0.9;
      case 'MEETING': return 1.0;
      case 'SLIGHTLY_BELOW': return 1.1;
      case 'UNDERPERFORMING': return 1.3;   // "Here we go again"
      case 'VASTLY_UNDER': return 1.5;      // "Of course"
    }
  }

  return 1.0;
}

/**
 * Get timing multiplier based on season context
 */
export function getTimingMultiplier(seasonContext: SeasonContext): number {
  // Playoff race intensifies everything
  if (seasonContext.inPlayoffRace && seasonContext.month >= FAN_MORALE_CONFIG.playoffRaceMonth) {
    return 1.5;  // September games matter more
  }

  // Already eliminated = fans checked out
  if (seasonContext.eliminated) {
    return 0.5;  // Less emotional investment
  }

  // Early season optimism
  if (seasonContext.gamesPlayed < 20) {
    return 0.8;  // "It's early"
  }

  // Trade deadline buzz
  if (seasonContext.isTradeDeadlineWeek) {
    return 1.3;  // Extra attention on roster moves
  }

  return 1.0;
}

/**
 * Calculate days since a game date (in game numbers)
 */
function gamesSince(current: GameDate, past: GameDate): number {
  if (current.season !== past.season) {
    return 999;  // Different season, treat as long ago
  }
  return current.game - past.game;
}

/**
 * Get history modifier based on recent events
 */
export function getHistoryModifier(
  event: { type: MoraleEventType; playerId?: string },
  recentHistory: MoraleEvent[],
  currentDate: GameDate
): number {
  // Post-trade scrutiny period
  const recentTrade = recentHistory.find(
    e => (e.type === 'TRADE_ACQUIRE_STAR' || e.type === 'TRADE_SALARY_DUMP') &&
         gamesSince(currentDate, e.timestamp) < 14
  );

  if (recentTrade) {
    // First few games after trade are CRUCIAL
    if (event.type === 'WIN') {
      return 1.5;  // "Trade already paying off!"
    }
    if (event.type === 'LOSS') {
      return 1.5;  // "Knew that trade was bad!"
    }
  }

  // Post-call-up spotlight
  const recentCallUp = recentHistory.find(
    e => e.type === 'CALL_UP_TOP_PROSPECT' &&
         gamesSince(currentDate, e.timestamp) < 7
  );

  if (recentCallUp && event.type === 'PLAYER_MILESTONE') {
    if (event.playerId && event.playerId === recentCallUp.relatedEntities.playerId) {
      return 2.0;  // "Called it! This kid is special!"
    }
  }

  // Diminishing returns on repeated events
  const similarEvents = recentHistory.filter(
    e => e.type === event.type && gamesSince(currentDate, e.timestamp) < 7
  );

  if (similarEvents.length > 2) {
    return 0.7;  // "Yeah yeah, another one"
  }

  return 1.0;
}

// ============================================
// EXPECTED WINS SYSTEM
// ============================================

/**
 * Calculate expected wins based on team True Value
 * @param totalTrueValue Sum of all roster True Values
 * @param leagueAvgTrueValue League average True Value per team
 * @param totalGames Total games in season
 */
export function calculateExpectedWins(
  totalTrueValue: number,
  leagueAvgTrueValue: number,
  totalGames: number = 162
): number {
  // Baseline is 50% win rate
  const baselineWins = totalGames / 2;

  // Each point above/below average = ~0.5 wins (scaled for season length)
  const scaleFactor = totalGames / 162;
  const winAdjustment = (totalTrueValue - leagueAvgTrueValue) * 0.5 * scaleFactor;

  return Math.round(baselineWins + winAdjustment);
}

/**
 * Determine fan reaction to expected wins change
 */
export function determineFanReaction(
  oldExpected: number,
  newExpected: number,
  trigger: ExpectedWinsTrigger
): FanReaction {
  const change = newExpected - oldExpected;

  if (trigger === 'TRADE') {
    if (change > 0) {
      return {
        type: 'OPTIMISTIC',
        message: 'Fans excited about trade improving team',
        moraleImpact: change * 2,  // Trades get amplified reaction
      };
    } else if (change < -3) {
      return {
        type: 'SUSPICIOUS',
        message: 'Fans questioning front office commitment',
        moraleImpact: change * 3,  // Salary dumps hit harder
      };
    } else {
      return {
        type: 'WAIT_AND_SEE',
        message: 'Fans reserving judgment on trade',
        moraleImpact: 0,
      };
    }
  }

  if (trigger === 'CALL_UP') {
    return {
      type: 'HOPEFUL',
      message: 'Fans excited to see prospect debut',
      moraleImpact: Math.max(change * 1.5, 2),  // Always some optimism
    };
  }

  if (trigger === 'INJURY') {
    return {
      type: 'CONCERNED',
      message: 'Fans worried about season outlook',
      moraleImpact: change * 1.5,
    };
  }

  if (trigger === 'INJURY_RETURN') {
    return {
      type: 'HOPEFUL',
      message: 'Key player back in action',
      moraleImpact: Math.max(change * 1.5, 3),
    };
  }

  // Default
  return {
    type: 'NEUTRAL',
    message: 'Projections updated',
    moraleImpact: change,
  };
}

// ============================================
// TRADE SCRUTINY SYSTEM
// ============================================

/**
 * Start tracking a trade aftermath
 */
export function startTradeAftermath(
  tradeId: string,
  completedAt: GameDate,
  expectedWinsChange: number,
  salarySent: number,
  salaryReceived: number,
  acquiredPlayers: Array<{ playerId: string; playerName: string }>
): TradeAftermath {
  return {
    tradeId,
    completedAt,
    expectedWinsChange,
    salarySent,
    salaryReceived,
    scrutinyPeriod: {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      runDifferential: 0,
    },
    acquiredPlayers: acquiredPlayers.map(p => ({
      playerId: p.playerId,
      playerName: p.playerName,
      gamesPlayed: 0,
      warContributed: 0,
      keyMoments: [],
    })),
    fanVerdict: 'TOO_EARLY',
  };
}

/**
 * Update trade aftermath after a game
 */
export function updateTradeAftermath(
  aftermath: TradeAftermath,
  gameResult: GameResult
): TradeAftermath {
  const updated = { ...aftermath };
  updated.scrutinyPeriod = { ...aftermath.scrutinyPeriod };
  updated.scrutinyPeriod.gamesPlayed++;

  if (gameResult.won) {
    updated.scrutinyPeriod.wins++;
  } else {
    updated.scrutinyPeriod.losses++;
  }
  updated.scrutinyPeriod.runDifferential += gameResult.runDifferential;

  // Track acquired player contributions
  updated.acquiredPlayers = aftermath.acquiredPlayers.map(acquired => {
    const playerGame = gameResult.playerPerformances.find(
      p => p.playerId === acquired.playerId
    );
    if (playerGame) {
      return {
        ...acquired,
        gamesPlayed: acquired.gamesPlayed + 1,
        warContributed: acquired.warContributed + playerGame.gameWAR,
        keyMoments: playerGame.keyMoment
          ? [...acquired.keyMoments, playerGame.keyMoment]
          : acquired.keyMoments,
      };
    }
    return acquired;
  });

  // Update fan verdict
  updated.fanVerdict = calculateFanVerdict(updated);

  return updated;
}

/**
 * Calculate fan verdict on trade
 */
export function calculateFanVerdict(aftermath: TradeAftermath): FanVerdict {
  const { scrutinyPeriod, expectedWinsChange, acquiredPlayers } = aftermath;

  if (scrutinyPeriod.gamesPlayed < 5) {
    return 'TOO_EARLY';
  }

  const winPct = scrutinyPeriod.wins / scrutinyPeriod.gamesPlayed;
  const acquiredContributions = acquiredPlayers.reduce(
    (sum, p) => sum + p.keyMoments.length, 0
  );

  // Salary dump trades get harsher judgment
  const wasSalaryDump = expectedWinsChange < -3;

  if (wasSalaryDump) {
    // Fans were already suspicious
    if (winPct >= 0.6 && acquiredContributions > 0) {
      return 'LOOKING_GOOD';  // "Maybe they knew something"
    } else if (winPct < 0.4) {
      return 'DISASTER';  // "We knew it, they gave up on us"
    } else {
      return 'JURY_OUT';
    }
  } else {
    // Normal trade
    if (winPct >= 0.6) {
      return 'LOOKING_GOOD';
    } else if (winPct >= 0.4) {
      return 'JURY_OUT';
    } else if (acquiredContributions > 2) {
      return 'JURY_OUT';  // New guys producing but still losing
    } else {
      return 'LOOKING_BAD';
    }
  }
}

/**
 * Get morale impact modifier for post-trade games
 */
export function getPostTradeGameImpact(
  aftermath: TradeAftermath,
  gameWon: boolean,
  baseImpact: number
): number {
  // First game after trade
  if (aftermath.scrutinyPeriod.gamesPlayed === 1) {
    return baseImpact * 2;  // "Great start to new era!" or "Ugh, not a good sign"
  }

  // During scrutiny period (first 14 games)
  if (aftermath.scrutinyPeriod.gamesPlayed <= FAN_MORALE_CONFIG.tradeScrutinyGames) {
    switch (aftermath.fanVerdict) {
      case 'LOOKING_GOOD':
        // Wins amplified, losses dampened
        return gameWon ? baseImpact * 1.5 : baseImpact * 0.7;

      case 'LOOKING_BAD':
      case 'DISASTER':
        // Losses amplified, wins dampened
        return gameWon ? baseImpact * 0.7 : baseImpact * 1.5;

      default:
        return baseImpact * 1.2;  // Everything slightly amplified
    }
  }

  return baseImpact;
}

// ============================================
// MORALE DRIFT & MOMENTUM
// ============================================

/**
 * Calculate morale baseline based on team performance
 */
export function calculateMoraleBaseline(
  expectedWinsDifferential: number,
  divisionRank: number
): number {
  const performanceFactor = expectedWinsDifferential * 2;

  // Standings bonus: 1st = +10, 2nd = +5, 3rd = 0, 4th = -5, 5th = -10
  const standingsFactor = (3 - divisionRank) * 5;

  // Baseline is 50 (neutral) modified by factors
  return clamp(50 + performanceFactor + standingsFactor, 20, 80);
}

/**
 * Calculate natural morale drift toward baseline
 */
export function calculateMoraleDrift(
  currentMorale: number,
  baseline: number
): number {
  const { driftAmount, baselineRange } = FAN_MORALE_CONFIG;

  if (currentMorale > baseline + baselineRange) {
    return -driftAmount;  // Slowly come down from highs
  } else if (currentMorale < baseline - baselineRange) {
    return driftAmount;   // Slowly recover from lows
  }

  return 0;
}

/**
 * Apply momentum to morale change
 */
export function applyMomentum(
  currentTrend: MoraleTrend,
  consecutiveChanges: number,
  newChange: number
): number {
  const { maxMomentumBonus, momentumPerStreak } = FAN_MORALE_CONFIG;

  // If change continues the trend, it's amplified
  if (currentTrend === 'RISING' && newChange > 0) {
    const bonus = Math.min(consecutiveChanges * momentumPerStreak, maxMomentumBonus);
    return newChange * (1 + bonus);
  }

  if (currentTrend === 'FALLING' && newChange < 0) {
    const bonus = Math.min(consecutiveChanges * momentumPerStreak, maxMomentumBonus);
    return newChange * (1 + bonus);  // Makes negative more negative
  }

  // Breaking a trend has its own impact
  if (currentTrend === 'RISING' && newChange < 0 && consecutiveChanges > 3) {
    return newChange * 1.3;  // "Bubble burst"
  }

  if (currentTrend === 'FALLING' && newChange > 0 && consecutiveChanges > 3) {
    return newChange * 1.5;  // "Finally turning around!"
  }

  return newChange;
}

/**
 * Calculate new trend based on morale change
 */
export function calculateTrend(
  oldMorale: number,
  newMorale: number,
  previousTrend: MoraleTrend,
  previousStreak: number
): { trend: MoraleTrend; streak: number } {
  const change = newMorale - oldMorale;

  if (change > 0) {
    if (previousTrend === 'RISING') {
      return { trend: 'RISING', streak: previousStreak + 1 };
    }
    return { trend: 'RISING', streak: 1 };
  }

  if (change < 0) {
    if (previousTrend === 'FALLING') {
      return { trend: 'FALLING', streak: previousStreak + 1 };
    }
    return { trend: 'FALLING', streak: 1 };
  }

  // No change
  if (previousStreak > 2) {
    return { trend: previousTrend, streak: previousStreak };  // Maintain momentum
  }
  return { trend: 'STABLE', streak: 0 };
}

// ============================================
// EVENT PROCESSING
// ============================================

/**
 * Create a morale event from game result
 */
export function createGameMoraleEvent(
  gameResult: GameResult,
  timestamp: GameDate,
  vsRivalName?: string
): MoraleEvent {
  let type: MoraleEventType;
  let baseImpact: number;
  const modifiers: MoraleModifier[] = [];

  // Determine base event type
  if (gameResult.isNoHitter && gameResult.won) {
    type = 'NO_HITTER';
    baseImpact = BASE_MORALE_IMPACTS.NO_HITTER!;
  } else if (gameResult.isNoHitter && !gameResult.won) {
    type = 'GOT_NO_HIT';
    baseImpact = BASE_MORALE_IMPACTS.GOT_NO_HIT!;
  } else if (gameResult.isWalkOff && gameResult.won) {
    type = 'WALK_OFF_WIN';
    baseImpact = BASE_MORALE_IMPACTS.WALK_OFF_WIN!;
  } else if (gameResult.isWalkOff && !gameResult.won) {
    type = 'WALK_OFF_LOSS';
    baseImpact = BASE_MORALE_IMPACTS.WALK_OFF_LOSS!;
  } else if (gameResult.isShutout && gameResult.won) {
    type = 'SHUTOUT_WIN';
    baseImpact = BASE_MORALE_IMPACTS.SHUTOUT_WIN!;
  } else if (gameResult.isShutout && !gameResult.won) {
    type = 'SHUTOUT_LOSS';
    baseImpact = BASE_MORALE_IMPACTS.SHUTOUT_LOSS!;
  } else if (gameResult.won) {
    type = 'WIN';
    baseImpact = BASE_MORALE_IMPACTS.WIN!;
  } else {
    type = 'LOSS';
    baseImpact = BASE_MORALE_IMPACTS.LOSS!;
  }

  // Apply modifiers
  if (gameResult.vsRival) {
    modifiers.push({
      type: 'RIVAL',
      value: baseImpact > 0 ? 1 : -1,
      reason: `vs ${vsRivalName || 'rival'}`,
    });
  }

  if (gameResult.isBlowout) {
    modifiers.push({
      type: 'BLOWOUT',
      value: baseImpact > 0 ? 1 : -1,
      reason: 'Blowout game',
    });
  }

  const finalImpact = baseImpact + modifiers.reduce((sum, m) => sum + m.value, 0);

  return {
    id: generateEventId(),
    type,
    timestamp,
    baseImpact,
    modifiers,
    finalImpact,
    previousMorale: 0,  // Will be set during processing
    newMorale: 0,       // Will be set during processing
    narrative: generateEventNarrative(type, finalImpact, modifiers),
    relatedEntities: {
      gameId: gameResult.gameId,
    },
  };
}

/**
 * Generate simple narrative for event
 */
function generateEventNarrative(
  type: MoraleEventType,
  impact: number,
  modifiers: MoraleModifier[]
): string {
  const direction = impact > 0 ? 'up' : 'down';
  const rivalMod = modifiers.find(m => m.type === 'RIVAL');

  switch (type) {
    case 'WIN':
      return rivalMod ? `Fans fired up after rivalry win` : `Another win in the books`;
    case 'LOSS':
      return rivalMod ? `Tough loss to rivals stings` : `Fans disappointed by loss`;
    case 'WALK_OFF_WIN':
      return `Walk-off sends fans into frenzy!`;
    case 'WALK_OFF_LOSS':
      return `Heartbreaking walk-off loss`;
    case 'NO_HITTER':
      return `Historic no-hitter electrifies fanbase!`;
    case 'GOT_NO_HIT':
      return `Embarrassing no-hitter dampens spirits`;
    case 'WIN_STREAK_5':
      return `Five straight! Fans getting excited`;
    case 'WIN_STREAK_7':
      return `Seven-game streak! Bandwagon filling up`;
    case 'LOSE_STREAK_5':
      return `Five straight losses. Fans getting restless`;
    case 'LOSE_STREAK_7':
      return `Seven-game skid. Crisis mode`;
    case 'TRADE_ACQUIRE_STAR':
      return `Blockbuster acquisition excites fanbase`;
    case 'TRADE_SALARY_DUMP':
      return `Salary dump raises questions about commitment`;
    case 'CLINCH_PLAYOFF':
      return `Playoff berth clinched! Championship fever begins`;
    case 'ELIMINATED':
      return `Season over. Fans checking out`;
    default:
      return `Fan morale ${direction} ${Math.abs(impact)} points`;
  }
}

/**
 * Process a morale event and update fan morale
 */
export function processMoraleEvent(
  fanMorale: FanMorale,
  event: MoraleEvent,
  performanceContext?: PerformanceContext,
  seasonContext?: SeasonContext
): { updatedMorale: FanMorale; update: MoraleUpdate } {
  let impact = event.finalImpact;

  // Apply performance multiplier
  if (performanceContext) {
    impact *= getPerformanceMultiplier(performanceContext.classification, impact);
  }

  // Apply timing multiplier
  if (seasonContext) {
    impact *= getTimingMultiplier(seasonContext);
  }

  // Apply history modifier
  impact *= getHistoryModifier(
    { type: event.type, playerId: event.relatedEntities.playerId },
    fanMorale.eventHistory.slice(-20),  // Last 20 events
    event.timestamp
  );

  // Apply momentum
  impact = applyMomentum(fanMorale.trend, fanMorale.trendStreak, impact);

  // Calculate new morale
  const oldMorale = fanMorale.current;
  const newMorale = clamp(Math.round(oldMorale + impact), 0, 99);

  // Calculate new trend
  const { trend, streak } = calculateTrend(
    oldMorale,
    newMorale,
    fanMorale.trend,
    fanMorale.trendStreak
  );

  // Create processed event with actual values
  const processedEvent: MoraleEvent = {
    ...event,
    finalImpact: Math.round(impact),
    previousMorale: oldMorale,
    newMorale,
  };

  // Update fan morale
  const updatedMorale: FanMorale = {
    ...fanMorale,
    current: newMorale,
    previous: oldMorale,
    trend,
    trendStreak: streak,
    lastUpdated: event.timestamp,
    lastEvent: processedEvent,
    state: getFanState(newMorale),
    riskLevel: getRiskLevel(newMorale),
    seasonHigh: Math.max(fanMorale.seasonHigh, newMorale),
    seasonLow: Math.min(fanMorale.seasonLow, newMorale),
    eventHistory: [...fanMorale.eventHistory, processedEvent].slice(-100),  // Keep last 100
  };

  const update: MoraleUpdate = {
    previousMorale: oldMorale,
    newMorale,
    change: Math.round(impact),
    event: processedEvent,
    trend,
    narrative: processedEvent.narrative,
  };

  return { updatedMorale, update };
}

/**
 * Process natural drift (call every N games per config)
 */
export function processMoraleDrift(
  fanMorale: FanMorale,
  expectedWinsDifferential: number,
  divisionRank: number,
  timestamp: GameDate
): { updatedMorale: FanMorale; update: MoraleUpdate } | null {
  const baseline = calculateMoraleBaseline(expectedWinsDifferential, divisionRank);
  const drift = calculateMoraleDrift(fanMorale.current, baseline);

  if (drift === 0) {
    return null;
  }

  const event: MoraleEvent = {
    id: generateEventId(),
    type: 'NATURAL_DRIFT',
    timestamp,
    baseImpact: drift,
    modifiers: [],
    finalImpact: drift,
    previousMorale: fanMorale.current,
    newMorale: fanMorale.current + drift,
    narrative: drift > 0
      ? 'Fan sentiment gradually improving'
      : 'Fan excitement naturally cooling',
    relatedEntities: {},
  };

  return processMoraleEvent(fanMorale, event);
}

// ============================================
// STREAK DETECTION
// ============================================

/**
 * Check for streak events based on recent game history
 */
export function checkForStreakEvent(
  recentResults: boolean[],  // Array of win/loss (true = win)
  previousStreak: { type: 'WIN' | 'LOSS' | null; count: number },
  timestamp: GameDate
): MoraleEvent | null {
  // Count current streak
  let currentStreakType: 'WIN' | 'LOSS' | null = null;
  let currentStreakCount = 0;

  for (let i = recentResults.length - 1; i >= 0; i--) {
    const result = recentResults[i];
    if (currentStreakType === null) {
      currentStreakType = result ? 'WIN' : 'LOSS';
      currentStreakCount = 1;
    } else if ((result && currentStreakType === 'WIN') || (!result && currentStreakType === 'LOSS')) {
      currentStreakCount++;
    } else {
      break;
    }
  }

  // Check for streak milestones
  const streakMilestones = [3, 5, 7];
  let eventType: MoraleEventType | null = null;

  if (currentStreakType === 'WIN') {
    // Check if we just hit a milestone
    for (const milestone of streakMilestones) {
      if (currentStreakCount === milestone && previousStreak.count < milestone) {
        eventType = `WIN_STREAK_${milestone}` as MoraleEventType;
        break;
      }
    }
  } else if (currentStreakType === 'LOSS') {
    for (const milestone of streakMilestones) {
      if (currentStreakCount === milestone && previousStreak.count < milestone) {
        eventType = `LOSE_STREAK_${milestone}` as MoraleEventType;
        break;
      }
    }
  }

  // Check for streak broken
  if (previousStreak.count >= 5) {
    if (previousStreak.type === 'WIN' && currentStreakType === 'LOSS') {
      eventType = 'WIN_STREAK_BROKEN';
    } else if (previousStreak.type === 'LOSS' && currentStreakType === 'WIN') {
      eventType = 'LOSE_STREAK_BROKEN';
    }
  }

  if (!eventType) {
    return null;
  }

  const baseImpact = BASE_MORALE_IMPACTS[eventType] || 0;

  return {
    id: generateEventId(),
    type: eventType,
    timestamp,
    baseImpact,
    modifiers: [],
    finalImpact: baseImpact,
    previousMorale: 0,
    newMorale: 0,
    narrative: generateEventNarrative(eventType, baseImpact, []),
    relatedEntities: {},
  };
}

// ============================================
// CONTRACTION RISK
// ============================================

export interface ContractionRisk {
  level: 'NORMAL' | 'HIGH' | 'CRITICAL';
  moraleContribution: number;
  survivalOdds: number;
}

/**
 * Calculate contraction risk based on morale and other factors
 */
export function calculateContractionRisk(
  fanMorale: number,
  financialHealth: number,  // 0-1 scale, 1 = healthy
  performanceHealth: number // 0-1 scale, 1 = healthy
): ContractionRisk {
  // Morale component (50 is neutral, below contributes to risk)
  const moraleComponent = Math.max(0, (50 - fanMorale) / 50);  // 0-1 scale

  // Morale is 30% of contraction calculation
  const overallRisk =
    moraleComponent * 0.30 +
    (1 - financialHealth) * 0.40 +
    (1 - performanceHealth) * 0.30;

  return {
    level: overallRisk > 0.7 ? 'CRITICAL' : overallRisk > 0.5 ? 'HIGH' : 'NORMAL',
    moraleContribution: moraleComponent,
    survivalOdds: Math.round(100 - (overallRisk * 35)),  // Max 35% penalty from risk
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  // Initialization
  initializeFanMorale,

  // State functions
  getFanState,
  getRiskLevel,

  // Performance context
  classifyPerformance,
  getPerformanceMultiplier,
  getTimingMultiplier,
  getHistoryModifier,

  // Expected wins
  calculateExpectedWins,
  determineFanReaction,

  // Trade scrutiny
  startTradeAftermath,
  updateTradeAftermath,
  calculateFanVerdict,
  getPostTradeGameImpact,

  // Drift & momentum
  calculateMoraleBaseline,
  calculateMoraleDrift,
  applyMomentum,
  calculateTrend,

  // Event processing
  createGameMoraleEvent,
  processMoraleEvent,
  processMoraleDrift,
  checkForStreakEvent,

  // Contraction
  calculateContractionRisk,

  // Constants
  FAN_STATE_THRESHOLDS,
  FAN_STATE_CONFIG,
  BASE_MORALE_IMPACTS,
  FAN_MORALE_CONFIG,
};
