# SMB4 Position Spread + Reverse-Engineered Grade Calculus

## Scope and source
- Requested source file: `/Users/johnkruse/Projects/kbl-tracker/PLAYER_DATABASE_SMB4.md`
- Data integrity note: pitcher rows in that markdown are column-shifted (numeric `Pos`/`Pos2`).
- Canonical parsed source used for calculations (same 440 SMB4 players): `/Users/johnkruse/Projects/kbl-tracker/spec-docs/data/smb4_players_fixed.csv`
- Billy Yank references used for trait polarity and positional value context:
  - `/Users/johnkruse/Projects/kbl-tracker/reference-docs/BillyYank Super Mega Baseball Guide 3rd Edition.docx`
  - `/Users/johnkruse/Projects/kbl-tracker/spec-docs/smb4_traits_reference.md`

---

## Deliverable 1: Position spread (league + team-average)

### Primary positions (league)
| Primary | Count | % League | Avg/team |
|---|---:|---:|---:|
| SP | 86 | 19.55% | 4.30 |
| RP | 60 | 13.64% | 3.00 |
| C | 40 | 9.09% | 2.00 |
| LF | 37 | 8.41% | 1.85 |
| 2B | 34 | 7.73% | 1.70 |
| 1B | 31 | 7.05% | 1.55 |
| RF | 31 | 7.05% | 1.55 |
| CF | 30 | 6.82% | 1.50 |
| SS | 30 | 6.82% | 1.50 |
| 3B | 28 | 6.36% | 1.40 |
| SP/RP | 19 | 4.32% | 0.95 |
| CP | 14 | 3.18% | 0.70 |

### Primary positions (across teams, on average)
| Primary | Avg/team | Min team | Max team |
|---|---:|---:|---:|
| C | 2.00 | 2 | 2 |
| 1B | 1.55 | 1 | 2 |
| 2B | 1.70 | 1 | 2 |
| 3B | 1.40 | 1 | 2 |
| SS | 1.50 | 1 | 2 |
| LF | 1.85 | 1 | 2 |
| CF | 1.50 | 1 | 2 |
| RF | 1.55 | 1 | 2 |
| SP | 4.30 | 4 | 5 |
| SP/RP | 0.95 | 0 | 1 |
| RP | 3.00 | 2 | 4 |
| CP | 0.70 | 0 | 1 |

### Team-level primary matrix
| Team | C | 1B | 2B | 3B | SS | LF | CF | RF | SP | SP/RP | RP | CP |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Beewolves | 2 | 2 | 2 | 1 | 1 | 2 | 1 | 2 | 4 | 1 | 3 | 1 |
| Blowfish | 2 | 1 | 2 | 2 | 1 | 2 | 1 | 2 | 5 | 1 | 2 | 1 |
| Buzzards | 2 | 2 | 2 | 1 | 2 | 2 | 1 | 1 | 5 | 1 | 2 | 1 |
| Crocodons | 2 | 2 | 1 | 2 | 1 | 1 | 2 | 2 | 4 | 1 | 3 | 1 |
| Freebooters | 2 | 2 | 2 | 1 | 1 | 2 | 1 | 2 | 4 | 1 | 3 | 1 |
| Grapplers | 2 | 2 | 1 | 2 | 1 | 2 | 1 | 2 | 4 | 1 | 4 | 0 |
| Heaters | 2 | 1 | 2 | 1 | 2 | 2 | 2 | 1 | 4 | 1 | 4 | 0 |
| Herbisaurs | 2 | 1 | 2 | 1 | 2 | 2 | 1 | 2 | 4 | 1 | 3 | 1 |
| Hot Corners | 2 | 2 | 2 | 1 | 1 | 2 | 2 | 1 | 4 | 1 | 3 | 1 |
| Jacks | 2 | 1 | 2 | 2 | 1 | 2 | 2 | 1 | 4 | 1 | 3 | 1 |
| Moonstars | 2 | 2 | 1 | 2 | 2 | 2 | 1 | 2 | 5 | 0 | 2 | 1 |
| Moose | 2 | 2 | 1 | 1 | 2 | 2 | 1 | 2 | 5 | 1 | 2 | 1 |
| Nemesis | 2 | 1 | 2 | 1 | 2 | 1 | 2 | 2 | 4 | 1 | 3 | 1 |
| Overdogs | 2 | 2 | 1 | 2 | 2 | 2 | 1 | 1 | 4 | 1 | 4 | 0 |
| Platypi | 2 | 1 | 2 | 2 | 1 | 2 | 1 | 2 | 5 | 1 | 3 | 0 |
| Sandcats | 2 | 2 | 2 | 1 | 1 | 2 | 2 | 1 | 4 | 1 | 4 | 0 |
| Sawteeth | 2 | 1 | 2 | 1 | 2 | 1 | 2 | 2 | 4 | 1 | 3 | 1 |
| Sirloins | 2 | 2 | 1 | 2 | 1 | 2 | 2 | 1 | 4 | 1 | 3 | 1 |
| Wideloads | 2 | 1 | 2 | 1 | 2 | 2 | 2 | 1 | 4 | 1 | 3 | 1 |
| Wild Pigs | 2 | 1 | 2 | 1 | 2 | 2 | 2 | 1 | 5 | 1 | 3 | 0 |

