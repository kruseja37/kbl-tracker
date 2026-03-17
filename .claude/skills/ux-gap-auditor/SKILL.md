---
name: ux-gap-auditor
description: Phased audit of GameTracker codebase against GAMETRACKER_UX_SPEC.md. Produces a structured gap report with exact file:line citations for every spec decision. Uses pre-extracted code sections from the two largest files to prevent context fatigue. Six mandatory phases with checkpoint verification between each. Trigger on "run UX gap audit", "audit against UX spec", "gap analysis", or any request to compare current GameTracker code to the UX spec.
---

# UX GAP AUDITOR

## Purpose

Systematically audit the live GameTracker codebase against every decision in GAMETRACKER_UX_SPEC.md. Produce a structured gap report documenting what EXISTS, what's MISSING, what CONFLICTS, and what should be REMOVED. Every claim in the report must cite exact file:line references.

## When to Use

- After producing or updating GAMETRACKER_UX_SPEC.md
- Before beginning any GameTracker implementation work
- To verify implementation progress against the spec

## Prerequisites

1. `spec-docs/GAMETRACKER_UX_SPEC.md` must exist and be the current canonical spec
2. The audit extracts must be generated. Run from project root:
   ```
   bash spec-docs/audit-extracts/generate_extracts.sh
   ```
   This creates 12 extract files in `spec-docs/audit-extracts/` from the two largest source files (GameTracker.tsx and useGameState.ts).

---

## PHASE 0 — Setup (mandatory, do this first)

### Step 0.1: Generate extracts
```bash
cd /Users/johnkruse/Projects/kbl-tracker
bash spec-docs/audit-extracts/generate_extracts.sh
```
Verify the output shows 12 extract files with line counts.

### Step 0.2: Read foundational docs
Read in full, in this order:
1. `spec-docs/GAMETRACKER_UX_SPEC.md` — the spec you're auditing against
2. `spec-docs/CURRENT_STATE.md` — current architecture state
3. `spec-docs/audit-extracts/MANIFEST.md` — explains the extract files

### Step 0.3: Create the output file
Create `spec-docs/GAMETRACKER_UX_GAP_ANALYSIS.md` with the header:
```markdown
# GameTracker UX Gap Analysis
**Generated:** [date]
**Spec version:** GAMETRACKER_UX_SPEC.md v1.0
**Branch:** main
**Auditor:** Claude Code CLI (Opus)

## Summary
(to be filled after all phases complete)

## Gap Report
```

### Step 0.4: Read the structure extracts
Read these two files in full:
- `spec-docs/audit-extracts/extract_GT_structure.txt`
- `spec-docs/audit-extracts/extract_GS_structure.txt`

These give you the imports, types, and render structure of the two largest files.

### Step 0.5: STOP and report
Output:
```
PHASE 0 COMPLETE
- Spec read: [confirm section count and decision count]
- Extracts generated: [confirm file count]
- Structure extracts read: [confirm]
- Output file created: [confirm]

Ready for Phase 1?
```
Wait for JK to confirm before proceeding.

---

## PHASE 1 — Layout, Score Bug, Quick Bar (UX-001 through UX-016)

### What to read for this phase
1. Re-read spec §1, §2, §3, §4
2. Read the extract: `spec-docs/audit-extracts/extract_layout_scorebug.txt`
3. Read the extract: `spec-docs/audit-extracts/extract_quickbar.txt`
4. Read these component files IN FULL:
   - `src/src_figma/app/components/QuickBar.tsx`
   - `src/src_figma/app/components/FullFenwayScoreboard.tsx`
   - `src/src_figma/app/components/FenwayBoard.tsx`

### What to evaluate
For each of UX-001 through UX-016, determine status and write the entry to the gap report.

