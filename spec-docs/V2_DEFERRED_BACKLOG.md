# V2 Deferred Backlog — KBL Tracker

**Generated:** 2026-03-05
**Source:** Phase B assembly from triage rulings

---

## MODE 2: Franchise Season

### §1.6 — Competitive Position Table
- **Source:** MODE_2_FRANCHISE_SEASON_UPDATED.md, lines 104-116
- **What it does:** Marketing comparison table showing KBL vs competitors (GameChanger, iScore, Lazy Guys) on taps-per-play, franchise depth, SMB4 context, and enrichment model.
- **Why deferred:** Not spec content — marketing material that doesn't drive implementation.
- **Dependencies for v2:** None.
- **Original length:** 13 lines

### §2.3 — TransactionEvent Deferred Types
- **Source:** MODE_2_FRANCHISE_SEASON_UPDATED.md, lines 402-458
- **What it does:** Three transaction event types removed from the type union: `dfa` (designated for assignment — procedural MLB step), `waiver` (procedural, handled as free_agent_signing in v1), `contract_extension` (requires multi-year contracts, v2 per Mode 1 §5.3).
- **Why deferred:** Procedural MLB mechanics not needed for couch franchise play. Contract extensions require multi-year contract system.
- **Dependencies for v2:** Mode 1 §5.3 multi-year contracts (for contract_extension).
- **Original length:** 3 type values within §2.3 interface

### §4 — Enrichment System Deferrals
- **Source:** MODE_2_FRANCHISE_SEASON_UPDATED.md, lines 672-753
- **What it does:** Two enrichment features deferred: (1) Pitch type repertoire filtering — v1 shows all 9 pitch types rather than filtering by pitcher's known repertoire from League Builder. (2) Between-inning enrichment prompt screen — v1 users enrich via play log badges; no dedicated between-inning prompt screen.
- **Why deferred:** Repertoire filtering requires Mode 1 pitcher repertoire data linkage. Between-inning prompts are extra UI when play log badges serve the same role.
- **Dependencies for v2:** Mode 1 pitcher repertoire data (for filtering).
- **Original length:** 1 line removed (repertoire filtering reference)

### §7.1 — Double Switch (Atomic Operation)
- **Source:** MODE_2_FRANCHISE_SEASON_UPDATED.md, line 950
- **What it does:** Double switch as a single atomic operation — pitcher + fielder replaced by reliever + position player in one step, with automatic batting order adjustment.
- **Why deferred:** Users achieve the same strategic result via pitching change + batting order swap in 2 steps. Single atomic operation is convenience, not functionality.
- **Dependencies for v2:** Batting order swap operation (added in v1 §7.1).
- **Original length:** 1 table row + implicit logic

### §8.5 — Storage Cost Projections
- **Source:** MODE_2_FRANCHISE_SEASON_UPDATED.md, line 1120
- **What it does:** Per-event and per-game storage cost estimates with league-wide projections by team/game count. Reference to Mode 1 §13.3 for full projections.
- **Why deferred:** Planning/reference material, not build logic. Tier definitions kept.
- **Dependencies for v2:** None.
- **Original length:** 1 line (paragraph)

### §9.8 — Pitch Count Estimation System
- **Source:** MODE_2_FRANCHISE_SEASON_UPDATED.md, lines 1280-1288
- **What it does:** PITCHES_PER_BATTER_ESTIMATE lookup table estimating pitch counts when user doesn't provide them, based on outcome type and starter/reliever role.
- **Why deferred:** v1 requires manual entry with skip option rather than guessing. Graceful degradation: Maddux undetectable, Fenway Board shows blank PC.
- **Dependencies for v2:** None.
- **Original length:** 9 lines (header + code block)

### §10.2 — Weighted Probability Fielder Inference
- **Source:** MODE_2_FRANCHISE_SEASON_UPDATED.md, lines 1312-1339
- **What it does:** Secondary and tertiary fielder probability assignments per direction × play type (e.g., Ground Ball Left: 65% 3B, 25% SS, 10% P). v1 uses deterministic primary-only assignment.
- **Why deferred:** Primary-fielder-only inference is sufficient for v1. Probability tiers add simulation fidelity but aren't needed for user-observed fielding credit.
- **Dependencies for v2:** None.
- **Original length:** Probability percentages removed from 2 tables + 1 text reference

