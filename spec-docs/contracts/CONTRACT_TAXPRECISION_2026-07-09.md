You are a builder lane on KBL Tracker (React+TS+Vite). Work ONLY in your assigned worktree on its branch; commit there; do NOT push or merge. Independent audit follows. node_modules if missing: `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules`. Base: main @ c0a24363 (includes TAXTEETH — the tax now drains real budgets).

FIRST COMMIT: write this entire prompt verbatim to spec-docs/contracts/CONTRACT_TAXPRECISION_2026-07-09.md and commit before any code change.

═══ LANE: TAXPRECISION — one tax truth: the auction reads the archetype's EXACT cap shifts (captain ruling 2026-07-09) ═══
CONFIRMED (by the TEAMIDGUARD audit, file:line): `auctionShiftedCapsWithBaseCaps` (src/engines/auctionLuxuryTax.ts:22-33) STRIPS `rawShift` from a team's capIdentity and shifts luxury caps off the coarse `increase`/`decrease` modifier vocabulary (src/data/tierParams.ts CAP_MODIFICATION_FRACTIONS), with `normalizeIdentityMods` (leagueConstruction.ts:143) truncating to 2 modifiers — so an archetype with 3 boosts (at least `rangy-defenders`) has its third boost IGNORED by the auction tax. Meanwhile the SNAKE draft path (LeagueBuilderSnakeDraft.tsx:129,335) and the canonical `shiftLuxuryCaps` (leagueConstruction.ts:212-215, which short-circuits on `rawShift`) honor the archetype's exact ratified percentages (the spec quotes exact per-category cap shifts — spec-docs/TEAM_ARCHETYPES_24.md:12-47, SCOUTING_INTELLIGENCE_SPEC.md §3). The ruling: the auction tax engine uses the SAME precise semantics — `rawShift` wins when present; the coarse table remains the fallback for capIdentities that lack it. Since TAXTEETH, this is real settled dollars, not display.

═══ ITEM 1 — the fix (repro-first MANDATORY) ═══
FIRST the failing tests against unmodified code: (a) build a capIdentity via the real `archetypeToCapIdentity` for `rangy-defenders` (3 boosts), assemble a top-heavy roster that exceeds the third boosted category's UNSHIFTED cap but stays under its rawShift-shifted cap → assert the auction marginal tax is 0 (it will wrongly charge today because the third boost is dropped); (b) a 2-boost archetype whose rawShift percentage differs from the coarse table step → assert the auction tax equals the tax computed with the exact rawShift caps (will differ today). Run, capture the failures into the contract. THEN fix: `auctionShiftedCapsWithBaseCaps` (and any sibling auction-side cap-shift helper) delegates to the same rawShift-short-circuit semantics as `shiftLuxuryCaps` — prefer literally CALLING the canonical function over reimplementing (if its signature doesn't fit, refactor minimally; zero formula duplication). The coarse path must remain BYTE-IDENTICAL for capIdentities without rawShift (lock with a test comparing pre/post outputs for a coarse-only identity).

═══ ITEM 2 — ripple verification ═══
The corrected caps flow into: per-lot projectedTax (useAuctionDraft.ts:207 area), settlement drain, sessionBidCeiling reservation, whisper TRUE COST + fallbackLegalMax (rosterIntelligencePayload.ts:363-370), and the F9 one-ceiling invariants. Re-run all their suites; update any test whose expected dollar values legitimately change because archetype fixtures now tax precisely (each such update justified in the contract with the before/after arithmetic — an expected-value change WITHOUT arithmetic justification is a red flag). The TRUE COST === settlement drain coherence test must still pass — both sides move together since both read the same engine.

═══ ITEM 3 — the 24-archetype conformance sweep ═══
One table test: for EVERY archetype in the catalog, assert the auction-path shifted caps now equal the canonical `shiftLuxuryCaps(rawShift)` caps exactly (this permanently locks "one tax truth" and would have caught this bug at birth).

═══ OUT OF SCOPE ═══
farmCapIdentity (advisory-only, separately ticketed); tax constants/thresholds; the untaxed cleanup paths (ticketed); any UI copy; snake path (already correct — but add it to the Item 3 conformance test if cheap).

═══ GUARDRAILS ═══
Economy-critical bar: exact-number assertions everywhere; coarse-only identities byte-identical (the vast majority of hand-built teams); no engine formula duplication. Do NOT touch files owned by in-flight lanes: LeagueBuilderTeams.tsx (TEAMIDGUARD, merging), WhisperPanel.tsx/AuctionStage.tsx/floor page LAYOUT (FLOORREFIT lane owns those — your floor-page diff must be zero; if a ripple seems to require touching them, STOP and report).

═══ GATES (paste real outputs) ═══
npx tsc -b clean; npm run build exit 0; focused suites: auctionLuxuryTax, auctionLuxuryTaxSettlement, auctionStateMachine, auctionCompletionFloor, useAuctionDraft, rosterIntelligencePayload, liquidityAwareBidding (transitively), LeagueBuilderSnakeDraft if it has tests. NOT the full suite.

