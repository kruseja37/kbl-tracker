# ALMANAC.md — KBL Tracker Gospel Document (Read-Only Historical Layer) — V1 BUILD DOCUMENT

**Version:** 1.0
**Created:** 2026-02-23
**Status:** GOSPEL — Authoritative specification for the Almanac subsystem
**Supersedes:** ALMANAC_SPEC.md (full consumption)
**Cross-references:** MODE_1_LEAGUE_BUILDER.md (§13 Data Architecture), MODE_2_FRANCHISE_SEASON.md (§26 Franchise Data Flow), MODE_3_OFFSEASON_WORKSHOP.md (§1 Season End, §5 Retirements), SPINE_ARCHITECTURE.md (shared data contracts)
**STEP4 Decisions Applied:** None (Almanac has 0 STEP4 decisions — read-only consumer)

---

## 1. Overview & Purpose

> **V1 Scope Note:** Cross-franchise querying added (Almanac reads from all saved franchises). App home screen entry point added. Custom views (saved filter presets + column selection) included. Custom dashboards / composite multi-widget views deferred to v2.

### 1.1 What the Almanac Is

The Almanac is the read-only cross-season historical reference layer for KBL Tracker. It provides browsable, queryable access to all franchise history: career stats, season records, awards, team history, transaction logs, and the Hall of Fame museum.

**Key principle:** The Almanac NEVER writes data. It is a pure consumer of data produced by Mode 1 (League Builder), Mode 2 (Franchise Season), and Mode 3 (Offseason Workshop). All data it displays is pre-aggregated — the Almanac does not recalculate.

### 1.2 Availability

The Almanac is accessible at ALL times regardless of current mode:

- During a season (Mode 2): accessible via top-level navigation
- During offseason (Mode 3): accessible via top-level navigation
- From the franchise home screen: accessible via top-level navigation
- From the app home screen: accessible (shows all franchises by default)
- From League Builder (Mode 1): NOT available (no franchise data exists yet)

The Almanac reads from **all saved franchise databases** via the franchise registry (§2). Results are filterable by any combination of franchises and tagged with franchise name for disambiguation. Entry point determines default filter:

- **App home screen → Almanac:** Opens with all franchises (no pre-filter)
- **In-franchise nav bar → Almanac:** Opens with that franchise pre-selected as filter (user can clear to see all)

**Custom views:** Users can save filter presets and custom leaderboard column selections. User picks stat columns, sets filters (franchise, team, season range, position, qualifying minimums), chooses sort order, and saves as a named view. Stored as serialized query config objects — savable, loadable, deletable. This is the ONE exception to "Almanac never writes data" (it writes user preferences, not franchise data).

### 1.3 Navigation

The Almanac appears as a primary navigation item:

```
┌──────────────────────────────────────────────────────┐
│  [Season]  [Roster]  [Standings]  [📚 Almanac]      │
└──────────────────────────────────────────────────────┘
```

---

## 2. Data Sources

> **V1 Scope Note:** 12th store added (franchiseRegistry — top-level metadata store outside any franchise DB). V1 data gap annotations added to pre-aggregation table. Cold storage tier deferred to v2.

### 2.1 Storage Architecture

The Almanac reads from multiple IndexedDB stores within the active franchise database (`kbl-franchise-{id}`):

```typescript
interface AlmanacDataSources {
  /** Accumulated player totals across all seasons */
  careerStats: CareerStatsStore;

  /** Archived season-level data (stats, standings, results) */
  seasonArchives: SeasonArchiveStore;

  /** Award winners and runners-up by season */
  awardsHistory: AwardsHistoryStore;

  /** All trades, signings, draft picks, releases, retirements */
  transactionLog: TransactionLogStore;

  /** Transaction event stream (trades, FA signings, roster moves) */
  transactionEventStream: TransactionEventStreamStore;

  /** Manager stats and managing WAR (mWAR) decisions */
  managingStats: ManagingStatsStore;

  /** Stadium analytics and park factor historical data */
  stadiumHistory: StadiumHistoryStore;
  parkFactorHistory: ParkFactorHistoryStore;

  /** Dynamic designation history (Fan Favorite, Albatross, Cornerstone, etc.) */
  dynamicDesignationHistory: DynamicDesignationHistoryStore;

  /** Chemistry rebalancing records */
  chemistryRebalancingRecords: ChemistryRebalancingStore;

  /** Farm system call-up and send-down records */
  farmSystemLog: FarmSystemLogStore;
}

/** Top-level metadata store (outside any franchise DB) — required for cross-franchise queries */
interface FranchiseRegistry {
  franchiseId: string;
  franchiseName: string;
  creationDate: string;
  dbHandle: string;       // IndexedDB name (kbl-franchise-{id})
  seasonCount: number;
  lastAccessedTimestamp: number;
}
```

