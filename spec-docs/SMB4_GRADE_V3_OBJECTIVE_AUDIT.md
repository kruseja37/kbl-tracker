# SMB4 Grade V3 Objective Audit

Status: Objective audit, no production code changes  
Created: 2026-05-20  
Dataset: `spec-docs/data/smb4_players_fixed.csv` (`440` players)

## Executive Conclusion

I do not recommend a broad V3 residual scoring layer from the current evidence.

The V2 baseline reproduced cleanly: `387 / 440` exact and `439 / 440` within one grade. Most of the 53 misses are threshold-edge cases, but the earlier residual explanation is too broad. Several claimed families cover misses but do not support a useful correction once previously correct players and leave-team-out validation are counted.

Only `Workhorse +1.0` cleared the simple scoring bar in this audit: it fixed all 3 Workhorse misses, broke 0 previously correct players, and kept the same result under leave-team-out validation. Even that is based on only 6 Workhorse pitchers, so I would treat it as a small V3 candidate behind an explicit option/test, not as justification for a larger residual layer.

Bella Mietballe is not an arsenal-count bug. Her five pitches are fully counted. She remains a data-quality or unresolved nonlinear corner case, not a safe scoring rule.

## Methodology

- Reproduced production behavior from the fixed roster using the same fitted numeric score model and V2 calibrated thresholds in `src/engines/smb4GradeEmulator.ts`.
- Verified the production fixture test: `npm test -- src/engines/__tests__/smb4GradeEmulator.test.ts` passed, 5 tests.
- For each candidate residual feature, tuned one blunt score delta on a quarter-point grid from `-10.0` to `+10.0`.
- Re-mapped adjusted scores through the same calibrated thresholds.
- Counted exact accuracy, within-one accuracy, fixed old misses, and newly broken correct players.
- Ran leave-team-out validation across the 20 SMB4 teams. For each held-out team, the delta was tuned on the other 19 teams and evaluated on the held-out team.
- Negative controls used seeded random trials (`seed = 20260519`): fake trait groupings, random player groups of comparable sizes, and explicit name/team leakage checks.

## Reproduced Metrics

| Segment | Players | Old center exact | V2 calibrated exact | V2 within one |
|---|---:|---:|---:|---:|
| All players | 440 | 371 | 387 | 439 |
| Hitters | 261 | 213 | 226 | 261 |
| Pitchers | 179 | 158 | 161 | 178 |

V2 miss direction:

| Direction | Count |
|---|---:|
| Predicted too low | 32 |
| Predicted too high | 21 |

Distance to exact grade interval:

| Needed absolute score adjustment | Misses covered |
|---:|---:|
| `<= 0.25` | 5 |
| `<= 0.50` | 12 |
| `<= 0.75` | 23 |
| `<= 1.00` | 33 |
| `<= 1.25` | 40 |
| `<= 1.75` | 45 |
| `<= 2.50` | 49 |
| `<= 5.00` | 52 |
| `> 5.00` | 1 |

## Non-Exact Players

