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

export const FRANCHISE_DRAFT_CALCULATION_VERSION = 'franchise-draft-v1-roster-readiness-dry-run';

export type FranchiseDraftUrgencyBand = 'unknown' | 'low' | 'medium' | 'high';
export type FranchiseDraftTrustLevel = 'low' | 'medium' | 'high';

export interface FranchiseDraftAdapterInput {
  dryRun?: boolean;
  apply?: boolean;
  teamIds?: string[];
}

export interface FranchiseDraftPositionNeed {
  role: string;
  currentCount: number;
  targetCount: number;
  source: 'MLB' | 'FARM' | 'COMBINED';
  severity: FranchiseDraftUrgencyBand;
}

export interface FranchiseDraftTeamReadinessReport {
  teamId: string;
  teamName: string;
  mlbCount: number;
  farmCount: number;
  totalCount: number;
  mlbVacancies: number;
  farmVacancies: number;
  farmOverage: number;
  totalVacancies: number;
  positionNeeds: FranchiseDraftPositionNeed[];
  draftUrgency: FranchiseDraftUrgencyBand;
  trustLevel: FranchiseDraftTrustLevel;
  evidence: string[];
  limitations: string[];
  draftClassPreviewUnavailable: true;
}

export interface FranchiseDraftAdapterData {
  calculationVersion: string;
  method: string;
  teamReports: FranchiseDraftTeamReadinessReport[];
  teamIds: string[];
  draftClassPreviewUnavailable: true;
  limitations: string[];
}

const MLB_TARGET = 22;
const FARM_TARGET = 10;
const TOTAL_TARGET = 32;

