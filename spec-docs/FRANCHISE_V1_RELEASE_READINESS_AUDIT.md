# Franchise v1 Release Readiness Audit

Date: 2026-05-28
Branch audited: `codex/gametracker-live-fixes`
Head audited: `f4217d6 Add franchise score-only results`

This audit is documentation-only. It treats the implementation checkpoints, current source, tests, and primary reconciliation docs as evidence. It does not treat the planned specs as proof that a feature is complete.

## Executive summary

### What is now v1-playable

The narrow Franchise v1 loop is now plausibly playable for a valid existing-roster league:

- Mode 1 can initialize a franchise from League Builder data by deep-copying teams/players into franchise-owned stores, writing a stored handoff contract, writing zero generated schedule rows, and requiring exact v1 roster counts before the handoff succeeds. Evidence: `2c0eae8`, `src/utils/franchiseInitializer.ts`, `src/utils/franchisePlayerStorage.ts`, `src/types/franchise.ts`, `src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts`, `src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts`.
- Manual and CSV schedule setup is durable and franchise-scoped. Evidence: `b3aa3a2`, `src/utils/franchiseScheduleCsv.ts`, `src/utils/scheduleStorage.ts`, `src/src_figma/app/components/ScheduleContent.tsx`, `src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts`.
- Final-score-only regular-season results can complete a scheduled game, update team standings, and avoid player-stat/game-archive side effects. Evidence: `f4217d6`, `completeFranchiseScheduleGameScoreOnly` and `getScoreOnlyCompletedGamesBySeason` in `src/utils/scheduleStorage.ts`, `calculateStandings` in `src/utils/seasonStorage.ts`, `handleScoreOnlySubmit` in `src/src_figma/app/pages/FranchiseHome.tsx`, `src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts`, `src/src_figma/__tests__/schedule/ScheduleContent.test.tsx`.
- GameTracker regular-season completion has schedule completion, archive, stat aggregation, retry/idempotency, and restored-game scope coverage. Evidence: `2cf79f4`, `src/utils/processCompletedGame.ts`, `src/utils/scheduleStorage.ts`, `src/src_figma/__tests__/gameTracker/gameTrackerRestoredFranchiseScope.test.tsx`, `src/utils/tests/processCompletedGame.statBoundary.test.ts`.
- Regular-season and playoff stat truth are now separated. Regular-season games aggregate regular stats; playoff/elimination completions are archived and routed to postseason stores without regular stat contamination. Evidence: `5630ba3`, `shouldAggregateToRegularSeasonStats` in `src/utils/processCompletedGame.ts`, `src/utils/franchiseStatAttribution.ts`, `src/utils/tests/processCompletedGame.statBoundary.test.ts`, `src/utils/tests/franchiseStatAttribution.test.ts`.
- Playoff setup and postseason handoff are franchise-scoped and use stored Mode 1 setup, franchise-owned team snapshots, and standings rather than League Builder globals. Evidence: `3be03cc`, `createNewPlayoff` and `buildFranchisePlayoffTeams` in `src/src_figma/hooks/usePlayoffData.ts`, idempotent start/bracket behavior in `src/utils/playoffStorage.ts`, `src/src_figma/__tests__/franchiseMode/usePlayoffData.franchiseScope.test.tsx`, `src/utils/tests/playoffStorage.elimination.test.ts`.
- Roster desk operations for call-up, send-down, manual trade execution, scoped transaction logging, and transaction history are implemented and tested for regular-season franchise scope. Evidence: `4495ec9`, `ecd92f2`, `sendDownFranchisePlayer` and `callUpFranchisePlayer` in `src/utils/franchiseRosterMovement.ts`, `executeManualFranchiseTrade` in `src/utils/franchiseTradeAdapter.ts`, `logMode2V1Transaction` in `src/utils/transactionStorage.ts`, `src/src_figma/__tests__/franchiseMode/TradeFlow.franchiseTransactions.test.tsx`, `src/utils/tests/franchiseRosterMovement.test.ts`, `src/utils/tests/franchiseTradeAdapter.test.ts`, `src/utils/tests/transactionStorage.mode2v1.test.ts`.
- Salary baseline proof, dynamic designation persistence, WPA/Manager Value boundaries, seeded park identity, adaptive standards, and narrative/archive boundaries exist as v1 spines. Evidence: `41753c6`, `d108dfc`, `src/utils/franchisePlayerStorage.ts`, `src/utils/franchiseDesignations.ts`, `src/utils/franchiseRatingsSalaryAdapter.ts`, `src/utils/almanacNarrativeArchive.ts`, `src/utils/tests/franchiseParkIdentity.test.ts`, `src/utils/tests/franchiseDesignations.test.ts`, `src/utils/tests/franchiseRatingsSalaryAdapter.test.ts`, `src/utils/tests/almanacNarrativeArchive.test.ts`, `src/src_figma/__tests__/gameDetail/GameDetail.test.tsx`.

