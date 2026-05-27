# Mode 2 v1 Reconciliation and Decision Worksheet

**Status:** Draft for user review  
**Created:** 2026-05-26  
**Scope:** Mode 2 only, with Mode 1 handoff constraints and Mode 2 to Mode 3 handoff outputs where Mode 2 owns the season data.  
**Decision state:** No final scope lock is made in this document. Codex proposes; user approves, modifies, rejects, or discusses each item before any Mode 2 v1 scope doc or implementation roadmap is created.

## 1. Executive summary

Mode 2 is the Franchise Season hub. The canonical Mode 2 gospel asks it to support a manual, record-first GameTracker loop; franchise-scoped schedule display and editing; active game persistence; regular-season standings; playoffs; stats; five WAR components; WPA/Manager Moments; narrative, milestones, morale, relationships, designations, park factors, salary context, farm movement, and final season handoff to Mode 3.

The repo already has a real Mode 2 gameplay foundation. Franchise Home exists, franchise-scoped schedule reads exist, GameTracker launches from regular-season and playoff contexts, active games save/load/resume, completed games archive, season stats aggregate, standings compute, playoff bracket storage/series advancement work, and WPA/manager WPA are unusually deep. These are the strongest candidates for Mode 2 v1 inclusion.

The repo is much weaker or ambiguous for several gospel systems that look like full v1 requirements on paper: full five-component WAR persistence/calibration, dynamic designations, fan morale, player morale, durable franchise relationships/chemistry, park factor analytics, narrative carryover, franchise milestone first/leader storage, salary consequences, trade execution, and regular-season roster movement UI. Many of these have engines, tests, placeholders, or preview-only adapters, but are not proven as complete Mode 2 franchise behavior.

This worksheet treats `MODE_2_V1_FINAL.md` as the Mode 2 source of truth, but it does not assume every gospel feature must ship immediately if the repo evidence shows high risk or if accepted Mode 1 constraints narrow v1. It also does not assume implemented systems belong in v1 just because they exist. The goal is to let the user approve, reject, modify, or discuss each major feature before any implementation roadmap exists.

## 2. Source hierarchy

1. **Primary Mode 2 authority:** `spec-docs/MODE_2_V1_FINAL.md`
2. **Accepted Mode 1 constraints:** `spec-docs/MODE_1_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md`
3. **Repo evidence summaries:** `spec-docs/FRANCHISE_REPO_IMPLEMENTATION_INVENTORY.md` and `spec-docs/FRANCHISE_REPO_SPEC_CROSSWALK.md`
4. **Targeted repo spot-checks:** targeted searches and reads in `src/src_figma/app/pages/FranchiseHome.tsx`, `src/src_figma/app/components/ScheduleContent.tsx`, `src/src_figma/app/components/AddGameModal.tsx`, `src/src_figma/hooks/useScheduleData.ts`, `src/utils/scheduleStorage.ts`, `src/utils/franchiseInitializer.ts`, `src/src_figma/hooks/useGameState.ts`, `src/utils/eventLog.ts`, `src/utils/processCompletedGame.ts`, `src/utils/seasonAggregator.ts`, `src/src_figma/hooks/usePlayoffData.ts`, `src/utils/playoffStorage.ts`, `src/engines/*WAR*`, `src/engines/wpaCalculator.ts`, `src/engines/wpaV2.ts`, `src/engines/relationshipEngine.ts`, `src/hooks/useRelationshipData.ts`, `src/src_figma/app/hooks/useRelationshipData.ts`, `src/utils/franchiseSeasonSummaryStorage.ts`, `src/utils/franchiseRosterMovement.ts`, `src/utils/franchiseTradeAdapter.ts`, `src/utils/franchiseFreeAgencyAdapter.ts`, `src/engines/parkFactorDeriver.ts`, `src/engines/fanMoraleEngine.ts`, and reporter/milestone storage files.

## 3. Mode 1 handoff assumptions carried into Mode 2

These are accepted input constraints from the Mode 1 worksheet and should not be re-decided here unless the user explicitly reopens them.

- Mode 1 must copy franchise data into franchise-owned save state, not reference mutable League Builder templates.
- Mode 1 must hand Mode 2 a complete contract: league, teams, stadium/park-factor inputs, players, rosters, 10 farm players per team, rules/config, active franchise metadata, salary/payroll baseline, standings/stat baselines, schedule state, control metadata, personality/chemistry/fame fields, and approved NPC/scouting/farm identity fields.
- Franchise schedules must never be auto-generated. Empty startup, manual SMB4 schedule entry, and user-supplied CSV import are acceptable. Generated or inferred schedules are not.
- Season length and games-per-team are metadata and validation inputs, not schedule-generation inputs. They may also feed adjusted stats/WAR context.
- Mode 1 may store AI/manual score-entry policy as metadata, but Mode 2 v1 has no AI game simulation.
- OCR schedule extraction is post-v1.
- Personality type and hidden modifiers should exist at handoff, but exact hidden values should not be directly exposed by default.
- Chemistry type is distinct from personality. Advanced trait potency and chemistry behavior need Mode 2/3 decisions.
- Salary must be initialized during Mode 1; advanced salary consequences and salary evolution are Mode 2/3 decisions.
- Franchise type and `controlledBy` are metadata/defaults and UI gates, not data-visibility restrictions.
- Abbreviated Playoff Mode is rejected from Franchise Setup, but normal franchise playoffs remain part of the Mode 1/Mode 2 contract.

## 4. Decision table

