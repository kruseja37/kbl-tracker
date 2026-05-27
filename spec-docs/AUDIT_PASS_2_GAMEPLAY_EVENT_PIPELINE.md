# Audit Pass 2: Mode 2 Gameplay/Event/Stat Pipeline

Date: 2026-05-21

Scope: Repo-backed audit only. No implementation, no roster analyzer work, no Pass 3 audit.

Primary sources:
- `spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md`
- `spec-docs/MODE_2_V1_FINAL.md`
- `spec-docs/MODE_2_SECTION_MAP.md`
- `spec-docs/SPINE_ARCHITECTURE.md`
- `spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md`
- `spec-docs/FRANCHISE_STORAGE_ARCHITECTURE_DECISION.md`

## Findings First

### P0-1: End-game aggregation can be marked successful after a failed season aggregation

Requirement:
- Pass 2 must prove that played/scored/skipped Mode 2 games write and aggregate trustworthy canonical records under the right franchise season identity (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:174-176`).
- Stat aggregation must be idempotent across corrected, reprocessed, restored, or archived games (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:203-207`).
- The active GameTracker event/stat pipeline is a Mode 2 source of truth consumed by later franchise systems (`spec-docs/MODE_2_V1_FINAL.md:52-66`, `spec-docs/MODE_2_SECTION_MAP.md:103-110`).

Repo evidence:
- `aggregateGameToSeason` catches failures and returns `{ success: false }` rather than throwing (`src/utils/seasonAggregator.ts:92-164`).
- `processCompletedGame` calls `aggregateGameToSeason`, but does not check `aggregation.success` before archiving and registering players (`src/utils/processCompletedGame.ts:113-139`).
- `completeGameInternal` marks the game aggregated immediately after `processCompletedGame` resolves, without checking the returned aggregation result (`src/src_figma/hooks/useGameState.ts:11004-11049`).
- Season game count increments blindly as part of aggregation (`src/utils/seasonAggregator.ts:120-121`), so retry/idempotency depends on the header flag being correct.

Tests proving behavior:
- Existing aggregation tests cover almanac registration and stable player identity, but not failed aggregation gating or reprocess idempotency (`src/src_figma/__tests__/aggregation/processCompletedGame.almanac.test.ts:170`, `src/src_figma/__tests__/aggregation/seasonAggregator.playerIdentityContinuity.test.ts:132`).
- Pass 2 required tests explicitly call for corrected-game idempotency and golden event-log-to-stat fixtures (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:214-220`).

Status: drifted / risky

Severity: critical

Recommendation:
- Treat aggregation failure as a failed end-game processing result. Do not archive, mark aggregated, schedule-complete, or advance downstream handoff state unless aggregation succeeds.
- Add an explicit idempotency/replay test for a failed aggregation followed by retry.

Smallest safe patch:
- In `processCompletedGame`, if `aggregation.success !== true`, return/throw before archive/registration.
- In `completeGameInternal`, only call `markGameAggregated` after a successful aggregation result.
- Add tests that mock `aggregateGameToSeason` returning `{ success: false }` and assert no archive, no mark aggregated, and no downstream completion side effects.

### P0-2: The season stats pipeline is still snapshot-derived, not event-log-replayable

Requirement:
- The Spine requires immutable append-only event streams (`spec-docs/SPINE_ARCHITECTURE.md:627-681`).
- Mode 2 requires downstream state to be derivable from events as a replay guarantee (`spec-docs/MODE_2_V1_FINAL.md:68-78`).
- Pass 2 explicitly asks whether all event streams carry enough identity for franchise season replay/audit and whether event-log-to-stat aggregation tests exist (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:203-220`).

Repo evidence:
- At-bat, between-play, and fielding event stores exist in `kbl-event-log` (`src/utils/eventLog.ts:97-135`).
- Completed game archives include event identity and game-state-derived stat arrays (`src/utils/gameStorage.ts:744-794`).
- `aggregateGameToSeason` aggregates `PersistedGameState.playerStats`, `PersistedGameState.pitcherGameStats`, and `PersistedGameState.playerStats` fielding totals, not the at-bat/between-play event log (`src/utils/seasonAggregator.ts:108-121`, `src/utils/seasonAggregator.ts:169-205`, `src/utils/seasonAggregator.ts:211-301`).
- Event-log data is read at end game for manager decisions and players of the game, but the season stat accumulation itself is not rebuilt from the event log (`src/src_figma/hooks/useGameState.ts:10691-10721`, `src/src_figma/hooks/useGameState.ts:10934-10971`).

