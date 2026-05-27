# Franchise v1 Audit: Roster, Farm, Trade, and Transaction Continuity

**Status:** Repo-first implementation audit  
**Created:** 2026-05-27  
**Scope:** Franchise Modes 1 and 2 continuity for roster movement, farm records, trades, player identity, GameTracker availability, and transaction/event logging.  
**Constraint:** Documentation-only. No app code or tests were changed.

## Executive summary

The repo has a credible franchise-owned roster foundation: Mode 1 copies League Builder players and teams into franchise-owned storage, roster statuses live on player league assignments, GameTracker launch reads current franchise-owned MLB assignments, and the call-up/send-down utilities can mutate player roster status plus farm records while logging canonical transactions.

The implementation is not v1-stable for the full requested roster/farm/trade continuity contract. The biggest gaps are:

- Executable user-driven trades do not exist. `franchiseTradeAdapter` is explicitly dry-run and non-executable; `TradeFlow` says no players, farm records, transactions, or trade state are written.
- The visible regular-season transaction/trade UI is disabled by `MODE_2_V1_TRANSACTION_UI_ENABLED = false`.
- Mode 1 copies FARM player assignments but does not appear to create matching `franchiseFarmRecords`, so farm status and farm record state can diverge immediately at franchise creation.
- Farm records are season-scoped, but the season transition orchestrator does not appear to carry active farm records into the next season.
- Season stats are keyed by `seasonId + playerId`, and existing season rows keep the original `teamId`; after a midseason trade, future game snapshots can carry the new team, but season totals/leaderboards can remain stuck to the first team unless a trade-aware stats model is added.

Positive findings:

- Call-up/send-down execution is real, franchise-owned, rollback-aware, and transaction-logged.
- Phase 11 release/signing and selected retirement apply paths are real and transaction-logged.
- Farm record validation/planning exists for the 22 MLB + 10 FARM Phase 11 lock.
- No AI trade execution and no salary-matching enforcement are active, which aligns with the v1 stability principles.
- GameTracker launch filters out FARM and FREE_AGENT players and blocks incomplete rosters instead of silently inferring fixes.

## Roster/farm state findings

**Roster state model is split between narrow League Builder types and broader franchise action boundaries.**

`leagueBuilderStorage.ts` defines canonical `RosterStatus` as only `MLB | FARM | FREE_AGENT`, and `LeagueAssignment` stores `leagueId`, `teamId`, and `rosterStatus`. Player records also include `optionsUsedBySeason`, `optionDatesBySeason`, `ratingRevealState`, and `ratingRevealedAt`. Evidence: `src/utils/leagueBuilderStorage.ts:60`, `src/utils/leagueBuilderStorage.ts:135-184`.

Franchise movement utilities recognize a broader operational set: `MLB`, `FARM`, `FREE_AGENT`, `RELEASED`, `RETIRED`, `INACTIVE`, `UNASSIGNED`, and `UNKNOWN`. Evidence: `src/utils/franchiseRosterMovement.ts:18-26`, `src/utils/franchisePhase11RosterActions.ts:8-16`.

`RELEASED` and `RETIRED` are written by Phase 11 release and retirement apply paths via casts into the underlying assignment shape. That works operationally, but the base `RosterStatus` type has not been widened, so this is a type-contract drift to resolve before treating these statuses as stable v1 schema. Evidence: `src/utils/franchisePhase11RosterActions.ts:230-244`, `src/utils/franchiseRetirementAdapter.ts:636-653`.

**Mode 1 copies players and teams, but farm records are not initialized.**

`deepCopyLeagueToFranchise` copies players whose `leagueAssignments` include the selected league and keeps only that league's assignment. It copies team records too. Evidence: `src/utils/franchisePlayerStorage.ts:270-342`.

No corresponding farm-record creation is visible in `initializeFranchise`; setup generates a schedule, writes schedule games, and creates season metadata, but does not call `saveFranchiseFarmRecord`. Evidence: `src/utils/franchiseInitializer.ts:247-289`.