### §11.6 — WAR Calibration System
- **Source:** MODE_2_FRANCHISE_SEASON_UPDATED.md, lines 1580-1589
- **What it does:** Post-hoc recalibration of WAR calculations after 2+ seasons with minimum data thresholds (10,000 PA batting / 500 IP pitching), blend rates (30%/70% new/baseline), and confidence tracking.
- **Why deferred:** Multi-season feature that does nothing in season 1. Requires accumulated franchise history.
- **Dependencies for v2:** 2+ completed seasons of franchise data.
- **Original length:** 10 lines

### §14.7 — Juiced Eligibility Engine
- **Source:** MODE_2_FRANCHISE_SEASON_UPDATED.md, lines 1855-1870
- **What it does:** `checkJuicedEligibility()` function requiring Fit fitness state + 20-game cooldown expiry. Trigger methods: Random Event "Hot Streak" (5 games), trait trigger, narrative event.
- **Why deferred:** v1 treats Juiced as any other fitness state: user sets it, engine reads it. No engine-side gatekeeping. Downstream effects (WAR -15%, fame boner, narrative) still fire — triggered by state being set, not by eligibility logic.
- **Dependencies for v2:** §15 Modifier Registry (for random event triggers), §17 Dynamic Designations (trait triggers).
- **Original length:** 12 lines (method table + function)

### §14.11 — Juiced Cooldown/Tracking Fields
- **Source:** MODE_2_FRANCHISE_SEASON_UPDATED.md, lines 1933-1934
- **What it does:** `lastJuicedGame` and `juicedCooldown` fields in PlayerMojoFitness interface for tracking 20-game cooldown between Juiced states.
- **Why deferred:** Cooldown tracking meaningless without eligibility engine. `gamesAtJuiced` kept for almanac.
- **Dependencies for v2:** §14.7 Juiced eligibility engine.
- **Original length:** 2 lines (interface fields)

### §15.4 — Mojo/Fitness-Setting Random Event Examples
- **Source:** MODE_2_FRANCHISE_SEASON_UPDATED.md, lines 2033-2051
- **What it does:** Example registry entry (HOT_STREAK) that sets fitness state to Juiced via random event, violating the user-observed-only boundary for mojo/fitness states.
- **Why deferred:** Replaced with v1-compliant example (stat boost). v1 hard boundary: random events cannot modify mojo, fitness, or Juiced state. These are only set by user observation from SMB4.
- **Dependencies for v2:** §14.7 Juiced eligibility engine, Random Event Catalog.
- **Original length:** 19 lines (code block)

### §18.4 — Dynamic Top-10% Career Threshold Calculation
- **Source:** MODE_2_FRANCHISE_SEASON_UPDATED.md, lines 2610-2621
- **What it does:** Primary career milestone threshold calculated from franchise history after 10+ completed careers. Uses `calculateTop10Percentile()` with `getEffectiveThreshold()` taking the more demanding of dynamic vs fixed floor.
- **Why deferred:** Requires 10+ completed careers in franchise history — academic for early franchise play. v1 uses fixed floor thresholds only.
- **Dependencies for v2:** Accumulated franchise career history (10+ completed careers).
- **Original length:** 12 lines (description + code block)

### §18.6 — Legacy Status Tiers
- **Source:** MODE_2_FRANCHISE_SEASON_UPDATED.md, lines 2638-2647
- **What it does:** Three legacy tiers (Franchise Cornerstone 2+ seasons/5+ WAR, Franchise Icon 3+/10+/1 award, Franchise Legend 5+/18+/2 awards/HOF) with fame bonuses (+2.0/+4.0/+8.0). Same-team WAR only, evaluated at season end, persists after retirement.
- **Why deferred:** Multi-season same-team evaluation — invisible in season 1.
- **Dependencies for v2:** Multi-season career tracking per team.
- **Original length:** 10 lines

