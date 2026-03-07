# MODE 2: FRANCHISE SEASON — V1 Triage Draft

## Triage Status
**Document:** MODE_2_FRANCHISE_SEASON_UPDATED.md
**Total Sections:** 28
**Completed:** 28/28 ✅
**Started:** 2026-03-02
**Triage Complete:** 2026-03-03
**Cross-Reference Reconciliation:** PASSED — no blocking conflicts

### Triage Summary
| Ruling | Count | Sections |
|--------|-------|----------|
| KEEP AS-IS | 10 | §3, §5, §6, §12, §16, §17, §21, §23, §28 (appendix) |
| SIMPLIFY | 14 | §1, §2, §4, §7, §8, §9, §10, §11, §13, §14, §15, §18, §20, §22, §24, §26 |
| DEFER ENTIRELY | 3 | §19, §25, §27 |

### Spec Gaps for V1 Draft Consolidation
1. **Fame System canonical section** — no home section for fame (sources in §10.4, §13.6, §14.9, §17, §18; accumulator §8.3)
2. **Random Event Catalog** — §15 has registry architecture but no event catalog
3. **Box score UI on schedule** — tapping completed game should show box score; data exists, needs UI surface
4. **§16.3 INSIDER reveal** — requires Mode 1 hidden player attributes with `revealed` boolean
5. **§20.1 "rest of roster" True Value** — requires Mode 1 salary system; needs proxy if simplified

### Cross-Mode Dependencies for Later Triage
- Mode 1: hidden attributes (§16.3), salary/True Value (§20.1), stadium dimensions (§24.4), pitcher repertoire (§4 v2)
- Mode 3: SeasonSummary handoff contract (§26.3)

---

## Rulings

### §1 — Overview & Mode Definition
**Ruling:** SIMPLIFY
**v1 Scope:**
- §1.1 scope statement: KEEP with "subject to triage" caveat
- §1.2 core paradigm (Record First, Enrich Later): KEEP AS-IS
- §1.3 three event streams: KEEP AS-IS
- §1.4 what Mode 2 receives from Mode 1: KEEP AS-IS
- §1.5 what Mode 2 produces for Mode 3: KEEP all 10 outputs
**v2 Deferred:**
- §1.6 competitive position table: CUT entirely (marketing material)
**JK's Reasoning:** Keep the full handoff list — downstream features get added back if their parent sections survive triage. Competitive position table is not spec content.
**Dependencies Flagged:** None.

---

### §2 — Event Model: The Universal Atom
**Ruling:** SIMPLIFY
**v1 Scope:**
- §2.1 AtBatEvent: KEEP AS-IS — full fat event with all ~45 context fields
- §2.2 BetweenPlayEvent: KEEP AS-IS — all 14 between-play event types
- §2.3 TransactionEvent: SIMPLIFY — keep 8 of 11 types
- §2.4 GameRecord: KEEP AS-IS — including narrative fields
- §2.5 Design Principles: KEEP AS-IS
- Shared enums: KEEP AS-IS

**v1 TransactionEvent types KEEP (8):** trade, free_agent_signing, release, call_up, send_down, draft_pick, retirement, injury_list

**v2 TransactionEvent types DEFER (3):**
- dfa — procedural MLB step, "release with extra steps"
- waiver — procedural, handled as free_agent_signing in v1
- contract_extension — requires multi-year contracts (v2 per Mode 1 §5.3)

**JK's Reasoning:** Event model is the heart of the app — keep it fat. Auto-captured context is zero-cost. Transaction types trimmed to couch franchise play. IL tracking kept for v1 value.
**Dependencies Flagged:** None.

---

### §3 — GameTracker: 1-Tap Recording
**Ruling:** KEEP AS-IS
**v1 Scope:** Everything — Quick Bar (§3.1), 1-tap execution flow with all async hooks (§3.2), undo system (§3.3), end-of-inning auto-detection (§3.4), runner override scenarios (§3.5), "What Was Cut" design history table (§3.6 — kept inline), iPad layout with full Fenway Board (§3.7)
**v2 Deferred:** Nothing
**JK's Reasoning:** Core UX. Keep it all. Dead-letter hooks for deferred systems. Fenway Board keeps full spec.
**Dependencies Flagged:** N/A.

---

### §4 — Enrichment System
**Ruling:** SIMPLIFY
**v1 Scope:**
- §4.1 Philosophy: KEEP AS-IS
- §4.2 Play Log Entry Point: KEEP AS-IS
- §4.3 Enrichment Types: KEEP all 6 (spray chart, fielding sequence, HR distance, pitch type, pitch count per AB, pitch count per half-inning)
- §4.4 Enrichment Timing: KEEP immediate, after game, never
- §4.5 Positional Tracking + IFR: KEEP AS-IS

**v1 KEEPS:** All 6 enrichment types, play log badges as sole entry point, all 9 pitch types (unfiltered), positional tracking, IFR as PO modifier

**v2 DEFERS:**
- Pitch type repertoire filtering (v1 shows all 9 types)
- Between-inning enrichment prompts (play log badges serve this role)

**JK's Reasoning:** All enrichment types earn their place. Repertoire filtering not essential. Between-inning prompts are extra UI.
**Dependencies Flagged:** None.

---

