# CONTRACT — AUCTION REBUILD + VIABILITY LOOP (2026-07-10)

**Builder:** Codex (xhigh, time-loop mode per JK). **Auditor:** independent opus agent.
**Captain:** Fable. **Branch:** codex/auction-rebuild. Base: main @ 44c645e3 (post-SHILLTAX).
**Git discipline:** no git write commands; captain cuts commits; APPEND reports here only.
UNKNOWN or mid-build surprise = STOP-and-report.

## Why this exists (JK, verbatim substance)
The auction as-is is non-competitive mid-draft and "will need to be deferred" if it can't be
made to work. JK's structural rulings define the rebuild; this lane builds them and then runs
a BOUNDED measure-tune loop. The exit is a mechanical verdict: **GO** (the bar is met) or
**DEFER** (budget exhausted without meeting it). Both are acceptable outcomes — report the
truth.

## §1 The ruled structure (JK 2026-07-09/10 — none of this is negotiable)
1. **Sequential manual nomination.** Auto-nomination is removed. Non-shill clubs nominate in
   a fixed rotation (round-robin over the club order); shills NEVER nominate. A club with a
   full roster is skipped in the rotation.
2. **The nominator opens the bid**, choosing any opening price ≥ LEAGUE_MINIMUM_SALARY (low
   opens allowed — this is the point). The nomination IS a committed bid: if nobody counters,
   the nominator wins at the open. CPU clubs choose nomination targets and opens via their
   existing valuation machinery (board value / need / fit — reuse, don't invent); their open
   price policy is a TUNABLE (see §3).
3. **One shot per player.** There is no "pass the lot" and no recirculation: every nominated
   player SELLS (at worst to the nominator at the open). Un-nominated players simply never
   enter. Delete the passed-lot machinery accordingly (backfillFromPassedLots and the
   UNSOLD-returns semantics); the GONE concept applies only to shill wins.
4. **Shill wins leave the board permanently.** No redistribution to clubs — delete/disable
   the settle-from-shills redistribution and shill-reclamation paths for this flow. Shills
   remain untaxed (shipped in SHILLTAX) and become explicit **value-anchored market-makers**:
   while solvent and under their win cap, a shill counters any bid that sits meaningfully
   below the player's market band (anchor fraction of the market estimate — TUNABLE), which
   polices JK's tanking exploit (nobody gets a star at the minimum just because rivals are
   full or broke).
5. **End condition:** the auction ends the moment every non-shill roster is legally full
   (22). Remaining pool players stay exactly as they are (free agents of the league) — no
   cleanup redistribution. Users advance to the existing continuation arc.
6. **Completion with no safety nets:** deleting recirculation/redistribution removes the old
   completion guarantees, so completion must be structurally provable instead:
   - A club with open seats MUST nominate on its turn (the UI/CPU picks something; minimum
     open is affordable by construction because the completion reserve already holds back
     minimum-fill money).
   - The existing must-fill/emergency machinery constrains late bids and nominations to
     legal-roster needs (require-a-closer etc.).
   - Supply invariant at start: the existing POOLFLOOR position floors remain the entry gate.
   - PROOF OBLIGATION: a deadlock-freedom argument in the report (every state with an
     incomplete club has a legal move that strictly progresses the draft) plus gauntlet
     evidence — no stranding across all runs.

