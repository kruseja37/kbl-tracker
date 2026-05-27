# Audit Pass 3: Mode 2 Season-End To Offseason Boundary

Date: 2026-05-21

Scope: Repo-backed audit only. No code implementation, no roster analyzer work, and no Pass 4 audit. This pass checks the Mode 2 -> Mode 3 season-end handoff, finalization safety, SeasonSummary rendering, and the Mode 3 -> Mode 2 new-season boundary.

## Findings

### Finding 1: SeasonSummary playoff creation can still seed franchise playoffs from League Builder globals

- Requirement: After franchise setup, runtime franchise season-end and playoff paths must use copy-not-reference franchise state, not mutable League Builder templates. The Spine requires franchise copies to be independent from the global pool (`spec-docs/SPINE_ARCHITECTURE.md:770`) and Mode 2 season-end output must include franchise-scoped playoff results (`spec-docs/SPINE_ARCHITECTURE.md:819`, `spec-docs/MODE_2_V1_FINAL.md:93`).
- Repo evidence: The SeasonSummary route is explicitly a franchise route (`src/src_figma/app/pages/SeasonSummary.tsx:11`) and its `handleStartPlayoffs` calls `playoffData.createNewPlayoff` without pre-seeded franchise teams (`src/src_figma/app/pages/SeasonSummary.tsx:303`, `src/src_figma/app/pages/SeasonSummary.tsx:340`). In that no-preseed path, `usePlayoffData.createNewPlayoff` reads `getAllLeagueTemplates()` and `getAllTeams()` from League Builder (`src/src_figma/hooks/usePlayoffData.ts:281`, `src/src_figma/hooks/usePlayoffData.ts:284`) and uses the first global template to map playoff conferences/divisions (`src/src_figma/hooks/usePlayoffData.ts:293`, `src/src_figma/hooks/usePlayoffData.ts:296`). It attaches `sourceType: 'franchise'`, `franchiseId`, and `seasonId` only when writing the bracket (`src/src_figma/hooks/usePlayoffData.ts:367`, `src/src_figma/hooks/usePlayoffData.ts:370`), so the persisted identity is scoped but the team/template inputs can drift.
- Repo evidence: FranchiseHome's bracket creation path is safer because it builds `playoffSeedingTeams` from franchise standings/team maps (`src/src_figma/app/pages/FranchiseHome.tsx:661`, `src/src_figma/app/pages/FranchiseHome.tsx:669`) and passes `preSeededTeams` into `createNewPlayoff` (`src/src_figma/app/pages/FranchiseHome.tsx:716`, `src/src_figma/app/pages/FranchiseHome.tsx:725`).
- Tests proving behavior: No test currently proves the SeasonSummary `START PLAYOFFS` route ignores later League Builder edits. Focused tests passed, but they do not cover this path: `npm test -- src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx src/src_figma/__tests__/franchiseMode/FinalizeAdvanceFlow.pass1a.test.tsx src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts src/src_figma/__tests__/franchiseMode/useFranchiseData.scope.test.tsx src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx src/utils/tests/playoffStorage.elimination.test.ts` passed 38 tests.
- Status: risky.
- Severity: High, blocks Pass 4.
- Recommendation: Move the no-preseed franchise playoff creation path off League Builder globals. Either make `usePlayoffData.createNewPlayoff` load franchise-owned team snapshots/config when `playoffFranchiseId` exists, or make SeasonSummary pass pre-seeded teams derived from the persisted summary/franchise standings.
- Smallest safe patch: In `usePlayoffData.createNewPlayoff`, branch on `playoffFranchiseId`; for franchise scope, use franchise-owned teams/config and canonical standings, with League Builder fallback only for damaged legacy saves. Add a test that mutates League Builder after franchise setup and proves SeasonSummary-created playoff teams/names/seeds come from franchise-owned state.

### Finding 2: SeasonSummary only partially renders the persisted summary

