# CONTRACT M1E — F8/F11: DIMINISHING POSITIONAL NEED + OVERSTACKED ADVISOR

## Role
Senior implementation engineer. Build exactly what the ratified design specifies — no scope additions. If a design assumption proves false in the code, STOP and write BLOCKED.md at repo root.

## Working directory
`/private/tmp/kbl-m1e-diminish` (git worktree, branch `lane/m1e-diminish`, based on origin/main 61f0421f).

## THE DESIGN IS THE CONTRACT — read it FIRST, in full
`spec-docs/FABLE_F8_DIMINISHING_NEED_DESIGN_2026-07-08.md` (RATIFIED, in your tree). It contains: §1 the exact current math with file:line, §2 the surplus-depth schedule + thinnest-position assignment + the three insertion seams (§2.4), §3 the strand-safety interaction analysis, §4 the F11 overstacked advisor finding, §5 the BINDING two-lane sim gate with 8 pass/fail metrics, §7 captain rulings (floor = 0.50; the discount applies EVERYWHERE including human-facing "worth to you"/bid-vs-pass; MLB-only with the wrapper degrading to 1.0 when position shapes are absent; §5's two-lane gate is acceptance, a sim-only gate is not).

## Build order (sim-first)
1. **BASELINE FIRST**: before any code change, run the §5 sim shapes at your base commit and save the baseline numbers (metrics 6 and 8 compare against these; determinism metric 7 pattern per leverAReserveMeasurement).
2. Implement §2: `surplusDepth` + `diminishedNeedMultiplier` beside `playerFillsHardRequirement` in rosterNeed.ts; `fillsPositionSpecificRequirement` = playerFillsHardRequirement minus the two generic floor clauses (rosterNeed.ts:273-274, :284) per §2.1.
3. Wire the three seams per §2.4 (cpuShillBidding needMultiplier sites, auctionMarketModel buildLotViewFromSession + computeOwnValueFactors, auctionSim playerValueForTeam + rosterNeedMultiplier + position-tagged filler buckets). Widen the liquidityAwareBidding.ts:81 clamp floor to 0.50 (the named implementation trap — do not forget).
4. Implement §4: the `over-stacked` advisor finding in rosterAnalyzerEngine (primary-count basis, info at 3 / warning at 4+ with starved-sibling escalation, copy per §4; grep characterization tests before finalizing copy — flag, don't reword, if locked).
5. Run the FULL §5 gate (both lanes: auctionSim shapes AND the live-engine cpuShillBidding driver) and produce the pass/fail report per metric per config; commit it as `spec-docs/M1E_SIM_GATE_REPORT.md`.

## Untouchables
Legality frame (rosterConstruction.ts) · reserve/completion pricing · IV/salary engines · strand guards / wouldStarveJointDemand / servesOwnTightClass · shill distribution model · projectBidVsPass rival simplification (stays needMultiplier:1) · prospectScoutingDraftEngine + farm scouting UI (lane M1D, concurrent) · cpuTeamRoles.ts + useFarmAuctionDraft.ts + LeagueBuilderFarmAuctionDraft.tsx (lane M1G, merging ahead of you) · GameTracker · schemas.

## Unit/regression tests (beyond the sim gate)
- surplusDepth thinnest-position assignment: a 2B/SS dual-eligible counts against the thinner of the two (design §2.2); pitcher class counting incl. SP/RP swing.
- Schedule values: s=1→1.00, s=2→0.85, s=3→0.65, s≥4→0.50; position-specific requirement keeps ownNeedMultiplier ≥1 untouched; mustBuy keeps ≥1.25.
- Wrapper degrades to 1.0 when roster shapes absent (permissive fallback, rosterNeed.ts:16-21).
- The clamp actually passes 0.50 through (kill the 0.85-floor swallow).
- Advisor: 4 primary SS + thin C → warning naming the starved sibling; 3 → info; flexible multi-position bench bodies NOT counted as stack members (primary-position basis).

## Gates (paste real output)
`npx tsc -b --pretty false` · `npm run build` · focused suites (auctionMarketModel, cpuShillBidding, liquidityAwareBidding, rosterNeed, auctionSim, rosterAnalyzerEngine + adapters) · full `NODE_ENV= npx vitest run` zero-new-reds (known flakes: LeagueBuilderDraftSetup CUT2-2 batch flake, AwardsWatchlist, franchiseManualSmokeFixture, GameTrackerLaunchState — solo rerun if red) · the §5 sim gate, ALL 8 metrics, both lanes.

## Commit protocol
Commits: `feat(auction): diminishing positional need schedule [F8]`, `feat(roster-advisor): overstacked position findings [F11]`, `test(economy): F8 sim gate report`. On git EPERM: dirty tree + M1E_DONE.txt with summary/files/gate outputs. Do NOT push.