This matters because the farm validator treats FARM player status without a matching farm record as an error, and treats farm records whose player is not FARM as errors. Evidence: `src/utils/franchiseRosterLockValidator.ts:173-220`.

**Farm records are real and franchise/season scoped.**

`FranchiseFarmRecord` includes `franchiseId`, `seasonId`, `seasonNumber`, `teamId`, `playerId`, `rosterLevel`, `rosterStatus: FARM`, `optionsUsed`, `optionDates`, `ratingRevealState`, `assignedAt`, and `lastModified`. Evidence: `src/utils/franchiseFarmStorage.ts:7-21`.

Farm storage indexes by franchise, franchise-season, franchise-season-team, and player scope. Evidence: `src/utils/franchiseFarmStorage.ts:99-103`.

Tests prove farm records are isolated by franchise. Evidence: `src/utils/tests/franchiseRosterMovement.test.ts:86-112`.

**10 farm players per team is enforced at Phase 11, not during the regular season.**

The Farm spec says regular-season farm rosters are unlimited, with 22 MLB and 10 FARM enforced at Phase 11. The repo matches that later-lock model: `PHASE_11_FARM_ROSTER_SIZE = 10`, and the validator errors when farm records per team are not exactly 10. Evidence: `src/utils/franchiseRosterLockValidator.ts:6-8`, `src/utils/franchiseRosterLockValidator.ts:126-150`.

The Mode 1 worksheet says Mode 1 should hand Mode 2 "10 farm players per team." Current repo evidence does not prove that handoff. This is a spec/implementation mismatch to resolve: either Mode 1 must create initial farm records, or v1 must explicitly allow empty/variable farm startup until Phase 11.

**No farm games found.**

Farm storage and roster movement exist, but no farm-game schedule, game tracker mode, or farm stat pipeline was found in the inspected code. This aligns with the hard v1 exclusion of farm games.

**Prospect hidden-rating state exists, but UI hiding is not fully proven.**

Farm records default `ratingRevealState` to `hidden`. Send-down preserves the player's reveal state or defaults hidden; call-up sets the player `ratingRevealState` to `revealed` and writes `ratingRevealedAt`. Evidence: `src/utils/franchiseFarmStorage.ts:127-132`, `src/utils/franchiseRosterMovement.ts:329-340`, `src/utils/franchiseRosterMovement.ts:427-458`.

However, the player record still contains numeric ratings. The audit did not find proof that all farm-facing UI hides numeric ratings and traits. Mark UI concealment as unknown.

**Call-up/send-down execution is real, but regular-season reachability is not.**

`sendDownFranchisePlayer` updates the player assignment to `FARM`, increments options for the season, writes/updates a farm record, and logs `send_down`. Evidence: `src/utils/franchiseRosterMovement.ts:273-372`.

`callUpFranchisePlayer` updates the assignment to `MLB`, reveals ratings, deletes the farm record, and logs `call_up`. Evidence: `src/utils/franchiseRosterMovement.ts:393-468`.

Tests prove send-down/call-up update franchise player state, farm records, reveal state, and transactions. They also prove regular-season transaction phase logging is supported if the utility is called with `rosterMovementPhase: REGULAR_SEASON`. Evidence: `src/utils/tests/franchiseRosterMovement.test.ts:114-230`.

The visible regular-season tab that would expose trades/transactions is disabled. Evidence: `src/src_figma/app/pages/FranchiseHome.tsx:99-101`, `src/src_figma/app/pages/FranchiseHome.tsx:1008-1017`.

## Trade continuity findings

**Executable user-driven trades do not exist.**

`franchiseTradeAdapter` is explicitly named and versioned as a dry-run fit preview. The adapter reports `nonExecutable: true` and lists that no execution, movement, roster/farm writes, transaction writes, morale, chemistry, injuries, or salary-cap enforcement are performed. Evidence: `src/utils/franchiseTradeAdapter.ts:14`, `src/utils/franchiseTradeAdapter.ts:66-92`, `src/utils/franchiseTradeAdapter.ts:536-549`.

