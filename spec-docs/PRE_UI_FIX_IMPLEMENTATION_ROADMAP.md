# Pre-UI Fix Implementation Roadmap

**Purpose:** fix the known correctness, ownership, and persistence defects in GameTracker and Elimination Mode before deciding on improvements or redesigning UI/UX.

**Scope:** current live code only, centered on `src/src_figma` and the production storage/engine modules it calls.

**This roadmap is not a redesign plan.** It is a stabilization and truth-centralization plan.

---

## Why This Exists

The repo now has a strong static understanding of current behavior, but the live system still has known defects:

- split sources of truth
- broken identity continuity
- incomplete durable event logging
- page-layer logic bypassing the core game-state spine
- elimination bracket/runtime inconsistencies

If UI/UX work starts before these are fixed, the redesign will inherit unstable semantics and misleading data behavior.

---

## Execution Rules

1. `useGameState` becomes the canonical game-action recorder.
2. `GameTracker.tsx` becomes UI composition/orchestration, not durable baseball logic.
3. Every work package needs acceptance criteria and tests.
4. Each package should land in its own commit unless tightly coupled to the next one.
5. No major UI redesign during this roadmap.

---

## Work Package Order

### WP1. Player Identity Continuity

**Why first**

This is the highest-risk defect across GameTracker, Elimination, stats aggregation, mojo/fitness carryover, and Almanac-facing data. If this is wrong, all downstream fixes can still write truth under the wrong identity.

**Primary problem**

Stable Mode 1 / League Builder `player.id` survives into launch payloads, but runtime GameTracker logic still rewrites players into side-based IDs in key paths, splitting statistical identity.

**Main files**

- `src/src_figma/app/pages/GameTracker.tsx`
- `src/src_figma/hooks/useGameState.ts`
- `src/utils/eliminationRosterStorage.ts`
- `src/utils/gameStorage.ts`
- `src/utils/processCompletedGame.ts`
- `src/utils/seasonAggregator.ts`
- `src/utils/careerStorage.ts`
- any mojo/fitness persistence modules used by elimination

**Tasks**

1. Trace every place runtime IDs are derived or rewritten.
2. Replace side-based canonical IDs with stable source `playerId`.
3. Preserve side/team context in separate fields rather than inside ID strings.
4. Audit season/career/playoff/completed-game rows after the change.
5. Re-check Museum/Almanac consumers that rely on player keys.

**Acceptance criteria**

- A player keeps the same canonical `playerId` from League Builder through:
  - elimination snapshot
  - GameTracker runtime
  - completed game
  - season stats
  - career stats
  - playoff stats
  - mojo/fitness carryover
- No code path relies on `home-*` / `away-*` IDs as canonical player identity.

**Required tests**

- new integration test for player ID continuity across an elimination game
- targeted aggregation test proving the same `playerId` is used in completed/season/career/playoff stores

---

### WP2. Canonical Game Action Recorder

**Why second**

After identity is stable, the next biggest defect is split authorship between `GameTracker.tsx` and `useGameState`.

**Primary problem**

QuickBar, field interactions, popovers, and side prompts do not all feed one normalized action boundary with one durable write model.

**Main files**

- `src/src_figma/hooks/useGameState.ts`
- `src/src_figma/app/pages/GameTracker.tsx`
- `src/src_figma/app/components/EnhancedInteractiveField.tsx`
- `src/src_figma/app/components/QuickBar.tsx`

**Tasks**

1. Define a normalized action interface for:
  - at-bat outcomes
  - runner actions
  - substitutions / position changes
  - pitching changes
  - fielding enrichments
2. Move action interpretation out of page-layer branches where possible.
3. Make page/UI layers dispatch normalized actions only.
4. Keep derived UI state, prompts, and modals in the page layer.

**Acceptance criteria**

- all baseball actions are committed through one core recorder boundary
- page layer no longer writes durable baseball truth as a sidecar
- QuickBar and field flows use the same normalized commit model

**Required tests**

- integration test for QuickBar -> recorder -> event log -> state update
- integration test for field-driven enriched play -> recorder -> fielding/event rows

---

### WP3. Between-Play Event Ledger

**Why third**

Current between-play actions mutate live state but do not fully create durable reconstructable truth.

**Primary problem**

`BETWEEN_PLAY_EVENTS` exists conceptually, but the live path still does not reliably write the separate ledger for runner actions and related baseball events.

**Main files**

- `src/utils/eventLog.ts`
- `src/src_figma/hooks/useGameState.ts`
- runner/fielder popover related components

**Tasks**

1. Define the canonical between-play event types that must be durable.
2. Ensure the live path writes them at action time.
3. Include actor identity where relevant:
  - runner
  - batter
  - pitcher
  - fielder
  - manager
4. Ensure current game recovery can replay them.

**Acceptance criteria**

- SB / CS / pickoff / WP / PB / substitution / position change / pitching change are durable rows
- event rows have the necessary actor IDs
- replay/recovery does not depend on page-local state for these actions

**Required tests**

- between-play persistence integration tests
- current-game recovery test from written between-play rows

---

### WP4. Known Correctness Bugs

**Why fourth**

These are specific already-identified contradictions between UI promise and persisted truth.

**Main bugs**

1. QuickBar ROE destination mismatch
2. undo vs event-log desync
3. partial runner/special-event actor attribution
4. error-on-advance and fielder-credit flows not fully closed-loop

**Main files**

