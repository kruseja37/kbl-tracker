# Figma Spec Completion Map

**Date:** 2026-02-07
**Source:** UI Flow Crawl (Playwright live testing) + spec-ui-alignment audit
**Cross-referenced against:** 18 Figma/spec documents

---

## Overall Completion

- **Total Figma spec requirements assessed:** ~120 UI elements/flows across 16 specs
- **Implemented and working:** ~55 (46%)
- **Implemented but disconnected/dummy:** ~45 (37%)
- **Missing or broken:** ~20 (17%)

---

## Per-Spec Breakdown

### LEAGUE_BUILDER_FIGMA_SPEC.md (7 pages)

| Requirement | Status | UI Exists? | Data Connected? | Gap Type |
|------------|--------|-----------|----------------|----------|
| League creation wizard | WORKS | YES | YES (IDB) | — |
| Team creation/edit | WORKS | YES | YES (IDB) | — |
| Player creation/edit | WORKS | YES | YES (IDB) | — |
| Player generator | WORKS | YES | YES | — |
| Roster assignment | WORKS | YES | YES (IDB) | — |
| Draft configuration | WORKS | YES | YES (IDB) | — |
| Rules presets (6 built-in) | WORKS | YES | YES (IDB) | — |
| Import SMB4 data | WORKS | YES | YES | — |

**Score: 8/8 WORKS** — League Builder is the most complete section.

### SEASON_SETUP_FIGMA_SPEC.md (1 page)

| Requirement | Status | UI Exists? | Data Connected? | Gap Type |
|------------|--------|-----------|----------------|----------|
| 6-step wizard | WORKS | YES | PARTIAL | Step 1 blocks without league data |
| League selection | WORKS | YES | YES (reads IDB) | — |
| Season configuration | UNTESTED | YES | UNKNOWN | Blocked by step 1 |
| Playoff configuration | UNTESTED | YES | UNKNOWN | Blocked by step 1 |
| Team selection | UNTESTED | YES | UNKNOWN | Blocked by step 1 |
| Roster confirmation | UNTESTED | YES | UNKNOWN | Blocked by step 1 |

**Score: 1/6 TESTED** — Wizard renders but steps 2-6 untested due to no league data.

### PLAYOFFS_FIGMA_SPEC.md (4 tabs + WorldSeries)

| Requirement | Status | UI Exists? | Data Connected? | Gap Type |
|------------|--------|-----------|----------------|----------|
| Bracket creation | WORKS | YES | YES (playoffStorage) | — |
| Bracket visualization | UNTESTED | YES | UNKNOWN | Requires playoff data |
| Series results display | WORKS (empty) | YES | YES | Correct empty state |
| Playoff statistics | WORKS (empty) | YES | YES | Correct empty state |
| Playoff leaders | WORKS (empty) | YES | YES | Correct empty state |
| Advance to offseason | WORKS | YES | YES | Correctly disabled |
| WorldSeries standalone | PARTIAL | YES | PARTIAL | Hardcoded league names |

**Score: 5/7 WORKS** — Playoff infrastructure is solid; WorldSeries has hardcoded data.

### SCHEDULE_SYSTEM_FIGMA_SPEC.md (1 tab)

| Requirement | Status | UI Exists? | Data Connected? | Gap Type |
|------------|--------|-----------|----------------|----------|
| Schedule grid view | WORKS | YES | YES (scheduleStorage) | — |
| Add single game | WORKS | YES | YES | — |
| Add series (3 games) | WORKS | YES | YES | — |
| Season schedule filter | WORKS | YES | YES | — |
| Game detail modal | UNTESTED | YES | UNKNOWN | No games to click |

**Score: 4/5 WORKS** — Schedule is well-connected.

### TRADE_FIGMA_SPEC.md (1 tab, 2 phases)

