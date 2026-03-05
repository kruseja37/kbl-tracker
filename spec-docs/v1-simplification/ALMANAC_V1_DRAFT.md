# ALMANAC — V1 Triage Draft

**Source Document:** ALMANAC.md (484 lines, 10 sections)
**Total Sections:** 10
**Triage Started:** 2026-03-04
**Status:** IN PROGRESS

---

## Rulings

### §1 — Overview & Purpose
**Ruling:** SIMPLIFY (spec corrections + new features)
**v1 Scope:**

v1 KEEPS:
- Read-only, pre-aggregated data principle (Almanac never writes)
- Primary nav bar placement
- Accessible at all times (Mode 2, Mode 3, franchise home)

v1 CHANGES FROM SPEC:
- Almanac accessible from **app home screen** (not just inside a loaded franchise)
- Cross-franchise querying: Almanac reads from **all saved franchises**, filterable by any combination of franchises
- Requires new franchise registry index (lightweight metadata store listing all saved franchise DBs)
- Every Almanac result tagged with franchise name for disambiguation
- Custom views (Low + Medium tier): saved filter presets + custom leaderboard column selection. User picks stat columns, sets filters (franchise, team, season range, position, qualifying minimums), chooses sort order, saves as named view. Stored as serialized query config objects. Savable, loadable, deletable.

v1 DEFERS:
- Custom dashboards / composite multi-widget views (High tier) → v2

**JK's Reasoning:** The Almanac should be the history wing of the whole app, not a tab buried inside each franchise. Cross-franchise access from the home screen is the right product. Custom views are low-risk since the Almanac is read-only — it's just saved query configurations.
**Dependencies Flagged:**
- Mode 1 §13 (franchise isolation): Each franchise is its own IndexedDB. Cross-franchise queries require a franchise registry and multi-DB read layer. Resolution: PROCEED — add franchise registry + multi-DB query wrapper.
- §4 (Query Interface) in this document: AlmanacQuery must add `franchiseFilter: string[]` field.
- §7 (Franchise Isolation) in this document: Must be rewritten to reflect cross-franchise access model.
- Custom views require a small persistence store (saved query configs) — this is the ONE exception to "Almanac never writes data" (it writes user preferences, not franchise data).

### §2 — Data Sources
**Ruling:** SIMPLIFY (spec corrections + new store)
**v1 Scope:**

v1 KEEPS:
- All 11 IndexedDB stores in `AlmanacDataSources` interface (careerStats, seasonArchives, awardsHistory, transactionLog, transactionEventStream, managingStats, stadiumHistory, parkFactorHistory, dynamicDesignationHistory, chemistryRebalancingRecords, farmSystemLog)
- Two-store transaction design: `transactionEventStream` for chronological raw tape, `transactionLog` for searchable/filterable queries. Event stream feeds transaction log, not the other way around.
- Data flow diagram (Mode 1 → creation, Mode 2 → game data, Mode 3 → offseason data, Almanac → reads all)
- Pre-aggregation principle (Almanac does not compute derived stats)

v1 CHANGES FROM SPEC:
- **12th store added:** `franchiseRegistry` — top-level metadata store (outside any franchise DB) that tracks all saved franchises. Fields: franchise ID, franchise name, creation date, DB handle/name, season count, last-accessed timestamp. Required by §1 cross-franchise ruling.
- **v1 gap annotations added to pre-aggregation table:**
  - Pitch counts: May be missing/incomplete — manual entry with skip option per Mode 2 §9 SIMPLIFY. Maddux milestone undetectable when pitch count absent.
  - Transaction types: Limited to 8 of 11 types per Mode 2 §2 SIMPLIFY (no dfa, waiver, contract_extension). Almanac transaction views should not expose UI for the 3 deferred types.

v1 DEFERS:
- Cold storage tier (per Mode 2 §26 SIMPLIFY) — Warm tier is Almanac's read source for v1

