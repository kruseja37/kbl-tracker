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
