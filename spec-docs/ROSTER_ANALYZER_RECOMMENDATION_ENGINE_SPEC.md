# Roster Analyzer Recommendation Engine Spec

Wave F0: read-only planning artifact.

This document designs a shared roster analyzer/recommendation engine for Builder and Franchise surfaces. It does not implement app code, UI, roster mutations, call-up/send-down execution, or offseason adapters.

## 1. Executive Summary

### What The Analyzer Should Do

The roster analyzer should produce deterministic, explainable, read-only reports about a team or league roster:

- Validate roster construction, position coverage, pitching staff coverage, lineups, rotations, bullpen roles, depth charts, and pitch arsenals.
- Compare team strengths and weaknesses against app-native team profile logic.
- Surface advisory salary/value, trait, chemistry, and luxury-cap findings where data is available.
- Recommend non-executable roster improvements with evidence, trust level, and caveats.
- Support Builder mode and Franchise mode from the same pure engine, with separate read adapters.

The MVP should make the user better informed, not more automated. Recommendations should say what appears weak, why, and what data supports the claim. They should not move players, edit rosters, save lineups, execute call-ups, trigger send-downs, alter salaries, or mutate offseason state.

### Why It Should Be Shared Across Builder And Franchise

Builder and Franchise need the same baseball questions answered from different storage contexts:

- Builder owns template/player-pool/league roster construction data through League Builder storage and UI hooks. The current Builder page already has a single-player "Player Analyzer" tab (`src/src_figma/app/pages/Builder.tsx:67`, `src/src_figma/app/pages/Builder.tsx:147-152`) and League Builder roster editing surfaces (`src/src_figma/app/pages/LeagueBuilderRosters.tsx:33`, `src/src_figma/app/pages/LeagueBuilderRosters.tsx:540-566`).
- Franchise owns copied player/team roster data in per-franchise storage (`src/utils/franchisePlayerStorage.ts:116-160`, `src/utils/franchisePlayerStorage.ts:162-244`) and scoped farm state (`src/utils/franchiseFarmStorage.ts:7-21`, `src/utils/franchiseFarmStorage.ts:84-102`).
- Shared logic reduces drift between pre-franchise roster construction and in-franchise roster evaluation, while adapters preserve the Pass 1-6 scoped-global hybrid and no-template-mutation boundaries.

### What Must Stay Read-Only For MVP

For MVP, the analyzer must be a pure function over plain DTOs:

- No imports from storage writer APIs.
- No calls to `saveFranchisePlayer`, `saveFranchiseTeam`, `saveFranchiseFarmRecord`, `sendDownFranchisePlayer`, `callUpFranchisePlayer`, `saveTeamRoster`, or League Builder mutation APIs.
- No automatic roster application, lineup application, call-up/send-down execution, salary recalculation, draft/free-agent/trade execution, or offseason phase advancement.
- No durable records written from the engine.

Repo evidence for mutation paths that must remain outside the analyzer:

- Franchise player/team writes exist in `saveFranchisePlayer` and `saveFranchiseTeam` (`src/utils/franchisePlayerStorage.ts:176-203`, `src/utils/franchisePlayerStorage.ts:229-244`).
- Franchise farm writes exist in `saveFranchiseFarmRecord` and `deleteFranchiseFarmRecord` (`src/utils/franchiseFarmStorage.ts:115-145`, `src/utils/franchiseFarmStorage.ts:175-190`).
- Durable roster movement executes player/farm/transaction writes (`src/utils/franchiseRosterMovement.ts:74-144`, `src/utils/franchiseRosterMovement.ts:146-188`).
- League Builder roster writes are exposed through Builder roster surfaces (`src/src_figma/hooks/useLeagueBuilderData.ts:411-424`, `src/src_figma/app/pages/LeagueBuilderRosters.tsx:279-291`).

### Explicitly Out Of Scope

- UI implementation.
- Roster mutations or "apply recommendation" buttons.
- Call-up/send-down execution wiring.
- Offseason adapter expansion.
- Production import writes.
- Full spreadsheet parity.
- Full salary-system replacement.
- Farm morale/narrative/mechanical-effect algorithms.
- Roster analyzer model tuning against large historical datasets.
- Any recommendation based on deferred/prototype systems as if they were durable franchise truth.

## 2. Spreadsheet Logic Mapping

Source workbook: `/Users/johnkruse/Downloads/XBL Test Texas Rangers.xlsx`.

Workbook inspection used data-only and formula views. External workbook links and `IMPORTRANGE`-style formulas should be treated as source concepts, not executable app dependencies.

