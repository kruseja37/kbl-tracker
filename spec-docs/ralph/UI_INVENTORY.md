# KBL Tracker - Complete UI Inventory

> **Purpose**: Comprehensive inventory of ALL UI components needed per specs
> **Generated**: January 26, 2026
> **Source**: KBL_XHD_TRACKER_MASTER_SPEC_v3.md, OFFSEASON_SYSTEM_SPEC.md, FEATURE_WISHLIST.md, all spec files
> **Scope**: FULL MVP - everything in specs unless technically impossible

---

## Critical Finding: Missing Application Structure

**Current State**: The app is ONLY `GameTracker` - a single component with no navigation.

**Missing Entirely**:
- Main menu / navigation system
- Season management dashboard
- Team management views
- Standings / league views
- All ceremony UIs (Awards, All-Star, Playoffs)
- Offseason hub (11 phases!)
- Trade / Draft interfaces
- Museum / Hall of Fame
- Pre-game / Post-game screens
- Franchise history

---

## Tech Stack Report

| Aspect | Current State |
|--------|---------------|
| React Version | 19.2.0 |
| Styling Approach | **Tailwind CSS** + inline styles (legacy) |
| Tailwind CSS | **✅ INSTALLED** (Jan 26, 2026) |
| Routing | **❌ NONE** - No react-router |
| State Management | Local state only - no global store |
| Component Pattern | Functional components with TypeScript |

**Required Infrastructure**:
- React Router for navigation
- Global state management (Context or Zustand)
- Layout components (Header, Sidebar, etc.)

---

## BUILT (Engines & Core Logic) ✅

These calculation engines exist and are tested:

| System | Engine File | Tests |
|--------|-------------|-------|
| bWAR Calculator | `engines/bwarCalculator.ts` | ✅ |
| pWAR Calculator | `engines/pwarCalculator.ts` | ✅ |
| fWAR Calculator | `engines/fwarCalculator.ts` | ✅ |
| rWAR Calculator | `engines/rwarCalculator.ts` | ✅ |
| mWAR Calculator | `engines/mwarCalculator.ts` | ✅ |
| Leverage Calculator | `engines/leverageCalculator.ts` | ✅ |
| Clutch Calculator | `engines/clutchCalculator.ts` | ✅ |
| Fame Engine | `engines/fameEngine.ts` | ✅ |
| Mojo Engine | `engines/mojoEngine.ts` | ✅ |
| Fitness Engine | `engines/fitnessEngine.ts` | ✅ |
| Salary Calculator | `engines/salaryCalculator.ts` | ✅ |
| Fan Morale Engine | `engines/fanMoraleEngine.ts` | ✅ |
| Narrative Engine | `engines/narrativeEngine.ts` | ✅ |

**Storage/Persistence**:
- IndexedDB game storage ✅
- Season stats aggregation ✅
- Career storage ✅
- Transaction logging ✅

---

## NOT BUILT - Complete Inventory

### Category 1: Application Shell & Navigation (NEW)

| ID | Component | Description | Priority | Spec Reference |
|----|-----------|-------------|----------|----------------|
| APP-001 | AppRouter | React Router setup with routes | P0 | Required for app structure |
| APP-002 | MainMenu | Home screen with navigation options | P0 | MASTER_SPEC §0 |
| APP-003 | NavigationHeader | Persistent header with navigation | P0 | UI/UX Guidelines |
| APP-004 | SeasonDashboard | Central hub showing season progress | P0 | MASTER_SPEC §0 |
| APP-005 | TeamSelector | Select team to manage | P0 | MASTER_SPEC §3 |
| APP-006 | GlobalStateProvider | Context/store for app-wide state | P0 | Architecture requirement |

### Category 2: Pre-Game Flow (NEW)

| ID | Component | Description | Priority | Spec Reference |
|----|-----------|-------------|----------|----------------|
| PRE-001 | PreGameScreen | Display before each game starts | P0 | MASTER_SPEC §0 preGameFlow |
| PRE-002 | GameSetupModal | Team/stadium/pitcher selection | P0 | BUG-012 |
| PRE-003 | StadiumSelector | Select stadium with park factors | P1 | MASTER_SPEC §4 |
| PRE-004 | MatchupPreview | Show starting pitchers, records | P1 | MASTER_SPEC preGameFlow |
| PRE-005 | RivalryIndicator | Show if rivalry game | P1 | MASTER_SPEC §3 |
| PRE-006 | RevengeArcDisplay | Show revenge arc players | P1 | RELATIONSHIP_SPEC |
| PRE-007 | PreGameStorylines | Beat reporter pre-game stories | P2 | NARRATIVE_SPEC |

