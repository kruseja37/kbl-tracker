---
name: spec-ui-alignment
description: Audit KBL Tracker for misalignment between spec documents, backend logic (engines/storage/hooks), and frontend UI (components/views). Use when asked to "align code with specs", "audit spec compliance", "find spec violations", "sync frontend and backend", "check if UI matches the code", or any request to ensure the implementation matches the documented requirements. Detects where the UI displays something the backend doesn't support, where the backend calculates something the UI doesn't show, and where either diverges from spec-docs.
---

# Spec-UI Alignment Auditor

## Context

KBL Tracker was built iteratively with AI tools across many sessions. Specs were written first, then implementation happened over time. Drift occurs in three ways:

1. **UI promises what backend can't deliver** — Button/display exists but backend logic is missing or broken
2. **Backend calculates what UI doesn't show** — Engine computes a value but no component renders it
3. **Both exist but diverge from spec** — Implementation differs from documented requirements

This skill systematically finds and resolves all three types.

## Architecture Note

**SHARED-SOURCE architecture** — BOTH directory trees are active and interconnected:
- `src/src_figma/` = UI layer. The `@/` alias resolves here (vite.config.ts + tsconfig).
- `src/engines/`, `src/utils/`, `src/types/` = CORE logic — imported directly by src_figma via relative paths
- `src/src_figma/app/engines/` = integration wrappers adapting base engines for Figma UI
- **When auditing alignment, check BOTH trees**: a spec might be implemented in `src/engines/` (core logic) with its UI in `src/src_figma/app/pages/` — they're connected by import chains through hooks
- **Example chain**: `BWAR_CALCULATION_SPEC.md` → `src/engines/bwarCalculator.ts` → `src/src_figma/app/hooks/useWARCalculations.ts` → `FranchiseHome.tsx`

## Critical File Paths

See `references/SPEC_CODE_MAP.md` for the complete mapping of every spec doc to its implementing files.

```
# Spec docs (source of truth)
spec-docs/                              # 100+ spec documents

# UI LAYER (src/src_figma/ — the @ alias root)
src/src_figma/app/pages/                # 14 page components
src/src_figma/app/components/           # 40 component files (36 .tsx + 3 .ts logic modules + 1 figma utility)
src/src_figma/app/engines/              # 14 integration files (12 wrappers + coordination utilities)
src/src_figma/app/hooks/                # 8 app hooks (WAR, fame, morale, useSeasonStats, etc.)
src/src_figma/hooks/                    # 8 core UI hooks (useGameState: 2,968 lines)
src/src_figma/utils/                    # 9 Figma-side storage/utility files
src/src_figma/app/types/                # game.ts, substitution.ts, war.ts

# CORE LOGIC LAYER (src/ — shared, imported by src_figma via ../../ paths)
src/engines/                            # 18 calculation engines (WAR, mojo, salary, etc.)
src/utils/                              # 17 storage files + eventLog + seasonAggregator
src/types/                              # game.ts (50KB), index.ts, war.ts
src/hooks/                              # 18 base hooks (some still actively imported)
```

## Pre-Flight

1. Read these spec docs (in order):
   - `spec-docs/CURRENT_STATE.md`
   - `spec-docs/REQUIREMENTS.md`
   - `spec-docs/FEATURE_WISHLIST.md` (known gaps)
   - `spec-docs/SPEC_INDEX.md` (master index of all specs)
2. Read `references/SPEC_CODE_MAP.md` (in this skill directory) for exact file mappings
3. Catalog the spec docs available in `spec-docs/` — each represents a system with specific requirements
4. Run `npm run build` and `npm test` for baseline

## Audit Methodology

### Layer 1: Spec → Backend Alignment

For each spec document, verify the backend implements what's documented.

**Process per spec file:**

```
For each spec in spec-docs/:
  1. Extract all requirements/rules/formulas from the spec
  2. Identify the corresponding source files (use SPEC_CODE_MAP.md)
  3. For each requirement:
     - Does corresponding code exist?
     - Does the code implement the requirement correctly?
     - Are edge cases from the spec handled?
  4. Flag: MISSING (no code), WRONG (code differs from spec), PARTIAL (incomplete)
```

