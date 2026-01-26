# KBL Tracker - Complete Implementation Order

> **Purpose**: Ordered implementation sequence for ALL features
> **Generated**: January 26, 2026
> **Scope**: 103 stories across 7 phases
> **Principle**: Dependencies first, then core flow, then enhancements

---

## Implementation Phases Overview

```
Phase A: Foundation         [22 Stories]  ~15-20 hours
    ↓
Phase B: Core Game Loop     [18 Stories]  ~12-15 hours
    ↓
Phase C: Season Infra       [15 Stories]  ~10-12 hours
    ↓
Phase D: Awards             [13 Stories]  ~8-10 hours
    ↓
Phase E: Offseason          [15 Stories]  ~12-15 hours
    ↓ (can parallel with D-E)
Phase F: Advanced Systems   [12 Stories]  ~10-12 hours
    ↓
Phase G: Polish & History   [8 Stories]   ~6-8 hours
```

**Total Estimated: 73-92 hours** (varies by experience and complexity discoveries)

---

# PHASE A: FOUNDATION (Must Complete First)

**Goal**: Establish routing, navigation, global state, and fix critical GameTracker issues

## A.1 - Core Infrastructure (Days 1-2)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P0 | S-A001 | Install React Router | None | 30m |
| P0 | S-A002 | Create Routes Configuration | S-A001 | 1h |
| P0 | S-A006 | Create GlobalStateProvider | None | 1h |
| P0 | S-A007 | Add IndexedDB State Hydration | S-A006 | 1h |

**Checkpoint A.1**: Router works, global state persists

## A.2 - Navigation Shell (Days 2-3)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P0 | S-A003 | Create MainMenu Component | S-A001, S-A002 | 1h |
| P0 | S-A004 | Create NavigationHeader | S-A001 | 1h |
| P0 | S-A005 | Create SeasonDashboard | S-A001, S-A006 | 1.5h |
| P0 | S-A008 | Create TeamSelector | S-A006 | 1h |

**Checkpoint A.2**: Can navigate between pages, select team

## A.3 - Data Input (Days 3-4)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P0 | S-A009 | Create PlayerRatingsForm | S-A006 | 1.5h |
| P0 | S-A010 | Create LeagueBuilder | S-A006, S-A008 | 1.5h |
| P0 | S-A011 | Create ManualPlayerInput | S-A009 | 1.5h |

**Checkpoint A.3**: Can input ratings, build leagues, add players

## A.4 - GameTracker Fixes (Days 4-5)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P0 | S-A012 | Display Team Names in Scoreboard | None | 30m |
| P0 | S-A013 | Add Visible Undo Button | None | 30m |
| P0 | S-A014 | Make Batter Name Clickable | None | 30m |
| P0 | S-A015 | Make Due-Up Names Clickable | S-A014 | 30m |
| P0 | S-A016 | Create Lineup View Panel | None | 1.5h |
| P0 | S-A017 | Add Mojo Indicators to Lineup | S-A016 | 45m |
| P0 | S-A018 | Add Fitness Indicators to Lineup | S-A016 | 45m |
| P0 | S-A019 | Display Pitch Count | None | 30m |
| P0 | S-A020 | Add Batter Mojo Badge | None | 30m |
| P0 | S-A021 | Add Pitcher Fitness Badge | None | 30m |
| P0 | S-A022 | Fix Exit Type Double Entry | None | 1h |

**Checkpoint A.4**: GameTracker fully functional with all P0 features

---

# PHASE B: CORE GAME LOOP (Requires Phase A)

**Goal**: Complete pre-game, post-game, and in-game enhancements

## B.1 - Game Setup (Days 5-6)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P0 | S-B003 | Create GameSetupModal | Phase A complete | 1.5h |
| P0 | S-B004 | Add Pitcher Selection | S-B003 | 1h |
| P1 | S-B005 | Add Stadium Selection | S-B003 | 1h |

**Checkpoint B.1**: Games can be configured before starting

## B.2 - Pre-Game (Day 6)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P0 | S-B001 | Create PreGameScreen | S-B003 | 1.5h |
| P0 | S-B002 | Add Starting Pitchers Display | S-B001 | 1h |

