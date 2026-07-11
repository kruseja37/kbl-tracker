# CONTRACT TAXSWING — single-assignment swing-arm luxury tax (JK-ruled 2026-07-10)
Captain: Fable · Builder: Codex gpt-5.6-sol xhigh · Branch: codex/taxswing
Base: main @ HEAD (post PR #67). ECONOMY-CRITICAL — settlement tax change, both drafts.

## THE RULING (JK, 2026-07-10, verbatim intent)
Today `luxuryTax` (src/engines/leagueConstruction.ts:253-256) counts an SP/RP swing arm
in BOTH the rotation and bullpen tax groups — his ratings can be charged twice, and with
4 true SPs rostered a swing arm can still inflate the rotation charge though he'll never
start. JK ruled: count every arm EXACTLY ONCE, by what the roster actually needs.

## THE RULE (build exactly this, inside luxuryTax so every consumer inherits it)
1. Rotation tax group = all pure `SP`, PLUS — iff pure-SP count < ROTATION_ARMS — the
   best `SP/RP` arms promoted (in descending mean(VEL,JNK,ACC)) until the group reaches
   ROTATION_ARMS or swing arms run out.
2. ROTATION_ARMS derives from `LEGAL_ROSTER.startingPitchers` (= 4; SMB4 four-man
   rotation). No hardcoded 4 — import it.
3. Bullpen tax group = all `RP` + `CP` + the swing arms NOT promoted in (1).
4. No arm ever appears in both groups. Hitters group unchanged. Top-N-per-stat logic
   within each group unchanged (a 5th pure SP still just misses the top-4 cut — that
   behavior is correct and keeps).
5. The assignment lives INSIDE `luxuryTax` (the single settlement function) so the two
   bills, legal-finish cushion, seating-proof affordability, marginal tax, rational
   room, and every advisory surface inherit it automatically (advisory ≡ settlement).
   NO caller-side reimplementation anywhere.

## NAMED SCENARIO TESTS (JK's cases — write them FIRST, red against current code)
A. 4 SP + 1 elite SP/RP: rotation charge computed from the 4 SPs ONLY (the swing arm's
   ratings absent from every rotation stat row); the swing arm counts in bullpen rows.
   Against CURRENT code this must FAIL (today he can crack both) — that red is the repro.
B. 3 SP + 1 elite SP/RP (mid-draft shape): the swing arm IS in the rotation group
   (promoted to fill the 4th seat) and NOT in the bullpen group.
C. The recalculation JK named critical: from state B, evaluate marginal tax of adding a
   4th pure SP — the computation must reflect the post-pick reassignment (swing arm
   demotes to the pen). Assert the marginal equals tax(rosterB + newSP) − tax(rosterB)
   with the new assignment applied to BOTH terms, and construct the fixture so the
   rotation-side charge strictly DECREASES on the pick (the marginal can be negative
   overall) — prove a negative marginal is representable and correctly signed
   end-to-end through auctionMarginalTaxWithCaps.
D. All-swing rotation (0 pure SP, 4+ SP/RP): the best 4 swing arms are taxed as
   rotation (the loophole JK's simpler idea would have opened stays closed).
E. Promotion tie-break determinism: equal mean arms → stable deterministic order
   (document the tie-break; player id ascending is fine).

## BLAST RADIUS (handle honestly — no fixture-bending)
- Pinned suites that assert current tax numbers (gauntlet, settlement, completion-floor,
  snake engine suites) may shift. Re-baseline ONLY values whose change is EXPLAINED by
  this rule (a swing arm leaving/entering a group); each re-baselined expectation gets a
  one-line justification comment citing this contract. A shift you cannot explain by the
  rule = STOP (it's a bug, yours or latent).
- CPU rules are never fixture-bent; no load-path heals (standing JK rulings).
- UI copy: grep advisory copy that assumes "rotation = SP + SP/RP" (Draft Setup tax
  watch, desk tax tap-down copy if S3 has merged by your rebase) — the tax VIEW labels
  must still match the engine's grouping. The bullpen label stays "top-N bullpen arms"
  (CT1); the rotation membership language must not contradict the new rule. Flag, don't
  rewrite, anything test-characterized (D11 copy locks) — list flags in your report.
- The consequence-line copy must support a DOWNWARD tax consequence in plain words
  (e.g. "YOUR TAX BILL GOES DOWN"). If the surface that renders it lives in S3 (not yet
  merged when you start), note the seam in your report instead of editing across lanes.

## FILE SURFACE
- src/engines/leagueConstruction.ts (luxuryTax + a small exported assignment helper for
  testability) · its test file · re-baselined test expectations per BLAST RADIUS ·
  NOTHING else without a STOP. Auction FLOW files remain frozen (engine change is the
  sanctioned exception per JK's ruling; auction suites are the guardrail).

## GATES (in order, real output)
1. tsc --noEmit clean. 2. npm run build exit 0. 3. leagueConstruction + luxury-tax +
completion-floor + snake engine suites green. 4. THE FULL AUCTION SUITE SET green
(re-baselines justified inline). 5. ONE full vitest run (known solo-flakes: the
LeagueBuilderDraftSetup family, franchiseManualSmokeFixture — verify solo if red).

## PROTOCOL
No git write commands (captain cuts commits). Spec-first: scenario tests A-E before the
engine change; A must be red against current code. UNKNOWN or unexplainable test shift
= STOP. Builder report appended here: file:line, REAL gate outputs, every re-baselined
value with its one-line justification, copy flags, auditor attack list.

---

## BUILDER EXECUTION RECORD — Codex, 2026-07-10 — BLOCKED AT GATE 5

### Red-first receipt

Tests A-E were written in `src/engines/__tests__/leagueConstruction.test.ts` before
production code changed. Scenario A was run alone against the untouched engine and failed
for the intended reason:

```text
$ NODE_ENV= npx vitest run src/engines/__tests__/leagueConstruction.test.ts -t "A\. 4 SP" --reporter=verbose
FAIL ... A. 4 SP + elite SP/RP taxes the four pure starters in rotation and the swing arm only in the bullpen
AssertionError: expected 279 to be 220
Test Files  1 failed (1)
Tests       1 failed | 30 skipped (31)
EXIT 1
```

The complete A-E block was then run against the untouched engine. All five failed: A
double-group displacement (`279` vs `220`), B bullpen duplication (`99` vs `0`), C no
rotation decrease (`756` vs `<756`), D all swing arms remaining in the pen (`300` vs `50`),
and E no mean-plus-id assignment (`340` vs `300`).

### Implementation and tests

- `src/engines/leagueConstruction.ts:253-295` — exported
  `assignLuxuryTaxPitchingGroups`; pure SPs claim rotation first, the shortfall up to
  `LEGAL_ROSTER.startingPitchers` is filled by descending mean(VEL,JNK,ACC), equal means
  break by player id ascending, and unpromoted swing arms join RP/CP in the bullpen.
  `luxuryTax` consumes this single assignment; hitter grouping and per-row top-N logic are
  unchanged.
- `src/engines/__tests__/leagueConstruction.test.ts:146-183,288-407` — named scenarios A-E,
  direct assignment assertions, all three pitching stat rows, all-swing coverage, input-order
  independent tie-break coverage, and signed negative marginal coverage through
  `auctionMarginalTaxWithCaps`.

Post-change A-E receipt:

```text
$ NODE_ENV= npx vitest run src/engines/__tests__/leagueConstruction.test.ts -t "TAXSWING named single-assignment scenarios"
Test Files  1 passed (1)
Tests       5 passed | 26 skipped (31)
EXIT 0
```

### Gates — real terminal output

Gate 1:

```text
$ npx tsc --noEmit
[no stdout]
EXIT 0
```

Gate 2:

```text
$ npm run build
> kbl-tracker@0.0.0 build
> tsc -b && vite build
✓ 2660 modules transformed.
✓ built in 11.01s
PWA v1.2.0
precache  197 entries (5430.89 KiB)
files generated
  dist/sw.js
  dist/workbox-1d305bb8.js
EXIT 0
```

Existing non-fatal build warnings remained: stale Browserslist data, the known mixed
dynamic/static `franchisePlayerStorage` import, and chunks over 500 kB.

Gate 3:

```text
$ NODE_ENV= npx vitest run \
  src/engines/__tests__/leagueConstruction.test.ts \
  src/engines/__tests__/auctionLuxuryTax.test.ts \
  src/engines/__tests__/auctionLuxuryTaxSettlement.test.ts \
  src/engines/__tests__/auctionCompletionFloor.test.ts \
  src/engines/__tests__/snakeDraftPoc.test.ts \
  src/engines/__tests__/snakeEconomicsGuide.test.ts \
  src/engines/__tests__/snakeRationalRoom.test.ts \
  src/engines/__tests__/snakeSeatingProof.test.ts \
  src/engines/__tests__/snakeVersioningSession.test.ts
Test Files  9 passed (9)
Tests       101 passed (101)
EXIT 0
```

Gate 4 enumerated every auction-scoped test path under `src/` and `scripts/` (39 files:
engine, page, hook, component, storage, and opt-in script suites):

```text
$ NODE_ENV= npx vitest run <39 auction-scoped test files>
Test Files  36 passed | 3 skipped (39)
Tests       452 passed | 6 skipped (458)
Duration    73.46s
EXIT 0
```

Both production-default auction gauntlets and the six-draft gauntlet stayed green. No
expectation changed.

Gate 5:

```text
$ NODE_ENV= npx vitest run
Test Files  3 failed | 628 passed | 8 skipped (639)
Tests       4 failed | 9600 passed | 15 skipped (9619)
Duration    229.22s
EXIT 1
```

Two failures were characterized `LeagueBuilderDraftSetup.poolLock` batch timeouts. Required
solo verification cleared both:

```text
$ NODE_ENV= npx vitest run src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.poolLock.test.tsx
Test Files  1 passed (1)
Tests       21 passed (21)
EXIT 0
```

The other two failures were deterministic economy balance gates, and failed again solo:

```text
$ NODE_ENV= npx vitest run \
  src/engines/__tests__/archetypeBalanceSimulator.test.ts \
  src/engines/__tests__/historicalArchetypes.test.ts --reporter=verbose

[juiced] within ±10%: 23/24   maxDev 10.9%   OUT: Shift-Era Suppressors -11%
FAIL historicalArchetypes.test.ts: expected report.withinBand to be true

WORKBOOK ARCHETYPE BASELINE: outliers Call Your Shot, Defense First, Lazer Guns, Track Stars
FAIL archetypeBalanceSimulator.test.ts: expected 29 to be greater than or equal to 30

Test Files  2 failed (2)
Tests       2 failed | 1 passed (3)
EXIT 1
```

### Rebaselines

None. Gate 3 and Gate 4 required no expectation changes. The two Gate-5 balance failures are
not pinned settlement-dollar snapshots; they enforce product parity bands. Weakening ±10% or
29/33, or retuning archetype/tax constants, would be fixture-bending or an out-of-contract
product-math change. Per the contract, the builder stopped instead.

### Copy flags

- Grep of Draft Setup TAX WATCH, auction Whisper/desk, and current snake room found no live copy
  claiming `rotation = SP + SP/RP`; no copy rewrite was needed or permitted.
- Current `SnakeDraftRoom.tsx:140` renders only the legal-finish cushion consequence. The S3
  downward-tax consequence surface named by the contract is not present on this base. S3 must
  support plain downward copy such as `YOUR TAX BILL GOES DOWN`; this is a flagged cross-lane seam,
  not edited here.

### Auditor attack list

1. Reproduce the two deterministic balance-gate failures and decide whether the new settlement
   rule requires a product retune; do not simply widen the locked parity bands.
2. Mutation-test the promotion comparator: reverse input order and perturb one of VEL/JNK/ACC;
   player-id order must decide only exact mean ties.
3. Recheck the five-pure-SP case: all pure SPs remain in the rotation group and each existing
   row still applies its own top-N cut.
4. Trace signed negative marginal tax through auction settlement/ceiling and S3 consequence copy.
   Separately scrutinize existing conservative completion-reserve clamps (`Math.max(0, tax delta)`)
   in snake/liquidity consumers; this contract changed no caller.
5. Confirm hitters, RP, CP, missing-role pitchers, advisory mode, and off mode remain unchanged.

### Changed-path report and STOP verdict

Builder-owned paths (3 after this report):

- `src/engines/leagueConstruction.ts`
- `src/engines/__tests__/leagueConstruction.test.ts`
- `spec-docs/contracts/CONTRACT_TAXSWING_2026-07-10.md`

Pre-existing captain harness paths present in `git status`, untouched by the builder:

- `DISPATCH_PROMPT.txt`
- `run_lane.sh`
- `sentinel.sh`

`git diff --check` is clean. No git write command was run. No roadmap/context-card update is
needed: this lane does not change Mode-2 trust state or the active snake-program checkpoint.

**VERDICT: BLOCKED at Gate 5.** The implementation and required focused/auction gates are green,
but the full-suite economy parity gates are deterministically red. Captain/JK must choose a
new product-math remediation contract (retune under the single-assignment rule) or explicitly rule
the parity acceptance policy before this lane can be completed.

---

## AMENDMENT 1 (captain ruling on the Gate-5 STOP, 2026-07-10) — the parity retune

The STOP is upheld and the investigation is complete (tracer report, verified by
running the real simulator against candidate values). Findings ratified:
- Six identities were leaning on the old double-count bug to hit their tuned parity;
  the honest rule exposes them. Also: the 24-set test loop short-circuits per tier —
  the STANDARD tier is ALSO out of band (Launch & Leather -11.5%), invisible in the
  original failure output.

THE RETUNE (identity-preserving; direction/flavor of every identity unchanged; bands
and thresholds untouched — this restores the value-parity the 2026-06 lock promised,
under the now-honest tax):
1. src/data/historicalArchetypes.ts (spec multipliers):
   - Shift-Era Suppressors: PEN_ACC -1.0 → -0.8
   - Launch & Leather: ROT_ACC -1.0 → -0.8, PEN_ACC -1.0 → -0.6
   (verified combo: all 3 tiers in band with margin — max devs 6.8% / 3.9% / 0.7%)
2. src/data/tierParams.ts (workbook fractions): scale ONLY the pitching-side entries
   (RVEL/RJNK/RACC/PVEL/PJNK/PACC) by 0.85 for: Call Your Shot, Track Stars,
   Defense First, Lazer Guns. Batting-side untouched.
   (verified: 33/33 in band, max dev 8.6%. If any future gate re-run lands out of
   band, the pre-verified fallback is scale 0.7 — max dev 7.7%.)
3. Test quality (in-lane): make the historicalArchetypes gate report ALL tiers'
   violations in one run instead of throwing on the first tier — the standard-tier
   break was masked. Keep the bands exactly as they are.
4. Each edited constant gets a one-line comment citing this contract + amendment.
FILE SURFACE ADDITION: src/data/historicalArchetypes.ts, src/data/tierParams.ts, and
the historicalArchetypes test file — retune values EXACTLY as above, nothing else.
Then re-run Gates 3→5 (full sequence from Gate 1 if any code beyond constants moved).
NOTE for the report: the S3 desk (merging separately) carries a tax-core explainer
that must be re-synced to assignLuxuryTaxPitchingGroups at merge time — captain-owned
seam, do not reach for it from this tree.
