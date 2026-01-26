# KBL Tracker Features Roadmap

> **Purpose**: Living document capturing all planned features, their design status, and implementation progress. Use this to onboard AI assistants and track feature development.
> **Last Updated**: January 24, 2026 (Player Morale v2, Relationship System, Revenge Arcs)
> **Status**: Active Development

---

## Quick Reference for AI Assistants

When starting a new session, read this document FIRST to understand:
1. What features exist and their specs
2. What features need design work
3. What the user's vision is for unfinished features
4. Where to find detailed specs for each area

---

## Feature Status Legend

| Status | Meaning |
|--------|---------|
| ✅ **SPEC COMPLETE** | Full specification exists, ready for implementation |
| 🟡 **PARTIAL SPEC** | Some documentation exists, needs expansion |
| 🔴 **NEEDS DESIGN** | Concept only, requires full specification work |
| 🚧 **IN PROGRESS** | Currently being implemented |
| ✔️ **IMPLEMENTED** | Feature is built and working |

---

## 1. Core Game Tracking (✅ SPEC COMPLETE)

The foundation of the app - tracking baseball games play-by-play.

### Specifications
- `STAT_TRACKING_ARCHITECTURE_SPEC.md` - Core stat tracking
- `FIELDING_SYSTEM_SPEC.md` - Defensive plays and inference
- `FIELD_ZONE_INPUT_SPEC.md` - 25-zone touch input system
- `RUNNER_ADVANCEMENT_RULES.md` - Baserunning logic
- `PITCHER_STATS_TRACKING_SPEC.md` - Pitching statistics
- `SPECIAL_EVENTS_SPEC.md` - Rare plays and events

### Key Features
- At-bat-level tracking with all outcomes
- Automatic fielder inference with learning
- 25-zone field input system
- Runner advancement validation
- Pitch count and stamina tracking
- Special events (nutshots, comebackers, etc.)

---

## 2. WAR Calculation System (✅ SPEC COMPLETE)

Five-component WAR system for player valuation.

### Specifications
- `BWAR_CALCULATION_SPEC.md` - Batting WAR (wOBA → wRAA → Batting Runs)
- `PWAR_CALCULATION_SPEC.md` - Pitching WAR (FIP-based)
- `FWAR_CALCULATION_SPEC.md` - Fielding WAR (per-play OAA-style)
- `RWAR_CALCULATION_SPEC.md` - Baserunning WAR (wSB + UBR + wGDP)
- `MWAR_CALCULATION_SPEC.md` - Manager WAR (decision + overperformance)
- `ADAPTIVE_STANDARDS_ENGINE_SPEC.md` - League context and replacement level

### Key Formulas
```
Position Player WAR = bWAR + fWAR + rWAR
Pitcher WAR = pWAR + bWAR + fWAR + rWAR (pitchers hit in SMB4!)
Two-Way Player WAR = pWAR + bWAR + fWAR + rWAR (significant batting)
Manager WAR = Decision WAR + Overperformance WAR
```

---

## 3. Fame System (✅ SPEC COMPLETE)

Narrative-driven player reputation tracking.

### Specifications
- `FAME_SYSTEM_TRACKING.md` - Fame bonus/boner events
- `MILESTONE_SYSTEM_SPEC.md` - Achievement milestones
- `CLUTCH_ATTRIBUTION_SPEC.md` - Clutch/choke moments

### Key Concepts
- **Fame Bonus** (+): Positive achievements (milestones, clutch plays, awards)
- **Fame Boner** (-): Negative events (errors, blown saves, strikeouts)
- Fame influences: salary, awards voting, fan morale, narrative

---

## 4. Milestone System (🟡 PARTIAL SPEC → ✅ CORE IMPLEMENTED)

### Specification
- `MILESTONE_SYSTEM_SPEC.md` - Comprehensive milestone definitions
- `PLAN_MILESTONE_IMPLEMENTATION.md` - Implementation tracking