### 2.2 Data Flow (Read-Only)

```
MODE 1 (League Builder)
  └── Creates initial franchise data → stored in kbl-franchise-{id}

MODE 2 (Franchise Season)
  ├── Game stats → season stats → career stats (per-game accumulation)
  ├── Standings (game results → W/L/pct/GB)
  ├── Milestones, Designations, Awards candidates
  └── Transaction events (trades, call-ups, DFA, IL)

MODE 3 (Offseason Workshop)
  ├── Awards ceremony results → awardsHistory
  ├── Retirement processing → transactionLog + career finalization
  ├── Draft picks, FA signings, trades → transactionLog
  └── Season archive (final stats snapshot) → seasonArchives

ALMANAC (this document)
  └── READS ALL OF THE ABOVE — never writes
```

### 2.3 Pre-Aggregation Principle

The Almanac does not compute derived stats. All values it displays are written by their producing mode:

| Data | Written By | When |
|------|-----------|------|
| Career batting/pitching/fielding totals | Mode 2 stats pipeline | After every completed game |
| Season final stats | Mode 3 season end | Phase 1 (Season End) |
| Award winners | Mode 3 awards ceremony | Phase 2 (Awards) |
| HOF eligibility | Mode 3 retirement processing | Phase 5 (Retirements) |
| WAR career totals | Mode 2 WAR system | After every completed game |
| Transaction records | Mode 2 + Mode 3 | At transaction time |
| Retired numbers | Mode 3 retirement processing | Phase 5 (Retirements) |

**V1 data gap annotations:**

- **Pitch counts:** May be missing/incomplete — manual entry with skip option per Mode 2 §9 SIMPLIFY. Maddux milestone undetectable when pitch count absent.
- **Transaction types:** Limited to 8 of 11 types for v1 (no DFA, waiver, contract_extension) per Mode 2 §2 SIMPLIFY. Almanac transaction views should not expose UI for the 3 deferred types.

---

## 3. Almanac Sections

> **V1 Scope Note:** §3.3 awards expanded from 9 to all 13 confirmed categories plus designation-based entries. §3.4 HOF Museum adds empty-state placeholder. §3.6 transaction types corrected to 8 for v1 (DFA removed). DFA, waiver, and contract_extension transaction types deferred to v2.

### 3.1 All-Time Leaderboards

Career stat leaders across all completed seasons for the active franchise.

**Batting leaderboards:**

| Stat | Display | Qualifying Minimum |
|------|---------|-------------------|
| AVG | .xxx | 3.1 PA per team game × seasons played |
| HR | count | None |
| RBI | count | None |
| OBP | .xxx | 3.1 PA per team game × seasons played |
| SLG | .xxx | 3.1 PA per team game × seasons played |
| OPS | .xxx | 3.1 PA per team game × seasons played |
| Hits | count | None |
| Runs | count | None |
| SB | count | None |
| WAR (career) | x.x | None |
| WAR (single season) | x.x | None |

**Pitching leaderboards:**

| Stat | Display | Qualifying Minimum |
|------|---------|-------------------|
| W | count | None |
| ERA | x.xx | 1.0 IP per team game × seasons pitched |
| K | count | None |
| WHIP | x.xx | 1.0 IP per team game × seasons pitched |
| Saves | count | None |
| IP | xxx.x | None |
| CG | count | None |
| SO | count | None |
| WAR (career) | x.x | None |

**Fielding leaderboards:**

| Stat | Display | Qualifying Minimum |
|------|---------|-------------------|
| DRS | count | None |
| Gold Gloves | count | None |
| Errors | count (fewest) | Minimum games at position |
| Assists | count | None |

