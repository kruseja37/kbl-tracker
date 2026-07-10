# CONTRACT S1A — SNAKE DRAFT FOUNDATIONS: ENGINE (critical lane)
Captain: Fable · Builder: Codex gpt-5.6-sol xhigh · Date: 2026-07-10
Branch: codex/snake-s1a-foundations · Base: main @ ccdbf30b

## AUTHORITY (read in this order before any code)
1. spec-docs/SNAKE_DRAFT_VISION_2026-07-10.md — the design of record (LAYERED: later
   sections supersede earlier on conflict).
2. spec-docs/SNAKE_DRAFT_V1_PROGRAM_2026-07-10.md — the build program; this contract IS
   its S1a lane, expanded. The 18-ruling states appendix binds.
3. spec-docs/contracts/CONTRACT_S0_TRANSFER_AUDIT_2026-07-10.md — the transfer manifest.
   You may import ONLY manifest-approved modules from auction-era code. Every consumption
   point it names is pre-verified; trust its file:line.

## THE LAWS (audit criteria — violations are REJECT, not notes)
- FIRST LAW: it's the GM's board. Engines COMPUTE (money, legality, risk, scarcity);
  they NEVER rank, recommend, or reorder a GM's board or rankings. No optimizer exists.
- ADVISORY ≡ SETTLEMENT: every advisory tax/cost number comes from the SAME functions
  settlement uses (`auctionLuxuryTax.ts` — `auctionMarginalTaxWithCaps`,
  `normalizeAuctionLuxuryCapsForLeagueSize` with the REAL club count). No parallel math.
- DETERMINISM: no Math.random / Date.now / new Date() in any engine path. The rational
  room is a pure function of (session state, locked archetypes, public rosters).
- NO PERCENTAGES: no engine output string or numeric field intended for display carries
  a probability/percentage. Risk is categorical: SAFE_TO_WAIT / AT_RISK / LIKELY_GONE.
- AUCTION FROZEN: never edit auction flow files (AuctionStage, auction pages, auction
  pipeline flow). Shared pure engines are consumed, not modified. If correctness seems to
  require touching a shared auction engine → STOP and report (do not improvise).
- PUBLIC INPUTS ONLY: the rational room reads ONLY public info — locked-at-GO club
  archetypes, real-time public rosters, pick ownership, the shared pool. It NEVER reads
  any club's private board/rankings.

## SCOPE — engine + storage only. NO UI. Six work items.

### W1. Session model v2 (extend `mlbDraftSessions` IN PLACE — no new store)
Extend `LeagueBuilderMlbDraftSession` (`src/utils/leagueBuilderStorage.ts:341`) with
additive optional fields:
- `seatBoards`: per-seat DRAFT BOARD — exactly 22 slots keyed by roster-slot taxonomy,
  each holding a unique playerId (22 unique IDs per board); plus per-seat positional
  rankings (reuse the `boardRankOverrides` pattern — hand-touches are frozen forever).
- `versionState`: retired-version bookkeeping (see W2).
- `paused`: commissioner pause flag (appendix 18 semantics).
- `correctionSnapshots`: enough state to undo THE MOST RECENT COMPLETED ACTION only
  (pick or trade), per appendix 5-7; window closes when the next action lands.
HARD COMPATIBILITY RAIL: `completedPicks` / `pickOrder` / `currentPickIndex` semantics
are UNCHANGED (D1 handoff reads them — `mlbDraftCompletion.ts:26`,
`leagueBuilderAuctionPipeline.ts:385`). A correction must resolve the session back to a
state where completedPicks is the truth; at completion every team has 22 unique
playerIds (the commit throws on dupes — that throw must be unreachable).
Per-seat records are last-write-wins safe (appendix 14).

### W2. versionGroupId shim + one-per-human dedupe
No human-identity field exists on stored Players (S0 CT3). Build a pure derivation:
person key from `sourceId` (e.g. `lahman:ruthba01` → `ruthba01`); players sharing a
person key form a version group. Natural same-name players with DIFFERENT sourceIds are
NOT grouped. COUNT-HUMANS-NOT-CARDS invariant: in every counting system you build
(seating proof, supply, scarcity, rational room), a version group counts as ONE human.
When any version is drafted, the group's other versions become undraftable (session
`versionState`). Dedicated tests per counting surface (appendix 17).

### W3. THE SIMULTANEOUS SEATING PROOF (greenfield — the stop-ship item)
New pure engine: can ALL clubs seat a legal, affordable 22 from the shared pool AT THE
SAME TIME (joint disjoint assignment, one-per-human dedupe applied)?
- `cheapestLegalCompletion` (`auctionCompletionFloor.ts:448`) may serve as a per-club
  sub-check, but the proof must reserve players jointly — two clubs may never count the
  same card (or two versions of the same human) toward their seats.
- A constructive approach (sequential cheapest completions consuming a shared pool copy)
  is acceptable IF you prove it sound for our legality shape (positional minima per
  LEGAL_ROSTER, `rosterConstruction.ts:29-43`) or make it order-robust (e.g. scarcest-
  position-first with a documented argument + adversarial tests).
