/**
 * Narrative Engine - Beat Reporter & Story Generation System
 *
 * Creates emergent storytelling throughout the KBL experience:
 * - Beat reporters with distinct personalities (10 types)
 * - 80/20 personality alignment (not perfectly predictable)
 * - Template-based narrative generation (Claude API ready)
 * - Fan morale influence from coverage
 * - Story templates by event type
 *
 * Architecture:
 * - Template-based generation today
 * - Drop-in Claude API replacement when ready
 * - Same interface for both approaches
 *
 * @see NARRATIVE_SYSTEM_SPEC.md
 */

// ============================================
// TYPES
// ============================================

export type ReporterPersonality =
  | 'OPTIMIST'      // Finds silver linings, boosts morale
  | 'PESSIMIST'     // Focuses on negatives, drains morale
  | 'BALANCED'      // Neutral, minimal morale influence
  | 'DRAMATIC'      // Amplifies everything, bigger swings
  | 'ANALYTICAL'    // Stats-focused, moderate influence
  | 'HOMER'         // Team cheerleader, strong positive bias
  | 'CONTRARIAN'    // Goes against consensus, unpredictable
  | 'INSIDER'       // Clubhouse access, reveals chemistry/morale
  | 'OLD_SCHOOL'    // Traditional takes, skeptical of analytics
  | 'HOT_TAKE';     // Provocative, volatile morale swings

export type ReporterReputation = 'ROOKIE' | 'ESTABLISHED' | 'VETERAN' | 'LEGENDARY';

export interface BeatReporter {
  id: string;
  firstName: string;
  lastName: string;
  teamId: string;

  // Hidden from users
  personality: ReporterPersonality;

  // Visible attributes
  tenure: number;             // Seasons covering this team
  reputation: ReporterReputation;

  // Tracking
  storiesWritten: number;
  fanMoraleInfluence: number; // Cumulative impact this season
  hiredDate: GameDate;
}

export interface GameDate {
  season: number;
  game: number;
  date?: string;
}

export interface VoiceProfile {
  tone: string;
  vocabulary: string[];
  winReaction: string;
  lossReaction: string;
  exampleHeadline: string;
}

export interface ReporterMoraleConfig {
  basePerStory: number;
  winBoost: number;
  lossBuffer: number;
  streakAmplifier: number;
}

export type NarrativeEventType =
  | 'GAME_RECAP'
  | 'PRE_GAME'
  | 'TRADE_REACTION'
  | 'CALL_UP'
  | 'INJURY_REPORT'
  | 'MILESTONE'
  | 'STREAK'
  | 'PLAYOFF_RACE'
  | 'SEASON_SUMMARY'
  | 'OFFSEASON_NEWS'
  | 'RANDOM_EVENT';

export interface NarrativeContext {
  eventType: NarrativeEventType;
  teamName: string;
  teamRecord?: { wins: number; losses: number };
  gameResult?: {
    won: boolean;
    score: { team: number; opponent: number };
    opponentName: string;
    isWalkOff?: boolean;
    isNoHitter?: boolean;
    isShutout?: boolean;
    keyPlayers?: Array<{ name: string; performance: string }>;
  };
  tradeDetails?: {
    acquired: string[];
    sent: string[];
    isSalaryDump: boolean;
  };
  playerDetails?: {
    name: string;
    milestone?: string;
    injury?: string;
    callUpType?: 'TOP_PROSPECT' | 'REGULAR';
  };
  streakInfo?: {
    type: 'WIN' | 'LOSS';
    count: number;
    broken?: boolean;
  };
  standingsContext?: {
    divisionRank: number;
    gamesBack: number;
    inPlayoffRace: boolean;
  };
  fanMorale?: {
    current: number;
    trend: 'RISING' | 'STABLE' | 'FALLING';
  };
  customData?: Record<string, unknown>;
}

export interface GeneratedNarrative {
  headline: string;
  body: string;
  quote?: string;
  moraleImpact: number;
  reporter: {
    name: string;
    personality: ReporterPersonality;  // Hidden, but included for debugging
    wasOnBrand: boolean;
  };
  // Reliability system
  isAccurate: boolean;              // Was the report factually accurate?
  confidenceLevel: ReporterConfidence;  // How hedged was the language?
  requiresRetraction?: boolean;     // Will need follow-up correction?
  inaccuracyType?: InaccuracyType;  // What kind of error (if inaccurate)?
}

export type ReporterConfidence = 'CONFIRMED' | 'LIKELY' | 'SOURCES_SAY' | 'RUMORED' | 'SPECULATING';

export type InaccuracyType =
  | 'PREMATURE'         // Reported something that didn't happen yet (e.g., trade that fell through)
  | 'EXAGGERATED'       // Facts correct but overstated
  | 'MISATTRIBUTED'     // Wrong player/person credited
  | 'FABRICATED'        // Source was wrong or lying
  | 'OUTDATED';         // Was true but situation changed

