# MODE 1: LEAGUE BUILDER — V1 Triage Draft

## Triage Status
**Document:** MODE_1_LEAGUE_BUILDER_FINAL.md
**Total Sections:** 16
**Completed:** 16/16 ✅
**Started:** 2026-03-03
**Triage Complete:** 2026-03-04

---

## Rulings

### §1 — Overview & Mode Definition
**Ruling:** SIMPLIFY
**v1 Scope:**
- §1.1 Mode definition: KEEP AS-IS — one-time setup hub, runs once per franchise
- §1.2 Nine outputs: KEEP AS-IS — franchise save slot, league structure, complete rosters (8 ratings + traits + personality + chemistry + arsenal + bats/throws + age + gender + positions + fame + salary), farm rosters, rules config, schedule, franchise type, initialized subsystems, named NPCs (reporter + manager + scout per team)
- §1.3 Negative boundaries: KEEP AS-IS
- §1.4 Entry points: SIMPLIFY — keep "New Franchise" (full wizard §11) and "League Builder" (standalone editor). Defer "Playoff Mode" (abbreviated wizard §11.7).
- §1.5 Key principles: KEEP AS-IS — all 5 principles (reusable teams, global players, league templates, non-destructive, copy-on-create per C-076)

**v1 KEEPS:**
- Full mode definition and all 9 outputs
- Salary as player attribute (confirmed v1 — load-bearing for Mode 2 §20.1 True Value)
- All 3 NPC types per team (reporter for narrative, manager for mWAR, scout for draft)
- "New Franchise" and "League Builder" entry points
- All 5 key principles

**v2 DEFERS:**
- "Playoff Mode" entry point (§1.4 / §11.7 abbreviated wizard)

**JK's Reasoning:** Salary stays — it's load-bearing. Scout is critical for drafting farm team in Mode 1 and Mode 3. League Builder feeds into New Franchise so both stay. Playoff Mode can wait.
**Dependencies Flagged:** §11.7 (Playoff Mode wizard) will be deferred when reached — consistent with this ruling.

---

### §2 — Franchise Type Selection
**Ruling:** SIMPLIFY
**v1 Scope:**
- §2.1 Three franchise types: KEEP AS-IS — Solo, Couch Co-Op, Custom with human/AI team assignments
- §2.2 `controlledBy` flag: KEEP AS-IS — 'human' | 'ai' per FranchiseTeam, gates experience not access, 7-row comparison table, commissioner+manager dual role
- §2.3 FranchiseTypeConfig interface: SIMPLIFY — remove `aiScoreEntry` field (redundant — v1 Score/Skip applies to all games per Mode 2 §22). Keep `type`, `humanTeams`, `offseasonPhaseScopes` (simplified per §2.5).
- §2.4 Presets: SIMPLIFY — remove AI score entry references from Solo and Custom presets. Core preset logic (which teams are human) stays.
- §2.5 Offseason phase scope: SIMPLIFY — replace 13-row per-phase config table with single global toggle (`all-teams | human-only`). Awards Ceremony toggle (full/team_only/off) stays as standalone setting independent of scope. Drop `OffseasonPhaseConfig` interface; replace with simple `offseasonScope: 'all-teams' | 'human-only'` + `awardsCeremony: 'full' | 'team_only' | 'off'`. Couch Co-Op override still forces `all-teams`.
- §2.6 Negative boundary: KEEP AS-IS — 7 systems unchanged by franchise type

**v1 KEEPS:**
- All 3 franchise types (Solo, Couch Co-Op, Custom)
- `controlledBy` flag with experience-not-access gating
- Core preset logic for each franchise type
- Global offseason scope toggle (all-teams vs human-only)
- Awards Ceremony toggle (full/team_only/off) as standalone setting
- Couch Co-Op all-teams override
- All 7 invariant systems listed in §2.6

**v2 DEFERS:**
- `aiScoreEntry` field and toggle (redundant with v1 Score/Skip for all games per Mode 2 §22)
- Per-phase offseason scope configuration (13-row table, `OffseasonPhaseConfig` interface, per-phase `aiResolution` setting). v1 applies one global scope to all 13 phases.