### §5 — Between-Play Events
**Ruling:** KEEP AS-IS
**v1 Scope:** Everything — runner actions: SB, CS, pickoff, WP, PB (§5.1), substitution entry points (§5.2), manager moments with LI threshold + season tracking + mWAR feed (§5.3), pitcher changes with inherited runners (§5.4), position changes for dWAR/Gold Glove (§5.5), mojo & fitness entry point (§5.6)
**v2 Deferred:** Nothing
**JK's Reasoning:** All between-play events serve the couch. Manager moments make the game feel alive. All runner actions are real SMB4 gameplay.
**Dependencies Flagged:** N/A.

---

### §6 — Baseball Rules & Logic
**Ruling:** KEEP AS-IS
**v1 Scope:** Everything — game structure (§6.1), at-bat result types (§6.2), run scoring rules (§6.3), force play chain rule (§6.4), runner advancement defaults + walk/HBP matrix (§6.5), special plays: D3K, IFR, SF, SAC, GRD, tag-up (§6.6), statistical definitions (§6.7), button availability rules (§6.8)
**v2 Deferred:** Nothing
**JK's Reasoning:** Foundational. Without this, nothing works.
**Dependencies Flagged:** N/A.

---

### §7 — Substitution System
**Ruling:** SIMPLIFY
**v1 Scope:**
- §7.1 Sub Types: KEEP 5 of 6 + ADD batting order swap
- §7.2 Entry Points: KEEP both (lineup card + diamond tap)
- §7.3 Pinch Runner Rule: KEEP AS-IS
- §7.4 Pitching Change Flow: KEEP AS-IS
- §7.5 Validation: KEEP AS-IS

**v1 KEEPS:** Pinch hitter, pinch runner, defensive sub, pitching change, position swap, NEW batting order swap, both entry points, all validation rules

**v2 DEFERS:**
- Double switch as single atomic operation (users do pitching change + batting order swap in 2 steps)

**JK's Reasoning:** Double switch as single action is nice but not essential. Batting order swap op gives users the same strategic outcome in 2 steps.
**Dependencies Flagged:** §2.2 'double_switch' type goes dormant per fat-event philosophy.

---

### §8 — Stats Pipeline
**Ruling:** SIMPLIFY
**v1 Scope:**
- §8.1 Four-Layer Architecture: KEEP AS-IS
- §8.2 PlayerGameStats: KEEP AS-IS
- §8.3 PlayerSeasonStats: KEEP AS-IS (all fields, all 13 achievements, fame sub-object)
- §8.4 Accumulation Flow: KEEP AS-IS
- §8.5 Storage Tiers: KEEP tier definitions

**v2 DEFERS:**
- §8.5 storage cost projections (planning material, not build logic)

**JK's Reasoning:** Stats pipeline is the almanac backbone. All 13 achievement types earn their place. Storage projections are reference material.
**Dependencies Flagged:** None.

---

### §9 — Pitcher Stats & Decisions
**Ruling:** SIMPLIFY
**v1 Scope:**
- §9.1 Core Counting Stats: KEEP AS-IS
- §9.2 Innings Pitched: KEEP AS-IS
- §9.3 First Inning Runs: KEEP (trivial — 3 boolean checks)
- §9.4 Inherited Runners: KEEP AS-IS
- §9.5 Win/Loss Decisions: KEEP AS-IS
- §9.6 Save Rules: KEEP AS-IS
- §9.7 Special Achievements: KEEP AS-IS (all 7 functions + all 4 streak types)
- §9.8 Pitch Count: KEEP capture triggers + validation bounds

**v1 KEEPS:** All counting stats, IP formatting, first-inning runs, inherited runners, W/L/SV/HLD/BS, all achievements, all streaks, manual pitch count entry (skippable), validation bounds

**v2 DEFERS:**
- Pitch count estimation system (PITCHES_PER_BATTER_ESTIMATE). v1 requires manual entry with skip option. Graceful degradation: Maddux undetectable, Fenway Board shows blank PC.

**JK's Reasoning:** Don't guess pitch counts — require entry or skip. Everything else earns its place.
**Dependencies Flagged:** Skipped pitch count → Maddux undetectable + blank Fenway PC. Both degrade gracefully.

---

### §10 — Fielding System
**Ruling:** SIMPLIFY
**v1 Scope:**
- §10.1 Fielding Chance Rules: KEEP AS-IS — truth table for which results generate chances
- §10.2 Fielder Inference Matrices: SIMPLIFY — single primary fielder per direction (drop secondary/tertiary probability tiers)
- §10.3 Double Play Chains: KEEP AS-IS — 6 DP codes with credit assignments + direction inference
- §10.4 Star Play Categories & fWAR Impact: KEEP AS-IS — all 8 difficulty tiers (routine through robbed HR) with multipliers + fame
- §10.5 Error Categories: KEEP AS-IS — 5 error types with base penalties, fame, context modifiers, effort error reduction
- §10.6 Run Value Constants: KEEP AS-IS — all base run values + position modifiers
- §10.7 Per-Play fWAR Calculation: KEEP AS-IS — `base × posMod × diffMod × √(LI)` with LI=1.0 fallback if §12 deferred
- §10.8 FieldingPlay Record: KEEP AS-IS — full 20-field interface

**v1 KEEPS:** All fielding chance rules, primary-fielder-only inference, all 6 DP chains, all 8 star play categories, all 5 error types, all run value constants, full fWAR formula (LI-dependent with fallback), full FieldingPlay interface

