# CONTRACT: GAUNTLET — full-draft completion proof under real, organically-accumulated luxury tax

**Lane:** codex/gauntlet-2026-07-09 (worktree /private/tmp/kbl-gauntlet, base main @ 23a0a11a — includes TAXTEETH + TAXPRECISION: tax drains real budgets and reads exact archetype rawShift).
**Builder:** Codex (xhigh). **Rules:** work ONLY in this worktree; commit here; do NOT push or merge; an independent auditor reviews after. Any UNKNOWN or mid-build surprise = STOP and report in your final message, do not improvise scope. This lane ADDS tests (plus at most one `export` keyword — see §D1); it must not change any product logic.

## WHY (JK question, confirmed structural)
No full-draft test has EVER exercised the luxury tax: `applyAuctionLuxuryTaxForLot` lives only in the React hook layer (src/src_figma/app/hooks/useAuctionDraft.ts:247, applied at :523 and :603), while the pure engine's `normalizeTeam` hardcodes `projectedTax: 0` (src/engines/auctionStateMachine.ts:1304-1321). Every existing full-draft harness drives the pure engine → tax structurally zero. Additionally, NO full draft has ever run on a design-first pool (the one integration test uses the legacy `registerLeaguePoolForLeague` path, bypassing `extractPoolFromDemand` entirely). This lane is the first end-to-end proof that drafts complete legally with tax genuinely draining budgets.

## HARNESS FACTS (inventoried 2026-07-09, verify at point of use)
- Drive-loop pattern to copy: `driveHotSeatAuctionToCompletion` in src/utils/tests/draftPipeline.integration.test.ts:173-207 (surfaceNextPlayer/passBid/resolveLot/claimLoneSurvivor/advanceLot directly on the engine). It always-passes; you will extend with real bidding (§D4).
- `extractPoolFromDemand` (src/engines/poolFromDemand.ts:1664-1690) is pure/synchronous/headless — no IndexedDB; ~5-7s per call at the 660-player production universe. Usage examples: scripts/m1jCompletionLiveMatrix.test.ts:227-253 (pool-first shape, designs=[]), src/engines/__tests__/poolFromDemand.test.ts.
- `archetypeToCapIdentity` (src/engines/archetypeIdentity.ts:31-47) is pure; `HISTORICAL_ARCHETYPES` is the catalog (24).
- Legal roster oracle: `isLegalRoster` (src/data/rosterConstruction.ts:134-155, minClosers:1 at :37/:153).
- Tax engine: `auctionMarginalTaxWithCaps` / `computeAuctionTeamProjectedTax*` (src/engines/auctionLuxuryTax.ts); canonical caps via `shiftLuxuryCaps` (src/engines/leagueConstruction.ts:237-244).
- NO tax accumulator exists on AuctionTeamState/AuctionResult — the drive loop must sum the marginal tax at each settlement itself.
- NO provenance field distinguishes forced/backfilled fills from competitive wins in persisted AuctionResult (bidLog 'forced-fill' is transient per-lot) — the drive loop must record which resolutions came from backfill/forced paths as it drives.
- Known untaxed-by-design paths (do NOT "fix" them): `backfillFromPassedLots` (auctionStateMachine.ts:830) and the shill-reclamation core (auctionSettleFromShills.ts:194). The gauntlet MEASURES their effect (§D6), never asserts them taxed.

## THE BUILD
**D1 — Real product tax application, no re-implementation.** The drive loop applies tax between lots by importing the REAL function from the hook module. Check whether `applyAuctionLuxuryTaxForLot` (useAuctionDraft.ts:247) is exported. If yes: import it. If no: add ONLY the `export` keyword to the existing declaration (one-word diff, zero logic change) and note it in this contract. If exporting it is not that simple (e.g. it closes over hook state), STOP and report — do not extract/refactor.
**D2 — Pools via the REAL production extraction, both modes.** Pool-first: `extractPoolFromDemand(universe, selectedArchetypes, tier, {designs: [], ...})` as m1j does. Design-first: nonempty `TeamDesignInput[]` (build realistic locked designs programmatically — mirror how buildModeAResult shapes them, LeagueBuilderDraftSetup.tsx:2439-2471). This is the first design-first full draft: if extraction or the draft loop breaks on a design-first pool, that is a FINDING to report prominently, not a blocker to hack around.
**D3 — Seatings (6-8 full drafts total):**
  - Drafts 1-3 (pool-first, 8 teams each): all-24 archetype round-robin (each archetype seated exactly once across the three drafts).
  - Draft 4 (design-first, 6-8 teams): mixed archetypes with real locked designs.
  - Draft 5 (pool-first): TAX-EXTREME table — compute each archetype's tax exposure (sum of |sacrifice| shifts, or the ones whose sacrifices bite the most under top-N concentration) and seat the worst offenders together.
  - Draft 6 (pool-first): stars-and-scrubs pressure — low team count or high-value-concentration settings so top players eat budgets (maximal tax + squeeze conditions).
