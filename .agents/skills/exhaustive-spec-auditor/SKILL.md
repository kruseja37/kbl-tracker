---
name: exhaustive-spec-auditor
description: >
  Exhaustive audit of ALL KBL Tracker spec documents (129 docs) against the actual codebase,
  with contradiction detection between specs, consolidation into a clean folder structure,
  and aggregated findings report that feeds directly into batch-fix-protocol.
  Use when asked to "audit all specs", "find spec contradictions", "consolidate specs",
  "clean up spec docs", "verify all specs match code", "exhaustive spec audit",
  or any request to ensure every specification document is verified and conflicts resolved.
  This skill processes specs in batches of 5, tracks progress persistently, and NEVER
  skips a spec. It STOPS and asks the user when contradictions are found.
---

# Exhaustive Spec Auditor

Read EVERY spec doc in `spec-docs/`, verify against implementing code, detect contradictions
between specs, STOP for user decisions on conflicts, aggregate all findings into a
batch-fix-compatible report, then consolidate specs into a clean folder structure.

**129 specs across 27 batches. Multiple CLI sessions expected. Progress is persistent.**

## Before Starting

1. Read `spec-docs/EXHAUSTIVE_AUDIT_PROGRESS.md`
   - If missing, create from `references/PROGRESS_TEMPLATE.md`
   - Check current phase:
     - **If any batch is NOT STARTED** → your job is Phase 1 (batch audit). Continue to step 2.
     - **If ALL 27 batches are DONE but progress file says "Phase 1.5: NOT STARTED"** → your job is Phase 1.5 (aggregate findings). Skip to Phase 1.5 section.
     - **If Phase 1.5 says DONE and user approved consolidation** → your job is Phase 2 (consolidation). Skip to Phase 2 section.
     - **If Phase 2 says DONE** → your job is Phase 3 (pipeline execution). Skip to Phase 3 section.
   - Find the first batch marked `NOT STARTED` — that's your target batch
2. Read ONLY the target batch section from `references/SPEC_MANIFEST.md`
   - **Do NOT read the entire manifest.** Search for `## Batch N:` and read only that section.
   - Extract: spec doc names, implementing file paths, audit focus
3. If `spec-docs/EXHAUSTIVE_AUDIT_FINDINGS.md` doesn't exist, create it from `references/AUDIT_FINDINGS_TEMPLATE.md`
4. Read `spec-docs/DECISIONS_LOG.md` — skim for contradiction resolutions relevant to your batch
5. If `spec-docs/SPEC_UI_ALIGNMENT_REPORT.md` exists, skim it — mark any findings in your batch's area as KNOWN

## Phase 1: Batch Audit

Process ONE batch per invocation. Process specs SEQUENTIALLY within a batch (one at a time, not all at once).

### Context Budget Rules

**Critical**: Claude CLI has limited context. Follow these rules to avoid running out:

- **Batches 1-10 (SPEC + FIGMA_SPEC)**: Process ONE SPEC at a time. Read spec → read implementing code → classify → write findings. Only then move to next spec.
- **Do NOT read test files** during initial audit. Tests verify correctness but the audit compares SPEC vs CODE. If a specific test is needed to resolve ambiguity, read only that one test.
- **Batches 11-27 (STORY + REPORT + META)**: These are lighter. Can process 2-3 specs at a time since they share implementing files.
- **If running low on context**: STOP at current spec (not batch). Save findings for completed specs. Report partial batch progress.

### Per Spec: 4 Steps

**Step 1 — Read the spec.** Extract every constant, formula, rule, UI requirement, type definition, and acceptance criterion. Be exhaustive — if the spec says a formula uses 0.95 decay, record "0.95". If it says a button label is "Start Draft", record "Start Draft".

**Step 2 — Read implementing code.** Use the manifest's file paths. Before reading, verify the file exists with `ls`. If it doesn't exist, note it as GAP and move on.

For each spec claim, classify:
- **MATCH**: Code implements correctly → log as verified (count only, no detail needed)
- **MISMATCH**: Code differs → log: severity, file:line, spec says X, code says Y, recommended fix
- **GAP**: Spec defines something code doesn't implement → log: severity, what's missing, where it should go
- **UNDOCUMENTED**: Code does something spec doesn't mention → log: file:line, what it does (not a fix — documentation TODO)

