# Tier 3 Build Plan — Missing Features

**Date**: 2026-02-13
**Baseline**: Build PASS, 5653 tests / 0 failures / 134 files

---

## Items & Classifications

### T3-01 [FR] Pre-game lineup screen for franchise games — LARGE (MVP)
**Report:** Exhibition mode has lineup/starter selection. Franchise mode goes straight
to game with no chance to pick starter or reorder lineup.

**MVP Scope:**
- Intercept `handlePlayGame()` in FranchiseHome to show a pre-game modal/screen instead of navigating directly
- Show both teams' lineups using existing `LineupPreview` component (read-only, same as exhibition)
- Add starting pitcher dropdown to pick from rotation
- "START GAME" button proceeds to GameTracker with selected starter
- NO lineup reordering in MVP (that's League Builder's job)

**Files to modify:**
- `src/src_figma/app/pages/FranchiseHome.tsx` — intercept handlePlayGame, add pre-game state
- May create a small `PreGameModal` component or inline it

**Approach:** Add a `preGameState` to FranchiseHome. When user clicks "Play Game", load rosters and show the pre-game view instead of navigating. User picks starters, confirms, then navigate.

---

### T3-02 [FR] View Roster button does nothing in season setup — SMALL
**Report:** Button exists but onClick is dead/no-op.

**Scope:** Add `onClick={() => navigate('/league-builder/rosters')}` to the button.

**Files to modify:**
- `src/src_figma/app/pages/FranchiseSetup.tsx` line 1118

---

### T3-03 [FR] No way to remove games from schedule — MEDIUM
**Report:** User wants to manually manage schedule. Currently no way to delete scheduled games.

**Scope:**
- Add `onDeleteGame` callback prop to `ScheduleContent`
- Add a delete/X button to each SCHEDULED game card (not completed games)
- Wire `scheduleData.deleteGame(gameId)` in FranchiseHome
- Add confirmation before delete

**Files to modify:**
- `src/src_figma/app/components/ScheduleContent.tsx` — add delete button + prop
- `src/src_figma/app/pages/FranchiseHome.tsx` — pass deleteGame handler

---

## Execution Order

| Phase | Item | Size | Est. Lines |
|-------|------|------|-----------|
| 1 | T3-02 | SMALL | ~5 |
| 2 | T3-03 | MEDIUM | ~40 |
| 3 | T3-01 | LARGE (MVP) | ~150 |

Start with smallest, work up.
