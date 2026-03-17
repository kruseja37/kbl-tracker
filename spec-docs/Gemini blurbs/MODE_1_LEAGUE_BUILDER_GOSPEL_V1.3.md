# MODE 1: LEAGUE BUILDER — Gospel Specification

**Version:** 1.3 (Gospel — Audit & Contradiction Resolutions Applied)
**Status:** CANONICAL — This document is the single source of truth for Mode 1
**Created:** 2026-02-22
**Last Revised:** 2026-02-25 (Audit Updates: Mojo Init, Captain Assignment, Rookie Lock, Pitch Validation)
**Supersedes:** LEAGUE_BUILDER_SPEC.md, SEASON_SETUP_SPEC.md, portions of FRANCHISE_MODE_SPEC.md, GRADE_ALGORITHM_SPEC.md, PROSPECT_GENERATION_SPEC.md, SCOUTING_SYSTEM_SPEC.md, PERSONALITY_SYSTEM_SPEC.md (assignment only), TRAIT_INTEGRATION_SPEC.md (initial distribution only), SCHEDULE_SYSTEM_FIGMA_SPEC.md (setup only), LEAGUE_BUILDER_FIGMA_SPEC.md, SEASON_SETUP_FIGMA_SPEC.md, SMB4_GAME_REFERENCE.md (import mapping), smb4_traits_reference.md (import mapping)
**Cross-references:** SPINE_ARCHITECTURE.md (shared data contracts), MODE_2_FRANCHISE_SEASON.md (what Mode 1 hands off to), MODE_3_OFFSEASON_WORKSHOP.md (prospect generation reused at annual draft)

**STEP4 Decisions Applied:** C-070, C-071, C-072, C-073, C-074, C-075, C-076, C-077, C-078, C-087. Cross-cutting: C-045, C-054.

---

## 1. Overview & Mode Definition

### 1.1 What Mode 1 Is

Mode 1 — the League Builder — is the **one-time setup hub** where users configure everything before a franchise begins. It runs exactly once per franchise. Once the user clicks "Start Franchise," Mode 1's work is complete and control passes to Mode 2 (Franchise Season).

> **Per C-073:** The League Builder is explicitly Mode 1 of KBL's three-mode architecture. Mode 2 is the Franchise Season (play games, track stats). Mode 3 is the Offseason Workshop (between-season processing). The Almanac is a read-only historical layer available at all times. See SPINE_ARCHITECTURE.md for the shared data contracts connecting all three modes.

### 1.2 What Mode 1 Produces

When Mode 1 completes, it has created:

1. A **franchise save slot** — an isolated IndexedDB instance containing all franchise data
2. **League structure** — conferences, divisions, team assignments
3. **Complete team roster data** — all players with full importable attributes: ratings (power, contact, speed, fielding, arm, velocity, junk, accuracy), traits, personality, chemistry type, arsenal, bats/throws, age, gender, positions (primary + secondary), fame level, salary
4. **Farm rosters** — populated via Startup Prospect Draft (or empty if skipped)
5. **Rules configuration** — season length, playoffs, roster rules, narrative toggles, awards ceremony
6. **Schedule** — user-uploaded CSV or OCR-extracted, user-editable game schedule
7. **Franchise type** — Solo, Couch Co-Op, or Custom (which teams are human vs AI)
8. **Initialized subsystems** — standings tables, salary ledger, empty stats stores
9. **Named NPCs** — one beat reporter, one manager, and one scout per team (auto-generated names, user-editable)

### 1.3 What Mode 1 Does NOT Do