**JK's Reasoning:** `aiScoreEntry` is redundant — v1 has Score/Skip for every game. Per-phase offseason scoping is over-configuration for v1; a single global toggle (all-teams vs human-only) is sufficient. All 3 franchise types serve the couch.
**Dependencies Flagged:** Mode 3 consumes offseason scope — simplified to global toggle. Awards Ceremony toggle preserved as standalone. No downstream breaks.

---

### §3 — Leagues Module
**Ruling:** KEEP AS-IS
**v1 Scope:** Everything — purpose (§3.1), 5 CRUD features: View/Create/Edit/Delete/Duplicate (§3.2), LeagueTemplate data model with 3 interfaces (LeagueTemplate 8 fields + Conference 4 fields + Division 4 fields) including branding fields logoUrl and themeColor (§3.3), 5-step creation flow: Name → Teams → Structure → Rules Preset → Review (§3.4), structural constraints: min 2 teams, 0/1/2 conferences, 0-3+ divisions, every team in exactly 1 division, teams across multiple templates (§3.5)
**v2 Deferred:** Nothing
**JK's Reasoning:** Clean KEEP. Standard CRUD on templates, straightforward data model, all serves the couch.
**Dependencies Flagged:** N/A.

---

### §4 — Teams Module
**Ruling:** SIMPLIFY
**v1 Scope:**
- §4.1 Purpose: KEEP AS-IS — global team pool, reusable across leagues
- §4.2 Features: KEEP AS-IS — all 6 operations (Create, Edit, Assign, Duplicate with deep copy, Import via CSV, Delete with confirmation)
- §4.3 Team data model: SIMPLIFY — keep 11 of 14 fields (id, name, abbreviation, location, nickname, colors {primary/secondary/tertiary}, logoUrl, stadium, leagueIds, createdDate, lastModified). Strip 3 metadata fields.
- §4.4 Team CSV Import: KEEP AS-IS — 9-column format, 5-step import flow. Note: CSV import logic should be leveraged for schedule import as well.

**v1 KEEPS:**
- All 6 CRUD operations including CSV import
- Team identity (name, abbreviation, location, nickname)
- Team branding (3 hex colors + optional logo)
- Venue (stadium name — load-bearing for Mode 2 §24 seed park factors)
- League membership tracking
- CSV import with preview/validation (reusable pattern for schedule import)
- `controlledBy` remains on FranchiseTeam, not Team (per §2.2)

**v2 DEFERS:**
- `foundedYear` field (franchise history, not team template data)
- `championships` field (franchise history, not team template data)
- `retiredNumbers` field (franchise history, not team template data)

**JK's Reasoning:** Metadata fields are franchise-specific history, not team branding — they don't belong on reusable templates. CSV import is essential and its logic should be leveraged for schedule import too.
**Dependencies Flagged:** No downstream systems reference these 3 fields. Clean cut.

---

### §5 — Players Module
**Ruling:** KEEP AS-IS (with spec correction)
**v1 Scope:** Everything —
- §5.1 Purpose: global player pool, SMB4 506-player base
- §5.2 Features: all 5 operations (Create, Edit, Generate, Import CSV, Delete)
- §5.3 Complete Player data model: full ~25 field interface including salary (load-bearing for True Value), contractYears static at 1 (single-year contracts in v1), all 8 ratings, traits (max 2), personality (7 types), hiddenModifiers (4 values), chemistry (5 types), fameLevel (6-tier dropdown per C-078), positions (primary CorePosition + optional secondary CorePosition|CompositePosition), arsenal, rosterLevel (4-value enum)
- §5.4 Type definitions: all 12 type unions (CorePosition 12, CompositePosition 4, FieldPosition 10, Grade 13, PitchType 9, PersonalityType 7, ChemistryType 5, RosterLevel 4, MojoLevel 6, FameLevel 6, HiddenModifiers interface)
- §5.5 Trait catalogue: full SMB4 trait list (~65 traits across 12 type unions) with position-player-only, pitcher-only, and universal categories. Two-way trait pitcher-only restriction.
- §5.6 Grade calculation: all 3 formulas (position player 3:3:2:1:1, pitcher 1:1:1, two-way ×1.25 premium) + position-based and trait-based modifiers (net cap ±5)
- §5.7 Grade thresholds: full 13-grade scale S through D- with minWeighted values + getGrade() function + 5 verification examples
- §5.8 Fictional player generation: full GeneratePlayersConfig interface (7 user-configurable fields), position-based stat bias tables (8 position + 3 pitcher role). JK has completed the SML analysis — relevant files to be uploaded when ready to add to spec.
- §5.9 FameLevel: 6-tier dropdown with descriptions, auto-generated prospects cap at National

