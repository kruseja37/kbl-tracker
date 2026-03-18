# ALMANAC UX SPEC — V1 (Exhibition Mode)

**Source:** `spec-docs/ALMANAC_UX_TRANSCRIPT.md` (Q1–Q13)
**Created:** 2026-03-18
**Status:** APPROVED — Ready for implementation planning

---

## 1. Overview & Purpose

The SMB Almanac is a **home-screen-level, cross-mode data explorer** for all stats, records, moments, and milestones ever generated in the app. It is NOT the Museum (which is franchise-scoped). The Almanac reads from ALL data across exhibition, franchise, and elimination modes.

**Design philosophy:** Baseball Reference-style atomically linked database. Every piece of data is clickable and leads to related data. The Almanac is a hyperlinked graph, not a hierarchy. *(Q2)*

**V1 scope:** Exhibition mode data only. Architecture supports all three modes from day one. *(Q10)*

**V1 mandate:** "Clean spine, clean pathways." Get the architecture right; feature depth comes in V2. *(Q10)*

---

## 2. Entry Point & Navigation

### Home Screen Button *(Q1)*
- **Position:** 6th button, after League Builder
- **Label:** "SMB ALMANAC" — "SMB" in blue, "ALMANAC" in white
- **Icon:** Book (lucide-react), black
- **Color:** #DD0000 (red)
- **Route:** `/almanac`

### Home Screen Color Cascade *(Q1)*
| Position | Button | Color |
|----------|--------|-------|
| 1 | LOAD FRANCHISE | #5599FF (light blue) — unchanged |
| 2 | NEW FRANCHISE | #3366FF (medium blue) — unchanged |
| 3 | EXHIBITION GAME | #1A44CC (darker blue) |
| 4 | PLAYOFFS | #7733DD (purple) |
| 5 | LEAGUE BUILDER | #CC44CC (pink) |
| 6 | SMB ALMANAC | #DD0000 (red) |

### Almanac Landing Page *(Q2, Q6)*
- **Search bar** at top — searches players, teams, games across all modes
- **Three mode buttons:** Exhibition, Franchise, Elimination
- User clicks a mode button → mode-specific all-time leaders page
- Press Start 2P / scoreboard chalk theme throughout

---

## 3. Data Architecture

### 3.1 Three-Layer Data Model *(Q12, Q13)*

**Layer 1 — League Builder (Template Library)**
- Global player pool — one record per player
- A player can exist in multiple leagues (via per-league team assignments)
- A player CANNOT exist more than once within the same league
- User edits ratings globally here; all exhibition games read from here
- Edit history tracked: every rating/attribute change timestamped
- Team branding is separate from roster composition

**Layer 2 — Mode Instances (Isolated Copies)**
- **Franchise:** Deep-copies ALL player data at franchise creation. Never reads from League Builder again. Aging/evolution writes to franchise-specific store. Multiple franchises coexist independently.
- **Elimination:** Deep-copies ALL player data at bracket creation. Isolated from League Builder and from other brackets.

**Layer 3 — Exhibition (Snapshots)**
- Reads player state from League Builder at game time (live read, no pre-copy)
- On game completion, snapshots full player ratings/attributes onto PersistedGameState
- Each game record preserves the player's state at that moment

### 3.2 Canonical Player Registry *(Q3)*

New data store mapping league-specific player IDs to a single canonical identity.

```typescript
interface CanonicalPlayer {
  canonicalId: string;
  playerName: string;
  hometown: { city: string; state: string }; // randomly generated once
  instances: Array<{
    mode: 'exhibition' | 'franchise' | 'elimination';
    instanceId: string;    // leagueId | franchiseId | bracketId
    instanceName: string;  // "KBL Classic League", "Dynasty Run", etc.
    playerIdInInstance: string;
  }>;
}
```

- **SMB4-seeded players:** Auto-register using `sourceDatabase: 'SMB4'` + original SMB4 player ID as canonical link. Same player seeded into multiple leagues shares one canonical ID.
- **Custom players:** New canonical ID per creation. Manual linking deferred to V2.

