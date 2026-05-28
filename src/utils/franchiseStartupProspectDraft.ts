import {
  deletePlayer,
  getAllPlayers,
  getLeagueTemplate,
  getTeamRoster,
  savePlayer,
  saveTeamRoster,
  type Chemistry,
  type DepthChart,
  type Grade,
  type Personality,
  type PitchType,
  type Player,
  type Position,
  type TeamRoster,
} from './leagueBuilderStorage';
import {
  generateProspectScoutingDraft,
  PROSPECT_SCOUTING_DRAFT_ENGINE_VERSION,
  type LeagueBuilderProspectPlayerDto,
  type ProspectDraftPick as EngineProspectDraftPick,
  type ProspectScoutDescriptor,
  type ScoutSpecialty,
  type VisibleSafeProspectReport,
} from './prospectScoutingDraftEngine';

export const STARTUP_PROSPECT_DRAFT_VERSION = 'startup-prospect-draft-v1-auto-snake';

const FARM_TARGET_SIZE = 10;

export interface StartupProspectDraftOptions {
  rounds?: number;
  seasonNumber?: number;
  seed?: string;
}

export interface StartupProspectDraftPick {
  round: number;
  pickNumber: number;
  teamId: string;
  playerId: string;
  playerName: string;
  position: Position;
  trueGrade: Grade;
  scoutedGrade: Grade;
  potentialGrade: Grade;
  salary: number;
}

export interface StartupProspectDraftVisibleReport extends VisibleSafeProspectReport {
  scoutId?: string;
  scoutName?: string;
  scoutSpecialtiesVisible: ScoutSpecialty[];
  scoutWeaknessesVisible: ScoutSpecialty[];
}

export interface StartupProspectDraftReport {
  methodVersion: typeof STARTUP_PROSPECT_DRAFT_VERSION;
  engineMethodVersion: typeof PROSPECT_SCOUTING_DRAFT_ENGINE_VERSION;
  bridgeMethodVersion: typeof STARTUP_PROSPECT_DRAFT_VERSION;
  bridgeRepairApplied: boolean;
  seed: string;
  leagueId: string;
  rounds: number;
  totalVacancies: number;
  picks: StartupProspectDraftPick[];
  teamFarmCounts: Record<string, { before: number; after: number; added: number }>;
  valid: boolean;
  issues: string[];
  visibleReports: StartupProspectDraftVisibleReport[];
  engineWarnings: string[];
  engineLimitations: string[];
}

export interface StartupProspectDraftRollbackReport {
  attemptedPlayerIds: string[];
  restoredTeamIds: string[];
  errors: string[];
  valid: boolean;
}

interface DraftTeamState {
  teamId: string;
  existingRoster: TeamRoster;
  nextRoster: TeamRoster;
  existingFarmIds: string[];
  vacancies: number;
  payroll: number;
  picks: StartupProspectDraftPick[];
}

type BridgeProspectPlayer = Omit<Player, 'id' | 'createdDate' | 'lastModified'> & {
  id?: string;
  prospectProfile?: LeagueBuilderProspectPlayerDto['prospectProfile'];
  hiddenPersonalityModifiers?: LeagueBuilderProspectPlayerDto['hiddenPersonalityModifiers'];
};

function getTeamPayroll(teamId: string, leagueId: string, players: Player[]): number {
  return players.reduce((sum, player) => {
    const assignment = player.leagueAssignments?.find((candidate) =>
      candidate.leagueId === leagueId &&
      candidate.teamId === teamId &&
      candidate.rosterStatus === 'MLB',
    );
    return assignment ? sum + (Number(player.salary) || 0) : sum;
  }, 0);
}

function hasAssignment(player: Player, leagueId: string, teamId: string, rosterStatus: 'MLB' | 'FARM'): boolean {
  return Boolean(player.leagueAssignments?.some((candidate) =>
    candidate.leagueId === leagueId &&
    candidate.teamId === teamId &&
    candidate.rosterStatus === rosterStatus,
  ));
}

