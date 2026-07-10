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

---

## AMENDMENT 1 (captain, 2026-07-10, JK-prompted) — W3 composes with existing supply layers; DO NOT DUPLICATE
Prior art EXISTS and W3 must build on it, not beside it:
- `poolDemandModel` class floors (`src/engines/auctionPoolSizing.ts:100`) — aggregate
  per-class supply-vs-demand counting.
- POOLFLOOR position floors (merged 2026-07-09): `POSITION_SUPPLY_FLOOR_TUNING` +
  LEGAL_ROSTER-derived per-position minima in `src/engines/poolFromDemand.ts`, and
  `evaluatePoolDemandSufficiency` → `positionFloorReasons` in
  `src/utils/leagueBuilderPoolBuilder.ts` (structured shortfall reasons; Draft Setup
  already renders "THE POOL IS SHORT ON CLOSERS — n FOR N CLUBS" copy).
Binding consequences:
1. W3's NEW contribution is exactly the part these layers lack: the JOINT ASSIGNMENT
   (no card counted twice), AFFORDABILITY (each club's completion + its tax fits its
   budget), and ONE-PER-HUMAN version dedupe. Do not re-derive position minima or
   re-implement counting floors — derive minima the way POOLFLOOR does (from
   LEGAL_ROSTER) or call its machinery.
2. Failure output: emit structured reasons in the SAME shape as `positionFloorReasons`
   (extend the shape additively if the joint proof needs richer reasons, e.g.
   affordability shortfalls), so S1b's setup card renders through one pipeline.
3. Cheap-first sequencing is encouraged: run the existing counting floors as a fast
   pre-check (fail fast with their reasons), then the joint proof for what counting
   cannot catch. A counting pass NEVER substitutes for the joint proof (the
   false-pass test from W3 still stands).
4. Do not modify poolFromDemand/auctionPoolSizing/leagueBuilderPoolBuilder behavior
   for auction callers — consumption and additive extension only; POOLFLOOR's
   byte-identity guarantee must survive (auction suites gate).

---

## BUILDER REPORT — Codex S1A (2026-07-10)

### Outcome

Built the six engine/storage foundation items on `codex/snake-s1a-foundations` at
captain HEAD `ed6c3a50`. The tree is intentionally dirty for the captain. No git write
command was run. No UI/page/component, auction-flow, shared-auction-engine, POOLFLOOR,
pool-sizing, or database-version code was edited.

The mandatory tests were written before their engines existed. The initial red run
failed at module resolution for the new `snake*` imports; implementation followed only
after that red proof.

### What was built

- W1 session v2: additive optional storage fields, canonical 22-slot board taxonomy,
  per-seat LWW revision, version state, pause, one-action correction snapshot, and
  session revision in `src/utils/leagueBuilderStorage.ts:341-402`. Board validation,
  one-window byte-identical correction, and version-aware pick mutation live in
  `src/engines/snakeSession.ts:19-89`. Existing `completedPicks`, `pickOrder`, and
  `currentPickIndex` semantics are unchanged; there is no store or DB-version change.
- W2 version identity: source-person-key derivation, card-id fallback, one-human dedupe,
  retirement, and unavailable-card projection in `src/engines/snakeVersioning.ts:3-75`.
  Names are never identity inputs. Because the stored `Player` interface has no
  `sourceId`, this remains a pure adapter seam accepting historical-source identity from
  its future caller; the storage schema was not improvised or widened.
- W3 simultaneous seating: POOLFLOOR-derived target/matcher consumption, `poolDemandModel`
  body precheck, version-deduped fast floors, shared-pool constructive reservations,
  canonical roster verification, and settlement-tax affordability in
  `src/engines/snakeSeatingProof.ts:37-332`. Its structured shortfall contains the full
  `PositionSupplyFloorResult` shape and adds only joint/affordability detail. Counting is
  a precheck only; a counting pass still proceeds into the joint proof.
- W4 rational room: deterministic public-input playout, locked-archetype fit/need,
  settlement marginal tax with named lambda `1.15`, W3 legality/money rails, version-human
  scarcity, and categorical reads only in `src/engines/snakeRationalRoom.ts:16-218`.
  It contains no sampling, jitter, probability field, private board input, recommendation,
  or board mutation.
- W5 two bills: membership-only plan cost/tax/cushion, separately typed cheapest legal
  finish cost/tax/cushion, and a consequence-only what-if entrypoint in
  `src/engines/snakeEconomics.ts:15-157`. Both use real-team normalized settlement caps.
