# Tier 3.4: Playoffs & Season — 25 Items

Key specs: [see individual items]
Notes: [see AUTHORITY.md for Phase B decisions]

---
### CRIT-B7-005
- Severity: CRITICAL
- Spec: PLAYOFFS_FIGMA_SPEC.md §Screens 2-6,9
- Code Location: N/A (missing)
- Spec Says: Spec: 6 screens (Series Detail, Start Game Modal, Game Complete, Series MVP, Championship Celebration, Roster Management)
- Code Says: Code: ALL 6 screens entirely missing — no UI pathway to start playoff games, record results, award MVPs, or celebrate championships
- Recommended Fix: Implement all 6 missing playoff screens

---
### GAP-B12-001
- Severity: GAP
- Spec: STORIES_GAMETRACKER_FIXES.md GT-005
- Code Location: EnhancedInteractiveField.tsx:3834
- Spec Says: After fielder drag, original position cleared or shown as ghost with clear distinction — no duplicate labels
- Code Says: Original fielder positions still rendered at line 3834 ("Fielders at original positions"). No GT-005 fix comment found. Fielder may still appear at both old and new location
- Recommended Fix: Implement ghost/hide logic for original fielder position after drag

---
### GAP-B12-002
- Severity: GAP
- Spec: STORIES_GAMETRACKER_FIXES.md GT-016
- Code Location: EnhancedInteractiveField.tsx
- Spec Says: Visual throw path lines drawn between fielders as sequence is built, with animation and order badges (1,2,3)
- Code Says: Sequence badges exist but no throw-path line rendering found. No GT-016 fix comment in code
- Recommended Fix: Add SVG line/path between fielders in throw sequence

---
### GAP-B12-003
- Severity: GAP
- Spec: STORIES_GAMETRACKER_FIXES.md GT-017
- Code Location: EnhancedInteractiveField.tsx:1319
- Spec Says: Undo button prominently placed with clear undo count indicator
- Code Says: Undo button exists (line 1319) but no prominence enhancement or count indicator found. No GT-017 fix comment
- Recommended Fix: Enhance undo button visibility and add count badge

---
### GAP-B12-005
- Severity: GAP
- Spec: STORIES_GAP_CLOSERS.md NEW-008
- Code Location: src/hooks/useSeasonData.ts, useRosterData.ts
- Spec Says: Data integration layer: useSeasonData, useRosterData, usePlayerData hooks for all route wrappers with loading + error states
- Code Says: Base hooks exist but usePlayerData not found. Not confirmed these hooks are used in route wrappers
- Recommended Fix: Complete data integration layer — add usePlayerData, wire hooks to route components

---
### GAP-B12-006
- Severity: GAP
- Spec: STORIES_GAP_CLOSERS.md NEW-010
- Code Location: GameTracker.tsx:2546,2624
- Spec Says: Player names clickable → opens PlayerCard modal with full stats (batter, due-up, pitcher)
- Code Says: Basic onClick handlers set selectedPlayer state, but no full PlayerCard modal opens. Due-up names not confirmed clickable
- Recommended Fix: Wire PlayerCard modal to player name clicks, add to due-up names

---
### GAP-B12-007
- Severity: GAP
- Spec: STORIES_GAP_CLOSERS.md NEW-013
- Code Location: relationshipIntegration.ts
- Spec Says: Relationship engine called at season start, affects morale, generates trade warnings
- Code Says: Integration wrapper exists with all functions exported, but no confirmed call from season initialization or morale calculation pipeline
- Recommended Fix: Wire relationshipEngine to season init and morale calculations

---
### GAP-B12-008
- Severity: GAP
- Spec: STORIES_GAP_CLOSERS.md NEW-015
- Code Location: narrativeIntegration.ts
- Spec Says: Beat reporter stories affect fan morale: calculateStoryMoraleImpact() called on story creation, fan morale updated, visible in UI
- Code Says: Functions exist (calculateStoryMoraleImpact exported) but no confirmed integration call in game flow connecting narrative output to fanMoraleEngine
- Recommended Fix: Wire narrative story creation to fanMoraleEngine.applyImpact()

