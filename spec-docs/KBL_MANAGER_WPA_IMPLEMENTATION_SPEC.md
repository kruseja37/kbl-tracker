# KBL Manager WPA Implementation Spec

**Date:** 2026-05-11  
**Status:** Approved product direction; ready for implementation  
**Supersedes:** `MANAGER_MOMENTS_TRACKING_SPEC.md` for new work, and replaces legacy mWAR as the primary manager-value system  
**Depends on:** KBL WPA attribution engine, GameTracker event ledger, manager/team identity plumbing

---

## 1. Product Decision

Manager WPA is a separate manager-evaluation system, not an extension of collapsed player KBL WPA.

The player KBL WPA system answers: "Which players created or lost win probability on the field?"

Manager WPA answers: "Which tactical, lineup, and personnel decisions created or lost win probability from the manager's team perspective?"

Because those are different questions, Manager WPA must be stored, displayed, and aggregated separately from player KBL WPA. Manager WPA may duplicate the same underlying game swing as a player play, but it must not change the player's attribution budget.

### Non-Negotiables

1. Manager WPA is overlay-only in v1.
2. Manager WPA is excluded from collapsed KBL WPA leaderboards, player totals, awards, and player Almanac totals.
3. Manager WPA never steals, normalizes, or reallocates player WPA in v1.
4. Inherited runners may be used as tactical context for manager pitching-change evaluation, but inherited-runner WPA must not become collapsed player KBL WPA.
5. Both managers in every game are tracked symmetrically. No home-manager-only behavior remains.
6. Legacy mWAR fixed-value scoring is deprecated. If a WAR-like manager number is needed later, derive it from this new Manager WPA ledger rather than maintaining a second manager engine.

### Two-Layer Architecture

Manager WPA is split into two layers.

| Layer | Responsibility | User Experience |
| --- | --- | --- |
| Truth layer | Derive manager decisions and Manager WPA from the committed event log, play-log enrichment, manager assignments, game state snapshots, and decision windows. | Runs quietly. Recomputes when committed scoring/enrichment data changes. |
| Experience layer | Surface Manager Moments, feed notes, recommendation cards, edit chips, and rationale text. | Helps the user notice or act on decisions without becoming the source of truth. |

The truth layer is authoritative. The experience layer may create or edit source events/enrichment, but it does not own Manager WPA. If the feed, a recommendation card, or an edit chip changes a manager-relevant field, the truth layer recomputes from the updated event ledger.

---

## 2. Terms

### Player KBL WPA

Budget-conserved player attribution derived from at-bat events, fielding events, runner events, and between-play events.

### Manager WPA

A separate overlay ledger of manager decisions, scored from the acting manager team's perspective over a defined decision window.

### Tactical Manager WPA

Manager WPA from in-game tactical decisions: pitching change, intentional walk, pinch hitter, pinch runner, defensive substitution, leave pitcher in, bunt/squeeze call, and similar events.

### Deployment WPA

Manager WPA from persistent personnel deployment choices after a player enters, changes role, changes defensive position, or is explicitly kept in the game. Deployment WPA remains open while the deployment remains active and captures later player outcomes linked to that role.

Deployment WPA answers a different question from Tactical Manager WPA:

```text
Tactical Manager WPA: Was the immediate move/result good?
Deployment WPA: Did the manager's ongoing use of this player/role help or hurt later?
```

### Lineup Delta

Lineup construction value for deviations from the relevant Optimal Lineup snapshot. It measures the opportunity cost and realized result of the manager's chosen starting lineup compared with the best available roster configuration for that game context.

Lineup Delta is not a blanket score for all starters. If the manager uses the Optimal Lineup, Lineup Delta should be neutral even if players underperform. The manager is judged on meaningful lineup deviations, not normal player variance from obvious starts.

### Manager Value

Display aggregate:

```text
Manager Value = Tactical Manager WPA + Deployment WPA + Lineup Delta
```

This is not player WAR. It can become the source for a future mWAR-like display scale, but the source of truth is the Manager WPA ledger.

---

## 3. Data Model

### 3.1 Manager Identity

Managers are first-class Almanac entities, not synthetic team buckets.

```typescript
interface ManagerProfile {
  managerId: string;
  displayName: string;
  gender?: string;
  age?: number;
  hometown?: string;
  createdByUser: boolean;
  defaultManager: boolean;
  managementStyle?: ManagerStyleSnapshot;
}

interface ManagerAssignment {
  managerId: string;
  teamId: string;
  mode: "exhibition" | "elimination" | "franchise";
  instanceId: string;
  startDate?: string;
  endDate?: string;
  fired?: boolean;
}
```

Selection rules:

| Mode | Manager Selection |
| --- | --- |
| Exhibition | User chooses each team's manager in the pre-game menu. If omitted, create or use that team's default manager. Exhibition manager decisions are always tracked when the game has enough data to make the decision meaningful. |
| Elimination | User chooses managers at run setup or from team hub before first game. Assignment lasts for that run unless edited. |
| Franchise | Managers are chosen during league setup. Managers can be fired/reassigned from team hub during the season. |

Create-a-Manager in League Builder must allow name, gender, age, hometown, and optional initial style label. Default generated managers may use male presentation by default, but user-created managers must not be limited to that.

Generated manager names should use the same name database and pronunciation-safe naming rules used for generated players whenever possible. The League Builder Create-a-Manager flow must let the user regenerate the full name, regenerate first/last names separately if the UI supports it, and manually edit the final name.

Management style is neutral on creation. Over time it is derived from decision history, such as steal frequency, bunt usage, bullpen aggressiveness, pinch-hit rate, intentional walk rate, and defensive-sub frequency.

### 3.2 Manager Decision Record

```typescript
type ManagerDecisionType =
  | "lineup_construction"
  | "pitching_change"
  | "leave_pitcher_in"
  | "pinch_hitter"
  | "let_batter_hit"
  | "pinch_runner"
  | "defensive_sub"
  | "position_change"
  | "intentional_walk"
  | "steal_send"
  | "runner_hold"
  | "out_advancing_send"
  | "bunt_call"
  | "squeeze_call"
  | "hit_and_run"
  | "defensive_alignment"
  | "manual_note";

type ManagerInferenceMethod =
  | "automatic"
  | "prompted"
  | "manual"
  | "passive";

type ManagerDecisionSource =
  | "event_semantics"
  | "play_log_enhancement"
  | "user_action"
  | "situational_prompt"
  | "manual_edit";

interface ManagerDecisionRecord {
  decisionId: string;
  gameId: string;
  managerId: string;
  teamId: string;
  opponentTeamId: string;
  decisionType: ManagerDecisionType;
  inferenceMethod: ManagerInferenceMethod;
  decisionSource: ManagerDecisionSource;
  confidence: "high" | "medium" | "low";

  inning: number;
  half: "top" | "bottom";
  outs: number;
  baseState: string;
  scoreDifferentialForTeam: number;
  leverageIndex?: number;

  decisionEventId?: string;
  linkedEventIds: string[];
  involvedPlayerIds: string[];

  teamWinProbabilityBefore: number;
  teamWinProbabilityAfter?: number;
  managerWpa?: number;
  rawWindowWpa?: number;
  managerShare?: number;

  resolved: boolean;
  resolvedAtEventId?: string;
  displayTitle: string;
  displaySummary: string;
}
```

### 3.3 Optimal Lineup And Lineup Delta Records

```typescript
type OpposingPitcherHand = "R" | "L";

type OptimalLineupModeContext =
  | "exhibition"
  | "elimination"
  | "franchise";

type OptimalLineupSourceConfidence =
  | "engine_calculated"
  | "user_registered"
  | "user_confirmed_engine"
  | "stale_roster"
  | "fallback";

interface OptimalLineupSlot {
  playerId: string;
  playerName: string;
  battingOrderSlot: number;
  defensivePosition: string;
  projectedSlotKblWpa: number;
  projectedValueScore: number;
  positionalFitScore: number;
  confidence: "high" | "medium" | "low";
}

interface OptimalLineupSnapshot {
  snapshotId: string;
  teamId: string;
  mode: OptimalLineupModeContext;
  instanceId?: string;
  opposingPitcherHand: OpposingPitcherHand;
  rosterVersionId?: string;
  algorithmVersion: string;
  generatedAt: number;
  generatedFrom:
    | "league_builder"
    | "team_hub"
    | "pregame_recalculate"
    | "user_registered_smb4_optimal"
    | "game_lock";
  sourceConfidence: OptimalLineupSourceConfidence;
  dhEnabled?: boolean;

  slots: OptimalLineupSlot[];
  projectedTeamLineupKblWpa: number;
  confidence: "high" | "medium" | "low";
}

interface ManagerLineupDeltaRecord {
  decisionId: string;
  gameId: string;
  managerId: string;
  teamId: string;
  decisionType: "lineup_construction";
  inferenceMethod: "automatic";

  optimalSnapshotId: string;
  opposingPitcherHand: OpposingPitcherHand;
  algorithmVersion: string;

  chosenPlayerId: string;
  chosenPlayerName?: string;
  chosenBattingOrderSlot: number;
  chosenDefensivePosition: string;

  optimalPlayerId: string;
  optimalPlayerName?: string;
  optimalBattingOrderSlot: number;
  optimalDefensivePosition: string;

  chosenProjectedKblWpa: number;
  optimalProjectedKblWpa: number;
  projectedOpportunityCost: number;

  actualChosenKblWpa: number;
  realizedVsChosenProjection: number;
  actualVsOptimalProjection: number;

  managerShare: number;
  managerWpa: number;
  capApplied?: number;
  confidence: "high" | "medium" | "low";
  wpaModelVersion?: string;
}
```

