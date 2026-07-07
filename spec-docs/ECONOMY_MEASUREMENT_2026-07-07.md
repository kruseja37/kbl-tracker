# DRAFT ECONOMY MEASUREMENT — 2026-07-07

Mandated first step of `spec-docs/DRAFT_ECONOMY_RESET_2026-07-05.md` §3/§5.1 ("measure first;
assume the barbell hypothesis is wrong until the histogram proves it") and §8.2 (roster spread).
Read-only against `/private/tmp/kbl-port2` (main @ `95e30ab6`). No repo files were modified.
All numbers come from the real engine code paths — no mocks, no synthetic pools.

---

## 1. METHOD

**Scripts** (throwaway, this directory only):
- `measure.ts` — the campaign driver (bundled to `measure.mjs` with the repo's own esbuild
  `@esbuild/darwin-arm64`, `--define:import.meta.env={}`; run via `run.mjs` + `shim.mjs`
  which stubs `localStorage`/`window` so browser-coupled transitive modules can *load* headless —
  nothing measured *uses* them).
- `probe.ts` — single-run anatomy probe (rosters, price-by-band, budget curve).
- `tables.cjs` — renders these tables from `results.json` (full raw output, kept alongside).

**Pipeline = the production path, end to end:**
1. Player universe: in-repo `ALL_MLB_PLAYERS` (660) + the 3 SML team files (66) = **726 PlayerData**,
   converted with a field-exact replica of the private `convertPlayer` /`computeInitialSalary`
   seed path in `src/utils/leagueBuilderStorage.ts` (salary = canonical `calculateSalary`).
2. `demandUniverseFromPlayers` (`src/src_figma/app/engines/leaguePlayerAdapter.ts`) — IV = `computePlayerIv` (kblIV).
3. `extractPoolFromDemand` (`src/engines/poolFromDemand.ts`) in **pool-first mode** (designs=[],
   archetypes assigned deterministically by cycling `HISTORICAL_ARCHETYPES`, tier `'juiced'` — the
   app default, `poolSourceMode:'full-pool'`, `generationNonce: 1`, preset windows + `poolSlackFactor`
   per `POOL_BALANCE_PRESETS`, quality via `POOL_QUALITY_CENTER_STOPS`).
4. Grades: every pool player carries its full rating payload as `smb4Input`, so the harness grades
   through **`scoreSmb4Player`** (canonical oracle). Missing-numeric-grade count = **0** in all pools.
5. Auction: `simulateAuction` (`src/engines/auctionSim/` — the §8.1 "Lever 0" harness, which exists
   post-port and was driven as-is), configured as the **CURRENT product economy**:
   `biddingPolicy:'rationalBaseline'`, `reserveFractionK: 0`, `autoFillPriceMode:'zero'`,
   `bidIncrement: $1,000`, `spotBudgetCheckpoint: 11`, roster 22, **cap $1,000,000 per team**
   (reset doc §1's real-league number; held constant across team counts so team count and preset
   are the only variables).

**Determinism / seeds:** extraction nonce `1`; sim seeds `kbl-econ-s1..s5` composed as
`{seed}:{teams}t:{preset}:q{quality}:{nominationPolicy}`. 4-team scenarios: 2 nomination policies
(`starFirst`, `randomSeeded`) × 5 seeds = 10 runs each; 20/30-team: `starFirst` × 2 seeds;
sensitivity: `starFirst` × 3 seeds. **48 full auction runs total.** A complete re-run reproduced
every number exactly. **Invariant failures across all 48 runs: 0** (the collapse below is
economics, not a sim bug).

---

## 2. THE UNIVERSE ITSELF (before any pool shaping)

| size | median grade | elite (≥76) | middle (58–76) | low (<58) | barbell idx | median IV | top-22-IV sum |
|---|---|---|---|---|---|---|---|
| 726 | 68.1 | 20.9% | 67.9% | 11.2% | −0.358 | $38,021 | $2,306,796 |

Histogram (scoreSmb4Player, 5-pt bins): 30-35:1 · 35-40:1 · 40-45:2 · 45-50:4 · 50-55:31 · 55-60:85 ·
60-65:132 · 65-70:168 · 70-75:125 · 75-80:102 · 80-85:46 · 85-90:24 · 90-95:4 · 95-100:1.
Letters: B-:155, C+:136, B:118, B+:113, C:88, A-:53, C-:27, A:23, A+:5, D+:3, D:2, S:1, D-:1, E+:1.

**The in-repo universe has a big middle.** It is bell-shaped around B-/C+, not a barbell.

## 3. POOL SHAPE (reset §3 numbers) — per-slot money = cap/22 = $45,455

| scenario | pool | elite ≥76 | middle 58–76 | low <58 | barbell | med grade | med IV | medIV/(cap/22) | top22IV/cap | cheapest legal completion (k=0) | same at k=0.65 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 4t/grounded/q68 | 106 | 9.4% | 80.2% | 10.4% | −0.60 | 65.9 | $32,430 | 0.71 | 1.20 | $0 | $316,000 |
| 4t/balanced/q68 | 110 | 13.6% | 74.5% | 11.8% | −0.49 | 67.1 | $33,456 | 0.74 | 1.33 | $0 | $317,000 |
| 4t/juiced/q68 | 119 | 19.3% | 70.6% | 10.1% | −0.41 | 68.5 | $35,113 | 0.77 | 1.40 | $0 | $317,000 |
| 20t/grounded/q68 | 528 | 10.6% | 82.6% | 6.8% | −0.65 | 67.3 | $35,741 | 0.79 | 1.88 | $0 | $264,000 |
| 20t/balanced/q68 | 550 | 14.9% | 77.1% | 8.0% | −0.54 | 67.7 | $36,356 | 0.80 | 2.00 | $0 | $258,000 |
| 20t/juiced/q68 | 594 | 17.5% | 75.3% | 7.2% | −0.51 | 68.2 | $37,715 | 0.83 | 2.11 | $0 | $257,000 |
| 30t/* (all 3 presets) | 726 | 20.9% | 67.9% | 11.2% | −0.36 | 68.1 | $38,021 | 0.84 | 2.31 | $0 | $249,000 |
| 4t/balanced/q64 | 110 | 4.5% | 75.5% | 20.0% | −0.51 | 64.6 | $31,480 | 0.69 | 1.20 | $0 | $292,000 |
| 4t/balanced/q76 | 110 | 41.8% | 53.6% | 4.5% | −0.07 | 74.6 | $46,856 | 1.03 | 1.81 | $0 | $383,000 |

4t/balanced/q68 histogram: 45-50:1 · 50-55:6 · 55-60:14 · 60-65:22 · 65-70:24 · 70-75:23 · 75-80:12 · 80-85:8.
Letters: B-:24, B:23, C+:22, C:16, B+:12, A-:8, C-:5. (B-/C+ band alone = 46/110 = 42%.)

**Findings (pool/supply, M1):**
- **The barbell hypothesis is DISPROVEN for the generated pool at 4–20-team scale.** The numeric
  pool shaping already in `poolFromDemand` builds a middle-heavy pool (middle mass 70–83%,
  barbell index strongly negative). Elite share passes the ≤15% target for grounded and balanced.
- The **juiced preset breaches** the elite target (17.5–19.3%), and the **quality dial can nuke it**
  (q76 → 41.8% elite, median player IV > per-slot money).
- **At 30-team scale the shaper is powerless**: demand (30×22×1.25 ≈ 825) exceeds the 726-player
  universe, the pool = the whole universe (identical across presets; 39–46 quota shortfalls), and
  elite share is whatever the upload is (20.9%). This is the reset doc's anticipated
  "quotas need a fallback rule" case, now measured.
- Cheapest legal 22-man completion under the CURRENT economy is **$0** in every scenario — the
  §3/M2 "the guard works; the near-free scrubs make it meaningless" claim is CONFIRMED exactly.
  At k=0.65 reserves the same quote becomes ~$250k–$317k (25–32% of cap).

## 4. AUCTION DYNAMICS (reset §3 M2, §8.2) — current economy: k=0, zero-price auto-fill

| scenario | runs | spot-11 budget med | spot-11 worst | $0/$1k pickups (med) | free auto-fills | open slots (med) | stuck teams (med) | strength spread med | spread max | elite-conc med |
|---|---|---|---|---|---|---|---|---|---|---|
| 4t/grounded/q68 | 10 | 34.3% | 19.4% | 7.5 | 0 | 8.5 | 1 | 22.7% | 43.3% | 0.45 |
| 4t/balanced/q68 | 10 | 30.9% | 13.6% | 9 | 0 | 6 | 1 | 14.7% | 19.4% | 0.40 |
| 4t/juiced/q68 | 10 | 25.4% | 7.6% | 12.5 | 0 | 3 | 1 | 9.4% | 51.2% | 0.33 |
| 20t/grounded/q68 | 2 | 13.6% | 6.2% | 141 | 0 | 11 | 7 | 10.8% | 14.4% | 0.09 |
| 20t/balanced/q68 | 2 | 9.2% | 0.4% | 164.5 | 0 | 7 | 5 | 9.3% | 11.1% | 0.09 |
| 20t/juiced/q68 | 2 | 4.7% | 0.0% | 180 | 0 | 7 | 4 | 14.0% | 17.4% | 0.07 |
| 30t/grounded/q68 | 2 | 3.8% | 0.0% | 273 | 0 | 13.5 | 10 | 12.7% | 17.0% | 0.06 |
| 30t/balanced/q68 | 2 | 4.4% | 0.0% | 273.5 | 0 | 16.5 | 10.5 | 13.2% | 14.2% | 0.05 |
| 30t/juiced/q68 | 2 | 4.0% | 0.0% | 269.5 | 0 | 16 | 10.5 | 15.9% | 18.5% | 0.05 |
| 4t/balanced/q64 | 3 | 27.0% | 22.1% | 9 | 0 | 2 | 1 | 5.2% | 18.4% | 0.40 |
| 4t/balanced/q76 | 3 | 0.5% | 0.0% | 37 | 0 | 4 | 1 | 10.8% | 17.6% | 0.33 |

Nomination-order split (4-team; starFirst ≈ the observed human "stars go up first" behavior):

| scenario | policy | spot-11 med | spot-11 worst | spread med | $0/$1k pickups med |
|---|---|---|---|---|---|
| 4t/grounded/q68 | starFirst | 25.7% | 19.4% | 23.4% | 8 |
| 4t/grounded/q68 | randomSeeded | 44.5% | 38.1% | 17.6% | 6 |
| 4t/balanced/q68 | starFirst | 19.5% | 13.6% | 17.8% | 15 |
| 4t/balanced/q68 | randomSeeded | 42.7% | 26.1% | 10.8% | 5 |
| 4t/juiced/q68 | starFirst | 15.4% | 7.6% | 10.2% | 21 |
| 4t/juiced/q68 | randomSeeded | 37.7% | 32.0% | 9.0% | 8 |

Single-run anatomy (4t/balanced/q68, seed s1, starFirst — `probe.ts`): first six nominations are the
six best elites, selling at **1.3–1.45× IV** ($144k for a $99k-IV player); every team's budget is a
straight line to zero (team-1: $1M → $209k at spot 11 → $0 at spot 20); mean sold price elite $80.8k /
strong $57.0k / core $33.0k / filler $14.0k; **11 of 81 sold lots cleared at $0–$1k** (uncontested
lots clear at reserve = $0 — this is where the "free scrubs" live now: in-auction, not at auto-fill);
one team (7 elites = 47% of all elites) hoarded stars while another finished **stuck at 15/22** with
$1k cash — the remaining unsold tail could not legally complete its roster (LEGAL_ROSTER: 2 catchers,
4 SP, 4 relievers, ≥1 CP...). Middle-class lots DID sell (core bid rate 0.61–0.91 across all runs).

**Findings (auction/demand, M2):**
- **Budget collapse is real and confirmed** — spot-11 budget medians 15–34% vs the ≥35–45% target,
  and the realistic star-first ordering is the bad tail (15.4–25.7%). Random nomination order alone
  nearly fixes pacing (37.7–44.5%) — the failure is star-front-loading against a $0-reserve tail.
- **Auto-fill is a red herring post-port: 0 free auto-fills anywhere.** The free-scrub behavior
  moved inside the auction: uncontested lots clear at $0 (7–37 per 4-team draft, 141–274 at league
  scale). Unsold-tail scooping is replaced by *in-auction* $0 pickups plus a worse failure:
- **Teams finish the draft with rosters they cannot legally complete** (median 2–16 open slots per
  draft; a stuck team in nearly every 4-team run). Budget-torching happens *before* positional
  bookkeeping, and the $0 completion quote never stops it.
- **Roster-strength spread FAILS everywhere** (median 5.2–22.7% vs ±5%), partly star hoarding
  (elite-concentration up to 0.45–0.50 in 4-team runs), partly stuck rosters deflating sums.
- Sensitivity: the quality dial dominates the whole economy — q64 is the *only* configuration that
  approaches the spread target (5.2%); q76 destroys everything (spot-11 = 0.5%, elite 41.8%).

## 5. VERDICTS vs RESET §5.5 ACCEPTANCE TARGETS

| scenario | spot-11 ≥ 35% | zero *or priced* pickups | elite ≤ 15% | spread ≤ ±5% | all rosters complete |
|---|---|---|---|---|---|
| 4t/grounded/q68 | FAIL (34.3%) | FAIL (7.5 med @ ≤$1k) | PASS (9.4%) | FAIL (22.7%) | FAIL |
| 4t/balanced/q68 | FAIL (30.9%) | FAIL (9) | PASS (13.6%) | FAIL (14.7%) | FAIL |
| 4t/juiced/q68 | FAIL (25.4%) | FAIL (12.5) | FAIL (19.3%) | FAIL (9.4%) | FAIL |
| 20t/grounded/q68 | FAIL (13.6%) | FAIL (141) | PASS (10.6%) | FAIL (10.8%) | FAIL |
| 20t/balanced/q68 | FAIL (9.2%) | FAIL (164.5) | PASS (14.9%) | FAIL (9.3%) | FAIL |
| 20t/juiced/q68 | FAIL (4.7%) | FAIL (180) | FAIL (17.5%) | FAIL (14.0%) | FAIL |
| 30t/grounded/q68 | FAIL (3.8%) | FAIL (273) | FAIL (20.9%) | FAIL (12.7%) | FAIL |
| 30t/balanced/q68 | FAIL (4.4%) | FAIL (273.5) | FAIL (20.9%) | FAIL (13.2%) | FAIL |
| 30t/juiced/q68 | FAIL (4.0%) | FAIL (269.5) | FAIL (20.9%) | FAIL (15.9%) | FAIL |
| 4t/balanced/q64 | FAIL (27.0%) | FAIL (9) | PASS (4.5%) | FAIL (5.2%, borderline) | FAIL |
| 4t/balanced/q76 | FAIL (0.5%) | FAIL (37) | FAIL (41.8%) | FAIL (10.8%) | FAIL |

Every scenario fails ≥3 of 5 targets; **no scenario passes spot-11, priced-pickups, spread, or
roster completion**.

## 6. HONEST LIMITS

- Universe = the in-repo MLB+SML seed data (726), not JK's actual uploaded league file. Shape may
  differ; the *mechanisms* measured (guard-at-$0, star-first torching, $0 clearing) do not depend on it.
- Pool-first mode with no locked human designs; archetypes cycled deterministically. Design-first
  cell reservations (priceSpread endpoints — the reset doc's other M1 suspect) were NOT exercised.
- CPU bidder = `rationalBaseline` (second-price, need/scarcity multipliers). The production Track-B
  liquidity bidder and human bidders differ; `starFirst` nomination is the proxy for observed
  human behavior. `marginalValueV1/V2` policies not run (time).
- Spread numbers are contaminated by incomplete rosters (a stuck 15-man roster deflates its IV sum);
  fixing completion would shrink but — given 9–15% spreads on mostly-complete runs — not to ≤5%.
- Cap held at $1M for 20/30-team scenarios (controlled comparison), not a per-tier cap.

## 7. WHERE THE NUMBERS POINT (levers)

**Lever A (reserve prices, k×IV) — PRIMARY, now evidence-backed.** Every still-failing metric traces
to the $0-reserve economy: the completion guard reserves $0 (measured), uncontested lots clear at $0
(measured), auto-fill/stuck-roster pathology follows budget-torching that the guard never brakes
(measured). At k=0.65 the same pools quote $250k–$317k (25–32% of cap) for the cheapest legal
completion — that alone reserves roughly the missing spot-11 budget and prices the tail.

**Lever B (curve quotas) — SECONDARY / narrower than the reset doc assumed.** The source shaping that
landed with the port already builds the middle (elite ≤15% passes at grounded/balanced, q68). B-work
remaining: cap the juiced preset (17.5–19.3%), bound the quality dial (q76 → 41.8% elite), and add
the universe-exhaustion fallback for big leagues (30-team pool = raw upload).

**Not "neither."** The failure reproduces on every pool shape including the best ones, so pool work
alone cannot pass §5.5; and the guard math shows reserve prices are the only measured mechanism that
restores spot-11 budget. Recommendation to carry into the JK fork decision: Fork A, Lever A first,
then Lever B's three residuals, exactly per reset §4's "A then B".

---
*Raw data: `results.json` (48 runs, all per-run fields). Scripts: `measure.ts`, `probe.ts`,
`tables.cjs`, `shim.mjs`, `run.mjs`. Repo untouched (`git -C /private/tmp/kbl-port2 status` clean).*
