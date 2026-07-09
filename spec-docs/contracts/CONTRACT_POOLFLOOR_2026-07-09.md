# CONTRACT: POOLFLOOR — position-aware pool supply floors (fixes the production-default stranding)

**Lane:** codex/poolfloor-2026-07-09 (worktree /private/tmp/kbl-poolfloor, base main @ bbf15b97 — includes the merged gauntlet suite).
**Builder:** Codex (xhigh). **Rules:** this worktree only; commit here; no push/merge; independent audit follows; STOP on surprises. Repro-first.

## THE PRODUCT GAP (proven by GAUNTLET-2, STOP evidence in the gauntlet worktree's CONTRACT_GAUNTLET2_2026-07-09.md + committed repro test 45c8abef on branch codex/gauntlet-2026-07-09)
At PRODUCTION DEFAULTS (8 teams, 2 shills, normal budget, default pool sizing), the D2 archetype seating strands: red-sox 18/22 with 4 open slots, and ZERO closers (CP) remain anywhere — live pool 0, passed supply 0, terminal backstop incl. shill-held 0 (2 C, 0 CP). The pool was extracted with exactly minClosers × teams closers (zero slack); competitive hoarding (one team rosters 2 CPs) makes another team's legal 22 (LEGAL_ROSTER.minClosers = 1, src/data/rosterConstruction.ts:37) structurally impossible. The tax squeeze shifted who won the closer races but the fatal condition is SUPPLY. The captain's ruling: fix at the SOURCE — never extract a pool that hoarding can strand.

