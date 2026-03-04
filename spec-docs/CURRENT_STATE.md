# CURRENT_STATE.md

**Last Updated:** 2026-03-04
**Phase:** V1 Simplification — Phase A (Spec Triage)

---

## Current Phase and Step

Phase A — Spec Triage. Mode 2 COMPLETE. Mode 1 COMPLETE. Mode 3 next.

## Last Completed Action

Session 7 (2026-03-04): Triaged Mode 1 §10–§16, completing Mode 1 triage.
- §10 SIMPLIFY: CSV upload + manual entry. OCR deferred. SIMULATED stripped from GameStatus.
- §11 SIMPLIFY: Full 6-step wizard. Preset references stripped. §2 corrections propagated. Salary before any draft.
- §12 KEEP AS-IS (3 spec corrections): Full init sequence. Stale preset/aiScoreEntry/phaseScope refs corrected.
- §13 SIMPLIFY: Full data architecture. Legacy migration removed (fresh start). rulesPresets store removed.
- §14 DEFER ENTIRELY: V2 table redundant with V2_DEFERRED_BACKLOG.md.
- §15 KEEP AS-IS: Cross-references appendix.
- §16 KEEP AS-IS: Decision traceability appendix.
- Cross-reference reconciliation: PASSED — no blocking conflicts.

## Next Action

**Begin Mode 3 triage at §1 of MODE_3_OFFSEASON_WORKSHOP.**
21 sections to triage. Mode 3 scope depends on Mode 1 + Mode 2 rulings.

## V1 Simplification Status

| Document | Status | Triaged | Remaining |
|----------|--------|---------|-----------|
| MODE_2_FRANCHISE_SEASON | ✅ COMPLETE | 28/28 | 0 |
| MODE_1_LEAGUE_BUILDER | ✅ COMPLETE | 16/16 | 0 |
| MODE_3_OFFSEASON_WORKSHOP | NOT STARTED | 0/21 | 21 |
| ALMANAC | NOT STARTED | 0/10 | 10 |

## Mode 1 Final Tally

| Ruling | Count |
|--------|-------|
| KEEP AS-IS | 7 (§3, §5, §6, §7, §8, §15, §16) |
| SIMPLIFY | 7 (§1, §2, §4, §9, §10, §11, §13) |
| DEFER ENTIRELY | 1 (§14) |
| KEEP AS-IS (spec corrections) | 1 (§12) |

## Mode 2 Final Tally

| Ruling | Count |
|--------|-------|
| KEEP AS-IS | 10 (§3, §5, §6, §12, §16, §17, §21, §23, §28) |
| SIMPLIFY | 15 (§1, §2, §4, §7, §8, §9, §10, §11, §13, §14, §15, §18, §20, §22, §24, §26) |
| DEFER ENTIRELY | 3 (§19, §25, §27) |

## Spec Gaps for V1 Draft Consolidation

1. **Fame System canonical section** — no home section (sources in §10.4, §13.6, §14.9, §17, §18; accumulator §8.3)
2. **Random Event Catalog** — §15 has registry architecture but no event catalog
3. **Box score UI on schedule** — tapping completed game should show box score; data exists, needs UI surface
4. **§16.3 INSIDER reveal** — requires Mode 1 hidden player attributes with `revealed` boolean
5. **§20.1 "rest of roster" True Value** — requires Mode 1 salary system — CONFIRMED v1 (§5 ruling)
6. **Auction draft mechanics** — budget per team, bidding rules, tie to salary system for competitive balance (§8)
7. **LeagueTemplate preset field removal** — `defaultRulesPresetId` no longer needed (§9→§3.3 impact)

## Active Spec Corrections (from triage)