Tests proving behavior:
- WPA and GameTracker event recording tests are present, but no golden "event log -> stat totals" test exists for a franchise season (`src/engines/__tests__/wpaV2.test.ts:41`, `src/src_figma/__tests__/hooks/useGameState.commitPlateAppearance.test.tsx:113`, `src/src_figma/__tests__/hooks/useGameState.betweenPlayLedger.test.tsx:124`).

Status: partial / drifted

Severity: critical

Recommendation:
- Keep the current game-state stat arrays as a short-term compatibility source, but add an event-log replay/audit path and parity tests before building deeper Pass 3 consumers on these totals.

Smallest safe patch:
- Add a focused event-log-to-stat golden fixture for one franchise game with hits, walks, runs, pitcher stats, fielding events, between-play runner actions, and a correction.
- Initially compare event-derived totals against the existing `PersistedGameState` aggregation output without replacing production aggregation. Use this as the bridge test before a production replay aggregator is introduced.

### P1-1: Focused Pass 2 tests are not green; one failure indicates a lost special/fame event at archive time

Requirement:
- Enrichment and event hooks are part of the Mode 2 event/stat pipeline (`spec-docs/MODE_2_V1_FINAL.md:565-568`, `spec-docs/MODE_2_V1_FINAL.md:676-725`).
- Special play/fame hooks should survive end-game handoff because completed games archive fame events and downstream summaries depend on completed-game contents (`src/utils/gameStorage.ts:777-794`).

Repo evidence:
- The focused test `uses the corrected WEB_GEM fame base value` records a WEB_GEM and immediately ends the game, expecting the completed-game archive payload to include that fame event (`src/src_figma/__tests__/hooks/useGameState.commitPlateAppearance.test.tsx:230-272`).
- `recordEvent` calculates fame and calls `appendFameEvent` (`src/src_figma/hooks/useGameState.ts:8166-8260`).
- `appendFameEvent` writes through `fameEventsRef.current` and React state (`src/src_figma/hooks/useGameState.ts:3316-3325`).
- End-game persistence builds `persistedState.fameEvents` from `buildPersistedFameEvents` (`src/src_figma/hooks/useGameState.ts:10910-10915`).

Tests proving behavior:
- Focused command:
  - `npx vitest run src/src_figma/__tests__/hooks/useGameState.commitPlateAppearance.test.tsx src/src_figma/__tests__/playoffMode/playoffFieldingScope.test.ts`
  - Result: 2 failed, 6 passed.
- Failure:
  - `src/src_figma/__tests__/hooks/useGameState.commitPlateAppearance.test.tsx:267`
  - Expected archived WEB_GEM fame event; received `undefined`.

Status: risky

Severity: high

Recommendation:
- Treat this as a runtime durability bug unless proven to be a stale test. Special/fame events recorded immediately before `endGame` must be included in the completed-game payload.

Smallest safe patch:
- Ensure `recordEvent` fame writes are synchronously visible to `completeGameInternal`, or pass a committed fame snapshot into end-game processing.
- Add a regression test for `recordEvent('WEB_GEM')` followed by immediate `endGame`.

### P1-2: Event rows do not consistently carry full canonical game identity

