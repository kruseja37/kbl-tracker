You are a builder lane on KBL Tracker. Work ONLY in your assigned worktree on its branch; commit there; do NOT push or merge. Independent audit follows. node_modules if missing: `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules`. Base: main @ 23a0a11a.

FIRST COMMIT: write this entire prompt verbatim to spec-docs/contracts/CONTRACT_ARCHLOCK_2026-07-09.md and commit before any code change.

═══ LANE: ARCHLOCK — weld the archetype sheet to the code, permanently ═══
CONTEXT (captain-verified 2026-07-09): a full 24-archetype reconciliation found spec-docs/TEAM_ARCHETYPES_24.md diverges from src/data/historicalArchetypes.ts on exactly 2 archetypes — and git history proves the CODE is the deliberate, audited, ruled reality; the SHEET is stale:
- hdh-royals (historicalArchetypes.ts:104): spec { PEN_ACC: 0.3, SPD: 1, POW: -0.5, ROT_ACC: -0.25 } → shifts PEN_ACC +9%, SPD +12%, POW −2.5%, ROT_ACC −6.25%. Retuned in commit 057f4525 ("Frozen IV oracle deliberately re-pinned; HDH Royals archetype retuned to hold value-parity (24/24 in band)") during the reliever-repricing work. The sheet still says +45/−7.5/−25.
- bash-brothers (:64): spec PEN_ACC: -0.5 → −15%. Re-banded in commit f71059ec ("Bash Brothers re-band: PEN_ACC -1 -> -0.5 ... 24/24 all three tiers") during require-a-closer. The sheet still says −30%.
The other 22 archetypes match the sheet exactly (verified by engine-executed reconciliation; conversion rule shift% = spec_mult × ARCHETYPE_STAT_UNIT[stat], historicalArchetypes.ts:21-25/:178-184).

═══ ITEM 1 — correct the sheet ═══
Update spec-docs/TEAM_ARCHETYPES_24.md: HDH Royals and Bash Brothers entries get the CURRENT code-true values (convert the code multipliers to the sheet's own "±N (cap ±X%)" format using the sheet's fraction×60 rating-point convention so the line stays internally consistent). Add a dated footnote to each corrected entry: retuned for value-parity during the 2026-07-04 economy work (cite the two commit hashes). Do NOT reword anything else in the sheet.

