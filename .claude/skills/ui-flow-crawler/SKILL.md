---
name: ui-flow-crawler
description: Live crawl of the running KBL Tracker app via Playwright to find broken connections, empty screens, dead buttons, failed navigations, and incomplete flows. Then cross-reference against Figma specs to identify what's missing for 100% app completion. Use when asked to "crawl the UI", "test app flow", "find broken screens", "find empty pages", "test end-to-end", "check what's missing in the app", "find UI gaps", "complete the app", or any request to verify the live app works from a user's perspective. This is DYNAMIC testing (running the app) not STATIC analysis (reading code).
---

# UI Flow Crawler

## Purpose

This skill crawls the LIVE running app like a user would — navigating every page, clicking every button, opening every tab, and documenting what works, what's broken, and what's empty. Then it maps gaps back to Figma specs to create a prioritized completion plan.

**This is different from spec-ui-alignment** which reads code files. This skill RUNS THE APP and tests it visually.

## Architecture Note

**SHARED-SOURCE architecture** — see CLAUDE.md for full details. Key points:
- `@/` alias = `src/src_figma/` (the UI layer)
- Core logic in `src/engines/`, `src/utils/`, `src/types/` — imported by src_figma
- Figma specs in `spec-docs/` describe what the UI SHOULD look like and do

## Playwright MCP Usage

The Playwright MCP server is configured in `.mcp.json`. It provides these key capabilities:
- **Navigate**: Open URLs in the browser
- **Screenshot**: Capture current page state as evidence
- **Click**: Click elements by selector or coordinates
- **Type**: Fill input fields
- **DOM inspection**: Read page structure and element states
- **JavaScript execution**: Run JS in page context (useful for checking console errors)

**How to use in Claude Code:**
- Say "Use playwright to navigate to http://localhost:5173"
- Say "Take a screenshot" to capture current state
- Say "Click the element with text 'SCHEDULE'" to interact
- Say "Run JavaScript in the browser: console.log(document.querySelectorAll('.error'))" to check for errors

**IMPORTANT**: Always start the dev server (`npm run dev`) BEFORE opening the browser. Wait for "Local: http://localhost:5173" to appear in terminal output.

## Pre-Flight

1. Read `spec-docs/CURRENT_STATE.md` for known implementation status
2. Read `references/APP_SCREEN_MAP.md` (in this skill directory) for the full route/tab/flow map
3. Run `npm run build` — must exit 0 (catches type errors that would break the app)
4. Run `npm test` — record baseline pass/fail count for regression comparison later
5. Start dev server in background: `npm run dev &` (or run in a separate terminal)
6. Wait for server to be ready — poll `curl -s http://localhost:5173` or check for "Local: http://localhost:5173" in output
7. Open browser via Playwright MCP to `http://localhost:5173`
8. Take a screenshot of the home page to confirm app is running
9. Check browser console for any startup errors

### Pre-Flight Failure Handling

If any pre-flight step fails:
- **`npm run build` fails:** STOP. Type errors will break the app. Fix them before crawling. Report: "PRE-FLIGHT BLOCKED: Build errors"
- **`npm test` has failures:** Note baseline failures but CONTINUE. Test failures don't block UI crawling.
- **Dev server fails to start:** STOP. Check for port conflicts (5173), missing dependencies, or config errors. Try `npx vite --port 5174` as fallback.
- **Playwright MCP won't connect:** STOP. Verify `.mcp.json` has Playwright configured. Ask user to check MCP server status.
- **Home page shows white screen:** STOP. Check browser console for errors. App is not ready for crawling. Report: "PRE-FLIGHT BLOCKED: App not rendering"
- **Home page loads but shows no data:** CONTINUE but note: "App has no franchise/league data loaded. Phase 2 tabs will show empty states."

