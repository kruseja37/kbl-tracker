# KBL WPA Engine Rebuild Spec

Status: ready for implementation planning
Date: 2026-05-12
Scope: player WPA, Manager WPA, KBL WPA attribution, GameTracker, Game Detail, Almanac consumers

## 1. Why This Exists

The Manager WPA pinch-hit issue exposed a core WPA problem, not just a manager overlay problem.

Example failure:

- A pinch hitter homered and reduced the deficit from 9 runs to 6 runs.
- The Manager Moment resolved as negative Manager WPA.
- That should not happen for the batting team. A home run that scores runs and makes no outs must improve or at least not reduce the batting team's win probability, even in a blowout.

The likely root cause is the current synthetic win expectancy table in `src/engines/winExpectancyTable.ts`, especially:

- hard score-differential clamp at `-5..+5`
- hand-tuned runner/out adjustments
- rounded 9-inning normalization for shorter games
- table comments claiming empirical MLB/Tango/FanGraphs lineage while values are generated locally

This spec replaces the current ad hoc model with an explicit WPA v2 engine grounded in standard baseball win expectancy logic.

## 2. Research Baseline

External references reviewed:

- MLB glossary: WPA is the change in a team's win expectancy from one event to the next. Formula: `WE_after - WE_before`.
  - https://www.mlb.com/glossary/advanced-stats/win-probability-added
- FanGraphs WPA library: WPA is calculated from the before/after change in win expectancy; hitter and pitcher credits are symmetrical in standard player WPA.
  - https://library.fangraphs.com/misc/wpa/
- FanGraphs Win Expectancy library: WE depends on score, inning, outs, runners on base, and run environment, using historical comparable states.
  - https://library.fangraphs.com/misc/we/
- FanGraphs/Tango note: FanGraphs uses Tango-style win expectancy tables across run environments, then weights between run-environment tables.
  - https://blogs.fangraphs.com/get-to-know-win-expectancy/
- Tango sample tables: WE rows are home-team probabilities indexed by inning, half, score, outs, and base state.
  - https://www.tangotiger.net/welist.html

Implementation principle:

```text
home_wp_before = WE(home perspective, before state)
home_wp_after  = WE(home perspective, after state)
home_delta     = home_wp_after - home_wp_before
batting_delta  = home_delta if home batting else -home_delta
fielding_delta = -batting_delta
```

Manager WPA must use the same team-window delta as player WPA, then apply manager overlay share/caps after the correct team delta is known.

## 3. Current Code Audit

### `src/engines/wpaCalculator.ts`

Good:

- Encodes the right high-level formula: before WE, after WE, batting-team delta.
- Handles obvious terminal states such as walk-off and final outs.
- Existing callers are centralized enough that we can preserve the public shape during migration.

Needs change:

- It depends on `getWinExpectancy()` from the synthetic table.
- It returns only one `wpa` field, which forces callers to infer home/team deltas.
- It rounds too early. Keep full precision internally and round only at storage/display boundaries.

### `src/engines/winExpectancyTable.ts`

Must be rebuilt or replaced.

Current risks:

- `MIN_DIFF = -5` and `MAX_DIFF = 5` collapse every larger deficit/lead into the same bucket.
- A 9-run deficit becoming a 6-run deficit still stays in the `-5` bucket, so the engine may treat cleared bases as more important than 3 runs scored.
- The table is generated from hand-tuned constants, not an empirical table or calibrated model.
- Runner boosts and out penalties are static constants rather than observed/simulated state values.
- Variable innings are handled by `Math.round((inning / totalInnings) * 9)`, which creates rough inning pressure but not true remaining-out logic.
- The file comments say values are derived from empirical MLB/Tango/FanGraphs data. That is misleading unless we ship source data or a documented calibration process.

### `src/utils/kblWpaAttribution.ts`

Good:

- Player KBL WPA already derives from a shared `calculateWPA()` call.
- Offensive and defensive sides are budgeted from the same play delta.
- Counterfactual fielding logic is built around the same engine.

Needs change:

- All player KBL WPA inherits the synthetic WE flaws.
- Counterfactuals also inherit them, so fielding saves/robbed-HR logic can be numerically wrong even if the attribution split is structurally correct.
- Add explicit conservation tests: per play, batting budget + defensive budget should net to zero unless a documented overlay is requested.

### `src/utils/managerWpaDerivation.ts`

Good:

- Manager WPA is overlay-only and separated from collapsed player KBL WPA.
- Decision windows resolve from committed event data.
- Manager share is applied after the play/window delta.

Needs change:

- It uses the same flawed `calculateWPA()` windows.
- The current HR sign guard is a temporary seatbelt. A correct WPA engine should make that guard unnecessary, and the guard should be removed after v2 acceptance tests pass.
- Manager decision records should store the WPA model version used for reproducible Almanac/game-detail history.

### Other WPA-like Estimators

`src/engines/leverageCalculator.ts` exposes `estimateWinProbability()` with a comment that it is simplified. `src/engines/notabilityScorer.ts` uses that estimate when no WPA override exists.

Decision:

- Do not let simplified estimators produce official player WPA or Manager WPA.
- Either route notability through official WPA v2 when event state is available, or keep it explicitly narrative-only.

## 4. WPA v2 Target Model

### Algorithm Philosophy

The v2 engine should use variable, state-driven logic rather than fixed, brittle lookup shortcuts.

That does not mean arbitrary branching for every edge case. It means the algorithm should be deterministic and parameterized by the real game state:

- scheduled innings: any integer `1..9`
- inning/half/outs/base state
- score differential across a wide supported range
- remaining regulation outs
- terminal state rules
- run environment
- optional interpolation between supported score/run-environment buckets

The current failure came from fixed logic: score differential was clamped to `-5..+5`, so a 9-run deficit and a 6-run deficit could be treated as the same situation. WPA v2 must avoid stale calculations like that by using either a complete versioned table across the supported state space or a continuous calibrated model with monotonicity guarantees.

Allowed:

- versioned tables generated for the full supported state space
- interpolation between adjacent score/run-environment buckets
- smooth extrapolation beyond table boundaries
- deterministic terminal-state overrides

Not allowed:

- narrow fixed score clamps that collapse materially different states
- hand-tuned constants presented as empirical data
- event-specific sign patches for plays that should be handled by the model
- stale cached WPA surviving after event/enrichment data changes

### Canonical State

Add a canonical state type near the WPA engine:

```ts
interface WpaGameState {
  inning: number;
  halfInning: "TOP" | "BOTTOM";
  outs: 0 | 1 | 2;
  bases: { first: boolean; second: boolean; third: boolean };
  homeScore: number;
  awayScore: number;
  // Integer 1..9. Exhibition, elimination, franchise, and custom modes may choose any length in this range.
  scheduledInnings: number;
  runEnvironment?: number;
}
```

All callers should adapt into this state before calculation. No WPA caller should pass partial state directly into the model.

`scheduledInnings` must be validated as an integer from `1` through `9`. The engine should not special-case only common lengths such as 5, 7, or 9.

### Return Shape

`calculateWpaV2(before, after)` should return:

```ts
interface WpaResultV2 {
  modelVersion: "kbl-wpa-v2";
  homeWinProbabilityBefore: number;
  homeWinProbabilityAfter: number;
  homeDelta: number;
  battingTeamDelta: number;
  fieldingTeamDelta: number;
  battingTeamId?: string;
  fieldingTeamId?: string;
  validationWarnings: string[];
}
```

Storage can still keep legacy fields:

- `winProbabilityBefore`
- `winProbabilityAfter`
- `wpa`

But the authoritative calculation should preserve the explicit deltas.

### Win Expectancy Source

Preferred v2 source:

1. Generate or import a WE table keyed by:
   - scheduled innings: every integer from 1 through 9
   - inning or remaining outs
   - half inning
   - outs
   - base state
   - home score differential
   - run environment bucket
2. Store the generated table as versioned project data, not hidden hand-tuned code.
3. Interpolate between score/run-environment buckets where needed.

Acceptable v2 fallback if table generation is not ready:

- Use a continuous model calibrated against Tango/MLB-style WE reference points.
- Must support wide score differentials, at least `-15..+15`, with smooth extrapolation beyond the table.
- Must pass monotonicity and baseball sanity tests below.

Non-acceptable:

- Keeping the current `-5..+5` clamp.
- Keeping synthetic constants while implying empirical provenance.
- Adding more event-specific sign guards instead of fixing WE.

## 5. Scheduled-Innings Adjustment

Do not merely round a non-9-inning game into a 9-inning equivalent.

Required approach:

- Treat scheduled innings as part of the WE model.
- Pressure should be based on remaining regulation outs, not just inning number.
- Any scheduled final inning, whether inning 1 or inning 9, should behave like a final inning because it is the final inning.
- Intermediate innings should reflect remaining outs and run environment, not a rounded 9-inning equivalent. A 4-inning game's 2nd inning and an 8-inning game's 4th inning are both halfway points, but they should still respect the different number of remaining regulation outs.
- Extra innings should use final-inning/extra-inning logic with tied-score resets, not unbounded inning scaling.

Recommended state feature:

```ts
remainingRegulationOutsBefore =
  scheduledInnings * 6
  - completedHalfInningOuts
  - currentOuts;
```

The model can still expose inning/half in the lookup key, but tests should assert behavior by remaining outs.

## 6. Event-State Rules

Every official WPA calculation must obey these rules:

1. Runs scored by the batting team with no additional outs cannot reduce batting-team WPA.
2. A safe advancement by the batting team cannot reduce batting-team WPA unless it removes another runner or creates an out in the same committed event.
3. A batting-team out with no score or base improvement cannot improve batting-team WPA.
4. Walk-off states must resolve to home WE `1.000`.
5. Game-ending losses must resolve to the losing team's WE `0.000`.
6. Top-final-inning third out with home ahead must resolve to home WE `1.000`.
7. Bottom-final-inning third out with away ahead must resolve to home WE `0.000`.
8. Ties after regulation continue to extras rather than resolving.
9. All official WPA values must be reproducible from committed before/after state plus `modelVersion`.

## 7. Player WPA Rules

Player KBL WPA should continue to answer:

> Which players created or lost win probability on the field?

Keep:

- batting and defensive sides symmetrical by default
- counterfactual splits for fielding gems/saves
- manager overlays excluded from collapsed player totals

Change:

- Derive player credits from `battingTeamDelta` and `fieldingTeamDelta` instead of a single ambiguous `wpa`.
- Store or expose `modelVersion` with recalculated event WPA.
- Add migration behavior for archived games:
  - legacy games keep stored WPA unless explicitly recalculated
  - recalculated games mark `wpaModelVersion = "kbl-wpa-v2"`

## 8. Manager WPA Rules

Manager WPA should continue to answer:

> Which tactical, lineup, and personnel decisions created or lost win probability from the manager's team perspective?

Keep:

- Manager WPA overlay-only.
- Manager WPA excluded from collapsed player KBL WPA, Player of the Game, player awards, and player Almanac totals.
- Inherited runners remain context/stat responsibility, not collapsed player KBL WPA.
- Lineup Delta remains separate from Tactical Manager WPA.

Change:

- Decision windows must use the acting manager's team delta from WPA v2.
- Apply manager share after the team-window delta, never before.
- Store `wpaModelVersion` on `ManagerDecisionRecord` and `ManagerLineupDeltaRecord`.
- Remove event-specific HR sign guards after the v2 monotonicity tests pass.

## 9. Display Rules

GameTracker Manager Moment feed:

- Compact row:
  - inning half
  - manager/team label
  - signed Manager WPA
- Click/tap signed value to open the detail modal.
- Detail modal:
  - decision
  - involved players
  - before state
  - after/resolution state
  - raw team WPA window
  - manager share
  - final Manager WPA
  - source/provenance/confidence

Game Detail/Postgame/Almanac:

- Show Player KBL WPA and Manager Value in separate surfaces.
- Label WPA model version on detailed/debug views, not necessarily on the primary UI.
- Almanac must consume committed records only; no lazy derivation inside Almanac views.

## 10. Required Tests

Core WPA v2 tests:

1. Home/away perspective symmetry.
2. Batting-team HR always non-negative when it scores at least one run and creates no out.
3. HR down 9 to down 6 is positive for batting team.
4. Grand slam down 6 to down 2 is positive and larger than solo HR in same state.
5. One-run late HR has larger absolute WPA than same HR in a blowout.
6. Final-inning walk-off resolves to `1.000`.
7. Top final inning third out with home ahead resolves to `1.000`.
8. Bottom final inning third out with away ahead resolves to `0.000`.
9. Tied bottom final third out advances to extras, not game over.
10. Score differential monotonicity from `-15..+15`.
11. Base/out monotonicity for batting team: more bases/fewer outs should not reduce batting WE in the same score/inning state.
12. Variable scheduled innings: every scheduled length from 1 through 9 treats its final inning as final.
13. Extra innings use stable final/extra inning behavior.

