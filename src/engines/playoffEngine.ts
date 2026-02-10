/**
 * Playoff Engine
 *
 * Implements playoff-related logic for KBL Tracker:
 * - GAP-B12-015: Team qualification and seeding
 * - GAP-B12-016: Home field advantage patterns
 * - GAP-B12-018: Clinch/elimination detection and clutch multipliers
 *
 * Self-contained module with its own input types that align with
 * playoffStorage types where appropriate.
 */

// ============================================
// TYPES
// ============================================

/** Standing entry for a team at end of regular season */
export interface TeamStanding {
  teamId: string;
  wins: number;
  losses: number;
  divisionId: string;
  conferenceId: string;
  /** Head-to-head record: map of opponentTeamId -> { wins, losses } */
  h2hRecord: Record<string, { wins: number; losses: number }>;
  /** Run differential (runs scored - runs allowed) */
  runDiff: number;
}

/** Configuration for playoff qualification */
export interface QualificationConfig {
  /** Number of division winners that auto-qualify per conference */
  divisionWinners: number;
  /** Number of wildcard spots per conference */
  wildcards: number;
}

/** A qualified team with seed assignment */
export interface QualifiedTeam {
  teamId: string;
  seed: number;
  qualificationType: 'DIVISION_WINNER' | 'WILDCARD';
  conferenceId: string;
  divisionId: string;
  wins: number;
  losses: number;
  runDiff: number;
}

/** Result of series status analysis */
export interface SeriesStatusResult {
  /** Team has won enough games to win the series */
  isClinched: boolean;
  /** Team has lost enough games to be eliminated */
  isEliminated: boolean;
  /** One more win would clinch the series */
  isClinchGame: boolean;
  /** One more loss would eliminate from the series */
  isEliminationGame: boolean;
  /** Games remaining in the series (max possible) */
  gamesRemaining: number;
}

/** Context for calculating playoff clutch multiplier */
export interface PlayoffClutchContext {
  /** Is this a clinch game for either team? */
  isClinchGame: boolean;
  /** Is this an elimination game for either team? */
  isEliminationGame: boolean;
  /** Is this the championship series (World Series)? */
  isChampionshipSeries: boolean;
}

// ============================================
// HOME FIELD PATTERNS
// ============================================

/**
 * Standard home field patterns by series length.
 *
 * Each array maps game number (0-indexed) to whether the higher seed
 * is home (true) or away (false).
 *
 * - 7-game: 2-3-2 pattern (Games 1-2 home, 3-5 away, 6-7 home)
 * - 5-game: 2-2-1 pattern (Games 1-2 home, 3-4 away, 5 home)
 * - 3-game: 2-1 pattern (Games 1-2 home, 3 away)
 */
const HOME_FIELD_PATTERNS: Record<number, boolean[]> = {
  7: [true, true, false, false, false, true, true],
  5: [true, true, false, false, true],
  3: [true, true, false],
};

// ============================================
// GAP-B12-015: PLAYOFF QUALIFICATION
// ============================================

/**
 * Determine head-to-head tiebreaker between two teams.
 *
 * @returns negative if teamA wins tiebreaker, positive if teamB wins, 0 if tied
 */
function compareH2H(teamA: TeamStanding, teamB: TeamStanding): number {
  const recordVsB = teamA.h2hRecord[teamB.teamId];
  if (!recordVsB) return 0; // No head-to-head data, treat as tied

  const aWinsVsB = recordVsB.wins;
  const bWinsVsA = recordVsB.losses;

  // Higher wins vs opponent = better (negative = teamA is better)
  return bWinsVsA - aWinsVsB;
}

/**
 * Compare two teams for tiebreaking in the following order:
 * 1. Head-to-head record
 * 2. Division record (same division only -- approximated via divisionId match)
 * 3. Run differential
 *
 * @returns negative if teamA ranks higher, positive if teamB ranks higher
 */
function tiebreakerCompare(teamA: TeamStanding, teamB: TeamStanding): number {
  // Tiebreaker 1: Head-to-head record
  const h2h = compareH2H(teamA, teamB);
  if (h2h !== 0) return h2h;

  // Tiebreaker 2: Division record
  // We don't have division-specific records in the input, so if teams are in
  // the same division we skip (H2H already covered direct matchup).
  // For cross-division tiebreakers, we fall through to run differential.

  // Tiebreaker 3: Run differential (higher is better)
  const runDiffDelta = teamB.runDiff - teamA.runDiff;
  if (runDiffDelta !== 0) return runDiffDelta;

  return 0;
}