**Advanced leaderboards:**

| Stat | Display | Notes |
|------|---------|-------|
| Career WAR | x.x | Sum of all 5 WAR components (bWAR + pWAR + fWAR + rWAR + mWAR) |
| Single-season WAR | x.x | Best individual season |
| Career WPA | x.xx | Win Probability Added (cumulative) |
| Clutch career | x.xx | Career clutch value (per MODE_2 §13) |

### 3.2 Season Records

Best and worst single-season performances across franchise history.

**Record categories:**

| Record | Direction | Qualifying |
|--------|-----------|-----------|
| Highest batting average | MAX | Qualifying PA |
| Most home runs | MAX | None |
| Most RBI | MAX | None |
| Most stolen bases | MAX | None |
| Lowest ERA | MIN | Qualifying IP |
| Most wins (pitcher) | MAX | None |
| Most strikeouts (pitcher) | MAX | None |
| Most saves | MAX | None |
| Highest single-season WAR | MAX | None |
| Most hits | MAX | None |
| Most runs scored | MAX | None |

**Qualifying thresholds scale with season length** via the adaptive standards engine's `opportunityFactor`:

```
qualifyingPA = 3.1 × gamesPerTeam
qualifyingIP = 1.0 × gamesPerTeam
```

Where `gamesPerTeam` comes from the franchise's rules configuration (16, 32, 64, 128, or 162).

**Display format:**

Each record shows: Player name, team, season number, stat value. If a record is tied, all holders are shown.

### 3.3 Awards History

Historical award winners organized by season.

| Award | Data Shown |
|-------|-----------|
| MVP | Winner + top-3 runners-up, by season |
| Cy Young | Winner + top-3 runners-up, by season |
| Gold Glove | Winners by position, by season |
| Silver Slugger | Winners by position, by season |
| Rookie of the Year | Winner, by season |
| Manager of the Year | Winner, by season |
| Reliever of the Year | Winner, by season |
| Best Bench Player | Winner, by season |
| Platinum Sombrero / Booger Award | Winner, by season |
| Kara Kawaguchi Award | Winner, by season |
| Biggest Bust | Winner, by season |
| Comeback Player of the Year | Winner, by season |
| Fan Favorite | Holder at season end, by season (designation) |
| Albatross | Holder at season end, by season (designation, if any) |
| Cornerstone | Holders at season end, by season (designation) |
| Team Captain | Holder at season end, by season (designation) |

**Navigation:** Users can browse by season (vertical) or by award type (horizontal). Clicking a player name navigates to their career profile.

### 3.4 Hall of Fame Museum

The HOF museum tracks players who have been inducted after retirement.

**Eligibility criteria** (per MODE_2_FRANCHISE_SEASON.md §18.4):
- Player must be retired
- Career WAR must meet HOF threshold (scaled by `opportunityFactor`)
- Player must have played minimum seasons (configurable)

**Museum display:**
- Inducted players with career summary card
- Career stats snapshot at retirement
- Notable achievements (awards, records, milestones)
- Team(s) played for
- Retired jersey number (if applicable)

**Empty-state placeholder:** For young franchises with no inductees yet, displays explanation of the HOF system with eligibility preview (e.g., "No inductees yet — 3 active players are currently on pace for HOF consideration").

**Retired numbers:**
- Each team maintains a list of retired jersey numbers
- Displayed in the team history section
- Set during Mode 3 retirement processing (Phase 5)

### 3.5 Team History

Per-team historical records across all seasons.

| Section | Content |
|---------|---------|
| Season-by-season record | W-L record, finish position, playoff result |
| Championship history | Appearances, wins, opponent, series result |
| All-time roster | Every player who appeared for the team |
| Retired numbers | Jersey numbers retired for the team |
| Stadium history | Current and past stadiums (if stadium changes enabled) |
| Notable seasons | Seasons with franchise-best/worst records |

### 3.6 Transaction History

Searchable log of all franchise transactions.

**Transaction types:**