| Decision ID | Feature | Spec source/section | Repo status summary | Codex recommendation | Confidence | One-line rationale | User decision | User notes |
|---|---|---|---|---|---|---|---|---|
| M2-D001 | Franchise Home / Mode 2 shell | Mode 2 section 1, section 26 | Implemented and wired. Franchise Home loads franchise config, schedule, standings, playoffs, offseason state, tabs, and phase views. | Must include in v1 | High | This is the visible Mode 2 hub and already exists. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D002 | Active franchise metadata and scoped reads | Mode 2 section 1.4, section 2, section 26; Mode 1 handoff | Mostly complete. Franchise-scoped player/team/schedule/game/stats/playoff reads have meaningful tests. | Must include in v1 | High | Trustworthy franchise isolation is foundational to every Mode 2 feature. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D003 | Schedule display and manual schedule entry/editing/persistence | Mode 2 section 22; Mode 1 M1-D020 to M1-D023 | Partial/drifted. Display/add/delete and empty-state UI exist; full editing, CSV persistence, and empty startup conflict with generated setup schedule need audit. | Must include, with modifications | High | Manual SMB4 schedule entry is an accepted v1 constraint; generated schedules must be removed from the path. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D004 | GameTracker launch from franchise schedule | Mode 2 section 3, section 22.3 | Implemented and wired. Score Game launches GameTracker with franchise identity, schedule game id, rosters, managers, lineups, innings, DH, and scoped stats. | Must include in v1 | High | This is the core play loop and repo evidence is strong. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D005 | Active game save/load/resume | Mode 2 section 2.4, section 8.5, section 26.2 | Implemented and wired. Current game snapshots, identity resolution, autosave/restore, and refresh persistence are tested. | Must include in v1 | High | A manual scoring tool must survive refresh/device interruptions. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D006 | Game completion/archive | Mode 2 section 2.4, section 8.4, section 26 | Implemented and wired. Completion updates schedule, aggregates stats, archives completed games, and feeds Game Detail/Almanac. | Must include in v1 | High | This closes the scored-game loop and feeds standings/stats. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D007 | Regular-season standings updates | Mode 2 section 21 | Implemented and wired for basic standings. Exact magic/elimination/tiebreak details need audit. | Must include core standings; discuss advanced details | High | Standings are required once completed games exist. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D008 | Playoff eligibility, seeding, bracket setup, and series progression | Mode 2 section 21 | Mostly complete. Playoff data hook, seeding flow, bracket storage, series advancement, and playoff stats are wired. | Include if current implementation matches rules snapshot | Medium-high | Playoff implementation is stronger than many advanced regular-season systems. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D009 | Franchise playoff GameTracker integration | Mode 2 section 21, section 26 | Implemented and wired. Playoff launch carries playoff ids/series/game number/franchise/season context and records results. | Must include if playoffs included | High | Playoffs without GameTracker launch would be a broken season finish. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D010 | Stats tracking and aggregation | Mode 2 section 8-section 10, section 26 | Implemented and wired for core batting/pitching/fielding stats, event log, season aggregation, leaders, and archives. | Must include core stats; discuss advanced precision | High | Core stats are the minimum value of GameTracker. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D011 | WAR/bWAR/pWAR/fWAR/rWAR/mWAR plus coexistence with Manager Moments/WPA | Mode 2 section 11-section 13 | Partial. WAR engines exist; WPA/manager WPA are more deeply wired. Full five-component season persistence/calibration and park adjustments are unproven. | Discuss scope split | Medium | The gospel says five WAR components; repo evidence supports WPA first and WAR unevenly. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D012 | Manager Moments / WPA integration | Mode 2 section 5.3, section 11.5, section 12-section 13 | Implemented and wired. LI/WPA fields, manager decision state, overlays, Game Detail audit, and Manager Almanac exist. | Include if we keep advanced analytics in v1 | High | This is already built and can coexist with WAR if labeled correctly. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D013 | Milestones | Mode 2 section 18 | Partial. Detection/aggregation exists; franchise first/leader storage is explicitly stubbed or skipped in export ownership. | Include limited detection only unless storage is approved | Medium | Detection is useful, but durable franchise milestone history is not proven. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D014 | Narrative/event feed/news | Mode 2 section 16 | Partial. Reporter/commentary/game story storage and news surfaces exist, but full franchise narrative lifecycle and reporter behavior are not proven. | Include stable existing news/feed surfaces only; discuss gospel breadth | Medium | Narrative should not become a catch-all for unfinished systems. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D015 | Fan morale | Mode 2 section 20 | Implemented engine but not wired as durable franchise season state; Team Hub/season summaries show placeholders. | Discuss or defer full system | Medium-high | The gospel keeps fan morale, but repo evidence says franchise integration is incomplete. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D016 | Player morale | Mode 2 section 17.14, section 20.8 | Spec-defined; repo evidence is sparse and appears not franchise-complete. | Defer unless user explicitly wants a small visible baseline | Medium | Player morale depends on narrative, designations, relationships, fan morale, and transactions. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D017 | Relationships engine | Mode 2 section 13 matchup context, section 15.5, section 16.5, section 17.14 | Engine/storage/hooks exist, but active franchise wiring appears in-memory/ambiguous and chemistry tab is placeholder. | Discuss; likely defer durable franchise behavior | Medium-high | Existing engine does not prove franchise-owned relationship lifecycle. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D018 | Personality/chemistry effects | Mode 2 section 15.5, section 16, section 17.6, section 17.14 | Data fields exist from Mode 1; trait potency and behavior effects are not proven as Mode 2 franchise systems. | Preserve data; defer broad effects | Medium-high | Mode 1 stores the fields, but Mode 2 effects would multiply dependencies. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D019 | Dynamic designations | Mode 2 section 17 | Partial. Some MVP/Ace/Fan Favorite/Albatross engines or summaries exist, but full projected/locked badges, notifications, carryover, Captain, and Fan Hopeful are unproven. | Discuss; likely limited or defer | Medium | Designations rely on WAR/value delta/player morale/fan morale. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D020 | Park factors and stadium analytics | Mode 2 section 24 | Implemented deriver/types and stadium fields, but Team Hub/summary integration is placeholder; GameTracker stores stadium name only in places. | Discuss; likely preserve inputs and defer full analytics | Medium | Park factors matter for WAR fairness but are not proven end-to-end. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D021 | Salary/payroll display or season effects | Mode 2 section 17.3-section 17.4, section 20, section 22.6; Mode 1 M1-D010 | Salary engine/adapter exists, but Mode 2 salary consequences, true value, payroll morale, and in-season display are partial. | Include read-only salary baseline if already stable; defer effects | Medium | Mode 1 initializes salary; Mode 2 should not invent unproven financial mechanics. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D022 | Trade logic if Mode 2 includes in-season trades | Mode 2 section 2.3, section 20.5, section 22.6 | Guarded/preview-only. Transaction UI disabled; trade adapter is dry-run and explicitly non-executable. | Defer in-season trade execution | High | Repo and Mode 1 decisions point away from complex transaction scope in v1. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D023 | Farm system roster dynamics during season | Mode 2 section 2.3, section 17.7, section 17.14, section 20.3 | Farm records and roster movement utilities exist; visible regular-season farm dynamics are ambiguous/advisory. | Discuss limited mechanics | Medium | Storage/actions exist, but regular-season UI and morale/story effects are incomplete. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D024 | Roster movement/call-up/send-down/injury/availability behavior | Mode 2 section 2.3, section 5, section 7, section 14, section 20.3 | Partial. Game-level substitutions/mojo/fitness/injury events exist; franchise roster movement utilities/logging exist; regular transaction UI is disabled. | Include GameTracker availability states; discuss franchise roster moves | Medium | In-game changes are core; season roster mutation is a separate risk. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D025 | Awards/watchlists | Mode 2 section 1.5, section 18.4, section 26.3 | Placeholder/copy only for some awards race panels; season summary placeholders remain. | Defer formal awards; include leaders/watch panels only if stable | Medium | Award candidates are a Mode 2 output, but current candidate source is not proven. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D026 | No AI game simulation in v1 | Mode 2 section 22.3, section 25; Mode 1 M1-D018 | Implemented but guarded off with `MODE_2_V1_SYNTHETIC_SIM_ENABLED = false`; UI comment says user is bridge. | Must include as exclusion | High | This matches accepted constraints and current guards. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D027 | Manual SMB4 result entry for non-played/AI-controlled games | Mode 2 section 22.3; Mode 1 M1-D018 | Spec says SCORE opens GameTracker for any matchup and SKIP marks skipped. A final-score-only result entry path is not proven. | Discuss exact v1 behavior | Medium | User-supplied results are allowed, but final-score-only entry may not exist. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D028 | Mode 2 to Mode 3 handoff | Mode 2 section 1.5, section 26.3 | Partially implemented. Season summaries and transition journals exist, with placeholders for awards, milestones, fan morale, narrative, park factors/adaptive standards. | Include core handoff, leave derived fields conditional | Medium-high | Mode 3 needs a snapshot, but not all gospel outputs are durable today. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D029 | GameTracker enrichment, substitutions, pitch count, fielding, mojo/fitness | Mode 2 section 4-section 7, section 9-section 10, section 14 | Core event/UI pieces exist, but exact gospel parity varies. User-observed mojo/fitness boundary aligns with spec. | Include core stable GameTracker mechanics; audit advanced enrichment parity | Medium-high | These directly affect stat trust and user scoring ergonomics. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M2-D030 | Adaptive standards and threshold scaling | Mode 2 section 18.1, section 23 | Engine/reference pieces exist; franchise persistence and summary integration are ambiguous. | Include only where required by stats/WAR/milestones decisions | Medium | This is a dependency, not a standalone user-facing v1 feature unless consumers are included. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |

## 5. Detailed decision sections

### M2-D001: Franchise Home / Mode 2 shell

**What the spec asks for:** Mode 2 is the active gameplay hub from franchise creation through season end. It should present the schedule, GameTracker launch, stats, standings, playoffs, narrative, roster/team management, and season transition surfaces.

**What appears to exist in the repo:** `FranchiseHome.tsx` is implemented and wired. It loads franchise config, schedule data, standings, playoff data, offseason state, tabs, schedule/game-day content, team hub, news, leaders, bracket, playoff stats/leaders, and season completion banners. Inventory and crosswalk call Franchise Home implemented and wired.

**What is ambiguous or unproven:** Some tabs are placeholders or guarded. The shell exists, but not every tab represents complete v1 behavior.

**v1 inclusion recommendation:** Must include the shell as the Mode 2 entry point. Treat incomplete tabs as individual decisions, not as proof the shell is incomplete.

**Consequences of including:** Users have a single hub for the season loop and visible route from Mode 1 into Mode 2.

**Consequences of deferring:** Mode 2 has no coherent experience even if underlying storage works.

**Dependencies:** Active franchise metadata, scoped schedule reads, team/player storage, season metadata, route wiring.

**Test confidence:** High for the shell and route behavior; medium for every tab inside it.

**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Include Franchise Home as the Mode 2 hub. Incomplete or placeholder tabs are decided separately and should not imply those systems are v1-complete.  

### M2-D002: Active franchise metadata and scoped reads

**What the spec asks for:** AtBatEvent, BetweenPlayEvent, TransactionEvent, GameRecord, schedule rows, stats, standings, playoffs, narrative, and season summaries should carry franchise/season identity. Mode 2 receives copied Mode 1 data and must read/write within that franchise scope.

**What appears to exist in the repo:** Inventory and crosswalk show franchise-scoped player/team storage, schedule storage, GameTracker identity resolution, event log writes, season stats, completed-game archive, playoff storage, and active metadata. Tests include scope tests for franchise data, schedule storage, GameTracker restored franchise scope, playoffs, and save-slot manifests.

**What is ambiguous or unproven:** Not every derived system is scoped equally. Relationship storage, milestone career rows, fan morale, narrative carryover, park factors, and some season-summary derived fields remain ambiguous or placeholder.

**v1 inclusion recommendation:** Must include for all approved core systems. Derived systems should not be marked approved until their franchise scoping is proven.

**Consequences of including:** Prevents cross-franchise contamination and supports save-slot trust.

**Consequences of deferring:** Completed games, stats, and playoffs could become unreliable or bleed between franchises.

**Dependencies:** Mode 1 copy-not-reference handoff, active franchise pointer, canonical season id, game identity resolution.

**Test confidence:** High for core gameplay/schedule/playoff scoping; low to medium for advanced derived systems.

**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** All approved Mode 2 systems must use canonical franchise/season/stats scope identity and franchise-owned reads/writes. Advanced derived systems are only v1-approved once their scoping is proven.  

### M2-D003: Schedule display and manual schedule entry/editing/persistence