### Implemented ✔️
- FameEventType definitions
- Career storage infrastructure (`careerStorage.ts`)
- Milestone detection logic with scaling (`milestoneDetector.ts`)
- Single-game detection functions
- **Milestone aggregation flow** (`milestoneAggregator.ts`) - wires detection into game-end
- **Franchise firsts tracking** (`franchiseStorage.ts`) - first-ever achievements in franchise
- **Franchise leaders detection** - career stat leaders with Fame events
- **Career stat aggregation** - Game → Season → Career with milestone detection

### Pending 🔴
- ~~WAR component milestones (bWAR, pWAR, fWAR, rWAR thresholds)~~ ✔️ Implemented
- ~~Team MVP / Cornerstone / Ace designation (end-of-season)~~ ✔️ Implemented (`teamMVP.ts`)
- Milestone Watch UI display
- Multi-threshold crossing celebration UI

---

## 5. Fan Morale System (✅ SPEC COMPLETE)

Dynamic, event-driven fan engagement affecting team success.

### Specification
- `FAN_MORALE_SYSTEM_SPEC.md` - Complete event-driven morale system

### Key Mechanics
- **Event-Driven Updates**: Morale changes with every game, trade, milestone
- **Expected Wins Tracking**: Dynamic recalculation triggers (trades, call-ups, injuries)
- **Trade Scrutiny**: 14-game aftermath tracking for trade evaluation
- **7 Morale States**: EUPHORIC (90-99) → HOSTILE (0-9)
- **Consequences**:
  - Manager firing at sustained low morale
  - Contraction risk below 10 morale
  - Expansion draft when team contracted
  - Beat reporter influence on morale (see Narrative System)

### Needs UI Design 🔴
- Fan morale meter/dashboard
- Trend visualization
- Breakdown by factor
- Warning system for contraction risk
- Manager firing flow

---

## 6. Salary System (✅ SPEC COMPLETE)

Dynamic player salaries based on performance and narrative.

### Specification
- `SALARY_SYSTEM_SPEC.md` - Complete salary calculation

### Key Mechanics
- Base salary from ratings (weighted by position)
- Modifiers: age, traits, performance, fame, personality
- Real-time updates on: game completion, fame events, awards
- Performance expectations set at season start
- ROI tracking: WAR per $M salary

### True Value / Overperformance
```
Performance Modifier = (Actual WAR - Expected WAR) × 10%
True Value = Salary × (1 + Performance Modifier)
```
- Overperformers: increase trade value, FA leverage
- Underperformers: decrease trade value, risk being cut

### Needs UI Design 🔴
- Salary display in roster views
- Payroll visualization
- Performance vs expectations dashboard
- Trade value calculator
- ROI leaderboards

---

## 7. Offseason System (✅ SPEC COMPLETE)

14-phase offseason process.

### Specification
- `OFFSEASON_SYSTEM_SPEC.md` - Complete offseason flow

### Phases
1. Retirements
2. Free Agency (signings/losses)
3. Draft (25 rounds)
4. Expansion/Contraction
5. Awards/Voting
6. Hall of Fame
7. Ratings Adjustments
8. Jersey Retirements
9. Trades
10. Roster Cleanup
11. Pre-season Expectations
12. Season Preview
13. Save State
14. New Season Init

### Needs UI Design 🔴
- Offseason Hub with progress tracker
- Each phase needs dedicated UI
- Retirement approval flow
- Free agent bidding interface
- Draft UI with pick trading
- Hall of Fame ceremony
- Awards presentation

---

## 8. Trade System (✅ SPEC COMPLETE)

In-season and offseason player trades.

### Specification
**See `TRADE_SYSTEM_SPEC.md`** for complete details.

### Key Features
- **Contract Value Matching**: 10% threshold for valid trades
- **Draft Swaps**: Position swaps only (not picks), upcoming year only
- **Farm Prospect Trading**: Minor leaguers can be included
- **Game Modes**: Single-player (hidden True Value), Partial Control, Full Control
- **AI Counter-offers**: CPU teams propose modifications
- **Trade Veto System**: League can block lopsided deals
- **Three-Team Trades**: Complex multi-team deals supported
- **Offseason Trades**: Phase 10 of offseason (after Draft)

