# Post-Regular-Season Diagnosis Report

**Date:** 2026-02-12
**Scope:** Everything AFTER regular season — playoffs, celebration, offseason, new season
**Type:** DIAGNOSIS ONLY — no fixes applied

---

## Executive Summary

The regular season loop (schedule → play/sim → standings → stats) works end-to-end. Everything after it ranges from "mostly wired" (playoffs) to "pure UI shell" (season advancement). The single biggest finding: **`seasonTransitionEngine.ts` contains 8 real transition operations (age players, recalculate salaries, reset mojo, etc.) but is ORPHANED — never called by any component.** The FinalizeAdvanceFlow fakes these operations with cosmetic animations.

### Status at a Glance

| Phase | Overall | Detail |
|-------|---------|--------|
| **Playoffs** | 🟡 MOSTLY WIRED | Bracket creation, play games, advancement all work. SIM not available. |
| **Champion Celebration** | 🔴 PARTIAL | Champion persisted, summary card shown. Full celebration screen orphaned. |
| **Offseason State Machine** | 🟢 WIRED | 11-phase state machine works, persists to IndexedDB. |
| **Offseason Flows (individual)** | 🟡 PARTIAL | UI renders real player data. Decisions "saved" to offseasonStorage but never applied to rosters. |
| **Season Advancement** | 🔴 STUB | Counter increments in localStorage. Zero actual operations (no schedule, no standings reset, no roster carry-over). |

---

## Phase 1: PLAYOFFS

### What Works ✅

| Feature | Status | Evidence |
|---------|--------|----------|
| Playoff tab switching | WIRED | FranchiseHome.tsx:368, 422 |
| Bracket creation from standings | WIRED | usePlayoffData.ts:242-312; reads real W-L from seasonStorage |
| Playing playoff games via GameTracker | WIRED | FranchiseHome.tsx:297-330; useGameState.ts:3011-3035 records to playoffStorage |
| Series advancement (auto) | WIRED | usePlayoffData.ts:346-407; playoffStorage.ts:567-668 |
| Championship completion | WIRED | usePlayoffData.ts:379-385; champion stored in playoffStorage |
| playoffStorage.ts | WIRED | Own IndexedDB `kbl-playoffs` with 4 stores; 3 active consumers |
| usePlayoffData hook | WIRED | Used by FranchiseHome.tsx:87, SeasonSummary.tsx:61 |

### What Doesn't Work ❌

| Feature | Status | Issue |
|---------|--------|-------|
| Playoff SIM (from bracket) | MISSING | No sim handler for playoff games. Only "PLAY GAME" buttons exist. handleSimulate() only handles regular season. |
| Conference-aware seeding | STUB | usePlayoffData.ts:258-259 naively splits standings array in half instead of using real conference assignments from league builder |
| playoffEngine.qualifyTeams() | ORPHAN | Proper division-winner + wildcard seeding with H2H tiebreakers exists (playoffEngine.ts:180-265) but is NEVER called |
| PlayoffSeedingFlow.tsx | ORPHAN | Full 5-step seeding wizard (446 lines) — never imported anywhere |
| PlayoffBracket.tsx (old) | ORPHAN | Only consumer (SeasonDashboard.tsx) is unrouted in App.tsx |
| WorldSeries.tsx LEADERS/HISTORY | STUB | 100% hardcoded MLB mock data (Tigers, Yankees, Cubs, fake years) |

---

## Phase 2: CHAMPION CELEBRATION

| Feature | Status | Evidence |
|---------|--------|----------|
| Champion persisted | WIRED | completePlayoff() writes champion to playoffStorage |
| Championship summary card | WIRED | FranchiseHome.tsx "advance" tab shows champion from playoffData.playoff.champion |
| Full celebration screen | ORPHAN | SeasonEndFlow.tsx has full celebration + confetti. Never imported by FranchiseHome. |
| Postseason MVP reveal | ORPHAN | PostseasonMVPFlow.tsx (314 lines) — only used by SeasonEndFlow.tsx, which is itself orphaned |

