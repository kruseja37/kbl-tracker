#!/bin/bash
# ============================================================
# KBL Tracker Skills Installer
# Run from your kbl-tracker project root:
#   bash install-all-skills.sh
# ============================================================

set -e

# Verify we are in a reasonable location
if [ ! -d "src" ] || [ ! -f "package.json" ]; then
  echo "WARNING: No src/ directory or package.json found."
  echo "Are you in the kbl-tracker project root?"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
  fi
fi

echo "Installing 11 skills + 2 guides..."
echo ""

mkdir -p .claude/skills
mkdir -p spec-docs

mkdir -p ".claude/skills/codebase-reverse-engineer"
cat > ".claude/skills/codebase-reverse-engineer/SKILL.md" << 'SKILLEOF0'
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
SKILLEOF0
echo "  ✓ codebase-reverse-engineer"

mkdir -p ".claude/skills/engine-discovery"
cat > ".claude/skills/engine-discovery/SKILL.md" << 'SKILLEOF1'
---
name: engine-discovery
description: Map the GameTracker engine's API surface, type definitions, and import paths before any testing begins. Produces ENGINE_API_MAP.md and a proof-of-life script that validates the engine can be called outside React. This is the FOUNDATION for all subsequent testing skills. Trigger on "map the engine", "discover engine API", "engine discovery", "what functions does the game tracker use", or as the first step before running gametracker-logic-matrix, test-harness-builder, or failure-analyzer skills.
---

# Engine Discovery

## Purpose

Before testing anything, we need to know EXACTLY what we're testing. This skill maps the GameTracker's state management and logic functions so that subsequent testing skills can call them directly without going through the UI.

**This skill produces files that other skills consume. Do not skip it.**

## Pre-Flight

1. Read `spec-docs/CURRENT_STATE.md` for implementation status
2. Read `spec-docs/SMB4_GAME_MECHANICS.md` for expected game mechanics
3. Run `npm run build` — must exit 0
4. Run `npm test` — record baseline

## Phase 1: Locate the Engine

Search the codebase for game state logic. Check these locations in order:

```
SEARCH ORDER:
1. src/engines/        — dedicated engine files (most likely)
2. src/hooks/          — React hooks that may contain logic
3. src/utils/          — utility functions
4. src/types/          — TypeScript type definitions
5. src/stores/         — state management (Zustand, Redux, etc.)
6. src/components/     — logic embedded in components (worst case)
```

For each location, answer:
- Does this file contain game state transition logic?
- Does this file define the game state type/interface?
- Does this file handle at-bat outcome processing?
- Does this file manage inning transitions, out counting, or base advancement?

**Record every file that touches game state.** Don't stop at the first match.

## Phase 2: Extract the Type Definitions

Find and dump the COMPLETE TypeScript type for the game state object.

**What to capture:**
```
REQUIRED TYPE INFORMATION:
1. The main GameState interface/type (whatever it's called)
2. All nested types it references
3. Enum types for outcomes, base states, inning halves
4. The type signature of the state update/dispatch function
5. Any union types or discriminated unions used in game logic
```

**How to capture:**
- Copy the EXACT type definitions from source files
- Include the file path and line numbers for each type
- If types are spread across multiple files, consolidate them with source annotations
- Do NOT summarize or paraphrase — copy the actual TypeScript

**Output:** Write the full type dump to the `ENGINE_API_MAP.md` file (Section: Type Definitions).

## Phase 3: Map the Function API

For every function that modifies game state, document:

```
FUNCTION MAP TEMPLATE (repeat for each function):

Function: [exact name]
File: [exact path from project root]
Line: [start line - end line]
Export type: [named export / default export / not exported]
Signature: [full TypeScript signature, copy verbatim]
Purpose: [one line — what it does]
Inputs: [list each parameter, its type, and what it represents]
Output: [return type and what it represents]
Side effects: [does it mutate state directly? dispatch? call other functions?]
Called by: [list all files/functions that call this function]
Dependencies: [what does this function import/require?]
React-coupled: [YES/NO — does it use hooks, context, or React state?]
```

**CRITICAL: The "React-coupled" field determines our entire testing strategy.**
- If YES → we need a shim/adapter to test it outside React
- If NO → we can import and call it directly in a Node script

## Phase 4: Identify the Entry Point

Find the PRIMARY function that processes an at-bat outcome. This is the function that:
1. Takes the current game state + an outcome (single, double, strikeout, etc.)
2. Returns the new game state

It might be one function or it might be a chain. Map the full chain:

```
ENTRY POINT CHAIN:
User clicks "Single" button
  → [handler function] in [file]
    → [processing function] in [file]
      → [state update function] in [file]
        → New state returned/dispatched

Document EVERY link in this chain with exact file paths and function names.
```

## Phase 5: Proof-of-Life Script

Write a script that validates the engine can be called outside the UI.

**Script requirements:**
- File: `test-utils/proof-of-life.ts`
- Uses the project's own TypeScript toolchain (tsx, vitest, or ts-node — whatever's already in package.json)
- Imports the engine functions using the EXACT paths from Phase 3
- Creates a minimal valid game state object (based on the types from Phase 2)
- Calls the primary entry point function with a simple outcome (e.g., "single" with bases empty, 0 outs)
- Logs: the input state, the output state, and whether the function executed without error
- Logs: the SHAPE of the output (all top-level keys and their types)

**Script structure:**
```typescript
// proof-of-life.ts
// Tests that the game engine can be called outside React

import { [functions] } from '[exact paths from Phase 3]';

// Minimal valid game state (from Phase 2 types)
const initialState: GameState = {
  // ... fill in based on actual type definition
};

console.log('=== PROOF OF LIFE: Engine Discovery ===');
console.log('Input state:', JSON.stringify(initialState, null, 2));

try {
  const result = [primaryFunction](initialState, 'single'); // or however it's called
  console.log('Output state:', JSON.stringify(result, null, 2));
  console.log('Output keys:', Object.keys(result));
  console.log('STATUS: ENGINE CALLABLE ✓');
} catch (error) {
  console.error('STATUS: ENGINE NOT CALLABLE ✗');
  console.error('Error:', error.message);
  console.error('This means the engine has React dependencies that must be shimmed.');
}
```

**Run the script.** Record the output verbatim.

### If Proof-of-Life FAILS

This is not a failure of the skill — it's critical information. Document:

1. The exact error message
2. What dependency caused the failure (React hook? Context? Browser API?)
3. A proposed shim strategy:
   - Can we mock the dependency?
   - Can we extract the pure logic into a separate function?
   - Do we need to refactor before testing is possible?

**Write this to ENGINE_API_MAP.md under "Extraction Requirements".**

**STOP HERE if proof-of-life fails.** Do not proceed to testing skills. The user must decide how to handle the React coupling.

## Phase 6: Enumerate Testable Dimensions

Based on what was discovered, enumerate the EXACT values for each test dimension:

```
OUTCOME TYPES (from actual code, not assumed):
List every string/enum value the engine accepts as an outcome.
Example: ['single', 'double', 'triple', 'homeRun', 'walk', ...]
Source: [file:line where these are defined]

BASE STATES (from actual code):
List every valid base configuration.
Example: [0b000, 0b001, 0b010, ...] or ['empty', '1B', '2B', ...]
Source: [file:line where these are defined]

OUT STATES (from actual code):
List valid out counts.
Example: [0, 1, 2]
Source: [file:line]

INNING STATES (from actual code):
List valid inning representations.
Example: [{number: 1-9+, half: 'top'|'bottom'}]
Source: [file:line]

TOTAL TEST MATRIX:
[outcomes] × [base states] × [out states] = [exact number]
With innings: × [inning states] = [exact number]
```

**These enumerations become the contract for the test-harness-builder skill.**

## Output

Produce a single file: `spec-docs/ENGINE_API_MAP.md`

```markdown
# GameTracker Engine API Map
Generated: [date]
Discovery method: Static analysis + proof-of-life execution

## Type Definitions
[Full TypeScript types, copied verbatim with source annotations]

## Function Map
[One entry per function, using the template from Phase 3]

## Entry Point Chain
[The full button-click-to-state-update chain from Phase 4]

## Proof-of-Life Results
Script: test-utils/proof-of-life.ts
Result: [PASS/FAIL]
Output: [verbatim console output]
[If FAIL: extraction requirements and proposed shim strategy]

## Testable Dimensions
Outcomes: [list with source]
Base states: [list with source]
Out states: [list with source]
Inning states: [list with source]
Total matrix size: [number]

## React Coupling Assessment
Can engine be tested independently: [YES/NO]
Dependencies requiring mocks: [list, if any]
Recommended test runner: [tsx/vitest/ts-node — based on what's in package.json]
Import path for test scripts: [exact import statement]
```

Also produce: `test-utils/proof-of-life.ts` (the actual executable script)

## Integrity Checks

Before declaring this skill complete:

1. ✅ Every function in the Function Map has an exact file path that exists
2. ✅ Every type definition compiles (verified by `npm run build` still passing)
3. ✅ The proof-of-life script has been actually executed (not just written)
4. ✅ The testable dimensions are sourced from code, not assumed
5. ✅ If proof-of-life failed, the failure is documented with root cause

## Anti-Hallucination Rules

- Do NOT assume function signatures — read the actual code
- Do NOT invent type definitions — copy them from source files
- Do NOT claim the engine is React-independent without running proof-of-life
- Do NOT enumerate outcomes from baseball knowledge — enumerate from the actual code's accepted values
- If you can't find the engine entry point, say so. Do not guess.
- If the codebase structure doesn't match expectations, document what you actually found
SKILLEOF1
echo "  ✓ engine-discovery"

mkdir -p ".claude/skills/franchise-engine-discovery"
cat > ".claude/skills/franchise-engine-discovery/SKILL.md" << 'SKILLEOF2'
---
name: franchise-engine-discovery
description: Map ALL non-GameTracker engine surfaces in KBL Tracker — season management, stats aggregation, standings, WAR calculators, salary system, mojo/fitness, roster management, and franchise operations. Extends engine-discovery to identify the "completed game" data contract, React coupling per pipeline, and data fan-out topology. This is the FOUNDATION for all franchise testing skills. Trigger on "map franchise engines", "discover franchise API", "franchise discovery", or as the first step before franchise-button-audit, data-pipeline-tracer, or season-simulator.
---

# Franchise Engine Discovery

## Purpose

The GameTracker has its own engine-discovery skill. This skill maps EVERYTHING ELSE — the engines, storage, hooks, and data contracts that power the franchise/season/stats experience.

**Critical question this skill must answer:** When a game completes in the GameTracker, what happens to that data? Is there a clean function that processes a completed game, or is it a cascade of React side effects? The answer determines the entire franchise testing architecture.

## Pre-Flight

1. Read `spec-docs/CURRENT_STATE.md`
2. Read `spec-docs/ENGINE_API_MAP.md` (from GameTracker engine-discovery) — if it doesn't exist, run engine-discovery first
3. Read ALL spec docs in `spec-docs/` that relate to non-GameTracker features:
   - `BWAR_CALCULATION_SPEC.md`
   - `PWAR_CALCULATION_SPEC.md`
   - `FWAR_CALCULATION_SPEC.md`
   - `RWAR_CALCULATION_SPEC.md`
   - `MWAR_CALCULATION_SPEC.md`
   - `SALARY_SYSTEM_SPEC.md`
   - `MOJO_FITNESS_SYSTEM_SPEC.md`
   - `SPECIAL_EVENTS_SPEC.md`
   - Any other spec docs found
4. Run `npm run build` — must exit 0
5. Run `npm test` — record baseline

## Phase 1: Catalog All Engine Files

Scan the ENTIRE `src/` directory for non-GameTracker logic:

```
SEARCH TARGETS:
1. src/engines/           — ALL files (skip GameTracker-specific ones already mapped)
2. src/storage/           — ALL storage/persistence files
3. src/hooks/             — ALL hooks (skip GameTracker-specific ones)
4. src/utils/             — Utility functions with business logic
5. src/types/             — ALL type definitions
6. src/stores/            — State management (if exists)
7. src/services/          — API/service layer (if exists)
8. src/constants/         — Configuration, enums, magic numbers
```

For EACH file found, record:
```
File: [path]
Purpose: [one line]
Exports: [list of exported functions/types/constants]
Imports from other src/ files: [list — this maps internal dependencies]
GameTracker-related: [YES/NO — skip if YES, already mapped]
React-coupled: [YES/NO — uses hooks, context, or component lifecycle]
```

## Phase 2: Map the Completed-Game Data Contract

**This is the most important phase.** Find exactly what happens when a game finishes.

### Step 1: Trace the "Game Over" Event

Starting from the GameTracker's "End Game" or equivalent button/action:
```
1. Find the handler that fires when a game is completed
2. Follow EVERY function call and side effect triggered by game completion
3. For EACH downstream action:
   - What function is called?
   - What data does it receive? (the "completed game" shape)
   - What does it do with that data? (store, calculate, update)
   - Is it synchronous or triggered by React side effect (useEffect)?
   - Where does its OUTPUT go?
```

### Step 2: Document the Data Shape

```
COMPLETED GAME DATA CONTRACT:
{
  // Whatever the actual shape is — copy the TypeScript type verbatim
  // Include ALL fields, not just the obvious ones
  // Note which fields are optional
  // Note which fields the downstream engines actually READ
}

Source file: [where this type is defined]
Created by: [which function/component produces this data]
Consumed by: [list every function that reads it]
```

### Step 3: Classify the Pipeline Architecture

For the completed-game pipeline, classify:

```
PIPELINE ARCHITECTURE: [choose one]

A) CLEAN FUNCTION CALL
   A single function like processCompletedGame(gameData) exists.
   It's not React-coupled. It can be called from a Node script.
   → Season simulator can call it directly.

B) ORCHESTRATED BUT EXTRACTABLE
   Multiple functions are called in sequence, but they're pure.
   They could be wrapped in a single orchestrator function.
   → Need to build a thin wrapper, then simulator can use it.

C) REACT SIDE-EFFECT CASCADE
   Game completion triggers useEffect chains in mounted components.
   Data processing only happens when specific components are rendered.
   → Simulator needs Vitest + React Testing Library, or Playwright.
   → Document EVERY useEffect that participates in the cascade.

D) MIXED
   Some processing is pure functions, some is React-coupled.
   → Document which is which. Simulator can test extractable parts
     directly and needs RTL for the coupled parts.
```

**RECORD THIS CLASSIFICATION.** It determines the entire Phase 3 (simulation) architecture.

### Step 4: Map the Fan-Out Topology

After a game completes, data fans out to multiple destinations. Map ALL of them:

```
GAME COMPLETION FAN-OUT:

Game Data ──┬──▶ Player Stats Aggregation
            │     Function: [name] in [file]
            │     Input: [what it reads from game data]
            │     Output: [what it produces]
            │     Storage: [where it saves]
            │     React-coupled: [YES/NO]
            │
            ├──▶ Team Standings Update
            │     Function: [name] in [file]
            │     ...
            │
            ├──▶ WAR Recalculation
            │     Function: [name] in [file]
            │     ...
            │
            ├──▶ Salary Recalculation
            │     Function: [name] in [file]
            │     ...
            │
            ├──▶ Mojo/Fitness Update
            │     Function: [name] in [file]
            │     ...
            │
            ├──▶ Special Event Detection
            │     Function: [name] in [file]
            │     ...
            │
            ├──▶ Game History/Log Storage
            │     Function: [name] in [file]
            │     ...
            │
            └──▶ [Any other downstream processing]
```

For EACH branch, note whether it's synchronous, async (useEffect), or deferred (next render cycle). This matters for testing — async branches can have timing bugs.

## Phase 3: Map Individual Engine APIs

For each non-GameTracker engine, produce the same function map as engine-discovery:

```
ENGINE MAP TEMPLATE (repeat per engine):

Engine: [name, e.g., "BWAR Calculator"]
File: [exact path]
Spec doc: [corresponding spec file]
Primary function: [name and full signature]
Inputs: [list with types — what data does it need?]
Output: [return type — what does it produce?]
Dependencies: [other engines it calls, data it reads]
React-coupled: [YES/NO]
Called by: [what component/hook triggers this calculation?]
Trigger: [when does this run? On game completion? On page load? On demand?]
```

Group engines by domain:
- **Stats engines:** Player stats aggregation, season averages, career totals
- **Calculation engines:** BWAR, PWAR, FWAR, RWAR, MWAR, composite WAR
- **Economy engines:** Salary calculator, contract system
- **Simulation engines:** Mojo, fitness, regression, progression
- **Franchise engines:** Standings, playoffs, draft, trades, roster management
- **Event engines:** Special events, milestones, records

## Phase 4: Proof-of-Life Scripts

Write a proof-of-life script for EACH engine domain:

```
test-utils/franchise-proof-of-life.ts

// Test 1: Can we import and call the stats aggregation engine?
// Test 2: Can we import and call the WAR calculator?
// Test 3: Can we import and call the salary calculator?
// Test 4: Can we import and call the standings calculator?
// Test 5: Can we call the "completed game" processor (if extractable)?
```

**For each test:**
- Import using EXACT paths from the engine map
- Call with minimal valid inputs
- Log: did it execute? What shape is the output? Any errors?
- If React-coupled: log the specific dependency that blocks execution

**Run the script.** Record results verbatim.

### Critical Proof-of-Life: The Completed-Game Processor

If the pipeline is type A or B (see Phase 2 Step 3), test:
```typescript
// Create a minimal completed game object matching the data contract
const syntheticGame = { /* ... from Phase 2 data shape ... */ };

// Feed it into the processor
const result = processCompletedGame(syntheticGame);

// Verify: did downstream state change?
// Check: player stats, standings, etc.
console.log('Post-processing state:', JSON.stringify(result));
```