UX-001, UX-002: Physical context — no code evaluation needed, mark as N/A.
UX-003: 4-column layout — search for grid/layout structure in extract + GameTracker.tsx JSX
UX-004: Diamond removed — check if GameDiamond.tsx is still rendered in GameTracker.tsx
UX-005: Column proportions — search for width/proportion definitions
UX-006: Score bug single-line — check FullFenwayScoreboard.tsx
UX-007: No pitch count in score bug — check FullFenwayScoreboard.tsx
UX-008: Expanded scoreboard overlay — check for overlay/expand behavior
UX-009: Quick Bar at bottom — check layout position in GameTracker.tsx render
UX-010: Undo + End Game in Quick Bar row — check QuickBar.tsx
UX-011: Button stays depressed — check QuickBar.tsx for feedback behavior
UX-012: Overflow menu as floating grid — check QuickBar.tsx for overflow
UX-013: All 9 batters visible — check lineup rendering
UX-014: Both lineups in batting order — check lineup data ordering
UX-015: Press Start 2P font — search for font references
UX-016: Scoreboard Chalk Retro theme — search for theme/color definitions

### After evaluating all 16 decisions
Append entries to the gap report file. Then STOP and report:
```
PHASE 1 COMPLETE
Decisions evaluated: UX-001 through UX-016
EXISTS: [count] | PARTIAL: [count] | CONFLICTS: [count] | MISSING: [count] | REMOVE: [count] | UNVERIFIED: [count]

Key findings: [2-3 most important gaps or conflicts]

Ready for Phase 2?
```
Wait for JK to confirm.

---

## PHASE 2 — Lineup Columns, Player Card, Newsboard (UX-017 through UX-033)

### What to read for this phase
1. Re-read spec §5, §6
2. Re-read the gap report so far (what you wrote in Phase 1)
3. Read the extract: `spec-docs/audit-extracts/extract_lineup.txt`
4. Read the extract: `spec-docs/audit-extracts/extract_newsboard.txt`
5. Read these component files IN FULL:
   - `src/src_figma/app/components/LineupCard.tsx`
   - `src/src_figma/app/components/MojoFitnessEditor.tsx`
   - `src/src_figma/app/components/InjuryPrompt.tsx`
   - `src/src_figma/app/components/MilestoneWatchPanel.tsx`
   - `src/src_figma/app/components/GameDiamond.tsx`

### What to evaluate
UX-017: Player card compact stats + full attributes
UX-018: Player card stats (AVG/HR/RBI/OPS/WAR/SB for position; ERA/W-L/K/WHIP/IP/pWAR for pitchers)
UX-019: Player card = season stats, Newsboard = game stats
UX-020: Newsboard pinned stats header + scrollable beat reporter feed
UX-021: Matchup history is aggregated stats
UX-022: Post-commit runner correction (no pre-commit gate)
UX-023: Play log entries with team-color styled names
UX-024: Defensive lineup enrichment mode for fielding sequences
UX-025: Context-sensitive enrichment fields per result type
UX-026: Quick Bar result NOT enrichable
UX-027: Catch type in V1, defaults to Routine
UX-028: Context-sensitive spray graphic
UX-029: HR zones 7×3=21
UX-030: Player-first substitution flow
UX-031: Mojo/fitness on player card, injury auto-inferred
UX-032: Pitch count after replacement + every half-inning
UX-033: Newsboard display-only

### After evaluating all 17 decisions
Append entries to the gap report file. Re-read your Phase 1 entries to check for contradictions with Phase 2 findings. Then STOP and report.

---

## PHASE 3 — Play Log, Enrichment System (UX-034 through UX-049)

This is the densest phase — the enrichment taxonomy has the most decisions.

### What to read for this phase
1. Re-read spec §7, §8
2. Re-read the gap report so far (Phases 1-2)
3. Read the extract: `spec-docs/audit-extracts/extract_playlog.txt`
4. Read the extract: `spec-docs/audit-extracts/extract_enrichment.txt`
5. Read these component files IN FULL:
   - `src/src_figma/app/components/PlayLogPanel.tsx`
   - `src/src_figma/app/components/EnrichmentPanel.tsx`
   - `src/src_figma/app/components/HistoricalEventEditor.tsx`
   - `src/src_figma/app/components/RunnerOutcomesDisplay.tsx`
   - `src/src_figma/app/components/LiveRunnerAttributionPanel.tsx`
   - `src/utils/eventLog.ts`

