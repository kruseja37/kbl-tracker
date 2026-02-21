# Franchise Mode Specification

> **Purpose**: Define the architecture for managing multiple isolated franchise save slots
> **Status**: PLANNING - Build out deferred until other features complete
> **Priority**: Future Phase
> **Related Specs**: STAT_TRACKING_ARCHITECTURE_SPEC.md, eventLog.ts

---

## 1. Overview

Franchise Mode allows users to maintain multiple completely isolated "save slots," each representing a separate league universe with its own teams, players, seasons, and history. Users can switch between franchises without data bleed-through.

### 1.1 Use Cases

- Start a new league without losing existing data
- Run experimental franchises (test rule changes, etc.)
- Maintain separate leagues for different player groups
- Reset and start fresh while preserving old franchise as archive

---

## 2. Data Architecture

### 2.1 Franchise Hierarchy

```
App
 └── Franchise Slots (1, 2, 3, etc.)
      └── Franchise Data
           ├── Franchise Metadata
           │    ├── Name, created date, last played
           │    ├── League settings (teams, divisions, rules)
           │    └── Current season pointer
           │
           ├── Seasons (1, 2, 3...)
           │    ├── Season Stats (batting, pitching, fielding)
           │    ├── Event Logs (every at-bat with full context)
           │    ├── Fame Events
           │    ├── Standings & Schedule
           │    └── Playoff Results
           │
           ├── Career Stats (accumulated across seasons)
           │    ├── Player career totals
           │    ├── All-time leaderboards
           │    └── Hall of Fame tracking
           │
           ├── Teams & Rosters
           │    ├── Current rosters
           │    ├── Historical rosters by season
           │    └── Retired numbers
           │
           ├── Player Data
           │    ├── Ratings & development history
           │    ├── Contract/salary history
           │    └── Awards history
           │
           └── Transaction History
                ├── Trades
                ├── Free agent signings
                ├── Draft picks
                └── Releases/retirements
```

### 2.2 Storage Strategy: Separate IndexedDB Per Franchise

**Recommendation**: Each franchise gets its own IndexedDB instance.

```
kbl-franchise-1/     # "Dynasty League"
  ├── gameHeaders
  ├── atBatEvents
  ├── seasonStats
  ├── careerStats
  └── ...

kbl-franchise-2/     # "Experimental League"
  ├── gameHeaders
  ├── atBatEvents
  ├── seasonStats
  ├── careerStats
  └── ...

kbl-app-meta/        # App-level data (shared)
  ├── franchiseList
  ├── appSettings
  └── lastUsedFranchise
```

**Why Separate DBs?**

| Consideration | Separate DBs | Single DB w/ Keys | Single DB w/ FK |
|---------------|--------------|-------------------|-----------------|
| Data isolation | ✅ Complete | ⚠️ Prefix discipline | ⚠️ Query discipline |
| Delete franchise | ✅ `deleteDatabase()` | ❌ Complex cleanup | ❌ Cascade deletes |
| Export franchise | ✅ Export whole DB | ❌ Filter by prefix | ❌ Join queries |
| Query complexity | ✅ Simple | ✅ Simple | ⚠️ Always filter |
| DB connections | ⚠️ One per franchise | ✅ Single | ✅ Single |

The connection overhead is minimal since only one franchise is active at a time.

---

## 3. Storage Estimates

### 3.1 Per-Season Storage

Based on analysis from STAT_TRACKING_ARCHITECTURE_SPEC.md Phase 4:

| Data Type | Formula | Example (8 teams, 128 games/team) |
|-----------|---------|-----------------------------------|
| Event Log | `(numTeams × gamesPerTeam / 2) × 35KB` | 512 games × 35KB = **~18MB** |
| Season Stats | `numPlayers × 500 bytes` | 200 players × 500B = **~100KB** |
| Fame Events | `~1000 events × 200 bytes` | **~200KB** |
| Game Headers | `numGames × 500 bytes` | 512 × 500B = **~250KB** |
| Rosters/Teams | Relatively static | **~100KB** |
| **Total/Season** | | **~19MB** |

### 3.2 Per-Franchise Storage (Multi-Season)

