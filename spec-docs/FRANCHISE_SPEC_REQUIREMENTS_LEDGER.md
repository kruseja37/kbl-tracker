# Franchise Spec Requirements Ledger

Spec-first extraction pass. This document records what the current franchise specs ask for. It does not compare those asks to repository implementation, does not assign implemented/missing status, does not define a roadmap, and does not decide v1 scope.

The repository implementation inventory (`spec-docs/FRANCHISE_REPO_IMPLEMENTATION_INVENTORY.md`) is reserved for the next crosswalk and was not used as evidence in this pass.

## 1. Executive summary

### Specs included

- `spec-docs/MODE_2_CANON_FRANCHISE_SEASON_UPDATED.md`
- `spec-docs/MODE_1_LEAGUE_BUILDER_FINAL.md`
- `spec-docs/OFFSEASON_SYSTEM_SPEC.md`
- `spec-docs/FARM_SYSTEM_SPEC.md`
- `spec-docs/SPINE_ARCHITECTURE.md`
- `spec-docs/MILESTONE_SYSTEM_SPEC.md`
- `spec-docs/PARK_FACTOR_SEED_SPEC.md`
- `spec-docs/PERSONALITY_SYSTEM_SPEC.md`
- `spec-docs/SALARY_SYSTEM_SPEC_UPDATED.md`

### Major requirement families discovered

- Three-mode franchise architecture: Mode 1 League Builder, Mode 2 Franchise Season, Mode 3 Offseason Workshop, plus shared Spine contracts and always-available Almanac consumers.
- Franchise creation and handoff: global templates copied into isolated per-franchise IndexedDB save slots with rules, rosters, schedule, salary ledger, standings, stats stores, NPCs, and metadata initialized.
- GameTracker and event-sourced gameplay: immutable AtBatEvent, BetweenPlayEvent, TransactionEvent, one-tap outcome recording, optional enrichment, replayable downstream state.
- Baseball rules and scoring systems: runner advancement, substitutions, pitching responsibility, fielding attribution, stats accumulation, five WAR components, LI/WPA, clutch, mWAR.
- Season management: standings, editable schedule, trade deadline enforcement, playoffs, season classification, season-end handoff.
- Offseason systems: awards, salary recalculations, expansion, retirement, free agency, annual draft, offseason trades, final roster lock, archive and next-season launch.
- Roster economics: farm system, options, call-ups/send-downs, rookie salary, salary formula, True Value, value delta, ROI, fan/payroll expectations, free-agency swap valuation.
- Narrative and identity systems: reporters, player personalities, hidden modifiers, relationships, chemistry potency, farm storylines, player quotes, designations, fan morale, player morale, milestones, Fame.
- Stadium and analytics: seeded park factors, confidence blending, spray charts, stadium records, park-adjusted WAR.
- Deferred/future surfaces: full AI Game Engine, contraction, cloud sync/accounts, archive-vs-delete, revenue sharing, arbitration, persistent FA marketplace, schedule auto-generation, real-time multiplayer, multi-year contracts.

### Major conflicts and ambiguities discovered

- Offseason phase count conflicts: Mode 1 and Mode 2 references describe 13 phases, while `OFFSEASON_SYSTEM_SPEC.md` v3 defines 11 phases.
- Team Captain criteria conflict: Mode 2 says no tenure minimum; Personality and Offseason specs require veterans with 3+ seasons.
- Chemistry potency conflict: Spine uses a 4-tier dominant-team-percentage model; Mode 2 and Salary use 3 tiers by count per chemistry category.
- Free-agency exchange conflict: Offseason uses True Value within +/-20%; Salary uses salary ranges of 90-110% or 70-100%; Offseason appendix also says +/-10% and grade-based examples.
- True Value formula conflict: Offseason gives WAR-to-dollar plus clutch/fame/grade formula; Salary gives position-relative percentile valuation.
- Park factor conflict: Park seed spec says factors are seeded from BillyYank data and not calculated from KBL game results, while Mode 2/Spine require observed recalculation and confidence blending.
- Mojo enum conflict: Mode 2 defines 6 tiers including `On Fire`; Spine still lists 5 levels and different `LockedIn` spelling.
- Schedule contract ambiguity: Mode 1/Mode 2 say schedules are user-provided or empty/manual; Spine transition contracts still say schedule is pre-generated/generated.
- Farm roster constraint ambiguity: Farm and Offseason say farm is unlimited during season and 10 at Phase 11; Mode 1 roster template uses `farmRosterMax: 10`.
- Contract-control ambiguity: Mode 1/Mode 2 say all contracts are 1 year in v1 and arbitration is future; Farm says called-up prospects begin with 3 years of team control.
- Fan morale scale conflict: Mode 2 uses 0-99; Salary and Spine use 0-100.

No repository implementation status is assigned anywhere in this document.

## 2. Requirement ledger

