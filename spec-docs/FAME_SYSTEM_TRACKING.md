# Fame System Implementation Tracking

> **Last Updated**: 2026-01-22
> **Status**: Phase 1 Complete, Bugs Fixed

---

## Overview

The Fame system tracks memorable moments (Fame Bonuses ⭐) and embarrassing moments (Fame Boners 💀) for players during games. This document tracks implementation status, known bugs, and remaining work.

---

## Implementation Status

### ✅ COMPLETE

| Component | File | Notes |
|-----------|------|-------|
| FameEventType (67 types) | `src/types/game.ts` | All event types defined |
| FAME_VALUES mapping | `src/types/game.ts` | Point values for all events |
| FAME_EVENT_LABELS mapping | `src/types/game.ts` | Display labels for UI |
| FAME_TARGET mapping | `src/types/game.ts` | player/team/pitcher/fielder attribution |
| useFameDetection hook | `src/hooks/useFameDetection.ts` | Base detection infrastructure |
| FameEventModal | `src/components/GameTracker/FameEventModal.tsx` | Manual event entry UI |
| QuickFameButtons | `src/components/GameTracker/FameEventModal.tsx` | Quick-access common events |
| FamePanel | `src/components/GameTracker/FameDisplay.tsx` | In-game Fame display |
| FameToastContainer | `src/components/GameTracker/FameDisplay.tsx` | Toast notifications |
| EndGameFameSummary | `src/components/GameTracker/FameDisplay.tsx` | Post-game summary modal |
| At-bat detection wiring | `src/components/GameTracker/index.tsx` | Auto-detection after each AB |
| Game-end auto-detection | `src/components/GameTracker/index.tsx` | Infers game end from score/inning |
| FAN_HAPPINESS_SPEC.md | `spec-docs/FAN_HAPPINESS_SPEC.md` | Documentation updated |

---

## 🐛 BUGS

### BUG-001: LEADOFF_HR Never Triggers
- **Status**: ✅ NOT A BUG
- **Severity**: ~~Critical~~
- **Location**: `src/components/GameTracker/index.tsx` ~929, ~965
- **Description**: Initially thought `atBatCount` increment timing was wrong
- **Resolution**: Code inspection confirmed logic is correct - state read (`atBatCount === 0`) happens before the increment, so first at-bat correctly sees count=0
- **Fixed**: 2026-01-22

### BUG-002: Back-to-Back HR Detection Orphaned
- **Status**: ✅ FIXED
- **Severity**: ~~High~~
- **Location**: `src/hooks/useFameDetection.ts`
- **Description**: `detectBackToBackHR` function was exported but never called in `checkForFameEvents`
- **Resolution**: Added call to `detectBackToBackHR` within the HR detection section of `checkForFameEvents`, using `context.lastHRBatterId` to check if previous batter also hit HR. Added function to dependency array.
- **Fixed**: 2026-01-22

### BUG-003: Comeback Detection Non-Functional
- **Status**: ✅ FIXED
- **Severity**: ~~High~~
- **Location**: `src/components/GameTracker/index.tsx`
- **Description**: `maxDeficitOvercome` state was unused, value stayed at 0
- **Resolution**: Replaced single `maxDeficitOvercome` with per-team tracking (`maxDeficitAway`, `maxDeficitHome`). Updated `scoreRun` function to calculate and track deficits when teams fall behind. Updated `handleEndGame` to use correct per-team deficit values.
- **Fixed**: 2026-01-22

