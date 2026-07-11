# CONTRACT HUNTFIX-TRACKER-1 — GameTracker truth seams (4 verified defects, one file)
ROUTE: Codex 5.6 SOL | xhigh reasoning effort
DATE: 2026-07-11 · Captain: Fable · Worktree: /Users/johnkruse/Projects/kbl-hft (branch codex/huntfix-tracker)

## Authority
Living-season program (`OBSERVER_GROUNDWORK_BRIEF_2026-07-11.md` §5); defects verified by the
adversarial hunt + captain deep pass (`CAPTAIN_DEEP_PASS_2026-07-11.md` #19) on main @ e5f4213c.
All work in `src/src_figma/hooks/useGameState.ts` (+ tests). GameTracker's UI is SET (JK) — these are
logic/persistence truth fixes, zero visual changes. Re-read every anchor; mismatch → STOP.

## SCOPE

**T1. Immaculate-inning detection compares a CUMULATIVE pitch count to 9.**
`useGameState.ts:10486` (check), `:10528` (+2 IMMACULATE_INNING fame), `:10545` (cumulative
`stats.pitchCount = finalCount`). The intended per-inning counter `inningPitchesRef.current.pitches` is
dead — only ever reset to 0 (`:4172`, `:5035`, `:10760`), never incremented. A reliever with any prior
pitches can never register an immaculate inning; only a starter's 9-pitch first inning fires. FIX:
compute the INNING's pitch delta (start-of-inning cumulative snapshot vs end-of-inning cumulative — the
end-of-half-inning confirm flow already knows both; either wire `inningPitchesRef` for real or derive
the delta at the check). The strikeout-count condition stays as-is. Tests: reliever 15-cumulative + 9-
pitch 3K inning → fires; 10-pitch 3K inning → does not; starter first-inning 9-pitch 3K → still fires.

**T2. D3K persists `runsScored: 0` while the score advances.**
`useGameState.ts:7672` hardcodes the archived AtBatEvent's `runsScored: 0` even when the dropped-third-
strike wild-pitch/passed-ball scores a runner — the same play's run IS in awayScoreAfter/homeScoreAfter
(:7545-7550), the scoreboard (:7825), gameState (:7871-7872), and the runner's R (:7806). The persisted
row contradicts its own score-after fields; any event-sum reconstruction undercounts. FIX: persist the
actual computed runsScored (from :7540-7544). `rbiCount: 0` is CORRECT baseball (no RBI on WP/PB) —
leave it. Test: D3K with R3 scoring → event.runsScored 1 and scoreAfter delta consistent.

**T3. Quick-error path loses the run AND desyncs three states.**
Path: HITS "E" → Error Details position button → `handleQuickErrorDetail` →
`commitPlateAppearance({type:"error", rbi:0})` → `recordError(0, undefined)` (no runnerData). With R3:
the no-runnerData branch at `useGameState.ts:8249` clears third ("R3 scores") while `runsScored`
derives only from runnerData (:7922-7925) = 0 → no run added (:8265-8266), AND the errorTracker only
advances runners when runnerData exists → tracker still shows R3 occupied. Three-way desync: bases
empty / tracker occupied / score unchanged — a lost run. FIX: make the default no-runnerData semantics
COHERENT — either (a) the default branch derives runner outcomes and runs from the same default
advancement it applies (score the run it moves), keeping tracker in sync, or (b) the quick path
supplies explicit default runnerData. Choose the smaller diff consistent with how the detailed error
path behaves; the three states (bases, tracker, score) must agree in every case. Tests: quick-error
with R3 → run scores, bases/tracker/score agree; quick-error bases-empty unchanged; detailed-error path
regression-covered.