### 3.3 Instance Grouping *(Q7)*
- **Exhibition:** Grouped by League ID. All games from the same league = one instance, even across different teams.
- **Franchise:** Grouped by franchise save slot.
- **Elimination:** Grouped by bracket ID.
- Mid-stream League Builder edits within the same league are ignored for grouping purposes.

### 3.4 Browsable Units *(Q4)*
Four browsable units: **Games**, **Players**, **Teams**, and **AtBatEvents** (play-by-play).

AtBatEvents are the atomic unit — queryable with arbitrary filter combinations: date, team, position, batting order, LI threshold, opponent, handedness, mojo, fitness, result type. *(V2 UI, V1 architecture)*

### 3.5 Data Source *(Q6)*
The Almanac reads from **mode save slots only**, NOT League Builder directly. Players enter the Almanac once they appear in a completed game (exhibition), franchise save, or elimination bracket.

### 3.6 Registration Pipeline *(Q11, Q13)*
```
Game completes → processCompletedGame() writes to existing stores
              → registerAlmanacPlayers() creates/updates canonical registry
              → Snapshot player ratings onto game record (exhibition)
              → Almanac reads from existing stores + canonical registry
```

---

## 4. Game Archive

### 4.1 Game List Row ("Bite") *(Q5)*
| Field | Source |
|-------|--------|
| Date (real-world) | PersistedGameState.completedAt |
| Teams (away @ home) | PersistedGameState.awayTeamId/homeTeamId |
| Score | PersistedGameState.awayScore/homeScore |
| POG (1st place) | pogPlayerId or computed from max WPA |
| W/L Pitcher | pitcherGameStats decisions |
| Highest-WPA moment | max WPA AtBatEvent in game |

### 4.2 Game Detail Page ("Meal") *(Q5)*
- **POGs** (1st, 2nd, 3rd) — 1st from stored pogPlayerId, 2nd/3rd computed from WPA rankings
- **Pitcher decisions** — W, L, Save, Hold
- **WPA leaderboard** — all players ranked by cumulative WPA in that game
- **Full box score** — batting and pitching lines for both teams
- **Play log** — chronological AtBatEvents + BetweenPlayEvents
- **Milestones** — from milestoneAggregator
- **Fame events** — from PersistedGameState.fameEvents
- **Clutch moments** — AtBatEvents where isClutch = true (LI >= 1.5)
- **Notable events** — algorithmic: WPA > 0.15, LI > 3.0, or attached fame events
- **Win probability chart** — plotted from winProbabilityBefore/After on every AtBatEvent

### 4.3 Game Browsing *(Q9)*
Three ways to find games:
1. **Dedicated game browser** on each mode page — chronological list, filterable by date range, team, opponent
2. **Contextual game lists** on player instance cards and team pages
3. **Search** — find games by team matchup, date, etc.

All game rows clickable → game detail page.

---

## 5. Player Stats Explorer

### 5.1 Player Directory Page *(Q7)*
When searching a player name, user lands on a **directory page** (hub):

```
HANDLEY DEXTEREZ
Hometown: Tulsa, OK

EXHIBITION — KBL Classic League    (17 games, .312 BA)
EXHIBITION — KBL Modded League     (5 games, .445 BA)
FRANCHISE — Dynasty Run            (4 seasons, .289 BA)
ELIMINATION — Bracket #2           (3 games, .267 BA)
```

- Each row clickable → full instance card (baseball card back)
- No stat merging across instances
- Directory does NOT show aggregated stats — it's a hub for navigation

### 5.2 Player Instance Card ("Baseball Card Back") *(Q6, Q12, Q13)*
Donruss/Leaf 1986-87 era visual style.

**Layout:**
1. **Player name** (bold, large, Press Start 2P)
2. **Hometown** (randomly generated US city + state, assigned once at canonical registration)
3. **ALL player attributes/ratings/traits** for this specific instance:
   - Position, power, contact, speed, fielding, arm (batters)
   - Position, velocity, junk, accuracy (pitchers)
   - Traits, personality, chemistry
   - For exhibition: ratings from game-time snapshot
   - For franchise: current franchise-evolved ratings
   - For elimination: bracket-specific ratings
4. **Stat table** — year-by-year lines + career totals:
   - **Batters:** Year, Team, BA, G, AB, H, R, 2B, 3B, HR, RBI, SB, BB, SO
   - **Pitchers** (primary position SP, SP/RP, RP, or CP): Year, Team, ERA, G, IP, H, R, ER, BB, SO, CG, SHO, SV, W, L
