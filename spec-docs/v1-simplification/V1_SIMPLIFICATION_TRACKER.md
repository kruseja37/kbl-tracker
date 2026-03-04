# V1 SIMPLIFICATION — SESSION TRACKER

## Status Overview

| Document | Status | Sections Total | Triaged | Remaining |
|---|---|---|---|---|
| MODE_2_FRANCHISE_SEASON | ✅ COMPLETE | 28 | 28 | 0 |
| MODE_1_LEAGUE_BUILDER | ✅ COMPLETE | 16 | 16 | 0 |
| MODE_3_OFFSEASON_WORKSHOP | NOT STARTED | 21 | 0 | 21 |
| ALMANAC | NOT STARTED | 10 | 0 | 10 |

**Current Phase:** A — Spec Triage
**Next Action:** Begin Mode 3 triage at §1 of MODE_3_OFFSEASON_WORKSHOP

---

## Session Log

## Session 1 — 2026-03-02
**Document:** MODE_2_FRANCHISE_SEASON_UPDATED
**Sections completed:** §1 (partial — ruling given, clarification pending)
**Key decisions:**
- §1 ruled SIMPLIFY but 3 clarifying questions left unanswered
**Resume point:** §1 SIMPLIFY clarification, then §2
**Open questions:**
- §1.5 handoff list trim?
- §1.6 competitive position table cut?
- §1.1 scope statement trim or caveat?

## Session 2 — 2026-03-02
**Document:** MODE_2_FRANCHISE_SEASON_UPDATED
**Sections completed:** §1 through §9
**Key decisions:**
- §1 SIMPLIFY: Cut §1.6 competitive position table. Keep all 10 handoff outputs. Scope statement keeps "subject to triage" caveat.
- §2 SIMPLIFY: Keep full fat event model. Trim TransactionEvent to 8 of 11 types (cut dfa, waiver, contract_extension).
- §3 KEEP AS-IS: Core GameTracker UX stays complete.
- §4 SIMPLIFY: Keep all 6 enrichment types. Defer pitch type repertoire filtering + between-inning enrichment prompts.
- §5 KEEP AS-IS: All between-play events including manager moments.
- §6 KEEP AS-IS: Full baseball rulebook.
- §7 SIMPLIFY: Defer double switch as atomic op. Add batting order swap operation instead.
- §8 SIMPLIFY: Keep all stats + achievements. Cut storage cost projections.
- §9 SIMPLIFY: Defer pitch count estimation system. Require manual entry with skip.
**Resume point:** §10 — Fielding System of MODE_2_FRANCHISE_SEASON_UPDATED
**Open questions:**
- §10 was presented but not yet ruled (3 triage questions pending for Session 3)

## Session 3 — 2026-03-02
**Document:** MODE_2_FRANCHISE_SEASON_UPDATED
**Sections completed:** §10
**Key decisions:**
- §10 SIMPLIFY: Keep all 8 star play categories, all error types, full fWAR formula. Simplify fielder inference to primary-only (drop probability tiers). LI=1.0 fallback if §12 deferred.
- §11 SIMPLIFY: Keep all 5 WAR components (bWAR, pWAR, fWAR, rWAR, mWAR) with full formulas. mWAR keeps both halves (decision + overperformance). Defer calibration system to v2 (multi-season feature).
- §12 KEEP AS-IS: Full LI system — lookup table, calculation, SMB4 adaptation, WPA on every event. Load-bearing for 4+ other v1 systems.
- §13 SIMPLIFY (spec correction): Keep WPA core, CQ attribution, all play-type tables, playoff multipliers. Relabel §13.6 as Fame Trigger Stacking (stays in §13, routes to fame accumulator). Spec gap identified: Fame System needs canonical home section — to be written during v1 draft consolidation.
- §14 SIMPLIFY: Keep all mojo/fitness states, user-observed input, performance splits, WAR/clutch/fame multipliers. Simplify Juiced to pure state-read (no engine eligibility/cooldown). Engine reads state → computes downstream effects, nothing else.
- §15 SIMPLIFY (spec gaps flagged): Keep full modifier registry architecture + chemistry-trait potency. Strip mojo/fitness-setting examples from §15.4. New hard boundary: random events CAN modify stats/traits/fame/morale, CANNOT modify mojo/fitness. Spec gap: random event catalog needs scoping post-triage.
- §16 KEEP AS-IS: Full narrative system — beat reporter with 10 personalities, INSIDER reveal, morale influence, captain storylines, reporter firing/hiring, LLM routing (ship with integration), player quotes, all 4 UI surfaces.
**Resume point:** §17 — Dynamic Designations
**Open questions:**
- §17 was presented with 3 triage questions but not yet ruled. Pending JK answers for Session 4.