**JK's Reasoning:** Define the franchise registry here so the Almanac spec is self-contained. Annotate v1 data gaps inline rather than requiring cross-reference to Mode draft docs. Keep two transaction stores — they serve different access patterns (chronological vs searchable).
**Dependencies Flagged:** None new — franchise registry was already flagged in §1.

### §3 — Almanac Sections
**Ruling:** SIMPLIFY (spec corrections)
**v1 Scope:**

v1 KEEPS:
- §3.1 All-Time Leaderboards: All 28 stat categories (11 batting + 9 pitching + 4 fielding + 4 advanced) as the **default** leaderboard set. Qualifying minimums scale with season length (3.1 PA/game batters, 1.0 IP/game pitchers). Users can add/remove/reorder columns via custom views (per §1 ruling).
- §3.2 Season Records: All 11 single-season record categories. Qualifying thresholds via `opportunityFactor`. Ties show all holders.
- §3.4 HOF Museum: Full eligibility criteria (retired + career WAR threshold + minimum seasons). Career summary card, stats snapshot, achievements, teams, retired number. **Empty-state placeholder** for young franchises: displays explanation of HOF system with eligibility preview (e.g., "No inductees yet — 3 active players are currently on pace for HOF consideration").
- §3.5 Team History: All 6 sections (season-by-season record, championship history, all-time roster, retired numbers, stadium history, notable seasons).

v1 CHANGES FROM SPEC:
- §3.3 Awards History: Expanded from 8 to **all 13 award categories** confirmed in Mode 3 §4 triage: MVP, Cy Young, Gold Glove, Silver Slugger, ROY, Manager of the Year, Reliever of the Year, Best Bench Player, Platinum Sombrero/Booger Award, Kara Kawaguchi Award, Biggest Bust, Comeback Player of the Year, plus designation-based entries (Fan Favorite, Albatross, Cornerstone, Team Captain). Browsable by season or by award type. Player names link to career profiles.
- §3.6 Transaction History: Corrected to **8 transaction types** for v1 (trade, FA signing, draft pick, **release**, call-up, send-down, retirement, IL placement/return). "Release / DFA" split — DFA removed per Mode 2 §2 SIMPLIFY. UI should not expose DFA as a filter option.

v1 DEFERS:
- DFA transaction type display (deferred with Mode 2 §2)
- Waiver and contract_extension transaction type display (deferred with Mode 2 §2)

**JK's Reasoning:** Display all 13 awards — they're all being tracked, no reason to hide any from the Almanac. Clean up the DFA reference since it's not a v1 transaction type. HOF placeholder keeps the section discoverable even when empty.
**Dependencies Flagged:** None — all upstream data sources confirmed in prior mode triage.

### §4 — Cross-Season Query Interface
**Ruling:** SIMPLIFY (spec corrections + new fields + performance targets)
**v1 Scope:**

v1 KEEPS:
- `AlmanacQuery` interface with 5 query types (CAREER_LEADERS, SEASON_RECORDS, AWARDS, TEAM_HISTORY, TRANSACTIONS)
- All 7 filter fields (seasonRange, team, position, stat, minGames, transactionType, playerName)
- Indexed lookups only — no full-table scans or recalculations
- AND logic for filter stacking. Clearing all filters shows all data.
- Query execution against pre-aggregated IndexedDB stores

v1 CHANGES FROM SPEC:
- **`franchiseFilter: string[]` added** to AlmanacQuery filters object (per §1 cross-franchise ruling). Empty array = all franchises. Populated array = only specified franchises.
- **`displayColumns: string[]` added** to AlmanacQuery for custom view column selection (per §1 custom views ruling). Defines which stat columns appear and their order. Null/undefined = default columns for that query type.
- **Awards filter options expanded** to cover all 13 award categories (per §3 ruling), not just the original 8.
- **§4.3 filter behavior table expanded** from 4 rows to cover all filter fields: seasonRange, team, position, minGames, transactionType, playerName, franchiseFilter. Each with "Applies To" and "Behavior" columns.
- **Performance targets tiered:**
  - Single-franchise queries: < 100ms (up to 20 seasons)
  - Cross-franchise queries (up to 5 franchises): < 300ms
  - Cross-franchise queries (6+ franchises): best-effort, graceful linear degradation

