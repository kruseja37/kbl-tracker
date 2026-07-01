# The 24 Team Archetypes — Construction & Design Reference

> **Status: CANONICAL, 2026-06-30.** The v1 team-archetype set: 15 original + 9 gap-fill = **24**, every one
> balance-tested. Data: `src/data/historicalArchetypes.ts`. Gate: `src/engines/__tests__/historicalArchetypes.test.ts`
> (value parity ±10% across juiced/standard/nerfed **on legal rosters**). Decision record:
> `SCOUTING_INTELLIGENCE_INTERROGATION_TRANSCRIPT.md` §(b).

---

## What a team archetype is

An archetype is a **team identity** — a real historical club's flavor — expressed as a **trade-off**: it lets you
**over-stack** one or two rating areas without paying the luxury tax (its **boosts**), in exchange for **giving up**
one or two others (its **sacrifices**). It changes exactly two things: how cheaply you can build toward that
identity in the auction, and the lens your Assistant GM reasons through. It is **not** a stat buff to your players —
it's *headroom*: permission to concentrate.

The point is the sacrifice. A power identity that gives up nothing would just be "better." Because every archetype
pays for its strength somewhere, no identity is strictly stronger than another — which is what the balance testing
below proves.

### The six flavors
Every archetype is built from shifts across six areas: **Power · Contact · Speed · Defense** (fielding + arm) **·
Rotation** (starter velo/junk/command) **· Bullpen** (reliever velo/junk/command). The 24 are spread across all six
so a GM has real variety in every direction, not just the pitching-heavy skew the original 15 leaned toward.

### How these are balanced (and why it's trustworthy)
1. **Equal total value.** Each archetype builds its best-possible 22-man roster from the same player pool; every
   archetype's total team value lands within **±10%** of the group average, across all three difficulty tiers
   (max deviation observed: **4.4%**). No identity can build a richer roster than any other.
2. **Legal rosters only.** That comparison is run on **real, fieldable SMB4 rosters** — 8 field starters (one of
   each position), a required backup catcher, 4 starters, 4–5 relievers, a 4–5-man bench (14 position + 8 pitchers,
   or 13 + 9). So the result translates to an actual auction draft, not to impossible teams. (Canonical definition:
   `src/data/rosterConstruction.ts`.)
3. **Deferred:** a full head-to-head *win-rate* simulation (do equal-value teams win at equal rates when they
   actually play?) is a later project — see the decision record. v1 ships on equal-value + legal rosters.

### How to read the "estimated rating points" below
Each archetype lists its boosted/sacrificed areas with a rough **estimated rating-point effect** and the exact
**cap shift** (the real design lever). The rating-point number is a *rough estimate* of how much headroom the shift
buys, translated onto the familiar 0–99 rating scale — treat it as a feel, not a guarantee.

**One thing to notice:** cheaper areas (fielding, junk, bullpen) show *more* rating points for the same value
effect; premium areas (power, command) show *fewer*. That's real — a small power edge is worth as much as a big
fielding edge, because power is the scarcest, most valuable category in SMB4. So "+5 Power" and "+20 Fielding" can
be comparably impactful. Power-adders deliberately pay their bill in **pitching**, since power is the category most
worth taxing.

---

## POWER identities (bat-first, mash-and-accept-the-cost)

### Murderers' Row — *1927–28 Yankees*
Mash and hit for average — but never run. **+power +contact → −speed.**
> Power +5 (cap +7.5%) · Contact +6 (cap +10%) · Speed −11 (cap −18%)

### Bomba Squad — *2019 Twins*
Launch-angle thunder: 430 feet or a whiff. **+power → −contact −speed.**
> Power +6 (cap +10%) · Contact −9 (cap −15%) · Speed −7 (cap −12%)

### Bash Brothers — *1989 Athletics · 1996 Mariners*
Forearm-bashing bombs and cannon arms; the pitching leaks. **+power +arm → −command (rotation & bullpen).**
> Power +5 (cap +7.5%) · Arm +7 (cap +12%) · Rotation command −15 (cap −25%) · Bullpen command −18 (cap −30%)

