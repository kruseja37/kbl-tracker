# Franchise v1 Threads 1-7 Stabilization and Gap Audit

Audit scope: documentation-only review of accepted Franchise v1 work through commits `bbf15e4`, `2cf79f4`, `4495ec9`, `41753c6`, `d108dfc`, `b831e90`, `b3aa3a2`, and `ecd92f2`.

This audit treats implementation, UI, storage, tests, specs, and recent commits as evidence. A feature is not classified as v1-complete unless durable storage, an accessible UI path, tests, and downstream consumers are all reasonably proven.

## Executive summary

Franchise v1 is materially more stable than the original Threads 1-7 plan. Schedule generation has been cut over to empty/manual franchise schedules, GameTracker completion is hardened, farm and manual roster movement are durable, manual trades now execute from a regular-season transaction desk, and schedule CSV import landed after the original thread plan.

The top remaining playable-confidence risk is not simply Mode 1 handoff. Mode 1 handoff still has important gaps, especially franchise type, controlled team semantics, and some setup UI claims. However, the highest risk to durable franchise truth is the stat model around playoff/regular-season boundaries and post-trade team attribution. Current season stat rows are keyed by `[seasonId, playerId]`, not by team stint, and playoff GameTracker completion still feeds regular season aggregation before playoff aggregation. That can make real completed games produce misleading season or team history.

The existing Figma-derived UI should not be treated as canonical merely because a screen exists. Several surfaces are real and should be reused, notably `ScheduleContent`, `GameTracker`, `TradeFlow` regular-season transaction desk, `SeasonSummary` persisted-summary view, `AlmanacNarratives`, and parts of `FranchiseSetup`. Other surfaces are prototype/read-only/deferred, including offseason chemistry, many award/museum surfaces, fantasy draft setup, trade fit preview, and static roster-validity copy.

## Original plan vs actual delivered work

| Thread | Planned work | Classification | Evidence |
| --- | --- | --- | --- |
| Thread 1 | Schedule Policy Cutover | Complete | `franchiseInitializer.initializeFranchise` creates season metadata with zero scheduled games and does not call generated schedule code; `initializeEmptyFranchiseSeasonSchedule` returns `0` and carries farm records to the new season. Tests in `src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts` assert no `generateSchedule` calls and zero-row metadata. |
| Thread 2 | Mode 1 Handoff Contract | Partially complete | Copy-not-reference is real via `deepCopyLeagueToFranchise` in `src/utils/franchisePlayerStorage.ts`; stored config includes season/playoff/team/roster fields in `src/types/franchise.ts`. Gaps remain: no canonical `franchiseType`, no per-team `controlledBy`, metadata stores only one `controlledTeamId`, and `useFranchiseData.buildFranchiseLeagueTemplate` can build the league template from `config.teams.selectedTeams`, which represents controlled teams rather than all franchise teams. |
| Thread 3 | Farm Baseline | Mostly complete | Farm roster records seed from Mode 1 roster assignments in `deepCopyLeagueToFranchise`, carry forward in `initializeEmptyFranchiseSeasonSchedule`, and call-up/send-down logic updates player state plus farm records in `src/utils/franchiseRosterMovement.ts`. Tests in `src/utils/tests/franchiseRosterMovement.test.ts` cover farm handoff, carryover, and transaction logging. Remaining gaps are setup-time 22 MLB + 10 FARM enforcement and full prospect/scouting UI readiness. |
| Thread 4 | Competition Scope + Completion Idempotency | Mostly complete, with stat-boundary gap | `useGameState.endGame` persists game scope and blocks downstream completion when `processCompletedGame` fails; `processCompletedGame` handles existing archive/header idempotency. Tests such as `bugfix-r4-02-endgame.test.ts`, `franchiseSeasonScoping.wave3.test.ts`, and playoff storage tests prove several retry/scope paths. Gap: `aggregateGameToSeason` has no competition-type boundary, and playoff completion still aggregates into the same franchise `statsScopeId` before playoff stat aggregation. |
| Thread 5 | Roster Movement UI | Mostly complete | `TradeFlow.FranchiseTransactionConsole` loads franchise teams/players/farm records/transactions, executes `callUpFranchisePlayer` and `sendDownFranchisePlayer`, and renders scoped transaction history. `TradeFlow.franchiseTransactions.test.tsx` proves UI writes through durable regular-season context and does not call legacy global player/team writes. Gaps: no undo UI, no hard roster-count enforcement in the desk, and limited user guidance for SMB4 manual sync. |
| Thread 6 | Trade-Aware Stats | Not implemented as a v1-complete stat model | `trackerDb` creates season stat stores keyed by `['seasonId', 'playerId']`; `seasonStorage.getOrCreateBattingStats`, pitching, and fielding fetch by `[seasonId, playerId]` and keep the first row's `teamId`. The identity-continuity test proves stable player IDs, not team-stint attribution. No dedicated player-season-team stint store or trade-aware season stat projection was found. |
| Thread 7 | User-Driven Trades | Mostly complete | `executeManualFranchiseTrade` in `src/utils/franchiseTradeAdapter.ts` validates explicit source/target selections, moves MLB and FARM assignments, moves farm records, stales lineup snapshots, logs a scoped `trade` transaction, and rolls back on failure. `TradeFlow` exposes this as a regular-season UI path. Tests in `franchiseTradeAdapter.test.ts` and `TradeFlow.franchiseTransactions.test.tsx` cover MLB/FARM/mixed trades and UI execution. Remaining gaps are downstream stat-history attribution and a polished compensating rollback/user-facing undo path. |

