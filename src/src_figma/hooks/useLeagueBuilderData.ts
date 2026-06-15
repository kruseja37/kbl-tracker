/**
 * League Builder Data Hook
 *
 * Connects leagueBuilderStorage to Figma UI components with:
 * - Loading states
 * - CRUD operations for leagues, teams, players, rosters, rules
 * - Auto-refresh on changes
 */

import { useState, useEffect, useCallback } from 'react';
import {
  initLeagueBuilderDatabase,
  initializeDefaultPresets,
  getAllLeagueTemplates,
  getLeagueTemplate,
  saveLeagueTemplate,
  deleteLeagueTemplate,
  getAllTeams,
  getTeam,
  saveTeam,
  deleteTeam,
  getAllPlayers,
  getPlayer,
  getPlayersByTeam,
  savePlayer,
  deletePlayer,
  getAllRulesPresets,
  getRulesPreset,
  saveRulesPreset,
  deleteRulesPreset,
  getTeamRoster,
  saveTeamRoster,
  deleteTeamRoster,
  saveRegisteredPool,
  getRegisteredPool as getRegisteredPoolFromStorage,
  seedFromSMB4Database,
  isSMB4DatabaseSeeded,
  seedFromMLBDatabase,
  isMLBDatabaseSeeded,
  type LeagueTemplate,
  type LeagueAssignment,
  type Team,
  type Player,
  type RulesPreset,
  type TeamRoster,
} from '../../utils/leagueBuilderStorage';
import { registerPool, type RegisteredPool } from '../../engines/leagueConstruction';
import {
  calculateIvBaseSalary,
  type PlayerForSalary,
  type PlayerPosition as SalaryPosition,
} from '../../engines/salaryCalculator';
import { BALANCE_MODE_DEFAULT } from '../../data/rosterEngineConstants';

// Re-export types for convenience
export type {
  LeagueTemplate,
  Team,
  Player,
  LeagueAssignment,
  RulesPreset,
  TeamRoster,
  Conference,
  Division,
  Position,
  Grade,
  PitchType,
  Personality,
  Chemistry,
  MojoState,
  RosterStatus,
  LineupSlot,
  DepthChart,
} from '../../utils/leagueBuilderStorage';
export type { RegisteredPool } from '../../engines/leagueConstruction';

// ============================================
// HOOK INTERFACE
// ============================================

export interface UseLeagueBuilderDataReturn {
  // State
  leagues: LeagueTemplate[];
  teams: Team[];
  players: Player[];
  rulesPresets: RulesPreset[];
  isLoading: boolean;
  error: string | null;

  // League operations
  getLeague: (id: string) => Promise<LeagueTemplate | null>;
  createLeague: (data: Omit<LeagueTemplate, 'id' | 'createdDate' | 'lastModified'>) => Promise<LeagueTemplate>;
  updateLeague: (data: LeagueTemplate) => Promise<LeagueTemplate>;
  removeLeague: (id: string) => Promise<void>;
  duplicateLeague: (id: string) => Promise<LeagueTemplate>;
  registerLeaguePool: (leagueId: string) => Promise<RegisteredPool>;
  getRegisteredPool: (leagueId: string) => Promise<RegisteredPool | null>;

  // Team operations
  getTeamById: (id: string) => Promise<Team | null>;
  createTeam: (data: Omit<Team, 'id' | 'createdDate' | 'lastModified'>) => Promise<Team>;
  updateTeam: (data: Team) => Promise<Team>;
  removeTeam: (id: string) => Promise<void>;

  // Player operations
  getPlayerById: (id: string) => Promise<Player | null>;
  getTeamPlayers: (teamId: string, leagueId: string) => Promise<Player[]>;
  createPlayer: (data: Omit<Player, 'id' | 'createdDate' | 'lastModified'>) => Promise<Player>;
  updatePlayer: (data: Player) => Promise<Player>;
  removePlayer: (id: string) => Promise<void>;

  // Rules operations
  getRulesById: (id: string) => Promise<RulesPreset | null>;
  createRulesPreset: (data: Omit<RulesPreset, 'id' | 'createdDate' | 'lastModified'>) => Promise<RulesPreset>;
  updateRulesPreset: (data: RulesPreset) => Promise<RulesPreset>;
  removeRulesPreset: (id: string) => Promise<void>;

