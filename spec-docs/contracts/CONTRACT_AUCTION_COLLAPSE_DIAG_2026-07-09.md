# CONTRACT — AUCTION COLLAPSE DIAGNOSIS (2026-07-09)

**Builder:** Codex (xhigh). **Captain:** Fable. **Branch:** codex/auction-collapse-diag.
**Mission: DIAGNOSE, DO NOT FIX.** No product code changes. Measurement/instrumentation code
is committed for reproducibility (test-utils/ or a new scripts dir), never wired into the app.
**Git discipline:** no git write commands; captain cuts commits from your tree. APPEND your
report to this file only.

## JK's field report (verbatim substance — this is what you must reproduce and explain)
A 4-team + 1-shill MLB auction, production defaults. "Good at first, bidding back and forth,
teams building based on archetypes, following the asst GM's advice, and then all-of-a-sudden
every player puts you deep into the tax or is advised against; literally 50+ players come and
go without most teams being able to bid at all; the shill landed 4 players and was in the
−$400k zone and never put up a bid again; it feels silly and non-competitive after the first
20 picks or so."

## Reproduce
Use the existing simulation machinery (the auctionGauntlet suites' drive pattern, the
auctionSim/ harness, CPU profiles + shill behavior — whatever the gauntlet tests already use
to run full drafts headlessly). Configuration: 4 CPU club teams + 1 shill, production-default
tier/budget/caps/pool (the same defaults a user gets), full draft to completion or stall.
Run at least 3 seeds.

## Instrument per lot (the collapse curve)
For every lot, record per team: budgetRemaining, projectedTax so far, the liquidity ceiling /
max bid, whether the team COULD legally bid (ceiling ≥ opening ask), and whether it DID bid.
Aggregate per lot: willingBidders (could-bid count), actualBidders, raises count, disposition.
Produce a phase table (lots 1-20, 21-40, 41-60, …): avg willing bidders, % lots with ≥2
willing, % lots passed with zero bids.

## The five questions (answer each with data + file:line)
1. **When does biddability collapse** (lot index where willing-bidders drops below 2 and stays
   there), and is JK's "~20 picks in" reproduced?
2. **Decompose the lockout** at collapse: for each locked team, how much of the gap between
   budget and ceiling is (a) raw cash spent, (b) completion reserve (minimum fill), (c)
   completion TAX inside the reserve, (d) the candidate's own marginal tax? Which component
   dominates? (This decides whether the fix is tax tuning vs reserve semantics vs budgets.)
3. **The shill's −$400k:** trace its budget trajectory across its 4 wins. Find the exact code
   path that let budgetRemaining go negative (settlement math? tax charged post-hoc without a
   solvency check? backfill?). A negative budget is presumptively a BUG — name the line. Also:
   once negative, confirm why it never bids again and whether its price-pressure role is dead
   for the rest of the draft.
4. **Cap geometry vs league size:** which luxury-cap rows bind, for how many teams, by phase?
   The cap tables were tuned against what league shape (find the tuning provenance in
   spec-docs / tierParams comments)? Is a 4-team league structurally over-capped because top-N
   rating sums concentrate when the pool quality is sized for 4×22?
5. **Counterfactual levers** (rerun the same seeds, one lever at a time — measurement-only
   overrides, no product change): (a) tax charged ×0.5; (b) tax ×0 (control); (c) cap
   thresholds scaled up for small leagues (e.g., ×20/teamCount normalization or a flat +25%);
   (d) shill exempt from tax; (e) budgets +50%; (f) completion reserve WITHOUT its tax
   component. For each: the same phase table + % lots with ≥2 willing bidders. Rank levers by
   competitiveness restored per unit of economy distortion.

## Success metric definition (for the later fix loop — compute it for every run)
COMPETITIVE := (≥2 willing bidders on ≥70% of lots) AND (no team has a >8-consecutive-lot
lockout streak before lot 60) AND (shill budget ≥ 0 throughout) AND (every team completes a
legal 22).

## Gates
tsc clean on your instrumentation; the measurement runs committed + reproducible
(deterministic seeds); NO product file touched (the auditor will diff-check). Full vitest NOT
required (no product change) — run the auctionGauntlet suites to prove you didn't disturb them.

## Report
APPEND here: the phase tables per seed, the five answers with evidence, the lever ranking,
and your judgment: is this a TUNING problem (constants), a STRUCTURE problem (reserve/cap
semantics), or a SCALE problem (economy vs league size) — with the single most promising fix
identified for the captain's fix-loop contract.

