# THE 24 TEAM ARCHETYPES — ratings effects, identity, exemplars & VALUE-PARITY (2026-07-01)

> **Generated from the live data + engines** (`historicalArchetypes.ts` × `ARCHETYPE_STAT_UNIT` ×
> `LUXURY_CAP_TABLES` × `runBalanceSim` on the canonical IV-oracle pool). Regenerate after any
> archetype retune — do not hand-edit the numbers. Companion to `TEAM_ARCHETYPES_24.md`.

## What a cap effect MEANS (read this first)

Each rating category has a **top-N combined-points budget** per tier — the SOFT luxury cap
(Ruling B: going over is allowed, warned, and taxed — never blocked). Hitter caps count your
**top 8 hitters' summed rating**; rotation caps your **top 4 starters**; bullpen caps your
**top 3–4 relievers**. So the caps price CONCENTRATION of elite ratings, not roster totals.
An archetype boost/nerf multiplies that budget: e.g. +10% Contact on the juiced tier =
roughly 61 extra combined Contact points across your top 8 bats, tax-free. The PERCENTAGE is
the tier-stable rule; the exact POINTS differ per tier because the base budgets differ —
every card below states both (percent + the three per-tier point deltas).

## How "equal" is engineered (and its limits)

One rating point is NOT worth one rating point across categories — the IV engine prices Power
and pitching command far above Fielding or Junk. The archetype system compensates with
**value-calibrated units** (`ARCHETYPE_STAT_UNIT`): one "unit" of boost moves a cheap stat's
luxury cap a LOT and an expensive stat's cap a LITTLE, so a unit is roughly value-comparable
across categories:

| Rating | Cap shift per unit | Why |
|---|---|---|
| Power | ±5% | most valuable hitter stat → smallest lever |
| Contact | ±10% | valuable |
| Speed | ±12% | moderately valuable |
| Fielding | ±22% | cheapest hitter stat → largest lever (the known IV undervaluation) |
| Arm | ±12% | moderately valuable |
| Rotation Velocity | ±16% | valuable pitching stat |
| Rotation Junk | ±30% | cheap → big lever |
| Rotation Accuracy | ±25% | expensive command stat |
| Bullpen Velocity | ±20% | valuable |
| Bullpen Junk | ±35% | cheapest pitching stat → biggest lever |
| Bullpen Accuracy | ±30% | expensive command stat |

**The proof standard:** the balance simulator builds each archetype's best legal roster from
the same pool and requires every archetype within ±10% of the cross-archetype mean value.
**Caveats (JK 2026-07-01):** parity is measured BY the IV engine — the yardstick itself
undervalues fielding, and no SMB4-logic simulation exists to prove on-field balance. The
draftability ranker's fielding-sensitivity sweep is the standing robustness check.

## LIVE PARITY MEASUREMENT (this generation run)

**All 24 archetypes within the ±10% band at all three tiers.**

## SUMMARY TABLE

