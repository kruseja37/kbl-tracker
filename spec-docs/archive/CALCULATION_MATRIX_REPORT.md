# Calculation Matrix Report

**Date**: 2026-02-09
**Test Framework**: Vitest 4.0.18
**Total**: 109 golden cases across 8 engines — **109/109 PASS**

---

## Summary

| Engine | File | Cases | Pass | Fail | Flags |
|--------|------|-------|------|------|-------|
| bWAR | `bwarCalculator.matrix.test.ts` | 15 | 15 | 0 | 1 (NaN input) |
| pWAR | `pwarCalculator.matrix.test.ts` | 15 | 15 | 0 | 1 (NaN input) |
| fWAR | `fwarCalculator.matrix.test.ts` | 12 | 12 | 0 | 0 |
| rWAR | `rwarCalculator.matrix.test.ts` | 13 | 13 | 0 | 1 (NaN input) |
| mWAR | `mwarCalculator.matrix.test.ts` | 12 | 12 | 0 | 0 |
| Salary | `salaryCalculator.matrix.test.ts` | 15 | 15 | 0 | 2 (MAX_SALARY exceed) |
| Mojo | `mojoEngine.matrix.test.ts` | 14 | 14 | 0 | 0 |
| Fitness | `fitnessEngine.matrix.test.ts` | 13 | 13 | 0 | 0 |

Test location: `src/src_figma/__tests__/engines/*.matrix.test.ts`

---

## Flagged Issues

### FLAG-1: NaN Propagation (bWAR, pWAR, rWAR)
- **Severity**: LOW (defensive-coding gap, not a runtime bug)
- **Cases**: BW-14, PW-14, RW-12
- **Behavior**: When NaN is passed for core stats (PA, IP, SB), the engines propagate NaN through to the WAR output instead of returning 0 or throwing.
- **Impact**: Only triggered by malformed input. Normal gameplay will never produce NaN stats. Would only matter if upstream data corruption occurs.
- **Recommendation**: Optional — add `isNaN()` guards at engine entry points.

### FLAG-2: Salary Exceeds MAX_SALARY (salaryCalculator)
- **Severity**: MEDIUM (calculation cap not enforced)
- **Cases**: SAL-02, SAL-12
- **Behavior**: `calculateSalary()` does NOT clamp output to `MAX_SALARY` (50).
  - All-99 batter (SS): returns **54.7** (exceeds by 9.4%)
  - All-99 batter (C): returns **56.1** (exceeds by 12.2%)
  - All-99 pitcher: returns ≤50 (within bounds)
- **Root cause**: The exponential formula `(weightedRating/100)^2.5 * 50` plus position multiplier can exceed 50 for max-rated position players at premium positions.
- **Impact**: Elite players may have salaries displayed above the documented maximum. Could affect salary cap calculations in franchise mode.
- **Recommendation**: Add `Math.min(MAX_SALARY, result)` clamp at end of `calculateSalary()`.

---

## Engine Details

### bWAR Calculator (15 cases)

| Case | Description | Result | Notes |
|------|-------------|--------|-------|
| BW-01 | 0 PA → bWAR = 0 | PASS | Returns exactly 0.0 |
| BW-02 | 1 PA walk → tiny finite bWAR | PASS | Small positive value |
| BW-03 | League-average 300 PA → ~0 WAR | PASS | Near replacement level |
| BW-04 | Elite slugger 350 PA → high WAR | PASS | Returns significant positive WAR |
| BW-05 | All strikeouts → negative WAR | PASS | Below replacement |
| BW-06 | All home runs → very high WAR | PASS | Extreme positive |
| BW-07 | All walks → positive WAR | PASS | OBP-based value |
| BW-08 | RPW scales with season length | PASS | 50 games → 3.09 RPW |
| BW-09 | Replacement level = 12 runs/600PA | PASS | Uses Math.abs internally |
| BW-10 | wOBA calculation produces finite result | PASS | |
| BW-11 | wRAA calculation finite | PASS | |
| BW-12 | Short season (20 games) | PASS | RPW = 1.23 |
| BW-13 | Large PA (600) | PASS | Full season equivalent |
| BW-14 | NaN inputs | PASS | **FLAG**: Propagates NaN |
| BW-15 | Negative PA → handles gracefully | PASS | Produces finite result |

### pWAR Calculator (15 cases)

| Case | Description | Result | Notes |
|------|-------------|--------|-------|
| PW-01 | 0 IP → pWAR = 0 | PASS | |
| PW-02 | 0.1 IP minimal → finite pWAR | PASS | |
| PW-03 | Typical SP (180 IP, 3.50 ERA) | PASS | Positive WAR |
| PW-04 | Typical RP (60 IP, 3.00 ERA) | PASS | Positive WAR |
| PW-05 | Cy Young line → high pWAR | PASS | |
| PW-06 | Worst pitcher (9 IP, 15.00 ERA) | PASS | Very negative WAR |
| PW-07 | Perfect K line → high pWAR | PASS | |
| PW-08 | FIP formula validation | PASS | Matches manual calculation |
| PW-09 | Role detection (SP vs RP) | PASS | |
| PW-10 | Replacement level (SP vs RP) | PASS | SP: 0.12, RP: 0.03 |
| PW-11 | Leverage multiplier for relievers | PASS | |
| PW-12 | RPW scaling with season length | PASS | |
| PW-13 | High IP season (250) | PASS | |
| PW-14 | NaN IP input | PASS | **FLAG**: Propagates NaN |
| PW-15 | Negative IP → handles gracefully | PASS | |

