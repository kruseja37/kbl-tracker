import {
  buildFranchiseValueInputRows,
  type BuildFranchiseValueInputRowsInput,
  type FranchiseValueInputReport,
  type FranchiseValueInputRow,
} from './franchiseValueInputs';
import {
  getFranchiseTrueValueRows,
  type FranchiseTrueValueRow,
} from './franchiseTrueValueStorage';

export const FRANCHISE_DESIGNATION_ELIGIBILITY_CONTRACT_VERSION = 'franchise-designation-eligibility-v1-readonly';

export type FranchiseDesignationEligibilityType =
  | 'TEAM_MVP'
  | 'ACE'
  | 'FAN_FAVORITE'
  | 'ALBATROSS'
  | 'CAPTAIN'
  | 'FAN_HOPEFUL'
  | 'CORNERSTONE';

export type FranchiseDesignationEligibilityStatus = 'eligible' | 'preview-only' | 'active' | 'blocked';

export type FranchiseDesignationV1PolicyStatus =
  | 'active'
  | 'blocked'
  | 'deferred';

export interface FranchiseDesignationV1Policy {
  designationType: FranchiseDesignationEligibilityType;
  status: FranchiseDesignationV1PolicyStatus;
  persistable: boolean;
  promptAuthority: 'eligibility-context-adapter' | 'explicit-trusted-bridge-input-only' | 'none';
  summary: string;
  blockers: string[];
}

export interface FranchiseDesignationEligibilityRecord {
  contractVersion: typeof FRANCHISE_DESIGNATION_ELIGIBILITY_CONTRACT_VERSION;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  playerId: string;
  playerName: string;
  teamId: string | null;
  rosterStatus: string | null;
  designationType: FranchiseDesignationEligibilityType;
  status: FranchiseDesignationEligibilityStatus;
  persistable: boolean;
  reasons: string[];
  limitations: string[];
  sourceInputs: {
    salaryBaselineAvailable: boolean;
    teamSalaryBaselineAvailable: boolean;
    seasonStatsAvailable: boolean;
    warPreviewInputAvailable: boolean;
    pitchingWarPreviewInputAvailable: boolean;
    totalWar: number | null;
    pitchingWar: number | null;
    teamMvpWarTrusted: boolean;
    aceWarTrusted: boolean;
    valueDesignationTrusted: boolean;
    wpaAvailable: boolean;
    wpaTrustedForFinalValue: false;
    trueValueAvailable: boolean;
    valueDelta: number | null;
    moraleAvailable: false;
    relationshipInputsAvailable: false;
    awardInputsFinalized: false;
    seedParkFactorsAvailable: boolean;
    parkAdjustedValueInputsAvailable: boolean;
    seasonMetadataAvailable: boolean;
  };
}

export interface FranchiseDesignationEligibilityReport {
  contractVersion: typeof FRANCHISE_DESIGNATION_ELIGIBILITY_CONTRACT_VERSION;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  valueInputContractVersion: string;
  generatedAt: number;
  records: FranchiseDesignationEligibilityRecord[];
  anyPersistable: boolean;
  limitations: string[];
}

const ALL_DESIGNATION_TYPES: FranchiseDesignationEligibilityType[] = [
  'TEAM_MVP',
  'ACE',
  'FAN_FAVORITE',
  'ALBATROSS',
  'CAPTAIN',
  'FAN_HOPEFUL',
  'CORNERSTONE',
];

type RankedDesignationType = 'TEAM_MVP' | 'ACE' | 'ALBATROSS';

type EligibilityValueRow = FranchiseValueInputRow & {
  trueValue?: number | null;
  contractValue?: number | null;
  valueDelta?: number | null;
};

interface RankedCandidate {
  key: string;
  row: FranchiseValueInputRow;
  score: number;
}

export const FRANCHISE_PITCHER_DESIGNATION_POSITIONS = new Set(['P', 'SP', 'RP', 'CP', 'SP/RP', 'TWO-WAY']);

