# KBL Tracker — Complete Screen Map

> **Purpose**: Every screen, tab, and flow a user can reach in the app.
> Used by ui-flow-crawler to ensure nothing is missed during crawl.

## Routes (14 total)

| Route | Page Component | Figma Spec | Notes |
|-------|---------------|-----------|-------|
| `/` | AppHome | `KBL_TRACKER_FIGMA_MAKE_PROMPT_V2.md` | Entry point, links to all modes |
| `/league-builder` | LeagueBuilder | `LEAGUE_BUILDER_FIGMA_SPEC.md` | Hub page with sub-navigation |
| `/league-builder/leagues` | LeagueBuilderLeagues | `LEAGUE_BUILDER_FIGMA_SPEC.md` | League templates management |
| `/league-builder/teams` | LeagueBuilderTeams | `LEAGUE_BUILDER_FIGMA_SPEC.md` | Team management |
| `/league-builder/players` | LeagueBuilderPlayers | `LEAGUE_BUILDER_FIGMA_SPEC.md` | Player database management |
| `/league-builder/rosters` | LeagueBuilderRosters | `LEAGUE_BUILDER_FIGMA_SPEC.md` | Roster assignment |
| `/league-builder/draft` | LeagueBuilderDraft | `LEAGUE_BUILDER_FIGMA_SPEC.md` | Draft configuration |
| `/league-builder/rules` | LeagueBuilderRules | `LEAGUE_BUILDER_FIGMA_SPEC.md` | Rules presets |
| `/franchise/setup` | FranchiseSetup | `SEASON_SETUP_FIGMA_SPEC.md` | New franchise wizard (62KB component) |
| `/franchise/:franchiseId` | FranchiseHome | Multiple specs | Main app hub (228K component) |
| `/game-tracker/:gameId` | GameTracker | GameTracker specs | Live game tracking (3,842 lines) |
| `/post-game/:gameId` | PostGameSummary | GameTracker specs | Post-game stats and summary |
| `/exhibition` | ExhibitionGame | — | Quick game setup |
| `/world-series` | WorldSeries | `PLAYOFFS_FIGMA_SPEC.md` | Playoff bracket/series |

## FranchiseHome Tabs

FranchiseHome is a tab-based mega-component. Tabs change by seasonal phase.
Phase is controlled by `seasonPhase` state: `"regular"` | `"playoffs"` | `"offseason"`.

**Rendering patterns**:
- **Dedicated component**: A named React component renders the tab content
- **Inline JSX**: Tab content is JSX directly inside FranchiseHome.tsx
- **Trigger → Modal**: Tab shows a landing page; user clicks CTA button to open the actual flow component as a modal overlay
- **Trigger → Inline**: Tab shows a landing page; user clicks CTA button to show the flow component inline below

**Shared tabs**: Some tab IDs are used across multiple phases (e.g., `news`, `team`, `museum`, `rosters`). The same `activeTab` check renders the same component regardless of current phase.

### Regular Season Phase (9 tabs)

| Tab ID | Label | Component | Render Type | Figma Spec | Data Source |
|--------|-------|-----------|-------------|-----------|-------------|
| `news` | THE TOOTWHISTLE TIMES | BeatReporterNews | Dedicated (defined in same file) | — | narrativeEngine |
| `todays-game` | Today's Game | GameDayContent | Dedicated (defined in same file, **has hardcoded mock data**) | — | scheduleStorage → gameStorage |
| `schedule` | SCHEDULE | ScheduleContent | Dedicated (with props) | `SCHEDULE_SYSTEM_FIGMA_SPEC.md` | useScheduleData → scheduleStorage |
| `standings` | STANDINGS | StandingsContent | Dedicated (defined in same file) | — | seasonStorage (win/loss) |
| `team` | TEAM HUB | TeamHubContent | Dedicated | — | useFranchiseData, useLeagueBuilderData |
| `leaders` | LEAGUE LEADERS | LeagueLeadersContent | Dedicated (defined in same file) | — | seasonStorage (stat leaders) |
| `rosters` | TRADES | TradeFlow | Dedicated | `TRADE_FIGMA_SPEC.md` | transactionStorage |
| `allstar` | ALL-STAR | (inline) | Inline JSX | — | All-star voting by position (baseball field layout) |
| `museum` | MUSEUM | MuseumContent | Dedicated | — | useMuseumData → museumStorage |

