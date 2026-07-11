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

---

## FINAL BUILDER REPORT — Codex S7 (2026-07-10) — COMPLETE AFTER AMENDMENT 1

### Outcome

Amendment 1, G2, G3, and Gates 1-5 are complete. The original G1 repro file was not
changed: its SHA-256 remained
`aed03ac422752a608978d0fd4f56a5abd3d8a364803c6df9e65f0a0256a85ab7` before and after
the fix. It now passes through the real storage pipeline with 256 player-morale rows
(176 MLB + 80 FARM), eight fan-morale rows, 176 MLB draft-baseline rows, 80 hidden FARM
records, and both completed snake session records intact.

The auction flow, auction files, reducer ritual states, storage schema, and feature flags
were not edited. No git write command was run. The pre-existing untracked captain files
`DISPATCH_PROMPT.txt`, `run_lane.sh`, and `sentinel.sh` remain untouched.

Mode 2 roadmap update: **no roadmap update needed**. S7 is tracked by the signed snake
program and this contract; it does not change the separate active Mode 2 slice.

### Files changed

Amendment 1 / G1:

1. `src/utils/draftFreezeInputs.ts`
2. `src/utils/franchiseInitializer.ts`
3. `src/utils/tests/draftFreezeInputs.test.ts`
4. `src/utils/tests/snakeSeasonGauntlet.integration.test.ts` (original untracked repro,
   byte-unchanged during this resume)

G2:

5. `src/src_figma/utils/logoImage.ts`
6. `src/src_figma/utils/__tests__/logoImage.test.ts`
7. `src/src_figma/app/pages/LeagueBuilderTeams.tsx`
8. `src/src_figma/__tests__/leagueBuilder/LeagueBuilderTeams.test.tsx`
9. `src/src_figma/app/components/snake/SnakeDraftRoomView.tsx`
10. `src/src_figma/app/components/snake/__tests__/SnakeDraftRoomView.test.tsx`

G3:

11. `src/src_figma/utils/snakeSounds.ts`
12. `src/src_figma/utils/__tests__/snakeSounds.test.ts`
13. `src/src_figma/app/pages/SnakeDraftSetup.tsx`
14. `src/src_figma/app/pages/SnakeDraftRoom.tsx`
15. `src/src_figma/app/pages/SnakeCompanion.tsx`
16. `src/src_figma/app/components/snake/desk/AdvisorLog.tsx`
17. `src/src_figma/app/components/snake/desk/BoardView.tsx`
18. `src/src_figma/app/components/snake/desk/DeskCandidateCard.tsx`
19. `src/src_figma/app/components/snake/desk/WhatIfSandbox.tsx`
20. `src/src_figma/app/components/snake/farm/FarmPrivateDesk.tsx`
21. `src/src_figma/app/components/snake/trade/SnakeTradeGuide.tsx`
22. `src/src_figma/app/components/snake/trade/SnakeCommissionerTrade.tsx`
23. `src/src_figma/app/components/snake/trade/TradePackageCard.tsx`
24. `src/src_figma/app/components/snake/companion/CompanionClaimScreen.tsx`
25. `src/src_figma/app/components/snake/companion/CompanionApprovalCard.tsx`
26. `src/src_figma/app/components/snake/companion/SnakeCompanionFrame.tsx`

Report:

27. `spec-docs/contracts/CONTRACT_S7_GAUNTLET_2026-07-10.md`

### Amendment 1 implementation

- `buildDraftFreezeInputs` now accepts the ruled optional
  `farmSnakeSession?: LeagueBuilderMlbDraftSession` input.
- Completed FARM snake picks use the frozen salary at
  `farmSlotSalaries[pick.pick - 1]`; the salary follows the absolute pick after a trade,
  never array order or the acquiring club.
- FARM talent IV is computed through the same `priceFarmAuctionProspect` seam used to
  populate auction-farm players. It stays inside freeze metadata and is not exposed to a
  UI or a new storage field.
- FARM pay class mirrors the MLB snake slot-rank-versus-talent-rank threshold.
- The SNAKE initializer branch alone reads session 2 and accepts it only when
  `draftPhase === 'FARM'`. A non-FARM record returned for that key is ignored fail-closed.
- Snake FARM players join salary/morale freeze output but are excluded from MLB
  draft-baseline True Value rows. The AUCTION branch retains its prior input and baseline
  behavior.

### Final G1 assertion inventory

1. Creates and reloads the production-default eight-club snake league, registered pool,
   full setup record, and 22-round/176-pick MLB order.
