# GameTracker Architecture Decision Memo — v3 (Final for Codex)

**Date:** 2026-03-10
**Supersedes:** v1 and v2 of 2026-03-09
**Purpose:** Actionable architectural decisions for GameTracker cleanup and rebuild. Every decision has been reviewed and approved by JK. Codex should execute against this document.

---

## 1. Core Principle

**The user is an objective scorekeeper entering SMB4 game facts. The engine interprets those facts into metrics, events, and value.**

- User inputs: play results, ball location, fielder involvement, catch type, special events
- Engine computes: fWAR, fame, leverage, web gems, clutch, WPA, auto-corrections
- No UI interaction should ask the user to make a subjective judgment that the engine can derive from objective data

---

## 2. Target Platform

**iPad horizontal (landscape).** Not phone-based, not browser-based.

- iPad standard: 1024 × 768
- iPad Pro 11": 1194 × 834
- iPad Pro 12.9": 1366 × 1024

Layout should use multi-column design (diamond + play log side by side) to take advantage of wide aspect ratio.

---

## 3. EnhancedInteractiveField (EIF): REMOVE AND REPLACE

### 3.1 What to Remove

Delete `src/src_figma/app/components/EnhancedInteractiveField.tsx` (~4,500 lines) entirely. The following sub-systems within EIF are all removed:

| Sub-system | Lines (approx) | Reason |
|-----------|----------------|--------|
| Drag-and-drop (fielders, batter, runners) | ~400 | Replaced by tap interactions |
| HitTypeModal (defined line 920, state line 1738) | ~70 | ORPHANED: state managed but component never rendered in JSX |
| OutTypeModal (defined line 995, state line 1739) | ~90 | ORPHANED: state managed but component never rendered in JSX |
| ActionSelector (HIT/OUT/OTHER buttons in foul territory) | ~50 | Replaced by QuickBar |
| ModifierButtonBar (8 modifier buttons) | ~60 | Replaced by enhancement mode |
| StarPlaySubtypePopup (catch type selection) | ~80 | Output was DISCARDED (never stored). Catch type moves to enhancement mode |
| BatterReachedPopup | ~60 | Removed with drag-and-drop |
| RunnerOutcomeArrows | ~100 | Moves to standalone component |
| LI computation (lines 1948, 2094) | ~30 | REDUNDANT: useGameState already computes and persists LI. EIF's copies were never persisted. ZERO data loss. |
| Fame computation (imported calculateFame at line 119) | ~5 | ORPHANED: imported but NEVER CALLED in EIF |
| gameSituation → LI conversion (lines 2080-2099) | ~20 | REDUNDANT: display-only, useGameState is source of truth |
| Play classification engine (classifyPlay, shouldAutoComplete) | ~200 | Replaced by QuickBar + engine logic |
| EnrichmentPanel (in-field panels) | ~50 | Moves to dedicated screen area |
| Ball landing prompts, HR location prompts | ~100 | Replaced by diamond tap in enhancement mode |
| ~30 state variables for flow management | ~100 | Entire state machine eliminated |

### 3.2 What to Build: GameDiamond.tsx

New component, estimated ~500-800 lines. Imports `FieldCanvas` and `FielderIcon` from existing component library.

**Always-present elements:**
- Field SVG background (from `FieldCanvas`)
- 9 fielder icons showing: player name, position label (SS, CF, etc.), current fWAR value. Drop position NUMBER display (not interesting to user)
- Runner icons on bases showing full player name
- Batter icon at home plate

**Two modes (determined by whether user has tapped a play in the play log):**

#### Mode 1 — Info Mode (no play tapped)
- Diamond displays current game state (info only)
- Fielder tap → popover for between-play actions (PB, pitching change, defensive sub)
- Runner tap → popover for between-play events (SB, CS, PK, WP, PB, TOOTBLAN)
- QuickBar is active and is the primary input

#### Mode 2 — Enhancement Mode (play tapped in play log)
- Diamond becomes interactive with visual indicator (different border/overlay)
- Diamond tap → ball location (hit or out position depending on play result)
- Fielder tap → add to throw sequence for that play:
  - **Single fielder tap** = putout assignment (for GO, FO, LO, PO, foul-out, FC, DP)
  - **Multiple fielder taps** = throw sequence; engine assigns: last tapped = putout, all previous = assists (in order)
  - For DP: engine reads sequence to determine started/turned/completed roles
