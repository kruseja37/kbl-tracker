# CONTRACT S7 — IDENTITY, SOUND & THE SEASON PROOF (the closing gauntlet)
Captain: Fable · Builder: Codex gpt-5.6-sol xhigh · Date: 2026-07-10
Branch: codex/snake-s7-gauntlet · Base: main @ post PR #73 + the companion-mount stitch
(merged into this branch — treat SnakeDraftRoomView's COMPANIONS tool as present).

## AUTHORITY
1. spec-docs/SNAKE_DRAFT_VISION_2026-07-10.md — colors+logos (J1-J3), sounds, copy law,
   SEASON HANDOFF section ("IV salaries (farm: slot) → slot-vs-talent morale → farm
   budgets → staff hire → franchise → season — built and proven; this design must not
   touch it" — S7 PROVES it end-to-end for the snake path).
2. spec-docs/SNAKE_DRAFT_V1_PROGRAM_2026-07-10.md — S7 lane + CT4 ANSWERED (Team
   already has colors {primary, secondary, accent?} + logoUrl?; ruling: client-resize
   ≤128×128, re-encode, ~32 KB hard cap, reject over-cap before write).
3. All prior S-lane contracts in spec-docs/contracts/ (the machinery you are proving).

## LAWS
Copy law (14-year-old test) · no percentages · auction frozen · engines done except
where explicitly granted below · the snake reducer's ritual states untouchable ·
NO fixture-bending in the season proof: if the pipeline breaks, the finding is the
deliverable (STOP and report with file:line evidence — do not heal data mid-pipe).

## SCOPE
### G1. THE SEASON PROOF (the reason this lane exists)
A single integration gauntlet test (extend src/utils/tests/draftPipeline.integration.ts
family or a new sibling): drive the REAL storage paths end-to-end for a snake-format
league at production defaults (8 clubs):
setup (pool + versions + snakeSetup record) → complete MLB snake draft (all 176 picks
via the real commit path, including at least one executed pick trade and one
commissioner correction mid-draft) → commitCompletedSnakeSessionToLeagueRosters →
scout hire → farm snake session (frozen slot table) → at least one farm pick trade →
commitCompletedSnakeFarmSessionToLeagueRosters → staff hire arc reachable → franchise
initialization reads the MLB record → ASSERT: every club has a legal 22 with
settledSalary = IV per pick; farm rosters carry frozen slot salaries + hidden reveal
state; draft-day morale inputs present (slot-vs-talent seam); farm budgets derive from
headroom; season can start (the same readiness the existing franchise launch coverage
checks). Every assertion reads through REAL storage, not fixtures. One-per-human:
include a two-version legend in the pool and assert exactly one version ends up
rostered league-wide and the sibling never appears on any roster.

### G2. TEAM IDENTITY — the logo slot (CT4 ruling)
Team editor in League Builder gets the LOGO upload: file input → client-side resize to
≤128×128 → re-encode PNG/WebP → hard-cap ~32 KB (reject over-cap BEFORE write with
plain copy: "THAT PICTURE IS TOO BIG — TRY A SMALLER ONE") → store as data-URI in the
EXISTING Team.logoUrl field (no schema change). Render everywhere the room already
supports it (face-down ritual card, club lens, order strip — those render paths exist
from S2; verify they light up with a real stored logo). Respect any test-characterized
copy (D11 locks): flag, don't reword.

### G3. THE COPY + SOUND SWEEP (A-to-Z, snake surfaces only)
Walk every snake surface (setup, room MLB + farm, desk, guide, companion): every
user-visible string passes the 14-year-old test; ALL-CAPS retro chrome per the skin
standard; no engineer-speak, no percentages. Fix violations in place (snake surfaces
are yours; auction surfaces frozen). Sounds: verify exactly five, correct triggers,
toggle persists across reload (if the toggle doesn't persist, wire it to localStorage —
one small util edit allowed). List every copy change in the report.

## FILE SURFACE
- G1: the integration test file(s) + any test-utils helpers (test-side only).
- G2: the League Builder team editor page/component (locate it; smallest diff) + a
  small pure resize util (new file src/src_figma/utils/logoImage.ts) + tests.
- G3: snake-surface component copy edits + snakeSounds toggle persistence.
- FORBIDDEN: engines (except reading) · auction files · reducer states · storage
  schema (logoUrl exists) · flags. If G1 exposes a REAL pipeline defect requiring an
  engine/storage fix → STOP and report; the captain decides the fix lane.

## GATES (real output)
1. tsc clean. 2. build exit 0. 3. The G1 gauntlet green + all snake suites green.
4. Auction suites green. 5. ONE full vitest (known solo-flakes: LeagueBuilderDraftSetup
family, franchiseManualSmokeFixture, franchiseOffseasonGuards async family — verify
solo if red).

## PROTOCOL
No git write commands. Spec-first: write the G1 gauntlet FIRST and run it against the
current code — if it is red for a REAL reason, that finding is gold: report it before
fixing anything. UNKNOWN = STOP. Builder report appended here with the full G1
assertion inventory, every copy change, and the auditor attack list.

---

## BUILDER REPORT — Codex S7 (2026-07-10) — STOPPED ON REAL G1 PIPELINE DEFECT

### Outcome

G1 was written first and run against the current production code. It is RED for a real
snake-farm season-handoff defect. Per the contract, work stopped immediately after the
finding was reproduced cleanly. No G2 logo work, G3 copy/sound work, engine fix, storage
fix, fixture heal, or Gates 1-5 were attempted. No git write command was run. Auction
files and the reducer's ritual states remain untouched.

The only S7 changes are this report and the new test-side gauntlet:

1. `src/utils/tests/snakeSeasonGauntlet.integration.test.ts`
2. `spec-docs/contracts/CONTRACT_S7_GAUNTLET_2026-07-10.md`

Pre-existing untracked captain artifacts remain untouched: `DISPATCH_PROMPT.txt`,
`run_lane.sh`, and `sentinel.sh`.

### G1 assertion inventory

The single test drives real storage and production helpers from setup through franchise
initialization for the production-default eight-club room:

1. Creates and reloads an 8-club snake-format league, 22-round/176-pick MLB order,
   registered pool, and full persisted `snakeSetup` record.
2. Includes two Babe Ruth cards sharing `lahman:ruthba01`; the setup selects the 1927
   card, the real pick mutation retires the 1918 sibling, and real stored MLB rosters
   contain exactly the selected version once league-wide.
3. Runs the simultaneous seating proof over one-per-human supply before GO.
4. Executes and persists a real posted-guide MLB pick trade through
   `executeSnakeGuidePackage` before the first pick.
5. Records all 176 MLB picks through `applySnakePickWithCorrection`, saving/reloading
   every pick through `mlbDraftSessions`.
6. Executes a commissioner correction at pick 48 through
   `restoreLatestSnakeCorrection`, proves the persisted pick is removed, then records it
   again through the same commit path.
7. Commits through `commitCompletedSnakeSessionToLeagueRosters`; reloads every club and
   asserts a canonical legal 22 plus `salary === settledSalary === RegisteredPool IV`
   for every drafted MLB player.
8. Persists one real scout per club through the live scout-hire helper.
9. Derives per-club farm budgets from the production formula: farm tier cap plus 50% of
   each club's stored MLB salary-cap headroom.
10. Creates and reloads the separate farm snake session with the frozen 80-slot salary
    table, executes and persists a real farm guide trade, then records all 80 farm picks
    through the same real pick mutation/storage path.
11. Commits through `commitCompletedSnakeFarmSessionToLeagueRosters`; reloads all farm
    rosters and players and asserts 10 per club, frozen absolute-slot salary, settled
    salary, and `ratingRevealState: 'hidden'`.
12. Proves the staff-hire route is the next continuation, then persists a manager and
    reporter for every club through the live staffing helper and reloads each record.
13. Reloads the MLB record and registered pool, proves 176 IV-settled draft-freeze inputs
    exist with both above-slot and below-slot morale cases, then calls the real
    `initializeFranchise` path.
14. Proves franchise launch/season readiness succeeded: roster validation passed for
    eight legal 22/10 clubs; empty-manual season schedule policy exists; all 256 committed
    roster players copied; 80 hidden farm records copied; all 176 MLB draft-baseline True
    Value rows and all 176 MLB player-morale baselines exist.
15. Final make-or-break assertion requires the 80 farm snake picks to have draft-day
    morale baselines too. Actual: zero of 80; total player morale rows are 176 instead of
    256.

Every post-step assertion reloads through the real storage helpers. The test does not
patch a roster, salary, scout, farm player, or morale row after either commit.

### Real RED output

Command:

```text
NODE_ENV= npx vitest run src/utils/tests/snakeSeasonGauntlet.integration.test.ts --reporter=verbose
```

Output:

```text
RUN  v4.0.18 /private/tmp/kbl-s7

× src/utils/tests/snakeSeasonGauntlet.integration.test.ts > S7 snake draft to season closing gauntlet > drives an 8-club snake setup, both drafts, staffing, franchise initialization, and season readiness through real storage 945ms
  → franchise initialization must seed draft-day morale for 176 MLB and 80 farm snake picks: expected 176 to be 256 // Object.is equality

FAIL  src/utils/tests/snakeSeasonGauntlet.integration.test.ts > S7 snake draft to season closing gauntlet > drives an 8-club snake setup, both drafts, staffing, franchise initialization, and season readiness through real storage
AssertionError: franchise initialization must seed draft-day morale for 176 MLB and 80 farm snake picks: expected 176 to be 256 // Object.is equality

- Expected
+ Received

- 256
+ 176

❯ src/utils/tests/snakeSeasonGauntlet.integration.test.ts:648:7

Test Files  1 failed (1)
Tests       1 failed (1)
Duration    2.84s
exit 1
```

### Root-cause evidence — production pipeline defect

The separately stored completed farm snake session is never read by franchise
initialization:

- `src/utils/franchiseInitializer.ts:783-810` reads the MLB completion, then reads only
  `getAuctionSessionById(createFarmAuctionSessionId(...))`. In the snake branch it passes
  the MLB snake record plus `farmSession?.session`, which is the auction shape or null.
  It never reads `getMlbDraftSession(leagueId, FARM_SNAKE_SESSION_NUMBER)`.
- `src/utils/draftFreezeInputs.ts:27-58` accepts `mlbSnakeSession` but has no
  `farmSnakeSession` input. FARM morale inputs can be built only from an `AuctionSession`.
- S6 deliberately stores farm snake at season/session number 2 so the season-1 MLB record
  survives. G1 proves both records exist and both roster commits succeed, but only the
  season-1 record reaches `computeDraftFreeze`.

Impact: farm prospects reach franchise storage with the correct hidden state and frozen
slot salaries, but all 80 skip the draft morale calculation and baseline write. The
authority's `farm: slot -> slot-vs-talent morale -> franchise -> season` chain is broken.
This requires engine/util/storage-reader changes outside S7's test-only G1 grant, so the
contract's mandatory STOP applies.

### Gates 1-5

- Gate 1 tsc: NOT RUN — mandatory G1 real-defect STOP came first.
- Gate 2 build: NOT RUN — mandatory G1 real-defect STOP came first.
- Gate 3 G1 + snake suites: G1 RED as recorded above; broader snake suites not run.
- Gate 4 auction suites: NOT RUN; auction untouched.
- Gate 5 full Vitest: NOT RUN.

`git diff --check` exited 0. No production code was changed.

### Copy changes

None. G3 did not start.

### Auditor / captain attack list

1. Decide the fix lane and canonical API: `buildDraftFreezeInputs` likely needs an
   explicit completed farm-snake input, and franchise initialization must read session 2,
   but S7 is not authorized to choose or implement that shape.
2. Preserve the auction branch byte-for-byte while adding the farm-snake read; auction
   farm morale must remain unchanged.
3. Define farm snake slot-vs-talent comparison from the frozen absolute slot table and
   the prospect's talent seam without exposing hidden ratings to UI/storage consumers.
4. Re-run this exact G1 unchanged after the fix. It must produce 256 player morale rows
   (176 MLB + 80 FARM), while retaining 8 fan-morale rows, 176 MLB draft-baseline rows,
   80 hidden farm records, and the separate completed MLB/farm session records.
5. Attack reload, correction, and pick-trade cases so the farm player's absolute slot —
   not the acquiring club or execution order — remains the salary/morale slot input.

**S7 BLOCKED — REAL G1 PIPELINE DEFECT REPORTED; NO FIX ATTEMPTED.**

---

## AMENDMENT 1 (captain ruling on the G1 STOP, 2026-07-10) — the farm-morale seam fix

The STOP is upheld; the finding is exactly what G1 exists to catch. FIX GRANTED in this
lane (repro-first is already in place — the red G1 is the proof). The canonical API:

1. `src/utils/draftFreezeInputs.ts`: add an optional completed farm-snake input
   (`farmSnakeSession?: LeagueBuilderMlbDraftSession`). FARM rows built from its
   completedPicks: the PAY side = the frozen absolute-slot salary
   (session.farmSlotSalaries[absolute pick index] — the slot rides the pick, never the
   acquiring club or execution order); the TALENT side = EXACTLY the same talent seam
   the existing auction-farm morale branch uses (mirror its fields; do not invent a new
   talent source and do not expose hidden ratings to any UI/storage consumer — morale
   computation internals stay engine-internal). Delta semantics mirror the existing
   snake MLB payClassOverride pattern (slot rank vs talent rank).
2. `src/utils/franchiseInitializer.ts`: in the SNAKE branch only, additionally read the
   completed farm snake record (the S6 session-2 key) and pass it through. The AUCTION
   branch stays byte-identical — auction farm morale unchanged (auction suites gate).
3. Then complete the lane as contracted: G1 rerun UNCHANGED must show 256 player-morale
   rows (176 MLB + 80 FARM) with 8 fan-morale rows, 176 MLB draft baselines, 80 hidden
   farm records, and both session records intact; then G2 (logo slot) and G3
   (copy+sound sweep); then Gates 1→5.
FILE SURFACE ADDITION: draftFreezeInputs.ts + franchiseInitializer.ts (+ their test
files), exactly as scoped above. An unexplainable morale-row shift elsewhere = STOP.