| ID | Mode(s) | Subsystem | Requirement summary | Status | Spec source and section | Inputs required | Outputs produced | Persistence/state expectations | User-facing expectations | Cross-system dependencies | Notes/conflicts |
|---|---|---|---|---|---|---|---|---|---|---|---|
| FSR-001 | Cross-mode | Architecture / modes | KBL is organized into Mode 1 League Builder, Mode 2 Franchise Season, Mode 3 Offseason Workshop, with Almanac as read-only historical layer. | Required | `SPINE_ARCHITECTURE.md` Sections 1-2; `MODE_1...` Section 1.1; `MODE_2...` Section 1.1 | Franchise lifecycle state | Mode boundaries and handoff expectations | Shared contracts live in Spine; modes own different data writes | Users move from creation to season to offseason; Almanac available at all times | All specs | None. |
| FSR-002 | Mode 1 -> Mode 2 | Franchise save slot / handoff | Franchise creation must copy global template data into a new isolated franchise save slot; template edits do not propagate. | Required | `MODE_1...` Sections 1.5, 12.1, 13.1-13.2; `SPINE...` Sections 6.1-6.2, 7.1 | Selected league, teams, players, rosters, rules, schedule, franchise type | `kbl-franchise-{id}` database, metadata, copied league/team/player data | Copy-not-reference; every franchise record carries franchiseId | "Franchise Created" transition screen before Mode 2 | Storage, schedule, salary, standings, stats stores, NPCs | Spine Section 7.1 says schedule is pre-generated; Mode 1 says user-provided or empty. |
| FSR-003 | Mode 1 | Franchise type / control | Franchise type must be Solo, Couch Co-Op, or Custom; teams receive `controlledBy: human/ai`, affecting experience layer but not GameTracker event validity. | Required | `MODE_1...` Sections 2.1-2.6, 11.5 | User-selected franchise type, human team IDs, AI score-entry setting | Team control flags and phase-scope defaults | Stored in franchise metadata and per-franchise team records | Wizard step for type/team control, AI score-entry toggle, phase-scope review | Schedule, AI simulation, offseason phase scopes, dashboards | Couch Co-Op forces all phases all-teams per Mode 1. |
| FSR-004 | Mode 1 | League templates | Users must view/create/edit/delete/duplicate league templates with teams, conferences/divisions, default rules, branding, and structure constraints. | Required | `MODE_1...` Sections 3.1-3.5 | League name, description, team IDs, conference/division config, rules preset | `LeagueTemplate` with conferences/divisions/team assignments | Global `kbl-app-meta` template data; reusable across franchises | League Builder screens and wizard league selection | Teams module, rules presets, franchise handoff | Leagues are templates; active franchises are isolated copies. |
| FSR-005 | Mode 1 | Teams | Users must create/edit/assign/duplicate/import/delete teams with branding, stadium, league membership, and CSV import validation. | Required | `MODE_1...` Sections 4.1-4.4 | Team fields, CSV columns, duplicate checks | Global team records | Global pool; duplicated teams get independent rosters | CSV upload, preview, validation, confirmation | League templates, stadium/park factors, franchise handoff | Global Team excludes `controlledBy`; franchise teams extend it. |
| FSR-006 | Mode 1 | Players / import / generation | Users must create/edit/generate/import/delete global players with identity, ratings, positions, arsenal, traits, personality, chemistry, fame, salary, and roster level. | Required | `MODE_1...` Sections 5.1-5.9 | SMB4/player CSV data, generated-player config, ratings | Player records; computed grades; player pool | Global player pool copied into franchises | Player editor, import, generated player controls | Salary, traits, personality, farm, draft | Grade is computed, not stored. |
| FSR-007 | Mode 1 | Grade / ratings | Player grades must use 13-grade S through D- scale with position-player 3:3:2:1:1 weights, pitcher 1:1:1 weights, two-way premium, position/trait adjustments. | Required | `MODE_1...` Sections 5.6-5.7; `SALARY...` Sections Base Salary, Summary | Ratings, position, traits | Display grade and salary input basis | Grade derivable from ratings; not stored on Player per Spine | Grade shown in player/draft/roster UI | Salary, draft, scouting, True Value | Salary spec uses same base weighting for salaries. |
| FSR-008 | Mode 1 / cross-mode | Personality / initial traits | Imported/generated players receive one of 7 visible personalities, 4 hidden modifiers, chemistry type, and up to 2 position-appropriate traits; farm traits/true ratings hidden until call-up. | Required | `MODE_1...` Sections 6.1-6.5; `PERSONALITY...` Sections 2-4; `SPINE...` Section 9.4 | Player records, personality weights, Gaussian hidden modifiers, trait pools | Personality, hidden modifiers, traits, chemistry | Hidden modifiers stored but not numerically shown | Personality visible; hidden modifiers surfaced through behavior/reporter hints | Narrative, FA, captain, morale, trait potency, farm | Trait distribution differs in wording: Mode 1 uses 0/1/2 trait percentages; Spine Section 9.3 mentions gold/silver/bronze distribution pending re-analysis. |
| FSR-009 | Mode 1 | Roster templates | League Builder rosters assign players to MLB/farm/free agency with 22-player MLB target, farm list, optional depth chart, and non-blocking validation warnings. | Required | `MODE_1...` Sections 7.1-7.4 | Player assignments, positions | `TeamRoster` and validation warnings | Template roster copied at franchise start | Assign/move players; validation warning UI | Franchise handoff, farm system, Mode 2 lineup | Ambiguity: Mode 1 says `farmRosterMax: 10`; Farm spec says regular-season farm is unlimited. |
| FSR-010 | Mode 1 | Fantasy draft | Fantasy draft must optionally build MLB rosters from a league/all/generated pool using configured format, rounds, order, user-controlled teams, and AI strategy. | Optional | `MODE_1...` Sections 8.1-8.2, 11.6 | Draft config, player pool, team order | Drafted MLB rosters | Franchise setup state before handoff | Wizard roster mode option | Player pool, AI draft strategy, salary baseline | Auction format is listed but not detailed. |
| FSR-011 | Mode 1 / Mode 3 | Startup prospect draft | Startup prospect draft must optionally populate farm rosters after salary calculation using snake order reverse team salary, 10 default rounds, 3x pool, team scouts, and scouted grades. | Optional | `MODE_1...` Sections 8.3-8.8; `FARM...` Sections Farm Roster Structure, Rookie Salary | Team salaries, generated prospects, scouts, human/AI teams | Farm rosters; rookie salaries; scout projections | Farm data copied into franchise; true ratings hidden until call-up | Draft flow with user picks for human teams and AI auto-picks | Salary, farm, scouting, Mode 3 annual draft | If skipped, farms start empty. |
| FSR-012 | Mode 1 | Rules presets | Rules presets must cover game, season, playoffs, DH, roster, awards ceremony, AI sliders, offseason toggles, and four read-only default presets. | Required | `MODE_1...` Sections 9.1-9.3; `SPINE...` Section 3.4 | User preset selection/customization | `RulesPreset` snapshot | Copied into franchise; built-ins read-only | Season/playoff settings wizard controls | Schedule, standings, playoffs, salary, offseason, AI | Mode 1 gamesPerTeam says 8-200; Spine earlier comment says 2-200 in excerpted contract. |
| FSR-013 | Mode 1 / Mode 2 | Schedule setup | Schedule must be user-driven via CSV upload, screenshot/OCR, or manual entry; if none provided, season starts empty and users add games manually. | Required | `MODE_1...` Sections 10.1-10.3; `MODE_2...` Section 22.1 | CSV/OCR/manual games, teams, fictional dates | `ScheduledGame[]` with statuses | Stored in franchise schedule; Mode 2 updates results/status | Upload/OCR review, edit, swap, move, add/remove games | GameTracker, standings, AI simulate, trade deadline | Conflict: Spine Section 7 handoffs say schedules are pre-generated/generated. |
| FSR-014 | Mode 1 | Creation wizard | New Franchise wizard must run 6 steps: league, season, playoffs, franchise type/team control, rosters/salary/draft, confirm/start. | Required | `MODE_1...` Sections 11.1-11.9 | User selections from all setup modules | `FranchiseSetupData` and initialized franchise | Setup state until confirmed; then save slot created | Back/next/cancel validation, no skipping ahead, transition screen | All Mode 1 modules | Playoff Mode has abbreviated flow and skips season settings, roster mode, startup draft. |
| FSR-015 | Mode 1 | Playoff Mode | Playoff Mode must support abbreviated franchise creation: league, playoff settings, team control, seeding, confirm, then start playoffs immediately. | Optional | `MODE_1...` Sections 1.4, 11.8 | League, playoff config, team control, seeding | Playoff-only franchise/playoff start state | Uses current League Builder rosters | Separate "Playoff Mode" entry point | Rules, rosters, GameTracker/playoffs | No season settings or startup draft. |
| FSR-016 | Mode 1 / cross-mode | Franchise management / import-export | Franchise manager must support create/load/delete/rename/list/export/import/get active/set active; app startup loads last franchise or selector; franchise switching closes DB and resets state. | Required | `MODE_1...` Sections 13.4-13.7 | Franchise ID/name/blob/settings | Franchise summaries, exported blob, imported franchise ID | `kbl-app-meta` franchise list and last-used pointer; per-franchise DBs | Franchise selector, import option, migration complete message | Storage, startup, migration | Cloud sync/accounts are future per Mode 1 Section 14. Backup beyond export is not specified. |
| FSR-017 | Cross-mode | Spine entity contracts | Shared Player, Team, League, Franchise, Season, ratings, enums, and core types must define cross-mode data shape and ownership. | Required | `SPINE...` Sections 3.1-3.8 | Entity fields from modes | Canonical shared models | Spine types referenced by all modes | Indirect; consistent app data views | All modes, Almanac | Conflicts with Mode 2 on mojo enum and schedule shape. |
| FSR-018 | Cross-mode | Stats contracts | Batting, pitching, fielding, running, managing, and career stat contracts must be shared; career stats carry forward and players accumulate component WAR. | Required | `SPINE...` Sections 4.1-4.6; `MODE_2...` Section 8 | Event streams and game/season stats | Per-player game/season/career stat objects | Season stats reset; career stats permanent | Stats pages, leaderboards, Almanac | Stats pipeline, WAR, milestones, awards | Some derived stats are explicitly not stored. |
| FSR-019 | Cross-mode | Event streams | AtBatEvent, BetweenPlayEvent, and TransactionEvent are append-only event streams consumed by stats, WAR, clutch, narrative, milestones, roster, morale, and Almanac. | Required | `SPINE...` Section 5; `MODE_2...` Sections 1.3, 2 | Game outcomes, between-play actions, roster transactions | Immutable event records | Append-only; outcome immutable; edits via version/audit in Mode 2 | Event-driven UI and history | All downstream systems | Mode 2 richer AtBatEvent supersedes Spine's compact shape for Mode 2. |
| FSR-020 | Cross-mode | Storage architecture | App must use global `kbl-app-meta` plus isolated `kbl-franchise-{id}` databases with stores for events, stats, standings, salary, narrative, morale, stadiums, current game, and completed games. | Required | `SPINE...` Sections 6.1-6.3; `MODE_1...` Section 13.2 | Franchise ID and mode data | DB stores and storage layout | Per-franchise isolation; delete franchise deletes DB | Indirect; franchise selector/import/export | Save slot, active game, Almanac | No cloud sync in current specs. |
| FSR-021 | Cross-mode | Mode transition contracts | Mode 1 -> Mode 2, Mode 2 -> Mode 3, and Mode 3 -> Mode 2 handoffs must pass snapshot objects with copied state, season summaries, and new-season state. | Required | `SPINE...` Sections 7.1-7.3; `MODE_2...` Section 26.3 | Completed setup, completed season, completed offseason | `FranchiseHandoff`, `SeasonSummary`, `NewSeasonHandoff` | Copy-not-reference snapshots | Transition screens and season launch | All modes | NewSeasonHandoff schedule "Generated for new season" conflicts with user-driven schedule language. |
| FSR-022 | Cross-mode | Trait / chemistry contract | Traits must have chemistry type/effects and team-level potency; chemistry affects strength, not eligibility; potency recalculates on roster changes/trades. | Required | `SPINE...` Sections 9.1-9.4; `MODE_2...` Section 15.5; `SALARY...` Section Chemistry-Tier Trait Potency | Roster chemistry counts, player traits | Effective trait modifiers and salary impact | Trait lifecycle spans initial assignment, farm reveal, roster changes, Mode 3 awards | Trait display/reveal, salary/trade preview | Traits, chemistry, salary, trades | Conflict: Spine 4-tier dominant percentage vs Mode 2/Salary 3-tier category-count model. |
| FSR-023 | Cross-mode | Designation contract | Designation state must track MVP, Ace, Fan Favorite, Albatross, Cornerstone(s), Team Captain, and Fan Hopeful across Mode 2 and Mode 3. | Required | `SPINE...` Section 10; `MODE_2...` Section 17 | WAR, pWAR, value delta, hidden modifiers, farm rankings | Designation state and change events | Projected in-season, locked at season end, carried where specified | Badges, notifications, awards candidates | WAR, salary True Value, farm, morale, narrative | Captain criteria conflict with Personality/Offseason. |
| FSR-024 | Cross-mode | Fan morale contract | Team fan morale must track 60/20/10/10 components, trade scrutiny, low-morale EOS consequences, and carry over with decay. | Required | `SPINE...` Section 11; `MODE_2...` Section 20; `SALARY...` Fan Morale System | Performance, designations, reporter sentiment, roster moves/payroll | Team fan morale state | Written after games/transactions; modified by Mode 3; carried with decay | Morale warnings, fan state, narrative tone | Salary, free agency, player morale, narrative | Scale conflict: 0-99 in Mode 2 vs 0-100 in Spine/Salary. |
| FSR-025 | Cross-mode | Narrative carryover | Reporter state, active storylines, and permanent INSIDER reveals must persist across seasons; reporter morale influence resets/carries per contract. | Required | `SPINE...` Section 12; `MODE_2...` Section 16 | Reporter/player/storyline state | `NarrativeCarryover` | Reporters/storylines persist; morale influence resets | News feeds, reporter stories, hints | Personality, morale, milestones, farm | None. |
| FSR-026 | Cross-mode | Stadium / park contracts | Stadium entities must hold dimensions, live/historical park factors, spray charts, and stadium records; Mode 2 updates and Mode 3 snapshots them. | Required | `SPINE...` Section 13; `MODE_2...` Section 24; `PARK_FACTOR...` Sections 1-4 | Stadium dimensions, events, home/away stats | Park factors, records, spray chart aggregates | Park factors live on Stadium entity; historical snapshots per season | Stadium analytics, spray charts, records | WAR, schedule, GameTracker enrichment, Almanac | Seed vs calculated/refined conflict recorded in CAR-006. |
| FSR-027 | Mode 2 | At-bat event model | Every at-bat must create an AtBatEvent with identity, one-tap result, game/team/batter/pitcher/matchup/park context, computed outcomes, optional enrichment, and edit history. | Required | `MODE_2...` Sections 2.1, 2.5 | Current game state, batter/pitcher, result, context | Complete AtBatEvent | Outcome immutable; enrichment/versioned edits allowed | User taps result; context captured automatically | Stats, WAR, LI/WPA, milestones, narrative, park | Result list includes WP_K/PB_K hybrid and TP. |
| FSR-028 | Mode 2 | Between-play event model | Runner actions, pitcher changes, substitutions, position changes, mojo/fitness, injury, pitch count, and manager moments must be recorded as BetweenPlayEvent. | Required | `MODE_2...` Sections 2.2, 5.1-5.6 | Idle-game actions and state changes | BetweenPlayEvent with type-specific payload | Event stream; timestamps preserve game sequence | Diamond/player/pitcher taps and popovers | Stats, substitutions, inherited runners, mWAR, morale | Balk is manual between-play event. |
| FSR-029 | Mode 2 / Mode 3 | Transaction event model | Roster/franchise moves must be TransactionEvents covering trades, FA signings, releases, call-ups/send-downs, draft picks, retirements, contracts, DFA, IL, etc. | Required | `MODE_2...` Section 2.3; `SPINE...` Section 5.3 | Transaction details and involved players | TransactionEvent with type-specific payload | Franchise transaction history | Roster/transaction UI and narrative hooks | Roster, farm, salary, narrative, Almanac | Mode 2 uses lowercase type enum; Spine uses uppercase enum. |
| FSR-030 | Mode 2 | Game record / active game | GameRecord must hold teams, lineups, starting pitchers, stadium, events, score, completion state, players of game, top moments, manager moments, recap, and depth score. | Required | `MODE_2...` Section 2.4; `SPINE...` Section 6.1 | Game setup, events, completion metadata | GameRecord/completed game | Current game survives refresh; completed games archived | GameTracker session and post-game summary | Schedule, stats, narrative, WPA | Source `currentGame` store implies active-game save/resume; no detailed resume UX specified. |
| FSR-031 | Mode 2 | GameTracker quick bar | Primary Quick Bar must expose K, GO, FO, LO, 1B, BB, 2B, HR, overflow; overflow contains PO, 3B, HBP, E, FC, DP, TP, SAC, SF, IBB, WP_K, PB_K, Balk. | Required | `MODE_2...` Section 3.1 | User tap | AtBatResult selection | Result saved as event | 1-tap primary outcomes; HR optional distance/pitch prompt | Event model, runner defaults | HR is 2 taps only if distance entered; optional enrichment allowed. |
| FSR-032 | Mode 2 | One-tap execution | On tap, system must snapshot context, apply runner defaults, create/save event, fire hooks, update game state, and update display with sub-10ms blocking target. | Required | `MODE_2...` Section 3.2 | Tap outcome and live game context | Saved event, updated bases/score/batter/log | IndexedDB async save; game state updated | Instant response and next batter display | Event log, milestones, clutch, narrative, fame | Performance target is specified as experience requirement. |
| FSR-033 | Mode 2 | Undo / inning flow | Undo must be a configurable 10-state stack with no confirmations; inning change auto-detects 3 outs; game end requires confirmation. | Required | `MODE_2...` Sections 3.3-3.4 | Event stack and snapshots | Reversed event/state/stats; half-inning transition | Snapshots before outcomes/subs/inning end | Undo button with remaining count; optional between-inning summary | Stats pipeline, game state | Game end not undoable. |
| FSR-034 | Mode 2 | Runner overrides | Runner defaults must handle common cases silently, with corrections through diamond/play log and no correction requiring more than 3 taps. | Required | `MODE_2...` Section 3.5 | Result, base state, user corrections | RunnerOutcome, RBIs, runs, outs corrected | Corrections versioned in event history | Inline prompts, runner tap actions | Rules engine, scoring, stats | GO->DP correction is manual via play log. |
| FSR-035 | Mode 2 | iPad layout | Primary platform is iPad landscape with Fenway Board, diamond, play log, Quick Bar, modifier/action zone. | Required | `MODE_2...` Section 3.7 | Game/team/player context | UI layout expectations | UI state during game | Scoreboard/context, diamond, play log, quick bar | GameTracker, narrative, milestones | Layout requirement only, not repo status. |
| FSR-036 | Mode 2 | Enrichment | Enrichment must be optional/non-blocking, available anytime, and add field location, fielding sequence, HR distance, pitch type, pitch counts, and modifiers without affecting core counting correctness. | Optional | `MODE_2...` Sections 4.1-4.5 | Completed play, optional user details | Additional event fields and derived analytics | Versioned edits; enrichment can occur after game or never | Play-log badges/panels, mini-diamond, fielder selectors, pitch selectors | Spray charts, fielding, park factors, pitch count, scouting, narrative | Core counting stats must be correct from Step 1 alone. |
| FSR-037 | Mode 2 | Between-play runner actions | Diamond runner popovers must support steal/CS, pickoff safe/out/error, WP/PB advances, defensive indifference, and manual advance. | Required | `MODE_2...` Section 5.1 | Runner/base state, destination/outcome | BetweenPlayEvent and runner/stat updates | Event stream | Runner tap popover | rWAR, pWAR/fWAR, manager decision/mWAR | Steal attempt also manager decision. |
| FSR-038 | Mode 2 | Manager moments / mWAR input | When LI exceeds default 2.0, system marks Manager Moment without interrupting; next action recorded for season mWAR tracking. | Required | `MODE_2...` Section 5.3; Section 11.5 | LI, decision type, outcome WPA | ManagerMoment event, decision stats | Season decision log / mwarDecisions | Subtle pulsing/indicator, no interruption | LI/WPA, mWAR, narrative | Threshold default 2.0. |
| FSR-039 | Mode 2 | Pitcher and position changes | Pitcher changes and non-substitution position changes must be tappable flows preserving pitch count, IP, inherited runners, current positions, and timestamps. | Required | `MODE_2...` Sections 5.4-5.5, 7.4 | Current pitcher/position state, replacement/move | PitcherChange/position_change events | Event timestamps enable position innings and inherited runs | Scoreboard pitcher tap; diamond move popover | Pitcher stats, Gold Glove, fWAR, mWAR | Pitch count required for outgoing pitcher. |
| FSR-040 | Mode 2 | Baseball rules | Game logic must enforce inning structure, AB counting, run scoring exceptions, force rules, advancement defaults, special plays, stat formulas, and context-sensitive buttons. | Required | `MODE_2...` Sections 6.1-6.8 | Result/base/outs/rules context | Correct runners, scoring, AB/stats, button availability | Derived from events and rules snapshot | Disabled buttons and prompts for special cases | Stats, runner engine, GameTracker UI | Appeal outs included for completeness though SMB4 lacks them. |
| FSR-041 | Mode 2 | Substitution system | Substitutions must support PH, PR, defensive sub, pitching change, double switch, position swap, no re-entry, 9-player lineup, PH must bat, used-player state. | Required | `MODE_2...` Sections 7.1-7.5 | Lineups, bench/bullpen, current game state | Substitution events and lineup state | Event stream; used player availability | Lineup card drag/drop and diamond tap entry points | Pitcher stats, runner responsibility, fielding positions, mWAR | Position swap is one event, not two. |
| FSR-042 | Mode 2 | Stats pipeline | Stats pipeline must process events through game stats, season stats, derived stats, display stats, and career totals with storage tiers. | Required | `MODE_2...` Sections 8.1-8.5; `SPINE...` Section 4 | AtBatEvent/BetweenPlayEvent/GameRecord | Game, season, career, calculated stats and achievements | Current game in IndexedDB + state; season/career persistent | Box scores, season pages, leaderboards | WAR, milestones, standings, Almanac | Mode 2 labels four layers while text says three-layer architecture. |
| FSR-043 | Mode 2 | Pitching stats / decisions | Pitcher stats must count BF, outs, hits, BB/IBB, HBP, HR, IP as outs, first-inning runs, inherited runners, W/L, saves, holds, blown saves, achievements, pitch counts. | Required | `MODE_2...` Sections 9.1-9.8 | At-bat results, pitcher changes, pitch counts, game outcome | Pitching lines, decisions, achievements | Stored as outs; pitch counts captured/estimated/validated | Prompts on pitcher removal/end game; warnings for pitch counts | Stats, pWAR, milestones, narrative | Starter win minimum scales by scheduled innings. |
| FSR-044 | Mode 2 | Fielding logic | Fielding system must define chance rules, fielder inference matrices, DP chains, star play categories, error categories, run values, fWAR calculation, and FieldingPlay records. | Required | `MODE_2...` Sections 10.1-10.8 | Result, direction, enrichment, LI, fielder sequence | Fielding stats, fWAR credit/penalty, web gem flags | FieldingPlay records with inferred/overridden status | Fielding enrichment selectors and error tagging | fWAR, Gold Glove, milestones, fame | Web gems engine-derived, not user-tagged. |
| FSR-045 | Mode 2 | WAR system | WAR must include bWAR, pWAR, fWAR, rWAR, mWAR with season scaling, park factors, replacement levels, LI reliever multiplier, manager decision/overperformance split, and calibration. | Required | `MODE_2...` Sections 11.1-11.6; `SPINE...` Section 8.2 | Stats, park factors, LI, decisions, team expected/actual win pct | Component WAR and total WAR | Season and career WAR in stats/career stores | WAR display, award candidates, designations | Stats, salary, milestones, awards, manager moments | No configurable WAR weights per deferred list. |
| FSR-046 | Mode 2 | LI / WPA | System must calculate LI from base-out state, inning multiplier, score dampener, SMB4 shorter-game adaptation, and store WPA on every AtBatEvent. | Required | `MODE_2...` Sections 12.1-12.5 | Game state before/after play | LI, winProbabilityBefore/After, WPA | Stored on AtBatEvent | Top moments/player of game/WPA chart | Clutch, pWAR, mWAR, fielding, narrative | LI capped 0.1-10.0 in approximation. |
| FSR-047 | Mode 2 | Clutch attribution | Clutch must use straight WPA as top-level metric, retain Contact Quality for attribution splits, support arm factor, manager decision clutch, trigger stacking, playoff multipliers, and clutch stats. | Required | `MODE_2...` Sections 13.1-13.8 | WPA, LI, play type, CQ, actor roles, playoff context | PlayerClutchStats and attribution | Season clutch totals | Clutch highlights and stats | WPA, fielding, manager decisions, awards | Relationship between old trigger bonuses and WPA stats may need reconciliation. |
| FSR-048 | Mode 2 | Mojo / fitness / injuries | Mojo and fitness changes are user-observed only; system records states, splits, history, Juiced rules, injury events, fame/WAR/clutch modifiers. | Required | `MODE_2...` Sections 14.1-14.11 | User-selected states, game participation, modifiers/events | Mojo/Fitness history, splits, adjusted fame/WAR/clutch | BetweenPlayEvent and PlayerMojoFitness state | Player token state popovers | Narrative, performance splits, fame, WAR, modifier registry | Conflict: Spine has 5-tier mojo; Mode 2 has 6-tier with On Fire. |
| FSR-049 | Mode 2 | Modifier registry | All special events must be represented as modifiers with triggers, conditions, effects, durations, stacking, caps, and narrative tags. | Required | `MODE_2...` Sections 15.1-15.5 | Triggering events/conditions | Active modifiers and effects | Durations decrement after games; expired removed | Modifier tray / narrative events | Mojo, ratings, relationships, fame, morale, traits, narrative | Cap total single-stat modifier at +/-30%. |
| FSR-050 | Mode 2 | Narrative system | Each team has a beat reporter with hidden personality, alignment, trust, reveal level, morale influence, hiring/firing, LLM routing, quotes, narrative records, and UI surfaces. | Required | `MODE_2...` Sections 16.1-16.10; `SPINE...` Section 12 | Events, stats, reporter/player personality, story context | Narratives, quotes, reporter state, morale influence | Reporter/storyline state persists; INSIDER reveals permanent | X feed, Tootwhistle Times, post-game summary, pop-up notifications | Morale, milestones, farm, relationships, LLM/local generation | Cloud LLM routing specified as 50/50 but provider/runtime not specified. |
| FSR-051 | Mode 2 | Dynamic designations | MVP, Ace, Fan Favorite, Albatross, Cornerstone, Captain, Fan Hopeful must calculate/lock/carry over with visual badges, change notifications, morale effects, and data schemas. | Required | `MODE_2...` Sections 17.1-17.14; `SPINE...` Section 10 | WAR, pWAR, value delta, hidden modifiers, farm top prospects | Designation statuses and change events | Projected after games; locked at season end; carryover per designation | Dotted/solid badges, notifications | Salary True Value, morale, narrative, farm, awards | Captain conflict: no minimum in Mode 2 vs 3+ seasons elsewhere. |
| FSR-052 | Mode 2 / milestone spec | Milestones / fame | Milestones must detect single-game, season, career, franchise firsts/leaders, team milestones, positive/negative Fame, adaptive thresholds, multi-threshold crossings, and data records. | Required | `MODE_2...` Section 18; `MILESTONE...` Sections 1-11 | Stats/events, rules config, franchise history | AchievedMilestone records, Fame changes, morale/fan effects | Stored in milestones and event records; career/franchise history | Milestone alerts, celebrations, watch/summaries if UI exists | Fame, narrative, morale, awards, Almanac | `MILESTONE...` implementation-status prose is not repo status here. Some UI is explicitly deferred there. |
| FSR-053 | Mode 2 | Fan Favorite / Albatross trade mechanics | Albatross players receive 15% trade discount; Fan Favorite trade-away creates amplified negative fan morale and carries designation to acquiring team for season remainder. | Required | `MODE_2...` Sections 19.1-19.2 | Designation and trade value | Adjusted trade value, morale effects, designation carryover | Transaction and designation state | Trade preview/reaction | Salary True Value, trades, fan morale | Salary/free-agency specs contain different valuation rules. |
| FSR-054 | Mode 2 | Fan morale | Fan morale must use weighted formula, scale states, selected event catalog, contextual modifiers, trade scrutiny, decay/recovery, franchise health warnings, EOS modifiers, and data model. | Required | `MODE_2...` Sections 20.1-20.9; `SALARY...` Fan Morale | Performance, designations, reporter, roster moves, payroll, events | TeamFanMorale and morale events | Daily snapshots, history, trade aftermaths | Warning indicators, narrative tone, morale UI | Player morale, FA attractiveness, salary, narrative | Scale and FA attractiveness wording conflict with Salary/Spine. |
| FSR-055 | Mode 2 | Standings / playoffs | Mode 2 must compute standings from game results, tiebreak by run differential then user decision, enforce configurable playoff bracket/series settings, magic/elimination numbers, clinch/elimination events. | Required | `MODE_2...` Sections 21.1-21.5; `MODE_1...` Section 9.2 | Game results, league structure, rules snapshot | StandingsEntry, playoff bracket/status, clinch/elimination | Recompute after every completed game | Standings tables, playoff bracket, user tie prompt | Schedule, fan morale, narrative, awards | "PlayoffBracket" referenced but detailed state machine not in included specs. |
| FSR-056 | Mode 2 | In-season schedule / simulate / trade deadline | Schedule view must support next-game auto-pull, SCORE GAME for user games, SIMULATE for AI-vs-AI games, statuses, season classification, game increment, and trade deadline blocking. | Required | `MODE_2...` Sections 22.1-22.6 | Schedule, control flags, game statuses, rules trade deadline | Updated schedule, simulated/manual classifications, rejected trades | Schedule stored in franchise and updated in season | SCORE GAME/SIMULATE buttons; add/edit/move/remove games; deadline messages | GameTracker, AI, transactions, narrative | Full AI engine is deferred; V1 simplified box-score generator mentioned. |
| FSR-057 | Mode 2 | Adaptive standards | System must calculate opportunity/game/innings factors, scaling rules, SMB4 defaults, qualification thresholds, minimum floors, and position-specific adjustments. | Required | `MODE_2...` Sections 23.1-23.6; `SPINE...` Section 8; `MILESTONE...` Section 2 | Rules config, league data | Scaled thresholds, qualification minimums, constants | OpportunityFactor stored in metadata per Spine | Indirect displays for milestones/leaderboards | Milestones, WAR, awards, Almanac | Minimum floors include universal floor 10 but also seasonHR floor 5; ambiguity on precedence. |
| FSR-058 | Mode 2 / cross-mode | Park factors / stadium analytics | Park factors must include overall/stat/split/direction factors, activate after 40% of season, blend seed/calculated by confidence, feed spray charts, stadium records, and WAR adjustments. | Required | `MODE_2...` Sections 24.1-24.7; `SPINE...` Section 13; `PARK_FACTOR...` Sections 1-4 | Stadium seed data, home/road stats, batted ball enrichment | ParkFactors, spray charts, records, park-adjusted WAR | Recalculated after games; season snapshots | Stadium analytics and heat maps | GameTracker enrichment, WAR, narrative, Almanac | Park seed spec says seeded/not calculated, then optionally refined; Mode 2 requires confidence blending. |
| FSR-059 | Mode 2 | AI game engine | AI Game Engine target simulates AI-vs-AI games only, produces GameRecord source `SIMULATED`, uses seeded PRNG, variance, park factors, and supports unsimulate. Full architecture deferred to V2. | Deferred | `MODE_2...` Sections 25.1-25.7, 27; `MODE_1...` Sections 2.1-2.4 | Scheduled AI game, rosters, ratings, stadium, seed/options | SimulatedGameResult/GameRecord, stats, milestone/narrative triggers | Simulated stats flow through pipeline; unsim removes stats if allowed | SIMULATE button for AI-only games | Schedule, stats, park factors, narrative, milestones | V1 simplified box-score generator mentioned but detailed spec is target V2. |
| FSR-060 | Mode 2 -> Mode 3 | Season-end handoff | At season end, Mode 2 must produce SeasonSummary with standings, playoffs, player season/career stats, designations, fan morale, milestones, park factors, season classification, narrative highlights. | Required | `MODE_2...` Sections 1.5, 26.3; `SPINE...` Section 7.2 | Completed regular season/playoffs | SeasonSummary snapshot | Copy-not-reference into Mode 3 | Season-end transition | Offseason phases, awards, salary, archive | None. |
| FSR-061 | Mode 3 | Offseason phase sequence | Offseason must process season end, awards, salary recalcs, expansion, retirements, free agency, draft, trades, finalize/advance according to its phase sequence. | Ambiguous | `OFFSEASON...` Sections 1, 3-13; `MODE_1...` Section 2.5; `MODE_2...` Section 28 | SeasonSummary, rules/offseason toggles, rosters | OffseasonState and phase outputs | Current phase/progress and event data | Phase list and confirmations | All offseason systems | Conflict: Offseason spec defines 11 phases; Mode 1/Mode 2 references 13. |
| FSR-062 | Mode 3 | Offseason interaction model | Offseason UI must support Game Night ceremonies, dice rolls, wheel spins, card reveals, ceremonies, selections, confirmations, review, streamlined/custom modes, and multiplayer considerations. | Required / Optional for Streamlined | `OFFSEASON...` Sections 2.1-2.6 | Phase context and user setting | Interaction state and resolved outcomes | Offseason settings | Dramatic group UI or batched summaries; optional audio cues | Awards, FA, retirements, draft, expansion, HOF | Streamlined/custom modes optional. |
| FSR-063 | Mode 3 | Phase 1 season end | Phase 1 must calculate final standings, playoff seeds, division winners, wildcard slots, postseason MVP if applicable, champion, champion counts, +1 Fame for champions, and mojo reset. | Required | `OFFSEASON...` Sections 3.1-3.4 | Final standings/playoff results/stats | Seeds, champion, postseason MVP, Fame, reset mojo | OffseasonState Phase 1 | Confirmation and optional Postseason MVP reveal/selection | Awards, Fame, stats, Mode 2 handoff | "Normal" mojo term conflicts with Mode 2 `Neutral`. |
| FSR-064 | Mode 3 | Awards ceremony | Phase 2 must process league leaders, Gold/Platinum/Booger Gloves, Silver Sluggers, Reliever, Bench, ROY, Cy Young, MVP, Manager, Kara Kawaguchi, Bust, Comeback, trait/reward assignments, and trait replacement. | Required unless ceremony toggled off/team-only | `OFFSEASON...` Sections 4.1-4.6; `MODE_1...` Section 9.2 awardsCeremony | Season stats, WAR, clutch, team success, fame, candidates | Awards, traits, rating boosts/penalties, Fame | Awards history and player trait/rating state | Card reveals, selections, wheel spins, summary if streamlined | Stats, WAR, fielding, mWAR, salary, traits | Ceremony display can be full/team_only/off via rules. |
| FSR-065 | Mode 3 / salary | Triple salary recalculation | Salaries recalculate at Phases 3, 8, and 10: post-awards, post-draft, post-trades, producing current baselines and Phase 11 signing priority. | Required | `OFFSEASON...` Sections 5, 10, 12; `SALARY...` Salary Recalculation Schedule | Player ratings, stats, traits, fame, team composition, roster changes | SalaryRecalcResult, total salary, adjustments | Salary ledger/history; next-season baseline | Summary tables | Salary formula, draft, trades, Phase 11 | True Value formula conflict between Offseason and Salary specs. |
| FSR-066 | Mode 3 | Expansion and stadium changes | Phase 4 expansion is optional/user-initiated; if used, configure team, protected players, expansion draft, initial expectations; existing teams may optionally change stadium once per offseason. | Optional | `OFFSEASON...` Sections 6.1-6.5; `SALARY...` Expansion Draft System | User expansion choice, team config, protected players, stadium choice | New team, expansion roster, stadium changes, morale penalty | ExpansionEvent/StadiumChangeEvent; park factors reset to seed | Expansion and stadium-change UI | Rosters, park factors, salary, fan morale | Contraction removed/future. |
| FSR-067 | Mode 3 | Retirement | Phase 5 must calculate age-ordered retirement probabilities targeting 1-2 retirees/team, show probabilities, reveal retirements, recalc probabilities, leave empty roster slots, and track retired player data. | Required if retirement enabled | `OFFSEASON...` Sections 7.1-7.4, 17.2; `PERSONALITY...` Section 5.4 | Age, roster, service/career data, hidden resilience/morale if used | RetiredPlayer records, empty slots | Player status/roster slots updated | Dice/button reveal by team | Draft, Phase 11 roster fill, HOF, jerseys, personality | Personality spec says low resilience increases retirement probability; Offseason formula shown only age-order. |
| FSR-068 | Mode 3 / Almanac | Jersey retirement and HOF museum | Upon retirement, user may retire jerseys for any teams played for; HOF is separate museum tab, manual, available any time, not decided at retirement. | Optional / user-discretionary | `OFFSEASON...` Sections 7.5-7.7, 16.1-16.4 | Retiree career/team history, user choices | JerseyRetirement and HOFInduction records | Retired numbers and HOF records persist | Jersey ceremony, retired-number team display, HOF museum | Almanac, team pages, retirement | HOF automatic eligibility is explicitly not required. |
| FSR-069 | Mode 3 | Free agency | Phase 6 must run two complete FA rounds where each team protects one player, top 11 non-protected players get 2-12 dice assignments, departing player destination follows personality, and receiving team returns matching value. | Required if FA enabled | `OFFSEASON...` Sections 8.1-8.7; `PERSONALITY...` Section 5.1; `SALARY...` Salary Integration with Free Agency | Rosters, protected player, dice roll, personality, season stats, true value/salary | FAMove records and roster exchanges | OffseasonState freeAgencyMoves and transaction history | Protection UI, dice roll, destination card, return-player selection | Personality, salary/True Value, trades/rosters, morale | Valuation conflict: +/-20% True Value vs salary-based 90-110/70-100 vs appendix +/-10/grade. |
| FSR-070 | Mode 3 | Annual draft | Phase 7 must optionally add inactive players, generate fictional draft class (max A-, average B-, min 2 per position), order teams by reverse average expected WAR, enforce pick/release rules, and retire undrafted released players. | Required if draft enabled | `OFFSEASON...` Sections 9.1-9.6; `MODE_1...` Sections 8.4-8.6; `FARM...` Draft Integration | Roster gaps, name database, inactive players, expected WAR/salary proxy, team rosters | Draft class, DraftPick records, released/retired players | OffseasonState draftPicks; roster/farm changes | Prospect list, selection/pass, release if full, completion summary | Farm, salary, scouting, Phase 11 | Draft generation differs between Mode 1 startup distribution and Offseason annual generation. |
| FSR-071 | Mode 3 | Offseason trades | Phase 9 trade window opens after salary recalc #2; users can view market, propose trades, accept/counter/reject AI proposals; no salary matching; AI evaluates needs/surpluses; chemistry changes shown. | Required if trade phase enabled | `OFFSEASON...` Sections 11.1-11.5 | Current rosters/salaries, team needs/surpluses, proposals | OffseasonTrade records and roster changes | Transaction history and OffseasonState | Trade market UI with incoming/pending proposals | Salary, chemistry, AI, fan morale, narrative | Full trade system delegated to `TRADE_SYSTEM_SPEC.md`, not included in this pass. |
| FSR-072 | Mode 3 / farm | Phase 11 finalize and advance | Finalize must cut all teams to exactly 22 MLB/10 farm, create released-player pool, run signing round by reverse expected WAR/total salary, optional cut-and-sign round, lock rosters, retire unclaimed players, archive season, reset seasonal state/options, and launch new season. | Required | `OFFSEASON...` Sections 13.1-13.8; `FARM...` Offseason Roster Requirements; `SPINE...` Section 7.3 | Post-trade rosters, salary totals, released pool | Locked rosters, claims, cut/sign actions, archived season, new-season state | Season archive; stats reset; career preserved; options reset | Cut-down UI, signing round UI, roster lock, Season Ready screen | Farm, salary, roster validation, Mode 3 -> Mode 2 handoff | Phase number conflicts with Mode 1's 13-phase model. |
| FSR-073 | Mode 3 | Offseason data models | Offseason state must track phase progress, awards, salary recalcs, expansion, retirees, jerseys, FA moves, draft picks, trades, cut-down releases, claims, validation, and ready status. | Required | `OFFSEASON...` Section 17 | Phase outputs | OffseasonState and typed records | Persisted through offseason | Phase progress/summary | All offseason phases | Data model still includes ContractionEvent despite contraction removed. |
| FSR-074 | Mode 2 / Mode 3 | Farm roster and options | Every team has farm roster; farm is unlimited during regular season, 10 at Phase 11; MLB roster 22; players have max 3 options/send-downs per season; out-of-options players must stay MLB or be released. | Required | `FARM...` Sections Overview, Farm Roster Structure, Options System; `OFFSEASON...` Section 1 Roster Requirements | Roster levels, option tracking, dates | FarmRoster, OptionsTracking | Options reset each new season; farm cut down at Phase 11 | Roster/farm view and move validation | Phase 11, call-up/send-down, roster rules | Mode 1 template says farm max 10. |
| FSR-075 | Mode 2 / Mode 3 | Farm player reveal and rookie salary | Farm prospects show scouted grade only; true ratings/traits reveal on call-up; rookie salary is set at draft by round and does not update on reveal until EOS after first full MLB season. | Required | `FARM...` Sections Call-Up Rating Reveal, Rookie Salary; `MODE_1...` Sections 6.5, 8.7 | Scouted grade, hidden true ratings/traits, draft round | MLB player with revealed ratings; locked rookie salary | Salary fixed until EOS; traits/ratings visibility changes | Call-up reveal | Salary, scouting, farm, Mode 1/3 draft | Farm says 3 years control, conflicting with one-year contracts/arbitration future. |
| FSR-076 | Mode 2 | Call-up/send-down warnings and swaps | Call-ups/send-downs must show blocking beat-reporter warning modals when narrative/morale/relationship risks exist; no-data call-ups execute immediately; swaps combine call-up and send-down with projected effects. | Required / conditional UI | `FARM...` Sections Roster Management, Send-Down, Swap Transaction, UI Considerations | Player relationships, designations, storylines, morale, roster move | CallUpEvent/SendDownEvent/RosterSwap and effects | Transaction history, morale, option/demotion history | Warning modal, proceed/cancel, swap modal | Narrative, reporter, designations, morale, retirement risk, salary | Warning appears only if trigger conditions exist. |
| FSR-077 | Mode 2 / Mode 3 | Demotion history and attrition | Send-downs must hit morale, increment demotion count, assess immediate veteran retirement risk, track demotion history, and increase offseason retirement/FA motivation risk. | Required | `FARM...` Sections Send-Down, Demotion History Tracking, End-of-Season Effects, Free Agency Motivation | Age, service, salary, awards, demotion counts, albatross status | Demotion history, retirement risk, FA motivation/behavior | Cumulative per-player history | Retirement-risk warning and narrative hooks | Retirement, FA, morale, roster | Contracts still count against payroll; no mid-season FA leaving. |
| FSR-078 | Mode 2 | Farm fan/player morale | Farm moves must affect fan morale by team context/designations and player morale by call-up/demotion/passed-over/stuck-in-minors/playoff roster, with morale-performance modifier. | Required | `FARM...` Sections Fan Morale Effects, Player Morale Effects | Team record/playoff status, prospect potential, designations, demotion count, morale | Fan morale delta, player morale state, performance modifier | Morale history | Projected effects in roster swap modal | Fan morale, player morale, designations, narrative | Farm uses morale performance modifier while Mode 2 playerMorale says morale does not directly affect clutch but can suggest ratings. |
| FSR-079 | Mode 2 / Mode 3 | Revenge arc | Traded-player tracker must apply diminishing original-team happiness/mWAR hits and LI boosts when traded players outperform or face former teams, with narrative headlines. | Required | `FARM...` Sections The Revenge Arc System | Trade data, original/new team, value delta, albatross/fan favorite flags | RevengeEffect, LI boost, narrative seeds | Tracked seasons after trade | Revenge headlines and game context | Salary True Value, LI, mWAR, fan morale, narrative | Effects diminish but never reach zero. |
| FSR-080 | Mode 2 / Mode 3 | Farm relationships and storylines | Farm players must support cross-level relationships, farm-only relationships, storylines, call-up/send-down recommendations, narrative headlines, and AI event prompt context. | Required | `FARM...` Sections Farm System Narratives, Integration with AI Event Generation | Player personality, age, position, morale, relationships, storylines, roster context | Recommendations, storyline resolutions, narrative prompts | Relationships/storylines stored and carried | Reporter stories, recommendation UI if surfaced | Narrative, personality, morale, AI event generation | Large narrative surface; no v1 scope decision made. |
| FSR-081 | Mode 2 / Mode 3 | Farm mechanical events | Farm players can receive morale, personality, relationship, trait, position, pitch, injury, cosmetic/name changes; stat changes shift rating buckets; injuries block call-up; effects carry to MLB on call-up. | Required | `FARM...` Sections Mechanical Effects for Farm Players | AI/narrative events, farm player state | Farm stat changes, injuries, carryover MLB player | Farm state persists; carried to MLB on promotion | Farm roster details and injury/call-up eligibility | Narrative, farm, roster, injuries, salary | `promoteProspectToMLB` salary-by-rating conflicts with earlier draft-round salary lock. |
| FSR-082 | Mode 1 / Mode 2 / Mode 3 | Salary formula | Salary must calculate from ratings, position, age, traits, performance, fame, and FA-only personality, with minimum $0.5M and special pitcher batting/two-way handling. | Required | `SALARY...` Sections Overview through Fame Modifier, Personality Modifier, Summary | Player ratings/position/age/traits/stats/expectations/fame/personality/DH context | Current salary | Salary ledger and player salary fields | Salary displays and recalculation summaries | Rules DH, traits, fame, performance, FA | Salary spec says single-season salaries; Farm says 3 years team control. |
| FSR-083 | Mode 2 / Mode 3 | True Value / value delta | True Value must represent what salary should be based on actual performance, position-relative peer valuation, and drives Fan Favorite, Scapegoat/Albatross, trade value, EOS adjustments, and ROI. | Required | `SALARY...` True Value Calculation, ROI Leaderboards; `MODE_2...` Sections 17.3-17.4; `OFFSEASON...` Section 5.2 | Season WAR, peer pools, salaries, contract value, league context | True Value, valueDelta, valueOverContract, ROI | Current season valuation and salary history | Best/Worst Value leaderboards; designation badges | Designations, trades, salary recalcs, fan morale | Conflict with Offseason WAR*$8M plus clutch/fame/grade formula. |
| FSR-084 | Mode 2 / Mode 3 | Salary updates / payroll morale | Salary recalculates on game completion, fame events, trait changes, All-Star selection, random ratings events, awards, EOS, and offseason phases; payroll expectations affect fan morale and manager fire risk. | Required | `SALARY...` Real-Time Salary Updates, Fan Morale System, Salary Recalculation Schedule | Trigger events, payroll percentile, performance delta | SalaryChange logs, fan morale, fire risk | Salary ledger and fan morale state | Salary update logs, fan morale thresholds, manager firing outcome | Fan morale, manager/NPC, awards, stats | Manager firing is in Salary spec; manager mechanical effects otherwise TBD in Mode 1. |
| FSR-085 | Mode 3 | Salary integration with FA | FA return packages must use salary-based swap requirements and allow multi-player swaps. | Ambiguous | `SALARY...` Salary Integration with Free Agency; `OFFSEASON...` Section 8.6 and Appendix B | Outgoing salary, team records, return package | Salary range and eligible return package | FA move/transaction | Return-player selection | Free agency, salary | Conflicts with Offseason +/-20% True Value and Appendix +/-10/grade rules. |
| FSR-086 | Mode 1 / Mode 2 / Mode 3 | Personality system | All players have 7 visible types and 4 hidden modifiers generated with weights/biases; hidden modifiers surface through behavior/reporter hints and affect FA, morale, captain, retirement. | Required | `PERSONALITY...` Sections 1-5; `MODE_1...` Section 6; `OFFSEASON...` Sections 14-15 | Player creation/import/draft | PersonalityType and hidden modifiers | Stored on players; hidden numbers not shown | Visible type, behavioral hints, reporter hints | FA, morale, captain, retirement, narrative, farm | Team Captain tenure conflict. |
| FSR-087 | Mode 2 / Mode 3 | Relationships / chemistry | Relationships must include MLB/farm cross-level and farm-only types; chemistry types affect trait potency and salary/gameplay value. | Required | `FARM...` Farm System Narratives; `SPINE...` Section 9; `MODE_2...` Section 15.5; `SALARY...` Chemistry-Tier Trait Potency | Player personalities, roster composition, relationship state | Relationship events, potency levels, modifier values | Relationship store; potency recalculated on roster changes | Narrative stories, trade previews | Traits, salary, morale, narrative | Chemistry formula conflict as above. |
| FSR-088 | Mode 2 / Mode 3 | Park factor seed | Park factors must be seeded from BillyYank SMB4 23-stadium data, activate after 40% season, adjust HR/runs/hits/ERA and WAR, and optionally refine with observed data. | Required / ambiguous | `PARK_FACTOR...` Sections 1-4; `MODE_2...` Section 24 | Stadium dimensions and season games | Initial/refined park factors; adjusted stats | Factors stored on Stadium and snapshots | Stadium analytics, stat comparisons | WAR, GameTracker enrichment, schedule | Key principle says seeded, not calculated; Section 3.3 says optionally refined; Mode 2 requires confidence blending. |
| FSR-089 | Mode 2 / Mode 3 / Almanac | Milestone scope and detection | Milestone definitions must cover positive/negative single-game, season, career, franchise firsts/leaders, team milestones, multi-threshold crossings, immediate detection timing, data structures, and morale/fan/simulation effects. | Required / some UI deferred | `MILESTONE...` Sections 1-11; `MODE_2...` Section 18 | Events/stats, thresholds, config, franchise history | AchievedMilestone, Fame events, morale/fan effects | Milestone records and franchise leader trackers | Alerts, celebrations, watch/summaries where not deferred | Fame, narrative, morale, awards, Almanac | UI design deferred in `MILESTONE...` Implementation Status; no repo status assigned. |
| FSR-090 | Mode 2 / Mode 3 | Import/export/backup/sync | Export/import franchise is specified; cloud sync/accounts and archive-vs-delete are future; no separate backup/sync workflow is specified beyond export/import. | Required / deferred | `MODE_1...` Sections 13.4, 14 | Franchise blob/data | Exported blob/imported franchise | `kbl-app-meta` and per-franchise DB | Import Franchise option; no sync UI specified | Storage, franchise selector | Cloud sync/accounts future; archive-vs-delete future. |