#### Optimal Lineup Lifecycle

1. League Builder stores a default Optimal Lineup vs RHP and vs LHP for each team.
2. Exhibition pregame loads the relevant Optimal Lineup automatically based on the opposing starting pitcher's throwing hand.
3. Elimination and Franchise Team Hub expose the same Optimal Lineup calculator, but include current context such as mojo, fitness, availability, and recent performance.
4. Pregame surfaces should allow `Apply Optimal`, `Compare Current`, `Recalculate`, and `Set Current as Optimal`.
5. If the opposing starting pitcher changes handedness, pregame must offer to switch to the matching vs RHP/vs LHP Optimal Lineup, recalculate, or keep the current benchmark.
6. Roster changes should invalidate or mark stale the stored Optimal Lineup snapshots until recalculated.
7. At game lock, store the Optimal Lineup snapshot used for comparison and the manager's chosen lineup snapshot.
8. If GameTracker must generate a game-lock fallback Optimal Lineup snapshot for display/compare continuity, tag it as display-only. Game-lock fallback snapshots cannot become official Lineup Delta benchmarks.

#### Pregame Optimal Lineup Controls

Pregame should include an Optimal Lineup control cluster:

```text
Optimal Lineup: vs RHP / vs LHP
[Apply Optimal] [Compare Current] [Recalculate] [Set Current as Optimal]
```

If the opposing starter changes from right-handed to left-handed or left-handed to right-handed, show a non-blocking prompt:

```text
Opposing starter changed to LHP. Switch to vs LHP optimal?
[Switch Optimal] [Recalculate] [Keep Current]
```

Control behavior:

| Control | Behavior |
| --- | --- |
| Apply Optimal | Replaces the current starting lineup with the active Optimal Lineup snapshot. |
| Compare Current | Shows projected gaps between the current lineup and active Optimal Lineup without changing the lineup. |
| Recalculate | Runs the KBL optimal-lineup engine for the active roster, game rules, opposing pitcher hand, and mode context. |
| Set Current as Optimal | Registers the current lineup/order/positions as the benchmark Optimal Lineup for the active hand and game rules. |

`Set Current as Optimal` exists because SMB4 itself can generate optimized lineups, including pregame-only RHP/LHP optimization and DH/non-DH context. The user may allow SMB4 to optimize, enter that lineup in KBL Tracker, and register it as the official benchmark before making their own lineup changes.

Rules:

1. `Set Current as Optimal` is available only before lineup lock.
2. After lineup lock, the Optimal Lineup snapshot is read-only for that game.
3. User-registered SMB4 optimal snapshots must be tagged `generatedFrom: "user_registered_smb4_optimal"` and `sourceConfidence: "user_registered"`.
4. User-confirmed engine snapshots from explicit League Builder, Team Hub, or pregame recalculation/apply actions must be tagged `sourceConfidence: "user_confirmed_engine"`.
5. Official Lineup Delta benchmarks must be non-stale `user_registered` or `user_confirmed_engine` snapshots for the current roster, opposing pitcher hand, and DH/non-DH rules.
6. Missing snapshots, stale snapshots, fallback snapshots, and snapshots generated from `game_lock` are display-only. They may support compare/preview UI, but they cannot produce official `ManagerLineupDeltaRecord` entries.
7. If roster/availability/game-rule context changes, mark the snapshot stale and require switch, recalculate, or re-register.

#### Optimal Lineup Generator

The generator considers all available roster position players, not only bench players.

This matters because a bench player can displace a starter, and the displaced starter may become the best option at another position. The problem is full lineup construction, not isolated bench replacement.

Required v1 behavior:

1. Produce a legal lineup and defensive assignment for the game's rules.
2. Generate separate optimal snapshots vs RHP and vs LHP.
3. Exclude starting-pitcher choice from Lineup Delta in v1. Pitcher usage belongs to Tactical Manager WPA and Deployment WPA until a separate pitching-plan model exists.
4. Use positional fit as a hard/primary constraint.
5. Use projected value as the second-order ranking:
   - Exhibition: ratings, handedness/platoon, and position-specific ratings.
   - Elimination/Franchise: ratings plus mojo, fitness, availability, and recent performance when available.
6. Prefer better defensive fit at premium positions (`C`, `SS`, `CF`, `2B`) when projected values are close.
7. Use a deterministic `algorithmVersion` so old lineup comparisons are reproducible.

Exact assignment or search is preferred because SMB rosters are small. If a simpler v1 implementation is needed, use deterministic greedy assignment, but apply it to the whole available roster rather than only bench players.

Traits should influence optimal lineup construction, but they must be introduced carefully. Do not guess at trait value in a way that creates unfair manager penalties.

Trait modeling phases:

1. v1 engine-calculated snapshots: ratings, handedness/platoon, position fit, batting-order archetypes, and basic defensive priority.
2. v1 user-registered snapshots: allow SMB4's own optimizer to stand in for trait-aware optimization via `Set Current as Optimal`.
3. v1.5: add only well-understood trait modifiers with documented weights and tests.
4. v2: full trait-aware optimizer with validated trait interactions.

Until trait weights are reliable, user-registered SMB4 optimal snapshots should be considered a high-quality benchmark because SMB4 can account for internal game logic we may not fully model yet.

#### Deviation Mapping

Lineup Delta records are created for meaningful deviations from the relevant Optimal Lineup snapshot.

Use greedy largest-gap mapping to explain and score deviations:

1. Compare the chosen lineup to the optimal snapshot.
2. Identify players/positions/order slots where the chosen lineup differs.
3. Rank deviations by largest projected opportunity cost.
4. Exhaust each chosen player and each optimal slot once.
5. Store one `ManagerLineupDeltaRecord` per mapped deviation.

This lets the analyzer handle cases where a benched starter could have replaced another starter at a different position without double-using the same player in the explanation.

If the chosen lineup exactly matches the Optimal Lineup, no Lineup Delta records should be created and the team Lineup Delta is `0.000`.

#### Scoring Philosophy

A manager should not receive final positive credit merely because a suboptimal projected lineup performed less badly than projected. The official score is against the Optimal Lineup expectation because that is the counterfactual decision benchmark.

At game lock, `projectedOpportunityCost` may be shown as pending expected lineup risk, but it should not be counted as final official Manager Value until the game-end actual result resolves.

However, the system should store both pieces for narrative:

```text
projectedOpportunityCost = chosenProjectedKblWpa - optimalProjectedKblWpa
realizedVsChosenProjection = actualChosenKblWpa - chosenProjectedKblWpa
actualVsOptimalProjection = actualChosenKblWpa - optimalProjectedKblWpa
```

Official Lineup Delta uses only non-stale `user_registered` or `user_confirmed_engine` benchmarks. Game-lock fallback snapshots are display-only and cannot produce official Lineup Delta.

Official Lineup Delta scoring uses:

```text
managerWpa = clamp(actualVsOptimalProjection * 0.25, per-deviation cap)
```

Example:

```text
Chosen lineup projected vs optimal: -0.100
Actual chosen lineup result:        -0.050

realizedVsChosenProjection = +0.050
actualVsOptimalProjection  = -0.050
```

The manager beat the risk projection, which is useful narrative context, but still underperformed the Optimal Lineup benchmark by `-0.050`. The official Lineup Delta remains negative after manager share/caps.

If the actual chosen result exceeds the Optimal Lineup expectation, the manager can earn positive Lineup Delta for a successful deviation.

V1 lineup manager share:

```text
managerWpa = clamp(actualVsOptimalProjection * 0.25, -0.250, +0.250)
```

Cap total team lineup delta to `[-0.750, +0.750]` per game. This keeps lineup choice meaningful without letting a manager absorb normal player performance variance.

### 3.4 Deployment Stint Record

Deployment stints track manager personnel decisions whose consequences can persist beyond the immediate tactical window.

```typescript
type ManagerDeploymentRole =
  | "pinch_hitter_remaining_in_game"
  | "pinch_runner"
  | "defensive_position"
  | "pitcher"
  | "catcher"
  | "kept_in"
  | "manual_deployment";

interface ManagerDeploymentStintRecord {
  stintId: string;
  gameId: string;
  managerId: string;
  teamId: string;
  playerId: string;
  playerName: string;
  deploymentRole: ManagerDeploymentRole;
  position?: string;

  openedByEventId: string;
  openedAtEventIndex: number;
  openedByDecisionId?: string;
  openedByDecisionType?: ManagerDecisionType;
  openSnapshot: {
    inning: number;
    half: "top" | "bottom";
    outs: number;
    scoreDifferentialForTeam: number;
    teamWinProbability: number;
  };

  closedByEventId?: string;
  closedAtEventIndex?: number;
  closeReason?: "removed" | "position_changed" | "role_changed" | "inning_end" | "game_end" | "manual_close";

  linkedOutcomeEventIds: string[];
  rawLinkedPlayerWpa: number;
  rawLinkedTeamWpa: number;
  managerShare: number;
  managerDeploymentWpa: number;
  capApplied?: number;
  confidence: "high" | "medium" | "low";
  wpaModelVersion?: string;
  displayTitle: string;
  displaySummary: string;
}
```

Deployment stints are separate from short tactical decision records. A single substitution can create both:

1. A short Tactical Manager WPA record, resolved on the immediate configured window.
2. A longer Deployment WPA stint, resolved from later linked outcomes while the player remains deployed.

Example:

```text
Pinch runner enters -> Tactical PR window opens.
Runner steals second -> Tactical PR/steal value resolves.
Runner stays in game and moves to CF -> Defensive deployment stint opens.
Later CF diving catch -> Deployment WPA receives a manager overlay share of the linked fielding WPA.
```

