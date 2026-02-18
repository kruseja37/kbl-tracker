# KBL Tracker - Feature Wishlist

> **Purpose**: Capture feature ideas and track spec vs implementation gaps.
> This prevents good ideas from being lost while maintaining sprint discipline.
>
> **Last Audited**: January 24, 2026 - Full spec-to-implementation audit completed
> **Last Updated**: February 12, 2026 - Reconciled against DATA_INTEGRITY_FIX_REPORT + recent sessions

---

## Audit Summary

| System | HIGH | MEDIUM | LOW | Total |
|--------|------|--------|-----|-------|
| WAR Calculation | 1 | 7 | 6 | 14 |
| Fame/Aging | 3 | 5 | 5 | 13 |
| Mojo/Fitness/Salary | 2 | 8 | 10 | 20 |
| Fan Morale/Narrative | 1 | 17 | 17 | 35 |
| Relationships/Chemistry | 10 | 8 | 6 | **24 (entire system missing)** |
| Fielding | 5 | 7 | 5 | 17 |
| **TOTAL** | **22** | **52** | **49** | **123** |

*Down from 124 (Jan 24). 13 items moved to Completed, 12 new items discovered.*

---

## HIGH Priority Gaps (Must Fix for MVP)

### WAR Calculation (1 gap)
| Feature | Spec Says | Implementation | Notes |
|---------|-----------|----------------|-------|
| Total WAR Aggregation | Position Player WAR = bWAR + rWAR + fWAR; Pitcher WAR = pWAR + fWAR + bWAR + rWAR | **MISSING** - No totalWARCalculator | No way to get combined player WAR |

### Fame/Aging (3 gaps)
| Feature | Spec Says | Implementation | Notes |
|---------|-----------|----------------|-------|
| Aging Engine | Players 18-29 improve, 30+ decline, max age 49 | **MISSING** - No agingEngine.ts | Core franchise feature missing |
| Age Curve Calculations | WAR decline calculations, "All Stats Drop (-5)" events | **MISSING** | Required for multi-season play |
| Juiced Per-Game Fame Penalty | Every game played while Juiced = -1 Fame | **PARTIAL** - Modifier exists but no auto-event | Core PED penalty not fully working |

### Mojo/Fitness/Salary (2 gaps)
| Feature | Spec Says | Implementation | Notes |
|---------|-----------|----------------|-------|
| Expected WAR from Salary | getExpectedWARFromSalary() for True Value | **MISSING** | Core function for value assessment |
| Fan Morale Happiness System | calculateFanMorale() with 0-100 happiness, high-payroll amplifiers | **MISSING** | Major gameplay feature |

### Fan Morale/Narrative (1 gap)
| Feature | Spec Says | Implementation | Notes |
|---------|-----------|----------------|-------|
| Beat Reporter → Fan Morale Integration | Reporter stories directly influence fan morale | **PARTIAL** - calculateStoryMoraleImpact exists but no integration point | Critical missing connection |

### Relationships/Chemistry (10 gaps - ENTIRE SYSTEM MISSING)
| Feature | Spec Says | Implementation | Notes |
|---------|-----------|----------------|-------|
| RelationshipType Enum | 9 types: DATING, MARRIED, DIVORCED, BEST_FRIENDS, MENTOR_PROTEGE, RIVALS, BULLY_VICTIM, JEALOUS, CRUSH | **MISSING** | No relationshipEngine.ts |
| RelationshipSchema | Complete schema with strength, visibility, status tracking | **MISSING** | Foundation not built |
| RELATIONSHIP_LIMITS | Per-player limits: DATING: 1, MARRIED: 1, etc. | **MISSING** | |
| SCALED_REQUIREMENTS | Game requirements for relationship formation | **MISSING** | |
| RELATIONSHIP_REQUIREMENTS | Per-type formation rules with compatibility checks | **MISSING** | |
| RELATIONSHIP_MORALE_EFFECTS | Ongoing morale from relationships | **MISSING** | Core immersion feature |
| applyRelationshipMoraleEffects() | Calculate and apply ongoing morale effects | **MISSING** | |
| REVENGE_ARC_TRIGGERS | 5 revenge arc types with LI/morale effects | **MISSING** | Dramatic gameplay feature |
| getRevengeArcsForGame() | Detect revenge arcs for cross-team matchups | **MISSING** | |
| getRelationshipTradeWarnings() | Show relationship impacts when considering trades | **MISSING** | UX feature |

