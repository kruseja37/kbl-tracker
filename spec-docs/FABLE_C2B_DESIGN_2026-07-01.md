# FABLE-C2B DESIGN — Auction Market Model (Second-Price board + completion floor + bid-log)

**Date:** 2026-07-01 (late) · **Builder:** Fable 5 · **Contract:** FABLE-C2B in `PROMPT_CONTRACTS.md`
**Branch:** `experiment/manager-wpa-window` (build-only; Codex adversarial pass → Opus gate/commit)
**JK kickoff clarification (logged in DECISIONS_LOG same day):** the live auction floor is BROKEN —
it disallows teams finishing the draft EVERY time. The solvency-floor replacement is a bug fix, not
an accuracy nicety; a repro/regression pair is mandatory.

---

## §1. FRESH GROUNDING (all anchors re-read this session, post-C1B/C2A trunk `96ed3920`)

| Anchor | Where | What it gives C2B |
|---|---|---|
| `auctionMaxBid` | `src/data/rosterEngineConstants.ts:364-371` | The broken floor: `max(0, budget − (slots−1)×minSalary − projectedTax)` |
| Floor call sites | `auctionStateMachine.ts:225-234, 332, 404, 556`; `cpuShillBidding.ts:268, 327` | All 6 go through the same formula — single rewire surface |
| Phantom tax writer | `useAuctionDraft.ts` `applyAuctionLuxuryTaxForLot` (:149-181) | Per-lot, per-team FULL projected tax if they won the candidate — subtracted from every cap |
| Opening ask | `auctionStateMachine.ts:252-254` (`flatReserveFloor ?? reservePriceCurve(pctile)×iv`) | The real minimum acquisition price of a remaining player |
| Need model | `rosterNeed.ts` (`teamRosterNeed`, `rosterNeedBreakdown`, `wouldStrandRoster`) | own_need's requirement structure; header explicitly reserves the ECONOMIC floor for C2B |
| Legality law | `rosterConstruction.ts` (`isLegalRoster`, `canCover`, `LEGAL_ROSTER`) | Verification of every constructed completion |
| CPU fit math | `cpuShillBidding.ts` `evaluateCpuArchetypeFit` (:169-191) | The band-lift fit formula to reuse (single-math) for v_ij and for archetype-derived shills |
| Live shill construction | `useAuctionDraft.ts` `buildPureShillProfiles` (:192-210) | The AUC-5 surface: hand-rolled 2/3-weight band vectors, not archetypes |
| Seeded shill fallback | `cpuShillBidding.ts` `buildSeededCpuShill` (:378-385) + `buildSeededBandPriorities` (:387-396) | The seeded 2-band vector the ruling replaces |
| 24 archetypes | `historicalArchetypes.ts` (`HISTORICAL_ARCHETYPES`, boosts/nerfs) + `archetypeIdentity.ts` `archetypeToCapIdentity` (:23-39) | The distribution support + ModStat→band bridge |
| Identity builder / fit scorer | `archetypeBalanceSimulator.ts` `buildIdentityRoster` (:662), `archetypeFitScorer` (:748) | Optional identity re-optimization for bid-vs-pass; exported, deterministic |
| Nomination sampling | `auctionStateMachine.ts` `selectNextNominee` (:196-223); exponent MLB=2 (`useAuctionDraft.ts:447`) / FARM=3 (`useFarmAuctionDraft.ts:471`), ratified RB-2-Q3 (default 2.5 is overridden by both live hooks) | The KNOWN process nomination-timing odds are computed from |
| C2A harness seam | `scripts/auctionTuningHarness.ts` `AuctionPriceBandPredictor` (:82), context (:64-80), coverage summary (:751-800); opt-in test `scripts/auctionTuningSim.test.ts` (`RUN_AUCTION_TUNING_SIM=1`) | Where the real predictor plugs in; the 85-90% gate is already measured per case |
| Persistence | `leagueBuilderStorage.ts` `saveAuctionSessionById` (:1787) — whole-object upsert, no shape validation | Additive-optional bid-log fields are save-safe |
| Test pins | `auctionStateMachineOneChance.test.ts:297` pins the `bid-above-solvency-cap` reason only | The rejection reason survives; no old-formula value pins in engine tests |

