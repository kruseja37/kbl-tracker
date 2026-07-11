# CONTRACT S2 — THE ROOM (shared main screen + the ritual)
Captain: Fable · Builder: Codex gpt-5.6-sol high · Date: 2026-07-10
Branch: codex/snake-s2-room · Base: main @ 0529888e (S1a foundations merged)

## AUTHORITY (read in this order)
1. spec-docs/SNAKE_DRAFT_VISION_2026-07-10.md — design of record: THE ROOM, THE RITUAL,
   privacy four-place model, sounds, colors (J1-J3).
2. spec-docs/SNAKE_DRAFT_V1_PROGRAM_2026-07-10.md — S2 lane + appendix rulings 1-8, 18
   (on-clock entry in REVIEW; correction = most recent completed action; resume = REVIEW
   never ARM; trade-while-armed cancels ARM; practice mode parity).
3. spec-docs/contracts/CONTRACT_S1A_FOUNDATIONS_ENGINE_2026-07-10.md — engines + audit.
4. spec-docs/DRAFT_SKIN_STANDARD_2026-07-08.md — ballpark-kit.css tokens, retro voice.

## LAWS (REJECT criteria)
- THE SHARED MAIN IS PUBLIC, ALWAYS — and it NEVER editorializes: neutral ticker, no
  steal language, no "took your #2", no private data uninvited. Fail-closed: when in
  doubt a surface renders covered.
- COPY LAW: 14-year-old readable, plain retro voice. NO percentages anywhere.
- NO CLOCK, NO TIMERS, NO AUTO-PICKS. Commissioner PAUSE/RESUME exists.
- AUCTION FROZEN: never edit AuctionStage or any auction file. The reveal pattern is
  COPIED into a new hook (S0 manifest item 7), never imported from auction files.
- ENGINES ARE DONE: consume src/engines/snake* as-is; engine gaps = STOP and report.

## PARALLEL-LANE FILE PARTITION (hard boundary — violations = REJECT)
Lane S1b runs concurrently. YOUR files:
- NEW: src/src_figma/app/pages/SnakeDraftRoom.tsx · src/src_figma/app/components/snake/
  (NEW dir — all room components) · src/src_figma/app/hooks/useSeatReveal.ts (NEW —
  extracted copy of the AuctionStage reveal law: cover-before-paint useLayoutEffect +
  fail-closed render) · a small sound util (new file, e.g.
  src/src_figma/utils/snakeSounds.ts) · tests for all of it.