### Category 3: In-Game Tracking (Bugs/Gaps)

| ID | Component | Description | Priority | Spec Reference |
|----|-----------|-------------|----------|----------------|
| GAME-001 | ScoreboardTeamNames | Display team names | P0 | BUG-008 |
| GAME-002 | UndoButton | Visible undo button | P0 | BUG-009 |
| GAME-003 | ClickablePlayerNames | Click names for PlayerCard | P0 | BUG-007 |
| GAME-004 | LineupViewPanel | View lineup with mojo/fitness | P0 | BUG-009 |
| GAME-005 | PitchCountDisplay | Show pitch count | P0 | BUG-011 |
| GAME-006 | MojoFitnessIndicators | Mojo/Fitness badges on players | P0 | BUG-006 |
| GAME-007 | InningEndSummary | Summary at end of half-inning | P1 | BUG-014 |
| GAME-008 | PitcherExitPrompt | Prompt when pitcher should exit | P1 | BUG-012 |
| GAME-009 | DoubleSwitchModal | Double switch substitution | P1 | SUBSTITUTION_SPEC |
| GAME-010 | AtBatFlowFix | Fix exit type double entry | P0 | BUG-006 |
| GAME-011 | WalkoffDetection | Detect and celebrate walkoffs | P1 | REQUIREMENTS |
| GAME-012 | FameEventsInGame | Show Fame events during game | P1 | BUG-007 wishlist |
| GAME-013 | SpecialPlayLogging | Log special plays to activity | P1 | BUG-014 |

### Category 4: Post-Game Flow (NEW)

| ID | Component | Description | Priority | Spec Reference |
|----|-----------|-------------|----------|----------------|
| POST-001 | PostGameScreen | Full post-game summary | P0 | MASTER_SPEC postGameFlow |
| POST-002 | PlayerOfGameDisplay | POG highlight | P0 | MASTER_SPEC §0 |
| POST-003 | BoxScoreView | Full box score display | P1 | MASTER_SPEC §4 |
| POST-004 | MemorabeMomentsReplay | Show key moments | P2 | MASTER_SPEC §0 |
| POST-005 | PostGameHeadline | Beat reporter headline | P1 | NARRATIVE_SPEC |
| POST-006 | StandingsUpdate | Show updated standings | P1 | MASTER_SPEC §0 |

### Category 5: Season Management (NEW)

| ID | Component | Description | Priority | Spec Reference |
|----|-----------|-------------|----------|----------------|
| SEASON-001 | StandingsView | Full league standings | P0 | MASTER_SPEC §3 |
| SEASON-002 | ScheduleView | Season schedule with results | P1 | MASTER_SPEC §2 |
| SEASON-003 | LeagueLeadersView | Statistical leaders | P1 | MASTER_SPEC §9 |
| SEASON-004 | TradeDeadlinePrompt | Trade deadline notification | P1 | MASTER_SPEC §25 |
| SEASON-005 | SeasonProgressTracker | Games played, phase indicator | P0 | MASTER_SPEC §0 |
| SEASON-006 | WildCardRace | Playoff race display | P2 | PLAYOFF_SPEC |

### Category 6: Team Management (NEW)

| ID | Component | Description | Priority | Spec Reference |
|----|-----------|-------------|----------|----------------|
| TEAM-001 | RosterView | Full team roster | P0 | MASTER_SPEC §3 |
| TEAM-002 | DepthChart | Position depth chart | P1 | MASTER_SPEC §3 |
| TEAM-003 | TeamStatsView | Team batting/pitching stats | P1 | MASTER_SPEC §3 |
| TEAM-004 | FarmRosterView | Farm system roster (10 players) | P1 | OFFSEASON_SPEC |
| TEAM-005 | TeamChemistryDisplay | Chemistry visualization | P2 | CHEMISTRY_SPEC |
| TEAM-006 | TeamFinancialsView | Payroll, budget, cap space | P1 | SALARY_SPEC |
| TEAM-007 | FanMoralePanel | Team fan morale status | P1 | FAN_MORALE_SPEC |
| TEAM-008 | BeatReporterPanel | Team's beat reporter | P2 | NARRATIVE_SPEC |