## Extra accepted work outside the original plan

| Work | Readiness | Evidence |
| --- | --- | --- |
| Salary/designation/WPA/stadium/adaptive spine | Mostly complete as a spine, not complete as full value system | Initial salary is set by `withInitialFranchiseSalary`; ratings/salary recalc is implemented in `franchiseRatingsSalaryAdapter` and explicitly defers True Value/performance salary adjustments. WPA and Manager Value are persisted in GameTracker/completed game records. Stadium seed park factors are derived for known SMB4 parks. Season summaries still mark awards, milestones, fan morale, narrative, and park-factor/adaptive summaries as placeholders in `franchiseSeasonSummaryStorage`. |
| Narrative/history boundary | Mostly complete as read-only archive/projection | `gameStoriesStorage` persists scoped stories; `almanacNarrativeArchive` projects historical tidbits, post-game stories, and transaction history with franchise/playoff scope. Tests prove franchise playoff stories do not become elimination stories. Morale, chemistry, relationship, award, and random-event outcomes are explicitly not applied by transaction-history projection. |
| Manual schedule CSV import | Mostly complete | `franchiseScheduleCsv` validates CSV rows; `ScheduleContent` exposes Review CSV and Accept Import; `scheduleStorage.importFranchiseScheduleRows` writes franchise-scoped imported games. Tests cover valid rows, malformed rows, unknown teams, duplicate teams, and existing game-number conflicts. |
| Transaction desk | Mostly complete | `TradeFlow.FranchiseTransactionConsole` is a real regular-season surface for call-ups, send-downs, manual trades, and scoped history. Tests verify canonical context and guard missing season IDs before reads/writes. |
| Integration stabilization | Mostly complete | Full suite currently passes. Recent tests cover season scoping, playoff aggregation scope resolution, end-game blocking, completed archive repair, manual transaction desk, salary recalc, designations, park identity, narrative archive, and schedule CSV. |

## Bucket-by-bucket readiness matrix

### A. Mode 1 setup and handoff