- Requirement: SeasonSummary should read persisted durable summaries when available and fall back safely for old seasons without summaries. The handoff must be copy-not-reference (`spec-docs/MODE_2_V1_FINAL.md:3229`) and include standings, playoff results, and season stat snapshots (`spec-docs/SPINE_ARCHITECTURE.md:824`).
- Repo evidence: The durable summary stores copied standings and season stat snapshots (`src/utils/franchiseSeasonSummaryStorage.ts:106`, `src/utils/franchiseSeasonSummaryStorage.ts:110`) and writes cloned standings/stats into the summary (`src/utils/franchiseSeasonSummaryStorage.ts:276`, `src/utils/franchiseSeasonSummaryStorage.ts:280`). SeasonSummary loads `getFranchiseSeasonSummary(seasonId)` (`src/src_figma/app/pages/SeasonSummary.tsx:80`, `src/src_figma/app/pages/SeasonSummary.tsx:85`) but only uses the persisted object for standings and game counts (`src/src_figma/app/pages/SeasonSummary.tsx:405`, `src/src_figma/app/pages/SeasonSummary.tsx:406`, `src/src_figma/app/pages/SeasonSummary.tsx:407`). League leaders, WAR leaders, awards, and the user's team summary still derive from live hooks (`src/src_figma/app/pages/SeasonSummary.tsx:117`, `src/src_figma/app/pages/SeasonSummary.tsx:140`, `src/src_figma/app/pages/SeasonSummary.tsx:164`, `src/src_figma/app/pages/SeasonSummary.tsx:236`).
- Repo evidence: The page derives its season from current franchise metadata, not an explicit historical route parameter (`src/src_figma/app/pages/SeasonSummary.tsx:58`, `src/src_figma/app/utils/franchiseRouteSeason.ts:13`, `src/src_figma/app/utils/franchiseRouteSeason.ts:22`). That is safe for the current season but does not provide a durable old-season UI path after metadata advances.
- Tests proving behavior: Storage-level summary tests prove canonical payloads, multi-franchise isolation, wrong-season playoff rejection, incomplete archive exclusion, and copy-not-reference snapshots (`src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:132`, `src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:166`, `src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:232`, `src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:298`, `src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:331`). There is no component-level test proving SeasonSummary renders persisted stats/leaders/awards from the summary.
- Status: partial.
- Severity: Medium-high.
- Recommendation: Treat the persisted summary as the primary source for historical SeasonSummary sections when present, and keep live hooks as the old-season fallback only.
- Smallest safe patch: Add derived helpers for leaders/awards/team summary from `persistedSummary.seasonStats` and `persistedSummary.standings`; use hook-derived values only when no persisted summary exists. Add a component test that seeds a persisted summary, mutates live stats or leaves them empty, and verifies the UI still shows summary snapshot values.

### Finding 3: Summary storage and Mode 2 -> Mode 3 handoff identity are mostly complete