### 3.5 Play-Log Intent Model

Do not ask the user to confirm manager intent when the GameTracker input already carries that intent.

Manager attribution should come from structured play-log semantics first, play-log enhancement fields second, situational prompts third, and manual edits last.

| Input | Manager Logic | UI Requirement |
| --- | --- | --- |
| Stolen base | Automatic `steal_send` for the offensive manager. In SMB4, the steal attempt is treated as a manager/user tactical send. | Runner action button creates the manager decision. No yes/no prompt. |
| Caught stealing | Automatic `steal_send` for the offensive manager. | Runner action button creates the manager decision. No yes/no prompt. |
| Pickoff | Player/baserunner responsibility by default. | No manager prompt. Optional manual note only. |
| Runner out advancing / TOOTBLAN | Player/baserunner responsibility by default unless the play-log marks `manager_send`. | Runner action enhancement can mark `runner_choice` or `manager_send`; default to player. |
| Extra base taken safely | Player/baserunner responsibility by default unless the play-log marks `manager_send`. | Optional runner-action enhancement, no interruption. |
| Runner hold | Manager decision only if the user explicitly records a hold. | Direct runner input or enhancement. No clarification prompt after the fact. |
| Bunt contact quality | Automatic `bunt_call` when contact quality is `bunt`. | Contact quality button is the decision marker. No yes/no prompt. |
| Bunt with runner from third attempting/scoring/out at home | Automatic `squeeze_call`. | Derived from contact quality `bunt` plus runner-third outcome. No yes/no prompt. |
| SAC result without bunt contact quality | Ambiguous. | Show a lightweight missing-data prompt or post-play edit chip to set contact quality. |
| Grounder with runner out at home and no bunt marker | Not a squeeze by default. | User can manually mark squeeze if needed. |

This keeps the UI honest: structured inputs create structured manager decisions, while prompts exist only to fix ambiguous or missing data.

### 3.6 Enrichment Recalculation Contract

Manager WPA must be recomputed from the current play log and enrichment state, the same way player KBL WPA is recomputed from current event/enrichment state.

If a user edits a completed play and adds, removes, or changes manager-relevant enrichment, the authoritative manager ledger updates when that edit is committed.

In the current GameTracker edit flow, if `Return to Live` is the action that commits post-play enrichment back to the event log, then `Return to Live` is the authoritative recalculation trigger. If a future UI adds an explicit `Save`, `Apply`, or inline commit action, the same recalculation must run there too.

Draft edit behavior:

1. While the user is still editing a historical play, the UI may show a local preview of the likely Manager WPA change.
2. Draft previews must be labeled or styled as pending and must not persist to completed-game state.
3. On `Return to Live` / commit, write the enrichment patch to the event log first.
4. Recompute player KBL WPA and Manager WPA from the committed event/enrichment snapshot.
5. Refresh Manager Moment feed rows, Game Detail overlay data, and persisted completed-game manager decisions from the recomputed truth layer.

| Post-Play Edit | Required Manager WPA Behavior |
| --- | --- |
| Add contact quality `bunt` to a completed PA | Create or update `bunt_call` Manager WPA for the offensive manager. |
| Remove contact quality `bunt` | Remove or zero the derived `bunt_call` / `squeeze_call` decision unless manually pinned. |
| Add R3 home attempt to a bunt play | Upgrade `bunt_call` to `squeeze_call` or create linked squeeze decision. |
| Remove R3 home attempt from squeeze context | Downgrade `squeeze_call` to `bunt_call` when appropriate. |
| Change runner event from `runner_choice` to `manager_send` | Create or update manager send WPA. |
| Change runner event from `manager_send` to `runner_choice` | Remove manager send WPA and keep player baserunning attribution unchanged. |
| Add `manager_hold` | Create or update runner-hold Manager WPA. |
| Change substitution subtype | Reclassify PH/PR/defensive-sub Manager WPA and recompute the linked window. |
| Change linked event outcome | Recompute the decision window and Manager WPA value. |

Derived manager decisions should carry enough provenance to know whether they are still valid after edits:

```typescript
interface ManagerDecisionDerivation {
  derivedFromEventIds: string[];
  derivedFromFields: string[];
  manuallyPinned: boolean;
  stale: boolean;
}
```

Manual manager notes can remain even when a derived decision disappears, but derived Manager WPA should not survive when its source enrichment no longer supports it.

---

## 4. Scoring Model

Manager WPA uses decision windows, not player budget shares.

```text
rawWindowWpa = teamWinProbabilityAfterWindow - teamWinProbabilityBeforeDecision
managerWpa = rawWindowWpa * managerShare
```

For offensive-manager decisions, `teamWinProbability*` is from the batting/running team's perspective.

For defensive-manager decisions, `teamWinProbability*` is from the fielding/pitching team's perspective.

### Manager Share Defaults

| Decision | V1 Share | Reason |
| --- | ---: | --- |
| Intentional walk | 1.00 | The walk itself is a pure manager/team choice. |
| Pinch hitter | 0.25 | Manager chose the matchup, hitter owns execution. |
| Let batter hit | 0.20 | Manager chose not to pinch hit in a high-leverage bottom-third spot. |
| Pinch runner | 0.25 | Manager chose speed/runner usage, runner owns execution. |
| Pitching change | 0.25 | Manager chose pitcher/timing, pitcher owns execution. |
| Leave pitcher in | 0.20 | Manager chose not to change pitcher. |
| Defensive substitution | 0.20 | Manager chose glove/position, fielder owns execution. |
| Position change | 0.10 | Lower confidence unless explicitly strategic. |
| Bunt call | 0.35 | Manager likely owns more of a called sacrifice tactic. |
| Squeeze call | 0.50 | High-intent tactical call. |
| Steal/send | 0.35 for SB/CS direct inputs; 0.00 for pickoffs or unmarked TOOTBLAN. |
| Runner hold | 0.20 when directly entered as a hold. |
| Out advancing/send | 0.35 only when play-log marks `manager_send`; 0.00 when marked or inferred as runner choice. |
| Hit-and-run | 0.35 if manually confirmed. |
| Lineup construction | 0.25 of mapped deviation actual-vs-optimal projection, capped. |

These shares are Manager WPA overlay weights only. They do not affect player KBL WPA.

Defensive alignment is out of active Manager Value scope. Legacy defensive-alignment records are compatibility notes only, are labeled non-scoring, and must not contribute Tactical Manager WPA, Deployment WPA, Lineup Delta, or Manager Value.

### 4.1 Game-Length Weighted Standards

Manager Moment standards must scale with scheduled game length. Any integer game length from 1 through 9 must remain supported; the table below provides presets for common formats.

```typescript
interface ManagerDecisionStandards {
  scheduledInnings: number;
  lateInningStart: number;
  finalPhaseStart: number;
  criticalLeverageIndex: number;
  lateLeverageIndex: number;
  starterFatigueWatchPitches: number;
  starterFatigueUrgentPitches: number;
  relieverFatigueWatchPitches: number;
  relieverFatigueUrgentPitches: number;
  runsAllowedInInningWatch: number;
  consecutiveBaserunnersWatch: number;
  consecutiveWalksWatch: number;
}
```

Default table:

| Scheduled Innings | Late Start | Final Phase | Critical LI | Late LI | SP Watch/Urgent | RP Watch/Urgent | Runs in Inning Watch | Consecutive Baserunners | Consecutive Walks |
| ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| 9 | 7 | 8 | 2.0 | 1.5 | 90 / 105 | 35 / 45 | 3 | 3 | 2 |
| 7 | 5 | 6 | 2.0 | 1.5 | 75 / 90 | 30 / 40 | 3 | 3 | 2 |
| 6 | 5 | 5 | 2.0 | 1.4 | 65 / 80 | 25 / 35 | 2 | 3 | 2 |
| 5 | 4 | 4 | 2.0 | 1.4 | 55 / 70 | 20 / 30 | 2 | 3 | 2 |

If the game length is not in the table, compute:

```text
lateInningStart = floor(scheduledInnings * 2 / 3) + 1
finalPhaseStart = ceil(scheduledInnings * 0.80)
```

Standards are used for prompt timing and decision context, not for fixed-value mWAR scoring.

### 4.2 Recommendation Confidence

Interactive Manager Moments should be generated only when the engine can recommend a real action before the user makes the choice.

| Confidence | Behavior | Examples |
| --- | --- | --- |
| High | Show an interactive recommendation card. | Fatigued pitcher in a critical LI spot; bottom-third hitter due up with a clearly better bench bat; fielder has multiple errors and a defensive replacement is available. |
| Medium | Show a non-blocking feed card with quick action affordance. | Pitcher nearing fatigue threshold; struggling hitter in medium leverage; defensive replacement is plausible but not obvious. |
| Low | Track passively only. | Weak inference, missing bench context, unclear defensive replacement, ambiguous runner responsibility. |

Interactive recommendation cards are for forward-looking choices, not after-the-fact confirmation. Examples:

1. "Leave pitcher in?" before the next PA, with actions to open pitching change, keep pitcher, or dismiss.
2. "Pinch-hit spot" before a high-leverage PA for a bottom-third hitter, with actions to open bench, let batter hit, or dismiss.
3. "Defensive change available" after a player has made repeated defensive mistakes or when protecting a late lead, with actions to open substitutions or dismiss.

If the engine cannot make a strong recommendation, it should record a Manager Moment feed note and avoid a recommendation card.

### 4.3 Recommendation Object Contract

Recommendation logic must be implemented as a pure, testable experience-layer engine that returns recommendation objects. UI components should render those objects; they should not contain the baseball judgment directly.

