# DOC_RECONCILIATION_PLAN.md
# Created: 2026-02-21
# Purpose: Track spec cleanup progress across Phase A (archive/mark) and
#          Phase B (systematic reconciliation batches).
# Distinct from RECONCILIATION_PLAN.md, which covers code fix queue.

---

## CURRENT STATUS
- Phase A: NOT STARTED (pending this session execution)
- Phase B1–B5: NOT STARTED
- Phase C: NOT STARTED

---

## PHASE A — Archive & Mark
Execute this session. No decisions needed.

### A1 — Move to spec-docs/archive/ (11 files)
- [ ] KBL_XHD_TRACKER_MASTER_SPEC_v3.md
- [ ] MASTER_SPEC_ERRATA.md
- [ ] GAMETRACKER_DRAGDROP_SPEC.md
- [ ] GAME_SIMULATION_SPEC.md
- [ ] BASEBALL_STATE_MACHINE_AUDIT.md
- [ ] CONTRACTION_EXPANSION_FIGMA_SPEC.md
- [ ] IMPLEMENTATION_PLAN.md
- [ ] AI_OPERATING_PREFERENCES.md
- [ ] KBL_TRACKER_UI_UX_PLANNING.md
- [ ] codex-all-prompt-contracts.md
- [ ] codex-all-prompt-contracts-v2.md
- [ ] DECISIONS_LOG.md

### A2 — Add STALE banner to Figma specs with known gaps (6 files)
Banner text: "⚠️ STATUS: STALE — PENDING RECONCILIATION. See DOC_RECONCILIATION_PLAN.md §B5."
- [ ] LEAGUE_BUILDER_FIGMA_SPEC.md — GAP-009 Mode Transition screen missing
- [ ] SEASON_SETUP_FIGMA_SPEC.md — missing transitionMode() gate
- [ ] EOS_RATINGS_FIGMA_SPEC.md — wrong phase label, missing trait modifier
- [ ] SEASON_END_FIGMA_SPEC.md — Screen 7 checklist incomplete
- [ ] FINALIZE_ADVANCE_FIGMA_SPEC.md — missing signing round screen
- [ ] SCHEDULE_SYSTEM_FIGMA_SPEC.md — real dates vs fictional Year N/Day N

### A3 — Add STALE banner to pre-Feb-18 calculation/flow specs (~20 files)
Banner text: "⚠️ STATUS: STALE — Not yet reconciled against Feb 19–20 architecture. See DOC_RECONCILIATION_PLAN.md for batch assignment."
- [ ] BWAR_CALCULATION_SPEC.md → Batch B2
- [ ] PWAR_CALCULATION_SPEC.md → Batch B2
- [ ] FWAR_CALCULATION_SPEC.md → Batch B2
- [ ] RWAR_CALCULATION_SPEC.md → Batch B2
- [ ] MWAR_CALCULATION_SPEC.md → Batch B2
- [ ] LEVERAGE_INDEX_SPEC.md → Batch B2
- [ ] CLUTCH_ATTRIBUTION_SPEC.md → Batch B2
- [ ] MOJO_FITNESS_SYSTEM_SPEC.md → Batch B2
- [ ] STAT_TRACKING_ARCHITECTURE_SPEC.md → Batch B2
- [ ] PITCHER_STATS_TRACKING_SPEC.md → Batch B2
- [ ] RUNNER_ADVANCEMENT_RULES.md → Batch B3
- [ ] SUBSTITUTION_FLOW_SPEC.md → Batch B3
- [ ] INHERITED_RUNNERS_SPEC.md → Batch B3
- [ ] PITCH_COUNT_TRACKING_SPEC.md → Batch B3
- [ ] SPECIAL_EVENTS_SPEC.md → Batch B3
- [ ] FIELDING_SYSTEM_SPEC.md → Batch B3
- [ ] FIELDING_PIPELINE_MAPPINGS.md → Batch B3
- [ ] FIELD_ZONE_INPUT_SPEC.md → Batch B3
- [ ] AUTO_CORRECTION_SYSTEM_SPEC.md → Batch B3
- [ ] ADAPTIVE_STANDARDS_ENGINE_SPEC.md → Batch B3
- [ ] MILESTONE_SYSTEM_SPEC.md → Batch B4
- [ ] DYNAMIC_DESIGNATIONS_SPEC.md → Batch B4
- [ ] FAN_FAVORITE_SYSTEM_SPEC.md → Batch B4
- [ ] PLAYOFF_SYSTEM_SPEC.md → Batch B4
- [ ] GRADE_ALGORITHM_SPEC.md → Batch B4
- [ ] SEASON_SETUP_SPEC.md → Batch B4
- [ ] GAMETRACKER_BUGS.md — keep as-is, no banner (active bug tracker)
- [ ] SMB4_GAME_REFERENCE.md — keep as-is (reference material, not spec)
- [ ] smb4_traits_reference.md — keep as-is (reference material)
- [ ] MASTER_BASEBALL_RULES_AND_LOGIC.md — keep as-is (reference material)
- [ ] GAMETRACKER_UX_COMPETITIVE_ANALYSIS.md → Batch B3