/**
 * Sort standings by win percentage then tiebreakers.
 * Lower index = better team.
 */
function sortStandings(standings: TeamStanding[]): TeamStanding[] {
  return [...standings].sort((a, b) => {
    const aGames = a.wins + a.losses;
    const bGames = b.wins + b.losses;
    const aWinPct = aGames > 0 ? a.wins / aGames : 0;
    const bWinPct = bGames > 0 ? b.wins / bGames : 0;

    // Primary: Win percentage (descending)
    const winPctDelta = bWinPct - aWinPct;
    if (Math.abs(winPctDelta) > 0.0001) return winPctDelta;

    // Tiebreakers
    return tiebreakerCompare(a, b);
  });
}

/**
 * Qualify teams for the playoffs based on regular season standings.
 *
 * Division winners auto-qualify (best record per division within each conference).
 * Remaining wildcard spots go to the best remaining records within each conference.
 * Tiebreakers: H2H record -> run differential.
 *
 * Seeds are assigned per conference:
 * - Division winners get top seeds (sorted by record)
 * - Wildcards get remaining seeds (sorted by record)
 *
 * @param standings - All team standings
 * @param config - Qualification configuration
 * @returns Qualified teams sorted by conference then seed
 *
 * @example
 * ```ts
 * const qualified = qualifyTeams(standings, { divisionWinners: 3, wildcards: 1 });
 * // Returns 4 teams per conference, seeds 1-4
 * ```
 */
export function qualifyTeams(
  standings: TeamStanding[],
  config: QualificationConfig
): QualifiedTeam[] {
  // Group by conference
  const conferences = new Map<string, TeamStanding[]>();
  for (const team of standings) {
    const conf = conferences.get(team.conferenceId) || [];
    conf.push(team);
    conferences.set(team.conferenceId, conf);
  }

  const allQualified: QualifiedTeam[] = [];

  for (const [conferenceId, confTeams] of conferences) {
    // Group by division within conference
    const divisions = new Map<string, TeamStanding[]>();
    for (const team of confTeams) {
      const div = divisions.get(team.divisionId) || [];
      div.push(team);
      divisions.set(team.divisionId, div);
    }

    // Find division winners (best record per division)
    const divisionWinners: TeamStanding[] = [];
    const nonWinners: TeamStanding[] = [];

    for (const [, divTeams] of divisions) {
      const sorted = sortStandings(divTeams);
      if (sorted.length > 0) {
        divisionWinners.push(sorted[0]);
        nonWinners.push(...sorted.slice(1));
      }
    }

    // Sort division winners by record (best first)
    const sortedDivWinners = sortStandings(divisionWinners);

    // Limit to configured number of division winner slots
    const qualifyingDivWinners = sortedDivWinners.slice(0, config.divisionWinners);
    const remainingFromDivWinners = sortedDivWinners.slice(config.divisionWinners);

    // Pool of remaining teams for wildcard consideration
    const wildcardPool = sortStandings([...nonWinners, ...remainingFromDivWinners]);
    const wildcardTeams = wildcardPool.slice(0, config.wildcards);

    // Assign seeds: division winners first, then wildcards
    let seed = 1;

    for (const team of qualifyingDivWinners) {
      allQualified.push({
        teamId: team.teamId,
        seed,
        qualificationType: 'DIVISION_WINNER',
        conferenceId,
        divisionId: team.divisionId,
        wins: team.wins,
        losses: team.losses,
        runDiff: team.runDiff,
      });
      seed++;
    }

    for (const team of wildcardTeams) {
      allQualified.push({
        teamId: team.teamId,
        seed,
        qualificationType: 'WILDCARD',
        conferenceId,
        divisionId: team.divisionId,
        wins: team.wins,
        losses: team.losses,
        runDiff: team.runDiff,
      });
      seed++;
    }
  }

  // Sort final output by conference, then seed
  return allQualified.sort((a, b) => {
    if (a.conferenceId !== b.conferenceId) {
      return a.conferenceId.localeCompare(b.conferenceId);
    }
    return a.seed - b.seed;
  });
}

// ============================================
// GAP-B12-016: HOME FIELD ADVANTAGE
// ============================================

