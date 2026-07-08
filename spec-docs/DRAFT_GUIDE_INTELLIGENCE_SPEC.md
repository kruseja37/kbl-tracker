# Draft Guide Intelligence Spec

Created: 2026-06-30
Status: Product/engine specification
Scope: League Builder MLB auction draft, farm auction draft, scout board calibration, draft guide intelligence, shill/CPU auction context

## 1. Purpose

The draft guide must become a real GM thought partner.

The current guide is not enough if it only says that a team needs a position or that a player is broadly affordable. That is inventory awareness, not draft intelligence.

The target experience is:

> For this GM, this archetype, this board, this roster, this budget, this player, this price, right now, what is the smartest decision and what risk does it create?

The guide must provide asymmetric advice that is useful to one specific GM and not equally useful to every other GM. If the advice is generic, it belongs behind Help or off the main screen.

## 2. Product Problem

The current draft process has several linked failures:

1. The MLB auction guide does not model archetype-specific team building.
2. The guide does not tell the GM what future roster value is being sacrificed by the current bid.
3. The guide does not explain luxury tax impact clearly enough to affect behavior.
4. The guide does not know the GM's personal board or preferred player combinations.
5. The roster widget can imply invalid roles, such as DH, when the league does not use DH.
6. The farm auction has separate, older UI/UX and weaker guidance.
7. Shill/CPU behavior is not visible enough before action.
8. The current hard solvency model can create a bad experience: teams can spend enough early to choke late roster completion, then the engine blocks minimum claims because it is still protecting remaining roster slots.

This spec defines the replacement intelligence model before implementation.

## 3. Non-Negotiable Design Principles

1. The scout must reason from complete roster plans, not isolated player blurbs.
2. Every human GM gets team-specific guidance based on that GM's archetype and board.
3. Every human GM must calibrate the scout board before the draft starts.
4. The scout must know every player in the draft pool.
5. The scout must rank every player overall and by primary position for each GM.
6. The scout must build three complete 22-man optimal plans for each human GM: Conservative, Optimal, Aggressive.
7. The GM must be able to adjust those plans before locking them.
8. The live draft guide must use the locked plans to explain bid risk.
9. The roster widget must display legal roster state honestly. It must not invent a role to make the board look clean.
10. Non-critical tutorial copy belongs behind Help. Scout analysis is allowed to use full explanatory text because that is the feature's value.

## 4. Canonical MLB Roster Model

The MLB auction roster is 22 players:

### 4.1 Starting Position Players

Exactly 8 starting position-player slots:

- C
- 1B
- 2B
- 3B
- SS
- LF
- CF
- RF

### 4.2 Bench Position Players

Exactly 6 bench position-player slots.

Bench slots are not a DH substitute. Bench slots represent roster depth, tactical flexibility, positional coverage, and injury/fatigue protection.

### 4.3 Starting Pitchers

Exactly 4 starting pitcher slots.

Eligible:

- SP
- SP/RP, if player eligibility supports starting usage

### 4.4 Relief Pitchers

Exactly 4 relief pitcher slots.

Eligible:

- SP/RP
- RP
- CP

### 4.5 No DH By Default

There is no DH roster slot unless the league explicitly enables DH rules.

If the league has no DH, the UI must never show DH as a roster need, roster slot, priority gap, or draft guide target.

## 5. Roster Widget Requirements

The roster widget must read player info and display legal fit. It must not move or rename players just to satisfy a visual model.

The widget must show:

- legal filled slots
- legal open slots
- legal bench slots
- legal pitcher roles
- players who qualify for multiple slots
- player currently assigned to a slot
- player who is covering a slot but is weak for that slot
- overflow players
- hard gaps
- soft gaps
- archetype-critical gaps
- non-archetype gaps

Definitions:

- Hard gap: no legal player can cover the role.
- Soft gap: role is legally covered, but below archetype or quality target.
- Archetype-critical gap: missing or weak area directly tied to the team's chosen identity.
- Non-archetype gap: missing or weak area that matters to roster completion but not the main identity.