---

## DIAGNOSIS REPORT — Codex (2026-07-09)

### Bottom line

**Judgment: STRUCTURE first, SCALE second, not completion-reserve tuning.** The field report's
exact timing ("~20 picks") and exact shill trajectory (4 wins, about -$400k) were **not** reproduced
literally. The failure shape was reproduced: in seed `collapse-c`, the shill's fifth win charged a
$950,985 marginal tax after a $38,051 salary and drove its $701,866 wallet to **-$287,170**; the
shill then had a zero ceiling and contributed no further price pressure. That same run delivered
only 56.7% multi-willing lots and a 27-lot pre-60 lockout for one club. The tax-exempt-shill
counterfactual restored that seed to 92.3% multi-willing lots and kept the shill at +$817,784.

The structural bug is exact: pure shills are declared non-completing, so their ceiling is raw
remaining budget and ignores candidate tax (`auctionStateMachine.ts:382-391`), but the shared lot
tax projection assigns them neutral/base-cap tax (`useAuctionDraft.ts:247-276`) and settlement
subtracts salary + that tax without a non-negative guard (`auctionStateMachine.ts:889-907`). The
small-league club squeeze is a second issue: cap thresholds are fixed from the 65th percentile of
the **20 stock SMB4 rosters**, not normalized for a four-club extracted auction
(`tierParams.ts:1-20`).

**Single most promising fix for the captain's first fix-loop contract:** make explicit pure shills
tax-neutral at the per-lot projection seam. This matches their intended non-completing,
price-pressure-only role, removes the negative-budget invariant violation at the source, and is the
least distortive lever that restored the field-report seed. After that structural fix is proven,
run a separate small-league cap-normalization loop; do not combine the two changes.

### Reproduction and measurement contract

New measurement-only harness: `scripts/auctionCollapseDiagnosis.test.ts`.

- Production-shaped inputs: juiced tier, $1,205,836 default budget, 22-man real rosters, four CPU
  clubs + one explicit non-completing shill, balanced 1.25x pool at quality center 68, reserve
  `k=0.65`, $5,000 increment. Pool extraction deliberately counts `shills: 0`, matching the live
  pool-first path (`LeagueBuilderDraftSetup.tsx:2558-2579`); harness setup is
  `scripts/auctionCollapseDiagnosis.test.ts:452-588`.
- Three fixed seeds use 12 of the 24 locked archetypes. Counterfactuals preserve the same pool,
  session ID, launch nonce, nomination seed, and profiles; only the named lever changes
  (`scripts/auctionCollapseDiagnosis.test.ts:538-605`).
- Every surfaced lot records each seat's remaining budget, candidate marginal tax, solvency
  ceiling, CPU liquidity max bid, could-bid/did-bid state, prior salary/tax spend, completion
  reserve, canonical completion tax, and binding cap rows
  (`scripts/auctionCollapseDiagnosis.test.ts:665-795`). Bid log consumption supplies actual bidders,
  raises, winner, price, and disposition (`scripts/auctionCollapseDiagnosis.test.ts:798-820`).
- `willingBidders` means seats whose live CPU max bid is at least the opening ask. `actualBidders`
  means unique bid/claim actors; forced fills are not bids. With
  `AUCTION_COLLAPSE_VERBOSE=1`, the harness prints the complete per-lot records.
- Success interprets "every team completes a legal 22" as **every roster-bearing real club**. The
  shill is explicitly non-completing by product design (`useAuctionDraft.ts:676-679`), so requiring
  its legal 22 would make every configured run fail by definition.

Reproduction command:

```sh
RUN_AUCTION_COLLAPSE_DIAG=1 AUCTION_COLLAPSE_COMPACT=1 AUCTION_COLLAPSE_TIMEOUT_MS=600000 \
  npx vitest run scripts/auctionCollapseDiagnosis.test.ts --reporter=dot
```

### Baseline phase tables — each deterministic seed

Columns are: `W` = average willing bidders, `2+` = percent of lots with at least two willing,
`P0` = percent of all lots that passed with zero bids. Lots exceed the 112-player pool because
reserve-price passed lots can be renominated.

