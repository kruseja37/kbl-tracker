# KBL Tracker — Complete Pipeline V2

> **Purpose**: Master roadmap for using all 6 skills (5 core + spec-ui-alignment for spot-checks) to bring the app to spec-perfect alignment
> **Created**: February 5, 2026
> **Last Updated**: February 6, 2026 (V2: added exhaustive audit as foundation)
> **Skills**: exhaustive-spec-auditor → batch-fix-protocol → gametracker-logic-tester → dummy-data-scrubber → ui-flow-crawler

---

## Why V2?

V1 started with spec-ui-alignment scanning a subset of specs, then fixing what it found. That worked — it found 47 items, fixed 28, left 19 blocked.

V2 starts with the **exhaustive-spec-auditor** reading ALL 129 specs, catching contradictions, then consolidating into a clean structure. This means:

1. **No spec gets skipped.** V1's spec-ui-alignment checked ~60 specs. V2 checks all 129.
2. **Contradictions get resolved first.** V1 assumed specs were correct. V2 verifies they agree.
3. **Clean specs before clean code.** Fix the source of truth, then fix the code.
4. **One comprehensive report.** The audit produces EXHAUSTIVE_AUDIT_FINDINGS.md which batch-fix-protocol consumes directly — no need to run spec-ui-alignment separately.

---

## Pipeline Architecture

```
 FOUNDATION                  FIX                    VERIFY                 VALIDATE
┌──────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌────────────────┐
│  EXHAUSTIVE  │    │                  │    │  gametracker-   │    │                │
│  SPEC AUDIT  │───▶│  batch-fix-      │───▶│  logic-tester   │    │  ui-flow-      │
│  Phase 1-1.5 │    │  protocol        │    │                 │───▶│  crawler       │
│              │    │                  │    │  dummy-data-    │    │                │
│  Phase 2:    │    │  (Fixes ALL      │    │  scrubber       │    │  (Final live   │
│  Consolidate │───▶│   mismatches     │    │                 │    │   verification)│
│  specs       │    │   and gaps)      │    │  (Parallel      │    │                │
└──────────────┘    └──────────────────┘    │   verification) │    └────────────────┘
                                            └─────────────────┘
```

**Execution: Foundation → Fix → Verify → Validate → Mop Up (if needed)**

---

## Phase 0: Foundation — Exhaustive Spec Audit

**Skill**: `exhaustive-spec-auditor`
**Duration**: Multi-session (expect 10-20 CLI sessions for 27 batches)
**Requires**: Nothing — this is the starting point

### What it does

1. **Phase 1**: Reads EVERY spec (129 docs, 27 batches of ~5). For each spec:
   - Reads the spec doc (extracts every constant, formula, rule, UI requirement)
   - Reads the implementing code (compares line by line)
   - Classifies: MATCH, MISMATCH, GAP, UNDOCUMENTED
   - Cross-references against other specs for contradictions
   - **STOPS and asks you** when contradictions are found

2. **Phase 1.5**: Aggregates all findings into `EXHAUSTIVE_AUDIT_FINDINGS.md`
   - Severity-sorted: CRITICAL → MAJOR → MINOR
   - Deduplicates against the existing SPEC_UI_ALIGNMENT_REPORT (47 items from V1)
   - This report feeds DIRECTLY into batch-fix-protocol

3. **Phase 2**: Consolidates specs into clean folder structure
   - ~55 scattered specs → ~15 consolidated files in category folders
   - SPEC_INDEX.md becomes the new single routing table
   - Originals archived, contradiction decisions applied
   - All 5 skill reference files updated to point to new paths

### Output files
- `spec-docs/EXHAUSTIVE_AUDIT_PROGRESS.md` — batch-by-batch tracking
- `spec-docs/SPEC_CONTRADICTIONS.md` — every contradiction found + resolution
- `spec-docs/EXHAUSTIVE_AUDIT_FINDINGS.md` — **PRIMARY DELIVERABLE** (batch-fix-compatible)
- `spec-docs/SPEC_INDEX.md` — new master routing table (replaces SPEC_CODE_MAP.md)
- Consolidated spec folders: `gametracker/`, `engines/`, `franchise/`, `ui/`

