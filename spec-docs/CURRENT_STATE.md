# CURRENT_STATE.md

**Last Updated:** 2026-03-04
**Phase:** V1 Simplification — Phase A (Spec Triage)

---

## Current Phase and Step

Phase A — Spec Triage. Mode 2 COMPLETE. Mode 1 COMPLETE. Mode 3 COMPLETE. Almanac NOT STARTED.

## Last Completed Action

Session 9 (2026-03-04): Completed Mode 3 triage — §9 through §21 (13 remaining sections). All 21 sections triaged. Cross-reference reconciliation passed.

Key rulings this session:
- §9 SIMPLIFY: Draft Screen 1 removed (un-retirement). Traits HIDDEN at draft, revealed at call-up. Primary + secondary position on draft board.
- §10 KEEP AS-IS: Salary recalc #2.
- §11 SIMPLIFY: User-initiated trades only (AI proposals deferred). Waiver wire source corrected to cut players, not retirements.
- §12 KEEP AS-IS: Salary recalc #3.
- §13 KEEP AS-IS: Farm reconciliation.
- §14 KEEP AS-IS: Chemistry rebalancing.
- §15 KEEP AS-IS: Team Captain added as Screen 9 (12-screen flow). Call-up reveals traits + true ratings.
- §16–§21: All KEEP AS-IS with corrections for consistency (Team Captain refs, un-retirement refs, AI trade refs, V2 table updated).

## Next Action

**Begin Almanac triage at §1 of ALMANAC.**
10 sections remaining. This is the final document in Phase A.

## V1 Simplification Status

| Document | Status | Triaged | Remaining |
|----------|--------|---------|-----------|
| MODE_2_FRANCHISE_SEASON | ✅ COMPLETE | 28/28 | 0 |
| MODE_1_LEAGUE_BUILDER | ✅ COMPLETE | 16/16 | 0 |
| MODE_3_OFFSEASON_WORKSHOP | ✅ COMPLETE | 21/21 | 0 |
| ALMANAC | NOT STARTED | 0/10 | 10 |

## Mode 3 Final Tally (21/21)

| Ruling | Count | Sections |
|--------|-------|----------|
| KEEP AS-IS | 14 | §1, §3, §5, §10, §12, §13, §14, §15, §16, §17, §18, §19, §20, §21 (most with spec corrections) |
| SIMPLIFY | 7 | §2, §4, §6, §7, §8, §9, §11 |
| DEFER ENTIRELY | 0 | — |

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

### Mode 3 corrections (23-46):
23. §1.3: AI simulation reference updated (deferred entirely, not "Mode 2's AI Game Engine")
24. §2.2: `offseasonPhaseScopes` array → `offseasonScope: 'default' | 'human-only' | 'all-teams'` (3-value selector)
25. **MODE 1 §2 CORRECTION:** `offseasonScope` type expands from binary to 3-value. Propagates to §2.3, §2.5, §11.5, §12.1.
26. §3.2 Screen 4: Championship fame bonus +1 → +3
27. §3.2 Screen 5: Mojo reset expanded to Mojo + Fitness Reset (both to neutral baseline)
28. §4.2 Screen 11: Team Captain removed from Awards Ceremony → moves to Phase 13 (Finalize & Advance)
29. §4.3: 5% regular player trait lottery removed (v2)
30. §6.3: "Create custom" stadium option removed (no SMB4 basis)
31. §7.3: Three dice roll rounds per team (not one)
32. §7.4: Un-retirement removed (retired stays retired in v1)
33. §8.2 Screen 4: Fallback revised — user selects exchange player if ±30% fails
34. §8.4: Free Agent Pool Signing removed entirely (incompatible with 1-for-1 exchange model)
35. §9.2: Screen 1 (Pre-Draft Inactive Player Selection) removed — per §7 ruling, retired stays retired
36. §9.2 Screen 4: Traits HIDDEN at draft — visible info is scouted grade, primary position, secondary position, chemistry, personality, potential ceiling only. True ratings + traits revealed at call-up.
37. §9.2 Screen 4: Trait display line removed from draft board (trait distribution still applies to generated prospects)
38. §11.2: Screens 5–6 (AI-initiated trade proposals) removed — v1 is user-initiated only
39. §11.2 Screen 4: AI trade logic clarified as AI-controlled teams only
40. §11.2 Screens 7–8: Waiver wire source corrected — cut players from offseason phases, NOT retirements
41. §15.2: Team Captain Designation added as Screen 9 (after Chemistry Rebalancing Summary) — 12-screen flow
42. §15.2 Screen 2: Traits revealed at call-up alongside true ratings (per §9 ruling)
43. §16.1: Team Captain reference changed from Phase 2 to Phase 13
44. §16.6: "Retired players can re-enter draft class" removed (per §7 ruling)
45. §17.4: Phase 9 AI resolution → "AI responds to user-initiated proposals" (per §11 ruling)
46. §21: C-053 section reference → §15.2 Screen 9 (per §4/§15 rulings)

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

## Working Documents

- `spec-docs/v1-simplification/MODE_1_V1_DRAFT.md` — complete Mode 1 rulings (16/16)
- `spec-docs/v1-simplification/MODE_2_V1_DRAFT.md` — complete Mode 2 rulings (28/28)
- `spec-docs/v1-simplification/MODE_3_V1_DRAFT.md` — Mode 3 rulings in progress (8/21)
- `spec-docs/v1-simplification/V1_SIMPLIFICATION_TRACKER.md` — session progress
- `spec-docs/v1-simplification/V2_DEFERRED_BACKLOG.md` — everything deferred (authoritative)
- `spec-docs/V1_SIMPLIFICATION_SESSION_RULES.md` — governing principles