**SPEC CORRECTION — §5.5 trait data status:**
The note stating "SML players do NOT currently include trait data" and need "a separate trait scanning pass" is OUT OF DATE. SML players now have trait data. Remove the caveat about missing traits and manual assignment. Players import with full trait information.

**v2 Deferred:** Nothing
**JK's Reasoning:** Salary and True Value stay — non-negotiable. Single-year contracts correct for v1. Full generation system stays — SML analysis is complete. Full trait catalogue stays — trait data now exists for SML players (spec note is stale). Everything in this section earns its place.
**Dependencies Flagged:** N/A.

---

### §6 — Personality & Traits — Initial Assignment
**Ruling:** KEEP AS-IS (with spec corrections)
**v1 Scope:** Everything —
- §6.1 When assignment happens: at league creation. Mode 1 operation; subsequent changes in Mode 2/Mode 3.
- §6.2 Personality — 7 visible types: per C-070, weighted distribution (Competitive 20%, Relaxed 20%, Jolly 15%, Tough 15%, Timid 10%, Droopy 10%, Egotistical 10%). Balanced across league. Chemistry types excluded from dropdown.
- §6.3 Hidden modifiers — 4 values: Gaussian μ=50, σ=20, clamped [0,100]. Personality-based soft bias (7-row table). Never shown as numbers — surfaced via beat reporter hints (Mode 2 §16).
- §6.4 Initial trait distribution: 30/50/20 split (0/1/2 traits). Max 2 cap, position-appropriate, chemistry affects potency not eligibility (C-064/C-086), 15% negative for generated players, Two-way pitcher-only restriction.
- §6.5 Trait visibility on farm: per C-054, traits HIDDEN on farm prospects. True ratings hidden. Scouted grade (§8.6) is only indicator. 7-row visibility table (Farm vs MLB).

**SPEC CORRECTION #1 — §6.1 stale trait note:**
Same as §5 correction: remove the note about SML players missing trait data. SML players now have full trait data. No manual assignment or re-scan needed.

**SPEC CORRECTION #2 — §6.1/§6.4 clarify assignment scope:**
Trait generation logic (§6.4 distribution rules, 15% negative, position-appropriate assignment) applies ONLY to generated players (Startup Prospect Draft farm prospects, Fantasy Draft generated prospects). Players uploaded via CSV import or already existing in the player database keep their existing traits — they are NOT reassigned. However, ALL players (imported AND generated) DO receive auto-assigned personality types (§6.2) and hidden personality modifiers (§6.3) as part of Mode 1 league creation.

**v2 Deferred:** Nothing
**JK's Reasoning:** Full generation logic stays. Farm visibility rules are meaningful gameplay (scouting uncertainty). Hidden modifier generation drives narrative, FA, retirement, captain selection — all v1 systems. Trait generation only applies to generated players; imported players keep existing traits but get personality + hidden modifiers assigned.
**Dependencies Flagged:** N/A.

---

### §7 — Rosters Module
**Ruling:** KEEP AS-IS
**v1 Scope:** Everything — purpose: template-based player-to-team assignment, copy-on-create (§7.1), 2 operations: Assign + Validate (§7.2), TeamRoster interface with mlbRoster/farmRoster arrays + optional DepthChart with 12 CorePosition keys (§7.3), ROSTER_RULES validation: mlbRosterSize 22, farmRosterMax 10, position minimums (C:2, 1B-RF:1 each, SP:4, RP:5, min 5 RP+SP/RP+CP combo), non-blocking warnings only (§7.4)
**v2 Deferred:** Nothing
**JK's Reasoning:** Clean KEEP. Small section, all serves the couch. Depth chart stays for positional guidance. Non-blocking validation stays — permissive by design.
**Dependencies Flagged:** N/A.

---