## §2 What this replaces (delete/disable honestly, don't strand code)
Auto-nomination flow; lot passing + backfillFromPassedLots; UNSOLD-comes-back semantics;
settle-from-shills redistribution + reclaimShillHeldForShortfall for THIS flow; reserve-price
as the opening ask (reserve dial's role is superseded by nominator opens + shill anchoring —
keep the storage field, retire its effect, note it for the captain's UI cleanup later).
Update the affected copy (VOICE law), tests, and the handoff-check exit screen (no more
"settle from shills" step — the end condition replaces it). Whisper/advisor surfaces that
referenced passing a lot get the minimal honest rewording ("let him go" now means letting the
current bid stand, not recirculation).

## §3 The tunables (the loop's knobs — nothing else may be tuned)
- shillCount recommendation (per league size)
- shill anchor fraction (how close to market the shill defends; e.g. 0.5–0.8 × market-low)
- shill per-win cap and total-wins cap
- CPU nomination open policy (fraction of own value; strategic-low vs sincere)
- pool surplus multiplier (supply beyond teams×22 so one-shot nominations can't starve needs)
Club tax math, cap tables, IV, and all non-auction economics are OUT OF BOUNDS this lane
(the small-league cap-normalization loop is separate, later).

## §4 The loop (bounded, mechanical)
Phase A — build §1/§2 with repro-first tests (the old behaviors pinned red where they must
die; the new mechanics pinned green), then all standard gates.
Phase B — the viability loop, max **6 iterations**: run the measurement harness
(scripts/auctionCollapseDiagnosis.test.ts pattern, extended for nomination flow) on ≥3 seeds
× {4-team, 8-team} production defaults; score against THE BAR; adjust only §3 knobs; repeat.
**THE BAR (all seeds, both sizes):** ≥2 willing bidders on ≥70% of lots; no club
>8-consecutive-lot lockout before 75% of its roster is filled; every club completes a legal
22 with zero stranding and zero safety nets; shills solvent throughout; median winning price
within [0.5, 1.5] × market estimate (sanity: neither fire-sale nor runaway).
Phase C — verdict appended here: **GO** (bar met; final knob values recorded as the tuned
defaults) or **DEFER** (best-achieved metrics per iteration, the binding constraint that
could not be satisfied, and your honest analysis of why). Do not soften the bar to reach GO.

## §5 Gates
tsc clean; build exit 0; auction suites (state machine, gauntlets — updated to the new
structure, useAuctionDraft, market model) green; ONE full vitest (new reds = fix or STOP;
known solo flakes list applies); the harness runs committed + reproducible.

## §6 Report
APPEND: per-item disposition; the deadlock-freedom argument; per-iteration loop table (knobs
+ metrics); the verdict; rough-edges list for JK's browser session if GO.

---

## BUILDER APPEND — PHASE A REPRO-FIRST RECORD (Codex, 2026-07-10)

### Scope interpretation

- The rebuilt flow is the live MLB auction: the contract's legal-22 end condition, shill market
  makers, and 4-team/8-team viability bar all target that flow. The shared farm state machine stays
  on its existing 10-player/no-shill contract; MLB sessions will carry an explicit persisted mode
  bit so old/farm sessions cannot accidentally inherit half of the rebuild.
- The untracked `dispatch-prompt.txt` existed before builder work and is left untouched. No git
  write command was run.

### Red proof before implementation

Command:

`NODE_ENV= npx vitest run src/engines/__tests__/auctionSequentialNomination.test.ts --reporter=verbose`

Result: **RED as required — 1 file failed, 5/5 tests failed.** The current engine accepted the
weighted auto-surface call, and the required `getCurrentNominatorTeamId` / `nominatePlayer` APIs did
not exist. The five repros pin: auto-surface disabled; shill/full-club rotation skips; league-minimum
committed opening bid; fixed rotation plus affordability rejection; and no reclaim/redistribution of
a shill win.

---

## BUILDER APPEND — PHASE A/B/C FINAL RECORD (Codex, 2026-07-10)

### Phase A disposition

1. **Sequential manual nomination — BUILT for new MLB sessions.** `sequentialNomination` is an
   explicit persisted session-mode bit. New MLB sessions use the supplied real-club order (not a
   seed-shuffled order), and the nominator lookup skips pure shills and full clubs. Legacy and farm
   sessions keep their prior state-machine contract.
2. **Committed nominator open — BUILT.** `nominatePlayer` selects any remaining player, enforces an
   opening at or above the league minimum and below the candidate-specific tax/solvency ceiling,
   removes the player from available supply, and records the nominator as the standing high bidder.
   CPU clubs use the existing IV/archetype/need valuation and the tunable opening fraction. The page
   now exposes a player selector plus committed-open control; CPU nominations use the existing
   read-only decision-preview beat.
3. **One shot / always sold — BUILT in rebuilt mode.** `surfaceNextPlayer` rejects auto-surfacing,
   and the sequential resolve path has no no-bid/PASSED/lone-survivor branch. The opener wins if all
   rivals let the bid stand. Reserve-price storage remains readable for compatibility, but reserve
   pricing no longer sets a rebuilt lot's open.
4. **Shill wins stay gone — BUILT.** Rebuilt shills are fixed anchor defenders while below the
   configured IV-based market estimate fraction and under both win caps. They are still tax-neutral,
   never nominate, never receive a force-fill, and their wins remain on their own roster. The rebuilt
   terminal branch bypasses passed-lot backfill and shill reclamation. The existing joint-supply guard
   also prevents a permanent shill win from knowingly consuming a class already tight for a real
   club.
5. **Legal-22 end condition — BUILT.** The machine completes only when every completing real club is
   full and legal. The exit screen has no settle-from-shills action and no proceed-anyway override;
   an illegal terminal fixture renders `NO HANDOFF`.
6. **VOICE/UI updates — BUILT.** The live action is `NOMINATE`, the rival action is `Let the bid
   stand`, and rebuilt opening money is labeled `OPEN`/`YOUR OPEN`, not reserve. The nomination input
   rounds the fractional league minimum upward; the resumed partial implementation had rounded it
   down and silently rejected a visible nomination, which is now pinned by the page suite.

Additional resumed-tree correction: rebuilt sessions had still inherited the session-seeded team
shuffle even though §1 requires rotation over club order. The initializer now preserves club order;
the seed remains available for deterministic CPU decision noise without owning the rotation.

### Repro-first and focused evidence

- Initial red proof (recorded above): 5/5 sequential-nomination repros failed before implementation.
- Final sequential engine suite: **8/8 passed** (the seven implemented-mechanic cases plus the fixed
  club-order case).
- Engine + hook + live page/component slice: **93/93 passed**.
- Full auction dependency gate (state machine, one-chance legacy compatibility, end checkpoint,
  market, gauntlets, hook, MLB/farm pages, shared stage): **26 files / 299 tests passed**.

### Deadlock-freedom proof obligation — NOT SATISFIED

The rebuilt transition is strictly progressive only under this precondition: the current incomplete
club has at least one remaining player whose tax-aware nomination ceiling is at least the league
minimum and whose acquisition leaves a legal completion. Under that precondition, nomination removes
one player, commits a high bid, the lot can only resolve SOLD, and either a real roster loses one open
seat or a capped shill consumes one surplus player before rotation advances.

The production-default gauntlet found reachable states where the precondition is false. Every one of
the 36 measured runs stopped at `NOMINATION:no-legal-cpu-nomination` with real clubs incomplete. Two
counterexample forms occurred:

- legal-shape candidates remained, but every candidate's tax-aware opening ceiling was below the
  league minimum after accumulated salary + marginal-tax drains; or
- many bodies remained, but none preserved a verified legal completion for the current club's exact
  position mix.

Therefore the required statement — "every state with an incomplete club has a legal move" — is
false for the rebuilt structure under the allowed knobs. No recirculation, redistribution,
reclamation, forced fill, or settle path fired; `safetyNetUses` was exactly zero throughout. This is
the binding Phase C failure, not a softened or inferred result.

### Phase B — bounded six-iteration viability loop

Harness: `scripts/auctionCollapseDiagnosis.test.ts#auction-rebuild-viability`. Each valid iteration
runs the real MLB player universe and production pool extraction for three deterministic archetype
seeds across both 4-club and 8-club leagues. Metrics count the committed opener plus CPU/shill actors
whose live policy would take the next bid; lockout is tracked per real club only until it reaches 75%
of 22. Price sanity is winning price / player IV, the same canonical estimate used by the anchor.

| Iter | shills 4/8 | anchor | per/total shill wins | CPU open | pool | completed runs | 2+ willing range | worst pre-75% lockout | legal clubs / 36 | min shill cash | median price/market range | safety nets | Result |
|---:|:---:|---:|:---:|---:|---:|:---:|:---:|---:|:---:|---:|:---:|---:|:---:|
| 1 | 1 / 2 | 0.65 | 8 / 12 | 0.35 | 1.25 | 0 / 6 | 90.0–100% | 7 | 2 / 36 | $950,836 | 0.624–0.762 | 0 | FAIL — nomination deadlock |
| 2 | 1 / 2 | 0.65 | 8 / 12 | 0.35 | 1.25 | 0 / 6 | 83.8–100% | 7 | 3 / 36 | $950,836 | 0.597–0.762 | 0 | FAIL — scarce-class guard did not clear deadlock |
| 3 | 1 / 2 | 0.65 | 8 / 12 | 0.35 | 1.50 | 0 / 6 | 80.9–100% | 7 | 2 / 36 | $955,836 | 0.626–0.749 | 0 | FAIL — maximum-surplus direction alone insufficient |
| 4 | 1 / 2 | 0.65 | 4 / 6 | 0.35 | 1.50 | 0 / 6 | 90.4–99.1% | 7 | 1 / 36 | $1,055,836 | 0.602–0.745 | 0 | FAIL — lower shill consumption still deadlocks |
| 5 | 1 / 2 | 0.50 | 4 / 6 | 0.20 | 1.50 | 0 / 6 | 65.3–100% | 7 | 3 / 36 | $1,095,836 | 0.431–0.708 | 0 | FAIL — completion still fails; one seed also breaks bidder + price bars |
| 6 | 1 / 1 | 0.55 | 2 / 2 | 0.25 | 1.50 | 0 / 6 | 67.9–96.4% | 7 | 4 / 36 | $1,135,836 | 0.431–0.712 | 0 | FAIL — best legal-club count, still no completed run and bar regressions |

The pool extractor rejected a proposed 1.75 multiplier before iteration 6 because its contractually
valid stops end at 1.50; that invalid preflight was not counted as an iteration, and iteration 6 was
rerun at the valid maximum.

Best non-completion profile was iteration 4: all six runs cleared willingness, lockout, shill
solvency, price sanity, and zero-safety-net checks, but none completed and only 1 of 36 real clubs was
already legal at the stopping point. Iteration 6 improved the cross-run legal-club count to 4/36 but
lost the all-seed willingness and price bars and still completed 0/6.

### Phase C verdict — **DEFER**

The immutable bar was not met in any iteration. The binding constraint is legal/affordable
completion after removing every safety net: pool surplus and shill consumption can delay the stop,
but the remaining allowed price knobs cannot keep every club above the tax-aware minimum-open floor
without pushing at least one seed below the competitiveness or price-sanity bars. Club tax math and
cap normalization were explicitly out of bounds, so this lane does not alter them to manufacture a
GO.

The Phase A implementation and reproducible harness remain in the working tree for captain review,
but **the rebuilt auction is not viable for v1 under this contract and must be deferred unless a new
contract expands the economic/completion model.** No final tuned defaults are claimed.

### Closing gates

- `git diff --check` — exit 0.
- app typecheck `NODE_ENV= npx tsc -b --pretty false` — exit 0.
- harness strict typecheck — exit 0.
- `NODE_ENV= npm run build` — exit 0 (2,648 modules transformed; existing chunk-size warnings only).
- auction dependency gate — **26 files / 299 tests passed**.
- full required Vitest — **619 files passed, 8 skipped; 9,527 tests passed, 14 skipped; zero failed**.
- No git write command was run. `dispatch-prompt.txt` and `resume-prompt.txt` were pre-existing
  untracked operator files and remain untouched.
