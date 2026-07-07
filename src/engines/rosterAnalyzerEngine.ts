import {
  LEGAL_ROSTER,
  canCover,
  canRelieve,
  canStart,
  depthReport,
  isLegalRoster,
  type FieldPosition,
  type RosterSlotPlayer,
} from '../data/rosterConstruction';
import { recommendRosterMoves, type MoveRecommendation } from './rosterAnalyzer';
import {
  rosterNeedBreakdown,
  toRosterSlotPlayer,
  wouldStrandRoster,
  type RosterPositionMap,
} from './rosterNeed';

export type RosterAnalyzerMode = 'builder' | 'franchise';

export type RosterAnalyzerSurface =
  | 'builder_team'
  | 'builder_league'
  | 'franchise_team_hub'
  | 'franchise_home'
  | 'game_prep'
  | 'draft_prep'
  | 'offseason_roster_lock_preview';

export type AnalyzerSeverity = 'blocker' | 'critical' | 'warning' | 'info';
export type AnalyzerTrustLevel = 'high' | 'medium' | 'low' | 'unavailable';
export type ConstraintDisposition = 'hard' | 'advisory' | 'disabled';
export type RecommendationExecution = 'read_only' | 'blocked_future_work';

export interface AnalyzerIdentity {
  mode: RosterAnalyzerMode;
  surface: RosterAnalyzerSurface;
  leagueId?: string;
  teamId: string;
  franchiseId?: string;
  seasonId?: string;
  seasonNumber?: number;
  statsScopeId?: string;
  generatedAt?: string;
}

export interface AnalyzerFarmOptionState {
  seasonOptionsUsed?: number;
  maxSeasonOptions?: number;
  ratingRevealState?: 'hidden' | 'partial' | 'revealed';
  eligibleForCallUp?: boolean;
  eligibleForSendDown?: boolean;
  scoutedGrade?: string;
  scoutConfidence?: string;
  scoutVisibleSalary?: number;
}

export interface AnalyzerPlayerStats {
  plateAppearances?: number;
  inningsPitched?: number;
  gamesPlayed?: number;
  war?: number;
  wpa?: number;
  clutch?: number;
  fieldingChances?: number;
  errors?: number;
  source: 'season_snapshot' | 'completed_game_snapshot' | 'builder_projection' | 'unavailable';
  trust: AnalyzerTrustLevel;
}

export interface AnalyzerPlayer {
  id: string;
  name: string;
  teamId?: string;
  leagueId?: string;
  primaryPosition: string;
  secondaryPositions?: string[];
  bats?: 'L' | 'R' | 'S';
  throws?: 'L' | 'R';
  isPitcher?: boolean;
  rosterStatus?: 'MLB' | 'FARM' | 'FREE_AGENT' | 'RELEASED' | 'RETIRED' | 'INACTIVE' | 'UNASSIGNED' | 'UNKNOWN';
  rosterLevel?: 'MLB' | 'FARM';
  ratings: {
    power?: number;
    contact?: number;
    speed?: number;
    fielding?: number;
    arm?: number;
    velocity?: number;
    junk?: number;
    accuracy?: number;
  };
  arsenal?: string[];
  traits?: string[];
  chemistry?: string;
  personality?: string;
  mojo?: string;
  fitness?: string;
  salary?: number;
  valueDelta?: number;
  contractYears?: number;
  age?: number;
  handedLineupRole?: 'vsL' | 'vsR' | 'both';
  optionState?: AnalyzerFarmOptionState;
  stats?: AnalyzerPlayerStats;
  sourceTrust?: AnalyzerTrustLevel;
}

export interface AnalyzerRosterState {
  activePlayerIds: string[];
  farmPlayerIds?: string[];
  lineupSlots?: AnalyzerLineupSlot[];
  rotationIds?: string[];
  bullpenRoles?: AnalyzerBullpenRole[];
  depthChart?: AnalyzerDepthChartEntry[];
  pinchHitOrderIds?: string[];
  pinchRunOrderIds?: string[];
}

export interface AnalyzerLineupSlot {
  order: number;
  playerId: string;
  position: string;
  handednessContext?: 'vsL' | 'vsR' | 'noDH' | 'withDH';
}

export interface AnalyzerBullpenRole {
  role: 'long' | 'middle' | 'setup' | 'closer';
  playerId: string;
}

export interface AnalyzerDepthChartEntry {
  position: string;
  playerIds: string[];
}

export interface AnalyzerTeamSummary {
  teamId: string;
  teamName: string;
  profile?: Record<string, number>;
  salaryTotal?: number;
  activeCount?: number;
}

export type AnalyzerConstraintKind =
  | 'data_integrity'
  | 'roster_count'
  | 'position_coverage'
  | 'lineup'
  | 'rotation'
  | 'bullpen'
  | 'depth_chart'
  | 'pitch_arsenal'
  | 'team_profile'
  | 'salary_value'
  | 'luxury_cap'
  | 'trait_usage'
  | 'chemistry_balance'
  | 'farm_options'
  | 'phase_lock';

export interface AnalyzerTraitRules {
  requiredPositiveTraits?: number;
  requiredNegativeTraits?: number;
  maxTraitsPerPlayer?: number;
  maxUsesByTrait?: Record<string, number>;
  maxUsesByPosition?: Record<string, Record<string, number>>;
}

export interface AnalyzerChemistryRules {
  desiredMinimums?: Record<string, number>;
  desiredMaximums?: Record<string, number>;
  classifyOnly?: boolean;
}

export interface AnalyzerTrustPolicy {
  missingStatsTrust: AnalyzerTrustLevel;
  missingSalaryTrust: AnalyzerTrustLevel;
  missingChemistryTrust: AnalyzerTrustLevel;
  allowLowTrustRecommendations: boolean;
}

export interface RosterAnalyzerConfig {
  presetId: string;
  constraintDefaults: Partial<Record<AnalyzerConstraintKind, ConstraintDisposition>>;
  rosterTargets: {
    activeMlb?: number;
    farm?: number;
    total?: number;
    positionMinimums?: Record<string, number>;
    rotationSize?: number;
    bullpenMinimum?: number;
    benchMinimum?: number;
  };
  salary?: {
    enabled: boolean;
    unit: 'raw' | 'millions' | 'unknown';
    cap?: number;
    luxuryCap?: number;
  };
  traitRules?: AnalyzerTraitRules;
  chemistryRules?: AnalyzerChemistryRules;
  spreadsheetAdvisories?: {
    enabled: boolean;
    topN?: number;
    concentrationShareWarning?: number;
    maxPitchCount?: number;
  };
  trustPolicy: AnalyzerTrustPolicy;
}

export interface RosterAnalyzerInput {
  identity: AnalyzerIdentity;
  teamName?: string;
  players: AnalyzerPlayer[];
  roster: AnalyzerRosterState;
  leagueTeams?: AnalyzerTeamSummary[];
  config?: Partial<RosterAnalyzerConfig>;
}

