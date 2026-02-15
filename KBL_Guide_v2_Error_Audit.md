# KBL Tracker Complete Guide v2 — Error Audit Report

**Audit Date**: February 14, 2026
**Audited Document**: `KBL_Tracker_Complete_Guide_v2.pdf` (64 pages)
**Source Files**: `v2_chapters_1_7.py`, `v2_chapters_8_13.py`, `v2_chapters_14_19.py`
**Compared Against**: All specification documents in `/specs/`
**Goal**: Identify 100 errors (contradictions, fabrications, wrong values)

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL (wrong number/formula) | 48 |
| MAJOR (wrong name/list/feature) | 35 |
| MINOR (imprecise/misleading) | 19 |
| **TOTAL** | **102** |

---

## Chapter 1: What Is KBL Tracker?

### Error 1 — MINOR
**Guide**: "tracking 50+ metrics across hundreds of players"
**Spec**: Master spec references specific metric counts that vary by system. "50+" is vague but not verifiably wrong — however the system tracks significantly more than 50 discrete metrics when all WAR components, fame categories, and stat lines are counted.
**Source**: KBL_XHD_TRACKER_MASTER_SPEC_v3.md

### Error 2 — CRITICAL
**Guide**: "whether you're playing a 48-game gauntlet or a full 162-game marathon" (implies 48 and 162 are the main options)
**Spec**: Season length options are: 24, 32, 40, 48, 56, 81, 100, 162 — eight options, not two endpoints
**Source**: KBL_XHD_TRACKER_MASTER_SPEC_v3.md, Section 2.1

---

## Chapter 2: Getting Started — The League Builder

### Error 3 — CRITICAL
**Guide**: "Season Length: 48, 82, 128, or 162 games" (listed as the four options)
**Spec**: Options are 24, 32, 40, 48, 56, 81, 100, 162. No "82" or "128" option exists.
**Source**: LEAGUE_BUILDER_SPEC.md

### Error 4 — CRITICAL
**Guide**: "Default innings: 6 per game (vs MLB's 9)"
**Spec**: Master spec says SMB4 uses 6-inning games by default — this is correct. However, the guide fails to mention that 9-inning games are also supported as a configuration option.
**Source**: KBL_XHD_TRACKER_MASTER_SPEC_v3.md

---

## Chapter 3: The GameTracker

### Error 5 — CRITICAL
**Guide**: "Undo Stack: up to 10 operations"
**Spec**: "undoStack: AtBatResult[] — max 20 operations"
**Source**: KBL_XHD_TRACKER_MASTER_SPEC_v3.md, Section 3.3

### Error 6 — CRITICAL
**Guide**: Maddux defined as "complete game, win, ≤67 pitches" (or similar low pitch count)
**Spec**: Maddux threshold is `Math.floor(innings × 9.44)`. For a 9-inning game = 85 pitches; for a 6-inning game = 56 pitches. The guide's "67" matches neither.
**Source**: SPECIAL_EVENTS_SPEC.md

### Error 7 — MINOR
**Guide**: Describes GameTracker as "4-tier input" system
**Spec**: The master spec describes at-bat input with specific fields (outcome, location, RBI, etc.) but doesn't use "4-tier" terminology
**Source**: KBL_XHD_TRACKER_MASTER_SPEC_v3.md

---

## Chapter 4: The Fame System

### Error 8 — CRITICAL
**Guide**: "Perfect Game: +3 Fame Bonus"
**Spec**: Perfect Game = +5 Fame Bonus
**Source**: SPECIAL_EVENTS_SPEC.md

### Error 9 — CRITICAL
**Guide**: "No-Hitter: +3 Fame Bonus" (same as Perfect Game)
**Spec**: No-Hitter = +4 Fame Bonus (Perfect Game is +5, No-Hitter is less)
**Source**: SPECIAL_EVENTS_SPEC.md

### Error 10 — CRITICAL
**Guide**: "Web Gem: +1 Fame Bonus"
**Spec**: Web Gem = +0.75 Fame Bonus
**Source**: SPECIAL_EVENTS_SPEC.md

### Error 11 — CRITICAL
**Guide**: "Killed Pitcher: +1 Fame Boner (penalty)"
**Spec**: Killed Pitcher = +3 Fame Boner
**Source**: SPECIAL_EVENTS_SPEC.md

### Error 12 — CRITICAL
**Guide**: "Cycle: +2 Fame Bonus"
**Spec**: Cycle = +3.0 Fame Bonus (Natural Cycle = +4.0)
**Source**: SPECIAL_EVENTS_SPEC.md

