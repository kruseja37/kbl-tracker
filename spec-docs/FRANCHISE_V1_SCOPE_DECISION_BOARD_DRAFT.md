# Franchise v1 Scope Decision Board Draft

This document is a draft recommendation artifact for user review. It is not a final Franchise v1 scope lock, not an implementation roadmap, and not a set of implementation prompts.

Every "Codex recommendation" below is intentionally reviewable. The user can approve, modify, reject, or send any item to discussion before any scope is locked.

Source documents used:

- `spec-docs/FRANCHISE_REPO_IMPLEMENTATION_INVENTORY.md`
- `spec-docs/FRANCHISE_SPEC_REQUIREMENTS_LEDGER.md`
- `spec-docs/FRANCHISE_REPO_SPEC_CROSSWALK.md`

## 1. Executive summary

This is a draft, not final v1 scope.

Proposed v1 philosophy: make Franchise v1 trustworthy before making it maximal. The core v1 loop should prioritize a playable scoped franchise save, Mode 1 handoff, regular-season schedule, GameTracker scoring, persistent events/stats, standings, playoffs, season summary, roster/farm mechanics that are already coherent, and a safe season transition. Rich systems should be included only where they are already stable, simplified where they support the core loop, preview/read-only where they are interesting but not mutation-safe, and deferred where they would make v1 brittle or incoherent.

This draft does not assume every canonical spec feature belongs in v1. It also does not defer core-loop essentials merely because they are difficult. Items marked `Needs user decision` or with a suggested `discuss` decision are the places where the repo/spec tradeoff is most consequential.

## Recommendation vocabulary

- `Must include in v1`: Codex recommendation is that v1 will feel broken or untrustworthy without this.
- `Include if already stable`: Codex recommendation is to keep existing stable behavior, but avoid expanding scope beyond proven behavior.
- `Simplify for v1`: Codex recommendation is to ship a narrower coherent version instead of the full spec surface.
- `Preview/read-only for v1`: Codex recommendation is to expose insight without committing durable state changes.
- `Guard/defer for v1`: Codex recommendation is to keep hidden, disabled, or non-user-facing for v1 unless the user overrides.
- `Post-v1`: Codex recommendation is to keep out of v1 scope.
- `Needs user decision`: Codex recommendation is uncertain or product-defining enough that the user should choose before scope lock.

Items with `Needs user decision` should be treated as `discuss` until the user chooses otherwise. The `FVB-D###` heading on each item is its Decision ID.

## 2. Decision board

### Mode 1 setup / handoff

#### FVB-D001 - Franchise setup and save-slot handoff

- Requirement IDs covered: FSR-001, FSR-002, FSR-014, FSR-017, FSR-020, FSR-021
- Feature/subsystem: Six-step franchise setup, copied franchise-owned player/team data, franchise metadata, initial handoff into Mode 2.
- Current repo status summary: Mostly complete. Setup is wired; franchise-owned players/teams/config/schedule are written; franchise home launches with scoped data.
- Spec expectation summary: Mode 1 creates an isolated franchise save slot from global templates and hands a snapshot to Mode 2.
- Codex recommendation: Must include in v1.
- Confidence: high
- Rationale: This is the spine of Franchise v1. Without a trustworthy copy-not-reference franchise slot, every later feature is suspect.
- Consequence of including: v1 has a coherent start point and protects global template data from active-franchise changes.
- Consequence of deferring: Franchise v1 becomes a collection of screens rather than a durable mode.
- Dependencies: League/team/player template data, franchise manager metadata, schedule setup choice, storage scoping.
- Test confidence: high for setup/init/scope based on existing setup, initializer, scope, and save-slot manifest tests.
- Recommended reasoning level for future implementation: high
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D002 - Franchise type and team control semantics

- Requirement IDs covered: FSR-003, FSR-056, FSR-061, FSR-073
- Feature/subsystem: Solo, Couch Co-Op, Custom, selected human teams, AI score-entry/simulation expectations, phase-scope defaults.
- Current repo status summary: Partial. Users can select controlled teams, but exact Solo/Couch/Custom semantics and per-team `controlledBy` behavior are not proven complete.
- Spec expectation summary: Franchise type controls experience layer, team ownership, AI score-entry, and offseason phase scope.
- Codex recommendation: Simplify for v1.
- Confidence: medium
- Rationale: v1 likely needs controlled teams and clear game launch behavior, but does not need the full multiplayer/phase-scope matrix unless the user wants Couch Co-Op to be a first-class v1 promise.
- Consequence of including: The user understands which games require scoring and which teams are controlled.
- Consequence of deferring: AI-vs-AI and multi-team leagues become ambiguous, especially if simulation stays guarded.
- Dependencies: Schedule completion policy, AI/simulation decision, offseason phase ownership.
- Test confidence: medium; setup tests exist, but full franchise-type semantics are not proven.
- Recommended reasoning level for future implementation: high
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D003 - League, team, roster, and rules template baseline

- Requirement IDs covered: FSR-004, FSR-005, FSR-009, FSR-012
- Feature/subsystem: League Builder templates, team records, roster assignments, rules presets used by franchise setup.
- Current repo status summary: Mostly complete to partial. CRUD/editorial surfaces exist; full CSV validation, all rule toggles, and all structural constraints are not proven.
- Spec expectation summary: Users can create/edit reusable global league/team/rules/roster templates before starting a franchise.
- Codex recommendation: Include if already stable.
- Confidence: medium
- Rationale: v1 needs enough template data to start a real franchise, but not every import/validation edge has to be scope-critical.
- Consequence of including: Franchises can be started from meaningful user-created or seeded leagues.
- Consequence of deferring: Setup becomes too thin and may rely on brittle fixtures.
- Dependencies: Franchise initializer, roster analyzer, rules snapshot, schedule setup.
- Test confidence: medium; template storage/editor behavior exists, but exact spec breadth is not fully verified by the crosswalk.
- Recommended reasoning level for future implementation: medium
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D004 - Player import, generation, traits, and hidden personality depth

- Requirement IDs covered: FSR-006, FSR-007, FSR-008, FSR-086
- Feature/subsystem: Player editor/import/generation, ratings/grades, visible personality, hidden modifiers, traits, chemistry, fame, salary.
- Current repo status summary: Partial. Visible player fields and grade/salary engines exist; exact CSV import, hidden modifiers, full generation biases, and behavior hints are incomplete or unproven.
- Spec expectation summary: Players have rich identity, ratings, traits, personality, hidden modifiers, chemistry, fame, salary, and roster level before franchise handoff.
- Codex recommendation: Simplify for v1.
- Confidence: medium
- Rationale: v1 needs coherent visible player data and computed grades/salaries; hidden personality mechanics can easily overbuild the setup surface before downstream systems can use them.
- Consequence of including: Franchise rosters feel real enough for gameplay, stats, salary, and awards.
- Consequence of deferring: Full personality/narrative downstream systems should not claim completeness.
- Dependencies: Salary, draft, farm reveal, relationships, narrative, morale.
- Test confidence: medium for grade/salary engines; low for hidden personality contract.
- Recommended reasoning level for future implementation: high
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D005 - Schedule setup contract