**Diff-separability check (important):** the C2A default cases run `includePositionInfo: false` and
`projectedTax: 0`. The new floor's fallback path for position-less sessions is `budget −
(slots−1)×minSalary` — the OLD formula with tax stripped, and tax is already 0 there. So the C2A
baseline sweep is arithmetically unchanged by this build; only live MLB sessions (tax > 0) and
position-enriched sessions (completion path) change behavior. New floor-proving harness cases are
added in C2B's own test, not by editing C2A's defaults.

## §2. WHY THE DRAFT NEVER FINISHES (root cause, to be proven by the repro test)

Two compounding defects in the one formula:
1. **The phantom tax over-reserve.** `applyAuctionLuxuryTaxForLot` recomputes each team's
   `projectedTax` per lot as the FULL tax owed if they won the current candidate. Late in a real
   draft (rosters near caps) this is large for every team simultaneously, so `maxBid` collapses to
   ~0 league-wide: every bid rejects `bid-above-solvency-cap`, the forced-filler skips every team
   (it requires `maxBid ≥ openingAsk`, `auctionStateMachine.ts:556-561`), lots pass out permanently,
   and the pool exhausts with open slots (`advanceLot` completes on empty pool at :424).
2. **The generic-minimum under-reserve.** The reserve is `(slots−1)×LEAGUE_MINIMUM_SALARY`
   (~1666/slot), but no lot can clear below its opening ask (`reserveCurve×IV`, usually far higher,
   and position-specific). A team can legally spend to a point where it can never afford the players
   ACTUALLY LEFT at its required positions — same terminal spiral.

Both are cured by the same replacement: **cap every bid at `budget − (cheapest VERIFIED-legal
completion of roster+candidate from the players actually left, priced at their opening asks)`** —
no tax term (spec §6: strip it), recomputed continuously as the pool shrinks.

## §3. DECISIONS

- **D1 — New module `src/engines/auctionCompletionFloor.ts`.** `rosterNeed.ts` stays the pure
  legality-need layer (its header promises the economic floor lives elsewhere). The floor module
  imports rosterNeed + rosterConstruction + the shared opening-ask pricer.
- **D2 — Constructive, law-verified costing (not a claimed optimum).** Build the cheapest
  completion greedily per requirement class (missing primaries → cheapest matching primary;
  rotation/bullpen deficits → exact enumeration over the SP/RP swing split, ≤ 100 prefix-sum
  combos; floors → cheapest remaining bodies within the 13-14/8-9 ceilings; catcher depth → at
  most one cheapest-delta coverage upgrade), then **verify the assembled 22 with `isLegalRoster`**.
  If verification fails, report infeasible-at-current-pool rather than lie. Slight conservative
  overestimation is acceptable (a floor may only ever be too safe, never too loose); the guarantee
  claim rests on the harness sweep, not on an optimality theorem.
- **D3 — Candidate-aware ceiling.** `computeAuctionBidCeiling(session, teamId)` prices the CURRENT
  lot/claim: ceiling = `budget − completionCost(roster + candidate, pool − candidate, slots − 1)`.
  In NOMINATION (no lot) the generic read is `budget − completionCost(roster, pool, slots)`.
  `getTeamAuctionMaxBid` keeps its signature and becomes this (candidate from the open lot when
  one exists).
- **D4 — Fallback tier keeps old behavior minus tax.** Any missing position info (pre-C1 saves,
  the farm auction, unenriched pools) → `budget − (slots−1)×minSalary` (scalar, NO tax). Farm
  behavior is unchanged (tax already 0; flat reserve floor ≈ minSalary). `auctionMaxBid` in the
  data layer stays exported and untouched except a deprecation pointer (STOP-IF frozen-surface
  respect); the engine simply stops calling it. `projectedTax` stays on the saved team shape
  (display/advice only — no shape change).
- **D5 — All six floor call sites rewire to the one ceiling** (state machine ×4 incl. forced
  filler, CPU shill bid + lone-survivor claim). Shills obey the same completion discipline.
- **D6 — New module `src/engines/auctionMarketModel.ts`** with the three spec types
  (`EstimatedMarket`, `CompetingTeamProfile`, `ShillProfile`) and the closed-form board:
  `v_ij = IV_i × archetypeFit_ij × needMultiplier_j(pos_i) × personalityBias_j`, clamped to team
  j's NEW ceiling; `median = 2nd-highest v_ij among interested teams + bidIncrement` (1 interested
  → opening ask; 0 → opening ask, flagged likely-pass). Fit math reuses `evaluateCpuArchetypeFit`'s
  band-lift core, extracted into an exported pure helper in `cpuShillBidding.ts` so CPU bidding and
  prediction share one formula (single-math).
- **D7 — Shill demand is distributional for the PREDICTOR, archetypal for the SHILL.** (a) Live +
  seeded shills get a hidden archetype seeded from the locked 24; band priorities derive from
  `archetypeToCapIdentity(arch).rawShift` positives per band (bridged via `BAND_STATS`) — replaces
  both the hook's hand-rolled vectors and `buildSeededBandPriorities` (AUC-5). Personality stays
  seeded; `NO_FLOOR_MAX_INTEREST_PROBABILITY` stays. (b) The predictor NEVER reads a shill's actual
  archetype/priorities: it computes E[fit] and Var[fit] over the 24-archetype mixture (uniform v1
  prior) × E[bias] over the 3 personalities, and feeds the variance into band width (JK 2026-07-01
  ruling: a distribution blended into the band, not a fixed extra-bidder term).
- **D8 — needMultiplier = own_need × leagueScarcity** per spec §5:132-136. own_need from
  `teamRosterNeed`: a player who fills a hard requirement (missing primary / needed arm class /
  catcher depth / body floor) scores `1 + w_req`; merely-eligible = 1.0; legality-blocked (would
  strand) = 0. leagueScarcity(pos) = teams-still-needing / players-left, clamped. Coefficients live
  in a §16 `MARKET_TUNING` block.
- **D9 — CONTESTED = count-based inference, plain message.** Among teams OTHER than the advised
  GM: rivals with `v_ij ≥ CONTESTED_NEAR_TOP × top v` (default 0.92, tunable) AND a live need.
  ≥2 → `{ rivalCount, message: "N other teams also want this profile — expect near-ceiling, or
  plan a fallback" }`. The type exposes counts and plain text only — never a rival's valuation
  number (spec §6 privacy; STOP-IF honored by construction).
- **D10 — Bid-vs-pass is closed-form re-projection, with the identity climb as an opt-in.**
  `projectBidVsPass` recomputes, on both branches (win-at-X vs pass), the GM's ceiling, completion
  cost, per-requirement cheapest-affordable targets, and top-surplus targets — instant math per
  spec §5:162-164. Callers wanting the full board re-optimization pass an opt-in that runs the
  exported `buildIdentityRoster` on both branches (deterministic; click-time, not hot-path).
- **D11 — Nomination-timing odds, closed-form and honest.** `w_i = max(pctile/100, 0.02)^E` (E
  from session config — the ratified per-tier 2/3); P(target next) = `w_t/ΣW`; P(within k) via the
  documented without-replacement approximation `1 − Π_{m<k}(1 − w_t/(ΣW − m·w̄))`. Surfaced as
  odds/ranges only. Overspend-early-vs-wait cue: `surplus_now` vs `P(within affordable window) ×
  (v_own − predicted median)`.
- **D12 — Bid-log infra, additive-optional.** `Lot.bidLog?: BidLogEntry[]` ({teamId, action:
  'bid'|'pass'|'claim'|'forced-fill', amount?}) appended by recordBid/passBid/claim/forced paths;
  `AuctionResult.{bidderSet?, underbidder?, numBidders?}` derived at finalize (underbidder = last
  non-winner to bid, else last passer while a bid stood, else null). Old saves load unchanged
  (whole-object upsert, no validation); log-first-consume-later per spec.
- **D13 — Calibration adapter + opt-in gate test.** `marketModelBandPredictor:
  AuctionPriceBandPredictor` bridges the harness context to `estimateMarket`. Harness-honesty
  rules: real teams' `bandPriorities` are fair inputs (the live analog — a team's archetype/
  capIdentity — is public league-setup data; their noise/interest rolls are not read); shill
  entries are masked to the D7 mixture. New opt-in test asserts per-case coverage lands in the
  85-90% window (small tolerance up to 0.92 reported honestly) and reports the achieved table.

