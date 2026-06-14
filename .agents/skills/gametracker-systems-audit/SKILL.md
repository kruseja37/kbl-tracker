---
name: gametracker-systems-audit
description: Audit all advanced tracking systems wired into the GameTracker — leverage index, clutch attribution, fame, milestones, WAR, mojo, fitness, narrative/newsboard, fan morale, designations, and the post-game aggregation pipeline. Produces a truth map showing what's wired, what's computing, what's persisting, and what's displaying — vs what the spec says should happen. Trigger on "audit gametracker systems", "what systems are wired", "advanced tracking audit", "newsboard audit", "post-game pipeline audit".
---

# GAMETRACKER ADVANCED SYSTEMS AUDIT

## Purpose

The GameTracker records plays. The spec says 12+ advanced systems should CONSUME that data during and after each game. This audit traces every system from spec to code and produces a truth map.

---

## FAILURE MODES THIS SKILL GUARDS AGAINST

### FM-1: "Imported" ≠ "Called" ≠ "Called on the hot path"
A system can be imported, instantiated as a hook, and never called during actual play commits. Or called only in the end-game flow, meaning 99% of gameplay has no data flowing through it.
**Guard:** C2 ("Fed") requires tracing the ACTUAL play commit path. Not "called somewhere in the file" — called in the recording flow that fires on every play. If only called at game end, note "C2: END-GAME ONLY."

### FM-2: Persistence ≠ "processCompletedGame is called"
`processCompletedGame` might aggregate batting stats but skip fame/LI/clutch data entirely.
**Guard:** C3 requires tracing the SPECIFIC DATA FIELDS being written. Read the persisted data structure field by field.

### FM-3: Context exhaustion
12 systems × 4 checkpoints across 15+ files, some 7000+ lines.
**Guard:** Split into sessions. Each session covers a defined set of systems. Produce intermediate output to the truth map file between sessions.

### FM-4: Different names for the same concept
Spec says "Win Probability Added." Code says `wpDelta`.
**Guard:** Multiple search terms provided per system. Try ALL terms before declaring "not found."

### FM-5: UI element exists but data is hardcoded/defaulted
A mojo badge might render but with a default value.
**Guard:** C4 requires tracing from hook → props → render. Verify data is DYNAMIC.

### FM-6: Shallow truth map with optimistic ✅s
**Guard:** Every ✅ must include: file path, line number, function name, one-sentence description. A ✅ without evidence = hallucination = rejected.

### FM-7: Auditing against v2 scope (NEW)
The spec includes features explicitly deferred to v2. Auditing against v2 requirements produces false "gaps."
**Guard:** Before auditing any system, check `spec-docs/MODE_2_V1_FINAL.md` and `spec-docs/V2_DEFERRED_BACKLOG.md`. If the system or feature is in the deferred backlog, mark it as "V2 — OUT OF SCOPE" and move on. Only audit what v1 requires.

### FM-8: Line numbers are stale (NEW)
The codebase has been modified 40+ times this session. Grep results show current line numbers, but those may not match what a human sees if they open the file later.
**Guard:** For every evidence line number, include the CONTENT of the line (not just the number). Example: `GameTracker.tsx:598 — const buildGameStateForLI = useCallback(...)`. This survives line number drift.

### FM-9: processCompletedGame might be large (NEW)
We assume it's small enough to read in full. It might not be.
**Guard:** Before reading, check file size: `wc -l src/utils/processCompletedGame.ts`. If >500 lines, grep for the key structures instead of full read. If <500, read in full.

### FM-10: No cross-system dependency tracking (NEW)
LI feeds Clutch. Clutch feeds WAR. If LI is broken, downstream systems are automatically broken.
**Guard:** After completing per-system audits, add a DEPENDENCY MAP section showing which systems feed into which. If an upstream system is ❌, mark all downstream systems as "⚠️ UPSTREAM BROKEN."

### FM-11: "Code exists" ≠ "Code executes without error" (NEW)
A function call that throws silently (caught by try/catch with no re-throw) appears "wired" but doesn't actually work.
**Guard:** For C2, note if the call site is inside a try/catch. If it is, mark as "C2: ⚠️ TRY-CATCH WRAPPED — silent failure possible." This doesn't make it ❌ but flags the risk.

