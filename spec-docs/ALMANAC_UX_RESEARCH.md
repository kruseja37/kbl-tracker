# ALMANAC UX RESEARCH — Competitive Analysis & Best Practices

**Created:** 2026-03-17
**Purpose:** Reference ammunition for the Almanac UX interrogation (Claude Code CLI | Opus)
**Sources:** Baseball Reference, FanGraphs, Baseball Savant, Stathead, OOTP, PitcherList, sports UX case studies

---

## 1. The Gold Standards — What Works in Digital Baseball Almanacs

### Baseball Reference (baseball-reference.com)
The de facto baseball almanac. What makes it work:

- **Information architecture is URL-driven.** Every player, team, season, and game has a permanent, predictable URL. `/players/t/troutmi01.shtml` — you can guess the URL structure. This matters because it makes deep-linking and "send someone a stat" trivial.
- **Player pages are the atomic unit.** Everything radiates from the player page: career stats table, year-by-year splits, game logs, similar players, transactions, awards. The player page IS the almanac entry.
- **Tables are king.** Dense, sortable HTML tables with alternating row colors. No cards, no tiles, no carousels. Just rows of numbers. Power users LOVE this — they can scan 20 seasons of stats in 3 seconds.
- **Contextual links everywhere.** Every team name links to that team's page. Every season links to that season's overview. Every stat abbreviation links to a glossary. The entire site is a hyperlinked graph, not a hierarchy.
- **"Black Ink" and similarity scores** — meta-stats that contextualize a career. "How does this player compare to historical peers?" This is the almanac feature that makes it feel like MORE than a spreadsheet.
- **Weakness:** The site looks like it was designed in 2004 because it was. Information density is great for desktop power users but brutal on mobile/tablet.

### FanGraphs (fangraphs.com)
The analytical complement to Baseball Reference:

- **Custom leaderboards are the killer feature.** Users select which stat columns to display, set minimum PA/IP thresholds, filter by position/age/date range, and sort. This is the "query builder" for baseball nerds.
- **Splits are first-class.** vs LHP/RHP, home/away, by month, by count — splits are not buried, they're tabs on the player page.
- **"Data sorting" is the UX pattern.** FanGraphs excels at letting users define their own view of the data. The UI is distinctive green, clean, and table-oriented — but with filter controls prominently above the table.
- **Glossary integration** — hovering over any stat abbreviation shows a tooltip definition. Crucial for advanced stats that casual users don't know (wRC+, FIP, WAR).
- **War graphs** — visual career arc showing WAR by season as a simple bar chart. Instantly shows peak, decline, and career shape.

### Baseball Savant (baseballsavant.mlb.com)
The visualization-forward platform:

- **Percentile ranking bars** are the signature UI element. A horizontal slider showing where a player ranks from 0-100 in each Statcast metric. Color-coded (blue = bad, red = elite). This is the "Bite" layer — you understand the player in 2 seconds.
- **Spray charts** — interactive field diagrams showing batted ball locations, color-coded by outcome or exit velocity. THE canonical baseball visualization.
- **Pitch movement plots** — scatter plots of horizontal vs vertical movement for each pitch type. Beautiful, information-dense, unique to Savant.
- **"Savant Illustrator"** — tool to create custom graphics with stats overlaid. The export/share use case.
- **Statcast Search** — the power-query tool. Filter by pitch type, velocity, launch angle, sprint speed, date range, game situation. Returns per-pitch data. This is the "Meal" layer.
- **Key insight:** Savant succeeds because it has BOTH the instant-scan percentile bars AND the deep-dive search. Two entry points for two mindsets.

### Stathead (sports-reference.com/stathead)
The paid research tool layer on top of Baseball Reference:

- **Query types define navigation:** Season/Career Finder, Game Finder, Streak Finder, Span Finder, Versus Finder, Split Finder. Each is a form-based search that returns a sortable results table.
- **The pattern:** Form → Filter → Table → Export. Every query follows this.
- **Versus Finder** — player-vs-player, player-vs-team, team-vs-team comparisons. This is the "who would win" feature.
- **"Find any player, any team, any season, any game"** — the tagline captures the design philosophy: universal search across all dimensions.

---

## 2. OOTP's Almanac — The Game Precedent

OOTP's almanac is essentially a **season-by-season HTML report archive.** Key behaviors:

- Archives box scores, game logs, transaction logs, news, replay files, and league reports at season end
- Organized by year: `/news/almanac_2007/`, `/news/almanac_2008/`
- Accessible via menu: `Game Menu >> Almanac >> Almanac 2007`
- Two profiles: "complete almanac" (all reports) or "box scores & game logs only"
- Critically: **player historical statistics are ALWAYS retained** even without the almanac — the almanac archives the PRESENTATION (reports), not the data itself
- Can also automate data exports (CSV dumps) for external tools

**Design lesson for KBL:** OOTP's almanac is a static archive. KBL's should be a dynamic query interface. OOTP preserves snapshots; KBL should provide live reads from the data stores. The OOTP model is "yearbook" — the KBL model should be "search engine."

---

## 3. UX Patterns That Apply to KBL's Almanac

### The "Bite, Snack, Meal" Framework (SGX Studio)
A layered approach to sports data density:

- **Bite:** The headline insight. One number, one sentence, one badge. "Player X: 4.2 WAR, 3rd in league." Must be visually dominant and require zero interaction.
- **Snack:** Context for the bite. A small chart showing trend, a comparison row, a mini-table. Requires a glance but no tap.
- **Meal:** The full dataset. Sortable tables, year-by-year splits, game logs. Requires intentional exploration.

