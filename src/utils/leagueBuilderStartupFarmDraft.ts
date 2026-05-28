import {
  deletePlayer,
  getAllPlayers,
  getAllTeams,
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
  type Team,
  type TeamRoster,
} from './leagueBuilderStorage';
import {
  generateProspectScoutingDraft,
  PROSPECT_SCOUTING_DRAFT_ENGINE_VERSION,
  type LeagueBuilderProspectPlayerDto,
  type ProspectDraftPick,
  type ProspectScoutDescriptor,
  type ScoutSpecialty,
  type VisibleSafeProspectReport,
} from './prospectScoutingDraftEngine';

export const LEAGUE_BUILDER_STARTUP_FARM_DRAFT_VERSION =
  'league-builder-startup-farm-draft-v1';

export const STARTUP_FARM_TARGET_SIZE = 10;
export const STARTUP_MLB_REQUIRED_SIZE = 22;

export interface StartupFarmDraftTeamStatus {
  teamId: string;
  teamName: string;
  farmCount: number;
  mlbCount: number;
  missingFarm: number;
  prepared: boolean;
}

export interface StartupFarmDraftVisibleReport extends VisibleSafeProspectReport {
  teamId: string;
  round: number;
  pickNumber: number;
  scoutId?: string;
  scoutName?: string;
  scoutSpecialtiesVisible: ScoutSpecialty[];
  scoutWeaknessesVisible: ScoutSpecialty[];
}

export interface LeagueBuilderStartupFarmDraftPreview {
  workflowVersion: typeof LEAGUE_BUILDER_STARTUP_FARM_DRAFT_VERSION;
  engineMethodVersion: typeof PROSPECT_SCOUTING_DRAFT_ENGINE_VERSION;
  leagueId: string;
  seasonNumber: number;
  rounds: number;
  seed: string;
  valid: boolean;
  prepared: boolean;
  totalVacancies: number;
  blockers: string[];
  warnings: string[];
  limitations: string[];
  teams: StartupFarmDraftTeamStatus[];
  selectedPicks: ProspectDraftPick[];
  visibleReports: StartupFarmDraftVisibleReport[];
}

export interface ApplyStartupFarmDraftReport {
  workflowVersion: typeof LEAGUE_BUILDER_STARTUP_FARM_DRAFT_VERSION;
  leagueId: string;
  valid: boolean;
  applied: boolean;
  createdPlayerIds: string[];
  updatedTeamIds: string[];
  issues: string[];
  rollbackErrors: string[];
}

interface DraftTeamState {
  team: Team;
  roster: TeamRoster;
  farmIds: string[];
  mlbIds: string[];
  vacancies: number;
  payroll: number;
}

interface StartupFarmDraftStorage {
  getAllPlayers: typeof getAllPlayers;
  getAllTeams: typeof getAllTeams;
  getLeagueTemplate: typeof getLeagueTemplate;
  getTeamRoster: typeof getTeamRoster;
  savePlayer: typeof savePlayer;
  saveTeamRoster: typeof saveTeamRoster;
  deletePlayer: typeof deletePlayer;
}

type StartupFarmDraftPlayer = Omit<Player, 'id' | 'createdDate' | 'lastModified'> & {
  id?: string;
  prospectProfile?: LeagueBuilderProspectPlayerDto['prospectProfile'];
  hiddenPersonalityModifiers?: LeagueBuilderProspectPlayerDto['hiddenPersonalityModifiers'];
};

const DEFAULT_STORAGE: StartupFarmDraftStorage = {
  getAllPlayers,
  getAllTeams,
  getLeagueTemplate,
  getTeamRoster,
  savePlayer,
  saveTeamRoster,
  deletePlayer,
};