| Item | Status | Evidence |
| --- | --- | --- |
| Copy-not-reference | Complete | `deepCopyLeagueToFranchise` copies league teams/players into per-franchise storage, clears edit history, copies rosters, seeds salary, and uses franchise-owned storage. |
| Franchise type | Partially complete | `FranchiseConfig.teams.mode` supports only `"single"` or `"multiplayer"`; no canonical Solo/Couch/Custom `franchiseType` field was found. |
| Controlled teams / `controlledBy` | Partially complete | `FranchiseSetup` lets users select teams and displays AI-controlled count, but `initializeFranchise` stores only the first selected team as metadata. No per-team durable `controlledBy` was found. |
| Rules snapshot | Partially complete | `FranchiseConfig.season` persists games, innings, extra innings, schedule type, all-star, deadline, mercy, and optional DH. No immutable rules snapshot object was found beyond stored config. |
| Playoff setup snapshot | Mostly complete | Stored config includes playoff teams, format, series lengths, and home field. Risk: setup UI exposes formats not proven by playoff engine coverage. |
| Season length / innings | Mostly complete | Stored config carries `gamesPerTeam` and `inningsPerGame`; GameTracker persisted state carries total innings. |
| Schedule policy | Complete | Initialization creates zero scheduled games; setup UI says manual schedule entry and empty new seasons. |
| CSV/manual schedule | Mostly complete | Manual add/edit and CSV import are wired through `ScheduleContent` and `scheduleStorage`. |
| No-DH franchise policy | Partially complete | UI defaults omit DH controls and `FranchiseSetup` displays manual schedule policy, but `FranchiseConfig.season.useDH` still exists as optional state. No hard no-DH policy guard was found. |
| Stadium identity / park factors | Mostly complete | `withFranchiseTeamParkIdentity` seeds stable stadium IDs and seed park factors for known SMB4 parks. Custom stadiums get stable IDs but no fabricated factors. |
| Salary baseline | Complete | `withInitialFranchiseSalary` recalculates rating-only salary during franchise copy; tests prove deterministic copy without mutating source players. |
| Farm/prospect/scouting/personality handoff | Partially complete | Farm records and hidden/revealed rating state are persisted. Personality fields are copied with players. Full prospect/scouting UI and downstream scouting workflow were not proven. |

### B. Mode 2 game lifecycle and stat truth

| Item | Status | Evidence |
| --- | --- | --- |
| Launch from current roster state | Mostly complete | `buildFranchiseGameTrackerRoster` loads franchise-owned players and filters active MLB assignments, excluding FARM players. Manual trades/call-ups update assignments consumed by this path. |
| In-progress snapshot immutability | Mostly complete | `useGameState` persists season/franchise/schedule/playoff/stadium/park/WPA scope in `PersistedGameState`. Full immutability across later roster moves is not exhaustively audited here. |
| Save/load/resume | Mostly complete | Existing GameTracker persistence and restored completion tests cover resumed end-game blocking and archive repair. |
| Completed archive | Complete | `processCompletedGame` archives after stat aggregation and repairs missing archive if a header already says aggregated. |
| Schedule completion | Mostly complete | `scheduleStorage.completeGame` is idempotent for the same `gameLogId`. Risk: `GameTracker.tsx` logs schedule-completion errors after successful `hookEndGame` instead of throwing, so strict repair semantics after an aggregation-success/schedule-fail split are not fully proven. |
| Playoff completion | Mostly complete | Playoff completion and restored aggregation scope are covered by `playoffStorage` and franchise Wave 3 tests. |
| Playoff vs regular-season stat boundary | Partially complete | Playoff-specific stats exist and are idempotent, but regular-season aggregation still runs through `aggregateGameToSeason` using the franchise season scope. |
| Idempotency / retry safety | Mostly complete | `processCompletedGame` short-circuits existing archives and aggregated headers; tests cover failure blocking and repair. No contribution ledger was found for every possible crash window. |
| Final-score-only/manual result entry | Not implemented or not found | No durable UI/storage path was found for final-score-only entry that avoids fabricated player stats. |
| WPA/Manager Value persistence | Mostly complete | `useGameState` stores `playerWpaTotals` and `managerWpaTotals`; completed game archive tests verify player WPA totals and stadium identity persistence. Manager Almanac aggregation has tests, but full franchise UI consumption remains partial. |

### C. Roster, farm, trades, and transactions

