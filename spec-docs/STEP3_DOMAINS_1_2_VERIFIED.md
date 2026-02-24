# Step 3: Domains 1 & 2 — Re-Verified Reconciliation Matrix

**Date:** 2026-02-21
**Re-verification reason:** C-031 was a false finding (shallow GOSPEL read). JK mandated full-document re-verification of every finding that implicates GOSPEL before proceeding to Domain 3.
**Protocol:** For each finding, the FULL GOSPEL document (1807 lines) was read and all relevant references enumerated. Rule 5 of the SpecReconciliation skill now requires this for all future findings.

---

## Re-Verification Summary

| Outcome | Count | IDs |
|---------|-------|-----|
| **SURVIVES (unchanged)** | 23 | C-001, C-002, C-003, C-005, C-007, C-009, C-010, C-016, C-019, C-020, C-021, C-022, C-023, C-024, C-025, C-027, C-028, C-032, C-033, C-035, C-036, C-039 |
| **SURVIVES (reframed)** | 9 | C-004, C-008, C-011, C-017, C-018, C-026, C-029, C-030, C-034, C-037, C-040 |
| **WITHDRAWN** | 1 | C-031 |
| **DOWNGRADED** | 1 | C-038 |

---

## DOMAIN 1: GameTracker / Event Model (C-001 through C-022)

### C-001 — Quick Bar buttons (SURVIVES: STALE_SPEC)
- **Files:** GOSPEL §3.1 vs GAMETRACKER_DRAGDROP_SPEC
- **Claim:** GOSPEL defines Quick Bar with Balk in overflow; DRAGDROP predates this
- **GOSPEL coverage:** §3.1 line 461 (Quick Bar layout), line 468 (overflow includes "Balk"), §3.5 line 516 ("Misc" replaced by modifier registry)
- **Verdict:** SURVIVES — DRAGDROP predates the Quick Bar paradigm. Genuine STALE_SPEC.

### C-002 — Pinch hitter entry points (SURVIVES: CONTRADICTION)
- **Files:** GOSPEL §5.2 vs SUBSTITUTION_FLOW_SPEC §3.1
- **Claim:** GOSPEL has two entry points (Lineup card + Diamond tap); SUB_FLOW only mentions user-initiated
- **GOSPEL coverage:** §5.2 lines 664-676 — "Two entry points, same event: 1. Lineup card (comprehensive)... 2. Diamond tap (quick contextual)"
- **Verdict:** SURVIVES — Genuine gap. GOSPEL explicitly defines two entry points.

### C-003 — K/Kc distinction (SURVIVES: INCOMPLETE_SPEC)
- **Files:** GOSPEL §2.1, §3.1, §4.2 vs RUNNER_ADVANCEMENT_RULES
- **Claim:** GOSPEL defines K vs Kc toggle; RUNNER_ADV references D3K but not K/Kc
- **GOSPEL coverage:** §2.1 lines 105-108 (AtBatResult enum: `'K' | 'Kc'`), §3.1 line 466 (toggle), §4.2 line 578 (`[K or Kc?]` badge)
- **Verdict:** SURVIVES — GOSPEL clearly defines K/Kc. RUNNER_ADV gap is genuine.

### C-004 — Balk as outcome (SURVIVES: CONTRADICTION — reframed)
- **Files:** GOSPEL §2.2, §3.1 vs RUNNER_ADVANCEMENT_RULES §2,7
- **Claim:** GOSPEL lists Balk in overflow; RUNNER_ADV says "DO NOT IMPLEMENT"
- **GOSPEL coverage:** §2.2 line 244 (BetweenPlayEvent type includes `'balk'`), §3.1 line 468 (overflow menu includes "Balk"). Balk is a BetweenPlayEvent, NOT an AtBatResult — this is consistent in GOSPEL.
- **Reframe:** GOSPEL treats Balk as a between-play event (line 244) accessible from overflow UI (line 468). RUNNER_ADV's "DO NOT IMPLEMENT" may reflect SMB4 game mechanics (no balk in SMB4). GOSPEL as higher authority overrules, but JK should confirm whether SMB4 actually has balks.
- **Verdict:** SURVIVES — Genuine contradiction. GOSPEL explicitly adds it; RUNNER_ADV explicitly forbids it.