| Spreadsheet concept | Evidence | Classification | App treatment | Why |
| --- | --- | --- | --- | --- |
| Salary curves by position/rating | `Salary Cap!A1:H18`, formulas and data for min, curve 1, mid, mid salary, curve 2, rating 100 caps | Adapt to app-native model | Use existing salary engine as the canonical salary estimator. Add analyzer findings for salary/value outliers only when units and inputs are trustworthy. | The app already has a salary model with rating weights, position multipliers, trait impacts, age, performance, fame, personality, and true-value concepts (`src/engines/salaryCalculator.ts:1-26`, `src/engines/salaryCalculator.ts:79-130`, `src/engines/salaryCalculator.ts:194-214`). Direct formula port would conflict with existing salary architecture. |
| Luxury caps by role/rating bucket | `Luxury Cap!A1:AR18`, including hitter/SP/RP caps, top-N rating caps, and penalty/100 | Adapt to app-native model | Implement as optional analyzer constraints/presets. Builder may later choose strict import-blocking mode; Franchise MVP should be advisory only. | The workbook rules are league-specific and useful, but app specs defer several economic systems. Hard-coding them globally would overfit one workbook. |
| Luxury cap modifiers by traits | `Luxury Cap!AT1:BE18`, category modifiers for POW/CON/SPD/FLD/ARM and pitcher ratings | Defer initially; adapt later | Preserve as future preset-config concept. MVP may report "trait modifier model unavailable" rather than calculate exact adjusted caps. | Requires stable trait taxonomy and salary/luxury policy decisions before becoming a hard rule. |
| Trait constraints and stat effects | `ImportedTraits!A1:AO30`, `Traits!A1:BC12`, max uses per position/role, min/max attribute limits, salary multipliers | Adapt to app-native model | MVP can validate trait presence/count/distribution when app-native trait fields exist. Exact chemistry-level stat deltas and salary multipliers should be deferred unless encoded as analyzer config. | Builder already tracks trait1/trait2 and chemistry/personality inputs (`src/utils/leagueBuilderStorage.ts:150-180`, `src/src_figma/app/pages/Builder.tsx:154-245`). The spreadsheet contains richer rules than the current app model. |
| Chemistry constraints | `Roster!BN1:CG18`, `Lists!ChemistryTypes`, chemistry rows for Crafty/Competitive/Disciplined/Scholarly/Spirited | Adapt to app-native model | MVP should report chemistry distribution and missing/overrepresented categories as advisory. Do not use deferred fan morale or narrative systems as durable truth. | Chemistry exists on player records, but downstream durable morale/flavor systems remain guarded/deferred in franchise audits. |
| Pitching arsenal constraints | `PitchCalcs!A1:AB70`, `Lists!Pitches`, Builder arsenal validation | Port/adapt directly for v1 legality checks | Reuse app-native pitch arsenal rules: pitchers need valid pitch types, max pitch count, and fastball/offspeed coverage. | Builder already enforces max pitch count and fastball/offspeed requirements (`src/src_figma/app/pages/Builder.tsx:405-413`), so this is safe for shared validation. |
| Pitch arsenal salary/value effects | `PitchCalcs!A1:AB70`, pitch cost columns and VEL/JNK/ACC salary columns | Defer | Add optional future config for pitch portfolio valuation. MVP should not claim exact salary effects. | App salary engine currently weighs pitcher ratings, not detailed pitch-cost composition (`src/engines/salaryCalculator.ts:194-214`). |
| Bench/farm/cut-line implications | `Bench!A1:K70`, traitless salary and cutoff salary rows | Adapt to app-native model | MVP can flag roster surplus/shortage, bench coverage, farm candidates, and eligibility caveats. It must not execute movement. | Franchise farm state is scoped and read-capable (`src/utils/franchiseFarmStorage.ts:147-173`), but movement writers and Phase 11 locks are separate guarded systems. |
| League settings and required trait counts | `LeagueSettings!A1:G30`, required negative/positive trait counts, min salary by position, stadium settings | Adapt as configurable preset | MVP should accept optional config for hard/advisory constraints. Defaults should be conservative. | These are league-policy settings, not universal app truth. |
| Spreadsheet formulas, links, helper tabs, import mechanics | `Link`, `DynamicDropdown`, external workbook formulas | Reject as implementation dependency | Do not port spreadsheet dependency mechanics. Extract concepts into typed config only. | The app should be deterministic and local; external spreadsheet linkage would be brittle. |

## 3. Repo Fit

### Proposed Engine Location

Recommended pure engine files:

- `src/engines/rosterAnalyzerEngine.ts`
- `src/engines/rosterAnalyzerTypes.ts` or colocated types in the engine file
- `src/engines/__tests__/rosterAnalyzerEngine.test.ts`

Recommended adapter files for later phases:

- `src/utils/rosterAnalyzerBuilderAdapter.ts`
- `src/utils/rosterAnalyzerFranchiseAdapter.ts`
- `src/utils/tests/rosterAnalyzerFranchiseAdapter.test.ts`

The core engine should live with other domain engines because it should be independent from React and storage. Existing app-native engines include team profile, SMB4 grade, player generation, and salary logic (`src/engines/smb4TeamProfileEngine.ts:176-260`, `src/engines/smb4GradeEmulator.ts:25-68`, `src/engines/smb4PlayerGenerator.ts:21-75`, `src/engines/salaryCalculator.ts:79-130`).

### Data Inputs From Builder

Builder adapters can use already-loaded Builder state, then pass plain DTOs to the engine:

- League/team/player/rules state from `useLeagueBuilderData` (`src/src_figma/hooks/useLeagueBuilderData.ts:71-120`, `src/src_figma/hooks/useLeagueBuilderData.ts:127-161`).
- Player fields including ratings, arsenal, traits, chemistry, salary, contract, morale, mojo, fame, and league assignments (`src/utils/leagueBuilderStorage.ts:150-180`).
- Team roster structure including MLB roster, farm roster, lineups, rotation, bullpen roles, depth chart, pinch orders, and optimal-lineup snapshots (`src/utils/leagueBuilderStorage.ts:250-268`).
- League-specific player overrides and effective attributes where available (`src/utils/leagueBuilderStorage.ts:193-217`, `src/utils/leagueBuilderStorage.ts:898-960`).
- Existing Builder generated-player and player-analysis inputs (`src/src_figma/app/pages/Builder.tsx:294-312`, `src/src_figma/app/pages/Builder.tsx:456-526`).

Builder adapter boundary:

- The analyzer may read data that Builder surfaces already have in memory.
- The engine must not call `saveTeamRoster`, `createPlayer`, `updatePlayer`, `deletePlayer`, or any other Builder mutation.
- Later Builder UI may choose to block imports based on analyzer findings, but that is a surface decision outside the pure engine.

### Data Inputs From Franchise

Franchise adapters must read franchise-owned/scoped data only:

- Franchise teams and players through `getFranchiseTeam`, `getAllFranchiseTeams`, `getFranchisePlayer`, and `getAllFranchisePlayers` (`src/utils/franchisePlayerStorage.ts:162-244`).
- Franchise farm records through `getFranchiseFarmRecord` and `getFranchiseFarmRoster` (`src/utils/franchiseFarmStorage.ts:147-173`).
- Active MLB eligibility compatible with GameTracker launch filtering (`src/src_figma/app/utils/franchiseGameTrackerRoster.ts:31-39`, `src/src_figma/app/utils/franchiseGameTrackerRoster.ts:196-260`).
- TeamHub's franchise-owned player/stat rows (`src/src_figma/app/components/TeamHubContent.tsx:162-183`, `src/src_figma/app/components/TeamHubContent.tsx:454-491`, `src/src_figma/app/components/TeamHubContent.tsx:543-570`).
- Season stats only when scoped by canonical franchise season identity, as established by prior Pass 1-5 work.

Franchise adapter boundary:

- No League Builder/global template fallback in healthy franchise context.
- No movement writers.
- No player/team saves.
- No offseason mutation functions.
- Recommendations that mention call-up/send-down must be advice-only and cite the missing execution boundary.

### Existing Utilities To Reuse

| Utility | Evidence | Analyzer use |
| --- | --- | --- |
| `optimalLineup` | Snapshot input and comparison types (`src/utils/optimalLineup.ts:46-77`), stale/official helpers (`src/utils/optimalLineup.ts:112-198`), snapshot builder (`src/utils/optimalLineup.ts:229-302`), comparison helpers (`src/utils/optimalLineup.ts:343-416`) | Reuse for lineup comparison, lineup-quality findings, and explainable "current vs optimal" suggestions. |
| `pregameLineupBenchmarks` | Benchmark status and issue model (`src/src_figma/app/utils/pregameLineupBenchmarks.ts:18-63`), current-lineup benchmark builder (`src/src_figma/app/utils/pregameLineupBenchmarks.ts:105-180`) | Reuse or mirror for lineup readiness checks in GameTracker-adjacent advice. |
| `franchiseGameTrackerRoster` | Active eligibility and roster readiness checks (`src/src_figma/app/utils/franchiseGameTrackerRoster.ts:31-39`, `src/src_figma/app/utils/franchiseGameTrackerRoster.ts:102-168`) | Reuse concepts for active MLB filtering and game-readiness findings. |
| `smb4TeamProfileEngine` | Team profile calculation and comparison (`src/engines/smb4TeamProfileEngine.ts:176-260`) | Reuse for Builder league balance and Franchise team strengths/weaknesses. |
| `smb4GradeEmulator` | Player input normalization and grade explanation (`src/engines/smb4GradeEmulator.ts:25-68`, `src/engines/smb4GradeEmulator.ts:118-163`) | Reuse for player quality explanations when SMB4-like grades are needed. |
| `salaryCalculator` | Salary model comments/types/weights (`src/engines/salaryCalculator.ts:1-26`, `src/engines/salaryCalculator.ts:79-130`, `src/engines/salaryCalculator.ts:194-214`) | Reuse for salary/value advisory findings where input units are known. |
| Franchise farm storage | Scoped farm record identity and read APIs (`src/utils/franchiseFarmStorage.ts:7-21`, `src/utils/franchiseFarmStorage.ts:147-173`) | Read farm state for advice-only farm depth and eligibility findings. |

### Existing Data Gaps

- Salary unit consistency is not guaranteed between spreadsheet concepts, stored Builder player salaries, and `salaryCalculator` outputs.
- Spreadsheet chemistry/trait salary modifiers are not encoded as a durable app-native ruleset.
- Fan morale, farm narrative hooks, adaptive standards, and some park-factor systems remain placeholder/deferred or scoped as flavor systems, not reliable roster-analysis inputs.
- Phase 11 final 22/10/32 roster lock validation is not yet a durable analyzer dependency.
- Franchise roster movement writers exist, but prior audits still note atomicity and phase-context risks before mutation-capable workflows.
- Career stats and milestones remain deferred from some save/export lifecycles until canonically scoped.
- Offseason adapter systems are intentionally guarded/prototype-only, so analyzer recommendations must not assume FA/draft/trade execution is available.

### Avoiding League Builder Mutation In Franchise Context

The analyzer should follow a strict layering rule:

1. UI/page/hook loads data from the correct domain.
2. A domain adapter converts that data into plain analyzer DTOs.
3. The pure engine returns a report.
4. UI renders the report.

The pure engine must not know how data was loaded or how it could be saved. Franchise adapters must use franchise-owned reads only. Builder adapters may use Builder-loaded state, but should not write. This keeps the analyzer compatible with the scoped-global hybrid decision and protects Franchise from League Builder/template mutation.

## 4. Engine Design

### TypeScript Interfaces

The following interfaces describe the intended engine contract. Names can be adjusted during implementation, but the shape and read-only boundary should hold.

