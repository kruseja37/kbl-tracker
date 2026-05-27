# SMB4 Player Generation Engine Spec

Status: Draft
Created: 2026-05-19
Owner: KBL Tracker

## Purpose

Build a mathematically grounded SMB4-style player generation system that can:

- emulate SMB4 standard roster grade logic more reliably than the older CODEX toolkit
- generate individual players from scratch inside target grade bands
- honor constraints like position, secondary position, traits, handedness, arsenal, age, and role
- generate full teams that match standard SMB4 team profiles
- explain why a generated player landed in a grade band
- keep historical-player conversion separate from SMB4 roster emulation while allowing both systems to share rating, trait, and validation primitives

This spec supersedes the older one-off CODEX analysis package as the planning source for new implementation work. The older package remains evidence and prototype code, especially:

- `spec-docs/CODEX player analyses/CODEX_smb4_grade_toolkit.py`
- `spec-docs/CODEX player analyses/CODEX_SMB4_HUMAN_READABLE_FORMULA_SPEC.md`
- `spec-docs/CODEX player analyses/CODEX_SMB4_TRAIT_VALUE_ANALYSIS.md`
- `spec-docs/data/smb4_players_fixed.csv`

## Core Product Questions

The engine must answer four practical questions.

1. Given a player, what SMB4-style grade should they receive?
2. Given constraints, how can we generate one or more players that land in a target grade band?
3. Given target team bars, how can we generate a 22-player roster that matches that team identity?
4. Given a historical player profile, how can we translate reality into SMB4 ratings, traits, and role constraints?

## Non-Goals

- Do not claim we have recovered SMB4 source code.
- Do not force all KBL systems to use the SMB4 emulator. Existing simple grade logic can remain for legacy prospect generation until replaced deliberately.
- Do not scrape historical-player data as part of the first implementation. Historical conversion should start with a source-adapter boundary.
- Do not optimize only for exact grade fit if that makes generated players unrealistic.

## Source Data

Primary fitting dataset:

- `spec-docs/data/smb4_players_fixed.csv`
- 440 standard SMB4 players
- 20 standard teams
- complete ratings, positions, grades, traits, arsenals, handedness, and team notes

Supporting datasets:

- `spec-docs/data/all_players_combined.csv` for non-standard KBL/MLB-import context
- `PLAYER_DATABASE.md` as original markdown source lineage
- old CODEX generated rosters as examples, not ground truth

## Key Finding From Re-Analysis

The production app engine at `src/engines/gradeEngine.ts` is a transparent weighted-rating calculator:

- hitters: `0.30*power + 0.30*contact + 0.20*speed + 0.10*fielding + 0.10*arm`
- pitchers: `(velocity + junk + accuracy) / 3`
- threshold lookup from `S` through `D`

On the fixed SMB4 standard roster this exact approach matches only about 30 percent of assigned grades. The later CODEX fitted model matches 84.32 percent on its training set and 99.77 percent within one grade, but cross-validation suggests a more honest expected exact-match rate around the mid/high 70s.

The implemented V2 grade emulator keeps that fitted numeric model and adds calibrated ordinal grade thresholds derived from the 440-player roster. This raises fixed-roster reconstruction to `387 / 440 = 87.95%` exact while preserving `439 / 440 = 99.77%` within-one-grade. The old center mapping remains available for audit comparisons. Details live in `spec-docs/SMB4_GRADE_MODEL_V2_AUDIT.md`.

The remaining residuals are concentrated around trait, handedness, secondary-position, and arsenal-count interactions. Details live in `spec-docs/SMB4_GRADE_RESIDUAL_AUDIT.md`.

The new system should still pursue reliable generation, not perfect memorization.

## Architecture

Use four separate engines.

### 1. Grade Emulator

Module target:

- `src/engines/smb4GradeEmulator.ts`

Responsibilities:

- normalize player inputs
- compute model features
- calculate numeric grade score
- map numeric score to grade label
- return explainable feature contributions
- expose validation utilities for fixture tests

Public API sketch:

```ts
export function normalizeSmb4Player(input: Smb4PlayerInput): NormalizedSmb4Player;
export function scoreSmb4Player(input: Smb4PlayerInput): Smb4GradeResult;
export function explainSmb4Player(input: Smb4PlayerInput): Smb4GradeExplanation;
```

### 2. Player Generator

Module target:

- `src/engines/smb4PlayerGenerator.ts`

Responsibilities:

- generate candidate players from empirical priors
- apply user constraints
- score candidates with the grade emulator
- search/nudge ratings until constraints are satisfied
- reject unrealistic or duplicated candidate shapes
- use actual standard-team position and grade templates when cloning a standard profile

Public API sketch:

```ts
export function generateSmb4Players(request: Smb4GenerationRequest): Smb4GeneratedPlayer[];
export function generateSmb4Roster(request: Smb4RosterGenerationRequest): Smb4GeneratedRoster;
export const SMB4_STANDARD_TEAM_ROSTER_TEMPLATES: Record<string, Smb4StandardTeamRosterTemplate>;
export function summarizeSmb4Roster(roster: Smb4GeneratedRoster): Smb4RosterGenerationReport;
export function formatSmb4RosterReportMarkdown(roster: Smb4GeneratedRoster): string;
```

### 3. Team Profile Engine

Module target:

- `src/engines/smb4TeamProfileEngine.ts`

Responsibilities:

- calculate `0..6` category levels for standard teams
- expose canonical team profile fixtures
- score generated rosters against target profiles
- provide profile-distance metrics for search

Public API sketch:

```ts
export function calculateTeamProfile(players: Smb4PlayerInput[]): Smb4TeamProfile;
export function compareTeamProfiles(a: Smb4TeamProfile, b: Smb4TeamProfile): Smb4TeamProfileDistance;
```

Detailed spec:

- `spec-docs/SMB4_TEAM_PROFILE_ENGINE_SPEC.md`

### 4. Historical Player Converter

Module target:

- `src/engines/historicalPlayerConverter.ts`

Responsibilities:

- accept a resolved historical-player record
- normalize real-world stats into era-adjusted percentiles
- map percentiles into SMB4 ratings and traits
- output a draft SMB4 player profile for review or direct generation

Public API sketch:

```ts
export function resolveHistoricalPlayerByName(
  name: string,
  records: HistoricalPlayerSourceRecord[],
): HistoricalPlayerSourceRecord[];

export function percentileToSmb4Rating(percentile: number | undefined, fallback?: number): number;

export function convertHistoricalPlayerToSmb4(
  request: HistoricalConversionRequest,
): HistoricalSmb4Profile;

export function createManualHistoricalSourceRecord(
  input: ManualHistoricalSourceInput,
): HistoricalPlayerSourceRecord;

export function buildHistoricalSourcesFromLahmanCsv(
  bundle: LahmanCsvBundle,
  options?: LahmanAdapterOptions,
): HistoricalPlayerSourceRecord[];
```

First-pass implementation status:

- source-record boundary is implemented
- source records carry source IDs and provenance metadata
- manual and Lahman CSV source adapters are implemented
- `career`, `peak`, and `hybrid` modes are implemented
- hitter and pitcher percentile-to-rating conversion is implemented
- trait, position, pitcher-role, and arsenal inference are implemented
- confidence notes are returned for inferred or incomplete fields
- live lookup is intentionally not implemented; source adapters should provide candidate records

Detailed spec:

- `spec-docs/HISTORICAL_PLAYER_CONVERSION_SPEC.md`

## Modeling Strategy

The new math pipeline should separate three ideas that the old toolkit blended together.

### Grade Fit

This predicts the displayed SMB4 grade from a complete player.

Recommended model family:

- regularized linear or elastic-net numeric model for explainability
- ordinal calibration layer for grade thresholds
- optional small ensemble with monotonic or tree-based model only if it improves validation without making explanations opaque

Target variable:

- numeric centers for grades, using the full SMB4-like grade center scale from the CODEX toolkit
- assigned `overallGrade` remains the observed label

Validation:

- train-set exact accuracy
- random k-fold exact accuracy
- leave-team-out exact accuracy
- within-one-grade accuracy
- confusion by player type, position, grade tier, trait count, and team
- coefficient stability by bootstrap

### Realism Prior

This ensures generated players look like SMB4 players, not just grade-fitting stat bundles.

Empirical priors should be learned by:

- primary position
- grade band
- player type
- role for pitchers
- trait count
- handedness
- secondary-position family
- arsenal count and pitch mix

Generation should prefer:

- empirical sampling from similar stock players
- covariance-aware rating perturbations
- position-specific stat envelopes
- trait/arsenal combinations observed or logically compatible in SMB4

### Constraint Search

This satisfies user requests like:

- "make 10 B- grade players across these positions"
- "each player must include one trait"
- "make a 22-player team matching the Sandcats profile"
- "give me a power 5, speed 2, rotation 4 roster"

Search should:

- generate many candidates from priors
- score each candidate
- calculate distance from target grade/profile
- nudge ratings through bounded integer steps
- preserve requested traits, roles, and positions
- reject candidates that leave plausible position envelopes

Recommended first algorithm:

1. sample candidate from empirical template
2. apply hard constraints
3. score with grade emulator
4. greedily nudge highest-leverage ratings toward target numeric score
5. run a short local search over legal rating changes
6. accept if grade, profile, and realism distance pass thresholds
7. otherwise resample

## Request Types

### Individual Player Batch

Example:

```json
{
  "count": 10,
  "targetGrade": "B-",
  "positions": ["C", "SS", "CF", "SP", "RP"],
  "traitPolicy": { "mode": "exactlyOne", "allowedPolarity": "any" },
  "uniqueness": { "avoidNearDuplicates": true }
}
```