### User involvement
- You'll be asked to resolve contradictions during Phase 1 (expect 5-20 decisions)
- You approve Phase 2 consolidation before it starts
- Estimated total user time: 2-4 hours across all sessions

---

## Phase 1: Fix — Batch Fix Protocol

**Skill**: `batch-fix-protocol`
**Duration**: 1-4 hours (depends on finding count from Phase 0)
**Requires**: `EXHAUSTIVE_AUDIT_FINDINGS.md` from Phase 0

### What it does

Applies every MISMATCH and GAP fix from the exhaustive audit in controlled batches:
- **Tier 1 (Critical)**: One fix at a time — wrong formulas, logic errors, crash risks
- **Tier 2 (Major)**: Batches of 3 — missing connections, wrong constants
- **Tier 3 (Minor)**: Batches of 5 — cosmetic, labels, documentation

Each fix gets: code edit → type check → test run → regression check.

### Why this replaces spec-ui-alignment

The exhaustive audit already did the same 3-way verification (spec → backend → UI) that spec-ui-alignment does — but across ALL 129 specs instead of a subset. Running spec-ui-alignment again would be redundant.

**Exception**: If you want a quick spot-check AFTER fixes, spec-ui-alignment is still available as a focused re-verification tool.

### Output
- `spec-docs/FIX_EXECUTION_REPORT_[DATE].md`
- Updated `CURRENT_STATE.md`, `SESSION_LOG.md`, `DECISIONS_LOG.md`

### Success criteria
- All CRITICAL and MAJOR fixes applied
- Test count ≥ baseline (5,077 pass / 77 fail)
- Build passes with 0 type errors

---

## Phase 2: Verify — Logic + Data

**Skills**: `gametracker-logic-tester` + `dummy-data-scrubber`
**Duration**: 1-2 hours
**Requires**: Clean codebase from Phase 1, dev server running

These two skills run as verification passes on the fixed code:

### gametracker-logic-tester
- Tests ALL baseball logic against the CONSOLIDATED rules (not fragmented old specs)
- 264+ test cases covering every base/out state × outcome combination
- Catches any regressions from Phase 1 fixes
- Output: `spec-docs/GAMETRACKER_TEST_RESULTS_[DATE].md`

### dummy-data-scrubber
- Scans for hardcoded dummy data that Phase 1 didn't address
- Classifies: REPLACE, KEEP AS FALLBACK, DOCUMENT AS TODO
- Output: `spec-docs/DUMMY_DATA_SCRUB_REPORT.md`

### Success criteria
- 0 baseball logic regressions
- All dummy data classified and actioned (or documented as TODO)

---

## Phase 3: Validate — Live App Crawl

**Skill**: `ui-flow-crawler`
**Duration**: 45-90 minutes
**Requires**: Dev server running, IndexedDB seeded

### What it does

End-to-end live verification that everything works:
- Navigate all 14 routes (screenshot each)
- Click through all 27 FranchiseHome tabs
- Execute 5 critical user flows
- Cross-reference against consolidated Figma specs

### Output
- `spec-docs/UI_FLOW_CRAWL_REPORT.md` — screen-by-screen results
- `spec-docs/FIGMA_COMPLETION_MAP.md` — spec-by-spec completion %

### Success criteria
- All 14 routes render
- All 27 tabs render content
- 0 console errors
- FIGMA_COMPLETION_MAP shows measurable improvement

---

## Phase 4: Mop Up (If Needed)

If Phases 2-3 found new issues:

1. Run `batch-fix-protocol` on the new findings
2. Re-run `ui-flow-crawler` as final verification
3. Repeat until exit criteria met

### Exit Criteria (Definition of "Done")

