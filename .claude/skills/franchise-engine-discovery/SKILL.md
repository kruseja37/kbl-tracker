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
