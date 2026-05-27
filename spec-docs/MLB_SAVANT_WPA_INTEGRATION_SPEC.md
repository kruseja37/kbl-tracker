# MLB Savant WPA Integration Spec

Date: 2026-05-19
Status: Proposed

## Goal

Replace the current KBL win expectancy approximation with a versioned, offline
lookup model that mirrors Baseball Savant Game Strategy Explorer behavior as
closely as possible.

The target public model is Baseball Savant's historical baseline:

- Inputs: inning, half inning, outs, base state, and score differential.
- Output: batting-team win probability and leverage index.
- Historical sample: MLB regular season, 2016-2025.
- Player/team identities are intentionally excluded.
- WPA is the difference between the before-state and after-state win
  probabilities.

## Feasibility Finding

This is feasible.

The Game Strategy Explorer page loads a built JavaScript bundle:

```text
https://builds.mlbstatic.com/baseballsavant.mlb.com/v1/sections/apps/builds/da10d50bfece5d0f41457658e580ba52d566fef0/scripts/build/game-strategy-explorer.js
```

The bundle calls a JSON endpoint on the same Baseball Savant host:

```text
GET /game-strategy-explorer?type=winexp&params=<encoded-json>
Accept: application/json
```

Observed request params:

```ts
interface SavantGameStrategyParams {
  inning: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  half: "Top" | "Bottom";
  outs: 0 | 1 | 2;
  balls: 0 | 1 | 2 | 3 | null;
  strikes: 0 | 1 | 2 | null;
  situation: null | "SB Attempt" | "IBB" | "SF Attempt" | "Sac Bunt";
  run_diff: -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5;
  runners: { "1b": boolean; "2b": boolean; "3b": boolean };
  perspective: "home" | "bat";
}
```

Observed `type=winexp` response shape:

```ts
interface SavantWinExpRow {
  season_id: number;
  inning: number;
  bottom_top: "Top" | "Bottom";
  top_inning_sw: "Y" | "N";
  bases_cd: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  bases: string;
  outs: 0 | 1 | 2;
  bat_wins_minus_5: number;
  bat_wins_minus_4: number;
  bat_wins_minus_3: number;
  bat_wins_minus_2: number;
  bat_wins_minus_1: number;
  bat_wins_0: number;
  bat_wins_1: number;
  bat_wins_2: number;
  bat_wins_3: number;
  bat_wins_4: number;
  bat_wins_5: number;
  leverage_index_minus_5: number;
  leverage_index_minus_4: number;
  leverage_index_minus_3: number;
  leverage_index_minus_2: number;
  leverage_index_minus_1: number;
  leverage_index_0: number;
  leverage_index_1: number;
  leverage_index_2: number;
  leverage_index_3: number;
  leverage_index_4: number;
  leverage_index_5: number;
}
```

The endpoint returns all eight base states for the requested
inning/half/outs, with score-differential columns from -5 through +5.

## Recommended Architecture

Do not call Baseball Savant live from the KBL app.

Use a build-time/vendor process:

1. Add a fetch script:

```text
scripts/fetchSavantWpaTable.mjs
```

2. Enumerate the Savant matrix:

```text
innings: 1..10
halves: Top, Bottom
outs: 0, 1, 2
base states returned by endpoint: 0..7
score differentials returned by endpoint: -5..+5
```

3. Write a committed static artifact:

```text
src/engines/data/mlbSavantWpa2016_2025.json
```

4. Include metadata in the artifact:

```ts
interface SavantWpaArtifact {
  modelVersion: "mlb-savant-wpa-2016-2025-v1";
  source: "Baseball Savant Game Strategy Explorer";
  sourceUrl: "https://baseballsavant.mlb.com/game-strategy-explorer";
  fetchedAt: string;
  regularSeasonYears: [2016, 2025];
  endpointTypes: ["winexp"];
  rows: SavantWinExpRow[];
}
```

5. Add a runtime lookup module:

```text
src/engines/mlbSavantWinExpectancy.ts
```

6. Replace the current `getHomeWinExpectancyV2` internals with a lookup-first
engine:

```ts
export const WPA_MODEL_VERSION = "mlb-savant-wpa-2016-2025-v1";
```

The existing `calculateWPA` and `calculateWpaV2` public APIs should remain
stable so the GameTracker, Almanac, POG, and Manager WPA call sites do not need
wide rewrites.

## KBL State Mapping

### Home vs Batting Team

Savant rows are batting-team probabilities.

KBL conversion:

```ts
const battingTeamIsHome = halfInning === "BOTTOM";
const battingScore = battingTeamIsHome ? homeScore : awayScore;
const fieldingScore = battingTeamIsHome ? awayScore : homeScore;
const battingRunDiff = clamp(battingScore - fieldingScore, -5, 5);
const battingWinProbability = lookupSavantBattingWinProbability(...);
const homeWinProbability = battingTeamIsHome
  ? battingWinProbability
  : 1 - battingWinProbability;
```

### Base State

Use the existing `encodeBaseState` mapping:

```text
0 empty
1 first
2 second
3 first+second
4 third
5 first+third
6 second+third
7 loaded
```

This matches Savant's `bases_cd` values.

### Scheduled Innings

Savant is a 9-inning MLB regular-season model, with `10` representing 10+
regular-season extras.

KBL mapping:

```ts
function mapKblInningToSavant(inning: number, scheduledInnings: number): number {
  if (inning > scheduledInnings) return 10;
  if (scheduledInnings === 9) return Math.min(inning, 9);
  if (scheduledInnings <= 1) return 9;
  return Math.round(1 + (inning - 1) * (8 / (scheduledInnings - 1)));
}
```

Examples:

```text
7-inning KBL: 1->1, 2->2, 3->4, 4->5, 5->6, 6->8, 7->9
5-inning KBL: 1->1, 2->3, 3->5, 4->7, 5->9
```

This preserves the real baseball idea that the scheduled final inning should
behave like MLB's 9th inning, not like the literal MLB 5th or 7th.

### Extra Innings

Savant says its 10th-inning data includes regular-season runner-on-second
context.

KBL mapping:

- If KBL extra-inning rules use a ghost runner, map extras to Savant inning 10.
- If KBL extra-inning rules do not use a ghost runner, map extras to Savant
  inning 9 with the actual base state.
- If the game is postseason-style, prefer inning 9 mapping unless KBL explicitly
  enables a ghost runner.

### Score Differentials Greater Than Five

Savant's public endpoint/table exposes score differentials from -5 through +5.

Policy for KBL v1:

- Use exact Savant values for `abs(diff) <= 5`.
- For `abs(diff) > 5`, use the current run-distribution v3 fallback, tagged in
  the trace as `fallback: "score-diff-out-of-savant-range"`.

Policy for v2:

- Recreate a full historical table from play-by-play data so leads larger than
  five also use empirical historical logic.

## After-State Rules

Keep the current WPA state transition layer:

- Walk-off home score in final inning/extras: home WP after = 1.
- Top final/extras third out with home ahead: home WP after = 1.
- Bottom final/extras third out with away ahead: home WP after = 0.
- Non-terminal third out: advance to the next half inning, clear bases, outs=0.
- Otherwise, lookup the actual after-state.

The Savant table provides state probabilities; KBL still owns the baseball
state transition.

## Validation Fixtures

Must-have fixtures:

1. Published Savant example:
   - Home team up 4, 7th inning, 2 outs, runner on third is approximately 97%
     home WP.
2. Final inning, four-run lead:
   - Top of final inning, home up 4, bases empty, no outs should already be
     very close to certain and should not hand the closing pitcher a large WPA
     bonus for routine outs.
3. High-leverage save:
   - Top of final inning, home up 1, bases loaded, one out should remain high
     leverage.
4. Walk-off:
   - Bottom final tie game, scoring play sets home WP after to 1.
5. Game-ending road win:
   - Bottom final, home trailing, third out sets home WP after to 0.
6. Directional symmetry:
   - Away batting WPA is positive when home WP decreases.
   - Home batting WPA is positive when home WP increases.
7. Short KBL game mapping:
   - 5th of 5 and 7th of 7 map to Savant 9th.
8. Score diff fallback:
   - `abs(diff) > 5` is explicit in trace and does not silently clamp.

## Implementation Steps

1. Add `scripts/fetchSavantWpaTable.mjs`.
2. Fetch and commit `src/engines/data/mlbSavantWpa2016_2025.json`.
3. Add `src/engines/mlbSavantWinExpectancy.ts`:
   - normalize KBL state
   - map inning
   - encode base state
   - lookup batting WP and LI
   - convert to home WP
   - return trace metadata
4. Update `src/engines/winExpectancyModelV2.ts` to delegate to the Savant
   lookup first, with v3 fallback for unsupported score differentials.
5. Update `WPA_MODEL_VERSION`.
6. Keep current attribution logic unchanged initially.
7. Add audit output to Game Detail:
   - model version
   - Savant row key
   - before/after batting WP
   - fallback reason, if any
8. Add tests for all validation fixtures.
9. Re-run:

```text
npm test -- --run src/engines/__tests__/wpaV2.test.ts src/engines/__tests__/wpaCalculator.test.ts src/utils/tests/kblWpaAttribution.test.ts src/utils/tests/pogAwards.test.ts src/utils/tests/teamImpact.test.ts src/utils/tests/managerWpaDerivation.test.ts
npm run build
```

## Risk Register

- Baseball Savant endpoint may not be contractual or stable.
- MLBAM terms may not allow live dependence; static internal development
  references should be reviewed before broad distribution.
- Public table exposes -5..+5 score differentials only.
- 10th-inning ghost-runner context may not match every KBL extra-inning rule.
- Count-aware WP exists in the Explorer, but KBL currently logs WPA at
  plate-appearance outcome level rather than per pitch count.

## Decision

Proceed with a vendored Savant table for exact supported states, plus explicit
v3 fallback for unsupported score differentials. Do not ship live Savant API
calls inside the app.

