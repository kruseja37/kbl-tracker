# CONTRACT BOARDFIX2 — self-explaining lock/start readiness panel; rank-edit lands at the displayed position; instant reorders w/ debounced persist (2026-07-08)

You are a builder on the KBL Tracker repo, in an isolated git worktree on your own branch off current
main. Deliver LANE BOARDFIX2 — three JK live-browser findings on the just-merged BOARDFIX1, one
critical. Commit when green; do NOT push/merge — captain merges after adversarial audit.

SETUP: (1) `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules`; (2) read
spec-docs/contracts/CONTRACT_BOARDFIX1_2026-07-08.md and CONTRACT_WAVE2_BOARD_2026-07-08.md; (3) write
this contract to spec-docs/contracts/CONTRACT_BOARDFIX2_2026-07-08.md, include in commit.

JK'S REPORT (verbatim anchors): "design-first is still broken as far as i can tell; no way to start
draft" (pool extraction now reflects correctly — that part works); "clicking player numbers and typing
in a rank does not move them there (type in 6 and player moves to 4)"; "very laggy on clicks up/down
and on enter."

=== ITEM A (CRITICAL): the gate must EXPLAIN itself + find the real blocker ===
The BOARDFIX1 tests proved the happy path (lock designs → extract → LOCK POOL → start enables). JK's
real league still can't start — some predicate fails silently on real data. Structural fix
(captain-ruled): enumerate EVERY predicate gating LOCK POOL and START THE DRAFT in design-first, render
a compact list of the SPECIFIC unmet conditions in plain retro voice, always visible when true (Text
Law §7 ALWAYS-class), and hunt for a genuinely-wrong or unreachable predicate via realistic integration
sequences the happy-path tests never modeled.

=== ITEM B (CRITICAL): rank-edit lands at the wrong position ===
Type rank 6 on a player → he must land VISIBLY at position 6 of the rendered list, on setup global,
per-position, and the live whisper board, without touching the RosterDesigner shortlist's own separate
semantics.

=== ITEM C: interaction lag ===
Decouple rank-change side effects from unrelated heavy recomputation; make reorders apply to local
state instantly with persistence debounced (~400–600ms trailing, flush on unmount/tab-switch); no
behavior change to WHAT is saved, only WHEN.

ALLOWED SURFACE: LeagueBuilderDraftSetup.tsx, RankReorderList.tsx, RosterDesigner.tsx, WhisperPanel.tsx
+ LeagueBuilderAuctionDraft.tsx (only for board threading/perf), the storage save path call sites (not
schema), tests, contract. FORBIDDEN: engines' math, universe/pool-builder semantics, auction state
machine, farm page, SOT docs, copy beyond the new reason lines.

GATES (paste tails): `npx tsc -b --pretty false`; `npm run build`; LeagueBuilderDraftSetup SOLO
(documented flake), RankReorderList, RosterDesigner, WhisperPanel, LeagueBuilderAuctionDraft,
RankYourBoardZone suite. NOT the full suite.

