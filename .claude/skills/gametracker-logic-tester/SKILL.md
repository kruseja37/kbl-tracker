---
name: gametracker-logic-tester
description: Exhaustive automated testing of KBL Tracker GameTracker baseball logic and UI state integrity. Use when testing at-bat outcomes, baserunner movement, inning transitions, game state changes, scoring logic, or any GameTracker flow. Covers every possible at-bat outcome combined with every possible base/out state, verifies UI updates correctly, and catches logic errors that require baseball knowledge to identify. Trigger on "test gametracker", "test baseball logic", "test at-bat outcomes", "find logic bugs", "test game flow", or any request to verify GameTracker correctness.
---

# GameTracker Logic Tester

## Context

KBL Tracker is a React + TypeScript + Vite app tracking Super Mega Baseball 4 (SMB4) games. The GameTracker records at-bats and manages game state. This skill systematically tests every reachable game state to find logic and UI bugs.

**SMB4 is NOT real baseball.** Key differences are documented in `references/BASEBALL_LOGIC.md`. Always check there before assuming a feature exists or doesn't exist.

## Architecture Note

**SHARED-SOURCE architecture** — the app spans TWO directories that work together:
- `src/src_figma/` = UI layer (pages, components, React hooks). The `@/` alias resolves here.
- `src/engines/`, `src/utils/`, `src/types/` = CORE logic layer (calculation engines, IndexedDB storage, type defs)
- `src/src_figma/app/engines/` = integration wrappers that adapt base engines for UI
- **Import chain**: UI → `src/src_figma/hooks/` → `src/engines/` + `src/utils/`
- **Fixing a bug in `src/engines/bwarCalculator.ts` affects the entire app** — it's not a dead copy.
- The `@/` path alias = `src/src_figma/` (set in vite.config.ts)

## Critical File Paths

```
# Main GameTracker page (3,842 lines)
src/src_figma/app/pages/GameTracker.tsx

# Core game state hook (2,968 lines) — THIS IS THE HEART OF GAME LOGIC
# Imports from BOTH trees: src/utils/eventLog, src/engines/leverageCalculator, src/src_figma/utils/gameStorage
src/src_figma/hooks/useGameState.ts

# Runner/hit default logic
src/src_figma/app/components/runnerDefaults.ts

# Play classification
src/src_figma/app/components/playClassifier.ts

# Fielder inference
src/src_figma/app/components/fielderInference.ts

# Interactive field (drag-drop, visual diamond)
src/src_figma/app/components/EnhancedInteractiveField.tsx

# Outcome buttons UI
src/src_figma/app/components/OutcomeButtons.tsx

# Scoreboard display
src/src_figma/app/components/MiniScoreboard.tsx

# Lineup card
src/src_figma/app/components/LineupCard.tsx

# Undo system
src/src_figma/app/components/UndoSystem.tsx

# Side panel (stats, play log)
src/src_figma/app/components/SidePanel.tsx

# Modals (substitutions, fielder credits, errors)
src/src_figma/app/components/modals/

# Game-specific engines (in src_figma — UI integration layer)
src/src_figma/app/engines/d3kTracker.ts          # Dropped 3rd strike
src/src_figma/app/engines/inheritedRunnerTracker.ts  # Inherited runner ER attribution
src/src_figma/app/engines/saveDetector.ts         # Save/hold/blown save

# CORE engines (in base src/ — shared by entire app, imported by src_figma)
src/engines/leverageCalculator.ts    # LI, gmLI — imported by useGameState
src/engines/mojoEngine.ts            # Mojo states — imported by GameTracker.tsx
src/engines/fitnessEngine.ts         # Fitness — imported by GameTracker.tsx
src/engines/bwarCalculator.ts        # Batting WAR
src/engines/pwarCalculator.ts        # Pitching WAR

# Game persistence
src/src_figma/utils/gameStorage.ts   # Figma-side IndexedDB: 'kbl-tracker' DB
src/utils/eventLog.ts                # CORE: At-bat event logging — imported by useGameState
src/utils/seasonAggregator.ts        # CORE: Game → season aggregation — imported by useGameState

# Post-game flow
src/src_figma/app/pages/PostGameSummary.tsx
src/src_figma/app/pages/ExhibitionGame.tsx

# Type definitions
src/src_figma/app/types/game.ts
src/types/game.ts
```

