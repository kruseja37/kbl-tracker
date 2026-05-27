# Audit Pass 5: Derived/Flavor Systems

Date: 2026-05-22

Scope: Cross-spec franchise traceability Pass 5 only. This audit covers derived/flavor systems and their franchise-season boundaries. It does not implement code, add roster analyzer work, design the roster analyzer, audit deferred prototype algorithms beyond boundary risk, or start Pass 6.

Specs reviewed:

- `spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md`
- `spec-docs/SPINE_ARCHITECTURE.md`
- `spec-docs/MODE_2_V1_FINAL.md`
- `spec-docs/MODE_2_SECTION_MAP.md`
- `spec-docs/OFFSEASON_SYSTEM_SPEC.md`
- `spec-docs/FARM_SYSTEM_SPEC.md`
- `spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md`
- `spec-docs/AUDIT_PASS_2_GAMEPLAY_EVENT_PIPELINE.md`
- `spec-docs/AUDIT_PASS_3_SEASON_END_OFFSEASON_BOUNDARY.md`
- `spec-docs/AUDIT_PASS_4_FARM_ROSTER_MOVEMENT_BOUNDARY.md`
- `spec-docs/FRANCHISE_STORAGE_ARCHITECTURE_DECISION.md`

Focused tests run:

```bash
npm test -- src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts src/utils/tests/franchiseSaveSlotManifest.test.ts src/utils/tests/gameStoriesStorage.test.ts src/utils/tests/commentaryFeedStorage.test.ts src/src_figma/__tests__/detection/milestoneDetector.test.ts src/src_figma/__tests__/apiContracts/fanMoraleEngine.contract.test.ts src/src_figma/__tests__/data/parkLookup.test.ts src/src_figma/__tests__/engines/calibrationService.test.ts src/src_figma/__tests__/mojoFitness/mojoEngine.test.ts src/src_figma/__tests__/mojoFitness/fitnessEngine.test.ts src/src_figma/__tests__/mojoFitness/mojoFitnessIntegration.test.ts src/utils/tests/modeCompetitionScope.test.ts
```

Result: 12 test files passed, 549 tests passed. The run emitted the expected wrong-season playoff warning from the franchise season summary tests.

## Findings

### 1. Franchise playoff reporter/news records are downcast into elimination mode and lack canonical franchise-season identity

Requirement:

- Pass 5 asks whether narrative/news and reporter context are scoped to the canonical franchise season and whether derived/flavor systems avoid cross-mode leakage.
- The traceability plan calls out the unresolved need to decide whether narrative/news are franchise-season scoped and whether milestone/award/news inputs use canonical `statsScopeId` and season identity (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:486-492`).
- The mode guardrail from Pass 1 intentionally separates franchise playoff scope from elimination scope, so derived systems should not rejoin those modes after validation.

Repo evidence:

- `ReporterGameMode` only supports `exhibition`, `elimination`, and `franchise` (`src/types/reporter.ts:59`).
- `GameStory` records include `gameId`, `reporterId`, `teamId`, `leagueId`, and `gameMode`, but no `franchiseId`, `seasonId`, `seasonNumber`, `statsScopeId`, `scheduleGameId`, `playoffId`, or `playoffSeriesId` (`src/types/reporter.ts:84-99`).
- `CommentaryFeedEntryRecord` similarly lacks canonical franchise-season fields (`src/types/reporter.ts:160-173`).
- The IndexedDB `gameStories`, `narrativeContext`, and `commentaryFeedEntries` stores index game/team/league/gameMode data but not franchise or season identity (`src/utils/trackerDb.ts:244-287`).
- `useCommentaryFeed` is called from GameTracker with `gameMode` mapped as `effectiveCompetitionType === "playoff" ? "elimination" : effectiveGameMode` (`src/src_figma/app/pages/GameTracker.tsx:5136-5144`).
- Post-game reporter columns use the same `playoff -> elimination` mapping (`src/src_figma/app/pages/GameTracker.tsx:5300-5304`, `src/src_figma/app/pages/GameTracker.tsx:5311-5319`, `src/src_figma/app/pages/GameTracker.tsx:11527-11535`).
- `useCommentaryFeed` persists commentary feed entries by `gameId`, `reporterId`, `leagueId`, and sometimes `gameMode`, without franchise or season identity (`src/src_figma/app/hooks/useCommentaryFeed.ts:572-582`, `src/src_figma/app/hooks/useCommentaryFeed.ts:684-694`, `src/src_figma/app/hooks/useCommentaryFeed.ts:795-808`).
- `useCommentaryFeed` persists `GameStory` without franchise or canonical season identity (`src/src_figma/app/hooks/useCommentaryFeed.ts:942-956`).
- Story list queries filter by `teamId` and optional `gameMode`, or by `gameId`, not by franchise or season (`src/utils/gameStoriesStorage.ts:60-82`, `src/utils/gameStoriesStorage.ts:102-126`).
- Commentary feed queries load by `gameId` only (`src/utils/commentaryFeedStorage.ts:53-77`).
- Reporter context still resolves players and teams through global data sources unless injected otherwise (`src/src_figma/app/engines/reporter/reporterContext.ts:138-167`, `src/src_figma/app/engines/reporter/reporterContext.ts:417-426`, `src/src_figma/app/engines/reporter/reporterContext.ts:543-585`).
- The mode competition guardrail correctly rejects franchise playoff and elimination crossover in the shared validator (`src/utils/modeCompetitionScope.ts:35-55`), but reporter/news persistence bypasses that guardrail by reducing franchise playoff games to reporter `elimination` mode.

Tests proving behavior:

- `src/utils/tests/modeCompetitionScope.test.ts:42-70` proves the shared validator rejects franchise playoff/elimination crossover.
- `src/utils/tests/gameStoriesStorage.test.ts:58-96` proves current story queries filter by game/team/gameMode, but there is no multi-franchise or franchise-playoff isolation test.
- `src/utils/tests/commentaryFeedStorage.test.ts` covers basic feed storage behavior, but not franchise-season identity.

Status: risky.

Severity: high.

Recommendation:

- Add canonical scope fields to reporter/news persistence surfaces: `franchiseId`, `seasonId`, `seasonNumber`, `statsScopeId`, `scheduleGameId`, and playoff identifiers when applicable.
- Stop representing franchise playoff reporter context as standalone `elimination`. Either add a distinct reporter mode/scope for franchise playoff, or store `gameMode: "franchise"` with `competitionType: "playoff"` and canonical playoff IDs.
- Use the shared mode/competition guardrail before persisting derived narrative records.
- Keep old records backward-compatible by making new fields optional and by keeping old gameId-only reads as legacy fallback.

Smallest safe patch:

- Extend `GameStory` and `CommentaryFeedEntryRecord` with optional canonical identity fields.
- Thread `resolvedIdentity` from GameTracker into `useCommentaryFeed` options and post-game story persistence.
- Replace the `playoff -> elimination` reporter mapping for franchise playoff games with a franchise-scoped representation.
- Add tests proving:
  - A franchise playoff game is not stored or queried as standalone elimination.
  - Two franchises with the same visible team IDs/names do not share stories/feed rows.
  - Legacy gameId-only records still load.

### 2. SeasonSummary reads persisted summaries but still derives visible leaders, awards, and team highlights from live season stats

Requirement:

- Mode 2 to Mode 3 handoff must carry durable season summary identity and historical snapshot/reference data for completed games, standings, stat references, playoff references, and derived-system placeholders.
- The Spine expects season summaries to carry subsystem outputs or explicit placeholders for designations, fan morale, milestones, park factors, narrative highlights, and season classification (`spec-docs/SPINE_ARCHITECTURE.md:836-845`).
- Pass 5 asks whether league leader, award, milestone, and summary-derived inputs are scoped and snapshot-safe.

Repo evidence:

- `FranchiseSeasonSummary` stores canonical `franchiseId`, `seasonNumber`, `seasonId`, `statsScopeId`, handoff data, schedule reference, completed-game refs, standings, season stat snapshots, playoff refs/results, optional offseason state, and placeholders (`src/utils/franchiseSeasonSummaryStorage.ts:79-127`).
- The summary builder deep-clones standings, stat snapshots, playoff refs, and handoff data (`src/utils/franchiseSeasonSummaryStorage.ts:129-135`, `src/utils/franchiseSeasonSummaryStorage.ts:207-233`, `src/utils/franchiseSeasonSummaryStorage.ts:304-342`).
- Placeholder notes explicitly say awards are derived at display time, milestones are not promoted, fan morale is not persisted, narrative is generated from completed games at display time, and park factors are not persisted (`src/utils/franchiseSeasonSummaryStorage.ts:296-300`).
- `SeasonSummary` reads the persisted summary when available (`src/src_figma/app/pages/SeasonSummary.tsx:54-98`).
- `SeasonSummary` still initializes live data hooks for franchise data, schedule data, season stats, and playoff data (`src/src_figma/app/pages/SeasonSummary.tsx:100-104`).
- League leaders are computed from live `seasonStats.getBattingLeaders` and `seasonStats.getPitchingLeaders` (`src/src_figma/app/pages/SeasonSummary.tsx:117-158`).
- Awards are computed from live `seasonStats` leader data (`src/src_figma/app/pages/SeasonSummary.tsx:164-230`).
- Team summary/key performers are computed from live franchise standings and live `seasonStats` (`src/src_figma/app/pages/SeasonSummary.tsx:236-295`).
- Persisted summary data is used for the displayed completed/skipped counts and standings table (`src/src_figma/app/pages/SeasonSummary.tsx:409-412`, `src/src_figma/app/pages/SeasonSummary.tsx:440-463`), but not for the leaders/awards/team-highlight sections (`src/src_figma/app/pages/SeasonSummary.tsx:503-708`).

Tests proving behavior:

- `src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts` covers summary creation, copy-not-reference behavior, transition guardrails, and wrong-season playoff rejection.
- No component test proves that historical `SeasonSummary` leader, award, or key performer output is stable when live season stats later change.

Status: partial.

Severity: high.

Recommendation:

- When a persisted `FranchiseSeasonSummary` exists, render leaders, awards, and key performers from `persistedSummary.seasonStats` and `persistedSummary.standings` instead of live hooks.
- Keep the existing live-hook path only as an old-season or non-franchise fallback.
- Keep placeholder language explicit where derived systems are intentionally not persisted.

Smallest safe patch:

- Add summary-backed selector helpers for leaders, awards, and user-team highlights.
- In `SeasonSummary`, prefer persisted summary selectors when `persistedSummary` is present.
- Add a component or helper test that creates a persisted summary, mutates live stats afterward, and verifies the historical summary still renders the persisted values.

### 3. Fan morale is not durably scoped by franchise/team/season and has unsafe legacy storage if activated in franchise UI

Requirement:

- Pass 5 asks whether fan morale storage is isolated by franchise, team, and season.
- The Spine model lists `fanMorale` as a per-franchise persisted domain (`spec-docs/SPINE_ARCHITECTURE.md:758`).
- Mode 2 defines fan morale as a franchise-season flavor system driven by game events, milestones, rivalries, and narrative tone (`spec-docs/MODE_2_V1_FINAL.md:2693-2787`).

Repo evidence:

- `FanMorale` and `MoraleEvent` engine types do not include `franchiseId`, `teamId`, `seasonId`, or `statsScopeId` as durable identity fields (`src/engines/fanMoraleEngine.ts:44-64`, `src/engines/fanMoraleEngine.ts:96-110`).
- The `src_figma` `useFanMorale` hook describes itself as a stub and keeps morale in React state only, with defaults that fall back to season 1/game 0 when no game date is passed (`src/src_figma/app/hooks/useFanMorale.ts:1-13`, `src/src_figma/app/hooks/useFanMorale.ts:98-170`, `src/src_figma/app/hooks/useFanMorale.ts:141-147`).
- GameTracker creates morale hooks for home and away team IDs and updates them for all non-exhibition games (`src/src_figma/app/pages/GameTracker.tsx:2069-2072`, `src/src_figma/app/pages/GameTracker.tsx:11290-11361`). This is currently in-memory in the `src_figma` path, but it is not franchise-season durable.
- The legacy root hook persists morale under `kbl-fan-morale-${teamId}`, with no franchise or season identity (`src/hooks/useFanMorale.ts:62-86`, `src/hooks/useFanMorale.ts:92-127`).
- TeamHub explicitly leaves fan morale as an unimplemented/empty state in franchise UI (`src/src_figma/app/components/TeamHubContent.tsx:572-573`, `src/src_figma/app/components/TeamHubContent.tsx:848-858`).
- The franchise manifest marks fan morale as a deferred prototype domain and notes it has not been promoted to canonical franchise-scoped storage (`src/utils/franchiseSaveSlotManifest.ts:565-576`).

Tests proving behavior:

- `src/src_figma/__tests__/apiContracts/fanMoraleEngine.contract.test.ts` covers fan morale engine API behavior.
- No test proves franchise/team/season durable fan morale isolation.
- No test proves the legacy `kbl-fan-morale-${teamId}` store is blocked from franchise runtime usage.

Status: missing for durable franchise behavior; mostly safe only because visible franchise UI still treats it as unimplemented.

Severity: medium-high.

Recommendation:

- Keep fan morale visibly placeholder-only in franchise surfaces until a canonical `franchiseId + seasonId + teamId` store exists.
- If end-game morale updates remain in GameTracker, make their status explicit as volatile runtime flavor state and prevent any legacy team-only storage path from being used in franchise context.
- Before enabling fan morale UI, add a scoped storage record with franchise/team/season identity and migration/backward-compat behavior.

Smallest safe patch:

- Add a guard or explicit comment/test that franchise GameTracker does not persist to the legacy root `kbl-fan-morale-${teamId}` path.
- Add a `FanMoraleRecord` design note or TODO in the existing manifest/spec decision if implementation is deferred.
- Add tests for two-franchise same-team-ID isolation before any fan morale UI becomes active.

### 4. Adaptive standards and adaptive fielding learning are global, with no franchise-season snapshot or explicit architecture decision

Requirement:

- Pass 5 asks whether adaptive standards are global, league-scoped, or snapshotted to seasons.
- Mode 2 includes adaptive standards as a derived system that should adapt league context while avoiding unstable historical displays (`spec-docs/MODE_2_SECTION_MAP.md:38`, `spec-docs/MODE_2_V1_FINAL.md:2521-2638`).
- The traceability plan names adaptive standards as an unresolved scope question (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:489-491`).

