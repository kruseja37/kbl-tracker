# SMB4 Generation Implementation Plan

Status: Draft
Created: 2026-05-19
Owner: KBL Tracker

Related specs:

- `spec-docs/SMB4_PLAYER_GENERATION_ENGINE_SPEC.md`
- `spec-docs/SMB4_TEAM_PROFILE_ENGINE_SPEC.md`
- `spec-docs/SMB4_GRADE_MODEL_V2_AUDIT.md`
- `spec-docs/SMB4_GRADE_RESIDUAL_AUDIT.md`
- `spec-docs/HISTORICAL_PLAYER_CONVERSION_SPEC.md`

## Goal

Replace the old ad hoc CODEX player-analysis package with a reliable, tested, TypeScript-native generation system that can:

- emulate SMB4 stock roster grades
- generate players in target grade bands
- generate teams matching standard-team profiles
- convert historical player profiles into SMB4-style players

The implementation should preserve the existing `src/engines/gradeEngine.ts` until consumers are intentionally migrated. The SMB4 emulator should live beside it as a new engine, not silently change existing grade behavior.

## Definition Of Better

The new system is better than the old CODEX package only if it improves reliability, reproducibility, and usability.

### Reliability

- reports train, cross-validation, and leave-team-out accuracy
- does not present training accuracy as the full truth
- keeps model coefficients/version metadata with the engine
- includes golden fixtures
- exposes warnings for low-confidence generated players

### Reproducibility

- deterministic generation with seeds
- no hidden spreadsheet dependency
- no stale prediction CSV as source of truth
- all formulas and profile levels reproducible from source CSV

### Usability

- supports direct requests like "10 B- players, each with one trait"
- supports team targets like "make a Sandcats-like team"
- explains generated grades
- returns failure reasons when constraints are too tight

## Phase 0: Data Lock And Audit

Deliverables:

- fixture loader for `spec-docs/data/smb4_players_fixed.csv`
- typed player row parser
- normalization report
- stale artifact note for old prediction CSV

Tasks:

1. Confirm all 440 rows parse.
2. Extract team name from `notes`.
3. Normalize traits, secondary positions, and arsenals.
4. Verify roster counts by team.
5. Verify grade labels and gradeWeight mapping.
6. Emit a data audit JSON or markdown report.

Acceptance:

- no unknown primary positions
- all standard teams have 22 players
- all players have valid grade labels
- known old OCR variants normalize correctly

## Phase 1: Grade Emulator V1 Port

Status: Implemented

Deliverables:

- `src/engines/smb4GradeEmulator.ts`
- `src/engines/__tests__/smb4GradeEmulator.test.ts`
- `src/data/smb4GradeModel.ts` or equivalent coefficient data module

Tasks:

1. Port the final CODEX fitted model to TypeScript.
2. Preserve normalization behavior.
3. Preserve numeric-score-to-nearest-grade-center behavior.
4. Add `scoreSmb4Player`.
5. Add `explainSmb4Player`.
6. Add fixture tests against named stock players.

Acceptance:

- TypeScript emulator reproduces Python toolkit predictions on the fixed CSV.
- Overall exact match against source roster is approximately 84.32 percent for the ported model.
- Within-one-grade match is at least 99 percent.
- Explanation contributions sum to numeric score within tolerance.

## Phase 2: Model Research V2

Status: Implemented as calibrated ordinal thresholds

Deliverables:

- model comparison report
- selected V2 model coefficients or model parameters
- validation report with cross-validation and leave-team-out metrics

Candidate models:

- regularized linear numeric model
- elastic net
- ordinal logistic or ordinal calibration layer
- monotonic gradient boosting, only if explainability remains acceptable
- lightweight ensemble, only if validation improves materially

Tasks:

1. Reproduce old model metrics.
2. Run k-fold validation.
3. Run leave-one-team-out validation.
4. Run feature ablations:
   - no traits
   - no handedness
   - no arsenal flags
   - no position flags
   - no interaction terms
5. Bootstrap coefficients to detect unstable trait effects.
6. Compare V1 and V2 by exact, within-one, calibration, and miss direction.
7. Choose the simplest model that wins on validation.

