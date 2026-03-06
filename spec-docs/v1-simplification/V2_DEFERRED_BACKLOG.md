# V2 DEFERRED BACKLOG

Items deferred from v1 during spec triage. Organized by source section.

---

### Competitive Position Table
- **Source:** MODE_2 §1.6
- **What it does:** Comparison table showing KBL vs GameChanger vs iScore vs Lazy Guys (taps per play, franchise depth, SMB4 context, enrichment model)
- **Why deferred:** Marketing/justification material, not a build requirement
- **Dependencies for v2:** None
- **Preserves data from:** N/A

### Transaction Types: DFA, Waiver, Contract Extension
- **Source:** MODE_2 §2.3
- **What it does:** Three procedural transaction types — DFA (designate for assignment), waiver claims, and contract extensions
- **Why deferred:** DFA and waiver are MLB procedural steps that add complexity without couch payoff. Contract extension requires multi-year contracts which are v2 (Mode 1 §5.3). DFA → handled as release. Waiver → handled as free_agent_signing.
- **Dependencies for v2:** Multi-year contracts (Mode 1) for contract_extension
- **Preserves data from:** N/A — v1 TransactionEvent type union still includes these values per fat-event philosophy; they're dormant, not deleted

### Pitch Type Repertoire Filtering
- **Source:** MODE_2 §4.3
- **What it does:** Filters the 9-type pitch selector to show only pitches in the current pitcher's repertoire (from League Builder data)
- **Why deferred:** Requires Mode 1 to store per-pitcher pitch type repertoire data. v1 shows all 9 types and lets user pick.
- **Dependencies for v2:** Mode 1 pitcher repertoire data per player
- **Preserves data from:** N/A

### Between-Inning Enrichment Prompts
- **Source:** MODE_2 §4.4
- **What it does:** Dedicated UI flow between innings that prompts unenriched plays for batch enrichment
- **Why deferred:** Extra UI complexity. Play log badges (kept in v1) serve as the enrichment entry point.
- **Dependencies for v2:** None — just UI work
- **Preserves data from:** N/A

### Double Switch as Atomic Operation
- **Source:** MODE_2 §7.1
- **What it does:** Single-action substitution that simultaneously swaps a pitcher and position player with crossed batting order slots
- **Why deferred:** Two sequential subs can't cross batting order slots, but the new "batting order swap" operation (added in v1) lets users achieve the same result in 2 steps instead of 1.
- **Dependencies for v2:** Batting order swap operation (v1) already provides the workaround
- **Preserves data from:** 'double_switch' value in BetweenPlayEvent substitution.type is dormant in v1 type definitions

### Storage Cost Projections
- **Source:** MODE_2 §8.5
- **What it does:** Calculates bytes per event (~500), KB per game (~35KB), and MB per league size for various configurations
- **Why deferred:** Planning/capacity reference material, not build logic. MODE_1 §13.3 has full storage projections.
- **Dependencies for v2:** None
- **Preserves data from:** N/A

### Weighted Probability Fielder Inference
- **Source:** MODE_2 §10.2
- **What it does:** When inferring which fielder made a play, uses weighted probability tiers (primary 65%, secondary 25%, tertiary 10%) across 4 matrices (ground balls, fly balls, line drives, pop flies) per direction
- **Why deferred:** v1 uses deterministic primary-fielder-only assignment per direction. Simpler, still correct most of the time. Probability tiers add realism but not correctness.
- **Dependencies for v2:** None — just richer inference logic
- **Preserves data from:** N/A — inference is computed at play time, not stored

### WAR Calibration System
- **Source:** MODE_2 §11.6
- **What it does:** Post-hoc recalibration of all WAR types after 2+ seasons with 10,000+ PA (batting) or 500+ IP (pitching). Blends new data with baseline (30% new batting, max 40% new pitching). Tracks confidence on 0-1 scale. Recalibrates after each season.
- **Why deferred:** Inherently multi-season — does nothing in season 1. v1 uses baseline constants and SMB4-calibrated weights without adjustment.
- **Dependencies for v2:** 2+ completed seasons of accumulated data
- **Preserves data from:** N/A — all raw stats preserved; calibration is a lens applied on top