### What is still not v1-ready

- Full Mode 3/offseason is not release-ready as a complete playable mode. Some adapters are mutation-capable, but the complete phase sequence, user-facing guardrails, and downstream handoff confidence are not proven in this audit.
- Fantasy draft, startup prospect draft, full scouting, OCR schedule import, AI schedule generation, AI trade negotiation, trade AI acceptance, salary-cap enforcement, morale/chemistry effects, relationship engine effects, random narrative events, award ceremony workflows, custom park factor entry, and spray-chart stadium analytics are not proven v1-complete.
- Playoff seeding has a safe failure for unresolved ties after record and run differential, but no audited manual tie-resolution UI path. Evidence: tie rejection in `src/src_figma/__tests__/franchiseMode/usePlayoffData.franchiseScope.test.tsx`.
- Existing UI contains real wired surfaces and also prototype/global/offseason surfaces. Do not assume a Figma-derived component is a release-ready entry point unless it is proven against franchise-owned durable state.

### What should not be expanded before release

Do not expand v1 into AI systems, full offseason economics, morale/relationships, award ceremony, custom stadium analytics, fantasy/startup drafts, or narrative random events before release. The remaining release risk is not lack of feature breadth; it is release-surface gating plus an end-to-end manual smoke through the now-implemented core loop.

## Commit/checkpoint inventory

| Commit | Checkpoint | Release-readiness effect |
| --- | --- | --- |
| `bbf15e4` | Franchise v1 baseline and schedule policy cutover | Established empty manual/user-supplied schedule policy and initial Franchise v1 stabilization baseline. |
| `2cf79f4` | Franchise GameTracker lifecycle completion | Hardened launch/resume/completion/archive/idempotency boundaries for franchise GameTracker. |
| `4495ec9` | Roster farm and manual trade spine | Added durable farm records, call-up/send-down mechanics, and manual trade spine. |
| `41753c6` | Thread 4 value spine | Added salary/designation/WPA/stadium/adaptive-value foundations. |
| `d108dfc` | Narrative history boundary | Added narrative/archive boundaries without treating morale, chemistry, or random narrative systems as complete. |
| `b831e90` | Thread integration stabilization | Integrated prior thread work across franchise surfaces. |
| `b3aa3a2` | Manual schedule CSV import | Added CSV validation/import path for franchise schedule rows. |
| `ecd92f2` | Regular-season transaction desk | Added regular-season call-up/send-down/manual-trade UI wiring and transaction history filtering. |
| `667a2e8` | Threads 1-7 audit checkpoint | Created the pre-latest-checkpoint stabilization/gap audit. |
| `5630ba3` | Franchise stat truth boundary | Added regular vs playoff aggregation boundary and player-team stat stint projection. |
| `2c0eae8` | Mode 1 handoff contract | Added stored `FranchiseModeHandoffContract`, control metadata, snapshot/proof fields, and exact roster validation. |
| `3be03cc` | Playoff handoff | Hardened franchise playoff setup against global fallback and stored Mode 1 setup drift. |
| `f4217d6` | Score-only results | Added final-score-only schedule completion and standings integration without player stat side effects. |

## Mode 1 readiness