---

## Phase 3: OFFSEASON

### State Machine (WIRED ✅)

11 phases tracked in offseasonStorage.ts (lines 38-50):

```
STANDINGS_FINAL → AWARDS → RATINGS_ADJUSTMENTS → CONTRACTION_EXPANSION →
RETIREMENTS → FREE_AGENCY → DRAFT → FARM_RECONCILIATION →
CHEMISTRY_REBALANCING → TRADES → SPRING_TRAINING → [COMPLETED]
```

- offseasonStorage.ts: Full IndexedDB persistence (`kbl-offseason` database)
- useOffseasonState.ts: Correct hook wrapping state machine
- FranchiseHome.tsx:108-132 `handleAdvancePhase`: Drives phase advancement
- Terminal state (`COMPLETED`) triggers "START SEASON N+1" button

### Individual Offseason Flows

| Flow | Status | What Works | What's Broken |
|------|--------|------------|---------------|
| **Awards Ceremony** | PARTIAL | Outer shell wired via useOffseasonData; persists via saveAwards(). | Sub-screens use hardcoded MLB player names (Trout, Judge, Freeman). Real `allPlayers` data never passed to sub-screens. |
| **Ratings Adjustment** | PARTIAL | Real player names shown; real manager MWAR from managerStorage. | Rating changes are `Math.random() * 20 - 8` — not WAR-based. No write-back to playerDatabase. |
| **Contraction/Expansion** | STUB | UI exists (11 screens). | Random fanMorale/record/attendance. Mock rosters. Screens 6-11 say "coming in next phase." No useOffseasonState imported — no persistence at all. |
| **Retirements** | PARTIAL | Real player data loaded; age-based probability calculated; decisions persisted via saveRetirementDecisions(). | Retired players NOT removed from rosters. Jersey history is hardcoded mock. |
| **Free Agency** | PARTIAL | Real data loaded; signings persisted via saveFreeAgentSignings(). | Players NOT moved between teams in storage. Hardcoded `"redsox"` team ID at lines 267-268. |
| **Draft** | PARTIAL | Real team roster counts used. | Prospect pool is 20 hardcoded generic names ("Marcus Williams", "Jake Thompson"). Drafted players never added to rosters. Hardcoded "San Francisco Giants" check at line 211. |
| **Trades** | WIRED | Same TradeFlow component as regular season (FranchiseHome.tsx:567-568). | — |
| **Postseason MVP** | ORPHAN | Full card-reveal implementation. | Only imported by SeasonEndFlow.tsx, which is never rendered. |

### Critical Cross-Cutting Finding

**None of the offseason flows modify actual roster data.** All persistence goes to `offseasonStorage` as log records, but no flow writes back to `playerDatabase` or `leagueBuilderStorage`. This means:

- ❌ Retired players remain on rosters
- ❌ Free agent signings do not move players between teams
- ❌ Draft picks are never added to team rosters
- ❌ Rating adjustments are never applied to player records
- ❌ Contraction/expansion decisions have zero effect

---

## Phase 4: NEW SEASON ADVANCEMENT

### What Exists

Two paths to "advance" — both do the same minimal thing:

**Path A:** `handleStartNewSeason()` (offseason progress bar → "START SEASON N+1")
**Path B:** `onAdvanceComplete` callback from FinalizeAdvanceFlow

Both do:
```typescript
setCurrentSeason(currentSeason + 1);
localStorage.setItem('kbl-current-season', String(newSeason));
setSeasonPhase("regular");
setActiveTab("todays-game");
```

### What's Missing

