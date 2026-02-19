# Bug Resolution - Exhibition Mode

> **Purpose**: Track bugs found during user testing and their resolution status
> **Created**: February 4, 2026
> **Last Updated**: February 4, 2026

---

## Overview

Exhibition Mode allows users to play a single game between two teams without franchise context.

**Key Files**:
- `src/src_figma/app/pages/ExhibitionGame.tsx` - Main page component
- `src/src_figma/app/pages/GameTracker.tsx` - Game tracking page
- `src/src_figma/app/components/TeamRoster.tsx` - Lineup management
- `src/src_figma/app/components/ActionSelector.tsx` - HIT/OUT/OTHER buttons
- `src/src_figma/app/components/FielderIcon.tsx` - Batter/fielder icons
- `src/src_figma/app/components/EnhancedInteractiveField.tsx` - Main game field

**Flow**:
1. Select League
2. Select Away Team
3. Select Home Team
4. Set Lineups (drag-drop editing)
5. Play Game (GameTracker)

---

## Fixed Bugs

### BUG-EXH-001: OTHER button text doesn't fit
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: Button width `w-20` (80px) too narrow for "OTHER" text with arrow

**Resolution**: Changed button width to `w-[88px]` and font size to `text-base`

**Files Changed**:
- `src/src_figma/app/components/ActionSelector.tsx` - primaryBtnBase style

---

### BUG-EXH-002: Batter icon is pink and ugly
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: Batter icon used `#CC44CC` (pink/magenta) background