### What to evaluate
UX-034: Pre-game phase with START GAME gate
UX-035: Swap Order pre-game only
UX-036: Manager moment Ⓜ indicator + Stay the Course
UX-037: Half-inning pitch count → role-based column swap
UX-038: Three-phase lifecycle
UX-039: CSS-only cosmetic animations
UX-040: Undo toast message
UX-041: 100% local IndexedDB
UX-042: Resume Game entry points
UX-043: Subtle save indicator
UX-044: No batch catch-up mode needed
UX-045: Fielding play type as separate dimension
UX-046: KP/NUT not on HR/SF/SAC
UX-047: TOOTBLAN and Out Advancing runner-level only
UX-048: K and Ꝁ separate Quick Bar buttons
UX-049: ITPHR in overflow

### After evaluating all 16 decisions
Append entries to the gap report file. STOP and report.

---

## PHASE 4 — Runner Outcomes, Subs, Game Flow, Edge Cases (UX-050 through UX-058)

### What to read for this phase
1. Re-read spec §7.2 (runner sub-entries), §8.6 (two-pathway enrichment), §9, §10, §11, §12
2. Re-read the gap report so far (Phases 1-3)
3. Read the extract: `spec-docs/audit-extracts/extract_subs.txt`
4. Read the extract: `spec-docs/audit-extracts/extract_gameflow.txt`
5. Read the extract: `spec-docs/audit-extracts/extract_edgecases.txt`
6. Read the extract: `spec-docs/audit-extracts/extract_visual.txt`
7. Read these component files IN FULL:
   - `src/src_figma/app/components/RunnerPopover.tsx`
   - `src/src_figma/app/components/FielderPopover.tsx`
   - `src/src_figma/app/components/UndoSystem.tsx`
   - `src/src_figma/app/components/runnerDefaults.ts`
   - `src/src_figma/app/components/RunnerOutcomesDisplay.tsx`

### What to evaluate
UX-050: Runner outcomes on AtBatEvent as runnerOutcomes[] array
UX-051: Runner sub-entries visible in play log under each at-bat
UX-052: Play log is the ONE enrichment surface — player card initiates only
UX-053: BetweenPlayEvents auto-snapshot current pitcher/catcher
UX-054: Retro 8-bit audio with two toggles
UX-055: Runner outcomes locked past undo depth in V1
UX-056: Subtle "Use ↩ Undo to change result" tooltip on locked results
UX-057: Contact type (5 options) replaces exit type
UX-058: Same enrichment mode for AtBatEvent and BetweenPlayEvent sequences

### After evaluating all 9 decisions
Append entries to the gap report file. Then STOP and report:
```
PHASE 4 COMPLETE
Decisions evaluated: UX-050 through UX-058
EXISTS: [count] | PARTIAL: [count] | CONFLICTS: [count] | MISSING: [count] | REMOVE: [count] | UNVERIFIED: [count]

All 58 decisions have now been evaluated across Phases 1-4.
Ready for Phase 5 (self-verification)?
```
Wait for JK to confirm.

---

## PHASE 5 — Self-Verification (mandatory — do not skip)

This phase validates the integrity of the gap report before it is delivered.

### Step 5.1: Entry count verification
Read the gap report file. Count every line that starts with "#### UX-" — there must be exactly 58. If fewer, identify which UX-NNN decisions are missing and go back to evaluate them.

### Step 5.2: Citation verification
For every entry with status EXISTS:
- Verify it contains at least one file:line reference
- Verify it names a specific function, variable, component, or JSX element
- If any EXISTS lacks a citation, change status to UNVERIFIED with note: "Status downgraded — no citation found during self-verification"

For every entry with status CONFLICTS:
- Verify it has BOTH a file:line reference AND a spec section reference
- If either is missing, add it or change to UNVERIFIED

### Step 5.3: Weasel word purge
Search the gap report for these words and phrases. Each is a red flag for unverified claims:
- "likely"
- "probably"
- "should be"
- "appears to"
- "seems like"
- "might be"
- "I believe"
- "I think"
- "presumably"