**What the spec asks for:** Schedule is user-provided and editable. Users can start with no schedule, add games manually, import user-supplied CSV rows, and edit/add/swap/move/remove games in-season. No schedule generation is allowed by accepted Mode 1 constraints. Uploaded schedule rows are SMB4 user-supplied rows, not generated rows.

**What appears to exist in the repo:** `ScheduleContent.tsx` displays franchise schedule rows, filters by team, shows empty schedule messaging, supports Add Game and Add Series UI, and supports delete. `AddGameModal.tsx` collects game number, day number, date, time, away team, and home team. `scheduleStorage.ts` supports franchise-aware add, add series, complete, status update, delete, and reads. `FranchiseHome.tsx` passes schedule rows and opens the modal. However, `franchiseInitializer.ts` still calls `generateSchedule` during franchise creation and new-season generation.

**What is ambiguous or unproven:** Full row editing, home/away swap, move/reorder, CSV import/review, and empty schedule at franchise creation are not proven. Add Series is convenience, but it is still user-specified matchup repetition; it should be reviewed so it does not become inferred schedule generation.

**v1 inclusion recommendation:** Must include with modifications: preserve display/add/delete/persistence, add or verify edit behavior, allow empty startup, allow user-supplied CSV only with review, and remove/disable generated schedules.

**Consequences of including:** Mode 2 matches SMB4 reality and can function even when the user enters games one by one.

**Consequences of deferring:** Mode 2 either depends on generated schedules or cannot represent the user's SMB4 schedule accurately.

**Dependencies:** Mode 1 schedule policy, schedule storage, team identity matching, season length validation.

**Test confidence:** Medium for display/add/delete/storage; low for full editing/CSV/empty creation parity.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Mode 2 v1 must display, persist, manually add/edit/delete, and correct franchise schedule rows. It must support empty startup and user-supplied CSV schedule rows from Mode 1. Remove or disable generated schedule paths for franchise. Add Series is acceptable only as explicit user-entered repetition, not inference.  

### M2-D004: GameTracker launch from franchise schedule

**What the spec asks for:** SCORE opens GameTracker for the scheduled matchup, carrying franchise, season, schedule game, team, lineup, roster, manager, DH, innings, and stats scope. This applies to any matchup the user chooses to score.

**What appears to exist in the repo:** Inventory says Score Game launch is implemented and wired. `FranchiseHome.tsx` builds franchise rosters and navigates to GameTracker with `gameMode`, `competitionType`, `franchiseId`, `scheduleGameId`, `seasonId`, `statsScopeId`, lineups, managers, DH, and innings. Launch blockers exist when roster/pitcher data are missing.

**What is ambiguous or unproven:** Exact launch behavior for an empty schedule plus manually added games should be verified after schedule policy fixes. Lineup benchmark readiness can block launch.

**v1 inclusion recommendation:** Must include.

**Consequences of including:** The main Mode 2 loop works: choose SMB4 game, score it, persist it.

**Consequences of deferring:** Schedule would be display-only and GameTracker would remain disconnected from franchise play.

**Dependencies:** Schedule rows, franchise team/player snapshots, GameTracker identity, roster builder.

**Test confidence:** High.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Mode 2 v1 must launch GameTracker from valid franchise schedule rows using current franchise-owned Mode 2 roster/team/player state at game start, not stale Mode 1 template data. The launched game then freezes roster/lineup/pitcher snapshots for active-game resume and completed-game archive integrity. Empty/manual/CSV schedule paths must all produce launchable rows once valid.  

### M2-D005: Active game save/load/resume

**What the spec asks for:** Current game state persists during scoring and can be restored. GameRecord/event streams carry enough identity and state to resume or audit.

**What appears to exist in the repo:** Inventory lists active-game save/load/resume as implemented and wired through `gameStorage.ts`, `useGameState.ts`, and `gameTrackerIdentity.ts`. Tests cover refresh persistence and launch state.

**What is ambiguous or unproven:** Multi-device/cloud assumptions are not part of this decision. Exact replay/version audit depth is separate from basic resume.

**v1 inclusion recommendation:** Must include.

**Consequences of including:** Scoring sessions survive refresh/interruption, making manual entry safer.

**Consequences of deferring:** A browser reload could destroy in-progress game work.

**Dependencies:** Game identity, current game store, event log, schedule in-progress/completed states.

**Test confidence:** High.

**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Active game save/load/resume is required. Restored games must preserve the launched game snapshot, canonical identity, schedule/playoff context, events, score/state, and lineup/roster state; they must not refresh from later live roster edits.  

### M2-D006: Game completion/archive

**What the spec asks for:** A completed GameRecord with events, final score, stats, top moments, manager moments, and narrative recap can feed season stats, standings, archive, and Mode 3 handoff.

**What appears to exist in the repo:** `useGameState.ts` calls `processCompletedGame`; `processCompletedGame.ts` aggregates to season stats, archives completed games, and registers Almanac players. `GameTracker.tsx` completes the schedule game. Game Detail and Almanac pages retrieve archived data. Inventory lists this as implemented and wired.

**What is ambiguous or unproven:** Advanced fields such as full narrative recap, complete top moments, complete manager moments, and all derived summary systems are not uniformly proven.

**v1 inclusion recommendation:** Must include core completion/archive. Treat advanced archive enrichments under their own decisions.

**Consequences of including:** Stats, standings, leaders, playoffs, and season summaries have completed-game input.

**Consequences of deferring:** GameTracker becomes a transient scoring UI with no franchise progression.

**Dependencies:** Event log, season aggregator, schedule completion, completed-game storage.

**Test confidence:** High for core completion/archive; medium for derived recap breadth.

**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Game completion/archive is required. Completion must preserve canonical identity and launched snapshots, update schedule/playoff state through scoped paths, aggregate stats once, and be idempotent against retry/restore/double-completion.  

### M2-D007: Regular-season standings updates

**What the spec asks for:** Standings compute from game results after every completed game, including wins/losses, win percentage, games back, streak, last 10, home/away/division records, runs, run differential, pythagorean percentage, magic/elimination numbers, playoff status, and run-differential tiebreakers with user prompt after that.

**What appears to exist in the repo:** Inventory says standings are implemented and wired. `useFranchiseData.ts` calls `calculateStandings(seasonId)` and `StandingsContent` displays standings. Tests cover franchise data logic and scoped reads.

**What is ambiguous or unproven:** Exact magic number, elimination number, playoff status, division record, and tiebreaker prompting are not proven from the inspected evidence.

**v1 inclusion recommendation:** Must include core standings. Discuss whether advanced magic/elimination/tiebreak features are v1 or later.

**Consequences of including:** Season progress is visible and playoff seeding can be derived.

**Consequences of deferring:** Playoffs and season context become manual or unreliable.

**Dependencies:** Completed schedule results, team/league division structure, standings calculator.

**Test confidence:** High for basic standings; medium-low for full gospel standings fields.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Core regular-season standings are required and must update from completed franchise games only. Advanced magic number, clinch/elimination, playoff odds/projection, and complex tiebreak UI can be audited separately before v1 inclusion.  

### M2-D008: Playoff eligibility, seeding, bracket setup, and series progression

**What the spec asks for:** Mode 2 reads Mode 1 playoff rules, determines playoff teams/seeding, allows bracket setup, supports configurable series lengths, tracks series wins, reseeds after rounds, advances brackets, and completes playoffs.

**What appears to exist in the repo:** `usePlayoffData.ts`, `playoffStorage.ts`, `playoffEngine.ts`, `PlayoffSeedingFlow`, and Franchise Home playoff tabs are wired. Playoff data builds teams from franchise-owned snapshots and scoped standings. Tests cover playoff logic, storage, fielding scope, and franchise scope.

**What is ambiguous or unproven:** Exact parity with all Mode 1 rules, home-field format, tiebreak prompt behavior, and every configurable series length should be audited. Playoff seeding flow may permit user-adjusted seeding, which should be intentional.

**v1 inclusion recommendation:** Include if the current implementation can be bounded to the approved rules snapshot. This looks likely.

**Consequences of including:** Franchise seasons can finish naturally into postseason play.

**Consequences of deferring:** Mode 2 would end at regular season completion and not produce playoff results for Mode 3.

**Dependencies:** Standings, playoff rules snapshot, franchise-owned team snapshots, schedule completion.

**Test confidence:** Medium-high.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Mode 2 v1 should automatically derive playoff eligibility, seeding, and bracket setup from completed standings and Mode 1 playoff rules/config, using run differential as the tiebreaker. At season end, the user gets a review/confirm step and only resolves ties still unresolved after run differential. Users should not redesign playoff format or series rules at season end in v1. Abbreviated Playoff Mode remains removed. Bracket creation and series advancement must be idempotent.  

### M2-D009: Franchise playoff GameTracker integration

**What the spec asks for:** Playoff games launch GameTracker with playoff context and completed games update series/brackets/stats.

**What appears to exist in the repo:** `FranchiseHome.tsx` has playoff game handlers that navigate with `gameMode: "playoff"`, playoff ids, series id, playoff game number, franchise id, season id, DH, innings, lineups, and managers. `useGameState.ts` records playoff series game after completed GameTracker. Inventory lists playoff GameTracker launch and series advancement as implemented and wired.

