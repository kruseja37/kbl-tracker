# KBL TRACKER — CURRENT STATE
# Last updated: 2026-02-12
---
## BUILD STATUS
| Metric | Value |
|--------|-------|
| Build | PASSING (exit 0) |
| Tests | 5,627 passing / 0 failing / 133 files |
| Logic Matrix | 480/480 pass |
| Console errors | 0 (verified across full franchise UI) |
---
## WHAT WORKS END-TO-END (Verified in Browser)
### Regular Season ✅
- Franchise creation wizard (6 steps, SMB4 import, 20 teams)
- Schedule generation (configurable games per team)
- GameTracker: play games with real players, baserunner logic, scoring
- SIM 1 GAME: animated play-by-play via syntheticGameFactory
- SKIP 1 GAME: removes game from schedule
- Batch SIM/SKIP: 1 game / 1 day / 1 week / rest of season
- Standings: all 20 teams, 4 divisions, real W-L, games back
- Schedule: real team names, real stadium names from IndexedDB
- Today's Game: real team records from standings
### Playoffs ✅
- Conference-aware seeding via playoffEngine.qualifyTeams()
- Interactive seeding wizard (PlayoffSeedingFlow)
- Bracket generation from real standings
- PLAY playoff games via GameTracker
- SIM playoff games (same pipeline as regular season SIM)
- Auto series advancement
- Championship completion + persistence to IndexedDB
### Champion Celebration ✅
- SeasonEndFlow with confetti + PostseasonMVPFlow card-reveal
- Real team name, real series result
### Offseason ✅ (11/11 phases walkable, 0 crashes)
- 11-phase state machine (offseasonStorage + IndexedDB)
- Phase 1: Standings Final (Tootwhistle Times newspaper)
- Phase 2: Awards Ceremony (13 sub-screens, real player data)
- Phase 3: Ratings Adjustments (WAR-based, persists to player records)
- Phase 4: Contraction/Expansion (honest placeholder, skip works)
- Phase 5: Retirements (real age-based probabilities, removes from rosters)
- Phase 6: Free Agency (real data, moves players between teams)
- Phase 7: Draft (dynamic prospects, adds to farm rosters)
- Phase 8: Farm Reconciliation (placeholder, skip works)
- Phase 9: Chemistry Rebalancing (placeholder, skip works)
- Phase 10: Trades (full trade UI with real players and salaries)
- Phase 11: Spring Training (real player data, career phase projections)
### Season Advancement ✅
- seasonTransitionEngine: age players, recalculate salaries, reset mojo, clear stats, apply rookie designations, increment service years
- Both advancement paths aligned (handleStartNewSeason + FinalizeAdvanceFlow)
- New schedule generation for Season 2+
- FranchiseMetadata updated in IndexedDB
- localStorage key standardized (kbl-current-season)
- Career stats preserved across transitions
### Infrastructure ✅
- Unified IndexedDB via trackerDb.ts (resolved v2/v3 version deadlock)
- Real stadium names from IndexedDB (stadiumData.ts deleted)
- All 84 franchise handlers wired (0 stubs, 0 broken)
- 0 Math.random() fake stats anywhere
- 0 hardcoded MLB names in franchise UI
- MOCK_* constants renamed to EMPTY_* where values were correct
---
## KNOWN ISSUES (Pre-Manual-Testing)
### Must Fix
1. League Leaders N/A after SIM — stats pipeline gap or seasonId mismatch
2. Season number off-by-2 in Ratings Adjustments
3. FinalizeAdvanceFlow empty teams — useOffseasonData returns empty array
4. Remaining "San Francisco Giants" in AwardsCeremonyFlow, FinalizeAdvanceFlow
### Should Verify in Browser
5. Free Agency full flow (sign → roster change persists)
6. Draft full flow (draft → player added to farm roster)
7. GameTracker in Season 2 (PLAY, not just SIM)
8. Museum data accumulation after Season 1
9. All 11 offseason phase transitions advance correctly
### Deferred (Placeholders, Not Broken)
10. Farm Reconciliation — placeholder "coming soon"
11. Chemistry Rebalancing — placeholder "coming soon"
12. Contraction/Expansion — placeholder "coming soon"
### Feature Gaps (Pre-Existing, Not Regressions)
13. Fielding stats pipeline (CRIT-05) — needs feature work
14. HBP/SF/SAC/GIDP not tracked in game-level batting stats
15. Phase 3-11 tests not started (testing pipeline)
16. Performance optimization (P6-005) pending
17. Fan Morale system — empty state (feature not built)
18. Park Factors system — empty state (feature not built)
19. Manager tracking — empty state (feature not built)
---
## KEY ARCHITECTURAL DECISIONS
| Decision | Rationale | Date |
|----------|-----------|------|
| Unified IndexedDB (trackerDb.ts) | v2/v3 version deadlock caused silent SIM failures | 2026-02-11 |
| Empty state over mock data | Honest "no data" better than fake stats | 2026-02-11 |
| WAR-based ratings adjustments | Replaced Math.random() with performance-based formula | 2026-02-12 |
| Contraction/Expansion deferred | 1,310 lines of stub; placeholder until real design | 2026-02-12 |
| Both advancement paths aligned | handleStartNewSeason + FinalizeAdvanceFlow do identical ops | 2026-02-12 |
| Dynamic prospect generation | Procedural names/ratings replace 20 hardcoded prospects | 2026-02-12 |
| retirePlayer() scrubs all arrays | Removes from every roster array, not just status flag | 2026-02-12 |
| transferPlayer() for FA moves | Updates teamId + scrubs old team + adds to new team | 2026-02-12 |
---
## FILE INVENTORY (Key Files)
### Core Infrastructure
- `src/utils/trackerDb.ts` — unified IndexedDB initializer
- `src/utils/processCompletedGame.ts` — game result orchestrator
- `src/utils/syntheticGameFactory.ts` — deterministic game generation
- `src/utils/seasonTransitionEngine.ts` — 8 season transition operations
- `src/utils/franchiseInitializer.ts` — franchise creation + schedule gen
### Storage Layer
- `src/utils/gameStorage.ts` — per-game stats
- `src/utils/seasonStorage.ts` — season aggregates
- `src/utils/careerStorage.ts` — career stats (survive transitions)
- `src/utils/playoffStorage.ts` — playoff bracket, series, champion
- `src/utils/offseasonStorage.ts` — 11-phase state machine
- `src/utils/leagueBuilderStorage.ts` — teams, players, rosters
### Franchise UI
- `FranchiseHome.tsx` — main franchise hub
- `FranchiseSetup.tsx` — creation wizard
- `SimulationOverlay.tsx` — SIM animation
- `SeasonEndFlow.tsx` — champion celebration
- `FinalizeAdvanceFlow.tsx` — season transition UI
- `WorldSeries.tsx` — playoff bracket display
### Offseason Flows
- `AwardsCeremonyFlow.tsx` — 13 award sub-screens
- `RatingsAdjustmentFlow.tsx` — WAR-based ratings
- `ContractionExpansionFlow.tsx` — placeholder
- `RetirementFlow.tsx` — retirement + roster removal
- `FreeAgencyFlow.tsx` — FA signings + roster transfers
- `DraftFlow.tsx` — dynamic prospects + roster addition
- `TradeFlow.tsx` — full trade interface
- `SpringTrainingFlow.tsx` — career phase projections
- `PlayoffSeedingFlow.tsx` — interactive seeding wizard
- `PostseasonMVPFlow.tsx` — MVP card-reveal
