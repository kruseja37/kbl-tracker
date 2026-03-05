# V1 SIMPLIFICATION — SESSION TRACKER

## Status Overview

| Document | Status | Sections Total | Triaged | Remaining |
|---|---|---|---|---|
| MODE_2_FRANCHISE_SEASON | ✅ COMPLETE | 28 | 28 | 0 |
| MODE_1_LEAGUE_BUILDER | ✅ COMPLETE | 16 | 16 | 0 |
| MODE_3_OFFSEASON_WORKSHOP | ✅ COMPLETE | 21 | 21 | 0 |
| ALMANAC | ✅ COMPLETE | 10 | 10 | 0 |

**Current Phase:** A — Spec Triage — ✅ COMPLETE
**Next Action:** Begin Phase B — V1 Spec Assembly (produce four _V1_FINAL.md documents + V2_DEFERRED_BACKLOG.md)

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

## Session 8 — 2026-03-04
**Document:** MODE_3_OFFSEASON_WORKSHOP
**Sections completed:** §1 through §8
**Key decisions:**
- §1 KEEP AS-IS: Full 13-phase structure, all 12 outputs, all 7 principles. Cosmetic correction to §1.3 AI simulation reference.
- §2 SIMPLIFY: Game Night Mode only (Streamlined deferred). Offseason scope expanded to 3-value selector (default/human-only/all-teams). MODE 1 §2 CORRECTION: offseasonScope type changes from binary to 3-value.
- §3 KEEP AS-IS (spec corrections): Championship fame bonus +1→+3. Fitness reset added alongside mojo reset in Phase 1.
- §4 SIMPLIFY: All 13 award screens keep. Defer 5% regular player trait lottery. Team Captain REMOVED from Awards Ceremony — moves to Phase 13 (Finalize & Advance) after all roster changes.
- §5 KEEP AS-IS: Full EOS ratings + salary recalc #1. All formulas, position detection, manager distribution, farm call-up threshold.
- §6 SIMPLIFY: Full expansion draft keeps. Stadium change keeps. Remove "create custom" stadium option (no basis in SMB4).
- §7 SIMPLIFY: Three dice roll rounds per team (not one). Defer un-retirement (retired stays retired in v1).
- §8 SIMPLIFY: Full 2-round FA with dice rolls + personality destinations. Revised fallback: user selects exchange player if ±30% fails. REMOVED §8.4 Free Agent Pool Signing entirely — incompatible with 1-for-1 exchange model (spec error from prior hallucination).
**Resume point:** §9 — Phase 7: Draft of MODE_3_OFFSEASON_WORKSHOP
**Open questions:** None.
**Spec corrections accumulated:** Mode 1 §2 offseasonScope 3-value expansion, championship fame +3, fitness reset in Phase 1, Team Captain → Phase 13, custom stadium removed, 3 retirement rounds, FA pool signing removed.

## Session 9 — 2026-03-04
**Document:** MODE_3_OFFSEASON_WORKSHOP
**Sections completed:** §9 through §21 — **MODE 3 TRIAGE COMPLETE**
**Key decisions:**
- §9 SIMPLIFY: Remove Screen 1 (un-retirement via draft, per §7 ruling). 8-screen flow. Traits HIDDEN at draft — only scouted grade, primary/secondary position, chemistry, personality, potential ceiling visible. True ratings + traits revealed at call-up. Full scouting accuracy system + auto-draft for AI teams kept.
- §10 KEEP AS-IS: Salary recalc #2 — pass 2 of 3, same formula on updated rosters.
- §11 SIMPLIFY: 7-screen flow (remove AI-initiated trade proposals, Screens 5–6). V1 is user-initiated only. AI trade logic (5-factor weighted) kept for AI-controlled teams responding to user proposals. Waiver wire source corrected: cut players from offseason phases, NOT retirements.
- §12 KEEP AS-IS: Salary recalc #3 — pass 3 of 3, locks definitive baseline.
- §13 KEEP AS-IS: Farm reconciliation — 10-player max enforcement, option counter reset, farm morale update (4 factors, no recentPerformance).
- §14 KEEP AS-IS: Chemistry rebalancing — composition count, 4-tier table, trait potency multiplier. 3 screens.
- §15 KEEP AS-IS (spec correction): 12 screens (added Team Captain Designation as Screen 9, per §4 ruling). Call-up reveals traits + true ratings. Demotion retirement risk (5-factor table). Full SeasonArchive interface (11 fields).
- §16 KEEP AS-IS (2 corrections): Team Captain reference → Phase 13. Remove un-retirement from §16.6 prospect generation.
- §17 KEEP AS-IS (1 correction): Phase 9 AI resolution description corrected for user-initiated only.
- §18 KEEP AS-IS: 8 IndexedDB stores, 3 cross-store patterns, sequential state machine.
- §19 KEEP AS-IS (updated): V2 table expanded with 5 new deferrals from triage. V2_DEFERRED_BACKLOG.md noted as authoritative.
- §20 KEEP AS-IS: Cross-references appendix.
- §21 KEEP AS-IS (1 correction): C-053 section reference updated to §15.2 Screen 9.
**Cross-reference reconciliation:** PASSED — no DEFER ENTIRELY rulings. All SIMPLIFY removals are self-contained with no downstream breaks.
**Mode 3 final tally:** 13 KEEP AS-IS, 7 SIMPLIFY, 0 DEFER ENTIRELY, 1 updated reference (§19)
**Resume point:** Begin Almanac triage at §1 of ALMANAC
**Open questions:** None.
**Spec corrections accumulated (Mode 3 total):** AI simulation reference (§1), offseasonScope 3-value (§2), championship fame +3 (§3), fitness reset (§3), Team Captain → Phase 13 (§4/§15/§16/§21), 5% trait lottery removed (§4), custom stadium removed (§6), 3 retirement rounds (§7), un-retirement removed (§7/§9/§16), FA pool signing removed (§8), draft trait visibility hidden (§9), primary+secondary position on draft board (§9), AI-initiated proposals deferred (§11/§17), waiver wire source corrected (§11), V2 table updated (§19).

