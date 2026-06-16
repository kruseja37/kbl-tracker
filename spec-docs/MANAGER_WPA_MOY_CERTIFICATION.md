# MANAGER-WPA / MANAGER-OF-THE-YEAR — §18(4) CERTIFICATION READ

**Created:** 2026-06-16
**Author:** Captain (Opus 4.8). Method: a `moy-reconciliation-read` workflow — 5 decorrelated mappers (v2 decision
truth-layer, lineup-delta scalar, deprecated mWAR, MOY surface/record/greenfield, the denomination crux) + 3
adversarial verifiers (denomination-refute, salary-drop-refute, greenfield-refute) + 1 completeness critic. Every
decision-critical claim independently re-derived at file:line; the critic's three headline findings (pogAwards
precedent, deployment 4th term, managerValueTrace) were re-verified by the Captain against code directly.
**Status:** §18(4) verification read COMPLETE — the LAST of the four §18 reads. Reads + design + docs only; NO product
code, nothing committed (JK commits). The builder/auditor triangle activates when the first MOY build ticket is drafted.
**Scope:** FRANCHISE_V1_LIVING_SEASON_SPEC §23.7 + AWARD-7 — certify the Manager-WPA truth-layer vs the deprecated
mWAR, ground the three build-time reconciliations (denomination / weighting / salary-drop) in real numbers, and surface
the MOY build forks. Feeds the Phase-2 D-stack D9 (awards) ticket.

---

## A. THE v2 TRUTH-LAYER IS REAL, LIVE-WIRED, AND PERSISTED (not an orphan)

- **Decision-WPA = a true team win-probability delta × manager share.** `resolveDecisionAtEndpoint`:
  `rawWindowWpa = roundWpa(teamWinProbabilityAfter − teamWinProbabilityBefore)`, `managerWpa = roundWpa(rawWindowWpa ×
  share)` — `managerWpaDerivation.ts:1734-1747`. Both win-prob terms are `roundProbability`-clamped to [0,1]
  (`:1727-1733`); the delta is `calculateWPA().battingTeamDelta` (`wpaCalculator.ts:118-124`). **Scale: signed
  win-probability delta in [−1,+1], 4-dp.** Not runs, not WAR, not IV.
- **Per-decision scoring is window-resolved, not a fixed table** — each decision resolves at a registry-driven endpoint
  (same_event / next_pa / runner_consequence / first_fielding_event / game_end), `managerDecisionRegistry.ts` +
  `managerWpaDerivation.ts:1818`. This is the "actual win-probability impact (not fixed values)" §23.7(1) requires.
- **Manager share per decision type ∈ [0.1, 1.0]** (modal 0.25): intentional_walk 1.0, squeeze_call 0.5, steal/bunt/
  hit-and-run 0.35, pitching_change/lineup/PH 0.25, leave-pitcher/runner-hold 0.2, position_change 0.1
  (`managerDecisionRegistry.ts:137-423`, exported `MANAGER_WPA_SHARE_BY_DECISION_TYPE`).
- **Live-wired + persisted:** `GameTracker.tsx:81` → `refreshCurrentGameManagerDecisionState`; `useGameState.ts:33`
  → `deriveCommittedManagerDecisionState`; writes `managerDecisions / managerDeploymentStints / managerLineupDeltas /
  managerLineupDeltaSummaries` onto `PersistedGameState` via `saveCurrentGame` (`managerWpaGameState.ts:1593-1602`).
  Displayed in `ManagerWpaOverlay` (`PostGameSummary.tsx:993`, `GameDetail.tsx:1028`), routed through the per-layer
  attribution module `managerValueTrace.ts` (consumers: overlay, ManagerMomentDetail, CommentaryFeed, almanacQueries,
  pogAwards + 2 golden-fixture tests).

## B. IT IS FOUR QUANTITIES, NOT THREE — and "record" is not in the live sum

- The live season composite — **`managerValue = tacticalManagerWpa + deploymentWpa + lineupDeltaWpa`** — appears in
  TWO places, both an **unweighted 1:1:1 raw sum**: `almanacQueries.ts:1228` (on-read) and `pogAwards.ts:589-590`
  (per-game, shipping).
- **Deployment-WPA is a silent second win-prob term** that AWARD-7's "decision + lineup + record" list omits.
  `calculateManagerDeploymentWpa = clamp(roundWpa(rawLinkedWpa × share), −cap, cap)` (`managerWpaGameState.ts:84-98`),
  `rawLinkedWpa` from realized WPA credits (win-prob scale); per-role shares 0.1–0.2, per-role caps 0.1–0.2,
  **team cap ±0.5/game** (`managerWpaGameState.ts:55-82`). It scores bullpen / pinch / defensive deployment — real managing.
- **Team record is NOT a term in the live composite at all** — it is carried alongside as separate `wins`/`losses`
  fields (`almanacQueries.ts:1223-1224`), never summed.

## C. MOY IS NOT GREENFIELD-FROM-SCRATCH — a live per-game precedent already ships

