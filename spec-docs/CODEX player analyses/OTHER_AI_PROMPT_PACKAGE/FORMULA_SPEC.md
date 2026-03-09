# SMB4 Formula Spec

## Grade Mapping
Map the numeric score to the nearest grade center.

| Grade | Center | GradeIdx |
|---|---:|---:|
| S | 97 | 16 |
| A+ | 92 | 15 |
| A | 87 | 14 |
| A- | 82 | 13 |
| B+ | 77 | 12 |
| B | 72 | 11 |
| B- | 67 | 10 |
| C+ | 62 | 9 |
| C | 57 | 8 |
| C- | 52 | 7 |
| D+ | 47 | 6 |
| D | 42 | 5 |
| D- | 37 | 4 |
| E+ | 32 | 3 |
| E | 27 | 2 |
| E- | 22 | 1 |
| F | 15 | 0 |

## Normalization

### Trait aliases
- `PWR vs RHP` -> `POW vs RHP`
- `PWR vs LHP` -> `POW vs LHP`
- `Elite 4` -> `Elite 4F`
- `K Neglector` -> `K Neglecter`
- `Two Way (IF)` -> `Two Way`
- `Two Way (OF)` -> `Two Way`
- `Con vs LHP` -> `CON vs LHP`
- `Con vs RHP` -> `CON vs RHP`
- `Con vs RPH` -> `CON vs RHP`
- `CON vs RPH` -> `CON vs RHP`
- `POW vs PHP` -> `POW vs RHP`
- `Slowpoke` -> `Slow Poke`
- `East Target` -> `Easy Target`
- `Base Rounds` -> `Base Rounder`
- `Clitch` -> `Clutch`

### Secondary position normalization
Treat empty, `none`, `None`, and `(none)` as no secondary position.

### Arsenal parsing
Parse pitches from either `|`-delimited or comma-delimited strings.

## Recognized positive traits
`Cannon Arm, Durable, First Pitch Slayer, Sprinter, K Collector, Tough Out, Stimulated, Specialist, Reverse Splits, Stealer, Pick Officer, Sign Stealer, Mind Gamer, Distractor, Bad Ball Hitter, Pinch Perfect, Base Rounder, Composed, Magic Hands, Fastball Hitter, Off-Speed Hitter, Low Pitch, High Pitch, Inside Pitch, Outside Pitch, Metal Head, Consistent, Two Way, Rally Stopper, Clutch, Dive Wizard, Rally Starter, RBI Hero, CON vs LHP, CON vs RHP, POW vs LHP, POW vs RHP, Ace Exterminator, Bunter, Utility, Big Hack, Little Hack, Gets Ahead, Workhorse, Elite 4F, Elite 2F, Elite CF, Elite FK, Elite SL, Elite CB, Elite CH, Elite SB`

## Recognized negative traits
`K Neglecter, Whiffer, Slow Poke, First Pitch Prayer, Injury Prone, Noodle Arm, Bad Jumps, Easy Jumps, Wild Thrower, Easy Target, Base Jogger, BB Prone, Butter Fingers, Volatile, Choker, Meltdown, Surrounded, Wild Thing, RBI Zero, Falls Behind, Crossed Up`

## Shared derived values

### Handedness flags
```text
bat_L = 1 if bats == "L" else 0
bat_S = 1 if bats == "S" else 0
thr_L = 1 if throws == "L" else 0
```

### Trait polarity counts
```text
pos_count = number of recognized positive traits among trait1, trait2
neg_count = number of recognized negative traits among trait1, trait2
```

### Secondary versatility
```text
none -> 0
1B, 2B, 3B, C, LF, RF, SS -> 1
OF -> 3
IF, 1B/OF -> 4
IF/OF -> 7
other valid unlisted secondary -> 1
```

## Hitter scoring

### Hitter base
```text
base_weighted_hitter =
  0.30*power +
  0.30*contact +
  0.20*speed +
  0.10*fielding +
  0.10*arm
```

### Hitter features
```text
pow_con = power * contact / 100
spd_fld = speed * fielding / 100
vers = secondary_versatility
vers2 = vers * vers
vers_util = vers if Utility trait is present else 0
```

Primary-position flags:
`pos_2B, pos_3B, pos_C, pos_CF, pos_LF, pos_RF, pos_SS`

Secondary-position flags:
`sec_1B, sec_1B/OF, sec_2B, sec_3B, sec_C, sec_IF, sec_LF, sec_OF, sec_RF, sec_SS`

Trait flags:
`tr_First Pitch Slayer, tr_Little Hack, tr_Mind Gamer, tr_Rally Starter, tr_Magic Hands, tr_Utility, tr_Big Hack, tr_Sprinter, tr_Cannon Arm, tr_Fastball Hitter, tr_Bad Ball Hitter, tr_Whiffer`

### Hitter equation
```text
hitter_numeric_score =
  10.5965166711
  + 0.2825983581*power
  + 0.2806503532*contact
  + 0.2027213083*speed
  + 0.1147824982*fielding
  + 0.0915305332*arm
  - 0.0088454122*(power*contact/100)
  - 0.0336045706*(speed*fielding/100)
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

## Pitcher scoring

### Pitcher base
```text
base_weighted_pitcher = (velocity + junk + accuracy) / 3
```

### Pitcher features
```text
jnk_acc = junk * accuracy / 100
arsenal_count = number of parsed pitches
```

Primary-position flags:
`pos_RP, pos_SP, pos_SP/RP`

Pitch flags:
`pitch_2F, pitch_4F, pitch_CB, pitch_CF, pitch_CH, pitch_FK, pitch_SB, pitch_SL`

Trait flags:
`tr_K Collector, tr_Gets Ahead, tr_Elite 2F, tr_Elite 4F, tr_Falls Behind, tr_Elite CF, tr_Rally Stopper, tr_Elite FK, tr_Specialist, tr_Crossed Up, tr_Elite CB, tr_Volatile`

### Pitcher equation
```text
pitcher_numeric_score =
  16.5944849573
  + 0.2529999141*velocity
  + 0.2665900378*junk
  + 0.2632687105*accuracy
  + 0.0427586837*power
  + 0.0534777057*contact
  + 0.0090158320*speed
  + 0.0204898106*(junk*accuracy/100)
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