### fWAR Calculator (12 cases)

| Case | Description | Result | Notes |
|------|-------------|--------|-------|
| FW-01 | 0 fielding events → near-zero fWAR | PASS | Positional adj only |
| FW-02 | Single routine putout → tiny positive | PASS | |
| FW-03 | Single infield assist → positive | PASS | |
| FW-04 | Fielding error → negative value | PASS | |
| FW-05 | Mental error → worse than fielding error | PASS | |
| FW-06 | Diving catch > routine putout | PASS | Difficulty multiplier works |
| FW-07 | Robbed HR → highest value play | PASS | |
| FW-08 | Gold Glove SS stats → positive fWAR | PASS | |
| FW-09 | DH position → fWAR ≤ 0 | PASS | Negative positional adj |
| FW-10 | Many errors → negative fWAR | PASS | |
| FW-11 | RPW matches bWAR formula | PASS | 10 × (games/162) |
| FW-12 | Constants sanity check | PASS | routine=1.0, robbedHR > diving |

### rWAR Calculator (13 cases)

| Case | Description | Result | Notes |
|------|-------------|--------|-------|
| RW-01 | 0 SB, 0 CS → rWAR ≈ 0 | PASS | |
| RW-02 | SB-only → positive rWAR | PASS | |
| RW-03 | CS-only → negative rWAR | PASS | |
| RW-04 | 10 SB / 5 CS → ~break-even | PASS | ~66% success rate |
| RW-05 | Success rate above break-even | PASS | |
| RW-06 | GIDP impact on rWAR | PASS | Reduces value |
| RW-07 | Elite baserunner (40 SB / 5 CS) | PASS | High positive |
| RW-08 | Terrible baserunner (5 SB / 20 CS) | PASS | Deeply negative |
| RW-09 | RPW scaling | PASS | 10 × (games/162) |
| RW-10 | wSB positive for net positive | PASS | |
| RW-11 | Zero opportunities → zero wSB | PASS | |
| RW-12 | NaN inputs | PASS | **FLAG**: Propagates NaN |
| RW-13 | Constants sanity check | PASS | |

### mWAR Calculator (12 cases)

| Case | Description | Result | Notes |
|------|-------------|--------|-------|
| MW-01 | 0 decisions → decisionWAR = 0 | PASS | |
| MW-02 | Successful pitching change → positive | PASS | |
| MW-03 | Bad pitching change → negative | PASS | |
| MW-04 | Neutral decision → near-zero | PASS | |
| MW-05 | Team overperformance (.600 vs .500) | PASS | Positive overperformance |
| MW-06 | Team underperformance (.400) | PASS | Negative overperformance |
| MW-07 | 50-0 team → max overperformance | PASS | |
| MW-08 | Salary score calculation | PASS | Higher salary → higher score |
| MW-09 | Expected win pct scales with salary | PASS | |
| MW-10 | Full season mWAR (20 mixed decisions) | PASS | Uses DecisionGameState |
| MW-11 | MWAR_WEIGHTS sum to 1.0 | PASS | decision + overperformance |
| MW-12 | Rating tiers ordered | PASS | Excellent ≠ Poor |

### Salary Calculator (15 cases)

| Case | Description | Result | Notes |
|------|-------------|--------|-------|
| SAL-01 | All 0-rated batter → MIN_SALARY | PASS | Clamped at floor |
| SAL-02 | All 99-rated batter → near MAX | PASS | **FLAG**: Returns 54.7 (>50) |
| SAL-03 | All 0-rated pitcher → MIN_SALARY | PASS | |
| SAL-04 | All 99-rated pitcher → ≤ MAX | PASS | Within bounds |
| SAL-05 | C > DH position multiplier | PASS | C=1.15, DH=0.88 |
| SAL-06 | SS salary > 1B salary (same ratings) | PASS | |
| SAL-07 | Batter weighted rating 30/30/20/10/10 | PASS | Exact formula match |
| SAL-08 | Pitcher batting bonus thresholds | PASS | 3 tiers: 70→1.50, 55→1.25, 40→1.10 |
| SAL-09 | Age factor: prime > young > old | PASS | Peak at 27 |
| SAL-10 | Personality modifiers exist (5+ types) | PASS | |
| SAL-11 | Trait modifiers (positive/negative) | PASS | |
| SAL-12 | Salary clamping check | PASS | **FLAG**: Max C player = 56.1 (>50) |
| SAL-13 | Expected WAR scales with rating | PASS | Returns {total, batting, fielding, baserunning} |
| SAL-14 | formatSalary produces readable string | PASS | |
| SAL-15 | Bust/comeback score calculation | PASS | |