### Mode 2 corrections (1-11):
1. §13.6 relabeled "Fame Trigger Stacking" (stays in §13, routes to fame accumulator)
2. Fame System needs canonical home section (post-triage consolidation)
3. Random Event Catalog needs scoping (post-triage)
4. §15.4 examples need rewriting to comply with mojo/fitness hard boundary
5. §19.2 Fan Favorite designation does NOT carry over on trade (designations never transfer)
6. §20.1 formula revised: 50% team perf + 20% designated player perf + 10% rest of roster (True Value) + 10% reporter + 10% random
7. §22.3 No SIMULATE button — all games get "Score" or "Skip" only
8. §24.5 Exit velocity removed from spray chart record (can't observe in SMB4)
9. §25 No "simplified box-score generator" — box scores are display of GameTracker data
10. §26.3 SeasonSummary handoff: `seasonClassification` field removed (always PRIMARY)
11. §27 removed from v1 spec — V2_DEFERRED_BACKLOG.md is authoritative

### Mode 1 corrections (12-22):
12. §5.5 / §6.1 SML players now have trait data — remove stale "missing trait data" notes
13. §6.1/§6.4 Trait generation only for generated players; all players get personality + hidden modifiers
14. §3.3 Remove `defaultRulesPresetId` from LeagueTemplate (presets removed in §9)
15. §3.4 Step 4 "Select Rules Preset" → "Configure Rules"
16. §10.1 GameStatus enum: SIMULATED stripped (not dormant)
17. §11.2 Step1Data: remove `defaultRulesPreset` field
18. §11.3: remove preset references ("Quick presets: Standard, Quick Play, Full Season, Custom")
19. §11.5 Step4Data: remove `aiScoreEntry`, replace `offseasonPhaseScopes` with `offseasonScope` + `awardsCeremony`
20. §12.1 step 5: `copyRulesPreset(setup.rulesPresetId)` → copy inline rules config
21. §12.1 step 10 metadata: remove `aiScoreEntry`, replace `offseasonPhaseScopes` with simplified fields
22. §13.2: remove `rulesPresets` from kbl-app-meta stores (6 stores remain)

## Key Resolved Decisions (Cumulative)

All prior decisions from gospel consolidation still apply.
From V1 Simplification:
- No AI game simulation in v1 (V1 Litmus Test)
- Mojo/fitness are user-observed only — engine reads, never sets
- Random events cannot modify mojo/fitness/Juiced state
- Juiced eligibility deferred — engine treats as pure state read
- Designations never carry over on trade
- Trade morale effects belong in fan morale (§20), scaled by True Value
- Dynamic career thresholds deferred (fixed floors only in v1)
- Legacy status tiers deferred (multi-season, invisible in season 1)
- Exit velocity removed from spray chart (can't observe in SMB4)
- No box-score generator — played games display via existing data pipeline
- Cold storage export deferred (unscoped feature)
- V2_DEFERRED_BACKLOG.md is authoritative deferral record (§27 table dropped)
- Salary and True Value confirmed v1 — non-negotiable
- SML players now have trait data (stale spec notes corrected)
- Scout is v1 (critical for drafting farm team in Mode 1 and Mode 3)
- No rules presets — user configures to match SMB4 console settings
- AI behavior sliders deferred — hardcoded defaults in v1
- Auction draft format stays v1 but needs full spec (budget tied to salary)
- All 3 AI draft strategies needed + team archetypes for decision-making
- CSV upload sufficient for schedule — OCR deferred
- SIMULATED stripped from GameStatus enum (not dormant)
- Salary calculation runs before any draft type (values players correctly)
- v1 is a fresh start — no legacy data migration needed
- rulesPresets global store removed (rules inline on league templates)

## Working Documents

- `spec-docs/v1-simplification/MODE_1_V1_DRAFT.md` — complete Mode 1 rulings (16/16)
- `spec-docs/v1-simplification/MODE_2_V1_DRAFT.md` — complete Mode 2 rulings (28/28)
- `spec-docs/v1-simplification/V1_SIMPLIFICATION_TRACKER.md` — session progress
- `spec-docs/v1-simplification/V2_DEFERRED_BACKLOG.md` — everything deferred (authoritative)
- `spec-docs/V1_SIMPLIFICATION_SESSION_RULES.md` — governing principles