| Area | Readiness | Evidence | Remaining blockers/unknowns |
| --- | --- | --- | --- |
| Setup/handoff | Mostly v1-ready for existing-roster franchises with valid roster counts. | `initializeFranchise` in `src/utils/franchiseInitializer.ts`; `StoredFranchiseConfig` and `FranchiseModeHandoffContract` in `src/types/franchise.ts`; `src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts`; `src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts`. | UX for explaining failed roster validation was not manually smoke-tested. Fantasy draft and startup prospect draft are not proven ready. |
| Copy-not-reference | Mostly v1-ready. | `deepCopyLeagueToFranchise` in `src/utils/franchisePlayerStorage.ts`; integration test clears League Builder data and still builds franchise GameTracker rosters in `src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts`. | Manual browser smoke after deleting/changing source templates is still recommended. |
| Franchise type and control | Mostly v1-ready. | `FranchiseType`, `FranchiseTeamControlSnapshot`, `controlledTeams`, and `controlledBy` in `src/types/franchise.ts`; `deriveFranchiseType` and `buildTeamControlSnapshot` in `src/utils/franchiseInitializer.ts`; tests assert solo human/AI control and copied-team `controlledBy`. | Couch co-op/custom selection UX was not separately audited beyond the stored type/control model. |
| Rules snapshot | Mostly v1-ready as persisted metadata. | `FranchiseRulesSnapshot` in `src/types/franchise.ts`; `buildRulesSnapshot` in `src/utils/franchiseInitializer.ts`; test assertions in `franchiseInitializer.test.ts` and `franchiseSetupLaunch.integration.test.ts`. | Unknown whether every UI rule control maps cleanly into the snapshot in all setup paths. |
| Playoff setup snapshot | Mostly v1-ready. | `FranchisePlayoffSetupSnapshot` in `src/types/franchise.ts`; stored config assertions in setup tests; `usePlayoffData.createNewPlayoff` uses `getFranchiseConfig`. | Manual tie-resolution UX is not proven. Non-standard formats beyond tested stored setup are unknown. |
| Season length/innings | Mostly v1-ready. | `FranchiseSeasonLengthMetadata` in `src/types/franchise.ts`; `buildSeasonLengthMetadata` in `src/utils/franchiseInitializer.ts`; playoff hook uses stored innings. | Unknown coverage for unusual innings/season-length combinations in manual smoke. |
| Schedule policy | V1-ready for empty/manual/CSV policy. | `schedulePolicy` stored on config; generated schedule is not called in setup tests; `initializeEmptyFranchiseSeasonSchedule` writes zero rows; `MODE_1_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md`. | OCR/import-from-image and generated schedules remain deferred. |
| CSV/manual schedule | Mostly v1-ready. | `src/utils/franchiseScheduleCsv.ts`; `ScheduleContent` CSV review/import controls; `src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts`; `src/src_figma/__tests__/schedule/ScheduleContent.test.tsx`. | Full end-to-end browser import smoke with a realistic CSV file is still recommended. |
| No-DH franchise policy | Mostly v1-ready as metadata and playoff handoff. | `rulesSnapshot.useDH` in stored config; `usePlayoffData` test asserts stored `useDH: false` reaches playoff config. | GameTracker roster/lineup behavior under no-DH franchise policy was not exhaustively audited here. |
| Stadium identity/park factors | Mostly v1-ready as seeded identity/proof, not full analytics. | `buildTeamStadiumSnapshots` in `src/utils/franchisePlayerStorage.ts`; `src/utils/tests/franchiseParkIdentity.test.ts`; `src/src_figma/__tests__/data/parkLookup.test.ts`. | Custom park factor input and spray-chart stadium analytics are not v1-ready. |
| Salary baseline | Mostly v1-ready as baseline proof. | `buildSalaryBaselineProof` in `src/utils/franchisePlayerStorage.ts`; stored `salaryBaseline` assertions in setup tests. | Full salary economy/cap/contract gameplay is deferred. |
| Farm/prospect/scouting/personality handoff | Farm handoff is mostly v1-ready; prospect/scouting/personality effects are not proven v1-ready. | `validateV1RosterHandoff` and farm record creation/carryover in `src/utils/franchisePlayerStorage.ts`; `src/utils/tests/franchiseRosterMovement.test.ts`; setup integration test expects 10 farm records per team. | Prospect generation/startup draft/scouting UI/effects are not proven complete. Personality exists in data/specs but downstream gameplay effects are not release-ready. |

## Mode 2 readiness

