---
name: phase-b-builder
description: Build Phase B features for KBL Tracker from pre-extracted item files. Each sub-tier has its own item file with all data pre-extracted — no need to parse TRIAGE_DECISIONS.md. One CLI session = one sub-tier. Use when asked to "build phase B", "build features", "execute phase B", "start tier 1.1", "build from triage", or any request to implement features from the audit triage. NOT for fixing audit findings (use batch-fix-protocol) or testing (use gametracker-logic-tester).
---

# Phase B Feature Builder

Build ~131 features across 11 sub-tiers. Each sub-tier has a pre-extracted item file — one CLI session per sub-tier.

## Pre-Flight (ALWAYS START HERE)

```bash
# 1. Verify build passes
npx tsc --noEmit

# 2. Capture test baseline (may take 3-5 minutes — use longer timeout)
npm test -- --reporter=verbose 2>&1 | tail -5

# 3. Record baseline in execution report
```

Read these before building:
- `references/AUTHORITY.md` — authority hierarchy, pre-resolved decisions, skip/duplicate lists
- The **sub-tier item file** for whichever sub-tier you're building (see §Sub-Tier Item Files below)
- The spec files listed in the item file's header

**Do NOT read the full TRIAGE_DECISIONS.md** — it's 67K tokens. All item data has been pre-extracted into per-sub-tier files.

---

## Sub-Tier Item Files (One Session = One File)

Each file contains the items for that sub-tier with all fields pre-extracted. Read the file for your current sub-tier:

| Sub-Tier | File | Items | Session |
|----------|------|-------|---------|
| **Tier 1.1** Grade, Salary & Adaptive | `references/tier-1.1-items.md` | 26 | 1 |
| **Tier 1.2** Franchise Infrastructure | `references/tier-1.2-items.md` | 9 | 2 |
| **Tier 1.3** Stats, Milestones & Adaptive | `references/tier-1.3-items.md` | 9 | 3 |
| **Tier 2.1** GameTracker & Field | `references/tier-2.1-items.md` | 16 | 4 |
| **Tier 2.2** Clutch, Mojo & Leverage | `references/tier-2.2-items.md` | 0 | — |
| **Tier 2.3** Fame, Milestones & Fan Systems | `references/tier-2.3-items.md` | 9 | 5 |
| **Tier 3.1** Draft & Prospect Generation | `references/tier-3.1-items.md` | 4 | 6 |
| **Tier 3.2** Offseason & Franchise Flows | `references/tier-3.2-items.md` | 21 | 7 |
| **Tier 3.3** League Builder & Setup | `references/tier-3.3-items.md` | 3 | 8 |
| **Tier 3.4** Playoffs & Season | `references/tier-3.4-items.md` | 25 | 9 |
| **Tier 3.5** Narrative & Special Events | `references/tier-3.5-items.md` | 7 | 10 |
| **Tier 4** Polish & Integration | `references/tier-4-items.md` | 2 | 11 |
| | | **131** | |

**Tier order is mandatory:** 1.1 → 1.2 → 1.3 → 2.1 → 2.3 → 3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 4
(Skip 2.2 — it's empty.)

---

## Build Protocol (Per Item)

For each item in the sub-tier file:

### 1. Read Item Data
The sub-tier file already contains: Spec Says, Code Says, Recommended Fix, Spec file, Code Location.

### 2. Check Authority
Consult `references/AUTHORITY.md`:
- Is this item in the SKIP list? → Skip it
- Is this item a DUPLICATE? → Skip it (primary covers it)
- Is there a pre-resolved decision? → Follow it exactly

### 3. Read the Spec
Open the spec file referenced in the "Spec:" field. Read the relevant section. Understand the requirement.

### 4. Read the Current Code
Find the implementing file(s). Understand current state. Note what exists vs what's missing.

### 5. Implement
- Follow the "Recommended Fix:" field for approach
- If "Recommended Fix:" has user-edited notes, those override the generic recommendation
- Write TypeScript that compiles. Write tests for new functionality.

### 6. Verify
```bash
npx tsc --noEmit          # Must be 0 errors
npm test -- [area-test]    # Area tests must pass
```

### 7. Checkpoint (Every 5 Items)
```bash
npm test -- --reporter=verbose 2>&1 | tail -20
```
Append results to `spec-docs/PHASE_B_EXECUTION_REPORT.md`.

---

## Safety Rules

**STOP and ask the user if:**
1. An item would delete existing working functionality
2. Two items have conflicting requirements
3. Implementation causes >5 new test failures
4. You're unsure about correct behavior
5. Context is running low — save progress first

**NEVER:**
- Skip an APPROVED item (every non-SKIP item must be addressed)
- Proceed past a failing tsc check
- Let test count drop below baseline
- Assume what a spec says without reading it
- Build from training data instead of the actual spec files

**ALWAYS:**
- After each sub-tier: full test suite + report results
- After Tier 2.1: tell user to invoke gametracker-logic-tester
- If blocked by a dependency: note it, move on, return after dependency resolves
- Write new tests for new functionality

---

## Execution Report

Create/append to: `spec-docs/PHASE_B_EXECUTION_REPORT.md`

```markdown
## Phase B: Feature Builds
Started: [timestamp]
Baseline: [pass] / [fail] / [total]

### Tier [N.X]: [Name]
| Item ID | What Was Built | Files Modified | Tests Added | Status |
|---------|---------------|----------------|-------------|--------|

**Checkpoint:** [pass] / [fail] / [total] (delta: +X pass, +Y fail)

### Blocked Items
| Item ID | Blocked By | Notes |
```

---

## Session Management

Each sub-tier = one CLI session. When a session ends:

1. Update PHASE_B_EXECUTION_REPORT.md with all completed items
2. Record test baseline
3. Next session: read report, pick up with the NEXT sub-tier file

---

## Post-Phase-B

After ALL sub-tiers complete, run verification pipeline in order. See `references/VERIFICATION.md`:
1. gametracker-logic-tester → verify baseball logic
2. dummy-data-scrubber → verify no dummy data remains
3. spec-ui-alignment → verify features match specs
4. ui-flow-crawler → verify live app works
5. batch-fix-protocol → fix any issues found in 1-4