**Priority specs to audit first** (most likely to have drift):

| Spec Doc | Why Priority |
|----------|-------------|
| `BWAR_CALCULATION_SPEC.md` | Complex formulas, known runsPerWin issue |
| `PWAR_CALCULATION_SPEC.md` | Complex formulas |
| `FWAR_CALCULATION_SPEC.md` | Complex formulas |
| `SALARY_SYSTEM_SPEC.md` | Salary caps/floors, complex rules |
| `MOJO_FITNESS_SYSTEM_SPEC.md` | SMB4-specific, many triggers |
| `LEVERAGE_INDEX_SPEC.md` | Complex calculation |
| `INHERITED_RUNNERS_SPEC.md` | Recently implemented |
| `SUBSTITUTION_FLOW_SPEC.md` | Complex UI flow |

### Layer 2: Backend → UI Alignment

Verify the UI correctly displays what the backend provides.

**Process:**

```
For each engine/calculator in src/engines/ AND src/src_figma/app/engines/:
  1. Identify all exported functions and their return types
  2. Search src/src_figma/app/components/ and src/src_figma/app/pages/ for imports/usage
  3. For each function:
     - Is it called anywhere in UI code? If not → UNUSED_BACKEND
     - Where it IS called, does the UI display the result correctly?
     - Does the UI handle null/undefined/loading states?
     - Are the labels/formatting correct for the data type?

For each hook in src/src_figma/hooks/ AND src/src_figma/app/hooks/:
  1. Identify what data the hook provides (exported interface/return type)
  2. Find all components that consume the hook
  3. Verify components use all relevant fields
  4. Verify components don't reference fields that don't exist
```

### Layer 3: UI → Backend Alignment

Verify every UI element has working backend support.

**Process:**

```
For each component in src/src_figma/app/components/ AND pages/:
  1. Identify all interactive elements (buttons, inputs, selects, toggles)
  2. For each element:
     - What handler fires on interaction?
     - Does the handler call real backend logic?
     - Or is it: no-op, TODO, console.log only, hardcoded response?
  3. Identify all displayed data (text, numbers, charts, lists)
  4. For each display:
     - Where does the data come from?
     - Is the source real (storage/engine) or fake (hardcoded)?
  5. Flag: DEAD_BUTTON (no handler), FAKE_DATA (hardcoded), BROKEN_PIPE (handler exists but fails)
```

**Pay special attention to these large files:**
- `GameTracker.tsx` (3,842 lines) — every outcome button must have a real handler
- `FranchiseHome.tsx` (228K) — largest page, most likely to have dead UI
- `EnhancedInteractiveField.tsx` (155K) — drag-drop field, complex interactions

### Layer 4: Cross-Layer Consistency

Check for contradictions across layers:

- Spec says feature X exists, but UI has no entry point for it
- UI has button for feature Y, but spec doesn't mention it
- Backend calculates Z one way, spec documents it another way
- Type definitions don't match between layers:
  - `src/types/game.ts` vs `src/src_figma/app/types/game.ts`
  - `src/types/war.ts` vs `src/src_figma/app/types/war.ts`

## Specific Checks for KBL Tracker

### GameTracker-Specific
- Every outcome button in OutcomeButtons.tsx has a corresponding handler in useGameState.ts
- State handler correctly updates game state per baseball rules
- Game state changes propagate to: MiniScoreboard, EnhancedInteractiveField (diamond), out indicators, LineupCard, SidePanel
- Inning transitions work in both UI and state
- Game end conditions trigger correct flow to PostGameSummary
- Undo system (UndoSystem.tsx) can reverse any state change
- Modals (fielder credit, error on advance, substitutions) all fire correct backend calls

