# SMB4 Grade Model V2 Audit

Status: Implemented
Created: 2026-05-19

## Purpose

This audit records the first true improvement pass after porting the older CODEX SMB4 model into TypeScript.

The baseline was the final old fitted model:

- exact grade matches: `371 / 440 = 84.32%`
- within-one-grade matches: `439 / 440 = 99.77%`
- hitters exact: `213 / 261 = 81.61%`
- pitchers exact: `158 / 179 = 88.27%`

## Result

V2 keeps the same numeric score model and replaces the naive nearest-grade-center mapping with calibrated ordinal thresholds derived from the fixed 440-player SMB4 roster.

V2 fixture accuracy:

- exact grade matches: `387 / 440 = 87.95%`
- within-one-grade matches: `439 / 440 = 99.77%`
- hitters exact: `226 / 261 = 86.59%`
- pitchers exact: `161 / 179 = 89.94%`

This is a real improvement over the old model on known SMB4 roster reconstruction without adding opaque player/team memorization.

## Calibrated Thresholds

The threshold values below are boundaries between adjacent grade labels, ordered high to low. Scores greater than or equal to the boundary receive the higher grade.

| Boundary | Threshold | Source |
|---|---:|---|
| S / A+ | 94.72633393739702 | roster calibration |
| A+ / A | 88.957761254456 | roster calibration |
| A / A- | 84.732864109651 | roster calibration |
| A- / B+ | 79.62964703342399 | roster calibration |
| B+ / B | 74.142834774099 | roster calibration |
| B / B- | 69.610982426318 | roster calibration |
| B- / C+ | 65.03540988761 | roster calibration |
| C+ / C | 59.79743670891699 | roster calibration |
| C / C- | 54.29331927653399 | roster calibration |
| C- / D+ | 49.61061339815299 | roster calibration |
| D+ / D | 47.450133899979996 | roster calibration |
| D / D- | 39.5 | center fallback |
| D- / E+ | 34.5 | center fallback |
| E+ / E | 29.5 | center fallback |
| E / E- | 24.5 | center fallback |
| E- / F | 18.5 | center fallback |

The fixed SMB4 standard-team dataset contains no grades below `D`, so lower-tail boundaries remain center fallbacks instead of pretending to infer unsupported thresholds.

## Candidate Models Tested

The following alternatives were tested and rejected for the production emulator:

- richer ridge regressions with all trait flags, position flags, pitch flags, rating interactions, and trait/category synergies
- Huber regression
- gradient boosting regression/classification
- random forest and extra-trees regression/classification
- multinomial logistic regression
- k-nearest-neighbor classifiers/regressors on score and richer feature spaces
- hitter/pitcher split versions of the above

Many flexible candidates raised training accuracy, but their cross-validation behavior was worse than the simpler fitted score model. The best rejected models were useful as diagnostics but too unstable for a generator whose output should feel like SMB4 rather than like a memorized roster table.

## Validation Notes

Repeated split tests using the existing fitted numeric score showed that the calibrated threshold layer improves full-roster reconstruction but should not be overclaimed as a broad generalization breakthrough:

- nearest center mapping mean split exact: about `84.3%`
- all-player calibrated threshold mean split exact: about `84.1%`
- hitter/pitcher separate calibrated thresholds overfit more and were rejected despite higher full-roster exact accuracy

The chosen V2 is therefore intentionally modest:

- improve exact reconstruction of the known standard roster
- keep the continuous score explanation unchanged
- avoid team identifiers or names
- preserve center fallback mapping for lower unsupported grades
- expose the old center mapping for audit comparisons

## Implementation

Implemented in:

- `src/engines/smb4GradeEmulator.ts`

Important public API behavior:

- `scoreSmb4Player(player)` now uses calibrated thresholds by default.
- `scoreSmb4Player(player, { gradeMapping: "center" })` uses the old nearest-center mapping.
- `numericScoreToSmb4Grade(score)` now uses calibrated thresholds by default.
- `numericScoreToSmb4Grade(score, { gradeMapping: "center" })` preserves the old mapping.

