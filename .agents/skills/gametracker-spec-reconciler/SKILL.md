---
name: gametracker-spec-reconciler
description: Diff the GameTracker UI/UX implementation against MODE_2_V1_FINAL.md §3-§7 spec, surface every discrepancy as a numbered question for JK to decide, then produce an approved reconciliation plan. Use when asked to "reconcile gametracker", "fix gametracker UI", "align gametracker with spec", "what's wrong with the gametracker", "gametracker audit", or any request to identify and fix GameTracker UI/UX gaps. This skill does NOT auto-fix — it asks questions first, then builds a plan from JK's answers.
---

# GameTracker Spec Reconciler

## Purpose

The GameTracker was rebuilt across Layers 1-5 without browser verification. The result is a UI that compiles but has significant UX gaps versus the spec. This skill:

1. **Phase 1 — DIFF:** Reads spec §3-§7 and the current code, produces a numbered list of every discrepancy
2. **Phase 2 — ASK:** Presents each discrepancy to JK as a question with options (keep current, revert to spec, modify, defer)
3. **Phase 3 — PLAN:** Builds a reconciliation plan from JK's answers — exact file changes, ordered by priority
4. **Phase 4 — (optional) EXECUTE:** If JK approves, executes fixes in batches per the batch-fix-protocol skill

This skill NEVER auto-fixes. Every change requires JK's explicit decision.

---

## Pre-Flight

### Step 1: Build Gate
```bash
npm run build
```
Must pass. If not, stop.

### Step 2: Read Spec Sections
Read these sections from `spec-docs/v1-simplification/MODE_2_V1_FINAL.md` **in full**:
- §3.1 Quick Bar Design
- §3.2 What Happens on Tap (1-Tap Execution Flow)
- §3.3 Undo System
- §3.4 End-of-Inning Auto-Detection
- §3.5 Runner Override Scenarios
- §3.6 What Was Cut from Previous Flow
- §3.7 iPad Layout
- §4.1-4.5 Enrichment System
- §5.1-5.6 Between-Play Events
- §6.1-6.8 Baseball Rules & Logic
- §7.1-7.5 Substitution System

For each section, extract every concrete requirement (things the UI MUST do, MUST show, MUST NOT do). Store these as a numbered list — you'll compare each against the code.

### Step 3: Read Current Implementation
Read these files completely:
- `src/src_figma/app/pages/GameTracker.tsx` (4600+ lines — use targeted reads, section by section)
- `src/src_figma/app/components/QuickBar.tsx`
- `src/src_figma/app/components/FenwayBoard.tsx`
- `src/src_figma/app/components/PlayLogPanel.tsx`
- `src/src_figma/app/components/EnrichmentPanel.tsx`
- `src/src_figma/app/components/EnhancedInteractiveField.tsx` (4300+ lines — targeted reads)
- `src/src_figma/app/components/ActionSelector.tsx`
- `src/src_figma/app/components/RunnerPopover.tsx`
- `src/src_figma/app/components/FielderPopover.tsx`
- `src/src_figma/app/components/LineupCard.tsx`
- `src/src_figma/app/components/MiniScoreboard.tsx`
- `src/src_figma/app/components/UndoSystem.tsx`
- `src/src_figma/hooks/useGameState.ts` (4800+ lines — targeted reads for relevant handlers)

For each file, note its line count and what it actually renders/does.

### Step 4: Read Old GameTracker (Pre-Layer-2)
Check if the old layout code is preserved in a `{false && (...)}` disabled block in GameTracker.tsx, or in `src/archived-components/`. This is the reference for what USED to work before the grid rewrite. If found, read it — it shows the UI patterns that worked.

---

## Phase 1: DIFF — Find Every Discrepancy

For each spec requirement extracted in Step 2, check the current code and classify:

| Status | Meaning |
|--------|---------|
| ✅ MATCH | Code implements spec correctly |
| ❌ MISSING | Spec requires it, code doesn't have it |
| ⚠️ CONFLICT | Code has something, but it contradicts the spec |
| 🔀 DUPLICATE | Two systems do the same thing (e.g., QuickBar + ActionSelector) |
| 🗑️ EXTRA | Code has something the spec doesn't mention |

### Diff Categories

Organize findings into these categories:

#### Category 1: Layout & Grid (§3.7)
Compare the spec's 5-zone layout against the actual CSS grid:
- Fenway Board dimensions and content
- Diamond display size and proportions
- Play Log width and readability
- Quick Bar position and button layout
- Modifier/Action zone content
- Overall grid template (columns, rows, gaps)

