# RA-1 + Fame measurement-model PROPOSAL (for JK ruling)

**Created:** 2026-06-22 (Captain). **Status:** ✅ **RATIFIED by JK 2026-06-22 (attended)** — all recommendations approved as written ("Ratify all — fold in + build"). This doc is now the PINNED soul-layer measurement model for RA-1 + the fame WAR-floor; it is the authoritative source (referenced from `RATINGS_ADJUSTMENT_SPEC §3A` and the fame spec rather than duplicated). Sim-tune knobs remain §16 placeholders for L-SIM. Unblocks the RA-1 + A1.2(leg-a) builds.
**Why this exists:** §3A/§20 say WHAT to measure but leave four/two HOW-choices unpinned. Per the soul-layer rule I won't infer-and-build; here are proposed resolutions, each with the spec grounding + the alternative + my recommendation. All magnitudes remain §16 sim-tune placeholders.

---

## PART 1 — RA-1: the expected-stats engine (the ratings keystone)

**Plain version:** for each player, predict the stats his ratings *should* produce — calibrated to what his position-peers actually produce **in this league, this season** — then compare to what he *actually* produced. The normalized gap drives development. As a rating rises, its expected production rises with it, the gap closes, and the player settles at the level he's earned (the natural bound — no arbitrary cap). Six choices to pin:

### Choice 1 — The anchor (which rating = which production?)
- **PROPOSED:** the position-pool's **mean rating maps to the pool's mean production** (peer-calibrated, per §3A "anchored to the current league's per-category means within the position pool"). The static `SMB4_BASELINES` (AVG .288 / OBP .329 / SLG .448 / HR .031 / K .166 / BB .055 / FIP 4.04, `war.ts:60-74`) are the **fallback** anchor when the live pool is too thin (§3B).
- **Plain:** a league-average shortstop is expected to hit like a league-average shortstop — and "average" floats with the league (a juiced season raises everyone's bar → the anti-inflation valve §3A wants).
- **Alt:** anchor a fixed rating (e.g. 50) to the baseline regardless of pool. **Rec:** pool-mean anchor.

### Choice 2 — The curve (how production scales with rating around the anchor)
- **PROPOSED:** reuse the **ivEngine two-segment per-attribute shape** (`attrCell`/`twoSegment`), but output the **stat** (centered on the anchor), not dollars. A rating above the pool mean → proportionally more expected production, with the same diminishing nonlinearity ivEngine already uses.
- **Concrete:** `expected_cat(player) = poolMeanProd_cat × curve_cat(playerRating) / curve_cat(poolMeanRating)` (multiplicative, anchored at the pool mean; additive variant available). This *is* the equilibrium valve — higher rating → higher expected → smaller gap.
- **Alt:** a fresh linear/author-per-category curve. **Rec:** reuse the ivEngine shape (proven nonlinearity + consistency).

### Choice 3 — Breakpoints / slopes
- **PROPOSED:** inherit ivEngine's breakpoint position; calibrate each category's slope so the curve passes through (pool-mean-rating → pool-mean-production) and respects the `SMB4_BASELINES` spread. Fine slopes = §16 sim-tune.
- **Alt:** author fresh per-category breakpoints. **Rec:** inherit + sim-tune.

### Choice 4 — Normalization (gap → the [−1,+1] signal `r`)
- **PROPOSED:** `r_cat = clamp( (actual_cat − expected_cat) / peerSD_cat , −1, +1 )`, where **peerSD = the robust position-pool SD** per category (§3B: pool-pure MEAN, borrowed/winsorized SD for thin pools). So `r=+1` ≈ a full peer-SD or more above expected ("wildly exceeded"), `r=0` = met expectation.
- **Plain:** "how many standard-deviations of his peers did he beat his own expectation by" — which makes "wildly exceeded" automatically environment- and position-relative.
- **Alt:** divide by `expected` (percent gap) or a fixed per-category divisor. **Rec:** peer-SD z-score (matches §3B; the right denominator for "rare leap").

### Choice 5 — Expected = curve, peer-mean, or both?
- **PROPOSED:** **both, combined** — the pool-mean production is the anchor; the curve supplies the rating-sensitivity *around* it (the Choice-2 formula). This is exactly the §3A equilibrium ("as a rating rises its expectation rises with it").
- **Rec:** the combined form (it's the anti-inflation + equilibrium mechanism in one).

### Choice 6 — Min-sample floors + scope of the RA-1 engine
- **PROPOSED (floors):** adopt the `traitRealityScorer` placeholders — `minSampleSeason 50` / `minSampleRate 10`, **season-scaled** (per §3B), with per-IP floors so a 1–2-start SP at cp1 is below floor → no move. All §16 sim-tune.
- **PROPOSED (scope):** RA-1 ships **category-complete** (accepts hitter + pitcher hit/run/field categories per §4A) and **build-DARK, engine + unit tests only, no consumer**. It takes the **league per-category mean as an INPUT param defaulting to `SMB4_BASELINES`**; the **live-league-mean wiring + the per-category fan-out into the dev math are RA-2's job** (RA-1 has no consumer yet). The pitcher-pool SP/RP keying is also RA-2.
- **Rec:** as proposed — keeps RA-1 a pure, testable engine; RA-2 wires it live.

> **Net:** RA-1 = a pure function `expectedAndSignal(playerRatings, actualStats, poolMean, poolSD, ageBand, config) → { expectedByCat, rByCat }`, build-dark, unit-tested against hand-worked cases. Everything above is grounded in §3A/§3B/§6A; the only genuinely free knobs (slopes, floors, SD-borrow width) are §16 sim-tune placeholders.

---

## PART 2 — Fame WAR-legitimacy floor: the WAR→merit bucketing

**Plain version:** fame should be tethered to what a player is actually *worth* (his WAR), so a hyped-but-mediocre player's fame (Heat) gets pulled back toward reality, and a quietly-great player's fame gets pulled up. The gravity function (`applyWarLegitimacyGravity`, `fameModel.ts:161`) already exists and is orphaned; it needs two things defined to wire it into `franchiseFameCompute`:

### Choice A — Which WAR feeds the bucketing?
- **PROPOSED:** the **season WAR already on the player's `FranchiseTrueValueRow`** (`franchiseTrueValueStorage.ts:62`) — no new computation, same WAR the rest of the system trusts.
- **Alt:** a different/blended WAR. **Rec:** the existing season WAR.

### Choice B — What thresholds define low / average / high / elite (`FameMeritLevel`)?
- **PROPOSED:** **position-relative PERCENTILE, season-scaled** — `elite ≈ top 10%`, `high ≈ next ~25%`, `average ≈ middle ~40%`, `low ≈ bottom ~25%` of position-peer WAR (cut points = §16 placeholders). NOT absolute WAR cutoffs.
- **Plain:** "elite among his peers this season," not "≥ X WAR" — so it's robust across 40/60/80-game seasons and juiced/nerfed environments, and consistent with the rest of fame being percentile-based.
- **Alt:** absolute season-scaled WAR thresholds. **Rec:** percentile (matches the anti-inflation philosophy; absolute cutoffs rot across season lengths).

### The three lesser A1.2 build-choices (not measurement — my recommended defaults, flag if you disagree)
- **§20.5 direction signal:** fame CHANGE = per-game `heatDelta` (cheap, available at the compute site) rather than tier-crossing. **Rec:** heatDelta.
- **§20.5 producer placement:** emit the fame→morale tap from inside `persistDarkFameRecordsForCompletedGame` (heatDelta is cheaply available there). **Rec:** in-compute.
- **§20.6 Channel A asymmetry:** Fan-Favorite-ups-harder / Albatross-downs-harder = a **multiplicative asymmetric factor** on the existing per-play fan-morale swing. **Rec:** multiplicative.
- All §20.5/§20.6 magnitudes (gravity strength, the meritHeatTarget heats, channel weights, decay) stay §16 placeholders — L-SIM owns them.

---

## What I need from you
Ratify the **Rec** column (a plain "yes, go" works), or override any specific choice. On ruling I fold Part 1 into `RATINGS_ADJUSTMENT_SPEC §3A` (as the pinned model) and Part 2 into the fame spec, then dispatch the RA-1 build (Branch A) and A1.2-leg-a. The other four wave-1 tickets (DH, G1, B8, B12) don't wait on this.