### C-005 — WP_K/PB_K result types (SURVIVES: CONTRADICTION)
- **Files:** GOSPEL §2.1 vs MASTER_BASEBALL_RULES
- **Claim:** GOSPEL defines hybrid result types; MASTER_BASEBALL_RULES treats K and WP/PB as separate
- **GOSPEL coverage:** §2.1 lines 106-107 — `'WP_K' | 'PB_K'` in AtBatResult enum
- **Verdict:** SURVIVES — GOSPEL explicitly models dropped third strikes as hybrid types.

### C-007 — Pitch count capture timing (SURVIVES: ALIGNMENT_GAP)
- **Files:** GOSPEL §4.6, §2.2 vs PITCH_COUNT_TRACKING_SPEC
- **Claim:** Inconsistent mandatory timing triggers
- **GOSPEL coverage:** §4.6 lines 611-614 (half-inning optional, pitcher removed + end of game required), §2.2 lines 300-304 (pitchCountUpdate payload with timing field)
- **Verdict:** SURVIVES — GOSPEL defines three timing contexts. Spec may differ on which are mandatory.

### C-008 — Exit type implicit vs optional (SURVIVES: reframed to COMPATIBLE)
- **Files:** GOSPEL §2.1, §3.1, §3.5, §4.3 vs GAMETRACKER_DRAGDROP_SPEC
- **Claim:** GOSPEL says exitType is optional enrichment; DRAGDROP says implicitly captured
- **GOSPEL coverage:** §2.1 line 196 (optional field), §3.1 line 465 (GO=ground, FO=fly implicit), §3.5 line 512 (implicit in button OR optional enrichment), §4.3 lines 586-587 (spray chart overrides implicit type)
- **Reframe:** GOSPEL is internally consistent — exit type starts implicit from button choice, stored as optional enrichment field, can be refined later. DRAGDROP's approach is the pre-Quick-Bar version.
- **Verdict:** SURVIVES but reclassify as INTERACTION_MODEL_SHIFT (not AMBIGUITY).

### C-009 — Play log UI paradigm (SURVIVES: INTERACTION_MODEL_SHIFT)
- **Files:** GOSPEL §4.2, §13.2 vs GAMETRACKER_DRAGDROP_SPEC
- **GOSPEL coverage:** §4.2 lines 568-579 (persistent play log with badges), §13.2 lines 1502-1508 (iPad right panel)
- **Verdict:** SURVIVES — Genuine paradigm shift from ephemeral to persistent play log.

### C-010 — Position change without substitution (SURVIVES: TERMINOLOGY_GAP)
- **Files:** GOSPEL §5.5, §2.2, §5.2 vs SUBSTITUTION_FLOW_SPEC
- **GOSPEL coverage:** §5.5 lines 702-706 (position change without sub, Diamond tap → [Move Position]), §2.2 line 275 (`'position_change'` in substitution types)
- **Verdict:** SURVIVES — GOSPEL explicitly adds this feature. SUB_FLOW gap is genuine.

### C-011 — Triple play recording (SURVIVES: reframed to UI_DOC_GAP)
- **Files:** GOSPEL §3.1, §2.1 vs MASTER_BASEBALL_RULES
- **Claim:** GOSPEL overflow omits TP
- **GOSPEL coverage:** §3.1 line 468 — overflow lists "PO, 3B, HBP, E, FC, DP, SAC, SF, IBB, WP_K, PB_K, Balk" — NO TP. BUT §2.1 line 106 — AtBatResult enum DOES include `'TP'`: `'DP' | 'TP'`.
- **Reframe:** The EVENT MODEL supports TP (line 106). The overflow UI menu listing (line 468) simply omits it. Data model is fine; UI documentation has a gap.
- **Verdict:** SURVIVES — Downgrade from OMISSION to UI_DOC_GAP.

