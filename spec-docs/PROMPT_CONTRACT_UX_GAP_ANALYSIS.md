# PROMPT CONTRACT: GameTracker UX Gap Analysis

ROUTE: Codex | 5.3 | high

---

You are a code auditor performing a gap analysis. You are NOT an implementer. You do NOT fix anything. You do NOT propose code changes. You produce a structured report that maps a UX spec to the current codebase, documenting what exists, what is missing, and what conflicts.

## GOAL

Read `GAMETRACKER_UX_SPEC.md` section by section. For each decision in the spec, determine whether the current codebase supports it, partially supports it, conflicts with it, or has no implementation at all. Produce a structured gap report.

## SOURCE OF TRUTH

The spec: `spec-docs/GAMETRACKER_UX_SPEC.md`

The spec contains 14 sections and 58 numbered decisions in Appendix B. Every claim you make in the gap report must cite BOTH a spec section AND a file:line reference from the codebase.

## CONSTRAINTS

### What to read

Read these files IN THIS ORDER before producing any output:

**Step 1 — Read the spec (mandatory, read in full):**
```
spec-docs/GAMETRACKER_UX_SPEC.md
```

**Step 2 — Read the current state doc:**
```
spec-docs/CURRENT_STATE.md
```

**Step 3 — Read these GameTracker-specific source files:**

PRIMARY (read in full — these are the core GameTracker files):
```
src/src_figma/app/components/QuickBar.tsx                    (6.6KB — Quick Bar buttons)
src/src_figma/app/components/PlayLogPanel.tsx                (8.8KB — Play log display)
src/src_figma/app/components/EnrichmentPanel.tsx             (18.9KB — Enrichment UI)
src/src_figma/app/components/FenwayBoard.tsx                 (12.5KB — Pitcher/batter context)
src/src_figma/app/components/FullFenwayScoreboard.tsx        (8.8KB — Scoreboard header)
src/src_figma/app/components/GameDiamond.tsx                 (7.0KB — Current field display)
src/src_figma/app/components/RunnerPopover.tsx               (10.6KB — Runner actions)
src/src_figma/app/components/FielderPopover.tsx              (8.4KB — Fielder actions)
src/src_figma/app/components/LineupCard.tsx                  (22.1KB — Lineup management)
src/src_figma/app/components/MojoFitnessEditor.tsx           (6.9KB — Mojo/fitness updates)
src/src_figma/app/components/UndoSystem.tsx                  (9.6KB — Undo mechanism)
src/src_figma/app/components/runnerDefaults.ts               (20.8KB — Runner advancement)
src/src_figma/app/components/RunnerOutcomesDisplay.tsx        (8.3KB — Runner outcome display)
src/src_figma/app/components/LiveRunnerAttributionPanel.tsx   (3.4KB — Runner attribution)
src/src_figma/app/components/HistoricalEventEditor.tsx        (29.4KB — Historical editing)
src/src_figma/app/components/InjuryPrompt.tsx                (8.1KB — Injury handling)
src/src_figma/app/components/MilestoneWatchPanel.tsx          (2.9KB — Milestone display)
src/utils/eventLog.ts                                        (event persistence)
```

LARGE FILES (read EXPORTS AND STRUCTURE ONLY — do NOT attempt to read in full):
```
src/src_figma/app/pages/GameTracker.tsx                      (296KB — page shell)
src/src_figma/hooks/useGameState.ts                          (248KB — game brain)
```

For GameTracker.tsx and useGameState.ts:
- Read the first 200 lines (imports, type definitions, component signature)
- Read the last 100 lines (JSX render, exported interface)
- Search for specific function names only when needed to verify a spec claim
- Do NOT attempt to read these files in full — you will exceed context limits

ALSO CHECK (for specific claims only — do not read in full):
```
src/src_figma/app/pages/PostGameSummary.tsx                  (29.5KB — post-game flow)
src/src_figma/app/utils/fenwayBoardContext.ts                (context data)
src/engines/fwarCalculator.ts                                (fWAR — referenced in lineup display)
src/src_figma/app/engines/detectionIntegration.ts            (detection/derived events)
```

### What NOT to read
```
src/components/GameTracker/       — DEAD CODE. Not routed. Do not reference.
src/components/                   — DEAD CODE (all of it). Only src/src_figma/ is live.
```

### How to evaluate each spec decision

For EVERY decision in the spec (UX-001 through UX-058 in Appendix B), determine ONE of these statuses:

| Status | Meaning | Evidence Required |
|--------|---------|-------------------|
| EXISTS | Current code already implements this decision | Cite exact file:line range showing the implementation |
| PARTIAL | Code partially implements — some aspects present, others missing | Cite what exists (file:line) AND what's missing |
| CONFLICTS | Code implements something that contradicts this decision | Cite the conflicting code (file:line) AND the spec section |
| MISSING | No implementation exists for this decision | Cite the spec section and confirm no relevant code found |
| REMOVE | Current code has something the spec says should NOT exist | Cite the code to remove (file:line) AND the spec section that supersedes it |
| UNVERIFIED | Cannot confirm due to file size limits or ambiguity | State exactly what you couldn't verify and why |

### Rules of evidence

1. **No status without a citation.** Every EXISTS claim must have a file:line reference. Every MISSING claim must name the spec section. Every CONFLICTS claim must have both.