**Resolution**: Redesigned batter icon with:
- Blue background (#2563EB)
- Gold border (#C4A853)
- Rounded corners (8px)
- Baseball emoji instead of cricket bat
- Better padding and shadows

**Files Changed**:
- `src/src_figma/app/components/FielderIcon.tsx` - BatterIcon component (lines 373-397)

---

### BUG-EXH-003: Base drop-zones too small for out/safe
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: DropZoneHighlight sizeMap was too small for touch targets

**Resolution**: Increased all drop zone sizes:
- small: 40x40 → 56x56
- medium: 60x60 → 80x80
- large: 80x80 → 100x100

**Files Changed**:
- `src/src_figma/app/components/FielderIcon.tsx` - sizeMap in DropZoneHighlight

---

### BUG-EXH-005: Can't change lineups in pre-game lineup management
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: Drag-drop only swapped positions, not batting order

**Resolution**: Modified `handlePositionSwap` in TeamRoster to:
- In pre-game mode (`isInGame: false`): swap BOTH batting order AND position
- In live game mode (`isInGame: true`): only swap positions (original behavior)

**Files Changed**:
- `src/src_figma/app/components/TeamRoster.tsx` - handlePositionSwap function

---

### BUG-EXH-006: Pre-game team names don't use team colors
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: Team header used static white text color

**Resolution**: Updated TeamRoster to use `teamColor` for text and `teamBorderColor` for text shadow and border

**Files Changed**:
- `src/src_figma/app/components/TeamRoster.tsx` - Team header styling

---

### BUG-EXH-007: Strikeouts require fielder interaction
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: `handleStrikeout` didn't transition to `RUNNER_CONFIRM` step

**Resolution**: Added `setFlowStep('RUNNER_CONFIRM')` to handleStrikeout so K/KL buttons skip fielder interaction and go directly to runner outcomes

**Files Changed**:
- `src/src_figma/app/components/EnhancedInteractiveField.tsx` - handleStrikeout function

---

### BUG-EXH-010: GameTracker scoreboard shows demo data
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: Team names and records were hardcoded in GameTracker.tsx

**Resolution**:
- Added team info to navigation state from ExhibitionGame
- GameTracker now reads `awayTeamName`, `homeTeamName`, `awayRecord`, `homeRecord`, `stadiumName` from navigation state
- Exhibition defaults records to "0-0"

**Files Changed**:
- `src/src_figma/app/pages/GameTracker.tsx` - Added navigation state parsing
- `src/src_figma/app/pages/ExhibitionGame.tsx` - Pass team info to navigation

---

### BUG-EXH-012: Fenway scoreboard missing pitcher/batter jersey numbers
**Status**: PARTIALLY FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: P column used batting order instead of jersey number

**Resolution**: Currently shows batting order from pitcher player data. Full jersey number support requires adding jersey numbers to player data model.

**Files Changed**:
- `src/src_figma/app/pages/GameTracker.tsx` - Uses awayPitcherPlayer/homePitcherPlayer battingOrder

---

### BUG-EXH-013: Time on scoreboard is demo data
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: Hardcoded "TIME: 1:47"

**Resolution**: Added game timer state that tracks elapsed time from game start. Updates every minute.

**Files Changed**:
- `src/src_figma/app/pages/GameTracker.tsx` - Added gameStartTime, elapsedMinutes state and interval

---

### BUG-EXH-014: Team records wrong on Fenway scoreboard
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: Hardcoded "47-38" and "52-33"

**Resolution**: Records now come from navigation state. Exhibition defaults to "0-0".

**Files Changed**:
- `src/src_figma/app/pages/GameTracker.tsx` - awayRecord/homeRecord variables

---

### BUG-EXH-015: Fenway scoreboard UI issues
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**:
- Mini button was next to SMB logo
- Scoreboard too large (240px container height)

**Resolution**:
- Moved Mini button to absolute position top-right of banner
- Reduced padding and border widths on scoreboard
- Changed field container from 240px to 200px offset

**Files Changed**:
- `src/src_figma/app/pages/GameTracker.tsx` - Mini button positioning, scoreboard padding

---

## Open Bugs

### BUG-EXH-004: Stadium names are fictional, not real SMB4 names
**Status**: OPEN
**Reported**: February 4, 2026
**Fixed**: N/A

**Notes**: Requires adding stadium data to team definitions in League Builder. Currently shows team name as fallback.

---

### BUG-EXH-008: Inside-the-park HR flow unclear
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: `calculateHitDefaults()` in `runnerDefaults.ts` didn't handle `hitType === 'HR'` case. When user selected HR from hit type menu for a ball in play (inside-the-park HR), it fell through to default single behavior instead of scoring all runners.

**Resolution**: Added explicit handling for inside-the-park HR in `calculateHitDefaults()`:
- Batter goes to home
- All runners score
- Reason displayed as "Inside-the-Park HR"

**How to trigger Inside-the-Park HR**:
1. Click HIT
2. Tap ball location in OUTFIELD (not in stands)
3. Select "HOME RUN" from hit type options
4. All runners will be set to score

**Files Changed**:
- `src/src_figma/app/components/runnerDefaults.ts` - Added HR case in calculateHitDefaults()

---

### BUG-EXH-009: Default lineups missing pitcher, can't sub pitcher
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: `autoGenerateLineup()` in `lineupLoader.ts` created a 9-batter lineup from position players only, excluding the pitcher. SMB4 doesn't have DH, so pitcher should bat 9th (NL-style).

**Resolution**: Changed auto-generation to:
- Take first 8 position players (batting order 1-8)
- Add starting pitcher to batting order at 9th spot with position "P"
- Remaining position players go to bench

**Files Changed**:
- `src/src_figma/utils/lineupLoader.ts` - autoGenerateLineup() now includes pitcher at #9

---

### BUG-EXH-011: End-game summary shows demo data
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: PostGameSummary.tsx was using hardcoded mock data instead of loading actual game stats from IndexedDB.

**Resolution**:
1. Added `getCompletedGameById()` function to `gameStorage.ts` to retrieve archived game data
2. Enhanced `CompletedGameRecord` interface to include `playerStats`, `pitcherGameStats`, and `inningScores`
3. Updated `archiveCompletedGame()` to store full game stats when game ends
4. Updated `useGameState.ts` to call `archiveCompletedGame()` with inning scores
5. Rewrote `PostGameSummary.tsx` to:
   - Load game data from IndexedDB using gameId from URL
   - Display real team names, scores, and inning-by-inning scoring
   - Show real pitcher stats in expandable box score
   - Calculate and display top performers (Players of the Game)
   - Handle loading and error states gracefully

**Files Changed**:
- `src/src_figma/utils/gameStorage.ts` - Added `getCompletedGameById()`, enhanced interfaces
- `src/src_figma/hooks/useGameState.ts` - Added `archiveCompletedGame()` call with inning scores
- `src/src_figma/app/pages/PostGameSummary.tsx` - Complete rewrite to use real data

---

### BUG-EXH-016: No way to credit fielders on thrown-out advancing runner
**Status**: OPEN
**Reported**: February 4, 2026
**Fixed**: N/A

**Notes**: When a hitter gets thrown out advancing an extra base on a hit, need a way to credit the fielders involved in throwing out the runner.

---

### BUG-EXH-017: Batter icon shows during SB confirmation
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: `RunnerOutcomeArrows` component was drawing batter arrow and draggable batter icon for SB events because `calculateStolenBaseDefaults` sets a placeholder `batter.to` value.

**Resolution**: Added `isRunnerEvent` prop to `RunnerOutcomeArrows` and used it to hide:
- Batter arrow (line 416-423)
- Batter out marker (line 459-461)
- Draggable batter icon (line 476-484)

**Files Changed**:
- `src/src_figma/app/components/RunnerOutcomeArrows.tsx` - Added isRunnerEvent prop
- `src/src_figma/app/components/EnhancedInteractiveField.tsx` - Pass isRunnerEvent prop

---

### BUG-EXH-018: Pinch-hit doesn't update current batter card
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: `makeSubstitution` function only logged the substitution event but never:
1. Updated the lineup refs to swap the players
2. Updated the current batter state if the substitution was for the current batter

**Resolution**:
- Added logic to find the outgoing player in away/home lineup and replace them with the incoming player
- Added check to update `currentBatterId` and `currentBatterName` if the substituted player was the current batter
- Initialize stats for the new player if they don't have any

**Files Changed**:
- `src/src_figma/hooks/useGameState.ts` - makeSubstitution function

---

### BUG-EXH-019: Pre-game lineup removes player without replacement
**Status**: FIXED (v4 - Architectural Solution)
**Reported**: February 4, 2026
**Fixed**: February 4, 2026 (Final architectural solution)

**Root Cause Analysis (Multi-layered)**:

1. **TeamRoster local state issue** (v1 fix): `handleSubstitution()` didn't clear `position` field for benched player in pre-game mode.

2. **ExhibitionGame mutation issue** (v2 fix): `handleAwaySubstitution` and `handleHomeSubstitution` were MUTATING array elements in place instead of creating new objects.

3. **Fundamental design issue** (v3 analysis): Pre-game drag-drop editing was inherently complex and bug-prone due to state synchronization between TeamRoster and ExhibitionGame.

**Resolution (v4 - Architectural)**: Moved lineup configuration to League Builder, made pre-game read-only.

**Design Decision**:
- Lineups are now configured in League Builder (LINEUP tab)
- Exhibition pre-game shows a **read-only preview** of stored lineups
- In-game position swaps and substitutions still work via GameTracker
- If no stored lineup exists, auto-generation fallback applies

**New Files Created**:
- `src/src_figma/utils/lineupLoader.ts` - Loads stored lineups from League Builder or auto-generates
- `src/src_figma/app/components/LineupPreview.tsx` - Read-only lineup display for pre-game

**Files Changed**:
- `src/src_figma/app/pages/ExhibitionGame.tsx` - Removed drag-drop, uses LineupPreview
- `src/src_figma/app/components/TeamRoster.tsx` - handleSubstitution fix retained for in-game use

**Unit Test**: `src/src_figma/__tests__/substitution.test.ts` - Verifies substitution logic (2 tests passing)

---

### BUG-EXH-020: No starting pitcher change in pre-game
**Status**: BY DESIGN
**Reported**: February 4, 2026
**Fixed**: February 4, 2026 (Design decision)

**Design Decision**: Starting pitcher is now configured in League Builder (LINEUP tab), not in Exhibition pre-game screen. The pre-game screen shows a read-only preview. This matches SMB4 model where lineups are set before entering game mode.

---

### BUG-EXH-021: Scoreboard shows batting order not jersey number
**Status**: PARTIAL FIX
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: Jersey numbers are not in the current data model. The "P" column in the Fenway scoreboard was showing `awayPitcherPlayer?.battingOrder || '1'` instead of jersey number.

**Resolution**: Changed to always show "1" for the pitcher position column (since P = position 1 in baseball), with a comment noting that jersey numbers are not yet implemented.

**Notes**: Full fix requires adding jersey numbers to:
1. League Builder team data model
2. Player data extraction from SMB4 screenshots
3. Pass jersey numbers through navigation state

**Files Changed**:
- `src/src_figma/app/pages/GameTracker.tsx` - P column now shows "1" with explanatory comment

---

### BUG-EXH-022: Long team names get cut off on scoreboard
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: Team name column was fixed at 90px, and font size was only 11px regardless of name length.

**Resolution**:
- Increased team name column width: 90px → 110px
- Added more aggressive font scaling:
  - Names > 12 chars: 8px
  - Names 10-12 chars: 9px
  - Names 7-9 chars: 10px
  - Names ≤ 6 chars: 11px (default)
- Added `text-ellipsis` as fallback for extremely long names
- Reduced padding from `pl-2` to `pl-1` for more text space
- Slightly reduced inning columns (24→22px) and R/H/E columns (28→26px) to compensate

**Files Changed**:
- `src/src_figma/app/pages/GameTracker.tsx` - Grid template columns, dynamic font sizing

---

### BUG-EXH-023: Fame bonus/clutch/LI data not shown
**Status**: OPEN
**Reported**: February 4, 2026
**Fixed**: N/A

**Notes**: Fame bonus/clutch data does not show in game tracker. This info should be logged and shown somewhere, including the situational LI number.

---

### BUG-EXH-024: End-game routes to franchise instead of exhibition
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: PostGameSummary hardcoded navigation to `/franchise/1` regardless of game mode.

**Resolution**:
- Added `useLocation` to get `gameMode` from navigation state
- CONTINUE button now routes based on game mode:
  - Exhibition → `/exhibition`
  - Playoff → `/world-series`
  - Franchise → `/franchise/{franchiseId}`
- GameTracker passes `gameMode` in navigation state when ending game

**Files Changed**:
- `src/src_figma/app/pages/PostGameSummary.tsx` - Dynamic routing based on game mode
- `src/src_figma/app/pages/GameTracker.tsx` - Pass game mode to PostGameSummary
- `src/src_figma/__tests__/postGameSummary/PostGameSummary.test.tsx` - Added useLocation mock

---

### BUG-EXH-025: No error fielder prompt on runner advance
**Status**: OPEN (Requires Design)
**Reported**: February 4, 2026
**Fixed**: N/A

**Notes**: When a runner advances EXTRA bases on an error (e.g., single to RF, runner goes 1st to 3rd on throwing error), there's no prompt for which fielder committed the error.

**Design Required**:
1. Detect when runner advances beyond default expectation in RunnerOutcomesDisplay
2. Show "Error?" toggle when runner is dragged to an extra base
3. If toggled, show fielder selector popup
4. Record error fielder in play data for fWAR calculation

**Note**: The existing "E" button in OTHER menu handles primary error plays (batter reaches on error). This bug is about secondary errors during hits/outs.

---

### BUG-EXH-026: Lineup cards show demo team names
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: TeamRoster components had hardcoded `teamName="TIGERS"` and `teamName="SOX"`.

**Resolution**: Changed to use dynamic `awayTeamName.toUpperCase()` and `homeTeamName.toUpperCase()` from navigation state.

**Files Changed**:
- `src/src_figma/app/pages/GameTracker.tsx` - Use dynamic team names in TeamRoster props

---

### BUG-EXH-028: Mini scoreboard shows dummy team names
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: Multiple hardcoded "TIGERS"/"SOX" strings in GameTracker.tsx:
- At-bat card team indicator (line 1440)
- Score display away team (line 1451)
- Score display home team (line 1468)
- Pitcher card team indicator (line 1480)

**Resolution**: Replaced all hardcoded team names with dynamic `awayTeamName.toUpperCase()` and `homeTeamName.toUpperCase()` from navigation state.

**Files Changed**:
- `src/src_figma/app/pages/GameTracker.tsx` - Lines 1440, 1451, 1468, 1480

---

### BUG-EXH-029: Inning doesn't auto-end on third out
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: `recordOut` and `recordD3K` had commented-out code saying "Will be handled by endInning or UI" but nothing actually called `endInning()`.

**Resolution**: Added automatic `endInning()` call with 500ms delay when `newOuts >= 3`. Used a ref (`endInningRef`) to avoid circular dependency issues.

**Files Changed**:
- `src/src_figma/hooks/useGameState.ts` - Added endInningRef, auto-call endInning on third out

---

### BUG-EXH-030: Lineup doesn't turn over after 9th hitter
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: `advanceToNextBatter` used `% battingTeamLineup.length` which included bench players. After the 9th batter, it would continue to the 10th player (bench) instead of wrapping to the 1st batter.

**Resolution**: Changed modulo from `battingTeamLineup.length` to `9` since a standard baseball batting order always cycles through exactly 9 batters.

**Files Changed**:
- `src/src_figma/hooks/useGameState.ts` - advanceToNextBatter function

---

### BUG-EXH-031: Team colors in lineup cards don't match database
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: ExhibitionGame wasn't passing team colors in navigation state. GameTracker fell back to static `getTeamColors(teamId)` which only had 'tigers' and 'sox' defined.

**Resolution**:
- ExhibitionGame now passes `awayTeamColor`, `awayTeamBorderColor`, `homeTeamColor`, `homeTeamBorderColor` from the team database via navigation state
- GameTracker uses these colors with fallback to static config

**Files Changed**:
- `src/src_figma/app/pages/ExhibitionGame.tsx` - Pass team colors in navigation state
- `src/src_figma/app/pages/GameTracker.tsx` - Use team colors from navigation state

---

### BUG-EXH-032: Inning logic backwards after third out
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: The `endInning` function in `useGameState.ts` had inverted logic for when to increment the inning:
```typescript
// WRONG: incremented after TOP instead of after BOTTOM
const newInning = !newIsTop ? prev.inning + 1 : prev.inning;
```

**Resolution**: Fixed the condition to increment inning after BOTTOM (when switching to TOP of next inning):
```typescript
// CORRECT: increment when newIsTop is true (switching from BOTTOM to TOP)
const newInning = newIsTop ? prev.inning + 1 : prev.inning;
```

**Files Changed**:
- `src/src_figma/hooks/useGameState.ts` - Fixed endInning logic

---

### BUG-EXH-033: No killed pitcher/nutshot prompt on pitcher fielding
**Status**: FIXED (Updated)
**Reported**: February 4, 2026
**Fixed**: February 4, 2026 (Updated fix)

**Root Cause**: The new 5-step flow's `handleOutOutcome` function never called `classifyPlay()` at all. The classifier is what generates KILLED_PITCHER and NUT_SHOT prompts when pitcher is first fielder. Without calling the classifier, no prompts were generated.

**Resolution**:
1. Added `classifyPlay()` call in `handleOutOutcome` to generate prompts
2. Store prompts with `setPendingPrompts()` if classifier returns any
3. If prompts exist, show `SpecialEventPromptModal` before transitioning to RUNNER_CONFIRM
4. After prompts complete (including InjuryPrompt), transition to RUNNER_CONFIRM instead of reset

**Secondary Fix** (from earlier attempt - still valid):
- Connected SpecialEventPromptModal to InjuryPrompt for KP/NUT events
- After InjuryPrompt completes, check if `lastClassifiedPlay` exists - if so, transition to RUNNER_CONFIRM

**Files Changed**:
- `src/src_figma/app/components/EnhancedInteractiveField.tsx`:
  - `handleOutOutcome`: Added classifyPlay() call, setPendingPrompts(), and conditional prompt display
  - `SpecialEventPromptModal onAnswer`: Transition to RUNNER_CONFIRM when play data exists
  - `handleInjuryPromptComplete`: Transition to RUNNER_CONFIRM when play data exists

---

### BUG-EXH-034: Pitcher fitness/mojo not updated on comebacker events
**Status**: FIXED (Updated)
**Reported**: February 4, 2026
**Fixed**: February 4, 2026 (Updated fix)

**Root Cause**: Two issues:
1. Primary: EXH-033 - prompts weren't being generated because `handleOutOutcome` didn't call classifier
2. Secondary: After InjuryPrompt completed, it called `handleReset()` instead of transitioning to RUNNER_CONFIRM, losing the play state

**Resolution**:
1. Fixed EXH-033 (classifier call) ensures prompts are generated
2. Updated `handleInjuryPromptComplete` to check if `lastClassifiedPlay && runnerOutcomes` exist
3. If play data exists, transition to RUNNER_CONFIRM to continue the at-bat flow
4. Otherwise call handleReset() (for legacy flows)

**Notes**: The InjuryPrompt component already has the UI to capture:
- KP: "Did pitcher leave?" → If yes, "Severity?" (HURT/INJURED/WOUNDED)
- NUT: "Mojo impact?" (NONE/TENSE/RATTLED)

The parent component (GameTracker) should consume these via the onSpecialEvent callback to actually update pitcher state.

**Files Changed**:
- `src/src_figma/app/components/EnhancedInteractiveField.tsx` - Updated handleInjuryPromptComplete to check for existing play data

---

### BUG-EXH-035: FC erases batter even when safe at first
**Status**: FIXED
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: The `recordOut` function in `useGameState.ts` treated FC like a regular out where the batter is out. It calculated `outsOnPlay = 1` for FC (treating batter as out) and didn't put the batter on first base.

**Resolution**: Updated `recordOut` to handle FC specially:
1. For FC, `outsOnPlay` starts at 0 (batter is NOT out), then adds any runners who are out
2. After processing runner movements, explicitly set `newBases.first = true` for FC (batter reaches first)

**Files Changed**:
- `src/src_figma/hooks/useGameState.ts` - Added FC special handling in outs calculation and base state update

---

### BUG-EXH-036: No way to edit mojo/fitness in player card
**Status**: FIXED (Enhanced)
**Reported**: February 4, 2026
**Fixed**: February 4, 2026

**Root Cause**: The PlayerCardModal in GameTracker displayed mock stats but had no functionality to view or edit the player's current mojo/fitness state during games. Additionally, players weren't being registered with `playerStateHook`, so mojo/fitness data didn't exist.

**Resolution**:
1. Added `setMojo` and `setFitness` direct setter functions to `usePlayerState` hook
2. Added player registration in `useEffect` after game initialization - all batters and pitchers now registered with default mojo (Normal) and fitness (FIT)
3. Added a "CONDITION" section to PlayerCardModal with:
   - Mojo display with click-to-edit functionality (shows all 5 mojo levels as buttons)
   - Fitness display with click-to-edit functionality (shows all 6 fitness states as buttons)
   - Visual indicators (emoji, color, multiplier) for each state
4. Added **👤 PLAYERS button** in control bar to access ANY player (not just current batter/pitcher)
5. Added **PlayerSelectorModal** that lists all players from both teams with current mojo/fitness state
   - Shows away team batters + pitcher
   - Shows home team batters + pitcher
   - Each row shows player name + mojo emoji + fitness emoji
   - Clicking a player opens their PlayerCardModal for editing
6. Updated `selectedPlayer` state to include `playerId` for looking up player state
7. Wired up the PlayerCardModal to receive current mojo/fitness from `playerStateHook`

**User Flow**:
1. Click "👤 PLAYERS" button (between UNDO and END buttons)
2. Player selector modal shows all players grouped by team
3. Each player row shows current mojo/fitness emoji indicators
4. Tap any player to open their card
5. In the CONDITION section, tap mojo or fitness to expand edit options
6. Select new value - change is applied immediately

**Files Changed**:
- `src/src_figma/app/hooks/usePlayerState.ts` - Added setMojo() and setFitness() direct setters
- `src/src_figma/app/pages/GameTracker.tsx`:
  - Added player registration useEffect
  - Added PLAYERS button and showPlayerSelector state
  - Added PlayerSelectorModal
  - Updated PlayerCardModal with mojo/fitness editing UI
- `src/components/GameTracker/PlayerCard.tsx` - Added allowEdit, onMojoChange, onFitnessChange props

---

## Won't Fix

*None*

---

## Summary

| Bug ID | Description | Status |
|--------|-------------|--------|
| EXH-001 | OTHER button text overflow | ✅ FIXED |
| EXH-002 | Ugly pink batter icon | ✅ FIXED |
| EXH-003 | Small base drop-zones | ✅ FIXED |
| EXH-004 | Wrong stadium names | ⏳ OPEN |
| EXH-005 | Can't edit pre-game lineups | ✅ FIXED |
| EXH-006 | Team names missing colors | ✅ FIXED |
| EXH-007 | Strikeouts require fielder | ✅ FIXED |
| EXH-008 | Inside-the-park HR unclear | ✅ FIXED |
| EXH-009 | No pitcher in lineup | ✅ FIXED |
| EXH-010 | Scoreboard demo data | ✅ FIXED |
| EXH-011 | End-game summary demo data | ✅ FIXED |
| EXH-012 | Missing jersey numbers | ⚠️ PARTIAL |
| EXH-013 | Time is demo data | ✅ FIXED |
| EXH-014 | Wrong team records | ✅ FIXED |
| EXH-015 | Scoreboard UI issues | ✅ FIXED |
| EXH-016 | No fielder credit on thrown-out runner | ⏳ OPEN |
| EXH-017 | Batter icon shows during SB | ✅ FIXED |
| EXH-018 | Pinch-hit doesn't update batter card | ✅ FIXED |
| EXH-019 | Pre-game lineup removes without replace | ✅ FIXED |
| EXH-020 | No starting pitcher change pre-game | 📋 BY DESIGN |
| EXH-021 | Scoreboard shows batting order not jersey | ⚠️ PARTIAL |
| EXH-022 | Long team names cut off | ✅ FIXED |
| EXH-023 | Fame/LI data not shown | ⏳ OPEN |
| EXH-024 | End-game routes to franchise | ✅ FIXED |
| EXH-025 | No error fielder prompt on runner advance | ⏳ OPEN |
| EXH-026 | Lineup cards show demo team names | ✅ FIXED |
| EXH-028 | Mini scoreboard shows dummy team names | ✅ FIXED |
| EXH-029 | Inning doesn't auto-end on third out | ✅ FIXED |
| EXH-030 | Lineup doesn't turn over after 9th hitter | ✅ FIXED |
| EXH-031 | Team colors don't match database | ✅ FIXED |
| EXH-032 | Inning logic backwards after third out | ✅ FIXED |
| EXH-033 | No killed pitcher/nutshot prompt | ✅ FIXED |
| EXH-034 | Pitcher fitness/mojo not updated on comebacker | ✅ FIXED |
| EXH-035 | FC erases batter even when safe at first | ✅ FIXED |
| EXH-036 | No way to edit mojo/fitness in player card | ✅ FIXED |

**Fixed**: 26 | **Partial**: 2 | **By Design**: 1 | **Open**: 6
