import {
  buildFranchiseValueInputRows,
  type BuildFranchiseValueInputRowsInput,
  type FranchiseValueInputReport,
  type FranchiseValueInputRow,
} from './franchiseValueInputs';

export const FRANCHISE_DESIGNATION_ELIGIBILITY_CONTRACT_VERSION = 'franchise-designation-eligibility-v1-readonly';

export type FranchiseDesignationEligibilityType =
  | 'TEAM_MVP'
  | 'ACE'
  | 'FAN_FAVORITE'
  | 'ALBATROSS'
  | 'CAPTAIN'
  | 'FAN_HOPEFUL'
  | 'CORNERSTONE';

export type FranchiseDesignationEligibilityStatus = 'eligible' | 'preview-only' | 'blocked';

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
  persistable: false;
  reasons: string[];
  limitations: string[];
  sourceInputs: {
    salaryBaselineAvailable: boolean;
    teamSalaryBaselineAvailable: boolean;
    seasonStatsAvailable: boolean;
    warPreviewInputAvailable: boolean;
    pitchingWarPreviewInputAvailable: boolean;
    wpaAvailable: boolean;
    wpaTrustedForFinalValue: false;
    trueValueAvailable: false;
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
  anyPersistable: false;
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

type RankedDesignationType = 'TEAM_MVP' | 'ACE';

interface RankedCandidate {
  key: string;
  row: FranchiseValueInputRow;
  score: number;
}

const PITCHER_VALUE_POSITIONS = new Set(['P', 'SP', 'RP', 'CP', 'SP/RP', 'TWO-WAY']);

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function candidateKey(teamId: string | null, designationType: RankedDesignationType): string {
  return `${teamId ?? 'missing-team'}:${designationType}`;
}

function isPitcherPosition(position: string | null): boolean {
  return PITCHER_VALUE_POSITIONS.has(String(position ?? '').trim().toUpperCase());
}

function rankedScore(row: FranchiseValueInputRow, designationType: RankedDesignationType): number | null {
  if (designationType === 'ACE') return row.warPreviewValues.pitchingWar;
  return row.warPreviewValues.totalWar;
}

function rankingBlockers(row: FranchiseValueInputRow, designationType: RankedDesignationType): string[] {
  const reasons: string[] = [];
  const score = rankedScore(row, designationType);
  if (score === null) {
    reasons.push(`${designationType} preview requires a numeric WAR preview value, not only input readiness.`);
  } else if (designationType === 'ACE' && score < 0.5) {
    reasons.push('ACE preview requires pitcher-specific positive pWAR of at least 0.5.');
  } else if (designationType === 'TEAM_MVP' && score <= 0) {
    reasons.push('TEAM_MVP preview requires positive season/team-relative WAR evidence.');
  }
  if (designationType === 'TEAM_MVP' && isPitcherPosition(row.valuePosition)) {
    reasons.push('TEAM_MVP preview is limited to position-player candidates in internal v1; pitcher recognition uses ACE.');
  }
  return reasons;
}

function buildRankedCandidates(
  rows: FranchiseValueInputRow[],
  designationType: RankedDesignationType,
): Map<string, RankedCandidate> {
  const best = new Map<string, RankedCandidate>();
  for (const row of rows) {
    if (stableWarPreviewBlockers(row, designationType).length > 0) continue;
    if (rankingBlockers(row, designationType).length > 0) continue;
    const score = rankedScore(row, designationType);
    if (score === null) continue;
    const key = candidateKey(row.currentTeamId, designationType);
    const existing = best.get(key);
    if (!existing || score > existing.score || (score === existing.score && row.playerName.localeCompare(existing.row.playerName) < 0)) {
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

function sourceInputs(row: FranchiseValueInputRow): FranchiseDesignationEligibilityRecord['sourceInputs'] {
  return {
    salaryBaselineAvailable: row.salaryBaselineAvailable,
    teamSalaryBaselineAvailable: row.teamSalaryBaseline !== null,
    seasonStatsAvailable: row.seasonStatsAvailability.any,
    warPreviewInputAvailable: row.warInputAvailability.any,
    pitchingWarPreviewInputAvailable: row.warInputAvailability.pitchingWar,
    wpaAvailable: row.wpaInputAvailability.archiveBacked,
    wpaTrustedForFinalValue: false,
    trueValueAvailable: false,
    moraleAvailable: false,
    relationshipInputsAvailable: false,
    awardInputsFinalized: false,
    seedParkFactorsAvailable: row.parkFactorAvailability.seedParkFactorsAvailable,
    parkAdjustedValueInputsAvailable: row.parkFactorAvailability.parkAdjustedValueInputsAvailable,
    seasonMetadataAvailable: hasSeasonMetadata(row),
  };
}

function commonLimitations(row: FranchiseValueInputRow): string[] {
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

function stableWarPreviewBlockers(row: FranchiseValueInputRow, type: 'TEAM_MVP' | 'ACE'): string[] {
  const reasons = [...mlbBlockers(row)];
  if (!hasSeasonMetadata(row)) {
    reasons.push('Stored season length and innings metadata are missing, so WAR-like inputs are not stable enough for preview.');
  }
  if (!row.seasonStatsAvailability.any) {
    reasons.push('Franchise season stat rows are required for a designation preview.');
  }
  if (type === 'TEAM_MVP' && !row.warInputAvailability.any) {
    reasons.push('TEAM_MVP preview requires WAR-like season inputs.');
  }
  if (type === 'ACE' && !row.warInputAvailability.pitchingWar) {
    reasons.push('ACE preview requires pitching WAR-like season inputs.');
  }
  return reasons;
}

function classifyTeamMvpOrAce(
  row: FranchiseValueInputRow,
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
        `${designationType} preview is ranked/selective; this input-ready player is not the top plausible team candidate.`,
      ],
    };
  }

  return {
    status: 'preview-only',
    reasons: [
      `${designationType} ranked preview candidate has positive team-relative performance evidence.`,
      'Final designation persistence is blocked until trusted final value/designation inputs exist.',
    ],
  };
}

function valueDesignationBlockers(
  row: FranchiseValueInputRow,
  designationType: 'FAN_FAVORITE' | 'ALBATROSS',
): string[] {
  const reasons = [...mlbBlockers(row)];
  if (!row.salaryBaselineAvailable) {
    reasons.push('Stable player salary baseline is required for value-delta designations.');
  }
  if (row.teamSalaryBaseline === null) {
    reasons.push('Team payroll baseline is required for salary/value designation context.');
  }
  reasons.push(`${designationType} requires canonical True Value and value-delta inputs, which are unavailable in internal v1.`);
  if (designationType === 'FAN_FAVORITE') {
    reasons.push('FAN_FAVORITE also depends on fan/morale systems that are not canonical in internal v1.');
  }
  return reasons;
}

function deferredNarrativeBlockers(designationType: 'CAPTAIN' | 'FAN_HOPEFUL' | 'CORNERSTONE'): string[] {
  if (designationType === 'CAPTAIN') {
    return [
      'CAPTAIN is deferred because leadership, morale, and relationship inputs are not canonical in internal v1.',
      'Awards and historical designation inputs are not finalized for persistence.',
    ];
  }
  if (designationType === 'FAN_HOPEFUL') {
    return [
      'FAN_HOPEFUL is deferred because fan, morale, and True Value inputs are not canonical in internal v1.',
      'Awards and narrative inputs are not finalized for persistence.',
    ];
  }
  return [
    'CORNERSTONE is deferred because future value, contract trajectory, morale, and relationship inputs are not canonical in internal v1.',
    'True Value and awards inputs are unavailable for final designation persistence.',
  ];
}

function classifyDesignation(
  row: FranchiseValueInputRow,
  designationType: FranchiseDesignationEligibilityType,
  rankedCandidates: Map<string, RankedCandidate>,
): Pick<FranchiseDesignationEligibilityRecord, 'status' | 'reasons'> {
  if (designationType === 'TEAM_MVP' || designationType === 'ACE') {
    return classifyTeamMvpOrAce(row, designationType, rankedCandidates);
  }
  if (designationType === 'FAN_FAVORITE' || designationType === 'ALBATROSS') {
    return { status: 'blocked', reasons: valueDesignationBlockers(row, designationType) };
  }
  return { status: 'blocked', reasons: [...mlbBlockers(row), ...deferredNarrativeBlockers(designationType)] };
}

function recordFor(
  row: FranchiseValueInputRow,
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
    persistable: false,
    reasons: unique(classification.reasons),
    limitations: commonLimitations(row),
    sourceInputs: sourceInputs(row),
  };
}

export function classifyFranchiseDesignationEligibility(
  valueInputReport: FranchiseValueInputReport,
): FranchiseDesignationEligibilityReport {
  const rankedCandidates = new Map<string, RankedCandidate>([
    ...buildRankedCandidates(valueInputReport.rows, 'TEAM_MVP'),
    ...buildRankedCandidates(valueInputReport.rows, 'ACE'),
  ]);
  const records = valueInputReport.rows.flatMap((row) =>
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
    anyPersistable: false,
    limitations: unique([
      ...valueInputReport.limitations,
      ...records.flatMap((record) => record.limitations),
      'No dynamic designation is persistable in internal v1 conditions.',
    ]),
  };
}

export async function buildFranchiseDesignationEligibility(
  input: BuildFranchiseValueInputRowsInput,
): Promise<FranchiseDesignationEligibilityReport> {
  const valueInputReport = await buildFranchiseValueInputRows(input);
  return classifyFranchiseDesignationEligibility(valueInputReport);
}
