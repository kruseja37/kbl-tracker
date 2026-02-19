# KBL TRACKER — AUDIT PLAN (REVISED)
# Revised: 2026-02-18 | Owner: Claude + JK
# Supersedes: original AUDIT_PLAN.md (2026-02-17)
# Status: ACTIVE

---

## The Principle

Know everything knowable from code before touching the browser.
The sequence is non-negotiable:

1. **Complete the PATTERN_MAP** — all 24 rows closed, no UNKNOWNs remaining
2. **Fix everything findable in code** — all wiring gaps, broken connections, and
   architectural violations provable by grep/build/logic
3. **Browser verification** — surfaces only what is genuinely unknowable without
   a human: visual bugs, real-interaction state issues, timing problems, UX gaps

You cannot trust browser results if the code underneath is broken.
You cannot know what to fix until you have the complete code-level picture.
Do it in order. No exceptions.

---

## Core Principle: Evidence Over Assertion

Nothing is marked "working" based on reading code alone. Every claim requires:
- A grep/build result, OR
- A test output, OR
- A manual browser verification performed by JK (Phase 3 only)

If we cannot verify it → status is UNVERIFIED, not CONFIRMED.

---

## Phase 1: Complete the Pattern Map

**Goal:** Close all 22 remaining UNKNOWN rows in PATTERN_MAP.md.
Every subsystem gets a Follows Pattern verdict: Y / N / PARTIAL.
Every verdict gets a FINDING number as evidence.

**What's already closed (5 rows):**
| Row | Subsystem | Follows Pattern | Finding |
|-----|-----------|-----------------|---------|
| 4 | WAR — positional | N | FINDING-103 |
| 11b | Leverage Index | N | FINDING-099 |
| 12 | Clutch Attribution | PARTIAL | FINDING-098 |
| 13 | Fan Morale | N (BROKEN) | FINDING-101 |
| 21 | Trait System | PARTIAL | FINDING-104 |

**Remaining 22 rows — audit order:**

Priority group A — spine-critical (must work for everything else to work):
| Row | Subsystem | OOTP Pattern to verify against |
|-----|-----------|-------------------------------|
| 1 | GameTracker / Game State | Atomic event recorder; feeds stat pipeline on completion |
| 2 | Stats Aggregation | Synchronous post-game accumulator; updates season totals immediately |
| 3 | Franchise / Season Engine | Root aggregate; all queries scoped franchiseId → yearId → data |
| 6 | Schedule System | 162-game grid; completion event fires stat pipeline |
| 20 | Career Stats | SUM of PlayerSeasonStats by playerId; no separate table |

Priority group B — downstream systems (depend on spine):
| Row | Subsystem | OOTP Pattern to verify against |
|-----|-----------|-------------------------------|
| 4b | WAR — mWAR | Manager decision tracker; persists decisions, resolves outcomes |
| 5 | Fame / Milestone | Career total threshold checker; fires narrative triggers |
| 7 | Offseason | Atomic phase sequence; locks stats then opens next season |
| 8 | Playoffs | Separate stat tables; bracket seeded from standings |
| 11 | Mojo / Fitness | Per-player fatigue/condition; persists between games, feeds dev calc |
| 16 | Salary System | Contract entity; service time drives eligibility categories |
| 17 | League Builder | World config; generates league/team/player entities at creation |
| 18 | Museum / HOF | Career threshold evaluator; runs post-retirement, eligibility gated |
| 19 | Aging / Ratings | Season-close rating mutation; age-curve driven |

Priority group C — orphaned/partial/unknown systems:
| Row | Subsystem | OOTP Pattern to verify against |
|-----|-----------|-------------------------------|
| 9 | Relationships | Personality inputs to morale, development rate, narrative triggers |
| 10 | Narrative / Headlines | Side-effect consumer of stat pipeline; never writes back |
| 14 | Farm System | Affiliate roster; development level determines growth rate |
| 15 | Trade System | Transaction log entry; immediate roster state change |
| 22 | Player Dev Engine | 10-factor growth model at season close |
| 23 | Record Book | Persistent single-season + career records; checked after every game |
| 24 | UI Pages | Consumers only; read from stat stores, never write |

**For each row, the audit steps are:**
1. Read the relevant section in OOTP_ARCHITECTURE_RESEARCH.md
2. Open the key KBL file(s)
3. Ask: does the code follow the OOTP structural pattern?
4. Log FINDING with verdict (Y / N / PARTIAL) and evidence
5. Update PATTERN_MAP.md "Follows Pattern" column + finding number