| Seed | Phase | Lots | W | 2+ | P0 |
|---|---:|---:|---:|---:|---:|
| collapse-a | 1-20 | 20 | 5.00 | 100.0% | 0.0% |
| collapse-a | 21-40 | 20 | 4.55 | 100.0% | 0.0% |
| collapse-a | 41-60 | 20 | 3.35 | 100.0% | 0.0% |
| collapse-a | 61-80 | 20 | 2.15 | 85.0% | 35.0% |
| collapse-a | 81-100 | 20 | 2.00 | 70.0% | 70.0% |
| collapse-a | 101-120 | 20 | 1.35 | 30.0% | 90.0% |
| collapse-a | 121-140 | 20 | 2.20 | 80.0% | 95.0% |
| collapse-a | 141-160 | 4 | 2.75 | 100.0% | 100.0% |
| collapse-b | 1-20 | 20 | 5.00 | 100.0% | 0.0% |
| collapse-b | 21-40 | 20 | 4.75 | 100.0% | 0.0% |
| collapse-b | 41-60 | 20 | 4.35 | 100.0% | 0.0% |
| collapse-b | 61-80 | 20 | 3.95 | 100.0% | 5.0% |
| collapse-b | 81-100 | 20 | 2.55 | 70.0% | 45.0% |
| collapse-b | 101-120 | 20 | 1.50 | 35.0% | 75.0% |
| collapse-b | 121-140 | 3 | 2.33 | 100.0% | 0.0% |
| collapse-c | 1-20 | 20 | 4.35 | 100.0% | 0.0% |
| collapse-c | 21-40 | 20 | 4.00 | 100.0% | 5.0% |
| collapse-c | 41-60 | 20 | 1.75 | 60.0% | 35.0% |
| collapse-c | 61-80 | 20 | 0.90 | 15.0% | 60.0% |
| collapse-c | 81-100 | 20 | 0.95 | 25.0% | 85.0% |
| collapse-c | 101-120 | 20 | 1.40 | 40.0% | 85.0% |
| collapse-c | 121-140 | 20 | 1.20 | 25.0% | 95.0% |
| collapse-c | 141-160 | 20 | 2.25 | 80.0% | 95.0% |
| collapse-c | 161-180 | 4 | 2.00 | 100.0% | 75.0% |

Baseline overall `2+`: seed A 81.3%, seed B 84.6%, seed C 56.7%. All three state-machine
runs reached completion and all four real clubs ended with legal 22s. Only seed B passed the full
COMPETITIVE metric. Seed A failed because one club's pre-60 lockout streak was 20; seed C failed
on the negative shill and a 27-lot club lockout.

## The five answers

### 1. When does biddability collapse, and is "~20 picks" reproduced?

**No.** None of the three baseline runs has a literal suffix where willing bidders drop below two
and never recover; `collapseLot = null` for all three. Late forced completion and roster exits can
leave two remaining seats temporarily willing again. Using the success metric's eight-lot concept
as a secondary sustained-collapse read, seed C first has eight consecutive sub-two lots at **lot
73**. The severe degradation begins earlier: seed C falls to 1.75 average willing in lots 41-60,
immediately around the shill's negative settlement at lot 44, then stays at 0.90-1.40 through lots
61-140 before the late rebound.

A 24-seed production-default sensitivity sweep also did not reproduce a ~20-lot sustained
collapse. The earliest eight-lot collapse in that sweep began at lot 90; negative shill budgets
occurred in three additional seeds, but after 6-9 wins. Therefore the field report's **phenotype is
confirmed**, while its exact timing is **not reproduced** by the available deterministic inputs.

Evidence: phase aggregation is `scripts/auctionCollapseDiagnosis.test.ts:823-850`; literal and
eight-lot collapse detection is `scripts/auctionCollapseDiagnosis.test.ts:852-889`.

### 2. Lockout decomposition at the severe seed's sustained-collapse point

Snapshot: seed C, lot 73. Dollar figures are rounded. `Prior cash used` is the original budget
minus remaining budget; salary and already-charged tax are shown inside it. `Completion tax
applied` is zero because the live `cpuBidOnLot` call does not pass the optional
`completionTaxContext` into `evaluateLiquidityAwareBid` (`cpuShillBidding.ts:383-398`), although
the liquidity engine can calculate it when that context exists (`liquidityAwareBidding.ts:157-204`).
The canonical latent number is reported to show scale, not to claim it affected the CPU ceiling.