### Secondary positions (league)
| Secondary | Count | % League | Avg/team |
|---|---:|---:|---:|
| (none) | 221 | 50.23% | 11.05 |
| OF | 50 | 11.36% | 2.50 |
| 1B | 27 | 6.14% | 1.35 |
| SS | 26 | 5.91% | 1.30 |
| 3B | 22 | 5.00% | 1.10 |
| C | 20 | 4.55% | 1.00 |
| 2B | 17 | 3.86% | 0.85 |
| LF | 14 | 3.18% | 0.70 |
| RF | 14 | 3.18% | 0.70 |
| 1B/OF | 11 | 2.50% | 0.55 |
| IF | 11 | 2.50% | 0.55 |
| IF/OF | 7 | 1.59% | 0.35 |

---

## Deliverable 2: Reverse-engineered grade algorithm

## Step 1: Baseline rating core (from code + SMB conventions)
- Position players:
`baseWeighted = 0.30*POW + 0.30*CON + 0.20*SPD + 0.10*FLD + 0.10*ARM`
- Pitchers:
`baseWeighted = (VEL + JNK + ACC) / 3`

This baseline alone matches assigned SMB4 grades at **30.0% exact accuracy**, so hidden grading clearly includes context (position value, trait quality, handedness/flexibility signals).

## Step 2: Add contextual adjustments (fitted on 440-player SMB4 roster)

### 2A) Position-player points model
`points_h = -0.8294 + 0.1849*baseWeighted + 0.1750*posTraits - 0.2969*negTraits + 0.6924*isSwitch + 0.0457*throwsLeft + primaryAdj + secondaryAdj`

Primary adjustment (hitters):
- `1B: 0.000`
- `2B: +0.051`
- `3B: -0.395`
- `C: +0.476`
- `CF: +0.072`
- `LF: -0.119`
- `RF: +0.014`
- `SS: -0.136`

### 2B) Pitcher points model
`points_p = 0.7780 + 0.1628*baseWeighted + 0.2957*posTraits - 0.1912*negTraits - 0.1512*isSwitch + 0.1600*throwsLeft + 0.0091*batPow + 0.0124*batCon + 0.0017*batSpd + roleAdj`

Role adjustment (pitchers):
- `SP: 0.000`
- `CP: -0.431`
- `RP: -0.265`
- `SP/RP: -0.353`

### Secondary-position adjustment (shared table)
- `none: 0.000`
- `1B: +0.104`
- `1B/OF: +0.126`
- `2B: +0.481`
- `3B: +0.268`
- `C: -0.058`
- `IF: +0.262`
- `IF/OF: +0.369`
- `LF: +0.004`
- `OF: +0.196`
- `RF: +0.159`
- `SS: +0.296`