- Requirement: Mode 2 must create a durable SeasonSummary before offseason mutation, keyed by canonical `franchiseId`, `seasonNumber`, `seasonId`, and `statsScopeId`, with schedule/completed-game/playoff/offseason identity (`spec-docs/SPINE_ARCHITECTURE.md:819`, `spec-docs/MODE_2_V1_FINAL.md:3229`).
- Repo evidence: The IndexedDB migration creates `franchiseSeasonSummaries` in `kbl-tracker` with keyPath `seasonId`, indexes for `franchiseId`, `seasonNumber`, and unique `franchiseId_seasonNumber` (`src/utils/trackerDb.ts:103`, `src/utils/trackerDb.ts:106`, `src/utils/trackerDb.ts:108`). The summary type carries `franchiseId`, `seasonNumber`, `seasonId`, `statsScopeId`, handoff, season metadata, schedule refs, completed-game refs, standings, season stats, playoff refs/stats, and `offseasonStateId` (`src/utils/franchiseSeasonSummaryStorage.ts:79`, `src/utils/franchiseSeasonSummaryStorage.ts:87`, `src/utils/franchiseSeasonSummaryStorage.ts:89`, `src/utils/franchiseSeasonSummaryStorage.ts:98`, `src/utils/franchiseSeasonSummaryStorage.ts:115`, `src/utils/franchiseSeasonSummaryStorage.ts:121`).
- Repo evidence: Summary creation reads schedule by `franchiseId + seasonNumber`, completed games by `franchiseId + seasonId`, standings/stats by canonical season ID, and offseason state by canonical season ID (`src/utils/franchiseSeasonSummaryStorage.ts:212`, `src/utils/franchiseSeasonSummaryStorage.ts:224`, `src/utils/franchiseSeasonSummaryStorage.ts:225`, `src/utils/franchiseSeasonSummaryStorage.ts:226`, `src/utils/franchiseSeasonSummaryStorage.ts:232`). Explicit playoff IDs are rejected if franchise, season ID, or season number does not match (`src/utils/franchiseSeasonSummaryStorage.ts:175`, `src/utils/franchiseSeasonSummaryStorage.ts:186`, `src/utils/franchiseSeasonSummaryStorage.ts:190`, `src/utils/franchiseSeasonSummaryStorage.ts:194`). The saved summary is keyed by `seasonId`, cloned, and synced (`src/utils/franchiseSeasonSummaryStorage.ts:304`, `src/utils/franchiseSeasonSummaryStorage.ts:308`, `src/utils/franchiseSeasonSummaryStorage.ts:321`).
- Repo evidence: The handoff helper produces canonical `seasonId`, `statsScopeId`, `seasonSummaryId`, schedule scope, completed-games query, playoff ID, and `offseason-${seasonId}` (`src/utils/franchisePersistenceContract.ts:56`, `src/utils/franchisePersistenceContract.ts:74`, `src/utils/franchisePersistenceContract.ts:81`). Summary placeholders for awards, milestones, fan morale, narrative, and park factors are explicit and honest (`src/utils/franchiseSeasonSummaryStorage.ts:296`, `src/utils/franchiseSeasonSummaryStorage.ts:297`, `src/utils/franchiseSeasonSummaryStorage.ts:298`, `src/utils/franchiseSeasonSummaryStorage.ts:299`, `src/utils/franchiseSeasonSummaryStorage.ts:300`).
- Tests proving behavior: Wave 4 summary tests cover two-franchise same-season isolation, canonical summary content, incomplete archive exclusion, wrong-season playoff rejection, copy-not-reference behavior, and global marker/mojo skip behavior (`src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:132`, `src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:166`, `src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:232`, `src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:298`, `src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:331`, `src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:362`).
- Status: mostly complete.
- Severity: Low, except where consumed by Findings 1 and 2.
- Recommendation: Keep this storage contract. Fix consumers rather than replacing the durable summary store.
- Smallest safe patch: No storage patch required for Pass 3; patch the SeasonSummary and playoff-creation consumers above.

### Finding 4: Finalization ordering is safe at metadata/schedule boundaries, but transition side-effect rollback is still deferred

