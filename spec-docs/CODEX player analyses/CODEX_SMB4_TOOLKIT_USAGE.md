# SMB4 Grade Toolkit Usage

## Files
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/CODEX player analyses/CODEX_smb4_grade_toolkit.py`
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/CODEX_SMB4_Grade_Calculator_and_Generator.xlsx`

## What factors are included
The model uses all of the following:
- Primary position
- Secondary position (including combo positions like `IF`, `OF`, `IF/OF`, `1B/OF`)
- Ratings (`POW/CON/SPD/FLD/ARM` for hitters, `VEL/JNK/ACC` for pitchers)
- Pitcher hitting ratings (`POW/CON/SPD`) in pitcher equation
- Pitcher arsenal count and pitch-type flags (`2F`, `4F`, `CB`, `CF`, `CH`, `FK`, `SB`, `SL`)
- `bats` / `throws`
- Trait polarity counts (`positive` vs `negative`)
- Trait-specific modeled coefficients for the traits that materially improved fit

## Accuracy
- Exact-match accuracy on `smb4_players_fixed.csv`: `84.32%` (`371/440`)
- This includes trait normalization fixes for OCR/extraction variants and recognition of `Workhorse` as a positive trait.

## Predict one player from JSON
```bash
python3 '/Users/johnkruse/Projects/kbl-tracker/spec-docs/CODEX player analyses/CODEX_smb4_grade_toolkit.py' predict \
  --player '{"name":"Example","primaryPosition":"SS","secondaryPosition":"2B","bats":"S","throws":"R","trait1":"Utility","trait2":"Fastball Hitter","power":62,"contact":78,"speed":80,"fielding":84,"arm":70}' \
  --pretty
```

## Explain one player from JSON
This returns the exact modeled numeric score, final grade, and the active term-by-term contributions.

```bash
python3 '/Users/johnkruse/Projects/kbl-tracker/spec-docs/CODEX player analyses/CODEX_smb4_grade_toolkit.py' explain-player \
  --player '{"name":"Example","primaryPosition":"SS","secondaryPosition":"IF/OF","bats":"S","throws":"R","trait1":"Utility","trait2":"Fastball Hitter","power":62,"contact":78,"speed":80,"fielding":84,"arm":70}' \
  --pretty
```

The explanation output includes:
- `numeric_score`
- `grade_idx`
- `grade`
- `base_weighted`
- `traits`
- `arsenal_pitches`
- `top_contributions`
- `all_contributions`

## Batch predict from CSV
Input CSV should include player fields like:
- `primaryPosition`, `secondaryPosition`, `bats`, `throws`, `trait1`, `trait2`
- ratings columns (`power`, `contact`, `speed`, `fielding`, `arm`, `velocity`, `junk`, `accuracy`)
- pitchers may also include `arsenal` such as `4F|CF|SL|CH`

```bash
python3 '/Users/johnkruse/Projects/kbl-tracker/spec-docs/CODEX player analyses/CODEX_smb4_grade_toolkit.py' predict-csv \
  --input /path/to/players.csv \
  --output /path/to/graded_players.csv
```

## Generate fictional players (standard mode)
```bash
python3 '/Users/johnkruse/Projects/kbl-tracker/spec-docs/CODEX player analyses/CODEX_smb4_grade_toolkit.py' generate \
  --count 50 \
  --kind mixed \
  --grade B+ \
  --seed 9 \
  --output /Users/johnkruse/Projects/kbl-tracker/spec-docs/CODEX_generated_players.json
```

Optional constraints for standard generation:
- `--primary SS`
- `--secondary IF/OF`
- `--bats S`
- `--throws L`
- `--trait1 "Utility" --trait2 "Fastball Hitter"`

Generated pitchers now include an `arsenal` field automatically.

## Generate fictional players (archetype mode)
This mode builds roster-realistic position mixes and applies archetype-specific grade/stat/trait tendencies.

Archetypes:
- `balanced`
- `power-heavy`
- `speed-defense`
- `bullpen-heavy`

```bash
python3 '/Users/johnkruse/Projects/kbl-tracker/spec-docs/CODEX player analyses/CODEX_smb4_grade_toolkit.py' generate-archetype \
  --archetype speed-defense \
  --count 22 \
  --seed 11 \
  --output /Users/johnkruse/Projects/kbl-tracker/spec-docs/CODEX_generated_speeddef_roster.json
```

Optional fixed grade override:
```bash
python3 '/Users/johnkruse/Projects/kbl-tracker/spec-docs/CODEX player analyses/CODEX_smb4_grade_toolkit.py' generate-archetype \
  --archetype power-heavy \
  --grade B+ \
  --count 22 \
  --seed 11 \
  --output /Users/johnkruse/Projects/kbl-tracker/spec-docs/CODEX_generated_power_roster_bplus.json
```

## Output fields
Prediction output now includes:
- `pred_numeric`: raw numeric score from the improved model
- `pred_grade_idx`: mapped grade index (`0` to `16`)
- `pred_grade`: final grade label

Related spec files:
- Human-readable formula: `/Users/johnkruse/Projects/kbl-tracker/spec-docs/CODEX player analyses/CODEX_SMB4_HUMAN_READABLE_FORMULA_SPEC.md`
- Trait value analysis: `/Users/johnkruse/Projects/kbl-tracker/spec-docs/CODEX player analyses/CODEX_SMB4_TRAIT_VALUE_ANALYSIS.md`
