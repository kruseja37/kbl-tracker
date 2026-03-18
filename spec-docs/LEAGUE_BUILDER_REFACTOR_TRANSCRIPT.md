# LEAGUE BUILDER REFACTOR INTERROGATION — Transcript

**Started:** 2026-03-18
**Status:** COMPLETE — Synthesized to LEAGUE_BUILDER_REFACTOR_SPEC.md on 2026-03-18
**Context:** Prerequisites surfaced during Almanac UX interrogation (Q12, Q13)
**Scope:** Six required changes to League Builder data model before Almanac can be built

---

## Prerequisite Items (from ALMANAC_UX_SPEC.md §12)

1. Multi-league player assignment (replace single currentTeamId)
2. Custom roster construction (separate team branding from roster)
3. Player edit history tracking
4. Franchise deep-copy at creation
5. Franchise aging writes to franchise store, not globalPlayers
6. Exhibition player ratings snapshot on game record

---

## Entries

### Q1: Multi-League Player Assignment — Data Model
**Question:** How should players exist across multiple leagues? (a) Per-league team assignments on one player record, (b) Clone player records per league, (c) Hybrid — one global record with per-league rating overrides.
**Answer:** Option C — hybrid model. One global player record with base ratings. Each league can store rating overrides for that player. If no override exists, base ratings apply.

```
Global Player: Dexterez (Power: 65, Contact: 72)
  └── League A: no overrides (uses base: Power 65)
  └── League B: override Power → 99 (everything else uses base)
```

**Benefits:**
- One canonical player for Almanac search
- Per-league rating customization without duplicating the entire player record
- Base ratings as default (zero extra work unless user wants to customize)
- Almanac naturally shows different attributes per league instance

**Data model change:**
- Player record keeps `currentTeamId` for backward compatibility OR adds `leagueAssignments[]`
- New: per-league override store — `leaguePlayerOverrides: { [leagueId]: { [playerId]: Partial<PlayerRatings> } }`
- At game time: merge base player + league overrides to get effective ratings

**Confidence:** FIRM
**Decision:** Hybrid model (C). One global player record + per-league rating overrides. Almanac sees one canonical player per search. Each league instance can show different attributes based on overrides.

### Q2: Multi-League Team Assignment — Player-to-Team per League
**Question:** How does team assignment work when a player can be in multiple leagues on different teams?
**Answer:** Option A — leagueAssignments array on the Player record. Replace currentTeamId with per-league assignments.

```typescript
Player.leagueAssignments: [
  { leagueId: "league-a", teamId: "sirloins-123", rosterStatus: "MLB" },
  { leagueId: "league-b", teamId: "herbisaurs-456", rosterStatus: "MLB" }
]
```

Combined with Q1's per-league rating overrides, the full player-in-league state is:
- Team assignment (which team in this league)
- Rating overrides (optional per-league customization)
- Base ratings (global, used when no override exists)

**Almanac integration confirmed:** Each league = one instance on the player directory page. Each instance shows effective ratings (base + overrides) and stats from games in that league. The exhibition game snapshot captures the merged ratings at game time, so historical accuracy is preserved even if overrides change later.

**Migration path:** Existing `currentTeamId` can be auto-migrated to a single-entry `leagueAssignments` array based on the team's current league membership. No data loss.

**Confidence:** FIRM
**Decision:** leagueAssignments[] replaces currentTeamId. Per-league overrides (Q1) + per-league team assignment (Q2) together give full multi-league player customization. Almanac shows one directory page per canonical player, one instance card per league with effective ratings.

### Q3: Custom Roster Construction — Team Branding vs Roster
**Question:** Does the multi-league model (Q1+Q2) solve the "re-use team branding with different rosters" requirement? Or do you need something more?
**Answer:** Yes, it solves it. Same team (Sirloins — same name, colors, stadium) can exist in League A and League B with different player assignments per league (via leagueAssignments). No team will exist more than once within the same league.

**How it works:**
- Sirloins team record: one entity with branding (name, colors, stadium, logo)
- Sirloins in League A: Dexterez, Smith, Jones assigned via leagueAssignments
- Sirloins in League B: Garcia, Williams, Brown assigned via leagueAssignments
- Same branding, completely different rosters

**No additional data model changes needed** beyond Q1+Q2. The multi-league assignment model inherently supports roster customization per league.

**Constraint:** A team cannot appear more than once within the same league. A player cannot appear on more than one team within the same league.

**Confidence:** FIRM
**Decision:** Custom roster construction is solved by the multi-league model (Q1+Q2). No separate "team branding vs roster" separation needed. Same team, different leagues, different player assignments. One team per league, one team assignment per player per league.

### Q4: Franchise Deep-Copy — What Gets Copied & Edit History
**Question:** What exactly gets copied into the franchise-specific store at creation? Does edit history from League Builder carry over?
**Answer:** Franchise copies the current effective state of all players on rosters (base ratings + league overrides merged into a flat player record). Edit history starts clean — no League Builder history carried over. Edit history only begins tracking once the player evolves within the franchise-specific instance (aging, development, trades, etc.).

**Deep-copy contents:**
```
For each player in the source league:
  → Merge base ratings + league overrides = effective player record
  → Write flat player record to franchise-specific IndexedDB store
  → editHistory: [] (clean start)

For each team in the source league:
  → Copy team branding (name, colors, stadium, logo)
  → Copy roster assignments from that league's context

For league settings:
  → Copy rules preset, conference/division structure
```

**Post-creation:** The franchise is fully independent. All reads come from the franchise store. All writes (aging, trades, development) go to the franchise store. League Builder is never referenced again.