- Requirement IDs covered: FSR-013, FSR-021, FSR-056, CAR-008
- Feature/subsystem: Franchise initial schedule creation, manual schedule editing, CSV/OCR/manual/empty schedule choice.
- Current repo status summary: Overbuilt/drifted. Repo auto-generates a full schedule at franchise creation; manual add/delete exists later; CSV/OCR and empty-start setup are not proven.
- Spec expectation summary: Schedule is user-driven through CSV, screenshot/OCR, manual entry, or empty start.
- Codex recommendation: Needs user decision.
- Confidence: low
- Rationale: This is a direct spec/repo mismatch. Auto-generation may be useful for v1, but it conflicts with the canonical setup wording and affects simulation, standings, trade deadline, and season length expectations.
- Consequence of including: v1 can start seasons quickly, but may need user-approved scope language that treats auto-generation as a v1 simplification or default.
- Consequence of deferring: Users may be unable to start a practical season unless manual schedule creation is clearly enough.
- Dependencies: Franchise initializer, schedule storage, standings, simulation, trade deadline, import/export.
- Test confidence: high for franchise-scoped schedule storage; low for canonical setup/import behavior.
- Recommended reasoning level for future implementation: xhigh
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D006 - Optional startup fantasy/prospect draft and abbreviated Playoff Mode setup

- Requirement IDs covered: FSR-010, FSR-011, FSR-015
- Feature/subsystem: Fantasy draft roster construction, startup prospect draft, playoff-only franchise creation path.
- Current repo status summary: Prototype/non-franchise or partial. Draft-like screens and playoff operations exist, but startup draft handoff and separate Playoff Mode creation are not proven.
- Spec expectation summary: Optional setup variants allow draft-built rosters, prospect farms, or direct playoff starts.
- Codex recommendation: Post-v1.
- Confidence: medium
- Rationale: These are valuable setup variants but not necessary for the first trustworthy full-season loop.
- Consequence of including: v1 gains setup flexibility but increases initialization and roster correctness risk.
- Consequence of deferring: v1 uses existing rosters and normal franchise start, which is simpler but less flexible.
- Dependencies: Player generation, farm salary/reveal, draft logic, playoff storage.
- Test confidence: low for franchise startup mutation; medium/high for playoff operations after setup.
- Recommended reasoning level for future implementation: high
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

### Mode 2 regular season / GameTracker

#### FVB-D007 - Franchise Home, schedule display, and scored-game launch

- Requirement IDs covered: FSR-001, FSR-002, FSR-030, FSR-055, FSR-056
- Feature/subsystem: Franchise Home shell, next/upcoming games, scoped schedule, GameTracker launch with franchise rosters and identity.
- Current repo status summary: Implemented and wired. Franchise Home loads config/schedule/standings/playoff/offseason state; score-game launch passes franchise identity and rosters.
- Spec expectation summary: Mode 2 is the season hub and routes user-controlled games into GameTracker.
- Codex recommendation: Must include in v1.
- Confidence: high
- Rationale: This is the day-to-day entry point for the playable franchise loop.
- Consequence of including: Users can continue a season from the franchise dashboard and score games against scoped rosters.
- Consequence of deferring: GameTracker may work in isolation but Franchise mode would not feel playable.
- Dependencies: Setup handoff, roster storage, schedule storage, GameTracker identity.
- Test confidence: high based on FranchiseHome launch and roster tests.
- Recommended reasoning level for future implementation: high
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D008 - Core GameTracker event model and one-tap scoring

- Requirement IDs covered: FSR-019, FSR-027, FSR-031, FSR-032, FSR-033, FSR-034, FSR-040
- Feature/subsystem: At-bat events, one-tap outcome recording, undo, runner defaults/corrections, baseball rules.
- Current repo status summary: Implemented and wired with meaningful tests. Event log writes at-bats and game state commits outcomes.
- Spec expectation summary: Every at-bat produces durable event-sourced state, with fast core scoring and optional later correction/enrichment.
- Codex recommendation: Must include in v1.
- Confidence: high
- Rationale: The scored game is the atomic unit of Franchise v1. Stats, standings, archives, WPA, milestones, and almanac all depend on it.
- Consequence of including: v1 has a trustworthy manual scoring foundation.
- Consequence of deferring: Nothing downstream can be trusted.
- Dependencies: Game state hook, event log, rules logic, storage, stats aggregation.
- Test confidence: high for core event and persistence pathways; some baseball edge cases may still need targeted audit outside this decision board.
- Recommended reasoning level for future implementation: xhigh
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D009 - Between-play events, substitutions, pitcher changes, and user-observed mojo/fitness

- Requirement IDs covered: FSR-028, FSR-037, FSR-038, FSR-039, FSR-041, FSR-048
- Feature/subsystem: Runner actions, substitutions, pitching changes, manager moments, mojo/fitness/injury state changes.
- Current repo status summary: Mostly complete for GameTracker event surfaces; mojo/fitness engines are wired to GameTracker, while full long-term franchise effects are limited.
- Spec expectation summary: Non-at-bat baseball actions are recorded as ordered events and feed stats, inherited runners, mWAR, and player state.
- Codex recommendation: Simplify for v1.
- Confidence: medium
- Rationale: v1 should preserve game correctness for pitcher/substitution/runner actions, but should not promise the full long-term modifier ecosystem.
- Consequence of including: Scored games can handle realistic in-game management without corrupting stats.
- Consequence of deferring: Pitcher decisions, substitutions, and runner events become unreliable.
- Dependencies: GameTracker UI, stats pipeline, pitch counts, manager WPA, mojo/fitness display.
- Test confidence: medium/high for existing event paths; lower for complete spec breadth.
- Recommended reasoning level for future implementation: high
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D010 - Active-game autosave, resume, completion, and archive

- Requirement IDs covered: FSR-020, FSR-030, FSR-042, FSR-060
- Feature/subsystem: Current game snapshot, refresh recovery, completed-game archive, Game Detail/Almanac consumption.
- Current repo status summary: Implemented and wired. Active-game save/load/resume, completed archive, game detail, and almanac queries have test coverage.
- Spec expectation summary: Current games survive refresh and completed games become durable historical records.
- Codex recommendation: Must include in v1.
- Confidence: high
- Rationale: A long-running franchise must not lose games. This is a trust feature, not polish.
- Consequence of including: Users can safely score real games over multiple sessions.
- Consequence of deferring: v1 becomes fragile and unsuitable for real use.
- Dependencies: Game storage, GameTracker identity, processCompletedGame, almanac registration.
- Test confidence: high for current-game and completed-game persistence.
- Recommended reasoning level for future implementation: high
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D011 - Regular-season skipped games, batch operations, and season completion

- Requirement IDs covered: FSR-055, FSR-056, FSR-060
- Feature/subsystem: Skip game, batch skip, season completion detection, schedule statuses.
- Current repo status summary: Skip game is implemented and wired; batch skip exists but visibility is ambiguous; season completion detection is wired.
- Spec expectation summary: Schedule games have statuses and season state progresses after resolved games.
- Codex recommendation: Include if already stable.
- Confidence: medium
- Rationale: Manual skip is useful for v1, but batch operations should not bypass trustworthy stat/standings expectations unless proven.
- Consequence of including: Users can move through non-scored games without simulation.
- Consequence of deferring: Seasons may become tedious if every unresolved game blocks progress.
- Dependencies: Schedule storage, standings, season summary, simulation decision.
- Test confidence: medium; schedule logic is tested, batch visibility is less certain.
- Recommended reasoning level for future implementation: medium
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D012 - AI-vs-AI regular-season simulation