### Mojo Engine (14 cases)

| Case | Description | Result | Notes |
|------|-------------|--------|-------|
| MJ-01 | 5 state multipliers correct | PASS | -2:0.82, -1:0.90, 0:1.00, +1:1.10, +2:1.18 |
| MJ-02 | Each level has name and state | PASS | |
| MJ-03 | applyMojoToStat rounds to int | PASS | Math.round(base × mult) |
| MJ-04 | Base stat 0 → always 0 | PASS | |
| MJ-05 | HOME_RUN trigger → positive delta | PASS | |
| MJ-06 | STRIKEOUT trigger → negative delta | PASS | |
| MJ-07 | Mojo clamped at +2 ceiling | PASS | |
| MJ-08 | Mojo clamped at -2 floor | PASS | |
| MJ-09 | Carryover regresses toward 0 | PASS | JACKED→lower, RATTLED→higher |
| MJ-10 | Carryover rate = 0.3 | PASS | |
| MJ-11 | isValidMojoLevel validation | PASS | Integer -2 to +2 only |
| MJ-12 | clampMojo handles out-of-range | PASS | Rounds and clamps |
| MJ-13 | inferMojoTriggers for HR | PASS | Returns HOME_RUN trigger |
| MJ-14 | MOJO_STATES has all 5 levels | PASS | |

### Fitness Engine (13 cases)

| Case | Description | Result | Notes |
|------|-------------|--------|-------|
| FIT-01 | 6 state multipliers correct | PASS | JUICED:1.20, FIT:1.00, WELL:0.95, STRAINED:0.85, WEAK:0.70, HURT:0.00 |
| FIT-02 | Value-to-state mapping full range | PASS | 0-120 mapped to 6 states |
| FIT-03 | canPlay: HURT=false, FIT/JUICED/WEAK=true | PASS | |
| FIT-04 | isRiskyToPlay: WEAK/STRAINED=true, FIT=false | PASS | |
| FIT-05 | Stat application matches multiplier | PASS | 80×FIT=80, 80×JUICED=96 |
| FIT-06 | Base stat 0 → always 0 | PASS | |
| FIT-07 | Playing causes decay (negative delta) | PASS | Started 9 innings → -3 |
| FIT-08 | Not playing → recovery (positive delta) | PASS | Rest → +2 recovery |
| FIT-09 | Profile creation with defaults | PASS | currentValue=100, currentFitness=FIT |
| FIT-10 | Season start → JUICED (first 10 games) | PASS | currentValue=120, cooldown=10 |
| FIT-11 | Lower fitness → higher injury risk | PASS | FIT: 1% LOW, WEAK: 15% EXTREME |
| FIT-12 | Juiced eligibility check | PASS | Returns boolean |
| FIT-13 | FITNESS_STATES has all 6 entries | PASS | |

---

## Key API Discoveries

These are non-obvious API behaviors discovered during testing that may affect downstream consumers:

### Sign Conventions
- **bWAR**: `getReplacementLevelRuns(600)` returns **+12** (uses `Math.abs`), not -12
- **Fitness decay**: Negative = fitness loss, positive = recovery gain. Value is ADDED to currentValue.

### Return Types
- **calculateExpectedWAR()**: Returns `{ total, batting?, fielding?, baserunning?, pitching? }` — NOT `{ expectedWAR }`
- **createFitnessProfile()**: Returns `{ currentValue, currentFitness, ... }` — NOT `{ fitnessValue, fitnessState }`
- **calculateInjuryRisk()**: Returns `{ chance, severityModifier, riskLevel, recommendation }` — NOT `{ probability }`

### Enum / Type Values
- **mWAR DecisionOutcome**: lowercase `'success'`, `'failure'`, `'neutral'` (not uppercase)
- **mWAR DecisionType**: lowercase with underscore `'pitching_change'` (not `'PITCHING_CHANGE'`)
- **mWAR gameState**: Requires `runners: { first, second, third }` + `homeScore/awayScore` (not `score: { home, away }`)
- **fWAR Difficulty**: `'diving'`, `'robbedHR'`, `'wall'` (camelCase, not snake_case)

### Design Decisions
- **Season start = JUICED**: `createSeasonStartProfile()` starts players at JUICED (120) with 10-game cooldown, NOT at FIT (100)
- **Pitcher batting bonus**: Uses `getUnifiedBattingRating()` (weighted 30/30/20/10/10 composite), not just `contact` stat
- **Mojo applyMojoToStat**: Returns `Math.round(base × multiplier)` — integer, not float
- **MWAR_WEIGHTS**: Fields are `.decision` and `.overperformance` (not `.decisionWAR`)

---

## Recommendations

1. **Add MAX_SALARY clamp** to `calculateSalary()` — single line fix: `return Math.min(MAX_SALARY, result)`
2. **Optional**: Add NaN guards at WAR engine entry points for defensive coding
3. **Document API types** in FRANCHISE_API_MAP.md with the discoveries above (return field names, sign conventions)
