# TRADITIONAL (SNAKE) MLB DRAFT — PROGRAM DESIGN (2026-07-09)

**Author:** Fable (captain; design + math authority — JK directed the design refresh be mine).
**Status:** BINDING for lanes D1–D7. Builders do not re-litigate design; UNKNOWN = STOP-and-report.
**Ground truth:** the 2026-07-09 deep inventory of `LeagueBuilderSnakeDraft.tsx` + drift ledger
(session record; key facts restated inline so this doc stands alone). Line numbers are from that
inventory — re-locate by content if drifted.

## §0 Rulings and scope
- JK ruling 2026-07-09: build the traditional MLB draft. This REVERSES the 2026-07-03 retirement
  ruling (commit `a1553aac`, "auction is the only draft style") — recorded here so the ledger is
  honest. Auction remains the default format; snake becomes a selectable equal.
- **Farm stays auction** (JK, same ruling). `farmDraftRouteForFormat` stays locked; the ONLY
  farm-side touches permitted in this program are the two parity fixes in §8 that concern
  session-recognition, not farm mechanics.
- The built pick-for-pick trade machinery (`validateTrade` + `derivePickValueChart`,
  `leagueConstruction.ts`) is BLESSED as the trade model. `TRADE_SYSTEM_SPEC.md` §5.3 (draft
  swaps, unimplemented prose) is SUPERSEDED for draft-pick trading — mark it so in that doc.
- Sequencing: after the auction walkthrough wave (VOICE ✅, SETUPHELP ✅, PRIVACY/STAKES/
  ADVISORCOLOR in flight). STAKES's `keepTargetAllIn` and PRIVACY's reveal pattern are inputs
  here — D-lanes touching those files start only after those lanes land.
- The parked page (823 lines) is the SKELETON, not the product. The inventory found it broken in
  five load-bearing ways (no settled salaries; franchise initializer blind to snake sessions; no
  roster legality; no supply-floor gate; unrouted). Every one is a plank in this design.
- **JK rulings 2026-07-09, second pass (this amendment):** (a) settlement = the player's IV
  (§3 rewritten — the slot-scale draft is WITHDRAWN); (b) farm prospects keep the
  rookie-contract salary concept (farm-side, separate mini-spec after a ground-truth check);
  (c) the snake pool is the FULL UNIVERSE of the selected source leagues with hand add/remove —
  no extraction, no sizing (§7 rewritten); validity = position supply only; (d) the auction
  Draft Setup is NOT assumed to cross over — a dedicated conversion ground-truth pass gates
  D2's contract.

## §1 The dynamic (why this is not an auction with picks)
An auction's drama is price discovery: everyone active on every lot, money as the action. A
draft's drama is **scarcity under turn order**: waiting, runs, "will he fall to me," and the
trade-up itch. The design therefore centers three feelings:
1. **The falling player** — the board must make "he's still here?!" legible (steal scores,
   availability odds, last-realistic-pick).
2. **The run** — positional scarcity must be visible the moment it accelerates.
3. **The pick as currency** — trading up/down must have honest, explainable math.
Money still binds (salaries hit the cap; ratings hit the tax) but money is a CONSTRAINT here,
not the action. All auction laws carry over: VOICE vocabulary (§1 of the wave doc), privacy
reveal (§2), tax-marginal-cause honesty, no engine jargon rendered, ever.

## §2 Program architecture — seven lanes
| Lane | What | Depends on |
|---|---|---|
| D1 | Settlement + franchise parity (the correctness planks, §3+§8) | none — FIRST |
| D2 | Draft shell rebuild: routing unlock, setup/readiness integration, legality + supply gates, completion handoff (§7) | D1 |
| D3 | CPU picker engine + seeded determinism (§4) | D1 (engine-only, file-disjoint from D2 — may run parallel to D2) |
| D4 | Availability forecast + what-if slot projector (§4.3) | D3 |
| D5 | The advisor board: true cost, steal score, runs, privacy (§5) | D2+D3, wave PRIVACY |
| D6 | Trade execution + trade advisor (§6) | D3 (pick-value + forecast math) |
| D7 | Voice + LLM color pass for draft surfaces (wave §1/§5 applied to snake copy) | D5 |
Builders: Codex 5.6 SOL, xhigh for D1/D3/D4/D6 (economics/math), medium for D2/D5/D7 shell/UI
work. Audits: opus for D1/D3/D4/D6, sonnet acceptable for D7. Builder ≠ auditor, always.