## 3. Subsystem sections

### Mode 1 league setup and handoff

Relevant requirements: FSR-002 through FSR-016, FSR-021.

- Mode 1 is a one-time setup hub. It creates a franchise save slot, league structure, rosters, farm rosters, rules, schedule, franchise type, initialized subsystems, and named NPCs (`MODE_1...` Sections 1.1-1.2).
- League/team/player/rules data lives globally until "Start Franchise", then is copied into the isolated franchise DB (`MODE_1...` Sections 12.1, 13.1-13.2).
- The creation wizard is the primary path; Playoff Mode is a separate abbreviated path (`MODE_1...` Sections 11.1-11.8).
- Handoff initializes salary ledger, standings, schedule, stats stores, beat reporters, managers, scouts, and metadata (`MODE_1...` Sections 12.1-12.3).

### Franchise identity / spine / save slot

Relevant requirements: FSR-001, FSR-002, FSR-016 through FSR-026.

- Spine defines core entity models, storage boundaries, event streams, handoff contracts, shared enums, IndexedDB stores, and cross-mode ownership (`SPINE...` Sections 1, 3, 6, 7).
- Each franchise is isolated in `kbl-franchise-{id}`; app-level templates and franchise list live in `kbl-app-meta` (`SPINE...` Section 6.1).
- Save slots support create/load/delete/rename/list/export/import/active-franchise behavior (`MODE_1...` Section 13.4).
- The app startup flow resumes the last used franchise or shows a franchise selector; switching closes the current DB and resets in-memory state (`MODE_1...` Sections 13.5-13.6).

