# CONTRACT BOARDFIX1 — design-first extracted-pool wiring + long-distance board reorder (2026-07-08)

You are a builder on the KBL Tracker repo. You are in an isolated git worktree (your cwd) on your
own branch off current main. Deliver LANE BOARD-FIX-1: two JK live-browser findings on the
just-merged Wave 2 board, one of them a critical-path draft blocker. Commit when green; do NOT
push/merge — captain merges after adversarial audit.

SETUP: (1) `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules`; (2) read
spec-docs/contracts/CONTRACT_WAVE2_BOARD_2026-07-08.md (what Wave 2 built, incl. the board
candidate-source choice: `rosterDesignerPlayers` = universePlayers when design-first-unlocked, else
inPoolPlayers) and spec-docs/DRAFT_SKIN_STANDARD_2026-07-08.md (new UI wears the standard); (3)
write this contract to spec-docs/contracts/CONTRACT_BOARDFIX1_2026-07-08.md, include in commit.

JK'S EXACT REPORT (the repro spec): "in design-first, the extracted pool doesn't get pulled into
the team widget where GMs rank players and set up priorities; and maybe because of that, the setup
gets stuck and the 'start draft' button never activates, despite roster priorities being locked."

=== BUG 1 (CRITICAL): design-first extracted pool doesn't reach the club-editor ranking surfaces;
start-draft never activates ===
REPRO-FIRST DISCIPLINE (mandatory): before any fix, write a failing page-level test reproducing
JK's exact flow — design-first mode → design/lock roster priorities → EXTRACT the pool → open the
club editor's board tab (and the roster designer shortlists) → assert the candidates ARE the
extracted pool (this should FAIL today) → assert the start-draft control is enabled (verify whether
this also fails). Then diagnose end-to-end with file:line:
a. The candidate-source predicate in LeagueBuilderDraftSetup.tsx (`rosterDesignerPlayers` ~:1832
   and the board tab's `boardEntries` source): in design-first AFTER extraction, which set flows?
   The correct rule (captain-ruled, consistent with UNIVERSE-FIX1's conventions): every automatic
   ranking/selection surface reads the EFFECTIVE POOL — the extracted pool when one exists, else
   universePlayers. Fix the predicate; cover BOTH pool modes and both pre/post-extraction states
   with tests.
b. THE STUCK START: trace the start-draft enablement predicate (find the actual gating —
   canModeALock / handoff readiness / whatever gates the start control in design-first) and
   establish WHY it stays disabled in JK's flow. Fix the true cause — do NOT just loosen the gate.
   If the cause is independent of bug (a) (e.g. a staleness/validation predicate from the universe
   or F20 basis work misfiring in design-first), report it precisely and fix it with its own test.
   If you cannot make the start control activate in the full repro flow, STOP and report — do not
   ship a partial.
c. Regression guard: pool-first mode end-to-end (extract → rank → start) stays green; the universe
   filter semantics untouched.

=== BUG 2 (UX, captain design ruling): long-distance rank movement ===
JK: "there's no drag-and-drop functionality, so moving a player from 44th overall to top-5 would be
a nightmare."
a. INVESTIGATE DRAG FIRST: the shared RankReorderList (src/src_figma/app/components/shared/
   RankReorderList.tsx) has HTML5 drag handlers. JK reports NO drag at all on the board surfaces.
   Verify in the real render path: is `draggable` actually set on the board tab's rows? Do
   onDragStart/onDragOver/onDrop fire (jsdom tests can assert wiring; also check for CSS/user-select
   or parent handlers swallowing events, and that the drag handlers were passed through on the NEW
   board surfaces, not just the old shortlist)? Fix whatever is broken; add a wiring test on the
   board tab specifically.
b. LONG-DISTANCE MOVES (captain-ruled design, build exactly this): (i) the rank badge on each row
   becomes click-to-edit — click, type a target rank number, Enter commits (player moves to that
   slot, others shift), Escape cancels, blur commits, clamped to [1, N], non-numeric = cancel; (ii)
   a "send to top" quick action per row (compact, hard-edge styling per the skin standard; place it
   with the existing arrows); (iii) drag + arrows stay. Both new affordances live in the SHARED
   RankReorderList so setup and live-floor boards get them identically; the old RosterDesigner
   shortlist surface keeps its current look unless the new affordances inherit harmlessly (5-item
   lists — rank-edit is harmless; include it). Persist through the existing onReorder callback — no
   new storage shape.
c. Accessibility: the rank-edit input gets a sensible aria-label ("Set rank for {name}"); keyboard
   path works (Enter/Escape).
TESTS: rank-edit commit/cancel/clamp/shift semantics; send-to-top; drag wiring on the board tab;
existing RankReorderList + RosterDesigner suites stay green.

ALLOWED SURFACE: LeagueBuilderDraftSetup.tsx, RankReorderList.tsx, RosterDesigner.tsx (only if the
shared-component change requires prop threading), WhisperPanel.tsx ONLY if the live board needs the
same prop threading, tests, your contract. FORBIDDEN: engines, universe filter semantics
(leagueBuilderPoolBuilder), auction state machine, farm page, SOT docs, copy beyond the new
affordances' own labels.

GATES (paste tails): `npx tsc -b --pretty false`; `npm run build`; focused suites:
LeagueBuilderDraftSetup SOLO (documented batch flake — judge solo; includes your new repro tests),
RankYourBoardZone suite, RankReorderList, RosterDesigner, WhisperPanel. NOT the full suite.

Commit: `fix(board): design-first effective-pool wiring + start-draft unblock; rank-badge edit +
send-to-top for long moves [BOARDFIX1]` + trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

REPORT: the repro test's failure output BEFORE the fix (paste it — proof the bug was captured); the
true cause of the stuck start with file:line; the drag investigation verdict (broken where / why,
or working-but-impractical); per-change file:line; gate tails. STOP-and-report if the start-draft
cause can't be established.

---

## AS-BUILT NOTES (what actually happened, decisions made, deviations)

### BUG 1a — the candidate-source predicate (FIXED)

**Root cause, file:line:**
- `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx:1833` (pre-fix): `rosterDesignerPlayers = poolMode === "design-first" && !locked ? universePlayers : inPoolPlayers` — gated on `locked`
  (`poolRecord?.locked`, the SEPARATE later pool-LOCK step), not on extraction. Every automatic
  surface downstream of this value (the board zone's `boardEntries`, `rosterDesignToneByTeamId`,
  the archetype auto-fit target inputs, and the `players` prop threaded into `RosterDesigner`)
  therefore kept showing the pre-extraction universe for the ENTIRE post-extraction/pre-lock review
  window — exactly the window JK's repro sits in.
- `src/src_figma/app/components/leagueBuilder/RosterDesigner.tsx:392` (pre-fix): `sourcePlayers = mode === "design-first" && !lockedPool ? (candidatePlayers ?? allPlayers ?? players) : players` — the
  SAME mistake, duplicated inside `RosterDesigner`. The page ALSO passes `candidatePlayers={universePlayers}`
  unconditionally at `LeagueBuilderDraftSetup.tsx:3976` — by design (its own doc comment: the
  universe-scoped auto-fit feed, pre-extraction only) — but with `lockedPool` as the sole gate, this
  fallback won every render until the pool was ALSO locked, so the shortlist ("THE ASK'S SHORTLIST")
  and its per-slot auto-fit target never reflected the drawn pool either.

**The fix (two sites, minimal footprint):**
1. `LeagueBuilderDraftSetup.tsx:1845-1848` — `rosterDesignerPlayers` now gates on
   `!league?.poolExtractedAt` instead of `!locked`. This is the ONE central fix; every downstream
   consumer (board zone, tone/tone-dot, archetype auto-fit) inherits it automatically since they all
   read `rosterDesignerPlayers`, not the raw booleans.
2. `RosterDesigner.tsx:396-403` — `sourcePlayers` now gates on `!lockedPool && !poolDrawn` (adding
   the ALREADY-THREADED `poolDrawn` prop — `poolDrawn={Boolean(league.poolExtractedAt)}` was already
   being passed at `LeagueBuilderDraftSetup.tsx:3981` for OTHER copy, just never wired into this
   ternary). No new prop needed. `candidatePlayers` itself is untouched — it keeps its original
   pre-extraction-universe meaning; the ternary now correctly stops falling back to it once the pool
   is drawn.

**Repro-first evidence (failure BEFORE the fix, captured then reverted-to-green after):**

Component-level (`src/src_figma/__tests__/components/RosterDesigner.test.tsx`, new test
"BOARDFIX1: once the pool is drawn..."):
```
AssertionError: expected true to be false // Object.is equality
- Expected: false
+ Received: true
❯ src/src_figma/__tests__/components/RosterDesigner.test.tsx:663:75
    661|     clickSlot("CP · CLOSER");
    662|
    663|     expect(shortlistLines().some((line) => line.includes("Kay Frequin"…
```
(A universe-only closer, never drawn into the extracted pool, still appeared in the shortlist even
with `poolDrawn` true — proving the defect in isolation.)

Page-level (`src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.test.tsx`, new test "BOARDFIX1
repro: design-first — the extracted pool must reach..."):
```
AssertionError: expected true to be false // Object.is equality
❯ src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.test.tsx:3088:81
    3086|     fireEvent.click(designButtons[0]);
    3087|     clickSlot("SS");
    3088|     expect(shortlistLines().some((line) => line.includes("Leftover Uni…
```
(Same defect reproduced through the real club-editor render path — design-first, post-extraction,
pre-pool-lock — driving JK's exact click sequence: open the design tab's shortlist, then the board
tab. Both surfaces leaked the pre-extraction universe player.)

Both tests pass after the two-site fix; verified via targeted re-runs before the full-suite gate.

### BUG 1b — THE STUCK START (investigated; no independent defect found)

Traced the enablement chain: `startReady` (`LeagueBuilderDraftSetup.tsx:2200-2204`) requires, for
design-first, `poolReady && identitiesReady && allHumanDesignsLocked && !poolTrailing`.
`poolReady = locked && sufficiency.meetsFloor` (`locked` = the pool-record LOCK flag, a step
distinct from extraction). `poolTrailing = designsStale || basisStale || modeAFinalizedDisplayMismatch`
(`:2031`) — none of these three read `rosterDesignerPlayers`/`universePlayers`/`candidatePlayers`, so
bug (a) cannot itself gate `startReady`.

Built a SECOND, self-contained repro test ("BOARDFIX1: once the pool is ALSO locked...") using the
exact same fixture shape as the pre-existing, already-green
"enables design-first draft start when all locked designs predate the extracted pool" test: design
locked before extraction, pool ALSO locked (the one remaining required step) — **start-draft
activates correctly, first try, no extra fix needed.** This isolates bug (a) from the start-draft
gate: **there is no independent stuck-start defect once the real workflow (lock design → extract →
LOCK POOL) completes.**

Diagnosis note on a fixture trap that looked like a second bug and wasn't: an early combined-phase
version of this test added an extra "leftover universe" player to `players` for the SAME render
where `pool.locked` flipped true, without re-running extraction. That trips
`modeAFinalizedDisplayMismatch` (`:2019-2023`) — a real, correct guard: it detects that a live
recompute of the extraction (`buildModeAResult`, driven by the current universe) would now produce
a DIFFERENT pool than the one displayed, and correctly blocks start until you re-extract. That guard
firing is proof the app is working as designed, not a bug — it's exactly what SHOULD happen if the
universe changes after an extraction and before a re-extract. Splitting into two independent,
narrowly-scoped tests (this file's actual final shape) avoids that artifact entirely.

**Plain-language read of what JK likely experienced:** because of bug (a), the widget kept showing
the pre-extraction universe through the whole review window. That is very plausibly why the setup
"felt stuck" — the display never visibly changed after EXTRACT POOL, so it looked like nothing had
happened. The actual remaining step (a separate "LOCK POOL" button, which freezes prices) was
always clickable once designs were locked and the pool met its size floor; nothing else was
blocking it. Fixing bug (a) removes the misleading signal; the real workflow was never blocked by
an independent defect.

### BUG 2a — drag investigation verdict: WORKING, not broken

Read `RankReorderList.tsx`'s row markup end-to-end: the drag handle button sets `draggable` and
wires `onDragStart`/`onDragEnd`; the row `<div>` wires `onDragOver`/`onDrop`. Traced BOTH board
surfaces' actual JSX (not just the shared component in isolation):
- Setup zone (`RankYourBoardZone` in `LeagueBuilderDraftSetup.tsx:1109-1170`, GLOBAL + PER-POSITION):
  `readOnly={disabled}` — interactive whenever the setup itself isn't blocked. Props passed through
  correctly.
- Live board (`WhisperPanel.tsx`, GLOBAL `:411-441` + `MlbBoardPositionView` `:922-955`):
  `readOnly={!meta.onBoardReorderGlobal}` / `readOnly={!onReorderPosition}` — and
  `LeagueBuilderAuctionDraft.tsx:1409-1410` DOES thread `onBoardReorderGlobal`/`onBoardReorderPosition`
  into `WhisperPanel`, so the live board is interactive too, not read-only.

Wrote two dedicated wiring tests that simulate a REAL `dragStart`/`dragOver`/`drop` sequence (not
just arrow clicks) on both surfaces:
- `LeagueBuilderDraftSetup.test.tsx` "BOARDFIX1 wiring: RANK YOUR BOARD's global list supports native
  drag-and-drop..." — drags a row, asserts `draggable="true"` on the handle and the resulting
  `saveTeam` call carries the dragged order.
- `WhisperPanel.test.tsx` "BOARDFIX1 wiring: GLOBAL expanded board supports native drag-and-drop end
  to end..." — same drag simulation against the live board's expanded GLOBAL view, asserting
  `onBoardReorderGlobal` fires with the dragged order.

**Both pass — drag is genuinely wired correctly on both surfaces, no bug found there.**

**Verdict on JK's "there's no drag-and-drop" complaint:** the mechanism is not broken; it is
impractical for the case he named. Two concrete, unaddressed limitations of native HTML5
drag-and-drop explain the felt experience: (1) the GLOBAL list renders inside a scrolling container
(`max-h-[420px] overflow-y-auto` in setup; a scrollable `whisper-board-well` on the live board), and
native drag does not auto-scroll that container as you drag toward its edge — there is no way to
drag a player from rank 44 up to a screen showing ranks 1-10 without first manually scrolling, which
cancels the drag; (2) the arrow buttons are the only fallback, and moving 43 ranks would take 43
individual clicks. Both are real, but neither is "broken" — they're exactly the gap Bug 2b's
affordances were commissioned to close, so no separate drag fix was needed or attempted.

### BUG 2b/2c — rank-badge type-in edit + send-to-top (BUILT)

Added to the shared component itself (`src/src_figma/app/components/shared/RankReorderList.tsx`),
not to any individual caller, so every consumer gets both affordances identically:
- **Rank badge → click-to-edit** (`:127-215` roughly): each row now renders a numbered "#N" button
  (`aria-label="Set rank for {label}"`, built from the component's own `index`, not caller-supplied).
  Clicking it swaps to a `<input type="number">` (autofocus, select-all-on-focus, same aria-label,
  `role="spinbutton"`). Enter and blur both commit via one shared `commitEdit`: a valid integer
  clamps to `[1, items.length]` (e.g. typing 999 in a 3-item list clamps to 3, typing -5 clamps to
  1); non-numeric or empty input cancels without committing. Escape cancels explicitly. Committing
  calls the exact same `moveRankedId` + `onReorder` path the arrows already use — no new storage
  shape, no new callback.
- **Send to top**: a new button next to the existing arrows (`ChevronsUp` icon,
  `aria-label="Send {label} to top"`), disabled when already rank 1, calling
  `commitMove(index, 0)` — one click instead of N-1.
- Both are rendered UNCONDITIONALLY as far as JSX structure (matching `renderBeforeArrows`'s
  discipline), but the interactive parts respect `readOnly`: the badge is disabled (shows the
  number, no edit) and send-to-top is hidden entirely, exactly like the drag handle and arrows
  already behave.
- New REQUIRED style props (matching the "no shared default look" convention every other style prop
  on this component already follows): `rankBadgeClassName`, `rankInputClassName`,
  `sendToTopClassName`. Wired into all five existing call sites:
  - `RosterDesigner.tsx` ShortlistRail (`:1105-1131`) — plain, muted 1px-border-family styling
    consistent with its existing look. Confirmed harmless at 5-item lists via a new dedicated test
    (R4) proving send-to-top and rank-edit both work there and persist through the existing
    `onSave`/`rankOverrides` path unchanged.
  - `LeagueBuilderDraftSetup.tsx` `RankYourBoardZone`, GLOBAL (`:1111-1128`) and PER-POSITION
    (`:1154-1174`) — hard-edge ballpark treatment per the skin standard (2px border, brass accents).
  - `WhisperPanel.tsx` GLOBAL (`:411-447`) and `MlbBoardPositionView` (`:922-960`) — new BEM-style
    class names (`whisper-board-rank-badge`, `whisper-board-rank-input`, `whisper-board-send-top`)
    matching the EXISTING `whisper-board-drag`/`whisper-board-arrow` naming convention. Confirmed
    via repo-wide grep that NONE of the `.whisper-*` classes (including the pre-existing
    drag/arrow ones) have any CSS defined anywhere yet — the whole live-board visual layer is
    explicitly deferred to the not-yet-dispatched reskin lane per
    `DRAFT_SKIN_STANDARD_2026-07-08.md` §6 ("Reskin lane dispatches AFTER Wave 2... auction-theme.css
    value rewrite" is its own scoped item). Inventing bespoke Tailwind styling here would have been
    out of scope (`auction-theme.css value rewrites` is an explicitly FORBIDDEN surface for this
    lane) and would fight the reskin lane's upcoming sweep — matching the established naming
    convention is the correct, minimal move.
  - **Duplicate-rank fix**: `WhisperPanel.tsx`'s shared `BoardRowFields` sub-component already
    rendered its OWN static `<span className="num whisper-rank">{rank}</span>`, used both by the
    static top-3/farm `BoardRow` (unaffected, out of scope) and — until now — by the interactive
    `RankReorderList` rows too, which would have doubled up with the new interactive badge. Added an
    optional `showRank` prop (default `true`, preserving the static `BoardRow` callers byte-for-byte)
    and set `showRank={false}` on both `RankReorderList` call sites so only ONE rank number renders
    per interactive row. Covered by a new test asserting `document.querySelectorAll(".whisper-rank").length === 0`
    inside the expanded board.
- Accessibility: `aria-label="Set rank for {name}"` on both the badge and its edit-mode input (same
  string, satisfying the contract's exact wording); Enter/Escape both handled via `onKeyDown`; the
  input is a real `<input type="number">` so it's natively a `role="spinbutton"` in the accessibility
  tree.

### Tests added (12 new, all passing; zero pre-existing tests altered in behavior)

- `RankReorderList.test.tsx` — 11 new tests: rank badge renders/labels; click opens a pre-filled
  input; Enter commits + shifts; Escape cancels; blur commits; out-of-range clamps both directions;
  non-numeric cancels; committing to the row's own current rank is a no-op; send-to-top moves to
  rank 1; send-to-top disabled at rank 1; readOnly disables the badge and hides send-to-top.
- `RosterDesigner.test.tsx` — 2 new tests: the BOARDFIX1 `poolDrawn`/`sourcePlayers` repro (proves
  the bug pre-fix, proves the fix post-fix), and R4 (send-to-top + rank-edit inherit harmlessly into
  the shortlist and persist through the existing `rankOverrides`/`onSave` path).
- `LeagueBuilderDraftSetup.test.tsx` — 4 new tests: the Bug 1 page-level repro (shortlist + board
  zone candidate scoping, start-draft correctly still disabled at that stage); the Bug 1b isolation
  test (start-draft activates once the pool is ALSO locked, no independent defect); the drag-wiring
  test on the setup board tab.
- `WhisperPanel.test.tsx` — 2 new tests: drag-wiring on the live board's expanded GLOBAL view;
  rank-edit + send-to-top + duplicate-rank-number check on the same surface.

### Gate tails (verbatim)

`npx tsc -b --pretty false` → clean, no output, exit 0 (run twice across the build, both clean).

`npm run build` → `✓ built in 11.43s`, PWA precache 184 entries (5314.01 KiB), exit 0. (Pre-existing
chunk-size warning only, unrelated to this diff.)

Focused suites:
- `LeagueBuilderDraftSetup.test.tsx` run SOLO: **74/74 passed** (70 pre-existing + 4 new).
- `RankReorderList.test.tsx`: **21/21 passed** (10 pre-existing + 11 new).
- `RosterDesigner.test.tsx`: **22/22 passed** (20 pre-existing + 2 new).
- `WhisperPanel.test.tsx`: **37/37 passed** (35 pre-existing + 2 new).
- `LeagueBuilderAuctionDraft.test.tsx` (safety check, not in the contract's gate list, since
  `WhisperPanel.tsx` was touched and this page renders it): **20/20 passed, untouched.**

### Surprises / notes for audit

- Bug 1b required building and then DELETING a combined single-test version once its Phase-2
  assertion tripped the (correct, unrelated) `modeAFinalizedDisplayMismatch` re-extract guard — see
  the "Diagnosis note" above. The final shape is two clean, independent tests; no dead code or
  leftover debug statements remain in the diff.
- The `showRank` prop on `WhisperPanel.tsx`'s `BoardRowFields` is a small, deliberate scope
  extension beyond the letter of "RankReorderList.tsx, RosterDesigner.tsx (only if...), WhisperPanel.tsx
  ONLY if... prop threading" — it was necessary to avoid shipping a visibly duplicated rank number on
  the live board once the shared component grew its own badge; flagging it explicitly rather than
  treating it as implicitly covered.
- No new DB writes, no new storage shape: rank-edit and send-to-top both terminate in the exact same
  `onReorder(orderedIds: string[])` callback the arrows already used, which the pages already persist
  via the pre-existing `boardRankOverrides`/`rankOverrides` write paths.
- Live browser verification was not performed in this pass (mirrors the Wave 2 lane's own note) —
  gates rest on tsc + build + the test suites above; JK's manual browser sign-off remains the sole
  real-world acceptance gate per project protocol.