### Stats/Calculations-Specific
- WAR values displayed match WAR engine output for same inputs
- **runsPerWin uses correct formula**: `RPW = 10 × (seasonGames / 162) per FWAR_CALCULATION_SPEC.md Section 2`
  - NOT Pythagorean 17.87
  - Check `src/engines/bwarCalculator.ts` line by line against `spec-docs/BWAR_CALCULATION_SPEC.md`
- Salary calculations in UI match `salaryCalculator.ts` output
- Stats aggregation (game → season → career) produces correct totals
- Leverage index calculations match `spec-docs/LEVERAGE_INDEX_SPEC.md`

### Franchise-Specific
- Season/standings data comes from actual game results (not hardcoded)
- Roster management reflects actual team data from leagueBuilderStorage
- Trade flow (TradeFlow.tsx) connects to transactionStorage
- Draft flow (DraftFlow.tsx) connects to player pool
- Off-season flows connect to offseasonStorage

### League Builder-Specific
- All 7 LeagueBuilder pages read/write to leagueBuilderStorage
- Teams/players displayed match what's in IndexedDB
- Roster changes persist across page navigation

## Fix Protocol

For each misalignment found, determine the correct resolution:

| Situation | Resolution |
|-----------|-----------|
| Spec is right, code is wrong | Fix code to match spec |
| Code is intentionally different from spec | Update spec, add entry to `spec-docs/DECISIONS_LOG.md` |
| UI element has no backend | Either implement backend or remove/disable UI element |
| Backend has no UI | Either add UI or document as future work in `spec-docs/FEATURE_WISHLIST.md` |
| Both wrong | Fix to match what's correct per baseball logic and SMB4 mechanics |

**For each fix:**
1. State what's misaligned and why
2. Propose the fix (which layer to change)
3. Implement
4. Verify: `npm run build` passes, `npm test` passes, UI renders correctly
5. Update `spec-docs/CURRENT_STATE.md` if implementation status changed
6. Log decision in `spec-docs/DECISIONS_LOG.md` if spec was intentionally diverged from

## Anti-Hallucination Rules

- Do NOT claim code matches spec without reading BOTH the spec and the code
- Do NOT assume a function works correctly because it exists — read the logic
- Do NOT fix spec-to-match-code unless the code is intentionally better (document in DECISIONS_LOG)
- If you find a contradiction you can't resolve, flag it for user decision
- Always verify TypeScript types compile after changes (`npm run build`)
- The codebase has TWO parallel source trees (`src/` and `src/src_figma/`) — check BOTH
- Some hooks/engines exist in multiple locations — verify you're checking the right one

### Error Handling

- If a file referenced in SPEC_CODE_MAP doesn't exist at the expected path → report CRITICAL-FILE_NOT_FOUND with the claimed path
- If a test file exists but has 0 test() calls → report actual count, don't assume the documented count
- If a referenced hook/engine is missing → flag as MISSING_IMPLEMENTATION, not as "connected"
- If an import chain is broken → flag as BROKEN_IMPORT with the exact error

## Output

Produce a structured alignment report:

```
# Spec-UI Alignment Audit Report
Date: [date]
Specs audited: [list]
Components audited: [list]
Engines audited: [list]

## Misalignments Found

### Critical (Logic/Data Errors)
| ID | Spec | Code Location | Expected | Actual | Fix |
|----|------|--------------|----------|--------|-----|

### Major (Missing Connections)
| ID | Layer | Description | Resolution |
|----|-------|-------------|-----------|

### Minor (Cosmetic/Labels)
| ID | Location | Issue | Fix |
|----|----------|-------|-----|

### Dead Code (Backend with No UI)
| Function/Module | What It Does | Recommendation |
|----------------|-------------|----------------|

### Dead UI (Buttons/Displays with No Backend)
| Component | Element | What's Missing |
|-----------|---------|---------------|

## Summary Stats
- Spec requirements checked: [X]
- Aligned: [Y]
- Misaligned: [Z]
- Coverage: [Y/X]%
```

Save report to `spec-docs/SPEC_UI_ALIGNMENT_REPORT.md`.
