# KBL Tracker — Current State
**Last updated:** 2026-02-18
**Protocol:** REWRITE this file (do not append) at every session end.
**Max length:** 2 pages. If it grows beyond this, you are doing it wrong.

---

## Current Phase and Step
- **Phase:** 1 — Breadth Survey (Tier 1)
- **Step:** Tier 1 Batch D — Farm, Trade, Salary, League Builder, Museum/HOF,
  Aging, Career Stats, UI page imports
- **Status:** NOT YET RUN — prompt is written, ready to execute next session

---

## Last Completed Action
Session 2026-02-18 established sustainable documentation system:
- CURRENT_STATE.md — created (this file)
- ARCHITECTURAL_DECISIONS.md — created (10 decisions logged)
- PATTERN_MAP.md — created (24 subsystems mapped against OOTP patterns)
- OOTP_ARCHITECTURE_RESEARCH.md — committed (1,216 lines, full Opus research)
- SESSION_RULES.md — updated with session end protocol
- FINDINGS_056_onwards.md — FINDING-065 to 071 added (gap from prior session)
- AUDIT_LOG.md — index entries added for FINDING-056 to 071

Key insight this session: OOTP architecture is the reference pattern. We copy
structural patterns, not assets. Pattern Map is the Phase 2 audit lens.
Question is not "does it exist?" but "does it follow the correct pattern?"

---

## Next Action
Run Tier 1 Batch D. Prompt already written — ask Claude for it or find it
in prior session context. Targets: Farm, Trade, Salary, League Builder,
Museum/HOF, Aging/Ratings, Career Stats, UI page imports (FranchiseHome,
SeasonSummary, PostGameSummary, WorldSeries).

After Batch D: close Phase 1 with PHASE1_BREADTH.md summary, then open
Phase 2 using PATTERN_MAP.md as the audit lens.

---

## Key Decisions Made (do not re-derive these)
See ARCHITECTURAL_DECISIONS.md for full list. Summary:
1. No separate career stats table — career = SUM(PlayerSeasonStats) by playerId
2. Stat pipeline is synchronous and game-triggered
3. Season transition is atomic — closeSeason() / openSeason() are transactional
4. src_figma/utils/ files are re-export barrels only
5. Four-layer architecture is intentional pattern, not a bug
6. Pattern Map is the Phase 2 audit lens — pattern conformance not just existence
7. Trait system is MISSING from active types — exists only in legacy code
8. mWAR is active and wired; bWAR/fWAR/pWAR/rWAR are orphaned
9. Relationship engine is fully orphaned — zero gameplay effect currently
10. OOTP architecture = reference pattern; SMB4 specs = content that fills it

---

## Files a New Thread Must Read (in order)
1. This file (CURRENT_STATE.md) — orient yourself here first
2. spec-docs/SESSION_RULES.md — operating rules, documentation routing
3. spec-docs/ARCHITECTURAL_DECISIONS.md — all decided patterns
4. spec-docs/PATTERN_MAP.md — subsystem status vs OOTP reference
5. spec-docs/SUBSYSTEM_MAP.md — wiring status per subsystem
6. spec-docs/AUDIT_LOG.md — index only for findings 056+; full text 001-055
7. spec-docs/FINDINGS/FINDINGS_056_onwards.md — full finding text 056-071

Do NOT read AUDIT_LOG.md in full. Use the index to find specific findings
only when directly relevant to the task at hand.

---

## What a New Thread Should NOT Do
- Re-derive decisions already in ARCHITECTURAL_DECISIONS.md
- Append to AUDIT_LOG.md for new findings (use FINDINGS_056_onwards.md)
- Ask "what should I do next?" — the answer is always in this file
- Skip reading this file and start working from context alone
- Conflate mWAR (active) with positional WAR (orphaned) — they are separate