| Type | Source Mode | Data |
|------|-----------|------|
| Trade | Mode 2 / Mode 3 | Players exchanged, teams, date |
| Free Agent Signing | Mode 3 | Player, team, contract terms |
| Draft Pick | Mode 3 | Round, pick #, player, team |
| Release | Mode 2 / Mode 3 | Player, team, date |
| Call-Up | Mode 2 | Player, from farm, team, date |
| Send-Down | Mode 2 | Player, to farm, team, date |
| Retirement | Mode 3 | Player, team, career summary |
| IL Placement/Return | Mode 2 | Player, team, date, duration |

**Search/filter capabilities:**
- By player name
- By team
- By transaction type
- By season range
- By date range within a season

---

## 4. Cross-Season Query Interface

> **V1 Scope Note:** `franchiseFilter` and `displayColumns` fields added to AlmanacQuery. Filter table expanded to cover all filter fields. Performance targets tiered for single-franchise vs cross-franchise queries.

### 4.1 Query Model

```typescript
interface AlmanacQuery {
  type: 'CAREER_LEADERS' | 'SEASON_RECORDS' | 'AWARDS' | 'TEAM_HISTORY' | 'TRANSACTIONS';
  filters: {
    /** Filter to specific season range, e.g. [3, 7] for seasons 3-7 */
    seasonRange?: [number, number];
    /** Filter to specific team */
    team?: string;
    /** Filter to specific position */
    position?: string;
    /** Filter to specific stat category */
    stat?: string;
    /** Minimum games played (for qualifying) */
    minGames?: number;
    /** Transaction type filter */
    transactionType?: TransactionType;
    /** Player name search */
    playerName?: string;
    /** Filter to specific franchises — empty array = all franchises (per §1 cross-franchise ruling) */
    franchiseFilter?: string[];
  };
  /** Custom view column selection — defines which stat columns appear and their order. Null/undefined = default columns for that query type. */
  displayColumns?: string[];
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  limit: number;
}
```

### 4.2 Query Execution

All queries execute against pre-aggregated IndexedDB stores. The Almanac uses indexed lookups — no full-table scans or recalculations.

**Performance targets (tiered):**

- Single-franchise queries: < 100ms (up to 20 seasons)
- Cross-franchise queries (up to 5 franchises): < 300ms
- Cross-franchise queries (6+ franchises): best-effort, graceful linear degradation

### 4.3 Filtering Behavior

All Almanac views support consistent filtering:

| Filter | Applies To | Behavior |
|--------|-----------|----------|
| Season range | All views | Restricts data to seasons within range |
| Team | All views | Shows only players/records for that team |
| Position | Leaderboards, Records | Filters by player position |
| Min games | Leaderboards, Records | Applies qualifying threshold |
| Transaction type | Transactions | Filters to specific transaction type (8 v1 types) |
| Player name | All views | Free-text search by player name |
| Franchise filter | All views | Restricts to specified franchise(s); empty = all franchises |

Filters are additive (AND logic). Clearing all filters shows all data across all franchises.

---

## 5. Career Player Profile

> **V1 Scope Note:** mWAR display clarified (labeled distinctly as manager-earned). Franchise badge added to every profile. Cross-franchise disambiguation page added for players existing in multiple franchises.

### 5.1 Profile Access

Clicking any player name in the Almanac navigates to their career profile page.

**Cross-franchise disambiguation:** When clicking a player name from a cross-franchise leaderboard or search result, if the player exists in multiple franchises, show a disambiguation page: "Player X exists in N franchises — which profile?" Lists each franchise with key summary stats (seasons played, career WAR, team) so the user can choose. Single-franchise results navigate directly to the profile with no disambiguation.

### 5.2 Profile Content

```typescript
interface CareerProfile {
  player: {
    name: string;
    position: string;
    teams: string[];           // All teams played for
    franchise: string;         // Franchise name badge (required for cross-franchise disambiguation)
    seasonsPlayed: number;
    status: 'active' | 'retired' | 'hof';
  };

  careerStats: {
    batting: BattingStats;     // Career totals
    pitching?: PitchingStats;  // If applicable
    fielding: FieldingStats;   // Career totals
    war: {
      career: number;          // Total WAR
      bWAR: number;
      pWAR: number;
      fWAR: number;
      rWAR: number;
      mWAR: number;            // Labeled "mWAR (as manager)" — earned only during seasons with manager designation
    };
  };

  seasonByseason: PlayerSeasonStats[];  // Each season's stats

  awards: AwardEntry[];        // All awards won
  milestones: Milestone[];     // All milestones achieved
  designations: DesignationHistory[];  // MVP, Ace, Fan Fav, etc.

  transactions: TransactionEntry[];  // All transactions involving player

  hofStatus?: {
    inducted: boolean;
    inductionSeason?: number;
    retiredNumber?: { team: string; number: number };
  };
}
```

