# Mock Data Inventory — Franchise UI

> **Generated:** 2026-02-11
> **Purpose:** Complete inventory of all hardcoded/mock data in the franchise UI that should be replaced with real IndexedDB data.
> **Status:** DIAGNOSIS ONLY — no fixes applied yet.

---

## Summary

| Category | Files Affected | Severity |
|----------|---------------|----------|
| **A. Franchise Data Hook (fallback mocks)** | 1 file | HIGH — actively shown to users |
| **B. GameDayContent (hardcoded matchup)** | 1 file | HIGH — visible every session |
| **C. LeagueLeadersContent (inline mocks)** | 1 file | HIGH — large blocks of fake stats |
| **D. All-Star Voting (inline mocks)** | 1 file | MEDIUM — only shown in All-Star tab |
| **E. Beat Reporter News (inline mocks)** | 1 file | MEDIUM — only shown in News tab |
| **F. BeatReporterNews component (inline mocks)** | 1 file | MEDIUM — large fake articles |
| **G. Hardcoded team list** | 1 file | LOW — used for schedule dropdown |
| **H. Offseason Flow Components (9 files)** | 9 files | MEDIUM — all offseason tabs |
| **I. TeamHubContent** | 1 file | MEDIUM — team/roster/stats all mock |
| **J. MuseumContent** | 1 file | MEDIUM — team list mock |
| **K. usePlayoffData hook** | 1 file | HIGH — playoff bracket mock |
| **L. useMuseumData hook** | 1 file | MEDIUM — 9 separate mock arrays |
| **M. PlayoffSeedingFlow** | 1 file | MEDIUM — mock playoff teams |
| **N. PostseasonMVPFlow** | 1 file | LOW — mock MVP candidates |

**Total mock data sources: 28+ distinct blocks across 18+ files**

---

## A. `useFranchiseData.ts` — Fallback Mock Data (HIGH)

**File:** `src/src_figma/hooks/useFranchiseData.ts`

### A1. MOCK_STANDINGS (lines 111-144)
- **What it displays:** Standings table with 4 divisions (Atlantic, Central, Mountain, Pacific), 20 teams with W/L/GB/RunDiff
- **Fake team names:** Tigers, Sox, Moonstars, Crocs, Nemesis, Bears, Jacks, Blowfish, Overdogs, Freebooters, Herbisaurs, Wild Pigs, Beewolves, Crocodons, Sirloins, Hot Corners, Sand Cats, Platypi, Grapplers, Moose
- **Fake records:** Tigers 56-34, Herbisaurs 58-32, etc.
- **When shown:** Falls back when `standingsLoaded === false || realStandings.length === 0` (line 430)
- **Should read from:** `calculateStandings(seasonId)` in `seasonStorage.ts` — ALREADY WIRED at line 414, but falls back if no completed games exist
- **Root issue:** Division structure is hardcoded as "Eastern/Western > Atlantic/Central/Mountain/Pacific" — does NOT read from `leagueStructure.ts` SUPER_MEGA_LEAGUE which uses "Super/Mega > Beast/Boss/Epic/Monster"

### A2. MOCK_BATTING_LEADERS (lines 146-189)
- **What it displays:** Top 5 players in AVG, HR, RBI, SB, OPS, WAR
- **Fake players:** J. Rodriguez, K. Martinez, T. Anderson, etc.
- **When shown:** Falls back when `hasRealData === false` (line 376-377)
- **Should read from:** `useSeasonStats(seasonId).getBattingLeaders()` — ALREADY WIRED at lines 380-387
- **Root issue:** `hasRealData` is false when no season stats exist for this seasonId

### A3. MOCK_PITCHING_LEADERS (lines 191-234)
- **What it displays:** Top 5 pitchers in ERA, W, K, WHIP, SV, WAR
- **Fake players:** T. Anderson, J. Williams, K. Brown, etc.
- **When shown:** Falls back when `hasRealData === false` (line 392-393)
- **Should read from:** `useSeasonStats(seasonId).getPitchingLeaders()` — ALREADY WIRED at lines 397-403
- **Root issue:** Same as A2