| Seasons | Estimated Size | Notes |
|---------|----------------|-------|
| 1 | ~19MB | First season |
| 5 | ~95MB | Typical active franchise |
| 10 | ~190MB | Long-running franchise |
| 20 | ~380MB | Dynasty franchise |

### 3.3 IndexedDB Limits

- **Chrome**: 60% of disk space (typically 50GB+)
- **Firefox**: 50% of disk space
- **Safari**: 1GB default, can request more

**Conclusion**: Storage is not a concern. Even 20 franchises × 10 seasons each = ~3.8GB, well within limits.

---

## 4. Franchise Management API

### 4.1 Core Operations

```typescript
interface FranchiseManager {
  // Franchise CRUD
  createFranchise(name: string, settings: LeagueSettings): Promise<FranchiseId>;
  loadFranchise(id: FranchiseId): Promise<Franchise>;
  deleteFranchise(id: FranchiseId): Promise<void>;
  renameFranchise(id: FranchiseId, newName: string): Promise<void>;

  // Franchise listing
  listFranchises(): Promise<FranchiseSummary[]>;
  getFranchiseStats(id: FranchiseId): Promise<FranchiseStats>;

  // Export/Import
  exportFranchise(id: FranchiseId): Promise<Blob>;
  importFranchise(data: Blob): Promise<FranchiseId>;

  // Active franchise
  getActiveFranchise(): FranchiseId | null;
  setActiveFranchise(id: FranchiseId): Promise<void>;
}

interface FranchiseSummary {
  id: FranchiseId;
  name: string;
  createdAt: Date;
  lastPlayedAt: Date;
  currentSeason: number;
  totalSeasons: number;
  storageUsedBytes: number;
}

interface FranchiseStats {
  totalGames: number;
  totalAtBats: number;
  totalFameEvents: number;
  seasons: SeasonSummary[];
}
```

### 4.2 Database Naming Convention

```typescript
const DB_PREFIX = 'kbl-franchise-';
const META_DB = 'kbl-app-meta';

function getFranchiseDBName(franchiseId: string): string {
  return `${DB_PREFIX}${franchiseId}`;
}
```

---

## 5. UI/UX Concepts

### 5.1 Franchise Selector (App Startup)

```
┌─────────────────────────────────────────────────┐
│  KBL XHD Tracker                                │
│                                                 │
│  Select Franchise                               │
│  ─────────────────                              │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 🏆 Dynasty League                       │   │
│  │    Season 5 • 8 teams • 95MB            │   │
│  │    Last played: 2 hours ago             │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ ⚾ Test League                          │   │
│  │    Season 1 • 8 teams • 19MB            │   │
│  │    Last played: 3 days ago              │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [ + New Franchise ]                            │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 5.2 Franchise Actions Menu

- **Continue** - Load and resume
- **Rename** - Change franchise name
- **Export** - Download as backup file
- **Delete** - Remove with confirmation ("Type franchise name to confirm")

### 5.3 In-Game Franchise Indicator

Small indicator in header showing active franchise name, allowing quick identification.

---

## 6. Data Integrity Across Franchises

### 6.1 Startup Flow

```
App Start
    │
    ▼
Load App Meta DB
    │
    ▼
Get Last Used Franchise
    │
    ├── Found → Load Franchise DB
    │              │
    │              ▼
    │           Run Data Integrity Check (useDataIntegrity)
    │              │
    │              ▼
    │           Recover unaggregated games if needed
    │              │
    │              ▼
    │           Show GameTracker
    │
    └── Not Found → Show Franchise Selector
