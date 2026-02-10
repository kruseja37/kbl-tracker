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