- Runner tap → runner outcomes override popover (advance more bases, mark out, adjust from engine default)
- QuickBar dimmed or hidden (play already logged)
- Catch type selector appears (see Section 7)
- Special event toggles available (KP, NUT — see Section 8)
- Exit type selector for hits (see Section 9)

### 3.3 FielderIcon Changes

Current `FielderData` interface (`src/src_figma/app/components/FielderIcon.tsx:31-35`):
```typescript
interface FielderData {
  positionNumber: number;
  name: string;
  playerId?: string;
}
```

**Change to:**
```typescript
interface FielderData {
  positionNumber: number;   // Keep for positioning logic (1-9)
  name: string;
  playerId: string;         // REQUIRED, not optional
  position: string;         // Position LABEL (SS, CF, 1B, etc.)
  fwar?: number;            // Current season fWAR for display
}
```

**Display changes:**
- Line 1: Player name (e.g., "JOHNSON")
- Line 2: Position label + fWAR (e.g., "SS · 0.3")
- Remove position NUMBER from display (line 200: `{positionLabel} • {fielder.positionNumber}` → `{positionLabel} · {fwar}`)

---

## 4. QuickBar: RETAIN AS-IS

`src/src_figma/app/components/QuickBar.tsx` (170 lines) is the ONLY fully functional recording path. It stays unchanged.

**20 outcome buttons:**
- Primary: K, GO, FO, LO, 1B, BB, 2B, HR
- Overflow: PO, 3B, HBP, E, FC, DP, TP, SAC, SF, IBB, WP_K, PB_K, GRD

**Flow:** User taps QuickBar button → play logged to play log → runner outcomes display appears immediately (Option A) → user confirms or adjusts runners → play finalized → new play highlighted in log with "enhance" affordance.

---

## 5. Runner Outcomes: RETAIN AND INTEGRATE

### 5.1 RunnerOutcomesDisplay — Keep

`src/src_figma/app/components/RunnerOutcomesDisplay.tsx` already handles:
- Pre-calculated default outcomes via `getDefaultRunnerOutcome()` (useGameState.ts:538)
- User can tap to cycle destinations including **OUT** (line 124: `['out', 'first', 'second', 'third', 'home']`)
- Adjusted outcomes marked `isDefault: false` (line 144)
- Auto-correction: `autoCorrectResult()` (useGameState.ts:658) converts FO→SF, GO+runner out→DP, etc.

### 5.2 Integration with New Architecture

**After QuickBar tap (Option A — approved):**
1. Play logged to play log
2. Runner outcomes display appears IMMEDIATELY (not deferred to enhancement mode)
3. User confirms or adjusts (including marking runners OUT if engine was wrong)
4. Play finalized
5. New play highlighted in log with brief "enhance" affordance
6. Enhancement mode accessible by tapping the play later

**In Enhancement Mode (tapping play in log later):**
- Runner outcomes can be re-visited and adjusted
- This is the same RunnerOutcomesDisplay but re-activated for an existing play

---

## 6. fWAR: WIRE SYSTEM A, REMOVE SYSTEM B

### 6.1 The Problem

Two competing fWAR calculation systems exist:

**System A — Event-driven (per-play) — BUILT, ORPHANED:**
- `src/engines/fwarCalculator.ts:311` — `calculateEventValue()` — full formula: Base Run Value × Difficulty Modifier × Position Weight
- `src/engines/fwarCalculator.ts:358` — `calculateGameFWAR()` — processes per-play events
- `src/engines/fwarCalculator.ts:406` — `calculateSeasonFWAR()` — aggregates per-play events
- `src/engines/fwarCalculator.ts:671` — `calculateFWARFromPersistedEvents()` — async entry point
- `src/engines/fwarCalculator.ts:625` — `convertPersistedToCalculatorEvent()` — adapter from eventLog format
- **Status:** Only called in test files. Zero production callers.

**System B — Counting stats (legacy) — CURRENTLY RUNNING:**
- `src/engines/fwarCalculator.ts:480` — `calculateFWARFromStats()` — takes `{ putouts, assists, errors, doublePlays }` counts
- `src/src_figma/app/engines/warOrchestrator.ts:17` — imports ONLY `calculateFWARFromStats`
- `src/src_figma/app/engines/warOrchestrator.ts:222` — calls with season aggregates
- `src/hooks/useWARCalculations.ts:31` — also imports only `calculateFWARFromStats`
- **Loses:** All difficulty/catch-type data. `starPlayRuns` always returns 0. Every putout treated the same regardless of difficulty.

