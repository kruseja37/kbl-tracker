/**
 * D3K (Dropped Third Strike) Tracker
 *
 * Per FIGMA_IMPLEMENTATION_PLAN.md Phase 1.4
 *
 * The Dropped Third Strike (D3K) rule in baseball:
 * - When the catcher fails to catch the third strike, the batter can attempt to reach first
 * - ONLY legal when: first base is empty OR there are 2 outs
 * - If illegal (runner on first with less than 2 outs), batter is out automatically
 *
 * D3K Outcomes:
 * 1. D3K_REACHED - Batter safely reaches first base
 * 2. D3K_THROWN_OUT - Batter thrown out at first (C-1 putout)
 * 3. D3K_ILLEGAL - D3K not legal, batter automatically out
 * 4. D3K_ERROR - Error on the throw allows batter to reach
 * 5. D3K_WILD_THROW - Wild throw allows extra bases
 *
 * Stats Tracking:
 * - Catcher: Dropped third strikes allowed, throwouts
 * - Batter: D3K reaches, D3K attempts
 * - Pitcher: Strikeouts (K is recorded even if D3K)
 */

// ============================================
// TYPES
// ============================================

export type D3KOutcome =
  | 'D3K_REACHED'      // Batter safely reaches first
  | 'D3K_THROWN_OUT'   // Catcher throws out batter at first
  | 'D3K_ILLEGAL'      // D3K not legal (batter out)
  | 'D3K_ERROR'        // Error on throw, batter reaches
  | 'D3K_WILD_THROW'   // Wild throw, batter may take extra bases
  | 'D3K_FORCE_OUT';   // Forced out elsewhere (rare)

export interface D3KEvent {
  /** Type of event */
  eventType: 'D3K';
  /** Specific outcome */
  outcome: D3KOutcome;
  /** Was the D3K legal? */
  isLegal: boolean;
  /** Batter ID */
  batterId: string;
  /** Batter name */
  batterName: string;
  /** Catcher ID */
  catcherId: string;
  /** Catcher name */
  catcherName: string;
  /** Pitcher ID (gets the K) */
  pitcherId: string;
  /** Pitcher name */
  pitcherName: string;
  /** Where batter ended up */
  batterResult: 'first' | 'second' | 'third' | 'out';
  /** Was it swinging or looking? */
  strikeoutType: 'swinging' | 'looking';
  /** Game situation */
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  outs: number;
  /** Runners on base before play */
  basesBefore: {
    first: boolean;
    second: boolean;
    third: boolean;
  };
  /** Optional throw sequence (e.g., ['C', '1B']) */
  throwSequence?: string[];
  /** Optional error info */
  errorInfo?: {
    fielderId: string;
    fielderName: string;
    errorType: 'THROWING' | 'FIELDING';
  };
}

export interface D3KStats {
  /** Total D3K attempts */
  attempts: number;
  /** Times reached safely */
  reached: number;
  /** Times thrown out */
  thrownOut: number;
  /** Times D3K was illegal */
  illegal: number;
  /** Times reached on error */
  errors: number;
  /** Times reached on wild throw */
  wildThrows: number;
}

export interface CatcherD3KStats {
  /** Total drops */
  droppedThirdStrikes: number;
  /** Successful throwouts */
  throwouts: number;
  /** Failed throws (batter safe) */
  failedThrows: number;
  /** Errors on D3K throws */
  errors: number;
  /** Throwout percentage */
  throwoutRate: number;
}

// ============================================
// D3K LEGALITY CHECK
// ============================================

/**
 * Check if D3K is legal in current situation
 *
 * D3K is legal when:
 * - First base is unoccupied, OR
 * - There are 2 outs (force play possible)
 */
export function isD3KLegal(
  firstBaseOccupied: boolean,
  outs: number
): boolean {
  if (!firstBaseOccupied) return true;
  if (outs >= 2) return true;
  return false;
}