- Requirement IDs covered: FSR-056, FSR-059
- Feature/subsystem: SIMULATE button, simplified box-score generator, synthetic game factory, unsimulate expectations.
- Current repo status summary: Guarded/blocked. Synthetic simulation code and overlay exist, but franchise UI access is disabled by a v1 guard and enabled-flow tests were not found.
- Spec expectation summary: AI-vs-AI games can be simulated in v1 with a simplified generator; full AI Game Engine is deferred.
- Codex recommendation: Needs user decision.
- Confidence: low
- Rationale: If v1 supports single-human-team league play with full schedules, some safe way to resolve AI games may be essential. If v1 is manual-score/skip-first, simulation can remain guarded.
- Consequence of including: Franchise seasons can progress with AI teams producing stat-bearing results, but trust risk is high.
- Consequence of deferring: v1 may require manual skip or user scoring for non-human games, making the season loop thinner.
- Dependencies: Schedule control semantics, stat aggregation, GameRecord shape, milestones, standings, archive.
- Test confidence: low for enabled franchise flow.
- Recommended reasoning level for future implementation: xhigh
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D013 - Standings, playoff qualification, tiebreaks, and trade deadline

- Requirement IDs covered: FSR-055, FSR-056
- Feature/subsystem: Standings table, run differential/tiebreak behavior, magic/elimination, playoff status, trade deadline enforcement.
- Current repo status summary: Standings are implemented and wired; exact magic/elimination/tiebreak and trade deadline behavior are not fully proven in the crosswalk.
- Spec expectation summary: Standings recompute after games and feed playoffs, clinch/elimination, and deadline blocking.
- Codex recommendation: Simplify for v1.
- Confidence: medium
- Rationale: Basic standings and playoff eligibility should be v1; advanced clinch math and user tiebreak prompts can be narrower unless already stable.
- Consequence of including: Users can understand season race and playoff seeding.
- Consequence of deferring: Playoff handoff and season meaning become murky.
- Dependencies: Schedule results, league structure, playoff settings, simulation/skip policy.
- Test confidence: medium for standings; low/unknown for every advanced tiebreak/deadline detail.
- Recommended reasoning level for future implementation: high
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

### Mode 2 stats / WPA / awards / leaders

#### FVB-D014 - Stats pipeline, season leaders, career/almanac registration

- Requirement IDs covered: FSR-018, FSR-019, FSR-042, FSR-043, FSR-060
- Feature/subsystem: Game stats, season aggregation, leaders, career/almanac player registration.
- Current repo status summary: Implemented and wired. End-game stat pipeline, season leaders, completed-game archive, and almanac queries are tested.
- Spec expectation summary: Events flow into game, season, career, display, and almanac stats.
- Codex recommendation: Must include in v1.
- Confidence: high
- Rationale: Statistics are the payoff for scoring games and the basis for awards, leaders, standings context, and history.
- Consequence of including: Franchise games produce durable season and historical value.
- Consequence of deferring: v1 would feel like an exhibition scorer, not a franchise mode.
- Dependencies: GameTracker events, season storage, almanac registration, player/team identity.
- Test confidence: high for current aggregation/archive paths.
- Recommended reasoning level for future implementation: high
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D015 - LI/WPA, clutch, manager WPA, and Game Detail audit surfaces

- Requirement IDs covered: FSR-038, FSR-046, FSR-047
- Feature/subsystem: Win probability, leverage, clutch attribution, manager WPA/mWAR-adjacent tracking, Game Detail charts/audits.
- Current repo status summary: Implemented and wired with strong test coverage for LI/WPA and manager value systems.
- Spec expectation summary: WPA/LI are stored on events and drive clutch, manager decisions, top moments, and audit displays.
- Codex recommendation: Include if already stable.
- Confidence: high
- Rationale: This is deeper than minimum franchise, but it is already one of the stronger implemented areas and adds distinctive value.
- Consequence of including: v1 feels smarter and gives users meaningful post-game analysis.
- Consequence of deferring: Core franchise still works, but loses one of the repo's best-developed differentiators.
- Dependencies: Event log, game state, Game Detail, manager decision derivation.
- Test confidence: high for existing paths.
- Recommended reasoning level for future implementation: medium
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D016 - WAR, fielding precision, pitching achievements, and advanced stat calibration

- Requirement IDs covered: FSR-043, FSR-044, FSR-045, FSR-057, FSR-058
- Feature/subsystem: pWAR/bWAR/fWAR/rWAR/mWAR, fielding inference, achievements, park-adjusted and adaptive-calibrated WAR.
- Current repo status summary: Partial to mostly complete depending on sub-area. Several engines and tests exist, but full five-component persistence/calibration and park-adjusted integration are not proven.
- Spec expectation summary: WAR components are derived from events/stats, scaled to SMB4 season context, and used in awards/designations/salary.
- Codex recommendation: Simplify for v1.
- Confidence: medium
- Rationale: v1 should display trustworthy existing WAR/advanced stats, but should avoid claiming complete calibrated spec parity across every component.
- Consequence of including: Awards/leaders and player evaluation have useful depth.
- Consequence of deferring: v1 can still run, but player value systems become less meaningful.
- Dependencies: Stats pipeline, fielding enrichment, park factors, adaptive standards, salary, awards.
- Test confidence: medium; engines are tested, complete franchise integration is less certain.
- Recommended reasoning level for future implementation: xhigh
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D017 - Awards, dynamic designations, True Value, and ROI leaderboards

- Requirement IDs covered: FSR-023, FSR-051, FSR-053, FSR-064, FSR-083
- Feature/subsystem: MVP/Ace/Fan Favorite/Albatross/Cornerstone/Captain/Fan Hopeful, awards candidates, value delta, ROI.
- Current repo status summary: Partial. Engines and pieces exist, but complete franchise UI/storage/carryover and full award/designation mutation are not proven.
- Spec expectation summary: Designations update in-season, lock at season end, influence morale/narrative/salary/trades, and feed awards.
- Codex recommendation: Preview/read-only for v1.
- Confidence: medium
- Rationale: These systems are high-flavor but cross-cutting. Read-only or summary-style presentation is safer than durable status changes if carryover is incomplete.
- Consequence of including: v1 gains player identity and award race flavor.
- Consequence of deferring: Season stats remain solid but the world feels less alive.
- Dependencies: WAR, salary/True Value formula decision, fan morale, narrative, awards ceremony.
- Test confidence: medium/low for full franchise lifecycle.
- Recommended reasoning level for future implementation: xhigh
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D018 - Salary formula and salary recalculation

- Requirement IDs covered: FSR-065, FSR-082, FSR-083, FSR-084, FSR-085, CAR-005
- Feature/subsystem: Salary calculator, grade/rating-based salary, offseason salary adapter, True Value formula conflicts, payroll morale.
- Current repo status summary: Mostly complete for salary engine and ratings/salary adapter; partial for full trigger schedule, True Value, FA integration, and payroll morale.
- Spec expectation summary: Salary reflects ratings, position, age, traits, performance, fame, personality, and offseason triggers.
- Codex recommendation: Simplify for v1.
- Confidence: medium
- Rationale: Salary should exist as a visible roster/evaluation baseline, but real-time triggers and conflicting True Value formulas need user choice before lock.
- Consequence of including: Offseason and roster decisions have economic stakes.
- Consequence of deferring: Free agency, awards, value designations, and Phase 11 lose important context.
- Dependencies: Grade engine, season stats, awards, free agency, draft, fan morale.
- Test confidence: high for salary calculator pieces; medium/low for full franchise trigger lifecycle.
- Recommended reasoning level for future implementation: xhigh
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

### Mode 2 narrative / milestones / morale / flavor

#### FVB-D019 - Reporter/news/game stories as flavor layer