- Requirement: FinalizeAdvanceFlow and direct `START SEASON {n+1}` should create the summary before advancing, abort on summary/transition/schedule/metadata failure, avoid global `kbl-current-season` mutation in franchise context, and identify rollback gaps (`spec-docs/OFFSEASON_SYSTEM_SPEC.md:1772`, `spec-docs/OFFSEASON_SYSTEM_SPEC.md:1776`, `spec-docs/OFFSEASON_SYSTEM_SPEC.md:1780`).
- Repo evidence: Direct start creates the franchise summary before `executeSeasonTransition` (`src/src_figma/app/pages/FranchiseHome.tsx:431`, `src/src_figma/app/pages/FranchiseHome.tsx:433`), aborts without schedule/metadata movement on transition failure (`src/src_figma/app/pages/FranchiseHome.tsx:456`, `src/src_figma/app/pages/FranchiseHome.tsx:464`), stages the new schedule before metadata (`src/src_figma/app/pages/FranchiseHome.tsx:476`, `src/src_figma/app/pages/FranchiseHome.tsx:480`), cleans staged schedule/metadata on schedule or metadata failure (`src/src_figma/app/pages/FranchiseHome.tsx:483`, `src/src_figma/app/pages/FranchiseHome.tsx:499`), and only writes global `kbl-current-season` for non-franchise routes (`src/src_figma/app/pages/FranchiseHome.tsx:509`, `src/src_figma/app/pages/FranchiseHome.tsx:511`).
- Repo evidence: FinalizeAdvanceFlow also creates the summary before transition (`src/src_figma/app/components/FinalizeAdvanceFlow.tsx:372`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:382`), skips franchise legacy localStorage markers and mojo reset in `executeSeasonTransition` (`src/src_figma/app/components/FinalizeAdvanceFlow.tsx:401`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:403`), stages schedule before committing franchise metadata (`src/src_figma/app/components/FinalizeAdvanceFlow.tsx:411`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:418`), and cleans staged schedule/metadata on advancement failure (`src/src_figma/app/components/FinalizeAdvanceFlow.tsx:423`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:424`).
- Repo evidence: The engine itself still mutates player ages and salaries step-by-step (`src/engines/seasonTransitionEngine.ts:328`, `src/engines/seasonTransitionEngine.ts:336`) and returns `success: false` on error without rolling back earlier mutation steps (`src/engines/seasonTransitionEngine.ts:401`, `src/engines/seasonTransitionEngine.ts:408`). Callers explicitly document this transition-journal gap (`src/src_figma/app/pages/FranchiseHome.tsx:456`, `src/src_figma/app/pages/FranchiseHome.tsx:457`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:431`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:432`). Franchise transition options skip global markers in the engine (`src/engines/seasonTransitionEngine.ts:356`, `src/engines/seasonTransitionEngine.ts:367`, `src/engines/seasonTransitionEngine.ts:379`, `src/engines/seasonTransitionEngine.ts:391`).
- Tests proving behavior: Direct start abort tests cover summary failure, transition failure, and schedule failure cleanup (`src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx:642`, `src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx:666`, `src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx:706`). FinalizeAdvanceFlow tests cover schedule failure cleanup and transition failure abort (`src/src_figma/__tests__/franchiseMode/FinalizeAdvanceFlow.pass1a.test.tsx:128`, `src/src_figma/__tests__/franchiseMode/FinalizeAdvanceFlow.pass1a.test.tsx:157`). The focused test run passed these tests.
- Status: mostly complete, risky.
- Severity: Medium.
- Recommendation: The current boundary is safe against partial season-number advancement, but not against partially applied player mutations inside `executeSeasonTransition`.
- Smallest safe patch: No immediate Pass 3 consumer patch if this remains an acknowledged v1 limitation. Before production hardening, add a transition journal or make transition steps stage player updates and commit atomically after schedule/metadata success.

### Finding 5: Mode 3 -> Mode 2 new-season identity exists in scoped records, but there is no durable NewSeasonHandoff object