| Area | Readiness | Evidence | Remaining blockers/unknowns |
| --- | --- | --- | --- |
| Schedule/manual/CSV/score-only paths | Mostly v1-ready. | `completeFranchiseScheduleGameScoreOnly`, `validateFinalScore`, and `getScoreOnlyCompletedGamesBySeason` in `src/utils/scheduleStorage.ts`; `handleCompleteFranchiseScoreOnly` in `src/src_figma/hooks/useScheduleData.ts`; score-only modal in `src/src_figma/app/pages/FranchiseHome.tsx`; related schedule tests. | Score-only edits/reopen are intentionally blocked; if users need corrections, a separate correction workflow is not proven. |
| GameTracker path | Mostly v1-ready. | `processCompletedGame` lifecycle code; restored franchise scope tests; completion integration in `src/utils/scheduleStorage.ts`; `2cf79f4`. | Manual full-game smoke is still needed because automated tests do not replace human route/navigation verification. |
| Regular vs playoff stat truth | Mostly v1-ready. | `shouldAggregateToRegularSeasonStats` in `src/utils/processCompletedGame.ts`; `src/utils/franchiseStatAttribution.ts`; `src/utils/tests/processCompletedGame.statBoundary.test.ts`; `src/utils/tests/franchiseStatAttribution.test.ts`. | UI consumers for explicit player-team stint projection are not broadly proven. |
| Standings | Mostly v1-ready for regular-season completed archives plus score-only rows. | `calculateStandings` and `isRegularSeasonCompletedGame` in `src/utils/seasonStorage.ts`; score-only standings tests in `src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts`. | Advanced tiebreakers and user-visible tie resolution are not complete. |
| Playoffs | Mostly v1-ready for franchise-owned setup, seeding, reuse of existing playoff, and playoff stat boundary. | `createNewPlayoff` and `buildFranchisePlayoffTeams` in `src/src_figma/hooks/usePlayoffData.ts`; `src/src_figma/__tests__/franchiseMode/usePlayoffData.franchiseScope.test.tsx`; `src/utils/tests/playoffStorage.elimination.test.ts`; `src/src_figma/__tests__/gameTracker/gameTrackerRestoredFranchiseScope.test.tsx`. | Manual tie-resolution UI is not proven. Full browser smoke through postseason creation, one playoff game, and playoff completion is still needed. |
| Transactions/trades/call-up/send-down | Mostly v1-ready for user-driven regular-season moves. | `sendDownFranchisePlayer`, `callUpFranchisePlayer`, `executeManualFranchiseTrade`, `logMode2V1Transaction`; `TradeFlow.franchiseTransactions.test.tsx`; `franchiseRosterMovement.test.ts`; `franchiseTradeAdapter.test.ts`. | Transaction undo/compensating rollback UI is not proven, although storage-level rollback paths are tested. |
| Current roster state into GameTracker | Mostly v1-ready. | `buildFranchiseGameTrackerRoster` usage in setup integration; roster movement tests; `Phase 11 roster lock` tests in `franchiseRosterMovement.test.ts`. | Manual smoke after a trade plus launch of the next scheduled game remains a release confidence requirement. |
| Salary/designations/WPA/stadium/adaptive standards | Spine-ready, not full feature-complete systems. | `franchiseRatingsSalaryAdapter`, `franchiseDesignations`, `franchisePlayerStorage`, `GameDetail` WPA/Manager Value tests, `seasonAggregator.adaptiveStandards.test.ts`, `franchiseParkIdentity.test.ts`. | Awards/watchlists, full salary economy, and custom stadium analytics remain deferred/unknown. |
| Narrative/history boundaries | Mostly v1-ready as archive projection and boundary. | `src/utils/almanacNarrativeArchive.ts`; `src/utils/tests/almanacNarrativeArchive.test.ts`; `src/src_figma/app/pages/ManagerAlmanac.tsx`; `src/src_figma/app/pages/AlmanacHome.tsx`. | Reporter story generation continuity, morale, chemistry, relationships, random events, and milestone surfaces are not proven v1-complete. |

## Mode 3/offseason readiness

### Safe/read-only

- Season summary and historical/archive surfaces are safest when treated as read-only release surfaces. Evidence: season summary persistence in `src/utils/trackerDb.ts`, transition tests in `src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx`, `src/utils/almanacNarrativeArchive.ts`, `src/src_figma/app/pages/ManagerAlmanac.tsx`, and `src/src_figma/app/pages/AlmanacHome.tsx`.
- Retirement ceremony preview/read-only behavior exists. Evidence: `src/utils/tests/franchiseRetirementCeremony.test.ts` asserts no storage writers or transaction modules are imported.

### Mutation-capable