```

### 6.2 Franchise Switching

When switching franchises:
1. Close current franchise DB connection
2. Clear in-memory state (React state reset)
3. Open new franchise DB
4. Run integrity check on new franchise
5. Load initial state

---

## 7. Migration Path

### 7.1 Existing Data Migration

For users with existing data (pre-franchise mode):

1. On first launch after update, detect legacy data
2. Create "Default Franchise" and migrate all data into it
3. Show migration complete message
4. Continue normally with franchise mode enabled

### 7.2 Database Version Management

Each franchise DB tracks its own version for schema migrations:

```typescript
interface FranchiseMetadata {
  franchiseId: string;
  name: string;
  createdAt: number;
  schemaVersion: number;  // For migrations
  appVersionCreated: string;
  // ...
}
```

---

## 8. Implementation Notes

### 8.1 Key Learnings from Event Log Implementation

1. **IndexedDB boolean indexing doesn't work well** - Use in-memory filtering instead
2. **Separate concerns** - Event log (raw data) vs Season stats (aggregated) vs Career stats (accumulated)
3. **Lazy initialization** - Create DB/records only when first needed
4. **Async everything** - All DB operations are async, don't block UI
5. **Recovery-first design** - Event log enables full reconstruction

### 8.2 Dependencies

Before implementing Franchise Mode, these should be complete:

- [ ] Season stats aggregation (Phase 3) ✅
- [ ] Event log system (Phase 4) ✅
- [ ] Career stats tracking (Phase 5)
- [ ] Full roster management
- [ ] Salary/contract system
- [ ] Trade system
- [ ] Draft system
- [ ] Playoff system

### 8.3 Implementation Order (When Ready)

1. **App Meta DB** - Franchise list, app settings
2. **Franchise Manager** - CRUD operations
3. **Franchise Selector UI** - Startup screen
4. **Migration Logic** - Legacy data handling
5. **Export/Import** - Backup functionality
6. **Storage Monitoring** - Show usage per franchise

---

## 9. Open Questions

1. **Max franchises?** - Probably unlimited, but could cap at 10 for simplicity
2. **Cloud sync?** - Future consideration, would need account system
3. **Franchise templates?** - Pre-configured leagues (MLB, custom, etc.)
4. **Archive vs Delete?** - Option to archive (read-only) instead of delete?

---

## 10. References

| Document | Relevance |
|----------|-----------|
| STAT_TRACKING_ARCHITECTURE_SPEC.md | Event log storage estimates, data integrity patterns |
| eventLog.ts | Current implementation of per-game event storage |
| useDataIntegrity.ts | Startup recovery patterns |
| seasons.csv | League configuration (gamesPerTeam, numTeams) |

---

## 11. v1.1 Updates (February 2026)

### 11.1 Separated Modes Architecture

Franchise Mode is now understood as operating across three distinct modes:
1. **League Builder** — One-time setup or import
2. **Franchise Season** — Play games, track stats
3. **Offseason Workshop** — 11-phase between-season processing

See **SEPARATED_MODES_ARCHITECTURE.md** for full details.

### 11.2 Dynamic Schedule (No Auto-Generation)

> **Key Decision**: KBL does NOT auto-generate a full season schedule. The user plays games in SMB4 and records results. The schedule view shows played games and auto-detects series from consecutive games against the same opponent.

```typescript
// Series auto-detection
function detectSeries(recentGames: GameResult[]): SeriesContext | null {
  if (recentGames.length < 2) return null;
  const lastOpponent = recentGames[0].opponent;
  const seriesGames = [];
  for (const game of recentGames) {
    if (game.opponent === lastOpponent) seriesGames.push(game);
    else break;
  }
  if (seriesGames.length >= 2) {
    return {
      opponent: lastOpponent,
      gamesInSeries: seriesGames.length,
      seriesScore: calculateSeriesScore(seriesGames),
      isActive: true
    };
  }
  return null;
}
```

### 11.3 Fictional Date System

KBL uses fictional dates that advance with each game, not tied to real-world calendar:
- Season 1 starts "April 1, Year 1"
- Each game advances ~2 days (adjusted for season length)
- Months follow baseball calendar: April → September
- Offseason: October → March

### 11.4 Cross-References

| Spec | Content |
|------|---------|
| SEPARATED_MODES_ARCHITECTURE.md | Full three-mode architecture |
| SCHEDULE_SYSTEM_FIGMA_SPEC.md | Schedule UI design |
| OFFSEASON_SYSTEM_SPEC.md | All 11 offseason phases |
| ALMANAC_SPEC.md | Cross-season historical reference |

---

*Last Updated: February 20, 2026*
*Status: PLANNING - Architecture updated, awaiting implementation*
