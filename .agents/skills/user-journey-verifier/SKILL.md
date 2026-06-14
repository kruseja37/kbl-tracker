---
name: user-journey-verifier
description: Define and execute representative user journeys through KBL Tracker's franchise/season UI using Playwright. Writes self-contained test scripts (not interactive clicking). Two modes — seeded (clean state) and organic (simulator output). 5-10 journeys covering critical workflows from season start to completion. Trigger on "test user journeys", "UI integration test", "end-to-end test", "verify user flows", or as Phase 4 of the franchise testing pipeline.
---

# User Journey Verifier

## Purpose

Logic tests verify the engine. Pipeline traces verify the plumbing. This skill verifies the EXPERIENCE — can a user actually do the things the app promises? It catches bugs that only manifest when a real browser renders real components with real data.

**This skill writes Playwright test scripts. Claude Code does NOT click through the app interactively.** The scripts are self-contained and can be run independently via `npx playwright test`.

## Pre-Flight

1. Read `spec-docs/FRANCHISE_BUTTON_AUDIT.md` — know which buttons are WIRED vs DEAD
2. Read `spec-docs/DATA_PIPELINE_TRACE_REPORT.md` — know which pipelines are INTACT vs BROKEN
3. Read `spec-docs/SEASON_SIMULATION_REPORT.md` — if available, use for organic mode
4. Read `spec-docs/CURRENT_STATE.md`
5. Verify Playwright is installed: `npx playwright --version`
   - If not installed: `npm install -D @playwright/test && npx playwright install chromium`
6. Verify dev server starts: `npm run dev`
7. Run `npm run build` — must exit 0

### Preflight Proof

```
PREFLIGHT PROOF:
1. Start dev server
2. Launch Playwright against localhost
3. Navigate to the app's home page
4. Read ONE element from the page (e.g., app title)
5. If successful → Playwright works. Proceed.
6. If failed → document the error and STOP.
```

### Known Broken Paths