### Still Needs
- Trade UI visual design
- AI trade logic tuning

---

## 9. UI Tabs & Navigation (🔴 NEEDS DESIGN)

### 9.1 Team Tab (Moneyball Experience)

**Vision**: Deep-dive team management with roster, scouting, and analytics.

**Planned Features**:
- Roster display with all player attributes
- Real-time ratings (affected by Mojo/Fitness)
- Scouting data per opponent/stadium
- Historical notes and narratives
- Retired jerseys display
- Franchise leaders board
- Trade value indicators
- Player development tracking
- Team vs league comparisons

**Needs**: Full UI/UX design, navigation flow, data visualization

### 9.2 Museum Tab

**Vision**: Historical archive of league and franchise history.

**Planned Features**:
- Hall of Fame inductees
- Retired numbers by team
- Championship history
- Record holders (season/career)
- Memorable moments log
- Defunct teams archive
- Era-based browsing
- Player career retrospectives

**Needs**: Full UI/UX design, data model for historical storage

### 9.3 League Leaders Tab

**Vision**: Comprehensive statistical leaderboards.

**Planned Features**:
- Traditional stats leaders
- Advanced stats leaders (WAR, wOBA, FIP, etc.)
- All-Star voting leaders
- Award race tracking
- Salary percentile alongside stats
- Historical leaders archive
- Filtering by position/team/era

**Reference**: Basic mockup exists in Master Spec (line 427+)

**Needs**: Full UI layout, responsive design, export functionality

### 9.4 League News Tab (Narrative Hub) (✅ SPEC COMPLETE)

**Vision**: The heart of storytelling across seasons and careers.

**Specification**: `NARRATIVE_SYSTEM_SPEC.md`

**Key Features**:
- **Beat Reporters**: Named reporters with hidden personalities (10 types)
  - 80/20 personality alignment rule (not always predictable)
  - Reporter influence on fan morale
  - Reporter firing as random event
- **AI-Generated Content**: 50/50 local LLM / Claude API split
- **Player Quotes**: Hidden personality-driven, 80/20 alignment
- **Lineup Awareness**: Spots unusual decisions, talent disparities
- **Historical Memory**: Callbacks to past events
- **Output Channels**: League News, Team Feed, Pre/Post Game, In-Game

**Planned Story Types**:
- Milestone achievements
- Trade announcements + aftermath
- Injury reports
- Award races
- Rivalry updates
- Record-breaking moments (including Oddity Records)
- Personality drama

**Needs**: UI design, archive system

---

## 10. Mojo & Fitness System (✅ SPEC COMPLETE + UI INTEGRATED)

### Specification
- `MOJO_FITNESS_SYSTEM_SPEC.md` - Complete Mojo/Fitness tracking and effects
- `KBL_XHD_TRACKER_MASTER_SPEC_v3.md` - In-Game Tracker UI integration (v3.8)

### Key Features
- **Mojo System**: 5 levels from Rattled (-2) to Jacked (+2)
  - Rattled (-2), Tense (-1), Normal (0), Locked In (+1), Jacked (+2)
  - Rattled is "sticky" - hardest mojo state to escape
  - Triggers for positive/negative momentum shifts
  - Carryover between games (30% of excess)
- **Fitness System**: 6 categorical states (Hurt → Juiced)
  - Decay rates by position (catchers/pitchers wear down faster)
  - Recovery mechanics with trait modifiers
  - Injury risk based on Fitness state
- **Performance Weighting**: Achievements while disadvantaged worth MORE
  - Rattled player clutch hit = +30% Fame credit
  - Jacked player home run = -20% Fame credit
- **Juiced Fame Penalty ("PED Stigma")**: 🆕
  - **EVERY** Juiced game = -1 Fame Boner (Juiced is rare: 2-3 times/season max)
  - All achievements while Juiced = 50% Fame credit
  - Simulates real-world PED scrutiny
