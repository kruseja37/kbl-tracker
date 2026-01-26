/**
 * League Configuration and DH Rules System
 *
 * Handles:
 * - League definitions with DH rules
 * - Season-level DH overrides
 * - DH context for salary calculations
 *
 * Key Design Decisions:
 * - Custom named leagues (e.g., "American", "National", "Eastern", "Western")
 * - Each league has usesDesignatedHitter setting
 * - Season override can force universal DH or no DH
 * - Two-way players ALWAYS get full batting bonus (they play every day)
 * - Regular pitchers get reduced batting bonus because they only bat when starting
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * League definition with DH configuration
 */
export interface LeagueData {
  id: string;
  name: string;
  usesDesignatedHitter: boolean;
}

/**
 * Season-level DH override
 * - 'league_rules': Respect league/team DH settings (default)
 * - 'universal': Force DH for all teams (pitchers never bat)
 * - 'none': Force no DH for all teams (pitchers always bat when starting)
 */
export type DHOverride = 'league_rules' | 'universal' | 'none';

/**
 * Season DH configuration
 */
export interface SeasonDHConfig {
  dhOverride: DHOverride;
}

/**
 * Context passed to salary calculator for DH-aware calculations
 */
export interface DHContext {
  /**
   * Effective DH percentage (0.0 to 1.0)
   * - 0.0 = No DH (pitchers bat when they start)
   * - 1.0 = Universal DH (pitchers never bat)
   * - 0.5 = Split league (50% of games have DH)
   */
  effectiveDHPercentage: number;

  /**
   * Whether the player is a two-way player
   * Two-way players ALWAYS get full batting bonus regardless of DH rules
   * because they play in the field on days they don't pitch
   */
  isTwoWay: boolean;
}

// ============================================================================
// Storage Keys and Defaults
// ============================================================================

const LEAGUES_KEY = 'kbl-leagues';
const SEASON_DH_CONFIG_KEY = 'kbl-season-dh-config';

/**
 * Default leagues - matches SMB4's default behavior (no DH)
 */
const DEFAULT_LEAGUES: LeagueData[] = [
  {
    id: 'national',
    name: 'National League',
    usesDesignatedHitter: false  // Classic NL - pitchers bat
  },
  {
    id: 'american',
    name: 'American League',
    usesDesignatedHitter: true   // Classic AL - uses DH
  }
];

/**
 * Default season config - respect league rules
 */
const DEFAULT_SEASON_DH_CONFIG: SeasonDHConfig = {
  dhOverride: 'league_rules'
};

/**
 * Pitcher rotation factor - even in no-DH leagues, pitchers only bat
 * in games they start (roughly 1/4 of games for a 4-man rotation).
 *
 * This factor reduces the batting bonus for non-two-way pitchers to reflect
 * that they get far fewer plate appearances than position players.
 *
 * Two-way players don't have this reduction because they play every day
 * (either pitching or in the field).
 */
export const PITCHER_ROTATION_FACTOR = 0.25;

// ============================================================================
// League CRUD Operations
// ============================================================================

/**
 * Get all leagues from storage
 */