**v2 DEFERS:**
- Weighted probability fielder inference (secondary/tertiary fielder percentages per direction × play type). v1 uses deterministic primary-only assignment.

**JK's Reasoning:** Star play categories are what make fielding matter — keep all 8. Inference doesn't need probability tiers for v1. fWAR formula keeps LI reference with safe fallback.
**Dependencies Flagged:** §12 Leverage Index not yet triaged — if deferred, LI=1.0 constant plugs into fWAR formula (fielding plays weighted equally regardless of situation).

---

### §11 — WAR System (5 Components)
**Ruling:** SIMPLIFY
**v1 Scope:**
- §11.0 Universal Season Length Scaling: KEEP AS-IS — `runsPerWin = 10 × (seasonGames / 162)`
- §11.1 bWAR (Batting): KEEP AS-IS — wOBA → wRAA → bWAR with SMB4-calibrated weights, replacement level, park factor adjustment
- §11.2 pWAR (Pitching): KEEP AS-IS — FIP-based, starter/reliever replacement blend, leverage multiplier for relievers, IBB exclusion per C-027
- §11.3 fWAR (Fielding): KEEP AS-IS — references §10 per-play calculation + positional adjustments (C: +3.7 through DH: -5.2 per 48g)
- §11.4 rWAR (Baserunning): KEEP AS-IS — wSB (35%) + UBR (50%) + wGDP (15%)
- §11.5 mWAR (Manager): KEEP AS-IS — decision WAR (60%, LI-weighted manager moment outcomes) + overperformance WAR (40%, actual vs expected win%)
- §11.6 Calibration: DEFER TO V2 — multi-season feature, does nothing in season 1

**v1 KEEPS:** All 5 WAR components (bWAR, pWAR, fWAR, rWAR, mWAR) with full formulas, all constants, all sub-components including mWAR overperformance

**v2 DEFERS:**
- WAR Calibration system (post-hoc recalibration after 2+ seasons with minimum data thresholds, blend rates, confidence tracking)

**JK's Reasoning:** All 5 WAR components earn their place — cutting any one makes that dimension invisible in the almanac. mWAR overperformance kept despite Pythagorean dependency. Calibration is inherently multi-season and does nothing in season 1.
**Dependencies Flagged:** §11.2 pWAR and §11.5 mWAR both reference LI (§12, not yet triaged). §11.5 overperformance requires Pythagorean expected win% (§21 standings, not yet triaged).

---

### §12 — Leverage Index & Win Probability
**Ruling:** KEEP AS-IS
**v1 Scope:** Everything — LI definition + 4-tier categorization (§12.1), base-out LI lookup table 8×3 (§12.2), LI calculation with inning multiplier + score dampener (§12.3), SMB4 shorter-game adaptation (§12.4), WPA stored on every AtBatEvent (§12.5)
**v2 Deferred:** Nothing
**JK's Reasoning:** LI is load-bearing for fWAR (§10.7), reliever pWAR (§11.2), mWAR decisions (§11.5), manager moments (§5.3), and clutch (§13). Implementation is lightweight: a 24-value lookup + 2 functions. Earns its place.
**Dependencies Flagged:** N/A. LI=1.0 fallback in §10.7 is now moot — real LI confirmed for v1.

---

### §13 — Clutch Attribution
**Ruling:** SIMPLIFY (with spec correction)
**v1 Scope:**
- §13.1 WPA Core Formula: KEEP AS-IS — `clutchWPA = winProbAfter - winProbBefore`. Pure WPA is the clutch metric.
- §13.2 Contact Quality (CQ): KEEP AS-IS — 10-value scale (0.1–1.0) for attribution split
- §13.3 Attribution by Play Type: KEEP AS-IS — 4 tables distributing WPA credit across batter/pitcher/fielder/catcher/manager using CQ
- §13.4 Arm Factor: KEEP AS-IS — per C-033, `armRating / 100`
- §13.5 Manager Decision Clutch: KEEP AS-IS — auto-detected + user-prompted decisions
- §13.6 Clutch Trigger Stacking: **RELABEL → Fame Trigger Stacking** — stays in §13 (computed at play time alongside WPA/CQ), output routes to §8.3 fame accumulator (see spec correction below)
- §13.7 Playoff Context Multipliers: KEEP AS-IS — playoffs confirmed for v1 (regular 1.0× through WS 2.0×, elimination +0.5, clinch +0.25)
- §13.8 Clutch Stats Interface: KEEP AS-IS — PlayerClutchStats with totalWPA, positiveWPA, negativeWPA, clutchMoments, chokeMoments, gmLI

**v1 KEEPS:** WPA-based clutch measurement, CQ attribution split, all 4 play-type tables, arm factor, manager decision clutch, playoff multipliers, clutch stats interface

**SPEC CORRECTION — §13.6 relabeled + Fame System gap identified:**
§13.6 "Clutch Trigger Stacking" is relabeled to **"Fame Trigger Stacking"** and stays in §13 (computed at play time alongside WPA/CQ). Same table (walk-off +2/+3, grand slam +2, 0-2 count +1), same logic (highest within category, stack across categories), but output routes to §8.3 fame accumulator as Fame Boners — not clutch points. Rationale: WPA already perfectly captures the clutch VALUE of a moment. Trigger stacking measures how LEGENDARY the moment is — that's fame, not performance. Pitcher/fielder/manager get corresponding negative/positive Fame Boners based on their attribution role.