═══ DELIVERABLE ═══
Contract-first; failing-repro commit BEFORE the fix; final contract update with evidence, the conformance table result, before/after arithmetic for every changed expected value, gate outputs. Final message: summary + hashes + surprises. UNKNOWN = STOP and report.

───────────────────────────────────────────────────────────────────────────
FINAL EVIDENCE (filled in by the builder lane, 2026-07-09)
───────────────────────────────────────────────────────────────────────────

CORRECTION TO THE CONFIRMED CITATION (surprise, reported not silently fixed):
The prompt's root-cause citation is partially wrong. `normalizeIdentityMods`
does NOT live at leagueConstruction.ts:143 (that line is `rawDeltaMagnitude`)
and it does NOT run in the archetype path at all — it lives in
src/src_figma/app/pages/LeagueBuilderTeams.tsx:135 and only truncates the
*hand-picked* (non-archetype) identity editor's UI selection to 2 slots, a
separate, correctly-scoped UI constraint. `archetypeToCapIdentity`
(src/engines/archetypeIdentity.ts:31-47) never truncates: `increase`/
`decrease` carry ALL of an archetype's boost/nerf names (3 for
rangy-defenders), and `identityCapShift`'s coarse fallback loop
(leagueConstruction.ts:217-234) processes every name in those arrays — none
is literally "dropped". The real mechanism: `auctionShiftedCapsWithBaseCaps`
(src/engines/auctionLuxuryTax.ts, pre-fix lines 22-32) rebuilt a NEW
`{ increase, decrease }` object from `capIdentity` and never forwarded
`capIdentity.rawShift`, so `identityCapShift`'s `if (identity.rawShift)`
short-circuit (leagueConstruction.ts:212) always fell through to the coarse
per-name `CAP_MODIFICATION_FRACTIONS` lookup for EVERY archetype-derived
identity, on EVERY boosted/nerfed stat — not selectively the "third" one.
The observable symptom (auction ignores an archetype's exact ratified cap
shift) and the captain's ruling (rawShift must win, exactly like
`shiftLuxuryCaps`/the snake draft) are both confirmed correct; only the
specific truncation mechanism named in the citation was wrong. Root cause
verified by direct code read plus the repro tests below, not assumed.

REPRO (failing tests against unmodified code, commit c986aa2b, before the fix):
  Test 1 -- rangy-defenders (boosts: SPD, ARM, FLD; rawShift.SPD = 0.12 vs
  coarse CAP_MODIFICATION_FRACTIONS.SPD.SPD = 0.045455). Standard-tier
  hitters/SPD base cap = 588.9. Coarse-shifted cap = 588.9 x 1.045455 =
  615.668; exact rawShift-shifted cap = 588.9 x 1.12 = 659.568. An 8-hitter
  roster at SPD 80 each (top-8 sum = 640) sits strictly between those two
  numbers -- correct tax is 0, unmodified code charged 78,014.21.

    AssertionError: expected 78014.20714612913 to be +0 // Object.is equality

  Test 2 -- murderers-row (boosts: POW, CON; nerf: SPD; rawShift.POW = 0.075
  vs coarse CAP_MODIFICATION_FRACTIONS.POW.POW = 0.02). An 8-hitter
  POW-99 roster's tax computed off the exact rawShift-shifted caps is
  3,009,046.14; unmodified code (coarse-shifted caps) charged 3,946,642.52 --
  937,596.38 too much.

    AssertionError: expected 3946642.5213884334 to be close to
    3009046.1393780643, received difference is 937596.3820103691,
    but expected 5e-9

  Test 3 -- 24-archetype x 3-tier conformance sweep: auctionShiftedCaps
  output did not deep-equal shiftLuxuryCaps(rawShift) for archetype #1
  (murderers-row) at the very first tier checked (juiced), e.g. hitters/POW
  cap 626.076 (coarse) vs 659.835 (exact) -- confirming the divergence is
  universal across the catalog, not isolated to the two hand-picked
  fixtures above.

  Full run: `npx vitest run src/engines/__tests__/auctionLuxuryTax.test.ts`
  -> Test Files 1 failed (1) / Tests 3 failed | 5 passed (8). The 5 passing
  tests are the pre-existing suite (untouched, still exercising the
  no-rawShift coarse path) plus the new byte-identical lock test, which
  already passed pre-fix (as expected -- it only exercises the coarse path).

  Repro committed at c986aa2b (test-only, before any src/ change).

