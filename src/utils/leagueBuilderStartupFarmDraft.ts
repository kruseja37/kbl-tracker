import {
  deletePlayer,
  deleteScoutProfilesForLeague,
  createStartupDraftSessionId,
  deleteStartupDraftSession,
  getStartupDraftSession,
  getAllPlayers,
  getAllTeams,
  getLeagueTemplate,
  getScoutProfilesForLeague,
  getTeamRoster,
  saveScoutProfile,
  savePlayer,
  saveStartupDraftSession,
  saveTeamRoster,
  type Chemistry,
  type DepthChart,
  type Grade,
  type LeagueBuilderScoutProfile,
  type LeagueBuilderStartupDraftSession,
  type Personality,
  type PitchType,
  type Player,
  type Position,
  type Team,
  type TeamRoster,
} from './leagueBuilderStorage';
import {
  buildProspectPlayerForPick,
  generateProspectScoutingDraft,
  prospectSalaryForDraftRound,
  PROSPECT_SCOUTING_DRAFT_ENGINE_VERSION,
  scoutAccuracy,
  scoutOverallGradeBand,
  scoutProspect,
  scoutTierForPosition,
  scoutToolBands,
  visibleReportForProspectPlayer,
  type DraftPosition,
  type GeneratedProspectCandidate,
  type LeagueBuilderProspectPlayerDto,
  type ProspectDraftPick,
  type ProspectScoutDescriptor,
  type ScoutSpecialty,
  type VisibleSafeProspectReport,
} from './prospectScoutingDraftEngine';
import { FIRST_NAMES as SMB4_FIRST_NAMES, LAST_NAMES as SMB4_LAST_NAMES } from '../data/nameDatabase';

export const LEAGUE_BUILDER_STARTUP_FARM_DRAFT_VERSION =
  'league-builder-startup-farm-draft-v1';

export const STARTUP_FARM_TARGET_SIZE = 10;
export const STARTUP_MLB_REQUIRED_SIZE = 22;
export const STARTUP_SCOUTS_PER_TEAM = 1;
export const STARTUP_SCOUT_POOL_MULTIPLIER = 3;

