# KBL Tracker — Current State
**Last updated:** 2026-02-18
**Protocol:** REWRITE this file (do not append) at every session end.
**Max length:** 2 pages. If it grows beyond this, you are doing it wrong.

---

## Current Phase and Step
- **Phase:** 3 — Fix Prioritization and Execution
- **Status:** Phase 2 COMPLETE. All 5 priority subsystems audited. Ready to plan and execute fixes.

---

## Phase 2 Final Results

| Finding | Subsystem | Verdict | Fix Complexity |
|---------|-----------|---------|----------------|
| 098 | Clutch Attribution | PARTIAL — pipeline disconnected | Wire trigger from at-bat outcome |
| 099 | Leverage Index | N — dual-value violation | Replace 6 getBaseOutLI calls |
| 100 | Legacy Field Removal | FIXED | Done (3705a86) |
| 101 | Fan Morale | BROKEN — method name mismatch | 2-line rename (contract written) |
| 102 | Stats Aggregation | PARTIAL — Steps 6/7/8/10/11 absent | Standings wiring = HIGH |
| 103 | Positional WAR | N — zero callers | 1 import + 1 call in processCompletedGame.ts |
| 104 | Trait System | PARTIAL — storage wired, ceremony not persisting | 3 targeted fixes |

---

## Next Action
**Phase 3 — Confirm fix execution order with JK, then execute.**

Proposed priority order:
1. FINDING-101: Fan Morale method rename (2 lines, contract ready in PROMPT_CONTRACTS.md)
2. FINDING-103: Wire warOrchestrator into processCompletedGame.ts (closes WAR + FINDING-102 Step 8)
3. FINDING-102 Step 6: Wire standings update into post-game pipeline (HIGH per audit)
4. FINDING-099: Replace dual LI values with single calculateLeverageIndex
5. FINDING-104: (a) trait dropdown in player creation, (b) ceremony persistence to player record
6. FINDING-098: Wire clutch trigger from at-bat outcome

---

## Key Decisions Made (do not re-derive these)
See ARCHITECTURAL_DECISIONS.md for full list. Summary of Phase 2 additions:
1–15. (All prior decisions still hold — see previous CURRENT_STATE or ARCHITECTURAL_DECISIONS.md)
16. **Traits are NOT engine effects.** Persistent player attributes only. No potency calculator, no trigger layer needed. Stored as trait1/trait2 string IDs on master player record.
17. **Trait use cases:** player creation dropdown, generated/rookie player assignment, awards ceremony rewards/penalties, salary/grade influence.
18. **Player Morale ≠ Traits.** Fully independent systems. No coupling.
19. **FIERY + GRITTY chemistry types** are KBL-only additions (SMB4 has 5). Decision on keep/remove pending.
20. **traitPools.ts** (60+ traits, S/A/B/C tiers) is the canonical catalog. Never imported — must be wired.
21. **warOrchestrator.ts** is fully correct — zero callers. One wiring call closes the gap.
22. **Fan morale localStorage** (Bug C, FINDING-101) is a separate follow-on item after Bug A method rename fix.

---

## Files a New Thread Must Read (in order)
1. This file (CURRENT_STATE.md)
2. spec-docs/SESSION_RULES.md
3. spec-docs/AUDIT_LOG.md — findings index
4. spec-docs/FINDINGS/FINDINGS_056_onwards.md — full text for FINDING-098 through 104
5. spec-docs/PROMPT_CONTRACTS.md — FINDING-101 fix contract ready to execute

---

## What a New Thread Should NOT Do
- Re-audit Phase 2 subsystems — they are complete
- Rebuild WAR engines — the calculators are correct, only wiring is needed
- Treat trait fields as engine modifiers — they are static attributes only
- Read OOTP_ARCHITECTURE_RESEARCH.md in full (too large, use per-section as needed)
- Conflate mWAR (active/wired) with positional WAR (orphaned) — they are separate