**Checkpoint B.2**: Pre-game screen shows matchup info

## B.3 - Post-Game (Days 6-7)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P0 | S-B006 | Create PostGameScreen | Game completion | 1.5h |
| P0 | S-B007 | Add Top Performers | S-B006 | 1h |
| P0 | S-B008 | Create POG Display | S-B006 | 1h |
| P1 | S-B009 | Create BoxScoreView | S-B006 | 1.5h |
| P1 | S-B010 | Add Pitching Box Score | S-B009 | 1h |

**Checkpoint B.3**: Post-game summary is comprehensive

## B.4 - In-Game Enhancements (Days 7-8)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P1 | S-B011 | Create InningEndSummary | None | 1h |
| P1 | S-B012 | Create PitcherExitPrompt | Pitch count tracking | 1h |
| P1 | S-B013 | Create DoubleSwitchModal | Substitution patterns | 1.5h |
| P1 | S-B014 | Implement Double Switch Logic | S-B013 | 1h |
| P1 | S-B015 | Detect Walkoff Wins | Game end detection | 1h |
| P1 | S-B016 | Display Walkoff Celebration | S-B015 | 1h |
| P1 | S-B017 | Create FameEventToast | Fame engine | 1h |
| P1 | S-B018 | Generate Post-Game Headline | Narrative engine | 1h |

**Checkpoint B.4**: Full game flow from setup → play → summary

---

# PHASE C: SEASON INFRASTRUCTURE (Requires Phase B)

**Goal**: Add standings, schedule, leaders, roster management

## C.1 - Standings & Schedule (Days 8-9)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P0 | S-C001 | Create StandingsView | Season storage | 1.5h |
| P0 | S-C002 | Add Games Back Column | S-C001 | 30m |
| P1 | S-C003 | Add Streak Column | S-C001 | 30m |
| P1 | S-C004 | Create ScheduleView | Season storage | 1.5h |
| P1 | S-C005 | Add Team Filter | S-C004 | 30m |

**Checkpoint C.1**: Can view standings and schedule

## C.2 - Stats & Leaders (Days 9-10)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P1 | S-C006 | Create LeagueLeadersView | Season stats | 1.5h |
| P1 | S-C007 | Add Qualification Rules | S-C006 | 30m |
| P0 | S-C008 | Create SeasonProgressTracker | Season storage | 1h |

**Checkpoint C.2**: Can view league leaders with qualifications

## C.3 - Team Management (Days 10-11)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P0 | S-C009 | Create RosterView | Player database | 1.5h |
| P1 | S-C010 | Add Stats to Roster | S-C009 | 1h |
| P1 | S-C011 | Create TeamStatsView | Season stats | 1h |
| P1 | S-C012 | Create TeamFinancialsView | Salary calc, ratings | 1.5h |
| P1 | S-C013 | Create FanMoralePanel | Morale engine | 1h |

**Checkpoint C.3**: Full team management view

## C.4 - Playoffs (Day 11)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P1 | S-C014 | Create PlayoffBracket | Playoff seeding | 1.5h |
| P1 | S-C015 | Create ChampionshipCelebration | Championship detection | 1.5h |

**Checkpoint C.4**: Playoffs functional with bracket and celebration

---

# PHASE D: AWARDS & RECOGNITION (Requires Phase C)

**Goal**: End-of-season awards ceremony, All-Star break

## D.1 - Awards Hub (Day 12)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P0 | S-D001 | Create AwardsCeremonyHub | Season complete | 1.5h |
| P1 | S-D002 | Add Skip to Summary | S-D001 | 30m |

## D.2 - Individual Awards (Days 12-13)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P0 | S-D003 | Create LeagueLeadersAward | Stats aggregation | 1h |
| P0 | S-D004 | Create GoldGloveAwards | fWAR calculation | 1.5h |
| P0 | S-D005 | Create SilverSluggerAwards | Batting stats | 1.5h |
| P0 | S-D006 | Create MVPReveal | Total WAR calc | 1.5h |
| P0 | S-D007 | Apply MVP Fame Bonus | Fame engine | 30m |
| P0 | S-D008 | Create CyYoungReveal | pWAR calculation | 1h |
| P0 | S-D009 | Create ROYReveal | Rookie detection | 1h |
| P0 | S-D010 | Create AwardsSummary | All awards | 1h |

