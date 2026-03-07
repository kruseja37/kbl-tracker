# ELIMINATION MODE — Standalone Playoff Specification

**Version:** 2.0
**Created:** 2026-03-06
**Status:** GOSPEL
**Cross-references:** MODE_1 §11.4, §11.8 | MODE_2 §3-§23 | SPINE_ARCHITECTURE.md

---

## 1. What It Is

Elimination Mode is SMB4's "Elimination" mode upgraded with full KBL Tracker analytics. It's a **super-lite franchise** — same rich GameTracker, same stats pipeline, same engines — but the wrapper is minimal: pick teams, set up a bracket, play the games, see awards.

**The PLAYOFFS button** on the home screen (pink button) is the entry point. It behaves like Load Franchise: shows saved brackets, lets you start a new one, or delete old ones.

### 1.1 What's Identical to Franchise
- GameTracker UI and all components — same experience
- Event logging (`eventLog.ts`) — same data, different key prefixes
- Stats pipeline (`seasonAggregator.ts`) — pass `elimination-{id}` as `seasonId`
- All engines — WAR, mojo, fitness, fame, morale, narrative, leverage, WPA, designations, milestones
- Career stats accumulation (merged with franchise career stats in v1)
- Lineup loading pattern (`lineupLoader.ts`)

### 1.2 What's Super-Lite (New Code)
- Elimination manager (~100-150 lines) — CRUD for bracket instances
- Save slot selector page — mirror FranchiseSelector
- 5-step setup wizard — mirror FranchiseSetup, abbreviated per Mode 1 §11.8
- Bracket home page — adapt from WorldSeries.tsx, add Team Hub tab
- Team Hub — roster snapshot view + lineup editing (NOT the franchise TeamHubContent)
- Roster snapshots — freeze rosters at bracket creation
- Mojo/fitness inter-game persistence — save/load between bracket games
- Awards computation — 6 awards at bracket completion (~50 lines)

### 1.3 What It Does NOT Have
- No regular season, no schedule, no standings
- No offseason, no draft, no free agency, no trades
- No separate database — uses existing databases with key scoping
- No complex franchise manager — just create/load/delete

---

## 2. Storage: No New Databases

Elimination Mode uses the **four existing IndexedDB databases** with key prefixes for scoping. No new databases, no migrations except one index change.

### 2.1 How Each Database Is Used

| Database | Existing Purpose | Elimination Usage | Scoping |
|---|---|---|---|
| `kbl-app-meta` | Franchise list, app settings | Add `eliminationList` store (v3 migration) | Separate store from franchiseList |
| `kbl-event-log` | Game events (AtBatEvent, GameHeader) | Same — events keyed by gameId | gameId: `elim-{eliminationId}-{seriesId}-g{N}` |
| `kbl-tracker` | Game stats, season stats, career stats | Same — stats keyed by seasonId | seasonId: `elimination-{eliminationId}` |
| `kbl-playoffs` | Brackets, series, playoff stats | Same — bracket storage | Add `sourceType: 'franchise' \| 'elimination'` to PlayoffConfig |

### 2.2 Required Migration: kbl-playoffs

**ONE change:** The `seasonNumber` index on the `playoffs` store is currently `unique: true`. This MUST be changed to `unique: false` to allow both franchise playoffs and elimination brackets. This requires bumping `DB_VERSION` from 1 to 2 in `playoffStorage.ts`.

```typescript
// playoffStorage.ts — version bump
const DB_VERSION = 2;

// In onupgradeneeded:
if (event.oldVersion < 2) {
  // Drop and recreate the seasonNumber index as non-unique
  const playoffsStore = tx.objectStore(STORES.PLAYOFFS);
  if (playoffsStore.indexNames.contains('seasonNumber')) {
    playoffsStore.deleteIndex('seasonNumber');
  }
  playoffsStore.createIndex('seasonNumber', 'seasonNumber', { unique: false });
}
```

### 2.3 Required Migration: kbl-app-meta

Bump `META_DB_VERSION` from 2 to 3. Add `eliminationList` store:

```typescript
// In onupgradeneeded:
if (!db.objectStoreNames.contains('eliminationList')) {
  db.createObjectStore('eliminationList', { keyPath: 'eliminationId' });
}
```

**CRITICAL:** The upgrade handler MUST check `db.objectStoreNames.contains()` before creating — never recreate existing stores. This is already the pattern in the codebase.

