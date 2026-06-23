/**
 * Event Log System
 *
 * BULLETPROOF DATA INTEGRITY
 *
 * This system captures every at-bat with full situational context, enabling:
 * 1. Complete game reconstruction (box scores)
 * 2. Full season stat recalculation from raw events
 * 3. Advanced metrics recalculation (WAR, Clutch, Leverage, WPA)
 * 4. Fame event recalculation
 * 5. Recovery from any crash or write failure
 *
 * STORAGE STRATEGY:
 * - Events written IMMEDIATELY after each at-bat (not debounced)
 * - Game marked "aggregated: false" until season aggregation succeeds
 * - On startup, any unaggregated games are re-processed
 * - Full event log preserved forever (enables historical analysis)
 *
 * STORAGE COST: ~500 bytes/at-bat × 70 at-bats/game = ~35KB/game
 * Total games per season = (numTeams × gamesPerTeam) / 2
 * Example: 8 teams × 128 games/team = 512 unique games × 35KB = ~18MB/season
 * (Configured via seasons.csv gamesPerTeam and league numTeams)
 */

import { calculateLeverageIndex } from '../engines/leverageCalculator';
import { calculateWPA } from '../engines/wpaCalculator';
import type { AtBatResult, Position, HalfInning, SpecialPlayType, MojoLevelLabel, FitnessLevelLabel, FameLevel, SpecPitcherRole, HiddenModifiers } from '../types/game';
import type {
  ManagerBuntIntent,
  ManagerDecisionConfidence,
  ManagerDecisionResolutionEndpoint,
  ManagerDecisionSource,
  ManagerDecisionType,
  GameLockLineupSnapshots,
  ManagerRunnerIntent,
  ManagerRunPlay,
  ManagerRecommendationWatchEvent,
} from '../types/managerWpa';
import type { ParkFactors } from '../types/war';
import type { CompetitionType } from './gameStorage';
import { syncEngine } from './syncEngine';

// ============================================
// DATABASE SETUP
// ============================================

const DB_NAME = 'kbl-event-log';
const DB_VERSION = 3;

const STORES = {
  GAME_HEADERS: 'gameHeaders',      // Game metadata and aggregation status
  AT_BAT_EVENTS: 'atBatEvents',     // Individual at-bat events
  PITCHING_APPEARANCES: 'pitchingAppearances',  // Pitcher entry/exit for inherited runners
  FIELDING_EVENTS: 'fieldingEvents', // Fielding plays for FWAR
  BETWEEN_PLAY_EVENTS: 'betweenPlayEvents', // Between-play events (SB, WP, subs, etc.)
};

function syncUpsert(storeName: string, recordKey: unknown, data: unknown): void {
  if (!syncEngine.isSuppressed()) {
    syncEngine.upsert(DB_NAME, storeName, recordKey, data);
  }
}

function syncRemove(storeName: string, recordKey: unknown): void {
  if (!syncEngine.isSuppressed()) {
    syncEngine.remove(DB_NAME, storeName, recordKey);
  }
}

function withoutTeamId<T extends { teamId: string }>(value: T): Omit<T, 'teamId'> {
  const next: Partial<T> = { ...value };
  delete next.teamId;
  return next as Omit<T, 'teamId'>;
}

let dbInstance: IDBDatabase | null = null;

async function initEventLogDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open event log database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Game headers - metadata and aggregation status
      if (!db.objectStoreNames.contains(STORES.GAME_HEADERS)) {
        const gameStore = db.createObjectStore(STORES.GAME_HEADERS, { keyPath: 'gameId' });
        gameStore.createIndex('seasonId', 'seasonId', { unique: false });
        gameStore.createIndex('date', 'date', { unique: false });
        gameStore.createIndex('aggregated', 'aggregated', { unique: false });
        gameStore.createIndex('seasonId_aggregated', ['seasonId', 'aggregated'], { unique: false });
      }

      // At-bat events - the core event log
      if (!db.objectStoreNames.contains(STORES.AT_BAT_EVENTS)) {
        const eventStore = db.createObjectStore(STORES.AT_BAT_EVENTS, { keyPath: 'eventId' });
        eventStore.createIndex('gameId', 'gameId', { unique: false });
        eventStore.createIndex('gameId_eventIndex', ['gameId', 'eventIndex'], { unique: true });
        eventStore.createIndex('batterId', 'batterId', { unique: false });
        eventStore.createIndex('pitcherId', 'pitcherId', { unique: false });
      }

      // Pitching appearances - for inherited runner tracking
      if (!db.objectStoreNames.contains(STORES.PITCHING_APPEARANCES)) {
        const pitchingStore = db.createObjectStore(STORES.PITCHING_APPEARANCES, { keyPath: 'appearanceId' });
        pitchingStore.createIndex('gameId', 'gameId', { unique: false });
        pitchingStore.createIndex('pitcherId', 'pitcherId', { unique: false });
      }

      // Fielding events - for FWAR calculation
      if (!db.objectStoreNames.contains(STORES.FIELDING_EVENTS)) {
        const fieldingStore = db.createObjectStore(STORES.FIELDING_EVENTS, { keyPath: 'fieldingEventId' });
        fieldingStore.createIndex('gameId', 'gameId', { unique: false });
        fieldingStore.createIndex('playerId', 'playerId', { unique: false });
        fieldingStore.createIndex('atBatEventId', 'atBatEventId', { unique: false });
      }

      // Between-play events - SB, WP, substitutions, mojo/fitness changes, etc.
      if (!db.objectStoreNames.contains(STORES.BETWEEN_PLAY_EVENTS)) {
        const bpStore = db.createObjectStore(STORES.BETWEEN_PLAY_EVENTS, { keyPath: 'eventId' });
        bpStore.createIndex('gameId', 'gameId', { unique: false });
        bpStore.createIndex('type', 'type', { unique: false });
      }
    };
  });
}

// ============================================
// TYPES
// ============================================

/** Game header with aggregation status */
export interface GameHeader {
  gameId: string;
  seasonId?: string;
  statsScopeId?: string;
  competitionType?: CompetitionType;
  competitionId?: string;
  competitionName?: string;
  franchiseId?: string;
  leagueId?: string;
  scheduleGameId?: string;
  playoffSeriesId?: string;
  playoffGameNumber?: number;
  playoffId?: string;
  playoffRound?:
    | 'wild_card'
    | 'division_series'
    | 'championship_series'
    | 'world_series';
  isEliminationGame?: boolean;
  isClinchGame?: boolean;
  liveBeatReporterEnabled?: boolean;
  postGameColumnsEnabled?: boolean;
  date: number;  // timestamp

  // Teams
  awayTeamId: string;
  awayTeamName: string;
  homeTeamId: string;
  homeTeamName: string;
  stadiumName?: string | null;
  startingLineups?: {
    away: Array<{ playerId: string; playerName: string; position: string; battingOrder: number }>;
    home: Array<{ playerId: string; playerName: string; position: string; battingOrder: number }>;
  };
  benchRosters?: {
    away: Array<{ playerId: string; playerName: string; positions: string[] }>;
    home: Array<{ playerId: string; playerName: string; positions: string[] }>;
  };
  startingPitchers?: {
    away: { playerId: string; playerName: string };
    home: { playerId: string; playerName: string };
  };
  optimalLineupSnapshots?: GameLockLineupSnapshots;
  chosenLineupSnapshots?: GameLockLineupSnapshots;

  // Final state
  finalScore: { away: number; home: number } | null;  // null if game in progress
  finalInning: number;
  totalInnings?: number;
  useGhostRunner?: boolean;
  extraInningRunner?: boolean;
  extraInningRunnerDelay?: 1 | 2;
  isComplete: boolean;

  // Aggregation tracking
  aggregated: boolean;           // Has this game been aggregated to season stats?
  aggregatedAt: number | null;   // When was it aggregated?
  aggregationError: string | null;  // Last error if aggregation failed

  // Integrity
  eventCount: number;            // Number of at-bat events (for verification)
  checksum: string;              // Hash of all events (for integrity verification)
}

/** Full situational context for an at-bat */
export interface AtBatEvent {
  eventId: string;               // Unique ID: `${gameId}_${eventIndex}`
  gameId: string;
  eventIndex: number;            // 1, 2, 3... order within game
  timestamp: number;
  undoneAt?: number | null;

  // Who
  batterId: string;
  batterName: string;
  batterTeamId: string;
  pitcherId: string;
  pitcherName: string;
  pitcherTeamId: string;

  // Result
  result: AtBatResult;
  rbiCount: number;
  runsScored: string[] | number;  // Spec: string[] of player IDs who scored; legacy: number count. Resolve to string[] only in Tier 1B+.

  // Situation BEFORE at-bat (for Leverage Index, Clutch)
  inning: number;
  halfInning: HalfInning;
  outs: number;
  runners: RunnerState;
  awayScore: number;
  homeScore: number;

  // Situation AFTER at-bat (for WPA calculation)
  outsAfter: number;
  runnersAfter: RunnerState;
  awayScoreAfter: number;
  homeScoreAfter: number;

