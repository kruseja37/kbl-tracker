---
name: codebase-reverse-engineer
description: Reverse-engineer authoritative spec documentation from the KBL Tracker codebase. Two modes — Mode A scans the full architecture (run once) and Mode B deep-specs a single feature (run per-feature, on-demand). Produces canonical specs that become the single source of truth, replacing stale/contradictory existing spec docs. Trigger on "reverse engineer specs", "spec from code", "what does the code actually do", "create canonical specs", "document the codebase", or as Tier 0 before running the testing pipeline.
---

# Codebase Reverse Engineer

## Purpose

The codebase is the only source of truth. Spec docs describe intent; code describes reality. This skill extracts reality from code into structured documentation that the testing pipeline can trust.

**This skill does NOT interpret or judge.** It extracts what the code does, flags where it might differ from intent, and leaves judgment to you.

## Two Modes

### Mode A: Architecture Scan
- Run ONCE for the entire codebase
- Produces: architecture overview, canonical types, feature inventory, spec triage
- Time: ~45-60 minutes
- Your review: ~15 minutes (confirm feature boundaries)

### Mode B: Feature Deep Spec
- Run ONCE PER FEATURE, on-demand (when you're about to test that feature)
- Input: feature name from the feature inventory
- Produces: one canonical spec file for that feature
- Time: ~30-45 minutes per feature
- Your review: ~15 minutes per feature (can be progressive)

**Always run Mode A first.** Mode B depends on Mode A's output.

---

# MODE A: Architecture Scan

## Pre-Flight

1. Locate the KBL Tracker project root:
   ```
   Search order:
   /mnt/Projects/kbl-tracker/
   /sessions/*/mnt/Projects/kbl-tracker/
   /mnt/user-data/uploads/ (if uploaded)
   ```
   If not found, ask the user for the path.

2. Verify by checking for: `package.json`, `src/` directory, `spec-docs/` directory
3. Run `npm run build` — must exit 0 (confirms code compiles)

## Phase A1: Directory & File Map

Read the entire `src/` directory structure (2-3 levels deep). For each directory:

```
DIRECTORY MAP:
src/
├── engines/        — Purpose: [what this directory contains]
│   ├── file1.ts    — [one-line purpose]
│   ├── file2.ts    — [one-line purpose]
├── components/     — Purpose: [...]
├── hooks/          — Purpose: [...]
├── ...
```

**How to determine purpose:** Read the first 10 lines of each file (imports and top comment). Don't read full implementations yet — that's Mode B's job.

**Count totals:**
- Total .ts files: [X]
- Total .tsx files: [Y]
- Total lines of code: [Z] (use `find src -name '*.ts' -o -name '*.tsx' | xargs wc -l`)

## Phase A2: Import Graph Analysis

Build the dependency graph:

```bash
# Extract all import statements
grep -rn --include="*.ts" --include="*.tsx" "^import.*from" src/ | head -500
```

For each file, record what it imports from other `src/` files (ignore node_modules imports).

**Cluster detection:**
1. Group files that import each other heavily (>3 mutual imports)
2. These clusters are candidate feature boundaries
3. Files imported by MANY clusters are shared infrastructure
4. Files that import nothing from src/ are likely leaf utilities

```
CLUSTER ANALYSIS:
Cluster 1: [files] — probable feature: [name]
Cluster 2: [files] — probable feature: [name]
Shared infrastructure: [files imported by 3+ clusters]
Isolated files: [files with no src/ imports]
```

## Phase A3: Canonical Type Extraction

Find ALL TypeScript interfaces, types, and enums that define application data:

```bash
# Find type definitions
grep -rn --include="*.ts" --include="*.tsx" -E "^(export )?(interface|type|enum) " src/
```

For EACH type/interface/enum:
1. Copy the COMPLETE definition verbatim (not summarized)
2. Note the file and line number
3. Note where it's imported (which files use this type)
4. Classify: GAME_STATE | PLAYER_DATA | SEASON_DATA | UI_STATE | CONFIG | OTHER

**Special attention to:**
- The GameState type (or equivalent) — this is the heart of the app
- Player stat types — these flow through many pipelines
- Season/franchise types — these define the data model
- Any union types or discriminated unions — these define valid states

**Output format:**
```typescript
// From: src/types/gameTypes.ts:15-42
// Used by: src/hooks/useGameState.ts, src/engines/gameEngine.ts, src/components/GameTracker/...
// Classification: GAME_STATE
export interface GameState {
  // [exact copy of the interface]
}
```

## Phase A4: Feature Inventory

Based on Phases A1-A3, produce a feature inventory:

```markdown
## Feature Inventory

### Feature 1: [Name]
Files: [list of files in this feature's boundary]
Primary directory: [where most files live]
Entry points: [main components or functions]
Data types: [which canonical types this feature uses]
Dependencies: [which other features it depends on]
Depended on by: [which features depend on this one]
Estimated complexity: [LOW / MEDIUM / HIGH — based on file count and import density]
Existing spec docs: [which existing spec-docs/ files relate to this feature]
Status: [ACTIVE — has recent changes | STABLE — unchanged recently | UNCLEAR]
```

**Verify boundaries with the user:** Present the feature list and ask: "Do these groupings look right? Should any files move between features?"

## Phase A5: Existing Spec Triage

Read the file listing of `spec-docs/` and classify each document:

```
For each file in spec-docs/:
  File: [name]
  Last modified: [date, if available from git or filesystem]
  Size: [line count]
  Classification:
    □ AUTHORITATIVE — Carefully written, likely accurate. Keep and reconcile.
    □ AI-GENERATED — Produced by Claude/AI tools. Verify before trusting.
    □ STALE — References code/features that no longer exist. Archive.
    □ ASPIRATIONAL — Describes unbuilt features. Move to future-work.
    □ PROCESS — Session logs, decision logs, state tracking. Keep as-is.
    □ DUPLICATE — Overlaps with another spec. Note which one supersedes.

  How to classify:
  - Read the first 20 lines for tone and content
  - Check if file/function names mentioned still exist in codebase
  - Check if the document references other docs that exist
  - PROCESS docs (SESSION_LOG, CURRENT_STATE, DECISIONS_LOG) are always kept
  - If unsure, classify as AI-GENERATED (needs verification)
```

**DO NOT delete or modify existing spec docs.** Only classify them. The canonical specs will live in a new `spec-docs/canonical/` directory alongside the originals.

## Mode A Output

Create the following files:

### `spec-docs/canonical/ARCHITECTURE.md`
```markdown
# KBL Tracker Architecture
Generated: [date] by codebase-reverse-engineer (Mode A)
Status: ⚠️ UNREVIEWED — Confirm feature boundaries before running Mode B

## Project Structure
[Directory map from Phase A1]

## Code Statistics
- Total TypeScript files: [X]
- Total lines of code: [Y]
- Features identified: [Z]

## Import Graph Summary
[Cluster analysis from Phase A2]
[Shared infrastructure identification]

## Feature Boundaries
[Feature inventory from Phase A4 — this is what you review]

## Technology Stack
- Framework: [React version]
- Language: [TypeScript version]
- Build tool: [Vite version]
- State management: [Zustand / Redux / Context / etc.]
- Storage: [localStorage / IndexedDB / etc.]
- Testing: [Vitest / Jest / none / etc.]
- Styling: [Tailwind / CSS modules / etc.]
```

### `spec-docs/canonical/CANONICAL_TYPES.md`
```markdown
# KBL Tracker Canonical Types
Generated: [date]
Status: ⚠️ UNREVIEWED — These are copied verbatim from code

[All types from Phase A3, organized by classification]
```

### `spec-docs/canonical/FEATURE_INVENTORY.md`
```markdown
# Feature Inventory
Generated: [date]
Status: ⚠️ AWAITING BOUNDARY CONFIRMATION

[Feature inventory from Phase A4]
```

### `spec-docs/SPEC_TRIAGE.md`
```markdown
# Existing Spec Document Triage
Generated: [date]

## Summary
- Total spec docs: [X]
- Authoritative: [Y]
- AI-Generated (needs verification): [Z]
- Stale (archive candidates): [W]
- Aspirational (future work): [V]
- Process docs (keep): [U]
- Duplicates: [T]

## Per-Document Classification
[Table from Phase A5]
```

## Mode A Integrity Checks

1. ✅ Every file in `src/` appears in the directory map
2. ✅ Every exported type/interface/enum is in CANONICAL_TYPES.md
3. ✅ Every file is assigned to exactly one feature (or to shared infrastructure)
4. ✅ Every existing spec doc is classified
5. ✅ Feature boundaries are derived from import analysis, not assumed
6. ✅ `npm run build` still passes after Mode A (we only READ, never WRITE code)

---

# MODE B: Feature Deep Spec

## Pre-Flight

1. Read `spec-docs/canonical/ARCHITECTURE.md` — REQUIRED
2. Read `spec-docs/canonical/CANONICAL_TYPES.md` — REQUIRED
3. Read `spec-docs/canonical/FEATURE_INVENTORY.md` — REQUIRED
4. Confirm which feature to spec (user provides feature name from inventory)
5. Read the file list for that feature from the inventory
6. If any AUTHORITATIVE existing spec docs relate to this feature (from SPEC_TRIAGE.md), read them too — they provide context on design intent

**If Mode A hasn't been run:** STOP. Run Mode A first.

## Phase B1: File-by-File Mechanical Extraction

For EACH file in the feature boundary, read the FULL implementation and extract:

```
FILE SPEC: [filename]
Path: [full path]
Lines: [line count]
Purpose: [one paragraph — what this file does in the feature]

EXPORTS:
  [For each exported function/class/component/constant:]
  
  Name: [exact name]
  Type: [function / React component / hook / class / constant / type]
  Signature: [full TypeScript signature, copied verbatim]
  
  LOGIC (for functions/hooks only):
  [Describe what the function does, step by step]
  [Include ACTUAL CODE SNIPPETS for key logic — not paraphrases]
  [For formulas/calculations, copy the exact formula from code]
  
  Example for a calculation:
  ```
  // ACTUAL CODE (from src/engines/bwarCalculator.ts:45-52):
  const offensiveComponent = wRAA + leagueAdjustment;
  const defensiveComponent = UZR + positionAdjustment;
  const replacementLevel = PA * replacementPerPA;
  const bwar = (offensiveComponent + defensiveComponent + replacementLevel) / runsPerWin;
  ```
  
  EDGE CASES HANDLED:
  [List every conditional check, null guard, boundary check in the function]
  [Include the actual condition from code]
  Example: "Returns 0 if PA === 0 (line 38: `if (!pa) return 0;`)"
  
  EDGE CASES NOT HANDLED:
  [What inputs could cause problems but aren't checked?]
  Example: "No check for negative PA — would produce negative WAR"
  Example: "No check for NaN inputs — would propagate NaN through calculations"

INTERNAL FUNCTIONS (not exported):
  [Same format but briefer — these are implementation details]

STATE MANAGEMENT:
  [For hooks/components: what state does this file manage?]
  [What triggers state changes?]
  [What are the side effects (useEffect)?]

DEPENDENCIES:
  Imports from this feature: [list]
  Imports from other features: [list]
  Imports from node_modules: [list]
```

**CRITICAL RULE: Include actual code for all logic.** Not "calculates WAR using standard formula" but the literal lines of code. This is what makes the spec verifiable — you can compare the code snippet against baseball rules yourself.

**Write each file's spec to disk IMMEDIATELY** in a working file. Don't try to hold all files in conversation memory.

Working file: `spec-docs/canonical/working/[feature-name]-raw.md`

## Phase B2: Behavioral Synthesis

Read the raw mechanical specs (from disk, not memory) and synthesize into a user-facing behavioral description.

For each user-facing capability the feature provides:

```
BEHAVIOR: [Name — e.g., "Record an at-bat outcome"]

USER PERSPECTIVE:
  What the user does: [step by step interaction]
  What the user sees: [what changes in the UI]
  What happens behind the scenes: [data flow summary]

IMPLEMENTATION PATH:
  1. User clicks [button/element] in [component]
  2. Handler [function] in [file] fires
  3. Calls [function] in [file] with [parameters]
  4. State updates: [what changes]
  5. UI re-renders: [what components update]
  [Include file:line references for each step]

DATA FLOW:
  Input: [what data enters the pipeline]
  Transformations: [each step that changes the data shape]
  Output: [what data is stored/displayed]
  Persistence: [what gets saved and where]
```

## Phase B3: Dual-Voice Discrepancy Detection

For each behavior and calculation, compare against available references:

```
DISCREPANCY CHECK:

Behavior: [name]
Code does: [what the actual code does — from Phase B1]
Reference says: [what existing AUTHORITATIVE spec says, OR what baseball rules say, OR what common sense says]
Source of reference: [which spec doc, or "standard baseball rules", or "N/A — no reference available"]

Comparison:
  □ MATCH — code and reference agree
  □ POSSIBLE DISCREPANCY — they differ, but the difference might be intentional (SMB4 simplification, design choice)
  □ PROBABLE BUG — code seems wrong by any reasonable interpretation
  □ NO REFERENCE — nothing to compare against, behavior is undocumented

[If POSSIBLE DISCREPANCY or PROBABLE BUG:]
  Code does: [specific behavior with code snippet]
  Reference says: [specific expected behavior with source]
  Question for you: [specific question to help you decide]
  
  Example:
  Code does: "Sac fly always adds 1 RBI regardless of outs (line 87: `stats.rbi += 1`)"
  Reference says: "Sac fly RBI only counts if runner scores, which requires <3 outs"
  Question: "Does the runner always score on a sac fly in your engine, or can the 3rd out prevent scoring?"
```

**NEVER assert "this is a bug."** Always frame as "POSSIBLE DISCREPANCY" or "PROBABLE BUG" with a question attached. You decide.

## Phase B4: Section-Level Review Status

Mark every section of the spec with its review status:

```
🔴 UNREVIEWED — Claude extracted this, you haven't checked it
🟡 PLAUSIBLE — You skimmed it and it seems right
🟢 VERIFIED — You confirmed this is correct intended behavior
🐛 BUG — Code does this but shouldn't (note correct behavior)
🚧 INCOMPLETE — Partially works, note what's missing
🗑️ DEPRECATED — Exists in code but should be removed
💡 ENHANCEMENT — Works but you want it different in the future
```

**Default EVERYTHING to 🔴 UNREVIEWED.** You upgrade status during review.

## Mode B Output

Produce: `spec-docs/canonical/features/[feature-name].md`

```markdown
# [Feature Name] — Canonical Spec
Generated: [date] by codebase-reverse-engineer (Mode B)
Feature boundary: [list of files]
Overall review status: ⚠️ UNREVIEWED

## 1. Data Model
Review status: 🔴 UNREVIEWED

### Types Used
[Relevant types from CANONICAL_TYPES.md, with notes on how this feature uses them]

### State Shape
[What state this feature manages, with actual type definitions]

## 2. Functions & Logic
Review status: 🔴 UNREVIEWED

### [Function/Component Name]
**Signature:** `[copied from code]`
**Purpose:** [one line]
**Logic:**
```typescript
// ACTUAL CODE from [file:lines]
[key logic snippets — not paraphrases]
```
**Edge cases handled:** [list with line references]
**Edge cases NOT handled:** [list]

### [Next function...]

## 3. User-Facing Behaviors
Review status: 🔴 UNREVIEWED

### Behavior: [Name]
**What the user does:** [steps]
**What happens:** [implementation path with file:line refs]
**Data flow:** [input → transformations → output]

### Behavior: [Next...]

## 4. State Management
Review status: 🔴 UNREVIEWED

### State Variables
| Variable | Type | Managed by | Triggers |
|----------|------|-----------|----------|
| ... | ... | ... | ... |

### Side Effects
| useEffect Location | Depends On | Does What |
|-------------------|-----------|----------|
| [file:line] | [dependency array] | [action] |

## 5. Persistence
Review status: 🔴 UNREVIEWED

### What's Saved
| Data | Storage Mechanism | Key/Path | When Saved |
|------|-------------------|----------|------------|
| ... | localStorage / IndexedDB / etc. | ... | ... |

### What's NOT Saved (ephemeral state)
[State that's lost on page refresh]

## 6. Discrepancies
Review status: 🔴 REQUIRES YOUR INPUT

| ID | Behavior | Code Does | Reference Says | Status |
|----|----------|-----------|---------------|--------|
| D-01 | [name] | [code behavior] | [reference] | ❓ NEEDS REVIEW |
| D-02 | ... | ... | ... | ... |

### D-01: [Detailed discrepancy description]
[Full context, code snippet, reference source, question for you]

## 7. Dependencies & Connections
Review status: 🔴 UNREVIEWED

### This feature depends on:
| Feature | How | Files |
|---------|-----|-------|
| ... | ... | ... |

### Features that depend on this:
| Feature | How | Files |
|---------|-----|-------|
| ... | ... | ... |

### Cross-feature interactions:
[Any useEffect chains, event subscriptions, or shared state that
 connects this feature to others]

## 8. Edge Cases & Known Gaps
Review status: 🔴 UNREVIEWED

### Handled Edge Cases
| Case | How Handled | Code Location |
|------|------------|---------------|
| ... | ... | [file:line] |

### Unhandled Edge Cases
| Case | Risk | Recommendation |
|------|------|---------------|
| ... | [what could go wrong] | [suggested handling] |

## Appendix: File Inventory
| File | Purpose | Key Exports | Lines |
|------|---------|-------------|-------|
| ... | ... | ... | ... |
```

Also clean up the working file:
- Delete `spec-docs/canonical/working/[feature-name]-raw.md` after synthesis
- Or keep it as a detailed appendix if you want the per-file breakdowns

## Integration With Testing Pipeline

### How testing skills should use canonical specs:

```
golden-case-generator:
  → Reads Section 2 (Functions & Logic) for actual formulas
  → Reads Section 6 (Discrepancies) to know what's uncertain
  → Reads Section 8 (Edge Cases) for boundary conditions
  → Checks review status: if 🔴, warns "spec unreviewed, golden cases may need revision"

failure-analyzer:
  → Reads Section 2 to understand intended function behavior
  → Reads Section 8 (Unhandled Edge Cases) to distinguish
    "bug" from "known gap"
  → Reads Section 6 to check if a failure was already flagged as a discrepancy

franchise-button-audit:
  → Reads Section 3 (Behaviors) to know which interactions SHOULD exist
  → Compares against actual buttons found

data-pipeline-tracer:
  → Reads Section 7 (Dependencies & Connections) for expected data flows
  → Reads Section 5 (Persistence) for expected storage patterns

season-simulator:
  → Reads Section 4 (State Management) for side effect chains
  → Reads Section 5 (Persistence) to understand what accumulates
```

### Review status propagation:

If a testing skill reads a spec section marked 🔴 UNREVIEWED, it should:
1. Still use the information (it's better than nothing)
2. Flag its own output: "Based on UNREVIEWED spec for [feature], Section [N]. Verify spec before trusting these results."
3. This flag should appear in the test report

When you upgrade a section to 🟢 VERIFIED, the test results retroactively gain confidence without re-running.

## Mode B Integrity Checks

1. ✅ Every file in the feature boundary was read (check against FEATURE_INVENTORY.md)
2. ✅ Every exported function has a signature AND logic description with code snippets
3. ✅ Every calculation includes the ACTUAL CODE, not a paraphrase
4. ✅ Every section is marked 🔴 UNREVIEWED (not pre-marked as verified)
5. ✅ Discrepancy table has at least considered each major behavior (even if all MATCH)
6. ✅ Cross-feature interactions are documented (Section 7)
7. ✅ File inventory in appendix matches the feature boundary from FEATURE_INVENTORY.md
8. ✅ `npm run build` still passes (we only READ, never WRITE code)

## Anti-Hallucination Rules — Mode A

- Do NOT invent feature boundaries — derive them from import analysis
- Do NOT summarize types — copy them verbatim
- Do NOT classify existing spec docs by reading their titles — read at least 20 lines
- Do NOT assume the project structure matches any template — read the actual directories
- If the import graph doesn't show clear clusters, say so. Don't force artificial boundaries.

## Anti-Hallucination Rules — Mode B

- Do NOT paraphrase formulas or logic — include the ACTUAL CODE SNIPPET with file:line reference
- Do NOT assert "this is a bug" — use "POSSIBLE DISCREPANCY" with a question for the user
- Do NOT mark any section as anything other than 🔴 UNREVIEWED — only the user can upgrade status
- Do NOT skip edge case analysis because the function "looks simple" — read every conditional
- Do NOT rely on function names to determine purpose — read the implementation
- If a function is too complex to fully explain in the spec, include the full code block and note "COMPLEX — review the code directly for full understanding"
- Do NOT generate specs for features whose boundaries you haven't confirmed with the user (Mode A gate)
- If you can't determine what a piece of code does, say "UNCLEAR — needs human review" rather than guessing

## Operational Notes

### Context Management for Mode B

If the feature has too many files to read in one pass:
1. Prioritize: engines > hooks > components > utils > types
2. Write each file's spec to the working file immediately
3. For Phase B2 synthesis, read the working file (specs) not the source code (verbose)
4. If you still can't fit, split the feature and spec the sub-parts separately

### Running Mode B Multiple Times

You can re-run Mode B for a feature after code changes. The new spec replaces the old one. The review status resets to 🔴 UNREVIEWED for any section that changed.

To see what changed: diff the old and new spec files. Only sections with differences need re-review.

### Recommended Feature Order for Mode B

Don't spec all features at once. Spec them as needed:
1. Spec the feature you're about to TEST (just-in-time)
2. Start with the feature that's most actively developed
3. Leave stable, untouched features for last (they can wait)