### Category 7: Player Management (Partial)

| ID | Component | Description | Priority | Spec Reference |
|----|-----------|-------------|----------|----------------|
| PLAYER-001 | PlayerCard | ⚠️ EXISTS but needs fixes | P0 | MASTER_SPEC §19 |
| PLAYER-002 | PlayerRatingsInput | Input player ratings (5 stats) | P0 | SALARY_SPEC - BLOCKED |
| PLAYER-003 | PlayerRatingsView | View ratings breakdown | P1 | MASTER_SPEC §16 |
| PLAYER-004 | PlayerContractView | Contract/salary details | P1 | SALARY_SPEC |
| PLAYER-005 | PlayerCareerView | Career stats display | P1 | MASTER_SPEC §15 |
| PLAYER-006 | PlayerTraitsDisplay | Traits list and effects | P1 | SMB4_REFERENCE |
| PLAYER-007 | PlayerMilestones | Milestone progress | P2 | MASTER_SPEC §15 |
| PLAYER-008 | PlayerRelationships | Relationships display | P2 | RELATIONSHIP_SPEC |

### Category 8: All-Star Break (NEW)

| ID | Component | Description | Priority | Spec Reference |
|----|-----------|-------------|----------|----------------|
| ASB-001 | AllStarScreen | All-Star break hub | P1 | MASTER_SPEC §8 |
| ASB-002 | AllStarVotingDisplay | Show voting results | P1 | MASTER_SPEC §8 |
| ASB-003 | AllStarRosterDisplay | Show rosters | P1 | MASTER_SPEC §8 |
| ASB-004 | AllStarTraitLottery | Trait assignment wheel | P1 | MASTER_SPEC §8 |
| ASB-005 | AllStarMVPReveal | ASG MVP reveal | P2 | MASTER_SPEC §8 |

### Category 9: Playoffs (NEW)

| ID | Component | Description | Priority | Spec Reference |
|----|-----------|-------------|----------|----------------|
| PLAY-001 | PlayoffBracket | Visual bracket | P1 | PLAYOFF_SPEC |
| PLAY-002 | PlayoffSeriesView | Current series display | P1 | PLAYOFF_SPEC |
| PLAY-003 | PlayoffStatsView | Playoff-specific stats | P2 | PLAYOFF_SPEC |
| PLAY-004 | ChampionshipCelebration | Championship win screen | P1 | PLAYOFF_SPEC |
| PLAY-005 | PlayoffMVPReveal | Playoff MVP reveal | P1 | PLAYOFF_SPEC |

### Category 10: Awards Ceremony (NEW)

| ID | Component | Description | Priority | Spec Reference |
|----|-----------|-------------|----------|----------------|
| AWARD-001 | AwardsCeremonyHub | Awards ceremony flow | P0 | MASTER_SPEC §9, OFFSEASON_SPEC |
| AWARD-002 | LeagueLeadersAward | League leaders screen | P0 | MASTER_SPEC Screen 1 |
| AWARD-003 | GoldGloveAwards | Gold Glove reveal | P0 | MASTER_SPEC Screen 2 |
| AWARD-004 | SilverSluggerAwards | Silver Slugger reveal | P0 | MASTER_SPEC Screen 2 |
| AWARD-005 | ROYReveal | Rookie of Year reveal | P0 | MASTER_SPEC Screen 3 |
| AWARD-006 | RelieverOTYReveal | Reliever reveal | P1 | MASTER_SPEC Screen 3 |
| AWARD-007 | ComebackReveal | Comeback player reveal | P1 | MASTER_SPEC Screen 3 |
| AWARD-008 | KaraKawaguchiReveal | Value award reveal | P1 | MASTER_SPEC Screen 3 |
| AWARD-009 | MVPReveal | MVP reveal (dramatic) | P0 | MASTER_SPEC Screen 4 |
| AWARD-010 | CyYoungReveal | Cy Young reveal | P0 | MASTER_SPEC Screen 4 |
| AWARD-011 | ManagerOTYReveal | Manager reveal | P1 | MASTER_SPEC |
| AWARD-012 | BustOTYReveal | Bust reveal (shameful) | P1 | MASTER_SPEC Screen 5 |
| AWARD-013 | AwardsSummary | Summary screen | P0 | MASTER_SPEC Screen 6 |
| AWARD-014 | TraitLotteryWheel | Trait assignment spinner | P1 | OFFSEASON_SPEC §4 |
| AWARD-015 | VotingBreakdown | Show vote totals | P2 | MASTER_SPEC |

