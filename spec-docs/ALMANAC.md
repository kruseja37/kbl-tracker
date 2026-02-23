# ALMANAC.md — KBL Tracker Gospel Document (Read-Only Historical Layer)

**Version:** 1.0
**Created:** 2026-02-23
**Status:** GOSPEL — Authoritative specification for the Almanac subsystem
**Supersedes:** ALMANAC_SPEC.md (full consumption)
**Cross-references:** MODE_1_LEAGUE_BUILDER.md (§13 Data Architecture), MODE_2_FRANCHISE_SEASON.md (§26 Franchise Data Flow), MODE_3_OFFSEASON_WORKSHOP.md (§1 Season End, §5 Retirements), SPINE_ARCHITECTURE.md (shared data contracts)
**STEP4 Decisions Applied:** None (Almanac has 0 STEP4 decisions — read-only consumer)

---

## 1. Overview & Purpose

### 1.1 What the Almanac Is

The Almanac is the read-only cross-season historical reference layer for KBL Tracker. It provides browsable, queryable access to all franchise history: career stats, season records, awards, team history, transaction logs, and the Hall of Fame museum.

**Key principle:** The Almanac NEVER writes data. It is a pure consumer of data produced by Mode 1 (League Builder), Mode 2 (Franchise Season), and Mode 3 (Offseason Workshop). All data it displays is pre-aggregated — the Almanac does not recalculate.

### 1.2 Availability

The Almanac is accessible at ALL times regardless of current mode:

- During a season (Mode 2): accessible via top-level navigation
- During offseason (Mode 3): accessible via top-level navigation
- From the franchise home screen: accessible via top-level navigation
- From League Builder (Mode 1): NOT available (no franchise data exists yet)

The Almanac only shows data for the **active franchise**. There is no cross-franchise comparison (each franchise is an isolated IndexedDB instance per MODE_1_LEAGUE_BUILDER.md §13).

### 1.3 Navigation

The Almanac appears as a primary navigation item:

```
┌──────────────────────────────────────────────────────┐
│  [Season]  [Roster]  [Standings]  [📚 Almanac]      │
└──────────────────────────────────────────────────────┘
```

---

## 2. Data Sources

### 2.1 Storage Architecture

The Almanac reads from four IndexedDB stores within the active franchise database (`kbl-franchise-{id}`):

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

---

## 3. Almanac Sections

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
| Fan Favorite | Holder at season end, by season |
| Albatross | Holder at season end, by season (if any) |
| Cornerstone | Holders at season end, by season |
| Team Captain | Holder at season end, by season |

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
| Release / DFA | Mode 2 / Mode 3 | Player, team, date |
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
  };
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  limit: number;
}
```

### 4.2 Query Execution

All queries execute against pre-aggregated IndexedDB stores. The Almanac uses indexed lookups — no full-table scans or recalculations.

**Performance target:** All Almanac queries return in < 100ms for franchises up to 20 seasons.

### 4.3 Filtering Behavior

All Almanac views support consistent filtering:

| Filter | Applies To | Behavior |
|--------|-----------|----------|
| Season range | All views | Restricts data to seasons within range |
| Team | All views | Shows only players/records for that team |
| Position | Leaderboards, Records | Filters by player position |
| Min games | Leaderboards, Records | Applies qualifying threshold |

Filters are additive (AND logic). Clearing all filters shows franchise-wide data.

---

## 5. Career Player Profile

### 5.1 Profile Access

Clicking any player name in the Almanac navigates to their career profile page.

### 5.2 Profile Content

```typescript
interface CareerProfile {
  player: {
    name: string;
    position: string;
    teams: string[];           // All teams played for
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
      mWAR: number;            // Only if player was ever manager
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

The Almanac can be built incrementally since it is purely read-only:

| Phase | Feature | Dependencies |
|-------|---------|-------------|
| 1 | All-time leaderboards | Career stats store (written by Mode 2 stats pipeline) |
| 2 | Season records | Season archive store (written by Mode 3 season end) |
| 3 | Awards history | Awards history store (written by Mode 3 awards ceremony) |
| 4 | Career player profiles | All of the above + transaction log |
| 5 | Transaction history | Transaction log store (written by Mode 2 + Mode 3) |
| 6 | HOF Museum | Career stats + retirement processing + HOF eligibility |
| 7 | Full query builder with filters | All stores + indexed queries |

**Phase 1 is available as soon as career stats accumulate** (after the first completed game in a franchise). Each subsequent phase adds richer historical context.

---

## 7. Franchise Isolation

Per MODE_1_LEAGUE_BUILDER.md §13, each franchise uses its own IndexedDB (`kbl-franchise-{id}`). The Almanac:

- Only queries the **active** franchise's database
- Shows NO cross-franchise data
- Does not support franchise comparison
- Automatically reflects data from the currently loaded franchise

If the user switches franchises (via Franchise Selector), the Almanac refreshes to show the new franchise's history.

---

## 8. V2 / Deferred Material

The following features are explicitly **out of v1 scope**:

| Feature | Reason |
|---------|--------|
| Cross-franchise comparison | Each franchise is isolated by design |
| Data export (CSV, PDF) | Polish feature for later |
| Custom query builder (SQL-like) | Complexity; basic filters sufficient for v1 |
| Historical "what-if" queries | Requires alternate-timeline simulation |
| Almanac sharing / screenshots | Social features deferred |
| Franchise merge | Would violate isolation model |

---

## 9. Cross-References

| Document | Relevance to Almanac |
|----------|---------------------|
| MODE_1_LEAGUE_BUILDER.md | §13: Data architecture, franchise isolation, storage layout |
| MODE_2_FRANCHISE_SEASON.md | §8: Stats pipeline (writes career stats), §11: WAR system (writes WAR), §18: Milestones, §19: Fan Favorite/Albatross, §26: Data flow |
| MODE_3_OFFSEASON_WORKSHOP.md | §1: Season end (archives season), §2: Awards ceremony, §5: Retirements (HOF, retired numbers), §6-9: Transactions |
| SPINE_ARCHITECTURE.md | Shared data contracts (Player, Team, Event, Season, CareerStats) |

### Source Spec Consumption

| Source Spec | Sections Consumed | Disposition |
|-------------|------------------|-------------|
| ALMANAC_SPEC.md | All sections (§1-§7) | Fully consumed — superseded by this document |
| FRANCHISE_MODE_SPEC.md | §2.1 (career stats, retired numbers), §2.2/3.1-3.2 (storage architecture) | Partially consumed — Almanac-relevant sections only |

---

## 10. Decision Traceability

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
| C-086 | Mode 3 | Trait assignment via wheel spin — trait history in player profiles |

---

*This document is the authoritative specification for the KBL Tracker Almanac. It supersedes ALMANAC_SPEC.md. All Almanac features must conform to this specification.*