## §3 Salary settlement — IV is the price (JK-RULED 2026-07-09; supersedes this section's
earlier slot-scale draft)
JK ruling, verbatim intent: salary IS the player's IV — the IV engine was built to produce
exactly this number. The auction STARTS bidding at a fraction of IV and discovers a price; the
traditional draft has no discovery, so a drafted player settles AT his IV.

- `settledSalary = salary = the player's IV` at pick commit (auction-parity pipeline shape —
  the same stamp `saveMlbAssignment` performs; inventory finding #2 stays the D1 plank).
- Rating-based luxury tax is UNCHANGED and applies identically (tax binds on ratings, salary
  binds on cap — two independent, coherent pressures). The marginal tax of a pick uses
  `auctionMarginalTaxWithCaps` verbatim.
- Consequences the design embraces:
  - **Cap pressure replaces price discovery as THE constraint.** Twenty-two IVs must fit under
    the hard cap, so nobody drafts 22 stars. The in-draft solvency guardrail is load-bearing at
    every pick, human and CPU: can you pay this IV and still fill every remaining seat from
    what's left (existing `assessSolvency` + a `cheapestLegalCompletion`-based reserve, tax
    included)? BLOCKED picks stay unpickable, with the reason in VOICE.
  - **The steal is fit, not discount.** Every club pays the same IV for a player, but ownValue
    (fit/need/identity) and marginal tax differ per club — so TRUE COST = IV + YOUR marginal
    tax, and STEAL = your ownValue − TRUE COST (§5 uses these definitions).
  - **Trading down is self-funding** (lesser players settle at lower IVs); trading up costs
    pick capital AND takes on a bigger salary + tax commitment — the §6 advisor shows both.
- **Completion gauntlet (D1 exit, test-locked):** six production-default full drafts (CPU
  picker in every seat) complete a legal 22 under the hard cap for every team, zero stranding.
  No calibration constant exists — IV needs none.
- **Farm note (JK-ruled, out of this program's scope):** farm prospects follow the
  rookie-contract salary concept instead. Before ANY farm-side build: ground-truth what farm
  prospect salaries do today (do not assume), then a separate mini-spec.

## §4 The shared brain — CPU picker and availability forecast
One model powers CPU picks AND the user's forecast, so the forecast is honest by construction.

### 4.1 CPU pick scoring (per CPU team, at its pick)
`score(P) = blendedBoardValue(P) × needMultiplier(P) × fitMultiplier(P) − λ·marginalTax(P)`
- `blendedBoardValue`: the team's own `assembleBoard` output (identity-blended; CPU teams have
  no rankOverrides — pure archetype blend). Reuse, not reimplement.
- `needMultiplier`/`fitMultiplier`: existing `rosterNeed` + archetype fit machinery.
- `marginalTax`: existing incremental tax; λ set so tax matters like it does for auction CPUs.
- **Hard constraints (before scoring):** must-fill when remaining picks == remaining required
  seats for any legal-roster bucket (same emergency-fill principle as the auction completion
  floor, incl. require-a-closer); never pick into an illegal-completion dead end (reuse
  `cheapestLegalCompletion` feasibility).