If `input.apply` is passed, the adapter returns `ADAPTER_NOT_IMPLEMENTED` with "Trade adapter is dry-run only." Evidence: `src/utils/franchiseTradeAdapter.ts:571-585`.

The franchise `TradeFlow` branch only renders the preview surface and says no trades are executed and no players, teams, farm records, transactions, League Builder records, prototype trade records, or offseason state are written. Evidence: `src/src_figma/app/components/TradeFlow.tsx:141-221`, `src/src_figma/app/components/TradeFlow.tsx:407-430`.

Tests explicitly assert no franchise player, team, farm, League Builder, transaction, or offseason trade writes occur in the dry-run. Evidence: `src/utils/tests/franchiseTradeAdapter.test.ts:183-250`.

Per the user's constraint, this dry-run adapter must not be counted as v1 trade execution.

**No AI trade logic is active.**

The dry-run limitations explicitly defer trade AI and final acceptance logic. Evidence: `src/utils/franchiseTradeAdapter.ts:260-262`, `src/utils/franchiseTradeAdapter.ts:542-548`.

This aligns with the v1 stability principles: no AI trade logic.

**No salary matching requirement is active.**

The adapter reports salary values for preview, but does not enforce salary, salary cap, or salary matching. Evidence: `src/utils/franchiseTradeAdapter.ts:239-248`, `src/utils/franchiseTradeAdapter.ts:536-548`.

This aligns with the v1 stability principles and Trade System spec.

**Roster/team assignment updates for trades are missing.**

No trade execution path updates player `leagueAssignments`, moves farm records between teams, updates optimal-lineup staleness, or logs before/after state. A `logTrade` convenience function exists, but it only writes a transaction payload; it does not move players and should not be treated as executable trade support. Evidence: `src/utils/transactionStorage.ts:577-604`.

**Farm-trade continuity is absent.**

The trade dry-run can read farm records and count farm players for fit preview, but it does not transfer farm records or reconcile farm state across teams. Evidence: `src/utils/franchiseTradeAdapter.ts:496-549`.

## Transaction logging findings

**Canonical Mode 2 v1 transaction storage exists.**

Mode 2 v1 transaction types are `trade`, `free_agent_signing`, `release`, `call_up`, `send_down`, `draft_pick`, `retirement`, and `injury_list`. Transaction rows can carry `franchiseId`, `seasonId`, `statsScopeId`, and `scheduleGameId`, plus optional `previousState`. Evidence: `src/utils/transactionStorage.ts:56-67`, `src/utils/transactionStorage.ts:142-165`.

The transaction DB indexes franchise and franchise-season. Evidence: `src/utils/transactionStorage.ts:244-257`.

`logMode2V1Transaction` rejects unsupported legacy transaction types rather than leaking broad legacy events into the v1 franchise stream. Evidence: `src/utils/transactionStorage.ts:303-322`; tests at `src/utils/tests/transactionStorage.mode2v1.test.ts:32-46`.

Tests prove canonical franchise-season identity is persisted and queryable. Evidence: `src/utils/tests/transactionStorage.mode2v1.test.ts:61-99`.

**Roster moves log transactions, but before/after detail is uneven.**

Call-up/send-down transactions include `playerId`, `playerName`, `teamId`, `rosterMovementPhase`, and movement-specific fields such as `optionsUsed`, `rosterLevel`, or `ratingRevealState`. Evidence: `src/utils/franchiseRosterMovement.ts:343-361`, `src/utils/franchiseRosterMovement.ts:440-457`.

They do not include `previousState`. Rollback exists internally if a write or transaction fails, but the successful transaction record does not preserve full before/after state. Evidence: `src/utils/franchiseRosterMovement.ts:227-270`, `src/utils/franchiseRosterMovement.ts:343-361`, `src/utils/franchiseRosterMovement.ts:440-457`.

**Phase 11 release/signing logs richer before/after provenance.**