### A4. nextGame.awayRecord / homeRecord (line 493-494)
- **What it displays:** Team W-L records next to team names in next game card
- **Hardcoded:** `'0-0'` for both teams
- **Should read from:** `calculateStandings(seasonId)` results, matched by teamId

---

## B. `FranchiseHome.tsx` — GameDayContent (HIGH)

**File:** `src/src_figma/app/pages/FranchiseHome.tsx`

### B1. Next Game Card team names (lines 2498-2513)
- **What it displays:** "TIGERS" vs "SOX" with records "42-28" and "38-32"
- **Hardcoded at:** Lines 2501 ("TIGERS"), 2502 ("42-28"), 2511 ("SOX"), 2512 ("38-32")
- **Should read from:** `scheduleData.nextGame.awayTeamId` / `homeTeamId` (already available at line 2191-2192 as `awayTeamId`/`homeTeamId` but the JSX on lines 2498-2513 uses hardcoded strings instead)
- **Also hardcoded:** Date "7/12" on line 2498, stadium `getStadiumForTeam("SOX")` on line 2507

### B2. Head-to-head data (lines 2195-2201)
- **What it displays:** Previous matchup results (W/L, scores, dates)
- **Hardcoded:** 5 fake game results
- **Should read from:** `completedGames` store filtered by both team IDs

### B3. Beat writer stories (lines 2204-2229)
- **What it displays:** 4 fake social media posts from @TigersBeatJim, @SoxInsider, etc.
- **Hardcoded:** Entirely fictional beat writer content about "Tigers" and "Sox"
- **Should read from:** Narrative engine or be generated dynamically from actual game events

### B4. Default team IDs (line 2191-2192)
- **Hardcoded fallbacks:** `'tigers'` and `'sox'` when `scheduleData.nextGame` is null
- **Should:** Show "No upcoming games" or pull from schedule

---

## C. `FranchiseHome.tsx` — LeagueLeadersContent (HIGH)

**File:** `src/src_figma/app/pages/FranchiseHome.tsx`

### C1. NL Batting Leaders (lines 3104-3147)
- **What it displays:** Full batting leaderboard for "NL" with fake players (D. Wilson, R. Williams, J. Martinez, D. Lee, S. Kim)
- **Hardcoded:** `battingLeadersDataNL` — 6 stat categories × 5 players each = 30 fake entries
- **Comment at line 3103:** "Mock league leaders data - NL (kept for dual-league display)"
- **Should read from:** Same `useSeasonStats` as AL, filtered by conference

### C2. NL Pitching Leaders (lines 3149-3192)
- **What it displays:** Full pitching leaderboard for "NL" with fake pitchers (A. Chen, R. Garcia, D. Lee, J. Martinez, S. Kim)
- **Hardcoded:** `pitchingLeadersDataNL` — 6 stat categories × 5 players each = 30 fake entries
- **Should read from:** Same `useSeasonStats` as AL, filtered by conference

### C3. AL/NL Summary Cards (lines 3194-3228)
- **What it displays:** Quick stat summary cards — "battingLeadersAL", "battingLeadersNL", "pitchingLeadersAL", "pitchingLeadersNL"
- **Hardcoded:** 4 arrays × 6 stats each = 24 fake values
- **Should read from:** Top value from each leaders category

### C4. Gold Glove / Booger Glove Leaders (lines 3231-3280+)
- **What it displays:** Fielding awards race by position for AL and NL
- **Hardcoded:** `goldGloveLeadersAL` (10 entries), `boogerGloveLeaderAL` (1 entry), `goldGloveLeadersNL` (10+ entries)
- **Should read from:** fWAR calculations from `fwarCalculator.ts`

---

## D. `FranchiseHome.tsx` — All-Star Voting (MEDIUM)

**File:** `src/src_figma/app/pages/FranchiseHome.tsx`