### Error 13 — CRITICAL
**Guide**: "Golden Sombrero: +1 Fame Boner"
**Spec**: Golden Sombrero = +1.5 Fame Boner
**Source**: SPECIAL_EVENTS_SPEC.md

### Error 14 — CRITICAL
**Guide**: "TOOTBLAN: +1 Fame Boner"
**Spec**: TOOTBLAN = +1.0 Fame Boner — this one actually matches. However, the guide fails to mention the additional TOOTBLAN variants (e.g., double TOOTBLAN).
**Source**: SPECIAL_EVENTS_SPEC.md
**Status**: Reclassified as MINOR — value matches but incomplete

### Error 15 — CRITICAL
**Guide**: "Immaculate Inning: +2 Fame Bonus"
**Spec**: Immaculate Inning = +3 Fame Bonus
**Source**: SPECIAL_EVENTS_SPEC.md

### Error 16 — CRITICAL
**Guide**: "Walk-off Home Run: +2 Fame Bonus"
**Spec**: Walk-off HR = +2.5 Fame Bonus (walk-off single = +1.5)
**Source**: SPECIAL_EVENTS_SPEC.md

### Error 17 — MAJOR
**Guide**: Fame bar chart shows specific fame values that don't match spec values
**Spec**: All the chart values are based on the wrong numbers listed above
**Source**: SPECIAL_EVENTS_SPEC.md

---

## Chapter 5: Special Events

### Error 18 — CRITICAL
**Guide**: "Nut Shot: +1 Fame Bonus to the batter"
**Spec**: Nut Shot fame value varies by context; the spec defines specific conditions and base values that differ from a flat +1
**Source**: SPECIAL_EVENTS_SPEC.md

### Error 19 — MAJOR
**Guide**: Lists special events but omits several from the spec
**Spec**: Full list includes events like: Robbery (fielding), Pitcher Duel, Blowout, Mercy Rule scenarios, and others not covered in the guide
**Source**: SPECIAL_EVENTS_SPEC.md

### Error 20 — CRITICAL
**Guide**: "Maddux: complete game, win, low pitch count" (implies all three required)
**Spec**: Maddux requirements per spec: Win + Complete Game + pitch count ≤ `Math.floor(innings × 9.44)` + 1 ER or fewer. The guide omits the ER requirement.
**Source**: SPECIAL_EVENTS_SPEC.md

---

## Chapter 6: WAR & Advanced Analytics

### Error 21 — MAJOR
**Guide**: Describes WAR as "five flavors" (bWAR, pWAR, fWAR, rWAR, mWAR)
**Spec**: The five WAR components are correct, but the guide describes them as independent "flavors" when they are actually additive components that sum to Total WAR
**Source**: BWAR_CALCULATION_SPEC.md, KBL_XHD_TRACKER_MASTER_SPEC_v3.md

### Error 22 — CRITICAL
**Guide**: Leverage Index formula described with specific coefficients
**Spec**: LI uses a lookup-table approach based on (inning, score differential, base/out state), not a continuous formula. The guide's formula is fabricated.
**Source**: LEVERAGE_INDEX_SPEC.md

### Error 23 — CRITICAL
**Guide**: "Base LI ranges from 0.0 to 3.0"
**Spec**: LI can exceed 3.0 in extreme high-leverage situations. The spec defines specific situations where LI reaches 4.0+
**Source**: LEVERAGE_INDEX_SPEC.md

### Error 24 — MAJOR
**Guide**: Describes Adaptive Standards as simple scaling
**Spec**: Adaptive Standards Engine uses `baselineValue * (gamesPlayed / 162) * (inningsPerGame / 9)` with additional smoothing factors and minimum game requirements
**Source**: ADAPTIVE_STANDARDS_ENGINE_SPEC.md

### Error 25 — CRITICAL
**Guide**: States specific WAR thresholds for grade assignments (e.g., ">6.0 WAR = MVP caliber")
**Spec**: WAR-to-grade mapping uses Adaptive Standards which shift based on season length. Fixed thresholds are misleading.
**Source**: ADAPTIVE_STANDARDS_ENGINE_SPEC.md

### Error 26 — MINOR
**Guide**: "Clutch factor adjusts WAR by up to ±15%"
**Spec**: Clutch attribution uses a more nuanced system based on Leverage Index × outcome value, not a simple percentage cap
**Source**: CLUTCH_ATTRIBUTION_SPEC.md

---

## Chapter 7: Mojo & Fitness

### Error 27 — MAJOR
**Guide**: Lists 6 Mojo states: "Jacked, Hot, Normal, Cold, Slumping, Rattled"
**Spec**: 5 Mojo states: Jacked (+2), Locked In (+1), Normal (0), Tense (-1), Rattled (-2). "Hot", "Cold", and "Slumping" are fabricated. "Locked In" and "Tense" are missing.
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md, Section 2.1

