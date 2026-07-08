# F8 DIMINISHING-NEED DESIGN (RATIFIED, Fable 2026-07-08) — lane M1E
**Author:** Fable design-note sub-agent, 2026-07-07. **Parent:** spec-docs/MODE1_PUNCHLIST_2026-07-08.md §1b rows F8 + F11. **Repo read:** /private/tmp/kbl-port2 (main), read-only.
**Scope constraint honored:** NO changes proposed to the legality frame (`src/data/rosterConstruction.ts`), reserve pricing (`src/engines/auctionSim/reservePrice.ts`, Lever A k-dial), or IV/salary engines. Everything below is a bounded change to NEED/value **weighting** plus one advisor finding.

**One-line thesis:** every valuation layer in the auction treats positional need as a one-way dial — it can only go UP (≥1.0) for required fills and sits at exactly 1.0 for everything else — so a 5th shortstop prices identically to a 1st bench shortstop. The fix is a single surplus-depth schedule (≤1.0 side of the same dial) applied at the three need seams that already exist, plus an "over-stacked" advisor finding (F11).

---

## 1. The exact current math (verified file:line)

There are THREE independent need reads. All three are ≥1.0-only. None knows how many bodies the team already has at the candidate's position.

### 1a. Live CPU bidding — the surface that hoards
- **`evaluateCpuValuation`** — `src/engines/cpuShillBidding.ts:189-201`:
  `valuation = player.iv × archetypeFit × personalityBias × noise` (line 200). **No positional or need term at all.** Ranges: `bandFitMultiplier` (cpuShillBidding.ts:223-232) ≈ [1−spread/2, 1+spread/2], spread 0.18–0.30 per personality (lines 160-186) → fit ∈ ~[0.85, 1.15]; bias 0.98–1.08; noise ±0.12 (line 143, 495-497). So valuation ∈ IV × ~[0.72, 1.39] regardless of roster shape.
