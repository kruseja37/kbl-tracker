# Phase 1 Breadth Plan — Revised
**Date:** 2026-02-17
**Reason for revision:** Original 6-subsystem plan underscoped. Full inventory shows 20+ subsystems, 35 engines, 16 pages, dual hook/utils layer (src/ vs src_figma/).

---

## Doc Restructure (Execute First)

Current AUDIT_LOG.md: 888 lines, growing fast. Restructure before breadth survey begins.

### New Structure:
```
spec-docs/
  AUDIT_LOG_INDEX.md        ← one line per finding: ID | date | status | file | summary
  AUDIT_LOG.md              ← keep for findings 001-054 (already committed)
  FINDINGS/
    FINDINGS_055_onwards.md ← new findings appended here going forward
  PHASE_SUMMARIES/
    PHASE1_GAMETRACKER.md   ← synthesized conclusions from game tracker deep dive
    PHASE1_BREADTH.md       ← will hold breadth survey conclusions
  SUBSYSTEM_MAP.md          ← authoritative subsystem list with files + wiring status
```

---

## Full Subsystem List (20 subsystems)

| # | Subsystem | Key Files | Spec Doc |
|---|-----------|-----------|----------|
| 1 | GameTracker / Game State | useGameState.ts, GameTracker.tsx | (examined) |
| 2 | Stats Aggregation | seasonAggregator.ts, liveStatsCalculator.ts | STAT_TRACKING_ARCHITECTURE_SPEC |
| 3 | Franchise / Season Engine | franchiseManager.ts, franchiseStorage.ts, franchiseInitializer.ts | FRANCHISE_MODE_SPEC |
| 4 | WAR System | bwar/fwar/pwar/rwar/mwarCalculator.ts, warOrchestrator.ts | 5 WAR specs |
| 5 | Fame / Milestone | fameEngine.ts, milestoneDetector.ts, milestoneAggregator.ts, fameIntegration.ts | MILESTONE_SYSTEM_SPEC |
| 6 | Schedule System | scheduleGenerator.ts, scheduleStorage.ts, useScheduleData.ts | SCHEDULE_SYSTEM_FIGMA_SPEC |
| 7 | Offseason | offseasonStorage.ts, seasonEndProcessor.ts, seasonTransitionEngine.ts, useOffseasonData.ts | OFFSEASON_SYSTEM_SPEC |
| 8 | Playoffs | playoffEngine.ts, playoffStorage.ts, usePlayoffData.ts | PLAYOFF_SYSTEM_SPEC |
| 9 | Relationships | relationshipEngine.ts, relationshipStorage.ts, relationshipIntegration.ts | (spec implied) |
| 10 | Narrative / Headlines | narrativeEngine.ts, headlineEngine.ts, narrativeIntegration.ts | NARRATIVE_SYSTEM_SPEC |
| 11 | Mojo / Fitness | mojoEngine.ts, fitnessEngine.ts, playerStateIntegration.ts, usePlayerState.ts | MOJO_FITNESS_SYSTEM_SPEC |
| 12 | Fan Morale | fanMoraleEngine.ts, fanMoraleIntegration.ts, useFanMorale.ts | FAN_MORALE_SYSTEM_SPEC |
| 13 | Farm System | farmStorage.ts | FARM_SYSTEM_SPEC |
| 14 | Trade System | tradeEngine.ts, transactionStorage.ts | TRADE_SYSTEM_SPEC |
| 15 | Salary System | salaryCalculator.ts | SALARY_SYSTEM_SPEC |
| 16 | League Builder | leagueBuilderStorage.ts, useLeagueBuilderData.ts | LEAGUE_BUILDER_SPEC |
| 17 | Museum / HOF | museumPipeline.ts, museumStorage.ts, hofEngine.ts, useMuseumData.ts | (implied) |
| 18 | Aging / Ratings | agingEngine.ts, ratingsAdjustmentEngine.ts, playerRatingsStorage.ts, agingIntegration.ts | EOS_RATINGS_ADJUSTMENT_SPEC |
| 19 | Career Stats | careerStorage.ts, useCareerStats.ts (src/hooks) | (implied) |
| 20 | UI Pages | 16 pages in src_figma/app/pages/ | KBL_TRACKER_UI_UX_PLANNING |

---

## Revised Audit Strategy — 3 Tiers

### Tier 1: Bulk Inventory (3 batches)
Get wc -l and export surface for ALL subsystem files in bulk.
Goal: Know size and shape of every subsystem before going deeper.
Batches: Group 5-6 subsystems per batch.

### Tier 2: Wiring Check (2 batches)  
For every integration file in src_figma/app/engines/, check what imports it.
For every src_figma hook, check what pages import it.
Goal: Binary answer — wired to active app or orphaned?

### Tier 3: Selective Deep Dive (TBD batches)
Only for subsystems that are: partially wired, have known bugs, or are on the critical path for franchise mode.
Goal: Understand seams, not just existence.

**Total estimated batches:** 8-12 (vs 40 under original plan)

---

## Execution Order

1. Implement doc restructure (1 CLI prompt)
2. Tier 1 Batch A: Stats Aggregation + Franchise + Schedule (sizes + exports)
3. Tier 1 Batch B: WAR + Fame/Milestone + Offseason/Playoffs
4. Tier 1 Batch C: Relationships + Narrative + Mojo/Fitness + Fan Morale
5. Tier 1 Batch D: Farm + Trade + Salary + League Builder + Museum + Aging
6. Tier 2 Batch A: All integration files — what imports them?
7. Tier 2 Batch B: All src_figma hooks — what pages import them?
8. Tier 1 Batch E: UI pages — sizes, what they import
9. Synthesize → SUBSYSTEM_MAP.md
10. Close Phase 1 → PHASE1_BREADTH.md summary
11. Open Phase 2

