# Franchise Mode Deep Dive — JK Feedback & Opus Response
# Saved: 2026-02-21
# Purpose: Reference for reconciliation pass. Shows what JK asked for and what Opus
# claims was captured in the 20 spec updates. Use to identify items that may have
# fallen through the cracks before archiving FRANCHISE_MODE_DEEP_DIVE.md.

---

## OPUS SUMMARY — What Was Updated (20 items claimed complete)

### MAJOR UPDATES (8):
1. TRADE_SYSTEM_SPEC.md — removed salary matching, added Chemistry-tier trade value
2. OFFSEASON_SYSTEM_SPEC.md — removed contraction, restructured 11 phases, triple salary recalc, Phase 11 signing round
3. SALARY_SYSTEM_SPEC.md — removed contraction, added Chemistry-tier potency factor, triple recalc schedule
4. FAN_MORALE_SYSTEM_SPEC.md — simplified 60/20/10/10 formula, removed contraction risk, franchise health warning replaces it
5. FARM_SYSTEM_SPEC.md — unlimited farm during season, 3 options limit, call-up rating reveal
6. NARRATIVE_SYSTEM_SPEC.md — already had v1.2 corrections (mojo/fitness read-only, morale→probability)
7. EOS_RATINGS_ADJUSTMENT_SPEC.md — already had corrected Chemistry mechanics + trait assignment
8. FRANCHISE_MODE_SPEC.md — already had separated modes, dynamic schedule, fictional dates

### NEW SPECS CREATED (7):
1. TRAIT_INTEGRATION_SPEC.md — corrected Chemistry mechanics, potency tiers, position-appropriate pools
2. SEPARATED_MODES_ARCHITECTURE.md — League Builder → Franchise Season → Offseason Workshop
3. SCOUTING_SYSTEM_SPEC.md — hidden ratings, scout accuracy by position, call-up reveal
4. PROSPECT_GENERATION_SPEC.md — grade distribution, trait ratios (~30/50/20), Chemistry distribution
5. ALMANAC_SPEC.md — top-level nav, cross-season queries, incremental build phases
6. PARK_FACTOR_SEED_SPEC.md — BillyYank 23 stadiums, 40% activation threshold
7. PERSONALITY_SYSTEM_SPEC.md — hybrid 7 visible + 4 hidden modifiers

### MINOR UPDATES (5):
1. LEAGUE_BUILDER_SPEC.md — personality system reference
2. DRAFT_FIGMA_SPEC.md — grade distribution table, reveal ceremony reference
3. FREE_AGENCY_FIGMA_SPEC.md — updated cross-reference to PERSONALITY_SYSTEM_SPEC
4. AWARDS_CEREMONY_FIGMA_SPEC.md — already had trait wheel + eye test equal ranking
5. STADIUM_ANALYTICS_SPEC.md — BillyYank source reference, park factor activation

---

## JK ORIGINAL FEEDBACK (verbatim)

### Scouting System
- Scout accuracy spread across positions; scouts inherently more accurate for certain positions, worse at others
- If scout ability is static, users will immediately know if the scout is trustworthy after first call-up → needs element of probability so scout sometimes gets position super wrong, other times slightly wrong

### Prospect Grades
- B, B-, and C+ should be equally common (not on a slope)
- Player generator must know how to generate players at those ratings including traits
- Need to review logic and do deep dive analysis into 506-player roster database to ensure engine can replicate players with/without traits at accurate grades

### Almanac
- Almanac button on home page
- Filter/sort all data from all saved files (KBL Season 1 only, all seasons, offseason data with all 11 phases outcomes, etc)

### Schedule (Theme 5)
- Schedule must be dynamic — allow users to remove games if ending season early
- Allow users to skip games; dynamic engine adjusts games threshold for stat/milestone/standings/records counting
- Cannot force users to reach a certain number of games to end season
- Add fictional dates for record-keeping ("a multi-homer game by Jones on April 12, 2026")