**What is ambiguous or unproven:** Exact behavior for abandoned/restored playoff games should be tested as part of implementation audit, but repo evidence is strong.

**v1 inclusion recommendation:** Must include if M2-D008 playoffs are approved.

**Consequences of including:** Postseason games are scored with the same event/stat rigor as regular-season games.

**Consequences of deferring:** Bracket progression would require manual result entry or become blocked.

**Dependencies:** Playoff bracket, GameTracker identity, playoff storage, roster builder.

**Test confidence:** High.

**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Franchise playoff games must launch through GameTracker with canonical playoff/franchise/season identity and current franchise roster state at launch. Completion must archive the game, aggregate playoff stats, update series/bracket state once, and preserve launched snapshots.  

### M2-D010: Stats tracking and aggregation

**What the spec asks for:** AtBatEvent/BetweenPlayEvent streams feed game, season, and career stats. Core counting stats must be correct from Step 1 alone. Pitcher decisions, fielding, achievements, fame events, and leaders are accumulated on completion.

**What appears to exist in the repo:** Event log writes, `useGameState`, `seasonAggregator`, `seasonStorage`, `processCompletedGame`, Game Detail, leaders, and tests are present. Inventory says event log, stat aggregation, completed archive, and regular-season leaders are implemented and wired.

**What is ambiguous or unproven:** Full gospel parity for every pitcher decision, fielding inference, achievements, fame events, career accumulation, and all advanced split stats is not proven. Some old `clutchCalculator` formulas appear to coexist with newer WPA-based intent and should be audited before trusting labels.

**v1 inclusion recommendation:** Must include core batting/pitching/fielding stat aggregation. Decide advanced stat breadth feature-by-feature.

**Consequences of including:** GameTracker produces usable season records and leaderboards.

**Consequences of deferring:** Franchise mode loses its primary reason to exist.

**Dependencies:** GameTracker events, schedule completion, player/team identity, season storage.

**Test confidence:** High for core; medium for advanced parity.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Core batting, pitching, fielding, team, game, season, and playoff stat aggregation is required from completed franchise games. Advanced derived metrics, park adjustments, WAR calibration, edge-case scoring precision, WPA, Clutch, and LI decisions are decided separately.  

### M2-D011: WAR/bWAR/pWAR/fWAR/rWAR/mWAR plus coexistence with Manager Moments/WPA

**What the spec asks for:** Five independent WAR components are v1: batting WAR, pitching WAR, fielding WAR, baserunning WAR, and manager WAR. WAR should use season-length scaling, park factors where applicable, leverage multipliers for relievers, fielding/run-value credits, baserunning values, and manager decision/overperformance components. Manager Moments feed mWAR. WPA is also stored and used for clutch attribution/top moments.

**What appears to exist in the repo:** Engines/tests exist for bWAR, rWAR, mWAR, leverage, clutch, WPA, and related calculations. Inventory says WAR/WPA/manager value foundations are present, with WPA/manager WPA strongly wired to events, Game Detail, and Manager Almanac. Crosswalk says the gap is full five-component WAR persistence/calibration, park-adjusted WAR, fielding/run-value precision, and adaptive standards integration.

**What is ambiguous or unproven:** Whether all five components are calculated from current franchise season stats and persisted in the v1 UI is not proven. Some code/tests reference mWAR, manager WPA, "manager value", and tactical/deployment/lineup WPA. These should coexist only if labels distinguish WPA from WAR. Manager Moments/WPA should not silently replace bWAR/pWAR/fWAR/rWAR if the user approves full WAR.

**v1 inclusion recommendation:** Discuss scope split. Recommended neutral split: include WPA/Manager Moments as built; include WAR only to the extent existing engines are correctly fed, persisted, and labeled; defer full WAR parity if park factors/adaptive standards are not ready.

**Consequences of including:** Rich player/manager value systems become available, but audit burden rises sharply.

**Consequences of deferring:** Core stats still work, but designations, salary true value, award candidates, and Mode 3 handoff lose important inputs.

**Dependencies:** Stats aggregation, park factors, adaptive standards, fielding enrichment, baserunning events, manager decisions, salary/true value.

**Test confidence:** High for WPA/manager WPA; medium-low for complete five-component WAR as a franchise season product.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Split old WAR/mWAR decision into two tracks: player/manager WPA analytics and player WAR components. Player WPA, Manager Moments/manager WPA, LI, and Clutch should be included in Franchise Mode 2 and carry into Mode 3 where relevant, matching current Exhibition/Elimination behavior where applicable. Replace old mWAR language with Manager Moments/WPA unless a separate mWAR metric is redefined. WAR components may remain v1 only if scoped, persisted, calibrated, and explained enough for internal trust; otherwise mark preview/experimental until park factors and season context are proven.  

### M2-D012: Manager Moments / WPA integration

**What the spec asks for:** When leverage is high, the app marks a Manager Moment, records manager decision context/outcome WPA, tracks totals/best/worst moments, and feeds mWAR. Every AtBatEvent stores WPA and win probabilities; WPA is the primary clutch measure.

**What appears to exist in the repo:** `useGameState.ts` calculates LI/WPA and derives committed manager decisions. `eventLog.ts` has WPA/LI fields. `ManagerWpaOverlay.tsx`, `GameDetail.tsx`, and `ManagerAlmanac.tsx` display manager WPA and audits. Tests cover WPA, runtime boundaries, manager WPA game state, derivation, recommendations, and Almanac aggregation.

**What is ambiguous or unproven:** Whether the UI matches the spec's subtle live Manager Moment indicator is less important than the data path. Relationship between manager WPA and mWAR needs labeling clarity.

**v1 inclusion recommendation:** Include if advanced analytics are allowed in v1. It is one of the most complete advanced systems.

**Consequences of including:** Game Detail and Almanac can show high-value managerial decisions.

**Consequences of deferring:** Existing deep code may need hiding, and mWAR/designation/award logic loses a major input.

**Dependencies:** WPA engine, GameTracker events, manager identity, Game Detail/Almanac displays.

**Test confidence:** High.

**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Include player WPA, manager WPA/Manager Moments, LI, and Clutch in Franchise Mode 2 where currently stable, and preserve/carry relevant outputs into Mode 3 summaries. Treat these as context analytics, not WAR replacements, and explain them separately in context. Awards logic will need later updates because WPA may be especially valuable for awards in shorter seasons.  

### M2-D013: Milestones

**What the spec asks for:** Single-game, season, career, franchise firsts, franchise leaders, and team milestones drive Fame, narrative, fan morale, and player morale. Thresholds scale by season/games/innings except where explicitly fixed.

**What appears to exist in the repo:** `milestoneDetector.ts`, `milestoneAggregator.ts`, Fenway Board milestone alerts, milestone/fame tests, and milestone watch panels exist. Crosswalk says milestone detection and Fame aggregation exist.

**What is ambiguous or unproven:** `franchiseStorage.ts` first/leader storage is described as no-op/null in inventory; save-slot manifest tests skip playerId-only career stats/milestones from export/delete ownership. Durable franchise firsts/leaders and full taxonomy are not proven.

**v1 inclusion recommendation:** Include limited game/season milestone detection only if already stable. Require separate approval before claiming franchise firsts/leaders/career milestone permanence.

**Consequences of including:** Adds fun and Fame hooks to scored games.

**Consequences of deferring:** Core stats still work, but Fame/narrative/season summary richness decreases.

**Dependencies:** Stats aggregation, Fame events, adaptive thresholds, franchise storage, narrative/morale if connected.

**Test confidence:** Medium for detection; low for durable franchise milestone history.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Include stable milestone detection and display if already wired, but durable franchise milestone history, franchise firsts/leaders/records, and narrative integration require scoped storage/audit before v1-complete status.  

### M2-D014: Narrative/event feed/news

**What the spec asks for:** Beat reporters, reporter personality, morale influence, story generation, player quotes, live in-game feed, Tootwhistle Times, post-game recap, pop-up notifications, and narrative-to-playerMorale integration.

**What appears to exist in the repo:** Reporter storage, commentary feed storage, game stories, reporter Almanac cache, BeatReporterNews/NewsBoard/CommentaryFeed components, live beat reporter flags, reporter tests, and Game Detail story/archive tests exist. Franchise Home has a news tab.

**What is ambiguous or unproven:** Full reporter lifecycle, hidden reporter personality mechanics, LLM routing, player quote behavior, durable franchise narrative history, and morale effects are not proven. Some surfaces may be previews or fixture-driven.

**v1 inclusion recommendation:** Include stable existing news/feed/archive surfaces if they do not pretend to implement full gospel narrative. Discuss any live reporter or morale-connected narrative behavior separately.

**Consequences of including:** Franchise mode feels alive and archives game stories.

**Consequences of deferring:** Core scoring remains stable, but Mode 2 loses flavor and some Mode 3 history context.

**Dependencies:** Reporter identities from Mode 1, completed games, milestones, WPA, fan/player morale if connected.