**Crawl efficiency tips:**
- Phase 1 routes 1-10 can be tested immediately (no data dependency)
- Phase 1 routes 11-13 REQUIRE data — visit them first to document their empty/error state, then revisit after creating data in Phase 2/3
- Phase 2 requires an active franchise — create one first, then crawl all tabs
- Phase 3 flows: Use this order: Flow 1 (exhibition — simplest, no dependencies, test first) → Flow 2 (create franchise) → Flow 3 (play game in franchise, depends on Flow 2 data)
- Take screenshots BEFORE and AFTER interactions as evidence pairs
- Default tab when opening FranchiseHome is "todays-game" (Today's Game)

## Data Setup

Several routes require existing data in IndexedDB to render:
- `/franchise/:franchiseId` — needs a franchise. Create one via `/franchise/setup`. After creation, the app navigates to `/franchise/<generated-id>`. Note the ID from the URL.
- `/game-tracker/:gameId` — needs an active game. Start one from FranchiseHome → "Today's Game" tab → click "PLAY GAME". Note: GameDayContent currently uses hardcoded `game-123` for navigation — this is dummy data that may not load a real game.
- `/post-game/:gameId` — needs a completed game. Complete a game in GameTracker first.

**IndexedDB Inspection**: To verify CONNECTED status, run JavaScript in the browser to inspect IndexedDB directly:
```
// Check if data exists
const request = indexedDB.open('kbl-tracker', 2);
request.onsuccess = (e) => { const db = e.target.result; console.log('Stores:', [...db.objectStoreNames]); };

// Check league builder data
const request2 = indexedDB.open('kbl-league-builder', 1);
request2.onsuccess = (e) => { const db = e.target.result; console.log('LB Stores:', [...db.objectStoreNames]); };
```

## What to Look For

At every screen, assess these 6 dimensions:

### 1. RENDERS — Does the page load without errors?
- No white screen / crash
- No React error boundary
- No console errors (check via Playwright console access)
- Layout renders with correct structure

### 2. DATA — Is real data displayed, or is it empty/placeholder?
- Are lists populated or showing "No data" / empty arrays?
- Do numbers show real values or 0/placeholder?
- Do player/team names appear or show "Unknown" / IDs?
- Are charts/graphs rendering with data points?

### 3. INTERACTIVE — Do buttons/inputs/tabs actually work?
- Click every button — does something happen?
- Toggle every tab — does content change?
- Fill forms — do they submit?
- Click navigation links — do they go somewhere?

### 4. FLOW — Can you complete the full user journey?
- Can you start a new franchise from scratch?
- Can you play a full exhibition game start to finish?
- Can you navigate through a full season cycle?
- Does every "next step" in a wizard actually lead somewhere?

### 5. CONNECTED — Is the screen wired to real data sources?
- After recording a game, do stats appear on the franchise page?
- After making a trade, does the roster update?
- After completing a season, does the offseason flow start?

### 6. SPEC-COMPLETE — Does the screen match its Figma spec?
- Are all elements from the spec present?
- Are interactions working as spec describes?
- Are any spec features completely missing from the UI?

## Crawl Protocol

### Phase 1: Top-Level Page Crawl

Visit every route. Screenshot each. Assess RENDERS and DATA.

```
ROUTE CRAWL ORDER:
1. /                           → AppHome
2. /league-builder             → LeagueBuilder hub
3. /league-builder/leagues     → LeagueBuilderLeagues
4. /league-builder/teams       → LeagueBuilderTeams
5. /league-builder/players     → LeagueBuilderPlayers
6. /league-builder/rosters     → LeagueBuilderRosters
7. /league-builder/draft       → LeagueBuilderDraft
8. /league-builder/rules       → LeagueBuilderRules
9. /exhibition                 → ExhibitionGame (team selection)
10. /franchise/setup           → FranchiseSetup wizard
11. /franchise/:franchiseId    → FranchiseHome (requires active franchise — see Data Setup below)
12. /game-tracker/:gameId      → GameTracker (requires active game — start one via Today's Game tab)
13. /post-game/:gameId         → PostGameSummary (requires completed game)
14. /world-series              → WorldSeries

For each route:
  - Navigate to it
  - Screenshot
  - Check console for errors
  - Assess: RENDERS? DATA? Any visible problems?
  - Record findings
```

### Phase 2: FranchiseHome Deep Crawl

FranchiseHome is the app's main hub with 27 tabs across 3 seasonal phases. This is where most gaps will be.

**Requires**: An active franchise. If none exists, create one through FranchiseSetup first.

**Tab selection**: Tabs render as buttons with the `label` text. Use Playwright to click the button text.
**Season phase**: Switch phases via the REGULAR SEASON / PLAYOFFS / OFFSEASON toggle buttons at the top.

**Rendering Patterns** (how tab content appears):
- **Dedicated component**: Tab content renders a named React component directly
- **Inline JSX**: Tab content is JSX written directly in FranchiseHome.tsx (no separate component)
- **Trigger → Modal**: Tab shows a LANDING PAGE with info + a CTA button. Clicking that button opens the actual flow component as a modal overlay.
- **Trigger → Inline**: Tab shows a LANDING PAGE with a CTA button. Clicking shows the flow component inline below.

**IMPORTANT — Offseason Tabs**: Most offseason tabs use the Trigger → Modal/Inline pattern. **You MUST click the CTA button to test the actual flow, not just the tab.** The landing page alone is NOT the full test.

```
REGULAR SEASON TABS (9):
  Tab ID          | Label               | Renders                    | Type
  --------------- | ------------------- | -------------------------- | --------------------
  news            | THE TOOTWHISTLE TIMES | BeatReporterNews          | Dedicated component (defined in same file)
  todays-game     | Today's Game        | GameDayContent              | Dedicated component (defined in same file, has hardcoded mock data)
  schedule        | SCHEDULE            | ScheduleContent (with props)| Dedicated component
  standings       | STANDINGS           | StandingsContent            | Dedicated component (defined in same file)
  team            | TEAM HUB            | TeamHubContent              | Dedicated component
  leaders         | LEAGUE LEADERS      | LeagueLeadersContent        | Dedicated component (defined in same file)
  rosters         | TRADES              | TradeFlow                   | Dedicated component (NOTE: tab ID is "rosters" but label says "TRADES")
  allstar         | ALL-STAR            | Inline JSX (baseball field layout with all-star voting by position)
  museum          | MUSEUM              | MuseumContent               | Dedicated component

PLAYOFF TABS (8):
  Tab ID          | Label               | Renders                    | Type
  --------------- | ------------------- | -------------------------- | --------------------
  news            | THE TOOTWHISTLE TIMES | BeatReporterNews          | Dedicated component (shared with regular)
  bracket         | BRACKET             | Inline JSX (create bracket button OR bracket visualization)
  series          | SERIES RESULTS      | Inline JSX (series grouped by round with game results)
  playoff-stats   | PLAYOFF STATS       | Inline JSX (team records table + top performers placeholder)
  playoff-leaders | PLAYOFF LEADERS     | Inline JSX (batting/pitching leader cards — placeholder until games tracked)
  team            | TEAM HUB            | TeamHubContent              | Dedicated component (shared with regular)
  advance         | ADVANCE TO OFFSEASON | Inline JSX (playoff summary + "PROCEED TO OFFSEASON" button, disabled until playoffs complete)
  museum          | MUSEUM              | MuseumContent               | Dedicated component (shared with regular)

OFFSEASON TABS (10):
  Tab ID          | Label               | Renders                    | Type
  --------------- | ------------------- | -------------------------- | --------------------
  news            | THE TOOTWHISTLE TIMES | BeatReporterNews          | Dedicated component (shared)
  awards          | AWARDS              | Landing page → click "BEGIN AWARDS CEREMONY" → AwardsCeremonyFlow modal | Trigger → Modal
  ratings-adj     | RATINGS ADJ         | Landing page → click "END-OF-SEASON RATINGS ADJUSTMENTS" card → RatingsAdjustmentFlow modal | Trigger → Modal
  retirements     | RETIREMENTS         | Landing page → click "BEGIN RETIREMENT PHASE" → RetirementFlow modal | Trigger → Modal
  contraction     | CONTRACT/EXPAND     | Landing page → click "BEGIN CONTRACTION/EXPANSION PHASE" → ContractionExpansionFlow modal | Trigger → Modal
  free-agency     | FREE AGENCY         | Landing page → click "START FREE AGENCY" → FreeAgencyFlow (shows inline below button) | Trigger → Inline
  draft           | DRAFT               | Landing page → click "START →" → DraftFlow modal | Trigger → Modal
  rosters         | TRADES              | TradeFlow                   | Dedicated component (shared, tab ID is "rosters")
  finalize        | FINALIZE AND ADVANCE | Landing page → click "START FINALIZE & ADVANCE" → FinalizeAdvanceFlow (shows inline) | Trigger → Inline
  museum          | MUSEUM              | MuseumContent               | Dedicated component (shared)

For each tab:
  - Click the tab button (use the LABEL text, e.g., click "THE TOOTWHISTLE TIMES" not "news")
  - Screenshot the initial render
  - If tab is Trigger → Modal type: ALSO click the CTA button, screenshot the modal/flow
  - Assess: RENDERS? DATA? INTERACTIVE?
  - Click every button/action within the tab content
  - Record: WORKS / EMPTY / BROKEN / PARTIAL
```

### Phase 3: Critical Flow Testing

Test complete user journeys end-to-end:

```
FLOW 1: Exhibition Game (simplest, no dependencies, test first)
  AppHome → Exhibition → Select teams → Start game →
  GameTracker → Record at-bats → Complete game →
  PostGameSummary → Back to home
  VERIFY: Game data persists, stats recorded

FLOW 2: Franchise Creation
  AppHome → New Franchise → FranchiseSetup wizard →
  Select league → Configure settings → Create →
  FranchiseHome (Regular Season)
  VERIFY: Franchise created in IndexedDB, teams/rosters loaded

FLOW 3: Full Game in Franchise
  FranchiseHome → Today's Game → Start →
  GameTracker → Play full game → End game →
  PostGameSummary → Return to franchise
  VERIFY: Game result in standings, player stats updated, schedule advanced

FLOW 4: Season Progression
  FranchiseHome (Regular Season) → Complete games →
  Reach playoffs → Playoff bracket →
  WorldSeries → Season end →
  Offseason tabs (Awards → Ratings → Retirements → etc.) →
  Finalize → New season
  VERIFY: Full cycle completes without breaking

FLOW 5: League Builder → Franchise
  LeagueBuilder → Create league → Add teams → Add players →
  Set rosters → Configure rules →
  Start franchise from this league
  VERIFY: Custom league data carries into franchise
```

### Phase 4: Figma Spec Gap Analysis

For each Figma spec, verify the live app implements what the spec describes.

```
For each FIGMA spec in spec-docs/:
  1. Read the spec — extract all described UI elements, flows, interactions
  2. Navigate to the corresponding screen in the live app
  3. Compare:
     - Element exists in spec but NOT in app → MISSING
     - Element exists in app but NOT in spec → UNDOCUMENTED (may be fine)
     - Element exists in both but behaves differently → DIVERGED
     - Element exists and matches → ALIGNED
  4. For MISSING items, classify:
     - Is the backend code implemented? (check src/)
     - Is ONLY the UI missing?
     - Is everything missing (no code at all)?
```

**Figma specs to cross-reference:**

| Figma Spec | Live Screen |
|-----------|-------------|
| `LEAGUE_BUILDER_FIGMA_SPEC.md` | /league-builder/* (7 pages) |
| `SEASON_SETUP_FIGMA_SPEC.md` | /franchise/setup |
| `SCHEDULE_SYSTEM_FIGMA_SPEC.md` | FranchiseHome → Schedule tab |
| `TRADE_FIGMA_SPEC.md` | FranchiseHome → Trades tab |
| `FREE_AGENCY_FIGMA_SPEC.md` | FranchiseHome → Free Agency tab (offseason) |
| `DRAFT_FIGMA_SPEC.md` | FranchiseHome → Draft tab (offseason) |
| `AWARDS_CEREMONY_FIGMA_SPEC.md` | FranchiseHome → Awards tab (offseason) |
| `EOS_RATINGS_FIGMA_SPEC.md` | FranchiseHome → Ratings Adj tab (offseason) |
| `RETIREMENT_FIGMA_SPEC.md` | FranchiseHome → Retirements tab (offseason) |
| `CONTRACTION_EXPANSION_FIGMA_SPEC.md` | FranchiseHome → Contract/Expand tab (offseason) |
| `FINALIZE_ADVANCE_FIGMA_SPEC.md` | FranchiseHome → Finalize tab (offseason) |
| `PLAYOFFS_FIGMA_SPEC.md` | FranchiseHome → Playoff phase tabs |
| `SEASON_END_FIGMA_SPEC.md` | Season → Offseason transition |
| `SUBSTITUTION_FLOW_SPEC.md` | GameTracker → Substitution modals (6 types) |
| `FIGMA_GAMETRACKER_IMPLEMENTATION_PLAN.md` | GameTracker implementation plan |
| `KBL_TRACKER_FIGMA_MAKE_PROMPT_V2.md` | Global design system (aesthetic, layout) |
| `FIGMA_BLURB_FREE_AGENCY_EXCHANGE.md` | Supporting doc for Free Agency (no separate live screen) |
| `LEGACY_VS_FIGMA_AUDIT.md` | Reference: legacy vs Figma comparison (no live screen) |

## Classification of Findings

| Status | Definition | Example |
|--------|-----------|---------|
| **WORKS** | Screen renders, has data, interactions function | Schedule tab shows games, clicking a game opens it |
| **EMPTY** | Screen renders but shows no data / blank content | Leaders tab loads but shows empty table |
| **BROKEN** | Screen crashes, errors, or produces wrong result | Clicking "Start Game" throws error |
| **PARTIAL** | Some elements work, others don't | Trade tab shows teams but submit does nothing |
| **DEAD** | Button/link exists but has no effect at all | "View Details" button with no handler |
| **MISSING** | Figma spec describes it but UI doesn't exist | Spec shows salary cap display, not in app |
| **DISCONNECTED** | UI exists but isn't wired to data | Stats page shows component but all values are 0 |
| **BLOCKED** | Cannot test — requires prior data/state that doesn't exist | GameTracker requires active game but none created yet |

## Output

Produce TWO reports:

### Report 1: UI Crawl Results

Save to `spec-docs/UI_FLOW_CRAWL_REPORT.md`:

```
# UI Flow Crawl Report
Date: [date]
App URL: http://localhost:5173
Pages crawled: [count]
Tabs tested: [count]
Flows tested: [count]

## Page-by-Page Results
| Route | Page | Renders | Data | Interactive | Status | Notes |
|-------|------|---------|------|-------------|--------|-------|

## FranchiseHome Tab Results
### Regular Season
| Tab | Renders | Data | Interactive | Status | Notes |
|-----|---------|------|-------------|--------|-------|

### Playoffs
| Tab | Renders | Data | Interactive | Status | Notes |
|-----|---------|------|-------------|--------|-------|

### Offseason
| Tab | Renders | Data | Interactive | Status | Notes |
|-----|---------|------|-------------|--------|-------|

## Flow Test Results
| Flow | Steps Completed | Where It Broke | Status |
|------|----------------|----------------|--------|

## Console Errors Found
| Page/Tab | Error | Severity |
|----------|-------|----------|
```

### Report 2: Figma Spec Completion Map

Save to `spec-docs/FIGMA_COMPLETION_MAP.md`:

```
# Figma Spec Completion Map
Date: [date]

## Overall Completion
- Total Figma spec requirements: [X]
- Implemented and working: [Y] ([%])
- Implemented but broken/empty: [Z] ([%])
- Missing entirely: [W] ([%])

## Per-Spec Breakdown
### [Spec Name]
| Requirement | Status | Code Exists? | UI Exists? | Data Connected? | Gap Type |
|------------|--------|-------------|-----------|----------------|----------|

## Priority Gap List (What to Build Next)
### Tier 1: Code exists, just needs wiring
[list — lowest effort, highest impact]

### Tier 2: UI exists but empty/broken
[list — needs data connection or bug fixes]

### Tier 3: Completely missing
[list — needs full implementation]

## Recommended Build Order
[Ordered list of what to implement to reach 100% app flow]
```

## Anti-Hallucination Rules

- Do NOT claim a screen works without actually navigating to it and screenshotting
- Do NOT assume a tab has content without clicking it
- Do NOT skip a flow because "it probably works"
- Do NOT mark something as WORKS if it shows placeholder/dummy data — that's DISCONNECTED
- Take screenshots as evidence for every finding
- If you can't reach a screen (requires data that doesn't exist), document it as BLOCKED, not WORKS
- If a flow requires multiple screens, test the ENTIRE flow, not just the first screen
- Check the console for errors on EVERY page/tab, even if it looks fine visually
- For offseason tabs with Trigger → Modal pattern: the LANDING PAGE alone is not enough — you MUST click the CTA button and test the modal/flow
- Hardcoded team names (e.g., "TIGERS vs SOX"), IDs (e.g., `game-123`), or records (e.g., "42-28") indicate DUMMY DATA, not real connected data — mark as DISCONNECTED
- React error boundaries show a fallback UI (usually a simple error message) — do NOT confuse this with normal content
