# Interface Contract — what the manager-WPA lane needs FROM the keystone optimizer

**Date:** 2026-06-26 · **Branch:** `experiment/manager-wpa-window` · **For:** the draft-pipeline lane (`codex/draft-pipeline-fix`)
**Companions:** `MANAGER_WPA_WINDOW_AUDIT.md`, `SITUATIONAL_ADVISOR_AND_OPTIMAL_LINEUP_DEEPDIVE.md`, `FRANCHISE_DRAFT_ARCHETYPE_ALIGNMENT_BRIEF.md`
**Grounded against existing code** (cited) so it plugs into the keep-in/recommendation plumbing with zero rework on the manager-WPA side.

## Purpose
Two consumers in the manager-WPA lane ride on the keystone optimizer (in-season scout). They need a stable,
**headless, win-value-denominated** interface:
- **(A) Rung-2 (conscious keep-in):** at a live decision point, did a *meaningfully better* move exist, what was it,
  and **how much better** (in win-value) — so the manager-WPA credit can gate + weight "how good was the call he declined."
- **(B) Opponent-SP lineups tab:** optimize a lineup against the **actual next starter's full profile** (not just L/R hand).

## The non-negotiable: win-value units, not auction dollars
Today the advisor scorer ranks candidates by `computeIV().kblIV` — an **auction-dollar** delta
(`subRecommendations.ts:131-158`; formatted `"$X IV delta"` at `managerWpaRecommendations.ts:504/554/619`). Rung 2 pays
the manager a **share of the kept player's net real WPA** (win-probability units; `MANAGER_DEPLOYMENT_SHARE_BY_ROLE.kept_*_in`,
`calculateManagerDeploymentWpa`, `managerWpaGameState.ts:54-99`). **A dollar magnitude cannot be compared to or combined with
a WPA credit** — the units don't reconcile and any blend silently corrupts the credit. So every magnitude the optimizer
returns to this lane **must be projected kbl-WPA** (the same scale as `OptimalLineupSlot.projectedSlotKblWpa`).

## Interface sketch

```ts
// ---- (A) Rung-2: did the manager decline a GOOD move, and how good? ----

export interface ScoutMoveEvaluation {
  evaluationId: string;                 // stable id → ManagerRecommendation.recommendationId + suppress/provenance key
  decisionType: 'pitcher_change' | 'pinch_hit' | 'defensive_replacement';
  incumbentPlayerId: string;            // → trackedPlayerIds[0] (the kept player)
  bestCandidateId: string | null;       // → trackedPlayerIds[1]
  bestCandidateName: string | null;

  bestMoveKblWpaGain: number;           // THE yardstick: projected win-prob ADDED by the better move, vs leaving incumbent in.
                                        // Units = projected kbl-WPA. MUST be >= 0 when recommend === true.
  recommend: boolean;                   // a MEANINGFULLY better move exists (cleared threshold). Rung-2's gate.
  thresholdKblWpa: number;              // the win-value bar applied (same one the live advisor card uses).
  recommendationStrength: 'high' | 'medium' | 'low';

  rankedCandidates: ScoutCandidateScore[]; // element 0 == best
  justification: string;
  algorithmVersion: string;
  optimizerConstantsVersion: string;
}

export interface ScoutCandidateScore {
  candidateId: string; candidateName: string;
  kblWpaGain: number;                   // projected kbl-WPA gain of THIS candidate vs incumbent (signed)
  justification: string;
}

export interface ScoutDecisionContext {  // PURE value object — no React, no IndexedDB
  gameId?: string;
  inning: number; half: 'top' | 'bottom'; outs: number; totalInnings: number;
  leverageIndex: number;                // passed so the scout can scale; leverage stays intrinsic to WPA (see open Q1)
  count?: { balls: number; strikes: number };
  basesOccupied: { first: boolean; second: boolean; third: boolean };
  scoreDifferentialForFieldingTeam: number;
  battingTeamId: string; fieldingTeamId: string;
  incumbent: ScoutPlayer; candidates: ScoutPlayer[];
  opposingPitcher?: ScoutPlayer;        // FULL profile, not just hand — needed for the matchup substrate
  opposingBatter?: ScoutPlayer;
}

/** Synchronous, pure; replayable headless from the event log so the same answer reproduces in-sim. */
export function evaluateScoutMove(ctx: ScoutDecisionContext): ScoutMoveEvaluation;

// ---- (B) Lineups tab: optimize vs the ACTUAL next starter ----

export interface OpponentStarterProfile {
  pitcherId: string; pitcherName: string; throws: 'L' | 'R';
  velocity?: number; junk?: number; accuracy?: number;
  trait1?: string | null; trait2?: string | null; traits?: string[];
  arsenal?: string[]; armSlot?: 'High' | 'Mid' | 'Low' | 'Sub' | null;
  pitcherRole?: 'SP' | 'SP/RP' | 'RP' | 'CP';
}

export interface OptimizeLineupVsStarterInput {
  teamId: string; mode: OptimalLineupModeContext; instanceId?: string; dhEnabled?: boolean;
  roster: ScoutPlayer[];
  opponentStarter: OpponentStarterProfile;   // replaces the lone opposingPitcherHand:'L'|'R'
  chosenLineup?: { playerId: string; battingOrderSlot: number; defensivePosition: string }[];
}

/** Returns the EXISTING OptimalLineupSnapshot shape → drops into the snapshot plumbing with zero adapter. */
export function optimizeLineupVsStarter(input: OptimizeLineupVsStarterInput): OptimalLineupSnapshot;

export type ScoutPlayer = OptimalLineupCandidate;  // the flattened player value object both queries reuse
```

