# GameTracker V1 Scope Lock
Generated: 2026-03-09
Sessions: 1
Rulings: 10
Status: ⏳ PENDING JK APPROVAL

## Purpose Statement
Lock the precise delta between the live `src/src_figma/` GameTracker and the V1 build spec before any redesign work.

## Preservation Summary
21 of 31 reviewed scope items are current auto-PRESERVE candidates pending JK review.

## Component Disposition

| Component | File(s) | Decision | Effort | Ruling # |
|---|---|---|---|---|
| Live page shell | `src/src_figma/app/pages/GameTracker.tsx` | PRESERVE pending open deltas | — | — |
| Live game-state hook | `src/src_figma/hooks/useGameState.ts` | PRESERVE pending open deltas | — | — |
| Enhanced field workflow | `src/src_figma/app/components/EnhancedInteractiveField.tsx` | PRESERVE | — | — |
| Quick Bar | `src/src_figma/app/components/QuickBar.tsx` | PRESERVE | — | — |
| Enrichment path | `src/src_figma/app/components/EnrichmentPanel.tsx`, `src/utils/eventLog.ts` | PRESERVE pending open deltas | — | — |
| Runner/Fielder popovers | `src/src_figma/app/components/RunnerPopover.tsx`, `src/src_figma/app/components/FielderPopover.tsx` | PRESERVE pending open deltas | — | — |
| End-game pipeline | `src/src_figma/hooks/useGameState.ts`, `src/utils/processCompletedGame.ts`, `src/utils/seasonAggregator.ts` | PRESERVE pending open deltas | — | — |
| Legacy tree | `src/components/GameTracker/` | CUT from Phase 3 consideration | — | — |

## Scope By Layer

### UI Layer (§3-§7)
PRESERVE:
- Quick Bar one-tap flow
- Play-log enrichment and `+FLD`
- Undo
- Runner and fielder popovers
- Lineup and substitution entry points

OPEN:
- Known-bad browser UX cluster is deferred to Phase 3 redesign definition before tactical fixes

### Engine Layer (§8-§14)
PRESERVE:
- At-bat persistence
- Live batting/pitching accumulation
- Inherited runner and pitcher decision tracking
- Fielding event pipeline
- Leverage/WPA, clutch/fame, mojo/fitness wiring
- Season aggregation and milestones

### Systems Layer (§15-§25)
PRESERVE:
- Narrative recap generation
- mWAR season aggregation
- Schedule completion
- Playoff result propagation
- Archive / integrity / replay guardrails

OPEN:
- None pending scope rulings; implementation/design constraints recorded below

## Index.tsx Disposition
Not applicable in the live routed tree. The Phase 3 monolith decision applies to `src/src_figma/app/pages/GameTracker.tsx` plus `src/src_figma/hooks/useGameState.ts`, not the dead legacy `src/components/GameTracker/index.tsx`.

## All Rulings (chronological)
RULING #1:
Type: DISCREPANCY
Layer: UI
Code ref: `src/src_figma/app/pages/GameTracker.tsx:1611-1613`, `src/src_figma/app/pages/GameTracker.tsx:2072-2074`, `src/src_figma/hooks/useGameState.ts:2299-2301`, `src/src_figma/hooks/useGameState.ts:3298-3301`
Spec ref: §2.1, §4.2
JK's answer: "fix now"
Decision: MODIFY-CODE
Effort: M

RULING #2:
Type: DISCREPANCY
Layer: UI
Code ref: `src/src_figma/app/pages/GameTracker.tsx:2192-2251`, `src/src_figma/hooks/useGameState.ts:3254-3295`
Spec ref: §3.2, §6.5
JK's answer: "should support batter to any base on errors"
Decision: MODIFY-CODE
Effort: M

RULING #3:
Type: BATCH
Layer: ENGINE
Code ref: `src/utils/eventLog.ts:613-627`, `src/src_figma/hooks/useGameState.ts:3577-3599`, `src/src_figma/app/pages/GameTracker.tsx:1030-1037`, `src/src_figma/app/pages/GameTracker.tsx:1138-1178`, `src/src_figma/app/pages/GameTracker.tsx:2725-2733`, `src/src_figma/app/pages/GameTracker.tsx:3686-3690`
Spec ref: §1.3, §2.2, §5.1-§5.6
JK's answer: "need it now"
Decision: MODIFY-CODE
Effort: L