If this works → season simulator is viable as a pure Node script.
If this fails → document WHY and what architecture the simulator needs instead.

## Phase 5: Identify Testable Dimensions Per Engine

For each calculation engine, enumerate the inputs:

```
BWAR CALCULATOR:
Inputs:
  - PA (plate appearances): range [0, ∞), test at: 0, 1, 100, 502 (qualifying), 700
  - hits, doubles, triples, HR, BB, HBP, SF, SH: range [0, PA]
  - SB, CS: range [0, ∞)
  - position: enum [list from code]
  - league averages: [how are these sourced? hardcoded? calculated?]
  - park factor: [how is this sourced?]
Edge cases:
  - 0 PA (should return 0 or null, not NaN/Infinity)
  - PA below qualifying minimum (should flag or handle)
  - Extreme values (99 HR)
Floating-point concerns: [which calculations involve division that could produce long decimals?]
Recommended tolerance: ±[value] for test assertions
```

## Output

Produce: `spec-docs/FRANCHISE_API_MAP.md`

```markdown
# Franchise Engine API Map
Generated: [date]

## Pipeline Architecture Classification
Game completion pipeline: [A/B/C/D from Phase 2]
Implications for testing: [what this means for simulator design]

## Completed-Game Data Contract
[Full TypeScript type from Phase 2]
[Fan-out topology diagram from Phase 2 Step 4]

## Engine Maps by Domain

### Stats Engines
[Function maps]

### Calculation Engines (WAR)
[Function maps with testable dimensions]

### Economy Engines
[Function maps]

### Franchise Engines
[Function maps]

### Event Engines
[Function maps]

## React Coupling Summary
| Engine/Function | React-Coupled | Blocking Dependency | Extractable? |
|----------------|---------------|--------------------|--------------| 
| ...            | ...           | ...                | ...          |

## Proof-of-Life Results
[Per-engine results]
[Completed-game processor result — CRITICAL]

## Recommendations for Simulator Architecture
Based on pipeline classification [A/B/C/D]:
[Specific recommendation for how the season-simulator should be built]
```

Also produce: `test-utils/franchise-proof-of-life.ts`

## Integrity Checks

1. ✅ Every engine file in `src/engines/` is cataloged (minus GameTracker-specific ones)
2. ✅ The completed-game data contract includes the ACTUAL TypeScript type
3. ✅ The fan-out topology covers ALL downstream destinations (not just the obvious ones)
4. ✅ Pipeline architecture is classified (A/B/C/D) with evidence
5. ✅ Proof-of-life scripts have been EXECUTED, not just written
6. ✅ Every engine has a React-coupling assessment
7. ✅ Testable dimensions are enumerated from code, not assumed

## Anti-Hallucination Rules

- Do NOT assume the completed-game pipeline is clean. TRACE IT.
- Do NOT skip engines that seem "obviously working" — map them all
- Do NOT classify the pipeline as type A (clean function) without proof-of-life evidence
- Do NOT enumerate WAR formula inputs from memory — read the spec doc AND the code
- If an engine file exists but is never called from anywhere, flag it as ORPHANED
- If a spec doc describes an engine that doesn't exist in code, flag it as UNIMPLEMENTED
- Trace React coupling to SPECIFIC dependencies (which hook, which context), not just "it's coupled"
SKILLEOF2
echo "  ✓ franchise-engine-discovery"

mkdir -p ".claude/skills/franchise-button-audit"
cat > ".claude/skills/franchise-button-audit/SKILL.md" << 'SKILLEOF3'
---
name: franchise-button-audit
description: Exhaustive audit of every interactive UI element in KBL Tracker's non-GameTracker pages — franchise mode, season management, stats views, roster management, standings, settings. Uses dual-direction audit (top-down from components + bottom-up from handlers) with reconciliation integrity check. Classifies buttons by data-mutation impact. Trigger on "audit franchise buttons", "find dead buttons", "check franchise UI wiring", "what buttons work", or as Phase 1 of the franchise testing pipeline.
---

# Franchise Button Audit

## Purpose

Find every interactive UI element outside the GameTracker. For each one, answer: does it do something real, something fake, or nothing at all? The output is a page-by-page inventory that the data-pipeline-tracer consumes.

## Pre-Flight

1. Read `spec-docs/CURRENT_STATE.md`
2. Read `spec-docs/FRANCHISE_API_MAP.md` — if it doesn't exist, run franchise-engine-discovery first
3. Run `npm run build` — must exit 0

### Preflight Proof

Before the full audit, verify you can find and parse components:

```
PREFLIGHT PROOF:
1. Find at least 1 component file in the franchise/season/stats area
2. Parse it and identify at least 1 interactive element (onClick, etc.)
3. Trace that element's handler to its destination (engine, store, etc.)

If this fails → the component structure is different than expected.
Document what you found and STOP.
```

## Phase 1: Top-Down Audit (Components → Handlers)

### Step 1: Identify All Non-GameTracker Pages/Routes

Read the router configuration (React Router, file-based routing, etc.):

```
ROUTE INVENTORY:
For each route/page in the app:
  Path: [e.g., /franchise, /season, /stats, /roster]
  Component: [file path]
  GameTracker-related: [YES/NO — skip if YES]
```

### Step 2: Audit Each Page

For EACH non-GameTracker page/route:

```
PAGE AUDIT TEMPLATE:

Page: [name]
Route: [path]
Component file: [path]
Child components: [list all imported components]

INTERACTIVE ELEMENTS:
For each onClick, onSubmit, onChange, onPress, href, Link, NavLink, button, a[href]:

  Element ID: [P01-E01 format — Page 01, Element 01]
  Type: [button / link / input / select / toggle / form]
  Label/Text: [what the user sees]
  Location in JSX: [file:line]
  Handler: [function name or inline]
  
  CLASSIFICATION:
  □ Tier A: DATA-MUTATING — calls engine, updates store/storage, creates/deletes data
  □ Tier B: NAVIGATION — calls navigate(), changes route, opens modal/drawer
  □ Tier C: UI CHROME — toggles accordion, closes modal, scrolls, no data effect
  
  STATUS:
  □ WIRED — handler exists and calls real logic
  □ DEAD — no handler, onClick={undefined}, or handler is empty function
  □ FAKE — handler exists but uses hardcoded/mock data instead of real source
  □ BROKEN — handler exists but would error (wrong args, missing import, etc.)
  □ TODO — handler contains TODO/placeholder comment
  
  HANDLER TRACE (for Tier A and B only):
  Handler function → calls → [what function] in [what file]
  That function → does → [what action]
  Final destination → [store update / storage write / navigation / API call]
```

### Step 3: Auto-Classification Rules

To determine classification automatically:

```
TIER A (Data-Mutating) — handler calls ANY of:
  - Functions from src/engines/
  - Functions from src/storage/
  - State setters in hooks that manage persistent data (not UI state)
  - Dispatch actions that modify game/season/roster/stats data
  - localStorage/IndexedDB operations

TIER B (Navigation) — handler calls ANY of:
  - navigate() / useNavigate() / history.push()
  - Link / NavLink components
  - Opens a modal/drawer that contains Tier A elements
  - Route changes

TIER C (UI Chrome) — handler does ONLY:
  - Toggle boolean state (isOpen, isExpanded, etc.)
  - Set UI-only state (selectedTab, sortOrder, filterValue)
  - Scroll operations
  - Console.log / debug output
  - No-ops
```

## Phase 2: Bottom-Up Audit (Handlers → Components)

### Step 1: Find All Handler Functions

Search the entire non-GameTracker codebase for handler definitions:

```bash
# Find all handler/action functions in hooks
grep -rn --include="*.ts" --include="*.tsx" -E '(const|function|async)\s+\w*(handle|on[A-Z]|submit|save|create|delete|update|add|remove|toggle|process|execute|dispatch)\w*' src/ | grep -v GameTracker | grep -v __tests__

# Find all store/storage mutation functions  
grep -rn --include="*.ts" -E 'export\s+(const|function|async)' src/storage/ src/stores/ src/engines/

# Find all event dispatchers
grep -rn --include="*.ts" --include="*.tsx" -E 'dispatch\(|emit\(|publish\(' src/
```

### Step 2: Reverse-Trace Each Handler

For each handler found:

```
HANDLER REVERSE-TRACE:
Handler: [function name]
Defined in: [file:line]
Purpose: [what it does — read the implementation]
Called by UI: [YES/NO — search for references in .tsx files]
  If YES: Which component(s) and element(s)?
  If NO: → ORPHANED HANDLER (code exists but nothing calls it)
```

## Phase 3: Reconciliation

**This is the integrity check that prevents false completeness.**

```
RECONCILIATION:

Top-down found: [X] interactive elements across [Y] pages
Bottom-up found: [Z] handler functions across [W] files

MATCHES: [count] — elements found top-down that match handlers found bottom-up
UNMATCHED TOP-DOWN: [count] — elements with no handler (DEAD buttons)
UNMATCHED BOTTOM-UP: [count] — handlers with no UI element (ORPHANED handlers)

INTEGRITY CHECK:
If UNMATCHED TOP-DOWN > 0: List each dead element
If UNMATCHED BOTTOM-UP > 0: List each orphaned handler
If total top-down count seems low (< 20 for a franchise app): 
  → Likely missed dynamically rendered elements
  → Search for .map() calls that generate interactive elements
  → Search for conditional renders that gate button visibility
```

### Handling Dynamic Elements

Some interactive elements are generated dynamically:

```
DYNAMIC ELEMENT PATTERNS TO CHECK:

1. .map() generating buttons:
   {items.map(item => <button onClick={() => handleItem(item)}>...</button>)}
   → Count as 1 element type with N instances, not N separate elements

2. Conditional renders:
   {isAdmin && <button onClick={handleDelete}>Delete</button>}
   → Count even if currently not visible

3. Dynamic imports / lazy components:
   const LazyPage = lazy(() => import('./AdminPanel'))
   → Must audit the lazy-loaded component too

4. Render props / children as function:
   <DataTable renderAction={(row) => <button onClick={() => edit(row)}>Edit</button>} />
   → Trace into the render prop
```

## Phase 4: Summary Generation

### Per-Page Summary

```
PAGE: [name]
Route: [path]
Total interactive elements: [count]
  Tier A (data-mutating): [count]
  Tier B (navigation): [count]
  Tier C (UI chrome): [count]
Status breakdown:
  WIRED: [count]
  DEAD: [count]
  FAKE: [count]
  BROKEN: [count]
  TODO: [count]
Health: [GOOD (>80% wired) / NEEDS WORK (50-80%) / CRITICAL (<50%)]
```

### Cross-Page Summary

```
OVERALL AUDIT:
Pages audited: [count]
Total Tier A elements: [count] — [wired/dead/fake/broken/todo breakdown]
Total Tier B elements: [count] — [breakdown]
Total Tier C elements: [count] — [skipped, not detailed]
Orphaned handlers: [count]
```

## Output

Produce: `spec-docs/FRANCHISE_BUTTON_AUDIT.md`

```markdown
# Franchise Button Audit Report
Generated: [date]
Pages audited: [count]
Total elements found: [count]

## Reconciliation Integrity
- Top-down elements: [X]
- Bottom-up handlers: [Y]
- Matched: [Z]
- Unmatched elements (DEAD): [list]
- Orphaned handlers: [list]

## Page-by-Page Inventory

### [Page Name] ([route])
| ID | Type | Label | Tier | Status | Handler → Destination |
|----|------|-------|------|--------|-----------------------|
| P01-E01 | button | Start Season | A | WIRED | handleStartSeason → seasonEngine.init() |
| P01-E02 | button | Export Data | A | DEAD | no handler |
| ... | ... | ... | ... | ... | ... |

Health: [GOOD/NEEDS WORK/CRITICAL]

### [Next Page] ...

## Tier A Elements Needing Attention
[All data-mutating elements that are DEAD, FAKE, BROKEN, or TODO]

## Orphaned Handlers
[Handlers with no UI element — potential dead code or missing UI]

## Recommendations
1. [Priority fixes — dead Tier A buttons that should work]
2. [Orphaned handlers that should be connected or removed]
3. [Fake data buttons that need real wiring]
```

Also produce: `test-utils/button-audit-data.json`
(Machine-readable version for consumption by data-pipeline-tracer)

```json
{
  "generated": "[date]",
  "pages": [
    {
      "name": "[page]",
      "route": "[path]",
      "elements": [
        {
          "id": "P01-E01",
          "type": "button",
          "label": "Start Season",
          "tier": "A",
          "status": "WIRED",
          "handler": "handleStartSeason",
          "handlerFile": "src/hooks/useSeason.ts:45",
          "destination": "seasonEngine.init()",
          "destinationFile": "src/engines/seasonEngine.ts:12"
        }
      ]
    }
  ],
  "orphanedHandlers": [],
  "reconciliation": {
    "topDownCount": 0,
    "bottomUpCount": 0,
    "matchedCount": 0,
    "unmatchedElements": [],
    "orphanedHandlers": []
  }
}
```

## Scope Boundaries

**DO audit:**
- All pages/routes EXCEPT GameTracker at-bat recording
- Settings pages (they often have data-mutating buttons)
- Modal/drawer content (often missed)
- Admin or debug panels (if they exist)

**Do NOT audit:**
- GameTracker at-bat outcome buttons (covered by gametracker-logic-tester)
- Browser chrome (back button, refresh, etc.)
- Third-party library internals (date pickers, chart tooltips, etc.)

**Do NOT audit deeply (Tier C — just count):**
- Sort/filter toggles
- Accordion expand/collapse
- Tab switches
- Modal close buttons
- Scroll-to-top
- Theme toggles

## Integrity Checks

1. ✅ Every page/route in the app is listed (minus GameTracker)
2. ✅ Reconciliation has been performed (top-down vs bottom-up counts compared)
3. ✅ Dynamic elements (.map, conditional renders) have been accounted for
4. ✅ Every Tier A element has a handler trace (not just "WIRED" — show WHERE it goes)
5. ✅ Orphaned handlers are listed with their file locations
6. ✅ Both .md and .json outputs are produced

## Anti-Hallucination Rules

- Do NOT count an element as WIRED without reading the handler implementation
- Do NOT skip pages because they "look simple" — audit every route
- Do NOT assume conditional renders mean the element doesn't exist — it does
- Do NOT classify a handler as real if it calls console.log or returns hardcoded data — that's FAKE
- If reconciliation shows a large discrepancy (>20%), investigate before reporting — you likely missed dynamic elements
- Do NOT audit GameTracker at-bat buttons — that's a different skill's job
- Grep for ALL onClick/onChange patterns across src/ and compare against your inventory as a final cross-check
SKILLEOF3
echo "  ✓ franchise-button-audit"

mkdir -p ".claude/skills/data-pipeline-tracer"
cat > ".claude/skills/data-pipeline-tracer/SKILL.md" << 'SKILLEOF4'
---
name: data-pipeline-tracer
description: Trace every data pipeline in KBL Tracker from entry point to final display, verifying data integrity at each junction. Tests three variants per pipeline (happy path, partial data, duplicate/conflict). Consumes franchise-button-audit output to identify which pipelines to trace. Covers game data → stats, game data → standings, roster changes → lineup, and all calculation pipelines. Trigger on "trace data flow", "pipeline audit", "where does data go", "data integrity check", or as Phase 1 of franchise testing pipeline after button audit.
---

# Data Pipeline Tracer

## Purpose

The button audit tells you IF a button is wired. This skill tells you if the DATA ARRIVES CORRECTLY at every downstream destination. It follows data from the moment it enters the system to every place it's displayed or stored, checking for loss, corruption, and fabrication at each junction.

## Pre-Flight

1. Read `spec-docs/FRANCHISE_API_MAP.md` — REQUIRED (especially the fan-out topology)
2. Read `test-utils/button-audit-data.json` — REQUIRED (identifies which pipelines to trace)
3. Read `spec-docs/CURRENT_STATE.md`
4. Run `npm run build` — must exit 0

### Preflight Proof

Before the full trace, verify the approach works:

```
PREFLIGHT PROOF:
1. Pick ONE known data pipeline (e.g., game score → standings display)
2. Trace it from entry to display
3. Verify you can read the data transformation at each step

If you can't trace even one pipeline → the codebase structure is too opaque.
Document what you found and STOP.
```

**If FRANCHISE_API_MAP.md doesn't exist:** STOP. Run franchise-engine-discovery first. The fan-out topology from that skill is essential — without it, you'll miss branches.

## Phase 1: Identify All Pipelines

A "pipeline" is a path from data entry to data display/storage. Derive the pipeline list from TWO sources:

### Source 1: Button Audit (Tier A elements)

Every WIRED Tier A element from the button audit is a pipeline entry point:

```
For each Tier A WIRED element in button-audit-data.json:
  Pipeline: [element label] → [handler] → [destination] → ... → [display]
```

### Source 2: Fan-Out Topology (from FRANCHISE_API_MAP.md)

The fan-out diagram shows all branches from game completion. Each branch is a pipeline:

```
For each branch in the fan-out topology:
  Pipeline: Game completion → [branch function] → [storage] → [hook] → [component]
```

### Deduplicate and Catalog

```
PIPELINE CATALOG:
ID: PL-01
Name: [descriptive name, e.g., "Game Result → Player Batting Stats"]
Entry point: [function/handler that receives initial data]
Entry trigger: [what causes this — button click? game completion? page load?]
Branches: [1 if linear, N if fan-out]
Final destinations: [where the data ends up being displayed or stored]
Priority: [HIGH — user-visible stats/standings | MEDIUM — background calcs | LOW — logs/metadata]
```