## Maps onto existing shapes (no rework on the manager side)

| New field | Existing shape it feeds | File |
|---|---|---|
| `recommend` | `SubRecommendation.recommend` (today `bestDelta > $threshold`) — same gate, new win-value basis; Rung-2 already opens keep-ins off it | `subRecommendations.ts:56-65,117` |
| `bestMoveKblWpaGain` | replaces `SubRecommendation.bestDelta` (auction-$ kblIV delta) | `subRecommendations.ts:60,116,131-158` |
| `recommendationStrength` | `SubRecommendation.confidence` → `ManagerRecommendation.confidence` → `PromptedManagerDecisionEvent.confidence` | `subRecommendations.ts:62,236-241`; `managerWpaRecommendations.ts:200` |
| `incumbentPlayerId`+`bestCandidateId` | `ManagerRecommendation.trackedPlayerIds` (= `[currentId, bestId]`); `trackedPlayerIds[0]` is what the keep-in record writes | `managerWpaRecommendations.ts:185,431-433` |
| `evaluationId` | `ManagerRecommendation.recommendationId` + `suppressKey/provenanceKey` → matched to the `kept_*_in` stint in `groupPromptedKeepCurrentDeploymentOpenings` | `managerWpaRecommendations.ts:209`; `managerWpaGameState.ts:763,781-786` |
| `decisionType` | `ManagerRecommendationType` → `getPromptedDecisionTypeForRecommendationAction` → `kept_pitcher_in`/`kept_position_player_in`/`kept_defender_in` | `managerWpaRecommendations.ts:19-22,168-175` |
| `optimizeLineupVsStarter()` → `OptimalLineupSnapshot` | consumed as `optimalLineupSnapshots`; tab reads `.slots[].projectedSlotKblWpa` + `.projectedTeamLineupKblWpa` | `types/managerWpa.ts:35-50`; `managerWpaGameState.ts:157,196-228` |
| `OpponentStarterProfile` | replaces the lone `opposingPitcherHand:'L'|'R'` (the only opponent signal today) | `types/managerWpa.ts:40`; `optimalLineup.ts:72` |
| `ScoutDecisionContext` | `ManagerRecommendationInput` minus the React/roster-resolution wrapper | `managerWpaRecommendations.ts:116-143` |
| `ScoutPlayer` | `OptimalLineupCandidate` / `RecommendationPlayerBase` flattened player | `optimalLineup.ts:22-46`; `managerWpaRecommendations.ts:65-94` |

## Optimizer guarantees (the lane relies on these)
1. **Determinism** — pure functions; same context in → byte-identical out; no `Date.now()`/`Math.random()`/IndexedDB inside.
   Stamp `algorithmVersion` + `optimizerConstantsVersion` (mirrors `captureOptimizerConstantsSnapshot().version`).
2. **Units** — every magnitude is projected kbl-WPA on ONE shared scale, never auction $/kblIV.
3. **Sign** — `bestMoveKblWpaGain >= 0` whenever `recommend===true` (positive = "the better move adds this much win prob").
4. **Completeness** — `evaluateScoutMove` never throws / never returns null; returns `recommend:false` with `rankedCandidates`
   populated so "manager was offered nothing better" is recordable.
5. **Threshold transparency** — return `thresholdKblWpa`; it is the SAME per-decision-type bar the live advisor card uses
   (no hidden second threshold).
