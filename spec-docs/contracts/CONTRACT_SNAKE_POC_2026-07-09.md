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

---

## Builder report — 2026-07-10

### Outcome

Items 1-10 are implemented in the isolated, flag-gated Snake Draft POC. The POC does not
write rosters or franchise/season state, does not enter a farm draft, and does not add privacy,
LLM, format-selector, or full-universe behavior. The original auction start path remains in
place. Files are deliberately left in the working tree for the captain; the builder ran no git
write command.

The focused POC, typecheck, build, and every Draft Setup split gate are green. The one required
full Vitest run finished with one unrelated full-suite-only timing failure in
`franchiseOffseasonGuards.component.test.tsx`; that exact file then passed 24/24 solo. Because
this file is not in the contract's known-solo-flake list, the full-suite gate is reported as a
STOP item rather than silently called green.

### Per-item disposition

1. **POC route and entry — BUILT.** Added the default-ON `snakeDraftPoc` house Phase-2 flag,
   activation-console control, a lazy `/league-builder/snake-draft` route guarded by
   `isSnakeDraftPocEnabled`, and the readiness-gated `START SNAKE DRAFT (POC)` Panel-5 button.
   `mlbDraftRouteForFormat`, the format selector, and auction routing were not changed.
2. **22-round snake and order — BUILT.** Uses the existing MLB draft-session persistence and
   `buildSnakeOrder` for 22 rounds. The pre-draft room supports manual up/down ordering plus a
   deterministic seeded shuffle. Every accepted pick persists immediately and reload resumes
   from `currentPickIndex`.
3. **Live IV settlement — BUILT.** Completed picks now optionally persist `settledSalary` and
   `marginalTax`; POC picks stamp IV as settled salary. The room reconstructs and displays SPENT,
   HEADROOM, and accumulated TAX SO FAR per club. No roster/franchise commit exists.
4. **Pick guard — BUILT.** `evaluateSnakePick` composes the canonical roster law,
   `assessSolvency`, `cheapestLegalCompletion`, and exact marginal-tax calculation. A candidate
   cannot be confirmed when the remaining pool cannot still produce a legal and solvent 22;
   must-fill pressure is surfaced in plain language.
5. **Complete-information board — BUILT.** The board uses the existing roster-intelligence
   payload, GM rank overrides, archetype fit, roster need, IV, marginal tax, true cost, and steal.
   It has position filtering, STEAL / TRUE COST / IV / POSITION sorts, top-three steal callouts,
   and bounded 36-player pages with full ratings and forecast cards.
6. **CPU picker and ticker — BUILT.** CPU turns use the specified
   `board value * need * fit - lambda * marginal tax` score, deterministic seeded texture, and
   the same legal-completion guard before committing. A visible ticker precedes each automatic
   CPU pick.
7. **Availability forecast — BUILT, POC-GRADE.** Fifty deterministic rollouts produce survival
   percentages at future user turns and a last-realistic-pick marker. Work is deferred until
   after the human-turn render and cached by picks, order, and trades so it is not in the pick
   commit path.
8. **Real future-pick trades — BUILT, POC-GRADE.** The panel selects actually owned future
   picks, renders `validateTrade`, applies the CPU's projected draft value with a 5% greed margin,
   checks that legal completion still survives, rewrites `session.pickOrder[].teamId`, appends a
   durable `session.trades[]` record, and invalidates forecast/order-derived state.
9. **Run detection — BUILT.** Three or more identical primary-position selections in the last
   five picks produce one banner naming the position, run count, and remaining supply.
10. **Copy and isolation — BUILT.** New UI uses user-facing draft language and the required cap
    ledger words. Completion explicitly ends as an isolated viability test with no season
    handoff. No raw engine verdicts are exposed.

### POC constants and reasoning

- `cpuTaxLambda = 1.15`: tax costs slightly more than one point of board value so a CPU does not
  treat a heavily taxed marginal upgrade as neutral, while still allowing a clearly stronger
  player to win.
- `cpuJitterFraction = 0.01`: seeded texture is capped at plus/minus 1% of board value, enough to
  break repetitive near-ties without overwhelming board, need, fit, or tax.
- `forecastRollouts = 50`: the contract's cheap-N target; adequate to expose direction and bands
  for the viability test without putting a large simulation in the pick commit.
- `cpuTradeGreedMargin = 0.05`: the ruled CPU acceptance premium.
- `runWindowPicks = 5`, `runMinimumPicks = 3`: the ruled cheap run detector.
- `BOARD_PAGE_SIZE = 36`: bounds legal-completion card work and keeps a meaningful board slice
  visible.
- `CPU_TICK_MS = 350`: creates a readable decision beat without making each CPU turn feel like a
  modal ceremony.
- Fit uses the existing bounded archetype-fit scorer; need uses existing `ownNeedMultiplier`;
  these were reused instead of adding duplicate POC dials.

### Tests and gates

- `NODE_ENV= npx tsc -b --pretty false` — exit 0, clean output.
- `NODE_ENV= npm run build` — exit 0; 2,649 modules transformed; production build and PWA output
  completed. Existing Browserslist age, mixed dynamic/static import, and large-chunk warnings
  remained warnings only.
