You are a builder lane on KBL Tracker. Work ONLY in your assigned worktree on its branch; commit there; do NOT push or merge. Independent audit follows. node_modules if missing: `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules`. Base: main @ 4e6cfd33 (includes the DraftSetup test SPLIT — the old mega test file is now 5 per-zone files + LeagueBuilderDraftSetup.testUtils.ts; write/extend tests THERE).

FIRST COMMIT: write this entire prompt verbatim to spec-docs/contracts/CONTRACT_SETUPTAX_2026-07-09.md and commit before any code change.

═══ LANE: SETUPTAX — the setup screens stop promising what settlement won't honor (captain ruling; closes the confirmed setup tax-blindness) ═══
CONFIRMED (traced, file:line): every HEADLINE affordability signal on Draft Setup is salary-only while the tax now drains real auction budgets — Cap Fit chip (poolAffordabilityDiagnostic, no tax anywhere), THE CLUB CHECK's main verdict "BUILDS · $X TO SPARE" (evaluateRosterDesign, salary sum at rosterDesignFeasibility.ts:503; deferral comment :14-15), THE MONEY solvency banner (draftSetupSolvencyBannerText, same engine), the shared-pool recheck (seatAllClubs assemblyCost, salary-only). Meanwhile buildBest22Target ALREADY computes the tax-correct picture per club (totalTax, allIn = salary+tax, solvent = salary+tax <= budget, feasible — best22Target.ts:279-282) and it renders only as a small secondary "TARGET … ALL-IN" text. Materiality: an average-speed Murderers' Row roster owes ~$1.33M tax vs a $1.21M juiced budget while every headline shows green.

THE RULING — v1 = SURFACE HONESTY, not an engine rewrite. Reuse the tax-aware numbers already computed; zero new tax math; the evaluateRosterDesign floor engine stays salary-only BY DESIGN (it answers "can the cheapest legal 22 be assembled" — completion is untaxed-clamped; document this in a one-line comment replacing the stale deferral wording). Four items:

1. **THE CLUB CHECK row goes two-truth.** When a club has an identity (target exists): the row's verdict can no longer read as unqualified green when the tax-aware target is insolvent — if target.feasible is false due to solvency (salary+tax > budget), the row's TONE reflects it and the copy names the cause: "TARGET OVERSHOOTS WITH TAX · $X ALL-IN vs $Y BUDGET" (exact figures from target.allIn/budget). The salary-floor verdict ("the cheapest legal 22 builds") stays as the secondary clause — the floor truth and the target truth BOTH visible, correctly labeled. No identity → row unchanged (floor-only, as today).
2. **Cause-naming in the identity strip.** designVerdict.ts:64's blended line ("THIS POOL CAN'T EXPRESS YOUR IDENTITY UNDER THE CAP — THE FLOOR STILL BUILDS") splits its causes: when the target's infeasibility is tax-driven (solvent false while legality/floor pass), the line says TAX explicitly ("YOUR IDENTITY'S TARGET BUILD OWES $T TAX — $A ALL-IN OVER YOUR $B CAP; THE FLOOR STILL BUILDS"); other causes keep existing wording. Check the split test files for characterized strings before editing copy — relocations/extensions per Text Law ALWAYS-class (these are state-triggered warnings).
3. **THE MONEY panel gains one tax line.** Under the existing solvency banner logic: when ANY club's tax-aware target is insolvent, one ALWAYS-class line lists the clubs: "TAX WATCH: {clubs} — identity targets overshoot the cap after tax." Reuses target results already computed per club (liveClubVerdicts pipeline); no new engine calls in a hot loop (memoize with the existing verdict recompute).
4. **Archetype market outlook annotates tax.** The outlook's "N% buildable" (whisper-sweep finding D1) already computes built.totalTax then discards it — surface it: when totalTax > 0, append "· ~$T TAX AT TARGET" to the existing outlook line. One-line wiring.

