import type {
  FranchiseSeasonEndReadinessReport,
  FranchiseSeasonEndReadinessStatus,
} from './franchiseSeasonEndReadiness';

export const FRANCHISE_SEASON_HANDOFF_PLAN_VERSION =
  'franchise-season-handoff-plan-v1-readonly';

export type FranchiseSeasonHandoffPlanStatus = 'review-only' | 'blocked' | 'not-ready';

export type FranchiseSeasonHandoffPlanSectionKey =
  | 'eligible-review-evidence'
  | 'blocked-carryover-categories'
  | 'unresolved-blockers'
  | 'warnings'
  | 'future-decisions-required';

export type FranchiseSeasonHandoffDecisionCategoryKey =
  | 'random-event-log'
  | 'morale-snapshots-history'
  | 'daily-morale-summaries'
  | 'expected-wins-baselines'
  | 'stadium-records'
  | 'designation-readiness'
  | 'relationships';

export interface FranchiseSeasonHandoffPlanScope {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
}

export interface FranchiseSeasonHandoffSummaryCounts {
  randomEvents?: {
    confirmed?: number;
    dismissed?: number;
    unconfirmed?: number;
  };
  moraleSnapshots?: number;
  dailyMoraleSnapshots?: number;
  expectedWinsBaselines?: number;
  stadiumRecords?: number;
  designationReadinessRows?: number;
  relationshipContextReports?: number;
}

export interface BuildFranchiseSeasonHandoffPlanInput extends FranchiseSeasonHandoffPlanScope {
  readinessReport: FranchiseSeasonEndReadinessReport | null;
  summaryCounts?: FranchiseSeasonHandoffSummaryCounts;
}

export interface FranchiseSeasonHandoffDecisionCategory {
  key: FranchiseSeasonHandoffDecisionCategoryKey;
  label: string;
  disposition: 'review-only' | 'blocked';
  evidenceCount: number | null;
  decisionRequired: string;
  carryoverAllowed: false;
}

export interface FranchiseSeasonHandoffPlanSection {
  key: FranchiseSeasonHandoffPlanSectionKey;
  label: string;
  status: FranchiseSeasonHandoffPlanStatus;
  items: string[];
}

export interface FranchiseSeasonHandoffPlanPolicyFlags {
  mode3ExecutionAllowed: false;
  seasonRolloverAllowed: false;
  carryoverWritesAllowed: false;
  salaryMovementAllowed: false;
  trueValuePromotionAllowed: false;
  designationCarryoverAllowed: false;
  relationshipCarryoverAllowed: false;
  storyPersistenceAllowed: false;
  automaticMoraleDriftAllowed: false;
}