#### Category 2: Input Systems (§3.1, §3.6)
- QuickBar: all 8 primary buttons present? Overflow menu with all 13 items?
- ActionSelector (HIT/OUT/OTHER): should this still render? §3.6 says old flow was cut
- Both systems rendering simultaneously?
- Which system actually records plays?

#### Category 3: 1-Tap Flow (§3.2)
For EACH QuickBar button (K, GO, FO, LO, 1B, BB, 2B, HR):
- Does tapping it trigger handleQuickBarOutcome?
- Does handleQuickBarOutcome call the correct useGameState function?
- Does the game state actually update (outs, bases, score, batter)?
- Does the UI re-render (diamond, scoreboard, play log)?
- Are runner defaults applied correctly?

#### Category 4: Diamond Interactions (§5.1, §5.5, §5.6)
- Can you tap a runner? Does RunnerPopover appear?
- Does RunnerPopover offer: Steal, Pickoff, Wild Pitch, Passed Ball, Advance?
- Does each RunnerPopover action complete end-to-end?
- Can you tap a fielder? Does FielderPopover appear?
- Does FielderPopover offer: Substitute, PinchHit, MovePosition?
- Does each FielderPopover action complete end-to-end?
- Can you tap the pitcher name? Does pitching change work?

#### Category 5: Lineup & Substitution (§5.2, §7.1-7.5)
- Is LineupCard rendered or accessible anywhere?
- Can the user view the current batting order?
- Can the user see bench players?
- Can the user make a pinch hit substitution?
- Can the user make a pinch run substitution?
- Can the user make a defensive substitution?
- Can the user do a double switch?
- Can the user do a position swap?
- Does the "used player" ❌ marker work?

#### Category 6: Scoreboard & Game Info (§3.7 Fenway Board)
- Does FenwayBoard show: score, inning, outs?
- Does it show: pitcher name, PC, ERA, mojo?
- Does it show: batter name, AVG, HR, mojo?
- Does it show: milestone proximity?
- Does it show: matchup history (batter vs pitcher)?
- Is the MiniScoreboard truncating team names?

#### Category 7: Play Log & Enrichment (§4.1-4.5)
- Does PlayLogPanel show entries with correct format?
- Can you tap an entry to open enrichment?
- Does EnrichmentPanel offer: field location, fielding sequence, pitch type, HR distance?
- Does K/Kc toggle work?
- Is pitch count per at-bat collectible?
- Are enrichment badges visible (+fld, +loc, K?, Q)?

#### Category 8: Undo & End Game (§3.3, §3.4)
- Is undo button visible with remaining count?
- Does undo reverse the last play correctly?
- Does end-game trigger confirmation?
- Does 3-out auto-detection work?

#### Category 9: Overflow & Edge Cases (§3.5, §6.8)
- Do overflow menu items work (PO, 3B, HBP, E, FC, DP, TP, SAC, SF, IBB)?
- Are context-sensitive buttons disabled correctly (SAC at 2 outs, SF without R3, etc.)?
- Do runner override scenarios work (FO with sac fly prompt, GO with R3 score, etc.)?

---

## Phase 2: ASK — Present Each Discrepancy to JK

For every ❌ MISSING, ⚠️ CONFLICT, 🔀 DUPLICATE, and 🗑️ EXTRA finding, present a numbered question:

### Question Format

```
DISCREPANCY D-[N]: [Category] — [Short Title]

SPEC SAYS:
> [exact quote from MODE_2_V1_FINAL.md]

CURRENT CODE DOES:
[what actually happens, with file + line reference]

[Screenshot description if visible in browser testing]

OPTIONS:
A) Align to spec — [describe what would change]
B) Keep current — [describe why it might be acceptable]
C) Modify — [propose a middle ground]
D) Defer to v2 — [describe what gets deferred]

EFFORT: S (< 30 min) / M (30 min - 2 hrs) / L (2+ hrs)
FILES: [list of files that would be touched]
```

### Presentation Rules

1. Present discrepancies ONE AT A TIME — wait for JK's answer before showing the next
2. Start with the biggest UX impact (things that prevent gameplay)
3. Group related discrepancies (e.g., all substitution issues together)
4. For each question, JK responds with A/B/C/D (or a custom answer)
5. Record every answer — these become the reconciliation plan

### Suggested Presentation Order