| Archetype | Identity | Value vs mean (juiced / standard / nerfed) |
|---|---|---|
| Murderers' Row | +power +contact → −speed | +0.7% / +0.1% / -2.7% |
| Bomba Squad | +power → −contact −speed | +0.7% / -0.4% / -2.8% |
| Bash Brothers | +power +arm → −command (rotation & bullpen) | +0.7% / +0.4% / +0.3% |
| Whiteyball | +speed +defense → −power | +0.7% / +0.7% / -2.8% |
| Go-Go Small Ball | +contact +defense → −power | +0.7% / +0.7% / -2.8% |
| Dead-Ball Suppressors | +rotation finesse +contact → −power −bullpen velocity | -4.4% / -0.2% / +1.0% |
| Billy Ball Burners | +speed → −power −rotation command | +0.7% / +0.7% / +0.1% |
| Junkball Surgeons | +rotation command +junk → −power −velocity | +0.7% / +0.7% / -2.6% |
| Flamethrowers | +rotation velocity → −power −contact | +0.4% / +0.7% / +1.6% |
| Nasty Boys | +bullpen velocity → −bullpen command | -1.1% / -1.1% / +0.2% |
| HDH Royals | +bullpen command +speed → −power −rotation command | +0.7% / -0.1% / +1.5% |
| The Opener | +bullpen → −rotation | -0.4% / -0.8% / +1.3% |
| The Oriole Way | +defense +rotation command → −speed −bullpen velocity | -4.4% / -3.1% / -0.7% |
| Shift-Era Suppressors | +defense +rotation velocity → −contact −bullpen command | -2.2% / -2.4% / -1.2% |
| Big Red Machine | +contact +defense (+power) → −rotation | +0.7% / +0.7% / +1.1% |
| Hit 'Em Where They Ain't | +contact +speed → −power | +0.6% / +0.7% / -2.8% |
| Toolsy Burners | +power +speed → −rotation command −defense | +0.7% / +0.2% / +1.6% |
| Cannon Corps | +arm +defense → −power −speed | +0.7% / +0.7% / +1.5% |
| Gap-to-Gap | +contact +power → −rotation command −bullpen velocity | +0.7% / +0.7% / +1.5% |
| Web Gems | +defense +arm → −power −contact | +0.7% / +0.7% / +1.5% |
| Launch & Leather | +power +defense → −command (rotation & bullpen) | +0.5% / +0.4% / +0.5% |
| No-Glove Offense | +power +contact → −defense −arm | +0.6% / -0.4% / +1.5% |
| Wheels & Cannons | +speed +arm → −power | +0.7% / +0.6% / +1.6% |
| Rangy Defenders | +speed +arm +defense → −power −contact | +0.7% / +0.1% / +1.5% |

## THE CARDS

### Murderers' Row — *1920s–30s*

*Mash and hit for average — but never run.*

- **Identity:** +power +contact → −speed
- **Historical exemplars:** 1927 Yankees, 1928 Yankees
- **Net ratings effects (cap-budget deltas):**
  - Power **+7.5%** = +46/+44/+42 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Contact **+10.0%** = +61/+58/+56 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Speed **-18.0%** = -111/-106/-102 combined pts (juiced/standard/nerfed) across your top-8 hitters
- **Measured value vs the 24-mean:** juiced +0.7% · standard +0.1% · nerfed -2.7%

### Bomba Squad — *launch-angle / 2019*

*Launch-angle thunder: 430 feet or a whiff.*

- **Identity:** +power → −contact −speed
- **Historical exemplars:** 2019 Twins
- **Net ratings effects (cap-budget deltas):**
  - Power **+10.0%** = +61/+59/+56 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Speed **-12.0%** = -74/-71/-68 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Contact **-15.0%** = -91/-87/-83 combined pts (juiced/standard/nerfed) across your top-8 hitters
- **Measured value vs the 24-mean:** juiced +0.7% · standard -0.4% · nerfed -2.8%

### Bash Brothers — *late 1980s–90s*

*Forearm-bashing bombs and cannon arms; the pitching leaks.*

- **Identity:** +power +arm → −command (rotation & bullpen)
- **Historical exemplars:** 1989 Athletics, 1996 Mariners
- **Net ratings effects (cap-budget deltas):**
  - Power **+7.5%** = +46/+44/+42 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Arm **+12.0%** = +72/+68/+66 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Rotation Accuracy **-25.0%** = -75/-71/-68 combined pts (juiced/standard/nerfed) across your top-4 rotation
  - Bullpen Accuracy **-30.0%** = -59/-57/-54 combined pts (juiced/standard/nerfed) across your top-3 bullpen
- **Measured value vs the 24-mean:** juiced +0.7% · standard +0.4% · nerfed +0.3%

### Whiteyball — *turf era / 1980s*

*Turf-burning thieves and elite gloves; power is for other teams.*