- Requirement IDs covered: FSR-025, FSR-050
- Feature/subsystem: Reporter storage, commentary feed, game stories, news board, post-game columns.
- Current repo status summary: Partial but meaningfully implemented. Reporter/commentary/story storage exists, with franchise summary and carryover gaps.
- Spec expectation summary: Beat reporters, storylines, quotes, and narrative surfaces persist and influence morale/identity.
- Codex recommendation: Include if already stable.
- Confidence: medium
- Rationale: Existing read surfaces can enrich v1 without needing the full LLM routing, hidden reporter personality, or morale influence lifecycle.
- Consequence of including: v1 feels less sterile and gives completed games narrative context.
- Consequence of deferring: Core loop works, but Franchise loses much of its intended personality.
- Dependencies: Completed-game archive, reporter storage, narrative carryover, morale if enabled.
- Test confidence: medium for storage/surfaces; low for full cross-season behavior.
- Recommended reasoning level for future implementation: high
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D020 - Milestones, Fame, franchise firsts, and franchise leader persistence

- Requirement IDs covered: FSR-052, FSR-063, FSR-089
- Feature/subsystem: Milestone detection, Fame effects, milestone watch, franchise first/leader storage.
- Current repo status summary: Partial. Milestone detection and Fame aggregation exist; franchise first/leader storage is stubbed/no-op.
- Spec expectation summary: Milestones cover single-game, season, career, franchise firsts/leaders, team milestones, and Fame/morale effects.
- Codex recommendation: Needs user decision.
- Confidence: low
- Rationale: Basic milestone detection may be worth including, but franchise firsts/leaders are explicitly not durable yet. The user should decide whether v1 needs franchise-history milestones or only lighter alerts/summaries.
- Consequence of including: v1 can celebrate historical moments and strengthen Almanac value, if persistence is made trustworthy.
- Consequence of deferring: The franchise can still play, but long-term identity/history feels thinner.
- Dependencies: Stats pipeline, almanac, Fame, narrative, fan/player morale.
- Test confidence: medium for detection; low for franchise first/leader persistence.
- Recommended reasoning level for future implementation: xhigh
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D021 - Fan morale and player morale

- Requirement IDs covered: FSR-024, FSR-054, FSR-078, FSR-084
- Feature/subsystem: Team fan morale, player morale, payroll expectations, morale carryover, roster/farm morale effects.
- Current repo status summary: Implemented but not wired. Fan morale engine exists; Team Hub and season summaries show placeholder or excluded fan morale behavior.
- Spec expectation summary: Morale is durable franchise state affected by performance, designations, reporters, roster moves, payroll, and events.
- Codex recommendation: Guard/defer for v1.
- Confidence: medium
- Rationale: Morale touches too many systems to half-commit. A placeholder or read-only flavor state is safer than a persistent morale engine that users cannot reason about.
- Consequence of including: v1 gains emotional stakes for roster and season decisions, but risk of incoherent hidden effects is high.
- Consequence of deferring: Franchise is more mechanical, but avoids misleading consequences.
- Dependencies: Designations, salary/payroll, reporters, free agency, farm movement, season summary.
- Test confidence: low for durable franchise lifecycle.
- Recommended reasoning level for future implementation: xhigh
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D022 - Relationships, chemistry, hidden personality effects, and trait potency

- Requirement IDs covered: FSR-008, FSR-022, FSR-049, FSR-076, FSR-080, FSR-086, FSR-087, CAR-003
- Feature/subsystem: Relationship storage/engine, chemistry potency, hidden personality effects, trait strength, farm/cross-level relationships.
- Current repo status summary: Implemented but not wired. Engines/storage/hooks exist, but active franchise UI uses in-memory relationship data and chemistry/farm tabs are placeholder.
- Spec expectation summary: Relationships and chemistry persist across roster changes and influence salary, gameplay, morale, narrative, and farm recommendations.
- Codex recommendation: Guard/defer for v1.
- Confidence: medium
- Rationale: The engine is promising, but franchise persistence and formula conflicts need resolution before durable gameplay effects should ship.
- Consequence of including: v1 gains rich interpersonal strategy, but may introduce invisible or inconsistent modifiers.
- Consequence of deferring: Trait/personality remains mostly visible flavor until the system is coherent.
- Dependencies: Player personality, roster movement, salary, morale, narrative, trade/free agency.
- Test confidence: medium for engine-level tests; low for active franchise wiring.
- Recommended reasoning level for future implementation: xhigh
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D023 - Stadium analytics, park factors, and adaptive standards

- Requirement IDs covered: FSR-026, FSR-057, FSR-058, FSR-088, CAR-006
- Feature/subsystem: Park factor seed/refinement, stadium analytics, spray charts, adaptive thresholds, park-adjusted WAR.
- Current repo status summary: Implemented but not wired or partial. Park factor/adaptive engines exist; franchise stadium analytics and season summary integration are placeholder/incomplete.
- Spec expectation summary: Stadium factors are seeded/refined, affect adjusted stats/WAR, and appear in analytics/records.
- Codex recommendation: Preview/read-only for v1.
- Confidence: medium
- Rationale: Stadium identity can be visible, but calculated park factors and adaptive WAR should not be mutation-critical until the seed/refinement conflict is resolved.
- Consequence of including: v1 gains analytical flavor and better context for stat comparisons.
- Consequence of deferring: Stats remain simpler and less park-aware.
- Dependencies: Stadium data, batted-ball enrichment, WAR, season summaries, Almanac.
- Test confidence: low/medium for full franchise integration.
- Recommended reasoning level for future implementation: xhigh
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D024 - Special modifier registry and farm/injury event depth

- Requirement IDs covered: FSR-048, FSR-049, FSR-081
- Feature/subsystem: Modifier registry, special events, farm mechanical events, farm injuries, stat/rating/personality/trait changes.
- Current repo status summary: Partial to missing. Mojo/fitness engines exist; broad farm mechanical event system is missing.
- Spec expectation summary: Special effects are represented as modifiers; farm players can receive mechanical events and injuries that carry forward.
- Codex recommendation: Post-v1.
- Confidence: medium
- Rationale: This is a broad event-generation layer that depends on morale, relationships, narrative, injuries, and farm persistence.
- Consequence of including: v1 becomes much richer but much harder to verify.
- Consequence of deferring: v1 remains focused on games, stats, rosters, and safe transitions.
- Dependencies: Narrative, farm state, morale, relationship effects, modifier storage, injury rules.
- Test confidence: low for broad farm mechanical events.
- Recommended reasoning level for future implementation: xhigh
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

### Mode 2 playoffs

#### FVB-D025 - Playoff bracket, launch, series advancement, stats, and leaders

- Requirement IDs covered: FSR-015, FSR-055, FSR-056, FSR-060, FSR-063
- Feature/subsystem: Playoff seeding, bracket storage, playoff GameTracker launch, series advancement, playoff stats/leaders.
- Current repo status summary: Implemented and wired. Playoff storage, GameTracker launch, bracket advancement, stats, and leaders have meaningful tests.
- Spec expectation summary: Mode 2 supports configurable playoffs, playoff scoring, advancement, and postseason results.
- Codex recommendation: Must include in v1.
- Confidence: high
- Rationale: Playoffs are already strong and make the season loop feel complete.
- Consequence of including: v1 supports a satisfying season finish and postseason archive.
- Consequence of deferring: Regular season loses payoff, and offseason champion handoff becomes weaker.
- Dependencies: Standings, playoff settings, GameTracker, playoff storage, season summary.
- Test confidence: high for current playoff operations.
- Recommended reasoning level for future implementation: high
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D026 - Abbreviated Playoff Mode entry point

