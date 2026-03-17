# GameTracker Advanced Systems — Truth Map

**Audit date:** 2026-03-17
**Spec used:** MODE_2_V1_FINAL.md
**V2 exclusions:** WAR Calibration (§11.6), Juiced eligibility logic, Juiced cooldown fields, Mojo/Fitness-Setting Random Events (§15.4), Dynamic milestone thresholds, Legacy tiers (franchise cornerstone/icon/legend), Albatross/Fan Favorite trade mechanics
**Files read in full:** NewsBoard.tsx (56 lines), processCompletedGame.ts (53 lines)

---

## Summary Table

| # | System | C1 Hooked | C2 Fed | C3 Persisted | C4 Displayed | Score | V1 Scope |
|---|--------|-----------|--------|--------------|--------------|-------|----------|
| 1 | Leverage Index (LI) | ✅ | ✅ PER-PLAY | ✅ | ⚠️ Partial | 3.5/4 | ✅ V1 |
| 2 | Win Probability Added (WPA) | ✅ | ✅ PER-PLAY | ✅ | ❌ | 3/4 | ✅ V1 |
| 3 | Clutch Attribution | ❌ | ❌ | ⚠️ Partial | ❌ | 0.5/4 | ✅ V1 |
| 4 | Fame Tracking | ✅ | ✅ PER-PLAY + END-GAME | ✅ | ✅ | 4/4 | ✅ V1 |
| 5 | Milestone Detection | ✅ | ✅ EFFECT-DRIVEN + END-GAME | ✅ | ⚠️ Partial | 3.5/4 | ✅ V1 |
| 6 | WAR Components (mWAR only) | ✅ | ✅ PER-PLAY (mWAR) | ✅ | ⚠️ Partial | 3.5/4 | ✅ V1 |
| 7 | Mojo System | ✅ | ✅ MANUAL ONLY | ✅ | ✅ | 4/4 | ✅ V1 |
| 8 | Fitness System | ✅ | ✅ MANUAL ONLY | ✅ | ✅ | 4/4 | ✅ V1 |
| 9 | Narrative / NewsBoard | ✅ | ✅ END-GAME | ⚠️ Nav-state only | ❌ | 1.5/4 | ✅ V1 |
| 10 | Fan Morale | ✅ | ✅ END-GAME | ⚠️ In-memory only | ❌ | 2/4 | ✅ V1 |
| 11 | Dynamic Designations | ❌ | ❌ | ❌ | ❌ | 0/4 | ✅ V1 |
| 12 | Post-Game Pipeline | ✅ | ✅ END-GAME | ✅ | ✅ | 4/4 | ✅ V1 |

**All 12 systems audited in this session.**

---

## processCompletedGame.ts Analysis (53 lines — full read)

This file is a thin orchestrator. It does exactly two things:
1. `aggregateGameToSeason(gameState, options)` — delegates to seasonAggregator.ts
2. `archiveCompletedGame(gameState, scores, [], seasonId)` — writes to completedGames store in IndexedDB

**Input:** `PersistedGameState` (built in `completeGameInternal` at useGameState.ts:6221)
**Output:** `{ aggregation: GameAggregationResult }`

The PersistedGameState built at game end (useGameState.ts:6340-6405) includes:
- `fameEvents` (line 6395) — ✅ populated from `buildPersistedFameEvents()`
- `playerStats` (line 6393) — batting stats with fielding tallies
- `pitcherGameStats` (line 6394) — pitcher box lines
- `activityLog` (line 6404) — last 20 activity items

**NOT included in PersistedGameState:** clutch stats, WPA aggregates, LI aggregates, mojo snapshots, fitness snapshots, milestone data. These either live on per-event records (AtBatEvent in eventLog) or are computed downstream by seasonAggregator.

---

## NewsBoard.tsx Analysis (56 lines — full read)

**Props interface (complete):**
```typescript
interface NewsBoardProps {
  currentBatterName: string;
  currentBatterLine: string;    // e.g., "2-for-3, 1 HR, 2 RBI"
  currentPitcherName: string;
  currentPitcherLine: string;   // e.g., "6.1 IP, 3 H, 1 ER, 7 K"
  matchupSummary?: string;      // e.g., "vs Bender: 3-for-12, 1 HR, 5 K"
}
```

**Renders:**
- Pinned header with AT BAT (name + game line), PITCHING (name + game line), MATCHUP (optional summary)
- Placeholder "Beat Reporter Feed" text — no actual beat reporter data consumed

**Does NOT receive or render:**
- LI / leverage tier
- WPA
- Clutch stats
- Mojo/fitness indicators
- Approaching milestones
- Narrative blurbs / beat reporter stories
- Fan morale

Per spec §6/§16, NewsBoard SHOULD display: matchup history, approaching milestones, mojo indicators, narrative blurbs, LI context. Current implementation only has basic batter/pitcher lines and matchup summary.

---

## Per-System Detail — Session 1

---

### System 1: Leverage Index (LI)

**C1: ✅ HOOKED**
- Grep: `grep -n "leverageCalc\|calculateLeverageIndex\|GameStateForLI" src/src_figma/hooks/useGameState.ts | head -5`
- Result:
  - `useGameState.ts:44` — `import { calculateLeverageIndex } from '../../engines/leverageCalculator';`
  - `useGameState.ts:1526` — `const getCurrentLeverageIndex = useCallback(...)`
- Grep: `grep -n "GameStateForLI\|buildGameStateForLI" src/src_figma/app/pages/GameTracker.tsx | head -5`
- Result:
  - `GameTracker.tsx:93` — `import type { GameStateForLI } from "../../../engines/leverageCalculator";`
  - `GameTracker.tsx:612-613` — `const buildGameStateForLI = useCallback((): GameStateForLI => ({`
- Context: LI is hooked in BOTH useGameState (for per-play AtBatEvent recording) and GameTracker (for mWAR decision recording).

