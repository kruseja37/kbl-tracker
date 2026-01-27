// Game State Types - Per Master Spec Section 4

export type HalfInning = 'TOP' | 'BOTTOM';
export type Direction = 'Left' | 'Left-Center' | 'Center' | 'Right-Center' | 'Right';
export type ExitType = 'Ground' | 'Line Drive' | 'Fly Ball' | 'Pop Up';
export type Position = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH' | 'SP' | 'RP' | 'CP' | 'IF' | 'OF';
export type BatterHand = 'L' | 'R' | 'S';

export type AtBatResult =
  | '1B' | '2B' | '3B' | 'HR' | 'BB' | 'IBB' | 'K' | 'KL'
  | 'GO' | 'FO' | 'LO' | 'PO' | 'DP' | 'SF' | 'SAC' | 'HBP' | 'E' | 'FC' | 'D3K';

export type GameEvent = 'SB' | 'CS' | 'WP' | 'PB' | 'PK' | 'BALK' | 'PITCH_CHANGE' | 'PINCH_HIT' | 'PINCH_RUN' | 'DEF_SUB' | 'POS_SWITCH';
// Special play types for outs and hits
// For outs: Routine, Diving, Wall Catch, Running, Leaping
// For hits: Clean (no fielding attempt), Diving, Leaping, Robbery Attempt
// For HRs: Over Fence (default), Robbery Attempt, Wall Scraper (BUG-015)
export type SpecialPlayType = 'Routine' | 'Diving' | 'Wall Catch' | 'Running' | 'Leaping' | 'Clean' | 'Robbery Attempt' | 'Over Fence' | 'Wall Scraper';
export type RunnerOutcome = 'SCORED' | 'TO_3B' | 'TO_2B' | 'HELD' | 'OUT_HOME' | 'OUT_3B' | 'OUT_2B';

// Extra event types for inferred advancement events
export type ExtraEventType = 'SB' | 'WP' | 'PB' | 'E' | 'BALK';

// Extra event recorded when runner advances beyond standard
export interface ExtraEvent {
  runner: string;
  from: '1B' | '2B' | '3B';
  to: '2B' | '3B' | 'HOME';
  event: ExtraEventType;
}

// ============================================
// FIELDING TYPES - Per FIELDING_SYSTEM_SPEC.md
// ============================================

export type PlayType = 'routine' | 'diving' | 'leaping' | 'wall' | 'charging' |
                       'running' | 'sliding' | 'over_shoulder' |
                       'error' | 'robbed_hr' | 'failed_robbery';
export type ErrorType = 'fielding' | 'throwing' | 'mental' | 'missed_catch' | 'collision';
export type D3KOutcome = 'OUT' | 'WP' | 'PB' | 'E_CATCHER' | 'E_1B';
export type DepthType = 'shallow' | 'infield' | 'outfield' | 'deep';
export type AssistType = 'infield' | 'outfield' | 'relay' | 'cutoff';
export type DPRole = 'started' | 'turned' | 'completed' | 'unassisted';

export interface ErrorContext {
  allowedRun: boolean;
  wasRoutine: boolean;
  wasDifficult: boolean;
}

export interface AssistChainEntry {
  position: Position;
  playerId?: string;
  assistType?: AssistType;
  targetBase?: '1B' | '2B' | '3B' | 'HOME';
}

export interface FieldingData {
  // Primary fielding
  primaryFielder: Position;
  playType: PlayType;
  errorType?: ErrorType;
  errorContext?: ErrorContext;

  // Zone-based input (per FIELD_ZONE_INPUT_SPEC.md)
  zoneId?: string;
  foulOut?: boolean;  // Ball caught in foul territory (PO/FO/LO in foul zone)

  // Batted ball depth (per FIELDING_SYSTEM_SPEC.md)
  depth?: DepthType;

  // Assist chain (for DPs, relay throws, etc.)
  assistChain: AssistChainEntry[];
  putoutPosition: Position;

  // DP role tracking (for fWAR credit assignment)
  dpRole?: DPRole;

  // Inference tracking
  inferredFielder: Position;
  wasOverridden: boolean;

  // Edge cases
  infieldFlyRule: boolean;
  ifrBallCaught: boolean | null;
  groundRuleDouble: boolean;
  badHopEvent: boolean;

  // D3K tracking
  d3kEvent: boolean;
  d3kOutcome: D3KOutcome | null;

  // SMB4 specific
  nutshotEvent: boolean;
  comebackerInjury: boolean;
  robberyAttempted: boolean;
  robberyFailed: boolean;

  // Fame/clutch triggers
  savedRun: boolean;
}

export interface Runner {
  playerId: string;
  playerName: string;
  inheritedFrom: string | null;
  howReached?: 'hit' | 'walk' | 'hbp' | 'error' | 'fc';  // For ER tracking
}

export interface Bases {
  first: Runner | null;
  second: Runner | null;
  third: Runner | null;
}

export interface SituationalContext {
  isCloseGame: boolean;
  isClutchSituation: boolean;
  isRISP: boolean;
  isBasesLoaded: boolean;
  scoreDifferential: number;
  isLateInning: boolean;
  isTieGame: boolean;
  isWalkOffOpportunity: boolean;
  isGoAheadOpportunity: boolean;
  isSaveOpportunity: boolean;
}

export interface EventResult {
  event: GameEvent;
  runner: 'first' | 'second' | 'third';
  outcome: 'ADVANCE' | 'SCORE' | 'OUT';
  toBase?: 'second' | 'third' | 'home';
}

export interface AtBatFlowState {
  step: string;
  result: AtBatResult | null;
  direction: Direction | null;
  exitType: ExitType | null;
  fielder: Position | null;
  hrDistance: number | null;
  specialPlay: SpecialPlayType | null;
  savedRun: boolean;
  is7PlusPitchAB: boolean;
  beatOutSingle: boolean;
  runnerOutcomes: { first: RunnerOutcome | null; second: RunnerOutcome | null; third: RunnerOutcome | null; };
  rbiCount: number;
  extraEvents?: ExtraEvent[]; // Inferred extra events from non-standard advancement
  fieldingData?: FieldingData; // Comprehensive fielding tracking
  // Batter thrown out advancing (e.g., double but out stretching to 3B)
  batterOutAdvancing?: {
    hitType: '1B' | '2B' | '3B';
    outAtBase: '2B' | '3B' | 'HOME';
    // Fielding credit for the out
    putoutBy: Position;           // Fielder who made the tag or received throw
    assistBy: Position[];         // Fielder(s) who threw (can be multiple for relay)
  };
}

export function createEmptyBases(): Bases { return { first: null, second: null, third: null }; }
export function countRunners(bases: Bases): number { return [bases.first, bases.second, bases.third].filter(r => r !== null).length; }
export function hasRISP(bases: Bases): boolean { return bases.second !== null || bases.third !== null; }
export function isBasesLoaded(bases: Bases): boolean { return bases.first !== null && bases.second !== null && bases.third !== null; }

export function isOut(result: AtBatResult): boolean { return ['K', 'KL', 'GO', 'FO', 'LO', 'PO', 'DP', 'SF', 'SAC'].includes(result); }
export function isHit(result: AtBatResult): boolean { return ['1B', '2B', '3B', 'HR'].includes(result); }
export function reachesBase(result: AtBatResult): boolean { return ['1B', '2B', '3B', 'HR', 'BB', 'IBB', 'HBP', 'E', 'FC', 'D3K'].includes(result); }
export function requiresBallInPlayData(result: AtBatResult): boolean { return ['1B', '2B', '3B', 'HR', 'GO', 'FO', 'LO', 'PO', 'DP', 'FC', 'E'].includes(result); }

export function inferFielder(result: AtBatResult, direction: Direction): Position | null {
  const map: Record<string, Record<Direction, Position>> = {
    'FO': { 'Left': 'LF', 'Left-Center': 'LF', 'Center': 'CF', 'Right-Center': 'RF', 'Right': 'RF' },
    'LO': { 'Left': 'LF', 'Left-Center': 'CF', 'Center': 'CF', 'Right-Center': 'CF', 'Right': 'RF' },
    'PO': { 'Left': '3B', 'Left-Center': 'SS', 'Center': '2B', 'Right-Center': '2B', 'Right': '1B' },
    'GO': { 'Left': '3B', 'Left-Center': 'SS', 'Center': 'P', 'Right-Center': '2B', 'Right': '1B' }
  };
  return map[result]?.[direction] || null;
}