- Ratings/salary recalculation can mutate franchise-owned players with dry-run, phase validation, warnings, and rollback behavior. Evidence: `runFranchiseRatingsSalaryRecalculation` in `src/utils/franchiseRatingsSalaryAdapter.ts`; `src/utils/tests/franchiseRatingsSalaryAdapter.test.ts`.
- Retirement adapter can apply selected retirements and log canonical transactions with rollback coverage. Evidence: `src/utils/franchiseRetirementAdapter.ts`; `src/utils/tests/franchiseRetirementAdapter.test.ts`.
- Free agency adapter exists in source and should be treated as mutation-capable but not release-ready without targeted audit. Evidence found: `src/utils/franchiseFreeAgencyAdapter.ts`; UI prototype/global signals in `src/src_figma/app/components/FreeAgencyFlow.tsx`.

### Should stay deferred for v1

- Full offseason phase hub/sequence should stay deferred unless separately audited. Evidence: `src/archived-pages/OffseasonHub.tsx` lists broad phases, while current release evidence does not prove those phases as a coherent shipped workflow.
- Awards ceremony workflow should stay deferred. Evidence: `src/archived-pages/AwardsCeremonyHub.tsx` is archived; POG/WPA award calculation tests exist, but award ceremony release flow is not proven.
- Full draft/free-agency/retirement/trade-period/spring-training/schedule-generation offseason game loop should stay deferred. Existing pieces are useful, but this audit did not find enough durable UI-path plus downstream-consumer proof to call Mode 3 v1-ready.

## Risk register

### Blockers to release confidence

1. End-to-end manual smoke is not yet recorded in this audit. Automated tests pass, but release confidence still needs a browser smoke from clean League Builder data through franchise creation, manual/CSV schedule, score-only completion, GameTracker completion, roster movement, playoff creation, playoff game completion, and season summary/offseason entry.
2. Unsupported or prototype surfaces need release gating. Evidence includes archived offseason/awards pages in `src/archived-pages`, broad prototype economics in `src/src_figma/app/components/FreeAgencyFlow.tsx`, and the prior audit `spec-docs/FRANCHISE_V1_THREADS_1_7_STABILIZATION_AND_GAP_AUDIT.md`.
3. Manual playoff tie resolution is not proven. Current behavior fails safely when record/run differential cannot resolve ties, but a user-facing resolution path is not audited. Evidence: `src/src_figma/__tests__/franchiseMode/usePlayoffData.franchiseScope.test.tsx`.

### High-risk non-blockers

- Score-only result corrections are not supported by the audited path. This is acceptable if final-score-only is documented as final.
- Transaction rollback logic exists at storage/adapter level, but user-facing undo/history repair is not proven.
- Player-team stat stints exist as projection, but broad UI consumption is unknown.
- Custom stadium park factors and spray-chart stadium analytics remain useful future work, not a release prerequisite for the narrow v1 loop.
- Salary/designation/WPA/adaptive systems should remain spines, not gameplay expansion points, until their user-facing surfaces and downstream consumers are separately audited.

### Test/build noise

- Full tests passed, but the command emits substantial known noise: React `act(...)` warnings in UI tests, intentional sync failure-path stderr, GameTracker debug stdout, IndexedDB warning output in reporter hydration tests, and React style shorthand warnings in modal tests. This is noise, not command failure, as of this run.
- Build passed with Vite large chunk warnings. Largest reported chunks include `FranchiseHome`, `GameTracker`, and main `index`; this is a release-performance concern but not a compile blocker.

### Known excluded dirty files

Ignored as pre-existing/excluded unless explicitly relevant:

- `package.json`
- `supabase/.temp/cli-latest`
- `scripts/exportSmb4GeneratedRosterReport.mjs`
- `scripts/exportSmb4TeamProfiles.mjs`
- `spec-docs/data/smb4_standard_team_profiles.csv`
- `spec-docs/data/smb4_standard_team_profiles.json`
- `spec-docs/generated/`

## Recommended next implementation slice

Pick exactly one: **V1 release gate and end-to-end smoke stabilization**.

Rationale: the latest checkpoints moved the primary risk away from core storage/stat truth and toward release-surface safety. The narrow v1 loop has passing focused tests, full tests, and build. Expanding features now would add uncertainty. The next implementation slice should make the shipped path hard to leave accidentally, then prove that path with one manual/browser smoke and targeted tests.

Exact next prompt:

```text
Please implement a Franchise v1 release gate and end-to-end smoke stabilization slice.

Scope:
- Do not add new feature systems.
- Do not expand AI, fantasy draft, full offseason, morale, relationships, awards ceremony, custom park factors, or salary economy.
- Guard or clearly disable unsupported/prototype Franchise v1 surfaces that are reachable from the release path.
- Preserve already-wired v1 surfaces: Mode 1 existing-roster handoff, manual/CSV schedule, score-only results, GameTracker launch/resume/completion, regular-season transactions, playoffs, and read-only history/summary surfaces.
- Add or update only focused tests needed to prove the release gates and the smoke-critical path.

Required audit before edits:
- Identify every route/button/tab reachable from FranchiseHome and FranchiseSetup that can enter unready Mode 3/offseason, fantasy/startup draft, AI/generator, custom park factor, award ceremony, or prototype/global transaction surfaces.
- Classify each as keep, guard/read-only, or hide/defer, citing file/component names.

Implementation:
- Apply the smallest code changes to prevent accidental entry into unready surfaces.
- Keep user-facing copy factual and brief.
- Do not remove reusable components unless unused and clearly prototype-only.

Verification:
- Run focused Franchise v1 tests for setup handoff, schedule CSV/score-only, GameTracker lifecycle/stat truth, playoff handoff, and transaction desk.
- Run `npm test -- --reporter=dot`.
- Run `npm run build`.
- Provide a manual smoke checklist and note which items were manually exercised.
```

## Verification plan

### Focused test suites

Use this set before or after any next implementation slice:

```bash
npm test -- --reporter=dot src/utils/tests/processCompletedGame.statBoundary.test.ts src/utils/tests/franchiseStatAttribution.test.ts src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts src/src_figma/__tests__/schedule/ScheduleContent.test.tsx src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts src/src_figma/__tests__/franchiseMode/usePlayoffData.franchiseScope.test.tsx src/src_figma/__tests__/franchiseMode/TradeFlow.franchiseTransactions.test.tsx src/utils/tests/franchiseRosterMovement.test.ts src/utils/tests/franchiseTradeAdapter.test.ts src/utils/tests/transactionStorage.mode2v1.test.ts src/utils/tests/almanacNarrativeArchive.test.ts src/utils/tests/franchiseRatingsSalaryAdapter.test.ts src/utils/tests/franchiseDesignations.test.ts src/utils/tests/franchiseDesignationsPersistence.test.ts src/utils/tests/franchiseParkIdentity.test.ts
```

### Full test command

```bash
npm test -- --reporter=dot
```

### Build command

```bash
npm run build
```

### Manual smoke checklist

- Create or choose a League Builder league with exact 22 MLB and 10 FARM players per team.
- Start a Franchise v1 save from existing rosters and verify stored config/handoff metadata is visible or inspectable.
- Confirm initial schedule is empty and generated schedule rows are not created.
- Add one manual scheduled game.
- Import a small CSV schedule file and verify rows are scoped to the active franchise/season.
- Enter one final-score-only result and verify standings update while player stats/game archive do not.
- Launch a scheduled regular-season game into GameTracker from current franchise roster state.
- Save/load/resume the in-progress game.
- Complete the GameTracker game and verify schedule row, archive, regular stats, and standings update exactly once.
- Execute a call-up/send-down and a manual trade, then verify transaction history is filtered to the active franchise season.
- Launch a later game after movement and verify moved player identities/rosters are current.
- Create playoffs from final standings and stored Mode 1 playoff setup.
- Complete a playoff GameTracker game and verify playoff stats/archive are written without regular-season stat contamination.
- Enter season summary/offseason boundary and verify unsupported Mode 3 mutation surfaces are guarded or clearly deferred.

## Verification results for this audit

| Command | Result | Notes |
| --- | --- | --- |
| `git status --short` | Ran | Only known excluded dirty files were present before this doc was created: `package.json`, `supabase/.temp/cli-latest`, SMB4 export scripts/data, and `spec-docs/generated/`. |
| `git log --oneline -20` | Ran | Confirmed latest checkpoints through `f4217d6 Add franchise score-only results`, with preceding handoff/stat/playoff commits present. |
| Focused Franchise v1 test set | Passed | 16 test files passed, 127 tests passed. One expected safe-failure warning was emitted by `usePlayoffData` missing-snapshots test. |
| `npm test -- --reporter=dot` | Passed | 326 test files passed, 6642 tests passed. Existing noisy stderr/stdout noted above. |
| `npm run build` | Passed | `tsc -b` and Vite build succeeded. Vite emitted large chunk warnings. |