Acceptance:

- validation results are documented
- selected model is not chosen solely by training accuracy
- miss report includes player names and reasons for manual review
- if V2 does not beat V1 honestly, keep V1 and document why

Implementation note:

- The selected V2 keeps the V1 numeric score model and replaces nearest-center grade labels with roster-calibrated ordinal thresholds.
- Fixed-roster exact accuracy improved from `371 / 440` to `387 / 440` while preserving `439 / 440` within-one-grade.
- More flexible models were rejected because they improved training fit without improving validation reliability.

## Phase 3: Player Generator

Status: Implemented first pass

Deliverables:

- `src/engines/smb4PlayerGenerator.ts`
- `src/engines/__tests__/smb4PlayerGenerator.test.ts`
- generation request/result types

Tasks:

1. Build empirical priors from stock roster:
   - rating distribution by position and grade
   - trait count by grade and role
   - secondary-position distribution by primary position
   - handedness distribution by player type
   - arsenal count and pitch mix by pitcher role
2. Implement seeded random utilities.
3. Implement candidate sampling.
4. Implement hard constraints.
5. Implement grade-target local search.
6. Implement realism penalty.
7. Implement batch generation.

Acceptance:

- "10 B- players across positions with exactly one trait" succeeds deterministically with a seed
- generated ratings stay in `0..99`
- no duplicate traits
- target grade hit rate is at least 95 percent for feasible unconstrained batches
- impossible requests return structured failure reasons

## Phase 4: Team Profile Engine

Status: Implemented

Deliverables:

- `src/engines/smb4TeamProfileEngine.ts`
- `src/data/smb4StandardTeamProfiles.ts`
- `src/engines/__tests__/smb4TeamProfileEngine.test.ts`

Tasks:

1. Implement v1 category formulas.
2. Implement `0..6` min-max calibration.
3. Generate canonical profiles for all 20 standard teams.
4. Add profile-distance metric.
5. Add warnings for incomplete rosters.

Acceptance:

- every standard team profile matches the table in `SMB4_TEAM_PROFILE_ENGINE_SPEC.md`
- each category has at least one team at level 0 and one at level 6
- calculation is deterministic
- profile engine requires only player data, not UI state

## Phase 5: Team Generator

Status: Implemented first pass

Deliverables:

- roster-level generation in `src/engines/smb4PlayerGenerator.ts` or a new `src/engines/smb4RosterGenerator.ts`
- team generation tests
- standard-team roster templates with source position order and grade distribution
- deterministic generated-roster report exports in `spec-docs/generated/`

Tasks:

1. Implement standard 22-player roster templates.
2. Implement grade-distribution targets from standard teams.
3. Implement profile-level targets.
4. Generate candidate rosters.
5. Optimize roster profile distance with swaps/regeneration.
6. Return profile comparison in result.

Acceptance:

- "generate team like Sandcats" returns a valid 22-player roster with matching or near-matching profile levels when paired with a compatible grade plan
- "generate team with power 5, contact 3, speed 1, rotation 4, bullpen 2" returns a valid roster or a failure reason
- generated teams satisfy position counts before profile scoring
- generated roster can be rescored independently
- standard-team clone requests default to that team's real SMB4 position and grade template
- generated roster reports expose target and generated profile codes, profile bars, player rows, and CSV/Markdown/JSON artifacts

Implemented report command:

```bash
npm run export:smb4-generated-roster
```

## Phase 6: Historical Converter

Status: Implemented first pass

Deliverables:

- `src/engines/historicalPlayerConverter.ts`
- `src/engines/historicalPlayerSourceAdapters.ts`
- source adapter interfaces with provenance metadata
- manual JSON adapter
- Lahman CSV adapter
- golden fixtures

Tasks:

1. Define source record type.
2. Implement percentile-to-rating curve.
3. Implement hitter conversion.
4. Implement pitcher conversion.
5. Implement trait inference.
6. Implement confidence reporting.
7. Add fixture profiles for hand-reviewed historical examples.

Acceptance:

- converter accepts resolved source records
- converter does not require live internet
- output can be scored by SMB4 grade emulator
- confidence notes identify inferred fields

Implementation notes:

- `resolveHistoricalPlayerByName` supports local candidate lookup against caller-provided records.
- `convertHistoricalPlayerToSmb4` accepts resolved percentile records and supports `career`, `peak`, and `hybrid` modes.
- `createManualHistoricalSourceRecord` wraps curated records with provenance metadata.
- `buildHistoricalSourcesFromLahmanCsv` converts caller-provided Lahman-style CSV text into percentile source records without live fetching.
- Hitter conversion maps power/contact/speed/fielding/arm percentiles to SMB4 ratings.
- Pitcher conversion maps velocity/junk/accuracy signals and infers role-appropriate arsenals.
- Golden tests currently use synthetic resolved records shaped like a speed/on-base star and an elite starter, plus miniature Lahman-style CSV fixtures.

## Phase 7: UI And Workflow Integration

Deliverables:

- player generation UI entry point
- team generation UI entry point
- profile bar display component
- historical conversion form or import flow

Tasks:

1. Add profile bar component using `0..6` levels.
2. Add generation request builder.
3. Add generated-player review screen.
4. Add generated-team review screen.
5. Add historical-player conversion review screen.
6. Keep all generated outputs editable before save.

Acceptance:

- UI can generate and review individual player batches
- UI can generate and review full teams
- team bars render from engine output
- no generated player is persisted without user confirmation

## Suggested File Map

```text
src/engines/smb4GradeEmulator.ts
src/engines/smb4PlayerGenerator.ts
src/engines/smb4TeamProfileEngine.ts
src/engines/historicalPlayerConverter.ts
src/data/smb4GradeModel.ts
src/data/smb4StandardTeamProfiles.ts
src/engines/__tests__/smb4GradeEmulator.test.ts
src/engines/__tests__/smb4PlayerGenerator.test.ts
src/engines/__tests__/smb4TeamProfileEngine.test.ts
src/engines/__tests__/historicalPlayerConverter.test.ts
```

Optional analysis/tooling:

```text
scripts/smb4/analyze-grade-model.ts
scripts/smb4/derive-team-profiles.ts
scripts/smb4/generate-fixtures.ts
spec-docs/generated/smb4-grade-validation-report.md
spec-docs/generated/smb4-team-profile-baseline.json
spec-docs/generated/smb4_generated_sandcats_roster.json
spec-docs/generated/smb4_generated_sandcats_roster.csv
spec-docs/generated/smb4_generated_sandcats_roster.md
```

## Testing Strategy

### Unit Tests

- normalization
- grade center mapping
- feature construction
- contribution summing
- profile level calibration
- percentile-to-rating mapping
- trait inference rules

### Fixture Tests

- fixed known SMB4 players
- fixed standard team profiles
- generated batch with seed
- generated roster with seed
- historical conversion examples

### Statistical Tests

These should not be brittle unit tests, but repeatable scripts/reports.

- training accuracy
- k-fold validation
- leave-team-out validation
- generated grade hit rate
- generated profile distance distribution
- realism penalty distribution

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Model overfits 440 players | Generated players feel weird | Use validation and realism priors |
| Trait coefficients absorb roster quirks | Misleading generation | Bootstrap coefficients and separate gameplay notes from grade emulator |
| Team bars do not match official game bars | UI may feel off | Keep calibration replaceable; use screenshots if available |
| Historical source data is incomplete | Bad conversion confidence | Source adapter boundary plus confidence notes |
| Tight constraints cannot be satisfied | User confusion | Structured failure reasons and suggested relaxations |
| Existing app depends on old grade logic | Regressions | Add new engine beside old engine and migrate intentionally |

## Immediate Next Work

1. Implement `smb4GradeEmulator.ts` as a direct port of the final CODEX model.
2. Add fixture loader and validation tests.
3. Implement `deriveTeamProfile` and generate canonical standard profiles.
4. Build a minimal seeded generator that can satisfy simple grade and trait constraints.
5. Revisit model research once the reproducible baseline is safely in TypeScript.