// ============================================
// SUBSTITUTION TYPES - Per SUBSTITUTION_FLOW_SPEC.md
// ============================================

export type SubstitutionType = 'PINCH_HIT' | 'PINCH_RUN' | 'DEF_SUB' | 'PITCH_CHANGE' | 'DOUBLE_SWITCH';

export interface LineupPlayer {
  playerId: string;
  playerName: string;
  position: Position;
  battingOrder: number;  // 1-9
  enteredInning: number;
  enteredFor?: string;   // Who they replaced (if any)
  isStarter: boolean;
}

export interface BenchPlayer {
  playerId: string;
  playerName: string;
  positions: Position[];  // Positions they can play
  isAvailable: boolean;   // Not yet used in game
  batterHand?: BatterHand;
}

export interface LineupState {
  // Current 9-player lineup (in batting order)
  lineup: LineupPlayer[];

  // Available bench players
  bench: BenchPlayer[];

  // Players already used (can't re-enter)
  usedPlayers: string[];

  // Current pitcher (for quick access)
  currentPitcher: LineupPlayer | null;
}

// Base substitution event (common fields)
export interface BaseSubstitutionEvent {
  gameId: string;
  inning: number;
  halfInning: HalfInning;
  outs: number;
  timestamp: number;
}

// Pinch Hitter Event
export interface PinchHitterEvent extends BaseSubstitutionEvent {
  eventType: 'PINCH_HIT';
  replacedPlayerId: string;
  replacedPlayerName: string;
  replacedBattingOrder: number;
  pinchHitterId: string;
  pinchHitterName: string;
  fieldingPosition: Position;  // Position PH will play after AB
  pitcherFacing?: string;      // Opposing pitcher (for L/R matchup tracking)
}

// Pinch Runner Event
export interface PinchRunnerEvent extends BaseSubstitutionEvent {
  eventType: 'PINCH_RUN';
  replacedPlayerId: string;
  replacedPlayerName: string;
  replacedBattingOrder: number;
  base: '1B' | '2B' | '3B';
  pinchRunnerId: string;
  pinchRunnerName: string;
  fieldingPosition: Position;  // Position PR will play after inning
  // CRITICAL: Inherit pitcher responsibility for ER tracking
  pitcherResponsible: string;  // Original pitcher who allowed this runner
  howOriginalReached: 'hit' | 'walk' | 'hbp' | 'error' | 'fc';
}

// Defensive Substitution Event
export interface DefensiveSubEvent extends BaseSubstitutionEvent {
  eventType: 'DEF_SUB';
  substitutions: {
    playerOutId: string;
    playerOutName: string;
    playerInId: string;
    playerInName: string;
    position: Position;
    battingOrder: number;
  }[];
}

// Pitching Change Event
export interface PitchingChangeEvent extends BaseSubstitutionEvent {
  eventType: 'PITCH_CHANGE';
  outgoingPitcherId: string;
  outgoingPitcherName: string;
  outgoingPitchCount: number;
  outgoingLine?: {
    ip: number;    // Outs recorded (stored as outs, display as IP)
    h: number;
    r: number;
    er: number;
    bb: number;
    k: number;
    hr?: number;
  };
  // Bequeathed runners (for inherited runner tracking)
  bequeathedRunners: {
    base: '1B' | '2B' | '3B';
    runnerId: string;
    runnerName: string;
    howReached: 'hit' | 'walk' | 'hbp' | 'error' | 'fc';
  }[];
  incomingPitcherId: string;
  incomingPitcherName: string;
  incomingPitcherRole: 'SP' | 'RP' | 'CL';
  inheritedRunners: number;  // Count for new pitcher
}

// Double Switch Event
export interface DoubleSwitchEvent extends BaseSubstitutionEvent {
  eventType: 'DOUBLE_SWITCH';
  pitchingChange: Omit<PitchingChangeEvent, 'eventType'>;
  positionSwap: {
    playerOutId: string;
    playerOutPosition: Position;
    playerOutBattingOrder: number;
    playerInId: string;
    playerInPosition: Position;
    playerInBattingOrder: number;
  };
  newPitcherBattingOrder: number;
  newPositionPlayerBattingOrder: number;
}

// Position Switch Event - swap positions without removing players
export interface PositionSwitchEvent extends BaseSubstitutionEvent {
  eventType: 'POS_SWITCH';
  switches: {
    playerId: string;
    playerName: string;
    fromPosition: Position;
    toPosition: Position;
  }[];
}

// Union type for all substitution events
export type SubstitutionEvent =
  | PinchHitterEvent
  | PinchRunnerEvent
  | DefensiveSubEvent
  | PitchingChangeEvent
  | DoubleSwitchEvent
  | PositionSwitchEvent;

// Game substitution history
export interface GameSubstitutions {
  gameId: string;
  events: SubstitutionEvent[];
}

// Validation result
export interface SubstitutionValidation {
  isValid: boolean;
  errors: string[];
}