| Locked seat | Roster | Budget left | CPU max | Prior cash used | Salary in prior use | Tax in prior use | Fill salary reserve | Completion tax applied (canonical latent) | Candidate marginal tax |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Blue Jays | 4 | $252,733 | $17,144 | $953,103 | $169,608 | **$783,495** | $235,589 | $0 ($1,630,437) | $0 |
| Yankees | 18 | $62,575 | $0 | $1,143,261 | $747,401 | $395,860 | $0 | $0 ($0) | **$828,404** |
| Orioles | 13 | $219,753 | $10,227 | $986,083 | $445,911 | **$540,172** | $95,835 | $0 ($1,055,355) | $113,691 |
| Rays | 18 | $47,960 | $0 | $1,157,876 | $671,529 | $486,347 | $0 | $0 ($0) | **$504,424** |
| Shill | 5 | -$287,170 | $0 | $1,493,006 | $219,898 | **$1,273,108** | $0 | $0 ($0) | $0 on lot 73 |

**Dominant component: tax already charged, followed by the current candidate's marginal tax.**
The completion salary reserve dominates only the unusually short Blue Jays roster; even there,
previous tax ($783k) is more than 3x the $236k fill reserve. Completion tax is not causing this CPU
lockout because it is not wired into this drive. This rules out "remove completion tax from the
reserve" as the fix; that counterfactual is byte-for-byte identical to baseline.

Evidence: `sessionBidCeiling` subtracts current candidate marginal tax and completion salary
reserve (`auctionStateMachine.ts:382-437`); the harness independently decomposes those components
at `scripts/auctionCollapseDiagnosis.test.ts:718-781`.

### 3. The negative shill budget

Seed C trajectory:

| Win | Lot | Salary | Marginal tax charged | Budget after |
|---:|---:|---:|---:|---:|
| 1 | 5 | $47,114 | $0 | $1,158,722 |
| 2 | 38 | $36,648 | $0 | $1,122,074 |
| 3 | 41 | $39,556 | $322,123 | $760,395 |
| 4 | 43 | $58,529 | $0 | $701,866 |
| 5 | 44 | $38,051 | **$950,985** | **-$287,170** |

The exact field number (4 wins / about -$400k) did not reproduce; the invariant violation did,
one win later.

Exact code path:

1. The tax context contains identities for real league teams only (`useAuctionDraft.ts:205-216`,
   `useAuctionDraft.ts:697-701`).
2. The projector nevertheless maps **every session team**, including the explicit shill. With no
   identity, the tax helper uses unshifted base caps and writes a real candidate marginal tax
   (`useAuctionDraft.ts:247-276`; `auctionLuxuryTax.ts:34-49,83-90`).
3. Because the shill is non-completing, its pre-bid ceiling is `max(0, budgetRemaining)` and ignores
   that projected tax (`auctionStateMachine.ts:382-391`). The $38,051 ask is therefore allowed
   against $701,866 cash despite the additional $950,985 settlement tax.
4. `finalizeSoldLot` subtracts salary + projectedTax with no non-negative check: **the named bug
   line is `auctionStateMachine.ts:905`**.
5. On later lots the same non-completing ceiling clamps the negative wallet to zero, and
   `cpuBidOnLot` returns `over-budget` whenever opening ask > 0 (`cpuShillBidding.ts:374-380`). The
   configured win cap is 10 (`useAuctionDraft.ts:291-300` / `auctionPoolSizing.ts:37-51`), so the
   five-win repro did **not** stop because it hit its cap. Its price-pressure role is dead solely
   because of the negative wallet.

This is a confirmed product bug, not a tuning preference.

### 4. Cap geometry vs league size

The cap rows are fixed top-N rating-sum tests (hitters top 8, rotation top 4, bullpen top 3/4;
`tierParams.ts:81-101`). Their provenance is explicit: the 65th percentile of the top-N sums from
the **20 real stock SMB4 rosters** (`tierParams.ts:17-20`). There is no team-count term. Meanwhile,
the four-club production pool is extracted for 4x22 real demand, with shills excluded from sizing
(`LeagueBuilderDraftSetup.tsx:2566-2573`).

Top binding rows below are average teams bound per lot across all baseline seeds that reached the
phase (missing row in a seed counts as zero):

