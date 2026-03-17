# MODE 1 vs MODE 2 — Contradiction Resolutions

**Date:** 2026-02-24
**Status:** RESOLVED — All 11 contradictions adjudicated by JK
**Purpose:** Canonical decisions for resolving every contradiction found between MODE_1_LEAGUE_BUILDER.md (v1.1) and MODE_2_FRANCHISE_SEASON.md (v1.1). Each resolution specifies which document(s) must be updated and the exact change required.

---

## Project-Wide Casing Convention (Cross-Cutting Decision)

Adopted as part of resolving #6, #8, #9, and applied retroactively to all enums:

| Category | Convention | Examples | Rationale |
|----------|-----------|----------|-----------|
| **Player-facing descriptive types** | PascalCase | `'Rattled'`, `'Fit'`, `'National'`, `'Competitive'` | Human-readable labels for states a user observes or selects |
| **System state/status enums** | UPPER_SNAKE | `'SCHEDULED'`, `'IN_PROGRESS'`, `'MLB'`, `'RETIRED'`, `'IN_HUNT'` | Machine states representing system-tracked statuses |
| **Abbreviation codes** | UPPERCASE short | `'4F'`, `'CB'`, `'CF'`, `'SFG'` | Compact identifiers for stored data |

**Rule of thumb:** If a user would see it as a label → PascalCase. If it's a system flag or status → UPPER_SNAKE. If it's a code/abbreviation → UPPERCASE short.

---

## Resolution #1 — Mojo Scale: 6-Tier Is Canonical

**Decision:** 6-tier scale is authoritative. Mode 2 §14.1 and all downstream tables are wrong.

**Canonical definition (owned by Spine, referenced by both docs):**

```typescript
type MojoLevel = 'Rattled' | 'Tense' | 'Neutral' | 'Locked-In' | 'On Fire' | 'Jacked';
// Numeric mapping: Rattled=-2, Tense=-1, Neutral=0, Locked-In=+1, On Fire=+2, Jacked=+3
```

**Required changes to MODE_2:**

1. **§14.1** — Replace the 5-level table with the 6-level scale. Remove VERY_HIGH/HIGH/NEUTRAL/LOW/VERY_LOW enum aliases entirely. Add "On Fire" row. Rename "Normal" → "Neutral". Update value range to -2 to +3.

2. **§14.9** (Fame modifiers) — Add `On Fire (+2)` entry. Current table maps [-2] through [+2]; must expand to [+3] for Jacked.

3. **§14.10** (WAR/clutch multipliers) — Add `On Fire (+2)` row. Shift Jacked from +2 to +3. Example updated mapping:
   ```
   Rattled(-2): WAR 1.15×, Clutch 1.30×
   Tense(-1):   WAR 1.07×, Clutch 1.15×
   Neutral(0):  WAR 1.00×, Clutch 1.00×
   Locked-In(+1): WAR 0.95×, Clutch 0.90×
   On Fire(+2): [NEW — needs values, interpolate between Locked-In and Jacked]
   Jacked(+3):  WAR 0.90×, Clutch 0.85×
   ```
   JK to confirm On Fire multiplier values when these tables are finalized.

4. All `mojo: number` type annotations using range -2 to +2 → expand to -2 to +3.

**No changes to MODE_1** — already correct.

---

## Resolution #2 — Schedule: User-Driven, No Auto-Generation

**Decision:** Mode 1's approach is canonical. KBL does NOT auto-generate schedules.

**Required changes to MODE_2:**

1. **§22.1** — Replace "Per C-079: Schedule is pre-generated + editable. Generated at season start based on league structure, then user can manually adjust." with:

   > **Per C-079:** Schedule is user-provided and editable. Users create the schedule during franchise setup via CSV upload, Screenshot/OCR extraction, or manual game-by-game entry (see MODE_1 §10). If no schedule was provided during franchise creation, the season starts with an empty schedule and users add games manually. In-season, users can add, edit, swap home/away, move, or remove games at any time.

2. Remove any references to "schedule generation algorithm" or "generated at season start" elsewhere in Mode 2.

**No changes to MODE_1** — already correct.

---

## Resolution #3 — Tiebreakers: Simple (Mode 1 Wins)

**Decision:** Option A — Run differential only, user decides if still tied. Fits v1 scope.

**Required changes to MODE_2:**

1. **§21.2** — Replace the 6-step cascade with:

   > **Tiebreaker:** Run differential. If teams are still tied after run differential, the user is prompted to decide the outcome. No automated cascade beyond run differential in v1.

2. Remove the head-to-head, division record, common opponents, last 20, and coin flip steps.

**No changes to MODE_1** — already correct.

---

## Resolution #4 — Playoff Series: User-Configured, No Restated Defaults

**Decision:** Playoff series lengths are fully user-configurable per series (1, 3, 5, 7, or 9 games each). Mode 2 must not restate defaults — it defers to Mode 1's rules preset.

**Required changes to MODE_2:**

1. **§21.3** — Replace the "Standard format" bullet list with:

   > Playoff structure (number of teams, series lengths, home-field format) is fully configurable in Mode 1's rules preset (see MODE_1 §9.2). Each playoff round (Wild Card, Division Series, Championship Series, World Series) can independently be set to 1, 3, 5, 7, or 9 games. Mode 2 reads the active franchise's rules snapshot and enforces it. See MODE_1 §9.3 for default preset values.