**NOTE**: Tab ID `rosters` has label "TRADES". This is intentional in the code.

### Playoff Phase (8 tabs)

| Tab ID | Label | Component | Render Type | Figma Spec | Data Source |
|--------|-------|-----------|-------------|-----------|-------------|
| `news` | THE TOOTWHISTLE TIMES | BeatReporterNews | Dedicated (shared) | — | narrativeEngine |
| `bracket` | BRACKET | (inline) | Inline JSX | `PLAYOFFS_FIGMA_SPEC.md` | usePlayoffData → playoffStorage |
| `series` | SERIES RESULTS | (inline) | Inline JSX | `PLAYOFFS_FIGMA_SPEC.md` | playoffStorage |
| `playoff-stats` | PLAYOFF STATS | (inline) | Inline JSX | `PLAYOFFS_FIGMA_SPEC.md` | playoffData (team records + placeholder for individual stats) |
| `playoff-leaders` | PLAYOFF LEADERS | (inline) | Inline JSX | `PLAYOFFS_FIGMA_SPEC.md` | playoffData (placeholder until games tracked via GameTracker) |
| `team` | TEAM HUB | TeamHubContent | Dedicated (shared) | — | useFranchiseData |
| `advance` | ADVANCE TO OFFSEASON | (inline) | Inline JSX | `PLAYOFFS_FIGMA_SPEC.md` | playoffData (disabled until playoffs complete) |
| `museum` | MUSEUM | MuseumContent | Dedicated (shared) | — | museumStorage |

**NOTE**: The `advance` tab content at line 1181 only renders when `seasonPhase === "playoffs"`. A fallback "ADVANCE COMING SOON" placeholder exists at line 1624 for non-playoff context.

### Offseason Phase (10 tabs)

| Tab ID | Label | Component | Render Type | Figma Spec | Data Source |
|--------|-------|-----------|-------------|-----------|-------------|
| `news` | THE TOOTWHISTLE TIMES | BeatReporterNews | Dedicated (shared) | — | narrativeEngine |
| `awards` | AWARDS | Landing → AwardsCeremonyFlow | Trigger → Modal | `AWARDS_CEREMONY_FIGMA_SPEC.md` | fameEngine, seasonStorage |
| `ratings-adj` | RATINGS ADJ | Landing → click "END-OF-SEASON RATINGS ADJUSTMENTS" → RatingsAdjustmentFlow | Trigger → Modal | `EOS_RATINGS_FIGMA_SPEC.md` | ratingsStorage, agingEngine |
| `retirements` | RETIREMENTS | Landing → RetirementFlow | Trigger → Modal | `RETIREMENT_FIGMA_SPEC.md` | agingEngine |
| `contraction` | CONTRACT/EXPAND | Landing → ContractionExpansionFlow | Trigger → Modal | `CONTRACTION_EXPANSION_FIGMA_SPEC.md` | franchiseStorage |
| `free-agency` | FREE AGENCY | Landing → FreeAgencyFlow | Trigger → Inline | `FREE_AGENCY_FIGMA_SPEC.md` | salaryCalculator, transactionStorage |
| `draft` | DRAFT | Landing → DraftFlow | Trigger → Modal | `DRAFT_FIGMA_SPEC.md` | leagueBuilderStorage |
| `rosters` | TRADES | TradeFlow | Dedicated (shared) | `TRADE_FIGMA_SPEC.md` | transactionStorage |
| `finalize` | FINALIZE AND ADVANCE | Landing → FinalizeAdvanceFlow | Trigger → Inline | `FINALIZE_ADVANCE_FIGMA_SPEC.md` | offseasonStorage |
| `museum` | MUSEUM | MuseumContent | Dedicated (shared) | — | museumStorage |