Repo evidence:

- `AdaptiveEngineState` is stored under a single global id, `adaptive-engine-state`, and contains `currentContext`, `seasonHistory`, `calibrationHistory`, and `lastCalibratedSeason` without franchise identity (`src/engines/calibrationService.ts:83-91`).
- The IndexedDB database is `kbl-adaptive-standards` with an `engineState` store keyed by that global id (`src/engines/calibrationService.ts:308-333`).
- `createInitialAdaptiveState` takes a `seasonId`, but the persisted state remains globally keyed (`src/engines/calibrationService.ts:382-393`).
- `recordSeasonAndCalibrate` appends new season stats into the same global season history and saves the global state (`src/engines/calibrationService.ts:402-452`).
- `getCurrentLeagueContext` returns the global current context or a default context (`src/engines/calibrationService.ts:458-464`).
- The fielding adaptive learning engine stores zones, player adjustments, and recent events in global localStorage keys (`src/engines/adaptiveLearningEngine.ts:39-41`, `src/engines/adaptiveLearningEngine.ts:59-116`, `src/engines/adaptiveLearningEngine.ts:118-141`, `src/engines/adaptiveLearningEngine.ts:251-293`).
- Sync config and backup/restore include the adaptive standards database and adaptive learning localStorage keys as global domains (`src/utils/syncConfig.ts:101-103`, `src/utils/syncConfig.ts:148-150`, `src/utils/backupRestore.ts:581-585`).