### Team Profile Generation

Example:

```json
{
  "targetProfile": {
    "power": 0,
    "contact": 2,
    "speed": 6,
    "rotation": 0,
    "bullpen": 5
  },
  "rosterSize": 22,
  "positionTemplate": "standard-smb4",
  "gradeDistribution": "match:sandcats"
}
```

### Existing Team Clone

Example:

```json
{
  "targetTeam": "Sandcats",
  "variation": {
    "maxSameGradeCountDelta": 1,
    "allowDifferentTraits": true,
    "preserveProfileBars": true
  }
}
```

When `standardTeamProfileName` is provided and no explicit `positionPlan` or `gradePlan` is supplied, the generator uses the matching entry in `SMB4_STANDARD_TEAM_ROSTER_TEMPLATES`. These templates are derived from `spec-docs/data/smb4_players_fixed.csv` and preserve each standard team's primary-position sequence and grade distribution. Explicit request plans still override the template.

### Historical Player Conversion

Example:

```json
{
  "historicalPlayer": "Rickey Henderson",
  "mode": "peak",
  "eraAdjustment": true,
  "targetRole": "LF/CF",
  "allowTraitInference": true
}
```

## Data Contracts

### Player Input

```ts
export interface Smb4PlayerInput {
  name?: string;
  age?: number;
  primaryPosition: string;
  secondaryPosition?: string;
  bats?: "R" | "L" | "S";
  throws?: "R" | "L";
  overallGrade?: string;
  power?: number;
  contact?: number;
  speed?: number;
  fielding?: number;
  arm?: number;
  velocity?: number;
  junk?: number;
  accuracy?: number;
  arsenal?: string[] | string;
  trait1?: string;
  trait2?: string;
}
```

### Grade Result

```ts
export interface Smb4GradeResult {
  numericScore: number;
  grade: string;
  gradeIndex: number;
  playerType: "hitter" | "pitcher";
  baseWeighted: number;
  confidence: "high" | "medium" | "low";
  warnings: string[];
}
```

### Generated Player

```ts
export interface Smb4GeneratedPlayer extends Smb4PlayerInput {
  targetGrade: string;
  generatedGrade: string;
  numericScore: number;
  realismScore: number;
  generationNotes: string[];
}
```

### Generated Roster Report

Roster generation exposes a deterministic report layer so team-profile matches can be audited outside the app.

```ts
export interface Smb4RosterGenerationReport {
  teamName: string;
  targetTeamName?: string;
  profileCode: string;
  targetProfileCode: string;
  profileBars: Record<string, { level: number; text: string }>;
  targetProfileBars: Record<string, { level: number; text: string }>;
  profileDistance: Smb4TeamProfileDistance;
  players: Smb4RosterReportPlayer[];
}
```

Current generated example artifacts:

- `spec-docs/generated/smb4_generated_sandcats_roster.json`
- `spec-docs/generated/smb4_generated_sandcats_roster.csv`
- `spec-docs/generated/smb4_generated_sandcats_roster.md`

Regenerate them with:

```bash
npm run export:smb4-generated-roster
```

## Reliability Gates

The implementation is not accepted until it passes these gates.

### Grade Emulator

- fixed 440-player fixture can be loaded without normalization errors
- train-set exact accuracy is reported, not treated as the main reliability claim
- leave-team-out exact accuracy is reported
- within-one-grade accuracy must be at least 97 percent
- confusion report is generated for all misses
- fixture tests include at least 20 named SMB4 players across hitters, starters, relievers, closers, and low-grade players

### Player Generator

- target grade exact success rate must be at least 95 percent on unconstrained batch requests
- constrained requests must return either valid players or a clear failure reason
- generated player ratings must stay in `0..99`
- no duplicate trait slots
- pitcher elite pitch traits should strongly prefer the matching pitch in arsenal unless explicitly disabled
- generated players must include explanation metadata

### Team Generator

- canonical standard-team profiles must be reproduced from source data
- team profile distance must be exposed as a numeric metric
- generated teams must satisfy roster position counts before profile scoring
- profile matching should prefer realistic rosters over perfect category bars

### Historical Converter

- must require a resolved source record, not a bare ambiguous name
- must support at least `career`, `peak`, and `hybrid` modes
- must return confidence and source notes
- must not hide era adjustments

## Open Decisions

1. Should the app expose both "simple KBL grade" and "SMB4 emulator grade" side by side?
2. Should generated teams default to exact standard 22-player SMB4 roster counts?
3. Should historical conversion depend on a bundled static dataset first, or should it use a connector/data-source flow?
4. Should generated players preserve SMB4's limited two-trait system exactly, or allow richer internal tags that collapse to two visible traits?
5. Should standard-team profile levels be calibrated against official in-game bars if screenshots are provided?

## Implementation Plan

Detailed phased plan:

- `spec-docs/SMB4_GENERATION_IMPLEMENTATION_PLAN.md`
