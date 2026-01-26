/**
 * Detection Functions
 * Per DETECTION_FUNCTIONS_IMPLEMENTATION.md
 *
 * Additional detection functions beyond what's in useFameDetection.ts:
 * - Prompt detection (user confirms)
 * - Manual event triggers
 * - Blown save detection
 * - Triple play detection
 * - TOOTBLAN detection
 * - Position player pitching
 */

import type { FameEventType, Position, AtBatResult, Bases, HalfInning } from '../types/game';
import { hasRISP, isBasesLoaded, countRunners } from '../types/game';

// ============================================
// TYPES
// ============================================

export interface DetectionContext {
  gameId: string;
  inning: number;
  halfInning: HalfInning;
  outs: number;
  score: { away: number; home: number };
  bases: Bases;
  leverageIndex?: number;
  isPlayoffs?: boolean;
}

export interface PlayResult {
  result: AtBatResult;
  batterId: string;
  batterName: string;
  pitcherId: string;
  pitcherName: string;
  rbi: number;
  runnerOutcomes?: {
    first?: 'SCORED' | 'ADVANCE' | 'OUT' | 'HELD';
    second?: 'SCORED' | 'ADVANCE' | 'OUT' | 'HELD';
    third?: 'SCORED' | 'ADVANCE' | 'OUT' | 'HELD';
  };
  fieldingData?: {
    catchType?: 'DIVING_CATCH' | 'WALL_CATCH' | 'LEAPING_CATCH' | 'ROUTINE';
    savedRun?: boolean;
    primaryFielder?: Position;
    assistChain?: Position[];
    putoutPosition?: Position;
    errorType?: 'fielding' | 'throwing' | 'missed_catch';
  };
}

export interface PitcherAppearance {
  pitcherId: string;
  pitcherName: string;
  teamId: string;
  enteredInSaveOpportunity: boolean;
  inheritedRunners: number;
  inheritedRunnersScored: number;
  runsAllowedOwn: number;
  outsRecorded: number;
  leadWhenEntered: number;
  leadWhenExited: number;
  isPositionPlayer: boolean;
}

export interface PromptResult {
  shouldPrompt: boolean;
  eventType: FameEventType;
  message: string;
  defaultAnswer?: boolean;
}

// ============================================
// PROMPT DETECTION FUNCTIONS
// These suggest events for user confirmation
// ============================================

/**
 * Prompt for Web Gem after diving/leaping/wall catches
 */
export function promptWebGem(
  play: PlayResult,
  context: DetectionContext
): PromptResult | null {
  const catchType = play.fieldingData?.catchType;

  if (!catchType || catchType === 'ROUTINE') {
    return null;
  }

  // Diving, wall, or leaping catches can be web gems
  if (['DIVING_CATCH', 'WALL_CATCH', 'LEAPING_CATCH'].includes(catchType)) {
    const savedRunContext = play.fieldingData?.savedRun
      ? ' (saved a run!)'
      : '';

    return {
      shouldPrompt: true,
      eventType: 'WEB_GEM',
      message: `Was that catch a Web Gem?${savedRunContext}`,
      defaultAnswer: catchType === 'WALL_CATCH' || play.fieldingData?.savedRun,
    };
  }

  return null;
}

/**
 * Prompt for Robbery (HR-saving catch)
 */
export function promptRobbery(
  play: PlayResult,
  context: DetectionContext,
  wasBasesLoaded: boolean
): PromptResult | null {
  const catchType = play.fieldingData?.catchType;

  // Wall catches are potential robberies
  if (catchType !== 'WALL_CATCH') {
    return null;
  }

  const eventType: FameEventType = wasBasesLoaded
    ? 'ROBBERY_GRAND_SLAM'
    : 'ROBBERY';

  return {
    shouldPrompt: true,
    eventType,
    message: wasBasesLoaded
      ? 'Did they rob a GRAND SLAM?!'
      : 'Did they rob a home run?',
    defaultAnswer: true, // Wall catches are usually robberies
  };
}

/**
 * Prompt for TOOTBLAN after runner out
 */
