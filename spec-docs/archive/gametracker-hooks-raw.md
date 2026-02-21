# GameTracker Hooks & Page - Raw Spec Extraction

> Generated: 2026-02-08
> Source branch: claude/jolly-hertz

---

## Table of Contents

1. [useFameTracking.ts](#1-usefametrackingts)
2. [useFanMorale.ts](#2-usefanmoralets)
3. [useMWARCalculations.ts](#3-usemwarcalculationsts)
4. [useWARCalculations.ts](#4-usewarcalculationsts)
5. [usePlayerState.ts](#5-useplayerstatets)
6. [UndoSystem.tsx (useUndoSystem)](#6-undosystemtsx)
7. [GameTracker.tsx](#7-gametrackertsx)

---

## 1. useFameTracking.ts

**File:** `/Users/johnkruse/.claude-worktrees/kbl-tracker/jolly-hertz/src/src_figma/app/hooks/useFameTracking.ts`
**Lines:** 324

### Purpose

React hook wrapping the Fame integration module. Tracks per-player fame events during a game, auto-detects milestone batter/pitcher events (multi-hit, multi-HR, golden sombrero, meltdown, etc.), prevents duplicate milestone recording via a `recordedMilestones` Map, shows fame event popups, and provides query functions for player fame totals and game summaries.

### Exported Functions/Types

```typescript
// HOOK
export function useFameTracking(options: UseFameTrackingOptions): {
  // State
  tracker: GameFameTracker;
  lastEvent: FameEventDisplay | null;
  showEventPopup: boolean;

  // Event recording
  recordFameEvent: (eventType: FameEventType, playerId: string, playerName: string, inning: number, halfInning: 'TOP' | 'BOTTOM', leverageIndex?: number) => void;
  dismissEventPopup: () => void;

  // Player queries
  getPlayerFame: (playerId: string) => number;
  getPlayerEvents: (playerId: string) => FameEventDisplay[];

  // Game summary
  getGameSummary: () => ReturnType<typeof getGameFameSummary>;

  // Auto-detection
  checkBatterFameEvents: (playerId: string, playerName: string, gameStats: { hits: number; homeRuns: number; strikeouts: number; rbi: number }, inning: number, halfInning: 'TOP' | 'BOTTOM', leverageIndex?: number) => FameEventType[];
  checkPitcherFameEvents: (pitcherId: string, pitcherName: string, gameStats: { strikeouts: number; runsAllowed: number; hitsAllowed: number; inningsPitched: number }, inning: number, halfInning: 'TOP' | 'BOTTOM', leverageIndex?: number) => FameEventType[];

  // Management
  resetTracker: (newGameId?: string) => void;

  // Utility re-exports
  formatFameValue: typeof formatFameValue;
  getFameColor: typeof getFameColor;
  getTierColor: typeof getTierColor;
  getLITier: typeof getLITier;
  describeLIEffect: typeof describeLIEffect;
  getFameTier: typeof getFameTier;
};

// TYPES
export interface UseFameTrackingOptions {
  gameId: string;
  isPlayoffs?: boolean;
  playoffRound?: 'wild_card' | 'division_series' | 'championship_series' | 'world_series';
  isEliminationGame?: boolean;
  isClinchGame?: boolean;
}

export interface FameTrackingState {
  tracker: GameFameTracker;
  lastEvent: FameEventDisplay | null;
  showEventPopup: boolean;
  recordedMilestones: Map<string, Set<FameEventType>>;
}

// RE-EXPORTED TYPES
export type { FameEventDisplay, PlayerFameSummary, GameFameTracker };
export { formatFameEvent, formatFameValue, getFameColor, getTierColor, getFameTier, getLITier, describeLIEffect };
```

### Key Logic

**Duplicate prevention in checkBatterFameEvents:**
```typescript
// Filter out events that have already been recorded for this player
const playerMilestones = state.recordedMilestones.get(playerId) || new Set();
const newEvents = detectedEvents.filter(event => !playerMilestones.has(event));

// Record only NEW events and update the milestones tracker
if (newEvents.length > 0) {
  setState(prev => {
    const newMilestones = new Map(prev.recordedMilestones);
    const playerSet = new Set(newMilestones.get(playerId) || []);
    for (const event of newEvents) {
      playerSet.add(event);
    }
    newMilestones.set(playerId, playerSet);
    return { ...prev, recordedMilestones: newMilestones };
  });

  for (const event of newEvents) {
    recordFameEvent(event, playerId, playerName, inning, halfInning, leverageIndex);
  }
}
```

**Batter detection pipeline:**
```typescript
const hitEvent = detectMultiHitFameEvent(gameStats.hits);
const hrEvent = detectMultiHRFameEvent(gameStats.homeRuns);
const kEvent = detectStrikeoutFameEvent(gameStats.strikeouts);
const rbiEvent = detectRBIFameEvent(gameStats.rbi);
```

**Pitcher detection pipeline:**
```typescript
const kEvent = detectPitcherKFameEvent(gameStats.strikeouts);
const meltdownEvent = detectMeltdownFameEvent(gameStats.runsAllowed);
```

### State Management

| State | Type | Triggers |
|-------|------|----------|
| `tracker` | `GameFameTracker` | `recordFameEvent()` adds events |
| `lastEvent` | `FameEventDisplay \| null` | Set on each `recordFameEvent()` |
| `showEventPopup` | `boolean` | Set `true` on record, `false` on dismiss |
| `recordedMilestones` | `Map<string, Set<FameEventType>>` | Grows as milestone events detected per player |

### Side Effects

None (no useEffect). State-only hook.

### Dependencies

- `../engines/fameIntegration` (createGameFameTracker, addFameEvent, getPlayerGameFame, getPlayerGameEvents, getGameFameSummary, formatFameEvent, formatFameValue, getFameColor, getTierColor, getFameTier, getLITier, describeLIEffect, detectStrikeoutFameEvent, detectMultiHRFameEvent, detectMultiHitFameEvent, detectRBIFameEvent, detectPitcherKFameEvent, detectMeltdownFameEvent)
- `../../../types/game` (FameEventType)
- React: useState, useCallback, useMemo

---

## 2. useFanMorale.ts

**File:** `/Users/johnkruse/.claude-worktrees/kbl-tracker/jolly-hertz/src/src_figma/app/hooks/useFanMorale.ts`
**Lines:** 195

### Purpose

React hook for tracking fan morale, contraction risk, and trade scrutiny per team. NOTE: The file header documents that this hook was originally written with incorrect API assumptions. It has been PARTIALLY STUBBED and rewritten to use the correct legacy `fanMoraleEngine` API. It is instantiated per-team in GameTracker but only called for non-exhibition game modes.

### Exported Functions/Types

```typescript
// HOOK
export function useFanMorale(
  initialTeamId?: string,
  marketSize: 'SMALL' | 'MEDIUM' | 'LARGE' = 'MEDIUM'
): UseFanMoraleReturn;

export interface UseFanMoraleReturn {
  morale: FanMorale | null;
  fanState: FanState | null;
  riskLevel: RiskLevel | null;
  trend: MoraleTrend;
  display: {
    value: string;
    state: { label: string; color: string; icon: string; description: string };
    risk: { label: string; color: string; description: string };
    trend: { label: string; color: string; arrow: string };
    barColor: string;
  } | null;
  tradeScrutiny: { level: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME'; multiplier: number; description: string } | null;
  faAttractiveness: { rating: number; tier: string; description: string } | null;
  recentEvents: MoraleEvent[];
  initialize: (initialMorale?: number, gameDate?: GameDate) => void;
  processGameResult: (gameResult: GameResult, gameDate: GameDate, vsRivalName?: string) => void;
  refresh: () => void;
}

// RE-EXPORTED TYPES
export type { FanState, MoraleTrend, RiskLevel, FanMorale, MoraleEvent, GameResult };
```

### Key Logic

**processGameResult:**
```typescript
const processGameResult = useCallback((
  gameResult: GameResult,
  gameDate: GameDate,
  vsRivalName?: string
) => {
  if (!morale) {
    const newMorale = initializeFanMorale(50, gameDate);
    setMorale(newMorale);
    const event = createGameMoraleEvent(gameResult, gameDate, vsRivalName);
    const { updatedMorale } = processMoraleEvent(newMorale, event);
    setMorale(updatedMorale);
    return;
  }

  const event = createGameMoraleEvent(gameResult, gameDate, vsRivalName);
  const { updatedMorale } = processMoraleEvent(morale, event);
  setMorale(updatedMorale);
}, [morale]);
```

**Derived state chain:**
```typescript
const fanState = useMemo(() => morale ? getFanState(morale.current) : null, [morale]);
const riskLevel = useMemo(() => morale ? getRiskLevel(morale.current) : null, [morale]);
const trend = useMemo(() => morale ? morale.trend : 'STABLE', [morale]);
```

### State Management

| State | Type | Triggers |
|-------|------|----------|
| `morale` | `FanMorale \| null` | `initialize()`, `processGameResult()`, `refresh()` |
| `recentEvents` | `MoraleEvent[]` | Never mutated (always empty `[]`) |

Derived (useMemo):
- `fanState` from `morale.current`
- `riskLevel` from `morale.current`
- `trend` from `morale.trend`
- `display` from `morale + fanState + riskLevel + trend`
- `tradeScrutiny` from `morale.current`
- `faAttractiveness` from `morale.current + marketSize`

### Side Effects

None (no useEffect). State-only hook.

### Dependencies

- `../engines/fanMoraleIntegration` (initializeFanMorale, getFanState, getRiskLevel, createGameMoraleEvent, processMoraleEvent, getFanStateDisplay, getRiskLevelDisplay, getTrendDisplay, formatMorale, getMoraleBarColor, getTradeScrutinyLevel, getFAAttractiveness)
- React: useState, useCallback, useMemo, useRef

---

## 3. useMWARCalculations.ts

**File:** `/Users/johnkruse/.claude-worktrees/kbl-tracker/jolly-hertz/src/src_figma/app/hooks/useMWARCalculations.ts`
**Lines:** 234

### Purpose

React hook for tracking manager decisions and calculating Manager WAR (mWAR). Records decisions (pitching changes, pinch hitters, IBBs, defensive subs), resolves their outcomes, checks for Manager Moment prompts at high-leverage situations, and provides display helpers for mWAR values and leverage tiers.

### Exported Functions/Types

```typescript
// HOOK
export function useMWARCalculations(
  initialSeasonId?: string,
  initialManagerId?: string,
  initialTeamId?: string
): UseMWARCalculationsReturn;

export interface UseMWARCalculationsReturn {
  gameStats: GameManagerStats | null;
  seasonStats: ManagerSeasonStats | null;
  managerMoment: ManagerMomentState;
  initializeGame: (gameId: string, managerId: string) => void;
  initializeSeason: (seasonId: string, managerId: string, teamId: string) => void;
  recordDecision: (decisionType: DecisionType, gameState: GameStateForLI, involvedPlayers: string[], notes?: string) => string;
  resolveDecisionOutcome: (decisionId: string, outcome: DecisionOutcome) => void;
  checkForManagerMoment: (gameState: GameStateForLI) => void;
  dismissManagerMoment: () => void;
  getCurrentLI: (gameState: GameStateForLI) => number;
  formatCurrentMWAR: () => string;
  getMWARStatus: () => { rating: string; color: string };
  getLIDisplay: (li: number) => { tier: string; color: string };
}
```

### Key Logic

**recordDecision flow:**
```typescript
const recordDecision = useCallback((
  decisionType: DecisionType,
  gameState: GameStateForLI,
  involvedPlayers: string[],
  notes?: string
): string => {
  if (!gameStats) { return ''; }

  const decision = createManagerDecision(
    gameStats.gameId,
    gameStats.managerId,
    decisionType,
    gameState,       // Function calculates LI internally
    'auto',          // inferenceMethod
    involvedPlayers,
    notes
  );

  setPendingDecisions(prev => {
    const newMap = new Map(prev);
    newMap.set(decision.decisionId, decision);
    return newMap;
  });

  setGameStats(prev => prev ? recordManagerDecision(prev, decision) : null);
  return decision.decisionId;
}, [gameStats]);
```

**resolveDecisionOutcome flow:**
```typescript
const resolvedDecision = resolveDecision(decision, outcome);
setPendingDecisions(prev => { /* remove from map */ });
if (seasonStats) {
  setSeasonStats(prev => {
    if (!prev) return null;
    addDecisionToSeasonStats(prev, resolvedDecision); // mutates in place
    return { ...prev }; // new reference for re-render
  });
}
```

### State Management

| State | Type | Triggers |
|-------|------|----------|
| `gameStats` | `GameManagerStats \| null` | `initializeGame()`, `recordDecision()` |
| `seasonStats` | `ManagerSeasonStats \| null` | `initializeSeason()`, `resolveDecisionOutcome()` |
| `managerMoment` | `ManagerMomentState` | `checkForManagerMoment()`, `dismissManagerMoment()` |
| `pendingDecisions` | `Map<string, ManagerDecision>` | `recordDecision()` adds, `resolveDecisionOutcome()` removes |

### Side Effects

None (no useEffect). State-only hook.

### Dependencies

- `../engines/mwarIntegration` (DecisionType, DecisionOutcome, ManagerDecision, ManagerSeasonStats, GameManagerStats, ManagerMomentState, HIGH_LEVERAGE_THRESHOLD, createManagerDecision, resolveDecision, checkManagerMoment, createGameMWARState, recordManagerDecision, getMWARDisplayInfo, getLITierDescription, getLIColor, shouldShowManagerMoment, createManagerSeasonStats, addDecisionToSeasonStats, formatMWAR, getMWARRating)
- `../../../engines/leverageCalculator` (getLeverageIndex, GameStateForLI)
- React: useState, useCallback, useMemo

---

## 4. useWARCalculations.ts

**File:** `/Users/johnkruse/.claude-worktrees/kbl-tracker/jolly-hertz/src/src_figma/app/hooks/useWARCalculations.ts`
**Lines:** 411

### Purpose

React hook wrapping the base WAR calculators (bWAR, pWAR, rWAR) with simplified input interfaces. Converts simplified stat objects into the full format expected by calculators. Also provides quick wOBA/FIP calculations and quality-tier labeling scaled for SMB4's shorter seasons.

### Exported Functions/Types

```typescript
// HOOK
export function useWARCalculations(
  seasonId: string = 'default',
  seasonGames: number = 50
): {
  state: WARCalculationState;
  calculateBatterWAR: (stats: SimpleBattingStats) => WARResult;
  calculatePitcherWAR: (stats: SimplePitchingStats) => WARResult;
  calculateBaserunningWAR: (stats: SimpleBaserunningStats) => WARResult;
  quickWOBA: (stats: SimpleBattingStats) => number;
  quickFIP: (stats: SimplePitchingStats) => number;
  getWOBALabel: (woba: number) => string;
  getFIPLabel: (fip: number) => string;
  leagueContext: ReturnType<typeof createDefaultLeagueContext>;
  baselines: typeof SMB4_BASELINES;
};

// INPUT TYPES
export interface SimpleBattingStats {
  ab: number; hits: number; singles: number; doubles: number; triples: number;
  homeRuns: number; walks: number; intentionalWalks: number; hitByPitch: number;
  strikeouts: number; sacFlies: number; sacBunts: number; groundedIntoDP: number;
  playerId?: string; playerName?: string;
}

export interface SimplePitchingStats {
  innings: number; earnedRuns: number; runs: number; hits: number; walks: number;
  strikeouts: number; homeRuns: number; hitByPitch: number; isStarter: boolean;
  playerId?: string; playerName?: string;
}

export interface SimpleBaserunningStats {
  stolenBases: number; caughtStealing: number; extraBasesTaken: number;
  extraBasesOpportunities: number; outsOnBases: number; timesOnBase: number;
}

// OUTPUT TYPES
export interface WARResult {
  war: number;
  components: Record<string, number>;
  quality: string;
}

export interface WARCalculationState {
  isCalculating: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

// STANDALONE EXPORTS
export function formatWAR(war: number, decimals?: number): string;
export function getWARQuality(war: number, seasonGames?: number): { label: string; color: string; tier: string };
export function formatIP(outs: number): string;
export function parseIP(ip: string): number;
```

### Key Logic

**Conversion helpers (SimpleBattingStats to full):**
```typescript
function convertBattingStats(stats: SimpleBattingStats) {
  return {
    pa: stats.ab + stats.walks + stats.hitByPitch + stats.sacFlies + stats.sacBunts,
    ab: stats.ab,
    hits: stats.hits,
    singles: stats.singles,
    doubles: stats.doubles,
    triples: stats.triples,
    homeRuns: stats.homeRuns,
    walks: stats.walks,
    intentionalWalks: stats.intentionalWalks,
    hitByPitch: stats.hitByPitch,
    strikeouts: stats.strikeouts,
    sacFlies: stats.sacFlies,
    sacBunts: stats.sacBunts,
    gidp: stats.groundedIntoDP,
    stolenBases: 0, // TODO
    caughtStealing: 0, // TODO
  };
}
```

**WAR quality tiers (scaled for SMB4 50-game seasons):**
```typescript
export function getWARQuality(war: number, seasonGames: number = 50) {
  const scale = seasonGames / 162;
  const elite = 6.0 * scale;     // ~1.85 for 50 games
  const allStar = 4.0 * scale;   // ~1.23 for 50 games
  const starter = 2.0 * scale;   // ~0.62 for 50 games
  const average = 0.5 * scale;   // ~0.15 for 50 games
  // ...tier assignment...
}
```

**FIP quality labels:**
```typescript
function getFIPQualityLabel(fip: number): string {
  if (fip <= 2.90) return 'Excellent';
  if (fip <= 3.50) return 'Great';
  if (fip <= 4.00) return 'Above Average';
  if (fip <= 4.40) return 'Average';
  if (fip <= 5.00) return 'Below Average';
  if (fip <= 5.50) return 'Poor';
  return 'Awful';
}
```

### State Management

| State | Type | Triggers |
|-------|------|----------|
| `state` | `WARCalculationState` | Never mutated (initial `{isCalculating: false, lastUpdated: null, error: null}`) |

Derived (useMemo):
- `leagueContext` from `createDefaultLeagueContext(seasonId, seasonGames)`

### Side Effects

None (no useEffect). Pure calculation hook.

### Dependencies

- `../../../engines/bwarCalculator` (calculateBWAR, calculateWOBA, getWOBAQuality)
- `../../../engines/pwarCalculator` (calculatePWAR, calculateFIP)
- `../../../engines/rwarCalculator` (calculateRWARSimplified)
- `../../../types/war` (createDefaultLeagueContext, SMB4_BASELINES)
- React: useState, useCallback, useMemo

---

## 5. usePlayerState.ts

**File:** `/Users/johnkruse/.claude-worktrees/kbl-tracker/jolly-hertz/src/src_figma/app/hooks/usePlayerState.ts`
**Lines:** 565

### Purpose

Unified player state management hook for Mojo, Fitness, and Clutch systems. Manages a Map of all registered players, tracks their current Mojo level (-2 to +2), Fitness state (JUICED/FIT/WELL/STRAINED/WEAK/HURT), injury risk, and combined stat multipliers. Provides both trigger-based and direct-set APIs for state changes, generates notifications on state transitions, and supports game-to-game mojo carryover.

### Exported Functions/Types

```typescript
// HOOK
export function usePlayerState(options: UsePlayerStateOptions): {
  // State
  players: Map<string, PlayerStateData>;
  notifications: StateChangeNotification[];

  // Player management
  registerPlayer: (playerId: string, playerName: string, position: PlayerPosition, startingMojo?: MojoLevel, startingFitness?: FitnessState, traits?: string[], age?: number) => void;
  getPlayer: (playerId: string) => PlayerStateData | undefined;
  getAllPlayers: () => PlayerStateData[];

  // State updates
  updateMojo: (playerId: string, trigger: MojoTrigger, situation?: GameSituation) => void;
  updateFitness: (playerId: string, activity: GameActivity, gameDate: string) => void;
  setMojo: (playerId: string, newMojo: MojoLevel) => void;        // EXH-036: Direct setter
  setFitness: (playerId: string, newFitness: FitnessState) => void; // EXH-036: Direct setter
  applyRestRecovery: (playerId: string, date: string) => void;

  // Stats
  getAdjustedBattingStats: (playerId: string, baseStats: BattingStats) => BattingStats | null;
  getAdjustedPitchingStats: (playerId: string, baseStats: PitchingStats) => PitchingStats | null;

  // Notifications
  dismissNotification: (index: number) => void;
  clearNotifications: () => void;

  // Game management
  calculateCarryover: () => Map<string, MojoLevel>;
  resetForNewGame: (newGameId: string, mojoCarryover?: Map<string, MojoLevel>) => void;

  // Utility re-exports
  getStateBadge: typeof getStateBadge;
  getMultiplierIndicator: typeof getMultiplierIndicator;
  formatMultiplier: typeof formatMultiplier;
};

// TYPES
export interface PlayerStateData {
  playerId: string;
  playerName: string;
  position: PlayerPosition;
  gameState: GamePlayerState;
  fitnessProfile: PlayerFitnessProfile;
  combinedState: CombinedPlayerState;
  injuryRisk: InjuryRisk;
}

export interface UsePlayerStateOptions {
  gameId: string;
  isPlayoffs?: boolean;
}

// RE-EXPORTED TYPES
export type { CombinedPlayerState, BattingStats, PitchingStats, StateChangeNotification, GamePlayerState };
export { getStateBadge, getMultiplierIndicator, formatMultiplier };
```

### Key Logic

**registerPlayer:**
```typescript
const fitnessProfile = createFitnessProfile(playerId, position, traits, age, startingFitness);
const gameState = createGamePlayerState(playerId, startingMojo, startingFitness);
const combinedState = createCombinedPlayerState(playerId, playerName, startingMojo, fitnessProfile);
const injuryRisk = calculateInjuryRisk(fitnessProfile);
newMap.set(playerId, { playerId, playerName, position, gameState, fitnessProfile, combinedState, injuryRisk });
```

**updateMojo (trigger-based):**
```typescript
const { newMojo, actualDelta } = applyMojoChange(player.gameState.currentMojo, trigger, situation);
if (actualDelta === 0) return prev;
const changes = detectStateChanges(playerId, player.playerName, oldMojo, newMojo, oldFitness, oldFitness);
if (changes.length > 0) setNotifications(n => [...n, ...changes]);
const newGameState = updateGamePlayerState(player.gameState, { newMojo });
const newCombinedState = createCombinedPlayerState(playerId, player.playerName, newMojo, player.fitnessProfile);
```

**setMojo (EXH-036 direct setter):**
```typescript
const setMojo = useCallback((playerId: string, newMojo: MojoLevel) => {
  setPlayers(prev => {
    const player = prev.get(playerId);
    if (!player) return prev;
    const changes = detectStateChanges(playerId, player.playerName, previousMojo, newMojo, fitness, fitness);
    // ... update gameState, combinedState ...
  });
}, []);
```

**calculateCarryover (game-to-game mojo persistence):**
```typescript
const calculateCarryover = useCallback((): Map<string, MojoLevel> => {
  const carryover = new Map<string, MojoLevel>();
  players.forEach((player, playerId) => {
    const startingMojo = calculateStartingMojo(player.gameState.currentMojo);
    carryover.set(playerId, startingMojo);
  });
  return carryover;
}, [players]);
```

### State Management

| State | Type | Triggers |
|-------|------|----------|
| `players` | `Map<string, PlayerStateData>` | `registerPlayer()`, `updateMojo()`, `updateFitness()`, `setMojo()`, `setFitness()`, `applyRestRecovery()`, `resetForNewGame()` |
| `notifications` | `StateChangeNotification[]` | State changes in any player, `dismissNotification()`, `clearNotifications()` |

### Side Effects

None (no useEffect). State-only hook.

### Dependencies

- `../engines/playerStateIntegration` (createCombinedPlayerState, adjustBattingStats, adjustPitchingStats, getStateBadge, getMultiplierIndicator, formatMultiplier, detectStateChanges, createGamePlayerState, updateGamePlayerState, clampMojo, getMojoDelta, applyMojoChange, calculateStartingMojo, getMojoStatMultiplier, createFitnessProfile, applyFitnessDecay, applyRecovery, calculateInjuryRisk, getFitnessStatMultiplier)
- `../../../engines/mojoEngine` (MojoLevel, MojoTrigger, GameSituation)
- `../../../engines/fitnessEngine` (FitnessState, GameActivity, PlayerPosition)
- React: useState, useCallback, useMemo

---

## 6. UndoSystem.tsx

**File:** `/Users/johnkruse/.claude-worktrees/kbl-tracker/jolly-hertz/src/src_figma/app/components/UndoSystem.tsx`
**Lines:** 348

### Purpose

Provides three undo implementations: (1) `useUndoSystem` hook (used by GameTracker), (2) `UndoSystem` standalone component, (3) `UndoProvider`/`useUndo` context-based system. All use a stack of deep-cloned game state snapshots with configurable max depth (default 5). GameTracker uses the hook variant.

### Exported Functions/Types

```typescript
// PRIMARY HOOK (used by GameTracker)
export function useUndoSystem(
  maxSteps?: number,
  onUndo: (snapshot: GameSnapshot) => void
): UndoSystemHandle & {
  UndoButtonComponent: React.FC;
  ToastComponent: React.FC;
  setCurrentState: (state: unknown) => void;
};

// TYPES
export interface GameSnapshot {
  timestamp: number;
  playDescription: string;
  gameState: unknown;
}

export interface UndoSystemHandle {
  captureSnapshot: (description: string) => void;
  canUndo: boolean;
  undoCount: number;
  clearHistory: () => void;
}

// STANDALONE COMPONENT
export function UndoSystem(props: UndoSystemProps): JSX.Element;

// CONTEXT SYSTEM
export function UndoProvider(props: UndoProviderProps): JSX.Element;
export function useUndo(): UndoContextValue;

// UI COMPONENTS
export function UndoButton(props: UndoButtonProps): JSX.Element;
```

### Key Logic

**captureSnapshot (deep clones current state):**
```typescript
const captureSnapshot = useCallback((description: string) => {
  if (currentStateRef.current === null) return;

  const snapshot: GameSnapshot = {
    timestamp: Date.now(),
    playDescription: description,
    gameState: JSON.parse(JSON.stringify(currentStateRef.current)), // Deep clone
  };

  setStack(prev => {
    const newStack = [...prev, snapshot];
    if (newStack.length > maxSteps) {
      return newStack.slice(-maxSteps);
    }
    return newStack;
  });
}, [maxSteps]);
```

**performUndo (pops last snapshot, fires callback):**
```typescript
const performUndo = useCallback(() => {
  if (stack.length === 0) return;
  const snapshot = stack[stack.length - 1];
  setStack(prev => prev.slice(0, -1));
  setToastMessage(`Undone: ${snapshot.playDescription}`);
  onUndo(snapshot);
}, [stack, onUndo]);
```

### State Management

| State | Type | Triggers |
|-------|------|----------|
| `stack` | `GameSnapshot[]` | `captureSnapshot()` pushes, `performUndo()` pops |
| `toastMessage` | `string \| null` | Set on undo, cleared after 3s timeout |
| `currentStateRef` | `React.MutableRefObject<unknown>` | `setCurrentState()` updates ref |

### Side Effects

**UndoToast auto-dismiss:**
```typescript
useEffect(() => {
  const timer = setTimeout(onDismiss, 3000);
  return () => clearTimeout(timer);
}, [onDismiss]);
```

**UndoSystem standalone - global exposure (temporary):**
```typescript
useEffect(() => {
  window.__undoCapture = captureSnapshot;
  return () => { delete window.__undoCapture; };
}, [captureSnapshot]);
```

### Dependencies

- `lucide-react` (Undo2 icon)
- React: useState, useCallback, useEffect, useRef, createContext, useContext

---

## 7. GameTracker.tsx

**File:** `/Users/johnkruse/.claude-worktrees/kbl-tracker/jolly-hertz/src/src_figma/app/pages/GameTracker.tsx`
**Lines:** 3,798

### Purpose

The main game-tracking page component. Renders the full baseball field (enhanced SVG with drag-drop or legacy SVG), scoreboard (Fenway-style inline box score with inning-by-inning), batter/pitcher info cards, team rosters with mojo/fitness editing, beat reporter feed, lineup management, and outcome recording panels. Orchestrates all sub-hooks (useGameState, usePlayerState, useFameTracking, useFanMorale, useMWARCalculations, useUndoSystem) and connects them to the UI. Handles play recording, substitutions, undo, detection prompts, error attribution modals, and end-of-game processing with narrative generation and persistence.

### Exported Functions/Types

```typescript
export function GameTracker(): JSX.Element;
```

Internally defines (not exported):
- `PitchCountModal` - modal for pitch count confirmation on pitching changes
- `PlayerCardModal` - player detail card with mojo/fitness editing (EXH-036)
- `PlayerBox` - SVG field position marker
- `SNESButton` - retro-styled game button
- `ExpandablePanel` - collapsible section wrapper
- `OutcomeButton` - outcome selection button
- `OutcomeDetailPanel` - detail sub-panel
- `DetailButton` - detail option button

### Hook Instantiation

```typescript
// Core game state (IndexedDB persistence)
const { gameState, scoreboard, playerStats, pitcherStats, recordHit, recordOut, recordWalk,
  recordD3K, recordError, recordEvent, advanceRunner, advanceRunnersBatch, makeSubstitution,
  switchPositions, changePitcher, advanceCount, resetCount, endInning, endGame: hookEndGame,
  pitchCountPrompt, confirmPitchCount, dismissPitchCountPrompt, initializeGame,
  loadExistingGame, restoreState, getRunnerTrackerSnapshot, isLoading, isSaving
} = useGameState(gameId);

// Player state (Mojo/Fitness/Clutch)
const playerStateHook = usePlayerState({ gameId: gameId || 'demo-game', isPlayoffs: false });

// Fame tracking
const fameTrackingHook = useFameTracking({ gameId: gameId || 'demo-game', isPlayoffs: false });

// Fan morale (per team)
const homeFanMorale = useFanMorale(homeTeamId);
const awayFanMorale = useFanMorale(awayTeamId);

// mWAR
const mwarHook = useMWARCalculations();

// Undo system (5-step stack)
const undoSystem = useUndoSystem(5, handleUndo);
```

### State Summary (useState)

| State | Type | Purpose |
|-------|------|---------|
| `gameStartTime` | `Date` | Elapsed time tracking (set once at mount) |
| `elapsedMinutes` | `number` | Minutes since game start |
| `pendingMWARDecisions` | `Map<string, {...}>` | Track unresolved mWAR decisions for outcome resolution |
| `pendingOutcome` | `{type, subType, direction?, rbi?} \| null` | Two-step outcome recording (select then confirm) |
| `selectedPlayer` | `{name, type, playerId} \| null` | PlayerCardModal target |
| `showEndGameConfirmation` | `boolean` | End-game confirmation dialog |
| `fielderCreditModalOpen` | `boolean` | EXH-016 fielder credit modal |
| `pendingPlayForFielderCredit` | `PlayData \| null` | Play data awaiting fielder credit |
| `runnersOutForCredit` | `RunnerOutInfo[]` | Runners needing credit assignment |
| `errorOnAdvanceModalOpen` | `boolean` | EXH-025 error attribution modal |
| `pendingPlayForErrorOnAdvance` | `PlayData \| null` | Play data for error attribution |
| `runnersWithExtraAdvance` | `RunnerAdvanceInfo[]` | Runners with extra-base advances |
| `runnerNames` | `{first?, second?, third?}` | WHO is on each base (display names) |
| `pendingDetections` | `UIDetectionResult[]` | MAJ-03 detection prompts awaiting user |
| `useEnhancedField` | `boolean` | Toggle enhanced vs legacy field (default `true`) |
| `isScoreboardMinimized` | `boolean` | Mini scoreboard toggle |
| `gameInitialized` | `boolean` | Prevents double initialization |
| `awayTeamPlayers` | `Player[]` | Mutable away roster |
| `homeTeamPlayers` | `Player[]` | Mutable home roster |
| `expandedSections` | `{hits, outs, walks, events, substitutions}` | Legacy panel toggles |
| `expandedOutcome` | `string \| null` | Legacy outcome detail panel |

### Side Effects (useEffect)

**1. Elapsed time counter:**
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    const diff = Math.floor((now.getTime() - gameStartTime.getTime()) / 60000);
    setElapsedMinutes(diff);
  }, 60000);
  return () => clearInterval(interval);
}, [gameStartTime]);
```
Deps: `[gameStartTime]`

**2. mWAR initialization at game start:**
```typescript
useEffect(() => {
  if (gameId) {
    mwarHook.initializeGame(gameId, homeManagerId);
    mwarHook.initializeSeason('season-1', homeManagerId, homeTeamId);
  }
}, [gameId]); // eslint-disable-next-line
```
Deps: `[gameId]` (deps lint suppressed)

**3. Game initialization (load existing or create new):**
```typescript
useEffect(() => {
  if (gameInitialized) return;
  const initializeOrLoadGame = async () => {
    const hasExistingGame = await loadExistingGame();
    if (hasExistingGame) { setGameInitialized(true); return; }
    // ... build lineups from awayTeamPlayers/homeTeamPlayers ...
    await initializeGame({ /* ... */ });
    setGameInitialized(true);
  };
  initializeOrLoadGame();
}, [gameInitialized, awayTeamPlayers, homeTeamPlayers, awayPitcher, homePitcher, awayTeamId, homeTeamId, gameId, initializeGame, loadExistingGame]);
```

**4. Register players with playerStateHook (EXH-036):**
```typescript
useEffect(() => {
  if (!gameInitialized) return;
  awayTeamPlayers.forEach((player) => { /* registerPlayer(...) */ });
  homeTeamPlayers.forEach((player) => { /* registerPlayer(...) */ });
  // ... also register pitchers ...
}, [gameInitialized, awayTeamPlayers, homeTeamPlayers, awayPitcher, homePitcher, playerStateHook]);
```

**5. Undo system state sync:**
```typescript
useEffect(() => {
  undoSystem.setCurrentState({
    gameState,
    scoreboard,
    playerStatsEntries: Array.from(playerStats.entries()),
    pitcherStatsEntries: Array.from(pitcherStats.entries()),
    runnerTrackerSnapshot: getRunnerTrackerSnapshot(),
  });
}, [gameState, scoreboard, playerStats, pitcherStats, getRunnerTrackerSnapshot]);
```

### Key Handlers

**handleEnhancedPlayComplete (the main play handler, ~550 lines):**

Steps:
1. Check for thrown-out runners -> show FielderCreditModal if any (returns early)
2. Check for extra-base advances -> queue ErrorOnAdvanceModal
3. Calculate RBI from actual runner outcomes
4. Capture undo snapshot
5. Convert runner outcomes to RunnerAdvancement format
6. Record play type (HR/hit/out/D3K/foul_out/foul_ball/walk/error) via useGameState
7. Update runner names display tracking
8. Check batter fame events via fameTrackingHook
9. Check pitcher fame events via fameTrackingHook
10. (DISABLED) Auto-update mojo based on outcomes
11. Run MAJ-03 detection system (runPlayDetections) -> auto-record or queue prompts
12. Handle mWAR: IBB detection, resolve pending decisions, check Manager Moment
13. Show error attribution modal if extra advances detected

**handleEndGame (end-of-game processing, ~150 lines):**

Steps:
1. MAJ-09: Detect end-of-game achievements (No-Hitter, Perfect Game, Maddux, CG, Shutout)
2. MAJ-02: Update fan morale for both teams (skip if exhibition)
3. MAJ-04: Generate dual-perspective narrative recaps
4. mWAR: Persist decisions and aggregate to season
5. Call hookEndGame()
6. Navigate to post-game summary

**handleUndo (state restoration from snapshot):**
```typescript
const handleUndo = useCallback((snapshot: GameSnapshot) => {
  const storedState = snapshot.gameState as any;
  if (storedState && storedState.gameState && storedState.scoreboard) {
    const runnerTrackerState = storedState.runnerTrackerSnapshot ? {
      runners: storedState.runnerTrackerSnapshot.runners,
      currentPitcherId: storedState.runnerTrackerSnapshot.currentPitcherId,
      currentPitcherName: storedState.runnerTrackerSnapshot.currentPitcherName,
      pitcherStats: new Map(storedState.runnerTrackerSnapshot.pitcherStatsEntries),
      inning: storedState.runnerTrackerSnapshot.inning,
      atBatNumber: storedState.runnerTrackerSnapshot.atBatNumber,
    } : undefined;

    restoreState({
      gameState: storedState.gameState,
      scoreboard: storedState.scoreboard,
      playerStats: storedState.playerStatsEntries ? new Map(storedState.playerStatsEntries) : undefined,
      pitcherStats: storedState.pitcherStatsEntries ? new Map(storedState.pitcherStatsEntries) : undefined,
      runnerTrackerState,
    });
  }
}, [restoreState]);
```

**handleLineupCardSubstitution:**
- Handles `pitching_change`, `position_swap`, `player_sub`, `double_switch`
- Records mWAR decisions for pitching changes and pinch hitters
- Updates local roster arrays for UI display

### Navigation State (received from ExhibitionGame or FranchiseGame)

```typescript
interface NavigationState {
  awayPlayers?: Player[];
  awayPitchers?: Pitcher[];
  homePlayers?: Player[];
  homePitchers?: Pitcher[];
  awayTeamName?: string;
  homeTeamName?: string;
  awayTeamId?: string;
  homeTeamId?: string;
  awayTeamColor?: string;
  awayTeamBorderColor?: string;
  homeTeamColor?: string;
  homeTeamBorderColor?: string;
  stadiumName?: string;
  awayRecord?: string;
  homeRecord?: string;
  gameMode?: 'exhibition' | 'franchise' | 'playoff';
  leagueId?: string;
  homeManagerId?: string;
  homeManagerName?: string;
  awayManagerId?: string;
  awayManagerName?: string;
  userTeamSide?: 'home' | 'away';
}
```

### Dependencies

**External:**
- `react-router` (useNavigate, useParams, useLocation)
- `lucide-react` (Menu, ChevronUp)
- `react-dnd` + `react-dnd-html5-backend` (DndProvider, HTML5Backend)

**Internal Components:**
- `@/app/components/EnhancedInteractiveField` (EnhancedInteractiveField, PlayData, SpecialEventData)
- `@/app/components/DragDropGameTracker` (InteractiveField)
- `@/app/components/RunnerDragDrop` (RunnerMoveData)
- `@/app/components/LineupCard` (LineupCard, SubstitutionData, LineupPlayer, BenchPlayer, BullpenPitcher)
- `@/app/components/UndoSystem` (UndoButton, useUndoSystem, GameSnapshot)
- `@/app/components/TeamRoster` (TeamRoster, Player, Pitcher)
- `@/app/components/MiniScoreboard` (MiniScoreboard)
- `@/config/teamColors` (getTeamColors, getFielderBorderColors)
- `@/data/defaultRosters` (defaultTigersPlayers, defaultTigersPitchers, defaultSoxPlayers, defaultSoxPitchers)
- `../../../data/leagueStructure` (areRivals)
- `../components/modals/FielderCreditModal` (FielderCreditModal, RunnerOutInfo, FielderCredit)
- `../components/modals/ErrorOnAdvanceModal` (ErrorOnAdvanceModal, RunnerAdvanceInfo, ErrorOnAdvanceResult)

**Internal Hooks:**
- `@/hooks/useGameState` (useGameState, HitType, OutType, WalkType, RunnerAdvancement, PlayerGameStats, PitcherGameStats)
- `@/app/hooks/usePlayerState` (usePlayerState, PlayerStateData, getStateBadge, formatMultiplier)
- `@/app/hooks/useFameTracking` (useFameTracking, FameEventDisplay, formatFameValue, getFameColor, getLITier)
- `../hooks/useFanMorale` (useFanMorale, GameResult)
- `../hooks/useMWARCalculations` (useMWARCalculations)

**Internal Engines:**
- `../../../engines/mojoEngine` (MojoLevel, MOJO_STATES, getMojoColor)
- `../../../engines/fitnessEngine` (FitnessState, FITNESS_STATES)
- `../../../engines/leverageCalculator` (GameStateForLI)
- `../engines/detectionIntegration` (runPlayDetections, UIDetectionResult)
- `../engines/narrativeIntegration` (generateGameRecap)
- `../engines/inheritedRunnerTracker` (PitcherRunnerStats)

**Internal Storage:**
- `../../../utils/managerStorage` (saveGameDecisions, aggregateManagerGameToSeason)
- `../../../types/game` (FameEventType)

---

## Cross-Hook Interaction Map

```
GameTracker.tsx
  |
  +-- useGameState(gameId)
  |     |-- gameState, scoreboard, playerStats, pitcherStats
  |     |-- recordHit, recordOut, recordWalk, recordD3K, recordError, recordEvent
  |     |-- advanceRunner, advanceRunnersBatch, makeSubstitution, switchPositions, changePitcher
  |     |-- advanceCount, resetCount, endInning, endGame
  |     |-- pitchCountPrompt, confirmPitchCount, dismissPitchCountPrompt
  |     |-- initializeGame, loadExistingGame, restoreState, getRunnerTrackerSnapshot
  |
  +-- usePlayerState({gameId})
  |     |-- players Map, notifications
  |     |-- registerPlayer (called in useEffect after game init)
  |     |-- setMojo, setFitness (called from PlayerCardModal & TeamRoster)
  |     |-- getPlayer (queried for display)
  |     |-- (updateMojo DISABLED for auto - manual only via setMojo)
  |
  +-- useFameTracking({gameId})
  |     |-- tracker, lastEvent, showEventPopup
  |     |-- checkBatterFameEvents (called after each play in handleEnhancedPlayComplete)
  |     |-- checkPitcherFameEvents (called after each play)
  |     |-- recordFameEvent (called for auto-detected events, user-confirmed detections, end-game achievements)
  |
  +-- useFanMorale(homeTeamId) + useFanMorale(awayTeamId)
  |     |-- processGameResult (called at end of game, skipped in exhibition mode)
  |
  +-- useMWARCalculations()
  |     |-- initializeGame, initializeSeason (called in useEffect on mount)
  |     |-- recordDecision (called on pitching changes, subs, IBBs)
  |     |-- resolveDecisionOutcome (called after next play for pending decisions)
  |     |-- checkForManagerMoment (called after each play)
  |     |-- managerMoment (rendered as notification)
  |
  +-- useUndoSystem(5, handleUndo)
        |-- captureSnapshot (called before each play/substitution)
        |-- setCurrentState (synced in useEffect on gameState/scoreboard/stats changes)
        |-- UndoButtonComponent, ToastComponent (rendered in JSX)
```

### Data Flow: Play Recording

```
User taps field (EnhancedInteractiveField)
  -> onPlayComplete(playData: PlayData)
  -> handleEnhancedPlayComplete(playData)
      |
      +-- Check thrown-out runners -> FielderCreditModal (if any) -> handleFielderCreditConfirm
      +-- Check extra advances -> queue ErrorOnAdvanceModal
      +-- calculateRBIFromOutcomes()
      +-- undoSystem.captureSnapshot(description)
      +-- convertToRunnerAdvancement()
      +-- recordHit/recordOut/recordWalk/recordD3K/recordError (-> useGameState -> IndexedDB)
      +-- Update runnerNames display state
      +-- fameTrackingHook.checkBatterFameEvents(currentBatterId, stats)
      +-- fameTrackingHook.checkPitcherFameEvents(currentPitcherId, stats)
      +-- runPlayDetections(playData, batter, pitcher, gameContext)
      |     +-- auto-detected -> fameTrackingHook.recordFameEvent(...)
      |     +-- prompt-detected -> setPendingDetections([...])
      +-- mWAR: IBB detection, resolve pending, checkForManagerMoment
      +-- Show ErrorOnAdvanceModal if queued
```

### Data Flow: Undo

```
undoSystem synced via useEffect:
  { gameState, scoreboard, playerStatsEntries, pitcherStatsEntries, runnerTrackerSnapshot }

captureSnapshot(description) -> deep clone current -> push to stack (max 5)

performUndo() -> pop last snapshot -> handleUndo(snapshot)
  -> restoreState({
       gameState, scoreboard,
       playerStats: new Map(entries),
       pitcherStats: new Map(entries),
       runnerTrackerState: { runners, currentPitcherId, pitcherStats: new Map(entries), ... }
     })
```

Note: Maps are serialized as entries arrays for JSON.stringify compatibility in the undo stack.
