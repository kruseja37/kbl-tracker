You are a builder lane on KBL Tracker. Work ONLY in your assigned worktree on its branch; commit there; do NOT push or merge. Independent audit follows. node_modules if missing: `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules`. Base: main @ 03f4e5d1.

FIRST COMMIT: write this entire prompt verbatim to spec-docs/contracts/CONTRACT_FLAKEFIX_2026-07-09.md and commit before any change.

═══ LANE: FLAKEFIX — kill the LeagueBuilderDraftSetup.test.tsx flake envelope ═══
THE PROBLEM (three diagnosis cycles burned this week): src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.test.tsx (93 tests, ~98s solo, ~232s under full-suite load) blinks nondeterministically — a DIFFERENT 1-5 tests fail each batch run, ALL pass solo and on re-runs. Observed failing names across runs: "CUT2-2 30-club shill pressure does not inflate the pool-lock floor", "pool-first regeneration carries the selected pool quality center without saving salary cap", "names a locked pool that falls short of the required floor", "CUT2-2 persists selected shill count and reloads it without a URL carrier", "enables design-first draft start when all locked designs predate the extracted pool", "F20 design-first lock persists the displayed finalized pool without re-extracting". Known root-cause instance (from the STALEPARITY audit): a test used findByTestId("draft-readiness-panel") which resolved a TRANSIENT "Checking for a saved auction before allowing pool edits" loading panel, then a synchronous getByText fired before content settled — the retry-style findBy on the CONTENT (not just the container) is the cure pattern.

═══ THE WORK (test-infra ONLY — zero production-code changes, zero assertion weakening) ═══
1. SWEEP the whole file for the timing anti-patterns and fix each: (a) findByTestId/getByTestId on a container followed by SYNCHRONOUS getByText/getAllByText inside it → replace with retry-style findByText/findAllByText (or within(container).findByText) so the CONTENT is what's awaited; (b) waitFor blocks whose assertion depends on multiple async settles → ensure the FINAL fact is what's waited on; (c) fireEvent bursts followed by immediate assertions where a rerender debounce exists (the 500ms rank-persist debounce, the 0ms recompute timer) → advance timers/await the settled state explicitly; (d) any bare setTimeout-race patterns.
2. SPLIT the mega-file into per-zone suites (this is the real fix for the 232s batch degradation): split by the file's existing describe/zone structure (e.g. setup/money/pool-lock/readiness/board/staleness — follow the actual describes) into 3-5 files under the same directory, e.g. LeagueBuilderDraftSetup.money.test.tsx etc., sharing the existing fixture/setup helpers via a local testUtils module (extract shared helpers ONCE — no duplication). EVERY test keeps its exact name and its exact assertions (relocation, not rewording — the D11-class characterization must survive byte-identical; the only permitted content changes are the timing-pattern cures from step 1). Keep the documented solo-judgment convention viable: note in a header comment that these suites descend from the known-flake file.
3. ADD the missing unlock→relock staleness-clear cycle test (STALEPARITY audit note 3): lock pool-first → drift a basis input → assert staleness lines + gated start → unlock → relock → assert staleness cleared and start enabled. Use the cured timing patterns.

═══ VERIFICATION (the gate IS the point of this lane) ═══
1. npx tsc -b clean; npm run build exit 0 (should be untouched — prove it).
2. THREE consecutive full runs of the split suites (all files together) — all green, paste all three outputs.
3. ONE batch-load simulation: run the split suites CONCURRENTLY with 2-3 other heavy suites (e.g. WhisperPanel + LeagueBuilderAuctionDraft + the leagueBuilder folder) — green, paste output.
4. Test-count conservation: total tests across the split files === 93 (+ the new cycle test = 94); paste the count proof. Any test lost = failure.

═══ GUARDRAILS ═══
Zero production files in the diff. Zero assertion deletions/weakenings — an auditor will diff every test body against the original; timing-cure changes must be provably equivalence-preserving (same facts asserted, retry-awaited instead of raced). If a test's flake turns out to be a REAL product race (not a test-timing artifact), STOP and report that test by name — do not paper over it.