**Before writing journeys, filter out known-broken paths:**
- If button audit says a button is DEAD → don't include that button in a journey
- If pipeline trace says a pipeline is BROKEN → note it but still include the journey (the journey will document the failure from the user's perspective)
- Journeys that depend on BROKEN pipelines should be marked as "EXPECTED TO FAIL — pipeline PL-XX is broken"

## Journey Definitions

Define 5-10 journeys. Each journey covers a critical user workflow.

### Journey Selection Criteria

```
PRIORITIZE journeys that:
1. Touch Tier A (data-mutating) buttons
2. Cross multiple pages (test navigation + data persistence)
3. Verify data created on one page appears correctly on another
4. Cover the complete lifecycle of a feature (start → use → complete)
5. Exercise the most common user workflows

SKIP journeys that:
1. Only test Tier C (UI chrome) interactions
2. Duplicate coverage from logic/pipeline tests
3. Require features that are known UNIMPLEMENTED
```

### Journey Template

```
JOURNEY J-01: [Name — e.g., "Start and Play First Game of Season"]

GOAL: What the user is trying to accomplish
PREREQUISITES: What state the app must be in before starting
SEED STATE: [description of programmatic state setup]

STEPS:
1. Navigate to [page]
   ASSERT: [what should be visible]
2. Click [button/link]
   ASSERT: [what should happen — page change, modal, data update]
3. Fill [form/input] with [value]
   ASSERT: [validation, preview, etc.]
4. Click [submit/confirm]
   ASSERT: [success state — data persisted, navigation occurred]
5. Navigate to [different page]
   ASSERT: [data from steps 1-4 is correctly displayed here]

FINAL ASSERTION: [the overall outcome that proves the journey succeeded]

EXPECTED FAILURES: [if any steps are known-broken from audit/trace, list them]
```

### Recommended Journeys

**Adapt these based on what the button audit and pipeline trace revealed actually exists:**

```
J-01: Season Initialization
  Start a new season → configure teams → verify initial standings are all 0-0
  Tests: season creation pipeline, standings initialization

J-02: Record First Game and Verify Stats
  Navigate to GameTracker → start a game → record a few at-bats → end game
  → Navigate to stats page → verify player stats reflect the game
  Tests: GameTracker → stats pipeline, cross-page data persistence

J-03: Mid-Season Stats Verification  
  Seed: 40 games played (via simulator output or programmatic setup)
  Navigate to standings → verify standings match game results
  Navigate to stats leaders → verify leader board shows correct players
  Navigate to player detail → verify individual stats are correct
  Tests: accumulated state display, sorting, filtering

J-04: Roster Management
  Navigate to roster page → attempt to add/remove/move a player
  Verify roster changes persist → verify changes appear in lineup
  Tests: roster management pipeline, data persistence

J-05: WAR Leaderboard Verification
  Seed: 81 games played
  Navigate to WAR leaderboard → verify WAR values are displayed
  Check: are values reasonable for half-season? (not 0, not 50)
  Navigate to player detail → verify WAR breakdown matches
  Tests: WAR calculation pipeline, display accuracy

J-06: Season Completion
  Seed: 161 games played
  Record final game → verify season marked as complete
  Verify final standings → verify playoff seeding (if applicable)
  Tests: season completion logic, end-of-season state

J-07: Navigation Integrity
  Visit every non-GameTracker page via direct navigation
  Verify: no crashes, no blank pages, no loading spinners that never resolve
  Tests: routing, lazy loading, error boundaries

J-08: Error Handling
  Try invalid actions: start season without teams, record game without lineup
  Verify: appropriate error messages, no crashes, no data corruption
  Tests: validation, error states, defensive coding

J-09: Data Persistence Across Sessions
  Record a game → close the app → reopen → verify data persists
  Tests: storage layer, data loading on startup

J-10: Edge Case Display
  Seed: player with 0 AB (show .000 not NaN), player with extreme stats
  Verify: stat displays handle edge cases without visual glitches
  Tests: display formatting, edge case handling
```

## State Seeding

### Why Seeding Is Necessary

Journeys J-03 through J-06 require a specific starting state (e.g., "40 games played"). Getting to that state through the UI would take hours. State seeding gets there in seconds.

### Seeding Architecture

```typescript
// test-utils/seed-state.ts

import { /* storage/engine functions from FRANCHISE_API_MAP.md */ } from '...';

interface SeedConfig {
  gamesPlayed: number;
  teams: number;
  playersPerTeam: number;
  // Additional configuration
}

async function seedState(config: SeedConfig): Promise<void> {
  // 1. Initialize a league (using actual engine functions)
  // 2. Generate N synthetic games (same generator as season-simulator)
  // 3. Process each game through the completion pipeline
  // 4. Verify coherence after seeding (same checks as simulator)
  // 5. State is now "as if" N games were played through the UI
}

// Pre-built seed configurations for each journey
export const SEEDS = {
  'J-03': { gamesPlayed: 40, teams: 8, playersPerTeam: 25 },
  'J-05': { gamesPlayed: 81, teams: 8, playersPerTeam: 25 },
  'J-06': { gamesPlayed: 161, teams: 8, playersPerTeam: 25 },
};
```

**IMPORTANT:** The seed script uses the SAME game generator and processor as the season-simulator. If the simulator's preflight proof passed, seeding will work. If the simulator hasn't been run yet, run its preflight proof first.

### If Seeding Isn't Possible

If the pipeline is React-coupled (Mode C/D) and seeding requires mounted components:

**Fallback approach:** Test only journeys that don't require pre-existing state:
- J-01 (season init — starts from scratch)
- J-02 (first game — only needs an initialized season)
- J-07 (navigation — no state dependency)
- J-08 (error handling — no state dependency)

Mark J-03 through J-06 and J-09 through J-10 as "REQUIRES SEEDING — deferred until pipeline is extractable."

## Playwright Script Structure

Each journey is a separate Playwright test file:

```typescript
// tests/journeys/j01-season-init.spec.ts
import { test, expect } from '@playwright/test';
// import { seedState, SEEDS } from '../../test-utils/seed-state';

test.describe('J-01: Season Initialization', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173');
    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('can start a new season with teams', async ({ page }) => {
    // Step 1: Navigate to season setup
    await page.click('[data-testid="start-season"]'); // or whatever selector
    await expect(page.locator('[data-testid="season-setup"]')).toBeVisible();

    // Step 2: Configure teams
    // ... click through team setup

    // Step 3: Verify initial state
    await page.click('[data-testid="standings-link"]');
    
    // STATE ASSERTION (not just visual):
    const standingsData = await page.evaluate(() => {
      // Read from the app's state management
      // This accesses the same data the component reads
      return window.__APP_STATE__?.standings; // or however state is exposed
    });
    
    expect(standingsData).toBeDefined();
    expect(standingsData.length).toBeGreaterThan(0);
    expect(standingsData.every(t => t.wins === 0 && t.losses === 0)).toBe(true);

    // VISUAL ASSERTION (bonus):
    await expect(page.locator('.standings-table')).toContainText('0-0');
  });
});
```

### State Assertions vs Visual Assertions

**Always use state assertions as the PRIMARY check:**
```typescript
// PRIMARY: Read component state/props via page.evaluate()
const playerStats = await page.evaluate(() => {
  // Access React component state, Zustand store, or context
  // This tests the DATA, not just what's rendered
  return document.querySelector('[data-component="stats-table"]')?.__reactFiber
    // ... or use a more reliable state access pattern
});
expect(playerStats.battingAvg).toBeCloseTo(0.285, 2);
```

**Use visual assertions as SECONDARY checks:**
```typescript
// SECONDARY: Verify the rendering
await expect(page.locator('.batting-avg')).toContainText('.285');
```

**Why:** Visual assertions are fragile (CSS changes, formatting differences). State assertions test the actual data. If state is correct but visual is wrong, that's a rendering bug. If state is wrong, the logic is broken.

### Accessing App State from Playwright

The test scripts need to read app state. Options (skill should detect which is available):

```typescript
// Option 1: Exposed dev tools (if app has __APP_STATE__ or similar)
const state = await page.evaluate(() => window.__APP_STATE__);

// Option 2: React DevTools fiber tree
const state = await page.evaluate(() => {
  const root = document.getElementById('root');
  const fiber = root?._reactRootContainer?._internalRoot?.current;
  // Navigate fiber tree to find relevant state
});

// Option 3: Zustand store (if used)
const state = await page.evaluate(() => {
  return window.__ZUSTAND_STORE__?.getState();
});

// Option 4: localStorage/IndexedDB (if data is persisted)
const state = await page.evaluate(() => {
  return JSON.parse(localStorage.getItem('kbl-tracker-state') || '{}');
});

// Option 5: DOM-only (fallback — least reliable)
const statsText = await page.locator('.stats-table').innerText();
```

**The skill should determine which option works during preflight proof and use that consistently across all journeys.**

## Dual-Mode Execution

### Mode 1: Seeded (Clean State)

```bash
# Run with clean seeded state
npx playwright test tests/journeys/ --project=seeded
```

- State is programmatically set before each test
- Deterministic — same results every run
- Catches wiring bugs and logic errors
- Fast to run

### Mode 2: Organic (Simulator Output)

```bash
# Run against state accumulated by season-simulator
npx playwright test tests/journeys/ --project=organic
```

- State comes from the season simulator's output (real accumulated data)
- Tests whether the UI handles real messy accumulated data
- May expose bugs that clean data doesn't trigger
- Requires season simulator to have run first

**If organic mode fails where seeded mode passes:** The bug is in data handling under accumulation, not in basic logic. Route to season-simulator findings for diagnosis.

## Output

### Per-Journey Results

```markdown
# Journey Test Results
Generated: [date]
Mode: [seeded / organic / both]

## Summary
| Journey | Steps | Passed | Failed | Skipped | Status |
|---------|-------|--------|--------|---------|--------|
| J-01    | 5     | 5      | 0      | 0       | ✅ PASS |
| J-02    | 8     | 7      | 1      | 0       | ❌ FAIL |
| J-03    | 6     | 0      | 0      | 6       | ⏸ SKIPPED (needs seeding) |
| ...     | ...   | ...    | ...    | ...     | ...     |

## Failures

### J-02 Step 6: Verify player stats on stats page
**Expected:** Player batting average displayed as .285
**Actual:** Stats page shows ".000" for all players
**State assertion:** playerStats.battingAvg = 0.285 (CORRECT in state)
**Visual assertion:** '.batting-avg' contains ".000" (WRONG in display)
**Diagnosis:** Data is correct in state but not rendered. Likely a component 
  not reading from the updated store. See pipeline PL-01 Junction 5 in 
  DATA_PIPELINE_TRACE_REPORT.md.
**Screenshot:** [path to screenshot]

### ...
```

### File Outputs

1. `spec-docs/JOURNEY_TEST_REPORT.md` — human-readable report
2. `tests/journeys/*.spec.ts` — Playwright test scripts (reusable)
3. `test-utils/seed-state.ts` — state seeding script (reusable)
4. `tests/journeys/screenshots/` — failure screenshots
5. Updated `spec-docs/SESSION_LOG.md`

## Scope Boundaries

**DO test:**
- Cross-page data persistence (create on page A, verify on page B)
- Navigation between all non-GameTracker routes
- Error states and validation
- Data display accuracy (state matches visual)

**Do NOT test (covered by other skills):**
- GameTracker at-bat logic (gametracker-logic-tester)
- Calculation accuracy (calculation matrix tests)
- Pipeline integrity (data-pipeline-tracer)
- Accumulated state coherence (season-simulator)

**The journey verifier is the TOP of the testing pyramid.** It catches UX-level bugs that lower layers miss, but it's not meant to be exhaustive. 5-10 well-chosen journeys are more valuable than 50 superficial ones.

## Integrity Checks

1. ✅ Preflight proof passed (Playwright can access the app)
2. ✅ Each journey has explicit assertions (not just "click and hope")
3. ✅ State assertions are PRIMARY, visual assertions are SECONDARY
4. ✅ Known-broken paths from audit/trace are marked as EXPECTED FAILURES
5. ✅ Seeding script works (if applicable) — verified by running 1 seed
6. ✅ All test scripts compile and can be run via `npx playwright test`
7. ✅ Screenshots are captured on failure

## Anti-Hallucination Rules

- Do NOT claim a journey passed without running the Playwright test
- Do NOT write tests that only check visual text — always include state assertions
- Do NOT skip the state seeding preflight — if seeding doesn't work, journeys J-03+ can't run
- Do NOT interactively click through the app — write scripts that run independently
- Do NOT include journeys for features that the button audit marked as DEAD or UNIMPLEMENTED
- If Playwright can't access app state (all 5 options fail), fall back to DOM-based assertions and note the reduced confidence in the report
- Do NOT run more than 10 journeys — focus on quality and coverage, not quantity
