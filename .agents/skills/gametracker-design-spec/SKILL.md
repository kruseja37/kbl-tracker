---
name: gametracker-design-spec
description: Implementation-aware design spec for GameTracker UI/UX that respects working code. Consumes scope lock (PRESERVE/MODIFY/BUILD dispositions) and functional truth. Addresses the index.tsx monolith disposition explicitly. Audits existing visual patterns before proposing changes. Integrates frontend-design skill for visual execution. Every classification approved by JK. ROUTE mixed. Trigger on "design gametracker", "gametracker design spec", "UI spec", or as Phase 3 after gametracker-scope-resolver.
---

# GameTracker Design Spec

## Purpose

Produce a design specification for updating the GameTracker UI. This spec PRESERVES working components, REFACTORS what needs changes, and REBUILDS only where the scope lock demands it.

**CRITICAL: This is a renovation, not a demolition.** Only design changes for non-PRESERVE items.

**Output:** `spec-docs/GAMETRACKER_DESIGN_SPEC.md`

## Prerequisites

Read IN ORDER:

1. `spec-docs/GAMETRACKER_SCOPE_LOCK.md` — must be 🔒 LOCKED. If not, STOP.
2. `spec-docs/GAMETRACKER_FUNCTIONAL_TRUTH.md` — code truth
3. `spec-docs/v1-simplification/MODE_2_V1_FINAL.md` §3.7 — iPad layout reference
4. `spec-docs/GAMETRACKER_UX_COMPETITIVE_ANALYSIS.md` — if exists
5. `src/styles/` — existing CSS/Tailwind patterns
6. `src/src_figma/` — existing Figma design exports (if any)
7. `/mnt/skills/public/frontend-design/SKILL.md` — for Phase D9

Present to JK:
```
DESIGN SPEC — SESSION START

Scope lock: 🔒 LOCKED
  PRESERVE: [N] | MODIFY: [N] | BUILD: [N] | CUT: [N]
Index.tsx disposition: [PRESERVE/REFACTOR/DECOMPOSE — from scope lock]
Design constraints: [list from scope lock]
Existing design patterns found: [what's in src/styles and src_figma]

This design touches [N] of [total] components.
[N] components stay exactly as they are.
Ready?
```

---

## Phase D1: Design Principles

Extract from scope lock rulings + JK's priorities:
```
1. [Principle]: [evidence — ruling #N or JK's words]
```

**JK confirms before proceeding.**

## Phase D2: Component Disposition Map

For EVERY GameTracker component:

```
### PRESERVE (do not touch)
| Component | File | Size | Why |
|-----------|------|------|-----|

### REFACTOR (targeted changes)
| Component | File | Current → Target | Ruling # |
|-----------|------|------------------|----------|

### REBUILD (new replaces old)
| Component | Replaces | Why | Ruling # |
|-----------|----------|-----|----------|

### CUT
| Component | File | Why | Ruling # |
|-----------|------|-----|----------|
```

**APPROVAL GATE:** JK confirms each REFACTOR and REBUILD. "Actually, preserve that" → move it.

## Phase D2.5: Index.tsx Monolith Disposition

**This is the single highest-impact design decision.** index.tsx is ~99KB / ~2500 lines. The scope lock should have a ruling on this, but if it doesn't, ask JK now:

```
INDEX.TSX DISPOSITION

Current state: ~99KB monolith containing:
- [N] useState variables
- [N] useEffect hooks
- [N] handler functions
- [N] sub-component renders
- All game state management

Options:
(a) PRESERVE — work within the monolith, make targeted changes only
    Pro: lowest risk, no structural regression
    Con: keeps the complexity, harder to test and maintain

(b) REFACTOR — extract logical groups into sub-components/hooks
    Pro: better organized, each piece testable
    Con: medium effort, risk of introducing bugs during extraction
    Suggested extractions: [list based on functional truth clusters]

(c) DECOMPOSE — full restructure into component tree
    Pro: clean architecture, each component focused
    Con: highest effort, highest regression risk, longest timeline

JK's ruling determines the entire design approach.
```

**APPROVAL GATE:** JK decides before ANY other design work proceeds.

## Phase D3: Information Architecture

Map information to priority tiers. Each entry includes the component that currently displays it and that component's disposition:

```
### Tier 1: Always Visible
| Info | Source | Current Component | Disposition |
|------|--------|-------------------|-------------|

### Tier 2: Contextual | Tier 3: On-Demand | Tier 4: Post-Game
[same format]
```

**JK reviews:** "Anything in wrong tier?"

## Phase D4: Layout Zones

Start from CURRENT layout. Only change what scope lock demands.

