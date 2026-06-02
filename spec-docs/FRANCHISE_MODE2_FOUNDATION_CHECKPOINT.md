# Franchise Mode 2 Foundation Checkpoint

**Date:** 2026-06-02  
**Branch:** `codex/franchise-v1-next`  
**HEAD:** `a987449 Add franchise narrative event eligibility gate`

## Purpose

This checkpoint records the current Mode 2 foundation chain before moving from read-only contracts into consumer UI or eventual mutation systems. The current foundation is deliberately conservative: it classifies trusted facts, preview-only inputs, and blocked/deferred systems without enabling salary movement, True Value, morale, relationships, narrative/random events, awards persistence, or Mode 3 execution.

Manual-smoke bug and UX feedback remains tracked separately in `spec-docs/FRANCHISE_INTERNAL_V1_MANUAL_SMOKE_FEEDBACK.md`.

## Dependency Order

1. Stats/archive/scope trust.
2. Salary baseline and value inputs.
3. Designation/salary lifecycle gates.
4. Morale/relationship trust.
5. Narrative/random-event eligibility.
6. Future consumer UI.
7. Future mutation systems, only after rules are canonical.

## Foundation Chain

### Analytics Trust Report

**File:** `src/utils/franchiseAnalyticsTrust.ts`

**Trusts:** franchise/season/stats-scope identity, scoped completed archives, score-only schedule/standings context, playoff/stat boundaries, and read-only analytics status.

**Blocks:** score-only rows as player stats/WPA/WAR/awards/designation/salary/morale/relationship/narrative inputs; missing or mismatched stats scope; downstream final value consumers.

**Does not mutate/persist:** no WAR creation, no True Value, no salary movement, no narrative, no Mode 3 writes.

**Key tests:** `src/utils/tests/franchiseAnalyticsTrust.test.ts`, `src/utils/tests/processCompletedGame.statBoundary.test.ts`, `src/utils/tests/franchiseStatAttribution.test.ts`, `src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts`.

### Value Input Report

**File:** `src/utils/franchiseValueInputs.ts`

**Trusts:** read-only per-player franchise/season scope, roster status, salary baseline availability, team payroll baseline presence, season metadata, schedule row count, WAR/WPA availability flags, and stadium/park-factor availability.

**Blocks:** final True Value, persisted designations, park-adjusted value conclusions, and treating schedule row count as season length.

**Does not mutate/persist:** no player/team writes, no True Value calculation, no designation persistence.

**Key tests:** `src/utils/tests/franchiseValueInputs.test.ts`.

### Salary Baseline Hardening

**Files:** `src/utils/franchiseSalary.ts`, `src/utils/prospectScoutingDraftEngine.ts`, `src/utils/leagueBuilderStartupFarmDraft.ts`, `src/utils/franchisePlayerStorage.ts`

**Trusts:** round-based startup FARM prospect salary, franchise copy salary normalization, and copied MLB + FARM salary baseline counts/team payrolls.

**Blocks:** salary movement, salary matching, luxury tax, AI valuation, True Value salary effects, and offseason salary recalculation.

**Does not mutate/persist beyond baseline construction:** no in-season salary movement, no Mode 3 salary execution, no salary effects from morale/designations/narratives.

**Key tests:** `src/utils/tests/prospectScoutingDraftEngine.test.ts`, `src/utils/tests/leagueBuilderStartupFarmDraft.test.ts`, `src/utils/tests/leagueBuilderFarmScoutingHandoff.test.ts`, `src/utils/tests/franchiseSalary.test.ts`.

### Designation Eligibility Gate

**File:** `src/utils/franchiseDesignationEligibility.ts`

**Trusts:** read-only eligibility status from value inputs. TEAM_MVP and ACE can be preview-only when stable stat/WAR-like inputs exist.

**Blocks:** persistable final designations under current v1 conditions; Fan Favorite and Albatross without canonical True Value/value delta; Captain, Fan Hopeful, and Cornerstone until future trusted inputs exist.

**Does not mutate/persist:** no designation records, no awards, no badges, no roster/player writes.

**Key tests:** `src/utils/tests/franchiseDesignationEligibility.test.ts`.

### Salary Lifecycle Gate

**File:** `src/utils/franchiseSalaryLifecycle.ts`

**Trusts:** stored player salary baseline and team payroll baseline as read-only stable-baseline context when franchise-owned proof exists.