- W6 guide core: posted-chart package search over 1-3 equal-count pick combinations,
  balancing return picks, direct W3 validation, stale-revision/ownership revalidation,
  ownership-only execution, and one-action trade correction in
  `src/engines/snakeGuideTrade.ts:12-218`. CPU greed and display percentages are absent.

### Test evidence

- W1/W2 storage, exact-22 boards, retirement, byte-identical correction, and the actual
  existing D1 commit path: `src/engines/__tests__/snakeVersioningSession.test.ts:49-193`.
- W3 adversarial counting-pass/joint-fail, position supply version dedupe, and disjoint
  legal success: `src/engines/__tests__/snakeSeatingProof.test.ts:75-138`.
- W4 risk/playout agreement, rational-room version dedupe, and the scripted 8-club
  position/scarcity/tax scenario: `src/engines/__tests__/snakeRationalRoom.test.ts:61-166`.
- W5 opposite-pressure two-bill cases and membership-tax invariance; W6 documented
  `14+41` for `9+62`, stranding refusal, correction, and stale revision:
  `src/engines/__tests__/snakeEconomicsGuide.test.ts:51-176`.

### Amendment 1 handling

Amendment 1 landed at HEAD while the initial implementation was in progress. Work on the
report stopped, W3 was refactored to consume `poolDemandModel`,
`derivePositionSupplyFloorTargets`, and `matchesPositionSupplyFloor`, the shared-scarcity
fixture was strengthened so aggregate counting passes before joint assignment fails, and
the entire binding gate sequence below was restarted. No shared supply behavior changed.

### Gate outputs (real terminal text)

The first Gate 2 attempt exposed a project-build-only type narrow not reported by the bare
Gate 1 command. It was fixed, and the sequence restarted from Gate 1:

```text
> kbl-tracker@0.0.0 build
> tsc -b && vite build

src/engines/snakeSeatingProof.ts(151,47): error TS2345: Argument of type 'string' is not assignable to parameter of type '"C" | "1B" | "2B" | "3B" | "SS" | "LF" | "CF" | "RF"'.
```

Final Gate 1 — `npx tsc --noEmit`:

```text
(exit 0; no output)
```

Final Gate 2 — `npm run build` (existing warnings retained):

```text
> kbl-tracker@0.0.0 build
> tsc -b && vite build

vite v7.3.1 building client environment for production...
transforming...
Browserslist: browsers data (caniuse-lite) is 6 months old.
✓ 2650 modules transformed.
rendering chunks...
(!) franchisePlayerStorage.ts is dynamically imported and also statically imported; dynamic import will not move module into another chunk.
(!) Some chunks are larger than 500 kB after minification.
✓ built in 9.96s

PWA v1.2.0
mode      generateSW
precache  189 entries (5403.49 KiB)
files generated
  dist/sw.js
  dist/workbox-1d305bb8.js
(exit 0)
```

Final Gate 3 — all owned suites:

```text
 RUN  v4.0.18 /private/tmp/kbl-s1a

 ✓ src/engines/__tests__/snakeSeatingProof.test.ts (3 tests) 17ms
 ✓ src/engines/__tests__/snakeRationalRoom.test.ts (3 tests) 27ms
 ✓ src/engines/__tests__/snakeEconomicsGuide.test.ts (3 tests) 20ms
 ✓ src/engines/__tests__/snakeVersioningSession.test.ts (5 tests) 31ms

 Test Files  4 passed (4)
      Tests  14 passed (14)
   Start at  17:22:46
   Duration  1.59s (transform 1.98s, setup 235ms, import 2.39s, tests 95ms, environment 1.86s)
```

Final Gate 4 — frozen auction preservation set:

```text
      28 /tmp/s1a-auction-tests-final.txt

 Test Files  28 passed (28)
      Tests  327 passed (327)
   Start at  17:22:53
   Duration  39.54s (transform 6.21s, setup 1.68s, import 12.24s, tests 66.47s, environment 12.35s)
```

Final Gate 5 — the one full `npx vitest run` invocation:

```text
 FAIL  src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.poolLock.test.tsx > LeagueBuilderDraftSetup > manual exclusion does not beat a roster-design pin during regeneration
Error: Test timed out in 15000ms.
 ❯ src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.poolLock.test.tsx:676:3

 Test Files  1 failed | 624 passed | 8 skipped (633)
      Tests  1 failed | 9569 passed | 15 skipped (9585)
   Start at  17:23:41
   Duration  227.75s (transform 31.19s, setup 38.44s, import 144.56s, tests 969.69s, environment 323.43s)
```