### 6.2 What to Do

1. **Wire System A** as the production path:
   - `warOrchestrator.ts` should call `calculateFWARFromPersistedEvents()` (or `calculateSeasonFWAR()` with converted events) instead of `calculateFWARFromStats()`
   - `useWARCalculations.ts` same change
   - Ensure fielding events are being written to IndexedDB with correct data (see Section 10)

2. **Remove System B** (`calculateFWARFromStats`) from production paths. Keep it only as a fallback for games that don't have per-play fielding data (historical/imported games).

3. **Fix the adapter** (`convertPersistedToCalculatorEvent` at line 625):
   - Line 684: Currently filters by position instead of playerId. MUST filter by playerId once player identity is fixed (Section 10).

### 6.3 Base Run Values Are Linear Weights, NOT WPA

The base run values in `FIELDING_RUN_VALUES` (fwarCalculator.ts:21-56) are context-independent linear weights — fixed average run values per event type, derived from MLB research. They do NOT change based on game situation.

WPA is a separate system (`src/engines/wpaCalculator.ts`) that IS context-dependent and is already computed and stored on every AtBatEvent (eventLog.ts:192-194). WPA and fWAR are independent calculations — do not conflate them.

fWAR does NOT use LI. This is correct per MLB methodology (fielding skill is context-independent).

---

## 7. Catch Type / Difficulty System: EXPAND

### 7.1 Current State

`DIFFICULTY_MULTIPLIERS` in fwarCalculator.ts:80-90 has: routine, charging, running, diving, leaping, wall, robbedHR, overShoulder, sliding.

### 7.2 New Catch Types to Add

| Catch Type | Multiplier | Applies To | Notes |
|-----------|-----------|-----------|-------|
| routine | 1.0x | All | Default. Already in code. |
| charging | 1.3x | Infield | Already in code. Charging slow roller. |
| running | 1.5x | All | Already in code. Cover ground. |
| diving | 2.5x | All | Already in code. Horizontal extension. |
| leaping | 2.0x | All | Already in code. Vertical extension. |
| sliding | 2.5x | Outfield | Already in code. Slide catch. |
| overShoulder | 2.0x | Outfield | Already in code. Running away from plate. |
| wall | 2.5x | Outfield | Already in code. At the wall. |
| robbedHR | 5.0x | Outfield | Already in code. Over fence catch. |
| **beatRunner** | **1.2x** | **Infield** | **NEW.** Close throw, got him. Tracks strong arm/quick release. |
| **beatThrow** | **0.0x** | **All** | **NEW.** Threw but runner safe. No fWAR credit (play not completed). Tracks arm weakness for analytics. |
| **missedDive** | **0.0x** | **All** | **NEW.** Attempted dive, didn't get ball. Good effort, no penalty. Already handled in calculateErrorValue (line 278: `if (context.missedDive) return 0`). |
| **missedLeap** | **0.0x** | **All** | **NEW.** Attempted leap, didn't get ball. Good effort, no penalty. |

### 7.3 When Catch Type Is Available

**Anytime a fielder is involved in a play.** This includes:
- Outs (GO, FO, LO, PO, DP, TP, FC, SF, foul-out)
- Errors
- Hits where a fielding attempt was made (user opts in via enhancement mode)

Catch type is selected in **enhancement mode** after the user taps fielder(s) for throw sequence.

### 7.4 isWebGem — Engine Determines

Current `isWebGem()` function (fwarCalculator.ts:578) checks difficulty. This stays as engine logic — the user does NOT decide if something is a web gem. The user enters catch type (objective fact), and the engine determines if it qualifies.

Current implementation: `['diving', 'robbedHR', 'wall', 'sliding'].includes(difficulty)` — may need tuning but the architecture is correct.

### 7.5 Fame Values from Catch Type

The engine derives fame bonuses from catch type. FIELDING_SYSTEM_SPEC.md Section 12 defines:
- Diving/leaping/wall/sliding/over-shoulder catch: +1 Fame
- Robbed HR: +2 Fame
- Error allowing run: -1 Fame
- Failed HR robbery: -1 Fame