## Session 10 — 2026-03-05
**Document:** ALMANAC — **ALMANAC TRIAGE COMPLETE**
**Sections completed:** §1 through §10 (all 10 sections)
**Key decisions:**
- §1 SIMPLIFY: Almanac accessible from app home screen (not just inside franchises). Cross-franchise querying across all saved franchises with filtering. Custom views (saved filter presets + custom leaderboard column selection) added to v1. Custom dashboards deferred to v2.
- §2 SIMPLIFY: All 11 stores kept. 12th store added (franchiseRegistry — top-level metadata). Two-store transaction design confirmed. V1 data gap annotations added (pitch counts, 8 of 11 transaction types).
- §3 SIMPLIFY: Awards history expanded from 8 to all 13 award categories. Transaction types corrected to 8 (DFA removed). HOF Museum gets empty-state placeholder with eligibility preview.
- §4 SIMPLIFY: franchiseFilter and displayColumns added to AlmanacQuery. Filter behavior table expanded to all fields. Tiered performance targets (100ms single, 300ms ≤5 franchises, best-effort 6+).
- §5 SIMPLIFY: mWAR labeled distinctly. Franchise badge on every profile. Cross-franchise disambiguation page for multi-franchise players.
- §6 SIMPLIFY: Phase 0 added (cross-franchise infrastructure). Phase 7 expanded (custom views + data export). Almanac nav button present from franchise creation with empty state.
- §7 SIMPLIFY: Full rewrite — all 4 isolation rules replaced. Cross-franchise is default. Dual entry point (app home = all franchises, in-franchise nav = pre-filtered).
- §8 SIMPLIFY: Data export (CSV, PDF, JSON) moved to v1. Cross-franchise and custom query builder lines clarified for v1/v2 split.
- §9 SIMPLIFY: Mode 2 reference corrected (§17 not §19). Mode 3 references expanded to full list. Cross-franchise divergence note added.
- §10 SIMPLIFY: C-086 updated for source-agnostic trait history. New triage ruling T-001 (cross-franchise query model) added.
**Cross-reference reconciliation:** PASSED — two minor count/label gaps fixed, no structural conflicts.
**Almanac final tally:** 0 KEEP AS-IS, 10 SIMPLIFY, 0 DEFER ENTIRELY
**Resume point:** Phase A COMPLETE. Begin Phase B — V1 Spec Assembly.
**Open questions:** None.

---

## PHASE A COMPLETE — ALL FOUR DOCUMENTS TRIAGED

| Document | Sections | KEEP | SIMPLIFY | DEFER | Sessions |
|---|---|---|---|---|---|
| MODE_2_FRANCHISE_SEASON | 28 | 12 | 14 | 2 | 1–5 |
| MODE_1_LEAGUE_BUILDER | 16 | 7 | 6 | 3 | 6–7 |
| MODE_3_OFFSEASON_WORKSHOP | 21 | 13 | 7 | 0 | 8–9 |
| ALMANAC | 10 | 0 | 10 | 0 | 10 |
| **TOTAL** | **75** | **32** | **37** | **5** | **10 sessions** |