### Category 11: Offseason Hub (NEW)

| ID | Component | Description | Priority | Spec Reference |
|----|-----------|-------------|----------|----------------|
| OFF-001 | OffseasonHub | Main offseason navigation | P0 | OFFSEASON_SPEC §1 |
| OFF-002 | OffseasonProgressTracker | Phase completion tracker | P0 | OFFSEASON_SPEC §1 |
| OFF-003 | EOSRatingsView | EOS adjustments display | P0 | MASTER_SPEC EOS section |
| OFF-004 | BreakoutStarsView | Top gainers | P1 | MASTER_SPEC |
| OFF-005 | FallingStarsView | Top losers | P1 | MASTER_SPEC |
| OFF-006 | PlayerDetailBreakdown | Detailed rating change | P1 | MASTER_SPEC |

### Category 12: Retirements & Legacy (NEW)

| ID | Component | Description | Priority | Spec Reference |
|----|-----------|-------------|----------|----------------|
| RET-001 | RetirementsScreen | Retirement announcements | P0 | OFFSEASON_SPEC §7 |
| RET-002 | RetirementDiceRoll | Retirement probability roll | P1 | OFFSEASON_SPEC |
| RET-003 | JerseyRetirementCeremony | Jersey retirement UI | P1 | OFFSEASON_SPEC |
| RET-004 | HallOfFameInduction | HOF ceremony | P1 | OFFSEASON_SPEC §16 |
| RET-005 | HOFPlaqueReveal | Plaque reveal animation | P2 | OFFSEASON_SPEC |
| RET-006 | CareerHighlightsReel | Career moments display | P2 | OFFSEASON_SPEC |

### Category 13: Free Agency (NEW)

| ID | Component | Description | Priority | Spec Reference |
|----|-----------|-------------|----------|----------------|
| FA-001 | FreeAgencyHub | FA main screen | P0 | OFFSEASON_SPEC §8 |
| FA-002 | ProtectedPlayerSelection | Protect 1 player | P0 | OFFSEASON_SPEC |
| FA-003 | FADestinationReveal | Where FA goes | P0 | OFFSEASON_SPEC |
| FA-004 | FARoundTracker | Track FA rounds 1-32 | P1 | OFFSEASON_SPEC |
| FA-005 | FABidding | Bidding/negotiation UI | P1 | OFFSEASON_SPEC |
| FA-006 | ChangeOfHeartEvent | Surprise FA return | P2 | OFFSEASON_SPEC |

### Category 14: Draft (NEW)

| ID | Component | Description | Priority | Spec Reference |
|----|-----------|-------------|----------|----------------|
| DRAFT-001 | DraftHub | Draft main screen | P0 | OFFSEASON_SPEC §9 |
| DRAFT-002 | DraftLotteryWheel | Lottery spinner | P1 | OFFSEASON_SPEC |
| DRAFT-003 | DraftOrderReveal | Show draft order | P0 | OFFSEASON_SPEC |
| DRAFT-004 | ProspectList | Available prospects | P0 | OFFSEASON_SPEC |
| DRAFT-005 | DraftPickSelection | Make pick | P0 | OFFSEASON_SPEC |
| DRAFT-006 | DraftSummary | Draft results | P1 | OFFSEASON_SPEC |

### Category 15: Trade System (NEW)

| ID | Component | Description | Priority | Spec Reference |
|----|-----------|-------------|----------|----------------|
| TRADE-001 | TradeHub | Trade main screen | P0 | MASTER_SPEC §25 |
| TRADE-002 | TradeProposalBuilder | Build trade package | P0 | MASTER_SPEC §25 |
| TRADE-003 | TradeSalaryMatcher | Salary matching display | P0 | SALARY_SPEC |
| TRADE-004 | TradeImpactPreview | WAR/chemistry impact | P1 | MASTER_SPEC §25 |
| TRADE-005 | TradeRelationshipWarnings | Relationship impacts | P2 | RELATIONSHIP_SPEC |
| TRADE-006 | TradeCounterOffer | Counter negotiation | P1 | MASTER_SPEC §25 |
| TRADE-007 | TradeCompletion | Finalize trade | P0 | MASTER_SPEC §25 |
| TRADE-008 | TradeDeadlineCountdown | Countdown timer | P2 | MASTER_SPEC §25 |