Tests proving behavior:

- `src/src_figma/__tests__/engines/calibrationService.test.ts:239-248` expects the global `adaptive-engine-state` id.
- No test proves multi-franchise isolation, and no test proves that global adaptive context is intentionally snapshotted into season summaries before historical display.

Status: drifted from strict per-franchise Spine ownership unless explicitly accepted as global league baseline.

Severity: medium-high.

Recommendation:

- Make an architecture/spec decision before enabling adaptive standards as visible franchise history:
  - Either define adaptive standards as a global league-environment baseline and snapshot the applied context into each season summary, or
  - Re-key adaptive state by `franchiseId + seasonId/statsScopeId` and migrate old global state as legacy.
- Keep global adaptive learning out of franchise-derived historical displays until the decision is recorded.

Smallest safe patch:

- Add an explicit architecture note classifying `kbl-adaptive-standards` and `kbl_adaptive_learning_*` as global prototype/derived stores.
- Add a `calibrationContext` placeholder/reference field to `FranchiseSeasonSummary` before using adaptive standards in summary rendering.
- Add tests for either global-with-snapshot behavior or per-franchise adaptive isolation.

### 5. Park factors are static/derived and not snapshotted per franchise season

Requirement:

- Pass 5 asks whether park factors and stadium behavior use snapshots/references safely.
- The Spine expects stadium/park factors to belong to franchise data and season summaries to carry park factor references or snapshots where needed (`spec-docs/SPINE_ARCHITECTURE.md:748-761`, `spec-docs/SPINE_ARCHITECTURE.md:1138-1163`).
- Mode 2 defines park factors as a future statistical system with season activation boundaries (`spec-docs/MODE_2_SECTION_MAP.md:39`, `spec-docs/MODE_2_V1_FINAL.md:3079-3154`).

