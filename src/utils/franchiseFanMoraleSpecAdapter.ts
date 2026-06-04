export const FRANCHISE_FAN_MORALE_SPEC_ADAPTER_VERSION = 'franchise-fan-morale-spec-adapter-v1-readonly';

export type FranchiseFanMoraleSpecState =
  | 'EUPHORIC'
  | 'EXCITED'
  | 'CONTENT'
  | 'RESTLESS'
  | 'FRUSTRATED'
  | 'APATHETIC'
  | 'HOSTILE';

export type FranchiseFanMoraleTrend = 'RISING' | 'STABLE' | 'FALLING';
export type FranchiseFanMoraleRiskLevel = 'SAFE' | 'WATCH' | 'DANGER' | 'CRITICAL';
export type FranchiseFanMoraleSpecImplementationStatus = 'implemented' | 'partial' | 'deferred' | 'blocked';

export interface FranchiseFanMoraleSpecHistoryEntry {
  id?: string;
  sourceEventId?: string;
  sourceKind?: string;
  previousValue?: number;
  currentValue?: number;
  delta?: number;
  reason?: string;
  actorDisplayName?: string;
  timestamp?: string;
}

export interface FranchiseFanMoraleSpecSnapshotInput {
  franchiseId?: string;
  seasonId?: string;
  statsScopeId?: string;
  seasonNumber?: number;
  targetType?: string;
  teamId?: string;
  baselineValue?: number;
  currentValue?: number;
  lastModified?: string;
  history?: FranchiseFanMoraleSpecHistoryEntry[];
}

export interface FranchiseFanMoraleSpecStatusArea {
  status: FranchiseFanMoraleSpecImplementationStatus;
  label: string;
  reason: string;
}

export interface FranchiseFanMoraleSpecAdapterInput {
  snapshot?: FranchiseFanMoraleSpecSnapshotInput | null;
  fallbackTeamId?: string;
  fallbackTeamName?: string;
}

export interface FranchiseFanMoraleSpecViewModel {
  contractVersion: typeof FRANCHISE_FAN_MORALE_SPEC_ADAPTER_VERSION;
  teamId: string | null;
  teamName: string | null;
  currentValue: number;
  previousValue: number | null;
  trend: FranchiseFanMoraleTrend;
  state: FranchiseFanMoraleSpecState;
  riskLevel: FranchiseFanMoraleRiskLevel;
  lastEvent: {
    reason: string;
    sourceKind: string | null;
    timestamp: string | null;
    delta: number | null;
  } | null;
  implementationStatus: {
    canonicalStorage: FranchiseFanMoraleSpecStatusArea;
    confirmedEventEffects: FranchiseFanMoraleSpecStatusArea;
    teamHubDisplay: FranchiseFanMoraleSpecStatusArea;
    eventBackedHistory: FranchiseFanMoraleSpecStatusArea;
    randomEventConfirmation: FranchiseFanMoraleSpecStatusArea;
    scoreOnlyFanMorale: FranchiseFanMoraleSpecStatusArea;
    expectedWinsBaseline: FranchiseFanMoraleSpecStatusArea;
    performanceGapFormula: FranchiseFanMoraleSpecStatusArea;
    rosterCompositionFormula: FranchiseFanMoraleSpecStatusArea;
    randomEventWeighting: FranchiseFanMoraleSpecStatusArea;
    trueValueInputs: FranchiseFanMoraleSpecStatusArea;
    designations: FranchiseFanMoraleSpecStatusArea;
    beatReporterSentiment: FranchiseFanMoraleSpecStatusArea;
    freeAgencyConsequences: FranchiseFanMoraleSpecStatusArea;
    franchiseHealthConsequences: FranchiseFanMoraleSpecStatusArea;
    dailySnapshots: FranchiseFanMoraleSpecStatusArea;
    automaticGameTrackerMutation: FranchiseFanMoraleSpecStatusArea;
    playerMoraleCoupling: FranchiseFanMoraleSpecStatusArea;
    relationships: FranchiseFanMoraleSpecStatusArea;
    mode3OffseasonConsequences: FranchiseFanMoraleSpecStatusArea;
  };
  limitations: string[];
  readOnly: true;
  mutatesMorale: false;
  calculatesExpectedWins: false;
  trustsTrueValueDesignationsOrBeatReporter: false;
}

