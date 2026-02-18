# KBL Tracker — Current State
**Last updated:** 2026-02-18
**Protocol:** REWRITE this file (do not append) at every session end.
**Max length:** 2 pages. If it grows beyond this, you are doing it wrong.

---

## Current Phase and Step
- **Phase:** 1 — Breadth Survey (Tier 1)
- **Step:** Tier 1 Batch D — Farm, Trade, Salary, League Builder, Museum/HOF, Aging, Career Stats, UI page imports
- **Status:** READY TO RUN — batch prompt already written, not yet executed

---

## Last Completed Action
Created and committed three foundational documents:
- spec-docs/FINDINGS/FINDINGS_056_onwards.md — full finding text for 056+
- spec-docs/SUBSYSTEM_MAP.md — wiring status per subsystem
- SESSION_RULES.md and CLAUDE.md updated with documentation routing rules

FINDING-071 identified the four-layer architecture pattern: engines → integration adapters → app hooks → page hooks. The hook layer is the active surface. Layers 1-2 is where orphaned code lives.

---

## Next Action
Run Tier 1 Batch D (Farm, Trade, Salary, League Builder, Museum/HOF, Aging, Career Stats, UI page imports). Prompt is already written — execute it.

---

## Key Decisions Made (do not re-derive these)
See ARCHITECTURAL_DECISIONS.md for full list. Summary:
1. No separate career stats table — career = SUM(PlayerSeasonStats) by playerId
2. Stat pipeline is synchronous and game-triggered
3. Season transition is atomic — closeSeason() / openSeason() are transactional
4. src_figma/utils/ files are re-export barrels only
5. Four-layer architecture is intentional pattern, not a bug
6. Pattern Map is the audit lens for Phase 2
7. Trait system is MISSING from active types
8. mWAR is active and wired; bWAR/fWAR/pWAR/rWAR are orphaned
9. Relationship engine is fully orphaned — zero gameplay effect currently
10. OOTP architecture is the reference pattern; SMB4 specs provide the content

---

## Files a New Thread Must Read (in order)
1. This file (CURRENT_STATE.md) — orient yourself here first
2. spec-docs/SESSION_RULES.md — operating rules, documentation routing
3. spec-docs/ARCHITECTURAL_DECISIONS.md — all decided patterns
4. spec-docs/PATTERN_MAP.md — subsystem status vs OOTP reference
5. spec-docs/SUBSYSTEM_MAP.md — wiring status per subsystem
6. spec-docs/AUDIT_LOG.md — index only for findings 056+; full text 001-055
7. spec-docs/FINDINGS/FINDINGS_056_onwards.md — full text findings 056+

Do NOT read the full AUDIT_LOG.md in detail. Use the index for specific findings only when directly relevant to the task at hand.

---

## What a New Thread Should NOT Do
- Re-derive decisions already in ARCHITECTURAL_DECISIONS.md
- Append to AUDIT_LOG.md for new findings (use FINDINGS_056_onwards.md)
- Ask "what should I do next?" — the answer is always in this file
- Skip reading this file and start working from context alone