This is in the contract's named `LeagueBuilderDraftSetup` solo-flake group. Exact solo
verification passed:

```text
 RUN  v4.0.18 /private/tmp/kbl-s1a

 ✓ src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.poolLock.test.tsx (21 tests | 20 skipped) 2046ms
     ✓ manual exclusion does not beat a roster-design pin during regeneration  2045ms

 Test Files  1 passed (1)
      Tests  1 passed | 20 skipped (21)
   Start at  17:27:35
   Duration  3.93s (transform 1.14s, setup 44ms, import 1.48s, tests 2.05s, environment 271ms)
```

### STOPs / surprises

- No unresolved UNKNOWN and no scope-expansion STOP remains.
- Amendment 1 was the only mid-build authority change; implementation/report work stopped
  long enough to compose W3 with the existing supply layers and rerun every gate.
- The source-person key is not present on stored `Player`; the engine exposes the required
  pure seam and deliberately does not invent a storage field. S1b must supply the historical
  adapter's source identity when it wires this engine.
- The first build-only type failure is recorded above; after the narrow fix, the full gate
  sequence restarted and produced the final evidence above.
- Pre-existing untracked captain artifacts `DISPATCH_PROMPT_S1A.txt`, `run_s1a.sh`, and
  `sentinel_s1a.sh` were not read as implementation authority and were not modified.

### Auditor: attack these first

1. Try adversarial club orderings against W3's documented conservative scarcest-first
   constructive certificate; success is sound, but the algorithm may reject feasible rooms.
2. Verify W3's additive failure shape remains directly consumable beside
   `positionFloorReasons`, especially joint C-depth and affordability copy.
3. Attack W4's all-in budget accounting across repeated playout picks and identity-shifted,
   real-team-normalized tax caps; confirm every categorical read is traceable to its playout.
4. Attack correction-window replacement and restoration after both picks and trades, including
   version retirement and current-live-pick ownership.
5. Verify S1b wires a stable historical `sourceId` into W2; absent source identity intentionally
   falls back to card identity and therefore cannot dedupe historical versions.

---

## AUDIT — opus, independent, 2026-07-10 — VERDICT: APPROVE-WITH-NOTES
Auditor re-ran gates itself: tsc clean · 4 snake suites 14/14 · 8 consumed shared-engine
auction suites 105/105 · diff touches ONLY src/engines/snake* + additive
leagueBuilderStorage.ts (POOLFLOOR byte-identity survives by construction).
Attacks run with auditor-authored tests (then removed):
1. W3 FALSE-PASS IMPOSSIBLE — feasible:true is a constructed, verified certificate
   (per-club cheapestLegalCompletion over one-card-per-human representatives, isLegalRoster
   re-check :269, version-groups removed from shared pool :328). Infeasible pool correctly
   rejected; feasible room produced 44 disjoint IDs.
2. Affordability INCLUDES completion tax (empirical: salary-affordable/tax-unaffordable
   room rejected with reason 'affordability'; same room with empty caps feasible).
3. ADVISORY≡SETTLEMENT confirmed — luxuryTax/auctionMarginalTaxWithCaps + normalized caps
   with real club count everywhere; no parallel tax math.
4. One-per-human confirmed in all four counting surfaces.
5. Determinism / no percentages / public-inputs-only / First Law — all confirmed.
6. W1 correction byte-identical (JSON equality); D1 compat proven against the REAL
   commitCompletedSnakeSessionToLeagueRosters.
NOTES (non-blocking, carried forward):
- N1 → S1b MUST thread stable historical sourceId into every W2 consumer + a LOUD
  presence check (silent card-id fallback defeats one-per-human dedupe).
- N2 → S2/S4: guide-trade legal-finish guard doesn't model pick TIMING; decide whether
  timing-strand protection is needed before shipping guide trades.
- N3 (low): W4 back-to-back snake-turn edge mildly distorts AT_RISK margin.
- N4 (low): min-salary completion can over-reject on tax cliffs — safe direction only.
- N5: setup-floor conservatism is the intended POOLFLOOR precheck per Amendment 1 §3;
  mid-draft path uses exact hard demand (not over-conservative).
