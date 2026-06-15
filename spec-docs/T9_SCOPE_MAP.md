# T9 — GameTracker Sub Recommendation Rebuild — SCOPE MAP

**Created:** 2026-06-14 (Captain synthesis from a 4-agent decorrelated read-only mapping fan-out)
**Status:** RATIFIED — 4 JK rulings recorded (DECISIONS_LOG 2026-06-14). Split = 2 tickets (T9a engine →
T9b integration). T9a contract drafted → Codex build. No build/test run yet (mapping task).
**Authoritative spec:** `IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md` **§10** (line 553 — Sub Recommendation
Rebuild, D12), **§4.1-§4.5** (effectiveRatings / mojo+pressure / traitMatrix / fatigue-stamina /
DefensivePlacementRisk), **§8.1/§8.3** (the sibling lineup + farm rec surfaces), **§11** (engine boundary),
**§12** (constants), **§13** (build seq — T9 line 640). Routing: Codex 5.5 | very high → Opus audit
(GameTracker state integration — audit NON-NEGOTIABLE). All verdicts grep+read-verified (file:line cited).

> §10 verbatim: "Current logic = placeholder; REPLACE, do not patch. In-game sub recs consume LIVE
> GameContext (count, pressure, runners, opposing player incl. their traits, inning) → effectiveRatings for
> every eligible sub vs current player → recommend when delta exceeds subRecThreshold, with justification
> strings ... Pitcher-change recs honor role-misuse mojo penalties (§4.2) and stamina model (§4.4). Same
> matrix/data tables as §4 — one truth, three surfaces."

---

## 1. WHAT T9 IS

Rebuild the GENERATION internals of the in-game manager-recommendation engine onto `effectiveRatings` — the
**third surface** of the same T6 engine that T7a (`optimizeLineup`) and T7b (`recommendRosterMoves`) already
consume. The placeholder is `src/utils/managerWpaRecommendations.ts:505` `generateManagerRecommendations`,
a leverage/standards heuristic (`batterScore = 0.6·CON + 0.4·POW` :230; `defenderScore = FLD + 0.2·ARM`
:234; "improvement ≥ 12" :377; "grades as a stronger bat" :403) that consumes **none** of
effectiveRatings/traits/mojo/fitness/DefensivePlacementRisk. The recommendation OUTPUT type
(`ManagerRecommendation`), the watch/prompted-decision plumbing, and the in-game NewsBoard UI all **STAY** —
only the three generators are rebuilt.

---

## 2. THE DECISIVE FINDING (de-risks the ticket)

**Full ratings AND traits are already in live state — no new roster plumbing required.** The live roster
`Player`/`Pitcher` (`TeamRoster.tsx:37/:71`) carry power/contact/speed/fieldingRating/arm/velocity/junk/
accuracy/arsenal + trait1/trait2 + battingHand/throws; the raw roster arrays (`battingTeamPlayersRaw`/
`fieldingTeamPlayersRaw` `GameTracker.tsx:3352`, `activePitcher` :3533, `currentBatterRoster` :10219) are
already in scope at the rec `useMemo` (:10207). They are simply STRIPPED to thin scalars before the engine
call (:10310). Live mojo/fitness: `getMojoForPlayer`/`getFitnessForPlayer` (:5008/:5021). Pitch count:
`pitcherStats.get(id).pitchCount`. **The only genuinely missing GameContext input is `pressure`** —
only a raw `leverageIndex` exists (`getCurrentLeverageIndex` `useGameState.ts:2671`; clutch precedent
`LI ≥ 1.5` :6354), so T9 derives the `'none'|'high'|'extreme'` band.

---

## 3. REUSE — DO NOT REBUILD (grep+read-verified)

