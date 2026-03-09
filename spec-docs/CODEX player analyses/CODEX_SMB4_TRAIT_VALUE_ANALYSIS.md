# SMB4 Trait Value Analysis

## Scope
This report extends the improved SMB4 hidden-grade emulator by isolating trait value more rigorously.

It answers four questions:
- What is the generic grade value of a positive or negative trait?
- Which traits receive extra hidden weight beyond generic polarity?
- Where do positions matter?
- How should custom-player creation treat traits versus arsenal/secondary-position context?

Reference files:
- Grading toolkit: `/Users/johnkruse/Projects/kbl-tracker/spec-docs/CODEX player analyses/CODEX_smb4_grade_toolkit.py`
- Trait value table: `/Users/johnkruse/Projects/kbl-tracker/spec-docs/CODEX player analyses/CODEX_smb4_trait_values.csv`
- Billy Yank guide used for polarity and trait meaning: `/Users/johnkruse/Projects/kbl-tracker/spec-docs/BillyYank Super Mega Baseball Guide 3rd Edition.docx`

## Executive Findings
1. The grade model does not value traits purely by Billy Yank gameplay quality. It values them by how SMB4's shipped roster appears to encode overall player grade.
2. Most traits are not position-specific in the hidden-grade model. They are usually only player-type-specific:
- hitters: one generic positive-trait increment, one generic negative-trait decrement
- pitchers: one generic positive-trait increment, one generic negative-trait decrement
3. Only a small subset of traits carry extra hidden weight beyond generic polarity.
4. Secondary-position context matters materially for `Utility`.
5. Pitcher arsenal context matters separately from pitcher traits. An elite pitch trait and the corresponding pitch in the arsenal are two different additive inputs.

## Model Fit
After tightening trait normalization and recognizing `Workhorse` as a real positive trait, the exact-match fit against the fixed 440-player SMB4 roster is:
- overall: `84.32%` (`371/440`)
- hitters: improved fitted model remains the same structural class, with trait effects now better normalized
- pitchers: improved fitted model remains the same structural class, with trait effects now better normalized

## Core Trait Calculus
Trait value in the model works in layers.

### Hitters
For each hitter trait:
- generic positive trait value: `+0.9657`
- generic negative trait value: `-1.7518`

If the trait is one of the specifically modeled hitter traits, add its extra coefficient on top of the generic value.

Formula:
```text
hitter_trait_effect =
  generic_polarity_effect
  + trait_specific_adjustment
  + versatility_interaction_if_Utility
```

### Pitchers
For each pitcher trait:
- generic positive trait value: `+1.2139`
- generic negative trait value: `-1.1653`

If the trait is one of the specifically modeled pitcher traits, add its extra coefficient on top of the generic value.

Formula:
```text
pitcher_trait_effect =
  generic_polarity_effect
  + trait_specific_adjustment
```

## Hitter Traits With Extra Hidden Weight
These totals already include the hitter generic positive/negative base.

| Trait | Total Grade Effect |
|---|---:|
| `Fastball Hitter` | `+3.4199` |
| `Mind Gamer` | `+2.4671` |
| `First Pitch Slayer` | `+1.6643` |
| `Rally Starter` | `+0.7658` |
| `Big Hack` | `+0.7464` |
| `Sprinter` | `+0.6840` |
| `Utility` | `+0.6605 + 0.1909 * versatility` |
| `Bad Ball Hitter` | `+0.5064` |
| `Cannon Arm` | `+0.4239` |
| `Magic Hands` | `+0.1346` |
| `Little Hack` | `-0.3051` |
| `Whiffer` | `-2.4899` |

All other recognized hitter positive traits default to `+0.9657`.

All other recognized hitter negative traits default to `-1.7518`.

## Pitcher Traits With Extra Hidden Weight
These totals already include the pitcher generic positive/negative base.

| Trait | Total Grade Effect |
|---|---:|
| `Specialist` | `+3.3679` |
| `Gets Ahead` | `+2.2459` |
| `K Collector` | `+2.1226` |
| `Elite CF` | `+1.9718` |
| `Elite FK` | `+1.6993` |
| `Elite 4F` | `+1.6306` |
| `Elite CB` | `+0.9819` |
| `Elite 2F` | `+0.6858` |
| `Volatile` | `+0.4863` |
| `Crossed Up` | `+0.3976` |
| `Rally Stopper` | `+0.0810` |
| `Falls Behind` | `-2.1629` |

All other recognized pitcher positive traits default to `+1.2139`.

All other recognized pitcher negative traits default to `-1.1653`.

## Important Interpretation Warning
The hidden-grade model and Billy Yank gameplay advice are not identical concepts.

Examples:
- `Volatile` is a negative gameplay trait in Billy Yank, but the fitted hidden-grade model gives it a net positive grade effect.
- `Crossed Up` is also gameplay-negative, but still nets positive in the fitted grade model.
- `Little Hack` is treated as positive in Billy Yank polarity, but the fitted grade model gives it a slight negative marginal grade effect.