### Juiced Eligibility Engine
- **Source:** MODE_2 §14.7
- **What it does:** Engine-side logic that determines when a player can enter Juiced state — requires Fit status, 20-game cooldown expired, triggered only via random event/trait/narrative. Includes `checkJuicedEligibility()`, cooldown tracking (`juicedCooldown`, `lastJuicedGame` fields). Note: `gamesAtJuiced` is KEPT in v1 — it's state tracking for the almanac, not eligibility logic.
- **Why deferred:** v1 treats Juiced as a pure user-observed state like all other mojo/fitness levels. User sets it when they see it in SMB4, engine reads it and applies downstream effects (WAR -15%, fame boner -1/game + 50% credit, narrative hooks). No engine gatekeeping needed.
- **Dependencies for v2:** §15 Modifier Registry (random events), §17 Dynamic Designations (trait triggers)
- **Preserves data from:** N/A — Juiced state itself is still tracked; only the eligibility logic is deferred

### Pitch Count Estimation System
- **Source:** MODE_2 §9.8
- **What it does:** Auto-estimates pitch count when user doesn't provide one, using per-outcome rates (K=5.5, BB=5.8, hit=3.2, out-in-play=3.0, etc.)
- **Why deferred:** Adds logic complexity for questionable accuracy. v1 requires manual entry with option to skip. Null pitch count degrades gracefully (Maddux undetectable, Fenway Board shows blank PC).
- **Dependencies for v2:** None — just estimation logic
- **Preserves data from:** N/A

### Dynamic Top-10% Career Thresholds
- **Source:** MODE_2 §18.4
- **What it does:** After 10+ completed careers in a franchise, calculates dynamic top-10th-percentile thresholds for career milestones. Uses `Math.max(dynamic, fixedFloor)` so whichever is more demanding applies.
- **Why deferred:** Unlikely to play 10+ seasons in one franchise. Fixed floor thresholds (pre-scaled MLB baselines) are sufficient for v1 and prevent too-easy milestones in early years.
- **Dependencies for v2:** 10+ completed careers in franchise history
- **Preserves data from:** All career stats preserved; dynamic threshold is a lens applied on top of existing data

### Legacy Status Tiers
- **Source:** MODE_2 §18.6
- **What it does:** Three tiers of franchise legacy recognition — Franchise Cornerstone (2+ seasons, 5+ WAR same team), Franchise Icon (3+ seasons, 10+ WAR, 1+ award), Franchise Legend (5+ seasons, 18+ WAR, 2+ awards, HOF). Evaluated at season end. Persists after retirement. Awards +2.0 / +4.0 / +8.0 fame respectively.
- **Why deferred:** Multi-season evaluation — invisible in season 1. No gameplay or almanac impact until multiple seasons played.
- **Dependencies for v2:** Multiple completed seasons with same-team WAR tracking
- **Preserves data from:** All per-season WAR and awards data preserved; legacy evaluation is computed from existing stats

### Fan Favorite & Albatross Trade Mechanics (Entire Section)
- **Source:** MODE_2 §19
- **What it does:** Two trade-time mechanics: (1) Albatross 15% trade discount — other teams demand 15% less trade value to acquire Albatross-designated players. (2) Fan Favorite trade protection — amplified -15 fan morale hit when Fan Favorite is traded away.
- **Why deferred:** v1 has no salary matching for trades and no AI trade logic, so the Albatross discount has nothing to apply to. The broader concept — fan morale effects from trading players, scaled by True Value — belongs as a subsection of Fan Morale, not its own section. Deferred for v2 redesign.
- **SPEC CORRECTION:** §19.2 claimed Fan Favorite designation carries over to acquiring team on trade. Per JK ruling: designations NEVER carry over on trade. Only season-to-season carryover (§17.3/§17.4) applies.
- **Dependencies for v2:** Salary matching for trades, AI trade logic, True Value calculation in trade context
- **Preserves data from:** Designation status and True Value data preserved; trade morale effects in §20 (acquire star +8, trade away star -10) still function independently

