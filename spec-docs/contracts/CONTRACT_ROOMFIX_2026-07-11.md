# CONTRACT ROOMFIX — GO lands in a dead room (JK walkthrough blocker #2)
Captain: Fable · Builder: Codex gpt-5.6-sol xhigh · Branch: codex/snake-roomfix
(Re-dispatch after a machine crash wiped the first lane; the independent opus trace
below is COMPLETE and CONFIRMED — build directly to it.)

## THE FIELD REPORT (JK, real browser, 2026-07-11)
Created a snake-format league via the new DRAFT FORMAT dropdown → /snake-setup →
completed the cards (the seating proof said ready) → pressed START THE DRAFT → the room
shows "THE ROOM IS NOT READY / FINISH SNAKE DRAFT SETUP FIRST."
That panel renders on `!league || !pool || !session` (SnakeDraftRoom.tsx:817).

## THE CONFIRMED DIAGNOSIS (independent opus trace, evidence-verified)
THE POOL LEG IS NULL. Chain:
- Room reads getRegisteredPool(league.id) (SnakeDraftRoom.tsx:333) with NO fallback;
  registeredPools store is keyed by leagueId (leagueBuilderStorage.ts:1124, store def
  :1000-1001); the ONLY production writers are registerLeaguePoolForLeague
  (leagueBuilderPoolRegistration.ts:127) and lockLeaguePool/unlockLeaguePool
  (leagueBuilderPoolBuilder.ts:376,416).
- SnakeDraftSetup.startDraft (SnakeDraftSetup.tsx:283-322) calls NONE of them — it only
  writes snakeSetup.poolPlayerIds into the session and navigates.
- The auction flow never hits this: useAuctionDraft.ts:573-574 self-heals with
  `existingPool ?? registerLeaguePool(leagueId)`, and the auction Draft Setup locks a
  pool explicitly (LeagueBuilderDraftSetup.tsx:3168).
- The S7 gauntlet masked the gap by calling saveRegisteredPool by hand
  (snakeSeasonGauntlet.integration.test.ts:339).
- LEAGUE and SESSION legs are NOT null (query param matches; both sides use
  `${leagueId}::startup-mlb-draft::1`).

## THE FIX (build exactly this)
1. REPRO FIRST: a page-level integration test through REAL storage reproducing JK's
   exact flow: create a snake-format league (the real storage shape the League form
   writes) → drive SnakeDraftSetup's real handlers to a ready room → startDraft → mount
   SnakeDraftRoom with the navigation target setup actually used → RED against current
   code with instrumentation naming the null leg (must name `pool`).
2. FIX AT THE GO SEAM: SnakeDraftSetup.startDraft registers the pool BEFORE creating
   the session — SEEDED FROM THE USER'S PICKED MEMBERSHIP (proofPool /
   snakeSetup.poolPlayerIds), NOT registerLeaguePoolForLeague's league-assignment
   default (which may not contain picked historical/legends cards → the panel would
   clear but the room would open EMPTY — the trap behind the trap). Mirror the auction
   locked-pool pattern (explicit player-id seeding) via the CANONICAL registration/lock
   helpers — no hand-built pool records (adapter-reuse law).
3. Ensure every picked id carries a real IV in the registered pool (the room prices
   and seats from row.iv — SnakeDraftRoom.tsx:380,390,402,438); assert in the crawl.
4. Verify resolveLockedSeat derives a usable capIdentity from snakeSetup.clubs[].
   archetypeId alone (SnakeDraftRoom.tsx:409) — the room's live seating proof must not
   diverge from the setup card's READY.
5. CRAWL ONWARD in the same test: first pick through the ritual reducer states, desk
   candidates NON-EMPTY, bills finite, one guide ask — extend until the room is
   provably playable so the NEXT dead-end (if any) surfaces now.
6. The dead panel copy: name WHICH leg is missing in plain words (copy law) instead of
   the one generic line.

## LAWS
Auction files frozen (the registration helpers are shared storage — consume, don't
fork; useAuctionDraft/LeagueBuilderDraftSetup untouched) · engines done · reducer
untouchable · no fixture heals in the repro · copy law · UNKNOWN = STOP.

