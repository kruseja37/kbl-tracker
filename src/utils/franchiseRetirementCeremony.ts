export const FRANCHISE_RETIREMENT_CEREMONY_VERSION = 'franchise-retirement-ceremony-v1-reverse-age-roll';

export type FranchiseRetirementCeremonyStatus =
  | 'MLB'
  | 'FARM'
  | 'FREE_AGENT'
  | 'UNASSIGNED'
  | 'RELEASED'
  | 'RETIRED'
  | 'INACTIVE'
  | 'UNKNOWN';

export type FranchiseRetirementCeremonyIssueSeverity = 'error' | 'warning' | 'info';

export interface FranchiseRetirementCeremonyContext {
  franchiseId: string;
  seasonId: string;
  seasonNumber: number;
  statsScopeId: string;
  offseasonStateId: string;
  phase: 'RETIREMENTS';
  seedNamespace: string;
}

export interface FranchiseRetirementCeremonyPlayer {
  playerId: string;
  displayName?: string;
  name?: string;
  age?: number | null;
  teamId?: string | null;
  rosterStatus?: string | null;
}

export interface FranchiseRetirementCeremonyFarmRecord {
  franchiseId?: string | null;
  seasonId?: string | null;
  seasonNumber?: number | null;
  teamId?: string | null;
  playerId?: string | null;
  rosterStatus?: string | null;
}

export interface FranchiseRetirementCeremonyInput {
  context: FranchiseRetirementCeremonyContext;
  seed: string;
  teamId?: string;
  revealIndex?: number;
  players: FranchiseRetirementCeremonyPlayer[];
  farmRecords?: FranchiseRetirementCeremonyFarmRecord[];
  stagedRetireeIds?: string[];
  methodVersion?: string;
}

export interface FranchiseRetirementCeremonyIssue {
  code: string;
  severity: FranchiseRetirementCeremonyIssueSeverity;
  message: string;
  playerId?: string;
  teamId?: string;
  details?: Record<string, unknown>;
}

export interface FranchiseRetirementCeremonyCandidate {
  playerId: string;
  playerName: string;
  teamId: string;
  age: number;
  rosterStatus: 'MLB' | 'FARM';
  ageRank: number;
  probability: number;
  evidence: string[];
}

export interface FranchiseRetirementCeremonyTeamPlan {
  teamId: string;
  candidates: FranchiseRetirementCeremonyCandidate[];
  candidatePoolHash: string;
  noRetirementWeight: number;
}

export interface FranchiseRetirementCeremonyReport {
  methodVersion: string;
  valid: boolean;
  issues: FranchiseRetirementCeremonyIssue[];
  warnings: FranchiseRetirementCeremonyIssue[];
  limitations: string[];
  candidates: FranchiseRetirementCeremonyCandidate[];
  teamPlans: FranchiseRetirementCeremonyTeamPlan[];
  selectedPlayerIds: string[];
}

export interface FranchiseRetirementCeremonyBucket {
  type: 'retiree' | 'no_retirement';
  start: number;
  end: number;
  weight: number;
  playerId?: string;
}

export interface FranchiseRetirementCeremonyRevealResult {
  methodVersion: string;
  valid: boolean;
  issues: FranchiseRetirementCeremonyIssue[];
  warnings: FranchiseRetirementCeremonyIssue[];
  limitations: string[];
  teamId: string;
  revealIndex: number;
  candidatePoolHash: string;
  seedHash: string;
  roll: number;
  revealBucket: FranchiseRetirementCeremonyBucket | null;
  outcome: { type: 'retiree'; playerId: string; candidate: FranchiseRetirementCeremonyCandidate } | { type: 'no_retirement' };
  candidates: FranchiseRetirementCeremonyCandidate[];
  buckets: FranchiseRetirementCeremonyBucket[];
  selectedPlayerIds: string[];
}

const DEFAULT_LIMITATIONS = [
  'Pure ceremony planner only: no storage writes are performed.',
  'Ceremony results are not persisted.',
  'No transactions are logged.',
  'No retirement is automatically applied.',
  'Jersey retirement, narrative/news, milestone, and replacement-player effects are not active.',
];

function makeIssue(
  code: string,
  severity: FranchiseRetirementCeremonyIssueSeverity,
  message: string,
  details?: Partial<FranchiseRetirementCeremonyIssue>,
): FranchiseRetirementCeremonyIssue {
  return { code, severity, message, ...details };
}