export function promptTOOTBLAN(
  play: PlayResult,
  context: DetectionContext,
  outType: 'PICKED_OFF' | 'CAUGHT_STEALING' | 'OUT_ADVANCING' | 'PASSED_RUNNER'
): PromptResult | null {
  // TOOTBLANs occur when runner is thrown out on the basepaths
  // in an obviously bad baserunning decision

  const isHighLeverage = (context.leverageIndex || 1.0) >= 1.5;
  const isRunnerInScoringPosition = hasRISP(context.bases);
  const isRallyKiller = isRunnerInScoringPosition && context.outs === 2;

  const eventType: FameEventType = isRallyKiller
    ? 'TOOTBLAN_RALLY_KILLER'
    : 'TOOTBLAN';

  let message = 'Was that a TOOTBLAN (Thrown Out On The Basepaths Like A Nincompoop)?';
  if (isRallyKiller) {
    message = 'TOOTBLAN that killed the rally?';
  }

  return {
    shouldPrompt: true,
    eventType,
    message,
    defaultAnswer: outType === 'PICKED_OFF' || outType === 'PASSED_RUNNER',
  };
}

/**
 * Prompt for Nut Shot event
 */
export function promptNutShot(
  play: PlayResult,
  context: DetectionContext,
  affectedFielder: Position
): PromptResult | null {
  // Nut shots happen on ground balls that hit a fielder
  if (!['GO', 'E'].includes(play.result)) {
    return null;
  }

  return {
    shouldPrompt: true,
    eventType: affectedFielder === play.fieldingData?.primaryFielder
      ? 'NUT_SHOT_VICTIM'
      : 'NUT_SHOT_DELIVERED',
    message: `Did the ball hit ${affectedFielder} in the... sensitive area?`,
    defaultAnswer: false,
  };
}

/**
 * Prompt for Killed Pitcher (comebacker injury)
 */
export function promptKilledPitcher(
  play: PlayResult,
  context: DetectionContext
): PromptResult | null {
  // Only on line drives back up the middle
  if (play.result !== 'E' && !['GO', 'LO'].includes(play.result)) {
    return null;
  }

  // Primary fielder should be pitcher
  if (play.fieldingData?.primaryFielder !== 'P') {
    return null;
  }

  return {
    shouldPrompt: true,
    eventType: 'KILLED_PITCHER',
    message: 'Did the pitcher get hit by a comebacker?',
    defaultAnswer: false,
  };
}

// ============================================
// BLOWN SAVE DETECTION
// ============================================

/**
 * Detect blown save
 * A save opportunity exists when:
 * 1. Pitcher enters with a lead of 3 runs or less (or tying run on base/at bat)
 * 2. Pitcher is not the winning pitcher of record
 *
 * A blown save occurs when the pitcher fails to maintain the lead
 */
export function detectBlownSave(
  appearance: PitcherAppearance,
  gameEnded: boolean,
  teamWon: boolean
): { eventType: FameEventType; message: string } | null {
  if (!appearance.enteredInSaveOpportunity) {
    return null;
  }

  // Lead was lost or tied
  if (appearance.leadWhenExited <= 0 && appearance.leadWhenEntered > 0) {
    // Check if it resulted in a loss
    const isBlownSaveLoss = gameEnded && !teamWon;

    return {
      eventType: isBlownSaveLoss ? 'BLOWN_SAVE_LOSS' : 'BLOWN_SAVE',
      message: isBlownSaveLoss
        ? `${appearance.pitcherName} blew the save AND took the loss!`
        : `${appearance.pitcherName} blew the save!`,
    };
  }

  return null;
}

/**
 * Detect save opportunity entry
 */
export function isSaveOpportunity(
  lead: number,
  bases: Bases,
  inning: number,
  scheduledInnings: number = 9
): boolean {
  if (lead <= 0) return false;
  if (inning < scheduledInnings - 2) return false; // Must be 7th or later for 9-inning game

  // Save opportunity conditions:
  // 1. Lead of 3 runs or less
  if (lead <= 3) return true;

  // 2. Tying run is on base, at bat, or on deck
  // Tying run is "at bat or closer" if lead <= (runners + 1)
  // E.g., lead=4, runners=3 (loaded): tying run = next batter (at bat) ✓
  // E.g., lead=4, runners=0 (empty): tying run = 4th batter away ✗
  const runnersCount = countRunners(bases);
  return lead <= (runnersCount + 1);
}

// ============================================
// TRIPLE PLAY DETECTION
// ============================================

/**
 * Detect triple play
 */
export function detectTriplePlay(
  outsOnPlay: number,
  assistChain: Position[],
  putoutPositions: Position[]
): { eventType: FameEventType; message: string } | null {
  if (outsOnPlay !== 3) {
    return null;
  }

  // Unassisted triple play: one fielder, no assists
  const isUnassisted = assistChain.length === 0 && putoutPositions.length === 1;

  return {
    eventType: isUnassisted ? 'UNASSISTED_TRIPLE_PLAY' : 'TRIPLE_PLAY',
    message: isUnassisted
      ? 'UNASSISTED TRIPLE PLAY! One of the rarest plays in baseball!'
      : 'TRIPLE PLAY! Three outs on one play!',
  };
}