export interface FranchiseSeasonHandoffPlan extends FranchiseSeasonHandoffPlanScope {
  contractVersion: typeof FRANCHISE_SEASON_HANDOFF_PLAN_VERSION;
  generatedAt: number;
  status: FranchiseSeasonHandoffPlanStatus;
  readinessStatus: FranchiseSeasonEndReadinessStatus | 'missing';
  sections: FranchiseSeasonHandoffPlanSection[];
  decisionCategories: FranchiseSeasonHandoffDecisionCategory[];
  blockers: string[];
  warnings: string[];
  futureDecisionsRequired: string[];
  policyFlags: FranchiseSeasonHandoffPlanPolicyFlags;
  readOnly: true;
  hiddenSafe: true;
  mode3ExecutionAllowed: false;
  mutatesState: false;
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function scopeValid(scope: FranchiseSeasonHandoffPlanScope): boolean {
  return Boolean(
    hasText(scope.franchiseId) &&
      hasText(scope.seasonId) &&
      hasText(scope.statsScopeId) &&
      Number.isInteger(scope.seasonNumber) &&
      scope.seasonNumber > 0,
  );
}

function scopeMatches(
  scope: FranchiseSeasonHandoffPlanScope,
  report: FranchiseSeasonEndReadinessReport | null,
): boolean {
  return Boolean(
    report &&
      report.franchiseId === scope.franchiseId &&
      report.seasonId === scope.seasonId &&
      report.statsScopeId === scope.statsScopeId &&
      report.seasonNumber === scope.seasonNumber,
  );
}

function policies(): FranchiseSeasonHandoffPlanPolicyFlags {
  return {
    mode3ExecutionAllowed: false,
    seasonRolloverAllowed: false,
    carryoverWritesAllowed: false,
    salaryMovementAllowed: false,
    trueValuePromotionAllowed: false,
    designationCarryoverAllowed: false,
    relationshipCarryoverAllowed: false,
    storyPersistenceAllowed: false,
    automaticMoraleDriftAllowed: false,
  };
}

function statusFromReadiness(
  scope: FranchiseSeasonHandoffPlanScope,
  readinessReport: FranchiseSeasonEndReadinessReport | null,
): FranchiseSeasonHandoffPlanStatus {
  if (!scopeValid(scope) || !readinessReport || !scopeMatches(scope, readinessReport)) return 'blocked';
  if (readinessReport.status === 'blocked') return 'blocked';
  if (readinessReport.status === 'incomplete') return 'not-ready';
  return 'review-only';
}

function section(
  key: FranchiseSeasonHandoffPlanSectionKey,
  label: string,
  status: FranchiseSeasonHandoffPlanStatus,
  items: string[],
): FranchiseSeasonHandoffPlanSection {
  return { key, label, status, items: unique(items) };
}

function sectionCount(
  readinessReport: FranchiseSeasonEndReadinessReport | null,
  key: string,
): number | null {
  const found = readinessReport?.sections.find((entry) => entry.key === key);
  return typeof found?.count === 'number' ? found.count : null;
}

function decisionCategories(
  readinessReport: FranchiseSeasonEndReadinessReport | null,
  counts: FranchiseSeasonHandoffSummaryCounts | undefined,
): FranchiseSeasonHandoffDecisionCategory[] {
  return [
    {
      key: 'random-event-log',
      label: 'Random-event log',
      disposition: 'review-only',
      evidenceCount: counts?.randomEvents
        ? (counts.randomEvents.confirmed ?? 0) + (counts.randomEvents.dismissed ?? 0) + (counts.randomEvents.unconfirmed ?? 0)
        : sectionCount(readinessReport, 'random-event-log'),
      decisionRequired: 'Review confirmed/dismissed/unconfirmed prompts only; do not migrate stories or create new narrative records.',
      carryoverAllowed: false,
    },
    {
      key: 'morale-snapshots-history',
      label: 'Morale snapshots/history',
      disposition: 'review-only',
      evidenceCount: counts?.moraleSnapshots ?? sectionCount(readinessReport, 'morale-state'),
      decisionRequired: 'Review fan/player morale state only; no drift, recovery, or carryover mutation is allowed.',
      carryoverAllowed: false,
    },
    {
      key: 'daily-morale-summaries',
      label: 'Daily morale summaries',
      disposition: 'review-only',
      evidenceCount: counts?.dailyMoraleSnapshots ?? sectionCount(readinessReport, 'daily-morale-summaries'),
      decisionRequired: 'Review daily high/low/average evidence only; do not seed next-season baselines.',
      carryoverAllowed: false,
    },
    {
      key: 'expected-wins-baselines',
      label: 'Expected-wins baselines',
      disposition: 'review-only',
      evidenceCount: counts?.expectedWinsBaselines ?? sectionCount(readinessReport, 'expected-wins-baseline'),
      decisionRequired: 'Review preview expected-wins baseline evidence only; do not seed future-season expectations.',
      carryoverAllowed: false,
    },
    {
      key: 'stadium-records',
      label: 'Stadium records',
      disposition: 'review-only',
      evidenceCount: counts?.stadiumRecords ?? sectionCount(readinessReport, 'stadium-records'),
      decisionRequired: 'Review historical stadium evidence only; do not carry adaptive park factors or park-adjusted WAR/value.',
      carryoverAllowed: false,
    },
    {
      key: 'designation-readiness',
      label: 'Designation readiness',
      disposition: 'blocked',
      evidenceCount: counts?.designationReadinessRows ?? sectionCount(readinessReport, 'designation-readiness'),
      decisionRequired: 'Final designation locking/carryover requires a future explicit promotion decision.',
      carryoverAllowed: false,
    },
    {
      key: 'relationships',
      label: 'Relationships',
      disposition: 'blocked',
      evidenceCount: counts?.relationshipContextReports ?? sectionCount(readinessReport, 'relationship-context'),
      decisionRequired: 'Relationship context remains draft/read-only; no durable relationship state or carryover exists.',
      carryoverAllowed: false,
    },
  ];
}

function eligibleEvidenceItems(categories: FranchiseSeasonHandoffDecisionCategory[]): string[] {
  return categories.map((category) =>
    `${category.label}: ${category.evidenceCount ?? 'unknown'} scoped evidence item(s), ${category.disposition}. ${category.decisionRequired}`,
  );
}

function futureDecisions(): string[] {
  return [
    'Define season rollover storage and copy-not-reference handoff rules before any write path exists.',
    'Decide whether confirmed random-event facts become future story context without creating new story persistence.',
    'Decide whether morale snapshots/history seed future baselines, drift, or recovery; currently blocked.',
    'Define expected-wins baseline carry-forward policy; preview baselines cannot seed future expectations yet.',
    'Define stadium record history versus adaptive park-factor carryover; adaptive factors remain blocked.',
    'Promote final True Value/designation locking only after trusted inputs and hidden-safety policy are approved.',
    'Define durable relationship state before relationship carryover or effects are allowed.',
  ];
}

export function buildFranchiseSeasonHandoffPlan(
  input: BuildFranchiseSeasonHandoffPlanInput,
): FranchiseSeasonHandoffPlan {
  const readinessReport = input.readinessReport;
  const status = statusFromReadiness(input, readinessReport);
  const categories = decisionCategories(readinessReport, input.summaryCounts);
  const scopeBlockers = [
    ...(!scopeValid(input)
      ? ['Season handoff plan requires non-empty franchiseId, seasonId, statsScopeId, and positive seasonNumber.']
      : []),
    ...(readinessReport && !scopeMatches(input, readinessReport)
      ? ['Season-end readiness report scope does not match handoff plan scope.']
      : []),
    ...(!readinessReport ? ['Season-end readiness report is required before handoff planning.'] : []),
  ];
  const readinessBlockers = readinessReport?.status === 'blocked' ? readinessReport.blockers : [];
  const blockers = unique([...scopeBlockers, ...readinessBlockers]);
  const warnings = unique([
    ...(readinessReport?.status === 'incomplete'
      ? ['Season-end readiness is incomplete; handoff plan is not ready for review.']
      : []),
    ...(readinessReport?.warnings ?? []),
    'Season handoff planning is review-only and does not authorize Mode 3/offseason execution.',
  ]);
  const futureDecisionsRequired = futureDecisions();

  return {
    contractVersion: FRANCHISE_SEASON_HANDOFF_PLAN_VERSION,
    generatedAt: 0,
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    statsScopeId: input.statsScopeId,
    seasonNumber: input.seasonNumber,
    status,
    readinessStatus: readinessReport?.status ?? 'missing',
    sections: [
      section('eligible-review-evidence', 'Eligible review evidence', status, eligibleEvidenceItems(categories)),
      section('blocked-carryover-categories', 'Blocked carryover categories', status, categories.map((category) =>
        `${category.label}: carryover allowed ${String(category.carryoverAllowed)}.`,
      )),
      section('unresolved-blockers', 'Unresolved blockers', blockers.length > 0 ? 'blocked' : status, blockers.length > 0 ? blockers : ['No unresolved blockers from the readiness report.']),
      section('warnings', 'Warnings', status, warnings),
      section('future-decisions-required', 'Future decisions required', status, futureDecisionsRequired),
    ],
    decisionCategories: categories,
    blockers,
    warnings,
    futureDecisionsRequired,
    policyFlags: policies(),
    readOnly: true,
    hiddenSafe: true,
    mode3ExecutionAllowed: false,
    mutatesState: false,
  };
}