- **Stat Splits by Mojo/Fitness**: 🆕
  - Per-PA tracking of Mojo/Fitness state at time of plate appearance
  - Enables analysis: "Batting .340 when Locked In vs .180 when Rattled"
  - Player card shows splits by condition
- **In-Game Tracker UI Integration**: 🆕
  - Pre-Game Setup: Mojo/Fitness columns per lineup slot
  - Current Batter: Shows Mojo/Fitness under name
  - Mid-Game Updates: Quick-edit via Special Events menu
  - JUICED/RATTLED warnings displayed prominently

### Implementation
```typescript
// Fame modifier based on Mojo (from spec)
function getMojoFameModifier(mojo: number): number {
  const MODIFIERS = {
    [-2]: 1.30,  // +30% for Rattled (hardest to overcome)
    [-1]: 1.15,  // +15% for Tense
    [0]: 1.00,   // Baseline
    [1]: 0.90,   // -10% for Locked In
    [2]: 0.80,   // -20% for Jacked
  };
  return MODIFIERS[mojo] || 1.00;
}
```

---

## 11. Player Morale (🔴 NEEDS DESIGN)

### Current State
- Mojo system partially covers morale
- Personality types affect behavior
- No dedicated morale system

### User Vision
> "Player morale could be part of our narrative element, also affecting fan morale"

**Potential Design**:
- Separate morale metric (0-100)
- Affected by: playing time, team success, awards, trades, salary
- Influences: performance variance, FA decisions, retirement
- Triggers narrative events when extreme

### Questions to Resolve
- Is morale separate from Mojo or merged?
- How does morale affect gameplay vs narrative?
- Team-wide morale aggregate?
- Morale decay/recovery rates?

---

## 12. Contraction & Expansion (✅ SPEC COMPLETE in FAN_MORALE_SYSTEM_SPEC)

### Key Mechanics
- Teams below 10 happiness risk contraction
- Warning system with recovery options
- Expansion draft when team contracted
- New team enters league
- Disbanded players enter expansion draft

---

## 13. Rivalries (🟡 PARTIAL SPEC)

### What's Documented
- Rivalries exist in Master Spec
- Traded players trigger rivalry with former team
- Rivalry games have heightened stakes

### Needs Design 🔴
- Rivalry intensity levels
- Rivalry decay over time
- Narrative hooks for rivalry games
- Fan morale impact
- UI indicators during rivalry matchups

---

## 14. Dynamic Designations System (✅ SPEC COMPLETE)

### Specifications
- `DYNAMIC_DESIGNATIONS_SPEC.md` - Complete mid-season projection & season-end locking system
- `FAN_FAVORITE_SYSTEM_SPEC.md` - Value Over Contract calculation details

### Concept
Player designations are tracked dynamically throughout the season with "projected" status (dotted border badges), then locked in at season's end (solid border badges). Creates engaging storylines as players compete for designations.

### Designations

| Designation | Criteria | Min Games | Carries Over |
|-------------|----------|-----------|--------------|
| **Team MVP** | Highest WAR on team | 20% | No → becomes Cornerstone |
| **Ace** | Highest pWAR on team | 20% | No |
| **Fan Favorite** | Highest positive Value Delta | 10% | Yes (until 20% of next season) |
| **Albatross** | Most negative Value Delta | 10% | Yes (until 20% of next season) |
| **Cornerstone** | Previous season's Team MVP | N/A | Yes (permanent while on team) |

### Key Mechanics
- **Dynamic Tracking**: Updates after every game during season
- **Visual Distinction**: Dotted border = projected; Solid border = locked
- **Change Notifications**: Alert when projected status changes hands
- **Cornerstone Accumulation**: Multiple Cornerstones can exist on a team
- **Carryover Rules**: Fan Favorite/Albatross persist until 20% of new season

