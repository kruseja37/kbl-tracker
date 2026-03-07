# DATA INTEGRITY AUDIT — Elimination Mode Step 0

**Date:** 2026-03-07
**Branch:** `feature/elim-step0-data-integrity`
**Status:** COMPLETE
**Build:** PASS (tsc exit 0) | **Tests:** 4,028 pass / 0 fail / 103 files

---

## 1. Field-by-Field Flow Table

Legend: ✅ = present | ❌ = absent | 🔶 = hardcoded/default | ➡️ = derived

| Field | PlayerData | LB Player (convertPlayer) | RosterPlayer (lineupLoader) | GameTracker state | Available to engines? |
|---|---|---|---|---|---|
| **IDENTITY** | | | | | |
| id | ✅ `id` | ✅ `id` ← player.id | ✅ `playerId` ← player.id | ❌ name-hash ID (game session) | 🔶 name-hash; LB ID on Player.playerId |
| firstName | ➡️ from `name` | ✅ `firstName` ← split(name)[0] | ➡️ combined to `name` | ✅ `name` | ✅ via name |
| lastName | ➡️ from `name` | ✅ `lastName` ← split(name)[1..] | ➡️ combined to `name` | ✅ `name` | ✅ via name |
| nickname | ❌ not in SMB4 | ✅ field exists (optional, never set from SMB4) | ❌ | ❌ | ❌ |
| age | ✅ `age` | ✅ `age` ← player.age | ✅ `age` ← player.age | ✅ passed to registerPlayer | ✅ fitness engine |
| gender | ✅ `gender` | ✅ `gender` ← player.gender | ❌ not on interface | ❌ | ❌ (not needed by engines) |
| **HANDEDNESS** | | | | | |
| bats | ✅ `bats` (L/R/S) | ✅ `bats` ← player.bats | ✅ `battingHand` ← player.bats | ✅ on Player | ✅ |
| throws | ✅ `throws` (L/R) | ✅ `throws` ← player.throws | ✅ `throws` (Player) / `throwingHand` (Pitcher) | ✅ | ✅ |
| **POSITION** | | | | | |
| primaryPosition | ✅ | ✅ ← mapped (pitcherRole for pitchers) | ✅ `position` | ✅ via battingOrder assignment | ✅ |
| secondaryPosition | ✅ (optional) | ✅ ← player.secondaryPosition | ✅ `secondaryPosition` | ✅ on Player | ✅ |
| isPitcher | ✅ | ❌ not on LB Player (derived from position) | ❌ | ❌ | ❌ (not needed — position suffices) |
| pitcherRole | ✅ (SP/RP/CP/SP-RP) | ➡️ mapped to primaryPosition | ❌ (position covers it) | ❌ | ❌ |
| role | ✅ (STARTER/BENCH/etc.) | ❌ not on LB Player | ❌ | ❌ | ❌ (not needed — lineup order determines) |
| **BATTING RATINGS** | | | | | |
| power | ✅ `batterRatings.power` | ✅ `power` ← ?? 50 | ✅ `power` | ✅ on Player | ✅ |
| contact | ✅ `batterRatings.contact` | ✅ `contact` ← ?? 50 | ✅ `contact` | ✅ on Player | ✅ |
| speed | ✅ `batterRatings.speed` | ✅ `speed` ← ?? 50 | ✅ `speed` | ✅ on Player | ✅ |
| fielding | ✅ `batterRatings.fielding` | ✅ `fielding` ← ?? 50 | ✅ `fieldingRating` | ✅ on Player | ✅ |
| arm | ✅ `batterRatings.arm` | ✅ `arm` ← ?? 50 | ✅ `arm` | ✅ on Player | ✅ |
| **PITCHING RATINGS** | | | | | |
| velocity | ✅ `pitcherRatings.velocity` | ✅ `velocity` ← ?? 50 | ✅ `velocity` | ✅ on Pitcher + Player | ✅ |
| junk | ✅ `pitcherRatings.junk` | ✅ `junk` ← ?? 50 | ✅ `junk` | ✅ on Pitcher + Player | ✅ |
| accuracy | ✅ `pitcherRatings.accuracy` | ✅ `accuracy` ← ?? 50 | ✅ `accuracy` | ✅ on Pitcher + Player | ✅ |
| **ARSENAL** | | | | | |
| arsenal | ✅ (optional, pitchers) | ✅ `arsenal` ← player.arsenal ∥ [] | ✅ `arsenal` | ✅ on Player + Pitcher | ✅ |
| **GRADE** | | | | | |
| overall | ✅ (letter grade) | ✅ `overallGrade` ← player.overall | ✅ `overallGrade` | ✅ on Player + Pitcher | ✅ |
| **TRAITS** | | | | | |
| trait1 | ✅ `traits.trait1` | ✅ `trait1` ← player.traits.trait1 | ✅ `trait1` | ✅ passed to registerPlayer | ✅ fitness engine |
| trait2 | ✅ `traits.trait2` | ✅ `trait2` ← player.traits.trait2 | ✅ `trait2` | ✅ passed to registerPlayer | ✅ fitness engine |
| **PERSONALITY & CHEMISTRY** | | | | | |
| personality | ❌ not in SMB4 data | 🔶 hardcoded `'Competitive'` | ✅ `personality` | ✅ on Player + Pitcher | 🔶 always 'Competitive' |
| chemistry | ✅ (3-letter code) | ✅ `chemistry` ← CHEMISTRY_MAP lookup | ✅ `chemistry` | ✅ on Player + Pitcher | ✅ |
| **STATE** | | | | | |
| morale | ❌ not in SMB4 data | 🔶 hardcoded `75` | ❌ not on RosterPlayer | ❌ | 🔶 (managed by fanMoraleEngine) |
| mojo | ❌ not in SMB4 data | 🔶 hardcoded `'Normal'` | ✅ `mojo` (optional) | ✅ via playerStateHook | ✅ starts Normal |
| fame | ❌ not in SMB4 data | 🔶 hardcoded `0` | ❌ not on RosterPlayer | ❌ | 🔶 (managed by fameEngine) |
| **CONTRACT** | | | | | |
| salary | ❌ not in SMB4 data | ✅ computed via salaryCalculator | ❌ not on RosterPlayer | ❌ | ❌ (not needed in GameTracker) |
| contractYears | ❌ not in SMB4 data | ❌ not set (optional, franchise-only) | ❌ | ❌ | ❌ |
| **ROSTER** | | | | | |
| currentTeamId | ✅ `teamId` | ✅ ← player.teamId (null if FA) | ❌ not on RosterPlayer | ❌ | ❌ (not needed in-game) |
| rosterStatus | ➡️ from `role` | 🔶 hardcoded `'MLB'` | ❌ | ❌ | ❌ |