function uniqueSorted(ids: string[]): string[] {
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

function sameIdSet(left: string[], right: string[]): boolean {
  const sortedLeft = uniqueSorted(left);
  const sortedRight = uniqueSorted(right);
  return sortedLeft.length === sortedRight.length &&
    sortedLeft.every((id, index) => id === sortedRight[index]);
}

function cloneRoster(roster: TeamRoster): TeamRoster {
  const depthChart: DepthChart = {
    C: [...roster.depthChart.C],
    '1B': [...roster.depthChart['1B']],
    '2B': [...roster.depthChart['2B']],
    SS: [...roster.depthChart.SS],
    '3B': [...roster.depthChart['3B']],
    LF: [...roster.depthChart.LF],
    CF: [...roster.depthChart.CF],
    RF: [...roster.depthChart.RF],
    DH: [...roster.depthChart.DH],
    SP: [...roster.depthChart.SP],
    RP: [...roster.depthChart.RP],
    CP: [...roster.depthChart.CP],
  };

  return {
    ...roster,
    mlbRoster: [...roster.mlbRoster],
    farmRoster: [...roster.farmRoster],
    lineupWithDH: [...roster.lineupWithDH],
    lineupWithoutDH: [...roster.lineupWithoutDH],
    startingRotation: [...roster.startingRotation],
    longRelievers: [...roster.longRelievers],
    setupPitchers: [...roster.setupPitchers],
    depthChart,
    pinchHitOrder: [...roster.pinchHitOrder],
    pinchRunOrder: [...roster.pinchRunOrder],
    defensiveSubOrder: [...roster.defensiveSubOrder],
  };
}

function buildReport(input: {
  leagueId: string;
  rounds: number;
  totalVacancies: number;
  seed: string;
  picks?: StartupProspectDraftPick[];
  teamFarmCounts: StartupProspectDraftReport['teamFarmCounts'];
  valid: boolean;
  issues?: string[];
  bridgeRepairApplied?: boolean;
  visibleReports?: StartupProspectDraftVisibleReport[];
  engineWarnings?: string[];
  engineLimitations?: string[];
}): StartupProspectDraftReport {
  return {
    methodVersion: STARTUP_PROSPECT_DRAFT_VERSION,
    bridgeMethodVersion: STARTUP_PROSPECT_DRAFT_VERSION,
    engineMethodVersion: PROSPECT_SCOUTING_DRAFT_ENGINE_VERSION,
    bridgeRepairApplied: input.bridgeRepairApplied === true,
    seed: input.seed,
    leagueId: input.leagueId,
    rounds: input.rounds,
    totalVacancies: input.totalVacancies,
    picks: input.picks ?? [],
    teamFarmCounts: input.teamFarmCounts,
    valid: input.valid,
    issues: input.issues ?? [],
    visibleReports: input.visibleReports ?? [],
    engineWarnings: input.engineWarnings ?? [],
    engineLimitations: input.engineLimitations ?? [],
  };
}

function buildBridgeScoutDescriptors(teamStates: DraftTeamState[]): Record<string, ProspectScoutDescriptor> {
  const scoutProfiles: Array<{
    specialties: ScoutSpecialty[];
    weaknesses: ScoutSpecialty[];
    accuracyModifier: number;
  }> = [
    { specialties: ['pitching', 'SP'], weaknesses: ['CF'], accuracyModifier: 0 },
    { specialties: ['outfield', 'speed'], weaknesses: ['CP'], accuracyModifier: 0 },
    { specialties: ['infield', 'contact'], weaknesses: ['LF'], accuracyModifier: 0 },
    { specialties: ['catching', 'defense'], weaknesses: ['1B'], accuracyModifier: 0 },
  ];

  return Object.fromEntries(teamStates.map((teamState, index) => {
    const profile = scoutProfiles[index % scoutProfiles.length];
    return [
      teamState.teamId,
      {
        scoutId: `bridge-scout-${teamState.teamId}`,
        scoutName: `Franchise Setup Bridge Scout ${index + 1}`,
        specialties: profile.specialties,
        weaknesses: profile.weaknesses,
        accuracyModifier: profile.accuracyModifier,
      },
    ];
  }));
}

function selectBridgePicks(
  enginePicks: EngineProspectDraftPick[],
  teamStates: DraftTeamState[],
  totalVacancies: number,
): EngineProspectDraftPick[] {
  const remainingByTeamId = new Map(teamStates.map((teamState) => [teamState.teamId, teamState.vacancies]));
  const selected: EngineProspectDraftPick[] = [];

  for (const pick of enginePicks) {
    const remaining = remainingByTeamId.get(pick.teamId) ?? 0;
    if (remaining <= 0) continue;
    selected.push(pick);
    remainingByTeamId.set(pick.teamId, remaining - 1);
    if (selected.length === totalVacancies) break;
  }

  return selected;
}

function toBridgeProspectPlayer(player: LeagueBuilderProspectPlayerDto): BridgeProspectPlayer {
  return {
    ...player,
    primaryPosition: player.primaryPosition as Position,
    secondaryPosition: player.secondaryPosition as Position | undefined,
    arsenal: player.arsenal as PitchType[],
    overallGrade: player.overallGrade as Grade,
    personality: player.personality as Personality,
    chemistry: player.chemistry as Chemistry,
    sourceDatabase: 'startup-prospect-draft',
  };
}

function visibleReportFromPick(pick: EngineProspectDraftPick): StartupProspectDraftVisibleReport {
  return {
    ...pick.visibleReport,
    position: pick.visibleReport.position,
    scoutedGrade: pick.visibleReport.scoutedGrade,
    potentialGrade: pick.visibleReport.potentialGrade,
    scoutId: pick.player.prospectProfile.scoutId,
    scoutName: pick.player.prospectProfile.scoutName,
    scoutSpecialtiesVisible: [...pick.player.prospectProfile.scoutSpecialtiesVisible],
    scoutWeaknessesVisible: [...pick.player.prospectProfile.scoutWeaknessesVisible],
  };
}

export async function runStartupProspectDraftForLeague(
  leagueId: string,
  options: StartupProspectDraftOptions = {},
): Promise<StartupProspectDraftReport> {
  const league = await getLeagueTemplate(leagueId);
  if (!league) {
    throw new Error(`League template "${leagueId}" not found`);
  }

  const rounds = options.rounds ?? FARM_TARGET_SIZE;
  const seasonNumber = options.seasonNumber ?? 1;
  const allPlayers = await getAllPlayers();
  const existingPlayerIds = new Set(allPlayers.map((player) => player.id));
  const teamStates: DraftTeamState[] = [];
  const teamFarmCounts: StartupProspectDraftReport['teamFarmCounts'] = {};
  const preflightIssues: string[] = [];
  const defaultSeed = `${STARTUP_PROSPECT_DRAFT_VERSION}:${leagueId}:${seasonNumber}`;
  const seed = options.seed ?? defaultSeed;

  for (const teamId of league.teamIds) {
    const existingRoster = await getTeamRoster(teamId);
    if (!existingRoster) {
      preflightIssues.push(`Team "${teamId}" is missing a League Builder roster.`);
      teamFarmCounts[teamId] = { before: 0, after: 0, added: 0 };
      continue;
    }

    const assignedFarmIds = uniqueSorted(allPlayers
      .filter((player) => hasAssignment(player, leagueId, teamId, 'FARM'))
      .map((player) => player.id));
    const assignedMlbIds = uniqueSorted(allPlayers
      .filter((player) => hasAssignment(player, leagueId, teamId, 'MLB'))
      .map((player) => player.id));
    const rosterFarmIds = uniqueSorted(existingRoster.farmRoster);

    if (rosterFarmIds.length !== existingRoster.farmRoster.length) {
      preflightIssues.push(`Team "${teamId}" FARM roster contains duplicate player ids.`);
    }
    if (!sameIdSet(rosterFarmIds, assignedFarmIds)) {
      preflightIssues.push(`Team "${teamId}" FARM roster does not match player FARM assignments.`);
    }
    if (assignedFarmIds.length > FARM_TARGET_SIZE) {
      preflightIssues.push(`Team "${teamId}" already has ${assignedFarmIds.length} FARM assignments; expected at most ${FARM_TARGET_SIZE}.`);
    }
    if (assignedMlbIds.length !== 22) {
      preflightIssues.push(`Team "${teamId}" has ${assignedMlbIds.length} MLB assignments; expected 22 before startup prospect draft.`);
    }

    const nextRoster = cloneRoster(existingRoster);
    const vacancies = Math.max(0, FARM_TARGET_SIZE - assignedFarmIds.length);
    teamFarmCounts[teamId] = {
      before: assignedFarmIds.length,
      after: assignedFarmIds.length,
      added: 0,
    };
    teamStates.push({
      teamId,
      existingRoster,
      nextRoster,
      existingFarmIds: assignedFarmIds,
      vacancies,
      payroll: getTeamPayroll(teamId, leagueId, allPlayers),
      picks: [],
    });
  }

  if (preflightIssues.length > 0) {
    return buildReport({
      leagueId,
      rounds,
      totalVacancies: 0,
      seed,
      teamFarmCounts,
      valid: false,
      issues: preflightIssues,
    });
  }

  const totalVacancies = teamStates.reduce((sum, team) => sum + team.vacancies, 0);
  if (totalVacancies === 0) {
    return buildReport({
      leagueId,
      rounds,
      totalVacancies,
      seed,
      teamFarmCounts,
      valid: true,
      engineLimitations: ['Bridge no-op; shared engine was not invoked because all FARM rosters were already prepared.'],
    });
  }

  const baseOrder = [...teamStates].sort((a, b) => {
    const payrollDiff = a.payroll - b.payroll;
    if (payrollDiff !== 0) return payrollDiff;
    return a.teamId.localeCompare(b.teamId);
  });
  const preflightTeamPickCounts = new Map<string, number>();
  for (let round = 1; round <= rounds; round += 1) {
    const roundOrder = round % 2 === 1 ? baseOrder : [...baseOrder].reverse();
    for (const teamState of roundOrder) {
      const currentCount = preflightTeamPickCounts.get(teamState.teamId) ?? 0;
      if (currentCount >= teamState.vacancies) continue;
      preflightTeamPickCounts.set(teamState.teamId, currentCount + 1);
    }
  }
  const preflightFilledVacancies = Array.from(preflightTeamPickCounts.values()).reduce((sum, count) => sum + count, 0);
  if (preflightFilledVacancies < totalVacancies) {
    return buildReport({
      leagueId,
      rounds,
      totalVacancies,
      seed,
      teamFarmCounts,
      valid: false,
      issues: [`Startup prospect draft needs ${totalVacancies} picks but ${rounds} rounds can only fill ${preflightFilledVacancies}.`],
    });
  }

  const engineOutput = generateProspectScoutingDraft({
    leagueId,
    seasonNumber,
    teamDraftOrder: baseOrder.map((teamState) => ({ teamId: teamState.teamId })),
    rounds,
    seed,
    scoutsByTeamId: buildBridgeScoutDescriptors(baseOrder),
    existingPlayerIds: [],
    existingTeamIds: league.teamIds,
    candidatePoolMultiplier: 3,
  });
  const selectedEnginePicks = selectBridgePicks(engineOutput.selectedPicks, teamStates, totalVacancies);
  if (selectedEnginePicks.length < totalVacancies) {
    return buildReport({
      leagueId,
      rounds,
      totalVacancies,
      seed,
      teamFarmCounts,
      valid: false,
      issues: [`Startup prospect draft filled ${selectedEnginePicks.length} of ${totalVacancies} farm vacancies.`],
      engineWarnings: engineOutput.warnings,
      engineLimitations: engineOutput.limitations,
    });
  }

  const collidingPick = selectedEnginePicks.find((pick) => existingPlayerIds.has(pick.playerId));
  if (collidingPick) {
    return buildReport({
      leagueId,
      rounds,
      totalVacancies,
      seed,
      teamFarmCounts,
      valid: false,
      issues: [`Generated prospect id "${collidingPick.playerId}" already exists.`],
      engineWarnings: engineOutput.warnings,
      engineLimitations: engineOutput.limitations,
    });
  }

  const teamStateById = new Map(teamStates.map((teamState) => [teamState.teamId, teamState]));
  const createdPlayerIds: string[] = [];
  const touchedTeams = new Set<string>();
  const picks: StartupProspectDraftPick[] = [];
  const visibleReports: StartupProspectDraftVisibleReport[] = [];

  try {
    for (const enginePick of selectedEnginePicks) {
      const teamState = teamStateById.get(enginePick.teamId);
      if (!teamState) continue;
      const savedPlayer = await savePlayer(toBridgeProspectPlayer(enginePick.player));
      createdPlayerIds.push(savedPlayer.id);
      teamState.nextRoster.farmRoster.push(savedPlayer.id);
      touchedTeams.add(teamState.teamId);

      const pick: StartupProspectDraftPick = {
        round: enginePick.round,
        pickNumber: enginePick.pickNumber,
        teamId: teamState.teamId,
        playerId: savedPlayer.id,
        playerName: `${savedPlayer.firstName} ${savedPlayer.lastName}`,
        position: savedPlayer.primaryPosition,
        trueGrade: enginePick.trueGrade as Grade,
        scoutedGrade: enginePick.scoutedGrade as Grade,
        potentialGrade: enginePick.potentialGrade as Grade,
        salary: savedPlayer.salary,
      };
      teamState.picks.push(pick);
      picks.push(pick);
      visibleReports.push(visibleReportFromPick(enginePick));
    }

    for (const teamState of teamStates) {
      if (!touchedTeams.has(teamState.teamId)) continue;
      await saveTeamRoster(teamState.nextRoster);
      teamFarmCounts[teamState.teamId] = {
        before: teamState.existingFarmIds.length,
        after: teamState.nextRoster.farmRoster.length,
        added: teamState.nextRoster.farmRoster.length - teamState.existingFarmIds.length,
      };
    }
  } catch (error) {
    const rollbackErrors: string[] = [];
    for (const teamState of teamStates) {
      if (!touchedTeams.has(teamState.teamId)) continue;
      try {
        await saveTeamRoster(teamState.existingRoster);
      } catch (rollbackError) {
        rollbackErrors.push(`Failed to restore roster for "${teamState.teamId}": ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
      }
    }
    for (const playerId of createdPlayerIds) {
      try {
        await deletePlayer(playerId);
      } catch (rollbackError) {
        rollbackErrors.push(`Failed to delete generated prospect "${playerId}": ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
      }
    }
    if (rollbackErrors.length > 0) {
      throw new Error(`${error instanceof Error ? error.message : String(error)} Rollback issues: ${rollbackErrors.join('; ')}`);
    }
    throw error;
  }

  const issues = picks.length !== totalVacancies
    ? [`Startup prospect draft filled ${picks.length} of ${totalVacancies} farm vacancies.`]
    : [];

  return buildReport({
    leagueId,
    rounds,
    totalVacancies,
    seed,
    picks,
    teamFarmCounts,
    valid: issues.length === 0,
    issues,
    bridgeRepairApplied: picks.length > 0,
    visibleReports,
    engineWarnings: engineOutput.warnings,
    engineLimitations: engineOutput.limitations,
  });
}

export async function rollbackStartupProspectDraftForLeague(
  _leagueId: string,
  report: Pick<StartupProspectDraftReport, 'picks'>,
): Promise<StartupProspectDraftRollbackReport> {
  const attemptedPlayerIds = uniqueSorted(report.picks.map((pick) => pick.playerId));
  const affectedTeamIds = uniqueSorted(report.picks.map((pick) => pick.teamId));
  const errors: string[] = [];
  const restoredTeamIds: string[] = [];

  for (const teamId of affectedTeamIds) {
    try {
      const roster = await getTeamRoster(teamId);
      if (!roster) continue;
      await saveTeamRoster({
        ...cloneRoster(roster),
        farmRoster: roster.farmRoster.filter((playerId) => !attemptedPlayerIds.includes(playerId)),
      });
      restoredTeamIds.push(teamId);
    } catch (error) {
      errors.push(`Failed to remove startup prospects from roster "${teamId}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  for (const playerId of attemptedPlayerIds) {
    try {
      await deletePlayer(playerId);
    } catch (error) {
      errors.push(`Failed to delete startup prospect "${playerId}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    attemptedPlayerIds,
    restoredTeamIds,
    errors,
    valid: errors.length === 0,
  };
}