| Requirement | Status | UI Exists? | Data Connected? | Gap Type |
|------------|--------|-----------|----------------|----------|
| Two-way trade | PARTIAL | YES | PARTIAL | Players from IDB, salaries $0.0M |
| Three-way trade | PARTIAL | YES | PARTIAL | Same issue |
| Trade evaluation | UNTESTED | YES | UNKNOWN | Need to select players |
| Trade execution | UNTESTED | YES | UNKNOWN | Need to complete trade |
| Trade deadline indicator | MISSING | NO | NO | Spec mentions, not in UI |

**Score: 2/5 PARTIAL** — Core UI works, salaries disconnected, deadline not shown.

### FREE_AGENCY_FIGMA_SPEC.md (1 tab)

| Requirement | Status | UI Exists? | Data Connected? | Gap Type |
|------------|--------|-----------|----------------|----------|
| Landing page | PARTIAL | YES | N/A | Minimal — just a button |
| Free agent pool | UNTESTED | YES | UNKNOWN | Behind CTA button |
| Bidding system | UNTESTED | YES | UNKNOWN | Behind CTA button |
| Signing confirmation | UNTESTED | YES | UNKNOWN | Behind CTA button |

**Score: 1/4 PARTIAL** — Landing page is minimal compared to other offseason tabs.

### DRAFT_FIGMA_SPEC.md (1 tab)

| Requirement | Status | UI Exists? | Data Connected? | Gap Type |
|------------|--------|-----------|----------------|----------|
| Landing page | PARTIAL | YES | DUMMY | "Season 27" is hardcoded |
| 3-step flow | WORKS | YES | PARTIAL | Flow described (Choose Inactive → Draft → Review) |
| Prospect generation | UNTESTED | YES | UNKNOWN | Behind START button |
| Draft execution | UNTESTED | YES | UNKNOWN | Behind START button |

**Score: 1/4 PARTIAL** — Season number dummy, flow untested.

### AWARDS_CEREMONY_FIGMA_SPEC.md (1 tab)

| Requirement | Status | UI Exists? | Data Connected? | Gap Type |
|------------|--------|-----------|----------------|----------|
| Landing page | WORKS | YES | N/A | Rich CTA with 13 screens/42+ awards described |
| Awards flow (13 types) | UNTESTED | YES | UNKNOWN | Behind CTA button |

**Score: 1/2 PARTIAL** — Landing page is excellent; flow untested.

### EOS_RATINGS_FIGMA_SPEC.md (1 tab)

| Requirement | Status | UI Exists? | Data Connected? | Gap Type |
|------------|--------|-----------|----------------|----------|
| Landing page | PARTIAL | YES | DUMMY | "Season 4" hardcoded |
| WAR-based adjustments | UNTESTED | YES | UNKNOWN | Behind CTA |
| Salary updates | UNTESTED | YES | UNKNOWN | Behind CTA |
| Manager bonuses | UNTESTED | YES | UNKNOWN | Behind CTA |

**Score: 1/4 PARTIAL** — Season number dummy.

### RETIREMENT_FIGMA_SPEC.md (1 tab)

| Requirement | Status | UI Exists? | Data Connected? | Gap Type |
|------------|--------|-----------|----------------|----------|
| Landing page | WORKS | YES | N/A | Rich CTA, Phase 5, dice roll details |
| Retirement flow | UNTESTED | YES | UNKNOWN | Behind CTA button |

**Score: 1/2 PARTIAL** — Landing page well-designed.

### CONTRACTION_EXPANSION_FIGMA_SPEC.md (1 tab)

| Requirement | Status | UI Exists? | Data Connected? | Gap Type |
|------------|--------|-----------|----------------|----------|
| Landing page | WORKS | YES | N/A | Rich CTA, Phase 4, Risk Roll/Protected/Legacy |
| 12-screen flow | UNTESTED | YES | UNKNOWN | Behind CTA button |

**Score: 1/2 PARTIAL** — Landing page well-designed.