**Test confidence:** Medium for storage/surfaces; low-medium for full gospel behavior.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Include stable narrative/news/event feed surfaces that reflect real approved Mode 2 events. Do not treat narrative as proof that morale, relationships, milestones, designations, reporter behavior, or offseason story systems are complete. Narrative outputs must be franchise-scoped and evidence-backed.  

### M2-D015: Fan morale

**What the spec asks for:** Team fan morale is a 0-99 state based on performance, designations, beat reporter sentiment, roster true value, random events, trade scrutiny, decay/recovery, health warnings, player morale effects, FA attractiveness, and narrative tone.

**What appears to exist in the repo:** `fanMoraleEngine.ts`, `useFanMorale.ts`, and app integration wrappers exist. Crosswalk/inventory say fan morale engine exists, but Team Hub fan morale and season summary fan morale are placeholder/deferred. Tests verify engine behavior but not full franchise lifecycle.

**What is ambiguous or unproven:** Durable per-franchise fan morale storage, daily snapshots, event history, trade aftermaths, season-summary handoff, Team Hub display, and Mode 3 effects are not proven.

**v1 inclusion recommendation:** Discuss or defer full fan morale. If included, define a limited durable baseline rather than the full gospel formula.

**Consequences of including:** Adds meaningful season emotion and Mode 3 consequences but introduces many dependencies.

**Consequences of deferring:** Narrative/designation/trade systems lose some effects, but core scoring remains stable.

**Dependencies:** Standings, designations, reporter sentiment, true value/salary, random events, trades, player morale, Mode 3 FA.

**Test confidence:** Medium for engine; low for franchise integration.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Fan morale is a desired franchise system, but v1 inclusion requires durable franchise-scoped state and evidence-backed inputs. If not proven, include only stable read-only/baseline surfaces and defer full dynamic fan morale effects.  

### M2-D016: Player morale

**What the spec asks for:** Every player has morale state and history affected by personal milestones, wins/losses, streaks, fan morale, narrative, designations, trades, relationships, captain effects, and personality. Morale can suggest rating changes, but user must apply changes in SMB4.

**What appears to exist in the repo:** Relationship engines can calculate morale effects, and some free-agency/trade adapter tests explicitly call out missing personality/morale context. No durable player morale franchise implementation was proven in targeted evidence.

**What is ambiguous or unproven:** Storage, UI, history, thresholds, rating-change suggestion pipeline, and integration with narrative/fan morale/relationships are not proven.

**v1 inclusion recommendation:** Defer unless the user approves a very small read-only or placeholder baseline. Do not collapse it into generic narrative.

**Consequences of including:** Adds long-term player emotional state, but requires many other derived systems to be real.

**Consequences of deferring:** Removes a major dependency chain from v1, but makes narrative/fan morale less consequential.

**Dependencies:** Fan morale, narrative, milestones, relationships, designations, trades, personality.

**Test confidence:** Low.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Preserve player morale fields/baseline if already present, but defer full dynamic player morale behavior until role, roster movement, personality, relationships, and transaction inputs are scoped and durable.  

### M2-D017: Relationships engine

**What the spec asks for:** Relationships affect matchup context, player morale, trade warnings, chemistry narratives, manager/storyline dynamics, and potentially leverage/revenge arcs.

**What appears to exist in the repo:** `relationshipEngine.ts` supports relationship creation, morale effects, breakdowns, and trade warnings. `relationshipStorage.ts` provides IndexedDB CRUD. `src/hooks/useRelationshipData.ts` is storage-backed. `src/src_figma/app/hooks/useRelationshipData.ts` is in-memory. `useFranchiseData.ts` exposes relationship data from the app hook. Tests exist for relationship hooks/integration and leverage relationship behavior.

**What is ambiguous or unproven:** Active franchise UI/storage appears ambiguous: the franchise chemistry tab is Coming Soon, the app hook is in-memory unless manually loaded, and relationship storage is not clearly per-franchise. Farm relationships and storylines are not proven.

**v1 inclusion recommendation:** Discuss. Recommended stance is to preserve engine/data experiments but defer durable franchise relationships unless the user explicitly wants to harden them now.

**Consequences of including:** Enables trade warnings, chemistry stories, player morale, and rivalry/revenge arcs.

**Consequences of deferring:** Removes a large hidden-state system from v1 and reduces risk.

**Dependencies:** Player morale, trade logic, narrative, personality, chemistry, storage scoping.

**Test confidence:** Medium for engine; low for active franchise integration.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Relationships are important, but v1 status depends on repo audit. Preserve existing engine/data if present. Approve only durable franchise-scoped relationship lifecycle and surfaces that are proven; otherwise defer dynamic behavior while keeping fields/hooks available for later.  

### M2-D018: Personality/chemistry effects

**What the spec asks for:** Personality and hidden modifiers influence reporter/player quotes, captain selection, morale, FA/trade/retirement behavior, and relationships. Chemistry type contributes to trait potency and salary valuation.

**What appears to exist in the repo:** Player personality and chemistry fields exist in builder/player/franchise data paths. Mode 1 accepted that these should be stored at handoff. Crosswalk says hidden modifiers and full personality behavior are incomplete. Chemistry tab in Franchise Home is Coming Soon. Salary/trade/FA tests mention missing personality/morale/chemistry as limitations.

**What is ambiguous or unproven:** Hidden modifiers, team-wide trait potency recalculation, salary impact, reporter hints, captain behavior, and chemistry UI are not proven as Mode 2 franchise behavior.

**v1 inclusion recommendation:** Preserve fields and snapshots; defer broad behavior effects unless explicitly approved.

**Consequences of including:** Rich personality/chemistry consequences become possible.

**Consequences of deferring:** Data remains ready for later systems without destabilizing v1.

**Dependencies:** Mode 1 handoff data, salary, fan/player morale, relationships, narrative, designations.

**Test confidence:** Medium for field presence; low for full behavior.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Mode 2 must preserve personality and chemistry as distinct player/team data from Mode 1. v1 should only activate personality/chemistry effects where specific consumers are proven and auditable. The full personality effects system and full chemistry effects system are required franchise goals, but need dedicated build/audit passes because they are separate concepts with separate downstream effects.  

### M2-D019: Dynamic designations

**What the spec asks for:** Projected/locked Team MVP, Ace, Fan Favorite, Albatross, Cornerstone, Team Captain, and Fan Hopeful designations update during or after season, with badges, notifications, fan morale effects, Fame, carryover, and narrative hooks.

**What appears to exist in the repo:** Some team MVP/fan favorite/albatross engines and season summary/award surfaces exist. Award race panels are placeholder/copy in Franchise Home. Crosswalk says designation contract is partial; Captain/Fan Hopeful are ambiguous; carryover and UI/storage for all designations are not proven.

**What is ambiguous or unproven:** Full projection recalculation after each game, badge UI, notifications, locked state at season end, carryover, Captain from hidden modifiers, and Fan Hopeful from farm prospects are not proven.

**v1 inclusion recommendation:** Discuss. A limited projected MVP/Ace display may be possible if WAR/stats are stable, but full designation system should probably defer until WAR/value/morale are settled.

**Consequences of including:** Adds identity, narrative hooks, and fan morale effects.

**Consequences of deferring:** Fan Favorite/Albatross/Cornerstone/Caption/Fan Hopeful effects remain future work.

**Dependencies:** WAR, pWAR, true value/salary, farm prospects, hidden modifiers, fan/player morale, narrative.

**Test confidence:** Low-medium.

**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Dynamic designations are a required v1 feature. Everything upstream of them must be stabilized before v1 ships, including approved performance inputs, salary/value calculations, WAR/WPA usage, morale/relationship dependencies where applicable, and persistence/carryover behavior. A dedicated salary/designation input review is needed to decide whether WPA replaces or augments any existing designation inputs.  

### M2-D020: Park factors and stadium analytics

**What the spec asks for:** Park factors include seed/calculated/blended factors, activation after 40% of season, confidence tiers, spray charts, stadium records, and WAR integration.

**What appears to exist in the repo:** Team stadium fields exist and are copied/displayed. `parkFactorDeriver.ts` and `ParkFactors` types exist. GameTracker stores `stadiumName`/park context in places, but comments show "Use name as ID -- no separate stadiumId system yet." Inventory says Team Hub stadium analytics and season summary park factors are placeholder/deferred.

**What is ambiguous or unproven:** Seed factor coverage, observed blending, per-stadium persistence, spray chart records, stadium records, and WAR integration are not proven end-to-end.

**v1 inclusion recommendation:** Preserve stadium inputs and event context. Discuss full park factor analytics separately, likely defer unless WAR fairness requires a minimal seed-only implementation.

**Consequences of including:** WAR and stat comparisons become more fair, and stadium pages gain meaning.

**Consequences of deferring:** WAR should avoid claiming park-adjusted precision, but core scoring is unaffected.

**Dependencies:** Mode 1 stadium/team identity, event location enrichment, WAR, season stats, adaptive standards.