- FORBIDDEN: src/App.tsx (S1b owns routing — your page exports default and the route
  lands at merge) · franchisePhase2Flags.ts (S1b adds the flag; read it, don't edit
  it — if the flag doesn't exist in this tree yet, code against
  `isSnakeDraftV1Enabled?.() ?? false` via a local safe wrapper in your own file) ·
  src/src_figma/app/components/snakesetup/ (S1b's dir) · SnakeDraftSetup files ·
  leagueBuilderStorage.ts · any src/engines/* edit.

## SCOPE — the shared room screen
THE PUBLIC FRAME: order strip (snake order, current pick highlighted, endpoint
back-to-backs marked) · neutral ticker (last picks, plain words) · the club lens: tap
any club name → its public page (real-time roster, owned/tradeable picks) · team colors
alive everywhere (primary/secondary/accent from Team.colors; logo rendered from
Team.logoUrl when present, graceful without).

THE RITUAL (the centerpiece — five states, never blurred):
- REVIEW: on-clock club reads a candidate. Consequence line from the two-bills engine
  (words, not dashboards). An illegal pick can never be armed — the block reason shows
  here in plain words with the engine's facts.
- COVER & ARM: the shared main flips to a face-down 8-bit draft card — "THE KODIAKS
  SELECT…" in team colors. Private confirmation stays on the picking side.
- ANNOUNCE: HOLD the gavel (~1s fill meter, "KEEP HOLDING"); release early → snap back
  ("NOT PICKED — HOLD CANCELED"). Hold home → flip.
- RECORDED: card flips, thock, ticker line written, controls lock.
- CORRECTION: commissioner may undo the MOST RECENT COMPLETED ACTION until the next one
  lands (consume the S1a correction snapshot engine — byte-identical restore is already
  proven; you render the flow).
State machine implemented as a pure reducer in your components dir with its own tests
(states, transitions, resume = REVIEW never ARM per appendix; pause blocks ARM/ANNOUNCE).

PRIVACY ON MAIN: reveal-on-main (tap your seat → your privates render; AUTO-COVER on
pick/trade/lens-switch/seat-change — the useSeatReveal hook) · hotseat "PASS TO [GM]"
cover between declared hotseat turns. Companions are S5 — build the seams (props/state
shape), not the sync.

SOUNDS (exactly five, toggleable, retro 8-bit, generated via WebAudio — no binary
assets): nav click · gavel-thock · your-turn cue · private snipe sting · danger chirp.
Nothing else beeps.

COMMISSIONER: pause/resume (persisted via session `paused`) · correction · (trade
approval seat arrives in S4 — leave a labeled seam).

Session I/O: load/persist via the S1a session model (mlbDraftSessions store helpers) —
per-pick persistence, resume lands in REVIEW.

## TESTS
Reducer: full transition table incl. release-cancel, resume→REVIEW, pause gating,
correction window one-action law. Components: neutral-ticker law (no private strings on
main), auto-cover triggers, block-reason renders engine facts, colors render from team
identity, sounds fire on the right transitions (mock AudioContext), copy-law strings.

## GATES (paste real output)
1. `npx tsc --noEmit` clean. 2. `npm run build` exit 0. 3. Owned suites green.
4. Auction suites green (28 files). 5. ONE full `npx vitest run` (known solo-flakes
apply — verify solo if red).

## PROTOCOL
No git write commands (captain cuts commits). UNKNOWN/surprise = STOP and report.
Builder report appended to this file: what was built (file:line), REAL gate outputs,
STOPs, what the auditor should attack first.

---

## BUILDER REPORT — Codex S2 (2026-07-10)

### Outcome

Built the S2 shared snake-draft room in the contract-owned partition. The tree is
intentionally dirty for the captain. No git write command was run. `src/App.tsx`,
`franchisePhase2Flags.ts`, `snakesetup/`, SnakeDraftSetup, leagueBuilderStorage,
`src/engines/*`, and every auction file remain untouched.

Tests were written before implementation. The required red proof failed all four owned
suites at module resolution because `snakeRoomReducer`, `useSeatReveal`, `snakeSounds`,
and `SnakeDraftRoomView` did not yet exist.

### What was built

- Route-ready page and S1a session I/O in `src/src_figma/app/pages/SnakeDraftRoom.tsx:18-238`:
  local fail-closed optional V1-flag wrapper, query-selected league/session load, public
  roster and owned-pick projection, saved-board candidate seam, version retirement,
  LEGAL-FINISH CUSHION/blocking via `evaluateSnakeLegalFinish`, settlement marginal tax,
  per-pick persistence through `applySnakePickWithCorrection`, persisted pause/resume,
  and byte-restore correction through `restoreLatestSnakeCorrection`. It default-exports
  for S1b's later route landing without editing `App.tsx`.
- Public frame and ritual in
  `src/src_figma/app/components/snake/SnakeDraftRoomView.tsx:8-323`: identity-colored
  order strip with endpoint back-to-backs, neutral public ticker, public club lens,
  logo/team-color face-down card, private revealed REVIEW, cover-and-arm, one-second
  gavel hold, early-release cancel, persistence-confirmed RECORDED state, commissioner
  pause/resume/correction, S4 trade-approval seam, practice-mode seam, and hotseat
  PASS-TO cover. The shared stage never renders the private board candidate in REVIEW;
  it stays neutral until the seat explicitly reveals.
- Pure state machine in
  `src/src_figma/app/components/snake/snakeRoomReducer.ts:1-87`: five distinct phases,
  illegal-arm rejection with engine facts, pause gating, resume-to-REVIEW, live-pick
  trade ARM cancellation, early-release snap-back, persistence-failure retry, and the
  one-action correction window.
- AuctionStage-derived fail-closed privacy hook in
  `src/src_figma/app/hooks/useSeatReveal.ts:1-32`: `useLayoutEffect` cover-before-paint
  plus render-time seat identity guard; auto-cover keys cover pick, trade, lens, and
  seat changes.
- Exactly five toggleable WebAudio sounds in
  `src/src_figma/utils/snakeSounds.ts:1-46`: nav, gavel-thock, turn cue, private-snipe,
  and danger. No binary assets and no other beep surface.
- Spec-first owned tests:
  `snakeRoomReducer.test.ts` (7), `SnakeDraftRoomView.test.tsx` (6),
  `useSeatReveal.test.tsx` (1), and `snakeSounds.test.ts` (2). They cover the transition
  table, release cancel, pause/resume, correction law, save failure, public/private copy,
  auto-cover, engine-fact blocking, identity colors/logo, full-hold recording, and
  WebAudio behavior.

### Gate outputs (real terminal text, final code)

Gate 1 — `npx tsc --noEmit`:

```text
GATE1_FINAL_EXIT=0
(no compiler output)
```

Gate 2 — `npm run build` (existing warnings retained):

```text
> kbl-tracker@0.0.0 build
> tsc -b && vite build

vite v7.3.1 building client environment for production...
✓ 2650 modules transformed.
rendering chunks...
(!) franchisePlayerStorage.ts is dynamically imported and also statically imported; dynamic import will not move module into another chunk.
(!) Some chunks are larger than 500 kB after minification.
✓ built in 12.84s

PWA v1.2.0
mode      generateSW
precache  189 entries (5404.00 KiB)
files generated
  dist/sw.js
  dist/workbox-1d305bb8.js
(exit 0)
```

Gate 3 — owned suites:

```text
 RUN  v4.0.18 /private/tmp/kbl-s2

 ✓ src/src_figma/utils/__tests__/snakeSounds.test.ts (2 tests) 4ms
 ✓ src/src_figma/app/components/snake/__tests__/snakeRoomReducer.test.ts (7 tests) 4ms
 ✓ src/src_figma/app/hooks/__tests__/useSeatReveal.test.tsx (1 test) 15ms
 ✓ src/src_figma/app/components/snake/__tests__/SnakeDraftRoomView.test.tsx (6 tests) 424ms

 Test Files  4 passed (4)
      Tests  16 passed (16)
   Start at  18:27:58
   Duration  1.45s (transform 196ms, setup 245ms, import 423ms, tests 446ms, environment 2.29s)
```

Gate 4 — exact frozen auction list from `/tmp/s1a-auction-tests-final.txt`:

```text
 Test Files  28 passed (28)
      Tests  327 passed (327)
   Start at  18:28:12
   Duration  48.63s (transform 7.05s, setup 1.55s, import 13.61s, tests 79.87s, environment 13.56s)
(exit 0)
```

Gate 5 — final single `npx vitest run`:

```text
 FAIL  src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.poolLock.test.tsx > LeagueBuilderDraftSetup > manual exclusion does not beat a roster-design pin during regeneration
Error: Test timed out in 15000ms.
 ❯ src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.poolLock.test.tsx:676:3

 Test Files  1 failed | 628 passed | 8 skipped (637)
      Tests  1 failed | 9585 passed | 15 skipped (9601)
   Start at  18:29:06
   Duration  257.35s (transform 39.64s, setup 41.91s, import 162.94s, tests 1106.18s, environment 366.80s)
```

This is the contract's named `LeagueBuilderDraftSetup` batch-flake family. Exact solo
verification passed:

```text
 RUN  v4.0.18 /private/tmp/kbl-s2

 ✓ src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.poolLock.test.tsx (21 tests | 20 skipped) 2211ms
     ✓ manual exclusion does not beat a roster-design pin during regeneration  2210ms

 Test Files  1 passed (1)
      Tests  1 passed | 20 skipped (21)
   Start at  18:33:38
   Duration  4.34s (transform 1.30s, setup 44ms, import 1.69s, tests 2.21s, environment 294ms)
```

### STOPs / surprises

- No unresolved UNKNOWN remains and no scope-expansion STOP remains.
- The first Gate 2 attempt found two project-build-only type errors that bare Gate 1 did
  not report (wrong `toRosterSlotPlayer` import and one nullable session access). Both
  were fixed inside the owned page and the gate sequence restarted from Gate 1.
- An earlier full-suite characterization under heavier batch load timed out four cases:
  two `LeagueBuilderDraftSetup` cases plus `poolFromDemand` and `RosterDesigner`. All four
  exact tests passed solo (3.64s, 9.19s, 16.80s, and 8.23s respectively). A subsequent
  unchanged full run passed all 629 runnable files / 9,585 tests. The final required run
  then hit only the named Draft Setup timeout above, which again passed solo.
- Final self-review caught and fixed two fail-open risks before handoff: private candidate
  details initially rendered on the shared REVIEW stage, and RECORDED initially preceded
  persistence confirmation. The final build keeps candidate facts behind explicit seat
  reveal and waits for the save promise before flip/thock/RECORDED.
- Pre-existing untracked captain artifacts `DISPATCH_PROMPT.txt`, `run_lane.sh`, and
  `sentinel.sh` were not modified.

### Auditor: attack these first

1. Prove no private candidate/board/consequence string reaches the shared stage, ticker,
   order rail, or lens before explicit reveal, including same-seat next-pick, trade, lens,
   and hotseat transitions.
2. Race the one-second gavel completion against pointer release, persistence rejection,
   correction, pause, and a live-pick trade; RECORDED must mean the session save finished.
3. Verify `evaluateSnakeLegalFinish` inputs after several taxed picks and confirm the
   displayed legal-finish cushion and committed marginal tax remain settlement-identical.
4. Exercise correction after a pick with retired versions and after a future S4 trade;
   the page delegates to S1a's byte-restore, but UI phase/reveal state must still reset.
5. Verify S1b's eventual route/flag merge supplies stable historical source identity;
   S2 consumes the session's version state but does not invent the missing source adapter.

---

## AUDIT — opus, independent, 2026-07-10 — VERDICT: REJECT (fix pass required)
Partition clean · useSeatReveal faithful to the AuctionStage law · money engine-sourced,
no percentages · sounds five/WebAudio/toggleable · gates re-run green. TWO BLOCKERS,
one root cause — the pick advances/persists the moment the 1s hold completes, decoupled
from the RECORDED ritual and uncancellable:
- B1 (deterministic, reproduced): RECORDED never reliably shows the drafted player —
  save resolves → session advances → NEXT_TURN effect flips straight to next REVIEW;
  the payoff frame ("SAM SLUGGER" card flip) is skipped. The centerpiece beat is lost.
- B2 (reproduced, named REJECT criterion): PAUSE at 500ms into the hold does NOT cancel
  holdTimer → onRecordPick fires at 1s → the pick PERSISTS during a commissioner pause
  while the room shows PAUSED/REVIEW. Same uncancelled-timer class will hit live-pick
  trades (S4 carry-forward).
NOTES to fix in the same pass: (a) snipe/danger sounds fire on the shared main ungated
by reveal — gate them behind the reveal surface now; (b) the RECORDED card renders
candidate.name with no structural guard (saved only by a timing race today) — make it
structural via the latched recorded pick; (c) reducer NEXT_ACTION/canCorrect path is
orphaned — wire it or drop it (correction law is enforced by the S1a engine).

## FIX PASS ORDERS (captain, binding)
Root-cause fix, one move: LATCH the recorded pick at GAVEL_HOME (player name + team,
local ritual state), hold the RECORDED frame until an explicit ADVANCE action, and only
then let NEXT_TURN re-key; CANCEL holdTimer on PAUSE and LIVE_PICK_MOVED effects; gate
recordPick/GAVEL_HOME on the live un-paused phase (persistence must be impossible while
paused); RECORDED still requires the save promise resolved (keep that law). Add reducer
+ component tests for: pause-mid-hold records NOTHING (storage untouched — assert via
the session save mock), RECORDED shows the latched name until ADVANCE, trade-mid-hold
cancels cleanly, and the snipe/danger reveal gate. Then re-run Gates 1→5 (full vitest
included) and append a FIX PASS report. No scope beyond the audit findings.