**BUG:** useGameState.ts:4326 has WEB_GEM=1.0 but spec says 0.75. Fix to match spec.

---

## 8. Modifiers and Enhancements: RECLASSIFY

### 8.1 Keep as Modifiers (pre-play toggles)

| Modifier | Reason |
|----------|--------|
| **TOOTBLAN** | Runner thrown out on bases in unusual way. Objective event, OK as modifier. |
| **BUNT** | Objectively trackable. Swinging bunts are different from actual bunts even with similar hit location. |

### 8.2 Move to Enhancements (tied to play in log)

| Enhancement | UI Location | Notes |
|------------|------------|-------|
| **KP (Killed Pitcher)** | Special event toggle in enhancement mode | Ball hit pitcher during play. Independent of play result (hit or out). Triggers mojo/fitness impact via engine. |
| **NUT (Nut Shot)** | Special event toggle in enhancement mode | Ball hit pitcher in groin. Triggers mojo impact. Independent of play result. |
| **Pitch count** | Enhancement panel field | Per JK: enhancement, not modifier |
| **Exit type** (ground/line/fly/popup) | Enhancement selector for hits | Implied for outs via QuickBar (GO=ground, FO=fly, LO=line, PO=popup). For hits: user selects in enhancement mode. Feeds into `BallInPlayData.trajectory` (eventLog.ts:464). |
| **Catch type** | Enhancement selector (see Section 7) | Available whenever fielder is assigned |
| **Ball location** | Diamond tap in enhancement mode | Spray chart coordinates. For both hits and outs. |
| **Fielding sequence** | Fielder taps in enhancement mode | See Section 10 |

### 8.3 Remove (Engine-Derived)

| Former Modifier | Why Remove | Engine Replacement |
|----------------|-----------|-------------------|
| WG (Web Gem) | Engine determines from catch type + difficulty multiplier | `isWebGem()` in fwarCalculator.ts:578 |
| ROB (Robbery) | Engine determines from catch type = robbedHR (5.0x) | Catch type selection in enhancement mode |
| BT (Beat Throw) | Now a catch type option in enhancement mode | beatThrow catch type (0.0x) |
| 7+ (7+ Pitch AB) | Engine counts from pitch count data | Pitch count as enhancement field |

---

## 9. Ball Location: USER INPUT, MINIMAL INFERENCE

### 9.1 What Stays

User taps ball location on diamond for **both hits and outs** in enhancement mode. This provides spray chart coordinates.

**Only inference retained:** Spray sector label — converting tap coordinates to zone names ("Left-Center", "Right", etc.) for display and spray chart categorization.

### 9.2 What Is Removed

All other ball-location inference is removed from the codebase:
- ❌ Fielder inference from direction (user taps the fielder directly)
- ❌ Depth classification (shallow/infield/outfield/deep)
- ❌ HR vs in-play determination from Y-coordinate
- ❌ Foul territory determination from X-coordinate
- ❌ Any threshold-based logic that derives play attributes from location

The user's explicit inputs (QuickBar result + fielder taps + catch type) provide all needed facts. Ball location is purely for spray chart analytics.

---

## 10. Fielding Data Model: CRITICAL FIXES

### 10.1 Player Identity — MUST Be Actual Player ID

**Current bug:** `eventLog.ts:537-540` — FieldingEvent.playerId NOTE says "may be position-based if lineup lookup unavailable."

**Fix:** playerId MUST always be the actual stable player ID resolved from the current lineup state at recording time. Lineup state is always available in `useGameState` (via `homeLineupStateRef` / `awayLineupStateRef`). There is no valid reason for position-based fallback.

### 10.2 Position Snapshot — Must Persist at Recording Time

When a fielding event is recorded, it must capture:
- `playerId`: stable player ID (from lineup state)
- `position`: the position the player was playing AT THAT MOMENT (from lineup state)

These values are **immutable once written**. If the player later changes position or is subbed out, the historical record is unaffected.

### 10.3 Throw Sequence Data Model

Each fielder tap in enhancement mode produces:
```typescript
interface ThrowSequenceEntry {
  playerId: string;         // Stable player ID from lineup
  position: Position;       // Position at this moment (SS, CF, etc.)
  sequenceIndex: number;    // 1st, 2nd, 3rd in chain
}
```