```ts
export type RosterAnalyzerMode = "builder" | "franchise";

export type RosterAnalyzerSurface =
  | "builder_team"
  | "builder_league"
  | "franchise_team_hub"
  | "franchise_home"
  | "game_prep";

export type AnalyzerSeverity = "blocker" | "critical" | "warning" | "info";

export type AnalyzerTrustLevel = "high" | "medium" | "low" | "unavailable";

export type ConstraintDisposition = "hard" | "advisory" | "disabled";

export type RecommendationExecution = "read_only" | "blocked_future_work";

export interface AnalyzerIdentity {
  mode: RosterAnalyzerMode;
  surface: RosterAnalyzerSurface;
  leagueId?: string;
  teamId: string;
  franchiseId?: string;
  seasonId?: string;
  seasonNumber?: number;
  statsScopeId?: string;
  generatedAt: string;
}

export interface AnalyzerPlayer {
  id: string;
  name: string;
  teamId?: string;
  leagueId?: string;
  primaryPosition: string;
  secondaryPositions?: string[];
  bats?: "L" | "R" | "S";
  throws?: "L" | "R";
  isPitcher?: boolean;
  rosterStatus?: "MLB" | "FARM" | "FREE_AGENT" | "RELEASED" | "RETIRED" | "INACTIVE" | "UNASSIGNED";
  rosterLevel?: "MLB" | "FARM";
  ratings: {
    power?: number;
    contact?: number;
    speed?: number;
    fielding?: number;
    arm?: number;
    velocity?: number;
    junk?: number;
    accuracy?: number;
  };
  arsenal?: string[];
  traits?: string[];
  chemistry?: string;
  personality?: string;
  mojo?: string;
  fitness?: string;
  salary?: number;
  contractYears?: number;
  age?: number;
  handedLineupRole?: "vsL" | "vsR" | "both";
  optionState?: AnalyzerFarmOptionState;
  stats?: AnalyzerPlayerStats;
  sourceTrust?: AnalyzerTrustLevel;
}

export interface AnalyzerFarmOptionState {
  seasonOptionsUsed?: number;
  maxSeasonOptions?: number;
  ratingRevealState?: "hidden" | "partial" | "revealed";
  eligibleForCallUp?: boolean;
  eligibleForSendDown?: boolean;
}

export interface AnalyzerPlayerStats {
  plateAppearances?: number;
  inningsPitched?: number;
  gamesPlayed?: number;
  war?: number;
  wpa?: number;
  clutch?: number;
  fieldingChances?: number;
  errors?: number;
  source: "season_snapshot" | "completed_game_snapshot" | "builder_projection" | "unavailable";
  trust: AnalyzerTrustLevel;
}

export interface AnalyzerRosterState {
  activePlayerIds: string[];
  farmPlayerIds?: string[];
  lineupSlots?: AnalyzerLineupSlot[];
  rotationIds?: string[];
  bullpenRoles?: AnalyzerBullpenRole[];
  depthChart?: AnalyzerDepthChartEntry[];
  pinchHitOrderIds?: string[];
  pinchRunOrderIds?: string[];
}

export interface AnalyzerLineupSlot {
  order: number;
  playerId: string;
  position: string;
  handednessContext?: "vsL" | "vsR" | "noDH" | "withDH";
}

export interface AnalyzerBullpenRole {
  role: "long" | "middle" | "setup" | "closer";
  playerId: string;
}

export interface AnalyzerDepthChartEntry {
  position: string;
  playerIds: string[];
}

export interface RosterAnalyzerInput {
  identity: AnalyzerIdentity;
  teamName?: string;
  players: AnalyzerPlayer[];
  roster: AnalyzerRosterState;
  leagueTeams?: AnalyzerTeamSummary[];
  config: RosterAnalyzerConfig;
}

export interface AnalyzerTeamSummary {
  teamId: string;
  teamName: string;
  profile?: Record<string, number>;
  salaryTotal?: number;
  activeCount?: number;
}

export interface RosterAnalyzerConfig {
  presetId: string;
  constraintDefaults: Record<AnalyzerConstraintKind, ConstraintDisposition>;
  rosterTargets: {
    activeMlb?: number;
    farm?: number;
    total?: number;
    positionMinimums?: Record<string, number>;
    rotationSize?: number;
    bullpenMinimum?: number;
  };
  salary?: {
    enabled: boolean;
    unit: "raw" | "millions" | "unknown";
    cap?: number;
    luxuryCap?: number;
  };
  traitRules?: AnalyzerTraitRules;
  chemistryRules?: AnalyzerChemistryRules;
  trustPolicy: AnalyzerTrustPolicy;
}

export type AnalyzerConstraintKind =
  | "data_integrity"
  | "roster_count"
  | "position_coverage"
  | "lineup"
  | "rotation"
  | "bullpen"
  | "depth_chart"
  | "pitch_arsenal"
  | "team_profile"
  | "salary_value"
  | "luxury_cap"
  | "trait_usage"
  | "chemistry_balance"
  | "farm_options"
  | "phase_lock";

export interface AnalyzerTraitRules {
  requiredPositiveTraits?: number;
  requiredNegativeTraits?: number;
  maxTraitsPerPlayer?: number;
  maxUsesByTrait?: Record<string, number>;
  maxUsesByPosition?: Record<string, Record<string, number>>;
}

export interface AnalyzerChemistryRules {
  desiredMinimums?: Record<string, number>;
  desiredMaximums?: Record<string, number>;
  classifyOnly?: boolean;
}

export interface AnalyzerTrustPolicy {
  missingStatsTrust: AnalyzerTrustLevel;
  missingSalaryTrust: AnalyzerTrustLevel;
  missingChemistryTrust: AnalyzerTrustLevel;
  allowLowTrustRecommendations: boolean;
}

export interface RosterAnalyzerReport {
  identity: AnalyzerIdentity;
  summary: AnalyzerReportSummary;
  findings: AnalyzerFinding[];
  recommendations: AnalyzerRecommendation[];
  trust: AnalyzerTrustSummary;
  generatedFrom: AnalyzerInputProvenance[];
}

export interface AnalyzerReportSummary {
  highestSeverity: AnalyzerSeverity;
  blockerCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  recommendationCount: number;
  readOnly: true;
}

export interface AnalyzerFinding {
  id: string;
  kind: AnalyzerConstraintKind;
  severity: AnalyzerSeverity;
  trust: AnalyzerTrustLevel;
  title: string;
  detail: string;
  affectedPlayerIds?: string[];
  evidence: AnalyzerEvidenceRef[];
  recommendedActionIds?: string[];
}

export type AnalyzerRecommendationKind =
  | "fix_data_integrity"
  | "lineup_adjustment"
  | "rotation_adjustment"
  | "bullpen_role_adjustment"
  | "depth_chart_adjustment"
  | "bench_balance"
  | "farm_monitor"
  | "call_up_advice"
  | "send_down_advice"
  | "salary_value_review"
  | "trait_balance_review"
  | "chemistry_balance_review"
  | "pitch_arsenal_review";

export interface AnalyzerRecommendation {
  id: string;
  kind: AnalyzerRecommendationKind;
  severity: AnalyzerSeverity;
  trust: AnalyzerTrustLevel;
  execution: RecommendationExecution;
  title: string;
  rationale: string;
  playerIds: string[];
  evidence: AnalyzerEvidenceRef[];
  counterEvidence?: AnalyzerEvidenceRef[];
  caveats: string[];
  blockedBy?: string[];
}

export interface AnalyzerEvidenceRef {
  type:
    | "rating"
    | "stat"
    | "lineup_slot"
    | "roster_status"
    | "farm_record"
    | "salary"
    | "trait"
    | "chemistry"
    | "team_profile"
    | "missing_data"
    | "deferred_system";
  label: string;
  value?: string | number | boolean;
  source: string;
  trust: AnalyzerTrustLevel;
}

export interface AnalyzerInputProvenance {
  source: "builder_state" | "franchise_players" | "franchise_teams" | "franchise_farm" | "season_stats" | "config";
  description: string;
  trust: AnalyzerTrustLevel;
}

export interface AnalyzerTrustSummary {
  overall: AnalyzerTrustLevel;
  highTrustInputs: string[];
  mediumTrustInputs: string[];
  lowTrustInputs: string[];
  unavailableInputs: string[];
}
```

### Analyzer Inputs

Inputs should be:

- Domain-neutral.
- Fully in memory.
- Serializable for test fixtures.
- Explicit about identity and source trust.
- Already filtered for franchise ownership in franchise mode.