### §8 — Draft Module
**Ruling:** KEEP AS-IS (with spec gap flagged)
**v1 Scope:** Everything —
- §8.1 Purpose: both draft types (Fantasy Draft + Startup Prospect Draft) + Mode 3 annual draft reuse
- §8.2 Fantasy Draft config: full DraftConfig interface — all 3 formats (snake, straight, auction), rounds, timePerPick, draftOrder, userControlledTeams, all 3 AI strategies (best_available, position_need, balanced) including team archetypes to drive AI decision-making
- §8.3 Startup Prospect Draft: snake format, reverse salary order, 10 rounds, 3× pool, user drafts human teams, AI auto-drafts, scouted grades, unique scout per team, skip option
- §8.4 Prospect pool generation: full generateStartupProspectPool function, bell curve distribution, balanced positions, even chemistry, age 18-23
- §8.5 Draft class grade distribution: overall distribution table (10 grades) + round-weighted generation table (3 round tiers)
- §8.6 Scout accuracy system: full ScoutProfile interface with specialty/weakness positions, 5-tier position accuracy table, generateScoutedGrade with Box-Muller sampling, σ=(100-accuracy)/22, ±4 hard cap
- §8.7 Prospect salary: rookie salary per SALARY_SYSTEM_SPEC round-based table
- §8.8 Flow position: 6-step franchise creation wizard (Steps 5A/5B/5C)

**SPEC GAP — Auction Draft Mechanics:**
§8.2 includes `auction` as a draft format but the spec does not detail auction-specific mechanics: budget per team, nomination order, bidding rules, minimum bid, budget balance enforcement, or how the auction budget ties into the salary system. This needs a dedicated sub-spec. JK's intent: auction budget should integrate with the salary system to enforce competitive balance across teams during the draft — preventing one team from hoarding all top talent. To be spec'd during v1 draft consolidation.

**v2 Deferred:** Nothing
**JK's Reasoning:** All 3 draft formats stay including auction (needs spec). All 3 AI strategies needed including team archetypes for AI decision-making. Full scout accuracy system earns its place — different teams evaluating the same prospect differently is core character. Everything serves the couch.
**Dependencies Flagged:** N/A. Auction spec gap to be resolved during v1 draft consolidation.

---

### §9 — Rules Configuration
**Ruling:** SIMPLIFY
**v1 Scope:**
- §9.1 Purpose: KEEP AS-IS — create/manage rules config, stored in League Builder, copied at franchise creation
- §9.2 RulesPreset interface: SIMPLIFY — keep 5 of 8 configuration groups:
  - game: SIMPLIFY — keep inningsPerGame (1-9), extraInningsRule (3 options), mercyRule (enabled/differential/afterInning). Remove pitchCounts and moundVisits settings (no Mode 2 systems read them).
  - season: KEEP AS-IS — gamesPerTeam (8-200 per C-071), allStarGame + timing, tradeDeadline (enabled + timing %)
  - playoffs: KEEP AS-IS — teamsQualify (2-12), format (bracket/pool/best_record_bye), 4 series configs (WC/DS/CS/WS) with games + homeGames, homeFieldAdvantage pattern, tiebreakers
  - dh: KEEP AS-IS — rule (always/never/league_specific) + per-conference settings
  - roster: KEEP AS-IS — mlbRosterSize (default 22), farmRosterSize (default 10)
  - awardsCeremony: KEEP AS-IS — full/team_only/off (also accessible via §2.5 standalone toggle)
  - offseason: KEEP AS-IS — 9 toggles/settings (draft, FA, ratings, retirement, expansion)
  - ai: REMOVE ENTIRELY — all 6 AI behavior sliders (tradeAggressiveness, tradeAcceptanceThreshold, rebuildThreshold, prospectValuation, winNowBias, positionScarcityAwareness). AI teams use sensible hardcoded defaults in v1.
- §9.3 Default presets: REMOVE ENTIRELY — no built-in presets (Standard Season, Quick Play, Full Simulation, Arcade Mode all removed). User configures rules directly to match their SMB4 console settings. `defaultRulesPresetId` on LeagueTemplate (§3.3) becomes unnecessary — replace with inline rules config or direct reference. §3.4 Step 4 "Select Rules Preset" becomes "Configure Rules." §11 wizard adjusted accordingly.