| Phase | #1 | Teams | #2 | Teams | #3 | Teams | #4 | Teams |
|---|---|---:|---|---:|---|---:|---|---:|
| 1-20 | bullpen/POW | 0.22 | rotation/POW | 0.22 | rotation/SPD | 0.07 | — | — |
| 21-40 | hitters/FLD | 0.42 | hitters/ARM | 0.40 | hitters/SPD | 0.35 | hitters/CON | 0.35 |
| 41-60 | rotation/SPD | 1.15 | rotation/ACC | 1.08 | hitters/FLD | 0.98 | rotation/VEL | 0.97 |
| 61-80 | rotation/VEL | 1.95 | hitters/ARM | 1.85 | rotation/SPD | 1.65 | rotation/ACC | 1.62 |
| 81-100 | hitters/ARM | 2.12 | rotation/VEL | 2.00 | rotation/ACC | 1.67 | rotation/SPD | 1.67 |
| 101-120 | hitters/ARM | 2.33 | rotation/VEL | 2.00 | hitters/FLD | 1.67 | rotation/ACC | 1.67 |
| 121-140 | hitters/ARM | 2.33 | rotation/VEL | 2.00 | bullpen/ACC | 1.78 | hitters/FLD | 1.67 |

**Conclusion:** four-team leagues are not mechanically over-capped by a formula containing
`teamCount`; there is no such formula. They are empirically over-exposed because a 112-player,
archetype-shaped auction lets four clubs assemble rating concentrations that are compared to a
fixed 20-stock-roster reference distribution. The +25% cap counterfactual raising average
multi-willing performance from 74.2% to 92.6% is strong evidence of a **scale/calibration** issue,
but it does not erase the separate structural shill bug.

### 5. Counterfactual levers

Each phase table below is pooled across the identical three seeds. `N` is total lots contributing
to that phase; columns otherwise match the baseline tables.

#### (a) Tax charged x0.5

| Phase | N | W | 2+ | P0 |
|---|---:|---:|---:|---:|
| 1-20 | 60 | 5.0 | 100.0% | 0.0% |
| 21-40 | 60 | 4.7 | 100.0% | 0.0% |
| 41-60 | 60 | 4.0 | 100.0% | 0.0% |
| 61-80 | 60 | 3.1 | 98.3% | 23.3% |
| 81-100 | 60 | 2.5 | 76.7% | 75.0% |
| 101-120 | 60 | 2.4 | 61.7% | 95.0% |
| 121-140 | 60 | 2.5 | 81.7% | 98.3% |
| 141-160 | 9 | 2.4 | 77.8% | 100.0% |

#### (b) Tax x0 control

| Phase | N | W | 2+ | P0 |
|---|---:|---:|---:|---:|
| 1-20 | 60 | 5.0 | 100.0% | 0.0% |
| 21-40 | 60 | 5.0 | 100.0% | 0.0% |
| 41-60 | 60 | 4.7 | 100.0% | 0.0% |
| 61-80 | 60 | 4.0 | 100.0% | 13.3% |
| 81-100 | 60 | 3.3 | 100.0% | 36.7% |
| 101-120 | 54 | 2.5 | 100.0% | 74.1% |
| 121-140 | 22 | 2.0 | 100.0% | 95.5% |

#### (c) Luxury cap thresholds +25%

| Phase | N | W | 2+ | P0 |
|---|---:|---:|---:|---:|
| 1-20 | 60 | 5.0 | 100.0% | 0.0% |
| 21-40 | 60 | 5.0 | 100.0% | 0.0% |
| 41-60 | 60 | 4.5 | 100.0% | 0.0% |
| 61-80 | 60 | 4.2 | 100.0% | 13.3% |
| 81-100 | 60 | 3.4 | 100.0% | 46.7% |
| 101-120 | 54 | 2.1 | 66.7% | 61.1% |
| 121-140 | 23 | 1.5 | 52.2% | 95.6% |

#### (d) Shill exempt from tax

| Phase | N | W | 2+ | P0 |
|---|---:|---:|---:|---:|
| 1-20 | 60 | 4.8 | 100.0% | 0.0% |
| 21-40 | 60 | 4.4 | 100.0% | 1.7% |
| 41-60 | 60 | 3.5 | 100.0% | 3.3% |
| 61-80 | 60 | 2.8 | 91.7% | 31.7% |
| 81-100 | 60 | 2.2 | 68.3% | 65.0% |
| 101-120 | 60 | 1.7 | 53.3% | 83.3% |
| 121-140 | 43 | 2.3 | 86.0% | 88.4% |
| 141-160 | 20 | 3.0 | 100.0% | 95.0% |

#### (e) Budgets +50%

| Phase | N | W | 2+ | P0 |
|---|---:|---:|---:|---:|
| 1-20 | 60 | 5.0 | 100.0% | 0.0% |
| 21-40 | 60 | 4.7 | 100.0% | 0.0% |
| 41-60 | 60 | 4.0 | 100.0% | 0.0% |
| 61-80 | 60 | 3.2 | 96.7% | 21.7% |
| 81-100 | 60 | 2.9 | 95.0% | 76.7% |
| 101-120 | 60 | 2.4 | 71.7% | 86.7% |
| 121-140 | 55 | 2.2 | 74.5% | 89.1% |
| 141-160 | 7 | 1.6 | 57.1% | 100.0% |

