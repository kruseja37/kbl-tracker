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
  CHECKPOINT_CADENCE_DEFAULT,
  normalizeCheckpointCadence,
  type CheckpointCadence,
} from '../data/rosterEngineConstants';
import {
  createFranchise,
  deleteFranchise,
  saveFranchiseConfig,
  getFranchiseConfig,
  updateFranchiseMetadata,
  setActiveFranchise,
} from './franchiseManager';
import { buildGmProfile } from './gmIdentity';
import {
  createFarmAuctionSessionId,
  getAuctionSession,
  getAuctionSessionById,
  getLeagueTemplate,
  getTeam,
  type LeagueTemplate,
} from './leagueBuilderStorage';
import { computeDraftFreeze } from '../engines/draftFreeze';
import { FRANCHISE_PROFILE_GRADES } from './franchisePlayerProfileEdit';
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
  getFranchisePlayer,
  saveFranchisePlayer,
  saveFranchiseTeam,
  type Player,
  type Team,
} from './franchisePlayerStorage';
import {
  generateHiddenPersonalityModifiers,
} from './prospectScoutingDraftEngine';
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
import { buildDraftFreezeInputs } from './draftFreezeInputs';
import {
  carryOverFranchiseFarmRecordsToSeason,
  deleteFranchiseFarmRecordsForSeason,
  getFranchiseFarmRoster,
} from './franchiseFarmStorage';
import { seedFranchiseMoraleBaseline } from './franchiseMoraleState';

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

export interface FranchiseHiddenModifierBackfillResult {
  players: Player[];
  backfilledCount: number;
}

export interface TeamCaptainAssignment {
  teamId: string;
  captainPlayerId: string | null;
}

export interface TeamFanHopefulAssignment {
  teamId: string;
  fanHopefulPlayerId: string | null;
}

function isMlbPlayerForTeam(player: Player, teamId: string): boolean {
  return player.leagueAssignments?.some(
    (assignment) =>
      assignment.teamId === teamId &&
      assignment.rosterStatus === 'MLB',
  ) ?? false;
}

export async function generateFranchiseHiddenModifierBackfill(
  franchiseId: string,
): Promise<FranchiseHiddenModifierBackfillResult> {
  const players = await getAllFranchisePlayers(franchiseId);
  const updatedPlayers: Player[] = [];
  let backfilledCount = 0;

  for (const player of players) {
    if (player.hiddenPersonalityModifiers) {
      updatedPlayers.push(player);
      continue;
    }

    const updatedPlayer = await saveFranchisePlayer(franchiseId, {
      ...player,
      hiddenPersonalityModifiers: generateHiddenPersonalityModifiers(player.id),
    });
    updatedPlayers.push(updatedPlayer);
    backfilledCount += 1;
  }

  return {
    players: updatedPlayers,
    backfilledCount,
  };
}

export function computeTeamCaptains(
  teams: Team[],
  players: Player[],
): TeamCaptainAssignment[] {
  return teams.map((team) => {
    const captain = players
      .filter((player) => {
        const modifiers = player.hiddenPersonalityModifiers;
        return (
          modifiers !== undefined &&
          isMlbPlayerForTeam(player, team.id)
        );
      })
      .sort((left, right) => {
        const leftModifiers = left.hiddenPersonalityModifiers!;
        const rightModifiers = right.hiddenPersonalityModifiers!;
        const leftScore = leftModifiers.loyalty + leftModifiers.charisma;
        const rightScore = rightModifiers.loyalty + rightModifiers.charisma;
        if (rightScore !== leftScore) return rightScore - leftScore;
        if (rightModifiers.charisma !== leftModifiers.charisma) {
          return rightModifiers.charisma - leftModifiers.charisma;
        }
        return left.id.localeCompare(right.id);
      })[0];

    return {
      teamId: team.id,
      captainPlayerId: captain?.id ?? null,
    };
  });
}

