# UI Flow Crawl Report

**Date:** 2026-02-07
**App URL:** http://localhost:5173
**Pages crawled:** 14 routes
**Tabs tested:** 27 (9 Regular Season + 8 Playoffs + 10 Offseason)
**Flows tested:** 0 (BLOCKED — no league/franchise data in IndexedDB)
**Build baseline:** Clean (0 TS errors)
**Test baseline:** 5,445 pass / 77 fail

---

## Page-by-Page Results

| # | Route | Page | Renders | Data | Interactive | Status | Notes |
|---|-------|------|---------|------|-------------|--------|-------|
| 1 | `/` | AppHome | YES | N/A | YES | WORKS | Load Franchise, New Franchise, Exhibition Game, Playoffs buttons |
| 2 | `/league-builder` | LeagueBuilder | YES | N/A | YES | WORKS | Hub with 6 cards + Import SMB4 button |
| 3 | `/league-builder/leagues` | Leagues | YES | EMPTY | YES | WORKS | "No Leagues Yet" — correct empty state |
| 4 | `/league-builder/teams` | Teams | YES | EMPTY | YES | WORKS | "No Teams Yet" — correct empty state |
| 5 | `/league-builder/players` | Players | YES | EMPTY | YES | WORKS | Search/filter UI, "No Players Yet" |
| 6 | `/league-builder/rosters` | Rosters | YES | EMPTY | N/A | WORKS | Split-pane, "No teams created yet" |
| 7 | `/league-builder/draft` | Draft | YES | PARTIAL | YES | WORKS | Draft config with sliders, "Generate Prospects" |
| 8 | `/league-builder/rules` | Rules | YES | YES | YES | WORKS | 6 presets loaded, 8 settings tabs |
| 9 | `/exhibition` | Exhibition | YES | EMPTY | YES | WORKS | "No leagues found" + link to League Builder |
| 10 | `/franchise/setup` | FranchiseSetup | YES | EMPTY | PARTIAL | WORKS | 6-step wizard, blocked at step 1 (no leagues) |
| 11 | `/franchise/:id` | FranchiseHome | YES | DUMMY | YES | DISCONNECTED | Hardcoded data throughout (see tabs below) |
| 12 | `/game-tracker/:id` | GameTracker | YES | DUMMY | YES | DISCONNECTED | Hardcoded teams/players, full field renders |
| 13 | `/post-game/:id` | PostGameSummary | YES | ERROR | YES | EMPTY | "Failed to load game data" — correct error handling |
| 14 | `/world-series` | WorldSeries | YES | PARTIAL | YES | PARTIAL | Tabs render, hardcoded league names |

---

## FranchiseHome Tab Results

### Regular Season (9 tabs)

| Tab | Label | Renders | Data | Interactive | Status | Notes |
|-----|-------|---------|------|-------------|--------|-------|
| news | THE TOOTWHISTLE TIMES | YES | DUMMY | YES | DISCONNECTED | Generated stories with bylines, categories, filters |
| todays-game | Today's Game | YES | DUMMY | YES | DISCONNECTED | "TIGERS vs SOX", "42-28"/"38-32", "Unknown Stadium", "GAME 71/162" |
| schedule | SCHEDULE | YES | EMPTY | YES | WORKS | "0 games scheduled", +Add Game/+Add Series buttons |
| standings | STANDINGS | YES | DUMMY | YES | DISCONNECTED | Eastern/Western League, division standings — all hardcoded |
| team | TEAM HUB | YES | PARTIAL | YES | PARTIAL | Real team names from IDB, but ALL show "56-34 - 1st" (dummy records) |
| leaders | LEAGUE LEADERS | YES | DUMMY | YES | DISCONNECTED | "Season 1 Awards Race", batting/pitching leaders — hardcoded |
| rosters | TRADES | YES | PARTIAL | YES | PARTIAL | Real players from IDB, salaries show $0.0M |
| allstar | ALL-STAR | YES | DUMMY | YES | DISCONNECTED | Field layout with players, vote counts — hardcoded |
| museum | MUSEUM | YES | DUMMY | YES | DISCONNECTED | 6 sub-tabs, championship history — hardcoded |

### Playoffs (8 tabs)