**SPEC GAP IDENTIFIED — Fame System needs a canonical home section:**
Fame is one of the most cross-cutting systems in the app (sources in §10.4, §13.6, §14.9, §17, §18; accumulator in §8.3; consequences in §19, §20, narratives) but has no dedicated section defining: what fame IS, what a Fame Bonus vs Fame Boner is, how sources combine, what thresholds exist, and what fame drives downstream. **Action: add a Fame System section during v1 draft consolidation (post-triage) that serves as the canonical index for all fame sources and mechanics.**

**JK's Reasoning:** WPA is the right tool for clutch — it measures actual game impact. Trigger stacking captures legendary moments that fans remember, which is fame territory. Clean separation: clutch = performance measurement, fame = legendary memory. Fame needs its own home — scattered references aren't enough for a system this important.
**Dependencies Flagged:** Fame System section to be written during v1 draft consolidation.

---

### §14 — Mojo & Fitness System
**Ruling:** SIMPLIFY
**v1 Scope:**
- §14.1 Mojo Levels: KEEP AS-IS — 6-tier scale (Rattled -2 through Jacked +3)
- §14.2 Mojo State Changes: KEEP AS-IS — user-observed input, performance splits by mojo level
- §14.4 Fitness States: KEEP AS-IS — 6 states (Hurt through Juiced) with multipliers + playability
- §14.5 Fitness State Changes: KEEP AS-IS — user-observed input, games at each state, consecutive days off
- §14.7 Juiced State: SIMPLIFY — engine only reads Juiced as a fitness state the user sets. No eligibility checks, no cooldown tracking, no trigger logic. Downstream effects (WAR penalty, fame boner, narrative hooks) still apply.
- §14.8 Injury Tracking: KEEP AS-IS — user-observed fitness state changes
- §14.9 Fame Integration: KEEP AS-IS — Juiced -1 fame/game + 50% credit, mojo modifiers (Rattled +30%, Jacked -20%), playing hurt bonus
- §14.10 WAR & Clutch Adjustments: KEEP AS-IS — WAR multiplier by mojo/fitness, clutch multiplier by mojo
- §14.11 Data Schema: KEEP with Juiced eligibility field trim only — remove `juicedCooldown` and `lastJuicedGame` (eligibility logic). KEEP `gamesAtJuiced` (almanac needs games-at-state tracking for all states including Juiced)

**v1 KEEPS:** All 6 mojo tiers, all 6 fitness states, user-observed input for both, performance splits by mojo/fitness, WAR/clutch/fame multipliers, injury tracking, full downstream effects of Juiced (WAR -15%, fame boner, narrative)

**v2 DEFERS:**
- Juiced eligibility engine (`checkJuicedEligibility()` — Fit requirement + 20-game cooldown + trigger via random event/trait/narrative). v1 treats Juiced as any other fitness state: user sets it, engine reads it.

**JK's Reasoning:** The engine should only read mojo/fitness state and compute downstream effects (WAR, fame, clutch, narrative). No engine-side gatekeeping of what states are allowed. Juiced narrative elements (PED suspicion, beat reporter, fame boner) still fire — they're triggered by the state being set, not by eligibility logic.
**Dependencies Flagged:** §15 Modifier Registry and §17 Dynamic Designations (trait/narrative triggers for Juiced) — moot for v1 since Juiced eligibility is deferred.

---

### §15 — Modifier Registry & Special Events
**Ruling:** SIMPLIFY (with spec gaps flagged)
**v1 Scope:**
- §15.1 Modifier Structure: KEEP AS-IS — generic `Modifier` interface with 7 categories, 3 scopes, 6 triggers, probability, conditions, effects, duration, stacking
- §15.2 Effect System: KEEP AS-IS — `ModifierEffect` interface with 13 effect types × 12 targets
- §15.3 Registry Evaluation: KEEP AS-IS — stacking rules (additive within category, multiplicative across), duration tracking, conflict resolution, ±30% cap
- §15.4 Example Registry Entries: KEEP but STRIP mojo/fitness-setting examples — Hot Streak → Juiced example violates user-observed-only boundary. Replace with compliant examples (stat boosts, trait changes, fame events).
- §15.5 Chemistry-Trait Potency: KEEP AS-IS — 5 chemistry types, 3 potency tiers, team-aggregate mechanic affecting trait power and salary valuation

**v1 KEEPS:** Full modifier registry architecture, effect system, evaluation engine, chemistry-trait potency. Random event generation as engine feature (table-top RPG element).

**HARD BOUNDARY RULE — Random Events (new spec rule):**
Random events CAN modify: stats (STAT_BOOST/PENALTY), traits (TRAIT_GAIN/REMOVE), fame (FAME_BONUS/BONER), morale (MORALE_CHANGE), relationships (RELATIONSHIP_FORM/STRAIN), designations, team-level effects (stadium, manager).
Random events CANNOT modify: mojo state, fitness state, Juiced state. These are ONLY set by user observation from SMB4. Random events layer ON TOP of user-set states, never replace them. The user is the bridge between SMB4 and KBL — the engine never pretends to know what's happening in the game.