| Player | Team | Type | Pos | Sec | Bats | Actual | Pred | Score | Need | Traits | Arsenal |
|---|---|---|---|---|---|---|---|---:|---:|---|---|
| Billy LeBoink | Beewolves | hitter | RF | LF | R | B | B- | 69.04 | +0.57 | - | - |
| Gina Torrens | Beewolves | hitter | 2B | SS | L | B+ | B | 72.60 | +1.54 | Butter Fingers; POW vs RHP | - |
| Evan Chukov | Crocodons | hitter | C | RF | L | B- | C+ | 64.48 | +0.56 | First Pitch Slayer | - |
| Juanita Hernandez | Crocodons | hitter | RF | LF | R | B+ | B | 73.86 | +0.28 | Cannon Arm | - |
| Kenna Quorn | Freebooters | hitter | RF | C | R | C | C+ | 60.13 | -0.34 | Sprinter | - |
| Walker Runs | Freebooters | hitter | 2B | IF | R | B- | C+ | 64.88 | +0.16 | Rally Starter | - |
| Zoom Delacruz | Grapplers | hitter | 2B | SS | R | B- | C+ | 62.68 | +2.35 | Little Hack | - |
| Dion Bass | Heaters | hitter | 2B | SS | R | B- | B | 70.73 | -1.12 | Base Rounder; RBI Zero | - |
| Murky Nubswubbles | Heaters | hitter | RF | - | L | C+ | C | 57.98 | +1.82 | Sign Stealer | - |
| Raise Ruffo | Heaters | hitter | CF | OF | L | A | A- | 84.66 | +0.08 | High Pitch; Rally Starter | - |
| Slapper Glute | Heaters | hitter | LF | C | S | A- | B+ | 78.89 | +0.74 | Little Hack | - |
| Fiona Clark | Herbisaurs | hitter | C | - | R | B- | C+ | 60.31 | +4.73 | POW vs LHP | - |
| Dirk Sportswood | Hot Corners | hitter | 1B | - | R | B | B+ | 74.66 | -0.51 | Butter Fingers; Stimulated | - |
| Stan Elyve | Hot Corners | hitter | LF | C | R | B+ | B | 73.82 | +0.32 | Tough Out | - |
| Gustav Gustavson | Moonstars | hitter | LF | OF | R | B- | C+ | 64.05 | +0.98 | Fastball Hitter; RBI Zero | - |
| Buck Swiner | Moose | hitter | LF | RF | L | B- | B | 70.03 | -0.41 | Volatile | - |
| Hose Tremendo | Moose | hitter | RF | OF | L | B | B+ | 75.27 | -1.12 | Cannon Arm | - |
| Nacho Crisp | Moose | hitter | SS | 2B | L | B | B+ | 74.98 | -0.83 | Distractor | - |
| Roman Rhoades | Moose | hitter | C | 1B | S | B- | C+ | 64.00 | +1.03 | Tough Out | - |
| Stallion Johnson | Moose | hitter | LF | OF | L | B | B- | 67.47 | +2.14 | Off-Speed Hitter | - |
| Stacy Staples | Nemesis | hitter | C | 1B | S | B+ | B | 73.40 | +0.75 | Slow Poke | - |
| Sakda Song | Overdogs | hitter | 1B | RF | R | S | A+ | 90.61 | +4.12 | Off-Speed Hitter; POW vs RHP | - |
| Herra O'Wuggliems | Platypi | hitter | RF | C | L | B+ | B | 72.92 | +1.22 | Cannon Arm; Off-Speed Hitter | - |
| Linda Hand | Platypi | hitter | RF | OF | L | B- | B | 69.95 | -0.34 | Magic Hands | - |
| Dolf Steak | Sandcats | hitter | CF | 1B/OF | L | A- | B+ | 78.85 | +0.78 | CON vs RHP; POW vs RHP | - |
| Hercules Bentley | Sandcats | hitter | 1B | C | R | B | B- | 69.07 | +0.54 | - | - |
| DP Turner | Sawteeth | hitter | 2B | IF | L | B- | B | 70.08 | -0.46 | Cannon Arm; Dive Wizard | - |
| Junior Young Jr | Sawteeth | hitter | 1B | C | R | C | C+ | 60.72 | -0.92 | POW vs LHP | - |
| Kira Nutmeg | Sawteeth | hitter | 3B | SS | L | B | B+ | 74.61 | -0.47 | Base Rounder | - |
| Slash Trips | Sawteeth | hitter | CF | 1B/OF | S | A- | A | 86.71 | -1.98 | Bad Ball Hitter; Rally Starter | - |
| Lloyd Cook | Sirloins | hitter | 2B | 3B | L | A- | B+ | 78.58 | +1.05 | High Pitch | - |
| Harmony Straus | Wideloads | hitter | C | 1B | L | B+ | B | 73.58 | +0.56 | Fastball Hitter | - |
| Rosy Hardman | Wild Pigs | hitter | LF | OF | L | B- | C+ | 64.13 | +0.91 | High Pitch | - |
| Spanky Wagnerd | Wild Pigs | hitter | 1B | - | L | B+ | B | 72.69 | +1.45 | Butter Fingers; First Pitch Slayer | - |
| Wally Bacon | Wild Pigs | hitter | 2B | 3B | R | B- | C+ | 64.95 | +0.08 | - | - |
| Deshaun Levonn | Beewolves | pitcher | SP | - | L | C+ | B- | 66.14 | -1.11 | - | 2F/4F/CH/SL |
| Dwight Breeze | Blowfish | pitcher | SP | - | R | D+ | C- | 51.34 | -1.73 | Consistent | 2F/4F/CH |
| Meat Commonly | Buzzards | pitcher | RP | - | L | D+ | C- | 50.87 | -1.26 | Wild Thing | 2F/4F/CB/CF |
| Lana Rhymes | Freebooters | pitcher | SP | - | R | C | C+ | 60.79 | -0.99 | Surrounded | 2F/4F/CB/SL |
| Ryder McPride | Freebooters | pitcher | RP | - | R | B | B- | 69.06 | +0.56 | Clutch; Rally Stopper | 2F/4F/CH |
| Huck Enduck | Heaters | pitcher | RP | - | L | C- | C | 55.11 | -0.82 | Wild Thing | 4F/CB/SL |
| Splash Cashmore | Heaters | pitcher | RP | - | L | B- | C+ | 64.41 | +0.62 | Reverse Splits | 4F/CF/CH |
| Leonar Ramiro | Herbisaurs | pitcher | RP | - | R | C+ | C | 59.20 | +0.60 | Surrounded | 2F/4F/CB/CF |
| Dot Dacornas | Hot Corners | pitcher | SP | - | R | B+ | A- | 83.57 | -3.94 | Gets Ahead | 2F/4F/CB/FK/SL |
| Bella Mietballe | Jacks | pitcher | SP | - | L | C | D | 47.04 | +7.25 | Meltdown | 2F/4F/CB/CH/SL |
| Donk Oh | Jacks | pitcher | SP | - | R | B+ | A- | 81.15 | -1.52 | Metal Head | 4F/CB/CH/SL |
| Lil Bupton | Moonstars | pitcher | CP | - | L | B+ | A- | 80.87 | -1.24 | Elite SL; K Collector | 4F/SL |
| Ansel Carouse | Nemesis | pitcher | SP | - | L | A- | B+ | 78.84 | +0.79 | Workhorse | 2F/4F/CB/CH/SL |
| Lawrence Wimple | Nemesis | pitcher | CP | - | L | B- | C+ | 64.15 | +0.89 | Gets Ahead | 4F/SL |
| Kerwin Arches | Sandcats | pitcher | SP | - | R | A- | B+ | 79.58 | +0.05 | Workhorse | 4F/CB/SB/SL |
| Melody Moods | Sawteeth | pitcher | SP | - | R | C+ | B- | 65.67 | -0.64 | Volatile | 4F/CB/CF/CH/SL |
| Gerry Rawner | Wideloads | pitcher | SP | - | R | B- | C+ | 64.16 | +0.87 | Meltdown; Workhorse | 4F/CB/CH/SL |
| Kendra Kerr | Wild Pigs | pitcher | RP | - | R | B+ | A- | 79.82 | -0.20 | - | 2F/4F/CB/SL |