The widget must not display "DH" unless DH is enabled by league rules.

## 6. Archetype Intelligence Model

Each MLB and farm archetype must be defined as a formal profile.

### 6.1 Archetype Profile

```ts
type DraftPhase = "mlb" | "farm";

type ArchetypeProfile = {
  id: string;
  phase: DraftPhase;
  label: string;
  summary: string;

  primaryRatingGroups: RatingGroupWeight[];
  secondaryRatingGroups: RatingGroupWeight[];
  tertiaryRatingGroups: RatingGroupWeight[];
  lowPriorityRatingGroups: RatingGroupWeight[];

  positionWeights: Record<RosterPositionKey, number>;
  roleWeights: Record<RosterRoleKey, number>;

  budgetBandsByRole: Record<RosterRoleKey, BudgetBand>;
  spendingOrder: RosterRoleKey[];
  acceptableWeaknesses: RosterRoleKey[];
  unacceptableWeaknesses: RosterRoleKey[];

  scarcityMultipliers: Record<RosterPositionKey, number>;
  redundancyPenalties: Record<RatingGroupKey, number>;

  fallbackTolerance: FallbackTolerance;
  taxSensitivity: number;
  volatilityTolerance: number;
};
```

### 6.2 Rating Groups

The system should not reason only from positions. It must reason from rating groups and archetype accumulation.

Possible MLB rating groups include:

- power
- contact
- speed
- fielding
- arm
- rotation_quality
- bullpen_quality
- pitcher_velocity
- pitcher_junk
- pitcher_accuracy
- pitcher_arsenal_depth
- pitcher_role_flexibility
- handedness_balance
- positional_flexibility
- bench_coverage

Possible farm rating groups include:

- future_power
- future_contact
- future_speed
- future_fielding
- future_arm
- future_rotation_depth
- future_bullpen_depth
- future_arsenal_upside
- developmental_upside
- proximity_to_mlb
- stash_value
- succession_value
- archetype_pipeline_fit

### 6.3 Archetype Accumulation

Every team must have a live archetype accumulation model:

```ts
type ArchetypeAccumulation = {
  teamId: string;
  archetypeId: string;
  acquiredPrimaryScore: number;
  acquiredSecondaryScore: number;
  acquiredTertiaryScore: number;
  acquiredLowPriorityScore: number;

  targetPrimaryScore: number;
  targetSecondaryScore: number;
  targetTertiaryScore: number;

  primaryCompletionPct: number;
  secondaryCompletionPct: number;
  tertiaryCompletionPct: number;

  dollarsSpentOnPrimaryFit: number;
  dollarsSpentOnSecondaryFit: number;
  dollarsSpentOnLowPriorityFit: number;
  dollarsSpentOnRedundantValue: number;

  overbuiltGroups: RatingGroupKey[];
  underbuiltGroups: RatingGroupKey[];
  criticalRemainingGroups: RatingGroupKey[];
};
```

The scout must be able to say:

- This player advances your archetype.
- This player advances a non-archetype group.
- This player duplicates value you already have.
- This bid spends archetype money on non-archetype gain.
- This player is useful, but not at a price that damages the core plan.

## 7. Draft Flow

The recommended draft flow is:

1. Select league and teams.
2. Choose MLB archetype for every human-controlled team.
3. Choose farm archetype for every human-controlled team.
4. Configure human teams, CPU teams, and shills.
5. Hire/select scouts.
6. Run Scout Board Calibration for each human GM, one GM at a time.
7. Lock each GM's Conservative, Optimal, and Aggressive MLB plans.
8. Run MLB auction.
9. Run farm Scout Board Calibration or farm plan review.
10. Lock each GM's Conservative, Optimal, and Aggressive farm plans.
11. Run farm auction.
12. Show final roster, farm, budget, luxury tax, and fallback review.
13. Commit to living season.