- **Identity:** +speed +defense → −power
- **Historical exemplars:** 1985 Cardinals, 1982 Cardinals
- **Net ratings effects (cap-budget deltas):**
  - Speed **+18.0%** = +111/+106/+102 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Fielding **+33.0%** = +202/+193/+185 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Power **-10.0%** = -61/-59/-56 combined pts (juiced/standard/nerfed) across your top-8 hitters
- **Measured value vs the 24-mean:** juiced +0.7% · standard +0.7% · nerfed -2.8%

### Go-Go Small Ball — *Go-Go → modern revival*

*Put it in play, beat out the hit, win with the glove.*

- **Identity:** +contact +defense → −power
- **Historical exemplars:** 1959 White Sox, 2026 Rays
- **Net ratings effects (cap-budget deltas):**
  - Contact **+15.0%** = +91/+87/+83 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Fielding **+22.0%** = +135/+129/+123 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Power **-10.0%** = -61/-59/-56 combined pts (juiced/standard/nerfed) across your top-8 hitters
- **Measured value vs the 24-mean:** juiced +0.7% · standard +0.7% · nerfed -2.8%

### Dead-Ball Suppressors — *dead-ball (1900s–1910s)*

*Win 2–1: a bunt, a steal, and a junkballer who never gives in.*

- **Identity:** +rotation finesse +contact → −power −bullpen velocity
- **Historical exemplars:** 1906 Cubs, 1907 Tigers
- **Net ratings effects (cap-budget deltas):**
  - Rotation Junk **+45.0%** = +119/+114/+109 combined pts (juiced/standard/nerfed) across your top-4 rotation
  - Contact **+10.0%** = +61/+58/+56 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Bullpen Velocity **-20.0%** = -47/-45/-43 combined pts (juiced/standard/nerfed) across your top-3 bullpen
  - Power **-10.0%** = -61/-59/-56 combined pts (juiced/standard/nerfed) across your top-8 hitters
- **Measured value vs the 24-mean:** juiced -4.4% · standard -0.2% · nerfed +1.0%

### Billy Ball Burners — *early 1980s*

*Steal first; the staff is an afterthought.*

- **Identity:** +speed → −power −rotation command
- **Historical exemplars:** 1982 Athletics (Rickey Henderson)
- **Net ratings effects (cap-budget deltas):**
  - Speed **+24.0%** = +148/+141/+135 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Rotation Accuracy **-25.0%** = -75/-71/-68 combined pts (juiced/standard/nerfed) across your top-4 rotation
  - Power **-7.5%** = -46/-44/-42 combined pts (juiced/standard/nerfed) across your top-8 hitters
- **Measured value vs the 24-mean:** juiced +0.7% · standard +0.7% · nerfed +0.1%

### Junkball Surgeons — *1990s*

*Maddux–Glavine: paint corners, change speeds; ordinary bats.*

- **Identity:** +rotation command +junk → −power −velocity
- **Historical exemplars:** 1995 Braves, 1971 Orioles
- **Net ratings effects (cap-budget deltas):**
  - Rotation Accuracy **+37.5%** = +112/+107/+102 combined pts (juiced/standard/nerfed) across your top-4 rotation
  - Rotation Junk **+30.0%** = +79/+76/+73 combined pts (juiced/standard/nerfed) across your top-4 rotation
  - Power **-5.0%** = -31/-29/-28 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Rotation Velocity **-16.0%** = -44/-42/-40 combined pts (juiced/standard/nerfed) across your top-4 rotation
- **Measured value vs the 24-mean:** juiced +0.7% · standard +0.7% · nerfed -2.6%

### Flamethrowers — *1960s*

*Koufax–Drysdale heat; the lineup is along for the ride.*