Repo evidence:

- Park factors are currently derived from static SMB4 park lookup data by stadium name, with neutral fallback (`src/engines/parkFactorDeriver.ts:18-27`, `src/engines/parkFactorDeriver.ts:83-95`).
- The static park lookup exposes global park metadata and average dimensions (`src/data/parkLookup.ts:1-54`).
- bWAR calculation can accept explicit `parkFactors` or derive them from a passed stadium name; it does not load a franchise-season stadium snapshot (`src/engines/bwarCalculator.ts:206-248`).
- pWAR park adjustment currently uses a neutral default map and generic park-factor helpers (`src/engines/pwarCalculator.ts:519-583`).
- TeamHub reads franchise stadium names from `franchiseData.stadiumMap`, but explicitly says fan morale, stadium park factors, and manager tracking are not implemented (`src/src_figma/app/components/TeamHubContent.tsx:424-432`, `src/src_figma/app/components/TeamHubContent.tsx:572-573`, `src/src_figma/app/components/TeamHubContent.tsx:1227-1234`).
- Completed-game summary refs preserve `stadiumName`, and the season summary has an explicit park-factor placeholder (`src/utils/franchiseSeasonSummaryStorage.ts:76`, `src/utils/franchiseSeasonSummaryStorage.ts:171`, `src/utils/franchiseSeasonSummaryStorage.ts:300`).
- The franchise manifest lists park factors as a derived domain and notes current summaries use placeholders (`src/utils/franchiseSaveSlotManifest.ts:537-549`).

Tests proving behavior:

- `src/src_figma/__tests__/data/parkLookup.test.ts:9-34` validates static park lookup behavior.
- No test proves per-franchise stadium snapshot/reference behavior for park factors.

Status: partial but honestly placeholdered.

Severity: medium.

Recommendation:

- Before park factors affect visible franchise history or WAR outputs, persist a season-specific stadium/park-factor snapshot or durable reference keyed by `franchiseId + seasonId + teamId`.
- Keep current static derivation as a fallback only, with explicit confidence/placeholder labeling.

Smallest safe patch:

- Extend `FranchiseSeasonSummary.placeholders.parkFactors` or add a `parkFactorsRef` placeholder explaining that only `stadiumName` refs are durable today.
- Add tests that park-factor summary placeholders are explicit and that no franchise summary pretends static derived factors are season snapshots.

### 6. Milestone detection uses seasonId, but durable milestone storage and queries are not franchise/stats-scope indexed

Requirement:

- Pass 5 asks whether milestones and league leader inputs use canonical franchise season/stats scope.
- The Spine lists `milestones` as a per-franchise persisted domain (`spec-docs/SPINE_ARCHITECTURE.md:756`).
- Mode 2 milestone logic includes season awards, franchise firsts, and adaptive thresholds (`spec-docs/MODE_2_V1_FINAL.md:2521-2638`).

Repo evidence:

- `careerMilestones` are stored in `kbl-tracker-db` with indexes for `playerId`, `milestoneType`, and `achievedDate`, but no `franchiseId`, `statsScopeId`, or `seasonId` index (`src/utils/trackerDb.ts:141-148`).
- `CareerMilestone` has `playerId`, `playerName`, `milestoneType`, `achievedDate`, optional `gameId`, and optional `seasonId`, but no `franchiseId` or `statsScopeId` (`src/utils/careerStorage.ts:172-187`).
- Milestone queries load by `playerId`, `milestoneType`, or global recent date, not by franchise or stats scope (`src/utils/careerStorage.ts:535-546`, `src/utils/careerStorage.ts:563-574`, `src/utils/careerStorage.ts:580-602`).
- The milestone detector does include `seasonId` in season milestone keys and persisted milestone records (`src/utils/milestoneDetector.ts:793-801`, `src/utils/milestoneDetector.ts:825-827`, `src/utils/milestoneDetector.ts:863-872`, `src/utils/milestoneDetector.ts:1448-1469`).
- The milestone aggregator accepts `seasonId` and optional `franchiseId`, and franchise firsts/leaders use both values (`src/utils/milestoneAggregator.ts:688-715`, `src/utils/milestoneAggregator.ts:794-824`, `src/utils/milestoneAggregator.ts:896-927`).
- The franchise manifest treats milestones as a global-scoped domain, safe only insofar as franchise players are copied with franchise-owned IDs (`src/utils/franchiseSaveSlotManifest.ts:579-590`).

