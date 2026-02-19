# Fielding Data Pipeline — Field Mappings & Gaps

> **Created**: Feb 9, 2026
> **Status**: ACTIVE — Pipeline wired and verified via Playwright E2E

---

## Overview

The fielding data collection pipeline extracts fielding events from the EnhancedInteractiveField's `PlayData` output and writes them to IndexedDB via `logFieldingEvent()`. These events feed into:
- **Season fielding stats** (putouts, assists, errors) via `seasonAggregator.ts`
- **fWAR calculation** via `fwarCalculator.ts`

### Data Flow

```
EnhancedInteractiveField (PlayData)
  → extractFieldingEvents() [fieldingEventExtractor.ts]
  → logFieldingEvent() × N [eventLog.ts → IndexedDB: kbl-event-log.fieldingEvents]
  → completeGameInternal() / endGame() [useGameState.ts]
    → getGameFieldingEvents() → tally putouts/assists/errors per player
    → playerStatsRecord with real fielding stats
  → aggregateGameToSeason() [seasonAggregator.ts] — accumulates fielding stats
  → calculateFWARFromPersistedEvents() [fwarCalculator.ts] — computes fWAR
```

---

## PlayData → FieldingEvent Field Mapping

### Directly Mapped Fields

| PlayData Field | FieldingEvent Field | Mapping Logic | Notes |
|---|---|---|---|
| `fieldingSequence[last]` | `position` (putout event) | Position number → Position via `POSITION_MAP` | `{1:'P', 2:'C', 3:'1B', 4:'2B', 5:'3B', 6:'SS', 7:'LF', 8:'CF', 9:'RF'}` |
| `fieldingSequence[0..n-1]` | `position` (assist events) | Each intermediate fielder gets an assist event | Multi-fielder plays produce multiple events |
| `exitType` | `ballInPlay.trajectory` | `Ground→ground`, `Line Drive→line`, `Fly Ball→fly`, `Pop Up→popup` | Falls back to outType inference if exitType missing |
| `playDifficulty` | `difficulty` | `routine→routine`, `likely→likely`, `difficult→50-50`, `impossible→spectacular` | Defaults to `routine` if undefined |
| `spraySector` | `ballInPlay.zone` | `Left→1`, `Left-Center→2`, `Center→3`, `Right-Center→4`, `Right→5`, `Infield→6` | Defaults to `0` if undefined |
| `errorType` | Error event `playType='error'` | `FIELDING→fielding`, `THROWING→throwing`, `MENTAL→mental` | Only for `type: 'error'` plays |
| `errorFielder` | Error event `position` | Position number → Position via `POSITION_MAP` | Identifies which fielder committed the error |
| `dpType` | `double_play_pivot` events | Parse `"6-4-3"` → 3 events: assist, DP pivot, putout | Pivot man gets `double_play_pivot` playType |
| `inferredFielder` | `ballInPlay.primaryFielderId` | Position number of system's predicted primary fielder | Used in `primaryFielderId` of `BallInPlayData` |
| `fieldingSequence` (all) | `ballInPlay.fielderIds` | All position numbers → position strings | Full list of fielders involved |

### Derived Fields (Not Direct Mapping)

| FieldingEvent Field | Derivation | Notes |
|---|---|---|
| `fieldingEventId` | `${gameId}_fe_${atBatSequence}_${sequenceIdx}` | Unique ID combining game, at-bat, and event index |
| `gameId` | From `FieldingExtractionContext` | Passed by GameTracker from `gameState.gameId` |
| `atBatEventId` | `${gameId}_ab_${atBatSequence}` | Links to the at-bat event for cross-reference |
| `sequence` | Index within the play's events | 0-based, increments for each event on same play |
| `playerId` | Position string (e.g., `"SS"`) | Resolved to real player ID in `completeGameInternal()` via lineup refs |
| `playerName` | Position string (fallback) | Same as playerId; could be enhanced with lineup lookup |
| `teamId` | From `FieldingExtractionContext` | Defensive team determined by `gameState.isTop` |
| `success` | `playType !== 'error'` | All putouts/assists are successful; errors are not |