## GATES (real output in your report)
1. tsc clean. 2. build exit 0. 3. The repro green + all snake suites green. 4. Auction
suites green. 5. ONE full vitest (known solo-flakes verify solo).

## PROTOCOL
No git write commands. Repro red FIRST (paste the red output naming the null leg).
Builder report appended here: the seam diff summary with file:line, gate outputs,
auditor attack list.

## BUILDER EXECUTION — RED REPRO (2026-07-11)

Command:
`NODE_ENV= npx vitest run src/src_figma/__tests__/pages/SnakeDraftRoom.registration.integration.test.tsx --reporter=verbose`

Real-storage page flow reached READY, invoked `SnakeDraftSetup.startDraft`, and followed its real
navigation target to `/snake-room?leagueId=roomfix-snake-league`. Instrumentation read all three
room legs from their production storage APIs. League and session were present; the run failed on
the required named null leg before any production fix:

```text
FAIL  src/src_figma/__tests__/pages/SnakeDraftRoom.registration.integration.test.tsx
AssertionError: ROOMFIX null leg: pool: expected [ 'pool' ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "pool",
+ ]

Test Files  1 failed (1)
Tests       1 failed (1)
```

## BUILDER REPORT — SEEDED GO FIX + PLAYABLE ROOM (2026-07-11)

### Seam diff summary

- `src/src_figma/app/pages/SnakeDraftSetup.tsx:132-152` adds the snake-only adapter over the
  canonical pool helpers. It unlocks a stale locked pool when necessary, registers the default
  record to obtain canonical IV rows, adds the picked ids missing from default league membership,
  removes default-only ids, and locks against the exact picked-id set. It does not hand-build a
  registered-pool record.
- `src/src_figma/app/pages/SnakeDraftSetup.tsx:314-336` awaits that exact picked-membership
  registration at GO before creating the MLB draft session, then writes the same id list to
  `snakeSetup.poolPlayerIds`.
- `src/src_figma/app/pages/SnakeDraftRoom.tsx:74-87,830-833` names each missing room leg in plain
  words and gives the user a concrete recovery action.
- `src/src_figma/__tests__/pages/SnakeDraftRoom.registration.integration.test.tsx:195-320` is the
  page-level real-IndexedDB repro/crawl. The target snake league begins with zero player membership;
  the available players belong only to a source legends league. The test drives the real setup
  controls, selects one Babe Ruth version, follows setup's actual navigation target, mounts the room,
  and proves exact registered membership, excluded alternate version, positive finite IVs, locked
  pool, archetype-derived cap identity, non-empty private desk, finite plan bills, one guide answer,
  and one persisted pick through the cover/arm/hold/record/advance ritual.

The trap-behind-the-trap is covered directly: the target league's default assignment membership is
empty, while the registered pool after GO is byte-for-byte equivalent as an id set to the user's
picked `snakeSetup.poolPlayerIds`. A default-only registration would therefore fail this crawl even
if it made the room's pool leg non-null.

### Gate output

**Gate 1 — TypeScript**

Command: `NODE_ENV= npx tsc -b --pretty false`

```text
EXIT_CODE=0
```

**Gate 2 — production build**

Command: `NODE_ENV= npm run build`

```text
> kbl-tracker@0.0.0 build
> tsc -b && vite build
✓ 2685 modules transformed.
✓ built in 34.86s
PWA v1.2.0
precache  206 entries (5531.64 KiB)
EXIT_CODE=0
```

Vite emitted the existing dynamic/static-import and chunk-size warnings; neither was an error.

**Gate 3 — repro plus every snake-named suite**

Command: all 26 `snake|Snake` test files under `src`, including the ROOMFIX repro.

```text
Test Files  26 passed (26)
Tests       110 passed (110)
Duration    14.03s
```

Focused ROOMFIX command/output:

```text
✓ names each missing room leg in plain words
✓ registers the picked pool at GO, opens the room, and records the first pick through the real ritual
Test Files  1 passed (1)
Tests       2 passed (2)
```