**Expected pipelines for KBL Tracker (verify against actual code):**
1. Game completion → player batting stats → stats display page
2. Game completion → player pitching stats → stats display page
3. Game completion → team standings → standings page
4. Game completion → WAR recalculation → WAR leaderboard
5. Game completion → salary recalculation → salary page
6. Game completion → mojo/fitness update → player detail page
7. Game completion → special event detection → notifications/log
8. Game completion → game history → game log page
9. Roster change → team roster display
10. Season start → schedule/standings initialization
11. Trade execution → roster updates on both teams

**There may be more.** Don't limit to this list — discover from the code.

## Phase 2: Trace Each Pipeline

For each pipeline, perform a DETAILED trace through every junction.

### Junction Definition

A "junction" is any point where data is transformed, filtered, aggregated, or transferred:

```
JUNCTION TYPES:
- TRANSFORM: Data shape changes (e.g., game events → aggregated stats)
- FILTER: Some data is excluded (e.g., only qualifying players)
- AGGREGATE: Data is combined (e.g., game stats → season totals)
- STORE: Data is persisted (localStorage, IndexedDB, in-memory store)
- RETRIEVE: Data is loaded from storage
- CALCULATE: Data is processed through an engine/formula
- RENDER: Data is displayed in a React component
```

### Per-Pipeline Trace

```
PIPELINE TRACE: PL-01 (Game Result → Player Batting Stats)

Junction 1: TRANSFORM
  Location: [file:line]
  Input: CompletedGame { ... } 
  Output: PlayerGameStats { ... }
  Function: extractPlayerStats(game)
  Verified: [YES/NO — does the function exist and accept this input?]
  Data loss risk: [which fields from input are NOT carried to output?]

Junction 2: AGGREGATE
  Location: [file:line]
  Input: PlayerGameStats (this game) + PlayerSeasonStats (accumulated)
  Output: PlayerSeasonStats (updated)
  Function: aggregateStats(gameStats, seasonStats)
  Verified: [YES/NO]
  Data loss risk: [are all stat categories aggregated? is anything skipped?]

Junction 3: STORE
  Location: [file:line]
  Input: PlayerSeasonStats (updated)
  Storage mechanism: [localStorage / IndexedDB / Zustand / etc.]
  Key/path: [how is it stored — what key, what schema?]
  Verified: [YES/NO — does the storage call actually execute?]

Junction 4: RETRIEVE
  Location: [file:line]
  Hook/function: usePlayerStats(playerId)
  Output: PlayerSeasonStats
  Verified: [YES/NO — does the hook read from the same key the store wrote to?]
  Mismatch risk: [does the read schema match the write schema?]

Junction 5: RENDER
  Location: [file:line]
  Component: PlayerStatsTable
  Input: PlayerSeasonStats from hook
  Displays: [which fields are shown in the UI?]
  Missing displays: [which fields exist in data but aren't rendered?]
  Verified: [YES/NO]

PIPELINE STATUS: [INTACT / BROKEN AT JUNCTION N / PARTIALLY BROKEN]
```

### What to Check at Each Junction

```
PER-JUNCTION VERIFICATION:
1. Does the function/component actually exist at the stated location?
2. Does it accept the input type from the previous junction?
3. Does it produce the output type the next junction expects?
4. Are TypeScript types aligned across the junction boundary?
5. Is there error handling for null/undefined input?
6. Is there a loading state while data is being processed?
7. For async junctions: is there a race condition risk?
8. For storage junctions: is the storage key consistent between write and read?
```

## Phase 3: Three-Variant Testing

For each HIGH-priority pipeline (and sampled MEDIUM-priority ones), evaluate three scenarios:

### Variant 1: Happy Path

```
Scenario: Valid, complete data flows through the pipeline
Question: Does the correct data arrive at the final destination?
Check: Read the code path for a normal case. Are all junctions connected? 
       Do the types align? Does the data arrive without loss or corruption?
```

### Variant 2: Partial Data

```
Scenario: Required fields are missing or optional fields are absent
Question: Does the pipeline handle incomplete data gracefully?
Check: What happens if a player has 0 at-bats? If a game has no hits?
       If a stat field is undefined? Does it:
       a) Show appropriate fallback (0, "N/A", empty state)? → GOOD
       b) Show NaN, undefined, or "undefined" in the UI? → BUG
       c) Crash / throw an error? → CRITICAL BUG
       d) Silently corrupt downstream calculations? → CRITICAL BUG
```

### Variant 3: Duplicate/Conflict

```
Scenario: Same data is processed twice, or conflicting data arrives
Question: Does the pipeline handle duplicates gracefully?
Check: What happens if the same game result is processed twice? Does it:
       a) Detect the duplicate and skip it? → GOOD
       b) Double-count the stats? → CRITICAL BUG
       c) Overwrite with identical data (harmless but sloppy)? → MINOR
       What happens if two updates conflict (e.g., trade + game completion 
       for the same player simultaneously)? Does one clobber the other?
```

**NOTE:** Variant 2 and 3 are evaluated by reading code and reasoning about edge cases, NOT by running the app (that's the simulator's job). The tracer identifies WHERE these scenarios would break; the simulator verifies they actually do.

## Phase 4: Async Pipeline Flagging

For each pipeline that involves React side effects (useEffect, async operations):

```
ASYNC RISK ASSESSMENT:

Pipeline: PL-01
Async junctions: [list]
Risk: [description of timing issue]
  e.g., "Stats aggregation happens in useEffect that depends on game state.
         If game state updates in multiple ticks, the aggregation might fire
         with stale data on the first tick."
Mitigation in code: [does the code handle this? useCallback, dependency arrays, etc.]
Verified: [YES — code handles timing / NO — potential race condition / UNCLEAR]
```

## Output

Produce: `spec-docs/DATA_PIPELINE_TRACE_REPORT.md`

```markdown
# Data Pipeline Trace Report
Generated: [date]
Pipelines traced: [count]
  High priority: [count]
  Medium priority: [count]
  Low priority: [count]

## Pipeline Summary
| ID | Name | Junctions | Status | Variants Tested | Issues |
|----|------|-----------|--------|-----------------|--------|
| PL-01 | Game → Batting Stats | 5 | INTACT | 3/3 | 0 |
| PL-02 | Game → Standings | 4 | BROKEN J3 | 3/3 | 1 critical |
| ... | ... | ... | ... | ... | ... |

## Intact Pipelines
[List pipelines that work correctly across all variants]

## Broken Pipelines

### PL-02: Game → Standings (BROKEN at Junction 3: STORE)
**Break point:** [file:line]
**Issue:** [what's wrong — e.g., storage key mismatch, missing write call]
**Impact:** [what the user would see — e.g., standings don't update after games]
**Variant failures:**
  - Happy path: [PASS/FAIL and why]
  - Partial data: [PASS/FAIL and why]
  - Duplicate: [PASS/FAIL and why]

### PL-03: ...

## Async Risk Zones
| Pipeline | Junction | Risk | Code Handles It? |
|----------|----------|------|-------------------|
| ... | ... | ... | ... |

## Data Loss Points
[Junctions where data fields exist upstream but disappear downstream]

## Type Mismatches
[Junctions where the TypeScript types don't align between producer and consumer]

## Recommendations
1. [Fix broken pipelines in priority order]
2. [Address async risks before they cause intermittent bugs]
3. [Wire missing data fields through to their display components]
```

Also produce: `test-utils/pipeline-trace-data.json`
(Machine-readable for season-simulator consumption)

## Scope Boundaries

**DO trace:**
- Every pipeline that originates from a Tier A button interaction
- Every branch of the game-completion fan-out
- Storage → retrieval round-trips (verify data survives storage)

**Do NOT trace:**
- GameTracker internal state transitions (covered by GameTracker testing pipeline)
- Third-party library internals
- Pure UI state (selectedTab, isModalOpen) — these are Tier C

**Partial trace (structure only, not all three variants):**
- Low-priority pipelines (logging, metadata, debug info)
- Pipelines behind unimplemented features (flag as UNIMPLEMENTED)

## Integrity Checks

1. ✅ Every Tier A WIRED element from button audit has a corresponding pipeline traced
2. ✅ Every branch of the fan-out topology from FRANCHISE_API_MAP.md is traced
3. ✅ High-priority pipelines have all 3 variants evaluated
4. ✅ Async junctions are flagged with risk assessment
5. ✅ Type alignment is checked at every junction (not just entry and exit)
6. ✅ Both .md and .json outputs produced

## Anti-Hallucination Rules

- Do NOT claim a pipeline is INTACT without tracing every junction
- Do NOT skip the partial-data variant — it catches the most real-world bugs
- Do NOT assume storage round-trips work — verify the key and schema match between write and read
- Do NOT treat useEffect-based processing as equivalent to synchronous calls — flag the async risk
- If a junction's code is too complex to fully trace, flag it as NEEDS DEEPER ANALYSIS rather than marking it INTACT
- Do NOT invent pipeline paths — derive them from button audit data and fan-out topology
- If you find a pipeline not in either source, add it and note it was discovered during tracing
SKILLEOF4
echo "  ✓ data-pipeline-tracer"

mkdir -p ".claude/skills/golden-case-generator"
cat > ".claude/skills/golden-case-generator/SKILL.md" << 'SKILLEOF5'
---
name: golden-case-generator
description: Generate a curated set of 30 hand-verifiable test cases for the GameTracker engine, clustered by outcome category with baseball reasoning for each. These golden cases serve as the oracle anchor — they validate BOTH the test harness AND the engine. Requires ENGINE_API_MAP.md from engine-discovery skill. Trigger on "generate golden cases", "create test oracle", "build verification cases", or as Step 2 after engine-discovery completes.
---

# Golden Case Generator

## Purpose

The golden cases are the ANCHOR for the entire testing pipeline. They serve two roles:
1. **Validate the engine** — if the engine gets these wrong, it has bugs
2. **Validate the test harness** — if the harness says these fail but the engine is correct, the harness has bugs

Because they serve dual purpose, every case must be **unambiguously correct** according to baseball rules (specifically SMB4 rules where they differ).

## Pre-Flight

1. Read `spec-docs/ENGINE_API_MAP.md` — REQUIRED. If this file doesn't exist, STOP. Run engine-discovery first.
2. Read `spec-docs/SMB4_GAME_MECHANICS.md` — for SMB4-specific rules
3. Confirm the testable dimensions from ENGINE_API_MAP.md:
   - Exact outcome types the engine accepts
   - Exact base state representations
   - Exact out state representations
   - The function signature for the entry point

## Coverage Matrix

The 30 cases must cover ALL of the following. Each cell must appear in at least one case:

### Outcome Coverage (every outcome type at least once):
```
REQUIRED OUTCOMES:
□ Single          □ Strikeout (swinging)
□ Double          □ Strikeout (looking) [if distinct in engine]
□ Triple          □ Ground out
□ Home Run        □ Fly out
□ Walk (BB)       □ Line out [if distinct in engine]
□ HBP             □ Double play (GIDP)
□ Error/ROE       □ Sacrifice fly
                  □ Sacrifice bunt
                  □ Fielder's choice
```

### Base State Coverage (every configuration at least once):
```
REQUIRED BASE STATES:
□ Empty (no runners)
□ Runner on 1st only
□ Runner on 2nd only
□ Runner on 3rd only
□ Runners on 1st + 2nd
□ Runners on 1st + 3rd
□ Runners on 2nd + 3rd
□ Bases loaded (1st + 2nd + 3rd)
```

### Out State Coverage:
```
□ 0 outs
□ 1 out
□ 2 outs
```

### Critical Transitions:
```
□ At least 1 case where 3rd out is recorded (inning transition)
□ At least 1 case in bottom of 9th (potential game-ending)
□ At least 1 case where runs score
□ At least 1 case where runs DON'T score on 3rd out (force out)
□ At least 1 case with 2 outs + runner scores before 3rd out (timing rule)
```

After generating cases, CHECK the coverage matrix. Every box must be checked. If any box is unchecked, add or modify cases to fill the gap.

## Case Format

Each case uses the EXACT types from ENGINE_API_MAP.md. Use the actual values the engine expects, not abstract descriptions.

```json
{
  "id": "GC-01",
  "category": "Hits - Single",
  "description": "Single with runner on 2nd, 0 outs",
  "input_state": {
    // Use EXACT field names from the GameState type in ENGINE_API_MAP.md
    // Example (adapt to actual type):
    "outs": 0,
    "bases": [false, true, false],  // or however the engine represents it
    "inning": 1,
    "half": "top",
    "score": [0, 0]
  },
  "outcome": "single",  // Use EXACT value the engine accepts
  "expected_output": {
    "outs": 0,
    "bases": [true, false, true],  // runner advances 2nd→3rd (conservative), batter on 1st
    "score": [0, 0],               // no run scores (runner held at 3rd)
    "runs_scored_this_play": 0
  },
  "reasoning": "On a single with a runner on 2nd and 0 outs, the conservative baserunning assumption is: runner advances one base (2nd→3rd), batter takes 1st. No run scores because the runner stops at 3rd. In SMB4, baserunning is simplified — check SMB4_GAME_MECHANICS.md for whether singles always score from 2nd.",
  "alternative_if_aggressive": "If the engine uses aggressive baserunning, the runner on 2nd scores. Expected: score +1, bases = [true, false, false].",
  "edge_case_notes": "This case tests the runner advancement model. The engine may handle this differently depending on whether it models conservative vs aggressive baserunning."
}
```

### Required Fields Per Case:
- **id**: GC-01 through GC-30
- **category**: Cluster label (see categories below)
- **description**: One-line plain English
- **input_state**: EXACT state object using actual engine types
- **outcome**: EXACT outcome value the engine accepts
- **expected_output**: EXACT expected state after outcome
- **reasoning**: WHY this is the correct result, citing baseball rules
- **alternative_if_aggressive**: If the expected result depends on a baserunning assumption, document BOTH possibilities. The user will confirm which one their engine uses.
- **edge_case_notes**: What makes this case tricky or important

## Case Categories (Clusters for Human Review)

Present cases in these clusters so the reviewer can focus on one concept at a time:

```
Cluster 1: Hits (5 cases)
  - Single with various base states
  - Double with runners
  - Triple (all runners score)
  - Home run (everyone scores)

Cluster 2: Walks & HBP (3 cases)
  - Walk with bases empty (simple)
  - Walk with bases loaded (force run home)
  - HBP with runner on 1st (force advance)

Cluster 3: Standard Outs (4 cases)
  - Strikeout (no base changes)
  - Ground out (no runners)
  - Fly out (no runners)
  - Ground out with runner on 1st, less than 2 outs (force at 2nd)

Cluster 4: Double Plays (3 cases)
  - GIDP with runner on 1st, 0 outs (classic 6-4-3)
  - GIDP with runners on 1st+2nd, 0 outs (lead runner out)
  - GIDP with bases loaded, 1 out (inning ends + force play run scoring rule)

Cluster 5: Sacrifice Plays (3 cases)
  - Sac fly with runner on 3rd, 0 outs (run scores, batter out)
  - Sac fly with runner on 3rd, 2 outs (run does NOT score — 3rd out)
  - Sac bunt with runner on 1st, 0 outs (runner advances, batter out)

Cluster 6: Fielder's Choice & Errors (3 cases)
  - FC with runner on 1st (runner out at 2nd, batter safe at 1st)
  - Error/ROE with bases empty (batter reaches)
  - Error/ROE with runner on 2nd (runner advances, batter reaches)

Cluster 7: Inning & Game Transitions (5 cases)
  - 3rd out via strikeout, top of 5th → transition to bottom of 5th
  - 3rd out with runner on base → runner stranded, no runs
  - Bottom of 9th, home team ahead → game should end (no bottom half)
  - Walk-off home run (bottom 9th, tie game, HR → game over)
  - 2 outs, runner on 3rd, ground out → run scores IF runner crosses before force out (timing rule)

Cluster 8: Scoring Edge Cases (4 cases)
  - Grand slam (4 runs score)
  - Runner on 3rd scores on single (1 run)
  - Bases loaded walk (1 run, all runners advance one base)
  - Run scores on sac fly but NOT on 3rd out (verify the distinction)
```

**Total: 30 cases across 8 clusters**

## Adaptation to Actual Engine

**CRITICAL:** The cases above are TEMPLATES. You MUST adapt them to the actual engine:

1. Read ENGINE_API_MAP.md for the exact field names and value formats
2. If the engine uses different outcome strings (e.g., "SINGLE" not "single"), use the engine's strings
3. If the engine represents bases differently (booleans vs. array vs. bitfield), use the engine's representation
4. If the engine doesn't support a certain outcome type, SKIP that case and note it
5. If the engine has outcomes not listed here, ADD cases for those outcomes

**The golden cases must be executable against the actual engine, not theoretical.**

## Baserunning Assumption Flags

Many cases depend on the engine's baserunning model. For EACH case where runner advancement is ambiguous, document both possibilities:

- **Conservative**: Runners advance minimum bases (single = 1 base advance)
- **Aggressive**: Runners advance maximum reasonable bases (single can score from 2nd)

Mark these cases with `"baserunning_assumption": "NEEDS_USER_CONFIRMATION"` so the user can quickly find and resolve them during review.

## Output

Produce TWO files:

### 1. `test-utils/golden-cases.json`
```json
{
  "generated": "[date]",
  "engine_api_map_version": "[date from ENGINE_API_MAP.md]",
  "total_cases": 30,
  "coverage": {
    "outcomes_covered": ["single", "double", ...],
    "outcomes_not_covered": [],
    "base_states_covered": ["empty", "1B", "2B", ...],
    "base_states_not_covered": [],
    "out_states_covered": [0, 1, 2],
    "transitions_covered": ["inning_change", "game_end", "run_scoring", "force_out_no_score"]
  },
  "cases_needing_user_confirmation": ["GC-03", "GC-07", ...],
  "clusters": [
    {
      "name": "Hits",
      "cases": [ ... ]
    },
    ...
  ]
}
```

