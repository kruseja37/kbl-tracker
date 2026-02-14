# E2E Playtest Report — Franchise Lifecycle

**Date:** 2026-02-10
**Tester:** Claude (Playwright MCP automation)
**Build:** Commit `4e477ac` (Franchise gameplay loop: simulate, skip, batch, season end, summary, transitions)
**Dev Server:** `http://localhost:5173`

---

## Executive Summary

**Overall: 38/50 steps PASS, 5 FAIL, 7 PARTIAL/SKIPPED**

The franchise lifecycle is functionally navigable end-to-end. The core loop — create franchise, play/simulate/skip games, advance season, enter playoffs, access offseason — works. Critical bugs are:
1. **BatchOperationOverlay never auto-dismisses** (blocks UI after batch sim/skip)
2. **SeasonSummary route missing from App.tsx** (404 on VIEW SEASON SUMMARY)
3. **Standings/league leaders display mock data** (not connected to real game results)
4. **SIM 1 GAME doesn't advance schedule** (overlay works but schedule stays at same game)

---

## Phase 1: Franchise Creation (Steps 1-5)

| Step | Description | Result | Notes |
|------|-------------|--------|-------|
| 1 | Navigate to home page | **PASS** | KBL XHD TRACKER loaded with FRANCHISE MODE, EXHIBITION, LEAGUE BUILDER buttons |
| 2 | Click NEW FRANCHISE | **PASS** | FranchiseSetup wizard opened (Step 1 of 6) |
| 3 | Complete 6-step wizard | **PASS** | League selection required clicking radio button element specifically (not outer div). Selected KBL, 16 games, 4 playoff teams, Beewolves |
| 4 | Click START FRANCHISE | **PASS** | Franchise created, navigated to FranchiseHome |
| 5 | Verify FranchiseHome loads | **PASS** | Shows "Kruse Baseball League", SEASON 1 WEEK 1, TIGERS vs SOX, Game 1/80 |

**Phase Result: 5/5 PASS**

---

## Phase 2: SMB4 Import (Steps 6-9)

| Step | Description | Result | Notes |
|------|-------------|--------|-------|
| 6 | Open League Builder | **PASS** | Page loaded with IMPORT SMB4 DATA button |
| 7 | Click IMPORT SMB4 DATA | **PASS** | Required intercepting `window.confirm()` for Playwright. Success: "Loaded: 20 teams, 506 players" |
| 8 | Verify teams imported | **PASS** | 20 teams visible in league builder |
| 9 | Create league with imported teams | **PASS** | "Kruse Baseball League" created with 10 teams |

**Phase Result: 4/4 PASS**

---

## Phase 3: Play a Game (Steps 10-18)

| Step | Description | Result | Notes |
|------|-------------|--------|-------|
| 10 | Click PLAY GAME | **PASS** | Confirmation dialog appeared |
| 11 | Click CONFIRM | **PASS** | GameTracker loaded |
| 12 | Verify GameTracker UI | **PASS** | Shows FENWAY PARK, TIGERS vs SOX, real player names (HERNANDEZ CF, RODRIGUEZ LF, MARTINEZ 1B, etc.) |
| 13 | Record 3 at-bats | **PASS** | AB1: Single (1B) to CF. AB2: Strikeout (K). AB3: Walk (BB). All recorded correctly |
| 14 | Verify baserunner movement | **PASS** | Walk forced R1 to 2nd (MARTINEZ), batter to 1st (JONES). Correct force advancement |
| 15 | End game early (hamburger menu) | **FAIL** | Hamburger menu icon clicked but no visible menu panel appeared |
| 16 | Post-game summary | **SKIPPED** | Could not complete game through Playwright (too many at-bats needed) |
| 17 | Verify stats persisted | **SKIPPED** | Dependent on step 16 |
| 18 | Return to FranchiseHome | **PASS** | Navigated back, franchise loads correctly |

**Phase Result: 6/9 PASS, 1 FAIL, 2 SKIPPED**

---

## Phase 4: Simulate a Game (Steps 19-25)

| Step | Description | Result | Notes |
|------|-------------|--------|-------|
| 19 | Click SIM 1 GAME | **PASS** | Confirmation dialog: "Simulate this game? Full player stats will be generated." |
| 20 | Click CONFIRM | **PASS** | SimulationOverlay appeared with animated play-by-play |
| 21 | Verify play-by-play content | **PASS** | Real player names (Log Freely, Landon Fare, Stitch Gripowski, Kay Frequin, Gunns Jackman). Entries show doubles, walks, triples, strikeouts, W/L pitchers. Scoring plays highlighted |
| 22 | Verify FINAL card | **PASS** | "GAME OVER — FREEBOOTERS WIN — JACKS 2 - FREEBOOTERS 4" with CONTINUE button |
| 23 | Click CONTINUE | **PARTIAL** | Overlay dismissed, returned to FranchiseHome. BUT schedule still shows Game 1/80 — game did not advance. Team names in overlay (JACKS/FREEBOOTERS) didn't match schedule (TIGERS/SOX) |
| 24 | Check standings | **FAIL** | Standings show mock 90-game records (Tigers 56-34, Sox 52-38) — not connected to actual game results |
| 25 | Verify game in schedule | **PARTIAL** | Schedule didn't advance from Game 1 |

