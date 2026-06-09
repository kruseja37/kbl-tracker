import {
  type FranchiseOffseasonAdapter,
  type FranchiseOffseasonAdapterContext,
  type FranchiseOffseasonAdapterIssue,
  type FranchiseOffseasonAdapterResult,
} from './franchiseOffseasonAdapters';
import {
  validateFranchiseOffseasonScope,
  type FranchiseOffseasonScopeValidationReport,
} from './franchiseOffseasonDataAccess';
import type { FranchiseFarmRecord } from './franchiseFarmStorage';
import {
  deleteFranchiseFarmRecord,
  getFranchiseFarmRecordsForSeason,
  saveFranchiseFarmRecord,
} from './franchiseFarmStorage';
import type { Player, Team } from './franchisePlayerStorage';
import {
  getAllFranchisePlayers,
  getAllFranchiseTeams,
  saveFranchisePlayer,
  saveFranchiseTeam,
} from './franchisePlayerStorage';
import {
  logMode2V1Transaction,
  type GamePhase,
  type TransactionLogEntry,
} from './transactionStorage';
import {
  markOptimalLineupSnapshotsStaleForChange,
  OPTIMAL_LINEUP_SNAPSHOT_FIELDS,
} from './optimalLineup';
import { updateFranchiseDesignationTeamForTrade } from './franchiseDesignations';
import type { FranchisePlayerDesignationRecord } from './franchiseDesignations';

export const FRANCHISE_TRADE_CALCULATION_VERSION = 'franchise-trades-v1-fit-preview-dry-run';

export type FranchiseTradeRiskLevel = 'low' | 'medium' | 'high';
export type FranchiseTradeTrustLevel = 'low' | 'medium' | 'high';
export type FranchiseTradeRosterStatus = 'MLB' | 'FARM' | 'FREE_AGENT' | 'RELEASED' | 'RETIRED' | 'INACTIVE' | 'UNASSIGNED' | 'UNKNOWN';

export interface FranchiseTradeRequestedInput {
  sourceTeamId?: string;
  targetTeamId?: string;
  outgoingPlayerId?: string;
  incomingPlayerId?: string;
  outgoingPlayerIds?: string[];
  incomingPlayerIds?: string[];
}

export interface FranchiseTradeAdapterInput {
  dryRun?: boolean;
  apply?: boolean;
  requestedTrade?: FranchiseTradeRequestedInput;
}

export interface ExecuteManualFranchiseTradeInput {
  requestedTrade: FranchiseTradeRequestedInput;
  transactionPhase?: GamePhase;
}

export interface FranchiseTradeNeedSurplus {
  role: string;
  currentCount: number;
  targetCount: number;
  gap: number;
  surplus: number;
  severity: FranchiseTradeRiskLevel;
}

export interface FranchiseTradePlayerPreview {
  playerId: string;
  playerName: string;
  teamId: string;
  rosterStatus: FranchiseTradeRosterStatus;
  primaryPosition: string;
  overallGrade?: string;
  visibleGradeLabel: string;
  hiddenGradeBlocked?: boolean;
  salary?: number;
  activeDesignations?: Array<'TEAM_MVP' | 'ACE'>;
}

export interface FranchiseTradeTeamFitReport {
  teamId: string;
  teamName: string;
  mlbCount: number;
  farmCount: number;
  needs: FranchiseTradeNeedSurplus[];
  surpluses: FranchiseTradeNeedSurplus[];
  eligibleTradePlayerIds: string[];
  riskLevel: FranchiseTradeRiskLevel;
  trustLevel: FranchiseTradeTrustLevel;
  evidence: string[];
  limitations: string[];
}

export interface FranchiseTradeFitPreview {
  id: string;
  sourceTeamId: string;
  sourceTeamName: string;
  targetTeamId: string;
  targetTeamName: string;
  role: string;
  sourceSurplus: number;
  targetGap: number;
  candidatePlayerIds: string[];
  riskLevel: FranchiseTradeRiskLevel;
  trustLevel: FranchiseTradeTrustLevel;
  evidence: string[];
  limitations: string[];
  nonExecutable: true;
}

export interface FranchiseTradeRequestedPreview {
  sourceTeamId?: string;
  targetTeamId?: string;
  outgoingPlayer?: FranchiseTradePlayerPreview;
  incomingPlayer?: FranchiseTradePlayerPreview;
  valid: boolean;
  evidence: string[];
  limitations: string[];
  nonExecutable: true;
}

export interface FranchiseTradeAdapterData {
  calculationVersion: string;
  method: string;
  teamReports: FranchiseTradeTeamFitReport[];
  fitPreviews: FranchiseTradeFitPreview[];
  requestedPreview?: FranchiseTradeRequestedPreview;
  executedTrade?: FranchiseTradeExecutionSummary;
  limitations: string[];
}

export interface FranchiseTradeExecutionRollbackStatus {
  attempted: boolean;
  success: boolean;
  errors: string[];
}

export interface FranchiseTradeExecutionSummary {
  transactionId: string;
  transaction: TransactionLogEntry;
  sourceTeamId: string;
  targetTeamId: string;
  playersFromSource: string[];
  playersFromTarget: string[];
  movedFarmPlayerIds: string[];
  rollbackStatus?: FranchiseTradeExecutionRollbackStatus;
}

const TRADE_ELIGIBLE_STATUSES = new Set<FranchiseTradeRosterStatus>(['MLB', 'FARM']);

const ROLE_TARGETS: Array<{ role: string; positions: string[]; targetCount: number }> = [
  { role: 'Catcher depth', positions: ['C'], targetCount: 2 },
  { role: 'Middle infield depth', positions: ['SS', '2B'], targetCount: 3 },
  { role: 'Corner infield depth', positions: ['1B', '3B'], targetCount: 3 },
  { role: 'Outfield depth', positions: ['LF', 'CF', 'RF'], targetCount: 5 },
  { role: 'Starting pitching depth', positions: ['SP'], targetCount: 5 },
  { role: 'Relief pitching depth', positions: ['RP', 'CP'], targetCount: 4 },
];