export interface NarrativeGeneratorOptions {
  useClaudeAPI?: boolean;
  claudeAPIKey?: string;
  maxTokens?: number;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Personality distribution weights for random generation
 */
export const REPORTER_PERSONALITY_WEIGHTS: Record<ReporterPersonality, number> = {
  OPTIMIST: 15,
  PESSIMIST: 10,
  BALANCED: 20,
  DRAMATIC: 12,
  ANALYTICAL: 10,
  HOMER: 8,
  CONTRARIAN: 8,
  INSIDER: 7,
  OLD_SCHOOL: 5,
  HOT_TAKE: 5,
};

/**
 * Voice profiles for each personality
 */
export const VOICE_PROFILES: Record<ReporterPersonality, VoiceProfile> = {
  OPTIMIST: {
    tone: 'encouraging',
    vocabulary: ['silver lining', 'turning point', 'breakthrough', 'promising', 'bright spot'],
    winReaction: 'enthusiastic celebration',
    lossReaction: 'focus on positives, lessons learned',
    exampleHeadline: 'Thunder Find Their Groove in Statement Win',
  },
  PESSIMIST: {
    tone: 'skeptical',
    vocabulary: ['concerning', 'troubling signs', 'question marks', 'worrying', 'red flags'],
    winReaction: 'tempered, waiting for the other shoe',
    lossReaction: 'told you so, deeper problems',
    exampleHeadline: 'Win Streak Masks Thunder\'s Underlying Issues',
  },
  BALANCED: {
    tone: 'neutral',
    vocabulary: ['solid', 'reasonable', 'as expected', 'straightforward', 'standard'],
    winReaction: 'matter-of-fact reporting',
    lossReaction: 'objective analysis',
    exampleHeadline: 'Thunder Top Red Sox 6-4 in Series Opener',
  },
  DRAMATIC: {
    tone: 'theatrical',
    vocabulary: ['stunning', 'electrifying', 'epic', 'collapse', 'miracle', 'catastrophic'],
    winReaction: 'THIS CHANGES EVERYTHING',
    lossReaction: 'DISASTER, CRISIS MODE',
    exampleHeadline: 'THUNDER STORM: Seventh Straight Win Sends Message',
  },
  ANALYTICAL: {
    tone: 'data-driven',
    vocabulary: ['xwOBA', 'expected', 'statistically', 'regression', 'sample size', 'metrics'],
    winReaction: 'cites underlying metrics',
    lossReaction: 'points to process over results',
    exampleHeadline: 'Thunder\'s xBA Surge Finally Translating to Results',
  },
  HOMER: {
    tone: 'fanboy',
    vocabulary: ['our boys', 'gutsy', 'heart', 'believe', 'we', 'our'],
    winReaction: 'unbridled joy',
    lossReaction: 'blames umps, bad luck, anything but team',
    exampleHeadline: 'Our Thunder Show Heart in Gritty Road Victory',
  },
  CONTRARIAN: {
    tone: 'against the grain',
    vocabulary: ['actually', 'unpopular opinion', 'overlooked', 'contrary to', 'but here\'s the thing'],
    winReaction: 'warns against overreaction',
    lossReaction: 'actually not that bad',
    exampleHeadline: 'Why Thunder\'s Win Streak Should Worry Fans',
  },
  INSIDER: {
    tone: 'connected',
    vocabulary: ['sources say', 'behind closed doors', 'I\'m told', 'clubhouse', 'privately'],
    winReaction: 'reveals what was said in locker room',
    lossReaction: 'reports on closed-door meetings',
    exampleHeadline: 'Inside the Clubhouse: How Thunder Turned Season Around',
  },
  OLD_SCHOOL: {
    tone: 'traditional',
    vocabulary: ['back in my day', 'fundamentals', 'the right way', 'grit', 'old-fashioned'],
    winReaction: 'praises hustle and fundamentals',
    lossReaction: 'blames lack of discipline, new generation',
    exampleHeadline: 'Thunder Win the Old-Fashioned Way: Pitching and Defense',
  },
  HOT_TAKE: {
    tone: 'provocative',
    vocabulary: ['overrated', 'fraud', 'actually elite', 'league-best', 'worst in baseball'],
    winReaction: 'extreme proclamations',
    lossReaction: 'calls for firings, trades',
    exampleHeadline: 'Thunder Are Officially the Team to Beat in the AL',
  },
};

/**
 * Morale influence configuration per personality
 */
export const REPORTER_MORALE_INFLUENCE: Record<ReporterPersonality, ReporterMoraleConfig> = {
  OPTIMIST: {
    basePerStory: 0.5,
    winBoost: 1,
    lossBuffer: 0.5,
    streakAmplifier: 1.2,
  },
  PESSIMIST: {
    basePerStory: -0.5,
    winBoost: 0,
    lossBuffer: -1,
    streakAmplifier: 0.8,
  },
  BALANCED: {
    basePerStory: 0,
    winBoost: 0.5,
    lossBuffer: -0.5,
    streakAmplifier: 1.0,
  },
  DRAMATIC: {
    basePerStory: 0,
    winBoost: 2,
    lossBuffer: -2,
    streakAmplifier: 1.5,
  },
  ANALYTICAL: {
    basePerStory: 0,
    winBoost: 0.3,
    lossBuffer: -0.3,
    streakAmplifier: 0.9,
  },
  HOMER: {
    basePerStory: 1,
    winBoost: 2,
    lossBuffer: 0,
    streakAmplifier: 1.3,
  },
  CONTRARIAN: {
    basePerStory: -0.2,
    winBoost: -0.5,
    lossBuffer: 0.5,
    streakAmplifier: 0.7,
  },
  INSIDER: {
    basePerStory: 0.2,
    winBoost: 1,
    lossBuffer: -0.5,
    streakAmplifier: 1.1,
  },
  OLD_SCHOOL: {
    basePerStory: -0.2,
    winBoost: 0.5,
    lossBuffer: -1,
    streakAmplifier: 0.9,
  },
  HOT_TAKE: {
    basePerStory: 0,
    winBoost: 3,
    lossBuffer: -3,
    streakAmplifier: 2.0,
  },
};

/**
 * Off-brand personality mappings (80/20 rule)
 */
const OFF_BRAND_MAP: Record<ReporterPersonality, ReporterPersonality[]> = {
  OPTIMIST: ['BALANCED', 'ANALYTICAL', 'PESSIMIST'],
  PESSIMIST: ['BALANCED', 'ANALYTICAL', 'OPTIMIST'],
  BALANCED: ['OPTIMIST', 'PESSIMIST', 'DRAMATIC'],
  DRAMATIC: ['BALANCED', 'ANALYTICAL'],
  ANALYTICAL: ['DRAMATIC', 'OPTIMIST', 'PESSIMIST'],
  HOMER: ['BALANCED', 'CONTRARIAN'],
  CONTRARIAN: ['BALANCED', 'HOMER'],
  INSIDER: ['ANALYTICAL', 'DRAMATIC'],
  OLD_SCHOOL: ['ANALYTICAL', 'BALANCED'],
  HOT_TAKE: ['BALANCED', 'ANALYTICAL'],
};

/**
 * Personality alignment rate (80% on-brand)
 */
export const PERSONALITY_ALIGNMENT_RATE = 0.80;

/**
 * Reporter accuracy rates by personality
 * Higher = more reliable, lower = more likely to be wrong
 * Based on personality traits that affect fact-checking
 */
export const REPORTER_ACCURACY_RATES: Record<ReporterPersonality, number> = {
  INSIDER: 0.95,        // Best sources, rarely wrong
  ANALYTICAL: 0.92,     // Double-checks facts, data-driven
  BALANCED: 0.90,       // Professional standards
  OLD_SCHOOL: 0.88,     // Experienced but sometimes dated sources
  OPTIMIST: 0.85,       // Wishful thinking occasionally clouds judgment
  PESSIMIST: 0.85,      // Doom-casting sometimes premature
  HOMER: 0.80,          // Bias clouds judgment, wants to believe
  DRAMATIC: 0.78,       // Embellishes for effect, jumps the gun
  CONTRARIAN: 0.75,     // Takes opposite stance to be edgy, less rigorous
  HOT_TAKE: 0.65,       // Sacrifices accuracy for engagement, shoot first ask later
};

/**
 * Confidence level distribution by accuracy
 * More accurate reporters use more confident language
 */
export const CONFIDENCE_THRESHOLDS: Record<ReporterConfidence, { min: number; language: string[] }> = {
  CONFIRMED: { min: 0.90, language: ['has confirmed', 'officially', 'announced'] },
  LIKELY: { min: 0.80, language: ['is expected to', 'all but certain', 'barring surprises'] },
  SOURCES_SAY: { min: 0.70, language: ['sources say', 'I\'m told', 'per sources'] },
  RUMORED: { min: 0.50, language: ['rumored to', 'could potentially', 'whispers suggest'] },
  SPECULATING: { min: 0.00, language: ['wouldn\'t be surprised if', 'my guess is', 'speculation'] },
};

/**
 * Inaccuracy type weights by personality
 * Different personalities make different kinds of mistakes
 */
export const INACCURACY_TYPE_WEIGHTS: Record<ReporterPersonality, Partial<Record<InaccuracyType, number>>> = {
  INSIDER: { FABRICATED: 60, OUTDATED: 30, PREMATURE: 10 },      // Sources lie or things change
  ANALYTICAL: { MISATTRIBUTED: 50, OUTDATED: 30, EXAGGERATED: 20 }, // Gets details wrong
  BALANCED: { OUTDATED: 40, PREMATURE: 30, MISATTRIBUTED: 30 },  // Standard errors
  OLD_SCHOOL: { OUTDATED: 60, MISATTRIBUTED: 25, EXAGGERATED: 15 }, // Behind the times
  OPTIMIST: { PREMATURE: 50, EXAGGERATED: 40, FABRICATED: 10 },  // Jumps gun, overstates
  PESSIMIST: { PREMATURE: 50, EXAGGERATED: 40, FABRICATED: 10 }, // Doom too early
  HOMER: { EXAGGERATED: 50, FABRICATED: 30, PREMATURE: 20 },     // Wants to believe, overstates
  DRAMATIC: { EXAGGERATED: 60, PREMATURE: 30, FABRICATED: 10 },  // Embellishes everything
  CONTRARIAN: { FABRICATED: 40, PREMATURE: 35, EXAGGERATED: 25 }, // Reaches for hot take
  HOT_TAKE: { FABRICATED: 45, EXAGGERATED: 35, PREMATURE: 20 },  // Makes stuff up for clicks
};

/**
 * SMB-style first names for reporters
 */
const REPORTER_FIRST_NAMES = [
  'Jack', 'Mike', 'Tony', 'Steve', 'Dan', 'Bob', 'Jim', 'Tom', 'Bill', 'Dave',
  'Frank', 'Pete', 'Lou', 'Joe', 'Sam', 'Max', 'Vince', 'Ray', 'Sal', 'Gus',
  'Sarah', 'Katie', 'Emma', 'Lisa', 'Amy', 'Beth', 'Jane', 'Kate', 'Jess', 'Meg',
];

/**
 * SMB-style last names for reporters
 */
const REPORTER_LAST_NAMES = [
  'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Taylor', 'Clark',
  'Martinez', 'Garcia', 'Rodriguez', 'Lopez', 'Thompson', 'White', 'Harris', 'Lewis',
  'Romano', 'Chen', 'Kim', 'Patel', 'Kowalski', 'Schmidt', 'Murphy', 'O\'Brien',
  'Novak', 'Cruz', 'Santos', 'Tanaka', 'Singh', 'Berg',
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Pick random item from array
 */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `rep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Weighted random selection
 */
function weightedRandom<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  for (const [key, weight] of entries) {
    random -= weight;
    if (random <= 0) {
      return key;
    }
  }

  return entries[0][0];  // Fallback
}

// ============================================
// REPORTER GENERATION
// ============================================

/**
 * Generate a new beat reporter
 */
export function generateBeatReporter(
  teamId: string,
  hiredDate: GameDate = { season: 1, game: 0 }
): BeatReporter {
  return {
    id: generateId(),
    firstName: pickRandom(REPORTER_FIRST_NAMES),
    lastName: pickRandom(REPORTER_LAST_NAMES),
    teamId,
    personality: weightedRandom(REPORTER_PERSONALITY_WEIGHTS),
    tenure: 0,
    reputation: 'ROOKIE',
    storiesWritten: 0,
    fanMoraleInfluence: 0,
    hiredDate,
  };
}

/**
 * Get reporter's full name
 */
export function getReporterName(reporter: BeatReporter): string {
  return `${reporter.firstName} ${reporter.lastName}`;
}

/**
 * Update reporter's reputation based on tenure
 */
export function updateReporterReputation(reporter: BeatReporter): BeatReporter {
  let reputation: ReporterReputation;

  if (reporter.tenure >= 10) {
    reputation = 'LEGENDARY';
  } else if (reporter.tenure >= 5) {
    reputation = 'VETERAN';
  } else if (reporter.tenure >= 2) {
    reputation = 'ESTABLISHED';
  } else {
    reputation = 'ROOKIE';
  }

  return { ...reporter, reputation };
}

/**
 * Increment reporter's season (call at season end)
 */
export function advanceReporterSeason(reporter: BeatReporter): BeatReporter {
  const updated = {
    ...reporter,
    tenure: reporter.tenure + 1,
    fanMoraleInfluence: 0,  // Reset for new season
  };
  return updateReporterReputation(updated);
}

// ============================================
// 80/20 PERSONALITY SYSTEM
// ============================================

/**
 * Determine if reporter should align with personality (80% chance)
 */
export function shouldAlignWithPersonality(): boolean {
  return Math.random() < PERSONALITY_ALIGNMENT_RATE;
}

/**
 * Get off-brand personality for variety
 */
export function getOffBrandPersonality(base: ReporterPersonality): ReporterPersonality {
  return pickRandom(OFF_BRAND_MAP[base]);
}

/**
 * Get effective personality for this narrative (80/20 rule)
 */
export function getEffectivePersonality(reporter: BeatReporter): {
  personality: ReporterPersonality;
  isOnBrand: boolean;
} {
  const isOnBrand = shouldAlignWithPersonality();

  if (isOnBrand) {
    return { personality: reporter.personality, isOnBrand: true };
  } else {
    return { personality: getOffBrandPersonality(reporter.personality), isOnBrand: false };
  }
}

// ============================================
// REPORTER RELIABILITY SYSTEM
// ============================================

/**
 * Determine if a story is accurate based on reporter personality
 * @returns true if accurate, false if contains errors
 */
export function determineStoryAccuracy(personality: ReporterPersonality): boolean {
  const accuracyRate = REPORTER_ACCURACY_RATES[personality];
  return Math.random() < accuracyRate;
}

/**
 * Determine what type of inaccuracy occurred
 * Different personalities make different types of mistakes
 */
export function determineInaccuracyType(personality: ReporterPersonality): InaccuracyType {
  const weights = INACCURACY_TYPE_WEIGHTS[personality];
  const entries = Object.entries(weights) as [InaccuracyType, number][];
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  for (const [type, weight] of entries) {
    random -= weight;
    if (random <= 0) {
      return type;
    }
  }

  return 'OUTDATED';  // Fallback
}

/**
 * Determine confidence level based on reporter accuracy and story type
 * More accurate reporters use more confident language
 */
export function determineConfidenceLevel(
  personality: ReporterPersonality,
  eventType: NarrativeEventType
): ReporterConfidence {
  const baseAccuracy = REPORTER_ACCURACY_RATES[personality];

  // Some event types warrant more hedging
  const hedgingModifier: Record<NarrativeEventType, number> = {
    GAME_RECAP: 1.0,        // Facts are known, no hedging needed
    PRE_GAME: 0.95,         // Predictions, slight hedge
    TRADE_REACTION: 0.90,   // Could have missed details
    CALL_UP: 0.98,          // Usually confirmed
    INJURY_REPORT: 0.85,    // Medical info often uncertain
    MILESTONE: 1.0,         // Stats are facts
    STREAK: 1.0,            // Stats are facts
    PLAYOFF_RACE: 0.90,     // Projections involved
    SEASON_SUMMARY: 1.0,    // Historical record
    OFFSEASON_NEWS: 0.75,   // Lots of rumors in offseason
    RANDOM_EVENT: 0.85,     // Varies widely
  };

  const effectiveConfidence = baseAccuracy * hedgingModifier[eventType];

  // Map to confidence level
  if (effectiveConfidence >= CONFIDENCE_THRESHOLDS.CONFIRMED.min) {
    return 'CONFIRMED';
  } else if (effectiveConfidence >= CONFIDENCE_THRESHOLDS.LIKELY.min) {
    return 'LIKELY';
  } else if (effectiveConfidence >= CONFIDENCE_THRESHOLDS.SOURCES_SAY.min) {
    return 'SOURCES_SAY';
  } else if (effectiveConfidence >= CONFIDENCE_THRESHOLDS.RUMORED.min) {
    return 'RUMORED';
  }
  return 'SPECULATING';
}

/**
 * Get hedging language appropriate for confidence level
 */
export function getHedgingLanguage(confidence: ReporterConfidence): string {
  return pickRandom(CONFIDENCE_THRESHOLDS[confidence].language);
}

/**
 * Determine if an inaccurate story requires a formal retraction
 * vs just being quietly forgotten
 */
export function requiresRetraction(
  inaccuracyType: InaccuracyType,
  eventType: NarrativeEventType
): boolean {
  // High-stakes inaccuracies need retractions
  const highStakesEvents: NarrativeEventType[] = [
    'TRADE_REACTION', 'INJURY_REPORT', 'CALL_UP', 'OFFSEASON_NEWS'
  ];

  const severeInaccuracies: InaccuracyType[] = [
    'FABRICATED', 'PREMATURE'
  ];

  // Fabricated or premature claims on high-stakes topics need retractions
  if (severeInaccuracies.includes(inaccuracyType) && highStakesEvents.includes(eventType)) {
    return true;
  }

  // 30% chance minor inaccuracies get noticed and need correction
  if (inaccuracyType === 'EXAGGERATED' || inaccuracyType === 'MISATTRIBUTED') {
    return Math.random() < 0.30;
  }

  // Outdated info rarely needs formal retraction
  return Math.random() < 0.10;
}

/**
 * Generate a retraction narrative for an inaccurate story
 */
export function generateRetractionNarrative(
  reporter: BeatReporter,
  originalHeadline: string,
  inaccuracyType: InaccuracyType
): { headline: string; body: string } {
  const name = getReporterName(reporter);

  const retractionTemplates: Record<InaccuracyType, { headline: string; body: string }[]> = {
    PREMATURE: [
      {
        headline: 'CORRECTION: Earlier Report Was Premature',
        body: `${name} is issuing a correction to an earlier report. "${originalHeadline}" was reported prematurely - the situation is still developing and no final decision has been made.`,
      },
      {
        headline: 'Update: Deal Not Yet Finalized',
        body: `Contrary to earlier reports by ${name}, negotiations are ongoing. We regret any confusion caused by premature reporting.`,
      },
    ],
    EXAGGERATED: [
      {
        headline: 'Clarification on Earlier Report',
        body: `${name} would like to clarify that earlier reporting may have overstated certain aspects of the story. The facts remain accurate, but the characterization has been adjusted.`,
      },
    ],
    MISATTRIBUTED: [
      {
        headline: 'CORRECTION: Attribution Error',
        body: `An earlier report by ${name} incorrectly attributed statements/actions to the wrong individual. We apologize for the error.`,
      },
    ],
    FABRICATED: [
      {
        headline: 'RETRACTION: Source Was Unreliable',
        body: `${name} is retracting an earlier report after determining that the source provided inaccurate information. We apologize to our readers and those affected.`,
      },
      {
        headline: 'Story Withdrawn',
        body: `After further investigation, ${name} has withdrawn an earlier story. "I trusted a source who led me astray. I take full responsibility for this error."`,
      },
    ],
    OUTDATED: [
      {
        headline: 'UPDATE: Situation Has Changed',
        body: `${name} reports that circumstances have changed since the original story was published. The earlier reporting was accurate at the time but is no longer current.`,
      },
    ],
  };

  return pickRandom(retractionTemplates[inaccuracyType]);
}

/**
 * Calculate credibility hit from an inaccuracy
 * Used to track reporter reputation over time
 */
export function calculateCredibilityHit(inaccuracyType: InaccuracyType): number {
  const hits: Record<InaccuracyType, number> = {
    FABRICATED: -15,     // Severe - should've verified
    PREMATURE: -10,      // Jumped the gun
    MISATTRIBUTED: -5,   // Sloppy but forgivable
    EXAGGERATED: -3,     // Minor embellishment
    OUTDATED: -1,        // Not really their fault
  };
  return hits[inaccuracyType];
}

// ============================================
// MORALE INFLUENCE CALCULATION
// ============================================

/**
 * Calculate morale impact from a story
 */
export function calculateStoryMoraleImpact(
  reporter: BeatReporter,
  effectivePersonality: ReporterPersonality,
  context: NarrativeContext
): number {
  const config = REPORTER_MORALE_INFLUENCE[effectivePersonality];
  let impact = config.basePerStory;

  // Game result modifier
  if (context.gameResult) {
    if (context.gameResult.won) {
      impact += config.winBoost;
    } else {
      impact += config.lossBuffer;
    }
  }

  // Streak amplifier
  if (context.streakInfo) {
    const streakMultiplier = context.streakInfo.count >= 5 ? config.streakAmplifier : 1.0;

    if (context.streakInfo.type === 'WIN' && !context.streakInfo.broken) {
      impact *= streakMultiplier;
    } else if (context.streakInfo.type === 'LOSS' && !context.streakInfo.broken) {
      impact *= streakMultiplier;
    }
  }

  // Reputation modifier (veterans have more influence)
  const reputationMultiplier: Record<ReporterReputation, number> = {
    ROOKIE: 0.7,
    ESTABLISHED: 1.0,
    VETERAN: 1.2,
    LEGENDARY: 1.5,
  };
  impact *= reputationMultiplier[reporter.reputation];

  return Math.round(impact * 10) / 10;  // Round to 1 decimal
}

// ============================================
// TEMPLATE-BASED NARRATIVE GENERATION
// ============================================

/**
 * Game recap headline templates by personality
 */
const GAME_RECAP_HEADLINES: Record<ReporterPersonality, {
  win: string[];
  loss: string[];
}> = {
  OPTIMIST: {
    win: [
      '{team} Find Their Groove with {margin}-Run Victory',
      'Bright Spot: {team} Top {opponent} {score}',
      '{team} Show Promise in Win Over {opponent}',
    ],
    loss: [
      '{team} Fall Short But Show Fight Against {opponent}',
      'Silver Lining: {team} Battle Hard in {margin}-Run Loss',
      '{team} Take Lessons from {opponent} Defeat',
    ],
  },
  PESSIMIST: {
    win: [
      '{team} Escape with Win, But Concerns Remain',
      'Victory Masks {team}\'s Underlying Issues',
      '{team} Survive {opponent}, Questions Linger',
    ],
    loss: [
      '{team}\'s Troubles Continue in Loss to {opponent}',
      'Familiar Problems Plague {team} in Defeat',
      '{team} Drop Another as Woes Mount',
    ],
  },
  BALANCED: {
    win: [
      '{team} Defeat {opponent} {score}',
      '{team} Take Series Opener Over {opponent}',
      '{team} Win {margin}-Run Decision Against {opponent}',
    ],
    loss: [
      '{team} Fall to {opponent} {score}',
      '{opponent} Top {team} in {margin}-Run Game',
      '{team} Drop Decision to {opponent}',
    ],
  },
  DRAMATIC: {
    win: [
      'STATEMENT WIN: {team} CRUSH {opponent}!',
      'ELECTRIC: {team} Storm Past {opponent}!',
      '{team} DOMINATE in Emphatic Victory!',
    ],
    loss: [
      'DISASTER: {team} Collapse Against {opponent}',
      'CRISIS MODE: {team} Suffer Crushing Defeat',
      'NIGHTMARE: {team} Fall Apart vs {opponent}',
    ],
  },
  ANALYTICAL: {
    win: [
      '{team}\'s xBA Surge Translates to {margin}-Run Win',
      'Expected Runs Come Through as {team} Top {opponent}',
      '{team} Convert Metrics to Victory Over {opponent}',
    ],
    loss: [
      'Despite Strong xwOBA, {team} Fall to {opponent}',
      'Regression Hits {team} in Loss to {opponent}',
      '{team}\'s BABIP Luck Runs Out Against {opponent}',
    ],
  },
  HOMER: {
    win: [
      'OUR {team} Show Heart in Gritty Victory!',
      '{team} Prove Doubters Wrong with Gutsy Win!',
      'Believe! {team} Take Down {opponent}!',
    ],
    loss: [
      '{team} Robbed by Bad Luck Against {opponent}',
      'Questionable Calls Cost Our {team} in Tough Loss',
      '{team} Deserve Better in Heartbreaking Defeat',
    ],
  },
  CONTRARIAN: {
    win: [
      'Unpopular Opinion: {team} Win Means Less Than You Think',
      'Why {team}\'s Victory Should Worry Fans',
      'Hot Take: {team} Still Not as Good as Win Suggests',
    ],
    loss: [
      'Actually, {team}\'s Loss Isn\'t That Bad',
      'Overlooked: {team} Played Better Than Score Shows',
      'Contrarian Take: Loss to {opponent} Has Silver Lining',
    ],
  },
  INSIDER: {
    win: [
      'Inside Scoop: What {team} Said After Big Win',
      'Sources: {team} Clubhouse Buzzing After Victory',
      'Behind the Scenes of {team}\'s Win Over {opponent}',
    ],
    loss: [
      'Clubhouse Quiet After {team}\'s Loss to {opponent}',
      'Sources: Closed-Door Meeting After {team} Defeat',
      'Inside {team}\'s Locker Room Following Tough Loss',
    ],
  },
  OLD_SCHOOL: {
    win: [
      '{team} Win the Right Way: Pitching and Defense',
      'Fundamentals Fuel {team} Victory Over {opponent}',
      '{team} Play Old-Fashioned Baseball in Win',
    ],
    loss: [
      'Lack of Discipline Costs {team} Against {opponent}',
      'Back to Basics Needed After {team} Loss',
      '{team} Forget Fundamentals in Defeat',
    ],
  },
  HOT_TAKE: {
    win: [
      '{team} Are OFFICIALLY Elite After Crushing {opponent}',
      'League on Notice: {team} Are the Team to Beat',
      '{team} Prove They\'re CHAMPIONSHIP Caliber',
    ],
    loss: [
      '{team} Are FRAUDS - Fire Everyone',
      'Embarrassing Loss Proves {team} Overrated',
      '{team} Should Blow It All Up After Pathetic Defeat',
    ],
  },
};

/**
 * Generate headline from template
 */
function generateHeadline(
  personality: ReporterPersonality,
  context: NarrativeContext
): string {
  const templates = GAME_RECAP_HEADLINES[personality];
  const templateList = context.gameResult?.won ? templates.win : templates.loss;
  let headline = pickRandom(templateList);

  // Replace placeholders
  headline = headline.replace(/{team}/g, context.teamName);
  headline = headline.replace(/{opponent}/g, context.gameResult?.opponentName || 'Opponent');

  if (context.gameResult) {
    const { team, opponent } = context.gameResult.score;
    headline = headline.replace(/{score}/g, `${team}-${opponent}`);
    headline = headline.replace(/{margin}/g, String(Math.abs(team - opponent)));
  }

  return headline;
}

/**
 * Generate body text from context and personality
 */
function generateBody(
  personality: ReporterPersonality,
  context: NarrativeContext
): string {
  const voice = VOICE_PROFILES[personality];
  const vocab = pickRandom(voice.vocabulary);

  let body = '';

  if (context.gameResult) {
    const { won, score, opponentName, keyPlayers } = context.gameResult;

    if (won) {
      body = `The ${context.teamName} posted a ${vocab} ${score.team}-${score.opponent} victory over the ${opponentName}. `;
    } else {
      body = `The ${context.teamName} fell ${score.opponent}-${score.team} to the ${opponentName} in a ${vocab} defeat. `;
    }

    if (keyPlayers && keyPlayers.length > 0) {
      const player = keyPlayers[0];
      body += `${player.name} ${player.performance}. `;
    }

    // Add personality-specific commentary
    body += voice[won ? 'winReaction' : 'lossReaction'];
  }

  return body;
}

/**
 * Generate quote from reporter
 */
function generateQuote(
  reporter: BeatReporter,
  personality: ReporterPersonality,
  context: NarrativeContext
): string | undefined {
  // 50% chance of including a quote
  if (Math.random() > 0.5) {
    return undefined;
  }

  const voice = VOICE_PROFILES[personality];
  const vocab = pickRandom(voice.vocabulary);

  if (context.gameResult?.won) {
    return `"${vocab.charAt(0).toUpperCase() + vocab.slice(1)} performance today. ${voice.winReaction}." - ${getReporterName(reporter)}`;
  } else {
    return `"${vocab.charAt(0).toUpperCase() + vocab.slice(1)} situation here. ${voice.lossReaction}." - ${getReporterName(reporter)}`;
  }
}

// ============================================
// MAIN NARRATIVE GENERATION
// ============================================

/**
 * Generate narrative using templates (Claude API ready)
 *
 * This function uses template-based generation by default.
 * When Claude API is enabled, it will use LLM generation instead.
 * The interface remains the same for both approaches.
 */
export function generateNarrative(
  context: NarrativeContext,
  reporter: BeatReporter,
  options: NarrativeGeneratorOptions = {}
): GeneratedNarrative {
  // Get effective personality (80/20 rule)
  const { personality: effectivePersonality, isOnBrand } = getEffectivePersonality(reporter);

  // Check if Claude API should be used
  if (options.useClaudeAPI && options.claudeAPIKey) {
    // TODO: Implement Claude API call
    // return generateNarrativeWithClaude(context, reporter, effectivePersonality, options);
    console.warn('Claude API integration not yet implemented, falling back to templates');
  }

  // Template-based generation
  const headline = generateHeadline(effectivePersonality, context);
  const body = generateBody(effectivePersonality, context);
  const quote = generateQuote(reporter, effectivePersonality, context);
  const moraleImpact = calculateStoryMoraleImpact(reporter, effectivePersonality, context);

  // Reliability system - determine if this story is accurate
  const isAccurate = determineStoryAccuracy(effectivePersonality);
  const confidenceLevel = determineConfidenceLevel(effectivePersonality, context.eventType);

  // If inaccurate, determine what kind of error and if retraction is needed
  let inaccuracyType: InaccuracyType | undefined;
  let needsRetraction = false;

  if (!isAccurate) {
    inaccuracyType = determineInaccuracyType(effectivePersonality);
    needsRetraction = requiresRetraction(inaccuracyType, context.eventType);
  }

  return {
    headline,
    body,
    quote,
    moraleImpact,
    reporter: {
      name: getReporterName(reporter),
      personality: effectivePersonality,
      wasOnBrand: isOnBrand,
    },
    // Reliability fields
    isAccurate,
    confidenceLevel,
    requiresRetraction: needsRetraction || undefined,
    inaccuracyType,
  };
}

/**
 * Generate narrative with Claude API (placeholder for future implementation)
 *
 * This function will be implemented when Claude API integration is ready.
 * It will use the same interface as template-based generation.
 */
export async function generateNarrativeWithClaude(
  context: NarrativeContext,
  reporter: BeatReporter,
  effectivePersonality: ReporterPersonality,
  options: NarrativeGeneratorOptions
): Promise<GeneratedNarrative> {
  const voice = VOICE_PROFILES[effectivePersonality];

  // Build prompt for Claude
  const prompt = buildClaudePrompt(context, reporter, voice);

  // TODO: Make actual Claude API call
  // const response = await fetch('https://api.anthropic.com/v1/messages', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'x-api-key': options.claudeAPIKey!,
  //     'anthropic-version': '2023-06-01',
  //   },
  //   body: JSON.stringify({
  //     model: 'claude-3-haiku-20240307',  // Fast & cheap for narratives
  //     max_tokens: options.maxTokens || 300,
  //     messages: [{ role: 'user', content: prompt }],
  //   }),
  // });
  // const result = await response.json();
  // return parseClaudeResponse(result, reporter, effectivePersonality);

  // For now, fall back to templates
  console.warn('Claude API call not implemented, using templates');
  return generateNarrative(context, reporter, { ...options, useClaudeAPI: false });
}

/**
 * Build prompt for Claude API
 */
function buildClaudePrompt(
  context: NarrativeContext,
  reporter: BeatReporter,
  voice: VoiceProfile
): string {
  const reporterName = getReporterName(reporter);

  let prompt = `You are ${reporterName}, a baseball beat reporter with a ${voice.tone} writing style. `;
  prompt += `Your vocabulary includes words like: ${voice.vocabulary.join(', ')}. `;

  if (context.gameResult) {
    const { won, score, opponentName } = context.gameResult;
    prompt += `\n\nWrite a brief game recap. The ${context.teamName} ${won ? 'defeated' : 'lost to'} the ${opponentName} ${score.team}-${score.opponent}. `;

    if (context.gameResult.keyPlayers) {
      prompt += `Key performers: ${context.gameResult.keyPlayers.map(p => `${p.name} (${p.performance})`).join(', ')}. `;
    }

    prompt += `\nYour reaction to ${won ? 'wins' : 'losses'}: ${voice[won ? 'winReaction' : 'lossReaction']}`;
  }

  prompt += '\n\nProvide:\n1. A headline (one line)\n2. A 2-3 sentence body\n3. Optionally, a brief quote from yourself';

  return prompt;
}

// ============================================
// BATCH NARRATIVE GENERATION
// ============================================

/**
 * Generate multiple narratives for a game (different perspectives)
 */
export function generateGameNarratives(
  homeContext: NarrativeContext,
  awayContext: NarrativeContext,
  homeReporter: BeatReporter,
  awayReporter: BeatReporter,
  options: NarrativeGeneratorOptions = {}
): { home: GeneratedNarrative; away: GeneratedNarrative } {
  return {
    home: generateNarrative(homeContext, homeReporter, options),
    away: generateNarrative(awayContext, awayReporter, options),
  };
}

// ============================================
// SPECIAL EVENT NARRATIVES
// ============================================

/**
 * Generate trade reaction narrative
 */
export function generateTradeNarrative(
  context: NarrativeContext,
  reporter: BeatReporter
): GeneratedNarrative {
  const { personality: effectivePersonality, isOnBrand } = getEffectivePersonality(reporter);
  const voice = VOICE_PROFILES[effectivePersonality];

  if (!context.tradeDetails) {
    throw new Error('Trade details required for trade narrative');
  }

  const { acquired, sent, isSalaryDump } = context.tradeDetails;

  let headline: string;
  let body: string;

  if (isSalaryDump) {
    // Personality-colored reaction to salary dump
    switch (effectivePersonality) {
      case 'OPTIMIST':
        headline = `${context.teamName} Make Bold Move for Future Flexibility`;
        body = `The ${context.teamName} have traded ${sent.join(', ')} in exchange for ${acquired.join(', ')}. While some may question the move, this creates ${pickRandom(voice.vocabulary)} opportunities for the future.`;
        break;
      case 'PESSIMIST':
        headline = `${context.teamName} Signal Surrender with Salary Dump`;
        body = `In a ${pickRandom(voice.vocabulary)} development, the ${context.teamName} have shipped out ${sent.join(', ')}. This raises serious questions about ownership's commitment.`;
        break;
      case 'HOMER':
        headline = `Trust the Process: ${context.teamName} Retool for Championship Run`;
        body = `Our ${context.teamName} are making the smart play here. Trading ${sent.join(', ')} sets us up for sustained success.`;
        break;
      default:
        headline = `${context.teamName} Trade ${sent.join(', ')} in Salary-Clearing Move`;
        body = `The ${context.teamName} have acquired ${acquired.join(', ')} while shedding salary. The fanbase will be watching closely.`;
    }
  } else {
    headline = `${context.teamName} Acquire ${acquired.join(', ')} in Trade`;
    body = `The ${context.teamName} have made a move, sending ${sent.join(', ')} to acquire ${acquired.join(', ')}. ${voice.vocabulary[0].charAt(0).toUpperCase() + voice.vocabulary[0].slice(1)} move by the front office.`;
  }

  const moraleImpact = calculateStoryMoraleImpact(reporter, effectivePersonality, context);

  return {
    headline,
    body,
    moraleImpact,
    reporter: {
      name: getReporterName(reporter),
      personality: effectivePersonality,
      wasOnBrand: isOnBrand,
    },
    isAccurate: true,
    confidenceLevel: 'HIGH' as ReporterConfidence,
  };
}