2. Remove the specific "Best-of-3", "Best-of-5", "Best-of-7" lines that contradict Mode 1's Standard Preset.

**No changes to MODE_1** — already correct. Mode 1 §9.2 already specifies `games: 1 | 3 | 5 | 7 | 9` per round, and §9.3 lists the Standard Preset defaults (WC=1, DS=3, CS=5, WS=7).

---

## Resolution #5 — PitchType: Two-Letter Abbreviations + UNK

**Decision:** Canonical type uses two-letter abbreviations. `CF` = cutter (not center field — context always disambiguates). `UNK` added for enrichment.

**Canonical definition:**

```typescript
type PitchType = '4F' | '2F' | 'CB' | 'SL' | 'CH' | 'FK' | 'CF' | 'SB' | 'UNK';
// 4F=4-seam fastball, 2F=2-seam fastball, CB=curveball, SL=slider,
// CH=changeup, FK=forkball, CF=cutter, SB=screwball, UNK=unknown
```

**Required changes to MODE_1:**

1. **§5.4** — Add `'UNK'` to the PitchType union. Add comment noting UNK is for enrichment contexts where pitch type is unidentified.

**Required changes to MODE_2:**

1. **§2.1 (pitchType field on AtBatEvent)** — Replace full-name strings with abbreviations:
   `pitchType?: PitchType;` (referencing the canonical type above)

2. **§4.3** — Update the pitch type selector description to list abbreviations with display labels:
   `Selector: 4F | 2F | CF | SL | CB | CH | SB | FK | UNK`
   (UI displays full names; stored value is abbreviation)

---

## Resolution #6 — GameStatus: UPPER_SNAKE, 5 Values

**Decision:** Mode 2's 5-value enum is canonical. UPPER_SNAKE casing per project convention.

**Canonical definition:**

```typescript
type GameStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'SIMULATED' | 'SKIPPED';
```

**Required changes to MODE_1:**

1. **§10.1** — Replace `status: 'scheduled' | 'completed' | 'skipped'` in the `ScheduledGame` interface with `status: GameStatus` referencing the canonical 5-value UPPER_SNAKE type. Add note: "At franchise creation, all games initialize as `'SCHEDULED'`. `IN_PROGRESS`, `COMPLETED`, `SIMULATED`, and `SKIPPED` are set by Mode 2 during gameplay."

**No changes to MODE_2** — already correct (assuming casing is already UPPER_SNAKE; verify during edit pass).

---

## Resolution #7 — Schedule Interface: Merged, Using GameDate

**Decision:** Single canonical interface. Date type is `GameDate`. Owned by Spine.

**Canonical definition:**

```typescript
interface ScheduledGame {
  id: string;                    // UUID
  gameNumber: number;            // Sequential within schedule
  homeTeamId: string;
  awayTeamId: string;
  fictionalDate: GameDate;       // "April 3, Year 1" — GameDate is canonical type name
  dayNumber?: number;            // Day within season (for ordering)
  time?: string;                 // Optional game time
  status: GameStatus;            // 5-value UPPER_SNAKE enum
  seriesId?: string;             // Auto-grouped into series
  result?: GameResult;           // null until completed
}
```

**Required changes to MODE_1:**

1. **§10.1** — Update `ScheduledGame` interface to match canonical shape above. Rename `FictionalDate` → `GameDate` throughout. Add `dayNumber?`, `time?`, `result?` fields.

2. **§10.2** — Rename "Fictional Date System" to reference `GameDate` type name.

**Required changes to MODE_2:**

1. **§22.1** — Replace `ScheduleEntry` with `ScheduledGame` (same interface name as Mode 1). Update all references from `ScheduleEntry` → `ScheduledGame` throughout Mode 2. Add note: "See SPINE_ARCHITECTURE.md for canonical ScheduledGame interface."

2. Replace `date: GameDate` with `fictionalDate: GameDate` to match field name.

---

## Resolution #8 — RosterLevel: UPPERCASE, 4 Values

**Decision:** Single canonical type, UPPERCASE, includes RETIRED.

**Canonical definition:**

```typescript
type RosterLevel = 'MLB' | 'FARM' | 'FREE_AGENT' | 'RETIRED';
```

**Required changes to MODE_1:**

1. **§5.3** — Rename `rosterStatus` field type from inline union to `RosterLevel`. Add `'RETIRED'` value.

**Required changes to MODE_2:**

1. **§2.3** — Update `fromLevel`/`toLevel` in TransactionEvent to use `RosterLevel` type (UPPERCASE). Replace `'mlb' | 'farm' | 'free_agent' | 'retired'` with `RosterLevel`.

---

## Resolution #9 — FitnessLevel: PascalCase Canonical

**Decision:** PascalCase from §2.1 is canonical. All UPPERCASE aliases and numeric comparisons are bugs.

**Canonical definition:**

```typescript
type FitnessLevel = 'Hurt' | 'Weak' | 'Strained' | 'Well' | 'Fit' | 'Juiced';
```

**Required changes to MODE_2:**

1. **§14.4** — Update table to use PascalCase values. Remove any UPPERCASE state names.

2. **§14.7** — Replace `player.fitness === 100` with `player.currentFitness === 'Fit'`. Replace `player.recentlyJuiced === false` with a proper boolean check against juiced cooldown.

3. **§14.9** — Replace `'JUICED'`, `'STRAINED'`, `'WEAK'` with `'Juiced'`, `'Strained'`, `'Weak'`.

