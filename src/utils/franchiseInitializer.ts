/**
 * Franchise Initializer — Orchestrates full franchise creation
 *
 * Called when the user completes the 6-step FranchiseSetup wizard.
 * Coordinates:
 *   1. Create franchise metadata in kbl-app-meta
 *   2. Store full FranchiseConfig
 *   3. Load teams from League Builder
 *   4. Seed empty/manual schedule state
 *   5. Create season metadata
 *   6. Set as active franchise
 */

import type {
  FranchiseConfig,
  FranchiseControlledTeamMetadata,
  FranchiseModeHandoffContract,
  FranchisePlayoffSetupSnapshot,
  FranchiseRulesSnapshot,
  FranchiseSeasonLengthMetadata,
  FranchiseTeamControl,
  FranchiseTeamControlSnapshot,
  FranchiseType,
  StoredFranchiseConfig,
} from '../types/franchise';
import {
  createFranchise,
  deleteFranchise,
  saveFranchiseConfig,
  getFranchiseConfig,
  updateFranchiseMetadata,
  setActiveFranchise,
} from './franchiseManager';
import { getLeagueTemplate, getTeam, type LeagueTemplate } from './leagueBuilderStorage';
import type { ScheduleTeam } from './scheduleGenerator';
import {
  getAllGamesByFranchise,
  initScheduleDatabase,
} from './scheduleStorage';
import {
  deepCopyLeagueToFranchise,
  deleteFranchiseDatabase,
  getAllFranchisePlayers,
  getAllFranchiseTeams,
} from './franchisePlayerStorage';
import {
  deleteSeasonMetadata,
  getOrCreateSeason,
  getSeasonMetadata,
  saveSeasonMetadata,
  type SeasonMetadata,
} from './seasonStorage';
import {
  getFranchiseSeasonId,
  getFranchiseSeasonName,
} from './franchisePersistenceContract';
import {
  carryOverFranchiseFarmRecordsToSeason,
  deleteFranchiseFarmRecordsForSeason,
} from './franchiseFarmStorage';

interface FranchiseLeagueTeams {
  leagueTemplate: LeagueTemplate;
  teams: ScheduleTeam[];
}

function normalizeSelectedTeamIds(config: FranchiseConfig, teams: ScheduleTeam[]): string[] {
  const teamIds = new Set(teams.map((team) => team.teamId));
  const selected = Array.from(new Set(config.teams.selectedTeams));
  const unknown = selected.filter((teamId) => !teamIds.has(teamId));

  if (unknown.length > 0) {
    throw new Error(`Selected franchise team(s) are not in the selected league: ${unknown.join(', ')}`);
  }

  if (selected.length === 0) {
    throw new Error('At least one controlled team must be selected');
  }

  return selected;
}

function deriveFranchiseType(
  config: FranchiseConfig,
  selectedTeamIds: string[],
  teams: ScheduleTeam[],
): FranchiseType {
  if (config.franchiseType) return config.franchiseType;
  if (selectedTeamIds.length === teams.length) return 'couch-coop';
  if (selectedTeamIds.length > 1 || config.teams.mode === 'multiplayer') return 'custom';
  return 'solo';
}

function buildTeamControlSnapshot(
  config: FranchiseConfig,
  teams: ScheduleTeam[],
): FranchiseTeamControlSnapshot {
  const selectedTeamIds = normalizeSelectedTeamIds(config, teams);
  const franchiseType = deriveFranchiseType(config, selectedTeamIds, teams);
  const selectedSet = new Set(selectedTeamIds);
  const teamControl: Record<string, FranchiseTeamControl> = {};

  for (const team of teams) {
    teamControl[team.teamId] = selectedSet.has(team.teamId) ? 'human' : 'ai';
  }

  const controlledTeams: FranchiseControlledTeamMetadata[] = teams
    .filter((team) => selectedSet.has(team.teamId))
    .map((team) => ({
      teamId: team.teamId,
      teamName: team.teamName,
      controlledBy: 'human',
    }));

  return {
    franchiseType,
    aiScoreEntry: config.aiScoreEntry ?? franchiseType !== 'couch-coop',
    teamControl,
    controlledTeams,
  };
}