### Category 16: Contraction/Expansion (NEW)

| ID | Component | Description | Priority | Spec Reference |
|----|-----------|-------------|----------|----------------|
| CON-001 | ContractionWarning | Warning when morale <30 | P1 | OFFSEASON_SPEC §6 |
| CON-002 | ContractionFateRoll | Dice roll ceremony | P1 | OFFSEASON_SPEC §6 |
| CON-003 | ProtectedPlayersSelection | Protect 3 from expansion | P1 | OFFSEASON_SPEC §6 |
| CON-004 | ExpansionDraft | Expansion draft UI | P2 | OFFSEASON_SPEC §6 |

### Category 17: Museum & History (NEW)

| ID | Component | Description | Priority | Spec Reference |
|----|-----------|-------------|----------|----------------|
| MUS-001 | MuseumHub | Museum main screen | P2 | MASTER_SPEC §24 |
| MUS-002 | HallOfFameGallery | HOF members | P2 | MASTER_SPEC §14 |
| MUS-003 | RetiredNumbersWall | Retired numbers | P2 | MASTER_SPEC §14 |
| MUS-004 | FranchiseRecords | Team records | P2 | MASTER_SPEC §15 |
| MUS-005 | MemorableMomentsArchive | Historic moments | P2 | MASTER_SPEC §24 |
| MUS-006 | SeasonHistoryView | Past seasons | P2 | MASTER_SPEC §24 |
| MUS-007 | ChampionshipBanners | Championship history | P2 | MASTER_SPEC §24 |

### Category 18: Relationships & Chemistry (NEW - Entire System)

| ID | Component | Description | Priority | Spec Reference |
|----|-----------|-------------|----------|----------------|
| REL-001 | RelationshipEngine | Engine for relationship logic | P1 | RELATIONSHIP_SPEC |
| REL-002 | RelationshipPanel | Player relationships view | P1 | RELATIONSHIP_SPEC |
| REL-003 | ChemistryDisplay | Team chemistry visualization | P2 | CHEMISTRY_SPEC |
| REL-004 | RivalryTracker | Track player rivalries | P1 | RELATIONSHIP_SPEC |
| REL-005 | RevengeArcNotification | Revenge arc prompts | P2 | RELATIONSHIP_SPEC |
| REL-006 | RelationshipFormation | New relationship events | P2 | RELATIONSHIP_SPEC |

### Category 19: Aging System (NEW)

| ID | Component | Description | Priority | Spec Reference |
|----|-----------|-------------|----------|----------------|
| AGE-001 | AgingEngine | Age curve calculations | P0 | FEATURE_WISHLIST HIGH |
| AGE-002 | AgingDisplay | Show aging effects | P1 | MOJO_FITNESS_SPEC |
| AGE-003 | DeclineWarning | Warn of decline phase | P2 | AGING_SPEC |

### Category 20: Advanced Fielding (Gaps)

| ID | Component | Description | Priority | Spec Reference |
|----|-----------|-------------|----------|----------------|
| FLD-001 | AdaptiveLearningSystem | Inference learning | P1 | FEATURE_WISHLIST HIGH |
| FLD-002 | SprayChartVisualization | Spray chart display | P2 | FIELDING_SPEC |
| FLD-003 | FieldingStatsAggregation | Per-position fielding stats | P1 | FWAR_SPEC |
| FLD-004 | DPRoleTracking | DP started/turned/completed | P1 | FIELDING_SPEC |
| FLD-005 | MentalErrorType | Mental error in UI | P1 | FIELDING_SPEC |

### Category 21: Park Factors (NEW)

| ID | Component | Description | Priority | Spec Reference |
|----|-----------|-------------|----------|----------------|
| PARK-001 | StadiumDatabase | Stadium data with dimensions | P1 | PWAR_SPEC |
| PARK-002 | ParkFactorDisplay | Show park factors | P1 | PWAR_SPEC |
| PARK-003 | StatsAtParkView | Stats by stadium | P2 | USER REQUEST |
| PARK-004 | AdaptiveParkFactors | Auto-adjust park factors | P2 | PWAR_SPEC §11 |