function uniqueSorted(ids: string[]): string[] {
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

function sameIdSet(left: string[], right: string[]): boolean {
  const sortedLeft = uniqueSorted(left);
  const sortedRight = uniqueSorted(right);
  return sortedLeft.length === sortedRight.length &&
    sortedLeft.every((id, index) => id === sortedRight[index]);
}

function hasAssignment(player: Player, leagueId: string, teamId: string, rosterStatus: 'MLB' | 'FARM'): boolean {
  return Boolean(player.leagueAssignments?.some((assignment) =>
    assignment.leagueId === leagueId &&
    assignment.teamId === teamId &&
    assignment.rosterStatus === rosterStatus,
  ));
}

function getTeamPayroll(teamId: string, leagueId: string, players: Player[]): number {
  return players.reduce((sum, player) => (
    hasAssignment(player, leagueId, teamId, 'MLB') ? sum + (Number(player.salary) || 0) : sum
  ), 0);
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

function emptyPreview(input: {
  leagueId: string;
  seasonNumber: number;
  rounds: number;
  seed: string;
  blockers?: string[];
  warnings?: string[];
  limitations?: string[];
  teams?: StartupFarmDraftTeamStatus[];
  totalVacancies?: number;
  valid?: boolean;
  prepared?: boolean;
}): LeagueBuilderStartupFarmDraftPreview {
  return {
    workflowVersion: LEAGUE_BUILDER_STARTUP_FARM_DRAFT_VERSION,
    engineMethodVersion: PROSPECT_SCOUTING_DRAFT_ENGINE_VERSION,
    leagueId: input.leagueId,
    seasonNumber: input.seasonNumber,
    rounds: input.rounds,
    seed: input.seed,
    valid: input.valid ?? false,
    prepared: input.prepared ?? false,
    totalVacancies: input.totalVacancies ?? 0,
    blockers: input.blockers ?? [],
    warnings: input.warnings ?? [],
    limitations: input.limitations ?? [
      'Scout descriptors are draft-session only; durable scout profile management is deferred.',
      'Scouting output is intentionally imperfect and hidden ratings remain hidden until call-up/reveal.',
    ],
    teams: input.teams ?? [],
    selectedPicks: [],
    visibleReports: [],
  };
}

function buildScoutDescriptors(teamStates: DraftTeamState[]): Record<string, ProspectScoutDescriptor> {
  const profiles: Array<{
    specialties: ScoutSpecialty[];
    weaknesses: ScoutSpecialty[];
    accuracyModifier: number;
  }> = [
    { specialties: ['pitching', 'SP'], weaknesses: ['CF'], accuracyModifier: 0 },
    { specialties: ['outfield', 'speed'], weaknesses: ['CP'], accuracyModifier: 0 },
    { specialties: ['infield', 'contact'], weaknesses: ['LF'], accuracyModifier: 0 },
    { specialties: ['catching', 'defense'], weaknesses: ['1B'], accuracyModifier: 0 },
  ];

  return Object.fromEntries(teamStates.map((state, index) => {
    const profile = profiles[index % profiles.length];
    return [
      state.team.id,
      {
        scoutId: `startup-farm-scout-${state.team.id}`,
        scoutName: `Startup Farm Scout ${index + 1}`,
        specialties: profile.specialties,
        weaknesses: profile.weaknesses,
        accuracyModifier: profile.accuracyModifier,
      },
    ];
  }));
}

function selectVacancyPicks(
  picks: ProspectDraftPick[],
  teamStates: DraftTeamState[],
  totalVacancies: number,
): ProspectDraftPick[] {
  const remainingByTeamId = new Map(teamStates.map((state) => [state.team.id, state.vacancies]));
  const selected: ProspectDraftPick[] = [];

  for (const pick of picks) {
    const remaining = remainingByTeamId.get(pick.teamId) ?? 0;
    if (remaining <= 0) continue;
    selected.push(pick);
    remainingByTeamId.set(pick.teamId, remaining - 1);
    if (selected.length === totalVacancies) break;
  }

  return selected;
}

function visibleReportFromPick(pick: ProspectDraftPick): StartupFarmDraftVisibleReport {
  return {
    ...pick.visibleReport,
    teamId: pick.teamId,
    round: pick.round,
    pickNumber: pick.pickNumber,
    scoutId: pick.player.prospectProfile.scoutId,
    scoutName: pick.player.prospectProfile.scoutName,
    scoutSpecialtiesVisible: [...pick.player.prospectProfile.scoutSpecialtiesVisible],
    scoutWeaknessesVisible: [...pick.player.prospectProfile.scoutWeaknessesVisible],
  };
}

function toStoragePlayer(player: LeagueBuilderProspectPlayerDto): StartupFarmDraftPlayer {
  return {
    ...player,
    primaryPosition: player.primaryPosition as Position,
    secondaryPosition: player.secondaryPosition as Position | undefined,
    arsenal: player.arsenal as PitchType[],
    overallGrade: player.overallGrade as Grade,
    personality: player.personality as Personality,
    chemistry: player.chemistry as Chemistry,
  };
}

function pickSignature(picks: ProspectDraftPick[]): string {
  return picks
    .map((pick) => `${pick.teamId}:${pick.round}:${pick.pickNumber}:${pick.playerId}`)
    .join('|');
}

function selectedPickCountsByTeam(picks: ProspectDraftPick[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const pick of picks) {
    counts.set(pick.teamId, (counts.get(pick.teamId) ?? 0) + 1);
  }
  return counts;
}

async function validatePreviewStillCurrent(
  preview: LeagueBuilderStartupFarmDraftPreview,
  storage: StartupFarmDraftStorage,
): Promise<string[]> {
  const current = await createLeagueBuilderStartupFarmDraftPreview(preview.leagueId, {
    seasonNumber: preview.seasonNumber,
    rounds: preview.rounds,
    seed: preview.seed,
    storage,
  });
  if (current.blockers.length > 0 || !current.valid) {
    return [
      'Startup farm draft preview is stale; current League Builder state no longer passes draft validation.',
      ...current.blockers,
    ];
  }
  if (current.prepared) {
    return ['Startup farm draft preview is stale; selected league is already prepared.'];
  }
  if (current.totalVacancies !== preview.totalVacancies || current.totalVacancies !== preview.selectedPicks.length) {
    return [
      `Startup farm draft preview is stale; current vacancies are ${current.totalVacancies}, preview expected ${preview.selectedPicks.length}.`,
    ];
  }

  const expectedPicksByTeam = selectedPickCountsByTeam(preview.selectedPicks);
  for (const team of current.teams) {
    const expected = expectedPicksByTeam.get(team.teamId) ?? 0;
    if (team.missingFarm !== expected) {
      return [
        `Startup farm draft preview is stale; team "${team.teamName}" now needs ${team.missingFarm} FARM player(s), preview expected ${expected}.`,
      ];
    }
  }

  if (pickSignature(current.selectedPicks) !== pickSignature(preview.selectedPicks)) {
    return ['Startup farm draft preview is stale; deterministic pick identities changed.'];
  }

  return [];
}

export async function createLeagueBuilderStartupFarmDraftPreview(
  leagueId: string,
  options: {
    seasonNumber?: number;
    rounds?: number;
    seed?: string;
    storage?: Partial<StartupFarmDraftStorage>;
  } = {},
): Promise<LeagueBuilderStartupFarmDraftPreview> {
  const storage = { ...DEFAULT_STORAGE, ...options.storage };
  const seasonNumber = options.seasonNumber ?? 1;
  const rounds = options.rounds ?? STARTUP_FARM_TARGET_SIZE;
  const seed = options.seed ?? `${LEAGUE_BUILDER_STARTUP_FARM_DRAFT_VERSION}:${leagueId}:${seasonNumber}`;
  const league = await storage.getLeagueTemplate(leagueId);

  if (!league) {
    return emptyPreview({
      leagueId,
      seasonNumber,
      rounds,
      seed,
      blockers: [`League template "${leagueId}" not found.`],
    });
  }

  if (!league.teamIds?.length) {
    return emptyPreview({
      leagueId,
      seasonNumber,
      rounds,
      seed,
      blockers: ['Selected league has no teams.'],
    });
  }

  const [allPlayers, allTeams] = await Promise.all([
    storage.getAllPlayers(),
    storage.getAllTeams(),
  ]);
  const existingPlayerIds = new Set(allPlayers.map((player) => player.id));
  const teamStates: DraftTeamState[] = [];
  const teams: StartupFarmDraftTeamStatus[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];

  for (const teamId of league.teamIds) {
    const team = allTeams.find((candidate) => candidate.id === teamId);
    const roster = await storage.getTeamRoster(teamId);
    if (!team) {
      blockers.push(`Team "${teamId}" is missing from League Builder storage.`);
      continue;
    }
    if (!roster) {
      blockers.push(`${team.name}: missing League Builder roster.`);
      teams.push({
        teamId,
        teamName: team.name,
        farmCount: 0,
        mlbCount: 0,
        missingFarm: STARTUP_FARM_TARGET_SIZE,
        prepared: false,
      });
      continue;
    }

    const farmPlayers = allPlayers.filter((player) => hasAssignment(player, leagueId, teamId, 'FARM'));
    const mlbPlayers = allPlayers.filter((player) => hasAssignment(player, leagueId, teamId, 'MLB'));
    const farmIds = uniqueSorted(farmPlayers.map((player) => player.id));
    const mlbIds = uniqueSorted(mlbPlayers.map((player) => player.id));
    const rosterFarmIds = uniqueSorted(roster.farmRoster);
    const vacancies = Math.max(0, STARTUP_FARM_TARGET_SIZE - farmIds.length);

    teams.push({
      teamId,
      teamName: team.name,
      farmCount: farmIds.length,
      mlbCount: mlbIds.length,
      missingFarm: vacancies,
      prepared: farmIds.length === STARTUP_FARM_TARGET_SIZE,
    });

    if (rosterFarmIds.length !== roster.farmRoster.length) {
      blockers.push(`${team.name}: FARM roster contains duplicate player ids.`);
    }
    if (!sameIdSet(rosterFarmIds, farmIds)) {
      blockers.push(`${team.name}: FARM roster does not match player FARM assignments.`);
    }
    if (farmIds.length > STARTUP_FARM_TARGET_SIZE) {
      blockers.push(`${team.name}: FARM roster is over the startup limit (${farmIds.length}/${STARTUP_FARM_TARGET_SIZE}).`);
    }
    const revealedFarmCount = farmPlayers.filter((player) => player.ratingRevealState === 'revealed').length;
    if (revealedFarmCount > 0) {
      blockers.push(`${team.name}: ${revealedFarmCount} FARM player(s) have revealed ratings before call-up.`);
    }
    if (mlbIds.length !== STARTUP_MLB_REQUIRED_SIZE) {
      blockers.push(`${team.name}: expected ${STARTUP_MLB_REQUIRED_SIZE} MLB players before startup farm draft; found ${mlbIds.length}.`);
    }

    teamStates.push({
      team,
      roster,
      farmIds,
      mlbIds,
      vacancies,
      payroll: getTeamPayroll(teamId, leagueId, allPlayers),
    });
  }

  const totalVacancies = teamStates.reduce((sum, team) => sum + team.vacancies, 0);
  if (blockers.length > 0) {
    return emptyPreview({
      leagueId,
      seasonNumber,
      rounds,
      seed,
      blockers,
      warnings,
      teams,
      totalVacancies,
    });
  }

  if (totalVacancies === 0) {
    return emptyPreview({
      leagueId,
      seasonNumber,
      rounds,
      seed,
      teams,
      totalVacancies,
      valid: true,
      prepared: true,
      warnings,
    });
  }

  const baseOrder = [...teamStates].sort((a, b) => {
    const payrollDiff = a.payroll - b.payroll;
    if (payrollDiff !== 0) return payrollDiff;
    return a.team.id.localeCompare(b.team.id);
  });
  const preflightTeamPickCounts = new Map<string, number>();
  for (let round = 1; round <= rounds; round += 1) {
    const roundOrder = round % 2 === 1 ? baseOrder : [...baseOrder].reverse();
    for (const teamState of roundOrder) {
      const current = preflightTeamPickCounts.get(teamState.team.id) ?? 0;
      if (current >= teamState.vacancies) continue;
      preflightTeamPickCounts.set(teamState.team.id, current + 1);
    }
  }
  const filled = Array.from(preflightTeamPickCounts.values()).reduce((sum, count) => sum + count, 0);
  if (filled < totalVacancies) {
    return emptyPreview({
      leagueId,
      seasonNumber,
      rounds,
      seed,
      blockers: [`Startup farm draft needs ${totalVacancies} picks but ${rounds} rounds can only fill ${filled}.`],
      warnings,
      teams,
      totalVacancies,
    });
  }

  const draft = generateProspectScoutingDraft({
    leagueId,
    seasonNumber,
    teamDraftOrder: baseOrder.map((state) => ({ teamId: state.team.id, teamName: state.team.name })),
    rounds,
    seed,
    scoutsByTeamId: buildScoutDescriptors(baseOrder),
    existingPlayerIds: [],
    existingTeamIds: league.teamIds,
    candidatePoolMultiplier: 3,
  });
  const selectedPicks = selectVacancyPicks(draft.selectedPicks, teamStates, totalVacancies);
  const collidingPick = selectedPicks.find((pick) => existingPlayerIds.has(pick.playerId));
  if (collidingPick) {
    return emptyPreview({
      leagueId,
      seasonNumber,
      rounds,
      seed,
      blockers: [`Generated prospect id "${collidingPick.playerId}" already exists.`],
      warnings: draft.warnings,
      limitations: draft.limitations,
      teams,
      totalVacancies,
    });
  }

  return {
    workflowVersion: LEAGUE_BUILDER_STARTUP_FARM_DRAFT_VERSION,
    engineMethodVersion: draft.methodVersion,
    leagueId,
    seasonNumber,
    rounds,
    seed,
    valid: selectedPicks.length === totalVacancies,
    prepared: false,
    totalVacancies,
    blockers: selectedPicks.length === totalVacancies
      ? []
      : [`Startup farm draft filled ${selectedPicks.length} of ${totalVacancies} farm vacancies.`],
    warnings: draft.warnings,
    limitations: draft.limitations,
    teams,
    selectedPicks,
    visibleReports: selectedPicks.map(visibleReportFromPick),
  };
}

export async function applyLeagueBuilderStartupFarmDraft(
  preview: LeagueBuilderStartupFarmDraftPreview,
  options: { storage?: Partial<StartupFarmDraftStorage> } = {},
): Promise<ApplyStartupFarmDraftReport> {
  const storage = { ...DEFAULT_STORAGE, ...options.storage };
  const createdPlayerIds: string[] = [];
  const updatedTeamIds: string[] = [];
  const rollbackErrors: string[] = [];

  const baseReport: Pick<
    ApplyStartupFarmDraftReport,
    'workflowVersion' | 'leagueId' | 'createdPlayerIds' | 'updatedTeamIds' | 'rollbackErrors'
  > = {
    workflowVersion: LEAGUE_BUILDER_STARTUP_FARM_DRAFT_VERSION,
    leagueId: preview.leagueId,
    createdPlayerIds,
    updatedTeamIds,
    rollbackErrors,
  };

  if (!preview.valid || preview.prepared || preview.selectedPicks.length === 0) {
    return {
      ...baseReport,
      valid: false,
      applied: false,
      issues: preview.prepared
        ? ['Selected league is already prepared; no startup farm draft apply is required.']
        : preview.blockers.length > 0
          ? preview.blockers
          : ['No startup farm draft picks are available to apply.'],
    };
  }

  const stalePreviewIssues = await validatePreviewStillCurrent(preview, storage);
  if (stalePreviewIssues.length > 0) {
    return {
      ...baseReport,
      valid: false,
      applied: false,
      issues: stalePreviewIssues,
    };
  }

  const existingPlayers = await storage.getAllPlayers();
  const existingPlayerIds = new Set(existingPlayers.map((player) => player.id));
  const collision = preview.selectedPicks.find((pick) => existingPlayerIds.has(pick.playerId));
  if (collision) {
    return {
      ...baseReport,
      valid: false,
      applied: false,
      issues: [`Generated prospect id "${collision.playerId}" already exists.`],
    };
  }

  const picksByTeamId = new Map<string, ProspectDraftPick[]>();
  for (const pick of preview.selectedPicks) {
    picksByTeamId.set(pick.teamId, [...(picksByTeamId.get(pick.teamId) ?? []), pick]);
  }

  const originalRosters = new Map<string, TeamRoster>();
  const nextRosters = new Map<string, TeamRoster>();
  for (const [teamId, teamPicks] of picksByTeamId) {
    const roster = await storage.getTeamRoster(teamId);
    if (!roster) {
      return {
        ...baseReport,
        valid: false,
        applied: false,
        issues: [`Team "${teamId}" is missing a League Builder roster.`],
      };
    }
    if (roster.farmRoster.length + teamPicks.length > STARTUP_FARM_TARGET_SIZE) {
      return {
        ...baseReport,
        valid: false,
        applied: false,
        issues: [`Team "${teamId}" would exceed ${STARTUP_FARM_TARGET_SIZE} FARM players.`],
      };
    }
    originalRosters.set(teamId, cloneRoster(roster));
    nextRosters.set(teamId, {
      ...cloneRoster(roster),
      farmRoster: [...roster.farmRoster, ...teamPicks.map((pick) => pick.playerId)],
    });
  }

  try {
    for (const pick of preview.selectedPicks) {
      const saved = await storage.savePlayer(toStoragePlayer(pick.player));
      createdPlayerIds.push(saved.id);
    }

    for (const [teamId, roster] of nextRosters) {
      await storage.saveTeamRoster(roster);
      updatedTeamIds.push(teamId);
    }
  } catch (error) {
    for (const [teamId, roster] of originalRosters) {
      if (!updatedTeamIds.includes(teamId) && !nextRosters.has(teamId)) continue;
      try {
        await storage.saveTeamRoster(roster);
      } catch (rollbackError) {
        rollbackErrors.push(`Failed to restore roster "${teamId}": ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
      }
    }
    for (const playerId of createdPlayerIds) {
      try {
        await storage.deletePlayer(playerId);
      } catch (rollbackError) {
        rollbackErrors.push(`Failed to delete generated prospect "${playerId}": ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
      }
    }

    return {
      ...baseReport,
      valid: false,
      applied: false,
      issues: [`Startup farm draft apply failed: ${error instanceof Error ? error.message : String(error)}`],
    };
  }

  return {
    ...baseReport,
    valid: true,
    applied: true,
    issues: [],
  };
}