### C-016 — Pitch count on reliever entry (SURVIVES: AMBIGUITY)
- **Files:** SUB_FLOW, PITCH_COUNT, GOSPEL §4.6, §5.4, §2.2
- **GOSPEL coverage:** §4.6 lines 611-614 (required when pitcher removed), §5.4 lines 696-700 (outgoing pitcher's count recorded), §2.2 lines 266-272 (pitcherChange payload: `outgoingPitchCount`)
- **Verdict:** SURVIVES — GOSPEL clear about OUTGOING pitcher count. Ambiguity about incoming reliever is genuine.

### C-017 — GO→DP auto-correction (SURVIVES: reframed to DESIGN_CONFLICT)
- **Files:** GOSPEL §3.6 vs GAMETRACKER_BUGS BUG-003
- **Claim:** GOSPEL doesn't mention auto-correction
- **GOSPEL coverage:** §3.6 lines 530-534 — explicitly describes the scenario: "If actually a DP: User taps [DP] from overflow instead, or taps the play log entry to change to DP." Line 554 — "defaults handle common case silently. Corrections are always available via the play log."
- **Reframe:** GOSPEL DOES address this — §3.6 explicitly rejects auto-correction in favor of manual correction via play log or overflow. BUG-003's expectation of auto-correction directly conflicts with GOSPEL's explicit design.
- **Verdict:** SURVIVES — Upgrade to DESIGN_CONFLICT. GOSPEL explicitly chooses manual correction; BUG-003 expects auto-correction.

### C-018 — 3rd-out force play negation (SURVIVES: reframed to DOCUMENTATION_GAP)
- **Files:** INHERITED_RUNNERS_SPEC vs GOSPEL §2.1
- **GOSPEL coverage:** §2.1 lines 186-189 — `runnerOutcomes`, `rbis`, `runsScored`, `outsRecorded` fields present. These CAN capture the validation.
- **Reframe:** Event model fields ARE sufficient for this validation. Gap is in explicit documentation of the validation logic, not the data model.
- **Verdict:** SURVIVES — Downgrade from IMPLEMENTATION_GAP to DOCUMENTATION_GAP.

### C-019 — RunnerOutcome interface (SURVIVES: INCOMPLETE_INTERFACE)
- **Files:** RUNNER_ADVANCEMENT_RULES vs GOSPEL §2.1
- **GOSPEL coverage:** §2.1 line 186 — `runnerOutcomes: RunnerOutcome[]` referenced but RunnerOutcome interface never defined in GOSPEL (confirmed by searching all 1807 lines)
- **Verdict:** SURVIVES — Genuine incomplete interface definition.

### C-020, C-021, C-022 — Stale references (SURVIVES: STALE_REF)
- These reference archived Master Spec. Not GOSPEL content issues.
- **Verdict:** SURVIVES — Stale references to archived files.

---

## DOMAIN 2: Stats Pipeline (C-023 through C-040)

### C-023 — MWAR spec stale reference (SURVIVES: STALE_REF)
- **GOSPEL coverage:** §9.4 line 1074 (MWAR listed as "Valid"), Appendix B line 1792 (MWAR formulas unchanged)
- **Verdict:** SURVIVES — Stale header reference in MWAR spec, not a GOSPEL issue.

### C-024 — LI Multiplier semantic framing (SURVIVES: AMBIGUITY)
- **GOSPEL coverage:** Defers to LEVERAGE_INDEX_SPEC (§9.4 line 1075) and PWAR. Spec-to-spec issue.
- **Verdict:** SURVIVES — GOSPEL not implicated.

### C-025 — Contact Quality vs LI-only in Clutch (SURVIVES: CONTRADICTION)
- **GOSPEL coverage:** §9.4 line 1075 (CLUTCH_ATTRIBUTION "Valid"), §2.1 line 192 (`clutchValue?`), §6.4 line 743 (mojo affects clutch weighting)
- **Verdict:** SURVIVES — Genuine spec-to-spec contradiction. GOSPEL validates both specs but doesn't resolve their disagreement.

### C-026 — WAR input data pipeline (SURVIVES: reframed to COMPATIBLE_NUANCE)
- **GOSPEL coverage:** §9 lines 994-1086 (full pipeline), §9.4 line 1071 (STAT_TRACKING "Valid"), line 1085 ("No existing spec is invalidated")
- **Reframe:** Our Phase B annotation on STAT_TRACKING ("input pipeline shifts to event consumption") is compatible with GOSPEL's §9.4 "Valid" status. Aggregation logic is valid; input mechanism changes. These are complementary, not contradictory.
- **Verdict:** SURVIVES — Downgrade from AMBIGUITY to COMPATIBLE_NUANCE.

### C-027 — IBB in FIP (SURVIVES: CONTRADICTION)
- Spec-to-spec issue between PITCHER_STATS and PWAR. GOSPEL defers to both.
- **Verdict:** SURVIVES — Genuine contradiction.

### C-028 — Runs-Per-Win consistency (SURVIVES: CONSISTENCY_OK)
- **Verdict:** SURVIVES — Positive finding, no issue.

### C-029 — clutchValue field flow (SURVIVES: reframed to EXPECTED_DELEGATION)
- **GOSPEL coverage:** §2.1 line 192 (`clutchValue?: number; // Clutch attribution score`), §9.4 line 1075 (CLUTCH_ATTRIBUTION_SPEC "Valid")
- **Reframe:** GOSPEL defines the field; CLUTCH_ATTRIBUTION defines the calculation. This is proper separation of concerns, not an ambiguity.
- **Verdict:** SURVIVES — Downgrade from AMBIGUITY to EXPECTED_DELEGATION.

### C-030 — LI calculation not in GOSPEL (SURVIVES: reframed to EXPECTED_DELEGATION)
- **GOSPEL coverage:** §2.1 line 126 (`leverageIndex: number`), §9.4 line 1075 (LEVERAGE_INDEX_SPEC "Valid"), §14.2 line 1574 (`leverageCalculator.ts` rewired)
- **Reframe:** GOSPEL intentionally delegates LI calculation to LEVERAGE_INDEX_SPEC. The architecture doc defines WHAT, the formula spec defines HOW.
- **Verdict:** SURVIVES — Downgrade from MISSING_DETAIL to EXPECTED_DELEGATION.

### C-031 — Manager Decision Tracking / mWAR (❌ WITHDRAWN)
- **Original claim:** "GOSPEL §8 (Narrative) does NOT mention manager decision tracking or mWAR calculation system"
- **GOSPEL coverage (EXHAUSTIVE):**
  - §5.1 line 660 — "Steal attempt = manager decision → mWAR"
  - §5.2 line 679 — "Pinch-hit HR in high leverage... manager's mWAR"
  - §5.3 lines 681-694 — FULL section: "Manager Moments" — LI > 2.0 threshold, decision recording, season tracking, mWAR feed, narrative integration
  - §2.2 lines 306-313 — managerMoment payload: 8 decision types with leverageIndex, context, outcomeWPA
  - §6.4 line 744 — "Fitness state at end of game informs pitcher usage patterns for mWAR"
  - §8.1 line 825 — "Manager performance evaluation → firing risk from mWAR"
  - §8.2 line 857 — "Manager aggression metric (mWAR)"
  - §8.2 line 873 — "mWAR contribution"
  - §9.4 line 1074 — MWAR spec listed as "Valid"
  - §10.4 line 1181 — PlayerTradeProfile includes mWAR
  - §14.1 line 1651 — Fix mWAR hardcoded 'season-1' (F-110)
  - Appendix B line 1792 — MWAR formulas unchanged
- **Withdrawal reason:** GOSPEL mentions mWAR 11 times across 7+ sections. §5.3 is a FULL SECTION on Manager Moments that directly feeds mWAR. The original finding was produced by a subagent that only read GOSPEL §2, §4, §8, and §9.4 — missing §5 entirely. This is the canonical example of the shallow-read failure that Rule 5 now prevents.

### C-032 — Inherited runners ER attribution (SURVIVES: MISSING_DETAIL)
- **GOSPEL coverage:** §5.4 line 700 (inherited runners ER attribution rule explicitly stated), §2.2 lines 266-272 (pitcherChange payload), §9.4 line 1079 (INHERITED_RUNNERS_SPEC "Valid")
- **Verdict:** SURVIVES — GOSPEL clarifies the ER rule (§5.4 line 700) but the spec-to-spec cross-reference gap between PITCHER_STATS and PWAR is genuine.

### C-033 — armFactor in CLUTCH vs FWAR (SURVIVES: CONTRADICTION)
- Spec-to-spec issue. GOSPEL defers to both.
- **Verdict:** SURVIVES — Genuine contradiction.

### C-034 — Baserunning WAR scope (SURVIVES: reframed)
- **GOSPEL coverage:** §2.2 lines 258-264 (SB/CS BetweenPlayEvent), §5.1 lines 643-660 (runner actions, line 658: "SB/CS → rWAR"), §9.4 line 1074 (RWAR spec "Valid")
- **Reframe:** GOSPEL explicitly maps SB/CS → rWAR (line 658). The gap is in ADVANCED rWAR components (UBR, wGDP) that need enrichment data beyond basic events. Basic rWAR from stolen bases IS covered.
- **Verdict:** SURVIVES — Reframe from "limited tracking" to "advanced components need enrichment."

### C-035 — LI usage consistency (SURVIVES: CONSISTENCY_CHECK)
- GOSPEL defers to individual specs. Cross-spec consistency issue.
- **Verdict:** SURVIVES — Not a GOSPEL issue.

### C-036 — PITCHER_STATS/PWAR scope boundary (SURVIVES: AMBIGUITY)
- Spec-to-spec interface gap. GOSPEL lists both as "Valid."
- **Verdict:** SURVIVES — Not a GOSPEL issue.

### C-037 — STAT_TRACKING annotation vs §9.4 (SURVIVES: reframed to COMPATIBLE_ANNOTATION)
- **GOSPEL coverage:** §9.4 line 1071 (STAT_TRACKING "Valid"), line 1085 ("No existing spec is invalidated")
- **Reframe:** Our Phase B annotation and GOSPEL §9.4 are compatible. "Valid" means aggregation logic is valid. Annotation adds that input mechanism changes. No contradiction.
- **Verdict:** SURVIVES — Downgrade from PARTIAL_SUPERSESSION to COMPATIBLE_ANNOTATION.

### C-038 — Manager Decision Recording (DOWNGRADED to MINOR_ALIGNMENT)
- **Original type:** AMBIGUITY — "GOSPEL does not document the inference system"
- **GOSPEL coverage (FULL):** §5.3 lines 681-694 — FULL documentation of Manager Moments system: LI > 2.0 threshold (line 683), visual indicator (line 685), recording as BetweenPlayEvent (lines 685-686), season tracking stats (lines 687-691), mWAR feed (line 692), narrative integration (line 694). §2.2 lines 306-313 — managerMoment payload with 8 decision types.
- **Reframe:** GOSPEL §5.3 IS the documentation of the "inference system" — LI threshold triggers Manager Moment state, user's next action is recorded as the decision. The "5+ categories" from MWAR spec maps to GOSPEL's 8 `decisionType` values. Only minor enumeration alignment needed.
- **Verdict:** DOWNGRADED from AMBIGUITY to MINOR_ALIGNMENT.

### C-039 — Shift-based defensive adjustments (SURVIVES: MISSING_DETAIL)
- Spec-to-spec gap between CLUTCH and FWAR. GOSPEL doesn't mention shifts. SMB4 may not have shifts.
- **Verdict:** SURVIVES — Not a GOSPEL issue.

### C-040 — LI calculation complexity (SURVIVES: reframed to EXPECTED_DELEGATION)
- **GOSPEL coverage:** §2.1 line 126 (`leverageIndex: number`), §9.4 line 1075 (LEVERAGE_INDEX_SPEC "Valid"), §14.2 line 1574 (`leverageCalculator.ts`)
- **Reframe:** Same as C-030 — GOSPEL delegates calculation to LEVERAGE_INDEX_SPEC by design.
- **Verdict:** SURVIVES — Downgrade from MISSING_DETAIL to EXPECTED_DELEGATION.

---

## Step 4 Decision Queue (Contradictions Only)

These require JK decision. Sorted by severity:

| Priority | ID | Topic | Core Question |
|----------|-----|-------|---------------|
| 1 | **C-004** | Balk in GOSPEL vs "DO NOT IMPLEMENT" in RUNNER_ADV | Does SMB4 have balks? GOSPEL wins by authority, but RUNNER_ADV may have valid SMB4 reasoning. |
| 2 | **C-005** | WP_K/PB_K hybrid types vs separate events | Keep GOSPEL's hybrid modeling or split into separate events? |
| 3 | **C-002** | Pinch hitter entry points (2 vs 1) | GOSPEL wins by authority. SUB_FLOW needs update. |
| 4 | **C-025** | Clutch: CQ system vs LI-only | Which clutch attribution model? Both specs are "Valid" per GOSPEL. |
| 5 | **C-027** | IBB exclusion from FIP | Does IBB count in BB for FIP formula? |
| 6 | **C-033** | armFactor in clutch vs not in FWAR | Is armFactor used in clutch calculations? |
| 7 | **C-017** | GO→DP: auto-correct vs manual play log | GOSPEL explicitly chooses manual. BUG-003 expects auto. GOSPEL wins. |
| 8 | **C-011** | TP missing from overflow UI list | TP in data model (line 106) but not in UI menu (line 468). Add to overflow? |

---

## Cross-Spec Re-Scan Findings (Domain 2) — Added 2026-02-22

*These findings were identified by re-scanning all Domain 2 specs against each other (not just against GOSPEL), per the cross-spec reconciliation rule added to SKILL.md after the FAN_FAVORITE_SYSTEM_SPEC protocol failure.*

### C-058 — wOBA Scale Internal Inconsistency (BWAR)
- **File:** BWAR_CALCULATION_SPEC.md (internal conflict)
- **Header (lines 8-12):** "wOBA Scale: 1.7821 (SMB4) vs 1.226 (MLB)"
- **Section 4 (line 182):** `const WOBA_SCALE = 1.226;` with comment "Varies by year/league"
- **Conflict:** Header claims SMB4 uses 1.7821, but code initialization uses 1.226 (MLB value). Stale code comment.
- **Type:** INTERNAL_INCONSISTENCY

### C-059 — FIP Constant Calibration Undocumented (PWAR vs BWAR)
- **Files:** PWAR_CALCULATION_SPEC.md §4 vs BWAR_CALCULATION_SPEC.md §4
- **PWAR (lines 153-155):** Explicitly states FIP constant = 3.28 for SMB4
- **BWAR (line 182):** Says "SMB4-calibrated values that differ from MLB baselines" without specifying values
- **Gap:** PWAR documents its SMB4 calibration; BWAR doesn't. Unclear if they share the same constants.
- **Type:** DOCUMENTATION_GAP

### C-060 — Fielding Chance vs fWAR Credit Boundary
- **Files:** FIELDING_SYSTEM_SPEC.md §1.1 vs FWAR_CALCULATION_SPEC.md §5
- **FIELDING (lines 69-121):** "Clean Hit (1B, 2B, 3B) → No fielding chance recorded"
- **FWAR (line 239):** Assigns run values to all putouts: "Routine fly ball → +0.04"
- **Gap:** If no fielding chance is recorded for a clean hit, does the fielder get fWAR credit? fWAR calculates from putouts/assists without distinguishing "chance recorded" vs "no chance." Boundary undefined.
- **Type:** AMBIGUITY

### C-061 — FWAR impactMultiplier Not In Other WAR Specs
- **Files:** FWAR_CALCULATION_SPEC.md §2 vs BWAR_CALCULATION_SPEC.md §2 vs PWAR_CALCULATION_SPEC.md §2
- **FWAR (lines 76-90):** Defines `runsPerWin` AND `impactMultiplier = 162 / seasonGames`
- **BWAR/PWAR:** Only define `runsPerWin = 10 × (seasonGames / 162)`. No "impactMultiplier."
- **Gap:** FWAR uses an additional scaling term. For non-162-game seasons, fielding WAR would scale differently than batting/pitching WAR if implementations follow specs literally.
- **Type:** CONSISTENCY_GAP

### C-062 — mWAR 70% Unattributed vs Player WAR Independence
- **Files:** MWAR_CALCULATION_SPEC.md §2 vs BWAR/PWAR/FWAR (implicit)
- **MWAR (lines 104-115):** "70% is intentionally NOT redistributed to player WAR... Player WAR is calculated independently"
- **BWAR/PWAR/FWAR:** Calculate player WAR from individual performance with no acknowledgment of mWAR's unattributed portion
- **Gap:** Total attributed WAR (sum of player WAR + 30% mWAR) will systematically undercount actual team wins. No spec addresses this reconciliation or states it's intentional.
- **Type:** CONCEPTUAL_GAP

---

*Re-verification complete. All findings that implicate GOSPEL now include exhaustive GOSPEL location citations.*
*C-031 WITHDRAWN. C-038 DOWNGRADED. 9 findings REFRAMED with more precise characterization.*
*Cross-spec re-scan added 5 findings (C-058 through C-062) on 2026-02-22.*
