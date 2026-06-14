---
name: gametracker-functional-audit
description: Automated audit of what the LIVE GameTracker codebase actually does. The live app runs from src/src_figma/ — NOT src/components/GameTracker/ (which is legacy dead code). Audits the Figma-designed GameTracker page, EnhancedInteractiveField, useGameState hook, and all supporting components. Produces GAMETRACKER_FUNCTIONAL_TRUTH.md. ROUTE Claude Code CLI | opus.
---

# GameTracker Functional Audit

## CRITICAL: Correct Codebase Location

**The live application runs from `src/src_figma/`.** This is confirmed by `src/App.tsx` which imports ALL page components from `src/src_figma/app/pages/`.

**`src/components/GameTracker/` is LEGACY DEAD CODE.** It is not imported by any route. Do NOT audit it. A prior Phase 1 run audited that directory by mistake — those results are invalid.

## Purpose

Produce an exhaustive document describing what the LIVE GameTracker does today, from the user's perspective and from the code's perspective.

**Output:** `spec-docs/GAMETRACKER_FUNCTIONAL_TRUTH.md`

## Pre-Flight

1. Confirm project root: `/Users/johnkruse/Projects/kbl-tracker`
2. `npm run build` — must exit 0
3. Branch: `main`
4. **READ-ONLY.**
5. **VERIFY ROUTING FIRST:** Read `src/App.tsx` and confirm that `/game-tracker/:gameId` routes to `src/src_figma/app/pages/GameTracker.tsx`. If it doesn't, STOP and report.
6. Consume existing artifacts:
   - `spec-docs/CURRENT_STATE.md`
   - `spec-docs/GAMETRACKER_BUILD_PLAN.md` (if exists)
   - `spec-docs/GAMETRACKER_BUGS.md` (if exists)
7. If `spec-docs/GAMETRACKER_FUNCTIONAL_TRUTH.md` exists from a prior run, rename it to `GAMETRACKER_FUNCTIONAL_TRUTH_LEGACY.md` before starting.

## Scope — The Live Figma System

### PRIMARY (the GameTracker you see in the browser):

**Pages:**
- `src/src_figma/app/pages/GameTracker.tsx` (253KB) — main page
- `src/src_figma/app/pages/PostGameSummary.tsx` (29KB) — post-game flow

**Core State:**
- `src/src_figma/hooks/useGameState.ts` (194KB) — game state management

**Core Components (in-game UI):**
- `src/src_figma/app/components/EnhancedInteractiveField.tsx` (158KB) — diamond with fielders
- `src/src_figma/app/components/FenwayBoard.tsx` (12KB) — scoreboard
- `src/src_figma/app/components/QuickBar.tsx` (7KB) — outcome buttons
- `src/src_figma/app/components/PlayLogPanel.tsx` (8KB) — play log
- `src/src_figma/app/components/EnrichmentPanel.tsx` (14KB) — enrichment
- `src/src_figma/app/components/OutcomeButtons.tsx` (14KB) — button definitions
- `src/src_figma/app/components/FieldCanvas.tsx` (30KB) — field rendering
- `src/src_figma/app/components/FielderIcon.tsx` (21KB) — fielder positions
- `src/src_figma/app/components/FielderPopover.tsx` (8KB) — fielder actions
- `src/src_figma/app/components/RunnerPopover.tsx` (11KB) — runner actions
- `src/src_figma/app/components/RunnerDragDrop.tsx` (18KB) — runner drag
- `src/src_figma/app/components/RunnerOutcomeArrows.tsx` (17KB) — runner outcomes
- `src/src_figma/app/components/PlayLocationOverlay.tsx` (23KB) — play location
- `src/src_figma/app/components/LineupCard.tsx` (18KB) — lineup
- `src/src_figma/app/components/UndoSystem.tsx` (10KB) — undo
- `src/src_figma/app/components/ActionSelector.tsx` (10KB) — actions
- `src/src_figma/app/components/SidePanel.tsx` (10KB) — side panels
- `src/src_figma/app/components/ModifierButtonBar.tsx` (4KB) — modifiers
- `src/src_figma/app/components/MilestoneWatchPanel.tsx` (3KB) — milestones
- `src/src_figma/app/components/MojoFitnessEditor.tsx` (7KB) — mojo/fitness
- All files in `src/src_figma/app/components/modals/`

**Logic modules inside components/:**
- `src/src_figma/app/components/runnerDefaults.ts` (21KB)
- `src/src_figma/app/components/playClassifier.ts` (18KB)
- `src/src_figma/app/components/fielderInference.ts` (18KB)