export function clampFanMoraleSpecValue(value: number | undefined | null): number {
  if (!Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(99, Math.round(value as number)));
}

export function getFanMoraleSpecState(value: number): FranchiseFanMoraleSpecState {
  const morale = clampFanMoraleSpecValue(value);
  if (morale >= 90) return 'EUPHORIC';
  if (morale >= 75) return 'EXCITED';
  if (morale >= 55) return 'CONTENT';
  if (morale >= 40) return 'RESTLESS';
  if (morale >= 25) return 'FRUSTRATED';
  if (morale >= 10) return 'APATHETIC';
  return 'HOSTILE';
}

export function getFanMoraleRiskLevel(value: number): FranchiseFanMoraleRiskLevel {
  const morale = clampFanMoraleSpecValue(value);
  if (morale < 10) return 'CRITICAL';
  if (morale < 25) return 'DANGER';
  if (morale < 40) return 'WATCH';
  return 'SAFE';
}

function status(
  statusValue: FranchiseFanMoraleSpecImplementationStatus,
  label: string,
  reason: string,
): FranchiseFanMoraleSpecStatusArea {
  return { status: statusValue, label, reason };
}

function latestHistoryEntry(history: FranchiseFanMoraleSpecHistoryEntry[]): FranchiseFanMoraleSpecHistoryEntry | null {
  if (history.length === 0) return null;
  return [...history].sort((a, b) => {
    const aTime = a.timestamp ? Date.parse(a.timestamp) : 0;
    const bTime = b.timestamp ? Date.parse(b.timestamp) : 0;
    return bTime - aTime;
  })[0] ?? null;
}

function deriveTrend(currentValue: number, latest: FranchiseFanMoraleSpecHistoryEntry | null): FranchiseFanMoraleTrend {
  if (!latest) return 'STABLE';
  if (Number.isFinite(latest.delta) && latest.delta !== 0) {
    return (latest.delta as number) > 0 ? 'RISING' : 'FALLING';
  }
  if (Number.isFinite(latest.previousValue)) {
    const previous = clampFanMoraleSpecValue(latest.previousValue);
    if (currentValue > previous) return 'RISING';
    if (currentValue < previous) return 'FALLING';
  }
  return 'STABLE';
}