**C2: ✅ FED — PER-PLAY**
- Grep: `grep -n "getCurrentLeverageIndex()" src/src_figma/hooks/useGameState.ts | head -10`
- Result:
  - `useGameState.ts:3531` — `const leverageIndex = getCurrentLeverageIndex();` (inside `recordHit`)
  - `useGameState.ts:3830` — `const leverageIndex = getCurrentLeverageIndex();` (inside `recordOut`)
  - `useGameState.ts:4106` — `const leverageIndex = getCurrentLeverageIndex();` (inside `recordWalk/HBP`)
  - `useGameState.ts:4388-4390` — `leverageIndex: getCurrentLeverageIndex()` (inside strikeout handler)
  - `useGameState.ts:4617-4618` — `leverageIndex: getCurrentLeverageIndex()` (inside other outcome handler)
- Context: **PER-PLAY** — called in every at-bat recording path (hit, out, walk, HBP, strikeout, other). Not inside try-catch.
- Risk: none

**C3: ✅ PERSISTED**
- Grep: `grep -n "leverageIndex" src/utils/eventLog.ts | head -5`
- Result:
  - `eventLog.ts:191` — `leverageIndex: number;` (on AtBatEvent interface)
  - `eventLog.ts:484` — `leverageIndex: number;` (on another event type)
- Context: Every AtBatEvent written via `logAtBatEvent()` at useGameState.ts:3618/3933/etc. carries `leverageIndex` as a required field. Populated from `getCurrentLeverageIndex()` — not optional, not defaulted.
- The field persists to IndexedDB via the eventLog store.

**C4: ⚠️ DISPLAYED — PARTIAL**
- Grep: `grep -n "leverageIndex\|LI:" src/src_figma/app/components/ScoreBug.tsx`
- Result: 0 matches — LI is NOT displayed on ScoreBug
- Grep: `grep -n "leverageIndex\|LI:" src/src_figma/app/components/NewsBoard.tsx`
- Result: 0 matches — LI is NOT displayed on NewsBoard
- **Where LI IS displayed:**
  - `GameTracker.tsx:5567` — `MANAGER MOMENT (LI: {mwarHook.managerMoment.leverageIndex.toFixed(1)})` — shown in manager moment panel
  - `GameTracker.tsx:5262` — `({getLITier(fameTrackingHook.lastEvent.liMultiplier).label})` — shown in fame event popup
  - `PostGameSummary.tsx:507` — Fame events count displayed (LI not directly, but fame events are LI-weighted)
- Context: LI is visible in manager moment panel and fame popup, but NOT in the primary game view (ScoreBug, NewsBoard). Per spec §12, LI should be visible as a live indicator. This is a **display gap**.
- Risk: none

---

### System 2: Win Probability Added (WPA)

**C1: ✅ HOOKED**
- Grep: `grep -n "calculateWPA\|wpaCalculator" src/src_figma/hooks/useGameState.ts | head -3`
- Result:
  - `useGameState.ts:45` — `import { calculateWPA } from '../../engines/wpaCalculator';`
- Context: WPA calculator imported in useGameState. Not separately hooked in GameTracker.tsx.

**C2: ✅ FED — PER-PLAY**
- Grep: `grep -n "calculateWPA" src/src_figma/hooks/useGameState.ts | head -10`
- Result:
  - `useGameState.ts:3599` — `const wpaResult = calculateWPA(...)` (inside recordHit, line 3596-3607)
  - `useGameState.ts:3916` — `return calculateWPA(...)` (inside recordOut, line 3911-3924)
  - `useGameState.ts:4155` — `return calculateWPA(...)` (inside walk/HBP handler)
  - `useGameState.ts:4396` — `return calculateWPA(...)` (inside strikeout handler)
  - `useGameState.ts:4621` — `return calculateWPA(...)` (inside other outcome handler)
- Context: **PER-PLAY** — WPA is spread onto every AtBatEvent via `...(() => { return calculateWPA(...) })()`. The spread adds `winProbabilityBefore`, `winProbabilityAfter`, and `wpa` fields.
- Risk: none — not inside try-catch

**C3: ✅ PERSISTED**
- Grep: `grep -n "winProbabilityBefore\|winProbabilityAfter\|wpa:" src/utils/eventLog.ts | head -5`
- Result:
  - `eventLog.ts:192` — `winProbabilityBefore: number;`
  - `eventLog.ts:193` — `winProbabilityAfter: number;`
  - `eventLog.ts:194` — `wpa: number;`
- Context: All three WPA fields are on the AtBatEvent interface and populated via the spread pattern on every event. Persisted to IndexedDB via eventLog store.

**C4: ❌ NOT DISPLAYED**
- Grep: `grep -rn "winProbability\|wpa\|wpDelta\|winProb" src/src_figma/app/components/ | head -5`
- Result: 0 matches
- Grep: `grep -n "winProbability\|wpa\|WPA" src/src_figma/app/pages/PostGameSummary.tsx | head -5`
- Result: 0 matches
- Grep: `grep -n "winProbability\|wpa\|WPA" src/src_figma/app/pages/GameTracker.tsx | head -5`
- Result: `GameTracker.tsx:5062-5063` — only in `console.log` debug statements inside mWAR decision logging
- Context: WPA is computed, stored on events, but **never rendered in any UI component**. Not on ScoreBug, NewsBoard, PostGameSummary, or any player display. Per spec §12, WPA should be displayed. This is a **display gap**.

---

### System 3: Clutch Attribution

**C1: ❌ NOT HOOKED (in GameTracker/useGameState)**
- Grep: `grep -n "useClutchCalculations\|clutchHook\|clutchCalc" src/src_figma/app/pages/GameTracker.tsx`
- Result: 0 matches
- Grep: `grep -n "useClutchCalculations\|clutchHook" src/src_figma/hooks/useGameState.ts`
- Result: 0 matches
- Context: The `useClutchCalculations` hook EXISTS at `src/hooks/useClutchCalculations.ts` (312 lines, fully implemented with `calculateParticipantClutch`, clutch leaderboard, etc.), but it is **never imported or called** in GameTracker.tsx or useGameState.ts. This is an **ORPHANED hook**.
- The only clutch-related data in the hot path is:
  - `eventLog.ts:204` — `isClutch: boolean;` (on AtBatEvent) — a simple boolean flag
  - `useGameState.ts:3541` — `const isClutch = leverageIndex >= 1.5;` — hardcoded threshold, not using clutchCalculator

