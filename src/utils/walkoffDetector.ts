/**
 * Walkoff Detection Utility
 * Per Ralph Framework S-B015
 *
 * Detects walkoff wins:
 * - Bottom of 9th or later (extra innings)
 * - Home team scores winning run
 * - Identifies the walkoff hero
 */

export interface PlayEvent {
  batterId: string;
  batterName: string;
  outcome: string;
  runsScored?: number;
}

export interface WalkoffResult {
  isWalkoff: boolean;
  heroId: string | null;
  heroName: string | null;
  heroTeamId: string | null;
  playType: 'HR' | 'HIT' | 'WALK' | 'HBP' | 'ERROR' | 'SAC' | 'OTHER' | null;
  runnerScored: boolean;
  inning: number;
  margin: number; // How many runs they won by (usually 1)
}

interface WalkoffContext {
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  homeScore: number;
  awayScore: number;
  homeTeamId: string;
  isGameOver: boolean;
}

/**
 * Check if conditions allow for a walkoff
 */
export function canWalkoff(context: WalkoffContext): boolean {
  // Must be bottom of inning
  if (context.halfInning !== 'BOTTOM') return false;

  // Must be 9th inning or later
  if (context.inning < 9) return false;

  // Home team must be tied or behind
  // (If ahead, game would have ended after top of inning)
  if (context.homeScore > context.awayScore) return false;

  return true;
}

/**
 * Detect if the current play results in a walkoff win
 */
export function detectWalkoff(
  playEvent: PlayEvent,
  context: WalkoffContext
): WalkoffResult {
  const noWalkoff: WalkoffResult = {
    isWalkoff: false,
    heroId: null,
    heroName: null,
    heroTeamId: null,
    playType: null,
    runnerScored: false,
    inning: context.inning,
    margin: 0,
  };

  // Check basic walkoff conditions
  if (!canWalkoff(context)) {
    return noWalkoff;
  }

  // Calculate runs scored on this play
  const runsScored = playEvent.runsScored || 0;

  if (runsScored === 0) {
    return noWalkoff;
  }

  // Check if this scoring play wins the game
  const newHomeScore = context.homeScore + runsScored;

  if (newHomeScore <= context.awayScore) {
    // Still not winning
    return noWalkoff;
  }

  // It's a walkoff!
  const playType = determinePlayType(playEvent);

  return {
    isWalkoff: true,
    heroId: playEvent.batterId,
    heroName: playEvent.batterName,
    heroTeamId: context.homeTeamId,
    playType,
    runnerScored: runsScored > 0,
    inning: context.inning,
    margin: newHomeScore - context.awayScore,
  };
}

/**
 * Determine the type of play for display
 */
function determinePlayType(
  playEvent: PlayEvent
): 'HR' | 'HIT' | 'WALK' | 'HBP' | 'ERROR' | 'SAC' | 'OTHER' {
  const outcome = playEvent.outcome.toUpperCase();

  if (outcome.includes('HOME RUN') || outcome === 'HR') return 'HR';
  if (outcome.includes('SINGLE') || outcome.includes('DOUBLE') || outcome.includes('TRIPLE')) return 'HIT';
  if (outcome.includes('WALK') || outcome === 'BB' || outcome === 'IBB') return 'WALK';
  if (outcome.includes('HIT BY PITCH') || outcome === 'HBP') return 'HBP';
  if (outcome.includes('ERROR')) return 'ERROR';
  if (outcome.includes('SAC') || outcome.includes('SACRIFICE')) return 'SAC';

  return 'OTHER';
}

/**
 * Get walkoff description for narrative
 */
export function getWalkoffDescription(result: WalkoffResult): string {
  if (!result.isWalkoff || !result.heroName) return '';

  const playDescriptions: Record<string, string> = {
    HR: `${result.heroName} hits a walkoff home run!`,
    HIT: `${result.heroName} delivers a walkoff hit!`,
    WALK: `${result.heroName} draws a walkoff walk!`,
    HBP: `${result.heroName} is hit by pitch for the walkoff!`,
    ERROR: `${result.heroName} reaches on error for the walkoff!`,
    SAC: `${result.heroName} hits a walkoff sacrifice!`,
    OTHER: `${result.heroName} delivers the walkoff winner!`,
  };

  return playDescriptions[result.playType || 'OTHER'];
}

/**
 * Get fame bonus for walkoff
 * Per SPECIAL_EVENTS_SPEC.md:
 * - Walkoff hit: +3 Fame
 * - Walkoff HR: +5 Fame (HR +2 base, +3 walkoff bonus)
 */
export function getWalkoffFameBonus(result: WalkoffResult): number {
  if (!result.isWalkoff) return 0;

  // Walkoff HR gets extra bonus
  if (result.playType === 'HR') {
    return 5; // +2 for HR + +3 for walkoff
  }

  // Other walkoff plays
  return 3;
}

/**
 * Check if any extra innings walkoff (for special narrative)
 */
export function isExtraInningsWalkoff(result: WalkoffResult): boolean {
  return result.isWalkoff && result.inning > 9;
}