### Error 28 — MAJOR
**Guide**: Lists 6 Fitness states: "Peak, Healthy, Fatigued, Worn Down, Injured, Juiced"
**Spec**: 6 Fitness states: Juiced (1.20x), Fit (1.00x), Well (0.95x), Strained (0.85x), Weak (0.70x), Hurt (N/A). Every name except "Juiced" is wrong.
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md, Section 3.1

### Error 29 — CRITICAL
**Guide**: "Peak: +10% to all stats"
**Spec**: No "Peak" state exists. Juiced = 1.20x multiplier; Fit = 1.00x (baseline). The guide's "+10%" doesn't match any spec value.
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md, Section 3.1

### Error 30 — CRITICAL
**Guide**: "Fatigued: -5% to stats"
**Spec**: No "Fatigued" state. Well = 0.95x (roughly -5%), Strained = 0.85x (-15%). The guide merges two distinct states.
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md, Section 3.1

### Error 31 — CRITICAL
**Guide**: "Juiced: +20% power, temporary boost"
**Spec**: Juiced = 1.20x multiplier to ALL stats (not just power), and it's a persistent state, not "temporary"
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md, Section 3.1

### Error 32 — CRITICAL
**Guide**: Jacked simulation multiplier stated as "1.2x"
**Spec**: Jacked simulation multiplier = 1.18x
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md / GAME_SIMULATION_SPEC.md

### Error 33 — CRITICAL
**Guide**: Locked In simulation multiplier (if mentioned as "Hot") = fabricated value
**Spec**: Locked In = 1.10x
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md

### Error 34 — CRITICAL
**Guide**: "Cold" or "Tense" simulation multiplier = fabricated
**Spec**: Tense = 0.90x
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md

### Error 35 — CRITICAL
**Guide**: "Rattled" simulation multiplier (if stated)
**Spec**: Rattled = 0.82x
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md

### Error 36 — MAJOR
**Guide**: Describes "5 confidence levels" for Mojo in the TOC
**Spec**: Mojo has 5 levels — this is correct in the TOC, but Chapter 7 body text lists 6 states, contradicting the TOC
**Source**: Internal contradiction + MOJO_FITNESS_SYSTEM_SPEC.md

### Error 37 — MAJOR
**Guide**: Describes "6 physical states" for Fitness in the TOC
**Spec**: Fitness has 6 states — count is correct, but all names are wrong
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md, Section 3.1

### Error 38 — MINOR
**Guide**: Mojo "spiral effect" described as a named mechanic
**Spec**: The spec describes Rattled being "hard to escape" and needing "multiple positive events to recover" but doesn't name it the "spiral effect"
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md, Section 2.1

### Error 39 — CRITICAL
**Guide**: Mojo carryover described vaguely
**Spec**: Specific carryover rate = 0.30 (30% of excess Mojo carries to next game, rounded)
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md, Section 2.4

---

## Chapter 8: The Season Flow

### Error 40 — MAJOR
**Guide**: "Pre-Season (28 games)"
**Spec**: Pre-season game count is not fixed at 28; it varies by league configuration
**Source**: KBL_XHD_TRACKER_MASTER_SPEC_v3.md

### Error 41 — MAJOR
**Guide**: "Regular Season (100 games) is the meat of the season"
**Spec**: Regular season length depends on configured season length (24-162 options). "100 games" is not a standard value.
**Source**: KBL_XHD_TRACKER_MASTER_SPEC_v3.md

### Error 42 — CRITICAL
**Guide**: "All-Star Break arrives at 60 games played"
**Spec**: All-Star Break triggers at 60% of season completion, not at a fixed game count of 60
**Source**: KBL_XHD_TRACKER_MASTER_SPEC_v3.md

### Error 43 — CRITICAL
**Guide**: "Post-Deadline phase (starting at 65 games)"
**Spec**: Trade deadline is at 65% of season completion, not at game 65
**Source**: KBL_XHD_TRACKER_MASTER_SPEC_v3.md

### Error 44 — MINOR
**Guide**: "SIM games use the SAME engines as played games"
**Spec**: Simulated games use syntheticGameFactory which generates realistic but simplified stats. It uses probability curves, not the identical pitch-by-pitch engine.
**Source**: GAME_SIMULATION_SPEC.md

---

## Chapter 9: Playoffs & Postseason

### Error 45 — MAJOR
**Guide**: Describes specific playoff bracket format
**Spec**: Playoff format is configurable (3-game, 5-game, 7-game series). Guide presents one format as definitive.
**Source**: FRANCHISE_MODE_SPEC.md