**SPEC GAP — Random Event Catalog:**
§15 defines the registry structure and evaluation engine but NOT the specific catalog of random events (what events exist, their probabilities, conditions, effects, and categories). This catalog needs to be scoped — either as a post-triage spec writing task or a dedicated sub-spec. Categories to define: stat boosts/penalties from morale, trait changes from performance + morale, relationship events, life events, team events, fame events, morale shifts.

**JK's Reasoning:** The modifier registry earns its place because the random event system will be rich and varied (table-top RPG element). Chemistry-Trait Potency is critical to salary calculation, true value, and team-building strategy. Hard boundary on mojo/fitness is non-negotiable — engine reads those states, never sets them.
**Dependencies Flagged:** Random Event Catalog needs scoping (post-triage). §15.4 examples need rewriting to comply with mojo/fitness boundary.

---

### §16 — Narrative System
**Ruling:** KEEP AS-IS
**v1 Scope:** Everything — beat reporter entity with 10 hidden personalities (§16.1), personality distribution (§16.2), INSIDER reveal mechanic per C-068 (§16.3), reporter morale influence with 80/20 rule + tenure modifier per C-069 (§16.4), captain storylines per C-067 (§16.5), reporter firing/hiring with probability + 7 triggers (§16.6), LLM routing 50/50 split with local templates + cloud LLM (§16.7), player quotes with 80/20 personality rule (§16.8), narrative data model with 14 types + 8 tones (§16.9), all 4 UI surfaces: X Feed, Tootwhistle Times, Post-Game Summary, Pop-Up Notifications (§16.10)
**v2 Deferred:** Nothing
**JK's Reasoning:** Ship with full LLM integration from the start — routing architecture is clean, LLM calls don't touch game state, failure falls back to template. INSIDER reveal is low code cost. Reporter firing adds unpredictability. All 4 UI surfaces earn their place.
**Dependencies Flagged:** §16.3 INSIDER reveal requires Mode 1 to have hidden player attributes with `revealed` boolean — dependent on Mode 1 triage.

---

### §17 — Dynamic Designations
**Ruling:** KEEP AS-IS
**v1 Scope:** Everything — Team MVP with WAR criteria + min games (§17.1), Ace with pWAR criteria + min 0.5 (§17.2), Fan Favorite with positive Value Delta + carryover (§17.3), Albatross with negative Value Delta + 15% trade discount per C-056 + carryover (§17.4), Cornerstone from prev MVP + FA retention bonus (§17.5), Team Captain per C-057 with Loyalty+Charisma + doubled Charisma + narrative amplification per C-067 (§17.6), Fan Hopeful per C-047 from top-3 farm prospects + +5 playerMorale (§17.7), badge visual design with 7 color specs + projected/locked borders (§17.8), DesignationChangeEvent with 5% suppression (§17.9), in-season fan morale effects per C-055 with 5 designation types × situational triggers (§17.10), establishment multiplier per C-055 with season progress × playoff status 5-tier table (§17.11), Cornerstone baseline bonus +3/+1.5/cap 8 (§17.12), full data schema with PlayerDesignationStatus 17 fields + TeamDesignationState 14 fields (§17.13), Player Morale system with 5 states (Ecstatic→Demoralized) + 17 input factors + sustained-threshold rating change suggestions surfaced via narrative (§17.14)
**v2 Deferred:** Nothing
**JK's Reasoning:** Keep all as-is. All 7 designation types, full player morale system, establishment multiplier, and data schemas earn their place in v1.
**Dependencies Flagged:** N/A.

---

### §18 — Milestone System
**Ruling:** SIMPLIFY
**v1 Scope:**
- §18.1 Adaptive Threshold Scaling: KEEP AS-IS — dual-factor (season × innings), 3 scaling types (counting, innings, none), MilestoneConfig interface
- §18.2 Single-Game Milestones: KEEP AS-IS — 11 positive (Perfect Game through Maddux) + 8 negative (Golden Sombrero through 0-for-5+), celebration tiers
- §18.3 Season Milestones: KEEP AS-IS — batting clubs (30-30/40-40/50-50/.400/Triple Crown) scaled by opportunityFactor, min floor of 10, 4 WAR-based tiers (no scaling)
- §18.4 Career Milestones: SIMPLIFY — fixed floor thresholds only (pre-scaled MLB baselines). Career HR floors (11 tiers), career WAR (9 tiers, scaled by opportunityFactor per C-065), awards (no scaling). Drop dynamic top-10% calculation.
- §18.5 Franchise Firsts & Leaders: KEEP AS-IS — first-to-achieve fame bonus, leader tracking at game 4, qualification minimums (25 PA, 20 IP)
- §18.6 Legacy Status Tiers: DEFER TO V2 — 3 tiers (Cornerstone/Icon/Legend) require multi-season same-team evaluation
- §18.7 Team Milestones: KEEP AS-IS — 6 team achievements with fame + fan morale effects, trade aftermath playerMorale effects
- §18.8 Milestone Data Structures: KEEP AS-IS — MilestoneDefinition + AchievedMilestone interfaces

**v1 KEEPS:**
- Adaptive threshold scaling (dual-factor, 3 scaling types)
- All 19 single-game milestones (11 positive, 8 negative) with celebration tiers
- All season milestones (batting clubs, WAR tiers) with min floor of 10
- Career milestones using fixed floor thresholds only
- Franchise firsts & leader tracking
- All 6 team milestones
- Both data structure interfaces

