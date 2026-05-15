# Manager Moments Tracking Spec

> **Superseded for new implementation:** Use `spec-docs/KBL_MANAGER_WPA_IMPLEMENTATION_SPEC.md` for KBL Manager WPA work. This older draft is retained as legacy mWAR/moment-tracking context only; do not implement new manager scoring from the fixed mWAR values below.

**Date:** 2026-04-06
**Status:** DRAFT — Awaiting JK approval before implementation
**Dependencies:** MWAR_CALCULATION_SPEC.md, MODE_2_V1_FINAL.md §5.3/§11.5/§13.6
**Scope:** Wire manager decision tracking into GameTracker, flow to Franchise + Elimination

---

## 1. Overview

Manager Moments tracks in-game decisions attributable to each team's manager and measures their impact via netWPA (Win Probability Added). Decisions fall into three inference tiers:

| Tier | User Effort | Examples |
|------|-------------|---------|
| **Auto-Detect** | None | Pitching change, pinch hitter, pinch runner, defensive sub, IBB |
| **Prompt-Detect** | 1 click (Y/N) | Steal call, bunt call, squeeze call |
| **Passive** | None (inferred) | Leave pitcher in (detected when a struggling pitcher continues) |

All decisions are attributed to the **correct team's manager** based on which team is acting.

---

## 2. Current State (What Exists)

### Already Built:
- `mwarCalculator.ts` — Complete engine with all 12 decision type evaluators
- `mwarIntegration.ts` — Integration layer with Manager Moment trigger (LI >= 2.0)
- `useMWARCalculations.ts` — React hook with `recordDecision()`, `resolveDecisionOutcome()`, `checkForManagerMoment()`
- `managerStorage.ts` — IndexedDB persistence for decisions + season stats
- `BetweenPlayEvent` type includes `manager_moment` event type with full payload

### Already Wired in GameTracker:
- `mwarHook` initialized at line 1361
- **Pitching change** auto-recorded (lines 4860, 6891)
- **Pinch hitter / Defensive sub** auto-recorded (line 4995)
- **Manager Moment prompt panel** renders when LI >= 2.0 (line 9809)
- **End-of-game persistence** via `saveGameDecisions()` + `aggregateManagerGameToSeason()` (line 9086)

### NOT Wired (Gaps):

| Gap | Description |
|-----|-------------|
| **GAP-M1** | Only HOME manager tracked — away manager decisions credited to wrong manager |
| **GAP-M2** | Decision resolution never fires — `pendingMWARDecisions` populated but never read |
| **GAP-M3** | Stolen base / caught stealing not linked to mWAR decisions |
| **GAP-M4** | Pinch runner not tracked as mWAR decision |
| **GAP-M5** | IBB not tracked as mWAR decision |
| **GAP-M6** | "Leave pitcher in" not tracked — no pitcher struggle detection |
| **GAP-M7** | Bunt / squeeze / hit-and-run prompts not implemented |
| **GAP-M8** | `checkForManagerMoment()` never called — LI check doesn't fire after plays |
| **GAP-M9** | Decisions don't flow to `PersistedGameState.managerDecisions` for archival |
| **GAP-M10** | Elimination mode doesn't consume mWAR data |

---

## 3. Architecture: Dual-Manager Tracking

### 3.1 Manager Identity

Each game has two managers, derived from team IDs:

```typescript
const homeManagerId = navigationState?.homeManagerId || `${homeTeamId}-manager`;
const awayManagerId = navigationState?.awayManagerId || `${awayTeamId}-manager`;
```

### 3.2 Manager Attribution Rule

**The acting team's manager owns the decision.** Attribution is determined by:

| Decision Type | Attribution Logic |
|---|---|
| Pitching change | Manager of the team whose pitcher is being replaced |
| Pinch hitter | Manager of the team at bat (offensive manager) |
| Pinch runner | Manager of the team whose runner is being replaced (offensive manager) |
| Defensive sub | Manager of the team in the field (defensive manager) |
| IBB | Manager of the team pitching (defensive manager) |
| Steal call | Manager of the team running (offensive manager) |
| Bunt / squeeze | Manager of the team at bat (offensive manager) |
| Leave pitcher in | Manager of the team pitching (defensive manager) |

**Implementation:** Use `gameState.isTop` to determine which team is offensive/defensive:
```typescript
function getOffensiveManagerId(): string {
  return gameState.isTop ? awayManagerId : homeManagerId;
}
function getDefensiveManagerId(): string {
  return gameState.isTop ? homeManagerId : awayManagerId;
}
```

### 3.3 Dual GameManagerStats

Track two `GameManagerStats` instances — one per manager:

```typescript
const [homeManagerStats, setHomeManagerStats] = useState<GameManagerStats | null>(null);
const [awayManagerStats, setAwayManagerStats] = useState<GameManagerStats | null>(null);
```

Initialize both at game start. Route decisions to the correct manager's stats based on attribution.

---

## 4. Auto-Detected Decisions

These decisions are inferred from game events with zero user input.

### 4.1 Pitching Change (ALREADY WIRED — needs attribution fix)

**Trigger:** Pitcher ID changes.
**Current code:** Lines 4860, 6891 in `GameTracker.tsx`
**Fix needed:** Attribute to the team whose pitcher is being replaced (defensive manager), not always `homeManagerId`.

**Resolution criteria:**
- **Success:** New pitcher — inherited runners scored = 0 AND runs allowed <= 1 AND outs >= 3
- **Failure:** Inherited runners scored > 0 OR (runs allowed >= 2 AND outs < 3)
- **Neutral:** Everything else
- **Resolve after:** New pitcher's next full inning or exit (whichever first)

### 4.2 Pinch Hitter (ALREADY WIRED — needs attribution fix)

**Trigger:** Substitution where outgoing player = current batter.
**Current code:** Line 4995 in `GameTracker.tsx`
**Fix needed:** Attribute to offensive manager.

**Resolution criteria:**
- **Success:** PH gets on base (1B, 2B, 3B, HR, BB, HBP, SF, SAC)
- **Failure (severe):** K or GIDP → value: -0.5 x sqrt(LI)
- **Failure (mild):** Other outs (GO, FO, LO, PO) → value: -0.3 x sqrt(LI)
- **Resolve after:** PH's plate appearance completes

### 4.3 Pinch Runner (NOT WIRED)

**Trigger:** Substitution with `subType === 'pinch_run'`.
**Where to wire:** In the substitution handler, after a pinch runner is placed on base.
**Attribution:** Offensive manager.

**Resolution criteria:**
- **Success:** Pinch runner scores → +0.4 x sqrt(LI)
- **Success (partial):** Runner advances → +0.1 x sqrt(LI)
- **Failure:** Runner thrown out on bases (CS, pickoff, TOOTBLAN) → -0.4 x sqrt(LI)
- **Neutral:** Runner stranded at end of inning
- **Resolve after:** Runner scores, is out, or inning ends

### 4.4 Defensive Sub (ALREADY WIRED — needs attribution fix)

**Trigger:** Non-PH, non-PR substitution.
**Current code:** Line 4995 (else branch).
**Fix needed:** Attribute to defensive manager.

**Resolution criteria:**
- **Success:** Replacement fielder involved in a positive play (putout, assist) → +0.4 x sqrt(LI)
- **Failure:** Replacement fielder commits error → -0.3 x sqrt(LI)
- **Neutral:** No fielding involvement
- **Resolve after:** End of half-inning or replacement fielder's first fielding event

### 4.5 Intentional Walk (NOT WIRED)

**Trigger:** At-bat result = `IBB` (already tracked in at-bat events).
**Where to wire:** In `commitPlateAppearance()` or the at-bat result handler, when result is IBB.
**Attribution:** Defensive manager (team that issued the IBB).