function makeIssue(
  code: FranchiseOffseasonAdapterIssue['code'],
  message: string,
  context: Partial<FranchiseOffseasonAdapterContext>,
  details?: Partial<FranchiseOffseasonAdapterIssue>,
): FranchiseOffseasonAdapterIssue {
  return {
    code,
    severity: details?.severity ?? 'error',
    message,
    franchiseId: context.franchiseId,
    seasonId: context.seasonId,
    seasonNumber: context.seasonNumber,
    offseasonStateId: context.offseasonStateId,
    phase: context.phase,
    ...details,
  };
}

function teamName(team: Team): string {
  const source = team as Team & Record<string, unknown>;
  return String(source.name ?? source.teamName ?? source.shortName ?? team.id);
}

function playerName(player: Player): string {
  const source = player as Player & Record<string, unknown>;
  return String(source.name ?? `${source.firstName ?? ''} ${source.lastName ?? ''}`.trim() ?? player.id) || player.id;
}

function primaryPosition(player: Player): string {
  return String(player.primaryPosition ?? '').trim().toUpperCase() || 'UNKNOWN';
}

function positionsForPlayer(player: Player): string[] {
  const positions = [player.primaryPosition, player.secondaryPosition]
    .map((position) => String(position ?? '').trim().toUpperCase())
    .filter(Boolean);
  return Array.from(new Set(positions));
}

function assignmentForTeam(player: Player, teamId: string) {
  return (player.leagueAssignments ?? []).find((assignment) => assignment.teamId === teamId);
}

function primaryAssignment(player: Player) {
  return (player.leagueAssignments ?? []).find((assignment) =>
    assignment.teamId && assignment.rosterStatus !== 'FREE_AGENT',
  ) ?? (player.leagueAssignments ?? [])[0];
}

function rosterStatusForPlayer(player: Player, teamId?: string): FranchiseTradeRosterStatus {
  const assignment = teamId ? assignmentForTeam(player, teamId) : primaryAssignment(player);
  const status = String(assignment?.rosterStatus ?? 'UNKNOWN').toUpperCase();
  if (status === 'MLB' || status === 'FARM' || status === 'FREE_AGENT' || status === 'RELEASED' || status === 'RETIRED' || status === 'INACTIVE' || status === 'UNASSIGNED') {
    return status;
  }
  return 'UNKNOWN';
}

function playerRevealState(player: Player): 'hidden' | 'revealed' | undefined {
  const state = String((player as Player & Record<string, unknown>).ratingRevealState ?? '').toLowerCase();
  if (state === 'hidden' || state === 'revealed') return state;
  return undefined;
}

function visibleScoutedGrade(player: Player): string | undefined {
  const carrier = player as Player & {
    prospectProfile?: {
      scoutedGrade?: unknown;
      potentialGrade?: unknown;
    };
    scoutedGrade?: unknown;
    potentialGrade?: unknown;
  };
  const scouted = carrier.prospectProfile?.scoutedGrade ?? carrier.scoutedGrade;
  if (typeof scouted === 'string' && scouted.trim().length > 0) {
    return scouted.trim();
  }
  const potential = carrier.prospectProfile?.potentialGrade ?? carrier.potentialGrade;
  if (typeof potential === 'string' && potential.trim().length > 0) {
    return `Potential ${potential.trim()}`;
  }
  return undefined;
}

function isHiddenFarmTradePlayer(player: Player, teamId: string): boolean {
  return rosterStatusForPlayer(player, teamId) === 'FARM' && playerRevealState(player) !== 'revealed';
}

function visibleGradeLabelForPlayer(player: Player, teamId: string): string {
  if (isHiddenFarmTradePlayer(player, teamId)) {
    const scouted = visibleScoutedGrade(player);
    return scouted ? `Scouted ${scouted}` : 'Hidden FARM grade';
  }

  return `Grade ${String(player.overallGrade ?? '--')}`;
}

function playerTeamId(player: Player): string | undefined {
  return primaryAssignment(player)?.teamId;
}

function playersForTeam(players: Player[], teamId: string): Player[] {
  return players.filter((player) =>
    (player.leagueAssignments ?? []).some((assignment) =>
      assignment.teamId === teamId && TRADE_ELIGIBLE_STATUSES.has(rosterStatusForPlayer(player, teamId)),
    ),
  );
}

function farmRecordsForTeam(records: FranchiseFarmRecord[], teamId: string): FranchiseFarmRecord[] {
  return records.filter((record) => record.teamId === teamId);
}

function severityForGap(gap: number): FranchiseTradeRiskLevel {
  if (gap >= 3) return 'high';
  if (gap >= 1) return 'medium';
  return 'low';
}

function trustLevelFor(limitations: string[]): FranchiseTradeTrustLevel {
  if (limitations.length >= 3) return 'low';
  if (limitations.length > 0) return 'medium';
  return 'high';
}

function riskLevelFor(needs: FranchiseTradeNeedSurplus[], limitations: string[]): FranchiseTradeRiskLevel {
  if (limitations.some((limitation) => limitation.includes('No franchise-owned farm records'))) return 'high';
  if (needs.some((need) => need.severity === 'high')) return 'high';
  if (needs.length > 0) return 'medium';
  return 'low';
}

function buildNeedSurplus(players: Player[]): { needs: FranchiseTradeNeedSurplus[]; surpluses: FranchiseTradeNeedSurplus[] } {
  const positionCounts = new Map<string, number>();
  for (const player of players) {
    for (const position of positionsForPlayer(player)) {
      positionCounts.set(position, (positionCounts.get(position) ?? 0) + 1);
    }
  }

  const rows = ROLE_TARGETS.map((target) => {
    const currentCount = target.positions.reduce(
      (total, position) => total + (positionCounts.get(position) ?? 0),
      0,
    );
    const gap = Math.max(0, target.targetCount - currentCount);
    const surplus = Math.max(0, currentCount - target.targetCount);
    return {
      role: target.role,
      currentCount,
      targetCount: target.targetCount,
      gap,
      surplus,
      severity: severityForGap(gap),
    } satisfies FranchiseTradeNeedSurplus;
  });

  return {
    needs: rows.filter((row) => row.gap > 0),
    surpluses: rows.filter((row) => row.surplus > 0),
  };
}

