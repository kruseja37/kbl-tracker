# SMB4 Human-Readable Formula Spec

## Purpose
This document converts the improved SMB4 reverse-engineered grade emulator into a human-readable formula specification.

Use this if you want to:
- recreate the scorer in another AI
- build your own calculator
- understand exactly how each input affects grade

Reference implementation:
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/CODEX player analyses/CODEX_smb4_grade_toolkit.py`

## Grade Mapping
The model first produces a numeric score.

That numeric score is then mapped to a discrete grade using nearest center:

| Grade | Center |
|---|---:|
| `S` | `97` |
| `A+` | `92` |
| `A` | `87` |
| `A-` | `82` |
| `B+` | `77` |
| `B` | `72` |
| `B-` | `67` |
| `C+` | `62` |
| `C` | `57` |
| `C-` | `52` |
| `D+` | `47` |
| `D` | `42` |
| `D-` | `37` |
| `E+` | `32` |
| `E` | `27` |
| `E-` | `22` |
| `F` | `15` |

Equivalent logic:
```text
grade = argmin_g |numeric_score - grade_center[g]|
grade_idx = 16 for S down to 0 for F
```

## Input Normalization

### Traits
Normalize these variants before scoring:

| Input | Normalized |
|---|---|
| `PWR vs RHP` | `POW vs RHP` |
| `PWR vs LHP` | `POW vs LHP` |
| `Elite 4` | `Elite 4F` |
| `K Neglector` | `K Neglecter` |
| `Two Way (IF)` | `Two Way` |
| `Two Way (OF)` | `Two Way` |
| `Con vs LHP` | `CON vs LHP` |
| `Con vs RHP` | `CON vs RHP` |
| `Con vs RPH` | `CON vs RHP` |
| `CON vs RPH` | `CON vs RHP` |
| `POW vs PHP` | `POW vs RHP` |
| `Slowpoke` | `Slow Poke` |
| `East Target` | `Easy Target` |
| `Base Rounds` | `Base Rounder` |
| `Clitch` | `Clutch` |

### Secondary Position
Treat empty, `none`, `None`, and `(none)` as no secondary.

### Arsenal
Parse arsenal from a string like `4F|CF|SL|CH` or `4F,CF,SL,CH`.

## Position Sets
- Pitchers: `SP`, `RP`, `CP`, `SP/RP`
- Hitters: everything else

## Derived Inputs

### Hitter base
```text
base_weighted_hitter =
  0.30*power +
  0.30*contact +
  0.20*speed +
  0.10*fielding +
  0.10*arm
```

### Pitcher base
```text
base_weighted_pitcher = (velocity + junk + accuracy) / 3
```

### Handedness flags
```text
bat_L = 1 if bats == L else 0
bat_S = 1 if bats == S else 0
thr_L = 1 if throws == L else 0
```

### Trait polarity counts
```text
pos_count = number of recognized positive traits among trait1, trait2
neg_count = number of recognized negative traits among trait1, trait2
```

### Secondary versatility
```text
versatility(none) = 0
versatility(1B) = 1
versatility(2B) = 1
versatility(3B) = 1
versatility(C) = 1
versatility(LF) = 1
versatility(RF) = 1
versatility(SS) = 1
versatility(OF) = 3
versatility(IF) = 4
versatility(1B/OF) = 4
versatility(IF/OF) = 7
versatility(other unlisted valid secondary) = 1
```

### Pitcher arsenal count
```text
arsenal_count = number of distinct parsed pitches
```

### Pitch flags
For pitchers:
```text
pitch_2F, pitch_4F, pitch_CB, pitch_CF, pitch_CH, pitch_FK, pitch_SB, pitch_SL
```
each equals `1` if present in arsenal, else `0`.

## Hitter Formula

### Feature definitions
```text
pow_con = power * contact / 100
spd_fld = speed * fielding / 100
vers = secondary_versatility(secondary)
vers2 = vers * vers
vers_util = vers if player has Utility trait else 0
```

Primary-position flags:
```text
pos_2B, pos_3B, pos_C, pos_CF, pos_LF, pos_RF, pos_SS
```

Secondary-position flags:
```text
sec_1B, sec_1B/OF, sec_2B, sec_3B, sec_C, sec_IF, sec_LF, sec_OF, sec_RF, sec_SS
```

Trait flags:
```text
tr_First Pitch Slayer
tr_Little Hack
tr_Mind Gamer
tr_Rally Starter
tr_Magic Hands
tr_Utility
tr_Big Hack
tr_Sprinter
tr_Cannon Arm
tr_Fastball Hitter
tr_Bad Ball Hitter
tr_Whiffer
```

### Equation
```text
hitter_numeric_score =
  10.5965166711
  + 0.2825983581*power
  + 0.2806503532*contact
  + 0.2027213083*speed
  + 0.1147824982*fielding
  + 0.0915305332*arm
  - 0.0088454122*pow_con
  - 0.0336045706*spd_fld
  + 2.8497389733*bat_L
  + 4.5116226727*bat_S
  - 0.6571546448*thr_L
  + 0.0850728147*vers
  + 0.0129488446*vers2
  + 0.1909373936*vers_util
  + 0.9656824071*pos_count
  - 1.7517683256*neg_count
  + 0.6985887989*tr_First Pitch Slayer
  - 1.2708309640*tr_Little Hack
  + 1.5014276130*tr_Mind Gamer
  - 0.1998738040*tr_Rally Starter
  - 0.8310486121*tr_Magic Hands
  - 0.3052216719*tr_Utility
  - 0.2192440495*tr_Big Hack
  - 0.2816825373*tr_Sprinter
  - 0.5417638949*tr_Cannon Arm
  + 2.4542565444*tr_Fastball Hitter
  - 0.4592940132*tr_Bad Ball Hitter
  - 0.7381706008*tr_Whiffer
  + 0.8313525554*pos_2B
  - 1.2668027922*pos_3B
  + 2.2997744611*pos_C
  + 0.6637032249*pos_CF
  - 0.5614229268*pos_LF
  - 0.1963177907*pos_RF
  + 0.1115302985*pos_SS
  - 0.0743925098*sec_1B
  - 0.9164565494*sec_1B/OF
  + 0.8398362231*sec_2B
  + 0.3035512464*sec_3B
  - 0.8721695187*sec_C
  + 0.5288517627*sec_IF
  + 0.0694935796*sec_LF
  + 0.1776157661*sec_OF
  - 0.4608455812*sec_RF
  + 0.7115980783*sec_SS