Release logs `release`, includes `previousRosterStatus`, `reason`, and `previousState` containing player and farm record. Evidence: `src/utils/franchisePhase11RosterActions.ts:253-276`.

Signing logs `free_agent_signing`, includes target status and optional farm level, and records `previousState`. Evidence: `src/utils/franchisePhase11RosterActions.ts:405-428`.

**Retirement apply logs transaction and cleans FARM records.**

Selected-player retirement apply writes `RETIRED`, stores retirement metadata, deletes the farm record for FARM retirees, and logs a `retirement` transaction with previous player/farm state. Evidence: `src/utils/franchiseRetirementAdapter.ts:618-710`.

**Trade and free agency transaction logging is intentionally absent because execution is absent.**

Free agency is dry-run and explicitly says no players are released, moved, exchanged, signed, retired, or written, and no transactions are logged. Evidence: `src/utils/franchiseFreeAgencyAdapter.ts:440-452`, `src/utils/franchiseFreeAgencyAdapter.ts:469-505`.

Trade dry-run likewise writes no transactions. Evidence: `src/utils/franchiseTradeAdapter.ts:542-548`.

**Injury transaction boundary is undefined.**

The canonical transaction type list includes `injury_list`, but inspected GameTracker injury/fitness events are between-play/game events, not roster transactions. No franchise injury-list roster eligibility mutation was proven. Evidence: `src/utils/transactionStorage.ts:56-65`, `src/src_figma/app/pages/GameTracker.tsx:5864-5884`, `src/src_figma/app/pages/GameTracker.tsx:8001-8070`.

## Downstream continuity findings

**GameTracker availability after roster mutations is mostly sound at launch.**

Franchise GameTracker roster building reads franchise-owned players when a `franchiseId` is present. It filters to assignments where `rosterStatus` is `MLB` or null, so FARM and FREE_AGENT players are excluded. Evidence: `src/src_figma/app/utils/franchiseGameTrackerRoster.ts:31-39`, `src/src_figma/app/utils/franchiseGameTrackerRoster.ts:196-223`.

Tests prove FARM and FREE_AGENT players are excluded from launch rosters. Evidence: `src/src_figma/__tests__/franchiseMode/franchiseGameTrackerRoster.test.ts:348-448`.

Franchise Home repairs missing persistence before launch, builds rosters for both teams from franchise storage, blocks launch if players or pitchers are missing, and navigates to GameTracker with franchise/season/stats/schedule identity plus roster snapshots. Evidence: `src/src_figma/app/pages/FranchiseHome.tsx:2953-3014`, `src/src_figma/app/pages/FranchiseHome.tsx:3143-3264`.

`saveFranchisePlayer` marks franchise team optimal-lineup snapshots stale when lineup-relevant player fields or assignments change, which is important after call-ups, send-downs, releases, and eventual trades. Evidence: `src/utils/franchisePlayerStorage.ts:51-63`, `src/utils/franchisePlayerStorage.ts:92-113`, `src/utils/franchisePlayerStorage.ts:178-203`.

**Active games preserve launched snapshots, but later roster edits do not affect already-launched games.**

Franchise Home passes concrete `awayPlayers`, `homePlayers`, `awayPitchers`, and `homePitchers` into navigation state. Evidence: `src/src_figma/app/pages/FranchiseHome.tsx:3226-3258`.

Game state continuity tests prove stable player IDs and team IDs persist into completed-game and playoff persistence. Evidence: `src/src_figma/__tests__/hooks/useGameState.playerIdentityContinuity.test.tsx:83-179`.

**Future stats after a trade are not v1-safe yet.**

For a player with no existing season row, aggregation uses the team ID carried in the completed game state. Evidence: `src/utils/seasonAggregator.ts:177-187`, `src/utils/seasonAggregator.ts:219-229`.