- Failure output NAMES the shortfall in copy-law words: which position, how many short,
  for how many clubs (appendix 15). Mid-draft form: the proof re-checks against
  remaining pool + remaining seats (feeds the room's "YOUR LEGAL FINISH IS AT RISK").
- Affordability: each club's completion must fit its remaining budget INCLUDING the tax
  bill of the completion (same settlement math).
Tests: shared-scarcity false-pass case (each club passes alone, joint fails) is the
canonical repro and MUST exist and fail against a naive per-club implementation.

### W4. THE RATIONAL ROOM (deterministic prediction engine)
Pure, deterministic playout to each asking club's next pick: every club, in pick order,
takes its highest rational-interest available player, where
`interest = fit-worth × need − true-cost drag`:
- fit-worth: `assembleBoard` worth / `archetypeFit` against the club's LOCKED-at-GO
  archetype (manifest items 3, 11).
- need: `rosterNeedBreakdown` / `ownNeedMultiplier` (`rosterNeed.ts:148`) from the
  club's real-time PUBLIC roster.
- true-cost drag: marginal tax via the settlement functions (λ-style drag; POC used
  λ=1.15 — keep a named constant, document the choice).
- Legality + money rails: a club never "takes" a player who breaks its legal finish
  (W3 mid-draft form) or its budget.
NO jitter, NO rollouts, NO sampling — do not consume `estimateMarket` or the POC's
`pickSnakeCpuCandidate` jitter/greed layers (S0 item 11: harvest ingredients, not the
coin-flip layer).
Output per asked player, per asking seat: SAFE_TO_WAIT / AT_RISK / LIKELY_GONE for
"at your next pick", derived ONLY from the playout (LIKELY_GONE ⇔ the playout drafts
him before your pick; AT_RISK ⇔ within a documented margin of your pick, e.g. taken at
your pick by another interest ranking or ≤K picks after; define K, document it).
INVARIANT (tested): the categorical read always agrees with the playout that produced
it. Validation harness: 8-club scripted scenario suite — position runs, scarce catchers,
tax-pressured clubs — asserting directionally-sane predictions.

### W5. The plan/tax model — THE TWO BILLS (never conflated)
- BILL 1 (the plan): PLAN COST / PLAN TAX / PLAN CUSHION computed from a seat's board
  MEMBERSHIP (the 22 unique IDs; slots don't matter to tax — membership does). PLAN TAX
  calls the settlement `luxuryTax` on the planned 22 with normalized caps (real club
  count). PLAN CUSHION = budget − plan cost − plan tax.
- BILL 2 (the fallback): LEGAL-FINISH CUSHION — budget room after the CHEAPEST legal
  completion from players available now. Adapt `evaluateSnakePick`
  (`snakeDraftPoc.ts:106` — `completionTaxReserve`/`completionHeadroom` is the seed);
  strip its POC/CPU coupling.
- Distinct names, distinct types, both first-class engine outputs. A board edit (swap,
  backfill) recomputes bill 1; a pool change recomputes both. WHAT-IF entrypoint:
  evaluate a hypothetical board (keep/revert is UI's job) — it computes consequences,
  never suggests the swap (First Law).

### W6. The guide package validator (trade engine core)
Posted prices from `derivePickValueChart` (`leagueConstruction.ts:284`). Adapt the
`executeSnakePickTrade` skeleton (`snakeDraftPoc.ts:434`): keep pick-count balance
(:466), `mustFillSurvives` legality (:469), turn-count preservation (:508); STRIP the
CPU greed margin (:493). New: the balancing-package SEARCH — given "I want pick N", find
which of my picks satisfy the posted price, including balancing RETURN picks
("OFFER 14+41; RECEIVE 9+62"); if no legal package exists, say so plainly ("No legal
guide trade reaches pick 9"). Both clubs must keep legal finishes (W3 mid-draft form)
post-trade. Revalidation entrypoint: a proposed package is re-checked against the
CURRENT session revision at execution time (appendix 14 — "the draft moved on").
Ownership moves; the snake's geometry never changes.

## FILE SURFACE
- New engines: `src/engines/snake*` (new files) + their `__tests__`.
- Storage: additive edits to `src/utils/leagueBuilderStorage.ts` (session v2 fields) —
  additive ONLY; no store renames, no DB version bump unless provably required (if
  required → STOP and report first).
- Allowed read-only imports: everything in the S0 manifest.
- FORBIDDEN: any edit to auction flow/UI files; any edit to shared auction engines;
  any edit to `snakeDraftPoc.ts` beyond exporting existing internals if needed for
  adaptation (prefer copying logic into new snake engine files and marking the POC
  provenance in a comment).

## TESTS (spec-first: write failing tests from this contract, then implement)
Mandatory named cases: shared-scarcity joint-fail (W3) · versions-count-as-one-human in
all four counting surfaces (W2/appendix 17) · risk-read-matches-playout (W4) ·
two-bills-never-equal-by-construction scenario where plan is affordable but legal-finish
is tight and vice versa (W5) · guide search finds the documented balancing package and
refuses the stranding one (W6) · correction restores byte-identical prior session state
(W1) · D1 compatibility: a completed v2 session passes the existing commit path with 22
unique IDs per team (W1).

## GATES (in order; paste real output in the builder report)
1. `npx tsc --noEmit` clean.
2. `npm run build` exit 0.
3. Owned suites green (all new snake engine tests).
4. THE AUCTION SUITES green (preservation gate — the 28 auction test files).
5. ONE full `npx vitest run` (known solo-flake list applies: LeagueBuilderDraftSetup,
   franchiseManualSmokeFixture, historicalArchetypes in big batches — verify solo).

## PROTOCOL
- Contract-first: this file is committed before you start (done by captain).
- NO git write commands (captain cuts commits from your finished tree).
- UNKNOWN or mid-build surprise = STOP and write it into the builder report; never
  improvise scope.
- Builder report: append to this file — what was built (file:line), gate outputs
  (real terminal text), STOPs hit, anything the auditor should attack first.