**Engine credit assignment:**
- Last entry in sequence = putout
- All previous entries = assists (in order)
- For DP: first = started, middle = turned, last = completed
- Single entry = unassisted putout

### 10.4 Position Innings — Track Per-Out, NOT Per-Half-Inning

**Current bug:** `useGameState.ts:5241-5257` increments position innings at end of half-inning for ALL fielders. If a player is subbed in mid-inning, they get credit for the entire half-inning. The player they replaced also already got credit.

**Fix:** Track on EACH OUT recorded:
1. On every out, identify which team was fielding
2. For each fielder on the field, increment their outs-at-position count by 1
3. Store: `Map<playerId, Record<position, outsPlayed>>`
4. Convert to innings: `innings = outsPlayed / 3`

**Implementation:** Hook into the out-recording path in useGameState (inside `recordOut`, `recordD3K`, wherever outs increment). On each out, snapshot which player is at which position from the current lineup state.

---

## 11. CRITICAL BUG FIX: Full Leverage Index Calculator

### 11.1 The Bug

`useGameState.ts` uses `getBaseOutLI()` (base-out lookup only) instead of `calculateLeverageIndex()` (full: base-out × inning multiplier × score dampener × walkoff boost).

The full calculator lives at `src/engines/leverageCalculator.ts:301-351` and needs: inning, isTop, outs, bases, homeScore, awayScore, totalInnings. All available in `gameState` at every call site.

### 11.2 Sites to Fix

| File | Line | Function | Current Call | Should Be |
|------|------|----------|-------------|-----------|
| useGameState.ts | ~3201 | recordResult | `getBaseOutLI(baseState, outs)` | `calculateLeverageIndex({inning, isTop, outs, bases, homeScore, awayScore, totalInnings})` |
| useGameState.ts | ~3505 | recordOut | `getBaseOutLI(baseState, outs)` | Same |
| useGameState.ts | ~3783 | recordWalk | `getBaseOutLI(baseState, outs)` | Same |
| useGameState.ts | ~3992 | recordStolenBase | `getBaseOutLI(baseState, outs)` | Same |
| useGameState.ts | ~4154 | recordPitchCount | `getBaseOutLI(baseState, outs)` | Same |

### 11.3 Impact

All LI values stored in AtBatEvent.leverageIndex and used for fame calculations (`fameMultiplier = √LI`) will become more accurate. This affects fame values, clutch detection, and any downstream metric that uses stored LI.

---

## 12. Scoreboard Components

### 12.1 Full Fenway Scoreboard — TO BE BUILT

Design spec exists at: `spec-docs/GAMETRACKER_FENWAY_SCOREBOARD_EXACT_LAYOUT.tsx` (453 lines)

This is the SMB4-style scoreboard with:
- All innings (1-10+) in columns
- R/H/E totals per team
- Team records (e.g., "45-38")
- "BALLPARK" header
- AT BAT / BALL / STRIKE / OUT display
- Concessions/sponsors text
- MINI toggle button

This needs to be built as an actual React component. Goes at the top of the screen layout.

### 12.2 FenwayBoard (Pitcher/Batter Context) — RETAIN

`src/src_figma/app/components/FenwayBoard.tsx` (317 lines) — currently active at GameTracker.tsx:3653.

Features to retain:
- Pitcher context card: name, hand, mojo, pitch count, IP, K, ERA, hits, BB, fitness
- Batter context card: name, hand, mojo, game stats (H-AB, avg, HR, RBI, BB, K), fitness
- Matchup card: batter vs pitcher record + milestone alerts
- Tappable pitcher name → pitching change
- Tappable batter name → player card

**These are TWO SEPARATE components** that coexist. The full Fenway scoreboard is the inning-by-inning linescore display. The FenwayBoard is the pitcher/batter context display. Both appear in the layout.

---

## 13. Screen Layout (iPad Horizontal)