## Pre-Flight

1. Read `spec-docs/CURRENT_STATE.md` for what's implemented
2. Read `references/BASEBALL_LOGIC.md` (in this skill directory) for SMB4-specific rules
3. Read `spec-docs/MASTER_BASEBALL_RULES_AND_LOGIC.md` for full rule reference
4. Run `npm run build` — must exit 0
5. Run `npm test` — baseline must pass (744+ tests expected)
6. Start dev server: `npm run dev`
7. Open browser via Playwright MCP to `http://localhost:5173`

## State Space Definition

Every GameTracker state is defined by:

```
GameState = {
  inning: 1-9+ (top/bottom via isTop boolean)
  outs: 0, 1, 2
  bases: 8 combinations (empty, 1st, 2nd, 3rd, 1st+2nd, 1st+3rd, 2nd+3rd, loaded)
  score: [away, home] (homeScore, awayScore in useGameState)
  count: balls (0-3), strikes (0-2)
  lineup_position: 1-9 (batting order, wraps around)
}
```

## At-Bat Outcomes to Test

Every outcome that can occur in SMB4:

### Hits
- Single (runner advances vary by base state — see runnerDefaults.ts)
- Double (runner advances vary)
- Triple (all runners score)
- Home Run: Over Fence, Wall Scraper, Inside-the-Park HR
- Infield single (if implemented)

### Default Runner Advancement (from runnerDefaults.ts)

These are the DEFAULT movements. Users can override via drag-drop.

| Hit Type | Batter → | R1 → | R2 → | R3 → |
|----------|----------|------|------|------|
| Single (1B) | 1st | 2nd | 3rd | Scores |
| Double (2B) | 2nd | 3rd | Scores | Scores |
| Triple (3B) | 3rd | Scores | Scores | Scores |
| Home Run (HR) | Scores | Scores | Scores | Scores |
| Walk/HBP/IBB | 1st | 2nd (if forced) | 3rd (if forced) | Scores (if forced) |
| Ground Out (GO) | Out | 2nd (default) | 3rd (default) | Scores (if < 2 outs, sac) |
| Fly Out (FO) | Out | Holds | Holds | Scores (if < 2 outs, tag up) |

**Key edge cases:**
- Force plays: Only apply on ground outs when bases behind are occupied
- Tag-up: Only on fly outs with < 2 outs; runner on 3rd scores (sacrifice fly)
- Double play: R1 forced out at 2nd, batter out at 1st
- Fielder's Choice: Batter reaches, one runner is out (user selects which)

### Outs
- Ground out (fielder position matters for force/tag)
- Fly out (deep enough for sac fly? tagging up?)
- Line out
- Strikeout (swinging, looking)
- Double play (GO + runner out — verify auto-correction per Jan 25 fix)
- Triple play (rare but valid)
- Fielder's choice
- Sacrifice fly (runner on 3rd, <2 outs)
- Sacrifice bunt

### No-out outcomes
- Walk (BB)
- Hit by pitch (HBP)
- Error (fielder, position — fixed Feb 5 to NOT wipe runners)
- Reached on error
- Dropped 3rd strike (D3K — see d3kTracker.ts)

### Special events
- Stolen base
- Caught stealing
- Wild pitch / passed ball (runner advancement — fixed Feb 5 to update scoreboard)
- Intentional walk
- Defensive substitution
- Pitching change
- Pinch hitter / Pinch runner

## Function API Reference

The actual functions in useGameState.ts use these signatures. Do NOT assume functions like `recordSingle` exist — they don't.