## Bella Mietballe Case Study

Bella's current V2 score is `47.0405`, which maps to `D`. Her actual grade is `C`.

Relevant calibrated thresholds:

| Boundary | Threshold | Bella gap |
|---|---:|---:|
| D+ / D | 47.4501 | +0.4096 |
| C- / D+ | 49.6106 | +2.5701 |
| C / C- | 54.2933 | +7.2528 |

Bella's five-pitch arsenal is fully counted:

| Arsenal feature | Value | Contribution |
|---|---:|---:|
| `arsenal_count` | 5 | +5.0455 |
| `pitch_4F` | 1 | +0.6322 |
| `pitch_2F` | 1 | +0.4732 |
| `pitch_CB` | 1 | +0.1994 |
| `pitch_CH` | 1 | +0.0412 |
| `pitch_SL` | 1 | -0.4120 |
| Total arsenal contribution | - | +5.9795 |

Top score contributors:

| Feature | Contribution |
|---|---:|
| `accuracy` | +8.951 |
| `junk` | +6.665 |
| `arsenal_count` | +5.046 |
| `velocity` | +3.542 |
| `contact` | +3.423 |
| `power` | +1.668 |
| `neg_count` | -1.165 |
| `bat_L` | +1.097 |
| pitch flags net | +0.934 |

Interpretation:

- Not an omitted arsenal-count case.
- Not fixed by simply removing the generic Meltdown negative count; that would add only about `+1.17`.
- A `Meltdown +2.75` or low-rating-SP-five-pitch `+2.75` correction removes the only deep miss by moving Bella to `C-`, but does not make her exact and creates validation damage.
- Other low-rating SP/five-pitch rows are exact: Beebee Takabasei (`C -> C`, base `42.0`) and Trey Mondo (`C- -> C-`, base `32.0`). Bella is much lower at base `24.3`.

Conclusion: Bella is unresolved. The strongest honest label is "data-quality concern or nonlinear corner case." She is not sufficient evidence for an arsenal, Meltdown, or one-player scoring patch.

## Handley Dexterez Case Study

Handley is a useful check against overexplaining the residuals. He is already exact:

| Field | Value |
|---|---|
| Actual | S |
| Predicted | S |
| Numeric score | 96.3101 |
| Primary / secondary | SS / IF/OF |
| Bats / throws | S / R |
| Traits | Utility; Fastball Hitter |
| Base weighted | 79.50 |

Key contributions:

| Feature | Contribution |
|---|---:|
| `contact` | +24.417 |
| `power` | +17.804 |
| `speed` | +17.637 |
| `fielding` | +11.134 |
| `arm` | +6.773 |
| `bat_S` | +4.512 |
| `tr_Fastball Hitter` | +2.454 |
| `pos_count` | +1.931 |
| `vers_util` | +1.337 |
| `vers2` | +0.634 |
| `vers` | +0.596 |
| `tr_Utility` | -0.305 |

Interpretation: Handley does not prove a missing V3 rule. He shows that V2 already has major switch-hitting, offensive trait, Utility, and secondary-position machinery. Residual claims should therefore prove incremental value beyond these existing features.

## Candidate Residual Tests

Definitions used:

- `hitter offensive trait x secondary`: hitter has any secondary position and any offensive trait from `smb4_traits_reference.md`.
- `hitter offensive trait x L/S batting`: hitter bats left or switch and has an offensive trait.
- `hitter defensive trait x secondary`: hitter has any secondary position and a defensive trait.
- `pitcher positive trait family`: pitcher has a positive pitching trait, including Workhorse, elite pitch traits, and common pitcher positives.
- `pitcher negative trait family`: pitcher has any negative trait.
- `pitcher role x arsenal count`: SP with 5 pitches, RP/CP with 2 pitches, or SP/RP with 2 or 5 pitches.
- `low-rating SP x five pitches`: SP, 5 pitches, base pitcher weighted rating `<= 45`.

| Candidate | Feature players | Misses covered | Miss direction | Tuned delta | Train exact | Fix / break | LTO exact | LTO fix / break | Disposition |
|---|---:|---:|---|---:|---:|---:|---:|---:|---|
| Hitter offensive trait x secondary | 111 | 19 | 16 under, 3 over | +0.00 | 387 (+0) | 0 / 0 | 387 (+0) | 0 / 0 | Generation prior only |
| Hitter offensive trait x L/S batting | 50 | 14 | 12 under, 2 over | +1.25 | 390 (+3) | 9 / 6 | 390 (+3) | 9 / 6 | Not safe; breaks too many correct players |
| Hitter defensive trait x secondary | 29 | 5 | 2 under, 3 over | -0.50 | 389 (+2) | 2 / 0 | 389 (+2) | 2 / 0 | Interesting, too small and direction-mixed |
| Pitcher positive trait family | 107 | 10 | 6 under, 4 over | +0.00 | 387 (+0) | 0 / 0 | 387 (+0) | 0 / 0 | Unsupported |
| Pitcher negative trait family | 56 | 7 | 3 under, 4 over | +0.00 | 387 (+0) | 0 / 0 | 387 (+0) | 0 / 0 | Unsupported |
| Pitcher role x arsenal count | 50 | 6 | 3 under, 3 over | +0.00 | 387 (+0) | 0 / 0 | 387 (+0) | 0 / 0 | Unsupported |
| Low-rating SP x five pitches | 3 | 1 | 1 under, 0 over | +2.75 | 387 (+0) | 0 / 0 | 385 (-2) | 0 / 2 | Data concern only |
| Workhorse | 6 | 3 | 3 under, 0 over | +1.00 | 390 (+3) | 3 / 0 | 390 (+3) | 3 / 0 | Only scoring candidate |
| Wild Thing | 6 | 2 | 0 under, 2 over | -1.50 | 388 (+1) | 2 / 1 | 386 (-1) | 0 / 1 | Unsupported |
| Surrounded | 6 | 2 | 1 under, 1 over | +0.75 | 388 (+1) | 1 / 0 | 387 (+0) | 0 / 0 | Generation prior only |
| Meltdown | 3 | 2 | 2 under, 0 over | +2.75 | 387 (+0) | 1 / 1 | 386 (-1) | 0 / 1 | Unsupported; Bella-adjacent overfit |

Within-one accuracy:

- Baseline V2: `439 / 440`.
- Low-rating SP/five-pitch and Meltdown `+2.75` can make training within-one `440 / 440`, but neither improves exact accuracy and both fail leave-team-out exact validation.
- Workhorse preserves within-one at `439 / 440`; it fixes exact boundary misses but does not address Bella.

## Arsenal Context

| Role | Players | Arsenal counts | Non-exact notes |
|---|---:|---|---|
| SP | 86 | 3 pitches: 8; 4 pitches: 42; 5 pitches: 36 | 10 misses, mixed direction |
| SP/RP | 19 | 3 pitches: 3; 4 pitches: 13; 5 pitches: 3 | 0 misses |
| RP | 60 | 2 pitches: 2; 3 pitches: 43; 4 pitches: 14; 5 pitches: 1 | 6 misses, mixed direction |
| CP | 14 | 2 pitches: 9; 3 pitches: 4; 4 pitches: 1 | 2 misses, both predicted too high |