Player KBL WPA tests:

1. Per-play batting credits sum to batting-team WPA.
2. Per-play defensive credits sum to fielding-team WPA.
3. Batting plus defensive budget nets to zero unless overlay mode is explicitly enabled.
4. Counterfactual robbed-HR/saved-base calculations use WPA v2.
5. Archived fallback games do not silently change WPA without recalculation.

Manager WPA tests:

1. Pinch hitter HR down 9 to down 6 produces positive manager window WPA for offensive manager.
2. Misclassified defensive replacement corrected to pinch hitter when replacement bats immediately.
3. Defensive substitution resolves from defensive-team delta only.
4. IBB window uses IBB plus next batter endpoint.
5. Pending manager decisions excluded from resolved totals.
6. Manager value equals resolved Tactical Manager WPA plus Lineup Delta.
7. Manager WPA never changes collapsed player KBL WPA totals.

UI tests:

1. Manager Moment feed row renders compact version.
2. Clicking WPA opens detail modal.
3. Modal shows raw team window and manager share.
4. Game Detail and Almanac display committed Manager Value only.

## 11. Implementation Plan

Phase 0 - freeze and document:

- Do not add more sign guards.
- Keep current Manager Moment UI fixes separate from WPA v2 work.
- Create a new branch for WPA v2 after current dirty Manager Moment changes are committed or intentionally shelved.

Phase 1 - engine:

- Add `src/engines/wpaV2.ts` and `src/engines/winExpectancyModelV2.ts`.
- Add canonical state adapters.
- Add versioned model metadata.
- Keep legacy `calculateWPA()` as a wrapper only after v2 parity/migration tests pass.

Phase 2 - player integration:

- Route `eventLog`, `useGameState`, and `kblWpaAttribution` to v2.
- Keep existing event storage fields but add/update `wpaModelVersion`.
- Rework counterfactual callers to use explicit deltas.

Phase 3 - manager integration:

- Route manager decision windows to v2.
- Remove `normalizeHomeRunWindowSign()`.
- Add manager record `wpaModelVersion`.
- Verify Manager Value overlay remains separate from player totals.

Phase 4 - notability and narrative:

- Route official play notability through stored/event WPA where available.
- Keep `estimateWinProbability()` narrative-only or deprecate it.

Phase 5 - acceptance:

- Run core engine, player KBL WPA, Manager WPA, GameTracker, Game Detail, Postgame, and Almanac tests.
- Add a replay fixture for the Jeff Blauser/Rafael Belliard pinch-hit HR case.

## 12. Implementation Prompt

Use this prompt for the next coding pass:

```text
Create branch codex/wpa-engine-v2.

Goal: rebuild the KBL WPA engine around standard win expectancy logic rather than patching event-specific signs.

Do not change Manager WPA scope, Almanac scope, or collapsed player leaderboard behavior. Manager WPA remains overlay-only and excluded from player KBL WPA totals.

Start by adding a versioned WPA v2 engine with canonical before/after state, explicit home/team deltas, scheduled-innings support for any integer game length from 1 through 9 innings, and wide score differential support. Use either a documented versioned WE lookup/model or a calibrated continuous model, but do not keep the current -5..+5 clamp or hidden hand-tuned empirical claim.

Then route player KBL WPA and Manager WPA decision windows through v2. Remove the temporary HR sign guard once v2 monotonicity tests pass. Keep legacy storage fields compatible but add `wpaModelVersion` where committed WPA values are stored.

Acceptance tests must include: HR down 9 to down 6 positive for batting team, walk-off/final-out terminal states, home/away symmetry, score-differential monotonicity through at least +/-15, scheduled innings 1 through 9, player credit budget conservation, Manager WPA overlay exclusion from player totals, and a fixture for the Rafael Belliard to Jeff Blauser pinch-hit HR case.

Do not implement new UI except any small label/detail changes required to expose the v2 values already being calculated.
```

## 13. Decision

This is a rebuild of the WE/WPA engine, not a small Manager WPA patch.

Keep:

- current event-ledger architecture
- current player attribution architecture
- current Manager WPA overlay architecture
- current Almanac committed-data-only architecture

Replace:

- synthetic `winExpectancyTable.ts` model
- early rounding assumptions
- narrow score-differential clamp
- event-specific sign guards
- official uses of simplified win probability estimators