**Resolution criteria:**
- **Success:** Next batter makes out (GO, FO, LO, PO, K, DP) → +0.3 x sqrt(LI)
- **Failure:** Next batter gets hit (1B, 2B, 3B, HR) → -0.4 to -0.7 x sqrt(LI) based on runs scored
- **Failure:** Next batter walks (BB) → -0.3 x sqrt(LI) (loaded the bases)
- **Neutral:** HBP on next batter
- **Resolve after:** Next batter's plate appearance completes

---

## 5. Prompt-Detected Decisions

These require a 1-click confirmation from the user. Per the detection philosophy: prompt only when uncertain, default to "No" (player autonomy) if dismissed.

### 5.1 Steal Call (NOT WIRED)

**Trigger condition:** Between-play event type = `stolen_base` or `caught_stealing`.
**Prompt:** "Manager's call?" with [Yes] / [No] buttons. Default: No (player's own decision).
**Attribution:** Offensive manager.

**Display:** Show prompt inline in the between-play event confirmation area (not a modal — minimal disruption).

**Resolution (if Yes):**
- **Success:** SB successful → +0.3 x sqrt(LI)
- **Failure:** CS → -0.4 x sqrt(LI)
- **Resolve:** Immediate — outcome is already known when prompt shows

### 5.2 Bunt Call (NOT WIRED)

**Trigger condition:** At-bat result involves a bunt (SAC bunt, bunt single, bunt out).
**Prompt:** "Manager's call?" — same pattern as steal.
**Attribution:** Offensive manager.

**Resolution (if Yes):**
- **Success:** Batter sacrificed, runner advanced → +0.2 x sqrt(LI)
- **Failure:** Bunt popped up, batter out with no advancement → -0.4 x sqrt(LI)
- **Resolve:** Immediate

### 5.3 Squeeze Call (NOT WIRED)

**Trigger condition:** Bunt attempt with runner on 3rd base.
**Prompt:** "Squeeze play?" — only shows when runner on 3rd + bunt.
**Attribution:** Offensive manager.

**Resolution (if Yes):**
- **Success:** Runner scores → +0.6 x sqrt(LI)
- **Failure:** Runner out at home or batter out with no score → -0.5 x sqrt(LI)
- **Resolve:** Immediate

### 5.4 Prompt UX Pattern

All prompts follow the same minimal pattern:

```
┌─────────────────────────────────┐
│ ⚡ Manager's call?    [Yes] [No] │
└─────────────────────────────────┘
```

- Appears inline beneath the between-play event or at-bat result
- Auto-dismisses after 5 seconds → defaults to "No"
- Does not block game flow — user can continue recording plays
- If "Yes": creates mWAR decision with `inferenceMethod: 'user_prompted'`
- If "No" or dismissed: no decision recorded (player autonomy assumed)

---

## 6. Passive Detection: Leave Pitcher In

### 6.1 Struggle Detection

The "leave pitcher in" decision is the INVERSE of pitching change — it fires when a manager COULD pull the pitcher but doesn't. It requires detecting when a pitcher is struggling.

**Pitcher Struggle Criteria (any ONE triggers "struggling" state):**

| Condition | Threshold | Rationale |
|---|---|---|
| Consecutive hits allowed | >= 3 in current outing | Pattern of hard contact |
| Runs allowed in current inning | >= 3 | Inning blowing up |
| Pitch count | >= 100 (starter) or >= 40 (reliever) | Fatigue threshold |
| Consecutive walks | >= 2 | Loss of command |
| Consecutive HRs allowed | >= 2 | Already tracked in `PitcherGameStats` |
| Bases loaded + no outs + run(s) scored | True | Jam situation |

### 6.2 New Tracking Fields

Add to `PitcherGameStats` in `useGameState.ts`:

```typescript
// Struggle detection (rolling within current outing)
consecutiveHitsAllowed: number;     // Reset on out or K
consecutiveWalksAllowed: number;    // Reset on out, K, or hit
currentInningRunsAllowed: number;   // Reset each half-inning
```

Update these after each at-bat in `commitPlateAppearance()`:
- Hit → increment `consecutiveHitsAllowed`, reset `consecutiveWalksAllowed`
- Walk → increment `consecutiveWalksAllowed`, reset `consecutiveHitsAllowed`
- Out/K → reset both consecutive counters
- Run scores → increment `currentInningRunsAllowed`
- New half-inning → reset `currentInningRunsAllowed`

### 6.3 Decision Creation

**When to create:** After each at-bat, if the current pitcher is "struggling" (per 6.1) AND the manager did NOT make a pitching change, implicitly record a `leave_pitcher_in` decision.

**Guard against spam:** Only create ONE `leave_pitcher_in` decision per "struggle episode." Track with a flag:

```typescript
const pitcherStrugglingRef = useRef<Set<string>>(new Set()); // pitcherId set
```

- When struggle detected for a pitcher not in the set: create decision, add to set
- When pitcher is pulled: remove from set
- When struggle conditions clear (3 consecutive outs): remove from set

**Attribution:** Defensive manager.

### 6.4 Resolution

- **Success:** Pitcher gets out of the inning with 0 additional runs → +0.2 x sqrt(LI)
- **Failure:** Pitcher allows 2+ additional runs before being pulled or inning ends → -0.4 x sqrt(LI)
- **Neutral:** 1 run allowed or inning ends with mixed results
- **Resolve after:** Current half-inning ends OR pitcher is pulled (whichever first)

---

## 7. Decision Resolution System

### 7.1 Post-Play Resolution Hook

After each at-bat completes (`commitPlateAppearance`), check all pending decisions and resolve any that have enough information:

```typescript
function resolveCompletedDecisions(atBatResult: string, runsScored: number) {
  for (const [decisionId, pending] of pendingMWARDecisions) {
    if (!pending.resolveAfterNextPlay) continue;

    const outcome = evaluateDecisionOutcome(pending, atBatResult, runsScored);
    if (outcome !== null) {
      // Resolve the decision
      const managerId = pending.managerId;
      const stats = managerId === homeManagerId ? homeManagerStats : awayManagerStats;
      mwarHook.resolveDecisionOutcome(decisionId, outcome);

      // Remove from pending
      setPendingMWARDecisions(prev => {
        const next = new Map(prev);
        next.delete(decisionId);
        return next;
      });
    }
  }
}
```

### 7.2 Resolution Timing by Decision Type

| Decision | Resolves After | Evaluation Input |
|---|---|---|
| Pitching change | New pitcher's next full inning or exit | `inheritedRunnersScored`, `runsAllowed`, `outsRecorded` |
| Pinch hitter | PH's plate appearance | `atBatResult` |
| Pinch runner | Runner scores, is out, or inning ends | Runner outcome tracking |
| Defensive sub | End of half-inning or first fielding event | Fielding event data |
| IBB | Next batter's plate appearance | Next `atBatResult` + runs scored |
| Steal call | Immediate (outcome already known) | SB or CS result |
| Bunt / squeeze | Immediate | Bunt outcome |
| Leave pitcher in | Half-inning ends or pitcher pulled | `runsAllowed` after decision point |

### 7.3 Enhanced Pending Decision Structure

```typescript
interface PendingMWARDecision {
  decisionId: string;
  decisionType: DecisionType;
  managerId: string;           // NEW: which manager owns this
  teamId: string;              // NEW: which team
  involvedPlayers: string[];

  // Resolution timing
  resolveAfterNextPlay: boolean;       // Resolve after next at-bat (PH, IBB)
  resolveAfterInning: boolean;         // Resolve at end of half-inning (leave pitcher in, def sub)
  resolveAfterPitcherExit: boolean;    // Resolve when pitcher exits (pitching change)
  resolveImmediate: boolean;           // Already resolved (steal, bunt)

  // Context for evaluation
  pitcherIdToTrack?: string;           // For pitching change: new pitcher's ID
  runnerIdToTrack?: string;            // For pinch runner: PR's ID
  runsAtDecision?: number;             // Snapshot of runs when decision was made
  outsAtDecision?: number;             // Snapshot of outs
  inningAtDecision?: number;           // Snapshot of inning
}
```

### 7.4 Resolution Checkpoints

Resolution logic runs at three checkpoints:

1. **After each at-bat** (`commitPlateAppearance`):
   - Resolve `resolveAfterNextPlay` decisions (PH, IBB next batter)
   - Check pitching change pitcher performance (may resolve if enough data)

2. **At half-inning change** (when `isTop` flips):
   - Resolve `resolveAfterInning` decisions (leave pitcher in, defensive sub)
   - Check unresolved pitching changes

3. **On pitcher change**:
   - Resolve `resolveAfterPitcherExit` decisions
   - Capture final stats for evaluation

---

## 8. End-of-Game Persistence

### 8.1 Populate `PersistedGameState.managerDecisions`

At game end in `completeGameInternal`, build the `managerDecisions` array from both managers' stats:

```typescript
managerDecisions: [
  ...(homeManagerStats?.decisions ?? []).map(d => ({
    managerId: homeManagerId,
    decisionType: d.decisionType,
    mwarImpact: d.clutchImpact,
    description: d.notes ?? `${d.decisionType} in inning ${d.inning}`,
  })),
  ...(awayManagerStats?.decisions ?? []).map(d => ({
    managerId: awayManagerId,
    decisionType: d.decisionType,
    mwarImpact: d.clutchImpact,
    description: d.notes ?? `${d.decisionType} in inning ${d.inning}`,
  })),
]
```

### 8.2 Persist to `managerStorage`

Already wired at line 9086-9102. Needs update to:
1. Save BOTH managers' decisions (currently only home)
2. Aggregate to season for BOTH managers
3. Use correct `seasonId` / `statsScopeId` per game mode

### 8.3 Flow to Elimination Mode

**Current gap:** Elimination bracket stats (`playoffStorage.aggregateGameToPlayoffStats`) don't capture manager decisions.

**Fix:** Add manager decisions array to `PlayoffPlayerStats` or create a separate `PlayoffManagerStats` store. At minimum, the `CompletedGameRecord` (which IS written for elimination games) should contain the `managerDecisions` array so it can be queried later.

---

## 9. Manager Moment Visual Indicator

### 9.1 LI Check Trigger

**Gap:** `checkForManagerMoment()` is never called. It needs to fire after every play.

**Where to call:** After `commitPlateAppearance()` and after each between-play event, call:

```typescript
mwarHook.checkForManagerMoment(buildGameStateForLI());
```

This updates `mwarHook.managerMoment.isTriggered` which the QuickBar already reads via `isManagerMoment` prop.

### 9.2 Visual Treatment

Per MODE_2_V1_FINAL.md §5.3: "Subtle visual indicator — pulsing border on Quick Bar or lightning icon."

Already partially implemented: `isManagerMoment` prop passed to QuickBar at line 9460. The QuickBar should show a pulsing amber/gold border or a small `⚡` indicator when `isManagerMoment` is true.

---

## 10. Implementation Priority

### Phase 1: Fix Attribution + Wire Resolution (Critical Path)

| Task | Effort | Files |
|---|---|---|
| M1: Dual-manager tracking (home + away) | Medium | GameTracker.tsx, useMWARCalculations.ts |
| M2: Post-play decision resolution hook | Medium | GameTracker.tsx |
| M8: Call `checkForManagerMoment()` after plays | Small | GameTracker.tsx |
| M9: Populate `managerDecisions` in `persistedState` | Small | useGameState.ts |

### Phase 2: Wire Missing Auto-Detections

| Task | Effort | Files |
|---|---|---|
| M3: SB/CS → steal_call prompt | Small | GameTracker.tsx (runner action handler) |
| M4: Pinch runner → mWAR decision | Small | GameTracker.tsx (sub handler) |
| M5: IBB → mWAR decision | Small | GameTracker.tsx (commitPlateAppearance) |

### Phase 3: Struggle Detection + Prompts

| Task | Effort | Files |
|---|---|---|
| M6: Pitcher struggle tracking + leave_pitcher_in | Medium | useGameState.ts, GameTracker.tsx |
| M7: Bunt/squeeze/H&R prompts | Medium | GameTracker.tsx (new prompt UI) |

### Phase 4: Consumer Integration

| Task | Effort | Files |
|---|---|---|
| M10: Elimination mode mWAR display | Medium | EliminationHome.tsx, playoffStorage.ts |
| Season/career mWAR aggregation | Medium | managerStorage.ts, seasonAggregator.ts |

---

## 11. Decision Value Reference Table

From MWAR_CALCULATION_SPEC.md §5:

| Decision | Success | Failure (mild) | Failure (severe) |
|---|---|---|---|
| Pitching change | +0.4 x sqrt(LI) | -0.3 x sqrt(LI) | — |
| Leave pitcher in | +0.2 x sqrt(LI) | — | -0.4 x sqrt(LI) |
| Pinch hitter | +0.5 x sqrt(LI) | -0.3 x sqrt(LI) | -0.5 x sqrt(LI) (K/GIDP) |
| Pinch runner | +0.4 x sqrt(LI) | -0.4 x sqrt(LI) | — |
| Defensive sub | +0.4 x sqrt(LI) | -0.3 x sqrt(LI) | — |
| IBB | +0.3 x sqrt(LI) | -0.4 x sqrt(LI) | -0.7 x sqrt(LI) (HR after) |
| Steal call | +0.3 x sqrt(LI) | -0.4 x sqrt(LI) | — |
| Bunt call | +0.2 x sqrt(LI) | -0.4 x sqrt(LI) | — |
| Squeeze call | +0.6 x sqrt(LI) | -0.5 x sqrt(LI) | — |

---

## 12. Data Flow Diagram

```
DURING GAME:
  At-bat result / Between-play event
    → Auto-detect decision type
    → Determine attribution (offensive/defensive manager)
    → Create ManagerDecision (unresolved)
    → Add to pendingMWARDecisions + correct manager's GameManagerStats
    → [If prompt-type] Show inline "Manager's call?" prompt
    → After subsequent play: resolve pending decisions

AT GAME END:
  homeManagerStats.decisions + awayManagerStats.decisions
    → PersistedGameState.managerDecisions (archived)
    → managerStorage.saveGameDecisions() (indexed by gameId + managerId)
    → managerStorage.aggregateManagerGameToSeason() (season mWAR updated)

IN FRANCHISE/ELIMINATION:
  → Season mWAR displayed on manager card
  → Best/worst decisions shown in post-game summary
  → Manager Moments count tracked per season
  → mWAR feeds into Manager of the Year voting
```

---

## 13. Open Questions for JK

1. **Steal call prompt timing:** Show the "Manager's call?" prompt immediately after the SB/CS event, or wait until user confirms the runner action? (Recommend: after runner action confirmation)

2. **Bunt detection in SMB4:** Are bunts distinguishable from other ground outs in SMB4? If not, we may need a manual "Bunt" button in the at-bat result options rather than auto-detection.

3. **Leave pitcher in threshold tuning:** The struggle criteria (3 consecutive hits, 3 runs in inning, 100+ pitches) — do these feel right for SMB4 pace? SMB4 games are shorter than real baseball.

4. **Manager naming:** Currently managers are auto-generated IDs (`teamId-manager`). Should we add a way to name managers in League Builder or Franchise setup? The spec mentions managers are "named and editable."

5. **Away manager in exhibition:** Exhibition games may not have meaningful manager tracking. Should we still track both managers' decisions for exhibition, or only for franchise/elimination?