---

## 2. What Was Fixed (This Session)

### Fix 1: TeamRoster.Player interface — 15 new optional fields
**File:** `src/src_figma/app/components/TeamRoster.tsx:37-62`

Added: `playerId`, `power`, `contact`, `speed`, `fieldingRating`, `arm`, `velocity`, `junk`, `accuracy`, `arsenal`, `overallGrade`, `trait1`, `trait2`, `personality`, `chemistry`, `age`, `throws`, `secondaryPosition`

All optional (`?`), so existing code is fully backward-compatible.

### Fix 2: TeamRoster.Pitcher interface — 14 new optional fields
**File:** `src/src_figma/app/components/TeamRoster.tsx:64-90`

Added: `playerId`, `velocity`, `junk`, `accuracy`, `arsenal`, `overallGrade`, `trait1`, `trait2`, `personality`, `chemistry`, `age`, `secondaryPosition`, `power`, `contact`, `speed`, `fieldingRating`, `arm`

### Fix 3: lineupLoader.ts — Pass through all new fields
**File:** `src/src_figma/utils/lineupLoader.ts:20-56` (convertToRosterPlayer) and `45-82` (convertToRosterPitcher)

Both functions now pass through all League Builder Player fields into the new RosterPlayer/RosterPitcher fields.

### Fix 4: GameTracker.tsx — Real traits and age in registerPlayer
**File:** `src/src_figma/app/pages/GameTracker.tsx:840-900`

Previously: `registerPlayer(id, name, pos, 0, 'FIT', [], 25)` — hardcoded empty traits and age=25.
Now: `registerPlayer(id, name, pos, 0, 'FIT', [player.trait1, player.trait2].filter(Boolean), player.age ?? 25)` — uses real data from League Builder.

---

## 3. What Remains Hardcoded (With Justification)

| Field | Hardcoded Value | Justification |
|---|---|---|
| `personality` | `'Competitive'` | SMB4 does NOT expose personality separately. Chemistry is the closest concept. The 11-value `Personality` type exists for custom players. Acceptable default. |
| `morale` | `75` | Reasonable starting baseline. morale is managed by `fanMoraleEngine` during franchise play, not read from SMB4 data. |
| `mojo` | `'Normal'` | Correct starting state. Mojo changes during gameplay via `mojoEngine`. |
| `fame` | `0` | No SMB4 source for fame. Fame accrues through gameplay via `fameEngine`. |
| `salary` | Computed | Not hardcoded — computed via `salaryCalculator` from ratings + position. Correct behavior. |
| `rosterStatus` | `'MLB'` | All imported SMB4 players are MLB-active. FA/FARM are franchise operations. |
| `contractYears` | Not set | Franchise-only concept. Not in SMB4 source data. |
| `isCustom` | `false` | Correct for SMB4 imports. Custom players set this to `true`. |