function buildPlayerPreview(player: Player, teamId: string): FranchiseTradePlayerPreview {
  const hiddenGradeBlocked = isHiddenFarmTradePlayer(player, teamId);
  const activeDesignations = ((player as Player & { franchiseDesignations?: FranchisePlayerDesignationRecord[] }).franchiseDesignations ?? [])
    .filter((designation) =>
      !hiddenGradeBlocked &&
      designation.status === 'active' &&
      designation.teamId === teamId &&
      (designation.type === 'TEAM_MVP' || designation.type === 'ACE'),
    )
    .map((designation) => designation.type as 'TEAM_MVP' | 'ACE');
  return {
    playerId: player.id,
    playerName: playerName(player),
    teamId,
    rosterStatus: rosterStatusForPlayer(player, teamId),
    primaryPosition: primaryPosition(player),
    ...(hiddenGradeBlocked ? {} : { overallGrade: player.overallGrade }),
    visibleGradeLabel: visibleGradeLabelForPlayer(player, teamId),
    hiddenGradeBlocked: hiddenGradeBlocked || undefined,
    salary: typeof player.salary === 'number' ? player.salary : undefined,
    activeDesignations: activeDesignations.length > 0 ? activeDesignations : undefined,
  };
}

function uniqueIds(ids: Array<string | undefined>): string[] {
  return Array.from(new Set(ids.filter((id): id is string => Boolean(id && id.trim().length > 0))));
}

function requestedOutgoingPlayerIds(requested: FranchiseTradeRequestedInput | undefined): string[] {
  return uniqueIds([requested?.outgoingPlayerId, ...(requested?.outgoingPlayerIds ?? [])]);
}

function requestedIncomingPlayerIds(requested: FranchiseTradeRequestedInput | undefined): string[] {
  return uniqueIds([requested?.incomingPlayerId, ...(requested?.incomingPlayerIds ?? [])]);
}

function assignmentIndexForTeam(player: Player, teamId: string): number {
  return (player.leagueAssignments ?? []).findIndex((assignment) => assignment.teamId === teamId);
}

function updatePlayerTradeAssignment(player: Player, fromTeamId: string, toTeamId: string): Player {
  const assignments = (player.leagueAssignments ?? []).map((assignment) =>
    assignment.teamId === fromTeamId
      ? { ...assignment, teamId: toTeamId }
      : assignment,
  );

  return updateFranchiseDesignationTeamForTrade({
    ...player,
    leagueAssignments: assignments,
  }, fromTeamId, toTeamId);
}

function farmRecordForPlayer(
  farmRecords: FranchiseFarmRecord[],
  teamId: string,
  playerId: string,
): FranchiseFarmRecord | null {
  return farmRecords.find((record) =>
    record.teamId === teamId &&
    record.playerId === playerId,
  ) ?? null;
}

function cleanTeamPlayerReferences(team: Team, playerIds: string[]): Team {
  const removeIds = new Set(playerIds);
  const filterIds = (ids: string[] | undefined) => (ids ?? []).filter((id) => !removeIds.has(id));
  const filterLineup = (lineup: NonNullable<Team['lineupWithDH']> | undefined) =>
    (lineup ?? []).filter((slot) => !removeIds.has(slot.playerId));

  return markOptimalLineupSnapshotsStaleForChange({
    ...team,
    lineupWithDH: filterLineup(team.lineupWithDH),
    lineupWithoutDH: filterLineup(team.lineupWithoutDH),
    startingRotation: filterIds(team.startingRotation),
  }, OPTIMAL_LINEUP_SNAPSHOT_FIELDS);
}

