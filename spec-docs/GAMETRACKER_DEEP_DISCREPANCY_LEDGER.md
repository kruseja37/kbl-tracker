# GameTracker Deep Discrepancy Ledger

Last updated: 2026-03-09

## Purpose

This ledger lists the most important discrepancies between:

- visible UI behavior
- page-level orchestration
- hook-level canonical logic
- persistence/storage design
- existing tests

It is meant to support gap analysis and implementation sequencing.

## Severity Key

- `Critical`: can produce materially incorrect persisted stats or historical records
- `High`: behavior drift, misleading UX, or hard-to-maintain split logic
- `Medium`: partial implementation or weak guarantees
- `Low`: polish, UX messaging, or maintainability issue

## Critical

### 1. Between-play event store exists, but current gameplay path does not fully write to it

Where:

- `src/utils/eventLog.ts`
- `src/src_figma/hooks/useGameState.ts`

Truth:

- `eventLog.ts` defines `betweenPlayEvents` storage and `logBetweenPlayEvent(...)`
- `useGameState.recordEvent(...)` still ends with `TODO: Log to separate event store`

Impact:

- SB / WP / PB / pickoff / special-event history is not durably captured in the dedicated event store through the main hook path
- live state and some stat counters change, but event-history completeness is weaker than the storage schema suggests

### 2. Fielding events are stored with position-based IDs and resolved to players later

Where:

- `src/src_figma/app/utils/fieldingEventExtractor.ts`
- `src/src_figma/hooks/useGameState.ts`

Truth:

- extracted fielding events use position labels as `playerId`
- end-game aggregation remaps those events back to real players using current lineup-position context

Impact:

- fielding credit can shift incorrectly after substitutions or position switches
- this affects putouts, assists, errors, and any downstream fielding value calculations

### 3. Manual fielder-credit flow is not fully connected to fielding stat persistence

Where:

- `src/src_figma/app/pages/GameTracker.tsx`

Truth:

- `handleFielderCreditConfirm(...)` explicitly notes `TODO: Integrate credits into player stats`
- the modal captures human attribution, but current downstream stat integration is incomplete

Impact:

- thrown-out runner credit on hits and similar plays is not fully trustworthy in persisted fielding stats

### 4. D3K runner tracking is using the error reach bucket

Where:

- `src/src_figma/hooks/useGameState.ts`

Truth:

- when batter reaches on dropped third strike, runner tracker adds them with `howReached: 'error'`

Impact:

- `basesReachedViaError` and earned/unearned logic can be contaminated
- historical interpretation of that runner reaching base is semantically wrong

## High

### 5. Play interpretation is split between page and hook

Where:

- `src/src_figma/app/pages/GameTracker.tsx`
- `src/src_figma/hooks/useGameState.ts`

Truth:

- page computes RBI, converts runner outcomes, branches prompt logic, and chooses recorder calls
- hook contains its own baseball-rule and stat logic

Impact:

- changes can land in one path and not the other
- QuickBar and Enhanced Field can diverge subtly over time

### 6. QuickBar path and Enhanced Field path are parallel, not unified

Where:

- `src/src_figma/app/pages/GameTracker.tsx`

Truth:

- both paths end up at hook recorders
- but both do separate pre-processing and prompt branching

Impact:

- inconsistent behavior risk
- future bug fixes need dual implementation unless architecture changes

### 7. Error-on-advance modal is informational, not fully transactional

Where:

- `src/src_figma/app/pages/GameTracker.tsx`

Truth:

- code comments state that the play was already processed
- error attribution is TODO

Impact:

- UX implies correction/attribution capability
- persisted truth does not fully reflect the user’s modal decisions

### 8. Pitch-count prompt exists, but end-game completion is also directly executed

Where:

- `src/src_figma/hooks/useGameState.ts`

Truth:

- `endGame()` sets prompt state
- then directly calls `completeGameInternal(...)` because route navigation would unmount before prompt completion

Impact:

- pitch-count prompt is not the authoritative gate it appears to be
- user mental model and actual persistence flow do not perfectly match

### 9. Play log is local UI state, not reconstructed canonical history

