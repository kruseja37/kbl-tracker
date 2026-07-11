# CONTRACT S6 — THE FARM SNAKE (same room, mistier)
Captain: Fable · Builder: Codex gpt-5.6-sol high · Date: 2026-07-10
Branch: codex/snake-s6-farm · Base: main @ post PR #71

## AUTHORITY
1. spec-docs/SNAKE_DRAFT_VISION_2026-07-10.md — THE FARM SNAKE (short snake, same room
   and ritual, scout-band fog, SCOUT'S CALL replaces STEAL, slotted rookie salaries from
   the ABSOLUTE pick number, NO availability/survival reads — public pressure counts
   only), hidden-vs-revealed law (scout grade/range ONLY; true ratings hidden till
   call-up).
2. spec-docs/SNAKE_DRAFT_V1_PROGRAM_2026-07-10.md — S6 lane + appendix 16 (farm entry
   from the continuation arc after scout hire; same session model, farm mode bit; ends
   when all farm rosters are full → staff hire; prep carries per seat) + CT2 ANSWERED
   (per-club scout variance exists → named-player SCOUT PRESSURE permitted from each
   club's OWN scouting snapshot).
3. spec-docs/contracts/CONTRACT_S1A/S2/S3/S4 — the room/desk/trade machinery you
   extend. S4 audit carry-forward: the pick-trade flow operates on pickOrder ownership
   — farm PICK trades may reuse it IF the farm session uses the same session model
   (it does — appendix 16); farm affordability is the piece that changes (below).

## LAWS (REJECT criteria)
- THE FOG IS THE GAME: no true rating, true grade, IV, fit-from-true-ratings, or
  rational-room risk read EVER renders in the farm room. Cards show scout grade/range
  (the club's OWN scout snapshot — CT2), SCOUT'S CALL replaces STEAL/TRUE COST framing.
  NO survival/availability reads on farm at all — the only advisor voice is PUBLIC
  PRESSURE from public roster counts ("3 CLUBS STILL NEED ARMS") plus named-player
  SCOUT PRESSURE lines derived ONLY from the club's own scout data.
- SAME RITUAL: the five-state machine, sounds, privacy covers, commissioner controls
  are the EXISTING S2 machinery — reused, not forked. The reducer is untouchable.
- SLOT SALARIES ARE LAW: a farm pick's salary is stamped from the ABSOLUTE pick number
  via the frozen slot table (below) — unambiguous under pick trades (the salary rides
  the pick slot, not the club).
- First Law · copy law · no percentages · auction frozen · advisory≡settlement (farm
  affordability arithmetic below is exact, not estimated).

## CAPTAIN RULING — the farm slot table (product math, decided)
New pure engine src/engines/snakeFarmSlots.ts:
- `buildFarmSlotTable(totalPicks, farmBudgets)` → fixed per-pick salary table,
  geometric decay, calibrated: first pick = 3× the last pick's salary, and the SUM of
  all slots = 75% of the summed club farm budgets (leaving 25% headroom league-wide).
  Round to the existing salary display unit.
- Computed ONCE at farm-session creation from the actual league's farm budgets and
  FROZEN into the session (additive optional field `farmSlotSalaries?: number[]` on
  the session — Amendment-2 pattern grant, additive only, no DB bump). Trades never
  recompute it.
- Farm affordability is exact arithmetic: a club can afford its remaining owned picks
  iff sum(slot salaries of its remaining owned farm picks) ≤ its remaining farm
  budget. This is the farm trade validator's money gate (replaces the MLB seating
  proof in the S4 flow for farm sessions); roster legality gate = every club can
  still fill its remaining farm slots from the remaining pool (count arithmetic,
  version-dedupe aware).
- If the farm budget source is ambiguous or absent at session creation → STOP.

## SCOPE
F1. FARM MODE IN THE ROOM: SnakeDraftRoom/View detect the farm phase from the session
(farm mode bit per appendix 16). Farm rendering: scout-band cards (grade + range +
SCOUT'S CALL line), slot salary shown per pick slot ("PICK 7 PAYS $X — WHOEVER TAKES
IT"), fog-safe desk (rankings/board over scouted grades; the S3 desk models reused
with scout-visible inputs; NO risk reads, NO two-bills MLB tax framing — farm money =
budget minus committed slot salaries, one line).
F2. FARM ENTRY/EXIT: enters from the existing continuation arc after scout hire;
creates the farm session (same model, farm bit, slot table frozen); ends when all farm
rosters are full → hands off to the existing staff-hire arc (the D1-family farm
carryover path — leagueBuilderAuctionPipeline farm committing; reuse, don't fork; if
the existing farm commit path can't accept snake-farm sessions → STOP).
F3. FARM ADVISOR: public pressure lines (counts from public rosters/pool) + named
SCOUT PRESSURE from the club's own scout snapshot ("YOUR SCOUT LOVES DIAZ — 2 CLUBS
STILL NEED ARMS"), through the existing LOG leash (actionable-only, expiring).
F4. FARM PICK TRADES: the S4 guide + commissioner flow against the farm session's
pickOrder, with the money gate swapped to the exact slot-salary arithmetic above and
the same honesty line. Posted prices for farm = the slot table itself (the price IS
the chart). If the S4 machinery resists the gate swap cleanly → STOP (do not fork the
trade flow).

## FILE SURFACE
NEW: src/engines/snakeFarmSlots.ts + tests · src/src_figma/app/components/snake/farm/
(fog cards, scout pressure, farm money line) + tests.
OWNED EDITS: SnakeDraftRoom.tsx · SnakeDraftRoomView.tsx (farm mode) · desk/ minimal
additive edits for fog inputs (do not restructure S3 models) · trade/ minimal additive
edits for the farm money gate (do not restructure S4 flow) · the ONE storage field
(farmSlotSalaries + the farm mode bit if not already present).
FORBIDDEN (S5 owns concurrently): src/App.tsx · pages/SnakeCompanion.tsx ·
components/snake/companion/ · other engines · auction files · flags · the reducer's
ritual states.

## TESTS
Fog tripwire: render the farm room with a pool whose true ratings are known and assert
NO true-rating/IV/risk string appears anywhere (the S3 risk-read surfaces are absent
in farm mode) · slot table: calibration (3× ratio, 75% sum), frozen-at-creation,
trade-invariant · affordability arithmetic exact (a trade that overruns a club's farm
budget refuses; one that fits executes) · entry/exit round-trip through the real
continuation-arc storage path · SCOUT PRESSURE only from own-scout data (rival scout
snapshots unreachable) · ritual reuse (pick a prospect through the five states —
existing reducer tests still green) · copy law.

## GATES (real output)
1. tsc clean. 2. build exit 0. 3. Owned + S2/S3/S4 snake suites green. 4. Auction
suites green. 5. ONE full vitest (known solo-flakes — verify solo if red).

## PROTOCOL
No git write commands. Spec-first tests. UNKNOWN = STOP. Builder report appended here.

---

## BUILDER REPORT — Codex S6 (2026-07-10) — BLOCKED / CONTRACT STOP

### Outcome

STOPPED before tests or implementation at the contract's required entry/exit preflight.
No git write command was run. No production code or test file was changed. The only
lane-owned change is this required builder report; the pre-existing untracked captain
artifacts `DISPATCH_PROMPT.txt`, `run_lane.sh`, and `sentinel.sh` remain untouched.

### Blocking precondition 1 — the real post-scout continuation does not enter a farm snake session

`ScoutHire` persists the league's scout assignments and then calls
`farmDraftRouteForLeague(activeLeague)` (`src/src_figma/app/pages/ScoutHire.tsx:65-76`).
The routing helper ignores `LeagueTemplate.draftFormat` and unconditionally returns
`/league-builder/farm-auction-draft` (`src/src_figma/app/utils/draftRouting.ts:16-20,
49-50`). Therefore the contract's required real continuation arc cannot create or open
the S6 farm-mode snake session.

Repairing that seam requires editing `ScoutHire.tsx` and/or `draftRouting.ts`. Neither
path is in S6's owned-edit list (`FILE SURFACE`, lines 75-84), and the user explicitly
made the parallel-lane file boundaries hard. Editing the routed farm-auction page or
`App.tsx` instead would cross the frozen-auction/S5 boundary.

### Blocking precondition 2 — the existing farm commit path cannot accept the snake session model

The only existing farm handoff is
`commitCompletedFarmAuctionSessionToLeagueRosters`. Its input is specifically
`AuctionSession` plus `FarmAuctionPool`; it requires auction completion and reads
`session.teams[].roster[]` (`src/utils/leagueBuilderAuctionPipeline.ts:450-475`). The
shared snake session instead stores `pickOrder`, `completedPicks`, and
`currentPickIndex` in `LeagueBuilderMlbDraftSession`; it has no auction `state` or
`teams[].roster[]` shape.

The contract says to STOP if that existing farm commit path cannot accept snake-farm
sessions (`F2`, lines 61-65). Making it accept the snake model would require an edit to
`leagueBuilderAuctionPipeline.ts`, which is outside the owned surface and is part of the
frozen auction pipeline. Synthesizing a fake `AuctionSession` in the page would be a
forked adapter around the exact incompatibility the STOP clause names, so it was not
attempted.

### Farm-budget source check

The money source itself is not the blocker. Existing farm session creation derives one
`farmTierCap` from the real prospect pool and builds each club's farm wallet as
`max(0, farmTierCap - committedFarmSalaries) + mlbBudgetCarryover`
(`src/utils/farmAuctionSession.ts:41-78`; `src/utils/farmAuctionWallet.ts:60-79`). That
is an available per-club budget source for a future amended contract.

### Spec-first tests and Gates 1-5

- Spec-first red tests: **NOT WRITTEN** — the required integration preconditions failed
  before implementation authority existed.
- Gates 1-5: **NOT RUN** — the contract orders an immediate STOP for this exact handoff
  incompatibility. Running the gates on an intentionally unimplemented lane would not
  be completion evidence.

### Required captain ruling / amendment

S6 can resume only after the captain amends the hard file surface and chooses the
canonical seams for both:

1. post-scout routing into a farm-mode `LeagueBuilderMlbDraftSession`; and
2. farm roster/player commit from that session, either by authorizing an additive snake
   input in `leagueBuilderAuctionPipeline.ts` or by naming another existing compatible
   commit seam.

No other S6 work was started because both seams are mandatory to the contract's
entry/exit round-trip test.

---

## AMENDMENT 1 (captain ruling on the STOP, 2026-07-10) — the two seam grants

Both preconditions upheld. Ownership grants (additive-only, auction suites remain the
guardrail):
1. ROUTING: S6 may edit src/src_figma/app/utils/draftRouting.ts — add a snake branch
   keyed on the league's draft format so the post-scout continuation routes snake-format
   leagues into the farm-mode snake session (/snake-room with the farm session), while
   auction-format leagues keep the EXISTING farm-auction route byte-unchanged. A
   minimal ScoutHire.tsx touch is allowed ONLY if the helper's signature genuinely
   cannot carry the branch (prefer helper-only).
2. FARM COMMIT: S6 may add ONE new additive export to
   src/utils/leagueBuilderAuctionPipeline.ts —
   `commitCompletedSnakeFarmSessionToLeagueRosters` — mirroring the existing
   `commitCompletedSnakeSessionToLeagueRosters` (:385) pattern but writing the
   `farmRoster` field and converting via the existing `farmProspectToPlayer` (:320)
   with each pick's FROZEN slot salary as the salary input. NO edits to any existing
   function in that file; the existing farm-auction commit stays byte-identical.
3. Farm budget source ratified per your own check: farmTierCap derivation +
   `max(0, farmTierCap − committedFarmSalaries) + mlbBudgetCarryover`
   (farmAuctionSession.ts:41-78, farmAuctionWallet.ts:60-79) is the per-club farm
   budget input to buildFarmSlotTable.
Resume from the STOP seam; the entry/exit round-trip test now runs through these two
granted seams. Everything else binds unchanged.

---

## FINAL BUILDER REPORT — Codex S6 (2026-07-10) — COMPLETE

### Outcome

S6 is implemented on `codex/snake-s6-farm` under Amendment 1. No git write command was
run. The three pre-existing untracked captain helpers (`DISPATCH_PROMPT.txt`,
`run_lane.sh`, `sentinel.sh`) remain untouched.

The post-scout route now sends only snake-format leagues to
`/snake-room?leagueId=…&phase=farm`; auction-format leagues retain the exact existing
farm-auction route. The farm room reuses the S2 five-state ritual, privacy cover, sounds,
commissioner controls, guide, and pick-ownership model. It stores a separate additive
farm-mode session record in the existing `mlbDraftSessions` store, preserving the
completed MLB session for franchise initialization (no DB bump).

The farm room renders only the active club's own scout grade, range, confidence, and
SCOUT'S CALL. Its board is ordered by those scout-visible grades. Named SCOUT PRESSURE
combines only that club's scout snapshot with public roster counts and runs through the
existing actionable/expiring Advisor LOG model. No true ratings, true grade, IV,
TRUE COST, fit-from-true-ratings, or survival/rational-room read renders in farm mode.

The new slot engine creates one frozen geometric salary chart at farm-session creation:
first slot = exactly 3x the last slot, rounded salaries sum to 75% of league farm budgets,
and every salary remains attached to its absolute pick after trades. The farm guide uses
that chart as posted prices. Its execution gate rechecks equal pick counts, live ownership,
remaining unique prospect supply, and exact remaining-slot salaries against each club's
farm budget. The final recorded pick keeps its payoff frame; explicit ADVANCE commits the
prospects to `farmRoster` with their frozen slot salaries and hidden reveal state, then
routes to staff hire.

### Files changed

- `src/engines/snakeFarmSlots.ts` (new)
- `src/engines/__tests__/snakeFarmSlots.test.ts` (new)
- `src/src_figma/app/components/snake/farm/FarmPrivateDesk.tsx` (new)
- `src/src_figma/app/components/snake/farm/farmRoomModel.ts` (new)
- `src/src_figma/app/components/snake/farm/__tests__/FarmPrivateDesk.test.tsx` (new)
- `src/src_figma/app/pages/SnakeDraftRoom.tsx`
- `src/src_figma/app/components/snake/SnakeDraftRoomView.tsx`
- `src/src_figma/app/components/snake/__tests__/SnakeDraftRoomView.test.tsx`
- `src/src_figma/__tests__/pages/SnakeDraftRoom.farm.test.tsx` (new)
- `src/src_figma/app/utils/draftRouting.ts` (Amendment 1 grant)
- `src/src_figma/__tests__/leagueBuilder/draftRouting.test.ts`
- `src/src_figma/__tests__/leagueBuilder/LeagueBuilderLeagues.test.tsx`
- `src/utils/leagueBuilderStorage.ts` (two additive optional session fields only)
- `src/utils/leagueBuilderAuctionPipeline.ts` (one additive export only; existing farm-auction commit unchanged)
- `src/utils/tests/draftPipeline.integration.test.ts`
- `spec-docs/contracts/CONTRACT_S6_FARM_ROOM_2026-07-10.md` (this report)

### Spec-first / falsification evidence

The first S6 run was intentionally red: the new engine import did not exist and the two
snake-farm route assertions still received the auction route. After implementation, the
focused S6 proof passed:

```
Test Files  4 passed (4)
Tests       9 passed | 16 skipped (25)
Duration    2.68s
```

Covered: 3x/75% slot calibration, absolute-pick freeze, affordable/over-budget trades,
separate farm-session creation, frozen trade execution, own-scout variance, the fog
render tripwire, real post-scout farm-session creation, and real farm-roster commit.

The NFL caught two implementation hazards before the final gates:

1. An assertion was initially inserted into the existing auction commit by matching the
   wrong nearby line. Gate 1 rejected it; the assertion moved into the new snake-farm
   export and the existing auction function returned to byte-identical content.
2. Replacing the season-1 MLB snake record would have made downstream franchise code read
   farm picks as MLB picks. The farm session now uses a separate record key in the same
   existing store; a test pins that its ID differs and the MLB record remains intact.

### Gates 1–5 — real output

**Gate 1 — TypeScript**

Command: `npx tsc -b --pretty false`

```
exit_code: 0
diagnostics: none
```

**Gate 2 — production build**

Command: `npm run build`

```
✓ 2678 modules transformed.
✓ built in 10.05s
PWA v1.2.0 — 199 precache entries
exit_code: 0
```

Only the repo's existing dynamic-import and large-chunk warnings appeared.

**Gate 3 — owned + S2/S3/S4 snake suites**

Complete snake engine/room/desk/trade/farm/page set:

```
Test Files  20 passed (20)
Tests       97 passed (97)
Duration    4.94s
```

The real draft pipeline suite also passed all 17 tests, including the new S6 farm commit,
the six-draft D1 snake gauntlet, reset guards, scout/staff persistence, and franchise
launch coverage.

**Gate 4 — auction preservation suites**

All test files whose filename contains auction/Auction (including MLB auction UI, farm
auction UI/hook/pool/session/wallet, AuctionStage, state machine, tax, market, reserve,
completion, sim, and both gauntlets):

```
Test Files  34 passed (34)
Tests       371 passed (371)
Duration    63.63s
exit_code: 0
```

**Gate 5 — one full Vitest**

Command: `NODE_ENV= npm test -- --run`

```
Test Files  2 failed | 638 passed | 8 skipped (648)
Tests       2 failed | 9642 passed | 15 skipped (9659)
Duration    230.16s
```

The two reds were unrelated batch-pressure flakes, not deterministic regressions:

- `LeagueBuilderDraftSetup.poolLock.test.tsx` — `manual exclusion does not beat a
  roster-design pin during regeneration` timed out at 15s; exact solo rerun passed
  `1/1` in 2.244s (file `1 passed`, exit 0).
- `franchiseOffseasonGuards.component.test.tsx` — RatingsAdjustmentFlow remained on its
  async loading frame in the full batch; exact solo rerun passed `1/1` in 125ms (file
  `1 passed`, exit 0). This is the previously observed async-loading batch flake family.

Verdict: zero deterministic new reds. Gates 1–5 pass under the contract's characterized
solo-verification rule.

### Scope / remaining acceptance

- No auction flow, auction engine, flag, App route, companion surface, reducer ritual
  state, DB version, or existing auction commit function was changed.
- No browser pass was required by this lane contract and none was claimed. JK's later
  full-program browser walk remains the acceptance gate.
- S6 is ready for independent audit under the builder/auditor triangle.

---

## AUDIT — opus, independent, 2026-07-10 — VERDICT: APPROVE
Fog CLEAN (true data never leaves buildFarmFogCard; board sorts by SCOUTED grade;
candidate contract structurally has no true-rating field; rival scout snapshots
unreachable) · slot math EXACT (re-derived independently on three fixtures: sum =
75% post-rounding to the $1000 unit, first = 3× last, monotonic; throws rather than
lie) · trade gate exact arithmetic, at-budget passes/over refuses, MLB seating proof
never consulted in farm mode · both granted seams within grant (routing literal
byte-identical for auction leagues; ONE additive pipeline export, existing functions
byte-unchanged; committed prospects land ratingRevealState 'hidden' via the real
path) · session separation safe (::2 key; franchise init reads season-1 explicitly) ·
reducer untouched (single additive optional onDraftComplete prop) · partition exact ·
copy clean.
MERGE NOTES: leagueBuilderStorage.ts co-touched by S5 (different additive fields —
reconcile trivially); captain runs a build post-merge; S5 approval-card mount is the
captain stitch.