### 5.3 Season-by-Season View

Each season entry shows:

- Team
- Games played
- Key stats (position-appropriate: batting for position players, pitching for pitchers)
- WAR for that season
- Awards won that season
- Designations held that season
- Notable milestones reached that season

---

## 6. Implementation Priority

> **V1 Scope Note:** Phase 0 added (cross-franchise infrastructure — must be built first). Phase 7 expanded to include custom views and data export. Almanac nav button present from franchise creation with empty state.

The Almanac can be built incrementally since it is purely read-only:

| Phase | Feature | Dependencies |
|-------|---------|-------------|
| 0 | Cross-franchise infrastructure | Franchise registry store, multi-DB query wrapper, franchise filter UI |
| 1 | All-time leaderboards | Career stats store (written by Mode 2 stats pipeline) |
| 2 | Season records | Season archive store (written by Mode 3 season end) |
| 3 | Awards history | Awards history store (written by Mode 3 awards ceremony) |
| 4 | Career player profiles | All of the above + transaction log |
| 5 | Transaction history | Transaction log store (written by Mode 2 + Mode 3) |
| 6 | HOF Museum | Career stats + retirement processing + HOF eligibility |
| 7 | Full query builder with filters + custom views (saved presets, column selection) + data export (CSV, PDF, JSON) | All stores + indexed queries |

**Phase 0 is foundational** — every subsequent phase inherits cross-franchise query capability.

**Phase 1 is available as soon as career stats accumulate** (after the first completed game in a franchise). Each subsequent phase adds richer historical context.

**Almanac nav button present from franchise creation** but shows empty state ("No games completed yet — play your first game to start building franchise history") until the first completed game populates career stats for Phase 1.

---

## 7. Franchise Isolation

> **V1 Scope Note:** Full rewrite — all 4 original isolation rules replaced with cross-franchise query model. Per-franchise DB isolation unchanged (storage layer); cross-franchise is a query-layer extension. Direct side-by-side comparison views deferred to v2.

Per MODE_1_LEAGUE_BUILDER.md §13, each franchise uses its own IndexedDB (`kbl-franchise-{id}`). The data integrity boundary is unchanged — each franchise is an isolated database. The Almanac adds a **read-only query layer** across all franchise databases:

- **Queries all saved franchise databases** via the franchise registry (§2). Default view: all franchises. Filterable to any combination.
- **Cross-franchise data is the default.** Leaderboards, records, and search results span all franchises unless filtered.
- **Franchise comparison is implicit.** When multiple franchises are included, results are tagged with franchise name. Direct side-by-side comparison views deferred to v2.
- **No "active franchise" concept in Almanac.** The Almanac is franchise-agnostic from the app home screen. Franchise filter replaces franchise switching.

**Dual entry point behavior:**

- **App home screen → Almanac:** Opens with all franchises (no pre-filter)
- **In-franchise nav bar → Almanac:** Opens with that franchise pre-selected as filter (user can clear to see all)

---

## 8. V2 / Deferred Material

> **V1 Scope Note:** Cross-franchise querying and implicit comparison (tagged results) moved to v1 per §1/§7. Data export (CSV, PDF, JSON) moved to v1 per §6 Phase 7. Custom views (saved presets + column selection) moved to v1 per §1. Updated v2 list reflects only remaining deferred items.

The following features are explicitly **out of v1 scope**:

| Feature | Reason |
|---------|--------|
| Cross-franchise side-by-side comparison dashboards | Requires composite widget views (custom dashboards deferred) |
| SQL-like free-form query builder | Basic filters + custom views sufficient for v1 |
| Historical "what-if" queries | Requires alternate-timeline simulation |
| Almanac sharing / screenshots | Social features deferred |
| Franchise merge | Would violate per-franchise DB isolation model |

