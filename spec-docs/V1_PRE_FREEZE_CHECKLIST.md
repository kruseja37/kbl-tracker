# V1 PRE-FREEZE BUILD CHECKLIST

> **Authored 2026-06-27 by Claude Opus 4.8 (Captain)** from a 5-agent source-verified scope-map workflow.
> **Freeze gate (JK ruling 2026-06-27):** the feature freeze + engine-flag-flip + hub live-flip + §16 tuning + JK sign-off happen ONLY AFTER the ENTIRE draft process + ALL non-deferred living-season features are built. Everything below is PRE-FREEZE. Companion: `V1_STATUS_AND_ASSEMBLY_PLAN.md`. Full agent detail: the `pre-freeze-scope-map` workflow output.
> **Recurring theme:** the engine math is mostly built; the gap is "the engine exists but the franchise season never calls it" — wiring + the L-SIM assurance harness, not invention.
> **Owner = Captain (build-dark, autonomous) unless noted "JK".** Statuses are the VERIFIED (post-source-check) values.

## TIER 0 — foundational unblocker (build FIRST)
1. **Archetype→capIdentity converter** (`selectTeamArchetype`/`archetypeToCapIdentity` + ArchetypeStat→ModStat→CAP_MODIFICATION_FRACTIONS vocab bridge + unit test; add `mlbArchetypeKey`/`farmArchetypeKey` to Team) — ✅ BUILT (claude/v1-draft-ui `2e53a0a6`). Faithful **rawShift** bridge (mod-names can't separate rotation/bullpen → hdh-royals/the-opener impossible that way); the plan's `PEN_ACC→PVEL` was a TYPO, corrected to `PACC`. Build-dark, behavior-preserving. The intricate one; gates the setup spine + archetype picker + Draft Setup hub.

## TIER 1 — setup write spine (depends on #1)
2. Seat→team assignment write (couch-coop ownership into `initializeFranchise`) — ✅ BUILT (`cc2d1829`, seat→owner write-spine + couch-coop derivation, backward-compat; hub-writer is #11).
3. CPU shill scaling + override + pre-auction persistence — ✅ BUILT (`cdf47f49`, league-size-scaled default + sticky override; count is JK-pending/§16).
4. Season-rules canonical home (fold `SeasonRulesPreview` → live `FranchiseSetup`; D4/D6) — ♻️ RESCOPED: mostly ALREADY BUILT (cadence=`CheckpointCadence` league-template; intensity=Lane A #24; conferences=`leagueDetails.conferences`). Residual = a Tier-3 setup-UI affordance, not a Tier-1 fold. See `STREAMB_TIER1_SETUP_SPINE_PLAN.md` REFRAME.
5. Pre-freeze setup persistence (carry setup choices into `initializeFranchise`, no new store) — NOT-BUILT, S. **← the genuine remaining Tier-1 spine work.**
6. Conferences toggle configurable + wired to standings/playoff seeding — ♻️ RESCOPED: standings already group by `leagueDetails.conferences` (count=1=single league); seeder is conference-optional. Residual = a franchise-setup on/off affordance (Tier-3). See REFRAME.

## TIER 2 — draft seam fixes (small, independent)
7. Farm-draft "Continue to Franchise Setup" button — NOT-BUILT, S. · 8. Freeze-confirmation dialog before START FRANCHISE — NOT-BUILT, S. · 9. Replace "two-number freeze (AUC-5.2)" copy with plain wording — NOT-BUILT, S. · 10. Draft recap (`DRAFT_RECAP` narrative type + adapter; emission LLM-gated) — NOT-BUILT, M.

## TIER 3 — wire the redesigned screens onto live engines (after the Tier-5 merges land)
11. Draft Setup hub / construction-rail spine wired to #1-#5 — PARTIAL, L. · 12. AuctionStage wired to live `LeagueBuilderAuctionDraft` — PARTIAL, L. · 13. Archetype picker wired to #1 (live write) — PARTIAL, M. · 14. DraftGuideCard scout halves (price band + 20-80 grade + confidence) — PARTIAL, M. · 15. Manager/beat-reporter/scout-hire ceremony screens wired — PARTIAL, M. · 16. My-teams switcher wired — PARTIAL, S. · 17. InGameAdvisor screen connected to live `evaluateScoutMove` — PARTIAL, M.

## TIER 4 — living-season feature wiring (real product gaps)
18. **Winner-honors resolver — ALL award winners honored, scaled by rarity** (JK 2026-06-27, supersedes snub-only; extend `franchiseSeasonEndHonors.ts` + `FranchiseHonorTier` to Gold Glove/Silver Slugger/Booger/Reliever/Rookie winner-side; tunable placeholder magnitude) — NOT-BUILT, M. **OPEN-DECISION: the rarity metric.**
19. TV-award family season-end resolution (Kara Kawaguchi/Bust/Comeback — scorer built, season-end badge+fame+morale payout missing) — PARTIAL, M.
20. Honor-news path for the new non-MVP winners (`FranchiseHonorKind` is only MVP/CY/ALL_STAR) — PARTIAL, M (after #18).
21. Playoff fame/clutch amplification wired into the FRANCHISE completed-game path (multiplier math built; never passed playoff context) — PARTIAL, M.
22. **Headless PLAYOFF driver → bracket → series → champion** — P1 pure module SHIPPED (`a74ae54f`); **P2 = L-SIM wiring (in flight), P3 = playoff fame + champion-MVP** outstanding — PARTIAL, L.
23. Playoff/Series MVP resolver (`computePlayoffMvp`; all `completePlayoff` calls omit mvp) — NOT-BUILT, M (folds into #22 P3 if trivial — JK "defer unless easy").
24. Random-event intensity dial (Juiced/Standard/Nerfed, LS-16) wired to the generator base rate — PARTIAL, S.
25. In-season race EMISSION valve (RACE-5: which races push fame/morale mid-season vs visibility-only) — PARTIAL, M.

## TIER 5 — assembly merges
26. Merge the Fenway-lens hub (`lineups-fenway-hub`; bring forward over trunk first) — NOT-BUILT, M. · 27. Merge draft-setup-ui's 9 screens+routes+catalog (additive, 0 conflicts) — NOT-BUILT, S. · 28. Resolve the one collision: `src/App.tsx` route union (#26∩#27) — S. · 29. Retire `auction-draft-ux-rehaul` after #26 (confirmed superset) — S. · 30. **`ratings-finish-c` V8 park factors — already in trunk; CORRECTION: NOT flag-dark — gated by a 40%-of-season threshold, live WAR DOES change for a non-neutral stadium past 40% games. Math sound (194 WAR tests pass). → JK ruling on intended behavior.**

## TIER 6 — L-SIM hardening + whole-arc assurance (pre-freeze; makes post-freeze tuning trustworthy)
31. Lift the headless auction driver into a shared helper — NOT-BUILT, S. · 32. Shills ON + bid/solvency/determinism/position-legality asserts (#31) — NOT-BUILT, S. · 33. Milestone/Almanac correctness invariant — NOT-BUILT, M. · 34. Soul-carry-post-freeze asserts — NOT-BUILT, S. · 35. **Freeze→season BRIDGE: drive the L-SIM from a REAL drafted+frozen franchise (today seeds synthetic → the seam is driven by nothing; cross-agent seam, do not drop)** — NOT-BUILT, L. · 36. Clean-end asserts (champion+MVP recorded, no offseason) (#22) — NOT-BUILT, S. · 37. Assemble the whole-arc object (league→auction-shills-on→freeze→season→playoffs→ceremony) (#31-#36) — NOT-BUILT, L. · 38. **Sim HARDENING — the ~9 missing fail-on-wrong soul correctness checks. Must land AT/BEFORE freeze (don't let "tuning is post-freeze" bleed into "hardening is post-freeze").** — NOT-BUILT, M.

## THE FINISH LINE — POST-FREEZE (NOT in the pre-freeze list)
- §16 number-tuning sweep over the frozen all-on baseline (JK-gated; the assembled-arc baseline #37 + knob-completeness are pre-freeze, the knob-turning is post).
- Flip the 11 `FRANCHISE_PHASE2_*_ENABLED_DEFAULT` flags (breaks dark-noop characterization tests; needs the ~30-min seasonRunner gate; fame+morale flip together).
- Flip the live `/franchise/:franchiseId` route to the Fenway-lens hub (user-visible — browser sign-off).
- JK manual browser acceptance + sign-off.

## OPEN-DECISIONS STILL NEEDING JK
1. **Winner-honors rarity metric (#18)** — the exact "scaled by rarity" metric (magnitude = §16 tuning).
2. **V8 park factors (#30)** — confirm the 40%-threshold live-WAR adjustment is intended, not silent drift (it is NOT flag-dark).
3. **Champion-MVP resolver (#23)** — "defer unless easy"; JK's call if non-trivial inside #22 P3.
4. The live-route flip + flag flip + tuning sequence — JK-gated by the freeze ruling.

## RECOMMENDED NEXT 3 AUTONOMOUS TICKETS (loop is mid-PLAYOFF-DRIVER-2)
1. **Finish PLAYOFF-DRIVER P2+P3 (#22/#23/#36)** — in flight; unblocks the most downstream harness (whole-arc #37, clean-end #36); closes "no automated run has ever crowned a champion."
2. **Archetype→capIdentity converter (#1)** — the foundational draft unblocker; pure build-dark + unit test; no JK gate; unblocks the setup spine.
3. **Winner-honors resolver (#18)** — JK's ruling, genuinely zero code; build the mechanism with a tunable placeholder, flag the rarity metric for JK.