export interface AnalyzerEvidenceRef {
  type:
    | 'rating'
    | 'stat'
    | 'lineup_slot'
    | 'roster_status'
    | 'farm_record'
    | 'salary'
    | 'trait'
    | 'chemistry'
    | 'team_profile'
    | 'missing_data'
    | 'deferred_system';
  label: string;
  value?: string | number | boolean;
  source: string;
  trust: AnalyzerTrustLevel;
}

export interface AnalyzerFinding {
  id: string;
  kind: AnalyzerConstraintKind;
  severity: AnalyzerSeverity;
  trust: AnalyzerTrustLevel;
  title: string;
  detail: string;
  affectedPlayerIds?: string[];
  evidence: AnalyzerEvidenceRef[];
  recommendedActionIds?: string[];
}

export type AnalyzerRecommendationKind =
  | 'fix_data_integrity'
  | 'lineup_adjustment'
  | 'rotation_adjustment'
  | 'bullpen_role_adjustment'
  | 'depth_chart_adjustment'
  | 'bench_balance'
  | 'farm_monitor'
  | 'call_up_advice'
  | 'send_down_advice'
  | 'salary_value_review'
  | 'trait_balance_review'
  | 'chemistry_balance_review'
  | 'pitch_arsenal_review';

export interface AnalyzerRecommendation {
  id: string;
  kind: AnalyzerRecommendationKind;
  severity: AnalyzerSeverity;
  trust: AnalyzerTrustLevel;
  execution: RecommendationExecution;
  title: string;
  rationale: string;
  playerIds: string[];
  evidence: AnalyzerEvidenceRef[];
  counterEvidence?: AnalyzerEvidenceRef[];
  caveats: string[];
  blockedBy?: string[];
}

export interface AnalyzerInputProvenance {
  source: 'builder_state' | 'franchise_players' | 'franchise_teams' | 'franchise_farm' | 'season_stats' | 'config';
  description: string;
  trust: AnalyzerTrustLevel;
}

export interface AnalyzerTrustSummary {
  overall: AnalyzerTrustLevel;
  highTrustInputs: string[];
  mediumTrustInputs: string[];
  lowTrustInputs: string[];
  unavailableInputs: string[];
}

export interface AnalyzerReportSummary {
  highestSeverity: AnalyzerSeverity;
  blockerCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  recommendationCount: number;
  readOnly: true;
}

export interface RosterAnalyzerReport {
  identity: AnalyzerIdentity & { generatedAt: string };
  summary: AnalyzerReportSummary;
  findings: AnalyzerFinding[];
  recommendations: AnalyzerRecommendation[];
  trust: AnalyzerTrustSummary;
  generatedFrom: AnalyzerInputProvenance[];
  profile: AnalyzerRosterProfile;
}

export interface AnalyzerRosterProfile {
  activeCount: number;
  farmCount: number;
  totalCount: number;
  hittingScore: number | null;
  pitchingScore: number | null;
  defenseScore: number | null;
  speedScore: number | null;
  averageOverall: number | null;
  topNShare: number | null;
  chemistryCounts: Record<string, number>;
  traitCounts: Record<string, number>;
  salaryTotal: number | null;
  limitations: string[];
}

const CANONICAL_POSITION_MINIMUMS: Record<string, number> = Object.fromEntries(
  LEGAL_ROSTER.fieldPositions.map((position) => [
    position,
    position === 'C' ? LEGAL_ROSTER.minCatchers : 1,
  ]),
);
const OUTFIELD_FIELD_POSITIONS: FieldPosition[] = ['LF', 'CF', 'RF'];
const FASTBALLS = new Set(['4F', '2F', 'CF', 'CUT', 'FB']);
const OFFSPEED_OR_BREAKING = new Set(['CB', 'SL', 'CH', 'FK', 'SB', 'SC', 'KN']);
const VALID_PITCHES = new Set(['4F', '2F', 'CB', 'SL', 'CH', 'FK', 'CF', 'SB', 'SC', 'KN']);

const SEVERITY_RANK: Record<AnalyzerSeverity, number> = {
  info: 0,
  warning: 1,
  critical: 2,
  blocker: 3,
};

const TRUST_RANK: Record<AnalyzerTrustLevel, number> = {
  unavailable: 0,
  low: 1,
  medium: 2,
  high: 3,
};

export function createDefaultRosterAnalyzerConfig(
  overrides: Partial<RosterAnalyzerConfig> = {},
): RosterAnalyzerConfig {
  return {
    presetId: overrides.presetId ?? 'kbl_roster_analyzer_v1_default',
    constraintDefaults: {
      data_integrity: 'hard',
      roster_count: 'advisory',
      position_coverage: 'advisory',
      lineup: 'advisory',
      rotation: 'advisory',
      bullpen: 'advisory',
      depth_chart: 'advisory',
      pitch_arsenal: 'advisory',
      team_profile: 'advisory',
      salary_value: 'advisory',
      luxury_cap: 'advisory',
      trait_usage: 'advisory',
      chemistry_balance: 'advisory',
      farm_options: 'advisory',
      phase_lock: 'advisory',
      ...(overrides.constraintDefaults ?? {}),
    },
    rosterTargets: {
      activeMlb: 22,
      farm: 10,
      total: 32,
      rotationSize: LEGAL_ROSTER.startingPitchers,
      bullpenMinimum: LEGAL_ROSTER.minRelievers,
      benchMinimum: 4,
      ...(overrides.rosterTargets ?? {}),
      positionMinimums: {
        ...CANONICAL_POSITION_MINIMUMS,
        ...(overrides.rosterTargets?.positionMinimums ?? {}),
      },
    },
    salary: {
      enabled: false,
      unit: 'unknown',
      ...(overrides.salary ?? {}),
    },
    traitRules: overrides.traitRules,
    chemistryRules: overrides.chemistryRules,
    spreadsheetAdvisories: {
      enabled: true,
      topN: 3,
      concentrationShareWarning: 0.3,
      maxPitchCount: 5,
      ...(overrides.spreadsheetAdvisories ?? {}),
    },
    trustPolicy: {
      missingStatsTrust: 'low',
      missingSalaryTrust: 'low',
      missingChemistryTrust: 'unavailable',
      allowLowTrustRecommendations: true,
      ...(overrides.trustPolicy ?? {}),
    },
  };
}

function mergeConfig(config?: Partial<RosterAnalyzerConfig>): RosterAnalyzerConfig {
  return createDefaultRosterAnalyzerConfig(config ?? {});
}

function evidence(
  type: AnalyzerEvidenceRef['type'],
  label: string,
  value: AnalyzerEvidenceRef['value'],
  source: string,
  trust: AnalyzerTrustLevel,
): AnalyzerEvidenceRef {
  return { type, label, value, source, trust };
}