/**
 * Detect hit into triple play (batter's shame)
 */
export function detectHitIntoTriplePlay(
  outsOnPlay: number,
  batterId: string,
  batterName: string
): { eventType: FameEventType; message: string; playerId: string } | null {
  if (outsOnPlay !== 3) {
    return null;
  }

  return {
    eventType: 'HIT_INTO_TRIPLE_PLAY',
    message: `${batterName} hit into a TRIPLE PLAY!`,
    playerId: batterId,
  };
}

// ============================================
// ESCAPE ARTIST DETECTION
// ============================================

/**
 * Detect Escape Artist (bases loaded, no outs → no runs)
 */
export function detectEscapeArtist(
  pitcherId: string,
  pitcherName: string,
  basesLoadedNoOutsOccurred: boolean,
  runsAllowedAfter: number,
  outsAfter: number
): { eventType: FameEventType; message: string } | null {
  if (!basesLoadedNoOutsOccurred) {
    return null;
  }

  // Must have gotten out of inning (3 outs) with no runs
  if (outsAfter >= 3 && runsAllowedAfter === 0) {
    return {
      eventType: 'ESCAPE_ARTIST',
      message: `${pitcherName} loaded the bases with no outs and escaped without allowing a run!`,
    };
  }

  return null;
}

// ============================================
// POSITION PLAYER PITCHING DETECTION
// ============================================

/**
 * Detect position player pitching events
 */
export function detectPositionPlayerPitching(
  appearance: PitcherAppearance,
  strikeouts: number,
  inningsComplete: number
): { eventType: FameEventType; message: string }[] {
  if (!appearance.isPositionPlayer) {
    return [];
  }

  const results: { eventType: FameEventType; message: string }[] = [];

  // Clean inning
  if (inningsComplete >= 1 && appearance.runsAllowedOwn === 0) {
    if (inningsComplete >= 2) {
      results.push({
        eventType: 'PP_MULTIPLE_CLEAN',
        message: `Position player ${appearance.pitcherName} threw ${inningsComplete} clean innings!`,
      });
    } else {
      results.push({
        eventType: 'PP_CLEAN_INNING',
        message: `Position player ${appearance.pitcherName} threw a clean inning!`,
      });
    }
  }

  // Got a strikeout
  if (strikeouts > 0) {
    results.push({
      eventType: 'PP_GOT_K',
      message: `Position player ${appearance.pitcherName} struck someone out!`,
    });
  }

  // Gave up runs (negative)
  if (appearance.runsAllowedOwn >= 3) {
    results.push({
      eventType: 'PP_GAVE_UP_RUNS',
      message: `Position player ${appearance.pitcherName} gave up ${appearance.runsAllowedOwn} runs...`,
    });
  }

  return results;
}

// ============================================
// FIELDING ERROR DETECTION
// ============================================

/**
 * Detect dropped fly ball
 */
export function detectDroppedFly(
  errorType: 'fielding' | 'throwing' | 'missed_catch' | undefined,
  playType: string,
  context: DetectionContext,
  fielderId: string,
  fielderName: string
): { eventType: FameEventType; message: string; playerId: string } | null {
  if (errorType !== 'missed_catch') {
    return null;
  }

  if (!['FO', 'PO', 'LO'].includes(playType)) {
    return null;
  }

  const isClutch = (context.leverageIndex || 1.0) >= 2.0;

  return {
    eventType: isClutch ? 'DROPPED_FLY_CLUTCH' : 'DROPPED_FLY',
    message: isClutch
      ? `${fielderName} drops the fly ball in a CLUTCH situation!`
      : `${fielderName} drops the fly ball!`,
    playerId: fielderId,
  };
}

/**
 * Detect booted grounder
 */
export function detectBootedGrounder(
  errorType: 'fielding' | 'throwing' | 'missed_catch' | undefined,
  playType: string,
  fielderId: string,
  fielderName: string
): { eventType: FameEventType; message: string; playerId: string } | null {
  if (errorType !== 'fielding') {
    return null;
  }

  if (playType !== 'GO') {
    return null;
  }

  return {
    eventType: 'BOOTED_GROUNDER',
    message: `${fielderName} booted the grounder!`,
    playerId: fielderId,
  };
}

/**
 * Detect wrong base throw
 */