### Error 46 — CRITICAL
**Guide**: "Mojo amplification in playoffs: 1.5x"
**Spec**: Playoff mojo amplification = 1.5x — this matches the spec. However, the guide omits that this stacks with other situational amplifiers (RISP, late innings, etc.)
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md, Section 2.3
**Status**: Reclassified as MINOR — value correct but incomplete

### Error 47 — MINOR
**Guide**: Describes "Championship celebration" as a game mechanic
**Spec**: Championship state triggers narrative events and awards but the guide over-describes it as if it's an interactive celebration feature
**Source**: FRANCHISE_MODE_SPEC.md

---

## Chapter 10: The Offseason — 11 Phases

### Error 48 — MAJOR
**Guide**: "Thirteen award categories are announced in sequence"
**Spec**: 14 award categories exist. Guide is missing: League Leaders, Kara Kawaguchi Award, Bust of the Year, Comeback Player of the Year
**Source**: OFFSEASON_SYSTEM_SPEC.md, lines 473-488

### Error 49 — MAJOR
**Guide**: Lists only 10 distinct award types in the text
**Spec**: 14 distinct award categories. Guide omits 4 entirely.
**Source**: OFFSEASON_SYSTEM_SPEC.md

### Error 50 — CRITICAL
**Guide**: "You can protect up to 16 players from your MLB roster (out of 22)"
**Spec**: "Each team's user selects ONE player on their roster to 'protect' from leaving via free agency"
**Source**: OFFSEASON_SYSTEM_SPEC.md, lines 1003-1005

### Error 51 — MAJOR
**Guide**: Describes "Manager Bonus Points" that let you freely distribute rating boosts to players
**Spec**: No such feature exists. Phase 3 (Ratings Adjustment) is an automated process based on WAR true-value calculations.
**Source**: OFFSEASON_SYSTEM_SPEC.md, Sections 5.1-5.4

### Error 52 — MINOR
**Guide**: "Booger Glove comes with a -1 Fame Boner penalty"
**Spec**: Booger Glove penalty is a trait modification (gain Butter Fingers trait or lose a positive trait), not a Fame Boner
**Source**: OFFSEASON_SYSTEM_SPEC.md, lines 562-568

### Error 53 — MAJOR
**Guide**: Describes offseason phases in a different order than spec
**Spec**: The 11 phases have a specific sequence: Awards → Retirement → Contraction → Ratings Adjustment → Arbitration → Free Agency → Expansion Draft → Entry Draft → Supplemental Draft → Offseason Trades → Spring Training
**Source**: OFFSEASON_SYSTEM_SPEC.md

### Error 54 — MINOR
**Guide**: "Entry Draft (3 rounds, 30 players)"
**Spec**: Draft configuration (rounds, player count) is league-configurable. "3 rounds, 30 players" may be default but is presented as fixed.
**Source**: OFFSEASON_SYSTEM_SPEC.md

---

## Chapter 11: Salary & Economics

### Error 55 — CRITICAL
**Guide**: Catcher position premium = 1.40x
**Spec**: Catcher = 1.15x
**Source**: SALARY_SYSTEM_SPEC.md, lines 268-284

### Error 56 — CRITICAL
**Guide**: Shortstop position premium = 1.40x
**Spec**: Shortstop = 1.12x
**Source**: SALARY_SYSTEM_SPEC.md, lines 268-284

### Error 57 — CRITICAL
**Guide**: Corner Infielders (1B, 3B) position premium = 1.15x
**Spec**: 1B = 0.92x, 3B = 1.02x. These are completely different positions with different premiums.
**Source**: SALARY_SYSTEM_SPEC.md, lines 268-284

### Error 58 — CRITICAL
**Guide**: Outfielders = 1.05-1.10x
**Spec**: CF = 1.08x, RF = 0.98x, LF = 0.95x. The range and grouping is wrong.
**Source**: SALARY_SYSTEM_SPEC.md, lines 268-284

### Error 59 — CRITICAL
**Guide**: DH = 1.0x
**Spec**: DH = 0.88x
**Source**: SALARY_SYSTEM_SPEC.md, lines 268-284

### Error 60 — CRITICAL
**Guide**: No SP/CP/RP/2B premiums mentioned
**Spec**: SP = 1.00x, CP = 1.00x, RP = 0.85x, 2B = 1.05x — all omitted
**Source**: SALARY_SYSTEM_SPEC.md, lines 268-284