- **Identity:** +rotation velocity → −power −contact
- **Historical exemplars:** 1963 Dodgers (Koufax/Drysdale)
- **Net ratings effects (cap-budget deltas):**
  - Rotation Velocity **+32.0%** = +87/+83/+80 combined pts (juiced/standard/nerfed) across your top-4 rotation
  - Power **-5.0%** = -31/-29/-28 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Contact **-10.0%** = -61/-58/-56 combined pts (juiced/standard/nerfed) across your top-8 hitters
- **Measured value vs the 24-mean:** juiced +0.4% · standard +0.7% · nerfed +1.6%

### Nasty Boys — *1990*

*A power pen that misses bats and a few zones.*

- **Identity:** +bullpen velocity → −bullpen command
- **Historical exemplars:** 1990 Reds
- **Net ratings effects (cap-budget deltas):**
  - Bullpen Velocity **+40.0%** = +94/+89/+86 combined pts (juiced/standard/nerfed) across your top-3 bullpen
  - Bullpen Accuracy **-45.0%** = -89/-85/-81 combined pts (juiced/standard/nerfed) across your top-3 bullpen
- **Measured value vs the 24-mean:** juiced -1.1% · standard -1.1% · nerfed +0.2%

### HDH Royals — *2010s*

*Shorten the game: a lockdown pen and fast gloves.*

- **Identity:** +bullpen command +speed → −power −rotation command
- **Historical exemplars:** 2014 Royals, 2015 Royals
- **Net ratings effects (cap-budget deltas):**
  - Bullpen Accuracy **+45.0%** = +89/+85/+81 combined pts (juiced/standard/nerfed) across your top-3 bullpen
  - Speed **+12.0%** = +74/+71/+68 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Rotation Accuracy **-25.0%** = -75/-71/-68 combined pts (juiced/standard/nerfed) across your top-4 rotation
  - Power **-7.5%** = -46/-44/-42 combined pts (juiced/standard/nerfed) across your top-8 hitters
- **Measured value vs the 24-mean:** juiced +0.7% · standard -0.1% · nerfed +1.5%

### The Opener — *2018*

*Bullpenning: relievers over starters.*

- **Identity:** +bullpen → −rotation
- **Historical exemplars:** 2018 Rays
- **Net ratings effects (cap-budget deltas):**
  - Bullpen Velocity **+30.0%** = +70/+67/+64 combined pts (juiced/standard/nerfed) across your top-3 bullpen
  - Bullpen Junk **+35.0%** = +82/+79/+75 combined pts (juiced/standard/nerfed) across your top-3 bullpen
  - Rotation Accuracy **-25.0%** = -75/-71/-68 combined pts (juiced/standard/nerfed) across your top-4 rotation
  - Rotation Velocity **-24.0%** = -65/-62/-60 combined pts (juiced/standard/nerfed) across your top-4 rotation
- **Measured value vs the 24-mean:** juiced -0.4% · standard -0.8% · nerfed +1.3%

### The Oriole Way — *late 1960s–70s*

*Run prevention: elite gloves behind pinpoint starters.*

- **Identity:** +defense +rotation command → −speed −bullpen velocity
- **Historical exemplars:** 1969 Orioles, 1970 Orioles
- **Net ratings effects (cap-budget deltas):**
  - Fielding **+33.0%** = +202/+193/+185 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Rotation Accuracy **+37.5%** = +112/+107/+102 combined pts (juiced/standard/nerfed) across your top-4 rotation
  - Speed **-12.0%** = -74/-71/-68 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Bullpen Velocity **-20.0%** = -47/-45/-43 combined pts (juiced/standard/nerfed) across your top-3 bullpen
- **Measured value vs the 24-mean:** juiced -4.4% · standard -3.1% · nerfed -0.7%

### Shift-Era Suppressors — *2010s*

*Modern run prevention: defense and power arms, light bats.*