CPU and shill teams do not run GM board calibration unless a future feature explicitly supports CPU scouting profiles.

## 8. Scout Board Calibration

Scout Board Calibration is a required pre-draft step for every human GM.

The scout generates rankings and three complete roster plans. The GM can adjust rankings and player selections before locking the board.

### 8.1 Required Scout Rankings

For each human GM, the scout must generate:

- overall ranking of every player in the draft pool
- rank by primary position
- rank by legal role
- archetype-fit ranking
- value ranking
- scarcity ranking
- upside ranking
- risk ranking
- tax-drag ranking
- "do not chase past" number
- safe bid
- aggressive bid
- reckless threshold
- alternative targets

The rankings are team-specific. A player can rank differently for different GMs.

### 8.2 Required GM Controls

The GM must be able to:

- reorder the overall board
- reorder position boards
- reorder role boards
- check or uncheck players in each scout plan
- replace a player in a plan
- mark a player as favorite
- mark a player as avoid
- mark a player as value target
- mark a player as conviction target
- add optional notes
- lock the final board

### 8.3 Calibration Table

The calibration table should expose these columns:

```text
Player
Primary Pos
Eligible Roles
Scout Overall Rank
Scout Position Rank
GM Overall Rank
GM Position Rank
Archetype Fit
Projected Cost
Projected Tax
Effective Cost
Conservative Plan
Optimal Plan
Aggressive Plan
Favorite
Avoid
```

Each plan column contains a checkbox.

Checked means:

> This player belongs in my preferred version of this plan.

Unchecked means:

> This player is not part of my preferred version of this plan.

### 8.4 Live Totals During Calibration

As the GM checks and unchecks players, the system recalculates:

- selected players count
- legal roster completion
- position coverage
- role coverage
- salary total
- projected luxury tax total
- effective total cost
- remaining budget
- budget per remaining slot
- archetype accumulation
- rating group accumulation
- redundant value
- underbuilt groups
- overbuilt groups
- hard gaps
- soft gaps
- fallback risk

The GM must immediately see how replacing one player affects the complete roster theory.

## 9. Scout Mock Draft Portfolio

Each human GM receives exactly three scout-generated 22-man plans:

1. Conservative Plan
2. Optimal Plan
3. Aggressive Plan

The three plans are not just labels. They are separate optimized roster portfolios with different risk preferences.

### 9.1 Conservative Plan

Purpose:

Protect roster completion, budget flexibility, and tax control.

Behavior:

- avoids early overpays
- protects minimum viable role coverage
- values depth and flexibility
- avoids thin bench construction
- avoids severe luxury tax drag
- prefers players with stable cost/value profiles
- accepts lower ceiling to prevent late-draft choke points

The scout can say:

> This bid keeps your Conservative plan alive.

Or:

> Past this price, the Conservative plan breaks because you lose the budget needed for SP depth and bench coverage.

### 9.2 Optimal Plan

Purpose:

Build the best balanced roster for the chosen archetype.

Behavior:

- maximizes expected team identity
- prioritizes archetype-critical players
- protects roster balance
- accepts moderate tax when justified
- preserves enough flexibility for auction variance
- values best overall expected outcome

The scout can say:

> This player is central to your Optimal plan.

Or:

> This bid breaks Conservative but keeps Optimal alive.

### 9.3 Aggressive Plan

Purpose:

Chase ceiling.

Behavior:

- spends harder on archetype-defining players
- accepts higher tax
- accepts thinner bench outcomes
- accepts more farm/replacement fallback risk
- prioritizes scarce stars
- can tolerate more redundancy if the ceiling gain is high

The scout can say:

> Past this number, only the Aggressive plan still works.

Or:

> This is an Aggressive-plan bid. It is defensible, but it likely costs you one preferred bench bat and pushes the bullpen into fallback territory.

### 9.4 Plan Locking