- **`pogAwards.ts` ships a live, persisted, displayed per-game `best_manager` award** computing the exact AWARD-7
  composite: it sums `decision.managerWpa` + `stint.managerDeploymentWpa` + `delta.managerWpa` →
  `managerValue = roundWpa(tactical + deployment + lineupDelta)` (`pogAwards.ts:562/568/574/589-590`), then
  `buildBestManagerAward` picks the top manager gated on `isMeaningfulPositive` (`MIN_POSITIVE_WPA = 0.005`,
  `pogAwards.ts:15/633-651`). Computed + persisted as `managerWpaTotals` (`useGameState.ts:11151/11206/12180`,
  `gameStorage.ts:214/936`), displayed in `GameDetail.tsx`. **Season MOY = a season-grain aggregation of this existing
  composite**, not a from-scratch build.
- **What IS genuinely absent (D0 greenfield, verified):** `franchiseAwardsEngine.ts`, `franchiseAwardsStorage.ts`,
  `AwardsWatchlist.tsx` do not exist (ls/find negative); there is **no season rollup** of the manager composite
  (`seasonAggregator`/`managerStorage`/`teamImpact` never touch `managerLineupDeltaSummaries`); `MANAGER_OF_YEAR` is a
  display-only emblem (`awardEmblems.ts:46/66`), no winner engine; `eliminationAwards.ts` has no manager path.

## D. THE LINEUP TERM IS A NAME / SCALE TRAP (the spec names one field; the live code uses another)

- The live composite (pogAwards + almanac) sums the **CAPPED REALIZED record** `ManagerLineupDeltaRecord.managerWpa`
  = `(actualChosenKblWpa − optimal.projectedSlotKblWpa) × 0.25`, clamped **±0.25/player, ±0.75/team**
  (`managerWpaGameState.ts:51-53/975-1013`). Note this record itself SUBTRACTS a rescaled-IV term from a realized-WP
  term — an incommensurable subtraction one layer deeper.
- §23.7 literally names **`ManagerLineupDeltaSummary`**, whose field `lineupDeltaWpaStandard` (T10's PURE
  projected-vs-optimal scalar = `projectedOpportunityCostTotal`, `managerWpaGameState.ts:222`,
  `optimalLineup.ts:423-425`) is **built + persisted per-game but read NOWHERE downstream** (grep = type decl
  `managerWpa.ts:454` + sole write `managerWpaGameState.ts:222`; zero reads). Raw, uncapped, ~50–90× smaller than a
  tactical decision.
- **So the spec points at the orphaned T10 Summary; the shipping code uses the capped realized record.** They are
  different math AND different scale — summing or averaging them is a unit error.

## E. THE THREE §23.7 RECONCILIATIONS — ALL REAL, ALL UNIMPLEMENTED

- **(a) DENOMINATION — real.** The composite raw-sums two win-prob terms (tactical + deployment, each ±0.5–0.75/game
  capped) with a rescaled-IV term (lineup = IV ÷ `lineupSnapshotWpaDivisor` 10,000,000, `rosterEngineConstants.ts:260`
  / `optimalLineup.ts:626`). The divisor is documented as a **CALIBRATE playtest-tunable placeholder**, and the type
  carries an in-code disclaimer that it is "NOT win probability" (`managerWpa.ts:446`). Decision-WPA out-scales the raw
  uncapped lineup-standard by ~50–90×; the ±0.75/±0.5 caps are band-aids forcing rough commensurability, **not** a unit
  bridge. No rescale/conversion helper exists (grep clean).
- **(b) WEIGHTING — unbuilt.** The only composite is the unweighted 1:1:1 raw sum; the only weighted precedent is the
  deprecated `MWAR_WEIGHTS` 60/40 (`mwarCalculator.ts:203-204`). No successor exists; record is not a term.
- **(c) SALARY-DROP — safe.** The salary→expected-wins line `getExpectedWinPct = 0.35 + salaryScore×0.30`
  (`mwarCalculator.ts:601-603`, `calculateTeamSalaryScore` `:585-595`, `calculateOverperformance` `:609-637`) lives
  ONLY in the `@deprecated` `mwarCalculator`. It drives the entire 0.40 overperformance slot of mWAR (effective salary
  weight 0.40×0.30 = 0.12) and leaks a second time into `calculateMOYVotes` (`:938-957`). A salary-FREE roster-strength
  signal exists — `franchiseExpectedWinsPreview.expectedWinsEstimate` (True-Value gap based, `:139-143`) — but is
  hard-flagged `expectedWinsTrusted:false` (`:158/170`) and consumed by no award path.

## F. THE DEPRECATED mWAR — retire path is clean (re-points, does not break)