### §19 — Fan Favorite & Albatross Trade Mechanics
- **Source:** MODE_2_FRANCHISE_SEASON_UPDATED.md, lines 2698-2726
- **What it does:** Albatross 15% trade discount (§19.1) and Fan Favorite amplified trade morale penalty with designation carryover to acquiring team (§19.2). **Spec Correction:** Designations never carry over on trade — season-to-season carryover in §17.3/§17.4 is unaffected.
- **Why deferred:** Core concept (fan morale from trades based on True Value) relocated to §20 as "rest of roster" factor. Albatross discount has nothing to apply to without AI trade logic and salary matching. §19 as standalone section was misplaced — belongs as subsection of fan morale.
- **Dependencies for v2:** AI trade logic, salary matching system.
- **Original length:** 29 lines

### §22.3 — SIMULATE Button + AI Game Simulation
- **Source:** MODE_2_FRANCHISE_SEASON_UPDATED.md, lines 2952-2958
- **What it does:** SIMULATE button for AI-controlled games that runs the AI Game Engine (§25) to resolve games between non-user teams.
- **Why deferred:** No AI game engine in v1. All games are manually scored or skipped by the user.
- **Dependencies for v2:** §25 AI Game Engine.
- **Original length:** 7 lines (rewritten, not removed)

### §22.4 — Season Classification
- **Source:** MODE_2_FRANCHISE_SEASON_UPDATED.md, lines 2960-2968
- **What it does:** `SeasonClassification` type enum (PRIMARY/MIXED/SIMULATED) classifying seasons by percentage of manually-played games (75%+, 25-74%, <25%).
- **Why deferred:** Without simulation, every season is PRIMARY by definition. Enum is meaningless.
- **Dependencies for v2:** §25 AI Game Engine (SIMULATE button).
- **Original length:** 9 lines

### §24.5 — Exit Velocity on Spray Chart Record
- **Source:** MODE_2_FRANCHISE_SEASON_UPDATED.md, line 3174
- **What it does:** Optional exit velocity field on each batted ball spray chart record.
- **Why deferred:** Can't observe exit velocity in SMB4. Potential v2 enrichment if modeled from hit type + landing zone.
- **Dependencies for v2:** None (optional enrichment).
- **Original length:** 3 words removed from spray chart description

### §25 — AI Game Engine (Per C-048 / C-082)
- **Source:** MODE_2_FRANCHISE_SEASON_UPDATED.md, lines 3186-3278
- **What it does:** Full AI game simulation engine: probability model for at-bat resolution, SimRoster/SimPlayer/AIGameEngine/SimulationOptions interfaces (§25.1-§25.3), seeded PRNG for reproducibility (§25.4), variance configuration (§25.5), simulated game output contract with `source: 'SIMULATED'` (§25.6), unsimulate capability (§25.7).
- **Why deferred:** No simulation in v1 — all games manually scored or skipped. No "simplified box-score generator" needed either (box scores are display surfaces for GameTracker + Stats Pipeline data).
- **Dependencies for v2:** None (self-contained engine). Activates §22.3 SIMULATE button.
- **Original length:** 93 lines

### §26.2 — Cold Storage Tier
- **Source:** MODE_2_FRANCHISE_SEASON_UPDATED.md, line 3341
- **What it does:** User-initiated export of multi-season archives and franchise history to external storage.
- **Why deferred:** Unscoped feature not needed for single-season v1.
- **Dependencies for v2:** Multi-season franchise history.
- **Original length:** 1 table row

### §26.3 — seasonClassification Field
- **Source:** MODE_2_FRANCHISE_SEASON_UPDATED.md, line 3358
- **What it does:** `seasonClassification: SeasonClassification` field on SeasonSummary interface classifying the season as PRIMARY/MIXED/SIMULATED.
- **Why deferred:** Always PRIMARY in v1 (per §22.4 deferral — no simulation).
- **Dependencies for v2:** §22.4 Season Classification, §25 AI Game Engine.
- **Original length:** 1 interface field line

### §27 — V2 / Deferred Material (Summary Table)
- **Source:** MODE_2_FRANCHISE_SEASON_UPDATED.md, lines 3365-3384
- **What it does:** Summary table of 11 deferred features from the original gospel. Now stale and redundant with this backlog.
- **Why deferred:** V2_DEFERRED_BACKLOG.md is the authoritative, comprehensive deferral record. §27's table was already out of date (referenced "simplified box-score generator" from pre-triage language).
- **Dependencies for v2:** None (reference material only).
- **Original length:** 20 lines