Each plan must be locked before the auction begins.

Locking records:

- selected player IDs
- GM-adjusted rankings
- plan-specific player checkboxes
- plan salary total
- plan projected tax total
- plan effective cost
- plan archetype accumulation
- plan position coverage
- plan risk profile
- GM notes and tags

Locked plans become scout memory for live auction guidance.

## 10. Roster Optimizer

The scout portfolio must be generated by a roster optimizer, not by greedy isolated rankings.

### 10.1 Optimizer Inputs

```ts
type DraftOptimizerInput = {
  phase: DraftPhase;
  teamId: string;
  leagueId: string;
  archetype: ArchetypeProfile;
  players: DraftPoolPlayer[];
  budget: number;
  taxRules: LuxuryTaxRules;
  rosterModel: RosterModel;
  existingRoster?: Player[];
  estimatedMarket: EstimatedMarket;
  competingTeams: CompetingTeamProfile[];
  shillProfiles: ShillProfile[];
  gmPreferences?: GmDraftPreferences;
};
```

### 10.2 Optimizer Output

```ts
type DraftOptimizerOutput = {
  teamId: string;
  phase: DraftPhase;
  plans: {
    conservative: DraftPlan;
    optimal: DraftPlan;
    aggressive: DraftPlan;
  };
  rankings: DraftRankingSet;
  generatedAt: string;
  modelVersion: string;
};
```

### 10.3 Draft Plan

```ts
type DraftPlan = {
  id: "conservative" | "optimal" | "aggressive";
  label: string;
  playerIds: string[];
  slotAssignments: RosterSlotAssignment[];
  salaryTotal: number;
  projectedLuxuryTax: number;
  effectiveTotalCost: number;
  remainingBudget: number;
  archetypeScore: number;
  rosterBalanceScore: number;
  scarcityScore: number;
  riskScore: number;
  completionProbability: number;
  archetypeCompletionProbability: number;
  fallbackRisk: number;
  notes: DraftPlanNote[];
};
```

### 10.4 Objective Function

The optimizer should maximize:

```text
total_score =
  archetype_utility
+ player_value
+ positional_scarcity
+ role_fit
+ roster_balance
+ gm_preference_weight
+ future_option_value
- estimated_salary_cost
- marginal_tax_drag
- redundancy_penalty
- roster_completion_risk
- fallback_risk
- volatility_penalty
```

Each plan uses different weights.

Conservative:

- higher penalty for cost
- higher penalty for tax
- higher penalty for incomplete roster risk
- higher value for flexibility

Optimal:

- balanced weights
- strongest emphasis on archetype-adjusted team quality
- moderate risk tolerance

Aggressive:

- lower penalty for tax
- lower penalty for incomplete bench risk
- higher value for scarcity and ceiling
- higher tolerance for concentration of spend

### 10.5 Hard Constraints

The optimizer must never output an invalid plan.

Hard constraints:

- exactly 22 MLB players for MLB plans
- exactly the configured farm roster target for farm plans
- legal roster slot eligibility
- no DH unless enabled
- no duplicate player IDs
- player must exist in draft pool
- plan must show if it exceeds budget or relies on fallback

Budget overage is allowed only if explicitly marked as fallback-dependent or impossible under current rules. The UI must not present an over-budget plan as cleanly executable.

## 11. Player Evaluation

### 11.1 Player Fit Score

```text
player_fit_score =
  raw_value_score
+ archetype_rating_score
+ position_need_score
+ role_need_score
+ scarcity_score
+ replacement_gap_score
+ roster_flexibility_score
+ gm_preference_score
- redundancy_penalty
- tax_drag_penalty
- cost_risk_penalty
```

### 11.2 Replacement Gap

Replacement gap measures the difference between this player and the realistic next-best alternative for the same role in this team's plan.

The scout must be able to say:

> If you lose this player, the best remaining substitute is X, who preserves 82% of the archetype value at an estimated $Y.