function ratingAverage(values: Array<number | undefined>): number | null {
  const present = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (present.length === 0) return null;
  return Number((present.reduce((sum, value) => sum + value, 0) / present.length).toFixed(2));
}

function playerRatingScore(player: AnalyzerPlayer): number | null {
  const ratings = player.ratings;
  const values = isPitcher(player)
    ? [ratings.velocity, ratings.junk, ratings.accuracy]
    : [ratings.power, ratings.contact, ratings.speed, ratings.fielding, ratings.arm];
  return ratingAverage(values);
}

function canonicalSlotPlayer(player: AnalyzerPlayer): RosterSlotPlayer {
  return toRosterSlotPlayer({
    primaryPosition: player.primaryPosition,
    secondaryPosition: player.secondaryPositions?.[0] ?? null,
    traits: player.traits ?? [],
  });
}

function canonicalSlotPlayerVariants(player: AnalyzerPlayer): RosterSlotPlayer[] {
  const secondaryPositions = player.secondaryPositions?.length ? player.secondaryPositions : [null];
  return secondaryPositions.map((secondaryPosition) =>
    toRosterSlotPlayer({
      primaryPosition: player.primaryPosition,
      secondaryPosition,
      traits: player.traits ?? [],
    }),
  );
}

function isFieldPosition(position: string): position is FieldPosition {
  return (LEGAL_ROSTER.fieldPositions as readonly string[]).includes(position);
}

function isPitcher(player: AnalyzerPlayer): boolean {
  return Boolean(player.isPitcher) || canonicalSlotPlayer(player).isPitcher;
}

function isStarter(player: AnalyzerPlayer): boolean {
  return canStart(canonicalSlotPlayer(player));
}

function isBullpenCandidate(player: AnalyzerPlayer): boolean {
  return canRelieve(canonicalSlotPlayer(player));
}

function positionMatches(player: AnalyzerPlayer, position: string): boolean {
  const slots = canonicalSlotPlayerVariants(player);
  if (isFieldPosition(position)) return slots.some((slot) => canCover(slot, position));
  if (position === 'OF') return OUTFIELD_FIELD_POSITIONS.some((fieldPosition) =>
    slots.some((slot) => canCover(slot, fieldPosition)),
  );
  return [player.primaryPosition, ...(player.secondaryPositions ?? [])].includes(position);
}

function rosterPositionMap(players: AnalyzerPlayer[]): RosterPositionMap {
  return Object.fromEntries(players.map((player) => [player.id, canonicalSlotPlayer(player)]));
}

function sendDownLegalityAssessment(activePlayers: AnalyzerPlayer[], playerId: string): {
  safe: boolean;
  projectedSlots: RosterSlotPlayer[];
  need: ReturnType<typeof rosterNeedBreakdown>;
  depth: ReturnType<typeof depthReport>;
  strands: boolean;
} {
  const projectedPlayers = activePlayers.filter((player) => player.id !== playerId);
  const projectedSlots = projectedPlayers.map(canonicalSlotPlayer);
  const positions = rosterPositionMap(activePlayers);
  const need = rosterNeedBreakdown(projectedSlots);
  const depth = depthReport(projectedSlots);
  const strands = wouldStrandRoster(projectedPlayers.map((player) => player.id), playerId, positions);
  const safe =
    !need.infeasible &&
    need.missingPrimaries.length === 0 &&
    need.catcherCoverNeed === 0 &&
    need.pitcherNeed === 0 &&
    need.hitterFloorNeed === 0 &&
    need.pitcherFloorNeed === 0 &&
    !strands;

  return { safe, projectedSlots, need, depth, strands };
}

function byId(players: AnalyzerPlayer[]): Map<string, AnalyzerPlayer> {
  return new Map(players.map((player) => [player.id, player]));
}

function definedPlayers(ids: string[] | undefined, playerMap: Map<string, AnalyzerPlayer>): AnalyzerPlayer[] {
  return (ids ?? []).map((id) => playerMap.get(id)).filter((player): player is AnalyzerPlayer => Boolean(player));
}

function addFinding(
  findings: AnalyzerFinding[],
  input: Omit<AnalyzerFinding, 'id'>,
): AnalyzerFinding {
  const id = `${input.kind}-${findings.length + 1}`;
  const finding: AnalyzerFinding = { id, ...input };
  findings.push(finding);
  return finding;
}

function addRecommendation(
  recommendations: AnalyzerRecommendation[],
  input: Omit<AnalyzerRecommendation, 'id' | 'execution'> & { execution?: RecommendationExecution },
): AnalyzerRecommendation {
  const id = `${input.kind}-${recommendations.length + 1}`;
  const recommendation: AnalyzerRecommendation = {
    id,
    execution: input.execution ?? 'read_only',
    ...input,
  };
  recommendations.push(recommendation);
  return recommendation;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function countOccurrences(items: Array<string | undefined>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    if (!item) continue;
    counts[item] = (counts[item] ?? 0) + 1;
  }
  return counts;
}

function activeGapFarmCandidates(
  activePlayers: AnalyzerPlayer[],
  farmPlayers: AnalyzerPlayer[],
  position: string,
  minimum: number,
): AnalyzerPlayer[] {
  const activeCount = activePlayers.filter((player) => positionMatches(player, position)).length;
  if (activeCount >= minimum) return [];
  return farmPlayers.filter((player) => positionMatches(player, position));
}

function optionUsageLabel(player: AnalyzerPlayer): { used?: number; max?: number; remaining?: number } {
  const used = player.optionState?.seasonOptionsUsed;
  const max = player.optionState?.maxSeasonOptions ?? 3;
  if (typeof used !== 'number' || !Number.isFinite(used)) {
    return { max };
  }
  return { used, max, remaining: Math.max(0, max - used) };
}

function rosterMoveRecommendations(activePlayers: AnalyzerPlayer[], farmPlayers: AnalyzerPlayer[]): MoveRecommendation[] {
  return recommendRosterMoves({
    players: activePlayers.map((player) => ({
      id: player.id,
      name: player.name,
      primaryPosition: player.primaryPosition,
      secondaryPositions: player.secondaryPositions,
      valueDelta: player.valueDelta,
      eligibleForSendDown: player.optionState?.eligibleForSendDown,
    })),
  }, {
    players: farmPlayers.map((player) => ({
      id: player.id,
      name: player.name,
      primaryPosition: player.primaryPosition,
      secondaryPositions: player.secondaryPositions,
      scoutedGrade: player.optionState?.scoutedGrade,
      scoutConfidence: player.optionState?.scoutConfidence,
      scoutVisibleSalary: player.optionState?.scoutVisibleSalary,
      eligibleForCallUp: player.optionState?.eligibleForCallUp,
    })),
  }, {
    valueDeltas: activePlayers
      .filter((player) => typeof player.valueDelta === 'number' && Number.isFinite(player.valueDelta))
      .map((player) => ({ playerId: player.id, valueDelta: player.valueDelta as number })),
  });
}