function buildRulesSnapshot(config: FranchiseConfig): FranchiseRulesSnapshot {
  return {
    gamesPerTeam: config.season.gamesPerTeam,
    inningsPerGame: config.season.inningsPerGame,
    extraInningsRule: config.season.extraInningsRule,
    scheduleType: config.season.scheduleType,
    useDH: config.season.useDH,
    allStarGame: config.season.allStarGame,
    tradeDeadline: config.season.tradeDeadline,
    mercyRule: config.season.mercyRule,
  };
}

function buildPlayoffSetupSnapshot(config: FranchiseConfig): FranchisePlayoffSetupSnapshot {
  return {
    teamsQualifying: config.playoffs.teamsQualifying,
    format: config.playoffs.format,
    seriesLengths: { ...config.playoffs.seriesLengths },
    homeFieldAdvantage: config.playoffs.homeFieldAdvantage,
  };
}

function buildSeasonLengthMetadata(config: FranchiseConfig): FranchiseSeasonLengthMetadata {
  return {
    gamesPerTeam: config.season.gamesPerTeam,
    expectedRegularSeasonGamesPerTeam: config.season.gamesPerTeam,
    inningsPerGame: config.season.inningsPerGame,
    adaptiveStandardsInningsPerGame: config.season.inningsPerGame,
  };
}

export interface FranchisePersistenceRepairResult {
  franchiseId: string;
  seasonNumber: number;
  rosterBackfilled: boolean;
  seasonMetadataCreated: boolean;
  seasonMetadataUpdated: boolean;
  totalGames: number;
}

async function loadScheduleTeamsForLeague(
  leagueId: string,
  insufficientTeamsMessage: string,
): Promise<FranchiseLeagueTeams> {
  const leagueTemplate = await getLeagueTemplate(leagueId);
  if (!leagueTemplate) {
    throw new Error(`League template "${leagueId}" not found`);
  }

  const teamIds = leagueTemplate.teamIds || [];
  const teams: ScheduleTeam[] = [];
  for (const teamId of teamIds) {
    const team = await getTeam(teamId);
    if (team) {
      teams.push({ teamId: team.id, teamName: team.name });
    }
  }

  if (teams.length < 2) {
    throw new Error(insufficientTeamsMessage);
  }

  return { leagueTemplate, teams };
}

async function ensureFranchiseSeasonMetadata(
  franchiseId: string,
  seasonNumber: number,
  totalGames: number,
): Promise<{ metadata: SeasonMetadata; created: boolean; updated: boolean }> {
  const seasonId = getFranchiseSeasonId(franchiseId, seasonNumber);
  const seasonName = getFranchiseSeasonName(seasonNumber);
  const existing = await getSeasonMetadata(seasonId);

  if (!existing) {
    const metadata = await getOrCreateSeason(
      seasonId,
      seasonNumber,
      seasonName,
      totalGames,
    );
    return { metadata, created: true, updated: false };
  }

  if (
    existing.seasonNumber !== seasonNumber ||
    existing.seasonName !== seasonName ||
    existing.totalGames !== totalGames
  ) {
    const updated = await saveSeasonMetadata({
      ...existing,
      seasonNumber,
      seasonName,
      totalGames,
    });
    return { metadata: updated, created: false, updated: true };
  }

  return { metadata: existing, created: false, updated: false };
}

async function createFranchiseSeasonMetadata(
  franchiseId: string,
  seasonNumber: number,
  totalGames: number,
): Promise<void> {
  await ensureFranchiseSeasonMetadata(franchiseId, seasonNumber, totalGames);
}

async function deriveSeasonTotalGames(
  franchiseId: string,
  seasonNumber: number,
): Promise<number> {
  const existingSchedule = await getAllGamesByFranchise(franchiseId, seasonNumber);
  return existingSchedule.length;
}