Requirement:
- Pass 2 asks whether all event streams carry enough canonical identity for franchise season replay and audit (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:203-210`).
- At-bat events must include identity and complete context (`spec-docs/MODE_2_V1_FINAL.md:114-170`).
- Pass 1 established canonical identity fields across `franchiseId`, `seasonId`, `statsScopeId`, schedule, and playoff contexts.

Repo evidence:
- `GameHeader` supports `seasonId`, `statsScopeId`, `competitionType`, `competitionId`, `franchiseId`, `leagueId`, `scheduleGameId`, and playoff identity (`src/utils/eventLog.ts:145-157`).
- `AtBatEvent` supports optional `seasonId`, `statsScopeId`, `competitionType`, `competitionId`, `franchiseId`, `scheduleGameId`, and `leagueId` (`src/utils/eventLog.ts:269-276`).
- `buildContextSnapshot` writes `seasonId`, `statsScopeId`, `competitionType`, `competitionId`, `franchiseId`, and `leagueId`, but does not include `scheduleGameId` or playoff identity on the at-bat event row (`src/src_figma/hooks/useGameState.ts:3949-3957`).
- `BetweenPlayEvent` only has optional `seasonId`, `statsScopeId`, `competitionType`, `competitionId`, and `franchiseId`, with no row-level `scheduleGameId`, `leagueId`, `playoffId`, `playoffSeriesId`, or `playoffGameNumber` (`src/utils/eventLog.ts:501-508`).
- `createBetweenPlayEventBase` likewise omits schedule, league, and playoff identity (`src/src_figma/hooks/useGameState.ts:2906-2916`).
- Live/current-game snapshots and completed-game archives do preserve those identities (`src/utils/gameStorage.ts:227-254`, `src/utils/gameStorage.ts:744-764`, `src/src_figma/hooks/useGameState.ts:5919-5933`).

Tests proving behavior:
- Restore tests prove snapshot/header-level identity recovery (`src/src_figma/__tests__/gameTracker/gameTrackerRestoredFranchiseScope.test.tsx:182`, `src/src_figma/__tests__/gameTracker/gameTrackerRestoredFranchiseScope.test.tsx:230`, `src/src_figma/__tests__/gameTracker/GameTrackerLaunchState.test.tsx:444`).
- No test proves every at-bat and between-play row carries schedule/playoff identity.

Status: mostly complete / partial

Severity: high

Recommendation:
- Keep header-level identity recovery, but also stamp every at-bat and between-play event row with the canonical identity needed to replay or audit the row without side-channel lookup.

Smallest safe patch:
- Add optional `scheduleGameId`, `leagueId`, `playoffId`, `playoffSeriesId`, and `playoffGameNumber` to `BetweenPlayEvent`.
- Add `scheduleGameId` and playoff fields to at-bat context snapshots.
- Add tests in `useGameState.commitPlateAppearance` and `useGameState.betweenPlayLedger` that assert row-level identity for franchise regular-season and franchise playoff games.

### P1-3: Between-play roster/pitcher/position mutations can apply without durable ledger writes

Requirement:
- Between-play events and substitutions are part of the authoritative event stream (`spec-docs/SPINE_ARCHITECTURE.md:662-681`).
- Pitcher changes must record pitch count, IP, and inherited runners (`spec-docs/MODE_2_V1_FINAL.md:793-801`).
- Substitution flow, validation, and pitcher changes are kept in v1 (`spec-docs/MODE_2_SECTION_MAP.md:92-101`).

Repo evidence:
- `makeSubstitution` logs a substitution with `void persistBetweenPlayEvent(...).catch(...)`, then proceeds to mutate lineup refs/state (`src/src_figma/hooks/useGameState.ts:9524-9548`).
- `switchPositions` logs each position change with `void persistBetweenPlayEvent(...).catch(...)`, then proceeds to mutate catcher/lineup state (`src/src_figma/hooks/useGameState.ts:9923-9946`).
- `changePitcher` logs a pitcher change with `void persistBetweenPlayEvent(...).catch(...)`, then updates pitcher state, exit info, and inherited-runner tracking (`src/src_figma/hooks/useGameState.ts:10170-10205`).
- `confirmPitchCount` logs pitch count updates with `void persistBetweenPlayEvent(...).catch(...)`, then continues the pending action (`src/src_figma/hooks/useGameState.ts:10357-10372`).
- Runner action paths such as SB/CS/ADVANCE/WP/PB do await between-play persistence, so this is not uniform across all between-play actions (`src/src_figma/hooks/useGameState.ts:8166-8548`).

Tests proving behavior:
- Happy-path ledger tests cover runner actions, roster changes, pitcher changes, DH pitcher changes, position usage, mojo/fitness, injuries, manager moments, and reassignment edits (`src/src_figma/__tests__/hooks/useGameState.betweenPlayLedger.test.tsx:124`, `src/src_figma/__tests__/hooks/useGameState.betweenPlayLedger.test.tsx:204`, `src/src_figma/__tests__/hooks/useGameState.betweenPlayLedger.test.tsx:270`, `src/src_figma/__tests__/hooks/useGameState.betweenPlayLedger.test.tsx:420`).
- No test covers failed ledger persistence while state mutation continues.

Status: risky

Severity: high

Recommendation:
- Mutating roster/pitcher/position state should be atomic with, or recoverable from, the durable between-play ledger.

Smallest safe patch:
- Await `persistBetweenPlayEvent` for substitution, position change, pitcher change, and pitch count update before mutating live state, or add explicit rollback/retry state.
- Add tests that mock `logBetweenPlayEvent` failure and assert the state mutation is aborted or rolled back.

### P1-4: Franchise playoff stat aggregation does not fully validate canonical season scope

Requirement:
- Playoff records must be isolated by franchise and canonical season scope, with elimination and franchise playoff modes guarded from cross-over.
- Pass 2 explicitly includes playoff context multipliers and playoff aggregation reads under canonical scope (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:203-210`, `spec-docs/MODE_2_V1_FINAL.md:1680-1698`).