**D4 — Real competitive bidding for at least half the drafts.** Use the real `cpuBidOnLot` / `cpuDecideLoneSurvivor` (src/engines/cpuShillBidding.ts:375/:458) to escalate bids between CPU seats until no CPU tops the high bid, then resolve. The remaining drafts may use the all-pass pattern (lots settle at reserve — still taxed via the forced-fill finalizeSoldLot path). Assert at suite level that competitive drafts produced a meaningful number of multi-bid lots (guard against the all-pass degenerate).
**D5 — Per-team assertions at AUCTION_COMPLETE (every draft):**
  - `rosterSlotsRemaining === 0` and `isLegalRoster(roster)` (incl. the closer rule) for EVERY team.
  - `budgetRemaining >= 0` for EVERY team (exact, not approximately).
  - Harness-accumulated charged tax per team === the sum of the marginal-tax values the engine computed at each settlement (self-consistency of the instrumentation), and for at least 2 teams per draft verify one settlement's marginal by independent recomputation via `auctionMarginalTaxWithCaps` on the pre-win roster (exact-number).
  - At least one team in drafts 5-6 actually crossed the tax threshold organically (charged tax > 0) — otherwise the gauntlet proved nothing about tax; tune the seating/budget so this holds robustly (deterministic seeds, no Date.now/randomness without a fixed seed).
**D6 — MEASURE and report (console table + a summary block written into this contract):** per draft × per team: total salary spent, total tax charged, implied end-of-draft liability `luxuryTax(finalRoster, caps, 'taxed').charged` vs actually-charged (divergence = the known untaxed cleanup paths — report the delta, do NOT assert equality), forced/backfilled fill count vs competitive wins, final budget. This is the squeeze table JK asked for: do tax-exposed teams complete via more dregs?
**D7 — Runtime discipline.** Target the whole gauntlet suite under ~120s (pool extractions dominate; reuse one extracted universe/pool across drafts where the config genuinely allows it — but never share mutated state between drafts). If it can't fit, shard into two test files. Place under src/engines/__tests__/auctionGauntlet.test.ts (or .integration. naming if repo convention prefers; follow existing conventions).

## GATES (paste real outputs into this contract before finishing)
1. `npx tsc -b` — clean. 2. `npm run build` — exit 0. 3. The new gauntlet suite — green, with the D6 tables in the output. 4. Untouched suites you depend on still green: auctionLuxuryTax, auctionStateMachine, auctionCompletionFloor, useAuctionDraft. Do NOT run the full vitest suite.

## DELIVERABLE
Commits in order: (1) this contract file (already committed by the captain — amend/extend it, do not delete); (2) the harness + tests; (3) final contract update with: gate outputs, the D6 measurement tables, the D5 exact-number evidence, any findings (design-first breakage, threshold-crossing tuning notes, the one-word export if used), and honestly-flagged deviations. Final message: summary + commit hashes + findings + surprises.

## FINAL EVIDENCE (Codex rework, 2026-07-09)

### Scope and deviations
- Product code untouched. No export change was needed: `applyAuctionLuxuryTaxForLot` was already exported.
- Harness file: `src/engines/__tests__/auctionGauntlet.test.ts`.
- Six full drafts run. All six use the competitive need-aware path (`cpuBidOnLot` / `cpuDecideLoneSurvivor`), so there is no passive-market draft in the final green suite. The all-pass branch now claims lone survivors at reserve via `claimLoneSurvivor` if a passive case is re-enabled.
- Pool-first extraction intentionally keeps `poolSourceMode: 'team-roster-priority'` and `priorityIds` for current production parity. The addendum cited older lines saying production did not pass them, but current `LeagueBuilderDraftSetup.tsx` defaults the source mode to `team-roster-priority` when no session value exists and passes `poolSourceMode` plus `priorityIds` to `extractPoolFromDemand` (`LeagueBuilderDraftSetup.tsx:719-721`, `:2499-2500`).
- D4 is design-first with nonempty `TeamDesignInput[]`.
- The settlement recorder uses append-index result pairing instead of diff-key pairing under reserve renomination/supersede.
- The added feasibility anomaly measurement is zero across all final rows (`feasibleShortfallAtFinal = 0`).