export interface StartupFarmDraftTeamStatus {
  teamId: string;
  teamName: string;
  farmCount: number;
  mlbCount: number;
  missingFarm: number;
  scoutCount?: number;
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

export interface StartupScoutDraftPickSlot {
  round: number;
  pickNumber: number;
  teamId: string;
  teamName?: string;
}

export interface StartupProspectBoardReport extends VisibleSafeProspectReport {
  scoutId: string;
  scoutName: string;
  scoutAccuracy: number;
  scoutSpecialtiesVisible: ScoutSpecialty[];
  scoutWeaknessesVisible: ScoutSpecialty[];
}

export interface StartupProspectBoardCandidate extends VisibleSafeProspectReport {
  reports: StartupProspectBoardReport[];
  bestScoutedGrade: Grade;
  bestConfidence: 'low' | 'medium' | 'high';
}

export interface StartupDraftCompletedPick {
  round: number;
  pickNumber: number;
  teamId: string;
  teamName?: string;
  candidateId: string;
  playerId: string;
  playerName: string;
  position: DraftPosition;
  scoutedGrade: Grade;
  potentialGrade: Grade;
  salary: number;
  scoutReports: StartupProspectBoardReport[];
}

export interface LeagueBuilderStartupDraftView {
  session: LeagueBuilderStartupDraftSession | null;
  teams: StartupFarmDraftTeamStatus[];
  blockers: string[];
  warnings: string[];
  prepared: boolean;
  scoutDraftComplete: boolean;
  prospectDraftComplete: boolean;
  currentScoutPick: StartupScoutDraftPickSlot | null;
  availableScouts: LeagueBuilderScoutProfile[];
  currentProspectPick: StartupScoutDraftPickSlot | null;
  prospectBoard: StartupProspectBoardCandidate[];
  completedPicks: StartupDraftCompletedPick[];
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
        scoutName: `${pick(`startup-farm-scout-${state.team.id}:first`, SMB4_FIRST_NAMES)} ${pick(`startup-farm-scout-${state.team.id}:last`, SMB4_LAST_NAMES)}`,
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

const DRAFT_POSITIONS: DraftPosition[] = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'SP', 'RP', 'CP'];

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

function pick<T>(seed: string, values: readonly T[]): T {
  return values[Math.floor(randomUnit(seed) * values.length)] ?? values[0];
}

function gradeRank(grade: Grade): number {
  const order: Grade[] = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D'];
  const index = order.indexOf(grade);
  return index < 0 ? order.length : index;
}

function confidenceRank(confidence: 'low' | 'medium' | 'high'): number {
  return confidence === 'high' ? 2 : confidence === 'medium' ? 1 : 0;
}

function toScoutDescriptor(scout: LeagueBuilderScoutProfile): ProspectScoutDescriptor {
  return {
    scoutId: scout.id,
    scoutName: scout.name,
    specialties: scout.specialties as ScoutSpecialty[],
    weaknesses: scout.weaknesses as ScoutSpecialty[],
  };
}

function buildScoutPool(leagueId: string, seed: string, teamCount: number): LeagueBuilderScoutProfile[] {
  const poolSize = teamCount * STARTUP_SCOUTS_PER_TEAM * STARTUP_SCOUT_POOL_MULTIPLIER;
  return Array.from({ length: poolSize }, (_, index) => {
    const scoutSeed = `${seed}:scout:${index + 1}`;
    const high1 = pick(`${scoutSeed}:high:1`, DRAFT_POSITIONS);
    const afterHigh1 = DRAFT_POSITIONS.filter((p) => p !== high1);
    const high2 = pick(`${scoutSeed}:high:2`, afterHigh1);
    const afterHigh2 = afterHigh1.filter((p) => p !== high2);
    const low1 = pick(`${scoutSeed}:low:1`, afterHigh2);
    const afterLow1 = afterHigh2.filter((p) => p !== low1);
    const low2 = pick(`${scoutSeed}:low:2`, afterLow1);
    const descriptor: ProspectScoutDescriptor = {
      scoutId: `scout-${leagueId}-${index + 1}`,
      scoutName: `${pick(`${scoutSeed}:first`, SMB4_FIRST_NAMES)} ${pick(`${scoutSeed}:last`, SMB4_LAST_NAMES)}`,
      specialties: [high1, high2],
      weaknesses: [low1, low2],
    };
    return {
      id: descriptor.scoutId,
      leagueId,
      name: descriptor.scoutName,
      specialties: descriptor.specialties ?? [],
      weaknesses: descriptor.weaknesses ?? [],
      accuracyByPosition: Object.fromEntries(
        DRAFT_POSITIONS.map((position) => [position, scoutAccuracy(position, descriptor)]),
      ),
      seed: scoutSeed,
      createdDate: '',
      lastModified: '',
    };
  });
}

function buildScoutPickOrder(teamOrder: Array<{ teamId: string; teamName?: string }>): StartupScoutDraftPickSlot[] {
  const picks: StartupScoutDraftPickSlot[] = [];
  let pickNumber = 0;
  for (let round = 1; round <= STARTUP_SCOUTS_PER_TEAM; round += 1) {
    const roundOrder = round % 2 === 1 ? teamOrder : [...teamOrder].reverse();
    for (const team of roundOrder) {
      pickNumber += 1;
      picks.push({ round, pickNumber, teamId: team.teamId, teamName: team.teamName });
    }
  }
  return picks;
}

function sessionCompletedPicks(session: LeagueBuilderStartupDraftSession): StartupDraftCompletedPick[] {
  return (session.completedPicks ?? []).map((rawPick) => {
    const pick = rawPick as Partial<StartupDraftCompletedPick>;
    return {
      ...pick,
      salary: typeof pick.salary === 'number'
        ? pick.salary
        : prospectSalaryForDraftRound(typeof pick.round === 'number' ? pick.round : 4),
    } as StartupDraftCompletedPick;
  });
}

function sessionProspectPool(session: LeagueBuilderStartupDraftSession): GeneratedProspectCandidate[] {
  return (session.prospectPool ?? []) as GeneratedProspectCandidate[];
}

function buildProspectPickOrder(teamStates: DraftTeamState[]): StartupScoutDraftPickSlot[] {
  const baseOrder = [...teamStates].sort((a, b) => {
    const payrollDiff = a.payroll - b.payroll;
    if (payrollDiff !== 0) return payrollDiff;
    return a.team.id.localeCompare(b.team.id);
  });
  const remainingByTeamId = new Map(baseOrder.map((state) => [state.team.id, state.vacancies]));
  const order: StartupScoutDraftPickSlot[] = [];
  let pickNumber = 0;
  for (let round = 1; round <= STARTUP_FARM_TARGET_SIZE; round += 1) {
    const roundOrder = round % 2 === 1 ? baseOrder : [...baseOrder].reverse();
    for (const state of roundOrder) {
      const remaining = remainingByTeamId.get(state.team.id) ?? 0;
      if (remaining <= 0) continue;
      pickNumber += 1;
      order.push({
        round,
        pickNumber,
        teamId: state.team.id,
        teamName: teamDisplayNameForDraft(state.team),
      });
      remainingByTeamId.set(state.team.id, remaining - 1);
    }
  }
  return order;
}

function teamDisplayNameForDraft(team: Team): string {
  return team.location ? `${team.location} ${team.name}` : team.name;
}

async function collectDraftTeamStates(leagueId: string): Promise<{
  teams: StartupFarmDraftTeamStatus[];
  teamStates: DraftTeamState[];
  blockers: string[];
  warnings: string[];
}> {
  const league = await getLeagueTemplate(leagueId);
  if (!league) {
    return { teams: [], teamStates: [], blockers: [`League template "${leagueId}" not found.`], warnings: [] };
  }
  const [allPlayers, allTeams] = await Promise.all([getAllPlayers(), getAllTeams()]);
  const teams: StartupFarmDraftTeamStatus[] = [];
  const teamStates: DraftTeamState[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];

  for (const teamId of league.teamIds ?? []) {
    const team = allTeams.find((candidate) => candidate.id === teamId);
    const roster = await getTeamRoster(teamId);
    if (!team) {
      blockers.push(`Team "${teamId}" is missing from League Builder storage.`);
      continue;
    }
    if (!roster) {
      blockers.push(`${team.name}: missing League Builder roster.`);
      teams.push({
        teamId,
        teamName: teamDisplayNameForDraft(team),
        farmCount: 0,
        mlbCount: 0,
        missingFarm: STARTUP_FARM_TARGET_SIZE,
        prepared: false,
      });
      continue;
    }
    const farmPlayers = allPlayers.filter((player) => hasAssignment(player, leagueId, team.id, 'FARM'));
    const mlbPlayers = allPlayers.filter((player) => hasAssignment(player, leagueId, team.id, 'MLB'));
    const farmIds = uniqueSorted(farmPlayers.map((player) => player.id));
    const mlbIds = uniqueSorted(mlbPlayers.map((player) => player.id));
    const vacancies = Math.max(0, STARTUP_FARM_TARGET_SIZE - farmIds.length);
    teams.push({
      teamId: team.id,
      teamName: teamDisplayNameForDraft(team),
      farmCount: farmIds.length,
      mlbCount: mlbIds.length,
      missingFarm: vacancies,
      prepared: vacancies === 0,
    });
    if (uniqueSorted(roster.farmRoster).length !== roster.farmRoster.length) {
      blockers.push(`${team.name}: FARM roster contains duplicate player ids.`);
    }
    if (!sameIdSet(roster.farmRoster, farmIds)) {
      blockers.push(`${team.name}: FARM roster does not match player FARM assignments.`);
    }
    if (farmIds.length > STARTUP_FARM_TARGET_SIZE) {
      blockers.push(`${team.name}: FARM roster is over the startup limit (${farmIds.length}/${STARTUP_FARM_TARGET_SIZE}).`);
    }
    if (mlbIds.length !== STARTUP_MLB_REQUIRED_SIZE) {
      blockers.push(`${team.name}: expected ${STARTUP_MLB_REQUIRED_SIZE} MLB players before startup farm draft; found ${mlbIds.length}.`);
    }
    if (farmPlayers.some((player) => player.ratingRevealState === 'revealed')) {
      blockers.push(`${team.name}: FARM players must keep ratings hidden before call-up.`);
    }
    teamStates.push({
      team,
      roster,
      farmIds,
      mlbIds,
      vacancies,
      payroll: getTeamPayroll(team.id, leagueId, allPlayers),
    });
  }
  return { teams, teamStates, blockers, warnings };
}

function currentScoutPick(session: LeagueBuilderStartupDraftSession): StartupScoutDraftPickSlot | null {
  const teamOrder = session.scoutOrder.map((teamId) => ({ teamId }));
  const scoutOrder = buildScoutPickOrder(teamOrder);
  const completedScoutPicks = Object.values(session.hiredScoutIdsByTeamId)
    .reduce((sum, scouts) => sum + scouts.length, 0);
  return scoutOrder[completedScoutPicks] ?? null;
}

function hiredScoutsForTeam(session: LeagueBuilderStartupDraftSession, teamId: string): LeagueBuilderScoutProfile[] {
  const ids = new Set(session.hiredScoutIdsByTeamId[teamId] ?? []);
  return session.scoutPool.filter((scout) => ids.has(scout.id));
}

function allTeamsHaveScouts(session: LeagueBuilderStartupDraftSession): boolean {
  return session.scoutOrder.every((teamId) =>
    (session.hiredScoutIdsByTeamId[teamId] ?? []).length === STARTUP_SCOUTS_PER_TEAM,
  );
}

function scoutProfileMatchesSession(
  sessionScout: LeagueBuilderScoutProfile | undefined,
  durableScout: LeagueBuilderScoutProfile,
): boolean {
  if (!sessionScout) return false;
  return sessionScout.id === durableScout.id &&
    sessionScout.name === durableScout.name &&
    JSON.stringify(sessionScout.specialties) === JSON.stringify(durableScout.specialties) &&
    JSON.stringify(sessionScout.weaknesses) === JSON.stringify(durableScout.weaknesses) &&
    JSON.stringify(sessionScout.accuracyByPosition) === JSON.stringify(durableScout.accuracyByPosition);
}

async function getDurableScoutCountsByTeam(leagueId: string): Promise<Map<string, number>> {
  const scouts = await getScoutProfilesForLeague(leagueId);
  const counts = new Map<string, number>();
  for (const scout of scouts) {
    if (!scout.teamId) continue;
    counts.set(scout.teamId, (counts.get(scout.teamId) ?? 0) + 1);
  }
  return counts;
}

function missingDurableScoutIssues(
  teams: StartupFarmDraftTeamStatus[],
  scoutCounts: Map<string, number>,
): string[] {
  return teams
    .filter((team) => (scoutCounts.get(team.teamId) ?? 0) !== STARTUP_SCOUTS_PER_TEAM)
    .map((team) =>
      `${team.teamName}: expected ${STARTUP_SCOUTS_PER_TEAM} hired scouts; found ${scoutCounts.get(team.teamId) ?? 0}.`,
    );
}

function normalScoutDraftRestartBlockedMessage(scoutCount: number): string {
  return `Normal startup scout draft restart is blocked because ${scoutCount} durable scout profile${scoutCount === 1 ? '' : 's'} already exist for this league. V1 keeps the prepared scout state; reset flow is deferred.`;
}

async function validateSessionDurableScoutState(
  session: LeagueBuilderStartupDraftSession,
): Promise<string[]> {
  const durableScouts = await getScoutProfilesForLeague(session.leagueId);
  const durableById = new Map(durableScouts.map((scout) => [scout.id, scout]));
  const issues: string[] = [];

  for (const teamId of session.scoutOrder) {
    const hiredIds = session.hiredScoutIdsByTeamId[teamId] ?? [];
    const durableTeamScouts = durableScouts.filter((scout) => scout.teamId === teamId);
    if (hiredIds.length !== STARTUP_SCOUTS_PER_TEAM) {
      issues.push(`Team "${teamId}" must hire ${STARTUP_SCOUTS_PER_TEAM} scouts before prospect drafting.`);
      continue;
    }
    if (durableTeamScouts.length !== STARTUP_SCOUTS_PER_TEAM) {
      issues.push(`Team "${teamId}" durable scout state changed; expected ${STARTUP_SCOUTS_PER_TEAM}, found ${durableTeamScouts.length}.`);
      continue;
    }
    for (const scoutId of hiredIds) {
      const durableScout = durableById.get(scoutId);
      const sessionScout = session.scoutPool.find((scout) => scout.id === scoutId);
      if (!durableScout || durableScout.teamId !== teamId) {
        issues.push(`Team "${teamId}" hired scout "${scoutId}" is missing from durable League Builder scout profiles.`);
        continue;
      }
      if (!scoutProfileMatchesSession(sessionScout, durableScout)) {
        issues.push(`Team "${teamId}" hired scout "${scoutId}" no longer matches the active draft session.`);
      }
    }
  }

  return issues;
}

function currentProspectPick(session: LeagueBuilderStartupDraftSession): StartupScoutDraftPickSlot | null {
  return session.prospectPickOrder[session.currentPickIndex] ?? null;
}

function deterministicPickPlayerId(
  leagueId: string,
  seasonNumber: number,
  pick: StartupScoutDraftPickSlot,
  existingPlayerIds: Set<string>,
): string {
  const base = `prospect-${leagueId}-${seasonNumber}-${pick.teamId}-${pick.round}-${pick.pickNumber}`;
  if (!existingPlayerIds.has(base)) return base;
  let suffix = 1;
  while (existingPlayerIds.has(`${base}-alt-${suffix}`)) suffix += 1;
  return `${base}-alt-${suffix}`;
}

function buildBoardForSession(session: LeagueBuilderStartupDraftSession): StartupProspectBoardCandidate[] {
  const pickSlot = currentProspectPick(session);
  if (!pickSlot || !allTeamsHaveScouts(session)) return [];
  const salary = prospectSalaryForDraftRound(pickSlot.round);
  const completed = sessionCompletedPicks(session);
  const usedCandidateIds = new Set(completed.map((pick) => pick.candidateId));
  const scouts = hiredScoutsForTeam(session, pickSlot.teamId);
  const pool = sessionProspectPool(session).filter((candidate) => !usedCandidateIds.has(candidate.candidateId));

  return pool.map((candidate) => {
    const reports = scouts.map((scout) => {
      const descriptor = toScoutDescriptor(scout);
      const report = scoutProspect(candidate, descriptor, session.seed);
      const bandTier = scoutTierForPosition(candidate.position, descriptor);
      const toolBands = scoutToolBands({
        ratings: candidate.ratings as unknown as Record<string, number>,
        position: candidate.position,
        scout: descriptor,
        seed: `${session.seed}:tool-bands:${candidate.candidateId}:${scout.id}`,
      });
      const overallGradeBand = scoutOverallGradeBand(
        candidate.trueGrade,
        bandTier,
        `${session.seed}:grade-band:${candidate.candidateId}:${scout.id}`,
      );
      return {
        candidateId: candidate.candidateId,
        playerName: `${candidate.firstName} ${candidate.lastName}`,
        position: candidate.position,
        age: 18,
        bats: 'R',
        throws: 'R',
        scoutedGrade: report.scoutedGrade,
        potentialGrade: candidate.potentialGrade,
        scoutConfidence: report.scoutConfidence,
        chemistry: candidate.chemistry,
        personality: candidate.personality,
        traitCount: ([candidate.trait1, candidate.trait2].filter(Boolean).length) as 0 | 1 | 2,
        archetypeFamily: candidate.archetypeFamily,
        secondaryPosition: candidate.secondaryPosition,
        salary,
        toolBands,
        overallGradeBand,
        scoutId: scout.id,
        scoutName: scout.name,
        scoutAccuracy: report.scoutAccuracy,
        scoutSpecialtiesVisible: [...scout.specialties] as ScoutSpecialty[],
        scoutWeaknessesVisible: [...scout.weaknesses] as ScoutSpecialty[],
      } satisfies StartupProspectBoardReport;
    });
    const sortedReports = [...reports].sort((a, b) => {
      const gradeDiff = gradeRank(a.scoutedGrade) - gradeRank(b.scoutedGrade);
      if (gradeDiff !== 0) return gradeDiff;
      return confidenceRank(b.scoutConfidence) - confidenceRank(a.scoutConfidence);
    });
    const best = sortedReports[0];
    return {
      candidateId: candidate.candidateId,
      playerName: `${candidate.firstName} ${candidate.lastName}`,
      position: candidate.position,
      age: 18,
      bats: 'R',
      throws: 'R',
      scoutedGrade: best.scoutedGrade,
      bestScoutedGrade: best.scoutedGrade,
      potentialGrade: candidate.potentialGrade,
      bestConfidence: best.scoutConfidence,
      scoutConfidence: best.scoutConfidence,
      chemistry: candidate.chemistry,
      personality: candidate.personality,
      traitCount: ([candidate.trait1, candidate.trait2].filter(Boolean).length) as 0 | 1 | 2,
      archetypeFamily: candidate.archetypeFamily,
      secondaryPosition: candidate.secondaryPosition,
      salary,
      reports,
    } satisfies StartupProspectBoardCandidate;
  }).sort((a, b) => {
    const gradeDiff = gradeRank(a.bestScoutedGrade) - gradeRank(b.bestScoutedGrade);
    if (gradeDiff !== 0) return gradeDiff;
    const confidenceDiff = confidenceRank(b.bestConfidence) - confidenceRank(a.bestConfidence);
    if (confidenceDiff !== 0) return confidenceDiff;
    const potentialDiff = gradeRank(a.potentialGrade) - gradeRank(b.potentialGrade);
    if (potentialDiff !== 0) return potentialDiff;
    return a.playerName.localeCompare(b.playerName);
  });
}

export async function createLeagueBuilderStartupDraftSession(input: {
  leagueId: string;
  seasonNumber?: number;
  seed?: string;
  scoutOrder?: string[];
}): Promise<LeagueBuilderStartupDraftView> {
  const seasonNumber = input.seasonNumber ?? 1;
  const seed = input.seed?.trim() || `${LEAGUE_BUILDER_STARTUP_FARM_DRAFT_VERSION}:${input.leagueId}:${seasonNumber}`;
  const { teams, teamStates, blockers, warnings } = await collectDraftTeamStates(input.leagueId);
  const teamIds = teamStates.map((state) => state.team.id);
  const scoutOrder = input.scoutOrder?.filter((teamId) => teamIds.includes(teamId)) ?? teamIds;
  const completeScoutOrder = [...scoutOrder, ...teamIds.filter((teamId) => !scoutOrder.includes(teamId))];

  if (blockers.length > 0) {
    await deleteStartupDraftSession(input.leagueId, seasonNumber);
    return {
      session: null,
      teams,
      blockers,
      warnings,
      prepared: false,
      scoutDraftComplete: false,
      prospectDraftComplete: false,
      currentScoutPick: null,
      availableScouts: [],
      currentProspectPick: null,
      prospectBoard: [],
      completedPicks: [],
    };
  }

  const existingScoutProfiles = await getScoutProfilesForLeague(input.leagueId);
  if (existingScoutProfiles.length > 0) {
    throw new Error(normalScoutDraftRestartBlockedMessage(existingScoutProfiles.length));
  }

  const scoutPool = buildScoutPool(input.leagueId, seed, teamStates.length);
  const prospectPickOrder = buildProspectPickOrder(teamStates);
  const draft = generateProspectScoutingDraft({
    leagueId: input.leagueId,
    seasonNumber,
    teamDraftOrder: teamStates
      .sort((a, b) => {
        const payrollDiff = a.payroll - b.payroll;
        if (payrollDiff !== 0) return payrollDiff;
        return a.team.id.localeCompare(b.team.id);
      })
      .map((state) => ({ teamId: state.team.id, teamName: teamDisplayNameForDraft(state.team) })),
    rounds: STARTUP_FARM_TARGET_SIZE,
    seed,
    scoutsByTeamId: {},
    existingPlayerIds: [],
    existingTeamIds: teamIds,
    candidatePoolMultiplier: 3,
  });
  const session = await saveStartupDraftSession({
    id: createStartupDraftSessionId(input.leagueId, seasonNumber),
    leagueId: input.leagueId,
    seasonNumber,
    seed,
    workflowVersion: LEAGUE_BUILDER_STARTUP_FARM_DRAFT_VERSION,
    engineMethodVersion: draft.methodVersion,
    scoutOrder: completeScoutOrder,
    scoutPool,
    hiredScoutIdsByTeamId: Object.fromEntries(completeScoutOrder.map((teamId) => [teamId, []])),
    prospectPickOrder,
    prospectPool: draft.draftClass,
    completedPicks: [],
    currentPickIndex: 0,
  });
  return getLeagueBuilderStartupDraftView(input.leagueId, seasonNumber, session);
}

export async function getLeagueBuilderStartupDraftView(
  leagueId: string,
  seasonNumber = 1,
  providedSession?: LeagueBuilderStartupDraftSession | null,
): Promise<LeagueBuilderStartupDraftView> {
  const session = providedSession ?? await getStartupDraftSession(leagueId, seasonNumber);
  const { teams, blockers, warnings } = await collectDraftTeamStates(leagueId);
  const durableScoutCounts = await getDurableScoutCountsByTeam(leagueId);
  if (!session) {
    const scoutIssues = missingDurableScoutIssues(teams, durableScoutCounts);
    const durableScoutCount = [...durableScoutCounts.values()].reduce((sum, count) => sum + count, 0);
    const startupFarmPrepared = teams.length > 0 && teams.every((team) => team.missingFarm === 0);
    const durableScoutRestartBlockers = durableScoutCount > 0 && !startupFarmPrepared
      ? [normalScoutDraftRestartBlockedMessage(durableScoutCount)]
      : [];
    const teamsWithDurableScoutCounts = teams.map((team) => ({
      ...team,
      scoutCount: durableScoutCounts.get(team.teamId) ?? 0,
    }));
    return {
      session: null,
      teams: teamsWithDurableScoutCounts,
      blockers: [...blockers, ...scoutIssues, ...durableScoutRestartBlockers],
      warnings,
      prepared: blockers.length === 0 &&
        scoutIssues.length === 0 &&
        durableScoutRestartBlockers.length === 0 &&
        teams.length > 0 &&
        startupFarmPrepared,
      scoutDraftComplete: false,
      prospectDraftComplete: false,
      currentScoutPick: null,
      availableScouts: [],
      currentProspectPick: null,
      prospectBoard: [],
      completedPicks: [],
    };
  }
  const hiredIds = new Set(Object.values(session.hiredScoutIdsByTeamId).flat());
  const availableScouts = session.scoutPool.filter((scout) => !hiredIds.has(scout.id));
  const completedPicks = sessionCompletedPicks(session);
  const sessionScoutDraftComplete = allTeamsHaveScouts(session);
  const durableScoutIssues = sessionScoutDraftComplete
    ? await validateSessionDurableScoutState(session)
    : [];
  const effectiveBlockers = [...blockers, ...durableScoutIssues];
  const scoutDraftComplete = sessionScoutDraftComplete && durableScoutIssues.length === 0;
  const prospectDraftComplete = session.currentPickIndex >= session.prospectPickOrder.length;
  return {
    session,
    teams,
    blockers: effectiveBlockers,
    warnings,
    prepared: effectiveBlockers.length === 0 &&
      teams.length > 0 &&
      teams.every((team) => team.missingFarm === 0) &&
      scoutDraftComplete,
    scoutDraftComplete,
    prospectDraftComplete,
    currentScoutPick: scoutDraftComplete ? null : currentScoutPick(session),
    availableScouts,
    currentProspectPick: scoutDraftComplete && !prospectDraftComplete ? currentProspectPick(session) : null,
    prospectBoard: scoutDraftComplete ? buildBoardForSession(session) : [],
    completedPicks,
  };
}

export async function draftLeagueBuilderScout(input: {
  leagueId: string;
  seasonNumber?: number;
  scoutId: string;
}, options: {
  saveStartupDraftSession?: typeof saveStartupDraftSession;
} = {}): Promise<LeagueBuilderStartupDraftView> {
  const persistSession = options.saveStartupDraftSession ?? saveStartupDraftSession;
  const seasonNumber = input.seasonNumber ?? 1;
  const session = await getStartupDraftSession(input.leagueId, seasonNumber);
  if (!session) throw new Error('Start a League Builder scout draft session first.');
  const pickSlot = currentScoutPick(session);
  if (!pickSlot) throw new Error('Scout draft is already complete.');
  const scout = session.scoutPool.find((candidate) => candidate.id === input.scoutId);
  if (!scout) throw new Error(`Scout "${input.scoutId}" is not in this draft pool.`);
  if (Object.values(session.hiredScoutIdsByTeamId).flat().includes(input.scoutId)) {
    throw new Error(`Scout "${scout.name}" has already been hired.`);
  }
  const currentTeamScouts = session.hiredScoutIdsByTeamId[pickSlot.teamId] ?? [];
  if (currentTeamScouts.length >= STARTUP_SCOUTS_PER_TEAM) {
    throw new Error(`Team "${pickSlot.teamId}" already has ${STARTUP_SCOUTS_PER_TEAM} scouts.`);
  }
  const hiredScout: LeagueBuilderScoutProfile = {
    ...scout,
    teamId: pickSlot.teamId,
    hiredPick: pickSlot,
  };
  const previousScoutProfiles = await getScoutProfilesForLeague(input.leagueId);
  await saveScoutProfile(hiredScout);
  let nextSession: LeagueBuilderStartupDraftSession;
  try {
    nextSession = await persistSession({
      ...session,
      scoutPool: session.scoutPool.map((candidate) => candidate.id === input.scoutId ? hiredScout : candidate),
      hiredScoutIdsByTeamId: {
        ...session.hiredScoutIdsByTeamId,
        [pickSlot.teamId]: [...currentTeamScouts, input.scoutId],
      },
    });
  } catch (error) {
    await deleteScoutProfilesForLeague(input.leagueId);
    await Promise.all(previousScoutProfiles.map((profile) => saveScoutProfile(profile)));
    throw error;
  }
  return getLeagueBuilderStartupDraftView(input.leagueId, seasonNumber, nextSession);
}

export async function confirmLeagueBuilderProspectPick(input: {
  leagueId: string;
  seasonNumber?: number;
  candidateId: string;
}, options: {
  saveStartupDraftSession?: typeof saveStartupDraftSession;
} = {}): Promise<LeagueBuilderStartupDraftView> {
  const persistSession = options.saveStartupDraftSession ?? saveStartupDraftSession;
  const seasonNumber = input.seasonNumber ?? 1;
  const session = await getStartupDraftSession(input.leagueId, seasonNumber);
  if (!session) throw new Error('Start a League Builder prospect draft session first.');
  if (!allTeamsHaveScouts(session)) throw new Error('Every team must hire one scout before the prospect draft begins.');
  const durableScoutIssues = await validateSessionDurableScoutState(session);
  if (durableScoutIssues.length > 0) {
    throw new Error(`Startup prospect draft scout state changed: ${durableScoutIssues.join(' ')}`);
  }
  const pickSlot = currentProspectPick(session);
  if (!pickSlot) throw new Error('Prospect draft is already complete.');
  const { teams, blockers } = await collectDraftTeamStates(input.leagueId);
  if (blockers.length > 0) throw new Error(`Startup prospect draft blocked: ${blockers.join(' ')}`);
  const teamStatus = teams.find((team) => team.teamId === pickSlot.teamId);
  if (!teamStatus || teamStatus.missingFarm <= 0) {
    throw new Error(`Team "${pickSlot.teamId}" no longer has a FARM vacancy.`);
  }
  const candidate = sessionProspectPool(session).find((item) => item.candidateId === input.candidateId);
  if (!candidate) throw new Error(`Prospect "${input.candidateId}" is not available.`);
  const completed = sessionCompletedPicks(session);
  if (completed.some((pick) => pick.candidateId === input.candidateId)) {
    throw new Error(`Prospect "${input.candidateId}" has already been drafted.`);
  }

  const scouts = hiredScoutsForTeam(session, pickSlot.teamId);
  const reports = scouts.map((scout) => {
    const report = scoutProspect(candidate, toScoutDescriptor(scout), session.seed);
    return { scout, report };
  });
  const best = [...reports].sort((a, b) => {
    const gradeDiff = gradeRank(a.report.scoutedGrade) - gradeRank(b.report.scoutedGrade);
    if (gradeDiff !== 0) return gradeDiff;
    return confidenceRank(b.report.scoutConfidence) - confidenceRank(a.report.scoutConfidence);
  })[0];
  const existingPlayers = await getAllPlayers();
  const playerId = deterministicPickPlayerId(input.leagueId, seasonNumber, pickSlot, new Set(existingPlayers.map((player) => player.id)));
  const player = buildProspectPlayerForPick({
    engineInput: {
      leagueId: input.leagueId,
      seasonNumber,
      teamDraftOrder: [],
      rounds: STARTUP_FARM_TARGET_SIZE,
      seed: session.seed,
    },
    candidate,
    report: best.report,
    pick: pickSlot,
    playerId,
  });
  const storedPlayer = toStoragePlayer({
    ...player,
    prospectProfile: {
      ...player.prospectProfile,
      scoutReportsVisible: reports.map(({ scout, report }) => ({
        scoutId: scout.id,
        scoutName: scout.name,
        scoutedGrade: report.scoutedGrade,
        scoutAccuracy: report.scoutAccuracy,
        scoutConfidence: report.scoutConfidence,
        scoutSpecialtiesVisible: scout.specialties,
        scoutWeaknessesVisible: scout.weaknesses,
      })),
    } as LeagueBuilderProspectPlayerDto['prospectProfile'],
  } as LeagueBuilderProspectPlayerDto);
  const roster = await getTeamRoster(pickSlot.teamId);
  if (!roster) throw new Error(`Team "${pickSlot.teamId}" is missing a League Builder roster.`);
  if (roster.farmRoster.includes(playerId)) throw new Error(`Prospect "${playerId}" is already on the FARM roster.`);
  const saved = await savePlayer(storedPlayer);
  const originalRoster = cloneRoster(roster);
  try {
    await saveTeamRoster({
      ...cloneRoster(roster),
      farmRoster: [...roster.farmRoster, saved.id],
    });
  } catch (error) {
    await deletePlayer(saved.id);
    throw error;
  }
  const visibleReport = visibleReportForProspectPlayer({ candidate, player, report: best.report });
  const scoutReports: StartupProspectBoardReport[] = reports.map(({ scout, report }) => ({
    ...visibleReport,
    scoutedGrade: report.scoutedGrade,
    scoutConfidence: report.scoutConfidence,
    scoutId: scout.id,
    scoutName: scout.name,
    scoutAccuracy: report.scoutAccuracy,
    scoutSpecialtiesVisible: [...scout.specialties] as ScoutSpecialty[],
    scoutWeaknessesVisible: [...scout.weaknesses] as ScoutSpecialty[],
  }));
  const completedPick: StartupDraftCompletedPick = {
    ...pickSlot,
    candidateId: candidate.candidateId,
    playerId: saved.id,
    playerName: `${saved.firstName} ${saved.lastName}`,
    position: candidate.position,
    scoutedGrade: best.report.scoutedGrade,
    potentialGrade: candidate.potentialGrade,
    salary: saved.salary,
    scoutReports,
  };
  let nextSession: LeagueBuilderStartupDraftSession;
  try {
    nextSession = await persistSession({
      ...session,
      completedPicks: [...completed, completedPick],
      currentPickIndex: session.currentPickIndex + 1,
    });
  } catch (error) {
    await saveTeamRoster(originalRoster);
    await deletePlayer(saved.id);
    throw error;
  }
  return getLeagueBuilderStartupDraftView(input.leagueId, seasonNumber, nextSession);
}