export function buildFranchiseFanMoraleSpecViewModel(
  input: FranchiseFanMoraleSpecAdapterInput,
): FranchiseFanMoraleSpecViewModel {
  const snapshot = input.snapshot ?? null;
  const isTeamFanSnapshot = snapshot?.targetType === 'team-fan';
  const effectiveSnapshot = isTeamFanSnapshot ? snapshot : null;
  const history = effectiveSnapshot?.history ?? [];
  const latest = latestHistoryEntry(history);
  const currentValue = clampFanMoraleSpecValue(effectiveSnapshot?.currentValue);
  const previousValue = Number.isFinite(latest?.previousValue)
    ? clampFanMoraleSpecValue(latest?.previousValue)
    : null;
  const lastEvent = latest
    ? {
      reason: latest.reason?.trim() || 'Morale changed from confirmed event evidence.',
      sourceKind: latest.sourceKind ?? null,
      timestamp: latest.timestamp ?? effectiveSnapshot?.lastModified ?? null,
      delta: Number.isFinite(latest.delta) ? Math.round(latest.delta as number) : null,
    }
    : null;

  const limitations = [
    'Read-only fan morale spec adapter only; it does not mutate morale or create events.',
    'Expected wins baselines, performance-gap prompts, and daily high/low/average summaries are read-only or confirmation-gated team fan morale context; roster composition formula, True Value, dynamic designations, beat reporter sentiment, consequences, and full formula weighting are not trusted fan morale inputs in internal v1.',
    'Score-only fan morale changes remain team-level only after explicit random-event confirmation.',
    'Player morale and relationship state remain separate from fan morale.',
    'Hidden FARM/prospect truth is not consumed by this fan morale view model.',
  ];

  if (!snapshot) {
    limitations.push('No durable team fan morale snapshot exists yet; showing neutral baseline.');
  } else if (snapshot.targetType !== 'team-fan') {
    limitations.push('Provided snapshot is not a team fan morale snapshot; showing neutral baseline semantics.');
  }

  return {
    contractVersion: FRANCHISE_FAN_MORALE_SPEC_ADAPTER_VERSION,
    teamId: effectiveSnapshot?.teamId ?? input.fallbackTeamId ?? null,
    teamName: input.fallbackTeamName ?? null,
    currentValue,
    previousValue,
    trend: deriveTrend(currentValue, latest),
    state: getFanMoraleSpecState(currentValue),
    riskLevel: getFanMoraleRiskLevel(currentValue),
    lastEvent,
    implementationStatus: {
      canonicalStorage: status('implemented', 'Canonical scoped storage', 'Durable franchise/team morale snapshots are scoped by franchise, season, stats scope, and team.'),
      confirmedEventEffects: status('implemented', 'Confirmed event effects', 'Confirmed random-event effects can update scoped team fan morale snapshots.'),
      teamHubDisplay: status('implemented', 'Team Hub read-only display', 'Team Hub shows the spec-aligned morale state without adding mutation controls.'),
      eventBackedHistory: status('implemented', 'Event-backed history', 'Stored morale history entries provide previous/current values, reasons, source, and timestamp.'),
      randomEventConfirmation: status('partial', 'Manual random-event confirmation', 'Eligible random-event prompts can be confirmed manually; the full event catalog and formula weighting are not complete.'),
      scoreOnlyFanMorale: status('partial', 'Score-only team fan morale only', 'Score-only rows may contribute only to team fan morale after explicit confirmation; they do not create player morale, stats, or archive evidence.'),
      expectedWinsBaseline: status('partial', 'Expected wins baseline', 'Durable preview expected-wins baseline snapshots exist, but canonical True Value and full formula weighting remain incomplete.'),
      performanceGapFormula: status('partial', 'Performance gap formula', 'Actual-vs-preview-expected win gap can create confirmation-gated team fan morale prompts only; automatic weighting remains incomplete.'),
      rosterCompositionFormula: status('deferred', 'Roster composition formula', 'Roster-composition morale weighting is deferred until the formula inputs and event catalog are canonical.'),
      randomEventWeighting: status('partial', 'Random-event weighting', 'Confirmed random-event effects exist, but full weighting, cadence, and catalog rules are not complete.'),
      trueValueInputs: status('blocked', 'True Value inputs', 'True Value/value delta are not trusted fan morale inputs in Franchise internal v1.'),
      designations: status('blocked', 'Designation inputs', 'Fan Favorite, Albatross, Captain, Fan Hopeful, and related designation inputs are not final/persisted.'),
      beatReporterSentiment: status('blocked', 'Beat reporter sentiment', 'Beat reporter sentiment is not a canonical input for fan morale in internal v1.'),
      freeAgencyConsequences: status('deferred', 'Free-agency consequences', 'Fan morale does not affect free-agency destination logic in internal v1.'),
      franchiseHealthConsequences: status('deferred', 'Franchise health consequences', 'Fan morale does not drive franchise health, contraction, ownership, or offseason consequences in internal v1.'),
      dailySnapshots: status('implemented', 'Daily snapshots / high-low-average summaries', 'Durable daily morale summaries can be persisted from existing confirmed/manual morale history without adding drift, recovery, or mutation.'),
      automaticGameTrackerMutation: status('blocked', 'Automatic GameTracker morale mutation', 'GameTracker completion does not automatically mutate fan morale.'),
      playerMoraleCoupling: status('deferred', 'Player morale influence/coupling', 'Confirmed player morale effects are stored separately; fan morale does not influence player morale automatically in internal v1.'),
      relationships: status('blocked', 'Relationship coupling', 'Fan morale does not mutate relationship state in internal v1.'),
      mode3OffseasonConsequences: status('deferred', 'Mode 3/offseason consequences', 'Offseason consequences remain outside the current v1 implementation scope.'),
    },
    limitations,
    readOnly: true,
    mutatesMorale: false,
    calculatesExpectedWins: false,
    trustsTrueValueDesignationsOrBeatReporter: false,
  };
}
