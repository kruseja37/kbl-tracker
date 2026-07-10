# CONTRACT — NORMWIRE: every advisory tax surface uses league-size-normalized caps (2026-07-10)

**Builder:** Codex (xhigh). **Auditor:** independent opus. **Captain:** Fable.
**Branch:** codex/normwire. Base: main @ 0be79147.
**Git discipline:** no git write commands; captain cuts commits; APPEND report here.
UNKNOWN = STOP-and-report.

## The finding (verified sweep, 2026-07-10)
Post-CAPFIX, the auction's REAL settlement path normalizes caps by league size
(useAuctionDraft buildAuctionLuxuryTaxContext with leagueTeams.length — correct). But every
ADVISORY surface still consumes raw stock caps: for any non-20-team league, the advice
contradicts the engine. Call sites (verified):
1. Draft Setup THE MONEY / CLUB CHECK / TAX WATCH — buildBest22Target → buildIdentityRoster
   (archetypeBalanceSimulator.ts :72,:210,:431,:446) — NO club-count parameter even exists.
2. Auction TRUE COST / whisper marginal tax — LeagueBuilderAuctionDraft.tsx ~:1619-1636
   (registeredPool?.luxuryCaps ?? LUXURY_CAP_TABLES[identityTier], unnormalized). The nearby
   comment claiming it "can never structurally diverge" from settlement is FALSE for
   non-20-team leagues — delete/correct the comment.
3. WhisperPanel keepTargetAllIn call site — same page ~:1808, same unnormalized caps.
4. liquidityAwareBidding completion tax (:192-194) — transitively unnormalized via caller.
5. LeagueBuilderTeams identity cap-shift preview (~:785,:798) — lower stakes, normalize for
   consistency.

## Build (the honest-numbers law: advisory ≡ settlement, always)
- Thread the REAL non-shill club count to every advisory cap consumer; normalize via the
  existing shared normalizeAuctionLuxuryCapsForLeagueSize at the same seam settlement uses.
  For best22Target/archetypeBalanceSimulator: add the club-count (or pre-normalized caps)
  parameter through the call chain — do NOT default it to 20 silently; every live caller must
  pass the real count. If a call chain has no access to the count, STOP-and-report the seam.