### FM-12: No self-verification mechanism (NEW)
Opus produces the truth map and declares done. No way to verify correctness.
**Guard:** For every system, include the EXACT GREP COMMAND used to find (or fail to find) the evidence. JK or a follow-up session can re-run those commands to verify.

---
## The 4 Checkpoints (Strict Definitions)

| Checkpoint | Definition | ✅ Requires | ❌ Means | ⚠️ Means |
|------------|-----------|-------------|---------|----------|
| **C1: Hooked** | System is imported AND instantiated in GameTracker or useGameState | File:line:content showing hook call or engine construction | Import exists but hook never called, or import commented out | Imported in one file, unclear if reached at runtime |
| **C2: Fed** | System receives data during gameplay | File:line:content showing function call + trigger context (PER-PLAY / END-GAME ONLY / MANUAL ONLY) | Hooked but zero function calls feed it data | Called but inside try-catch (silent failure possible), or END-GAME ONLY when spec requires per-play |
| **C3: Persisted** | System output saved to IndexedDB | File:line:content showing the specific field in the persisted data structure | Function called but this system's fields not in the persisted object | Field exists in interface but not populated in the write path |
| **C4: Displayed** | System output visible in UI | File:line:content showing dynamic prop passed to component + component renders it | No UI component receives this data | Component receives prop but renders default/placeholder |

### Evidence Format (mandatory for every checkpoint)

```
**C[N]:** [✅/❌/⚠️] [STATUS LABEL]
  - Grep: `[exact grep command run]`
  - Result: [what grep returned, or "0 matches"]
  - File:line: [path:lineNumber] — `[exact code content at that line]`
  - Context: [1-sentence description of what this means]
```

If a grep returns 0 matches, that IS the evidence — include the command and "0 matches." Do not fabricate a result.

---

## Pre-Audit Gate: V1 Scope Check

BEFORE auditing any system, determine if it's in v1 scope:

```bash
# Check v1 spec
grep -i "SYSTEM_NAME\|system_abbreviation" spec-docs/MODE_2_V1_FINAL.md | head -5
# Check v2 deferred backlog
grep -i "SYSTEM_NAME\|system_abbreviation" spec-docs/V2_DEFERRED_BACKLOG.md | head -5
```

| Result | Action |
|--------|--------|
| In MODE_2_V1_FINAL and NOT in V2_DEFERRED | Audit normally |
| In V2_DEFERRED_BACKLOG | Mark "V2 DEFERRED — OUT OF AUDIT SCOPE" and skip |
| In neither document | Check MODE_2_FRANCHISE_SEASON_UPDATED.md — if present, audit but flag as "SCOPE UNCLEAR" |
| MODE_2_V1_FINAL.md doesn't exist | Fall back to MODE_2_FRANCHISE_SEASON_UPDATED.md for all systems |

---

## Systems to Audit (with search terms)

### 1. Leverage Index (LI)
**Spec ref:** MODE_2 §12
**Search terms:** `leverageIndex`, `leverageCalc`, `computeLI`, `getLeverageIndex`, `GameStateForLI`, `buildGameStateForLI`, `liTier`, `getLITier`
**Expected per spec:** LI computed per at-bat from inning/score/outs/runners, stored on AtBatEvent.leverageIndex
**Depends on:** Nothing (foundational)
**Feeds into:** Clutch (§13), mWAR (§11.5)

### 2. Win Probability Added (WPA)
**Spec ref:** MODE_2 §12
**Search terms:** `winProbability`, `wpa`, `wpDelta`, `winExpectancy`, `WPA`, `wpAdded`, `winProb`
**Expected per spec:** WPA = change in win probability per play, stored on AtBatEvent or aggregated per player
**Depends on:** LI (uses same game state inputs)
**Feeds into:** Clutch (§13)

### 3. Clutch Attribution
**Spec ref:** MODE_2 §13
**Search terms:** `clutch`, `clutchImpact`, `clutchQuotient`, `CQ`, `clutchScore`, `clutchAttribution`, `clutchRating`
**Expected per spec:** Clutch impact per play = performance × leverage, aggregated to player clutch quotient
**Depends on:** LI, WPA
**Feeds into:** WAR (rWAR component), Designations (§17)