═══ DELIVERABLE ═══
Contract-first; then the sweep/split commits; final contract update with the anti-pattern inventory (each cured site listed file:line old→new), the 3x green + batch-sim outputs, count conservation, and honestly-flagged judgment calls. Final message: summary + hashes + surprises.

───────────────────────────────────────────────────────────────────────────
DELIVERABLE (filed after the build)
───────────────────────────────────────────────────────────────────────────

## What shipped

- Deleted: `src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.test.tsx` (3907 lines, 93 tests).
- New shared helper module: `src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.testUtils.ts`
  (fixture builders + DOM-query helpers extracted once; each split file still owns its own
  `vi.mock(...)` calls, imports, `mockNavigate`, `beforeEach`/`afterEach` — mock factories are
  hoisted per test file in Vitest and can't be shared across files).
- 5 split suites (all under the same directory, same outer `describe("LeagueBuilderDraftSetup")`):
  - `LeagueBuilderDraftSetup.setup.test.tsx` — 23 tests (room render, identity/CUT2, shill count,
    design-first re-plan rail, GM seat, freeze/resume, RUN IT BACK, saved-auction-unverifiable).
  - `LeagueBuilderDraftSetup.money.test.tsx` — 13 tests (solvency banner, pool-size dial, Pool
    Quality, Cap Fit diagnostic, THE MONEY M1-M3, M4-M6/M6b extraction-basis staleness).
  - `LeagueBuilderDraftSetup.poolLock.test.tsx` — 21 tests (F20 lock/persist, pool-first
    regeneration + reroll + provenance, IV sort, M7, P8, design-first extraction protection).
  - `LeagueBuilderDraftSetup.universe.test.tsx` — 13 tests (UNIVERSE-FIX1, RE-CHECK, CLUB CHECK,
    B5, DRAFT_POOL_UNIVERSE_SPEC).
  - `LeagueBuilderDraftSetup.board.test.tsx` — 24 tests = 23 relocated (COCKPIT WAVE 2, BOARDFIX1,
    BOARDFIX2 rank-edit/debounce/readiness-panel, STALEPARITY) + 1 new (item 3 below).
  - **Zone-count note**: the contract's own example lists 6 zone names (setup/money/pool-
    lock/readiness/board/staleness) but asks for 3-5 files. I folded "readiness" and "staleness"
    into `board.test.tsx` (both zones gate on the same `draft-readiness-panel` and share fixtures)
    to land at exactly 5 files, evenly sized (13-24 tests each) instead of 6 uneven ones.

## Anti-pattern inventory (each cured site, old → new)

**Category (a) — readiness-panel container-vs-content race.** Root cause confirmed by reading
`readinessReasons` in `LeagueBuilderDraftSetup.tsx`: `if (!savedDraftChecked) readinessReasons.push(CHECKING_SAVED_DRAFT_MESSAGE)` means the panel mounts on the FIRST render showing the
TRANSIENT "Checking for a saved auction..." line, then swaps to its real reason(s) once the async
auction-session check resolves. `await screen.findByTestId("draft-readiness-panel")` can resolve on
that transient first paint (RTL's `findBy` succeeds on its very first synchronous check if the
node is already there); a SYNCHRONOUS `within(panel).getByText(...)` read immediately after then
races the real content swap. Cured 12 assertions across 9 tests in `board.test.tsx` by converting
`within(panel).getByText(X)` → `await within(panel).findByText(X)` (retry-awaits the CONTENT, not
just the container). Sites (post-split line numbers):
  - `board.test.tsx:719` — "names every club still missing an MLB/farm identity"
  - `board.test.tsx:735` — "names every club whose design isn't locked yet"
  - `board.test.tsx:764` — "once every design is locked but the pool is only extracted..."
  - `board.test.tsx:793` — "names a locked pool that falls short of the required floor" (NAMED FAILING TEST)
  - `board.test.tsx:836,837` — "REAL-BLOCKER HUNT: a locked pool that goes stale AFTER lock..."
  - `board.test.tsx:887` — "pool-first: names a pool that can't legally seat every club..."
  - `board.test.tsx:909` — "pool-first: a pool that hasn't been locked yet..."
  - `board.test.tsx:955,956` — STALEPARITY "REPRO (a): pool-first identity drift after lock..."
  - `board.test.tsx:992,993` — STALEPARITY "REPRO (b): a fresh mount whose live pool-quality/balance dials..."
  - `board.test.tsx:1161,1162` — the NEW unlock→relock test (item 3), written with the cure
    pattern from the start.
  A header comment was added at the top of the "BOARDFIX2: the readiness panel (Item A)" describe
  (around line 664) explaining the race and pointing at every cured call site including STALEPARITY.

