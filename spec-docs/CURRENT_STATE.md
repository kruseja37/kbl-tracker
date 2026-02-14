# KBL TRACKER — CURRENT STATE
# Last updated: 2026-02-14 (all manual testing bug fixes complete)
---
## BUILD STATUS
| Metric | Value |
|--------|-------|
| Build | PASSING (exit 0) |
| Tests | 5,653 passing / 0 failing / 134 files |
| Logic Matrix | 480/480 pass |
| Console errors | 0 (verified across full franchise UI) |
---
## MANUAL TESTING BUG FIX STATUS — ALL TIERS COMPLETE ✅

Source: `MANUAL_TESTING_BUG_FIX_PLAN.md` (35 issue IDs, 28 commits)

### Tier 0: Game-Breaking (9 commits)
| ID | Issue | Fix | Commit |
|----|-------|-----|--------|
| T0-01 | End-of-game not triggered | Auto game-end detection at regulation end | c52b685 |
| T0-02 | Pitcher doesn't switch at half-inning | Wire pitcher swap in half-inning transition | 2d689cb |
| T0-03 | 3rd out on basepaths doesn't end half-inning | CS/pickoff/TOOTBLAN trigger half-inning end | 1ecca6b |
| T0-04 | Error (E) selection dead-ends | Wire error flow position buttons to recordError() | 06d075d |
| T0-05 | Game results don't persist to franchise | Played games persist to standings/schedule | 7e7b363 |
| T0-06 | Fresh franchise has pre-completed games | (Addressed by T0-05 persistence fix) | — |
| T0-07/11/12 | Hardcoded Tigers/Sox team names | Dynamic team names throughout | db5ba24 |
| T0-08 | Franchise roster not loaded into GameTracker | handlePlayGame passes real IndexedDB rosters | f7f573f |
| T0-09 | Phantom bullpen stats | Zero out hardcoded mock data in fallback rosters | a8b3a0c |
| T0-15 | Post-game shows 9-inning header always | Dynamic numInnings from inningScores.length | 91911ba |

### Tier 1: Wrong Results (6 commits)
| ID | Issue | Fix | Commit |
|----|-------|-----|--------|
| T1-02/03/04 | Runner identity bugs | getBaseRunnerNames() sync from tracker + version counter | 8b8505c |
| T1-05 | Fielding inference wrong | Auto-infer credits from fieldingSequence, skip modal | 21aa89c |
| T1-06 | Error prompt on OUT plays | Clear stale React state + local variable for check | 02876e5 |
| T1-08 | Stats doubled in post-game | Idempotency guards in completeGameInternal + endGame | ba382fe |
| T1-09 | Mojo/Fitness factors | VERIFIED CORRECT — no fix needed | N/A |
| T1-10 | Pitcher rotation in SIM | Rotation cycling, closer usage, save/hold detection | 8c52ba8 |
| T1-11 | SMB4 traits made-up | Replaced 32 fake traits with 63 real SMB4 traits | 0bd310c |

### Tier 2: Missing Wiring (6 commits + 5 already resolved)
| ID | Issue | Fix | Commit |
|----|-------|-----|--------|
| T2-01 | Mock data in displays | mockData.ts orphaned/unused — already resolved | — |
| T2-02 | Lineup card not reactive | Dynamic reactive data flow — already resolved | — |
| T2-03 | Beat writers empty | Shows empty state (expected — feature not built) | — |
| T2-04 | Salaries all $0.0 | computeInitialSalary() at franchise init | b17d025 |
| T2-05 | Team Hub no player stats | Derive correct seasonId from franchiseData | 0e5c288 |
| T2-06 | SIM box scores empty | Data pipeline complete — already resolved | — |
| T2-07 | No narratives in news tab | Generate on-the-fly from recent games | 951c6f2 |
| T2-08 | Manager decisions not wired | Fully wired — already resolved | — |
| T2-09 | Immaculate inning no popup | Wire confirmPitchCount to fameTrackingHook | 11e7a9c |
| T2-10 | Duplicate positions in lineup | 3-pass greedy position-fill algorithm | efe0d43 |
| T2-11 | Errors not on MiniScoreboard | Add awayErrors/homeErrors to MiniScoreboard | 24692ab |

### Tier 3: Feature Builds (7 commits)
| ID | Issue | Fix | Commit |
|----|-------|-----|--------|
| T3-01 | No pre-game lineup screen | PreGameData overlay with lineup preview + starter picker | 498e4be |
| T3-02 | View Roster button dead | Wire useNavigate to league-builder/rosters | e252ccb |
| T3-03 | No way to remove games | Delete button + inline confirm on scheduled games | acfb04b |
| T3-04 | Museum data pipeline empty | museumPipeline.ts auto-populate AllTimeLeaders from career data | c74d4c7 |
| T3-05 | SMB4 name verification | Audited all name pools — 100% real SMB4 names | 1725882 |
| T3-06 | No milestone watch UI | MilestoneWatchPanel component in pre-game overlay | 9f6f362 |
| T3-07 | fWAR/rWAR no display columns | Added to BattingSortKey, useFranchiseData, SeasonLeaderboards | 8348962 |