### BUG-004: Perfect Game Checks Wrong Stat
- **Status**: ✅ FIXED
- **Severity**: ~~Medium~~
- **Location**: `src/hooks/useFameDetection.ts`, `src/components/GameTracker/index.tsx`
- **Description**: Was checking `pitcherStats.errors === 0` (pitcher's fielding errors) instead of whether any baserunners reached via defensive errors
- **Resolution**: Added `basesReachedViaError` field to PlayerStats interface and pitcher stats objects. Now correctly checks `basesReachedViaError === 0` for perfect game detection. Tracks when `result === 'E'` occurs during at-bat.
- **Fixed**: 2026-01-22

---

## ⚠️ INCOMPLETE IMPLEMENTATIONS

### INC-001: Pitcher Stat Tracking
- **Status**: ✅ IMPLEMENTED (Phase 1)
- **Location**: `src/components/GameTracker/index.tsx`
- **Resolution**: Added `PitcherGameStats` interface and `pitcherGameStats` Map state. Stats now accumulate across at-bats within a game. Implemented `updatePitcherStats()` function that increments stats based on at-bat results. Both mid-game and end-game Fame detection now use accumulated stats.
- **Implemented**: 2026-01-22
- **Remaining**: Season-level persistence (see STAT_TRACKING_ARCHITECTURE_SPEC.md)

### INC-002: Strike Out the Side Detection
- **Status**: Partial
- **Location**: `src/components/GameTracker/index.tsx` ~1019
- **Issue**: Only fires if 3rd out is a strikeout, not at inning end
- **Impact**: Misses cases where 3 Ks happen but inning ends on non-K

### INC-003: Natural Cycle Detection
- **Status**: Type exists, no tracking
- **Location**: `src/hooks/useFameDetection.ts` ~196-197
- **Missing**: No hit-order tracking to distinguish 1B→2B→3B→HR sequence
- **Impact**: Can only detect regular cycle, not natural cycle

### INC-004: End-Game Summary Winner
- **Status**: UI exists, prop not set
- **Location**: `src/components/GameTracker/index.tsx` ~1498
- **Issue**: `winner={null}` hardcoded
- **Impact**: Summary doesn't show winning team

### INC-005: Inning Strikeout Counter Reset Timing
- **Status**: Works but edge case
- **Location**: `src/components/GameTracker/index.tsx` ~308, ~961
- **Issue**: Counter resets in flipInning but detection runs before flip
- **Impact**: Last K of inning may use stale count

---

## 📋 NOT STARTED (Detection Functions)

### Defensive Events
| Event | Type | Priority |
|-------|------|----------|
| WEB_GEM | Manual | Medium |
| ROBBERY | Manual | Medium |
| ROBBERY_GRAND_SLAM | Manual | Low |
| TRIPLE_PLAY | Semi-auto | Low |
| UNASSISTED_TRIPLE_PLAY | Semi-auto | Low |
| THROW_OUT_AT_HOME | Manual | Medium |

### Pitching Events
| Event | Type | Priority |
|-------|------|----------|
| COMPLETE_GAME | Auto | High |
| SHUTOUT | Auto | High |
| MADDUX | Auto | Medium |
| IMMACULATE_INNING | Semi-auto | Low |
| NINE_PITCH_INNING | Semi-auto | Low |
| ESCAPE_ARTIST | Manual | Medium |
| BLOWN_SAVE | Semi-auto | High |
| BLOWN_SAVE_LOSS | Semi-auto | High |

### Batting Events
| Event | Type | Priority |
|-------|------|----------|
| INSIDE_PARK_HR | Manual | Medium |
| CLUTCH_GRAND_SLAM | Semi-auto | Medium |
| COMEBACK_HERO | Semi-auto | Low |
| RALLY_STARTER | Semi-auto | Low |
| FIRST_CAREER_HR | Manual | Low |
| CAREER_MILESTONE | Manual | Low |

### Boner Events
| Event | Type | Priority |
|-------|------|----------|
| IBB_STRIKEOUT | Manual | Medium |
| HIT_INTO_TRIPLE_PLAY | Semi-auto | Low |
| TOOTBLAN | Manual | High |
| TOOTBLAN_RALLY_KILLER | Manual | Medium |
| MEATBALL_WHIFF | Manual | Low |
| PICKED_OFF_END_GAME | Semi-auto | Medium |
| PICKED_OFF_END_INNING | Semi-auto | Medium |
| DROPPED_FLY | Manual | Medium |
| DROPPED_FLY_CLUTCH | Manual | Medium |
| BOOTED_GROUNDER | Manual | Medium |
| WRONG_BASE_THROW | Manual | Low |
| PASSED_BALL_RUN | Semi-auto | Medium |
| PASSED_BALL_WINNING_RUN | Semi-auto | Medium |

### Position Player Pitching
| Event | Type | Priority |
|-------|------|----------|
| PP_CLEAN_INNING | Manual | Low |
| PP_MULTI_CLEAN | Manual | Low |
| PP_STRIKEOUT | Manual | Low |
| PP_GAVE_UP_RUNS | Manual | Low |

### Other
| Event | Type | Priority |
|-------|------|----------|
| NUT_SHOT_DELIVERED | Manual | Low |
| NUT_SHOT_MADE_PLAY | Manual | Low |
| NUT_SHOT_MISSED | Manual | Low |
| KILLED_PITCHER | Manual | Low |
| STAYED_IN_AFTER_HIT | Manual | Low |

---

## 🗄️ INFRASTRUCTURE GAPS

| Gap | Priority | Notes |
|-----|----------|-------|
| Fame persistence | Medium | Lost on page refresh |
| Cross-game tracking | Low | No historical Fame data |
| Secondary player modal | Low | Only 6 event types support it |

---

## Changelog

### 2026-01-22
- Initial tracking document created
- Identified 4 bugs, 5 incomplete implementations
- Catalogued ~40 unimplemented detection functions

### 2026-01-22 (Bug Fixes)
- BUG-001: Confirmed NOT A BUG after code inspection - state read happens before increment
- BUG-002: FIXED - Added `detectBackToBackHR` call in `checkForFameEvents` with `lastHRBatterId` tracking
- BUG-003: FIXED - Replaced single deficit state with per-team tracking (`maxDeficitAway`, `maxDeficitHome`), updated `scoreRun` to track deficits
- BUG-004: FIXED - Added `basesReachedViaError` stat to properly track batters reaching on error for perfect game detection

### 2026-01-22 (Stat Infrastructure)
- See `STAT_TRACKING_ARCHITECTURE_SPEC.md` for Phases 1-3 implementation details
- Fame detection now uses accumulated stats from `pitcherGameStats` Map
- Fame events aggregated to season totals via `aggregateGameToSeason()`