For each occurrence: either replace with a concrete finding (verified by re-reading the code) or change the entry status to UNVERIFIED.

### Step 5.4: Summary math
Count each status in the report body:
- EXISTS: ___
- PARTIAL: ___
- CONFLICTS: ___
- MISSING: ___
- REMOVE: ___
- UNVERIFIED: ___
- N/A: ___

Verify the total sums to 58. Write the final summary at the top of the report.

### Step 5.5: CODE WITHOUT SPEC HOME section
Scan the component files you read during Phases 1-4. List any significant GameTracker features, components, or behaviors that exist in the code but are NOT referenced by any UX-NNN decision. This catches:
- Orphaned components that the spec says to remove
- Features the spec accidentally omitted
- Code that predates the spec and may need disposition

Add this section at the end of the gap report.

### Step 5.6: Files evaluated section
Append a "Files Read" section listing every file you opened/searched, with what you actually read (full file, first N lines, searched for "X"). Also list any files from the audit plan you did NOT read and why.

### Step 5.7: STOP and report
```
PHASE 5 COMPLETE — SELF-VERIFICATION
Entry count: [58 or state discrepancy]
Citations verified: [count EXISTS with citations] / [total EXISTS]
Weasel words found and resolved: [count]
Summary math: [verified or discrepancy]
Orphaned code items found: [count]

Self-verification: PASS / FAIL (state any failures)

Ready for delivery?
```
Wait for JK to confirm.

---

## PHASE 6 — Spot-Check Anchors

After JK confirms Phase 5, output these spot-check items. These are decisions where the expected answer is known from the UX interview context. JK will manually verify these against the code to validate the audit's accuracy.

### Spot-check list

**SC-1 (UX-004): Diamond removed**
Expected: GameDiamond.tsx still exists as a file AND is likely still rendered in GameTracker.tsx JSX. The spec says diamond is removed — so this should be CONFLICTS or REMOVE.
JK verifies: Open GameTracker.tsx, search for "GameDiamond" — is it rendered?

**SC-2 (UX-048): K and Ꝁ as separate buttons**
Expected: QuickBar.tsx currently has K as one button with Kc as enrichment toggle. The spec says they should be separate buttons — so this should be MISSING or CONFLICTS.
JK verifies: Open QuickBar.tsx, check the OUTCOME_BUTTONS array or equivalent.

**SC-3 (UX-034): Pre-game phase with START GAME gate**
Expected: No pre-game phase exists in current code. GameTracker launches directly into live mode. This should be MISSING.
JK verifies: Open GameTracker.tsx, search for "START_GAME" or "preGame" or "phase".

**SC-4 (UX-049): ITPHR in overflow**
Expected: ITPHR is not in the current overflow menu. This should be MISSING.
JK verifies: Open QuickBar.tsx, check the overflow/secondary buttons list.

**SC-5 (UX-057): Contact type replaces exit type**
Expected: Code currently uses "exitType" or "hitType" terminology, not "contactType" with 5 options. This should be MISSING or CONFLICTS.
JK verifies: Search EnrichmentPanel.tsx for "exitType", "hitType", "contactType".

**SC-6 (UX-050): Runner outcomes as runnerOutcomes[] on AtBatEvent**
Expected: Current AtBatEvent likely does not have a runnerOutcomes[] array with independent enrichment. Runner outcomes are probably tracked separately or via the between-play ledger. This should be MISSING or PARTIAL.
JK verifies: Check eventLog.ts or useGameState.ts for the AtBatEvent interface and look for runnerOutcomes.

**SC-7 (UX-036): Manager moment Ⓜ indicator + Stay the Course**
Expected: Manager moment detection may exist in the engine, but the Ⓜ score bug indicator and "Stay the Course" button are likely MISSING from the UI.
JK verifies: Search GameTracker.tsx for "manager", "leverage", "stayTheCourse".