**IMPORTANT for crawling offseason tabs**: Most offseason tabs render a LANDING PAGE first. The crawler must:
1. Click the tab to see the landing page
2. Screenshot the landing page
3. Click the CTA button (e.g., "BEGIN AWARDS CEREMONY", "START FREE AGENCY")
4. Screenshot the opened flow/modal
5. Test interactions within the flow
6. Close/complete the flow and verify return to landing page

## GameTracker Sub-Components

The GameTracker page (3,842 lines at `src/src_figma/app/pages/GameTracker.tsx`) contains many interactive sub-components.
All sub-components live in `src/src_figma/app/components/`:

| Component | File | What It Does | Key Interactions |
|-----------|------|-------------|-----------------|
| OutcomeButtons | `OutcomeButtons.tsx` | Hit/out/walk selection | Click → records at-bat |
| EnhancedInteractiveField | `EnhancedInteractiveField.tsx` (155K) | Diamond visualization + drag-drop | Drag runners, click fielders |
| MiniScoreboard | `MiniScoreboard.tsx` | Score + inning display | Read-only |
| LineupCard | `LineupCard.tsx` | Current lineup | Click for substitutions |
| SidePanel | `SidePanel.tsx` | Stats + play-by-play | Toggle sections |
| ModifierButtonBar | `ModifierButtonBar.tsx` | SB, CS, WP, PB, etc. | Click → special events |
| ActionSelector | `ActionSelector.tsx` | Play type selection | Click → sub-options |
| UndoSystem | `UndoSystem.tsx` | Undo last action | Click → revert state |
| RunnerOutcomesDisplay | `RunnerOutcomesDisplay.tsx` | Runner advance/out options | Click → runner results |
| StarPlaySubtypePopup | `StarPlaySubtypePopup.tsx` | Star play classification | Click → subtype selection |
| BatterReachedPopup | `BatterReachedPopup.tsx` | Reached-on-error details | Click → error type |
| ErrorTypePopup | `ErrorTypePopup.tsx` | Error classification | Click → fielder selection |
| PlayLocationOverlay | `PlayLocationOverlay.tsx` | Where ball was hit | Click field zone |
| InjuryPrompt | `InjuryPrompt.tsx` | Injury during game | Click → injury details |

### GameTracker Modals

All modals live in `src/src_figma/app/components/modals/`:

| Modal | File | Trigger | Figma Spec |
|-------|------|---------|-----------|
| PitchingChangeModal | `PitchingChangeModal.tsx` | Change pitcher button | `SUBSTITUTION_FLOW_SPEC.md` |
| PinchHitterModal | `PinchHitterModal.tsx` | Pinch hit button | `SUBSTITUTION_FLOW_SPEC.md` |
| PinchRunnerModal | `PinchRunnerModal.tsx` | Pinch run button | `SUBSTITUTION_FLOW_SPEC.md` |
| DefensiveSubModal | `DefensiveSubModal.tsx` | Defensive sub button | `SUBSTITUTION_FLOW_SPEC.md` |
| DoubleSwitchModal | `DoubleSwitchModal.tsx` | Double switch button | `SUBSTITUTION_FLOW_SPEC.md` |
| PositionSwitchModal | `PositionSwitchModal.tsx` | Position switch button | `SUBSTITUTION_FLOW_SPEC.md` |
| FielderCreditModal | `FielderCreditModal.tsx` | After out recorded | — |
| ErrorOnAdvanceModal | `ErrorOnAdvanceModal.tsx` | Runner advances on error | — |

## User Flows (End-to-End)

### Flow 1: Exhibition Game
```
AppHome → "Exhibition" → ExhibitionGame
  → Select home team → Select away team → "Start Game"
  → GameTracker → Record at-bats until game ends
  → PostGameSummary → "Back to Home"
```
**Data involved**: leagueBuilderStorage (teams/rosters), gameStorage (game state), seasonStorage (stats)