/**
 * Get D3K legality with explanation
 */
export function checkD3KLegality(
  firstBaseOccupied: boolean,
  outs: number
): { isLegal: boolean; reason: string } {
  if (!firstBaseOccupied) {
    return {
      isLegal: true,
      reason: 'First base empty - D3K legal',
    };
  }

  if (outs >= 2) {
    return {
      isLegal: true,
      reason: '2 outs - D3K legal (force play possible)',
    };
  }

  return {
    isLegal: false,
    reason: 'First base occupied with less than 2 outs - D3K NOT legal',
  };
}

// ============================================
// D3K EVENT CREATION
// ============================================

/**
 * Create a D3K event
 */
export function createD3KEvent(
  outcome: D3KOutcome,
  batterInfo: { id: string; name: string },
  catcherInfo: { id: string; name: string },
  pitcherInfo: { id: string; name: string },
  gameState: {
    inning: number;
    halfInning: 'TOP' | 'BOTTOM';
    outs: number;
    bases: { first: boolean; second: boolean; third: boolean };
  },
  strikeoutType: 'swinging' | 'looking',
  options?: {
    batterResult?: 'first' | 'second' | 'third' | 'out';
    throwSequence?: string[];
    errorInfo?: {
      fielderId: string;
      fielderName: string;
      errorType: 'THROWING' | 'FIELDING';
    };
  }
): D3KEvent {
  const isLegal = isD3KLegal(gameState.bases.first, gameState.outs);

  // Determine batter result based on outcome
  let batterResult: 'first' | 'second' | 'third' | 'out';
  switch (outcome) {
    case 'D3K_REACHED':
      batterResult = options?.batterResult || 'first';
      break;
    case 'D3K_THROWN_OUT':
    case 'D3K_ILLEGAL':
    case 'D3K_FORCE_OUT':
      batterResult = 'out';
      break;
    case 'D3K_ERROR':
      batterResult = options?.batterResult || 'first';
      break;
    case 'D3K_WILD_THROW':
      batterResult = options?.batterResult || 'second';
      break;
    default:
      batterResult = 'out';
  }

  return {
    eventType: 'D3K',
    outcome,
    isLegal,
    batterId: batterInfo.id,
    batterName: batterInfo.name,
    catcherId: catcherInfo.id,
    catcherName: catcherInfo.name,
    pitcherId: pitcherInfo.id,
    pitcherName: pitcherInfo.name,
    batterResult,
    strikeoutType,
    inning: gameState.inning,
    halfInning: gameState.halfInning,
    outs: gameState.outs,
    basesBefore: gameState.bases,
    throwSequence: options?.throwSequence,
    errorInfo: options?.errorInfo,
  };
}

// ============================================
// STATS AGGREGATION
// ============================================

/**
 * Aggregate batter D3K stats from events
 */
export function aggregateBatterD3KStats(events: D3KEvent[], batterId: string): D3KStats {
  const stats: D3KStats = {
    attempts: 0,
    reached: 0,
    thrownOut: 0,
    illegal: 0,
    errors: 0,
    wildThrows: 0,
  };

  for (const event of events) {
    if (event.batterId !== batterId) continue;

    stats.attempts++;

    switch (event.outcome) {
      case 'D3K_REACHED':
        stats.reached++;
        break;
      case 'D3K_THROWN_OUT':
      case 'D3K_FORCE_OUT':
        stats.thrownOut++;
        break;
      case 'D3K_ILLEGAL':
        stats.illegal++;
        break;
      case 'D3K_ERROR':
        stats.errors++;
        stats.reached++;
        break;
      case 'D3K_WILD_THROW':
        stats.wildThrows++;
        stats.reached++;
        break;
    }
  }

  return stats;
}

/**
 * Aggregate catcher D3K stats from events
 */