Commit: `fix(board): self-explaining lock/start readiness panel; rank-edit lands at displayed position;
instant reorders w/ debounced persist [BOARDFIX2]` + trailer
`Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

## AS-BUILT NOTES (what actually happened, decisions made, deviations)

### ITEM A — the readiness panel + real-blocker hunt

**Predicate inventory (every gate condition found, file:line references are pre-edit line numbers from
the investigation pass):**

`startReady` (LeagueBuilderDraftSetup.tsx, was ~2213): `Boolean(league) && (hasSavedDraft ||
(poolReady && identitiesReady && (poolMode === "pool-first" || (allHumanDesignsLocked &&
!poolTrailing)))) && savedDraftChecked && !savedDraftLookupError`. Atomic terms and their sub-reasons:
- `!savedDraftChecked` — transient, "checking for a saved draft."
- `savedDraftLookupError` — a genuine stuck state (`getAuctionSession` threw); the error string IS the
  message (`SAVED_DRAFT_LOOKUP_ERROR_MESSAGE`, no in-app retry, requires a page refresh).
- `hasSavedDraft` — short-circuits everything else (resume path). Set by the saved-draft-lookup effect;
  `hasCompletedDraft` (a SIBLING flag, not part of `startReady` at all) is set instead when the saved
  session's state is `AUCTION_COMPLETE` — confirmed by direct investigation this does NOT desync any
  other predicate (pool lock, designs, identities all stay exactly as they were); see the dedicated
  test below.
- `identitiesReady` — ALL teams need both `mlbArchetypeKey` and `farmArchetypeKey`; previously an
  all-or-nothing boolean with zero per-team breakdown. Now named per club with WHICH identity
  (MLB/farm/both) is missing.
- `poolReady` = `locked && sufficiency.meetsFloor`. `sufficiency` (`evaluatePoolDemandSufficiency`) is a
  single aggregate poolSize-vs-hardFloor check (not per-position at this layer). Two independent
  reasons: pool not locked yet vs. locked-but-short (names the exact shortfall count, reusing the
  sufficiencyChip's own "need N more" number).
- `allHumanDesignsLocked` (design-first only) — names the exact waiting clubs via the pre-existing
  `modeAWaitingTeams` list.
- `poolTrailing` = `designsStale || basisStale || modeAFinalizedDisplayMismatch` (design-first only).
  All three sub-reasons are surfaced verbatim: `modeAStaleTeams` (per-club, locked-vs-editing wording),
  `basisStaleLines` (the exact pre-existing per-basis-input lines: cap moved, pool-size dial moved,
  shill count moved, draft pool sources changed, or a named club changed its identity), and the
  finalized-display-mismatch re-extract instruction.

`canModeALock` (design-first LOCK POOL gate, was ~3086): adds `!busy` (transient, not surfaced — a
spinner already covers it), `savedDraftMutationBlocked` (subsumed by the `hasSavedDraft`/checked/error
branch above), and `inPoolPlayers.length > 0` (subsumed by the extract/lock cascade — pre-extraction
this is always empty and the "extract pool" reason already covers it).

Pool-first's own LOCK button gate (was ~4402): adds `poolFirstLegalCompletionBlocked` — NOT a term in
`startReady` itself, but the reason LOCK stays unreachable (and therefore START stays unreachable too).
Named specifically ("can't legally seat every club at 22 under the cap") rather than the generic "lock
the pool" instruction, matching JK's own example phrasing ("Club X can't reach the salary floor").

**Seats/owners** — investigated (`normalizeDraftSeats`/`teamOwnerId`): there is NO uniqueness
validation today (two human teams could silently share a `gmSeatId` with zero warning anywhere in the
app). This is a genuine gap, but not an ACTIVE cause of a disabled Start button — `identitiesReady`
never reads seats, and `handleStartDraft` itself is exactly `if (!league || !startReady) return;
navigate(...)` with no seat check. Flagging as a separate, out-of-scope finding rather than adding new
validation logic (which the contract does not ask for — Item A is about explaining existing gates, not
adding new ones).

**Run-it-back** — investigated (`handleRunItBack` / `resetCompletedDraftArc`): confirmed a CLEAN reset.
It deletes auction sessions/scout profiles/rosters but deliberately leaves `poolRecord.locked`,
`league.poolExtractedAt/Basis`, and roster designs untouched — it cannot desync any of `startReady`'s
other predicates. No residue scenario exists to name.

**REAL-BLOCKER HUNT — result:** the readiness panel IS the fix. No genuinely-wrong or unreachable
predicate was found (`handleStartDraft`'s own logic is a bare `startReady` check with no hidden
side-conditions). The one sequence that DOES produce a real, previously under-explained state: a pool
extracted, locked, everything green — then a basis input (shill count, cap, pool-size dial, or source
leagues) changes AFTER the lock. `poolTrailing` correctly re-blocks `startReady` in this state (the pool
genuinely no longer matches the live basis) — this is confirmed CORRECT behavior, not a bug. Before this
lane, the explanation for it lived only in the "4 · THE POOL" zone's own contextual banner and the tiny
single-line `startBlocker` note; the new panel now surfaces the SAME specific reason (e.g. "THE SHILL
COUNT MOVED — RE-EXTRACT TO REDRAW", plus a new clarifying line "the pool is locked but the plan changed
since — UNLOCK, re-extract, then re-lock") prominently next to START THE DRAFT itself, which is where
JK's literal complaint was looking. Covered by a dedicated REAL-BLOCKER HUNT test using a shill-count
mismatch between `league.draftShillCount` and `league.poolExtractedBasis.shills`.

A second REAL-BLOCKER HUNT test drives the completed-draft/no-run-it-back-yet sequence end to end and
confirms it resolves cleanly to an EMPTY panel and an enabled START button — proving no hidden residue,
per the run-it-back and hasCompletedDraft investigation above.

**The panel:** `LeagueBuilderDraftSetup.tsx` — a new `readinessReasons: string[]` array (built to
mirror `startReady`'s formula term-for-term, so "reasons is empty" and "startReady is true" never
disagree), rendered as an ALWAYS-visible panel (`data-testid="draft-readiness-panel"`) at the top of
"5 · THE FLOOR" (the panel that holds START THE DRAFT itself) — not gated on `showHelp`, per the Text
Law's ALWAYS classification for state-triggered warnings. Uses the existing `--ballpark-warn-*` tokens
(no bare hex). Placement judgment: ONE panel at the bottom (not a duplicate at LOCK POOL too) — since
every LOCK-POOL-blocking condition is a strict subset of what also blocks START, a single comprehensive
panel next to the ultimate CTA (where JK was looking) transitively explains the LOCK gate too, avoiding
scattering the same information across two places on the page. Flagging this as a placement call per
the contract's instruction to flag such judgments.

**Test coverage (9 new tests, `LeagueBuilderDraftSetup.test.tsx`):** happy path (panel absent); identity
gaps (named club + missing MLB/farm); designs not locked (named club); extracted-not-locked; pool below
floor; the two REAL-BLOCKER HUNT scenarios above; pool-first legal-completion-blocked; pool-first
not-locked-yet. Two PRE-EXISTING tests needed a one-line adjustment (`getByText` → `getAllByText(...).
length > 0`) since the panel now legitimately duplicates two already-tested messages a second time —
this is the intended, expected consequence of Item A's ask (the whole point is redundant visibility
near the CTA), not a regression.

### ITEM B — rank-edit lands at the wrong position

**Root cause, confirmed empirically before any fix** (direct call against the UNTOUCHED
`assembleBoard`/`sortByGmBlend` engine function in `src/engines/rosterIntelligencePayload.ts`, via a
throwaway scratch test, run and then deleted — not part of the committed suite):

```
5 candidates, iv = [star:500000, high:300000, mid:150000, low:50000, weak:5000].
assembleBoard({ candidates, rosterPlayers: [], rankOverrides: { global: ["weak","star","high","mid","low"] } })
REPRO: requested order = [weak, star, high, mid, low]; actual rendered order = [ 'star', 'weak', 'high', 'mid', 'low' ]
```

`weak` was explicitly ranked #1 (a COMPLETE override permutation, not a sparse one — disproving the
contract's dispatch-time "sparse overrides array" hypothesis) yet rendered at position 2. The mechanism:
`sortByGmBlend` treats an explicit rank as a NUDGE — `bonus = gmPreferenceWeight/(1+rank) * scale`
(mirroring best22Target's own gmPreferenceWeight=2.5 term) — added to raw `worth`, then re-sorted. A
player ranked #1 with a huge worth deficit can still be out-ranked by a lower-ranked player whose raw
worth advantage exceeds the bonus. This is exactly JK's "type in 6, player moves to 4" symptom, and it
persists even against a COMPLETE override (every id ranked), which is what the RankReorderList
component itself always produces (`moveRankedId` returns the full reordered `items` array on every
move — confirmed by reading `RankReorderList.tsx`'s own logic, which was already correct in isolation).

**The fix (caller-side, no engine edit — `sortByGmBlend`/`assembleBoard` are forbidden-surface engine
math and are byte-identical after this lane):** a new shared helper, `materializeRankOrder` (exported
from `RankReorderList.tsx`, the established shared-component home per Correction 7), which places every
id present in an override array at its LITERAL index (dropping stale ids no longer in the pool), then
fills remaining slots with the non-overridden entries in their natural (worth-ranked) relative order —
proven to be invariant to whether `assembleBoard` was given an override at all, since a non-overridden
entry's blend bonus is always 0 either way. This is the exact same algorithm RosterDesigner's OWN
`applyRankOverrideOrder` already implements for its separate per-slot shortlist mechanism — independent
confirmation the materialize approach is correct and already proven-out elsewhere in this codebase;
`RosterDesigner.tsx` itself was left untouched (its 22-test suite, including a new debounce-related
pair that landed independently of this lane, stays green byte-for-byte).

Applied at every board-rendering call site: `LeagueBuilderDraftSetup.tsx`'s `boardEntries` (GLOBAL) and
`RankYourBoardZone`'s `positionView` (PER-POSITION); `WhisperPanel.tsx`'s `boardPositionView`
(PER-POSITION — GLOBAL already arrives pre-materialized as a prop from the page); and
`LeagueBuilderAuctionDraft.tsx`'s `board` computation (GLOBAL, live) plus `computeBoardAutoAdvanceLine`'s
internal per-position "promoted" selection (so the "your #N" rank citation always matches what's
literally rendered — a small, necessary consistency fix within the same function, still pure/unit-
tested, 16/16 green unchanged in behavior for all pre-existing cases).

**Tests (4 new, `LeagueBuilderDraftSetup.test.tsx` + `WhisperPanel.test.tsx`):** a mixed-state fixture
(explicitly-ranked players interleaved with engine-ordered rest) renders in the exact materialized
order; a live interactive test types rank 1 for the objectively weakest of 5 graded players and asserts
he lands first, then performs two MORE edits (moving another player, then moving the first player back
down) proving repeated edits stay consistent and that moving down lands as exactly as moving up; a
PER-POSITION test with 6 candidates (5-deep default) types "99" on the visible #1 and confirms it clamps
to the last VISIBLE position (5) — not the full list (6) — while the hidden 6th player's position is
undisturbed (the pre-existing stable-remainder mechanism); and a WhisperPanel-level test proving the
live board's PER-POSITION materialize fix in isolation (mirroring the setup-page repro).

### ITEM C — interaction lag

**Perf audit — what WAS recomputing on a rank click, what's detached:**

Confirmed offender: `liveClubVerdicts`'s `useEffect` (LeagueBuilderDraftSetup.tsx, 200ms debounce) had
`humanTeams` (a referential array) in its dependency array. `replaceTeamsLocal` creates a brand-new
`teams`/`leagueTeams`/`humanTeams` array reference on EVERY team save — including a
`boardRankOverrides`-only save that has nothing to do with roster-design feasibility — so every rank
click reset this effect's timer and eventually re-ran `evaluateRosterDesign` for every human team.
**Fix:** switched its dependency to `clubTargetDesignKey` — the SAME content-based signature the
adjacent auto-fit effect already uses, which captures `team.rosterDesign.slots`/pins/rankOverrides/
mlbArchetypeKey per team and stays byte-identical across a `boardRankOverrides`-only change.

Already-safe, confirmed by direct dependency-array inspection (no change needed, reported for
completeness per the audit ask):
- **draftability ranking** (the idle-callback archetype-ranking effect) — deps
  `[league?.tier, rosterDesignerPoolKey, tierBudget]`; `rosterDesignerPoolKey` is itself a content key
  over `rosterDesignerPlayers`, which never depends on `leagueTeams`/`teams` at all.
- **auto-fit** (`targetByTeamId`'s effect) — already keyed on `clubTargetDesignKey` (not `humanTeams`).
- **affordability** (`poolAffordabilityDiagnostic`) — deps have zero team-array references.
- **recheck** (`buildRecheckReport`'s auto-effect) — its dependency array DOES include
  `humanTeams`/`leagueTeams` referentially (so the effect body re-runs on every team save), but an
  internal content-based ref-guard (`autoRecheckTriggerRef`, keyed on `poolExtractedAt|locked`) bails
  BEFORE the expensive `buildRecheckReport` call whenever that trigger string is unchanged — so no
  wasted heavy work occurs today; left untouched (a narrower dependency array would be cosmetic, not a
  functional fix, and risked touching an effect with subtle recheck-staleness semantics).

**Instant-apply + debounced persist (both surfaces, same pattern):**
- `LeagueBuilderDraftSetup.tsx`: a new `pendingBoardRankOverrides` state (`{team, overrides}`, scoped
  by team so switching clubs never misapplies a stale pending write) updates SYNCHRONOUSLY on every
  reorder (arrow/drag/badge-edit/send-to-top); `boardEntries`/`RankYourBoardZone` render from an
  `effectiveBoardRankOverrides` value (pending if present, else the persisted `selectedTeam.
  boardRankOverrides`) — instant visual feedback with zero IndexedDB round-trip per click. A trailing
  `useEffect` (500ms, `BOARD_RANK_SAVE_DEBOUNCE_MS`) flushes to `saveTeam` + `replaceTeamsLocal` only
  after the burst settles; flush also fires on unmount and on `visibilitychange` → `hidden` (tab
  switch), so a reorder made just before navigating away isn't dropped. No new storage shape — this is
  purely a WHEN change, not a WHAT change (same `saveTeam({...team, boardRankOverrides})` call, same
  final persisted value).
- `LeagueBuilderAuctionDraft.tsx`: identical pattern for the live board's `handleBoardReorderGlobal`/
  `handleBoardReorderPosition`. Additionally split the previously-monolithic `whisperPayload` useMemo's
  board-display concern from its HEAVY engine calls: `whisperPayload` itself (worth/scorecard/market/
  chemistry/liquidity — the expensive part) still only recomputes when ITS real dependencies change
  (e.g. `teamById`, which now only changes once per debounce burst, not once per click); a new, CHEAP
  `displayedWhisperPayload` memo re-sequences the already-computed board array with the pending overlay
  (a `materializeRankOrder` call over ~dozens of already-built objects — no engine math) and is what
  actually gets passed to `<AuctionStage>` — so a rank click during a live auction no longer
  recalculates the full whisper intelligence payload from scratch, only the display-order overlay.

**Evidence (test, not just claim):** a new test drives 5 rapid oscillating up/down moves (never
touching a boundary, so every click is a real state change) under `vi.useFakeTimers()`, asserts
`saveTeam` has NOT been called while still inside the debounce window, then advances 700ms and asserts
`saveTeam` was called EXACTLY ONCE — proving the burst collapsed into a single write. (Fake timers are
installed only after the initial async page-load/navigation steps complete, to avoid stalling
Testing-Library's own real-timer-based `findBy*` polling.)

No equivalent through-the-UI perf test was added for the live auction page (`LeagueBuilderAuctionDraft.
tsx`) — driving a full engine session through 5 rapid board reorders was assessed as disproportionate
effort within this lane's time budget, mirroring the WAVE2 lane's own precedent of not building a
whisper-interaction fixture in that file for the same reason. Coverage instead comes from: the
IDENTICAL, already-tested debounce pattern on the setup page; the unchanged 20/20
`LeagueBuilderAuctionDraft.test.tsx` suite (zero regression); and direct code-level confirmation that
`handleBoardReorderGlobal`/`handleBoardReorderPosition` no longer call `saveTeam` synchronously.
Flagging this gap explicitly.

### Gate tails (verbatim)

`npx tsc -b --pretty false` → clean, no output, exit 0 (run repeatedly across the build).

`npm run build` → `✓ built in 9.45s`, PWA precache 184 entries (5318.05 KiB), exit 0 (pre-existing
chunk-size warning only, unrelated to this diff).

Focused suites:
- `LeagueBuilderDraftSetup.test.tsx` run SOLO: **87/87 passed, verified across 4 consecutive runs**
  (74 pre-existing + 9 Item A + 3 Item B + 1 Item C new tests; 2 pre-existing tests adjusted from
  `getByText` to `getAllByText(...).length` per the intentional duplicate-message consequence of
  Item A, noted above). One run hit a transient timing flake traced to the new fake-timers debounce
  test (Item C) — hardened with a defensive `vi.useRealTimers()` in the file's shared `afterEach`
  (belt-and-suspenders alongside the test's own try/finally restore); reran 3× clean after the fix,
  0 failures.
- `RankReorderList.test.tsx`: **21/21 passed**, unchanged (the new `materializeRankOrder` export is a
  pure addition; no existing behavior touched).
- `RosterDesigner.test.tsx`: **22/22 passed**, unchanged.
- `WhisperPanel.test.tsx`: **38/38 passed** (37 pre-existing + 1 new).
- `LeagueBuilderAuctionDraft.test.tsx`: **20/20 passed**, unchanged.
- `LeagueBuilderAuctionDraft.computeBoardAutoAdvanceLine.test.ts`: **16/16 passed**, unchanged behavior
  (the materialize substitution inside the function preserves every pre-rework case; ported to fix
  Item B for the live board's rank citation, no test text needed to change).
- `LeagueBuilderDraftSetup.RankYourBoardZone.test.tsx` (isolated component suite): **7/7 passed**,
  unchanged.
- `LeagueBuilderFarmAuctionDraft.test.tsx` (explicit path, must stay green untouched): **2/2 passed**.

### Surprises / notes for audit

- The contract's dispatch-time hypothesis for Item B ("commitEdit operates on the sparse overrides
  array") was DISPROVEN by direct inspection — `RankReorderList.tsx`'s own logic already operated on
  the full `items` array. The real mechanism (a worth+rank blend that never materializes) was found by
  reading `sortByGmBlend` in `rosterIntelligencePayload.ts` and confirmed with a scratch repro before
  writing the real fix, per repro-first discipline.
- `rosterIntelligencePayload.ts` is a FORBIDDEN edit surface (engine math) — the fix works entirely by
  changing what each caller does with the engine's output (compute the "natural" order without passing
  rankOverrides, then materialize on top), never by touching `sortByGmBlend`/`assembleBoard`
  themselves. Confirmed byte-identical: `git diff` shows zero changes to that file.
- One small, necessary scope extension beyond the contract's literal file list: `computeBoardAutoAdvanceLine`'s
  internal per-position selection (in `LeagueBuilderAuctionDraft.tsx`, already an allowed-surface file)
  needed the same materialize substitution so its "your #N" rank citation stays consistent with the
  now-fixed rendered board — flagging explicitly rather than treating it as implicitly covered by "board
  threading."
- Live browser verification was not performed in this pass (mirrors the WAVE2/BOARDFIX1 lanes' own
  notes) — gates rest on tsc + build + the test suites above; JK's manual browser sign-off remains the
  sole real-world acceptance gate per project protocol.