- Requirement: Offseason completion should produce a new-season handoff with `franchiseId`, new `seasonId`, new `seasonNumber`, updated teams/players/rosters, schedule, reset standings/stats, and carryover state (`spec-docs/SPINE_ARCHITECTURE.md:868`, `spec-docs/SPINE_ARCHITECTURE.md:873`).
- Repo evidence: New season schedule generation writes scoped schedule rows with `franchiseId` and new `seasonNumber` (`src/utils/franchiseInitializer.ts:315`, `src/utils/franchiseInitializer.ts:340`, `src/utils/franchiseInitializer.ts:342`) and creates canonical franchise season metadata (`src/utils/franchiseInitializer.ts:351`, `src/utils/franchiseInitializer.ts:354`). FranchiseHome derives the active season ID as `{franchiseId}-season-{n}` (`src/src_figma/app/pages/FranchiseHome.tsx:200`, `src/src_figma/app/pages/FranchiseHome.tsx:201`) and `useScheduleData` reads schedules by franchise ID and season number (`src/src_figma/hooks/useScheduleData.ts:101`, `src/src_figma/hooks/useScheduleData.ts:103`). Offseason state is keyed as `offseason-${seasonId}` and carries optional `franchiseId` (`src/utils/offseasonStorage.ts:300`, `src/utils/offseasonStorage.ts:307`, `src/utils/offseasonStorage.ts:311`); the hook passes `franchiseId` into `startOffseason` (`src/src_figma/hooks/useOffseasonState.ts:123`, `src/src_figma/hooks/useOffseasonState.ts:210`).
- Repo evidence: No persisted object equivalent to the Spine `NewSeasonHandoff` is created. Instead, the handoff is implicit across franchise metadata, season metadata, schedule rows, franchise player records, and offseason records.
- Tests proving behavior: New-season schedule generation creates franchise season metadata (`src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts:190`). Schedule scoping tests cover no cross-franchise schedule bleed and scoped metadata/team stats (`src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts:28`, `src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts:71`). There is no test for a durable `NewSeasonHandoff` object because none exists.
- Status: partial.
- Severity: Medium.
- Recommendation: Decide whether the scoped-global hybrid intentionally treats the new-season handoff as an assembled contract rather than a single object. If yes, document that explicitly in the storage decision and add a validator test that assembles the new-season contract from metadata, schedule, players, and offseason state.
- Smallest safe patch: Add a read-only `buildNewSeasonHandoffView(franchiseId, seasonNumber)` validator/helper and tests; do not move storage or implement roster algorithms in Pass 3.

### Finding 6: Farm/offseason roster movement remains a Pass 4 boundary, not a completed Pass 3 handoff

