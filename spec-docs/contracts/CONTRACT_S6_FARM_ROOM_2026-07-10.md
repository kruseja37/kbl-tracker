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
