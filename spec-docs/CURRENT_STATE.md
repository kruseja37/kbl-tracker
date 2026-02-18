# KBL Tracker — Current State
**Last updated:** 2026-02-18
**Protocol:** REWRITE this file (do not append) at every session end.
**Max length:** 2 pages. If it grows beyond this, you are doing it wrong.

---

## Current Phase and Step
- **Phase:** 1 — Breadth Survey (Tier 1)
- **Step:** Tier 1 Batch D — Farm, Trade, Salary, League Builder, Museum/HOF,
  Aging, Career Stats, UI page imports
- **Status:** NOT YET RUN — this is the immediate next action

---

## Last Completed Action
Session 2026-02-18. Accomplished:
- Committed CURRENT_STATE.md, ARCHITECTURAL_DECISIONS.md, PATTERN_MAP.md
- Committed OOTP_ARCHITECTURE_RESEARCH.md (1,216 lines — full Opus research)
- Updated SESSION_RULES.md with session end protocol
- Added FINDING-065 to 071 to FINDINGS_056_onwards.md
- Established OOTP architecture as the Phase 2 audit reference pattern

Phase 1 breadth audit progress: Batches A, B, C complete. Batch D not run.

---

## Next Action
**Run Tier 1 Batch D immediately.** Prompt targets:
Farm, Trade, Salary, League Builder, Museum/HOF, Aging/Ratings, Career Stats,
UI page imports (FranchiseHome, SeasonSummary, PostGameSummary, WorldSeries).
Ask Claude to produce the Batch D prompt — it is already written.

After Batch D completes:
1. Log findings to FINDINGS_056_onwards.md
2. Update PATTERN_MAP.md with any status changes
3. Write PHASE_SUMMARIES/PHASE1_BREADTH.md (synthesis of all Phase 1 findings)
4. Open Phase 2

---

## Phase 2 Instructions for Future Thread
When Phase 2 opens, for EVERY subsystem audit:
1. Read the subsystem's "OOTP Pattern" from PATTERN_MAP.md
2. Read the corresponding section in OOTP_ARCHITECTURE_RESEARCH.md for detail
   - Player lifecycle: Section 3
   - Stat pipeline: Section 2
   - Season lifecycle: Section 4
   - Franchise continuity: Section 5
   - Narrative engine: Section 6
   - Traits/personality: Section 7
   - Replayability: Section 8
3. Open the KBL code file
4. Ask: does the code follow the OOTP structural pattern?
5. Log finding with pattern conformance verdict (Y / N / PARTIAL)

The OOTP research is not a Phase 1 tool. It is the Phase 2 audit lens.

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

Phase 2 only: also read spec-docs/OOTP_ARCHITECTURE_RESEARCH.md per section
as directed in "Phase 2 Instructions" above. Do NOT read it in full upfront.

---

## What a New Thread Should NOT Do
- Re-derive decisions already in ARCHITECTURAL_DECISIONS.md
- Append to AUDIT_LOG.md for new findings (use FINDINGS_056_onwards.md)
- Ask "what should I do next?" — the answer is always in this file
- Skip reading this file and start working from context alone
- Read OOTP_ARCHITECTURE_RESEARCH.md in full at session start (too large)
- Conflate mWAR (active) with positional WAR (orphaned) — they are separate
