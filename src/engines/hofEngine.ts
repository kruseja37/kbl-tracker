/**
 * Hall of Fame Engine (GAP-B10-006)
 * Per KBL_XHD_TRACKER_MASTER_SPEC_v3.md §6
 *
 * HOF Score calculation and eligibility criteria.
 * USER NOTE: HOF score weighted by games/season variable from season setup.
 */

// ============================================
// TYPES
// ============================================

export interface HOFCandidate {
  playerId: string;
  playerName: string;
  careerWAR: number;
  mvpAwards: number;
  cyYoungAwards: number;
  allStarSelections: number;
  goldGloves: number;
  championships: number;
  seasonsPlayed: number;
  gamesPerSeason: number; // For weighting
}

export interface HOFResult {
  playerId: string;
  hofScore: number;
  eligible: boolean;
  eligibilityReason: string | null;
  isFirstBallot: boolean;
}

export interface HallOfFameRecord {
  playerId: string;
  playerName: string;
  inducted: boolean;
  inductionSeason: number;
  hofScore: number;
  isFirstBallot: boolean;
}

// ============================================
// CONSTANTS
// ============================================

/** HOF Score weights per spec §6 */
export const HOF_WEIGHTS = {
  WAR: 1.5,
  MVP: 15,
  CY_YOUNG: 15,
  ALL_STAR: 3,
  GOLD_GLOVE: 2,
  CHAMPIONSHIP: 5,
} as const;

/** Eligibility criteria — ANY one of these qualifies a player */
export const HOF_ELIGIBILITY = {
  MIN_CAREER_WAR: 50,
  MIN_MVP_AWARDS: 1,
  MIN_ALL_STAR_SELECTIONS: 5,
} as const;

/** First ballot threshold */
export const HOF_FIRST_BALLOT_SCORE = 90;

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Calculate HOF Score for a player.
 * Weighted by games/season to normalize across different season lengths.
 *
 * The season length weighting ensures that a 50-game season's stats
 * are properly scaled when compared to a 162-game reference.
 */
export function calculateHOFScore(candidate: HOFCandidate): number {
  // Scale factor: normalize WAR to 162-game equivalent
  const seasonScale = candidate.gamesPerSeason > 0
    ? 162 / candidate.gamesPerSeason
    : 1;

  // WAR is scaled by season length; awards are NOT (1 MVP = 1 MVP regardless)
  const scaledWAR = candidate.careerWAR * seasonScale;

  let score = 0;
  score += scaledWAR * HOF_WEIGHTS.WAR;
  score += candidate.mvpAwards * HOF_WEIGHTS.MVP;
  score += candidate.cyYoungAwards * HOF_WEIGHTS.CY_YOUNG;
  score += candidate.allStarSelections * HOF_WEIGHTS.ALL_STAR;
  score += candidate.goldGloves * HOF_WEIGHTS.GOLD_GLOVE;
  score += candidate.championships * HOF_WEIGHTS.CHAMPIONSHIP;

  return Math.round(score * 10) / 10;
}

/**
 * Check HOF eligibility and calculate score.
 */
export function evaluateHOFEligibility(candidate: HOFCandidate): HOFResult {
  const hofScore = calculateHOFScore(candidate);

  // Scale WAR threshold by season length
  const seasonScale = candidate.gamesPerSeason > 0
    ? 162 / candidate.gamesPerSeason
    : 1;
  const scaledWAR = candidate.careerWAR * seasonScale;

  let eligible = false;
  let eligibilityReason: string | null = null;

  if (scaledWAR >= HOF_ELIGIBILITY.MIN_CAREER_WAR) {
    eligible = true;
    eligibilityReason = `Career WAR ≥ ${HOF_ELIGIBILITY.MIN_CAREER_WAR} (${scaledWAR.toFixed(1)} scaled)`;
  } else if (candidate.mvpAwards >= HOF_ELIGIBILITY.MIN_MVP_AWARDS) {
    eligible = true;
    eligibilityReason = `${candidate.mvpAwards} MVP award(s)`;
  } else if (candidate.allStarSelections >= HOF_ELIGIBILITY.MIN_ALL_STAR_SELECTIONS) {
    eligible = true;
    eligibilityReason = `${candidate.allStarSelections} All-Star selections`;
  }

  return {
    playerId: candidate.playerId,
    hofScore,
    eligible,
    eligibilityReason,
    isFirstBallot: hofScore >= HOF_FIRST_BALLOT_SCORE,
  };
}

/**
 * Create a Hall of Fame induction record.
 */
export function createInductionRecord(
  candidate: HOFCandidate,
  inductionSeason: number,
): HallOfFameRecord {
  const result = evaluateHOFEligibility(candidate);
  return {
    playerId: candidate.playerId,
    playerName: candidate.playerName,
    inducted: true,
    inductionSeason,
    hofScore: result.hofScore,
    isFirstBallot: result.isFirstBallot,
  };
}