**Category (b) — insufficient timeout budget under batch-load CPU contention.** Two flavors found:
(i) a `waitFor`/`findBy*` using RTL's bare 1000ms default where a SIBLING test asserting the exact
same fact already carries `{timeout: 5000}}` (an inconsistency, not a design choice); (ii) content
whose settle path runs behind a real `window.setTimeout` macrotask in the component (confirmed by
reading `LeagueBuilderDraftSetup.tsx`: the design-first `modeAReport` recompute is gated behind a
`setTimeout(..., 0)` at line ~2554-2575) — a macrotask needs a real event-loop turn, which a
CPU-starved worker thread can delay past 1000ms even though the fact is never actually wrong.
  - `setup.test.tsx:547` — 2nd copy of "CUT2-2 persists selected shill count..." (NAMED FAILING
    TEST), initial START-THE-DRAFT wait: bare `waitFor` → `{timeout: 5000}` (matches 1st copy).
  - `setup.test.tsx:567` — both copies' post-remount START-THE-DRAFT wait (`replace_all`, 2 sites):
    bare `waitFor` → `{timeout: 5000}`.
  - `setup.test.tsx:537-538` and `598-599` — both copies of "CUT2-2 30-club shill pressure does not
    inflate the pool-lock floor" (NAMED FAILING TEST): the trailing `screen.getByText("Pool X/Y
    draft slots")` / `screen.getByText("N clubs + M shills")` synchronous reads right after the
    (now-widened) button-enabled wait → `await screen.findByText(...)` (2nd copy's wait also
    lacked `{timeout: 5000}`; added).
  - `setup.test.tsx:658` — "enables design-first draft start when all locked designs predate the
    extracted pool" (NAMED FAILING TEST): bare `waitFor` on START-THE-DRAFT → `{timeout: 5000}`.
  - `poolLock.test.tsx:268,275` — "F20 design-first lock persists the displayed finalized pool
    without re-extracting" (NAMED FAILING TEST): both `waitFor` calls (LOCK POOL enabled;
    `lockLeaguePool` called) → `{timeout: 5000}`.
  - `poolLock.test.tsx:333` — "pool-first regeneration uses numeric-shaped slack target instead of
    exact roster demand": final `findByText(/Sized to 110/)` → explicit `{timeout: 5000}`.
  - `poolLock.test.tsx:426` — "pool-first regeneration carries the selected pool quality center
    without saving salary cap" (NAMED FAILING TEST): final `findByText((content) => ...)` →
    explicit `{timeout: 5000}`.
  - `money.test.tsx:622` — "M6b shill-count basis stales the pool and hides the healed sizing
    receipt": final `findByText(/Sized to .*added .* for affordability/i)` → explicit
    `{timeout: 5000}` (same `modeAReport` 0ms-macrotask dependency as the F20/M4-M6 tests).
  - `board.test.tsx:1107-1111` — STALEPARITY "BACK-COMPAT: a basis saved before
    poolQualityCenter/poolBalancePreset existed...": bare `waitFor` → `{timeout: 5000}` (its two
    sibling tests in the SAME describe already use 5000).