- Requirement IDs covered: FSR-015
- Feature/subsystem: Starting directly into playoffs without full regular-season setup.
- Current repo status summary: Partial. Playoff operations inside a franchise are strong; separate abbreviated creation path is not proven.
- Spec expectation summary: Playoff Mode is an optional abbreviated franchise creation flow.
- Codex recommendation: Post-v1.
- Confidence: medium
- Rationale: This is a useful mode variant but not necessary if v1's primary promise is full-season franchise play.
- Consequence of including: Users can run bracket-only experiences.
- Consequence of deferring: v1 stays focused; playoff functionality still exists after a season.
- Dependencies: Setup wizard, seeding UI, team control, playoff storage.
- Test confidence: low for separate setup path; high for playoff operations.
- Recommended reasoning level for future implementation: medium
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D027 - Postseason MVP, champion Fame, and playoff narrative rewards

- Requirement IDs covered: FSR-063, FSR-064, FSR-089
- Feature/subsystem: Champion counts, postseason MVP, Fame bonuses, postseason narrative/milestones.
- Current repo status summary: Partial. Playoff results/stats exist, but complete postseason award/Fame/narrative mutation is not proven.
- Spec expectation summary: Season-end processing recognizes champion, postseason MVP, Fame changes, and playoff highlights.
- Codex recommendation: Simplify for v1.
- Confidence: medium
- Rationale: v1 should record champion and show postseason leaders; full Fame/narrative mutation can wait unless already safe.
- Consequence of including: Playoff finish has ceremony and historical meaning.
- Consequence of deferring: Championship feels statistically recorded but less celebratory.
- Dependencies: Playoff stats, season summary, awards, milestones, Fame.
- Test confidence: medium/low for full reward lifecycle.
- Recommended reasoning level for future implementation: high
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

### Mode 3 offseason

#### FVB-D028 - Canonical offseason phase model

- Requirement IDs covered: FSR-061, FSR-073, CAR-001
- Feature/subsystem: Offseason phase count, naming, order, optional phases, phase-to-tab mapping.
- Current repo status summary: Partial/ambiguous. Offseason state machine exists, but specs disagree on 11 vs 13 phases and repo maps some phases to placeholders or unrelated tabs.
- Spec expectation summary: Mode 3 processes season end, awards, salary, expansion, retirement, FA, draft, trades, finalization, and advance.
- Codex recommendation: Needs user decision.
- Confidence: low
- Rationale: This is a scope-shaping decision. The user should choose the canonical v1 phase list before any roadmap or implementation prompts exist.
- Consequence of including: v1 gets a clear offseason contract and avoids mismatched tabs.
- Consequence of deferring: Offseason scope remains ambiguous and future work may chase the wrong phase model.
- Dependencies: Awards, salary, retirement, FA, draft, trades, Phase 11, season summary.
- Test confidence: medium for state shell; low for canonical phase completeness.
- Recommended reasoning level for future implementation: xhigh
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D029 - Season-end summary and Mode 2 -> Mode 3 handoff

- Requirement IDs covered: FSR-021, FSR-060, FSR-063, FSR-073
- Feature/subsystem: Season summary snapshot, standings/playoff/stats archive, handoff into offseason.
- Current repo status summary: Implemented and wired with placeholders for awards, milestones, fan morale, narrative, park factors, and adaptive standards.
- Spec expectation summary: Mode 2 produces a copy-not-reference SeasonSummary with core results and derived systems for offseason.
- Codex recommendation: Must include in v1.
- Confidence: high
- Rationale: The transition from season to offseason is core-loop infrastructure, even if derived sections are simplified.
- Consequence of including: Users can complete a season and see durable historical summary.
- Consequence of deferring: Multi-season franchise is not credible.
- Dependencies: Schedule completion, playoffs, stats, almanac, offseason state.
- Test confidence: high for current summary/handoff; lower for derived placeholder systems.
- Recommended reasoning level for future implementation: high
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D030 - Awards ceremony and awards mutation

- Requirement IDs covered: FSR-023, FSR-064, FSR-065
- Feature/subsystem: Awards ceremony, leaders, award selection, trait/rating/Fame consequences.
- Current repo status summary: Partial/ambiguous. Awards Ceremony UI exists, but candidate source and franchise-owned correctness are not proven.
- Spec expectation summary: Awards process league leaders, major awards, trait/reward assignments, penalties, and summary/ceremony modes.
- Codex recommendation: Preview/read-only for v1.
- Confidence: medium
- Rationale: Awards are important flavor, but durable trait/rating/Fame mutation should wait until candidate sourcing and downstream effects are trustworthy.
- Consequence of including: Users get ceremony flavor and postseason recognition.
- Consequence of deferring: Offseason feels more utilitarian.
- Dependencies: Stats, WAR, designations, salary recalculation, trait system, Fame.
- Test confidence: low/medium for full franchise-owned awards behavior.
- Recommended reasoning level for future implementation: high
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D031 - Ratings and salary adjustment phase

- Requirement IDs covered: FSR-065, FSR-082, FSR-084
- Feature/subsystem: Offseason ratings/salary adapter, grade/salary recalculation, salary summaries.
- Current repo status summary: Implemented and wired for ratings/salary adapter; exact full triple-recalc lifecycle is incomplete.
- Spec expectation summary: Salaries and related baselines recalculate at defined offseason points and reflect ratings/performance/fame/traits.
- Codex recommendation: Include if already stable.
- Confidence: high
- Rationale: This is one of the mutation-capable offseason systems and gives the offseason a real consequence without inventing a new flow.
- Consequence of including: Players and payroll can evolve between seasons.
- Consequence of deferring: Offseason becomes mostly archival rather than transformative.
- Dependencies: Salary formula decision, season stats, awards, Phase 11.
- Test confidence: high for current adapter; medium for full spec sequence.
- Recommended reasoning level for future implementation: high
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D032 - Retirement, retirement ceremony preview, jerseys, and HOF

- Requirement IDs covered: FSR-067, FSR-068, FSR-077
- Feature/subsystem: Retirement dry-run/apply, ceremony preview, jersey retirement, HOF museum.
- Current repo status summary: Retirement dry-run, selected-player apply, and ceremony preview are wired; jersey/HOF flows are optional or uncertain.
- Spec expectation summary: Retirement creates empty slots, tracks retirees, can support jersey retirement and separate manual HOF museum.
- Codex recommendation: Simplify for v1.
- Confidence: medium
- Rationale: Retirement is a useful offseason mutation, but v1 should keep it explicit and user-confirmed rather than full probability/ceremony/HOF scope.
- Consequence of including: Rosters change and offseason has stakes.
- Consequence of deferring: Multi-season continuity loses a major aging/turnover mechanism.
- Dependencies: Farm/Phase 11 fill logic, almanac, salary, morale if enabled.
- Test confidence: high for current retirement adapter; low/medium for full ceremony/HOF scope.
- Recommended reasoning level for future implementation: high
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D033 - Free agency mutation

- Requirement IDs covered: FSR-069, FSR-085, CAR-004
- Feature/subsystem: Protection, dice assignment, destination, return packages, roster movement, transaction history.
- Current repo status summary: Preview/read-only. Franchise free agency adapter performs dry-run exposure preview and rejects apply/commit.
- Spec expectation summary: FA runs two rounds, moves players, returns matching value, and records transactions.
- Codex recommendation: Needs user decision.
- Confidence: low
- Rationale: FA is central to a full offseason, but current repo behavior is explicitly non-mutating and valuation specs conflict. The user should decide whether v1 needs simplified FA mutation or read-only preview.
- Consequence of including: Offseason has meaningful roster churn, but the implementation must be narrow and valuation rules must be chosen.
- Consequence of deferring: Offseason may feel incomplete, especially after retirements create roster gaps.
- Dependencies: Salary/True Value formula, personality, transaction log, roster movement, Phase 11.
- Test confidence: high for dry-run guard; low for mutation because it does not exist.
- Recommended reasoning level for future implementation: xhigh
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D034 - Annual draft mutation