### 4. Fame Tracking
**Spec ref:** MODE_2 §18-19
**Search terms:** `fame`, `fameEvent`, `recordFameEvent`, `useFameTracking`, `fameScore`, `fameLevel`, `FameEventType`, `fameTracking`
**Expected per spec:** Fame events recorded on special plays (HR, no-hitter, milestone), accumulated to player fame score
**Depends on:** Milestones (milestone events trigger fame)
**Feeds into:** Designations (§17), Fan Morale (§20)

### 5. Milestone Detection
**Spec ref:** MODE_2 §18
**Search terms:** `milestone`, `detectMilestone`, `getApproachingMilestones`, `milestoneDetector`, `milestoneAggregator`, `checkMilestone`, `approachingMilestones`
**Expected per spec:** Milestones checked after plays or at game end, persisted when triggered
**Depends on:** Season stats (needs accumulated totals to detect thresholds)
**Feeds into:** Fame (milestone triggers fame event), Narrative (milestone triggers story)

### 6. WAR Components (bWAR, pWAR, fWAR, rWAR, mWAR)
**Spec ref:** MODE_2 §11
**Search terms:** `WAR`, `bWAR`, `pWAR`, `fWAR`, `rWAR`, `mWAR`, `calculateWAR`, `warCalculation`, `useMWARCalculations`, `mwarHook`, `saveGameDecisions`, `aggregateManagerGame`
**Expected per spec:** WAR inputs collected during gameplay, WAR computed at game end or season level
**Depends on:** LI (for mWAR), Clutch (for rWAR), Fielding events (for fWAR), Stats (for bWAR, pWAR)
**Feeds into:** Designations (§17), Awards, Player card display

### 7. Mojo System
**Spec ref:** MODE_2 §14
**Search terms:** `mojo`, `mojoLevel`, `mojoEngine`, `clampMojo`, `usePlayerState`, `currentMojo`, `MOJO_STATES`, `mojoAdjustment`, `playerStateHook`, `recordPlayerStateChange`
**Expected per spec:** Mojo shifts per player on game events, persisted between games
**Depends on:** Nothing (reacts to game events directly)
**Feeds into:** Player card display, Narrative (mojo shifts trigger stories)

### 8. Fitness System
**Spec ref:** MODE_2 §14
**Search terms:** `fitness`, `fitnessState`, `fitnessEngine`, `FITNESS_STATES`, `fitnessProfile`, `fitnessDegrade`, `currentFitness`, `saveMojoFitnessSnapshots`
**Expected per spec:** Fitness degrades during games, persisted between games
**Depends on:** Nothing (reacts to game events and time/pitch count)
**Feeds into:** Player card display, Substitution suggestions

### 9. Narrative / Beat Reporter / NewsBoard
**Spec ref:** MODE_2 §16, §6
**Search terms:** `narrative`, `beatReporter`, `generateGameRecap`, `narrativeIntegration`, `NewsBoard`, `fenwayBoardContext`, `buildFenwayMatchupSummary`, `headlineGenerator`, `BeatReporterFeed`, `storyEngine`
**Expected per spec:** Beat reporter generates contextual blurbs during gameplay AND at game end. NewsBoard displays matchup history, approaching milestones, mojo indicators, narrative blurbs, LI context.
**Depends on:** All other systems (narrative consumes everything)
**Feeds into:** NewsBoard display, PostGameSummary, Fan Morale (reporter tone)

### 10. Fan Morale
**Spec ref:** MODE_2 §20
**Search terms:** `fanMorale`, `useFanMorale`, `processGameResult`, `FanMoraleGameResult`, `moraleEvent`, `homeFanMorale`, `awayFanMorale`
**Expected per spec:** Fan morale updates at game end based on result
**Depends on:** Game result (W/L), special events (no-hitter, walkoff)
**Feeds into:** Franchise Health Warning, FA Attractiveness, Narrative tone

### 11. Dynamic Designations
**Spec ref:** MODE_2 §17
**Search terms:** `designation`, `dynamicDesignation`, `slumping`, `hotStreak`, `MVPCandidate`, `designationEngine`, `updateDesignation`, `evaluateDesignation`
**Expected per spec:** Designations computed from rolling performance windows, visible on player cards
**Depends on:** Season stats (rolling windows), WAR, Clutch
**Feeds into:** Narrative, Player card display, Trade value