### Fielding (5 gaps)
| Feature | Spec Says | Implementation | Notes |
|---------|-----------|----------------|-------|
| Adaptive Learning System | Track inference vs actual, update probabilities at n>=20 | **MISSING** | Core differentiating feature |
| Spray Chart Data Collection | Direction + depth tracking for every batted ball | **PARTIAL** - No depth, no persistence | Data collection needed for later UI |
| PlayerFieldingStats Aggregation | Per-position stats with breakdown | **MISSING** | Required for Gold Glove tracking |
| Data Persistence | FieldingPlay records stored for fWAR/spray charts | **MISSING** | All fielding data lost after game |
| Mental Error Type | 'mental' error with -0.25 fWAR penalty | **MISSING** from UI | Highest penalty error type |

---

## MEDIUM Priority Gaps (Should Have)

### WAR Calculation (7 gaps)
| Feature | Gap |
|---------|-----|
| Park Factor for Pitchers | No FIP adjustment for home stadium HR factor |
| Missed Dive Zero-Penalty | Spec says 0, implementation reduces but doesn't eliminate |
| Unassisted DP Value | Defined but not applied in calculateDPValue |
| Pickoff Penalties by Base | Same penalty for all bases, should vary |
| Tag-Up from 2nd | secondToHome_onFlyOut not credited |
| Expected WAR Calculators | getExpectedBWAR(), etc. not implemented |
| WAR Percentiles | getWARPercentileAtPosition() missing |

### Fame/Aging (5 gaps)
| Feature | Gap |
|---------|-----|
| Hit Streak Fame Triggers | +1 for 10+, +2 for 20+ not implemented |
| Juiced 50% Achievement Credit | Modifier exists but integration unclear |
| Juiced Milestone -1 Penalty | Additional penalty not implemented |
| Two-Way Player Fame Safeguard | No detection or reduction logic |
| Pre-Season Fame Assignment | Initial Fame values not set per spec |

### Mojo/Fitness/Salary (8 gaps)
| Feature | Gap |
|---------|-----|
| Mojo Splits for Pitching | Only batting splits tracked, not pitching by fitness |
| Pitcher Mojo/Fitness Context | No tracking at each PA for pitchers |
| Juiced Game Fame Penalty | Penalty exists but not auto-generated as events |
| 50% Fame Credit When Juiced | Not integrated with Fame calculations |
| Fitness Value Thresholds | Inconsistent between spec (40/60/80) and code (50/70/90) |
| Batting/Pitching Splits by Fitness | Not tracked |
| Value Delta Classification | isBargain, isOverpaid flags missing |
| Payroll-Based Win Expectation | getExpectedWinPctFromPayroll() missing |

### Fan Morale/Narrative (17 gaps)
| Feature | Gap |
|---------|-----|
| Management Action Events | Popular manager hired, ticket prices, stadium improvements, etc. |
| Trade Prospect for Veteran | Separate event types not implemented |
| Player Morale from Fan Morale | Personality modifiers not applied |
| FA Attractiveness from Morale | No calculateFAAttractiveness() |
| State Multipliers for Events | No diminishing/amplifying returns |
| PRE_GAME Narrative | Type exists but no templates/function |
| INJURY_REPORT Narrative | Type exists but no templates/function |
| CALL_UP Narrative | Type exists but no templates/function |
| RANDOM_EVENT Narrative | Type exists but no AI event integration |
| Reporter Hiring/Firing | No checkReporterFiring() system |
| Player Quote 80/20 Rule | No player personality in quotes |
| Lineup Analysis | No story-worthy situation detection |
| Historical Memory/Callbacks | No NarrativeMemory tracking |
| Trade Aftermath Narratives | Tracking exists but no story generation |
| Prospect Spotlight Narratives | Interface exists but no story generation |
| Opening Day Loss Event | -5 morale not implemented |
| All-Star Break Record-Based | Should be +5 winning, -5 losing |

### Relationships/Chemistry (8 gaps)
| Feature | Gap |
|---------|-----|
| Chemistry Combo Calculations | Personality pairings not implemented |
| calculateTeamChemistry() | No aggregation function |
| Chemistry Impact Thresholds | No clutch/FA effects |
| Romantic Gender Distribution | 90/10 opposite/same not implemented |
| Home Family LI Modifier | Non-player spouse/children bonus missing |
| Marriage/Divorce Processing | No processMarriage(), processDivorce() |
| Cross-Team Romantic Detection | No pre-game matchup detection |
| Beat Reporter Relationship Leaks | No leak system |