  // Calculated metrics (can be recalculated but stored for efficiency)
  leverageIndex: number;         // Situation leverage before at-bat
  winProbabilityBefore: number;  // Home team win probability before
  winProbabilityAfter: number;   // Home team win probability after
  wpa: number;                   // Win probability added (from batter's team perspective)
  wpaModelVersion?: string;      // Versioned WPA model used for committed WPA values
  homeDelta?: number;            // Home-team WPA delta from the official model
  battingTeamDelta?: number;     // Batting-team WPA delta from the official model
  fieldingTeamDelta?: number;    // Fielding-team WPA delta from the official model
  totalInnings?: number;         // Regulation length used for win-probability recalculation
  useGhostRunner?: boolean;      // Whether extra innings should use Savant ghost-runner mapping
  extraInningRunner?: boolean;   // Whether automatic runner rules were enabled for this game
  extraInningRunnerDelay?: 1 | 2; // Extra inning number where automatic runner starts

  // Ball in play data (for fielding)
  ballInPlay: BallInPlayData | null;

  // Fame events triggered by this at-bat
  fameEvents: FameEventRecord[];

  // Special flags
  isLeadoff: boolean;            // First batter of inning
  isClutch: boolean;             // High leverage situation
  isWalkOff: boolean;            // Ended the game

  // === LAYER 1B: CONTEXT SNAPSHOT FIELDS (all optional) ===

  // 1.9 (GAP-GT-2-A): Identity fields
  seasonId?: string;
  seasonNumber?: number;
  statsScopeId?: string;
  competitionType?: CompetitionType;
  competitionId?: string;
  franchiseId?: string;
  scheduleGameId?: string;
  leagueId?: string;
  playoffId?: string;
  playoffSeriesId?: string;
  playoffGameNumber?: number;

  // 1.10 (GAP-GT-2-G): Park context
  parkContext?: {
    stadiumId: string;
    stadiumName: string;
    parkFactors?: ParkFactors;
    lighting?: 'day' | 'night';
  };

  // 1.11 (GAP-GT-2-C): Team context
  teamContext?: {
    battingTeam: {
      teamId: string;
      teamName: string;
      record?: { w: number; l: number };
      streak?: number;
      divisionRank?: number;
    };
    fieldingTeam: {
      teamId: string;
      teamName: string;
      record?: { w: number; l: number };
      streak?: number;
      divisionRank?: number;
    };
    isRivalryGame?: boolean;
    seriesContext?: {
      game: number;
      of: number;
      seriesScore?: { home: number; away: number };
    };
  };

  // 1.12 (GAP-GT-2-D): Batter context snapshot
  batterContext?: {
    playerId: string;
    playerName: string;
    position?: string;
    battingOrder?: number;
    handedness?: 'L' | 'R' | 'S';
    enteredAs?: 'starter' | 'pinch_hit' | 'pinch_run' | 'defensive_replacement';
    replacedPlayer?: string;
    mojoState?: MojoLevelLabel;
    fitnessLevel?: FitnessLevelLabel;
    currentGameStats?: { ab: number; h: number; hr: number; rbi: number };
    currentSeasonAvg?: number;
    currentSeasonOPS?: number;
    currentStreak?: number;
    seasonHits?: number;
    seasonHR?: number;
    careerHits?: number;
    careerHR?: number;
    fameLevel?: FameLevel;
    personality?: string;
    hiddenModifiers?: HiddenModifiers;
  };

  // 1.13 (GAP-GT-2-E): Pitcher context snapshot
  pitcherContext?: {
    playerId: string;
    playerName: string;
    handedness?: 'L' | 'R';
    role?: SpecPitcherRole;
    mojoState?: MojoLevelLabel;
    fitnessLevel?: FitnessLevelLabel;
    pitchCount?: number;
    currentGameStats?: { ip: number; h: number; er: number; k: number; bb: number };
    currentSeasonERA?: number;
    currentSeasonWHIP?: number;
    seasonStrikeouts?: number;
    careerStrikeouts?: number;
    careerWins?: number;
    inheritedRunners?: number;
    fameLevel?: FameLevel;
    personality?: string;
    hiddenModifiers?: HiddenModifiers;
  };
  catcherContext?: {
    playerId: string;
    playerName: string;
    teamId: string;
    position?: 'C';
  };

  // 1.14 (GAP-GT-2-F): Matchup context
  matchupContext?: {
    platoonAdvantage?: 'batter' | 'pitcher' | 'neutral';
    isRivalry?: boolean;
    previousMatchupsThisGame?: { ab: number; h: number };
  };

  // 1.15 (GAP-GT-2-H): Computed fields
  runnerOutcomes?: Array<{
    runnerId: string;
    runnerName: string;
    fromBase: 'batter' | 'first' | 'second' | 'third';
    toBase: 'first' | 'second' | 'third' | 'home' | 'out' | 'end';
    // Runner-level enrichment (UX-050 / §8.6)
    fieldingSequence?: number[];
    playMechanic?: string;
    fielderId?: string;
    fielderPosition?: Extract<Position, 'LF' | 'CF' | 'RF'>;
    heldByOf?: boolean;
    holdingFielder?: Extract<Position, 'LF' | 'CF' | 'RF'>;
    baseSaved?: '2B' | '3B' | 'HOME';
    isTootblan?: boolean;
    isOutAdvancing?: boolean;
    managerIntent?: ManagerRunnerIntent;
    managerRunPlay?: ManagerRunPlay;
    managerDecisionSource?: ManagerDecisionSource;
    managerDecisionNote?: string;
    errorType?: 'fielding' | 'throwing' | 'mental';
    errorChargedTo?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
    errorAttributions?: ErrorAttribution[];
  }>;
  batterReachedOnError?: boolean;
  batterErrorType?: 'fielding' | 'throwing' | 'mental';
  batterErrorChargedToPosition?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  batterCorrectionOriginalResult?: AtBatResult;
  outsRecorded?: number;
  isQualityAtBat?: boolean;
  milestoneTriggered?: Array<{ type: string; description: string }>;

  // 1.16 (GAP-GT-2-J): Enrichment fields
  enrichment?: {
    fieldLocation?: { x: number; y: number; zone?: string };
    exitType?: 'ground_ball' | 'fly_ball' | 'line_drive' | 'popup' | 'bunt' | string;
    chased?: boolean;
    fieldingSequence?: number[];
    fieldingDifficulty?: 'ROUTINE' | 'DIVING' | 'WALL' | 'RUNNING' | 'LEAPING';
    fieldingPlayType?:
      | 'routine'
      | 'charging'
      | 'running'
      | 'diving'
      | 'leaping'
      | 'sliding'
      | 'wall'
      | 'over_shoulder'
      | 'robbed_hr'
      | 'failed_robbery'
      | 'beat_runner'
      | 'beat_throw'
      | 'missed_dive'
      | 'missed_leap';
    putouts?: number[];
    assists?: number[];
    errors?: Array<{ position: number; type: 'fielding' | 'throwing' | 'mental' }>;
    batterOutAdvancing?: boolean;
    basesSaved?: 1 | 2;
    savedRun?: boolean;
    extraGemCreditPositions?: number[];
    rescuedThrow?: boolean;
    hrDistance?: number;
    pitchType?: string;
    pitchLocation?: 'low' | 'high' | 'inside' | 'outside' | 'outOfZone';
    pitchesInAtBat?: number;
    modifiers?: string[];
    managerBuntIntent?: ManagerBuntIntent;
    managerDecisionSource?: ManagerDecisionSource;
  };

  // 1.17 (GAP-GT-2-K): Versioning
  version?: number;
  editHistory?: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
    timestamp: number;
  }>;
}

// ============================================
// LAYER 1C: BETWEEN-PLAY EVENT (§2.2)
// ============================================

/** Discriminated union type for all between-play event types */
export type BetweenPlayEventType =
  | 'stolen_base' | 'caught_stealing' | 'pickoff'
  | 'wild_pitch' | 'passed_ball' | 'balk'
  | 'defensive_indifference' | 'runner_advance'
  | 'pitcher_change' | 'substitution' | 'position_change'
  | 'mojo_change' | 'fitness_change' | 'injury'
  | 'pitch_count_update' | 'manager_moment'
  | 'manager_recommendation';

export type PromptedManagerDecisionType = Extract<
  ManagerDecisionType,
  'leave_pitcher_in' | 'let_batter_hit' | 'keep_defender_in'
>;

export type PromptedManagerDecisionAction =
  | 'keep_pitcher'
  | 'let_batter_hit'
  | 'decline_defensive_sub';

export interface PromptedManagerDecisionEvent {
  decisionType: PromptedManagerDecisionType;
  action: PromptedManagerDecisionAction;
  source: 'recommendation' | 'manual_manager_moment';
  decisionSource?: ManagerDecisionSource;
  confidence?: ManagerDecisionConfidence;
  managerId: string;
  teamId: string;
  opponentTeamId: string;
  trackedPlayerIds: string[];
  involvedPlayerIds?: string[];
  playerId?: string;
  playerName?: string;
  leverageIndex?: number;
  recommendationId?: string;
  provenanceKey?: string;
  resolution?: {
    status: 'pending';
    expectedEndpoint: ManagerDecisionResolutionEndpoint;
  };
}

export interface ErrorAttribution {
  type: 'fielding' | 'throwing' | 'mental';
  fielderIds?: string[];
  positions?: Array<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9>;
}