### GameTracker and event model

Relevant requirements: FSR-019, FSR-027 through FSR-035.

- GameTracker events are the primary Mode 2 source of truth, with AtBatEvent and BetweenPlayEvent forming immutable gameplay streams (`MODE_2...` Sections 1.3, 2.1-2.2).
- One-tap recording captures result first, then optional enrichment later; core counting stats must be correct from the outcome tap alone (`MODE_2...` Sections 1.2, 3.2, 4.1).
- GameRecord holds the full active/completed game state, events, lineups, score, and recap/top-moment metadata (`MODE_2...` Section 2.4).

### Enrichment and between-play events

Relevant requirements: FSR-036 through FSR-039.

- Enrichment is optional, never blocking, and available immediately, between innings, after game, or never (`MODE_2...` Section 4.4).
- Enrichment types include spray location, fielding sequence, HR distance, pitch type, pitch counts, and modifiers (`MODE_2...` Section 4.3).
- Between-play events include runner actions, substitutions, manager moments, pitcher changes, position changes, mojo/fitness changes, pitch counts, and injury events (`MODE_2...` Sections 2.2, 5.1-5.6).

### Rules/runner/substitution/fielding logic

Relevant requirements: FSR-034, FSR-040, FSR-041, FSR-044.

- Baseball rules include AB counting, run-scoring exceptions, force-play logic, runner advancement defaults, D3K, IFR, SF, SAC, GRD, tag-up, and button availability (`MODE_2...` Sections 6.1-6.8).
- Substitutions support lineup-card and diamond-tap entry points, no re-entry, double switches, pinch runners, pitching changes, and position swaps (`MODE_2...` Sections 7.1-7.5).
- Fielding logic defines chance boundaries, fielder inference, DP chains, star play categories, errors, run values, fWAR, and FieldingPlay records (`MODE_2...` Sections 10.1-10.8).