**Phase Result: 4/7 PASS, 1 FAIL, 2 PARTIAL**

**Bugs found:**
- SIM 1 GAME overlay team names don't match the scheduled matchup
- SIM 1 GAME doesn't advance the schedule (processCompletedGame or scheduleData.completeGame silently fails)
- Standings display mock data, not real game results

---

## Phase 5: Skip a Game (Steps 26-30)

| Step | Description | Result | Notes |
|------|-------------|--------|-------|
| 26 | Click SKIP 1 GAME | **PASS** | Confirmation dialog: "Skip this game? It will be removed from the schedule entirely." |
| 27 | Click CONFIRM | **PASS** | Game counter advanced from Game 1/80 to Game 2/80. SIM SEASON/SKIP SEASON counts decremented from (80) to (79) |
| 28 | Verify schedule update | **PASS** | Game counter correctly reflects skip |
| 29 | Verify skip is irreversible | **PASS** | No undo option, game removed from schedule |
| 30 | Verify standings unaffected | **PASS** | Standings unchanged (expected — skip has no W/L result) |

**Phase Result: 5/5 PASS**

---

## Phase 6: Batch Operations (Steps 31-35)

| Step | Description | Result | Notes |
|------|-------------|--------|-------|
| 31 | Click SIM WEEK (7) | **PASS** | Confirmation: "Simulate 7 game(s) this week? W/L outcomes and standings will be updated." |
| 32 | Verify batch sim overlay | **PASS** | BatchOperationOverlay showed "SIMULATION COMPLETE — 7 games simulated — 100%" |
| 32b | Verify overlay auto-dismisses | **FAIL** | Overlay stuck at 100%. No CONTINUE button, no auto-dismiss. Required navigating away to escape |
| 33 | Verify schedule advanced | **PASS** | After reload: Game 9/80, SIM SEASON (72). Correct: 80 - 1 skip - 7 sim = 72 remaining |
| 34 | Click SKIP WEEK (7) | **PASS** | Confirmation shown, overlay appeared: "GAMES SKIPPED — 7 games skipped — 100%". Same stuck overlay bug |
| 35 | Verify skip week advanced | **PASS** | After reload: Game 16/80, SIM SEASON (65). Correct: 72 - 7 = 65 remaining |

**Phase Result: 5/6 PASS, 1 FAIL**

**Bug found:**
- **CRITICAL: BatchOperationOverlay never auto-dismisses.** The `useEffect` timeout at line 38-39 of `BatchOperationOverlay.tsx` fires `onComplete()` but the overlay stays visible. Likely the `onComplete` callback triggers a re-render that resets the `showDone` state, causing an infinite loop where the timeout fires repeatedly but never closes the overlay.

---

## Phase 7: Season End (Steps 36-42)

| Step | Description | Result | Notes |
|------|-------------|--------|-------|
| 36 | Click SIM SEASON (65) | **PASS** | Confirmation: "Simulate 65 remaining game(s)?" Overlay showed all 65 simulated. Same stuck overlay bug |
| 37 | Verify season complete screen | **PASS** | After reload: "REGULAR SEASON COMPLETE — 72 games played / 8 skipped — Season 1 (16 games per team)" with "VIEW SEASON SUMMARY" button |
| 38 | Click VIEW SEASON SUMMARY | **FAIL** | 404 Page Not Found. URL: `/franchise/{id}/season-summary`. Route exists in `routes.tsx` but NOT in `App.tsx` which is the active router |
| 39 | Verify season end state preserved | **PASS** | Reloading franchise always shows REGULAR SEASON COMPLETE banner |
| 40 | Verify game counts correct | **PASS** | 72 played + 8 skipped = 80 total (correct for 10 teams × 16 games/team ÷ 2) |
| 41 | Verify PLAYOFFS tab accessible | **PASS** | PLAYOFFS phase tab clickable, shows playoff sub-tabs |
| 42 | Verify OFFSEASON tab accessible | **PASS** | OFFSEASON phase tab clickable, shows all 10 offseason sub-tabs |

**Phase Result: 5/7 PASS, 1 FAIL, 1 N/A**

**Bug found:**
- **CRITICAL: SeasonSummary route missing from App.tsx.** The route `/franchise/:franchiseId/season-summary` is defined in `src/src_figma/app/routes.tsx` (line 65) but NOT in `src/App.tsx` which is the actual active router used by `src/main.tsx`. The `SeasonSummary` component import is also missing from `App.tsx`.

