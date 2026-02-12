/**
 * Offseason Data Hook
 *
 * Provides real player, team, and roster data for Offseason flow components,
 * bridging the playerDatabase and IndexedDB hooks to Figma UI components.
 * Falls back to mock data when real data is not available.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getAllTeams,
  getAllPlayers,
  type PlayerData,
  type TeamData,
} from '../../data/playerDatabase';
import { useAgingData, type PlayerAgingInfo } from '../../hooks/useAgingData';
import {
  calculateSalary,
  type PlayerForSalary,
  type PlayerPosition as SalaryPosition,
} from '../../engines/salaryCalculator';

// ============================================
// TYPES (aligned with Figma component interfaces)
// ============================================

export type Position = 'SP' | 'RP' | 'CP' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF';
export type Grade = 'S' | 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D';
export type Personality = 'COMPETITIVE' | 'RELAXED' | 'DROOPY' | 'JOLLY' | 'TOUGH' | 'TIMID' | 'EGOTISTICAL';

// Player format for Offseason components
export interface OffseasonPlayer {
  id: string;
  name: string;
  position: Position;
  grade: Grade;
  personality: Personality;
  salary: number; // In millions
  teamId: string;
  age: number;
  seasons: number;
  war: number;
  jerseyNumber: number;
  awards: string[];
  careerStats: string;
  // Ratings for UI display
  power?: number;
  contact?: number;
  speed?: number;
  fielding?: number;
  arm?: number;
  velocity?: number;
  junk?: number;
  accuracy?: number;
}

// Team format for Offseason components
export interface OffseasonTeam {
  id: string;
  name: string;
  shortName: string;
  stadium: string;
  record: { wins: number; losses: number };
  primaryColor: string;
  secondaryColor: string;
}

export interface UseOffseasonDataReturn {
  // Loading state
  isLoading: boolean;
  error: string | null;

  // Team data
  teams: OffseasonTeam[];
  getTeamById: (teamId: string) => OffseasonTeam | undefined;

  // Player data
  players: OffseasonPlayer[];
  getPlayerById: (playerId: string) => OffseasonPlayer | undefined;
  getTeamRoster: (teamId: string) => OffseasonPlayer[];

  // Retirement data
  retirementCandidates: PlayerAgingInfo[];
  getRetirementProbability: (playerId: string) => number;

  // Draft/FA data
  freeAgents: OffseasonPlayer[];

  // Flags
  hasRealData: boolean;

  // Actions
  refresh: () => Promise<void>;
}

// ============================================
// HELPERS
// ============================================

/**
 * Convert playerDatabase overall grade to Figma Grade type
 */
function normalizeGrade(overall: string): Grade {
  const validGrades: Grade[] = ['S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D'];
  if (validGrades.includes(overall as Grade)) {
    return overall as Grade;
  }
  return 'C'; // Default fallback
}

/**
 * Infer personality from player traits (heuristic)
 * Real implementation could use a personality field in playerDatabase
 */
function inferPersonality(player: PlayerData): Personality {
  const trait1 = player.traits.trait1?.toLowerCase() || '';
  const trait2 = player.traits.trait2?.toLowerCase() || '';
  const traits = `${trait1} ${trait2}`;

  if (traits.includes('tough') || traits.includes('fighter')) return 'TOUGH';
  if (traits.includes('relaxed') || traits.includes('chill')) return 'RELAXED';
  if (traits.includes('competitive') || traits.includes('clutch')) return 'COMPETITIVE';
  if (traits.includes('jolly') || traits.includes('fun')) return 'JOLLY';
  if (traits.includes('timid') || traits.includes('cautious')) return 'TIMID';
  if (traits.includes('ego') || traits.includes('star')) return 'EGOTISTICAL';
  if (player.age >= 38) return 'DROOPY'; // Older players might retire

  // Default based on chemistry
  const chemistryMap: Record<string, Personality> = {
    'SPIRITED': 'JOLLY',
    'CRAFTY': 'RELAXED',
    'DISCIPLINED': 'COMPETITIVE',
    'FIERY': 'TOUGH',
    'GRITTY': 'TOUGH',
    'SCHOLARLY': 'TIMID',
    'COMPETITIVE': 'COMPETITIVE',
  };

  return chemistryMap[player.chemistry] || 'RELAXED';
}

/**
 * Map playerDatabase position to Offseason Position type
 */