**Blocks:** performance salary movement, offseason salary recalculation, luxury tax, salary matching, AI trade salary valuation, and final WAR/WPA/True Value salary consumers.

**Does not mutate/persist:** no salary recalculation, no contract writes, no payroll enforcement.

**Key tests:** `src/utils/tests/franchiseSalaryLifecycle.test.ts`.

### Morale/Relationship Trust Contract

**File:** `src/utils/franchiseMoraleRelationshipTrust.ts`

**Trusts:** visible personality and chemistry as stable read-only identity context; roster movement, score-only rows, GameTracker archives, salary baseline, and player-local profile edits as context-only evidence.

**Blocks:** hidden FARM/prospect personality modifiers before reveal; morale changes; relationship changes; narrative/random events; salary movement; Fan Favorite, Albatross, Captain, Fan Hopeful, Cornerstone.

**Does not mutate/persist:** no morale state writes, no relationship state writes, no transaction logging, no story/event persistence.

**Key tests:** `src/utils/tests/franchiseMoraleRelationshipTrust.test.ts`, plus roster and boundary tests listed above.

### Narrative/Random-Event Eligibility Gate

**File:** `src/utils/franchiseNarrativeEventEligibility.ts`

**Trusts:** composed foundation reports only as read-only summary context: scoped GameTracker archives, score-only schedule/standings context, roster movement context, player-local edit context, salary baseline context, TEAM_MVP/ACE preview context, visible personality/chemistry context, and playoff boundary context.

**Blocks:** narrative generation, random event generation, story persistence, morale mutation, relationship mutation, Mode 3/offseason execution, hidden prospect data, True Value/value delta, salary movement, Fan Favorite, Albatross, Captain, Fan Hopeful, Cornerstone, finalized awards, and persisted designations.

**Does not mutate/persist:** no UI writes, no storage writes, no generated stories, no random events, no Mode 3 execution.

**Key tests:** `src/utils/tests/franchiseNarrativeEventEligibility.test.ts`, `src/utils/tests/franchiseAnalyticsTrust.test.ts`, `src/utils/tests/franchiseMoraleRelationshipTrust.test.ts`.

### Player Profile, Edit History, Continuity, and Directory Surfaces

**Files:** `src/utils/franchisePlayerProfile.ts`, `src/utils/franchisePlayerProfileEdit.ts`, `src/utils/franchisePlayerContinuity.ts`, `src/src_figma/app/components/TeamHubContent.tsx`

**Trusts:** franchise-owned player identity, visible-safe profile fields, player-local edit history, read-only continuity projection, selected-team FARM visibility, and loaded player directory context.

**Blocks:** hidden FARM true ratings/true grade/hidden scout truth/hidden personality modifiers before reveal; salary/contract edits; roster/reveal state edits; transaction-history mutation from profile edits.

**Does not mutate/persist except approved manual profile edits:** read-only profile/continuity/directory surfaces do not create official transactions, salary movement, designations, morale, relationships, narratives, or Mode 3 effects. Manual profile edit persistence is limited to allowed visible player fields and player-local edit history.

**Key tests:** `src/utils/tests/franchisePlayerProfile.test.ts`, `src/utils/tests/franchisePlayerProfileEdit.test.ts`, `src/utils/tests/franchisePlayerContinuity.test.ts`, `src/src_figma/__tests__/franchiseMode/TeamHubContent.franchiseReads.test.tsx`.

## Known Deferred Systems

- True Value finalization.
- Salary movement.
- Morale state.
- Relationship state.
- Narrative/random event generation.
- Story persistence.
- Awards persistence.
- Mode 3/offseason execution.
- AI trades.
- Generated schedules.

## Next Recommended Slice

Build a read-only Team Hub / Franchise Home **Mode 2 Foundation Status** panel that surfaces these gates plainly without enabling mutation.

The panel should:

- Read existing foundation reports only.
- Show trusted, preview-only, blocked, deferred, and not-applicable states in compact language.
- Explicitly label score-only, archive-backed, roster-movement, salary baseline, designation preview, morale/relationship, and narrative/random-event status.
- Avoid any controls that imply mutation, recalculation, generation, awards finalization, story persistence, or Mode 3 execution.

Do not begin mutation systems until the canonical rules and persistence contracts are separately approved and tested.
