# CONTRACT PERFROOM — room-code clobber + production-scale freeze (JK walkthrough #4/#5)
Captain: Fable · Builder: Codex gpt-5.6-sol xhigh · Branch: codex/perfroom
Base: github/main (post PR #91). A concurrent UNIFYSETUP lane owns
LeagueBuilderDraftSetup + the setup pipeline — do NOT touch those files; your surface
is the ROOM runtime (SnakeDraftRoom/View, desk/, trade/, companion/, snake engines'
CALL PATTERNS — never their math).

## FIELD REPORT (JK, real browser + phone, 2026-07-11)
A. The COMPANIONS room code displays, then immediately changes to a different code, on
   repeat; a code entered on the phone is rejected ("room code does not match").
B. The room is extremely laggy at real-league scale — repeated "wait or exit page"
   browser popups; opening THE GUIDE reliably kills the tab.

## BUG A — the two-writer clobber (diagnose precisely, then fix structurally)
Hypothesis (from the S5/S6 audit watch-items — verify with a repro): the room page
persists the WHOLE session frequently (picks, pauses, board saves) from its in-memory
copy; CompanionApprovalCard separately persists the whole session with snakeCompanions.
A room save from a copy that predates the card's write CLOBBERS snakeCompanions →
the card's ensure-effect sees no roomCode → mints a new one → churn; the phone's code
mismatches. The card's `[props]` effect dep (flagged in the S5 audit) re-runs every
render and amplifies it.
FIX (structural, not a band-aid):
1. A dedicated storage helper that patches ONLY the snakeCompanions field by re-reading
   the freshest session at write time (read-modify-write on the narrow field). The
   approval card uses it exclusively.
2. Every room-page whole-session persist must carry forward the freshest
   snakeCompanions (merge-on-write: re-read before save or persist through a helper
   that preserves fields the page doesn't own). Same discipline for seatBoards vs
   room saves if the same clobber class applies — check.
3. Room code: generated ONCE, then immutable for the session's lifetime (no
   regeneration path exists after creation short of a session reset). Fix the effect
   deps to stop render-loop re-runs.
4. REPRO TEST first: interleave a room pick-save (from a stale copy) with a claim
   approval; assert the roomCode NEVER changes once created and the claim survives.
5. While in the card: show the JOIN ADDRESS next to the room code — the device's
   network origin (window.location with the LAN host the page was served from), plain
   copy ("ON YOUR PHONE, GO TO: http://…/snake-companion — SAME WI-FI"), so a phone
   user is never stranded at localhost confusion.

## BUG B — production-scale freeze (profile first, then optimize; MATH IS FROZEN)
Build a production-scale fixture FIRST: ~250-player pool, 8 clubs, 176 picks, real
engines. Profile where the time goes (count engine calls per render — instrument, don't
guess). Prime suspects:
1. playSnakeRationalRoom / risk reads recomputed per candidate per RENDER instead of
   once per session revision. Fix: memoize keyed on (session.revision, pool signature);
   one playout per revision serving all candidate reads.
2. The seating proof / legal-finish evaluations re-running on every keystroke/render.
   Same memo discipline.
3. THE GUIDE package search: combinatorial pick combos each revalidated with the FULL
   simultaneous seating proof → tab death. Fixes allowed: search prunes by posted-price
   ordering (cheapest satisfying package first, early exit), cap the combo space with a
   documented bound, run the expensive proof ONCE per final candidate package (not per
   combo), and compute lazily on the ASKED pick only (never precompute the whole
   chart's packages).
4. If render-path work remains heavy after memoization, defer with useMemo/idle
   scheduling — but prefer eliminating redundant computation over hiding it.
INVARIANT: every optimization is behavior-identical — outputs byte-equal to the
unoptimized path. Property tests: for N random small fixtures, optimized === original
(risk reads, guide answers, proof verdicts). NO change to any engine's math or output
shape; call-pattern/memoization/pruning only. If a true algorithmic change inside an
engine is unavoidable → STOP and report.
PERF ASSERTIONS (deterministic, not wall-clock): with the production-scale fixture,
assert call counts — e.g. playSnakeRationalRoom invoked ≤1 per session revision;
proveSimultaneousSnakeSeating invoked ≤1 per guide ask; zero engine calls on a pure
re-render. Wall-clock spot-check reported (not asserted): guide ask < ~200ms, pick
commit UI < ~100ms on the fixture.

## FILE SURFACE
SnakeDraftRoom.tsx · SnakeDraftRoomView.tsx · components/snake/{desk,trade,companion}/
· a narrow additive storage helper in leagueBuilderStorage.ts (field-patch write; no
schema change) · new tests (repro + property + call-count). FORBIDDEN: engine math
edits · LeagueBuilderDraftSetup/setup pipeline (UNIFYSETUP owns it) · the reducer's
ritual states · auction files · the ROOMFIX crawl test file (UNIFYSETUP migrates it).

## GATES (real output; the 3-attempt solo protocol from UNIFYSETUP Amendment 1 applies
to pre-existing characterized files only)
1. tsc clean. 2. build exit 0. 3. Repro + property + call-count + all snake suites
green. 4. Auction suites green. 5. ONE full vitest.

## PROTOCOL
No git write commands. Spec-first (Bug A repro red first; Bug B instrumented profile
BEFORE optimizing, numbers in the report). UNKNOWN = STOP. Builder report appended:
profile table (calls per action before/after), the clobber diagnosis evidence, gate
outputs, auditor attack list.

## BUILDER REPORT (Codex, 2026-07-11)

### Bug A red-first evidence

- Repro: `src/utils/tests/snakeRoomPersistence.test.ts` interleaves the actual storage
  writers in production order: main room holds a stale pre-companion session; approval
  card saves code `4821`; phone saves a pending claim; main room saves pick 1 from its
  stale copy; approval card re-runs its ensure path.
- Pre-fix command: `NODE_ENV= npx vitest run src/utils/tests/snakeRoomPersistence.test.ts --reporter=verbose`
- Pre-fix result: **RED, 1 failed / 0 passed**. Immutable-code assertion expected
  `4821`, received `7354` at line 87. This confirms the stale whole-session room writer
  deletes `snakeCompanions`; the card then sees no code and mints a replacement. The
  pending phone claim is deleted in the same overwrite.

### Bug B instrumented pre-optimization profile

Fixture: `src/src_figma/__tests__/pages/SnakeDraftRoom.performance.test.tsx` uses
250 real player records, 8 clubs, the real 176-pick snake order, the real rational-room,
legal-finish, tax/board, and seating-proof engines. Engine wrappers count production
calls. For the pre-fix Guide profile, repeated byte-identical seating-proof inputs are
counted but the proof body is executed once; this prevents the profiler itself from
reproducing JK's tab kill while preserving the attempted call count.

Command: `NODE_ENV= npx vitest run src/src_figma/__tests__/pages/SnakeDraftRoom.performance.test.tsx --reporter=verbose`

| Action | Wall spot-check | `playSnakeRationalRoom` | `evaluateSnakeLegalFinish` | `proveSimultaneousSnakeSeating` |
|---|---:|---:|---:|---:|
| Initial room render | 391 ms | 1 | 251 | 0 |
| Pure re-render | 27 ms | 0 | 0 | 0 |
| One early-draft Guide ask (pick 2) | 1,434 ms | 0 | 0 | **217,865** |

Pre-optimization profile test result: **2 passed / 0 failed**. The Guide search is the
dominant confirmed freeze: it enumerates the full 1/2/3-pick combination space and
calls the same unchanged simultaneous-seating proof for every balanced combination.
The room render's secondary hotspot is 250 per-candidate legal-finish calls plus the
one selected-candidate call.

### Structural fixes and behavior proofs

Bug A is fixed at the persistence boundary, not in component timing:

- `patchMlbDraftSessionSnakeCompanions` performs an atomic, narrow read-modify-write
  of only `snakeCompanions`. It preserves the first valid room code for the lifetime
  of the session and increments the session revision.
- `saveMlbDraftRoomSession` re-reads the persisted session, carries forward the
  freshest companion state, and merges each `seatBoards` entry by its own revision
  before committing the room-owned session fields.
- `CompanionApprovalCard` uses the narrow helper for ensure/approve/refuse/revoke;
  its effect has stable scalar dependencies rather than `[props]`. The card now shows
  `window.location.origin/snake-companion` with the same-Wi-Fi instruction.
- The red interleaving is green after the fix, including an additional stale room-save
  test proving a newer companion board revision and pending claim both survive:
  **2 passed / 0 failed**.

Bug B removes redundant work while retaining the original implementations as test
oracles:

- Rational-room output is memoized with a bounded cache keyed by session revision,
  pool signature, asking team, asked IDs, seat state, caps, and team count. The private
  desk is computed only after the user reveals it and the browser yields an idle slot.
- Candidate legal-finish evaluation is lazy: the room evaluates the selected candidate
  once; the desk resolves only the cards it actually renders.
- Guide seating proof is primed once per seating-input revision. Package search uses
  the posted-price monotonicity to inspect only the closest receive sums below/above
  each fixed offer, preserves the original count/imbalance/lexicographic ordering,
  and runs the unchanged seating proof once on the final package.
- Property oracle: **40 deterministic randomized Guide fixtures** produced byte-equal
  optimized and brute-force answers. **30 deterministic randomized rational-room
  fixtures** produced byte-equal memoized and uncached risk reads. Existing seating
  proof and legal-finish engines were not edited.

### Post-optimization production-scale profile

Latest isolated spot-check on the same 250-player / 8-club / 176-pick fixture:

| Action | Wall spot-check | `playSnakeRationalRoom` | `evaluateSnakeLegalFinish` | `proveSimultaneousSnakeSeating` |
|---|---:|---:|---:|---:|
| Initial room render | 160 ms | 0 | 1 | 1 idle prewarm |
| Pure re-render | 0 ms | 0 | 0 | 0 |
| Reveal private desk (idle work) | 393 ms | 1 | 22 rendered cards | 4,000 inside the one frozen rational playout |
| One early-draft Guide ask (pick 2) | 223 ms UI / **1 ms direct search** | 0 | 0 | 0 after prewarm |

The deterministic assertions are green: at most one rational playout per revision,
at most one seating proof per Guide ask (zero when the revision prewarm is reusable),
and zero engine calls on a pure re-render. The Guide's direct production search is
below the approximate 200 ms target; the 223 ms jsdom interaction includes React and
test-query overhead and is reported, not asserted. The remaining 393 ms desk work is
the frozen exact rational playout; it now occurs once, after reveal and an idle yield,
rather than blocking initial room paint or repeating per candidate/render.

### Gates

1. `NODE_ENV= npx tsc -b --pretty false` — **exit 0**, no diagnostics.
2. `NODE_ENV= npm run build` — **exit 0**; 2,687 modules transformed, built in
   16.89 s. Vite emitted its existing dynamic-import/chunk-size warnings only.
3. PERFROOM repro/property/call-count tests and all snake suites — **28 files passed,
   116 tests passed**. The untouched real-room registration integration also passed
   solo, **2/2**.
4. Auction suites — **34 files passed, 371 tests passed**.
5. Exactly one full `NODE_ENV= npx vitest run --reporter=default` was executed:
   **655 files passed, 3 failed, 8 skipped; 9,750 tests passed, 4 failed, 15 skipped**
   (666 files / 9,769 tests total; 362.73 s). All four failures are outside this
   lane's diff:
   - `LeagueBuilderDraftSetup.poolLock.test.tsx`: one 15 s timeout in the batch run.
     Solo attempt 1 had two timeouts; solo attempt 2 passed **21/21**, classifying it
     as load-sensitive.
   - `LeagueBuilderDraftSetup.setup.test.tsx`: two assertions expect the former
     isolated POC button/auction fallback. The same two failures reproduced in
     **3/3 solo attempts**.
   - `franchisePhase2Activation.test.ts`: `isSnakeDraftPocEnabled()` expected `true`
     but returned `false`; reproduced in **3/3 solo attempts**.

Gate 5 is therefore **BLOCKED by a deterministic pre-existing setup/activation
contract mismatch owned by the concurrent UNIFYSETUP lane**. PERFROOM did not touch
`LeagueBuilderDraftSetup`, either failing test, the activation helper, or the forbidden
ROOMFIX registration test. Per `UNKNOWN = STOP`, no out-of-lane repair or expectation
rewrite was attempted.

`git diff --check` is clean. A forbidden-surface diff check for
`LeagueBuilderDraftSetup.tsx`, `SnakeDraftRoom.registration.integration.test.tsx`,
`snakeRationalRoom.ts`, and `snakeSeatingProof.ts` returned no paths. No git write
command was used.

### Auditor attack list

1. Re-run the stale room-save / companion-claim interleaving against real IndexedDB,
   including simultaneous phone claim and room pick, and confirm the first room code
   never changes.
2. Attack `seatBoards` merge conflicts where main and farm boards advance independently;
   verify the higher per-board revision always wins without losing companion claims.
3. Compare Guide optimized vs brute-force output on larger adversarial tie sets
   (duplicate prices, zero-price picks, and equal count/imbalance packages), beyond the
   40 randomized oracle fixtures.
4. Profile the real browser, not jsdom: initial paint, desk reveal, pick commit, and
   Guide open/ask on JK's league. Confirm idle prewarming does not create visible input
   jank and record production-preview timings.
5. Verify cache invalidation across pause/resume, cap changes, farm transition, and a
   pool mutation that does not otherwise change the current pick.
6. Inspect the phone-side whole-session claim writer as a future hardening target. The
   required room writer now preserves its fresh companion state, but moving every
   companion writer to a narrow patch would reduce the remaining concurrency surface.

---

## AUDIT — opus, independent, 2026-07-11 — VERDICT: APPROVE
Repro RED-first verified by neutralizing the fix (roomCode churn + claim erasure
reproduced, then byte-exact restore); Bug-A fix structural at three layers (write-once
guard, narrow patch helper, carry-forward inside one serialized IDB transaction; both
room persist sites routed through it; approval card never whole-session-writes); the
guide pruning proven analytically (V-shaped imbalance → two-candidate check cannot
skip a better package; count-first early break valid) AND against 200 auditor-authored
adversarial fixtures — optimized === brute-force, zero mismatches; engine math files
byte-identical to base; cache key sound (revision+pool+seat+caps; pause correctly
unkeyed); the 4,000 in-playout proofs legitimate (once per reveal, post-idle); join
address = served origin; partition clean. An initial wave of reds was proven
ENVIRONMENTAL (156 concurrent node processes; control files red under load, green
clean).
MERGE MAP: zero overlap with post-#96 main AND with codex/unifysetup (only shared file
is the migrated crawl test, which PERFROOM does not modify). POST-MERGE GATE: re-run
the migrated crawl on the combined tree after both lanes land. NOTES: comment the
cache key's reliance on trades bumping revision; real-browser idle-jank check = JK's
walk.