### Fielding (7 gaps)
| Feature | Gap |
|---------|-----|
| Assist Chain Details | Missing assistType, targetBase fields |
| Star Play Types (running/sliding/over_shoulder) | Not in UI, only in calculator |
| Comebacker Injury → Substitution | Doesn't auto-trigger pitching change |
| FieldingPlay Schema Fields | Missing dpRole, errorContext, depth |
| Catcher Strikeout Putouts | Not auto-credited on K/KL |
| Outfield Assist Target Base | UI doesn't capture which base |
| Hit Fielder Tracking | Fielder not tracked on clean hits |

---

## Design Intent — Future Systems (Captured from Phase 2 Audit)

### Trait System (SMB4-Accurate, Per-Player Situational Rating Modifiers)
**Added:** 2026-02-18 | **Source:** BillyYank SMB4 Guide 3rd Ed + Phase 2 audit

**What SMB4 traits actually are:**
Each player has up to 2 traits. Each trait gives a ±rating bonus in a specific in-game situation. The size of the bonus is determined by how many players of the trait's chemistry type are on the roster (trait potency):
- Level 1 (0-2 players of that chemistry): minimal effect
- Level 2 (3-6 players): mid-level effect
- Level 3 (7+ players): huge effect

Traits are purely mechanical. Examples from the guide:
| Trait | Trigger | Level 1 | Level 2 | Level 3 |
|-------|---------|---------|---------|---------|
| K Collector (Competitive) | Pitcher, 2-strike count | +8 VEL/JNK | +15 VEL/JNK | +30 VEL/JNK |
| Tough Out (Competitive) | Batter, 2-strike count | +12 CON | +25 CON | +50 CON |
| Whiffer (Competitive) | Batter, 2-strike count | -50 CON | -25 CON | -12 CON |
| First Pitch Slayer (Competitive) | Batter, 0-0 count | +5 POW/+8 CON | +10 POW/+15 CON | +20 POW/+30 CON |
| Cannon Arm (Competitive) | Fielder, max-power throw | minor | major | huge |
| Sprinter (Competitive) | Batter, out of box | minor | major | huge |
| K Neglecter (Competitive) | Pitcher, 2-strike count | -30 VEL/JNK | -15 VEL/JNK | -8 VEL/JNK |

(Full trait list in BillyYank SMB4 Guide 3rd Ed — Traits section, all 5 chemistry types)

**KBL implementation intent:**
- Each Player gets `traits: Trait[]` (max 2) — first-class field on Player type
- Each Trait has: name, chemistryType, trigger condition, effect (stat + delta at each potency level)
- At game time: check trigger condition → look up team chemistry potency for that trait's type → apply delta to relevant rating for that play/at-bat
- Traits fire at the engine level (GameTracker play resolution), not UI level
- Negative traits must be preserved — they are part of roster construction strategy
- Chemistry potency calculation: count players of each chemistry type on active roster

**Key design constraint:** Traits and morale are independent systems. Do not couple them.

**Priority:** HIGH for franchise authenticity — this is a core SMB4 differentiator.
**Dependency:** Chemistry type must be a field on Player before traits can be built.

---

### Player Morale System (OOTP-Inspired)
**Added:** 2026-02-18 | **Source:** Phase 2 audit FINDING-101 + OOTP_ARCHITECTURE_RESEARCH.md Section 7.2

**Context:**
KBL currently has Fan Morale (per-team audience sentiment, SMB4-original). OOTP has a separate
per-player morale system that is architecturally distinct. These are two different things and KBL
should eventually have both.

**What OOTP does (the reference pattern):**
Each player has 5 morale categories tracked independently:
1. **Team Performance** — How the team is doing overall
2. **Player Performance** — How the individual is performing
3. **Roster Moves** — Reactions to trades, signings, releases
4. **Expected Role** — Whether playing time matches expectations
5. **Team Chemistry** — Clubhouse atmosphere

Key behaviors:
- Small but real impact on in-game performance (cumulative over season)
- Perennially unhappy players develop slower
- Happy players perform slightly better
- Morale shifts are storyline triggers and results
- Players prioritize categories differently (prospects care more about role than wins)