### 2. `spec-docs/GOLDEN_CASES_REVIEW.md`
A human-readable version organized by cluster for easy review:

```markdown
# Golden Cases Review Document
Generated: [date]
Status: AWAITING USER REVIEW

## How to Review
- Read each cluster (takes ~3 minutes per cluster)
- For each case, verify the "expected_output" matches your understanding
- Pay special attention to cases marked ⚠️ NEEDS CONFIRMATION
- Mark each cluster: ✅ APPROVED or ❌ NEEDS REVISION (with notes)

## Cluster 1: Hits
### GC-01: Single with runner on 2nd, 0 outs
[human-readable description with reasoning]
⚠️ NEEDS CONFIRMATION: Does your engine score the runner from 2nd on a single?

...
```

## Integrity Checks

Before declaring complete:

1. ✅ Exactly 30 cases produced
2. ✅ Every outcome type from ENGINE_API_MAP.md appears in at least one case
3. ✅ Every base state appears in at least one case
4. ✅ All three out states (0, 1, 2) appear
5. ✅ At least one inning transition case exists
6. ✅ At least one game-ending case exists
7. ✅ At least one scoring case and one non-scoring-on-3rd-out case exist
8. ✅ All input/output states use EXACT types from ENGINE_API_MAP.md
9. ✅ All ambiguous baserunning cases are flagged for user confirmation
10. ✅ Coverage matrix in the JSON has no gaps

## Anti-Hallucination Rules

- Do NOT invent outcome types that don't exist in the engine — use only what ENGINE_API_MAP.md lists
- Do NOT assume base representation format — use the exact format from the engine's types
- Do NOT present cases as "obviously correct" if the baserunning model is unknown — flag for confirmation
- If ENGINE_API_MAP.md is missing or incomplete, STOP. Run engine-discovery first.
- Every "expected_output" must have documented reasoning. No "this is just how baseball works."
- Check SMB4_GAME_MECHANICS.md before assuming any real-baseball rule applies — SMB4 is simplified

## User Gate

**This skill's output REQUIRES user review before the pipeline continues.**

After producing the files, tell the user:
1. Open `spec-docs/GOLDEN_CASES_REVIEW.md`
2. Review each cluster (~20 minutes total)
3. Resolve all ⚠️ NEEDS CONFIRMATION items
4. Mark clusters as ✅ or ❌
5. Return confirmed file to enable the test-harness-builder skill

**Do NOT proceed to test-harness-builder until the user has confirmed the golden cases.**
SKILLEOF5
echo "  ✓ golden-case-generator"

mkdir -p ".claude/skills/test-harness-builder"
cat > ".claude/skills/test-harness-builder/SKILL.md" << 'SKILLEOF6'
---
name: test-harness-builder
description: Generate a self-contained test script that exhaustively tests every GameTracker state transition. Requires ENGINE_API_MAP.md and confirmed golden-cases.json. Produces a deterministic test harness with checkpoint-based progress tracking, self-test mode for validation, and integrity checks that prevent false completion claims. Trigger on "build test harness", "generate test matrix", "create test script", or as Step 3 after golden cases are confirmed.
---

# Test Harness Builder

## Purpose

Build a single executable test script that:
1. Tests EVERY combination of [base state × out state × outcome type]
2. Validates itself against the golden cases before running the full matrix
3. Tracks progress via checkpoints so it can resume after interruption
4. Produces tiered output (summary → failure clusters → individual failures)
5. Self-reports completeness (never claims success without running every test)

**This skill writes the script. It does NOT run the full matrix.** Execution is handled by the test-executor skill. However, it DOES run self-test mode to validate the harness.

## Pre-Flight

1. Read `spec-docs/ENGINE_API_MAP.md` — REQUIRED
2. Read `test-utils/golden-cases.json` — REQUIRED, must be user-confirmed
3. Verify golden cases are marked as confirmed (check for user approval markers)
4. Read the proof-of-life script output to confirm engine is callable
5. Run `npm run build` — must exit 0

**If ENGINE_API_MAP.md says the engine is React-coupled and proof-of-life failed:**
- STOP. The harness cannot be built until the engine is extractable.
- Document what needs to change and notify the user.

## Script Architecture

The harness is a SINGLE TypeScript file with clear sections:

```
test-utils/run-logic-matrix.ts

SECTION 1: Imports & Configuration
SECTION 2: Test Dimensions (enumerated from ENGINE_API_MAP.md)
SECTION 3: State Factory (creates valid game states)
SECTION 4: Oracle (defines expected outcomes for each state+outcome pair)
SECTION 5: Test Runner (iterates matrix, calls engine, compares results)
SECTION 6: Checkpoint System (saves/resumes progress)
SECTION 7: Output Formatter (tiered results)
SECTION 8: Self-Test Mode (validates harness against golden cases)
SECTION 9: Entry Point (CLI interface)
```

### Section 1: Imports & Configuration

```typescript
// Use EXACT import paths from ENGINE_API_MAP.md
import { [functions] } from '[exact path]';
import type { [types] } from '[exact path]';
import goldenCases from './golden-cases.json';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG = {
  outputDir: 'test-utils/results',
  checkpointFile: 'test-utils/results/checkpoint.json',
  batchSize: 100,  // Write checkpoint every N tests
  mode: process.argv[2] || 'full',  // 'self-test' | 'full' | 'resume'
};
```

### Section 2: Test Dimensions

**CRITICAL: These must be enumerated from the actual code, not assumed.**

```typescript
// Copy EXACTLY from ENGINE_API_MAP.md "Testable Dimensions" section
const OUTCOMES: string[] = [/* exact values from engine */];
const BASE_STATES: BaseState[] = [/* exact values from engine */];
const OUT_STATES: number[] = [0, 1, 2];
const INNING_STATES: InningState[] = [
  // For the logic matrix, test innings 1 (representative) and 9 (edge cases)
  // Full inning sweep is in the game simulator skill
  { number: 1, half: 'top' },
  { number: 1, half: 'bottom' },
  { number: 9, half: 'top' },
  { number: 9, half: 'bottom' },
];

// Self-documenting count
const EXPECTED_TOTAL = OUTCOMES.length * BASE_STATES.length * OUT_STATES.length * INNING_STATES.length;
console.log(`Expected total tests: ${EXPECTED_TOTAL}`);
```

### Section 3: State Factory

```typescript
function createGameState(
  bases: BaseState,
  outs: number,
  inning: InningState,
  score: [number, number] = [0, 0]
): GameState {
  // Build a VALID game state object matching the engine's type definition
  // Use the EXACT type structure from ENGINE_API_MAP.md
  return {
    // ... fill in all required fields
  };
}
```

**The state factory must produce states that the engine accepts without error.** If the engine requires fields beyond bases/outs/inning (like batting order, pitch count, etc.), initialize them to sensible defaults and document the defaults.

### Section 4: Oracle

The oracle defines what SHOULD happen for each state+outcome combination.

```typescript
interface ExpectedResult {
  outs: number;
  bases: BaseState;
  runsScored: number;
  inningChanged: boolean;
  gameOver: boolean;
  // Add fields as needed based on ENGINE_API_MAP.md
}

function getExpectedResult(
  state: GameState,
  outcome: string
): ExpectedResult {
  // Baseball rules engine — this is the "source of truth"
  // Implement based on:
  //   1. SMB4_GAME_MECHANICS.md (primary — SMB4-specific rules)
  //   2. Standard baseball rules (where SMB4 doesn't differ)
  //   3. User-confirmed golden cases (for baserunning assumptions)

  // IMPORTANT: Document every rule decision with a comment
  // Example:
  // Single: batter to 1st, runners advance 1 base (conservative model per golden case GC-03 confirmation)

  switch (outcome) {
    case 'single':
      return handleSingle(state);
    case 'double':
      return handleDouble(state);
    // ... etc
  }
}
```

**Oracle validation**: The oracle MUST agree with all 30 golden cases. This is verified in self-test mode.

### Section 5: Test Runner

```typescript
interface TestResult {
  id: string;  // "T-0001", "T-0002", etc.
  input: { bases: BaseState; outs: number; inning: InningState; outcome: string };
  expected: ExpectedResult;
  actual: any;  // Whatever the engine returns
  status: 'PASS' | 'FAIL' | 'ERROR';
  errorMessage?: string;
  diff?: Record<string, { expected: any; actual: any }>;  // Only populated on FAIL
}

function runTest(
  bases: BaseState,
  outs: number,
  inning: InningState,
  outcome: string,
  testId: string
): TestResult {
  const state = createGameState(bases, outs, inning);
  const expected = getExpectedResult(state, outcome);

  try {
    const actual = [engineFunction](state, outcome);  // Use exact function from ENGINE_API_MAP.md

    // Compare EVERY field in expected vs actual
    const diff = compareStates(expected, actual);
    const passed = Object.keys(diff).length === 0;

    return {
      id: testId,
      input: { bases, outs, inning, outcome },
      expected,
      actual,
      status: passed ? 'PASS' : 'FAIL',
      diff: passed ? undefined : diff,
    };
  } catch (error) {
    return {
      id: testId,
      input: { bases, outs, inning, outcome },
      expected,
      actual: null,
      status: 'ERROR',
      errorMessage: error.message,
    };
  }
}
```

**The comparison function must check EVERY field**, not just bases and outs. If the engine returns 20 fields, compare all 20.

### Section 6: Checkpoint System

```typescript
interface Checkpoint {
  lastCompletedIndex: number;
  totalExpected: number;
  results: TestResult[];
  timestamp: string;
}

function saveCheckpoint(checkpoint: Checkpoint): void {
  fs.writeFileSync(CONFIG.checkpointFile, JSON.stringify(checkpoint, null, 2));
}

function loadCheckpoint(): Checkpoint | null {
  if (!fs.existsSync(CONFIG.checkpointFile)) return null;
  return JSON.parse(fs.readFileSync(CONFIG.checkpointFile, 'utf-8'));
}
```

Tests save progress every `batchSize` tests. On resume, skip already-completed tests.

### Section 7: Output Formatter

```typescript
function generateOutput(results: TestResult[]): void {
  const passed = results.filter(r => r.status === 'PASS');
  const failed = results.filter(r => r.status === 'FAIL');
  const errored = results.filter(r => r.status === 'ERROR');

  // TIER 1: Summary (always generated)
  const summary = {
    total_expected: EXPECTED_TOTAL,
    total_run: results.length,
    total_passed: passed.length,
    total_failed: failed.length,
    total_errored: errored.length,
    complete: results.length === EXPECTED_TOTAL,  // INTEGRITY CHECK
    pass_rate: `${((passed.length / results.length) * 100).toFixed(1)}%`,
    timestamp: new Date().toISOString(),
  };

  // INTEGRITY FLAG
  if (!summary.complete) {
    summary.WARNING = `INCOMPLETE: Expected ${EXPECTED_TOTAL} tests but only ran ${results.length}`;
  }

  // TIER 2: Failure Clusters (group by outcome type and by failure reason)
  const failureClusters = groupFailures(failed);

  // TIER 3: Individual failures (full detail)
  const failureDetails = failed.map(f => ({
    id: f.id,
    input: f.input,
    expected: f.expected,
    actual: f.actual,
    diff: f.diff,
  }));

  // Write all tiers
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'results-summary.json'),
    JSON.stringify(summary, null, 2)
  );
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'results-clusters.json'),
    JSON.stringify(failureClusters, null, 2)
  );
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'results-full.json'),
    JSON.stringify({ summary, failureClusters, failureDetails, allResults: results }, null, 2)
  );

  // Human-readable markdown report
  generateMarkdownReport(summary, failureClusters, failureDetails);
}
```

### Section 8: Self-Test Mode

```typescript
function runSelfTest(): boolean {
  console.log('=== SELF-TEST MODE ===');
  console.log(`Running ${goldenCases.clusters.flatMap(c => c.cases).length} golden cases...`);

  let allPassed = true;

  for (const cluster of goldenCases.clusters) {
    console.log(`\nCluster: ${cluster.name}`);
    for (const gc of cluster.cases) {
      // Test the ORACLE (not the engine) against the golden case
      const oracleResult = getExpectedResult(
        createGameState(gc.input_state.bases, gc.input_state.outs, gc.input_state.inning),
        gc.outcome
      );
      const oracleMatch = deepEqual(oracleResult, gc.expected_output);

      // Test the ENGINE against the golden case
      let engineResult;
      try {
        engineResult = [engineFunction](
          createGameState(gc.input_state.bases, gc.input_state.outs, gc.input_state.inning),
          gc.outcome
        );
      } catch (e) {
        engineResult = { ERROR: e.message };
      }
      const engineMatch = deepEqual(engineResult, gc.expected_output);

      const oracleStatus = oracleMatch ? '✓' : '✗';
      const engineStatus = engineMatch ? '✓' : '✗';
      console.log(`  ${gc.id}: Oracle ${oracleStatus} | Engine ${engineStatus}`);

      if (!oracleMatch) {
        console.log(`    ORACLE MISMATCH on ${gc.id}:`);
        console.log(`    Expected: ${JSON.stringify(gc.expected_output)}`);
        console.log(`    Oracle:   ${JSON.stringify(oracleResult)}`);
        allPassed = false;
      }
      if (!engineMatch) {
        console.log(`    ENGINE MISMATCH on ${gc.id}:`);
        console.log(`    Expected: ${JSON.stringify(gc.expected_output)}`);
        console.log(`    Engine:   ${JSON.stringify(engineResult)}`);
        // Engine mismatches are EXPECTED (that's why we're testing)
        // But oracle mismatches are HARNESS BUGS
      }
    }
  }

  if (allPassed) {
    console.log('\n=== SELF-TEST PASSED: Oracle agrees with all golden cases ===');
    console.log('The test harness is safe to run on the full matrix.');
  } else {
    console.log('\n=== SELF-TEST FAILED: Oracle disagrees with golden cases ===');
    console.log('DO NOT run the full matrix. Fix the oracle first.');
    console.log('The oracle (Section 4) has bugs that would produce wrong pass/fail results.');
  }

  return allPassed;
}
```

### Section 9: Entry Point

```typescript
async function main() {
  // Create output directory
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });

  if (CONFIG.mode === 'self-test') {
    const passed = runSelfTest();
    process.exit(passed ? 0 : 1);
  }

  if (CONFIG.mode === 'full' || CONFIG.mode === 'resume') {
    // GATE: Run self-test first, always
    console.log('Running self-test before full matrix...');
    const selfTestPassed = runSelfTest();
    if (!selfTestPassed) {
      console.error('ABORTING: Self-test failed. Fix oracle before running full matrix.');
      process.exit(1);
    }

    // Load checkpoint if resuming
    const checkpoint = CONFIG.mode === 'resume' ? loadCheckpoint() : null;
    const startIndex = checkpoint?.lastCompletedIndex ?? 0;
    const existingResults = checkpoint?.results ?? [];

    console.log(`\n=== FULL MATRIX: ${EXPECTED_TOTAL} tests ===`);
    if (startIndex > 0) {
      console.log(`Resuming from test ${startIndex}`);
    }

    // Generate all test combinations
    const tests = [];
    let testIndex = 0;
    for (const inning of INNING_STATES) {
      for (const bases of BASE_STATES) {
        for (const outs of OUT_STATES) {
          for (const outcome of OUTCOMES) {
            if (testIndex >= startIndex) {
              tests.push({ bases, outs, inning, outcome, id: `T-${String(testIndex).padStart(4, '0')}` });
            }
            testIndex++;
          }
        }
      }
    }

    // Run tests with checkpointing
    const results = [...existingResults];
    for (let i = 0; i < tests.length; i++) {
      const t = tests[i];
      const result = runTest(t.bases, t.outs, t.inning, t.outcome, t.id);
      results.push(result);

      // Progress logging
      if ((i + 1) % CONFIG.batchSize === 0) {
        const total = startIndex + i + 1;
        const pct = ((total / EXPECTED_TOTAL) * 100).toFixed(1);
        console.log(`Progress: ${total}/${EXPECTED_TOTAL} (${pct}%)`);
        saveCheckpoint({ lastCompletedIndex: total, totalExpected: EXPECTED_TOTAL, results, timestamp: new Date().toISOString() });
      }
    }

    // Final output
    generateOutput(results);

    // FINAL INTEGRITY CHECK
    if (results.length !== EXPECTED_TOTAL) {
      console.error(`\n⚠️  INCOMPLETE: Ran ${results.length} of ${EXPECTED_TOTAL} expected tests`);
      process.exit(2);
    } else {
      console.log(`\n✓ COMPLETE: All ${EXPECTED_TOTAL} tests executed`);
    }
  }
}

main().catch(console.error);
```

## Build Instructions for Claude Code

When Claude Code uses this skill, it should:

1. **Read ENGINE_API_MAP.md** and extract:
   - Exact import paths
   - Exact function signatures
   - Exact type definitions
   - Exact testable dimension values

2. **Read golden-cases.json** and ensure the oracle (Section 4) produces matching results for every case

3. **Write the complete script** to `test-utils/run-logic-matrix.ts`

4. **Run self-test mode ONLY**: `npx tsx test-utils/run-logic-matrix.ts self-test`

5. **Report self-test results:**
   - If ALL golden cases pass → harness is ready
   - If ANY oracle mismatch → fix the oracle and re-run self-test
   - Do NOT run the full matrix in this session

6. **DO NOT run the full matrix.** That's the test-executor skill's job. The separation is intentional — it prevents "fix the test to make it pass" behavior.

## Script Quality Requirements

