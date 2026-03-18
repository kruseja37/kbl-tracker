# LEAGUE BUILDER REFACTOR SPEC

**Source:** `spec-docs/LEAGUE_BUILDER_REFACTOR_TRANSCRIPT.md` (Q1–Q7)
**Created:** 2026-03-18
**Status:** APPROVED — Ready for implementation planning
**Context:** Prerequisites for Almanac build, surfaced during Almanac UX interrogation
**Relationship:** This spec AMENDS `LEAGUE_BUILDER_SPEC.md` — it does not replace it. All existing League Builder functionality remains; this spec adds the multi-league data model, mode isolation, and edit history.

---

## 1. Overview

The League Builder currently uses a shared-reference model where all modes (franchise, elimination, exhibition) read directly from the global player pool. This causes data integrity problems:

- Franchise aging mutates global player records, affecting all modes
- Multiple franchises can't coexist independently
- No historical record of player ratings at game time
- Players can only be on one team across all leagues

This refactor introduces:
1. **Hybrid player model** — base ratings + per-league overrides
2. **Per-league team assignments** — replacing single `currentTeamId`
3. **Mode isolation** — franchise/elimination deep-copy at creation
4. **Exhibition snapshots** — full player state captured on game records
5. **Edit history tracking** — per-field change log with league context
6. **New player attribute** — hometown (city, state)

---

## 2. Hybrid Player Model *(Q1)*

### 2.1 Architecture

One global player record with base ratings. Each league can optionally store rating overrides for any player attribute.

```
Global Player: Dexterez (Power: 65, Contact: 72, Trait1: Clutch)
  └── League A: no overrides → effective: Power 65, Contact 72, Trait1: Clutch
  └── League B: override Power → 99 → effective: Power 99, Contact 72, Trait1: Clutch
  └── League C: override Trait1 → RBI Hero → effective: Power 65, Contact 72, Trait1: RBI Hero
```

### 2.2 Override Store

New IndexedDB store or sub-store:

```typescript
interface LeaguePlayerOverrides {
  [leagueId: string]: {
    [playerId: string]: Partial<PlayerAttributes>;
  };
}

// PlayerAttributes includes ALL overridable fields:
// ratings (power, contact, speed, fielding, arm, velocity, junk, accuracy)
// traits (trait1, trait2)
// personality, chemistry
// position (primaryPosition, secondaryPosition)
// arsenal
// age, bats, throws, nickname
// hometown
// Any field that can differ per-league
```

### 2.3 Effective Player Resolution

