# KBL Tracker — Current State
**Last updated:** 2026-02-21 (Spec-to-Fix-Queue Reconciliation complete)
**Protocol:** REWRITE this file (do not append) at every session end.
**Max length:** 2 pages. If it grows beyond this, you are doing it wrong.

---

## Current Phase and Step
- **Phase:** 1 COMPLETE — Pattern Map fully closed (26/26 rows)
- **Spec Sync:** COMPLETE — 20 spec updates verified on disk (8 major, 7 new, 5 minor)
- **Reconciliation:** COMPLETE — RECONCILIATION_PLAN.md written; all 22 fix queue items mapped against updated specs
- **Next action:** JK reviews RECONCILIATION_PLAN.md, answers 10 questions in §6, then Phase 2A execution begins

---

## Revised Audit Sequence (non-negotiable order)
1. **Phase 1** ✅ COMPLETE — All 26 rows in PATTERN_MAP.md closed
2. **Spec Sync** ✅ COMPLETE — 20 items updated/created, verified on disk
3. **Reconciliation** ✅ COMPLETE — RECONCILIATION_PLAN.md written
4. **Phase 2** — Fix everything findable in code (no browser needed)
5. **Phase 3** — Browser verification (JK performs scenarios)

---

## Phase 2 Fix Queue — Status After Reconciliation

### FIX-CODE — Ready to Execute (no decisions needed)
Execute in this order:
1. F-103: Wire warOrchestrator into processCompletedGame.ts (1 import + 1 call)
2. F-102 Step 6: Wire standings push into aggregateGameToSeason
3. F-099: Replace 6 getBaseOutLI with calculateLeverageIndex
4. F-104a: Wire traitPools.ts into player creation dropdown
5. F-104b: Write trait changes to player record after awards ceremony
6. F-118 (RE-SCOPED): Wire agingIntegration into Offseason Phase 1 (move from SpringTrainingFlow)
7. F-098: Wire clutch trigger from at-bat outcome
8. F-101 Bug A: Fan morale method rename
9. F-101 Bug B: Hardcoded season/game in fan morale call
10. F-110: Fix hardcoded 'season-1' in mWAR (2 lines)
11. F-112 (RE-SCOPED): Fix clearSeasonalStats + confirm Phase 1 call site

### FIX-DECISION — RESOLVED (confirm with JK, then close)
- F-109: **Derive-on-read** — ALMANAC_SPEC §4.3 confirms (recommend YES)
- F-115: **Age-based salary** — SALARY_SYSTEM_SPEC confirms, no service time (recommend YES)

### FIX-DECISION — Pending JK Answer
- F-101 Bug C: Fan morale localStorage → IndexedDB (after Bug A)
- F-107: franchiseId scoping — DEFERRED (Decision 23)
- F-113: Playoff stats write path — wire now or defer?
- F-114 (RE-SCOPED): Between-game mojo/fitness persistence — bare persistence or full Team Page editor?
- F-119: Relationships — re-enable or formally orphan?
- F-120: Narrative persistence (recaps) + headlineEngine — wire or defer?
- F-121 (RE-SCOPED): Player dev engine — approve OOTP 10-factor model?
- F-122 (RE-SCOPED): Record book — Season Records + oddityRecordTracker both in scope?

### New Gaps (Audit Before Phase 3)
- GAP-001: Mode separation enforcement (SEPARATED_MODES_ARCHITECTURE.md)
- GAP-002: Park factor seeding + 40% activation (PARK_FACTOR_SEED_SPEC.md)
- GAP-003: Personality system population in player records
- GAP-004: Mojo/fitness stat splits accumulation per PA
- GAP-005: Juiced fame scrutiny in fameEngine
- GAP-007: Prospect/draft class generation engine

---

## Key Decisions Made (do not re-derive)
1–27: See prior sessions. Key new:
28. F-109 RESOLVED: derive-on-read pattern confirmed by ALMANAC_SPEC §4.3
29. F-115 RESOLVED: age-based salary confirmed as final design by SALARY_SYSTEM_SPEC
30. F-118 RE-SCOPED: aging write-back must be in Offseason Phase 1, not SpringTrainingFlow
31. F-112 RE-SCOPED: clearSeasonalStats call site must be Offseason Phase 1
32. F-114 RE-SCOPED: not "re-enable auto-update" — MOJO_FITNESS_SYSTEM_SPEC requires between-game persistence (fitness persists by spec definition)
33. F-121 RE-SCOPED: PROSPECT_GENERATION_SPEC is draft seeding, not dev engine; OOTP research provides dev model; JK approval pending
34. F-122 RE-SCOPED: ALMANAC_SPEC §3.2 Season Records is Phase 2 priority; both surfaces in scope pending JK confirm

---

## Current Phase: Spec Updates from JK Decisions
All 10 decisions answered (2026-02-21). Next session writes spec updates in this order:

### Spec Update Order (priority → dependency)
1. **TRAIT_INTEGRATION_SPEC** — chemistry type names + TRAIT_CHEMISTRY_MAP expansion (CONFLICT-003)
   - Must go first — everything else that references chemistry types depends on this being correct
2. **PROSPECT_GENERATION_SPEC** — chemistry type names (CONFLICT-003 cascade)
3. **SALARY_SYSTEM_SPEC** — chemistry type names + draft-round rookie salary table replacing rating-at-callup (CONFLICT-003 + Q-001)
4. **FARM_SYSTEM_SPEC** — overallRating schema A–D + rookie salary note (CONFLICT-005 + Q-001)
5. **SCOUTING_SYSTEM_SPEC** — fat-tail grade deviation model (Q-005)
6. **OFFSEASON_SYSTEM_SPEC** — FA exchange ±20% True Value (CONFLICT-004) + run differential tiebreaker + user-select prompt (Q-002) + stadium change Phase 4 sub-step (Q-004) + team captain designation stub (Q-006)
7. **FREE_AGENCY_FIGMA_SPEC** — FA exchange rule corrected to ±20% True Value, no position restriction (CONFLICT-004)
8. **DYNAMIC_DESIGNATIONS_SPEC** — team captain designation full spec (Q-006)
9. **LEAGUE_BUILDER_SPEC** — prospect draft step added as new section (Q-003)
10. **New: BEAT_REPORTER_MODAL_SPEC** — UI flow for pre-decision warning modal (Q-007)

### Reference Docs
- SPEC_RECONCILIATION_FINDINGS.md — full third-pass findings
- AUDIT_LOG.md FINDING-124 through FINDING-133 — all decisions logged

---

## Files a New Thread Must Read (in order)
1. This file (CURRENT_STATE.md)
2. spec-docs/SESSION_RULES.md
3. spec-docs/SPEC_RECONCILIATION_FINDINGS.md ← read before writing any spec updates
4. spec-docs/AUDIT_LOG.md — findings index F-001 to F-133
5. spec-docs/FINDINGS/FINDINGS_056_onwards.md — full text F-056 through F-123

---

## What a New Thread Should NOT Do
- Re-audit Pattern Map rows — Phase 1 is complete
- Re-do spec sync — all 20 items verified on disk
- Re-run reconciliation — all decisions answered, now in spec update phase
- Re-ask JK the 10 questions — all answered, see AUDIT_LOG FINDING-124 through FINDING-133
- Skip the update order above — items 1–5 must precede 6–10 due to cross-references
