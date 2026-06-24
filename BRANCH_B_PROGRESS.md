# BRANCH B PROGRESS LEDGER (Mode-1 parallel lane — `codex/mode1-v1-b`)

> Branch-only ledger for the parallel Mode-1 build thread (kickoff: `BRANCH_B_KICKOFF.md`).
> One committer per branch. Read top-to-bottom; newest entries at the bottom.
> At session end, JK relays the completion summary (tickets + SHAs + suite counts) to the
> Branch-A captain for central logging + the eventual lane-merge.

**Branch baseline:** characterized hard fail = `wpaRuntimeBoundary`; **order-flakes** (solo-passing, fail only in
full-suite order — NOT regressions): `AwardsWatchlist` (confirmed solo 2/2 at S5), and per CURRENT_STATE
`GameTrackerLaunchState`. Re-run any suspected new red SOLO before judging it real. Pre-thread HEAD = `7d817965` (B12).

---

## 2026-06-23 — Thread start (B6)

### ✅ B6 — retire orphaned `traitPools.ts` — COMPLETE (`baeb9534`, branch-only, ZERO NEW REDS)

**Grounding finding (the ticket was ~90% already-satisfied in the canonical mode1-b generator):**
- **Position-appropriate carve-outs — already correct/moot.** `POSITION_PRIMARY_WEIGHTS`
  (`prospectScoutingDraftEngine.ts:278`) draws only the 8 fielders + {SP, SP/RP, RP, CP} —
  **no DH, no Two-Way primary** (RB-14 + §15.E). The binary `isPitcher ? PITCHER_POOL : HITTER_POOL`
  split (`:1285`) is therefore position-appropriate per `TRAIT_INTEGRATION_SPEC §5.2` for every
  generatable position: fielders → Hitting/Baserunning/Fielding pool; pitchers (incl. CP) → Pitching
  pool. Two-Way = pitcher-only-traits (DECISIONS_LOG:636) is already what the code enforces.
- **`Workhorse` — already correct.** JK-confirmed **pitcher-only** (DECISIONS_LOG Q9), present only in
  `PROSPECT_PITCHER_TRAIT_POOL` and priced in `traitPricing.ts:478` + `traitInteractionMatrix.ts:842`.
  The spec's "not in the trait registry" is **stale** (written vs the old kbl-tracker copy).
- **Orphan retire — the one real action (done).** `src/data/traitPools.ts` had no live importer; its
  only consumer was the dead, tsc-excluded `src/archived-components/awards/TraitLotteryWheel.tsx`
  (itself unreferenced). Deleted both (963 lines) so no dangling import remains. Git history preserves them.

**Deferred / flagged (NOT done here — out of Branch-B v1 scope):**
- The substantive prospect-trait pool work — roll from **all ~75 traits except Sign Stealer + Stimulated**,
  **scarcity-weighted**, **Two-Way rare-not-excluded** (DECISIONS_LOG 2026-06-23, supersedes spec §5.5's
  "positive/neutral only") — is **B13**, coupled to Branch-A **T-4**'s shared `traitWeight`. The kickoff
  lists B13 as DO-NOT-TOUCH; the pool expansion cannot be done without B13's weighting (else the
  most-valuable Two-Way traits would appear at uniform frequency instead of rare). Left for B13.
- **Spec-reconciliation pending (JK-flagged, DECISIONS_LOG:225):** `PROSPECT_GENERATION_SPEC.md`
  §3.4/§5.5/§15.B still mandate positive-only at generation — superseded by the negatives-in ruling but
  not yet folded into the spec. (Branch-A docs task; noted for the merge.)

**Gate (independent):** `NODE_ENV= tsc -b` → 0 · full suite **8074 pass / 1 fail (500 files)**, sole fail
`wpaRuntimeBoundary` (characterized) = **ZERO NEW REDS**. No `trackerDb` bump; no `iv_oracle.json` change.

**JK decision:** approved "delete the dead file" (attended, 2026-06-23). B6 closed.

### ✅ S1 — one scout per team at startup draft (2→1) — COMPLETE (`0c089460`, branch-only, ZERO NEW REDS)

