# Baseball State Machine Audit

> **GOSPEL ANNOTATION (2026-02-21):** Flow model (state transition sequences) is **superseded by KBL_UNIFIED_ARCHITECTURE_SPEC.md §3** (event-driven 1-tap paradigm). Baseball rule tables, legal state definitions, and outcome validation logic remain **valid and authoritative**.

## Philosophy
The KBL XHD Tracker should function like a chess engine - every move must be legal, every outcome must be accounted for, and impossible states must be prevented.

## Phase 1: Map All Legal Transitions

### Result Types and Their Effects on Runners

#### Walks/HBP (BB, IBB, HBP)
- **Batter**: Goes to 1B
- **Force Chain**: Batter → R1 → R2 → R3 (only if each base behind is occupied)
- **R1**: MUST advance to 2B (forced)
- **R2**: MUST advance to 3B only if R1 exists (forced by chain)
- **R3**: MUST score only if bases loaded (forced by chain)
- **Non-forced runners**: Can HOLD

**Legal Outcomes:**
| Runner | Forced? | Legal Outcomes |
|--------|---------|----------------|
| R1 | Always | TO_2B, TO_3B*, SCORED*, OUT_2B, OUT_3B, OUT_HOME |
| R2 | If R1 | TO_3B, SCORED*, HELD (if not forced), OUT_3B, OUT_HOME |
| R3 | If loaded | SCORED, HELD (if not forced), OUT_HOME |

*Requires extra event inference (SB, WP, PB, E)

#### Single (1B)
- **Batter**: Goes to 1B
- **R1**: MUST advance to at least 2B (forced)
- **R2**: Can advance to 3B or score, or HOLD
- **R3**: Almost always scores, can HOLD

**Legal Outcomes:**
| Runner | Forced? | Legal Outcomes |
|--------|---------|----------------|
| R1 | Yes | TO_2B, TO_3B, SCORED*, OUT_2B, OUT_3B, OUT_HOME |
| R2 | No | TO_3B, SCORED, HELD, OUT_3B, OUT_HOME |
| R3 | No | SCORED, HELD, OUT_HOME |

*R1 scoring on a single is rare - likely requires error (infer E)

#### Double (2B)
- **Batter**: Goes to 2B
- **R1**: MUST advance to at least 3B (batter takes 2B)
- **R2**: MUST advance (batter takes 2B)
- **R3**: Almost always scores

**Legal Outcomes:**
| Runner | Forced? | Legal Outcomes |
|--------|---------|----------------|
| R1 | Yes | TO_3B, SCORED, OUT_3B, OUT_HOME |
| R2 | Yes | TO_3B, SCORED, OUT_3B, OUT_HOME |
| R3 | No | SCORED, HELD (rare), OUT_HOME |

#### Triple (3B)
- **Batter**: Goes to 3B
- **All runners**: MUST score (batter takes 3B)

**Legal Outcomes:**
| Runner | Forced? | Legal Outcomes |
|--------|---------|----------------|
| R1 | Yes | SCORED, OUT_HOME |
| R2 | Yes | SCORED, OUT_HOME |
| R3 | Yes | SCORED, OUT_HOME |

#### Home Run (HR)
- **All runners + batter**: Score automatically
- **No user input needed for runners**