| Asset | File:line | T9 use |
|---|---|---|
| effectiveRatings | `effectiveRatings.ts:484` `(p, state, ctx, potency='L2')` | Composes base + self/opponent traitDeltas + mojo(pressure) + fatigueDecay + handedness. Call per current + each candidate. **potency='L2'** (R12 deferred). |
| defensivePlacementRisk | `effectiveRatings.ts:501` | Defensive-sub justification surface ({chanceFreq, errorLik, spectacularLik, expectedMojoDriftPerGame}; out-of-position mojo already folded). |
| computeIV | `ivEngine.ts:638` `.kblIV` | The score sink. |
| **IV-of-effectiveRatings scoring** | `rosterAnalyzer.ts:529-572` `ivOfEffectiveRatings` | THE "one truth" recipe: effectiveRatings → clamp 0..99 → `computeIV(input).kblIV`. Mirror exactly, swapping the neutral lineup ctx for the LIVE ctx. |
| defensive penalty fold + justification | `rosterAnalyzer.ts:507-527` `assignmentEntry`, `:589-603` `justificationFor` | T7a folds `chanceFreq·errorLik·lineupDefensiveRiskIvPenalty(300k)` into the score + a justification precedence (mojo/fitness/split/defensive) to extend. |
| TraitInteractionMatrix | `traitInteractionMatrix.ts` (POPULATED) consumed by `effectiveRatings.ts:347/355` | Trait activations (Pinch Perfect, Clutch, vs-LHP/RHP, trait-vs-trait standoffs) available for justification naming — read `predicatesActive` to name what fired. |
| Output + plumbing (STAYS) | `managerWpaRecommendations.ts` `ManagerRecommendation` :35, `createRecommendation` :212, `buildManagerRecommendationSuppressKey` :132, `buildPromptedManagerDecisionFromRecommendation` :150, `buildManagerRecommendationWatchEvent` :190; `useGameState.ts:8885` `recordManagerRecommendationWatch`; NewsBoard render `GameTracker.tsx:12047` | Keep emitting `ManagerRecommendation` verbatim; watch/decision/UI unchanged. |
| Constants (auto-applied) | `rosterEngineConstants.ts` MOJO_DELTAS :85, PRESSURE_MULTIPLIER :95, FATIGUE_MODEL :113 | mojo×pressure + stamina decay are AUTOMATIC once T9 passes `state.mojo` + `state.workload.{role,pitchesThrown}` + fitness. |

---

## 4. MISSING / BUILD

1. **subRecThreshold** — ABSENT from `rosterEngineConstants.ts` (§12:615 "TBD in T6/T7"). Add it; units =
   kblIV dollars (to match the delta). Single vs per-type → scope Q2.
2. **The three generators rebuilt** — `getPitchingRecommendation` (:274), `getPinchHitterRecommendation`
   (:350), `getDefensiveReplacementRecommendation` (:410): score `candidateKblIV − currentKblIV` via the
   `ivOfEffectiveRatings` recipe under LIVE ctx; emit when delta > subRecThreshold. DELETE the heuristic
   primitives (batterScore/defenderScore/improvement gates).
3. **Pressure band derivation** — map `leverageIndex` → `'none'|'high'|'extreme'` (Captain default cutoffs,
   §6). NEW (no live pressure field today).
4. **Role-misuse mojo penalty** — `ROLE_MISUSE_MOJO_PENALTY` (:101) is defined but consumed NOWHERE;
   effectiveRatings does NOT apply it. T9 OWNS this: for pitcher-change recs, shift the candidate's
   `PlayerState.mojo` DOWN N MOJO_STATES levels (SP relieving/RP starting −1, CP starting −2, CP before the
   game-length-relative 2nd-to-last inning −1, SP/RP immune) before scoring (Captain default, §6).
5. **Input-contract expansion + call-site widening** — `ManagerRecommendationInput` player sub-shapes
   (:59-89) carry only thin scalars; expand to carry traits + all 8 attrs + mojo/fitness/workload +
   opposing player + live GameContext, and WIDEN the `GameTracker.tsx:10207-10341` mapping to pass the
   full (already-in-scope) roster objects. **This is the audit-non-negotiable GameTracker-state surface.**
6. **Justification strings** — extend `justificationFor` precedence to §10's set (trait activations incl.
   Pinch Perfect, mojo, fatigue, DefensivePlacementRisk, trait-vs-trait standoffs).
7. **Test rewrite** — the ~8 generation-behavior tests assert scalar thresholds and WILL go RED under
   effectiveRatings scoring; rewrite to assert trait/mojo/IV-driven outcomes. The plumbing tests (watch/
   prompted-decision/suppress) STAY GREEN (output contract preserved).

---

## 5. PROPOSED SPLIT (Captain recommendation — PENDING JK)