## Session 4 — 2026-03-03
**Document:** MODE_2_FRANCHISE_SEASON_UPDATED
**Sections completed:** §17 through §23
**Key decisions:**
- §17 KEEP AS-IS: All 7 designation types, full player morale system (5 states, 17 inputs), establishment multiplier, all data schemas.
- §18 SIMPLIFY: Keep all single-game/season/team milestones, adaptive scaling, fixed career floors, franchise firsts. Defer dynamic top-10% career thresholds (needs 10+ careers) and legacy status tiers (multi-season, invisible in season 1).
- §19 DEFER ENTIRELY: Fan Fav/Albatross trade mechanics removed. Concept absorbed into §20 fan morale via True Value-based roster factor. SPEC CORRECTION: designations never carry over on trade.
- §20 SIMPLIFY (spec correction): Revised formula weights 50/20/10/10/10 — added "rest of roster" True Value factor absorbing §19's concept. Trade scrutiny kept (simple implementation). Nothing deferred.
- §21 KEEP AS-IS: Full standings + playoffs. Pythagorean win% stays (load-bearing for mWAR).
- §22 SIMPLIFY: Removed SIMULATE button and AI game logic. v1 has "Score" and "Skip" buttons only for ALL games. Deferred season classification. Trade deadline kept. Each game tied to fictional calendar date.
- §23 KEEP AS-IS: Full adaptive standards engine — opportunity factor, scaling rules, SMB4 defaults, qualification thresholds, min floors, positional adjustments.
**Resume point:** §24 — Stadium Analytics & Park Factors
**Open questions:** None — §24 not yet presented.