Builder inputs may include Builder roster and league data. Franchise inputs must include canonical franchise identity when available: `franchiseId`, `seasonId`, `seasonNumber`, and `statsScopeId`.

### Analyzer Outputs

Outputs should be:

- Reports, findings, and recommendations.
- Read-only by construction (`summary.readOnly: true`, `execution: "read_only"`).
- Evidence-backed.
- Trust-scored.
- Safe to render in Builder or Franchise without giving the UI an executable mutation payload.

### Severity Model

- `blocker`: invalid roster for a hard rule in the active preset. Example: Builder import strict mode finds no valid catcher or no eligible starting pitcher.
- `critical`: likely breaks gameplay/readiness but may be surface-specific. Example: franchise game-prep roster has fewer than 9 active non-pitcher batting-order candidates.
- `warning`: roster is legal but strategically weak or data is incomplete.
- `info`: descriptive context or low-risk advisory.

Franchise MVP should avoid `blocker` severity except for data-integrity/readiness reports. Call-up/send-down suggestions should generally be warnings or info because execution is out of scope.

### Constraint Model

Each constraint should declare:

- `kind`
- `disposition`: `hard`, `advisory`, or `disabled`
- `appliesTo`: mode/surface/context
- required input fields
- missing-data behavior
- severity mapping
- recommendation strategy

MVP constraint families:

- Data integrity: duplicate player IDs, missing player records, invalid positions, invalid roster status.
- Roster count: active/farm/total roster targets.
- Position coverage: catcher, middle infield, corner infield, outfield, pitcher coverage.
- Lineup: 9-player order, no duplicates, legal positions, DH/no-DH context.
- Rotation: required starters, no invalid non-pitchers.
- Bullpen: closer/setup/long/middle coverage.
- Pitch arsenal: max pitches, required fastball/offspeed, valid pitch codes.
- Team profile: strengths/weaknesses using `smb4TeamProfileEngine`.
- Salary/value: advisory only unless preset says otherwise.
- Trait usage: advisory until app-native trait rules are explicitly configured.
- Chemistry balance: advisory/classification only.
- Farm options: read-only eligibility and risk warnings.
- Phase lock: report that Phase 11/final roster lock validation is unavailable or advisory when not implemented.

### Recommendation Model

Recommendations must be suggestions, not commands. A recommendation should never contain enough data for a UI to call a writer directly without an explicit future workflow.

Good MVP recommendation:

> "Add a bench-capable catcher or move an existing catcher into the active roster before launching games. Evidence: active roster has 0 catcher-primary players; farm player `p-123` is a catcher with hidden ratings. Trust: medium."

Bad MVP recommendation:

> "Call up `p-123` now" with an executable transaction payload.

Recommendation objects should:

- Use `execution: "read_only"`.
- Cite all evidence.
- Include caveats when data is missing or deferred.
- Use `blockedBy` for recommendations that need future adapters, such as `["call_up_send_down_execution_not_in_mvp", "phase_11_lock_not_implemented"]`.

### Explainability Model

Every finding and recommendation should answer:

- What did the analyzer see?
- Why does that matter?
- Which player/team/roster fields support it?
- How trustworthy is the data?
- What data would improve confidence?
- Which future system, if any, blocks execution?

Evidence should prefer concrete facts:

- "Active MLB players: 21, target: 22"
- "No active player has primary position C"
- "Rotation has 3 starters, target: 4"
- "Player has `rosterStatus: FARM`; excluded from GameTracker active roster"
- "Season stats unavailable; recommendation based on ratings only"

### Config/Preset Model

Recommended presets:

- `kbl_roster_analyzer_v1_default`: conservative shared default, advisory-heavy.
- `builder_validation_advisory_v1`: Builder team/league validation, warnings by default.
- `builder_import_strict_v1`: future import gate, hard rules only for objective legality.
- `franchise_team_hub_advisory_v1`: franchise-owned player/team/farm reads, no mutation.
- `franchise_game_prep_v1`: stricter active roster/game readiness checks, still no mutation.
- `xbl_experimental_v1`: optional future preset that adapts workbook luxury/trait concepts after schema decisions.

The workbook should inform presets, not become the default hard-coded policy.

### Trust Levels

Recommended trust policy:

- High: static ratings, positions, handedness, active roster assignments, pitch arsenal, lineup/rotation/depth-chart records loaded from the owning domain.
- Medium: season stats, WAR/WPA/clutch summaries, salary estimates where units are known, optimal-lineup comparisons.
- Low: salary comparisons with unknown units, hidden farm ratings, incomplete stats, inferred playing-time projections.
- Unavailable: fan morale, adaptive standards, farm narrative effects, exact spreadsheet chemistry deltas, career/milestone inputs that are not canonically scoped.

Trust should affect output:

- High-trust findings can be direct.
- Medium-trust recommendations should cite data caveats.
- Low-trust recommendations should be phrased as "monitor" or "review".
- Unavailable inputs should produce placeholder findings only when relevant.

### Handling Missing/Deferred Data Honestly

The analyzer should not fabricate values or silently downgrade to global/template data.

If data is missing:

- Emit a data-integrity or unavailable-input finding.
- Lower confidence.
- Avoid execution-oriented recommendations.
- Cite the missing field and expected source.

Examples:

- Missing franchise farm record: "Farm option state unavailable; cannot evaluate option risk."
- Missing season stats: "Playing-time suggestion uses ratings only, not current performance."
- Missing chemistry rules: "Chemistry distribution reported; no hard chemistry constraint configured."
- Missing Phase 11 lock: "Final 22/10 lock validation is advisory until durable roster lock is implemented."

## 5. Builder Mode Surface

### Team Validation

Builder team validation should answer:

- Does the roster have enough active players?
- Are required defensive positions covered?
- Is there a legal batting lineup?
- Is there a legal starting rotation?
- Is there enough bullpen coverage?
- Are pitch arsenals valid for pitchers?
- Are trait and chemistry distributions within configured advisory limits?
- Are salary/value and luxury-cap risks visible under the selected preset?

Builder evidence:

- Player and roster models already include the data needed for v1 validation (`src/utils/leagueBuilderStorage.ts:150-180`, `src/utils/leagueBuilderStorage.ts:250-268`).
- Builder already validates pitch arsenal rules for individual players (`src/src_figma/app/pages/Builder.tsx:405-413`).
- League Builder rosters already separate MLB/farm/unassigned roster views and mutation actions (`src/src_figma/app/pages/LeagueBuilderRosters.tsx:540-566`).

### League Balance Report

League balance should use app-native team profiles:

- Compare power/contact/speed/rotation/bullpen profile levels across teams.
- Flag extreme outliers.
- Report salary/luxury distribution if configured and trustworthy.
- Report position or pitcher-depth gaps by team.

The existing team profile engine already computes team categories and profile distance (`src/engines/smb4TeamProfileEngine.ts:176-260`), and tests cover fixed fixtures and profile comparisons (`src/engines/__tests__/smb4TeamProfileEngine.test.ts:73-127`).

### Import-Blocking Vs Advisory Checks

Builder mode can eventually support both:

- Advisory: default for interactive roster-building surfaces.
- Import-blocking: only for objective, deterministic hard rules during future import flows.

Recommended MVP:

- No import-write behavior.
- No automatic blocking unless a future UI explicitly chooses a strict preset.
- Report `blocker` severity only inside a report; let the caller decide whether that blocks import.

### UI Placement

Future UI placements, not part of F0/F1:

- Builder page: add a roster/team analyzer distinct from the existing single-player analyzer.
- League Builder rosters page: read-only report panel near roster/lineup/rotation/depth tabs.
- League Builder overview: league balance report comparing teams.
- Import review: future strict report before committing imported rosters.

### Builder MVP Scope

Builder MVP after F1 should include:

- Team roster legality/advisory report.
- Pitching arsenal checks.
- Position coverage.
- Lineup/rotation/bullpen/depth warnings.
- Team profile strengths/weaknesses.
- Basic salary/value warnings if salary units are known.
- No writes.

### Builder Later Scope

- Import-blocking strict preset.
- Workbook-inspired luxury cap presets.
- Trait/chemistry rule configuration.
- League-level parity dashboard.
- Spreadsheet parity validation reports.
- One-click fixes only after explicit future mutation design.

## 6. Franchise Mode Surface

### Team Strengths/Weaknesses

Franchise analysis should use franchise-owned player/team snapshots:

- Current active MLB roster.
- Farm roster.
- Current lineup/rotation/bullpen/depth chart.
- Season stats where canonical identity is available.
- Team profile and optimal-lineup comparison.

TeamHub already loads franchise teams and players from franchise storage and filters active MLB players (`src/src_figma/app/components/TeamHubContent.tsx:454-491`, `src/src_figma/app/components/TeamHubContent.tsx:501-516`). It also maps franchise players into optimal-lineup candidates (`src/src_figma/app/components/TeamHubContent.tsx:206-222`) and has existing read/write paths for optimal lineup snapshots (`src/src_figma/app/components/TeamHubContent.tsx:641-760`). The analyzer should reuse the read-only comparison concepts, not the save/apply paths.

### Lineup/Rotation/Bullpen Advice

Franchise MVP advice:

- "Current lineup appears weaker than optimal snapshot at 2B."
- "Rotation has only 3 active starting pitchers."
- "Bullpen has no closer assigned."
- "Lineup readiness is low against LHP because two slots are empty."

Existing utility support:

- Optimal lineup snapshots and comparisons (`src/utils/optimalLineup.ts:229-302`, `src/utils/optimalLineup.ts:343-416`).
- GameTracker roster readiness checks (`src/src_figma/app/utils/franchiseGameTrackerRoster.ts:102-168`).

### Playing-Time Suggestions

Playing-time suggestions should be conservative:

- MVP can compare active roster role versus ratings/stats, if stats are available.
- If stats are missing or sparse, recommendations must say "ratings-only" or "small sample."
- Do not use unsupported full replay, deferred WAR proof gaps, or unavailable career/milestone data as high-confidence evidence.

### Farm/Call-Up/Send-Down Recommendations As Read-Only Advice

Farm recommendations should be phrased as roster planning, not execution:

- "Monitor farm catcher X if active roster remains short at catcher."
- "Player Y has used 3 options this season; send-down advice unavailable or high risk."
- "Farm player Z ratings are hidden; recommendation confidence is low."

Repo evidence:

- Farm records include season-scoped option and reveal state fields (`src/utils/franchiseFarmStorage.ts:7-21`).
- Option limit is currently encoded in roster movement (`src/utils/franchiseRosterMovement.ts:17`).
- Durable movement writers update state and transactions and must not be called by the analyzer (`src/utils/franchiseRosterMovement.ts:74-188`).

### Blocked Phase 11 And Deferred Offseason Adapters

If the user is in an offseason/finalization context:

- Analyzer may report roster composition risks.
- Analyzer must not perform Phase 11 lock, free agency, draft, trade, retirement, expansion, or ratings adjustment work.
- If Phase 11 durable lock validation is absent or guarded, report that the analyzer is advisory only.

### UI Placement

Future UI placements, not part of F0/F1:

- TeamHub: read-only "Roster Analysis" tab or panel near roster/stats.
- FranchiseHome: season/team health summary card linking to TeamHub report.
- Game prep: pre-launch readiness report using the stricter game-prep preset.
- Offseason Phase 11: read-only roster lock preview once durable lock validator exists.

### Franchise MVP Scope

Franchise MVP after F1/F3 should include:

- TeamHub read-only report using franchise-owned players and teams.
- Active MLB/farm roster status validation.
- Lineup/rotation/bullpen/depth advice.
- Farm candidate monitoring as read-only advice.
- Missing-data/trust labels.
- No League Builder fallback in healthy franchise context.
- No mutation.

### Franchise Later Scope

- Phase 11 final 22/10/32 lock integration after durable validator exists.
- Farm advice using more complete option/reveal/history data.
- Playing-time and role recommendations from richer season/career stats.
- Mutation-capable workflows only after call-up/send-down/offseason adapters and rollback/journal safety are designed for execution.

## 7. Data Safety And Boundaries

### Read-Only Guarantee

Implementation guardrails for F1:

- Pure engine only.
- No IndexedDB/localStorage/sessionStorage imports.
- No React imports.
- No storage or mutation API imports.
- No route/navigation side effects.
- Tests should assert the engine accepts input and returns output without touching known writer mocks.