  // Roster operations
  getRoster: (teamId: string) => Promise<TeamRoster | null>;
  updateRoster: (roster: TeamRoster) => Promise<TeamRoster>;
  removeRoster: (teamId: string) => Promise<void>;

  // SMB4 Database Seeding
  seedSMB4Data: (clearExisting?: boolean) => Promise<{ teams: number; players: number }>;
  isSMB4Seeded: () => Promise<boolean>;

  // MLB Database Seeding
  seedMLBData: (clearExisting?: boolean) => Promise<{ teams: number; players: number }>;
  isMLBSeeded: () => Promise<boolean>;

  // Utility
  refresh: () => Promise<void>;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

function toSalaryPosition(position: Player['primaryPosition'] | Player['secondaryPosition']): SalaryPosition {
  const salaryPositions = new Set<string>([
    'C',
    '1B',
    '2B',
    'SS',
    '3B',
    'LF',
    'CF',
    'RF',
    'DH',
    'SP',
    'RP',
    'CP',
    'SP/RP',
  ]);
  return position && salaryPositions.has(position) ? position as SalaryPosition : 'UTIL';
}

function toPitcherRole(position: Player['primaryPosition']): PlayerForSalary['pitcherRole'] {
  return position === 'SP' || position === 'RP' || position === 'CP' || position === 'SP/RP'
    ? position
    : 'SP';
}

function toSalaryPlayer(player: Player): PlayerForSalary {
  const isPitcher = player.primaryPosition === 'SP'
    || player.primaryPosition === 'RP'
    || player.primaryPosition === 'CP'
    || player.primaryPosition === 'SP/RP'
    || player.primaryPosition === 'P';

  return {
    id: player.id,
    name: `${player.firstName} ${player.lastName}`.trim(),
    isPitcher,
    primaryPosition: toSalaryPosition(player.primaryPosition),
    secondaryPosition: player.secondaryPosition ? toSalaryPosition(player.secondaryPosition) : undefined,
    pitcherRole: isPitcher ? toPitcherRole(player.primaryPosition) : undefined,
    ratings: isPitcher
      ? { velocity: player.velocity, junk: player.junk, accuracy: player.accuracy }
      : {
          power: player.power,
          contact: player.contact,
          speed: player.speed,
          fielding: player.fielding,
          arm: player.arm,
        },
    battingRatings: isPitcher
      ? {
          power: player.power,
          contact: player.contact,
          speed: player.speed,
          fielding: player.fielding,
          arm: player.arm,
        }
      : undefined,
    age: player.age,
    bats: player.bats,
    fame: player.fame,
    traits: [player.trait1, player.trait2].filter((trait): trait is string => Boolean(trait)),
    arsenal: player.arsenal,
    armSlot: player.armSlot ?? null,
  };
}

export function useLeagueBuilderData(): UseLeagueBuilderDataReturn {
  const [leagues, setLeagues] = useState<LeagueTemplate[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rulesPresets, setRulesPresets] = useState<RulesPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await initLeagueBuilderDatabase();
      await initializeDefaultPresets();

      const [leaguesData, teamsData, playersData, presetsData] = await Promise.all([
        getAllLeagueTemplates(),
        getAllTeams(),
        getAllPlayers(),
        getAllRulesPresets(),
      ]);

      setLeagues(leaguesData);
      setTeams(teamsData);
      setPlayers(playersData);
      setRulesPresets(presetsData);
    } catch (err) {
      console.error('[useLeagueBuilderData] Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh function
  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // ============================================
  // LEAGUE OPERATIONS
  // ============================================

  const getLeague = useCallback(async (id: string) => {
    return getLeagueTemplate(id);
  }, []);

  const createLeague = useCallback(async (data: Omit<LeagueTemplate, 'id' | 'createdDate' | 'lastModified'>) => {
    try {
      const league = await saveLeagueTemplate(data);

      // Auto-assign players: for each team in the new league, find players
      // already assigned to that team (in any league) and give them a new
      // assignment for this league on the same team. This lets users then
      // move players to different teams within the new league independently.
      if (league.teamIds?.length) {
        const allPlayers = await getAllPlayers();
        const teamIdSet = new Set(league.teamIds);

        for (const player of allPlayers) {
          if (!player.leagueAssignments?.length) continue;

          // Find any existing assignment on a team that's in this new league
          const matchingAssignment = player.leagueAssignments.find(
            a => teamIdSet.has(a.teamId)
          );
          if (!matchingAssignment) continue;

          // Skip if player already has an assignment for this league
          const alreadyAssigned = player.leagueAssignments.some(
            a => a.leagueId === league.id
          );
          if (alreadyAssigned) continue;

          // Add new assignment for this league, same team + roster status
          await savePlayer({
            ...player,
            leagueAssignments: [
              ...player.leagueAssignments,
              {
                leagueId: league.id,
                teamId: matchingAssignment.teamId,
                rosterStatus: matchingAssignment.rosterStatus,
              },
            ],
          });
        }
      }

      await refresh();
      return league;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create league';
      setError(message);
      throw err;
    }
  }, [refresh]);

  const updateLeague = useCallback(async (data: LeagueTemplate) => {
    try {
      const league = await saveLeagueTemplate(data);
      await refresh();
      return league;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update league';
      setError(message);
      throw err;
    }
  }, [refresh]);

  const removeLeague = useCallback(async (id: string) => {
    try {
      await deleteLeagueTemplate(id);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete league';
      setError(message);
      throw err;
    }
  }, [refresh]);

  const duplicateLeague = useCallback(async (id: string) => {
    try {
      const original = await getLeagueTemplate(id);
      if (!original) throw new Error('League not found');

      const duplicate = await saveLeagueTemplate({
        ...original,
        id: undefined,
        name: `${original.name} Copy`,
      });
      await refresh();
      return duplicate;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to duplicate league';
      setError(message);
      throw err;
    }
  }, [refresh]);

  const getRegisteredPool = useCallback(async (leagueId: string) => {
    return getRegisteredPoolFromStorage(leagueId);
  }, []);

  const registerLeaguePool = useCallback(async (leagueId: string) => {
    try {
      const league = await getLeagueTemplate(leagueId);
      if (!league) throw new Error('League not found');

      const allPlayers = await getAllPlayers();
      const leaguePlayers = allPlayers.filter((player) =>
        player.leagueAssignments?.some((assignment) => assignment.leagueId === league.id)
      );

      const registeredPool = registerPool({
        leagueId: league.id,
        tier: league.tier ?? 'juiced',
        balanceMode: league.balanceMode ?? BALANCE_MODE_DEFAULT,
        totalSlots: league.teamIds.length * 22,
        players: leaguePlayers.map((player) => ({
          id: player.id,
          iv: calculateIvBaseSalary(toSalaryPlayer(player)).ivBase,
          salary: player.salary,
        })),
      });

      await saveRegisteredPool(registeredPool);
      return registeredPool;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to register league pool';
      setError(message);
      throw err;
    }
  }, []);

  // ============================================
  // TEAM OPERATIONS
  // ============================================

  const getTeamById = useCallback(async (id: string) => {
    return getTeam(id);
  }, []);

  const createTeam = useCallback(async (data: Omit<Team, 'id' | 'createdDate' | 'lastModified'>) => {
    try {
      const team = await saveTeam(data);
      await refresh();
      return team;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create team';
      setError(message);
      throw err;
    }
  }, [refresh]);

  const updateTeam = useCallback(async (data: Team) => {
    try {
      const team = await saveTeam(data);
      await refresh();
      return team;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update team';
      setError(message);
      throw err;
    }
  }, [refresh]);

  const removeTeam = useCallback(async (id: string) => {
    try {
      await deleteTeam(id);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete team';
      setError(message);
      throw err;
    }
  }, [refresh]);

  // ============================================
  // PLAYER OPERATIONS
  // ============================================

  const getPlayerById = useCallback(async (id: string) => {
    return getPlayer(id);
  }, []);

  const getTeamPlayers = useCallback(async (teamId: string, leagueId: string) => {
    return getPlayersByTeam(teamId, leagueId);
  }, []);

  const createPlayer = useCallback(async (data: Omit<Player, 'id' | 'createdDate' | 'lastModified'>) => {
    try {
      const player = await savePlayer(data);
      await refresh();
      return player;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create player';
      setError(message);
      throw err;
    }
  }, [refresh]);

  const updatePlayer = useCallback(async (data: Player) => {
    try {
      const player = await savePlayer(data, { trackChanges: true });
      await refresh();
      return player;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update player';
      setError(message);
      throw err;
    }
  }, [refresh]);

  const removePlayer = useCallback(async (id: string) => {
    try {
      await deletePlayer(id);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete player';
      setError(message);
      throw err;
    }
  }, [refresh]);

  // ============================================
  // RULES OPERATIONS
  // ============================================

  const getRulesById = useCallback(async (id: string) => {
    return getRulesPreset(id);
  }, []);

  const createRulesPreset = useCallback(async (data: Omit<RulesPreset, 'id' | 'createdDate' | 'lastModified'>) => {
    try {
      const preset = await saveRulesPreset(data);
      await refresh();
      return preset;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create rules preset';
      setError(message);
      throw err;
    }
  }, [refresh]);

  const updateRulesPreset = useCallback(async (data: RulesPreset) => {
    try {
      const preset = await saveRulesPreset(data);
      await refresh();
      return preset;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update rules preset';
      setError(message);
      throw err;
    }
  }, [refresh]);

  const removeRulesPreset = useCallback(async (id: string) => {
    try {
      await deleteRulesPreset(id);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete rules preset';
      setError(message);
      throw err;
    }
  }, [refresh]);

  // ============================================
  // ROSTER OPERATIONS
  // ============================================

  const getRoster = useCallback(async (teamId: string) => {
    return getTeamRoster(teamId);
  }, []);

  const updateRoster = useCallback(async (roster: TeamRoster) => {
    try {
      const updated = await saveTeamRoster(roster);
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update roster';
      setError(message);
      throw err;
    }
  }, []);

  const removeRoster = useCallback(async (teamId: string) => {
    try {
      await deleteTeamRoster(teamId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete roster';
      setError(message);
      throw err;
    }
  }, []);

  // ============================================
  // SMB4 DATABASE SEEDING
  // ============================================

  const seedSMB4Data = useCallback(async (clearExisting = true) => {
    try {
      setIsLoading(true);
      const result = await seedFromSMB4Database(clearExisting);
      await refresh();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to seed SMB4 data';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refresh]);

  const isSMB4Seeded = useCallback(async () => {
    return isSMB4DatabaseSeeded();
  }, []);

  // ============================================
  // MLB DATABASE SEEDING
  // ============================================

  const seedMLBData = useCallback(async (clearExisting = true) => {
    try {
      setIsLoading(true);
      const result = await seedFromMLBDatabase(clearExisting);
      await refresh();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to seed MLB data';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refresh]);

  const isMLBSeeded = useCallback(async () => {
    return isMLBDatabaseSeeded();
  }, []);

  return {
    // State
    leagues,
    teams,
    players,
    rulesPresets,
    isLoading,
    error,

    // League operations
    getLeague,
    createLeague,
    updateLeague,
    removeLeague,
    duplicateLeague,
    registerLeaguePool,
    getRegisteredPool,

    // Team operations
    getTeamById,
    createTeam,
    updateTeam,
    removeTeam,

    // Player operations
    getPlayerById,
    getTeamPlayers,
    createPlayer,
    updatePlayer,
    removePlayer,

    // Rules operations
    getRulesById,
    createRulesPreset,
    updateRulesPreset,
    removeRulesPreset,

    // Roster operations
    getRoster,
    updateRoster,
    removeRoster,

    // SMB4 Database Seeding
    seedSMB4Data,
    isSMB4Seeded,

    // MLB Database Seeding
    seedMLBData,
    isMLBSeeded,

    // Utility
    refresh,
  };
}

export default useLeagueBuilderData;