### 11.3 Redundancy Penalty

A player loses value if he or she adds value to a rating group the team has already overbuilt.

The scout must be able to say:

> This is a good player, but most of the value is in a group you have already covered.

No individual-player copy should use neutral "they" pronouns when gender is known. Use he/him or she/her based on player gender.

## 12. Estimated Market Model

The scout needs an estimated cost for every player.

Estimated cost should consider:

- player IV / value
- archetype-adjusted demand
- positional scarcity
- number of teams needing the role
- team budgets
- shill count
- shill personalities
- CPU team archetypes
- remaining pool depth
- expected tax drag
- early/mid/late auction timing

```ts
type EstimatedPlayerCost = {
  playerId: string;
  medianPrice: number;
  lowPrice: number;
  highPrice: number;
  volatility: number;
  expectedCompetitionTeams: string[];
  shillPressure: number;
  taxAdjustedEffectiveCost: number;
};
```

## 13. Luxury Tax Intelligence

The scout must show luxury tax impact every time a bid is considered.

### 13.1 Required Tax Outputs

For the current player and current bid:

- current bid
- projected salary if won
- marginal tax from winning this player
- total projected tax after winning
- effective cost: bid plus marginal tax
- remaining budget after effective cost
- tax effect on Conservative plan
- tax effect on Optimal plan
- tax effect on Aggressive plan

### 13.2 Tax Language

The scout should not say only:

> Affordable.

The scout should say:

> At $42k, the true cost is about $49k after tax. That keeps Optimal alive but breaks Conservative because you lose the budget cushion for one bullpen slot.

### 13.3 Real Consequences Of Archetype Drift

Going against archetype must be explained as a real budget consequence, not as vague flavor.

The product language is:

> Going against archetype does not make the player worse. It makes the player more expensive for this team.

The scout must communicate five consequences:

1. Higher effective cost

   A $40k player might behave like a $70k player after tax.

2. Lower future bid power

   The tax eats money the GM needs for later players.

3. Plan breakage

   Conservative might break first, then Optimal, leaving only Aggressive alive.

4. Roster squeeze

   The GM may still win the player, but now needs cheaper bench, pitching, or farm fallback later.

5. Hidden tradeoff

   Without a good scout, the GM thinks:

   > I bought a $38k pitcher.

   The truth may be:

   > I bought a $38k pitcher and accidentally burned $60k of future flexibility.

The scout should say this plainly.

Example:

> This bid is legal, but not clean. His salary is $38k; his true Bash Brothers cost is closer to $80k because command pitching is taxed hard in your build.

This is the standard for tax language. The guide must translate every major off-archetype bid into true cost, future bid power, plan survival, and roster squeeze.

## 14. Bid Impact Model

Every bid option should be evaluated as a scenario.

```ts
type BidImpact = {
  teamId: string;
  playerId: string;
  bidAmount: number;
  marginalTax: number;
  effectiveCost: number;
  remainingBudget: number;
  remainingSlots: number;
  budgetPerRemainingSlot: number;
  affectedPlans: PlanImpact[];
  rosterCompletionProbability: number;
  archetypeCompletionProbability: number;
  likelySacrificedTargets: SacrificedTarget[];
  bestFallbackPath: FallbackPath;
  riskBand: BidRiskBand;
  scoutSummary: string;
};
```

Risk bands:

- Safe
- Aggressive
- Reckless
- Emergency
- Blocked

Definitions:

- Safe: preserves legal roster and at least Conservative or Optimal plan.
- Aggressive: breaks Conservative but preserves Optimal or Aggressive with manageable risk.
- Reckless: likely sacrifices priority targets or forces fallback.
- Emergency: only justified for a uniquely archetype-defining player.
- Blocked: truly impossible under cash/tax rules.

The engine should not hard-block a risky but possible bid. It should hard-block only true impossible states.

## 15. Auction Simulation

The scout should simulate the rest of the auction from the current state.