### Theme 7 (Narrative)
- See narrative_system_spec; may need reconciliation

### Mojo/Fitness (re: REG events)
- Cannot trigger changes to mojo or fitness from the app — generated in actual SMB4 game
- Cannot manufacture injuries or mojo changes
- Everything else in REG events looks possible

### Personality (Theme 8)
- Hybrid approach: user knows general personality type without knowing intimate details driving behavior (free agency destinations etc)
- Hidden modifiers approved
- Question: would showing general personality give away the reveal moments?

### Awards (3.4)
- Allow user to rank players all the same if they don't feel discernible difference; let fWAR/Clutch/Fame decide
- Eye test definition needed

### Roster Management (3.9 — Phase 11)
- Barrier during final roster mgmt phase: all teams come down to 22/10 threshold
- Each team given chance to sign one player from players available after cut-downs
- Each team given chance to cut one player and sign one from available before FINALIZING

### Playoff Tiebreaker (3.2)
- Run differential is the tiebreaker in SMB4 — must track this

### Stadium Change (3.3)
- Ability for team to change stadiums in offseason (and possibly mid-season via random event generator)
- Large dice roll in offseason: certain numbers allow user to choose, others assign new stadium based on die number

### Fan Morale (3.15)
- Simplify how fan morale is calculated; tied to team performance changes and roster moves
- Include game-to-game performance impacts from key players (player designations beyond fan fave and albatross?)
- Beat reporter personalities actually influence fan morale

### Park Factor Activation (3.19)
- 40% of season as static trigger (not 50 home games)
- Initial park factors count for 50% of park factor in first season once dynamic calcs begin
- Small sample sizes don't over-influence but stay important

### Salary Milestones (3.20)
- NEVER use hardcoded MLB thresholds; always scale down for SMB season/innings

### Trades — No Salary Matching (3.12 / 3.21)
- No salary matching needed for trades — no salary cap
- Teams should make whatever trades they feel are best
- Salary impact on fan/manager expectations should only consider MLB roster (not farm)
- Teams can send down expensive underperforming vet to improve morale and develop younger cheaper player

### Salary Cap (3.6 question)
- We don't have a salary cap; question: is there a way to include one that makes sense? Review needed.

### Player Development (3.22)
- No "develop" element beyond what's tied to performance/EOS ratings adjustments/Award rewards (traits, ratings boosts/nerfs)
- Scouting approach for prospects: know at call-up what actual ratings are

### Random Event Generator
- JK explicitly noted: "I don't see our Random Event Generator concept anywhere in the specs; we had that included as a fun table-top RPG element to add random changes throughout the season"
- Needs to be revisited
- Could tie in to beat reporter narrative elements
- Player morale to influence random event generator (high morale → good things, low morale → bad things)
- Could allow lower-rated overperforming players to develop faster in-season (but ratings bump mid-season = salary bump = harder to get EOS boost)

### Team Captain
- Based on hidden personality
- Important for team chemistry, loyal over time → risky to trade
- Fans may revolt if traded/sent down even if not great player

### Young Player Designation
- Fan-desired development player — randomly chosen from farm system
- Drive strategic decisions on calling him up
- Based on draft position?

### Beat Reporter → Narrative on Roster Moves
- Call-up/send-down generates beat reporter pop-up based on hidden personality/relationship data
- E.g., "Calling up Dave Smith will hurt his morale because he's been bullied by Bob Jones"
- Don't know how trustworthy reports are until executing the action
- Some version of this was in specs but unclear if lost/orphaned

### Prospect Draft in League Builder
- Way to populate farm systems in league builder or during seasons
- Prospect Draft as part of league builder so each team can populate farm before starting franchise
- Requires teams assigned unique scouts at that point

