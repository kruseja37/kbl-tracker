export const FRANCHISE_SEASON_END_READINESS_VERSION =
  'franchise-season-end-readiness-v1-readonly';

export type FranchiseSeasonEndReadinessStatus = 'ready-for-review' | 'blocked' | 'incomplete';
export type FranchiseSeasonEndChecklistStatus = 'complete' | 'warning' | 'missing' | 'blocked';

export type FranchiseSeasonEndReadinessSectionKey =
  | 'scope'
  | 'game-archive-scope'
  | 'random-event-log'
  | 'morale-state'
  | 'daily-morale-summaries'
  | 'expected-wins-baseline'
  | 'stadium-records'
  | 'designation-readiness'
  | 'relationship-context'
  | 'blocked-future-systems';

export interface FranchiseSeasonEndReadinessScope {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
}

interface FranchiseSeasonEndScopedRecord {
  franchiseId?: string | null;
  seasonId?: string | null;
  statsScopeId?: string | null;
  seasonNumber?: number | null;
}

export interface FranchiseSeasonEndGameArchiveRecord extends FranchiseSeasonEndScopedRecord {
  gameId?: string;
  aggregationStatus?: string;
  archiveBacked?: boolean;
}

export interface FranchiseSeasonEndRandomEventRecord extends FranchiseSeasonEndScopedRecord {
  id?: string;
  confirmation?: {
    state?: 'unconfirmed' | 'confirmed' | 'dismissed' | string;
  };
  appliedEffect?: {
    state?: string;
    blockers?: string[];
  };
  entry?: {
    blockers?: string[];
    warnings?: string[];
  };
  blockers?: string[];
  warnings?: string[];
}

export interface FranchiseSeasonEndMoraleSnapshotRecord extends FranchiseSeasonEndScopedRecord {
  targetType?: string;
  history?: unknown[];
}

export interface FranchiseSeasonEndDailyMoraleSnapshotRecord extends FranchiseSeasonEndScopedRecord {
  targetType?: string;
  limitations?: string[];
  blockers?: string[];
}

export interface FranchiseSeasonEndExpectedWinsBaselineRecord extends FranchiseSeasonEndScopedRecord {
  teamId?: string | null;
  status?: string;
  blockers?: string[];
  limitations?: string[];
}

export interface FranchiseSeasonEndStadiumRecord extends FranchiseSeasonEndScopedRecord {
  stadiumId?: string | null;
  recordType?: string;
  blockers?: string[];
  limitations?: string[];
}

export interface FranchiseSeasonEndDesignationReadinessSummary extends FranchiseSeasonEndScopedRecord {
  rows?: unknown[];
  blockers?: string[];
  limitations?: string[];
  hiddenSafe?: boolean;
  readOnly?: boolean;
  policies?: Record<string, unknown>;
}

export interface FranchiseSeasonEndRelationshipContextSummary extends FranchiseSeasonEndScopedRecord {
  rows?: unknown[];
  blockers?: string[];
  limitations?: string[];
  hiddenSafe?: boolean;
  policyFlags?: Record<string, unknown>;
  hiddenTruthGuard?: {
    status?: string;
    blockers?: string[];
  } | null;
}

export interface BuildFranchiseSeasonEndReadinessInput extends FranchiseSeasonEndReadinessScope {
  completedGameArchives?: FranchiseSeasonEndGameArchiveRecord[];
  randomEventLogRecords?: FranchiseSeasonEndRandomEventRecord[];
  moraleSnapshots?: FranchiseSeasonEndMoraleSnapshotRecord[];
  dailyMoraleSnapshots?: FranchiseSeasonEndDailyMoraleSnapshotRecord[];
  expectedWinsBaselineSnapshots?: FranchiseSeasonEndExpectedWinsBaselineRecord[];
  stadiumRecords?: FranchiseSeasonEndStadiumRecord[];
  designationReadinessReport?: FranchiseSeasonEndDesignationReadinessSummary | null;
  relationshipContextReports?: FranchiseSeasonEndRelationshipContextSummary[];
}

