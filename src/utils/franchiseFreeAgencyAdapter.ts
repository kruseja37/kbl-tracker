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
import type { Player } from './franchisePlayerStorage';

export const FRANCHISE_FREE_AGENCY_CALCULATION_VERSION = 'franchise-free-agency-v1-dice-board-dry-run';

export type FranchiseFreeAgencyRiskBand = 'unknown' | 'low' | 'medium' | 'high';
export type FranchiseFreeAgencyTrustLevel = 'low' | 'medium' | 'high';

export interface FranchiseFreeAgencyAdapterInput {
  dryRun?: boolean;
  apply?: boolean;
  playerIds?: string[];
  includeLowRisk?: boolean;
  protectedPlayerIdsByTeam?: Record<string, string>;
}

export interface FranchiseFreeAgencyCandidate {
  playerId: string;
  playerName: string;
  teamId?: string;
  rosterStatus: string;
  age?: number;
  salary?: number;
  overallGrade?: string;
  personality?: string;
  contractYears?: number;
  controlYears?: number;
  serviceYears?: number;
  diceValue?: number;
  probabilityScore: number | null;
  probabilityBand: FranchiseFreeAgencyRiskBand;
  trustLevel: FranchiseFreeAgencyTrustLevel;
  evidence: string[];
  limitations: string[];
  finalFreeAgencyModelDeferred: true;
}

export interface FranchiseFreeAgencyTeamPreview {
  teamId: string;
  eligiblePlayerCount: number;
  protectedPlayerId?: string;
  diceBoardPlayerIds: string[];
}

export interface FranchiseFreeAgencyAdapterData {
  calculationVersion: string;
  method: string;
  candidates: FranchiseFreeAgencyCandidate[];
  candidatePlayerIds: string[];
  teamPreviews: FranchiseFreeAgencyTeamPreview[];
  limitations: string[];
}

const DICE_ORDER = [7, 6, 8, 5, 9, 4, 10, 3, 11, 2, 12] as const;
const DICE_PROBABILITIES: Record<number, number> = {
  2: 2.78,
  3: 5.56,
  4: 8.33,
  5: 11.11,
  6: 13.89,
  7: 16.67,
  8: 13.89,
  9: 11.11,
  10: 8.33,
  11: 5.56,
  12: 2.78,
};

const GRADE_TIERS: Record<string, number> = {
  S: 11,
  'A+': 10,
  A: 9,
  'A-': 8,
  'B+': 7,
  B: 6,
  'B-': 5,
  'C+': 4,
  C: 3,
  'C-': 2,
  'D+': 1,
  D: 0,
};

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