- **Identity:** +defense +rotation velocity → −contact −bullpen command
- **Historical exemplars:** 2008 Rays, 2010 Rays
- **Net ratings effects (cap-budget deltas):**
  - Fielding **+33.0%** = +202/+193/+185 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Rotation Velocity **+16.0%** = +44/+42/+40 combined pts (juiced/standard/nerfed) across your top-4 rotation
  - Bullpen Accuracy **-30.0%** = -59/-57/-54 combined pts (juiced/standard/nerfed) across your top-3 bullpen
  - Contact **-15.0%** = -91/-87/-83 combined pts (juiced/standard/nerfed) across your top-8 hitters
- **Measured value vs the 24-mean:** juiced -2.2% · standard -2.4% · nerfed -1.2%

### Big Red Machine — *1970s*

*The complete offense that out-scores its ordinary rotation.*

- **Identity:** +contact +defense (+power) → −rotation
- **Historical exemplars:** 1975 Reds, 1976 Reds
- **Net ratings effects (cap-budget deltas):**
  - Contact **+15.0%** = +91/+87/+83 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Fielding **+22.0%** = +135/+129/+123 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Power **+2.5%** = +15/+15/+14 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Rotation Accuracy **-25.0%** = -75/-71/-68 combined pts (juiced/standard/nerfed) across your top-4 rotation
  - Rotation Velocity **-24.0%** = -65/-62/-60 combined pts (juiced/standard/nerfed) across your top-4 rotation
- **Measured value vs the 24-mean:** juiced +0.7% · standard +0.7% · nerfed +1.1%

### Hit 'Em Where They Ain't — *contact/speed*

*Slap it through the hole, leg out the extra base; the fences stay safe.*

- **Identity:** +contact +speed → −power
- **Historical exemplars:** 2001 Mariners, 1992 Brewers
- **Net ratings effects (cap-budget deltas):**
  - Contact **+15.0%** = +91/+87/+83 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Speed **+12.0%** = +74/+71/+68 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Power **-10.0%** = -61/-59/-56 combined pts (juiced/standard/nerfed) across your top-8 hitters
- **Measured value vs the 24-mean:** juiced +0.6% · standard +0.7% · nerfed -2.8%

### Toolsy Burners — *five-tool athletes*

*Power and wheels up and down the order; the arms and gloves are the price.*

- **Identity:** +power +speed → −rotation command −defense
- **Historical exemplars:** 2007 Phillies, 2021 Blue Jays
- **Net ratings effects (cap-budget deltas):**
  - Speed **+18.0%** = +111/+106/+102 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Power **+5.0%** = +31/+29/+28 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Rotation Accuracy **-25.0%** = -75/-71/-68 combined pts (juiced/standard/nerfed) across your top-4 rotation
  - Fielding **-22.0%** = -135/-129/-123 combined pts (juiced/standard/nerfed) across your top-8 hitters
- **Measured value vs the 24-mean:** juiced +0.7% · standard +0.2% · nerfed +1.6%

### Cannon Corps — *arm + defense*

*Rocket arms and sure hands; runners freeze and the bats stay quiet.*

- **Identity:** +arm +defense → −power −speed
- **Historical exemplars:** 1971 Pirates, 2002 Angels
- **Net ratings effects (cap-budget deltas):**
  - Arm **+24.0%** = +143/+137/+131 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Fielding **+22.0%** = +135/+129/+123 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Power **-5.0%** = -31/-29/-28 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Speed **-12.0%** = -74/-71/-68 combined pts (juiced/standard/nerfed) across your top-8 hitters
- **Measured value vs the 24-mean:** juiced +0.7% · standard +0.7% · nerfed +1.5%

### Gap-to-Gap — *doubles machine*

*Line drives in the gaps all day; the pitching just tries to keep up.*

- **Identity:** +contact +power → −rotation command −bullpen velocity
- **Historical exemplars:** 2003 Red Sox, 1996 Indians
- **Net ratings effects (cap-budget deltas):**
  - Contact **+15.0%** = +91/+87/+83 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Power **+5.0%** = +31/+29/+28 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Rotation Accuracy **-25.0%** = -75/-71/-68 combined pts (juiced/standard/nerfed) across your top-4 rotation
  - Bullpen Velocity **-20.0%** = -47/-45/-43 combined pts (juiced/standard/nerfed) across your top-3 bullpen
