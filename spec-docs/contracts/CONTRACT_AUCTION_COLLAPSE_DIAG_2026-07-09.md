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