### SIMULATE Button & AI Game Logic
- **Source:** MODE_2 §22.3
- **What it does:** SIMULATE button on schedule view for AI-vs-AI games, calling §25 AI Game Engine to auto-generate game results without user input.
- **Why deferred:** No AI logic for gameplay in v1. All games are either manually scored ("Score" → opens GameTracker) or skipped ("Skip"). User is the bridge for all game results.
- **Dependencies for v2:** §25 AI Game Engine
- **Preserves data from:** N/A — SIMULATED value stays dormant in GameStatus type definition per fat-event philosophy

### Exit Velocity on Spray Chart
- **Source:** MODE_2 §24.5
- **What it does:** Optional exit velocity field on each batted ball spray chart record
- **Why deferred:** Can't observe exit velocity in SMB4. Potential v2 enrichment if modeled from hit type + landing zone, but reverse-engineering physics from categorical data is unreliable.
- **Dependencies for v2:** Hit type + landing zone model (new logic)
- **Preserves data from:** N/A — field simply omitted; all other spray chart fields preserved

### Season Classification
- **Source:** MODE_2 §22.4
- **What it does:** Labels seasons as PRIMARY (75%+ manual), MIXED (25-74%), or SIMULATED (<25%) based on percentage of games manually played vs AI-simulated.
- **Why deferred:** Without AI simulation in v1, every season is PRIMARY by definition. Enum is meaningless.
- **Dependencies for v2:** §25 AI Game Engine (simulation must exist for classification to vary)
- **Preserves data from:** N/A

### AI Game Engine (Entire Section)
- **Source:** MODE_2 §25
- **What it does:** Full AI Game Engine that simulates games between AI-controlled teams. Includes: probability model (batter ratings vs pitcher ratings + park factors), seeded PRNG (Mulberry32) for reproducibility, variance configuration (15-25%), 4 TypeScript interfaces (AIGameEngine, SimRoster, SimPlayer, SimulationOptions), output contract producing standard GameRecord with `source: 'SIMULATED'`, and unsimulate capability.
- **Why deferred:** No simulation in v1. All games are manually scored (Score → GameTracker) or skipped (Skip). The "simplified box-score generator" mentioned in the spec preamble is also unnecessary — box scores for played games come from GameTracker + Stats Pipeline data, not simulation. All 4 interfaces stripped from codebase until v2.
- **Dependencies for v2:** Mode 1 rosters/ratings, §24 park factors, §8 stats pipeline (all exist in v1 — engine just needs building)
- **Preserves data from:** N/A — no simulation data exists in v1 to preserve

### Cold Storage Tier (Multi-Season Archive Export)
- **Source:** MODE_2 §26.2
- **What it does:** User-initiated export of multi-season franchise archives to cold storage. Third tier beyond Hot (current game/season) and Warm (season history/career stats).
- **Why deferred:** Unscoped feature — no export format, trigger, or UI defined. Hot + Warm tiers handle all v1 data needs.
- **Dependencies for v2:** Multi-season data accumulation, export format decision
- **Preserves data from:** N/A — all data lives in Hot/Warm IndexedDB; Cold is an export copy

### SeasonSummary `seasonClassification` Field
- **Source:** MODE_2 §26.3
- **What it does:** Field on the Mode 2 → Mode 3 handoff interface indicating whether a season was PRIMARY (75%+ manual), MIXED, or SIMULATED.
- **Why deferred:** Always PRIMARY in v1 (no AI simulation per §22.4 / §25 deferrals). Field removed from v1 interface.
- **Dependencies for v2:** §25 AI Game Engine, §22.4 Season Classification
- **Preserves data from:** N/A

---

## MODE 1 Deferrals