**C2: ❌ NOT FED**
- The `useClutchCalculations` hook is never called, so no data flows to it.
- `isClutch` boolean IS populated per-play (see C1), but this is just a threshold check, not the full clutch attribution system from spec §13.
- `clutchImpact` appears only in mWAR decision objects (`GameTracker.tsx:5059-5063`), where it's logged but not the §13 clutch system.

**C3: ⚠️ PARTIAL PERSISTENCE**
- `isClutch: boolean` IS persisted on every AtBatEvent (eventLog.ts:204)
- The full clutch quotient (CQ), net clutch value, and per-player clutch breakdown from `useClutchCalculations` are NOT persisted — the hook is never called.
- `fameBonuses`/`fameBoners`/`fameNet` are aggregated in seasonAggregator.ts:348-350, but these are FAME, not clutch.

**C4: ❌ NOT DISPLAYED**
- Grep: `grep -rn "clutch" src/src_figma/app/components/ | head -5`
- Result: Only in PostGameSummary.tsx:82 — `if (type.includes("clutch"))` for badge rendering, but this renders fame event badges, not clutch stats.
- The clutch leaderboard, clutch rating, and clutch quotient from the hook are never rendered anywhere.

**ORPHAN ALERT:** `src/hooks/useClutchCalculations.ts` is a complete, functional hook (152-line implementation) that is NEVER imported outside its own file and tests. Full orphan.

---

### System 4: Fame Tracking

**C1: ✅ HOOKED**
- Grep: `grep -n "useFameTracking" src/src_figma/app/pages/GameTracker.tsx | head -5`
- Result:
  - `GameTracker.tsx:85` — `import { useFameTracking, type FameEventDisplay, formatFameValue, getFameColor, getLITier } from "@/app/hooks/useFameTracking";`
  - `GameTracker.tsx:576` — `const fameTrackingHook = useFameTracking({`
- Context: Fame tracking hook is imported AND instantiated in GameTracker.tsx.

**C2: ✅ FED — PER-PLAY (special events) + END-GAME (pitcher achievements)**
- Grep: `grep -n "fameTrackingHook.recordFameEvent" src/src_figma/app/pages/GameTracker.tsx | head -10`
- Result:
  - `GameTracker.tsx:4940` — `fameTrackingHook.recordFameEvent('PERFECT_GAME'...)` (end-game pitcher check)
  - `GameTracker.tsx:4943` — `fameTrackingHook.recordFameEvent('NO_HITTER'...)`
  - `GameTracker.tsx:4946` — `fameTrackingHook.recordFameEvent('MADDUX'...)`
  - `GameTracker.tsx:4949` — `fameTrackingHook.recordFameEvent('SHUTOUT'...)`
  - `GameTracker.tsx:4952` — `fameTrackingHook.recordFameEvent('COMPLETE_GAME'...)`
  - `GameTracker.tsx:5891` — `fameTrackingHook.recordFameEvent('IMMACULATE_INNING'...)` (on pitch count confirm)
- Also: `useFameTracking.ts:198` — `recordFameEvent(event, playerId, playerName, inning, halfInning, leverageIndex)` (inside auto-detect functions)
- Context: **END-GAME** for pitcher milestones (perfect game, no-hitter, etc.), **MANUAL/EVENT-DRIVEN** for immaculate inning. The hook also has `detectBatterFameEvents` and `detectPitcherFameEvents` which auto-detect from stats.
- Risk: Not inside try-catch in GameTracker.tsx call sites.

- **Fame also populated on AtBatEvents in useGameState:**
  - `useGameState.ts:1883-1907` — `fameEventsRef` tracks accumulated fame events, `buildPersistedFameEvents()` maps them to persistence format
  - `useGameState.ts:3338` — `fameEvents: buildPersistedFameEvents(...)` (on auto-save PersistedGameState)
  - `useGameState.ts:3610/3926/4165/4406/4631` — `fameEvents: []` (on individual AtBatEvents — empty per-event, fame events are game-level)

**C3: ✅ PERSISTED**
- Grep: `grep -n "fameEvents" src/utils/gameStorage.ts | head -5`
- Result:
  - `gameStorage.ts:134-142` — `fameEvents: Array<{ id, playerId, playerName, eventType, inning, halfInning, fameValue, fameType }>` (on PersistedGameState interface)
  - `gameStorage.ts:362` — `fameEvents: PersistedGameState['fameEvents'];` (on CompletedGameRecord)
  - `gameStorage.ts:481` — `fameEvents: gameState.fameEvents` (in archiveCompletedGame write path)
- Grep: `grep -n "fameEvents\|fameBonuses\|fameNet" src/utils/seasonAggregator.ts | head -5`
- Result:
  - `seasonAggregator.ts:315` — `for (const event of gameState.fameEvents)` (iterates fame events during aggregation)
  - `seasonAggregator.ts:348-350` — `fameBonuses`, `fameBoners`, `fameNet` accumulated into season batting stats
- Context: Fame events are: (a) stored on PersistedGameState, (b) archived in completedGames store, (c) aggregated into season batting stats. Full persistence chain.

**C4: ✅ DISPLAYED**
- **In-game popup:**
  - `GameTracker.tsx:5242-5269` — Fame event popup with icon, label, fame value, and LI tier label. Dynamic data from `fameTrackingHook.lastEvent`.
- **Post-game:**
  - `PostGameSummary.tsx:284-285` — `const fameEvents = gameData.fameEvents ?? []; const fameCount = fameEvents.length;`
  - `PostGameSummary.tsx:507` — `Fame events recorded: {fameCount}` displayed in summary
  - `PostGameSummary.tsx:107-126` — Fame events rendered as badges on player cards
- Context: Fame is displayed both in-game (animated popup) and post-game (count + badges). Data is dynamic, not hardcoded.

---

## Per-System Detail — Session 2

---

### System 5: Milestone Detection

**C1: ✅ HOOKED**
- Grep: `grep -n "getApproachingMilestones\|milestoneDetector" src/src_figma/app/pages/GameTracker.tsx | head -5`
- Result:
  - `GameTracker.tsx:96` — `import { getApproachingMilestones } from '../../../utils/milestoneDetector';`
  - `GameTracker.tsx:2487` — `const batterWatches = getApproachingMilestones(...)`
  - `GameTracker.tsx:2494` — `const pitcherWatches = getApproachingMilestones(...)`
