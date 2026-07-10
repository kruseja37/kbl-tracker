# CONTRACT — STAKES lane (2026-07-09)

**Builder:** Codex (xhigh). **Auditor:** independent opus agent (not you). **Captain:** Fable.
**Branch:** codex/stakes-panel-2026-07-09 (this clone). Base: main @ 25e3dd4f (post-PRIVACY).
**Binding design:** spec-docs/AUCTION_WALKTHROUGH_WAVE_2026-07-09.md §3 (in this tree) — this
contract restates it; the doc governs on any ambiguity. UNKNOWNs or mid-build surprises are
STOP-and-report, never improvisation.
**Git discipline:** your sandbox cannot write .git — run NO git write command (no
add/commit/stash). The captain committed this contract and cuts the commits from your finished
working tree. Leave every file in place; do not clean up.

## JK's ruling
When the GM bids against the advisor's pass, the risk must be concrete: which of the GM's
big-board targets fall out of reach at that price, and the tax implications as the proof of
how risky "risky" is.

## What already exists (traced 2026-07-09 — re-verify at current lines)
`projectBidVsPass()` (src/engines/auctionMarketModel.ts ~:691-812) already sweeps the whole
remaining pool, prices every target (estimateMarket low/median/high), nets THIS lot's marginal
tax from budgetAfter (~:712), filters roster-stranding targets (~:736-748), and returns
{ownValue, predictedMedian, surplus, affordable} top-N. WhisperPanel renders it with a
"can't afford" chip. Its `bidAmount` input is already arbitrary — but the page pins it to the
current high bid (LeagueBuilderAuctionDraft.tsx ~:1427). The GM's board blend (rankOverrides)
is already wired (~:1598).

## Build

### Tier 1 — live reactivity (wiring)
1. The bid-vs-pass section recomputes at the GM's CONTEMPLATED bid — the amount currently in
   the bid stepper — debounced to bid-step changes (not per keystroke, not per render), not
   just the standing high bid.
2. Section header becomes `IF YOU WIN AT $X` (X = the contemplated bid).
3. Each board target affordable in the PASS scenario but NOT at $X gets the chip
   `drops out at $X`. The pass-scenario baseline column stays as-is.
4. Renders only when the whisper is revealed (the PRIVACY law just merged — do not weaken any
   of its gating) and a human is on the clock. Top-5 stays; ranked by the GM's own board.

### Tier 2 — the keep-him cost (new engine math; this section is the spec)
New pure function in the engine layer (a new module next to auctionCompletionFloor.ts is
fine): `keepTargetAllIn(team, lotPlayer, bidAmount, targetY, remainingPool, caps)` — the
all-in cost of the plan "win this lot at $bidAmount and still land Y later":
1. rosterAfterLot = roster ∪ {lotPlayer}; taxLot = incremental tax of adding lotPlayer
   (existing auctionMarginalTaxWithCaps — reuse verbatim).
2. priceY = predictedMedian(Y) (existing estimateMarket).
3. rosterAfterY = rosterAfterLot ∪ {Y}; taxY = incremental tax of adding Y to rosterAfterLot
   (same canonical luxuryTax delta).
4. completion = cheapestLegalCompletion(rosterAfterY, remainingPool minus Y, remaining open
   slots) (existing); taxFill = luxuryTax(rosterAfterY ∪ completion).charged −
   luxuryTax(rosterAfterY).charged (the completionTaxForQuote shape — reuse the canonical
   luxuryTax deltas, never a hypothetical full-roster bill; this is the standing bounded-
   semantics ruling).
5. allIn = bidAmount + taxLot + priceY + taxY + completion.cost + taxFill;
   verdict = allIn ≤ budgetRemaining; shortfall = max(0, allIn − budgetRemaining).
- If cheapestLegalCompletion is infeasible → verdict is the state "can't finish the roster",
  never a number.
- Compute for the GM's TOP-3 board targets only, on the same debounce as Tier 1. Pure
  function: no session/state imports in the engine module; UI supplies inputs.

### Render (inside the bid-vs-pass expanded section — no new panel)
Per target: `Your #2 — {Name}: still lands · all-in ~$Z, tax in` or
`Your #2 — {Name}: gone at this price — $W short`. When all three survive, one summary line:
`Your top three still land after this.` All copy verbatim as written here (VOICE law:
no engine jargon; do not invent alternative wording).

### Non-goals
No CPU behavior change of any kind. No changes to projectBidVsPass's own math (only its
call-site bidAmount wiring). No new persistence. No VOICE/PRIVACY regressions.