- **`needOverrideApplies`** — cpuShillBidding.ts:301-332: the ONLY position-aware branch in the live bid path. It imports `playerFillsHardRequirement`/`teamRosterNeed` at **cpuShillBidding.ts:23** and gates on `playerFillsHardRequirement` at **cpuShillBidding.ts:322** (the punchlist's cited live chain). It can only produce `mustBuy = true` (a forced buy) — never a discount.
- **`cpuBidOnLot`** — cpuShillBidding.ts:334-423: feeds `needMultiplier: mustBuy ? 1.25 : 1` (line 397) into `evaluateLiquidityAwareBid`; identical at line 474 (`cpuDecideLoneSurvivor`). So the live need dial has exactly two settings: **1.0 or 1.25.**
- **Interest gate** — `bargainInterestProbability` (cpuShillBidding.ts:257-283) fires whenever `liquidity.liquidityAdjustedValue > currentAsk` (consumed at line 408). Since valuation has no surplus term, any high-IV lot at a modest ask draws every CPU as a suitor forever → the sim-confirmed 5-SS / 4-C hoards.
- **Live call sites (verified import chain):** `src/src_figma/app/pages/LeagueBuilderAuctionDraft.tsx:35-36` imports `cpuBidOnLot`/`cpuDecideLoneSurvivor`; `CPU_BID_OPTIONS = { needAwareCompletion: true }` at line 127; auto-bid loop calls at lines 920, 933, 1542, 1558. Farm: `src/src_figma/app/hooks/useFarmAuctionDraft.ts:49, 309, 330`.

### 1b. Market model — the whisper/advisor pricing
- **`ownNeedMultiplier`** — `src/engines/auctionMarketModel.ts:398-407`:
  returns `1` unless the candidate fills a hard requirement, else `1 + needWeight × min(1, minimumAdditions/openSlots)` with `needWeight = 0.35` (auctionMarketModel.ts:82). **Range [1.0, 1.35]. Never < 1.0 post-floor** — the F8 core cite.
- Consumed at:
  - `buildLotViewFromSession` — auctionMarketModel.ts:554 (`needMultiplier = ownNeedMultiplier(...) × scarcity`) → per-bidder `needMultiplier` → `estimateMarketWithInternals` line 307 (`raw = iv × fit × needMultiplier × bias`). Live UI: LeagueBuilderAuctionDraft.tsx:880-886 and 1037; whisper payload `marketReadFromEstimate` (`src/engines/rosterIntelligencePayload.ts:244-246`).
  - `computeOwnValueFactors` / `computeOwnValue` — auctionMarketModel.ts:423-438 (need at line 428) → the advised GM's "worth to you" (`rosterIntelligencePayload.ts:261-275`) and `projectBidVsPass` targets (auctionMarketModel.ts:741-748).
  - Note: `projectBidVsPass` hardcodes rival `needMultiplier: 1` (auctionMarketModel.ts:771) — pre-existing simplification, out of scope here.
- `leagueScarcityMultiplier` (auctionMarketModel.ts:441-446, clamps 0.85/1.25 at lines 84-86) is the only sub-1.0 factor anywhere, but it is LEAGUE-side supply/demand — identical for every team, so it cannot distinguish the team with 4 SS from the team with 1.

### 1c. Sim (auctionSim harness)
- **`rosterNeedMultiplier`** — `src/engines/auctionSim/valuation.ts:24-38`: `1.28` if `playerFillsHardRequirement`, else `1`. Used by `rawWillingnessToPay` (valuation.ts:40-62) for the `naive`/`rationalBaseline` policies (biddingPolicies.ts:12-35).
- **`playerValueForTeam`** — `src/engines/auctionSim/rosterValue.ts:304-342`: `rosterAdjustedValue = baseValue × archetypeFit × ownNeedMultiplier(...)` (need at line 328) — same [1, 1.35]. `rosterValueForBuildOrder` (rosterValue.ts:344-356) sums these, so a 5th SS contributes his FULL adjusted IV to projected roster value — the `marginalValueV1/V2Liquidity` policies (marginalValueBidder.ts:234+, via `bestProjectedRosterValue`) therefore see no marginal decay either.
- **`needBucketForCandidate`** — rosterValue.ts:154-184 (the F8 second cite): once no hard requirement matches, every candidate falls to lines 180-183 → `'filler:arm'` / `'filler:bat'` — **position-blind buckets**. `candidateOptionsForProjection` (rosterValue.ts:186-207) then admits up to 4 candidates per bucket (`DEFAULT_MAX_CANDIDATES_PER_NEED = 4`, line 53) sorted purely by `rosterAdjustedValue` (lines 124-139) — so the filler lane is IV-sorted and one deep position can monopolize it.
- Downstream of the need reads sits `evaluateLiquidityAwareBid` — `src/engines/liquidityAwareBidding.ts:73-131`: `priorityNeedModifier = clamp(needMultiplier, 0.85, 1.35)` (line 81); `liquidityAdjustedValue = raw × needMod × scarcityMod × risk × liqMult` (lines 86-89); `maxBid = min(budget, legalMax, discretionaryBudget, liquidityAdjustedValue)` (lines 90-94). The 0.85 clamp floor exists but is **dead range** — no caller ever passes < 1.

**Supporting frame (read-only for this design):** `LEGAL_ROSTER` — `src/data/rosterConstruction.ts:29-45` (22 slots; 13-14 hitters / 8-9 arms; 8 primaries; catcher depth 2; ≥4 startable, ≥4 relievable, ≥1 CP, max 5 relievers). `canCover` (rosterConstruction.ts:113-124) and `depthReport` (176-182) already implement multi-position coverage counting. `playerFillsHardRequirement` — `src/engines/rosterNeed.ts:268-287`: note lines 273-274 and 284 — **the generic hitter/pitcher FLOOR clauses make ANY hitter/arm a "hard-requirement fill" while the 13/8 floors are open**, which is why even the ≥1 boost is position-blind through most of a draft.

**Why hitters are the defect surface:** pitcher hoarding is structurally capped (8-9 arms max, 5 relievers max, strand guard `wouldStrandRoster` rosterNeed.ts:235-248 blocks a 10th arm). Hitters have 5-6 position-blind bench slots below the 14 ceiling — that is where 5 SS lives.

---

## 2. Proposed diminishing-need schedule

### 2.1 Design shape: one pure function, three insertion seams
Add one pure function in the need domain (natural home: `rosterNeed.ts`, beside `playerFillsHardRequirement`):

```
surplusDepth(candidateShape, rosterShapes) -> s        // how many bodies already "own" the candidate's thinnest slot
diminishedNeedMultiplier(need, shape, openSlots, rosterShapes) -> number
```

Composition rule:

```
if fillsPositionSpecificRequirement(shape, need):      // missing primary, catcher cover, class-specific arm deficit, closer
    return ownNeedMultiplier(need, shape, openSlots)   // UNCHANGED, ≥ 1.0
else:
    return SURPLUS_SCHEDULE[s]                          // ≤ 1.0
```

`fillsPositionSpecificRequirement` = `playerFillsHardRequirement` MINUS its two generic floor clauses (rosterNeed.ts:273-274 hitter floor, :284 pitcher floor). Rationale: the 13/8 floors are fungible — any body fills them, so the team is indifferent among positions and the positional-surplus signal must be allowed to dominate. Position-specific requirements keep the full ≥1 urgency boost untouched (completion safety, §3).

### 2.2 Thinnest-position assignment (eligibility overlap)
For a hitter candidate: coverage set = every field position `p` with `canCover(candidate, p)` (rosterConstruction.ts:113-124 — primary + exact/group secondaries). For each `p`, count existing roster coverers via the same `canCover`. **`s` = the MINIMUM coverer count across the candidate's coverage set** — a player who covers multiple positions counts against the THINNEST position he covers, never the deepest. Consequences (intended): a group-secondary UTIL bat is resistant to the discount (flexibility finally carries value — the known gap in roster intelligence), while a 4th pure SS has nowhere to hide.

For a pitcher candidate the "position" is the staff class: rotation (`canStart` count), bullpen (`canRelieve` count), closer (`isCloser` count); an SP/RP swing counts against the thinner of rotation/bullpen.

### 2.3 The schedule (grounded in GM behavior)
Hitters — `s` = existing coverers at the candidate's thinnest coverable position:

| s (existing coverers) | Bodies after signing | Multiplier | GM read |
|---|---|---|---|
| 0 | 1 | ≥1.0 (need path, unchanged) | Filling an empty spot |
| 1 | 2 | **1.00** | First backup — injury cover is GOOD; never punish it |
| 2 | 3 | **0.85** | Bench luxury — pay bargain prices only |
| 3 | 4 | **0.65** | Redundant — value craters |
| ≥4 | 5+ | **0.50** | Hoarding — effectively never wins a contested lot |

Pitchers (structurally capped, gentler): class count ≤ minimum+1 → 1.00 (a 5th startable arm in a 9-arm staff is normal); minimum+2 → 0.85; minimum+3 or more → 0.65. Closer: 2nd CP → 0.85, 3rd+ CP → 0.50 (one closer role exists; CP usage-cap drag is already priced elsewhere).

**Why these numbers work against Lever A reserve floors (k = 0.65):** CPU valuation ∈ IV × [~0.72, 1.39] (§1a). At s=2 (×0.85) the mean-case valuation ≈ 0.85 IV still clears the 0.65 IV reserve → genuine-bargain bids continue (`bargainInterestProbability` discount ≈ 0.24 → moderate interest). At s=3 (×0.65) mean valuation ≈ the reserve itself → interest probability collapses to the ≤0.05 base band (cpuShillBidding.ts:273-278) — rare, cheap pickups only. At s≥4 (×0.50) all but the luckiest fit/noise draws sit BELOW reserve → the CPU simply is not a suitor, and the lot flows to a team that actually needs the position. The schedule and the reserve dial are two teeth of the same gear; at k=0 the schedule alone still bites (relative WTP ordering), just without the hard price floor.

### 2.4 The three insertion seams (and only these)
1. **Live CPU** (`cpuShillBidding.ts`): compute `s` from `rosterShapesForTeam` (already built at line 377) + `player.pos`; replace line 397 / 474 with `needMultiplier: mustBuy ? max(1.25, …) : diminishedNeedMultiplier(...)`. `mustBuy` keeps its unconditional ≥1 override. Single insertion point per call; the interest gate inherits it automatically through `liquidity.liquidityAdjustedValue` (line 408).
2. **Market model** (`auctionMarketModel.ts`): `buildLotViewFromSession` line 554 and `computeOwnValueFactors` line 428 call the new wrapper instead of bare `ownNeedMultiplier` (roster shapes are already resolved at both sites). This keeps the whisper's price bands, verdicts, and "worth to you" telling the SAME story as the CPUs — the F9 one-ceiling lesson applied prophylactically. `ownNeedMultiplier` itself stays untouched (it remains the ≥1 leg of the wrapper).
3. **Sim** (`auctionSim`): `playerValueForTeam` (rosterValue.ts:328) and `rosterNeedMultiplier` (valuation.ts:24-38) call the wrapper; `needBucketForCandidate` lines 180-183 change from `'filler:bat'`/`'filler:arm'` to position-tagged buckets (`filler:bat:<thinnest-pos>` / `filler:arm:<class>`) so the 4-per-bucket candidate cap (rosterValue.ts:195) can no longer be monopolized by one deep position. `rosterValueForBuildOrder` needs no change — it already re-derives need per pick against the growing built roster (rosterValue.ts:349-355), so the decay compounds correctly pick-over-pick.

One clamp widening rides along: `liquidityAwareBidding.ts:81` `clamp(needMultiplier, 0.85, 1.35)` → `clamp(..., 0.50, 1.35)`. **Named implementation trap:** forget this and the 0.85 floor silently swallows the s≥3 steps — the sim gate below would catch it (stacks would plateau at 4), but it should be a checklist item, not a surprise. Only `cpuShillBidding.ts` passes this parameter today (grep-verified), so widening is contained.

**Explicitly out of scope:** legality frame, reserve/completion pricing (`playerCompletionPrice`, `cheapestLegalCompletion`), IV/salary engines, strand guards, `wouldStarveJointDemand`/`servesOwnTightClass` (auctionStateMachine.ts:975-1010), the shill distribution model, `projectBidVsPass`'s rival simplification (line 771).

---

## 3. Interaction analysis — why the decay cannot strand rosters

**A. The completion guarantee is valuation-independent.** Legal completion is enforced by machinery the discount never touches: `wouldStrandRoster` (rosterNeed.ts:235-248) excludes stranding bids upstream; `cheapestLegalCompletion`/`cheapestAuctionSimCompletion` quotes gate every sim projection (rosterValue.ts:378-393, 486-499); forced fills, lone-survivor claims and the C3 backfill cascade charge the ask/reserve, not a valuation. The discount lowers *willingness*, never *ability*.

**B. Required fills can never be discounted below viability.** Three independent guarantees:
1. `fillsPositionSpecificRequirement` → the wrapper returns the UNCHANGED ≥1.0 `ownNeedMultiplier` for every missing primary, catcher-cover, class arm deficit, and closer need.
2. `mustBuy` (`needOverrideApplies`, cpuShillBidding.ts:301-332) bypasses the valuation and interest checks entirely (`!mustBuy &&` guards at lines 402, 405, 408) — trigger 1 (endgame-tight, line 325) and trigger 2 (`servesOwnTightClass`, line 331) fire exactly when a needed class is at risk. The design keeps `needMultiplier ≥ 1.25` under `mustBuy`.
3. Terminal auto-fill (Lever A: reserve-priced, with the pool-exhaustion affordability amendment, FABLE_RESERVE_PRICE_DESIGN_2026-07-07.md §1) is valuation-blind.

**C. The generic-floor discount cannot wedge a draft.** Worst case: a team below its 13-hitter floor faces a pool that is all surplus-position hitters (e.g. only SS left). The discount lowers its bids, so it buys later and cheaper — but the moment `minimumAdditions ≥ rosterSlotsRemaining` (trigger 1) or class supply tightens below own demand (trigger 2), `mustBuy` forces affordable fills regardless of the discount. The failure mode converts from "overpays mid-draft for a 5th SS" to "pays reserve at endgame for the body it actually needs" — the intended behavior. Passed-out surplus lots remain renominatable (Lever A unsold-lot rule), so no player is destroyed.

**D. Lever A reserve floors.** The discount multiplies WTP, never the reserve — below-reserve sales stay impossible (existing `soldBelowReserve` invariant, metrics.ts:157 area). Deliberate synergy per §2.3: at k=0.65 the schedule's s=3/s≥4 steps land at/below the reserve line, which is what physically redistributes lots. New expected behavior to accept, not fear: mid-IV players at league-wide-saturated positions will pass out more often and land in exhaustion cleanup at reserve — that is the honest price of a saturated position.

**E. liquidityAwareBidding future-fill reservations.** Order of operations protects the floor: `minimumFutureFillReserve` and `discretionaryBudget` (liquidityAwareBidding.ts:77-78, 133-151) are computed BEFORE the need modifier ever enters; the modifier only scales `liquidityAdjustedValue` (line 86-89), and `maxBid = min(hardCeiling, liquidityAdjustedValue)` (lines 90-94). A multiplier < 1 can only LOWER maxBid — it can never eat into the reserved future-fill money, and a lower bid leaves MORE budget for required fills. Emergency-fill state (lines 201-203) already suppresses non-need buys to 0.78; composed with 0.50 a surplus body in emergency state is ≈0.39×IV — correct (a team in emergency-fill should buy nothing but requirements, which route through `mustBuy` anyway).

**F. Market-model coherence.** Applying the same wrapper to rival `needMultiplier`s in `buildLotViewFromSession` means the whisper's predicted bands correctly FALL for surplus-saturated lots after the fix — without it the market model would systematically over-forecast clearing prices post-fix (a new F9-class contradiction). Single wrapper = single math, no second model (the file-header covenant, auctionMarketModel.ts:16-18).

---

## 4. F11 companion — the `over-stacked` advisor finding

`analyzeRoster` (`src/engines/rosterAnalyzerEngine.ts`) currently warns only thin-side: "Thin coverage: …" (line 840), "`${position}` coverage below target" (lines 870-871), "Starting rotation coverage is thin" (898-899), "Bullpen coverage is thin" (923-924). Nothing fires on five shortstops.

**Proposal (additive, same file):** inside the existing `hasConstraint(config, 'position_coverage')` block (after the minimums loop, ~line 886):
- **Count basis: PRIMARY position** (not coverage) — coverage counting would punish flexible bench players, which §2 deliberately rewards. Pitcher side: pure-class counts (CP count, `canStart` count).
- **Thresholds:** primaries at one field position **= 3 → `info`** ("depth luxury"); **≥ 4 → `warning`**. CP ≥ 3 → `info`. These mirror the §5 acceptance line (≤3 is the healthy ceiling).
- **Severity escalation:** when a ≥4 stack coexists with any `depthReport` thin position (rosterConstruction.ts:176-182), keep `warning` but name the starved sibling in the detail — that pairing is the F11 illogic in one sentence.
- **Copy, tone-matched to existing findings** (title short + detail with counts + evidence refs + read-only caveat):
  - Finding — kind `'position_coverage'` (reuse; no enum churn), trust `'high'`:
    - title: `SS is over-stacked`
    - detail: `Active roster has 4 players whose primary position is SS; only one can start. Thin elsewhere: C (1 coverer).`
    - evidence: `evidence('roster_status', 'SSPrimaryCount', 4, 'active roster positions', 'high')` (+ a `thinPositions` ref when escalated).
  - Recommendation — reuse kind `'bench_balance'` (rosterAnalyzerEngine.ts:253-266 vocabulary):
    - title: `Rebalance SS depth`
    - rationale: `Surplus SS bodies add no lineup value; convert depth into coverage at thin positions.`
    - caveats: `['Read-only advice only; this engine does not move players.']` (exact existing string, line 882).
- Surfaces for free through the three adapters (`src/utils/rosterAnalyzerDraftAdapter.ts:174`, `rosterAnalyzerFranchiseAdapter.ts:348`, `rosterAnalyzerBuilderAdapter.ts:341`) — the draft advisor names post-hoc what §2's pricing prevents, per the punchlist disposition.
- Note: draft-time copy near the whisper panel may be D11 test-characterized (franchise copy lock) — grep the characterization tests before final copy; flag, don't reword, if locked.

---

## 5. Acceptance metrics — the sim gate (M1E, Lever-A-style)

**Two harness lanes are REQUIRED** (honesty note: the `auctionSim` bidding policies never call `cpuShillBidding.ts` — biddingPolicies.ts:12-35 routes to `rawWillingnessToPay`/`marginalValueBidder` only — so a sim-only gate would not exercise the live path JK sees):
1. **auctionSim lane:** `simulateAuction` (runAuctionSim.ts:256) over the F8-confirmation shapes — **{6-team, 12-team} × {k=0 + autoFill zero, k=0.65 + autoFill reserve} × 5 fixed seeds × {rationalBaseline, marginalValueV2Liquidity}**, real shipped player DB via the production pool path (currently 660 players across 30 teams; the "440-player" figure in earlier F8 evidence described that run, not a requirement — AMENDED per M1E BLOCKED ruling, Fable 2026-07-08) — 40 runs, ≥ the 36-roster evidence base that confirmed F8.
2. **Live-engine lane:** the state-machine driver pattern from `leverAReserveMeasurement.ts` (its `LeverAProductionTerminationCheck` machinery, lines 68-79) driving REAL `cpuBidOnLot`/`cpuDecideLoneSurvivor` with `needAwareCompletion: true`, same shapes/seeds.

**Per-roster metrics and pass/fail numbers (all measured on completed 22-man rosters):**

| # | Metric | PASS | FAIL |
|---|---|---|---|
| 1 | **Max primary stack** = max over the 8 field positions of hitters with that primary | ≤ 3 in ≥ 95% of rosters (k=0.65 legs); ≤ 4 in ≥ 95% (k=0 legs) | any roster with a 5+ stack, either leg |
| 2 | **Starved-sibling count**: rosters with (a) any primary stack ≥ 4 AND (b) any `depthReport().thinPositions` nonempty AND (c) final `budgetRemaining` ≥ that draft's median winning bid ("budget allowed cover") | **0 occurrences** across all runs | ≥ 1 |
| 3 | **CP stack**: rosters with ≥ 3 CPs | ≤ 5% of rosters | > 5% |
| 4 | **Completion regression**: stuck/incomplete/illegal-full team counts (existing `LeverAMeasurementRun` fields) | **0** across all runs | ≥ 1 |
| 5 | **Reserve invariant**: `soldBelowReserve` failures (k=0.65 legs) | **0** | ≥ 1 |
| 6 | **Economy non-regression** vs pre-change baseline (same seeds, k=0.65): spot-11 budget mean within ±3pp; `rosterStrengthSpread` mean ≤ baseline + 1pp (metrics.ts:65-94) | both hold | either drifts |
| 7 | **Determinism**: rerun of one full leg byte-matches (existing `determinismRerunMatched` pattern) | match | mismatch |
| 8 | **k=0 escape hatch**: k=0 + schedule-off flag reproduces today's baseline numbers exactly | match | mismatch |

Report shape: `MODE1_GAUNTLET`-compatible pass/fail per invariant per config, committed per run (punchlist §3 pattern). Metric 1's counting function should be the same helper the F11 finding uses — one counter, two consumers.

---

## 6. Open questions for the captain (genuine forks only)

1. **Floor of the schedule: 0.50 or effectively zero?** I recommend 0.50 — it keeps late-draft bargain liquidity (a $2k 5th-SS flyer with a huge fit draw stays possible), avoids lengthening pass-out/renomination churn at k=0.65, and the reserve floor already makes s≥4 wins vanishingly rare. A hard 0 is cleaner rhetorically ("never a 5th SS") but trades draft pacing for it. Fork because it is a feel/pacing call, not a math call.
2. **Does the discount also apply to the HUMAN-facing "worth to you" and bid-vs-pass surplus** (`computeOwnValue` consumers, rosterIntelligencePayload.ts:269), or CPU/market only? I recommend yes-everywhere (one-math covenant; the advisor SHOULD tell JK his 4th shortstop is worth less) — but it visibly changes whisper numbers JK has already eyeballed, so it is his register to approve.
3. **Farm auction: in or out for M1E?** The farm draft shares `cpuBidOnLot` (useFarmAuctionDraft.ts:309) but the 22-slot rosterNeed frame and `canCover` semantics are MLB-shaped, and lane M1D is concurrently restructuring farm valuation surfaces (F2/F3/F7). I recommend MLB-only in M1E with the wrapper degrading to 1.0 when position shapes are absent (the existing permissive-fallback policy, rosterNeed.ts:16-21), and a farm follow-up ticket after M1D lands. Fork because it is lane-sequencing, not design.

---

## 7. CAPTAIN RULINGS (Fable, 2026-07-08 — closes §6)

1. **Schedule floor = 0.50** (not zero). Late-draft bargain liquidity and pass-out pacing matter; the Lever A reserve already makes s≥4 wins vanishingly rare. It is one constant — a feel-tuning candidate later, not a redesign.
2. **The discount applies EVERYWHERE, including the human-facing "worth to you" and bid-vs-pass numbers.** One-math covenant (the F9 lesson): the advisor telling JK his 4th shortstop is worth less is the advisor doing its job. FLAGGED TO JK in plain terms (whisper numbers he has eyeballed will change); reversible presentation-side if he objects.
3. **MLB-only in M1E.** The wrapper degrades to 1.0 when position shapes are absent (existing permissive-fallback policy). Farm follow-up ticket opens after lane M1D lands (M1D is concurrently restructuring farm valuation surfaces).
4. §5's two-lane sim gate (auctionSim + live-engine driver) is BINDING — a sim-only gate does not exercise the live path and is not acceptance.