### A4 — Add SUPERSEDED/PARTIAL banner to anchor docs
- [ ] FRANCHISE_MODE_DEEP_DIVE.md
  Banner: "⚠️ STATUS: HISTORICAL INPUT — This doc drove Feb 19–20 spec creation.
  It is NOT an authoritative reference. Individual system specs supersede it.
  JK feedback absorbed: see FRANCHISE_DEEPDIVE_FEEDBACK_NOTES.md.
  Archive after B1 reconciliation confirms no gaps remain."
- [ ] KBL_UNIFIED_ARCHITECTURE_SPEC.md
  Banner: "ℹ️ STATUS: §§1–8 (GameTracker event model, 1-tap recording, enrichment) CANONICAL.
  §§9–16 (Franchise/Offseason/LeagueBuilder) — partially superseded by Feb 20 system specs.
  See Batch B1 reconciliation for section-by-section status."

### A5 — Rewrite SPEC_INDEX.md
New structure: Tier 1 (Canonical Feb 20), Tier 2 (STALE pending batch), Tier 3 (Archive).
Mark each doc with status and assigned batch.

### A6 — Update CURRENT_STATE.md
Phase 2 code work is BLOCKED until Phase C (spec cleanup) complete.

---

## PHASE B — Systematic Reconciliation Batches

### Batch B1 — Anchor Docs (1 session)
Docs: KBL_UNIFIED_ARCHITECTURE_SPEC.md, FRANCHISE_MODE_DEEP_DIVE.md
Goal: Section-by-section map vs Feb 20 canonical layer. Confirm §§9–16 of KBL_UNIFIED
are either absorbed or need updates. Confirm FRANCHISE_MODE_DEEP_DIVE has no surviving
gaps before archiving.
Open Questions for JK (from B1): TBD — populated during batch.

### Batch B2 — WAR & Stats Math (1 session)
Docs: BWAR, PWAR, FWAR, RWAR, MWAR, LEVERAGE_INDEX, CLUTCH_ATTRIBUTION,
MOJO_FITNESS, STAT_TRACKING_ARCHITECTURE, PITCHER_STATS_TRACKING
Goal: Verify calculation inputs match Feb 20 player data model. Confirm no
assumptions about mojo/fitness as calculated values (must be user-reported).
Open Questions for JK (from B2): TBD.

### Batch B3 — GameTracker Flow Specs (1 session)
Docs: RUNNER_ADVANCEMENT, SUBSTITUTION_FLOW, INHERITED_RUNNERS, PITCH_COUNT,
SPECIAL_EVENTS, FIELDING_SYSTEM, FIELDING_PIPELINE_MAPPINGS, FIELD_ZONE_INPUT,
AUTO_CORRECTION, ADAPTIVE_STANDARDS, GAMETRACKER_UX_COMPETITIVE_ANALYSIS
Goal: Determine what's still valid under 1-tap recording model vs old multi-step
interview flow. Cross-reference against KBL_UNIFIED §§2–7.
Open Questions for JK (from B3): TBD.

### Batch B4 — System Specs Detail Layer (1 session)
Docs: MILESTONE_SYSTEM, DYNAMIC_DESIGNATIONS, FAN_FAVORITE_SYSTEM,
PLAYOFF_SYSTEM, GRADE_ALGORITHM, SEASON_SETUP
Goal: Confirm which are still the detail layer and which have been superseded
by Feb 20 system specs.
Open Questions for JK (from B4): TBD.