**Test confidence:** Medium for type/engine pieces; low for franchise UI/persistence.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Mode 2 must preserve stadium/park-factor inputs and use them in any approved park-adjusted stats, WAR/value, salary, or designation calculations. Park factors and stadium analytics should use PARK_FACTOR_SEED_SPEC.md and STADIUM_ANALYTICS_SPEC.md as source-of-truth inputs for a dedicated audit/build pass. Because GameTracker captures spray chart data for every at-bat, v1 should consider stadium-linked metrics in Team Hubs and game/stadium analysis where feasible. Full scope should be decided during the park factors/stadium analytics pass; calculation paths must clearly state whether they are park-adjusted or unadjusted.  

### M2-D021: Salary/payroll display or season effects

**What the spec asks for:** Salary/true value affects Fan Favorite/Albatross, roster value, trade scrutiny, fan morale, FA attractiveness, and Mode 2/3 consequences. Mode 1 initializes salary baseline.

**What appears to exist in the repo:** Salary/grade engines and ratings/salary offseason adapter are implemented and tested. Player salary fields exist. Trade/free-agency adapters read salary in previews. Mode 2 in-season payroll display/effects are not proven complete.

**What is ambiguous or unproven:** True Value formula parity, in-season payroll morale, real-time salary triggers, salary ledger display, and Mode 2 trade/FA consequences are not proven.

**v1 inclusion recommendation:** Include read-only salary/payroll baseline if it already exists and is accurate. Defer Mode 2 salary effects unless the dependent systems are approved.

**Consequences of including:** Users can audit roster cost and later Mode 3 decisions have baseline data.

**Consequences of deferring:** Fan Favorite/Albatross/value-delta features may need deferral too.

**Dependencies:** Mode 1 salary initialization, WAR/true value, fan morale, trades, Mode 3 FA.

**Test confidence:** Medium-high for salary engine; low-medium for Mode 2 season effects.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Mode 2 must display and use the salary/payroll baseline from Mode 1 and support approved salary/value inputs required by dynamic designations. The salary system must be stable and fully built out for v1 according to SALARY_SYSTEM_SPEC_UPDATED.md. There will be no luxury tax logic. Salary/value behavior should be audited against the salary spec before deciding exact season, morale, trade, free-agency, and true-value effects.  

### M2-D022: Trade logic if Mode 2 includes in-season trades

**What the spec asks for:** TransactionEvent supports trades; trade deadline blocks trades after configured point; trade scrutiny affects fan and player morale; trade reactions feed narrative.

**What appears to exist in the repo:** `MODE_2_V1_TRANSACTION_UI_ENABLED = false` in `FranchiseHome.tsx`. `franchiseTradeAdapter.ts` and tests are dry-run/preview only and explicitly state no trade execution, no player movement, no transaction writes, and deferred AI/acceptance/chemistry/morale/injuries/salary-cap enforcement.

**What is ambiguous or unproven:** Whether any current visible route exposes TradeFlow despite the disabled transaction tab should be audited, but current evidence is non-executable.

**v1 inclusion recommendation:** Defer in-season trade execution. Preserve transaction event types and deadline rules as future-facing if needed, but do not expose unimplemented trade behavior as v1.

**Consequences of including:** Would require real roster movement, transaction logs, salary/true value, morale, relationships, narrative, and deadline enforcement.

**Consequences of deferring:** v1 remains focused on scoring and season progression; trade scrutiny/fan morale dependencies can wait.

**Dependencies:** Roster movement, salary, relationships, fan/player morale, narrative, deadline calculation.

**Test confidence:** High that current trade adapter is preview-only; low for executable trade behavior.

**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Trades are required for v1 as user-driven franchise roster mutations. v1 does not need AI trade logic or salary-matching rules. Trade execution must correctly update roster/team assignments, preserve player identity and historical stats, ensure future stats, storylines, designations, and downstream systems follow the new team, log scoped transactions, and avoid leaving players stuck on prior teams. Some trade pieces may already exist, but a dedicated continuity audit is required to ensure storylines remain ongoing and accessible after trades.  

### M2-D023: Farm system roster dynamics during season

**What the spec asks for:** Mode 2 receives farm rosters, can designate Fan Hopefuls, supports call-ups/send-downs, tracks farm morale/relationships/storylines, and uses farm events in narrative/roster dynamics.

**What appears to exist in the repo:** `franchiseFarmStorage.ts`, `franchiseRosterMovement.ts`, roster movement tests, Phase 11 planner/actions, farm record scoping, option counts, call-up reveal, and rollback tests exist. Team Hub reads farm records; some farm/chemistry tabs are Coming Soon. Crosswalk says movement works, but narrative/farm morale/storyline/event systems are not wired.

**What is ambiguous or unproven:** Regular-season visible farm management UI, all approved roster rules, farm morale, scouted-only UI, relationship/storyline systems, and broad farm mechanical events are not proven.

**v1 inclusion recommendation:** Discuss limited farm mechanics. Preserve farm records and maybe roster movement utilities, but avoid claiming full farm dynamics without UI/storage proof.

**Consequences of including:** Users can manage injuries/depth and farm promotions during season.

**Consequences of deferring:** Farm remains mostly a Mode 1/Mode 3 handoff store during v1.

**Dependencies:** Mode 1 10-player farm handoff, roster movement UI, transaction log, player availability, morale/narrative if included.

**Test confidence:** Medium for utility actions/storage; low-medium for regular-season visible workflow.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Farm roster dynamics are required for v1 at the core roster-management level, following FARM_SYSTEM_SPEC.md. Farm teams are holding places for prospects with hidden ratings and/or MLB players sent down to create call-up room; farm teams do not play games. v1 must support MLB/FARM status, call-up/send-down, farm records, roster counts, trade eligibility, morale effects from call-up/send-down where scoped, transaction logs, and downstream GameTracker launch availability. Advanced farm scouting/reveal/story effects can be separately audited.  

### M2-D024: Roster movement/call-up/send-down/injury/availability behavior

**What the spec asks for:** GameTracker supports substitutions, pitcher changes, position changes, mojo/fitness/injury tracking, and roster moves through TransactionEvents. Call-ups/send-downs/IL remain allowed after trade deadline.

**What appears to exist in the repo:** Game-level substitution/mojo/fitness/injury events exist in `useGameState.ts` and play-log utilities. Franchise roster movement utilities log call-up/send-down transactions and mutate farm/player state with rollback. Regular transaction UI is disabled. Injury list transaction type is in spec but not proven as full franchise IL workflow.

**What is ambiguous or unproven:** Regular-season call-up/send-down UI, injury availability across schedule, IL duration, roster lock enforcement during the season, and user warnings are not proven.

**v1 inclusion recommendation:** Include in-game roster/availability state used by GameTracker. Discuss whether regular-season franchise roster moves are required for v1.

**Consequences of including:** Users can reflect SMB4 injuries/availability and roster changes more truthfully.

**Consequences of deferring:** Roster changes between games may require manual data edits or remain unsupported.

**Dependencies:** Farm storage, transaction log, GameTracker roster sync, player availability fields, UI access.

**Test confidence:** Medium-high for game-level events and utility moves; low-medium for user-facing season workflow.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** v1 requires scoped roster movement for call-up/send-down, trades, releases/signings where approved, and GameTracker availability. Injury/fitness/mojo states should be preserved where already stable, but durable season-long injury/availability behavior needs explicit audit before v1-complete status.  

### M2-D025: Awards/watchlists

**What the spec asks for:** Mode 2 produces award candidates for Mode 3 and can show award/watchlist panels. Career awards do not scale, but candidates derive from season stats/WAR.

**What appears to exist in the repo:** Regular-season leaders exist. Some award race panels are placeholder/copy only with empty arrays. Awards Ceremony candidate source is ambiguous in inventory and may use offseason/global data rather than franchise-owned state.

**What is ambiguous or unproven:** MVP/Cy Young/ROY/Gold Glove candidate formulas, franchise-owned source, UI, and Mode 3 handoff are not proven.

**v1 inclusion recommendation:** Defer formal awards unless the user approves a lightweight watchlist based on existing leaderboards. Do not present placeholders as real awards.

**Consequences of including:** Adds season-end payoff and Mode 3 candidate input.

**Consequences of deferring:** Mode 3 awards may need later implementation; core season loop remains unaffected.

**Dependencies:** Stats, WAR, fielding, playoffs, Mode 3 ceremony.

**Test confidence:** Low-medium.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Awards/watchlists are a v1 goal, but formal award logic must be audited/revised after WPA, WAR, salary/value, dynamic designations, and season-length weighting decisions. Include stable leaders/watchlists now if available; do not finalize award winners from incomplete inputs.  

### M2-D026: No AI game simulation in v1

**What the spec asks for:** AI Game Engine is deferred to v2. v1 Game Buttons are SCORE and SKIP only. There is no SIMULATE button.

**What appears to exist in the repo:** `MODE_2_V1_SYNTHETIC_SIM_ENABLED = false` guards simulation code in `FranchiseHome.tsx`. The Next Game UI includes an explicit comment that user is the bridge for every result and synthetic simulation stays unavailable. Synthetic game factory and overlay exist but are guarded off.

**What is ambiguous or unproven:** Hidden or alternate paths should be audited, but current Franchise Home UI guards are clear.

**v1 inclusion recommendation:** Must include as an exclusion: no AI/synthetic simulation in Mode 2 v1.