### D1. allStarVotes (lines 153-263)
- **What it displays:** Fan voting results by position for Eastern and Western leagues
- **Hardcoded:** ~110 lines of fake player voting data with specific vote counts (e.g., "M. Chen, Tigers, 245680 votes")
- **Scope:** 10 positions × 2 players × 2 leagues + bench + pitchers = ~60 fake player entries
- **Should read from:** Player database + season stats to generate All-Star candidates based on performance

---

## E. `FranchiseHome.tsx` — Beat Writer Stories in GameDayContent (MEDIUM)

(Already documented as B3 above)

---

## F. `FranchiseHome.tsx` — BeatReporterNews Component (MEDIUM)

**File:** `src/src_figma/app/pages/FranchiseHome.tsx`

### F1. newsArticles (lines 3682-3800+)
- **What it displays:** 9+ full newspaper articles with headlines, excerpts, full text, reporter names, timestamps
- **Hardcoded:** ~120 lines of fake news articles about Tigers, Sox, Beewolves, Nemesis, Crocs, Moonstars
- **Topics:** Playoff race, injury reports, rule changes, home run records, trade rumors, awards, clubhouse chemistry, stadium upgrades, Cy Young race
- **Should read from:** Narrative engine generating stories from actual season events

---

## G. `FranchiseHome.tsx` — Hardcoded Team List (LOW)

### G1. availableTeams (lines 327-330)
- **What it displays:** Used for schedule dropdown filter
- **Hardcoded:** `["TIGERS", "SOX", "BEARS", "CROCS", "MOOSE", "NEMESIS", "MOONSTARS", "HERBISAURS", "WILD PIGS", "BEEWOLVES"]`
- **Issues:** Only 10 teams (should be 20), uses display names instead of IDs
- **Should read from:** League template's `teamIds` array from franchise config

---

## H. Offseason Flow Components (MEDIUM) — 9 Files

All offseason components use local MOCK_TEAMS and MOCK_PLAYERS arrays instead of reading from IndexedDB.

| File | Mock Constants | Lines | Should Read From |
|------|---------------|-------|-----------------|
| `FreeAgencyFlow.tsx` | MOCK_TEAMS (line 49), MOCK_PLAYERS (line 60) | ~30 lines | `getAllTeams()`, `getAllPlayers()` from leagueBuilderStorage |
| `RetirementFlow.tsx` | MOCK_TEAMS (line 56), MOCK_PLAYERS (line 67) | ~30 lines | Same |
| `AwardsCeremonyFlow.tsx` | MOCK_PLAYERS (line 68), MOCK_TEAMS (line 77) | ~25 lines | Same + season stats for award calculations |
| `RatingsAdjustmentFlow.tsx` | MOCK_TEAMS (line 84), MOCK_ALL_PLAYERS (line 231) | ~200 lines | Same |
| `ContractionExpansionFlow.tsx` | MOCK_AT_RISK_TEAMS (line 6), MOCK_ALL_TEAMS (line 54) | ~80 lines | Same + standings for at-risk calculation |
| `TradeFlow.tsx` | MOCK_TEAMS (line 126) | ~55 lines | Same |
| `DraftFlow.tsx` | MOCK_TEAMS (line 7) | ~20 lines | Same |
| `FinalizeAdvanceFlow.tsx` | MOCK_TEAMS (line 92) | ~85 lines | Same |
| `PlayoffSeedingFlow.tsx` | MOCK_PLAYOFF_TEAMS (line 50) | ~95 lines | Standings data to determine seeds |

**Pattern:** Each component has a `// TODO: Replace with real data from IndexedDB` or similar comment, and the mock data is returned as a fallback when real data is empty.

---

## I. `TeamHubContent.tsx` (MEDIUM)

**File:** `src/src_figma/app/components/TeamHubContent.tsx`

| Mock | Line | Content | Should Read From |
|------|------|---------|-----------------|
| MOCK_TEAMS | 9 | 10 team names (strings) | `getAllTeams()` |
| MOCK_STADIUMS | 10 | 5 stadium names | `getStadiumForTeam()` or team data |
| MOCK_ROSTER_DATA | 15 | 4 fake players with positions/stats | `getAllPlayers()` filtered by team |
| MOCK_STATS_DATA | 29 | 4 fake season stat lines | `useSeasonStats()` |

