You are a builder lane on KBL Tracker. Work ONLY in your assigned worktree on its branch; commit there; do NOT push or merge. Independent audit follows. node_modules if missing: `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules`. Base: latest main (verify HEAD is the PR #43 merge, 6fa97d81).

FIRST COMMIT: write this entire prompt verbatim to spec-docs/contracts/CONTRACT_FIXTUREFIX_2026-07-09.md and commit before any change.

═══ LANE: FIXTUREFIX — reconcile 26 stale test characterizations with POOLFLOOR's ruled behavior (TEST FILES ONLY, zero product code) ═══
A closing full-vitest found 26 deterministic failures in 4 files. A bisection diagnosis (logs: /private/tmp/claude-501/-Users-johnkruse-Projects-kbl-tracker/416bdc73-7866-4496-903a-c381baf02bf0/scratchpad/postmerge-failures/ — read the disposition; the full 26-row table is in the diagnosis, reproduced in essence below) proved ALL 26 are class-a STALE CHARACTERIZATIONS with ONE root cause: PR #41 POOLFLOOR's position supply floors (derivePositionSupplyFloorTargets — pools must carry each hard legal-roster position × teams + slack) correctly reject/augment the old fixtures, which predate position diversity:
- src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.testUtils.ts: makePlayer/makePlayers default EVERY synthetic player to primaryPosition "CF" / secondary "LF" (zero C/CP/1B/2B/3B/SP/RP) — used by setup/poolLock/board split suites via mockLeagueData().
- src/src_figma/__tests__/pages/LeagueBuilderAuctionDraft.test.tsx: its local makePlayers/legalMlbPositions rotate only C/SS/RF/RP/SP — zero CP/1B/2B/3B.
Symptoms: start/lock buttons correctly disabled (17 tests); extraction tops up short positions so pinned counts/copy shifted ("22"→"30"; "Sized to 106 (1.20×)"→"Sized to 115 (1.31×): … added 10 for affordability." 7 tests); the new specific readiness copy ("THE POOL IS SHORT ON CATCHERS — 1 FOR 2 CLUBS; RE-EXTRACT.") legitimately displaces the old generic message (2 tests).

═══ THE WORK ═══
1. **Enrich the fixtures, minimally and deliberately.** Give the shared testUtils makePlayers (and the AuctionDraft local generator) position-diverse defaults that satisfy derivePositionSupplyFloorTargets for each test's team count (read the real function to compute needs — do not guess). CAUTION: these are SHARED defaults — changing them shifts other tests' inputs. Protocol: after enriching, run ALL FIVE split suites + AuctionDraft + RosterDesigner; ONLY the 26 known-failing tests may change outcome (to green) — any OTHER test flipping red means your enrichment perturbed a pinned behavior; adjust the approach (e.g. append position-fillers beyond the original players rather than mutating existing ones, preserving original ids/ratings/order so prior pins hold).
2. **Re-pin the 9 exact-value tests** to the new correct outputs (pool deltas, sized-to copy, the new catchers readiness line) — each new pinned value must be JUSTIFIED in the contract against POOLFLOOR's ruled behavior (the "Sized to…added N for affordability" copy and the position-short line are contract-ruled strings; cite CONTRACT_POOLFLOOR_2026-07-09.md). For test #8 (identity-blocker), per the diagnosis choose: fixture satisfies the pool floor so the ORIGINAL identity message renders again (preferred — preserves the test's intent) rather than re-pinning to the pool message.
3. **Re-verify the masked assertion:** poolLock's "repeated pool-first regenerate is idempotent" second assertion never executed pre-fix (aborted on the first) — after re-pinning, confirm the idempotency claim actually holds; if it does NOT, that is a STOP-and-report finding (possible real bug hiding behind the stale pin).
4. **Zero product-code changes.** Test files + testUtils only. The duplicate-named tests (#12/#13) stay as-is (pre-existing, separately noted).

═══ GATES (paste real outputs) ═══
Typecheck clean; npm run build exit 0 (should be trivially unaffected — prove it); the 6 affected suites green TWICE consecutively; then the FULL vitest suite once — expect fully green now (any remaining red: report, don't chase). NOT optional: the full-suite run is this lane's entire point.

═══ DELIVERABLE ═══
Contract-first; then the fix commits; final contract update with the per-test re-pin justification table, the idempotency verification result, gate outputs incl. the full-suite tally. Final message: summary + hashes + surprises. UNKNOWN = STOP.

---

## FINAL BUILD UPDATE — Claude, 2026-07-09

### Commits

- Contract-first commit: `8dedd06b contract(fixturefix): reconcile 26 stale test characterizations with POOLFLOOR [captain]`.
- Fix commit: `6ff14be2 fix(fixturefix): reconcile 26 stale test characterizations with POOLFLOOR's position supply floors`.

Both on branch `worktree-agent-a032dd9e6f4658d65`, worktree `/Users/johnkruse/Projects/kbl-tracker/.claude/worktrees/agent-a032dd9e6f4658d65`. No push, no merge.

### Files changed (test files + shared test fixture helper only — zero product code)

- `src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.testUtils.ts` (+121/-0 net)
- `src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.setup.test.tsx` (+11/-2)
- `src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.poolLock.test.tsx` (+38/-6)
- `src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.board.test.tsx` (+8/-1)
- `src/src_figma/__tests__/pages/LeagueBuilderAuctionDraft.test.tsx` (+43/-4)

### Root cause, confirmed by direct read of the ruled-behavior source

`derivePositionSupplyFloorTargets(teams)` in `src/engines/poolFromDemand.ts` (POOLFLOOR) requires, per team count T (slack = max(2, ceil(T/3))): each of the 8 field positions ≥ T+slack, catcher depth (distinct C-coverers) ≥ 2T+slack, startable arms ≥ 4T+slack, relievable arms ≥ 4T+slack, closers ≥ T+slack. The shared `LeagueBuilderDraftSetup.testUtils.ts` `makePlayer` default (`primaryPosition: "CF"`) and `LeagueBuilderAuctionDraft.test.tsx`'s own local `makePlayers()` (a `%5` cycle of C/SS/RF/RP/SP only) both predate this and satisfy zero of most categories, so `evaluatePoolDemandSufficiency(...).meetsFloor` — which now gates BOTH `canModeALock` and `startReady`/`setupPoolReady` in `LeagueBuilderDraftSetup.tsx` and `LeagueBuilderAuctionDraft.tsx` — went false across every fixture that relied on the old all-CF/limited-position defaults.

### The fix strategy (why append, not mutate)

`makePlayers`/`makePlayer` themselves were left **completely untouched** in `testUtils.ts`. Many currently-green tests call them directly and depend on exact ids/ratings/order/IV (position feeds a per-position IV pricing curve in `src/engines/ivEngine.ts`, so changing a shared default's position would have silently shifted IV-sort-order assumptions elsewhere). Instead, position-diverse players are **appended** on top of the existing all-CF sets, or a small curated replacement set is substituted only where a fixture's *own* tail (not the shared defaults) needed reshaping. Verified via full-repo grep that every direct call site of `makePlayers`/`makePlayer` outside the 26 failing tests either (a) is a pure-function input unrelated to rendering, (b) checks counts/labels unrelated to position, or (c) is already gated by an unrelated always-disabled/always-different-reason condition — so this was safe by inspection, then confirmed empirically by two-consecutive-green batch runs.

### Per-test disposition table (all 26)

| # | File | Test | Class | Fix |
|---|------|------|-------|-----|
| 1 | setup | starts at the MLB auction once the pool is locked... | disabled-gate | bare-default filler (`makeDefaultPoolFillers`) |
| 2 | setup | blocks draft start when a club has an MLB identity but no farm identity | disabled-gate (identity message was masked by the pool-floor message) | bare-default filler restores the ORIGINAL identity-blocker message (per contract's stated preference) |
| 3 | setup | carries the selected shill count into the MLB auction | disabled-gate | bare-default filler |
| 4 | setup | CUT2-2 persists selected shill count... (dup #1) | disabled-gate | bare-default filler |
| 5 | setup | CUT2-2 30-club shill pressure... (dup #1) | disabled-gate, exact-headcount | `makePositionDiversePlayers(realClubFloor, 30)` |
| 6 | setup | CUT2-2 persists selected shill count... (dup #2) | disabled-gate | bare-default filler |
| 7 | setup | CUT2-2 30-club shill pressure... (dup #2) | disabled-gate, exact-headcount | `makePositionDiversePlayers(realClubFloor, 30)` |
| 8 | setup | enables design-first draft start when all locked designs predate the extracted pool | disabled-gate | `makeFinalizedDesignFirstPlayers()` tail fix |
| 9 | setup | R5 completed draft renders RUN IT BACK... | disabled-gate | bare-default filler |
| 10 | poolLock | F20 design-first lock persists the displayed finalized pool without re-extracting | disabled-gate | `makeFinalizedDesignFirstPlayers()` tail fix |
| 11 | poolLock | pool-first regeneration uses numeric-shaped slack target instead of exact roster demand | re-pin (extraction tops up) | delta 22→30, "Sized to 110 (1.25×)"→"Sized to 118 (1.34×)", "actual 110"→"actual 118" — all read from real output, no fixture change (universe already rich enough) |
| 12 | poolLock | pool-first regeneration carries the selected balance preset into numeric shaping | re-pin | "Sized to 106 (1.20×)"→"Sized to 115 (1.31×)" — real output |
| 13 | poolLock | repeated pool-first regenerate is idempotent for engine-generated players | re-pin + idempotency re-verify | delta 22→30 (real output); `totalSlots: 110` literal replaced with `firstFinalIds.length` (was already stale even pre-POOLFLOOR); **second assertion (previously masked) now executes and PASSES** — no real bug found |
| 14 | poolLock | switching from balanced to grounded can shrink engine-generated slack | re-pin | delta 22→30 (real output, identical fixture shape to #11/#13); `totalSlots: 110`→`balancedFinalIds.length` |
| 15-19 | board | BOARDFIX1 / BOARDFIX2 happy-path / REAL-BLOCKER HUNT / STALEPARITY BACK-COMPAT / STALEPARITY unlock→relock (5 tests) | disabled-gate | `makeFinalizedDesignFirstPlayers()` tail fix (all 5 share this one fixture) |
| 20 | board | BOARDFIX2: names a locked pool that falls short of the required floor | readiness-copy | generic "short of what the draft needs" → real observed `THE POOL IS SHORT ON CATCHERS — 1 FOR 2 CLUBS; RE-EXTRACT.` (deliberately-small 8-player slice; fixture unchanged, assertion re-pinned to the real position-specific line) |
| 21-26 | AuctionDraft | renders setup and begins.../ starts direct auction.../ renders open bidding.../ shows CPU decision preview/ CALLFIX 5(d)/ shows pure shill winner (6 tests) | disabled-gate | replaced local `makePlayers()` %5 cycle with an exact 52-body class shape (32 hitters:20 pitchers at derivePositionSupplyFloorTargets(2), zero margin, hand-verified arithmetic); CALLFIX 5(d)'s hardcoded market-band dollar string needed **no re-pin** — `makePool()`'s iv/salary assignment is index-based, not position-based, so the pricing distribution is byte-identical between old and new fixtures |

**Test #8 identity-blocker disposition (contract-directed choice):** confirmed the preferred path — with the bare default now clearing the position floor, `startBlocker`'s ternary (`LeagueBuilderDraftSetup.tsx`) falls through past `!poolReady` to `!identitiesReady`, so the test's original assertion (`give every club an MLB and a farm identity first`) renders unmodified and required zero test-body changes.

### Idempotency re-verification (contract requirement #3)

Ran `repeated pool-first regenerate is idempotent for engine-generated players` solo after re-pinning: **PASS**. The second regenerate call (against a pool built from the first regenerate's own real output) calls neither `addPlayersToLeaguePool` nor `removePlayersFromLeaguePool`. The idempotency claim holds for real — this is not a masked bug, just a stale pin that aborted before reaching the real check.

### Gates (real outputs)

**Typecheck** (`npx tsc -b --pretty false`): clean, zero output, exit 0.

**Build** (`npm run build`): exit 0. `✓ 2644 modules transformed` / `✓ built in 10.11s`; PWA precache 183 entries. No new warnings (pre-existing chunk-size warnings only, unrelated).

**6 affected suites + RosterDesigner.test.tsx, twice consecutively, combined:**
```
Run 1: Test Files 7 passed (7) | Tests 141 passed (141) | 44.45s
Run 2: Test Files 7 passed (7) | Tests 141 passed (141) | 43.17s
```
Zero test outside the 26 changed outcome in either run — every other test in the 7 files (poolLock, setup, board, universe, money, AuctionDraft, RosterDesigner) passed on both the baseline-equivalent pass and the fixed pass, confirming the enrichment did not perturb any pinned behavior.

**Full vitest suite (the point of this lane), single run:**
```
Test Files  614 passed | 7 skipped (621)
Tests       9451 passed | 11 skipped (9462)
Duration    200.25s
EXIT=0
```
Before this lane: 610 passed files / 4 failed, 9425 passed tests / 26 failed / 11 skipped (per the bisection diagnosis logs). After: 9425 + 26 = 9451 passed — every previously-failing test now passes, zero new red, zero skips changed. Fully green.

### Deviations / surprises

- CALLFIX Item 5(d)'s hardcoded market-band string needed no re-pin (see table row 21-26) — a genuinely useful discovery: `makePool()` in the AuctionDraft test file prices players by array INDEX, not by the player's actual position/rating, so reshuffling which position a given index holds does not move the dollar figures at all. Documented in the AuctionDraft.test.tsx comment block so a future reader isn't surprised the byte-identical pin survived a fixture rewrite.
- Two "sizing receipt" numeric literals (`totalSlots: 110`) in poolLock.test.tsx were already slightly stale pre-POOLFLOOR (a hand-typed guess rather than the fixture's real derived total); replaced with the dynamically-computed value (`firstFinalIds.length` / `balancedFinalIds.length`) so they can never drift again.
- No STOP conditions hit. No product code touched.