/** Formal between-play event interface per spec §2.2 */
export interface BetweenPlayEvent {
  eventId: string;
  gameId: string;
  seasonId?: string;
  seasonNumber?: number;
  statsScopeId?: string;
  competitionType?: CompetitionType;
  competitionId?: string;
  franchiseId?: string;
  scheduleGameId?: string;
  leagueId?: string;
  playoffId?: string;
  playoffSeriesId?: string;
  playoffGameNumber?: number;
  timestamp: number;
  eventIndex: number;              // Interleaved with AtBatEvent indices
  undoneAt?: number | null;
  version?: number;
  linkedEventId?: string;
  eventGroupId?: string;
  editHistory?: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
    timestamp: number;
  }>;

  type: BetweenPlayEventType;

  // Game state snapshot at time of event
  gameState?: {
    inning: number;
    halfInning: 'TOP' | 'BOTTOM';
    outs: number;
    totalInnings?: number;
    score: { away: number; home: number };
    useGhostRunner?: boolean;
    extraInningRunner?: boolean;
    extraInningRunnerDelay?: 1 | 2;
    runnersOn?: {
      first?: string;
      second?: string;
      third?: string;
    };
  };

  // Type-specific payloads (only the one matching `type` is populated)
  stolenBase?: {
    runnerId: string;
    runnerName?: string;
    fromBase: 1 | 2 | 3;
    toBase: 2 | 3 | 4;
    isSuccessful: boolean;
    caughtBy?: number;           // Position number
  };

  runnerAction?: {
    runnerId: string;
    runnerName?: string;
    fromBase: 1 | 2 | 3;
    toBase: 1 | 2 | 3 | 4;
    outcome: 'safe' | 'out';
    reason: 'stolen_base' | 'caught_stealing' | 'pickoff' | 'wild_pitch' | 'passed_ball' | 'advance' | 'advance_on_error';
    managerIntent?: ManagerRunnerIntent;
    managerRunPlay?: ManagerRunPlay;
    managerDecisionSource?: ManagerDecisionSource;
    managerDecisionNote?: string;
  };

  pitcherChange?: {
    outgoingPitcherId: string;
    outgoingPitcherName?: string;
    incomingPitcherId: string;
    incomingPitcherName?: string;
    inheritedRunners: number;
    outgoingPitchCount?: number;
    outgoingIP?: number;
  };

  substitution?: {
    subType: 'pinch_hit' | 'pinch_run' | 'defensive_replacement' | 'position_change';
    outPlayerId: string;
    outPlayerName?: string;
    outPosition?: string;
    inPlayerId: string;
    inPlayerName?: string;
    inPosition?: string;
    previousPosition?: string;   // For position_change
  };

  playerStateChange?: {
    playerId: string;
    playerName?: string;
    stateType: 'mojo' | 'fitness' | 'injury';
    previousValue: string | number;
    newValue: string | number;
    reason?: string;
    sourceEventType?: string;
    causedByPlayerId?: string;
    causedByPlayerName?: string;
    stayedIn?: boolean;
  };

  runnerAttribution?: {
    pitcherId?: string;
    pitcherName?: string;
    catcherId?: string;
    catcherName?: string;
    fielderId?: string;
    fielderName?: string;
    fielderPosition?: number;
  };
  errorAttributions?: ErrorAttribution[];

  errorChargedTo?: 'pitcher' | 'catcher' | 'fielder';

  wildPitchOrPassedBall?: {
    wpOrPb: 'wild_pitch' | 'passed_ball';
    pitcherId: string;
    catcherId?: string;
    runnersAdvanced?: Array<{ runnerId: string; fromBase: number; toBase: number }>;
    runScored?: string;          // Player ID who scored
  };

  pitchCountUpdate?: {
    pitcherId: string;
    pitchCount: number;
    timing: 'end_of_half_inning' | 'pitcher_removed' | 'end_of_game';
  };

  managerMoment?: {
    leverageIndex: number;
    decisionType: string;
    context?: string;
    outcomeEventId?: string;
    outcomeWPA?: number;
  };

  promptedManagerDecision?: PromptedManagerDecisionEvent;
  managerRecommendationWatch?: ManagerRecommendationWatchEvent;
}

/** Runner state for situational tracking */
export interface RunnerState {
  first: RunnerInfo | null;
  second: RunnerInfo | null;
  third: RunnerInfo | null;
}

export interface RunnerInfo {
  runnerId: string;
  runnerName: string;
  responsiblePitcherId: string;  // For earned run attribution
}

/** Ball in play data for fielding */
export interface BallInPlayData {
  trajectory: 'ground' | 'line' | 'fly' | 'popup' | 'bunt';
  zone: number;                  // Field zone (1-6 or more detailed)
  velocity: 'soft' | 'medium' | 'hard';
  fielderIds: string[];          // Who fielded the ball
  primaryFielderId: string;      // Who gets primary credit/blame
}

/** Fame event linked to at-bat */
export interface FameEventRecord {
  eventType: string;
  fameType: 'bonus' | 'boner';
  fameValue: number;
  playerId: string;
  playerName: string;
  description: string;
}

/** Pitching appearance for inherited runner tracking */
export interface PitchingAppearance {
  appearanceId: string;          // `${gameId}_${pitcherId}_${entrySequence}`
  gameId: string;
  pitcherId: string;
  pitcherName: string;
  teamId: string;

  // Entry
  entryInning: number;
  entryHalfInning: HalfInning;
  entryOuts: number;
  entrySequence: number;         // At-bat sequence when entered
  isStarter: boolean;

  // Inherited runners
  inheritedRunners: RunnerInfo[];
  inheritedRunnersScored: number;

  // Exit (null if still pitching)
  exitInning: number | null;
  exitHalfInning: HalfInning | null;
  exitOuts: number | null;
  exitSequence: number | null;

  // Bequeathed runners
  bequeathedRunners: RunnerInfo[];
  bequeathedRunnersScored: number;

  // Game stats (accumulated)
  outsRecorded: number;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walksAllowed: number;
  strikeouts: number;
  homeRunsAllowed: number;
  hitBatsmen: number;
  wildPitches: number;
  battersFaced: number;
}

export interface UndoneGameAction {
  kind: 'atBat' | 'betweenPlay';
  eventId: string;
  eventIndex: number;
}

/** Fielding event for FWAR */
export interface FieldingEvent {
  fieldingEventId: string;
  gameId: string;
  atBatEventId: string;
  sequence: number;

  // Fielder identification
  // NOTE: new fielding rows should carry stable runtime player identity.
  // Older local test data may still contain position-shaped IDs.
  playerId: string;
  playerName: string;
  position: Position;
  teamId: string;  // Which team made the fielding play

  playType: 'putout' | 'assist' | 'error' | 'double_play_pivot' | 'outfield_assist' | 'base_save';
  difficulty: 'routine' | 'likely' | '50-50' | 'unlikely' | 'spectacular';
  specialPlayType?: SpecialPlayType | null;

  // For range calculation
  ballInPlay: BallInPlayData;

  // Result
  success: boolean;
  runsPreventedOrAllowed: number;  // Positive = prevented, negative = allowed
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Create a new game header
 * Called at game start
 */
export async function createGameHeader(header: Omit<GameHeader, 'aggregated' | 'aggregatedAt' | 'aggregationError' | 'eventCount' | 'checksum'>): Promise<void> {
  const db = await initEventLogDB();

  const fullHeader: GameHeader = {
    ...header,
    aggregated: false,
    aggregatedAt: null,
    aggregationError: null,
    eventCount: 0,
    checksum: '',
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.GAME_HEADERS, 'readwrite');
    const store = transaction.objectStore(STORES.GAME_HEADERS);
    const request = store.put(fullHeader);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      syncUpsert(STORES.GAME_HEADERS, fullHeader.gameId, fullHeader);
      resolve();
    };
  });
}

export async function deleteCompetitionEventLogData(
  competitionType: CompetitionType,
  competitionId: string,
): Promise<void> {
  const db = await initEventLogDB();

  const gameIds = await new Promise<string[]>((resolve, reject) => {
    const transaction = db.transaction(STORES.GAME_HEADERS, 'readonly');
    const store = transaction.objectStore(STORES.GAME_HEADERS);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const matchingIds = (request.result as GameHeader[])
        .filter((header) => header.competitionType === competitionType && header.competitionId === competitionId)
        .map((header) => header.gameId);
      resolve(matchingIds);
    };
  });

  if (gameIds.length === 0) {
    return;
  }

  const deletedKeys: Array<{ storeName: string; key: string }> = [];

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(
      [
        STORES.GAME_HEADERS,
        STORES.AT_BAT_EVENTS,
        STORES.PITCHING_APPEARANCES,
        STORES.FIELDING_EVENTS,
        STORES.BETWEEN_PLAY_EVENTS,
      ],
      'readwrite',
    );

    for (const gameId of gameIds) {
      transaction.objectStore(STORES.GAME_HEADERS).delete(gameId);
      deletedKeys.push({ storeName: STORES.GAME_HEADERS, key: gameId });

      for (const storeName of [
        STORES.AT_BAT_EVENTS,
        STORES.PITCHING_APPEARANCES,
        STORES.FIELDING_EVENTS,
        STORES.BETWEEN_PLAY_EVENTS,
      ] as const) {
        const store = transaction.objectStore(storeName);
        const index = store.index('gameId');
        const request = index.openCursor(gameId);
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            deletedKeys.push({ storeName, key: cursor.primaryKey as string });
            cursor.delete();
            cursor.continue();
          }
        };
        request.onerror = () => reject(request.error);
      }
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

  for (const { storeName, key } of deletedKeys) {
    syncRemove(storeName, key);
  }
}