| Operation | Status | Detail |
|-----------|--------|--------|
| Season counter increment | ✅ WORKS | localStorage `kbl-current-season` goes from "1" to "2" |
| Schedule generation | ❌ MISSING | No call to generateSchedule(). FinalizeAdvanceFlow says "Schedule will start empty." |
| Standings reset | ❌ MISSING | No explicit reset. Implicitly 0-0 because empty schedule has no results. |
| Roster carry-over | ❌ MISSING | Offseason decisions not applied to player DB. |
| FranchiseMetadata update | ❌ MISSING | IndexedDB `kbl-app-meta` stays at currentSeason=1 forever. Franchise selector will always show "Season 1." |
| executeSeasonTransition() | ❌ ORPHAN | Complete engine (age players, recalculate salaries, reset mojo, clear stats, rookies, service years) exists at seasonTransitionEngine.ts:216 but is never called. |
| Player aging | ❌ MISSING | seasonTransitionEngine does this but is orphaned. |
| Salary recalculation | ❌ MISSING | seasonTransitionEngine does this but is orphaned. |
| Mojo reset | ❌ MISSING | seasonTransitionEngine does this but is orphaned. |

### Bugs Found

1. **localStorage key mismatch:** FranchiseHome uses `kbl-current-season` (hyphenated). seasonTransitionEngine uses `kbl_current_season` (underscored). Latent bug since engine is orphaned.
2. **FinalizeAdvanceFlow cosmetic-only transition:** Shows 7 animated steps ("Archiving Season 1 data...", "Incrementing player ages...", etc.) via `setInterval` — all fake. Zero actual operations performed.
3. **FranchiseMetadata.currentSeason never updated:** Set to 1 during `initializeFranchise()` (franchiseInitializer.ts:74), never incremented.

---

## ORPHAN INVENTORY

Code that exists and may be useful but is currently dead:

| File | What It Does | Why It's Orphaned |
|------|-------------|-------------------|
| `seasonTransitionEngine.ts` | 8 real season transition operations | Never imported by any .tsx component |
| `SeasonEndFlow.tsx` | Champion celebration with confetti + PostseasonMVP | Never imported by FranchiseHome |
| `PostseasonMVPFlow.tsx` | Card-reveal MVP announcement | Only imported by SeasonEndFlow (also orphaned) |
| `PlayoffSeedingFlow.tsx` | 5-step interactive seeding wizard | Never imported anywhere |
| `PlayoffBracket.tsx` | Standalone bracket component | Only consumer (SeasonDashboard) is unrouted |
| `playoffEngine.qualifyTeams()` | Division-winner + wildcard + H2H tiebreakers | createNewPlayoff uses naive array split instead |
| `WorldSeries.tsx` (LEADERS/HISTORY tabs) | Playoff stats + history | 100% hardcoded mock data |

---

## Recommended Fix Priority (for future work)

### P0 — Critical Path (Season 2 is impossible without these)
1. **Wire `executeSeasonTransition()`** — Call the orphaned engine from FinalizeAdvanceFlow instead of faking it with animations
2. **Generate schedule for new season** — Call `generateSchedule()` during advancement
3. **Update FranchiseMetadata.currentSeason** — So franchise selector shows correct season
4. **Fix localStorage key mismatch** — Standardize to one key

### P1 — Offseason Decisions Must Matter
5. **Apply retirement decisions to rosters** — Remove retired players from team rosters
6. **Apply free agency signings** — Move players between teams in leagueBuilderStorage
7. **Apply draft picks to rosters** — Add drafted players to teams
8. **Apply rating adjustments** — Write WAR-based (not random) changes to playerDatabase
9. **Wire real data into Awards sub-screens** — Replace Trout/Judge/Freeman with real season leaders

### P2 — Playoff Improvements
10. **Add playoff SIM** — Allow simming playoff games from the bracket (not just playing)
11. **Use playoffEngine.qualifyTeams()** — Replace naive standings split with proper conference-aware seeding
12. **Wire SeasonEndFlow** — Render champion celebration after championship

### P3 — Orphan Rescue
13. **Wire PlayoffSeedingFlow** — Let users configure seeding method
14. **Clean up WorldSeries.tsx** — Either wire to real data or remove
15. **Wire Contraction/Expansion** — Connect to real storage, implement missing screens