**Finding:** S1 was ~half-built — a scout-draft phase already existed (pool `6N`, snake order, `draftLeagueBuilderScout`,
persistence, "HIRE SCOUT" UI in `LeagueBuilderDraft.tsx`) but drafted **2 scouts/team** and is bundled with the farm draft.
**JK ruling 2026-06-23:** minimal in-place flip now; the spec's "scout draft before the MLB auction" RE-SEQUENCING is
**deferred to RB-13b** (the MLB auction isn't routed into the startup flow yet — S1 ↔ RB-13b coupling).

**Built (Codex `S1-SCOUT-COUNT-V2` → Opus-audited):** `STARTUP_SCOUTS_PER_TEAM` 2→1 (pool auto-becomes `3N`, multiplier
unchanged, engine bodies byte-identical). Reconciled the full 2-scout surface: the hardcoded
`leagueBuilderFarmScoutingHandoff` `!== 2` validator + 6 copy strings (singular) + 2 UI `/2` denominators + the
count/copy test assertions + the one-scout/one-read prospect-report model (§1A.3, no triangulation). 14 src files.

**Iteration trail (the triangle working — cross-model decorrelation paid off twice):**
- Codex correctly **BLOCKED V1** — its independent broad grep found the hardcoded handoff validator + 2 test files my
  grounding greps missed (narrow constant+"two scouts" greps). V2 = the complete 12-file surface.
- The **full suite** then caught 2 more 2-scout SEED LOOPS in franchise-init integration fixtures
  (`franchiseSetupLaunch.integration` + `franchiseRosterMovement`, `for index<=2` — lines with no "scout" token, so
  missed by both greps); auditor-fixed mechanically to `<=1`. **Lesson:** count/copy reconciliations need a full-surface
  grep (bare literals, loop bounds, denominators, mock values) + the FULL suite, not a focused run.

**Gate (independent):** `NODE_ENV= tsc -b` → 0 · full suite **8074 pass / 1 fail (500 files)** = sole `wpaRuntimeBoundary`
= **ZERO NEW REDS**, byte-identical to the pre-S1 baseline. No `trackerDb` bump; no oracle change.

### ✅ S2 — fixed 2-HIGH / 2-LOW / MEDIUM scout specialty tiering — COMPLETE (`f5a93b46`, branch-only, ZERO NEW REDS)

**JK ruling 2026-06-23:** SMALL / generation-only (the spec's "accuracyByPosition becomes a 3-tier map" was ambiguous —
saved-shape question; JK chose: change ONLY generation, keep the saved map numeric, defer the literal tier-label storage +
per-tool bands + Gaussian retirement to S3/S4/S7).

**Built (Codex `S2-SCOUT-TIERING` → Opus-audited):** `buildScoutPool` now draws exactly 2 distinct HIGH + 2 distinct LOW
positions from `DRAFT_POSITIONS` (no DH) into `specialties[]`/`weaknesses[]`, replacing the free-form mixed-category draw;
the orphaned `SCOUT_SPECIALTY_POOL` is retired. New exported `scoutTierForPosition` (position-exact membership →
high/medium/low) = the fixed-tier source of truth for S3. `accuracyByPosition` stays `Record<string,number>` (NO saved-shape
change), now tier-derived via the unchanged `scoutAccuracy`. The old Gaussian scoring (`scoutProspect`/`specialtyMatches`/
`confidenceFromAccuracy`) is untouched (S7). 4 files.

**Grounding paid off:** applied the S1 lesson up front — confirmed the category-specialty fixtures in other test files are
INPUT data (not generator-output assertions), so the change is isolated. The full suite was **clean on the first run** (vs.
S1's integration-fixture surprise).

**Gate (independent):** `NODE_ENV= tsc -b` → 0 · full suite **8075 pass / 1 fail (500 files)** = sole `wpaRuntimeBoundary`
= **ZERO NEW REDS** (+1 test). No `trackerDb` bump; no oracle change.

### ✅ S3 — per-tool confidence band engine (pure, build-dark) — COMPLETE (`82d9f3fb`, branch-only, ZERO NEW REDS)

**Finding:** contrary to the pre-grounding guess, S3 is NOT a saved-shape fork — the prospect board is RECOMPUTED
(`buildBoardForSession`), so a pure band engine has zero saved-shape/UI impact. Clean build-dark like S2.

**Built (Codex `S3-TOOL-BANDS` → Opus-audited):** `prospectScoutingDraftEngine.ts` gains `SCOUT_TOOL_BAND_WIDTHS`
(high 30 / med 50 / low 70, §16-tunable), `HITTER_SCOUT_TOOLS` (5) / `PITCHER_SCOUT_TOOLS` (7, no arm), `scoutToolBand`
(uniform-in-band placement) and `scoutToolBands` (per-prospect map consuming S2's `scoutTierForPosition`). Un-gameable:
`L ~ U[max(0,true−W), min(true,99−W)]`, band `[L, L+W]` — **provably** `lower ≤ true ≤ upper` and `0 ≤ lower, upper ≤ 99`
(auditor verified by case analysis incl. the 0/99 extremes). 2 files, pure-additive.

**Captain default (flagged §16 sim-tune for JK):** "bands in groups of 10" read as the tier widths; the exact continuous
formula is implemented WITHOUT snapping band edges to multiples of 10 — snapping would break the containment guarantee
near the extremes.

**Build-DARK:** exported functions + tests only; NO report DTO/board/UI wiring (S5 reveal / S6 UI), NO change to the old
Gaussian `scoutProspect` (S7). Consumer arrives at S5.

**Gate (independent):** `NODE_ENV= tsc -b` → 0 · full suite **8078 pass / 1 fail (500 files)** = sole `wpaRuntimeBoundary`
= **ZERO NEW REDS** (+3 tests). No `trackerDb` bump; no oracle change.

### ✅ S4 PART 1 — overall grade-band engine (pure, build-dark) — COMPLETE (`c10139c5`, branch-only, ZERO NEW REDS)

**JK ruling 2026-06-23:** "band engine now, decide price later" — S4 SPLIT into part 1 (band engine, built) + part 2
(auction price re-anchor, DEFERRED, see the open decision below).

**Built (Codex `S4-OVERALL-BAND` → Opus-audited):** `scoutOverallGradeBand(trueGrade, tier, seed) → { best, worst }` on the
10-grade prospect ladder (A..D), width by the scout's fixed tier (HIGH=3 / MEDIUM=5 / LOW=7 grade positions, §16-tunable),
uniform-in-band, clamped to ladder ends. Auditor-verified containment `best ≤ true ≤ worst` by case analysis (incl.
A/D extremes; `A`/high → `A..B+` matches the spec example). Build-DARK; consumer at S5. 2 files, pure-additive.

**Gate (independent):** `NODE_ENV= tsc -b` → 0 · full suite **8081 pass / 1 fail (500 files)** = sole `wpaRuntimeBoundary`
= **ZERO NEW REDS** (+3 tests). No `trackerDb` bump; no oracle change.

### ✅ RULED — S4 PART 2: price range + salary (JK ruling 2026-06-23, corrects the earlier framing)
**NOT two competing pricing models — two SEPARATE numbers:**
1. **Bidding GUIDANCE (pre-bid) = the scout's GRADE BAND → a price range.** The spec (§1A.2) is correct: convert the
   scout's banded overall grade (S4-pt1 `scoutOverallGradeBand`) into the price range the GM bids against. This REPLACES
   the shipped `scoutRangeForProspect` true-IV model (`LeagueBuilderFarmAuctionDraft.tsx:114-123` =
   `perceivedValueRange(scoutPriceOpinion({trueIV}, accuracy) × chemFit, accuracy)`) as the SOURCE of the guidance range —
   guidance comes from the grade band, NOT the true value.
2. **Stamped SALARY (post-win) = the actual WINNING BID (price paid).** Whatever the GM pays becomes the prospect's salary
   going into the season — derived from neither the grade nor the true value. **THIS IS THE MISSING PIECE:** today the
   prospect salary is round/grade-based (`buildPlayerDto` `salary = prospectSalaryForDraftRound(draftPick.round)`;
   `franchiseSalary.ts:108` `prospectSalaryForDraftRound(safeRoundFromScoutedGrade(scoutedGrade))`), so the realized
   winning bid never flows into salary. Build task: stamp the won bid as the going-into-season salary.

**Flow:** grade band → price range (guide) → GM bids → price PAID → stamped salary.

**OPEN sub-detail to settle at build (S4-pt2 / S7):** does the RB-1b chemistry-fit nudge still apply to the bidding
GUIDANCE, or is the guidance purely the grade band? (JK said "the scout's grade range, not true value" — implies
grade-band-only; chemFit was not mentioned.) Plus verify the exact current wiring: where the farm auction captures the
winning bid, and whether `Player.settledSalary` (RB-7) already carries it for MLB but not for FARM prospects.
**Scope:** this lands with S4-pt2 / S7 (the price re-anchor + the old-Gaussian cleanup), not before S6.

### ✅ S5 — reveal archetype/secondary/traitCount, hide trait names — COMPLETE (`7eceaa5d`, branch-only, ZERO NEW REDS)

**JK ruling 2026-06-23:** "reveal-fields only" (the bands stay build-dark for S6). **Finding:** the report turned out
CONTAINED — `VisibleSafeProspectReport` is COMPUTED (the recomputed board), not persisted with traits; the persisted
franchise `prospectReport` stores NO traits, and the live `trait1`/`trait2` consumers (roster/lineup/GameTracker/
`playerDatabase`) read the PLAYER's real traits (revealed at call-up) — all untouched. So §1A.1b was a contained LIVE
DTO+UI change, no migration.

**Built (Codex `S5-REVEAL-FIELDS-V2` → Opus-audited):** on `VisibleSafeProspectReport` (+ the 2 board types that extend it)
— replaced the leaked `trait1`/`trait2` NAMES with `traitCount` (0/1/2), added `archetypeFamily` + `secondaryPosition`.
Sites: the DTO + `visibleReportFromPlayer` + `buildBoardForSession`'s 2 board literals + the `LeagueBuilderDraft` prospect
card (Traits <count> / Archetype / Secondary). 6 files.

**Iteration trail (triangle working — 2nd productive Codex BLOCK this session, after S1 V1):** V1 BLOCKED — its grep found the 2 board
literals in `buildBoardForSession` (extending the DTO) my grounding missed; V2 = the complete 6-file surface. Reinforces
[[kbl-count-copy-reconciliation-full-surface]]: sweep EVERY object-literal construction of a DTO-extending type, not just
the named constructor.

**Gate (independent):** `NODE_ENV= tsc -b` → 0 (the safety net — fails if any consumer still read the removed report
fields) · full suite **8080 pass / 2 fail** = `wpaRuntimeBoundary` (characterized) + `AwardsWatchlist` (order-flake,
confirmed solo-passing 2/2) = **ZERO NEW REDS**. No `trackerDb` bump; no oracle change.

**Next:** **S6** — draft-board UI: render the S3 per-tool 0–99 bands + the S4 overall grade band on the prospect card,
**default-COVERED / long-press-to-reveal** (reuse the existing `LongPressReveal` from RB-11). This is where the build-dark
S3/S4 band engines get their FIRST consumer (wire `scoutToolBands` + `scoutOverallGradeBand` into the board, gated by the
scout's tier). Then S7 (supersede + dead-code cleanup + the S4-part-2 price re-anchor, LAST — needs the parked price
decision). All serialize on the generator/scout files. (RB-13b + RB-18 also remain on the Branch-B backlog; the S4-part-2
price-anchor open decision above is still pending JK.)

### ✅ S6 — draft-board UI: per-tool + overall grade bands (default-covered / long-press) — COMPLETE (branch-only, ZERO NEW REDS)

**Captain-run (Branch-A Opus session driving Branch B in parallel per JK fan-out, 2026-06-23).** Codex-built (`S6-BOARD-BANDS`, high) → Opus-audited (read the REAL diff, never the paste). The FIRST consumer of the build-dark S3/S4 band engines.

**Built (3 files, +35 lines):** `prospectScoutingDraftEngine.ts` +2 optional SAFE fields on `VisibleSafeProspectReport` (`toolBands?` / `overallGradeBand?`) · `leagueBuilderStartupFarmDraft.ts` `buildBoardForSession` inner `scouts.map` computes the bands via the EXISTING `scoutTierForPosition`/`scoutToolBands`/`scoutOverallGradeBand` (seeds `${session.seed}:tool-bands|grade-band:${candidateId}:${scout.id}`) + attaches to the per-scout `StartupProspectBoardReport` · `LeagueBuilderDraft.tsx` renders the bands inside the per-scout report row via `LongPressReveal` (default-COVERED 🔒, reveals on long-press).

**S5 invariant HELD (make-or-break):** NO raw rating reaches the UI — the card renders only `band.lower/upper/best/worst`; `candidate.ratings` flows ONLY into the pure band engine at the board layer. Bands placed PER-SCOUT-REPORT (scout-specific; the outer candidate's optional band fields stay undefined). Build computed deterministically at the board layer (not at render → no re-render bounce).

**Gate (independent, full suite — touches a shared type + a live page):** `NODE_ENV= tsc -b` → 0 · full suite **8081 pass / 1 fail (500 files)** = sole `wpaRuntimeBoundary` (characterized) = **ZERO NEW REDS** (the `AwardsWatchlist` order-flake did not trip this run). No `trackerDb` bump; no `iv_oracle.json` change; the 2 cross-branch overlap files untouched. Characterized `LeagueBuilderDraft.test.tsx` stayed green (9/9, additive).

**BV-S6 (browser-verify, BATCHED):** on the startup prospect-draft board, each scout row shows a 🔒 "Hold to reveal scout bands" → long-press reveals per-tool 0–99 bands + the overall grade band; nothing reveals without the press; no raw numeric ratings anywhere. **D-S6-1 (Captain default):** bands per-scout-report (not on the candidate). **Next: S7** (supersede + dead-code cleanup + the S4-part-2 price re-anchor, LAST — needs the parked price decision).

### S7 — GROUNDED + 4-WAY SUB-SPLIT (Captain workflow `wf_1bc063bb`, 4 readers → synth → adversarial critique; 2026-06-23, NOT yet built)

The LAST + widest Branch-B change. Three jobs: re-anchor bidding GUIDANCE to the grade band (keep RB-1b chemFit), stamp won-bid→farm salary, supersede+delete the old Gaussian model. **JK RULING (DECISIONS_LOG 2026-06-23): guidance = GRADE-BAND + chemFit nudge.** Sub-split (serialize on `prospectScoutingDraftEngine.ts`; each FULL-suite + `tsc -b` 0 gate; characterized baseline = sole `wpaRuntimeBoundary` + `AwardsWatchlist` order-flake):

- **S7a (FIRST, fork-independent, build-dark):** NET-NEW pure `gradeBandToPriceRange({best,worst}: Grade): {low,high}` (worst→floor $, best→ceiling $; monotonic, low≤high, A>D). **EXPORT a DEDICATED band→$ table** — do NOT reuse the private `GRADE_SALARY_BOUNDS` (`ratingsAdjustmentEngine.ts:149-162`) as-is (C/C- and D+/D overlap identically, flagged 'CALIBRATE T5 bridge'). Band emits only A..D (S/A+/D- rows unreachable but the Grade-typed signature accepts them). NEW `src/engines/gradeBandPrice.ts` + test. Refs: `gradeEngine.ts:19` (Grade type), `prospectScoutingDraftEngine.ts:268` (GRADES 10-elem ladder).
- **S7b:** re-anchor `scoutRangeForProspect` (`LeagueBuilderFarmAuctionDraft.tsx:103-124`) to source from `overallGradeBand` (persisted per S6) → S7a converter, apply chemFit (`chemistryFitValue.ts:49-57`, ≤+8%) to BOTH band endpoints + displayedEstimate (single re-point site `:122-123`). Keep emitting `{low,high,displayedEstimate}` so `formatScoutRange`/JSX `:650` stay intact. Rewrite the KEYSTONE test `LeagueBuilderFarmAuctionDraft.test.tsx:262-342` in the SAME change. **⚠ DESIGN FORK (JK): the band already carries best$/worst$ → don't double-widen. (a) band IS the range (chemFit-scaled), DROP `perceivedValueRange` from the auction guidance path [recommended]; (b) band-center + a width helper brackets it.**
- **S7c:** stamp won-bid → farm Player.salary. The won bid ALREADY flows to `freeze.players[].settledSalary` for FARM (`draftFreezeInputs.ts:93`); the break is `franchiseInitializer.ts:754-759` (stale farm-skip + only writes the parallel `settledSalary`, not the visible `salary`; `getVisibleSafeFranchisePlayerSalary` `franchiseSalary.ts:111` returns the round-based hidden value first). FIX: for FARM, write the won bid into `Player.salary` (or make the getter prefer it for FARM), idempotent. **⚠ OPEN (JK): CPU/shill-won farm prospects are excluded from `freeze.players` (`franchiseInitializer.ts:735-744`) → they stay on the round default; do they also need the stamp?**
- **S7d (LAST, the wide breaking delete):** supersede + delete the OLD Gaussian model (Surface A): `scoutProspect`/`confidenceFromAccuracy`, `ProspectScoutingReport` Gaussian fields (`scoutedGrade`/`gradeError`/`scoutConfidence`), make `VisibleSafeProspectReport`/`ProspectProfile` band fields required, re-derive board sort keys from `overallGradeBand`, fix downstream readers (`franchisePlayerProfile.ts`, `rosterAnalyzerDraftAdapter.ts`), rewrite (not delete) the characterized tests. **⚠ MAKE-OR-BREAK: KEEP `perceivedValueRange`/`scoutValueRange.ts` — the Mode-2 freeze calls it directly (`draftFreezeInputs.ts:81`→`draftFreeze.ts:27` required `scoutRange`→`franchiseInitializer.ts:739`); deleting it breaks the freeze→Mode-2 morale pipeline.** Retire `scoutPriceOpinion` (auction-only) BUT relocate `gradeToTwentyEighty` (still displayed live at `scoutGradeDisplay:96-100`) to a surviving module first. NAMESPACE TRAP: `scoutedGrade` appears in ~40 files — scope edits by data-flow ORIGIN (prospect-draft chain), not by token. No trackerDb/leagueBuilderStorage store edit / version bump (prospectProfile is a passthrough on Player, no typed store).

**4 JK FORKS to rule before S7b/c/d (S7a needs none):** (1) SCOPE — retire scoutPriceOpinion + Surface A, KEEP perceivedValueRange/scoutValueRange.ts (freeze dep) [rec]. (2) GUIDANCE WIDTH — band IS the range, drop perceivedValueRange from the auction path [rec (a)]. (3) gradeToTwentyEighty relocate (keep the 20-80 reveal) [rec yes]. (4) CPU/shill-won farm salary stamp — in or out? [open].

### ✅ S7a — pure gradeBandToPriceRange converter — DONE (`d1a578ab`, branch-only, ZERO NEW REDS)

Codex-built (`S7a`, high) → Opus-audited (real diff + independent gate). NEW `src/engines/gradeBandPrice.ts`: `gradeBandToPriceRange({best,worst}) = {low: midpoint(worst), high: midpoint(best)}` off the canonical `GRADE_SALARY_BOUNDS` (now `export`ed from `ratingsAdjustmentEngine.ts:149` — single source, NO duplication; `midpoint=(floor+ceiling)/2`). Min/max guards a swapped input. C/C- + D+/D midpoint overlap documented (T5-bridge, intentional). Build-dark (no consumer; S7b wires). Gate: `tsc -b` 0 + full suite **1 fail / 8087 pass (501 files)** = sole `wpaRuntimeBoundary` (Branch-B baseline) = ZERO NEW REDS; new test 6/6. No DB bump; only the additive export touches the shared engine (low lane-merge risk).

**S7 FORKS — ALL RULED (JK 2026-06-23, DECISIONS_LOG):** range=MIDPOINT-to-midpoint ✅ · S7b guidance = band IS the range (chemFit-scaled, DROP perceivedValueRange from the auction path) ✅ · S7c salary = stamp ALL real winners (human + CPU-controlled; shill excluded) ✅ · S7d KEEP perceivedValueRange/scoutValueRange.ts (freeze dep), relocate gradeToTwentyEighty ✅.

### ✅ S7b — re-anchor scoutRangeForProspect to the grade band (band-is-range × chemFit) — DONE (`688a2e39`, branch-only, ZERO NEW REDS)

Codex-built (`S7b`, high) → Opus-audited (real diff + independent gate). 2 files: `LeagueBuilderFarmAuctionDraft.tsx` (the `scoutRangeForProspect` body, `:103-124`) + its keystone test (`:262-342`). The auction scout RANGE now = the current bidder's scout's overall grade band → S7a converter → chemFit on both endpoints; `perceivedValueRange`/`scoutPriceOpinion`/`scoutAccuracy` DROPPED from this path (imports removed; `gradeToTwentyEighty` KEPT for `scoutGradeDisplay`, S7d's concern). **GROUNDING REFINEMENT (JK ruled 2026-06-23):** `overallGradeBand` is NOT on the DTO/`ProspectProfile` — consistent with D-S6-1 (bands per-scout-report, not persisted on the candidate) — so the band is **RE-DERIVED INLINE** at the auction call site via the exported `scoutOverallGradeBand(prospect.prospectProfile.trueGrade, scoutTierForPosition(primaryPosition, scout), \`${seed}:grade-band:${prospect.id}:${teamId}\`)`, NOT read from a persisted field. The auction band is the bidding scout's own deterministic view; it is NOT required to byte-match the separate `/league-builder/draft` board (different page, different scout). Returns `{ w:0, low, high, displayedEstimate=midpoint }` (valid `ScoutValueRange`; `w` inert, no consumer reads it). NO trackerDb bump; `scoutValueRange.ts`/`gradeBandPrice.ts`/the chokepoint engine/oracle UNTOUCHED.
**Gate (independent, mine):** `tsc -b` + `vite build` exit 0; keystone test 1/1 PASS; Codex full suite 8087 pass / 1 fail (`wpaRuntimeBoundary` = Branch-B characterized baseline) ⇒ ZERO NEW REDS.
**FOLLOW-UP (quality, logged not blocking):** the keystone test's positive assertion is now tautological (`midpoint ≈ displayedEstimate` by construction) because the scout value is privacy-COVERED (RB-11) — no positive DOM compare of the rendered band. A long-press-reveal assertion would strengthen it (matches the pre-existing privacy-covered design; not a regression). **BV-S7b (browser-verify, BATCHED):** on the farm auction, the scout's price range reads off the grade band (band-is-range), shifts with chemistry fit, and never leaks the true IV.

### ✅ S7c — stamp won auction bid onto farm prospect visible salary (ALL real winners) — DONE (`8c2c9619`, branch-only, ZERO NEW REDS)

Codex-built (`S7c`, high) → Opus-audited (real diff + independent gate). 4 files: `franchiseInitializer.ts` (freeze loop) + `franchiseSalary.ts` (getter) + 2 tests. The won bid (`freeze.players[].settledSalary` for FARM, from `draftFreezeInputs.ts:93`) is now stamped onto the farm prospect's visible salary: the freeze loop's FARM branch (`player.tier === 'FARM'` → `getPlayer` → `savePlayer({salary, settledSalary} = won bid)`, idempotent; MLB path preserved byte-behavior), and `getVisibleSafeFranchisePlayerSalary` now prefers a finite `settledSalary` over the round-based placeholder for hidden-farm-context. **D-S7c-CPU RESOLVED (grounded, not a JK fork):** `deriveShillTeamIds` (`cpuTeamRoles.ts:34` = `shillIds && !controlledCpuTeamIds`) excludes ONLY shills → CPU-controlled non-shill farm winners are already in `freeze.players` and get the stamp; shill wins are excluded upstream (`farmExcludedTeamIds`). Farm prospect Player objects live in the leagueBuilder player store (`getPlayer`/`savePlayer`); `FranchiseFarmRecord` is roster-metadata only (no salary). NO trackerDb bump; Player type / oracle / draftFreeze / cpuTeamRoles UNTOUCHED.
**Gate (independent, mine):** `tsc -b` + `vite build` exit 0; FULL suite 8088 pass / 1 fail (`wpaRuntimeBoundary`) ⇒ ZERO NEW REDS. Tests assert human + CPU-controlled-non-shill farm winners stamped (`salary===settledSalary===won bid`), shill excluded, getter prefers won bid over placeholder. **BV-S7c (browser-verify, BATCHED):** after a farm auction, won farm prospects show their winning bid as salary on the farm roster (not the round placeholder).

**➡ NEXT = S7d** (LAST + widest Branch-B scouting change — supersede/DELETE the old Gaussian model [`scoutProspect`/`confidenceFromAccuracy`/`ProspectScoutingReport` Gaussian fields], make `VisibleSafeProspectReport`/`ProspectProfile` band fields required, re-derive board sort keys from `overallGradeBand`, fix downstream readers, rewrite characterized tests; **KEEP `perceivedValueRange`/`scoutValueRange.ts` — the Mode-2 freeze depends on it** — relocate `gradeToTwentyEighty` to a surviving module first; retire `scoutPriceOpinion`; namespace trap: `scoutedGrade` in ~40 files, scope by data-flow origin). Then RB-13b · RB-18 · B1.6.