THE FIX (commit follows c986aa2b, src/engines/auctionLuxuryTax.ts only):
  Before:
    return capIdentity
      ? shiftLuxuryCaps(baseCaps, {
          increase: capIdentity.increase,
          decrease: capIdentity.decrease,
        })
      : baseCaps;
  After:
    return capIdentity ? shiftLuxuryCaps(baseCaps, capIdentity) : baseCaps;
  Delegates directly to the canonical `shiftLuxuryCaps` with the full
  `TeamCapIdentity` object (structurally a superset of the `IdentityComposition`
  it expects: same `increase`/`decrease`/`rawShift`, plus an inert extra
  `bandPriorities` field `shiftLuxuryCaps` never reads) instead of
  reconstructing a stripped copy. Zero formula duplication -- no cap-shift
  math was reimplemented, only the call site changed. This is now IDENTICAL
  in shape to the snake draft's own call (LeagueBuilderSnakeDraft.tsx:129,335:
  `shiftLuxuryCaps(pool.luxuryCaps, currentTeam.capIdentity)`).

CONFORMANCE TABLE RESULT (Item 3, post-fix):
  24 archetypes x 3 tiers (juiced/standard/nerfed) = 72 checks, all pass:
  `auctionShiftedCaps(archetypeToCapIdentity(arch), tier)` deep-equals
  `shiftLuxuryCaps(LUXURY_CAP_TABLES[tier], archetypeToCapIdentity(arch))`
  for every archetype in HISTORICAL_ARCHETYPES, every tier. Catalog size
  (24) is itself asserted so a future roster change can't silently shrink
  coverage.

RIPPLE (Item 2) -- NO expected-value changes were needed anywhere:
  Every ripple suite in the gate list (auctionLuxuryTaxSettlement,
  auctionStateMachine, auctionStateMachineOneChance, auctionCompletionFloor,
  useAuctionDraft, rosterIntelligencePayload, liquidityAwareBidding, plus
  archetypeIdentity) passed unmodified, before and after the fix, with their
  existing fixtures. Traced why: none of those suites build a capIdentity via
  `archetypeToCapIdentity` (grep-confirmed -- only auctionLuxuryTax.test.ts
  and archetypeIdentity.test.ts import it); they either pass `capIdentity:
  undefined`, hand-build a no-rawShift `{ increase, decrease }` identity, or
  (rosterIntelligencePayload / auctionLuxuryTaxSettlement) inject a raw
  `marginalTax`/`projectedTax` number directly rather than computing it from
  a capIdentity. So the coarse path -- the only path those fixtures ever
  exercised -- is unchanged by this fix (proven by the "coarse-only identity
  stays byte-identical" lock test). This is a genuine zero-ripple outcome,
  not a skipped check: 146 tests across 9 files, all green, both before and
  after, confirmed by two full runs.
  LeagueBuilderSnakeDraft.tsx has no test file (confirmed via find) -- not
  addable to the conformance test without importing a .tsx page component
  into an engine-level vitest run; the snake path's correctness is instead
  established by direct citation (LeagueBuilderSnakeDraft.tsx:129,335 already
  calls `shiftLuxuryCaps(caps, capIdentity)` verbatim, unchanged by this lane).
  WhisperPanel.tsx / AuctionStage.tsx / LeagueBuilderTeams.tsx: zero diff
  (confirmed via `git status --short` / `git diff --stat` showing only
  src/engines/auctionLuxuryTax.ts + the one test file changed).

GATES (real outputs):
  npx tsc -b --clean            -> exit 0 (contract said "tsc -b clean";
                                    literal `tsc -b clean` is invalid tsc
                                    syntax -- TS5083, "clean" read as a
                                    project path -- ran `tsc -b --clean`
                                    then a full `tsc -b` rebuild instead)
  npx tsc -b                    -> exit 0, no errors
  npm run build                 -> exit 0 ("built in 11.14s"; PWA precache
                                    185 entries; pre-existing >500kB chunk
                                    warnings only, unrelated to this diff)
  Focused suite (9 files, run twice -- pre-fix red then post-fix green):
    auctionLuxuryTax.test.ts, auctionLuxuryTaxSettlement.test.ts,
    auctionStateMachine.test.ts, auctionStateMachineOneChance.test.ts,
    auctionCompletionFloor.test.ts, liquidityAwareBidding.test.ts,
    useAuctionDraft.test.ts, rosterIntelligencePayload.test.ts,
    archetypeIdentity.test.ts
    -> Test Files 9 passed (9) / Tests 146 passed (146)

DIFF SURFACE: src/engines/auctionLuxuryTax.ts (13 insertions, 6 deletions --
  1 comment block + the one-line fix) + src/engines/__tests__/
  auctionLuxuryTax.test.ts (new imports + 5 new tests: 3 repro/fix,
  1 byte-identical lock, 1 conformance sweep). No other file touched.

SURPRISES:
  1. The citation correction above (normalizeIdentityMods location/role).
  2. The fix was a single-line change (delegate instead of reconstruct) --
     no "sibling auction-side cap-shift helper" was found; grep confirmed
     auctionLuxuryTax.ts is the only engine-side place that ever rebuilt
     `{ increase, decrease }` from a capIdentity.
  3. Zero downstream expected-value drift -- every ripple suite's fixtures
     turned out to only ever exercise the coarse (no-rawShift) path, so
     there is no before/after arithmetic table to present beyond the two
     repro tests' own numbers above.