| Tab | Label | Renders | Data | Interactive | Status | Notes |
|-----|-------|---------|------|-------------|--------|-------|
| news | THE TOOTWHISTLE TIMES | YES | DUMMY | YES | DISCONNECTED | Shared with regular season |
| bracket | BRACKET | YES | EMPTY | YES | WORKS | "No Playoffs Configured" + CTA |
| series | SERIES RESULTS | YES | EMPTY | N/A | WORKS | "No playoff data available" |
| playoff-stats | PLAYOFF STATS | YES | EMPTY | N/A | WORKS | "No playoff data available" |
| playoff-leaders | PLAYOFF LEADERS | YES | EMPTY | N/A | WORKS | "No playoff data available" |
| team | TEAM HUB | YES | PARTIAL | YES | PARTIAL | Shared with regular season |
| advance | ADVANCE TO OFFSEASON | YES | EMPTY | N/A | WORKS | "Awaiting Champion", 0 series |
| museum | MUSEUM | YES | DUMMY | YES | DISCONNECTED | Shared with regular season |

### Offseason (10 tabs)

| Tab | Label | Renders | Data | Interactive | Status | Notes |
|-----|-------|---------|------|-------------|--------|-------|
| news | THE TOOTWHISTLE TIMES | YES | DUMMY | YES | DISCONNECTED | Shared |
| awards | AWARDS | YES | N/A | YES | WORKS | Landing: "BEGIN AWARDS CEREMONY", 13 screens/42+ awards |
| ratings-adj | RATINGS ADJ | YES | PARTIAL | YES | PARTIAL | "Season 4" is DUMMY season number |
| retirements | RETIREMENTS | YES | N/A | YES | WORKS | Landing: "BEGIN RETIREMENT PHASE" |
| contraction | CONTRACT/EXPAND | YES | N/A | YES | WORKS | Landing: "BEGIN CONTRACTION/EXPANSION PHASE" |
| free-agency | FREE AGENCY | YES | N/A | YES | PARTIAL | Only "START FREE AGENCY" button — minimal landing |
| draft | DRAFT | YES | DUMMY | YES | PARTIAL | "SEASON 27 DRAFT" — dummy season number |
| rosters | TRADES | YES | PARTIAL | YES | PARTIAL | Shared |
| finalize | FINALIZE AND ADVANCE | YES | N/A | YES | PARTIAL | Only "START FINALIZE & ADVANCE" — minimal landing |
| museum | MUSEUM | YES | DUMMY | YES | DISCONNECTED | Shared |

---

## Flow Test Results

| Flow | Steps Completed | Where It Broke | Status |
|------|----------------|----------------|--------|
| Flow 1: Exhibition Game | 0/6 | "No leagues found" — need league data | BLOCKED |
| Flow 2: Franchise Creation | 0/4 | Step 1 blocked — no leagues to select | BLOCKED |
| Flow 3: Full Game in Franchise | 0/6 | Requires franchise (blocked by Flow 2) | BLOCKED |
| Flow 4: Season Progression | 0/8 | Requires games played | BLOCKED |
| Flow 5: League Builder → Franchise | Not tested | Requires manual data entry | BLOCKED |

---

## Console Errors Found

| Page/Tab | Error | Severity |
|----------|-------|----------|
| `/franchise/:id` | `[useSeasonData] IDBDatabase: object stores not found` | MEDIUM |
| `/franchise/:id` | `[useFranchiseData] Failed to load standings` (gameStorage:124 → seasonStorage:391) | MEDIUM |
| `/game-tracker/:id` | Same IDB errors as FranchiseHome | MEDIUM |
| `/post-game/:id` | `Failed to load game data` (gameStorage:151 → PostGameSummary:49) | LOW |

**Root cause:** kbl-tracker IDB has 0 object stores. Stores are created lazily but hooks read before stores exist. App degrades gracefully (no crashes, falls back to dummy data).

---

## Summary

| Metric | Count |
|--------|-------|
| Routes rendering without crash | 14/14 (100%) |
| Routes WORKS | 8 |
| Routes PARTIAL | 3 |
| Routes DISCONNECTED | 2 |
| Routes EMPTY (correct) | 1 |
| FranchiseHome tabs total | 27 |
| Tabs WORKS | 10 |
| Tabs PARTIAL | 7 |
| Tabs DISCONNECTED | 10 |

### Key Findings

1. **No crashes** — Every route renders, no white screens or React error boundaries
2. **Dummy data pervasive in FranchiseHome** — 10/27 tabs show hardcoded data
3. **League Builder is clean** — All 7 pages have proper empty states
4. **Playoff empty states are correct** — Bracket, Series, Stats, Leaders handle no-data gracefully
5. **Offseason landing pages vary** — Awards/Retirements/Contraction have rich CTAs; Free Agency/Finalize are minimal
6. **Season numbers hardcoded inconsistently** — "Season 2" (Schedule), "Season 4" (Ratings), "Season 27" (Draft)
7. **IDB lazy init pattern** — Hooks fail silently, fall back to dummy data
8. **Trades tab partially connected** — Real roster data from IDB, but salaries show $0.0M
9. **GameTracker renders fully** — Field, scoreboard, buttons all work, but with dummy teams/players