- Requirement: Phase 11 requires every team to reach exactly 22 MLB and 10 Farm before the new season (`spec-docs/OFFSEASON_SYSTEM_SPEC.md:1604`, `spec-docs/OFFSEASON_SYSTEM_SPEC.md:1608`, `spec-docs/FARM_SYSTEM_SPEC.md:9`, `spec-docs/FARM_SYSTEM_SPEC.md:26`, `spec-docs/FARM_SYSTEM_SPEC.md:1708`).
- Repo evidence: FinalizeAdvanceFlow validates local UI rosters as 22/10 (`src/src_figma/app/components/FinalizeAdvanceFlow.tsx:347`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:351`), but its displayed offseason data comes from `useOffseasonData`, which reads global/static playerDatabase teams and players (`src/src_figma/hooks/useOffseasonData.ts:269`, `src/src_figma/hooks/useOffseasonData.ts:288`, `src/src_figma/hooks/useOffseasonData.ts:293`). Its call-up/send-down actions mutate local React state only (`src/src_figma/app/components/FinalizeAdvanceFlow.tsx:195`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:208`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:224`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:262`). The actual transition uses franchise player storage when `franchiseId` exists (`src/src_figma/app/components/FinalizeAdvanceFlow.tsx:373`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:374`, `src/engines/seasonTransitionEngine.ts:97`), so UI roster movement is not the durable franchise mutation source.
- Repo evidence: Prototype offseason mutation flows are guarded in franchise context (`src/src_figma/app/utils/franchiseOffseasonGuards.ts:1`, `src/src_figma/app/utils/franchiseOffseasonGuards.ts:4`).
- Tests proving behavior: Component guard tests assert FreeAgencyFlow, RetirementFlow, RatingsAdjustmentFlow, and DraftFlow do not call League Builder/template mutation functions in franchise context (`src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:148`, `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:181`, `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:206`, `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:224`). There is no durable franchise roster/farm movement test for Phase 11.
- Status: partial.
- Severity: Medium, expected Pass 4 topic.
- Recommendation: Do not treat Phase 11 roster movement as complete. Pass 4 should audit/plan franchise-owned roster movement adapters and transaction events without adding roster analyzer work.
- Smallest safe patch: If work is needed before Pass 4, make the FinalizeAdvanceFlow franchise roster-management UI explicitly read-only or load franchise-owned players/teams for display. Do not enable mutations until franchise-owned adapters and transaction logging are audited.

### Finding 7: Playoff/franchise/elimination storage guardrails are mostly complete

- Requirement: Franchise playoffs must be isolated by `franchiseId + seasonId + seasonNumber`; elimination mode must not be read or aggregated as franchise playoff data.
- Repo evidence: Playoff configs include `seasonNumber`, `seasonId`, `sourceType`, optional `franchiseId`, and optional `eliminationId` (`src/utils/playoffStorage.ts:38`, `src/utils/playoffStorage.ts:67`). Elimination creation requires `eliminationId` (`src/utils/playoffStorage.ts:439`, `src/utils/playoffStorage.ts:444`), franchise lookups require `sourceType === 'franchise'`, `franchiseId`, `seasonNumber`, and optional `seasonId` (`src/utils/playoffStorage.ts:583`, `src/utils/playoffStorage.ts:603`, `src/utils/playoffStorage.ts:607`, `src/utils/playoffStorage.ts:609`), and elimination reads use `getPlayoffByElimination` (`src/utils/playoffStorage.ts:623`, `src/utils/playoffStorage.ts:638`). Aggregation rejects elimination games into franchise playoffs and rejects franchise mismatch, season mismatch, stats-scope mismatch, and season-number mismatch (`src/utils/playoffStorage.ts:1271`, `src/utils/playoffStorage.ts:1293`, `src/utils/playoffStorage.ts:1297`, `src/utils/playoffStorage.ts:1304`, `src/utils/playoffStorage.ts:1311`, `src/utils/playoffStorage.ts:1318`). `usePlayoffData` locks franchise reads to `getPlayoffByFranchiseSeason` and keeps current-playoff fallback non-franchise only (`src/src_figma/hooks/usePlayoffData.ts:139`, `src/src_figma/hooks/usePlayoffData.ts:147`).
- Tests proving behavior: Elimination playoff storage tests passed in the focused run (`src/utils/tests/playoffStorage.elimination.test.ts`), and playoff fielding scope tests exist for franchise playoff competition scope (`src/src_figma/__tests__/playoffMode/playoffFieldingScope.test.ts:64`). Summary wrong-season playoff rejection is tested (`src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:298`).
- Status: mostly complete.
- Severity: Low.
- Recommendation: Keep this guardrail. The remaining playoff issue is not storage identity; it is the SeasonSummary no-preseed input path from Finding 1.
- Smallest safe patch: Add the SeasonSummary/playoff creation isolation test described in Finding 1.

## Focus-Area Coverage

| Focus area | Status | Evidence |
| --- | --- | --- |
| Mode 2 -> Mode 3 summary creation | Mostly complete | Summary store and builder are canonical and copy snapshots (`src/utils/trackerDb.ts:103`, `src/utils/franchiseSeasonSummaryStorage.ts:249`). |
| Durable identity in summary | Mostly complete | Handoff includes franchise, season, stats, schedule, completed-game, playoff, and offseason identity (`src/utils/franchisePersistenceContract.ts:56`, `src/utils/franchisePersistenceContract.ts:81`). |
| FinalizeAdvanceFlow safety | Mostly complete, risky rollback gap | Summary-before-transition and staged schedule-before-metadata exist (`src/src_figma/app/components/FinalizeAdvanceFlow.tsx:382`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:418`); transition journal deferred (`src/src_figma/app/components/FinalizeAdvanceFlow.tsx:431`). |
| Direct `START SEASON {n+1}` safety | Mostly complete, risky rollback gap | Summary/transition/schedule/metadata abort guards exist (`src/src_figma/app/pages/FranchiseHome.tsx:431`, `src/src_figma/app/pages/FranchiseHome.tsx:456`, `src/src_figma/app/pages/FranchiseHome.tsx:476`, `src/src_figma/app/pages/FranchiseHome.tsx:493`). |
| No franchise global current-season mutation | Complete for audited paths | Franchise path skips `kbl-current-season` writes (`src/src_figma/app/pages/FranchiseHome.tsx:509`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:401`, `src/engines/seasonTransitionEngine.ts:391`). |
| SeasonSummary persisted read | Partial | Reads summary (`src/src_figma/app/pages/SeasonSummary.tsx:85`) but only uses parts of it (`src/src_figma/app/pages/SeasonSummary.tsx:405`). |
| Wrong-season playoff rejection | Complete | Explicit playoff validation rejects mismatched franchise/season (`src/utils/franchiseSeasonSummaryStorage.ts:186`, `src/utils/franchiseSeasonSummaryStorage.ts:190`, `src/utils/franchiseSeasonSummaryStorage.ts:194`). |
| Mode 3 -> Mode 2 new season identity | Partial | New schedule/metadata/offseason state are canonical (`src/utils/franchiseInitializer.ts:340`, `src/utils/offseasonStorage.ts:307`) but no durable `NewSeasonHandoff` record exists. |
| Farm/offseason roster movement boundary | Partial/deferred | Prototype mutation guards exist (`src/src_figma/app/utils/franchiseOffseasonGuards.ts:1`), but durable franchise-owned roster movement is Pass 4 work. |
| Pass 2 limitations | Accepted v1 boundary | Pass 2B plan accepts snapshot-derived production aggregation and defers full replay rewrite (`spec-docs/PASS_2B_GAMEPLAY_STAT_PIPELINE_PLAN.md:22`, `spec-docs/PASS_2B_GAMEPLAY_STAT_PIPELINE_PLAN.md:557`). |

## Focused Test Run

Command:

```bash
npm test -- src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx src/src_figma/__tests__/franchiseMode/FinalizeAdvanceFlow.pass1a.test.tsx src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts src/src_figma/__tests__/franchiseMode/useFranchiseData.scope.test.tsx src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx src/utils/tests/playoffStorage.elimination.test.ts
```

Result: 7 test files passed, 38 tests passed.

## Safe to Proceed to Pass 4?

No.

Pass 4 is specifically the farm/roster movement boundary audit, and several roster gaps can wait for that audit. However, Pass 3 still has a season-end correctness blocker: SeasonSummary can create a franchise playoff bracket using League Builder global teams/templates. That is not a Pass 4 roster issue; it is a Mode 2 season-end/playoff input scoping issue that can contaminate playoff results and the later season summary.

## Top Blockers

1. SeasonSummary playoff creation must be moved off League Builder global inputs in franchise context.
2. SeasonSummary should use persisted summary snapshots for historical sections beyond standings/counts, or the UI should clearly remain a current-season fallback until that patch lands.

## Recommended Next Implementation Prompt

Please implement the Pass 3 season-end boundary blockers only.

Scope:
- Do not start Audit Pass 4.
- Do not add roster analyzer work.
- Keep changes minimal and focused on franchise season-end correctness.

Fix:
1. Franchise SeasonSummary playoff creation:
   - Ensure the `/franchise/:franchiseId/season-summary` `START PLAYOFFS` path never seeds a franchise playoff from mutable League Builder globals.
   - Prefer franchise-owned team snapshots/config when `franchiseId` exists, or pass pre-seeded teams derived from persisted summary/franchise standings.
   - Preserve non-franchise/global playoff behavior.

2. SeasonSummary persisted rendering:
   - When a persisted `FranchiseSeasonSummary` exists, use its copied standings and season stat snapshots for leaders/awards/team summary where feasible.
   - Keep live hook-derived values as fallback for old seasons without summaries.
   - Do not implement new awards/fWAR algorithms; use existing stored stat fields only.

Tests:
- Add a component or hook-level test proving SeasonSummary-created franchise playoffs ignore later League Builder team/template mutations.
- Add a SeasonSummary persisted-summary render test proving standings/leaders come from the saved summary when live hooks are empty or drifted.
- Re-run the focused Pass 3 suites listed in this audit.

## Recommended Pass 4 Prompt If Clean

Not provided because Pass 3 is not clean yet. After the blockers above are fixed and reviewed, rerun this Pass 3 closeout and then use the Pass 4 audit prompt from `spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:320`.