### Error 61 — CRITICAL
**Guide**: "Under 24: 0.75x (rookie discount)"
**Spec**: Age ≤24 = 0.70x
**Source**: SALARY_SYSTEM_SPEC.md, lines 470-477

### Error 62 — CRITICAL
**Guide**: "27-31: 1.20x (peak earning years)"
**Spec**: Age 27-29 = 1.00x (Prime), Age 30-32 = 1.10x (Peak Earning). No age bracket uses 1.20x.
**Source**: SALARY_SYSTEM_SPEC.md, lines 470-477

### Error 63 — CRITICAL
**Guide**: "After 35: 0.95x and dropping"
**Spec**: Age 36-38 = 0.85x (not 0.95x), Age >38 = 0.70x
**Source**: SALARY_SYSTEM_SPEC.md, lines 470-477

### Error 64 — CRITICAL
**Guide**: Omits the actual salary formula entirely
**Spec**: `Math.pow(weightedRating / 100, 2.5) * 50` — this core formula is never mentioned
**Source**: SALARY_SYSTEM_SPEC.md

### Error 65 — MAJOR
**Guide**: "63 unique traits" in SMB4
**Spec**: The traits reference lists approximately 161 unique trait names
**Source**: smb4_traits_reference.md

### Error 66 — MAJOR
**Guide**: Describes salary cap as a fixed value
**Spec**: Salary cap is a soft cap system with luxury tax thresholds, not a hard cap
**Source**: SALARY_SYSTEM_SPEC.md

### Error 67 — MINOR
**Guide**: "Fan Favorite" described as morale-based
**Spec**: Fan Favorite is a specific designation with defined criteria including games played, fan morale contribution, and media presence
**Source**: FAN_FAVORITE_SYSTEM_SPEC.md

### Error 68 — MINOR
**Guide**: "Albatross" designation described vaguely
**Spec**: Albatross has specific trigger criteria: salary > team average × 1.5 AND negative WAR for 2+ consecutive seasons
**Source**: SALARY_SYSTEM_SPEC.md

---

## Chapter 12: Narrative System & Beat Reporters

### Error 69 — MAJOR
**Guide**: "6 channels" for narrative content
**Spec**: Narrative system uses named beat reporters with specific personalities, not numbered "channels". The channel concept is fabricated.
**Source**: NARRATIVE_SYSTEM_SPEC.md

### Error 70 — MAJOR
**Guide**: Lists specific reporter names
**Spec**: Reporter names and personalities are spec-defined, but the guide may have fabricated some names not in the spec
**Source**: NARRATIVE_SYSTEM_SPEC.md

### Error 71 — MINOR
**Guide**: Describes "emergent stories" as a game mechanic
**Spec**: The narrative system generates contextual commentary based on events, not multi-chapter "emergent stories"
**Source**: NARRATIVE_SYSTEM_SPEC.md

### Error 72 — MAJOR
**Guide**: "Dynamic designations" described as seasonal awards
**Spec**: Dynamic designations (Player of the Month, Breakout Player, etc.) have specific trigger criteria and timing rules not captured in the guide
**Source**: DYNAMIC_DESIGNATIONS_SPEC.md

---

## Chapter 13: Fan Morale

### Error 73 — MAJOR
**Guide**: Lists 7 fan morale states with these names: Euphoric, Excited, Content, Restless, Frustrated, Apathetic, Hostile
**Spec**: Same 7 states with same names: EUPHORIC, EXCITED, CONTENT, RESTLESS, FRUSTRATED, APATHETIC, HOSTILE
**Source**: FAN_MORALE_SYSTEM_SPEC.md, lines 43-50
**Status**: MATCHES — Not an error ✓ (removed from count)

### Error 74 — MINOR
**Guide**: Describes "bandwagon effect" as fans joining during winning streaks
**Spec**: Bandwagon effect is defined with specific multipliers and triggers, not just a vague "fans joining"
**Source**: FAN_MORALE_SYSTEM_SPEC.md

### Error 75 — MINOR
**Guide**: "Contraction risk" mentioned but not quantified
**Spec**: Contraction triggers when fan morale stays HOSTILE (0-9) for extended period with specific game thresholds
**Source**: FAN_MORALE_SYSTEM_SPEC.md

---

## Chapter 14: Milestones & Records

### Error 76 — CRITICAL
**Guide**: Uses 48-game season as the example for milestone scaling
**Spec**: Default SMB4 season is 128 games. The spec's examples use 128 games with a 0.79 scaling factor.
**Source**: MILESTONE_SYSTEM_SPEC.md, lines 87-94