#### Outs (K, KL, GO, FO, LO, PO)
- **Batter**: Out
- **No force plays** (batter doesn't reach)
- **All runners**: Can HOLD or advance at their own risk

**Legal Outcomes:**
| Runner | Forced? | Legal Outcomes |
|--------|---------|----------------|
| R1 | No | HELD, TO_2B, TO_3B, SCORED, OUT_2B, OUT_3B, OUT_HOME |
| R2 | No | HELD, TO_3B, SCORED, OUT_3B, OUT_HOME |
| R3 | No | HELD, SCORED (tag up on fly), OUT_HOME |

**Default**: HELD (runners typically don't advance on outs)

#### Strikeout (K, KL)
- **Batter**: Out (or reaches on D3K with 2 outs and 1B empty)
- **Runners**: Almost always HOLD
- **Exception**: Passed ball or wild pitch on K can allow advancement

**Default**: HELD for all runners

#### Double Play (DP)
- **Batter**: Out
- **R1**: OUT (typical 6-4-3 or 4-6-3)
- **Other runners**: Can advance on the play

**Legal Outcomes:**
| Runner | Forced? | Legal Outcomes |
|--------|---------|----------------|
| R1 | N/A | OUT_2B (standard), HELD (unusual), TO_2B, TO_3B, SCORED |
| R2 | No | HELD, TO_3B, SCORED, OUT_3B, OUT_HOME |
| R3 | No | HELD, SCORED, OUT_HOME |

#### Sacrifice Fly (SF)
- **Batter**: Out
- **R3**: Typically SCORES (that's what makes it a SF)
- **Other runners**: Can advance on tag-up

**Legal Outcomes:**
| Runner | Forced? | Legal Outcomes |
|--------|---------|----------------|
| R1 | No | HELD, TO_2B, OUT_2B |
| R2 | No | HELD, TO_3B, OUT_3B |
| R3 | No | SCORED (expected), HELD, OUT_HOME |

#### Sacrifice Bunt (SAC)
- **Batter**: Out
- **Runners**: Typically advance one base

**Legal Outcomes:**
| Runner | Forced? | Legal Outcomes |
|--------|---------|----------------|
| R1 | No | TO_2B (expected), OUT_2B, HELD |
| R2 | No | TO_3B (expected), OUT_3B, HELD |
| R3 | No | SCORED, HELD, OUT_HOME |

#### Fielder's Choice (FC)
- **Batter**: Reaches 1B (defense chose to get another runner)
- **R1**: Force play, typically OUT

**Legal Outcomes:**
| Runner | Forced? | Legal Outcomes |
|--------|---------|----------------|
| R1 | Yes | OUT_2B (typical), TO_2B, TO_3B, SCORED |
| R2 | No | OUT_3B, TO_3B, SCORED, HELD |
| R3 | No | OUT_HOME, SCORED, HELD |

#### Error (E)
- **Batter**: Reaches base (1B, 2B, or 3B depending on error)
- **Runners**: Can advance beyond normal

**Legal Outcomes:**
| Runner | Forced? | Legal Outcomes |
|--------|---------|----------------|
| R1 | Varies | HELD, TO_2B, TO_3B, SCORED, OUT_2B, OUT_3B, OUT_HOME |
| R2 | Varies | HELD, TO_3B, SCORED, OUT_3B, OUT_HOME |
| R3 | No | HELD, SCORED, OUT_HOME |

---

## Phase 2: Impossible/Improbable Transitions

### IMPOSSIBLE (Must Block)
1. ❌ R1 HELD on walk/HBP (always forced)
2. ❌ R2 HELD on walk with R1 on base (forced by chain)
3. ❌ R3 HELD on bases-loaded walk (forced by chain)
4. ❌ R1 TO_2B on double (must go to 3B minimum)
5. ❌ R1 HELD on double (must vacate for batter)
6. ❌ Any runner HELD on triple (must vacate for batter)
7. ❌ R1 HELD on single (must vacate for batter)

### IMPROBABLE (Require Inference)
1. ⚠️ R1 → 3B on walk → Requires SB, WP, PB, or E
2. ⚠️ R1 → HOME on walk → Requires extra event
3. ⚠️ R2 → HOME on walk (not forced) → Requires extra event
4. ⚠️ R1 → HOME on single → Likely requires E
5. ⚠️ Any runner advances 2+ bases on walk → Requires extra event

---

## Phase 3: Inference Rules

### Extra Event Types
| Code | Event | Description |
|------|-------|-------------|
| SB | Stolen Base | Runner advances on own during pitch/play |
| WP | Wild Pitch | Pitcher throws ball catcher can't handle |
| PB | Passed Ball | Catcher fails to catch catchable pitch |
| E | Error | Fielder misplays allowing extra advancement |

> **Note:** BALK is not in SMB4 and has been removed from this list.

### When to Prompt for Extra Event
```
IF (result IN [BB, IBB, HBP]) AND (runner advances > 1 base beyond forced position):
  PROMPT for extra event

IF (result = 1B) AND (R1 scores):
  PROMPT for extra event (likely E)

IF (result IN [K, KL]) AND (any runner advances):
  PROMPT for extra event (WP, PB, or SB)
```

### Clearing Extra Events
When user changes a runner's outcome:
1. Clear any pending extra event prompt for that runner
2. Remove any recorded extra events for that runner
3. Re-evaluate if new selection requires extra event

---

## Phase 4: Default Outcomes

### Auto-Default Rules by Result Type

| Result | R1 Default | R2 Default | R3 Default |
|--------|------------|------------|------------|
| BB/IBB/HBP | TO_2B | TO_3B (if forced) / HELD | SCORED (if forced) / HELD |
| 1B | TO_2B | TO_3B | SCORED |
| 2B | SCORED | SCORED | SCORED |
| 3B | SCORED | SCORED | SCORED |
| HR | (auto) | (auto) | (auto) |
| K/KL | HELD | HELD | HELD |
| GO | HELD | HELD | HELD |
| FO | HELD | HELD | SCORED (if < 2 outs, tag up) |
| LO | HELD | HELD | HELD |
| PO | HELD | HELD | HELD |
| DP | OUT_2B | HELD | HELD |
| SF | HELD | HELD | SCORED |
| SAC | TO_2B | TO_3B | HELD |
| FC | OUT_2B | HELD | HELD |
| E | TO_2B | TO_3B | SCORED |

---

## Implementation Checklist

### Bug Fixes Required
- [x] Prevent HELD option for forced runners
- [x] Fix extra events stacking infinitely on selection change
- [x] Add default outcomes for K/KL and other outs
- [x] Clear extra events when runner outcome changes

### State Machine Validation
- [x] Validate all outcomes against legal transitions table
- [x] Block impossible transitions in UI (via getRunnerOptions)
- [x] Prompt for extra events on improbable transitions
- [x] Auto-default to most common outcomes (via useEffect on mount)

---

## Test Results

**30 tests passed, 0 failed** ✅

Run tests with: `node testStateMachine.mjs`

### Tests Covered:
1. Walk with R2 only - R2 defaults to HELD
2. Walk with R1+R2 - Both forced, advance 1 base
3. FO with R3 (< 2 outs) - R3 scores, auto-converts to SF
4. Strikeout with R1+R2 - All default to HELD
5. Double with R2 - R2 defaults to SCORED
6. Walk with R1 - R1→3B requires extra event
7. Walk with R3 only (not forced) - R3 HELD
8. Bases loaded walk - All advance, R3 scores
9. FO with R3 and 2 outs - R3 HELD (no tag-up)
10. Single with bases loaded - Standard advancement
11. Triple with R1+R2 - All score
12. DP with R1 - R1 out at 2B
13. SAC with R1 - R1 to 2B
14. FC with R1 - R1 out at 2B
15. GO with R1+R2 - All HELD
16. Walk with R2+R3 (no R1) - Neither forced, both HELD
17. Walk with R1+R3 (no R2) - R1 forced, R3 not forced
18. Double with R1 only - R1 to 3B (not just 2B)
19. Double with R1+R2+R3 - R1 to 3B, R2+R3 score
20. HBP same as walk - R1 forced to 2B
21. IBB same as walk - bases loaded forces R3 score
22. Error with R1+R2 - both advance one base
23. SF with R1+R3 - R3 scores, R1 holds
24. SAC with R1+R2 - both advance one base
25. Line out with runners - all HELD
26. Pop out with runners - all HELD
27. K with advancement requires extra event
28. DP with R1+R2 - R1 out, R2 holds
29. FC with R1+R2 - R1 out, R2 holds
30. Single with R1 scoring requires extra event (error)

---

## Implementation Log

### Session 1 Fixes
1. **Force play logic** - `isRunnerForced()` correctly identifies forced runners
2. **Minimum advancement** - `getMinimumAdvancement()` returns correct minimum base
3. **Runner options filtering** - `getRunnerOptions()` hides HELD for forced runners
4. **Extra event detection** - `isExtraAdvancement()` flags non-standard advances

### Session 2 Fixes (Continuation)
1. **Extra events stacking** - Fixed by clearing events when selection changes
2. **Auto-defaults on mount** - Added `useEffect` to set defaults via `handleRunnerOutcomeChange`
3. **FO→SF auto-conversion** - Fixed by running auto-correction on mount defaults
4. **R2 default on walk** - Fixed: non-forced R2 defaults to HELD
5. **Double outcomes** - Fixed: R2 defaults to SCORED (not TO_3B) on doubles
6. **Strikeout inference** - Added: any runner advancement on K requires extra event
7. **Non-forced R3 on walk** - Added: R3 scoring when not forced requires inference

### Key Functions
- `isRunnerForced(base)` - Determines if runner is forced to advance
- `getMinimumAdvancement(base)` - Returns minimum destination for forced runner
- `getDefaultOutcome(base)` - Returns expected/standard outcome
- `getRunnerOptions(base)` - Returns legal outcome options for UI
- `isExtraAdvancement(base, outcome)` - Checks if outcome needs extra event
- `checkAutoCorrection(outcomes)` - Handles FO→SF conversion

---

*Document created as part of Baseball State Machine Audit*
*Last updated: Session 2 continuation*
