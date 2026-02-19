# KBL Tracker — Current State
**Last updated:** 2026-02-18 (Phase 1 complete)
**Protocol:** REWRITE this file (do not append) at every session end.
**Max length:** 2 pages. If it grows beyond this, you are doing it wrong.

---

## Current Phase and Step
- **Phase:** 1 COMPLETE — Pattern Map fully closed (26/26 rows)
- **Status:** All rows have a Follows Pattern verdict. Zero UNKNOWNs remain.
- **Next action:** Build complete Phase 2 fix queue. JK confirms before fix execution begins.

---

## Revised Audit Sequence (non-negotiable order)
1. **Phase 1** ✅ COMPLETE — All 26 rows in PATTERN_MAP.md closed
2. **Phase 2** — Fix everything findable in code (no browser needed)
3. **Phase 3** — Browser verification (JK performs scenarios)

---

## Pattern Map — Final State (26/26 closed)
| Row | Subsystem | Follows Pattern | Finding |
|-----|-----------|-----------------|---------|
| 1 | GameTracker / Game State | PARTIAL | F-105 |
| 2 | Stats Aggregation | PARTIAL | F-106 |
| 3 | Franchise / Season Engine | N | F-107 |
| 4 | WAR — positional | N | F-103 |
| 4b | WAR — mWAR | Y | F-110 |
| 5 | Fame / Milestone | PARTIAL | F-111 |
| 6 | Schedule System | PARTIAL | F-108 |
| 7 | Offseason | PARTIAL | F-112 |
| 8 | Playoffs | Y | F-113 |
| 9 | Relationships | N (ORPHANED) | F-119 |
| 10 | Narrative / Headlines | PARTIAL | F-120 |
| 11 | Mojo / Fitness | N | F-114 |
| 11b | Leverage Index | N | F-099 |
| 12 | Clutch Attribution | PARTIAL | F-098 |
| 13 | Fan Morale | N (BROKEN) | F-101 |
| 14 | Farm System | N (ORPHANED) | F-072 |
| 15 | Trade System | N (ORPHANED) | F-073 |
| 16 | Salary System | N | F-115 |
| 17 | League Builder | PARTIAL | F-116 |
| 18 | Museum / HOF | PARTIAL | F-117 |
| 19 | Aging / Ratings | N | F-118 |
| 20 | Career Stats | N | F-109 |
| 21 | Trait System | N | F-104 |
| 22 | Player Dev Engine | N (MISSING) | F-121 |
| 23 | Record Book | N (ORPHANED) | F-122 |
| 24 | UI Pages | PARTIAL | F-123 |

**Verdict summary:** Y=2 | PARTIAL=10 | N=14 (of which ORPHANED=4, MISSING=1, BROKEN=1)

---

## Phase 2 Fix Queue — CONFIRMED FIX-CODE Items
(These can be fixed in code without JK decisions)
- F-099: LI dual-value — replace 6 getBaseOutLI with calculateLeverageIndex
- F-101 Bug A: Fan morale method rename (contract written in PROMPT_CONTRACTS.md)
- F-101 Bug B: Hardcoded season/game numbers in fan morale call
- F-102 Step 6: Wire standings into post-game pipeline
- F-103: Wire warOrchestrator into processCompletedGame.ts (1 import + 1 call)
- F-104a: Wire traitPools.ts into player creation dropdown
- F-104b: Write trait changes back to player record after awards ceremony
- F-098: Wire clutch trigger from at-bat outcome
- F-110: Fix hardcoded 'season-1' in mWAR init + aggregation calls (2 lines)
- F-112: Fix clearSeasonalStats (scans localStorage, stats are in IndexedDB — clears nothing)
- F-118: Wire agingIntegration.ts into offseason ratings phase; write calc to player record

## Phase 2 Fix Queue — FIX-DECISION Items
(Need JK decision before any code work)
- F-101 Bug C: Fan morale localStorage → IndexedDB (follow-on after Bug A)
- F-107: franchiseId scoping — accept single-franchise constraint or add scoping? (DEFERRED)
- F-109: Career stats derive-on-read vs incremental write — which model?
- F-113: Playoff stats write path — wire GameTracker → PLAYOFF_STATS, or defer?
- F-114: Mojo/fitness auto-update re-enable + persistence between games?
- F-115: Salary service time — accept age-based as KBL design, or implement?
- F-119: Relationships — re-enable full system, or formally orphan/remove?
- F-120: Narrative persistence — store recaps to IndexedDB, or ephemeral display only?
- F-120: headlineEngine — wire or formally remove?
- F-121: Player Dev Engine — define KBL development model, then implement
- F-122: Record Book — standard records in scope? Wire oddityRecordTracker?

---

## Key Decisions Made (do not re-derive)
1–15: See ARCHITECTURAL_DECISIONS.md
16. Traits are NOT engine effects. Persistent player attributes only (trait1/trait2 string IDs).
17. Trait use cases: player creation dropdown, generated player assignment, awards ceremony, salary/grade.
18. Player Morale ≠ Traits. Fully independent systems.
19. FIERY + GRITTY chemistry types are KBL-only additions. Decision on keep/remove pending.
20. traitPools.ts (60+ traits) is the canonical catalog. Must be wired to player creation + ceremony.
21. warOrchestrator.ts is fully correct — zero callers. One wiring call closes the gap.
22. Fan morale localStorage (Bug C) is follow-on after Bug A method rename.
23. franchiseId scoping gap is DEFERRED (latent debt, no current user impact).
24. Schedule-to-pipeline decoupling is DEFERRED (architectural debt, works today).
25. Career stats incremental write vs derive-on-read — FIX-DECISION queued (F-109).
26. Mojo auto-update was explicitly disabled at user request — FIX-DECISION queued (F-114).
27. Salary age-based (not service-time-based) is KBL design choice — FIX-DECISION queued (F-115).

---

## Files a New Thread Must Read (in order)
1. This file (CURRENT_STATE.md)
2. spec-docs/SESSION_RULES.md
3. spec-docs/AUDIT_PLAN.md
4. spec-docs/PATTERN_MAP.md — 26 rows, all closed
5. spec-docs/AUDIT_LOG.md — findings index F-001 to F-123
6. spec-docs/FINDINGS/FINDINGS_056_onwards.md — full text F-056 through F-123

---

## What a New Thread Should NOT Do
- Re-audit Pattern Map rows — Phase 1 is complete, all 26 rows are closed
- Start fix execution before JK confirms the Phase 2 fix queue ordering
- Treat FIX-DECISION items as FIX-CODE — each needs explicit JK approval
- Start browser testing before Phase 2 is done
