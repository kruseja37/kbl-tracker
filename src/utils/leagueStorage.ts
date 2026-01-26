/**
 * League Configuration Storage
 *
 * Persists league configurations to localStorage.
 * A league is a user-defined group of teams for a season.
 */

const STORAGE_KEY = 'kbl-leagues';

export interface LeagueConfig {
  id: string;
  name: string;
  teamIds: string[];
  createdAt: number;
  settings: LeagueSettings;
}

export interface LeagueSettings {
  gamesPerSeason: number;
  useDH: boolean;
  playoffTeams: number;
}

const DEFAULT_SETTINGS: LeagueSettings = {
  gamesPerSeason: 50,
  useDH: true,
  playoffTeams: 4,
};

/**
 * Get all saved leagues
 */
export function getAllLeagues(): LeagueConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as LeagueConfig[];
  } catch (err) {
    console.warn('[leagueStorage] Failed to load leagues:', err);
    return [];
  }
}

/**
 * Get a specific league by ID
 */
export function getLeague(leagueId: string): LeagueConfig | null {
  const leagues = getAllLeagues();
  return leagues.find(l => l.id === leagueId) ?? null;
}

/**
 * Save a new league
 */
export function saveLeague(league: LeagueConfig): void {
  try {
    const leagues = getAllLeagues();
    const existingIndex = leagues.findIndex(l => l.id === league.id);

    if (existingIndex >= 0) {
      leagues[existingIndex] = league;
    } else {
      leagues.push(league);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(leagues));
  } catch (err) {
    console.warn('[leagueStorage] Failed to save league:', err);
  }
}

/**
 * Delete a league
 */
export function deleteLeague(leagueId: string): void {
  try {
    const leagues = getAllLeagues().filter(l => l.id !== leagueId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leagues));
  } catch (err) {
    console.warn('[leagueStorage] Failed to delete league:', err);
  }
}

/**
 * Create a new league config object
 */
export function createLeagueConfig(
  name: string,
  teamIds: string[],
  settings: Partial<LeagueSettings> = {}
): LeagueConfig {
  return {
    id: `league_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    teamIds,
    createdAt: Date.now(),
    settings: { ...DEFAULT_SETTINGS, ...settings },
  };
}

/**
 * Validate league configuration
 */
export function validateLeague(teamIds: string[]): { valid: boolean; error?: string } {
  if (teamIds.length < 2) {
    return { valid: false, error: 'Minimum 2 teams required' };
  }
  return { valid: true };
}