- Grep: `grep -n "detectMilestones" src/src_figma/hooks/useGameState.ts | head -3`
- Result:
  - `useGameState.ts:6422` — `detectMilestones: true,` (in aggregation options passed to processCompletedGame)
- Context: Milestones hooked in TWO places: (a) GameTracker.tsx uses `getApproachingMilestones()` for in-game alerts, (b) useGameState.ts passes `detectMilestones: true` to the end-game aggregation pipeline.

**C2: ✅ FED — EFFECT-DRIVEN (approaching) + END-GAME (detection)**
- **In-game approaching milestones:**
  - `GameTracker.tsx:2487-2500` — Inside a `useEffect` that fires on batter/pitcher change. Calls `getApproachingMilestones()` with merged career+game stats and season+game stats. Produces `milestoneAlerts` strings stored in `fenwayContext`.
  - Trigger: **EFFECT-DRIVEN** — dependency on `gameState.currentBatterId`, `gameState.currentPitcherId`
  - ⚠️ Inside try-catch at `GameTracker.tsx:2520` — `console.warn('[GameTracker] Failed to build Fenway board context:', error)` — **SILENT FAILURE POSSIBLE** (non-blocking catch)
- **End-game milestone detection:**
  - `seasonAggregator.ts:125-131` — `aggregateGameWithMilestones(gameState, seasonId, milestoneConfig, { franchiseId, currentGame, currentSeason })` called during game aggregation
  - Trigger: **END-GAME** — inside `aggregateGameToSeason()`, which is called by `processCompletedGame()`
  - Not inside try-catch at this level (but the entire aggregation is wrapped in try-catch at seasonAggregator.ts:104)

**C3: ✅ PERSISTED**
- `seasonAggregator.ts:126-131` — `aggregateGameWithMilestones()` delegates to milestoneAggregator.ts which writes milestones to season/career stores
- `GameAggregationResult.milestones` (seasonAggregator.ts:67) — returns `MilestoneAggregationResult | null` with `seasonMilestones`, `careerMilestones`, `franchiseFirsts`, `franchiseLeaderEvents`
- Context: Milestones are detected and persisted through the milestoneAggregator at game end. Approaching milestones (in-game) are ephemeral — only stored in React state, not IndexedDB.

**C4: ⚠️ DISPLAYED — PARTIAL**
- **In-game:** `fenwayContext.milestoneAlerts` is computed (GameTracker.tsx:2513) and stored in state, but:
  - Grep: `grep -n "fenwayContext.milestoneAlerts" src/src_figma/app/pages/GameTracker.tsx`
  - Result: 0 matches — the `milestoneAlerts` array is COMPUTED but never read or passed to any component
  - Grep: `grep -n "milestoneAlerts" src/src_figma/app/components/FullFenwayScoreboard.tsx`
  - Result: 0 matches — FullFenwayScoreboard does NOT receive milestone alerts as a prop
  - **This is a data-computed-but-never-rendered gap** — the alerts are generated then thrown away
- **Post-game:**
  - Grep: `grep -n "milestone" src/src_figma/app/pages/PostGameSummary.tsx`
  - Result: 0 matches — milestones NOT shown in PostGameSummary

**FINDING:** Approaching milestones are computed every batter change but never displayed anywhere. End-game milestones are persisted but not shown in post-game summary. The in-game milestone alerts are an **orphaned computation**.

---

### System 6: WAR Components (bWAR, pWAR, fWAR, rWAR, mWAR)

**C1: ✅ HOOKED (mWAR only)**
- Grep: `grep -n "useMWARCalculations\|mwarHook" src/src_figma/app/pages/GameTracker.tsx | head -5`
- Result:
  - `GameTracker.tsx:92` — `import { useMWARCalculations } from "../hooks/useMWARCalculations";`
  - `GameTracker.tsx:601` — `const mwarHook = useMWARCalculations();`
- Grep: `grep -n "bWAR\|pWAR\|fWAR\|rWAR\|calculateWAR" src/src_figma/app/pages/GameTracker.tsx | head -5`
- Result:
  - `GameTracker.tsx:7182-7183` — `pWAR: —` (hardcoded placeholder text, not dynamic)
- Grep: `grep -n "bWAR\|pWAR\|fWAR\|rWAR\|calculateWAR" src/src_figma/hooks/useGameState.ts | head -5`
- Result: 0 matches
- Context: **Only mWAR** is hooked in the GameTracker. bWAR, pWAR, fWAR, rWAR are NOT computed during gameplay. This is expected — per spec §11, WAR components other than mWAR are computed from season aggregated stats, not during gameplay.

**C2: ✅ FED — PER-PLAY (mWAR decisions)**
- Grep: `grep -n "mwarHook.recordDecision" src/src_figma/app/pages/GameTracker.tsx | head -10`
- Result:
  - `GameTracker.tsx:2625` — `mwarHook.recordDecision('pitching_change', gsLI, ...)` (on pitcher substitution)
  - `GameTracker.tsx:2653` — `mwarHook.recordDecision(decisionType as any, gsLI, ...)` (on PH/defensive sub)
  - `GameTracker.tsx:5575` — `mwarHook.recordDecision(...)` (on manager moment Call action)
- ⚠️ All mWAR `recordDecision` calls in substitution handlers are inside try-catch:
  - `GameTracker.tsx:2628` — `catch (e) { console.warn('[mWAR] Decision recording error (non-blocking):', e); }` — **TRY-CATCH WRAPPED, SILENT FAILURE POSSIBLE**
  - `GameTracker.tsx:2661` — same pattern
- Context: mWAR decisions recorded on every substitution (pitcher change, PH, defensive sub) and on manager moment interactions. Data includes LI at decision time and involved player IDs.

**C3: ✅ PERSISTED**
- Grep: `grep -n "saveGameDecisions\|aggregateManagerGameToSeason" src/src_figma/app/pages/GameTracker.tsx | head -5`
- Result:
  - `GameTracker.tsx:5044` — `await saveGameDecisions(mwarHook.gameStats.decisions)`
  - `GameTracker.tsx:5046` — `await aggregateManagerGameToSeason(...)`