- Requirement IDs covered: FSR-070, FSR-011, FSR-075, CAR-013
- Feature/subsystem: Draft class generation, picks, farm writes, released/undrafted retirements, rookie salary/scouting.
- Current repo status summary: Preview/read-only. Franchise draft adapter shows readiness preview and rejects apply/commit.
- Spec expectation summary: Annual draft generates prospects, orders teams, commits picks, and fills rosters/farms.
- Codex recommendation: Needs user decision.
- Confidence: low
- Rationale: Draft is also central to multi-season renewal, but the current system is advisory only and draft-generation specs conflict.
- Consequence of including: v1 can replenish farms and support retirements/roster gaps.
- Consequence of deferring: Multi-season loop relies mostly on existing rosters and manual/finalize correction.
- Dependencies: Player generation, farm storage, rookie salary, scouting/reveal, Phase 11.
- Test confidence: high for dry-run guard; low for mutation.
- Recommended reasoning level for future implementation: xhigh
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D035 - Offseason trades

- Requirement IDs covered: FSR-029, FSR-053, FSR-071, FSR-079, FSR-085, CAR-018
- Feature/subsystem: Trade market, proposals, accept/counter/reject, roster movement, chemistry preview, revenge arcs.
- Current repo status summary: Preview/read-only with ambiguous visible wiring. Trade adapter dry-runs and rejects apply/commit.
- Spec expectation summary: Offseason trade phase executes roster changes and transaction history, while full trade details are delegated to a separate spec not included in this pass.
- Codex recommendation: Preview/read-only for v1.
- Confidence: medium
- Rationale: Trade mutation is high-risk because salary, chemistry, morale, designations, and transaction history all intersect. Existing preview can still inform users.
- Consequence of including: v1 gains major roster agency but risks incoherent downstream effects.
- Consequence of deferring: Offseason roster churn is thinner, but safer.
- Dependencies: Trade spec, salary/True Value, roster movement, relationships/chemistry, fan morale.
- Test confidence: high for preview guard; low for mutation.
- Recommended reasoning level for future implementation: xhigh
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D036 - Expansion, contraction, stadium changes, spring training, farm reconciliation, and chemistry offseason tabs

- Requirement IDs covered: FSR-066, FSR-073, FSR-080, FSR-087, CAR-016
- Feature/subsystem: Expansion/stadium phase, removed contraction model, spring training, farm reconciliation tab, chemistry rebalancing tab.
- Current repo status summary: Placeholder/copy only, prototype/non-franchise, or ambiguous. Farm reconciliation and chemistry tabs are Coming Soon; spring training franchise mutation is not proven; contraction appears removed/future despite model residue.
- Spec expectation summary: Optional expansion/stadium changes and rich offseason relationship/farm phases may exist depending on settings/spec interpretation.
- Codex recommendation: Post-v1.
- Confidence: medium
- Rationale: These systems are not necessary for the core loop and would pull v1 into under-proven territory.
- Consequence of including: Offseason becomes broader but much harder to complete coherently.
- Consequence of deferring: v1 focuses on the season, roster lock, and a smaller offseason.
- Dependencies: Roster/farm, relationship/chemistry, stadium analytics, salary, phase model.
- Test confidence: low for franchise mutation behavior.
- Recommended reasoning level for future implementation: high
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

### Roster / farm / Phase 11

#### FVB-D037 - Farm roster storage, options, call-ups, send-downs, and movement mechanics

- Requirement IDs covered: FSR-029, FSR-074, FSR-076, FSR-077
- Feature/subsystem: Farm records, option counts, roster movement, call-up/send-down, transaction log.
- Current repo status summary: Mostly complete. Farm storage and roster movement are implemented and tested; Team Hub analyzer remains read-only.
- Spec expectation summary: Teams have MLB/farm rosters, option limits, movement validation, and transaction history.
- Codex recommendation: Must include in v1.
- Confidence: high
- Rationale: Roster movement and farm state are essential for multi-season credibility and Phase 11 correction.
- Consequence of including: v1 can recover from retirements/roster gaps and support farm mechanics.
- Consequence of deferring: Offseason/finalize becomes brittle and roster continuity suffers.
- Dependencies: Franchise player storage, farm storage, transaction storage, Phase 11.
- Test confidence: high for current movement/option actions.
- Recommended reasoning level for future implementation: high
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D038 - Farm reveal, scouted grades, rookie salary, and prospect control

- Requirement IDs covered: FSR-011, FSR-075, FSR-082, CAR-010
- Feature/subsystem: Hidden true ratings/traits, scouted-only UI, call-up reveal, draft-round salary lock, team control ambiguity.
- Current repo status summary: Partial. Rating reveal state exists and call-up can reveal; scouted-only UI, rookie salary timing, and contract-control model are incomplete/conflicted.
- Spec expectation summary: Farm prospects show scouted grades until call-up, with rookie salary/control rules and hidden traits/ratings.
- Codex recommendation: Simplify for v1.
- Confidence: medium
- Rationale: Reveal state is useful, but v1 should avoid promising full prospect economy/control until the one-year-contract conflict is resolved.
- Consequence of including: Farm players feel distinct and call-ups have consequence.
- Consequence of deferring: Farm becomes mostly an alternate roster list.
- Dependencies: Draft, salary, player generation, farm movement, Phase 11.
- Test confidence: medium for reveal state; low for full salary/control behavior.
- Recommended reasoning level for future implementation: high
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D039 - Phase 11 roster lock, correction actions, and new-season transition

- Requirement IDs covered: FSR-021, FSR-060, FSR-072, FSR-073, FSR-074
- Feature/subsystem: Finalize and advance, exact 22 MLB/10 farm validation, correction actions, transition journal, new-season launch.
- Current repo status summary: Mostly complete. FinalizeAdvanceFlow, roster lock validator, Phase 11 actions, and transition orchestrator are implemented and tested.
- Spec expectation summary: Offseason ends by validating rosters, locking state, archiving the season, resetting seasonal state/options, and launching next season.
- Codex recommendation: Must include in v1.
- Confidence: high
- Rationale: This is the bridge from one season to the next. Without it, Franchise v1 is one-season-only.
- Consequence of including: v1 can support a real multi-season loop.
- Consequence of deferring: Offseason has no trustworthy endpoint.
- Dependencies: Season summary, farm roster storage, salary, retirement, roster movement, schedule setup choice for new season.
- Test confidence: high for current finalize/transition mechanics; medium for every optional signing-round detail.
- Recommended reasoning level for future implementation: xhigh
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D040 - Farm narratives, warnings, recommendations, farm events, and revenge arcs

- Requirement IDs covered: FSR-076, FSR-078, FSR-079, FSR-080, FSR-081
- Feature/subsystem: Beat-reporter movement warnings, farm morale, relationships/storylines, recommendations, revenge arcs, mechanical farm events.
- Current repo status summary: Partial/missing/prototype. Movement mechanics exist, but narrative-risk warnings, farm events, and revenge arcs are not franchise-complete.
- Spec expectation summary: Farm decisions create morale, relationship, narrative, retirement/FA, and revenge consequences.
- Codex recommendation: Post-v1.
- Confidence: medium
- Rationale: These systems are flavorful but depend on several other deferred/guarded systems.
- Consequence of including: Farm becomes dramatic and strategic.
- Consequence of deferring: Farm remains more mechanical but trustworthy.
- Dependencies: Relationships, morale, narrative, trade, retirement, FA, modifier registry.
- Test confidence: low for full franchise behavior.
- Recommended reasoning level for future implementation: xhigh
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

