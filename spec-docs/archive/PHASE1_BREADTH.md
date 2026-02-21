# Phase 1 Breadth Survey — Summary
**Completed:** 2026-02-18
**Findings:** FINDING-001 through FINDING-097
**Method:** Static code analysis — grep, wc -l, file reads. No browser verification.

---

## What Phase 1 Was

A complete inventory of every subsystem: does the engine exist, is it imported, does it reach a page? No judgment on correctness — that is Phase 2. Pure wiring verdicts only.

---

## Subsystem Wiring Verdicts (final)

| Status | Subsystems |
|--------|-----------|
| ✅ WIRED | GameTracker, mWAR, Fame/Milestone, Franchise, Schedule, Salary, Offseason, Playoffs, Mojo/Fitness/Clutch (engine), League Builder |
| ⚠️ PARTIAL | Stats Aggregation, Relationships, Narrative, Museum/HOF, Aging/Ratings, Career Stats, Leverage Index, Clutch Attribution |
| 🔲 STUBBED | Fan Morale (hook called live, internally marked TODO) |
| ❌ ORPHANED | Farm, Trade, positional WAR (bWAR/fWAR/pWAR/rWAR), liveStatsCalculator, headlineGenerator, useAgingData hook, ratingsAdjustmentEngine, useCareerStats hook |
| ❌ MISSING | Trait System (no traits in active type system) |

---

## The Two Live Data Spines

Everything that works flows through two paths:

**Spine 1 — GameTracker (in-game)**
`GameTracker.tsx` → useGameState + usePlayerState + useFameTracking + useMWARCalculations + useFanMorale (stub) + useUndoSystem
- Game state, autosave, mojo/fitness, mWAR decisions, partial fame, partial clutch LI

**Spine 2 — FranchiseHome (between games)**
`FranchiseHome.tsx` → useFranchiseData + useScheduleData + usePlayoffData + useOffseasonState
- Franchise CRUD, schedule management, offseason phases, playoff seeding

Everything else either feeds into these two spines or is orphaned.

---

## Top Architectural Risks

**Risk 1 — Clutch stats never accumulate (FINDING-096)**
`calculatePlayAttribution` is never called in the active app. The 1,126-line clutch engine exists and is imported by playerStateIntegration, but the trigger is missing. Every player in every franchise has clutch stats of zero. This also means clutch's downstream consumers (All-Star voting component, net clutch rating display) are running on empty.

**Risk 2 — LI is partial in most paths (FINDING-097)**
`useGameState` uses `getBaseOutLI` (base-out state only) at 6 call sites. Full LI (inning + score differential + walkoff boost) only fires in `EnhancedInteractiveField`. Result: fame events, mWAR decisions, and any future clutch triggers attached via useGameState carry systematically under-weighted LI — late-inning high-stakes moments treated same as early blowouts.

**Risk 3 — Fan morale is a live stub (FINDING-089)**
`useFanMorale` is called in GameTracker for both teams on every game. Source comment explicitly says "STUBBED OUT / TODO: rewrite." The fanMoraleEngine (1,357 lines) is never properly called. Any feature that reads fan morale is reading placeholder data.

**Risk 4 — PostGameSummary and WorldSeries have zero app hooks (FINDING-093)**
Both pages import only React built-ins and router. No useFranchiseData, no useScheduleData, no useSeasonStats. These pages either receive all data as props (risky — prop drilling from parent) or display stale/empty data.

**Risk 5 — Trait system is missing from active types (FINDING-055/056)**
Traits field exists in legacy `unifiedPlayerStorage.ts` but not in `src/types/game.ts` or `src/src_figma/app/types/game.ts`. Players created through the active UI have no trait field. Every engine that takes trait inputs (clutch, mojo, fitness, adaptive learning, relationship) either ignores traits or errors silently.

**Risk 6 — EOS ratings never change (FINDING-077)**
`ratingsAdjustmentEngine.ts` (532 lines) has zero importers. End-of-season ratings bumps and decays never fire. Player ratings are frozen from creation values forever.

---

## Four-Layer Architecture Violations

The intended pattern (FINDING-071): engines → integration adapters → app hooks → pages.

Confirmed violations where pages reach directly into layer-1 engines:
- `SpringTrainingFlow.tsx` → `agingEngine` directly (bypasses agingIntegration)
- `EnhancedInteractiveField.tsx` → `fameEngine` directly (LI-weighted fame per play)
- `SeasonEndFlow.tsx` → `fameEngine` directly (applyChampionshipFame)
- `SeasonEndFlow.tsx` → `fanMoraleEngine` directly (BASE_MORALE_IMPACTS constant)

These are not necessarily bugs — they may be pragmatic shortcuts. But they create inconsistency risk if the integration layer ever adds pre/post-processing.

---

## The Orphaned Engine Graveyard

Files that exist, are complete, and do nothing in production:

| File | Lines | What it does |
|------|-------|-------------|
| bwarCalculator.ts | 406 | Batting WAR |
| fwarCalculator.ts | 692 | Fielding WAR |
| pwarCalculator.ts | 583 | Pitching WAR |
| rwarCalculator.ts | 597 | Running WAR |
| warOrchestrator.ts | 381 | Orchestrates all WAR |
| farmStorage.ts | 327 | Farm system CRUD |
| tradeEngine.ts | 889 | Trade logic |
| transactionStorage.ts | 627 | Transaction history |
| ratingsAdjustmentEngine.ts | 532 | EOS ratings changes |
| headlineGenerator.ts | ~200 | Post-game headlines |
| liveStatsCalculator.ts | ~365 | Real-time box score |
| useClutchCalculations.ts | ~250 | Per-play clutch attribution |
| useCareerStats.ts | 199 | Career stat hook |
| useAgingData.ts | ~200 | Aging hook |
| hofEngine.ts | 149 | HOF induction |

**Total orphaned/dead: ~6,400 lines of complete, non-trivial code.**

---

## Phase 1 Open Questions (for Phase 2)

These could not be answered by static analysis alone:

1. Does PostGameSummary receive real data via props, or is it displaying empty state?
2. What does useFanMorale actually return — empty object, default values, or error?
3. Does the relationship system (via useFranchiseData) actually populate RelationshipLIContext, or does it just read data without feeding it back to leverageCalculator?
4. Does processCompletedGame (the active game-end pipeline) call milestoneAggregator correctly, or does it silently skip milestone detection for some game types?
5. Are the duplicate milestone files (src/utils/ vs src_figma/utils/) truly identical, or have they diverged?

---

## Phase 2 Priorities (recommended order)

Phase 2 is about pattern conformance (OOTP lens), not just wiring. But based on Phase 1 findings, these subsystems have the highest Phase 2 value:

1. **Clutch + LI** — Wiring gap is surgical and high-impact. Two call sites to fix. Unblocks clutch stats, All-Star voting, net clutch rating.
2. **Fan Morale** — Stub must be replaced or explicitly cut. Every game in every franchise is touching dead code.
3. **Stats Aggregation** — liveStatsCalculator orphaned means real-time box score may be wrong. High gameplay impact.
4. **Positional WAR** — 3,268 lines complete and orphaned. Wiring it unlocks bWAR/fWAR/pWAR/rWAR display in all leaderboards.
5. **Trait System** — Missing from active types. Foundational gap that affects mojo, clutch, fitness, adaptive learning simultaneously.
6. **LI full calculation** — Replace 6 `getBaseOutLI` calls in useGameState with `calculateLeverageIndex`. Small change, large correctness improvement.

---

*Phase 1 declared COMPLETE. Phase 2 opens with the OOTP pattern lens per CURRENT_STATE.md instructions.*