Role x arsenal count did not support a simple correction. The candidate covered 6 misses with perfectly split direction (`3` under, `3` over), and its tuned delta was `0.00`.

## Negative Controls

Seeded 200-rep negative controls, same one-feature tuning process.

| Control | Train net mean | Train p95 | Train max | LTO net mean | LTO p95 | LTO max | Mean feature size | Mean miss coverage |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Fake offensive trait groups x secondary | +0.09 | +1 | +2 | -0.62 | 0 | +2 | 66.1 | 10.1 |
| Fake offensive trait groups x L/S batting | +0.57 | +2 | +4 | -0.84 | +2 | +4 | 36.2 | 7.4 |
| Fake pitching trait groups | +0.10 | +1 | +2 | -0.34 | 0 | +1 | 49.2 | 5.4 |
| Random player groups, size 111 | 0.00 | 0 | 0 | -0.12 | 0 | 0 | 111.0 | 13.7 |
| Random player groups, size 107 | +0.01 | 0 | +1 | -0.16 | 0 | 0 | 107.0 | 13.1 |
| Random player groups, size 6 | +0.26 | +1 | +2 | -0.23 | 0 | +1 | 6.0 | 0.7 |
| Random player groups, size 3 | +0.17 | +1 | +2 | -0.10 | 0 | +1 | 3.0 | 0.3 |

Control interpretation:

- The hitter L/S offensive-trait correction (`+3` net) is not impressive enough because fake hand/trait groups can reach similar or better apparent gains, and the real feature breaks 6 correct players.
- Workhorse is more notable: `+3` net exceeds the max observed in the same-size random player controls, with no breakage and stable leave-team-out. Still small-n.
- Low-rating SP/five-pitch and Meltdown corrections look like one-corner behavior, not robust scoring logic.

Leakage checks:

| Leakage feature | Training result | Validation read |
|---|---|---|
| One score delta per team name | `393 / 440` exact, `+6` net | Not legitimate; held-out team identity has no learned evidence |
| One score delta per player name | Theoretically `440 / 440` exact | Pure memorization; leave-team-out expected net `0` for unseen names |
| Bella-only feature | `388 / 440`, `+1` net with `+7.50` | Fails explainability and generalization |

## Classification

### Safe to promote into scoring

`Workhorse +1.0` is the only candidate that passed this audit's simple bar:

- covers 3 current misses
- miss direction is fully consistent
- fixes all 3 covered misses
- breaks 0 previously correct players
- leave-team-out result is unchanged from training: `390 / 440`
- no new deep misses

I would still stage it as an explicit V3 candidate with a focused regression test rather than silently changing the default model.

### Useful only as generation priors

- Hitter offensive trait x secondary position: covers many misses and mostly underpredicts, but the tuned correction is `0.00`.
- Hitter offensive trait x L/S batting: improves net exact by 3 but fixes 9 by breaking 6; useful as a grade-edge volatility warning, not scoring.
- Hitter defensive trait x secondary position: small positive result, but only 5 misses and mixed direction.
- Surrounded: one training fix, no validation gain.
- Role/arsenal context: enforce plausible generated arsenals by role, but do not add a scoring correction.

### Unsupported or likely overfit

- Pitcher positive trait family.
- Pitcher negative trait family.
- Wild Thing.
- Meltdown.
- Low-rating SP x five pitches as a scoring rule.
- Team-name or player-name adjustments.

### Data quality concerns

- Bella Mietballe should be manually checked against an external SMB4 roster source. The model counts her arsenal correctly, and she is uniquely far from the calibrated C interval.
- Bella's row may still be valid, but if it is valid, it implies a nonlinear corner not recoverable from the current 440-player fixture without overfitting.

## Recommended Next Action

Do not edit production scoring for a broad V3 layer yet.

Recommended sequence:

1. Manually verify Bella Mietballe's source data: grade, ratings, arsenal, handedness, and Meltdown.
2. Add a small audit fixture test around Bella's explanation so future investigations do not re-litigate the arsenal-count question.
3. If a V3 option is desired, prototype only `Workhorse +1.0` behind an opt-in scoring mode and require:
   - exact improves from `387` to `390`
   - within-one remains at least `439`
   - no new deep misses
   - Ansel Carouse, Kerwin Arches, and Gerry Rawner become exact
   - no currently exact Workhorse player breaks
4. Keep the broader trait, handedness, secondary-position, and arsenal claims as generation priors: avoid placing those generated players exactly on grade boundaries.