4. **§14.10** — Same PascalCase update in WAR multiplier function.

5. **§14.11** — Confirm `currentFitness: FitnessLevel` uses PascalCase type. Remove any `FitnessState` alias references.

6. **Global** — Search for any remaining UPPERCASE fitness references and convert.

---

## Resolution #10 — Standings: Full Interface at Init

**Decision:** Mode 1 initializes the full `StandingsEntry` shape from Mode 2 §21.1.

**Required changes to MODE_1:**

1. **§12.3** — Replace the flat field list with reference to the canonical `StandingsEntry` interface. Specify initialization values:

   ```typescript
   // Standings initialization (per team)
   {
     teamId: team.id,
     wins: 0, losses: 0, winPct: 0, gamesBack: 0,
     streak: { type: 'W', count: 0 },
     last10: { wins: 0, losses: 0 },
     homeRecord: { wins: 0, losses: 0 },
     awayRecord: { wins: 0, losses: 0 },
     divisionRecord: { wins: 0, losses: 0 },
     runsScored: 0, runsAllowed: 0, runDifferential: 0,
     pythagoreanWinPct: null,      // Computed after first game
     magicNumber: null,             // Computed when applicable
     eliminationNumber: null,       // Computed when applicable
     playoffStatus: 'IN_HUNT',     // All teams start in hunt
   }
   ```

**No changes to MODE_2** — already correct (defines the target shape).

---

## Resolution #11 — Streak: Structured Object

**Decision:** Mode 2's structured object is canonical.

**Canonical definition:**

```typescript
streak: { type: 'W' | 'L'; count: number }
```

**Required changes to MODE_1:**

1. **§12.3** — Already addressed by Resolution #10 (full StandingsEntry initialization includes structured streak). No additional change needed beyond #10.

**No changes to MODE_2** — already correct.

---

## Summary: Required Edits by Document

### MODE_1_LEAGUE_BUILDER.md

| Resolution | Section(s) | Change |
|-----------|-----------|--------|
| #5 | §5.4 | Add `'UNK'` to PitchType |
| #6 | §10.1 | GameStatus → UPPER_SNAKE 5-value enum |
| #7 | §10.1, §10.2 | Merge ScheduledGame interface, rename FictionalDate → GameDate |
| #8 | §5.3 | rosterStatus → RosterLevel (UPPERCASE, add RETIRED) |
| #10 | §12.3 | Full StandingsEntry initialization |
| #11 | §12.3 | (Covered by #10) |

### MODE_2_FRANCHISE_SEASON.md

| Resolution | Section(s) | Change |
|-----------|-----------|--------|
| #1 | §14.1, §14.9, §14.10 | Expand mojo to 6-tier, fix naming, fix range |
| #2 | §22.1 | Remove "pre-generated" language, defer to Mode 1 §10 |
| #3 | §21.2 | Replace 6-step cascade with run_differential + user decides |
| #4 | §21.3 | Remove restated defaults, defer to Mode 1 §9.2-9.3 |
| #5 | §2.1, §4.3 | PitchType → abbreviations + UNK |
| #7 | §22.1 | ScheduleEntry → ScheduledGame, date → fictionalDate: GameDate |
| #8 | §2.3 | fromLevel/toLevel → RosterLevel (UPPERCASE) |
| #9 | §14.4, §14.7, §14.9, §14.10, §14.11 | FitnessLevel → PascalCase everywhere |

| #12 | §5.4 | Rename `Position` → split into `PrimaryPosition`, `SecondaryPosition`; add `FieldPosition` |
| #14 | §12.3, §13.2 | Rename `betweenAtBatEvents` store → `betweenPlayEvents` |
| #17 | §5.4 | Add clarifying note: DH is FieldPosition (in-game) not RosterPosition (player card) |

### MODE_2_FRANCHISE_SEASON.md (continued)

| Resolution | Section(s) | Change |
|-----------|-----------|--------|
| #12 | §2.1, §2.2, §7, §10, §11.3, §23.6 | Add `FieldPosition` definition; replace all undefined `FieldPosition` refs |
| #13 | §2.1, §11.2 | Expand pitcher role to 5 values |
| #15 | §2.1, §16.8 | Align personality structure to Mode 1 shape; fix `hiddenPersonality` ref |
| #16 | §8.5 | Fix storage estimate to league-wide formula |
| #18 | §18.1, §18.3, §23.1 | Fix "128g for SMB4" label; add Standard Preset example |
| #19 | §6.1 | Specify 1-9 innings range |

### SPINE_ARCHITECTURE.md (new entries needed)

| Type | Canonical Definition | Owner |
|------|---------------------|-------|
| `MojoLevel` | 6-tier PascalCase | Spine |
| `FitnessLevel` | 6-tier PascalCase | Spine |
| `GameStatus` | 5-value UPPER_SNAKE | Spine |
| `RosterLevel` | 4-value UPPERCASE | Spine |
| `PitchType` | 9-value abbreviation | Spine |
| `ScheduledGame` | Merged interface | Spine |
| `GameDate` | Canonical date type | Spine |
| `StandingsEntry` | Full interface | Spine |
| `PrimaryPosition` | CorePosition only | Spine |
| `SecondaryPosition` | CorePosition + CompositePosition | Spine |
| `FieldPosition` | 10-value in-game defensive slots | Spine |
| `PitcherRole` | 5-value in-game role | Spine |
| `Player.personality` / `Player.hiddenModifiers` | Canonical personality shape | Spine |