// Validate a substitution before applying
export function validateSubstitution(
  lineupState: LineupState,
  playerInId: string,
  playerOutId: string
): SubstitutionValidation {
  const errors: string[] = [];

  // Check player hasn't already played
  if (lineupState.usedPlayers.includes(playerInId)) {
    errors.push('Player has already been used in this game');
  }

  // Check player is on bench
  const benchPlayer = lineupState.bench.find(p => p.playerId === playerInId);
  if (!benchPlayer) {
    errors.push('Player is not available on bench');
  } else if (!benchPlayer.isAvailable) {
    errors.push('Player has already entered and exited the game');
  }

  // Check player being replaced is in lineup
  const lineupPlayer = lineupState.lineup.find(p => p.playerId === playerOutId);
  if (!lineupPlayer) {
    errors.push('Player to replace is not in the lineup');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Apply a substitution to lineup state
export function applySubstitution(
  lineupState: LineupState,
  event: SubstitutionEvent,
  inning: number
): LineupState {
  const newState = { ...lineupState };
  newState.lineup = [...lineupState.lineup];
  newState.bench = [...lineupState.bench];
  newState.usedPlayers = [...lineupState.usedPlayers];

  switch (event.eventType) {
    case 'PINCH_HIT': {
      const phEvent = event as PinchHitterEvent;
      // Find the lineup spot
      const lineupIdx = newState.lineup.findIndex(p => p.playerId === phEvent.replacedPlayerId);
      if (lineupIdx !== -1) {
        // Remove player from lineup
        const removedPlayer = newState.lineup[lineupIdx];
        newState.usedPlayers.push(removedPlayer.playerId);

        // Add pinch hitter to lineup
        newState.lineup[lineupIdx] = {
          playerId: phEvent.pinchHitterId,
          playerName: phEvent.pinchHitterName,
          position: phEvent.fieldingPosition,
          battingOrder: phEvent.replacedBattingOrder,
          enteredInning: inning,
          enteredFor: removedPlayer.playerName,
          isStarter: false
        };

        // Remove from bench
        const benchIdx = newState.bench.findIndex(p => p.playerId === phEvent.pinchHitterId);
        if (benchIdx !== -1) {
          newState.bench[benchIdx] = { ...newState.bench[benchIdx], isAvailable: false };
        }
      }
      break;
    }

    case 'PINCH_RUN': {
      const prEvent = event as PinchRunnerEvent;
      const lineupIdx = newState.lineup.findIndex(p => p.playerId === prEvent.replacedPlayerId);
      if (lineupIdx !== -1) {
        const removedPlayer = newState.lineup[lineupIdx];
        newState.usedPlayers.push(removedPlayer.playerId);

        newState.lineup[lineupIdx] = {
          playerId: prEvent.pinchRunnerId,
          playerName: prEvent.pinchRunnerName,
          position: prEvent.fieldingPosition,
          battingOrder: prEvent.replacedBattingOrder,
          enteredInning: inning,
          enteredFor: removedPlayer.playerName,
          isStarter: false
        };

        const benchIdx = newState.bench.findIndex(p => p.playerId === prEvent.pinchRunnerId);
        if (benchIdx !== -1) {
          newState.bench[benchIdx] = { ...newState.bench[benchIdx], isAvailable: false };
        }
      }
      break;
    }

    case 'DEF_SUB': {
      const dsEvent = event as DefensiveSubEvent;
      for (const sub of dsEvent.substitutions) {
        const lineupIdx = newState.lineup.findIndex(p => p.playerId === sub.playerOutId);
        if (lineupIdx !== -1) {
          const removedPlayer = newState.lineup[lineupIdx];
          newState.usedPlayers.push(removedPlayer.playerId);

          newState.lineup[lineupIdx] = {
            playerId: sub.playerInId,
            playerName: sub.playerInName,
            position: sub.position,
            battingOrder: sub.battingOrder,
            enteredInning: inning,
            enteredFor: removedPlayer.playerName,
            isStarter: false
          };

          const benchIdx = newState.bench.findIndex(p => p.playerId === sub.playerInId);
          if (benchIdx !== -1) {
            newState.bench[benchIdx] = { ...newState.bench[benchIdx], isAvailable: false };
          }
        }
      }
      break;
    }

    case 'PITCH_CHANGE': {
      const pcEvent = event as PitchingChangeEvent;
      const lineupIdx = newState.lineup.findIndex(p => p.playerId === pcEvent.outgoingPitcherId);
      if (lineupIdx !== -1) {
        const removedPlayer = newState.lineup[lineupIdx];
        newState.usedPlayers.push(removedPlayer.playerId);

        const newPitcher: LineupPlayer = {
          playerId: pcEvent.incomingPitcherId,
          playerName: pcEvent.incomingPitcherName,
          position: 'P',
          battingOrder: removedPlayer.battingOrder,
          enteredInning: inning,
          enteredFor: removedPlayer.playerName,
          isStarter: false
        };

        newState.lineup[lineupIdx] = newPitcher;
        newState.currentPitcher = newPitcher;

        const benchIdx = newState.bench.findIndex(p => p.playerId === pcEvent.incomingPitcherId);
        if (benchIdx !== -1) {
          newState.bench[benchIdx] = { ...newState.bench[benchIdx], isAvailable: false };
        }
      }
      break;
    }

    case 'DOUBLE_SWITCH': {
      const dsEvent = event as DoubleSwitchEvent;
      // Apply pitching change first
      const pitcherIdx = newState.lineup.findIndex(p => p.playerId === dsEvent.pitchingChange.outgoingPitcherId);
      const positionIdx = newState.lineup.findIndex(p => p.playerId === dsEvent.positionSwap.playerOutId);

      if (pitcherIdx !== -1 && positionIdx !== -1) {
        // Remove both players
        newState.usedPlayers.push(newState.lineup[pitcherIdx].playerId);
        newState.usedPlayers.push(newState.lineup[positionIdx].playerId);

        // Add new pitcher at the position player's batting spot
        const newPitcher: LineupPlayer = {
          playerId: dsEvent.pitchingChange.incomingPitcherId,
          playerName: dsEvent.pitchingChange.incomingPitcherName,
          position: 'P',
          battingOrder: dsEvent.newPitcherBattingOrder,
          enteredInning: inning,
          enteredFor: newState.lineup[pitcherIdx].playerName,
          isStarter: false
        };

        // Add new position player at the pitcher's batting spot
        const newPositionPlayer: LineupPlayer = {
          playerId: dsEvent.positionSwap.playerInId,
          playerName: newState.bench.find(p => p.playerId === dsEvent.positionSwap.playerInId)?.playerName || 'Unknown',
          position: dsEvent.positionSwap.playerInPosition,
          battingOrder: dsEvent.newPositionPlayerBattingOrder,
          enteredInning: inning,
          enteredFor: newState.lineup[positionIdx].playerName,
          isStarter: false
        };

        // Update lineup
        newState.lineup[pitcherIdx] = newPositionPlayer;
        newState.lineup[positionIdx] = newPitcher;
        newState.currentPitcher = newPitcher;

        // Update bench
        const benchIdx1 = newState.bench.findIndex(p => p.playerId === dsEvent.pitchingChange.incomingPitcherId);
        const benchIdx2 = newState.bench.findIndex(p => p.playerId === dsEvent.positionSwap.playerInId);
        if (benchIdx1 !== -1) newState.bench[benchIdx1] = { ...newState.bench[benchIdx1], isAvailable: false };
        if (benchIdx2 !== -1) newState.bench[benchIdx2] = { ...newState.bench[benchIdx2], isAvailable: false };
      }
      break;
    }

    case 'POS_SWITCH': {
      const psEvent = event as PositionSwitchEvent;
      // Position switch - just change positions, don't remove players
      for (const sw of psEvent.switches) {
        const lineupIdx = newState.lineup.findIndex(p => p.playerId === sw.playerId);
        if (lineupIdx !== -1) {
          newState.lineup[lineupIdx] = {
            ...newState.lineup[lineupIdx],
            position: sw.toPosition,
          };
        }
      }
      break;
    }
  }

  return newState;
}

// ============================================
// FAME TYPES - Per FAN_HAPPINESS_SPEC.md
// ============================================

export type FameEventType =
  // ============================================
  // BONUSES (positive Fame)
  // ============================================
  // Walk-Off Events
  | 'WALK_OFF'              // Any walk-off hit
  | 'WALK_OFF_HR'           // Walk-off home run (extra special)
  | 'WALK_OFF_GRAND_SLAM'   // Walk-off grand slam (legendary)
  // Defensive Highlights
  | 'WEB_GEM'
  | 'ROBBERY'
  | 'ROBBERY_GRAND_SLAM'
  | 'TRIPLE_PLAY'           // NEW: Turn a triple play
  | 'UNASSISTED_TRIPLE_PLAY'
  | 'THROW_OUT_AT_HOME'     // NEW: Outfield assist at home plate
  // Home Run Events
  | 'INSIDE_PARK_HR'
  | 'LEADOFF_HR'            // NEW: HR on first at-bat of game
  | 'PINCH_HIT_HR'          // NEW: HR as pinch hitter
  | 'GO_AHEAD_HR'           // NEW: HR that takes the lead
  | 'GRAND_SLAM'            // NEW: Any grand slam (separate from clutch)
  // Multi-Hit Events
  | 'CYCLE'
  | 'NATURAL_CYCLE'
  | 'MULTI_HR_2'
  | 'MULTI_HR_3'
  | 'MULTI_HR_4PLUS'
  | 'BACK_TO_BACK_HR'
  | 'BACK_TO_BACK_TO_BACK_HR' // NEW: 3 consecutive HRs
  | 'CLUTCH_GRAND_SLAM'
  | 'THREE_HIT_GAME'        // 3 hits in a game
  | 'FOUR_HIT_GAME'         // 4 hits in a game
  | 'FIVE_HIT_GAME'         // 5+ hits in a game
  | 'SIX_HIT_GAME'          // 6+ hits in a game (rare)
  | 'FIVE_RBI_GAME'         // 5+ RBI in a game
  | 'EIGHT_RBI_GAME'        // 8+ RBI in a game
  | 'TEN_RBI_GAME'          // 10+ RBI in a game (historic)
  // Pitching Excellence
  | 'NO_HITTER'
  | 'PERFECT_GAME'
  | 'MADDUX'
  | 'COMPLETE_GAME'         // NEW: Any complete game
  | 'SHUTOUT'               // NEW: Complete game shutout
  | 'IMMACULATE_INNING'
  | 'NINE_PITCH_INNING'
  | 'SHUTDOWN_INNING'
  | 'STRIKE_OUT_SIDE'       // NEW: 3 K in an inning
  | 'TEN_K_GAME'            // NEW: 10+ strikeouts
  | 'FIFTEEN_K_GAME'        // NEW: 15+ strikeouts (dominant)
  | 'ESCAPE_ARTIST'         // NEW: Bases loaded, no outs → no runs
  // SMB4 Special Events
  | 'NUT_SHOT_DELIVERED'
  | 'NUT_SHOT_TOUGH_GUY'
  | 'KILLED_PITCHER'
  | 'STAYED_IN_AFTER_HIT'
  // Position Player Pitching
  | 'PP_CLEAN_INNING'
  | 'PP_MULTIPLE_CLEAN'
  | 'PP_GOT_K'
  // Team/Game Events
  | 'COMEBACK_WIN_3'        // NEW: Overcome 3+ run deficit
  | 'COMEBACK_WIN_5'        // NEW: Overcome 5+ run deficit
  | 'COMEBACK_WIN_7'        // NEW: Overcome 7+ run deficit (epic)
  | 'COMEBACK_HERO'
  | 'RALLY_STARTER'
  // Single-Game Milestones
  | 'FIRST_CAREER'
  | 'CAREER_MILESTONE'
  // Season Milestones - Batting
  | 'SEASON_40_HR'
  | 'SEASON_45_HR'
  | 'SEASON_55_HR'
  | 'SEASON_160_HITS'
  | 'SEASON_120_RBI'
  | 'SEASON_40_SB'
  | 'SEASON_80_SB'
  | 'SEASON_400_BA'           // .400 batting average
  | 'SEASON_TRIPLE_CROWN'     // Lead league in AVG, HR, RBI
  // Season Milestones - Batting Clubs
  | 'CLUB_15_15'              // 15 HR + 15 SB
  | 'CLUB_20_20'              // 20 HR + 20 SB
  | 'CLUB_25_25'              // 25 HR + 25 SB
  | 'CLUB_30_30'              // 30 HR + 30 SB
  | 'CLUB_40_40'              // 40 HR + 40 SB
  // Season Milestones - Pitching
  | 'SEASON_15_WINS'
  | 'SEASON_20_WINS'
  | 'SEASON_25_WINS'
  | 'SEASON_235_K'
  | 'SEASON_SUB_2_ERA'        // ERA < 2.00
  | 'SEASON_SUB_1_5_ERA'      // ERA < 1.50
  | 'SEASON_40_SAVES'
  | 'SEASON_PITCHING_TRIPLE_CROWN'  // Lead league in W, K, ERA
  // Career Milestones - Batting (tiered)
  | 'CAREER_HR_TIER'          // Generic - use fameValue for tier
  | 'CAREER_HITS_TIER'
  | 'CAREER_RBI_TIER'
  | 'CAREER_RUNS_TIER'
  | 'CAREER_SB_TIER'
  | 'CAREER_DOUBLES_TIER'
  | 'CAREER_BB_TIER'
  | 'CAREER_GRAND_SLAMS_TIER'
  // Career Milestones - Pitching (tiered)
  | 'CAREER_WINS_TIER'
  | 'CAREER_K_TIER'
  | 'CAREER_SAVES_TIER'
  | 'CAREER_IP_TIER'
  | 'CAREER_SHUTOUTS_TIER'
  | 'CAREER_CG_TIER'
  | 'CAREER_NO_HITTERS_TIER'
  | 'CAREER_PERFECT_GAMES_TIER'
  // Career Milestones - Aggregate
  | 'CAREER_WAR_TIER'
  // Career Milestones - WAR Components
  | 'CAREER_BWAR_TIER'    // Batting WAR
  | 'CAREER_PWAR_TIER'    // Pitching WAR
  | 'CAREER_FWAR_TIER'    // Fielding WAR
  | 'CAREER_RWAR_TIER'    // Baserunning WAR
  | 'CAREER_GAMES_TIER'
  | 'CAREER_ALL_STARS_TIER'
  | 'CAREER_MVPS_TIER'
  | 'CAREER_CY_YOUNGS_TIER'
  // ============================================
  // BONERS (negative Fame)
  // ============================================
  // Strikeout Shame
  | 'HAT_TRICK'             // NEW: 3 strikeouts (less severe than sombrero)
  | 'GOLDEN_SOMBRERO'       // 4 K
  | 'PLATINUM_SOMBRERO'     // 5 K
  | 'TITANIUM_SOMBRERO'     // NEW: 6 K (extra innings)
  | 'IBB_STRIKEOUT'
  // Offensive Failures
  | 'HIT_INTO_TRIPLE_PLAY'
  | 'MEATBALL_WHIFF'
  | 'BASES_LOADED_FAILURE'
  | 'LOB_KING'              // NEW: Leave 5+ runners on base
  | 'MULTIPLE_GIDP'         // NEW: 2+ GIDP in one game
  | 'RALLY_KILLER'
  // Pitching Disasters
  | 'MELTDOWN'              // 6+ runs allowed
  | 'MELTDOWN_SEVERE'       // 10+ runs allowed
  | 'FIRST_INNING_DISASTER' // NEW: 5+ runs in the 1st
  | 'WALKED_IN_RUN'         // NEW: BB with bases loaded
  | 'B2B2B_HR_ALLOWED'
  | 'BLOWN_SAVE'
  | 'BLOWN_SAVE_LOSS'
  | 'BLOWN_LEAD_3'          // NEW: Blow 3+ run lead
  | 'BLOWN_LEAD_5'          // NEW: Blow 5+ run lead
  // Fielding Errors
  | 'NUT_SHOT_VICTIM'
  | 'DROPPED_FLY'
  | 'DROPPED_FLY_CLUTCH'
  | 'BOOTED_GROUNDER'
  | 'WRONG_BASE_THROW'
  | 'PASSED_BALL_RUN'
  | 'PASSED_BALL_WINNING_RUN'
  // Baserunning Blunders
  | 'TOOTBLAN'
  | 'TOOTBLAN_RALLY_KILLER'
  | 'PICKED_OFF_END_GAME'
  | 'PICKED_OFF_END_INNING'
  | 'BATTER_OUT_STRETCHING'
  // Position Player Pitching Failures
  | 'PP_GAVE_UP_RUNS'
  // Season Negative Milestones - Batting
  | 'SEASON_200_K_BATTER'     // 200+ strikeouts
  | 'SEASON_250_K_BATTER'     // 250+ strikeouts
  | 'SEASON_SUB_200_BA'       // BA < .200 (Mendoza line fail)
  | 'SEASON_30_GIDP'          // 30+ GIDP
  | 'SEASON_20_ERRORS'        // 20+ errors
  // Season Negative Milestones - Pitching
  | 'SEASON_20_LOSSES'
  | 'SEASON_6_ERA'            // ERA 6.00+
  | 'SEASON_100_BB'           // 100+ walks issued
  | 'SEASON_20_BLOWN_SAVES'
  | 'SEASON_40_HR_ALLOWED'
  // Career Negative Milestones (tiered)
  | 'CAREER_K_BATTER_TIER'    // Career strikeouts (batter)
  | 'CAREER_GIDP_TIER'
  | 'CAREER_CS_TIER'          // Caught stealing
  | 'CAREER_LOSSES_TIER'
  | 'CAREER_BLOWN_SAVES_TIER'
  | 'CAREER_WILD_PITCHES_TIER'
  | 'CAREER_HBP_PITCHER_TIER'
  | 'CAREER_ERRORS_TIER'
  | 'CAREER_PASSED_BALLS_TIER';

// Fame values for each event type
export const FAME_VALUES: Record<FameEventType, number> = {
  // ============================================
  // BONUSES (positive values)
  // ============================================
  // Walk-Off Events
  WALK_OFF: 1,
  WALK_OFF_HR: 1.5,
  WALK_OFF_GRAND_SLAM: 3,
  // Defensive Highlights
  WEB_GEM: 0.75,
  ROBBERY: 1.5,
  ROBBERY_GRAND_SLAM: 2.5,
  TRIPLE_PLAY: 2,
  UNASSISTED_TRIPLE_PLAY: 3,
  THROW_OUT_AT_HOME: 0.5,
  // Home Run Events
  INSIDE_PARK_HR: 1.5,
  LEADOFF_HR: 0.5,
  PINCH_HIT_HR: 0.75,
  GO_AHEAD_HR: 0.5,
  GRAND_SLAM: 0.5,
  // Multi-Hit Events
  CYCLE: 3,
  NATURAL_CYCLE: 4,
  MULTI_HR_2: 1,
  MULTI_HR_3: 2.5,
  MULTI_HR_4PLUS: 5,
  BACK_TO_BACK_HR: 0.5,
  BACK_TO_BACK_TO_BACK_HR: 1.5,
  CLUTCH_GRAND_SLAM: 1,
  THREE_HIT_GAME: 0.25,
  FOUR_HIT_GAME: 0.5,
  FIVE_HIT_GAME: 1,
  SIX_HIT_GAME: 2,
  FIVE_RBI_GAME: 0.5,
  EIGHT_RBI_GAME: 2,
  TEN_RBI_GAME: 4,
  // Pitching Excellence
  NO_HITTER: 3,
  PERFECT_GAME: 5,
  MADDUX: 3,
  COMPLETE_GAME: 0.5,
  SHUTOUT: 1,
  IMMACULATE_INNING: 2,
  NINE_PITCH_INNING: 1,
  SHUTDOWN_INNING: 1,
  STRIKE_OUT_SIDE: 0.5,
  TEN_K_GAME: 1,
  FIFTEEN_K_GAME: 2,
  ESCAPE_ARTIST: 1,
  // SMB4 Special Events
  NUT_SHOT_DELIVERED: 1,
  NUT_SHOT_TOUGH_GUY: 1,
  KILLED_PITCHER: 3,
  STAYED_IN_AFTER_HIT: 1,
  // Position Player Pitching
  PP_CLEAN_INNING: 1,
  PP_MULTIPLE_CLEAN: 2,
  PP_GOT_K: 1,
  // Team/Game Events
  COMEBACK_WIN_3: 1,
  COMEBACK_WIN_5: 2,
  COMEBACK_WIN_7: 3,
  COMEBACK_HERO: 1,
  RALLY_STARTER: 1,
  // Single-Game Milestones
  FIRST_CAREER: 0.5,
  CAREER_MILESTONE: 1,
  // Season Milestones - Batting
  SEASON_40_HR: 2.5,
  SEASON_45_HR: 4,
  SEASON_55_HR: 6,
  SEASON_160_HITS: 2,
  SEASON_120_RBI: 2.5,
  SEASON_40_SB: 1.5,
  SEASON_80_SB: 4,
  SEASON_400_BA: 6,
  SEASON_TRIPLE_CROWN: 8,
  // Season Milestones - Batting Clubs
  CLUB_15_15: 0.5,
  CLUB_20_20: 1,
  CLUB_25_25: 2,
  CLUB_30_30: 3.5,
  CLUB_40_40: 6,
  // Season Milestones - Pitching
  SEASON_15_WINS: 1.5,
  SEASON_20_WINS: 3,
  SEASON_25_WINS: 5,
  SEASON_235_K: 2.5,
  SEASON_SUB_2_ERA: 3,
  SEASON_SUB_1_5_ERA: 5,
  SEASON_40_SAVES: 2.5,
  SEASON_PITCHING_TRIPLE_CROWN: 6,
  // Career Milestones - variable based on tier (base values, multiplied by tier)
  CAREER_HR_TIER: 1,
  CAREER_HITS_TIER: 1,
  CAREER_RBI_TIER: 1,
  CAREER_RUNS_TIER: 1,
  CAREER_SB_TIER: 1,
  CAREER_DOUBLES_TIER: 1,
  CAREER_BB_TIER: 1,
  CAREER_GRAND_SLAMS_TIER: 1,
  CAREER_WINS_TIER: 1,
  CAREER_K_TIER: 1,
  CAREER_SAVES_TIER: 1,
  CAREER_IP_TIER: 1,
  CAREER_SHUTOUTS_TIER: 1,
  CAREER_CG_TIER: 1,
  CAREER_NO_HITTERS_TIER: 2,
  CAREER_PERFECT_GAMES_TIER: 5,
  CAREER_WAR_TIER: 1,
  // WAR Components
  CAREER_BWAR_TIER: 1,
  CAREER_PWAR_TIER: 1,
  CAREER_FWAR_TIER: 1.5,   // Higher base - harder to accumulate
  CAREER_RWAR_TIER: 2,     // Highest base - hardest to accumulate
  CAREER_GAMES_TIER: 1,
  CAREER_ALL_STARS_TIER: 1,
  CAREER_MVPS_TIER: 2,
  CAREER_CY_YOUNGS_TIER: 2,
  // ============================================
  // BONERS (negative values)
  // ============================================
  // Strikeout Shame
  HAT_TRICK: -0.5,
  GOLDEN_SOMBRERO: -1,
  PLATINUM_SOMBRERO: -2,
  TITANIUM_SOMBRERO: -3,
  IBB_STRIKEOUT: -2,
  // Offensive Failures
  HIT_INTO_TRIPLE_PLAY: -1,
  MEATBALL_WHIFF: -1,
  BASES_LOADED_FAILURE: -1,
  LOB_KING: -0.5,
  MULTIPLE_GIDP: -1,
  RALLY_KILLER: -1,
  // Pitching Disasters
  MELTDOWN: -1,
  MELTDOWN_SEVERE: -2,
  FIRST_INNING_DISASTER: -1,
  WALKED_IN_RUN: -0.5,
  B2B2B_HR_ALLOWED: -1,
  BLOWN_SAVE: -1,
  BLOWN_SAVE_LOSS: -2,
  BLOWN_LEAD_3: -1,
  BLOWN_LEAD_5: -2,
  // Fielding Errors
  NUT_SHOT_VICTIM: -1,
  DROPPED_FLY: -1,
  DROPPED_FLY_CLUTCH: -2,
  BOOTED_GROUNDER: -1,
  WRONG_BASE_THROW: -1,
  PASSED_BALL_RUN: -1,
  PASSED_BALL_WINNING_RUN: -2,
  // Baserunning Blunders
  TOOTBLAN: -1,
  TOOTBLAN_RALLY_KILLER: -2,
  PICKED_OFF_END_GAME: -2,
  PICKED_OFF_END_INNING: -1,
  BATTER_OUT_STRETCHING: -1,
  // Position Player Pitching Failures
  PP_GAVE_UP_RUNS: -1,
  // Season Negative Milestones - Batting
  SEASON_200_K_BATTER: -1,
  SEASON_250_K_BATTER: -2,
  SEASON_SUB_200_BA: -2,
  SEASON_30_GIDP: -1,
  SEASON_20_ERRORS: -1,
  // Season Negative Milestones - Pitching
  SEASON_20_LOSSES: -1.5,
  SEASON_6_ERA: -1.5,
  SEASON_100_BB: -1,
  SEASON_20_BLOWN_SAVES: -2,
  SEASON_40_HR_ALLOWED: -1.5,
  // Career Negative Milestones (tiered - base values, multiplied by tier)
  CAREER_K_BATTER_TIER: -0.5,
  CAREER_GIDP_TIER: -0.5,
  CAREER_CS_TIER: -0.5,
  CAREER_LOSSES_TIER: -0.5,
  CAREER_BLOWN_SAVES_TIER: -0.5,
  CAREER_WILD_PITCHES_TIER: -0.5,
  CAREER_HBP_PITCHER_TIER: -0.5,
  CAREER_ERRORS_TIER: -0.5,
  CAREER_PASSED_BALLS_TIER: -0.5
};

// Human-readable labels for Fame events
export const FAME_EVENT_LABELS: Record<FameEventType, string> = {
  // Walk-Off Events
  WALK_OFF: 'Walk-Off Hit',
  WALK_OFF_HR: 'Walk-Off Home Run',
  WALK_OFF_GRAND_SLAM: 'Walk-Off Grand Slam',
  // Defensive Highlights
  WEB_GEM: 'Web Gem',
  ROBBERY: 'Home Run Robbery',
  ROBBERY_GRAND_SLAM: 'Grand Slam Robbery',
  TRIPLE_PLAY: 'Triple Play',
  UNASSISTED_TRIPLE_PLAY: 'Unassisted Triple Play',
  THROW_OUT_AT_HOME: 'Throw Out at Home',
  // Home Run Events
  INSIDE_PARK_HR: 'Inside-the-Park HR',
  LEADOFF_HR: 'Leadoff Home Run',
  PINCH_HIT_HR: 'Pinch Hit Homer',
  GO_AHEAD_HR: 'Go-Ahead Home Run',
  GRAND_SLAM: 'Grand Slam',
  // Multi-Hit Events
  CYCLE: 'Hit for the Cycle',
  NATURAL_CYCLE: 'Natural Cycle',
  MULTI_HR_2: '2-HR Game',
  MULTI_HR_3: '3-HR Game',
  MULTI_HR_4PLUS: '4+ HR Game',
  BACK_TO_BACK_HR: 'Back-to-Back HR',
  BACK_TO_BACK_TO_BACK_HR: 'Back-to-Back-to-Back HR',
  CLUTCH_GRAND_SLAM: 'Clutch Grand Slam',
  THREE_HIT_GAME: '3-Hit Game',
  FOUR_HIT_GAME: '4-Hit Game',
  FIVE_HIT_GAME: '5-Hit Game',
  SIX_HIT_GAME: '6-Hit Game',
  FIVE_RBI_GAME: '5-RBI Game',
  EIGHT_RBI_GAME: '8-RBI Game',
  TEN_RBI_GAME: '10-RBI Game',
  // Pitching Excellence
  NO_HITTER: 'No-Hitter',
  PERFECT_GAME: 'Perfect Game',
  MADDUX: 'Maddux (CGSO < pitch threshold)',
  COMPLETE_GAME: 'Complete Game',
  SHUTOUT: 'Shutout',
  IMMACULATE_INNING: 'Immaculate Inning',
  NINE_PITCH_INNING: '9-Pitch Inning',
  SHUTDOWN_INNING: 'Shutdown Inning',
  STRIKE_OUT_SIDE: 'Struck Out the Side',
  TEN_K_GAME: '10+ Strikeout Game',
  FIFTEEN_K_GAME: '15+ Strikeout Game',
  ESCAPE_ARTIST: 'Escape Artist (bases loaded, no runs)',
  // SMB4 Special Events
  NUT_SHOT_DELIVERED: 'Nut Shot Delivered',
  NUT_SHOT_TOUGH_GUY: 'Made Play Despite Nut Shot',
  KILLED_PITCHER: 'Killed Pitcher',
  STAYED_IN_AFTER_HIT: 'Stayed In After Being Hit',
  // Position Player Pitching
  PP_CLEAN_INNING: 'Position Player Clean Inning',
  PP_MULTIPLE_CLEAN: 'Position Player Multiple Clean Innings',
  PP_GOT_K: 'Position Player Got Strikeout',
  // Team/Game Events (TEAM FAME)
  COMEBACK_WIN_3: 'Comeback Victory (3+ runs)',
  COMEBACK_WIN_5: 'Comeback Victory (5+ runs)',
  COMEBACK_WIN_7: 'Epic Comeback (7+ runs)',
  COMEBACK_HERO: 'Comeback Hero',
  RALLY_STARTER: 'Rally Starter',
  // Milestones
  FIRST_CAREER: 'First Career Event',
  CAREER_MILESTONE: 'Career Milestone',
  // Season Milestones - Batting
  SEASON_40_HR: '40 Home Run Season',
  SEASON_45_HR: '45 Home Run Season',
  SEASON_55_HR: '55+ Home Run Season',
  SEASON_160_HITS: '160 Hit Season',
  SEASON_120_RBI: '120 RBI Season',
  SEASON_40_SB: '40 Stolen Base Season',
  SEASON_80_SB: '80 Stolen Base Season',
  SEASON_400_BA: '.400 Batting Average',
  SEASON_TRIPLE_CROWN: 'Triple Crown',
  // Season Milestones - Batting Clubs
  CLUB_15_15: '15-15 Club',
  CLUB_20_20: '20-20 Club',
  CLUB_25_25: '25-25 Club',
  CLUB_30_30: '30-30 Club',
  CLUB_40_40: '40-40 Club',
  // Season Milestones - Pitching
  SEASON_15_WINS: '15-Win Season',
  SEASON_20_WINS: '20-Win Season',
  SEASON_25_WINS: '25-Win Season',
  SEASON_235_K: '235 Strikeout Season',
  SEASON_SUB_2_ERA: 'Sub-2.00 ERA Season',
  SEASON_SUB_1_5_ERA: 'Sub-1.50 ERA Season',
  SEASON_40_SAVES: '40-Save Season',
  SEASON_PITCHING_TRIPLE_CROWN: 'Pitching Triple Crown',
  // Career Milestones - Batting
  CAREER_HR_TIER: 'Career Home Run Milestone',
  CAREER_HITS_TIER: 'Career Hits Milestone',
  CAREER_RBI_TIER: 'Career RBI Milestone',
  CAREER_RUNS_TIER: 'Career Runs Milestone',
  CAREER_SB_TIER: 'Career Stolen Base Milestone',
  CAREER_DOUBLES_TIER: 'Career Doubles Milestone',
  CAREER_BB_TIER: 'Career Walk Milestone',
  CAREER_GRAND_SLAMS_TIER: 'Career Grand Slam Milestone',
  // Career Milestones - Pitching
  CAREER_WINS_TIER: 'Career Wins Milestone',
  CAREER_K_TIER: 'Career Strikeout Milestone',
  CAREER_SAVES_TIER: 'Career Saves Milestone',
  CAREER_IP_TIER: 'Career Innings Pitched Milestone',
  CAREER_SHUTOUTS_TIER: 'Career Shutouts Milestone',
  CAREER_CG_TIER: 'Career Complete Games Milestone',
  CAREER_NO_HITTERS_TIER: 'Career No-Hitter Milestone',
  CAREER_PERFECT_GAMES_TIER: 'Career Perfect Game Milestone',
  // Career Milestones - Aggregate
  CAREER_WAR_TIER: 'Career WAR Milestone',
  // WAR Components
  CAREER_BWAR_TIER: 'Career Batting WAR Milestone',
  CAREER_PWAR_TIER: 'Career Pitching WAR Milestone',
  CAREER_FWAR_TIER: 'Career Fielding WAR Milestone',
  CAREER_RWAR_TIER: 'Career Baserunning WAR Milestone',
  CAREER_GAMES_TIER: 'Career Games Played Milestone',
  CAREER_ALL_STARS_TIER: 'Career All-Star Milestone',
  CAREER_MVPS_TIER: 'Career MVP Milestone',
  CAREER_CY_YOUNGS_TIER: 'Career Cy Young Milestone',
  // Strikeout Shame
  HAT_TRICK: 'Hat Trick (3 K)',
  GOLDEN_SOMBRERO: 'Golden Sombrero (4 K)',
  PLATINUM_SOMBRERO: 'Platinum Sombrero (5 K)',
  TITANIUM_SOMBRERO: 'Titanium Sombrero (6 K)',
  IBB_STRIKEOUT: 'IBB Strikeout',
  // Offensive Failures
  HIT_INTO_TRIPLE_PLAY: 'Hit Into Triple Play',
  MEATBALL_WHIFF: 'Meatball Whiff',
  BASES_LOADED_FAILURE: 'Bases Loaded Failure',
  LOB_KING: 'LOB King (5+ stranded)',
  MULTIPLE_GIDP: 'Multiple GIDP',
  RALLY_KILLER: 'Rally Killer',
  // Pitching Disasters
  MELTDOWN: 'Meltdown (6+ runs)',
  MELTDOWN_SEVERE: 'Severe Meltdown (10+ runs)',
  FIRST_INNING_DISASTER: 'First Inning Disaster (5+ runs)',
  WALKED_IN_RUN: 'Walked in a Run',
  B2B2B_HR_ALLOWED: 'Back-to-Back-to-Back HR Allowed',
  BLOWN_SAVE: 'Blown Save',
  BLOWN_SAVE_LOSS: 'Blown Save + Loss',
  BLOWN_LEAD_3: 'Blown 3+ Run Lead',
  BLOWN_LEAD_5: 'Blown 5+ Run Lead',
  // Fielding Errors
  NUT_SHOT_VICTIM: 'Nut Shot Victim',
  DROPPED_FLY: 'Dropped Routine Fly',
  DROPPED_FLY_CLUTCH: 'Dropped Fly (Clutch)',
  BOOTED_GROUNDER: 'Booted Easy Grounder',
  WRONG_BASE_THROW: 'Threw to Wrong Base',
  PASSED_BALL_RUN: 'Passed Ball Allowing Run',
  PASSED_BALL_WINNING_RUN: 'Passed Ball Allowing Winning Run',
  // Baserunning Blunders
  TOOTBLAN: 'TOOTBLAN',
  TOOTBLAN_RALLY_KILLER: 'TOOTBLAN (Rally Killer)',
  PICKED_OFF_END_GAME: 'Picked Off to End Game',
  PICKED_OFF_END_INNING: 'Picked Off to End Inning',
  BATTER_OUT_STRETCHING: 'Thrown Out Stretching',
  // Position Player Pitching Failures
  PP_GAVE_UP_RUNS: 'Position Player Gave Up Runs',
  // Season Negative Milestones - Batting
  SEASON_200_K_BATTER: '200 Strikeout Season',
  SEASON_250_K_BATTER: '250 Strikeout Season',
  SEASON_SUB_200_BA: 'Sub-.200 Batting Average',
  SEASON_30_GIDP: '30 GIDP Season',
  SEASON_20_ERRORS: '20 Error Season',
  // Season Negative Milestones - Pitching
  SEASON_20_LOSSES: '20-Loss Season',
  SEASON_6_ERA: '6.00+ ERA Season',
  SEASON_100_BB: '100 Walk Season (Pitcher)',
  SEASON_20_BLOWN_SAVES: '20 Blown Saves Season',
  SEASON_40_HR_ALLOWED: '40 HR Allowed Season',
  // Career Negative Milestones
  CAREER_K_BATTER_TIER: 'Career Strikeout Milestone (Batter)',
  CAREER_GIDP_TIER: 'Career GIDP Milestone',
  CAREER_CS_TIER: 'Career Caught Stealing Milestone',
  CAREER_LOSSES_TIER: 'Career Losses Milestone',
  CAREER_BLOWN_SAVES_TIER: 'Career Blown Saves Milestone',
  CAREER_WILD_PITCHES_TIER: 'Career Wild Pitches Milestone',
  CAREER_HBP_PITCHER_TIER: 'Career HBP Milestone (Pitcher)',
  CAREER_ERRORS_TIER: 'Career Errors Milestone',
  CAREER_PASSED_BALLS_TIER: 'Career Passed Balls Milestone'
};

// Fame attribution target - who gets credited/blamed
export type FameTarget = 'player' | 'team' | 'pitcher' | 'fielder';

// Which events are team-level vs player-level
export const FAME_TARGET: Record<FameEventType, FameTarget> = {
  // Walk-Off Events - player
  WALK_OFF: 'player',
  WALK_OFF_HR: 'player',
  WALK_OFF_GRAND_SLAM: 'player',
  // Defensive - fielder
  WEB_GEM: 'fielder',
  ROBBERY: 'fielder',
  ROBBERY_GRAND_SLAM: 'fielder',
  TRIPLE_PLAY: 'team',
  UNASSISTED_TRIPLE_PLAY: 'fielder',
  THROW_OUT_AT_HOME: 'fielder',
  // Home Runs - player
  INSIDE_PARK_HR: 'player',
  LEADOFF_HR: 'player',
  PINCH_HIT_HR: 'player',
  GO_AHEAD_HR: 'player',
  GRAND_SLAM: 'player',
  // Multi-Hit - player
  CYCLE: 'player',
  NATURAL_CYCLE: 'player',
  MULTI_HR_2: 'player',
  MULTI_HR_3: 'player',
  MULTI_HR_4PLUS: 'player',
  BACK_TO_BACK_HR: 'player',
  BACK_TO_BACK_TO_BACK_HR: 'team',
  CLUTCH_GRAND_SLAM: 'player',
  THREE_HIT_GAME: 'player',
  FOUR_HIT_GAME: 'player',
  FIVE_HIT_GAME: 'player',
  SIX_HIT_GAME: 'player',
  FIVE_RBI_GAME: 'player',
  EIGHT_RBI_GAME: 'player',
  TEN_RBI_GAME: 'player',
  // Pitching - pitcher
  NO_HITTER: 'pitcher',
  PERFECT_GAME: 'pitcher',
  MADDUX: 'pitcher',
  COMPLETE_GAME: 'pitcher',
  SHUTOUT: 'pitcher',
  IMMACULATE_INNING: 'pitcher',
  NINE_PITCH_INNING: 'pitcher',
  SHUTDOWN_INNING: 'pitcher',
  STRIKE_OUT_SIDE: 'pitcher',
  TEN_K_GAME: 'pitcher',
  FIFTEEN_K_GAME: 'pitcher',
  ESCAPE_ARTIST: 'pitcher',
  // SMB4 Special
  NUT_SHOT_DELIVERED: 'player',
  NUT_SHOT_TOUGH_GUY: 'fielder',
  KILLED_PITCHER: 'player',
  STAYED_IN_AFTER_HIT: 'player',
  // Position Player Pitching
  PP_CLEAN_INNING: 'pitcher',
  PP_MULTIPLE_CLEAN: 'pitcher',
  PP_GOT_K: 'pitcher',
  // Team Events
  COMEBACK_WIN_3: 'team',
  COMEBACK_WIN_5: 'team',
  COMEBACK_WIN_7: 'team',
  COMEBACK_HERO: 'player',
  RALLY_STARTER: 'player',
  // Milestones
  FIRST_CAREER: 'player',
  CAREER_MILESTONE: 'player',
  // Season Milestones - Batting
  SEASON_40_HR: 'player',
  SEASON_45_HR: 'player',
  SEASON_55_HR: 'player',
  SEASON_160_HITS: 'player',
  SEASON_120_RBI: 'player',
  SEASON_40_SB: 'player',
  SEASON_80_SB: 'player',
  SEASON_400_BA: 'player',
  SEASON_TRIPLE_CROWN: 'player',
  // Season Milestones - Batting Clubs
  CLUB_15_15: 'player',
  CLUB_20_20: 'player',
  CLUB_25_25: 'player',
  CLUB_30_30: 'player',
  CLUB_40_40: 'player',
  // Season Milestones - Pitching
  SEASON_15_WINS: 'pitcher',
  SEASON_20_WINS: 'pitcher',
  SEASON_25_WINS: 'pitcher',
  SEASON_235_K: 'pitcher',
  SEASON_SUB_2_ERA: 'pitcher',
  SEASON_SUB_1_5_ERA: 'pitcher',
  SEASON_40_SAVES: 'pitcher',
  SEASON_PITCHING_TRIPLE_CROWN: 'pitcher',
  // Career Milestones - Batting
  CAREER_HR_TIER: 'player',
  CAREER_HITS_TIER: 'player',
  CAREER_RBI_TIER: 'player',
  CAREER_RUNS_TIER: 'player',
  CAREER_SB_TIER: 'player',
  CAREER_DOUBLES_TIER: 'player',
  CAREER_BB_TIER: 'player',
  CAREER_GRAND_SLAMS_TIER: 'player',
  // Career Milestones - Pitching
  CAREER_WINS_TIER: 'pitcher',
  CAREER_K_TIER: 'pitcher',
  CAREER_SAVES_TIER: 'pitcher',
  CAREER_IP_TIER: 'pitcher',
  CAREER_SHUTOUTS_TIER: 'pitcher',
  CAREER_CG_TIER: 'pitcher',
  CAREER_NO_HITTERS_TIER: 'pitcher',
  CAREER_PERFECT_GAMES_TIER: 'pitcher',
  // Career Milestones - Aggregate
  CAREER_WAR_TIER: 'player',
  // WAR Components
  CAREER_BWAR_TIER: 'player',       // Position players
  CAREER_PWAR_TIER: 'pitcher',      // Pitchers only
  CAREER_FWAR_TIER: 'player',       // All players can field
  CAREER_RWAR_TIER: 'player',       // All players can run bases
  CAREER_GAMES_TIER: 'player',
  CAREER_ALL_STARS_TIER: 'player',
  CAREER_MVPS_TIER: 'player',
  CAREER_CY_YOUNGS_TIER: 'pitcher',
  // Strikeout Shame
  HAT_TRICK: 'player',
  GOLDEN_SOMBRERO: 'player',
  PLATINUM_SOMBRERO: 'player',
  TITANIUM_SOMBRERO: 'player',
  IBB_STRIKEOUT: 'player',
  // Offensive Failures
  HIT_INTO_TRIPLE_PLAY: 'player',
  MEATBALL_WHIFF: 'player',
  BASES_LOADED_FAILURE: 'player',
  LOB_KING: 'player',
  MULTIPLE_GIDP: 'player',
  RALLY_KILLER: 'player',
  // Pitching Disasters
  MELTDOWN: 'pitcher',
  MELTDOWN_SEVERE: 'pitcher',
  FIRST_INNING_DISASTER: 'pitcher',
  WALKED_IN_RUN: 'pitcher',
  B2B2B_HR_ALLOWED: 'pitcher',
  BLOWN_SAVE: 'pitcher',
  BLOWN_SAVE_LOSS: 'pitcher',
  BLOWN_LEAD_3: 'team',
  BLOWN_LEAD_5: 'team',
  // Fielding Errors
  NUT_SHOT_VICTIM: 'fielder',
  DROPPED_FLY: 'fielder',
  DROPPED_FLY_CLUTCH: 'fielder',
  BOOTED_GROUNDER: 'fielder',
  WRONG_BASE_THROW: 'fielder',
  PASSED_BALL_RUN: 'fielder',
  PASSED_BALL_WINNING_RUN: 'fielder',
  // Baserunning
  TOOTBLAN: 'player',
  TOOTBLAN_RALLY_KILLER: 'player',
  PICKED_OFF_END_GAME: 'player',
  PICKED_OFF_END_INNING: 'player',
  BATTER_OUT_STRETCHING: 'player',
  // PP Pitching Failures
  PP_GAVE_UP_RUNS: 'pitcher',
  // Season Negative Milestones - Batting
  SEASON_200_K_BATTER: 'player',
  SEASON_250_K_BATTER: 'player',
  SEASON_SUB_200_BA: 'player',
  SEASON_30_GIDP: 'player',
  SEASON_20_ERRORS: 'fielder',
  // Season Negative Milestones - Pitching
  SEASON_20_LOSSES: 'pitcher',
  SEASON_6_ERA: 'pitcher',
  SEASON_100_BB: 'pitcher',
  SEASON_20_BLOWN_SAVES: 'pitcher',
  SEASON_40_HR_ALLOWED: 'pitcher',
  // Career Negative Milestones
  CAREER_K_BATTER_TIER: 'player',
  CAREER_GIDP_TIER: 'player',
  CAREER_CS_TIER: 'player',
  CAREER_LOSSES_TIER: 'pitcher',
  CAREER_BLOWN_SAVES_TIER: 'pitcher',
  CAREER_WILD_PITCHES_TIER: 'pitcher',
  CAREER_HBP_PITCHER_TIER: 'pitcher',
  CAREER_ERRORS_TIER: 'fielder',
  CAREER_PASSED_BALLS_TIER: 'fielder'
};

// Fame event record
export interface FameEvent {
  id: string;
  gameId: string;
  inning: number;
  halfInning: HalfInning;
  timestamp: number;

  // Event details
  eventType: FameEventType;
  fameValue: number;
  fameType: 'bonus' | 'boner';

  // Participants
  playerId: string;
  playerName: string;
  playerTeam: string;

  // Context
  autoDetected: boolean;
  description?: string;
  relatedPlayId?: string;

  // Performance context (for weighting adjustments)
  leverageIndex?: number;  // Situation criticality (0.1-10.0, 1.0 = average)

  // For events involving multiple players
  secondaryPlayerId?: string;
  secondaryPlayerName?: string;
}

// Player's Fame summary for a game
export interface PlayerGameFame {
  playerId: string;
  playerName: string;
  teamId: string;
  bonuses: FameEvent[];
  boners: FameEvent[];
  netFame: number;
}

// Game Fame summary
export interface GameFameSummary {
  gameId: string;
  awayTeam: {
    teamId: string;
    teamName: string;
    netFame: number;
    events: FameEvent[];
    playerFame: PlayerGameFame[];
  };
  homeTeam: {
    teamId: string;
    teamName: string;
    netFame: number;
    events: FameEvent[];
    playerFame: PlayerGameFame[];
  };
}

// Auto-detection settings
export interface FameAutoDetectionSettings {
  enabled: boolean;
  showToasts: boolean;
  requireConfirmation: boolean;
}

export const DEFAULT_FAME_SETTINGS: FameAutoDetectionSettings = {
  enabled: true,
  showToasts: true,
  requireConfirmation: false
};

// Helper functions for Fame
export function isFameBonus(eventType: FameEventType): boolean {
  return FAME_VALUES[eventType] > 0;
}

export function isFameBoner(eventType: FameEventType): boolean {
  return FAME_VALUES[eventType] < 0;
}

export function createFameEvent(
  gameId: string,
  inning: number,
  halfInning: HalfInning,
  eventType: FameEventType,
  playerId: string,
  playerName: string,
  playerTeam: string,
  autoDetected: boolean,
  description?: string,
  secondaryPlayerId?: string,
  secondaryPlayerName?: string,
  leverageIndex?: number  // Optional LI for adjusting Fame in clutch situations
): FameEvent {
  // Base fame value from event type
  let fameValue = FAME_VALUES[eventType];

  // Apply Leverage Index adjustment if provided
  // Per LEVERAGE_INDEX_SPEC.md: LI > 1.0 amplifies fame, LI < 1.0 reduces it
  // Use square root to dampen extreme values (LI can go up to 10.0)
  if (leverageIndex !== undefined && leverageIndex > 0) {
    const liMultiplier = Math.sqrt(leverageIndex);
    fameValue = fameValue * liMultiplier;
    // Round to 2 decimal places
    fameValue = Math.round(fameValue * 100) / 100;
  }

  return {
    id: `fame_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    gameId,
    inning,
    halfInning,
    timestamp: Date.now(),
    eventType,
    fameValue,
    fameType: FAME_VALUES[eventType] > 0 ? 'bonus' : 'boner',
    playerId,
    playerName,
    playerTeam,
    autoDetected,
    description,
    secondaryPlayerId,
    secondaryPlayerName,
    leverageIndex,
  };
}

// Calculate net Fame for a list of events
export function calculateNetFame(events: FameEvent[]): number {
  return events.reduce((sum, event) => sum + event.fameValue, 0);
}

// Group Fame events by player
export function groupFameByPlayer(events: FameEvent[]): Map<string, PlayerGameFame> {
  const playerMap = new Map<string, PlayerGameFame>();

  for (const event of events) {
    if (!playerMap.has(event.playerId)) {
      playerMap.set(event.playerId, {
        playerId: event.playerId,
        playerName: event.playerName,
        teamId: event.playerTeam,
        bonuses: [],
        boners: [],
        netFame: 0
      });
    }

    const playerFame = playerMap.get(event.playerId)!;
    if (event.fameType === 'bonus') {
      playerFame.bonuses.push(event);
    } else {
      playerFame.boners.push(event);
    }
    playerFame.netFame += event.fameValue;
  }

  return playerMap;
}

// ============================================
// FAME AUTO-DETECTION TYPES
// ============================================

// Player game stats for auto-detection
export interface PlayerGameStats {
  playerId: string;
  playerName: string;
  teamId: string;
  // Batting
  hits: { '1B': number; '2B': number; '3B': number; 'HR': number };
  strikeouts: number;
  atBats: number;
  walks: number;
  // Pitching
  runsAllowed: number;
  hitsAllowed: number;
  walksAllowed: number;
  hitBatters: number;
  homeRunsAllowed: number;
  outs: number;  // Outs recorded while pitching
  consecutiveHRsAllowed: number;
  pitchCount?: number;
  isStarter: boolean;
  // Fielding
  errors: number;
}

// Detect Fame events from game state
export type FameDetectionResult = {
  detected: boolean;
  eventType?: FameEventType;
  playerId?: string;
  playerName?: string;
  description?: string;
};

// Calculate situational context from game state
export function updateSituationalContext(
  score: { away: number; home: number },
  inning: number,
  halfInning: HalfInning,
  runners: Bases
): SituationalContext {
  const scoreDiff = halfInning === 'TOP'
    ? score.away - score.home
    : score.home - score.away;

  const runnersOnBase = countRunners(runners);
  const risp = hasRISP(runners);
  const loaded = isBasesLoaded(runners);

  return {
    isCloseGame: Math.abs(scoreDiff) <= 2,
    scoreDifferential: scoreDiff,
    isRISP: risp,
    isBasesLoaded: loaded,
    isLateInning: inning >= 7,
    isTieGame: scoreDiff === 0,
    isClutchSituation: Math.abs(scoreDiff) <= 2 && (risp || inning >= 7),
    isWalkOffOpportunity: halfInning === 'BOTTOM' && inning >= 9 &&
      (scoreDiff <= 0 || scoreDiff <= runnersOnBase + 1),
    isGoAheadOpportunity: scoreDiff <= 0 && scoreDiff > -(runnersOnBase + 1),
    isSaveOpportunity: halfInning === 'TOP' && inning >= 9 &&
      scoreDiff >= 1 && scoreDiff <= 3
  };
}