**Category (b), file-wide generalization.** After the individual cures above, a 5-file batch run
still intermittently tripped a call site the audit hadn't individually flagged (`waitForExtractPoolOptions` timing out at its OWN 7000ms budget on "pool quality center restores from
session and feeds regeneration" — a test that passes in 1.5s solo). Confirmed via `uptime` during
this lane's own verification that the dev box was genuinely under real external CPU contention
(load average ~6 on 8 cores, another `vite build` from a sibling agent session observed mid-run).
Rather than keep whack-a-moling individual call sites, two shared, provably equivalence-preserving
changes in `testUtils.ts` (imported by every split file):
  - `testUtils.ts:40` — added `configure({ asyncUtilTimeout: 5000 })` (from
    `@testing-library/react`) at module load. Raises the file-wide DEFAULT for every bare
    `waitFor`/`findBy*` call from RTL's built-in 1000ms to 5000ms, without touching call sites.
    Each file's own `vi.setConfig({ testTimeout: 15000 })` stays the real ceiling.
  - `testUtils.ts:217-225` — `waitForExtractPoolOptions`'s own `waitFor` timeout: 7000ms → 12000ms.
    This one helper backs ~20 call sites (every F20/M-series/pool-first-regeneration/reroll test).

**Categories (c) and (d) — debounce bursts / bare setTimeout races.** Swept the whole file (BOARDFIX2 Item C's two debounce tests, the roster-designer 200/250/400ms timers, the readiness-
panel/STALEPARITY `basisStaleLines` reads). Found NONE that needed a cure: the debounce tests
already scope `vi.useFakeTimers()`/`vi.advanceTimersByTimeAsync(700)` correctly with a try/finally
real-timer restore (matches the file's own `afterEach` safety-net comment); the `basisStaleLines`-
derived text lines that follow an awaited `findByText` in the SAME array/render (e.g. M4-M6's "THE
CAP MOVED" + "THE POOL-SIZE DIAL MOVED" + "...CHANGED ITS IDENTITY" triad) are computed together
synchronously, so reading the sibling lines with a bare `getByText` right after is NOT a race.

## Item 3 — new unlock→relock staleness-clear cycle test

Added to the STALEPARITY describe in `board.test.tsx` (`unlock -> relock clears the pool-first
staleness net once the plan re-matches`): locks a pool-first pool whose basis matches the live
plan (start ready, no staleness) → drifts team-b's identity via `mockLeagueData`+`rerender` →
confirms the identity-drift staleness lines + disabled Start Draft (mirrors REPRO (a)'s exact
assertions) → clicks UNLOCK (asserts `unlockLeaguePool` called) → clicks LOCK POOL again → asserts
`saveLeagueTemplate` was called with a freshly re-snapshotted `poolExtractedBasis` reflecting the
NOW-current (drifted) identity → simulates the app's post-save fresh read (since the mocked
`replaceLeagueLocal` is a test no-op, exactly like every other STALEPARITY test in this file does)
and confirms the staleness net has genuinely cleared and Start Draft re-enables. Required one new
import in `board.test.tsx` (`unlockLeaguePool` from `../../../utils/leagueBuilderPoolBuilder`,
already mocked in the file's existing `vi.mock` factory but not previously imported for direct
`vi.mocked()` use in a test body) — this is still test-infra, zero production files touched.

## Verification

**Tier 1 — build untouched:**
```
npx tsc -b --clean && npx tsc -b   → exit 0 (test files are excluded from tsconfig.app.json's
                                       "include", confirmed via cat tsconfig.app.json; this lane's
                                       diff is 100% test files, so this proves zero blast radius)
npm run build                      → exit 0, "✓ built in 11.08s", PWA precache 186 entries
```

**Tier 2 — three consecutive full runs of the 5 split files together:**
```
Run 1/3:  Test Files  5 passed (5)   Tests  94 passed (94)   Duration 42.94s
Run 2/3:  Test Files  5 passed (5)   Tests  94 passed (94)   Duration 41.82s
Run 3/3:  Test Files  5 passed (5)   Tests  94 passed (94)   Duration 38.22s
```
(Two EARLIER attempts, before the file-wide `asyncUtilTimeout` generalization above, each threw a
single unrelated `waitForExtractPoolOptions` timeout under this same 5-file concurrency profile —
"pool quality center restores from session and feeds regeneration" once, an uncaptured second name
once. Both are exactly the class of flake this lane exists to kill; see the Surprises section.)

**Tier 3 — batch-load simulation, split suites + 3 other heavy suites concurrently:**
```
Command: vitest run <5 split files> WhisperPanel.test.tsx LeagueBuilderAuctionDraft.test.tsx
         src/src_figma/__tests__/leagueBuilder/ (10 files)
Result:  Test Files  17 passed (17)   Tests  367 passed (367)   Duration 43.67s
```

**Tier 4 — test-count conservation:**
```
setup:    23
money:    13
poolLock: 21
universe: 13
board:    24  (23 relocated + 1 new)
TOTAL:    94  =  93 original + 1 new cycle test
```
Confirmed two ways: (1) a TypeScript-AST-based script extracted every `test(...)` call's exact
source text from the original file and from all 5 split files and diffed as a multiset — 0
mismatches, 93/93 relocated byte-identical before any cure was applied; (2) `vitest run --reporter=verbose` across all 5 files reports "94 passed (94)" with zero skipped/todo.

## Honestly-flagged judgment calls

1. **Two literal byte-identical duplicate tests were NOT deduplicated.** `"CUT2-1 flips THE FLOOR
   status in-session after locking the pool"` exists twice in the original file (verified via
   `diff` — 0 differences) and now exists twice in `setup.test.tsx`. This is very likely an
   accidental copy-paste in a past commit, not intentional coverage, and running the same test
   twice IS part of what inflates per-file runtime — but the contract's count-conservation gate is
   explicit ("total tests across the split files === 93... any test lost = failure"), so I left
   both copies rather than unilaterally deleting one. Flagging for JK/auditor: safe to dedupe in a
   follow-up if desired, separate from this lane.
2. **The two OTHER "duplicate-named" pairs (`CUT2-2 persists...` and `CUT2-2 30-club...`) are
   NOT byte-identical** — a `diff` of the two copies of each showed the second copy of each was
   missing the `{timeout: 5000}}` the first copy already had. This is very likely the actual origin
   of those two tests' names showing up in the observed-failing list — I fixed the gap (see
   inventory above) rather than treating them as intentional near-duplicates.