### 12. Post-Game Aggregation Pipeline
**Spec ref:** MODE_2 §8, §26
**Search terms:** `processCompletedGame`, `seasonAggregator`, `archiveCompletedGame`, `markGameAggregated`, `clearCurrentGame`, `completeGame`, `completeGameInternal`
**Expected per spec:** At game end: stats → season store, events → archive, career → update, standings → recalc
**Depends on:** All per-game data (stats, events, fielding, pitcher decisions)
**Feeds into:** Everything downstream (season views, career pages, standings, awards)

---

## Audit Protocol — 9 Steps

### Step 0: Pre-Audit — Scope Check + File Sizing
Before any system audit:
1. Check which spec to use: does `spec-docs/MODE_2_V1_FINAL.md` exist? If yes, use it. If not, use `MODE_2_FRANCHISE_SEASON_UPDATED.md`.
2. Check v2 deferred: does `spec-docs/V2_DEFERRED_BACKLOG.md` exist? Read it and note deferred systems.
3. Size the two mandatory full-read files:
```bash
wc -l src/src_figma/app/components/NewsBoard.tsx
wc -l src/utils/processCompletedGame.ts
```
If either is >500 lines, note this and use grep + targeted ranges instead of full read.
4. Record the spec document used and any v2 exclusions in the truth map header.

### Step 1: Read the Spec
For each system, read the relevant spec section. Note:
- WHEN the system should fire (per play? per inning? game end only?)
- WHAT data it produces
- WHERE it should be stored
- WHERE it should be displayed
- What UPSTREAM systems it depends on

### Step 2: Checkpoint C1 — Is It Hooked?
```bash
grep -n "TERM1\|TERM2\|TERM3" src/src_figma/app/pages/GameTracker.tsx | head -10
```
**Evidence required:** file:line:content where the hook is called or engine instantiated.
**If not found in GameTracker.tsx:** search useGameState.ts — some systems are internal to the hook.
**If not found in either:** mark C1 ❌ with the grep commands that returned 0 results.

### Step 3: Checkpoint C2 — Is It Fed?
For each system passing C1, find WHERE it receives data:
```bash
grep -n "hookVariable\.\|engineName\." src/src_figma/app/pages/GameTracker.tsx | grep -v "import\|const.*=.*use\|//" | head -15
```
**Read 10 lines around each call site** to determine trigger context.
**Classify:**
- **PER-PLAY:** Inside commitPlateAppearance handler chain or handleQuickBarOutcome
- **PER-INNING:** Inside endInning handler
- **END-GAME ONLY:** Inside handleEndGame / completeGameInternal
- **MANUAL ONLY:** Inside enrichment handlers
- **EFFECT-DRIVEN:** Inside a useEffect (note the dependency array)
- **NEVER:** Zero call sites found
**Note if inside try-catch** — mark ⚠️ TRY-CATCH WRAPPED.

### Step 4: Checkpoint C3 — Is It Persisted?
Two sub-checks:

**4a: Per-event persistence**
```bash
grep -n "FIELD_NAME" src/utils/eventLog.ts | head -5
```
Does the AtBatEvent interface have fields for this system's output? Is the field POPULATED in the write path?

**4b: Game-end persistence**
Read processCompletedGame.ts (full if <500 lines, targeted if larger). For each system, verify:
- Is the system's output field present in the PersistedGameState or equivalent?
- Is that field POPULATED with actual data (not undefined/null/default)?
- Is the field written to IndexedDB?

**Evidence:** Include the field name, the interface it belongs to, and the line where it's populated.

### Step 5: Checkpoint C4 — Is It Displayed?
Three sub-checks:

**5a: In-game (NewsBoard, ScoreBug, lineup columns)**
```bash
grep -n "SYSTEM_TERM" src/src_figma/app/components/NewsBoard.tsx
grep -n "SYSTEM_TERM" src/src_figma/app/components/ScoreBug.tsx
```

**5b: Post-game (PostGameSummary)**
```bash
grep -n "SYSTEM_TERM" src/src_figma/app/pages/PostGameSummary.tsx
```

**5c: Player card / franchise views**
```bash
grep -rn "SYSTEM_TERM" src/src_figma/app/pages/ | grep -v GameTracker | head -10
```