### Season Lifecycle
```
New Season Start:
├── Cornerstones: PERSIST (from all previous MVPs still on team)
├── Fan Favorite/Albatross: PERSIST (from last year)
└── Projected designations: Begin calculating

After 20% of Season:
├── Cornerstones: PERSIST
├── Previous Fan Favorite/Albatross: CLEARED
└── Projected designations: ACTIVE (updates every game)

Season End:
├── Cornerstones: PERSIST + NEW (from this year's MVP)
└── All designations: LOCKED (solid border)
```

### Dependencies
- ✅ Salary System (v3 complete with True Value calculation)
- ✅ Team MVP/Ace detection (`teamMVP.ts`)
- ✅ Season-end processor (`seasonEndProcessor.ts`)
- 🔴 UI: Badge display, change notifications

### Decision Log
- **2026-01-23**: User confirmed **Option B** (Value Over Contract) for Fan Favorite
- **2026-01-23**: User approved dynamic mid-season projections with dotted borders
- **2026-01-23**: Cornerstone persists permanently while player on team
- **2026-01-23**: 20%/10% game thresholds for MVP/Ace vs Fan Fav/Albatross

---

## 15. End-of-Season Ratings Adjustments (✅ SPEC COMPLETE)

### Specification
- `EOS_RATINGS_ADJUSTMENT_SPEC.md` - Complete adjustment formulas

### Key Mechanics
- Compare actual WAR to expected WAR
- Peer group comparisons by position
- Age-based adjustment curves
- Two-way player dual adjustments
- Trait acquisition/loss

---

## 16. Awards System (✅ SPEC COMPLETE in Master Spec + OFFSEASON_SYSTEM_SPEC)

### Awards Tracked
- MVP (position players)
- Cy Young (pitchers)
- Rookie of the Year
- Gold Glove (by position)
- Platinum Glove (best of Gold Glove winners)
- Booger Glove (worst fielder - gains Butter Fingers trait)
- Silver Slugger (by position)
- Bench Player of the Year
- Reliever of the Year
- Manager of the Year
- Kara Kawaguchi Award (best value)
- Bust of the Year
- Comeback Player of the Year
- All-Star selections
- Postseason MVP

### Voting Weights
- WAR: 40-50%
- Traditional stats: varies
- Clutch: 10-20%
- Narrative: 5-10%

---

## 17. Stadium Analytics System (✅ SPEC COMPLETE)

### Specification
- `STADIUM_ANALYTICS_SPEC.md` - Complete park factors and spray chart system

### Key Features
- **Dynamic Park Factors**: Calculated from actual game data, not static
- **Per-Stat Factors**: HR, 2B, 3B, hits, K, BB, runs
- **Handedness Splits**: Separate LHB/RHB factors
- **Spray Chart Tracking**: 7 zones with heat maps
- **Stadium Records**: HR distance by zone, single-game records, career leaders
- **Historical Tracking**: Season-by-season park factor snapshots

### Oddity Records (in Master Spec - League Records)
- Shortest Homer
- Slowest Triple
- Weakest Homer (lowest Power)
- Flukiest Homer (lowest Contact)
- Marathon Game (most pitches)
- Efficient CG (fewest pitches in complete game)

### Integrations
- WAR Calculations (BWAR, PWAR park adjustments)
- Game Simulation (outcome probability modifiers)
- Field Zone Input (spray chart data collection)

---

## Implementation Priority

### Phase 1: Core Loop (Current)
1. ✅ Game tracking
2. ✅ WAR calculations
3. 🚧 Milestone detection
4. 🔴 Basic UI tabs

### Phase 2: Season Flow
1. 🔴 League Leaders tab
2. 🔴 Team tab (basic)
3. ✅ Mojo/Fitness UI (integrated into In-Game Tracker v3.8)
4. 🔴 Fan morale display

### Phase 3: Narrative & Economics
1. 🔴 League News tab
2. 🔴 Salary display/tracking
3. 🔴 Trade system UI
4. 🔴 Performance expectations

### Phase 4: Offseason
1. 🔴 Offseason Hub
2. 🔴 Free agency UI
3. 🔴 Draft UI
4. 🔴 Awards ceremony