REPRO-FIRST (items 1-3): fixtures with a tax-insolvent target (build via real archetypeToCapIdentity + a stars-heavy design; assert today's green/silent behavior as red-expected against correct expectations), then fix → green. Item 4: simple render assertion.

═══ GUARDRAILS ═══
Zero engine-math changes (best22Target/evaluateRosterDesign/poolAffordabilityDiagnostic formulas untouched — display + copy + one comment only; if a value you need isn't already exposed on the payloads those engines return, STOP and report rather than extending engine outputs). The split test files are the canon — extend them using their testUtils helpers and cured timing patterns (findBy retry-style; the suite's conventions). Characterized-string discipline: grep the split tests before touching ANY existing copy; extensions are additive clauses, never rewording of locked strings. Do NOT touch: WhisperPanel/floor pages, liquidityAwareBidding/auctionCompletionFloor (TAXENGINE lane owns), poolFromDemand/leagueBuilderPoolBuilder (POOLFLOOR lane owns — your Cap Fit chip work is COPY/annotation only, not the diagnostic engine), RosterDesigner shortlist/swap engines (deferred v1.1 by JK boundary — but RosterDesigner.tsx display of the same designVerdict copy updates WITH item 2 since they share the module).

═══ GATES (paste real outputs) ═══
Project typecheck clean; npm run build exit 0; the five split DraftSetup suites + RosterDesigner + designVerdict tests (if separate) green; NOT the full suite.

═══ DELIVERABLE ═══
Contract-first; red repros BEFORE fixes; final contract update with per-item evidence + gate outputs + deviations. Final message: summary + hashes + surprises. UNKNOWN = STOP.

───────────────────────────────────────────────────────────────────────────────────────────────
FINAL EVIDENCE (posted after build) — 2026-07-09
───────────────────────────────────────────────────────────────────────────────────────────────

FILES TOUCHED (full diff surface, nothing else):
- src/src_figma/app/components/leagueBuilder/designVerdict.ts (new pure helpers + Item 2's
  `designTargetStripCopy` branch)
- src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx (Items 1/3/4 wiring — display only)
- src/engines/rosterDesignFeasibility.ts (THE RULING's one-comment replacement, doc-block only)
- src/src_figma/__tests__/components/designVerdict.test.ts (Items 1/2 pure-function tests)
- src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.universe.test.tsx (Item 1 render test)
- src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.money.test.tsx (Items 3/4 render tests)
Confirmed via `git diff --stat` that best22Target.ts, evaluateRosterDesign's code (only its
doc-comment moved), poolAffordabilityDiagnostic.ts, RosterDesigner.tsx, leagueBuilderPoolBuilder.ts,
poolFeasibility.ts, archetypeBalanceSimulator.ts, auctionPoolSizing.ts are BYTE-IDENTICAL to base —
zero engine-math changes, exactly as guardrailed.

DEVIATION FROM THE STOP-CLAUSE (declared, not silent): item 1's tax-overshoot signal is
`!target.feasible && target.allIn > target.budget` — this reads ONLY fields already exposed on
Best22Target (allIn, budget, feasible; best22Target.ts:44-48), no engine output was extended. This
is exactly the arithmetic the contract's own §1 uses to define the case ("salary+tax > budget"),
so it required no engine change and no STOP.

PER-ITEM EVIDENCE

Item 1 — THE CLUB CHECK two-truth row.
  isBest22TargetTaxOvershoot/clubCheckToneWithTaxOverride/clubCheckTaxOvershootCopy/
  clubCheckFloorSecondaryCopy added to designVerdict.ts; clubCheckRows computation in
  LeagueBuilderDraftSetup.tsx now swaps primary/secondary + escalates tone green→amber ONLY
  when targetState === "infeasible" AND allIn > budget. Verified the PRE-EXISTING characterized
  test ("renders CLUB CHECK target segments without changing the floor dot gate",
  universe.test.tsx) still asserts a GREEN dot for its `feasible:false, allIn:45_000` fixture
  (budget stays the untouched default 1_000_000, so allIn < budget — not tax-driven) — confirms
  the new branch is additive, not a rewording of the existing infeasible-for-another-reason case.
  New repro: "SETUPTAX: CLUB CHECK row de-greens when the identity TARGET is insolvent from tax
  alone" (universe.test.tsx) — RED against pre-fix source (waitFor timeout, "TARGET OVERSHOOTS
  WITH TAX" never appears), GREEN after the fix (dot amber, primary copy names the tax figures,
  secondary "FLOOR BUILDS ..." survives).