### 15.1 Simulation Inputs

- remaining player pool
- current team rosters
- team budgets
- team tax state
- team archetypes
- locked GM plans
- CPU profiles
- shill profiles
- current market prices
- roster gaps
- nomination order

### 15.2 Simulation Outputs

- probability of completing roster
- probability of completing Conservative plan
- probability of completing Optimal plan
- probability of completing Aggressive plan
- probability of preserving archetype advantage
- expected remaining tax
- expected fallback need
- likely future regret point
- best next targets
- bid ceilings by risk band

The scout does not need perfect prophecy. It needs enough modeling to explain meaningful risk.

## 16. Live Auction Scout Insight

The live auction UI should have two layers:

1. Compact critical view
2. Expanded Scout Insight

### 16.1 Compact Critical View

The compact view should show only:

- player name
- position/eligibility
- team on the clock
- current bid
- true/effective cost
- plan impact
- recommended cap
- current risk band
- one-line scout reason

Example:

```text
Optimal target. Safe to $38k. Past $44k, only Aggressive survives.
```

### 16.2 Expanded Scout Insight

The expanded insight is allowed to use full explanatory text.

Example:

```text
At $42k, Freely's true cost is about $49k after projected tax.
He is in your Optimal and Aggressive plans, but not Conservative.
Winning him here keeps your power build intact, but it probably costs you
your preferred SP3 target. Scout cap: $38k. GM conviction cap: $44k.
```

Scout insight is not tutorial copy. It is the reason the scout exists.

## 17. GM Preference Memory

GM edits become persistent preference signals.

### 17.1 GM Preference Signals

```ts
type GmDraftPreferences = {
  teamId: string;
  phase: DraftPhase;
  overallRankOverrides: RankOverride[];
  positionRankOverrides: RankOverride[];
  checkedPlanPlayers: Record<DraftPlanId, string[]>;
  uncheckedScoutPlayers: Record<DraftPlanId, string[]>;
  favorites: string[];
  avoids: string[];
  convictionTargets: string[];
  valueTargets: string[];
  notesByPlayerId: Record<string, string>;
  lockedAt: string | null;
};
```

### 17.2 Auction Usage

During the auction, the scout must reference:

- scout ranking
- GM ranking
- scout plan inclusion
- GM plan inclusion
- favorites
- avoids
- conviction targets
- plan substitutions

Example:

```text
Scout ranked her 18th, but you moved her to 4th and kept her in all three plans.
This is a GM-conviction bid. $46k is aggressive but consistent with your board.
```

Example:

```text
You removed him from all three plans. Scout sees value at this price, but this
would move you away from your locked roster theory.
```

## 18. Farm Draft Intelligence

Farm draft uses the same intelligence shell but different evaluation.

### 18.1 Farm Priorities

Farm scout analysis should consider:

- developmental upside
- future archetype fit
- positional succession
- blocked path risk
- stash value
- estimated time to MLB usefulness
- replacement/fallback utility
- farm roster balance
- pipeline scarcity
- future salary/value projection

### 18.2 Farm Plans

Each human GM receives:

- Conservative Farm Plan
- Optimal Farm Plan
- Aggressive Farm Plan

Farm Conservative:

- protects broad pipeline coverage
- avoids over-concentration
- favors closer-to-useful prospects

Farm Optimal:

- balances future archetype fit, upside, and coverage

Farm Aggressive:

- chases high-upside prospects and scarce future advantages

### 18.3 Farm Shills

Farm auction should inherit or persist MLB draft shill settings unless the user explicitly changes them.

Farm shills should be visible draft entities:

- included in turn order
- visible in read-only decision preview
- able to win players
- shown on a shill roster
- excluded from living-season transfer

If a farm shill wins a player, that player is effectively locked out of the human/CPU league transfer, similar to a passed or unavailable player, while still remaining visible for draft context.

## 19. Shill And CPU Behavior