Repo evidence:
- `aggregateGameToPlayoffStats` rejects non-elimination games into elimination playoffs, different elimination runs, and franchise identity inside elimination playoffs (`src/utils/playoffStorage.ts:1281-1291`).
- For franchise playoffs, it rejects `competitionType === 'elimination'` and rejects a different franchise only when both `playoff.franchiseId` and `gameState.franchiseId` are present (`src/utils/playoffStorage.ts:1292-1298`).
- It does not require `gameState.franchiseId` when the playoff has one, and does not compare `gameState.seasonId` or `gameState.statsScopeId` to `playoff.seasonId` before aggregating (`src/utils/playoffStorage.ts:1271-1300`).
- Fielding scope queries are more specific and include `competitionId: playoff.id` for franchise playoffs (`src/utils/playoffStorage.ts:261-275`).

Tests proving behavior:
- Elimination/franchise cross-over tests cover wrong mode and same numeric season separation (`src/utils/tests/playoffStorage.elimination.test.ts:298-359`).
- Fielding scope tests cover elimination identity and bracket-local fielding metrics (`src/src_figma/__tests__/playoffMode/playoffFieldingScope.test.ts:89-115`).
- No test covers wrong franchise-season or missing franchise identity into a franchise playoff aggregation.

Status: partial

Severity: high

Recommendation:
- Franchise playoff aggregation should require matching `franchiseId` and matching canonical `seasonId`/`statsScopeId` when those values are present on the playoff.

Smallest safe patch:
- In franchise playoff aggregation, reject missing or mismatched `franchiseId` when `playoff.franchiseId` exists.
- Reject `gameState.seasonId` and `gameState.statsScopeId` mismatches against `playoff.seasonId`.
- Add wrong-season and missing-franchise tests.

### P2-1: Event immutability is implemented as audited overwrites, not strict append-only records