```typescript
type ManagerRecommendationType =
  | "consider_pitching_change"
  | "consider_pinch_hitter"
  | "consider_defensive_replacement";

interface ManagerRecommendation {
  recommendationId: string;
  type: ManagerRecommendationType;
  managerId: string;
  teamId: string;
  confidence: "high" | "medium" | "low";
  inning: number;
  half: "top" | "bottom";
  outs: number;
  leverageIndex?: number;
  trackedPlayerIds: string[];
  title: string;
  rationale: string;
  primaryAction:
    | "open_pitching_change"
    | "open_pinch_hit"
    | "open_defensive_sub";
  noChangeAction?: "keep_pitcher" | "let_batter_hit" | "decline_defensive_sub";
  suppressKey: string;
}
```

Recommendation objects are not Manager WPA records. They become manager decisions only when the user acts or explicitly chooses a tracked no-change action. The renderer may turn a recommendation into a card, feed note, or quick action, but it must not re-evaluate eligibility itself.

---

## 5. V1 Decision Coverage Matrix

| Decision | V1 Behavior | Trigger | Acting Manager | UI Treatment | Scoring Window |
| --- | --- | --- | --- | --- | --- |
| Lineup construction | Count in v1 | Starting lineup locked and chosen lineup deviates from Optimal Lineup | Own-team manager | Endgame recap card | End of game, mapped deviations vs optimal projection |
| Intentional walk | Count in v1 | `IBB` result | Defensive manager | User-action card/edit chip | From before IBB through next batter PA, or immediate IBB if inning ends first |
| Pitching change | Count in v1 | Pitcher changed | Defensive manager | User-action card/edit chip | From before change through next completed PA; optionally extend to half-inning for feed context |
| Leave pitcher in | Count in v1 | High-leverage pitcher-stays opportunity | Defensive manager | Situational prompt | From prompt/decision point through next completed PA |
| Pinch hitter | Count in v1 | Substitution for current or upcoming batter | Offensive manager | User-action card/edit chip | From before substitution through pinch hitter PA |
| Let batter hit | Count in v1 | LI >= game-length standard and batting-order slot 7-9 due up, no PH made | Offensive manager | Situational prompt | From prompt through that batter PA |
| Pinch runner | Count in v1 | `subType === "pinch_run"` | Offensive manager | User-action card/edit chip | From substitution through runner scores, is out, or inning ends |
| Defensive sub | Count in v1 | `subType === "defensive_replacement"` | Defensive manager | User-action card/edit chip | From substitution through first linked fielding event or half-inning end |
| Position change | Count in v1 as low-confidence | Position-change event | Defensive manager | Feed card only unless manually marked strategic | First linked fielding event or half-inning end |
| Bunt call | Count in v1 automatically from play-log | Contact quality `bunt`, excluding squeeze | Offensive manager | Feed card/edit chip only | Immediate play result |
| Squeeze call | Count in v1 automatically from play-log | Contact quality `bunt` plus runner from third attempts/scores/is out at home | Offensive manager | Feed card/edit chip only | Immediate play result |
| Stolen base / caught stealing | Count in v1 automatically from runner input | SB/CS runner event | Offensive manager | Feed card/edit chip only | Immediate runner event |
| Out advancing / send | Count only when play-log marks manager send; otherwise player/TOOTBLAN | Runner out advancing plus `manager_send` enhancement | Offensive manager | No | Immediate runner event |
| Runner hold | Count when directly entered as manager hold | User records hold | Offensive manager | No | Current play/runner event |
| Hit-and-run | Manual-only in v1 | User marks hit-and-run | Offensive manager | Optional manual prompt only | Current PA plus runner event |
| Defensive alignment/shift/infield in | Manual-only in v1 | User marks alignment decision | Defensive manager | Optional manual prompt only | First linked BIP or inning end |
| Mound visit / pep talk | Defer | Not durably captured | Defensive manager | No | None |
| Pitchout | Defer/manual note | Not durably captured | Defensive manager | No | None |

---

## 6. Prompt And Feed Behavior

### 6.1 Manager Moment Cards And Prompts

Manager Moment UI has three forms:

1. **Decision cards** announce a manager decision that the play-log already knows.
2. **Recommendation cards** ask the user to act before an important decision point.
3. **Clarification prompts** ask for missing intent only when the input is ambiguous.

Do not show yes/no clarification prompts for stolen bases, caught stealing, bunt contact, or squeeze plays when the play-log contains the structured input described in Section 3.4. Those moments can still create feed cards with an edit affordance.

Show an on-screen Manager Moment card or prompt for:

1. High-leverage pitcher-stays opportunity, as a recommendation card before the next PA.
2. High-leverage bottom-third hitter due up, as a recommendation card before the PA.
3. Defensive replacement opportunity, as a recommendation card only when the engine has a clear reason.
4. Pitching change, as a user-action card after the change.
5. Pinch hitter, as a user-action card after the substitution.
6. Pinch runner, as a user-action card after the substitution.
7. Defensive substitution, as a user-action card after the substitution.
8. Intentional walk, as a user-action card after `IBB`.
9. High-leverage steal attempt, as an automatic decision card if SB/CS is entered.
10. Bunt call, as an automatic decision card if contact quality is `bunt`.
11. Squeeze call, as an automatic decision card if contact quality is `bunt` and the runner from third attempts home.

Default leverage thresholds:

```text
MANAGER_MOMENT_CRITICAL_LI = 2.0
MANAGER_MOMENT_LATE_LI = 1.5
```

Use the game-length weighted standards table in Section 4.1 to determine late-inning and final-phase prompts.

Situational prompts should appear before the decision window begins when possible:

| Situational Prompt | Timing |
| --- | --- |
| Leave pitcher in | Before the next PA starts, when game-length standards say the pitcher-stays choice is notable and the same pitcher remains in the game. |
| Let batter hit | Before a PA by lineup slot 7-9 when game-length leverage standards are met and the team has an eligible bench hitter. |
| Missing bunt contact quality | Only when the result implies sacrifice/bunt context but contact quality is missing. |
| Missing runner send source | Only when the runner outcome is marked as a send/hold decision but lacks `manager_send` vs `runner_choice`. |

Recommendation cards should be actionable but non-modal. They should open the relevant existing control surface rather than inventing a separate workflow. User-action cards appear immediately after the user action is recorded. They should not block game flow.

### 6.2 Passive Moments

Track these in the feed and manager style data without interrupting game flow:

1. Pickoff.
2. Runner out advancing / TOOTBLAN when not marked as `manager_send`.
3. Runner taking extra base when not marked as `manager_send`.
4. Position change not marked strategic.
5. Defensive indifference.

Passive moments do not score Manager WPA unless the structured play-log enhancement or a later manual edit marks them as a manager call/send/hold.

### 6.3 Beat Reporter Feed Placement

Use the left feed section currently reserved for beat reporter content:

1. Keep historical matchup data pinned above the feed.
2. Interlace historical tidbits at the end of the 3rd and 6th innings.
3. Use the remaining feed space for Manager Moment cards.
4. Recommendation cards also create feed cards.
5. Passive moments create compact rows without interrupting game flow.

Manager feed card types:

| Card Type | Use |
| --- | --- |
| Prompt card | Needs missing intent before a pending decision can be created. |
| Recommendation card | Forward-looking suggestion where the user can still act. |
| User-action card | Pitching change, PH, PR, defensive sub, IBB. |
| Automatic decision row | SB, CS, bunt, squeeze, direct runner hold/send. |
| Passive row | Pickoff, runner-choice TOOTBLAN, extra base without manager send, position change. |
| Resolution card | Shows Manager WPA after linked window resolves. |
| Lineup recap | End-game manager lineup delta summary. |

Prompt cards should support:

1. `Track Decision`
2. `Player/No Manager Call`
3. `Manual Note`
4. `Dismiss`

For situational prompts, if the user dismisses and proceeds without a substitution, record the no-change decision as `prompted` with `medium` confidence. For passive runner moments, dismissing or ignoring never creates Manager WPA.

Recommendation cards should support:

1. `Open Action` for the relevant substitution/pitching/bench surface.
2. `Keep Current` or `Let Hit` when the no-change choice should be tracked.
3. `Dismiss` when the user does not want to record a prompted no-change decision.
4. `Why?` or compact rationale text when space allows.

Recommendation cards should never force a response. If the user records the next play without answering, the engine may infer the no-change decision only for high-confidence situations defined in Section 4.2.

### 6.4 Play-Log Enhancement UI

The best UI path is to make intent part of the normal scoring flow instead of asking a second question later.

Runner action UI should expose clear actions:

| Runner Input | Stored Intent | Manager WPA |
| --- | --- | --- |
| `SB` | `manager_send` | Yes, automatic `steal_send`. |
| `CS` | `manager_send` | Yes, automatic `steal_send`. |
| `Pickoff` | `runner_responsibility` | No. |
| `Advance` | `runner_choice` by default | No, unless changed to `manager_send`. |
| `Out Advancing` | `runner_choice` by default | No, unless changed to `manager_send`. |
| `Hold` | `manager_hold` when explicitly entered | Yes. |

At-bat/enrichment UI should expose:

| Input | Stored Intent | Manager WPA |
| --- | --- | --- |
| Contact quality `bunt` with no R3 home attempt | `bunt_call` | Yes. |
| Contact quality `bunt` with R3 home attempt | `squeeze_call` | Yes. |
| SAC result with missing contact quality | `ambiguous_bunt` | Prompt/edit chip to set contact quality. |
| Ground ball with runner out at home and no bunt marker | `not_squeeze` by default | No. |