async function cleanupFailedFranchiseInitialization(
  franchiseId: string,
  seasonNumber: number,
): Promise<void> {
  try {
    await deleteSeasonMetadata(getFranchiseSeasonId(franchiseId, seasonNumber));
  } catch (err) {
    console.warn('[franchiseInitializer] Failed to clean up partial season metadata:', err);
  }

  try {
    await deleteFranchiseFarmRecordsForSeason(franchiseId, getFranchiseSeasonId(franchiseId, seasonNumber));
  } catch (err) {
    console.warn('[franchiseInitializer] Failed to clean up partial franchise farm records:', err);
  }

  try {
    await deleteFranchise(franchiseId);
  } catch (err) {
    console.warn('[franchiseInitializer] Failed to clean up partial franchise:', err);
  }

  try {
    await deleteFranchiseDatabase(franchiseId);
  } catch (err) {
    console.warn('[franchiseInitializer] Failed to clean up partial franchise DB:', err);
  }
}

export async function repairFranchisePersistence(
  franchiseId: string,
  seasonNumber = 1,
): Promise<FranchisePersistenceRepairResult> {
  const config = await getFranchiseConfig(franchiseId);
  if (!config) {
    throw new Error(`Franchise config not found for ${franchiseId}`);
  }

  const [franchisePlayers, franchiseTeams] = await Promise.all([
    getAllFranchisePlayers(franchiseId),
    getAllFranchiseTeams(franchiseId),
  ]);

  // Repair must be conservative: franchise saves are owned snapshots that can
  // legitimately diverge from the mutable League Builder source after setup.
  const rosterBackfilled =
    franchisePlayers.length === 0 ||
    franchiseTeams.length === 0;

  if (rosterBackfilled) {
    if (!config.league) {
      throw new Error(`No league ID in franchise config for ${franchiseId}`);
    }
    await loadScheduleTeamsForLeague(
      config.league,
      'Need at least 2 teams to repair franchise persistence',
    );
    await deepCopyLeagueToFranchise(franchiseId, config.league, {
      seasonId: getFranchiseSeasonId(franchiseId, seasonNumber),
      seasonNumber,
      teamControl: config.teamControl,
    });
  }

  const totalGames = await deriveSeasonTotalGames(franchiseId, seasonNumber);
  const seasonMetadata = await ensureFranchiseSeasonMetadata(
    franchiseId,
    seasonNumber,
    totalGames,
  );

  return {
    franchiseId,
    seasonNumber,
    rosterBackfilled,
    seasonMetadataCreated: seasonMetadata.created,
    seasonMetadataUpdated: seasonMetadata.updated,
    totalGames,
  };
}

/**
 * Initialize a new franchise from the wizard configuration.
 *
 * @returns The new franchise ID for navigation
 */