## §4. BAND CONSTRUCTION (the calibration surface)

`median` per D6. Half-widths are multiplicative on the median and additive in variance terms:
`spread = s0 + s_shill×σ_shill + s_human×nUnknownHumans + s_early×(openSlots/poolLeft) +
s_thin×thinness(pos)` — coefficients start from the placeholder predictor's empirically-decent
shape (`auctionTuningHarness.ts:278-301`) and are tuned on the C2A sweep to the 85-90% window.
Low is floored at 0; high at ≥ opening ask; band normalized/rounded by the harness rules.

## §5. FILE PLAN

| File | Change |
|---|---|
| `src/engines/auctionCompletionFloor.ts` | NEW — costed completion + `computeAuctionBidCeiling` |
| `src/engines/auctionMarketModel.ts` | NEW — types, v_ij board, CONTESTED, bid-vs-pass, nomination odds, `marketModelBandPredictor`, `MARKET_TUNING` |
| `src/engines/auctionStateMachine.ts` | MOD — ceiling rewire (4 sites), shared `lotOpeningAsk` helper, bidLog append, result enrichment |
| `src/engines/cpuShillBidding.ts` | MOD — ceiling rewire (2 sites), exported band-fit core, archetype-seeded shill builder |
| `src/src_figma/app/hooks/useAuctionDraft.ts` | MOD — `buildPureShillProfiles` → archetype-seeded (AUC-5 live surface); tax pipeline kept for display |
| `src/engines/__tests__/auctionCompletionFloor.test.ts` | NEW — REPRO pair (strands under old formula → completes now) + floor units + harness position-info sweep |
| `src/engines/__tests__/auctionMarketModel.test.ts` | NEW — v_ij/second-price/CONTESTED/privacy/odds/bid-log units |
| `scripts/auctionMarketCalibration.test.ts` | NEW — opt-in (`RUN_AUCTION_TUNING_SIM=1`) coverage gate with the real predictor |
| `spec-docs/DECISIONS_LOG.md` | DONE — JK floor-is-broken kickoff entry |