---

## Resolution #12 — Position Type Hierarchy: Roster vs In-Game

**Decision:** Two distinct type families. Composites are secondary-only roster designations indicating flexibility. In-game contexts use concrete defensive slots.

**Canonical definitions (owned by Spine):**

```typescript
// ═══════════════════════════════════════════════════════
// ROSTER CONTEXT — player cards, scouting, roster mgmt
// ═══════════════════════════════════════════════════════

// Core positions: valid as primary OR secondary
type CorePosition = 'C' | '1B' | '2B' | 'SS' | '3B' | 'LF' | 'CF' | 'RF' |
                    'SP' | 'RP' | 'CP' | 'SP/RP';

// Composite designations: valid as secondary ONLY — indicate flexibility
type CompositePosition = 'IF' | 'OF' | 'IF/OF' | '1B/OF';

// What shows on the player card
type PrimaryPosition = CorePosition;                    // Never a composite
type SecondaryPosition = CorePosition | CompositePosition;  // Can be composite or core

// ═══════════════════════════════════════════════════════
// IN-GAME CONTEXT — lineups, subs, fielding, enrichment
// ═══════════════════════════════════════════════════════

// Where a player is RIGHT NOW on the field
type FieldPosition = 'C' | '1B' | '2B' | 'SS' | '3B' | 'LF' | 'CF' | 'RF' | 'P' | 'DH';
```

**Player interface update:**

```typescript
interface Player {
  primaryPosition: PrimaryPosition;      // Never a composite
  secondaryPosition?: SecondaryPosition; // Can be composite (IF, OF, IF/OF, 1B/OF) or core
  // ...
}
```

**Composite-to-Eligible FieldPosition Mapping:**

| Composite | Eligible FieldPositions |
|-----------|------------------------|
| `IF` | 1B, 2B, SS, 3B |
| `OF` | LF, CF, RF |
| `IF/OF` | 1B, 2B, SS, 3B, LF, CF, RF |
| `1B/OF` | 1B, LF, CF, RF |

This mapping is used for lineup validation, substitution suggestions, and positional eligibility checks. When a player with `secondaryPosition: 'IF'` enters a game, the user assigns them to a concrete `FieldPosition` (e.g., `'SS'`).

**Key distinction:** `SP`, `RP`, `CP`, `SP/RP` are `RosterPosition` designations. In-game, all pitchers occupy the `'P'` `FieldPosition`. The roster designation determines rotation role; the field position is always `'P'` once they're on the mound.

**Required changes to MODE_1:**

1. **§5.4** — Rename `type Position` to the split types above. Add `FieldPosition` definition. Add note: "DH is a valid `FieldPosition` (in-game batting order slot) but never a `PrimaryPosition` or `SecondaryPosition`."

2. **§5.3** — Update Player interface to use `PrimaryPosition` and `SecondaryPosition` types.

3. **§7.3** — DepthChart keys should use `FieldPosition` values (the in-game slots), not `RosterPosition`.

**Required changes to MODE_2:**

1. **§2.1** — Add `FieldPosition` type definition. All existing `FieldPosition` references now have a canonical source.

2. **§2.2, §7** — Substitution types already use `FieldPosition` correctly; just needs the type import reference.

3. **§10, §11.3, §23.6** — Positional tables already use concrete positions + DH. Add note: "These tables use `FieldPosition` values (in-game slots). Composite roster designations are resolved to concrete slots at game time."

**ALGORITHMIC IMPACT — Position-Dependent Calculations:**

The following algorithms use position and must be verified against this type hierarchy after changes are applied:

| Algorithm | Location | Position Type Used | Impact |
|-----------|----------|-------------------|--------|
| **Grade calculation — position modifier** | Mode 1 §5.6 | Currently uses `Position` — must clarify: uses `PrimaryPosition` for the grade calc, since that determines the player's primary defensive value | Update to reference `PrimaryPosition` |
| **Prospect generation — stat bias table** | Mode 1 §5.8 | Uses position to apply stat shape biases (C gets +FLD, 1B gets +POW) — uses `PrimaryPosition` | Update to reference `PrimaryPosition` |
| **Scout accuracy table** | Mode 1 §8.6 | Uses position for accuracy deviation — uses `PrimaryPosition` | Update to reference `PrimaryPosition` |
| **fWAR — per-play calculation** | Mode 2 §10.7 | Uses `event.position` — this is `FieldPosition` (where player IS during the play) | Already correct conceptually; just needs type annotation |
| **fWAR — positional adjustment** | Mode 2 §11.3 | Per-48-games adjustment by position — uses `FieldPosition` | Already correct; uses in-game slots including DH |
| **fWAR — position modifier table** | Mode 2 §10.6 | `POSITION_MODIFIERS` for putout/assist/error — uses `FieldPosition` | Already correct |
| **fWAR — star play difficulty** | Mode 2 §10.4 | Not position-dependent | No impact |
| **pWAR — replacement level** | Mode 2 §11.2 | Uses starter/reliever share, not position | No impact |
| **bWAR — park factor adjustment** | Mode 2 §11.1 | Not position-dependent | No impact |
| **rWAR — baserunning** | Mode 2 §11.4 | Not position-dependent | No impact |
| **mWAR — manager decisions** | Mode 2 §11.5 | Not position-dependent | No impact |
| **Salary calculation** | Mode 1 (references SALARY_SYSTEM_SPEC) | Uses grade + position for salary tiers — must use `PrimaryPosition` | **Verify salary tables reference PrimaryPosition, not composites** |
| **Positional multipliers** | Mode 2 §23.6 | Uses concrete positions + DH — `FieldPosition` | Already correct |
| **Fielding inference matrices** | Mode 2 §10.2 | Uses field direction → fielder position — `FieldPosition` | Already correct |
| **DP chain tables** | Mode 2 §10.3 | Uses concrete defensive positions — `FieldPosition` | Already correct |
| **Lineup validation** | Mode 1 §7.4, Mode 2 §7.5 | `positionMinimums` uses concrete positions — but needs composite resolution for substitution eligibility | Add composite-to-eligible mapping lookup |
| **Depth chart** | Mode 1 §7.3 | Keys are positional slots — should be `FieldPosition` | Update DepthChart interface keys |