/**
 * Log an at-bat event
 * Called IMMEDIATELY after each at-bat (not debounced)
 */
export async function logAtBatEvent(event: AtBatEvent): Promise<void> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.AT_BAT_EVENTS, STORES.GAME_HEADERS], 'readwrite');
    const storedEvent = {
      ...event,
      version: event.version ?? 1,
      editHistory: event.editHistory ?? [],
    };
    let updatedHeader: GameHeader | null = null;

    // Add the event
    const eventStore = transaction.objectStore(STORES.AT_BAT_EVENTS);
    eventStore.put(storedEvent);

    // Increment event count in header
    const headerStore = transaction.objectStore(STORES.GAME_HEADERS);
    const headerRequest = headerStore.get(event.gameId);

    headerRequest.onsuccess = () => {
      const header = headerRequest.result as GameHeader;
      if (header) {
        header.eventCount += 1;
        headerStore.put(header);
        updatedHeader = header;
      }
    };

    transaction.oncomplete = () => {
      syncUpsert(STORES.AT_BAT_EVENTS, storedEvent.eventId, storedEvent);
      if (updatedHeader) {
        syncUpsert(STORES.GAME_HEADERS, updatedHeader.gameId, updatedHeader);
      }
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Log a pitching appearance
 */
export async function logPitchingAppearance(appearance: PitchingAppearance): Promise<void> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PITCHING_APPEARANCES, 'readwrite');
    const store = transaction.objectStore(STORES.PITCHING_APPEARANCES);
    const request = store.put(appearance);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      syncUpsert(STORES.PITCHING_APPEARANCES, appearance.appearanceId, appearance);
      resolve();
    };
  });
}

/**
 * Log a fielding event
 */
export async function logFieldingEvent(event: FieldingEvent): Promise<void> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.FIELDING_EVENTS, 'readwrite');
    const store = transaction.objectStore(STORES.FIELDING_EVENTS);
    const request = store.put(event);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      syncUpsert(STORES.FIELDING_EVENTS, event.fieldingEventId, event);
      resolve();
    };
  });
}

/**
 * Log a between-play event (SB, WP, substitution, mojo change, etc.)
 */
export async function logBetweenPlayEvent(event: BetweenPlayEvent): Promise<void> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.BETWEEN_PLAY_EVENTS, 'readwrite');
    const store = transaction.objectStore(STORES.BETWEEN_PLAY_EVENTS);
    const storedEvent = {
      ...event,
      version: event.version ?? 1,
      editHistory: event.editHistory ?? [],
    };
    const request = store.put(storedEvent);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      syncUpsert(STORES.BETWEEN_PLAY_EVENTS, storedEvent.eventId, storedEvent);
      resolve();
    };
  });
}

function applyBetweenPlayEventUpdates(
  existing: BetweenPlayEvent,
  updates: Partial<BetweenPlayEvent>,
): BetweenPlayEvent {
  const next = { ...existing, ...updates };

  if (updates.editHistory) {
    next.editHistory = [...(existing.editHistory || []), ...updates.editHistory];
  } else if (!next.editHistory) {
    next.editHistory = existing.editHistory || [];
  }

  if (updates.version === undefined) {
    next.version = existing.version ?? 1;
  }

  return next;
}

function assertAuditedAtBatOutcomeEdit(
  existing: AtBatEvent,
  updates: {
    result?: AtBatResult;
    version?: number;
    editHistory?: AtBatEvent['editHistory'];
  },
): void {
  if (updates.result === undefined || updates.result === existing.result) {
    return;
  }

  const existingVersion = existing.version ?? 1;
  const hasVersionBump =
    typeof updates.version === 'number' && updates.version > existingVersion;
  const hasAuditTrail =
    Array.isArray(updates.editHistory) && updates.editHistory.length > 0;

  if (!hasVersionBump || !hasAuditTrail) {
    throw new Error(
      'Mode 2 v1 outcome corrections must include a version bump and editHistory.',
    );
  }
}

function applyAtBatEventUpdates(
  existing: AtBatEvent,
  updates: Partial<Pick<
    AtBatEvent,
    | 'enrichment'
    | 'result'
    | 'isQualityAtBat'
    | 'version'
    | 'editHistory'
    | 'runnerOutcomes'
    | 'batterReachedOnError'
    | 'batterErrorType'
    | 'batterErrorChargedToPosition'
    | 'batterCorrectionOriginalResult'
    | 'rbiCount'
    | 'runsScored'
    | 'outsAfter'
    | 'runnersAfter'
    | 'awayScoreAfter'
    | 'homeScoreAfter'
    | 'leverageIndex'
    | 'winProbabilityBefore'
    | 'winProbabilityAfter'
    | 'wpa'
    | 'wpaModelVersion'
    | 'homeDelta'
    | 'battingTeamDelta'
    | 'fieldingTeamDelta'
    | 'totalInnings'
    | 'useGhostRunner'
    | 'extraInningRunner'
    | 'extraInningRunnerDelay'
    | 'outsRecorded'
    | 'isWalkOff'
  >>,
  fallbackPolicy?: WpaPolicyFallback,
): AtBatEvent {
  const next = { ...existing };

  if (updates.enrichment) {
    next.enrichment = { ...(next.enrichment || {}), ...updates.enrichment };
  }
  if (updates.result !== undefined) next.result = updates.result;
  if (updates.isQualityAtBat !== undefined) next.isQualityAtBat = updates.isQualityAtBat;
  if (updates.runnerOutcomes !== undefined) next.runnerOutcomes = updates.runnerOutcomes;
  if (updates.batterReachedOnError !== undefined) next.batterReachedOnError = updates.batterReachedOnError;
  if (updates.batterErrorType !== undefined) next.batterErrorType = updates.batterErrorType;
  if (updates.batterErrorChargedToPosition !== undefined) next.batterErrorChargedToPosition = updates.batterErrorChargedToPosition;
  if (updates.batterCorrectionOriginalResult !== undefined) next.batterCorrectionOriginalResult = updates.batterCorrectionOriginalResult;
  if (updates.rbiCount !== undefined) next.rbiCount = updates.rbiCount;
  if (updates.runsScored !== undefined) next.runsScored = updates.runsScored;
  if (updates.outsAfter !== undefined) next.outsAfter = updates.outsAfter;
  if (updates.runnersAfter !== undefined) next.runnersAfter = updates.runnersAfter;
  if (updates.awayScoreAfter !== undefined) next.awayScoreAfter = updates.awayScoreAfter;
  if (updates.homeScoreAfter !== undefined) next.homeScoreAfter = updates.homeScoreAfter;
  if (updates.leverageIndex !== undefined) next.leverageIndex = updates.leverageIndex;
  if (updates.winProbabilityBefore !== undefined) next.winProbabilityBefore = updates.winProbabilityBefore;
  if (updates.winProbabilityAfter !== undefined) next.winProbabilityAfter = updates.winProbabilityAfter;
  if (updates.wpa !== undefined) next.wpa = updates.wpa;
  if (updates.wpaModelVersion !== undefined) next.wpaModelVersion = updates.wpaModelVersion;
  if (updates.homeDelta !== undefined) next.homeDelta = updates.homeDelta;
  if (updates.battingTeamDelta !== undefined) next.battingTeamDelta = updates.battingTeamDelta;
  if (updates.fieldingTeamDelta !== undefined) next.fieldingTeamDelta = updates.fieldingTeamDelta;
  if (updates.totalInnings !== undefined) next.totalInnings = updates.totalInnings;
  if (updates.useGhostRunner !== undefined) next.useGhostRunner = updates.useGhostRunner;
  if (updates.extraInningRunner !== undefined) next.extraInningRunner = updates.extraInningRunner;
  if (updates.extraInningRunnerDelay !== undefined) next.extraInningRunnerDelay = updates.extraInningRunnerDelay;
  if (updates.outsRecorded !== undefined) next.outsRecorded = updates.outsRecorded;
  if (updates.isWalkOff !== undefined) next.isWalkOff = updates.isWalkOff;
  if (updates.version !== undefined) next.version = updates.version;
  if (updates.editHistory) {
    next.editHistory = [...(next.editHistory || []), ...updates.editHistory];
  }

  if (shouldRefreshStoredWpa(updates)) {
    return refreshStoredWpa(next, fallbackPolicy);
  }

  return next;
}

type WpaPolicyFallback = Partial<
  Pick<
    AtBatEvent,
    'totalInnings' | 'useGhostRunner' | 'extraInningRunner' | 'extraInningRunnerDelay'
  >
>;

function runnerStateToBaseBooleans(runners: RunnerState): { first: boolean; second: boolean; third: boolean } {
  return {
    first: !!runners.first,
    second: !!runners.second,
    third: !!runners.third,
  };
}