### Playoff Mode Entry Point
- **Source:** MODE_1 §1.4 / §11.8
- **What it does:** "Playoff Mode" main menu entry point leading to abbreviated 5-step wizard (no season settings, no draft, teams use current League Builder rosters)
- **Why deferred:** Not essential for v1 couch experience. "New Franchise" and "League Builder" cover all v1 use cases.
- **Dependencies for v2:** None
- **Original length:** §11.8 = 14 lines

### `aiScoreEntry` Toggle
- **Source:** MODE_1 §2.3 / §2.4 / §11.5
- **What it does:** Boolean flag on FranchiseTypeConfig allowing manual W/L entry for AI-vs-AI games
- **Why deferred:** Redundant — v1 has Score/Skip for ALL games per Mode 2 §22. Toggle serves no purpose.
- **Dependencies for v2:** None
- **Original length:** 1 field + preset references

### Per-Phase Offseason Scope Configuration
- **Source:** MODE_1 §2.5
- **What it does:** 13-row per-phase scope table with per-phase `aiResolution` setting, `OffseasonPhaseConfig` interface, and `PhaseScope` type
- **Why deferred:** Over-configuration for v1. Single global toggle (all-teams vs human-only) is sufficient. Awards Ceremony toggle preserved as standalone.
- **Dependencies for v2:** Mode 3 per-phase scoping
- **Original length:** ~30 lines (interface + table)

### Team Metadata Fields
- **Source:** MODE_1 §4.3
- **What it does:** Three optional fields on Team model: `foundedYear`, `championships`, `retiredNumbers`
- **Why deferred:** Franchise-specific history, not team template branding data. Don't belong on reusable templates.
- **Dependencies for v2:** Franchise history tracking system
- **Original length:** 3 lines

### AI Behavior Sliders
- **Source:** MODE_1 §9.2
- **What it does:** 6 configurable sliders on RulesPreset: `tradeAggressiveness`, `tradeAcceptanceThreshold`, `rebuildThreshold`, `prospectValuation`, `winNowBias`, `positionScarcityAwareness`
- **Why deferred:** AI teams in v1 use sensible hardcoded defaults. Sliders are over-configuration for v1 AI behavior depth.
- **Dependencies for v2:** AI trade logic, AI roster management
- **Original length:** ~13 lines

### Pitch Count & Mound Visit Rule Settings
- **Source:** MODE_1 §9.2
- **What it does:** Game rule objects for pitch count limits (starter/reliever) and mound visit limits (per game)
- **Why deferred:** No Mode 2 system reads these. Pitch count estimation deferred in Mode 2 §9. Mound visits not tracked.
- **Dependencies for v2:** Mode 2 pitch count estimation system
- **Original length:** ~10 lines

### Rules Presets System
- **Source:** MODE_1 §9.3
- **What it does:** 4 built-in read-only presets (Standard Season, Quick Play, Full Simulation, Arcade Mode) with preset selection UI and `defaultRulesPresetId` on LeagueTemplate
- **Why deferred:** User configures rules directly to match their SMB4 console settings. Presets add no value — every franchise setup is unique to the user's configuration.
- **Dependencies for v2:** None
- **Original length:** 53 lines

### Screenshot/OCR Schedule Extraction
- **Source:** MODE_1 §10.1
- **What it does:** User takes screenshot of SMB4 schedule, app uses OCR to extract game data, user reviews and confirms parsed results
- **Why deferred:** Requires OCR pipeline (likely cloud-based). CSV upload + manual game entry is sufficient for v1.
- **Dependencies for v2:** OCR service integration
- **Original length:** 1 input method entry

### SIMULATED GameStatus Value
- **Source:** MODE_1 §10.1
- **What it does:** GameStatus enum value for AI-simulated games
- **Why deferred:** No AI simulation in v1. Stripped (not dormant) to avoid confusion. Consistent with Mode 2 §22 and §25 deferrals.
- **Dependencies for v2:** Mode 2 AI Game Engine (§25)
- **Original length:** 1 enum value + 1 comment reference