/**
 * Determine which team has home field for a specific game in a series.
 *
 * Uses standard baseball home field patterns:
 * - 7-game series: 2-3-2 (Games 1-2 at higher seed, 3-5 away, 6-7 at higher seed)
 * - 5-game series: 2-2-1 (Games 1-2 at higher seed, 3-4 away, 5 at higher seed)
 * - 3-game series: 2-1 (Games 1-2 at higher seed, 3 away)
 *
 * The higher seed (team with better regular season record / higher playoff seed)
 * always gets home field advantage in the pattern.
 *
 * @param gameNumber - 1-indexed game number in the series (1 through seriesLength)
 * @param seriesLength - Total games in the series (3, 5, or 7)
 * @param higherSeedTeamId - Team ID of the higher-seeded team
 * @param lowerSeedTeamId - Team ID of the lower-seeded team
 * @returns The team ID of the home team for the given game
 *
 * @example
 * ```ts
 * // Game 3 of a 7-game series: away game for higher seed
 * const home = getHomeFieldPattern(3, 7, 'hawks', 'storm');
 * // Returns 'storm' (lower seed is home for games 3-5)
 * ```
 */
export function getHomeFieldPattern(
  gameNumber: number,
  seriesLength: number,
  higherSeedTeamId: string,
  lowerSeedTeamId: string
): string {
  const pattern = HOME_FIELD_PATTERNS[seriesLength];

  if (!pattern) {
    // Fallback: if series length is not in standard patterns,
    // alternate starting with higher seed
    const isHigherSeedHome = gameNumber % 2 === 1;
    return isHigherSeedHome ? higherSeedTeamId : lowerSeedTeamId;
  }

  // Convert 1-indexed game number to 0-indexed array position
  const index = gameNumber - 1;

  if (index < 0 || index >= pattern.length) {
    // Out of bounds: default to higher seed home
    return higherSeedTeamId;
  }

  return pattern[index] ? higherSeedTeamId : lowerSeedTeamId;
}

/**
 * Get the complete home field schedule for an entire series.
 *
 * @param seriesLength - Total games in the series (3, 5, or 7)
 * @param higherSeedTeamId - Team ID of the higher-seeded team
 * @param lowerSeedTeamId - Team ID of the lower-seeded team
 * @returns Array of home team IDs for each game (index 0 = Game 1)
 */
export function getFullSeriesHomeSchedule(
  seriesLength: number,
  higherSeedTeamId: string,
  lowerSeedTeamId: string
): string[] {
  const schedule: string[] = [];
  for (let game = 1; game <= seriesLength; game++) {
    schedule.push(getHomeFieldPattern(game, seriesLength, higherSeedTeamId, lowerSeedTeamId));
  }
  return schedule;
}

// ============================================
// GAP-B12-018: CLINCH / ELIMINATION DETECTION
// ============================================

/**
 * Calculate the number of wins needed to win a series.
 *
 * @param seriesLength - Best-of series length (3, 5, or 7)
 * @returns Number of wins required (2, 3, or 4)
 */
export function winsToClinch(seriesLength: number): number {
  return Math.ceil(seriesLength / 2);
}

/**
 * Detect clinch and elimination status for a team in a playoff series.
 *
 * - Clinched: team has won >= ceil(seriesLength / 2) games
 * - Eliminated: team has lost >= ceil(seriesLength / 2) games
 * - Clinch game: one more win would clinch (wins === winsNeeded - 1)
 * - Elimination game: one more loss would eliminate (losses === winsNeeded - 1)
 *
 * @param wins - Number of games won by this team in the series
 * @param losses - Number of games lost by this team in the series
 * @param seriesLength - Best-of series length (3, 5, or 7)
 * @returns Clinch/elimination status
 *
 * @example
 * ```ts
 * // Team is up 3-2 in a best-of-7
 * const status = detectClinch(3, 2, 7);
 * // { isClinched: false, isEliminated: false, isClinchGame: true, isEliminationGame: false, gamesRemaining: 2 }
 * ```
 */