Implementation guardrails for adapters:

- Builder adapter consumes caller-provided state or read-only selectors.
- Franchise adapter uses `getFranchiseTeam`, `getAllFranchisePlayers`, and `getFranchiseFarmRoster` only.
- Franchise adapter must reject or warn on missing `franchiseId`/`seasonId` where canonical scope is required.
- No adapter should call movement, save, delete, transition, offseason, or import APIs.

### No Roster Mutations

Recommendations should not contain:

- A mutation function.
- A storage key.
- A direct writer payload.
- A transaction object ready to persist.
- A "confirm" state that can be wired directly to execution.

They may contain:

- Player IDs for evidence.
- Suggested role/position as text.
- Blocker/future-work reasons.
- Trust and caveats.

### No Call-Up/Send-Down Execution

The analyzer can identify candidates and risks. It cannot call:

- `sendDownFranchisePlayer`
- `callUpFranchisePlayer`
- `saveFranchiseFarmRecord`
- `deleteFranchiseFarmRecord`

Call-up/send-down execution should remain a separate future workflow because it changes player state, farm records, options, ratings reveal, and transactions (`src/utils/franchiseRosterMovement.ts:74-188`).

### No Salary/Offseason Mutation

Salary analysis is advisory only. The analyzer cannot run salary recalculation flows, ratings adjustment flows, free agency, draft, retirement, trade, contraction, expansion, or finalization side effects.

### No Reliance On Deferred Flavor Systems

Do not treat these as durable high-confidence roster inputs:

- Fan morale.
- Farm narrative/mechanical effects.
- Adaptive standards.
- Park factor effects unless explicitly stored as a trusted snapshot.
- Narrative/reporters.
- Hall of Fame/museum or fame systems unless stable and scoped.

### Evidence And Overconfidence Rules

Recommendations should cite evidence and avoid overconfidence:

- Say "active roster lacks a catcher" rather than "call up Player X."
- Say "ratings-only suggestion" when stats are missing.
- Say "salary unit unknown" when salary comparisons cannot be trusted.
- Say "farm rating hidden" when recommending a farm player with unrevealed ratings.
- Say "future execution adapter required" for any actionable movement advice.

## 8. Implementation Sequence

### Phase F1: Shared Analyzer Engine MVP

Purpose:

- Build the pure, read-only analyzer engine and unit tests.

Scope:

- Add pure engine/types under `src/engines`.
- Accept plain `RosterAnalyzerInput`.
- Return `RosterAnalyzerReport`.
- Implement objective constraints: data integrity, active/farm counts, position coverage, lineup, rotation, bullpen, pitch arsenal, basic team profile, missing data/trust reporting.
- Reuse `optimalLineup`, `smb4TeamProfileEngine`, and salary logic only where safe.
- Include recommendations as non-executable advice.

Out of scope:

- UI.
- Storage adapters.
- Any mutations.
- Workbook parity.
- Call-up/send-down execution.
- Offseason adapters.

Likely files:

- `src/engines/rosterAnalyzerEngine.ts`
- `src/engines/rosterAnalyzerTypes.ts`
- `src/engines/index.ts`
- `src/engines/__tests__/rosterAnalyzerEngine.test.ts`

Tests:

- Pure input/output snapshot tests.
- No mutation/import boundary tests by structure or mocks.
- Position coverage findings.
- Lineup/rotation/bullpen findings.
- Pitch arsenal findings.
- Farm advice is read-only and blocked from execution.
- Missing-data trust downgrade.
- Salary unit unknown warning.

Risks:

- Duplicating optimal-lineup logic instead of reusing it.
- Overstating low-trust recommendations.
- Accidentally importing UI/storage code into engine.

Recommended reasoning level: High.

### Phase F2: Builder Validation Surface

Purpose:

- Surface analyzer reports in Builder without committing new mutations.

Scope:

- Add Builder adapter from in-memory Builder data to analyzer DTOs.
- Add read-only report UI to Builder/League Builder surfaces.
- Optional advisory vs strict preset selector if small enough.
- No import writes.

Out of scope:

- Applying fixes.
- Auto-generating replacement players.
- Import write enforcement unless explicitly approved later.

Likely files:

- `src/utils/rosterAnalyzerBuilderAdapter.ts`
- `src/src_figma/app/pages/Builder.tsx`
- `src/src_figma/app/pages/LeagueBuilderRosters.tsx`
- `src/src_figma/__tests__/builder/*`

Tests:

- Report renders without saving rosters.
- Builder data maps to analyzer input.
- Invalid pitch arsenal and missing position coverage are shown.
- League balance uses team profile data.
- Strict preset reports blockers without performing writes.

Risks:

- Confusing existing single-player analyzer with roster analyzer.
- Accidentally wiring existing "apply optimal" mutation paths.
- Making import-blocking decisions before import-write design is ready.

Recommended reasoning level: High.

### Phase F3: Franchise Read-Only TeamHub Surface

Purpose:

- Surface franchise-owned roster analysis in TeamHub.

Scope:

- Add Franchise adapter using franchise-owned reads.
- Render read-only TeamHub report.
- Include active MLB/farm status filtering and missing-data/trust labels.
- Include lineup/rotation/bullpen/depth advice.

Out of scope:

- Call-up/send-down execution.
- Saving lineups from analyzer.
- Offseason adapter actions.
- League Builder fallback.

Likely files:

- `src/utils/rosterAnalyzerFranchiseAdapter.ts`
- `src/src_figma/app/components/TeamHubContent.tsx`
- `src/src_figma/__tests__/franchiseMode/TeamHubContent.*.test.tsx`
- `src/utils/tests/rosterAnalyzerFranchiseAdapter.test.ts`

Tests:

- Reads franchise players/teams/farm only.
- Does not call League Builder storage in healthy franchise context.
- Excludes farm/free-agent/released/retired/inactive/unassigned from active roster analysis.
- Recommendations are read-only and do not call movement writers.
- Missing farm/season stats downgrade trust.

Risks:

- Reintroducing global/template fallback.
- Presenting farm advice as executable.
- Failing to respect active game roster snapshot boundaries.

Recommended reasoning level: High.

### Phase F4: Farm Recommendation Read-Only Expansion