Tests proving behavior:

- `src/src_figma/__tests__/detection/milestoneDetector.test.ts:1311-1337` proves `seasonId` is included in newly created milestone records.
- No test proves same-player-ID multi-franchise milestone isolation or statsScopeId filtering.

Status: mostly complete for seasonId-aware detection; risky for durable cross-franchise querying if IDs collide or if old/global players are referenced.

Severity: medium.

Recommendation:

- Add optional `franchiseId` and `statsScopeId` to milestone records and indexes while preserving backward compatibility for old rows.
- Scope franchise milestone displays by `franchiseId + seasonId/statsScopeId` when those fields are present.
- Keep global career milestone queries only for explicit non-franchise/global contexts.

Smallest safe patch:

- Extend `CareerMilestone` with optional `franchiseId` and `statsScopeId`.
- Thread canonical identity from aggregation into `recordCareerMilestone`.
- Add indexes and tests for two franchises with the same visible player identity.

### 7. Awards and league-leader inputs are seasonId-scoped in core stats, but award UI paths still rely on live/global candidate sources in places

Requirement:

- Pass 5 asks whether awards and league leader inputs are scoped to canonical franchise season data.
- Mode 2 calls for awards/season leaders to be derived from the correct season and player/team context (`spec-docs/MODE_2_V1_FINAL.md:2521-2638`, `spec-docs/MODE_2_V1_FINAL.md:3242-3244`).

Repo evidence:

- `useSeasonStats` loads batting/pitching stats by the provided `seasonId`; if no seasonId is provided, it defaults to `season-1` (`src/hooks/useSeasonStats.ts:320-348`).
- `useSeasonStats` loads fielding events using `statsScopeId: seasonId`, `seasonId`, and a competition type inferred from the season id (`src/hooks/useSeasonStats.ts:350-356`).
- Leader helpers return leaders from the loaded season stats (`src/hooks/useSeasonStats.ts:400-470`).
- `SeasonSummary` does pass a canonical route/persisted `seasonId` into `useSeasonStats`, but visible leader and awards rendering still uses live hook data instead of persisted summary snapshots, as described in Finding 2 (`src/src_figma/app/pages/SeasonSummary.tsx:100-158`, `src/src_figma/app/pages/SeasonSummary.tsx:503-647`).
- `AwardsCeremonyFlow` accepts optional `franchiseId` and scoped `seasonId`/`seasonNumber`, loads manager stats by seasonId, and scopes offseason state by `{ franchiseId }` (`src/src_figma/app/components/AwardsCeremonyFlow.tsx:122-154`).
- `AwardsCeremonyFlow` also converts candidate players/teams from `useOffseasonData` rather than from a durable `FranchiseSeasonSummary` snapshot (`src/src_figma/app/components/AwardsCeremonyFlow.tsx:196-212`).

Tests proving behavior:

- Existing season-summary tests cover summary persistence and copy-not-reference at the storage level.
- No test proves award candidate pools come only from franchise-owned player/team/stat snapshots.
- No test proves old global candidate data is excluded from franchise award displays.

Status: partial.

Severity: medium.

Recommendation:

- For franchise summaries and offseason award ceremonies, derive award candidates from persisted `FranchiseSeasonSummary.seasonStats` plus franchise-owned team/player snapshots.
- Keep `useOffseasonData`/global candidate paths as non-franchise or legacy fallback only.

Smallest safe patch:

- Add a summary-backed award-input adapter.
- Prefer it when `franchiseId` and persisted summary are present.
- Add tests that two franchises with the same season number do not share award candidates or league leaders.

### 8. Mojo/fitness no longer auto-mutates during franchise finalization, and elimination snapshots remain separated from franchise paths

Requirement:

- Pass 5 asks whether mojo/fitness behavior avoids automatic franchise-finalization mutation.
- Mode 2 v1 treats mojo/fitness as user-observed in-game systems, while franchise finalization should not apply automatic hidden carryover/decay (`spec-docs/MODE_2_V1_FINAL.md:1832-1856`).

Repo evidence:

- `SeasonTransitionOptions` includes `skipMojoReset` and `skipLegacyLocalStorageMarkers`, with a comment tying the skip to Mode 2 v1 franchise finalization (`src/engines/seasonTransitionEngine.ts:64-68`).
- `executeSeasonTransition` skips automatic mojo reset when requested and records that skip in transition details (`src/engines/seasonTransitionEngine.ts:341-351`).
- `FinalizeAdvanceFlow` passes `skipMojoReset: true` and `skipLegacyLocalStorageMarkers: true` for franchise transitions (`src/src_figma/app/components/FinalizeAdvanceFlow.tsx:420-430`).
- Direct franchise start-season transition also passes `skipMojoReset: true` and `skipLegacyLocalStorageMarkers: true`; global current-season mutation is limited to the non-franchise branch (`src/src_figma/app/pages/FranchiseHome.tsx:426-453`, `src/src_figma/app/pages/FranchiseHome.tsx:509-513`).
- GameTracker elimination mojo/fitness snapshots are gated to `effectiveGameMode === "elimination"` plus `eliminationId` (`src/src_figma/app/pages/GameTracker.tsx:4609-4633`, `src/src_figma/app/pages/GameTracker.tsx:11453-11476`).

Tests proving behavior:

- `src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:362-377` proves franchise transition skips mojo reset and legacy global marker mutation.
- `src/src_figma/__tests__/mojoFitness/mojoEngine.test.ts`, `src/src_figma/__tests__/mojoFitness/fitnessEngine.test.ts`, and `src/src_figma/__tests__/mojoFitness/mojoFitnessIntegration.test.ts` passed in the focused run.

Status: mostly complete.

Severity: low.

Recommendation:

- Keep the current no-auto-reset franchise boundary.
- Add a future test only if mojo/fitness becomes durable in franchise storage.

Smallest safe patch:

- None required for Pass 5.

### 9. FranchiseSeasonSummary derived-system placeholders are explicit, but not all placeholder categories have direct assertions

Requirement:

- Pass 5 asks whether `FranchiseSeasonSummary` contains honest placeholders/references for derived systems.
- The Spine expects season summary subsystem fields for awards/designations, fan morale, milestones, park factors, narrative, and season classification (`spec-docs/SPINE_ARCHITECTURE.md:836-845`).

Repo evidence:

- `FranchiseSeasonSummaryPlaceholders` supports `awards`, `milestones`, `fanMorale`, `narrative`, and `parkFactors` placeholder strings (`src/utils/franchiseSeasonSummaryStorage.ts:40-43`).
- The summary builder writes explicit placeholder text for all five categories (`src/utils/franchiseSeasonSummaryStorage.ts:296-300`).
- Summary storage deep-clones the completed summary before saving and returning it (`src/utils/franchiseSeasonSummaryStorage.ts:304-342`).

Tests proving behavior:

- The Wave 4 franchise summary tests verify summary creation and copy-not-reference behavior.
- Existing assertions cover some placeholder behavior, but there is no focused assertion that all five derived placeholder keys remain present and explicit.

Status: mostly complete.

Severity: low.

Recommendation:

- Add a small storage-level assertion that all placeholder keys are present and non-empty.

Smallest safe patch:

- Extend the existing franchise season summary test with one assertion over `summary.placeholders`.

### 10. Farm morale/narrative/mechanical effects are absent from runtime movement, with storage boundaries limited to roster/options/reveal state

Requirement:

- Pass 5 asks only to note farm morale/narrative/mechanical-effect boundaries, without implementing farm algorithms or the roster analyzer.
- Farm spec defines future morale, personality, relationship, story, and milestone fields as part of farm-player modeling (`spec-docs/FARM_SYSTEM_SPEC.md:94-114`).

Repo evidence:

- Franchise farm storage records are keyed by `franchiseId:seasonId:teamId:playerId` and include roster level/status, options used, rating reveal state, and timestamps; they do not include farm morale, storylines, or mechanical effects (`src/utils/franchiseFarmStorage.ts:7-21`, `src/utils/franchiseFarmStorage.ts:49-56`, `src/utils/franchiseFarmStorage.ts:99-103`).
- Roster movement writers update franchise player/team state, options, rating reveal state, and canonical transactions; they do not mutate farm morale or narrative systems (`src/utils/franchiseRosterMovement.ts:74-143`, `src/utils/franchiseRosterMovement.ts:146-187`).