Requirement:
- Spine says event streams are append-only and never modified/deleted after creation (`spec-docs/SPINE_ARCHITECTURE.md:627-681`).
- Mode 2 says outcomes are immutable, while enrichment and runner corrections use versioned edits in `editHistory[]` (`spec-docs/MODE_2_V1_FINAL.md:68-78`).
- Current roadmap notes Wave 2 clarified audited mutation for corrections instead of silent outcome mutation (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:170-173`).

Repo evidence:
- `logAtBatEvent` and `logBetweenPlayEvent` use `put`, so the same key can be overwritten if reused (`src/utils/eventLog.ts:853-890`, `src/utils/eventLog.ts:934-952`).
- `updateAtBatEvent` intentionally overwrites the same event row with `put`, while enforcing audited result-edit checks (`src/utils/eventLog.ts:1236-1331`).
- `updateBetweenPlayEvent` also overwrites the same row after applying updates (`src/utils/eventLog.ts:1454-1486`).
- Undo is non-destructive: it marks rows `undoneAt` and skips manager recommendations (`src/utils/eventLog.ts:1775-1835`).

Tests proving behavior:
- Tests reject unaudited at-bat result changes and allow versioned corrections (`src/src_figma/__tests__/gameTracker/atBatOutcomeImmutability.test.ts:65`, `src/src_figma/__tests__/gameTracker/atBatOutcomeImmutability.test.ts:77`).
- Tests cover between-play default version/edit history and versioned updates (`src/src_figma/__tests__/gameTracker/betweenPlayEventVersioning.test.ts:73`, `src/src_figma/__tests__/gameTracker/betweenPlayEventVersioning.test.ts:97`).

Status: mostly complete / spec-drifted

Severity: medium

Recommendation:
- Decide whether Pass 2 accepts the Wave 2 audited-overwrite model as the v1 contract. If yes, update specs to say "audited correction rows via version/editHistory" rather than strict append-only at the physical row level.

Smallest safe patch:
- Add a spec reconciliation note and enforce `put` overwrite only through `update*` APIs with version/edit history.
- Optional hardening: make `logAtBatEvent` reject an existing eventId unless called as a correction/update path.

### P2-2: One-tap recording is broadly implemented, but per-at-bat pitch count capture is incomplete

Requirement:
- Step 1 must record core counting stats from a single tap, runner defaults, event save, game-state update, and next batter (`spec-docs/MODE_2_V1_FINAL.md:58-66`, `spec-docs/MODE_2_V1_FINAL.md:565-568`).
- Pitch-count capture and validation are kept in v1 with manual entry and skip option (`spec-docs/MODE_2_V1_FINAL.md:717-725`, `spec-docs/MODE_2_V1_FINAL.md:1135-1137`).

Repo evidence:
- Quick-bar outcome flow snapshots bases/outs, applies runner defaults, captures undo, and commits immediate outcomes where unambiguous (`src/src_figma/app/pages/GameTracker.tsx:7183-7410`).
- Button availability guards exist for FC, SF, DP, TP, SH, and D3K legality (`src/src_figma/app/pages/GameTracker.tsx:7193-7200`, `src/src_figma/app/pages/GameTracker.tsx:13296-13505`).
- `commitPlateAppearance` does not pass per-at-bat pitch count to `recordHit`, `recordWalk`, `recordError`, `recordD3K`, or `recordOut` (`src/src_figma/hooks/useGameState.ts:9131-9176`).
- End-inning, pitcher-change, and end-game pitch count prompts exist, but they are half-inning/pitcher-total oriented rather than per-at-bat capture (`src/src_figma/hooks/useGameState.ts:10120-10135`, `src/src_figma/hooks/useGameState.ts:10291-10372`, `src/src_figma/hooks/useGameState.ts:10594-10615`).

Tests proving behavior:
- Commit tests cover SAC normalization, D3K metadata routing, leverage storage, and WEB_GEM fame base behavior (`src/src_figma/__tests__/hooks/useGameState.commitPlateAppearance.test.tsx:113`, `src/src_figma/__tests__/hooks/useGameState.commitPlateAppearance.test.tsx:159`, `src/src_figma/__tests__/hooks/useGameState.commitPlateAppearance.test.tsx:188`, `src/src_figma/__tests__/hooks/useGameState.commitPlateAppearance.test.tsx:230`).
- No test proves per-at-bat pitch-count capture through the one-tap/enrichment path.

Status: mostly complete / partial

Severity: medium

Recommendation:
- Treat pitch count as v1 partial: current end-inning/pitcher-change capture helps pitcher totals, but the per-at-bat pitch-count enrichment contract is not complete.

Smallest safe patch:
- Add optional `pitchCount` to `PlateAppearanceAction` and wire the play-log `[pitches?]` enrichment path into `AtBatEvent.pitchesInAtBat` and pitcher pitch totals.
- Add tests for 7+ pitch QAB and pitcher pitch total update from at-bat enrichment/correction.

### P2-3: Fielding event capture is real, but season fielding aggregation remains partial and snapshot-derived

Requirement:
- v1 keeps the full fielding system except simplified primary-fielder inference (`spec-docs/MODE_2_V1_FINAL.md:1300-1302`, `spec-docs/MODE_2_SECTION_MAP.md:128-140`).
- Fielding errors, chances, double plays, star plays, and fWAR-relevant fielding events are part of Pass 2 focus.

Repo evidence:
- Fielding extractor maps play-log `PlayData` to persisted `FieldingEvent[]` and is called after ball-in-play at-bats and edits (`src/src_figma/app/utils/fieldingEventExtractor.ts:1-14`, `src/src_figma/app/pages/GameTracker.tsx:3576-3588`, `src/src_figma/app/pages/GameTracker.tsx:9450-9540`).
- `updateAtBatEventWithFieldingSync` is used for fielding enrichment edits (`src/src_figma/app/pages/GameTracker.tsx:3657-3684`, `src/src_figma/app/pages/GameTracker.tsx:9508-9540`).
- Season aggregation uses `gameState.playerStats` putouts, assists, and errors, and explicitly notes double plays/position-specific stats need more tracking (`src/utils/seasonAggregator.ts:276-301`).
- Completed-game archive persists `playerStats` and `pitcherGameStats`, but does not archive raw event logs into the completed game record (`src/utils/gameStorage.ts:777-779`).

Tests proving behavior:
- Fielding extractor and at-bat fielding sync tests cover direct row creation and row replacement on edits (`src/src_figma/__tests__/gameTracker/fieldingEventExtractor.test.ts:11`, `src/src_figma/__tests__/gameTracker/atBatFieldingSync.test.ts:106`).
- Playoff fielding scope test currently fails because the test expects no `competitionId`, while code returns `competitionId: playoff.id` (`src/src_figma/__tests__/playoffMode/playoffFieldingScope.test.ts:82`, `src/utils/playoffStorage.ts:271-275`).

Status: partial

Severity: medium

Recommendation:
- Use persisted `FieldingEvent` rows as the audit source for fielding aggregation, at least for a golden fixture, before relying on season-level fielding/fWAR outputs.

Smallest safe patch:
- Refresh the stale playoff fielding scope assertion if `competitionId: playoff.id` is intended.
- Add one fielding golden fixture that derives PO/A/E, double-play chain, special/star play, and fWAR input from `FieldingEvent` rows.

### P2-4: WPA/LI are strong for normal plate appearances, but clutch/fame edge cases and season clutch aggregation are incomplete

Requirement:
- WPA must be stored on every `AtBatEvent` and used for Player of the Game, top moments, and clutch attribution (`spec-docs/MODE_2_V1_FINAL.md:1669-1675`).
- Clutch attribution is WPA-based and season clutch is the sum of event WPA for the player (`spec-docs/MODE_2_V1_FINAL.md:1680-1698`).

Repo evidence:
- Hit, out, and walk recorders compute LI and WPA and set `isClutch` from LI >= 1.5 (`src/src_figma/hooks/useGameState.ts:6266-6407`, `src/src_figma/hooks/useGameState.ts:6724-6907`, `src/src_figma/hooks/useGameState.ts:7178-7273`).
- D3K and error recorders calculate WPA but hardcode `isClutch: false` (`src/src_figma/hooks/useGameState.ts:7628-7642`, `src/src_figma/hooks/useGameState.ts:7982-7996`).
- The completed-game path derives players of the game and manager decisions from event logs (`src/src_figma/hooks/useGameState.ts:10934-10971`).
- `seasonAggregator` has no explicit event-WPA clutch aggregation path (`src/utils/seasonAggregator.ts:108-121`).
- Clutch and mWAR calculators exist and are tested separately, but the production season aggregation path is not proven to feed clutch season stats from at-bat WPA (`src/engines/clutchCalculator.ts:746-906`, `src/engines/mwarCalculator.ts:639-724`).

Tests proving behavior:
- WPA engine and runtime boundary tests are broad (`src/engines/__tests__/wpaV2.test.ts:41`, `src/engines/__tests__/wpaRuntimeBoundary.test.ts:52`).
- Leverage/clutch calculator tests cover thresholds and formula utilities (`src/src_figma/__tests__/engines/leverageCalculator.test.ts:672`, `src/src_figma/__tests__/engines/leverageCalculator.test.ts:694`).
- No test proves D3K/error high-LI events set `isClutch`, or that season clutch totals equal event WPA sums.

Status: partial

Severity: medium

Recommendation:
- Make `isClutch` uniformly derived from LI for every at-bat event type, and add an event-WPA-to-season-clutch golden test.

Smallest safe patch:
- Replace D3K/error `isClutch: false` with LI threshold logic.
- Add tests for high-LI D3K and error events.
- Add one season clutch aggregation fixture that sums batter/pitcher WPA from event rows.

### P2-5: Mode guardrails exist as validators but are not enforced at storage/write boundaries

Requirement:
- Pass 1 remediation added mode/competition guardrails to prevent exhibition, elimination, and franchise cross-over.
- Pass 2 must confirm playoff and GameTracker contexts cannot accidentally cross modes (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:203-212`).