**Consequences of including:** Aligns with accepted constraints and avoids fake results/stats.

**Consequences of deferring:** If simulation were re-enabled accidentally, it would violate user-approved scope.

**Dependencies:** Schedule UI, manual scoring path, skip behavior.

**Test confidence:** High for current guard.

**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Mode 2 v1 excludes AI/game simulation. The app may record scored GameTracker games and user-entered SMB4 results, but must not generate game outcomes.  

### M2-D027: Manual SMB4 result entry for non-played/AI-controlled games

**What the spec asks for:** Mode 2 v1 says every game shows SCORE and SKIP. SCORE opens GameTracker for manual game entry for any matchup, including AI-vs-AI. The user is the bridge for all game results.

**What appears to exist in the repo:** Score Game launches GameTracker. Skip marks a game as `SKIPPED`. No final-score-only manual result entry path was proven. Existing completion path comes through GameTracker and `completeScheduleGame`.

**What is ambiguous or unproven:** If the user wants to record SMB4 results for AI-controlled/non-played games without play-by-play, the repo may not have that feature. "Manual result entry" could mean full GameTracker score entry or final-score-only schedule completion; this needs user decision.

**v1 inclusion recommendation:** Discuss exact behavior. Recommended default: SCORE via GameTracker is included; final-score-only entry is not assumed included unless approved.

**Consequences of including final-score-only entry:** Users can complete AI/CPU games from SMB4 box scores quickly, but stats/WAR/milestones may be incomplete unless clearly labeled.

**Consequences of deferring final-score-only entry:** Every completed game with stats must be scored manually in GameTracker, while unwanted games can be skipped.

**Dependencies:** Schedule status/results, standings update, stats policy for non-play-by-play games, controlledBy metadata.

**Test confidence:** High for Score/Skip; low for final-score-only entry.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Mode 2 v1 should support manual final-score entry for SMB4 games not fully scored in GameTracker, clearly marked as box-score/stat-incomplete unless detailed stats are entered. These results may update schedule and standings, but should not fabricate player stats, WPA, awards inputs, milestones, or other derived player/team analytics.  

### M2-D028: Mode 2 to Mode 3 handoff

**What the spec asks for:** At season end, Mode 2 produces a copy-not-reference SeasonSummary with final standings, playoff results, all player season/career stats, designations, fan morale, milestones, park factors, and narrative highlights.

**What appears to exist in the repo:** Season completion detection, season summary storage, transition journals, and transition orchestrator exist and are tested. Inventory says season summaries are implemented and wired with placeholders for awards, milestones, fan morale, narrative, park factors, and adaptive standards.

**What is ambiguous or unproven:** The handoff object is only as complete as the approved Mode 2 systems. Several gospel fields are not durable today.

**v1 inclusion recommendation:** Include core handoff for completed games, stats, standings, playoffs, and archived season data. Treat derived fields as conditional on their individual decisions.

**Consequences of including:** Mode 3 has a stable snapshot boundary and can avoid live references to Mode 2 state.

**Consequences of deferring:** Offseason cannot trust the season it receives.

**Dependencies:** Game completion, standings, stats, playoff results, season summary storage, all derived system decisions.

**Test confidence:** Medium-high for core summary/transition; low-medium for full gospel fields.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Mode 2 must produce a scoped season-to-offseason handoff for Mode 3 with core standings, completed-game/archive status, playoff results, stats, roster/farm state, salary/payroll state, and transaction history. Derived outputs such as awards, designations, morale, relationships, narrative, milestones, park factors, and WPA/WAR summaries are included only if their upstream Mode 2 systems are approved and proven.  

### M2-D029: GameTracker enrichment, substitutions, pitch count, fielding, mojo/fitness

**What the spec asks for:** Optional enrichment through the play log, field location, fielding sequence, HR distance, pitch type, pitch counts, modifiers, runner actions, substitutions, pitcher changes, position changes, and user-observed mojo/fitness/injury changes. Core stats must remain correct from one-tap outcomes.

**What appears to exist in the repo:** `useGameState.ts` is large and handles game state, events, runner outcomes, pitcher/fielding events, WPA, state changes, injury-linked rows, stadium name, GameTracker persistence, and completion. GameTracker components and play-log utilities exist. Mojo/fitness engines and tests exist.

**What is ambiguous or unproven:** Exact parity with all six enrichment types, pitch-count prompts, primary fielder inference simplification, no-reentry validation, and all substitution constraints needs audit. Some spec wording says v1 keeps all six enrichment types, but repo evidence should be verified before scope lock.

**v1 inclusion recommendation:** Include stable GameTracker mechanics and user-observed mojo/fitness boundary. Audit enrichment/substitution parity before claiming full gospel coverage.

**Consequences of including:** Better stat/WAR quality and more faithful SMB4 tracking.

**Consequences of deferring:** Core scoring can still work, but fielding/WAR/pitching precision decreases.

**Dependencies:** GameTracker UI, event schema, season aggregation, WAR, milestone/fame, narrative.

**Test confidence:** Medium-high for current GameTracker foundation; medium for exact gospel parity.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Core stable GameTracker scoring/enrichment mechanics are required for v1, including substitutions, pitcher changes, fielding/baserunning capture, lineup state, and approved mojo/fitness/availability observations. GameTracker is the source of truth for gameplay-oriented data. Franchise/Mode 2 hub systems should consume and interpret GameTracker data to drive storylines, transactions, calculations, and non-gameplay instances rather than reinventing gameplay data. Advanced enrichment parity should be audited against the Mode 2 spec and current GameTracker improvements before claiming full completion.  

### M2-D030: Adaptive standards and threshold scaling

**What the spec asks for:** Opportunity factor, scaling factors, SMB4 static defaults, qualification thresholds, minimum floors, and position-specific adjustments provide baselines for milestones, WAR, replacement level, and thresholds.

**What appears to exist in the repo:** Adaptive learning/calibration engines and references exist. WAR and milestone tests include some scaling behavior. Inventory says adaptive standards are not proven as persisted franchise summaries.

**What is ambiguous or unproven:** Whether one canonical adaptive standards service feeds all approved consumers is not proven. Multi-season calibration is deferred in the gospel; v1 static defaults may be enough.

**v1 inclusion recommendation:** Include only as a dependency for approved stats/WAR/milestone consumers. Do not treat as a standalone user-facing system unless the user approves it.

**Consequences of including:** Thresholds and WAR become more consistent across season lengths.

**Consequences of deferring:** Use simple/static defaults and avoid claims of adaptive precision.

**Dependencies:** Mode 1 season length/innings metadata, WAR, milestones, leaders, qualification thresholds.

**Test confidence:** Medium-low.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Adaptive standards and threshold scaling are critical infrastructure because franchise seasons can have customizable season lengths and game lengths/innings. They are required for approved systems that need season-length, innings, league-context, park, or sample-size adjustment, including WAR/value, awards, designations, milestones, and salary inputs where applicable. Do not expose as a standalone v1 feature unless there is a stable UI; audit each consumer's threshold/scaling logic.  

## 6. Mode 2 decision closeout

All 30 Mode 2 worksheet decisions have been reviewed once with the user. This section summarizes the approved direction without replacing the decision-by-decision notes above.

### 6.1 Required Mode 2 v1 foundations

- Franchise Home is the Mode 2 hub, but incomplete or placeholder tabs are judged by their own feature decisions.
- All approved Mode 2 systems must use canonical franchise/season/stats scope identity and franchise-owned reads/writes.
- Schedule state is user-supplied only: empty startup, manual entry/editing, and user-supplied CSV rows are acceptable; generated schedules are not.
- GameTracker launches from valid franchise schedule rows using current franchise-owned Mode 2 roster/team/player state at game start, then freezes launched roster/lineup/pitcher snapshots.
- Active-game save/load/resume must preserve the launched game snapshot and must not refresh from later live roster edits.
- Game completion/archive must preserve canonical identity, update schedule/playoff state through scoped paths, aggregate stats once, and be idempotent against retry/restore/double-completion.
- No AI or game simulation is included in Mode 2 v1. The app records scored GameTracker games and user-entered SMB4 results; it does not generate game outcomes.

### 6.2 Season and playoff progression requirements

- Core regular-season standings are required and must update from completed franchise games only.
- Advanced magic number, clinch/elimination, playoff odds/projection, and complex tiebreak UI require separate audit before v1-complete status.
- Normal franchise playoff eligibility, seeding, and bracket setup are derived from completed standings and Mode 1 playoff rules/config.
- Run differential is the tiebreaker. If teams remain tied after run differential, the user resolves the tie at review/confirm.
- Users should not redesign playoff format or series rules at season end in v1.
- Franchise playoff games launch through GameTracker with canonical playoff/franchise/season identity and complete through the same scoped archive/stat/bracket path.

### 6.3 Stats, analytics, and GameTracker requirements

