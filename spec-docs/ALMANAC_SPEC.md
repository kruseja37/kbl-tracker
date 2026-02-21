# KBL Almanac Specification

**Version**: 1.0
**Status**: Draft
**Last Updated**: February 2026

---

## 1. Overview

The Almanac is a top-level navigation feature providing cross-season historical reference for the entire franchise. It allows users to browse, query, and compare data across all completed seasons — the "record book" for their league.

> **Key Principle**: The Almanac is ALWAYS accessible regardless of current mode (Season, Offseason, or League Builder). It's a read-only reference tool.

---

## 2. Top-Level Navigation

The Almanac appears as a primary nav item alongside Season, Roster, and Standings:

```
┌──────────────────────────────────────────────────────┐
│  [Season]  [Roster]  [Standings]  [📚 Almanac]      │
└──────────────────────────────────────────────────────┘
```

---

## 3. Almanac Sections

### 3.1 All-Time Leaderboards

Career stat leaders across all seasons:

| Category | Stats |
|----------|-------|
| Batting | AVG, HR, RBI, OBP, SLG, OPS, Hits, Runs, SB |
| Pitching | W, ERA, K, WHIP, Saves, IP, CG, SO |
| Fielding | DRS, Gold Gloves, Errors, Assists |
| Advanced | WAR (career), WAR (single season), WPA |

### 3.2 Season Records

Best/worst single-season performances:
- Highest batting average (min qualifying)
- Most home runs in a season
- Lowest ERA (min qualifying IP)
- Most wins by a pitcher
- Highest single-season WAR

### 3.3 Awards History

| Award | Data |
|-------|------|
| MVP | Winner + runners-up by season |
| Cy Young | Winner + runners-up by season |
| Gold Glove | Winners by position by season |
| Silver Slugger | Winners by position by season |
| Rookie of the Year | Winner by season |

### 3.4 Team History

Per-team historical records:
- Season-by-season W-L records
- Championship appearances and wins
- All-time roster (every player who played for team)
- Retired numbers
- Stadium history

### 3.5 Transaction History

Searchable log of all trades, free agent signings, draft picks, releases, and retirements across all seasons.

---

## 4. Cross-Season Queries

### 4.1 Query Interface

```typescript
interface AlmanacQuery {
  type: 'CAREER_LEADERS' | 'SEASON_RECORDS' | 'AWARDS' | 'TEAM_HISTORY' | 'TRANSACTIONS';
  filters: {
    seasonRange?: [number, number];  // e.g., [1, 5]
    team?: string;
    position?: string;
    stat?: string;
    minGames?: number;
  };
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  limit: number;
}
```

### 4.2 Filtering

All Almanac views support filtering by:
- Season range (e.g., "Seasons 3-7")
- Team
- Position
- Minimum games/plate appearances/innings pitched

### 4.3 Data Source

The Almanac reads from career stats tables and season archives stored in IndexedDB. It does NOT recalculate — it reads pre-aggregated data.

```typescript
interface AlmanacDataSource {
  careerStats: CareerStatsStore;
  seasonArchives: SeasonArchiveStore;
  awardsHistory: AwardsHistoryStore;
  transactionLog: TransactionLogStore;
}
```

---

## 5. Cross-Save Support

Since each franchise is an isolated IndexedDB, the Almanac only shows data for the active franchise. There is no cross-franchise comparison.

---

## 6. Implementation Priority

The Almanac can be built incrementally:
1. **Phase 1**: All-time leaderboards (career stats already aggregated)
2. **Phase 2**: Season records (requires season archive queries)
3. **Phase 3**: Awards history (requires awards data persistence)
4. **Phase 4**: Transaction history (requires transaction log)
5. **Phase 5**: Full query builder with filters

---

## 7. Cross-References

| Spec | Relevance |
|------|-----------|
| STAT_TRACKING_ARCHITECTURE_SPEC.md | Data storage for career/season stats |
| FRANCHISE_MODE_SPEC.md | IndexedDB per-franchise storage |
| SEPARATED_MODES_ARCHITECTURE.md | Always-available feature across modes |
| AWARDS_CEREMONY_FIGMA_SPEC.md | Awards data structure |

---

*Last Updated: February 20, 2026*