export function detectClinch(
  wins: number,
  losses: number,
  seriesLength: number
): SeriesStatusResult {
  const needed = winsToClinch(seriesLength);
  const gamesPlayed = wins + losses;
  const gamesRemaining = seriesLength - gamesPlayed;

  return {
    isClinched: wins >= needed,
    isEliminated: losses >= needed,
    isClinchGame: wins === needed - 1 && losses < needed,
    isEliminationGame: losses === needed - 1 && wins < needed,
    gamesRemaining: Math.max(0, gamesRemaining),
  };
}

/**
 * Detect elimination status for a team in a playoff series.
 * Convenience wrapper around detectClinch focusing on elimination.
 *
 * @param wins - Number of games won by this team in the series
 * @param losses - Number of games lost by this team in the series
 * @param seriesLength - Best-of series length (3, 5, or 7)
 * @returns Clinch/elimination status (same as detectClinch)
 */
export function detectElimination(
  wins: number,
  losses: number,
  seriesLength: number
): SeriesStatusResult {
  return detectClinch(wins, losses, seriesLength);
}

// ============================================
// GAP-B12-018: PLAYOFF CLUTCH MULTIPLIER
// ============================================

/**
 * Clutch multiplier constants for playoff scenarios.
 *
 * These stack multiplicatively when multiple conditions apply.
 */
const CLUTCH_MULTIPLIERS = {
  /** Clinch game: one more win to advance */
  CLINCH_GAME: 1.5,
  /** Elimination game: lose and you're out */
  ELIMINATION_GAME: 2.0,
  /** Championship series (World Series): the biggest stage */
  CHAMPIONSHIP_SERIES: 1.25,
} as const;

/**
 * Calculate the playoff clutch multiplier for the current game context.
 *
 * Multipliers stack multiplicatively:
 * - Clinch game: 1.5x
 * - Elimination game: 2.0x
 * - Championship series: 1.25x
 *
 * A Game 7 of the World Series where both teams face clinch/elimination:
 * The multiplier applies per-team context, but for the game itself we use
 * the highest applicable combination.
 *
 * @param context - Current game's playoff context
 * @returns Combined clutch multiplier (minimum 1.0)
 *
 * @example
 * ```ts
 * // Elimination game in the World Series
 * const mult = calculatePlayoffClutchMultiplier({
 *   isClinchGame: false,
 *   isEliminationGame: true,
 *   isChampionshipSeries: true,
 * });
 * // Returns 2.5 (2.0 * 1.25)
 *
 * // Game 7 of the World Series (both clinch and elimination)
 * const mult7 = calculatePlayoffClutchMultiplier({
 *   isClinchGame: true,
 *   isEliminationGame: true,
 *   isChampionshipSeries: true,
 * });
 * // Returns 3.75 (1.5 * 2.0 * 1.25)
 * ```
 */
export function calculatePlayoffClutchMultiplier(
  context: PlayoffClutchContext
): number {
  let multiplier = 1.0;

  if (context.isClinchGame) {
    multiplier *= CLUTCH_MULTIPLIERS.CLINCH_GAME;
  }

  if (context.isEliminationGame) {
    multiplier *= CLUTCH_MULTIPLIERS.ELIMINATION_GAME;
  }

  if (context.isChampionshipSeries) {
    multiplier *= CLUTCH_MULTIPLIERS.CHAMPIONSHIP_SERIES;
  }

  return multiplier;
}

/**
 * Build playoff clutch context from series state.
 *
 * Convenience function that combines detectClinch results for both teams
 * with series metadata to produce a PlayoffClutchContext.
 *
 * @param higherSeedWins - Wins by the higher-seeded team
 * @param lowerSeedWins - Wins by the lower-seeded team
 * @param seriesLength - Best-of series length
 * @param isChampionshipSeries - Whether this is the final championship round
 * @returns Context object for use with calculatePlayoffClutchMultiplier
 */
export function buildClutchContext(
  higherSeedWins: number,
  lowerSeedWins: number,
  seriesLength: number,
  isChampionshipSeries: boolean
): PlayoffClutchContext {
  const higherStatus = detectClinch(higherSeedWins, lowerSeedWins, seriesLength);
  const lowerStatus = detectClinch(lowerSeedWins, higherSeedWins, seriesLength);

  return {
    // Either team facing a clinch opportunity counts
    isClinchGame: higherStatus.isClinchGame || lowerStatus.isClinchGame,
    // Either team facing elimination counts
    isEliminationGame: higherStatus.isEliminationGame || lowerStatus.isEliminationGame,
    isChampionshipSeries,
  };
}