export function getLeagues(): LeagueData[] {
  try {
    const stored = localStorage.getItem(LEAGUES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading leagues:', error);
  }
  return [...DEFAULT_LEAGUES];
}

/**
 * Save or update a league
 */
export function saveLeague(league: LeagueData): void {
  const leagues = getLeagues();
  const existingIndex = leagues.findIndex(l => l.id === league.id);

  if (existingIndex >= 0) {
    leagues[existingIndex] = league;
  } else {
    leagues.push(league);
  }

  localStorage.setItem(LEAGUES_KEY, JSON.stringify(leagues));
}

/**
 * Delete a league by ID
 */
export function deleteLeague(leagueId: string): void {
  const leagues = getLeagues().filter(l => l.id !== leagueId);
  localStorage.setItem(LEAGUES_KEY, JSON.stringify(leagues));
}

/**
 * Get a specific league by ID
 */
export function getLeagueById(leagueId: string): LeagueData | undefined {
  return getLeagues().find(l => l.id === leagueId);
}

/**
 * Initialize default leagues if none exist
 */
export function initializeDefaultLeagues(): void {
  const stored = localStorage.getItem(LEAGUES_KEY);
  if (!stored) {
    localStorage.setItem(LEAGUES_KEY, JSON.stringify(DEFAULT_LEAGUES));
  }
}

// ============================================================================
// Season DH Config Operations
// ============================================================================

/**
 * Get current season DH configuration
 */
export function getSeasonDHConfig(): SeasonDHConfig {
  try {
    const stored = localStorage.getItem(SEASON_DH_CONFIG_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading season DH config:', error);
  }
  return { ...DEFAULT_SEASON_DH_CONFIG };
}

/**
 * Set season DH configuration
 */
export function setSeasonDHConfig(config: SeasonDHConfig): void {
  localStorage.setItem(SEASON_DH_CONFIG_KEY, JSON.stringify(config));
}

// ============================================================================
// DH Percentage Calculation
// ============================================================================

interface TeamWithLeague {
  leagueId?: string;
}

/**
 * Calculate the effective DH percentage based on league composition and season override
 *
 * @param teams - All teams in the league
 * @param leagues - All league definitions
 * @param seasonConfig - Season DH override configuration
 * @returns DH percentage from 0.0 (no DH) to 1.0 (universal DH)
 */
export function calculateEffectiveDHPercentage(
  teams: TeamWithLeague[],
  leagues: LeagueData[],
  seasonConfig: SeasonDHConfig
): number {
  // Season override takes precedence
  switch (seasonConfig.dhOverride) {
    case 'universal':
      return 1.0;  // 100% DH - pitchers never bat
    case 'none':
      return 0.0;  // 0% DH - pitchers always bat when starting
    case 'league_rules':
    default:
      // Fall through to calculate from league rules
      break;
  }

  // Calculate percentage based on teams in DH leagues
  if (teams.length === 0 || leagues.length === 0) {
    return 0.0;  // Default to no DH if no data
  }

  let teamsWithDH = 0;
  let teamsWithoutDH = 0;

  for (const team of teams) {
    const league = leagues.find(l => l.id === team.leagueId);
    if (league?.usesDesignatedHitter) {
      teamsWithDH++;
    } else {
      teamsWithoutDH++;
    }
  }

  const totalTeams = teamsWithDH + teamsWithoutDH;
  if (totalTeams === 0) {
    return 0.0;
  }

  /**
   * Calculate effective DH percentage for a player's season:
   *
   * In a split-DH league (like old MLB interleague):
   * - Home games: Use your league's DH rule
   * - Away games: Use opponent's league's DH rule
   *
   * Simplified model:
   * - Assume ~50% home games, ~50% away games
   * - Away games are distributed proportionally across all opponents
   * - So effective DH% = % of league games where DH is used
   *
   * Example: 10 teams total, 6 in DH league, 4 in no-DH league
   * - A no-DH team plays: 50% home (no DH) + 50% away (60% vs DH teams)
   * - Effective DH for that team: 0% + 30% = 30%
   *
   * For simplicity, we use league-wide DH percentage as proxy.
   */
  return teamsWithDH / totalTeams;
}

// ============================================================================
// DHContext Builder for Salary Calculation
// ============================================================================

interface PlayerForDHContext {
  isTwoWay?: boolean;
}

/**
 * Build DHContext for salary calculation
 *
 * @param player - Player data (needs isTwoWay flag)
 * @param teams - All teams in the league
 * @param leagues - All league definitions
 * @param seasonConfig - Season DH configuration
 * @returns DHContext for salary calculator
 */
export function buildDHContext(
  player: PlayerForDHContext,
  teams: TeamWithLeague[],
  leagues: LeagueData[],
  seasonConfig: SeasonDHConfig
): DHContext {
  return {
    effectiveDHPercentage: calculateEffectiveDHPercentage(teams, leagues, seasonConfig),
    isTwoWay: player.isTwoWay ?? false
  };
}

/**
 * Calculate the batting bonus multiplier for a non-two-way pitcher
 *
 * This accounts for:
 * 1. DH percentage - how often the pitcher's team uses a DH
 * 2. Rotation factor - even without DH, pitchers only bat when they start
 *
 * @param dhPercentage - Effective DH percentage (0.0 to 1.0)
 * @returns Multiplier to apply to batting bonus (0.0 to 0.25)
 */
export function calculatePitcherBattingMultiplier(dhPercentage: number): number {
  // Games where pitcher bats = (1 - dhPercentage)
  // But even then, they only bat when starting (PITCHER_ROTATION_FACTOR)
  const gamesWithoutDH = 1 - dhPercentage;
  return gamesWithoutDH * PITCHER_ROTATION_FACTOR;
}

/**
 * Get description of DH rules for display
 */
export function getDHDescription(seasonConfig: SeasonDHConfig): string {
  switch (seasonConfig.dhOverride) {
    case 'universal':
      return 'Universal DH (pitchers never bat)';
    case 'none':
      return 'No DH (pitchers bat when starting)';
    case 'league_rules':
    default:
      return 'League rules apply';
  }
}
