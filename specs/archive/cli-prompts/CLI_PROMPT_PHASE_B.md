# KBL Tracker Phase B: Feature Builds CLI Execution Prompt

## Summary
This prompt executes Phase B feature builds for the KBL Tracker application (TypeScript/React baseball game tracker). Phase B consists of 132 feature build items derived from the audit triage spreadsheet, executed in dependency-ordered tiers.

**Test Baseline:** 5,078 pass / 77 fail / 5,155 total  
**Authority Source:** /sessions/keen-happy-allen/mnt/Projects/kbl-tracker/spec-docs/AUDIT_TRIAGE.xlsx

---

## Authority Hierarchy (CRITICAL)

This hierarchy determines what to build and how to build it:

1. **Column K (Your Decision)** in AUDIT_TRIAGE.xlsx overrides all other sources
2. **For FIX CODE items:**
   - Column F (Spec Says) = source of truth for WHAT the code should do
   - Column H (Recommended Fix) = authority for HOW to fix it
   - Column H user notes override generic recommendations
3. **For BUILD items:**
   - Column F (Spec Says) = defines WHAT to build
   - Column H (Recommended Fix) = defines the implementation approach
4. **User-edited cells** in the spreadsheet override original spec docs on disk
5. **If spec doc on disk conflicts** with spreadsheet cell value → update spec doc to match spreadsheet cell

---

## Phase B Items: Triage Reference

Total Items: 132 (129 BUILD + 3 NEW)

### Items Requiring Special Attention

**GAP-B3-011** (User Note in Column H):
- Full 40+ field FieldingPlay interface
- KEEP: code-only fields (zoneId, foulOut, savedRun)
- REMOVE: shift fields (shiftActive, shiftType)
- Align with stat-tracking needs

**GAP-B10-006** (User Note):
- HOF score weighting by games/season variable (NOT hardcoded 162)
- Source: season setup configuration

**GAP-B3-013** (User Note):
- Align ALL fielding tracking data with enhanced FieldCanvas logic
- DO NOT use legacy field zones from old field UI

**GAP-B11-012** (User Note):
- Supplemental signing screen per Figma spec (lines 662-722)
- Coexists with dice-based FA flow (not a replacement)