5. **Edit history** (exhibition instances): timestamped log of rating changes from League Builder, shown alongside game dates so user can correlate
6. **Space reserved for AI-generated career summary** (V2)
7. **"Advanced Stats" button** → expanded advanced metrics view (V2 UI, data exists)

### 5.3 Pitcher vs Batter Detection *(Q6)*
Primary position determines stat table type:
- SP, SP/RP, RP, CP → pitching stats
- All others → batting stats

---

## 6. Records & Leaderboards

### 6.1 All-Time Leaders Page *(Q8)*
Accessed by clicking a mode button on the Almanac home page. Shows leaderboards for that mode.

**Layout:** Scrollable page with expandable stat categories. Each category shows top 20.

**V1 Categories (matching baseball card stats):**
- **Batting:** BA, HR, RBI, H, R, 2B, 3B, SB, BB
- **Pitching:** ERA, W, SV, SO, IP, CG, SHO

### 6.2 Qualification Toggle *(Q8)*
- Toggle switch at top: **"Qualified"** (default) / **"All Players"**
- Affects only rate stat leaderboards (BA, ERA, etc.)
- Counting stat leaderboards (HR, RBI, W, etc.) always show everyone

### 6.3 Minimum Qualifications (SMB4-Scaled) *(Q8)*
- **Batting rate stats:** 2 PA per team game played (e.g., 10 games = 20 PA minimum)
- **Pitching rate stats:** 0.8 IP per team game (e.g., 10 games = 8 IP minimum)
- **Counting stats:** No minimum

### 6.4 Hyperlinks *(Q6)*
All player names in leaderboards → player directory page. All team names → team page.

---

## 7. Milestones & Moments

**Deferred to V2.** *(Q10)*

Architecture supports milestones timeline, fame event history, and clutch moment tracking. Data already captured. V1 shows these only within individual game detail pages.

---

## 8. Filtering System

### 8.1 Mode Filter *(Q6)*
Primary filter = mode selection on home page (Exhibition / Franchise / Elimination). V1 only shows Exhibition data.

### 8.2 Game Browser Filters *(Q9)*
- Date range
- Team
- Opponent

### 8.3 Leaderboard Filters *(Q8)*
- Qualified / All toggle for rate stats

### 8.4 AtBatEvent Query Builder *(Q4)*
**V2 UI, V1 architecture.** The data supports filtering by: date, team, position, batting order, LI threshold, opponent, handedness, mojo, fitness, result type, inning, outs, runners, score.

---

## 9. Team Views

### 9.1 Team Page *(Q6)*
- Team name at top
- Stadium name
- Hyperlinked roster of all players associated with that team
- Click any player → player directory page or instance card

### 9.2 Team Stats *(Q10)*
**V2.** Team batting/pitching aggregates, W-L records, head-to-head records deferred.

---

## 10. Advanced Stats Display

**V2 UI, V1 data exists.** *(Q10)*

WAR (bWAR, pWAR, fWAR, rWAR, mWAR), WPA, clutch stats, LI distributions, spray charts — all computed per-play and stored on AtBatEvents. V1 shows these only within game detail pages. V2 adds player-level and leaderboard-level advanced stats views.

---

## 11. Visual Identity & Layout

### 11.1 Theme *(Q6)*
- **Font:** Press Start 2P (scoreboard chalk style), consistent with rest of app
- **Color scheme:** Dark background, consistent with GameTracker aesthetic
- **Player pages:** Donruss/Leaf 1986-87 baseball card back style
- **Data density:** Table-oriented (not card-based). Dense, scannable, information-rich.

### 11.2 Interaction Pattern *(Q2)*
Everything is clickable and cross-linked:
- Player names → player directory/instance page
- Team names → team page
- Game rows → game detail page
- Stat categories → expanded leaderboard

---

## 12. Data Prerequisites

### 12.1 PREREQUISITE: Player Data Isolation *(Q12, Q13)*

**Current state:** Franchise reads/writes directly to globalPlayers in League Builder. Season transition aging mutates the shared store. No player ratings snapshot on game records.