Repo evidence:
- `validateModeCompetitionScope` and `assertModeCompetitionScope` define exhibition, elimination, franchise, and playoff constraints (`src/utils/modeCompetitionScope.ts:18-65`).
- GameTracker identity resolution validates and warns, but does not throw on invalid scope (`src/src_figma/app/utils/gameTrackerIdentity.ts:166-169`).
- `assertModeCompetitionScope` is not used by the event storage writers or playoff aggregators in the audited paths.
- Playoff storage has bespoke checks for elimination/franchise cross-over, but misses franchise season/stats-scope checks noted above (`src/utils/playoffStorage.ts:1281-1298`).

Tests proving behavior:
- Validator tests prove valid modes and reject cross-over inputs (`src/utils/tests/modeCompetitionScope.test.ts:9`, `src/utils/tests/modeCompetitionScope.test.ts:42`).
- There is no writer-boundary test asserting invalid identity cannot be persisted or aggregated.

Status: mostly complete / risky

Severity: medium

Recommendation:
- Keep the validator as the single contract, but enforce it at GameTracker launch, archive/end-game, completed-game write, and playoff aggregation boundaries.

Smallest safe patch:
- Call `assertModeCompetitionScope` before creating game headers, archiving completed games, and aggregating playoff stats.
- Add compatibility fallback only for old exhibition records missing `competitionType`.

