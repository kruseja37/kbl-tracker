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