### Stat pipeline and WAR

Relevant requirements: FSR-018, FSR-042 through FSR-045.

- Stats flow from events to game stats, season stats, derived stats, display stats, and career stats (`MODE_2...` Sections 8.1-8.4).
- Pitching decisions and achievements require stored outs, inherited runners, save/hold/blown save rules, pitch counts, and scaled achievements (`MODE_2...` Sections 9.1-9.8).
- WAR consists of bWAR, pWAR, fWAR, rWAR, and mWAR; no component double-counting; all support season scaling/calibration (`MODE_2...` Section 11).

### WPA / LI / clutch / manager WPA

Relevant requirements: FSR-038, FSR-046, FSR-047.

- LI is calculated from base-out state, inning progress, score context, and shorter-game adaptation (`MODE_2...` Sections 12.1-12.4).
- WPA equals winProbabilityAfter minus winProbabilityBefore and is stored on every AtBatEvent (`MODE_2...` Section 12.5).
- Clutch uses straight WPA as the top-level metric, with CQ retained for attribution splits and manager decisions feeding mWAR (`MODE_2...` Sections 13.1-13.8).

### Standings / schedule / playoffs

Relevant requirements: FSR-012, FSR-013, FSR-055, FSR-056.

- Standings recompute after every completed game and include W/L, pct, GB, streak, last10, home/away/division records, run differential, Pythagorean win pct, magic/elimination numbers, and playoff status (`MODE_2...` Section 21.1).
- Tiebreaker is run differential; if still tied, user decides (`MODE_2...` Section 21.2; `MODE_1...` Section 9.2).
- Playoff settings are copied from Mode 1 rules and can configure teams, format, round lengths, home-field format, and reseeding (`MODE_2...` Section 21.3; `MODE_1...` Section 9.2).
- Schedule is user-provided/editable and supports SCORE GAME or SIMULATE buttons by control type (`MODE_2...` Sections 22.1-22.3).

