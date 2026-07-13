# DRAFT / SALARY / FARM ECONOMICS — §18.3 CERTIFICATION READ

**Created:** 2026-06-16
**Author:** Captain (Opus 4.8). Method: a `draft-salary-farm-economics-read` workflow — 6 mappers (salary/rookie-scale, 22-man↔prospect, draft systems, pick-trade execution, prospect generation/grade distribution, tier/pool economics) + 5 adversarial verifiers.
**Status caveat (honest):** the Anthropic API hit `529 Overloaded` mid-run; the two dedicated **salary** mappers + their two verifiers failed and are **re-running**. This doc is built from the **4 surviving maps + 3 surviving verdicts**, in which the salary **core** is corroborated by **3 independent agents** — so the findings below are high-confidence; the re-run **hardens** the salary verification, it does not overturn it. (The deep `franchiseSalary`/`franchiseSalaryLifecycle` layering detail is the one thing pending.)
**Scope:** §18.3 — lock how 22-man & farm-prospect salaries relate; the tier-adjusted relative-to-pool rookie scale; tradeable farm slots; per-draft grade distribution. Feeds the D-stack draft pieces.

> **CURRENT IMPLEMENTATION CORRECTION (2026-07-12):** the evidence below is the original
> pre-build read, not current code state. The deleted `LeagueBuilderSnakeDraft.tsx` is replaced
> by shared Draft Setup plus `SnakeDraftSetupAdapter.tsx` and `SnakeDraftRoom.tsx` at
> `/snake-room`. Pick trades now execute atomically against persisted ownership/order, including
> farm trades with frozen absolute-slot salary. Both draft phases confirm immutable manifests;
> Franchise launch requires both handoffs, carries settled rosters/morale/provenance, and creates
> zero schedule rows so CSV/manual schedule entry happens inside Living Season.

## A. HOW 22-MAN & FARM-PROSPECT SALARIES RELATE *TODAY* — they don't (two disconnected scales)

- **22-man** = IV-based (`computeIV().kblIV`), **tier-INVARIANT** — `calculateSalaryWithBreakdown` (`salaryCalculator.ts:763`) = `ivBase × positionMultiplier × traitMod(1.0) × ageFactor(or 0.50 rookie) × perf × fame × personality`, **no tier term**. Tier touches only the team budget ceiling (`tierCap`) + luxury caps, never per-player price.
- **Farm-prospect** = a **flat 4-row draft-round table** — R1 6665.94 / R2 3999.57 / R3 2333.08 / R4+ 1666.49 (`prospectSalary.ts`, `prospectSalaryForDraftRound`), explicitly `CALIBRATE (T5 bridge)`, **independent of pool / tier / grade**. Set at draft, **UNCHANGED at call-up** (confirms F-127).
- **Rookie scale** = an **absolute `ROOKIE_SCALE_FACTOR = 0.50`** (`salaryCalculator.ts:380`) that merely substitutes for the age factor on the IV-based salary (`:790`) — **not pool-relative, not tier-adjusted.**

## B. STRUCTURAL FACTS (the build levers)