### Storage / save slot / import/export

#### FVB-D041 - Core storage isolation, save-slot metadata, active franchise, and scoped reads

- Requirement IDs covered: FSR-002, FSR-016, FSR-017, FSR-020, FSR-021
- Feature/subsystem: Global app metadata, active franchise, franchise-scoped players/teams/schedules/stats/games/offseason state.
- Current repo status summary: Mostly complete. Core stores are scoped/tagged and have meaningful tests; some derived stores are partial.
- Spec expectation summary: Franchise data is isolated from global templates and other franchises.
- Codex recommendation: Must include in v1.
- Confidence: high
- Rationale: Storage isolation is a trust boundary for every franchise feature.
- Consequence of including: Users can run multiple franchises without cross-contamination.
- Consequence of deferring: Feature correctness becomes impossible to reason about.
- Dependencies: Franchise manager, storage adapters, all Mode 1/2/3 flows.
- Test confidence: high for core stores and scope tests; lower for derived narrative/morale/stadium stores.
- Recommended reasoning level for future implementation: high
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D042 - Franchise manager import/export and backup/restore promise

- Requirement IDs covered: FSR-016, FSR-090
- Feature/subsystem: List/load/delete/rename/export/import active franchises; backup/restore expectations.
- Current repo status summary: Partial. Export exists; import validates a manifest payload and then throws instead of mutating.
- Spec expectation summary: Users can export and import whole franchise data; cloud sync/accounts are future.
- Codex recommendation: Needs user decision.
- Confidence: medium
- Rationale: Export without import may create a false backup promise. The user should decide whether v1 requires restore-capable import or should label export as diagnostic/manual backup only.
- Consequence of including: Users gain safer long-term franchise ownership and migration.
- Consequence of deferring: v1 can still run locally, but backup/restore trust is incomplete.
- Dependencies: Storage manifest, schema migration, franchise manager UI, app startup.
- Test confidence: medium for export/manager contracts; low for import mutation.
- Recommended reasoning level for future implementation: xhigh
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D043 - Almanac and historical read consumers

- Requirement IDs covered: FSR-001, FSR-018, FSR-020, FSR-025, FSR-060, FSR-089
- Feature/subsystem: Almanac home, game detail, player/team identity, manager almanac, narrative archive consumers.
- Current repo status summary: Implemented and wired for completed-game/player/team/manager queries; narrative and milestone completeness varies.
- Spec expectation summary: Almanac is always-available read-only historical layer across modes.
- Codex recommendation: Include if already stable.
- Confidence: high
- Rationale: Almanac read surfaces increase trust in completed games without expanding mutation scope.
- Consequence of including: Users can inspect the history their franchise creates.
- Consequence of deferring: Completed-game archive becomes less visible and less satisfying.
- Dependencies: Completed games, almanac player registration, stats, manager WPA, narrative archive.
- Test confidence: high for existing query paths; medium/low for full milestone/narrative taxonomy.
- Recommended reasoning level for future implementation: medium
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D044 - Cloud sync, accounts, archive-vs-delete, revenue sharing, arbitration, multi-year contracts

- Requirement IDs covered: FSR-016, FSR-075, FSR-082, FSR-090
- Feature/subsystem: Future persistence/account/economics features beyond local import/export and one-year contracts.
- Current repo status summary: Future/deferred in specs or not implemented in current franchise loop.
- Spec expectation summary: These items are explicitly future, deferred, or conflicted with one-year v1 contract assumptions.
- Codex recommendation: Post-v1.
- Confidence: high
- Rationale: These are platform/economy expansions, not v1 trust foundations.
- Consequence of including: v1 scope becomes much larger and riskier.
- Consequence of deferring: v1 remains local-first and simpler.
- Dependencies: Account system, migration, contract model, salary/economy redesign.
- Test confidence: low/not applicable for v1.
- Recommended reasoning level for future implementation: high
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

### Engines / analyzer / simulation

#### FVB-D045 - Roster analyzer, optimal lineup, and advisory surfaces

- Requirement IDs covered: FSR-009, FSR-074, FSR-076
- Feature/subsystem: Roster analyzer, optimal lineup snapshots, Team Hub farm/roster advice, pregame lineup benchmarks.
- Current repo status summary: Implemented and wired as read-only/advisory in Team Hub and League Builder; some launch blockers use benchmarks.
- Spec expectation summary: Roster quality and lineup readiness inform franchise play and roster decisions.
- Codex recommendation: Preview/read-only for v1.
- Confidence: high
- Rationale: Advisory analysis is valuable and low-risk when it does not mutate roster state automatically.
- Consequence of including: Users get practical guidance for roster and lineup quality.
- Consequence of deferring: v1 is still playable but gives less feedback.
- Dependencies: Player ratings, roster storage, farm storage, optimal lineup logic.
- Test confidence: high for analyzer/lineup tests.
- Recommended reasoning level for future implementation: medium
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D046 - Synthetic simulation and full AI Game Engine

- Requirement IDs covered: FSR-056, FSR-059, DOR-015
- Feature/subsystem: Simplified v1 box-score sim, synthetic game factory, full AI Game Engine target.
- Current repo status summary: Synthetic sim exists but franchise UI is guarded off; full AI Game Engine is spec-deferred to V2.
- Spec expectation summary: V1 may use simplified AI-vs-AI simulation, while full AI Game Engine is deferred.
- Codex recommendation: Needs user decision.
- Confidence: low
- Rationale: This overlaps with FVB-D012 because it may be essential for schedule completion depending on the user's desired v1 season model.
- Consequence of including: The league can progress beyond human-scored games, but generated stats must be trusted.
- Consequence of deferring: v1 may rely on skips or manual scoring for non-human games.
- Dependencies: GameRecord/source semantics, stat aggregation, schedule statuses, milestones, almanac.
- Test confidence: low for enabled franchise flow.
- Recommended reasoning level for future implementation: xhigh
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D047 - Advanced standalone engines not yet franchise-complete

- Requirement IDs covered: FSR-022, FSR-024, FSR-026, FSR-049, FSR-057, FSR-058, FSR-080, FSR-087, FSR-088
- Feature/subsystem: Relationship engine, fan morale engine, park factor deriver, adaptive learning/calibration, narrative/mood/headline engines where not wired.
- Current repo status summary: Implemented as engines/reference/prototype in several cases, but not fully wired to durable franchise UI/storage.
- Spec expectation summary: These systems should eventually feed gameplay, salary, morale, narrative, park-adjusted stats, and story carryover.
- Codex recommendation: Guard/defer for v1.
- Confidence: medium
- Rationale: Engine existence alone should not force v1 inclusion. v1 should only expose advanced engines where their user-facing lifecycle is coherent.
- Consequence of including: The app may appear deeper but risks hidden state and inconsistent consequences.
- Consequence of deferring: v1 scope stays honest about what is actually durable.
- Dependencies: Storage contracts, UI surfaces, formula conflict resolution, event triggers.
- Test confidence: medium for isolated engines; low for full franchise integration.
- Recommended reasoning level for future implementation: xhigh
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