### Active-game save-load-resume if specified

Relevant requirements: FSR-020, FSR-030, FSR-032, FSR-042.

- Current game is stored in IndexedDB and React state and "survives refresh" (`MODE_2...` Section 8.5).
- Spine specifies a `currentGame` store for active game snapshots and `completedGames` for archived game results (`SPINE...` Section 6.1).
- The specs imply active-game autosave/load/resume through storage, but do not provide a detailed resume UX beyond storage/state expectations.

### Roster / farm / Phase 11

Relevant requirements: FSR-009, FSR-011, FSR-072, FSR-074 through FSR-081.

- During the regular season, farm rosters are unlimited; Phase 11 enforces 22 MLB / 10 farm (`FARM...` Overview and Farm Roster Structure; `OFFSEASON...` Section 13).
- Players may be optioned at most 3 times per season (`FARM...` Options System).
- Call-ups reveal true ratings/traits and begin/continue rookie salary treatment; send-downs affect morale, demotion history, retirement risk, and FA motivation (`FARM...` Roster Management).
- Phase 11 cut-down, released pool, signing round, optional cut-and-sign, final lock, archive, and options reset prepare the next season (`OFFSEASON...` Sections 13.1-13.8).

### Offseason phases

Relevant requirements: FSR-061 through FSR-073.

- Offseason is Mode 3 processing, but the included specs disagree on phase count and placement: Mode 1 lists 13 phase-scope defaults; Offseason v3 lists 11 phases (`MODE_1...` Section 2.5; `OFFSEASON...` Section 1).
- Offseason UI supports game-night ceremonies and streamlined mode (`OFFSEASON...` Section 2).
- OffseasonState tracks all phase outputs and progress (`OFFSEASON...` Section 17.1).

### Retirement

Relevant requirements: FSR-063, FSR-067, FSR-068, FSR-077.

- Retirement targets 1-2 players per team, sorted by age with probabilities and reveal UI (`OFFSEASON...` Sections 7.1-7.3).
- Retirements create empty slots to fill in draft/finalize (`OFFSEASON...` Section 7.4).
- Jersey retirement is immediate and user-discretionary; HOF induction is separate, manual, and not automatic at retirement (`OFFSEASON...` Sections 7.5-7.7, 16).
- Farm demotion history can affect immediate and offseason retirement risk (`FARM...` Send-Down and End-of-Season Effects).

### Free agency

Relevant requirements: FSR-069, FSR-075, FSR-085.

- Free agency runs two rounds. Each team protects one player; top 11 eligible players receive two-dice values; destination follows visible personality (`OFFSEASON...` Sections 8.1-8.7).
- Personality spec says hidden modifiers weight FA preferences; Offseason spec uses visible personality destination mapping (`PERSONALITY...` Section 5.1; `OFFSEASON...` Section 8.5).
- Return-player valuation rules conflict across Offseason, Salary, and Offseason appendix; this ledger records the conflict without choosing one.

### Draft

Relevant requirements: FSR-010, FSR-011, FSR-070.

- Mode 1 has optional fantasy draft and optional startup prospect draft (`MODE_1...` Sections 8.1-8.8).
- Mode 3 annual draft can add inactive players, generates fictional prospects, orders teams by reverse average expected WAR, and continues until teams are full and all drafted at least once (`OFFSEASON...` Sections 9.1-9.6).
- Drafted prospects are part of farm/rookie salary/scouting systems.

### Trades

