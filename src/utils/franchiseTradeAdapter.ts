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
import type { Player, Team } from './franchisePlayerStorage';

export const FRANCHISE_TRADE_CALCULATION_VERSION = 'franchise-trades-v1-fit-preview-dry-run';

export type FranchiseTradeRiskLevel = 'low' | 'medium' | 'high';
export type FranchiseTradeTrustLevel = 'low' | 'medium' | 'high';
export type FranchiseTradeRosterStatus = 'MLB' | 'FARM' | 'FREE_AGENT' | 'RELEASED' | 'RETIRED' | 'INACTIVE' | 'UNASSIGNED' | 'UNKNOWN';

export interface FranchiseTradeRequestedInput {
  sourceTeamId?: string;
  targetTeamId?: string;
  outgoingPlayerId?: string;
  incomingPlayerId?: string;
}

export interface FranchiseTradeAdapterInput {
  dryRun?: boolean;
  apply?: boolean;
  requestedTrade?: FranchiseTradeRequestedInput;
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
  salary?: number;
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
  limitations: string[];
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
  return {
    playerId: player.id,
    playerName: playerName(player),
    teamId,
    rosterStatus: rosterStatusForPlayer(player, teamId),
    primaryPosition: primaryPosition(player),
    overallGrade: player.overallGrade,
    salary: typeof player.salary === 'number' ? player.salary : undefined,
  };
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
  const evidence: string[] = [];
  const limitations = ['Requested trade inputs are validated for preview only; no trade execution is available.'];
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
      if (label === 'outgoing') {
        addIssue('TRADE_PLAYER_NOT_FOUND', 'Requested trade preview requires an outgoing player id.');
      }
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

  const outgoingPlayer = validatePlayer(requested.outgoingPlayerId, requested.sourceTeamId, 'outgoing');
  const incomingPlayer = validatePlayer(requested.incomingPlayerId, requested.targetTeamId, 'incoming');

  return {
    sourceTeamId: requested.sourceTeamId,
    targetTeamId: requested.targetTeamId,
    outgoingPlayer,
    incomingPlayer,
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
    method: 'Dry-run only: franchise-owned roster/farm trade-fit preview; no trade AI, acceptance, execution, player movement, transactions, morale/chemistry, injuries, or salary-cap enforcement are performed.',
    teamReports,
    fitPreviews: buildFitPreviews(teamReports, teams, players),
    requestedPreview,
    limitations: [
      'No trade execution is implemented by this adapter.',
      'No players are moved and no roster or farm records are changed.',
      'No transactions, trade state, League Builder data, or franchise offseason state are written.',
      'Trade AI, final acceptance logic, chemistry, morale, injuries, and salary-cap enforcement are deferred.',
      'All fit previews are non-executable advisory previews.',
    ],
  };
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
        'ADAPTER_NOT_IMPLEMENTED',
        'Franchise trade execution is not implemented; this adapter is dry-run only.',
        context,
      );
      return {
        success: false,
        dryRun,
        context,
        issues: [...report.issues, issue],
        errorCode: 'ADAPTER_NOT_IMPLEMENTED',
        message: 'Trade adapter is dry-run only.',
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