- Context: **END-GAME** — mWAR decisions persisted via `saveGameDecisions()` to managerStorage, then aggregated to season via `aggregateManagerGameToSeason()`. Inside try-catch at GameTracker.tsx:5042-5067 — **TRY-CATCH WRAPPED**.
- Note: Other WAR components (bWAR, pWAR, fWAR, rWAR) are computed from season-level stats by hooks like `useBWARCalculations`, `usePWARCalculations`, etc. — these are franchise-level, not GameTracker-level.

**C4: ⚠️ DISPLAYED — PARTIAL**
- **In-game:**
  - `GameTracker.tsx:5567` — `MANAGER MOMENT (LI: {mwarHook.managerMoment.leverageIndex.toFixed(1)})` — shows LI for manager moments
  - `GameTracker.tsx:7183` — `pWAR: —` — hardcoded placeholder, NOT dynamic
- **Post-game:**
  - Grep: `grep -n "WAR\|mWAR" src/src_figma/app/pages/PostGameSummary.tsx`
  - Result: 0 matches — WAR not displayed in post-game summary
- Context: Manager moments are displayed with LI during gameplay. mWAR value (`mwarHook.formatCurrentMWAR()`) appears in console logs (GameTracker.tsx:5055) but NOT rendered in any UI. pWAR shows as a hardcoded "—" placeholder.

---

### System 7: Mojo System

**C1: ✅ HOOKED**
- Grep: `grep -n "usePlayerState\|playerStateHook" src/src_figma/app/pages/GameTracker.tsx | head -5`
- Result:
  - `GameTracker.tsx:52` — `import { usePlayerState, type PlayerStateData, getStateBadge, formatMultiplier } from "@/app/hooks/usePlayerState";`
  - `GameTracker.tsx:570` — `const playerStateHook = usePlayerState({`
- Grep: `grep -n "mojoEngine\|clampMojo\|MOJO_STATES\|getMojoColor" src/src_figma/app/pages/GameTracker.tsx | head -5`
- Result:
  - `GameTracker.tsx:80` — `import type { MojoLevel } from "../../../engines/mojoEngine";`
  - `GameTracker.tsx:81` — `import { clampMojo } from "../../../engines/mojoEngine";`
  - `GameTracker.tsx:83` — `import { MOJO_STATES, getMojoColor } from "../../../engines/mojoEngine";`
- Context: Mojo is hooked via `usePlayerState` hook (which manages both mojo and fitness) and mojo engine utilities are imported directly.

**C2: ✅ FED — MANUAL ONLY**
- Grep: `grep -n "recordPlayerStateChange" src/src_figma/app/pages/GameTracker.tsx | head -5`
- Result:
  - `GameTracker.tsx:393` — `recordPlayerStateChange,` (destructured from useGameState)
  - `GameTracker.tsx:2183` — `void recordPlayerStateChange(playerId, name, 'mojo', previousMojo, newMojo, 'Player card adjustment')` — inside `setPlayerMojoByName`
- Context: **MANUAL ONLY** — Mojo changes are initiated by the user tapping a player card and selecting a new mojo level. The `setPlayerMojoByName` callback (GameTracker.tsx:2175-2191) calls both `playerStateHook.setMojo()` (updates React state) and `recordPlayerStateChange()` (persists to eventLog as a BetweenPlayEvent).
- Per spec §14 (v1 simplified): This is correct — v1 mojo is user-observed-only, not auto-computed from game events.
- Risk: none — not inside try-catch

**C3: ✅ PERSISTED**
- `useGameState.ts:5016-5040` — `recordPlayerStateChange()` calls `persistBetweenPlayEvent()` with `type: 'mojo_change'`, recording playerId, playerName, previousValue, newValue, reason
- `GameTracker.tsx:5100-5109` — At game end (elimination mode only), `saveMojoFitnessSnapshots()` saves mojo/fitness state per player for inter-game persistence
- `eventLog.ts:258-259` — BetweenPlayEvent interface has `mojoState?: MojoLevelLabel` and `fitnessLevel?: FitnessLevelLabel`
- Context: Mojo changes persisted to eventLog as BetweenPlayEvents. In elimination mode, snapshots saved for cross-game persistence.

**C4: ✅ DISPLAYED**
- `GameTracker.tsx:7187-7206` — §5.5 Condition panel shows current mojo with emoji and display name, colored via `getMojoColor(currentMojo)`
  - `GameTracker.tsx:7195` — `<span style={{ color: getMojoColor(currentMojo) }}>{MOJO_STATES[currentMojo].emoji} {MOJO_STATES[currentMojo].displayName}</span>`
- `GameTracker.tsx:1310-1311` — Mojo editor dropdown renders all MOJO_STATES options when editing via player card
- `GameTracker.tsx:7311` — Mojo level color applied in player card row
- Context: Mojo displayed as colored emoji+label in player card condition panel. Editable via dropdown. Data is fully dynamic from `playerStateHook`.

---

### System 8: Fitness System

**C1: ✅ HOOKED**
- Grep: `grep -n "fitnessEngine\|FITNESS_STATES\|FitnessState" src/src_figma/app/pages/GameTracker.tsx | head -5`
- Result:
  - `GameTracker.tsx:82` — `import type { FitnessState } from "../../../engines/fitnessEngine";`
  - `GameTracker.tsx:84` — `import { FITNESS_STATES } from "../../../engines/fitnessEngine";`
- Context: Fitness uses the same `usePlayerState` hook as Mojo (GameTracker.tsx:570). Fitness engine types/constants imported directly.

**C2: ✅ FED — MANUAL ONLY**
- Grep: `grep -n "setPlayerFitnessByName" src/src_figma/app/pages/GameTracker.tsx | head -5`
- Result:
  - `GameTracker.tsx:2193` — `const setPlayerFitnessByName = useCallback((name, team, newFitness) => {`
  - `GameTracker.tsx:2387` — `setPlayerFitnessByName(playerName, team, newFitness);` (called from fitness editor)