Manager Moment feed cards for automatic inputs should include an `Edit Attribution` affordance. The edit path can flip a runner event between `runner_choice` and `manager_send`, or correct a bunt/squeeze classification. It should not be a blocking yes/no prompt.

### 6.5 Interaction Ladder

Use the least intrusive UI that still captures the decision well.

| Level | Use When | UI |
| --- | --- | --- |
| Silent derivation | The play-log input is unambiguous. | No interruption; Manager WPA updates in the background. |
| Feed note | The moment is interesting but no action is needed. | Compact Manager Moment feed row. |
| Feed note with edit chip | The engine inferred a decision from enrichment that users may want to correct. | Feed row plus `Edit Attribution`. |
| Recommendation card | The user can still make a meaningful tactical choice and confidence is medium/high. | Non-modal card with action buttons. |
| Clarification prompt | The event cannot be scored correctly without missing intent. | Lightweight prompt or edit chip. |

This ladder should be the default UX philosophy. Blocking prompts are not the normal way to collect Manager WPA; interactive cards are reserved for moments where interaction improves the user's decision-making experience.

---

## 7. Attribution Rules

The acting-team rule is authoritative.

| Decision Type | Manager Attribution |
| --- | --- |
| Lineup construction | Manager assigned to that team. |
| Pitching change | Manager of the team whose pitcher is being replaced. |
| Leave pitcher in | Manager of the team currently pitching/fielding. |
| Pinch hitter | Manager of the team batting. |
| Let batter hit | Manager of the team batting. |
| Pinch runner | Manager of the team running/batting. |
| Defensive sub | Manager of the team fielding. |
| Position change | Manager of the team fielding. |
| Intentional walk | Manager of the team pitching/fielding. |
| Steal/send/hold | Manager of the team running/batting. |
| Bunt/squeeze/hit-and-run | Manager of the team batting. |
| Defensive alignment | Manager of the team fielding. |

GameTracker helpers should resolve:

```typescript
const offensiveTeamId = isTop ? awayTeamId : homeTeamId;
const defensiveTeamId = isTop ? homeTeamId : awayTeamId;
const offensiveManagerId = getManagerForTeam(offensiveTeamId);
const defensiveManagerId = getManagerForTeam(defensiveTeamId);
```

Never use `homeManagerId` as a default attribution target when the away team may be acting.

---

## 8. Decision Resolution Timing

Manager decisions have a lifecycle:

```text
detected -> pending -> resolved
```

The decision event captures the manager choice. The resolution window captures what happened after that choice. This is a resulting window, not a claim of perfect causality: the manager gets a share of the team's WP movement over the relevant follow-up window because that is the cleanest observable result of the decision.

The engine must not score pending decisions as `0.000` unless their resolution window actually closes at `0.000`. Pending decisions should display as pending in the feed/Game Detail and should not be included in resolved Manager WPA totals until the window closes.

Window rules:

1. `teamWinProbabilityBefore` is captured from the acting manager's team perspective at the decision point, before the tactical effect is applied when possible.
2. `teamWinProbabilityAfter` is captured from the acting manager's team perspective at the first valid resolution endpoint.
3. `rawWindowWpa = teamWinProbabilityAfter - teamWinProbabilityBefore`.
4. `managerWpa = rawWindowWpa * managerShare`.
5. `linkedEventIds` must include the decision event and all outcome events used to resolve the window.
6. If the game ends before the normal endpoint, resolve on game end using the last committed game-state snapshot.
7. If an event inside the window is edited later, recompute the decision from the committed event log and update the linked event set.
8. If the source decision is removed or reclassified, remove or reclassify the derived decision unless manually pinned.

| Decision | Resolve When | Linked Events |
| --- | --- | --- |
| Lineup construction | Game complete | All starter player KBL WPA totals |
| IBB | Next batter PA completes; if no next batter, immediate IBB WPA | IBB event, next PA |
| Pitching change | Next completed PA in v1 | Pitcher-change event, next PA |
| Leave pitcher in | Next completed PA | Prompt event, next PA |
| Pinch hitter | Pinch hitter PA completes | Substitution event, PH PA |
| Let batter hit | Batter PA completes | Prompt event, PA |
| Pinch runner | Runner scores, is out, or inning ends | Substitution event, runner events, inning-end event |
| Defensive sub | First linked fielding event or half-inning end | Substitution event, fielding event |
| Position change | First linked fielding event or half-inning end | Position-change event, fielding event |
| Bunt call | Current PA commits | PA event with contact quality `bunt` |
| Squeeze call | Current PA commits | PA event with contact quality `bunt` and R3 home attempt |
| Steal/send | Current runner event commits | SB/CS between-play runner event |
| Out advancing/send | Current runner event commits only when marked `manager_send` | Between-play runner event |
| Runner hold | Current play commits when directly entered | PA or between-play event |
| Hit-and-run | Current PA and runner event complete | PA event, runner event |
| Defensive alignment | First BIP after alignment or inning end | Alignment note, BIP/fielding event |

V1 should keep windows short. Longer windows can be shown as narrative context but should not score Manager WPA until calibrated.

### 8.1 V1 Window Endpoint Rules

| Decision | Start Snapshot | End Snapshot | Pending Until |
| --- | --- | --- | --- |
| Intentional walk | Before IBB is committed. | After next batter PA, inning end if no next PA, or game end. | Next batter PA/inning/game end. |
| Pitching change | Before pitcher-change event is committed. | After incoming pitcher's next completed PA in v1. | Next PA by new pitcher. |
| Leave pitcher in | At recommendation/no-change decision point before next PA. | After current pitcher's next completed PA. | Next PA by same pitcher. |
| Pinch hitter | Before substitution is committed, or earliest available pre-PA snapshot. | After pinch hitter's PA. | PH PA. |
| Let batter hit | At recommendation/no-change decision point before batter PA. | After that batter's PA. | Batter PA. |
| Pinch runner | Before substitution is committed. | When runner scores, is out, inning ends, or game ends. | Runner terminal event or inning/game end. |
| Defensive sub | Before substitution is committed. | First linked fielding event by substitute, half-inning end, or game end. | Fielding event or half-inning/game end. |
| Position change | Before position-change event is committed. | First linked fielding event by moved fielder, half-inning end, or game end. | Fielding event or half-inning/game end. |
| Bunt call | Before PA is committed. | After same PA. | Same PA commit. |
| Squeeze call | Before PA is committed. | After same PA, including R3 outcome. | Same PA commit. |
| Steal/send | Before runner event is committed. | After same runner event. | Runner event commit. |
| Out advancing/send | Before runner event is committed. | After same runner event. | Runner event commit. |
| Runner hold | Before hold/no-advance event is committed when available. | After current PA/between-play state is committed. | Current play/runner event commit. |
| Hit-and-run | Before PA or runner-start marker is committed. | After PA plus linked runner event. | PA and runner event. |
| Defensive alignment | Before alignment marker. | First BIP after alignment, inning end, or game end. | BIP or inning/game end. |

### 8.2 Pending Decision Record Requirements

Pending records must contain enough metadata for the resolver to find the endpoint without guessing from UI state:

```typescript
interface ManagerDecisionResolutionWindow {
  status: "pending" | "resolved";
  startEventId: string;
  startEventIndex: number;
  startSnapshotSource: "pre_event" | "event_state" | "manual_snapshot";
  expectedEndpoint:
    | "same_event"
    | "next_pa"
    | "same_player_pa"
    | "runner_terminal"
    | "first_fielding_event"
    | "half_inning_end"
    | "game_end";
  trackedPlayerIds: string[];
  trackedRunnerIds: string[];
  maxEventIndex?: number;
}
```

The resolver should be pure: given the committed event log, the pending decision record, and team/manager context, it returns either an updated pending record or a resolved record with `teamWinProbabilityAfter`, `rawWindowWpa`, `managerWpa`, `resolvedAtEventId`, and expanded `linkedEventIds`.

### 8.3 Resolver Order

When committed events change:

1. Derive source manager decisions from committed events/enrichment.
2. Build or preserve pending resolution windows.
3. Walk events forward from each decision's `startEventIndex`.
4. Resolve any windows whose endpoint is now available.
5. Leave unresolved windows pending.
6. Recompute Manager WPA totals using resolved records only.
7. Persist the refreshed manager decision ledger.

### 8.4 Persistent Deployment WPA

Short decision windows are intentionally narrow, but they do not capture every meaningful managerial effect. A manager's decision to put a player into the game, move a player to a position, or keep a player in a role can matter later, after the tactical window has closed.

Deployment WPA solves that gap by replaying the committed game log as a role/stint ledger.

#### Stint Lifecycle

```text
opened -> active -> closed -> scored
```

Open a deployment stint when:

1. A substitute enters and remains in the game after the immediate tactical event.
2. A pinch hitter completes the PA and remains in the field or batting order.
3. A pinch runner remains in the game as a runner, batter, or fielder.
4. A pitcher enters the game.
5. A player changes defensive position.
6. The user explicitly chooses to keep a player in after a recommendation/prompt.
7. A manual deployment note is entered.

Close a deployment stint when:

1. The player is removed from the game.
2. The player changes the tracked position or role.
3. A pitcher is replaced.
4. A pinch runner scores/is out and does not remain in the game.
5. The half-inning ends for inning-scoped defensive alignments, unless the same player remains in the same defensive role next inning.
6. The game ends.
7. The user manually closes a manually created deployment.

#### Linked Outcomes

While active, a stint links only outcomes relevant to the deployed role:

| Deployment Role | Linked Outcomes |
| --- | --- |
| Pinch hitter remaining in game | Later batting WPA, baserunning WPA, and defensive WPA only after the immediate PH PA window has resolved. |
| Pinch runner | Baserunning WPA while on base; later batting/fielding WPA only if the player remains in the game after the runner terminal event. |
| Defensive position | Fielding WPA at that position; optional throwing/cutoff outcomes if the event log can identify position responsibility. |
| Pitcher | Pitching WPA for PAs faced while the pitcher remains in the game. |
| Catcher | Catching WPA for caught stealing, passed ball/wild pitch responsibility if tracked, framing/blocking only if future inputs support it. |
| Kept in | Only outcomes that occur after the explicit keep decision and before removal/role change/game end. |
| Manual deployment | Only manually linked outcomes, or outcomes matching the manually selected role. |

Do not link every future event by the player to the manager. The role has to match the manager's deployment decision.

#### Scoring

Deployment WPA uses already-derived player/team WPA outcomes as input, then applies a manager overlay share.

```text
rawLinkedPlayerWpa = sum(relevant player WPA while stint is active)
rawLinkedTeamWpa = sum(relevant team WPA window values when player-level split is unavailable)
managerDeploymentWpa = clamp((rawLinkedPlayerWpa or rawLinkedTeamWpa) * managerShare, stintCap)
```

Recommended v1 shares:

| Deployment Role | Share | Suggested Cap |
| --- | ---: | ---: |
| Pinch hitter remaining in game | 15% | +/-0.100 |
| Pinch runner | 20% | +/-0.125 |
| Defensive position | 20% | +/-0.150 |
| Pitcher | 15% | +/-0.200 |
| Catcher | 15% | +/-0.125 |
| Kept in | 15% | +/-0.150 |
| Manual deployment | 10% | +/-0.100 |

Caps are per stint. Team-level Deployment WPA should also have a per-game cap, recommended `[-0.500, +0.500]` in v1, so managers do not absorb too much player performance.

#### Relationship To Other Manager Layers

Deployment WPA must not double-score the same immediate tactical window.

Rules:

1. The immediate PH PA belongs to Tactical Manager WPA, not Deployment WPA.
2. The immediate PR runner terminal event belongs to Tactical Manager WPA. If the player stays in the game afterward, a new role-specific deployment stint may open.
3. The first PA after a pitching change belongs to Tactical Manager WPA. Pitcher deployment can begin after that configured tactical window resolves, or can include later PAs only.
4. Defensive sub/position-change Tactical WPA may still resolve on the first linked fielding event or half-inning end in v1. Deployment WPA should begin after that first tactical endpoint if the player remains in that role.
5. Lineup Delta covers starters as game-level lineup construction. Do not open default deployment stints for every starter unless the user later makes an explicit keep-in or position-change decision.
6. Player KBL WPA remains unchanged. Deployment WPA is overlay-only.

#### Example: Pinch Runner To Center Field

```text
B2: Manager inserts fast player as pinch runner.
B2: Player steals second.
    Tactical Manager WPA records the PR/steal outcome.
B2 end: Player remains in the game and is moved to CF.
    Defensive position deployment stint opens.
T3: Player makes diving catch in a blowout.
    Stint links tiny fielding WPA.
B3: In a tied 3-inning game, player makes diving catch.
    Stint links high-leverage fielding WPA.
Game end/removal/position change:
    Stint closes and Deployment WPA is scored.
```

This gives the user a 360-degree view: the feed can show the immediate tactical move, then later show that the same deployment decision continued to matter.

---

## 9. Integration With Current KBL WPA

### 9.1 Derivation

The KBL WPA derivation function may emit manager overlay credits only when requested:

```typescript
deriveKblWpaCredits({
  ...inputs,
  includeManagerOverlays: true,
});
```

Default behavior remains:

```typescript
includeManagerOverlays = false
```

### 9.2 Aggregation

Default player aggregation excludes manager overlays:

```typescript
aggregateKblWpaCredits(credits)
```

Manager-specific views can opt in:

```typescript
aggregateKblWpaCredits(credits, {
  includeManager: true,
  includeOverlays: true,
})
```

Do not use the opt-in manager-inclusive aggregation for player leaderboards, Player of the Game, player Almanac totals, award races, or team KBL player totals.

### 9.3 Storage

Store manager decisions independently from player KBL WPA credits:

```typescript
interface PersistedGameState {
  optimalLineupSnapshots?: OptimalLineupSnapshot[];
  managerDecisions?: ManagerDecisionRecord[];
  managerDeploymentStints?: ManagerDeploymentStintRecord[];
  managerLineupDeltas?: ManagerLineupDeltaRecord[];
}
```

Completed game records in Exhibition, Elimination, and Franchise must preserve the game-lock Optimal Lineup snapshots, both managers' decision ledgers, deployment stints, and lineup deltas.

---

## 10. Game Detail Display

Game Detail should show Manager WPA as its own surface.

### Required Sections

1. Player KBL WPA leaderboard, unchanged and manager-free by default.
2. Manager WPA Overlay panel.
3. Manager decision timeline.
4. Deployment WPA recap.
5. Lineup Delta recap.

### Manager WPA Overlay Panel

Show one card per team manager:

| Field | Example |
| --- | --- |
| Manager | Vinnie Hart |
| Team | Moose |
| Tactical Manager WPA | `+0.184` |
| Deployment WPA | `+0.046` |
| Lineup Delta | `-0.062` |
| Manager Value | `+0.168` |
| Best Decision | "Pinch hitter in 7th, +0.081" |
| Worst Decision | "Left pitcher in, -0.104" |

### Timeline Columns

| Column | Description |
| --- | --- |
| Inning | Half-inning and out state |
| Team | Acting team |
| Manager | Manager name |
| Decision | Human-readable decision |
| Method | automatic / prompted / manual / passive |
| LI | Leverage index |
| Window | What events were used |
| Manager WPA | Signed result |
| Confidence | high / medium / low |

Passive non-scored moments may appear in timeline only if the user toggles "Show passive moments."

### Lineup Delta Recap

Lineup Delta should show the relevant Optimal Lineup snapshot and only the meaningful deviations from that snapshot.

| Column | Description |
| --- | --- |
| Hand | RHP/LHP snapshot used |
| Chosen | Player/position/order the manager started |
| Optimal | Player/position/order from the Optimal Lineup |
| Projected Gap | `chosenProjectedKblWpa - optimalProjectedKblWpa` |
| Actual vs Chosen Projection | Did the choice beat or miss its own projection? |
| Actual vs Optimal | Official raw lineup delta before manager share |
| Manager Share | 25% |
| Lineup Delta | Signed manager overlay |

If the manager used the Optimal Lineup, show "No lineup deviations" and `0.000` Lineup Delta rather than assigning blame for normal player underperformance.

### Deployment Recap

Deployment WPA should be visually separate from the tactical timeline. It is a stint table, not a single-play feed.

| Column | Description |
| --- | --- |
| Opened | Inning/half when the deployment began |
| Closed | Inning/half or reason the deployment ended |
| Manager | Manager name |
| Player | Deployed player |
| Role | PR, CF, P, kept in, etc. |
| Linked Outcomes | Count and short labels of linked player/team WPA events |
| Raw WPA | Sum of linked player/team WPA before manager share |
| Share | Manager share |
| Deployment WPA | Signed manager overlay |

Clicking a deployment stint should open details showing the source decision, active window, linked outcome events, and why the stint closed.

---

## 11. Almanac Display

Add a Manager section to the Almanac.

### Almanac Source Of Truth

Almanac manager views must consume committed completed-game manager data:

```typescript
CompletedGameRecord.optimalLineupSnapshots
CompletedGameRecord.managerDecisions
CompletedGameRecord.managerDeploymentStints
CompletedGameRecord.managerLineupDeltas
```

Do not re-run GameTracker inference, recommendation logic, or event-log Manager WPA derivation inside Almanac screens. If a completed game has no committed manager records, Almanac should treat that game as having no manager WPA data rather than deriving it lazily. This keeps Almanac read-only, reproducible, and consistent with Game Detail/Postgame.

### Manager Card

Manager cards should support:

1. Manager profile fields: name, gender, age, hometown, created/default.
2. Current and historical team assignments.
3. Mode/instance scope selectors.
4. Win/loss record.
5. Tactical Manager WPA.
6. Deployment WPA.
7. Lineup Delta.
8. Manager Value.
9. Decisions by type.
10. Lineup deviations vs Optimal Lineup.
11. Deployment stints by role/position.
12. Best and worst decisions.
13. Best and worst deployments.
14. Passive style indicators.
15. Performance of players managed, shown as descriptive context rather than player value transferred to the manager.

### Aggregation Scopes

Every manager stat must be queryable by:

1. All-time across teams.
2. Team-specific tenure.
3. Mode: exhibition, elimination, franchise.
4. Instance: specific elimination run or franchise save.
5. Season, if available.

### Leaderboards

Create separate manager leaderboards:

1. Manager Value.
2. Tactical Manager WPA.
3. Deployment WPA.
4. Lineup Delta.
5. Best single-game Manager WPA.
6. Best/worst decision.
7. Best/worst deployment.
8. Best/worst lineup deviation.
9. Tendencies: steal rate, bunt rate, bullpen aggressiveness, PH rate, PR rate, IBB rate, defensive-deployment value, optimal-lineup deviation rate.

Do not put managers into player leaderboards.

---

## 12. Legacy mWAR Migration

The current mWAR engine should be treated as legacy.

### Replace mWAR As Primary

Use Manager WPA / Manager Value as the new manager system because it is:

1. Grounded in actual game win-probability movement.
2. Compatible with KBL WPA event attribution.
3. Symmetric for home and away managers.
4. Able to separate tactical decisions, persistent deployments, and lineup construction.
5. Safer for leaderboards because it is overlay-only.