- Track any games or at-bats (that's Mode 2)
- Run any offseason phases (that's Mode 3)
- Store historical data (that's the Almanac)
- Generate narrative content (that's Mode 2's narrative engine)

### 1.4 Entry Points

| Entry | Flow | Description |
|-------|------|-------------|
| Main Menu → "New Franchise" | Full wizard (§11) | Complete 6-step setup |
| Main Menu → "Playoff Mode" | Abbreviated wizard (§11.7) | Skip season settings, go straight to playoffs |
| Main Menu → "League Builder" | Standalone editor | Edit leagues/teams/players without starting a franchise |

### 1.5 Key Principles

1. **Teams are reusable** — A team template can exist in multiple leagues simultaneously
2. **Players are global** — One player database shared across all league templates
3. **Leagues are templates** — Configurations that can be instantiated into franchises
4. **Non-destructive** — Changes in League Builder don't affect active franchises
5. **Copy-on-create** — Franchise creation copies data from templates; subsequent template edits don't propagate (per C-076)

---

## 2. Franchise Type Selection

### 2.1 The Three Franchise Types

Every franchise is one of three types, selected during the creation wizard (§11, Step 4). The type determines which teams are human-controlled vs AI-controlled, which affects the experience layer — not access.

| Type | Human Teams | AI Teams | Default AI Score Entry | Use Case |
|------|------------|----------|----------------------|----------|
| **Solo (1P)** | 1 | Rest of league | Enabled | One user, one team, plays all their games in SMB4 |
| **Couch Co-Op** | All | 0 | N/A (no AI teams) | All teams human-controlled, pure scorebook |
| **Custom** | 2+ | Rest of league | Configurable | Multiple human teams, rest AI |

### 2.2 The `controlledBy` Flag

Every team in a franchise carries a control flag:

```typescript
interface FranchiseTeam {
  // ...all Team fields from §4...
  controlledBy: 'human' | 'ai';
}
```

**What the flag gates — experience, not access.**

All GameTracker events are tracked equally regardless of `controlledBy`. If events come from GameTracker, they're valid and enter the stats pipeline uniformly.

| Aspect | Human Team | AI Team |
|--------|-----------|---------|
| Dashboard | Full dashboard with narrative feed, notifications | Accessible but reactive (surfaced when user needs to sync with SMB4) |
| GameTracker | Full event tracking for all games involving this team | Same — user records events for both sides during games vs human teams |
| Roster/Lineup | Full editing (proactive) | Full editing (reactive — sync with SMB4 reality) |
| Mojo/Fitness | Full editing | Full editing |
| Narrative | Rich: beat reporters, storylines, milestones | Available from GameTracker events involving this team |
| Designations | Full tracking from all GameTracker events | Full tracking from all GameTracker events |
| Stats | Full season stats from all GameTracker events | Full season stats from all GameTracker events |

**Note:** All events entering via GameTracker are treated identically by the stats pipeline regardless of team control type.

**The user is both commissioner and manager. Commissioner powers (edit anything on any team) are always available. The `controlledBy` flag only determines which teams get the rich, proactive manager experience.**

### 2.3 Franchise Type Configuration

```typescript
interface FranchiseTypeConfig {
  type: 'solo' | 'couch-coop' | 'custom';
  humanTeams: string[];       // Team IDs controlled by humans
  aiScoreEntry: boolean;      // Allow manual W/L entry for AI-vs-AI games
  offseasonPhaseScopes: OffseasonPhaseConfig[];  // Per-phase scope (consumed by Mode 3)
}
```

### 2.4 Presets

**Solo:** User selects 1 team → that team is `human`, all others `ai`. AI score entry enabled by default. Offseason phase scopes use defaults from §2.5.

**Couch Co-Op:** All teams set to `human`. No AI score entry toggle (not needed). All offseason phases scoped to `all-teams`. No AI logic required anywhere. Every game fully tracked. Full league standings. Pure scorebook.

**Custom:** User selects 2+ teams as `human`. Configurable AI score entry. Configurable offseason phase scopes (defaults from §2.5).

### 2.5 Offseason Phase Scope Defaults

Each of the 13 offseason phases (see MODE_3_OFFSEASON_WORKSHOP.md) has a default scope:

```typescript
type PhaseScope = 'all-teams' | 'human-only';

interface OffseasonPhaseConfig {
  phase: number;
  name: string;
  scope: PhaseScope;
  aiResolution: 'auto' | 'skip';
  awardsCeremony?: 'full' | 'team_only' | 'off';  // Phase 2 only
}
```

| Phase | Name | Default Scope | Rationale |
|-------|------|--------------|-----------|
| 1 | Season End Processing | all-teams | League ecosystem health |
| 2 | Awards Ceremony | human-only | Full toggle: 'Full' \| 'Team Only' \| 'Off' |
| 3 | Salary Recalculation #1 | human-only | Requires full season stats |
| 4 | Expansion | all-teams | League structure |
| 5 | Retirements | all-teams | Auto-calculated by age + service |
| 6 | Free Agency | all-teams | Player movement ecosystem |
| 7 | Draft | all-teams | AI teams auto-pick (reverse record, BPA) |
| 8 | Salary Recalculation #2 | human-only | Requires full season stats |
| 9 | Offseason Trades | all-teams | AI available as trade partners |
| 10 | Salary Recalculation #3 | human-only | Requires full season stats |
| 11 | Chemistry Rebalancing | all-teams | Operates on roster data, not full season stats |
| 12 | Farm Reconciliation | all-teams | Operates on roster data, not full season stats |
| 13 | Finalize & Advance | all-teams | Roster compliance |

**Couch Co-Op override:** All phases forced to `all-teams` (no AI teams exist).

### 2.6 What Franchise Type Does NOT Change

The franchise type is a **configuration layer**, not a structural change. These systems are unchanged regardless of type:

- GameTracker event model
- Stats pipeline (processes whatever events exist)
- WAR calculations (operate on available data)
- Narrative engine (generates from available events)
- Designation system (triggers on available data)
- Offseason phase sequence (just adds scope gating)
- Almanac (stores whatever data exists)

---

## 3. Leagues Module

### 3.1 Purpose

Create and manage league templates that define team groupings, conference/division structure, and default rules. League templates exist in the global League Builder space and can be instantiated into multiple franchises.

### 3.2 Features

| Function | Description |
|----------|-------------|
| **View** | Browse existing league templates |
| **Create** | New league with name, team selection, structure |
| **Edit** | Modify existing league configuration |
| **Delete** | Remove league template (doesn't affect active franchises) |
| **Duplicate** | Copy league as starting point for new one |

### 3.3 League Template Data Model

```typescript
interface LeagueTemplate {
  id: string;
  name: string;                    // "Kruse Baseball League"
  description?: string;
  createdDate: string;
  lastModified: string;

  // Team Membership (references to global team pool)
  teamIds: string[];

  // Structure
  conferences: Conference[];
  divisions: Division[];

  // Default Rules (can be overridden at franchise creation)
  defaultRulesPresetId: string;    // Reference to rules preset (§9)

  // Branding
  logoUrl?: string;
  themeColor?: string;             // Hex code for UI theming
}

interface Conference {
  id: string;
  name: string;                    // "American League", "National League"
  abbreviation: string;            // "AL", "NL"
  divisionIds: string[];
}

interface Division {
  id: string;
  name: string;                    // "East", "West", "Central"
  conferenceId: string;
  teamIds: string[];
}
```

### 3.4 League Creation Flow

```
Step 1: Name & Description
         ↓
Step 2: Select Teams (from global team pool)
         ↓
Step 3: Configure Structure
        - Number of conferences (0, 1, 2)
        - Number of divisions per conference
        - Assign teams to divisions
         ↓
Step 4: Select Default Rules Preset
         ↓
Step 5: Review & Save
```

### 3.5 Structural Constraints

- A league must have at least 2 teams
- Conference count: 0 (flat league), 1, or 2
- Division count per conference: 0 (flat conference), 1, 2, or 3+
- Every team must be assigned to exactly one division (if divisions exist)
- Teams can belong to multiple league templates simultaneously (templates are independent)

---

## 4. Teams Module

### 4.1 Purpose

Create, edit, and manage teams in the global team pool. Teams are reusable across multiple league templates.

### 4.2 Features

| Function | Description |
|----------|-------------|
| **Create** | New team with full customization |
| **Edit** | Modify team details |
| **Assign** | Add/remove team from leagues |
| **Duplicate** | Deep copy team with independent rosters — changes to duplicate don't affect original |
| **Import** | Upload teams via CSV |
| **Delete** | Remove team (with confirmation if assigned to leagues) |

### 4.3 Team Data Model

```typescript
interface Team {
  id: string;
  name: string;                  // "San Francisco Giants"
  abbreviation: string;          // "SFG"
  location: string;              // "San Francisco"
  nickname: string;              // "Giants"

  // Branding
  colors: {
    primary: string;             // Hex code "#FD5A1E" — Primary color (required)
    secondary: string;           // Hex code "#27251F" — Secondary color (required)
    tertiary: string;            // Hex code "#FFFFFF" — Tertiary (accent) color (required)
  };
  logoUrl?: string;

  // Venue
  stadium: string;               // "Oracle Park"

  // League Membership (global — NOT franchise-specific)
  leagueIds: string[];           // Can be in multiple league templates

  // Metadata
  foundedYear?: number;
  championships?: number;
  retiredNumbers?: number[];
  createdDate: string;
  lastModified: string;
}
```

**Note: The `controlledBy` flag (§2.2) is NOT part of the global Team model. It is assigned per-franchise during the creation wizard and stored in `FranchiseTeam`, which extends `Team`.**

### 4.4 Team CSV Import

```csv
name,abbreviation,location,nickname,primaryColor,secondaryColor,tertiaryColor,logoUrl,stadium
San Francisco Giants,SFG,San Francisco,Giants,#FD5A1E,#27251F,#FFFFFF,/logos/sfg.png,Oracle Park
New York Yankees,NYY,New York,Yankees,#003087,#E4002C,#C4CED4,/logos/nyy.png,Yankee Stadium
```

**Import flow:**
1. Upload CSV file
2. Preview parsed data with validation
3. Check for duplicates (by abbreviation), required fields
4. Confirm import
5. Teams added to global pool

---

## 5. Players Module

### 5.1 Purpose

Create, edit, and manage the global player database. All players exist in one pool and are assigned to teams via the Rosters module (§7). The initial league is populated from the SMB4 506-player database.

### 5.2 Features

| Function | Description |
|----------|-------------|
| **Create** | New player with full attribute editor |
| **Edit** | Modify any player attribute |
| **Generate** | Create fictional players using grade algorithm (§5.6) |
| **Import** | Upload players via CSV |
| **Delete** | Remove player from database |

### 5.3 Complete Player Data Model

```typescript
interface Player {
  // ── Identity ──────────────────────────────────────────────
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  gender: 'M' | 'F';

  // ── Physical ──────────────────────────────────────────────
  age: number;
  bats: 'L' | 'R' | 'S';            // Left, Right, Switch
  throws: 'L' | 'R';

  // ── Position ──────────────────────────────────────────────
  primaryPosition: PrimaryPosition;      // Never a composite — CorePosition only
  secondaryPosition?: SecondaryPosition; // Can be composite or core

  // ── Position Player Ratings (0-99) ────────────────────────
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;

  // ── Pitcher Ratings (0-99) ────────────────────────────────
  velocity: number;
  junk: number;
  accuracy: number;

  // ── Pitcher Arsenal ───────────────────────────────────────
  arsenal: PitchType[];               // e.g., ['4F', '2F', 'CB', 'SL', 'CH']

  // ── Grade (auto-calculated from ratings per §5.6) ────────
  // NOTE: Grade is computed-only via computeGrade() — never stored directly

  // ── Traits (max 2) ───────────────────────────────────────
  trait1?: Trait;
  trait2?: Trait;

  // ── Personality (§6) ─────────────────────────────────────
  personality: PersonalityType;       // 1 of 7 visible types
  hiddenModifiers: HiddenModifiers;   // 4 hidden 0-100 values

  // ── Chemistry ─────────────────────────────────────────────
  chemistry: ChemistryType;           // 1 of 5 SMB4 chemistry types

  // ── Status ────────────────────────────────────────────────
  fameLevel: FameLevel;               // Per C-078: dropdown, not slider

  // ── Contract ──────────────────────────────────────────────
  salary: number;                     // In millions
  contractYears: 1;                   // Static at 1 in League Builder; Mode 3 handles multi-year contracts
  isSalaryLocked: boolean;            // Audit Item #3: Flag for rookie slot pay

  // ── Team Assignment ───────────────────────────────────────
  currentTeamId: string | null;       // null = free agent
  rosterLevel: RosterLevel;           // Canonical 4-value UPPERCASE enum (see SPINE_ARCHITECTURE.md)

  // ── Metadata ──────────────────────────────────────────────
  createdDate: string;
  lastModified: string;
  isCustom: boolean;                  // User-created vs imported
  sourceDatabase?: string;            // "SMB4", "Custom", etc.
}
```

### 5.4 Type Definitions

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

// Per C-074/C-087: 13 grades, S through D-. This is the authoritative scale.
type Grade = 'S' | 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' |
             'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-';

// Pitch types: Final list (removed SC and KN). UNK = unknown, used in enrichment contexts.
type PitchType = '4F' | '2F' | 'CB' | 'SL' | 'CH' | 'FK' | 'CF' | 'SB' | 'UNK';

// Per C-070: 7 personality types only. Chemistry types are separate.
type PersonalityType = 'Competitive' | 'Relaxed' | 'Droopy' | 'Jolly' |
                       'Tough' | 'Timid' | 'Egotistical';

type ChemistryType = 'Competitive' | 'Spirited' | 'Crafty' | 'Scholarly' | 'Disciplined';

// RosterLevel: 4-value UPPERCASE enum (canonical — see SPINE_ARCHITECTURE.md)
// Audit Item #4: Inactive players (Waivers/DFA) map to 'FREE_AGENT' with null currentTeamId.
type RosterLevel = 'MLB' | 'FARM' | 'FREE_AGENT' | 'RETIRED';

// MojoLevel: Canonical 6-tier mojo scale. 
// Audit Item #1: All players initialize at 'Neutral' during franchise creation.
type MojoLevel = 'Rattled' | 'Tense' | 'Neutral' | 'Locked-In' | 'On Fire' | 'Jacked';

// Per C-078: FameLevel replaces the numeric fame slider.
type FameLevel = 'Unknown' | 'Local' | 'Regional' | 'National' | 'Superstar' | 'Legend';

interface HiddenModifiers {
  loyalty: number;       // 0-100: FA preference, captain selection score
  ambition: number;      // 0-100: Development speed, willingness to change teams
  resilience: number;    // 0-100: Morale recovery, retirement probability
  charisma: number;      // 0-100: Teammate morale, captain selection score
}
```

### 5.5 Trait Catalogue

Traits are SMB4 assets — KBL wraps them with strategic depth (chemistry potency). 

**Position-Player-Only Traits** (can only be assigned to non-pitchers):
... [Standard list as per source] ...

**Pitcher-Only Traits** (can only be assigned to pitchers):
... [Standard list as per source] ...

**Audit Item #5: Validation Rule** — Pitcher traits (Elite 4F, Elite CB, etc.) require the corresponding pitch type to be present in the pitcher's `arsenal` [cite: MODE_1_LEAGUE_BUILDER_FINAL.md §6.4].

... [Standard Trait types as per source] ...

### 5.6 Grade Calculation Algorithm
... [Standard algorithm as per source] ...

### 5.7 Grade Thresholds
... [Standard thresholds as per source] ...

### 5.8 Fictional Player Generation
... [Standard generation config as per source] ...

### 5.9 FameLevel (Per C-078)
... [Standard fame levels as per source] ...

---

## 6. Personality & Traits — Initial Assignment

### 6.1 When Assignment Happens
... [Standard assignment timing as per source] ...

### 6.2 Personality: 7 Visible Types
... [Standard personality types as per source] ...

### 6.3 Personality: 4 Hidden Modifiers
... [Standard hidden modifiers as per source] ...

### 6.4 Initial Trait Distribution

From the 506-player SMB4 database (and maintained for generated players):

| Trait Count | Percentage |
|-------------|-----------|
| 0 traits | ~30% |
| 1 trait | ~50% |
| 2 traits | ~20% |

**Trait rules at assignment:**
- Max 2 traits per player (hard cap)
- Traits must be position-appropriate.
- **Audit Item #5: Pitch Validation Rule** — A pitcher CANNOT be assigned an "Elite [Pitch]" trait unless that specific pitch is present in their `arsenal` list.
- Chemistry type does NOT restrict which traits a player can receive.
- 15% of assigned traits are negative (for generated players).
- **The 'Two-way' trait can ONLY be assigned to pitchers (SP, RP, CP, SP/RP).**

### 6.5 Trait Visibility on Farm
... [Standard visibility rules as per source] ...

---

## 7. Rosters Module
... [Standard roster module as per source] ...

---

## 8. Draft Module

... [Sections 8.1 - 8.6 as per source] ...

### 8.7 Prospect Salary

Rookie salary assigned at draft time per SALARY_SYSTEM_SPEC round-based salary table. 
**Audit Item #3: Rookie Lock** — All players drafted in the Startup Prospect Draft (or annual drafts) have `isSalaryLocked` set to **TRUE**. This ensures their slotted rookie pay is not overwritten during setup or subsequent seasons until they complete one full MLB year [cite: MODE_3_OFFSEASON_WORKSHOP_GOSPEL_V1.1.md §9.6].

### 8.8 Flow Position in Franchise Creation
... [Standard flow as per source] ...

---

## 9. Rules Configuration
... [Standard rules configuration as per source] ...

---

## 10. Schedule Setup
... [Standard schedule setup as per source] ...

---

## 11. Franchise Creation Wizard

... [Sections 11.1 - 11.5 as per source] ...

### 11.6 Step 5: Rosters, Salary & Draft

Three sub-steps:

**5A: Roster Mode**
- Use existing rosters from League Builder, OR
- Run fantasy draft to build rosters from scratch

**5B: Salary Calculation**
- Compute initial salaries from ratings/grades for all rostered players.
- **Audit Item #3 Enforcement:** This step MUST skip any players where `isSalaryLocked === true` (Drafted Rookies) to preserve their round-based slotted pay [cite: MODE_3_OFFSEASON_WORKSHOP_GOSPEL_V1.1.md §10].

**5C: Startup Prospect Draft**
... [Standard draft logic as per source] ...

---

## 12. Franchise Handoff & Initialization

### 12.1 What Happens on "Start Franchise"

Per C-076: The handoff from Mode 1 to Mode 2 must be a **copy, not a reference.**

**Initialization sequence:**

1.  **Create franchise save slot** (new IndexedDB instance)
2.  **Copy league structure** (conferences, divisions, teams)
3.  **Copy team data** with controlledBy flags
4.  **Copy rosters** (or redirect to draft if selected)
5.  **Copy rules preset** (snapshot — not a reference)
6.  **Initialize salary ledger** 7.  **Initialize empty standings tables** 8.  **Load schedule** (or empty schedule)
9.  **Initialize empty stats stores**
10. **Audit Item #1: Mojo Initialization** — All players in the franchise have their `MojoLevel` set to **'Neutral'** [cite: MODE_3_OFFSEASON_WORKSHOP_GOSPEL_V1.1.md §3.1].
11. **Audit Item #2: Team Captain Assignment** — For every team, the system selects one player as the Team Captain. The selection is based on the highest combined total of the **`charisma`** and **`loyalty`** hidden modifiers [cite: MODE_1_LEAGUE_BUILDER_FINAL.md §5.4].
12. **Initialize named NPCs** (Beat Reporters, Managers, Scouts)
13. **Initialize franchise metadata**
14. **Set as active franchise**

... [Sections 12.2 - 16 as per source] ...