function moveRecommendationForPlayer(
  recommendations: MoveRecommendation[],
  playerId: string,
  kind?: MoveRecommendation['kind'],
): MoveRecommendation | undefined {
  return recommendations.find((recommendation) =>
    (recommendation.playerId === playerId || recommendation.replacesPlayerId === playerId) &&
    (!kind || recommendation.kind === kind),
  );
}

function scoutConfidenceLabel(player: AnalyzerPlayer, recommendation?: MoveRecommendation): string {
  return recommendation?.scoutConfidence ?? player.optionState?.scoutConfidence ?? 'unknown';
}

function callUpAdviceRationale(playerNames: string, confidence: string): string {
  return `${playerNames} projects as a positive-surplus replacement candidate based only on scout-visible farm grade data (${confidence} scout confidence).`;
}

function sendDownAdviceRationale(playerName: string): string {
  return `${playerName} is a known-commodity option-risk case; send-down advice is read-only and no roster move is executed by this report.`;
}

function buildProfile(activePlayers: AnalyzerPlayer[], farmPlayers: AnalyzerPlayer[], config: RosterAnalyzerConfig): AnalyzerRosterProfile {
  const hitters = activePlayers.filter((player) => !isPitcher(player));
  const pitchers = activePlayers.filter(isPitcher);
  const overallScores = activePlayers.map(playerRatingScore).filter((score): score is number => score !== null);
  const sortedScores = [...overallScores].sort((a, b) => b - a);
  const topN = Math.max(1, config.spreadsheetAdvisories?.topN ?? 3);
  const topNTotal = sortedScores.slice(0, topN).reduce((sum, score) => sum + score, 0);
  const totalRating = sortedScores.reduce((sum, score) => sum + score, 0);
  const salaryValues = [...activePlayers, ...farmPlayers]
    .map((player) => player.salary)
    .filter((salary): salary is number => typeof salary === 'number' && Number.isFinite(salary));

  const limitations: string[] = [];
  if (activePlayers.some((player) => !player.stats || player.stats.source === 'unavailable')) {
    limitations.push('Season/performance stats are missing or unavailable for at least one active player.');
  }
  if (salaryValues.length === 0) {
    limitations.push('Salary data is unavailable.');
  } else if (config.salary?.unit === 'unknown') {
    limitations.push('Salary unit is unknown; salary advice is limited.');
  }
  if ([...activePlayers, ...farmPlayers].some((player) => !player.chemistry)) {
    limitations.push('Chemistry data is incomplete.');
  }

  return {
    activeCount: activePlayers.length,
    farmCount: farmPlayers.length,
    totalCount: activePlayers.length + farmPlayers.length,
    hittingScore: ratingAverage(hitters.flatMap((player) => [player.ratings.power, player.ratings.contact])),
    pitchingScore: ratingAverage(pitchers.flatMap((player) => [player.ratings.velocity, player.ratings.junk, player.ratings.accuracy])),
    defenseScore: ratingAverage(activePlayers.map((player) => player.ratings.fielding)),
    speedScore: ratingAverage(activePlayers.map((player) => player.ratings.speed)),
    averageOverall: ratingAverage(overallScores),
    topNShare: totalRating > 0 ? Number((topNTotal / totalRating).toFixed(4)) : null,
    chemistryCounts: countOccurrences([...activePlayers, ...farmPlayers].map((player) => player.chemistry)),
    traitCounts: countOccurrences([...activePlayers, ...farmPlayers].flatMap((player) => player.traits ?? [])),
    salaryTotal: salaryValues.length > 0 ? Number(salaryValues.reduce((sum, salary) => sum + salary, 0).toFixed(2)) : null,
    limitations,
  };
}

function trustSummary(profile: AnalyzerRosterProfile, input: RosterAnalyzerInput): AnalyzerTrustSummary {
  const highTrustInputs = ['positions', 'ratings', 'roster IDs'];
  const mediumTrustInputs: string[] = [];
  const lowTrustInputs: string[] = [];
  const unavailableInputs: string[] = [];

  if (input.players.some((player) => player.stats && player.stats.source !== 'unavailable')) {
    mediumTrustInputs.push('player stats');
  } else {
    lowTrustInputs.push('player stats');
  }

  if (profile.salaryTotal === null) {
    unavailableInputs.push('salary');
  } else if (input.config?.salary?.unit === 'unknown') {
    lowTrustInputs.push('salary');
  } else {
    mediumTrustInputs.push('salary');
  }

  if (Object.keys(profile.chemistryCounts).length === 0) {
    unavailableInputs.push('chemistry');
  } else {
    highTrustInputs.push('chemistry');
  }

  if (profile.limitations.length > 0) {
    lowTrustInputs.push('deferred or missing systems');
  }

  const overall: AnalyzerTrustLevel = unavailableInputs.length > 2
    ? 'low'
    : lowTrustInputs.length > 0
      ? 'medium'
      : 'high';

  return {
    overall,
    highTrustInputs: unique(highTrustInputs),
    mediumTrustInputs: unique(mediumTrustInputs),
    lowTrustInputs: unique(lowTrustInputs),
    unavailableInputs: unique(unavailableInputs),
  };
}

function severitySummary(findings: AnalyzerFinding[], recommendationCount: number): AnalyzerReportSummary {
  const counts = {
    blockerCount: findings.filter((finding) => finding.severity === 'blocker').length,
    criticalCount: findings.filter((finding) => finding.severity === 'critical').length,
    warningCount: findings.filter((finding) => finding.severity === 'warning').length,
    infoCount: findings.filter((finding) => finding.severity === 'info').length,
  };
  const highestSeverity = findings.reduce<AnalyzerSeverity>(
    (highest, finding) => SEVERITY_RANK[finding.severity] > SEVERITY_RANK[highest] ? finding.severity : highest,
    'info',
  );
  return {
    ...counts,
    highestSeverity,
    recommendationCount,
    readOnly: true,
  };
}

function hasConstraint(config: RosterAnalyzerConfig, kind: AnalyzerConstraintKind): boolean {
  return config.constraintDefaults[kind] !== 'disabled';
}

function severityFor(config: RosterAnalyzerConfig, kind: AnalyzerConstraintKind, fallback: AnalyzerSeverity): AnalyzerSeverity {
  return config.constraintDefaults[kind] === 'hard' ? 'blocker' : fallback;
}