**T4. Undo never rewinds fame.**
`undoLastAction` (:5768-5806) undoes the event-log row, but `fameEventsRef` (:3365-3376) keeps every
accumulated fame event — an undone play's fame ships to the archive (deep-pass #19: record a web gem,
undo it, +0.75 fame survives). FIX: tag each appended fame entry with the event-log linkage available
at append time (the current at-bat/between-play event id or event index the play writes), and on
successful undo remove fame entries tagged to the undone action id(s) (including the paired at-bat undo
in the end-of-half-inning case). Manual quick-button special events that create their own between-play
rows must carry their own row's id. If a fame append site genuinely has NO event-log row to link
(verify each appendFameEvent caller), STOP and report that site rather than guessing. Persisted
snapshot (`buildPersistedFameEvents`) and archive flow unchanged apart from the corrected contents.
Tests: play+fame → undo → fame ref empty + next snapshot fameEvents empty; multi-event game → undo last
only removes the last play's fame; end-of-half-inning paired undo removes both rows' fame.

## FENCE
`src/src_figma/hooks/useGameState.ts` + test files ONLY. No UI component changes, no engine/storage
module edits, no GameTracker.tsx edits (KERNEL lane owns its civil-date site). No schema changes to
persisted shapes beyond T2's corrected value and T4's fame-entry internal tagging (hook-local; the
persisted FameEventRecord shape must NOT change — verify before finishing).

## VERIFICATION (paste all)
1. `NODE_ENV= npm run build` exit 0 (tail).
2. `NODE_ENV= npx vitest run` FULL suite (summary, not exit code; two known solo-green batch flakes are
   baseline; retry any new red solo before owning it — sibling lanes may be loading the machine).
3. Proving tests T1-T4 (fail-before/pass-after, file names).
4. Changed-files list.

FORMAT: files changed → per-item → verification → "HUNTFIX-TRACKER-1 complete" or "BLOCKED: <why>".
Commit on branch if sandbox permits; NEVER push.
FAILURE PROTOCOL: anchor mismatch → STOP that item, finish others. T4 linkage impossible at any append
site → STOP that site, report, finish the rest of T4 where linkable.

Use xhigh reasoning effort. Think step-by-step.

## AMENDMENT 1 — T4 redesign (captain + Sol peer review, 2026-07-11; applies on re-dispatch AFTER the
## first pass lands T1-T3; T4 first-pass work is superseded where it conflicts)
Sol's verified breaks in the original T4 letter:
(a) Hook-local tags die on refresh — `buildPersistedFameEvents` (:3378) strips unknown fields and
    snapshot restore (:4850) recreates unlinked entries → refresh-then-undo reproduces the bug. The
    persisted FameEventRecord MAY now gain an OPTIONAL `sourceEventIds?: string[]` provenance field
    (additive, backward-compatible — the earlier "shape must not change" fence is lifted exactly this
    far). Snapshot serialize/restore round-trips it.
(b) `undoMostRecentGameAction` marks grouped/linked rows undone but returns only the primary id
    (`eventLog.ts:732`, `:1873`) — either extend the return to all affected ids (additive) or re-query
    newly-undone rows after the call; remove fame for the FULL affected set.
(c) Manual Web Gem/Robbery: `recordEvent` appends fame BEFORE persisting the between-play row
    (:8286), and the known source at-bat id in GameTracker.tsx (:8012) is not passed in. A minimal
    `GameTracker.tssx`-side plumb of the source at-bat id into `recordEvent` is PERMITTED once the
    KERNEL lane has merged (serialize — do not touch GameTracker.tsx while KERNEL is unmerged). Never
    infer the at-bat id from current sequence.
(d) TWO accumulators exist: this hook's array AND the page-level `useFameTracking` tracker
    (GameTracker.tsx:2061, useFameTracking.ts:62). T4 scope = make the HOOK ledger truthful under
    undo/refresh AND document (STOP-report, no code) exactly where the page tracker's events enter or
    fail to enter the archive — reconciliation of the two ledgers is a separate captain-scoped slice.
(e) Required additional tests: refresh→undo removes the play's fame; grouped end-of-half-inning undo
    removes fame across all affected rows; one elimination-mode archive assertion (fame exactly-once).
Game-end/awards fame is derived finalization output — never link it to the last play's id.