2. Runs the simultaneous one-per-human seating proof before GO.
3. Includes two Babe Ruth versions, selects the 1927 card, and proves the drafted version
   appears once league-wide while the sibling never reaches a roster.
4. Executes and persists a posted-guide MLB pick trade before pick one.
5. Records and reloads all 176 MLB picks through the real pick mutation/session store.
6. Executes a commissioner correction at pick 48, proves the persisted pick is removed,
   and records it again through the same path.
7. Commits the completed MLB session, then reloads eight legal 22-player rosters and
   proves `salary === settledSalary === RegisteredPool IV` for every drafted player.
8. Persists and reloads one scout per club through the live scout-hire helper.
9. Derives each FARM budget from the farm tier cap plus half that club's stored MLB cap
   headroom.
10. Creates/reloads the separate session-2 FARM snake record and frozen 80-slot salary
    table, then executes/persists a real FARM pick trade.
11. Records all 80 FARM picks and commits them through the real FARM roster path; reloads
    10 per club with frozen slot salary, matching settled salary, and hidden reveal state.
12. Proves staff hire is the next route; persists and reloads a manager and reporter for
    every club.
13. Reloads the MLB pool/session and proves 176 IV-settled MLB freeze inputs include both
    above-slot and below-slot cases before calling the real initializer.
14. Proves franchise/season readiness: legal 22/10 rosters for all eight clubs, empty
    manual schedule policy, all 256 roster players copied, 80 hidden FARM records, and
    176 MLB draft-baseline rows.
15. Proves draft-day morale baselines exist for every one of the 176 MLB and 80 FARM
    picks, with eight team-fan baselines.

### G2 result

- League Builder team create/edit now offers one LOGO file input using the existing
  `Team.logoUrl` field.
- PNG, WebP, and JPEG inputs are decoded, fit inside 128x128 without upscaling, drawn to a
  canvas, and re-encoded as WebP or PNG.
- Encoded output above 32 KiB is rejected before form state or team storage changes with
  exact copy: `THAT PICTURE IS TOO BIG — TRY A SMALLER ONE`.
- A saved logo renders in all three ruled room positions: order strip, club lens, and
  ritual card.

### G3 copy changes

No visible percentage remains on a snake surface. Test-characterized/D11-locked labels
were preserved; plain explanations were added beside them instead of changing fixtures.
Every copy change made in this pass:

1. Version-picker options now render in the room's all-caps chrome.
2. `HAND ADD` now explains that the list contains removed players who can be added back.
3. `DRAFT SEED` now explains that the code reproduces the same shuffle.
4. The locked `R1: 1→8 · R2: 8→1` line now adds `THE ORDER REVERSES EACH ROUND.`
5. `PLAN CUSHION` now explains: `THE MONEY LEFT IF THESE 22 ARE STILL THERE.`
6. `YOUR TAX CORE` now explains that these are the players who count toward the tax.
7. Default `OFF-BOARD` wording became `NOT ON YOUR BOARD`; the MLB fallout line now says
   the displaced target falls to a backup.
8. The WHAT-IF intro became `CHOOSE ONE CHANGE. THE DESK SHOWS THE MONEY. YOU DECIDE.` and
   its plan-cushion line gained the same plain explanation.
9. The guide intro now says it checks the price and whether both clubs can finish; its
   locked pick-N label gained `ENTER THE PICK NUMBER YOU WANT.`
10. Commissioner copy now says the commissioner `MAKES THE TRADE OR SAYS NO` instead of
    `executes or declines`.
11. Companion claim/approval instructions, shared-room review, correction help, and
    hotseat cover help were converted to direct all-caps sentences.
12. Companion `ON PICK` became `CURRENT PICK`; visible order-club names render uppercase.
13. `LEGAL-FINISH CUSHION` became `MONEY LEFT AFTER SAVING ENOUGH TO FINISH YOUR TEAM`,
    including a direct `YOU ARE $X SHORT` form.
14. `RATIONAL BUYER(S)` became `CLUB(S) COULD TAKE HIM BEFORE YOUR TURN`; the zero case is
    `NO CLUB IS LIKELY TO TAKE HIM BEFORE YOUR TURN.` The advisor LOG uses the same copy.
15. Dynamic locked engine messages render with uppercase chrome without changing their
    stored/test-characterized text; desk and FARM player names also render uppercase.