**SC-8 (UX-003): 4-column layout**
Expected: Current layout is the 5-zone layout from the gospel spec (Fenway Board top-left, Diamond center, Play Log right, Quick Bar bottom-left, Modifier/Action bottom-right) — NOT the new 4-column layout. This should be CONFLICTS.
JK verifies: Look at GameTracker.tsx JSX render — what layout structure exists?

### Spot-check scoring

If Opus got 7-8 out of 8 spot-checks correct: HIGH CONFIDENCE in the full audit.
If Opus got 5-6 correct: MODERATE CONFIDENCE — review PARTIAL and CONFLICTS entries carefully.
If Opus got fewer than 5 correct: LOW CONFIDENCE — re-run affected phases.

---

## RULES OF ENGAGEMENT (apply to ALL phases)

### Evidence rules
1. No status without a citation
2. No inferring — MISSING or UNVERIFIED if you can't find it
3. No summarizing the spec — reference by §N and UX-NNN
4. No proposing fixes — gap report only, not implementation plan
5. No opinions on the spec
6. No grouping/batching — every UX-NNN gets its own entry
7. No skipping — all 58 must be evaluated
8. No hallucinating file contents — search first, then claim
9. Read before claiming absence — check extracts + original files
10. Quote exact function/variable/element names in citations

### Anti-patterns (do NOT do any of these)
1. Do NOT write from memory — re-read the spec section while evaluating
2. Do NOT claim you read/searched a file you didn't
3. Do NOT mark EXISTS because the component file exists — verify the SPECIFIC BEHAVIOR
4. Do NOT confuse "component renders" with "component implements this specific decision"
5. Do NOT batch decisions — each entry stands alone
6. Do NOT write "see above" or "same as UX-NNN"
7. Do NOT add implementation suggestions or code examples
8. Do NOT modify any source files — READ ONLY
9. Do NOT declare completion without verifying 58 entries
10. Do NOT fabricate line numbers — if unsure, give ranges
11. Do NOT soften findings — MISSING means MISSING, not "not yet implemented"
12. Do NOT assume code is correct and spec is wrong — spec is source of truth
13. Do NOT editorialize — facts only
14. Do NOT use the word "straightforward"

### Failure protocol
- If you cannot open a file → mark all dependent decisions UNVERIFIED with "file not readable: [path]"
- If a spec decision is ambiguous → mark UNVERIFIED with the ambiguity quoted
- If an extract doesn't contain what you need → search the original source file directly
- If you are unsure about ANYTHING → mark UNVERIFIED. Never guess.

### Mandatory re-reads between phases
At the START of each phase (before reading any new files), you MUST:
1. Re-read the relevant spec sections for that phase
2. Re-read the gap report entries from prior phases (to catch contradictions)
3. Read the phase-specific extract files

This prevents context drift across the multi-phase audit.

---

## OUTPUT FORMAT

Every gap report entry follows this exact format:

```markdown
#### UX-NNN: [decision title from Appendix B]
**Status:** EXISTS | PARTIAL | CONFLICTS | MISSING | REMOVE | UNVERIFIED | N/A
**Evidence:** [exact file:line citations with named code elements]
**Searched:** [list of files/extracts checked for this decision]
**Notes:** [only if PARTIAL, CONFLICTS, REMOVE, or UNVERIFIED — explain specifically]
```

The `Searched` field is mandatory for every entry. It documents which files you actually checked, preventing "I forgot to look" errors.

---

## QUICK REFERENCE — Decision-to-Phase Map

| Phase | Decisions | Count | Spec Sections |
|-------|-----------|-------|---------------|
| 1 | UX-001 through UX-016 | 16 | §1, §2, §3, §4 |
| 2 | UX-017 through UX-033 | 17 | §5, §6 |
| 3 | UX-034 through UX-049 | 16 | §7, §8, §9 (partial), §10 (partial) |
| 4 | UX-050 through UX-058 | 9 | §7 (runner), §8 (enrichment), §9, §10, §11, §12 |
| 5 | Self-verification | — | — |
| 6 | Spot-check anchors | 8 | Cross-cutting |
| **Total** | | **58** | |