### Gates
- `npx tsc -b` - exit 0, clean.
- `npm run build` - exit 0, `vite build` completed in 9.40s. Existing warnings only: stale Browserslist data, `franchisePlayerStorage.ts` dynamic/static import chunking, and chunks larger than 500 kB.
- `NODE_ENV= npx vitest run src/engines/__tests__/auctionGauntlet.test.ts --reporter=verbose` - 1 file / 1 test passed, duration 52.91s, D6/D5 tables printed.
- Dependency suites: `NODE_ENV= npx vitest run src/engines/__tests__/auctionLuxuryTax.test.ts src/engines/__tests__/auctionLuxuryTaxSettlement.test.ts src/engines/__tests__/auctionStateMachine.test.ts src/engines/__tests__/auctionStateMachineOneChance.test.ts src/engines/__tests__/auctionCompletionFloor.test.ts src/src_figma/app/hooks/__tests__/useAuctionDraft.test.ts --reporter=verbose` - 6 files / 86 tests passed, duration 4.10s.

### Gauntlet summary
| Draft | Label | Competitive | Surfaced lots | Multi-bid lots | Total charged tax |
|---|---|---:|---:|---:|---:|
| D1 | D1 pool-first round-robin A | true | 297 | 85 | 3128632.74 |
| D2 | D2 pool-first round-robin B | true | 369 | 80 | 12375141.89 |
| D3 | D3 pool-first round-robin C | true | 363 | 111 | 9017422.21 |
| D4 | D4 design-first locked designs | true | 287 | 50 | 3056092.48 |
| D5 | D5 pool-first tax-extreme | true | 403 | 65 | 3251126.31 |
| D6 | D6 pool-first stars-and-scrubs | true | 301 | 46 | 2095993.91 |