2. **No inferring.** If you cannot find the code, the status is MISSING or UNVERIFIED — never "it probably exists somewhere in the 248KB file."

3. **No summarizing the spec.** Do not restate what the spec says. Reference it by section number (e.g., "§4.1") and decision ID (e.g., "UX-048"). The reader has the spec.

4. **No proposing fixes.** This is a gap report, not an implementation plan. Do not write code. Do not suggest architectures. Do not say "this could be implemented by..."

5. **No opinions on the spec.** Do not evaluate whether spec decisions are good or bad. Report what the code does vs. what the spec says.

6. **No grouping or batching.** Evaluate EVERY decision individually. Do not say "UX-013 through UX-019 are all MISSING" — evaluate each one separately with its own evidence.

7. **No skipping.** If you reach context limits before completing all 58 decisions, STOP and report exactly where you stopped and why. Do not silently skip decisions.

8. **No hallucinating file contents.** If you haven't read a file, you cannot claim it contains or doesn't contain something. Read first, then claim.

9. **Read before claiming absence.** Before marking anything MISSING, verify you've checked: (a) GameTracker.tsx exports/structure, (b) useGameState.ts exports/structure, (c) the relevant component file, (d) eventLog.ts if it's about persistence.

10. **Quote exact function/variable names.** When citing EXISTS, include the function name, variable name, or JSX element name — not just "line 47." Example: "EXISTS — QuickBar.tsx:23-45, `OUTCOME_BUTTONS` array contains K, GO, FO, LO, 1B, BB, 2B, HR."

## EXPECTED OUTPUT

Produce ONE file: `spec-docs/GAMETRACKER_UX_GAP_ANALYSIS.md`

### Output structure:

```markdown
# GameTracker UX Gap Analysis
**Generated:** [date]
**Spec version:** GAMETRACKER_UX_SPEC.md v1.0
**Branch:** main
**Auditor:** Codex 5.3

## Summary
- EXISTS: [count]
- PARTIAL: [count]
- CONFLICTS: [count]
- MISSING: [count]
- REMOVE: [count]
- UNVERIFIED: [count]

## Gap Report

### §1 Physical Context & Design Constraints
(No code evaluation needed — this section describes user behavior, not code.)

### §2 Screen Layout
#### UX-003: 4-column layout
**Status:** [status]
**Evidence:** [exact citations]
**Notes:** [only if PARTIAL, CONFLICTS, or UNVERIFIED — explain what's different]

#### UX-004: Diamond removed
**Status:** [status]
**Evidence:** [exact citations]

[...continue for every UX-NNN decision...]

### §3 Score Bug
[...every decision in this section...]

[...continue through all 14 sections...]

## Files Evaluated
[List every file you actually read, with confirmation you read it]

## Files NOT Evaluated (and why)
[List any files you could not read due to size/context limits]

## Completion Status
[COMPLETE — all 58 decisions evaluated]
or
[INCOMPLETE — stopped at UX-NNN because: (exact reason)]
```

## VERIFICATION

After producing the gap report, run these self-checks before declaring complete:

1. Count the UX-NNN entries in your report. There must be exactly 58 (UX-001 through UX-058). If fewer, you skipped some — go back and fill them in.

2. Every EXISTS entry must have at least one file:line citation. Grep your own output for "EXISTS" and verify each has a citation. If any EXISTS lacks a citation, it's a hallucination — change it to UNVERIFIED and explain why.

3. Every CONFLICTS entry must have BOTH a file:line citation AND a spec section reference. Verify each one.

4. No entry should say "likely" or "probably" or "should be" or "appears to" — these are weasel words. Either you found it or you didn't.

5. Verify your summary counts match the actual entries in the report. Count them manually.

## FORMAT

Output: Single markdown file at `spec-docs/GAMETRACKER_UX_GAP_ANALYSIS.md`
No other files created or modified.

## FAILURE PROTOCOL

- If you cannot open a file → mark all decisions that depend on that file as UNVERIFIED with the reason "file not readable"
- If you hit context limits → STOP, report where you stopped, save what you have, and state "INCOMPLETE — stopped at UX-NNN"
- If a spec decision is ambiguous → mark as UNVERIFIED with the exact ambiguity quoted
- If you find code that doesn't map to any spec decision → add it to a "CODE WITHOUT SPEC HOME" section at the end (this helps catch orphaned code)
- If you are unsure about ANYTHING → mark it UNVERIFIED. Never guess. An honest UNVERIFIED is infinitely more valuable than a confident hallucination.

## ANTI-PATTERNS (do NOT do any of these)

1. Do NOT read the spec, then write the report from memory. Re-read the spec section you're evaluating WHILE you're writing that section of the report.
2. Do NOT claim you read a file you didn't read.
3. Do NOT mark something EXISTS because the component file exists — verify the SPECIFIC BEHAVIOR described in the spec decision exists in the code.
4. Do NOT confuse "the component renders" with "the component implements this specific UX decision."
5. Do NOT batch decisions. Every UX-NNN gets its own entry.
6. Do NOT write "see above" or "same as UX-NNN." Each entry stands alone.
7. Do NOT add implementation suggestions, architecture recommendations, or code examples.
8. Do NOT modify any source files. This is READ-ONLY.
9. Do NOT declare completion if you haven't evaluated all 58 decisions.
10. Do NOT use the word "straightforward" anywhere in the report.

Use high reasoning effort. Think step-by-step. Read before writing. Cite before claiming.