**v2 DEFERS:**
- Dynamic top-10% career threshold calculation (requires 10+ completed careers in franchise history; v1 uses fixed floors only)
- Legacy Status Tiers (Franchise Cornerstone/Icon/Legend — multi-season same-team evaluation, invisible in season 1)

**JK's Reasoning:** Unlikely to play 10+ seasons in one franchise, so dynamic thresholds are academic. Legacy tiers are invisible in season 1 — defer. Min floor of 10 for scaled milestones is good data integrity, keep it.
**Dependencies Flagged:** No downstream systems break — fixed floors work independently; narrative/almanac can omit legacy tier references without issue.

---

### §19 — Fan Favorite & Albatross Trade Mechanics
**Ruling:** DEFER ENTIRELY
**v1 Scope:** Nothing from this section.
**v2 Deferred:** Albatross 15% trade discount (§19.1), Fan Favorite amplified trade morale penalty (§19.2), Fan Favorite designation carryover to acquiring team (§19.2).
**SPEC CORRECTION:** §19.2 states Fan Favorite designation carries over to acquiring team on trade. Per JK ruling: **No — designations never carry over on trade.** Season-to-season carryover in §17.3/§17.4 ("until 10% of new season") is unaffected — that refers to year-over-year, not trade transfers.
**JK's Reasoning:** This shouldn't be its own section. The core concept — fan morale effects from trading players — belongs as a subsection of §20 Fan Morale, and should apply broadly based on True Value (not just designated players). A low True Value player traded should improve fan morale; a player outperforming his contract should hurt it. Since v1 has no salary matching for trades and no AI trade logic, the Albatross discount has nothing to apply to. Defer entirely.
**Dependencies Flagged:** §20 Fan Morale already has trade morale entries (acquire star +8, trade away star -10, salary dump -8) that survive independently. §17/§18 trade aftermath playerMorale effects also survive. No downstream breaks.

---

### §20 — Fan Morale System
**Ruling:** SIMPLIFY (spec correction to formula + trade scrutiny simplification)
**v1 Scope:**
- §20.1 Core Formula: KEEP with REVISED WEIGHTS — 50% team performance + 20% designated player performance + 10% rest of roster (True Value-based) + 10% beat reporter sentiment + 10% random events
- §20.2 Fan Morale Scale: KEEP AS-IS — 0-99, 7 states (Euphoric→Hostile), FanMorale interface with trend/streak/riskLevel
- §20.3 Event Catalog: KEEP AS-IS — all game result, streak, trade, roster, and milestone events
- §20.4 Contextual Modifiers: KEEP AS-IS — performance vs expectations (×0.5–×1.5), timing modifiers
- §20.5 Trade Scrutiny System: KEEP but ensure logic is simple to code — 14-game tracking window with evolving verdict, amplified morale during scrutiny, affects both fanMorale and playerMorale
- §20.6 Morale Decay & Recovery: KEEP AS-IS — natural drift toward baseline, 1-2 pts/series, momentum amplification
- §20.7 Franchise Health Warning (C-084): KEEP AS-IS — WARNING below 25, CRITICAL below 10, with FA/morale/narrative consequences + EOS modifier
- §20.8 Consequences of Morale: KEEP AS-IS — player morale coupling, FA attractiveness per C-093, narrative tone
- §20.9 Fan Morale Data Model: KEEP AS-IS — TeamFanMorale (15 fields) + MoraleEventType (27 types)

**SPEC CORRECTION — Revised Core Formula (§20.1):**
Old weights: 60% performance gap, 20% designations, 10% beat reporter, 10% roster/random
New weights: 50% team performance, 20% designated player performance, 10% rest of roster, 10% reporter, 10% random events

The "rest of roster" factor (10%) is NEW — absorbs the True Value-based trade morale concept from deferred §19. Fan morale effects from trades should apply broadly based on True Value delta (not just star/non-star). Trading a low True Value player should improve fan morale; trading a player outperforming his contract should hurt it. This replaces the §19 designation-only approach with a roster-wide True Value lens that lives natively in fan morale.

**v1 KEEPS:** Everything — revised formula weights, all 7 fan states, full event catalog, contextual modifiers, trade scrutiny (kept simple), decay/recovery, franchise health warning, player morale coupling, FA attractiveness, data model

**v2 DEFERS:** Nothing

**JK's Reasoning:** Keep trade scrutiny but ensure logic is simple to code. Integrate §19's concept into fan morale directly — the 60/20/10/10 split becomes 50/20/10/10/10 to give the rest of roster (True Value-based) its own weight factor. This is the proper home for trade morale effects.
**Dependencies Flagged:** "Rest of roster" factor requires True Value calculation from salary system (Mode 1 dependency). If salary system is simplified in Mode 1 triage, this factor needs a simpler proxy.

---

### §21 — Standings & Playoffs
**Ruling:** KEEP AS-IS
**v1 Scope:** Everything — division structure with Standings + StandingsEntry interfaces (17 fields including pythagoreanWinPct, magicNumber, eliminationNumber, playoffStatus) + 7-value PlayoffStatus enum (§21.1), tiebreakers via run differential then user prompt (§21.2), fully configurable playoff bracket from Mode 1 rules preset with series lengths 1/3/5/7/9 + higher seed home-field + reseeding (§21.3), magic number / elimination number calculation functions (§21.4), standings recompute after every completed game with clinch/elimination triggering fan morale + narrative (§21.5)
**v2 Deferred:** Nothing
**JK's Reasoning:** Straightforward baseball standings math. Pythagorean win% stays (load-bearing for mWAR overperformance). User-prompt tiebreaker is on-brand. All keeps.
**Dependencies Flagged:** N/A.