Item 2 — cause-naming in the identity strip (designTargetStripCopy).
  Pinned in designVerdict.test.ts: the byte-identical pre-existing assertion
  (`designTargetStripCopy("infeasible", makeTarget({feasible:false}))` →
  "THIS POOL CAN'T EXPRESS YOUR IDENTITY UNDER THE CAP — THE FLOOR STILL BUILDS") stays green
  (that fixture's allIn 30,000 < budget 50,000 — non-tax cause, unchanged). New case
  (allIn 1,230,000 > budget 1,000,000) returns "YOUR IDENTITY'S TARGET BUILD OWES $330,000 TAX —
  $1,230,000 ALL-IN OVER YOUR $1,000,000 CAP; THE FLOOR STILL BUILDS". RosterDesigner.tsx was NOT
  touched — it calls this same exported function, so the new branch reaches its identity-strip
  render for free (confirmed via `git diff --stat` showing zero changes to RosterDesigner.tsx, and
  RosterDesigner.test.tsx's full suite staying green with no new assertions needed there).
  Red-before-fix proven via `git stash` of designVerdict.ts alone: 6 of 10 tests in
  designVerdict.test.ts failed ("is not a function") before the fix, all 10 green after.

Item 3 — THE MONEY tax-watch line.
  taxWatchBannerText added to designVerdict.ts; taxWatchLine useMemo added to
  LeagueBuilderDraftSetup.tsx reading targetByTeamId (already computed for THE CLUB CHECK, zero
  new engine calls), rendered in BOTH the design-first and pool-first money rows. Deliberately
  NOT locked-gated (unlike the hard-cap solvencyBanner) — tax insolvency surfaces as early as
  possible. New repro: "SETUPTAX: THE MONEY surfaces a TAX WATCH line for a club whose identity
  target overshoots the cap" (money.test.tsx) — RED against pre-fix page source (waitFor timeout,
  text never appears), GREEN after the fix ("TAX WATCH: Caps — You — identity targets overshoot
  the cap after tax.").

Item 4 — Archetype market outlook tax annotation.
  Confirmed by reading poolFeasibility.ts: `analyzePoolFeasibility` already builds each
  archetype's roster into `ArchetypeFeasibility.built` (an `ArchetypeSimResult`, which carries
  `totalTax`) and keeps it on `PoolCompositionReport.feasibility.results[]` — a SIBLING array to
  `.outlooks[]` that the render never read. Wired a `.find()` lookup by archetypeId in the
  existing outlook row map (LeagueBuilderDraftSetup.tsx) — zero new engine calls, zero engine
  files touched. New repro: "SETUPTAX: Archetype market outlook annotates a tax-owing archetype
  and leaves a tax-free one alone" (money.test.tsx, mocks `evaluatePoolComposition` — no OTHER
  test in the file ever reaches a `locked`-pool initial render, confirmed via grep, so this mock
  addition is additive; the mock is reset at the end of the test to prevent any cross-test
  leakage) — RED against pre-fix page source (row renders, "· ~$330,000 TAX AT TARGET" absent),
  GREEN after the fix.

GATES (real outputs)

Typecheck — `npx tsc -b`; exit 0, no output.

Build — `npm run build`; exit 0. Tail:
    ✓ built in 11.58s
    PWA v1.2.0
    mode      generateSW
    precache  183 entries (5330.01 KiB)
    files generated
      dist/sw.js
      dist/workbox-1d305bb8.js
  (pre-existing chunk-size warnings only, no errors.)

Targeted suites (the five split DraftSetup files + RosterDesigner + designVerdict — NOT the full
suite, per the gate spec):
    Test Files  8 passed (8)
    Tests       136 passed (136)
  Files: LeagueBuilderDraftSetup.{setup,universe,poolLock,board,money,RankYourBoardZone}.test.tsx,
  RosterDesigner.test.tsx, designVerdict.test.ts.

SURPRISES / NOTED SIDE EFFECTS (none block the gate, flagged for the audit)
- `nonGreenClubCount` (LeagueBuilderDraftSetup.tsx) already filters `clubCheckRows` by
  `row.tone !== "green"` to gate a "confirm before lock" prompt. Item 1's tone escalation means a
  tax-overshoot club now correctly counts as non-green there too — an extra confirm click before
  locking a pool with a tax-insolvent identity target. This is a direct, intended consequence of
  "the row's TONE reflects it" (contract §1), not a separate change; `canModeALock` itself
  (whether locking is ALLOWED at all) is untouched. Covered by the existing 136-test gate (no
  regression), called out explicitly since it's a behavior change beyond pure text/color.
- Item 4's test required mocking `evaluatePoolComposition` (money.test.tsx) since no existing
  test in the five split suites ever reaches the `locked`-pool state that triggers the REAL
  composition pipeline — this is new test infrastructure, not a product-code change.