```

### Hitter interpretation shortcuts
- generic positive trait: `+0.9657`
- generic negative trait: `-1.7518`
- `Utility` total effect is not just its trait coefficient:
```text
Utility_total = 0.9656824071 - 0.3052216719 + 0.1909373936*vers
              = 0.6604607352 + 0.1909373936*vers
```

## Pitcher Formula

### Feature definitions
```text
jnk_acc = junk * accuracy / 100
```

Primary-position flags:
```text
pos_RP, pos_SP, pos_SP/RP
```
`CP` is the omitted pitcher baseline.

Trait flags:
```text
tr_K Collector
tr_Gets Ahead
tr_Elite 2F
tr_Elite 4F
tr_Falls Behind
tr_Elite CF
tr_Rally Stopper
tr_Elite FK
tr_Specialist
tr_Crossed Up
tr_Elite CB
tr_Volatile
```

### Equation
```text
pitcher_numeric_score =
  16.5944849573
  + 0.2529999141*velocity
  + 0.2665900378*junk
  + 0.2632687105*accuracy
  + 0.0427586837*power
  + 0.0534777057*contact
  + 0.0090158320*speed
  + 0.0204898106*jnk_acc
  + 1.0091022427*arsenal_count
  + 1.0968542297*bat_L
  + 0.3771555045*bat_S
  - 0.2226159177*thr_L
  + 1.2138502400*pos_count
  - 1.1652812274*neg_count
  + 0.9087461920*tr_K Collector
  + 1.0320910791*tr_Gets Ahead
  - 0.5280484145*tr_Elite 2F
  + 0.4167563425*tr_Elite 4F
  - 0.9976052263*tr_Falls Behind
  + 0.7579419877*tr_Elite CF
  - 1.1328476477*tr_Rally Stopper
  + 0.4854804797*tr_Elite FK
  + 2.1540724826*tr_Specialist
  + 1.5628438611*tr_Crossed Up
  - 0.2319264114*tr_Elite CB
  + 1.6516084637*tr_Volatile
  + 0.0143423869*pos_RP
  + 0.2361613210*pos_SP
  - 1.0149995619*pos_SP/RP
  + 0.4731924690*pitch_2F
  + 0.6321855453*pitch_4F
  + 0.1994458286*pitch_CB
  + 0.4593316468*pitch_CF
  + 0.0411500855*pitch_CH
  - 0.4882808759*pitch_FK
  + 0.1040401887*pitch_SB
  - 0.4119626453*pitch_SL
```

### Pitcher interpretation shortcuts
- generic positive trait: `+1.2139`
- generic negative trait: `-1.1653`
- elite-pitch trait and matching pitch are separate additions

Example:
```text
Elite CF + CF pitch = 1.2138502400 + 0.7579419877 + 0.4593316468 = 2.4311238745
```

## Recognized Positive Traits
```text
Cannon Arm, Durable, First Pitch Slayer, Sprinter, K Collector, Tough Out,
Stimulated, Specialist, Reverse Splits, Stealer, Pick Officer, Sign Stealer,
Mind Gamer, Distractor, Bad Ball Hitter, Pinch Perfect, Base Rounder, Composed,
Magic Hands, Fastball Hitter, Off-Speed Hitter, Low Pitch, High Pitch, Inside Pitch,
Outside Pitch, Metal Head, Consistent, Two Way, Rally Stopper, Clutch, Dive Wizard,
Rally Starter, RBI Hero, CON vs LHP, CON vs RHP, POW vs LHP, POW vs RHP,
Ace Exterminator, Bunter, Utility, Big Hack, Little Hack, Gets Ahead, Workhorse,
Elite 4F, Elite 2F, Elite CF, Elite FK, Elite SL, Elite CB, Elite CH, Elite SB
```

## Recognized Negative Traits
```text
K Neglecter, Whiffer, Slow Poke, First Pitch Prayer, Injury Prone, Noodle Arm,
Bad Jumps, Easy Jumps, Wild Thrower, Easy Target, Base Jogger, BB Prone,
Butter Fingers, Volatile, Choker, Meltdown, Surrounded, Wild Thing, RBI Zero,
Falls Behind, Crossed Up
```

## Explainability Mechanism
To explain an individual player:
1. normalize trait names and secondary position
2. classify hitter vs pitcher by primary position
3. build all derived features
4. compute `coefficient * feature_value` for every active term
5. sum active contributions plus intercept
6. map numeric score to nearest grade center

That is exactly what the CLI `explain-player` command now does in:
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/CODEX player analyses/CODEX_smb4_grade_toolkit.py`

## Honest Limit
This is still an emulator specification, not verified access to SMB4’s literal internal source formula.

It is a strong fitted approximation to shipped roster grades, not proof of the game’s code path.