#### FVB-D048 - SMB4 generators, profile engines, and historical conversion tools

- Requirement IDs covered: FSR-006, FSR-010, FSR-011, FSR-070
- Feature/subsystem: Player/team generation, SMB4 grade emulation, historical player conversion, draft/prospect generation support.
- Current repo status summary: Implemented/reference/prototype with some tests, but not clearly part of the active franchise v1 loop.
- Spec expectation summary: Generators can support imports, fantasy drafts, startup prospects, and annual draft classes.
- Codex recommendation: Post-v1.
- Confidence: medium
- Rationale: These are powerful content tools but should follow the user's decisions on draft/import scope.
- Consequence of including: v1 can create more content inside the app, but setup/offseason complexity increases.
- Consequence of deferring: v1 relies more on existing/imported/seeded data.
- Dependencies: Player import/generation decision, draft decision, prospect salary/reveal.
- Test confidence: medium for isolated generators; low for active franchise handoff.
- Recommended reasoning level for future implementation: high
- User decision:
  - [ ] approve
  - [ ] modify
  - [ ] reject
  - [ ] discuss
- User notes:

## 3. Top recommendations

### Top proposed includes

- FVB-D001: Franchise setup and save-slot handoff.
- FVB-D007: Franchise Home, schedule display, and scored-game launch.
- FVB-D008: Core GameTracker event model and one-tap scoring.
- FVB-D010: Active-game autosave, resume, completion, and archive.
- FVB-D014: Stats pipeline, season leaders, career/almanac registration.
- FVB-D025: Playoff bracket, launch, advancement, stats, and leaders.
- FVB-D029: Season-end summary and Mode 2 -> Mode 3 handoff.
- FVB-D037: Farm roster storage, options, call-ups, send-downs, and movement mechanics.
- FVB-D039: Phase 11 roster lock and new-season transition.
- FVB-D041: Core storage isolation and scoped reads.

### Top proposed simplifications

- FVB-D002: Simplify franchise type/control semantics around selected human teams and clear game ownership.
- FVB-D004: Keep visible player identity/ratings/traits; do not force full hidden personality mechanics into v1.
- FVB-D009: Preserve baseball-critical between-play actions; avoid full long-term modifier scope.
- FVB-D013: Include useful standings/playoff eligibility; keep advanced tiebreak/deadline details narrower if unproven.
- FVB-D016: Use trustworthy advanced stats where stable; avoid claiming complete WAR/park/adaptive parity.
- FVB-D018: Keep salary useful; resolve True Value and real-time trigger conflicts later unless the user chooses otherwise.
- FVB-D027: Record champion/postseason leaders; simplify Fame/narrative rewards.
- FVB-D032: Keep retirement explicit and confirmation-based; defer full jersey/HOF ceremony depth.
- FVB-D038: Keep farm reveal mechanics narrower until prospect salary/control is decided.

### Top proposed deferrals

- FVB-D006: Optional startup fantasy/prospect draft and direct Playoff Mode setup.
- FVB-D024: Broad modifier registry and farm mechanical event depth.
- FVB-D036: Expansion/contraction/stadium-change/spring-training/farm-reconciliation/chemistry tab scope.
- FVB-D040: Farm narratives, warnings, recommendations, events, and revenge arcs.
- FVB-D044: Cloud sync, accounts, archive-vs-delete, revenue sharing, arbitration, multi-year contracts.
- FVB-D048: SMB4 generators/profile/conversion tools as active v1 franchise features.

### Top needs user decision items

- FVB-D005: Schedule setup contract, because repo auto-generation conflicts with user-driven/empty schedule specs.
- FVB-D012 and FVB-D046: AI-vs-AI/synthetic simulation, because it may be essential to season progression depending on the desired v1 model.
- FVB-D020: Milestones/franchise firsts, because detection exists but franchise first/leader storage is stubbed.
- FVB-D028: Canonical offseason phase model, because specs conflict on 11 vs 13 phases.
- FVB-D033: Free agency mutation, because current behavior is read-only and valuation rules conflict.
- FVB-D034: Annual draft mutation, because current behavior is read-only but draft may be key to multi-season renewal.
- FVB-D042: Import/export promise, because export exists but import is validate-only.

## 4. Overbuild warnings

- Do not let full canonical specs force every rich system into v1. The repo has many engines that are not yet durable franchise products.
- Do not treat preview adapters for free agency, draft, and trades as proof that mutation is safe.
- Do not build full morale/relationship/chemistry consequences before the user approves formulas, persistence, and visible feedback.
- Do not expand offseason into every ceremony, dice/wheel/card mode, HOF, jersey, expansion, spring training, farm narrative, and chemistry phase at once.
- Do not expose synthetic simulation as stat-bearing franchise behavior until the user decides whether v1 needs it and trust criteria are clear.
- Do not promise backup/restore if import still only validates and throws.
- Do not let "partially built" become automatic v1 scope when the behavior is incoherent, guarded, or hard to explain to a user.

## 5. Underbuild warnings

- Deferring setup/save-slot isolation, GameTracker scoring, active-game persistence, stat aggregation, or scoped storage would make v1 untrustworthy.
- Deferring all non-human game resolution without a clear skip/sim policy may make full-league seasons tedious or blocked.
- Deferring season summary and Phase 11 transition would make Franchise v1 effectively one-season-only.
- Deferring roster/farm movement entirely would make retirement, offseason, and roster correction brittle.
- Deferring playoffs despite strong existing implementation would remove a major payoff from the regular season.
- Deferring all awards/designation/milestone flavor would make v1 mechanically sound but emotionally thin; at least read-only/summary flavor may be worth keeping where stable.
- Deferring import or clearly labeling export limitations needs a user decision, because long-running franchise trust depends on backup expectations.

## 6. Review guide for the user

Suggested review order:

1. Review `Needs user decision` items first: FVB-D005, FVB-D012, FVB-D020, FVB-D028, FVB-D033, FVB-D034, FVB-D042, FVB-D046.
2. Review `Must include in v1` items next to confirm the core loop: setup, GameTracker, persistence, stats, playoffs, season summary, farm movement, Phase 11, scoped storage.
3. Review `Simplify for v1` items to decide how much product flavor v1 should carry without overcommitting.
4. Review `Preview/read-only for v1` items to decide which partially built systems should remain visible but non-mutating.
5. Review `Post-v1` items last; these are mostly expansion surfaces, content generators, and high-complexity flavor systems.

Most consequential decisions:

- FVB-D005: Schedule setup contract.
- FVB-D012 / FVB-D046: Whether v1 needs AI-vs-AI simulation or can rely on skip/manual scoring.
- FVB-D028: Canonical offseason phase model.
- FVB-D033 and FVB-D034: Whether v1 offseason needs mutation-capable FA and draft.
- FVB-D039: Whether v1 is truly multi-season.
- FVB-D042: Whether v1 promises backup/restore.

Mostly taste/product-feel decisions:

- FVB-D017: How much awards/designation flavor appears in v1.
- FVB-D019: How much reporter/news flavor appears in v1.
- FVB-D020: How celebratory milestones should be in v1.
- FVB-D023: Whether stadium/park analytics should be visible as read-only flavor.
- FVB-D030: Whether awards ceremony is ceremony-first or summary-first.
- FVB-D032: How ceremonial retirement should feel in v1.

## 7. Next step after user review

After the user approves, modifies, rejects, or discusses these recommendations item by item, the next artifact should be a locked Franchise v1 scope document. Only after that scope is locked should an implementation roadmap be created.

No exact implementation prompts are included in this draft.