For a player with an existing season row, `getOrCreateBattingStats`, `getOrCreatePitchingStats`, and `getOrCreateFieldingStats` return the existing row by `[seasonId, playerId]` and do not update `teamId` to the new game context. The update functions then persist the spread existing row. Evidence: `src/utils/seasonStorage.ts:277-307`, `src/utils/seasonStorage.ts:312-327`, `src/utils/seasonStorage.ts:353-382`, `src/utils/seasonStorage.ts:387-402`, `src/utils/seasonStorage.ts:428-457`, `src/utils/seasonStorage.ts:462-477`.

This means a traded player's future game snapshots can be correct while season totals remain assigned to the old team. Historical completed-game archives should still preserve game-level context, but season leaderboards/team totals are not trade-aware.

**Historical stats remain game-context accurate where completed game state is used.**

Completed games are processed from `PersistedGameState`, and the aggregation tests prove stable player IDs plus per-game team IDs are passed through. Evidence: `src/utils/processCompletedGame.ts:105-146`, `src/src_figma/__tests__/aggregation/seasonAggregator.playerIdentityContinuity.test.ts:132-281`.

Unknown: whether every Almanac/team-page view displays historical team context correctly for a player who changes teams midseason, because the season stat row model is not split by team stint.

**Storylines, designations, morale, and team context can get stuck because transaction consumers are not proven.**

The audit found engines and placeholder surfaces, but no proven roster-transaction consumer that updates designations, storylines, morale, fan morale, relationships, or reporter context after a player changes teams. Trade execution is absent, and transaction UI is disabled. Mark downstream narrative/designation continuity unknown.

**Mojo/fitness/injury boundaries are GameTracker-scoped, not franchise-roster-scoped.**

GameTracker can edit mojo/fitness, auto-log injury when fitness becomes `WEAK`, `STRAINED`, or `HURT`, and persist that state in the active game snapshot. Evidence: `src/src_figma/app/pages/GameTracker.tsx:5864-5884`, `src/src_figma/hooks/useGameState.ts:3662-3663`, `src/src_figma/hooks/useGameState.ts:4679-4683`.

`mojoFitnessStorage` is keyed by `eliminationId`, not franchise season/team/player roster eligibility. Evidence: `src/utils/mojoFitnessStorage.ts:8-18`, `src/utils/mojoFitnessStorage.ts:47-60`.

No franchise-level injury list, inactive roster status mutation, or GameTracker launch exclusion based on injury/fitness was proven.

## Blockers for v1 stability

1. **No executable trade workflow.** User-driven trade execution is required by the requested audit scope, but the repo only has dry-run trade previews. Do not count this as v1 trade execution.

2. **Regular-season roster/transaction UI is disabled.** Utilities can execute call-up/send-down, but the regular-season visible transaction path is gated off by `MODE_2_V1_TRANSACTION_UI_ENABLED = false`.

3. **Initial farm records are not created during Mode 1 franchise initialization.** FARM player assignments copied into franchise player storage do not appear to get matching `franchiseFarmRecords`, which breaks later farm validation and call-up eligibility.

4. **Farm season handoff is incomplete.** Farm records are season-scoped, but the season transition orchestrator does not appear to create next-season farm records from current FARM players/farm records.

5. **Season stats are not trade-aware.** Player season rows are keyed by player only within season and preserve the first team ID, so midseason team changes can corrupt future season/team context.

6. **No trade transaction before/after model.** There is no atomic trade mutation that updates both teams, player assignments, farm records, stale lineup snapshots, and a transaction with previous state.

7. **Injury/fitness does not affect franchise roster eligibility.** GameTracker injury/fitness events exist, but no franchise `INACTIVE`/injury-list movement boundary is proven.

## Non-blocking gaps