---

### §22 — Schedule System
**Ruling:** SIMPLIFY (spec corrections for v1 no-AI constraint)
**v1 Scope:**
- §22.1 Schedule (C-079): KEEP AS-IS — user-provided + editable, ScheduledGame interface (10 fields), all in-season editing (add/edit/swap/move/remove). Each game tied to a fictional calendar date (GameDate). GameStatus enum trimmed: SCHEDULED, IN_PROGRESS, COMPLETED, SKIPPED (SIMULATED removed).
- §22.2 Auto-Pull Logic: KEEP AS-IS — getNextScheduledGame function
- §22.3 Game Buttons: REVISED — NO SIMULATE button in v1. Every game shows "SCORE" (opens GameTracker for manual entry) or "SKIP" (marks SKIPPED). Applies to ALL games including AI-vs-AI matchups. User can score games between any teams or skip them.
- §22.4 Season Classification: DEFER TO V2 — without AI simulation every season is PRIMARY by definition. Enum is meaningless in v1.
- §22.5 Game Increment: KEEP AS-IS — auto-increment gameNumber
- §22.6 Trade Deadline Enforcement: KEEP AS-IS — deadline = totalGames × timing fraction, trades rejected after deadline, UI disables trade interface, narrative triggers at -7/at/after. All game thresholds in deadline logic scaled for season length.

**v1 KEEPS:**
- Full schedule management (user-provided, editable, fictional calendar dates)
- Auto-pull next game
- "Score" and "Skip" buttons for all games (no SIMULATE)
- Game increment logic
- Trade deadline enforcement with narrative triggers (scaled for season length)

**v2 DEFERS:**
- SIMULATE button and AI game simulation logic (§22.3 — requires §25 AI Game Engine)
- Season Classification enum PRIMARY/MIXED/SIMULATED (§22.4 — meaningless without simulation)
- SIMULATED value in GameStatus enum (dormant in type definition per fat-event philosophy)

**SPEC CORRECTION — §22.3 button logic rewritten for v1:**
Old: User games → "SCORE GAME", AI games → "SIMULATE"
New: ALL games → "SCORE" (opens GameTracker) or "SKIP" (marks SKIPPED). No simulation in v1. User is the bridge for all game results — they can score any matchup manually or skip it.

**JK's Reasoning:** No AI logic for gameplay in v1. User can score games played between AI teams or skip them, but nothing should be simulated. Each game tied to fictional calendar date. Trade deadline stays. Everything involving game thresholds scaled for season length.
**Dependencies Flagged:** §25 AI Game Engine (not yet triaged) confirmed v2 — SIMULATE removal is consistent.

---

### §23 — Adaptive Standards Engine
**Ruling:** KEEP AS-IS
**v1 Scope:** Everything — opportunity factor with dual-factor calculation (gameFactor × inningsFactor) + calculateOpportunityFactor + calculateScalingFactors functions (§23.1), scaling rules table for 8 stat types (counting, pitcher counting, rate, per-9, games played, PA/IP qualification, career WAR per C-065, season WAR) (§23.2), SMB4 static defaults (leagueAVG .288, OBP .340, SLG .445, ERA 4.04, wOBA .329 per C-058, wOBAScale 1.7821 per C-058, FIPConstant 3.28 per C-059, runsPerWin 10 scaled, replacement level constants) (§23.3), qualification thresholds (getQualifyingPA 3.1 PA/game scaled, getQualifyingIP 1 IP/game scaled) (§23.4), minimum floors (6 values, universalFloor 10) (§23.5), position-specific adjustments (9-position multiplier table C 1.20 through DH 0.85) (§23.6)
**v2 Deferred:** Nothing
**JK's Reasoning:** Most load-bearing utility section in the spec — pure math, no UI, everything depends on it. Keep all of it as-is.
**Dependencies Flagged:** N/A.

---