- `src/src_figma/app/pages/GameTracker.tsx`
- `src/src_figma/hooks/useGameState.ts`
- `src/utils/eventLog.ts`

**Tasks**

1. Make ROE persistence match scorer-selected destination.
2. Decide and implement undo scope:
  - event-sourced undo
  - or explicit rollback strategy for durable rows
3. Remove or finish UI flows that imply persisted truth but do not actually write it.

**Acceptance criteria**

- no UI path presents a baseball result that the hook persists differently
- undo semantics are explicit and test-backed
- fielder/error attribution flows either become truly durable or are removed from live behavior

**Required tests**

- ROE destination regression test
- undo + event log consistency test
- attribution-path regression tests

---

### WP5. Fielding Attribution Canonicalization

**Why fifth**

Fielding is real but still architecturally fragile because extraction is page-owned and late resolution still exists.

**Main files**

- `src/src_figma/app/utils/fieldingEventExtractor.ts`
- `src/src_figma/app/pages/GameTracker.tsx`
- `src/src_figma/hooks/useGameState.ts`
- `src/utils/eventLog.ts`
- downstream aggregation modules

**Tasks**

1. Move fielding extraction behind the recorder boundary.
2. Preserve stable player identity in fielding rows.
3. Reduce dependence on late “resolve by position after the fact” flows.
4. Verify substitutions/position changes do not corrupt fielding attribution.

**Acceptance criteria**

- fielding events are emitted from the canonical recording path
- fielding rows carry enough identity to aggregate without fragile late remapping
- substitutions and position switches do not misattribute putouts/assists/errors

**Required tests**

- fielding event extraction integration test
- substitution/position-change fielding attribution test

---

### WP6. Elimination Bracket Structural Repairs

**Why sixth**

At this point GameTracker truth is more stable, so elimination bracket orchestration bugs can be addressed safely.

**Primary problems**

- final-round generation assumptions conflict with current elimination structure
- some elimination runtime/stat context still depends on repaired-but-not-fully-finished seams

**Main files**

- `src/engines/playoffEngine.ts`
- `src/utils/playoffStorage.ts`
- `src/utils/eliminationManager.ts`
- `src/src_figma/hooks/useGameState.ts`
- `src/src_figma/app/pages/EliminationHome.tsx`

**Tasks**

1. Fix final-round / next-round generation assumptions for elimination brackets.
2. Verify series advancement with current elimination structure.
3. Reconcile elimination-specific competition scope in all downstream writes.

**Acceptance criteria**

- full elimination bracket can advance through finals correctly
- completed elimination games write correct competition context
- leaders/history/awards still resolve correctly

**Required tests**

- bracket advancement integration test through finals
- leaders/history post-bracket verification test

---

### WP7. Manager / mWAR Canonical Ownership

**Why seventh**

Manager logic is real, but ownership and autosave are not yet robust enough to build further features on top of.

**Main files**

- `src/src_figma/hooks/useMWARCalculations.ts`
- `src/src_figma/app/pages/GameTracker.tsx`
- manager persistence modules

**Tasks**

1. Ensure manager identity is explicit for both teams.
2. Ensure decisions are written/recoverable with current-game state.
3. Keep manager prompts as UI over durable decision truth.

**Acceptance criteria**

- both teams’ manager decisions are attributed correctly
- refresh/recovery does not drop in-progress decision truth

**Required tests**

- manager identity attribution test
- manager autosave/recovery test

---

### WP8. Fame / WAR / Mojo-Fitness Scope Cleanup

**Why eighth**

These systems exist, but they are unevenly live. Do this after the core game truth and elimination pipeline are stable.

**Tasks**

1. Collapse split fame tracking into one durable pipeline.
2. Decide whether mojo/fitness are:
  - canonical and durable
  - or intentionally demoted from the core spine for now
3. Wire true end-game WAR orchestration where intended.

**Acceptance criteria**

- there is one source of fame truth
- mojo/fitness ownership is explicit
- WAR recomputation path is either live and tested or intentionally deferred

---

### WP9. Runtime Verification Pass

**Why last**

Static correctness is not enough. Before improvement/redesign decisions, run the repaired system end to end.

**Tasks**

1. Execute the critical scenarios:
  - franchise game launch -> completion
  - elimination setup -> game -> round advance -> completion
  - leaders/history/almanac checks after writes
2. Reconcile persisted stores after each scenario.
3. Record any remaining defects before discussing feature improvements.

**Acceptance criteria**

- scenario ledger passes
- store reconciliation matches expectations
- remaining issues are now true enhancement decisions, not hidden correctness defects

---

## Suggested Commit Boundaries

Use one commit per work package unless a dependency forces a split:

- WP1 identity continuity
- WP2 recorder canonicalization
- WP3 between-play ledger
- WP4 correctness bug fixes
- WP5 fielding canonicalization
- WP6 elimination bracket repairs
- WP7 manager/mWAR
- WP8 fame/WAR/mojo-fitness
- WP9 verification/tests/docs

---

## What Not To Do Yet

Do not start these until this roadmap is largely complete:

- visual redesign of GameTracker layout
- redesign of EliminationHome / Team Hub UI
- adding new GameTracker feature concepts
- broad UX experimentation on top of split truth

---

## Recommended Execution Start

Start with:

- **WP1 Player Identity Continuity**

Then immediately:

- **WP2 Canonical Game Action Recorder**

Those two packages will determine whether the rest of the roadmap is straightforward or messy.