export function analyzeRoster(input: RosterAnalyzerInput): RosterAnalyzerReport {
  const config = mergeConfig(input.config);
  const playerMap = byId(input.players);
  const findings: AnalyzerFinding[] = [];
  const recommendations: AnalyzerRecommendation[] = [];
  const activePlayers = definedPlayers(input.roster.activePlayerIds, playerMap);
  const farmPlayers = definedPlayers(input.roster.farmPlayerIds, playerMap);
  const profile = buildProfile(activePlayers, farmPlayers, config);

  const duplicatePlayerIds = input.players
    .map((player) => player.id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);
  if (duplicatePlayerIds.length > 0) {
    addFinding(findings, {
      kind: 'data_integrity',
      severity: severityFor(config, 'data_integrity', 'critical'),
      trust: 'high',
      title: 'Duplicate player IDs detected',
      detail: `Duplicate IDs: ${unique(duplicatePlayerIds).join(', ')}.`,
      affectedPlayerIds: unique(duplicatePlayerIds),
      evidence: [evidence('roster_status', 'duplicatePlayerIds', unique(duplicatePlayerIds).length, 'analyzer_input', 'high')],
    });
  }

  const missingActiveIds = input.roster.activePlayerIds.filter((id) => !playerMap.has(id));
  if (missingActiveIds.length > 0) {
    addFinding(findings, {
      kind: 'data_integrity',
      severity: severityFor(config, 'data_integrity', 'critical'),
      trust: 'high',
      title: 'Active roster references missing players',
      detail: `Missing active player records: ${missingActiveIds.join(', ')}.`,
      affectedPlayerIds: missingActiveIds,
      evidence: [evidence('missing_data', 'missingActivePlayers', missingActiveIds.length, 'roster.activePlayerIds', 'high')],
    });
  }

  const missingFarmIds = (input.roster.farmPlayerIds ?? []).filter((id) => !playerMap.has(id));
  if (missingFarmIds.length > 0) {
    addFinding(findings, {
      kind: 'data_integrity',
      severity: 'warning',
      trust: 'high',
      title: 'Farm roster references missing players',
      detail: `Missing farm player records: ${missingFarmIds.join(', ')}.`,
      affectedPlayerIds: missingFarmIds,
      evidence: [evidence('missing_data', 'missingFarmPlayers', missingFarmIds.length, 'roster.farmPlayerIds', 'high')],
    });
  }

  if (hasConstraint(config, 'roster_count')) {
    const activeTarget = config.rosterTargets.activeMlb;
    if (typeof activeTarget === 'number' && activePlayers.length !== activeTarget) {
      addFinding(findings, {
        kind: 'roster_count',
        severity: 'warning',
        trust: 'high',
        title: 'Active MLB roster count differs from target',
        detail: `Active roster has ${activePlayers.length} players; target is ${activeTarget}.`,
        evidence: [evidence('roster_status', 'activeCount', activePlayers.length, 'roster.activePlayerIds', 'high')],
      });
    }
    if (activePlayers.length === LEGAL_ROSTER.size) {
      const activeSlots = activePlayers.map(canonicalSlotPlayer);
      const positionPlayerCount = activeSlots.filter((player) => !player.isPitcher).length;
      const pitcherCount = activeSlots.filter((player) => player.isPitcher).length;
      if (
        positionPlayerCount < LEGAL_ROSTER.minPositionPlayers ||
        positionPlayerCount > LEGAL_ROSTER.maxPositionPlayers ||
        pitcherCount < LEGAL_ROSTER.minPitchers ||
        pitcherCount > LEGAL_ROSTER.maxPitchers
      ) {
        addFinding(findings, {
          kind: 'roster_count',
          severity: 'warning',
          trust: 'high',
          title: 'Active roster position/pitcher mix is outside legal range',
          detail: `Active roster has ${positionPlayerCount} position player(s) and ${pitcherCount} pitcher(s); legal roster needs ${LEGAL_ROSTER.minPositionPlayers}-${LEGAL_ROSTER.maxPositionPlayers} position players and ${LEGAL_ROSTER.minPitchers}-${LEGAL_ROSTER.maxPitchers} pitchers.`,
          evidence: [
            evidence('roster_status', 'positionPlayers', positionPlayerCount, 'canonical rosterConstruction', 'high'),
            evidence('roster_status', 'pitchers', pitcherCount, 'canonical rosterConstruction', 'high'),
          ],
        });
      }

      if (!isLegalRoster(activeSlots)) {
        const depth = depthReport(activeSlots);
        addFinding(findings, {
          kind: 'position_coverage',
          severity: 'warning',
          trust: 'high',
          title: 'Active roster is not canonically legal',
          detail: `Roster does not satisfy the canonical legal 22. Thin coverage: ${depth.thinPositions.join(', ') || 'none'}.`,
          evidence: [
            evidence('roster_status', 'isLegalRoster', false, 'rosterConstruction.isLegalRoster', 'high'),
            evidence('roster_status', 'thinPositions', depth.thinPositions.length, 'rosterConstruction.depthReport', 'high'),
          ],
        });
      }
    }

    const farmTarget = config.rosterTargets.farm;
    if (input.roster.farmPlayerIds && typeof farmTarget === 'number' && farmPlayers.length !== farmTarget) {
      addFinding(findings, {
        kind: 'roster_count',
        severity: 'info',
        trust: 'medium',
        title: 'Farm roster count differs from target',
        detail: `Farm roster has ${farmPlayers.length} players; target is ${farmTarget}. Farm limits may be phase-specific.`,
        evidence: [evidence('farm_record', 'farmCount', farmPlayers.length, 'roster.farmPlayerIds', 'medium')],
      });
    }
  }

  if (hasConstraint(config, 'position_coverage')) {
    for (const [position, minimum] of Object.entries(config.rosterTargets.positionMinimums ?? {})) {
      const matching = activePlayers.filter((player) => positionMatches(player, position));
      if (matching.length < minimum) {
        const finding = addFinding(findings, {
          kind: 'position_coverage',
          severity: 'warning',
          trust: 'high',
          title: `${position} coverage below target`,
          detail: `Active roster has ${matching.length} ${position} eligible player(s); target is ${minimum}.`,
          evidence: [evidence('roster_status', `${position}Coverage`, matching.length, 'active roster positions', 'high')],
        });
        addRecommendation(recommendations, {
          kind: 'bench_balance',
          severity: 'warning',
          trust: 'high',
          title: `Review ${position} depth`,
          rationale: `Add or identify another active ${position} option before relying on this roster in games.`,
          playerIds: [],
          evidence: finding.evidence,
          caveats: ['Read-only advice only; this engine does not move players.'],
        });
      }
    }
  }

  if (hasConstraint(config, 'rotation')) {
    const rotationPlayers = activePlayers.filter(isStarter);
    const rotationTarget = config.rosterTargets.rotationSize ?? LEGAL_ROSTER.startingPitchers;
    const inferredStarters = activePlayers.filter(isStarter);
    const rotationCount = inferredStarters.length;
    if (rotationCount < rotationTarget) {
      const finding = addFinding(findings, {
        kind: 'rotation',
        severity: 'warning',
        trust: 'high',
        title: 'Starting rotation coverage is thin',
        detail: `Rotation has ${rotationCount} starter candidate(s); target is ${rotationTarget}.`,
        evidence: [evidence('roster_status', 'rotationCount', rotationCount, 'rosterConstruction.canStart', 'high')],
      });
      addRecommendation(recommendations, {
        kind: 'rotation_adjustment',
        severity: 'warning',
        trust: finding.trust,
        title: 'Review rotation depth',
        rationale: 'Thin starting depth can force bullpen strain or unsafe game prep.',
        playerIds: rotationPlayers.map((player) => player.id),
        evidence: finding.evidence,
        caveats: ['No rotation changes are applied by the analyzer.'],
      });
    }
  }

  if (hasConstraint(config, 'bullpen')) {
    const bullpenPlayers = activePlayers.filter(isBullpenCandidate);
    const bullpenMinimum = config.rosterTargets.bullpenMinimum ?? LEGAL_ROSTER.minRelievers;
    if (bullpenPlayers.length < bullpenMinimum) {
      addFinding(findings, {
        kind: 'bullpen',
        severity: 'warning',
        trust: 'high',
        title: 'Bullpen coverage is thin',
        detail: `Bullpen has ${bullpenPlayers.length} reliever candidate(s); target is ${bullpenMinimum}.`,
        affectedPlayerIds: bullpenPlayers.map((player) => player.id),
        evidence: [evidence('roster_status', 'bullpenCount', bullpenPlayers.length, 'rosterConstruction.canRelieve', 'high')],
      });
    }
  }

  if (hasConstraint(config, 'lineup') && input.roster.lineupSlots) {
    const lineupIds = input.roster.lineupSlots.map((slot) => slot.playerId);
    const duplicateLineupIds = lineupIds.filter((id, index, ids) => ids.indexOf(id) !== index);
    const missingLineupIds = lineupIds.filter((id) => !playerMap.has(id));
    if (input.roster.lineupSlots.length !== 9 || duplicateLineupIds.length > 0 || missingLineupIds.length > 0) {
      addFinding(findings, {
        kind: 'lineup',
        severity: 'critical',
        trust: 'high',
        title: 'Lineup is not game-ready',
        detail: `Lineup slots: ${input.roster.lineupSlots.length}; duplicates: ${unique(duplicateLineupIds).length}; missing players: ${missingLineupIds.length}.`,
        affectedPlayerIds: unique([...duplicateLineupIds, ...missingLineupIds]),
        evidence: [
          evidence('lineup_slot', 'lineupSlotCount', input.roster.lineupSlots.length, 'roster.lineupSlots', 'high'),
          evidence('lineup_slot', 'duplicateLineupPlayers', unique(duplicateLineupIds).length, 'roster.lineupSlots', 'high'),
        ],
      });
    }
  }

  if (hasConstraint(config, 'pitch_arsenal')) {
    const maxPitchCount = config.spreadsheetAdvisories?.maxPitchCount ?? 5;
    for (const pitcher of activePlayers.filter(isPitcher)) {
      const arsenal = pitcher.arsenal ?? [];
      const invalidPitches = arsenal.filter((pitch) => !VALID_PITCHES.has(pitch));
      const hasFastball = arsenal.some((pitch) => FASTBALLS.has(pitch));
      const hasOffspeedOrBreaking = arsenal.some((pitch) => OFFSPEED_OR_BREAKING.has(pitch));
      if (arsenal.length === 0 || arsenal.length > maxPitchCount || invalidPitches.length > 0 || !hasFastball || !hasOffspeedOrBreaking) {
        const finding = addFinding(findings, {
          kind: 'pitch_arsenal',
          severity: 'warning',
          trust: 'high',
          title: `${pitcher.name} pitch arsenal needs review`,
          detail: `Arsenal has ${arsenal.length} pitch(es). Fastball: ${hasFastball}; offspeed/breaking: ${hasOffspeedOrBreaking}; invalid: ${invalidPitches.join(', ') || 'none'}.`,
          affectedPlayerIds: [pitcher.id],
          evidence: [evidence('rating', 'arsenal', arsenal.join(', ') || 'missing', 'player.arsenal', 'high')],
        });
        addRecommendation(recommendations, {
          kind: 'pitch_arsenal_review',
          severity: 'warning',
          trust: 'high',
          title: `Review ${pitcher.name}'s pitch mix`,
          rationale: 'Pitch mix warnings are adapted from app-native Builder pitch legality concepts and are advisory here.',
          playerIds: [pitcher.id],
          evidence: finding.evidence,
          caveats: ['No pitch edits are applied by the analyzer.'],
        });
      }
    }
  }

  if (hasConstraint(config, 'team_profile')) {
    const concentrationThreshold = config.spreadsheetAdvisories?.concentrationShareWarning ?? 0.3;
    if (profile.topNShare !== null && profile.topNShare > concentrationThreshold) {
      addFinding(findings, {
        kind: 'team_profile',
        severity: 'info',
        trust: 'medium',
        title: 'Roster appears top-heavy',
        detail: `Top ${config.spreadsheetAdvisories?.topN ?? 3} players account for ${(profile.topNShare * 100).toFixed(1)}% of available rating mass.`,
        evidence: [evidence('team_profile', 'topNShare', profile.topNShare, 'ratings concentration advisory', 'medium')],
      });
    }
  }

  if (hasConstraint(config, 'trait_usage')) {
    const traitCount = Object.values(profile.traitCounts).reduce((sum, count) => sum + count, 0);
    if (traitCount === 0) {
      addFinding(findings, {
        kind: 'trait_usage',
        severity: 'info',
        trust: 'unavailable',
        title: 'Trait data unavailable',
        detail: 'No traits were provided, so trait distribution advice is unavailable.',
        evidence: [evidence('missing_data', 'traits', false, 'player.traits', 'unavailable')],
      });
    }
  }

  if (hasConstraint(config, 'chemistry_balance')) {
    if (Object.keys(profile.chemistryCounts).length === 0) {
      addFinding(findings, {
        kind: 'chemistry_balance',
        severity: 'info',
        trust: 'unavailable',
        title: 'Chemistry data unavailable',
        detail: 'No chemistry values were provided; chemistry distribution is not evaluated.',
        evidence: [evidence('missing_data', 'chemistry', false, 'player.chemistry', 'unavailable')],
      });
    } else if (config.chemistryRules?.desiredMinimums) {
      for (const [chemistry, minimum] of Object.entries(config.chemistryRules.desiredMinimums)) {
        const count = profile.chemistryCounts[chemistry] ?? 0;
        if (count < minimum) {
          addFinding(findings, {
            kind: 'chemistry_balance',
            severity: 'info',
            trust: 'medium',
            title: `${chemistry} chemistry is underrepresented`,
            detail: `${chemistry}: ${count}; advisory minimum: ${minimum}.`,
            evidence: [evidence('chemistry', chemistry, count, 'player.chemistry', 'medium')],
          });
        }
      }
    }
  }

  if (hasConstraint(config, 'salary_value') && config.salary?.enabled) {
    if (profile.salaryTotal === null) {
      addFinding(findings, {
        kind: 'salary_value',
        severity: 'info',
        trust: config.trustPolicy.missingSalaryTrust,
        title: 'Salary data unavailable',
        detail: 'Salary advice is unavailable because no player salaries were provided.',
        evidence: [evidence('missing_data', 'salary', false, 'player.salary', config.trustPolicy.missingSalaryTrust)],
      });
    } else if (config.salary.unit === 'unknown') {
      addFinding(findings, {
        kind: 'salary_value',
        severity: 'info',
        trust: 'low',
        title: 'Salary unit unknown',
        detail: 'Salary totals are present, but units are unknown; cap/luxury advice remains non-authoritative.',
        evidence: [evidence('salary', 'salaryTotal', profile.salaryTotal, 'player.salary', 'low')],
      });
    } else if (typeof config.salary.luxuryCap === 'number' && profile.salaryTotal > config.salary.luxuryCap) {
      addFinding(findings, {
        kind: 'luxury_cap',
        severity: 'info',
        trust: 'medium',
        title: 'Luxury-style advisory threshold exceeded',
        detail: `Salary total ${profile.salaryTotal} is above configured advisory threshold ${config.salary.luxuryCap}.`,
        evidence: [evidence('salary', 'salaryTotal', profile.salaryTotal, 'player.salary', 'medium')],
      });
    }
  }

  if (hasConstraint(config, 'farm_options') && farmPlayers.length > 0) {
    const farmPitchers = farmPlayers.filter(isPitcher);
    const farmPositionPlayers = farmPlayers.filter((player) => !isPitcher(player));
    const moveRecommendations = rosterMoveRecommendations(activePlayers, farmPlayers);

    if (farmPitchers.length === 0 || farmPositionPlayers.length === 0) {
      addFinding(findings, {
        kind: 'farm_options',
        severity: 'info',
        trust: 'high',
        title: 'Farm roster depth is imbalanced',
        detail: `Farm roster has ${farmPositionPlayers.length} position player(s) and ${farmPitchers.length} pitcher(s); review role balance before relying on it for coverage.`,
        affectedPlayerIds: farmPlayers.map((player) => player.id),
        evidence: [
          evidence('farm_record', 'farmPositionPlayers', farmPositionPlayers.length, 'roster.farmPlayerIds', 'high'),
          evidence('farm_record', 'farmPitchers', farmPitchers.length, 'roster.farmPlayerIds', 'high'),
        ],
      });
    }

    for (const [position, minimum] of Object.entries(config.rosterTargets.positionMinimums ?? {})) {
      const candidates = activeGapFarmCandidates(activePlayers, farmPlayers, position, minimum);
      if (candidates.length === 0) continue;
      const trust: AnalyzerTrustLevel = candidates.some((player) => player.optionState?.ratingRevealState === 'hidden' || player.optionState?.ratingRevealState === 'partial')
        ? 'medium'
        : 'high';
      const finding = addFinding(findings, {
        kind: 'farm_options',
        severity: 'info',
        trust,
        title: `Farm has ${position} coverage for an active roster gap`,
        detail: `Active roster is below ${position} target; ${candidates.length} farm player(s) can be reviewed as coverage candidates.`,
        affectedPlayerIds: candidates.map((player) => player.id),
        evidence: [
          evidence('roster_status', `${position}ActiveCoverage`, activePlayers.filter((player) => positionMatches(player, position)).length, 'active roster positions', 'high'),
          evidence('farm_record', `${position}FarmCoverage`, candidates.length, 'farm roster positions', trust),
        ],
      });
      const candidateNames = candidates.map((player) => player.name).join(', ');
      const candidateRecommendation = candidates
        .map((player) => moveRecommendationForPlayer(moveRecommendations, player.id, 'call_up'))
        .find(Boolean);
      addRecommendation(recommendations, {
        kind: 'call_up_advice',
        severity: 'info',
        trust,
        execution: 'read_only',
        title: `Call-up advice: review farm ${position} coverage`,
        rationale: callUpAdviceRationale(candidateNames, scoutConfidenceLabel(candidates[0], candidateRecommendation)),
        playerIds: candidates.map((player) => player.id),
        evidence: finding.evidence,
        caveats: ['Scout-visible advisory only; hidden farm internals are not used.', 'No call-up or send-down is executed by this report.'],
      });
    }

    const farmStarterCandidates = farmPlayers.filter(isStarter);
    const activeStarterCount = activePlayers.filter(isStarter).length;
    if (activeStarterCount < (config.rosterTargets.rotationSize ?? 4) && farmStarterCandidates.length > 0) {
      const finding = addFinding(findings, {
        kind: 'farm_options',
        severity: 'info',
        trust: 'medium',
        title: 'Farm has starter depth for rotation review',
        detail: `Rotation is below target and ${farmStarterCandidates.length} farm starter candidate(s) are available for manual review.`,
        affectedPlayerIds: farmStarterCandidates.map((player) => player.id),
        evidence: [evidence('farm_record', 'farmStarterCandidates', farmStarterCandidates.length, 'farm roster positions', 'medium')],
      });
      addRecommendation(recommendations, {
        kind: 'call_up_advice',
        severity: 'info',
        trust: 'medium',
        execution: 'read_only',
        title: 'Call-up advice: review farm starter depth',
        rationale: callUpAdviceRationale(
          farmStarterCandidates.map((player) => player.name).join(', '),
          scoutConfidenceLabel(farmStarterCandidates[0], moveRecommendationForPlayer(moveRecommendations, farmStarterCandidates[0]?.id ?? '', 'call_up')),
        ),
        playerIds: farmStarterCandidates.map((player) => player.id),
        evidence: finding.evidence,
        caveats: ['Scout-visible advisory only; hidden farm internals are not used.', 'No rotation or roster move is applied by the analyzer.'],
      });
    }

    const handledSendDownIds = new Set<string>();
    for (const moveRecommendation of moveRecommendations.filter((recommendation) => recommendation.kind === 'send_down')) {
      if (handledSendDownIds.has(moveRecommendation.playerId)) continue;
      handledSendDownIds.add(moveRecommendation.playerId);
      const activePlayer = activePlayers.find((player) => player.id === moveRecommendation.playerId);
      if (!activePlayer) continue;
      const assessment = sendDownLegalityAssessment(activePlayers, activePlayer.id);
      if (!assessment.safe) {
        addFinding(findings, {
          kind: 'farm_options',
          severity: 'warning',
          trust: 'high',
          title: `Send-down advice suppressed for ${activePlayer.name}`,
          detail: `${activePlayer.name} was a surplus candidate, but removing this player would break canonical roster legality before a replacement is selected.`,
          affectedPlayerIds: [activePlayer.id],
          evidence: [
            evidence('roster_status', 'postSendDownLegalRoster', isLegalRoster(assessment.projectedSlots), 'rosterConstruction.isLegalRoster', 'high'),
            evidence('roster_status', 'postSendDownCatcherCoverNeed', assessment.need.catcherCoverNeed, 'rosterNeedBreakdown', 'high'),
            evidence('roster_status', 'postSendDownPitcherNeed', assessment.need.pitcherNeed, 'rosterNeedBreakdown', 'high'),
            evidence('roster_status', 'postSendDownWouldStrandRoster', assessment.strands, 'rosterNeed.wouldStrandRoster', 'high'),
          ],
        });
        continue;
      }

      const replacement = moveRecommendation.replacesPlayerId
        ? farmPlayers.find((player) => player.id === moveRecommendation.replacesPlayerId)
        : undefined;
      addRecommendation(recommendations, {
        kind: 'send_down_advice',
        severity: 'info',
        trust: 'high',
        execution: 'read_only',
        title: `Send-down advice: review ${activePlayer.name}`,
        rationale: replacement
          ? `${activePlayer.name} is a legal surplus send-down candidate if paired with a manual review of ${replacement.name}.`
          : sendDownAdviceRationale(activePlayer.name),
        playerIds: [activePlayer.id],
        evidence: [
          evidence('roster_status', 'postSendDownLegalRoster', isLegalRoster(assessment.projectedSlots), 'rosterConstruction.isLegalRoster', 'high'),
          evidence('farm_record', 'surplusGap', moveRecommendation.surplusGap, 'recommendRosterMoves', 'high'),
        ],
        caveats: ['Read-only advice only; this engine does not move players.', 'Manual moves remain allowed by the roster transaction UI.'],
      });
    }

    for (const farmPlayer of farmPlayers) {
      const optionState = farmPlayer.optionState;
      const ratingRevealState = optionState?.ratingRevealState;
      const optionUsage = optionUsageLabel(farmPlayer);
      if (typeof optionUsage.used === 'number' && typeof optionUsage.max === 'number') {
        if (optionUsage.used >= optionUsage.max) {
          const finding = addFinding(findings, {
            kind: 'farm_options',
            severity: 'warning',
            trust: 'high',
            title: `${farmPlayer.name} is out of options`,
            detail: `${farmPlayer.name} has used ${optionUsage.used}/${optionUsage.max} options this season; send-down advice is unavailable or high risk.`,
            affectedPlayerIds: [farmPlayer.id],
            evidence: [evidence('farm_record', 'seasonOptionsUsed', optionUsage.used, 'player.optionState', 'high')],
          });
          addRecommendation(recommendations, {
            kind: 'send_down_advice',
            severity: 'warning',
            trust: 'high',
            execution: 'read_only',
            title: `Send-down advice: review ${farmPlayer.name}'s option status`,
            rationale: sendDownAdviceRationale(farmPlayer.name),
            playerIds: [farmPlayer.id],
            evidence: finding.evidence,
            caveats: ['The analyzer does not execute send-downs or releases.'],
          });
        } else if (optionUsage.remaining === 1) {
          addFinding(findings, {
            kind: 'farm_options',
            severity: 'warning',
            trust: 'high',
            title: `${farmPlayer.name} has limited option flexibility`,
            detail: `${farmPlayer.name} has used ${optionUsage.used}/${optionUsage.max} options this season; only ${optionUsage.remaining} option remains.`,
            affectedPlayerIds: [farmPlayer.id],
            evidence: [evidence('farm_record', 'optionsRemaining', optionUsage.remaining, 'player.optionState', 'high')],
          });
        }
      } else {
        addFinding(findings, {
          kind: 'farm_options',
          severity: 'info',
          trust: 'low',
          title: `${farmPlayer.name} option usage is unavailable`,
          detail: 'Farm option state is missing, so option-risk advice is low confidence.',
          affectedPlayerIds: [farmPlayer.id],
          evidence: [evidence('missing_data', 'seasonOptionsUsed', false, 'player.optionState', 'low')],
        });
      }

      if (!optionState || ratingRevealState === 'hidden' || ratingRevealState === 'partial') {
        const trust: AnalyzerTrustLevel = ratingRevealState === 'partial' ? 'medium' : 'low';
        const finding = addFinding(findings, {
          kind: 'farm_options',
          severity: 'info',
          trust,
          title: `${farmPlayer.name} farm advice is limited`,
          detail: `Farm player has ${ratingRevealState ?? 'unknown'} ratings; any call-up advice is read-only and low confidence.`,
          affectedPlayerIds: [farmPlayer.id],
          evidence: [evidence('farm_record', 'ratingRevealState', ratingRevealState ?? 'unknown', 'player.optionState', trust)],
        });
        addRecommendation(recommendations, {
          kind: 'call_up_advice',
          severity: 'info',
          trust,
          execution: 'read_only',
          title: `Call-up advice: monitor ${farmPlayer.name}`,
          rationale: callUpAdviceRationale(
            farmPlayer.name,
            scoutConfidenceLabel(farmPlayer, moveRecommendationForPlayer(moveRecommendations, farmPlayer.id, 'call_up')),
          ),
          playerIds: [farmPlayer.id],
          evidence: finding.evidence,
          caveats: ['Scout-visible advisory only; hidden farm internals are not used.', 'The analyzer does not execute call-ups or send-downs.'],
        });
      }
    }

    addFinding(findings, {
      kind: 'farm_options',
      severity: 'info',
      trust: 'low',
      title: 'Farm flavor systems are not active inputs',
      detail: 'Farm morale, narrative hooks, and offseason adapters are unavailable to this read-only report, so farm advice remains planning-only.',
      evidence: [evidence('deferred_system', 'farmFlavorSystems', false, 'deferred farm/offseason systems', 'low')],
    });
  }

  for (const limitation of profile.limitations) {
    addFinding(findings, {
      kind: 'data_integrity',
      severity: 'info',
      trust: 'low',
      title: 'Analyzer limitation',
      detail: limitation,
      evidence: [evidence('missing_data', limitation, true, 'analyzer_profile', 'low')],
    });
  }

  return {
    identity: {
      ...input.identity,
      generatedAt: input.identity.generatedAt ?? 'deterministic-roster-analyzer',
    },
    summary: severitySummary(findings, recommendations.length),
    findings,
    recommendations,
    trust: trustSummary(profile, input),
    generatedFrom: [
      {
        source: input.identity.mode === 'franchise' ? 'franchise_players' : 'builder_state',
        description: 'Caller-provided roster analyzer DTOs',
        trust: 'high',
      },
      {
        source: 'config',
        description: config.presetId,
        trust: 'high',
      },
    ],
    profile,
  };
}