## Session 5 — 2026-03-03
**Document:** MODE_2_FRANCHISE_SEASON_UPDATED
**Sections completed:** §24 through §28 — **MODE 2 TRIAGE COMPLETE**
**Key decisions:**
- §24 SIMPLIFY: Keep full park factor system + spray chart with heat map viz (per-player, per-team, pitcher matchup filters). Remove exit velocity (can't observe in SMB4). Keep confidence blending (simple arithmetic with 40% activation floor).
- §25 DEFER ENTIRELY: No simulation in v1. No "simplified box-score generator" either. All 4 interfaces stripped until v2. Box score for played games = display of existing GameTracker + Stats Pipeline data, not simulation.
- §26 SIMPLIFY: Keep data flow diagram (free reference) + SeasonSummary handoff contract (unique artifact, Mode 3 boundary). Defer Cold storage export tier (unscoped). Remove `seasonClassification` from handoff (always PRIMARY).
- §27 DEFER ENTIRELY: V2_DEFERRED_BACKLOG.md is now authoritative deferral record. §27 summary table is stale and redundant.
- §28 KEEP AS-IS: Decision traceability appendix. Zero code cost, aids provenance.
**Cross-reference reconciliation:** PASSED — no blocking conflicts. 5 spec gaps identified for v1 draft consolidation (Fame System section, Random Event Catalog, box score UI, INSIDER reveal Mode 1 dep, True Value Mode 1 dep).
**Resume point:** Begin Mode 1 triage at §1 of MODE_1_LEAGUE_BUILDER
**Open questions:** None.

## Session 6 — 2026-03-03
**Document:** MODE_1_LEAGUE_BUILDER_FINAL
**Sections completed:** §1 through §9
**Key decisions:**
- §1 SIMPLIFY: Keep all 9 outputs, all 3 NPC types (reporter/manager/scout), salary confirmed v1. Defer "Playoff Mode" entry point (§11.7).
- §2 SIMPLIFY: Keep all 3 franchise types. Remove `aiScoreEntry` (redundant with v1 Score/Skip). Replace per-phase offseason scope config with single global toggle (all-teams vs human-only). Awards Ceremony toggle stays standalone.
- §3 KEEP AS-IS: Full leagues module — CRUD, 3 interfaces, 5-step creation flow, structural constraints.
- §4 SIMPLIFY: Keep all 6 CRUD ops + CSV import. Strip 3 metadata fields (foundedYear, championships, retiredNumbers) — franchise history, not team template data.
- §5 KEEP AS-IS (spec correction): Full player model, salary stays (non-negotiable), all 65 traits, full generation system. SML analysis complete. Stale trait note corrected — SML players now have trait data.
- §6 KEEP AS-IS (2 spec corrections): Full personality/trait assignment. Corrected stale trait note. Clarified: trait generation only for generated players; all players get personality + hidden modifiers.
- §7 KEEP AS-IS: Full rosters module — depth chart, non-blocking validation.
- §8 KEEP AS-IS (spec gap): Full draft module — all 3 formats (snake/straight/auction), all 3 AI strategies + team archetypes, full scout accuracy system. Auction draft mechanics need spec (budget tied to salary system for competitive balance).
- §9 SIMPLIFY: Remove ALL presets (user configures to match SMB4 console settings). Remove AI behavior sliders (6 sliders). Remove pitchCounts and moundVisits settings. `defaultRulesPresetId` on LeagueTemplate now unnecessary.
**Resume point:** §10 — Schedule Setup of MODE_1_LEAGUE_BUILDER_FINAL
**Open questions:** None — §10 not yet presented.
**Spec gaps accumulated:** Auction draft mechanics (§8), LeagueTemplate preset field removal (§9→§3.3).

## Session 7 — 2026-03-04
**Document:** MODE_1_LEAGUE_BUILDER_FINAL
**Sections completed:** §10 through §16 — **MODE 1 TRIAGE COMPLETE**
**Key decisions:**
- §10 SIMPLIFY: Keep CSV upload + manual entry. Remove Screenshot/OCR. Strip SIMULATED from GameStatus enum (not dormant).
- §11 SIMPLIFY: Keep full 6-step wizard. Strip preset references (per §9). Propagate §2 corrections (aiScoreEntry removed, offseasonScope simplified). Salary calculation runs before any draft type. Playoff Mode deferred per §1.
- §12 KEEP AS-IS (spec corrections): Full 11-step init sequence. 3 stale references corrected (rulesPresetId → inline config, aiScoreEntry removed, offseasonPhaseScopes → simplified).
- §13 SIMPLIFY: Keep full 2-tier data architecture, all stores, estimates, franchise management. Remove legacy migration (v1 = fresh start). Remove rulesPresets global store (per §9).
- §14 DEFER ENTIRELY: V2 material table redundant with V2_DEFERRED_BACKLOG.md (same as Mode 2 §27).
- §15 KEEP AS-IS: Cross-references appendix (zero code cost, provenance).
- §16 KEEP AS-IS: Decision traceability appendix (zero code cost, provenance).
**Cross-reference reconciliation:** PASSED — no blocking conflicts. All KEEP sections have dependencies satisfied. All spec corrections internally consistent.
**Resume point:** Begin Mode 3 triage at §1 of MODE_3_OFFSEASON_WORKSHOP
**Open questions:** None.
**Spec gaps accumulated (Mode 1 total):** Auction draft mechanics (§8), LeagueTemplate preset field removal (§9→§3.3).