### Flow 2: New Franchise
```
AppHome → "New Franchise" → FranchiseSetup
  → Select league template → Configure settings → "Create Franchise"
  → FranchiseHome (Regular Season)
```
**Data involved**: leagueBuilderStorage, franchiseStorage

### Flow 3: Play Franchise Game
```
FranchiseHome → "Today's Game" tab → GameDayContent
  → Click "PLAY GAME" → navigates to /game-tracker/game-123 (hardcoded!)
  → GameTracker → Play game → End game
  → PostGameSummary → "Return to Franchise"
  → FranchiseHome (standings/stats updated)
```
**Data involved**: scheduleStorage, gameStorage, seasonStorage, franchiseStorage
**WARNING**: GameDayContent currently navigates to a hardcoded `/game-tracker/game-123` — this is dummy data that may not load a real game.

### Flow 4: Full Season Cycle
```
FranchiseHome (Regular Season) → Play all games → Season ends
  → FranchiseHome switches to Playoff phase
  → Play playoff games → WorldSeries
  → Season complete → Offseason phase
  → Awards → Ratings → Retirements → Contract/Expand
  → Free Agency → Draft → Trades → Finalize
  → New season starts → Back to Regular Season
```
**Data involved**: ALL storage systems, ALL engines

### Flow 5: League Builder → Franchise
```
AppHome → "League Builder" → LeagueBuilder hub
  → Leagues → Create league
  → Teams → Add/edit teams
  → Players → Add/edit players
  → Rosters → Assign players to teams
  → Rules → Configure rules
  → "Start Franchise from League"
  → FranchiseSetup → FranchiseHome
```
**Data involved**: leagueBuilderStorage → franchiseStorage

## Figma Spec Coverage Checklist

Total Figma/spec docs: 18

| # | Spec | Screens Covered | Priority |
|---|------|----------------|----------|
| 1 | `LEAGUE_BUILDER_FIGMA_SPEC.md` | 7 pages | HIGH |
| 2 | `SEASON_SETUP_FIGMA_SPEC.md` | 1 page (wizard) | HIGH |
| 3 | `PLAYOFFS_FIGMA_SPEC.md` | 4 tabs + WorldSeries | HIGH |
| 4 | `SCHEDULE_SYSTEM_FIGMA_SPEC.md` | 1 tab | MEDIUM |
| 5 | `TRADE_FIGMA_SPEC.md` | 1 tab (2 phases: regular + offseason) | MEDIUM |
| 6 | `FREE_AGENCY_FIGMA_SPEC.md` | 1 tab | MEDIUM |
| 7 | `DRAFT_FIGMA_SPEC.md` | 1 tab | MEDIUM |
| 8 | `SEASON_END_FIGMA_SPEC.md` | Phase transition | MEDIUM |
| 9 | `SUBSTITUTION_FLOW_SPEC.md` | GameTracker → 6 substitution modals | MEDIUM |
| 10 | `AWARDS_CEREMONY_FIGMA_SPEC.md` | 1 tab | LOW |
| 11 | `EOS_RATINGS_FIGMA_SPEC.md` | 1 tab | LOW |
| 12 | `RETIREMENT_FIGMA_SPEC.md` | 1 tab | LOW |
| 13 | `CONTRACTION_EXPANSION_FIGMA_SPEC.md` | 1 tab | LOW |
| 14 | `FINALIZE_ADVANCE_FIGMA_SPEC.md` | 1 tab | LOW |
| 15 | `KBL_TRACKER_FIGMA_MAKE_PROMPT_V2.md` | Global design | LOW |
| 16 | `FIGMA_BLURB_FREE_AGENCY_EXCHANGE.md` | Supporting doc | LOW |
| 17 | `FIGMA_GAMETRACKER_IMPLEMENTATION_PLAN.md` | GameTracker implementation plan | — |
| 18 | `LEGACY_VS_FIGMA_AUDIT.md` | Reference only | — |