**Severity classification for MISMATCH and GAP:**
- **CRITICAL**: Wrong formula, wrong logic, data corruption risk, crash potential
- **MAJOR**: Missing connection (backend calculates but UI doesn't show, or vice versa), wrong constant that affects behavior
- **MINOR**: Cosmetic (label text, color, spacing), documentation-only issues

**Step 3 — Cross-reference other specs.** Check the current spec's claims against what you've seen in previously audited specs (from EXHAUSTIVE_AUDIT_PROGRESS.md findings column). Look for:
- Hard contradiction (spec A says X, spec B says NOT X)
- Soft contradiction (spec A implies incompatible things with spec B)
- Temporal conflict (older spec says X, newer spec says Y without explicitly superseding)
- Duplicate definition (same thing defined differently in two places)

**Step 4 — Write findings.** After each spec (not after the whole batch):
- Update that spec's row in `spec-docs/EXHAUSTIVE_AUDIT_PROGRESS.md` with status + finding summary
- Append any MISMATCH/GAP to `spec-docs/EXHAUSTIVE_AUDIT_FINDINGS.md`

### Audit Type by Batch Category

**Batches 1-10 (SPEC + FIGMA_SPEC)**: Full code comparison.
- Read spec, read implementing code, compare every claim against code.
- This is the core audit. Most findings will come from here.

**Batches 11-13 (STORY)**: Acceptance criteria verification.
- Read story's acceptance criteria. Check if each criterion is met in the implementing code.
- Faster than full code comparison — just verify each AC as PASS/FAIL.

**Batches 14 (REFERENCE)**: Data accuracy check.
- Read reference doc. Verify data values match what's in the codebase.
- Flag stale data that no longer matches current code.

**Batches 15-21 (REPORT)**: Currency check — NOT code comparison.
- Read report. Check if the issues/findings described have been addressed in current code.
- For BUG_RESOLUTION reports: verify each listed bug fix is still in the code (not reverted).
- For AUDIT reports: check if findings are still valid or outdated.
- Classify as: CURRENT (still valid), OUTDATED (no longer accurate), PARTIALLY_CURRENT.

**Batches 22-27 (META + PLANNING)**: Process doc review.
- Read doc. Check if it reflects current project state.
- Flag any instructions/plans that contradict actual implementation.
- Lighter touch — these inform consolidation more than code fixes.

### STOP Rules (NON-NEGOTIABLE)

**On contradiction:** STOP. Mark the current spec as `CONTRADICTION_PENDING` in progress tracker. Present both sides with exact quotes + file:line. Ask user which governs. Record decision in `spec-docs/DECISIONS_LOG.md`. Then mark spec as `DONE` and continue. Do NOT re-read or re-append findings for this spec — the contradiction resolution IS the finding.

**On context running low:** STOP at current spec boundary. Save progress for ALL completed specs. Do NOT rush remaining specs. Report: "Completed N of 5 specs in Batch X. Remaining: [list]."

**On ambiguity:** STOP. Do NOT interpret. Ask user what they intended.

**On file not found:** Log as GAP ("Implementing file not found: [path]"). Do NOT stop — continue to next claim.

### After Each Batch (all specs complete)

1. Verify all specs in batch are marked DONE in progress tracker
2. Append contradictions to `spec-docs/SPEC_CONTRADICTIONS.md` (create from `references/CONTRADICTIONS_TEMPLATE.md` if missing)
3. Verify findings were appended to `spec-docs/EXHAUSTIVE_AUDIT_FINDINGS.md`
4. Report: "Batch N complete. X matches, Y mismatches, Z gaps, W contradictions."

## Phase Transition Checklist: Phase 1 → Phase 1.5

Before starting Phase 1.5, verify ALL of these:
- [ ] All 27 batches marked DONE in progress file's Batch Progress table
- [ ] Every spec in Per-Spec Detail has status DONE (not NOT_STARTED or CONTRADICTION_PENDING)
- [ ] `spec-docs/EXHAUSTIVE_AUDIT_FINDINGS.md` exists with findings from Phase 1
- [ ] All contradictions resolved (no CONTRADICTION_PENDING specs remain)
- [ ] Update Phase Status table: Phase 1 → DONE, Phase 1.5 → IN PROGRESS

## Phase 1.5: Aggregate Findings (After ALL 27 Batches of Phase 1)

Before moving to consolidation, produce the actionable output:

1. Read `spec-docs/EXHAUSTIVE_AUDIT_FINDINGS.md` (accumulated during Phase 1)
2. Deduplicate against `spec-docs/SPEC_UI_ALIGNMENT_REPORT.md` — mark overlapping items as `KNOWN`
3. Verify severity assignments are consistent across all batches
4. Produce final summary counts:
   - Total specs audited: N
   - MATCH (verified): N
   - MISMATCH: N (C critical, M major, I minor)
   - GAP: N (C critical, M major, I minor)
   - UNDOCUMENTED: N
   - Contradictions resolved: N
   - Ready for batch-fix-protocol: YES/NO

**The EXHAUSTIVE_AUDIT_FINDINGS.md is the PRIMARY DELIVERABLE.** It feeds directly into batch-fix-protocol.

Update Phase Status table: Phase 1.5 → DONE.

## Phase Transition Checklist: Phase 1.5 → Phase 2

- [ ] Phase 1.5 status is DONE in progress file
- [ ] EXHAUSTIVE_AUDIT_FINDINGS.md has final summary counts
- [ ] Severity assignments are consistent (no CRITICAL item that should be MINOR, etc.)
- [ ] **Ask user**: "Phase 1 audit is complete. Ready to consolidate specs into clean folder structure? This will reorganize spec-docs/."
- [ ] User explicitly approves consolidation
- [ ] Update Phase Status table: Phase 2 → IN PROGRESS

## Phase 2: Consolidation (After Phase 1.5 + User Approval)

Merge audited specs into this target structure:

```
spec-docs/
├── SPEC_INDEX.md              # Master index — replaces SPEC_CODE_MAP.md
├── gametracker/
│   ├── RULES.md               # ← MASTER_BASEBALL + RUNNER_ADVANCEMENT + INHERITED_RUNNERS
│   ├── STATS.md               # ← PITCHER_STATS + PITCH_COUNT + STAT_TRACKING + CLUTCH
│   └── UI.md                  # ← DRAGDROP + FIELD_ZONE + SUBSTITUTION
├── engines/
│   ├── WAR.md                 # ← bWAR + pWAR + fWAR + rWAR + mWAR (all five)
│   ├── PLAYER_SYSTEMS.md      # ← MOJO + FITNESS + FAME + SALARY + GRADE + DESIGNATIONS
│   └── GAME_SYSTEMS.md        # ← LEVERAGE + CLUTCH + ADAPTIVE + AUTO_CORRECTION + DETECTION
├── franchise/
│   ├── MODE.md                # ← FRANCHISE_MODE + OFFSEASON_SYSTEM
│   └── OFFSEASON_FLOWS.md     # ← AWARDS + DRAFT + FA + RETIREMENT + CONTRACTION + RATINGS
├── ui/
│   ├── LEAGUE_BUILDER.md      # ← both LEAGUE_BUILDER specs
│   ├── SEASON_SETUP.md        # ← both SEASON_SETUP specs
│   ├── PLAYOFFS.md            # ← PLAYOFF_SYSTEM + PLAYOFFS_FIGMA
│   └── SCHEDULE.md            # ← SCHEDULE_SYSTEM_FIGMA
├── meta/                      # CURRENT_STATE, SESSION_LOG, DECISIONS_LOG, PIPELINE
├── reports/                   # All audit/test/bug reports (moved here)
├── stories/                   # User stories (kept, cross-referenced)
└── archive/                   # Original specs that were consolidated
```

### Consolidation Rules
- Process ONE category folder per session (gametracker/, engines/, franchise/, ui/, then meta/reports/stories)
- Each consolidated file: **Source Traceability** section listing which originals were merged
- User contradiction decisions from Phase 1 are authoritative
- Superseded originals → `archive/`
- SPEC_INDEX.md replaces both the old README.md AND SPEC_CODE_MAP.md
- SPEC_INDEX.md format per entry: consolidated path, topic, implementing files, last verified date, source specs
- **CRITICAL**: After consolidation, update all 5 skill reference files that use old spec names

### Post-Consolidation Updates Required
- `.claude/skills/spec-ui-alignment/references/SPEC_CODE_MAP.md` → update paths
- `.claude/skills/ui-flow-crawler/references/APP_SCREEN_MAP.md` → verify still accurate
- `.claude/skills/dummy-data-scrubber/references/DATA_SOURCES.md` → verify still accurate
- `.claude/skills/gametracker-logic-tester/references/BASEBALL_LOGIC.md` → verify still accurate
- `CLAUDE.md` → update spec-docs section

## Phase Transition Checklist: Phase 2 → Phase 3

- [ ] `spec-docs/SPEC_INDEX.md` exists and is the master routing table
- [ ] All category folders created (gametracker/, engines/, franchise/, ui/, meta/, reports/, stories/, archive/)
- [ ] All 5 downstream skill reference files updated (list above)
- [ ] CLAUDE.md updated
- [ ] Original specs moved to archive/
- [ ] Update Phase Status table: Phase 2 → DONE, Phase 3 → IN PROGRESS
- [ ] Run `npm test` and record ACTUAL test baseline before proceeding with fixes

## Phase 3: Pipeline Execution (After Consolidation)

With clean specs and a comprehensive findings report, execute the 5-skill pipeline:

**Step 1 — Fix:** Run `batch-fix-protocol` on `spec-docs/EXHAUSTIVE_AUDIT_FINDINGS.md`
- This fixes all MISMATCH and GAP items found during the audit
- This REPLACES running spec-ui-alignment separately (the audit already did that work)

**Step 2 — Verify Logic:** Run `gametracker-logic-tester`
- Verifies baseball logic against the CONSOLIDATED rules (not old fragmented specs)
- Catches any regressions from Step 1 fixes

**Step 3 — Scrub Data:** Run `dummy-data-scrubber`
- Catches remaining hardcoded values that Step 1 didn't address
- Now runs against clean, fixed code

**Step 4 — Validate Live:** Run `ui-flow-crawler`
- Final end-to-end verification that everything works
- Cross-references against consolidated Figma specs

**Step 5 — Mop Up:** If Steps 2-4 found new issues → `batch-fix-protocol` again
- Then re-run `ui-flow-crawler` as final verification

**Target exit criteria:**
- 0 CRITICAL or MAJOR findings remaining
- All 14 routes render, all 27 tabs render content
- Test count ≥ measured baseline (run `npm test` at start of Phase 3 and record actual pass count — do NOT use hardcoded numbers)
- 0 new test regressions (tests that passed before Phase 1 fixes must still pass)
- Build passes with 0 type errors
- FIGMA_COMPLETION_MAP shows measurable progress toward 100%

## Anti-Skip Rules

1. **Every spec in the manifest MUST be audited.** No "this looks like X, skip."
2. **Every batch MUST update progress.** Unwritten progress = didn't happen.
3. **Every contradiction MUST go to the user.** No silent resolutions.
4. **NEVER mark a spec audited without reading BOTH the spec AND its code.**
5. **Process specs in manifest order.** No cherry-picking "interesting" ones.

## Batch Guide

| Batches | Category | Audit Type | Context Load |
|---------|----------|------------|--------------|
| 1-10 | SPEC + FIGMA_SPEC | Full code comparison (spec vs implementing code) | HEAVY — 1 spec at a time |
| 11-13 | STORY | Acceptance criteria pass/fail | MEDIUM — 2-3 specs at a time |
| 14 | REFERENCE | Data accuracy check | MEDIUM |
| 15-21 | REPORT | Currency check (is report still valid?) | LIGHT — 3-5 specs at a time |
| 22-25 | META + FIGMA planning | Process doc review | LIGHT |
| 26-27 | Missing specs & planning | Catch-up batch | VARIES |

Full batch details: `references/SPEC_MANIFEST.md`

## Resume Protocol

If starting a new session mid-audit:
1. Read `spec-docs/EXHAUSTIVE_AUDIT_PROGRESS.md` — find first `NOT STARTED` batch
2. Read ONLY that batch's section from `references/SPEC_MANIFEST.md`
3. Skim `spec-docs/DECISIONS_LOG.md` for relevant prior decisions
4. If mid-batch (some specs DONE, some NOT STARTED), resume from first NOT STARTED spec
5. Do NOT re-read completed batches' findings — they're already written to EXHAUSTIVE_AUDIT_FINDINGS.md