### 2.4 PlayoffConfig Extension

```typescript
// Add to existing PlayoffConfig interface
interface PlayoffConfig {
  // ... existing fields ...
  sourceType: 'franchise' | 'elimination';  // NEW — discriminator
  eliminationId?: string;                    // NEW — links to elimination instance
}
```

All existing franchise playoff code continues to work because `sourceType` defaults to `'franchise'` for existing records. Query functions that load franchise playoffs add `.filter(p => p.sourceType !== 'elimination')` or check `sourceType === 'franchise'`.

### 2.5 Elimination Metadata

Stored in `kbl-app-meta` → `eliminationList`:

```typescript
interface EliminationMetadata {
  eliminationId: string;
  name: string;                    // User-provided bracket name
  leagueId: string;
  leagueName: string;
  status: 'SETUP' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: number;
  lastPlayedAt: number;
  teamsCount: number;
  currentRound: number;
  champion?: string;               // Team name, for display
}
```

Full bracket data (series, games, stats) lives in `kbl-playoffs` scoped by `sourceType: 'elimination'` and `eliminationId`.

---

## 3. Entry Point

### 3.1 Home Screen Button

The **PLAYOFFS** button navigates to `/elimination/select`.

**EliminationSelector page:**
- Lists saved elimination brackets from `kbl-app-meta` → `eliminationList`
- Each slot shows: name, league, teams, current round, status, last played
- Actions: Load, New, Delete
- If no slots exist: show "New Elimination Bracket" prompt

### 3.2 Routes

```
/elimination/select              → EliminationSelector (load/new/delete)
/elimination/setup               → EliminationSetup (5-step wizard)
/elimination/:eliminationId      → EliminationHome (bracket view + team hub)
/game-tracker/:gameId            → GameTracker (unchanged — receives elimination context via nav state)
/post-game/:gameId               → PostGameSummary (unchanged — receives elimination return route)
```

---

## 4. Setup Wizard (5 Steps — Per Mode 1 §11.8)

| Step | Content | Data Source |
|---|---|---|
| 1. Select League | Show leagues from League Builder | `leagueBuilderStorage.ts` |
| 2. Playoff Settings | Teams, series lengths per round, home field pattern, innings, DH | Mode 1 §11.4 |
| 3. Team Control | Select "your" team(s) for narrative framing. Default: all human. | — |
| 4. Seeding | Drag to reorder or auto-seed. Bracket preview. | `playoffEngine.ts` |
| 5. Confirm | Name the bracket. Review. "Start Playoffs." | — |

### 4.1 What Happens on "Start Playoffs"

1. Create `EliminationMetadata` in `kbl-app-meta` → `eliminationList`
2. **Snapshot rosters** — copy current League Builder rosters for all bracket teams into a roster snapshot (see §5)
3. Create `PlayoffConfig` in `kbl-playoffs` with `sourceType: 'elimination'`, `eliminationId`
4. Generate bracket via existing `generateBracket()` from `playoffStorage.ts`
5. Navigate to `/elimination/:eliminationId`

---

## 5. Roster Snapshots

### 5.1 Why Snapshots

League Builder rosters are mutable. If JK edits a team between Game 2 and Game 3, the roster changes mid-series. Elimination Mode freezes rosters at bracket creation.

### 5.2 Storage

Store snapshots in `kbl-tracker` using a dedicated key pattern:

```typescript
interface EliminationRosterSnapshot {
  key: string;                          // `elim-roster-{eliminationId}-{teamId}`
  eliminationId: string;
  teamId: string;
  teamName: string;
  players: LeagueBuilderPlayer[];       // Full player data from League Builder
  lineup: LineupSlot[];                 // Batting order + field positions
  startingRotation: string[];           // Pitcher IDs in rotation order
  snapshotAt: number;
}
```

Add a `rosterSnapshots` store to `kbl-tracker` (bump `DB_VERSION` from 3 to 4 in `trackerDb.ts`).

### 5.3 Lineup Loading for Elimination Games

When launching a game from the bracket, use `loadTeamLineup()` pattern but read from the roster snapshot instead of League Builder:

```typescript
// New function in lineupLoader.ts (or new eliminationLineupLoader.ts)
async function loadEliminationLineup(eliminationId: string, teamId: string): Promise<LoadedLineup> {
  const snapshot = await getEliminationRosterSnapshot(eliminationId, teamId);
  // Convert snapshot players to GameTracker roster format
  // Same conversion logic as loadTeamLineup, different data source
}
```