- New engine/page/flag focused run — 3 files passed, 15 tests passed. This includes 7 Snake
  engine tests, 3 Snake page tests, and the activation-flag suite.
- New suites plus Draft Setup setup coverage — 4 files passed, 39 tests passed.
- All Draft Setup split suites (`RankYourBoardZone`, `board`, `money`, `poolLock`, `setup`,
  `universe`) — 6 files passed, 106 tests passed.
- `git diff --check` — exit 0.
- **The one full Vitest run** — exit 1: 618 files passed, 1 failed, 7 skipped; 9,515 tests passed,
  1 failed, 11 skipped. Sole failure:
  `franchiseOffseasonGuards.component.test.tsx > TradeFlow exposes franchise transaction console
  and keeps advisory preview read-only`, which observed the component's loading state before
  `TEAM NEEDS / SURPLUS` appeared.
- Exact classification rerun of that file only — exit 0: 1 file passed, 24 tests passed. No full
  suite rerun was made.

### Lot-by-lot self-review: rough edges JK will hit

1. **Setup still inherits the existing readiness law.** Even though the POC never runs a farm
   draft, the shared Draft Setup readiness path can still require the existing MLB/farm identity
   setup before the POC button enables. This is contract-faithful but is extra ceremony for a
   snake-only playtest.
2. **First human seat is the advisor seat.** The room treats the first human-controlled club as
   the user. Multiple human seats are not orchestrated; a later human turn would wait for manual
   input without a separate hot-seat identity ceremony.
3. **Long CPU gaps are deliberately visible.** Every CPU pick has a fixed 350 ms beat. A large
   league, an all-CPU league, or a user drafting near an end can therefore spend noticeable time
   walking the ticker through consecutive picks.
4. **Forecast is conditional, not strategic.** Rollouts treat future user turns as "wait" and
   snapshot each club's board/need/fit inputs at the current human-turn seam. They do not model
   alternate user selections or recompute every CPU roster's need inside each simulated branch,
   so percentages are directional POC guidance rather than calibrated odds.
5. **Forecast is deferred but not worker-backed.** It runs in a zero-delay post-render task and
   is memoized, not in a Web Worker. A maximum-size league/pool can still create a brief main-thread
   pause after the human turn paints.
6. **Legal-completion cards are page-bounded.** Only the current 36-player page gets the expensive
   per-candidate completion proof. Moving to another page calculates that page on demand and may
   pause briefly; CPU choice still checks candidates independently before committing.
7. **Trades preserve 22 roster spots.** The UI permits one to three picks on each side but requires
   equal pick counts. It therefore supports up to two additional picks per side, not an uneven
   2-for-1/3-for-1 transfer; unequal ownership would leave this isolated 22-pick roster model with
   21/23 players and no season transaction layer to repair it.
8. **Trade value is a present-board projection.** CPU decision value projects the current ranked
   board down to the offered pick slots. It does not run a full counterfactual draft, generate
   counteroffers, or price player trades.
9. **Run detection is literal primary position.** It does not group adjacent role families (for
   example RP and CP) or use secondary-position supply, so some baseball-intuitive runs will not
   trigger.
10. **Legacy POC sessions are display-compatible, not backfilled.** A session created before the
    new optional settlement fields displays IV fallback values, but old pick records are not
    rewritten until new activity is saved.
11. **Browser feel remains the viability gate.** Automated page tests cover persistence, reload,
    pick isolation, and pagination, but the builder did not substitute a browser playthrough for
    JK's intended hands-on judgment of pacing, board density, trade clarity, and forecast trust.

### Files left for the captain

- `src/App.tsx`
- `src/engines/snakeDraftPoc.ts`
- `src/engines/__tests__/snakeDraftPoc.test.ts`
- `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx`
- `src/src_figma/app/pages/LeagueBuilderSnakeDraft.tsx`
- `src/src_figma/app/pages/Phase2ActivationConsole.tsx`
- `src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.setup.test.tsx`
- `src/src_figma/__tests__/pages/LeagueBuilderSnakeDraft.test.tsx`
- `src/utils/franchisePhase2Activation.ts`
- `src/utils/franchisePhase2Flags.ts`
- `src/utils/leagueBuilderStorage.ts`
- `src/utils/tests/franchisePhase2Activation.test.ts`
- `spec-docs/contracts/CONTRACT_SNAKE_POC_2026-07-09.md` (this appended report)

Pre-existing untracked `dispatch-prompt.txt` was not read, changed, or included in the work.

### STOP items

1. **Full-suite gate is not clean.** The required single full run produced one new-to-this-contract
   suite-only timing red outside Snake scope; its exact file passes solo 24/24. Per UNKNOWN =
   STOP-and-report, the builder did not edit the unrelated franchise test/component and did not
   run a forbidden second full suite.
2. **Independent audit and browser viability ruling remain pending.** The builder has not audited
   its own diff and makes no viability claim; those belong to the independent opus auditor and JK.
