# GameTracker Bug Report

> **Created**: January 25, 2026
> **Source**: Manual testing by user
> **Status**: Active bugs to fix

---

## Critical Bugs (Break Core Functionality)

### BUG-001: Pinch Hitter Position Assignment Broken
**Description**: When a pinch hitter comes in but will play a different position than the player they replaced, there's no way to clarify that. The subbed-out batter incorrectly became the DH.

**Expected**: PH modal should ask what position the new player will field, and properly reassign defensive positions.

**Location**: `src/components/GameTracker/PinchHitterModal.tsx`

**Fix Required**:
1. Add position selection to PH modal
2. Validate that all 9 defensive positions are filled
3. Handle DH rules properly (can't move DH to field without losing DH)

---

### BUG-002: Defensive Sub Creates Duplicate Positions
**Description**: Defensive substitution led to two players playing the same position (two 1B) with an empty fielding slot (no LF).

**Expected**: Defensive sub should validate that exactly one player is at each position, no duplicates, no gaps.

**Location**: `src/components/GameTracker/DefensiveSubModal.tsx`

**Fix Required**:
1. Add position validation before allowing sub
2. Show warning if position conflict detected
3. Require resolution of all position assignments

---

### BUG-003: GO with Runner Out at 2B Should Auto-Correct to DP
**Description**: When user inputs GO and says runner on first is out at 2nd, the app shows two outs but records it as a groundout instead of auto-correcting to a double-play.

**Expected**: If GO + runner out at base = 2 outs recorded, should auto-correct to DP.

**Location**: `src/components/GameTracker/AtBatFlow.tsx`

**Fix Required**:
1. In `checkAutoCorrection()`, add logic: if result === 'GO' && runner outcome is OUT && total outs increase by 2, auto-correct to 'DP'
2. Show feedback message like existing FO→SF auto-correction

---

### BUG-004: WAR Leaderboards Not Populating
**Description**: No stats (WAR leaderboards or otherwise) populate in GameTracker.

**Expected**: WAR leaderboards should show current season data.

**Location**: `src/components/GameTracker/index.tsx`, `WARDisplay.tsx`

**Investigation Needed**: Check if WARPanel is rendered, check if useWARCalculations hook returns data.

---

### BUG-005: Season Summary Loading Forever
**Description**: Season Summary modal says "loading" but nothing shows up.

**Expected**: Should display season statistics or show "no data" message.

**Location**: `src/components/GameTracker/SeasonSummary.tsx`

**Investigation Needed**: Check data loading, check for errors in console.

---

## High Priority Bugs (UX Issues)

### BUG-006: Exit Type Requires Double Entry
**Description**: App doesn't auto-proceed after user selects exit type. User must click exit type button to launch popup, then click it again inside the popup.

**Expected**: When user clicks result button (e.g., "1B"), the modal should open. Exit type selection inside modal should be the only place to select it.

**Location**: `src/components/GameTracker/AtBatFlow.tsx`

**Fix Required**: Review flow - exit type selection should only happen once in the modal.

---

### BUG-007: Player Names Not Clickable ✅ FIXED
**Description**: Player names in the game tracker (current batter, due up, etc.) are not clickable.

**Expected**: Clicking a player name should open PlayerCard with their stats.

**Location**: `src/components/GameTracker/index.tsx`

**Status**: FIXED — Current batter (line 3001-3012), due up players (line 2980-2992), and pitcher name (line 2926-2932) all have onClick handlers that open PlayerCard modal.

---

### BUG-008: Team Names Not Shown in Scoreboard ✅ FIXED
**Description**: Team names are not populated in scoreboard in GameTracker.

**Expected**: Should show "Sirloins vs Beewolves" or similar.

**Location**: `src/components/GameTracker/Scoreboard.tsx`

**Status**: FIXED — Team names are loaded from `getTeam()` database lookup (index.tsx:376-377) and passed as `awayName`/`homeName` props to Scoreboard.

---

### BUG-009: No Lineup Access in GameTracker
**Description**: There's no way to access lineups in GameTracker, and thus no way to update player mojo and/or fitness mid-game.

**Expected**: Should have a "View Lineup" or "Roster" button that shows current lineup with mojo/fitness status.

**Location**: `src/components/GameTracker/index.tsx`

**Fix Required**:
1. Add lineup view modal/panel
2. Display mojo/fitness indicators
3. Allow mojo/fitness updates (or at least viewing)

---

### BUG-010: No Player Morale Superscripts
**Description**: No player morale numbers displayed as superscripts next to player names.

**Expected**: Per KBL_XHD_TRACKER_MASTER_SPEC_v3.md, player names should display morale as a colored superscript number (0-99 scale). Example: **"Mike Trout⁷⁸"** in green.

The spec defines:
```javascript
function getMoraleDisplay(player) {
  const morale = player.morale ?? 50;
  const superscript = toSuperscript(morale);  // Convert 78 → ⁷⁸
  const color = getMoraleColor(morale);       // Color based on morale level
  return { superscript, color, value: morale };
}
```

**Note**: This is DISTINCT from Mojo (-2 to +2). Morale is a 0-99 scale affected by:
- Playing time, team success, awards, trades, salary
- Jersey sales (high sales = happier player)
- Personality (each has a baseline: JOLLY=60, TOUGH=45, etc.)
- Decays toward baseline over time

**Location**: `src/components/GameTracker/index.tsx`

**Fix Required**:
1. Add morale field to player data model
2. Implement `toSuperscript()` function to convert numbers to Unicode superscripts
3. Implement `getMoraleColor()` for color coding
4. Display morale superscript next to player names in batter display, due up list, etc.

---

## Medium Priority Bugs (Validation Issues)

### BUG-011: HR Distance Allows Invalid Values ✅ FIXED
**Description**: It's possible to enter a HR distance that's less than wall distance (e.g., 200 feet).

**Expected**: Should validate HR distance is realistic (minimum 250-300 ft depending on direction).

**Location**: `src/components/GameTracker/AtBatFlow.tsx`

**Status**: FIXED — Added min=250/max=550 validation. Input rejects out-of-range values, shows red error messages, and `canProceedToFielding()` blocks submission with invalid distances.

---

### BUG-012: No Stadium Association
**Description**: There is no stadium associated with GameTracker games.

**Expected**: Should track which stadium the game is in (affects park factors, HR distances).

**Location**: `src/components/GameTracker/index.tsx`

**Fix Required**:
1. Add stadium selection to game setup
2. Use stadium data for HR distance validation
3. Enable park factor tracking

---

### BUG-013: Impossible Events Not Greyed Out
**Description**: Some impossible events are clickable (e.g., Steal, Passed Ball when no runners on base). Should be greyed out like SAC.

**Expected**: Event buttons should be disabled when not applicable to current game state.

**Location**: `src/components/GameTracker/index.tsx` (event buttons section)

**Fix Required**:
1. Add `disabled` state for Steal, CS, WP, PB, Pickoff, Balk when no runners
2. Add visual indication (grey out like SF/SAC)
3. Prevent clicks on disabled buttons

---

### BUG-014: Special Plays Not Logged
**Description**: Selecting special plays (Diving, Robbery Attempt, etc.) doesn't get logged in activity log, fame events, or anywhere visible.

**Expected**: Special plays should:
1. Appear in activity log ("Diving catch by CF")
2. Trigger fame events where appropriate (Web Gem)
3. Be stored for fWAR calculation

**Location**: `src/components/GameTracker/index.tsx`, `AtBatFlow.tsx`

**Fix Required**:
1. Include special play in activity log message
2. Connect to fame detection for Web Gem/Robbery triggers
3. Ensure fielding data persists with special play type

---

### BUG-015: HR Fielding Attempt Auto-Selected "Clean"
**Description**: For a HR with no fielding attempt, the fielding attempt is auto-selected as "Clean".

**Expected**: HRs over the fence should either:
1. Not show fielding attempt options at all, OR
2. Default to "No Attempt" / "Over Fence" option

**Location**: `src/components/GameTracker/AtBatFlow.tsx`

**Fix Required**:
1. Don't show fielding attempt for HRs
2. OR add "Over Fence" option for HRs that clears the wall
3. Only show Robbery Attempt for wall-scraper HRs

---

## Summary (Updated Feb 12, 2026)

| Priority | Count | Fixed | Remaining |
|----------|-------|-------|-----------|
| Critical | 5 | 5 | 0 |
| High | 5 | 4 | 1 |
| Medium | 5 | 2 | 3 |
| **Total** | **15** | **11** | **4** |

---

## Fixed Bugs

| Bug | Description | Fix | Date |
|-----|-------------|-----|------|
| BUG-001 | PH position assignment broken | Added position validation in PinchHitterModal | Jan 25 |
| BUG-002 | Defensive sub creates duplicates | Added validateDefensiveAlignment() in DefensiveSubModal | Jan 25 |
| BUG-003 | GO should auto-correct to DP | Added auto-correction in checkAutoCorrection() | Jan 25 |
| BUG-004 | WAR leaderboards not populating | Added getOrCreateSeason() call on game start | Jan 25 |
| BUG-005 | Season Summary loading forever | Fixed seasonId default, ensured season creation | Jan 25 |
| BUG-007 | Player names not clickable | onClick handlers on batter, due up, pitcher | Jan 27 |
| BUG-008 | Team names not shown in scoreboard | getTeam() wired to Scoreboard props | Jan 27 |
| BUG-010 | No player morale superscripts | Created PlayerNameWithMorale component | Jan 25 |
| BUG-011 | HR distance allows invalid values | min=250/max=550 validation + red error messages | Jan 27 |
| BUG-013 | Impossible events not greyed out | Added hasRunners check for event buttons | Jan 25 |
| BUG-015 | HR fielding shows "Clean" | Added HR-specific options (Over Fence, etc.) | Jan 25 |

---

## Remaining Bugs

### High Priority (1 remaining)
- BUG-006: Exit type requires double entry (UX flow review needed)

### Medium Priority (3 remaining)
- BUG-009: No lineup access in GameTracker (new modal component needed)
- BUG-012: No stadium association (game setup enhancement)
- BUG-014: Special plays not logged (fame/activity log integration)

---

## Separately Tracked Issues (from IMPLEMENTATION_PLAN.md)

These are NOT from the original Jan 25 bug list but are tracked elsewhere:

| Item | Description | Status | Location |
|------|-------------|--------|----------|
| Mojo/Fitness scoreboard | usePlayerState wired but no scoreboard display | TODO | IMPLEMENTATION_PLAN.md |
| Fame events during game | Popup IS wired (GameTracker.tsx:2016-2040) — needs live verification | LIKELY FIXED | IMPLEMENTATION_PLAN.md |
| PostGameSummary gaps | Errors hardcoded to 0; no batting box score | TODO | PostGameSummary.tsx |
| Inning summary | No inning-end summary in Figma layer | NOT BUILT | IMPLEMENTATION_PLAN.md |

---

*Updated Feb 12, 2026. Next: update IMPLEMENTATION_PLAN.md bug numbers to avoid confusion with this file.*