### Hit Recording
```typescript
recordHit(hitType: '1B' | '2B' | '3B' | 'HR', rbi?: number, runnerData?: RunnerData, pitchCount?: number)
```
- Single → `recordHit('1B', ...)`
- Double → `recordHit('2B', ...)`
- Triple → `recordHit('3B', ...)`
- Home Run → `recordHit('HR', ...)`

### Out Recording
```typescript
recordOut(outType: 'K' | 'KL' | 'GO' | 'FO' | 'LO' | 'PO' | 'DP' | 'TP' | 'FC' | 'SF' | 'SH' | 'D3K', runnerData?: RunnerData, pitchCount?: number)
```
- K: Strikeout (swinging)
- KL: Strikeout (looking)
- GO: Ground out
- FO: Fly out
- LO: Line out
- PO: Pop out
- DP: Double play
- TP: Triple play
- FC: Fielder's choice
- SF: Sacrifice fly
- SH: Sacrifice bunt/hit
- D3K: Dropped third strike (out)

### Walk Recording
```typescript
recordWalk(walkType: 'BB' | 'HBP' | 'IBB', pitchCount?: number)
```
- BB: Walk (base on balls)
- HBP: Hit by pitch
- IBB: Intentional walk

### Special Plays
```typescript
recordD3K(batterReached: boolean, runnerData?: RunnerData, pitchCount?: number)
recordError(rbi?: number, runnerData?: RunnerData, pitchCount?: number)
recordWildPitch()
recordPassedBall()
recordStolenBase(runnerId: string, fromBase: string, toBase: string)
recordCaughtStealing(runnerId: string, fromBase: string)
```

## Testing Protocol

### Phase 1: State Transition Matrix (Automated)

Use the test case generator: `scripts/generate_test_cases.py`

#### Phase 1 Execution Steps
1. Run: `cd /path/to/kbl-tracker && npx vitest run src/src_figma/__tests__/baseballLogic/ --reporter=verbose`
2. Parse output: Count PASS vs FAIL vs SKIP
3. For each FAIL: Record test name, expected vs actual, file:line
4. Compare against baseline (264 tests expected in baseballLogic/)
5. If test count differs from 264: Investigate — tests may have been added or removed

For each base/out combination (8 bases × 3 outs = 24 states), apply every applicable outcome and verify:

```
For each base_state in [empty, 1st, 2nd, 3rd, 1st+2nd, 1st+3rd, 2nd+3rd, loaded]:
  For each out_count in [0, 1, 2]:
    For each outcome in [all_outcomes]:
      1. Set game to this state (or navigate there via UI)
      2. Apply outcome
      3. VERIFY:
         - Correct runners scored
         - Correct runners advanced
         - Correct new base state
         - Correct out count
         - Correct inning transition (if 3rd out)
         - Batter stats updated correctly (PlayerGameStats)
         - Pitcher stats updated correctly (PitcherGameStats)
         - Score updated correctly (homeScore/awayScore)
         - Scoreboard inning line score updated
         - Next batter loaded correctly (lineup position wraps at 9)
         - UI reflects all changes (diamond, score, outs indicator)
```

### Phase 2: Critical Baseball Logic Checks

Test scenarios requiring baseball knowledge:

**Force play vs tag play:**
- Runner on 1st, ground ball → force at 2nd (runner doesn't need to be tagged)
- Runner on 2nd only, ground ball → tag play (runner can retreat)
- Bases loaded ground ball → force everywhere

**Sacrifice fly rules:**
- Runner on 3rd, 0 outs, fly out → runner scores, batter gets SF (not an AB)
- Runner on 3rd, 2 outs, fly out → inning over, runner does NOT score
- Runner on 2nd only, fly out → NOT a sac fly even if runner advances

**Double play logic:**
- Runner on 1st, ground out → should prompt/auto-detect DP possibility
- 2 outs → no DP possible (only one out needed)
- Verify GO + runner out auto-corrects to DP

**Infield fly rule:**
- DOES exist in SMB4 (confirmed by user)
- Runners on 1st+2nd or loaded, less than 2 outs, pop fly in infield
- Batter is automatically out, runners may advance at own risk
- See `src/src_figma/__tests__/baseballLogic/infieldFlyRule.test.ts` for 37 existing tests

**Inning transitions:**
- 3rd out recorded → side retired, switch batting team (toggle isTop)
- Bottom of 9th, home team ahead → game over (don't play bottom)
- Extra innings: verify inning number increments past 9, no automatic runner placement (SMB4 doesn't use ghost runners), walk-off rules apply

**Batting order:**
- After 9th batter, wraps to 1st
- Pinch hitter takes spot, next AB goes to next lineup position
- Substitutions maintain correct order

**Run scoring on 3rd out:**
- Runner crosses plate BEFORE 3rd out on tag play → run counts
- Runner crosses plate on force out → run does NOT count
- Verify this distinction in scoring logic

**Inside-the-park HR:**
- All runners score (fixed Feb 5 via calculateHitDefaults)
- Batter scores
- Verify different from over-fence HR flow

### Phase 3: UI Verification via Playwright

For each state transition tested in Phase 2, also verify via browser:

1. Navigate to GameTracker
2. Start a new game (via ExhibitionGame setup)
3. Execute the outcome sequence
4. Screenshot after each outcome
5. Verify visually:
   - Diamond shows correct baserunners
   - Score display updated (MiniScoreboard)
   - Out indicators correct
   - Current batter/pitcher info correct
   - Outcome buttons available/disabled appropriately
   - No UI elements in broken/impossible state
   - Lineup card reflects substitutions
   - Play-by-play log in SidePanel is accurate

### Phase 4: Edge Cases

- First at-bat of game (initialization — check initializeGame() in useGameState)
- Last out of inning (transition)
- Last out of game (game end flow → PostGameSummary)
- Walk-off scenarios (home team wins in bottom of 9th+)
- Mercy rule (SMB4 may have one — check with user if unclear)
- Maximum runs in an inning (no limit, but test 10+ to stress UI)
- Full batting around (9+ batters in one inning)
- Pitcher batting at #9 (fixed Feb 5 — verify still works)
- WP/PB with runners on (verify scoreboard line score updates — fixed Feb 5)
- Error not wiping runners (verify fix from Feb 5)

## Bug Classification

| Severity | Definition | Example |
|----------|-----------|---------|
| Critical | Wrong game state, data corruption | Runner scores but score doesn't update |
| Major | Logic error visible to baseball-literate user | Sac fly counted as regular out |
| Minor | Cosmetic or non-functional | Diamond animation glitch |
| Enhancement | Works but could be smarter | Doesn't auto-detect obvious DP |

## Fix Protocol

For each bug found:

1. Document: state, outcome, expected vs actual
2. Identify root cause in source code (read the component/hook/engine)
3. Propose fix with explanation
4. Implement fix
5. Re-run the specific test case that failed
6. Re-run full Phase 1 matrix to check for regressions
7. Run `npm test` to verify existing tests still pass (744+)
8. Run `npm run build` to verify no type errors
9. Update `spec-docs/CURRENT_STATE.md` with bug fix details

## Anti-Hallucination Rules

- Do NOT claim a test passed without actually running it
- Do NOT assume baseball logic is correct — verify against `references/BASEBALL_LOGIC.md`
- Do NOT skip edge cases because "they probably work"
- If a fix doesn't resolve the bug on first try, STOP. Re-diagnose from scratch
- After 2 failed fix attempts on same bug, reassess whether you're fixing the right thing
- Always check SMB4-specific rules before assuming a feature exists
- The infield fly rule DOES exist in SMB4 — do not document otherwise

## Output

After testing, produce a structured report:

```
# GameTracker Logic Test Report
Date: [date]
States tested: [X] / [total]
Bugs found: [count by severity]

## Critical Bugs
[list with reproduction steps]

## Major Bugs
[list with reproduction steps]

## Minor Bugs
[list]

## All Tests Passed
[list of state/outcome combos that passed]
```

Save report to `spec-docs/GAMETRACKER_TEST_REPORT.md`.