**v1 KEEPS:**
- Full rules configuration interface (minus removed groups)
- Game settings: innings, extra innings, mercy rule
- Season settings: games per team, all-star, trade deadline
- Playoff settings: full bracket/series configuration
- DH rule with league-specific option
- Roster size settings
- Awards ceremony toggle
- Offseason settings (draft, FA, ratings, retirement, expansion)
- User configures all settings directly (no presets)

**v2 DEFERS:**
- AI behavior sliders (6 sliders — AI teams use hardcoded defaults in v1)
- pitchCounts game setting (no Mode 2 system reads it)
- moundVisits game setting (not tracked in Mode 2)
- All 4 built-in presets (Standard Season, Quick Play, Full Simulation, Arcade Mode)
- `defaultRulesPresetId` field on LeagueTemplate and preset selection concept

**JK's Reasoning:** No presets — user selects what matches their SMB4 console settings for their particular season setup. AI sliders are over-configuration for v1 AI behavior. Pitch counts and mound visits have no Mode 2 consumer. Strip all of it.
**Dependencies Flagged:** §3.3 LeagueTemplate `defaultRulesPresetId` field now unnecessary — replace with inline rules config. §3.4 Step 4 changes from "Select Rules Preset" to "Configure Rules." §11 wizard step adjusted. No downstream breaks — Mode 2/3 read individual rule values, not preset IDs.

---

### §10 — Schedule Setup
**Ruling:** SIMPLIFY
**v1 Scope:**
- §10.1 Schedule Model: SIMPLIFY — keep CSV upload (4-column format: gameNumber, homeTeam, awayTeam, fictionalDate) + manual one-at-a-time in-season adds + empty schedule launch. Remove Screenshot/OCR. ScheduleConfig interface (2 fields). ScheduledGame interface (10 fields). GameStatus enum trimmed to 4 values: SCHEDULED, IN_PROGRESS, COMPLETED, SKIPPED (SIMULATED stripped).
- §10.2 User Editing: KEEP AS-IS — swap home/away, move dates, add/remove with validation warning
- §10.3 Franchise Type Impact: KEEP AS-IS — Solo/Custom primary/secondary split, Couch Co-Op next-game highlight

**v1 KEEPS:**
- CSV upload with parse/validate flow
- Manual game-by-game entry
- Empty schedule launch (no schedule required to start)
- Full ScheduledGame interface (10 fields)
- 4-value GameStatus enum (SCHEDULED, IN_PROGRESS, COMPLETED, SKIPPED)
- All post-load editing (swap, move, add/remove)
- Franchise type schedule display rules

**v2 DEFERS:**
- Screenshot/OCR schedule extraction (requires OCR pipeline — CSV + manual sufficient for v1)
- SIMULATED value in GameStatus enum (no AI simulation in v1 — stripped, not dormant)

**JK's Reasoning:** CSV is sufficient for schedule input. OCR is extra complexity without enough v1 payoff. SIMULATED stripped to avoid confusion since there's no simulation in v1. Everything else earns its place.
**Dependencies Flagged:** Mode 2 §22 GameStatus references — SIMULATED removal consistent with §22 and §25 deferrals. No downstream breaks.

---

### §11 — Franchise Creation Wizard
**Ruling:** SIMPLIFY
**v1 Scope:**
- §11.1 Overview: KEEP — 6-step wizard flow (League → Season → Playoffs → Type & Teams → Rosters/Salary/Draft → Confirm)
- §11.2 Step 1 — Select League: KEEP AS-IS — pick template or jump to League Builder. SPEC CORRECTION: remove `defaultRulesPreset` from Step1Data (presets removed per §9).
- §11.3 Step 2 — Season Settings: KEEP but STRIP preset references — no "Quick presets: Standard, Quick Play, Full Season, Custom." User sets every value manually (gamesPerTeam, inningsPerGame, extraInnings, allStar, tradeDeadline, mercyRule). Step2Data interface (6 fields).
- §11.4 Step 3 — Playoff Settings: KEEP AS-IS — teams qualifying, format, 4 series configs, homeFieldAdvantage. Step3Data interface (7 fields).
- §11.5 Step 4 — Franchise Type & Team Control: KEEP with CORRECTIONS — remove `aiScoreEntry` field (per §2 ruling), replace `offseasonPhaseScopes: OffseasonPhaseConfig[]` with `offseasonScope: 'all-teams' | 'human-only'` + `awardsCeremony: 'full' | 'team_only' | 'off'` (per §2 ruling). Remove "Configure AI score entry toggle" from flow. Step4Data interface corrected to 6 fields.
- §11.6 Step 5 — Rosters, Salary & Draft: KEEP AS-IS — 3 sub-steps (5A Roster Mode, 5B Salary Calculation, 5C Startup Prospect Draft). Salary calculation runs regardless of roster mode (existing or fantasy draft) — salaries must be established to correctly value players during any draft type. Step5Data interface (5 fields).
- §11.8 Playoff Mode: DEFER per §1 ruling.
- §11.9 Navigation Rules: KEEP AS-IS — back/next/cancel/jump-back.