export async function initializeFranchise(config: FranchiseConfig): Promise<string> {
  // Validate required fields
  if (!config.league) {
    throw new Error('No league selected');
  }
  if (!config.franchiseName.trim()) {
    throw new Error('Franchise name is required');
  }

  // 1. Create franchise metadata record in kbl-app-meta
  const franchiseId = await createFranchise(config.franchiseName);

  try {
    // 2. Load the league template and team data
    const { leagueTemplate, teams } = await loadScheduleTeamsForLeague(
      config.league,
      'Need at least 2 teams to create a franchise',
    );

    const teamControlSnapshot = buildTeamControlSnapshot(config, teams);

    // 3. Seed the per-franchise roster/team database from the selected league.
    const copyResult = await deepCopyLeagueToFranchise(franchiseId, config.league, {
      seasonId: getFranchiseSeasonId(franchiseId, 1),
      seasonNumber: 1,
      teamControl: teamControlSnapshot.teamControl,
      farmScoutingBridgeRepairApplied: config.roster.startupProspectDraft?.bridgeRepairApplied,
    });

    // 4. Determine controlled team
    const controlledTeamId = teamControlSnapshot.controlledTeams[0]?.teamId || teams[0].teamId;
    const controlledTeam = teams.find(t => t.teamId === controlledTeamId);
    const controlledTeamName = controlledTeam?.teamName || 'Unknown Team';

    // 5. Update franchise metadata with enhanced fields
    await updateFranchiseMetadata(franchiseId, {
      leagueName: leagueTemplate.name || config.leagueDetails?.name || 'League',
      leagueId: config.league,
      controlledTeamId,
      controlledTeamName,
      currentSeason: 1,
    });

    // 6. Save full FranchiseConfig for later retrieval
    const rulesSnapshot = buildRulesSnapshot(config);
    const playoffSetupSnapshot = buildPlayoffSetupSnapshot(config);
    const seasonLength = buildSeasonLengthMetadata(config);
    const schedulePolicy = {
      policy: 'empty-manual-user-supplied' as const,
      generatedSchedulesAllowed: false as const,
      initialScheduleRows: 0 as const,
      allowedSources: ['manual', 'csv'] as Array<'manual' | 'csv'>,
    };
    const handoffContract: FranchiseModeHandoffContract = {
      version: 'mode1-mode2-v1',
      franchiseType: teamControlSnapshot.franchiseType,
      teamControl: teamControlSnapshot,
      rulesSnapshot,
      playoffSetupSnapshot,
      seasonLength,
      schedulePolicy,
      rosterRequirements: copyResult.rosterRequirements,
      stadiums: copyResult.stadiums,
      salaryBaseline: copyResult.salaryBaseline,
    };
    const storedConfig: StoredFranchiseConfig = {
      ...config,
      franchiseType: teamControlSnapshot.franchiseType,
      teamControl: teamControlSnapshot.teamControl,
      controlledTeams: teamControlSnapshot.controlledTeams,
      rulesSnapshot,
      playoffSetupSnapshot,
      seasonLength,
      schedulePolicy,
      rosterRequirements: copyResult.rosterRequirements,
      stadiums: copyResult.stadiums,
      salaryBaseline: copyResult.salaryBaseline,
      handoffContract,
      franchiseId,
      createdAt: Date.now(),
    };
    await saveFranchiseConfig(storedConfig);

    // 7. Initialize schedule storage without generating franchise schedule rows.
    // Franchise v1 schedules are empty/manual/user-supplied only.
    await initScheduleDatabase();

    // 8. Create the season metadata record franchise mode reads later.
    await createFranchiseSeasonMetadata(franchiseId, 1, 0);

    // 9. Set as active franchise
    await setActiveFranchise(franchiseId);
  } catch (err) {
    await cleanupFailedFranchiseInitialization(franchiseId, 1);
    throw err;
  }

  return franchiseId;
}

/**
 * Initialize an empty schedule for a new season within an existing franchise.
 *
 * Franchise v1 schedules are empty/manual/user-supplied only. Season length
 * remains metadata/config for validation and scaling, not schedule generation.
 *
 * Called by both advancement paths:
 *   - FinalizeAdvanceFlow (after executeSeasonTransition)
 *   - handleStartNewSeason in FranchiseHome (offseason shortcut)
 *
 * @param franchiseId — The franchise to initialize schedule state for
 * @param newSeasonNumber — The season number to initialize
 * @returns Number of games scheduled
 */
export async function initializeEmptyFranchiseSeasonSchedule(
  franchiseId: string,
  newSeasonNumber: number,
): Promise<number> {
  // 1. Validate the copied franchise-owned team snapshot, not the mutable
  // League Builder source that may have changed after setup.
  const franchiseTeams = await getAllFranchiseTeams(franchiseId);
  if (franchiseTeams.length < 2) {
    throw new Error('Need at least 2 franchise-owned teams to initialize franchise season');
  }

  // 2. Ensure the schedule database exists, but do not add rows.
  await initScheduleDatabase();

  // 3. Create season metadata with no scheduled games by default.
  await createFranchiseSeasonMetadata(franchiseId, newSeasonNumber, 0);

  // 4. Carry farm holding records forward so FARM assignments remain durable
  // in the new franchise season scope. Farm players still do not play games.
  if (newSeasonNumber > 1) {
    await carryOverFranchiseFarmRecordsToSeason({
      franchiseId,
      fromSeasonId: getFranchiseSeasonId(franchiseId, newSeasonNumber - 1),
      toSeasonId: getFranchiseSeasonId(franchiseId, newSeasonNumber),
      toSeasonNumber: newSeasonNumber,
    });
  }

  return 0;
}