### 5.4 Team Hub Edits

The Team Hub (§6) lets JK reorder the lineup and set the starting pitcher between games. These edits update the roster snapshot — not League Builder. The snapshot is the bracket's live roster.

---

## 6. Elimination Home Page

### 6.1 Tabs

| Tab | Content |
|---|---|
| **BRACKET** | Visual bracket. Click any active series to see matchup + "PLAY GAME" button. User-driven game selection within each round. Round advances when all series complete. |
| **TEAM HUB** | Roster view for each team. Lineup ordering, starting pitcher selection. Reads/writes roster snapshots. NOT the franchise TeamHubContent (which depends on FranchiseDataContext). |
| **LEADERS** | Batting and pitching leaderboards. Reads from `kbl-playoffs` → `playoffStats`. Same UI as WorldSeries Leaders tab. |
| **AWARDS** | Shown after bracket completes. Elimination-specific awards (§7). |
| **HISTORY** | Past completed brackets. |

### 6.2 User-Driven Game Selection

All active series in the current round are clickable. JK picks which matchup to play. The system does NOT enforce game order within a round.

Clicking a series shows:
- Series score (e.g., "Team A leads 2-1")
- Next game number
- Home/away assignment (from home field pattern + game number)
- Stadium name (from home team's League Builder data in snapshot)
- "PLAY GAME" button

### 6.3 Team Hub — NOT TeamHubContent

Build `EliminationTeamHub.tsx` as a **new, simple component**. Do NOT reuse `TeamHubContent.tsx` — it's tightly coupled to `FranchiseDataContext` (defined inside FranchiseHome.tsx line 177).

Elimination Team Hub needs:
- Team selector (all bracket teams)
- Roster list: player name, position, grade, batting hand
- Lineup editor: drag to reorder batting order, set field positions
- Starting pitcher selector: pick from rotation
- All data reads/writes from roster snapshot (§5), not League Builder or franchise data

---

## 7. GameTracker Integration

### 7.1 New Mode Value

```typescript
// Add to NavigationState type in GameTracker.tsx
gameMode?: 'exhibition' | 'franchise' | 'playoff' | 'elimination';
```

### 7.2 Navigation State for Elimination Games

```typescript
{
  gameMode: 'elimination',
  eliminationId: string,
  seriesId: string,
  gameNumber: number,
  roundName: string,
  seasonId: `elimination-${eliminationId}`,  // Scopes all stats
  seasonNumber: 1,                            // Always 1 for elimination
  
  // Teams + rosters loaded from roster snapshot
  homeTeamId, homeTeamName, awayTeamId, awayTeamName,
  stadiumName,                                // From home team snapshot data
  
  // Series context for Fenway Board
  seriesScore: { home: number, away: number },
  homeSeed: number,
  awaySeed: number,
}
```

### 7.3 Exhaustive Mode Check Changes

Every existing mode check in GameTracker.tsx and useGameState.ts, with the exact change needed:

| File | Line | Current Code | Change | Why |
|---|---|---|---|---|
| GameTracker.tsx | 111 | `gameMode?: 'exhibition' \| 'franchise' \| 'playoff'` | Add `\| 'elimination'` | Type definition |
| GameTracker.tsx | 213 | `gameMode === 'playoff'` | Change to `gameMode === 'playoff' \|\| gameMode === 'elimination'` | isPlayoffGame flag — elimination games ARE playoff games for display |
| GameTracker.tsx | 2106 | `gameMode !== 'exhibition'` | No change needed | Already catches elimination |
| GameTracker.tsx | 2225 | `gameMode === 'franchise' \| gameMode === 'playoff'` | Do NOT add elimination | Schedule marking — elimination has no schedule |
| GameTracker.tsx | 2245 | `gameMode \|\| 'franchise'` | No change needed | Fallback for post-game nav |
| useGameState.ts | 4261 | `if (playoffSeriesIdRef.current)` | No change needed | Triggers on any non-null seriesId |
| useGameState.ts | 4263 | `import('../../utils/playoffStorage')` | No change needed | Elimination uses same kbl-playoffs DB |

### 7.4 Stats Flow for Elimination Games

GameTracker completes a game → calls `processCompletedGame()` with `seasonId: 'elimination-{id}'`. The existing pipeline:
1. `aggregateGameToSeason()` — writes to `kbl-tracker` season stores keyed by `['elimination-{id}', playerId]`
2. Career stats — writes to `kbl-tracker` career stores (merged with franchise career for v1)
3. `recordSeriesGame()` — writes to `kbl-playoffs` (same DB, bracket already there)
4. Milestones detected against career totals

**No pipeline changes.** The key scoping handles everything.

### 7.5 PostGameSummary Return Navigation

```typescript
// GameTracker.tsx — update post-game navigation
navigate(`/post-game/${gameId}`, {
  state: {
    gameMode: navigationState?.gameMode || 'franchise',
    franchiseId: navigationState?.franchiseId,
    eliminationId: navigationState?.eliminationId,     // NEW
    // PostGameSummary uses this to navigate back:
    // 'franchise' → /franchise/{franchiseId}
    // 'elimination' → /elimination/{eliminationId}
    // 'exhibition' → /
  }
});
```

### 7.6 Playoff Stats Aggregation (The Missing Write)

Currently `kbl-playoffs` → `playoffStats` store exists but nothing writes to it. Build:

```typescript
// New function in playoffStorage.ts
async function aggregateGameToPlayoffStats(
  playoffId: string,
  gameState: PersistedGameState
): Promise<void> {
  // Read existing playoff stats for each player
  // Add game stats (same fields as PlayoffPlayerStats)
  // Write back (upsert by [playoffId, playerId])
}
```

Called at game completion alongside the existing `aggregateGameToSeason()`. This populates the Leaders tab.

---

## 8. Mojo/Fitness Inter-Game Persistence

### 8.1 Problem
Mojo and fitness live in React state (`usePlayerState` hook). When GameTracker unmounts between games, the state is gone. Franchise mode resets mojo per game from baselines. Elimination Mode should carry mojo/fitness across bracket games.

### 8.2 Solution
Save mojo/fitness snapshots at game completion, load at next game start.

```typescript
interface MojoFitnessSnapshot {
  eliminationId: string;
  playerId: string;
  mojoLevel: MojoLevel;
  fitnessState: FitnessState;
  updatedAt: number;
}
```

Store in `kbl-tracker` → `mojoFitnessSnapshots` (add in the `DB_VERSION` 4 migration alongside roster snapshots).

**On game completion:** Save all players' mojo/fitness to snapshots.
**On next game start:** Load snapshots. If found, use them instead of player baselines.

---

## 9. Awards

Computed when the bracket completes. Stored in `EliminationMetadata`.

| Award | Criteria |
|---|---|
| **Postseason MVP** | Highest combined WAR across bracket. User-selectable with system recommendation. |
| **Best Pitcher** | Lowest ERA (min 2 appearances, min innings threshold) |
| **Best Fielder** | Highest fWAR across bracket |
| **Best Runner** | Highest rWAR across bracket |
| **Clutch Performer** | Highest clutch value (LI-weighted) |
| **Series MVP** | Per-series highest WAR — displayed on bracket per series |

Awards data comes from `kbl-playoffs` → `playoffStats` (populated by §7.6).

---

## 10. Naming and File Changes

### 10.1 Rename WorldSeries → EliminationHome

`WorldSeries.tsx` becomes the Elimination bracket view. Rename BEFORE building new code to avoid import confusion.

| Current | New | Change Type |
|---|---|---|
| `WorldSeries.tsx` | `EliminationHome.tsx` | Rename file |
| `export function WorldSeries()` | `export function EliminationHome()` | Rename export |
| `App.tsx: import { WorldSeries }` | `import { EliminationHome }` | Update import |
| `App.tsx: /world-series` | `/elimination/:eliminationId` | Update route |
| `AppHome.tsx: to="/world-series"` | `to="/elimination/select"` | Update nav link |

All in one commit, before any new Elimination code. Clean break.

### 10.2 Code Terminology

- Internal code: `elimination` (variable names, file names, types, routes)
- UI label: "PLAYOFFS" on the home screen button (user-facing)
- Round names: "Championship", "Semi-Finals", etc. (from existing `getRoundName()`)
- "World Series" is only ever a round name, never a mode or file name

---

## 11. Implementation Priority

Build in this order. Each step is a branch → build → test → merge.

| # | Task | New Code | Existing Changes | Route |
|---|---|---|---|---|
| 1 | DB migrations (kbl-playoffs v2, kbl-app-meta v3, kbl-tracker v4) | Migration handlers | Version bumps + new stores | Claude Code CLI \| opus |
| 2 | Rename WorldSeries → EliminationHome + route changes | — | 3 files | Claude Code CLI \| sonnet |
| 3 | `eliminationManager.ts` — CRUD (~100-150 lines) | New file | — | Codex \| 5.3 \| high |
| 4 | EliminationSelector page — save slot picker | New file | — | Codex \| 5.3 \| high |
| 5 | EliminationSetup wizard — 5-step flow | New file | — | Claude Code CLI \| opus |
| 6 | Roster snapshot logic — create + read + update | New functions | trackerDb store | Claude Code CLI \| opus |
| 7 | EliminationHome — adapt bracket view, add Team Hub tab | Adapt existing | — | Claude Code CLI \| opus |
| 8 | EliminationTeamHub — roster view + lineup editing | New component | — | Codex \| 5.3 \| high |
| 9 | GameTracker `elimination` mode — type + 5 mode checks | — | GameTracker.tsx, useGameState.ts | Claude Code CLI \| opus |
| 10 | `aggregateGameToPlayoffStats()` — the missing write | New function | playoffStorage.ts | Codex \| 5.3 \| high |
| 11 | Mojo/fitness inter-game persistence | New functions | GameTracker game start/end | Claude Code CLI \| opus |
| 12 | PostGameSummary elimination return nav | — | PostGameSummary.tsx | Claude Code CLI \| sonnet |
| 13 | Awards computation | New function | eliminationManager.ts | Codex \| 5.3 \| high |
| 14 | Home screen button wiring | — | AppHome.tsx, App.tsx | Claude Code CLI \| sonnet |

---

## 12. What Could Go Wrong (Agent Guide)

These are the specific pitfalls. Every agent working on Elimination Mode MUST read this section.

| # | Pitfall | Prevention |
|---|---|---|
| 1 | Creating a new IndexedDB database for elimination | DON'T. Use existing 4 databases with key prefixes. |
| 2 | Trying to parameterize eventLog.ts DB name | DON'T. It's hardcoded. Use as-is — gameId scoping is sufficient. |
| 3 | Copying franchiseManager.ts and "simplifying" | DON'T. Write eliminationManager fresh at ~100 lines. It only needs create/load/delete/list. |
| 4 | Reusing TeamHubContent.tsx from FranchiseHome | DON'T. It's coupled to FranchiseDataContext. Build EliminationTeamHub from scratch — it's simpler. |
| 5 | Loading rosters from League Builder during bracket games | DON'T. Load from roster snapshots. League Builder data is mutable. |
| 6 | Adding `'elimination'` to the schedule-marking check | DON'T. Elimination has no schedule. Line 2225 stays franchise+playoff only. |
| 7 | Forgetting to pass `seasonId: 'elimination-{id}'` in nav state | This scopes ALL stats. Without it, elimination stats collide with franchise stats. |
| 8 | DB upgrade handler that recreates existing stores | ALWAYS check `db.objectStoreNames.contains()` before creating. |
| 9 | Assuming mojo/fitness persists between games automatically | It doesn't. React state dies on unmount. Build explicit save/load (§8). |
| 10 | Using `seasonNumber` as a unique identifier for brackets | It's no longer unique after the migration. Always filter by `sourceType`. |

---

## 13. V2 / Deferred

| Feature | Notes |
|---|---|
| AI-controlled teams | Requires AI Game Engine |
| Pool play format | V1 bracket only |
| Separate elimination career stats | V1 merges with franchise career. V2 adds sourceType to career stores. |
| Cross-elimination career tracking | V1 treats each bracket independently |
| Custom awards | V1 uses fixed 6 categories |
| Elimination sharing / export | Social features deferred |

---

## 14. Cross-References

| Document | Relationship |
|---|---|
| **MODE_1 §11.4** | Playoff settings |
| **MODE_1 §11.8** | Playoff Mode abbreviated wizard |
| **MODE_2 §3-§7** | GameTracker (identical experience) |
| **MODE_2 §8-§23** | Stats, WAR, narrative, etc. (identical engines) |
| **MODE_2 §21.3** | Playoff bracket structure |
| **KEEP.md** | Protected files — do NOT modify during Elimination work |
| **GAMETRACKER_DELTA_PLAN.md** | GameTracker must match §3-§7 before Elimination works |