### Legacy Data Migration
- **Source:** MODE_1 §13.7, lines 1734-1743
- **What it does:** Detects pre-franchise legacy data on first launch, creates "Default Franchise," migrates all data, shows migration complete
- **Why deferred:** v1 is a fresh start for all users. No pre-franchise data exists to migrate.
- **Dependencies for v2:** Only relevant if v1 ships and later needs migration for v2 schema changes
- **Original length:** 10 lines

### V2 Material Reference Table
- **Source:** MODE_1 §14, lines 1744-1762
- **What it does:** 10-row table listing pre-tagged V2 features (salary cap, contraction, cloud sync, franchise templates, etc.)
- **Why deferred:** Redundant with V2_DEFERRED_BACKLOG.md. Same ruling as Mode 2 §27.
- **Dependencies for v2:** N/A
- **Original length:** 19 lines



## MODE 3 Deferrals

### Streamlined Mode
- **Source:** MODE_3 §2.4, lines 123-132
- **What it does:** Batch processing offseason mode with condensed UI — ~60% time reduction vs Game Night Mode. Key ceremonies still get reveals; minor awards show summary tables.
- **Why deferred:** Game Night Mode (full ceremony experience) is the core v1 offseason. Streamlined Mode is a UX optimization that can come later.
- **Dependencies for v2:** All 13 offseason phases implemented (v1 provides this)
- **Original length:** 10 lines

### 5% Regular Player Trait Lottery
- **Source:** MODE_3 §4.3, line 82
- **What it does:** End-of-season development lottery where 5% of regular (non-award-winning) players receive a trait via wheel spin
- **Why deferred:** Creates too many unfocused wheel spins for players the user may not care about. v1 trait rewards reserved for award winners (60%) and top performers (30%) only.
- **Dependencies for v2:** None — just an additional wheel spin trigger
- **Original length:** 1 line (within §4.3 trait distribution list)

### Custom Stadium Creation
- **Source:** MODE_3 §6.3, line 452
- **What it does:** Option to create custom stadiums during the expansion/stadium change phase
- **Why deferred:** SMB4 doesn't support custom stadiums — the stadium pool is the existing SMB4 stadiums. No basis for this feature.
- **Dependencies for v2:** Custom stadium dimension data (would need to be invented, not SMB4-sourced)
- **Original length:** partial line within §6.3

### Un-Retirement via Draft Class
- **Source:** MODE_3 §7.4 / §9.2, lines 531-551 / 654-688
- **What it does:** Retired players can optionally be re-added to future draft class pools. Pre-Draft Inactive Player Selection screen (original Screen 1 of draft flow) lets user pick returning players.
- **Why deferred:** Novelty feature — retired stays retired in v1. Simplifies retirement as a permanent, meaningful decision.
- **Dependencies for v2:** Retired Player Database (exists in v1)
- **Original length:** 1 line in §7.4 + Screen 1 in §9.2 (2 lines)

### AI-Initiated Trade Proposals
- **Source:** MODE_3 §11.2 (Screens 5–6), lines 824-829
- **What it does:** AI-controlled teams proactively generate trade proposals that the user receives in an inbox. Includes AI Proposal Detail screen for review.
- **Why deferred:** v1 trades are user-initiated only. AI teams respond to user proposals (accept/reject/counter) but do not proactively propose. Reduces AI complexity for v1.
- **Dependencies for v2:** AI trade logic (the 5-factor evaluation exists in v1 for AI responses; needs extension for proactive proposal generation)
- **Original length:** 5 lines (2 screens)

---

## ALMANAC.md Deferred Items

### ALMANAC-D1: Custom Dashboards / Composite Multi-Widget Views
- **Source:** ALMANAC §1 (ruling — High tier custom views)
- **What it does:** Composite dashboard views that combine multiple Almanac widgets (leaderboards, charts, records) into user-designed layouts.
- **Why deferred:** High complexity tier. v1 ships custom views (saved filter presets + column selection) which cover Low + Medium tiers. Dashboards require widget framework, layout persistence, and drag-and-drop composition.
- **Dependencies for v2:** Custom views infrastructure (ships in v1 Phase 7), widget component library