Locked words intentionally retained under D11: `HAND ADD`, `DRAFT SEED`, the R1/R2 line,
`PLAN CUSHION`, `REVERT`, `REVOKE`, and `EXECUTE TRADE`.

### Five-sound inventory

Exactly five sounds remain:

1. `nav` — public club-lens navigation and completed correction.
2. `gavel` — only after the pick save succeeds and the recorded state latches.
3. `turn` — when the active private seat owns the current turn.
4. `snipe` — only on a revealed private seat when its board target is taken.
5. `danger` — only on a revealed private seat when its candidate becomes blocked.

The one `kbl-snake-sounds-enabled` localStorage preference is read by both MLB and FARM
rooms and written whenever the room toggle changes. Default remains ON; blocked browser
storage falls back safely without blocking the room.

### Gates 1-5

1. **TypeScript:** `npx tsc -b --pretty false` — exit 0, no diagnostics.
2. **Build:** `npm run build` — exit 0. Only the existing six-month-old Browserslist data
   warning printed.
3. **G1 + every snake-named suite:** 25 files passed, 108 tests passed. G1 SHA remained
   unchanged.
4. **Every auction-named suite:** 39 files, exit 0. Frozen auction path stayed green.
5. **One full Vitest:** 645 files passed / 8 skipped; 9,659 tests passed / 15 skipped;
   one contract-listed batch-only `LeagueBuilderDraftSetup.money` flake. The exact file
   passed solo, 16/16. No deterministic red remains.

The first post-implementation full run found one genuine S7 regression before the final
gate: an older initializer mock returned the MLB session for the session-2 lookup. The
production reader now accepts that key only when the record explicitly says FARM; the
exact failed file, the adapter test, and unchanged G1 all passed after the fix.

`git diff --check` exits 0.

### Auditor attack list

1. Re-run G1 from the unchanged SHA and independently count 176 MLB + 80 FARM player
   morale rows, eight fan rows, 176 MLB baselines, and 80 hidden FARM records.
2. Mutation-test `pick.pick - 1` against completed-pick array order and acquiring club;
   absolute FARM slot salary must survive both attacks.
3. Return a non-FARM record from the session-2 reader and prove it is ignored; return a
   completed FARM record with missing/invalid IV and prove initialization fails before
   baseline writes.
4. Compare auction initialization inputs/outputs before and after this diff, including
   FARM auction morale and draft-baseline rows.
5. Verify no hidden FARM rating or computed IV is written to a new field, rendered in a
   component, or included in FARM True Value baseline rows.
6. Exercise logo encoding in Safari/iPad and a browser without WebP canvas support; prove
   output is PNG/WebP, no dimension exceeds 128, and decoded data stays below 32 KiB.
7. Save/reload a real team logo and inspect the order strip, club lens, and ritual card;
   confirm the auction UI receives no logo/copy change.
8. Toggle sound OFF, reload both MLB and FARM routes, then toggle ON; ensure no private
   snipe/danger sound fires while covered or merely because the toggle changed.
9. Search every snake-rendered string for `%`, lowercase chrome, and engine/finance words;
   verify D11-locked words were explained rather than reworded.
10. Re-run the full suite under load and confirm any red is either the named solo-green
    family or a newly reported failure, never silently characterized.

**S7 COMPLETE — AMENDMENT 1 + G2 + G3 GREEN; GATES 1-5 SATISFIED.**

---

## AUDIT — opus, independent, 2026-07-11 — VERDICT: APPROVE ("ready for JK's browser walk")
Everything re-derived: G1 SHA byte-match then green from the unchanged repro; slot-key
mutation (array-order swap) goes RED immediately — the absolute-slot invariant is
guarded, not decorative; fail-closed session-2 read is production code (non-FARM
ignored; missing slots/invalid IV throws BEFORE baseline writes); farm talent via the
same priceFarmAuctionProspect seam; no hidden-rating leak (transient in-memory only;
farm excluded from True Value baselines); auction branch behaviorally identical (40
files/500 tests green); G1 un-gameable (every assertion reloads real storage; 256
morale rows independently counted); logo slot exact (pre-write 32KiB reject, three
render paths, no schema change); copy/sounds clean (D11 locks explained-beside; five
sounds; reveal-gated; persisted toggle).
NOTES (non-blocking): toggling sound ON while revealed with a live snipe key can
re-fire one sound; hypothetical snake-MLB+auction-farm config would skip farm baseline
rows (unreachable in the real program — captain glanced, consistent with intent);
report's "8 fan rows" phrasing not hard-pinned by G1 (core proof intact).