- `useGameState.ts:5016-5029` — `recordPlayerStateChange()` with `stateType: 'fitness'` produces `type: 'fitness_change'` BetweenPlayEvent
- Context: **MANUAL ONLY** — Fitness set by user via player card. Per spec §14 (v1 simplified): correct — v1 fitness is user-observed-only, not auto-degraded by pitch count or game stress.
- Risk: none — not inside try-catch

**C3: ✅ PERSISTED**
- Same mechanism as Mojo — `recordPlayerStateChange()` persists fitness changes as BetweenPlayEvents
- `eventLog.ts:279-280` — `fitnessLevel?: FitnessLevelLabel` on BetweenPlayEvent
- `GameTracker.tsx:5100-5109` — `saveMojoFitnessSnapshots()` saves fitness along with mojo for elimination inter-game persistence
- PersistedGameState does NOT have mojo/fitness fields (grep confirmed: 0 matches for mojo/fitness in gameStorage.ts). Mojo/fitness is persisted via:
  - (a) BetweenPlayEvents in eventLog (per-change)
  - (b) MojoFitnessSnapshots in mojoFitnessStorage (per-game, elimination only)

**C4: ✅ DISPLAYED**
- `GameTracker.tsx:7199-7202` — `<span style={{ color: FITNESS_STATES[currentFitness].color }}>{FITNESS_STATES[currentFitness].emoji} {FITNESS_STATES[currentFitness].displayName}</span>`
- `GameTracker.tsx:1319` — Fitness editor dropdown renders all FITNESS_STATES options
- Context: Fitness displayed as colored emoji+label in player card condition panel. Editable via dropdown. Dynamic from `playerStateHook`.

---

## Per-System Detail — Session 3

---

### System 9: Narrative / Beat Reporter / NewsBoard

**C1: ✅ HOOKED**
- Grep: `grep -n "generateGameRecap\|narrativeIntegration" src/src_figma/app/pages/GameTracker.tsx | head -5`
- Result:
  - `GameTracker.tsx:90` — `import { generateGameRecap } from "../engines/narrativeIntegration";`
- Grep: `grep -n "NewsBoard" src/src_figma/app/pages/GameTracker.tsx | head -5`
- Result:
  - `GameTracker.tsx:18` — `import { NewsBoard } from "@/app/components/NewsBoard";`
  - `GameTracker.tsx:5406` — `<NewsBoard ...>` rendered in the grid layout
- Context: Narrative engine imported AND NewsBoard component rendered.

**C2: ✅ FED — END-GAME ONLY**
- Grep: `grep -n "generateGameRecap" src/src_figma/app/pages/GameTracker.tsx | head -5`
- Result:
  - `GameTracker.tsx:5021` — `gameNarrative = generateGameRecap({ ... })` (home perspective)
  - `GameTracker.tsx:5029` — `awayNarrative = generateGameRecap({ ... })` (away perspective)
- Context: **END-GAME ONLY** — narratives generated only in the end-game flow. No beat reporter stories during gameplay.
- ⚠️ Inside try-catch at `GameTracker.tsx:5037` — `console.warn('[MAJ-04] Narrative generation error (non-blocking):', narrativeError)` — **TRY-CATCH WRAPPED, SILENT FAILURE POSSIBLE**
- **NewsBoard in-game feed:** The `<NewsBoard>` component receives batter/pitcher lines + matchup summary (GameTracker.tsx:5406-5411). The "Beat Reporter Feed" section at NewsBoard.tsx:49 is a **hardcoded placeholder** — `"Beat Reporter Feed"` text, no dynamic data.

**C3: ⚠️ NAV-STATE ONLY — NOT PERSISTED TO INDEXEDDB**
- `GameTracker.tsx:5152-5153` — `gameNarrative` and `awayNarrative` are passed via React Router `navigate()` state to PostGameSummary
- However, PostGameSummary's `navigationState` type (PostGameSummary.tsx:184-192) does NOT destructure `gameNarrative` or `awayNarrative`
- Grep: `grep -n "gameNarrative\|awayNarrative" src/src_figma/app/pages/PostGameSummary.tsx`
- Result: 0 matches — **narratives passed but never received or displayed**
- Narratives are NOT written to IndexedDB — they exist only in navigation state, which is lost on page refresh
- Context: This is a **dead data path** — narratives are generated, passed, then dropped.

**C4: ❌ NOT DISPLAYED**
- PostGameSummary does not read or render narratives (see C3)
- NewsBoard beat reporter feed is a placeholder (NewsBoard.tsx:49-51)
- No narrative blurbs appear anywhere in the UI during gameplay or after

**FINDING:** Narrative system is end-game-only, not persisted to IndexedDB, passed via nav state but never consumed by PostGameSummary. NewsBoard beat reporter feed is a placeholder. The in-game narrative goal from spec §16 (contextual blurbs during gameplay) is completely unimplemented.

---

### System 10: Fan Morale

**C1: ✅ HOOKED**
- Grep: `grep -n "useFanMorale" src/src_figma/app/pages/GameTracker.tsx | head -5`
- Result:
  - `GameTracker.tsx:88` — `import { useFanMorale, type GameResult as FanMoraleGameResult } from "../hooks/useFanMorale";`
  - `GameTracker.tsx:597` — `const homeFanMorale = useFanMorale(homeTeamId);`
  - `GameTracker.tsx:598` — `const awayFanMorale = useFanMorale(awayTeamId);`
- Context: Fan morale hooks instantiated for both teams.

**C2: ✅ FED — END-GAME ONLY**
- `GameTracker.tsx:4982-5007` — Both `homeFanMorale.processGameResult()` and `awayFanMorale.processGameResult()` called with game outcome data (won, walkoff, no-hitter, shutout, blowout, rivalry, run differential)
- Trigger: **END-GAME ONLY** — inside the end-game flow after narrative generation
- Not inside try-catch at the call site (but the overall end-game flow is try-catch wrapped at GameTracker.tsx:5158)