### Chemistry Mapping (FIERY/GRITTY → Competitive)
`PlayerData.chemistry` has 7 values: SPI, DIS, CMP, SCH, CRA, FIERY, GRITTY.
`leagueBuilderStorage.Chemistry` has 5 values: Spirited, Disciplined, Competitive, Scholarly, Crafty.
FIERY and GRITTY are mapped to `Competitive` in `CHEMISTRY_MAP`. This is a reasonable default since SMB4's expanded chemistry types don't have 1:1 LB equivalents.

---

## 4. Game-Session Player IDs vs League Builder IDs

**Current state:** GameTracker uses name-hash IDs (`{team}-{normalized-name}`) for all internal state management. These are generated at game init and used throughout the session for:
- `gameState.currentBatterId`
- `playerStateHook` registration and lookup
- `AtBatEvent.batterContext.playerId`
- Fielder/runner identification

**League Builder `playerId`** is now available on `Player.playerId` and `Pitcher.playerId` for cross-referencing. It is NOT used as the game-session ID because:
1. Too many downstream code paths depend on the name-hash format
2. Name-hash IDs work for exhibition mode (no League Builder data)
3. Changing the ID scheme requires updating every `generatePlayerId` call site

**For Elimination Mode:** The roster snapshot (§5.2 of ELIMINATION_MODE_SPEC) will store the full `leagueBuilderStorage.Player` object, which contains the real `id`. The game-session ID can be linked back to the LB ID via `Player.playerId` on the roster data.

---

## 5. Roster Snapshot for Elimination Mode

The Elimination Mode roster snapshot (§5.2) should store the **full `leagueBuilderStorage.Player`** object, NOT the stripped `TeamRoster.Player`. This ensures all engine-required fields are available:

```typescript
interface EliminationRosterSnapshot {
  key: string;                          // `elim-roster-{eliminationId}-{teamId}`
  eliminationId: string;
  teamId: string;
  teamName: string;
  players: LeagueBuilderPlayer[];       // Full player data — all ratings, traits, arsenal
  lineup: LineupSlot[];
  startingRotation: string[];
  snapshotAt: number;
}
```

The `lineupLoader.ts` conversion (Step 0 fix) ensures that when `loadEliminationLineup()` is built (Step 6), the snapshot player data flows completely into `RosterPlayer`/`RosterPitcher` and through to `registerPlayer()` with real traits and age.

---

## 6. Pipeline Summary

```
playerDatabase.ts (PlayerData)
  ↓ convertPlayer() in leagueBuilderStorage.ts
  ↓   → id, firstName, lastName, age, gender, bats, throws ✅ direct
  ↓   → ratings (power, contact, speed, etc.) ✅ with ?? 50 fallback
  ↓   → arsenal, overallGrade, traits ✅ direct
  ↓   → chemistry ✅ via CHEMISTRY_MAP
  ↓   → personality 🔶 hardcoded 'Competitive' (no SMB4 source)
  ↓   → morale, mojo, fame 🔶 hardcoded defaults (runtime state, not source data)
  ↓
leagueBuilderStorage.Player (IndexedDB)
  ↓ lineupLoader.ts convertToRosterPlayer/Pitcher [FIXED]
  ↓   → name, position, battingOrder, stats, battingHand ✅ (existing)
  ↓   → playerId, all ratings, arsenal, grade, traits, personality, chemistry, age ✅ (NEW)
  ↓
TeamRoster.Player / TeamRoster.Pitcher [FIXED]
  ↓ GameTracker.tsx navigation state → registerPlayer [FIXED]
  ↓   → traits: [trait1, trait2].filter(Boolean) ✅ (was: [])
  ↓   → age: player.age ?? 25 ✅ (was: 25)
  ↓   → All ratings available on Player/Pitcher objects ✅ (was: absent)
  ↓
usePlayerState → fitnessEngine, mojoEngine → game state adjustments
```

---

## 7. Build & Test Verification

```
BUILD:
Command: npx tsc -b
Exit code: 0

TESTS:
Command: npx vitest run
Files: 103 passed
Tests: 4,028 passed / 0 failed
```

**Verdict: VERIFIED COMPLETE for Step 0 scope.**

---

## 8. Files Modified

| File | Change |
|---|---|
| `src/src_figma/app/components/TeamRoster.tsx` | Added 15 optional fields to Player, 14 to Pitcher |
| `src/src_figma/utils/lineupLoader.ts` | Pass through all LB fields in both convert functions |
| `src/src_figma/app/pages/GameTracker.tsx` | Use real traits/age in registerPlayer (4 call sites) |

**No KEEP.md protected files were modified.**
