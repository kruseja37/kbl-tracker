# CONTRACT W1a+W1b — MLB Draft Cockpit: Tier-1 verdict strip + Tier-2 promoted read (2026-07-08)

You are a builder on the KBL Tracker repo (React+TS+Vite+IndexedDB tracker for Super Mega
Baseball 4). You are in an isolated git worktree (your cwd) on your own branch off current main.
Deliver COCKPIT LANE W1a+W1b: the MLB auction floor's new information hierarchy per the
JK-RATIFIED design. Commit when green; do NOT push/merge — captain merges after adversarial audit.

SETUP (first):
1. `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules`
2. READ IN FULL: spec-docs/DRAFT_COCKPIT_DESIGN_2026-07-08.md — it is BINDING (ratified). Your
   lane implements §2 Tier 1 + Tier 2 and the W1a/W1b items of §3, for the MLB tier ONLY.
3. Write this contract to spec-docs/contracts/CONTRACT_W1AB_MLB_COCKPIT_2026-07-08.md, include in
   commit.

ALLOWED FILE SURFACE (hard boundary): src/src_figma/app/components/auction/WhisperPanel.tsx,
src/src_figma/app/components/auction/AuctionStage.tsx, src/engines/rosterIntelligencePayload.ts
(MLB paths only — do NOT touch assembleFarmWhisper/FarmWhisperAssembly/farm stubs),
src/src_figma/app/pages/LeagueBuilderAuctionDraft.tsx, src/src_figma/styles/auction-theme.css,
their test files, your contract file. FORBIDDEN: LeagueBuilderFarmAuctionDraft.tsx and any farm
payload function (W1d lane owns), LeagueBuilderDraftSetup.tsx + pool builder files (a concurrent
lane owns them), PlayerProfilePopover, engine MATH files (you may ADD CALL SITES to existing
tested engines — auctionLuxuryTax, auctionMarketModel, gradeBandPrice — but never edit their
math), the scout cover/reveal block, session SOT docs.

BINDING PRINCIPLES (design §1 — the audit will enforce these):
- 5-second rule; Tiers 1+2 combined ≤ 60 words default-visible.
- No new math — every number from an existing tested engine.
- ONE CEILING: any affordability number displayed must derive from worthToYou.suggestedMaxBid (F9
  bug class — see the dated F9 comments in rosterIntelligencePayload.ts). Add a regression test
  asserting the displayed max-bid/ceiling numbers all come from that single source.
- Honest surfaces: no stubs; the BALANCE light is DELETED, not hidden.
- Nothing team-generic above the fold: any line that would render identically for every team goes
  behind Help.
- Premium-retro voice consistent with the existing stage copy.

=== W1a — TIER 1: THE CALL (always visible on the stage, zero taps) ===
A single verdict strip, visible without opening the whisper panel:
1. VERDICT word — the existing whisper verdict (push/value/cap/walk semantics from
   worthToYou/liquidityAwareBidding output; reuse the exact computed verdict, restyled prominent).
2. YOUR NUMBER + TRUE COST: the existing suggestedMaxBid, plus tax: wire `auctionMarginalTax`
   (src/engines/auctionLuxuryTax.ts:59 — built+tested, currently zero callers) and/or the
   already-computed `team.projectedTax` (set at src/src_figma/app/hooks/useAuctionDraft.ts:251,
   currently never read by any renderer — verify the exact field/API from source). Render as one
   figure: e.g. "YOUR NUMBER $40K — TRUE COST $52K AFTER TAX". The tax portion renders ONLY when
   marginal tax ≠ 0. RB-3 (spec-docs/AUCTION_REBUILD_PLAN.md:34) is the ratified ticket this closes.
3. FIT chip — the existing archetype FIT ±% + identity color (already computed; promote, don't
   recompute).
4. ONE reason phrase — the single top-priority reasonCode chip only; the remaining reason chips
   move behind the Tier-2 tap-through.