## §6. VERIFICATION PLAN (evidence, not assertion)

1. `NODE_ENV= npm run build` exit 0.
2. Targeted suites green: the two new engine tests + auctionStateMachine(+OneChance) +
   cpuShillBidding + rosterNeed + useAuctionDraft/useFarmAuctionDraft hook tests.
3. `NODE_ENV= RUN_AUCTION_TUNING_SIM=1 npx vitest run scripts/auctionMarketCalibration.test.ts`
   → report the ACHIEVED per-case coverage table (target 85-90%; STOP-IF <80% after 2 tuning
   iterations, report the distribution).
4. FULL suite: zero new reds vs the characterized baseline (wpaRuntimeBoundary hard-fail +
   franchiseManualSmokeFixture order-flake + AwardsWatchlist order-flake, all solo-pass).
5. Worked examples in the handoff: CONTESTED firing on a genuinely multi-team-desired player;
   before/after of a solvency-cap decision on the phantom-tax scenario; sub-ms per-projection
   timing note.
6. L-SIM: flagged to Opus for the gate (live bid-cap + shill-behavior changes; the auction feeds
   the freeze, not the in-season path).

## §6b. AS-BUILT (same session; all decisions D1-D13 implemented as designed unless noted)

**Deviations/refinements from the plan above:**
1. **The band is NOT median±spread — it's an ask-anchored shrink model (probe-driven).** The
   theoretical "2nd-highest + increment" median missed reality badly (median abs error ~40%,
   coverage only via absurd width): in THIS machine passes are permanent and the CPU interest
   gates drop bidders below their valuations, so lots clear a FRACTION of the way from the ask
   to the modeled second price. Two probe rounds on the C2A sweep fit the geometry:
   `median = ask + (0.28 + 0.25·sf)·gap`, `high = ask + (0.30 + 0.35·sf + wideners)·gap`,
   `low = ask` (a true floor: minimum bid, lone-survivor claim, and forced fill all pay exactly
   the ask), where `gap = modeledSecondPrice − ask` and `sf = min(1, gap/increment/15)` — the
   step factor captures that finer bid-walks (FARM's 1k increments) get closer to true second
   price than coarse ones (MLB's 5k). All constants live in `MARKET_TUNING` (§16-tunable).
2. **`EstimatedMarket.modeledSecondPrice` is exposed** (the model's own inference, not a rival's
   number — C4 decides whether to display it); the calibration harness consumes it.
3. **Calibration gate structure:** the spec's 85-90% window is asserted on the VALUE-BIDDING
   cases (the realistic market); the forced pass-heavy/all-pass stress cases clear AT the band's
   low edge by construction (~mechanical coverage — a sharp correct prediction, not width), so
   they carry only the ≥0.85 hard floor. **CONFIRMED at 200 runs (gate test exit green):** value
   cases [0.859, 0.864, 0.876, 0.914], value aggregate ≈0.872 ✓ in-window; stress cases
   0.95-1.0 ✓ floor; MLB median abs error ~0.09, band width ~40-47% of price (vs 150-250%
   pre-fit). 50-run round matched ([0.863, 0.861, 0.879, 0.916] / 0.873) — stable across run
   counts.
4. **Hot-path cache:** `bandLiftFromPriorities` runs a full identity composition (~0.1ms), so the
   model caches lift per priorities OBJECT (WeakMap). Measured: 27.5µs per lot estimate
   (10 bidders), ~6ms for a full 220-player board re-price — comfortably inside spec §5's sub-ms
   per-projection budget.
5. **`getTeamAuctionMaxBid` semantics:** between lots (NOMINATION) the ceiling reserves ALL open
   slots; with a lot open it prices winning THAT candidate (roster+candidate, slots−1). The two
   UI consumer pages call it by signature and inherit the fix unchanged.
6. **One hook test re-pinned:** `useAuctionDraft.test.ts` "off-archetype max bid is reduced"
   asserted the phantom-tax cap reduction — the exact behavior spec §6 strips. Re-pinned to the
   new contract (tax computed per lot for display; equal caps on/off archetype).
7. **Tier-1 self-break refinement:** the floor's BIASED attempt also coverage-biases the
   missing-PRIMARY picks (a secondary-C primary fill can be the only catcher-depth path when
   slots are too tight for a dedicated backup); the FORCED attempt keeps primaries plain-cheapest
   so the two-attempt min() preserves the dedicated route's price. Known conservative gap
   (documented, safe): a coverage-carrying arm inside the required rotation/bullpen picks isn't
   enumerated — worst case the floor reports infeasible and falls back to the PERMISSIVE scalar,
   which can never wrongly block a bid.

## §7. BEHAVIOR CHANGES & RISKS (declared up front for the audit)

- Live MLB solvency caps change (tax no longer subtracted; completion cost now is). This is the
  contracted bug fix. Farm + C2A-default paths are arithmetically unchanged (D4/§1).
- Live + seeded shill valuations change (archetype-derived band priorities). Contracted (AUC-5,
  JK shill ruling). C2A's default sweep passes explicit `teamProfiles`, so its harness baseline
  is NOT affected by the seeded-fallback change; the live hook change shows up only in app flows.
- Completion floor is conservative-by-construction (D2): it can in principle reserve slightly more
  than a perfect optimum. Mitigation: exact enumeration for the arm split, verified legality, and
  the harness sweep proving no legitimate-bid choke at 1.0×/1.2× pool sizing.
- The nomination-odds P(within k) is an approximation; documented as odds-only UX per spec.