### Phase 5: Legacy
1. 🔴 Museum tab
2. 🔴 Hall of Fame UI
3. 🔴 Historical archives
4. 🔴 Franchise retrospectives

---

## Open Questions (Need User Input)

1. **Player Morale**: Separate system or merged with Mojo?
2. **Trade AI**: How sophisticated should AI trade logic be?
3. **Contraction**: How often should this realistically happen?
4. **News Generation**: AI-generated headlines or templates?
5. **Museum**: How far back should historical data go?

---

## Related Specifications

| Feature Area | Primary Spec | Related Specs |
|-------------|--------------|---------------|
| Game Tracking | STAT_TRACKING_ARCHITECTURE_SPEC | FIELDING_SYSTEM_SPEC, FIELD_ZONE_INPUT_SPEC |
| WAR | BWAR/PWAR/FWAR/RWAR_CALCULATION_SPEC | ADAPTIVE_STANDARDS_ENGINE_SPEC, STADIUM_ANALYTICS_SPEC |
| Fame | FAME_SYSTEM_TRACKING | MILESTONE_SYSTEM_SPEC, CLUTCH_ATTRIBUTION_SPEC |
| Fan Morale | FAN_MORALE_SYSTEM_SPEC | SALARY_SYSTEM_SPEC, NARRATIVE_SYSTEM_SPEC |
| Salary | SALARY_SYSTEM_SPEC | EOS_RATINGS_ADJUSTMENT_SPEC |
| Designations | DYNAMIC_DESIGNATIONS_SPEC | FAN_FAVORITE_SYSTEM_SPEC, MILESTONE_SYSTEM_SPEC |
| Offseason | OFFSEASON_SYSTEM_SPEC | FRANCHISE_MODE_SPEC, TRADE_SYSTEM_SPEC |
| Simulation | GAME_SIMULATION_SPEC | LEVERAGE_INDEX_SPEC, STADIUM_ANALYTICS_SPEC |
| Stadium | STADIUM_ANALYTICS_SPEC | FIELD_ZONE_INPUT_SPEC, GAME_SIMULATION_SPEC |
| Trade | TRADE_SYSTEM_SPEC | SALARY_SYSTEM_SPEC, FAN_MORALE_SYSTEM_SPEC |
| Narrative | NARRATIVE_SYSTEM_SPEC | FAN_MORALE_SYSTEM_SPEC, FAME_SYSTEM_TRACKING |
| Mojo/Fitness | MOJO_FITNESS_SYSTEM_SPEC | FAME_SYSTEM_TRACKING, GAME_SIMULATION_SPEC |
| Master Reference | KBL_XHD_TRACKER_MASTER_SPEC_v3 | All specs |

---

## Changelog