function normalizeStatus(status: unknown): FranchiseRetirementCeremonyStatus {
  if (status === 'MLB' || status === 'FARM' || status === 'FREE_AGENT' || status === 'UNASSIGNED') return status;
  if (status === 'RELEASED' || status === 'RETIRED' || status === 'INACTIVE') return status;
  return 'UNKNOWN';
}

function validNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function displayName(player: FranchiseRetirementCeremonyPlayer): string {
  const name = String(player.displayName ?? player.name ?? '').trim();
  return name || player.playerId;
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashHex(input: string): string {
  return hashString(input).toString(16).padStart(8, '0');
}

function seededRoll(seedHash: string): number {
  return Number(((parseInt(seedHash, 16) / 0x100000000) * 100).toFixed(2));
}

function probabilityForRank(ageRank: number, rosterSize: number): number {
  if (rosterSize <= 0) return 0;
  return Number(Math.max(5, 50 - ageRank * (45 / rosterSize)).toFixed(2));
}

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function validateContext(input: FranchiseRetirementCeremonyInput): FranchiseRetirementCeremonyIssue[] {
  const issues: FranchiseRetirementCeremonyIssue[] = [];
  const context = input.context ?? ({} as FranchiseRetirementCeremonyContext);

  if (!context.franchiseId || context.franchiseId.trim().length === 0) {
    issues.push(makeIssue('MISSING_FRANCHISE_ID', 'error', 'Franchise retirement ceremony requires franchiseId.'));
  }
  if (!context.seasonId || context.seasonId.trim().length === 0) {
    issues.push(makeIssue('MISSING_SEASON_ID', 'error', 'Franchise retirement ceremony requires canonical seasonId.'));
  }
  if (!validNumber(context.seasonNumber) || context.seasonNumber < 1) {
    issues.push(makeIssue('MISSING_SEASON_NUMBER', 'error', 'Franchise retirement ceremony requires a valid numeric seasonNumber.'));
  }
  if (!context.statsScopeId || context.statsScopeId.trim().length === 0) {
    issues.push(makeIssue('MISSING_STATS_SCOPE_ID', 'error', 'Franchise retirement ceremony requires statsScopeId.'));
  } else if (context.seasonId && context.statsScopeId !== context.seasonId) {
    issues.push(makeIssue('STATS_SCOPE_MISMATCH', 'error', 'Franchise retirement ceremony requires statsScopeId to match seasonId.', {
      details: { expectedStatsScopeId: context.seasonId, actualStatsScopeId: context.statsScopeId },
    }));
  }
  if (!context.offseasonStateId || context.offseasonStateId.trim().length === 0) {
    issues.push(makeIssue('MISSING_OFFSEASON_STATE_ID', 'error', 'Franchise retirement ceremony requires offseasonStateId.'));
  }
  if (context.phase !== 'RETIREMENTS') {
    issues.push(makeIssue('INVALID_PHASE', 'error', 'Franchise retirement ceremony requires phase RETIREMENTS.', {
      details: { actualPhase: context.phase ?? null },
    }));
  }
  if (!context.seedNamespace || context.seedNamespace.trim().length === 0) {
    issues.push(makeIssue('MISSING_SEED_NAMESPACE', 'error', 'Franchise retirement ceremony requires seedNamespace.'));
  }
  if (!input.seed || input.seed.trim().length === 0) {
    issues.push(makeIssue('MISSING_SEED', 'error', 'Franchise retirement ceremony requires a deterministic seed.'));
  }

  return issues;
}

function hasMatchingFarmRecord(
  player: FranchiseRetirementCeremonyPlayer,
  context: FranchiseRetirementCeremonyContext,
  farmRecords: FranchiseRetirementCeremonyFarmRecord[],
): boolean {
  return farmRecords.some((record) =>
    record.franchiseId === context.franchiseId &&
    record.seasonId === context.seasonId &&
    record.seasonNumber === context.seasonNumber &&
    record.teamId === player.teamId &&
    record.playerId === player.playerId &&
    normalizeStatus(record.rosterStatus) === 'FARM',
  );
}

function getEligibleByTeam(input: FranchiseRetirementCeremonyInput, issues: FranchiseRetirementCeremonyIssue[]) {
  const context = input.context;
  const farmRecords = input.farmRecords ?? [];
  const stagedRetireeIds = new Set(input.stagedRetireeIds ?? []);
  const eligibleByTeam = new Map<string, FranchiseRetirementCeremonyPlayer[]>();

  for (const player of input.players ?? []) {
    const status = normalizeStatus(player.rosterStatus);
    const playerId = player.playerId || 'UNKNOWN_PLAYER';
    const teamId = String(player.teamId ?? '').trim();

    if (!player.playerId || !teamId || !validNumber(player.age)) {
      issues.push(makeIssue('DAMAGED_PLAYER', 'warning', `Player ${playerId} is missing required ceremony data.`, {
        playerId: player.playerId,
        teamId: teamId || undefined,
        details: { rosterStatus: player.rosterStatus ?? null, age: player.age ?? null },
      }));
      continue;
    }

    if (stagedRetireeIds.has(player.playerId)) {
      issues.push(makeIssue('PLAYER_ALREADY_STAGED', 'info', `Player ${player.playerId} is excluded because they are already staged for retirement.`, {
        playerId: player.playerId,
        teamId,
      }));
      continue;
    }

    if (status === 'MLB') {
      const players = eligibleByTeam.get(teamId) ?? [];
      players.push(player);
      eligibleByTeam.set(teamId, players);
      continue;
    }

    if (status === 'FARM') {
      if (hasMatchingFarmRecord(player, context, farmRecords)) {
        const players = eligibleByTeam.get(teamId) ?? [];
        players.push(player);
        eligibleByTeam.set(teamId, players);
      } else {
        issues.push(makeIssue('FARM_RECORD_MISSING', 'warning', `FARM player ${player.playerId} is excluded because no matching scoped farm record was supplied.`, {
          playerId: player.playerId,
          teamId,
        }));
      }
      continue;
    }

    issues.push(makeIssue('PLAYER_STATUS_EXCLUDED', status === 'UNKNOWN' ? 'warning' : 'info', `Player ${player.playerId} is excluded from the ceremony because roster status ${status} is not eligible.`, {
      playerId: player.playerId,
      teamId,
      details: { rosterStatus: status },
    }));
  }

  return eligibleByTeam;
}

function makeCandidates(teamId: string, players: FranchiseRetirementCeremonyPlayer[]): FranchiseRetirementCeremonyCandidate[] {
  return [...players]
    .sort((a, b) => {
      const ageDiff = Number(b.age) - Number(a.age);
      if (ageDiff !== 0) return ageDiff;
      return a.playerId.localeCompare(b.playerId);
    })
    .map((player, ageRank, orderedPlayers) => {
      const probability = probabilityForRank(ageRank, orderedPlayers.length);
      const status = normalizeStatus(player.rosterStatus) as 'MLB' | 'FARM';
      return {
        playerId: player.playerId,
        playerName: displayName(player),
        teamId,
        age: Number(player.age),
        rosterStatus: status,
        ageRank,
        probability,
        evidence: [
          `Age rank ${ageRank} uses zero-based reverse-age ordering.`,
          `Probability ${probability}% from max(5, 50 - ageRank * (45 / rosterSize)).`,
          status === 'FARM' ? 'Matching scoped farm record supplied.' : 'MLB roster status is R1-compatible.',
        ],
      };
    });
}

function candidatePoolHash(candidates: FranchiseRetirementCeremonyCandidate[]): string {
  return hashHex(candidates.map((candidate) => [
    candidate.playerId,
    candidate.teamId,
    candidate.age,
    candidate.rosterStatus,
    candidate.ageRank,
    candidate.probability,
  ].join(':')).join('|'));
}

function buildBuckets(candidates: FranchiseRetirementCeremonyCandidate[]): FranchiseRetirementCeremonyBucket[] {
  const candidateWeightSum = candidates.reduce((sum, candidate) => sum + candidate.probability, 0);
  const noRetirementWeight = Math.max(5, 100 - candidateWeightSum);
  const totalWeight = candidateWeightSum + noRetirementWeight;
  let cursor = 0;

  const buckets: FranchiseRetirementCeremonyBucket[] = candidates.map((candidate) => {
    const normalizedWeight = Number(((candidate.probability / totalWeight) * 100).toFixed(6));
    const bucket = {
      type: 'retiree' as const,
      start: cursor,
      end: Number((cursor + normalizedWeight).toFixed(6)),
      weight: candidate.probability,
      playerId: candidate.playerId,
    };
    cursor = bucket.end;
    return bucket;
  });

  buckets.push({
    type: 'no_retirement',
    start: cursor,
    end: 100,
    weight: noRetirementWeight,
  });

  return buckets;
}

function seedHashForReveal(input: FranchiseRetirementCeremonyInput, teamId: string, revealIndex: number, poolHash: string): string {
  const context = input.context;
  return hashHex([
    input.methodVersion ?? FRANCHISE_RETIREMENT_CEREMONY_VERSION,
    context.franchiseId,
    context.seasonId,
    context.seasonNumber,
    context.statsScopeId,
    context.offseasonStateId,
    context.phase,
    context.seedNamespace,
    input.seed,
    teamId,
    revealIndex,
    poolHash,
    sortedUnique(input.stagedRetireeIds ?? []).join(','),
  ].join('|'));
}

export function buildFranchiseRetirementCeremonyPlan(input: FranchiseRetirementCeremonyInput): FranchiseRetirementCeremonyReport {
  const methodVersion = input.methodVersion ?? FRANCHISE_RETIREMENT_CEREMONY_VERSION;
  const issues = validateContext(input);
  const eligibleByTeam = getEligibleByTeam(input, issues);
  const teamPlans = Array.from(eligibleByTeam.entries())
    .sort(([teamA], [teamB]) => teamA.localeCompare(teamB))
    .map(([teamId, players]) => {
      const candidates = makeCandidates(teamId, players);
      const buckets = buildBuckets(candidates);
      return {
        teamId,
        candidates,
        candidatePoolHash: candidatePoolHash(candidates),
        noRetirementWeight: buckets.find((bucket) => bucket.type === 'no_retirement')?.weight ?? 0,
      };
    });
  const candidates = teamPlans.flatMap((teamPlan) => teamPlan.candidates);

  return {
    methodVersion,
    valid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    warnings: issues.filter((issue) => issue.severity !== 'error'),
    limitations: [...DEFAULT_LIMITATIONS],
    candidates,
    teamPlans,
    selectedPlayerIds: [],
  };
}

export function revealFranchiseRetirementForTeam(input: FranchiseRetirementCeremonyInput): FranchiseRetirementCeremonyRevealResult {
  const methodVersion = input.methodVersion ?? FRANCHISE_RETIREMENT_CEREMONY_VERSION;
  const revealIndex = validNumber(input.revealIndex) && input.revealIndex >= 0 ? input.revealIndex : 0;
  const teamId = String(input.teamId ?? '').trim();
  const plan = buildFranchiseRetirementCeremonyPlan(input);
  const issues = [...plan.issues];

  if (!teamId) {
    issues.push(makeIssue('MISSING_TEAM_ID', 'error', 'Franchise retirement ceremony reveal requires teamId.'));
  }
  if (!validNumber(input.revealIndex) || input.revealIndex < 0) {
    issues.push(makeIssue('MISSING_REVEAL_INDEX', 'error', 'Franchise retirement ceremony reveal requires a non-negative revealIndex.'));
  }

  const teamPlan = plan.teamPlans.find((candidateTeamPlan) => candidateTeamPlan.teamId === teamId);
  if (!teamPlan && teamId) {
    issues.push(makeIssue('TEAM_HAS_NO_CANDIDATES', 'warning', `Team ${teamId} has no eligible retirement ceremony candidates.`, { teamId }));
  }

  const candidates = teamPlan?.candidates ?? [];
  const poolHash = candidatePoolHash(candidates);
  const seedHash = seedHashForReveal(input, teamId, revealIndex, poolHash);
  const roll = seededRoll(seedHash);
  const buckets = buildBuckets(candidates);
  const revealBucket = buckets.find((bucket) => roll >= bucket.start && roll < bucket.end) ?? buckets[buckets.length - 1] ?? null;
  const selectedCandidate = revealBucket?.type === 'retiree'
    ? candidates.find((candidate) => candidate.playerId === revealBucket.playerId)
    : undefined;
  const hasBlockingIssue = issues.some((issue) => issue.severity === 'error');
  const actionableRevealBucket = hasBlockingIssue && revealBucket?.type === 'retiree'
    ? buckets.find((bucket) => bucket.type === 'no_retirement') ?? null
    : revealBucket;
  const outcome = !hasBlockingIssue && selectedCandidate
    ? { type: 'retiree' as const, playerId: selectedCandidate.playerId, candidate: selectedCandidate }
    : { type: 'no_retirement' as const };

  return {
    methodVersion,
    valid: !hasBlockingIssue,
    issues,
    warnings: issues.filter((issue) => issue.severity !== 'error'),
    limitations: [...DEFAULT_LIMITATIONS],
    teamId,
    revealIndex,
    candidatePoolHash: poolHash,
    seedHash,
    roll,
    revealBucket: actionableRevealBucket,
    outcome,
    candidates,
    buckets,
    selectedPlayerIds: outcome.type === 'retiree' ? [outcome.playerId] : [],
  };
}