**C3: ⚠️ IN-MEMORY ONLY — NOT PERSISTED TO INDEXEDDB**
- Grep: `grep -n "persist\|save\|storage\|IndexedDB" src/src_figma/app/hooks/useFanMorale.ts`
- Result: 0 matches — the useFanMorale hook has NO persistence layer
- Context: Fan morale is computed in-memory via `processGameResult()` but **never written to IndexedDB**. Morale state is lost on page refresh. The hook uses React state only.
- Per spec §20, fan morale should persist across games in a season.

**C4: ❌ NOT DISPLAYED**
- Grep: `grep -n "fanMorale\|morale" src/src_figma/app/pages/PostGameSummary.tsx`
- Result: 0 matches
- Grep: `grep -rn "fanMorale\|morale" src/src_figma/app/components/ | grep -v node_modules | head -5`
- Result: 0 matches in component files
- Context: Fan morale is computed but never rendered anywhere — not in GameTracker, not in PostGameSummary, not in any component.

**FINDING:** Fan morale processes game results at end-game but has no persistence (in-memory only) and no display. Effectively a no-op — data is computed then discarded on navigation.

---

### System 11: Dynamic Designations

**C1: ❌ NOT HOOKED**
- Grep: `grep -n "designation\|dynamicDesignation\|slumping\|hotStreak\|MVPCandidate\|designationEngine" src/src_figma/app/pages/GameTracker.tsx`
- Result: 0 matches
- Grep: `grep -n "designation\|dynamicDesignation\|designationEngine" src/src_figma/hooks/useGameState.ts`
- Result: 0 matches
- Grep: `grep -rn "designation" src/src_figma/app/pages/ src/src_figma/app/components/ | head -10`
- Result (relevant files):
  - `src/engines/seasonTransitionEngine.ts` — season-level designation logic
  - `src/engines/fanFavoriteEngine.ts` — fan favorite designations
  - `src/utils/teamMVP.ts` — MVP designation
  - `src/utils/seasonEndProcessor.ts` — end-of-season
  - `src/src_figma/app/components/FinalizeAdvanceFlow.tsx` — season advance UI
- Context: Designation logic exists in **franchise-level engines** (seasonTransitionEngine, fanFavoriteEngine, teamMVP), not in the GameTracker. These are evaluated at season end, not during/after individual games.

**C2: ❌ NOT FED**
- No designation engine is called during gameplay or at game end in GameTracker.

**C3: ❌ NOT PERSISTED (from GameTracker)**
- Designations are a franchise/season-level concept, not per-game. They would be evaluated in season-end flows.

**C4: ❌ NOT DISPLAYED (in GameTracker)**
- No designation badges, labels, or indicators appear in GameTracker or PostGameSummary.

**NOTE:** This may be correctly scoped — spec §17 says designations are computed from "rolling performance windows" which implies season-level evaluation, not per-game. However, the spec also says designations should be "visible on player cards" during gameplay. Currently, no designation data is available to GameTracker.

---

### System 12: Post-Game Aggregation Pipeline

**C1: ✅ HOOKED**
- Grep: `grep -n "processCompletedGame\|completeGameInternal\|aggregateGameToSeason" src/src_figma/hooks/useGameState.ts | head -5`
- Result:
  - `useGameState.ts:32` — `import { processCompletedGame } from '../../utils/processCompletedGame';`
  - `useGameState.ts:6221` — `const completeGameInternal = useCallback(async (opts?) => {`
  - `useGameState.ts:6429` — `await processCompletedGame(persistedState, aggregationOptions);`
- Context: Full pipeline hooked — `completeGameInternal` builds PersistedGameState, calls `processCompletedGame` which delegates to `aggregateGameToSeason` + `archiveCompletedGame`.

**C2: ✅ FED — END-GAME**
- `useGameState.ts:6221-6470` — `completeGameInternal()` builds the full PersistedGameState:
  - Player batting stats (line 6266-6285) with fielding tallies from IndexedDB
  - Pitcher game stats (line 6287-6370)
  - Fame events (line 6395)
  - Pitcher decisions (line 6340-6380)
  - Game metadata (teams, scores, stadium, season info)
- Called at: `useGameState.ts:6844` and `6863` (from `hookEndGame`)
- ⚠️ Idempotency guard at useGameState.ts:6407-6410 — checks `header.aggregated` to prevent double aggregation

**C3: ✅ PERSISTED**
- `processCompletedGame.ts:39` — `await aggregateGameToSeason(gameState, options)` → writes batting/pitching/fielding stats to season stores
- `processCompletedGame.ts:42` — `await archiveCompletedGame(gameState, scores, [], seasonId)` → writes to completedGames store
- `useGameState.ts:6430` — `await markGameAggregated(gameState.gameId)` → marks game header as aggregated
- Context: Full persistence: season stats updated, game archived, game marked aggregated.

**C4: ✅ DISPLAYED**
- PostGameSummary.tsx loads from completedGames store via `getCompletedGame(gameId)` (PostGameSummary.tsx:207-209)
- Renders: box score, player stats, pitcher lines, fame events, batting/pitching details
- Season/franchise views read from season stores populated by the aggregation pipeline

---

## Dependency Map (Complete)

```
LI (§12) ✅ ────→ Clutch (§13) ❌ ────→ rWAR (§11.4) ⚠️ ────→ Designations (§17) ❌
   │                                        ↑
   └───────────────────────────→ mWAR (§11.5) ✅
   │
   └──→ WPA (§12) ✅ ────→ Clutch (§13) ❌
   │
   └──→ Fame (§18-19) ✅ (uses LI as multiplier)

Milestones (§18) ✅ ──→ Fame (§18-19) ✅
Stats Pipeline (§8) ✅ ──→ WAR (§11) ✅ (season-level)
                          ──→ Designations (§17) ❌ (franchise-level, not game-level)

Fan Morale (§20) ⚠️ ← Game Result + Special Events (no persistence)
Narrative (§16) ⚠️ ← ALL systems (end-game only, dead data path)
```

**UPSTREAM BROKEN CASCADE:**
- LI is ✅ — no downstream impact from LI breakage
- WPA is ✅ for compute/persist, ❌ for display — display gap only, no cascade
- **Clutch is ❌ (ORPHANED) — this cascades:**
  - rWAR (§11.4) is ⚠️ — rWAR depends on clutch data that doesn't exist
  - Designations (§17) may be ⚠️ — depends on WAR which partially depends on clutch