```
┌──────────────────────────────────────────────────────────────────┐
│  Full Fenway Scoreboard (inning-by-inning linescore, R/H/E,     │
│  team records, B/S/O count, AT BAT info)                         │
│  + FenwayBoard (Pitcher/Batter context, matchup, beat reporter)  │
├───────────────────────────────┬──────────────────────────────────┤
│                               │                                  │
│  GameDiamond (stripped)       │  Play Log (scrollable)           │
│  - Field SVG                  │  - Tap play → enhancement mode   │
│  - Fielder icons (name,       │  - Enhancement panel inline      │
│    position, fWAR)            │    when play tapped               │
│  - Runner icons (full name)   │  - Runner outcomes shown         │
│  - Batter icon                │    immediately after QuickBar    │
│  - Mode indicator             │                                  │
│    (info vs enhancement)      │  QuickBar (always visible,       │
│                               │  right column or bottom)         │
├───────────────────────────────┤                                  │
│  [Lineup] button              │                                  │
│  → Popover overlay with       │                                  │
│    full lineup/roster mgmt    │                                  │
└───────────────────────────────┴──────────────────────────────────┘
```

**Key principles:**
- Diamond and play log **side by side** (wide iPad landscape)
- QuickBar always visible (primary input)
- Lineup management via popover overlay (not always on screen)
- Enhancement panel appears inline in play log when play is tapped
- Full Fenway Scoreboard at top (full width)
- Pitcher/batter context integrated with or below scoreboard

**Note:** This is a conceptual layout. Final visual design will be produced via Figma during the UI/UX redesign phase. The Codex task is to build the component architecture that supports this layout, not to pixel-match this diagram.

---

## 14. Code Removal Checklist

### 14.1 Files to DELETE

| File | Lines | Reason |
|------|-------|--------|
| `src/src_figma/app/components/EnhancedInteractiveField.tsx` | ~4,500 | Replaced by GameDiamond.tsx |

### 14.2 Code to REMOVE (within existing files)

| File | What to Remove | Reason |
|------|---------------|--------|
| `GameTracker.tsx:1407-2035` | `handleEnhancedPlayComplete()` — 14-step processing of PlayData from EIF | EIF is gone; plays come from QuickBar |
| `GameTracker.tsx:1563-1586` | RBI calculation (second source of truth) | Should only be in useGameState |
| `GameTracker.tsx:1747-1768` | Fielding event extraction from EIF PlayData | Fielding events built from enhancement mode data |
| `GameTracker.tsx:3728-3762` | EIF render block | Replaced by GameDiamond render |
| All EIF-related state in GameTracker.tsx | ~50 lines | State management for EIF flow |

### 14.3 Files to KEEP (extract from EIF if needed)

| File | Reason |
|------|--------|
| `FieldCanvas.tsx` | SVG field rendering — reused by GameDiamond |
| `FielderIcon.tsx` | Fielder icons — reused by GameDiamond (with modifications per Section 3.3) |
| `RunnerDragDrop.tsx` | Runner display — reuse icons (remove drag-and-drop) |
| `RunnerOutcomesDisplay.tsx` | Runner outcome adjustment — retain |
| `runnerDefaults.ts` | Default runner outcome calculation — retain |
| `QuickBar.tsx` | Primary input — retain as-is |
| `FenwayBoard.tsx` | Pitcher/batter context — retain |
| `fieldingEventExtractor.ts` | Will need rewriting for new data model but concepts reusable |

### 14.4 Orphaned Code to DELETE

| Code | Location | Evidence |
|------|----------|---------|
| HitTypeModal function | EIF:920-986 | State managed (line 1738) but never rendered in JSX |
| OutTypeModal function | EIF:995-1077 | State managed (line 1739) but never rendered in JSX |
| `calculateFame()` import in EIF | EIF:119 | Imported but never called |
| `calculateLeverageIndex()` calls in EIF | EIF:1948, 2094 | Redundant with useGameState; never persisted |
| `showHitTypeModal` / `showOutTypeModal` state + all handlers | EIF:1738-1739, 2381, 2565, 2568, 2840, 2849 | Dead state for never-rendered modals |
| WEB_GEM fame value in useGameState.ts:4326 | WEB_GEM=1.0 | BUG: spec says 0.75. Fix value. |

---

## 15. Implementation Priority

### Phase 1: Critical Bug Fixes (before any refactor)
1. **Full LI calculator** — Replace `getBaseOutLI()` with `calculateLeverageIndex()` at 5 sites (Section 11)
2. **WEB_GEM fame value** — Fix 1.0 → 0.75 at useGameState.ts:4326
3. **Position innings tracking** — Change from per-half-inning to per-out (Section 10.4)

