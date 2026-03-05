# CURRENT_STATE.md

**Last Updated:** 2026-03-05
**Phase:** V1 Simplification — Phase A COMPLETE → Phase B Next

---

## Current Phase and Step

Phase A — Spec Triage — **COMPLETE.** All four gospel documents triaged across 10 sessions (75 sections total). Phase B — V1 Spec Assembly is next.

## Last Completed Action

Session 10 (2026-03-05): Completed Almanac triage — all 10 sections. Phase A is now complete.

Key Almanac decisions:
- Almanac accessible from app home screen (not just inside franchises)
- Cross-franchise querying across all saved franchises with franchise filter
- Custom views: saved filter presets + custom leaderboard column selection (v1)
- Data export: CSV, PDF, JSON from any Almanac view (v1)
- Franchise registry store (12th IndexedDB store, top-level)
- HOF empty-state placeholder with eligibility preview
- Awards history shows all 13 award categories
- Player profiles with franchise badge + cross-franchise disambiguation page
- Trait history is source-agnostic (consumes all trait change events)
- Tiered performance: 100ms single-franchise, 300ms ≤5 franchises, best-effort 6+

## Next Action

**Begin Phase B — V1 Spec Assembly.**
Per V1_SIMPLIFICATION_SESSION_RULES.md:
1. Produce four `_V1_FINAL.md` documents containing only v1 content
2. Produce `V2_DEFERRED_BACKLOG.md` with everything cut
3. Cross-reference reconciliation pass across all four finals

## Phase A Final Summary

| Document | Sections | KEEP | SIMPLIFY | DEFER | Sessions |
|----------|----------|------|----------|-------|----------|
| MODE_2_FRANCHISE_SEASON | 28 | 12 | 14 | 2 | 1–5 |
| MODE_1_LEAGUE_BUILDER | 16 | 7 | 6 | 3 | 6–7 |
| MODE_3_OFFSEASON_WORKSHOP | 21 | 13 | 7 | 0 | 8–9 |
| ALMANAC | 10 | 0 | 10 | 0 | 10 |
| **TOTAL** | **75** | **32** | **37** | **5** | **10 sessions** |

## Spec Gaps for V1 Draft Consolidation

1. **Fame System canonical section** — no home section (sources in §10.4, §13.6, §14.9, §17, §18; accumulator §8.3)
2. **Random Event Catalog** — §15 has registry architecture but no event catalog
3. **Box score UI on schedule** — tapping completed game should show box score; data exists, needs UI surface
4. **§16.3 INSIDER reveal** — requires Mode 1 hidden player attributes with `revealed` boolean
5. **§20.1 "rest of roster" True Value** — requires Mode 1 salary system — CONFIRMED v1 (§5 ruling)
6. **Auction draft mechanics** — budget per team, bidding rules, tie to salary system for competitive balance (§8)
7. **LeagueTemplate preset field removal** — `defaultRulesPresetId` no longer needed (§9→§3.3 impact)

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
- Offseason scope is 3-value selector (default/human-only/all-teams), not binary
- Game Night Mode only in v1 — Streamlined Mode deferred
- Championship fame bonus = +3 (not +1)
- Mojo + Fitness both reset to neutral at season boundary
- Team Captain assigned in Phase 13 (after all roster changes), not Phase 2
- 5% regular player trait lottery deferred — trait rewards for recognized performers only
- No custom stadium creation (SMB4 stadiums only)
- Three retirement dice roll rounds per team
- Retired players stay retired in v1 (no un-retirement)
- FA is 1-for-1 exchange — no free agent pool accumulates
- FA fallback: user selects exchange player if ±30% True Value match fails
- Traits hidden at draft, revealed at call-up (alongside true ratings)
- Primary + secondary position visible on draft board
- V1 trades are user-initiated only — AI responds but doesn't propose
- Waiver wire source: players cut during offseason phases (not retirements)
- Live IndexedDB stores after Phase 13 = post-offseason roster (no separate snapshot)
- §19 V2 table updated with all triage deferrals; V2_DEFERRED_BACKLOG.md remains authoritative
- Almanac is cross-franchise by default (queries all saved franchise DBs)
- Almanac has dual entry point (app home = all franchises, in-franchise nav = pre-filtered)
- Custom views (saved filter presets + column selection) are v1
- Data export (CSV, PDF, JSON) is v1
- Franchise registry store is new top-level IndexedDB store
- Trait history is source-agnostic (all change events, not just award-linked)

## Working Documents

- `spec-docs/v1-simplification/MODE_1_V1_DRAFT.md` — complete Mode 1 rulings (16/16)
- `spec-docs/v1-simplification/MODE_2_V1_DRAFT.md` — complete Mode 2 rulings (28/28)
- `spec-docs/v1-simplification/MODE_3_V1_DRAFT.md` — complete Mode 3 rulings (21/21)
- `spec-docs/v1-simplification/ALMANAC_V1_DRAFT.md` — complete Almanac rulings (10/10)
- `spec-docs/v1-simplification/V1_SIMPLIFICATION_TRACKER.md` — session progress
- `spec-docs/v1-simplification/V2_DEFERRED_BACKLOG.md` — everything deferred (authoritative)
- `spec-docs/V1_SIMPLIFICATION_SESSION_RULES.md` — governing principles