### FINALIZE_ADVANCE_FIGMA_SPEC.md (1 tab)

| Requirement | Status | UI Exists? | Data Connected? | Gap Type |
|------------|--------|-----------|----------------|----------|
| Landing page | PARTIAL | YES | N/A | Minimal — just a button |
| Finalize flow | UNTESTED | YES | UNKNOWN | Behind CTA button |

**Score: 0/2 PARTIAL** — Landing page is minimal.

### SUBSTITUTION_FLOW_SPEC.md (GameTracker modals)

| Requirement | Status | UI Exists? | Data Connected? | Gap Type |
|------------|--------|-----------|----------------|----------|
| Pitching change modal | UNTESTED | YES | UNKNOWN | Need active game |
| Pinch hitter modal | UNTESTED | YES | UNKNOWN | Need active game |
| Pinch runner modal | UNTESTED | YES | UNKNOWN | Need active game |
| Defensive sub modal | UNTESTED | YES | UNKNOWN | Need active game |
| Double switch modal | UNTESTED | YES | UNKNOWN | Need active game |
| Position switch modal | UNTESTED | YES | UNKNOWN | Need active game |

**Score: 0/6 UNTESTED** — All require active game.

---

## Priority Gap List (What to Build/Fix Next)

### Tier 1: Connected but showing dummy data (fix data sources)
These tabs have working UI but display hardcoded values instead of real data:

1. **Today's Game** — Replace hardcoded "TIGERS vs SOX" with data from scheduleStorage
2. **Standings** — Replace hardcoded division standings with data from seasonStorage
3. **League Leaders** — Replace hardcoded batting/pitching leaders with data from seasonStorage
4. **All-Star** — Replace hardcoded vote counts with real all-star ballot data
5. **Museum** — Replace hardcoded championship history with museumStorage data
6. **News** — Replace generated stories with narrativeEngine output from real game data
7. **Draft season number** — Replace "Season 27" with current season
8. **Ratings Adj season number** — Replace "Season 4" with current season
9. **WorldSeries league names** — Replace hardcoded league names with IDB data

### Tier 2: Partially connected (fix data gaps)
These tabs connect to some real data but have gaps:

10. **Team Hub records** — All teams show "56-34 - 1st" instead of real records
11. **Trades salaries** — Players show $0.0M instead of calculated salaries
12. **GameTracker teams/players** — Uses hardcoded data instead of selected game data

### Tier 3: Untested flows behind CTAs (need data to test)
These tabs have UI that renders but the actual flow behind the CTA button is untested:

13. Awards Ceremony flow (13 award screens)
14. Ratings Adjustment flow
15. Retirement flow
16. Contraction/Expansion flow (12 screens)
17. Free Agency flow
18. Draft flow (3 steps)
19. Finalize & Advance flow
20. All 6 substitution modals

### Tier 4: Missing features
21. Trade deadline indicator (spec mentions, not in UI)
22. Multi-slot franchise save (spec mentions, not implemented)
23. FranchiseSelector page (orphaned from routes)

---

## Recommended Build Order

1. **Import SMB4 data** — Use League Builder's "IMPORT SMB4 DATA" to populate IDB with real leagues/teams/players. This unblocks ALL flows.
2. **Fix IDB lazy init** — Ensure kbl-tracker DB creates stores on app start, not on first write. Eliminates console errors.
3. **Wire dummy data to real sources** — Replace the 12 hardcoded values identified in DUMMY_DATA_SCRUB_REPORT with their correct data hooks.
4. **Test all offseason CTA flows** — With data loaded, click through Awards, Ratings, Retirements, etc.
5. **Test full game flow** — Exhibition → GameTracker → PostGameSummary with real data.
6. **Fix stat aggregation pipeline** — CRIT-01 through CRIT-05 from spec-ui-alignment audit.
7. **Build missing features** — Trade deadline, multi-slot save, etc.