| Criteria | Target |
|----------|--------|
| CRITICAL findings | 0 remaining |
| MAJOR findings | 0 remaining |
| Routes rendering | 14/14 |
| Tabs rendering | 27/27 |
| Build status | PASS (0 type errors) |
| Test count | ≥ measured baseline (run `npm test` at Phase 3 start) |
| Test regressions | 0 new vs measured baseline |
| Console errors | 0 on any page |
| Spec contradictions | All resolved |
| Spec docs | Consolidated into clean structure |

---

## Report Consumption Map

```
EXHAUSTIVE_AUDIT_FINDINGS.md ← PRIMARY (replaces SPEC_UI_ALIGNMENT_REPORT)
  └──▶ batch-fix-protocol
       └──▶ FIX_EXECUTION_REPORT_[DATE].md
            ├──▶ gametracker-logic-tester → GAMETRACKER_TEST_RESULTS_[DATE].md
            │    └──▶ (if regressions) → batch-fix-protocol
            └──▶ dummy-data-scrubber → DUMMY_DATA_SCRUB_REPORT.md
                 └──▶ ui-flow-crawler → UI_FLOW_CRAWL_REPORT.md + FIGMA_COMPLETION_MAP.md
                      └──▶ (if gaps) → batch-fix-protocol → ui-flow-crawler (re-verify)
```

---

## Pre-Flight Checklist

### Before Phase 0 (Exhaustive Audit)
- [ ] `tsc -b` passes (0 type errors)
- [ ] `npm test` baseline captured: 5,077 pass / 77 fail / 5,154 total / 108 files
- [ ] Git working tree clean (commit current state)

### Before Phase 2 (Verify) or Phase 3 (Validate)
- [ ] Dev server running: `npm run dev`
- [ ] IndexedDB seeded (League Builder → "Seed SMB4 Database")
- [ ] Playwright MCP active (check with `/mcp` in Claude CLI)

---

## Baseline Reference

| Metric | V1 Baseline (Feb 5) | Post-V1 Pipeline (Feb 6) |
|--------|---------------------|--------------------------|
| TypeScript errors | 0 | 0 |
| Test pass | 5,025 | 5,077 |
| Test fail | 77 | 77 |
| Test total | 5,102 | 5,154 |
| Test files | 106 | 108 |
| Bugs found/fixed | — | 4 (3 CRITICAL + 1 MAJOR) |
| Spec-UI findings | — | 47 (28 fixed, 19 blocked) |
| Dummy data items | — | 47 classified |
| Routes verified | — | 14/14 |
| Tabs verified | — | 27/27 |

---

## Estimated Timeline

| Phase | Sessions | Duration per Session | User Time |
|-------|----------|---------------------|-----------|
| Phase 0: Batches 1-10 (core specs) | 5-10 | 30-60 min | 10-30 min (contradiction decisions) |
| Phase 0: Batches 11-27 (stories/reports/meta) | 5-10 | 20-40 min | 5-15 min |
| Phase 0: Consolidation | 2-3 | 30-45 min | 15 min (approve structure) |
| Phase 1: Fix | 1-3 | 60-120 min | 15 min (review report) |
| Phase 2: Verify | 1-2 | 30-60 min | 10 min |
| Phase 3: Validate | 1 | 45-90 min | 10 min |
| Phase 4: Mop Up | 0-2 | 30-60 min | 10 min |
| **Total** | **15-31** | **~15-30 hours** | **~2-4 hours** |

---

## V1 Pipeline (Preserved for Reference)

The original 5-step pipeline is still available for quick targeted runs:
1. spec-ui-alignment (focused subset audit)
2. batch-fix-protocol (fix findings)
3. gametracker-logic-tester (verify baseball logic)
4. dummy-data-scrubber (scan dummy data)
5. ui-flow-crawler (live crawl)

Use V1 for quick spot-checks. Use V2 (this document) for the full comprehensive pass.