For each match: trace the prop from GameTracker → component to verify it's DYNAMIC.

### Step 6: NewsBoard Deep Dive
Read NewsBoard.tsx in full. Document:
- Complete props interface (every field, every type)
- Every piece of data rendered
- Every conditional render

Compare to spec §16 requirements. Produce explicit gap list:
```
RECEIVES AND RENDERS:
- [prop]: [what it shows]

SHOULD RECEIVE (per spec) BUT DOES NOT:
- [missing data]: [spec section reference]
```

### Step 7: Post-Game Pipeline Deep Dive
Read processCompletedGame.ts. Document:
- Input: what data structure does it receive?
- Processing: what does it compute/transform?
- Output: what fields does it write to which IndexedDB stores?
- What systems' data does it include vs exclude?

### Step 8: Dependency Map
After all per-system audits, produce:
```
SYSTEM DEPENDENCY MAP:
LI (§12) → Clutch (§13) → rWAR (§11.4) → Designations (§17)
LI (§12) → mWAR (§11.5)
Milestones (§18) → Fame (§18-19)
Stats (§8) → WAR (§11) → Designations (§17)
Fan Morale (§20) ← Game Result + Special Events
Narrative (§16) ← ALL systems

UPSTREAM BROKEN CASCADE:
If LI is ❌: Clutch is automatically ⚠️, rWAR is ⚠️, mWAR is ⚠️
If Stats pipeline is ❌: WAR is ❌, Milestones is ❌, Designations is ❌
```

### Step 9: Produce Truth Map
Write to `spec-docs/GAMETRACKER_SYSTEMS_TRUTH_MAP.md`.

---

## Output Document Structure

```markdown
# GameTracker Advanced Systems — Truth Map
**Audit date:** [date]
**Spec used:** [MODE_2_V1_FINAL.md or MODE_2_FRANCHISE_SEASON_UPDATED.md]
**V2 exclusions:** [list any systems skipped as v2-deferred]
**Files read in full:** NewsBoard.tsx ([N] lines), processCompletedGame.ts ([N] lines)

## Summary Table
| # | System | C1 | C2 | C3 | C4 | Score | V1 Scope |
|---|--------|----|----|----|----|-------|----------|

## Per-System Detail
[per system, with mandatory evidence format for every checkpoint]

## Dependency Map
[which systems feed which, cascade analysis]

## NewsBoard Gap Report
[current vs required]

## Post-Game Pipeline Report
[what processCompletedGame actually writes]

## Recommended Fix Priority
[ordered list with difficulty estimates]

## Session Coverage
[which systems were audited in this session, which remain]
```

---

## Rules (non-negotiable)

1. **Evidence or ❌.** No ✅ without file:line:content. A ✅ without evidence is a hallucination.
2. **Include grep commands.** Every checkpoint must show the exact grep command used. This allows verification.
3. **Include line CONTENT, not just numbers.** Line numbers drift. `GameTracker.tsx:598 — const buildGameStateForLI = useCallback(...)` survives drift. `GameTracker.tsx:598` does not.
4. **Trace, don't assume.** "processCompletedGame exists" is not evidence of what it persists.
5. **Distinguish trigger contexts.** C2 is not binary. PER-PLAY ≠ END-GAME ONLY ≠ MANUAL ONLY ≠ NEVER.
6. **Flag try-catch wrappers.** If a call is inside try/catch with no re-throw, mark ⚠️.
7. **Check v1 scope before auditing.** If a system is v2-deferred, skip it — don't audit and create false gaps.
8. **Read NewsBoard.tsx in full.** This is the user-facing surface. Grep is not enough.
9. **Read processCompletedGame.ts in full** (if <500 lines). This is the persistence junction.
10. **Build the dependency map.** Upstream failures cascade. Show the cascade.
11. **Do not fix anything.** Audit only. The truth map drives the next phase.
12. **Do not hallucinate line numbers.** If grep returns nothing, report "0 matches" with the command. That IS the finding.
13. **Do not conflate "field exists on interface" with "field is populated."** An optional field that's always undefined is effectively ❌.
14. **Session boundaries are hard.** When context runs low, STOP, write intermediate output, and clearly mark what remains. Do not rush through the last 3 systems with shallow checks.