### Phase 2: fWAR Pipeline
1. Add new catch types to `DIFFICULTY_MULTIPLIERS` (Section 7.2)
2. Wire System A (`calculateFWARFromPersistedEvents`) into warOrchestrator and useWARCalculations
3. Fix player identity in FieldingEvent (always actual playerId, never position code)
4. Fix adapter to filter by playerId not position (fwarCalculator.ts:684)

### Phase 3: Architecture Rebuild
1. Build `GameDiamond.tsx` (Section 3.2)
2. Implement two-mode diamond (info mode + enhancement mode)
3. Implement fielder tap → throw sequence with player ID + position snapshot
4. Implement catch type selection in enhancement mode
5. Implement special event enhancements (KP, NUT) in enhancement mode
6. Implement exit type enhancement for hits
7. Wire runner outcomes to show immediately after QuickBar tap (Option A)
8. Reclassify modifiers → enhancements per Section 8
9. Build Full Fenway Scoreboard from spec design file

### Phase 4: Cleanup
1. Delete EnhancedInteractiveField.tsx
2. Remove all EIF-related code from GameTracker.tsx
3. Remove System B fWAR (`calculateFWARFromStats`) from production paths
4. Remove all ball-location inference except spray sector label
5. Remove orphaned code per Section 14.4

### Phase 5: UI/UX (Figma-driven)
1. JK provides Figma prompts based on this architecture
2. Figma produces iPad horizontal layout design
3. Design source code uploaded for implementation
4. Final visual polish and integration

---

## 16. Files Referenced in This Memo

| File | Purpose | Key Lines |
|------|---------|-----------|
| `src/engines/fwarCalculator.ts` | fWAR calculator (System A + System B) | 80-90 (multipliers), 311 (calculateEventValue), 480 (calculateFWARFromStats), 625 (adapter), 671 (entry point) |
| `src/engines/leverageCalculator.ts` | Full LI calculator | 104-122 (BASE_OUT_LI), 196 (getBaseOutLI), 301-351 (calculateLeverageIndex) |
| `src/engines/wpaCalculator.ts` | Win Probability Added (separate from fWAR) | 1-60 (types and calculation) |
| `src/engines/fameEngine.ts` | Fame calculation engine (orphaned) | 318-344 (calculateFame — never called) |
| `src/utils/eventLog.ts` | Event log / IndexedDB persistence | 156-235 (AtBatEvent), 463-469 (BallInPlayData), 530-554 (FieldingEvent) |
| `src/src_figma/hooks/useGameState.ts` | Core game state hook (source of truth) | 538 (getDefaultRunnerOutcome), 658 (autoCorrectResult), 3201/3505/3783 (LI sites), 4319-4391 (fame), 5241-5257 (position innings) |
| `src/src_figma/app/pages/GameTracker.tsx` | Main UI page | 1407-2035 (handleEnhancedPlayComplete), 3653 (FenwayBoard), 3728-3762 (EIF render) |
| `src/src_figma/app/components/EnhancedInteractiveField.tsx` | TO BE DELETED | 920 (HitTypeModal), 995 (OutTypeModal), 1738-1739 (orphaned state), 1948 (redundant LI) |
| `src/src_figma/app/components/FenwayBoard.tsx` | Pitcher/batter context (retain) | 317 lines total |
| `src/src_figma/app/components/QuickBar.tsx` | Primary input (retain) | 170 lines total |
| `src/src_figma/app/components/RunnerOutcomesDisplay.tsx` | Runner outcome adjustment (retain) | 124 (destinations include OUT) |
| `src/src_figma/app/components/FielderIcon.tsx` | Fielder display (modify) | 31-35 (FielderData interface), 186-200 (display) |
| `src/src_figma/app/components/FieldCanvas.tsx` | SVG field rendering (retain) | Reused by GameDiamond |
| `src/src_figma/app/engines/warOrchestrator.ts` | WAR calculation orchestrator | 17 (imports), 222 (calls calculateFWARFromStats) |
| `src/hooks/useWARCalculations.ts` | WAR hook | 31 (imports calculateFWARFromStats) |
| `spec-docs/GAMETRACKER_FENWAY_SCOREBOARD_EXACT_LAYOUT.tsx` | Full Fenway scoreboard design spec | 453 lines, pixel-matched to SMB4 |
| `spec-docs/FIELDING_SYSTEM_SPEC.md` | Fielding system specification | Sections 1.1, 4, 11, 12, 19 |

---

*End of Decision Memo v3*