Shills and CPU teams must be shown before their action resolves.

### 19.1 Required Preview

Before advancing a shill or CPU action, the UI should show:

- team/shill name
- personality
- intended action
- intended bid or pass
- reason
- target plan/role if applicable
- whether the action pressures the current GM's plans

The user can advance the action but cannot change it.

### 19.2 Shill Profiles

Shill profiles should include:

- Conservative
- Balanced
- Aggressive
- Chaotic

The current experience should not feel like every shill is conservative.

Shills should not always bid only the minimum legal bid. Their pressure model should consider:

- player value
- player scarcity
- auction phase
- current price vs valuation
- whether humans are likely underpricing a player
- shill personality
- shill budget
- roster slots remaining

## 20. Soft Risk Economy

The draft economy should distinguish between:

1. Hard impossible state
2. Risky but allowed state
3. Safe state

### 20.1 Hard Block

Hard block only when a bid is truly impossible, such as:

- team cannot pay the bid
- team cannot pay immediate tax/cost if tax is charged immediately
- invalid player
- invalid auction state

### 20.2 Risk Warning

Risky but possible bids should be allowed with clear warning.

Examples:

- bid breaks Conservative plan
- bid breaks Conservative and Optimal
- bid requires farm fallback
- bid leaves a hard position gap likely unresolved
- bid pushes tax beyond planned tolerance

The scout should state the consequence instead of silently blocking.

### 20.3 Fallback Handling

If the product rule allows MLB roster gaps to be filled through farm/replacement fallback, the scout must show that explicitly.

Example:

```text
This bid probably forces one MLB bench slot into farm fallback.
```

If fallback is not allowed, the optimizer and auction engine must enforce complete MLB roster feasibility more strictly.

## 21. Persistence Requirements

The system must persist:

- archetype selection
- scout identity
- scout generated rankings
- GM ranking overrides
- GM checked/unchecked plan choices
- locked plan totals
- locked plan player IDs
- player tags
- player notes
- plan version
- optimizer model version
- generated timestamp
- shill settings
- farm shill settings

Saved auction resumes must use the same locked board and plan memory that existed when the auction began, unless the user intentionally restarts/rebuilds the draft plan.

## 22. UI Requirements

### 22.1 Main Draft UI

The live auction surface must prioritize:

- player up for bid
- current team/GM lens
- current bid
- bid buttons
- plan impact
- true cost/tax
- roster widget
- scout insight
- team/shill turn context

Non-critical explanatory text belongs behind Help.

### 22.2 Board Calibration UI

The board calibration screen must support:

- one human GM at a time
- clear team identity and colors
- scout-generated rankings
- Conservative/Optimal/Aggressive plan columns
- checkboxes for plan inclusion
- drag/reorder where practical
- immediate totals
- plan lock
- next GM flow

### 22.3 Archetype Accumulation UI

The UI should show:

- primary archetype meter
- secondary support meter
- non-archetype spend meter
- redundant value warning
- remaining pool value for critical groups
- plan survival state

Do not use long tutorial text in this section. Let the visual model carry the basics. Full analysis belongs in Scout Insight.

## 23. Example Scout Lines

Good:

```text
Safe to $34k. At $40k, Conservative breaks but Optimal survives.
```

Good:

```text
She is your top remaining CF in the Optimal plan. Winning her also protects two bench routes.
```

Good:

```text
He adds power, but you are already above target there. The bigger need is SP depth.
```

Good:

```text
At this bid, the true cost is $51k with tax. That likely removes your preferred RP pair.
```

Bad:

```text
You need a catcher.
```

Bad:

```text
Affordable.
```

Bad:

```text
Good fit.
```

Bad:

```text
They would help your team.
```

Use he/him or she/her for individual players when gender is known.

## 24. Implementation Phases

### Phase 1: Spec And Data Foundation

- define canonical roster model
- remove DH from non-DH league draft model
- define archetype profiles
- define rating group taxonomy
- define ranking data structures
- define locked GM board persistence
- define plan persistence