**Clarification on SMB4 systems (do not conflate these):**
- **Traits** — situational ±rating modifiers (e.g. K Collector: +30 VEL/JNK on 2-strike counts; Tough Out: +50 Contact on 2-strike counts). Pure mechanical system. Scaled by chemistry potency. Nothing to do with morale or personality.
- **Chemistry** — team composition (Competitive/Spirited/Crafty/Disciplined/Scholarly). Determines trait potency tiers (0-2 players = level 1, 3-6 = level 2, 7+ = level 3). Also pure mechanical.
- **Morale** — player sentiment/happiness. Separate from both. This is what we are designing here.
- **Personality** — separate from all of the above.

**KBL design intent — adopt OOTP 5-category structure:**
Adopt OOTP's per-player morale structure directly. No SMB4 analog exists for this — it is an OOTP pattern being added to KBL.

| OOTP Category | KBL Implementation | Notes |
|--------------|---------------------|-------|
| Team Performance | Win/loss record, standings position | Direct analog |
| Player Performance | Grade vs expectation (A player in B role = unhappy) | Use KBL grade system |
| Roster Moves | Trades, DFA, call-ups, releases | Direct analog |
| Expected Role | Lineup slot, batting order position, starts vs bench | "I should be batting 3rd" |
| Team Chemistry | Overall team morale average, clubhouse tone | OOTP-aligned, KBL-flavored |

**Effect on KBL gameplay (proposed):**
- Mojo floor/ceiling modifier: unhappy players have lower mojo ceiling for the game
- Development speed input: feeds into ratingsAdjustmentEngine (currently orphaned)
- Narrative trigger source: "Player X demands trade", "Slumping player seeks reassurance"
- Clutch index modifier: players in low morale state get small clutch penalty
- Manager WAR input: good morale management = positive mWAR contribution

**Implementation notes:**
- New system — no existing code to wire, build from scratch
- Should use IndexedDB (not localStorage like current fan morale)
- Must be on `Player` type as `playerMorale: PlayerMorale` — first-class field
- No dependency on Trait system — these are independent systems
- Recommended build order: Player Morale → ratingsAdjustmentEngine reconnect
- Can be built independently of Trait System work

**Priority:** MEDIUM — important for franchise depth, no blockers beyond IndexedDB schema work.

---

## LOW Priority Gaps (Nice to Have)

### WAR Calculation (6 gaps)
- League Adjustment for multiple leagues
- Park factor 30-game minimum check
- Calibration minimum PA validation
- Collision error type in fWAR
- firstToSecond_onFlyOut tracking
- Overrunning vs thrown out distinction

### Fame/Aging (5 gaps)
- Outfield Assist Fame bonus (+1)
- Multiple errors in game composite event
- K on pitch way outside zone
- Thrown out at home by outfielder
- Jersey Sales Index calculation

### Mojo/Fitness/Salary (10 gaps)
- Pitcher "Did Not Play" recovery rate
- Junk stat Mojo-only multiplier
- MVP/Award Voting Juiced penalty
- All-Star Break Juiced duration
- Contraction system
- Expansion draft system
- Real-time salary update logging
- handleAllStarTraitChange function
- Manager Firing Risk system
- JuicedAchievement tracking interface

### Fan Morale/Narrative (17 gaps)
- September call-ups event
- Fan Appreciation Day event
- First home game event
- Rival eliminated event
- Unpopular player DFA'd distinction
- Trade Depth "fills need" modifier
- Daily morale snapshots
- STREAK/PLAYOFF_RACE/SEASON_SUMMARY narratives
- OFFSEASON_NEWS narratives
- Reporter tenure influence (raw value vs tier)
- LLM routing logic (local vs cloud)
- League News Feed system
- Retraction morale impact integration

### Relationships/Chemistry (6 gaps)
- Chemistry display UI
- NonPlayerSpouse interface
- Child schema
- Marriage name change system
- Relationship narrative templates
- generateRelationshipNarrative()

### Fielding (5 gaps)
- Nutshot mojo/fitness impact fields
- Shift handling in fielding inference
- Foul territory zones (FL/FR distinction)
- D3K fielder selection (P/3B options)
- GRD/BadHop detailed tracking fields

---

## Completed Features (Moved from Wishlist)