**Almanac impact:** Franchise instance card shows the player's franchise-evolved state. Edit history on the franchise card only shows franchise-era changes (e.g., "Age 28→29, Power 65→63 (aging decline)"). No League Builder history shown.

**Confidence:** FIRM
**Decision:** Franchise deep-copies effective player state (merged base + overrides). Clean edit history — franchise tracks its own changes only. Full isolation from League Builder post-creation. Same approach for elimination brackets.

### Q5: Exhibition Player Ratings Snapshot — Scope & Hometown Field
**Question:** What fields do we snapshot on the exhibition game record? Just numerical ratings or everything?
**Answer:** FULL snapshot of everything tied to a player that can be unique to them. All ratings, traits, personality, chemistry, position, arsenal, age — the complete player identity at game time.

**New player attribute — Hometown (city, state):**
- Generated at player creation time from a US city/state database
- Stored on the global player record as a permanent attribute (like name, age, etc.)
- User-customizable — can be changed manually in League Builder player editor
- Included in the full snapshot (so Almanac baseball card back shows hometown)
- Previously discussed as part of the canonical player registry (Almanac Q6) — now moved to the Player record itself where it belongs

**Snapshot scope (everything on the baseball card back):**
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

**Stored on:** `PersistedGameState.playerRatingsSnapshots: Record<string, PlayerRatingsSnapshot>` — keyed by playerId, one entry per player in the game.

**Confidence:** FIRM
**Decision:** Full player snapshot on every exhibition game record. New `hometown` field added to the Player record — auto-generated at creation from a US city/state database, user-editable, with a "randomize" button in the player editor. Snapshot includes everything the Almanac baseball card back needs to display.

### Q6: Player Edit History — Granularity & Scope
**Question:** What granularity for edit history tracking? Per-field, per-session, or just timestamps? Do league override changes get tracked too?
**Answer:** Option A — per-field tracking. Each individual field change logged with timestamp, field name, old value, new value.

```typescript
Player.editHistory: Array<{
  date: string;           // ISO timestamp
  field: string;          // "power", "trait1", "hometown", etc.
  oldValue: any;
  newValue: any;
  context: 'base' | 'league-override';  // was this a base rating change or league-specific?
  leagueId?: string;      // only present if context = 'league-override'
}>
```

**League override changes are tracked** — marked with `context: 'league-override'` and the specific `leagueId`. This way the Almanac can show:
- "Base Power changed 65 → 70 on March 12" (affects all leagues without overrides)
- "League B Power override set to 99 on March 15" (affects only League B)

**What triggers a history entry:**
- User edits any field in the player editor (base ratings)
- User sets/changes/removes a per-league override
- Auto-generated changes do NOT create entries (e.g., initial player creation, SMB4 seeding)
- Franchise-specific changes tracked separately in franchise store (Q4)

**Almanac display:** Exhibition player page shows edit history timeline alongside game dates. User can see "Power changed here, then I played 3 games, then Contact changed here" and correlate performance changes with rating edits.

**Confidence:** FIRM
**Decision:** Per-field edit history tracking on the Player record. Both base and league-override changes logged with context tag. Auto-generated changes excluded. Franchise tracks its own edit history independently.

### OPEN ITEMS — FINAL STATUS:
All 6 prerequisite items resolved:
- ✅ Q1: Multi-league player model (hybrid — base + per-league overrides)
- ✅ Q2: Per-league team assignments (leagueAssignments[] replaces currentTeamId)
- ✅ Q3: Custom roster construction (solved by Q1+Q2 multi-league model)
- ✅ Q4: Franchise deep-copy (effective state copied, clean edit history, full isolation)
- ✅ Q5: Exhibition snapshot (full player state captured on game record, hometown field added)
- ✅ Q6: Player edit history (per-field, includes league overrides with context tag)

### Q7: Player Editor UX — Base vs League Override Editing
**Question:** Base ratings are edited in the League Builder player page. How does the user switch between editing base ratings and league-specific overrides? Should overridden fields have a visual indicator?
**Answer:** Yes, tabs work. Base ratings tab + one tab per league the player is in.

**Player editor layout:**
- Context tabs: [BASE] [League A] [League B] ...
- BASE selected = editing global defaults for ALL attributes (ratings, traits, personality, chemistry, position, arsenal, etc.)
- League tab selected = shows effective values (base + overrides merged), overridden fields visually highlighted
- User can override ANY attribute per-league, not just numerical ratings
- "Reset to base" option per-field to remove an override
- Overridden fields get a visual indicator (different color/icon/border)

**Confidence:** FIRM
**Decision:** Player editor uses context tabs for base vs league-specific editing. All player attributes are overridable per-league. Overridden fields visually indicated. Reset-to-base available per-field.

### OPEN ITEMS — FINAL STATUS (REVISED):
All items resolved:
- ✅ Q1: Multi-league player model (hybrid — base + per-league overrides)
- ✅ Q2: Per-league team assignments (leagueAssignments[] replaces currentTeamId)
- ✅ Q3: Custom roster construction (solved by Q1+Q2 multi-league model)
- ✅ Q4: Franchise deep-copy (effective state copied, clean edit history, full isolation)
- ✅ Q5: Exhibition snapshot (full player state captured on game record, hometown field added)
- ✅ Q6: Player edit history (per-field, includes league overrides with context tag)
- ✅ Q7: Player editor UX (base/league tabs, visual override indicators, all attributes overridable)

No OPEN items remain. Ready for synthesis when JK says "synthesize."

