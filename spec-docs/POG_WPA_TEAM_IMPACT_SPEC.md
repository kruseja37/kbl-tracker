# POG, WPA, and Team Impact Spec

Status: product direction approved; ready for implementation planning
Date: 2026-05-18
Scope: Exhibition Mode, Elimination Mode, Team Hub, Almanac, Game Detail, Post-game summary
Depends on: KBL WPA attribution, Manager WPA, completed game archive, event log, players-of-the-game storage

## 1. Why This Exists

KBL already tracks richer game impact than normal box-score stats. GameTracker records event WPA, KBL role-attributed player WPA, Manager WPA, Fame, fielding events, baserunning events, and stored Players of the Game. Team Hub and Almanac should use those facts to answer more meaningful questions:

- Who actually changed the game?
- How did this team create or lose win probability?
- Which players carried the team across a run?
- Was this team's identity hitting, pitching, defense, baserunning, or management?
- How does a team's impact compare with the rest of the bracket or exhibition league?

This spec defines a shared model for POG awards, WPA role buckets, team-level rollups, benchmarks, and mode-specific implementation.

## 2. Product Principles

1. Do not invent fake impact data. If WPA, role credits, POGs, or event detail are unavailable, display a clear partial-data state.
2. Overall POG is a cross-role player award. It measures total KBL player WPA across all player roles.
3. Secondary POGs are role awards. They measure individual role buckets after excluding the Overall POG.
4. Manager impact is separate from player KBL WPA. Manager awards and points use Manager WPA / Manager Value only.
5. POG points are additive and explainable.
6. Benchmarks must make the number meaningful: rank, bracket/league average, per-game rate, and simple identity labels.
7. The same derived aggregation should power Team Hub and Almanac so active and archived views agree.

## 3. Award Model

### 3.1 Award Types

| Award | Scope | Metric | Points |
| --- | --- | --- | --- |
| Overall POG | Team-agnostic, whole game | Highest total player KBL WPA | 3 |
| Best Hitter | Team-agnostic, role bucket | Highest positive batting WPA | 1 |
| Best Pitcher | Team-agnostic, role bucket | Highest positive pitching WPA | 1 |
| Best Baserunner | Team-agnostic, role bucket | Highest positive baserunning WPA | 1 |
| Best Fielder | Team-agnostic, role bucket | Highest positive fielding WPA plus catching WPA | 1 |
| Best Manager | Team-agnostic, manager bucket | Highest positive Manager Value | 1 |
| Team Standout | Per team, whole game | Highest total player KBL WPA on that team | Display badge; no default POG points in v1 |

Team Standout exists to recognize strong losing-team performances without making a routine losing-team line equivalent to the game's top impact player. If product later wants points for Team Standout, keep them as a separate counter from POG points.

### 3.2 Overall POG

Overall POG is computed from total player KBL WPA:

```text
totalPlayerWpa =
  battingWpa +
  pitchingWpa +
  fieldingWpa +
  baserunningWpa +
  catchingWpa
```

The highest eligible total player WPA wins Overall POG and earns 3 POG points. Any player can win from any mix of roles. A pitcher who hits, fields, or runs can accumulate cross-role value. A position player who combines a key hit and defensive play can beat a pure hitter.

Eligibility:

- Require meaningful positive total KBL WPA.
- If no player has meaningful positive total KBL WPA, do not force an Overall POG from WPA.
- If KBL WPA is unavailable, use the existing transparent fallback logic, but label the game as fallback-scored in diagnostics.

### 3.3 Secondary POGs

After the Overall POG is selected, exclude that player from all secondary player awards.

Role selection:

```text
Best Hitter     = max positive battingWpa
Best Pitcher    = max positive pitchingWpa
Best Baserunner = max positive baserunningWpa
Best Fielder    = max positive (fieldingWpa + catchingWpa)
```

Important rule:

- If a category has no meaningful positive value, skip the award.
- Do not give a "Best Baserunner" or "Best Fielder" award for zero or negative role impact.
- Do not backfill awards from box-score vibes if role WPA exists but has no positive contributor.

### 3.4 Best Manager

Best Manager is scored separately from player KBL WPA.

Suggested metric:

```text
managerValue =
  tacticalManagerWpa +
  deploymentWpa +
  lineupDeltaWpa
```

Eligibility:

- Require meaningful positive Manager Value.
- If Manager WPA records are unavailable for the game, do not award Best Manager.
- If both managers are zero or negative, skip Best Manager.

### 3.5 Team Standouts

For each team:

```text
teamStandout = player on team with highest totalPlayerWpa
```

Display Team Standouts on post-game and team pages as recognition, especially for losing-team excellence. Do not duplicate points when the Overall POG is also a Team Standout. In v1, Team Standout is a badge/display concept rather than a POG-point source.

## 4. POG Points and Rollups

### 4.1 Player POG Points

Default point values:

```text
Overall POG   = 3 points
Role POG      = 1 point each
Team Standout = 0 POG points in v1
```

Legacy stored `playersOfTheGame.first/second/third` records are compatibility data, not the new award model. When a game has only stored POG ids and no usable KBL WPA:

- `first` maps to one legacy Overall POG worth 3 points.
- `second` and `third` may be displayed as legacy star/top-performer context, but they do not create role POGs or new POG points in v1.
- Do not infer Best Hitter, Best Pitcher, Best Baserunner, Best Fielder, or Best Manager from stored legacy POG order.

Roll up by:

- player
- team
- mode
- instance/run/league
- award type
- role bucket
- game

Player display should show both points and counts:

```text
Dana Dunn
8 POG points
2 Overall POG, 1 Best Hitter, 1 Best Fielder
```

### 4.2 Team POG Rollups

Team Hub should show:

- team POG points
- team rank in run/league
- overall POG wins
- role POG counts by type, including Best Manager
- most decorated player
- manager POG count / Best Manager wins
- role identity from POG distribution

Example:

```text
POG Points: 14
2nd of 8 teams
Most Decorated: Dana Dunn, 8 pts
Identity: Pitching and defense carried the run
```

### 4.3 League / Almanac Leaders

Almanac should expose:

- POG points leaders
- Overall POG leaders
- Best Hitter leaders
- Best Pitcher leaders
- Best Fielder leaders
- Best Baserunner leaders
- Best Manager leaders
- Team POG points leaders

For Elimination, leaders can be scoped by run or all elimination history. For Exhibition, leaders can be scoped by exhibition league instance or all exhibition games.

## 5. Team WPA Profile

### 5.1 Player WPA Buckets

For each team, aggregate player KBL WPA from completed games:

| Bucket | Source |
| --- | --- |
| Total Player WPA | Sum of all player role buckets |
| Batting WPA | `battingWpa` |
| Pitching WPA | `pitchingWpa` |
| Fielding WPA | `fieldingWpa` |
| Baserunning WPA | `baserunningWpa` |
| Catching WPA | `catchingWpa` |

Manager WPA must be displayed separately:

| Bucket | Source |
| --- | --- |
| Tactical Manager WPA | committed `managerDecisions` |
| Deployment WPA | committed `managerDeploymentStints` |
| Lineup Delta WPA | committed `managerLineupDeltas` |
| Manager Value | tactical + deployment + lineup |

### 5.2 Team-Level Displays

Team Hub should display these as understandable impact cards:

```text
Team WPA: +0.184
2nd of 8 teams | Bracket avg +0.000 | +0.046 per game
```

Role cards:

```text
Pitching WPA +0.312
Best in bracket | 64% of team value
```

Do not show a raw WPA number without context.

### 5.3 Benchmarks

Each impact metric should include some combination of:

- rank within bracket or exhibition league
- bracket/league average
- per-game average
- percentage share of team positive value
- top contributor
- simple identity label

Suggested benchmark labels:

| Condition | Label |
| --- | --- |
| Team total WPA is top 25% | "Impact leader" |
| Pitching bucket is largest positive bucket and above average | "Pitching carried them" |
| Batting bucket is largest positive bucket and above average | "Lineup carried them" |
| Fielding bucket is largest positive bucket and above average | "Glove-first run" |
| Baserunning bucket is meaningfully positive and above average | "Pressure on the bases" |
| Any bucket is meaningfully negative | "Costly [role] swings" |
| Buckets are balanced and positive | "Balanced impact" |
| Not enough WPA detail | "Impact detail unavailable" |

Use plain language and avoid implying certainty when the sample is tiny.

### 5.4 Player WPA Leaders

For the selected team:

- total player WPA
- role split
- biggest positive play
- biggest negative play
- high-leverage WPA
- per-game WPA

