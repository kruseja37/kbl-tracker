export const FRANCHISE_PLAYER_MORALE_SPEC_ADAPTER_VERSION = 'franchise-player-morale-spec-adapter-v1-readonly';

export type FranchisePlayerMoraleSpecState =
  | 'ECSTATIC'
  | 'MOTIVATED'
  | 'CONTENT'
  | 'FRUSTRATED'
  | 'DEMORALIZED';

export type FranchisePlayerMoraleTrend = 'RISING' | 'STABLE' | 'FALLING';
export type FranchisePlayerMoraleRiskLevel = 'SAFE' | 'WATCH' | 'DANGER' | 'CRITICAL';
export type FranchisePlayerMoraleSpecImplementationStatus = 'implemented' | 'partial' | 'deferred' | 'blocked';

export interface FranchisePlayerMoraleSpecHistoryEntry {
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

export interface FranchisePlayerMoraleSpecSnapshotInput {
  franchiseId?: string;
  seasonId?: string;
  statsScopeId?: string;
  seasonNumber?: number;
  targetType?: string;
  playerId?: string;
  teamId?: string;
  baselineValue?: number;
  currentValue?: number;
  lastModified?: string;
  history?: FranchisePlayerMoraleSpecHistoryEntry[];
}

export interface FranchisePlayerMoraleSpecStatusArea {
  status: FranchisePlayerMoraleSpecImplementationStatus;
  label: string;
  reason: string;
}

export interface FranchisePlayerMoraleSpecAdapterInput {
  snapshot?: FranchisePlayerMoraleSpecSnapshotInput | null;
  fallbackPlayerId?: string;
  fallbackPlayerName?: string;
}

export interface FranchisePlayerMoraleSpecViewModel {
  contractVersion: typeof FRANCHISE_PLAYER_MORALE_SPEC_ADAPTER_VERSION;
  playerId: string | null;
  playerName: string | null;
  currentValue: number;
  previousValue: number | null;
  trend: FranchisePlayerMoraleTrend;
  state: FranchisePlayerMoraleSpecState;
  riskLevel: FranchisePlayerMoraleRiskLevel;
  lastEvent: {
    reason: string;
    sourceKind: string | null;
    timestamp: string | null;
    delta: number | null;
  } | null;
  recentHistory: FranchisePlayerMoraleSpecHistoryEntry[];
  implementationStatus: {
    canonicalStorage: FranchisePlayerMoraleSpecStatusArea;
    confirmedEventEffects: FranchisePlayerMoraleSpecStatusArea;
    manualOverrides: FranchisePlayerMoraleSpecStatusArea;
    playerProfileDisplay: FranchisePlayerMoraleSpecStatusArea;
    neutralBaseline: FranchisePlayerMoraleSpecStatusArea;
    personalityBaseline: FranchisePlayerMoraleSpecStatusArea;
    roleMorale: FranchisePlayerMoraleSpecStatusArea;
    relationshipEffects: FranchisePlayerMoraleSpecStatusArea;
    salarySatisfaction: FranchisePlayerMoraleSpecStatusArea;
    fanMoraleCoupling: FranchisePlayerMoraleSpecStatusArea;
    designationInputs: FranchisePlayerMoraleSpecStatusArea;
    performanceFormula: FranchisePlayerMoraleSpecStatusArea;
    ratingChangeSuggestions: FranchisePlayerMoraleSpecStatusArea;
    offseasonConsequences: FranchisePlayerMoraleSpecStatusArea;
  };
  limitations: string[];
  readOnlyViewModel: true;
  mutatesMorale: false;
  mutatesRatings: false;
  mutatesRelationships: false;
}

export function clampPlayerMoraleSpecValue(value: number | undefined | null): number {
  if (!Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(99, Math.round(value as number)));
}

export function getPlayerMoraleSpecState(value: number): FranchisePlayerMoraleSpecState {
  const morale = clampPlayerMoraleSpecValue(value);
  if (morale >= 85) return 'ECSTATIC';
  if (morale >= 65) return 'MOTIVATED';
  if (morale >= 45) return 'CONTENT';
  if (morale >= 25) return 'FRUSTRATED';
  return 'DEMORALIZED';
}

export function getPlayerMoraleRiskLevel(value: number): FranchisePlayerMoraleRiskLevel {
  const morale = clampPlayerMoraleSpecValue(value);
  if (morale < 10) return 'CRITICAL';
  if (morale < 25) return 'DANGER';
  if (morale < 45) return 'WATCH';
  return 'SAFE';
}

function status(
  statusValue: FranchisePlayerMoraleSpecImplementationStatus,
  label: string,
  reason: string,
): FranchisePlayerMoraleSpecStatusArea {
  return { status: statusValue, label, reason };
}

function latestHistoryEntry(history: FranchisePlayerMoraleSpecHistoryEntry[]): FranchisePlayerMoraleSpecHistoryEntry | null {
  if (history.length === 0) return null;
  return [...history].sort((a, b) => {
    const aTime = a.timestamp ? Date.parse(a.timestamp) : 0;
    const bTime = b.timestamp ? Date.parse(b.timestamp) : 0;
    return bTime - aTime;
  })[0] ?? null;
}

function deriveTrend(currentValue: number, latest: FranchisePlayerMoraleSpecHistoryEntry | null): FranchisePlayerMoraleTrend {
  if (!latest) return 'STABLE';
  if (Number.isFinite(latest.delta) && latest.delta !== 0) {
    return (latest.delta as number) > 0 ? 'RISING' : 'FALLING';
  }
  if (Number.isFinite(latest.previousValue)) {
    const previous = clampPlayerMoraleSpecValue(latest.previousValue);
    if (currentValue > previous) return 'RISING';
    if (currentValue < previous) return 'FALLING';
  }
  return 'STABLE';
}

export function buildFranchisePlayerMoraleSpecViewModel(
  input: FranchisePlayerMoraleSpecAdapterInput,
): FranchisePlayerMoraleSpecViewModel {
  const snapshot = input.snapshot ?? null;
  const isPlayerSnapshot = snapshot?.targetType === 'player';
  const effectiveSnapshot = isPlayerSnapshot ? snapshot : null;
  const history = effectiveSnapshot?.history ?? [];
  const latest = latestHistoryEntry(history);
  const currentValue = clampPlayerMoraleSpecValue(effectiveSnapshot?.currentValue);
  const previousValue = Number.isFinite(latest?.previousValue)
    ? clampPlayerMoraleSpecValue(latest?.previousValue)
    : null;
  const lastEvent = latest
    ? {
      reason: latest.reason?.trim() || 'Player morale changed from confirmed/manual evidence.',
      sourceKind: latest.sourceKind ?? null,
      timestamp: latest.timestamp ?? effectiveSnapshot?.lastModified ?? null,
      delta: Number.isFinite(latest.delta) ? Math.round(latest.delta as number) : null,
    }
    : null;

  const limitations = [
    'Franchise v1 player morale uses canonical 0-99 scoped storage and starts every player at neutral 50.',
    'Personality-specific baselines from older display helpers are not canonical Franchise v1 inputs yet.',
    'Role morale, salary satisfaction, relationship effects, fan-morale coupling, designations, performance formula, rating-change suggestions, and offseason effects remain deferred or blocked.',
    'Player morale does not directly mutate ratings, clutch, relationships, profiles, salary, roster logic, or Mode 3.',
  ];

  if (!snapshot) {
    limitations.push('No durable player morale snapshot exists yet; showing neutral baseline.');
  } else if (snapshot.targetType !== 'player') {
    limitations.push('Provided snapshot is not a player morale snapshot; showing neutral baseline semantics.');
  }

  return {
    contractVersion: FRANCHISE_PLAYER_MORALE_SPEC_ADAPTER_VERSION,
    playerId: effectiveSnapshot?.playerId ?? input.fallbackPlayerId ?? null,
    playerName: input.fallbackPlayerName ?? null,
    currentValue,
    previousValue,
    trend: deriveTrend(currentValue, latest),
    state: getPlayerMoraleSpecState(currentValue),
    riskLevel: getPlayerMoraleRiskLevel(currentValue),
    lastEvent,
    recentHistory: history.slice().sort((a, b) => {
      const aTime = a.timestamp ? Date.parse(a.timestamp) : 0;
      const bTime = b.timestamp ? Date.parse(b.timestamp) : 0;
      return bTime - aTime;
    }).slice(0, 6),
    implementationStatus: {
      canonicalStorage: status('implemented', 'Canonical scoped storage', 'Durable player morale snapshots are scoped by franchise, season, stats scope, and player.'),
      confirmedEventEffects: status('implemented', 'Confirmed event effects', 'Confirmed random-event effects can update revealed/current player morale snapshots.'),
      manualOverrides: status('implemented', 'Manual overrides', 'User-confirmed manual player morale adjustments can be stored as scoped history entries.'),
      playerProfileDisplay: status('implemented', 'Player Profile display', 'Player Profile shows neutral baseline, current value, state, trend, and recent history.'),
      neutralBaseline: status('implemented', 'Neutral 50 baseline', 'Franchise v1 starts every player at 50 until confirmed/manual evidence changes morale.'),
      personalityBaseline: status('deferred', 'Personality baseline', 'Older personality-specific baselines are not canonical Franchise v1 inputs yet.'),
      roleMorale: status('deferred', 'Role morale', 'Playing-time and role expectation morale rules are deferred.'),
      relationshipEffects: status('blocked', 'Relationship effects', 'Relationship state does not mutate player morale in Franchise v1.'),
      salarySatisfaction: status('blocked', 'Salary satisfaction', 'Salary, True Value, and contract satisfaction do not mutate player morale in Franchise v1.'),
      fanMoraleCoupling: status('deferred', 'Fan morale coupling', 'Fan morale thresholds do not automatically mutate player morale yet.'),
      designationInputs: status('blocked', 'Designation inputs', 'Designation status is not final/persisted as a player morale input in Franchise v1.'),
      performanceFormula: status('deferred', 'Performance formula', 'Performance-driven player morale formulas are deferred until player event rules are approved.'),
      ratingChangeSuggestions: status('deferred', 'Rating change suggestions', 'Sustained-threshold rating suggestions are future manual prompts only.'),
      offseasonConsequences: status('deferred', 'Mode 3/offseason consequences', 'Offseason player morale consequences remain outside this v1 slice.'),
    },
    limitations,
    readOnlyViewModel: true,
    mutatesMorale: false,
    mutatesRatings: false,
    mutatesRelationships: false,
  };
}