## Coverage Notes By Focus Area

1. GameTracker one-tap recording:
   - Mostly complete for quick-bar flow, runner defaults, event save, game-state update, undo, and end-inning/game flow.
   - Gaps: per-at-bat pitch count capture, failed archive/aggregation handling, and WEB_GEM immediate end-game archive failure.

2. Event model:
   - AtBatEvent, BetweenPlayEvent, GameHeader, fielding events, versioning, edit history, and undo markers exist.
   - Gaps: strict append-only semantics are spec-drifted into audited overwrites; row-level identity is incomplete; replayability is not yet proven.

3. Enrichment:
   - Play-log enrichment and fielding sync paths exist.
   - Gaps: season aggregation is not yet event-derived; positional tracking and fWAR-ready season aggregation need golden fixtures.

4. Between-play events and substitutions:
   - Runner actions, pitcher changes, position changes, substitutions, mojo/fitness, injury, and manager moments have ledger coverage.
   - Gap: key roster/pitcher/position mutations are fire-and-forget relative to durable persistence failure.

5. Baseball rules:
   - Outcome handling, runner defaults, force/time-play handling, D3K availability, inning/game flow, and button availability are substantially implemented.
   - Gap: more golden fixtures are needed across complex force/time-play and correction cases.

6. Pitcher/fielding stats:
   - Pitcher decisions and inherited runner tests are strong.
   - Gaps: per-at-bat pitch count capture and event-derived fielding aggregation.

7. Leverage/WPA/clutch:
   - WPA engine coverage is strong and active writers use the central WPA path.
   - Gaps: D3K/error `isClutch`, season clutch aggregation from WPA event rows, and playoff franchise season validation.

## Verification Run

Focused command:

```bash
npx vitest run src/src_figma/__tests__/hooks/useGameState.commitPlateAppearance.test.tsx src/src_figma/__tests__/hooks/useGameState.betweenPlayLedger.test.tsx src/src_figma/__tests__/hooks/useGameState.undoLastAction.test.tsx src/src_figma/__tests__/gameTracker/gameTrackerRestoredFranchiseScope.test.tsx src/src_figma/__tests__/gameTracker/atBatOutcomeImmutability.test.ts src/src_figma/__tests__/gameTracker/betweenPlayEventVersioning.test.ts src/utils/tests/modeCompetitionScope.test.ts src/utils/tests/playoffStorage.elimination.test.ts src/src_figma/__tests__/playoffMode/playoffFieldingScope.test.ts src/engines/__tests__/wpaRuntimeBoundary.test.ts src/engines/__tests__/wpaV2.test.ts src/src_figma/__tests__/dataTracking/pitcherDecisions.test.ts src/src_figma/__tests__/baseballLogic/inheritedRunnerTracker.test.ts src/src_figma/__tests__/aggregation/processCompletedGame.almanac.test.ts src/src_figma/__tests__/aggregation/seasonAggregator.playerIdentityContinuity.test.ts
```

Result:
- 13 files passed, 2 files failed.
- 150 tests passed, 2 tests failed.

Failures:
- `src/src_figma/__tests__/hooks/useGameState.commitPlateAppearance.test.tsx:267`: archived WEB_GEM fame event missing.
- `src/src_figma/__tests__/playoffMode/playoffFieldingScope.test.ts:82`: expected fielding scope lacks `competitionId`; implementation returns `competitionId: playoff.id` at `src/utils/playoffStorage.ts:271-275`.

## Safe to Proceed to Pass 3?

No.

The gameplay/event/stat pipeline is broad and much of the GameTracker behavior exists, but the Pass 2 contract is not safe enough to build Pass 3 season-end/offseason consumers on yet. The blockers are concentrated around aggregation success semantics, replay/idempotency proof, event-row identity, between-play write atomicity, and franchise playoff scope validation.

## Top Blockers

1. End-game processing can mark a game aggregated even when season aggregation returns `success: false`.
2. Season stats are still snapshot-derived and not proven replayable from event logs.
3. Focused Pass 2 tests are not green; WEB_GEM fame events can be lost from archive in the tested immediate end-game path.
4. At-bat and between-play rows do not consistently carry schedule/playoff canonical identity.
5. Roster/pitcher/position between-play mutations can proceed even if durable logging fails.
6. Franchise playoff stat aggregation does not require matching canonical season/stats scope.

## Recommended Next Implementation Prompt

Please implement Pass 2A gameplay/event/stat durability blockers.

Scope:
- Do not start Audit Pass 3.
- Do not add roster analyzer work.
- Keep changes limited to Mode 2 GameTracker/event/stat pipeline correctness and tests.

Fix:
1. End-game aggregation gating
   - Make `processCompletedGame` fail safely when `aggregateGameToSeason` returns `success: false`.
   - Make `completeGameInternal` call `markGameAggregated` only after confirmed successful aggregation.
   - Ensure archive, schedule completion, playoff advancement, and downstream handoff do not proceed on failed aggregation.

2. WEB_GEM/fame archive durability
   - Ensure fame/special events recorded immediately before `endGame` are included in the completed-game payload.
   - Preserve existing fame value behavior.

3. Event row canonical identity
   - Stamp AtBatEvent rows with `scheduleGameId` and playoff identity where applicable.
   - Extend BetweenPlayEvent with optional `scheduleGameId`, `leagueId`, `playoffId`, `playoffSeriesId`, and `playoffGameNumber`.
   - Preserve backward compatibility with old logs.

4. Between-play mutation atomicity
   - Await durable ledger writes for substitution, position change, pitcher change, and pitch count update before applying live state, or add explicit rollback.
   - Surface/log failures without silently mutating state.

5. Franchise playoff aggregation validation
   - Require matching `franchiseId` and canonical `seasonId`/`statsScopeId` when aggregating into franchise playoffs.
   - Preserve existing elimination playoff behavior.

6. Tests
   - Add/repair tests for aggregation failure gating, immediate WEB_GEM archive, row-level identity on franchise regular-season and playoff games, between-play persistence failure, and wrong-season franchise playoff rejection.
   - Update the stale playoff fielding scope assertion if `competitionId: playoff.id` is intended.
   - Re-run the focused Pass 2 test set from this audit.

## Recommended Pass 3 Prompt If Clean

Not applicable yet. Re-run Pass 2 closeout after Pass 2A blockers are fixed and the focused test set is green.