**Gate 4 — every auction-named suite; auction source frozen**

Command: all 36 `auction|Auction` test files under `src`.

```text
Test Files  36 passed (36)
Tests       452 passed (452)
Duration    144.46s
```

The run includes `auctionGauntlet.test.ts` (114.06s),
`auctionGauntletProductionDefaults.test.ts` (57.16s), and
`auctionGauntletDiag.test.ts` (138.30s). `git diff --name-only | rg -i auction` produced no output;
no auction file changed.

**Gate 5 — one full Vitest, then the sole batch failure solo**

Command: `NODE_ENV= npx vitest run --reporter=json --outputFile=/tmp/roomfix-full-vitest.json`

```text
Test result files: 655
Tests: 9677 total; 9661 passed; 1 failed; 15 skipped
Duration: 238.63s
Failed assertion file:
  src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.poolLock.test.tsx
  reroll preserves roster-design pinned players as hard keeps
Failure message: Error: STACK_TRACE_ERROR (runner collection stack only)
EXIT_CODE=1
```

Required solo verification:

```text
NODE_ENV= npx vitest run src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.poolLock.test.tsx --reporter=verbose
Test Files  1 passed (1)
Tests       21 passed (21)
Duration    33.98s
```

The only full-run red was batch pressure/collection behavior and passed unchanged solo. No ROOMFIX,
snake, or auction assertion failed in the full run.

### Auditor attack list

1. Remove or move the GO registration below session creation; the repro must again name `pool` as
   the null leg or expose a partially-created session.
2. Replace exact picked-id seeding with default league-assignment registration; the zero-membership
   target must open empty and the exact-set/Babe Ruth assertions must fail.
3. Omit add/remove reconciliation or locking; exact membership, selected-version exclusion, and
   `locked: true` must fail.
4. Feed any picked id without canonical pricing; the positive finite-IV assertion and finite room
   bills must fail.
5. Drop `snakeSetup.clubs[].archetypeId` during save or ignore it in the room; the locked seat must
   regress to BALANCED or lose its usable cap identity.
6. Break the private board seed, candidate path, or plan economics; desk presence, TRUE COST, and
   finite PLAN COST/TAX/CUSHION must fail.
7. Break the guide surface or the ritual reducer/persistence chain; the guide answer or persisted
   `completedPicks[0]`/`currentPickIndex === 1` checkpoint must fail.
8. Exercise re-entry against both an exact locked pool and a mismatched locked pool; confirm the
   exact case is idempotent and the mismatch is canonically unlocked/reconciled/relocked.
9. Attack each missing-leg combination; copy must name LEAGUE, SAVED DRAFT POOL, or DRAFT SESSION,
   never fall back to the old generic instruction.
10. Recheck the frozen boundary: no auction source diff, and the full auction suite remains green.

---

## AUDIT — opus, independent, 2026-07-11 — VERDICT: APPROVE-WITH-NOTES
Auditor re-ran gates AND neutralized the fix to prove the repro catches the real bug
(exact RED naming `pool`, then byte-exact restore). Reconciliation canonical-helper-only
w/ idempotent re-entry + mismatch relock; atomicity safe-fail (lock guard throws BEFORE
session creation — no orphan session); trap-behind-the-trap guard real (zero-default-
membership league + exact-set + version-exclusion assertions); capIdentity honest;
missing-leg copy grammar correct; frozen sweep exact (2 source files + test + contract).
NOTES (non-blocking): (1) `if (league)` guard could silently skip registration under a
test-seam injection — latent fragility; (2) toRemove branch + mismatched-locked-pool
re-entry unexercised by tests (sound by inspection); (3) removePlayersFromLeaguePool
roster side-effect edge for pre-rostered pool-first snake leagues; (4) startDraft has
no catch → a lock throw is a silent no-op (safe, pre-existing pattern, no toast).
FORWARD (UNIFYSETUP): lift registerPickedSnakePool wholesale; keep registration ahead
of session creation; snakeRoomMissingLegCopy reusable as-is.