```
### Current Layout (from functional truth)
[describe what exists]

### Proposed Changes ONLY
[each change cites ruling #N]

### Resulting Layout
[ASCII zone map]
```

**APPROVAL GATE:** JK confirms each change.

## Phase D5: Interaction Flows (changes only)

Preserved flows: one-line reference to functional truth.
Changed flows: current → proposed, with ruling citation and time budget (<100ms).

## Phase D6: Component Architecture (REFACTOR + BUILD only)

```
### Preserved (no changes)
[list all with file paths]

### Modified
[specific change per component, with ruling ref]

### New
[purpose, props, renders, state]
```

## Phase D7: State-to-UI Mapping (changes only)

Only changed or new mappings. Preserved mappings get a one-line reference.

## Phase D8: Design Review with JK

Walk through ONLY the changes:
```
There are [N] modifications and [N] new components.
[N] components are untouched.
```

For each: current → proposed → why (ruling #) → "Approve?"
Record APPROVED / MODIFY / REJECT.

## Phase D9: Visual Execution Spec (frontend-design integration)

**Before proposing any visual changes, audit existing patterns:**

```
### Existing Design Language Audit
Tailwind classes in use: [most common patterns from GameTracker components]
Color palette: [extract from existing CSS/Tailwind]
Typography: [fonts/sizes in use]
Spacing patterns: [padding/margin conventions]
Component patterns: [modals, buttons, panels — existing patterns]
src_figma contents: [what exists, if anything]
src/styles contents: [what exists]
```

**Then, for REFACTOR/BUILD components ONLY, apply frontend-design thinking:**

```
### Aesthetic Direction
[Grounded in EXISTING design language — evolve, don't replace]
[Purpose, tone, constraints from frontend-design skill]

### Per Component Visual Spec
#### [ComponentName]
Disposition: REFACTOR | BUILD
Changes from current: [specific visual changes]
Preserved from current: [what stays visually the same]
Typography: [only if changing]
Color: [only if changing]
Animation: [NONE unless critical — speed-first constraint]
Touch targets: [minimum 44x44px per WCAG]
```

**SPEED-FIRST CONSTRAINT:** Any animation or effect adding >50ms to perceived response is rejected. The frontend-design skill's "bold maximalism" is OVERRIDDEN by recording speed.

**APPROVAL GATE:** JK confirms visual direction.

---

## Output Format

`spec-docs/GAMETRACKER_DESIGN_SPEC.md`:

```markdown
# GameTracker V1 Design Specification
Generated: [date]
Status: ⏳ PENDING JK APPROVAL
Depends on: GAMETRACKER_SCOPE_LOCK.md (🔒 LOCKED)

## 1. Design Principles [JK confirmed]
## 2. Component Disposition [JK confirmed]
## 2.5 Index.tsx Disposition [JK confirmed]
## 3. Information Architecture [JK confirmed]
## 4. Layout Zones — changes only [JK confirmed]
## 5. Interaction Flows — changes only [JK confirmed]
## 6. Component Architecture — REFACTOR + BUILD only
## 7. State-to-UI Mapping — changes only
## 8. Visual Execution Spec [JK confirmed]
## 9. Migration Checklist
  - [ ] Per REFACTOR component: [specific change] (ruling #N)
  - [ ] Per BUILD component: [what to build] (ruling #N)
  - [ ] Per CUT component: remove [file] (ruling #N)
  - [ ] Index.tsx: [disposition action] (ruling #N)

## Appendix: Preserved Components
[All PRESERVE components with file paths — developer reference]

## Appendix: Existing Design Tokens
[From D9 audit — colors, fonts, spacing, patterns currently in use]
```

## Final Approval Gate

JK: "Design approved" → ✅ APPROVED → implementation begins.
Update `spec-docs/CURRENT_STATE.md` when approved.

**No code changes until ✅ APPROVED.**

## Routing

D1-D4: Claude.ai (interactive, JK confirms each)
D5-D7: Claude Code CLI | opus (synthesis)
D8: Claude.ai (walkthrough)
D9: Claude.ai or CLI | opus (visual audit + spec)
Final doc: CLI | opus

**Duration:** 3-4 sessions total | **JK time:** ~2 hours

## Anti-Hallucination Rules

- Don't design changes for PRESERVE components
- Don't invent interactions not in scope lock
- Don't propose REBUILD for PRESERVE/REFACTOR items
- Don't skip JK approval gates
- Don't present a complete redesign — delta only
- Don't propose visual changes without auditing existing patterns first
- Don't ignore the index.tsx monolith — it's the #1 design decision
- Ask JK if ambiguous — don't interpret