#### (f) Completion reserve without its tax component

This table is exactly baseline:

| Phase | N | W | 2+ | P0 |
|---|---:|---:|---:|---:|
| 1-20 | 60 | 4.8 | 100.0% | 0.0% |
| 21-40 | 60 | 4.4 | 100.0% | 1.7% |
| 41-60 | 60 | 3.2 | 86.7% | 11.7% |
| 61-80 | 60 | 2.3 | 66.7% | 33.3% |
| 81-100 | 60 | 1.8 | 55.0% | 66.7% |
| 101-120 | 60 | 1.4 | 35.0% | 83.3% |
| 121-140 | 43 | 1.7 | 55.8% | 88.4% |
| 141-160 | 24 | 2.3 | 83.3% | 95.8% |
| 161-180 | 4 | 2.0 | 100.0% | 75.0% |

The harness directly asserts all three completion-tax-off runs have identical phase rows, shill
trajectories, and final teams to baseline. This is a code-path fact, not statistical noise.

### Success metric — every run

`Y/N` is the complete composite metric, not just the 70% willing-bidder clause.

| Lever | Seed A: 2+ / success | Seed B: 2+ / success | Seed C: 2+ / success | Runs completed |
|---|---:|---:|---:|---:|
| Baseline | 81.3% / N | 84.6% / **Y** | 56.7% / N | 3/3 |
| Tax x0.5 | 84.4% / **Y** | 83.8% / N | 95.9% / N | 2/3 |
| Tax x0 | 100.0% / **Y** | 100.0% / N | 100.0% / **Y** | 3/3 |
| Caps +25% | 84.3% / N | 100.0% / N | 93.4% / **Y** | 3/3 |
| Shill tax-exempt | 81.3% / N | 84.6% / **Y** | 92.3% / N | 3/3 |
| Budgets +50% | 91.3% / N | 89.1% / N | 91.8% / N | 2/3 |
| Completion tax off | 81.3% / N | 84.6% / **Y** | 56.7% / N | 3/3 |

### Lever ranking — competitiveness restored per economy distortion

Baseline mean `2+` is 74.2%.

| Rank | Lever | Mean 2+ | Gain vs baseline | Why this rank |
|---:|---|---:|---:|---|
| 1 | **Shill tax-exempt** | 86.1% | +11.9 pp | Narrowest scope; fixes a hard invariant and restores the field seed +35.6 pp without changing club taxes. |
| 2 | **Caps +25%** | 92.6% | +18.4 pp | Best broad restoration without deleting tax or inflating all wallets; directly targets the 20-team calibration mismatch. Needs tuning, not an arbitrary permanent +25%. |
| 3 | Tax x0.5 | 88.0% | +13.8 pp | Helps, but halves the whole tax economy and one seed becomes uncompletable. |
| 4 | Budgets +50% | 90.7% | +16.5 pp | Large economy inflation, zero composite successes, and one uncompletable seed. |
| 5 | Tax x0 | 100.0% | +25.8 pp | Strong control proving tax causality, but maximal distortion: it deletes the intended system and still passes the composite metric in only 2/3 seeds. |
| 6 | Completion tax off | 74.2% | +0.0 pp | No effect because that component is absent from the live CPU bidding call. |

## Final classification and fix-loop recommendation

1. **STRUCTURE — confirmed blocker:** non-completing shill ignores candidate tax before purchase,
   is charged it after purchase, may go negative, then becomes permanently unable to bid. Fix this
   first with a narrow shill-tax-neutral contract and a red-first negative-budget reproduction.
2. **SCALE — confirmed secondary pressure:** fixed luxury rows were calibrated on 20 stock rosters
   and bind rapidly in the four-team extracted auction. After the shill fix, test a principled
   team-count/pool-concentration cap normalization (not budgets and not tax deletion) against the
   same matrix.
3. **TUNING — downstream only:** tax multiplier and budget changes improve headline bidder counts
   but fail other completion/lockout gates. They should not be the first intervention.
4. **Reserve semantics — exonerated for this CPU repro:** completion salary reserve is occasionally
   material, but prior charged tax and current marginal tax dominate; completion tax is not wired
   into the CPU reserve and removing it changes nothing.