| Item | Status | Evidence |
| --- | --- | --- |
| Farm records from setup | Complete | `deepCopyLeagueToFranchise` creates `FranchiseFarmRecord` rows for FARM assignments; tests cover Mode 1 handoff. |
| Call-up/send-down | Complete | `franchiseRosterMovement` validates eligibility, max options, player status, farm record writes/deletes, transactions, and rollback. |
| Manual trade execution | Mostly complete | `executeManualFranchiseTrade` supports MLB, FARM, and mixed explicit trades, with transaction logging and rollback. |
| Transaction logging | Complete | `logMode2V1Transaction` is used by roster moves and trades with `franchiseId`, `seasonId`, `statsScopeId`, `seasonNumber`, and prior state. |
| Rollback/compensating rollback | Mostly complete | Storage-level rollback exists in roster movement and trade execution. User-facing undo/history rollback UI is not proven. |
| Transaction history UI | Mostly complete | `TradeFlow` displays scoped history; `AlmanacNarrativeArchive` projects transaction history into read-only narrative archive when franchise/season filters are provided. |
| Player identity continuity after trades | Mostly complete | Trades update `leagueAssignments` while preserving player IDs; designations remap team IDs on trade. Missing: team-stint stat continuity. |
| GameTracker availability after movement | Mostly complete | GameTracker roster construction consumes current franchise-owned MLB assignments, so call-ups/trades affect future launch eligibility. |
| Roster counts / 22 MLB + 10 FARM validation | Partially complete | `franchiseRosterLockValidator` and `franchisePhase11RosterPlanner` enforce/read 22 + 10 = 32 for Phase 11, but setup UI roster-validity copy is static and regular-season desk does not hard-block counts. |
| Phase 11 relationship to Mode 2 roster state | Mostly complete | Phase 11 validator/planner uses franchise-owned players and farm records. UI/action coverage for resolving all lock issues remains partial. |

### D. Salary, designations, awards, value systems

| Item | Status | Evidence |
| --- | --- | --- |
| Initial salary | Complete | `franchiseSalary.withInitialFranchiseSalary`; tests in `franchiseSalary.test.ts`. |
| D2 grade/salary recalculation | Mostly complete | `franchiseRatingsSalaryAdapter` validates offseason phase, dry-runs/applies franchise-owned player grade and salary recalculation, and rolls back writes on failure. |
| True Value/value-delta status | Partially complete | `franchiseDesignations` accepts `trueValue` and computes value delta for Fan Favorite/Albatross, but salary adapter explicitly defers True Value/performance salary adjustments until WAR/value inputs are complete. |
| Stable dynamic designations | Mostly complete | `TEAM_MVP`, `ACE`, `FAN_FAVORITE`, and `ALBATROSS` are implemented and persisted onto franchise player copies. |
| Missing Captain/Fan Hopeful status | Known not implemented | Test `franchiseDesignations.test.ts` explicitly asserts Captain and Fan Hopeful are not invented. |
| WPA vs WAR vs Manager Value boundaries | Mostly complete | WPA and Manager Value persistence/Almanac aggregation exist; WAR-based season stats exist separately. Full UI clarity across all surfaces remains partial. |
| Awards/watchlist readiness | Partially complete | Award UI exists, but `franchiseSeasonSummaryStorage` marks awards placeholder and `FranchiseHome` award-race data is empty placeholder arrays. |
| Adaptive standards use | Partially complete | Adaptive standards exist in utility/storage references, but persisted franchise season summaries mark park-factor/adaptive summaries as placeholder. |

### E. Stadium/park analytics

| Item | Status | Evidence |
| --- | --- | --- |
| Stadium identity | Mostly complete | Team snapshots and completed game archives preserve stable stadium identity. |
| Seeded SMB4 park factors | Mostly complete | `parkFactorDeriver` derives seed factors for known parks; tests load 23 parks and verify known park factors. |
| Custom stadium/factor input | Partially complete | Custom stadium identity is preserved, but tests assert custom park factors are not fabricated. No custom factor input UI was found. |
| Spray-chart stadium analytics | Partially complete | Field-zone and stadium-spray event data structures exist, and GameTracker validates HR distance against park fences. Durable stadium analytics surfaces and summaries are not proven. |
| Team Hub/Almanac stadium surfaces | Partially complete | Museum/stadium storage exists, but `useMuseumData` falls back to empty stadiums and season summary park factors are placeholders. |

### F. Narrative, morale, relationships, history

