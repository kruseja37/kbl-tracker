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