**v1 KEEPS:**
- Full 6-step wizard flow
- All step data capture interfaces (with corrections noted above)
- All validation rules per step
- 3-sub-step roster/salary/draft flow (salary required before any draft)
- Navigation rules (back, next, cancel, jump-back)

**v2 DEFERS:**
- §11.8 Playoff Mode abbreviated wizard (per §1 ruling)
- `aiScoreEntry` field and toggle (per §2 ruling)
- Per-phase offseason scope configuration (per §2 ruling)
- Quick presets / preset selection concept (per §9 ruling)

**SPEC CORRECTIONS (3 stale references from prior rulings):**
1. §11.2 Step1Data: remove `defaultRulesPreset` field (presets removed per §9)
2. §11.3: remove "Quick presets: Standard, Quick Play, Full Season, Custom" reference (per §9)
3. §11.5 Step4Data: remove `aiScoreEntry`, replace `offseasonPhaseScopes: OffseasonPhaseConfig[]` with simplified scope fields (per §2)

**JK's Reasoning:** No presets — user sets everything manually. Salary calculation earns its Step 5B position regardless of draft type because salaries are needed to correctly value players during any draft format. Playoff Mode stays deferred per §1.
**Dependencies Flagged:** §12 Franchise Initialization consumes wizard output — Step4Data corrections must propagate to §12.1 initialization sequence (metadata store still references `aiScoreEntry` and `offseasonPhaseScopes`). Flag for §12 triage.

---

### §12 — Franchise Handoff & Initialization
**Ruling:** KEEP AS-IS (with spec corrections)
**v1 Scope:** Everything —
- §12.1 Initialization Sequence: KEEP — full 11-step `initializeFranchise()` function (create franchise DB, copy league, copy teams with controlledBy, copy/draft rosters, copy rules config, init salary ledger, init standings, load/init schedule, init stats stores, init NPCs, init metadata, set active). SPEC CORRECTIONS: step 5 changes from `copyRulesPreset(setup.rulesPresetId)` to copying inline rules config from wizard (presets removed per §9). Step 10 metadata: remove `aiScoreEntry`, replace `offseasonPhaseScopes` with `offseasonScope` + `awardsCeremony` (per §2/§11 corrections).
- §12.2 Mode Transition Screen (C-077): KEEP AS-IS — franchise summary + "BEGIN SEASON" button as Mode 1 → Mode 2 boundary.
- §12.3 Subsystem Initialization Detail: KEEP AS-IS — salary ledger (per-player initial salary), standings tables (full 17-field StandingsEntry initialized to zero/null/IN_HUNT), stats stores (empty season tables + event log + career from import), franchiseId foreign key on every record.

**v2 Deferred:** Nothing
**SPEC CORRECTIONS (propagated from prior rulings):**
1. §12.1 step 5: `copyRulesPreset(setup.rulesPresetId)` → copy inline rules config (per §9)
2. §12.1 step 10 metadata: remove `aiScoreEntry` field (per §2)
3. §12.1 step 10 metadata: replace `offseasonPhaseScopes` with `offseasonScope: 'all-teams' | 'human-only'` + `awardsCeremony: 'full' | 'team_only' | 'off'` (per §2)

**JK's Reasoning:** Load-bearing infrastructure — every Mode 2 system depends on correct initialization. Keep all 11 steps, full subsystem detail, copy-not-reference rule (C-076), mode transition screen. Corrections propagated from §2, §9, §11 rulings.
**Dependencies Flagged:** N/A — this section consumes upstream corrections, doesn't create new downstream issues.

---