### ALMANAC-D2: Cold Storage Tier
- **Source:** ALMANAC §2 (per Mode 2 §26 SIMPLIFY)
- **What it does:** Tiered storage model where older season data migrates from warm (active IndexedDB) to cold (compressed archive) tier for performance.
- **Why deferred:** Warm tier is sufficient for v1. Cold storage needed only when franchise histories grow large enough to impact query performance (estimated 50+ seasons).
- **Dependencies for v2:** Performance profiling data from v1 usage, storage compression strategy

### ALMANAC-D3: DFA / Waiver / Contract Extension Transaction Types
- **Source:** ALMANAC §3.6 (per Mode 2 §2 SIMPLIFY)
- **What it does:** Three additional transaction types: Designation for Assignment (DFA), waiver wire claims, and contract extensions.
- **Why deferred:** These transaction types are not implemented in v1's Mode 2 engine. The Almanac transaction UI should not expose filter options for types that cannot exist.
- **Dependencies for v2:** Mode 2 transaction type expansion (DFA, waiver, contract_extension)

### ALMANAC-D4: Cross-Franchise Side-by-Side Comparison Dashboards
- **Source:** ALMANAC §7 (Rule 3), §8
- **What it does:** Direct side-by-side franchise comparison views — place two franchise stat tables next to each other for visual comparison.
- **Why deferred:** v1 ships implicit comparison (tagged results in shared leaderboards). Explicit side-by-side requires composite widget views (ALMANAC-D1 dashboards).
- **Dependencies for v2:** ALMANAC-D1 (dashboard framework)

### ALMANAC-D5: SQL-Like Free-Form Query Builder
- **Source:** ALMANAC §8
- **What it does:** Advanced query interface allowing users to write SQL-like queries against Almanac data (e.g., "players with 30+ HR and .300+ AVG in the same season").
- **Why deferred:** Basic filters + custom views (saved presets, column selection) are sufficient for v1. SQL-like queries add significant UX complexity.
- **Dependencies for v2:** Full query engine (ships incrementally in v1), query parser, syntax validation UI

### ALMANAC-D6: Historical "What-If" Queries
- **Source:** ALMANAC §8
- **What it does:** Alternate-timeline simulation queries (e.g., "what if Player X had stayed on Team Y for 3 more seasons?").
- **Why deferred:** Requires alternate-timeline simulation engine that does not exist in v1.
- **Dependencies for v2:** Season simulation engine, stat projection models

### ALMANAC-D7: Almanac Sharing / Screenshots
- **Source:** ALMANAC §8
- **What it does:** Share Almanac views, leaderboards, and player profiles as images or links (social features).
- **Why deferred:** Social/sharing features deferred across all modes in v1.
- **Dependencies for v2:** Image generation from views, sharing URL generation, screenshot capture

### ALMANAC-D8: Franchise Merge
- **Source:** ALMANAC §8
- **What it does:** Merge two separate franchise databases into one combined history.
- **Why deferred:** Would violate per-franchise DB isolation model. Merging requires resolving player identity conflicts (same SMB4 player imported differently), season numbering collisions, and duplicate detection.
- **Dependencies for v2:** Player identity resolution system, merge conflict UI, data deduplication engine

### ALMANAC-D9: 5% Regular Player Trait Lottery (Almanac Display)
- **Source:** ALMANAC §10 (C-086 update) — deferred with Mode 3 §4
- **What it does:** Non-award-winning players have a 5% chance of receiving a personality trait each offseason. The Almanac would display these trait changes in player profiles.
- **Why deferred:** Trait lottery mechanic deferred in Mode 3 §4 SIMPLIFY. Almanac's trait history read layer is source-agnostic — when v2 adds the lottery, those events will display automatically with no Almanac code changes.
- **Dependencies for v2:** Mode 3 5% trait lottery implementation