**Critical follow-ups once these specs are updated:**
1. **Salary system** — verify salary calculation uses `PrimaryPosition` and handles pitcher sub-types (SP/RP/CP/SP/RP) correctly
2. **fWAR** — verify that when a composite-secondary player plays a game at a specific `FieldPosition`, fWAR credits the actual position played, not the roster designation
3. **Lineup validation** — implement the composite-to-eligible mapping so users can slot an `IF` player into any infield `FieldPosition`

---

## Resolution #13 — Pitcher Game Role: 5-Value Enum

**Decision:** Option A — expand to 5 explicit roles. Remove generic `'reliever'`.

**Canonical definition:**

```typescript
type PitcherRole = 'starter' | 'closer' | 'setup' | 'middle' | 'mop_up';
```

**Leverage index reference values:**

| Role | Typical LI | pWAR Multiplier |
|------|-----------|-----------------|
| `starter` | N/A (full game) | 1.0 (no LI mult) |
| `closer` | 1.8 | 1.40 |
| `setup` | 1.3 | 1.15 |
| `middle` | 0.9 | 0.95 |
| `mop_up` | 0.5 | 0.75 |

**Role assignment:** Role is derived at runtime from actual usage patterns (average LI, save opportunities, entry inning), not user-assigned. The `RosterPosition` (`RP`, `CP`, `SP/RP`) determines initial expectations; `PitcherRole` is the in-game/season classification.

**Required changes to MODE_2:**

1. **§2.1** — Update `pitcherContext.role` to 5-value enum.
2. **§11.2** — Confirm all 5 roles have leverage multipliers (already documented for all 5 in the descriptive text).

---

## Resolution #14 — IndexedDB Store: `betweenPlayEvents`

**Decision:** Rename to match Mode 2's event type name.

**Required changes to MODE_1:**

1. **§12.3** — Change "betweenAtBatEvents store" → "betweenPlayEvents store".
2. **§13.2** — Change `betweenAtBatEvents` → `betweenPlayEvents` in the DB structure listing.

**No changes to MODE_2** — already uses `BetweenPlayEvent` throughout.

---

## Resolution #15 — Personality Structure: Mode 1 Shape Canonical

**Decision:** Mode 1's flat structure is canonical. Two separate fields on Player.

**Canonical definition:**

```typescript
interface Player {
  personality: PersonalityType;         // 'Competitive', etc. — visible to user
  hiddenModifiers: HiddenModifiers;     // { loyalty, ambition, resilience, charisma } — never shown as numbers
}

interface HiddenModifiers {
  loyalty: number;       // 0-100
  ambition: number;      // 0-100
  resilience: number;    // 0-100
  charisma: number;      // 0-100
}
```

**Required changes to MODE_2:**

1. **§2.1** — Replace `PlayerPersonality` interface with reference to the canonical Player shape. In `batterContext` and `pitcherContext`, use:
   ```typescript
   personality?: PersonalityType;           // visible type snapshot
   hiddenModifiers?: HiddenModifiers;       // snapshot for engine use, never shown
   ```

2. **§16.8** — Replace `player.hiddenPersonality` with `player.personality` (for the visible type used in quote generation) and `player.hiddenModifiers` (for modifier-influenced behavior). The 80/20 rule applies to `player.personality` (visible type), not a separate hidden field.

---

## Resolution #16 — Storage Estimate: League-Wide Formula

**Decision:** Fix Mode 2's misleading per-team figure.

**Required changes to MODE_2:**

1. **§8.5** — Replace:
   > ~500 bytes per at-bat, ~70 per game = ~35KB/game, ~5.7MB for 162-game season.

   With:
   > ~500 bytes per at-bat event, ~35KB per completed game. Per-season league-wide total: `(numTeams × gamesPerTeam / 2) × 35KB`. For a 16-team, 32-game league: ~9MB. For a 32-team, 162-game league: ~91MB. See MODE_1 §13.3 for full storage projections.

---

## Resolution #17 — DH Clarification (Resolved by #12)

**Decision:** No contradiction once #12's type hierarchy is in place. DH is a valid `FieldPosition` but never a `PrimaryPosition` or `SecondaryPosition`.

**Required changes to MODE_1:**

1. **§5.4** — Add note: "DH is not a `PrimaryPosition` or `SecondaryPosition` — no player has DH on their player card. It IS a valid `FieldPosition`: an in-game batting order slot used when the DH rule is active. See SPINE_ARCHITECTURE.md for the `FieldPosition` vs `PrimaryPosition`/`SecondaryPosition` distinction."