**Application to KBL:** Every Almanac view should have all three layers. The landing page is Bites (top performers, recent milestones, records). Tapping into a player is the Snack (career summary card). The full stats table is the Meal.

### Persistent Top Bar + Tabbed Navigation (PitcherList case study)
The winning pattern for data-heavy player pages:

- **Persistent top bar** with key bio + headline stats (name, position, team, career WAR)
- **Tabbed content area** below: Overview | Batting | Pitching | Fielding | Awards | Game Log | Transactions
- The top bar never scrolls away — the user always knows WHO they're looking at
- Tabs let the user control depth without navigating away

### Interactive Filters Above Tables
The FanGraphs/Stathead pattern:

- Filter controls (dropdowns, date pickers, min/max sliders) sit ABOVE the data table
- Changing a filter immediately updates the table below
- Filters are "sticky" — they persist as you navigate between tabs
- "Reset all filters" button always visible

### Radar/Percentile Charts for Player Snapshots
The Baseball Savant innovation:

- 6-8 key metrics shown as percentile bars or a radar polygon
- Color-coded: gradient from poor (blue) to elite (red)
- Shows what KIND of player this is instantly — power hitter? contact specialist? strikeout pitcher?
- Works for KBL because the app already computes WAR components, clutch, fame, etc.

### Spray Chart as Identity
Every baseball data platform puts the spray chart front and center because it's:

- Visually distinctive (looks like a baseball field, not a generic chart)
- Immediately readable (dense dots = pull hitter, spread dots = all-fields hitter)
- KBL already has spray zone data on AtBatEvents — this is buildable

---

## 4. Information Architecture Recommendations

### Navigation Structure (suggested)
```
ALMANAC HOME
├── Players (search + browse + leaderboards)
│   └── Player Profile (career card + tabs)
├── Games (browse + filter by date/team/mode)
│   └── Game Detail (box score + play-by-play)
├── Records (single-game records + career records)
├── Milestones & Moments (timeline + filterable list)
├── Teams (team pages with history + roster history)
└── [Future: Seasons, Awards, Transactions — when franchise data exists]
```

### Search as Primary Navigation
Baseball Reference's insight: the search bar is the most-used navigation element. Users don't browse — they search for a player name, then explore from there. The Almanac should have a prominent search bar on every page that searches across players, teams, games, and records simultaneously.

### URL-Addressable Views
Every state of the Almanac should be linkable/bookmarkable. Filter selections should be encoded in the URL or a shareable state token. "Show me all players with 3+ HR in exhibition mode" should be a reproducible query.

---

## 5. Data Visualization Best Practices for Sports

### Chart Type Selection
| Data Pattern | Best Visualization | Example |
|---|---|---|
| Player career arc | Bar chart (WAR by season) | FanGraphs WAR graph |
| Batting tendencies | Spray chart (field diagram) | Baseball Savant |
| Stat ranking | Percentile bars | Baseball Savant player card |
| Trend over time | Line chart | Batting avg progression |
| Comparison (2 players) | Side-by-side tables or radar overlay | Stathead Versus Finder |
| Distribution | Histogram or box plot | Exit velocity distribution |
| Game narrative | Annotated timeline | Win probability chart |

### Color Conventions
- Performance scale: Blue (cold/poor) → White (neutral) → Red (hot/elite)
- Baseball Savant pioneered this with percentile bars
- Consistent color = learnable at a glance

### Mobile/Tablet Density
- Tables should horizontally scroll with a frozen first column (player name)
- Avoid responsive "card collapse" for stat tables — it breaks scannability
- Use progressive disclosure: show 5 columns by default, "Show all stats" expands
- Touch targets: 44px minimum, but stat cells can be smaller since this is a lean-forward (full attention) interface

---

## 6. What KBL Has That the Pros Don't

KBL Tracker has a unique advantage: **the user generated ALL the data.** Every at-bat was recorded by the user. This creates opportunities the big platforms can't offer:

- **"My best moment" highlighting** — the user remembers recording that walk-off HR. The Almanac can surface it.
- **Personal narrative** — "You've played 47 exhibition games. Your longest win streak is 8 games. Your most-used lineup produced a .340 team BA."
- **Completeness guarantees** — unlike MLB data which has gaps, KBL data is exactly as complete as the user made it. The Almanac can show enrichment completeness ("72% of your games have pitch count data").
- **Cross-mode comparison** — "Your player Smith hit .400 in exhibition but .280 in franchise season 3." No real baseball platform can do this.

---

## 7. Anti-Patterns to Avoid

1. **Dashboard-first design.** Dashboards work for monitoring (live data changing). Almanacs are for exploration (static data, user-directed queries). Don't build a dashboard.
2. **Card-based layouts for dense stats.** Cards waste space. Tables are better for comparing 10+ entities across 8+ stat columns.
3. **Forced visualization.** Not every number needs a chart. Sometimes a well-formatted table with good sorting IS the best visualization.
4. **Hiding the data.** Don't make users click 3 times to see a stat table. The table should be the default view, with visualizations as supplements.
5. **Mobile-first compromises on tablet.** KBL is iPad landscape. Design for information density, not phone constraints.

---

*This document is research ammunition, not a spec. Feed it to the Almanac interrogation session as context.*