function playerName(player: Player): string {
  const name = `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim();
  return name || player.id;
}

function numeric(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function extendedPlayer(player: Player): Player & Record<string, unknown> {
  return player as Player & Record<string, unknown>;
}

function primaryAssignment(player: Player) {
  return (player.leagueAssignments ?? []).find((assignment) =>
    assignment.teamId && assignment.rosterStatus !== 'FREE_AGENT',
  ) ?? (player.leagueAssignments ?? [])[0];
}

function assignmentForTeam(player: Player, teamId: string) {
  return (player.leagueAssignments ?? []).find((assignment) => assignment.teamId === teamId);
}

function gradeTier(player: Player): number {
  const grade = String(player.overallGrade ?? '').toUpperCase();
  return GRADE_TIERS[grade] ?? -1;
}

function riskBand(probability: number | null): FranchiseFreeAgencyRiskBand {
  if (probability === null) return 'unknown';
  if (probability >= 13.89) return 'high';
  if (probability >= 8.33) return 'medium';
  return 'low';
}

function trustLevel(
  probability: number | null,
  rosterStatus: string,
  limitations: string[],
): FranchiseFreeAgencyTrustLevel {
  if (probability === null || rosterStatus === 'UNKNOWN' || limitations.length > 2) return 'low';
  if (limitations.length > 0) return 'medium';
  return 'high';
}

function candidateFromPlayer(
  player: Player,
  diceValue: number | undefined,
  probability: number | null,
): FranchiseFreeAgencyCandidate {
  const assignment = primaryAssignment(player);
  const rosterStatus = String(assignment?.rosterStatus ?? 'UNKNOWN');
  const teamId = assignment?.teamId;
  const source = extendedPlayer(player);
  const age = numeric(player.age);
  const contractYears = numeric(source.contractYears) ?? numeric(source.yearsRemaining);
  const controlYears = numeric(source.controlYears);
  const serviceYears = numeric(source.serviceYears) ?? numeric(source.seasons) ?? numeric(source.yearsOfService);
  const morale = numeric(source.morale);
  const personality = typeof player.personality === 'string' ? player.personality : undefined;
  const limitations: string[] = [
    'Final destination selection, dice execution, player exchange, and movement are deferred.',
  ];
  const evidence: string[] = [];

  if (diceValue !== undefined && probability !== null) {
    evidence.push(`Spec dice board value ${diceValue} carries ${probability.toFixed(2)}% departure-roll probability.`);
  } else {
    limitations.push('Player is not currently mapped onto the top-11 free-agency dice board.');
  }

  if (!teamId) {
    limitations.push('Missing franchise team assignment limits team-scoped free-agency context.');
  } else {
    evidence.push(`Franchise team assignment: ${teamId}.`);
  }

  if (rosterStatus !== 'MLB') {
    limitations.push(`Roster status ${rosterStatus} is not MLB active; dry-run does not treat this as an executable free-agency candidate.`);
  } else {
    evidence.push('Roster status: MLB.');
  }

  if (player.overallGrade) {
    evidence.push(`Overall grade ${player.overallGrade} was used for dice-board ordering.`);
  } else {
    limitations.push('Missing overall grade lowers confidence in dice-board ordering.');
  }

  if (personality) {
    limitations.push('Personality destination rules are recognized but not executed in this dry-run.');
    evidence.push(`Personality marker present: ${personality}.`);
  } else {
    limitations.push('Missing personality/morale context prevents destination-style confidence.');
  }

  if (morale === undefined) {
    limitations.push('Morale data is unavailable; dry-run does not apply morale-based free-agency modifiers.');
  } else {
    limitations.push('Morale data is present but morale-based free-agency modifiers are deferred.');
  }

  if (contractYears === undefined && controlYears === undefined) {
    limitations.push('Contract/control years are unavailable; free-agency exposure is advisory only.');
  } else {
    evidence.push('Contract/control data is present as supporting context.');
  }

  if (serviceYears === undefined) {
    limitations.push('Service-time data is unavailable; dry-run does not infer free-agency eligibility.');
  } else {
    evidence.push(`${serviceYears} recorded service/seasons years are available as supporting context.`);
  }

  return {
    playerId: player.id,
    playerName: playerName(player),
    teamId,
    rosterStatus,
    age,
    salary: numeric(player.salary),
    overallGrade: player.overallGrade,
    personality,
    contractYears,
    controlYears,
    serviceYears,
    diceValue,
    probabilityScore: probability,
    probabilityBand: riskBand(probability),
    trustLevel: trustLevel(probability, rosterStatus, limitations),
    evidence,
    limitations,
    finalFreeAgencyModelDeferred: true,
  };
}

function validateRequestedPlayerIds(
  report: FranchiseOffseasonScopeValidationReport,
  context: Partial<FranchiseOffseasonAdapterContext>,
  input?: FranchiseFreeAgencyAdapterInput,
): void {
  if (!input?.playerIds?.length || !report.scope) return;

  const playerIds = new Set(report.scope.players.map((player) => player.id));
  for (const playerId of Array.from(new Set(input.playerIds))) {
    if (!playerIds.has(playerId)) {
      report.issues.push(
        makeIssue(
          'PLAYER_NOT_FOUND',
          `Requested player ${playerId} was not found in franchise-owned player storage.`,
          context,
          { playerId },
        ),
      );
      report.valid = false;
    }
  }
}

function validateProtectedPlayerReferences(
  report: FranchiseOffseasonScopeValidationReport,
  context: Partial<FranchiseOffseasonAdapterContext>,
  input?: FranchiseFreeAgencyAdapterInput,
): void {
  const protectedByTeam = input?.protectedPlayerIdsByTeam;
  if (!protectedByTeam || !report.scope) return;

  const teamIds = new Set(report.scope.teams.map((team) => team.id));
  const playersById = new Map(report.scope.players.map((player) => [player.id, player]));

  for (const [teamId, playerId] of Object.entries(protectedByTeam)) {
    const teamExists = teamIds.has(teamId);
    const player = playersById.get(playerId);

    if (!teamExists) {
      report.issues.push(
        makeIssue(
          'PROTECTED_TEAM_NOT_FOUND',
          `Protected team ${teamId} was not found in franchise-owned team storage.`,
          context,
          { teamId, playerId },
        ),
      );
      report.valid = false;
    }

    if (!player) {
      report.issues.push(
        makeIssue(
          'PROTECTED_PLAYER_NOT_FOUND',
          `Protected player ${playerId} was not found in franchise-owned player storage.`,
          context,
          { teamId, playerId },
        ),
      );
      report.valid = false;
      continue;
    }

    const assignment = assignmentForTeam(player, teamId);
    if (!assignment) {
      report.issues.push(
        makeIssue(
          'PROTECTED_PLAYER_TEAM_MISMATCH',
          `Protected player ${playerId} is not assigned to protected team ${teamId}.`,
          context,
          {
            teamId,
            playerId,
            details: {
              assignedTeams: (player.leagueAssignments ?? [])
                .map((playerAssignment) => playerAssignment.teamId)
                .filter(Boolean),
            },
          },
        ),
      );
      report.valid = false;
      continue;
    }

    if (assignment.rosterStatus !== 'MLB') {
      report.issues.push(
        makeIssue(
          'PROTECTED_PLAYER_STATUS_INVALID',
          `Protected player ${playerId} is not on the MLB active roster for team ${teamId}.`,
          context,
          {
            teamId,
            playerId,
            details: { actualRosterStatus: assignment.rosterStatus ?? 'UNKNOWN' },
          },
        ),
      );
      report.valid = false;
    }
  }
}

async function validateFreeAgencyContext(
  context: Partial<FranchiseOffseasonAdapterContext>,
  input?: FranchiseFreeAgencyAdapterInput,
): Promise<FranchiseOffseasonScopeValidationReport> {
  const report = await validateFranchiseOffseasonScope(context, {
    requireCurrentPhase: true,
    includeFarmRecords: true,
    includeTransitionJournals: true,
  });

  if (context.phase && context.phase !== 'FREE_AGENCY') {
    report.issues.push(
      makeIssue(
        'OFFSEASON_PHASE_MISMATCH',
        'Free-agency dry-run requires the FREE_AGENCY offseason phase.',
        context,
        { details: { requiredPhase: 'FREE_AGENCY' } },
      ),
    );
    report.valid = false;
  }

  validateRequestedPlayerIds(report, context, input);
  validateProtectedPlayerReferences(report, context, input);
  return report;
}

function buildData(
  players: Player[],
  input?: FranchiseFreeAgencyAdapterInput,
): FranchiseFreeAgencyAdapterData {
  const requestedPlayerIds = input?.playerIds?.length ? new Set(input.playerIds) : null;
  const protectedByTeam = input?.protectedPlayerIdsByTeam ?? {};
  const playersByTeam = new Map<string, Player[]>();
  const candidateById = new Map<string, FranchiseFreeAgencyCandidate>();
  const teamPreviews: FranchiseFreeAgencyTeamPreview[] = [];

  for (const player of players) {
    const assignment = primaryAssignment(player);
    if (!assignment?.teamId) {
      candidateById.set(player.id, candidateFromPlayer(player, undefined, null));
      continue;
    }

    if (assignment.rosterStatus !== 'MLB') {
      candidateById.set(player.id, candidateFromPlayer(player, undefined, null));
      continue;
    }

    const teamPlayers = playersByTeam.get(assignment.teamId) ?? [];
    teamPlayers.push(player);
    playersByTeam.set(assignment.teamId, teamPlayers);
  }

  for (const [teamId, teamPlayers] of playersByTeam.entries()) {
    const protectedPlayerId = protectedByTeam[teamId];
    const eligiblePlayers = teamPlayers
      .filter((player) => player.id !== protectedPlayerId)
      .sort((a, b) => gradeTier(b) - gradeTier(a) || playerName(a).localeCompare(playerName(b)))
      .slice(0, DICE_ORDER.length);

    teamPreviews.push({
      teamId,
      eligiblePlayerCount: eligiblePlayers.length,
      protectedPlayerId,
      diceBoardPlayerIds: eligiblePlayers.map((player) => player.id),
    });

    eligiblePlayers.forEach((player, index) => {
      const diceValue = DICE_ORDER[index];
      candidateById.set(
        player.id,
        candidateFromPlayer(player, diceValue, DICE_PROBABILITIES[diceValue]),
      );
    });
  }

  const selectedCandidates = Array.from(candidateById.values())
    .filter((candidate) => !requestedPlayerIds || requestedPlayerIds.has(candidate.playerId))
    .filter((candidate) =>
      input?.includeLowRisk ||
      candidate.probabilityBand === 'high' ||
      candidate.probabilityBand === 'medium' ||
      candidate.rosterStatus === 'UNKNOWN' ||
      Boolean(requestedPlayerIds?.has(candidate.playerId)),
    )
    .sort((a, b) => (b.probabilityScore ?? -1) - (a.probabilityScore ?? -1));

  return {
    calculationVersion: FRANCHISE_FREE_AGENCY_CALCULATION_VERSION,
    method: 'Dry-run only: spec-inspired top-11 team dice-board exposure preview using franchise-owned player/team/farm scope; no protection, roll, destination, exchange, or movement is executed.',
    candidates: selectedCandidates,
    candidatePlayerIds: selectedCandidates.map((candidate) => candidate.playerId),
    teamPreviews: teamPreviews.sort((a, b) => a.teamId.localeCompare(b.teamId)),
    limitations: [
      'No free-agent decisions are finalized by this adapter.',
      'No players are released, moved, exchanged, signed, retired, or written.',
      'No transactions are logged.',
      'Destination selection, dice-roll ceremony execution, return-player exchange, morale, contract, and narrative systems are deferred.',
    ],
  };
}

export const franchiseFreeAgencyDryRunAdapter: FranchiseOffseasonAdapter<
  FranchiseFreeAgencyAdapterInput,
  FranchiseFreeAgencyAdapterData
> = {
  id: 'franchise-free-agency-dry-run',
  phase: 'FREE_AGENCY',
  description: 'Dry-run franchise free-agency exposure preview from franchise-owned player records.',
  implemented: true,
  validate: validateFreeAgencyContext,
  async execute(context, input = {}) {
    const validation = await validateFreeAgencyContext(context, input);
    const dryRun = true;
    const data = buildData(validation.scope?.players ?? [], input);

    if (input.apply) {
      const issue = makeIssue(
        'ADAPTER_NOT_IMPLEMENTED',
        'Franchise free-agency apply/commit is not implemented; this adapter is dry-run only.',
        context,
      );
      return {
        success: false,
        dryRun,
        context,
        issues: [...validation.issues, issue],
        errorCode: 'ADAPTER_NOT_IMPLEMENTED',
        message: 'Free-agency adapter is dry-run only.',
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
        message: 'Free-agency dry-run validation failed.',
        data,
      };
    }

    return {
      success: true,
      dryRun,
      context,
      issues: validation.issues,
      data,
      message: 'Free-agency dry-run completed without writes.',
    };
  },
};

export async function runFranchiseFreeAgencyDryRun(
  context: Partial<FranchiseOffseasonAdapterContext>,
  input?: FranchiseFreeAgencyAdapterInput,
): Promise<FranchiseOffseasonAdapterResult<FranchiseFreeAgencyAdapterData>> {
  return franchiseFreeAgencyDryRunAdapter.execute(context, input);
}