Tests proving behavior:

- `src/utils/tests/franchiseRosterMovement.test.ts:74-187` covers scoped call-up/send-down behavior, options, and rating reveal.
- No tests cover farm morale/narrative because those systems are not implemented.

Status: partial by design.

Severity: low.

Recommendation:

- Keep farm morale/narrative/mechanical effects as explicit future boundaries.
- Before implementing them, add scoped records keyed by `franchiseId + seasonId + teamId + playerId` and tests for cross-franchise isolation.

Smallest safe patch:

- None required for Pass 5 unless product copy begins exposing farm morale/narrative as active behavior.

## Additional Test Gaps

Required before more derived/flavor feature work:

- Franchise playoff reporter/news rows are not stored or queried as standalone elimination rows.
- Reporter/news rows include optional canonical identity and remain backward-compatible with legacy rows.
- Multi-franchise same-season story/feed isolation.
- SeasonSummary uses persisted summary stat snapshots for historical leaders, awards, and key performers.
- Fan morale cannot use legacy team-only localStorage in franchise context.
- Adaptive standards are either explicitly global-with-summary-snapshot or per-franchise scoped, with tests for the chosen model.
- Park factor placeholders remain explicit until franchise-season park factor snapshots exist.
- Milestones with `franchiseId`/`statsScopeId` do not leak across franchises when visible player identity collides.

## Safe to proceed to Pass 6?

No.

Pass 6 should wait until the active Pass 5 mode-scope blocker is fixed. The strongest blocker is the reporter/news path that stores franchise playoff flavor records as `elimination` and lacks canonical franchise-season identity. SeasonSummary's derived display path is also a practical handoff blocker because persisted summaries exist but several visible historical sections still depend on live state.

## Top Blockers

1. Reporter/news identity and mode crossover:
   - Franchise playoff flavor data is downcast to `elimination`.
   - Story/feed records do not carry canonical franchise-season identity.
   - Existing mode guardrail tests do not cover reporter/news persistence.

2. SeasonSummary historical derived displays:
   - Persisted summaries are read, but leaders, awards, and key performers are still derived from live hooks.
   - This weakens the durable season-end handoff contract for derived/flavor outputs.

3. Fan morale and adaptive standards need explicit boundaries before activation:
   - Fan morale has only prototype/legacy storage and no canonical franchise/team/season persistence.
   - Adaptive standards are global without a recorded global-with-snapshot or per-franchise decision.

## Recommended Next Implementation Prompt

Recommended reasoning: High

Please implement the Pass 5 derived/flavor scope blocker patch.

Scope:
- Implement only the smallest runtime correctness fixes needed from `spec-docs/AUDIT_PASS_5_DERIVED_FLAVOR_SYSTEMS.md`.
- Do not start Pass 6.
- Do not add roster analyzer work.
- Do not design the roster analyzer.

Focus:
1. Reporter/news canonical identity
   - Add optional canonical identity fields to `GameStory` and `CommentaryFeedEntryRecord`: `franchiseId`, `seasonId`, `seasonNumber`, `statsScopeId`, `scheduleGameId`, and playoff identifiers where applicable.
   - Thread resolved GameTracker identity into `useCommentaryFeed` and post-game story persistence.
   - Preserve backward compatibility for legacy story/feed rows.

2. Franchise playoff mode guardrail
   - Stop storing franchise playoff reporter/news rows as standalone `elimination`.
   - Preserve standalone elimination behavior.
   - Add tests proving franchise playoff stories/feed rows do not appear in elimination-only queries.

3. SeasonSummary persisted derived displays
   - When a persisted `FranchiseSeasonSummary` exists, derive leaders, awards, and key performers from the persisted summary snapshot.
   - Keep live hooks only as non-franchise or old-season fallback.
   - Add tests proving historical summary display remains stable after live stats change.

4. Boundary tests
   - Add multi-franchise same-season narrative/feed isolation tests.
   - Add a guard test showing franchise context does not use legacy team-only fan morale persistence.

Output:
- Summary of changed files.
- Tests run and results.
- Any remaining Pass 5 risks that should still block Pass 6.