## Repro-first
Before the change: commit-ready failing (or passing-but-wrong, marked) tests characterizing
today's gap — the bid-vs-pass targets do NOT react when the contemplated bid changes (pinned
to the standing high bid). Run them against unmodified code and record the red in your report.
Then the change flips them. Engine tests for keepTargetAllIn: feasible case, infeasible case
(can't finish), zero-tax league (allIn = bid + priceY + completion.cost exactly), tax-heavy
stars-and-scrubs fixture (reuse the auctionGauntlet production-default shapes), and a
boundary test where a target flips affordable→gone at a $1 bid step.

## Gates (all must pass in this clone)
1. npx tsc -b → clean
2. npm run build → exit 0
3. Suites: the new engine module's tests, WhisperPanel, AuctionStage,
   LeagueBuilderAuctionDraft, LeagueBuilderFarmAuctionDraft → green
4. ONE full NODE_ENV= npx vitest run → any new red anywhere is yours to fix or STOP.
   Known solo-rerun flakes (rerun alone before flagging): AwardsWatchlist,
   franchiseManualSmokeFixture, GameTrackerLaunchState.

## Report
APPEND to this file: per-item disposition, the repro red proof, gate output summaries, STOP
items. Working tree stays dirty for the captain's commits.

## Builder report — Codex STAKES (2026-07-09)

**Disposition: COMPLETE.** Tier 1, Tier 2, and the specified render are implemented. No STOP
condition was encountered.

### Per-item disposition

- **Tier 1.1 — COMPLETE:** `projectBidVsPass()` now receives the human GM's contemplated bid
  step through a 150 ms trailing debounce scoped to the current lot. The engine's math was not
  changed.
- **Tier 1.2 — COMPLETE:** the expanded heading renders `IF YOU WIN AT $X` with that debounced
  contemplated bid.
- **Tier 1.3 — COMPLETE:** a target that is affordable after passing but not after bidding at
  `$X` renders `drops out at $X`; the pass baseline remains present.
- **Tier 1.4 — COMPLETE:** the live comparison remains inside the existing PRIVACY-controlled
  whisper reveal for the human active seat. It uses the GM's materialized board order and
  renders the top five targets.
- **Tier 2 — COMPLETE:** added the session-free pure engine function `keepTargetAllIn()` using
  canonical `auctionMarginalTaxWithCaps()`, `luxuryTax()` deltas, and
  `cheapestLegalCompletion()`. It evaluates only the GM's top three board targets at the same
  debounced contemplated bid. An infeasible completion returns `cant-finish-roster` with no
  fabricated all-in amount.
- **Render — COMPLETE:** the top-three results render inside the existing bid-vs-pass expanded
  section with the contract's exact `still lands`, `gone at this price`, `can't finish the
  roster`, and all-three-survive summary copy. No new panel or persistence was added, and CPU
  auction behavior was not changed.

### Repro-first red proof

Before any product-code change, the new page characterization was run against the unmodified
implementation:

```text
NODE_ENV= npx vitest run src/src_figma/__tests__/pages/LeagueBuilderAuctionDraft.test.tsx -t "STAKES: the revealed bid-vs-pass read follows the contemplated bid step"
```

It exited 1 with **1 failed, 21 skipped**. The defining failure was:

```text
Unable to find an element with the text: IF YOU WIN AT $80,000
```

After implementation, the same focused characterization exited 0 with **1 passed, 21
skipped**. It also proves the unrevealed state omits the new read, reveal exposes exactly three
keep-target lines, and a subsequent bid-step change updates the contemplated-price heading.

### Test coverage added

- Five pure-engine cases: feasible, infeasible/cannot finish, zero-tax exact formula,
  tax-heavy stars-and-scrubs using the production cap-table shape and canonical deltas, and a
  one-dollar affordable-to-gone boundary.
- Whisper render cases for the exact heading, drop-out chip, three target outcomes, summary,
  infeasible wording, and the one-dollar UI boundary.
- Live auction-page characterization for reveal privacy and contemplated-bid reactivity.

### Gate evidence

- `npx tsc -b` — **exit 0**, no diagnostics.
- `npm run build` — **exit 0**; TypeScript and Vite production build completed, 2,645 modules
  transformed, `built in 9.71s`. Existing non-blocking stale-Browserslist, mixed dynamic/static
  import, and large-chunk warnings remained warnings only.
- Named gate command covering the new engine suite, `WhisperPanel`, `AuctionStage`,
  `LeagueBuilderAuctionDraft`, and `LeagueBuilderFarmAuctionDraft` — **5 files passed, 121/121
  tests passed**, duration 6.30s.
- The one required full `NODE_ENV= npx vitest run` — **exit 0; 615 files passed, 7 skipped;
  9,483 tests passed, 11 skipped**, duration 209.60s. No solo flake rerun was needed.
- `git diff --check` — **exit 0**.

### Changed paths

STAKES lane total: **7 paths**, including this required report.

1. `src/engines/auctionKeepTargetAllIn.ts`
2. `src/engines/__tests__/auctionKeepTargetAllIn.test.ts`
3. `src/src_figma/app/pages/LeagueBuilderAuctionDraft.tsx`
4. `src/src_figma/app/components/auction/WhisperPanel.tsx`
5. `src/src_figma/app/components/auction/__tests__/WhisperPanel.test.tsx`
6. `src/src_figma/__tests__/pages/LeagueBuilderAuctionDraft.test.tsx`
7. `spec-docs/contracts/CONTRACT_STAKES_2026-07-09.md`

The pre-existing untracked `dispatch-prompt.txt` was not read, edited, or included in this
lane.

### STOP items and handoff

- **STOP items:** none.
- The working tree is intentionally dirty for the captain. No git write command was run.
- Independent Opus audit and captain-owned commits remain the next handoff steps.