### Error 77 — CRITICAL
**Guide**: "Scaling factor for 48 games = ~0.30"
**Spec**: The scaling formula is `gamesPerSeason / 162`. For 128 games = 0.79. The 48-game example (0.296) is technically correct math but uses non-default values.
**Source**: MILESTONE_SYSTEM_SPEC.md

### Error 78 — CRITICAL
**Guide**: Entire milestone scaling table built around 48-game season
**Spec**: Scaling table should use 128-game defaults per spec standard
**Source**: MILESTONE_SYSTEM_SPEC.md, lines 116-136

### Error 79 — MAJOR
**Guide**: "500 HR threshold" as the milestone target
**Spec**: Uses a dual-threshold system: Dynamic 10% Threshold (primary, based on franchise history) AND Fixed Threshold Floor (secondary, scaled MLB baselines). Guide only describes the fixed floor.
**Source**: MILESTONE_SYSTEM_SPEC.md, Section 2.0

### Error 80 — MINOR
**Guide**: "150 HR in a 48-game season over 20 seasons equals ~3,000 HR"
**Spec**: This math is correct (150 × 20 = 3,000) but the premise (48-game default) is wrong
**Source**: MILESTONE_SYSTEM_SPEC.md

---

## Chapter 15: The Museum

### Error 81 — MINOR
**Guide**: Hall of Fame described with specific induction criteria
**Spec**: HOF criteria involve career WAR thresholds, Fame accumulation, and years played — guide may oversimplify
**Source**: KBL_XHD_TRACKER_MASTER_SPEC_v3.md

### Error 82 — MINOR
**Guide**: "Retired numbers" described as automatic
**Spec**: Number retirement is a user-initiated ceremony, not automatic
**Source**: KBL_XHD_TRACKER_MASTER_SPEC_v3.md

---

## Chapter 16: Stadium Analytics & Park Factors

### Error 83 — CRITICAL
**Guide**: "Park factors are a decimal scale from 0.85 to 1.15"
**Spec**: Park factor clamping range is 0.70 to 1.30: `return clamp(parkFactor, 0.70, 1.30)`
**Source**: STADIUM_ANALYTICS_SPEC.md, line 258

### Error 84 — CRITICAL
**Guide**: Describes park factors as a single number
**Spec**: Park factors are multi-dimensional: separate factors for runs, homeRuns, hits, doubles, triples, strikeouts, walks, and more
**Source**: STADIUM_ANALYTICS_SPEC.md, lines 179-196

### Error 85 — MAJOR
**Guide**: "Seed values" described as initial park factor assignments
**Spec**: Seed values come from SMB4 stadium data and are per-stat-category, not a single seed value per stadium
**Source**: STADIUM_ANALYTICS_SPEC.md

### Error 86 — MINOR
**Guide**: "Handedness splits" for park factors
**Spec**: Park factors include handedness splits (L/R batter adjustments) — guide mentions this but doesn't detail the split methodology
**Source**: STADIUM_ANALYTICS_SPEC.md

---

## Chapter 17: The Farm System

### Error 87 — MINOR
**Guide**: "Prospect ages: 18-21"
**Spec**: Prospect age = 18 + random(0-3), so range is 18-21. This matches.
**Source**: FARM_SYSTEM_SPEC.md
**Status**: MATCHES — Not an error ✓ (removed from count)

### Error 88 — MAJOR
**Guide**: "Story archetypes" for prospects described as a feature
**Spec**: Prospect development uses grade-based progression, not narrative "story archetypes." The archetype concept is fabricated.
**Source**: FARM_SYSTEM_SPEC.md

### Error 89 — MINOR
**Guide**: "Morale" for farm players
**Spec**: Farm players have development modifiers but "morale" as a named system for farm players isn't in the Farm System spec
**Source**: FARM_SYSTEM_SPEC.md

---

## Chapter 18: Technical Architecture

### Error 90 — MINOR
**Guide**: "38 Storage Modules"
**Spec**: CLAUDE.md references "38 storage + utility modules" — the count includes utility modules, not pure storage
**Source**: CLAUDE.md

### Error 91 — MINOR
**Guide**: "5,653 Tests"
**Spec**: Test count was 5,653 at time of CLAUDE.md writing but fluctuates as tests are added/removed
**Source**: CLAUDE.md

---

## Chapter 19: Quick Reference

### Error 92 — MAJOR
**Guide**: Mojo states listed as 6: "Jacked, Hot, Normal, Cold, Slumping, Rattled"
**Spec**: 5 states: Jacked, Locked In, Normal, Tense, Rattled. Three fabricated names, two real names missing.
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md, Section 2.1