- Core batting, pitching, fielding, team, game, season, and playoff stat aggregation is required from completed franchise games.
- GameTracker is the source of truth for gameplay-oriented data. Franchise/Mode 2 systems consume and interpret GameTracker data rather than reinventing gameplay data.
- Core stable GameTracker mechanics are required: substitutions, pitcher changes, fielding/baserunning capture, lineup state, and approved mojo/fitness/availability observations.
- Player WPA, manager WPA/Manager Moments, LI, and Clutch should be included in Franchise Mode 2 where stable and preserved/carried into Mode 3 where relevant.
- WPA/Manager Moments are context analytics, not WAR replacements.
- WAR components remain a separate proof/calibration track. Old `mWAR` language should be replaced by Manager Moments/WPA unless a separate `mWAR` metric is redefined.
- Adaptive standards and threshold scaling are critical infrastructure because season length and game length/innings are customizable.

### 6.4 Required value, designation, salary, and roster systems

- Dynamic designations are a required v1 feature.
- Upstream inputs for designations must be stabilized before v1 ships, including approved performance inputs, salary/value calculations, WAR/WPA usage, morale/relationship dependencies where applicable, and persistence/carryover behavior.
- Salary/payroll baseline from Mode 1 must be displayed and used where required by value/designation logic.
- The salary system must be stable and fully built out for v1 according to `SALARY_SYSTEM_SPEC_UPDATED.md`.
- There will be no luxury tax logic.
- Trades are required for v1 as user-driven franchise roster mutations.
- v1 does not need AI trade logic or salary-matching rules.
- Trade execution must update roster/team assignments, preserve player identity and historical stats, ensure future stats/storylines/designations/downstream systems follow the new team, and log scoped transactions.
- Farm roster dynamics are required at the core roster-management level under `FARM_SYSTEM_SPEC.md`.
- Farm teams are holding places for prospects with hidden ratings and/or MLB players sent down to create call-up room; farm teams do not play games.
- v1 must support MLB/FARM status, call-up/send-down, farm records, roster counts, trade eligibility, scoped morale effects where approved, transaction logs, and GameTracker launch availability.

### 6.5 Required or conditional derived systems

- Milestone detection/display can be included where stable, but durable franchise milestone history, franchise firsts/leaders/records, and narrative integration require scoped storage/audit before v1-complete status.
- Narrative/news/event feed surfaces may be included where they reflect real approved Mode 2 events. Narrative does not prove morale, relationships, milestones, designations, reporter behavior, or offseason story systems are complete.
- Fan morale is a desired franchise system, but v1 inclusion requires durable franchise-scoped state and evidence-backed inputs. If not proven, only stable read-only/baseline surfaces should be included.
- Player morale fields/baselines should be preserved if present, but full dynamic behavior waits for role, roster movement, personality, relationships, and transaction inputs.
- Relationships are important and any existing engine/data should be preserved, but v1 approval depends on durable franchise-scoped lifecycle and surfaces being proven.
- Personality and chemistry are distinct concepts. Mode 2 must preserve both from Mode 1, activate only proven/auditable consumers in v1, and plan dedicated build/audit passes for full effects systems.
- Awards/watchlists are a v1 goal, but formal award logic must be audited/revised after WPA, WAR, salary/value, dynamic designations, and season-length weighting decisions.
- Park factors and stadium analytics should use `PARK_FACTOR_SEED_SPEC.md` and `STADIUM_ANALYTICS_SPEC.md` as source-of-truth inputs for a dedicated pass. Stadium-linked metrics should be considered because GameTracker captures spray chart data for every at-bat.

### 6.6 Result entry and Mode 3 handoff

- Manual final-score entry for SMB4 games not fully scored in GameTracker should be supported, but must be clearly marked as box-score/stat-incomplete unless detailed stats are entered.
- Final-score-only results may update schedule and standings, but must not fabricate player stats, WPA, awards inputs, milestones, or other derived analytics.
- Mode 2 must produce a scoped season-to-offseason handoff for Mode 3 with core standings, completed-game/archive status, playoff results, stats, roster/farm state, salary/payroll state, and transaction history.
- Derived outputs such as awards, designations, morale, relationships, narrative, milestones, park factors, and WPA/WAR summaries are included in the handoff only if their upstream Mode 2 systems are approved and proven.

## 7. Rejected, excluded, or narrowed from v1

- Generated franchise schedules are rejected.
- OCR schedule extraction remains post-v1 from the Mode 1 decision pass.
- AI/game simulation is rejected for Mode 2 v1.
- AI trade logic is not required for v1.
- Salary matching for trades is not required for v1.
- Luxury tax logic is rejected.
- Farm teams do not play games.
- Users do not redesign playoff format/series rules at season end in v1.
- Final-score-only entry does not create player stats or derived analytics.

## 8. Implementation-audit questions created by the reconciliation

These are not implementation steps or roadmap items. They are repo-verification questions to answer before locking a Mode 2 v1 implementation plan.

| Area | Audit question |
|---|---|
| Schedule generation | Where are all `generateSchedule` calls in franchise setup/new-season paths, and which must be removed or guarded to honor no-generated-schedule policy? |
| Empty schedule | Can a new franchise and a new season start with zero games without breaking Franchise Home, standings, playoffs, or season completion logic? |
| Manual schedule edit | Does the current schedule UI allow editing existing rows, swapping home/away, changing game/day/date/time, and reordering/moving games, or only add/delete? |
| CSV schedule import | Is there an existing CSV schedule parser/review/confirm path, and does it persist user-supplied rows with franchise/season ids? |
| GameTracker launch | Does every manually added or CSV-imported schedule row launch GameTracker with correct franchise/season/schedule/stat identity and current franchise roster state? |
| Snapshot integrity | Do active and completed games preserve launch-time roster/lineup/pitcher snapshots after later roster edits, trades, call-ups, or send-downs? |
| Completion idempotency | Can restore/retry/double-completion duplicate archives, stats, schedule completion, standings, playoff results, or next-round series? |
| Standings fields | Which standings fields are currently calculated beyond W-L/Pct/GB, and are magic/elimination/playoff status/tiebreaks implemented? |
| Playoff rules | Does playoff setup read Mode 1 rules for team count, series length, home-field format, and tiebreak behavior? |
| Playoff confirmation | Is there a season-end review/confirm step for derived playoff seeding and unresolved run-differential ties? |
| WAR feeding | Which WAR engines are fed by current franchise season stats, and where are bWAR/pWAR/fWAR/rWAR persisted/displayed? |
| WPA labels | Are player WPA, manager WPA, Manager Moments, Clutch, LI, and any old mWAR labels distinct everywhere they appear? |
| Clutch formula | Do any current clutch consumers still use old LI/contact-quality formulas contrary to the desired WPA-based framing? |
| Adaptive standards | Which consumers use season length, innings, league context, park context, and sample-size scaling, and are they consistent? |
| Dynamic designations | Which designation types have durable projected/locked state, badges, notifications, carryover behavior, and approved inputs? |
| Salary | Does Mode 2 implement the salary system from `SALARY_SYSTEM_SPEC_UPDATED.md`, and where does salary feed value/designation logic? |
| Trades | Which executable trade paths exist, and do traded players' future stats, storylines, designations, transactions, and team context follow the new team? |
| Farm movement | Is regular-season call-up/send-down UI reachable, scoped, logged, and reflected in GameTracker availability? |
| Farm proof | Do farm records stay consistent with player status/team assignment through trades, call-ups, send-downs, releases, and season handoff? |
| Injury availability | How does a user-recorded SMB4 injury affect availability for future scheduled games? |
| Park factors | Are stadium/park factor inputs copied from Mode 1 teams, and are spray-chart/stadium metrics persisted or surfaced anywhere? |
| Milestone storage | Are franchise firsts/leaders durable per franchise, or are current storage functions stubbed? |
| Narrative storage | Which news/commentary/story records are franchise-scoped, and which are fixture/global/prototype surfaces? |
| Fan morale | Is there durable per-team fan morale state by franchise/season, or only engine/local hook behavior? |
| Player morale | Is player morale stored and surfaced anywhere in franchise mode, or only implied by relationship/morale engines? |
| Relationships | Does active Franchise Home load relationship state from durable franchise-scoped storage or an in-memory hook? |
| Personality/chemistry | Are hidden modifiers present on franchise players, and are personality/chemistry consumers auditable and explainable? |
| Awards | Are awards/watchlists backed by franchise-owned season stats and approved inputs, especially WPA for shorter seasons? |
| Manual final-score entry | Is there a final-score-only completion path, and does it correctly avoid fabricated player stats/WPA/milestones/awards inputs? |
| Season summary | Which `SeasonSummary` fields are real today, and which are placeholders pending individual feature approvals? |

## 9. Next reconciliation step

The next recommended bucket is Mode 3 reconciliation. Mode 3 should start from the Mode 2 handoff requirements above rather than re-opening Mode 2 scope. The first Mode 3 pass should identify what the repo already implements for offseason flow, roster locks, salary, retirement, free agency, draft, trades, farm transitions, awards/designations, morale/relationships, and season-to-season continuity, then compare against the Mode 3 gospel spec and decide v1 inclusion, simplification, or deferral item by item.

## 10. Closeout note

This worksheet remains a reconciliation artifact, not an implementation roadmap. The approved decisions above should next be converted into a Mode 2 v1 scope document or used to drive a targeted implementation audit. No implementation priority order is locked here.