export const FRANCHISE_DESIGNATION_V1_POLICY_MATRIX: readonly FranchiseDesignationV1Policy[] = [
  {
    designationType: 'TEAM_MVP',
    status: 'active',
    persistable: true,
    promptAuthority: 'none',
    summary: 'Ranked/selective active v1 designation for current MLB position players with positive trusted scoped WAR evidence.',
    blockers: [
      'Season-end locking/carryover remains blocked.',
      'Pitcher identities, including TWO-WAY in internal v1, route through ACE instead of TEAM_MVP.',
    ],
  },
  {
    designationType: 'ACE',
    status: 'active',
    persistable: true,
    promptAuthority: 'none',
    summary: 'Ranked/selective active v1 designation for current MLB pitcher identities with trusted pWAR >= 0.5.',
    blockers: [
      'Season-end locking/carryover remains blocked.',
      'ACE does not create salary, morale, relationship, award, or Mode 3 effects automatically.',
    ],
  },
  {
    designationType: 'FAN_FAVORITE',
    status: 'blocked',
    persistable: false,
    promptAuthority: 'explicit-trusted-bridge-input-only',
    summary: 'Blocked until trusted True Value/value-delta and fan attachment policy exist.',
    blockers: [
      'Canonical True Value/value-delta is unavailable.',
      'Fan attachment and durable designation state are not trusted for internal v1.',
    ],
  },
  {
    designationType: 'ALBATROSS',
    status: 'active',
    persistable: true,
    promptAuthority: 'none',
    summary: 'Ranked/selective active v1 designation for current MLB players with the worst negative trusted Value Delta on each team.',
    blockers: [
      'Season-end locking/carryover remains blocked.',
      'ALBATROSS does not create salary, morale, relationship, award, or Mode 3 effects automatically.',
    ],
  },
  {
    designationType: 'CAPTAIN',
    status: 'blocked',
    persistable: false,
    promptAuthority: 'none',
    summary: 'Blocked until hidden charisma/leadership safety policy is approved.',
    blockers: [
      'Hidden charisma/leadership safety is not approved.',
      'Relationship and morale amplification rules are deferred.',
    ],
  },
  {
    designationType: 'FAN_HOPEFUL',
    status: 'blocked',
    persistable: false,
    promptAuthority: 'explicit-trusted-bridge-input-only',
    summary: 'Blocked in eligibility until a visible-safe prospect source exists; hidden FARM truth must never be exposed.',
    blockers: [
      'Visible-safe prospect assignment source is not promoted into designation eligibility.',
      'Unrevealed FARM true ratings, true grade, hidden scout truth, and hidden personality modifiers are blocked.',
    ],
  },
  {
    designationType: 'CORNERSTONE',
    status: 'blocked',
    persistable: false,
    promptAuthority: 'explicit-trusted-bridge-input-only',
    summary: 'Blocked until durable designation state and roster-move consequence policy exist.',
    blockers: [
      'Durable designation state is not trusted.',
      'Roster-move consequence policy is deferred.',
    ],
  },
] as const;