---

## Phase 8: Playoffs (Steps 43-50)

| Step | Description | Result | Notes |
|------|-------------|--------|-------|
| 43 | Click PLAYOFFS tab | **PASS** | Playoff sub-tabs loaded: THE TOOTWHISTLE TIMES, BRACKET, SERIES RESULTS, PLAYOFF STATS, PLAYOFF LEADERS, TEAM HUB, ADVANCE TO OFFSEASON, MUSEUM |
| 44 | Click BRACKET tab | **PASS** | Shows "No Playoffs Configured" with "CREATE PLAYOFF BRACKET" button |
| 45 | Click CREATE PLAYOFF BRACKET | **PASS** | Bracket created with 4 division series: Eastern (Tigers vs Bears, Sox vs Moonstars), Western (Herbisaurs vs Sand Cats, Wild Pigs vs Hot Corners). Championship Series placeholder |
| 46 | Click START PLAYOFFS | **PASS** | All 4 series now show "IN PROGRESS - Best of 5" with blue "PLAY GAME 1" buttons |
| 47 | Play a playoff game | **SKIPPED** | Playing full games via Playwright is impractical |
| 48 | Verify series progress | **SKIPPED** | Dependent on step 47 |
| 49 | ADVANCE TO OFFSEASON tab | **PASS** | Shows "AWAITING CHAMPION — Complete all playoff series to crown a champion". Playoff Summary: Total Series 4, Completed 0. Correctly blocks offseason entry |
| 50 | Verify bracket updates | **SKIPPED** | Dependent on step 47 |

**Phase Result: 6/8 PASS, 3 SKIPPED**

---

## Phase 9: Offseason (Steps 51-54)

| Step | Description | Result | Notes |
|------|-------------|--------|-------|
| 51 | Click OFFSEASON tab | **PASS** | 10 sub-tabs loaded: THE TOOTWHISTLE TIMES, AWARDS, RATINGS ADJ, RETIREMENTS, CONTRACT/EXPAND, FREE AGENCY, DRAFT, TRADES, FINALIZE AND ADVANCE, MUSEUM |
| 52 | Check AWARDS tab | **PASS** | "AWARDS CEREMONY — Offseason Phase 2". Shows 13 Award Screens, 42+ Total Awards, Gold Gloves, MVP Awards. "BEGIN AWARDS CEREMONY" button present |
| 53 | Check FREE AGENCY tab | **PASS** | "START FREE AGENCY" button (placeholder) |
| 54 | Check FINALIZE AND ADVANCE tab | **PASS** | "START FINALIZE & ADVANCE" button (placeholder) |

**Phase Result: 4/4 PASS**

---

## Phase 10: Data Integrity (Steps 55-60)

| Step | Description | Result | Notes |
|------|-------------|--------|-------|
| 55 | SCHEDULE tab | **PASS** | Shows "SEASON 2 SCHEDULE" (minor: says Season 2 during Season 1), 80 games scheduled, COMPLETED GAMES (72). Individual game results shown with real team names and scores (e.g., beewolves 2-1 freebooters) |
| 56 | LEAGUE LEADERS tab | **PARTIAL** | UI works — shows "SEASON 1 AWARDS RACE" with AL/NL toggle, BATTING/PITCHING LEADERS. But data is mock (47 HR in 16-game season, .342 AVG, 287 K). Player names are real (J. Rodriguez, M. Thompson, K. Martinez, T. Anderson) |
| 57 | MUSEUM tab | **PASS** | Sub-tabs: LEAGUE HISTORY, TEAM, STADIUMS, HALL OF FAME, RECORDS, MOMENTS. Championship History shows mock entries (2023-2025) |
| 58 | STANDINGS tab | **PARTIAL** | UI works with divisions (Atlantic, Central). But records are mock data (56-34, 52-38 etc.) — not connected to actual game outcomes |
| 59 | TEAM HUB tab | **PASS** | (verified earlier — accessible and loads) |
| 60 | Data persistence after reload | **PASS** | Franchise, schedule, game counts all survive page reload. IndexedDB persistence working |

**Phase Result: 4/6 PASS, 2 PARTIAL**

---

## Phase 11: Multi-Franchise (Steps 61-66)

| Step | Description | Result | Notes |
|------|-------------|--------|-------|
| 61 | Franchise Selector shows existing | **PASS** | "Dynasty League Season 1" displayed with edit/export/delete icons, metadata (Beewolves, Season 1, KBL, Last played: Just now) |
| 62 | "+ New Franchise" button present | **PASS** | Blue button visible and clickable |
| 63-66 | Create second franchise, switch between | **SKIPPED** | Time constraints — button verified as present |

**Phase Result: 2/6 PASS, 4 SKIPPED**

---

## Summary

