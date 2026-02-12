/**
 * Franchise Initializer — Orchestrates full franchise creation
 *
 * Called when the user completes the 6-step FranchiseSetup wizard.
 * Coordinates:
 *   1. Create franchise metadata in kbl-app-meta
 *   2. Store full FranchiseConfig
 *   3. Load teams from League Builder
 *   4. Generate season schedule
 *   5. Write schedule to IndexedDB
 *   6. Create season metadata
 *   7. Set as active franchise
 */

import type { FranchiseConfig, StoredFranchiseConfig } from '../types/franchise';
import {
  createFranchise,
  saveFranchiseConfig,
  getFranchiseConfig,
  updateFranchiseMetadata,
  setActiveFranchise,
} from './franchiseManager';
import { getLeagueTemplate, getTeam } from './leagueBuilderStorage';
import { generateSchedule, type ScheduleTeam } from './scheduleGenerator';
import { addGame, initScheduleDatabase } from './scheduleStorage';

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

  // 2. Load the league template to get team IDs
  const leagueTemplate = await getLeagueTemplate(config.league);
  if (!leagueTemplate) {
    throw new Error(`League template "${config.league}" not found`);
  }

  // 3. Load full team data
  const teamIds = leagueTemplate.teamIds || [];
  const teams: ScheduleTeam[] = [];
  for (const teamId of teamIds) {
    const team = await getTeam(teamId);
    if (team) {
      teams.push({ teamId: team.id, teamName: team.name });
    }
  }

  if (teams.length < 2) {
    throw new Error('Need at least 2 teams to create a franchise');
  }

  // 4. Determine controlled team
  const controlledTeamId = config.teams.selectedTeams[0] || teams[0].teamId;
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
  const storedConfig: StoredFranchiseConfig = {
    ...config,
    franchiseId,
    createdAt: Date.now(),
  };
  await saveFranchiseConfig(storedConfig);

  // 7. Generate the season schedule
  const scheduleGames = generateSchedule(teams, config.season.gamesPerTeam);

  // 8. Write schedule to IndexedDB (tagged with franchiseId)
  await initScheduleDatabase();
  for (const game of scheduleGames) {
    await addGame({
      franchiseId,
      seasonNumber: 1,
      gameNumber: game.gameNumber,
      dayNumber: game.gameNumber,
      awayTeamId: game.awayTeamId,
      homeTeamId: game.homeTeamId,
    });
  }

  // 9. Set as active franchise
  await setActiveFranchise(franchiseId);

  return franchiseId;
}

/**
 * Generate a schedule for a new season within an existing franchise.
 *
 * Loads the franchise config to get league/team data and season length,
 * then generates and writes a full round-robin schedule to IndexedDB.
 *
 * Called by both advancement paths:
 *   - FinalizeAdvanceFlow (after executeSeasonTransition)
 *   - handleStartNewSeason in FranchiseHome (offseason shortcut)
 *
 * @param franchiseId — The franchise to generate schedule for
 * @param newSeasonNumber — The season number to tag the schedule with
 * @returns Number of games scheduled
 */
export async function generateNewSeasonSchedule(
  franchiseId: string,
  newSeasonNumber: number,
): Promise<number> {
  // 1. Load the stored franchise config for league + season settings
  const config = await getFranchiseConfig(franchiseId);
  if (!config) {
    throw new Error(`Franchise config not found for ${franchiseId}`);
  }
  if (!config.league) {
    throw new Error('No league ID in franchise config');
  }

  // 2. Load the league template to get team IDs
  const leagueTemplate = await getLeagueTemplate(config.league);
  if (!leagueTemplate) {
    throw new Error(`League template "${config.league}" not found`);
  }

  // 3. Load full team data
  const teamIds = leagueTemplate.teamIds || [];
  const teams: ScheduleTeam[] = [];
  for (const teamId of teamIds) {
    const team = await getTeam(teamId);
    if (team) {
      teams.push({ teamId: team.id, teamName: team.name });
    }
  }

  if (teams.length < 2) {
    throw new Error('Need at least 2 teams to generate schedule');
  }

  // 4. Generate round-robin schedule
  const gamesPerTeam = config.season.gamesPerTeam;
  const scheduleGames = generateSchedule(teams, gamesPerTeam);

  // 5. Write schedule to IndexedDB (tagged with franchiseId + new season)
  await initScheduleDatabase();
  for (const game of scheduleGames) {
    await addGame({
      franchiseId,
      seasonNumber: newSeasonNumber,
      gameNumber: game.gameNumber,
      dayNumber: game.gameNumber,
      awayTeamId: game.awayTeamId,
      homeTeamId: game.homeTeamId,
    });
  }

  return scheduleGames.length;
}