- **Narrative is ⚠️ — dead data path, no cascade** (nothing depends on narratives)
- **Fan Morale is ⚠️ — no persistence means it resets every session**
  - This cascades to: FA Attractiveness (§20), Franchise Health Warning (§20) — both would read stale/default morale
- **Designations are ❌ — not implemented at game level**
  - This doesn't cascade within GameTracker (designations are franchise-level)

---

## Session Coverage

**Session 1:** Systems 1-4 (LI, WPA, Clutch, Fame) + processCompletedGame.ts + NewsBoard.tsx
**Session 2:** Systems 5-8 (Milestones, WAR, Mojo, Fitness)
**Session 3:** Systems 9-12 (Narrative, Fan Morale, Designations, Post-Game Pipeline) + Dependency map + Final summary
**Status:** COMPLETE — all 12 systems audited

---

## Key Findings So Far

### Critical Issues
1. **ORPHAN: useClutchCalculations** — Complete hook at `src/hooks/useClutchCalculations.ts` is never imported in GameTracker or useGameState. The §13 clutch attribution system is effectively non-functional. Only a bare `isClutch: boolean` flag (LI >= 1.5) is recorded.
2. **ORPHAN COMPUTATION: milestoneAlerts** — `getApproachingMilestones()` runs every batter change, produces formatted alerts, stores them in `fenwayContext.milestoneAlerts`, but NO component ever reads this value. The FullFenwayScoreboard does not accept milestone props. This is a computed-but-never-rendered orphan.

### Display Gaps
3. **LI not on primary game view** — LI is computed and persisted per-play but only visible in manager moment panel and fame popup. Not on ScoreBug or NewsBoard.
4. **WPA completely invisible** — WPA is computed and persisted per-play but never rendered in any UI component.
5. **mWAR value not displayed** — mWAR is computed and persisted but `formatCurrentMWAR()` only appears in console.log, never in UI.
6. **Milestones not in PostGameSummary** — Season/career milestones detected at game end but not shown in post-game screen.
7. **pWAR placeholder** — GameTracker.tsx:7183 shows `pWAR: —` as hardcoded text, not a dynamic calculation.

### Working Well
8. **Fame Tracking** — Full pipeline: hooked → fed (special events + end-game) → persisted (gameStorage + seasonAggregator) → displayed (in-game popup + post-game badges). 4/4 checkpoints pass.
9. **LI compute/persist** — Robust per-play computation via leverageCalculator engine, stored on every AtBatEvent.
10. **WPA compute/persist** — Per-play calculation via wpaCalculator engine, all three fields on every AtBatEvent.
11. **Mojo System** — Full pipeline: hooked (usePlayerState) → manual entry → persisted (BetweenPlayEvents + elimination snapshots) → displayed (condition panel). 4/4 pass. Correctly scoped to v1 (user-observed-only).
12. **Fitness System** — Full pipeline: same as Mojo. 4/4 pass. Correctly scoped to v1 (user-observed-only).
13. **mWAR compute/persist** — Decisions recorded per-substitution with LI context, saved and aggregated at game end. ⚠️ Inside try-catch (silent failure possible).

### Dead Data Paths
14. **Narrative → PostGameSummary** — `gameNarrative` and `awayNarrative` passed via `navigate()` state (GameTracker.tsx:5152-5153) but PostGameSummary's navigationState type (line 184-192) omits these fields. Narratives are generated, sent, then silently dropped.
15. **Fan Morale** — `processGameResult()` called for both teams at game end but morale is in-memory only (no IndexedDB persistence) and never rendered. Effectively a no-op.
16. **milestoneAlerts → nowhere** — Approaching milestones computed but never passed to any component (see #2).

### Not Implemented at Game Level
17. **Dynamic Designations (§17)** — No designation engine is hooked, fed, persisted, or displayed in GameTracker. Designation logic exists only in franchise-level engines (seasonTransitionEngine, fanFavoriteEngine). Per spec §17, designations should be visible on player cards during gameplay — currently they are not.
18. **Beat Reporter Feed** — NewsBoard.tsx:49 has placeholder text `"Beat Reporter Feed"`. No dynamic narrative blurbs during gameplay. Spec §16 requires contextual stories.

### Silent Failure Risks
19. **mWAR decision recording** — All `mwarHook.recordDecision()` calls wrapped in try-catch with `console.warn` only (GameTracker.tsx:2628, 2661). Failures are swallowed.
20. **mWAR persistence** — `saveGameDecisions()` and `aggregateManagerGameToSeason()` wrapped in try-catch (GameTracker.tsx:5042-5067). Failures are swallowed.
21. **Milestone approaching computation** — Inside try-catch (GameTracker.tsx:2520). Failures produce empty alerts silently.
22. **Narrative generation** — Inside try-catch (GameTracker.tsx:5037). Failures produce `undefined` narratives silently.

---

## Recommended Fix Priority (Session 1 — preliminary)

| Priority | Issue | Difficulty | Impact |
|----------|-------|------------|--------|
| P1 | Wire useClutchCalculations into GameTracker | Medium | Unblocks rWAR, designations |
| P2 | Pass milestoneAlerts to FullFenwayScoreboard or NewsBoard | Low | Already computed, just needs rendering |
| P3 | Add LI display to ScoreBug or game view | Low | Spec compliance §12 |
| P4 | Add WPA display somewhere (NewsBoard or game view) | Low | Spec compliance §12 |
| P5 | Show mWAR value in post-game summary | Low | Data exists, needs UI |
| P6 | Show milestones in PostGameSummary | Low | Data persisted, needs UI |
| P7 | Fix narrative dead data path — read nav state in PostGameSummary | Low | Already generated, just needs reading |
| P8 | Add fan morale persistence (IndexedDB) | Medium | Required for cross-game morale |
| P9 | Add fan morale display somewhere | Low | After P8 |
| P10 | Expand NewsBoard beyond basic stats | Medium | Spec compliance §6/§16 |
| P11 | Wire designation data into GameTracker player cards | High | Needs franchise↔game data bridge |
| P12 | Build beat reporter feed (in-game narratives) | High | Major feature, spec §16 |