export async function assignTeamCaptains(
  franchiseId: string,
  teams?: Team[],
  players?: Player[],
): Promise<TeamCaptainAssignment[]> {
  const [resolvedTeams, resolvedPlayers] = await Promise.all([
    teams ? Promise.resolve(teams) : getAllFranchiseTeams(franchiseId),
    players ? Promise.resolve(players) : getAllFranchisePlayers(franchiseId),
  ]);
  const assignments = computeTeamCaptains(resolvedTeams, resolvedPlayers);

  for (const assignment of assignments) {
    const team = resolvedTeams.find((candidate) => candidate.id === assignment.teamId);
    if (!team) continue;

    if (assignment.captainPlayerId === null) {
      console.warn(
        `[franchiseInitializer] No eligible Team Captain found for team ${team.id}; captainPlayerId set to null.`,
      );
    }

    await saveFranchiseTeam(franchiseId, {
      ...team,
      captainPlayerId: assignment.captainPlayerId,
    });
  }

  return assignments;
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomUnit(seed: string): number {
  return hashString(seed) / 0xffffffff;
}

function scoutedGradeRank(grade: unknown): number {
  const normalized = String(grade ?? '').toUpperCase();
  const index = FRANCHISE_PROFILE_GRADES.indexOf(normalized as (typeof FRANCHISE_PROFILE_GRADES)[number]);
  return index >= 0 ? index : Number.POSITIVE_INFINITY;
}

function getVisibleScoutedGrade(player: Player): unknown {
  return (player as { prospectProfile?: { scoutedGrade?: unknown } }).prospectProfile?.scoutedGrade;
}

export function computeTeamFanHopefuls(
  teams: Team[],
  players: Player[],
  farmPlayerIdsByTeamId: Map<string, string[]>,
  seasonId: string,
): TeamFanHopefulAssignment[] {
  const playersById = new Map(players.map((player) => [player.id, player]));

  return teams.map((team) => {
    const topProspects = (farmPlayerIdsByTeamId.get(team.id) ?? [])
      .map((playerId) => playersById.get(playerId))
      .filter((player): player is Player => Boolean(player))
      .map((player) => ({
        player,
        scoutedGrade: getVisibleScoutedGrade(player),
      }))
      .filter(({ scoutedGrade }) => Number.isFinite(scoutedGradeRank(scoutedGrade)))
      .sort((left, right) => {
        const gradeDiff = scoutedGradeRank(left.scoutedGrade) - scoutedGradeRank(right.scoutedGrade);
        if (gradeDiff !== 0) return gradeDiff;
        return left.player.id.localeCompare(right.player.id);
      })
      .slice(0, 3);

    const selectedIndex = topProspects.length > 0
      ? Math.min(
        topProspects.length - 1,
        Math.floor(randomUnit(`${team.id}:${seasonId}:fan-hopeful`) * topProspects.length),
      )
      : -1;

    return {
      teamId: team.id,
      fanHopefulPlayerId: selectedIndex >= 0 ? topProspects[selectedIndex].player.id : null,
    };
  });
}

export async function assignTeamFanHopefuls(
  franchiseId: string,
  seasonId: string,
  teams?: Team[],
  players?: Player[],
): Promise<TeamFanHopefulAssignment[]> {
  const [resolvedTeams, resolvedPlayers] = await Promise.all([
    teams ? Promise.resolve(teams) : getAllFranchiseTeams(franchiseId),
    players ? Promise.resolve(players) : getAllFranchisePlayers(franchiseId),
  ]);
  const farmRosterEntries = await Promise.all(
    resolvedTeams.map(async (team) => [
      team.id,
      (await getFranchiseFarmRoster(franchiseId, seasonId, team.id)).map((record) => record.playerId),
    ] as const),
  );
  const assignments = computeTeamFanHopefuls(
    resolvedTeams,
    resolvedPlayers,
    new Map(farmRosterEntries),
    seasonId,
  );

  for (const assignment of assignments) {
    const team = resolvedTeams.find((candidate) => candidate.id === assignment.teamId);
    if (!team) continue;

    if (assignment.fanHopefulPlayerId === null) {
      console.warn(
        `[franchiseInitializer] No eligible Fan Hopeful found for team ${team.id}; fanHopefulPlayerId set to null.`,
      );
    }

    await saveFranchiseTeam(franchiseId, {
      ...team,
      fanHopefulPlayerId: assignment.fanHopefulPlayerId,
    });
  }

  return assignments;
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
  // X1/X2: config-sourced per-team season length; never derived from schedule row count.
  gamesPerTeam: number | null,
  checkpointCadence: CheckpointCadence = CHECKPOINT_CADENCE_DEFAULT,
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
      gamesPerTeam,
      checkpointCadence,
    );
    return { metadata, created: true, updated: false };
  }

  // X2: repair/heal only fills missing metadata; existing non-null snapshots remain canonical.
  const shouldBackfillGamesPerTeam = gamesPerTeam !== null && existing.gamesPerTeam === null;
  if (
    existing.seasonNumber !== seasonNumber ||
    existing.seasonName !== seasonName ||
    existing.totalGames !== totalGames ||
    shouldBackfillGamesPerTeam
  ) {
    const updated = await saveSeasonMetadata({
      ...existing,
      seasonNumber,
      seasonName,
      totalGames,
      gamesPerTeam: shouldBackfillGamesPerTeam ? gamesPerTeam : existing.gamesPerTeam,
    });
    return { metadata: updated, created: false, updated: true };
  }

  return { metadata: existing, created: false, updated: false };
}