export function franchiseDesignationV1Policy(
  designationType: FranchiseDesignationEligibilityType,
): FranchiseDesignationV1Policy {
  return FRANCHISE_DESIGNATION_V1_POLICY_MATRIX.find((policy) => policy.designationType === designationType)!;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function candidateKey(teamId: string | null, designationType: RankedDesignationType): string {
  return `${teamId ?? 'missing-team'}:${designationType}`;
}

function isPitcherPosition(position: string | null): boolean {
  return FRANCHISE_PITCHER_DESIGNATION_POSITIONS.has(String(position ?? '').trim().toUpperCase());
}

function rankedScore(row: EligibilityValueRow, designationType: RankedDesignationType): number | null {
  if (designationType === 'ALBATROSS') return row.valueDelta ?? null;
  if (designationType === 'ACE') return row.warPreviewValues.pitchingWar;
  return row.warPreviewValues.totalWar;
}

function rankingBlockers(row: EligibilityValueRow, designationType: RankedDesignationType): string[] {
  const reasons: string[] = [];
  const score = rankedScore(row, designationType);
  if (designationType === 'ALBATROSS') {
    if (score === null) {
      reasons.push('ALBATROSS active designation requires a numeric persisted Value Delta row, not only input readiness.');
    } else if (score >= 0) {
      reasons.push('ALBATROSS active designation requires negative team-relative Value Delta evidence.');
    }
    return reasons;
  }
  if (score === null) {
      reasons.push(`${designationType} active designation requires a numeric WAR value from scoped season stats, not only input readiness.`);
  } else if (designationType === 'ACE' && score < 0.5) {
    reasons.push('ACE active designation requires pitcher-specific positive pWAR of at least 0.5.');
  } else if (designationType === 'TEAM_MVP' && score <= 0) {
    reasons.push('TEAM_MVP active designation requires positive season/team-relative WAR evidence.');
  }
  if (designationType === 'TEAM_MVP' && isPitcherPosition(row.valuePosition)) {
    if (String(row.valuePosition ?? '').trim().toUpperCase() === 'TWO-WAY') {
      reasons.push('TWO-WAY players are routed as pitcher-only for internal v1 active designations; stricter two-way TEAM_MVP criteria are deferred.');
    } else {
      reasons.push('TEAM_MVP active designation is limited to position-player candidates in internal v1; pitcher recognition uses ACE.');
    }
  }
  return reasons;
}

function buildRankedCandidates(
  rows: EligibilityValueRow[],
  designationType: RankedDesignationType,
): Map<string, RankedCandidate> {
  const best = new Map<string, RankedCandidate>();
  for (const row of rows) {
    if (designationType === 'ALBATROSS') {
      if (valueDesignationBlockers(row, designationType).length > 0) continue;
    } else if (stableWarPreviewBlockers(row, designationType).length > 0) {
      continue;
    }
    if (rankingBlockers(row, designationType).length > 0) continue;
    const score = rankedScore(row, designationType);
    if (score === null) continue;
    const key = candidateKey(row.currentTeamId, designationType);
    const existing = best.get(key);
    if (!existing) {
      best.set(key, { key, row, score });
      continue;
    }
    const isBetter = designationType === 'ALBATROSS'
      ? score < existing.score
      : score > existing.score;
    if (isBetter || (score === existing.score && row.playerName.localeCompare(existing.row.playerName) < 0)) {
      best.set(key, { key, row, score });
    }
  }
  return best;
}

function hasSeasonMetadata(row: FranchiseValueInputRow): boolean {
  return row.seasonContext.gamesPerTeam !== null && row.seasonContext.inningsPerGame !== null;
}

function mlbBlockers(row: FranchiseValueInputRow): string[] {
  const reasons: string[] = [];
  if (!row.currentTeamId) {
    reasons.push('Current franchise team context is required before a designation can be evaluated.');
  }
  if (row.rosterStatus !== 'MLB') {
    reasons.push(`Current MLB roster status is required; found ${row.rosterStatus ?? 'unassigned/free-agent'}.`);
  }
  return reasons;
}

function sourceInputs(row: EligibilityValueRow): FranchiseDesignationEligibilityRecord['sourceInputs'] {
  return {
    salaryBaselineAvailable: row.salaryBaselineAvailable,
    teamSalaryBaselineAvailable: row.teamSalaryBaseline !== null,
    seasonStatsAvailable: row.seasonStatsAvailability.any,
    warPreviewInputAvailable: row.warInputAvailability.any,
    pitchingWarPreviewInputAvailable: row.warInputAvailability.pitchingWar,
    totalWar: row.warPreviewValues.totalWar,
    pitchingWar: row.warPreviewValues.pitchingWar,
    teamMvpWarTrusted: row.warConsumerTrust?.teamMvpDesignations === true,
    aceWarTrusted: row.warConsumerTrust?.aceDesignations === true,
    valueDesignationTrusted: row.warConsumerTrust?.fanFavoriteAlbatrossDesignations === true,
    wpaAvailable: row.wpaInputAvailability.archiveBacked,
    wpaTrustedForFinalValue: false,
    trueValueAvailable: finiteNumber(row.trueValue) && finiteNumber(row.contractValue) && finiteNumber(row.valueDelta),
    valueDelta: finiteNumber(row.valueDelta) ? row.valueDelta : null,
    moraleAvailable: false,
    relationshipInputsAvailable: false,
    awardInputsFinalized: false,
    seedParkFactorsAvailable: row.parkFactorAvailability.seedParkFactorsAvailable,
    parkAdjustedValueInputsAvailable: row.parkFactorAvailability.parkAdjustedValueInputsAvailable,
    seasonMetadataAvailable: hasSeasonMetadata(row),
  };
}

function commonLimitations(row: EligibilityValueRow): string[] {
  const limitations = [...row.limitations];
  if (!row.parkFactorAvailability.seedParkFactorsAvailable || !row.parkFactorAvailability.parkAdjustedValueInputsAvailable) {
    limitations.push('Park-factor state is not trusted for final designation or value output in internal v1.');
  }
  if (row.teamSalaryBaseline === null) {
    limitations.push('Team payroll baseline is unavailable for salary/value designation checks.');
  }
  if (!hasSeasonMetadata(row)) {
    limitations.push('Stored games-per-team and innings metadata are required for stable designation lifecycle decisions.');
  }
  return unique(limitations);
}

function stableWarPreviewBlockers(row: EligibilityValueRow, type: 'TEAM_MVP' | 'ACE'): string[] {
  const reasons = [...mlbBlockers(row)];
  const consumerTrust = row.warConsumerTrust;
  if (!hasSeasonMetadata(row)) {
    reasons.push('Stored season length and innings metadata are missing, so WAR-like inputs are not stable enough for active designation promotion.');
  }
  if (!row.seasonStatsAvailability.any) {
    reasons.push('Franchise season stat rows are required for active designation promotion.');
  }
  if (type === 'TEAM_MVP' && !row.warInputAvailability.any) {
    reasons.push('TEAM_MVP active designation requires WAR-like season inputs.');
  }
  if (type === 'ACE' && !row.warInputAvailability.pitchingWar) {
    reasons.push('ACE active designation requires pitching WAR-like season inputs.');
  }
  if (type === 'TEAM_MVP' && consumerTrust?.teamMvpDesignations !== true) {
    reasons.push('TEAM_MVP active designation requires the explicit scoped WAR consumer-trust gate for designation inputs.');
  }
  if (type === 'ACE' && consumerTrust?.aceDesignations !== true) {
    reasons.push('ACE active designation requires the explicit scoped pitching-WAR consumer-trust gate for designation inputs.');
  }
  if (!consumerTrust) {
    reasons.push('Explicit WAR consumer trust contract is missing from the value input row.');
  } else if ((type === 'TEAM_MVP' && !consumerTrust.teamMvpDesignations) || (type === 'ACE' && !consumerTrust.aceDesignations)) {
    reasons.push(...consumerTrust.blockers);
  }
  return reasons;
}

function classifyTeamMvpOrAce(
  row: EligibilityValueRow,
  designationType: 'TEAM_MVP' | 'ACE',
  rankedCandidates: Map<string, RankedCandidate>,
): Pick<FranchiseDesignationEligibilityRecord, 'status' | 'reasons'> {
  const blockers = stableWarPreviewBlockers(row, designationType);
  if (blockers.length > 0) {
    return { status: 'blocked', reasons: blockers };
  }
  const rankingReasons = rankingBlockers(row, designationType);
  if (rankingReasons.length > 0) {
    return { status: 'blocked', reasons: rankingReasons };
  }
  const rankedCandidate = rankedCandidates.get(candidateKey(row.currentTeamId, designationType));
  if (!rankedCandidate || rankedCandidate.row.playerId !== row.playerId) {
    return {
      status: 'blocked',
      reasons: [
      `${designationType} active designation is ranked/selective; this input-ready player is not the top trusted team candidate.`,
      ],
    };
  }

  return {
    status: 'active',
    reasons: [
      `${designationType} ranked active v1 designation has positive team-relative performance evidence and scoped WAR consumer trust.`,
      'Season-end locking/carryover, awards, morale mutation, relationships, salary movement, and Mode 3 remain blocked.',
    ],
  };
}

function valueDesignationBlockers(
  row: EligibilityValueRow,
  designationType: 'FAN_FAVORITE' | 'ALBATROSS',
): string[] {
  const reasons = [...mlbBlockers(row)];
  if (!row.salaryBaselineAvailable) {
    reasons.push('Stable player salary baseline is required for value-delta designations.');
  }
  if (row.teamSalaryBaseline === null) {
    reasons.push('Team payroll baseline is required for salary/value designation context.');
  }
  if (!finiteNumber(row.trueValue) || !finiteNumber(row.contractValue) || !finiteNumber(row.valueDelta)) {
    reasons.push(`${designationType} requires persisted canonical True Value and Value Delta rows.`);
  }
  if (designationType === 'ALBATROSS' && row.warConsumerTrust?.fanFavoriteAlbatrossDesignations !== true) {
    reasons.push('ALBATROSS active designation requires D6 trusted-value artifact membership with at least two MLB peers.');
  }
  if (designationType === 'FAN_FAVORITE') {
    reasons.push('FAN_FAVORITE requires the morale-gated value-designation trust path; D7b only de-gates Albatross.');
    reasons.push('FAN_FAVORITE also depends on fan/morale systems that are not canonical in internal v1.');
  }
  return reasons;
}

function classifyAlbatross(
  row: EligibilityValueRow,
  rankedCandidates: Map<string, RankedCandidate>,
): Pick<FranchiseDesignationEligibilityRecord, 'status' | 'reasons'> {
  const blockers = valueDesignationBlockers(row, 'ALBATROSS');
  if (blockers.length > 0) {
    return { status: 'blocked', reasons: blockers };
  }
  const rankingReasons = rankingBlockers(row, 'ALBATROSS');
  if (rankingReasons.length > 0) {
    return { status: 'blocked', reasons: rankingReasons };
  }
  const rankedCandidate = rankedCandidates.get(candidateKey(row.currentTeamId, 'ALBATROSS'));
  if (!rankedCandidate || rankedCandidate.row.playerId !== row.playerId) {
    return {
      status: 'blocked',
      reasons: [
        'ALBATROSS active designation is ranked/selective; this input-ready player is not the worst trusted team Value Delta candidate.',
      ],
    };
  }

  return {
    status: 'active',
    reasons: [
      'ALBATROSS ranked active v1 designation has negative team-relative Value Delta evidence and D6 scoped trusted-value artifact membership.',
      'Season-end locking/carryover, awards, morale mutation, relationships, salary movement, and Mode 3 remain blocked.',
    ],
  };
}

function deferredNarrativeBlockers(designationType: 'CAPTAIN' | 'FAN_HOPEFUL' | 'CORNERSTONE'): string[] {
  if (designationType === 'CAPTAIN') {
    return [
      'CAPTAIN is blocked until hidden charisma/leadership safety policy is approved.',
      'Morale amplification, relationship, and historical designation inputs are not canonical in internal v1.',
    ];
  }
  if (designationType === 'FAN_HOPEFUL') {
    return [
      'FAN_HOPEFUL is blocked in eligibility until a visible-safe prospect assignment source is promoted.',
      'Unrevealed FARM true ratings, true grade, hidden scout truth, and hidden personality modifiers remain blocked.',
    ];
  }
  return [
    'CORNERSTONE is blocked until durable designation state and roster-move consequence policy are trusted.',
    'Future value, contract trajectory, morale, relationship, True Value, and awards inputs are unavailable for final designation persistence.',
  ];
}

function classifyDesignation(
  row: EligibilityValueRow,
  designationType: FranchiseDesignationEligibilityType,
  rankedCandidates: Map<string, RankedCandidate>,
): Pick<FranchiseDesignationEligibilityRecord, 'status' | 'reasons'> {
  if (designationType === 'TEAM_MVP' || designationType === 'ACE') {
    return classifyTeamMvpOrAce(row, designationType, rankedCandidates);
  }
  if (designationType === 'ALBATROSS') {
    return classifyAlbatross(row, rankedCandidates);
  }
  if (designationType === 'FAN_FAVORITE') {
    return { status: 'blocked', reasons: valueDesignationBlockers(row, designationType) };
  }
  return { status: 'blocked', reasons: [...mlbBlockers(row), ...deferredNarrativeBlockers(designationType)] };
}

function recordFor(
  row: EligibilityValueRow,
  designationType: FranchiseDesignationEligibilityType,
  rankedCandidates: Map<string, RankedCandidate>,
): FranchiseDesignationEligibilityRecord {
  const classification = classifyDesignation(row, designationType, rankedCandidates);
  return {
    contractVersion: FRANCHISE_DESIGNATION_ELIGIBILITY_CONTRACT_VERSION,
    franchiseId: row.franchiseId,
    seasonId: row.seasonId,
    statsScopeId: row.statsScopeId,
    seasonNumber: row.seasonNumber,
    playerId: row.playerId,
    playerName: row.playerName,
    teamId: row.currentTeamId,
    rosterStatus: row.rosterStatus,
    designationType,
    status: classification.status,
    persistable: classification.status === 'active' && (designationType === 'TEAM_MVP' || designationType === 'ACE' || designationType === 'ALBATROSS'),
    reasons: unique(classification.reasons),
    limitations: commonLimitations(row),
    sourceInputs: sourceInputs(row),
  };
}

export function classifyFranchiseDesignationEligibility(
  valueInputReport: FranchiseValueInputReport,
  trueValueRows: FranchiseTrueValueRow[] = [],
): FranchiseDesignationEligibilityReport {
  const trueValueByPlayer = new Map(trueValueRows.map((row) => [row.playerId, row]));
  const rows: EligibilityValueRow[] = valueInputReport.rows.map((row) => {
    const trueValue = trueValueByPlayer.get(row.playerId);
    return {
      ...row,
      trueValue: trueValue?.trueValue ?? null,
      contractValue: trueValue?.contractValue ?? null,
      valueDelta: trueValue?.valueDelta ?? null,
    };
  });
  const rankedCandidates = new Map<string, RankedCandidate>([
    ...buildRankedCandidates(rows, 'TEAM_MVP'),
    ...buildRankedCandidates(rows, 'ACE'),
    ...buildRankedCandidates(rows, 'ALBATROSS'),
  ]);
  const records = rows.flatMap((row) =>
    ALL_DESIGNATION_TYPES.map((designationType) => recordFor(row, designationType, rankedCandidates)),
  );

  return {
    contractVersion: FRANCHISE_DESIGNATION_ELIGIBILITY_CONTRACT_VERSION,
    franchiseId: valueInputReport.franchiseId,
    seasonId: valueInputReport.seasonId,
    statsScopeId: valueInputReport.statsScopeId,
    seasonNumber: valueInputReport.seasonNumber,
    valueInputContractVersion: valueInputReport.contractVersion,
    generatedAt: Date.now(),
    records,
    anyPersistable: records.some((record) => record.persistable),
    limitations: unique([
      ...valueInputReport.limitations,
      ...records.flatMap((record) => record.limitations),
      'Only TEAM_MVP, ACE, and ALBATROSS can persist as active v1 designations from trusted scoped input gates.',
      'Fan Favorite, Cornerstone, Captain, and Fan Hopeful remain blocked/deferred by policy matrix.',
      'TWO-WAY players are routed as pitcher-only for internal v1 designations and can only appear through ACE when pitcher evidence qualifies.',
    ]),
  };
}

export async function buildFranchiseDesignationEligibility(
  input: BuildFranchiseValueInputRowsInput,
): Promise<FranchiseDesignationEligibilityReport> {
  const valueInputReport = await buildFranchiseValueInputRows(input);
  const trueValueRows = await getFranchiseTrueValueRows({
    franchiseId: valueInputReport.franchiseId,
    seasonId: valueInputReport.seasonId,
    statsScopeId: valueInputReport.statsScopeId,
  });
  return classifyFranchiseDesignationEligibility(valueInputReport, trueValueRows);
}
