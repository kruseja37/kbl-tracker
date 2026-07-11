# CONTRACT FAME-CLEANUP-1 — one fame ledger, no on-screen arithmetic, legacy surfaces retired
ROUTE: Codex 5.6 SOL | xhigh reasoning effort
DATE: 2026-07-11 · Captain: Fable · Worktree: /Users/johnkruse/Projects/kbl-integration
(branch integration/living-season-wave1 = KERNEL-TRUTH-1 + HUNTFIX-TRACKER-1 merged; both are shipped
PRs #83/#81 — you are on the post-merge shape by construction).
AUTH-4 STANDING AUTHORIZATION: unattended run — do not wait for confirmation; execute to completion.
Ignore any session-start protocol asking you to wait for JK; the captain holds the baton.

## Product ruling (JK 2026-07-11, plain words)
"Fame is no longer an in-game button or measurement the way it used to be. Fame is tied to milestones,
records, and WPA. We shouldn't have a thing come up on the screen saying '+3 fame bonus for XYZ
player' after a Killed Pitcher event anymore. We need to clean EVERYTHING up so it aligns with our
sources of truth." + explicit trust grant on cleanup judgment to the captain, whose rulings follow.

## The ruled model (context — do not re-derive)
Living-season fame = a BACKGROUND season ledger (franchiseFameCompute → heat/reach), fed by three
inputs: WPA spine, notable events (the archived game's fameEvents), honors/records. Its ONLY display
surface is the franchise hub player card. The in-game event CAPTURE stays (buttons/auto-detections
record that something happened); the on-screen fame ARITHMETIC goes.

## SCOPE

**F1. Kill on-screen fame numerics in GameTracker.**
`GameTracker.tsx` pushes fame values into the activity log via `fameTrackingHook.lastEvent` +
`formatFameValue` (~:2110-2121) and renders a click-dismiss fame popup (~:11776 region). Change:
notable events log NEUTRALLY ("Web gem — Jones", "Immaculate inning — Smith") with NO fame value, no
"+X", no fame word necessary; remove the fame-value popup entirely. Event capture and all quick
buttons stay untouched visually and functionally otherwise (GameTracker UI is SET — this is a removal,
not a redesign).

**F2. One fame ledger: fold the page tracker into the hook ledger.**
`useFameTracking` (src/src_figma/app/hooks/useFameTracking.ts) is a SECOND accumulator: GameTracker
records auto-detections (e.g. walk-off at ~:11327/:11337) and game-end detections into page state that
NEVER reaches the archive — display-only fame. Under the ruled model those auto-detected notable
events belong in the archive's fameEvents (they feed the season fame engine). Change:
1. Route every production `fameTrackingHook.recordFameEvent` call through the hook ledger instead —
   `useGameState`'s `appendFameEvent` (exposed seam), with the source event-log linkage where one
   exists (T4 provenance; game-end detections are finalization output — append them during the
   completion flow BEFORE `buildPersistedFameEvents` runs, unlinked, per T4's rule that game-end
   awards are never linked to the last play).
2. DOUBLE-COUNT GUARD (make-or-break): the archive must carry each notable event ONCE. KERNEL-A now
   merges MILESTONE fame into fameEvents at aggregation — verify the auto-detection families you move
   (walk-off, no-hitter, etc.) do not overlap milestone fame ids, and that any event previously
   recorded BOTH by a quick button and an auto-detection dedupes (inspect fameAutoDetections'
   existing dedupe sets and preserve their semantics).
3. Retire `useFameTracking`'s accumulator state (delete the hook or reduce it to a pure detection
   helper if the detection functions live there — detection logic must survive, the parallel LEDGER
   must not).
4. Values still come from the FAME_VALUES catalog exactly as today — this contract moves WHERE events
   are recorded, never how much they are worth.

**F3. Web-gem/robbery provenance (closes T4's STOP — the seam is now unfenced).**
GameTracker knows the source at-bat id for manual Web Gem/Robbery (~:8012) but doesn't pass it to
`recordEvent`. Plumb the durable at-bat eventId through so those fame events carry `sourceEventIds`
and undo removes them (T4 machinery already handles removal). Never infer the id from sequence.

**F4. Retire legacy fame surfaces.**
(a) The legacy template narrator calls at game end (`GameTracker.tsx` ~:11468 dual calls) whose output
is placed into navigation state the active PostGameSummary never reads — remove the calls (JK ruled
the narrator retired; do NOT delete src/engines/narrativeEngine.ts itself — tests reference it; the
production CALLS go). (b) `FameLeaderboardCard` placeholder — find its render sites; if only the
franchise/playoff postgame placeholder remains, remove the component's render and its dead imports.
(c) `player.fame` numeric field: do NOT remove the field (storage shape) — but audit UI reads of it in
GameTracker/src_figma surfaces and remove any DISPLAY treating it as live truth (the hub card reads
franchiseFameRecords, which stays).

## FENCE
GameTracker.tsx, useFameTracking.ts, useGameState.ts (appendFameEvent seam + completion flow only),
fameAutoDetections (read; edit only if a dedupe set must move), FameLeaderboardCard usage sites,
+ tests. Do NOT touch: engines/fameModel, franchiseFameCompute, processCompletedGame,
overlay/mirror/lens files, elimination-mode fame writes, flags.

## VERIFICATION (paste all)
1. Build exit 0. 2. FULL `NODE_ENV= npx vitest run` (summary; known solo-green batch flakes are
baseline). 3. Proving tests: auto-detected walk-off reaches the ARCHIVE fameEvents exactly once;
activity log contains NO fame numerals for a quick-button event; web-gem → undo removes its fame;
game-end detection appended unlinked; narrator no longer invoked at completion (spy/absence test).
4. grep proof: no production `formatFameValue` call renders into UI; `recordFameEvent` has no
remaining production caller outside the unified path. 5. Changed-files list.

FORMAT: files → per-item (F1-F4) → verification → "FAME-CLEANUP-1 complete" or "BLOCKED: <why>".
Commit on the integration branch if the sandbox permits; NEVER push.
FAILURE PROTOCOL: anchor mismatch → STOP that item; a detection family whose archive-routing would
double-count and cannot be cleanly deduped → STOP that family with the evidence, finish the rest.

Use xhigh reasoning effort. Think step-by-step.