The script must be:
- **Readable**: No clever one-liners. Each function does one thing. Comments explain WHY, not WHAT.
- **Deterministic**: No randomness. Same input → same output, every time.
- **Self-contained**: No external test framework needed (no Jest, no Mocha). Just TypeScript + Node.
- **Auditable**: Every test logs both expected and actual, so a human can verify any individual result.

## Output

1. `test-utils/run-logic-matrix.ts` — the complete test harness
2. Self-test execution results (logged to console and saved to `test-utils/results/self-test-results.json`)

## Integrity Checks

Before declaring complete:

1. ✅ Script compiles (`npx tsx --check test-utils/run-logic-matrix.ts` or equivalent)
2. ✅ Self-test mode has been executed (not just written)
3. ✅ All golden cases produce oracle matches in self-test
4. ✅ EXPECTED_TOTAL is calculated and logged
5. ✅ The checkpoint system works (can resume)
6. ✅ Output format produces all three tiers
7. ✅ The script uses EXACT imports from ENGINE_API_MAP.md (not guessed paths)

## Anti-Hallucination Rules

- Do NOT claim self-test passed without running it
- Do NOT modify golden cases to match the oracle — fix the oracle to match the golden cases
- Do NOT run the full matrix in this session — that's a separate skill/session
- Do NOT simplify the oracle to "always return X" — it must implement actual baseball rules
- Do NOT skip the self-test gate — it's the only thing preventing a buggy harness from producing meaningless results
- If the engine's return type doesn't match what the oracle expects, document the mismatch and STOP
SKILLEOF6
echo "  ✓ test-harness-builder"

mkdir -p ".claude/skills/test-executor"
cat > ".claude/skills/test-executor/SKILL.md" << 'SKILLEOF7'
---
name: test-executor
description: Execute the full GameTracker logic test matrix and produce tiered results. Requires a validated test harness from test-harness-builder. This skill is intentionally simple — it runs a script and validates the output. The separation from the harness builder prevents "fix the test to make it pass" antipatterns. Trigger on "run test matrix", "execute tests", "run logic tests", or as Step 4 after the test harness self-test passes.
---

# Test Executor

## Purpose

Run the test harness. Validate the output. Produce a human-readable report. That's it.

This skill is deliberately minimal. The complexity lives in the harness (built by test-harness-builder). This skill just executes it and validates the results are complete and well-formed.

## Pre-Flight

1. Verify `test-utils/run-logic-matrix.ts` exists
2. Verify `test-utils/results/self-test-results.json` exists and shows ALL PASS
3. If self-test results don't exist or show failures → STOP. Run test-harness-builder first.
4. Run `npm run build` — must exit 0 (ensure no code changes broke things)

## Execution

### Step 1: Run the Matrix

```bash
npx tsx test-utils/run-logic-matrix.ts full
```

**Monitor the output.** The script logs progress every 100 tests. If it stalls for more than 30 seconds, something is wrong.

**If the script crashes mid-run:**
1. Check the error message
2. If it's a runtime error in the engine → document the crash state and outcome that caused it. This IS a test result (the engine crashes on that input).
3. If it's an import/module error → the harness has a bug. Do NOT fix it in this session. Report back to the user.
4. Try resuming: `npx tsx test-utils/run-logic-matrix.ts resume`

### Step 2: Validate Output

After the script completes, check:

```
REQUIRED OUTPUT FILES:
□ test-utils/results/results-summary.json
□ test-utils/results/results-clusters.json
□ test-utils/results/results-full.json
□ test-utils/results/logic-matrix-report.md
```

### Step 3: Integrity Validation

Read `results-summary.json` and verify:

```
INTEGRITY CHECKS:
1. total_run === total_expected
   → If NOT: Report as INCOMPLETE. Do not generate final report.

2. total_passed + total_failed + total_errored === total_run
   → If NOT: The harness has an accounting bug. Report to user.

3. complete === true
   → If false: The script flagged itself incomplete. Report to user.

4. No WARNING field present
   → If present: Read and report the warning.
```

**If any integrity check fails, do NOT proceed to generating the final report. Report the integrity failure to the user.**

### Step 4: Generate Human-Readable Report

If integrity checks pass, produce `spec-docs/LOGIC_MATRIX_REPORT.md`:

```markdown
# GameTracker Logic Matrix Test Report
Date: [date]
Harness version: [timestamp from self-test]
Engine API Map version: [timestamp from ENGINE_API_MAP.md]

## Executive Summary

- **Total tests**: [X]
- **Passed**: [Y] ([Y/X]%)
- **Failed**: [Z]
- **Errors**: [W] (engine crashed on these inputs)
- **Status**: [COMPLETE / INCOMPLETE]

## Failure Overview

### By Outcome Type
| Outcome | Tests | Passed | Failed | Error | Pass Rate |
|---------|-------|--------|--------|-------|-----------|
| single  | 96    | 90     | 6      | 0     | 93.8%     |
| ...     |       |        |        |       |           |

### By Base State
| Base State | Tests | Passed | Failed | Error | Pass Rate |
|------------|-------|--------|--------|-------|-----------|
| empty      | [X]   | ...    | ...    | ...   | ...       |
| ...        |       |        |        |       |           |

### By Out Count
| Outs | Tests | Passed | Failed | Error | Pass Rate |
|------|-------|--------|--------|-------|-----------|
| 0    | [X]   | ...    | ...    | ...   | ...       |
| 1    | ...   |        |        |       |           |
| 2    | ...   |        |        |       |           |

## Failure Clusters

[Group related failures together. Each cluster represents a probable single root cause.]

### Cluster 1: [Description — e.g., "Runner advancement on singles is wrong"]
**Affected tests**: [count]
**Pattern**: [What these failures have in common]
**Representative failure**:
  - Input: [state + outcome]
  - Expected: [what should happen]
  - Actual: [what did happen]
  - Diff: [specific fields that differ]

### Cluster 2: ...

## Error Cases (Engine Crashes)

[If any tests produced ERROR status, list them here. These represent inputs where the engine threw an exception.]

| Test ID | Input State | Outcome | Error Message |
|---------|-------------|---------|---------------|
| T-0042  | ...         | ...     | ...           |

## All Passing Outcomes

[Summary only — not individual results]
The following outcome types passed 100% of tests:
- [list]

## Raw Data Location

- Full results: test-utils/results/results-full.json
- Summary: test-utils/results/results-summary.json
- Failure clusters: test-utils/results/results-clusters.json
```

### Step 5: Update Project Docs

Append to `spec-docs/SESSION_LOG.md`:
```markdown
## Logic Matrix Test Execution — [date]
- Tests run: [total]
- Pass rate: [X]%
- Failures: [Y] across [Z] clusters
- Errors: [W]
- Report: spec-docs/LOGIC_MATRIX_REPORT.md
- Raw data: test-utils/results/
```

## What NOT to Do

- **Do NOT fix any bugs found.** This skill reports. The failure-analyzer skill diagnoses. The batch-fix-protocol skill fixes.
- **Do NOT modify the test harness.** If the harness has bugs, report them. Don't fix them here.
- **Do NOT modify the engine.** Same principle.
- **Do NOT re-run failed tests selectively.** The full matrix is the full matrix.
- **Do NOT declare "mostly passing" as success.** Report the exact numbers and let the user decide.

## Output

1. `spec-docs/LOGIC_MATRIX_REPORT.md` — human-readable report
2. `test-utils/results/` — raw JSON results (already produced by the harness)
3. Updated `spec-docs/SESSION_LOG.md`

## Anti-Hallucination Rules

- Do NOT claim the matrix completed without checking results-summary.json integrity
- Do NOT summarize results without reading the actual output files
- Do NOT skip the integrity validation step
- If the script produces no output files, the test FAILED, not "passed with no issues"
- Report exact numbers, not approximations
SKILLEOF7
echo "  ✓ test-executor"

mkdir -p ".claude/skills/failure-analyzer"
cat > ".claude/skills/failure-analyzer/SKILL.md" << 'SKILLEOF8'
---
name: failure-analyzer
description: Analyze GameTracker logic test failures to identify root causes, not just symptoms. Produces a dependency-aware bug report that shows which engine functions are broken, what other outcomes they affect, and the recommended fix order. Requires LOGIC_MATRIX_REPORT.md and results-full.json from test-executor. Trigger on "analyze failures", "diagnose test results", "what's broken", "root cause analysis", or as Step 5 after test execution completes.
---

# Failure Analyzer

## Purpose

Test execution tells you WHAT failed. This skill tells you WHY and WHAT TO FIX FIRST.

The key insight: most test failures share root causes. 200 failures might stem from 3 broken functions. This skill finds those 3 functions, maps their blast radius, and tells you the fix order that prevents regressions.

## Pre-Flight

1. Read `spec-docs/LOGIC_MATRIX_REPORT.md` — REQUIRED
2. Read `test-utils/results/results-full.json` — REQUIRED (raw failure data)
3. Read `spec-docs/ENGINE_API_MAP.md` — REQUIRED (function map for tracing)
4. Read `spec-docs/CURRENT_STATE.md` for known issues
5. Run `npm run build` — must exit 0

**If LOGIC_MATRIX_REPORT.md shows 0 failures → congratulate the user and STOP. Nothing to analyze.**

## Phase 1: Failure Clustering

Group failures by their **diff pattern**, not their input state.

```
CLUSTERING ALGORITHM:
1. Read all failures from results-full.json
2. For each failure, extract the "diff" object (fields where expected ≠ actual)
3. Create a signature from the diff fields: e.g., "bases:wrong,runsScored:wrong"
4. Group failures by signature
5. Within each signature group, further group by outcome type
6. Sort groups by size (largest group = most impactful root cause)
```

**Expected clusters:**
- "All GIDP outcomes have wrong out count" → one function handles DP outs
- "Runner on 2nd doesn't score on singles" → baserunning advancement function
- "Inning doesn't change after 3rd out" → inning transition function
- "Sac fly doesn't score run" → sac fly handler

**Output for each cluster:**
```markdown
### Cluster C-01: [Descriptive name]
**Failure signature**: [which fields are wrong]
**Affected outcome types**: [list]
**Affected base states**: [list]
**Total failures in cluster**: [count]
**Representative case**:
  Input: [state + outcome]
  Expected: [expected result]
  Actual: [actual result]
  Diff: [field-by-field comparison]
```

## Phase 2: Root Cause Tracing

For each cluster, trace backward from the wrong output to the responsible code.

```
TRACING PROTOCOL PER CLUSTER:

1. Identify the FIELD(S) that are wrong (e.g., bases, outs, runsScored)
2. Using ENGINE_API_MAP.md, find which function(s) SET that field
3. Read the function source code
4. Identify the logic branch that handles the failing outcome type
5. Find the specific line(s) where the logic diverges from expected behavior
6. Document: file, function, line number, what the code does vs what it should do

OUTPUT:
Root cause: [function name] in [file:line]
What it does: [actual behavior]
What it should do: [expected behavior per baseball rules / SMB4 mechanics]
Why it's wrong: [specific logic error — off-by-one, missing case, wrong condition, etc.]
```

### Tracing Techniques

**For wrong base states:**
- Find the runner advancement function
- Check if it handles the specific base configuration that failed
- Common bugs: hardcoded advancement that doesn't account for all 8 base states

**For wrong out counts:**
- Find the out-counting function
- Check if double plays add 2 outs (not 1)
- Check if sacrifice plays are counted differently