| Date | Changes |
|------|---------|
| 2026-01-23 | Initial roadmap created from feature audit |
| 2026-01-23 | Added Fan Favorite System concept (§14); marked WAR component milestones and Team MVP/Ace as implemented |
| 2026-01-23 | Salary System v3 completed with 3:3:2:1:1 and 1:1:1 rating weights, True Value calculation |
| 2026-01-23 | Fan Favorite & Albatross System spec completed (FAN_FAVORITE_SYSTEM_SPEC.md) |
| 2026-01-23 | Backend wiring: Leverage Index into Fame events, Season-end processor created |
| 2026-01-23 | **Dynamic Designations System** - Mid-season projections with dotted borders, locked at season end. MVP/Ace require 20% games, Fan Fav/Albatross require 10%. Cornerstones persist permanently. Created DYNAMIC_DESIGNATIONS_SPEC.md |
| 2026-01-23 | **Stadium Analytics System** - Park factors, spray charts, stadium records. Created STADIUM_ANALYTICS_SPEC.md with handedness-aware adjustments, 7-zone spray mapping from 25-zone input, WAR integration |
| 2026-01-23 | **Trade System** - Full trading mechanics with prospect valuation, draft pick swaps, trade grades. TRADE_SYSTEM_SPEC.md complete |
| 2026-01-23 | **Fan Morale System** - Event-driven morale with decay, multipliers, and salary cap compliance. FAN_MORALE_SYSTEM_SPEC.md complete |
| 2026-01-23 | **Narrative System** - Beat reporters, AI-generated headlines, player quotes with 50/50 local/cloud LLM routing. NARRATIVE_SYSTEM_SPEC.md complete |
| 2026-01-23 | **Oddity Records (18 total)** - Full tracking logic added: Shortest homer, Slowest triple, Weakest/Flukiest homer, Marathon/Efficient CG, Speedster Strikeout King, Power Outage, Contact Hitter Homer Spree, Meatball Maestro, Wild Thing, Untouchable Loss, Trevor Hoffman Save, Slow-poke Steal, Error Machine Win, Comeback from Dead, Blown Lead of Shame, Sho-Hey! |
| 2026-01-23 | **Awards Updates** - Added Booger Glove effect (Butter Fingers trait), Manager of Year to Offseason Spec, Emblem table updates |
| 2026-01-23 | **Oddity Records** - Added Flailing Fielder (missed diving/jumping catches) as 19th oddity record |
| 2026-01-23 | **Mojo/Fitness In-Game Tracker UI** - Integrated into Master Spec v3.8: Pre-Game Setup with Mojo/Fitness columns, Current Batter display, Mid-Game Update flow via Special Events menu, PA context capture for stat splits. Corrected Mojo levels to 5 (not 7), fixed Juiced penalty to per-game (not first-of-season) |
| 2026-01-23 | **Mojo & Fitness System** - Complete spec created (MOJO_FITNESS_SYSTEM_SPEC.md): 5 Mojo levels (Rattled→Jacked), 6 Fitness states, decay/recovery mechanics, performance weighting, Juiced Fame Boner ("PED Stigma" = -1 per game) |
| 2026-01-23 | **Mojo/Fitness Stat Splits** - Added per-PA tracking of Mojo/Fitness state to enable batting/pitching splits analysis (e.g., "OPS when Tense" vs "OPS when Fit") |
| 2026-01-23 | **HR Distance Validation** - App now validates HR distance against stadium fence distances. Error shown if entered distance is shorter than fence. |
| 2026-01-23 | **Gender/Pronoun Support** - Added `gender` field ('M'/'F') to Player schema + `getPronouns()` and `fillPronouns()` helpers for beat reporter narrative generation |
| 2026-01-23 | **D3K Fielding Expanded** - Pitcher and 3B now available as fielders for Dropped Third Strike (not just Catcher) |
| 2026-01-23 | **Game Timer** - Added real-time game duration tracking with pause/resume. Displays elapsed time in tracker header. |
| 2026-01-23 | **PLAYOFF_SYSTEM_SPEC.md Created** - Complete playoff spec with: bracket system (4/6/8/10/12 teams), series flow, home field patterns (2-3-2, 2-2-1), clutch/fame multipliers by round, Exhibition Mode (one-off games), Standalone Playoff Series (3/5/7 games), Series MVP calculation |
| 2026-01-23 | **Jersey Sales → Player Morale → Retention** - Jersey Sales Index now feeds into player happiness calculation. High jersey sales = happier player. Happiness affects FA retention dice rolls with +/- 2 modifier. Added `calculatePlayerHappiness()` function with 7 factors: team success, personal performance, jersey sales, playing time, awards, recent trade, personality. |
| 2026-01-24 | **Player Morale System v2** - Complete rewrite with personality-specific reactions: (1) `PERSONALITY_REACTIONS` lookup table maps all 7 personalities to unique morale effects for 12+ event types (sent down, benched, trade, etc). Competitive players get +5 morale when demoted (motivated!), while Timid get -25 (crushed). Droopy has 50% retirement chance on demotion. (2) Personality volatility multipliers: Egotistical/Competitive = 1.3×, Tough/Droopy = 0.7×. (3) Dynamic performance impact scales with contract size ($30M player WAR shortfall = -20 morale vs $2M = -7). (4) Morale decay toward personality baseline (Jolly→60, Droopy→40) at 1pt/week. (5) Morale displayed as color-coded superscript (e.g., "Trout⁷⁸" in green). |
| 2026-01-24 | **Player Relationship System** - 7 relationship types: ROMANTIC, BEST_FRIENDS, MENTOR_PROTEGE, RIVALS, BULLY_VICTIM, JEALOUS, CRUSH. Formation requirements include same-team/opposite-gender/age-gap/personality-compatibility rules with weighted random triggers. Limits: 1 romantic, 2 best friends, 1 mentor/protege per player per season. 22-man rosters create organic relationship networks. Relationships have ongoing morale effects (+8 for dating, -12 for being bullied) and trade warnings ("Trading X will hurt Y's morale - they're dating"). |
| 2026-01-24 | **Revenge Arc System** - Former relationships create LI-boosting confrontation scenarios: SCORNED_LOVER (1.5× LI), VICTIM_REVENGE (1.75× LI), SURPASSED_MENTOR (1.3× LI). Morale effects on success (+10 to +15) or failure (-6 to -12). Integrated into LEVERAGE_INDEX_SPEC.md §10.5. Beat reporters generate special narratives for revenge games. |
| 2026-01-24 | **Beat Reporter Relationship Leaks** - 15% chance per game to leak a private relationship. 8% of leaks are FALSE RUMORS (relationship recorded but isReal=false). False rumors don't affect morale or trigger trade warnings. High-fame players 1.5× more likely to be leaked about. Creates uncertainty: "Are they really dating or is it just gossip?" |
| 2026-01-24 | **Relationship Narratives** - AI-driven storylines: mentor takes protege under wing, jealousy erupts over jersey sales, rivals reconcile and become best friends, victim stands up to bully. Multi-season arcs with 40% strengthen / 20% strain / 10% breakup per season for romantic relationships. Rivals can escalate (30%) or resolve into friendship (20%). |
| 2026-01-24 | **AI-Driven Event Generation (Replaces Random Events)** - Old dice-roll random events replaced by context-aware Claude API generation. AI analyzes team context (morale, relationships, performance, personalities) and generates narratively coherent events. Event types: TRAIT_EMERGENCE, PERSONALITY_SHIFT, RELATIONSHIP_FORMED/EVOLVED/ENDED, INJURY (fitness-based), HOT/COLD_STREAK (Mojo-based), TRADE_RUMOR, FAN_FAVORITE, MEDIA_VILLAIN, CLUBHOUSE_INCIDENT, BREAKTHROUGH_MOMENT, REVENGE_MOTIVATION. Events require appropriate context (no random "Media Villain" for TIMID players). Includes event seeding (strained relationships, low morale, mentor opportunities), validation (AI can't hallucinate impossible events), and narrative memory integration for future callbacks. Full spec in NARRATIVE_SYSTEM_SPEC.md §10. Master Spec §11 updated to deprecate old system. |
| 2026-01-24 | **Farm System Narrative Integration** - Farm players now fully integrated into narrative ecosystem: (1) FarmPlayer schema expanded with personality, relationships[], storylines[], moraleFactors. (2) Cross-level relationships: MLB veterans can mentor farm prospects, romantic relationships can span levels (creates "long distance love" storylines). (3) Farm-only relationships: Prospect rivalries competing for same call-up slot, friendships that get separated by call-ups. (4) Farm storyline types: BLOCKED_BY_VETERAN, PROVING_DOUBTERS_WRONG, STRUGGLING_WITH_PRESSURE, TRADE_BAIT, HOMETOWN_HERO. (5) Call-up/send-down decision drivers: AI generates narrative-based reasons for roster moves (mentor advocates call-up, bully removal improves clubhouse, blocked prospect morale crisis). (6) 14 new farm-specific event types added to AI generation. Beat reporters cover farm storylines. Full spec in FARM_SYSTEM_SPEC.md "Farm System Narratives" section. |

---

*This document should be updated whenever features are designed, implemented, or modified.*