### Keep Temporarily Only For Compatibility

Existing `mwarCalculator`, `useMWARCalculations`, and `managerStorage` concepts may be mined for types, storage patterns, and UI wiring, but new scoring should not use fixed `DECISION_VALUES * sqrt(LI)` formulas.

If existing screens expect an `mWAR` field, provide a compatibility adapter:

```text
legacyMwarDisplay = convertManagerValueToDisplayScale(managerValue)
```

Do not maintain mWAR as a separate truth source.

---

## 13. Risks And Edge Cases

| Risk | Mitigation |
| --- | --- |
| Manager gets credit for player execution | Manager WPA is overlay-only; use manager shares and caps. |
| Deployment WPA turns into "manager gets all future player credit" | Link only role-relevant outcomes while the deployment stint is active; cap per stint and per team game. |
| Double-counting tactical and deployment windows | Deployment stints begin after the immediate tactical endpoint for PH/PR/pitching-change/defensive-sub decisions. |
| Starter performance double-counted as deployment | Starters are handled by Lineup Delta; do not create default deployment stints for starters without an explicit later keep-in/position-change decision. |
| Long stints hide important moments | Store linked outcome event IDs and show expandable deployment details rather than one vague aggregate row. |
| Position-change ambiguity | Require role/position matching before linking fielding WPA to a deployment stint; otherwise keep confidence low or manual-only. |
| Lineup Delta overwhelms tactical decisions | Use 25% share and per-player/team caps. |
| Optimal Lineup creates a default negative before the game starts | Store projected opportunity cost as pending/context only; official Lineup Delta resolves at game end against actual deviation result vs optimal projection. |
| User chooses optimal lineup and players fail | Do not create Lineup Delta records when the chosen lineup matches the Optimal Lineup; player failure remains player WPA, not manager lineup blame. |
| Same roster player appears as multiple replacement explanations | Use whole-roster Optimal Lineup snapshots and greedy largest-gap deviation mapping that exhausts each chosen player and optimal slot once. |
| Trait model produces unfair optimal benchmarks | Use conservative trait modeling, document weights, and allow user-registered SMB4 optimal snapshots before full trait validation. |
| User registers current lineup as optimal after making manager choices | `Set Current as Optimal` is available only before lineup lock; after lock, the benchmark snapshot is read-only. |
| Opposing starter handedness changes after lineup is prepared | Pregame prompts to switch to the matching hand snapshot, recalculate, or keep current benchmark before lineup lock. |
| False situational prompts | Keep threshold high in v1, allow dismiss/manual note, and mark confidence. |
| Interaction fatigue | Use non-modal recommendation cards only when the user can still act; use passive feed rows for everything else. |
| Confirmation fatigue on obvious events | SB/CS, bunt, and squeeze come from structured inputs and show edit chips, not yes/no prompts. |
| Overconfident recommendation engine | Gate recommendation cards by confidence; low-confidence moments become passive feed notes. |
| Home manager bias | Require team-to-manager lookup for every decision. Add tests. |
| Missing manager identity | Use assigned default manager profile, not `homeManagerId` fallback. |
| Substitution timing ambiguity | Link to the next PA/runner/fielding event and store confidence. |
| Defensive sub never sees a ball | Resolve at half-inning end with `0.000` Manager WPA and feed note. |
| Pinch runner stranded | Resolve at inning end with window WPA from insertion to inning end, multiplied by share. |
| IBB followed by inning-ending pickoff/runner event | Resolve on inning end if next batter PA does not happen. |
| Manual manager send on runner event after commit | Allow post-play edit to add/remove manager decision and recalculate manager overlay only. |
| Bunt result without contact quality | Show an ambiguity prompt/edit chip before scoring Manager WPA. |
| Enrichment edit creates stale manager value | Store decision provenance and recompute derived Manager WPA after every manager-relevant edit. |
| Deployment stint stale after substitution edit | Rebuild the deployment ledger from the committed event log on every manager-relevant commit. |
| Optimal projection confidence is low | Store confidence and algorithm version; keep caps conservative and preserve projection components for recalibration. |
| Existing mWAR records | Preserve old records but label as legacy in migrations/displays. |

---

## 14. Tests Required Before Implementation Is Accepted

### Unit Tests

1. `aggregateKblWpaCredits()` excludes manager overlays by default.
2. Manager overlays are included only with `includeManager: true` and `includeOverlays: true`.
3. IBB creates a defensive-manager decision for the correct team.
4. Pitching change credits the defensive manager of the team replacing the pitcher, home and away.
5. Pinch hitter credits the offensive manager, home and away.
6. Pinch runner credits the offensive manager and resolves when runner scores/is out/inning ends.
7. Defensive sub credits the defensive manager and resolves on first linked fielding event or inning end.
8. Leave-pitcher-in prompt credits the defensive manager only when the same pitcher remains.
9. Let-batter-hit prompt credits the offensive manager only for order slots 7-9 at high leverage.
10. SB/CS direct runner inputs score automatic `steal_send` Manager WPA without a yes/no prompt.
11. Pickoff and runner-choice TOOTBLAN do not score Manager WPA.
12. Out advancing scores Manager WPA only when the play-log marks `manager_send`.
13. Contact quality `bunt` creates automatic `bunt_call` Manager WPA.
14. Contact quality `bunt` plus R3 home attempt creates automatic `squeeze_call` Manager WPA.
15. SAC result with missing contact quality creates an ambiguity prompt/edit chip, not an automatic manager decision.
16. Adding contact quality `bunt` after the fact creates or updates Manager WPA.
17. Removing contact quality `bunt` after the fact removes or zeros derived bunt/squeeze Manager WPA unless manually pinned.
18. Changing runner intent from `runner_choice` to `manager_send` creates or updates Manager WPA.
19. Changing runner intent from `manager_send` to `runner_choice` removes manager send WPA.
20. Recommendation confidence gates produce recommendation cards only for medium/high confidence moments.
21. Pending decisions are excluded from resolved Manager WPA totals until their endpoint closes.
22. IBB remains pending until the next batter PA, inning end, or game end.
23. Pitching change remains pending until the incoming pitcher's next PA resolves.
24. PH/PR/defensive-sub records use their configured forward windows, not same-event zeroes.
25. Editing an outcome event inside a decision window recomputes the linked manager decision.
26. Draft enrichment edits do not persist Manager WPA until the edit is committed.
27. `Return to Live` / enrichment commit triggers Manager WPA recomputation from the committed event log.
28. Optimal Lineup generator creates separate reproducible snapshots vs RHP and vs LHP.
29. Pregame loads the relevant Optimal Lineup based on opposing starter hand.
30. Pregame can switch the active benchmark when opposing starter hand changes before lineup lock.
31. Pregame can recalculate the active Optimal Lineup from KBL engine inputs before lineup lock.
32. Pregame can register the current lineup as SMB4 optimal before lineup lock.
33. After lineup lock, the game-lock Optimal Lineup snapshot is read-only for that game.
34. Lineup Delta creates records only for meaningful deviations from the relevant official Optimal Lineup snapshot.
35. If the chosen lineup matches the Optimal Lineup, Lineup Delta is `0.000` regardless of player underperformance.
36. A deviation that beats its chosen projection but remains below the Optimal Lineup benchmark still scores negative official Lineup Delta while preserving positive narrative context.
37. Lineup Delta applies 25% share and per-deviation/team caps.
38. Both managers' decisions persist to completed game records.
39. Player KBL WPA totals are unchanged when Manager WPA is enabled.
40. Pinch-runner substitution opens an eligible deployment stint only if the player remains in the game after the immediate runner window.
41. Position change opens a defensive-position deployment stint tied to the moved player's new position.
42. Defensive-position deployment links only fielding WPA events at the tracked position.
43. A deployment stint closes when the player is removed, changes tracked position/role, or the game ends.
44. Deployment WPA excludes the immediate tactical endpoint for PH/PR/pitching-change/defensive-sub decisions.
45. Deployment WPA applies configured share and per-stint cap after linked player/team WPA is summed.
46. Starter performance does not create Deployment WPA unless a later explicit keep-in or position-change decision opens a stint.
47. Player KBL WPA totals are unchanged when Deployment WPA is enabled.

### Integration Tests

1. Complete a game with away-team pitching change and verify away manager receives the decision.
2. Complete a game with home-team pinch hitter and verify home manager timeline resolves after that PA.
3. Complete a game with IBB and next-batter outcome and verify decision window WPA.
4. Complete a game with high-leverage bottom-third hitter, no PH, and verify `let_batter_hit`.
5. Complete a game with high-leverage pitcher left in and verify `leave_pitcher_in`.
6. Complete a game with SB/CS and verify automatic manager scoring appears in the feed without extra confirmation.
7. Complete a game, edit a prior PA to add bunt enrichment, and verify Manager WPA/Game Detail updates.
8. Complete a game, edit a runner event from runner choice to manager send, and verify Manager WPA/Game Detail updates.
9. Start a historical enrichment edit, change bunt intent, and verify Manager WPA does not persist until `Return to Live` / commit.
10. Record IBB and verify it displays pending until the next PA or inning/game end resolves it.
11. Record a pitching change and verify it displays pending until the incoming pitcher's next PA resolves it.
12. Record PH/PR/defensive-sub decisions and verify each waits for its configured endpoint.
13. Edit the next PA after an IBB and verify IBB Manager WPA recomputes.
14. Verify high-confidence recommendation cards open the relevant GameTracker action surface.
15. Complete a game with lineup deviations from the relevant Optimal Lineup and verify end-game Lineup Delta summary.
16. Verify Game Detail player leaderboard is unchanged with manager overlay disabled.
17. Verify Game Detail Manager WPA panel displays both managers.
18. Verify Almanac manager card aggregates by manager, team tenure, mode, and instance.
19. Complete a game where a pinch runner steals, stays in the game, moves to CF, and later records a high-WPA catch; verify Tactical WPA and Deployment WPA are separate.
20. Verify a blowout defensive play linked to a deployment stint produces small Deployment WPA, while a later tied final-inning defensive play produces larger Deployment WPA.
21. Verify removing the deployed player closes the stint and prevents later player events from linking to that manager decision.
22. Verify editing a substitution or position change rebuilds deployment stints and updates Game Detail/Almanac committed values.
23. In pregame, change the opposing starter hand and verify the UI can switch to the matching Optimal Lineup snapshot before lineup lock.
24. In pregame, use `Set Current as Optimal` and verify the game-lock benchmark is tagged `user_registered_smb4_optimal`.
25. Verify `Set Current as Optimal` is unavailable after lineup lock and cannot erase a manager deviation after the fact.