### Batch B5 — Figma Specs (1 session)
Docs: All Figma specs not archived, including the 6 STALE-marked ones.
Goal: Close the 6 known gaps from RECONCILIATION_PLAN. Verify remaining
Figma specs align with Feb 20 system specs.
Open Questions for JK (from B5): TBD.

---

## PHASE C — JK Answers + Final Cleanup
Consolidate all questions from B1–B5, get JK answers in one session.
Update or archive each doc. Remove STALE banners from confirmed-current docs.
Final rewrite of SPEC_INDEX.md.
Update CURRENT_STATE.md: "Spec layer clean — Phase 2 unblocked."

---

## OPEN QUESTIONS FOR JK
# These are pre-Phase B questions identified during the FRANCHISE_MODE_DEEP_DIVE
# verification pass. Require JK answers before or during B1.

### Q-001 — Rookie Salary: Draft Position vs Rating at Call-Up
**Source:** JK feedback §3.10 + FARM_SYSTEM_SPEC.md calculateRookieSalary()
**Conflict:** JK asked for salary based on draft position (ratings unknown until call-up).
FARM_SYSTEM_SPEC currently calculates rookie salary by rating at call-up (B = $1.2M, etc.).
These are mutually exclusive: draft-position salary means you commit a salary tier BEFORE
knowing the player's rating. Rating-at-call-up means salary is revealed at call-up.
**JK must decide:** Which model is correct?
- Option A: Draft position sets salary (round 1 pick = higher salary regardless of revealed rating)
- Option B: Call-up rating sets salary (current spec — rating revealed = salary set)
- Option C: Both — draft position sets a salary FLOOR; revealed rating can increase it but not lower it
**Impact:** FARM_SYSTEM_SPEC §calculateRookieSalary(), SALARY_SYSTEM_SPEC, DRAFT_FIGMA_SPEC

### Q-002 — Run Differential as Playoff Tiebreaker
**Source:** JK feedback §3.2 + search of all Feb 20 specs
**Status:** NOT in any spec. Only in FRANCHISE_MODE_DEEP_DIVE (marked as gap).
**JK confirmed:** "Playoff race tiebreaker is run differential in SMB4."
**Needs:** A line in FRANCHISE_MODE_SPEC §standings or PLAYOFF_SYSTEM_SPEC §seeding.
Also needs: run differential tracked per team in standings data model.
**Question:** Confirm this is the ONLY tiebreaker (not head-to-head record, etc.)?
**Impact:** FRANCHISE_MODE_SPEC, PLAYOFF_SYSTEM_SPEC, standings data model

### Q-003 — Prospect Draft in League Builder (Farm Population at Startup)
**Source:** JK feedback §3.10 / 3.22
**Status:** NOT in LEAGUE_BUILDER_SPEC. No farm population step at league creation.
**JK asked:** Each team should be able to populate their farm during League Builder
via a Prospect Draft, with scouts already assigned at that point.
**Questions:**
(a) Is this v1 scope or wishlist?
(b) If v1: does it happen as a separate draft step in League Builder, or does each
    team manually populate farm similar to how they populate the MLB roster?
(c) Scout assignment — do scouts get assigned in League Builder before the prospect draft?
**Impact:** LEAGUE_BUILDER_SPEC (new section), FARM_SYSTEM_SPEC, SCOUTING_SYSTEM_SPEC

