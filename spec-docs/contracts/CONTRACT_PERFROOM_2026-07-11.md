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