Engine-first, mirroring T6→T7→T8:
- **T9a — Pure sub-recommendation engine.** New `src/engines/subRecommendations.ts` (`recommendSubs`)
  returning a neutral `SubRecommendation[]` — scores current vs each eligible sub via the
  `ivOfEffectiveRatings` recipe under a supplied live `GameContext`, applies role-misuse mojo (pitcher) +
  defensive-risk (defensive), thresholds on `subRecThreshold`, emits justification factors. + add
  `subRecThreshold` to the registry. Exhaustively unit-tested vs the engine. NO GameTracker wiring. Pure →
  standing auto-commit.
- **T9b — GameTracker integration.** Expand `ManagerRecommendationInput`; widen the call-site mapping
  (`GameTracker.tsx:10207`) to feed full roster objects + derive the pressure band + build PlayerState;
  rebuild the 3 generators in `managerWpaRecommendations.ts` to call the T9a engine and map
  `SubRecommendation → ManagerRecommendation`; rewrite the generation tests. Keep output/plumbing/UI.
  PERSISTENCE-touch is NONE, but it's user-visible + GameTracker-state → audit non-negotiable + JK surface
  before commit.

(Alternative: a single T9 ticket. Heavier not recommended.)

---

## 6. SCOPE QUESTIONS — RESOLVED (JK 2026-06-14, DECISIONS_LOG)

- **Q1 — Delta metric → RULED: IV-of-effectiveRatings (kblIV)** for all three rec types ("one truth").
- **Q2 — subRecThreshold → RULED: per-type** (pinch-hit / defensive / pitcher-change), kblIV-dollar units, CALIBRATE.
- **Q3 — Module placement → RULED: new pure engine** `src/engines/subRecommendations.ts`; util = thin adapter.
- **Q4 — Split → RULED: 2 tickets** (T9a pure engine → T9b GameTracker integration), engine-first.

### Captain defaults (proceed-unless-vetoed; stated for the record)
- **Pressure band:** `none` for LI < 1.5; `high` for 1.5 ≤ LI < 3.0; `extreme` for LI ≥ 3.0 (builds on the
  existing `isClutch` LI≥1.5 precedent; CALIBRATE).
- **Role-misuse:** apply as a mojo-LEVEL down-shift on the candidate's PlayerState before scoring (matches
  "encoded as mojo levels"); CP early-entry inning derived from `totalInnings`, not hardcoded 8th.
- **Defensive-sub:** fold DefensivePlacementRisk INTO the kblIV delta (mirror `assignmentEntry`) AND surface
  it as justification — risk-adjusted "one truth" with T7a.
- **No-oracle-leak:** N/A for T9 — in-game subs come from the ACTIVE known 22-man roster (no farm/scout
  layer). Stated so the auditor does not flag a missing leak guard.

---

## 7. TOP RISKS

- **Orphan/no-op risk (#1):** if the generators are rebuilt but the call-site mapping is NOT widened, the
  engine runs on defaults (Normal mojo, FIT, no traits, no opposing player) and silently produces generic
  output. Tier-2 trace must confirm traits/mojo/fitness/opposingPlayer flow UI → input → engine.
- **One-truth integrity:** the delta MUST be `computeIV(eff(...)).kblIV` like `rosterAnalyzer.ts:571`, not a
  rating-sum — else the three surfaces silently disagree. Auditor diffs the scoring path vs the sibling.
- **Role-misuse is brand-new wiring** T9 owns (effectiveRatings doesn't apply it) — easy to skip and still
  "pass build"; the audit must specifically check it.
- **Output-contract preservation:** never rename/remove `ManagerRecommendation` fields (cascades into
  watch/prompted-decision/UI). Add-only. The plumbing tests guard this — keep them GREEN.
- **Un-exported engine types:** `GameContext`/`PlayerState`/`EffectiveRatingsPlayer`/`PlacementRisk` are NOT
  exported (rosterAnalyzer redeclares PlayerState locally). T9 must export them (preferred) or risk a third
  drifting copy.
- **WPA boundary:** the file is `managerWpaRecommendations.ts` and a `wpaRuntimeBoundary` characterized-fail
  test exists; confirm the IV-of-effectiveRatings rebuild does not trip the WPA allowlist. `leverageIndex`
  stays an input (confidence/surface + pressure derivation), but scoring moves off WPA.
- **subRecThreshold unit mismatch:** threshold units must equal the delta units (kblIV dollars) or recs fire
  never/always.
- **Test churn vs regression:** the ~8 generation tests go RED by design — rewrite, don't delete; keep the
  baseline distinguishable from a real regression.