═══ ITEM 2 — the permanent weld (the point of this lane) ═══
New test (src/data/__tests__/archetypeSheetConformance.test.ts or matching repo convention): embed the full ratified table — ALL 24 archetypes × every shifted category with its exact expected shift fraction (as corrected in Item 1) — as literals, with a comment banner stating: THIS TABLE MIRRORS spec-docs/TEAM_ARCHETYPES_24.md; any retune must update the sheet + this table in the same commit. The test: (a) for each archetype, archetypeCapShift(a) deep-equals the expected map exactly (categories AND magnitudes; no extra/missing keys); (b) HISTORICAL_ARCHETYPES.length === 24 and every id appears in the table (coverage can't shrink); (c) untouched categories are absent/zero. This is the code↔sheet weld the existing balance gate structurally cannot provide (it grades code against itself — note this in a test comment).
REPRO-FIRST inverse proof: before writing Item 1's sheet fix, run the new test with the SHEET's stale values for the two archetypes in the table — it must FAIL on exactly hdh-royals and bash-brothers with the exact expected-vs-actual fractions (capture output in the contract), proving the weld detects divergence. Then flip the table to the code-true values (matching the corrected sheet) — green.

═══ ITEM 3 — DECISIONS_LOG entry ═══
Append to spec-docs/DECISIONS_LOG.md (match its format): dated 2026-07-09 — sheet-vs-code divergence on 2 archetypes resolved SPEC-TO-CODE (deliberate audited retunes 057f4525/f71059ec kept; sheet corrected; permanent conformance weld added); note the JK-open feel question (see below) without ruling it.

═══ OUT OF SCOPE ═══
Do NOT change any code value in historicalArchetypes.ts (the values are ruled). Do NOT touch the balance-sim test. The open product question — whether HDH's identity at ~1/5 of its original magnitude still FEELS like a distinct archetype — is JK's, parked, not yours.

═══ GATES (paste real outputs) ═══
npx tsc -b clean; npm run build exit 0; the new conformance test green (after Item 1) + its captured red run (before); historicalArchetypes.test.ts still green (untouched). No other lanes' files: nothing under src/src_figma/, no auction engine files, no LeagueBuilderDraftSetup.

═══ DELIVERABLE ═══
Contract-first; the red-proof run captured; final contract update with evidence + gate outputs. Final message: summary + hashes + surprises. UNKNOWN = STOP and report.

---

## COORDINATOR MID-LANE HOLD + RESUME (2026-07-09)

Mid-lane, the captain issued a STOP WORK: JK challenged whether the hdh-royals/bash-brothers
retunes (057f4525, f71059ec) had been computed against a buggy valuation, which would have made
"correct the sheet to match code" codify stale compensation. The captain's re-verification came
back RESUME — original contract stands, premise empirically proven:
1. The bug JK remembered was the reliever/starter IV mispricing, FIXED in 057f4525 BEFORE the HDH
   retune in that same commit (fix-then-retune ordering, safe).
2. Bash's re-band responds to the require-a-closer rule, not a bug.
3. The decisive balance-sim experiment (real runBalanceSim, real frozen iv_oracle, today's economy)
   showed reverting to sheet values blows the ±10% band — HDH −21.41% juiced, Bash −13.90% nerfed —
   while current code values sit comfortably in band at all three tiers.
4. The sheet's original values were themselves ratified under the buggy pricing (efc7cfb6 pre-dates
   the fix). Code = truth; sheet = stale bug-era artifact.
Additions ruled in the resume: (A) cite the empirical re-verification in the sheet footnotes and the
DECISIONS_LOG entry; (B) keep the round-to-9-decimals FP fix and re-run the red proof cleanly; (C)
gates as contracted.

## EVIDENCE

### Builder note — FP-noise discovery (affects the red proof's validity)
The first red-proof run (raw `toEqual` on the float products) showed 16 failures, not 2 — most were
IEEE-754 representation noise from `spec × ARCHETYPE_STAT_UNIT` (e.g. `1.5 * 0.1` computes to
`0.15000000000000002`), NOT real sheet/code divergence. That run is INVALID as a red proof. Fix:
round both sides to 9 decimal places before compare (`roundShift` helper; every ratified fraction is
clean to ≤4 decimals, so nothing meaningful is masked). The red proof below is the clean re-run with
that fix in place.

### RED PROOF (table loaded with the sheet's STALE values for the two archetypes; all else current)
`npx vitest run src/data/__tests__/archetypeSheetConformance.test.ts` — fails on EXACTLY the two:

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
FAIL … > bash-brothers — cap shift exactly matches the ratified sheet (categories and magnitudes)
AssertionError: expected { 'hitters/POW': 0.075, …(3) } to deeply equal { 'hitters/POW': 0.075, …(3) }
- Expected                          (stale sheet value)
+ Received                          (code truth)
-   "bullpen/ACC": -0.3,
+   "bullpen/ACC": -0.15,

FAIL … > hdh-royals — cap shift exactly matches the ratified sheet (categories and magnitudes)
AssertionError: expected { 'bullpen/ACC': 0.09, …(3) } to deeply equal { 'bullpen/ACC': 0.45, …(3) }
- Expected                          (stale sheet values)
+ Received                          (code truth)
-   "bullpen/ACC": 0.45,
+   "bullpen/ACC": 0.09,
-   "hitters/POW": -0.075,
+   "hitters/POW": -0.025,
-   "rotation/ACC": -0.25,
+   "rotation/ACC": -0.0625,
    "hitters/SPD": 0.12,            (unchanged, matches)

Tests  2 failed | 23 passed (25)
```

### GREEN (table flipped to code-true values, matching the corrected sheet)
```
✓ src/data/__tests__/archetypeSheetConformance.test.ts (25 tests) 5ms
Test Files  1 passed (1)
     Tests  25 passed (25)
```

### ITEM 1 — sheet conversion arithmetic (fraction × 60, rounded, per the sheet's own convention)
- Bash Brothers bullpen command: −0.15 × 60 = 9 → "Bullpen command −9 (cap −15%)".
- HDH Royals: bullpen command 0.09 × 60 = 5.4 → +5 (cap +9%); power 0.025 × 60 = 1.5 → −2
  (cap −2.5%) (rounding matches the sheet's existing Big Red Machine "+2 (cap +2.5%)" line);
  rotation command 0.0625 × 60 = 3.75 → −4 (cap −6.25%); speed unchanged +7 (cap +12%).
Dated footnotes added to both entries citing 057f4525 / f71059ec and the 2026-07-09 empirical
re-verification numbers. No other sheet line reworded.

### GATES
```
npx tsc -b                → exit 0 (no output)
npm run build             → exit 0 ("✓ built in 9.56s", PWA precache 186 entries)
conformance test          → 25/25 green (above)
historicalArchetypes.test → untouched, green:
  [juiced]   within ±10%: 24/24  maxDev 7.7%  all in band
  [standard] within ±10%: 24/24  maxDev 3.8%  all in band
  [nerfed]   within ±10%: 24/24  maxDev 7.9%  all in band
  Test Files 2 passed — Tests 27 passed (both files run together)
```

### FILE SURFACE (lane-clean)
Only: spec-docs/contracts/CONTRACT_ARCHLOCK_2026-07-09.md (this file),
spec-docs/TEAM_ARCHETYPES_24.md, spec-docs/DECISIONS_LOG.md,
src/data/__tests__/archetypeSheetConformance.test.ts.
Nothing under src/src_figma/, no auction engine files, no LeagueBuilderDraftSetup, and NO change to
any code value in src/data/historicalArchetypes.ts.