**Moved to v1 from original v2 list:** Cross-franchise querying (§1, §7), custom views (§1), data export — CSV, PDF, JSON (§6 Phase 7).

See V2_DEFERRED_BACKLOG.md for the consolidated backlog with full context for each deferred item.

---

## 9. Cross-References

> **V1 Scope Note:** Mode 2 §19 reference corrected to §17 (Dynamic Designations). Mode 3 references expanded to comprehensive list. Cross-franchise divergence note added.

| Document | Relevance to Almanac |
|----------|---------------------|
| MODE_1_LEAGUE_BUILDER.md | §13: Data architecture, franchise isolation, storage layout |
| MODE_2_FRANCHISE_SEASON.md | §8: Stats pipeline (writes career stats), §11: WAR system (writes WAR), §17: Dynamic Designations (all 7 types), §18: Milestones, §26: Data flow |
| MODE_3_OFFSEASON_WORKSHOP.md | §3: Season end + championship bonuses, §4: Awards (13 categories), §5: EOS ratings + salary recalc #1, §7: Retirements, §8: FA, §9: Draft, §10: Salary recalc #2, §11: Trades, §12: Salary recalc #3, §13: Farm reconciliation, §14: Chemistry rebalancing, §15: Season archive (critical handoff to Almanac) |
| SPINE_ARCHITECTURE.md | Shared data contracts (Player, Team, Event, Season, CareerStats) |

**Cross-franchise divergence note:** The Almanac's cross-franchise query model (§1, §7) diverges from Mode 1 §13's single-franchise isolation assumption. Mode 1 §13 still governs data storage (each franchise is its own IndexedDB). The Almanac adds a read-only query layer across all franchise DBs. This is a query-layer extension, not a storage-layer violation.

### Source Spec Consumption

| Source Spec | Sections Consumed | Disposition |
|-------------|------------------|-------------|
| ALMANAC_SPEC.md | All sections (§1-§7) | Fully consumed — superseded by this document |
| FRANCHISE_MODE_SPEC.md | §2.1 (career stats, retired numbers), §2.2/3.1-3.2 (storage architecture) | Partially consumed — Almanac-relevant sections only |

---

## 10. Decision Traceability

> **V1 Scope Note:** C-086 updated (trait history source-agnostic — Almanac consumes all trait change events regardless of source). T-001 added (cross-franchise query model — most significant triage decision for this document).

### STEP4 Decisions

No STEP4 decisions apply directly to the Almanac. It is a pure read-only consumer.

### Indirect Dependencies

The Almanac depends on decisions made in other gospels that affect what data is available:

| Decision | Gospel | Impact on Almanac |
|----------|--------|------------------|
| C-074/C-087 | Mode 1 | 13-grade scale determines how grades display in player profiles |
| C-058 | Mode 2 | wOBA scale (1.7821) affects advanced stat display |
| C-065 | Mode 2 | HOF WAR threshold scaling determines museum eligibility |
| C-076 | Mode 1 | Copy-not-reference means franchise data is independent |
| C-057 | Mode 2 | Team Captain designation appears in awards history |
| C-086 | Mode 3 | Trait history source-agnostic: Almanac consumes all trait change events (award ceremony spins, initial assignment, draft generation, future v2 sources). Player profiles show every add/remove event with player ID, trait name, change type, source, and timestamp. V1 sources: award winners (60%) + top performers (30%) per Mode 3 §4, initial assignment (Mode 1 §6), draft generation (Mode 3 §9). 5% regular player lottery deferred to v2. |
| T-001 | Almanac triage | Cross-franchise query model: Almanac queries all saved franchise DBs via franchise registry, diverging from Mode 1 §13's single-franchise assumption. Impacts: §1 (access model), §2 (franchise registry store), §4 (franchiseFilter field), §5 (disambiguation page), §6 (Phase 0 build order), §7 (isolation rewrite). |

---

*This document is the authoritative specification for the KBL Tracker Almanac. It supersedes ALMANAC_SPEC.md. All Almanac features must conform to this specification.*