- **Measured value vs the 24-mean:** juiced +0.7% · standard +0.7% · nerfed +1.5%

### Web Gems — *the leather*

*Highlight-reel gloves turn every ball into an out; the bats are an afterthought.*

- **Identity:** +defense +arm → −power −contact
- **Historical exemplars:** 1969 Mets, 2021 Cardinals
- **Net ratings effects (cap-budget deltas):**
  - Fielding **+44.0%** = +270/+257/+246 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Arm **+12.0%** = +72/+68/+66 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Contact **-5.0%** = -30/-29/-28 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Power **-7.5%** = -46/-44/-42 combined pts (juiced/standard/nerfed) across your top-8 hitters
- **Measured value vs the 24-mean:** juiced +0.7% · standard +0.7% · nerfed +1.5%

### Launch & Leather — *three-true-outcomes + gloves*

*Mash and pick it clean; if the staff could find the zone they would be unbeatable.*

- **Identity:** +power +defense → −command (rotation & bullpen)
- **Historical exemplars:** 2016 Cubs, 2021 Astros
- **Net ratings effects (cap-budget deltas):**
  - Power **+7.5%** = +46/+44/+42 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Fielding **+22.0%** = +135/+129/+123 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Rotation Accuracy **-25.0%** = -75/-71/-68 combined pts (juiced/standard/nerfed) across your top-4 rotation
  - Bullpen Accuracy **-30.0%** = -59/-57/-54 combined pts (juiced/standard/nerfed) across your top-3 bullpen
- **Measured value vs the 24-mean:** juiced +0.5% · standard +0.4% · nerfed +0.5%

### No-Glove Offense — *all bat, no glove*

*Out-score everybody and pray the ball is never hit your way.*

- **Identity:** +power +contact → −defense −arm
- **Historical exemplars:** 1930 Phillies, 1996 Rockies
- **Net ratings effects (cap-budget deltas):**
  - Power **+5.0%** = +31/+29/+28 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Contact **+10.0%** = +61/+58/+56 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Fielding **-33.0%** = -202/-193/-185 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Arm **-18.0%** = -108/-103/-98 combined pts (juiced/standard/nerfed) across your top-8 hitters
- **Measured value vs the 24-mean:** juiced +0.6% · standard -0.4% · nerfed +1.5%

### Wheels & Cannons — *speed + arm*

*Steal a base, gun down a runner; the long ball belongs to the other guys.*

- **Identity:** +speed +arm → −power
- **Historical exemplars:** 1980 Expos, 1991 Braves
- **Net ratings effects (cap-budget deltas):**
  - Speed **+18.0%** = +111/+106/+102 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Arm **+12.0%** = +72/+68/+66 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Power **-10.0%** = -61/-59/-56 combined pts (juiced/standard/nerfed) across your top-8 hitters
- **Measured value vs the 24-mean:** juiced +0.7% · standard +0.6% · nerfed +1.6%

### Rangy Defenders — *athletic defense*

*Cover every blade of grass and throw out anybody; the runs come the hard way.*

- **Identity:** +speed +arm +defense → −power −contact
- **Historical exemplars:** 2017 Diamondbacks, 2010 Padres
- **Net ratings effects (cap-budget deltas):**
  - Speed **+12.0%** = +74/+71/+68 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Arm **+12.0%** = +72/+68/+66 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Fielding **+22.0%** = +135/+129/+123 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Contact **-5.0%** = -30/-29/-28 combined pts (juiced/standard/nerfed) across your top-8 hitters
  - Power **-7.5%** = -46/-44/-42 combined pts (juiced/standard/nerfed) across your top-8 hitters
- **Measured value vs the 24-mean:** juiced +0.7% · standard +0.1% · nerfed +1.5%