---

## Fielding Event Extraction Rules by Play Type

### Outs

| Out Type | Events Generated | Example |
|---|---|---|
| **GO** (Groundout) | Assists for all but last, putout for last | `[6,3]` → SS assist + 1B putout |
| **FO** (Flyout) | Single putout for catching fielder | `[8]` → CF putout |
| **LO** (Lineout) | Same as FO | `[4]` → 2B putout |
| **PO** (Popout) | Same as FO | `[5]` → 3B putout |
| **DP** (Double Play) | Assist for starter, DP pivot for middle, putout for last | `[6,4,3]` → SS assist + 2B DP pivot + 1B putout |
| **TP** (Triple Play) | Assists for all but last, putout for last | `[5,4,3]` → 3B assist + 2B assist + 1B putout |
| **SF** (Sacrifice Fly) | Putout for catcher of fly, assists for throwers | `[9]` → RF putout |
| **FC** (Fielder's Choice) | Assists for all but last, putout for last | `[6,5]` → SS assist + 3B putout |
| **SAC** (Sacrifice Bunt) | Same as GO structure | `[1,3]` → P assist + 1B putout |
| **K** (Strikeout) | No events (not a ball in play) | — |
| **K (D3K)** | If catcher in sequence: C assist + 1B putout | `[2,3]` → C assist + 1B putout |
| **KL** (Strikeout Looking) | No events | — |

### Non-Outs

| Play Type | Events Generated | Notes |
|---|---|---|
| **hit** (1B/2B/3B) | None | Hit = defense failed to record out. Runner thrown out on hit handled via fielder credit modal. |
| **hr** (Home Run) | None | Ball leaves the park — no fielding opportunity |
| **error** | 1 error event | `errorFielder` gets error event with `errorType` mapped |
| **foul_out** | 1 putout event | First fielder in sequence gets putout |
| **walk** | None | Not a ball in play |
| **foul_ball** | None | Not a ball in play |

### Special Cases

| Scenario | Handling |
|---|---|
| **Outfield assist** | If first fielder is OF (position 7-9) with subsequent fielders, first event upgraded to `outfield_assist` |
| **DP pivot man** | Middle fielder(s) in DP sequence get `double_play_pivot` playType (counts as assist in tally) |
| **Empty fieldingSequence** | No events generated (can't attribute fielding credit) |
| **Position fallback** | If position number not in POSITION_MAP, defaults to `'SS'` |

---

## Player ID Resolution

The extractor stores **position strings** (e.g., `"SS"`, `"1B"`) as `playerId` because the actual player IDs require lineup context not available at extraction time.

**Resolution happens in `useGameState.ts` at game end:**
1. Build `positionToPlayerIdMap` from `awayLineupRef` + `homeLineupRef`
   - Key: `${position}_${teamId}` (e.g., `"SS_tigers-id"`)
   - Value: actual `playerId`
2. For each fielding event, resolve via:
   ```
   resolvedId = map.get(`${fe.playerId}_${fe.teamId}`)
             || map.get(`${fe.position}_${fe.teamId}`)
             || fe.playerId  // fallback to position string
   ```
3. Tally putouts/assists/errors per resolved player ID
4. Write to `playerStatsRecord` in `PersistedGameState`

---

## Gaps — Fields That Cannot Be Populated from Current PlayData

| FieldingEvent Field | Current Value | Why Missing | Potential Future Fix |
|---|---|---|---|
| `ballInPlay.velocity` | Always `'medium'` | SMB4 does not expose exit velocity | Could infer from hit type + distance (line drive = hard, popup = soft) |
| `runsPreventedOrAllowed` | Always `0` | Requires real-time Leverage Index integration | Wire `playData.leverageIndex` when available from LI calculator |
| `playerName` | Position string | Need lineup lookup at extraction time | Pass lineup context to extractor, or resolve in post-processing |
| `ballInPlay.zone` | Coarse (1-6) | `spraySector` is string-based, not the detailed zone system fWAR wants | Map `ballLocation` coordinates to detailed zone grid |
| `difficulty: 'unlikely'` | Never produced | PlayData only has 4 difficulty levels; eventLog has 5 | Could map a sub-category of `difficult` to `unlikely` |

### PlayData Fields NOT Used by Extractor

| PlayData Field | Reason Not Used |
|---|---|
| `hitType` | Hit events don't generate fielding events |
| `walkType` | Walks don't generate fielding events |
| `ballLocation` (coordinates) | Used for spray charts but not directly for fielding events; `spraySector` covers zone mapping |
| `batterLocation` | Batter position irrelevant to fielding |
| `isFoul` / `foulType` | Only `foul_out` generates events; the foul details aren't needed |
| `hrDistance` / `hrType` | HRs don't generate fielding events |
| `inferenceConfidence` | Learning metric, not persisted to fielding events |
| `wasOverridden` | Learning metric, not persisted to fielding events |
| `leverageIndex` / `leverageCategory` | Could feed `runsPreventedOrAllowed` but not yet wired |
| `gameSituation` | Same as above — context for LI calculation |
| `isClutchSituation` | Fame system concern, not fielding |
| `playoffContext` | Fame multiplier, not fielding |
| `fameValue` / `fameEventType` | Fame system, separate pipeline |
| `runnerOutcomes` | Runner tracking, not fielding credit |

---

## Downstream Consumers

### 1. Season Aggregator (`seasonAggregator.ts:243`)
Reads `putouts`, `assists`, `fieldingErrors` from `PersistedGameState.playerStats` and accumulates into season totals. **Works automatically** once `completeGameInternal()` provides real values.

### 2. fWAR Calculator (`fwarCalculator.ts:665`)
`calculateFWARFromPersistedEvents()` queries `getGameFieldingEvents()` from IndexedDB, converts via `convertPersistedToCalculatorEvent()` (line 619), and calculates fielding WAR. **Works automatically** once fielding events are written.

### 3. fWAR Adapter (`fwarCalculator.ts:619`)
Converts storage-model `FieldingEvent` to calculator-model `FieldingEvent`:
- `playType: 'putout'` → `type: 'putout'`, `putoutType: 'flyball'|'groundball'|'tag'`
- `playType: 'assist'` → `type: 'assist'`, `assistType: 'throw'|'relay'`
- `playType: 'error'` → `type: 'error'`
- `playType: 'double_play_pivot'` → `type: 'double_play_pivot'`
- `playType: 'outfield_assist'` → `type: 'outfield_assist'`

---

## Verification Results (Feb 9, 2026)

### Playwright E2E Test

Simulated 4 play types via React fiber `onPlayComplete` callback:

| Play | Console Log | IndexedDB Events | Correct? |
|---|---|---|---|
| 6-3 Groundout | `Logged 2 fielding event(s) for out` | SS=assist, 1B=putout, trajectory=ground | YES |
| Flyout to CF | `Logged 1 fielding event(s) for out` | CF=putout, trajectory=fly | YES |
| 6-4-3 Double Play | `Logged 3 fielding event(s) for out` | SS=assist, 2B=DP pivot, 1B=putout, trajectory=ground | YES |
| Error by SS | `Logged 1 fielding event(s) for error` | SS=error, success=false, trajectory=ground | YES |

**Total: 7 events in IndexedDB, all correctly mapped. Zero console errors related to fielding.**

### Build & Test
- TypeScript: 0 errors (`npx tsc --noEmit`)
- Tests: 5416 pass / 211 fail (all pre-existing, no new failures)
