# KBL Tracker — Authoritative Data Source Map

> **Purpose**: Maps every data type displayed in the UI to its correct data source.
> When replacing dummy data, use this map to determine WHERE the real data should come from.

## Architecture: Shared-Source

The app uses a **shared-source** architecture across two directory trees:
- **Core logic** lives in `src/engines/`, `src/utils/`, `src/types/` — these are the REAL data sources
- **UI layer** lives in `src/src_figma/` — this is where dummy data gets displayed
- **src_figma imports from src/** via relative paths (`../../engines/`, `../../utils/`)
- The `@/` alias = `src/src_figma/` (set in vite.config.ts)
- When wiring up dynamic data, the source is almost always in `src/utils/` (storage) or `src/engines/` (calculations)

## Storage Layer (IndexedDB)

All persistent data uses native IndexedDB API (no Dexie).

### Game Storage
| File | DB Name | Stores | What It Holds |
|------|---------|--------|---------------|
| `src/src_figma/utils/gameStorage.ts` | `kbl-tracker` (v2) | `currentGame`, `completedGames`, `playerGameStats`, `pitcherGameStats` | Active + archived game data |
| `src/utils/gameStorage.ts` | (base) | Same pattern | Base implementation |

### League Builder Storage
| File | DB Name | Stores | What It Holds |
|------|---------|--------|---------------|
| `src/utils/leagueBuilderStorage.ts` | `kbl-league-builder` (v1) | `leagueTemplates`, `globalTeams`, `globalPlayers`, `rulesPresets`, `teamRosters` | All league/team/player definitions |

### Season & Career Storage
| File | What It Holds |
|------|---------------|
| `src/utils/seasonStorage.ts` | Season-level aggregated stats |
| `src/src_figma/utils/seasonStorage.ts` | Figma-side season storage |
| `src/utils/careerStorage.ts` | Career-long player stats |
| `src/src_figma/utils/careerStorage.ts` | Figma-side career storage |

### Franchise & Specialized Storage
| File | What It Holds |
|------|---------------|
| `src/utils/franchiseStorage.ts` | Franchise/team persistent data |
| `src/src_figma/utils/franchiseStorage.ts` | Figma-side franchise storage |
| `src/utils/relationshipStorage.ts` | Player relationship data |
| `src/utils/transactionStorage.ts` | Trade and transaction history |
| `src/utils/playoffStorage.ts` | Playoff bracket and results |
| `src/utils/offseasonStorage.ts` | Off-season activities |
| `src/utils/museumStorage.ts` | Hall of fame/museum records |
| `src/utils/ratingsStorage.ts` | Player rating adjustments |
| `src/utils/playerRatingsStorage.ts` | Player ratings history |
| `src/utils/scheduleStorage.ts` | Season schedule data |
| `src/utils/leagueStorage.ts` | League configuration |
| `src/utils/farmStorage.ts` | Farm system data |
| `src/utils/customPlayerStorage.ts` | Custom created players |
| `src/utils/unifiedPlayerStorage.ts` | Unified player data access |
| `src/context/appStateStorage.ts` | App-level state persistence |

---

## Calculation Engines

### Base Engines (`src/engines/`)
| Engine | Function | Real Data Source |
|--------|----------|-----------------|
| `bwarCalculator.ts` | Batting WAR (wOBA → wRAA → RPW → bWAR) | Player batting stats from gameStorage/seasonStorage |
| `pwarCalculator.ts` | Pitching WAR (FIP-based) | Pitcher stats from gameStorage/seasonStorage |
| `fwarCalculator.ts` | Fielding WAR (fielding runs, position mods) | Fielding stats from gameStorage |
| `rwarCalculator.ts` | Replacement WAR | Combined WAR components |
| `mwarCalculator.ts` | Mojo WAR (SMB4-specific) | Mojo state from mojoEngine |
| `salaryCalculator.ts` | Salary calculations | WAR output + contract rules |
| `mojoEngine.ts` | Mojo state calculations | Game events, player traits |
| `fitnessEngine.ts` | Fitness/injury calculations | Game usage, rest days |
| `leverageCalculator.ts` | Leverage Index (LI, gmLI, clutch) | Game state (inning, score, outs, bases) |
| `clutchCalculator.ts` | Clutch performance | LI + performance data |
| `fameEngine.ts` | Fame/milestone detection | Career + season stats |
| `fanMoraleEngine.ts` | Fan morale calculations | Win/loss, star players |
| `narrativeEngine.ts` | Narrative event generation | Game events, player data |
| `agingEngine.ts` | Player aging effects | Player age, season |
| `relationshipEngine.ts` | Player relationships | Game events, team context |
| `adaptiveLearningEngine.ts` | Adaptive difficulty | Player performance patterns |
| `detectionFunctions.ts` | Event detection (special plays) | Game state |

### Figma Integration Engines (`src/src_figma/app/engines/`)
| Engine | Function |
|--------|----------|
| `d3kTracker.ts` | Dropped 3rd strike detection |
| `inheritedRunnerTracker.ts` | Inherited runner ER attribution |
| `saveDetector.ts` | Save/hold/blown save detection |
| `fameIntegration.ts` | Fame system integration |
| `fanMoraleIntegration.ts` | Fan morale integration |
| `mwarIntegration.ts` | MWAR integration |
| `agingIntegration.ts` | Aging integration |
| `detectionIntegration.ts` | Detection integration |
| `playerStateIntegration.ts` | Player state integration |
| `relationshipIntegration.ts` | Relationship integration |
| `adaptiveLearningEngine.ts` | Adaptive learning integration |
| `narrativeIntegration.ts` | Narrative engine integration wrapper |
| `warOrchestrator.ts` | WAR calculation orchestrator |

---

## Hooks (React State → UI)

### Core Game Hooks (`src/src_figma/hooks/`)
| Hook | Data It Provides | Source |
|------|-----------------|--------|
| `useGameState.ts` | Full game state: score, bases, outs, lineup, stats | gameStorage + real-time state |
| `useFranchiseData.ts` | Franchise standings, rosters, season data | franchiseStorage |
| `useLeagueBuilderData.ts` | League templates, teams, players | leagueBuilderStorage |
| `useMuseumData.ts` | Hall of fame, records | museumStorage |
| `useOffseasonData.ts` | Off-season activities | offseasonStorage |
| `useOffseasonState.ts` | Off-season state machine | offseasonStorage |
| `usePlayoffData.ts` | Playoff brackets, results | playoffStorage |
| `useScheduleData.ts` | Season schedule | scheduleStorage |

### Figma App Hooks (`src/src_figma/app/hooks/`)
| Hook | Data It Provides | Source |
|------|-----------------|--------|
| `useWARCalculations.ts` | WAR values for display | bwar/pwar/fwar Calculators |
| `useMWARCalculations.ts` | Mojo WAR values | mwarCalculator |
| `useFameTracking.ts` | Fame/milestone UI state | fameEngine |
| `useFanMorale.ts` | Fan morale UI state | fanMoraleEngine |
| `useAgingData.ts` | Aging effects UI | agingEngine |
| `usePlayerState.ts` | Player state (mojo, fitness) | mojoEngine + fitnessEngine |
| `useRelationshipData.ts` | Relationship UI data | relationshipEngine |
| `useSeasonStats.ts` | Season statistics aggregation | seasonStorage |

### Base Hooks (`src/hooks/`)
| Hook | Data It Provides | Source |
|------|-----------------|--------|
| `useWARCalculations.ts` | WAR calculations | engines |
| `useMWARCalculations.ts` | MWAR calculations | engines |
| `useCareerStats.ts` | Career statistics | careerStorage |
| `useSeasonStats.ts` | Season statistics | seasonStorage |
| `useSeasonData.ts` | Season data | seasonStorage |
| `useLiveStats.ts` | Live in-game stats | gameStorage |
| `useGamePersistence.ts` | Game save/load | gameStorage |
| `useClutchCalculations.ts` | Clutch metrics | clutchCalculator |
| `useFameDetection.ts` | Fame detection | fameEngine |
| `useFanMorale.ts` | Fan morale | fanMoraleEngine |
| `useFitnessState.ts` | Fitness state | fitnessEngine |
| `useMojoState.ts` | Mojo state | mojoEngine |
| `useAgingData.ts` | Aging data | agingEngine |
| `useNarrativeMorale.ts` | Narrative events | narrativeEngine |
| `useOffseasonPhase.ts` | Off-season phase | offseasonStorage |
| `useRelationshipData.ts` | Relationships | relationshipEngine |
| `useRosterData.ts` | Roster management | leagueBuilderStorage |
| `useDataIntegrity.ts` | Data validation | storage layer |

---

## Data Flow Summary

```
User Action (UI)
  → Component (TSX)
    → Hook (useXxx.ts)
      → Engine (Calculator/Detector)
        → Storage (IndexedDB)

Display Flow (reverse):
Storage → Hook → Component → User sees data
```

### Key Rule: NO component should hardcode data that exists in this pipeline.

If a component shows a number, name, or stat, it must trace back through:
1. A hook that reads from storage or an engine, OR
2. Props passed from a parent that got data from a hook, OR
3. An intentional empty/loading state (with appropriate UI feedback)