RULING #4:
Type: DISCREPANCY
Layer: UI
Code ref: `src/src_figma/app/components/RunnerPopover.tsx:162-165`
Spec ref: §5.1
JK's answer: "let's fix"
Decision: MODIFY-CODE
Effort: S

RULING #5:
Type: DISCREPANCY
Layer: ENGINE
Code ref: `src/src_figma/app/pages/GameTracker.tsx:3158-3168`, `src/src_figma/app/pages/GameTracker.tsx:3200-3205`, `src/utils/seasonAggregator.ts:196-210`
Spec ref: §6.1, §9.7
JK's answer: "fix"
Decision: MODIFY-CODE
Effort: M

RULING #6:
Type: DISCREPANCY
Layer: ENGINE
Code ref: `src/utils/processCompletedGame.ts:34-52`, `src/utils/seasonAggregator.ts:64-125`, `src/src_figma/app/engines/warOrchestrator.ts:144-276`
Spec ref: §11.1-§11.6
JK's answer: "yes, wire it now"
Decision: MODIFY-CODE
Effort: M/L

RULING #7:
Type: DISCREPANCY
Layer: UI
Code ref: `src/src_figma/app/components/FenwayBoard.tsx:175-179`, `src/src_figma/app/pages/GameTracker.tsx:2911-2922`, `src/src_figma/app/pages/GameTracker.tsx:3550`
Spec ref: §5.4, §7.4
JK's answer: "needs to be fixed to allow user to choose pitcher"
Decision: MODIFY-CODE
Effort: M

RULING #8:
Type: UNKNOWN BATCH
Layer: UI
Code ref: `src/src_figma/app/components/RunnerPopover.tsx`, `src/src_figma/app/components/FielderPopover.tsx`, `src/src_figma/app/components/EnrichmentPanel.tsx`, `src/src_figma/app/pages/GameTracker.tsx:3125-3135`, `src/src_figma/app/pages/PostGameSummary.tsx`
Spec ref: §4, §5, §7
JK's answer: "these are all problemes in one way or another, but we need to discuss re-design before fixing things that may need to be changed anyway; seems like we're getting ahead of ourselves"
Decision: DEFER
Effort: M/L

RULING #9:
Type: DISCREPANCY
Layer: SYSTEMS
Code ref: `src/src_figma/app/pages/GameTracker.tsx:3213-3238`
Spec ref: §20.1-§20.4
JK's answer: "let's align with the written spec"
Decision: MODIFY-CODE
Effort: M

RULING #10:
Type: GAP
Layer: SYSTEMS
Code ref: `src/src_figma/hooks/useGameState.ts:1258-1261`, `src/engines/calibrationService.ts:393-444`, `src/src_figma/app/engines/warOrchestrator.ts:183-202`
Spec ref: §22, §23
JK's answer: "yes, it fuller park/adaptive integration now"
Decision: MODIFY-CODE
Effort: M/L

## Design Constraints (for Phase 3)
- Preserve the live `src/src_figma/` route as the only in-scope implementation.
- Default to preserving working behavior unless a confirmed defect or spec-critical gap demands change.
- Treat `src/components/GameTracker/` as dead code for redesign decisions.
- Resolve scope before design; no implementation changes should be inferred from this document without explicit rulings.
- Recording actions must expose authoritative persisted `eventId`s back to the page.
- Error recording must support batter destination to any reached base.
- V1 must emit formal `BetweenPlayEvent`s for runner actions, pitcher changes, substitutions/position changes, manager moments, and mojo/fitness changes.
- Pitcher achievement detection and aggregation must scale with scheduled innings.
- Completed-game processing must populate stored WAR fields for leaderboards and award surfaces.
- Scoreboard pitcher tap must open explicit pitcher selection.
- The known-bad runner/fielder/enrichment/post-game UX cluster is deferred to Phase 3 redesign before tactical fixes.
- Fan morale inputs must align with the written spec's richer context model.
- Park-factor and adaptive-standards integration must be materially fuller than stadium-name-only scaffolding.

## Effort Summary

| Category | Count | Est. Effort |
|---|---|---|
| Auto-preserve candidates | 21 | None |
| Open ruling items | 10 | Mixed S-L |
