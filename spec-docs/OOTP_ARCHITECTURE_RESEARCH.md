# OOTP Architecture Research & KBL Tracker Gap Analysis

**Date:** 2025-02-18
**Purpose:** Reference architecture for KBL Tracker Phase 2+ decisions
**Method:** Exhaustive web research across OOTP manuals, wiki, forums, third-party tools, Lahman DB schema, and Baseball Reference data model

---

## SECTION 1: OOTP Data Model

### 1.1 Core Entities and Relationships

OOTP uses a proprietary binary database format (.odb files) internally. These can be exported to CSV, MySQL, or MS Access via the game's Import/Export Functions. The OOTPDBTools project (github.com/sleffew80/OOTPDBTools) confirms compatibility with OOTP 17–26, converting .odb ↔ CSV. The export produces **68+ tables** selectable via a configuration profile.

Below is the reconstructed entity-relationship map, assembled from OOTP manual documentation (versions 13–24), StatsPlus wiki CSV configuration, the Lahman database schema (which OOTP's schema is derived from), and third-party database analysis (MojoTech blog, Steam guides).

### 1.2 Entity Catalog

#### PLAYER (Central Entity)
- **playerID** (unique, persistent across career)
- **Biographical:** firstName, lastName, nickName, birthDate, birthCity, birthCountry, nationality, ethnicity, height, weight, bats (L/R/S), throws (L/R)
- **Ratings (Current):** contact, gap, power, eye, avoidK (batting); stuff/movement, control, stamina + individual pitch ratings (pitching); range, error, arm, turnDP per position (fielding); speed, stealing, baserunning
- **Ratings (Potential):** mirror of current ratings representing ceiling
- **Personality:** leadership (1-200), loyalty (1-200), desire_for_winner (1-200), greed (1-200), work_ethic (1-200), intelligence (1-200)
- **Morale:** team_performance, player_performance, roster_moves, expected_role, team_chemistry (5 categories)
- **Physical:** injury_proneness_overall, injury_proneness_back, injury_proneness_legs, injury_proneness_arm (1-200 scale, displayed as Durable/Normal/Fragile), fatigue, condition
- **Development:** player_focus_sliders (50-point allocation per skill), development_target_age, development_speed_modifier
- **Career State:** status (active/minors/FA/retired/HOF), service_time_mlb, service_time_professional, service_time_secondary_roster, draft_year, draft_round, draft_pick, debut_date, retirement_date

*Source: OOTP 19 Manual — Player Development, Baseball Ratings, Personality Ratings, Injuries and Fatigue pages; OOTP wiki; Baseball Prospectus review*

#### TEAM
- **teamID**, teamName, nickname, abbreviation, city, leagueID, divisionID, franchiseID
- **Ballpark:** parkID, parkName, capacity, park_factor_BA, park_factor_2B, park_factor_3B, park_factor_HR (100 = average)
- **Finances:** budget, revenue, payroll, ticketPrice, marketSize
- **Roster:** 26-man active, 40-man, 60-man spring training, minor league affiliates
- **Staff:** managerID, benchCoachID, hittingCoachID, pitchingCoachID, gmID (each with teaching/managing/strategy ratings)

#### FRANCHISE
- **franchiseID**, franchiseName, active (boolean)
- Links teams across relocations and rebrands (e.g., Montreal Expos → Washington Nationals)
- TeamFranchises table maps teamID ↔ franchiseID with yearID

#### LEAGUE / SUBLEAGUE / DIVISION
- **leagueID**, leagueName, subleagueID, divisionID
- Rules: DH (yes/no), playoff_format, schedule_length, salary_cap
- League totals and modifiers for statistical calibration (documented in Stats and AI wiki page)

#### SEASON
- **yearID**, leagueID
- Phase: preseason / regular_season / postseason / offseason
- Schedule: 162-game grid, interleague rules
- No explicit "season" table — season is defined by yearID across all stat/standing tables

#### GAME
- **gameID**, date, homeTeamID, awayTeamID, yearID
- Score: homeRuns, awayRuns, innings
- Box score data: team-level batting/pitching lines
- Attendance, weather, parkID

#### GAME LOG / GAME EVENT
- Text-based event log per game (pitch-by-pitch descriptions)
- The `game_logs` table is the largest export (23M+ events in one example league per MojoTech blog)
- Format: text strings describing each pitch + outcomes/activity
- NOT structured as discrete event records — raw text requiring parsing
- This is the only pitch-level data OOTP exports

#### PLAYER SEASON STATS
- **Batting:** playerID, yearID, teamID, leagueID, G, AB, R, H, 2B, 3B, HR, RBI, SB, CS, BB, SO, IBB, HBP, SH, SF, GIDP, BA, OBP, SLG, OPS
- **Pitching:** playerID, yearID, teamID, leagueID, W, L, G, GS, CG, SHO, SV, IP, H, ER, HR, BB, SO, ERA, WHIP, K/9, BB/9, HR/9, FIP
- **Fielding:** playerID, yearID, teamID, leagueID, position, G, GS, InnOuts, PO, A, E, DP, PB (catchers), WP, SB_against, CS_against
- Split stats: L/R splits added in OOTP 19+
- One row per player per team per year (multi-team seasons = multiple rows)

*Source: Lahman schema (Batting, Pitching, Fielding tables); OOTP export documentation*

#### PLAYER CAREER STATS
- Accumulated from season stats. No separate career table in export — calculated by summing PlayerSeasonStats across yearIDs
- OOTP displays career stats in the player profile UI
- Career records tracked for milestones (3000 hits, 500 HR, 300 wins, etc.)

#### TEAM SEASON STATS
- **Teams table:** yearID, teamID, lgID, franchID, divID, G, W, L, R, AB, H, 2B, 3B, HR, BB, SO, SB, CS, RA, ER, ERA, CG, SHO, SV, IPouts, HA, HRA, BBA, SOA, E, DP, FP, attendance, parkFactor, name, park

#### CONTRACT
- playerID, teamID, startYear, endYear, annualSalary, signingBonus, noTradeClause, options (team/player/vesting/mutual), arbitration_eligible, free_agent_eligible

#### TRANSACTION
- transactionID, date, type (trade/FA_signing/waiver/release/DFA/option/recall/draft), playerID(s), fromTeamID, toTeamID, details

#### DRAFT PICK
- yearID, round, pick, teamID, playerID, signed (boolean), bonusDemand

#### PROSPECT RATING
- playerID, yearID, scoutID, overall_rating, individual_tool_ratings (scouted values, NOT true values)
- Scouting accuracy varies by scout quality

#### AWARD
- awardID, yearID, leagueID, playerID, awardType (MVP, CyYoung, ROY, GoldGlove, SilverSlugger, AllStar, etc.)
- AwardsSharePlayers (voting results with vote counts)

#### HALL OF FAME BALLOT
- playerID, yearID, votedBy (BBWAA/Veterans/etc.), ballots, needed, votes, inducted
- HOF requirements configurable in League Setup → Options → Hall of Fame Requirements

#### MILESTONE
- playerID, milestoneType, date, value
- Tracked: 3000 hits, 500 HR, 300 wins, 3000 K, perfect games, no-hitters, cycles, etc.
- Milestone Watch screen in League → History

#### STORYLINE EVENT
- XML-based, not in database export
- Stored in storyline XML files, triggered by game engine conditions
- 350+ text categories, 300+ variable tokens

#### PARK FACTOR / ERA
- Park factors per ballpark: BA, 2B, 3B, HR (100 = neutral)
- Era settings influence player creation modifiers, financial settings, strategic tendencies
- Import Settings on Stats and AI screen control era calibration

### 1.3 Lahman Database Schema (Gold Standard Reference)

The Lahman Database (sabr.org/lahman-database) is the foundation OOTP built upon. Complete table list from the 2026 edition:

**Core Statistical Tables:**
People, Batting, BattingPost, Pitching, PitchingPost, Fielding, FieldingOF, FieldingOFsplit, FieldingPost, Appearances

**Team/League Tables:**
Teams, TeamsFranchises, TeamsHalf, SeriesPost, HomeGames, Parks

**Personnel Tables:**
Managers, ManagersHalf

**Historical/Awards Tables:**
AllstarFull, AwardsManagers, AwardsPlayers, AwardsShareManagers, AwardsSharePlayers, HallOfFame, Salaries, CollegePlaying, Schools

**Key Design Principles:**
- People table is the central reference (playerID links everywhere)
- Stats are season-level, broken by team (multi-team seasons have multiple rows)
- Postseason stats are in separate tables (BattingPost, PitchingPost, FieldingPost)
- No game-level or event-level data (Lahman is aggregate only)
- Franchise continuity tracked via TeamsFranchises (franchID → teamID mapping)

---

## SECTION 2: The Stat Pipeline (Event → Career)

### 2.1 Overview

OOTP's stat pipeline flows from atomic game events to career aggregates. Based on evidence from the OOTP manual, MojoTech blog analysis, Stats and AI wiki page, and export documentation:

### 2.2 Step-by-Step Data Flow

**Step 1: Pitch-Level Simulation**
The game engine simulates each plate appearance pitch-by-pitch. Internal ratings (contact, power, eye for batter; stuff, control for pitcher) combine with park factors, league totals/modifiers, fatigue, morale, and random variance to determine outcomes. The engine uses league totals as a calibration baseline — these do NOT directly equate to event counts but serve as the foundation for the probability calculation engine.

**Step 2: Event Resolution**
Each pitch resolves to: ball, called strike, swinging strike, foul, ball in play. Balls in play resolve to hit type (ground ball, fly ball, line drive, popup) with location, then to outcome (out, single, double, triple, HR, error, fielder's choice). Baserunner advancement is resolved simultaneously.

**Step 3: Game Log Write**
Each event is written to the game_logs table as a text string. Format: descriptive text of pitch and subsequent activity. This is the most granular persistent data OOTP stores. MojoTech reports 23M+ individual events in one league's history.

**Step 4: Box Score Aggregation**
After game completion, event data aggregates into the game box score:
- Player batting line: AB, R, H, 2B, 3B, HR, RBI, BB, SO, SB, CS
- Player pitching line: IP, H, R, ER, BB, SO, HR, pitch count
- Player fielding line: PO, A, E
- Team totals, winning/losing pitcher, save

**Step 5: Season Stats Update**
Box score stats are added to the running season totals in player_batting_stats, player_pitching_stats, and player_fielding_stats. Rate stats (BA, ERA, OBP, etc.) are recalculated. This happens immediately after each game.

**Step 6: Team Standings Update**
Team W-L record, runs scored/allowed, GB, and division standings update after each game. Playoff race implications calculated.

**Step 7: League Leaderboards Update**
Individual stat leaderboards refresh. These drive the UI for "league leaders" screens and influence award voting at season end.

**Step 8: WAR Calculation**
OOTP calculates WAR internally. The exact formula is not publicly documented by OOTP developers, but from forum evidence (forums.ootpdevelopments.com thread t=243699) and the Stats and AI wiki page, it follows a FanGraphs-like methodology:

**Position Player WAR (fWAR model):**
```
WAR = (Batting Runs + Baserunning Runs + Fielding Runs + Positional Adjustment + League Adjustment + Replacement Runs) / Runs Per Win
```
Where:
- Batting Runs derived from wRAA (weighted runs above average), park-adjusted
- Baserunning Runs from stolen bases and baserunning events
- Fielding Runs from range/error/arm metrics
- Positional Adjustment per position (C/SS positive, 1B/DH negative)
- Replacement Level ≈ 20 runs per 600 PA below average
- Runs Per Win ≈ 10 (varies by run environment)

**Pitcher WAR (fWAR model):**
```
WAR = ((lgFIP - pFIP) / dynamic_RPW + replacement_level) × (IP/9) × leverage_multiplier + league_correction
```

**Step 9: Milestone Check**
After each game, career totals are checked against milestone thresholds (3000 hits, 500 HR, etc.). If a milestone is reached, it triggers:
- Milestone Watch notification
- Potential storyline event
- News article generation
- Historical record book update

**Step 10: Narrative Trigger Evaluation**
The storyline engine evaluates conditions after game events:
- Calendar triggers (All-Star break, trade deadline, monthly awards)
- Statistical triggers (hitting streaks, win streaks, slumps)
- Player state triggers (morale, contract year, injury return)
- Produces news articles with generated text using 300+ variable tokens

**Step 11: Development Update**
Player ratings change based on playing time, coaching quality, challenge level, age, chance, and development modifiers. This happens on an ongoing basis during the season, not just at season end.

**Step 12: End-of-Season Aggregation**
At season close:
- Final season stats are locked
- Career totals updated (sum of all season rows)
- Awards voted (MVP, Cy Young, ROY, etc.)
- Hall of Fame eligibility checked for retired players
- Single-season and career records updated

### 2.3 Data Stores Touched (Ordered)

For a single home run in the 7th inning:

1. **game_logs** — text event written
2. **game box score** (in-memory during game, persisted at game end)
3. **player_batting_stats** — H, HR, RBI, R incremented; BA/OBP/SLG/OPS recalculated
4. **player_pitching_stats** (opposing pitcher) — H, HR, ER incremented; ERA/WHIP/FIP recalculated
5. **team_season_stats** — team R, HR incremented
6. **standings** — if game outcome changes, W/L updated
7. **league_leaderboards** — HR leaderboard refreshed
8. **WAR components** — batting runs recalculated
9. **milestone_watch** — career HR total checked against thresholds
10. **storyline_engine** — conditions evaluated (e.g., "500th career HR" → news event)
11. **player_development** — not directly from this event, but playing time accumulates

---

## SECTION 3: Player Lifecycle State Machine

### 3.1 State Diagram

```
[CREATED] → [AMATEUR] → [DRAFTED/SIGNED] → [MINOR_LEAGUES] → [MLB_ACTIVE]
                                                    ↕ (promote/demote)
                                              [MLB_ACTIVE] ↔ [INJURED]
                                                    ↓
                                              [DECLINED] → [FREE_AGENT] → [MLB_ACTIVE]
                                                                ↓
                                              [RETIRED] → [HOF_ELIGIBLE] → [HOF_INDUCTED]
```

### 3.2 State Transitions and Data Written

**CREATED → AMATEUR**
- Trigger: Player generation (fictional) or database import (historical)
- Data written: All biographical fields, initial ratings (current and potential), personality traits, injury proneness, nationality
- Ratings derived from: player creation modifiers, era settings, talent pool configuration

**AMATEUR → DRAFTED/SIGNED**
- Trigger: June draft selection OR international free agent signing
- Data written: draft_year, draft_round, draft_pick, teamID, signing_bonus, contract
- For international FA: signing date, bonus pool allocation

**DRAFTED → MINOR_LEAGUES**
- Trigger: Assignment to minor league affiliate
- Data written: roster_status = minor_league, affiliate_level (Rookie/A/AA/AAA)
- Development begins: coaching quality of affiliate staff affects development speed

**MINOR_LEAGUES → MLB_ACTIVE (Promotion)**
- Trigger: Manager/GM promotes player to 26-man roster
- Data written: roster_status = active, service_time begins accruing (Opening Day to last regular season day)
- Service time tracked in days on MLB roster

**MLB_ACTIVE → MINOR_LEAGUES (Demotion)**
- Trigger: Option to minors (requires minor league options remaining)
- Data written: roster_status = minor_league, option used flag
- Service time stops accruing on MLB days

**MLB_ACTIVE ↔ INJURED**
- Trigger: Injury event (random, influenced by injury_proneness ratings)
- Data written: injury_type, severity, recovery_time, DL placement
- Impact: ratings may regress (current AND potential), development slows, fatigue resets
- Pitcher Abuse Points (PAP): calculated as (pitches-100)³ when >100 pitches

**MLB_ACTIVE → FREE_AGENT**
- Trigger: Contract expiration with 6+ years MLB service time
- Data written: status = free_agent, free_agent_type (A/B based on Elias-like ranking)
- Compensation rules: Type A = 1st round pick, Type B = sandwich pick (if arbitration offered)

**MLB_ACTIVE → ARBITRATION**
- Trigger: 3+ years MLB service, <6 years, contract expired
- Data written: arbitration filings (player salary, team salary), hearing result

**Any Active State → RETIRED**
- Trigger: Age + declining ratings below threshold, OR player decision, OR storyline event
- Data written: retirement_date, final_game_date, career_stats_locked
- Personality affects: loyalty and desire_for_winner influence retirement timing

**RETIRED → HOF_ELIGIBLE**
- Trigger: 5 years after retirement (configurable) + minimum MLB service (10 years default)
- Data written: hof_eligible = true, appears on ballot

**HOF_ELIGIBLE → HOF_INDUCTED**
- Trigger: Automatic induction (default) based on configurable thresholds, OR commissioner manual induction
- Data written: inducted = true, induction_year
- Thresholds set in League Setup → Options → Hall of Fame Requirements

### 3.3 Development Curve

The OOTP 19 manual documents 10 factors affecting player development:

1. **Coaching/Management** — GM, manager, bench coach, hitting coach, pitching coach ratings
2. **Playing Time** — Minor leaguers need it; MLB players develop normally without
3. **Potential/Individual Qualities** — High potential often (not always) = faster development
4. **Age** — Peak development ends ~25; decline begins ~30 (configurable via aging modifiers)
5. **Challenge Level** — Overmatched players develop slower; unchallenged players stall
6. **Injuries** — Slow development, can regress current AND potential ratings
7. **Spring Training** — Development opportunity outside regular season
8. **Chance** — Random "light bulb" moments or unexpected regressions
9. **Player Development Modifiers** — Configurable speed multipliers (0.5x to 1.5x)
10. **Development Target Ages** — Default, Earlier, or Later ranges

**Player Focus Sliders:** 50 points per skill, redistributable. Being 10 points below midpoint is MORE detrimental than 10 above is beneficial. AI can manage focus with optional lock.

---

## SECTION 4: Season Lifecycle State Machine

### 4.1 Phase Sequence

```
[OFFSEASON_COMPLETE] → [PRESEASON] → [REGULAR_SEASON] → [ALL_STAR_BREAK]
→ [TRADE_DEADLINE] → [SEPTEMBER_EXPANSION] → [REGULAR_SEASON_END]
→ [POSTSEASON] → [WORLD_SERIES] → [OFFSEASON_START]
→ [AWARDS] → [HOF_VOTING] → [SALARY_ARBITRATION] → [FREE_AGENCY]
→ [RULE_5_DRAFT] → [JUNE_DRAFT] → [INTERNATIONAL_SIGNING]
→ [SPRING_TRAINING] → [OFFSEASON_COMPLETE]
```

### 4.2 Phase Details and Data Writes

**PRESEASON (February–March)**
- Owner sets budget and goals
- Spring training: 60-man roster, exhibition games
- Development opportunity for all players
- Data written: spring training stats (separate from regular season), roster decisions
- Required for next phase: 26-man roster set, starting lineup, pitching rotation

**REGULAR SEASON (April–September)**
- 162 games per team
- Monthly: player development reports generated
- Data written continuously: game results, player stats, standings, transactions
- Trade deadline (July 31): roster freeze for playoff-bound teams after this date

**JUNE DRAFT (~3 weeks before draft date)**
- Draft pool revealed
- First-year player draft conducted
- Data written: draft_picks, player signings, bonus pool allocation

**JULY 2: INTERNATIONAL FREE AGENTS**
- International amateur players become available for signing
- Data written: international signings, bonus pool spending

**SEPTEMBER EXPANSION**
- Rosters expand (historically 40-man, now 28-man in modern CBA)
- Minor league players called up
- Data written: roster changes, service time implications

**POSTSEASON (October)**
- Bracket determined from standings
- Playoff games simulated
- Data written: postseason stats (separate tables: BattingPost, PitchingPost, FieldingPost)
- Required: complete regular season standings, playoff seeding

**WORLD SERIES**
- Championship series
- Data written: series results, MVP selection, champion recorded

**OFFSEASON START**
- Triggers immediately after World Series
- Sequential offseason events begin

**OFFSEASON SEQUENCE (precise order from OOTP manual and community documentation):**

1. **Day 1: Salary Arbitration Window Opens** — eligible players (3-6 years service) identified
2. **Awards Announced** — MVP, Cy Young, ROY, Gold Glove, Silver Slugger (voting occurs during season)
3. **HOF Voting** — eligible retired players evaluated against thresholds
4. **Free Agency Begins** — 6+ year service time players with expired contracts enter market (day after World Series)
5. **Rule 5 Draft Protection Deadline** — teams must add prospects to 40-man roster or risk losing them
6. **Rule 5 Draft (December)** — unprotected prospects available; must stay on MLB roster all next season
7. **Salary Arbitration Hearings** — player files salary, team files salary, panel chooses one
8. **Trade Market** — open throughout offseason
9. **Player Retirements** — processed, career stats locked
10. **Team Relocations** — if applicable
11. **Spring Training Opens** — next phase begins

**Data Written at Season Close:**
- Final season stats locked to player_season_stats tables
- Career totals recalculated
- Service time incremented
- Contract years decremented
- Free agent eligibility updated
- Award winners recorded
- HOF inductees recorded
- Historical records updated (single-season, career)
- Team season stats finalized (Teams table row for yearID)

**Data Required for Next Season Open:**
- All roster decisions resolved (no unsigned arbitration-eligible players)
- Free agent market cleared (unsigned FAs remain available)
- Draft complete, picks signed
- 40-man roster compliant (Rule 5 implications resolved)
- Budget set for new year
- Schedule generated for new yearID

---

## SECTION 5: Franchise Continuity Contract

### 5.1 What Persists Between Seasons

**ALWAYS persists (immutable career data):**
- Player biographical information
- Career statistical history (all previous season rows)
- Personality traits (evolve slowly but never reset)
- Injury history and proneness ratings
- Draft history and transaction log
- Award history
- Hall of Fame status
- Franchise identity (franchiseID chain)
- Historical records and milestones

**Carries over (mutable, not reset):**
- Player ratings (current and potential — these have changed via development/aging)
- Player age (+1 year)
- Service time totals (incremented by season's MLB days)
- Contract status (year decremented, or expired → FA)
- Roster assignments (unless changed by transactions)
- Team financial state (revenue, payroll obligations)
- Morale baseline (modified by offseason events)
- Player relationships and chemistry foundations

**Reset each season:**
- All statistical accumulators (batting, pitching, fielding stats start at 0)
- Game logs
- Standings (0-0 record)
- Schedule (new 162-game grid generated)
- Salary arbitration eligibility (recalculated from updated service time)
- Free agent compensation rankings (recalculated)
- Playoff status
- Monthly awards
- Streaks (hitting, winning, etc.)

### 5.2 The Season Transition Data Contract

The critical operation is: `close_season(yearID: N)` → `open_season(yearID: N+1)`

**close_season(N) must:**
1. Lock all season N stats as final
2. Process all awards and HOF voting
3. Complete all offseason transactions (FA signings, draft, trades)
4. Age all players by 1 year
5. Run development/aging calculations on all player ratings
6. Process retirements
7. Update service time totals
8. Resolve all contract states (expired, option exercised, etc.)
9. Generate new draft class (fictional) or import (historical)
10. Record franchise season summary (W-L, champion, etc.)

**open_season(N+1) must verify:**
1. Every team has a valid 26-man roster
2. Every team has a valid 40-man roster
3. All contracts are valid for yearID N+1
4. Budget is set
5. Schedule exists for N+1
6. No orphaned player references (every playerID on a roster exists in People)
7. Standings initialized to 0-0
8. Stat accumulators initialized to 0

### 5.3 Where Franchise Continuity Breaks

From forum evidence and implementation experience, common failure points:

1. **Orphaned Players** — Players on rosters that don't exist in the People table after season transition
2. **Stale Contract State** — Expired contracts not cleaned up, causing phantom salary obligations
3. **Service Time Corruption** — Incorrect service time leading to wrong arbitration/FA eligibility
4. **Stat Accumulation Errors** — Previous season stats not properly locked before new season starts, causing double-counting or data loss
5. **Draft Class Gaps** — New players generated but not properly linked to teams
6. **Development Not Applied** — Player ratings from season N carried to N+1 without aging/development calculations
7. **Playoff State Leaks** — Postseason status flags not reset for new season
8. **Record Book Staleness** — Career records not updated before milestone checks begin in new season

---

## SECTION 6: The Narrative Engine

### 6.1 Architecture

OOTP's storyline engine (introduced OOTP 11, significantly expanded OOTP 13+) is XML-based with 350+ categories of storyline events. The manual (OOTP 16 Customizing section) documents the full structure:

**Component Hierarchy:**
```
STORYLINE OBJECT
├── INITIATION MECHANICS (what triggers the storyline)
├── CONDITIONS (what must be true for it to fire)
├── EVENTS (what happens in the game world)
├── ARTICLE RESULTS (generated news text)
│   ├── ARTICLE CONDITIONS (which text variant to use)
│   └── TEXT (300+ variable tokens)
└── REQUIRED DATA OBJECTS (player/team/league references)
```

### 6.2 Initiation Mechanics (Triggers)

- **Calendar Events:** All-Star Game, season start/end, monthly awards, trade deadline, draft, offseason dates
- **Statistical Milestones:** Hitting streaks, win streaks, reaching round-number totals
- **Player State Changes:** Injury, promotion, demotion, trade, signing, retirement
- **Team Performance:** Prolonged losing streak, clinching playoff berth, being eliminated
- **Random with Probability:** Weight-based random selection from eligible storylines
- **Era-Specific:** Storylines only fire within configured year ranges (e.g., 1920s bootlegging, 1940s war service, modern social media events)

### 6.3 Conditions System

Conditions filter which storylines can fire based on current game state:

- **Player Age:** minimum/maximum
- **Player Physical Condition:** healthy, injured, fatigued
- **Player Nationality:** specific country or region
- **Player Morale:** threshold levels
- **Contract Status:** contract year, free agent, arbitration-eligible
- **Roster Status:** active, minors, bench, starter
- **League Year:** era restrictions (not before X, not after Y)
- **At-Bat/IP Minimums:** ensures storyline targets significant players
- **Personality Thresholds:** leadership level, greed level, loyalty level

### 6.4 Events and Results

When a storyline fires, it produces:

**Game World Effects:**
- Personality changes (leadership increase/decrease, loyalty shifts)
- Rating changes (skill improvements or regressions)
- Retirements (player decides to leave baseball, or pursues other sport)
- Morale shifts (individual or team-wide)
- Injuries (non-game injuries — off-field incidents)
- Suspensions (disciplinary actions)
- Fan attitude changes

**Generated Content:**
- News articles with templated text
- 300+ variable tokens: `[%personname L]`, `[%game fielder of]`, `[%teamname]`, etc.
- Link tokens create hyperlinks to player/team pages
- `(nl)` creates paragraph breaks
- TEXT_CATEGORY elements with unique IDs organize text pools
- Multiple text variants per category — engine selects based on article conditions

### 6.5 Interactive Storylines (OOTP 13+)

Some storylines present choices to the player:
- "Star player becomes difficult" → Release / Trade / Ignore
- Each choice has different consequences:
  - Fan attitudes shift
  - Player morale changes
  - Team chemistry affected
  - Narrative continuity maintained (future storylines reference past decisions)

### 6.6 Milestone Detection

OOTP tracks milestones via the Milestone Watch screen (League → History):
- Approaching milestones generate anticipatory news articles
- Achievement generates celebration articles
- Career records approaching league records generate "record chase" narratives
- Single-season records tracked separately from career records

### 6.7 Customization

The entire storyline system is customizable via XML files:
- Community creates custom storyline packs
- XML structure is documented in OOTP manual (Story-line XML section)
- Storylines can be globally disabled in Global Settings
- Individual storyline categories can be toggled

---

## SECTION 7: Traits, Chemistry, and Personality Systems

### 7.1 Personality Ratings

OOTP models 6 personality traits (from OOTP 19 Manual — Personality Ratings):

| Trait | Effect |
|-------|--------|
| **Leadership** | Affects other players' performance and development. High-leadership players boost teammates. Team captains emerge from high-leadership veterans. |
| **Loyalty** | Affects contract extension likelihood. Loyal players accept hometown discounts. Disloyal players chase highest bidder. |
| **Desire for Winner** | Affects morale on losing teams. High-DFW players become unhappy on bad teams, may demand trades. Affects FA destination choice. |
| **Greed (Financial Ambition)** | Impacts contract negotiations. Greedy players demand more money. Affects morale if player feels underpaid relative to performance. |
| **Work Ethic** | Influences clubhouse effect and player development speed. High work ethic = faster development, positive clubhouse influence. |
| **Intelligence** | Game intelligence, faster prospect development. Smart players may develop more efficiently and make better baserunning/defensive decisions. |

**Scale:** 1–200 (internal), displayed contextually based on game settings.

### 7.2 Morale System

5 morale categories per player:
1. **Team Performance** — How the team is doing overall
2. **Player Performance** — How the individual is performing
3. **Roster Moves** — Reactions to trades, signings, releases
4. **Expected Role** — Whether playing time matches expectations
5. **Team Chemistry** — Clubhouse atmosphere

**Key behaviors:**
- Players prioritize categories differently (minor leaguers care more about role than team performance)
- Small but real impact on development (perennially unhappy → slower development)
- Happy players perform slightly better
- Morale shifts are storyline triggers and results

### 7.3 Team Chemistry

The Team Chemistry page (OOTP manual) shows:
- Player-manager relations rating
- Overall chemistry score
- Morale component breakdown per player
- Player "classes" (Clubhouse Leader, Prankster, Introvert, etc.)
- Bench coach reports on player concerns

**Chemistry Calculation:**
- Winning teams naturally have good chemistry
- Losing teams naturally have bad chemistry
- Individual personalities modify the baseline
- Leadership trait creates positive influence radius
- Low work ethic or high greed creates negative influence
- Trades of popular players damage chemistry
- Chemistry can be disabled in league settings

### 7.4 Effect on Performance

Personality and chemistry feed back into gameplay through:
- **Morale modifier** on in-game performance (small but cumulative)
- **Development speed** modifier (work ethic, happiness level)
- **Clubhouse influence** (leadership spreading to teammates)
- **Contract decisions** (loyalty, greed, DFW affect free agency behavior)
- **Retirement decisions** (unhappy players may retire early)
- **Storyline triggers** (personality thresholds gate certain events)

---

## SECTION 8: Replayability Architecture

### 8.1 Systems Driving "One More Season"

OOTP's franchise mode compels play across 10+ seasons through interconnected systems:

**1. Emergent Narrative from Storyline Engine**
- 350+ storyline categories ensure no two seasons feel the same
- Era-specific events adapt to league timeline
- Interactive storylines create decision trees with lasting consequences
- Player personality creates unique drama per player

**2. Player Development Unpredictability**
- High-potential prospects can bust
- Low-round draft picks can become stars ("light bulb" moments)
- Development is probabilistic, not deterministic
- Focus slider decisions create meaningful player-development strategy

**3. Aging Curve Variance**
- Some players productive into 40s, others decline rapidly at 30
- Configurable aging modifiers add further variance
- Creates constant roster churn and replacement planning

**4. Prospect Development Arcs**
- Multi-year development arcs for drafted players
- Watching a 1st-round pick rise through Rookie → A → AA → AAA → MLB
- Development tracking UI shows progress over time
- Scouting inaccuracy means surprises (both directions)

**5. Contract and Financial Strategy**
- Salary arbitration creates escalating costs for homegrown talent
- Free agency decisions: keep the aging star or invest in youth?
- Budget constraints force trade-offs
- Owner expectations create pressure

**6. Record Chasing**
- Career milestones (3000 hits, 500 HR) create compelling late-career narratives
- Single-season records create "will he break it?" tension
- Hall of Fame candidacy drives legacy narratives

**7. Playoff Unpredictability**
- Short series create upsets
- Postseason performance can differ from regular season
- "This is our year" momentum

**8. Rivalry System**
- Team-level rivalries tracked
- Head-to-head records create stakes
- Divisional competition creates multi-season storylines

**9. Challenge Level Calibration**
- AI roster management and in-game decisions have been tuned across 25+ years
- The AI correctly predicted World Series participants and champions 3 years running (per OOTP developers on forums)
- No single dominant strategy — meta shifts as the user adapts

**10. Roster Interconnection**
- Every decision cascades: trading a prospect affects future seasons
- Service time implications create timing decisions
- Rule 5 Draft creates protect-or-lose tension
- Minor league depth matters for injury coverage

### 8.2 Anti-"Solved" Mechanisms

OOTP prevents dominant strategies through:
- **Randomness in development:** Cannot reliably pick the best draft strategy
- **AI adaptation:** Computer GMs respond to market conditions
- **Injury unpredictability:** Best-laid plans disrupted by injuries
- **Salary escalation:** Success breeds expensive rosters
- **Owner expectations:** Winning raises the bar each year
- **Prospect variance:** Scouting ratings are estimates, not guarantees

---

## SECTION 9: KBL Tracker Gap Analysis

Based on the CONTEXT provided about KBL Tracker's current state, comparing against the OOTP reference architecture:

### 9.1 What KBL Has Built

| Component | Status | Evidence |
|-----------|--------|----------|
| GameTracker (live at-bat tracking) | **BUILT** | Game state, mojo/fitness, mWAR, fan morale, fame tracking, narrative recap |
| League Builder | **BUILT** | Fictional teams, custom rosters |
| Franchise CRUD | **BUILT** | Active franchise, config |
| Schedule System | **BUILT** | 162-game season, game completion |
| WAR Calculators | **BUILT (partially)** | bWAR, fWAR, pWAR, rWAR, mWAR — but positional WAR orphaned from active app |
| Player Data Model | **BUILT (partial)** | Traits exist in legacy code but not in active types |
| Fame/Milestone Engine | **BUILT (disconnected)** | Built but partially or fully disconnected |
| Aging Engine | **BUILT (disconnected)** | Built but disconnected |
| Relationships Engine | **BUILT (disconnected)** | Built but disconnected |
| Narrative Engine | **BUILT (disconnected)** | Built but disconnected |
| Mojo/Fitness Engine | **BUILT (connected)** | Active in GameTracker |
| Offseason Infrastructure | **BUILT (partial)** | Exists but unclear completeness |
| Playoffs Infrastructure | **BUILT (partial)** | Exists but unclear completeness |
| Season Transition | **BUILT (partial)** | Exists but unclear completeness |

### 9.2 What KBL Is Missing (Critical Gaps)

**GAP 1: The Stat Pipeline (CRITICAL)**
The data pipeline connecting `game event → season stats → career stats → records → narratives → HOF eligibility` is described as "unclear, incomplete, or broken." This is the #1 architectural problem. Without this pipeline, nothing downstream works correctly.

OOTP equivalent: Automatic, synchronous stat aggregation that fires after every game, with separate aggregation at season close for career totals and records.

**GAP 2: Career Stats Accumulation**
There is no evidence of a working career stats system that sums across multiple seasons. OOTP's approach: no separate career table — career stats are calculated by summing all PlayerSeasonStats rows for a playerID.

**GAP 3: Season Transition State Machine**
The close_season → open_season contract appears incomplete. OOTP requires: lock stats → process awards → process HOF → age players → run development → process retirements → resolve contracts → generate draft class → reset accumulators → generate schedule.

**GAP 4: Player Development System**
No evidence of a working development/aging engine that modifies player ratings between seasons based on OOTP's 10-factor model (coaching, playing time, potential, age, challenge, injuries, spring training, chance, modifiers, target ages).

**GAP 5: Free Agency / Arbitration / Contract Engine**
No evidence of service time tracking, arbitration eligibility calculation, free agent market operation, or contract resolution at season boundary.

**GAP 6: Hall of Fame Pipeline**
HOF eligibility → voting → induction pipeline not connected, even though fame tracking exists in GameTracker.

**GAP 7: Record Book**
No evidence of a persistent record book tracking single-season records, career records, and franchise records across seasons.

**GAP 8: Draft System**
No evidence of a working draft that generates new players and adds them to the franchise ecosystem.

### 9.3 What Is Partially Built but Disconnected

**DISCONNECTION 1: WAR Calculators**
Multiple WAR variants exist (bWAR, fWAR, pWAR, rWAR, mWAR) but positional WAR is "orphaned from the active app." The stat pipeline must feed WAR calculations automatically from game data.

**DISCONNECTION 2: Player Traits**
Traits "partially implemented in legacy code but not in active types." OOTP's personality system (6 traits at 1-200 scale) drives morale, development speed, contract behavior, and narrative triggers. These traits need to be in the active type system and wired to gameplay effects.

**DISCONNECTION 3: Fame/Milestone/Aging/Relationships/Narrative Engines**
All described as "built but partially or fully disconnected." These are the components that make franchise mode compelling beyond raw statistics. They need to be wired into the stat pipeline output.

**DISCONNECTION 4: Mojo/Fitness**
Active in GameTracker but unclear if it persists between games, carries over between seasons, or feeds into development calculations.

### 9.4 Priority Order for Connecting/Building

**Priority 1 (Must Fix First — Everything Depends On This):**
1. **The Stat Pipeline** — Game event → game totals → season stats → career stats. Without this, nothing works.
2. **Season Stats Accumulation** — PlayerSeasonStats must correctly aggregate from GameTracker output.
3. **Career Stats Accumulation** — Sum across seasons with yearID indexing.

**Priority 2 (Required for Multi-Season Play):**
4. **Season Transition State Machine** — close_season() / open_season() with full data contract.
5. **Player Aging and Development** — Ratings must change between seasons.
6. **Contract/Service Time Engine** — Tracks eligibility, drives offseason transactions.

**Priority 3 (Required for Franchise Depth):**
7. **Reconnect WAR Calculators** — Wire positional WAR to the live stat pipeline.
8. **Reconnect Fame/Milestone Engine** — Career stat milestones trigger narrative events.
9. **Reconnect Aging/Narrative Engines** — Feed development and storylines from stat pipeline output.
10. **Activate Player Traits in Type System** — Move from legacy code to active types.

**Priority 4 (Polish and Replayability):**
11. **Draft System** — Generate new players for multi-season rosters.
12. **Free Agency Market** — Offseason player movement.
13. **Record Book** — Track and display historical records.
14. **Hall of Fame Pipeline** — Full eligibility → voting → induction flow.
15. **Team Chemistry System** — Personality-driven clubhouse dynamics.

---

## SECTION 10: Recommended Architecture for KBL Tracker

### 10.1 Foundational Principle

**The stat pipeline is the spine of the entire application.** Every other system (WAR, milestones, narrative, HOF, development, records) is a consumer of stat pipeline output. Build the pipeline first, then wire consumers to it.

### 10.2 Data Model (Recommended Schema)

```typescript
// CORE ENTITIES (aligned with Lahman + OOTP patterns)

interface Player {
  playerId: string;           // Unique, immutable
  bio: PlayerBio;             // name, dob, city, country, height, weight, bats, throws
  ratings: PlayerRatings;     // current + potential for all skills
  personality: PlayerPersonality; // 6 traits: leadership, loyalty, dfw, greed, workEthic, intelligence
  physical: PlayerPhysical;   // injuryProneness, fatigue, condition
  career: PlayerCareerState;  // status, serviceTime, draftInfo, debutDate, retirementDate
  development: PlayerDevelopment; // focusSliders, devTargetAge, devSpeedMod
}

interface PlayerSeasonStats {
  playerId: string;
  yearId: number;
  teamId: string;
  leagueId: string;
  batting: BattingStats;      // G, AB, R, H, 2B, 3B, HR, RBI, SB, CS, BB, SO, etc.
  pitching: PitchingStats;    // W, L, G, GS, CG, SHO, SV, IP, H, ER, HR, BB, SO, etc.
  fielding: FieldingStats[];  // Per position: PO, A, E, DP, etc.
  calculated: CalculatedStats; // BA, OBP, SLG, OPS, ERA, WHIP, FIP, WAR
}

interface GameResult {
  gameId: string;
  yearId: number;
  date: string;
  homeTeamId: string;
  awayTeamId: string;
  score: { home: number; away: number };
  playerLines: PlayerGameLine[]; // Individual box score lines
  events: GameEvent[];          // At-bat level events from GameTracker
}

interface PlayerGameLine {
  playerId: string;
  teamId: string;
  batting?: { AB, R, H, '2B', '3B', HR, RBI, BB, SO, SB, CS };
  pitching?: { IP, H, R, ER, BB, SO, HR, pitchCount, decision };
  fielding?: { position, PO, A, E };
}

interface Season {
  yearId: number;
  franchiseId: string;
  phase: 'preseason' | 'regular' | 'postseason' | 'offseason';
  schedule: ScheduleEntry[];
  standings: StandingsEntry[];
  transactions: Transaction[];
}

interface Franchise {
  franchiseId: string;
  name: string;
  seasons: number[];          // Array of yearIds
  teams: TeamSeason[];        // Team state per season
  records: RecordBook;        // Single-season and career records
  hallOfFame: HOFInductee[];
}
```

### 10.3 The Stat Pipeline (Build This First)

```
┌─────────────┐
│ GameTracker  │ ← Already built, produces at-bat events
│ (game event) │
└──────┬──────┘
       │ game completes
       ▼
┌─────────────────┐
│ GameResult       │ ← NEW: Persist box score from GameTracker output
│ Aggregator       │    Write PlayerGameLine for each participant
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ SeasonStats      │ ← NEW: Add GameResult deltas to running totals
│ Accumulator      │    Update BA/OBP/SLG/ERA/WHIP/FIP
└──────┬──────────┘
       │
       ├─────────────────────┐
       ▼                     ▼
┌─────────────┐    ┌──────────────┐
│ WAR Engine  │    │ Milestone    │ ← Check career totals vs thresholds
│ (recalc)    │    │ Checker      │
└─────────────┘    └──────┬───────┘
                          │
                          ▼
                   ┌──────────────┐
                   │ Narrative    │ ← Trigger storylines from milestones,
                   │ Engine       │    streaks, record chases
                   └──────────────┘
```

**Implementation contract for SeasonStatsAccumulator:**

```typescript
function onGameComplete(gameResult: GameResult): void {
  for (const line of gameResult.playerLines) {
    // 1. Get or create PlayerSeasonStats for (playerId, yearId, teamId)
    const seasonStats = getOrCreateSeasonStats(line.playerId, gameResult.yearId, line.teamId);
    
    // 2. Add raw counting stats
    if (line.batting) addBattingStats(seasonStats.batting, line.batting);
    if (line.pitching) addPitchingStats(seasonStats.pitching, line.pitching);
    if (line.fielding) addFieldingStats(seasonStats.fielding, line.fielding);
    
    // 3. Recalculate rate stats
    recalculateRateStats(seasonStats);
    
    // 4. Recalculate WAR components
    recalculateWAR(seasonStats, leagueContext);
    
    // 5. Check milestones (sum all season rows for career totals)
    const careerTotals = sumCareerStats(line.playerId);
    checkMilestones(line.playerId, careerTotals);
    
    // 6. Persist
    saveSeasonStats(seasonStats);
  }
  
  // 7. Update standings
  updateStandings(gameResult);
  
  // 8. Update leaderboards
  refreshLeaderboards(gameResult.yearId);
}
```

### 10.4 Season Transition Engine (Build Second)

```typescript
async function closeSeason(yearId: number, franchiseId: string): Promise<void> {
  // Phase 1: Lock stats
  lockSeasonStats(yearId);                    // No more modifications to season N stats
  
  // Phase 2: Awards
  const awards = calculateAwards(yearId);     // MVP, Cy Young, ROY, etc.
  persistAwards(awards);
  
  // Phase 3: HOF
  const hofCandidates = getHOFEligible();     // 5+ years retired, 10+ years service
  const inducted = evaluateHOF(hofCandidates); // Compare career stats to thresholds
  persistHOFInductions(inducted);
  
  // Phase 4: Retirements
  const retirees = processRetirements();      // Age + declining ratings
  for (const p of retirees) {
    p.career.status = 'retired';
    p.career.retirementDate = `${yearId}-11-01`;
    lockCareerStats(p.playerId);
  }
  
  // Phase 5: Age and Develop all players
  const allPlayers = getAllActivePlayers(franchiseId);
  for (const p of allPlayers) {
    applyAging(p);                            // Age +1, rating decay curve
    applyDevelopment(p);                      // 10-factor development model
    updateInjuryProneness(p);                 // Injury history affects future risk
  }
  
  // Phase 6: Contract Resolution
  resolveContracts(yearId);                   // Expire, exercise options, etc.
  calculateArbitrationEligibility();          // 3-6 year service time check
  calculateFreeAgentEligibility();            // 6+ year service time check
  
  // Phase 7: Offseason Transactions
  await runDraft(yearId + 1);                 // Generate/import new players
  await runFreeAgency();                      // AI signs free agents
  await runArbitration();                     // Resolve salary disputes
  
  // Phase 8: Update Records
  updateRecordBook(yearId);                   // Check for new single-season records
  updateCareerRecords();                      // Check for new career records
}

async function openSeason(yearId: number, franchiseId: string): Promise<void> {
  // Validate preconditions
  validateRosters(franchiseId);               // Every team has valid 26/40-man
  validateContracts(yearId);                  // All contracts valid for new year
  
  // Initialize
  initializeStandings(yearId);               // All teams 0-0
  initializeSchedule(yearId);                // Generate 162-game schedule
  resetStatAccumulators(yearId);             // Fresh PlayerSeasonStats rows
  
  // Set phase
  setSeason({ yearId, phase: 'preseason' });
}
```

### 10.5 Player Development Engine (Build Third)

```typescript
function applyDevelopment(player: Player): void {
  const age = calculateAge(player.bio.dob);
  const coachingQuality = getCoachingRatings(player.teamId);
  const playingTime = getPlayingTimeRatio(player.playerId);
  const challengeLevel = getChallengeLevel(player); // overmatched vs unchallenged
  const injuryImpact = getInjuryDevelopmentPenalty(player);
  const morale = getAverageMorale(player);
  
  for (const skill of getAllSkills(player)) {
    const currentRating = player.ratings[skill].current;
    const potentialRating = player.ratings[skill].potential;
    
    // Development direction
    let delta = 0;
    
    if (age < 25) {
      // Growth phase: move current toward potential
      const growthRate = calculateGrowthRate(
        coachingQuality,
        playingTime,
        potentialRating,
        challengeLevel,
        player.personality.workEthic,
        player.personality.intelligence,
        injuryImpact,
        morale,
        player.development.focusSliders[skill],
        player.development.devSpeedMod
      );
      delta = growthRate * (potentialRating - currentRating) * randomVariance();
    } else if (age >= 30) {
      // Decline phase: ratings decrease
      const declineRate = calculateDeclineRate(age, player.physical, skill);
      delta = -declineRate * randomVariance();
    }
    
    // Apply with bounds
    player.ratings[skill].current = clamp(currentRating + delta, 1, 200);
    
    // Potential can also change (injuries, chance)
    if (shouldPotentialChange()) {
      player.ratings[skill].potential += randomPotentialDelta();
    }
  }
}
```

### 10.6 WAR Calculation Engine (Reconnect/Fix)

KBL already has bWAR, fWAR, pWAR, rWAR, mWAR calculators. The fix needed is:

1. **Wire WAR to the stat pipeline** — WAR should recalculate after every game, not be a standalone calculator
2. **Establish league context** — WAR requires league-average baselines that update throughout the season
3. **Connect positional WAR** — Currently orphaned; needs to read from live PlayerSeasonStats
4. **Persist WAR as a calculated field** on PlayerSeasonStats.calculated.war

Recommended WAR formula (simplified fWAR approach for KBL's context):

```
Position Player WAR = (wRAA + BsR + Fielding + PosAdj + LeagueAdj + Replacement) / RPW

Where:
  wRAA = wOBA-based runs above average, park-adjusted
  BsR = SB * 0.2 + CS * (-0.384)  // simplified
  Fielding = range + error + arm defensive runs
  PosAdj = per-position constant (C: +12.5, SS: +7.5, CF: +2.5, ... DH: -17.5 per 162G)
  LeagueAdj = balance between leagues
  Replacement = ~20 runs per 600 PA
  RPW ≈ 10 (runs per win, adjusted by league run environment)

Pitcher WAR = ((lgFIP - pFIP) / dRPW + replacement) * (IP/9)

Where:
  FIP = ((13*HR + 3*(BB+HBP) - 2*K) / IP) + FIP_constant
  lgFIP = league average FIP
  dRPW = dynamic runs per win
```

### 10.7 Narrative Engine (Reconnect)

The existing narrative engine should be wired as a **consumer** of the stat pipeline:

```typescript
// After every game:
function evaluateNarrativeTriggers(gameResult: GameResult, seasonContext: SeasonContext): NarrativeEvent[] {
  const events: NarrativeEvent[] = [];
  
  // Milestone triggers
  for (const line of gameResult.playerLines) {
    const career = sumCareerStats(line.playerId);
    if (career.HR === 500) events.push({ type: 'milestone_500hr', playerId: line.playerId });
    if (career.H === 3000) events.push({ type: 'milestone_3000h', playerId: line.playerId });
    // etc.
  }
  
  // Record chase triggers
  const seasonLeaders = getSeasonLeaders(seasonContext.yearId);
  for (const leader of seasonLeaders) {
    const record = getSeasonRecord(leader.stat);
    if (leader.value > record.value * 0.9) {
      events.push({ type: 'record_chase', playerId: leader.playerId, stat: leader.stat });
    }
  }
  
  // Streak triggers
  // Team performance triggers
  // Calendar triggers
  
  return events;
}
```

### 10.8 Recommended Build Sequence

This is the actionable build plan, ordered by dependency:

```
PHASE 1: THE SPINE (Stat Pipeline)
├── 1a. Define PlayerSeasonStats schema with all counting + rate + WAR fields
├── 1b. Build GameResult persistence (capture GameTracker output as box scores)
├── 1c. Build SeasonStatsAccumulator (game deltas → running season totals)
├── 1d. Build CareerStatsCalculator (sum across yearIds)
├── 1e. Wire WAR calculators to live SeasonStats
└── 1f. Build Standings updater

PHASE 2: MULTI-SEASON (Season Transition)
├── 2a. Build closeSeason() with stat locking and awards
├── 2b. Build openSeason() with validation and initialization
├── 2c. Build Player Aging engine (rating decay curves)
├── 2d. Build Player Development engine (10-factor growth model)
├── 2e. Build Contract/Service Time tracker
└── 2f. Build basic Draft (generate new players)

PHASE 3: RECONNECTIONS (Wire Existing Engines)
├── 3a. Activate Player Traits in type system (move from legacy)
├── 3b. Wire Fame/Milestone engine to CareerStats output
├── 3c. Wire Narrative engine to stat pipeline triggers
├── 3d. Wire Aging engine to season transition
├── 3e. Wire Mojo/Fitness to persist between games
└── 3f. Build Record Book (single-season + career records)

PHASE 4: DEPTH (Replayability Systems)
├── 4a. Build Free Agency market
├── 4b. Build Salary Arbitration
├── 4c. Build HOF pipeline (eligibility → evaluation → induction)
├── 4d. Build Team Chemistry system
├── 4e. Build interactive storyline events
└── 4f. Build Prospect Development tracking UI
```

### 10.9 Key Architectural Decisions

1. **No separate career stats table.** Career stats = `SUM(PlayerSeasonStats) WHERE playerId = X GROUP BY playerId`. This is the Lahman/OOTP pattern and prevents sync issues.

2. **Stat pipeline is synchronous and game-triggered.** Every game completion fires the full pipeline: accumulate → WAR → milestones → narratives. No background jobs, no eventual consistency.

3. **Season transition is atomic.** `closeSeason()` and `openSeason()` are transactional. If any step fails, the season boundary should not be crossed.

4. **Player ratings are mutable state with history.** Store `PlayerRatingSnapshot` at each season close so development curves can be visualized.

5. **Franchise state is the root aggregate.** All queries flow from `franchiseId → yearId → data`. This prevents cross-franchise data leaks.

6. **WAR is a derived field, not a stored constant.** It recalculates as league context changes throughout the season.

7. **The narrative engine is a side-effect consumer.** It reads from the stat pipeline but never writes back to it. Narrative events can modify player morale/personality, but not statistical records.

---

## APPENDIX A: Sources Consulted

1. OOTP Official Manual (versions 13, 15, 16, 19, 21, 24) — manuals.ootpdevelopments.com
2. OOTP Official Wiki — wiki.ootpdevelopments.com
3. OOTP Forums — forums.ootpdevelopments.com
4. OOTPDBTools GitHub Repository — github.com/sleffew80/OOTPDBTools
5. StatsPlus Wiki — wiki.statsplus.net
6. MojoTech Blog: "Building a Calculation Engine for OOTP" — mojotech.com/blog
7. Lahman Baseball Database — sabr.org/lahman-database
8. Baseball Reference WAR Explainer — baseball-reference.com/about/war_explained_position.shtml
9. FanGraphs WAR Library — library.fangraphs.com
10. OOTP Wikipedia Article — en.wikipedia.org/wiki/Out_of_the_Park_Baseball
11. Steam Community Guides (OOTP 19, 21) — steamcommunity.com
12. Brian Carnell Blog: "OOTP 11 Storyline Engine" — brian.carnell.com
13. PEBA Baseball Forums: Storyline Suggestions — pebabaseball.com
14. Baseball Prospectus: "OOTP 15 Review" — baseballprospectus.com
15. Samford University: "Sabermetrics 101: Understanding WAR" — samford.edu

## APPENDIX B: Unverified Claims Requiring Further Research

1. **OOTP's exact WAR formula** — OOTP does not publicly document their WAR calculation. The fWAR-like model described in Section 2 is inferred from forum discussions and general sabermetric principles. OOTP's WAR may differ in implementation details.

2. **Complete 68-table schema** — The full list of all 68 exportable tables with column definitions is not available in documentation. It can only be obtained by performing an actual OOTP export with all tables selected, then inspecting the CSV headers. The StatsPlus configuration screenshots (not readable in text form) show the table selection UI.

3. **Precise stat aggregation timing** — Whether OOTP aggregates stats synchronously after each game or in batch is not explicitly documented. The assumption of synchronous aggregation is based on the fact that leaderboards and standings update immediately in the UI.

4. **Storyline XML schema details** — The OOTP 16 manual has section headings for all storyline components (Overview, Object, Initiation Mechanics, Conditions, Events, Article Results, XML, Required Data Objects, Articles, Article Conditions) but several pages have "No content yet" placeholder text, suggesting incomplete documentation. The XML structure is best understood by examining actual storyline files in an OOTP installation.

5. **Inter-season development calculation timing** — Whether development runs once at season close, continuously during offseason, or at season open is not explicitly documented. The manual says players "age as seasons go by" and development happens "over the course of a season or a career."
