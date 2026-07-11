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
