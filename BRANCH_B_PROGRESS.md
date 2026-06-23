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

### ⚠ OPEN DECISION — S4 PART 2: the auction price anchor (DEFERRED by JK 2026-06-23)
**The conflict:** §1A.2 says "the overall grade BAND drives the auction PRICE RANGE." But the **shipped RB model** prices
off the prospect's TRUE IV blurred by scout accuracy + the RB-1b chemistry-fit multiplier —
`scoutRangeForProspect` (`LeagueBuilderFarmAuctionDraft.tsx:114-123`) = `perceivedValueRange(scoutPriceOpinion({trueIV},
accuracy) × chemFit, accuracy)`. The scouted GRADE is shown (`scoutGradeDisplay`) but does NOT drive the price. Re-anchoring
the price to the banded grade reworks reviewed RB value/chemistry code AND feeds prospect SALARY (`franchiseSalary.ts:108`
`safeRoundFromScoutedGrade`) + the persisted `scoutedGrade` (`franchisePlayerProfile`). **Needs a JK price-anchor design
ruling before any build** — how band-grade pricing reconciles with the trueIV+chemFit model, and what happens to salary.
(Surfaced + deferred this session; JK chose to build the band engine first.)

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