function normalizePosition(pos: string): Position {
  const posMap: Record<string, Position> = {
    'P': 'SP',
    'DH': '1B', // DH maps to 1B for simplicity
  };
  return (posMap[pos] || pos) as Position;
}

/**
 * Map position to salary calculator format
 */
function mapPositionToSalaryPosition(pos: string, isPitcher: boolean): SalaryPosition | undefined {
  if (isPitcher) {
    const pitcherMap: Record<string, SalaryPosition> = {
      'SP': 'SP', 'RP': 'RP', 'CP': 'CP', 'SP/RP': 'SP/RP', 'P': 'SP',
    };
    return pitcherMap[pos];
  }
  const positionMap: Record<string, SalaryPosition> = {
    'C': 'C', '1B': '1B', '2B': '2B', '3B': '3B', 'SS': 'SS',
    'LF': 'LF', 'CF': 'CF', 'RF': 'RF', 'DH': 'DH',
  };
  return positionMap[pos];
}

/**
 * Calculate salary from player data
 */
function calculatePlayerSalary(player: PlayerData): number {
  // Build ratings in the format the salary calculator expects
  const ratings = player.isPitcher
    ? { velocity: player.pitcherRatings?.velocity || 50, junk: player.pitcherRatings?.junk || 50, accuracy: player.pitcherRatings?.accuracy || 50 }
    : { power: player.batterRatings?.power || 50, contact: player.batterRatings?.contact || 50, speed: player.batterRatings?.speed || 50, fielding: player.batterRatings?.fielding || 50, arm: player.batterRatings?.arm || 50 };

  const salaryPlayer: PlayerForSalary = {
    id: player.id,
    name: player.name,
    isPitcher: player.isPitcher,
    primaryPosition: mapPositionToSalaryPosition(player.primaryPosition, player.isPitcher),
    ratings,
    battingRatings: player.batterRatings ? {
      power: player.batterRatings.power,
      contact: player.batterRatings.contact,
      speed: player.batterRatings.speed,
      fielding: player.batterRatings.fielding,
      arm: player.batterRatings.arm,
    } : undefined,
    age: player.age,
    fame: 0, // Could be loaded from career stats
    traits: [player.traits.trait1, player.traits.trait2].filter(Boolean) as string[],
  };

  try {
    const result = calculateSalary(salaryPlayer);
    // calculateSalary returns a number directly (in dollars)
    return Math.round(result / 100000) / 10; // Convert to millions
  } catch {
    // Fallback calculation
    const avgRating = player.isPitcher
      ? (player.pitcherRatings ? (player.pitcherRatings.velocity + player.pitcherRatings.junk + player.pitcherRatings.accuracy) / 3 : 50)
      : (player.batterRatings ? (player.batterRatings.power + player.batterRatings.contact + player.batterRatings.speed + player.batterRatings.fielding + player.batterRatings.arm) / 5 : 50);
    return Math.round(avgRating * 0.1 * 10) / 10; // Simple heuristic
  }
}

/**
 * Convert PlayerData to OffseasonPlayer format
 */
function convertToOffseasonPlayer(player: PlayerData): OffseasonPlayer {
  const salary = calculatePlayerSalary(player);
  const position = player.isPitcher
    ? (player.pitcherRole === 'CP' ? 'CP' : player.pitcherRole === 'RP' ? 'RP' : 'SP')
    : normalizePosition(player.primaryPosition);

  return {
    id: player.id,
    name: player.name,
    position,
    grade: normalizeGrade(player.overall),
    personality: inferPersonality(player),
    salary,
    teamId: player.teamId,
    age: player.age,
    seasons: Math.max(1, Math.floor((player.age - 20) * 0.7)), // Estimate
    war: salary * 0.5, // WAR estimate from salary
    jerseyNumber: parseInt(player.id.slice(-2), 36) % 99 + 1, // Generate from ID
    awards: [],
    careerStats: player.isPitcher
      ? `${Math.round(salary * 10)} Wins | ${(4.0 - salary * 0.1).toFixed(2)} ERA`
      : `.${Math.round(280 + salary * 2)} AVG | ${Math.round(salary * 3)} HR`,
    // Include ratings for display
    power: player.batterRatings?.power,
    contact: player.batterRatings?.contact,
    speed: player.batterRatings?.speed,
    fielding: player.batterRatings?.fielding,
    arm: player.batterRatings?.arm,
    velocity: player.pitcherRatings?.velocity,
    junk: player.pitcherRatings?.junk,
    accuracy: player.pitcherRatings?.accuracy,
  };
}