### Q-004 — Stadium Change Mechanic (Offseason Dice Roll)
**Source:** JK feedback §3.3
**Status:** NOT in any spec. OFFSEASON_SYSTEM_SPEC has stadium selection for expansion
teams only, not an offseason change mechanic for existing teams.
**JK asked:** Ability to change stadiums in offseason (and possibly mid-season via REG).
Offseason: large dice roll — certain numbers allow user to choose, others assign
new stadium based on roll.
**Questions:**
(a) Is this v1 scope or wishlist? (Given it's a fun table-top RPG element, leaning v1)
(b) Which offseason phase does it belong to?
(c) Mid-season version via contextual events — same dice mechanic or different trigger?
**Impact:** OFFSEASON_SYSTEM_SPEC (new phase or sub-phase), potentially NARRATIVE_SYSTEM_SPEC

### Q-005 — Scout Grade Deviation: Fat-Tail vs Capped Deviation
**Source:** JK feedback on scouting + SCOUTING_SYSTEM_SPEC §3.2
**Conflict:** JK asked for probabilistic variance where scouts "sometimes get a position
super wrong and other times slightly wrong." Current spec uses deterministic max-deviation
formula: maxDeviation = floor((100 - accuracy) / 20) = max 2 grade steps.
This caps error and doesn't allow occasional big misses.
**JK needs to decide:** Should scout errors follow:
- Option A: Current spec — capped ±2 grade steps, uniform probability within range
- Option B: Fat-tail distribution — usually within ±1 step, but occasional ±3 or ±4 step
  disasters (e.g., a B prospect assessed as C-, or a C prospect assessed as B+)
- Option C: Per-position variance threshold (low-accuracy positions get wider possible error,
  high-accuracy positions stay tight)
**Impact:** SCOUTING_SYSTEM_SPEC §3.2 generateScoutedGrade()

### Q-006 — Team Captain Feature
**Source:** JK feedback §3.18
**Status:** NOT specced as a feature. OFFSEASON_SYSTEM_SPEC has personality/hidden modifier
interface but no team captain mechanic.
**JK asked:** A team captain designation based on hidden personality. Important for
team chemistry, loyal over time, risky to trade — fans may revolt if traded/sent down.
**Questions:**
(a) Is this v1 scope?
(b) How is captain determined — highest Loyalty hidden modifier? Longest tenure?
    Manual designation by user? Or auto-determined from personality + tenure?
(c) Is there a captain designation UI element (like Fan Favorite / Albatross)?
**Impact:** New section in DYNAMIC_DESIGNATIONS_SPEC or PERSONALITY_SYSTEM_SPEC

### Q-007 — Beat Reporter Pre-Decision Roster Move Warning
**Source:** JK feedback §3.10 (call-up/send-down narrative)
**Status:** NARRATIVE_SYSTEM_SPEC has callUpRecommendations and sendDownRecommendations
as AI-generated context, but the specific mechanic — a beat reporter pop-up that WARNS
the user BEFORE they execute a call-up/send-down based on hidden relationships — is not
explicitly specced as a UI flow.
**JK described:** "Calling up Dave Smith will hurt his morale because he's been bullied
by Bob Jones at the MLB level... We won't know how trustworthy these reports are."
**Questions:**
(a) Is this a pre-action modal/pop-up that interrupts the call-up/send-down flow?
(b) Does the pop-up always appear, or only when there's a notable relationship flag?
(c) The user doesn't know if the reporter is right until after executing — is there
    a retrospective "the reporter was right/wrong" feedback moment?
**Impact:** NARRATIVE_SYSTEM_SPEC §callUpRecommendations, FARM_SYSTEM_SPEC UI flow,
possibly a new FARM_MOVE_UI_SPEC or update to FINALIZE_ADVANCE_FIGMA_SPEC

---

## ITEMS CONFIRMED NOT MISSING (cleared during verification pass)

| Item | Where Found | Notes |
|------|-------------|-------|
| 3 options call-up/send-down rule | FARM_SYSTEM_SPEC §Options System | Fully specced |
| Random Event Generator (REG) | NARRATIVE_SYSTEM_SPEC v1.2 changelog | Deliberately absorbed into context-aware events system |
| No salary matching on trades | TRADE_SYSTEM_SPEC | Confirmed removed per Opus update list |
| Salary cap — no hard cap, soft pressure | SALARY_SYSTEM_SPEC §1 | "No salary cap, but soft cap affects fan pressure" |
| Farm unlimited during season / 10 at cutdown | FARM_SYSTEM_SPEC §Roster Constraints | Confirmed |
| Scout positional accuracy | SCOUTING_SYSTEM_SPEC §3.1 | Confirmed — but see Q-005 on variance model |
| Beat reporter → fan morale | NARRATIVE_SYSTEM_SPEC §3 | Beat reporter personalities confirmed to influence morale |
| Triple salary recalculation | OFFSEASON_SYSTEM_SPEC phases | Confirmed in Phases 3, 8, 10 |
| Personality hybrid 7 visible + 4 hidden | PERSONALITY_SYSTEM_SPEC | Confirmed |
| Contraction removed | OFFSEASON_SYSTEM_SPEC + FEATURE_WISHLIST | Confirmed |
| AI-controlled teams deferred | FEATURE_WISHLIST #16 | Confirmed deferred |

---

*Last updated: 2026-02-21*
*Next action: Execute Phase A this session, then begin B1 in next session*