### Regression Tests

1. Existing player Player of the Game logic ignores Manager WPA.
2. Existing KBL WPA Play Audit does not show manager rows unless overlay mode is enabled.
3. Legacy mWAR storage does not overwrite new Manager WPA records.
4. Saved games without manager identities load by generating or resolving default manager profiles.

---

## 15. Clean V1 Implementation Plan

### Phase 1: Data Contracts And Migration

1. Add `ManagerProfile`, `ManagerAssignment`, `ManagerDecisionRecord`, and `ManagerLineupDeltaRecord` types.
2. Add `ManagerDecisionSource` and runner/bunt intent fields to the event ledger.
3. Add manager assignment resolution for Exhibition, Elimination, and Franchise.
4. Add generated manager names from the existing name database, plus Create-a-Manager edit support.
5. Ensure every game has `homeManagerId` and `awayManagerId` resolved from team assignment.
6. Add game-length weighted manager decision standards.
7. Mark legacy mWAR code paths as compatibility-only.

### Phase 2: GameTracker Decision Ledger

1. Create a manager decision service/hook that handles both managers.
2. Replace home-manager-only mWAR state with team-keyed manager decision state.
3. Add acting-team attribution helpers.
4. Add manager-decision derivation from current event log plus enrichment state.
5. Store provenance for derived decisions so post-play edits can invalidate/recompute them.
6. Wire the enrichment commit path, including `Return to Live`, to run truth-layer recomputation after event-log updates.
7. Persist decisions into completed game state for both teams.

### Phase 3: Passive Derivation And Play-Log Enhancements

1. Wire IBB.
2. Wire pitching change.
3. Wire pinch hitter.
4. Wire pinch runner.
5. Wire defensive sub and position change.
6. Wire high-leverage leave-pitcher-in prompt.
7. Wire high-leverage bottom-third let-batter-hit prompt.
8. Wire SB/CS as automatic `steal_send` decisions from runner inputs.
9. Wire bunt and squeeze as automatic decisions from contact-quality and runner-outcome inputs.
10. Wire manager-send and runner-choice enhancements for out-advancing/extra-base events.
11. Add passive feed rows for pickoffs, runner-choice TOOTBLAN, extra-base moments, and non-strategic position changes.

### Phase 4: Decision-Window Resolver

1. Add pending/resolved resolution-window metadata to manager decision records.
2. Implement pure resolver logic that walks committed events forward from each decision.
3. Resolve same-event windows: bunt, squeeze, steal/send, runner hold, out-advancing send.
4. Resolve next-PA windows: IBB, pitching change, leave-pitcher-in, PH, let-batter-hit.
5. Resolve runner/fielding windows: PR, defensive sub, position change.
6. Keep unresolved records pending and excluded from resolved Manager WPA totals.
7. Add recomputation when linked outcome events are edited.

### Phase 5: Scoring, Recalculation, And Passive Display

1. Compute Manager WPA from acting team's win-probability delta.
2. Apply manager share constants.
3. Keep manager overlays separate from player KBL WPA aggregation.
4. Add post-play edit recalculation for manager overlays.
5. Ensure `Return to Live` / enrichment commit updates Game Detail, feed rows, and persisted completed-game state consistently.
6. Keep draft previews separate from committed Manager WPA.
7. Surface passive/pending/resolved manager decisions in the Manager Moment feed.
8. Add the basic Game Detail Manager WPA overlay.

### Phase 6: Lineup Delta

1. Add `OptimalLineupSnapshot` contracts and storage.
2. Add League Builder Optimal Lineup generation for each team vs RHP and vs LHP.
3. Add Team Hub recalculation for Elimination and Franchise using mode context.
4. Pregame loads the relevant Optimal Lineup by opposing starter hand and offers `Apply Optimal`, `Compare Current`, `Recalculate`, and `Set Current as Optimal`.
5. At game lock, snapshot the chosen lineup and the relevant Optimal Lineup.
6. At game end, derive actual KBL WPA only for mapped lineup deviations.
7. Score deviations against the Optimal Lineup projected benchmark, while storing chosen-projection over/underperformance for narrative context.
8. Apply 25% manager share and caps.
9. Persist `optimalLineupSnapshots` and `managerLineupDeltas`.
10. Add tests that `Set Current as Optimal` is pre-lock only and that handedness changes switch/recalculate the benchmark before game lock.

### Phase 6B: Deployment WPA

1. Add `ManagerDeploymentStintRecord` contracts and completed-game storage.
2. Implement a pure deployment-ledger derivation pass that replays committed substitutions, position changes, pitcher changes, and explicit keep-in decisions.
3. Open deployment stints for eligible non-starter role changes and explicit keep-in decisions.
4. Close stints on removal, role/position change, runner terminal without staying in game, or game end.
5. Link role-relevant player/team WPA outcomes while the stint is active.
6. Exclude the immediate tactical endpoint from Deployment WPA to avoid double-counting Tactical Manager WPA.
7. Apply role-specific manager shares and per-stint/team caps.
8. Persist `managerDeploymentStints`.
9. Add Game Detail, Postgame, and Almanac displays for Deployment WPA as a separate Manager Value component.

### Phase 7: Recommendation Engine

1. Implement game-length weighted standards.
2. Add confidence scoring for pitcher-stays, pinch-hit, and defensive-replacement opportunities.
3. Implement a pure recommendation-object generator before rendering UI.
4. Show recommendation cards only for medium/high confidence moments.
5. Make recommendation cards open existing pitching/substitution/bench UI surfaces.
6. Fall back to passive feed notes for low-confidence moments.
7. Add `Edit Attribution` affordances to automatic Manager Moment feed rows instead of yes/no confirmation prompts.

### Phase 8: Almanac

1. Add committed-data-only manager aggregation helpers over `CompletedGameRecord.optimalLineupSnapshots`, `managerDecisions`, `managerDeploymentStints`, and `managerLineupDeltas`.
2. Add Manager Almanac section.
3. Add manager cards and team-tenure views.
4. Add mode/instance scoped aggregations.
5. Add manager leaderboards separate from player leaderboards.
6. Add derived management style summaries from committed decisions only.

### Phase 9: Test And Cutover

1. Add unit tests for all decision types and aggregation exclusions.
2. Add GameTracker integration tests for both managers.
3. Add Game Detail and Almanac display tests.
4. Remove new-feature dependency on legacy fixed-value mWAR.
5. Keep a temporary adapter only where existing UI still expects an mWAR label.

---

## 16. Implementation Guardrails

1. Do not add Manager WPA to collapsed player totals.
2. Do not add Manager WPA to Player of the Game.
3. Do not add Manager WPA to player awards.
4. Do not infer every player outcome as a manager decision.
5. Do not score passive runner events unless structured play-log enhancement or manual edit marks them as manager calls.
6. Do not use home manager as fallback for away decisions.
7. Do not use fixed mWAR decision values for new Manager WPA.
8. Do not block game flow with required manager prompts.
9. Do not lose prompt/feed records when a decision resolves to `0.000`.
10. Do not require a fully calibrated projection model before Lineup Delta can ship; use versioned conservative Optimal Lineup projections and preserve inputs for recalibration.
11. Do not ask for yes/no confirmation when SB/CS, bunt, or squeeze intent is already captured by structured play-log input.
12. Do not let derived Manager WPA become stale after play-log enrichment changes.
13. Do not show a recommendation card when the engine cannot identify a concrete action the user can still take.
14. Do not persist Manager WPA from draft enrichment edits before `Return to Live` / commit.
15. Do not put recommendation eligibility logic directly inside presentation components; render recommendation objects from a testable engine.
16. Do not use short tactical windows as the only source of manager personnel value; persistent deployment decisions need their own stint ledger.
17. Do not link every future player outcome to the manager; Deployment WPA must match the active role/position and close on removal or role change.
18. Do not double-count the immediate tactical endpoint in both Tactical Manager WPA and Deployment WPA.
19. Do not open default Deployment WPA stints for every starter; starters belong to Lineup Delta unless a later explicit manager decision changes their role.
20. Do not assign Lineup Delta to an optimal lineup just because players underperform; Lineup Delta scores deviations from the Optimal Lineup.
21. Do not compare a chosen starter only against bench players; the Optimal Lineup generator must consider all available roster position players.
22. Do not include starting pitcher choice in Lineup Delta v1.
23. Do not let the user register or replace the game-lock Optimal Lineup after lineup lock.
24. Do not require KBL's trait model to be perfect before shipping; support user-registered SMB4 optimal benchmarks and add trait weights only when tested.