**Exit criteria:**
- All 24 rows in PATTERN_MAP.md have a non-UNKNOWN "Follows Pattern" value
- Every verdict has a FINDING number as evidence
- AUDIT_LOG.md index updated for all new findings

---

## Phase 2: Fix Everything Findable in Code

**Goal:** Resolve every finding that can be fixed without browser verification.
This means: wiring gaps, broken method names, disconnected systems, missing imports,
architectural violations — anything provable by grep/build/logic.

**Process:**
1. Build the fix queue from all FINDINGS (001–104 + Phase 1 output)
2. Triage each finding: fixable in code? Needs browser to verify? Needs JK decision?
3. Sequence fixes in dependency order (spine first, downstream second)
4. Route each fix per routing rules (PROMPT_CONTRACTS.md template required)
5. After every fix: `npm run build` passes + relevant tests pass + expected output
   matches actual output
6. Document completion in AUDIT_LOG.md + PROMPT_CONTRACTS.md

**Fix triage categories:**
- **FIX-CODE:** Fixable in code, no browser needed (wiring, method names, missing calls)
- **FIX-DECISION:** Needs JK to decide before fixing (e.g., FIERY/GRITTY chemistry types)
- **FIX-BROWSER:** Can't confirm fix without browser (visual, interaction, timing)
- **DEFER:** Known gap, not blocking, document and move on

**Known FIX-CODE items entering Phase 2 (from existing findings):**
- FINDING-099: LI dual-value — replace 6 getBaseOutLI with calculateLeverageIndex
- FINDING-101 Bug A: Fan morale method rename (2 lines, contract written)
- FINDING-101 Bug B: Hardcoded season/game numbers in fan morale call
- FINDING-102 Step 6: Wire standings update into post-game pipeline
- FINDING-103: Wire warOrchestrator into processCompletedGame.ts
- FINDING-104a: Wire traitPools.ts into player creation dropdown
- FINDING-104b: Write trait changes back to player record after awards ceremony
- FINDING-098: Wire clutch trigger from at-bat outcome
(Phase 1 audit will add more items to this list)

**Exit criteria:**
- All FIX-CODE items executed, verified by build + tests
- All FIX-DECISION items have a logged JK decision (fix or explicit defer)
- All FIX-BROWSER items documented and queued for Phase 3
- CURRENT_STATE.md updated with post-fix status of every finding

---

## Phase 3: Browser Verification

**Goal:** Surface everything genuinely unknowable without a human in the browser.
At this point the code is as correct as it can be without manual testing.

**Process:**
1. JK performs each scenario in the browser
2. Pass/Fail logged in AUDIT_LOG.md with date and exact behavior observed
3. New bugs found → new FINDING, queued for code fix
4. After any new code fixes: return to Phase 3 and re-verify affected scenarios

**Scenario categories (to be finalized at Phase 3 start):**
- Game flow: start → play → end → new game (state clear, no bleed-through)
- Franchise wiring: roster flows into GameTracker, results flow back to standings
- Post-game: summary data correct (stats, errors, box score)
- Offseason phases: all 11 transitions, persistence verified
- Awards ceremony: trait assignments persist to player record
- Stats: season stats accumulate correctly across multiple games
- WAR: values update after each game, display in UI
- Fan morale: updates after game result

**Exit criteria:**
- All scenarios Pass OR have a logged FINDING with fix committed
- No known regressions
- CURRENT_STATE.md reflects final verified state

---

## Accountability Rules (unchanged from original)

1. No finding is CONFIRMED without a verification method documented
2. `npm run build` must pass after every code change before proceeding
3. Relevant tests must pass after every code change
4. JK confirms specific behavior in browser before any ticket closes (Phase 3 only)
5. If Codex output doesn't match expected → change is NOT applied
6. Every fix uses the Prompt Contract template in PROMPT_CONTRACTS.md
7. Write to spec-docs before moving on. Chat is ephemeral. Docs are permanent.

---

## Finding Format

```
FINDING-[NNN]
Date: YYYY-MM-DD
Phase: [1/2/3]
System: [subsystem name]
Files: [exact paths]
OOTP Pattern: [what OOTP does]
KBL Code: [what KBL actually does]
Follows Pattern: Y | N | PARTIAL
Status: CONFIRMED | FIXED | UNVERIFIED | DEFERRED
Verification method: [grep output / build result / manual browser test]
```

---

## Session Handoff Checklist

Before ending ANY session:
- [ ] All findings from this session logged in AUDIT_LOG.md
- [ ] PATTERN_MAP.md updated for any newly closed rows
- [ ] SESSION_LOG.md updated
- [ ] CURRENT_STATE.md updated if any status changed
- [ ] Next session starting point documented in CURRENT_STATE.md