| Item | Status | Evidence |
| --- | --- | --- |
| Reporter stories | Mostly complete | `gameStoriesStorage` persists scoped stories; tests cover franchise playoff story scope. |
| Player story continuity | Partially complete | Narrative archive can filter by player IDs mentioned. No full player-story continuity UI across trades was proven. |
| Transaction-history projection | Mostly complete | `almanacNarrativeArchive.transactionToArchiveEntry` projects durable transaction logs and states it does not apply morale/chemistry/award/random outcomes. |
| Relationship engine status | Partially complete | `relationshipStorage` persists a separate `kbl-relationships` database. No franchise-scoped relationship workflow integration was proven. |
| Personality vs chemistry status | Partially complete | Personality is copied with player records; offseason chemistry UI says "Coming Soon" and instructs users to skip the phase. |
| Fan morale/player morale status | Not implemented as durable v1 | `franchiseSeasonSummaryStorage` marks fan morale placeholder; narrative transaction projection explicitly does not apply morale outcomes. |
| Random narrative event status | Not implemented as durable v1 | No durable franchise random-event mutation path was found; transaction projection explicitly avoids random-event outcomes. |
| Franchise firsts/leaders/milestones | Partially complete | `milestoneAggregator` has franchise firsts/leaders logic, but persisted season summaries mark milestones placeholder and Almanac/Team Hub surfaces are not proven as complete. |
| Almanac/Team Hub history surfaces | Partially complete | `AlmanacNarratives` and `ManagerAlmanac` are real read-only consumers. Museum and award surfaces are incomplete/placeholder-heavy. |

## Existing UI readiness matrix

| Surface | Readiness | Evidence and reuse recommendation |
| --- | --- | --- |
| `FranchiseSetup` | Real but not fully trustworthy as canonical contract | Reuse for league/season/manual schedule/team selection, but do not trust static roster-validity copy or fantasy draft option as v1-complete. It lacks canonical franchise type and per-team `controlledBy`. |
| `ScheduleContent` | Real and reusable | Manual add/edit/delete plus CSV review/import are wired to callbacks and tested. Keep and extend rather than rebuild. |
| `GameTracker` | Real and reusable | Current GameTracker has durable state, scope IDs, stadium/WPA persistence, and hardened end-game path. Remaining work should refine stat truth rather than replace the surface. |
| `TradeFlow` regular-season transaction desk | Real and reusable | The transaction console is wired to franchise storage and canonical transactions, with tests proving no legacy global writes for the execution path. |
| `TradeFlow` fit preview | Guarded/read-only | Dry-run preview remains read-only by design and should not be presented as execution. |
| `FranchiseHome` regular-season shell | Mostly real | Navigation and tab routing expose schedule, roster/trade desk, leaders, standings, news. Some loaded data is durable, but several tabs contain placeholder/deferred content. |
| `SeasonSummary` | Real as a persisted-summary reader, incomplete as full season archive | It reads durable season summaries, but those summaries intentionally mark awards, milestones, fan morale, narrative, and park factors as placeholders. |
| Offseason phases in `FranchiseHome` | Mixed, many guarded/deferred | Ratings/salary and some Phase 11 storage are real. Chemistry explicitly says Coming Soon. Farm reconciliation copy tells users to skip. Expansion/contraction is a note. |
| Awards UI | Prototype/partial | `FranchiseHome` award-race arrays are empty placeholders; season summaries mark awards not finalized. Reuse visual pieces only after durable award winners are wired. |
| Museum UI | Partial/global | `useMuseumData` can read real museum stores and auto-populate leaders, but many areas fall back to empty arrays. Not a complete franchise-owned history surface. |
| `AlmanacNarratives` | Real read-only projection | Uses `listAlmanacNarrativeArchive` to surface historical tidbits, post-game stories, and transaction history. Reuse for narrative/history boundary. |
| `ManagerAlmanac` | Real read-only consumer | Manager WPA aggregate and leaderboard queries are wired and tested. Reuse for Manager Value surfaces. |
| Fantasy draft setup | Not trustworthy v1 entry point | Setup UI lets `roster.mode` become `"draft"` and describes a snake draft, but no initializer evidence was found that executes a fantasy draft into durable rosters. |

## Blockers to v1 playable confidence

1. Stat truth after playoffs and trades. Playoff games can feed regular-season aggregation, and season stat rows do not represent team stints after trades.
2. Mode 1 control contract. The app needs a durable franchise type and per-team control model, not only `selectedTeams` plus a single metadata `controlledTeamId`.
3. Roster-count enforcement at setup and live movement points. Phase 11 has validators, but the setup wizard claims validity without proven validation, and the transaction desk displays counts without enforcing 22 MLB + 10 FARM.
4. Final-score-only/manual result entry is not proven. If v1 requires score-only schedule completion, it must avoid fabricated player stats.
5. Schedule completion repair semantics after a post-aggregation completion failure are not fully proven.

## High-value non-blockers