### Launch & Leather — *2016 Cubs · 2021 Astros*
Mash and pick it clean; if the staff could find the zone they'd be unbeatable. **+power +defense → −command.**
> Power +5 (cap +7.5%) · Fielding +13 (cap +22%) · Rotation command −15 (cap −25%) · Bullpen command −18 (cap −30%)

### Gap-to-Gap — *2003 Red Sox · 1996 Indians*
Line drives in the gaps all day; the pitching just tries to keep up. **+contact +power → −rotation command −bullpen velo.**
> Contact +9 (cap +15%) · Power +3 (cap +5%) · Rotation command −15 (cap −25%) · Bullpen velo −12 (cap −20%)

### No-Glove Offense — *1930 Phillies · 1996 Rockies*
Out-score everybody and pray the ball is never hit your way. **+power +contact → −defense −arm.**
> Power +3 (cap +5%) · Contact +6 (cap +10%) · Fielding −20 (cap −33%) · Arm −11 (cap −18%)

### Toolsy Burners — *2007 Phillies · 2021 Blue Jays*
Power and wheels up and down the order; the arms and gloves are the price. **+power +speed → −rotation command −defense.**
> Power +3 (cap +5%) · Speed +11 (cap +18%) · Rotation command −15 (cap −25%) · Fielding −13 (cap −22%)

---

## CONTACT & SPEED identities (put it in play, take the extra base)

### Go-Go Small Ball — *1959 White Sox · 2026 Rays*
Put it in play, beat out the hit, win with the glove. **+contact +defense → −power.**
> Contact +9 (cap +15%) · Fielding +13 (cap +22%) · Power −6 (cap −10%)

### Hit 'Em Where They Ain't — *2001 Mariners · 1992 Brewers*
Slap it through the hole, leg out the extra base; the fences stay safe. **+contact +speed → −power.**
> Contact +9 (cap +15%) · Speed +7 (cap +12%) · Power −6 (cap −10%)

### Big Red Machine — *1975–76 Reds*
The complete offense that out-scores its ordinary rotation. **+contact +defense (+power) → −rotation.**
> Contact +9 (cap +15%) · Fielding +13 (cap +22%) · Power +2 (cap +2.5%) · Rotation velo −14 (cap −24%) · Rotation command −15 (cap −25%)

### Whiteyball — *1982 & 1985 Cardinals*
Turf-burning thieves and elite gloves; power is for other teams. **+speed +defense → −power.**
> Speed +11 (cap +18%) · Fielding +20 (cap +33%) · Power −6 (cap −10%)

### Billy Ball Burners — *1982 Athletics (Rickey Henderson)*
Steal first; the staff is an afterthought. **+speed → −power −rotation command.**
> Speed +14 (cap +24%) · Power −5 (cap −7.5%) · Rotation command −15 (cap −25%)

### Wheels & Cannons — *1980 Expos · 1991 Braves*
Steal a base, gun down a runner; the long ball belongs to the other guys. **+speed +arm → −power.**
> Speed +11 (cap +18%) · Arm +7 (cap +12%) · Power −6 (cap −10%)

---

## DEFENSE & ARM identities (run prevention, light bats)

### Cannon Corps — *1971 Pirates · 2002 Angels*
Rocket arms and sure hands; runners freeze and the bats stay quiet. **+arm +defense → −power −speed.**
> Arm +14 (cap +24%) · Fielding +13 (cap +22%) · Power −3 (cap −5%) · Speed −7 (cap −12%)

### Web Gems — *1969 Mets · 2021 Cardinals*
Highlight-reel gloves turn every ball into an out; the bats are an afterthought. **+defense +arm → −power −contact.**
> Fielding +26 (cap +44%) · Arm +7 (cap +12%) · Power −5 (cap −7.5%) · Contact −3 (cap −5%)