**Required changes (must happen before Almanac build):**

| # | Change | Impact |
|---|--------|--------|
| 1 | Franchise creation deep-copies all players into franchise-specific IndexedDB store | Enables multiple independent franchises |
| 2 | Franchise aging/evolution writes to franchise store, not globalPlayers | Prevents franchise evolution from corrupting League Builder templates |
| 3 | Elimination bracket creation deep-copies players into bracket-specific store | Enables isolated bracket player states |
| 4 | Exhibition game completion snapshots player ratings onto PersistedGameState (`playerRatingsSnapshot` field) | Enables Almanac to show player state at game time |
| 5 | League Builder remains template library — modes never write back to it | Clean separation of concerns |

### 12.2 PREREQUISITE: Player Edit History *(Q13)*
Add `editHistory: Array<{date: string, field: string, oldValue: any, newValue: any}>` to Player record in League Builder. Track every rating/attribute change with timestamp.

### 12.3 PREREQUISITE: Multi-League Player Assignment *(Q13)*
Replace `Player.currentTeamId` (single string) with per-league team assignments:
```typescript
leagueAssignments: Array<{leagueId: string, teamId: string}>
```
Enables a player to exist on different teams in different leagues while preventing duplicate assignments within the same league.

### 12.4 PREREQUISITE: Custom Roster Construction *(Q13)*
Team branding (name, colors, stadium, logo) must be separable from roster composition. User must be able to re-use team branding with completely different rosters. Implementation approach TBD in League Builder spec.

### 12.5 Canonical Player Registry *(Q3, Q11)*
New IndexedDB store: `almanacCanonicalPlayers`. Structure defined in §3.2. Auto-registers SMB4-seeded players. Custom players get new canonical IDs at creation.

### 12.6 Data Completeness *(Q11)*

| Data | Required For | Currently Captured? |
|------|-------------|-------------------|
| Per-game player stats | Leaderboards, game detail | ✅ YES |
| AtBatEvents with full context | Play-by-play queries | ✅ YES |
| WPA per play | WPA leaderboards, notable events | ✅ YES |
| Fame events | Game detail, player pages | ✅ YES |
| Milestones | Game detail (V1), timeline (V2) | ✅ YES |
| Pitcher decisions | Game list row, game detail | ✅ YES |
| Win probability per at-bat | Win probability chart | ✅ YES |
| Player ratings at game time | Player instance card | ❌ NEEDS playerRatingsSnapshot |
| Player edit history | Exhibition edit timeline | ❌ NEEDS editHistory field |

---

## 13. Future Mode Integration Architecture

### Exhibition (V1) *(Q6, Q7)*
- Instance grouping: by League ID
- Player ratings: from game-time snapshot on PersistedGameState
- All exhibition games from the same league = one player instance card

### Franchise (V2+) *(Q7, Q12, Q13)*
- Instance grouping: by franchise save slot
- Player ratings: from franchise-specific player store (evolved over time)
- Year-by-year stat lines correspond to franchise seasons
- Per-season rating snapshots enable historical attribute tracking

### Elimination (V2+) *(Q7, Q12, Q13)*
- Instance grouping: by bracket ID
- Player ratings: from bracket-specific player store (copied at bracket creation)
- Stats aggregated across bracket games

### Cross-Mode Player Directory *(Q7)*
Search returns canonical directory page showing all instances. No stat merging. Each instance is independently clickable.

---

## 14. V2 Backlog

Features confirmed wanted, deferred from V1: *(Q10)*

| Feature | Transcript Ref |
|---------|---------------|
| Single-game records (max per game queries) | Q10 |
| Milestones timeline | Q10 |
| AI-generated career summaries | Q6, Q10 |
| Advanced stats drill-down display (WAR, WPA, clutch) | Q6, Q10 |
| Head-to-head team records | Q10 |
| Team batting/pitching aggregates | Q10 |
| Play-by-play query builder UI | Q4, Q10 |
| Manual canonical player linking (custom players) | Q3 |
| Franchise mode data integration | Q13 |
| Elimination mode data integration | Q13 |

---

*Synthesized from ALMANAC_UX_TRANSCRIPT.md (Q1–Q13). Every decision traceable to a specific Q&A exchange.*