**Checkpoint D.2**: Full awards ceremony functional

## D.3 - All-Star & Traits (Day 14)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P1 | S-D011 | Create AllStarScreen | All-Star selection | 1.5h |
| P1 | S-D012 | Create TraitLotteryWheel | Trait pools | 1.5h |
| P1 | S-D013 | Configure Trait Pools | S-D012 | 1h |

**Checkpoint D.3**: All-Star and trait lottery working

---

# PHASE E: OFFSEASON SYSTEM (Requires Phase D)

**Goal**: Complete 11-phase offseason with retirements, FA, draft, trades

## E.1 - Offseason Hub (Day 15)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P0 | S-E001 | Create OffseasonHub | Awards complete | 1.5h |
| P0 | S-E002 | Enforce Phase Order | S-E001 | 30m |
| P0 | S-E003 | Create Progress Tracker | S-E001 | 1h |

## E.2 - EOS Ratings & Retirements (Days 15-16)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P0 | S-E004 | Create EOSRatingsView | Rating changes | 1.5h |
| P0 | S-E005 | Create RetirementsScreen | Retirement detection | 1.5h |
| P1 | S-E006 | Check HOF Eligibility | S-E005 | 1h |

**Checkpoint E.2**: Ratings and retirements processed

## E.3 - Free Agency (Days 16-17)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P0 | S-E007 | Create FreeAgencyHub | FA detection | 1.5h |
| P0 | S-E008 | Create ProtectedPlayerSelection | S-E007 | 1h |

**Checkpoint E.3**: Free agency functional

## E.4 - Draft (Days 17-18)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P0 | S-E009 | Create DraftHub | Draft order | 1.5h |
| P0 | S-E010 | Add Pick Selection | S-E009 | 1h |
| P0 | S-E011 | Create DraftOrderReveal | Lottery | 1h |
| P0 | S-E012 | Create ProspectList | Prospect generation | 1.5h |

**Checkpoint E.4**: Draft fully functional

## E.5 - Trades (Days 18-19)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P0 | S-E013 | Create TradeHub | Trade system | 1.5h |
| P0 | S-E014 | Create TradeProposalBuilder | S-E013 | 1.5h |
| P0 | S-E015 | Create TradeSalaryMatcher | Salary rules | 1h |

**Checkpoint E.5**: Trading fully functional

---

# PHASE F: ADVANCED SYSTEMS (Can Parallel Phases D-E)

**Goal**: Relationships, aging, park factors, adaptive fielding

## F.1 - Relationships (Days 19-20)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P1 | S-F001 | Create RelationshipEngine | Player database | 1.5h |
| P1 | S-F002 | Calculate Morale Effects | S-F001 | 1h |
| P1 | S-F003 | Generate Trade Warnings | S-F001 | 1h |
| P1 | S-F004 | Create RelationshipPanel | S-F001 | 1h |

**Checkpoint F.1**: Relationships affect morale and trades

## F.2 - Aging (Days 20-21)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P0 | S-F005 | Create AgingEngine | Player database | 1.5h |
| P0 | S-F006 | Calculate Retirement Probability | S-F005 | 1h |
| P1 | S-F007 | Create AgingDisplay | S-F005 | 1h |

**Checkpoint F.2**: Players age realistically

## F.3 - Park Factors & Fielding (Days 21-22)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P1 | S-F008 | Create ParkFactorDisplay | Stadium database | 1h |
| P2 | S-F009 | Create StatsByParkView | Game records | 1.5h |
| P1 | S-F010 | Create AdaptiveLearningSystem | Fielding events | 1.5h |
| P1 | S-F011 | Create FieldingStatsAggregation | S-F010 | 1.5h |

## F.4 - Narrative (Day 22)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P1 | S-F012 | Create LeagueNewsFeed | Narrative engine | 1.5h |

**Checkpoint F.4**: News feed showing league happenings