function shouldRefreshStoredWpa(
  updates: Partial<Pick<
    AtBatEvent,
    | 'result'
    | 'runnerOutcomes'
    | 'batterReachedOnError'
    | 'batterErrorType'
    | 'batterErrorChargedToPosition'
    | 'rbiCount'
    | 'runsScored'
    | 'outsAfter'
    | 'runnersAfter'
    | 'awayScoreAfter'
    | 'homeScoreAfter'
    | 'winProbabilityBefore'
    | 'winProbabilityAfter'
    | 'wpa'
    | 'wpaModelVersion'
    | 'homeDelta'
    | 'battingTeamDelta'
    | 'fieldingTeamDelta'
    | 'totalInnings'
    | 'useGhostRunner'
    | 'extraInningRunner'
    | 'extraInningRunnerDelay'
    | 'outsRecorded'
    | 'isWalkOff'
  >>,
): boolean {
  return (
    updates.result !== undefined ||
    updates.runnerOutcomes !== undefined ||
    updates.batterReachedOnError !== undefined ||
    updates.batterErrorType !== undefined ||
    updates.batterErrorChargedToPosition !== undefined ||
    updates.rbiCount !== undefined ||
    updates.runsScored !== undefined ||
    updates.outsAfter !== undefined ||
    updates.runnersAfter !== undefined ||
    updates.awayScoreAfter !== undefined ||
    updates.homeScoreAfter !== undefined ||
    updates.winProbabilityBefore !== undefined ||
    updates.winProbabilityAfter !== undefined ||
    updates.wpa !== undefined ||
    updates.wpaModelVersion !== undefined ||
    updates.homeDelta !== undefined ||
    updates.battingTeamDelta !== undefined ||
    updates.fieldingTeamDelta !== undefined ||
    updates.totalInnings !== undefined ||
    updates.useGhostRunner !== undefined ||
    updates.extraInningRunner !== undefined ||
    updates.extraInningRunnerDelay !== undefined ||
    updates.outsRecorded !== undefined ||
    updates.isWalkOff !== undefined
  );
}

function shouldHydrateWpaPolicy(
  existing: AtBatEvent,
  updates: Partial<
    Pick<
      AtBatEvent,
      'totalInnings' | 'useGhostRunner' | 'extraInningRunner' | 'extraInningRunnerDelay'
    >
  >,
): boolean {
  return (
    updates.totalInnings === undefined &&
    existing.totalInnings === undefined
  ) || (
    updates.useGhostRunner === undefined &&
    existing.useGhostRunner === undefined
  ) || (
    updates.extraInningRunner === undefined &&
    existing.extraInningRunner === undefined
  ) || (
    updates.extraInningRunnerDelay === undefined &&
    existing.extraInningRunnerDelay === undefined
  );
}

function wpaPolicyFallbackFromHeader(
  header: GameHeader | undefined,
): WpaPolicyFallback | undefined {
  if (!header) return undefined;

  return {
    totalInnings: header.totalInnings,
    useGhostRunner: header.useGhostRunner,
    extraInningRunner: header.extraInningRunner,
    extraInningRunnerDelay: header.extraInningRunnerDelay,
  };
}

function refreshStoredWpa(
  event: AtBatEvent,
  fallbackPolicy?: WpaPolicyFallback,
): AtBatEvent {
  const totalInnings = event.totalInnings ?? fallbackPolicy?.totalInnings;
  const useGhostRunner = event.useGhostRunner ?? fallbackPolicy?.useGhostRunner;
  const extraInningRunner =
    event.extraInningRunner ?? fallbackPolicy?.extraInningRunner;
  const extraInningRunnerDelay =
    event.extraInningRunnerDelay ?? fallbackPolicy?.extraInningRunnerDelay;
  const wpaResult = calculateWPA(
    {
      inning: event.inning,
      isTop: event.halfInning === 'TOP',
      outs: event.outs,
      bases: runnerStateToBaseBooleans(event.runners),
      homeScore: event.homeScore,
      awayScore: event.awayScore,
      totalInnings,
      useGhostRunner,
      extraInningRunner,
      extraInningRunnerDelay,
    },
    {
      outs: event.outsAfter,
      bases: runnerStateToBaseBooleans(event.runnersAfter),
      homeScore: event.homeScoreAfter,
      awayScore: event.awayScoreAfter,
    },
  );
  const leverageResult = calculateLeverageIndex({
    inning: event.inning,
    halfInning: event.halfInning,
    outs: Math.min(event.outs, 2) as 0 | 1 | 2,
    runners: runnerStateToBaseBooleans(event.runners),
    homeScore: event.homeScore,
    awayScore: event.awayScore,
    totalInnings,
  });
  const resolvedPolicyFields: WpaPolicyFallback = {};
  if (totalInnings !== undefined) resolvedPolicyFields.totalInnings = totalInnings;
  if (useGhostRunner !== undefined) resolvedPolicyFields.useGhostRunner = useGhostRunner;
  if (extraInningRunner !== undefined) {
    resolvedPolicyFields.extraInningRunner = extraInningRunner;
  }
  if (extraInningRunnerDelay !== undefined) {
    resolvedPolicyFields.extraInningRunnerDelay = extraInningRunnerDelay;
  }

  return {
    ...event,
    ...resolvedPolicyFields,
    ...wpaResult,
    leverageIndex: leverageResult.leverageIndex,
    isClutch: leverageResult.leverageIndex >= 1.5,
  };
}

/**
 * Update an existing AtBatEvent in IndexedDB (for post-hoc enrichment).
 * Mode 2 v1 treats outcome changes as corrections: result edits must carry a
 * version bump and editHistory so the original event is never silently changed.
 * Uses put() which overwrites the record at the same eventId key.
 */