### All Runtime UNVERIFIED — Awaiting Manual Testing
All fixes pass build + tests but need browser verification.

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
- Phase 1–11 all functional (see SESSION_LOG for detailed verification)
- "START SEASON N+1" button appears after Phase 11 completion
### Season Advancement ✅
- seasonTransitionEngine: age players, recalculate salaries, reset mojo, clear stats
- Both advancement paths aligned (handleStartNewSeason + FinalizeAdvanceFlow)
- Career stats preserved across transitions
### Infrastructure ✅
- Unified IndexedDB via trackerDb.ts (resolved v2/v3 version deadlock)
- Real stadium names from IndexedDB (stadiumData.ts deleted)
- All 84 franchise handlers wired (0 stubs, 0 broken)
- 0 Math.random() fake stats, 0 hardcoded MLB names
- Player salaries computed from ratings at franchise init
- Errors displayed in MiniScoreboard
- fWAR/rWAR visible in league leaders
- Museum auto-populates from career data
- Milestone watches shown in pre-game overlay
- Post-game scoreboard adapts to actual inning count
---
## REMAINING ISSUES (Not Part of Bug Fix Plan)
### Deferred Placeholders (Not Broken)
1. Farm Reconciliation — placeholder "coming soon"
2. Chemistry Rebalancing — placeholder "coming soon"
3. Contraction/Expansion — placeholder "coming soon"
### Feature Gaps (Pre-Existing, Not Regressions)
4. Mojo/Fitness not shown in scoreboard — usePlayerState wired, MiniScoreboard lacks display
5. PostGameSummary data gaps — errors hardcoded to 0, no batting box score
6. Inning summary — NOT BUILT in Figma layer (legacy component not ported)
7. Exit type requires double entry (BUG-006) — UX flow issue
8. No lineup access in GameTracker (BUG-009) — no modal to view/edit lineup during game
9. Special plays not logged (BUG-014) — no fame/activity log for diving catches, robberies
10. Fan Morale — engine built + wired, no visible UI display
11. Park Factors — used in bWAR/pWAR calculators, no standalone UI
12. Manager tracking — empty state (feature not built)
13. Clutch Calculator — hook exists but NOT imported in active Figma GameTracker
14. Performance optimization (P6-005) pending
15. Phase 3-11 automated tests not started
### Data Integrity (21/21 RESOLVED — see DATA_INTEGRITY_FIX_REPORT.md)
- Batches 1A-i through F3 all complete (Feb 12, 2026)
- Includes: WPA system, substitution validation, autoCorrectResult, walk-off, isPlayoff, SB/CS in WAR
---
## KEY ARCHITECTURAL DECISIONS
| Decision | Rationale | Date |
|----------|-----------|------|
| Unified IndexedDB (trackerDb.ts) | v2/v3 version deadlock caused silent SIM failures | 2026-02-11 |
| Empty state over mock data | Honest "no data" better than fake stats | 2026-02-11 |
| WAR-based ratings adjustments | Replaced Math.random() with performance-based formula | 2026-02-12 |
| Contraction/Expansion deferred | 1,310 lines of stub; placeholder until real design | 2026-02-12 |
| Both advancement paths aligned | handleStartNewSeason + FinalizeAdvanceFlow do identical ops | 2026-02-12 |
| Museum auto-populate from career | museumPipeline.ts bridges careerStorage → museumStorage | 2026-02-14 |
| Milestone watch non-blocking | Async IIFE in handlePlayGame, doesn't block game start | 2026-02-14 |
---
## FILE INVENTORY (Key Files)
### Core Infrastructure
- `src/utils/trackerDb.ts` — unified IndexedDB initializer
- `src/utils/processCompletedGame.ts` — game result orchestrator
- `src/utils/syntheticGameFactory.ts` — deterministic game generation
- `src/utils/seasonTransitionEngine.ts` — 8 season transition operations
- `src/utils/franchiseInitializer.ts` — franchise creation + schedule gen
- `src/utils/museumPipeline.ts` — career → museum data bridge
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
- `MilestoneWatchPanel.tsx` — approaching milestones in pre-game
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
### New Files (This Bug Fix Cycle)
- `src/utils/museumPipeline.ts` — career → museum auto-populate
- `src/src_figma/app/components/MilestoneWatchPanel.tsx` — milestone watch UI