v1 DEFERS:
- Nothing — full query interface ships in v1

**JK's Reasoning:** Record spec corrections to align the query model with §1 and §3 rulings. Tiered performance targets are realistic — each additional franchise DB adds ~20-50ms of sequential IndexedDB open + lookup. 5 franchises is a reasonable power-user ceiling for v1.
**Dependencies Flagged:** None new — all changes flow from prior rulings in this document.

### §5 — Career Player Profile
**Ruling:** SIMPLIFY (spec corrections for cross-franchise)
**v1 Scope:**

v1 KEEPS:
- Click any player name in any Almanac view → navigates to career profile
- Full `CareerProfile` interface: player identity (name, position, teams, seasons, status: active/retired/hof), career stat totals (batting, pitching if applicable, fielding), 6-component WAR breakdown (bWAR, pWAR, fWAR, rWAR, mWAR + career total), season-by-season stats array, awards list, milestones list, designation history (all 7 types), transaction history, HOF status
- Season-by-season view: team, games played, position-appropriate stats, WAR, awards, designations, milestones per season

v1 CHANGES FROM SPEC:
- **mWAR display clarified:** mWAR shown alongside other 4 WAR components but labeled distinctly (e.g., "mWAR (as manager)") to indicate it's earned only during seasons where the player held the manager designation. Not a separate role — it's a player attribute.
- **Franchise badge on profile:** Every career profile tagged with franchise name. Required because cross-franchise access (§1 ruling) means the same SMB4 player imported into multiple franchises has separate profiles with divergent career histories.
- **Cross-franchise disambiguation page:** When clicking a player name from a cross-franchise leaderboard or search result, if the player exists in multiple franchises, show disambiguation page: "Player X exists in 3 franchises — which profile?" Lists each franchise with key summary stats (seasons played, career WAR, team) so user can choose. Single-franchise results navigate directly to profile with no disambiguation.

v1 DEFERS:
- Nothing — full career profile ships in v1

**JK's Reasoning:** mWAR needs clear labeling since it's contextual (not every season). Franchise badge prevents confusion when browsing cross-franchise. Disambiguation page is the right UX for multi-franchise players — don't guess which profile the user wants, ask them.
**Dependencies Flagged:** None — all upstream data confirmed in prior rulings. Disambiguation page is new UI but low complexity (list of franchise summaries with click targets).

### §6 — Implementation Priority
**Ruling:** SIMPLIFY (spec corrections — updated build order)
**v1 Scope:**

v1 KEEPS:
- Incremental build approach (each phase ships independently as upstream data becomes available)
- All 7 original phases retained

v1 CHANGES FROM SPEC:
- **Phase 0 added (foundational):** Cross-franchise infrastructure — franchise registry store, multi-DB query wrapper, franchise filter UI. Must be built FIRST since every subsequent phase depends on it.
- **Phase 7 expanded:** "Full query builder with filters" now includes custom views (saved filter presets + custom leaderboard column selection per §1 ruling). Custom views are the UI layer on top of the query engine, so they ship alongside the full filter UI.
- **Phase 7 clarified:** The underlying query engine is built incrementally with each phase (Phases 1–6 each add indexed lookups for their data type). Phase 7 is specifically the **full filter UI** — exposing all filter controls on screen — not a separate backend effort.
- **Almanac nav button present from franchise creation** but shows empty state ("No games completed yet — play your first game to start building franchise history") until the first completed game populates career stats for Phase 1.