- `mwarCalculator.ts` is `@deprecated` (`:4-7`). Its only "MOY winner" function, `calculateMOYVotes`
  (`:938-957`, salary-tainted 60/40), is called only from `AwardsCeremonyFlow.tsx:1620` + `RatingsAdjustmentFlow.tsx:388`,
  both reachable ONLY behind `canUseOffseasonExecution = seasonPhase==='offseason' && FRANCHISE_V1_OFFSEASON_EXECUTION_
  ENABLED` — and the flag is a hardcoded `false` (`FranchiseHome.tsx:148`). **No live MOY winner path executes today.**
- The two `useMWARCalculations` hooks (`src/hooks/` + `src/src_figma/app/hooks/`) have ZERO non-test render call-sites;
  `managerStorage.aggregateManagerGameToSeason` has no live game-end caller; `ManagerSeasonStats` is owned by the
  deprecated file (`mwarCalculator.ts:114-139`) and carries no v2 decision-WPA field. Retiring the salary path
  **re-points** the dead-gated ceremony, breaking nothing reachable.

---

## G. RULINGS — AWARD-7 build resolution (MOY-1..7; logged in DECISIONS_LOG 2026-06-16)

**JK rulings (the design/scope forks):**

- **MOY-1 (JK) — Input set = FOUR.** Season MOY = **decision-WPA + deployment-WPA + lineup-delta + team record.**
  Deployment-WPA is retained as a distinct scored term (already built/capped/shown — real managing); team record is
  ADDED as the new fourth input. (Closes AWARD-7's undercount: the spec's three-input list omitted deployment, and
  record was never actually in the live sum.)
- **MOY-2 (JK) — Lineup quantity DEFERRED to build time.** The choice between the **capped realized record**
  (`delta.managerWpa`, the live pogAwards/almanac input) and **T10's pure projected `lineupDeltaWpaStandard`** (the
  §23.7-named Summary field, currently orphaned) is resolved when the MOY engine is drafted, with both on the table.
  The rest of MOY's structure is locked around this open slot. **Build note:** the realized record is already
  aggregated + commensurate; the T10 standard would need a new season aggregator + a denomination fix.
- **MOY-3 (JK) — Record term = EXPECTATION-RELATIVE on the D6 trusted-value artifact.** The record input is
  wins-above-roster-strength-expectation, where the expectation is the **D6/D8 trusted True-Value projection** (NOT raw
  W-L, NOT the untrusted `franchiseExpectedWinsPreview`). This drops the salary-based expectation per (c) and
  **HARD-couples the MOY build to D6** — consistent with the D-stack order (D9 → D8 → D6). MOY cannot be built before
  the value-trust gate lands.
- **MOY-4 (JK) — No fame tilt for v1.** MOY is a PURE truth-layer computation; managers sit outside the player fame
  economy; manager legacy = the Almanac record. (Diverges deliberately from §21/RACE-4's merit-award fame tilt, which
  applies to players.) Manager-fame is a post-v1 revisit.

**Captain rulings (engineering / architecture / sim-deferred — JK-overridable):**

- **MOY-5 (Captain — architecture) — Build as a season aggregation of the existing `pogAwards` per-game composite.**
  Reuse `PogManagerValueTotal` → extend to season grain; wrap in the (absent) `franchiseAwardsEngine` /
  `franchiseAwardsStorage`. NOT a parallel new engine. Retire `calculateMOYVotes` + the deprecated `mwarCalculator`
  salary path + the orphaned `useMWARCalculations` hooks. **Re-point `AwardsCeremonyFlow`/`RatingsAdjustmentFlow` off
  `calculateMOYVotes` BEFORE any offseason flag flip**, so flipping the flag never exposes the deprecated salary MOY.
- **MOY-6 (Captain — common-scale method for (a)) — Pool-relative normalization for the SEASON award.** Normalize each
  of the 4 inputs across the manager pool (rank / z-score, mirroring the existing `scaleToRange` idea) BEFORE weighting.
  This dissolves the denomination mismatch without inventing an IV→WP calibration constant and without touching the
  frozen value layer; it is also what a competitive award wants. The per-game `pogAwards` raw-sum + caps stay unchanged.
- **MOY-7 (Captain — weighting, sim-deferred) — Composite weights → Simulation Gate (§16).** Lock the STRUCTURE now
  (4 pool-normalized inputs, record expectation-relative on D6); the weight split (the deprecated 60/40's 4-way
  successor) is a sim-tuned starting guess settled by the Sim Gate, like every other Phase-2 magnitude.

**Build-ready contract (carried to the D9 / Phase-2 ticket):** create `franchiseAwardsEngine` + `franchiseAwardsStorage`;
aggregate the per-game `PogManagerValueTotal` composite to a season manager total (4 inputs); pool-normalize then weight
(weights = sim-tuned); record term = wins-above-D6-expectation; resolve MOY-2 (realized record vs T10 standard) at build;
retire `mwarCalculator`/`calculateMOYVotes` + re-point the dead-gated ceremony first; NO fame tilt; auditor ≠ builder;
the D6 trusted-value dependency makes this a post-D6/D8 ticket. All magnitudes → Simulation Gate (§16).