/**
 * Generate milestone narrative
 */
export function generateMilestoneNarrative(
  context: NarrativeContext,
  reporter: BeatReporter
): GeneratedNarrative {
  const { personality: effectivePersonality, isOnBrand } = getEffectivePersonality(reporter);

  if (!context.playerDetails?.milestone) {
    throw new Error('Player milestone details required');
  }

  const { name, milestone } = context.playerDetails;

  const headline = `${name} Reaches ${milestone} with ${context.teamName}`;
  const body = `${name} has achieved a career milestone, recording ${milestone}. The ${context.teamName} faithful were on their feet to celebrate this historic moment.`;

  const moraleImpact = calculateStoryMoraleImpact(reporter, effectivePersonality, context);

  return {
    headline,
    body,
    moraleImpact,
    reporter: {
      name: getReporterName(reporter),
      personality: effectivePersonality,
      wasOnBrand: isOnBrand,
    },
    isAccurate: true,
    confidenceLevel: 'HIGH' as ReporterConfidence,
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  // Reporter generation
  generateBeatReporter,
  getReporterName,
  updateReporterReputation,
  advanceReporterSeason,

  // Personality system
  shouldAlignWithPersonality,
  getOffBrandPersonality,
  getEffectivePersonality,

  // Morale calculation
  calculateStoryMoraleImpact,

  // Narrative generation
  generateNarrative,
  generateNarrativeWithClaude,
  generateGameNarratives,
  generateTradeNarrative,
  generateMilestoneNarrative,

  // Constants
  REPORTER_PERSONALITY_WEIGHTS,
  VOICE_PROFILES,
  REPORTER_MORALE_INFLUENCE,
  PERSONALITY_ALIGNMENT_RATE,
};