## Step 3: Convert points to grade letter
Use your requested full scale:
- `16=S, 15=A+, 14=A, 13=A-, 12=B+, 11=B, 10=B-, 9=C+, 8=C, 7=C-, 6=D+, 5=D, 4=D-, 3=E+, 2=E, 1=E-, 0=F`

Computation:
1. Compute `points_h` or `points_p`.
2. `idx = clamp(round(points), 0, 16)`
3. Convert `idx` with the map above.

## Model performance on SMB4 roster
- Combined exact-grade accuracy: **70.7%**
- Combined R²: **0.936**
- Interpretation: this is a strong practical emulator, but not guaranteed to be the literal internal SMB4 source code.

---

## Trait sign handling used
- Positive/negative trait classification came from Billy Yank trait definitions (`smb4_traits_reference.md`).
- Trait names were normalized for known aliases/typos (`PWR`->`POW`, `Elite 4`->`Elite 4F`, `K Neglector`->`K Neglecter`, `Two Way (IF/OF)`->`Two Way`).


## Team-level secondary matrix

| Team | none | OF | 1B | SS | 3B | C | 2B | LF | RF | 1B/OF | IF | IF/OF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Beewolves | 11 | 3 | 2 | 1 | 1 | 1 | 0 | 1 | 1 | 0 | 0 | 1 |
| Blowfish | 11 | 3 | 2 | 2 | 1 | 1 | 1 | 0 | 0 | 1 | 0 | 0 |
| Buzzards | 12 | 1 | 0 | 1 | 2 | 1 | 1 | 1 | 1 | 0 | 0 | 2 |
| Crocodons | 11 | 3 | 2 | 1 | 1 | 1 | 0 | 1 | 1 | 0 | 1 | 0 |
| Freebooters | 11 | 3 | 1 | 1 | 2 | 1 | 1 | 0 | 1 | 0 | 1 | 0 |
| Grapplers | 11 | 2 | 1 | 2 | 1 | 1 | 1 | 2 | 0 | 0 | 1 | 0 |
| Heaters | 11 | 1 | 1 | 2 | 1 | 1 | 1 | 1 | 1 | 1 | 0 | 1 |
| Herbisaurs | 11 | 2 | 3 | 1 | 1 | 1 | 1 | 0 | 0 | 1 | 0 | 1 |
| Hot Corners | 13 | 4 | 1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 1 |
| Jacks | 11 | 3 | 2 | 3 | 0 | 1 | 0 | 0 | 0 | 1 | 1 | 0 |
| Moonstars | 10 | 4 | 1 | 0 | 1 | 1 | 2 | 2 | 0 | 0 | 1 | 0 |
| Moose | 10 | 3 | 1 | 2 | 1 | 1 | 1 | 1 | 2 | 0 | 0 | 0 |
| Nemesis | 10 | 1 | 2 | 1 | 2 | 1 | 1 | 1 | 1 | 1 | 1 | 0 |
| Overdogs | 11 | 1 | 2 | 1 | 0 | 1 | 1 | 1 | 2 | 1 | 1 | 0 |
| Platypi | 11 | 2 | 2 | 2 | 2 | 1 | 1 | 0 | 0 | 1 | 0 | 0 |
| Sandcats | 11 | 4 | 1 | 1 | 2 | 1 | 0 | 1 | 0 | 1 | 0 | 0 |
| Sawteeth | 9 | 2 | 1 | 1 | 1 | 1 | 1 | 1 | 2 | 1 | 1 | 1 |
| Sirloins | 11 | 3 | 1 | 1 | 1 | 1 | 2 | 0 | 1 | 1 | 0 | 0 |
| Wideloads | 12 | 3 | 1 | 1 | 1 | 1 | 1 | 1 | 0 | 0 | 1 | 0 |
| Wild Pigs | 13 | 2 | 0 | 1 | 1 | 1 | 1 | 0 | 1 | 1 | 1 | 0 |