- **Determinism with texture:** pick = argmax over score with a small seeded jitter drawn from
  `session.seed` (the page's vestigial seed field becomes real). Same seed → same draft; tests
  pin full drafts. Jitter magnitude bounded so a clear #1 is never jumped (≤ one band width).

### 4.2 Standing ruling restated
The CPU picker is a CPU behavior rule the day it lands: from then on it never changes as a
fixture convenience (V1_CANON §6 discipline applies).

### 4.3 Availability forecast (the user-facing magic)
- `survival(P, slot S)` = fraction of N seeded rollouts of §4.1 (jitter resampled per rollout,
  N≈100 — cheap: at most teams−1 picks per gap, computed off the main thread or memoized per
  pick) in which P is undrafted at S.
- Surfaces: color band on every board card (SAFE ≥85% / LIKELY 60–85% / COIN FLIP 35–60% /
  GONE <35%, computed for the user's NEXT pick); **LAST REALISTIC PICK** = the latest slot
  where survival ≥50% (the whole trade-down decision in one number).
- **What-if slot projector (JK's dropdown):** pick any player → render the deterministic
  optimal playout (jitter=0) to show "how it could still play out if everyone drafts smart,"
  with his survival % at each of your remaining slots. Advisory-only; never mutates state.
- Recompute on every completed pick and every executed trade. Never during another team's
  animation frame — after commit only.

## §5 The advisor board (true cost, steals, runs)
- **TRUE COST column:** `IV(P) + yourMarginalTax(P)` — sortable. Every club pays the same IV;
  the tax term is per-YOUR-team (archetype caps), so the same player still costs different
  clubs differently: the auction's tax honesty carried into the draft.
- **STEAL score:** `yourOwnValue(P) − trueCost(P)` (fit/need/identity-adjusted worth minus
  IV-plus-tax), normalized; top-3 steals get a quiet badge. Uses YOUR blend (rankOverrides +
  identity) — the Draft Setup ranking board is now load-bearing exactly as JK intended.
- **RUN detector:** when ≥3 players of one position bucket go within a 5-pick window, one
  banner line: "A run on closers — 2 left, next realistic exit pick #34." Derived from
  completed picks + survival; no new model.
- **Privacy law (wave §2) applies verbatim:** your board, steal scores, forecasts, and trade
  advice are advisor content — covered until you click your team name on the clock; auto-cover
  after your pick or an executed trade. Public: the pick ticker, rosters, lot-agnostic pool
  facts. CPU picks reveal nothing.
- Candidate cards adopt the WT-D popover (full player card) and VOICE vocabulary. IV-only sort
  order is replaced by board-blend order as the default (IV sort remains a toggle).

## §6 Trades — execution, not a calculator
The inventory found the trade panel is a detached fairness calculator (nothing persists,
pickOrder never changes). Ruling: real, minimal, draft-window pick-for-pick trades.
- **Model:** a trade swaps ownership of specific FUTURE picks in `session.pickOrder`
  (teamId reassignment), persisted per-trade in a `session.trades[]` audit list (who, what,
  when-pick-index). No player trades in the draft window; no future-year picks in v1.
- **Flow:** on your reveal, TRADE opens a two-sided picker of actual owned picks (no typed
  numbers). `validateTrade` renders the fairness verdict with the blessed 15% band. Human↔CPU:
  the CPU accepts iff the deal clears its own §4.1 value math with a configurable greed margin
  (default +5% in its favor) AND doesn't break its must-fill constraints; counter-offers are
  out of scope for v1 (a declined deal states the shortfall plainly, in VOICE).
  Human↔human: both seats must confirm on their own reveal (privacy law).
- **Trade advisor:** "Your #4 (SS Alvarez) — 22% to last to #41. Trading up to #34 costs pick
  #41 + #63 (fair by the chart). Worth it if he's ≥ $X better to you than the best SS likely
  at #41." X = `yourBoardValue(target) − E[best-at-position value at your slot | forecast]` —
  every term already exists (§4.3 + §5). Renders only on reveal.
- After any executed trade: forecast + on-the-clock order recompute; the ticker shows the trade
  as an event.

## §7 The shell (D2): setup, gates, routing, handoff
- **Pool model (JK-RULED 2026-07-09 — NOT the auction's; supersedes this section's earlier
  "locked pool" draft):** no extraction, no sizing, no quality targets, no design-first. The
  user selects source LEAGUES (the universe checkboxes); **ALL players from those leagues
  populate the draft pool**; the user may hand-add or hand-remove individual players freely.
  **Validity = position supply only:** for every hard legal-roster position, pool supply ≥
  teams × roster minimum (the POOLFLOOR arithmetic reused as a pass/fail VALIDITY CHECK — it
  never tops anything up, because there is nothing to extract from). Any pool that can seat
  every club's legal 22 by position is valid. An explicit CONFIRM POOL step replaces the lock
  ceremony; staleness reduces to "a source league's roster changed since confirm." The parked
  page's silent "register directly if no pool exists" fallback is DELETED either way.
- **Setup conversion is design-gated (do not assume crossover — JK directive):** a dedicated
  ground-truth pass (commissioned 2026-07-09) classifies every auction Draft Setup zone and
  every setup-side logic path as APPLIES / NEEDS-REWORK / DOES-NOT-APPLY for the snake pool
  model, and must answer at minimum: what pool membership means WITHOUT extraction
  (leagueAssignments semantics for a full-universe pool; the fate of undrafted players at
  completion); where personality/chemistry/hidden-modifier axis regeneration happens when
  `lockLeaguePool` never runs; performance at full-universe scale (board rendering, forecast
  rollouts, solvency sweeps over hundreds of candidates); and which readiness gates carry
  over. The captain rules the setup surface (a snake mode inside Draft Setup vs a dedicated
  leaner screen) from that evidence BEFORE D2's contract is written.
- **Readiness gates before START:** valid pool confirmed (position supply); every seat named;
  draft order set (manual reorder stays; add a seeded SHUFFLE); cap headroom advisory shown
  ("Round-1 money: the top board IVs vs your cap").
- **Routing unlock (MLB only):** re-add the route in `App.tsx` (+`routes.tsx` if live);
  `mlbDraftRouteForFormat` branches on `getLeagueDraftFormat` again (un-orphaning it); restore
  the Snake option in `DRAFT_FORMAT_OPTIONS`; remove the edit-form coercion that force-resets
  stored `draftFormat` to auction. Update `draftRouting.test.ts` to pin the format-aware law.
  Farm routing untouched.
- **Legality during the draft:** live legal-22 tracking per team (position minimums, catcher
  depth, ≥1 true closer); must-fill lock when remaining picks == remaining required seats
  (mirrors §4.1's CPU constraint for humans — the UI constrains the candidate list and says
  why, in VOICE).
- **Completion handoff:** on final pick, the same continuation arc as the auction (scout
  reveal → farm auction → franchise), not a dead badge. One completion screen: each club's
  legal-22 check, cap ledger, tax bill, and the advisor's draft grade hook (ADVISORCOLOR later).
- **Rounds:** fixed 22 (= LEGAL_ROSTER.size), as built.

## §7a Setup-conversion rulings (2026-07-09, from the ground-truth pass — BINDING for D2/D5)
Evidence: the zone-by-zone conversion inventory run 2026-07-09 (session record; decisive facts
restated inline).
1. **Pool membership = session-scoped, never assignment writes.** Today "in a pool" means
   writing a `leagueAssignments` row onto the SHARED player record (`addPlayersToLeaguePool`).
   For a full-universe snake pool that would (a) permanently stamp hundreds of never-drafted
   players with stray FREE_AGENT assignments to the snake league — nothing ever cleans these
   up (verified: even the auction leaves its surplus assignments forever), and (b) fire
   300–600 individual sync-tracked player writes at confirm time. RULING: the snake pool is a
   persisted candidate-id list + iv/salary snapshot on the draft session/pool record;
   `leagueAssignments` is written ONLY at pick commit (the parked page's per-pick commit
   already does exactly this). Undrafted players are untouched by construction — JK's
   invariant, satisfied structurally.
2. **No pool-wide axis regeneration for snake — ever.** `lockLeaguePool` re-rolls
   personality/chemistry/hidden-modifiers over every pool member; those are GLOBAL fields on
   the shared player row, so running it over a full universe would silently rewrite
   established players' personalities in their SOURCE leagues. RULING: snake performs no
   lock-time axis processing. Gap-fill only: at pick commit, a drafted player still carrying
   flat seed defaults (no `hiddenPersonalityModifiers`) gets seeded axes; players with real
   axes are never touched.
3. **Setup surface = a dedicated, leaner snake setup screen**, composed from the shared pieces
   the inventory verified convert as-is: seat/owner zone, ArchetypePicker, the source-league
   checkboxes (repurposed from extraction-filter to POPULATOR), the hand add/remove shuttle
   (rebound to the session candidate list), `evaluatePositionSupplyFloors` as the validity
   check, and RankYourBoardZone (whose new consumer is §5's advisor board). Basis: Draft Setup
   is ~5,400 lines and two-thirds auction-specific by construction (extraction, sizing dials,
   shills, reserve price, asks/gaps, lock-anchored readiness) — a snake mode inside it would
   be conditional spaghetti. Share components, not the page.
4. **CONFIRM POOL is the snake milestone** (replaces the auction's lock): snapshot the
   candidate list + run the validity check; no price freeze, no axis regen. Readiness =
   clubs exist · identities picked · pool confirmed (position floors + total ≥ teams × 22) ·
   draft order set.
5. **Scale planks (D2/D5 contracts must carry these):** the draft board renders
   position-filtered, PAGINATED candidates — the parked page renders every undrafted candidate
   as a card, unpaginated, at full-universe sizes of 440–1,300; its per-candidate solvency
   memo is O(N²) per render (rule: compute the completion reserve once per pick from a sorted
   salary index, not per candidate); RankYourBoard's global view needs the shuttle's
   pagination pattern.
6. **Franchise recognition re-confirmed:** the draft-derived morale/freeze payoff is
   auction-session-gated in the franchise initializer — the §8 plank stands; ruling 2's
   gap-fill feeds it the axes it expects.

## §8 Correctness planks (D1 — before anything user-visible)
1. **Settlement:** pick commit stamps `salary`+`settledSalary` per §3 (auction parity via the
   same pipeline shape as `saveMlbAssignment`).
2. **Franchise recognition:** `franchiseInitializer` (draft-freeze/morale backfill) and
   COPYFIX's post-draft duplication guard both gain a completed-snake-session branch
   (`mlbDraftSessions` store, `currentPickIndex >= pickOrder.length`) alongside the
   `AUCTION_COMPLETE` check. No other franchise logic changes.
3. **Draft-freeze inputs from picks:** `buildDraftFreezeInputs` gets a snake adapter (pick
   round/slot/settled salary in place of bid history) — pure adapter, no engine change.
4. **Canonical roster shape:** the page's local `createEmptyMlbDraftRoster` copy is deleted in
   favor of the canonical `createEmptyTeamRoster`.
5. **Repro-first:** each plank lands with a failing test first (e.g., "snake-drafted player
   shows settled salary in franchise" red → green). D1's exit gate is the §3 calibration
   gauntlet plus franchise-recognition round-trip tests.

## §9 Protocol
Contract-first (verbatim contracts in `spec-docs/contracts/CONTRACT_D<N>_*.md`); repro-first
for every behavior change; gates per lane = typecheck, build, owned suites, consuming-page
suites, and ONE full vitest (the POOLFLOOR lesson is law here); test suites for the snake page
are rebuilt from scratch (the old ones were deleted at retirement — zero coverage exists).
File-surface partition proven before any two D-lanes run concurrently. JK's browser walkthrough
on real data remains the sole acceptance gate; the six-draft gauntlet + calibration invariant
are the machine gates in front of it.