### Category 22: Narrative Expansion (Gaps)

| ID | Component | Description | Priority | Spec Reference |
|----|-----------|-------------|----------|----------------|
| NAR-001 | LeagueNewsFeed | News feed with stories | P1 | NARRATIVE_SPEC |
| NAR-002 | PreGameNarrative | Pre-game stories | P1 | FEATURE_WISHLIST |
| NAR-003 | InjuryReportNarrative | Injury reports | P2 | FEATURE_WISHLIST |
| NAR-004 | CallUpNarrative | Call-up announcements | P2 | FEATURE_WISHLIST |
| NAR-005 | ReporterHiringFiring | Reporter management | P2 | NARRATIVE_SPEC |
| NAR-006 | HistoricalMemory | Callback system | P2 | NARRATIVE_SPEC |

### Category 23: Data Export (NEW)

| ID | Component | Description | Priority | Spec Reference |
|----|-----------|-------------|----------|----------------|
| EXP-001 | BoxScoreExport | Export box score | P2 | REQUIREMENTS |
| EXP-002 | StatsExport | Export stats to CSV | P2 | User need |
| EXP-003 | SeasonSummaryExport | Export season summary | P2 | User need |

---

## Summary Counts

| Category | P0 | P1 | P2 | Total |
|----------|----|----|----|----|
| App Shell & Navigation | 6 | 0 | 0 | 6 |
| Pre-Game Flow | 2 | 4 | 1 | 7 |
| In-Game Tracking | 6 | 6 | 1 | 13 |
| Post-Game Flow | 2 | 3 | 1 | 6 |
| Season Management | 2 | 3 | 1 | 6 |
| Team Management | 1 | 5 | 2 | 8 |
| Player Management | 2 | 4 | 2 | 8 |
| All-Star Break | 0 | 4 | 1 | 5 |
| Playoffs | 0 | 4 | 1 | 5 |
| Awards Ceremony | 5 | 8 | 2 | 15 |
| Offseason Hub | 2 | 4 | 0 | 6 |
| Retirements & Legacy | 1 | 3 | 2 | 6 |
| Free Agency | 2 | 3 | 1 | 6 |
| Draft | 3 | 2 | 0 | 5 |
| Trade System | 4 | 3 | 1 | 8 |
| Contraction/Expansion | 0 | 3 | 1 | 4 |
| Museum & History | 0 | 0 | 7 | 7 |
| Relationships & Chemistry | 0 | 3 | 3 | 6 |
| Aging System | 1 | 1 | 1 | 3 |
| Advanced Fielding | 0 | 4 | 1 | 5 |
| Park Factors | 0 | 2 | 2 | 4 |
| Narrative Expansion | 0 | 2 | 4 | 6 |
| Data Export | 0 | 0 | 3 | 3 |
| **TOTAL** | **39** | **71** | **38** | **148** |

---

## Implementation Phases Recommended

### Phase A: Foundation (P0 Infrastructure)
- APP-001 through APP-006 (App shell, routing, state)
- GAME-001 through GAME-006 (Critical bug fixes)
- PLAYER-002 (Ratings input - unblocks salary)

### Phase B: Core Game Loop
- PRE-001, PRE-002 (Pre-game)
- POST-001 through POST-003 (Post-game)
- Remaining GAME-* items

### Phase C: Season Infrastructure
- SEASON-001 through SEASON-005
- TEAM-001 through TEAM-006
- PLAY-001, PLAY-002

### Phase D: Awards & Recognition
- AWARD-001 through AWARD-015
- ASB-001 through ASB-005

### Phase E: Offseason System
- OFF-001 through OFF-006
- RET-001 through RET-006
- FA-001 through FA-006
- DRAFT-001 through DRAFT-006

### Phase F: Advanced Systems
- TRADE-001 through TRADE-008
- REL-001 through REL-006
- AGE-001 through AGE-003
- PARK-001 through PARK-004

### Phase G: Polish & History
- MUS-001 through MUS-007
- NAR-001 through NAR-006
- EXP-001 through EXP-003
- CON-001 through CON-004

---

*This inventory reflects the FULL scope per specifications. Story generation will proceed by phase.*