---
### GAP-B12-009
- Severity: GAP
- Spec: STORIES_LEAGUE_BUILDER.md LB-015
- Code Location: LeagueBuilder.tsx
- Spec Says: League structure tree view with drag-drop team reassignment between divisions
- Code Says: No tree view visualization or drag-drop reassignment found
- Recommended Fix: Implement league structure tree view

---
### GAP-B12-010
- Severity: GAP
- Spec: STORIES_LEAGUE_BUILDER.md LB-025,037
- Code Location: LeagueBuilder.tsx
- Spec Says: CSV import for teams and players with preview, validation, error highlighting
- Code Says: No file upload or CSV import functionality found for either teams or players
- Recommended Fix: Implement CSV import for teams and players modules

---
### GAP-B12-011
- Severity: GAP
- Spec: STORIES_LEAGUE_BUILDER.md LB-036
- Code Location: LeagueBuilderPlayers.tsx
- Spec Says: Generate fictional players: count, target grade, position distribution, age range, traits
- Code Says: No "Generate Players" button or configuration modal found
- Recommended Fix: Implement player generation using GRADE_ALGORITHM reverse algorithm

---
### GAP-B12-012
- Severity: GAP
- Spec: STORIES_LEAGUE_BUILDER.md LB-054,055
- Code Location: LeagueBuilderRosters.tsx
- Spec Says: Depth chart UI and bench preferences (pinch hit/run/defensive sub priority lists)
- Code Says: Data fields exist in TeamRoster interface (depthChart, pinchHitOrder, etc.) but no UI to configure them
- Recommended Fix: Build depth chart and bench preferences UI screens

---
### GAP-B12-013
- Severity: GAP
- Spec: STORIES_LEAGUE_BUILDER.md LB-064,065,066
- Code Location: LeagueBuilderDraft.tsx
- Spec Says: Draft results recap, undo/redo picks, draft trade
- Code Says: Draft board and generation work but results view, pick undo, and draft trade are missing
- Recommended Fix: Implement draft results, undo stack, and pick trading

---
### GAP-B12-014
- Severity: GAP
- Spec: STORIES_LEAGUE_BUILDER.md SS-020-025
- Code Location: N/A (not implemented)
- Spec Says: Standalone Playoff Mode: entry point on main menu, abbreviated setup wizard (5 steps), seeding UI
- Code Says: No playoff mode route, setup wizard, or standalone playoff entry exists. /world-series is results view only
- Recommended Fix: Implement playoff mode entry and setup wizard

---
### GAP-B12-015
- Severity: GAP
- Spec: STORIES_PLAYOFFS.md S-PLY002
- Code Location: WorldSeries.tsx
- Spec Says: Playoff qualification: division winners auto-qualify, wildcards by best records, tiebreakers (H2H→div record→run diff)
- Code Says: Zero qualification logic. PlayoffTeam interface exists in playoffStorage but no qualification algorithm
- Recommended Fix: Implement playoff qualification with tiebreakers

---
### GAP-B12-016
- Severity: GAP
- Spec: STORIES_PLAYOFFS.md S-PLY006
- Code Location: WorldSeries.tsx
- Spec Says: Home field advantage: 2-3-2 (7-game), 2-2-1 (5-game), 2-1 (3-game) patterns
- Code Says: Zero home field logic. No getHomeTeam() function, no pattern configuration
- Recommended Fix: Implement home field patterns per spec

---
### GAP-B12-017
- Severity: GAP
- Spec: STORIES_PLAYOFFS.md S-PLY007
- Code Location: WorldSeries.tsx
- Spec Says: Start playoff game from bracket/series view, launches GameTracker with playoff context
- Code Says: No "Start Game" button. BracketView shows matchups but can't launch GameTracker for playoff games
- Recommended Fix: Wire Start Game button to GameTracker with playoff context