async function createFranchiseSeasonMetadata(
  franchiseId: string,
  seasonNumber: number,
  totalGames: number,
  gamesPerTeam: number | null,
  checkpointCadence: CheckpointCadence = CHECKPOINT_CADENCE_DEFAULT,
): Promise<void> {
  await ensureFranchiseSeasonMetadata(franchiseId, seasonNumber, totalGames, gamesPerTeam, checkpointCadence);
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
  let checkpointCadence: CheckpointCadence = CHECKPOINT_CADENCE_DEFAULT;

  if (rosterBackfilled) {
    if (!config.league) {
      throw new Error(`No league ID in franchise config for ${franchiseId}`);
    }
    const { leagueTemplate } = await loadScheduleTeamsForLeague(
      config.league,
      'Need at least 2 teams to repair franchise persistence',
    );
    checkpointCadence = normalizeCheckpointCadence(leagueTemplate.checkpointCadence);
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
    config.season?.gamesPerTeam ?? null,
    checkpointCadence,
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
    const gmProfile = buildGmProfile({
      franchiseId,
      controlledTeamId,
      gmName: config.gmName,
    });

    // 5. Update franchise metadata with enhanced fields
    await updateFranchiseMetadata(franchiseId, {
      leagueName: leagueTemplate.name || config.leagueDetails?.name || 'League',
      leagueId: config.league,
      controlledTeamId,
      controlledTeamName,
      gmName: gmProfile.displayName,
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
      gm: gmProfile,
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

    // 8. Backfill hidden modifiers and assign season-start team roles before season state exists.
    const hiddenModifierBackfill = await generateFranchiseHiddenModifierBackfill(franchiseId);
    const initialSeasonId = getFranchiseSeasonId(franchiseId, 1);
    await assignTeamCaptains(franchiseId, undefined, hiddenModifierBackfill.players);
    await assignTeamFanHopefuls(franchiseId, initialSeasonId, undefined, hiddenModifierBackfill.players);

    // RB-7b §10 payoff: draft-derived morale baselines override neutral-50 defaults.
    const mlbSession = await getAuctionSession(config.league, 1);
    if (mlbSession?.session) {
      const farmSession = await getAuctionSessionById(createFarmAuctionSessionId(config.league, 1));
      const neutralModifiers = {
        loyalty: 50,
        ambition: 50,
        resilience: 50,
        charisma: 50,
      };
      const metaByPlayerId = new Map(hiddenModifierBackfill.players.map((player) => [
        player.id,
        {
          personality: player.personality,
          modifiers: player.hiddenPersonalityModifiers ?? neutralModifiers,
        },
      ]));
      const inputs = buildDraftFreezeInputs({
        mlbSession: mlbSession.session,
        farmSession: farmSession?.session ?? null,
        metaByPlayerId,
      });
      const freeze = computeDraftFreeze(inputs);
      const scope = {
        franchiseId,
        seasonId: initialSeasonId,
        statsScopeId: initialSeasonId,
        seasonNumber: 1,
      };

      for (const player of freeze.players) {
        const existing = await getFranchisePlayer(franchiseId, player.playerId);
        if (!existing) continue; // farm prospects live in the farm store (D-7c-1) — skip
        if (existing.settledSalary === player.settledSalary) continue; // idempotent / re-init safe
        await saveFranchisePlayer(franchiseId, { ...existing, settledSalary: player.settledSalary });
      }

      for (const player of freeze.players) {
        await seedFranchiseMoraleBaseline({
          ...scope,
          targetType: 'player',
          playerId: player.playerId,
          value: player.startingMorale,
        });
      }
      for (const team of freeze.teams) {
        await seedFranchiseMoraleBaseline({
          ...scope,
          targetType: 'team-fan',
          teamId: team.teamId,
          value: team.startingFanMorale,
        });
      }
    }

    // 9. Create the season metadata record franchise mode reads later.
    await createFranchiseSeasonMetadata(
      franchiseId,
      1,
      0,
      config.season.gamesPerTeam,
      normalizeCheckpointCadence(leagueTemplate.checkpointCadence),
    );

    // 10. Set as active franchise
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
  await createFranchiseSeasonMetadata(franchiseId, newSeasonNumber, 0, null);

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

  await assignTeamFanHopefuls(
    franchiseId,
    getFranchiseSeasonId(franchiseId, newSeasonNumber),
    franchiseTeams,
  );

  return 0;
}