### §24 — Stadium Analytics & Park Factors
**Ruling:** SIMPLIFY
**v1 Scope:**
- §24.1 ParkFactors interface: KEEP all fields MINUS exit velocity references (removed from spray chart record — can't observe in SMB4)
- §24.2 Activation & confidence blending: KEEP AS-IS — 40% activation floor, 3-tier confidence (LOW 70/30 seed/calc, MEDIUM 30/70, HIGH 0/100), simple weighted average blend
- §24.3 Calculation formula: KEEP AS-IS — standard park factor math `(homeStatRate / homeG) / (roadStatRate / roadG)`
- §24.4 Seed park factors: KEEP AS-IS — SMB4 stadium dimensions from BillyYank Guide (avg distance → HR, wall height → HR adj, foul territory → AVG adj)
- §24.5 Spray chart system: KEEP — 7 zones, all fields except exit velocity. Heat map visualization with filters: per-player, per-team, pitcher matchup
- §24.6 Stadium records: KEEP AS-IS — single-game records, HR distance by zone, career records at stadium, team records. Record-breaking feeds narrative
- §24.7 WAR integration: KEEP AS-IS — park-adjusted home stats, unadjusted road, multi-team weighted adjustments per stint

**v1 KEEPS:**
- Full ParkFactors interface (17 fields minus exit velocity)
- 3-tier confidence blending with 40% activation floor
- Standard park factor calculation formula
- Seed factors from SMB4 stadium dimensions
- Spray chart: 7 zones, zone/distance/angle/outcome/handedness per batted ball
- Spray chart heat map visualization with per-player, per-team, and pitcher-matchup filters
- All stadium record types with narrative feed
- WAR park factor adjustment

**v2 DEFERS:**
- Exit velocity field on spray chart record (can't observe in SMB4; potential v2 enrichment if modeled from hit type + landing zone)

**JK's Reasoning:** Keep spray chart visualization with filters — data model supports it natively (AtBatEvent has batterId, pitcherId, spray zone), filters are just query parameters on stored data. Stadium records are almanac flavor, keep. Confidence blending is simple arithmetic with a games-played floor. Exit velocity removed — can't track in SMB4.
**Dependencies Flagged:** No downstream breaks — exit velocity was optional enrichment, nothing references it.

---

### §25 — AI Game Engine (Per C-048 / C-082)
**Ruling:** DEFER ENTIRELY
**v1 Scope:** Nothing from this section.
**v2 Deferred:**
- Full AI Game Engine: probability model, at-bat resolution, SimRoster/SimPlayer/AIGameEngine/SimulationOptions interfaces (§25.1–§25.3)
- Seeded PRNG for reproducible simulation (§25.4)
- Variance configuration (§25.5)
- Simulated game output contract with `source: 'SIMULATED'` (§25.6)
- Unsimulate capability (§25.7)
- All 4 TypeScript interfaces stripped from codebase until v2 build begins

**JK's Reasoning:** No simulation in v1 — all games are manually scored or skipped (per §22 ruling). No "simplified box-score generator" needed either. Box scores for played games are a display surface for data already captured by GameTracker + Stats Pipeline, not a simulation feature. Strip all interfaces until v2.
**Dependencies Flagged:** §22 SIMULATE button already deferred. §22.4 season classification already deferred. No new downstream breaks.
**Spec Gap Flagged:** Box score view as explicit UI entry point on schedule (tapping completed game → shows box score). Data exists via §2.4 GameRecord + §8 Stats Pipeline; needs explicit UI surface. Resolve in cross-reference reconciliation.

---

### §26 — Franchise Data Flow
**Ruling:** SIMPLIFY
**v1 Scope:**
- §26.1 Event flow overview diagram: KEEP AS-IS — architectural reference summarizing flows defined in §2–§24. Costs nothing, helps developers orient. No new logic.
- §26.2 Storage tiers: KEEP Hot and Warm tiers only — Hot (IndexedDB, current game + active season, always loaded), Warm (IndexedDB, season history + career stats + park factors, loaded on demand)
- §26.3 Mode 2 → Mode 3 handoff: KEEP — SeasonSummary interface with `seasonClassification` field removed (always PRIMARY in v1). Copy-not-reference rule per C-076 stays.

**v1 KEEPS:**
- Full data flow diagram (§26.1) as architectural reference
- Hot + Warm storage tiers (§26.2)
- SeasonSummary handoff interface minus `seasonClassification` (§26.3)
- Copy-not-reference handoff rule (C-076)

**v2 DEFERS:**
- Cold storage tier (user-initiated multi-season archive export — unscoped feature, not needed for v1)
- `seasonClassification` field on SeasonSummary (always PRIMARY in v1 per §22.4 deferral)

**JK's Reasoning:** §26.3 handoff contract is the only genuinely new artifact — it's where the Mode 2 → Mode 3 boundary is defined and isn't specified elsewhere. Diagram is free reference material. Cold export tier is an unscoped feature. Simplify per recommendation.
**Dependencies Flagged:** Mode 3 triage will reference SeasonSummary interface from §26.3.

---

### §27 — V2 / Deferred Material
**Ruling:** DEFER ENTIRELY (remove from v1 spec)
**v1 Scope:** Nothing. Section dropped.
**v2 Deferred:** The entire section — a summary table of 11 deferred features. Table is stale (still references "simplified box-score generator" per pre-triage §25 language) and would be a maintenance burden to keep in sync.
**JK's Reasoning:** V2_DEFERRED_BACKLOG.md is now the authoritative, comprehensive deferral record maintained throughout triage. §27's summary table is redundant and already out of date.
**Dependencies Flagged:** None — pure reference material, nothing depends on it.

---

### §28 — Decision Traceability
**Ruling:** KEEP AS-IS (appendix)
**v1 Scope:** Everything — main table (23 applied C-decisions with section references), cross-cutting decisions table (3 entries), decisions-not-in-scope table (8 entries routed to Mode 1/Mode 3). Kept as a non-build appendix for provenance and debugging ("why does §13 do it this way?" → C-025).
**v2 Deferred:** Nothing
**JK's Reasoning:** Pure traceability record, zero code cost. No equivalent exists elsewhere. Keep as appendix.
**Dependencies Flagged:** N/A.

---

## MODE 2 TRIAGE COMPLETE

All 28 sections triaged. Next step: cross-reference reconciliation pass.