export function detectWrongBaseThrow(
  errorType: 'fielding' | 'throwing' | 'missed_catch' | undefined,
  wasWrongTarget: boolean,
  fielderId: string,
  fielderName: string
): { eventType: FameEventType; message: string; playerId: string } | null {
  if (errorType !== 'throwing' || !wasWrongTarget) {
    return null;
  }

  return {
    eventType: 'WRONG_BASE_THROW',
    message: `${fielderName} threw to the wrong base!`,
    playerId: fielderId,
  };
}

// ============================================
// CATCHER EVENTS
// ============================================

/**
 * Detect passed ball run
 */
export function detectPassedBallRun(
  runScored: boolean,
  wasWinningRun: boolean,
  catcherId: string,
  catcherName: string
): { eventType: FameEventType; message: string; playerId: string } | null {
  if (!runScored) {
    return null;
  }

  return {
    eventType: wasWinningRun ? 'PASSED_BALL_WINNING_RUN' : 'PASSED_BALL_RUN',
    message: wasWinningRun
      ? `${catcherName}'s passed ball allowed the WINNING RUN!`
      : `${catcherName}'s passed ball allowed a run to score!`,
    playerId: catcherId,
  };
}

/**
 * Detect throw out at home (outfield assist)
 */
export function detectThrowOutAtHome(
  assistPosition: Position,
  wasOutAtHome: boolean,
  fielderId: string,
  fielderName: string
): { eventType: FameEventType; message: string; playerId: string } | null {
  if (!wasOutAtHome) {
    return null;
  }

  // Only credit outfielders
  if (!['LF', 'CF', 'RF'].includes(assistPosition)) {
    return null;
  }

  return {
    eventType: 'THROW_OUT_AT_HOME',
    message: `${fielderName} guns down the runner at home!`,
    playerId: fielderId,
  };
}

// ============================================
// BASERUNNING EVENTS
// ============================================

/**
 * Detect picked off to end game/inning
 */
export function detectPickedOff(
  context: DetectionContext,
  runnerId: string,
  runnerName: string,
  outsAfterPickoff: number,
  gameEnded: boolean
): { eventType: FameEventType; message: string; playerId: string } | null {
  // Picked off to end game
  if (gameEnded) {
    return {
      eventType: 'PICKED_OFF_END_GAME',
      message: `${runnerName} picked off to END THE GAME!`,
      playerId: runnerId,
    };
  }

  // Picked off to end inning
  if (outsAfterPickoff >= 3) {
    return {
      eventType: 'PICKED_OFF_END_INNING',
      message: `${runnerName} picked off to end the inning!`,
      playerId: runnerId,
    };
  }

  return null;
}

// ============================================
// WALKED IN RUN DETECTION
// ============================================

/**
 * Detect walked in run (BB with bases loaded)
 */
export function detectWalkedInRun(
  result: AtBatResult,
  wasBasesLoaded: boolean,
  pitcherId: string,
  pitcherName: string
): { eventType: FameEventType; message: string; playerId: string } | null {
  if (!['BB', 'IBB', 'HBP'].includes(result)) {
    return null;
  }

  if (!wasBasesLoaded) {
    return null;
  }

  return {
    eventType: 'WALKED_IN_RUN',
    message: `${pitcherName} walked in a run!`,
    playerId: pitcherId,
  };
}

// ============================================
// INSIDE THE PARK HR DETECTION
// ============================================

/**
 * Prompt for inside the park HR
 * (User must confirm as system can't detect ball not leaving field)
 */
export function promptInsideParkHR(
  play: PlayResult
): PromptResult | null {
  // Only on HR results
  if (play.result !== 'HR') {
    return null;
  }

  return {
    shouldPrompt: true,
    eventType: 'INSIDE_PARK_HR',
    message: 'Was that an inside-the-park home run?',
    defaultAnswer: false, // Rare, default to no
  };
}

// ============================================
// CLUTCH GRAND SLAM DETECTION
// ============================================

/**
 * Detect clutch grand slam (ties or takes lead)
 */
export function detectClutchGrandSlam(
  result: AtBatResult,
  wasBasesLoaded: boolean,
  rbi: number,
  scoreBefore: { batting: number; fielding: number },
  batterId: string,
  batterName: string
): { eventType: FameEventType; message: string; playerId: string } | null {
  // Must be a grand slam
  if (result !== 'HR' || !wasBasesLoaded || rbi < 4) {
    return null;
  }

  // Check if it ties or takes lead
  const deficit = scoreBefore.fielding - scoreBefore.batting;
  const tiedOrTookLead = deficit >= 0 && deficit <= 4; // Was behind or tied, now ahead or tied

  if (!tiedOrTookLead) {
    return null;
  }

  return {
    eventType: 'CLUTCH_GRAND_SLAM',
    message: `${batterName} hits a CLUTCH GRAND SLAM to ${deficit === 4 ? 'TIE' : 'TAKE THE LEAD'}!`,
    playerId: batterId,
  };
}