- No AI trade logic is active. This is a desired v1 exclusion.
- No salary matching requirement is active. This is a desired v1 exclusion.
- No farm games were found. This is a desired v1 exclusion.
- Full farm UI hiding of numeric ratings/traits is unknown. The data field exists, but concealment is not proven.
- Call-up/send-down transactions lack full before/after `previousState`. This is less severe than missing execution, but v1 auditability would benefit from richer payloads.
- Free agency is dry-run only. That is acceptable if free-agent execution is scoped out of Mode 2 v1, but Phase 11 signing/release actions already exist and should be clearly distinguished from full free agency.
- Retirement apply is more mature than trade/free agency, but ceremony, jersey retirement, narrative, and replacement side effects are explicitly deferred.
- Farm reconciliation tab is placeholder/copy only in Franchise Home. Evidence: `src/src_figma/app/pages/FranchiseHome.tsx:2409-2448`.
- The season transition still stages a generated schedule for the next season, which is outside this roster audit but conflicts with the broader v1 no-generated-schedule policy. Evidence: `src/utils/franchiseSeasonTransitionOrchestrator.ts:175-182`, `src/utils/franchiseInitializer.ts:315-357`.

## Recommended next implementation slices

1. **Farm record initialization and repair slice.** On franchise creation/repair, create `franchiseFarmRecords` for every franchise player with FARM assignment, preserving hidden reveal state and option data. Add a repair/report path for FARM status without record and record without FARM status.

2. **Call-up/send-down UI slice.** Expose the existing roster movement utilities through a guarded regular-season roster-management surface with validation, roster counts, SMB4 manual-sync acknowledgement, transaction display, and GameTracker launch-readiness feedback.

3. **Trade execution design slice.** Define an atomic user-driven trade command that moves MLB and FARM players between teams, transfers/deletes/creates farm records as needed, marks lineup snapshots stale for both teams, logs one canonical trade transaction with before/after state, and performs rollback on failure. No AI and no salary matching.

4. **Trade-aware stat model slice.** Decide whether season stats should support team stints, current-team override fields, or split rows by `seasonId + playerId + teamId`. Do this before enabling trades, or leaderboards/team pages will be misleading.

5. **Farm season handoff slice.** Carry current FARM players into the next season's farm records after Phase 11 lock, reset or preserve options according to spec, and validate exactly 10 FARM records per team at handoff.

6. **Injury eligibility boundary slice.** Decide whether GameTracker injury/fitness can create roster-level `INACTIVE`/`injury_list` transactions in v1, or keep it explicitly GameTracker-only with no roster eligibility effects.

## Focused tests to run or add later

- Mode 1 franchise creation with FARM-assigned players creates matching `franchiseFarmRecords` for season 1.
- Franchise repair backfills missing farm records without overwriting legitimate farm divergence.
- Send-down from MLB creates a farm record, increments options, marks lineup snapshots stale, logs `send_down`, and excludes the player from the next GameTracker launch.
- Call-up from FARM deletes the farm record, reveals ratings, marks lineup snapshots stale, logs `call_up`, and includes the player in the next GameTracker launch when roster/lineup are valid.
- Fourth send-down in one season is blocked and leaves player/farm/transaction state unchanged.
- Phase 11 release of a FARM player deletes the farm record and logs `release` with previous state.
- Retirement apply for a FARM player deletes the farm record and logs `retirement` with previous state.
- Season handoff carries exactly 10 FARM records per team into the next season after a valid Phase 11 lock.
- Executed trade swaps one MLB player each way and proves future GameTracker launch uses new teams while completed-game archives keep historical teams.
- Executed trade involving one FARM player transfers farm record ownership to the acquiring team and preserves hidden/revealed rating state.
- Executed trade writes one canonical `trade` transaction with both teams, both player sets, before/after assignments, farm-record before/after state, and no salary-matching enforcement.
- Trade rollback test: if transaction logging fails after player/farm writes, all player assignments and farm records revert.
- Season stats after midseason trade either split team stints or update current-team display according to the chosen model; old-team completed games remain historically accurate.
- Storyline/designation/team-context test: after trade/call-up/send-down, downstream cards use current team for future context and archived team for historical events.
- Injury/fitness boundary test: GameTracker injury event either does not affect roster eligibility by design, or writes an `injury_list` transaction and excludes/flags player according to the approved rule.
