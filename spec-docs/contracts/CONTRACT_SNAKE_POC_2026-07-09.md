# CONTRACT — SNAKE DRAFT PROOF-OF-CONCEPT (2026-07-09)

**Builder:** Codex (xhigh). **Auditor:** independent opus agent. **Captain:** Fable.
**Branch:** codex/snake-poc. Base: main @ d4e04974.
**Binding design:** spec-docs/TRADITIONAL_DRAFT_PROGRAM_2026-07-09.md (§1 dynamic, §3 IV
settlement, §4 CPU picker + forecast, §5 board, §6 trades) — SIMPLIFIED per the JK POC ruling
below. UNKNOWN = STOP-and-report. No git write commands; captain cuts commits; APPEND report
to this file only; touch no other spec-doc.

## JK's POC ruling (2026-07-09, verbatim substance — this supersedes the D1→D7 sequencing)
"Prove the concept by isolating the snake draft with everything that matters to test it for
viability, without the farm draft involved: simply choose a pool of players and team
archetypes — most things already on the draft setup page — but then run it with the complete
information and dynamics of the snake draft we've discussed." Purpose: JK plays it in the
browser and judges whether the snake format is the better game. This is a POC: isolated,
dev-flagged, NO farm draft, NO season/franchise handoff, NO privacy ceremony (solo testing).

## Scope
**Setup = the existing Draft Setup page, untouched** except one addition: when the new flag
`isSnakeDraftPocEnabled` (house Phase-2 flag pattern, default ON) is on and the league's pool
is ready by EXISTING rules, Panel 5 shows a `START SNAKE DRAFT (POC)` button next to the
existing start button, routing to the snake page. JK configures pool + archetypes with the
tools already there. Do NOT build the full-universe pool model (that is D2, later).

**The draft room = the existing LeagueBuilderSnakeDraft.tsx page, rebuilt where it matters:**
1. **Route it** (POC-only): add the `/league-builder/snake-draft` route in App.tsx behind the
   flag. `mlbDraftRouteForFormat` and the league format selector stay UNTOUCHED (the POC
   entry is the Panel-5 button only — no format plumbing).
2. **22-round snake** off the existing session persistence (per-pick crash-safe, resume works
   — already built). Draft order: the page's existing manual reorder + a seeded SHUFFLE
   button.
3. **IV settlement, live:** each pick stamps `settledSalary = IV` into `completedPicks`
   (extend the entry shape) and the UI shows each team's running cap ledger:
   `spent = Σ IV picks`, headroom vs `resolveLeagueSalaryCap`, and running marginal-tax total
   (existing `auctionMarginalTaxWithCaps` per pick, accumulated). NO franchise commit (D1's
   lane owns that — do not touch franchiseInitializer or the pipeline).
4. **Legality + solvency guardrails:** live legal-22 tracking per team (position minimums,
   catcher depth, ≥1 closer via LEGAL_ROSTER); must-fill lock when remaining picks == unfilled
   required seats (candidate list constrained, reason shown in VOICE-style plain words);
   BLOCKED picks unpickable via the existing `assessSolvency` signal.
5. **The complete-information board** (§5 simplified): one board, position-filterable and
   PAGINATED (the current page renders every candidate — known scale cliff), sortable by:
   TRUE COST (IV + the viewing team's marginal tax), STEAL (the user's blended board value −
   TRUE COST, using Team.boardRankOverrides via assembleBoard), IV, and position. Steal badges
   on the top 3.
6. **CPU picker** (§4.1 simplified, seeded): for CPU-controlled teams,
   `score = blendedBoardValue × needMultiplier × fitMultiplier − λ·marginalTax` with the hard
   constraints from item 4; deterministic argmax + small seeded jitter from session.seed; auto-
   advances CPU picks with a short visible ticker (no timer for humans). λ: pick a value that
   makes CPU teams visibly tax-aware without paralysis; document your choice — the captain
   tunes later.
7. **Availability forecast** (§4.3 simplified): survival % per candidate to the user's next
   pick via N=50 jitter rollouts of the CPU picker (memoized per completed pick, computed
   off the hot path); color bands SAFE ≥85 / LIKELY 60-85 / COIN FLIP 35-60 / GONE <35 and a
   LAST REALISTIC PICK line (latest slot with survival ≥50%) on the card/popover.
8. **Trades, minimal but REAL** (§6 simplified): a trade panel on the user's turn — offer a
   swap of owned future picks with 0-2 sweetener picks; `validateTrade` renders the fairness
   verdict; CPU accepts iff the §4.1 value math nets positive for it (+5% greed margin) and
   its must-fill constraints survive; executed trades reassign `session.pickOrder[].teamId`
   and append to a new `session.trades[]`; forecast + order recompute after. Human↔human out
   of scope (solo POC).
9. **Run detection (cheap version):** when ≥3 same-position players go within 5 picks, one
   banner line naming the run and the remaining supply at that position.
10. **Copy:** VOICE-law compliant everywhere you write copy (no engine jargon, no raw enums);
    reuse the auction's vocabulary where concepts match (CEILING/HELD BACK do not apply here —
    cap ledger words: SPENT / HEADROOM / TAX SO FAR).

## Non-goals (POC)
No farm anything; no franchise/season handoff; no privacy reveal; no LLM color; no format
selector changes; no full-universe pool; no changes to auction files beyond the Panel-5 button
in Draft Setup; the trade-value chart and CPU picker constants are POC-grade (captain tunes
post-viability).

## Tests (POC-grade, still real)
Engine: CPU picker determinism (same seed → same draft), must-fill and legality constraints
(a CPU team never strands its roster), settlement stamping, forecast sanity (a top player's
survival to a far slot is lower than to the next slot), trade execution reassigns order +
recomputes. Page: renders a mid-draft session, human pick commits, resume-from-reload works
(existing persistence), pagination bounds. Full vitest as the closing gate — no new reds
anywhere (known solo flakes: AwardsWatchlist, franchiseManualSmokeFixture,
GameTrackerLaunchState, RosterDesigner two-way toggle, DraftSetup.money M3).

## Gates
tsc clean; build exit 0; the new suites + LeagueBuilderDraftSetup split suites green; ONE full
vitest run. Then a self-review pass: walk your own UI mentally lot-by-lot and list in the
report every rough edge JK will hit (honesty > polish).

## Report
APPEND here: per-item disposition, λ and any constants chosen with reasoning, gate outputs,
the rough-edges list, STOP items.