export async function updateAtBatEvent(
  eventId: string,
  updates: Partial<Pick<
    AtBatEvent,
    | 'enrichment'
    | 'result'
    | 'isQualityAtBat'
    | 'version'
    | 'editHistory'
    | 'runnerOutcomes'
    | 'batterReachedOnError'
    | 'batterErrorType'
    | 'batterErrorChargedToPosition'
    | 'batterCorrectionOriginalResult'
    | 'rbiCount'
    | 'runsScored'
    | 'outsAfter'
    | 'runnersAfter'
    | 'awayScoreAfter'
    | 'homeScoreAfter'
    | 'leverageIndex'
    | 'winProbabilityBefore'
    | 'winProbabilityAfter'
    | 'wpa'
    | 'wpaModelVersion'
    | 'homeDelta'
    | 'battingTeamDelta'
    | 'fieldingTeamDelta'
    | 'totalInnings'
    | 'useGhostRunner'
    | 'extraInningRunner'
    | 'extraInningRunnerDelay'
    | 'outsRecorded'
    | 'isWalkOff'
  >>
): Promise<void> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [STORES.AT_BAT_EVENTS, STORES.GAME_HEADERS],
      'readwrite',
    );
    const store = transaction.objectStore(STORES.AT_BAT_EVENTS);
    const headerStore = transaction.objectStore(STORES.GAME_HEADERS);
    const getRequest = store.get(eventId);
    let updatedEvent: AtBatEvent | null = null;

    getRequest.onsuccess = () => {
      const existing = getRequest.result as AtBatEvent | undefined;
      if (!existing) {
        reject(new Error(`AtBatEvent not found: ${eventId}`));
        return;
      }
      try {
        assertAuditedAtBatOutcomeEdit(existing, updates);
      } catch (err) {
        transaction.abort();
        reject(err);
        return;
      }

      const applyAndPersist = (fallbackPolicy?: WpaPolicyFallback) => {
        updatedEvent = applyAtBatEventUpdates(existing, updates, fallbackPolicy);
        store.put(updatedEvent);
      };

      if (shouldRefreshStoredWpa(updates) && shouldHydrateWpaPolicy(existing, updates)) {
        const headerRequest = headerStore.get(existing.gameId);
        headerRequest.onsuccess = () => {
          applyAndPersist(
            wpaPolicyFallbackFromHeader(headerRequest.result as GameHeader | undefined),
          );
        };
        headerRequest.onerror = () => reject(headerRequest.error);
        return;
      }

      applyAndPersist();
    };

    getRequest.onerror = () => reject(getRequest.error);
    transaction.oncomplete = () => {
      if (updatedEvent) {
        syncUpsert(STORES.AT_BAT_EVENTS, updatedEvent.eventId, updatedEvent);
      }
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function updateAtBatEventWithFieldingSync(
  eventId: string,
  updates: Partial<
    Pick<
      AtBatEvent,
      | 'enrichment'
      | 'result'
      | 'isQualityAtBat'
      | 'runnerOutcomes'
      | 'batterReachedOnError'
      | 'batterErrorType'
      | 'batterErrorChargedToPosition'
      | 'batterCorrectionOriginalResult'
      | 'rbiCount'
      | 'runsScored'
      | 'outsAfter'
      | 'runnersAfter'
      | 'awayScoreAfter'
      | 'homeScoreAfter'
      | 'leverageIndex'
      | 'winProbabilityBefore'
      | 'winProbabilityAfter'
      | 'wpa'
      | 'wpaModelVersion'
      | 'homeDelta'
      | 'battingTeamDelta'
      | 'fieldingTeamDelta'
      | 'totalInnings'
      | 'useGhostRunner'
      | 'extraInningRunner'
      | 'extraInningRunnerDelay'
      | 'isWalkOff'
      | 'outsRecorded'
      | 'version'
      | 'editHistory'
    >
  >,
  nextFieldingEvents: FieldingEvent[],
): Promise<void> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [STORES.AT_BAT_EVENTS, STORES.FIELDING_EVENTS, STORES.GAME_HEADERS],
      'readwrite',
    );
    const atBatStore = transaction.objectStore(STORES.AT_BAT_EVENTS);
    const fieldingStore = transaction.objectStore(STORES.FIELDING_EVENTS);
    const headerStore = transaction.objectStore(STORES.GAME_HEADERS);
    const fieldingIndex = fieldingStore.index('atBatEventId');
    const atBatRequest = atBatStore.get(eventId);
    const fieldingRequest = fieldingIndex.getAll(eventId);
    let updatedAtBatEvent: AtBatEvent | null = null;
    let removedFieldingEventIds: string[] = [];

    atBatRequest.onerror = () => reject(atBatRequest.error);
    fieldingRequest.onerror = () => reject(fieldingRequest.error);

    atBatRequest.onsuccess = () => {
      const existing = atBatRequest.result as AtBatEvent | undefined;
      if (!existing) {
        reject(new Error(`AtBatEvent not found: ${eventId}`));
        return;
      }
      try {
        assertAuditedAtBatOutcomeEdit(existing, updates);
      } catch (err) {
        transaction.abort();
        reject(err);
        return;
      }

      const applyAndPersist = (fallbackPolicy?: WpaPolicyFallback) => {
        updatedAtBatEvent = applyAtBatEventUpdates(
          existing,
          updates,
          fallbackPolicy,
        );
        atBatStore.put(updatedAtBatEvent);
      };

      if (shouldRefreshStoredWpa(updates) && shouldHydrateWpaPolicy(existing, updates)) {
        const headerRequest = headerStore.get(existing.gameId);
        headerRequest.onsuccess = () => {
          applyAndPersist(
            wpaPolicyFallbackFromHeader(headerRequest.result as GameHeader | undefined),
          );
        };
        headerRequest.onerror = () => reject(headerRequest.error);
        return;
      }

      applyAndPersist();
    };

    fieldingRequest.onsuccess = () => {
      const existingFieldingEvents = fieldingRequest.result as FieldingEvent[];
      removedFieldingEventIds = existingFieldingEvents.map((event) => event.fieldingEventId);
      existingFieldingEvents.forEach((event) => {
        fieldingStore.delete(event.fieldingEventId);
      });
      nextFieldingEvents.forEach((event) => {
        fieldingStore.put(event);
      });
    };

    transaction.oncomplete = () => {
      if (updatedAtBatEvent) {
        syncUpsert(STORES.AT_BAT_EVENTS, updatedAtBatEvent.eventId, updatedAtBatEvent);
      }
      for (const fieldingEventId of removedFieldingEventIds) {
        syncRemove(STORES.FIELDING_EVENTS, fieldingEventId);
      }
      for (const event of nextFieldingEvents) {
        syncUpsert(STORES.FIELDING_EVENTS, event.fieldingEventId, event);
      }
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function updateBetweenPlayEvent(
  eventId: string,
  updates: Partial<BetweenPlayEvent>,
): Promise<void> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.BETWEEN_PLAY_EVENTS, 'readwrite');
    const store = transaction.objectStore(STORES.BETWEEN_PLAY_EVENTS);
    const getRequest = store.get(eventId);
    let updatedEvent: BetweenPlayEvent | null = null;

    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const existing = getRequest.result as BetweenPlayEvent | undefined;
      if (!existing) {
        reject(new Error(`BetweenPlayEvent not found: ${eventId}`));
        return;
      }

      updatedEvent = applyBetweenPlayEventUpdates(existing, updates);
      store.put(updatedEvent);
    };

    transaction.oncomplete = () => {
      if (updatedEvent) {
        syncUpsert(STORES.BETWEEN_PLAY_EVENTS, updatedEvent.eventId, updatedEvent);
      }
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Mark game as complete
 */
export async function completeGame(
  gameId: string,
  finalScore: { away: number; home: number },
  finalInning: number
): Promise<void> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.GAME_HEADERS, 'readwrite');
    const store = transaction.objectStore(STORES.GAME_HEADERS);
    const request = store.get(gameId);
    let updatedHeader: GameHeader | null = null;

    request.onsuccess = () => {
      const header = request.result as GameHeader;
      if (header) {
        header.finalScore = finalScore;
        header.finalInning = finalInning;
        header.isComplete = true;
        store.put(header);
        updatedHeader = header;
      }
    };

    transaction.oncomplete = () => {
      if (updatedHeader) {
        syncUpsert(STORES.GAME_HEADERS, updatedHeader.gameId, updatedHeader);
      }
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Mark game as aggregated to season stats
 */
export async function markGameAggregated(gameId: string): Promise<void> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.GAME_HEADERS, 'readwrite');
    const store = transaction.objectStore(STORES.GAME_HEADERS);
    const request = store.get(gameId);
    let updatedHeader: GameHeader | null = null;

    request.onsuccess = () => {
      const header = request.result as GameHeader;
      if (header) {
        header.aggregated = true;
        header.aggregatedAt = Date.now();
        header.aggregationError = null;
        store.put(header);
        updatedHeader = header;
      }
    };

    transaction.oncomplete = () => {
      if (updatedHeader) {
        syncUpsert(STORES.GAME_HEADERS, updatedHeader.gameId, updatedHeader);
      }
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Mark aggregation as failed with error
 */
export async function markAggregationFailed(gameId: string, error: string): Promise<void> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.GAME_HEADERS, 'readwrite');
    const store = transaction.objectStore(STORES.GAME_HEADERS);
    const request = store.get(gameId);
    let updatedHeader: GameHeader | null = null;

    request.onsuccess = () => {
      const header = request.result as GameHeader;
      if (header) {
        header.aggregationError = error;
        store.put(header);
        updatedHeader = header;
      }
    };

    transaction.oncomplete = () => {
      if (updatedHeader) {
        syncUpsert(STORES.GAME_HEADERS, updatedHeader.gameId, updatedHeader);
      }
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get all unaggregated games (for recovery on startup)
 */
export async function getUnaggregatedGames(seasonId?: string): Promise<GameHeader[]> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.GAME_HEADERS, 'readonly');
    const store = transaction.objectStore(STORES.GAME_HEADERS);

    // Get all games and filter in JavaScript (simpler than boolean indexing in IndexedDB)
    let request: IDBRequest;
    if (seasonId) {
      const index = store.index('seasonId');
      request = index.getAll(seasonId);
    } else {
      request = store.getAll();
    }

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      // Filter to only complete but unaggregated games
      const games = (request.result as GameHeader[]).filter(g => g.isComplete && !g.aggregated);
      resolve(games);
    };
  });
}

/**
 * Get all at-bat events for a game
 */
export async function getGameEvents(
  gameId: string,
  options?: { includeUndone?: boolean }
): Promise<AtBatEvent[]> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.AT_BAT_EVENTS, 'readonly');
    const store = transaction.objectStore(STORES.AT_BAT_EVENTS);
    const index = store.index('gameId');
    const request = index.getAll(gameId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      // Sort by eventIndex
      const events = (request.result as AtBatEvent[])
        .filter(event => options?.includeUndone || !event.undoneAt)
        .sort((a, b) => a.eventIndex - b.eventIndex);
      resolve(events);
    };
  });
}

export async function getAtBatEvent(eventId: string): Promise<AtBatEvent | null> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.AT_BAT_EVENTS, 'readonly');
    const store = transaction.objectStore(STORES.AT_BAT_EVENTS);
    const request = store.get(eventId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as AtBatEvent | undefined) || null);
  });
}

export async function getMatchupEvents(
  batterId: string,
  pitcherId: string,
  options?: { excludeGameId?: string; includeUndone?: boolean }
): Promise<AtBatEvent[]> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.AT_BAT_EVENTS, 'readonly');
    const store = transaction.objectStore(STORES.AT_BAT_EVENTS);
    const index = store.index('batterId');
    const request = index.getAll(batterId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const events = (request.result as AtBatEvent[])
        .filter((event) =>
          event.pitcherId === pitcherId &&
          (options?.includeUndone || !event.undoneAt) &&
          (!options?.excludeGameId || event.gameId !== options.excludeGameId)
        )
        .sort((a, b) => a.timestamp - b.timestamp || a.eventIndex - b.eventIndex);
      resolve(events);
    };
  });
}

export async function getBetweenPlayEvent(eventId: string): Promise<BetweenPlayEvent | null> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.BETWEEN_PLAY_EVENTS, 'readonly');
    const store = transaction.objectStore(STORES.BETWEEN_PLAY_EVENTS);
    const request = store.get(eventId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as BetweenPlayEvent | undefined) || null);
  });
}

/**
 * Get pitching appearances for a game
 */
export async function getGamePitchingAppearances(gameId: string): Promise<PitchingAppearance[]> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PITCHING_APPEARANCES, 'readonly');
    const store = transaction.objectStore(STORES.PITCHING_APPEARANCES);
    const index = store.index('gameId');
    const request = index.getAll(gameId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as PitchingAppearance[]);
  });
}

/**
 * Get fielding events for a game
 */