## Verification and reproducibility

- Instrumentation-only TypeScript check: PASS.
  `npx tsc --noEmit --target ES2022 --module ESNext --moduleResolution bundler --types node,vite/client --skipLibCheck --strict --jsx react-jsx --allowImportingTsExtensions scripts/auctionCollapseDiagnosis.test.ts`
- Repo TypeScript build check: PASS. `npx tsc -b --pretty false`
- Final 21-run diagnostic matrix: PASS, 1/1; deterministic replay assertion PASS;
  completion-tax control identity assertions PASS; 81.31 seconds in final run.
- Existing auction gauntlets: PASS, 2/2.
  `npx vitest run src/engines/__tests__/auctionGauntlet.test.ts src/engines/__tests__/auctionGauntletProductionDefaults.test.ts --reporter=verbose`
- Supplemental seed search: PASS, 24 production-default deterministic seeds; 191.30 seconds.
- Product files touched: **none**. Files added/modified by this diagnosis are only
  `scripts/auctionCollapseDiagnosis.test.ts` and this contract report. No git write command was
  run; the captain owns staging and commits.

---

## Captain fix ruling (2026-07-09) — SHILLTAX fix authorized on this branch
The diagnosis is accepted. Build the single structural fix it ranked first, on this branch,
reusing the committed harness as the exit gate:
1. **Shills are tax-neutral, end to end.** At the per-lot tax projection seam
   (useAuctionDraft ~:247-276), explicit pure shills (the non-completing seats) get ZERO
   projected tax — matching the ceiling math that already treats them as tax-blind
   (auctionStateMachine ~:382-391). Settlement for shill wins subtracts salary only. This is
   a JK-mandated product bug fix to CPU-adjacent behavior — documented here as such; the
   no-fixture-bend rule does not apply, and club-team behavior is UNTOUCHED.
2. **No silent clamps.** Do NOT add a max(0, …) heal at settlement — after fix 1 a shill's
   ceiling equals raw budget and settlement charges salary only, so negativity is impossible
   by construction. Instead add the INVARIANT: a permanent gauntlet assertion that no seat's
   budget is ever negative at any point in any run (all formats). If the invariant still
   trips anywhere, STOP-and-report the path — do not clamp it away.
3. **Repro-first:** a failing test pinning today's bug (shill projected tax > 0 on a lot /
   the collapse-c seed's negative trajectory) before the fix.