---
### GAP-B12-018
- Severity: GAP
- Spec: STORIES_PLAYOFFS.md S-PLY008
- Code Location: WorldSeries.tsx, playoffStorage.ts
- Spec Says: Clinch/elimination detection: visual indicators, clutch multiplier bonuses applied
- Code Says: Zero implementation. isClinch/isElimination fields exist in SeriesState but never calculated
- Recommended Fix: Implement detectClinch() and detectElimination() per spec

---
### GAP-B12-019
- Severity: GAP
- Spec: STORIES_PLAYOFFS.md S-PLY011
- Code Location: WorldSeries.tsx
- Spec Says: Series detail view: game-by-game results, pitchers, series leaders, upcoming game info
- Code Says: No series drill-down view. BracketView shows cards but no detailed series view
- Recommended Fix: Implement SeriesDetailView component

---
### GAP-B12-020
- Severity: GAP
- Spec: STORIES_PLAYOFFS.md S-PLY014,015,016,017,018
- Code Location: WorldSeries.tsx
- Spec Says: Playoff stats tracking, roster management, exhibition series, records, season end transition
- Code Says: Zero implementation for all 5 stories. playoffStorage has PlayoffPlayerStats interface but no aggregation
- Recommended Fix: Implement playoff stats pipeline, roster management, exhibition mode, records tracking, and season transition

---
### GAP-B12-021
- Severity: GAP
- Spec: STORIES_RATINGS_ADJUSTMENT.md S-EOS002
- Code Location: RatingsAdjustmentFlow.tsx:168
- Spec Says: Position detection using scalable thresholds: SP/RP/CP from starts/relief/saves, UTIL/BENCH from games
- Code Says: No detection logic — `detectedPosition: player.position` copies as-is. No threshold application
- Recommended Fix: Implement detectPosition() per EOS_RATINGS_ADJUSTMENT_SPEC.md

---
### GAP-B12-022
- Severity: GAP
- Spec: STORIES_RATINGS_ADJUSTMENT.md S-EOS003
- Code Location: RatingsAdjustmentFlow.tsx
- Spec Says: Peer pool assignment: min 6 players, merge small pools (CP↔RP, 1B↔3B, etc.)
- Code Says: Zero peer pool logic. All players displayed by team, not by position group
- Recommended Fix: Implement getComparisonPool() with merge logic

---
### GAP-B12-023
- Severity: GAP
- Spec: STORIES_RATINGS_ADJUSTMENT.md S-EOS004-005
- Code Location: RatingsAdjustmentFlow.tsx:172-181
- Spec Says: WAR/salary percentile calculation within peer pools
- Code Says: UI displays percentiles but values are `Math.floor(Math.random() * 100)` — mock random data
- Recommended Fix: Replace mock percentiles with real WAR/salary percentile calculations

---
### GAP-B12-024
- Severity: GAP
- Spec: STORIES_RATINGS_ADJUSTMENT.md S-EOS006
- Code Location: RatingsAdjustmentFlow.tsx:133
- Spec Says: Rating adjustment: delta = WAR percentile - salary percentile, asymmetric tier factors, WAR-to-rating mapping (bWAR→POW/CON, rWAR→SPD, fWAR→FLD/ARM, pWAR→VEL/JNK/ACC), ±10 cap
- Code Says: `netChange = Math.floor(Math.random() * 20) - 8` — random, not formula-based. No delta calculation, no factor application, no WAR-to-rating mapping
- Recommended Fix: Implement calculateRatingAdjustment() with asymmetric factors per spec

---
### GAP-B12-025
- Severity: GAP
- Spec: STORIES_RATINGS_ADJUSTMENT.md S-EOS010
- Code Location: RatingsAdjustmentFlow.tsx
- Spec Says: Salary adjustment System B: True Value from WAR, 50% gap adjustment, salary floor/ceiling by grade
- Code Says: salaryChange = netChange × 0.3 (arbitrary). No True Value calculation, no 50% gap formula, no floor/ceiling
- Recommended Fix: Implement calculateSalaryAdjustment() with True Value and grade-based bounds

---
## Summary
Total items: 25
DUPLICATE: GAP-B13-004→CRIT-B8-001