### Rangy Defenders — *2017 Diamondbacks · 2010 Padres*
Cover every blade of grass and throw out anybody; the runs come the hard way. **+speed +arm +defense → −power −contact.**
> Speed +7 (cap +12%) · Arm +7 (cap +12%) · Fielding +13 (cap +22%) · Power −5 (cap −7.5%) · Contact −3 (cap −5%)

### The Oriole Way — *1969–70 Orioles*
Run prevention: elite gloves behind pinpoint starters. **+defense +rotation command → −speed −bullpen velo.**
> Fielding +20 (cap +33%) · Rotation command +23 (cap +37.5%) · Speed −7 (cap −12%) · Bullpen velo −12 (cap −20%)

### Shift-Era Suppressors — *2008 & 2010 Rays*
Modern run prevention: defense and power arms, light bats. **+defense +rotation velo → −contact −bullpen command.**
> Fielding +20 (cap +33%) · Rotation velo +10 (cap +16%) · Contact −9 (cap −15%) · Bullpen command −18 (cap −30%)

---

## ROTATION identities (win on the starters)

### Junkball Surgeons — *1995 Braves · 1971 Orioles*
Maddux–Glavine: paint corners, change speeds; ordinary bats. **+rotation command +junk → −power −velocity.**
> Rotation command +23 (cap +37.5%) · Rotation junk +18 (cap +30%) · Power −3 (cap −5%) · Rotation velo −10 (cap −16%)

### Flamethrowers — *1963 Dodgers (Koufax/Drysdale)*
Koufax–Drysdale heat; the lineup is along for the ride. **+rotation velocity → −power −contact.**
> Rotation velo +19 (cap +32%) · Power −3 (cap −5%) · Contact −6 (cap −10%)

### Dead-Ball Suppressors — *1906 Cubs · 1907 Tigers*
Win 2–1: a bunt, a steal, and a junkballer who never gives in. **+rotation finesse +contact → −power −bullpen velo.**
> Rotation junk +27 (cap +45%) · Contact +6 (cap +10%) · Power −6 (cap −10%) · Bullpen velo −12 (cap −20%)

---

## BULLPEN identities (shorten the game)

### Nasty Boys — *1990 Reds*
A power pen that misses bats and a few zones. **+bullpen velocity → −bullpen command.**
> Bullpen velo +24 (cap +40%) · Bullpen command −27 (cap −45%)

### The Opener — *2018 Rays*
Bullpenning: relievers over starters. **+bullpen → −rotation.**
> Bullpen velo +18 (cap +30%) · Bullpen junk +21 (cap +35%) · Rotation velo −14 (cap −24%) · Rotation command −15 (cap −25%)

### HDH Royals — *2014–15 Royals*
Shorten the game: a lockdown pen and fast gloves. **+bullpen command +speed → −power −rotation command.**
> Bullpen command +27 (cap +45%) · Speed +7 (cap +12%) · Power −5 (cap −7.5%) · Rotation command −15 (cap −25%)

---

## Methodology notes

- **Estimated rating points** = the archetype's cap-shift fraction for that area × ~60 (a typical rostered rating),
  rounded. It's a rough translation of *tax-free headroom* onto the 0–99 rating scale — a design feel, not a
  per-player buff. The **cap shift %** beside it is the exact, tunable design value
  (`spec` × `ARCHETYPE_STAT_UNIT` in `historicalArchetypes.ts`).
- **Value calibration.** `ARCHETYPE_STAT_UNIT` is deliberately *inverse to value* — small for premium stats
  (Power 0.05), large for cheap ones (Fielding 0.22, Bullpen junk 0.35) — so a "1.0" boost is roughly
  value-comparable across areas even though the rating-point numbers differ.
- **Exemplars** are flavor and can be refined; they influence nothing mechanical. (One flagged tidy-up: the Rays
  appear across three archetypes — Go-Go 2026, The Opener 2018, Shift-Era 2008/10 — trimming Go-Go's 2026 Rays
  would spread the franchises more evenly.)
- **Tuning knobs (post-build §16):** the exact cap magnitudes per tier, and eventually the win-rate validation,
  remain open. The set is locked on value-parity + legal rosters for v1.