export async function getGameFieldingEvents(gameId: string): Promise<FieldingEvent[]> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.FIELDING_EVENTS, 'readonly');
    const store = transaction.objectStore(STORES.FIELDING_EVENTS);
    const index = store.index('gameId');
    const request = index.getAll(gameId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as FieldingEvent[]);
  });
}

export async function getFieldingEventsForAtBat(atBatEventId: string): Promise<FieldingEvent[]> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.FIELDING_EVENTS, 'readonly');
    const store = transaction.objectStore(STORES.FIELDING_EVENTS);
    const index = store.index('atBatEventId');
    const request = index.getAll(atBatEventId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(
      (request.result as FieldingEvent[]).sort((a, b) => a.sequence - b.sequence)
    );
  });
}

/**
 * Get between-play events for a game
 */
export async function getBetweenPlayEvents(
  gameId: string,
  options?: { includeUndone?: boolean }
): Promise<BetweenPlayEvent[]> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.BETWEEN_PLAY_EVENTS, 'readonly');
    const store = transaction.objectStore(STORES.BETWEEN_PLAY_EVENTS);
    const index = store.index('gameId');
    const request = index.getAll(gameId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const events = (request.result as BetweenPlayEvent[])
        .filter(event => options?.includeUndone || !event.undoneAt)
        .sort((a, b) => a.eventIndex - b.eventIndex);
      resolve(events);
    };
  });
}

export async function getSeasonInjuryCountsByPlayer(seasonId: string): Promise<Map<string, number>> {
  const games = await getSeasonGames(seasonId);
  const injuryCounts = new Map<string, number>();

  for (const game of games) {
    const events = await getBetweenPlayEvents(game.gameId);
    for (const event of events) {
      if (event.type !== 'injury' || event.playerStateChange?.stateType !== 'injury') {
        continue;
      }

      const injuredPlayerId = event.playerStateChange.playerId;
      injuryCounts.set(injuredPlayerId, (injuryCounts.get(injuredPlayerId) ?? 0) + 1);
    }
  }

  return injuryCounts;
}

export async function getSeasonInjuryCount(seasonId: string, playerId: string): Promise<number> {
  const counts = await getSeasonInjuryCountsByPlayer(seasonId);
  return counts.get(playerId) ?? 0;
}

export async function undoMostRecentGameAction(gameId: string): Promise<UndoneGameAction | null> {
  const [atBatEvents, betweenPlayEvents] = await Promise.all([
    getGameEvents(gameId),
    getBetweenPlayEvents(gameId),
  ]);
  const undoableBetweenPlayEvents = betweenPlayEvents.filter(
    event => event.type !== 'manager_recommendation'
  );

  const candidates = [
    atBatEvents.length > 0
      ? {
          kind: 'atBat' as const,
          eventId: atBatEvents[atBatEvents.length - 1].eventId,
          eventIndex: atBatEvents[atBatEvents.length - 1].eventIndex,
          timestamp: atBatEvents[atBatEvents.length - 1].timestamp,
        }
      : null,
    undoableBetweenPlayEvents.length > 0
      ? {
          kind: 'betweenPlay' as const,
          eventId: undoableBetweenPlayEvents[undoableBetweenPlayEvents.length - 1].eventId,
          eventIndex: undoableBetweenPlayEvents[undoableBetweenPlayEvents.length - 1].eventIndex,
          timestamp: undoableBetweenPlayEvents[undoableBetweenPlayEvents.length - 1].timestamp,
        }
      : null,
  ].filter(Boolean) as Array<UndoneGameAction & { timestamp: number }>;

  const target = candidates.sort((a, b) => {
    if (a.eventIndex === b.eventIndex) {
      return a.timestamp - b.timestamp;
    }
    return a.eventIndex - b.eventIndex;
  })[candidates.length - 1];

  if (!target) {
    return null;
  }

  const targetBetweenPlay = target.kind === 'betweenPlay'
    ? undoableBetweenPlayEvents.find(event => event.eventId === target.eventId)
    : undefined;
  const relatedBetweenPlayIds = undoableBetweenPlayEvents
    .filter((event) => {
      if (event.eventId === target.eventId) return false;
      if (target.kind === 'atBat') {
        return event.linkedEventId === target.eventId;
      }

      return Boolean(
        (targetBetweenPlay?.eventGroupId && event.eventGroupId === targetBetweenPlay.eventGroupId) ||
        event.linkedEventId === target.eventId ||
        (targetBetweenPlay?.linkedEventId && event.eventId === targetBetweenPlay.linkedEventId),
      );
    })
    .map(event => event.eventId);
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [
        STORES.AT_BAT_EVENTS,
        STORES.BETWEEN_PLAY_EVENTS,
        STORES.GAME_HEADERS,
      ],
      'readwrite'
    );
    const actionStore = transaction.objectStore(
      target.kind === 'atBat' ? STORES.AT_BAT_EVENTS : STORES.BETWEEN_PLAY_EVENTS
    );
    const betweenPlayStore = transaction.objectStore(STORES.BETWEEN_PLAY_EVENTS);
    const actionRequest = actionStore.get(target.eventId);
    let undoneAction: UndoneGameAction | null = null;
    let updatedAction: AtBatEvent | BetweenPlayEvent | null = null;
    const updatedRelatedBetweenPlayEvents: BetweenPlayEvent[] = [];
    let updatedHeader: GameHeader | null = null;

    actionRequest.onerror = () => reject(actionRequest.error);
    actionRequest.onsuccess = () => {
      const existing = actionRequest.result as (AtBatEvent | BetweenPlayEvent | undefined);
      if (!existing || existing.undoneAt) {
        return;
      }

      existing.undoneAt = Date.now();
      actionStore.put(existing);
      updatedAction = existing;
      undoneAction = {
        kind: target.kind,
        eventId: target.eventId,
        eventIndex: target.eventIndex,
      };

      if (target.kind !== 'atBat') {
        return;
      }

      const headerStore = transaction.objectStore(STORES.GAME_HEADERS);
      const headerRequest = headerStore.get(gameId);
      headerRequest.onsuccess = () => {
        const header = headerRequest.result as GameHeader | undefined;
        if (!header) return;
        header.eventCount = Math.max(0, header.eventCount - 1);
        headerStore.put(header);
        updatedHeader = header;
      };
    };

    for (const relatedEventId of relatedBetweenPlayIds) {
      const relatedRequest = betweenPlayStore.get(relatedEventId);
      relatedRequest.onsuccess = () => {
        const related = relatedRequest.result as BetweenPlayEvent | undefined;
        if (!related || related.undoneAt) return;
        related.undoneAt = Date.now();
        betweenPlayStore.put(related);
        updatedRelatedBetweenPlayEvents.push(related);
      };
    }

    transaction.oncomplete = () => {
      if (updatedAction) {
        syncUpsert(
          target.kind === 'atBat' ? STORES.AT_BAT_EVENTS : STORES.BETWEEN_PLAY_EVENTS,
          updatedAction.eventId,
          updatedAction,
        );
      }
      for (const event of updatedRelatedBetweenPlayEvents) {
        syncUpsert(STORES.BETWEEN_PLAY_EVENTS, event.eventId, event);
      }
      if (updatedHeader) {
        syncUpsert(STORES.GAME_HEADERS, updatedHeader.gameId, updatedHeader);
      }
      resolve(undoneAction);
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function undoMostRecentUserAction(gameId: string): Promise<UndoneGameAction | null> {
  return undoMostRecentGameAction(gameId);
}

/**
 * Get game header
 */
export async function getGameHeader(gameId: string): Promise<GameHeader | null> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.GAME_HEADERS, 'readonly');
    const store = transaction.objectStore(STORES.GAME_HEADERS);
    const request = store.get(gameId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

export interface GameScopeQuery {
  statsScopeId?: string;
  seasonId?: string;
  competitionType?: CompetitionType;
  competitionId?: string;
  isComplete?: boolean;
}

export async function getGameHeadersForScope(query: GameScopeQuery): Promise<GameHeader[]> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.GAME_HEADERS, 'readonly');
    const store = transaction.objectStore(STORES.GAME_HEADERS);
    let request: IDBRequest<GameHeader[]>;

    if (!query.statsScopeId && query.seasonId) {
      request = store.index('seasonId').getAll(query.seasonId);
    } else {
      request = store.getAll() as IDBRequest<GameHeader[]>;
    }

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const headers = (request.result || []).filter((header) => {
        const headerScopeId = header.statsScopeId ?? header.seasonId;
        if (query.statsScopeId && headerScopeId !== query.statsScopeId) {
          return false;
        }
        if (!query.statsScopeId && query.seasonId) {
          const matchesSeason = header.seasonId === query.seasonId || headerScopeId === query.seasonId;
          if (!matchesSeason) return false;
        }
        if (query.competitionType && header.competitionType !== query.competitionType) {
          return false;
        }
        if (query.competitionId && header.competitionId !== query.competitionId) {
          return false;
        }
        if (typeof query.isComplete === 'boolean' && header.isComplete !== query.isComplete) {
          return false;
        }
        return true;
      });

      resolve(headers.sort((a, b) => a.date - b.date));
    };
  });
}

export async function getFieldingEventsForScope(query: GameScopeQuery): Promise<FieldingEvent[]> {
  const headers = await getGameHeadersForScope({
    ...query,
    isComplete: query.isComplete ?? true,
  });

  if (headers.length === 0) return [];

  const events = await Promise.all(headers.map((header) => getGameFieldingEvents(header.gameId)));
  return events.flat();
}