Updated build order:
  - Phase 0: Cross-franchise infrastructure (franchise registry, multi-DB reads, franchise filter)
  - Phase 1: All-time leaderboards (available after first completed game)
  - Phase 2: Season records (after first Mode 3 season end)
  - Phase 3: Awards history (after first Mode 3 awards ceremony)
  - Phase 4: Career player profiles (all of above + transaction log)
  - Phase 5: Transaction history (transaction log from Mode 2 + Mode 3)
  - Phase 6: HOF Museum (career stats + retirement processing + HOF eligibility)
  - Phase 7: Full query builder with filters + custom views (saved presets, column selection) + data export (CSV, PDF, JSON)

v1 DEFERS:
- Nothing — all phases ship in v1

**JK's Reasoning:** Cross-franchise is foundational — build it first so every phase inherits it. Custom views are a UI concern that ships with the query builder. Almanac button should be visible from day one with an empty state, not hidden until data exists.
**Dependencies Flagged:** None — Phase 0 resolves the cross-franchise dependency for all downstream phases.

### §7 — Franchise Isolation
**Ruling:** SIMPLIFY (full rewrite — spec contradicted by §1 ruling)
**v1 Scope:**

v1 KEEPS:
- Per-franchise IndexedDB isolation (each franchise is still its own database per Mode 1 §13 — data integrity boundary unchanged)

v1 CHANGES FROM SPEC (all 4 original rules rewritten):
- Rule 1 → **Queries all saved franchise databases** via the franchise registry (§2). Default view: all franchises. Filterable to any combination.
- Rule 2 → **Cross-franchise data is the default.** Leaderboards, records, and search results span all franchises unless filtered.
- Rule 3 → **Franchise comparison is implicit.** When multiple franchises are included, results are tagged with franchise name. Direct side-by-side comparison views deferred to v2 (per §1 deferred dashboards).
- Rule 4 → **No "active franchise" concept in Almanac.** The Almanac is franchise-agnostic from the app home screen. Franchise filter replaces franchise switching.
- **Dual entry point behavior:**
  - App home screen → Almanac button: Opens with all franchises (no pre-filter)
  - In-franchise nav bar → Almanac: Opens with that franchise pre-selected as filter (user can clear to see all)

v1 DEFERS:
- Direct side-by-side franchise comparison views → v2 (dashboards)

**JK's Reasoning:** The original isolation model was too restrictive. The Almanac should be the history wing of the whole app. Per-franchise DB isolation is still the storage model — cross-franchise is a query-layer concern, not a data-layer change.
**Dependencies Flagged:** None — this rewrite resolves the contradiction flagged in §1. All prior rulings (§2 franchise registry, §4 franchiseFilter, §5 disambiguation page, §6 Phase 0) already assume this model.

### §8 — V2 / Deferred Material
**Ruling:** SIMPLIFY (updated v2 list — 1 item moved to v1, 2 items clarified)
**v1 Scope:**

v1 CHANGES FROM SPEC:
- **"Cross-franchise comparison" line updated:** Cross-franchise querying and implicit comparison (tagged results) moved to v1 per §1/§7 rulings. Only direct side-by-side comparison dashboards remain v2.
- **"Custom query builder (SQL-like)" line clarified:** Custom views (saved filter presets + column selection) moved to v1 per §1 ruling. Only SQL-like free-form query interface remains v2.
- **"Data export (CSV, PDF)" moved to v1:** Three export formats: CSV (spreadsheet import), PDF (printable reports), JSON (data portability). Exports respect current filters and custom view column selection. Available from any Almanac view.

v1 DEFERS (updated list):
- Cross-franchise side-by-side comparison dashboards — v2 (requires composite widget views)
- SQL-like free-form query builder — v2 (basic filters + custom views sufficient for v1)
- Historical "what-if" queries — v2 (requires alternate-timeline simulation)
- Almanac sharing / screenshots — v2 (social features deferred)
- Franchise merge — v2 (would violate per-franchise DB isolation model)

**JK's Reasoning:** Data export is a natural companion to read-only custom views — if users can build custom stat tables, they should be able to take them out of the app. All three formats (CSV, PDF, JSON) are trivial to generate from pre-aggregated data. Cross-franchise and custom query lines needed clarification to distinguish what moved to v1 from what's still v2.
**Dependencies Flagged:**
- Data export adds to §6 build order: should slot into Phase 7 alongside custom views (same UI surface, same query results). Noted for cross-reference reconciliation.