Purpose:

- Improve farm and option advice while staying non-mutating.

Scope:

- Add farm depth, option-risk, rating-reveal, and positional surplus/shortage analysis.
- Report whether Phase 11/final roster lock validation is available.
- Keep advice-only outputs.

Out of scope:

- Movement execution.
- Phase 11 lock writes.
- Farm morale/narrative algorithms.

Likely files:

- `src/engines/rosterAnalyzerEngine.ts`
- `src/utils/rosterAnalyzerFranchiseAdapter.ts`
- `src/utils/franchiseFarmStorage.ts` read paths only
- Tests under `src/engines/__tests__` and `src/utils/tests`

Tests:

- Options-used warnings.
- Hidden/partial/revealed ratings trust handling.
- Farm candidate advice blocked from execution.
- Cross-franchise farm isolation in adapter.

Risks:

- Option rules treated as execution-ready.
- Hidden ratings overconfidence.
- Phase 11 lock overstated.

Recommended reasoning level: High.

### Phase F5: Future Mutation-Capable Workflows Only After Adapters Exist

Purpose:

- Only after explicit approval and prerequisite safety work, design execution flows for recommendations.

Prerequisites:

- Atomic call-up/send-down or transaction-bundled movement.
- Durable Phase 11 roster lock validator.
- Offseason adapter contracts for FA/draft/trade/retirement/ratings adjustment.
- Repair/rollback story for partial failures.
- Import-write design if Builder import automation is involved.

Out of scope for current planning:

- Any implementation.
- Any mutation-capable UI.

Recommended reasoning level: Extra High.

## 9. Open Questions

1. Balance philosophy: Should the default analyzer optimize toward SMB4-like parity, KBL-specific house rules, or user-configured league identity?
2. Configurability: Should presets be global app defaults, per-league settings, per-franchise settings, or report-local overrides?
3. Spreadsheet parity: Which XBL workbook rules are desired as canonical app behavior versus optional experimental presets?
4. Hard versus advisory: Which constraints should block Builder imports, and which should only warn?
5. Recommendation personality: Should advice be conservative and factual, or should it make opinionated roster decisions when evidence is strong?
6. Salary units: What is the canonical salary unit across Builder, Franchise, and `salaryCalculator` outputs?
7. Trait/chemistry semantics: Should trait/chemistry effects be copied from spreadsheet-style tables or modeled in app-native config?
8. Hidden farm ratings: How should advice balance hidden ratings, rating reveal state, and known roster needs?
9. Playing-time data: What sample-size thresholds should make stats-based recommendations trustworthy?
10. Mutation handoff: When future execution exists, should recommendations be revalidated immediately before any write?

## Recommended MVP Scope

Recommended first implementation is Phase F1 only:

- Pure engine and types.
- No UI.
- No storage adapters.
- No mutations.
- Deterministic report with findings, recommendations, evidence, and trust.
- Objective roster/lineup/rotation/bullpen/pitch-arsenal/team-profile constraints.
- Advisory, evidence-backed outputs.

Builder and Franchise UI should wait until the pure engine contract is tested. This keeps the first step small, shared, and safe.

## Top 10 Design Decisions

1. Make the core analyzer pure and storage-free.
2. Use separate Builder and Franchise adapters.
3. Require franchise adapters to read only franchise-owned/scoped data.
4. Return read-only recommendation objects, not executable payloads.
5. Attach evidence and trust level to every finding/recommendation.
6. Reuse app-native team profile, optimal-lineup, salary, and grade utilities where safe.
7. Treat XBL spreadsheet rules as configurable concepts, not hard-coded defaults.
8. Keep Franchise recommendations advisory by default.
9. Allow Builder strict/import-blocking mode only as a future caller decision.
10. Represent missing/deferred systems explicitly instead of inferring from globals.

## Top 10 Implementation Risks

1. Accidentally importing storage writers into the core engine.
2. Reintroducing League Builder/global reads in healthy franchise context.
3. Producing executable-looking call-up/send-down recommendations before movement workflows are safe.
4. Duplicating optimal-lineup logic and drifting from existing snapshots/comparisons.
5. Overfitting to the XBL spreadsheet instead of app-native roster models.
6. Treating salary values as comparable when units are unknown.
7. Treating hidden farm ratings or missing stats as high-confidence inputs.
8. Presenting deferred morale/narrative/adaptive/park-factor systems as durable roster truth.
9. Letting Builder import-blocking behavior ship before import-write design is approved.
10. Allowing UI surfaces to wire analyzer output directly into existing mutation handlers.

## Exact Next Implementation Prompt If Approved

Recommended reasoning: High

Please implement Phase F1: shared read-only roster analyzer engine MVP.

Scope:
- Implement a pure TypeScript roster analyzer engine only.
- Do not add UI.
- Do not add storage adapters yet.
- Do not mutate rosters.
- Do not wire call-up/send-down execution.
- Do not expand offseason adapters.

Use:
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/ROSTER_ANALYZER_RECOMMENDATION_ENGINE_SPEC.md`
- Existing `optimalLineup`, `smb4TeamProfileEngine`, `salaryCalculator`, `smb4GradeEmulator`, and roster model types where safe.

Requirements:
1. Add pure engine/types under `src/engines`.
2. Inputs must be plain DTOs and include mode/surface/canonical identity fields where applicable.
3. Outputs must include summary, findings, read-only recommendations, evidence refs, and trust summary.
4. Implement MVP constraints:
   - data integrity
   - roster counts
   - position coverage
   - lineup readiness
   - rotation coverage
   - bullpen coverage
   - pitch arsenal legality
   - team profile strengths/weaknesses
   - missing/deferred data reporting
5. Recommendations must be non-executable and explicitly `read_only`.
6. The engine must not import React, IndexedDB/localStorage helpers, Franchise/Builder storage writers, movement writers, or offseason flows.
7. Add focused unit tests proving:
   - deterministic reports
   - no executable mutation payloads
   - invalid roster findings
   - lineup/rotation/bullpen findings
   - pitch arsenal findings
   - team profile findings
   - farm/call-up advice remains read-only
   - missing data downgrades trust
   - salary-unit unknown behavior is safe

Output:
- Findings first if implementation uncovers blockers.
- Then summary of files changed and tests run.
