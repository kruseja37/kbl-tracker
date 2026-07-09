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
