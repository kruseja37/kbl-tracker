# KBL TRACKER — CURRENT STATE
# Last updated: 2026-02-13 (post-triage session)
---
## BUILD STATUS
| Metric | Value |
|--------|-------|
| Build | PASSING (exit 0) |
| Tests | 5,653 passing / 0 failing / 134 files |
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
### Offseason ✅ (11/11 phases walkable, 0 crashes, browser-verified)
- 11-phase state machine (offseasonStorage + IndexedDB)
- All 11 transitions verified: tab auto-selects, content renders, IndexedDB updates correctly
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
- Phase 11: Spring Training (real player data, career phase projections — onComplete wired to handleAdvancePhase)
- "START SEASON N+1" button appears after Phase 11 completion
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
1. ~~League Leaders N/A after SIM~~ — FIXED: batch SIM now uses full pipeline + dynamic seasonId
2. ~~Season number off-by-2 in Ratings Adjustments~~ — FIXED (prev session)
3. ~~FinalizeAdvanceFlow empty teams~~ — FIXED (prev session)
4. ~~Remaining "San Francisco Giants"~~ — FIXED: DraftFlow had 2 hardcoded instances, now dynamic
5. ~~FinalizeAdvanceFlow 32-player requirement~~ — FIXED: shows warning + "Advance Anyway" button (soft gate, not blocker)
6. ~~GameTracker franchise "TIGERS/SOX" defaults~~ — FIXED: uses navigationState team names, defaults to 'HOME'/'AWAY'
### Browser Verified ✅
7. ~~Free Agency full flow~~ — VERIFIED: protection→dice→destination→exchange works with real players
8. ~~Draft full flow~~ — VERIFIED: 20 AI prospects, user pick, farm roster tracking works
9. ~~GameTracker in Season 2~~ — VERIFIED: game loads and is playable
10. ~~Museum after Season 1~~ — VERIFIED: UI loads (6 tabs), data empty (pipeline not built)
11. All 11 offseason phase transitions advance correctly — verified in prev session
### Deferred (Placeholders, Not Broken)
10. Farm Reconciliation — placeholder "coming soon"
11. Chemistry Rebalancing — placeholder "coming soon"
12. Contraction/Expansion — placeholder "coming soon"
### Feature Gaps (Pre-Existing, Not Regressions)
13. ~~Fielding stats pipeline (CRIT-05)~~ — FIXED: Both completeGameInternal + endGame query IndexedDB fielding events (useGameState.ts:3136,3352)
14. ~~HBP/SF/SAC/GIDP not tracked~~ — FIXED: Batch 1B added sf/sh/gidp/hbp to PlayerStats (useGameState.ts:84-92)
15. Phase 3-11 tests not started (testing pipeline)
16. Performance optimization (P6-005) pending
17. Fan Morale system — engine built + wired to GameTracker (useFanMorale hook, processGameResult called at game end). No visible UI display yet.
18. Park Factors — used in bWAR/pWAR calculators; no standalone UI or per-stadium management
19. Manager tracking — empty state (feature not built)
### Data Integrity (21/21 RESOLVED — see DATA_INTEGRITY_FIX_REPORT.md)
20. Batches 1A-i through F3 all complete (Feb 12, 2026)
21. Includes: WPA system, substitution validation, autoCorrectResult, walk-off, isPlayoff, SB/CS in WAR
22. All canary checks pass, no regressions
### Orphaned Engines (Calculators Run But No UI Display)
23. Clutch Calculator — `useClutchCalculations.ts` hook exists but NOT imported in active Figma GameTracker
24. fWAR Calculator — runs via useWARCalculations, no display column in UI
25. rWAR Calculator — runs via useWARCalculations, no display column in UI
### Active Issues (Pre-Manual-Testing)
26. Mojo/Fitness not shown in scoreboard — usePlayerState wired (GameTracker:622-694), MiniScoreboard has no mojo/fitness display
27. ~~Fame events during game~~ — LIKELY FIXED: useFameTracking wired, popup renders at GameTracker:2016-2040. Needs live verification.
28. PostGameSummary data gaps — errors hardcoded to 0 (PostGameSummary.tsx:162), no batting box score
29. Inning summary — NOT BUILT in Figma layer (legacy component not ported)
30. Exit type requires double entry (original BUG-006 from GAMETRACKER_BUGS.md) — UX flow issue
31. No lineup access in GameTracker (original BUG-009) — no modal to view/edit lineup during game
32. Special plays not logged (original BUG-014) — no fame/activity log for diving catches, robberies etc.
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