6. **Snapshot shape stability** — `optimizeLineupVsStarter` returns the exact existing `OptimalLineupSnapshot` (no new
   trackerDb store/version bump).

## Headless / sim requirements
- `evaluateScoutMove` must be callable from the event-log replay path (`deriveManagerDeploymentStintRecords` /
  `groupPromptedKeepCurrentDeploymentOpenings`) so Rung-2 reproduces in-sim. Today the call is assembled ONLY inside a
  React `useMemo` (`GameTracker.tsx:10243-10466`) and persisted only in a React handler (`:10564-10696`).
- Inputs are plain value objects, not React entities. The win-value scoring must NOT live in the React handler — the
  handler only persists the `evaluationId` + `bestMoveKblWpaGain` the pure function produced.
- No IndexedDB inside the optimizer queries (the lane owns persistence). Must run under the L-SIM harness
  (`test-utils/lsim`) → no `window`/DOM/browser-only imports.

## Open questions back to the optimizer thread
1. **Leverage** — is `bestMoveKblWpaGain` the RAW projected WPA gain (leverage already intrinsic) or a leverage-SCALED gain?
   Rung-2 must not double-count leverage; it must match what the deployment-credit WPA already carries.
2. **Threshold ownership** — does the optimizer own `thresholdKblWpa`, or does the lane pass it in? Need ONE source of truth
   so the live card and the headless Rung-2 replay gate on the identical number.
3. **Projection consistency** — will `optimizeLineupVsStarter`'s `projectedSlotKblWpa` be byte-identical to what the
   snapshot path stamps for the same player+context? If not, the tab and any snapshot consumer disagree.
4. **Opponent fidelity** — does `optimizeLineupVsStarter` consume `OpponentStarterProfile` *through the matchup substrate*
   (lifetime + recency), or only static ratings/traits? Rung-2's keep-pitcher evals need the same substrate the tab uses.
5. **Snapshot identity** — who mints `snapshotId`/`sourceConfidence` for the tab's output (optimizer vs lane at persist)?
6. **Tiebreak** — `recommendSubs` breaks score ties by `candidateName.localeCompare`; guarantee the same stable tiebreak so
   headless replay and live agree on `bestCandidateId`.

