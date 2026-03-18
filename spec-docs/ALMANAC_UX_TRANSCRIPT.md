# ALMANAC UX INTERROGATION — Transcript

**Started:** 2026-03-17
**Status:** COMPLETE — Synthesized to ALMANAC_UX_SPEC.md on 2026-03-18

---

## Entries

### Q1: Entry Point & Navigation — Home Screen Placement
**Question:** Where does the Almanac live on the home screen? Is it a top-level button?
**Answer:** Yes, it's a button on the home page — the sixth button at the end, after League Builder. The button label is "SMB ALMANAC" with "SMB" in blue and "ALMANAC" in white, with a black Book icon. Route: /almanac.

Color cascade for all buttons (top to bottom):
- LOAD FRANCHISE: #5599FF (light blue) — unchanged
- NEW FRANCHISE: #3366FF (medium blue) — unchanged
- EXHIBITION GAME: darker blue than New Franchise (e.g., #1A44CC)
- PLAYOFFS: #7733DD (purple, was Exhibition's old color)
- LEAGUE BUILDER: #CC44CC (pink, was Playoffs' old color)
- SMB ALMANAC: #DD0000 (red, was League Builder's old color)

**Confidence:** FIRM
**Decision:** Almanac is a top-level home screen button, sixth position, red (#DD0000), labeled "SMB ALMANAC" (SMB in blue, ALMANAC in white), Book icon in black, route /almanac. Recolor cascade applied to Exhibition/Playoffs/League Builder.
**Spec section:** §2 Entry Point & Navigation

### Q2: Entry Point & Navigation — Almanac Landing Page
**Question:** What does the user see when they tap SMB ALMANAC and arrive at /almanac? Search-first, section menu, or hybrid?
**Answer:** Hybrid — search bar at top + tabs that auto-sort by mode (Exhibition, Franchise, Elimination). Loves the Baseball Reference model of an atomically linked database (like a second brain in Obsidian) where everything is clickable and cross-linked. Search bar finds players, teams, seasons, and specific modes.

Key design vision: "every piece of data is clickable and leads to related data" — the Almanac is a hyperlinked graph, not a hierarchy.

Player identity across modes is critical: one player (e.g., Handley Dexterez) can exist across multiple franchise instances, elimination instances, and exhibition games. The player's "home page" should show ALL data across ALL instances and modes. But the user must also be able to drill into specific-instance data (e.g., "Dexterez in Franchise Season 3" vs "Dexterez in exhibition games from League A").

Exhibition mode already pulls teams from a specific league in League Builder, so player IDs are consistent within a league. The user selects a league before playing exhibition.

**Confidence:** FIRM on hybrid layout, FIRM on atomic linking, OPEN on player identity resolution across leagues
**Decision:** Almanac landing = search bar + mode tabs (Exhibition/Franchise/Elimination). Baseball Reference-style atomic linking throughout. Player home page aggregates all instances; drill-down into specific instance data. Player identity across leagues is an OPEN architecture question.
**Spec section:** §2 Entry Point & Navigation, §3 Data Architecture

### Q3: Data Architecture — Player Identity Resolution
**Question:** Three options for resolving player identity across leagues: (a) name-based matching, (b) SMB4 source ID as canonical link, (c) explicit canonical player registry. Pushback on (a) for name collision risk.
**Answer:** C — explicit canonical player registry. "C is likely our only real option here."
**Pushback:** Name-based matching (a) will break on renames and name collisions. SMB4 source ID (b) only works for seeded players, not custom.
**Resolution:** Option C chosen. New data layer maps league-specific player IDs to a single canonical identity.
**Data feasibility note:** `sourceDatabase: 'SMB4'` already exists on League Builder player records (leagueBuilderStorage.ts:138,995). This can bootstrap canonical registration for seeded players. Custom players need manual linking or stay standalone.
**Confidence:** FIRM
**Decision:** Build a canonical player registry. Auto-register when seeding from SMB4 (using sourceDatabase flag). Custom players link manually or remain league-scoped. The Almanac player home page queries by canonical ID and aggregates all league-specific records.
**Spec section:** §3 Data Architecture

### Q4: Data Architecture — Minimum Browsable Unit & Play-by-Play Depth
**Question:** Are the three browsable units (games, players, teams) correct for V1? Should individual at-bats be deep-linkable?
**Answer:** Yes to all three units. JK wants full play-by-play browsing: "every event a player is involved in, sorting all sorts of ways — every at-bat across exhibition games within a date window or all-time, against a certain team, when playing SS, when batting 3rd, in moments where LI > 2.0. Slicing and dicing the data any which way, because we have access to all this nuanced atomic data."
**Data feasibility:** CONFIRMED. AtBatEvents persist to IndexedDB `atBatEvents` store permanently (never cleared after game completion). Each event includes: batterId, pitcherId, position, battingOrder, LI, WPA, competitionType, leagueId, stadiumId, inning, outs, runners, score, mojo, fitness, handedness, result type, RBI, runs scored, and more. Every filter JK described maps to an existing field.
**Performance note:** At scale (500+ games = potentially millions of AtBatEvents), IndexedDB compound queries will slow down. May need in-memory query cache or lightweight index for Almanac sessions. Optimization concern, not architecture blocker.
**Confidence:** FIRM
**Decision:** Four browsable units for V1: Games, Players, Teams, and AtBatEvents (play-by-play). AtBatEvents are the atomic unit — fully queryable with arbitrary filter combinations (date, team, position, batting order, LI threshold, opponent, etc.). The Almanac is essentially a query builder over the AtBatEvent store plus game/player/team aggregations.
**Spec section:** §3 Data Architecture, §5 Player Stats Explorer

### Q5: Game Archive — Game List Row & Game Detail Page
**Question:** What info shows per game in the list row ("bite")? When you tap into a game, what's the full detail ("meal")?
**Answer:**
**Game list row (bite):** Date, teams, score, POG (1st place), W/L pitcher, and highest-WPA key moment.
**Game detail page (meal):** POGs (1st, 2nd, 3rd), winning and losing pitchers, saves, holds, WPA list of all players in game, full play log, milestones, fame events, clutch moments, notable moments (algorithmic — see below), full box score, win probability chart.

**Pushback on narrative feed:** Narrative/beat reporter system is a dead data path — archived, not wired into active GameTracker, not persisted. JK accepted alternative.
**Resolution:** Replace narrative feed with algorithmic "notable events" computed from AtBatEvent data: any at-bat with WPA > 0.15 (big swing), LI > 3.0 (extreme leverage), or attached fame events. Pure query over existing data, no new pipeline.

**Data feasibility:**
- POGs: PARTIAL — only 1st POG stored (pogPlayerId in transactionStorage). 2nd/3rd can be computed from WPA rankings at query time.
- W/L pitcher, save, hold: YES — pitcherGameStats has decisions
- WPA list: YES — sum AtBatEvent.wpa by player per game
- Play log: YES — AtBatEvents + BetweenPlayEvents persist
- Milestones: YES — milestoneAggregator
- Fame events: YES — on PersistedGameState and AtBatEvents
- Clutch moments: YES — isClutch flag on AtBatEvents (LI >= 1.5)
- Box score: YES — playerStats + pitcherGameStats
- Win probability chart: YES — winProbabilityBefore/After on every AtBatEvent

**Confidence:** FIRM
**Decision:** Game list row = date + teams + score + POG + W/L pitcher + highest-WPA moment. Game detail = full box score, WPA leaderboard, POGs (1-3), pitcher decisions, play log, milestones, fame events, clutch moments, algorithmic notable events, win probability chart. Narrative feed replaced by algorithmic notable events from existing AtBatEvent data.
**Spec section:** §4 Game Archive

### Q6: Visual Identity, Player Pages, Team Pages, Home Page — Comprehensive V1 Design
**Question:** What does a player page look like? What stat categories matter most? What's the visual identity?
**Answer:** V1 is intentionally simple — prove it works, then add depth.

**Visual theme:** Scoreboard chalk / Press Start 2P font consistent across the entire Almanac.

**Home page (revised from Q2):** Three large buttons: Exhibition, Franchise, Elimination. User clicks one and sees all-time leaders for that mode. Leaders are simple categories matching baseball card stats (not advanced stats in V1). Players in leader lists are hyperlinked → player page. Teams in leader lists are hyperlinked → team page. Search bar at top searches players, teams, games across all modes.

**Player pages — "Back of the baseball card" style (Donruss/Leaf 1986-87 era):**
- Player name at top (bold, large)
- Randomly generated US city and state for hometown
- **ALL player attributes/ratings/traits** tied to that instance's player record (power, contact, speed, fielding, arm, velocity, junk, accuracy, position, traits, personality, chemistry, etc.) — NOT just stats
- Stat table showing year-by-year lines + career totals:
  - BATTERS: Year, Team, BA, G, AB, H, R, 2B, 3B, HR, RBI, SB, BB, SO
  - PITCHERS (primary position SP, SP/RP, RP, or CP): Year, Team, ERA, G, IP, H, R, ER, BB, SO, CG, SHO, SV, W, L
- Below stats: space reserved for AI-generated career summary paragraph (v2, but leave the space now)
- "Advanced Stats" button → shows all advanced metrics by season/team/game/career (may be v2 but should be simple data pull)

**CRITICAL: Data source for Almanac is MODE SAVE SLOTS, not League Builder.** Players only enter the Almanac once pushed into an official mode save slot (exhibition game, franchise, elimination). The Almanac does NOT pull from League Builder directly.

**Player search disambiguation:** When user searches a player name that exists in multiple instances (exhibition across teams, franchise instance, elimination instance), search results show all instances and user must choose which one to view.

**Team pages:**
- Team name at top
- Stadium name
- Hyperlinked roster of all players associated with that team
- Click any player → taken to that player's page

**Confidence:** FIRM on all of the above
**Pushback:** None — the baseball card back model is brilliant for V1. Dense, nostalgic, information-rich, and maps directly to existing data.
**Data feasibility:**
- Batting stats (BA, G, AB, H, R, 2B, 3B, HR, RBI, SB, BB, SO): YES — all on playerStats in PersistedGameState
- Pitching stats (ERA, G, IP, H, R, ER, BB, SO, CG, SHO, SV, W, L): YES — all on pitcherGameStats
- Primary position for pitcher detection: YES — position stored per player
- Random city/state: YES — simple generation at canonical player registration time, persisted to canonical player registry
- AI career summary: DEFERRED to V2, but layout space reserved
- Advanced stats drill-down: PARTIALLY V2 — WAR, WPA, clutch already computed; display layer is the work

**Decision:**
- V1 Almanac home = 3 mode buttons + search bar → mode-specific all-time leaders (simple card stats)
- Player pages = baseball card back (Donruss style), year-by-year stat lines + career totals, position-based stat table (batting vs pitching), random hometown, space for AI summary, advanced stats button
- Team pages = name + stadium + hyperlinked roster
- Data source = mode save slots only, NOT League Builder
- All names hyperlinked throughout (players → player page, teams → team page)
- Press Start 2P / chalk theme throughout

**Spec section:** §2 Entry Point (revised), §5 Player Stats Explorer, §8 Team Views, §10 Visual Identity

### Q7: Player Identity — Search Disambiguation & Instance Grouping
**Question:** When searching a player, do you get (a) disambiguation list of separate instances, (b) single aggregate page merging all stats, or (c) directory page listing all instances with drill-down?
**Answer:** Option C — directory page (hub) that lists all instances. Does NOT merge stats across instances. Each instance is a clickable card showing mode, team(s), games played, headline stat.

**Follow-up — Exhibition instance grouping:** What defines "same instance" vs "different instance" in exhibition mode?
**Answer:** League ID is the grouping key. All exhibition games from the same League Builder league = one instance (even if the player appeared on different teams within that league). Different leagues = different instances (because player attributes may differ).

**Edge case — mid-stream league edits:** If user modifies player ratings in League Builder between exhibition games in the same league, ignore it for V1. All games from the same league ID are one instance regardless.

**Concrete example of a player directory page:**
```
HANDLEY DEXTEREZ
Hometown: Tulsa, OK

EXHIBITION — KBL Classic League    (17 games, .312 BA)
EXHIBITION — KBL Modded League     (5 games, .445 BA)
FRANCHISE — Dynasty Run            (4 seasons, .289 BA)
ELIMINATION — Bracket #2           (3 games, .267 BA)
```
Each row clickable → full baseball card back for that instance. Exhibition cards show multiple teams in year-by-year table if player appeared on different teams within the same league.

**Confidence:** FIRM on directory model, FIRM on league ID grouping, FIRM on ignoring mid-stream edits
**Decision:** Player search → canonical directory page (hub). Instances grouped by: Exhibition = league ID, Franchise = franchise save slot, Elimination = bracket ID. No stat merging across instances. Each instance gets its own baseball card back. Mid-stream league edits ignored in V1.
**Spec section:** §3 Data Architecture, §5 Player Stats Explorer

### Q8: Records & Leaderboards — All-Time Leaders Page
**Question:** How many players per leaderboard? Minimum qualifications for rate stats?
**Answer:**
- Top 20 per category, scrollable, each category expandable
- Toggle switch for minimum qualifications: ON (qualified only) / OFF (raw leaders, no minimums)
- Default: toggle ON (qualified)

**Minimum qualifications (SMB4-scaled):**
- Batting rate stats (BA, OBP, SLG, OPS): 2 PA per team game played (e.g., 10 games = 20 PA minimum). JK proposed this; scales naturally with SMB4's shorter games (5-7 innings typical).
- Pitching rate stats (ERA, WHIP, etc.): scaled equivalent — 0.8 IP per team game (e.g., 10 games = 8 IP minimum). Comparable ratio to MLB's 1 IP/game but adjusted for shorter SMB4 games.
- Counting stats (HR, RBI, W, SV, SO, H, R, etc.): NO minimum — raw totals, always shown.

**Toggle UX:** Simple switch at top of leaderboard page. "Qualified" (default) / "All Players". Affects only rate stat leaderboards. Counting stat leaderboards always show everyone.

**Leaderboard categories (V1, matching baseball card stats):**
- Batting: BA, HR, RBI, H, R, 2B, 3B, SB, BB
- Pitching: ERA, W, SV, SO, IP, CG, SHO

**Confidence:** FIRM on top 20 expandable, FIRM on toggle concept, LEANING on 2 PA/game minimum (may need tuning after real data)
**Decision:** Scrollable leaderboard page with expandable categories showing top 20. Qualified/All toggle for rate stats. Batting minimum: 2 PA/team game. Pitching minimum: 0.8 IP/team game. Counting stats have no minimum. V1 categories match baseball card stats.
**Spec section:** §6 Records & Leaderboards

### Q9: Game Archive — How Does the User Browse Games?
**Question:** Is there a dedicated game browser, or are games only accessible through player/team pages, or both?
**Answer:** Both. (c) — dedicated game browser AND contextual game lists on player/team pages.

- **Dedicated game browser:** Accessible from the mode leaders page (e.g., a "Games" tab/button alongside the leaderboards). Chronological list of all games for that mode, filterable by date range, team, opponent.
- **Contextual game lists:** Player instance cards show "Games played" as clickable list. Team pages show all games involving that team. Search can return game results (e.g., "Sirloins vs Herbisaurs").

**Confidence:** FIRM
**Decision:** Three ways to find games: (1) dedicated game browser on each mode page, (2) contextual game lists on player/team pages, (3) search. All game rows are clickable → game detail page (Q5).
**Spec section:** §4 Game Archive

### Q10: Records — Single-Game Records
**Question:** Single-game records (most HR in a game, most K by pitcher, etc.) — V1 or V2?
**Answer:** V2. All single-game records deferred. V1 priority is getting the architecture right — clean spine and pathways so all data flows into the Almanac correctly. Feature depth comes after the foundation is proven.

**V2 backlog (confirmed wanted, deferred):**
- Single-game records (max per game queries)
- Milestones timeline
- AI-generated career summaries
- Advanced stats drill-down display
- Head-to-head team records
- Team batting/pitching aggregates
- Play-by-play query builder (Q4 — architecture supports it, UI is V2)

**Confidence:** FIRM
**Decision:** V1 scope is: home page (3 mode buttons + search), career/accumulated leaderboards, player directory + baseball card instance pages, team pages, game browser + game detail pages. Architecture must support all V2 features but V1 UI is deliberately minimal. "Clean spine, clean pathways" is the V1 mandate.
**Spec section:** §12 V1 vs V2 Scope

### Q11: Data Pipeline — Almanac Registration & Data Completeness
**Question:** What triggers Almanac data registration? Is the canonical registry the only new data store? Is all V2 data being captured today?
**Answer:** JK's mandate: "We need to ensure we are capturing all of this data in each mode so we can pull it in once we move to V2. It has to be saved somewhere once we start scoring real games."

**Pipeline architecture confirmed:**
```
Game completes → processCompletedGame() writes to existing stores (already works)
              → NEW: registerAlmanacPlayers() creates canonical registry entries on first appearance
              → Almanac reads from existing stores + canonical registry for cross-reference
```

**Canonical player registry is the ONLY new data store.** Structure:
```typescript
{
  canonicalId: string,        // unique canonical identity
  playerName: string,         // display name (from first registration)
  hometown: { city, state },  // randomly generated once
  instances: [{
    mode: 'exhibition' | 'franchise' | 'elimination',
    instanceId: string,       // leagueId (exhibition), franchiseId, bracketId
    instanceName: string,     // "KBL Classic League", "Dynasty Run", "Bracket #2"
    playerIdInInstance: string // the league-specific player ID
  }]
}
```

**Data completeness audit — what's already captured vs what needs work:**

| V2 Feature | Data Required | Currently Captured? | Gap? |
|---|---|---|---|
| Single-game records | Per-game player stats | YES — playerStats on PersistedGameState | NO GAP |
| Milestones timeline | Milestone events | YES — milestoneAggregator writes to store | NO GAP |
| Play-by-play query | AtBatEvents with full context | YES — persisted permanently to IndexedDB | NO GAP |
| Advanced stats (WAR, WPA, clutch) | Computed per-play values | YES — on every AtBatEvent | NO GAP |
| Head-to-head records | Game records with both team IDs | YES — on CompletedGameRecord | NO GAP |
| Team aggregates | Per-team stats across games | PARTIAL — need to aggregate from game records | QUERY ONLY, no new capture needed |
| AI career summary | Accumulated stats + notable moments | YES — all data exists | API INTEGRATION needed (V2) |
| Fame events | Per-play fame tracking | YES — fameEvents on PersistedGameState | NO GAP |

**Verdict:** The existing data pipeline captures everything V2 needs. No new data collection required beyond the canonical player registry. The V2 features are all DISPLAY/QUERY work, not data capture work.

**CRITICAL CAVEAT:** This audit is for exhibition mode. Franchise and elimination modes must ensure their game completion pipelines write the same data structures. Need to verify `processCompletedGame()` is called identically across all three modes.

**Confidence:** FIRM on architecture, FIRM on canonical registry as only new store
**Decision:** Canonical player registry is the single new data store. Registration triggered on game completion. All V2 data is already being captured by the existing pipeline — no new data collection needed. Must verify pipeline consistency across modes before franchise/elimination integration.
**Spec section:** §3 Data Architecture, §12 Data Prerequisites

### OPEN ITEMS — FINAL STATUS:
All OPEN items resolved. Interview covers:
- ✅ Entry point & navigation (Q1, Q6)
- ✅ Data architecture — canonical registry, instance grouping, pipeline (Q2, Q3, Q4, Q7, Q11)
- ✅ Game archive — browsing, list rows, detail pages (Q5, Q9)
- ✅ Player pages — baseball card back, directory model (Q6, Q7)
- ✅ Team pages (Q6)
- ✅ Records & leaderboards (Q8)
- ✅ Visual identity (Q6)
- ✅ V1 vs V2 scope (Q10, Q11)

### Q12: Data Architecture — Player Isolation Across Modes (CRITICAL REFACTOR)
**Question:** How should player data be isolated so franchise evolution doesn't corrupt exhibition/elimination versions? How do we show per-instance attributes/ratings on Almanac player pages?
**Answer:** JK's mandate: "Franchise modes' player states need to exist in isolation and not corrupt every instance of those players across all leagues in league builder. The user needs to be able to create a league with nerfed versions of players, or a league with two all-star teams with altered players."

**CORRECTION from Q6:** Player pages MUST show ALL player attributes/ratings/traits (power, contact, speed, fielding, arm, velocity, junk, accuracy, position, traits, personality, chemistry) — not just game stats. This was stated in Q6 original answer ("all player attributes tied to player ID") but was incorrectly omitted from the transcript.

**Architecture decision — Copy-on-Use model:**
League Builder is a TEMPLATE LIBRARY. Modes COPY player data, never reference it directly.

```
LEAGUE BUILDER (template library — read-only from modes)
  └── "Handley Dexterez" base record (Power: 65, Contact: 72)

FRANCHISE "Dynasty Run" (independent COPY at franchise creation)
  └── Dexterez copy → evolves to Power: 85 over 4 seasons
      (aging/development writes HERE, not back to League Builder)

ELIMINATION "Bracket #2" (independent COPY at bracket creation)
  └── Dexterez copy → user tweaked Power: 99 for this bracket

EXHIBITION GAME (SNAPSHOT at game time)
  └── Dexterez snapshot → Power: 65 (League Builder state at game time)
      Captured on PersistedGameState alongside performance stats
```

**Key principles:**
1. League Builder is read-only from modes. Modes copy FROM it, never write BACK to it.
2. Franchise evolution stays in franchise — aging writes to franchise-specific player store, not globalPlayers.
3. Exhibition snapshots at game time — player ratings captured on game record for historical accuracy.
4. Each mode instance owns its player data — user can modify ratings per-instance without cross-contamination.

**Codebase changes required (PREREQUISITE for Almanac):**
1. Franchise creation → copy all players into franchise-specific IndexedDB store
2. Franchise aging/evolution → write to franchise store, not globalPlayers
3. Elimination bracket creation → copy players into bracket-specific store
4. Exhibition game completion → snapshot player ratings onto PersistedGameState (new `playerRatings` field)
5. League Builder → remains template library, never modified by modes

**Almanac impact:**
- Each instance card on player directory shows THAT INSTANCE's attributes/ratings
- Exhibition: ratings from game-time snapshot
- Franchise: current franchise-evolved ratings (with per-season snapshots at season boundaries)
- Elimination: bracket-specific ratings

**Confidence:** FIRM — this is a non-negotiable architecture requirement
**Decision:** Copy-on-use model. League Builder = template library, modes = independent copies. Player ratings snapshotted on every game record. This is a PREREQUISITE refactor before the Almanac can show per-instance attributes. The Almanac player page shows: all attributes/ratings/traits for that specific instance + game stats (year-by-year + career totals).
**Spec section:** §3 Data Architecture (CRITICAL), §12 Data Prerequisites

### Q13: Data Architecture — Revised Player Isolation & League Builder Model
**Question:** How do franchise/elimination isolation, exhibition snapshots, League Builder multi-league player model, and Almanac edit history all work together?

**JK's clarifications (correcting Q12 misunderstandings):**
1. Franchise and elimination MUST be isolated instances — they copy player state from League Builder at creation time and never reference League Builder again. "Franchise mode has to stand on its own or we can't have multiple franchises saved."
2. Exhibition games should snapshot player state from League Builder at game time.
3. The Almanac player page should show an **edit history** — dates when the player's ratings/attributes were changed in League Builder, so the user can see game dates alongside edit dates and draw their own conclusions.
4. League Builder needs each league to stand on its own — a player cannot exist more than once within a league but CAN be in multiple leagues.
5. User needs to customize roster construction and re-use team branding with completely different rosters (non-negotiable).
6. No per-mode player variants in V1 — one global player record used for exhibition, copied into franchise/elimination at mode creation.

**Architecture — Three-Layer Model:**

**Layer 1: League Builder (Template Library)**
- Global player pool — one record per player
- A player can exist in multiple leagues (via team assignments)
- A player CANNOT exist more than once within the same league
- Each league stands on its own — league is the organizational unit
- User edits ratings globally here; all exhibition games read from here
- **Edit history tracked**: every rating/attribute change timestamped on the player record
- Teams can be re-used with different rosters (team branding is separate from roster composition)

**Layer 2: Mode Instances (Isolated Copies)**
- Franchise: copies ALL player data at franchise creation. Never reads from League Builder again. Aging/evolution writes to franchise-specific store. Multiple franchises can coexist independently.
- Elimination: copies ALL player data at bracket creation. Isolated from League Builder and from other brackets.
- These are independent universes with their own player state.

**Layer 3: Exhibition (Snapshots)**
- Reads player state from League Builder at game time (no copy — live read)
- On game completion, snapshots full player ratings/attributes onto PersistedGameState
- Each game record preserves the player's state at that moment
- If user edited a player between games, the snapshots will differ

**Almanac Player Page — Edit History:**
- Shows timestamped edit history for the player's ratings/attributes in League Builder
- User can see: "Power changed from 65 → 85 on March 12, 2026"
- Game dates shown alongside on the stat table
- User draws their own conclusions about which games used which ratings
- This is a display feature over the edit history data — no complex logic needed

**League Builder — Multi-League Player Model:**
- Player can be on Team A in League 1 AND Team B in League 2
- Player CANNOT be on two teams within the same league
- Current model uses `currentTeamId` (single team) — this needs to change to support multi-league assignment
- Proposed: player-team assignments become per-league (e.g., `leagueAssignments: [{leagueId, teamId}]`) instead of single `currentTeamId`

**Custom Roster Construction (non-negotiable):**
- Team branding (name, colors, stadium, logo) is separate from roster
- User can create multiple roster configurations under the same team branding
- Or: user clones a team (same branding, different roster)
- This is a League Builder feature, not an Almanac feature — but the Almanac needs to display whichever roster was used in each game

**Data changes required:**
1. Add `editHistory: [{date, field, oldValue, newValue}]` to Player record in League Builder
2. Add `playerRatingsSnapshot` to PersistedGameState for exhibition games
3. Change Player.currentTeamId to per-league team assignments for multi-league support
4. Franchise/elimination creation must deep-copy all player records into mode-specific stores
5. Franchise aging must write to franchise store, not globalPlayers

**Confidence:** FIRM on isolation model, FIRM on edit history, FIRM on multi-league player model, LEANING on roster construction approach (needs design work in League Builder spec)
**Decision:** Three-layer model (template library → isolated mode copies → exhibition snapshots). Edit history tracked on player records. Multi-league player assignment replaces single currentTeamId. Custom roster construction is a League Builder feature. All of these are PREREQUISITES for the Almanac to show accurate per-instance attributes.
**Spec section:** §3 Data Architecture (CRITICAL), §12 Data Prerequisites

### OPEN ITEMS — FINAL STATUS (REVISED):
All Almanac UX/design items resolved. Multiple PREREQUISITE changes identified:

**Almanac UX Decisions (COMPLETE):**
- ✅ Entry point & navigation (Q1, Q6)
- ✅ Data architecture — canonical registry, instance grouping, pipeline (Q2, Q3, Q4, Q7, Q11, Q12, Q13)
- ✅ Game archive — browsing, list rows, detail pages (Q5, Q9)
- ✅ Player pages — baseball card back, directory model, ALL attributes/ratings, edit history (Q6, Q7, Q13)
- ✅ Team pages (Q6)
- ✅ Records & leaderboards (Q8)
- ✅ Visual identity (Q6)
- ✅ V1 vs V2 scope (Q10, Q11)
- ✅ Player isolation architecture (Q12, Q13)

**PREREQUISITE Changes (must happen before Almanac build):**
- ⚠️ Franchise/elimination must copy player data at creation (not reference globalPlayers)
- ⚠️ Franchise aging must write to franchise store, not globalPlayers
- ⚠️ Exhibition games must snapshot player ratings onto game record
- ⚠️ Player edit history must be tracked in League Builder
- ⚠️ Multi-league player assignment model (replace single currentTeamId)
- ⚠️ Custom roster construction in League Builder

No OPEN Almanac design items remain. Ready for synthesis when JK says "synthesize."

