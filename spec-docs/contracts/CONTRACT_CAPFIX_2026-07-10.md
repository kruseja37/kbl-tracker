# CONTRACT — CAPFIX: small-league cap normalization + the final viability loop (2026-07-10)

**Builder:** Codex (xhigh). **Auditor:** independent opus agent. **Captain:** Fable.
**Branch:** codex/auction-rebuild (continues the rebuild stack — its harness is the gate).
**Git discipline:** no git write commands; captain cuts commits; APPEND reports here.
UNKNOWN = STOP-and-report. Do not soften the bar.

## Why (the audit's evidence chain, accepted by the captain)
The rebuild's structure is proven sound; the deadlocks are the documented small-league cap
squeeze (cap thresholds fixed from the 20-team stock world). The audited counterfactual:
capScale=2 flips every 4-team seed from deadlock to full completion meeting EVERY bar
dimension. Two residuals: (1) `wouldStarveJointDemand` refuses a club's LAST legal nomination
(violates the rebuild contract's must-nominate obligation); (2) one 8t completion-shape strand
(pool surplus matter).

## Build
1. **Guard fix (repro-first):** `wouldStarveJointDemand` (cpuShillBidding.ts ~:527) stands
   down when the nominating club has no other legal nomination — a club with open seats and
   exactly one legal move MAKES that move. Repro: the audited 8t capScale=6 deadlock state
   pinned red, green after.
2. **Cap normalization (the product change, principled):** luxury-cap thresholds scale by
   league size. Requirements: at 20+ teams the scale is EXACTLY 1.0 (today's values
   byte-identical — tripwire test: a 20-team fixture's full tax table deep-equal pre/post);
   below 20 the thresholds relax smoothly and monotonically (no cliffs between adjacent team
   counts); ONE tunable parameter family (e.g., scale = (20/teams)^α, or a tuned per-size
   table derived from one κ) — the loop tunes that single parameter. Budgets, IV, rating math,
   club tax MECHANICS all unchanged — only the cap thresholds' league-size basis.
3. **The final viability loop:** re-run the rebuild's §4 loop with the cap parameter added to
   the knob set (plus the original §3 knobs incl. pool surplus for the 8t shape residual);
   max 6 iterations; THE BAR UNCHANGED (≥2 willing on ≥70% of lots; no >8-lot lockout before
   75% filled; every club completes a legal 22, zero safety nets; shills solvent; median
   price in [0.5,1.5]× market) on ALL seeds × {4-team, 8-team}.
4. **Collateral honesty:** existing tests that pin small-league tax values move to the new
   ruled behavior (assertions move, never weaken); 20-team pins must NOT move (the tripwire).
   The SHILLTAX diagnosis harness keeps working.

## Gates
tsc; build; auction suites + gauntlets + the sequential-nomination suite; ONE full vitest
(known solo flakes list applies); the loop table + verdict appended here: **GO** (bar met,
both sizes — the stack is merge-ready) or **DEFER** (final, with the binding constraint).

## Report
APPEND: guard-fix repro proof, the scaling function chosen + tuned parameter, the 20-team
tripwire evidence, per-iteration loop table, verdict, rough edges for JK's browser session.

---

## Builder report — 2026-07-10 — GO

**Verdict: GO.** The promoted defaults repeat the all-seed/all-size pass exactly. This is the
builder verdict; the stack is ready for the required independent Opus audit and captain gate.
No git write command was used.

### Guard fix: exact red/green proof

The conditional `RUN_CAPFIX_GUARD_REPRO=1` fixture freezes the accepted audit state at 8 real
clubs, the pre-CAPFIX 1.25 pool surplus, and `capScale=6` (implemented in the one-parameter
family as `alpha = ln(6) / ln(20/8)`). Before the product fix it was RED:

- `rebuild-a`: Yankees stopped at 21/22 with legal ceiling candidates that joint-demand
  politeness vetoed.
- `rebuild-b`: Yankees stopped at 21/22 for the same reason.
- Result: 1 failed test; both stalls were `NOMINATION:no-legal-cpu-nomination`.

After the fix it is GREEN: 1 passed, 3 skipped, 79.34 s. Nomination now keeps both the best
legal candidate and the best joint-demand-safe candidate. It prefers the safe candidate when
one exists; if no joint-demand-safe legal move exists, it makes the best legal move, including
the required exactly-one-legal-move case. The joint-demand guard still applies to bidding.

### Principled cap normalization

Only the luxury-cap thresholds move:

```text
scale(realTeams) = 1                                      when realTeams >= 20
scale(realTeams) = (20 / realTeams) ^ 0.55                when 1 <= realTeams < 20
normalizedCap   = stockCap * scale(realTeams)
```

The tuned single parameter is **alpha = 0.55**. Representative scales are 2.4234468666 at
4 teams, 1.6552629900 at 8 teams, 1.0286130196 at 19 teams, and exactly 1 at 20+. Adjacent
team counts are strictly monotone below 20; there is no size table or per-size exception.
Budgets, IV, rating math, tax rates, identity shifts, and tax collection mechanics are
unchanged.

The 20-team tripwire runs against all three stock tables (`juiced`, `standard`, `nerfed`) and
asserts the returned table is the same reference, deeply equal, and has identical serialized
bytes. The sub-20 test checks every adjacent team count from 1 through 20.

Product tax contexts now normalize from the real league-team count. The gauntlet's independent
marginal-tax oracle was moved to the same ruled basis: D5 still collects exactly $29,203.11 of
normalized tax, while the smaller D6 fixture now collects $0. The 20-team pins did not move.

### Final viability loop (bar unchanged; four of six allowed iterations used)

| Iteration | Alpha | Pool surplus | Passing runs | Willing range | Max pre-75% lockout | Legal clubs | Min shill cash | Median price/market | Safety nets | Result |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 0.4306765581 | 1.25 | 5/6 | 85.3–100.0% | 6 | 33/36 | $945,836 | 0.642–0.782 | 0 | FAIL: 8t `rebuild-c`, Orioles 21/22, no legal completion-shape candidate |
| 2 | 0.4306765581 | 1.50 | 5/6 | 83.2–98.4% | 6 | 34/36 | $955,836 | 0.628–0.749 | 0 | FAIL: 8t `rebuild-b`, White Sox 21/22, $10,836 left, no affordable legal candidate |
| 3 | 0.55 | 1.50 | 6/6 | 83.2–97.9% | 6 | 36/36 | $955,836 | 0.628–0.743 | 0 | PASS |
| 4 (promoted defaults) | 0.55 | 1.50 | 6/6 | 83.2–97.9% | 6 | 36/36 | $955,836 | 0.628–0.743 | 0 | **PASS — exact same run metrics as iteration 3** |

Final promoted-default detail:

| Size | Seed | Pool | Lots | Lots with >=2 willing | Max lockout | Legal | Min shill cash | Median price/market | Shill wins | Safety nets |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 4 | rebuild-a | 133 | 95 | 94.7% | 3 | 4/4 | $955,836 | 0.684 | 8 | 0 |
| 4 | rebuild-b | 133 | 95 | 83.2% | 3 | 4/4 | $980,836 | 0.628 | 8 | 0 |
| 4 | rebuild-c | 133 | 95 | 88.4% | 2 | 4/4 | $980,836 | 0.657 | 8 | 0 |
| 8 | rebuild-a | 266 | 187 | 95.2% | 5 | 8/8 | $1,025,836 | 0.722 | 12 | 0 |
| 8 | rebuild-b | 266 | 187 | 97.9% | 5 | 8/8 | $990,836 | 0.704 | 12 | 0 |
| 8 | rebuild-c | 266 | 187 | 97.9% | 6 | 8/8 | $1,035,836 | 0.743 | 12 | 0 |

The structural auction rules accepted in the rebuild audit remain intact: sequential
nominations, no pass recirculation, no settle/backfill safety net, and solvent non-completing
shills. CAPFIX removes the last-legal-move veto, relaxes only the small-league cap basis, and
raises the balanced pool surplus from 1.25 to 1.50 to clear the observed 8-team shape residual.

### Collateral and gates

- `git diff --check`: pass.
- `npx tsc -b --pretty false`: pass.
- `npm run build`: pass (existing Browserslist age, mixed dynamic/static import, and large-chunk
  warnings only).
- Exact CAPFIX guard repro: 1/1 pass (3 conditional tests skipped).
- Auction gauntlets: 3 files, 9/9 pass.
- Legacy SHILLTAX diagnosis switch: 1/1 pass (3 conditional tests skipped). Its accepted 1.25
  pool experiment is now explicit, while its tax lever context uses normalized product caps.
- Focused auction/pool/UI batch: 151 pass and one Draft Setup interaction timeout with verbose
  numeric-shape logging; the same UI file passed 21/21 in isolation with logs suppressed.
- One full quiet Vitest: **619 files passed, 8 skipped; 9,529 tests passed, 15 skipped** in
  217.07 s. Quiet mode suppresses console output only; it does not skip or alter assertions.

### Rough edges for JK's browser session

1. A newly generated balanced pool now targets 1.50x roster demand (132 players for the
   four-club/88-seat UI fixture). Confirm regeneration latency and whether that extra depth feels
   useful rather than noisy in Draft Setup.
2. A previously locked pool keeps its captured multiplier so opening an old league cannot silently
   rewrite its player set. Unlocking/regenerating is the explicit seam that adopts the 1.50 default.
3. Small-league tax should be visibly lighter, especially at four clubs; 20+ club behavior must look
   unchanged. Spot-check the tax preview at 4, 8, and 20 clubs.
4. Verbose numeric-shape console output can push one jsdom interaction beyond its old 12-second
   polling window; the quiet isolated file and quiet full suite are green. Browser-test actual
   regeneration responsiveness rather than relying on that logging-sensitive test timing.
5. No manual browser session was run by this builder. The pre-existing untracked
   `dispatch-prompt.txt` was left untouched.