1. Custom park-factor input for custom stadiums.
2. Award/watchlist surfaces after stat truth is fixed.
3. Relationship/morale/chemistry integration.
4. Franchise firsts/leaders promotion into season summaries and Team Hub/Almanac.
5. User-facing undo/compensating rollback UI for transaction history.
6. Better chunking for large production bundles. Build passes, but Vite reports chunks over 500 kB.

## Unknowns requiring targeted audit

1. Whether `useFranchiseData.buildFranchiseLeagueTemplate` intentionally limits standings/division structure to controlled teams or is a bug after copy-not-reference stabilization.
2. Whether any hidden final-score-only path exists outside the searched schedule/GameTracker surfaces.
3. Whether in-progress game snapshots are fully immutable against roster moves after launch, beyond the launch/current-roster path.
4. Whether playoff setup UI formats such as non-bracket options are fully supported by the playoff engine.
5. Whether milestone/franchise-leader logic is invoked in the current GameTracker completion path or remains an unused utility for future promotion.
6. Whether historical player-card/Team Hub views need team-stint splits or only player-career continuity for v1.

## Recommended next implementation slice, with rationale

Recommended next slice: stat truth boundary hardening for regular season, playoffs, and trades.

Rationale: the app can now create franchises, manually build schedules, launch games, complete games, move players, and execute manual trades. Those are playable actions. The riskiest remaining failure mode is that those valid actions can create durable stats that are hard to trust later. A focused slice should separate regular-season and playoff aggregation behavior, define whether season stats are player-only or player-team-stint rows, and make post-trade team attribution explicit for standings/leaders/history. This is higher risk than Mode 1 handoff because it affects completed-game truth after the user has already invested play time.

Mode 1 handoff should remain the next high-priority slice after stat truth or be included only where it is needed to supply correct `franchiseType`/controlled-team context to stat consumers.

## Exact next prompt for that slice

```text
Recommended reasoning: High

Please implement the next Franchise v1 playable-confidence slice: stat truth boundary hardening for regular season, playoffs, and trades.

Use spec-docs/FRANCHISE_V1_THREADS_1_7_STABILIZATION_AND_GAP_AUDIT.md as the starting audit.

Goals:
1. Prove and fix the regular-season vs playoff stat boundary so playoff games do not contaminate regular-season leaderboards/season stats unless explicitly intended by a documented aggregate.
2. Define and implement the minimal v1 trade-aware stats model. At minimum, make post-trade team attribution explicit and tested. If player-season rows remain player-only, add a separate durable player-team-stint or projection layer for team leaders/history.
3. Preserve player identity continuity across trades.
4. Keep GameTracker completion idempotent and retry-safe.
5. Add focused tests for:
   - regular-season game aggregates only to regular-season stats;
   - playoff game aggregates to playoff stats without regular-season contamination;
   - traded player future stats are attributed according to the chosen v1 model;
   - repeated completion/retry does not double-count either regular or playoff stats.

Constraints:
- Do not rebuild UI unless a small read-only/debug surface is necessary.
- Do not modify unrelated Figma/prototype surfaces.
- Do not stage or commit unless explicitly asked.
- Report any existing failures honestly.
```

## Verification results

Commands run:

```text
git status --short
git log --oneline -10
npm test -- --reporter=dot
npm run build
```

Results:

| Command | Result |
| --- | --- |
| `git status --short` | Only the user-excluded dirty files were present before this audit file was created: `package.json`, `supabase/.temp/cli-latest`, roster export scripts, SMB4 team profile data, and `spec-docs/generated/`. |
| `git log --oneline -10` | Top commits matched the accepted work list: `ecd92f2`, `b3aa3a2`, `b831e90`, `d108dfc`, `41753c6`, `4495ec9`, `2cf79f4`, `bbf15e4`, followed by `22b20ec` and `0c0c772`. |
| `npm test -- --reporter=dot` | Passed: 324 test files, 6618 tests. Existing noisy stderr included React `act(...)` warnings, expected sync diagnostic errors, and `indexedDB is not defined` warnings in some FranchiseHome tests, but no failures. |
| `npm run build` | Passed: `tsc -b && vite build`, 2390 modules transformed, PWA generated. Vite emitted existing chunk-size warnings for chunks over 500 kB. |

No app code, UI, or tests were modified for this audit.