- The shared normalize function and settlement path are UNTOUCHED (consume, don't modify).
- Repro-first: for a 2-team fixture, pin (a) advisory TRUE COST ≠ settlement tax pre-fix →
  ≡ post-fix (exact equality on the same lot/team); (b) TAX WATCH/club-check banner values
  pre/post; (c) a 20-team fixture asserts advisory values BYTE-IDENTICAL pre/post (the
  no-change tripwire — at 20 teams normalize is identity).
- Sweep completeness: after your fix, grep-prove NO remaining consumer of
  LUXURY_CAP_TABLES/registeredPool.luxuryCaps reaches tax math unnormalized outside of
  (a) the normalize function itself, (b) test fixtures, (c) the tier data definitions.
  List every consumer in the report with its verdict.

## Gates
tsc; build; the DraftSetup split suites + auction page/whisper suites + best22Target/
archetypeBalanceSimulator suites; ONE full vitest (known solo flakes list applies).
APPEND report: per-site disposition, repro red proof, the 20-team tripwire evidence, the
completeness grep table.

---

## Builder report — Codex — 2026-07-10

### Outcome

Implemented NORMWIRE at all five named advisory sites. Every live path now receives the real
non-shill club count and normalizes the raw cap table with
`normalizeAuctionLuxuryCapsForLeagueSize` before tax math. There is no production default to 20.
The shared normalizer and the settlement implementation in `useAuctionDraft.ts` were not changed.

### Repro-first evidence

Before production edits, the new focused 2-team regressions failed at four independent seams
(4 failed, 52 passed):

- Best-22 identity target: advisory charged `12,933,893.731441999`; normalized settlement charged
  `0`.
- Keep-target all-in quote: advisory charged `17,597,660.739587687`; normalized settlement charged
  `3,957,714.481714146`.
- Liquidity completion reserve: advisory reserved `133,086.53196416498`; normalized settlement
  reserve was `30,000`.
- Draft Setup: every target call lacked the real 2-club count, so the normalized `TARGET $970,000`
  Club Check state never rendered and the false tax-warning branch remained reachable.

The page-level auction regression now drives one saved, tax-heavy 2-team lot for Page Caps. It
proves all of the following on the identical roster, candidate, and cap identity:

- the legacy raw-table marginal is greater than the normalized settlement marginal;
- the settlement projected-tax recompute and TRUE COST advisory each call the canonical marginal
  helper with the same normalized cap rows;
- every matching call returns the exact same floating-point marginal; and
- the displayed TRUE COST surcharge matches that settlement marginal to the UI's whole-dollar
  rounding boundary.

Draft Setup's page regression drives the real Design First review state, proves every
`buildBest22Target` call receives `2`, renders two `TARGET $970,000` Club Check rows, and proves
neither TAX WATCH nor `TARGET OVERSHOOTS WITH TAX` renders.

### Per-site disposition

1. **Draft Setup / Best-22 / TAX WATCH / Club Check — fixed.** Added required `realTeamCount`
   parameters through `buildBest22Target`, `buildIdentityRoster`, `buildBestRoster`, draftability,
   pool feasibility, pool extraction, pool-composition advice, and `RosterDesigner`. Every live
   caller passes `leagueTeams.length`, `teamCount`, or the extractor's real `teams`. Tax caps are
   normalized before archetype shifts; raw stock caps remain only in the dimensionless fit scorer,
   where no tax is computed.
2. **Auction TRUE COST — fixed.** `LeagueBuilderAuctionDraft` resolves the raw pool/tier table once,
   normalizes it with `leagueTeams.length`, and feeds the normalized table to the marginal helper.
   The false comment claiming raw pool caps could not diverge from settlement was replaced with the
   actual normalization contract.
3. **Keep-target whisper — fixed.** `keepTargetAllIn` requires `realTeamCount`, normalizes once, and
   uses that same table for lot, target, and concrete completion-fill tax. The page passes the real
   club count.
4. **Liquidity completion tax — fixed.** `LiquidityCompletionTaxContext` now requires
   `realTeamCount`; the completion quote normalizes before identity shift and both before/after tax
   calls. The auction page supplies the real count.
5. **Team identity previews — fixed.** MLB and farm preview rows resolve the edited team's real
   league (including membership fallback), normalize with that league's `teamIds.length`, then
   shift. An unassigned/new team renders no numeric cap rows rather than silently assuming 20.

### 20-team no-change tripwire

`auctionLuxuryTax.test.ts` retains the complete all-tier identity tripwire: at 20 clubs the
normalizer returns the same array reference, deep-equal rows, and byte-identical JSON. Existing
20-team Best-22, keep-target, liquidity, archetype, draftability, and feasibility fixtures were
made explicit (test-fixture-only `20`, never a production fallback) and remained green. The
tax-heavy 20-team keep-target test independently recomputes the legacy lot/target/fill deltas from
the raw table and matches every advisory tax field.

### Completeness sweep

Sweep command:

```text
rg -n "LUXURY_CAP_TABLES|luxuryCaps|auctionMarginalTaxWithCaps|luxuryTax\\(|shiftLuxuryCaps\\(|normalizeAuctionLuxuryCapsForLeagueSize" src --glob '*.{ts,tsx}' --glob '!**/__tests__/**' --glob '!**/tests/**'
```

| Consumer | Verdict |
|---|---|
| `src/src_figma/app/hooks/useAuctionDraft.ts` settlement projected tax | Correct before NORMWIRE and untouched: pool caps normalized with real `leagueTeams.length`. |
| `src/src_figma/app/pages/LeagueBuilderAuctionDraft.tsx` TRUE COST | Fixed: raw pool/tier caps immediately normalized with real club count before marginal tax. |
| Same page completion-tax context | Fixed: raw caps plus required real count cross the seam; `liquidityAwareBidding.ts` normalizes before tax. |
| Same page keep-target quote | Fixed: required real count crosses the seam; `auctionKeepTargetAllIn.ts` normalizes once before all three tax deltas. |
| `archetypeBalanceSimulator.ts` Best-22 / identity / best-roster tax | Fixed: required real count reaches `archetypeTaxCaps`; normalize precedes archetype shift. Raw `archetypeCaps` uses at lines 87/226/449/464 are fit/shift-fraction scoring only and never reach `luxuryTax`. |
| `best22Target.ts`, `draftabilityRanker.ts`, `draftPoolExtractor.ts`, `poolFeasibility.ts`, `leagueBuilderPoolBuilder.ts` | Fixed transitively: all APIs require and forward the real count; no default. |
| `LeagueBuilderDraftSetup.tsx` and `RosterDesigner.tsx` | Fixed live callers: pass `leagueTeams.length` to every Best-22/draftability route. |
| `LeagueBuilderTeams.tsx` MLB/farm shifted-cap preview | Fixed: resolve real league and normalize before shift; no league means no numeric preview. |
| `LeagueBuilderSnakeDraft.tsx` and `snakeDraftPoc.ts` | Already correct: normalize with real count before marginal/completion tax. Raw caps passed to `evaluateSnakePick` are paired with required real count and normalized inside. |
| `auctionLuxuryTax.ts` | Exempt shared seam: normalizer definition plus generic cap-based tax helpers; unchanged. Tier-only helper remains a generic API with no live unnormalized advisory caller found. |
| `leagueConstruction.ts` | Exempt primitives/config construction: `luxuryTax`, `shiftLuxuryCaps`, and caller-supplied solvency helpers do not choose a league-size table; registered pools intentionally store the raw tier table. |
| `tierParams.ts` | Exempt data definition. |

Result: no remaining production consumer of a raw stock/pool cap table reaches league-size-sensitive
advisory tax math without first normalizing or carrying the required real count to the normalization
seam.

### Gate evidence

- `NODE_ENV= npx tsc -b --pretty false` — PASS.
- `npm run build` — PASS (`tsc -b` plus Vite production build; only existing Browserslist,
  dynamic-import, and chunk-size warnings).
- Draft Setup split suites — PASS: 6 files, 109 tests.
- Auction page / Whisper / settlement-hook plus Best-22, archetype, keep-target, liquidity,
  20-team tax tripwire, and Teams preview suites — PASS: 11 files, 183 tests.
- Additional affected-engine focused matrix — PASS: 7 files, 75 tests.
- Required one full `npx vitest run` — executed once: 619 files and 9,550 tests passed; 2 failed;
  8 files / 15 tests skipped. Dispositions:
  - `LeagueBuilderDraftSetup.poolLock` session-quality restore timed out only under full-suite load;
    the complete split file had already passed 21/21 and the exact failing test passed immediately
    solo (1/1). No change made.
  - `draftPoolExtractor` reproduced solo, so it was not called a flake. NORMWIRE's correct 8-team
    tax basis intentionally changes the oracle verdict: the obsolete raw-20 basis had accidentally
    forced different roster choices. The regression now pins the honest deterministic result
    (Murderers' Row and Bomba Squad explicitly LOCKED for embodiment, with the source-exhaustion
    reason). The complete extractor file then passed 12/12.
- `git diff --check` — PASS.

No git write command was used. All source, test, and appended report changes remain unstaged in the
working tree for captain handoff; the pre-existing untracked `dispatch-prompt.txt` was not touched.