function teamChanged(previous: Team, next: Team): boolean {
  return JSON.stringify({
    lineupWithDH: previous.lineupWithDH ?? [],
    lineupWithoutDH: previous.lineupWithoutDH ?? [],
    startingRotation: previous.startingRotation ?? [],
    optimalLineupVsRHPWithDH: previous.optimalLineupVsRHPWithDH ?? null,
    optimalLineupVsLHPWithDH: previous.optimalLineupVsLHPWithDH ?? null,
    optimalLineupVsRHPWithoutDH: previous.optimalLineupVsRHPWithoutDH ?? null,
    optimalLineupVsLHPWithoutDH: previous.optimalLineupVsLHPWithoutDH ?? null,
  }) !== JSON.stringify({
    lineupWithDH: next.lineupWithDH ?? [],
    lineupWithoutDH: next.lineupWithoutDH ?? [],
    startingRotation: next.startingRotation ?? [],
    optimalLineupVsRHPWithDH: next.optimalLineupVsRHPWithDH ?? null,
    optimalLineupVsLHPWithDH: next.optimalLineupVsLHPWithDH ?? null,
    optimalLineupVsRHPWithoutDH: next.optimalLineupVsRHPWithoutDH ?? null,
    optimalLineupVsLHPWithoutDH: next.optimalLineupVsLHPWithoutDH ?? null,
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || 'trade execution failed');
}

function buildTeamReport(
  team: Team,
  players: Player[],
  farmRecords: FranchiseFarmRecord[],
): FranchiseTradeTeamFitReport {
  const teamPlayers = playersForTeam(players, team.id);
  const mlbCount = teamPlayers.filter((player) => rosterStatusForPlayer(player, team.id) === 'MLB').length;
  const farmCount = farmRecordsForTeam(farmRecords, team.id).length;
  const { needs, surpluses } = buildNeedSurplus(teamPlayers);
  const limitations = [
    'Trade AI, final acceptance, roster movement, transactions, morale/chemistry effects, injuries, and salary enforcement are deferred.',
  ];

  if (farmCount === 0) {
    limitations.push('No franchise-owned farm records were found for this team; farm trade-fit confidence is limited.');
  }
  if (teamPlayers.some((player) => positionsForPlayer(player).length === 0)) {
    limitations.push('One or more eligible players are missing position data; trade-fit position confidence is limited.');
  }

  const evidence = [
    `Eligible MLB players: ${mlbCount}.`,
    `Franchise farm records: ${farmCount}.`,
    `Detected ${needs.length} roster needs and ${surpluses.length} roster surplus areas.`,
  ];

  return {
    teamId: team.id,
    teamName: teamName(team),
    mlbCount,
    farmCount,
    needs,
    surpluses,
    eligibleTradePlayerIds: teamPlayers.map((player) => player.id),
    riskLevel: riskLevelFor(needs, limitations),
    trustLevel: trustLevelFor(limitations),
    evidence,
    limitations,
  };
}

function candidatePlayersForRole(players: Player[], teamId: string, role: string): FranchiseTradePlayerPreview[] {
  const target = ROLE_TARGETS.find((row) => row.role === role);
  if (!target) return [];
  return playersForTeam(players, teamId)
    .filter((player) => positionsForPlayer(player).some((position) => target.positions.includes(position)))
    .slice(0, 3)
    .map((player) => buildPlayerPreview(player, teamId));
}

function buildFitPreviews(
  reports: FranchiseTradeTeamFitReport[],
  teams: Team[],
  players: Player[],
): FranchiseTradeFitPreview[] {
  const teamNames = new Map(teams.map((team) => [team.id, teamName(team)]));
  const previews: FranchiseTradeFitPreview[] = [];

  for (const source of reports) {
    for (const surplus of source.surpluses) {
      const targets = reports.filter((report) =>
        report.teamId !== source.teamId &&
        report.needs.some((need) => need.role === surplus.role),
      );
      for (const target of targets) {
        const matchingNeed = target.needs.find((need) => need.role === surplus.role);
        if (!matchingNeed) continue;
        const candidatePlayers = candidatePlayersForRole(players, source.teamId, surplus.role);
        previews.push({
          id: `trade-fit-${source.teamId}-${target.teamId}-${surplus.role.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          sourceTeamId: source.teamId,
          sourceTeamName: teamNames.get(source.teamId) ?? source.teamId,
          targetTeamId: target.teamId,
          targetTeamName: teamNames.get(target.teamId) ?? target.teamId,
          role: surplus.role,
          sourceSurplus: surplus.surplus,
          targetGap: matchingNeed.gap,
          candidatePlayerIds: candidatePlayers.map((player) => player.playerId),
          riskLevel: matchingNeed.severity === 'high' ? 'high' : 'medium',
          trustLevel: candidatePlayers.length > 0 ? 'medium' : 'low',
          evidence: [
            `${source.teamName} has ${surplus.surplus} surplus in ${surplus.role}.`,
            `${target.teamName} has a ${matchingNeed.gap} player gap in ${surplus.role}.`,
            'This is a non-executable trade-fit preview only.',
          ],
          limitations: [
            'No trade AI, acceptance, movement, transaction, salary, morale, chemistry, or injury logic is executed.',
          ],
          nonExecutable: true,
        });
      }
    }
  }

  return previews.slice(0, 12);
}

function validateStatsScope(
  report: FranchiseOffseasonScopeValidationReport,
  context: Partial<FranchiseOffseasonAdapterContext>,
): void {
  if (!context.statsScopeId || context.statsScopeId.trim().length === 0) {
    report.issues.push(
      makeIssue(
        'MISSING_STATS_SCOPE_ID',
        'Franchise trade dry-run requires a canonical statsScopeId.',
        context,
      ),
    );
    report.valid = false;
    return;
  }

  if (context.seasonId && context.statsScopeId !== context.seasonId) {
    report.issues.push(
      makeIssue(
        'STATS_SCOPE_MISMATCH',
        'Franchise trade dry-run statsScopeId must match the canonical franchise seasonId.',
        context,
        {
          details: {
            expectedStatsScopeId: context.seasonId,
            actualStatsScopeId: context.statsScopeId,
          },
        },
      ),
    );
    report.valid = false;
  }
}

function validateRequestedTrade(
  report: FranchiseOffseasonScopeValidationReport,
  context: Partial<FranchiseOffseasonAdapterContext>,
  input?: FranchiseTradeAdapterInput,
): FranchiseTradeRequestedPreview | undefined {
  const requested = input?.requestedTrade;
  if (!requested || !report.scope) return undefined;

  const teamsById = new Map(report.scope.teams.map((team) => [team.id, team]));
  const playersById = new Map(report.scope.players.map((player) => [player.id, player]));
  const outgoingPlayerIds = requestedOutgoingPlayerIds(requested);
  const incomingPlayerIds = requestedIncomingPlayerIds(requested);
  const evidence: string[] = [];
  const limitations = input?.apply
    ? ['Requested trade inputs are validated for manual execution only; trade AI and salary matching are not applied.']
    : ['Requested trade inputs are validated for preview only; no trade execution is performed.'];
  let valid = true;

  const addIssue = (
    code: FranchiseOffseasonAdapterIssue['code'],
    message: string,
    details?: Partial<FranchiseOffseasonAdapterIssue>,
  ) => {
    report.issues.push(makeIssue(code, message, context, details));
    report.valid = false;
    valid = false;
  };

  if (!requested.sourceTeamId || !teamsById.has(requested.sourceTeamId)) {
    addIssue(
      'TRADE_TEAM_NOT_FOUND',
      `Requested source trade team ${requested.sourceTeamId ?? '(missing)'} was not found in franchise-owned team storage.`,
      { teamId: requested.sourceTeamId },
    );
  }

  if (!requested.targetTeamId || !teamsById.has(requested.targetTeamId)) {
    addIssue(
      'TRADE_TEAM_NOT_FOUND',
      `Requested target trade team ${requested.targetTeamId ?? '(missing)'} was not found in franchise-owned team storage.`,
      { teamId: requested.targetTeamId },
    );
  }

  if (requested.sourceTeamId && requested.targetTeamId && requested.sourceTeamId === requested.targetTeamId) {
    addIssue(
      'TRADE_TEAM_MATCH_INVALID',
      'Requested trade source and target teams must be distinct.',
      { teamId: requested.sourceTeamId },
    );
  }

  const validatePlayer = (
    playerId: string | undefined,
    expectedTeamId: string | undefined,
    label: 'outgoing' | 'incoming',
  ): FranchiseTradePlayerPreview | undefined => {
    if (!playerId) {
      return undefined;
    }
    const player = playersById.get(playerId);
    if (!player) {
      addIssue(
        'TRADE_PLAYER_NOT_FOUND',
        `Requested ${label} trade player ${playerId} was not found in franchise-owned player storage.`,
        { playerId },
      );
      return undefined;
    }

    const actualTeamId = playerTeamId(player);
    if (expectedTeamId && actualTeamId !== expectedTeamId) {
      addIssue(
        'TRADE_PLAYER_TEAM_MISMATCH',
        `Requested ${label} trade player ${playerId} does not belong to expected team ${expectedTeamId}.`,
        {
          playerId,
          teamId: expectedTeamId,
          details: { actualTeamId },
        },
      );
    }

    const status = rosterStatusForPlayer(player, expectedTeamId ?? actualTeamId);
    if (!TRADE_ELIGIBLE_STATUSES.has(status)) {
      addIssue(
        'TRADE_PLAYER_STATUS_INVALID',
        `Requested ${label} trade player ${playerId} has ineligible roster status ${status}.`,
        {
          playerId,
          teamId: expectedTeamId,
          details: { rosterStatus: status },
        },
      );
    }

    evidence.push(`${label} player ${playerId} roster status: ${status}.`);
    return buildPlayerPreview(player, expectedTeamId ?? actualTeamId ?? '');
  };

  if (input?.apply && (outgoingPlayerIds.length === 0 || incomingPlayerIds.length === 0)) {
    addIssue(
      'TRADE_SELECTION_REQUIRED',
      'Manual franchise trade execution requires at least one selected player from each team.',
    );
  }

  const outgoingPlayers = outgoingPlayerIds.map((playerId) =>
    validatePlayer(playerId, requested.sourceTeamId, 'outgoing'),
  ).filter((player): player is FranchiseTradePlayerPreview => Boolean(player));
  const incomingPlayers = incomingPlayerIds.map((playerId) =>
    validatePlayer(playerId, requested.targetTeamId, 'incoming'),
  ).filter((player): player is FranchiseTradePlayerPreview => Boolean(player));

  return {
    sourceTeamId: requested.sourceTeamId,
    targetTeamId: requested.targetTeamId,
    outgoingPlayer: outgoingPlayers[0],
    incomingPlayer: incomingPlayers[0],
    valid,
    evidence,
    limitations,
    nonExecutable: true,
  };
}

async function validateTradeContext(
  context: Partial<FranchiseOffseasonAdapterContext>,
  input?: FranchiseTradeAdapterInput,
): Promise<{ report: FranchiseOffseasonScopeValidationReport; requestedPreview?: FranchiseTradeRequestedPreview }> {
  const report = await validateFranchiseOffseasonScope(context, {
    requireCurrentPhase: true,
    includeFarmRecords: true,
    includeTransitionJournals: true,
  });

  if (context.phase && context.phase !== 'TRADES') {
    report.issues.push(
      makeIssue(
        'OFFSEASON_PHASE_MISMATCH',
        'Trade dry-run requires the TRADES offseason phase.',
        context,
        { details: { requiredPhase: 'TRADES' } },
      ),
    );
    report.valid = false;
  }

  validateStatsScope(report, context);
  const requestedPreview = validateRequestedTrade(report, context, input);
  return { report, requestedPreview };
}

function buildData(
  teams: Team[],
  players: Player[],
  farmRecords: FranchiseFarmRecord[],
  requestedPreview?: FranchiseTradeRequestedPreview,
): FranchiseTradeAdapterData {
  const teamReports = teams
    .map((team) => buildTeamReport(team, players, farmRecords))
    .sort((a, b) => {
      const rank: Record<FranchiseTradeRiskLevel, number> = { high: 3, medium: 2, low: 1 };
      return rank[b.riskLevel] - rank[a.riskLevel] || a.teamId.localeCompare(b.teamId);
    });

  return {
    calculationVersion: FRANCHISE_TRADE_CALCULATION_VERSION,
    method: 'Read-only franchise-owned roster/farm trade-fit preview; use executeManualFranchiseTrade for explicit manual requestedTrade execution.',
    teamReports,
    fitPreviews: buildFitPreviews(teamReports, teams, players),
    requestedPreview,
    limitations: [
      'Manual execution is available only for explicit user-selected requestedTrade players.',
      'Dry-run preview does not move players or change roster, farm, team, or transaction state.',
      'No transactions, trade state, League Builder data, or franchise offseason state are written.',
      'Trade AI, final acceptance logic, chemistry, morale, injuries, and salary-cap enforcement are deferred.',
      'All fit previews are non-executable advisory previews.',
    ],
  };
}

function buildManualExecutionData(
  data: FranchiseTradeAdapterData,
  executedTrade?: FranchiseTradeExecutionSummary,
): FranchiseTradeAdapterData {
  return {
    ...data,
    executedTrade,
    method: 'Manual requestedTrade execution from franchise-owned roster/farm state; no trade AI, acceptance, morale/chemistry, injuries, or salary-cap enforcement are performed.',
    limitations: [
      'Manual execution moved only explicit user-selected requestedTrade players.',
      'Player identity, playerId-keyed history fields, and stats continuity are preserved on the player records.',
      'No trade AI, salary matching, morale/chemistry, injury, League Builder, or prototype trade-state writes are performed.',
    ],
  };
}

function emptyManualTradeScope(context: Partial<FranchiseOffseasonAdapterContext>): FranchiseOffseasonScopeValidationReport {
  return {
    valid: false,
    context,
    issues: [],
    scope: null,
  };
}

async function loadManualTradeScope(
  context: Partial<FranchiseOffseasonAdapterContext>,
): Promise<FranchiseOffseasonScopeValidationReport> {
  const report = emptyManualTradeScope(context);

  if (!context.franchiseId) {
    report.issues.push(makeIssue('MISSING_FRANCHISE_ID', 'Manual trade execution requires a franchiseId.', context));
  }
  if (!context.seasonId) {
    report.issues.push(makeIssue('MISSING_SEASON_ID', 'Manual trade execution requires a seasonId.', context));
  }
  if (!context.statsScopeId || context.statsScopeId.trim().length === 0) {
    report.issues.push(makeIssue('MISSING_STATS_SCOPE_ID', 'Manual trade execution requires a canonical statsScopeId.', context));
  }
  if (typeof context.seasonNumber !== 'number') {
    report.issues.push(makeIssue('MISSING_SEASON_NUMBER', 'Manual trade execution requires a seasonNumber.', context));
  }

  if (context.seasonId && context.statsScopeId && context.statsScopeId !== context.seasonId) {
    report.issues.push(
      makeIssue(
        'STATS_SCOPE_MISMATCH',
        'Manual trade execution statsScopeId must match the canonical franchise seasonId.',
        context,
        {
          details: {
            expectedStatsScopeId: context.seasonId,
            actualStatsScopeId: context.statsScopeId,
          },
        },
      ),
    );
  }

  if (report.issues.some((issue) => issue.severity === 'error')) {
    return report;
  }

  const fullContext = {
    franchiseId: context.franchiseId!,
    seasonId: context.seasonId!,
    statsScopeId: context.statsScopeId,
    seasonNumber: context.seasonNumber!,
    offseasonStateId: context.offseasonStateId ?? `manual-trade-${context.seasonId}`,
    phase: context.phase ?? 'TRADES',
  } satisfies FranchiseOffseasonAdapterContext;

  const [players, teams, farmRecords] = await Promise.all([
    getAllFranchisePlayers(fullContext.franchiseId),
    getAllFranchiseTeams(fullContext.franchiseId),
    getFranchiseFarmRecordsForSeason(fullContext.franchiseId, fullContext.seasonId),
  ]);

  return {
    valid: true,
    context: fullContext,
    issues: [],
    counts: {
      players: players.length,
      teams: teams.length,
      farmRecords: farmRecords.length,
      transitionJournals: 0,
    },
    scope: {
      context: fullContext,
      offseasonState: null,
      players,
      teams,
      farmRecords,
      seasonSummary: null,
      transitionJournals: [],
      phase11RosterLock: null,
    },
  };
}

async function rollbackManualTrade(params: {
  franchiseId: string;
  originalPlayers: Player[];
  originalTeams: Team[];
  originalFarmRecords: FranchiseFarmRecord[];
  createdFarmRecords: FranchiseFarmRecord[];
  deletedFarmRecords: FranchiseFarmRecord[];
  savedPlayerIds: Set<string>;
  savedTeamIds: Set<string>;
}): Promise<FranchiseTradeExecutionRollbackStatus> {
  const status: FranchiseTradeExecutionRollbackStatus = {
    attempted:
      params.savedPlayerIds.size > 0 ||
      params.savedTeamIds.size > 0 ||
      params.createdFarmRecords.length > 0 ||
      params.deletedFarmRecords.length > 0,
    success: true,
    errors: [],
  };

  for (const player of params.originalPlayers) {
    if (!params.savedPlayerIds.has(player.id)) continue;
    try {
      await saveFranchisePlayer(params.franchiseId, player);
    } catch (error) {
      status.success = false;
      status.errors.push(`player rollback failed for ${player.id}: ${errorMessage(error)}`);
    }
  }

  for (const record of params.createdFarmRecords) {
    try {
      await deleteFranchiseFarmRecord(
        record.franchiseId,
        record.seasonId,
        record.teamId,
        record.playerId,
      );
    } catch (error) {
      status.success = false;
      status.errors.push(`farm cleanup rollback failed for ${record.playerId}: ${errorMessage(error)}`);
    }
  }

  for (const record of params.originalFarmRecords) {
    if (!params.deletedFarmRecords.some((deleted) => deleted.id === record.id)) continue;
    try {
      await saveFranchiseFarmRecord(record);
    } catch (error) {
      status.success = false;
      status.errors.push(`farm restore rollback failed for ${record.playerId}: ${errorMessage(error)}`);
    }
  }

  for (const team of params.originalTeams) {
    if (!params.savedTeamIds.has(team.id)) continue;
    try {
      await saveFranchiseTeam(params.franchiseId, team);
    } catch (error) {
      status.success = false;
      status.errors.push(`team rollback failed for ${team.id}: ${errorMessage(error)}`);
    }
  }

  return status;
}

async function executeManualTrade(
  context: Partial<FranchiseOffseasonAdapterContext>,
  report: FranchiseOffseasonScopeValidationReport,
  requested: FranchiseTradeRequestedInput,
  data: FranchiseTradeAdapterData,
  transactionPhase: GamePhase = 'REGULAR_SEASON',
): Promise<FranchiseOffseasonAdapterResult<FranchiseTradeAdapterData>> {
  const franchiseId = context.franchiseId;
  const seasonId = context.seasonId;
  const statsScopeId = context.statsScopeId;
  const seasonNumber = context.seasonNumber;
  const sourceTeamId = requested.sourceTeamId;
  const targetTeamId = requested.targetTeamId;

  if (!franchiseId || !seasonId || !statsScopeId || typeof seasonNumber !== 'number' || !sourceTeamId || !targetTeamId || !report.scope) {
    return {
      success: false,
      dryRun: false,
      context,
      issues: report.issues,
      errorCode: report.issues.find((issue) => issue.severity === 'error')?.code ?? 'TRADE_WRITE_FAILED',
      message: 'Trade execution validation failed.',
      data: buildManualExecutionData(data),
    };
  }

  const outgoingIds = requestedOutgoingPlayerIds(requested);
  const incomingIds = requestedIncomingPlayerIds(requested);
  if (outgoingIds.length === 0 || incomingIds.length === 0) {
    const issue = makeIssue(
      'TRADE_SELECTION_REQUIRED',
      'Manual franchise trade execution requires at least one selected player from each team.',
      context,
    );
    return {
      success: false,
      dryRun: false,
      context,
      issues: [...report.issues, issue],
      errorCode: 'TRADE_SELECTION_REQUIRED',
      message: 'Trade execution requires player selections from both teams.',
      data: buildManualExecutionData(data),
    };
  }

  const playersById = new Map(report.scope.players.map((player) => [player.id, player]));
  const teamsById = new Map(report.scope.teams.map((team) => [team.id, team]));
  const farmRecords = report.scope.farmRecords ?? [];
  const selectedIds = [...outgoingIds, ...incomingIds];
  const selectedPlayers = selectedIds.map((playerId) => playersById.get(playerId)).filter((player): player is Player => Boolean(player));
  const sourceTeam = teamsById.get(sourceTeamId);
  const targetTeam = teamsById.get(targetTeamId);
  const validationIssues: FranchiseOffseasonAdapterIssue[] = [];

  if (!sourceTeam || !targetTeam || selectedPlayers.length !== selectedIds.length) {
    validationIssues.push(makeIssue('TRADE_WRITE_FAILED', 'Trade execution scope is missing one or more selected players or teams.', context));
  }

  for (const playerId of outgoingIds) {
    const player = playersById.get(playerId);
    const status = player ? rosterStatusForPlayer(player, sourceTeamId) : 'UNKNOWN';
    if (!player || assignmentIndexForTeam(player, sourceTeamId) < 0 || !TRADE_ELIGIBLE_STATUSES.has(status)) {
      validationIssues.push(makeIssue('TRADE_PLAYER_STATUS_INVALID', `Outgoing trade player ${playerId} is not eligible for manual execution.`, context, {
        playerId,
        teamId: sourceTeamId,
        details: { rosterStatus: status },
      }));
    }
    if (status === 'FARM' && !farmRecordForPlayer(farmRecords, sourceTeamId, playerId)) {
      validationIssues.push(makeIssue('FARM_RECORD_MISSING', `Outgoing FARM player ${playerId} is missing a scoped farm record.`, context, {
        playerId,
        teamId: sourceTeamId,
      }));
    }
  }

  for (const playerId of incomingIds) {
    const player = playersById.get(playerId);
    const status = player ? rosterStatusForPlayer(player, targetTeamId) : 'UNKNOWN';
    if (!player || assignmentIndexForTeam(player, targetTeamId) < 0 || !TRADE_ELIGIBLE_STATUSES.has(status)) {
      validationIssues.push(makeIssue('TRADE_PLAYER_STATUS_INVALID', `Incoming trade player ${playerId} is not eligible for manual execution.`, context, {
        playerId,
        teamId: targetTeamId,
        details: { rosterStatus: status },
      }));
    }
    if (status === 'FARM' && !farmRecordForPlayer(farmRecords, targetTeamId, playerId)) {
      validationIssues.push(makeIssue('FARM_RECORD_MISSING', `Incoming FARM player ${playerId} is missing a scoped farm record.`, context, {
        playerId,
        teamId: targetTeamId,
      }));
    }
  }

  if (validationIssues.length > 0) {
    return {
      success: false,
      dryRun: false,
      context,
      issues: [...report.issues, ...validationIssues],
      errorCode: validationIssues[0].code,
      message: 'Trade execution validation failed.',
      data: buildManualExecutionData(data),
    };
  }

  const sourcePlayers = outgoingIds.map((playerId) => playersById.get(playerId)!);
  const targetPlayers = incomingIds.map((playerId) => playersById.get(playerId)!);
  const originalPlayers = [...sourcePlayers, ...targetPlayers];
  const originalTeams = [sourceTeam!, targetTeam!];
  const originalFarmRecords = [
    ...sourcePlayers.map((player) => farmRecordForPlayer(farmRecords, sourceTeamId, player.id)).filter((record): record is FranchiseFarmRecord => Boolean(record)),
    ...targetPlayers.map((player) => farmRecordForPlayer(farmRecords, targetTeamId, player.id)).filter((record): record is FranchiseFarmRecord => Boolean(record)),
  ];
  const savedPlayerIds = new Set<string>();
  const savedTeamIds = new Set<string>();
  const deletedFarmRecords: FranchiseFarmRecord[] = [];
  const createdFarmRecords: FranchiseFarmRecord[] = [];

  try {
    for (const player of sourcePlayers) {
      const saved = await saveFranchisePlayer(franchiseId, updatePlayerTradeAssignment(player, sourceTeamId, targetTeamId));
      savedPlayerIds.add(saved.id);
    }

    for (const player of targetPlayers) {
      const saved = await saveFranchisePlayer(franchiseId, updatePlayerTradeAssignment(player, targetTeamId, sourceTeamId));
      savedPlayerIds.add(saved.id);
    }

    const moveFarmRecord = async (record: FranchiseFarmRecord, toTeamId: string) => {
      await deleteFranchiseFarmRecord(record.franchiseId, record.seasonId, record.teamId, record.playerId);
      deletedFarmRecords.push(record);
      const created = await saveFranchiseFarmRecord({
        ...record,
        teamId: toTeamId,
      });
      createdFarmRecords.push(created);
    };

    for (const player of sourcePlayers) {
      const record = farmRecordForPlayer(farmRecords, sourceTeamId, player.id);
      if (record) await moveFarmRecord(record, targetTeamId);
    }

    for (const player of targetPlayers) {
      const record = farmRecordForPlayer(farmRecords, targetTeamId, player.id);
      if (record) await moveFarmRecord(record, sourceTeamId);
    }

    const updatedSourceTeam = cleanTeamPlayerReferences(sourceTeam!, outgoingIds);
    const updatedTargetTeam = cleanTeamPlayerReferences(targetTeam!, incomingIds);
    if (teamChanged(sourceTeam!, updatedSourceTeam)) {
      const saved = await saveFranchiseTeam(franchiseId, updatedSourceTeam);
      savedTeamIds.add(saved.id);
    }
    if (teamChanged(targetTeam!, updatedTargetTeam)) {
      const saved = await saveFranchiseTeam(franchiseId, updatedTargetTeam);
      savedTeamIds.add(saved.id);
    }

    const movedFarmPlayerIds = createdFarmRecords.map((record) => record.playerId);
    const transaction = await logMode2V1Transaction({
      type: 'trade',
      actor: 'USER',
      season: seasonNumber,
      gameNumber: null,
      phase: transactionPhase,
      franchiseId,
      seasonId,
      statsScopeId,
      data: {
        movementType: 'trade',
        transactionPhase,
        seasonNumber,
        sourceTeamId,
        targetTeamId,
        playerIds: selectedIds,
        playersFromSource: outgoingIds,
        playersFromTarget: incomingIds,
        movedFarmPlayerIds,
        sourcePlayers: sourcePlayers.map((player) => ({
          playerId: player.id,
          playerName: playerName(player),
          previousTeamId: sourceTeamId,
          newTeamId: targetTeamId,
          rosterStatus: rosterStatusForPlayer(player, sourceTeamId),
        })),
        targetPlayers: targetPlayers.map((player) => ({
          playerId: player.id,
          playerName: playerName(player),
          previousTeamId: targetTeamId,
          newTeamId: sourceTeamId,
          rosterStatus: rosterStatusForPlayer(player, targetTeamId),
        })),
      },
      previousState: {
        players: originalPlayers,
        teams: originalTeams,
        farmRecords: originalFarmRecords,
      },
    });

    const executedTrade: FranchiseTradeExecutionSummary = {
      transactionId: transaction.id,
      transaction,
      sourceTeamId,
      targetTeamId,
      playersFromSource: outgoingIds,
      playersFromTarget: incomingIds,
      movedFarmPlayerIds,
    };

    return {
      success: true,
      dryRun: false,
      context,
      issues: report.issues,
      data: buildManualExecutionData(data, executedTrade),
      message: 'Manual franchise trade executed.',
    };
  } catch (error) {
    const rollbackStatus = await rollbackManualTrade({
      franchiseId,
      originalPlayers,
      originalTeams,
      originalFarmRecords,
      createdFarmRecords,
      deletedFarmRecords,
      savedPlayerIds,
      savedTeamIds,
    });
    const issue = makeIssue(
      rollbackStatus.success ? 'TRADE_WRITE_FAILED' : 'TRADE_ROLLBACK_FAILED',
      errorMessage(error),
      context,
      {
        details: {
          rollbackStatus,
        },
      },
    );

    return {
      success: false,
      dryRun: false,
      context,
      issues: [...report.issues, issue],
      errorCode: issue.code,
      message: errorMessage(error),
      data: buildManualExecutionData(data),
    };
  }
}

export const franchiseTradeDryRunAdapter: FranchiseOffseasonAdapter<
  FranchiseTradeAdapterInput,
  FranchiseTradeAdapterData
> = {
  id: 'franchise-trades-dry-run',
  phase: 'TRADES',
  description: 'Dry-run franchise offseason trade-fit preview from franchise-owned roster and farm records.',
  implemented: true,
  validate: async (context, input) => (await validateTradeContext(context, input)).report,
  async execute(context, input = {}) {
    const { report, requestedPreview } = await validateTradeContext(context, input);
    const dryRun = true;
    const data = buildData(
      report.scope?.teams ?? [],
      report.scope?.players ?? [],
      report.scope?.farmRecords ?? [],
      requestedPreview,
    );

    if (input.apply) {
      const issue = makeIssue(
        'TRADE_EXECUTION_NOT_IMPLEMENTED',
        'runFranchiseTradeDryRun is read-only; use executeManualFranchiseTrade for manual trade execution.',
        context,
      );
      return {
        success: false,
        dryRun,
        context,
        issues: [...report.issues, issue],
        errorCode: 'TRADE_EXECUTION_NOT_IMPLEMENTED',
        message: 'Trade dry-run is read-only.',
        data,
      };
    }

    if (!report.valid || !report.scope) {
      return {
        success: false,
        dryRun,
        context,
        issues: report.issues,
        errorCode: report.issues.find((issue) => issue.severity === 'error')?.code,
        message: 'Trade dry-run validation failed.',
        data,
      };
    }

    return {
      success: true,
      dryRun,
      context,
      issues: report.issues,
      data,
      message: 'Trade dry-run completed without writes.',
    };
  },
};

export async function runFranchiseTradeDryRun(
  context: Partial<FranchiseOffseasonAdapterContext>,
  input?: FranchiseTradeAdapterInput,
): Promise<FranchiseOffseasonAdapterResult<FranchiseTradeAdapterData>> {
  return franchiseTradeDryRunAdapter.execute(context, input);
}

export async function executeManualFranchiseTrade(
  context: Partial<FranchiseOffseasonAdapterContext>,
  input: ExecuteManualFranchiseTradeInput,
): Promise<FranchiseOffseasonAdapterResult<FranchiseTradeAdapterData>> {
  const report = await loadManualTradeScope(context);
  const requestedPreview = validateRequestedTrade(report, context, {
    apply: true,
    requestedTrade: input.requestedTrade,
  });
  const data = buildData(
    report.scope?.teams ?? [],
    report.scope?.players ?? [],
    report.scope?.farmRecords ?? [],
    requestedPreview,
  );

  if (!report.valid || !report.scope) {
    return {
      success: false,
      dryRun: false,
      context,
      issues: report.issues,
      errorCode: report.issues.find((issue) => issue.severity === 'error')?.code,
      message: 'Manual trade execution validation failed.',
      data: buildManualExecutionData(data),
    };
  }

  return executeManualTrade(
    context,
    report,
    input.requestedTrade,
    data,
    input.transactionPhase ?? 'REGULAR_SEASON',
  );
}