4. **Exit gate:** re-run the diagnosis harness, same 3 seeds, unmodified levers: shill
   solvent throughout on ALL seeds; ≥2 willing bidders on ≥70% of lots on ALL seeds; no
   >8-consecutive-lot club lockout before lot 60 — if a seed still fails ONLY the lockout
   criterion, record it as the cap-normalization residual (next loop's input), do not force
   it with additional changes.
5. Gates: tsc, build, auction suites (state machine, gauntlets, useAuctionDraft), ONE full
   vitest. APPEND your fix report here.

---

## SHILLTAX FIX REPORT — Codex (2026-07-09)

### Status

**COMPLETE — the ruled structural fix is built and locally verified.** Explicit
`nonCompletingTeamIds` now receive zero per-lot projected tax at the live MLB auction projection
seam. Because the unchanged state machine already gives those seats a raw-cash ceiling, shill
settlement now subtracts salary only by construction. Real roster-bearing club tax projection,
ceiling, and settlement behavior are untouched.

This was one Tier-1 critical economics batch under the accepted diagnosis. No cap normalization,
budget tuning, tax-rate tuning, reserve change, UI change, schema change, or settlement clamp was
included.

### Repro-first evidence

The regression was added before the product edit and run alone:

```sh
NODE_ENV= npx vitest run src/src_figma/app/hooks/__tests__/useAuctionDraft.test.ts \
  -t "SHILLTAX repro" --reporter=verbose
```

Pre-fix result: **RED, 1 failed**. The real club and explicit non-completing shill both received a
`$500,000` projected tax on the same surfaced lot; the shill assertion expected `$0` and received
`$500,000`. After the product edit the same test is **GREEN** and also settles a shill win through
the unchanged state machine, proving its wallet falls by opening salary only while the real club's
projected tax remains positive.

### Changes made

1. `src/src_figma/app/hooks/useAuctionDraft.ts`
   - `applyAuctionLuxuryTaxForLot` now builds the authoritative non-completing-seat set from
     `session.config.nonCompletingTeamIds` and assigns those seats `projectedTax: 0` before any
     roster/candidate tax computation.
   - Real clubs continue through the existing `auctionMarginalTaxWithCaps` call unchanged.
   - `auctionStateMachine.ts` is byte-untouched. In particular, settlement remains
     `budgetRemaining - salary - projectedTax`; no `Math.max(0, ...)` or other silent heal was
     added.
2. `src/src_figma/app/hooks/__tests__/useAuctionDraft.test.ts`
   - Adds the red-first per-lot projection regression and salary-only end-to-end shill settlement
     assertion, with a same-lot positive-tax assertion protecting real-club behavior.
3. `src/engines/__tests__/auctionGauntlet.test.ts`
   - Adds a permanent every-seat, after-every-transition `budgetRemaining >= 0` invariant across
     the six pool-first/design-first/tax-shape gauntlet formats.
4. `src/engines/__tests__/auctionGauntletProductionDefaults.test.ts`
   - Adds the same transition-level invariant to the production-default shill gauntlet, including
     all explicit shill seats rather than skipping non-completing teams at final summary time.
5. `scripts/auctionCollapseDiagnosis.test.ts`
   - Promotes the captain's exit criteria into assertions for the three baseline seeds: non-negative
     shill budget, at least 70% multi-willing lots, and legal 22-player real-club completion.
   - Emits any remaining pre-lot-60 lockout failures as the next-loop cap-normalization residual.
6. This contract report.

### Diagnosis-harness exit gate

Command (same three deterministic seeds and the original one-at-a-time lever matrix):

```sh
NODE_ENV= RUN_AUCTION_COLLAPSE_DIAG=1 AUCTION_COLLAPSE_COMPACT=1 \
  AUCTION_COLLAPSE_TIMEOUT_MS=600000 \
  npx vitest run scripts/auctionCollapseDiagnosis.test.ts --reporter=dot
```

Result: **PASS, 1/1** (one opt-in search test skipped), 79.17 seconds.

| Seed | Completed | Legal real clubs | Shill min budget | Lots with 2+ willing | Pre-60 lockout residual |
|---|---:|---:|---:|---:|---|
| `collapse-a` | yes | 4/4 | **+$892,175** | **81.3%** | Blue Jays, 20 lots |
| `collapse-b` | yes | 4/4 | **+$817,453** | **84.6%** | none |
| `collapse-c` | yes | 4/4 | **+$817,784** | **92.3%** | Blue Jays, 27 lots |

The former `collapse-c` failure is gone: all ten shill wins now charge `$0` tax, including lot 44,
which previously charged `$950,985` and drove the wallet to `-$287,170`. The shill-tax-exempt
counterfactual is now byte-identical to product baseline, as expected after making that lever the
real rule.

The two remaining composite-metric failures are **only** the allowed lockout criterion. Shill
solvency, the 70% competitiveness threshold, auction completion, and legal real-club rosters all
pass. Per the ruling, the 20-lot and 27-lot Blue Jays streaks are recorded as the small-league
cap-normalization residual and were not forced green with an additional economy change.

### Verification

- Pre-change baseline build: **PASS**.
- Pre-change full Vitest: **9,504 passed / 13 skipped / 0 failed** across 625 files.
- Red-first SHILLTAX repro: **RED as intended**, received `$500,000` shill projected tax.
- Fixed SHILLTAX repro: **1/1 PASS**.
- State machine + both gauntlets + full `useAuctionDraft`: **45/45 PASS**.
- Diagnosis exit gate: **1/1 PASS**, metrics in the table above.
- `npx tsc -b --pretty false`: **PASS**.
- `npm run build`: **PASS** (`vite` built 2,647 modules; existing chunk-size/dynamic-import
  warnings only).
- Dev-server startup: **PASS**, Vite ready at `127.0.0.1:5173` with no startup error; stopped
  immediately after the smoke.
- Closing full Vitest: **9,505 passed / 13 skipped / 0 failed** across 625 files (one new test,
  no regression), 229.88 seconds.
- `git diff --check`: **PASS**.

No browser behavior changed, so no browser walk was required for this engine/hook semantics fix.
JK's broader auction walkthrough remains a separate acceptance gate.

### File and git discipline

Six task files are modified after this report: the live hook, its test, both permanent gauntlets,
the diagnosis harness, and this contract. Pre-existing untracked `dispatch-prompt.txt` was not
read, edited, staged, or removed. No git write command was run; all files are left in the working
tree for the captain.
