# CONTRACT — SNAKEFIX: the POC's solvency reserve is wrong (2026-07-10)

**Builder:** Codex (xhigh). **Auditor:** independent opus. **Captain:** Fable.
**Branch:** codex/snake-poc-salary-fix. Base: current main (post PR #59).
**Git discipline:** no git write commands; captain cuts commits; APPEND report here.
UNKNOWN = STOP-and-report.

## JK's field report (screenshot evidence, first minutes of a real POC draft)
2-team league (California Angels, Houston Astros), PICK 1 ROUND 1, both clubs $0 spent /
$1,064,387 headroom / 0 of 22 players / pool 1,166 available. EVERY candidate card shows NO
ROOM: "This pick leaves the club $288,421 short after saving enough to finish the 22"
(Nolan Ryan, TRUE COST $184,356); Fenomeno (SP/RP two-way, IV $124,165) shows "$3,288,589
short" AND a TRUE COST of $214,149 — i.e. ~$90k marginal tax ON AN EMPTY ROSTER. The draft is
unplayable from lot one.

## The three defects to find and fix (repro-first, each)
1. **The completion reserve is absurd.** Back-math: blocking Ryan at $184,356 with $1,064,387
   headroom implies a reserve of ~$1.17M for 21 remaining seats (~$55.6k/seat). The ruled
   semantics (TRADITIONAL_DRAFT_PROGRAM §3 + the POC contract item 4): the reserve is the
   CHEAPEST legal completion — minimum-IV players satisfying LEGAL_ROSTER position needs from
   the actual remaining pool (1,166 players — cheap bodies abound) — plus that completion's
   INCREMENTAL tax under the CORRECT league-size-scaled caps. Find what the POC's
   evaluateSnakePick/solvency path actually reserves (likely mean-priced or top-priced fills,
   or a per-slot constant, or tax with unscaled caps) and fix to the ruled semantics. Repro:
   a 2-team fixture, empty rosters, deep cheap pool → the top player MUST be draftable at
   pick 1; pin the reserve to cheapest-fills + incremental tax within tight bounds.
2. **Tax on an empty roster.** Fenomeno's $90k marginal tax as the FIRST player is suspect on
   two axes: (a) caps must be the league-size-normalized ones (2 teams → (20/2)^0.55 ≈ 3.55×
   relaxation — verify the snake path routes through normalizeAuctionLuxuryCapsForLeagueSize
   with the REAL club count, not a default-20 or shill-inflated count); (b) two-way players
   may be double-counted across batter AND pitcher cap rows — check how the auction path
   handles two-way cap membership and make the snake path identical. Repro: empty-roster
   marginal tax for a two-way and a pure pitcher in a 2-team fixture, pinned to the
   auction-path-equivalent values.
3. **Cosmetic:** the cap-ledger header renders "TAX SO" / "AR" overlapping ("TAX SO FAR"
   column collides with the HEADROOM value). Fix the layout so the three figures read cleanly.

## Non-goals
No auction-path changes (the normalize function and auctionMarginalTaxWithCaps are shared —
consume them correctly, do not modify them; if a shared function IS the bug, STOP-and-report).
No design changes beyond the fix. TRUE COST/STEAL semantics unchanged.

## Gates
tsc; build; the POC suites + a NEW end-to-end sanity: a scripted 2-team draft from the real
production pool shape completes all 44 picks with picks legal at every step; ONE full vitest
(known solo flakes list applies). APPEND report: root causes with file:line, repro red proof,
the reserve decomposition before/after for the Ryan case, gate outputs.