### D6 squeeze table
```text
draft team archetype salarySpent chargedTax impliedFinalLiability liabilityMinusCharged forcedBackfilledFills competitiveWins feasibleShortfallAtFinal finalBudget
D1 blue-jays murderers-row 536235.99 649817.02 1599531.91 949714.89 10 3 0 19782.99
D1 yankees bomba-squad 1146845.38 55100.44 142248.05 87147.61 6 13 0 3890.19
D1 orioles bash-brothers 733852 470970.58 470970.58 -0 2 10 0 1013.42
D1 rays whiteyball 833828.88 372007.12 372007.12 0 3 15 0 0
D1 red-sox go-go-small-ball 803190 398858.21 398858.21 0 0 17 0 3787.79
D1 white-sox dead-ball-suppressors 825173.61 380662.39 448592.57 67930.17 4 13 0 0
D1 twins billy-ball-burners 657836.28 545098.44 1108816.09 563717.64 7 5 0 2901.28
D1 indians junkball-surgeons 944472.37 256118.54 372221.48 116102.94 10 9 0 5245.09
D2 blue-jays flamethrowers 1162473 1240262.43 1272975.76 32713.33 5 9 0 8936.57
D2 yankees nasty-boys 609815 1613767.39 1613767.39 -0 1 2 0 188089.61
D2 orioles hdh-royals 1168617 1226502.23 1829257.03 602754.8 2 11 0 16552.77
D2 rays the-opener 507859.02 1886085.34 2672825.45 786740.11 13 7 0 17727.64
D2 red-sox the-oriole-way 854246 1546411 1546411 0 1 16 0 11015
D2 white-sox shift-era-suppressors 780480 1630824.58 1630824.58 0 3 11 0 367.42
D2 twins big-red-machine 751657 1659414.39 1659414.39 0 2 11 0 600.61
D2 indians hit-em-where-they-aint 788314 1571874.53 1571874.53 0 2 13 0 51483.47
D3 blue-jays toolsy-burners 799584 1603049.93 1603049.93 0 2 14 0 9038.07
D3 yankees cannon-corps 871269 892782.22 892782.22 0 0 16 0 647620.78
D3 orioles gap-to-gap 2060411.34 341011.32 794727.91 453716.59 8 9 0 10249.34
D3 rays web-gems 1175963 1119288.3 1119288.3 -0 0 16 0 116420.7
D3 red-sox launch-and-leather 1588196.08 823475.92 2242280.69 1418804.77 2 13 0 0
D3 white-sox no-glove-offense 686530 1719099.02 3111229.14 1392130.13 8 10 0 6042.98
D3 twins wheels-and-cannons 956945 1128720.46 1128720.46 0 0 18 0 326006.54
D3 indians rangy-defenders 963985 1389995.04 1389995.04 0 0 15 0 57691.96
D4 blue-jays murderers-row 442373.54 750654.38 2531428.43 1780774.05 16 4 0 12808.08
D4 yankees whiteyball 822211.48 383624.52 1048747.09 665122.58 4 15 0 0
D4 orioles junkball-surgeons 801161.32 404674.68 1329821.14 925146.46 5 10 0 0
D4 rays the-oriole-way 788020 379517.22 2552924.43 2173407.21 11 8 0 38298.78
D4 red-sox cannon-corps 587947.78 617888.22 1736290.66 1118402.44 10 3 0 0
D4 white-sox no-glove-offense 686102.54 519733.46 4777537.21 4257803.75 5 10 0 0
D5 blue-jays launch-and-leather 896150.76 303764.97 423859.29 120094.33 7 9 0 5920.27
D5 yankees no-glove-offense 716166.2 465335.61 4344568.28 3879232.67 10 6 0 24334.19
D5 orioles big-red-machine 702742.86 492006.5 2260444.73 1768438.23 9 8 0 11086.64
D5 rays the-opener 920711.68 285091.15 2611809.88 2326718.73 8 11 0 33.17
D5 red-sox toolsy-burners 693658.22 506444.67 3850743.22 3344298.55 10 9 0 5733.11
D5 white-sox gap-to-gap 835831.18 364269.3 2893824.9 2529555.6 5 9 0 5735.53
D5 twins shift-era-suppressors 750417.96 455418.04 3312747.16 2857329.12 11 3 0 0
D5 indians nasty-boys 826187.61 378796.07 2459561.76 2080765.69 6 10 0 852.32
D6 blue-jays launch-and-leather 1003673.23 191848.28 1238475.64 1046627.36 6 11 0 10314.49
D6 yankees no-glove-offense 668029.85 523353.78 5632969.86 5109616.08 12 6 0 14452.37
D6 orioles big-red-machine 814579 371700.65 1097376.91 725676.25 5 6 0 19556.35
D6 rays the-opener 894143.48 309557.87 2895156.72 2585598.85 7 7 0 2134.65
D6 red-sox toolsy-burners 837941.27 364116.97 3998848.78 3634731.81 8 11 0 3777.76
D6 white-sox gap-to-gap 870419.64 335416.36 3375381.39 3039965.03 7 5 0 0
```

### D5 exact-marginal evidence
```text
draft team player rosterBefore helperProjectedTax independentMarginalTax
D1 indians min-blyleven 5 77255.12 77255.12
D1 yankees bos-lamb 5 3632.28 3632.28
D2 rays nyy-duarte 4 420277.97 420277.97
D2 red-sox cws-hernandez 10 1164766.22 1164766.22
D3 blue-jays cle-lee 10 112784.41 112784.41
D3 indians bal-mussina 8 69131.89 69131.89
D4 yankees cin-foster 9 3476.43 3476.43
D4 white-sox mil-baker 8 72071.32 72071.32
D5 blue-jays tex-ryan 3 3632.28 3632.28
D5 yankees mon-navarro 8 179344.39 179344.39
D6 red-sox tor-dean 6 83510.91 83510.91
D6 blue-jays lad-bowen 13 84468.91 84468.91
```

### Findings
- No product bug was found by the reworked gauntlet.
- The final faithful drives completed all teams with legal rosters, nonnegative budgets, real charged tax, and zero feasible-shortfall anomalies.
- The large `liabilityMinusCharged` values remain measurement-only evidence of the known untaxed cleanup/backfill paths called out in the contract; no equality assertion was added for those paths.