const POSITION_TARGETS: Array<{ role: string; positions: string[]; targetCount: number; source: 'MLB' | 'FARM' | 'COMBINED' }> = [
  { role: 'Catcher depth', positions: ['C'], targetCount: 2, source: 'COMBINED' },
  { role: 'Middle infield depth', positions: ['SS', '2B'], targetCount: 3, source: 'COMBINED' },
  { role: 'Corner infield depth', positions: ['1B', '3B'], targetCount: 3, source: 'COMBINED' },
  { role: 'Outfield depth', positions: ['LF', 'CF', 'RF'], targetCount: 5, source: 'COMBINED' },
  { role: 'Starting pitching depth', positions: ['SP'], targetCount: 5, source: 'COMBINED' },
  { role: 'Relief pitching depth', positions: ['RP', 'CP'], targetCount: 4, source: 'COMBINED' },
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

function primaryAssignment(player: Player) {
  return (player.leagueAssignments ?? []).find((assignment) =>
    assignment.teamId && assignment.rosterStatus !== 'FREE_AGENT',
  ) ?? (player.leagueAssignments ?? [])[0];
}

function positionsForPlayer(player: Player): string[] {
  const positions = [player.primaryPosition, player.secondaryPosition]
    .map((position) => String(position ?? '').trim().toUpperCase())
    .filter(Boolean);
  return Array.from(new Set(positions));
}

function issueSeverityForGap(gap: number): FranchiseDraftUrgencyBand {
  if (gap >= 3) return 'high';
  if (gap >= 1) return 'medium';
  return 'low';
}

function draftUrgencyForReport(input: {
  mlbVacancies: number;
  farmVacancies: number;
  farmOverage: number;
  positionNeeds: FranchiseDraftPositionNeed[];
  limitations: string[];
}): FranchiseDraftUrgencyBand {
  if (input.limitations.some((limitation) => limitation.includes('No franchise-owned farm records'))) {
    return 'unknown';
  }
  if (
    input.farmVacancies >= 4 ||
    input.mlbVacancies >= 3 ||
    input.positionNeeds.some((need) => need.severity === 'high')
  ) {
    return 'high';
  }
  if (
    input.farmVacancies > 0 ||
    input.mlbVacancies > 0 ||
    input.farmOverage > 0 ||
    input.positionNeeds.length > 0
  ) {
    return 'medium';
  }
  return 'low';
}

function trustLevelForReport(limitations: string[]): FranchiseDraftTrustLevel {
  if (limitations.length >= 3) return 'low';
  if (limitations.length > 0) return 'medium';
  return 'high';
}

function validateRequestedTeamIds(
  report: FranchiseOffseasonScopeValidationReport,
  context: Partial<FranchiseOffseasonAdapterContext>,
  input?: FranchiseDraftAdapterInput,
): void {
  if (!input?.teamIds?.length || !report.scope) return;

  const teamIds = new Set(report.scope.teams.map((team) => team.id));
  for (const teamId of Array.from(new Set(input.teamIds))) {
    if (!teamIds.has(teamId)) {
      report.issues.push(
        makeIssue(
          'TEAM_NOT_FOUND',
          `Requested draft team ${teamId} was not found in franchise-owned team storage.`,
          context,
          { teamId },
        ),
      );
      report.valid = false;
    }
  }
}

async function validateDraftContext(
  context: Partial<FranchiseOffseasonAdapterContext>,
  input?: FranchiseDraftAdapterInput,
): Promise<FranchiseOffseasonScopeValidationReport> {
  const report = await validateFranchiseOffseasonScope(context, {
    requireCurrentPhase: true,
    includeFarmRecords: true,
    includeTransitionJournals: true,
  });

  if (context.phase && context.phase !== 'DRAFT') {
    report.issues.push(
      makeIssue(
        'OFFSEASON_PHASE_MISMATCH',
        'Draft dry-run requires the DRAFT offseason phase.',
        context,
        { details: { requiredPhase: 'DRAFT' } },
      ),
    );
    report.valid = false;
  }

  validateRequestedTeamIds(report, context, input);
  return report;
}

function playersForTeam(players: Player[], teamId: string, rosterStatus: string): Player[] {
  return players.filter((player) =>
    (player.leagueAssignments ?? []).some((assignment) =>
      assignment.teamId === teamId && assignment.rosterStatus === rosterStatus,
    ),
  );
}

function farmRecordsForTeam(records: FranchiseFarmRecord[], teamId: string): FranchiseFarmRecord[] {
  return records.filter((record) => record.teamId === teamId);
}

function buildPositionNeeds(players: Player[]): FranchiseDraftPositionNeed[] {
  const positionCounts = new Map<string, number>();
  for (const player of players) {
    for (const position of positionsForPlayer(player)) {
      positionCounts.set(position, (positionCounts.get(position) ?? 0) + 1);
    }
  }

  return POSITION_TARGETS
    .map((target) => {
      const currentCount = target.positions.reduce(
        (total, position) => total + (positionCounts.get(position) ?? 0),
        0,
      );
      const gap = Math.max(0, target.targetCount - currentCount);
      if (gap <= 0) return null;
      return {
        role: target.role,
        currentCount,
        targetCount: target.targetCount,
        source: target.source,
        severity: issueSeverityForGap(gap),
      } satisfies FranchiseDraftPositionNeed;
    })
    .filter((need): need is FranchiseDraftPositionNeed => Boolean(need));
}

function buildTeamReport(
  team: Team,
  players: Player[],
  farmRecords: FranchiseFarmRecord[],
): FranchiseDraftTeamReadinessReport {
  const mlbPlayers = playersForTeam(players, team.id, 'MLB');
  const farmPlayers = playersForTeam(players, team.id, 'FARM');
  const teamFarmRecords = farmRecordsForTeam(farmRecords, team.id);
  const farmCount = teamFarmRecords.length;
  const totalCount = mlbPlayers.length + farmCount;
  const mlbVacancies = Math.max(0, MLB_TARGET - mlbPlayers.length);
  const farmVacancies = Math.max(0, FARM_TARGET - farmCount);
  const farmOverage = Math.max(0, farmCount - FARM_TARGET);
  const totalVacancies = Math.max(0, TOTAL_TARGET - totalCount);
  const rosterPlayers = [...mlbPlayers, ...farmPlayers];
  const positionNeeds = buildPositionNeeds(rosterPlayers);
  const evidence: string[] = [
    `MLB roster count: ${mlbPlayers.length}/${MLB_TARGET}.`,
    `Farm record count: ${farmCount}/${FARM_TARGET}.`,
    `Total roster count: ${totalCount}/${TOTAL_TARGET}.`,
  ];
  const limitations: string[] = [
    'Draft class generation, pick execution, player replacement, and roster mutation are deferred.',
  ];

  if (teamFarmRecords.length === 0) {
    limitations.push('No franchise-owned farm records were found for this team; farm vacancy confidence is limited.');
  }

  if (farmPlayers.length !== teamFarmRecords.length) {
    limitations.push('Franchise player FARM assignments and farm records do not fully agree; readiness is advisory.');
  }

  const playersMissingPosition = rosterPlayers.filter((player) => positionsForPlayer(player).length === 0);
  if (playersMissingPosition.length > 0) {
    limitations.push('One or more franchise players are missing position data; position need confidence is limited.');
  }

  if (positionNeeds.length > 0) {
    evidence.push(`Detected ${positionNeeds.length} position/role needs for draft planning.`);
  } else {
    evidence.push('No position/role needs were detected by the v1 readiness heuristic.');
  }

  if (farmVacancies > 0) {
    evidence.push(`This team would need ${farmVacancies} draft/farm additions to reach 10 farm players.`);
  }

  const draftUrgency = draftUrgencyForReport({
    mlbVacancies,
    farmVacancies,
    farmOverage,
    positionNeeds,
    limitations,
  });

  return {
    teamId: team.id,
    teamName: teamName(team),
    mlbCount: mlbPlayers.length,
    farmCount,
    totalCount,
    mlbVacancies,
    farmVacancies,
    farmOverage,
    totalVacancies,
    positionNeeds,
    draftUrgency,
    trustLevel: trustLevelForReport(limitations),
    evidence,
    limitations,
    draftClassPreviewUnavailable: true,
  };
}

function buildData(
  teams: Team[],
  players: Player[],
  farmRecords: FranchiseFarmRecord[],
  input?: FranchiseDraftAdapterInput,
): FranchiseDraftAdapterData {
  const requestedTeamIds = input?.teamIds?.length ? new Set(input.teamIds) : null;
  const selectedTeams = requestedTeamIds
    ? teams.filter((team) => requestedTeamIds.has(team.id))
    : teams;
  const teamReports = selectedTeams
    .map((team) => buildTeamReport(team, players, farmRecords))
    .sort((a, b) => {
      const urgencyRank: Record<FranchiseDraftUrgencyBand, number> = {
        high: 3,
        medium: 2,
        low: 1,
        unknown: 0,
      };
      return urgencyRank[b.draftUrgency] - urgencyRank[a.draftUrgency] || a.teamId.localeCompare(b.teamId);
    });

  return {
    calculationVersion: FRANCHISE_DRAFT_CALCULATION_VERSION,
    method: 'Dry-run only: franchise-owned roster/farm readiness preview for draft planning; no draft class, picks, replacements, signings, releases, or roster writes are executed.',
    teamReports,
    teamIds: teamReports.map((report) => report.teamId),
    draftClassPreviewUnavailable: true,
    limitations: [
      'No draft decisions are finalized by this adapter.',
      'No prospects are generated or persisted.',
      'No players are drafted, released, signed, replaced, retired, or written.',
      'No transactions are logged.',
      'Draft class generation, pick execution, replacement rules, and post-draft salary recalculation are deferred.',
    ],
  };
}

export const franchiseDraftDryRunAdapter: FranchiseOffseasonAdapter<
  FranchiseDraftAdapterInput,
  FranchiseDraftAdapterData
> = {
  id: 'franchise-draft-dry-run',
  phase: 'DRAFT',
  description: 'Dry-run franchise draft readiness preview from franchise-owned roster and farm records.',
  implemented: true,
  validate: validateDraftContext,
  async execute(context, input = {}) {
    const validation = await validateDraftContext(context, input);
    const dryRun = true;
    const data = buildData(
      validation.scope?.teams ?? [],
      validation.scope?.players ?? [],
      validation.scope?.farmRecords ?? [],
      input,
    );

    if (input.apply) {
      const issue = makeIssue(
        'ADAPTER_NOT_IMPLEMENTED',
        'Franchise draft apply/commit is not implemented; this adapter is dry-run only.',
        context,
      );
      return {
        success: false,
        dryRun,
        context,
        issues: [...validation.issues, issue],
        errorCode: 'ADAPTER_NOT_IMPLEMENTED',
        message: 'Draft adapter is dry-run only.',
        data,
      };
    }

    if (!validation.valid || !validation.scope) {
      return {
        success: false,
        dryRun,
        context,
        issues: validation.issues,
        errorCode: validation.issues.find((issue) => issue.severity === 'error')?.code,
        message: 'Draft dry-run validation failed.',
        data,
      };
    }

    return {
      success: true,
      dryRun,
      context,
      issues: validation.issues,
      data,
      message: 'Draft dry-run completed without writes.',
    };
  },
};

export async function runFranchiseDraftDryRun(
  context: Partial<FranchiseOffseasonAdapterContext>,
  input?: FranchiseDraftAdapterInput,
): Promise<FranchiseOffseasonAdapterResult<FranchiseDraftAdapterData>> {
  return franchiseDraftDryRunAdapter.execute(context, input);
}