At game time (or anywhere a player's attributes are needed in a league context):

```typescript
function getEffectivePlayer(playerId: string, leagueId: string): Player {
  const basePlayer = globalPlayers.get(playerId);
  const overrides = leaguePlayerOverrides[leagueId]?.[playerId] ?? {};
  return { ...basePlayer, ...overrides };
}
```

### 2.4 Constraints

- A player CANNOT exist more than once within the same league
- A team CANNOT appear more than once within the same league
- Overrides are optional — if no override exists for a field, the base value applies

---

## 3. Per-League Team Assignments *(Q2)*

### 3.1 Data Model Change

Replace `Player.currentTeamId: string | null` with:

```typescript
interface LeagueAssignment {
  leagueId: string;
  teamId: string;
  rosterStatus: 'MLB' | 'FARM' | 'FREE_AGENT';
}

// On the Player record:
interface Player {
  // ... existing fields ...

  // REMOVED: currentTeamId: string | null;
  // REMOVED: rosterStatus: 'MLB' | 'FARM' | 'FREE_AGENT';

  // NEW:
  leagueAssignments: LeagueAssignment[];
}
```

### 3.2 Query Patterns

```typescript
// "What team is Dexterez on in League A?"
player.leagueAssignments.find(a => a.leagueId === leagueId)?.teamId

// "Who is on the Sirloins' roster in League A?"
allPlayers.filter(p =>
  p.leagueAssignments.some(a => a.leagueId === leagueId && a.teamId === teamId)
)

// "What leagues is Dexterez in?"
player.leagueAssignments.map(a => a.leagueId)
```

### 3.3 Migration

Existing `currentTeamId` auto-migrates to a single-entry `leagueAssignments` array:

```typescript
// Before:
{ currentTeamId: "sirloins-123", rosterStatus: "MLB" }

// After:
{ leagueAssignments: [{ leagueId: "league-a", teamId: "sirloins-123", rosterStatus: "MLB" }] }
```

The `leagueId` is derived from the team's current `leagueIds[0]`. No data loss.

---

## 4. Custom Roster Construction *(Q3)*

**Solved by §2 + §3.** No additional data model changes needed.

Same team branding (name, colors, stadium, logo) can exist in multiple leagues with completely different player assignments via `leagueAssignments`. The team record is a single entity; the roster composition varies per league.

**Example:**
- Sirloins in League A: Dexterez, Smith, Jones
- Sirloins in League B: Garcia, Williams, Brown
- Same team record, different `leagueAssignments` per player

---

## 5. Mode Isolation — Franchise & Elimination Deep-Copy *(Q4)*

### 5.1 Franchise Creation

When the user completes the franchise setup wizard and confirms, ALL player and team data is deep-copied into a franchise-specific IndexedDB store:

```
For each player in the source league:
  → Compute effective state: merge base ratings + league overrides
  → Write flat player record to franchise-specific store
  → Set editHistory: [] (clean start)

For each team in the source league:
  → Copy team branding (name, colors, stadium, logo)
  → Copy roster assignments from that league's context

For league settings:
  → Copy rules preset, conference/division structure
```

### 5.2 Post-Creation Isolation

- The franchise is fully independent from League Builder
- ALL reads come from the franchise-specific store
- ALL writes (aging, trades, development, injuries) go to the franchise-specific store
- League Builder is NEVER referenced after creation
- Multiple franchises can coexist independently (each has its own store)

### 5.3 Franchise Aging/Evolution

`seasonTransitionEngine.ts` must be refactored:

**Current (BROKEN):**
```typescript
import { getAllPlayers, savePlayer } from '../utils/leagueBuilderStorage';
// Writes directly to globalPlayers — corrupts all modes
```

**Required:**
```typescript
import { getAllPlayers, savePlayer } from '../utils/franchisePlayerStorage';
// Writes to franchise-specific store — isolated
```

The franchise store uses the same `Player` interface but is a completely separate IndexedDB database keyed by franchise ID.

### 5.4 Elimination Brackets

Same deep-copy approach as franchise. Bracket creation copies all players from the source league into a bracket-specific store. The bracket owns its data independently.

### 5.5 Edit History in Franchise/Elimination

- Starts clean (no League Builder history carried over)
- Tracks franchise-era changes only (aging, trades, development, user edits)
- Uses the same `editHistory` format as League Builder (§7)
- Example entry: `{ date: "2026-04-15", field: "power", oldValue: 65, newValue: 63, context: "aging" }`

---

## 6. Exhibition Player Ratings Snapshot *(Q5)*

### 6.1 Snapshot on Game Completion

When an exhibition game completes via `processCompletedGame()`, capture the full effective state of every player in the game:

```typescript
// Added to PersistedGameState:
interface PersistedGameState {
  // ... existing fields ...

  // NEW:
  playerRatingsSnapshots: Record<string, PlayerRatingsSnapshot>;
}
```

### 6.2 PlayerRatingsSnapshot Interface

```typescript
interface PlayerRatingsSnapshot {
  // Identity
  playerId: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  hometown: { city: string; state: string };
  age: number;
  gender: 'M' | 'F';
  bats: 'L' | 'R' | 'S';
  throws: 'L' | 'R';

  // Position
  primaryPosition: Position;
  secondaryPosition?: Position;

  // Ratings (effective = base + league overrides merged)
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;
  velocity: number;
  junk: number;
  accuracy: number;

  // Arsenal, traits, personality
  arsenal: PitchType[];
  overallGrade: Grade;
  trait1?: Trait;
  trait2?: Trait;
  personality: Personality;
  chemistry: Chemistry;

  // Status at game time
  morale: number;
  mojo: MojoState;
  fame: number;
  salary: number;
}
```

### 6.3 How It's Used

- **Almanac exhibition player page:** Shows the player's attributes/ratings FROM the game-time snapshot, not current League Builder state
- **Historical accuracy:** If the user changed a player's Power from 65 to 85 between games, each game's snapshot preserves the correct value
- **No retroactive corruption:** Even if the user later deletes or modifies the player in League Builder, archived game snapshots remain intact

---

## 7. Player Edit History *(Q6)*

### 7.1 Data Model

```typescript
interface EditHistoryEntry {
  date: string;                              // ISO timestamp
  field: string;                             // "power", "trait1", "hometown", etc.
  oldValue: any;
  newValue: any;
  context: 'base' | 'league-override';       // base rating change or league-specific?
  leagueId?: string;                         // present only if context = 'league-override'
}

// On the Player record:
interface Player {
  // ... existing fields ...

  // NEW:
  editHistory: EditHistoryEntry[];
}
```

### 7.2 What Triggers an Entry

| Action | Tracked? | Context |
|--------|----------|---------|
| User edits base rating in player editor | ✅ YES | `'base'` |
| User sets/changes a league override | ✅ YES | `'league-override'` + leagueId |
| User removes a league override (reset to base) | ✅ YES | `'league-override'` + leagueId |
| User changes hometown | ✅ YES | `'base'` |
| Initial player creation (SMB4 seeding, manual create) | ❌ NO | — |
| Auto-generated changes (salary recalc, grade recalc) | ❌ NO | — |
| Franchise aging/development | ❌ NO (tracked in franchise store separately) | — |

### 7.3 Almanac Integration

The exhibition player page shows the edit history timeline alongside game dates. The user can see when changes were made and correlate them with game performance.

---

## 8. New Player Attribute — Hometown *(Q5)*

### 8.1 Field Definition

```typescript
interface Player {
  // ... existing fields ...

  // NEW:
  hometown: {
    city: string;   // e.g., "Tulsa"
    state: string;  // e.g., "OK"
  };
}
```

### 8.2 Generation

- Auto-generated at player creation time from a US city/state database
- Weighted distribution (larger cities more likely, but all states represented)
- SMB4 seeded players: generated at seed time

### 8.3 User Interaction

- Displayed in the player editor as editable text fields
- "Randomize" button next to the hometown field generates a new random city/state
- Included in per-league overrides (user can set a different hometown per league if desired)
- Included in the exhibition game snapshot (§6)

---

## 9. Player Editor UX Changes *(Q7)*

### 9.1 Context Tabs

The player editor gains context tabs at the top:

```
[BASE]  [KBL Classic]  [KBL Modded]  [Summer League]
```

- **BASE** = editing global default attributes. Changes here affect all leagues that don't have overrides.
- **League tab** = shows effective values (base + overrides merged). User can override ANY attribute for that specific league.

### 9.2 Override Indicators

When viewing a league tab:
- Fields using base values appear normal
- Fields with active overrides get a visual indicator (highlight color, icon, or border)
- Each overridden field has a "Reset to base" action (removes the override)

### 9.3 Overridable Attributes

ALL player attributes can be overridden per-league:
- Numerical ratings (power, contact, speed, fielding, arm, velocity, junk, accuracy)
- Traits (trait1, trait2)
- Personality, chemistry
- Position (primaryPosition, secondaryPosition)
- Arsenal (pitch types)
- Age, bats, throws
- Nickname, hometown

---

## 10. Implementation Sequence

### Phase 1: Data Model (Foundation)
1. Add `hometown` field to Player interface + generation logic
2. Add `editHistory` field to Player interface + tracking hooks
3. Replace `currentTeamId` with `leagueAssignments[]` + migration script
4. Create `leaguePlayerOverrides` store
5. Implement `getEffectivePlayer(playerId, leagueId)` utility

### Phase 2: Mode Isolation
6. Create franchise-specific player/team IndexedDB store
7. Implement franchise deep-copy at creation (merge base + overrides → flat record)
8. Refactor `seasonTransitionEngine` to write to franchise store
9. Refactor `franchiseGameTrackerRoster` to read from franchise store
10. Implement elimination bracket deep-copy (same pattern as franchise)

### Phase 3: Exhibition Snapshots
11. Add `playerRatingsSnapshots` to `PersistedGameState`
12. Capture snapshots in `processCompletedGame()` for exhibition games
13. Update `ExhibitionGame.tsx` to pass league context for override resolution

### Phase 4: Player Editor UX
14. Add context tabs (BASE + league tabs) to player editor
15. Implement override editing with visual indicators
16. Add "Reset to base" per-field action
17. Add hometown field with "Randomize" button

---

## 11. Files Affected (Estimated)

### High Impact (core data model changes)
| File | Change |
|------|--------|
| `src/utils/leagueBuilderStorage.ts` | Player interface, leagueAssignments, editHistory, hometown, override store |
| `src/utils/gameStorage.ts` | PersistedGameState + playerRatingsSnapshots |
| `src/engines/seasonTransitionEngine.ts` | Read/write from franchise store, not globalPlayers |
| `src/src_figma/app/utils/franchiseGameTrackerRoster.ts` | Read from franchise store |
| `src/utils/franchiseInitializer.ts` | Deep-copy logic at franchise creation |
| `src/utils/processCompletedGame.ts` | Capture player snapshots on exhibition completion |

### Medium Impact (query pattern changes)
| File | Change |
|------|--------|
| `src/src_figma/app/pages/ExhibitionGame.tsx` | Pass league context for override resolution |
| `src/src_figma/app/pages/LeagueBuilderPlayers.tsx` | Player editor tabs, override UI |
| Any file using `player.currentTeamId` | Migrate to `leagueAssignments` query |
| Any file using `getPlayersByTeam()` | Add leagueId parameter |

### New Files
| File | Purpose |
|------|---------|
| `src/utils/franchisePlayerStorage.ts` | Franchise-specific player/team IndexedDB store |
| `src/utils/playerOverrides.ts` | Override resolution utility (`getEffectivePlayer`) |
| `src/utils/editHistoryTracker.ts` | Edit history logging utility |
| `src/data/usCities.ts` | US city/state database for hometown generation |

---

## 12. Cross-References

| Spec | Relationship |
|------|-------------|
| `ALMANAC_UX_SPEC.md` | This refactor is a PREREQUISITE for the Almanac (§12) |
| `LEAGUE_BUILDER_SPEC.md` | This spec AMENDS it (§1.1 principles preserved, data model extended) |
| `MODE_1_LEAGUE_BUILDER_FINAL.md` | Canonical League Builder spec — this refactor aligns code with its stated principles |

---

*Synthesized from LEAGUE_BUILDER_REFACTOR_TRANSCRIPT.md (Q1–Q7). Every decision traceable to a specific Q&A exchange.*