**For wrong run scoring:**
- Find the scoring function
- Check the force-out-on-3rd-out rule (runs don't count on force outs)
- Check if sac fly scoring is conditional on out count

**For wrong inning transitions:**
- Find the inning transition trigger
- Check if it fires at exactly 3 outs (not > 3)
- Check bottom-of-9th game-ending logic

## Phase 3: Dependency Graph

For each root cause function, map what ELSE it affects.

```
DEPENDENCY TEMPLATE:

Function: advanceRunners()
File: src/engines/gameEngine.ts:142
Called by:
  - processSingle() [line 87]
  - processDouble() [line 103]
  - processTriple() [line 119]
  - processWalk() [line 135]
  - processHBP() [line 141]
Affects outcomes: single, double, triple, walk, HBP
Affects fields: bases, runsScored

⚠️ FIXING THIS FUNCTION WILL CHANGE RESULTS FOR:
  - [X] single tests
  - [Y] double tests
  - [Z] walk tests
  - etc.

RETEST REQUIREMENT: After fixing advanceRunners(), re-run the FULL matrix
(not just the currently failing tests) because passing tests may regress.
```

## Phase 4: Fix Order Recommendation

Determine the optimal order to fix root causes.

```
FIX ORDER CRITERIA:
1. Fix shared functions FIRST (they affect the most tests)
2. Fix upstream functions before downstream (advanceRunners before processSingle)
3. Fix simple logic errors before structural issues
4. Fix functions with clear expected behavior before ambiguous ones

NEVER fix multiple root causes simultaneously — they may interact.
```

**Output:**
```markdown
## Recommended Fix Order

### Fix 1 (Highest Impact): advanceRunners()
- Cluster(s): C-01, C-03, C-07
- Tests affected: 847
- Fix type: Logic correction (wrong base advancement for occupied bases)
- Estimated complexity: Medium
- After fixing: Re-run full matrix. Expect C-01, C-03, C-07 to resolve.
  New failures may appear if previously-masked by this bug.

### Fix 2: handleDoublePlay()
- Cluster(s): C-02
- Tests affected: 192
- Fix type: Missing case (doesn't handle bases loaded DP)
- Estimated complexity: Low
- After fixing: Re-run full matrix. Expect C-02 to resolve.

### Fix 3: ...
```

## Phase 5: Ambiguity Report

Some failures may be ambiguous — the engine might be right and the oracle wrong, or the SMB4 rules might differ from standard baseball.

```
AMBIGUITY FLAGS:
For each root cause, assess:
1. Is the expected behavior clearly defined in SMB4_GAME_MECHANICS.md?
2. Is the expected behavior confirmed by a golden case?
3. Could the engine's behavior be intentional?

If ANY answer is "no" or "maybe" → flag for user decision.
```

**Output:**
```markdown
## Ambiguous Findings (Need User Decision)

### AMB-01: Does a single always score a runner from 2nd?
- Our oracle assumes: NO (conservative baserunning)
- Engine behavior: YES (scores from 2nd)
- Golden case GC-03 says: [whatever user confirmed]
- If engine is correct: 47 "failures" become passes
- User decision needed: Which baserunning model should the engine use?
```

## Output

Produce: `spec-docs/FAILURE_ANALYSIS_REPORT.md`

```markdown
# GameTracker Failure Analysis Report
Date: [date]
Source: LOGIC_MATRIX_REPORT.md ([date])
Total failures analyzed: [count]
Root causes identified: [count]
Ambiguous findings: [count]

## Summary
[2-3 sentences: how many failures, how many root causes, recommended approach]

## Failure Clusters
[Phase 1 output — each cluster with representative case]

## Root Causes
[Phase 2 output — each root cause with file:line, explanation]

## Dependency Graph
[Phase 3 output — which functions affect which outcomes]

## Recommended Fix Order
[Phase 4 output — ordered list with impact estimates]

## Ambiguous Findings
[Phase 5 output — items needing user decision]

## Re-Test Plan
After applying fixes, re-run the full logic matrix.
Expected changes:
- Cluster C-01: Should resolve (X tests)
- Cluster C-02: Should resolve (Y tests)
- New failures possible in: [outcomes affected by changed functions]
- Total re-test scope: FULL MATRIX (do not run partial)
```

Also update `spec-docs/SESSION_LOG.md` with analysis summary.

## What NOT to Do

- **Do NOT fix any code.** This skill analyzes. Use batch-fix-protocol for fixes.
- **Do NOT modify test results or the harness.**
- **Do NOT dismiss failures as "probably fine" — analyze every cluster.**
- **Do NOT assume the oracle is always right.** If the pattern suggests the engine is correct and the oracle is wrong, flag it as ambiguous.
- **Do NOT recommend fixing more than one root cause at a time.** Even in the report, make it clear: fix one, re-test, then fix the next.

## Anti-Hallucination Rules

- Do NOT claim a root cause without reading the actual source code at the identified file:line
- Do NOT count failures by hand — use the data from results-full.json
- Do NOT assume two clusters share a root cause unless you've traced both to the same function
- If you can't identify a root cause for a cluster, say so. "Unknown root cause — further investigation needed" is a valid finding.
- Do NOT skip the dependency graph. It's what prevents regressions during fixing.
- Read ENGINE_API_MAP.md for function relationships — do not guess the call graph
SKILLEOF8
echo "  ✓ failure-analyzer"

mkdir -p ".claude/skills/season-simulator"
cat > ".claude/skills/season-simulator/SKILL.md" << 'SKILLEOF9'
---
name: season-simulator
description: Programmatically simulate a full KBL Tracker season at the engine level, feeding synthetic game results into the stats/standings/WAR pipeline and verifying coherence after every game. Architecture adapts based on franchise-engine-discovery findings (pure Node vs Vitest+RTL vs Playwright). Tests accumulated state over 162 games that no manual testing can cover. Trigger on "simulate season", "test full season", "accumulated state test", "season integration test", or as Phase 3 of the franchise testing pipeline.
---

# Season Simulator

## Purpose

Some bugs only appear after 50+ games of accumulated data. Standings drift. Stats stop adding up. WAR calculations go haywire when the denominator gets large. This skill stress-tests the entire season lifecycle by simulating 162 games (or as many as the architecture supports) and checking coherence at every step.

## Pre-Flight

1. Read `spec-docs/FRANCHISE_API_MAP.md` — REQUIRED. Specifically:
   - Pipeline architecture classification (A/B/C/D)
   - Completed-game data contract (the TypeScript type)
   - Fan-out topology
2. Read `spec-docs/DATA_PIPELINE_TRACE_REPORT.md` — REQUIRED (know which pipelines work before simulating)
3. Read `spec-docs/ENGINE_API_MAP.md` — for GameTracker engine reference
4. Run `npm run build` — must exit 0

### Architecture Decision Gate

**Based on FRANCHISE_API_MAP.md pipeline classification:**

```
IF Pipeline Architecture = A (Clean Function Call):
  → Use Mode A: Pure Node Simulator
  → Can simulate 162 games in minutes
  → Highest confidence, fastest execution

IF Pipeline Architecture = B (Orchestrated but Extractable):
  → Use Mode B: Wrapper + Node Simulator
  → First build a thin wrapper function, then use Mode A
  → Adds 15-30 min of wrapper building, then same speed as Mode A

IF Pipeline Architecture = C (React Side-Effect Cascade):
  → Use Mode C: Vitest + React Testing Library
  → Mount components, trigger state changes, verify side effects
  → Slower — realistic target is 20-50 games
  → Still catches accumulated state bugs, just fewer games

IF Pipeline Architecture = D (Mixed):
  → Use Mode D: Hybrid
  → Pure Node for extractable pipelines
  → Vitest+RTL for React-coupled pipelines  
  → Run both, cross-reference results

IF Pipeline classification is unknown:
  → STOP. Run franchise-engine-discovery first.
```

**ONLY proceed with the mode matching the pipeline classification. Do not assume Mode A.**

### Preflight Proof

Before simulating a full season, verify the simulator can process ONE game:

```
PREFLIGHT PROOF:
1. Create 1 synthetic game result matching the completed-game data contract
2. Feed it into the game completion processor (using the appropriate mode)
3. Verify: did downstream state change? Did stats update? Did standings update?
4. If YES → simulator is viable. Proceed.
5. If NO → document why and STOP. The pipeline may need fixing first.
```

**Capture the real game output shape:** Before generating synthetic data, if possible, record ONE real game through the GameTracker and capture its output. Use that EXACT shape as the template for synthetic games. This prevents shape mismatches.

## Phase 1: Synthetic Game Generator

### Game Result Template

Based on the completed-game data contract from FRANCHISE_API_MAP.md:

```typescript
interface SyntheticGame {
  // Use the EXACT type from FRANCHISE_API_MAP.md
  // Do not invent fields
  // Fill every required field with realistic values
  // Include optional fields in some games, omit in others
}

function generateGame(
  gameNumber: number,
  homeTeam: TeamData,
  awayTeam: TeamData,
  options?: {
    forceHomeWin?: boolean;
    forceBlowout?: boolean;
    forceExtraInnings?: boolean;
    forceShutout?: boolean;
    forceNoHitter?: boolean;
  }
): SyntheticGame {
  // Generate realistic but deterministic game results
  // Use seeded random for reproducibility
  // Include: final score, player stats, inning-by-inning linescore
  // Player stats should be realistic (not 50 HR in one game)
}
```

### Team and Player Setup

```typescript
// Create a minimal but realistic league setup
const LEAGUE_SETUP = {
  teams: 8,  // Or whatever KBL Tracker uses — check spec docs
  playersPerTeam: 25,  // Check spec docs
  gamesPerSeason: 162, // Or whatever SMB4 uses — check spec docs
};

function generateLeague(): LeagueData {
  // Create teams with rosters
  // Each player has a name, position, and initial stats (all zeros)
  // Use deterministic generation (seeded, not random)
}
```

### Schema Validation

Every synthetic game MUST pass TypeScript type checking:

```typescript
function validateGameShape(game: SyntheticGame): boolean {
  // Verify every required field exists and has correct type
  // This uses the same type the real app uses
  // If validation fails, the synthetic data is wrong — fix the generator, not the app
}
```

## Phase 2: Simulation Execution

### Mode A/B: Pure Node Simulator

```typescript
async function simulateSeason() {
  const league = generateLeague();
  const results: CoherenceCheckResult[] = [];

  // Initialize season
  const seasonState = initializeSeason(league);  // Use actual engine function

  for (let gameNum = 1; gameNum <= TOTAL_GAMES; gameNum++) {
    // Generate this game's result
    const [homeTeam, awayTeam] = getMatchup(seasonState, gameNum);
    const game = generateGame(gameNum, homeTeam, awayTeam);

    // Validate shape
    if (!validateGameShape(game)) {
      console.error(`SHAPE VALIDATION FAILED for game ${gameNum}`);
      break;
    }

    // Process through the engine (using actual app function)
    processCompletedGame(game);  // Or whatever the entry point is

    // Run coherence checks after every game
    const check = runCoherenceChecks(seasonState, gameNum, game);
    results.push(check);

    // Checkpoint every 10 games
    if (gameNum % 10 === 0) {
      saveCheckpoint(gameNum, seasonState, results);
      console.log(`Game ${gameNum}/${TOTAL_GAMES} — ${check.passCount}/${check.totalChecks} checks passed`);
    }

    // STOP on critical failure
    if (check.hasCriticalFailure) {
      console.error(`CRITICAL FAILURE at game ${gameNum}. Stopping simulation.`);
      console.error(`Failure: ${check.criticalFailureDescription}`);
      break;
    }
  }

  generateReport(results);
}
```

### Mode C: Vitest + RTL Simulator

```typescript
// This runs as a Vitest test file
import { render } from '@testing-library/react';
import { act } from 'react';

describe('Season Simulation', () => {
  it('processes 50 games with coherence', async () => {
    // Mount the app's provider tree
    const { /* relevant queries */ } = render(
      <AppProviders>
        <SeasonContext>
          {/* Components that trigger side effects on game completion */}
        </SeasonContext>
      </AppProviders>
    );

    for (let gameNum = 1; gameNum <= 50; gameNum++) {
      const game = generateGame(gameNum, ...);

      // Trigger game completion through React state
      await act(async () => {
        // Set game state as if GameTracker just finished
        // This triggers the useEffect cascade
      });

      // Verify coherence
      // Read state from hooks/context/store
      // Compare against expected accumulated values
    }
  });
});
```

**NOTE:** Mode C is significantly more complex to write. The skill should write it BUT also flag that it may need manual adjustment based on the app's specific provider structure.

## Phase 3: Coherence Checks

Run AFTER EVERY GAME. These catch drift before it compounds.

```typescript
interface CoherenceCheckResult {
  gameNumber: number;
  totalChecks: number;
  passCount: number;
  failCount: number;
  hasCriticalFailure: boolean;
  criticalFailureDescription?: string;
  checks: IndividualCheck[];
}

function runCoherenceChecks(
  state: SeasonState,
  gameNumber: number,
  lastGame: SyntheticGame
): CoherenceCheckResult {
  const checks: IndividualCheck[] = [];

  // CHECK 1: Total games played across all teams = gameNumber * 2
  // (Each game has 2 teams)
  checks.push(checkTotalGamesPlayed(state, gameNumber));

  // CHECK 2: Total wins across all teams = total losses across all teams
  checks.push(checkWinsEqualLosses(state));

  // CHECK 3: Total runs scored across all teams = total runs allowed across all teams
  checks.push(checkRunsBalanced(state));

  // CHECK 4: Each team's record matches their game-by-game results
  checks.push(checkTeamRecordsConsistent(state));

  // CHECK 5: Player stats sum to team stats
  // (Sum of all players' hits = team's total hits for the season)
  checks.push(checkPlayerStatsSum(state));

  // CHECK 6: Batting stats are internally consistent
  // (H = 1B + 2B + 3B + HR, PA = AB + BB + HBP + SF + SH, etc.)
  for (const player of getAllPlayers(state)) {
    checks.push(checkBattingStatsConsistent(player));
  }

  // CHECK 7: Pitching stats are internally consistent
  // (W + L <= GS, ER <= R, etc.)
  for (const pitcher of getAllPitchers(state)) {
    checks.push(checkPitchingStatsConsistent(pitcher));
  }

  // CHECK 8: WAR calculations are current
  // (Recalculate WAR from raw stats and compare to stored WAR)
  checks.push(checkWARCurrent(state));

  // CHECK 9: Standings match win-loss records
  checks.push(checkStandingsMatchRecords(state));

  // CHECK 10: No NaN, Infinity, or undefined in any stat field
  checks.push(checkNoInvalidValues(state));

  // CHECK 11: Batting averages are between 0 and 1 (or .000 to 1.000)
  checks.push(checkStatsInValidRange(state));

  // CHECK 12: Last game's stats were properly added
  // (Compare player stats before and after this game)
  checks.push(checkLastGameStatsApplied(state, lastGame));

  return summarizeChecks(checks, gameNumber);
}
```

### Critical vs Non-Critical Failures

```
CRITICAL (stop simulation):
- Total games played is wrong (fundamental counting error)
- Wins ≠ losses across league (data corruption)
- NaN or Infinity in any calculation
- Player stats DECREASED after a game (negative stats added)

NON-CRITICAL (log and continue):
- WAR slightly different from recalculation (floating-point drift — expected after many games)
- Standings sort order wrong (cosmetic)
- Missing optional stat field (incomplete but not corrupt)
```

## Phase 4: Edge Case Games

After the main 162-game simulation, inject specific edge case games:

```
EDGE CASE SCENARIOS:
1. Blowout: 20-0 game (tests large stat accumulation)
2. Extra innings: 15-inning game (tests unusual game structure)
3. No-hitter: pitcher with 0 hits allowed (tests zero-stat display)
4. Player with 0 PA in game (bench player — tests division by zero in averages)
5. Trade mid-season: move player to different team (tests stat splitting)
6. Season game 163: tiebreaker (if applicable in SMB4)
7. All-Star break point: verify mid-season stats are correct
8. Final game: verify season totals are correct and complete
```

## Phase 5: Report Generation

### Checkpoint-Based Progress

```
CHECKPOINT FORMAT (saved every 10 games):
{
  "gameNumber": 50,
  "totalGames": 162,
  "checksRun": 600,
  "checksPassed": 598,
  "checksFailed": 2,
  "failures": [
    {
      "gameNumber": 37,
      "check": "WAR current",
      "expected": 2.34,
      "actual": 2.31,
      "severity": "NON-CRITICAL",
      "note": "Floating-point drift — 0.03 WAR after 37 games"
    }
  ],
  "timestamp": "..."
}
```

### Final Report

```markdown
# Season Simulation Report
Generated: [date]
Mode: [A/B/C/D]
Games simulated: [X] / [total target]
Status: [COMPLETE / STOPPED AT GAME N / INCOMPLETE]

## Simulation Summary
- Teams: [count]
- Players: [count]
- Games processed: [count]
- Coherence checks run: [count]
- Checks passed: [count] ([percentage]%)
- Checks failed: [count]
- Critical failures: [count]

## Coherence Over Time
[Table or chart showing check pass rate at games 10, 20, 30, ... 162]
[Does coherence degrade over time? If so, when does drift become significant?]

| Games Played | Checks Run | Passed | Failed | Pass Rate |
|-------------|-----------|--------|--------|-----------|
| 10          | 120       | 120    | 0      | 100%      |
| 20          | 240       | 239    | 1      | 99.6%     |
| ...         | ...       | ...    | ...    | ...       |

## Failures by Type
| Check | First Failed | Total Failures | Severity | Pattern |
|-------|-------------|---------------|----------|---------|
| WAR current | Game 37 | 12 | NON-CRITICAL | Drift increases linearly |
| Stats sum | Game 89 | 1 | CRITICAL | Player stats stopped accumulating |

## Critical Failure Details
[For each critical failure: game number, what happened, expected vs actual]

## Drift Analysis
[For non-critical failures that accumulate: is the drift linear? Exponential?
 Will it become user-visible by end of season?]

## Edge Case Results
[Results of the 8 edge case games from Phase 4]

## Data Integrity at Season End
- All batting stats internally consistent: [YES/NO]
- All pitching stats internally consistent: [YES/NO]
- Standings match records: [YES/NO]
- WAR values within tolerance: [YES/NO] (tolerance: ±[value])
- No invalid values (NaN, Infinity, undefined): [YES/NO]

## Recommendations
1. [Critical issues to fix before anything else]
2. [Drift issues that need long-term fixes]
3. [Edge cases that need handling]
```

## Output

1. `spec-docs/SEASON_SIMULATION_REPORT.md` — human-readable report
2. `test-utils/season-simulator.ts` — the executable simulator script
3. `test-utils/season-results/` — checkpoint files and raw data
4. Updated `spec-docs/SESSION_LOG.md`

## Resumability

The simulator checkpoints every 10 games. If interrupted:

```bash
# Resume from last checkpoint
npx tsx test-utils/season-simulator.ts resume
```

The checkpoint includes the full accumulated state, so no games need replaying.

## Integrity Checks

1. ✅ Pipeline classification from FRANCHISE_API_MAP.md determined the mode
2. ✅ Preflight proof passed (1 synthetic game processed successfully)
3. ✅ Synthetic game shape matches the real completed-game data contract
4. ✅ Coherence checks run after EVERY game (not just at the end)
5. ✅ Critical failures stop the simulation (don't run 162 games with corrupt data)
6. ✅ Checkpoint system works (can resume from interruption)
7. ✅ Games simulated count matches expected count (or stop reason is documented)
8. ✅ Edge case games were run

## Anti-Hallucination Rules

- Do NOT assume Mode A (pure Node) without evidence from FRANCHISE_API_MAP.md
- Do NOT generate synthetic game data that doesn't match the EXACT completed-game data contract type
- Do NOT skip coherence checks to "save time" — they're the whole point
- Do NOT continue simulation past a critical failure — stop and report
- Do NOT claim 162 games were simulated if the simulation stopped early — report exact count
- If the preflight proof fails, STOP. Do not try to "work around" a broken pipeline.
- Do NOT use real player names or team data from outside the app — generate deterministic test data
- If Mode C (Vitest+RTL) is needed, acknowledge the complexity and flag that the test file may need manual adjustment for the app's specific provider tree
SKILLEOF9
echo "  ✓ season-simulator"

mkdir -p ".claude/skills/user-journey-verifier"
cat > ".claude/skills/user-journey-verifier/SKILL.md" << 'SKILLEOF10'
---
name: user-journey-verifier
description: Define and execute representative user journeys through KBL Tracker's franchise/season UI using Playwright. Writes self-contained test scripts (not interactive clicking). Two modes — seeded (clean state) and organic (simulator output). 5-10 journeys covering critical workflows from season start to completion. Trigger on "test user journeys", "UI integration test", "end-to-end test", "verify user flows", or as Phase 4 of the franchise testing pipeline.
---

# User Journey Verifier

## Purpose

Logic tests verify the engine. Pipeline traces verify the plumbing. This skill verifies the EXPERIENCE — can a user actually do the things the app promises? It catches bugs that only manifest when a real browser renders real components with real data.

**This skill writes Playwright test scripts. Claude Code does NOT click through the app interactively.** The scripts are self-contained and can be run independently via `npx playwright test`.

## Pre-Flight

1. Read `spec-docs/FRANCHISE_BUTTON_AUDIT.md` — know which buttons are WIRED vs DEAD
2. Read `spec-docs/DATA_PIPELINE_TRACE_REPORT.md` — know which pipelines are INTACT vs BROKEN
3. Read `spec-docs/SEASON_SIMULATION_REPORT.md` — if available, use for organic mode
4. Read `spec-docs/CURRENT_STATE.md`
5. Verify Playwright is installed: `npx playwright --version`
   - If not installed: `npm install -D @playwright/test && npx playwright install chromium`
6. Verify dev server starts: `npm run dev`
7. Run `npm run build` — must exit 0

### Preflight Proof

```
PREFLIGHT PROOF:
1. Start dev server
2. Launch Playwright against localhost
3. Navigate to the app's home page
4. Read ONE element from the page (e.g., app title)
5. If successful → Playwright works. Proceed.
6. If failed → document the error and STOP.
```

### Known Broken Paths

**Before writing journeys, filter out known-broken paths:**
- If button audit says a button is DEAD → don't include that button in a journey
- If pipeline trace says a pipeline is BROKEN → note it but still include the journey (the journey will document the failure from the user's perspective)
- Journeys that depend on BROKEN pipelines should be marked as "EXPECTED TO FAIL — pipeline PL-XX is broken"

## Journey Definitions

Define 5-10 journeys. Each journey covers a critical user workflow.

### Journey Selection Criteria

```
PRIORITIZE journeys that:
1. Touch Tier A (data-mutating) buttons
2. Cross multiple pages (test navigation + data persistence)
3. Verify data created on one page appears correctly on another
4. Cover the complete lifecycle of a feature (start → use → complete)
5. Exercise the most common user workflows

SKIP journeys that:
1. Only test Tier C (UI chrome) interactions
2. Duplicate coverage from logic/pipeline tests
3. Require features that are known UNIMPLEMENTED
```

### Journey Template

```
JOURNEY J-01: [Name — e.g., "Start and Play First Game of Season"]

GOAL: What the user is trying to accomplish
PREREQUISITES: What state the app must be in before starting
SEED STATE: [description of programmatic state setup]

STEPS:
1. Navigate to [page]
   ASSERT: [what should be visible]
2. Click [button/link]
   ASSERT: [what should happen — page change, modal, data update]
3. Fill [form/input] with [value]
   ASSERT: [validation, preview, etc.]
4. Click [submit/confirm]
   ASSERT: [success state — data persisted, navigation occurred]
5. Navigate to [different page]
   ASSERT: [data from steps 1-4 is correctly displayed here]

FINAL ASSERTION: [the overall outcome that proves the journey succeeded]

EXPECTED FAILURES: [if any steps are known-broken from audit/trace, list them]
```

### Recommended Journeys

**Adapt these based on what the button audit and pipeline trace revealed actually exists:**

```
J-01: Season Initialization
  Start a new season → configure teams → verify initial standings are all 0-0
  Tests: season creation pipeline, standings initialization

J-02: Record First Game and Verify Stats
  Navigate to GameTracker → start a game → record a few at-bats → end game
  → Navigate to stats page → verify player stats reflect the game
  Tests: GameTracker → stats pipeline, cross-page data persistence

J-03: Mid-Season Stats Verification  
  Seed: 40 games played (via simulator output or programmatic setup)
  Navigate to standings → verify standings match game results
  Navigate to stats leaders → verify leader board shows correct players
  Navigate to player detail → verify individual stats are correct
  Tests: accumulated state display, sorting, filtering

J-04: Roster Management
  Navigate to roster page → attempt to add/remove/move a player
  Verify roster changes persist → verify changes appear in lineup
  Tests: roster management pipeline, data persistence

J-05: WAR Leaderboard Verification
  Seed: 81 games played
  Navigate to WAR leaderboard → verify WAR values are displayed
  Check: are values reasonable for half-season? (not 0, not 50)
  Navigate to player detail → verify WAR breakdown matches
  Tests: WAR calculation pipeline, display accuracy

J-06: Season Completion
  Seed: 161 games played
  Record final game → verify season marked as complete
  Verify final standings → verify playoff seeding (if applicable)
  Tests: season completion logic, end-of-season state

J-07: Navigation Integrity
  Visit every non-GameTracker page via direct navigation
  Verify: no crashes, no blank pages, no loading spinners that never resolve
  Tests: routing, lazy loading, error boundaries

J-08: Error Handling
  Try invalid actions: start season without teams, record game without lineup
  Verify: appropriate error messages, no crashes, no data corruption
  Tests: validation, error states, defensive coding

J-09: Data Persistence Across Sessions
  Record a game → close the app → reopen → verify data persists
  Tests: storage layer, data loading on startup

J-10: Edge Case Display
  Seed: player with 0 AB (show .000 not NaN), player with extreme stats
  Verify: stat displays handle edge cases without visual glitches
  Tests: display formatting, edge case handling
```

## State Seeding

### Why Seeding Is Necessary

Journeys J-03 through J-06 require a specific starting state (e.g., "40 games played"). Getting to that state through the UI would take hours. State seeding gets there in seconds.

### Seeding Architecture

```typescript
// test-utils/seed-state.ts

import { /* storage/engine functions from FRANCHISE_API_MAP.md */ } from '...';

interface SeedConfig {
  gamesPlayed: number;
  teams: number;
  playersPerTeam: number;
  // Additional configuration
}

async function seedState(config: SeedConfig): Promise<void> {
  // 1. Initialize a league (using actual engine functions)
  // 2. Generate N synthetic games (same generator as season-simulator)
  // 3. Process each game through the completion pipeline
  // 4. Verify coherence after seeding (same checks as simulator)
  // 5. State is now "as if" N games were played through the UI
}

// Pre-built seed configurations for each journey
export const SEEDS = {
  'J-03': { gamesPlayed: 40, teams: 8, playersPerTeam: 25 },
  'J-05': { gamesPlayed: 81, teams: 8, playersPerTeam: 25 },
  'J-06': { gamesPlayed: 161, teams: 8, playersPerTeam: 25 },
};
```

**IMPORTANT:** The seed script uses the SAME game generator and processor as the season-simulator. If the simulator's preflight proof passed, seeding will work. If the simulator hasn't been run yet, run its preflight proof first.

### If Seeding Isn't Possible

If the pipeline is React-coupled (Mode C/D) and seeding requires mounted components:

**Fallback approach:** Test only journeys that don't require pre-existing state:
- J-01 (season init — starts from scratch)
- J-02 (first game — only needs an initialized season)
- J-07 (navigation — no state dependency)
- J-08 (error handling — no state dependency)

Mark J-03 through J-06 and J-09 through J-10 as "REQUIRES SEEDING — deferred until pipeline is extractable."

## Playwright Script Structure

Each journey is a separate Playwright test file:

```typescript
// tests/journeys/j01-season-init.spec.ts
import { test, expect } from '@playwright/test';
// import { seedState, SEEDS } from '../../test-utils/seed-state';

test.describe('J-01: Season Initialization', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173');
    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('can start a new season with teams', async ({ page }) => {
    // Step 1: Navigate to season setup
    await page.click('[data-testid="start-season"]'); // or whatever selector
    await expect(page.locator('[data-testid="season-setup"]')).toBeVisible();

    // Step 2: Configure teams
    // ... click through team setup

    // Step 3: Verify initial state
    await page.click('[data-testid="standings-link"]');
    
    // STATE ASSERTION (not just visual):
    const standingsData = await page.evaluate(() => {
      // Read from the app's state management
      // This accesses the same data the component reads
      return window.__APP_STATE__?.standings; // or however state is exposed
    });
    
    expect(standingsData).toBeDefined();
    expect(standingsData.length).toBeGreaterThan(0);
    expect(standingsData.every(t => t.wins === 0 && t.losses === 0)).toBe(true);

    // VISUAL ASSERTION (bonus):
    await expect(page.locator('.standings-table')).toContainText('0-0');
  });
});
```

### State Assertions vs Visual Assertions

**Always use state assertions as the PRIMARY check:**
```typescript
// PRIMARY: Read component state/props via page.evaluate()
const playerStats = await page.evaluate(() => {
  // Access React component state, Zustand store, or context
  // This tests the DATA, not just what's rendered
  return document.querySelector('[data-component="stats-table"]')?.__reactFiber
    // ... or use a more reliable state access pattern
});
expect(playerStats.battingAvg).toBeCloseTo(0.285, 2);
```

**Use visual assertions as SECONDARY checks:**
```typescript
// SECONDARY: Verify the rendering
await expect(page.locator('.batting-avg')).toContainText('.285');
```

**Why:** Visual assertions are fragile (CSS changes, formatting differences). State assertions test the actual data. If state is correct but visual is wrong, that's a rendering bug. If state is wrong, the logic is broken.

### Accessing App State from Playwright

The test scripts need to read app state. Options (skill should detect which is available):

```typescript
// Option 1: Exposed dev tools (if app has __APP_STATE__ or similar)
const state = await page.evaluate(() => window.__APP_STATE__);

// Option 2: React DevTools fiber tree
const state = await page.evaluate(() => {
  const root = document.getElementById('root');
  const fiber = root?._reactRootContainer?._internalRoot?.current;
  // Navigate fiber tree to find relevant state
});

// Option 3: Zustand store (if used)
const state = await page.evaluate(() => {
  return window.__ZUSTAND_STORE__?.getState();
});

// Option 4: localStorage/IndexedDB (if data is persisted)
const state = await page.evaluate(() => {
  return JSON.parse(localStorage.getItem('kbl-tracker-state') || '{}');
});

// Option 5: DOM-only (fallback — least reliable)
const statsText = await page.locator('.stats-table').innerText();
```

**The skill should determine which option works during preflight proof and use that consistently across all journeys.**

## Dual-Mode Execution

### Mode 1: Seeded (Clean State)

```bash
# Run with clean seeded state
npx playwright test tests/journeys/ --project=seeded
```

- State is programmatically set before each test
- Deterministic — same results every run
- Catches wiring bugs and logic errors
- Fast to run

### Mode 2: Organic (Simulator Output)

```bash
# Run against state accumulated by season-simulator
npx playwright test tests/journeys/ --project=organic
```

- State comes from the season simulator's output (real accumulated data)
- Tests whether the UI handles real messy accumulated data
- May expose bugs that clean data doesn't trigger
- Requires season simulator to have run first

**If organic mode fails where seeded mode passes:** The bug is in data handling under accumulation, not in basic logic. Route to season-simulator findings for diagnosis.

## Output

### Per-Journey Results

```markdown
# Journey Test Results
Generated: [date]
Mode: [seeded / organic / both]

## Summary
| Journey | Steps | Passed | Failed | Skipped | Status |
|---------|-------|--------|--------|---------|--------|
| J-01    | 5     | 5      | 0      | 0       | ✅ PASS |
| J-02    | 8     | 7      | 1      | 0       | ❌ FAIL |
| J-03    | 6     | 0      | 0      | 6       | ⏸ SKIPPED (needs seeding) |
| ...     | ...   | ...    | ...    | ...     | ...     |

## Failures

### J-02 Step 6: Verify player stats on stats page
**Expected:** Player batting average displayed as .285
**Actual:** Stats page shows ".000" for all players
**State assertion:** playerStats.battingAvg = 0.285 (CORRECT in state)
**Visual assertion:** '.batting-avg' contains ".000" (WRONG in display)
**Diagnosis:** Data is correct in state but not rendered. Likely a component 
  not reading from the updated store. See pipeline PL-01 Junction 5 in 
  DATA_PIPELINE_TRACE_REPORT.md.
**Screenshot:** [path to screenshot]

### ...
```

### File Outputs

1. `spec-docs/JOURNEY_TEST_REPORT.md` — human-readable report
2. `tests/journeys/*.spec.ts` — Playwright test scripts (reusable)
3. `test-utils/seed-state.ts` — state seeding script (reusable)
4. `tests/journeys/screenshots/` — failure screenshots
5. Updated `spec-docs/SESSION_LOG.md`

## Scope Boundaries

**DO test:**
- Cross-page data persistence (create on page A, verify on page B)
- Navigation between all non-GameTracker routes
- Error states and validation
- Data display accuracy (state matches visual)

**Do NOT test (covered by other skills):**
- GameTracker at-bat logic (gametracker-logic-tester)
- Calculation accuracy (calculation matrix tests)
- Pipeline integrity (data-pipeline-tracer)
- Accumulated state coherence (season-simulator)

**The journey verifier is the TOP of the testing pyramid.** It catches UX-level bugs that lower layers miss, but it's not meant to be exhaustive. 5-10 well-chosen journeys are more valuable than 50 superficial ones.

## Integrity Checks

1. ✅ Preflight proof passed (Playwright can access the app)
2. ✅ Each journey has explicit assertions (not just "click and hope")
3. ✅ State assertions are PRIMARY, visual assertions are SECONDARY
4. ✅ Known-broken paths from audit/trace are marked as EXPECTED FAILURES
5. ✅ Seeding script works (if applicable) — verified by running 1 seed
6. ✅ All test scripts compile and can be run via `npx playwright test`
7. ✅ Screenshots are captured on failure

## Anti-Hallucination Rules

- Do NOT claim a journey passed without running the Playwright test
- Do NOT write tests that only check visual text — always include state assertions
- Do NOT skip the state seeding preflight — if seeding doesn't work, journeys J-03+ can't run
- Do NOT interactively click through the app — write scripts that run independently
- Do NOT include journeys for features that the button audit marked as DEAD or UNIMPLEMENTED
- If Playwright can't access app state (all 5 options fail), fall back to DOM-based assertions and note the reduced confidence in the report
- Do NOT run more than 10 journeys — focus on quality and coverage, not quantity
SKILLEOF10
echo "  ✓ user-journey-verifier"

cat > "spec-docs/COMPLETE_TESTING_PIPELINE_GUIDE.md" << 'GUIDEEOF0'
# KBL Tracker Complete Testing Pipeline — Orchestration Guide

## Overview

This guide orchestrates **15 skills** across **4 tiers** to achieve comprehensive testing of the entire KBL Tracker app. It's organized by priority so you can stop at any point and still have actionable findings.

**You don't need to run everything.** Each tier delivers standalone value. Start from the top.

---

## Tier 0: Truth Establishment (Foundation — Run First)

Before testing anything, establish what "correct" means. Without this, the testing pipeline produces unreliable results because it tests against stale or contradictory specs.

**The multiplier effect:** Tier 0 makes Tiers 1-3 ~10× more efficient by eliminating false positives and ambiguity in test results.

### Lean Approach (Recommended)

Don't spec the entire codebase upfront. Spec just what you need, just in time.

```
Step 0.1: Architecture Scan (run once)
  Skill: codebase-reverse-engineer (Mode A)
  Prompt: "Use the codebase-reverse-engineer skill in Mode A. 
           Scan the full architecture."
  Time: 45-60 min + 15 min review
  Output: ARCHITECTURE.md, CANONICAL_TYPES.md, FEATURE_INVENTORY.md, SPEC_TRIAGE.md
  Gate: confirm feature boundaries (~5 min, just scan the list)

Step 0.2: Deep Spec for Active Feature (run per-feature, on-demand)
  Skill: codebase-reverse-engineer (Mode B)
  Prompt: "Use the codebase-reverse-engineer skill in Mode B 
           for the [GameTracker / WAR calculations / etc.] feature."
  Time: 30-45 min + 15 min review per feature
  Output: spec-docs/canonical/features/[feature].md
  Gate: review discrepancies table, upgrade key sections from 🔴 to 🟢

  Run this for EACH feature you're about to test in Tiers 1-3.
  Recommended order:
    1. GameTracker (before GameTracker testing pipeline)
    2. Stats/Standings (before franchise pipeline)
    3. WAR Calculations (before calculation matrices)
    4. Season Management (before season simulator)
```

**After Tier 0, you have:**
- A verified architecture map
- Canonical type definitions (the data contract for everything)
- Feature inventory with confirmed boundaries
- Deep specs for your active development areas
- Clear list of discrepancies to investigate
- Your existing 100+ spec docs triaged (keep, archive, or replace)

**Total time:** ~2 hours for architecture scan + 1 feature deep spec.
Each additional feature: ~1 hour. Do them just-in-time, not all at once.

---

## Tier 1: Discovery & Static Analysis (Day 1, ~3 hours including review)

These skills give you the highest return on investment. Run these first regardless of what else you do.

```
Step 1.1: Engine Discovery (GameTracker)
  Skill: engine-discovery
  Prompt: "Use the engine-discovery skill. Map the GameTracker engine API."
  Time: 15-30 min + 5 min review
  Output: ENGINE_API_MAP.md, proof-of-life.ts
  Gate: proof-of-life passes

Step 1.2: Franchise Engine Discovery (run parallel with 1.1 if possible)
  Skill: franchise-engine-discovery  
  Prompt: "Use the franchise-engine-discovery skill. Map all non-GameTracker engines."
  Time: 20-40 min + 10 min review
  Output: FRANCHISE_API_MAP.md, franchise-proof-of-life.ts
  Gate: proof-of-life passes, pipeline architecture classified (A/B/C/D)
  
  *** DECISION POINT ***
  After this step, you know whether the season simulator can use Mode A (fast)
  or needs Mode C (slow). This affects all of Phase 3.

Step 1.3: Franchise Button Audit
  Skill: franchise-button-audit
  Prompt: "Use the franchise-button-audit skill. Audit all non-GameTracker pages."
  Time: 30-45 min + 10 min review
  Output: FRANCHISE_BUTTON_AUDIT.md, button-audit-data.json
  Gate: reconciliation integrity check passes
```

**After Tier 1, you have:**
- A complete map of every engine, function, and type in the app
- Knowledge of which buttons work, which are dead, and which are fake
- The pipeline architecture classification that determines testing strategy
- Actionable findings you can fix immediately (dead buttons, orphaned handlers)

---

## Tier 2: Should-Run (Day 2, ~3-4 hours including review)

These skills test logic correctness and data flow integrity.

```
Step 2.1: Golden Cases for GameTracker
  Skill: golden-case-generator
  Prompt: "Use the golden-case-generator skill."
  Time: 20-30 min + 20 min review (most important review)
  Output: golden-cases.json, GOLDEN_CASES_REVIEW.md
  Gate: you confirm all 30 cases

Step 2.2: Test Harness for GameTracker
  Skill: test-harness-builder
  Prompt: "Use the test-harness-builder skill. Run self-test only."
  Time: 30-45 min + 10 min review
  Output: run-logic-matrix.ts, self-test results
  Gate: self-test all golden cases pass

Step 2.3: Execute GameTracker Logic Matrix
  Skill: test-executor
  Prompt: "Use the test-executor skill. Run the full matrix."
  (Or just run: npx tsx test-utils/run-logic-matrix.ts full)
  Time: 5-15 min (script runtime)
  Output: LOGIC_MATRIX_REPORT.md, results-full.json
  Gate: none (automated)

Step 2.4: Data Pipeline Tracer (run parallel with 2.1-2.3 if possible)
  Skill: data-pipeline-tracer
  Prompt: "Use the data-pipeline-tracer skill."
  Time: 30-45 min + 15 min review
  Output: DATA_PIPELINE_TRACE_REPORT.md, pipeline-trace-data.json
  Gate: you review broken pipelines

Step 2.5: Failure Analysis (if GameTracker matrix had failures)
  Skill: failure-analyzer
  Prompt: "Use the failure-analyzer skill."
  Time: 20-30 min + 15 min review
  Output: FAILURE_ANALYSIS_REPORT.md
  Gate: you review fix order before applying fixes
```

**After Tier 2, you have:**
- Complete logic test results for every GameTracker state transition
- A map of every data pipeline with pass/fail at each junction
- Root cause analysis for logic failures
- A prioritized fix list

---

## Tier 3: Run When Ready (Day 3+, ~3-4 hours)

These skills test accumulated state and end-to-end experience.

```
Step 3.1: Season Simulator
  Skill: season-simulator
  Prompt: "Use the season-simulator skill."
  Time: 45-90 min (depending on mode A vs C) + 15 min review
  Output: SEASON_SIMULATION_REPORT.md, season-results/
  Gate: you review coherence failures

Step 3.2: User Journey Verifier
  Skill: user-journey-verifier
  Prompt: "Use the user-journey-verifier skill."
  Time: 45-60 min + 20 min review
  Output: JOURNEY_TEST_REPORT.md, Playwright test scripts
  Gate: you review journey failures

Step 3.3: Calculation Matrices (WAR, Salary, Mojo)
  Run golden-case-generator + test-harness-builder + test-executor pattern
  for each calculation engine. Use boundary-value analysis, not exhaustive sweep.
  Time: ~1 hour per engine
  Can run in parallel across multiple Claude Code sessions
```

**After Tier 3, you have:**
- Proof that the app handles 162 games of accumulated data without corruption
- End-to-end verification of critical user workflows
- Verified calculation accuracy for WAR, salary, and other engines
- Comprehensive documentation of everything that works and doesn't work

---

## Fix & Retest Cycle

After any tier, apply fixes and retest:

```
1. Review findings from completed tier
2. Prioritize fixes (use failure-analyzer output or your judgment)
3. Apply fixes using batch-fix-protocol skill (one at a time for critical fixes)
4. Re-run affected tests:
   - GameTracker logic fix → re-run logic matrix (Step 2.3)
   - Pipeline fix → re-run pipeline tracer on affected pipeline
   - Engine fix → re-run that engine's calculation matrix
   - If engine SIGNATURES changed → re-run engine-discovery first
5. Repeat until pass rate is acceptable
```

**Rule: Never fix and test in the same Claude Code session.** Separate sessions prevent "fix the test to make it pass" behavior.

---

## Parallelization Guide

If you have multiple Claude Code terminals:

```
CAN RUN IN PARALLEL:
- engine-discovery + franchise-engine-discovery (different targets)
- franchise-button-audit + GameTracker golden cases (different domains)
- data-pipeline-tracer + GameTracker test harness building (independent)
- Multiple calculation matrix tests (BWAR + PWAR + salary, etc.)

MUST RUN SEQUENTIALLY:
- engine-discovery → golden-case-generator → test-harness-builder → test-executor
- franchise-engine-discovery → season-simulator
- franchise-button-audit → data-pipeline-tracer
- test-executor → failure-analyzer
- Any fix → re-test
```

---

## Complete File Inventory

After the full pipeline (all tiers), these files should exist:

```
spec-docs/
├── canonical/                             (Tier 0: Truth Establishment)
│   ├── ARCHITECTURE.md                    (Skill: codebase-reverse-engineer Mode A)
│   ├── CANONICAL_TYPES.md                 (Skill: codebase-reverse-engineer Mode A)
│   ├── FEATURE_INVENTORY.md               (Skill: codebase-reverse-engineer Mode A)
│   └── features/                          (Skill: codebase-reverse-engineer Mode B)
│       ├── game-tracker.md                (generated on-demand)
│       ├── war-calculations.md            (generated on-demand)
│       ├── season-management.md           (generated on-demand)
│       └── [other features as needed]
│
├── SPEC_TRIAGE.md                         (Skill: codebase-reverse-engineer Mode A)
├── ENGINE_API_MAP.md                      (Skill: engine-discovery)
├── FRANCHISE_API_MAP.md                   (Skill: franchise-engine-discovery)
├── GOLDEN_CASES_REVIEW.md                 (Skill: golden-case-generator)
├── FRANCHISE_BUTTON_AUDIT.md              (Skill: franchise-button-audit)
├── DATA_PIPELINE_TRACE_REPORT.md          (Skill: data-pipeline-tracer)
├── LOGIC_MATRIX_REPORT.md                 (Skill: test-executor)
├── FAILURE_ANALYSIS_REPORT.md             (Skill: failure-analyzer)
├── SEASON_SIMULATION_REPORT.md            (Skill: season-simulator)
├── JOURNEY_TEST_REPORT.md                 (Skill: user-journey-verifier)
├── SESSION_LOG.md                         (updated by all skills)
└── CURRENT_STATE.md                       (updated after fixes)

test-utils/
├── proof-of-life.ts                       (Skill: engine-discovery)
├── franchise-proof-of-life.ts             (Skill: franchise-engine-discovery)
├── golden-cases.json                      (Skill: golden-case-generator)
├── run-logic-matrix.ts                    (Skill: test-harness-builder)
├── button-audit-data.json                 (Skill: franchise-button-audit)
├── pipeline-trace-data.json               (Skill: data-pipeline-tracer)
├── season-simulator.ts                    (Skill: season-simulator)
├── seed-state.ts                          (Skill: user-journey-verifier)
└── results/
    ├── self-test-results.json             (Skill: test-harness-builder)
    ├── results-summary.json               (Skill: test-executor)
    ├── results-clusters.json              (Skill: test-executor)
    ├── results-full.json                  (Skill: test-executor)
    └── checkpoint.json                    (Skill: test-executor, if interrupted)

test-utils/season-results/                 (Skill: season-simulator)
├── checkpoint-*.json
└── final-state.json

tests/journeys/                            (Skill: user-journey-verifier)
├── j01-season-init.spec.ts
├── j02-first-game.spec.ts
├── ...
└── screenshots/
```

---

## Troubleshooting

### "Engine is React-coupled" (Discovery finds no clean entry point)
**Affects:** Season simulator, state seeding, direct logic testing
**Options:**
1. Extract pure logic from hooks into separate files (best — improves architecture)
2. Use Vitest + React Testing Library (medium — works but slower)
3. Test through Playwright only (worst — limited coverage)
**Recommendation:** Invest the time in option 1. It pays dividends across all testing.

### "Button audit reconciliation has large discrepancy"
**Cause:** Dynamically rendered elements missed by top-down scan
**Fix:** Search for `.map()` calls generating interactive elements, conditional renders, and lazy-loaded components. Re-run the bottom-up scan to find unmatched handlers.

### "Pipeline tracer finds broken junctions"
**Cause:** Data gets lost or corrupted between two specific points
**Fix:** This IS the finding. Use batch-fix-protocol to fix the specific junction. Re-trace after fixing.

### "Season simulator's preflight proof fails"
**Cause:** Completed-game data contract doesn't match what the engine expects
**Fix:** Check if the synthetic game shape exactly matches the real game output type from FRANCHISE_API_MAP.md. Common issues: missing required fields, wrong field names, wrong nested structure.

### "Playwright can't access app state"
**Cause:** No global state exposure, React fiber tree inaccessible
**Fix:** Add a dev-mode state exposure (e.g., `window.__DEV_STATE__ = store.getState()` behind a dev flag). This is safe because it only runs in development/test. Fall back to DOM-based assertions if state access isn't possible.

### "Too many failures to process"
**Cause:** Fundamental issues in the engine (>50% failure rate)
**Fix:** Focus on the LARGEST failure cluster. One root cause fix often resolves hundreds of test failures. Fix one cluster, re-run the full matrix, then reassess.

### "Skills pick up stale data after fixes"
**Cause:** ENGINE_API_MAP.md or golden cases reflect pre-fix code
**Fix:** After any fix that changes function signatures, types, or behavior:
1. Re-run engine-discovery (5 min)
2. Re-verify golden cases still hold (5 min)
3. Re-run the test matrix

---

## Success Criteria

### After Tier 0 (Truth Established):
- ✅ Architecture mapped with confirmed feature boundaries
- ✅ Canonical types extracted from code
- ✅ Existing spec docs triaged
- ✅ Deep specs generated for active features
- ✅ Key discrepancies reviewed and annotated (🟢 or 🐛)

### Minimum Viable Confidence (after Tiers 0 + 1 + 2):
- ✅ Everything above, plus:
- ✅ All engines mapped with proof-of-life
- ✅ All buttons audited with reconciliation
- ✅ GameTracker logic matrix: >95% pass rate
- ✅ All high-priority pipelines traced
- ✅ Root causes identified for all failures
- ✅ Test results reference 🟢 VERIFIED spec sections

### Full Confidence (after all Tiers):
- ✅ Everything above, plus:
- ✅ 162-game season simulated without critical failures
- ✅ All 5-10 user journeys pass in seeded mode
- ✅ WAR/salary/mojo calculations verified at boundary values
- ✅ No NaN, Infinity, or undefined in any stat display
- ✅ Cross-page data persistence verified

### Ongoing Confidence (maintenance):
- Re-run Mode B (feature deep spec) when feature code changes significantly
- Re-run logic matrix after any GameTracker changes
- Re-run affected pipeline traces after any data flow changes
- Re-run season simulator after any stats/standings engine changes
- Re-run journeys after any UI changes
- All of these are fast because the harnesses and specs already exist

## Canonical Spec Integration

All testing skills should read from `spec-docs/canonical/` when available:

| Testing Skill | Reads From Canonical Spec |
|---|---|
| golden-case-generator | Section 2 (Functions & Logic) for formulas |
| test-harness-builder | Section 2 for oracle rules |
| failure-analyzer | Section 6 (Discrepancies) + Section 8 (Edge Cases) |
| franchise-button-audit | Section 3 (Behaviors) for expected interactions |
| data-pipeline-tracer | Section 7 (Dependencies) for data flows |
| season-simulator | Section 4 (State Management) for side effects |

If a spec section is 🔴 UNREVIEWED, testing skills should note this in their output:
"⚠️ Results based on UNREVIEWED canonical spec. Verify spec before trusting findings."
GUIDEEOF0
echo "  ✓ COMPLETE_TESTING_PIPELINE_GUIDE.md"

cat > "spec-docs/TESTING_PIPELINE_GUIDE.md" << 'GUIDEEOF1'
# GameTracker Testing Pipeline — Orchestration Guide

## Overview

This document describes how to run the full GameTracker logic testing pipeline using 5 chained skills. Each skill is a separate Claude Code session with defined inputs, outputs, and gates.

**Total pipeline time:** ~2-3 hours (including ~50 min of your review time)
**Claude Code sessions:** 5 (each independent, context-loss-safe)
**Goal:** 100% coverage of game state transitions with documented results

## Pipeline Architecture

```
┌──────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│  Skill 1:        │     │  Skill 2:            │     │  Skill 3:            │
│  engine-discovery │────▶│  golden-case-gen     │────▶│  test-harness-builder│
│                  │     │                      │     │                      │
│  Output:         │     │  Output:             │     │  Output:             │
│  ENGINE_API_MAP  │     │  golden-cases.json   │     │  run-logic-matrix.ts │
│  proof-of-life   │     │  REVIEW.md           │     │  self-test results   │
└──────────────────┘     └──────────────────────┘     └──────────────────────┘
        │                         │                            │
    [5 min gate]            [20 min gate]                [10 min gate]
                                                               │
                                                               ▼
                          ┌──────────────────────┐     ┌──────────────────────┐
                          │  Skill 5:            │     │  Skill 4:            │
                          │  failure-analyzer    │◀────│  test-executor       │
                          │                      │     │                      │
                          │  Output:             │     │  Output:             │
                          │  FAILURE_ANALYSIS    │     │  LOGIC_MATRIX_REPORT │
                          │  _REPORT.md          │     │  results-full.json   │
                          └──────────────────────┘     └──────────────────────┘
                                  │                            │
                             [15 min gate]               [no gate — auto]
                                  │
                                  ▼
                          ┌──────────────────────┐
                          │  Existing Skill:     │
                          │  batch-fix-protocol  │
                          │  (apply fixes)       │
                          └──────────────────────┘
```

## Step-by-Step Execution

### Step 1: Engine Discovery

**Claude Code prompt:**
```
Use the engine-discovery skill. Map the GameTracker engine API surface, 
produce ENGINE_API_MAP.md and a proof-of-life script, then run the 
proof-of-life script.
```

**Expected duration:** 15-30 minutes
**Your review:** ~5 minutes

**What to check:**
- Does ENGINE_API_MAP.md list functions you recognize?
- Did proof-of-life pass?
- Are the testable dimensions (outcomes, base states) complete?

**Kill conditions:**
- Proof-of-life fails → engine needs extraction/refactoring before testing
- Functions not found → codebase structure is different than expected

**If it fails:** The skill will document what's wrong. You may need to:
- Extract game logic from React components into pure functions
- Create a shim layer that mocks React dependencies
- This is one-time work that unlocks the entire pipeline

---

### Step 2: Golden Case Generation

**Claude Code prompt:**
```
Use the golden-case-generator skill. Read ENGINE_API_MAP.md and 
produce 30 golden test cases for my review. Cluster them by category 
with reasoning for each case.
```

**Expected duration:** 20-30 minutes
**Your review:** ~20 minutes (this is the most important review)

**What to check:**
- Open `spec-docs/GOLDEN_CASES_REVIEW.md`
- Review each cluster (~3 min each, 8 clusters)
- For ⚠️ NEEDS CONFIRMATION cases: decide the baserunning model
- Mark each cluster ✅ or ❌

**Kill conditions:**
- Cases use wrong field names (mismatch with ENGINE_API_MAP.md)
- Outcome types don't match what the engine actually accepts
- Coverage matrix has gaps

**After review:** Tell Claude Code which cases to revise, or confirm all clusters.

---

### Step 3: Test Harness Building

**Claude Code prompt:**
```
Use the test-harness-builder skill. Read ENGINE_API_MAP.md and 
the confirmed golden-cases.json. Build the test harness and run 
self-test mode. Do NOT run the full matrix.
```

**Expected duration:** 30-45 minutes
**Your review:** ~10 minutes (skim the script structure)

**What to check:**
- Self-test results: do all 30 golden cases show oracle match?
- Script structure: does it use the right imports?
- EXPECTED_TOTAL count: does it match your mental math?

**Kill conditions:**
- Self-test fails (oracle disagrees with golden cases) → fix oracle, re-run self-test
- Script won't compile → import paths wrong, revisit ENGINE_API_MAP.md
- EXPECTED_TOTAL is 0 or unreasonably small → dimensions not enumerated correctly

---

### Step 4: Test Execution

**Claude Code prompt:**
```
Use the test-executor skill. Run the full logic matrix. 
Do not fix anything — just run and report.
```

**OR, run it yourself without Claude Code:**
```bash
npx tsx test-utils/run-logic-matrix.ts full
```

**Expected duration:** 5-15 minutes (script runtime)
**Your review:** No gate needed — results are in files

**What to check (automated):**
- `results-summary.json` → `complete: true`
- `total_run === total_expected`
- No WARNING field

**If incomplete:** Use `npx tsx test-utils/run-logic-matrix.ts resume` to continue from checkpoint.

---

### Step 5: Failure Analysis

**Claude Code prompt:**
```
Use the failure-analyzer skill. Read the test results and 
ENGINE_API_MAP.md. Produce a root cause analysis with 
dependency graph and fix order recommendation.
```

**Expected duration:** 20-30 minutes
**Your review:** ~15 minutes

**What to check:**
- Do the root causes make sense?
- Is the fix order logical?
- Are ambiguous findings flagged (not assumed)?

**After review:** Use the batch-fix-protocol skill to apply fixes one at a time, re-running the full matrix after each fix.

---

## File Inventory

After the full pipeline, these files should exist:

```
spec-docs/
├── ENGINE_API_MAP.md              (Skill 1)
├── GOLDEN_CASES_REVIEW.md         (Skill 2)
├── LOGIC_MATRIX_REPORT.md         (Skill 4)
├── FAILURE_ANALYSIS_REPORT.md     (Skill 5)
└── SESSION_LOG.md                 (updated by Skills 4, 5)

test-utils/
├── proof-of-life.ts               (Skill 1)
├── golden-cases.json              (Skill 2)
├── run-logic-matrix.ts            (Skill 3)
└── results/
    ├── self-test-results.json     (Skill 3)
    ├── checkpoint.json            (Skill 4, if interrupted)
    ├── results-summary.json       (Skill 4)
    ├── results-clusters.json      (Skill 4)
    └── results-full.json          (Skill 4)
```

## Troubleshooting

### "Engine is React-coupled" (Skill 1 fails proof-of-life)
The game logic is tangled with React hooks/context. Options:
1. Extract pure logic functions from hooks into separate files
2. Create mock providers for testing
3. Use Vitest with React testing utilities instead of raw Node

### "Self-test fails" (Skill 3 oracle disagrees with golden cases)
The test harness's baseball rules engine has bugs. Options:
1. Re-read the golden case reasoning — is the golden case actually correct?
2. Check SMB4_GAME_MECHANICS.md — does SMB4 differ from standard baseball here?
3. Fix the oracle's rule implementation, not the golden case

### "Script crashes mid-matrix" (Skill 4)
The engine throws on a specific input. This IS a finding — the engine has a crash bug.
1. Note which input caused the crash
2. Resume from checkpoint
3. The crash will appear in the report as an ERROR-status test

### "Too many failures to analyze" (Skill 5)
If >50% of tests fail, the engine likely has fundamental issues.
1. Focus on the largest failure cluster first
2. Fix that one root cause
3. Re-run the matrix — many other failures may resolve
4. Repeat until failure count is manageable

### "Oracle and engine disagree, but I'm not sure who's right"
This is what the ambiguity report is for.
1. Check if a golden case covers this scenario
2. If not, manually play the scenario in SMB4 and note the real behavior
3. Update the oracle OR the engine based on SMB4's actual behavior

## Iteration Cycle

After the first pipeline run:

```
1. Review FAILURE_ANALYSIS_REPORT.md
2. Fix root cause #1 using batch-fix-protocol
3. Re-run full matrix (Skill 4)
4. If new failures appear → run failure-analyzer again (Skill 5)
5. Fix root cause #2
6. Repeat until pass rate is acceptable
```

Each fix-and-retest cycle takes ~20-30 minutes. Budget 3-5 cycles for a typical codebase.
GUIDEEOF1
echo "  ✓ TESTING_PIPELINE_GUIDE.md"

echo ""
echo "============================================================"
echo "Installation complete!"
echo ""
echo "Installed:"
echo "  11 skills in .claude/skills/"
echo "  2 guides in spec-docs/"
echo ""
echo "To verify in Claude Code, run:  /skills"
echo ""
echo "To start the pipeline:"
echo "  Use the codebase-reverse-engineer skill in Mode A."
echo "============================================================"