/**
 * Convert TeamData to OffseasonTeam format
 */
function convertToOffseasonTeam(team: TeamData): OffseasonTeam {
  // Create shortName from team name
  const shortName = team.name.toUpperCase().slice(0, 8);

  return {
    id: team.id,
    name: team.name,
    shortName,
    stadium: team.homePark,
    record: { wins: 0, losses: 0 }, // Would come from season data
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
  };
}

// ============================================
// HOOK
// ============================================

export function useOffseasonData(): UseOffseasonDataReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<OffseasonTeam[]>([]);
  const [players, setPlayers] = useState<OffseasonPlayer[]>([]);
  const [hasRealData, setHasRealData] = useState(false);

  // Use aging data for retirement calculations
  const { getPlayerAgingInfo, getRetirementCandidates } = useAgingData();

  /**
   * Load all data from playerDatabase
   */
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load teams
      const allTeams = getAllTeams();
      const offseasonTeams = allTeams.map(convertToOffseasonTeam);
      setTeams(offseasonTeams);

      // Load players
      const allPlayers = getAllPlayers();
      const offseasonPlayers = allPlayers.map(convertToOffseasonPlayer);
      setPlayers(offseasonPlayers);

      setHasRealData(allTeams.length > 0 && allPlayers.length > 0);
    } catch (err) {
      console.error('[useOffseasonData] Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load offseason data');
      setHasRealData(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Get team by ID
   */
  const getTeamById = useCallback((teamId: string): OffseasonTeam | undefined => {
    return teams.find(t => t.id === teamId);
  }, [teams]);

  /**
   * Get player by ID
   */
  const getPlayerById = useCallback((playerId: string): OffseasonPlayer | undefined => {
    return players.find(p => p.id === playerId);
  }, [players]);

  /**
   * Get roster for a team
   */
  const getTeamRosterFn = useCallback((teamId: string): OffseasonPlayer[] => {
    return players.filter(p => p.teamId === teamId);
  }, [players]);

  /**
   * Get retirement probability for a player
   */
  const getRetirementProbability = useCallback((playerId: string): number => {
    const player = players.find(p => p.id === playerId);
    if (!player) return 0;

    const overallRating = player.grade === 'S' ? 95
      : player.grade === 'A+' ? 90
      : player.grade === 'A' ? 85
      : player.grade === 'A-' ? 80
      : player.grade === 'B+' ? 75
      : player.grade === 'B' ? 70
      : player.grade === 'B-' ? 65
      : player.grade === 'C+' ? 60
      : player.grade === 'C' ? 55
      : player.grade === 'C-' ? 50
      : 45;

    const agingInfo = getPlayerAgingInfo(playerId, player.name, player.age, overallRating);
    return agingInfo.retirementProbability;
  }, [players, getPlayerAgingInfo]);

  /**
   * Get players most likely to retire
   */
  const retirementCandidates = useMemo((): PlayerAgingInfo[] => {
    const candidates = players
      .filter(p => p.age >= 35)
      .map(p => {
        const overallRating = p.grade === 'S' ? 95
          : p.grade === 'A+' ? 90
          : p.grade === 'A' ? 85
          : p.grade === 'A-' ? 80
          : p.grade === 'B+' ? 75
          : p.grade === 'B' ? 70
          : p.grade === 'B-' ? 65
          : p.grade === 'C+' ? 60
          : p.grade === 'C' ? 55
          : p.grade === 'C-' ? 50
          : 45;
        return getPlayerAgingInfo(p.id, p.name, p.age, overallRating);
      })
      .sort((a, b) => b.retirementProbability - a.retirementProbability);

    return candidates;
  }, [players, getPlayerAgingInfo]);

  /**
   * Get free agents (players without a team)
   */
  const freeAgents = useMemo((): OffseasonPlayer[] => {
    return players.filter(p => p.teamId === 'free-agents' || !p.teamId);
  }, [players]);

  return {
    isLoading,
    error,
    teams,
    getTeamById,
    players,
    getPlayerById,
    getTeamRoster: getTeamRosterFn,
    retirementCandidates,
    getRetirementProbability,
    freeAgents,
    hasRealData,
    refresh: loadData,
  };
}

export default useOffseasonData;