**Figma-specific hooks:**
- All files in `src/src_figma/app/hooks/`

**Figma-specific engines (integration wrappers):**
- All files in `src/src_figma/app/engines/`

### SHARED INFRASTRUCTURE (used by Figma system, already partially audited):
- `src/types/game.ts` — shared types
- `src/engines/*` — shared engine modules
- `src/utils/*` — shared utilities (eventLog, seasonAggregator, gameStorage, etc.)
- `src/data/*` — shared data (playerDatabase, parkLookup, fieldZones, etc.)

For shared modules: verify HOW the Figma system consumes them — it may differ from how the legacy system did.

### OUT OF SCOPE:
- `src/components/GameTracker/` — LEGACY, not routed
- `src/archived-components/` — archived
- Offseason flow components (AwardsCeremonyFlow, DraftFlow, FreeAgencyFlow, TradeFlow, RetirementFlow, etc.)
- MuseumContent, ScheduleContent — not in-game

## Context Window Management

This codebase is MASSIVE:
- GameTracker.tsx: 253KB → 7+ passes
- useGameState.ts: 194KB → 6+ passes
- EnhancedInteractiveField.tsx: 158KB → 5+ passes
- Total in-game surface: ~800KB+

### Chunking Protocol

For any file >20KB, read in passes of ~200 lines each. After each pass, write findings immediately.

### File Reading Order

**Tier 0 — Routing verification:**
1. `src/App.tsx` — confirm all routes point to src_figma

**Tier 1 — State and types:**
2. `src/src_figma/hooks/useGameState.ts` — the game state hook (194KB, 6+ passes)
3. `src/types/game.ts` — shared types

**Tier 2 — Core logic modules:**
4. `src/src_figma/app/components/runnerDefaults.ts`
5. `src/src_figma/app/components/playClassifier.ts`
6. `src/src_figma/app/components/fielderInference.ts`

**Tier 3 — Engine integrations:**
7. All files in `src/src_figma/app/engines/`

**Tier 4 — UI components (small first):**
8. QuickBar, FenwayBoard, PlayLogPanel, ModifierButtonBar, MilestoneWatchPanel
9. FielderPopover, RunnerPopover, ActionSelector, UndoSystem
10. EnrichmentPanel, OutcomeButtons, LineupCard, SidePanel
11. RunnerDragDrop, RunnerOutcomeArrows, RunnerOutcomesDisplay
12. FieldCanvas, FielderIcon, PlayLocationOverlay
13. Modals (FielderCreditModal, ErrorOnAdvanceModal, SubstitutionModalBase)

**Tier 5 — The big components (last):**
14. `src/src_figma/app/components/EnhancedInteractiveField.tsx` (158KB)
15. `src/src_figma/app/pages/GameTracker.tsx` (253KB)

**Tier 6 — Shared utils verification:**
16. Check how Figma's GameTracker calls `src/utils/eventLog.ts`, `seasonAggregator.ts`, `gameStorage.ts`

## Classification System

Same as before:
```
✅ WORKING  — Logic sound, behavior plausibly correct
⚠️ UNKNOWN  — Needs browser/runtime verification
❌ BROKEN   — Visible bug (cite the line)
🪦 DEAD     — Never called or reachable (prove it)
```

Default ✅ WORKING unless counter-evidence found.

## Phases 1-7

Same structure as before (Component Inventory, State Architecture, Interaction Map, Engine Integration Map, Data Flow Traces, Dead Code, Anomalies) but targeting the correct files.

**Phase 5 Data Flow Traces must reflect the actual UI flow:**
The user sees a landscape field with fielder positions, a FenwayBoard scoreboard, a QuickBar, and a PlayLog. Traces should follow the path the user actually takes.

## Output

`spec-docs/GAMETRACKER_FUNCTIONAL_TRUTH.md` — same format as before but about the correct codebase.

## Routing

**ROUTE: Claude Code CLI | opus**
**Duration:** 4-6 hours (the live codebase is ~2x larger than the legacy one)
**Resume:** Write PARTIAL with resume point if context exceeded.

## Anti-Hallucination Rules

Everything from before, plus:
- **VERIFY ROUTING BEFORE AUDITING.** Read App.tsx first. If a component isn't imported by a live route, it's dead code.
- **Do NOT audit `src/components/GameTracker/`.** It is legacy.
- **If you find imports from `src/components/` inside `src/src_figma/`, note them** — the Figma system may reference some legacy modules.