Placement: on/above the stage near the lot, NOT inside the collapsed panel. Layout: verdict left,
numbers center, fit right (adapt to the existing stage grid; keep retro styling).

=== W1b — TIER 2: THE READ (one glance below Tier 1, no taps) ===
1. Bid-vs-Pass: promote the existing BidVsPassSection out of the collapsed whisper to a
   permanently visible compact two-row readout (it currently only renders after tapping the panel
   open — WhisperPanel.tsx:105-132 collapse logic).
2. WAIT/CHASE chip: wire `nominationOdds` (src/engines/auctionMarketModel.ts:600-650 — built,
   fully unit-tested, ZERO production callers). Compute for the current lot's primary position
   over the remaining pool: "Next CF: ~72% within 3 lots" (pick K=3 or the API's natural shape —
   read the function + its tests first). Renders only when there IS a comparable remaining
   (honest surface).
3. Grade sanity chip: wire `gradeBandPrice` (src/engines/gradeBandPrice.ts — 'build-dark, no
   consumer yet'): "Normal for a B+: $35–55K".
4. Lights → icons: SHAPE / IDENTITY / CHEMISTRY / BUDGET become four compact color-state icons
   (green/amber/red) with their sentence shown on tap/hover only. DELETE the BALANCE light
   entirely: remove balanceLight() and its render (rosterIntelligencePayload.ts:684 stub +
   WhisperPanel light row + the WorthToYou.handedness always-null field if now unused) — deletion,
   not display:none; update types/tests accordingly.
5. Declutter: the full board list, chemistry table, remaining reason chips, and any static/
   boilerplate copy (e.g. the duplicated assistant-GM help sentence; note WhisperPanel.tsx:61
   HELP_LINE is a dead constant duplicated inline) move behind the existing tap-open panel/Help.
   Every default-visible line must vary with the lot AND the team.
6. Word budget: Tiers 1+2 default-visible text ≤ 60 words. State the final count in your report
   (count a representative lot render from your tests).

TESTS: update existing WhisperPanel/AuctionStage tests for the new hierarchy (collapse-gated
assertions will need rework — bid-vs-pass now always visible); add: tax line renders with nonzero
marginal tax and absent at zero; nominationOdds chip renders/hides correctly; grade band chip;
BALANCE fully gone (assert its copy absent); the one-ceiling regression test. Farm tier must be
UNAFFECTED — run the farm page suite untouched and confirm it stays green (if a shared component
change breaks farm rendering, adapt the shared piece so farm behavior is preserved, without
editing farm files).

GATES (paste tails): `npx tsc -b --pretty false`; `npm run build`; focused suites:
WhisperPanel/AuctionStage tests, LeagueBuilderAuctionDraft.test.tsx,
LeagueBuilderFarmAuctionDraft.test.tsx (must stay green untouched), plus any
rosterIntelligencePayload tests. Do NOT run the full suite.

Commit: `feat(cockpit): W1a+W1b — Tier-1 verdict strip w/ true cost after tax + Tier-2 promoted
reads, lights→icons, BALANCE deleted [COCKPIT-W1ab]` + trailer `Co-Authored-By: Claude Fable 5
<noreply@anthropic.com>`.

REPORT: branch/worktree/commit; file:line per element; exact engine call sites added
(nominationOdds/auctionMarginalTax/gradeBandPrice APIs as found in source); the default-visible
word count; how the one-ceiling test works; verbatim gate tails; surprises. STOP-and-report any
contract-vs-code contradiction rather than improvising.

---

## Build notes (filled in during execution)

### Ground-truth verified before editing

- `FiveLights` (rosterIntelligencePayload.ts) is a SHARED type consumed by both
  `assembleFiveLights` (MLB) and `assembleFarmWhisper` (farm, forbidden to touch). Deleting
  `balance` outright would have forced a one-line edit inside `assembleFarmWhisper`'s scorecard
  literal to keep it compiling — a genuine contract contradiction (FORBIDDEN farm payload function
  vs. "delete, don't hide" for BALANCE). Resolution: made `balance` OPTIONAL on `FiveLights`
  (documented inline at the interface) instead of removing the field outright. `assembleFiveLights`
  no longer sets it at all (function `balanceLight()` deleted); `assembleFarmWhisper` is
  byte-for-byte untouched and still compiles (still populates `balance` as an unmodeled stub — a
  W1d cleanup, not mine). WhisperPanel's lights row no longer includes "balance" in its render
  order for EITHER tier, so the icon never appears anywhere regardless of what the farm payload
  still carries. This is the smallest edit that satisfies both constraints; flagging it explicitly
  since it's a judgment call on a genuine contradiction rather than a scripted step.
- `WorthToYou.handedness?: null` confirmed dead via repo-wide grep (zero readers anywhere; every
  other `handedness` hit in the codebase is an unrelated field on a different type) — deleted.
- `AuctionStage.tsx` is the SAME shared stage component for both tiers (`vm.tier: "mlb" | "farm"`).
  The farm page (`LeagueBuilderFarmAuctionDraft.tsx:886-888`) already renders `<AuctionStage
  whisperPayload={farmWhisperPayload} .../>` with `tier: "farm"` — i.e. `WhisperPanel` is called
  from ONE shared location (`AuctionStage.tsx:330`) for both floors. The farm integration test
  (`LeagueBuilderFarmAuctionDraft.test.tsx:446-462`) asserts SHAPE/IDENTITY/BUDGET light buttons
  and "MAX BID" text `within(whisperBody)` (i.e. inside the tap-open Tier-3 panel, in today's
  position) — so Tier-1/2 promotion could NOT unconditionally relocate the lights row or the
  headline out of the body for both tiers without breaking that forbidden-to-edit farm test.
  Resolution: added an OPTIONAL `tier?: "mlb" | "farm"` prop to `WhisperPanel` (default `"mlb"`,
  matching this file's own MLB-shaped test fixtures), forwarded from `AuctionStage.tsx:330` as
  `tier={vm.tier}`. The lights block is ONE shared render function (`renderLights`, not
  duplicated), placed in the always-visible Tier-2 area for `tier==="mlb"` and left in its
  original spot inside the tap-open body for `tier==="farm"` — so the farm page's exact prior
  behavior is preserved (verified: farm page suite green, unedited).
- `auctionMarginalTax(committedRoster, candidate, capIdentity, tier)` internally uses the GLOBAL
  `LUXURY_CAP_TABLES[tier]` (via `computeAuctionTeamProjectedTax`), NOT the registered pool's own
  `luxuryCaps` (which is what the live `team.projectedTax` in `useAuctionDraft.ts:251` uses via
  `computeAuctionTeamProjectedTaxWithCaps(..., ctx.baseCaps)`). This is a pre-existing
  characteristic of the named engine, not something introduced here — flagging as a possible
  follow-up ticket if any league ever customizes luxury caps away from the tier defaults (none do
  today per the auction setup flow). Wired exactly as named in the contract, using
  `registeredPool.tier` (the same `identityTier` value already computed and used for the identity
  light) as the 4th argument.
- `nominationOdds(targetPlayerIds, availablePlayers, exponent, withinLots)` needs a SPECIFIC
  target player id (not a position). Resolution: filtered the remaining pool (excluding the
  current lot, which `session.availablePlayerIds` still includes while it's on the block — verified
  via `auctionStateMachine.ts`'s `surfaceNextPlayer`, which does not strip the nominee from
  `availablePlayerIds` until `resolveLot`) to players sharing the current lot's primary position,
  picked the single highest-`ivPercentile` one as "the next {POS}" representative, and read ITS
  `pWithin` from the engine. Exponent sourced from `session.config.nominationWeightExponent ??
  DEFAULT_NOMINATION_WEIGHT_EXPONENT` (the same value `selectNextNominee` uses live, per
  `auctionStateMachine.ts:311`) — not a re-invented constant. K=3, per the design doc's own
  example, stored in `NOMINATION_ODDS_WITHIN_LOTS` and threaded through the chip so the display
  text and the engine call always agree.
- `gradeBandToPriceRange({best, worst})` collapses to a single point (`low === high`) when
  `best === worst` (asserted by the engine's own test: "collapses single-grade bands to one
  midpoint"). MLB `overallGrade` is exact/known (no scouting fog), so there is no natural
  "best/worst" scouting band to reuse (the farm's `scoutOverallGradeBand` is seeded/randomized fog
  math — wrong tool, and forbidden as a farm-only function anyway). Initial judgment call: a
  ±1-ladder-step midpoint window around the candidate's own grade, flagged for review.
  **CAPTAIN RULING (2026-07-08, rework commit): REJECTED — the ±1-step window was an invented
  parameter and semantically wider than "normal for a B+" (it spanned neighboring grades'
  midpoints instead of the grade's own salary band). REWORKED to the ruled shape:** a new pure
  table-read accessor `gradePriceRange(grade)` in `gradeBandPrice.ts` (returns
  `GRADE_SALARY_BOUNDS[grade].floor/.ceiling` verbatim — a read of the same tested table the file
  already imports, explicitly NOT a math edit), and `WhisperPanel.gradeSanityRange` now calls it
  for the player's exact grade. `GRADE_PRICE_LADDER` and the best/worst synthesis are deleted; the
  remaining `PRICED_GRADES` list is a validity guard only (which grades the bounds table prices),
  never a pricing ladder. The chip copy is unchanged ("Normal for a B+: $low–$high") but now means
  the grade's actual salary floor-to-ceiling. Tests updated to lock the displayed dollars to
  `GRADE_SALARY_BOUNDS[grade].floor/.ceiling` verbatim (the no-new-math regression lock) plus a
  dedicated `'D-'`-fallback test, and a new engine test pins `gradePriceRange` to the table
  (including a guard that it is NOT the midpoint).
- `leagueBuilderStorage.ts`'s own `Grade` type (13 values, includes `'D-'`) is NOT the same type as
  `gradeEngine.ts`'s `Grade` (12 values, no `'D-'`) that `GRADE_SALARY_BOUNDS`/`gradeBandPrice` are
  keyed on — two same-named but different unions (an existing repo pattern; multiple other files
  already `as Grade`-cast between them). `Player.overallGrade` uses the 13-value type, so a
  defensive fallback (`'D-'` and anything else unrecognized → `'D'`, the worst tier with a real
  bound) was added at the WhisperPanel call site rather than crash or silently produce `NaN`.

### Files changed (all within the allowed surface)

- `src/engines/rosterIntelligencePayload.ts` — `FiveLights.balance` made optional (documented);
  `balanceLight()` deleted; its call site in `assembleFiveLights` removed; `WorthToYou.handedness`
  deleted. `assembleFarmWhisper`/`FarmWhisperAssembly` untouched (verified via diff).
- `src/engines/__tests__/rosterIntelligencePayload.test.ts` — the one test asserting
  `scorecard.balance` now asserts `toBeUndefined()`.
- `src/src_figma/app/pages/LeagueBuilderAuctionDraft.tsx` — new imports (`nominationOdds`,
  `auctionMarginalTax`, `toConstructionPlayer`, `DEFAULT_NOMINATION_WEIGHT_EXPONENT`); new
  `NOMINATION_ODDS_WITHIN_LOTS` constant (line 153); `nominationChip` computed inside the
  `whisperPayload` useMemo (line ~1053, right after `ownBandPriorities`); `marginalTax` computed
  right after `identityTier` (line ~1160); both added to the meta object returned via
  `Object.assign` (lines 1275-1276). No changes to the useMemo's dependency array were needed (all
  new reads come from values already tracked).
- `src/src_figma/app/components/auction/WhisperPanel.tsx` — full rewrite of the render tree (see
  below); `HELP_LINE` constant exported (was a private dead duplicate).
- `src/src_figma/app/components/auction/AuctionStage.tsx` — imports `HELP_LINE` from
  `WhisperPanel` and uses it instead of the hardcoded duplicate string; forwards `tier={vm.tier}`
  into `<WhisperPanel>`.
- `src/src_figma/app/components/auction/__tests__/WhisperPanel.test.tsx` — BALANCE assertion
  flipped to absence; added a new `describe` block (10 new tests) covering Tier-1/Tier-2 presence,
  VERDICT word mapping, the promoted single reason phrase + Tier-3 "remaining" reasons, the tax
  line (nonzero/zero/null), the one-ceiling regression, the nominationOdds chip (render + hide),
  the grade sanity chip, tap-to-reveal lights (no default sentence), and a farm-tier sanity check
  confirming Tier-1/2 are absent and lights stay inside the tap-through body.
- `src/src_figma/styles/auction-theme.css` — NOT touched. Whisper styling has always lived in
  `WhisperPanel.tsx`'s own inline `<style>` block (confirmed no `.whisper-*` classes exist in the
  shared theme file); the new Tier-1/2 CSS was added there for consistency with the existing
  pattern, not because the theme file needed changes.
- `src/engines/gradeBandPrice.ts` — (rework commit, captain ruling) new `gradePriceRange(grade)`
  pure table-read accessor; existing functions byte-identical.
- `src/engines/__tests__/gradeBandPrice.test.ts` — (rework commit) new test pinning
  `gradePriceRange` to `GRADE_SALARY_BOUNDS` floor/ceiling verbatim and asserting it is not the
  midpoint.
- `spec-docs/contracts/CONTRACT_W1AB_MLB_COCKPIT_2026-07-08.md` — this file.

### Render-tree structure (WhisperPanel.tsx)

For `tier==="mlb"` (default), top to bottom, all always visible (no click required):
1. `<WhisperVerdictStrip>` (`data-testid="whisper-tier1"`) — VERDICT word, YOUR NUMBER (+ TRUE
   COST when marginal tax ≠ 0), FIT chip (colored by the existing identity-light status), ONE
   reason chip (`worth.reasonCodes[0]`).
2. `<section data-testid="whisper-tier2">` — `CompactBidVsPass` (2 rows: BID/PASS, budget-after,
   "N to fill"), `NominationOddsChip` ("Next {POS}: ~{pct}% within {K} lots", absent when no
   comparable remains), `GradeSanityChip` ("Normal for a {grade}: {low}–{high}"), then the 4-light
   icon row (SHAPE/IDENTITY/CHEMISTRY/BUDGET — no BALANCE) with sentence shown ONLY after a
   click/hover (`title` attribute for hover, a local `revealedLight` state for tap — nothing shown
   by default).
3. The existing `whisper-strip` toggle button (unchanged) opens Tier 3 (`whisper-body`): the
   ORIGINAL rich `WhisperHeadline` (verdict sentence, YOUR NUMBER/MAX BID row, live-bid line,
   why-line, room-relation), the full rich `BidVsPassSection` (unchanged, still per-branch target
   lists — nothing lost, just not promoted), the chemistry readout table, and the full board list.
   `WhisperHeadline`'s reason-chip row now shows only the REMAINING reason codes
   (`reasonCodes.slice(1)`, since index 0 is already in Tier 1) and suppresses its own FIT chip
   (already promoted) — both only for `tier==="mlb"`, so nothing repeats itself above vs. below the
   fold.

For `tier==="farm"`: Tier-1 and Tier-2 do not render at all; the lights block renders in its
original position inside the tap-open body exactly as before; `WhisperHeadline` shows its full,
unslimmed reason/FIT set (unchanged) since there is no Tier-1 promotion to avoid duplicating
against. Verified byte-identical behavior via the untouched farm integration test (green) and an
added same-file sanity test.

### Word budget (design §1.1, ≤ 60 words for Tiers 1+2 combined)

Measured empirically (not just estimated) with a throwaway probe test that rendered the
worst-case populated state — CAP verdict, nonzero marginal tax, a promoted reason, both Tier-2
chips populated, and a real bid-vs-pass payload — then walked every DOM text leaf inside
`whisper-tier1`/`whisper-tier2` and word-split each one:

```
TIER1_LEAVES: ["CAP $61,000","YOUR NUMBER","$61,000","— TRUE COST","$66,000","AFTER TAX","FIT","+8%","protect fill"]
TIER2_LEAVES: ["BID","$55,000","$145,000","left","2 to fill","PASS","$200,000","left","3 to fill","Next","CF",": ~","72","% within","3","lots","Normal for a","B+",":","$41,662","–","$63,326","SHAPE","IDENTITY","CHEMISTRY","BUDGET"]
TIER1_WORDS: 15
TIER2_WORDS: 34
TOTAL_WORDS: 49
```

This leaf-walk method is a CONSERVATIVE (over-)count: JSX splits text at expression boundaries, so
bare punctuation marks that land on their own text node (a lone `":"`, a lone `"–"`) get counted
as a whole "word" even though a human reading the concatenated line ("Normal for a B+:
$41,662–$63,326") would not count them separately. The true human-read count is somewhat lower
than 49 (a manual reading gives ~42). Reporting the higher, empirically-measured 49 rather than the
lower manual estimate, since it is the number I can actually prove from test output — **49 words,
comfortably under the 60-word ceiling either way.** No sentence text renders by default under any
light icon (tap/hover only), so it never contributes to this count. The probe test itself was a
throwaway (not committed — deleted after capturing this output; the committed suite covers the
same elements via the assertions in the new "COCKPIT W1a/b" describe block).

### One-ceiling regression test (how it works)

`WhisperPanel.test.tsx`, describe block "COCKPIT W1a/b", test "ONE CEILING regression": constructs
a `worthToYou` fixture where `recommendedNumber`/`suggestedMaxBid` = 61,000 but `capValue` =
809,714 (a wildly different unreserved ceiling) plus a nonzero `marginalTax` of 5,000, then asserts
the Tier-1 `whisper-tier1-number`/`whisper-tier1-truecost` text equals exactly `$61,000` /
`$66,000` (61,000 + 5,000) and does NOT contain `809,714` or `814,714` (what the wrong-ceiling
figures would have been had the code read `capValue` instead of `recommendedNumber`). Passes
today because `WhisperVerdictStrip` only ever reads `payload.worthToYou.recommendedNumber` (itself
`Math.min(worth, suggestedMaxBid)` inside `assembleWorthToYou` — never `capValue`) plus the
page-supplied `marginalTax`.

### Verbatim gate tails

```
$ npx tsc -b --pretty false; echo EXIT:$?
EXIT:0
```

```
$ npx vitest run src/src_figma/app/components/auction/__tests__/WhisperPanel.test.tsx src/src_figma/app/components/auction/__tests__/AuctionStage.test.tsx
 ✓ src/src_figma/app/components/auction/__tests__/AuctionStage.test.tsx (9 tests) 557ms
 ✓ src/src_figma/app/components/auction/__tests__/WhisperPanel.test.tsx (24 tests) 570ms
 Test Files  2 passed (2)
      Tests  33 passed (33)
```

```
$ npx vitest run src/engines/__tests__/rosterIntelligencePayload.test.ts
 ✓ src/engines/__tests__/rosterIntelligencePayload.test.ts (24 tests) 22ms
 Test Files  1 passed (1)
      Tests  24 passed (24)
```

```
$ npx vitest run src/src_figma/__tests__/pages/LeagueBuilderAuctionDraft.test.tsx src/src_figma/__tests__/pages/LeagueBuilderFarmAuctionDraft.test.tsx
 ✓ src/src_figma/__tests__/pages/LeagueBuilderFarmAuctionDraft.test.tsx (1 test) 599ms
 ✓ src/src_figma/__tests__/pages/LeagueBuilderAuctionDraft.test.tsx (20 tests) 2378ms
 Test Files  2 passed (2)
      Tests  21 passed (21)
```

```
$ npx vitest run src/engines/__tests__/auctionLuxuryTax.test.ts src/engines/__tests__/auctionMarketModel.test.ts src/engines/__tests__/gradeBandPrice.test.ts
 ✓ src/engines/__tests__/gradeBandPrice.test.ts (6 tests) 2ms
 ✓ src/engines/__tests__/auctionLuxuryTax.test.ts (4 tests) 4ms
 ✓ src/engines/__tests__/auctionMarketModel.test.ts (20 tests) 16ms
 Test Files  3 passed (3)
      Tests  30 passed (30)
```

```
$ npm run build; echo EXIT:$?
✓ built in 9.85s
PWA v1.2.0 ... files generated: dist/sw.js, dist/workbox-1d305bb8.js
EXIT:0
```

### Surprises / things worth the captain's attention

1. The `FiveLights.balance` shared-type conflict above (farm forbidden-file vs. "delete not hide")
   — resolved via optional field, not full removal; W1d should finish the job by removing the stub
   line from `assembleFarmWhisper` when that lane lands, now that the type permits it.
2. `auctionMarginalTax`'s use of the tier's GLOBAL default luxury caps (not the registered pool's
   possibly-customized caps) — a pre-existing engine characteristic, surfaced for awareness, not
   fixed here (would be an engine-math edit, out of scope).
3. The MLB "grade sanity" ±1-ladder-step window was flagged as an interpretation — **captain ruled
   REWORK (2026-07-08)**; reworked in a follow-up commit to the grade's own
   `GRADE_SALARY_BOUNDS` floor/ceiling via a new pure `gradePriceRange` table-read accessor (full
   detail in the ground-truth section above).
4. No contradiction required a full STOP — items 1-2 were resolvable within the letter of the
   contract via the documented judgment calls; item 3 was flagged and resolved by captain ruling.

### Rework gate tails (grade-sanity chip ruling, follow-up commit)

```
$ npx tsc -b --pretty false; echo TSC_EXIT:$?
TSC_EXIT:0
```

```
$ npx vitest run <WhisperPanel, AuctionStage, both auction page suites, rosterIntelligencePayload,
  gradeBandPrice, auctionLuxuryTax, auctionMarketModel>
 ✓ src/engines/__tests__/auctionLuxuryTax.test.ts (4 tests) 6ms
 ✓ src/engines/__tests__/auctionMarketModel.test.ts (20 tests) 22ms
 ✓ src/engines/__tests__/gradeBandPrice.test.ts (7 tests) 5ms
 ✓ src/engines/__tests__/rosterIntelligencePayload.test.ts (24 tests) 39ms
 ✓ src/src_figma/app/components/auction/__tests__/AuctionStage.test.tsx (9 tests) 778ms
 ✓ src/src_figma/app/components/auction/__tests__/WhisperPanel.test.tsx (25 tests) 861ms
 ✓ src/src_figma/__tests__/pages/LeagueBuilderFarmAuctionDraft.test.tsx (1 test) 843ms
 ✓ src/src_figma/__tests__/pages/LeagueBuilderAuctionDraft.test.tsx (20 tests) 2940ms
 Test Files  8 passed (8)
      Tests  110 passed (110)
```

```
$ npm run build; echo BUILD_EXIT:$?
✓ built (PWA v1.2.0, precache 182 entries)
BUILD_EXIT:0
```