/**
 * Get all games for a season (for box score access)
 */
export async function getSeasonGames(seasonId: string): Promise<GameHeader[]> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.GAME_HEADERS, 'readonly');
    const store = transaction.objectStore(STORES.GAME_HEADERS);
    const index = store.index('seasonId');
    const request = index.getAll(seasonId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      // Sort by date
      const games = (request.result as GameHeader[]).sort((a, b) => a.date - b.date);
      resolve(games);
    };
  });
}

// ============================================
// BOX SCORE GENERATION
// ============================================

export interface BoxScoreBatter {
  playerId: string;
  playerName: string;
  battingOrder: number;
  ab: number;
  runs: number;
  hits: number;
  rbi: number;
  walks: number;
  strikeouts: number;
  avg: string;  // Formatted
}

export interface BoxScorePitcher {
  playerId: string;
  playerName: string;
  ip: string;  // Formatted: "5.2"
  hits: number;
  runs: number;
  earnedRuns: number;
  walks: number;
  strikeouts: number;
  homeRuns: number;
  pitchCount?: number;
  decision?: 'W' | 'L' | 'S' | 'H' | 'BS';
}

export interface BoxScore {
  gameId: string;
  date: number;
  awayTeam: {
    id: string;
    name: string;
    runs: number;
    hits: number;
    errors: number;
    batters: BoxScoreBatter[];
    pitchers: BoxScorePitcher[];
  };
  homeTeam: {
    id: string;
    name: string;
    runs: number;
    hits: number;
    errors: number;
    batters: BoxScoreBatter[];
    pitchers: BoxScorePitcher[];
  };
  lineScore: {
    away: number[];  // Runs per inning
    home: number[];
  };
  fameEvents: FameEventRecord[];
}

/**
 * Generate a full box score from event log
 */
export async function generateBoxScore(gameId: string): Promise<BoxScore | null> {
  const header = await getGameHeader(gameId);
  if (!header) return null;

  const events = await getGameEvents(gameId);
  const pitchingAppearances = await getGamePitchingAppearances(gameId);
  const fieldingEvents = await getGameFieldingEvents(gameId);

  // Aggregate batter stats
  const batterStats = new Map<string, BoxScoreBatter & { teamId: string }>();
  const lineScore = { away: [] as number[], home: [] as number[] };
  const allFameEvents: FameEventRecord[] = [];

  // Track runs per inning for line score
  let currentInning = 1;
  let awayInningRuns = 0;
  let homeInningRuns = 0;

  for (const event of events) {
    // Batter stats
    const batterId = event.batterId;
    if (!batterStats.has(batterId)) {
      batterStats.set(batterId, {
        playerId: batterId,
        playerName: event.batterName,
        teamId: event.batterTeamId,
        battingOrder: 0,
        ab: 0,
        runs: 0,
        hits: 0,
        rbi: 0,
        walks: 0,
        strikeouts: 0,
        avg: '.000',
      });
    }
    const batter = batterStats.get(batterId)!;

    // Count at-bat (walks, HBP, IBB, sac don't count as AB)
    // GAP-GT-6-F: Added IBB, changed SH→SAC (AtBatResult uses 'SAC' not 'SH')
    const isAB = !['BB', 'IBB', 'HBP', 'SF', 'SAC'].includes(event.result);
    if (isAB) batter.ab++;

    // Count hit — ITPHR (inside-the-park HR, UX-049) and GRD (ground-rule double,
    // GAP-GT-6-D) are hits. Mirrors canonical HIT_RESULTS (gameReplayAudit.ts) and
    // isHit() in useGameState.ts. Both already count as AB above (not in the non-AB list).
    const isHit = ['1B', '2B', '3B', 'HR', 'ITPHR', 'GRD'].includes(event.result);
    if (isHit) batter.hits++;

    // Other stats
    batter.rbi += event.rbiCount;
    if (event.result === 'BB' || event.result === 'IBB') batter.walks++;
    // Strikeouts: K/Kc plus the 'Ꝁ' glyph (UX-048 called-K button; live play collapses
    // it to 'Kc' at GameTracker.tsx, so a raw 'Ꝁ' is latent today but handled defensively
    // to match the rest of the codebase) and the dropped-third-strike family (D3K/WP_K/PB_K,
    // which are batter strikeouts even though he reaches). Mirrors canonical STRIKEOUT_RESULTS.
    if (['K', 'Kc', 'Ꝁ', 'D3K', 'WP_K', 'PB_K'].includes(event.result)) batter.strikeouts++;

    // Line score tracking
    if (event.inning > currentInning) {
      // Save previous inning
      lineScore.away.push(awayInningRuns);
      lineScore.home.push(homeInningRuns);
      awayInningRuns = 0;
      homeInningRuns = 0;
      currentInning = event.inning;
    }

    if (event.halfInning === 'TOP') {
      awayInningRuns += event.awayScoreAfter - event.awayScore;
    } else {
      homeInningRuns += event.homeScoreAfter - event.homeScore;
    }

    // Collect fame events
    allFameEvents.push(...event.fameEvents);
  }

  // Push final inning
  lineScore.away.push(awayInningRuns);
  lineScore.home.push(homeInningRuns);

  // Calculate averages
  for (const batter of batterStats.values()) {
    if (batter.ab > 0) {
      batter.avg = (batter.hits / batter.ab).toFixed(3).replace(/^0/, '');
    }
  }

  // Count team errors from fielding events
  const awayErrors = fieldingEvents.filter(
    (f) => !f.success && f.playType === 'error' && f.teamId === header.awayTeamId
  ).length;
  const homeErrors = fieldingEvents.filter(
    (f) => !f.success && f.playType === 'error' && f.teamId === header.homeTeamId
  ).length;

  // Split batters and pitchers by team
  const awayBatters = Array.from(batterStats.values())
    .filter(b => b.teamId === header.awayTeamId)
    .map(withoutTeamId);
  const homeBatters = Array.from(batterStats.values())
    .filter(b => b.teamId === header.homeTeamId)
    .map(withoutTeamId);

  const awayPitchers = pitchingAppearances
    .filter(p => p.teamId === header.awayTeamId)
    .map(app => ({
      playerId: app.pitcherId,
      playerName: app.pitcherName,
      ip: formatInningsPitched(app.outsRecorded),
      hits: app.hitsAllowed,
      runs: app.runsAllowed,
      earnedRuns: app.earnedRuns,
      walks: app.walksAllowed,
      strikeouts: app.strikeouts,
      homeRuns: app.homeRunsAllowed,
    }));

  const homePitchers = pitchingAppearances
    .filter(p => p.teamId === header.homeTeamId)
    .map(app => ({
      playerId: app.pitcherId,
      playerName: app.pitcherName,
      ip: formatInningsPitched(app.outsRecorded),
      hits: app.hitsAllowed,
      runs: app.runsAllowed,
      earnedRuns: app.earnedRuns,
      walks: app.walksAllowed,
      strikeouts: app.strikeouts,
      homeRuns: app.homeRunsAllowed,
    }));

  return {
    gameId,
    date: header.date,
    awayTeam: {
      id: header.awayTeamId,
      name: header.awayTeamName,
      runs: header.finalScore?.away ?? 0,
      hits: awayBatters.reduce((sum, b) => sum + b.hits, 0),
      errors: awayErrors,
      batters: awayBatters,
      pitchers: awayPitchers,
    },
    homeTeam: {
      id: header.homeTeamId,
      name: header.homeTeamName,
      runs: header.finalScore?.home ?? 0,
      hits: homeBatters.reduce((sum, b) => sum + b.hits, 0),
      errors: homeErrors,
      batters: homeBatters,
      pitchers: homePitchers,
    },
    lineScore,
    fameEvents: allFameEvents,
  };
}

function formatInningsPitched(outs: number): string {
  const full = Math.floor(outs / 3);
  const partial = outs % 3;
  return `${full}.${partial}`;
}

// ============================================
// INTEGRITY & RECOVERY
// ============================================

/**
 * Check data integrity on app startup
 * Returns list of games needing re-aggregation
 */
export async function checkDataIntegrity(): Promise<{
  needsAggregation: GameHeader[];
  hasErrors: GameHeader[];
  incompleteGames: GameHeader[];
}> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.GAME_HEADERS, 'readonly');
    const store = transaction.objectStore(STORES.GAME_HEADERS);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const games = request.result as GameHeader[];

      const needsAggregation = games.filter(g => g.isComplete && !g.aggregated);
      const hasErrors = games.filter(g => g.aggregationError !== null);
      const incompleteGames = games.filter(g => !g.isComplete);

      resolve({ needsAggregation, hasErrors, incompleteGames });
    };
  });
}

/**
 * Verify event count matches stored count
 */
export async function verifyGameIntegrity(gameId: string): Promise<{
  valid: boolean;
  storedCount: number;
  actualCount: number;
}> {
  const header = await getGameHeader(gameId);
  if (!header) return { valid: false, storedCount: 0, actualCount: 0 };

  const events = await getGameEvents(gameId);

  return {
    valid: header.eventCount === events.length,
    storedCount: header.eventCount,
    actualCount: events.length,
  };
}
