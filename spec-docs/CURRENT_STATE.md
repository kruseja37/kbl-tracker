# KBL Tracker — Current State
**Last updated:** 2026-02-18
**Protocol:** REWRITE this file (do not append) at every session end.
**Max length:** 2 pages. If it grows beyond this, you are doing it wrong.

---

## Current Phase and Step
- **Phase:** 1 (revised plan) — Complete the Pattern Map
- **Status:** 5 of 24 rows closed. 22 rows still UNKNOWN in "Follows Pattern."
- **Next action:** Audit Pattern Map rows in Group A (spine-critical) — start with Row 1 (GameTracker / Game State)

---

## Revised Audit Sequence (non-negotiable order)
1. **Phase 1** — Close all 22 remaining UNKNOWN rows in PATTERN_MAP.md
2. **Phase 2** — Fix everything findable in code (no browser needed)
3. **Phase 3** — Browser verification (JK performs scenarios)

Rationale: cannot trust browser results if code is broken. Cannot know what to fix
until code-level audit is complete. See AUDIT_PLAN.md for full details.

---

## Pattern Map Status
**Closed (5):** Row 4 (WAR positional/N/F-103), Row 11b (LI/N/F-099),
Row 12 (Clutch/PARTIAL/F-098), Row 13 (Fan Morale/N/F-101), Row 21 (Trait/PARTIAL/F-104)

**Open (22):** Rows 1, 2, 3, 4b, 5, 6, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24

**Group A (spine-critical — audit first):** Rows 1, 2, 3, 6, 20
**Group B (downstream):** Rows 4b, 5, 7, 8, 11, 16, 17, 18, 19
**Group C (orphaned/partial/unknown):** Rows 9, 10, 14, 15, 22, 23, 24

---

## Known Phase 2 Fix Queue (FIX-CODE items confirmed so far)
- F-099: LI dual-value — replace 6 getBaseOutLI with calculateLeverageIndex
- F-101 Bug A: Fan morale method rename (2 lines, contract in PROMPT_CONTRACTS.md)
- F-101 Bug B: Hardcoded season/game numbers in fan morale call
- F-101 Bug C: Fan morale localStorage → IndexedDB (follow-on)
- F-102 Step 6: Wire standings into post-game pipeline
- F-103: Wire warOrchestrator into processCompletedGame.ts
- F-104a: Wire traitPools.ts into player creation dropdown
- F-104b: Write trait changes back to player record after awards ceremony
- F-098: Wire clutch trigger from at-bat outcome
(Phase 1 will add more items)

---

## Key Decisions Made (do not re-derive)
1–15: See ARCHITECTURAL_DECISIONS.md
16. Traits are NOT engine effects. Persistent player attributes only (trait1/trait2 string IDs).
17. Trait use cases: player creation dropdown, generated player assignment, awards ceremony, salary/grade.
18. Player Morale ≠ Traits. Fully independent systems.
19. FIERY + GRITTY chemistry types are KBL-only additions. Decision on keep/remove pending (FIX-DECISION).
20. traitPools.ts (60+ traits) is the canonical catalog. Must be wired to player creation + ceremony.
21. warOrchestrator.ts is fully correct — zero callers. One wiring call closes the gap.
22. Fan morale localStorage (Bug C) is follow-on after Bug A method rename.

---

## Files a New Thread Must Read (in order)
1. This file (CURRENT_STATE.md)
2. spec-docs/SESSION_RULES.md
3. spec-docs/AUDIT_PLAN.md — the revised 3-phase plan
4. spec-docs/PATTERN_MAP.md — 24 rows, audit status per row
5. spec-docs/AUDIT_LOG.md — findings index
6. spec-docs/FINDINGS/FINDINGS_056_onwards.md — full text F-098 through F-104

---

## What a New Thread Should NOT Do
- Skip to fix execution before Phase 1 (Pattern Map) is complete
- Treat Phase 2 fix queue as final — Phase 1 will add more items
- Read OOTP_ARCHITECTURE_RESEARCH.md in full (too large — read per-section as needed)
- Conflate mWAR (active/wired) with positional WAR (orphaned)
- Start browser testing before Phases 1 and 2 are done