**GAP-B2-001 / GAP-B3-014** (SKIPPED):
- IFR remains user input only
- Do NOT auto-detect (low pop-ups don't always trigger IFR)

### Duplicate Items to Skip

These items are duplicates—skip them (primary item covers the work):

| Duplicate | Primary | Reason |
|-----------|---------|--------|
| GAP-B11-010 | CRIT-B7-001 | Season transition |
| GAP-B11-011 | CRIT-B7-002 | AI roster building |
| GAP-B13-004 | CRIT-B8-001 | Postseason MVP |
| MAJ-B1-002 | GAP-B1-002 | Stats calibration |
| MAJ-B1-003 | GAP-B1-004 | Pitcher park factor |
| GAP-B12-004 | GAP-B11-012 | Direct FA signing |
| GAP-B3-024 | GAP-B12-003 | Undo count badge |

### New Features (Beyond Original Audit)

1. **NEW-001:** SP/RP classified as pitchers (not position players) in League Builder roster setups
2. **NEW-002:** Franchise Mode pre-game lineup screen (choose starting pitcher + reorder lineup before game, matching Exhibition mode pattern)
3. **NEW-003:** Remove Pitch Counts and Mound Visits from Rules in League Builder

---

## Execution Order: Tiers by System Area & Dependencies

### Tier 1: Foundation (Build First)

These items are dependencies for other tiers.

**1.1 Grade, Salary & Adaptive (6 items)**
- gradeEngine.ts needed by prospect generation, salary calculations, and player ratings

**1.2 Franchise Mode Infrastructure (8 items: GAP-B5-001 through GAP-B5-008)**
- Database architecture and persistence needed by all franchise-mode operations

**1.3 Stats & Stadium Analytics (15 items)**
- Stat calibration and award emblems needed by season flows

---

### Tier 2: Core Game Systems

**2.1 GameTracker & Field (12 BUILD items)**
- FieldingPlay interface expansion
- Inherited runners tracking
- Holds/BS tracking
- Substitution validation

**2.2 Clutch & Mojo/Fitness (3 BUILD items)**
- Manager inference
- Mojo splits
- Player card displays

**2.3 Fame, Milestones & Fan Systems (9 items)**
- Fan Favorite detection
- Albatross detection
- Oddity records
- HOF features

---

### Tier 3: Flow & UI

**3.1 Draft & Prospect Generation (4 items + NEW-001)**
- Prospect generation algorithms
- NEW-001: SP/RP pitcher classification

**3.2 Offseason & Franchise Flows**
- Season transition
- AI roster building
- Player retirement
- Trades
- Waiver wire
- Free agent signing (dice-based and supplemental)

**3.3 League Builder & Setup (2 items + NEW-003)**
- NEW-003: Remove Pitch Counts and Mound Visits from Rules

**3.4 Playoffs & Season (14 items)**
- Playoff screens
- Playoff qualification
- Home field advantage
- Clinch detection

**3.5 Narrative & Special Events (2 items)**

---

### Tier 4: Polish & Integration

**4.1 Other/UI Items (~30 items)**
- Drag-reorder lineup
- Spray charts
- CSV import/export
- Player generation utilities
- UI refinements

**4.2 NEW-002: Franchise Pre-Game Lineup Screen**
- Starting pitcher selection
- Lineup reordering before game
- Matching Exhibition mode pattern

---

## Per-Item Execution Protocol

For each item in the spreadsheet:

### Step 1: Read Spreadsheet Data
```
ID: [Column A]
Spec Says: [Column F]
Code Says: [Column G]
Recommended Fix: [Column H]
Your Decision: [Column K]
Notes: [Any user notes in Column H]
```

### Step 2: Read Spec Doc
- Locate the referenced spec document in spec-docs/ directory
- Read the relevant section

### Step 3: Resolve Conflicts
```
IF spreadsheet cell differs from spec doc:
  → Spreadsheet value wins
  → Update spec doc on disk to match spreadsheet cell
```

### Step 4: Implement
- Write code changes to implement the feature/fix
- Follow the approach in Column H (Recommended Fix) or user notes

### Step 5: Validate TypeScript
```bash
npx tsc --noEmit
```
- Must be 0 errors before proceeding
- If errors exist, fix and re-validate

### Step 6: Run Area Tests
```bash
npm test -- [test file for this area] --reporter=verbose
```
- Run tests relevant to the changed code area
- Should show test results

### Step 7: Checkpoint Every 5 Items
After every 5 items completed:
```bash
npm test -- --reporter=verbose 2>&1 | tail -20
```
- Record results: [pass] / [fail] / [total]
- Log to FIX_EXECUTION_REPORT_2026-02-06.md

---

## Execution Report Template

Create/append to: `/sessions/keen-happy-allen/mnt/Projects/kbl-tracker/spec-docs/FIX_EXECUTION_REPORT_2026-02-06.md`

```markdown
## Phase B: Feature Builds
Started: [timestamp]
Baseline: 5,078 pass / 77 fail / 5,155 total

### Tier [N]: [Tier Name]
| Item ID | What Was Done | Files Modified | Test Status |
|---------|---------------|----------------|------------|
| XXX     | Brief description | file1.ts, file2.ts | PASS |
| ...     | ...            | ...            | ... |

**Checkpoint:** [pass] / [fail] / [total]

### Notes
- Any blocking dependencies
- Any items skipped and why
- Any conflicts resolved
```

---

## Safety Rules (STOP and Ask If)

**STOP and ask the user if:**

1. Any item would require deleting existing working functionality
2. Any item has conflicting requirements with another item
3. Implementation would cause >5 test failures
4. You're unsure about the correct behavior

**ALWAYS:**

- After each tier, run full test suite and report results
- Never skip items—every APPROVED item (Column K ≠ blank/SKIP) must be addressed
- If an item is blocked by another, note the dependency and move on
- Return to blocked items after dependencies are resolved

---

## Session Management

### Context Budget
Phase B has 132 items across 4 tiers. This WILL require multiple sessions.

### After Each Tier
1. Save progress to FIX_EXECUTION_REPORT_2026-02-06.md
2. Update AUDIT_TRIAGE.xlsx Status column for completed items
3. Run full test suite: `npm test -- --reporter=verbose 2>&1 | tail -20`
4. Report results with checkpoint summary
5. If context is getting long:
   - Summarize what's done (✓ items)
   - List what's left (items pending)
   - Include test results
   - Prepare for next session

---

## Starting Phase B: Tier 1

Ready to proceed with Tier 1: Foundation (Grade, Salary & Adaptive → Franchise Mode Infrastructure → Stats & Stadium Analytics).

**Next Step:**
1. Open AUDIT_TRIAGE.xlsx
2. Navigate to items in Tier 1 (filter by tier or search by item ID)
3. For each item: follow Per-Item Execution Protocol
4. After every 5 items: run test checkpoint
5. After Tier 1 complete: run full test suite and report

Go.

---

## Project Context

**Project:** KBL Tracker (TypeScript/React)  
**What It Is:** Baseball game tracker application with franchise mode, stats tracking, player management, draft/prospects, offseason flows, playoffs, and narrative systems

**Status Before Phase B:**
- Phase A: 20 code fixes (DONE)
- Phase C: 11 spec updates (DONE)
- Test baseline: 5,078 pass / 77 fail / 5,155 total

**Phase B Scope:** 132 feature builds across 12 system areas, organized into 4 tiers by dependency

**Key Files:**
- Triage: `/sessions/keen-happy-allen/mnt/Projects/kbl-tracker/spec-docs/AUDIT_TRIAGE.xlsx`
- Report: `/sessions/keen-happy-allen/mnt/Projects/kbl-tracker/spec-docs/FIX_EXECUTION_REPORT_2026-02-06.md`
- Spec Docs: `/sessions/keen-happy-allen/mnt/Projects/kbl-tracker/spec-docs/` (various .md files)
- Code: `/sessions/keen-happy-allen/mnt/Projects/kbl-tracker/src/`

---

**This prompt is ready to be pasted into Claude CLI for Phase B execution.**