```
ROUND 1 — Blocking (can't play a game without these):
1. Dual input systems (ActionSelector + QuickBar rendering simultaneously)
2. Diamond too narrow (can't see/tap runners)
3. No lineup access (can't make substitutions)
4. Substitution popovers incomplete

ROUND 2 — Important (game is playable but degraded):
5. FenwayBoard empty space / missing info
6. Scorebug truncation
7. Play Log readability
8. Kc toggle not working

ROUND 3 — Polish (nice to have):
9. Enrichment panel flow
10. Runner override prompts
11. Manager Moments visual indicator
12. Between-inning summary
```

---

## Phase 3: PLAN — Build Reconciliation Plan from Answers

After all questions are answered, produce:

```markdown
# GameTracker Reconciliation Plan
**Date:** [date]
**Discrepancies found:** [N]
**JK decisions:** A=[N] B=[N] C=[N] D=[N]

## Approved Fixes (ordered by priority)

### Batch 1: Blocking Fixes
| # | Discrepancy | Decision | Fix Description | Files | Effort |
|---|-------------|----------|----------------|-------|--------|
| D-1 | Dual input systems | A — align | Hide ActionSelector when QuickBar active | EIF.tsx | S |
| D-2 | ... | ... | ... | ... | ... |

### Batch 2: Important Fixes
| ... |

### Batch 3: Polish Fixes
| ... |

## Deferred to V2
| # | Discrepancy | Reason |
|---|-------------|--------|

## Kept As-Is (JK chose B)
| # | Discrepancy | Reason |
|---|-------------|--------|

## Implementation Notes
[any cross-cutting concerns, dependency order, etc.]
```

Save to `spec-docs/GAMETRACKER_RECONCILIATION_PLAN.md`.

---

## Phase 4: EXECUTE (Optional — only if JK says "go")

If JK approves execution:
1. Follow the `batch-fix-protocol` skill
2. One batch at a time
3. Build verification between each batch
4. Browser screenshot after each batch if Claude in Chrome is available
5. NEVER combine fixes from different batches
6. If a fix breaks something, revert and report

---

## Anti-Hallucination Rules

1. Do NOT claim a discrepancy exists without reading BOTH the spec quote AND the current code
2. Do NOT claim code "works" without tracing the handler chain (onClick → handler → state update → render)
3. Do NOT assume a component renders because it's imported — check it's in the JSX tree
4. Do NOT group multiple discrepancies into one question — each gets its own numbered question
5. Do NOT propose fixes during Phase 2 (that's Phase 3) — Phase 2 is questions only
6. If you find something ambiguous in the spec, present it as "SPEC_AMBIGUITY" and let JK clarify
7. If you're unsure whether something is a discrepancy, err on the side of asking — JK can always say "keep current"

## Key Files Quick Reference

| Spec Section | Primary Code File | What to Compare |
|-------------|-------------------|-----------------|
| §3.1 Quick Bar | QuickBar.tsx | Button inventory, overflow menu |
| §3.2 1-Tap Flow | GameTracker.tsx (handleQuickBarOutcome) | Handler chain for each outcome |
| §3.3 Undo | UndoSystem.tsx, GameTracker.tsx | Undo button, stack depth |
| §3.4 Auto-Detection | useGameState.ts | 3-out → inning flip |
| §3.5 Runner Override | runnerDefaults.ts, GameTracker.tsx | SF prompt, GO+R3, Error flow |
| §3.6 What Was Cut | EnhancedInteractiveField.tsx | ActionSelector still present? |
| §3.7 Layout | GameTracker.tsx (grid CSS) | 5-zone grid proportions |
| §4.1-4.5 Enrichment | EnrichmentPanel.tsx, PlayLogPanel.tsx | Tap-to-enrich, badges, K/Kc |
| §5.1 Runner Actions | RunnerPopover.tsx | Steal/Pickoff/WP/PB/Advance |
| §5.2 Substitutions | LineupCard.tsx, FielderPopover.tsx | Both entry points per C-002 |
| §5.4 Pitcher Changes | FenwayBoard.tsx (onPitcherTap) | Tap pitcher → change flow |
| §5.5 Position Changes | FielderPopover.tsx (MovePosition) | Position swap |
| §6.8 Button Availability | QuickBar.tsx or GameTracker.tsx | Context-sensitive disabling |
| §7.1-7.5 Substitution | LineupCard.tsx, GameTracker.tsx | All 6 sub types |