Example row:

```text
Dana Dunn   +0.482 WPA   BAT +0.301 | FLD +0.126 | BSR +0.055
3 POG points | Biggest swing +0.214
```

Play context must be source-derived and optional:

- Biggest positive/negative play should come from real event ids and WPA credits, not from award totals.
- High-leverage WPA should sum a player's available WPA credits on events with known high leverage, such as `leverageIndex >= 1.5` or `isClutch`.
- If event detail, leverage index, or credit-to-event mapping is unavailable, leave those fields absent and surface data-quality context instead of inventing play detail.

## 6. Data Availability Rules

### 6.1 Full Data

Full Team Impact data requires:

- completed game records
- event log AtBatEvents / BetweenPlayEvents
- KBL WPA credits derivable from event log
- manager decision records for Best Manager / Manager Value
- stored or derivable POG award records

### 6.2 Partial Data

Archived/restored games may not have complete event logs or may predate KBL WPA attribution. UI must distinguish:

| Available Data | Display |
| --- | --- |
| Full KBL WPA credits | Full Team Impact and POG role model |
| AtBat WPA only | Limited WPA with "legacy batting WPA" label |
| Manager Value only | Best Manager only; no player POG or role awards |
| Stored `playersOfTheGame` only | POG totals only, no role awards |
| Box score only | No WPA/POG impact awards; show normal box stats |
| No completed games | Empty state |

Never generate role POGs from fake role WPA. If fallback scoring is used for Overall POG, it should be clear in diagnostics and should not create secondary role POGs unless the role data is real.

Low-confidence archived at-bat fallback credits, including credits whose basis is "Archived batting WPA fallback", must be classified as `legacy_at_bat_wpa`. They are eligible only for limited Overall POG fallback and team batting-WPA context labeled as legacy. They are never enough to create secondary role awards.

### 6.3 Meaningful Positive Threshold

Use a small threshold to avoid awarding noise:

```text
MIN_POSITIVE_WPA = 0.005
```

Values less than or equal to the threshold should be treated as no meaningful positive contribution for award eligibility.

## 7. Mode Scope

### 7.1 Elimination Mode

Primary views:

- Elimination Team Hub: active run Team Impact panel
- Elimination Leaders: POG points and WPA leaders
- Elimination History / Almanac: archived run Team Impact and POG rollups
- Game Detail: per-game source-of-truth detail

Grouping:

```text
mode = "elimination"
instanceId = eliminationId
```

Benchmarks:

- compare teams within the bracket
- show bracket average and rank
- show per-game values because teams play different numbers of games

### 7.2 Exhibition Mode

Primary views:

- Exhibition Team Page / Team Hub equivalent
- Exhibition Almanac league instance pages
- Game Browser rows and Game Detail

Grouping:

```text
mode = "exhibition"
instanceId = exhibition leagueId
```

Benchmarks:

- compare teams within the exhibition league instance
- show league average and rank
- all-time exhibition rollups can exist later, but v1 should prioritize league-scoped views

### 7.3 Shared Rules

Both modes use the same:

- award selection rules
- point values
- role buckets
- fallback states
- derived aggregation helper shape

Do not fork product logic by mode unless data availability requires it.

Every exported Team Impact aggregation helper must enforce mode/instance scoping itself, even when a direct caller passes a mixed list of completed games. Callers should not be trusted to pre-filter correctly.

## 8. Proposed Derived APIs

Start with derived helpers, not a schema migration.

### 8.1 POG Awards

```typescript
interface PogAwardSet {
  gameId: string;
  mode: "exhibition" | "elimination" | "franchise";
  instanceId: string;
  overall?: PogAward;
  roleAwards: PogAward[];
  managerAward?: PogAward;
  teamStandouts: PogAward[];
  dataQuality: PogDataQuality;
}

interface PogAward {
  awardType:
    | "overall"
    | "best_hitter"
    | "best_pitcher"
    | "best_baserunner"
    | "best_fielder"
    | "best_manager"
    | "team_standout";
  points: number;
  playerId?: string;
  playerName?: string;
  managerId?: string;
  managerName?: string;
  teamId: string;
  value: number;
  valueLabel: string;
  explanation: string;
}

interface PogDataQuality {
  source:
    | "kbl_wpa"
    | "legacy_at_bat_wpa"
    | "stored_pog"
    | "manager_value"
    | "box_score_fallback"
    | "unavailable";
  warnings: string[];
}
```