Relevant requirements: FSR-029, FSR-053, FSR-071, FSR-079, FSR-085.

- TransactionEvent must cover trade data and true values (`MODE_2...` Section 2.3).
- In-season trade deadline blocks only trades after configured deadline game (`MODE_2...` Section 22.6).
- Offseason trade window permits no-salary-matching trades, AI proposals, trade market UI, chemistry preview, and completion summary (`OFFSEASON...` Section 11).
- Revenge arcs track traded players and affect original team morale/mWAR/LI when they outperform or face old team (`FARM...` Revenge Arc System).

### Salary / true value

Relevant requirements: FSR-065, FSR-082 through FSR-085.

- Salary formula uses ratings, position, age, traits, performance, fame, and FA-only personality, plus DH-aware pitcher batting and two-way logic (`SALARY...` Sections Salary Calculation Formula through Personality Modifier).
- True Value drives Fan Favorite/Albatross, trade value, EOS salary/rating decisions, and ROI leaderboards (`SALARY...` True Value Calculation, ROI Leaderboards; `MODE_2...` Sections 17.3-17.4).
- Salaries recalculate in-season on specified triggers and during offseason Phases 3/8/10 (`SALARY...` Real-Time Salary Updates and Salary Recalculation Schedule; `OFFSEASON...` Sections 5, 10, 12).
- True Value formula conflict is unresolved in this pass.

### Personality / relationships / chemistry

Relevant requirements: FSR-008, FSR-022, FSR-050, FSR-076, FSR-080, FSR-086, FSR-087.

- Players have 7 visible types and 4 hidden modifiers; hidden modifiers are never shown numerically (`PERSONALITY...` Sections 2-4; `MODE_1...` Section 6).
- Hidden modifiers affect FA, morale, captain, retirement, and narrative hints (`PERSONALITY...` Section 5).
- Farm players can form cross-level and farm-only relationships with concrete morale/narrative effects (`FARM...` Farm System Narratives).
- Chemistry potency is required but its formula conflicts across Spine, Mode 2, and Salary specs.

### Narrative / reporter / commentary

Relevant requirements: FSR-025, FSR-050, FSR-076, FSR-080.

- Each team has one beat reporter with hidden personality, alignment, trust, reveal level, morale influence, tenure, reputation, and hiring/firing rules (`MODE_2...` Sections 16.1-16.6).
- Narrative generation routes local/cloud/shared story categories with a 50/50 cloud split for shared pool (`MODE_2...` Section 16.7).
- Player quotes use an 80/20 personality alignment rule (`MODE_2...` Section 16.8).
- Narrative appears in X feed, Tootwhistle Times, post-game summary, and pop-up notifications (`MODE_2...` Section 16.10).

### Milestones / fame / designations / awards

Relevant requirements: FSR-023, FSR-051, FSR-052, FSR-064, FSR-089.

- Designations update in-season as projected and lock at season end (`MODE_2...` Section 17).
- Milestones drive Fame Bonus/Boner, narrative, fan morale, and player morale across single-game/season/career/team scopes (`MODE_2...` Section 18; `MILESTONE...` Sections 1-11).
- Awards ceremony uses hybrid voting and assigns traits/ratings/penalties (`OFFSEASON...` Section 4).
- Some milestone UI is explicitly deferred in `MILESTONE_SYSTEM_SPEC.md` Implementation Status; this is recorded as spec-deferred UI only, not repo status.

### Fan morale / player morale

Relevant requirements: FSR-024, FSR-051, FSR-054, FSR-078, FSR-084.

- Fan morale weighs performance gap, designations, reporter sentiment, and roster/random events (`MODE_2...` Section 20.1; `SPINE...` Section 11).
- Fan morale affects player morale, FA attractiveness, narrative tone, warnings, and EOS modifiers (`MODE_2...` Sections 20.7-20.8).
- Player morale is distinct, per-player, affected by milestones, wins/losses, fan morale, narratives, designations, trades, relationships, captain performance, and personality (`MODE_2...` Section 17.14).
- Farm morale has additional passed-over, demotion, call-up, stuck-in-minors, injury, and relationship effects (`FARM...` Player Morale Effects).

### Mojo / fitness / injuries

Relevant requirements: FSR-048, FSR-081.

- Mojo/fitness changes are user-observed, never engine-initiated in Mode 2 (`MODE_2...` Section 14).
- Juiced is only from random events, traits, or narrative events; rest path removed (`MODE_2...` Section 14.7).
- Injuries are user-observed in Mode 2 as fitness changes; farm injuries can be generated as farm-specific events and block call-up (`MODE_2...` Section 14.8; `FARM...` Farm Injuries).

### Park factors / stadium analytics

Relevant requirements: FSR-026, FSR-058, FSR-088.

- Stadiums have dimensions, features, spray zones, park factors, records, and spray chart data (`SPINE...` Section 13).
- Park factors activate after 40% season, use seed/calculated confidence blending in Mode 2, and feed WAR (`MODE_2...` Sections 24.2, 24.7).
- Park seed spec requires BillyYank SMB4 stadium data and adjusted stats/WAR (`PARK_FACTOR...` Sections 1-4).

### Adaptive standards

Relevant requirements: FSR-057, FSR-089.

- Opportunity factor normalizes thresholds from gamesPerTeam and inningsPerGame (`MODE_2...` Section 23.1; `SPINE...` Section 8.1).
- Scaling rules apply differently to counting stats, pitcher counting stats, rate stats, per-9 stats, games played, PA/IP qualification, career WAR, and season WAR (`MODE_2...` Section 23.2).
- Milestone spec also describes dual-factor dynamic scaling and an Adaptive Standards Engine for rate thresholds and replacement level (`MILESTONE...` Sections 2.2-2.5).

### AI/simulation

Relevant requirements: FSR-056, FSR-059, FSR-080.

- SIMULATE is AI-vs-AI only; user games open GameTracker (`MODE_2...` Section 22.3).
- Full AI Game Engine target is explicitly deferred to V2; V1 uses simplified box-score generator according to Mode 2 Section 25 (`MODE_2...` Sections 25, 27).
- Farm spec includes AI event generation prompt context for farm storylines, but does not define full AI gameplay simulation (`FARM...` Integration with AI Event Generation).

### Import/export/backup/sync if specified

Relevant requirements: FSR-005, FSR-006, FSR-013, FSR-016, FSR-090.

- Imports specified: team CSV, player CSV/import, schedule CSV/OCR, franchise import blob (`MODE_1...` Sections 4.4, 5.2, 10.1, 13.4).
- Exports specified: export whole franchise DB as blob (`MODE_1...` Section 13.4).
- Cloud sync/accounts are future; backup beyond export/import is not specified (`MODE_1...` Section 14).

## 4. Conflict and ambiguity register

| ID | Conflict / ambiguity | Specs and sections | Requirement IDs affected | User decision needed |
|---|---|---|---|---|
| CAR-001 | Offseason phase count and phase names conflict: 13-phase defaults vs 11-phase v3 sequence. | `MODE_1...` Section 2.5; `OFFSEASON...` Section 1; `MODE_2...` Section 28 | FSR-003, FSR-061, FSR-072, FSR-073 | Decide canonical Mode 3 phase count and whether chemistry/farm reconciliation are standalone phases or folded into Finalize. |
| CAR-002 | Team Captain criteria conflict: Mode 2 says highest Loyalty+Charisma, no minimums, calculated at season start; Personality/Offseason require veterans with 3+ seasons. | `MODE_2...` Section 17.6; `PERSONALITY...` Section 5.3; `OFFSEASON...` Section 14.4 | FSR-023, FSR-051, FSR-086 | Decide whether tenure is required. |
| CAR-003 | Chemistry potency formula conflicts: 4-tier dominant-percentage model vs 3-tier chemistry-category count model; Salary examples show multipliers that do not exactly match table math. | `SPINE...` Section 9.2; `MODE_2...` Section 15.5; `SALARY...` Chemistry-Tier Trait Potency | FSR-022, FSR-087 | Decide one potency model and salary wiring. |
| CAR-004 | Free-agency return value rules conflict: +/-20% True Value, salary-based 90-110/70-100, appendix +/-10%, and grade examples. | `OFFSEASON...` Section 8.6 and Appendix B; `SALARY...` Salary Integration with Free Agency | FSR-069, FSR-085 | Decide canonical FA exchange valuation. |
| CAR-005 | True Value formula conflict: Offseason uses WAR*$8M plus clutch/fame/grade; Salary uses position-relative salary percentile by WAR. | `OFFSEASON...` Section 5.2; `SALARY...` True Value Calculation | FSR-065, FSR-083 | Decide canonical True Value formula. |
| CAR-006 | Park factors conflict: Park seed spec says seeded from BillyYank, not calculated from KBL results; same spec later allows refinement; Mode 2/Spine require recalculation/blending after games. | `PARK_FACTOR...` Sections 1, 3.3; `MODE_2...` Section 24.2; `SPINE...` Section 13.4 | FSR-026, FSR-058, FSR-088 | Decide seed-only vs seed+observed blending and confidence thresholds. |
| CAR-007 | Mojo enum conflict: Mode 2 has 6 tiers and PascalCase/hyphenated labels; Spine lists 5 tiers with `LockedIn` and no `On Fire`. | `MODE_2...` Sections 2.1, 14.1; `SPINE...` Section 3.6 | FSR-017, FSR-048 | Decide canonical enum and labels. |
| CAR-008 | Schedule handoff ambiguity: Mode 1/2 say user-provided/editable or empty; Spine handoff says schedule pre-generated/generated. | `MODE_1...` Section 10.1; `MODE_2...` Section 22.1; `SPINE...` Sections 7.1, 7.3 | FSR-013, FSR-021, FSR-056 | Decide wording/contract for empty or user-provided schedule. |
| CAR-009 | Farm roster size ambiguity: Mode 1 template says farm max 10; Farm/Offseason say unlimited during season and 10 at Phase 11. | `MODE_1...` Sections 7.3-7.4; `FARM...` Overview and Farm Roster Structure; `OFFSEASON...` Section 1 | FSR-009, FSR-074, FSR-072 | Clarify whether Mode 1 max is initial/template only. |
| CAR-010 | Contract/control ambiguity: all contracts one year and arbitration future vs called-up prospects having 3 years of team control. | `MODE_1...` Sections 5.3, 14; `MODE_2...` Section 27; `FARM...` Rookie Salary Calculation | FSR-075, FSR-082 | Decide prospect control model relative to one-year contracts. |
| CAR-011 | Fan morale scale conflict: 0-99 in Mode 2 vs 0-100 in Salary/Spine. | `MODE_2...` Sections 20.1-20.2; `SALARY...` Fan Morale System; `SPINE...` Section 11 | FSR-024, FSR-054, FSR-084 | Decide morale numeric range and labels. |
| CAR-012 | Transaction/event enum casing differs: Mode 2 uses lowercase strings; Spine uses uppercase TransactionType and compact event shapes. | `MODE_2...` Sections 2.2-2.3; `SPINE...` Section 5 | FSR-019, FSR-028, FSR-029 | Decide canonical serialized enum casing. |
| CAR-013 | Draft generation differs: Mode 1 startup pool supports A through D distribution and 3x picks; Offseason annual draft max A-, average B-, min 2 per position; Farm draft distributions use B-C- centered tables. | `MODE_1...` Sections 8.4-8.6; `OFFSEASON...` Section 9.2; `FARM...` Draft Integration | FSR-011, FSR-070 | Decide whether startup and annual draft intentionally differ. |
| CAR-014 | HOF/career threshold methodology appears in milestone spec while Offseason HOF museum is entirely manual. | `MILESTONE...` Section 5.0; `OFFSEASON...` Section 16.1 | FSR-068, FSR-089 | Decide whether HOF-caliber thresholds are informational only or drive museum suggestions. |
| CAR-015 | Active-game resume is specified as storage/state but not as explicit user flow. | `MODE_2...` Section 8.5; `SPINE...` Section 6.1 | FSR-030 | Decide whether a resume prompt, autosave indicator, or recovery workflow is required. |
| CAR-016 | Offseason data model still includes ContractionEvent though contraction is removed/future. | `OFFSEASON...` Section 17.5; `OFFSEASON...` Sections 1, 6 | FSR-066, FSR-073 | Decide whether to remove/ignore contraction model. |
| CAR-017 | Manager firing appears in Salary fan morale, but Mode 1 managers are "name only" with mechanical effects TBD. | `SALARY...` Mid-Season Manager Firing; `MODE_1...` Section 12.1 manager initialization | FSR-084, FSR-050 | Decide whether manager firing is functional or narrative-only. |
| CAR-018 | Full trade system is delegated to a spec not included in this pass, leaving offseason trade details incomplete here. | `OFFSEASON...` Section 11.2 | FSR-071 | Include `TRADE_SYSTEM_SPEC.md` in a future extraction or accept current high-level requirements only. |