## THE RULING (build exactly this)
1. **Position-aware supply floor at extraction (engine):** in the pool extraction path (src/engines/poolFromDemand.ts — it already computes archetype-feasibility floors; extend, don't fork), for EVERY position with a hard legal-roster minimum m_P (derive the set + minimums FROM LEGAL_ROSTER/rosterConstruction — do not hardcode a position list; CP with minClosers is the binding case today, C and any other hard minimums get the same law): extracted supply_P >= teams × m_P + slack_P where slack_P = max(2, ceil(teams / 3)). Slack constants live in ONE named export with a doc comment (tunable dial, captain-ruled default). Extraction tops up from the universe's best remaining candidates at that position when short (same source-selection semantics extraction already uses); if the UNIVERSE itself cannot satisfy the floor, extraction reports a structured shortfall (position, needed, available) instead of silently under-supplying.
2. **The sufficiency gate learns positions (gate):** evaluatePoolDemandSufficiency / the meetsFloor machinery (src/utils/leagueBuilderPoolBuilder.ts:387-452 — count-only today) additionally verifies the per-position floors against the ACTUAL extracted pool; a failing position produces a structured reason.
3. **Readiness surface (one line, Text Law ALWAYS-class):** the Draft Setup readiness panel names a failing position floor in plain retro voice (e.g. "THE POOL IS SHORT ON CLOSERS — {n} FOR {teams} CLUBS; RE-EXTRACT"). Wire through the existing readinessReasons machinery for BOTH pool modes (STALEPARITY un-gated them). Keep the DraftSetup page diff minimal — the gate logic lives engine/util-side.
4. **The repro goes green:** port the committed GAUNTLET-2 stranding test (cherry-pick or copy from branch codex/gauntlet-2026-07-09, commit 45c8abef: src/engines/__tests__/auctionGauntletProductionDefaults.test.ts) into THIS worktree as your red-first evidence — it must FAIL (strand) against unmodified code and COMPLETE after the floors land (D2 at production defaults; then also run D3 which the STOP skipped, and report its result). Keep the approved six-draft gauntlet suite green and untouched.

## GUARDRAILS
Economy-critical: pools that already satisfied the floors must be BYTE-IDENTICAL post-change (lock test: a config whose extraction already met all floors produces the identical player list before/after). Do not change reserve pricing, IV, tax, or completion machinery — supply only. The archetype-feasibility floors that exist must keep their semantics (your floors compose with, never replace). Respect the poolSizeMultiplier/user dials — floors are minimums, not caps. Do NOT touch: LeagueBuilderDraftSetup tests (a split lane owns them — if your readiness line needs a test, put it in the engine/util test files or a NEW small test file), WhisperPanel/floor pages, liquidityAwareBidding/auctionCompletionFloor (TAXENGINE lane owns those).

## GATES (paste real outputs)
Project typecheck gate clean; npm run build exit 0; poolFromDemand + leagueBuilderPoolBuilder + poolFeasibility suites green; the ported production-defaults test GREEN (D2 + D3 results reported with the D6-style tables incl. shill-reclamation contribution); the approved auctionGauntlet suite green; byte-identity lock test green. NOT the full suite.

## DELIVERABLE
Contract-first commit; red repro (port) BEFORE the fix; final contract update with evidence (incl. the exact extracted CP/C counts before/after for the D2 config), gate outputs, deviations. Final message: summary + hashes + surprises. UNKNOWN = STOP.

---

## FINAL BUILD UPDATE — Codex, 2026-07-09

### Commits

- Contract-first commit already present at lane start: `5ff10c1e contract(poolfloor): position-aware pool supply floors [captain]`.
- Builder implementation commit: `9fdff0e8 fix(pool): enforce position-aware supply floors [POOLFLOOR]`.

### Files changed

- `src/engines/poolFromDemand.ts`
  - Added `POSITION_SUPPLY_FLOOR_TUNING` as the single named slack dial.
  - Derives hard legal-position floors from `LEGAL_ROSTER`: field positions, catcher depth, starters, relievers, closers.
  - Tops up missing floor supply from the best remaining source candidates, preserving pool source priority semantics.
  - Reports structured `position-floor:{position}` shortfalls when the source universe cannot satisfy a floor.
- `src/utils/leagueBuilderPoolBuilder.ts`
  - `evaluatePoolDemandSufficiency` now optionally evaluates the actual extracted pool's roster-slot shapes and returns `positionFloorReasons`.
- `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx`
  - Existing readiness panel now names the first failing hard-position floor for both design-first and pool-first modes.
- `src/src_figma/app/pages/LeagueBuilderAuctionDraft.tsx`
  - Downstream shared start gate passes actual locked-pool shapes into the same sufficiency helper and avoids misleading count-only blocker copy.
- `src/engines/__tests__/poolFromDemand.test.ts`
  - Added CP floor top-up, structured shortfall, and byte-identity/no-op coverage.
- `src/utils/tests/poolDemandSufficiency.test.ts`
  - Added structured position-floor reason coverage.
- `src/engines/__tests__/auctionGauntletProductionDefaults.test.ts`
  - Ported GAUNTLET-2 production-default repro from `45c8abef`, then added extraction supply evidence table.

### Red-first evidence

Command:

```bash
NODE_ENV= npx vitest run src/engines/__tests__/auctionGauntletProductionDefaults.test.ts --reporter=verbose
```

Pre-fix result:

```text
1 failed
D2 GAUNTLET-2 D2 production-default shills transition rejected from PASSED: auction-uncompletable;
terminalShortfall=red-sox; real open rosters red-sox:18+4 budget=54725.53 tax=77352.6
remainingPool=0 remainingClosers=0;
passedSupply total=29/C=0/SP=9/RP=13/CP=0;
terminalBackstopSupply total=48/C=2/SP=17/RP=14/CP=0
```

### Extraction supply evidence

Post-fix production-default extraction table from the ported GAUNTLET-2 test:

```text
draft  extractedPoolSize  primaryCBeforeFloor  primaryCAfterFloor  catcherDepthAfterFloor  cpBeforeFloor  cpAfterFloor
D2     223                20                   20                  21                      8              11
D3     223                20                   20                  21                      8              11
```

The D2 binding change is exactly `CP 8 -> 11` (`8 teams * minClosers 1 + slack 3`). C was already above floor and stayed byte-stable for the floor pass (`primary C 20 -> 20`, catcher depth 21).

### Green evidence

Typecheck:

```bash
npx tsc -b --pretty false
```

Result: exit 0, no output.

Build:

```bash
npm run build
```

Result:

```text
tsc -b && vite build
✓ 2644 modules transformed.
✓ built in 10.77s
PWA v1.2.0
precache 183 entries (5333.44 KiB)
```

Vite emitted existing chunk/dynamic-import warnings only; build exit 0.

Focused pool suites:

```bash
NODE_ENV= npx vitest run src/utils/tests/poolDemandSufficiency.test.ts src/engines/__tests__/poolFromDemand.test.ts src/engines/__tests__/poolFeasibility.test.ts --reporter=verbose
```

Result:

```text
Test Files  3 passed (3)
Tests       79 passed (79)
```

Ported production-default GAUNTLET-2 repro:

```bash
NODE_ENV= npx vitest run src/engines/__tests__/auctionGauntletProductionDefaults.test.ts --reporter=verbose
```

Result:

```text
Test Files  1 passed (1)
Tests       1 passed (1)
D2 summary: surfacedLots=270, multiBidLots=98, totalChargedTax=3058042.41, shillReclaimedFills=2, shillReclaimedCost=29003.84
D3 summary: surfacedLots=279, multiBidLots=88, totalChargedTax=3961916.95, shillReclaimedFills=0, shillReclaimedCost=0
```

Approved six-draft auction gauntlet:

```bash
NODE_ENV= npx vitest run src/engines/__tests__/auctionGauntlet.test.ts --reporter=verbose
```

Result:

```text
Test Files  1 passed (1)
Tests       1 passed (1)
AUCTION GAUNTLET SUMMARY: D1-D6 all complete; feasibleShortfallAtFinal=0 in the D6 table.
```

Byte-identity lock test:

```text
src/engines/__tests__/poolFromDemand.test.ts > leaves an already floor-sufficient selected pool byte-identical: PASS
```

### Deviations / surprises

- Physical worktree path in this Codex session was `/private/tmp/kbl-poolfloor2`, while the contract text names `/private/tmp/kbl-poolfloor`. Branch was correct: `codex/poolfloor-2026-07-09`.
- `npx tsx -e ...` was attempted for a one-off diagnostic but `tsx` was not installed locally and network is blocked; no repo state changed. The diagnostic was moved into the Vitest repro output instead.
- No push or merge performed.
