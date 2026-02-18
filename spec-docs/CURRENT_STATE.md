# KBL Tracker — Current State
**Last updated:** 2026-02-18
**Protocol:** REWRITE this file (do not append) at every session end.
**Max length:** 2 pages. If it grows beyond this, you are doing it wrong.

---

## Current Phase and Step
- **Phase:** 2 — OOTP Pattern Conformance Audit — IN PROGRESS
- **Step:** First subsystem complete — Clutch Attribution (#12) + Leverage Index (#11b)
- **Status:** FINDING-098 + 099 logged. PATTERN_MAP updated. Ready for next subsystem: Fan Morale (#13)

---

## Last Completed Action
Session 2026-02-18. Phase 1 complete. PHASE_SUMMARIES/PHASE1_BREADTH.md written.
FINDING-001 through FINDING-097. All 23 SUBSYSTEM_MAP rows closed.
AUDIT_LOG phase tracker updated: Phase 1 → COMPLETE.

Tier 2 key results:
- Franchise, Schedule, Salary, Offseason, Playoffs, Mojo/Fitness, Fame/Milestone all ✅ WIRED
- Fan Morale 🔲 STUBBED — hook called live but internally marked TODO, returns placeholder data
- Relationships ⚠️ PARTIAL — only reached indirectly via useFranchiseData (FranchiseHome only)
- Narrative ⚠️ PARTIAL — game recap wired; headlineGenerator.ts orphaned
- Farm, Trade, positional WAR (bWAR/fWAR/pWAR/rWAR), Trait System ❌ ORPHANED/MISSING
- PostGameSummary + WorldSeries pages have zero app-level hook imports — data gap risk
- Clutch Attribution ⚠️ PARTIAL — engine complete, trigger never called, zero clutch stats accumulate (FINDING-096)
- Leverage Index ⚠️ PARTIAL — full spec implemented but useGameState uses boLI only; full LI only in EnhancedInteractiveField; relationship modifiers (revenge/romantic/family) dead (FINDING-097)

---

## Last Completed Action
Session 2026-02-18 (cont). Phase 2 opened. PATTERN_MAP reconciled with Phase 1 findings.
First Phase 2 audit complete: Clutch Attribution + Leverage Index.
- FINDING-098: Clutch Attribution — PARTIAL conformance. Architecture correct (stat pipeline pattern). Disconnection only. Fix is wiring.
- FINDING-099: LI — N conformance. Two LI values in flight violates OOTP single-value principle. 6 getBaseOutLI calls in useGameState must be replaced with calculateLeverageIndex.
OOTP research confirmed Clutch is KBL-original (no OOTP analog). LI used only as leverage_multiplier in pitcher WAR in OOTP.

## Next Action
**Phase 2 — Next subsystem: Fan Morale (#13)**
Per PATTERN_MAP: OOTP Pattern = "Team performance input; affects attendance, storylines."
Status: 🔲 STUBBED. Follows Pattern: UNKNOWN.
Steps: read relevant OOTP section (Section 7 — Traits, Chemistry, Personality), read fanMoraleEngine.ts + useFanMorale.ts, ask "does the architecture follow OOTP pattern?", log finding.

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
9. Relationship engine is indirectly wired via useFranchiseData — not directly by any page
10. OOTP architecture = reference pattern; SMB4 specs = content that fills it
11. Farm/Trade are fully orphaned — no active wiring anywhere
12. ratingsAdjustmentEngine is orphaned — EOS ratings changes never fire
13. HOF induction (hofEngine) is test-only — never runs in production
14. Fan morale hook is explicitly STUBBED in source — not a real implementation
15. PostGameSummary + WorldSeries have zero app-level hook imports

---

## Files a New Thread Must Read (in order)
1. This file (CURRENT_STATE.md) — orient yourself here first
2. spec-docs/SESSION_RULES.md — operating rules, documentation routing
3. spec-docs/ARCHITECTURAL_DECISIONS.md — all decided patterns
4. spec-docs/SUBSYSTEM_MAP.md — wiring status per subsystem (now complete)
5. spec-docs/AUDIT_LOG.md — findings index (001-055 full text; 056+ index only)
6. spec-docs/FINDINGS/FINDINGS_056_onwards.md — full finding text 056-095

Phase 2 only: also read spec-docs/OOTP_ARCHITECTURE_RESEARCH.md per section
as directed in "Phase 2 Instructions" below. Do NOT read it in full upfront.

---

## Phase 2 Instructions for Future Thread
When Phase 2 opens, for EVERY subsystem audit:
1. Read the subsystem's "OOTP Pattern" from PATTERN_MAP.md
2. Read the corresponding section in OOTP_ARCHITECTURE_RESEARCH.md for detail
3. Open the KBL code file
4. Ask: does the code follow the OOTP structural pattern?
5. Log finding with pattern conformance verdict (Y / N / PARTIAL)

The OOTP research is not a Phase 1 tool. It is the Phase 2 audit lens.

---

## What a New Thread Should NOT Do
- Re-derive decisions already in ARCHITECTURAL_DECISIONS.md
- Append to AUDIT_LOG.md for new findings (use FINDINGS_056_onwards.md)
- Ask "what should I do next?" — the answer is always in this file
- Skip reading this file and start working from context alone
- Read OOTP_ARCHITECTURE_RESEARCH.md in full at session start (too large)
- Conflate mWAR (active) with positional WAR (orphaned) — they are separate