### Requirements that appear overbroad for v1, without scope decision

- Full GameTracker event model plus all enrichment, fielding inference, WAR, LI/WPA, clutch, mWAR, narrative, morale, designations, standings, schedule, playoffs, and park factors as one Mode 2 surface.
- Full offseason game-night ceremony layer with dice, wheel, card, award, jersey, HOF, draft, expansion, FA, signing, and multiplayer presentation modes.
- Farm narrative system with cross-level romances, mentor/protege relationships, farm-only rivalries/friendships, call-up/send-down recommendations, AI event prompt expansion, and carryover effects.
- Real-time salary recalculation after every game and every fame/trait/award/random event.
- Park-factor calculation with spray charts, stadium records, handedness splits, direction factors, confidence blending, and WAR integration.
- Full local/cloud narrative routing and player quotes.
- Full milestone taxonomy across single-game, season, career, franchise firsts/leaders, team milestones, morale/fan effects, and simulation variance.
- Full AI Game Engine target architecture, although explicitly deferred to V2.

### Requirements marked canonical in one place but deferred/optional elsewhere

- AI Game Engine: Mode 2 documents target architecture but marks full AI Game Engine deferred to V2, while Schedule requires SIMULATE for AI-only games using a simplified box-score generator.
- Contraction: removed from v1/future in Mode 1/Offseason/Mode 2 deferred lists, but `OFFSEASON...` Section 17.5 still contains ContractionEvent.
- Free agent marketplace: basic offseason FA exists, but persistent marketplace UI/bidding/dynamics are V2 in Mode 1 Section 14.
- Multi-year contracts/arbitration: one-year contracts are canonical in Mode 1/Mode 2, but Farm prospect control implies multi-year team control; arbitration is future in Mode 1 Section 14.
- Schedule auto-generation: user-driven schedule is canonical in Mode 1/Mode 2, while auto-generation algorithms are V2 and Spine handoff wording says generated.
- Milestone UI: Milestone definitions/detection are authoritative, but Milestone Watch display, multi-threshold celebration UI, and game-end milestone summary modal are deferred in `MILESTONE...` Implementation Status.

## 5. Deferred/optional register

| ID | Item | Status | Evidence |
|---|---|---|---|
| DOR-001 | Enrichment after outcome tap | Optional | `MODE_2...` Sections 1.2, 4.1-4.4 |
| DOR-002 | HR distance and pitch type prompts | Optional | `MODE_2...` Sections 3.1, 4.3 |
| DOR-003 | Pitch count at end of each half-inning | Optional except pitcher removed/end game required | `MODE_2...` Section 4.3 and 9.8 |
| DOR-004 | Startup Prospect Draft | Optional/skippable | `MODE_1...` Sections 8.3, 11.6 |
| DOR-005 | Fantasy Draft | Optional roster mode | `MODE_1...` Sections 8.1-8.2, 11.6 |
| DOR-006 | Playoff Mode | Optional entry point | `MODE_1...` Sections 1.4, 11.8 |
| DOR-007 | Awards ceremony full/team-only/off | Optional/toggleable presentation | `MODE_1...` Section 9.2; `OFFSEASON...` Section 4 |
| DOR-008 | Streamlined Offseason Mode | Optional setting | `OFFSEASON...` Section 2.5 |
| DOR-009 | Phase 4 Expansion | Optional/user-initiated | `OFFSEASON...` Sections 1, 6 |
| DOR-010 | Existing team stadium change in Phase 4 | Optional | `OFFSEASON...` Section 6.2b |
| DOR-011 | Jersey retirement | Optional/user discretion | `OFFSEASON...` Section 7.5 |
| DOR-012 | Hall of Fame induction | Optional/manual museum feature | `OFFSEASON...` Section 16 |
| DOR-013 | Cut-and-sign round | Optional | `OFFSEASON...` Section 13.6 |
| DOR-014 | Add inactive players to annual draft | Optional | `OFFSEASON...` Section 9.1 |
| DOR-015 | Full AI Game Engine | Deferred to V2 | `MODE_2...` Sections 25, 27 |
| DOR-016 | Contraction | Removed from v1/future wishlist | `MODE_1...` Section 14; `OFFSEASON...` Sections 1, 6; `MODE_2...` Section 27 |
| DOR-017 | WAR configurable weights | Deferred/removed | `MODE_2...` Section 27; `MODE_1...` Decision Traceability |
| DOR-018 | Full adaptive learning ASE | Deferred/static defaults sufficient | `MODE_2...` Section 27 |
| DOR-019 | Weather effects on park factors | Deferred/not in SMB4 | `MODE_2...` Section 27 |
| DOR-020 | Pitch-by-pitch simulation | Deferred | `MODE_2...` Section 27 |
| DOR-021 | Real-time multiplayer | Deferred | `MODE_2...` Section 27 |
| DOR-022 | Multi-year contracts | Deferred/V2; all contracts 1 year in v1 | `MODE_2...` Section 27; `MODE_1...` Section 5.3 |
| DOR-023 | Salary cap hard/soft | Removed from v1; soft pressure via fan morale only | `MODE_1...` Section 14 |
| DOR-024 | Cloud sync/accounts | Future | `MODE_1...` Section 14 |
| DOR-025 | Franchise templates | Future | `MODE_1...` Section 14 |
| DOR-026 | Archive vs Delete franchise | Future | `MODE_1...` Section 14 |
| DOR-027 | Revenue sharing | Future | `MODE_1...` Section 14 |
| DOR-028 | Arbitration | Future | `MODE_1...` Section 14 |
| DOR-029 | Multiplayer turn management | V2 | `MODE_1...` Section 14 |
| DOR-030 | Schedule auto-generation algorithms | V2 | `MODE_1...` Section 14 |
| DOR-031 | Persistent FA marketplace UI/bidding/dynamics | V2 | `MODE_1...` Section 14 |
| DOR-032 | Milestone Watch display, multi-threshold celebration UI, game-end milestone summary modal | Deferred UI design | `MILESTONE...` Implementation Status |

## 6. Evidence index

| Spec file | Major sections extracted |
|---|---|
| `MODE_2_CANON_FRANCHISE_SEASON_UPDATED.md` | Overview/mode definition; event model; GameTracker quick bar/flow/undo/layout; enrichment; between-play events; baseball rules; substitutions; stats pipeline; pitcher decisions; fielding; 5 WAR components; LI/WPA; clutch; mojo/fitness; modifier registry; narrative; designations/player morale; milestones; Fan Favorite/Albatross; fan morale; standings/playoffs; schedule; adaptive standards; stadium/park factors; AI Game Engine deferred; franchise data flow; deferred material. |
| `MODE_1_LEAGUE_BUILDER_FINAL.md` | Mode 1 definition; franchise types/control flags; league/team/player modules; personality/traits initial assignment; rosters; fantasy/startup prospect drafts; rules presets; schedule setup; creation wizard; playoff mode; handoff/initialization; data architecture; franchise management; startup/switching/migration; V2/future material. |
| `OFFSEASON_SYSTEM_SPEC.md` | 11-phase offseason overview; interaction model; season-end processing; awards ceremony; salary recalcs; expansion/stadium changes; retirements; jersey retirement/HOF note; free agency; draft; trades; Phase 11 finalize/advance; personality/morale; HOF museum; offseason data models; appendices. |
| `FARM_SYSTEM_SPEC.md` | Farm roster structure; options; call-up reveal; prospect data; rating/potential distributions; call-up/send-down flows; rookie salary; demotion history/attrition; swap transactions; fan morale effects; revenge arcs; offseason roster requirements; draft integration; player morale; farm narratives/relationships/recommendations; designations; UI; farm mechanical events/injuries/carryover. |
| `SPINE_ARCHITECTURE.md` | Purpose; three-mode architecture; core entity models; stats contracts; event streams; storage architecture; mode transition contracts; adaptive scaling; trait/chemistry contract; designation/fan morale/narrative/stadium contracts. |
| `MILESTONE_SYSTEM_SPEC.md` | Milestone overview; adaptive threshold scaling; adaptive standards summary; single-game, season, career, franchise firsts/leaders, team milestones; multi-threshold crossing; impacts on morale/fan/simulation; data structures; detection timing; deferred UI notes. |
| `PARK_FACTOR_SEED_SPEC.md` | Overview/key principle; 40% activation trigger; BillyYank stadium source; park factor categories/seed values; adjusted stats; WAR impact; cross-references. |
| `PERSONALITY_SYSTEM_SPEC.md` | 7 visible personality types and weights; 4 hidden modifiers; generation/bias; hidden modifier surfacing; mechanical effects on FA, morale, captain, retirement. |
| `SALARY_SYSTEM_SPEC_UPDATED.md` | Salary formula; base salary from ratings; position multipliers; trait modifiers; age/performance/fame/personality modifiers; True Value; real-time salary updates; fan morale/payroll expectations; salary recalculation schedule; chemistry-tier trait potency; expansion salary limits; FA salary swaps; year-end salary reset; ROI leaderboards. |