## Lane coordination / sequencing (shared-file collisions)
- **`effectiveRatings.ts` (shared spine, HIGH overlap):** DRAFT lane owns the shared edits — un-pin potency from L2 →
  dynamic chemistry-driven potency, and wire the fielding-corrected true-value. The manager lane **consumes** the upgraded
  spine; it does **not** edit potency/true-value. (Manager metric ships first and doesn't touch this file at all.)
- **`playerDatabase.ts` (trait types/chemistry):** DRAFT lane owns the chemistry→potency resolver + recompute-on-roster-move.
  **Do NOT add a static trait-level field** (superseded by JK's dynamic ruling). Watch the trackerDb version-pin trap if a
  persisted potency cache is added.
- **`managerWpaGameState.ts`:** MANAGER lane edits exclusively (un-filter roles, add untouched-starter stint, retire
  lineup_delta). DRAFT lane must NOT edit it. Land the lineup_delta retirement BEFORE the draft lane reshapes
  `projectedSlotKblWpa`, else the still-live lineup_delta reads a changed snapshot shape and miscalculates.
- **Recommendation chain (`subRecommendations.ts` / `managerWpaRecommendations.ts`):** DRAFT lane delivers the win-value
  scorer (replaces the kblIV yardstick); MANAGER lane swaps it in at the scorer call-site and owns the rest (ranking,
  thresholds, keep-in record, headless decline policy, live-state hoist).
- **`managerDecisionRegistry.ts` doubleCountingExclusions:** MANAGER lane only — enforce as a real subtraction in the same
  change that adds the every-player stint + retires lineup_delta.

## ⚠️ Internal conflict for JK (not cross-lane): retire the old "lineup vs optimal" credit
The net-from-zero 3:2:1 model credits **untouched starters** via a tenure stint (rung 3). The existing `lineupDeltaWpa`
term ALSO credits the starter (vs-optimal opportunity cost) and is summed live into the manager total + consumed by
`almanacQueries`, `franchiseAwardsEngine`, `pogAwards`, `teamImpact`, `ManagerWpaOverlay`, `TeamImpactLeaderboardsPanel`,
`ManagerAlmanac`. **Both standing = the starter is double-credited.** Resolution (manager lane owns it; draft lane untouched):
when the untouched-starter stint is added, **retire `deriveTeamLineupDeltasFromOptimalSnapshot`'s contribution** and update
those consumers. This is the logical consequence of JK's net-from-zero ruling — **needs JK's explicit confirm** because it
changes existing award/almanac/overlay numbers.

---

## ✅ Optimizer-thread answers (`codex/draft-pipeline-fix`, 2026-06-26)

**Confirmed:** the draft lane owns the shared `effectiveRatings`/`playerDatabase` edits (dynamic chemistry-potency + fielding-corrected true-value) and delivers the win-value scorer; the manager lane owns `managerWpaGameState`, the recommendation-chain swap-in, and the lineup_delta retirement. Both functions (`evaluateScoutMove`, `optimizeLineupVsStarter`) will meet all 6 guarantees (pure/deterministic, win-value units, sign, completeness, threshold transparency, snapshot-shape stability).

**Answers to the 6 open questions:**

1. **Leverage — RAW (leverage-intrinsic).** `bestMoveKblWpaGain` = projected win-prob ADDED by the better move given *this* game state. Leverage is an **input** to that projection (the scout uses `leverageIndex` + base/out/inning/score to compute it), so the output is already leverage-aware — there is **no separate leverage multiplier** on top. This matches the deployment-credit WPA (also leverage-intrinsic real WPA) → no double-count. The recommend threshold is a **fixed WPA bar**; since the magnitude is already leverage-scaled, a fixed bar yields the leverage-sensitive recommend behavior the deep-dive wanted (big WPA gains in high leverage clear it; trivial gains in blowouts don't) — without double-counting leverage in either the magnitude or the gate.

2. **Threshold ownership — the OPTIMIZER owns it.** `thresholdKblWpa` is a versioned per-decision-type constant inside `evaluateScoutMove` (stamped via `optimizerConstantsVersion`); the optimizer computes `recommend` against it and returns the exact bar used. The lane does NOT pass one in or apply its own. Single source of truth: the live card and the headless Rung-2 replay both call the same function → identical threshold → identical gate.

3. **Projection consistency — YES, byte-identical.** `optimizeLineupVsStarter` uses the ONE canonical projection path (`effectiveRatings → IV → WPA`, the existing `buildOptimalLineupSnapshot` conversion), routed **away from** the parallel raw-ratings heuristic fallback (`optimalLineup.ts:563-740`) to kill the latent drift. The full `OpponentStarterProfile` is a superset of the old L/R hand, so for the same player+context the projection reduces identically. Pure → deterministic → byte-identical.

4. **Opponent fidelity / matchup substrate — v1 static full-profile; substrate added later as a SHARED optional input read identically by BOTH functions.** v1: both consume the static full opponent profile (ratings/traits/handedness via `effectiveRatings`, already opponent-aware). When the matchup substrate lands (the shared build, interface TBD), it's an OPTIONAL field on `ScoutDecisionContext` + `OptimizeLineupVsStarterInput`, read through the *same* substrate interface by both `evaluateScoutMove` (keep-pitcher evals) and `optimizeLineupVsStarter` (the tab) → identical matchup ranking. Signatures will be shaped NOW to accept the optional matchup input so adding it later is non-breaking. Agreed: pin the substrate interface before either consumer wires it.

5. **Snapshot identity — the LANE mints `snapshotId` + `sourceConfidence` at persist.** The optimizer is pure (no random/time id-minting): it returns the computed snapshot CONTENT (`slots[].projectedSlotKblWpa`, `projectedTeamLineupKblWpa`) + the deterministic version stamps (`algorithmVersion`, `optimizerConstantsVersion`); the lane fills `snapshotId`/`sourceConfidence` on write (it owns persistence). Returned shape = "snapshot content, identity-unset"; zero adapter.

6. **Tiebreak — YES, identical.** `evaluateScoutMove` (and the lineup optimizer's slot assignment) break score ties by `candidateName.localeCompare`, then `candidateId` as a final stable tiebreak (deterministic even with duplicate names) → headless replay and live agree on `bestCandidateId`.

**Sequencing acked:** draft lane lands the `effectiveRatings`/true-value shared-spine edits; manager lane lands the lineup_delta retirement **before** the draft lane reshapes `projectedSlotKblWpa`. The "retire `deriveTeamLineupDeltasFromOptimalSnapshot`" conflict is manager-lane + JK's confirm — it does not strand the optimizer (optimal-lineup keeps its lineups-tab home).