export function aggregateCatcherD3KStats(events: D3KEvent[], catcherId: string): CatcherD3KStats {
  const stats: CatcherD3KStats = {
    droppedThirdStrikes: 0,
    throwouts: 0,
    failedThrows: 0,
    errors: 0,
    throwoutRate: 0,
  };

  for (const event of events) {
    if (event.catcherId !== catcherId) continue;
    if (event.outcome === 'D3K_ILLEGAL') continue; // Not a real D3K attempt

    stats.droppedThirdStrikes++;

    switch (event.outcome) {
      case 'D3K_THROWN_OUT':
        stats.throwouts++;
        break;
      case 'D3K_REACHED':
      case 'D3K_WILD_THROW':
        stats.failedThrows++;
        break;
      case 'D3K_ERROR':
        if (event.errorInfo?.fielderId === catcherId) {
          stats.errors++;
        }
        stats.failedThrows++;
        break;
    }
  }

  // Calculate throwout rate
  const attempts = stats.droppedThirdStrikes;
  stats.throwoutRate = attempts > 0 ? stats.throwouts / attempts : 0;

  return stats;
}

// ============================================
// UI HELPERS
// ============================================

/**
 * Get display message for D3K outcome
 */
export function getD3KDisplayMessage(event: D3KEvent): string {
  const { outcome, batterName, batterResult, strikeoutType } = event;
  const kType = strikeoutType === 'looking' ? 'ꓘ' : 'K';

  switch (outcome) {
    case 'D3K_REACHED':
      return `${kType} - ${batterName} reaches on dropped third strike`;
    case 'D3K_THROWN_OUT':
      return `${kType} - ${batterName} thrown out at 1B on dropped third strike`;
    case 'D3K_ILLEGAL':
      return `${kType} - ${batterName} out (D3K not legal)`;
    case 'D3K_ERROR':
      return `${kType} - ${batterName} reaches on error (dropped third strike)`;
    case 'D3K_WILD_THROW':
      return `${kType} - ${batterName} reaches ${batterResult} on wild throw (dropped third strike)`;
    case 'D3K_FORCE_OUT':
      return `${kType} - ${batterName} reaches, runner forced out`;
    default:
      return `${kType} - Dropped third strike`;
  }
}

/**
 * Get icon for D3K outcome
 */
export function getD3KIcon(outcome: D3KOutcome): string {
  switch (outcome) {
    case 'D3K_REACHED':
      return '🏃';
    case 'D3K_THROWN_OUT':
      return '🎯';
    case 'D3K_ILLEGAL':
      return '🚫';
    case 'D3K_ERROR':
      return '❌';
    case 'D3K_WILD_THROW':
      return '💨';
    case 'D3K_FORCE_OUT':
      return '⚡';
    default:
      return '⚾';
  }
}

// ============================================
// INTEGRATION WITH PLAY CLASSIFIER
// ============================================

/**
 * Determine if a play should trigger D3K flow
 */
export function shouldTriggerD3KFlow(
  outType: string | undefined,
  isPitchResult: boolean
): boolean {
  // D3K only happens on strikeouts (K or KL)
  if (!isPitchResult) return false;
  if (outType !== 'K' && outType !== 'KL') return false;
  return true;
}

/**
 * Get D3K prompt options based on game state
 */
export function getD3KOptions(
  isLegal: boolean
): Array<{ value: D3KOutcome; label: string; icon: string }> {
  if (!isLegal) {
    return [
      { value: 'D3K_ILLEGAL', label: 'Batter Out (D3K not legal)', icon: '🚫' },
    ];
  }

  return [
    { value: 'D3K_REACHED', label: 'Batter Reaches 1B', icon: '🏃' },
    { value: 'D3K_THROWN_OUT', label: 'Thrown Out at 1B', icon: '🎯' },
    { value: 'D3K_ERROR', label: 'Error on Throw', icon: '❌' },
    { value: 'D3K_WILD_THROW', label: 'Wild Throw (Extra Base)', icon: '💨' },
  ];
}