### 8.2 Team Impact

```typescript
interface TeamImpactSummary {
  mode: "exhibition" | "elimination";
  instanceId: string;
  teamId: string;
  teamName: string;
  games: number;
  playerWpa: RoleWpaBreakdown;
  managerWpa: ManagerWpaBreakdown;
  pog: TeamPogSummary;
  benchmarks: TeamImpactBenchmarks;
  playerLeaders: PlayerImpactSummary[];
  dataQuality: TeamImpactDataQuality;
}

interface RoleWpaBreakdown {
  total: number;
  batting: number;
  pitching: number;
  fielding: number;
  baserunning: number;
  catching: number;
}

interface TeamPogSummary {
  points: number;
  overallWins: number;
  bestHitter: number;
  bestPitcher: number;
  bestBaserunner: number;
  bestFielder: number;
  bestManager: number;
  mostDecoratedPlayer?: {
    playerId: string;
    playerName: string;
    points: number;
  };
  bestManagerWins?: number;
}

interface PlayerImpactPlayContext {
  gameId: string;
  eventId: string;
  value: number;
  label: string;
  inningLabel?: string;
  leverageIndex?: number;
}

interface PlayerImpactSummary {
  playerId: string;
  playerName: string;
  teamId: string;
  games: number;
  wpa: RoleWpaBreakdown;
  pogPoints: number;
  perGameWpa: number;
  awards: TeamImpactAwardCounts;
  biggestPositivePlay?: PlayerImpactPlayContext;
  biggestNegativePlay?: PlayerImpactPlayContext;
  highLeverageWpa?: number;
}
```

Suggested helper names:

```typescript
getGamePogAwardSet(gameId)
getInstanceTeamImpactSummaries(mode, instanceId)
getTeamImpactSummary(mode, instanceId, teamId)
getPogLeaderboards(mode, instanceId)
```

### 8.3 Current Code Entry Points

Use these existing seams before adding new storage:

| Concern | Current file / seam | Implementation note |
| --- | --- | --- |
| POG ranking and stored first/second/third compatibility | `src/utils/playersOfTheGame.ts` | Add the richer award-set derivation here or beside it, then keep `rankPlayersOfTheGame` / `buildStoredPlayersOfTheGame` backward compatible. |
| KBL role WPA | `src/utils/kblWpaAttribution.ts` | Reuse `deriveKblWpaCredits` and `aggregateKblWpaCredits`; do not create a second attribution model. |
| Completed game archive fields | `src/utils/gameStorage.ts` | Read existing completed-game records, event logs, stored POG ids, and manager records. Avoid a schema migration in v1. |
| Game-end persistence | `src/src_figma/hooks/useGameState.ts` | Continue storing legacy `playersOfTheGame` ids for compatibility; add richer derived awards only if/when persistence becomes necessary. |
| Post-game POG display | `src/src_figma/app/pages/PostGameSummary.tsx` | First consumer for the richer award labels and explanations. |
| Archived game display | `src/src_figma/app/pages/GameDetail.tsx` | Should agree with post-game output and expose data-quality/fallback context. |
| Elimination Team Hub | `src/src_figma/app/components/EliminationTeamHub.tsx` | First elimination UI surface for Team Impact and POG points. |
| Elimination shell | `src/src_figma/app/pages/EliminationHome.tsx` | Supplies run id, teams, and setup state to the hub. |
| Exhibition/elimination Almanac queries | `src/utils/almanacQueries.ts` | Existing instance scoping and Manager Almanac aggregation should be reused for Team Impact and POG leaderboards. |
| Exhibition team Almanac page | `src/src_figma/app/pages/TeamPage.tsx` | Reflect the shared Team Impact model for exhibition instances and archived elimination teams. |
| Manager value display/trace | `src/utils/managerValueTrace.ts`, `src/src_figma/app/components/ManagerWpaOverlay.tsx` | Reuse existing committed manager records; Manager Value remains separate from player WPA. |

## 9. Implementation Plan

### Recommended First Slice

Implement in this order:

1. Add a canonical `getGamePogAwardSet` helper in `src/utils/playersOfTheGame.ts` or a sibling `src/utils/pogAwards.ts`.
2. Add focused unit tests around Overall POG, secondary awards, manager awards, missing data, and legacy fallback.
3. Add shared Team Impact aggregation helpers under `src/utils/`, reusing `getInstanceGames`, KBL WPA attribution, and existing Manager Almanac value logic.
4. Wire Elimination Team Hub first, because active brackets need the most immediate context and have the clearest run id.
5. Wire Almanac/exhibition surfaces second using the same aggregation output, not a new exhibition-only model.
6. Only consider persisted award snapshots after the derived model is stable and expensive enough to justify caching.

### Phase 1 - Canonical POG derivation

Goal: one authoritative derived function for per-game awards.

Tasks:

1. Refactor `rankPlayersOfTheGame` or add a sibling helper that consumes KBL WPA role totals.
2. Select Overall POG from total player KBL WPA.
3. Select secondary role awards after excluding Overall POG.
4. Select Best Manager from committed Manager Value.
5. Return data-quality warnings for missing event log, missing KBL credits, or fallback scoring.
6. Keep existing stored `playersOfTheGame` fields backward compatible.
7. Update PostGameSummary and GameDetail to use the richer award set while preserving existing display.

Targeted tests:

- pitcher can beat hitter for Overall POG by total WPA
- two-way player can win via mixed role WPA
- Overall POG cannot win secondary role POG
- secondary role award skips when no positive value
- Best Manager skips without positive Manager Value
- legacy/stored POG fallback does not create fake role awards

### Phase 2 - Team Impact aggregation helpers

Goal: shared aggregation for Team Hub and Almanac.

Tasks:

1. Add helpers under `src/utils/` that aggregate completed games by mode/instance/team.
2. Derive player role WPA totals from KBL WPA credits.
3. Derive Manager Value totals from committed manager records.
4. Roll up POG points and role-award counts from Phase 1 award sets.
5. Compute benchmarks across all teams in the instance.
6. Compute per-game rates and rank labels.
7. Add partial-data state handling.

Targeted tests:

- elimination run aggregates only its own games
- exhibition league aggregates only that league's games
- archived/restored games with stored POG but missing event log produce partial POG totals
- bracket averages and ranks are stable
- manager value stays separate from player WPA

### Phase 3 - Elimination Team Hub UI

Goal: make the active elimination Team Hub show team impact.

Tasks:

1. Add a Team Impact panel to `EliminationTeamHub`.
2. Show Team WPA Profile with role buckets and context.
3. Show POG Points panel.
4. Show selected-team player WPA leaders.
5. Add clear empty/partial states.
6. Link game-level rows to Game Detail where practical.

Verification:

- targeted Vitest for aggregation helpers
- Team Hub component test for full/empty/partial states
- Playwright elimination journey covering stats/impact display

### Phase 4 - Exhibition Almanac / team pages

Goal: reflect the same model for exhibition league instances.

Tasks:

1. Add Team Impact panel to the existing exhibition team page or Almanac team view.
2. Add POG leaderboards for exhibition league instances.
3. Add Game Browser row support for richer POG labels if needed.
4. Reuse the same helper and benchmarks from Phase 2.

Verification:

- exhibition aggregation helper tests
- Almanac/team page component tests
- exhibition game flow regression if UI route is affected

### Phase 5 - Optional persistence optimization

Goal: speed and stability if derived aggregation becomes expensive.

Only after the derived model is accepted:

1. Add cached award sets or team impact snapshots.
2. Version cache records with source data quality and WPA model version.
3. Preserve rebuild path from source-of-truth completed games and event logs.
4. Include backup/restore compatibility tests.

Do not start with this phase. The first implementation should derive from existing source data.

## 10. Acceptance Criteria

1. Overall POG is total player KBL WPA across roles.
2. Secondary POGs are role-specific and exclude the Overall POG.
3. Secondary POGs are skipped when no meaningful positive role value exists.
4. Best Manager is separate from player WPA and uses Manager Value.
5. Team Hub shows understandable team WPA context, not raw numbers alone.
6. Team Hub shows POG points and most decorated players.
7. Almanac reflects the same POG/WPA rollups for elimination and exhibition scopes.
8. Empty, in-progress, completed, restored, archived, and legacy partial-data runs render honestly.
9. No fake data or schema migration is required for v1.
10. Existing GameTracker, PostGameSummary, Game Detail, backup/restore, and elimination/exhibition journeys remain green.