Interpretation:
- If your goal is to emulate SMB4 roster-grade assignment, use the fitted marginal values.
- If your goal is to estimate on-field usefulness, use Billy Yank gameplay guidance separately.

This distinction is not a contradiction. It implies SMB4's stock roster grading appears to encode some traits inconsistently relative to pure gameplay value, or the fitted model is absorbing roster-construction patterns rather than literal game-code intent.

## Where Position Context Matters
Primary position does not create separate trait coefficients for hitters beyond the hitter/pitcher split.

That means:
- `Fastball Hitter` carries the same modeled grade delta for a `1B` and a `SS`
- `Specialist` carries the same modeled grade delta for a `SP`, `RP`, or `CP`

The main context-sensitive cases are:

### 1. `Utility`
`Utility` is the only hitter trait with an explicit secondary-position interaction:

```text
Utility total effect = 0.6605 + 0.1909 * versatility
```

Secondary-position versatility values in the model:
- none: `0`
- single-position secondaries like `1B`, `2B`, `3B`, `C`, `LF`, `RF`, `SS`: `1`
- `OF`: `3`
- `IF`, `1B/OF`: `4`
- `IF/OF`: `7`

Resulting `Utility` totals:

| Secondary | Versatility | Utility Effect |
|---|---:|---:|
| none | `0` | `+0.6605` |
| single secondary | `1` | `+0.8514` |
| `OF` | `3` | `+1.2333` |
| `IF` or `1B/OF` | `4` | `+1.4242` |
| `IF/OF` | `7` | `+1.9970` |

### 2. Pitcher Elite Traits Versus Arsenal
Pitcher elite traits and arsenal pitch flags are separate additive factors.

Example:
- `Elite CF` trait alone: `+1.9718`
- `CF` pitch present in arsenal: `+0.4593`
- if both are present: combined contribution `+2.4311`

Combined elite-pitch examples:

| Trait + Matching Pitch | Combined Effect |
|---|---:|
| `Elite 4F` + `4F` | `+2.2628` |
| `Elite 2F` + `2F` | `+1.1590` |
| `Elite CF` + `CF` | `+2.4311` |
| `Elite CB` + `CB` | `+1.1814` |
| `Elite FK` + `FK` | `+1.2110` |

Important implication for custom-player creation:
- Do not assume an elite pitch trait automatically implies the arsenal pitch.
- If you want the grade emulator to value both, specify both.

## Trait Normalization Fixes
The fixed roster still contains extraction or OCR variants. These are now normalized in the toolkit before scoring:

| Source Value | Normalized To |
|---|---|
| `Con vs LHP` | `CON vs LHP` |
| `Con vs RHP` | `CON vs RHP` |
| `Con vs RPH` | `CON vs RHP` |
| `CON vs RPH` | `CON vs RHP` |
| `POW vs PHP` | `POW vs RHP` |
| `Slowpoke` | `Slow Poke` |
| `East Target` | `Easy Target` |
| `Base Rounds` | `Base Rounder` |
| `Clitch` | `Clutch` |

Additionally:
- `Workhorse` is now treated as a recognized positive trait.

That classification is an inference from Billy Yank's guide description of `Workhorse` as a beneficial stamina trait and from improved roster-fit behavior after normalization.

## Practical Rules For Custom Players
If you are creating custom players and want grade estimates that track SMB4's shipped roster logic:

1. Start with ratings and position first.
2. Add generic positive traits expecting:
- hitters: about `+0.97`
- pitchers: about `+1.21`
3. Add generic negative traits expecting:
- hitters: about `-1.75`
- pitchers: about `-1.17`
4. Treat these as special high-impact hitter traits:
- `Fastball Hitter`
- `Mind Gamer`
- `First Pitch Slayer`
- `Utility` with strong secondary-position coverage
5. Treat these as special high-impact pitcher traits:
- `Specialist`
- `Gets Ahead`
- `K Collector`
- `Elite CF`
- `Elite 4F`
- `Elite FK`
6. If a pitcher has an elite pitch trait, add the matching pitch to the arsenal explicitly if you want the full modeled grade effect.

## Deliverable Files
- Trait report: `/Users/johnkruse/Projects/kbl-tracker/spec-docs/CODEX player analyses/CODEX_SMB4_TRAIT_VALUE_ANALYSIS.md`
- Trait value CSV: `/Users/johnkruse/Projects/kbl-tracker/spec-docs/CODEX player analyses/CODEX_smb4_trait_values.csv`

## Honest Limits
This is still reverse engineering from observed roster outcomes, not proof of SMB4's literal internal grading source code.

The strongest conclusions here are:
- generic polarity is real
- some specific traits clearly receive extra hidden weight
- secondary versatility matters through `Utility`
- arsenal and trait effects are separate for pitchers

The weakest conclusions are:
- interpreting positive net weight on gameplay-negative traits as intentional game design rather than a roster-fitting artifact
- assuming every unmodeled trait has exactly the same internal game-code weight, rather than only the same fitted marginal effect in this emulator