### §9 — Cross-References
**Ruling:** SIMPLIFY (spec corrections — updated references)
**v1 Scope:**

v1 KEEPS:
- Cross-reference table structure (document → relevant sections → Almanac relevance)
- Source spec consumption table (ALMANAC_SPEC.md fully consumed, FRANCHISE_MODE_SPEC.md partially consumed)

v1 CHANGES FROM SPEC:
- **Mode 2 reference corrected:** §19 (Fan Fav/Albatross) replaced with **§17 (Dynamic Designations)** — §17 defines all 7 designation types that the Almanac displays per §3 ruling. §19 was the designation carryover section (deferred in Mode 2 triage), not the definition section.
- **Mode 3 references expanded:** "§1 (season end), §2 (awards), §5 (retirements), §6-9 (transactions)" replaced with comprehensive list: §3 (season end + championship bonuses), §4 (awards — 13 categories), §5 (EOS ratings + salary recalc #1), §7 (retirements), §8 (FA), §9 (draft), §10 (salary recalc #2), §11 (trades), §12 (salary recalc #3), §13 (farm reconciliation), §14 (chemistry rebalancing), §15 (season archive — critical handoff to Almanac).
- **Cross-franchise divergence note added:** The Almanac's cross-franchise query model (§1, §7 rulings) diverges from Mode 1 §13's single-franchise isolation assumption. Mode 1 §13 still governs data storage (each franchise is its own IndexedDB). The Almanac adds a read-only query layer across all franchise DBs. This is a query-layer extension, not a storage-layer violation.

v1 DEFERS:
- Nothing

**JK's Reasoning:** Cross-references should be accurate and complete. The original references were stale — Mode 3 triage touched far more sections than the spec listed. The cross-franchise divergence note prevents future confusion about how the Almanac relates to franchise isolation.
**Dependencies Flagged:** None — corrections only, no new architectural impact.

### §10 — Decision Traceability
**Ruling:** SIMPLIFY (spec corrections — updated indirect dependencies)
**v1 Scope:**

v1 KEEPS:
- No direct STEP4 decisions (Almanac is a pure consumer — confirmed)
- Indirect dependencies table structure (decision ID → gospel → impact on Almanac)
- All 6 existing indirect dependency rows (C-074/C-087, C-058, C-065, C-076, C-057, C-086)

v1 CHANGES FROM SPEC:
- **C-086 (Mode 3) updated:** "Trait assignment via wheel spin → trait history in player profiles" corrected to: "Almanac consumes **all trait change events** from any source (award ceremony spins, initial assignment, draft generation, and any future v2 sources). Trait history in player profiles shows every add/remove event with player ID, trait name, change type, source, and timestamp. In v1, trait change sources are limited to award winners (60%) and top performers (30%) per Mode 3 §4 SIMPLIFY, plus initial assignment (Mode 1 §6) and draft generation (Mode 3 §9). The 5% regular player trait lottery is deferred to v2 per Mode 3 §4, but the Almanac's read layer is source-agnostic — v2 sources will display automatically with no Almanac code changes."
- **New row added — Triage ruling T-001:** Cross-franchise query model. Created during Almanac triage (not a STEP4 decision). The Almanac queries all saved franchise DBs via franchise registry, diverging from Mode 1 §13's single-franchise assumption. Impacts: §1 (access model), §2 (franchise registry store), §4 (franchiseFilter field), §5 (disambiguation page), §6 (Phase 0 build order), §7 (isolation rewrite).

v1 DEFERS:
- Nothing

**JK's Reasoning:** Trait history should track all changes regardless of source — the Almanac is a consumer, not a filter. Cross-franchise query model is the most significant triage decision for this document and deserves explicit traceability.
**Dependencies Flagged:** None — final section, all dependencies resolved in prior rulings.

