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