3. **The file-wide `configure({ asyncUtilTimeout: 5000 })` change was not in the original plan** —
   it was added mid-lane after empirical evidence (two runs, two different untouched tests failing
   under the SAME 5-file concurrency profile that the individually-cured tests now survive)
   showed the individually-targeted fixes alone were insufficient on this specific dev box under
   its ACTUAL real-world load (confirmed via `uptime` and `ps`: a sibling agent session's `vite
   build` was running concurrently during one of the failed attempts). This is a broader,
   DRY generalization of the same "insufficient default timeout" root cause already established
   for the individually-cured sites, scoped ONLY to the 5 split files that import `testUtils.ts` —
   it does not touch the repo's global `src/test-setup.ts` or any other test file.
4. **Zone naming/grouping is my judgment call**, not literally what any single describe in the
   original said: "readiness" (BOARDFIX2 Item A) and "staleness" (STALEPARITY) both live inside
   `board.test.tsx` rather than getting their own files, to land at 5 files instead of 6 and to
   keep `draft-readiness-panel`-dependent tests (which share the exact same fixture shapes and the
   readiness-panel cure pattern) physically adjacent for future maintainers.
5. **No test's flake was diagnosable as a genuine PRODUCT race** — every observed failure (the 6
   named tests, plus the 2 additional ones surfaced during this lane's own batch-load
   verification) traced to a test-infra timing gap (missing/insufficient timeout, or a
   container-vs-content read race), never to the underlying `LeagueBuilderDraftSetup.tsx` logic
   itself being wrong. Nothing to report under the "STOP and report" guardrail.