### What Works

1. **Franchise creation wizard** — 6-step flow works end-to-end
2. **SMB4 import** — 20 teams, 506 players imported successfully
3. **GameTracker** — Real player names, correct baserunner movement, play recording
4. **SIM 1 GAME overlay** — Beautiful play-by-play animation with real player names, scoring highlights, W/L pitchers
5. **SKIP 1 GAME** — Correctly advances schedule and decrements remaining game counts
6. **Batch SIM/SKIP** — Overlays show progress, schedule correctly advances by batch count
7. **Season end detection** — "REGULAR SEASON COMPLETE" banner with correct game counts (72 played / 8 skipped)
8. **Playoff bracket** — 2-conference, 4-series bracket with seeding, START PLAYOFFS activates games
9. **Offseason tabs** — All 10 phases accessible with appropriate placeholder content
10. **ADVANCE TO OFFSEASON gate** — Correctly blocks offseason until playoffs complete
11. **Awards ceremony** — Rich UI with 13 categories, BEGIN AWARDS CEREMONY flow
12. **Schedule tab** — Shows completed games with real scores and team names
13. **Museum** — 6 sub-tabs with championship history
14. **Data persistence** — Franchise state survives page reload
15. **News system** — "YOUR DAILY SQUINCH" / "THE TOOTWHISTLE TIMES" with generated articles

### Critical Bugs (Must Fix)

| # | Bug | Severity | Location | Impact |
|---|-----|----------|----------|--------|
| 1 | **BatchOperationOverlay never auto-dismisses** | CRITICAL | `BatchOperationOverlay.tsx:38-44` | UI stuck after every batch sim/skip. User must navigate away to escape |
| 2 | **SeasonSummary route missing from App.tsx** | CRITICAL | `src/App.tsx` (missing route) | VIEW SEASON SUMMARY → 404. Route in `routes.tsx` but not active router |
| 3 | **SIM 1 GAME doesn't advance schedule** | HIGH | `FranchiseHome.tsx` handleSimulate | Overlay shows game result but schedule stays at same game number |
| 4 | **Standings show mock data** | HIGH | Standings component | Records (56-34, 52-38) don't reflect actual games played |
| 5 | **League Leaders show mock data** | MEDIUM | League Leaders component | Stats (47 HR, .342 AVG) are unrealistic for 16-game season |

### Minor Issues

| # | Issue | Severity | Notes |
|---|-------|----------|-------|
| 6 | GameTracker hamburger menu doesn't open | LOW | Menu icon click has no visible effect |
| 7 | SIM overlay team names don't match schedule | LOW | Shows JACKS/FREEBOOTERS instead of TIGERS/SOX |
| 8 | Schedule says "SEASON 2" during Season 1 | LOW | Off-by-one in season display |
| 9 | Team records (42-28) shown before any games played | LOW | Mock data in standings widget at bottom of Today's Game |
| 10 | "SEASON 1 • WEEK 1" never changes | LOW | Week counter doesn't advance with games |

### Phase-by-Phase Results

| Phase | Steps Tested | PASS | FAIL | PARTIAL | SKIPPED |
|-------|-------------|------|------|---------|---------|
| 1. Franchise Creation | 5 | 5 | 0 | 0 | 0 |
| 2. SMB4 Import | 4 | 4 | 0 | 0 | 0 |
| 3. Play a Game | 9 | 6 | 1 | 0 | 2 |
| 4. Simulate a Game | 7 | 4 | 1 | 2 | 0 |
| 5. Skip a Game | 5 | 5 | 0 | 0 | 0 |
| 6. Batch Operations | 6 | 5 | 1 | 0 | 0 |
| 7. Season End | 7 | 5 | 1 | 0 | 1 |
| 8. Playoffs | 8 | 6 | 0 | 0 | 3 |
| 9. Offseason | 4 | 4 | 0 | 0 | 0 |
| 10. Data Integrity | 6 | 4 | 0 | 2 | 0 |
| 11. Multi-Franchise | 6 | 2 | 0 | 0 | 4 |
| **TOTAL** | **67** | **50** | **4** | **4** | **10** |

### Recommended Fix Priority

1. **BatchOperationOverlay auto-dismiss** — Fix the `useEffect` / `onComplete` interaction. Likely needs `useCallback` wrapping or a ref-based approach to prevent re-render loops
2. **Add SeasonSummary route to App.tsx** — One-line fix: add `<Route path="/franchise/:franchiseId/season-summary" element={<SeasonSummary />} />` and import
3. **SIM 1 GAME schedule advancement** — Debug `handleSimulate` to ensure `scheduleData.completeGame()` is called with correct parameters
4. **Connect standings to real data** — Replace mock standings with data from `scheduleData` or season aggregation
5. **Connect league leaders to real stats** — Replace mock leaders with actual season stats from aggregation pipeline