---

## J. `MuseumContent.tsx` (MEDIUM)

**File:** `src/src_figma/app/components/MuseumContent.tsx`

| Mock | Line | Content |
|------|------|---------|
| MOCK_TEAMS | 23 | 10 team names (same as TeamHub) |

Used for team filter dropdown (line 66).

---

## K. `usePlayoffData.ts` (HIGH)

**File:** `src/src_figma/hooks/usePlayoffData.ts`

### K1. MOCK_PLAYOFF_TEAMS (line 104)
- **What it displays:** Playoff bracket seedings and teams
- **When shown:** Falls back when real playoff data is empty (lines 297, 301)
- **Should read from:** `calculateStandings()` → top N teams by record

---

## L. `useMuseumData.ts` (MEDIUM)

**File:** `src/src_figma/hooks/useMuseumData.ts`

9 separate mock arrays, all used as fallbacks when IndexedDB returns empty:

| Mock | Line | Content |
|------|------|---------|
| MOCK_CHAMPIONSHIPS | 71 | Fake championship records |
| MOCK_TEAM_RECORDS | 77 | Fake all-time W/L records |
| MOCK_AWARD_WINNERS | 83 | Fake MVP/Cy Young winners |
| MOCK_ALL_TIME_LEADERS | 89 | Fake career stat leaders |
| MOCK_HALL_OF_FAME | 95 | Fake HOF inductees |
| MOCK_RECORDS | 100 | Fake league records |
| MOCK_MOMENTS | 107 | Fake legendary moments |
| MOCK_RETIRED_JERSEYS | 112 | Fake retired numbers |
| MOCK_STADIUMS | 117 | Fake stadium data |

**Fallback pattern** (lines 228-252): Each array is used when the real IndexedDB query returns empty. Also seeds to IndexedDB on first load (lines 272-296).

---

## M. `PlayoffSeedingFlow.tsx` (MEDIUM)

**File:** `src/src_figma/app/components/PlayoffSeedingFlow.tsx`

### M1. MOCK_PLAYOFF_TEAMS (line 50)
- **Hardcoded:** 8 teams with seeds, records, run differentials
- **Used at:** Line 146 as fallback when `providedTeams.length === 0`
- **Should read from:** Standings data

---

## N. `PostseasonMVPFlow.tsx` (LOW)

**File:** `src/src_figma/app/components/PostseasonMVPFlow.tsx`

### N1. MOCK_CANDIDATES (line 33)
- **Hardcoded:** 5 fake MVP candidates with stats
- **Used at:** Line 97 as fallback
- **Should read from:** Playoff game stats

---

## Priority Ranking for Replacement

### Tier 1 — HIGH (User sees these every session)
1. **B1:** GameDayContent next game card — hardcoded "TIGERS vs SOX" with fake records
2. **A1:** MOCK_STANDINGS — shown on Standings tab when no games played yet
3. **A2/A3:** MOCK_BATTING/PITCHING_LEADERS — shown on Leaders tab
4. **A4:** nextGame records hardcoded as '0-0'
5. **A1 division structure:** Uses "Eastern/Western" instead of real "Super/Mega" conferences

### Tier 2 — MEDIUM (User sees on specific tabs)
6. **C1-C4:** LeagueLeadersContent NL data + summary cards + Gold Glove — all hardcoded
7. **D1:** All-Star voting — 110 lines of fake vote data
8. **F1:** BeatReporterNews — 120 lines of fake news articles
9. **K1:** usePlayoffData MOCK_PLAYOFF_TEAMS
10. **H (all 9 files):** Offseason flow components

### Tier 3 — LOW (Supporting/secondary views)
11. **I:** TeamHubContent mock data
12. **J:** MuseumContent team list
13. **L:** useMuseumData 9 mock arrays
14. **G1:** availableTeams hardcoded list
15. **B2/B3:** Head-to-head and beat writers in GameDayContent
16. **M/N:** PlayoffSeedingFlow and PostseasonMVPFlow mocks