### Separated Modes Architecture (JK's vision)
- Offseason as its own Mode in main menu
- Pulls data from recently completed season (saved in franchise mode)
- Applies all offseason phases to that dataset
- When done, save slot marked "ready for upload to franchise to kick off Season 2"
- Individual save slots per season (KBL Season 1, KBL Season 2, etc)
- Separate: preseason (league/roster/staff builder) + regular season + offseason (all 11 phases)
- "The Spine" as thread running through all modes, called by other modes, each with individual save states
- Should enable atomic season transitions

### AI-Controlled Teams (3.21)
- Save AI-controlled teams for future development?
- If one user-controlled team + rest AI, need simulated games/stats for AI vs AI
- Event-driven engine still used for human vs AI games
- One-player setup vs all AI teams = meaningful testing from dev standpoint

### Contraction/Expansion (3.6)
- Remove contraction due to very high architectural risk
- Keep expansion as feature if not risky — is there a way to bring in new rosters/teams in offseason without architectural risk?

### Fan Morale → Ratings Adjustments (not contraction)
- Fan morale should tie to ratings adjustments instead of contraction risk
- Punishes teams for bad seasons while still giving draft priority (lower expected WAR)
- Forces rebuild via FA (luck), draft (skill), trades (skill), call-ups

### Farm System — No Roster Constraints During Season
- No roster constraints for farm teams during season
- Only require 22/10 before finalizing rosters (spring training cut-down)
- No checks/balances until end of offseason

### EOS Adjustments for Farm Players
- No adjustments unless called up (revealing actual ratings)
- If player didn't play "enough" → keeps same salary, considered rookie again next season
- If met threshold → thrown in mix for EOS ratings adjustments with vets
- Or: rookie category where rookies compared against each other

### Rookie Salary Based on Draft Position
- Higher drafted players sign larger contracts
- In rookie season, salary entirely based on draft position (not ratings — don't know ratings until call-up)
- Salary adjusted at end of rookie season
- True value compared against draft position → some players riskier to draft early
- Teams can "SKIP" draft slot

### Call-Up/Send-Down 3 Options Rule
- Player can only be called up or sent down 3 times before team forced to cut him (or can't be called up again until next season)
- Count: call-up + send-down + call-up = 3 options; another send-down → can't be called up again (or cut required?)
- Simpler version: can't be called up again that season if sent down twice

### Almanac Depth (Conversation 6)
- Comprehensive almanac including everything PureSim includes plus KBL-unique additions:
  - Nut shots, killed pitchers
  - Verified relationships among players
  - POGs (Players of the Game)
  - Beat reporters' commendable work
  - Scouting outcomes (true/transformative)
  - Fitness/mojo records (most juiced players → PED suspicion)
  - Biggest bust/boom seasons
  - KBL-unique stats and narrative-wise items
- Engine makes sense of emergent concepts over time
- User can add emergent narrative elements like modifiers
- Question: when we can emergent narrative elements, should this be a must?

### Event-Driven Everything
- Offseason events treated like in-game events (event bus)
- Every output of preseason, regular season, offseason should be event-driven
- Call-up/send-down = an event, counted and recorded
- Should enable clean tracking and feeding into other engines

### League Narratives
- League narratives imperceptible to users but noticeable by narrative engine
- Beat reporters notice statistical relationships among players/teams user couldn't perceive without advanced analysis
- Pattern recognition at league level

### The Spine
- Thread running through all modes
- Called to other modes each with individual save states
- Enables atomic season transitions
- All architecture in app serves franchise mode for v1

### Franchise Mode as Heart of App
- Everything in home menu serves franchise mode
- Franchise experience = point of app for v1
- Goal: meaningful narrative + performance-driven changes throughout every season
- Development driven by actual performance + random chance for fun
- Fun = strategy + luck + player-to-player interaction
- Human-to-human couch connection is KBL's superiority
- Storytelling as thread connecting teams, players, seasons across time

---

## STATUS
- Saved: 2026-02-21
- Purpose: Reconciliation reference only — verify which items above were captured in Feb 20 specs
- This file should be archived after reconciliation pass is complete