### §13 — Data Architecture
**Ruling:** SIMPLIFY
**v1 Scope:**
- §13.1 Global vs Franchise Data: KEEP AS-IS — two-tier architecture diagram (kbl-app-meta global DB + kbl-franchise-{id} per-franchise DB), copy-not-reference boundary.
- §13.2 Storage Strategy: KEEP with CORRECTION — separate IndexedDB per franchise, 16 franchise object stores, global DB stores corrected: remove `rulesPresets` store (presets removed per §9 — rules config lives inline on league templates). 6 global stores remain (franchiseList, leagueTemplates, teamPool, playerPool, appSettings, lastUsedFranchise). Rationale for separate DBs stays (isolation, atomic delete, clean export).
- §13.3 Storage Estimates: KEEP AS-IS — developer reference material, zero code cost.
- §13.4 Franchise Management: KEEP AS-IS — FranchiseManager interface (9 methods), FranchiseSummary interface (9 fields).
- §13.5 App Startup Flow: KEEP AS-IS — load app-meta → get last franchise → load DB + integrity check → Mode 2 dashboard. No-franchise path → franchise selector.
- §13.6 Franchise Switching: KEEP AS-IS — 5-step sequence (close DB, clear state, open new DB, integrity check, load).
- §13.7 Legacy Data Migration: REMOVE — v1 is a fresh start for all users. No pre-franchise data to migrate.

**v1 KEEPS:**
- Full two-tier data architecture (global + per-franchise)
- Separate IndexedDB per franchise with 16 object stores
- Global DB with 6 stores (rulesPresets removed)
- Storage estimates as developer reference
- Full FranchiseManager + FranchiseSummary interfaces
- App startup flow with franchise selector
- Franchise switching sequence

**v2 DEFERS:**
- §13.7 Legacy data migration (v1 is a fresh start — no legacy data exists)
- `rulesPresets` global store (presets removed per §9 — rules inline on league templates)

**JK's Reasoning:** Storage estimates are useful developer reference, keep them. Legacy migration is moot — v1 is a fresh start for all users, there's no pre-franchise data to migrate. Rules presets store gone per §9 — rules config lives on league templates directly.
**Dependencies Flagged:** No downstream breaks — legacy migration was self-contained. rulesPresets removal consistent with §9 and §11 rulings.

---

### §14 — V2 Material (Explicitly Out of Scope)
**Ruling:** DEFER ENTIRELY (remove from v1 spec)
**v1 Scope:** Nothing. Section dropped.
**v2 Deferred:** The entire section — a 10-row table of pre-tagged V2 features (salary cap, contraction, cloud sync, franchise templates, archive vs delete, revenue sharing, arbitration, multiplayer turn management, schedule auto-generation, free agent marketplace UI). Table is redundant with V2_DEFERRED_BACKLOG.md which is maintained throughout triage.

**JK's Reasoning:** Same as Mode 2 §27 — V2_DEFERRED_BACKLOG.md is the authoritative deferral record. §14's table is redundant and will drift out of sync.
**Dependencies Flagged:** None — pure reference material, nothing depends on it.

---

### §15 — Cross-References
**Ruling:** KEEP AS-IS (appendix)
**v1 Scope:** Everything — cross-reference table (4 rows: Spine, Mode 2, Mode 3, Almanac with relationship descriptions) + source specs consumed table (13 rows listing every spec consumed by this gospel, what was consumed, and remaining valid content). Kept as non-build appendix for provenance and navigation.
**v2 Deferred:** Nothing
**JK's Reasoning:** Zero code cost, aids navigation and provenance. Keep as reference appendix.
**Dependencies Flagged:** N/A.

---

### §16 — Decision Traceability
**Ruling:** KEEP AS-IS (appendix)
**v1 Scope:** Everything — 12-row traceability table mapping STEP4 decisions (C-045, C-054, C-070 through C-078, C-087) to the gospel sections where they were applied. Kept as non-build appendix for provenance and debugging.
**v2 Deferred:** Nothing
**JK's Reasoning:** Same as Mode 2 §28 — zero code cost, pure traceability. Keep as appendix.
**Dependencies Flagged:** N/A.

---

## MODE 1 TRIAGE COMPLETE

All 16 sections triaged. Next step: cross-reference reconciliation pass.