// ============================================
// RALLY DETECTION
// ============================================

/**
 * Detect rally starter (first batter to reach in rally of 3+ runs)
 */
export function detectRallyStarter(
  isFirstBatterOfRally: boolean,
  rallyRunsScored: number,
  batterId: string,
  batterName: string
): { eventType: FameEventType; message: string; playerId: string } | null {
  if (!isFirstBatterOfRally || rallyRunsScored < 3) {
    return null;
  }

  return {
    eventType: 'RALLY_STARTER',
    message: `${batterName} started the ${rallyRunsScored}-run rally!`,
    playerId: batterId,
  };
}

/**
 * Detect rally killer (ended rally with RISP)
 */
export function detectRallyKiller(
  wasRallyActive: boolean,
  runnersStrandedInScoringPosition: number,
  batterId: string,
  batterName: string
): { eventType: FameEventType; message: string; playerId: string } | null {
  if (!wasRallyActive || runnersStrandedInScoringPosition < 2) {
    return null;
  }

  return {
    eventType: 'RALLY_KILLER',
    message: `${batterName} killed the rally with ${runnersStrandedInScoringPosition} runners stranded in scoring position!`,
    playerId: batterId,
  };
}

// ============================================
// IBB STRIKEOUT DETECTION
// ============================================

/**
 * Detect IBB followed by strikeout (or K following IBB to previous batter)
 * This is embarrassing for the pitcher who walked someone intentionally
 * only to give up a hit to the next batter
 */
export function detectIBBStrikeout(
  previousBatterWasIBB: boolean,
  currentResult: AtBatResult,
  pitcherId: string,
  pitcherName: string
): { eventType: FameEventType; message: string; playerId: string } | null {
  // Looking for: IBB → next batter gets hit/HR
  // But the FameEventType is IBB_STRIKEOUT which is about the batter striking out
  // after an IBB? Let me re-check...
  // Actually IBB_STRIKEOUT is a boner for the BATTER who strikes out after
  // the pitcher intentionally walked someone to face them

  if (!previousBatterWasIBB) {
    return null;
  }

  // Pitcher IBB'd to pitch to this batter, and this batter struck out
  if (currentResult === 'K' || currentResult === 'KL') {
    return null; // This is expected - the batter striking out validates the IBB
  }

  // Actually looking at the spec again, IBB_STRIKEOUT is:
  // "Batter strikes out after the pitcher intentionally walked someone to face them"
  // So if the pitcher IBB'd the previous batter to face THIS batter, and THIS batter
  // struck out, that's embarrassing for the BATTER, not the pitcher

  // Let me reconsider: this needs the batter who struck out
  return null; // Will implement as part of flow where we track IBB state
}

// ============================================
// HELPERS
// ============================================

/**
 * Get all prompt detections for a play
 */
export function getPromptDetections(
  play: PlayResult,
  context: DetectionContext,
  additionalContext: {
    wasBasesLoaded?: boolean;
    runnerOut?: boolean;
    outType?: 'PICKED_OFF' | 'CAUGHT_STEALING' | 'OUT_ADVANCING' | 'PASSED_RUNNER';
    affectedFielder?: Position;
  }
): PromptResult[] {
  const prompts: PromptResult[] = [];

  // Web gem
  const webGem = promptWebGem(play, context);
  if (webGem) prompts.push(webGem);

  // Robbery
  const robbery = promptRobbery(play, context, additionalContext.wasBasesLoaded || false);
  if (robbery) prompts.push(robbery);

  // TOOTBLAN
  if (additionalContext.runnerOut && additionalContext.outType) {
    const tootblan = promptTOOTBLAN(play, context, additionalContext.outType);
    if (tootblan) prompts.push(tootblan);
  }

  // Nut shot
  if (additionalContext.affectedFielder) {
    const nutShot = promptNutShot(play, context, additionalContext.affectedFielder);
    if (nutShot) prompts.push(nutShot);
  }

  // Killed pitcher
  const killedPitcher = promptKilledPitcher(play, context);
  if (killedPitcher) prompts.push(killedPitcher);

  // Inside park HR
  const insidePark = promptInsideParkHR(play);
  if (insidePark) prompts.push(insidePark);

  return prompts;
}