export interface FranchiseSeasonEndReadinessChecklistItem {
  key: string;
  label: string;
  status: FranchiseSeasonEndChecklistStatus;
  count?: number;
  detail: string;
}

export interface FranchiseSeasonEndReadinessSection {
  key: FranchiseSeasonEndReadinessSectionKey;
  label: string;
  status: FranchiseSeasonEndReadinessStatus;
  checklist: FranchiseSeasonEndReadinessChecklistItem[];
  blockers: string[];
  warnings: string[];
  count: number;
}

export interface FranchiseSeasonEndReadinessPolicyFlags {
  mode3ExecutionAllowed: false;
  seasonRolloverAllowed: false;
  salaryMovementAllowed: false;
  trueValuePromotionAllowed: false;
  designationCarryoverAllowed: false;
  relationshipMutationAllowed: false;
  storyPersistenceAllowed: false;
  automaticMoraleDriftAllowed: false;
}

export interface FranchiseSeasonEndReadinessReport extends FranchiseSeasonEndReadinessScope {
  contractVersion: typeof FRANCHISE_SEASON_END_READINESS_VERSION;
  generatedAt: number;
  status: FranchiseSeasonEndReadinessStatus;
  sections: FranchiseSeasonEndReadinessSection[];
  checklist: FranchiseSeasonEndReadinessChecklistItem[];
  blockers: string[];
  warnings: string[];
  policyFlags: FranchiseSeasonEndReadinessPolicyFlags;
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

function policies(): FranchiseSeasonEndReadinessPolicyFlags {
  return {
    mode3ExecutionAllowed: false,
    seasonRolloverAllowed: false,
    salaryMovementAllowed: false,
    trueValuePromotionAllowed: false,
    designationCarryoverAllowed: false,
    relationshipMutationAllowed: false,
    storyPersistenceAllowed: false,
    automaticMoraleDriftAllowed: false,
  };
}

function scopeValid(scope: FranchiseSeasonEndReadinessScope): boolean {
  return Boolean(
    hasText(scope.franchiseId) &&
      hasText(scope.seasonId) &&
      hasText(scope.statsScopeId) &&
      Number.isInteger(scope.seasonNumber) &&
      scope.seasonNumber > 0,
  );
}

function sameScope(scope: FranchiseSeasonEndReadinessScope, record: FranchiseSeasonEndScopedRecord): boolean {
  return (
    record.franchiseId === scope.franchiseId &&
    record.seasonId === scope.seasonId &&
    record.statsScopeId === scope.statsScopeId &&
    record.seasonNumber === scope.seasonNumber
  );
}

function item(
  key: string,
  label: string,
  status: FranchiseSeasonEndChecklistStatus,
  detail: string,
  count?: number,
): FranchiseSeasonEndReadinessChecklistItem {
  return { key, label, status, detail, ...(typeof count === 'number' ? { count } : {}) };
}

function section(
  key: FranchiseSeasonEndReadinessSectionKey,
  label: string,
  checklist: FranchiseSeasonEndReadinessChecklistItem[],
  blockers: string[] = [],
  warnings: string[] = [],
  count = 0,
): FranchiseSeasonEndReadinessSection {
  const cleanBlockers = unique(blockers);
  const cleanWarnings = unique(warnings);
  const status: FranchiseSeasonEndReadinessStatus = cleanBlockers.length > 0
    ? 'blocked'
    : checklist.some((entry) => entry.status === 'missing' || entry.status === 'warning')
      ? 'incomplete'
      : 'ready-for-review';

  return {
    key,
    label,
    status,
    checklist,
    blockers: cleanBlockers,
    warnings: cleanWarnings,
    count,
  };
}

function missingSection(key: FranchiseSeasonEndReadinessSectionKey, label: string): FranchiseSeasonEndReadinessSection {
  return section(
    key,
    label,
    [item(`${key}:missing`, label, 'missing', `${label} summary was not provided for season-end review.`)],
    [],
    [`${label} summary missing; readiness remains incomplete, not failed.`],
  );
}

function scopeSection(input: BuildFranchiseSeasonEndReadinessInput): FranchiseSeasonEndReadinessSection {
  if (!scopeValid(input)) {
    return section(
      'scope',
      'Scope identity',
      [item(
        'scope:identity',
        'Explicit franchise/season/stats scope',
        'blocked',
        'Non-empty franchiseId, seasonId, statsScopeId, and positive seasonNumber are required.',
      )],
      ['Season-end readiness requires non-empty franchiseId, seasonId, statsScopeId, and positive seasonNumber.'],
    );
  }

  return section(
    'scope',
    'Scope identity',
    [item(
      'scope:identity',
      'Explicit franchise/season/stats scope',
      'complete',
      'Franchise, season, stats scope, and season number are explicit.',
    )],
    [],
    [],
    1,
  );
}

function scopedRows<T extends FranchiseSeasonEndScopedRecord>(
  scope: FranchiseSeasonEndReadinessScope,
  rows: T[] | undefined,
): T[] {
  return (rows ?? []).filter((row) => sameScope(scope, row));
}

function gameArchiveSection(input: BuildFranchiseSeasonEndReadinessInput): FranchiseSeasonEndReadinessSection {
  if (!input.completedGameArchives) return missingSection('game-archive-scope', 'Game archive scope');
  const scoped = scopedRows(input, input.completedGameArchives);
  const complete = scoped.filter((game) => game.aggregationStatus !== 'incomplete');
  const incomplete = scoped.length - complete.length;
  const checklist = [
    item(
      'games:archive-count',
      'Scoped completed archives',
      complete.length > 0 ? 'complete' : 'missing',
      complete.length > 0
        ? `${complete.length} scoped completed archive-backed game row(s) are available.`
        : 'No scoped completed archive-backed games were provided.',
      complete.length,
    ),
  ];
  const warnings = incomplete > 0 ? [`${incomplete} scoped game archive row(s) are marked incomplete and ignored for readiness.`] : [];
  return section('game-archive-scope', 'Game archive scope', checklist, [], warnings, complete.length);
}

function randomEventSection(input: BuildFranchiseSeasonEndReadinessInput): FranchiseSeasonEndReadinessSection {
  if (!input.randomEventLogRecords) return missingSection('random-event-log', 'Random-event log');
  const scoped = scopedRows(input, input.randomEventLogRecords);
  const confirmed = scoped.filter((record) => record.confirmation?.state === 'confirmed').length;
  const dismissed = scoped.filter((record) => record.confirmation?.state === 'dismissed').length;
  const unconfirmed = scoped.filter((record) => !record.confirmation?.state || record.confirmation.state === 'unconfirmed').length;
  const blockers = scoped.flatMap((record) => [
    ...(record.blockers ?? []),
    ...(record.entry?.blockers ?? []),
    ...(record.appliedEffect?.blockers ?? []),
  ]);
  const warnings = scoped.flatMap((record) => [
    ...(record.warnings ?? []),
    ...(record.entry?.warnings ?? []),
  ]);
  if (unconfirmed > 0) {
    warnings.push(`${unconfirmed} random-event prompt(s) remain unconfirmed; review or dismiss before future handoff.`);
  }

  return section(
    'random-event-log',
    'Random-event confirmations',
    [
      item(
        'random-events:scoped',
        'Scoped random-event records',
        'complete',
        `${scoped.length} scoped random-event record(s): ${confirmed} confirmed, ${dismissed} dismissed, ${unconfirmed} unconfirmed.`,
        scoped.length,
      ),
      item(
        'random-events:unconfirmed',
        'Unconfirmed random-event prompts',
        unconfirmed > 0 ? 'warning' : 'complete',
        unconfirmed > 0
          ? 'Unconfirmed prompts do not auto-block, but season-end readiness remains incomplete until reviewed.'
          : 'No unconfirmed random-event prompts remain.',
        unconfirmed,
      ),
    ],
    blockers,
    warnings,
    scoped.length,
  );
}

function moraleSection(input: BuildFranchiseSeasonEndReadinessInput): FranchiseSeasonEndReadinessSection {
  if (!input.moraleSnapshots) return missingSection('morale-state', 'Fan/player morale state');
  const scoped = scopedRows(input, input.moraleSnapshots);
  const fan = scoped.filter((snapshot) => snapshot.targetType === 'team-fan').length;
  const player = scoped.filter((snapshot) => snapshot.targetType === 'player').length;
  const historyEntries = scoped.reduce((total, snapshot) => total + (snapshot.history?.length ?? 0), 0);
  return section(
    'morale-state',
    'Fan/player morale state',
    [
      item(
        'morale:snapshots',
        'Scoped morale snapshots',
        scoped.length > 0 ? 'complete' : 'missing',
        `${fan} team fan snapshot(s), ${player} player snapshot(s), ${historyEntries} history entr${historyEntries === 1 ? 'y' : 'ies'} available.`,
        scoped.length,
      ),
    ],
    [],
    [],
    scoped.length,
  );
}

function dailyMoraleSection(input: BuildFranchiseSeasonEndReadinessInput): FranchiseSeasonEndReadinessSection {
  if (!input.dailyMoraleSnapshots) return missingSection('daily-morale-summaries', 'Daily morale summaries');
  const scoped = scopedRows(input, input.dailyMoraleSnapshots);
  return section(
    'daily-morale-summaries',
    'Daily morale summaries',
    [item(
      'daily-morale:snapshots',
      'Scoped daily morale summary snapshots',
      scoped.length > 0 ? 'complete' : 'missing',
      `${scoped.length} scoped daily morale summary snapshot(s) are available.`,
      scoped.length,
    )],
    scoped.flatMap((snapshot) => snapshot.blockers ?? []),
    scoped.flatMap((snapshot) => snapshot.limitations ?? []),
    scoped.length,
  );
}

function expectedWinsSection(input: BuildFranchiseSeasonEndReadinessInput): FranchiseSeasonEndReadinessSection {
  if (!input.expectedWinsBaselineSnapshots) return missingSection('expected-wins-baseline', 'Expected-wins baseline evidence');
  const scoped = scopedRows(input, input.expectedWinsBaselineSnapshots);
  const blockers = scoped.flatMap((snapshot) => [
    ...(snapshot.status === 'blocked' ? [`Expected-wins baseline for ${snapshot.teamId ?? 'unknown team'} is blocked.`] : []),
    ...(snapshot.blockers ?? []),
  ]);
  return section(
    'expected-wins-baseline',
    'Expected-wins baseline evidence',
    [item(
      'expected-wins:baselines',
      'Scoped expected-wins baseline snapshots',
      scoped.length > 0 ? 'complete' : 'missing',
      `${scoped.length} scoped expected-wins baseline snapshot(s) are available as preview-only evidence.`,
      scoped.length,
    )],
    blockers,
    scoped.flatMap((snapshot) => snapshot.limitations ?? []),
    scoped.length,
  );
}

function stadiumSection(input: BuildFranchiseSeasonEndReadinessInput): FranchiseSeasonEndReadinessSection {
  if (!input.stadiumRecords) return missingSection('stadium-records', 'Stadium records/spray evidence');
  const scoped = scopedRows(input, input.stadiumRecords);
  return section(
    'stadium-records',
    'Stadium records/spray evidence',
    [item(
      'stadium:records',
      'Scoped stadium records/spray evidence',
      scoped.length > 0 ? 'complete' : 'missing',
      `${scoped.length} scoped stadium record/spray evidence row(s) are available.`,
      scoped.length,
    )],
    scoped.flatMap((record) => record.blockers ?? []),
    scoped.flatMap((record) => record.limitations ?? []),
    scoped.length,
  );
}

function designationSection(input: BuildFranchiseSeasonEndReadinessInput): FranchiseSeasonEndReadinessSection {
  const report = input.designationReadinessReport;
  if (!report) return missingSection('designation-readiness', 'Designation readiness');
  const scopeMatches = sameScope(input, report);
  const rows = report.rows ?? [];
  const blockers = [
    ...(scopeMatches ? [] : ['Designation readiness report scope does not match season-end readiness scope.']),
    ...(report.blockers ?? []),
  ];

  return section(
    'designation-readiness',
    'Designation readiness',
    [item(
      'designation:rows',
      'Read-only designation readiness rows',
      rows.length > 0 && scopeMatches ? 'complete' : 'missing',
      `${rows.length} designation readiness row(s) are available. Final designation locking/carryover remains blocked.`,
      rows.length,
    )],
    blockers,
    report.limitations ?? [],
    rows.length,
  );
}

function relationshipSection(input: BuildFranchiseSeasonEndReadinessInput): FranchiseSeasonEndReadinessSection {
  if (!input.relationshipContextReports) return missingSection('relationship-context', 'Relationship context');
  const scoped = input.relationshipContextReports.filter((report) => sameScope(input, report));
  const rowCount = scoped.reduce((total, report) => total + (report.rows?.length ?? 0), 0);
  const blockers = scoped.flatMap((report) => report.blockers ?? []);
  const warnings = scoped.flatMap((report) => [
    ...(report.limitations ?? []),
    ...(report.hiddenTruthGuard?.status === 'invalid'
      ? ['Hidden FARM/prospect truth guard is active for relationship context.']
      : []),
  ]);

  return section(
    'relationship-context',
    'Relationship context',
    [item(
      'relationship:contexts',
      'Read-only relationship context reports',
      scoped.length > 0 ? 'complete' : 'missing',
      `${scoped.length} scoped relationship context report(s) with ${rowCount} proposal boundary row(s) are available.`,
      scoped.length,
    )],
    blockers,
    warnings,
    scoped.length,
  );
}

function blockedFutureSystemsSection(): FranchiseSeasonEndReadinessSection {
  return section(
    'blocked-future-systems',
    'Blocked future systems',
    [
      item('future:mode3', 'Mode 3/offseason execution', 'complete', 'Mode 3/offseason execution remains disabled.'),
      item('future:rollover', 'Season rollover/carryover mutation', 'complete', 'Season rollover and carryover mutation remain disabled.'),
      item('future:value-salary', 'True Value/salary/designation promotion', 'complete', 'Final True Value, salary movement, and designation carryover remain disabled.'),
      item('future:relationships', 'Relationship/story/morale drift mutation', 'complete', 'Relationship mutation, story persistence, and automatic morale drift/recovery remain disabled.'),
    ],
    [],
    ['Season-end readiness is review-only evidence and does not authorize Mode 3 handoff.'],
    4,
  );
}

export function buildFranchiseSeasonEndReadinessReport(
  input: BuildFranchiseSeasonEndReadinessInput,
): FranchiseSeasonEndReadinessReport {
  const sections = [
    scopeSection(input),
    gameArchiveSection(input),
    randomEventSection(input),
    moraleSection(input),
    dailyMoraleSection(input),
    expectedWinsSection(input),
    stadiumSection(input),
    designationSection(input),
    relationshipSection(input),
    blockedFutureSystemsSection(),
  ];
  const blockers = unique(sections.flatMap((entry) => entry.blockers));
  const warnings = unique(sections.flatMap((entry) => entry.warnings));
  const status: FranchiseSeasonEndReadinessStatus = blockers.length > 0
    ? 'blocked'
    : sections.some((entry) => entry.status === 'incomplete')
      ? 'incomplete'
      : 'ready-for-review';

  return {
    contractVersion: FRANCHISE_SEASON_END_READINESS_VERSION,
    generatedAt: 0,
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    statsScopeId: input.statsScopeId,
    seasonNumber: input.seasonNumber,
    status,
    sections,
    checklist: sections.flatMap((entry) => entry.checklist),
    blockers,
    warnings,
    policyFlags: policies(),
    readOnly: true,
    hiddenSafe: true,
    mode3ExecutionAllowed: false,
    mutatesState: false,
  };
}