### Phase 2: Offline Scout Optimizer

- generate player rankings by GM
- generate Conservative/Optimal/Aggressive plans
- calculate estimated salary/tax totals
- calculate archetype accumulation
- calculate position coverage
- add tests for optimizer validity

### Phase 3: GM Board Calibration UI

- add calibration route after scout hire and before auction
- show rankings and plan checkboxes
- support GM adjustments
- recalculate totals live
- lock each GM's board
- route through all human GMs

### Phase 4: Live MLB Auction Intelligence

- connect locked plans to live auction
- replace shallow guide with plan-aware insight
- show bid impact and tax impact
- show plan survival states
- show archetype accumulation
- add CPU/shill preview context

### Phase 5: Farm Auction Parity

- move farm auction onto shared auction stage shell
- inherit or persist shill settings
- add farm-specific scout optimizer
- add farm plan calibration
- add farm scout insight
- exclude shill wins from season transfer

### Phase 6: Simulation And Advanced Market Modeling

- simulate remaining auction
- estimate plan survival probability
- estimate roster completion probability
- estimate future sacrificed targets
- tune market model against observed auction outcomes

## 25. Test Requirements

Tests must cover:

- no DH slot when DH is disabled
- legal 22-man MLB roster construction
- Conservative plan completes roster under safe assumptions
- Optimal plan completes roster and improves archetype score
- Aggressive plan can accept higher risk but must label it
- every player gets overall rank for each human GM
- every player gets primary-position rank where eligible
- GM checked/unchecked changes update salary total
- GM checked/unchecked changes update tax total
- GM checked/unchecked changes update archetype accumulation
- locked board persists into auction
- auction insight references locked plans
- bid impact changes plan survival state
- marginal tax appears in bid impact
- shill/CPU decision preview is read-only
- farm auction inherits or persists shill settings
- shill wins are visible but excluded from living-season transfer
- individual player copy uses gendered pronouns when gender is known

## 26. Acceptance Criteria

The feature is successful only if a GM can answer:

- Why does this player help my archetype?
- Is this value archetype-critical or just generally useful?
- What price becomes dangerous?
- Which future players might I lose by bidding?
- How much does tax change the true cost?
- Which of my three locked plans does this preserve?
- Which of my three locked plans does this break?
- What is my best fallback if I lose this player?
- Am I building my intended team or drifting?
- What is the CPU/shill team about to do and why?
- What did my scout want, and what did I override?

If the guide cannot answer those questions, it is not complete.

## 27. Anti-Goals

Do not:

- polish the existing shallow guide and call it solved
- use generic advice as main-screen content
- treat position gaps as the whole intelligence model
- force DH into non-DH leagues
- hide tax impact inside a max-bid number
- let shills silently act without preview
- let farm auction remain a separate old UI indefinitely
- produce scout plans from simple top-N rankings
- ignore GM board edits once the auction starts

## 28. Open Product Decisions

These rulings should be confirmed before implementation:

1. Can MLB teams knowingly spend past the safe-fill number if warned?
2. If a team cannot fill all MLB slots from auctioned MLB players, should farm/replacement fallback be allowed?
3. Should shill settings always carry from MLB auction into farm auction by default?
4. Should each GM calibrate farm boards separately, or should farm use a quicker review of scout-generated plans?
5. Should CPU teams receive hidden archetype plans for more realistic bidding?
6. Should the scout expose exact formulas to the GM, or only the resulting recommendations?

Recommended initial rulings:

1. Yes, allow risky but possible overspending with clear risk language.
2. Yes, allow fallback only if surfaced as a real consequence.
3. Yes, carry shill settings unless explicitly changed.
4. Start with a quicker farm review, then expand if needed.
5. Yes, CPU teams should eventually get hidden plans.
6. Show plain-language recommendations first; formulas can remain in Help or debug views.