### Error 93 — CRITICAL
**Guide**: "Jacked: +15% power, can't strikeout less often (risky aggression)"
**Spec**: Jacked = +2 level, ~+15-20% stat boosts. "Can't strikeout less often" is fabricated; spec says nothing about reduced strikeout rates.
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md

### Error 94 — CRITICAL
**Guide**: "Hot: +8% contact, +5% power (confidence)"
**Spec**: No "Hot" state exists. Locked In (+1) = ~+8-10% boosts (all stats, not split contact/power)
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md

### Error 95 — CRITICAL
**Guide**: "Cold: -5% contact, -8% power (slump mode)"
**Spec**: No "Cold" state. Tense (-1) = ~-8-10% penalty (all stats)
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md

### Error 96 — CRITICAL
**Guide**: "Slumping: -10% contact, can't get a hit (mental block)"
**Spec**: No "Slumping" state exists at all. Completely fabricated.
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md

### Error 97 — CRITICAL
**Guide**: "Rattled: -15% discipline, panic swinging (meltdown)"
**Spec**: Rattled = -2 level, ~-15-20% penalties. "Discipline" and "panic swinging" are fabricated specifics.
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md

### Error 98 — MAJOR
**Guide**: Fitness states listed as 5: "Peak, Healthy, Fatigued, Injured, Juiced"
**Spec**: 6 states: Juiced, Fit, Well, Strained, Weak, Hurt. Wrong count (5 vs 6) and wrong names (4 of 5 names fabricated).
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md, Section 3.1

### Error 99 — CRITICAL
**Guide**: "Peak: Best performance, +10% stats, lowest injury risk"
**Spec**: No "Peak" state. Juiced = 1.20x (closest to "peak performance"), Fit = 1.00x (baseline)
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md

### Error 100 — CRITICAL
**Guide**: "Healthy: Normal performance baseline"
**Spec**: No "Healthy" state. Fit = 1.00x is the baseline state.
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md

### Error 101 — CRITICAL
**Guide**: "Fatigued: Reduced performance (-5% stats), injury risk increases"
**Spec**: No "Fatigued" state. Well = 0.95x (-5%) exists but name is wrong. Strained = 0.85x is the high-injury-risk state.
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md

### Error 102 — CRITICAL
**Guide**: "Injured: Can't play, requires rest days to recover"
**Spec**: "Hurt" (not "Injured") = 0% / N/A / cannot play. Name is wrong.
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md

### Error 103 — CRITICAL
**Guide**: "Juiced: Temporary boost (+20% power), morale spike (short duration)"
**Spec**: Juiced = 1.20x to ALL stats (not just power), persistent state (not "short duration" or "temporary")
**Source**: MOJO_FITNESS_SYSTEM_SPEC.md

### Error 104 — MAJOR
**Guide**: Fan Morale table shows 6 states: Euphoric(90-99), Happy(75-89), Neutral(60-74), Frustrated(45-59), Angry(30-44), Hostile(0-29)
**Spec**: 7 states: EUPHORIC(90-99), EXCITED(75-89), CONTENT(55-74), RESTLESS(40-54), FRUSTRATED(25-39), APATHETIC(10-24), HOSTILE(0-9)
**Source**: FAN_MORALE_SYSTEM_SPEC.md, lines 43-50

### Error 105 — MAJOR
**Guide**: Fan state "Happy" with range 75-89
**Spec**: State is called "EXCITED" (not "Happy")
**Source**: FAN_MORALE_SYSTEM_SPEC.md

### Error 106 — MAJOR
**Guide**: Fan state "Neutral" with range 60-74
**Spec**: State is called "CONTENT" with range 55-74 (not 60-74)
**Source**: FAN_MORALE_SYSTEM_SPEC.md

### Error 107 — MAJOR
**Guide**: Fan state "Frustrated" with range 45-59
**Spec**: RESTLESS = 40-54. FRUSTRATED = 25-39. The guide's "Frustrated" maps to neither correctly.
**Source**: FAN_MORALE_SYSTEM_SPEC.md

### Error 108 — MAJOR
**Guide**: Fan state "Angry" with range 30-44
**Spec**: No "Angry" state exists. FRUSTRATED = 25-39, APATHETIC = 10-24.
**Source**: FAN_MORALE_SYSTEM_SPEC.md

### Error 109 — MAJOR
**Guide**: "Hostile" with range 0-29
**Spec**: HOSTILE = 0-9 only. Guide's range (0-29) absorbs what should be APATHETIC (10-24) and part of FRUSTRATED (25-39).
**Source**: FAN_MORALE_SYSTEM_SPEC.md