---

# PHASE G: POLISH & HISTORY (Lowest Priority)

**Goal**: Museum, records, export, chemistry

## G.1 - Museum (Days 23-24)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P2 | S-G001 | Create MuseumHub | History data | 1h |
| P2 | S-G002 | Create HallOfFameGallery | HOF inductions | 1.5h |
| P2 | S-G003 | Create RetiredNumbersWall | Retired numbers | 1h |
| P2 | S-G004 | Create FranchiseRecords | Career stats | 1.5h |
| P2 | S-G005 | Create ChampionshipBanners | Championships | 1h |

## G.2 - Export & Polish (Days 24-25)

| Priority | Story ID | Title | Dependencies | Est. |
|----------|----------|-------|--------------|------|
| P2 | S-G006 | Create DataExport Service | Stats data | 1.5h |
| P1 | S-G007 | Create ContractionWarning | Morale tracking | 1h |
| P2 | S-G008 | Create ChemistryDisplay | Relationships | 1.5h |

---

# DEPENDENCY GRAPH (High-Level)

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE A: FOUNDATION                       │
│  Router → Navigation → Global State → Data Input → GameTracker│
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                 PHASE B: CORE GAME LOOP                      │
│         Setup → PreGame → Game → PostGame → Summary          │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              PHASE C: SEASON INFRASTRUCTURE                  │
│      Standings → Schedule → Leaders → Roster → Playoffs      │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌──────────────────────────┴──────────────────────────────────┐
│                                                              │
▼                                                              ▼
┌─────────────────────┐                    ┌──────────────────────┐
│ PHASE D: AWARDS     │                    │ PHASE F: ADVANCED    │
│ Ceremony → All-Star │                    │ Relationships, Aging │
│ → Traits            │                    │ Park Factors, News   │
└──────────┬──────────┘                    └──────────────────────┘
           ↓
┌─────────────────────┐
│ PHASE E: OFFSEASON  │
│ Hub → Retirements   │
│ → FA → Draft →Trade │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ PHASE G: POLISH     │
│ Museum, Records,    │
│ Export, Chemistry   │
└─────────────────────┘
```

---

# SPRINT PLANNING

## Sprints 1-5: Phase A (Foundation)
- **Focus**: Get routing, navigation, state, and GameTracker fixes done
- **Stories**: S-A001 through S-A022
- **Time**: ~15-20 hours

## Sprints 6-8: Phase B (Core Game)
- **Focus**: Complete game flow from setup to summary
- **Stories**: S-B001 through S-B018
- **Time**: ~12-15 hours

## Sprints 9-11: Phase C (Season)
- **Focus**: Season context and team management
- **Stories**: S-C001 through S-C015
- **Time**: ~10-12 hours

## Sprints 12-14: Phase D (Awards)
- **Focus**: End-of-season recognition
- **Stories**: S-D001 through S-D013
- **Time**: ~8-10 hours

## Sprints 15-19: Phase E (Offseason)
- **Focus**: Between-season activities
- **Stories**: S-E001 through S-E015
- **Time**: ~12-15 hours

## Sprints 20-22: Phase F (Advanced)
- **Focus**: Deep systems (can parallel D-E)
- **Stories**: S-F001 through S-F012
- **Time**: ~10-12 hours

## Sprints 23-25: Phase G (Polish)
- **Focus**: History and export
- **Stories**: S-G001 through S-G008
- **Time**: ~6-8 hours

---

# STORY COUNT SUMMARY

| Phase | P0 | P1 | P2 | Total |
|-------|----|----|-----|-------|
| A - Foundation | 21 | 1 | 0 | 22 |
| B - Core Game | 8 | 10 | 0 | 18 |
| C - Season | 4 | 11 | 0 | 15 |
| D - Awards | 9 | 4 | 0 | 13 |
| E - Offseason | 14 | 1 | 0 | 15 |
| F - Advanced | 2 | 9 | 1 | 12 |
| G - Polish | 0 | 1 | 7 | 8 |
| **TOTAL** | **58** | **37** | **8** | **103** |

---

*Update this document as stories complete. Track actual vs estimated times for better future planning.*