Where:

- `src/src_figma/app/pages/GameTracker.tsx`

Truth:

- `playLogEntries` is page state
- it is manually appended and trimmed
- it is not rehydrated from `AtBatEvent` records during resume

Impact:

- persisted game truth and visible log truth can drift after refresh/resume
- UI history is a projection, not a canonical query

## Medium

### 10. Existing pitch-count architecture suggests fuller validation than current execution guarantees

Where:

- `src/src_figma/hooks/useGameState.ts`
- `src/src_figma/app/pages/GameTracker.tsx`

Truth:

- pitching change and inning end do use prompt-mediated pending actions
- end-game path partially bypasses this for reliability

Impact:

- mixed model is harder to reason about
- future work could accidentally assume consistent prompt gating across all transitions

### 11. `EnhancedInteractiveField` has overlapping state models

Where:

- `src/src_figma/app/components/EnhancedInteractiveField.tsx`

Truth:

- explicit `flowStep`
- derived `UIPhase`
- remnants of legacy field flow remain alongside the newer 5-step model

Impact:

- internal complexity is high
- hard to know which state model is authoritative during future UI refactors

### 12. Page updates roster display state separately from hook lineup refs

Where:

- `src/src_figma/app/pages/GameTracker.tsx`
- `src/src_figma/hooks/useGameState.ts`

Truth:

- page mutates `awayTeamPlayers` / `homeTeamPlayers`
- hook mutates lineup refs and lineup-state refs

Impact:

- display and canonical substitution state can become inconsistent if one path is updated without the other

### 13. End-game persistence has multiple overlapping responsibilities across page and hook

Where:

- `src/src_figma/app/pages/GameTracker.tsx`
- `src/src_figma/hooks/useGameState.ts`

Truth:

- page handles morale, narrative, mWAR, schedule completion, navigation
- hook handles event-log completion, aggregation, archive, playoff propagation

Impact:

- changing end-game behavior requires tracing both layers
- sequencing bugs are easy to introduce

### 14. Tests validate many isolated expectations, but not full-system truth

Where:

- `src/src_figma/__tests__/gameTracker/*`

Truth:

- there is strong unit-level and component-level coverage
- the targeted run I executed covered logic-level suites
- not all full page-to-storage-to-resume flows are covered by what I ran

Impact:

- confidence is good for local logic
- weaker for full-stack interaction invariants

## Low

### 15. Several user-facing failure paths log to console without strong UI feedback

Where:

- `src/src_figma/app/pages/GameTracker.tsx`

Truth:

- multiple branches contain TODOs for user-facing toasts/notifications

Impact:

- rejected substitutions and some non-blocking failures are harder for users to understand

### 16. Some prompts and overlays overstate completeness

Examples:

- error-on-advance modal
- pitch-count modal at end game
- some enrichment prompts

Impact:

- UX can imply a stronger write-through guarantee than the current code actually delivers

## What Existing Tests Seem To Cover Well

- baseline game-state logic assumptions
- leverage-index display categorization
- many legacy/adjacent GameTracker UI components
- undo-specific logic presence
- some stadium / special-event / component-level contracts

## What Still Needs Truth-Level Verification Later

- resume after refresh using current snapshot path
- fallback resume using event-log reconstruction path
- fielding attribution after substitutions and position switches
- thrown-out runner handling on hits with manual fielder credit
- error-on-advance attribution effects on persisted truth
- exact end-game sequencing with navigation and post-game summary

## Recommended Sequence Before Major UI Redesign

1. Close fielding attribution integrity gaps.
2. Make between-play persistence real or explicitly defer it.
3. Unify play-interpretation logic so QuickBar and Enhanced Field share the same core.
4. Decide whether play log should remain a page projection or become a derived persisted query.
5. Simplify pitch-count and end-game authority.

## Bottom Line

The current codebase is substantially built, but several of its most important mismatches are not "missing features". They are places where:

- UX implies stronger guarantees than persistence currently provides
- the schema implies richer event history than the live path writes
- the page and hook both believe they own pieces of gameplay truth

Those are the highest-value targets if the goal is maximal correctness before a UI redesign.