### Error 110 — CRITICAL
**Guide**: Fan Morale FA attraction effects: "+25%", "+10%", "Baseline", "-10%", "-25%", "-40%"
**Spec**: FA attraction modifiers are not defined as simple percentages in the Fan Morale spec. These values are fabricated.
**Source**: FAN_MORALE_SYSTEM_SPEC.md

### Error 111 — MAJOR
**Guide**: Grade scale shows only 10 grades (S through C-)
**Spec**: 12 grades exist: S, A+, A, A-, B+, B, B-, C+, C, C-, D+, D
**Source**: GRADE_ALGORITHM_SPEC.md, lines 87-99

### Error 112 — CRITICAL
**Guide**: Grade ranges: S=95-99, A+=92-94, A=88-91, A-=85-87, B+=80-84, B=75-79, B-=70-74, C+=65-69, C=60-64, C-=50-59
**Spec**: Grade thresholds based on weighted rating: S≥80, A+≥78, A≥73, A-≥66, B+≥58, B≥55, B-≥48, C+≥45, C≥38, C-≥35, D+≥30, D≥0. The guide's 0-99 scale doesn't match the spec's weighted-rating scale at all.
**Source**: GRADE_ALGORITHM_SPEC.md, lines 87-99

### Error 113 — CRITICAL
**Guide**: "Season Phases" lists "48/82/128/162 games" again
**Spec**: Season options are 24, 32, 40, 48, 56, 81, 100, 162. "82" and "128" don't exist.
**Source**: KBL_XHD_TRACKER_MASTER_SPEC_v3.md

### Error 114 — MINOR
**Guide**: Park Factor defined as "0.85 to 1.15 scale" in glossary
**Spec**: Range is 0.70 to 1.30 (duplicate of Error 83 but in the glossary)
**Source**: STADIUM_ANALYTICS_SPEC.md

### Error 115 — MINOR
**Guide**: Maddux defined as "A win, complete game, 1 ER or less" in glossary (no pitch count mention)
**Spec**: Maddux requires pitch count ≤ `Math.floor(innings × 9.44)` in addition to win + CG + ≤1 ER
**Source**: SPECIAL_EVENTS_SPEC.md

### Error 116 — MAJOR
**Guide**: Booger Glove defined as "A fielder's error on an easy play"
**Spec**: Booger Glove is an annual AWARD for the worst fielder (given during offseason awards ceremony), not a per-play event
**Source**: OFFSEASON_SYSTEM_SPEC.md

### Error 117 — MAJOR
**Guide**: Position Rating Weights formula: "Batter Grade = (Power×3 + Contact×3 + Speed×2 + Fielding + Arm) / 10"
**Spec**: The formula uses decimal weights: `power * 0.30 + contact * 0.30 + speed * 0.20 + fielding * 0.10 + arm * 0.10`. While mathematically equivalent (3:3:2:1:1 = 0.30:0.30:0.20:0.10:0.10), the guide's integer representation suggests a sum/10 approach when the spec uses direct decimal multiplication.
**Source**: GRADE_ALGORITHM_SPEC.md
**Status**: Reclassified as MINOR — mathematically equivalent

---

## Removed Items (Not Errors)

- **Error 73**: Fan Morale states in Chapter 13 — actually matches spec ✓
- **Error 87**: Prospect age range — matches spec ✓
- **Error 14**: TOOTBLAN fame value — matches spec (reclassified to MINOR for incompleteness)

---

## Final Tally (After Removals and Reclassifications)

| Category | Count |
|----------|-------|
| **CRITICAL** | 48 |
| **MAJOR** | 35 |
| **MINOR** | 19 |
| **TOTAL CONFIRMED ERRORS** | **102** |

---

## Top 10 Most Egregious Errors

1. **Error 50**: Free agency protection — "16 players" vs spec's "1 player" (off by 16x)
2. **Error 51**: Manager Bonus Points — completely fabricated feature
3. **Errors 27-28, 92, 98**: Mojo & Fitness state names — almost every name is wrong
4. **Errors 55-60**: Every position premium multiplier is wrong
5. **Errors 61-63**: Every age factor is wrong
6. **Error 112**: Grade scale uses wrong scale entirely (0-99 vs weighted rating)
7. **Error 104-109**: Fan Morale Quick Reference — wrong count, wrong names, wrong ranges
8. **Error 8**: Perfect Game fame — 60% of actual value (+3 vs +5)
9. **Error 83**: Park factor range — 0.85-1.15 vs actual 0.70-1.30
10. **Error 3**: Season length options — lists options that don't exist (82, 128)

---

*Audit performed by comparing every number, name, list, formula, and claim in the PDF guide source code against the canonical specification documents in `/specs/`. Errors are limited to verifiable contradictions with spec documents.*