**No changes to MODE_2** — DH correctly appears in `FieldPosition`-based tables (§10.6, §11.3, §23.6).

---

## Resolution #18 — Scaling Example Labels

**Decision:** Fix misleading "128g for SMB4" label. Add Standard Preset examples.

**Required changes to MODE_2:**

1. **§18.1** — Change `gamesPerSeason: number; // e.g., 128 for SMB4` to `gamesPerSeason: number; // e.g., 32 for Standard Preset`. Same for `inningsPerGame: number; // e.g., 7 for Standard Preset`.

2. **§18.3** — Add header note: "Examples below use 128g/6inn configuration to demonstrate scaling math. The Standard Preset is 32g/7inn (factor = 0.154). See MODE_1 §9.3 for all preset configurations."

3. **§23.1** — Same labeling fix. Add Standard Preset scaling example:
   > **Standard Preset (32g × 7inn, factor = 0.154):** 500 HR career → 77 HR. 3000 Hits → 462 Hits. 200 K pitcher season → 31 K.

---

## Resolution #19 — Innings Range: Specify 1-9

**Decision:** Mode 2 must reference Mode 1's authoritative range.

**Required changes to MODE_2:**

1. **§6.1** — Replace "Standard 9 innings (configurable to 7 or other values via League Rules)" with:
   > Standard 9 innings (configurable 1-9 per League Rules; see MODE_1 §9.2).

---

## Resolution #20 — Free Agency: Clarify V2 Scope

**Decision:** Free agency as an offseason phase exists in v1. The V2 deferral is for the persistent marketplace UI, not the basic transaction.

**Required changes to MODE_1:**

1. **§14** — Change V2 table entry from "Free agent pool management | V2 | Deferred — no free agent pool in v1" to:
   > "Free agent marketplace UI (browsing, bidding, market dynamics) | V2 | Free agency as an offseason phase exists in v1 (see §2.5 Phase 6 and MODE_3). The V2 deferral is for the persistent marketplace with AI bidding, browse/search UI, and market dynamics — not the basic free agent signing transaction."

**No changes to MODE_2** — TransactionEvent `free_agent_signing` type is correct for v1 scope.

---

## Resolution #21 — Beat Reporters, Managers, Scouts: Add to Mode 1 Handoff

**Decision:** Mode 1 must initialize these named NPCs during franchise creation.

**Required changes to MODE_1:**

1. **§1.2** (What Mode 1 Produces) — Add item 9:
   > 9. **Named NPCs** — one beat reporter, one manager, and one scout per team (auto-generated names, user-editable)

2. **§12.1** (Initialization Sequence) — Add step between current steps 9 and 10:
   ```typescript
   // 9.5. Initialize named NPCs
   for (const team of teams) {
     // Beat reporter: random personality per MODE_2 §16.2 weights
     await db.put('beatReporters', {
       id: generateId(),
       firstName: generateName('first'),
       lastName: generateName('last'),
       teamId: team.id,
       personality: weightedRandom(REPORTER_PERSONALITY_WEIGHTS),
       alignment: 'NEUTRAL',
       revealLevel: 'SURFACE',
       trustScore: 50,
       moraleInfluence: 0,
       tenure: 0,
       reputation: 'ROOKIE',
       storiesWritten: 0,
       hiredDate: { month: 'March', year: 1 },
     });

     // Manager: name only (mechanical effects TBD)
     await db.put('managers', {
       id: generateId(),
       firstName: generateName('first'),
       lastName: generateName('last'),
       teamId: team.id,
     });

     // Scout: specialty/weakness per §8.6
     await db.put('scouts', createScoutProfile(team.id));
   }
   ```

3. **§13.2** (DB Structure) — Add stores to franchise DB listing:
   ```
   ├── beatReporters
   ├── managers
   ├── scouts
   ```

**No changes to MODE_2** — §16.1 already expects these entities. Just needs them to exist at franchise creation.

---

## Resolution #22 — Mode 2 §1.4: Second "Pre-Generated" Reference

**Decision:** Additional edit location for Resolution #2.

**Required changes to MODE_2:**

1. **§1.4 item 6** — Change:
   > "**Schedule** — pre-generated, user-editable game schedule (per C-079)"

   To:
   > "**Schedule** — user-provided, editable game schedule (per C-079 and MODE_1 §10)"

This is an addendum to Resolution #2, not a new resolution.

---

## Resolution #23 — `LineupEntry` Type: Define in Spine

**Decision:** Define the missing type. Owned by Spine.

**Canonical definition:**

```typescript
interface LineupEntry {
  playerId: string;
  playerName: string;
  battingOrder: number;              // 1-9
  fieldPosition: FieldPosition;      // Where they play in this game
  primaryPosition: PrimaryPosition;  // Roster position (for display context)
}
```

**Required changes to MODE_2:**

1. **§2.4** (GameRecord) — Add note: "See SPINE_ARCHITECTURE.md for `LineupEntry` interface."

**No changes to MODE_1** — Mode 1 does not set lineups (per §7.1).

---

## Resolution #24 — True Value / Trade Base Value: Pull from SALARY_SYSTEM_SPEC

**Decision:** True Value and trade base value formulas live in the salary system. Mode 2's designation system (§17) and trade mechanics (§19) must reference the salary system for these calculations — not define them inline.