- **The pick-value chart is ALREADY relative-to-pool** — `derivePickValueChart` (`leagueConstruction.ts:264`) maps the pool's IVs sorted-descending to pick slots, so a lower-IV pool yields lower top-slot values automatically (test asserts juiced steeper than nerfed). **But** it's MLB-22-only and is **not consumed by any salary/rookie-scale assignment** (the snake draft prices candidates off `poolPlayer.salary`, not the chart).
- **THE TIER→POOL-ANCHOR CRUX:** the IVs fed to the chart are **RAW, not tier-scaled** — `useLeagueBuilderData.ts:414` uses `calculateIvBaseSalary` which takes **no tier**. So today a nerfed pool's top anchor == a juiced pool's with the same players. The tier-scale constants (`TIER_SHIFTS.scale` std 0.8827 / nerfed 0.7919; `FARM_NERF_SCALES`; `TIER_RATING_SCALES`) **exist in `tierParams.ts:36-55` but are ORPHANED** (zero consumers outside the file + the python generator). **Connecting `TIER_SHIFTS[tier].scale` into the pool-IV feed is the single connect** that makes the pool top tier-sensitive (the §18.3 "nerfed pool → lower top-slot" property).
- **Pick-trade execution (historical finding, now superseded).** The original read found only advisory validation. Current snake code executes and persists commissioner-approved pick trades through the snake trade/session engines, then refits private boards and re-clocks a traded live pick without changing frozen slot economics.
- **Per-draft grade distribution = no knob.** Grade rolls via `roundGradeWeights` (`prospectScoutingDraftEngine.ts:316-357`), a pure function of `round` only — three hardcoded tables, round-1 a bell centered B-/B/C+ (A4/A-8/B+15/B20/B-22/C+18/C8/C-3/D+1/D1, ≈ F-126 intent). Already **independent of the 22-man tier** but with **no control surface at all** (grep for `tierParams|Juiced|Nerfed|gradeMode` in the generation modules = empty). `FARM_NERF_SCALES`/`TIER_RATING_SCALES` are the orphaned data source for a mode knob.
- **Draft systems (current):** **LIVE** — shared Draft Setup routes snake leagues to `/snake-room`; `SnakeDraftRoom.tsx` owns both the 22-man MLB phase and 10-man farm phase. Farm boards persist ids/order and scout-safe information only. Immutable MLB+farm manifests and roster-handoff markers gate Franchise launch. The recurring in-season/offseason rookie draft remains outside this startup-draft scope.

## C. BUILD vs CONNECT inventory

- **CONNECT (small):** wire `TIER_SHIFTS[tier].scale` into the pool-IV feed (`useLeagueBuilderData.ts:414`) → tier-sensitive `pickValueChart[0]`. This one connect unlocks the relative-to-pool, tier-adjusted anchor.
- **BUILD:** (1) the relative-to-pool **rookie/draft-slot scale function** `(tier, pickValueChart, draftSlot) → price`, replacing the absolute 0.50× and the flat farm table; (2) **pick-trade execution** (a pick-asset/ownership model + an executor that mutates draft-session pick order and persists, gated behind `validateTrade`) + extend `derivePickValueChart`/`validateTrade` to the **farm round**; (3) a **`farmGradeMode`** parameter on prospect generation (skewing the round-keyed tables via `FARM_NERF_SCALES`), threaded from a farm-draft control, independent of the 22-man tier.

## D. JK RULINGS (2026-06-16 — DSF-1..4; logged in DECISIONS_LOG)

- **DSF-1 — UNIFY on the tier-scaled pool anchor.** Connect `TIER_SHIFTS` so the pool top is tier-sensitive, then peg BOTH the 22-man rookie pricing AND farm-prospect pricing to that tier-scaled `pickValueChart[0]`, tapering down the slots — **replacing the absolute 0.50× rookie factor AND the flat farm-round table.** One coherent relative-to-pool, tier-sensitive scale.
- **DSF-2 — Tradeable asset = DRAFT PICKS (order positions).** Build a pick-ownership model + a pick-trade executor (mutates + persists `pickOrder`), and extend the pick-value chart + validator to the farm round. (Closest to real MLB; the chart already values picks.)
- **DSF-3 — Farm grade mode = MULTIPLICATIVE SHIFT.** Add `farmGradeMode: Juiced/Standard/Nerfed` that skews the existing round-keyed weight tables (grade-center shift via `FARM_NERF_SCALES`), independent of the 22-man pool tier — reuses the validated bell curve, easy to sim-tune.
- **DSF-4 (Captain default, not vetoed) — In-season annual draft stays DEFERRED to the offseason (post-v1 per LS-1).** The startup draft (League Builder) suffices for v1; the dry-run `franchiseDraftAdapter` apply path is post-v1.

All magnitudes (the slot taper, the tier scales once live, the grade-mode skew) → Simulation Gate (§16).