| Feature | Implemented | Date | Notes |
|---------|-------------|------|-------|
| Reporter Reliability System | ✅ | Jan 24, 2026 | 65-95% accuracy by personality, retractions |
| mWAR Calculator | ✅ | ~Jan-Feb 2026 | `useMWARCalculations` hook → GameTracker.tsx:199. Tests pass. |
| Mojo Engine wired | ✅ | ~Jan-Feb 2026 | `usePlayerState` hook integrates mojoEngine → GameTracker.tsx:181 |
| Fitness Engine wired | ✅ | ~Jan-Feb 2026 | `usePlayerState` hook integrates fitnessEngine → GameTracker.tsx:181 |
| HBP/SF/SAC/GIDP tracking | ✅ | Feb 12, 2026 | DATA_INTEGRITY Batch 1B (#11) — useGameState.ts:84,88-90 |
| WPA (Win Probability Added) | ✅ | Feb 12, 2026 | DATA_INTEGRITY Batch F2 (#12) — winExpectancyTable.ts + wpaCalculator.ts + 26 tests |
| Substitution validation | ✅ | Feb 12, 2026 | DATA_INTEGRITY Batch F3 (#9) — LineupState tracking + validateSubstitution() |
| autoCorrectResult wired | ✅ | Feb 12, 2026 | DATA_INTEGRITY Batch 2C (#7) — FO→SF, GO→DP auto-corrections |
| Walk-off detection | ✅ | Feb 12, 2026 | DATA_INTEGRITY Batch 2A (#14) — GameTracker.tsx:1881 |
| isPlayoff flag | ✅ | Feb 12, 2026 | DATA_INTEGRITY Batch 2A (#13) — route state |
| SB/CS in WAR calculations | ✅ | Feb 12, 2026 | DATA_INTEGRITY Batch 2B (#16) — useWARCalculations.ts |
| Undo button (BUG-009) | ✅ | ~Jan-Feb 2026 | UndoSystem.tsx → GameTracker.tsx:317 |
| Pitch count tracking (BUG-011) | ✅ | ~Jan-Feb 2026 | useGameState.ts pitchCountPrompt state management |
| Pitcher exit prompt (BUG-012) | ✅ | ~Jan-Feb 2026 | useGameState.ts:3311 — endGame() triggers prompt |

---

## Still Orphaned (Hook/Engine Exists But NOT Wired to UI Display)

| Engine | Hook | Wired to GameTracker? | Display Exists? | Notes |
|--------|------|-----------------------|-----------------|-------|
| Clutch Calculator | `useClutchCalculations.ts` | ❌ NOT imported | ❌ No display | Hook exists but never called |
| fWAR Calculator | `fwarCalculator.ts` | Via useWARCalculations | ❌ No UI column | Calculator runs but results not shown |
| rWAR Calculator | `rwarCalculator.ts` | Via useWARCalculations | ❌ No UI column | Calculator runs but results not shown |

---

## Review Checklist

Before marking any sprint day "complete", ask:

1. **Generalization check**: Does any feature in the spec apply more broadly than implemented?
2. **Realism check**: What would make this system feel more like real sports media/games?
3. **Edge case check**: What happens when things go wrong? (errors, lies, mistakes)
4. **Player experience check**: Is there an opportunity for humor/drama we're missing?
5. **Integration check**: Do separate systems that should talk to each other actually connect?

---

## How This Audit Was Done

On January 24, 2026, six parallel agents audited:
1. WAR specs (bWAR, pWAR, fWAR, rWAR, mWAR) vs calculators
2. Fame/Aging specs vs fameEngine.ts, agingEngine.ts
3. Mojo/Fitness/Salary specs vs engines
4. Fan Morale/Narrative specs vs engines
5. Relationships/Chemistry specs vs engines (none found)
6. Fielding spec vs implementation

Each agent compared spec requirements against actual code, identifying:
- Missing features (not implemented at all)
- Partial features (started but incomplete)
- Spec/implementation mismatches

Results were compiled into this document for tracking and prioritization.

On February 12, 2026, reconciled against DATA_INTEGRITY_FIX_REPORT (21 resolved issues) and recent session work. 13 items moved to Completed, WAR HIGH reduced from 2→1, LOW WAR reduced from 8→6 (park factor deferred items moved to POST-MVP notes in IMPLEMENTATION_PLAN).

---

*Add new ideas at the top of relevant priority section. Move to Completed when implemented.*