**Required changes to MODE_2:**

1. **§17.3** (Fan Favorite) — Add note: "Value Delta = True Value − Contract. True Value calculated per SALARY_SYSTEM_SPEC (WAR-based market valuation). See salary system gospel for formula."

2. **§17.4** (Albatross) — Same note.

3. **§19.1** — Replace inline `calculateTradeValue` stub with: "Trade base value calculated per SALARY_SYSTEM_SPEC. The Albatross 15% discount applies after base value calculation."

**Follow-up action:** When the SALARY_SYSTEM gospel is drafted (either standalone or as part of Spine), it must define:
- `calculateTrueValue(player, seasonStats)` — WAR-to-dollars conversion
- `calculateValueDelta(player, seasonStats)` — True Value minus contract
- `calculateTradeBaseValue(player, seasonStats)` — base value for trade evaluation (age curve, contract premium)
- `dollarsPerWAR` calibration constant

These formulas are critical dependencies for the designation system and trade mechanics. Until the salary gospel exists, Fan Favorite / Albatross designations cannot be fully implemented.

**No changes to MODE_1** — Mode 1's salary calculation (§5.6 grade → salary) is the initial assignment only. True Value is a Mode 2 runtime calculation.

---

## Resolution #25 — ChemistryType: Add Potency Placeholder to Mode 2

**Decision:** Option A — Chemistry-trait potency is a v1 feature. Add placeholder to Mode 2's modifier registry.

**Required changes to MODE_2:**

1. **§15** (Modifier Registry) — Add new subsection §15.5:

   > ### 15.5 Chemistry-Trait Potency
   >
   > Each player's `ChemistryType` (one of 5 types: Competitive, Spirited, Crafty, Scholarly, Disciplined — see MODE_1 §5.4) interacts with their traits to modify trait potency.
   >
   > **Alignment bonus:** When a trait's chemistry mapping (per TRAIT_INTEGRATION_SPEC mapping table) matches the player's chemistry type, the trait's mechanical effects receive a **1.25× potency multiplier**.
   >
   > **Misalignment penalty:** When a trait's chemistry mapping does NOT match the player's chemistry type, the trait's mechanical effects receive a **0.75× potency multiplier**.
   >
   > **Neutral:** Traits with no chemistry mapping (universal traits like 'Durable', 'Consistent') always operate at 1.0× potency.
   >
   > Potency applies to: fWAR star play multipliers (§10.4), clutch trigger bonuses (§13.6), modifier effects (§15.2), and narrative weight. It does NOT affect base stats (power, contact, etc.) — those are SMB4's domain.
   >
   > ```typescript
   > function getTraitPotency(trait: Trait, playerChemistry: ChemistryType): number {
   >   const traitChemistry = TRAIT_CHEMISTRY_MAP[trait];  // From TRAIT_INTEGRATION_SPEC
   >   if (!traitChemistry) return 1.0;  // Universal trait
   >   return traitChemistry === playerChemistry ? 1.25 : 0.75;
   > }
   > ```
   >
   > **Note:** The full trait-to-chemistry mapping table is maintained in TRAIT_INTEGRATION_SPEC.md (or Spine when consolidated). Mode 2 consumes the mapping; Mode 1 assigns chemistry types and traits at player creation.

2. **§2.1** (Shared Enums) — Add `ChemistryType` definition:
   ```typescript
   type ChemistryType = 'Competitive' | 'Spirited' | 'Crafty' | 'Scholarly' | 'Disciplined';
   // Aligned with MODE_1_LEAGUE_BUILDER.md §5.4
   ```

---

## Resolution #26 — Trade Deadline: Add Enforcement to Mode 2

**Decision:** Mode 2 must enforce the trade deadline configured in Mode 1's rules preset.

**Required changes to MODE_2:**

1. **§22** (Schedule System) — Add new subsection §22.6:

   > ### 22.6 Trade Deadline Enforcement
   >
   > If `rules.season.tradeDeadline.enabled` (from Mode 1 rules preset):
   >
   > **Deadline calculation:**
   > ```typescript
   > function getTradeDeadlineGame(totalGames: number, timing: number): number {
   >   return Math.floor(totalGames * timing);  // e.g., 32 × 0.7 = game 22
   > }
   > ```
   >
   > **Enforcement:** Trade transactions (`TransactionEvent` with `type: 'trade'`) are **rejected** after the deadline game is completed. The UI disables the trade interface and shows "Trade deadline has passed."
   >
   > **Narrative triggers:**
   > - 7 games before deadline: "Trade deadline approaching" narrative event
   > - At deadline: "Trade deadline passes" narrative event with summary of deadline deals
   > - Attempted trade after deadline: "Trade blocked — deadline has passed" user message
   >
   > **Scope:** Only trades are blocked. Free agent signings (if any exist in-season), call-ups, send-downs, DFA, and IL moves remain available after the trade deadline.

---

## Resolution #27 — Contract Years: Always 1 in v1

**Decision:** All contracts are 1 year in v1. Mode 2 must align with Mode 1.

**Required changes to MODE_2:**

1. **§2.3** (TransactionEvent → freeAgent payload) — Change:
   ```typescript
   contractYears: number;
   ```
   To:
   ```typescript
   contractYears: 1;  // All contracts are 1 year in v1 (per MODE_1 §5.3). Multi-year contracts are V2.
   ```

2. Add to **§27** (V2 / Deferred Material) table:
   > | Multi-year contracts | All contracts 1 year in v1 | MODE_1 §5.3 |

**No changes to MODE_1** — already correct.

---

## Updated Summary: Required Edits by Document

### MODE_1_LEAGUE_BUILDER.md

| Resolution | Section(s) | Change |
|-----------|-----------|--------|
| #5 | §5.4 | Add `'UNK'` to PitchType |
| #6 | §10.1 | GameStatus → UPPER_SNAKE 5-value enum |
| #7 | §10.1, §10.2 | Merge ScheduledGame interface, rename FictionalDate → GameDate |
| #8 | §5.3 | rosterStatus → RosterLevel (UPPERCASE, add RETIRED) |
| #10 | §12.3 | Full StandingsEntry initialization |
| #11 | §12.3 | (Covered by #10) |
| #12 | §5.3, §5.4, §7.3 | Split Position → PrimaryPosition/SecondaryPosition + FieldPosition |
| #14 | §12.3, §13.2 | Rename betweenAtBatEvents → betweenPlayEvents |
| #17 | §5.4 | Add DH clarification note |
| #20 | §14 | Clarify free agency V2 scope |
| #21 | §1.2, §12.1, §13.2 | Add NPC initialization (reporters, managers, scouts) |

### MODE_2_FRANCHISE_SEASON.md

| Resolution | Section(s) | Change |
|-----------|-----------|--------|
| #1 | §14.1, §14.9, §14.10 | Expand mojo to 6-tier, fix naming, fix range |
| #2 | §22.1, §1.4 | Remove "pre-generated" language, defer to Mode 1 §10 |
| #3 | §21.2 | Replace 6-step cascade with run_differential + user decides |
| #4 | §21.3 | Remove restated defaults, defer to Mode 1 §9.2-9.3 |
| #5 | §2.1, §4.3 | PitchType → abbreviations + UNK |
| #7 | §22.1 | ScheduleEntry → ScheduledGame, date → fictionalDate: GameDate |
| #8 | §2.3 | fromLevel/toLevel → RosterLevel (UPPERCASE) |
| #9 | §14.4, §14.7, §14.9, §14.10, §14.11 | FitnessLevel → PascalCase everywhere |
| #12 | §2.1, §2.2, §7, §10, §11.3, §23.6 | Add FieldPosition definition; annotate positional tables |
| #13 | §2.1, §11.2 | Expand PitcherRole to 5 values |
| #15 | §2.1, §16.8 | Align personality to Mode 1 flat structure |
| #16 | §8.5 | Fix storage estimate to league-wide formula |
| #18 | §18.1, §18.3, §23.1 | Fix "128g for SMB4" labels; add Standard Preset examples |
| #19 | §6.1 | Specify 1-9 innings range |
| #22 | §1.4 | Second "pre-generated" fix (addendum to #2) |
| #23 | §2.4 | Reference LineupEntry from Spine |
| #24 | §17.3, §17.4, §19.1 | Reference SALARY_SYSTEM_SPEC for True Value / trade value formulas |
| #25 | §2.1, §15 (new §15.5) | Add ChemistryType enum + chemistry-trait potency subsection |
| #26 | §22 (new §22.6) | Add trade deadline enforcement |
| #27 | §2.3, §27 | contractYears → always 1 in v1 |

### SPINE_ARCHITECTURE.md (new entries needed)

| Type | Canonical Definition | Owner |
|------|---------------------|-------|
| `MojoLevel` | 6-tier PascalCase | Spine |
| `FitnessLevel` | 6-tier PascalCase | Spine |
| `GameStatus` | 5-value UPPER_SNAKE | Spine |
| `RosterLevel` | 4-value UPPERCASE | Spine |
| `PitchType` | 9-value abbreviation | Spine |
| `ScheduledGame` | Merged interface | Spine |
| `GameDate` | Canonical date type | Spine |
| `StandingsEntry` | Full interface | Spine |
| `PrimaryPosition` | CorePosition only | Spine |
| `SecondaryPosition` | CorePosition + CompositePosition | Spine |
| `FieldPosition` | 10-value in-game defensive slots | Spine |
| `CompositePosition` | 4-value secondary-only designations | Spine |
| `Composite→FieldPosition mapping` | Eligibility lookup table | Spine |
| `PitcherRole` | 5-value in-game role | Spine |
| `Player.personality` / `Player.hiddenModifiers` | Canonical personality shape | Spine |
| `LineupEntry` | Lineup slot interface | Spine |
| `ChemistryType` | 5-value PascalCase | Spine |

### SALARY_SYSTEM (gospel needed — blocking dependency)

| Formula | Consumers | Status |
|---------|-----------|--------|
| `calculateTrueValue()` | Mode 2 §17 (designations) | **BLOCKING** — Fan Fav/Albatross cannot be implemented without this |
| `calculateValueDelta()` | Mode 2 §17.3, §17.4 | **BLOCKING** |
| `calculateTradeBaseValue()` | Mode 2 §19.1 (trade mechanics) | **BLOCKING** |
| `dollarsPerWAR` constant | All value calculations | **BLOCKING** |

---

*Resolutions #1-#11 confirmed by JK on 2026-02-24.*
*Resolutions #12-#19 confirmed by JK on 2026-02-24.*
*Resolutions #20-#27 confirmed by JK on 2026-02-24.*
