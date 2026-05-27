# Franchise v1 Audit: Mode 1 Handoff and Schedule Policy

Date: 2026-05-27

Scope: repo-first implementation audit for Franchise Mode 1 setup handoff and schedule policy. This is documentation only. No app code or tests were changed.

Primary specs reviewed:

- `spec-docs/MODE_1_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md`
- `spec-docs/MODE_2_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md`
- `spec-docs/FRANCHISE_V1_STABILITY_PRINCIPLES_AND_CUT_LIST.md`
- `spec-docs/MODE_1_LEAGUE_BUILDER_FINAL.md`
- `spec-docs/PARK_FACTOR_SEED_SPEC.md`
- `spec-docs/STADIUM_ANALYTICS_SPEC.md`

Verification command run:

```bash
npm test -- src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts src/src_figma/__tests__/data/parkLookup.test.ts
```

Result: 4 test files passed, 12 tests passed.

## Executive summary

Mode 1 has a useful copy-not-reference foundation for franchise player and team state, but the current handoff is not yet a stable v1 franchise snapshot. It copies players and teams into a per-franchise IndexedDB and can launch Mode 2 from that copied state after League Builder data is cleared, which is the right direction. However, the handoff omits several required v1 fields and baselines: per-team `controlledBy`, canonical franchise type, full rules/playoff snapshot, salary/payroll ledger, explicit standings/stat initialization, farm records, NPC/scouting identity, and schedule policy state.

The largest policy conflict is schedule generation. The v1 specs require no generated franchise schedules, empty schedule startup when the user does not upload one, and user-controlled schedule entry or CSV review. The current franchise initializer generates schedules during franchise creation and new-season creation, and the current tests assert that behavior. This is a direct blocker for v1 stability.

Roster setup is also incomplete for the specified 22 MLB plus 10 FARM expectation. Existing copied player assignments preserve roster status when present, but setup does not validate every team's 22/10 composition, does not initialize farm records, and the visible fantasy draft/prospect draft settings are not implemented by the initializer.

The DH v1 cut appears feasible at the Mode 1 UI level because setup does not currently expose a DH toggle. It is not a full app-wide removal. Regular-season franchise launch defaults `useDH` to false unless config says otherwise, but playoff launch defaults to true, and lower-level GameTracker and roster-building code still contains substantial DH branches.

## Built / partially built / missing / contradictory / dead-code findings

### Built

- Copy-not-reference player/team handoff exists. `initializeFranchise` creates a franchise, calls `deepCopyLeagueToFranchise`, then loads Mode 2 from franchise-scoped team/player stores.
- Per-franchise storage exists for copied `players` and `teams`. Franchise DB names are isolated as `kbl-franchise-{franchiseId}`.
- Active franchise selection exists. `initializeFranchise` writes the created franchise as active via `setActiveFranchise`.
- Canonical season identity helpers exist. `getFranchiseSeasonId` produces `{franchiseId}-season-{seasonNumber}`, and `buildFranchiseSeasonHandoff` centralizes stats and schedule scope identifiers.
- Manual schedule creation exists after startup. The schedule hook and modal can add one game or a short series, delete games, and display an empty schedule state scoped to a franchise.
- Franchise schedule scoping exists. Schedule rows are stored in a shared DB with `franchiseId` and `seasonNumber`; tests cover no bleed between franchises and non-franchise schedules.
- Stadium names are copied on teams, SMB4 park seed lookup exists, and park factors can be derived from seeded dimensions.
- Player fields for salary, traits, personality, chemistry, morale, mojo, fame, reveal tracking, and options exist in the League Builder player model and are copied as part of player snapshots.

### Partially built

- Franchise metadata is too narrow. The initializer stores `leagueName`, `leagueId`, one `controlledTeamId`, one `controlledTeamName`, and `currentSeason`, but does not store canonical `franchiseType`, all human-controlled team ids, AI score-entry policy, phase scopes, or per-team control assignments.
- Team control setup supports selected human teams and a single/multiplayer UI choice, but the data model is still `selectedTeams` plus `mode`, not a canonical solo/couch-coop/custom control contract.
- Rules and playoff settings are saved inside `StoredFranchiseConfig`, but there is no separate copied rules/playoff snapshot store equivalent to copied teams/players. The handoff therefore relies on config shape rather than an explicit immutable franchise rules snapshot.
- Salary data is copied per player, but no franchise salary ledger, payroll baseline, cap ledger, or transaction baseline is initialized.
- Standings baselines are synthesized in `useFranchiseData`, but no explicit empty standings snapshot is created during setup. The current builder also appears to derive standings team ids from selected human teams when selectedTeams is non-empty, which risks omitting AI teams from franchise league structure.
- Stat baselines are implicit. Schedule season metadata is created, and Mode 2 hooks can work from empty/default stats, but no explicit empty stats stores are initialized for teams, players, standings, history, or season summary.
- Roster state is copied through player `leagueAssignments`, and a `TeamRoster` type exists, but the franchise copy does not copy a `teamRosters` store or validate 22 MLB plus 10 FARM per team.
- Farm storage exists in a separate franchise-farm DB, but setup does not populate farm records, prospect draft results, scouting records, or fallback empty farm identities.
- Reporter storage and generation utilities exist, but setup does not initialize one reporter, manager, or scout per team as the Mode 1 final spec describes. Some manager resolution appears lazy in Mode 2 launch paths rather than part of Mode 1 handoff.
- DH is mostly hidden from Mode 1 setup, but not removed from launch paths. Regular-season launch reads `franchiseConfig.season.useDH ?? false`; playoff launch defaults `useDH` to true when playoff data does not specify it.

### Missing

- Empty schedule startup policy is missing from the initializer. New franchises currently start with generated schedule rows.
- CSV schedule upload/review was not found in `src`. No parser, review queue, upload UI, or import tests were found for franchise schedules.
- Manual schedule editing is incomplete. Add and delete exist; row edit, swap teams, move date/game number, and review imported rows were not found.
- Generated schedules are not disabled for franchise creation, new season creation, or season-total repair logic.
- Per-team `controlledBy` is not stamped into copied franchise teams.
- Canonical franchise type is not stored.
- Startup prospect draft is not implemented by the initializer, and the visible fantasy draft settings are not acted on.
- No v1 fallback farm initialization was found for teams that do not have 10 FARM players.
- No explicit handoff store was found for NPC identities, scouting identities, farm identities, or hidden modifier fields.
- No explicit park-factor input snapshot is copied into franchise state. The current system can derive factors later from copied stadium names and seed data, but the audit did not find a persisted franchise park-factor baseline.

### Contradictory

- `MODE_1_LEAGUE_BUILDER_FINAL.md` requires KBL not to auto-generate schedules, allows CSV upload, and requires an empty schedule if no upload is provided. Current code generates schedule rows during `initializeFranchise`.
- `FRANCHISE_V1_STABILITY_PRINCIPLES_AND_CUT_LIST.md` cuts generated schedules from v1. Current initializer comments, implementation, and tests still treat generated schedules as the expected behavior.
- The setup confirmation still summarizes `scheduleType`, which implies generated schedule shape even though v1 schedule policy should be empty/manual/uploaded only.
- Existing tests pass because they assert current generated-schedule behavior. Those tests are useful evidence, but they will need to be rewritten for v1 policy.
- The Mode 1 final spec mentions schedule status values including simulated outcomes, while the v1 stability cut list removes AI simulation from v1. Current schedule storage does not expose `SIMULATED`, which aligns with the stability cut list more than the older full spec.
- DH is intended to be removed or hidden for v1 franchise launch paths, but playoff launch currently defaults DH on.

### Dead-code or prototype findings

- `FranchiseSetup` exposes fantasy draft/prospect draft style settings, but `initializeFranchise` ignores `config.roster.mode` and always deep-copies existing League Builder assignments.
- `generateNewSeasonSchedule` is a franchise schedule generator. Under v1 policy it should not be reachable for franchise new-season startup unless intentionally moved behind a non-v1/development path.
- `deriveSeasonTotalGames` can infer total games from a generated schedule when no existing schedule exists. That repair path conflicts with no-generated-schedules policy.
- `ScheduleContent` has an empty-state "Add Series (3 games)" button that calls `onAddGame` instead of a distinct series action. The actual `AddGameModal` does support series creation, so this looks like incomplete UI wiring rather than missing storage.
- League Builder and GameTracker still contain many DH-capable code paths. These are not dead globally, but they are risky if v1 franchise is meant to hide DH consistently.

## Evidence table

| Area | Repo evidence | Current status | Test evidence |
|---|---|---|---|
| Copy-not-reference handoff | `src/utils/franchiseInitializer.ts:247` calls `deepCopyLeagueToFranchise`; `src/utils/franchisePlayerStorage.ts:270` copies template teams and players into a franchise DB. | Partially built. Copies players and teams, but not full handoff state. | `src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts:203` verifies copied franchise data can launch after League Builder data is cleared. |
| Active franchise metadata | `src/utils/franchiseInitializer.ts:255` updates metadata; `src/utils/franchiseInitializer.ts:291` sets active franchise. | Partially built. Tracks one controlled team and current season, but not canonical franchise type or all controlled teams. | Covered indirectly by initializer tests. |
| Canonical season identity | `src/utils/franchisePersistenceContract.ts:29` defines `getFranchiseSeasonId`; `src/utils/franchisePersistenceContract.ts:56` builds a handoff contract. | Built as utility contract. Not fully used by setup handoff. | No direct test found in targeted run. |
| League/team/player data | `src/utils/franchisePlayerStorage.ts:282` copies teams; `src/utils/franchisePlayerStorage.ts:290` copies assigned players. | Partially built. No controlledBy stamping and no rules/farm/NPC stores copied. | Integration launch test passes from copied state. |
| Stadium and park factors | `src/utils/leagueBuilderStorage.ts:91` includes team `stadium`; `src/data/parkLookup.ts:1` loads seeded parks; `src/engines/parkFactorDeriver.ts:18` derives factors. | Partially built. Stadium names copy; explicit park-factor snapshot not found. | `src/src_figma/__tests__/data/parkLookup.test.ts:9` verifies 23 seeded parks. |
| Rosters and farm records | `src/utils/leagueBuilderStorage.ts:60` has `MLB`/`FARM`; `src/utils/franchiseFarmStorage.ts:7` defines farm records; `src/utils/franchisePlayerStorage.ts:290` copies player assignments. | Partially built. No 22/10 validation, no farm record initialization, no startup prospect draft result. | No targeted test found for 22/10 or farm baseline. |
| Rules/playoff config | `src/types/franchise.ts:15` defines `season`; `src/types/franchise.ts:23` defines `playoffs`; `src/utils/franchiseInitializer.ts:264` saves full config. | Partially built. Config is saved, but no separate immutable rules/playoff snapshot was found. | No targeted rules snapshot test found. |
| Salary/payroll baseline | `src/utils/leagueBuilderStorage.ts:169` has player `salary`; copied player objects preserve fields. | Partially built. No payroll ledger or baseline store found. | No targeted payroll baseline test found. |
| Standings/stat baselines | `src/src_figma/hooks/useFranchiseData.ts:482` synthesizes standings; `src/utils/franchiseInitializer.ts:288` creates season metadata. | Partially built. Standings and stats are implicit; selected-team-only league template is a risk. | No targeted empty-baseline test found. |
| Schedule startup state | `src/utils/franchiseInitializer.ts:272` calls `generateSchedule`; `src/utils/franchiseInitializer.ts:275` writes generated games. | Contradictory. Current startup generates schedule rows. | `src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts:160` expects generated schedule rows. |
| Manual schedule entry | `src/src_figma/hooks/useScheduleData.ts:139` adds games; `src/src_figma/app/components/AddGameModal.tsx:1` implements game/series modal; `src/src_figma/app/components/ScheduleContent.tsx:114` exposes Add Game. | Built for add/delete; edit/review not found. | `src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts:28` covers scoped schedule rows. |
| CSV upload/review | `rg` search for schedule CSV/upload/review terms in `src` returned no matches. | Missing. | No tests found. |
| controlledBy/franchise type | `src/types/franchise.ts:37` stores `selectedTeams` and `mode`; `src/utils/franchiseInitializer.ts:250` chooses only first selected team. | Missing canonical contract. | No targeted test found. |
| Personality/chemistry/fame/traits | `src/utils/leagueBuilderStorage.ts:170` through `src/utils/leagueBuilderStorage.ts:188` includes these player fields. | Built at player-field level and copied with players. Hidden modifiers not found on player model. | No targeted copy assertion found. |
| NPC/scouting/farm identity | `src/utils/reporterAssignment.ts:1` and `src/utils/reporterStorage.ts:1` provide reporter utilities; `src/utils/franchiseFarmStorage.ts:1` provides farm storage. | Missing from setup handoff. Utilities exist but initializer does not create identities. | No targeted setup test found. |
| DH v1 cut | `src/types/franchise.ts:21` has `useDH`; `src/src_figma/app/pages/FranchiseHome.tsx:145` resolves regular-season DH; `src/src_figma/app/pages/FranchiseHome.tsx:817` defaults playoff DH to true; `src/src_figma/lib/franchiseGameTrackerRoster.ts:147` branches readiness by DH. | Partially feasible. Setup hiding is straightforward; full removal is not. Playoff default is contradictory. | No targeted DH v1-hide test found. |

## Blockers for v1 stability

1. Franchise creation and new-season startup generate schedules. This directly violates the v1 schedule policy and must be removed or disabled before v1.
2. Existing initializer tests assert generated schedules. They will keep pulling implementation back toward the wrong policy until rewritten.
3. No empty/manual/uploaded schedule state is represented in setup handoff. Empty startup exists visually in schedule UI, but the initializer never reaches it because it pre-populates games.
4. Required handoff state is incomplete: canonical franchise type, all controlled team ids, per-team `controlledBy`, AI score-entry policy, rules/playoff snapshot, payroll baseline, farm records, NPC/scouting identity, standings/stat baselines, and schedule policy state.
5. `useFranchiseData` appears to derive franchise league structure from selected human teams when `selectedTeams` is non-empty. This risks excluding AI teams from standings and downstream league views.
6. Roster setup does not validate or create the required 22 MLB plus 10 FARM per team baseline.
7. Playoff launch defaults DH to true, which conflicts with a v1 DH hide/remove policy.

## Non-blocking gaps

- OCR schedule extraction is explicitly post-v1 or cut by the stability principles. Its absence is acceptable for v1.
- Rich stadium analytics do not need full persistence for v1 if copied stadium names plus seeded park lookup remain deterministic, but an explicit park-factor snapshot would reduce future drift.
- The existing schedule DB can scope franchise rows correctly. Its shared physical DB is not itself a blocker as long as all franchise APIs consistently require `franchiseId`.
- Reporter/manager/scout systems can be initialized in a narrow v1 form first. Full narrative depth is not required for the handoff to be stable.
- Existing DH-capable lower-level code can remain dormant if franchise setup and launch paths force no-DH consistently for v1.

## Recommended next implementation slices

1. Schedule policy cutover: make franchise startup create zero games unless the user imports reviewed CSV rows; remove generated schedule calls from franchise creation, new-season creation, and season-total repair paths; update tests to assert `generateSchedule` is not called.
2. Handoff metadata and control contract: add canonical franchise type, all human team ids, AI score-entry policy, phase scopes if needed, and `controlledBy` on copied franchise teams.
3. Rules and league snapshot: persist an immutable franchise rules/playoff snapshot and ensure franchise league structure includes all teams, not only selected human teams.
4. Roster and farm baseline: validate 22 MLB plus 10 FARM per team, disable or implement startup draft behavior, and initialize farm records or an explicit empty/fallback farm state.
5. Schedule input/editor: add manual row edit, team swap, date/game-number move, delete, and CSV upload/review/import paths without generated fallback.
6. DH v1 hide: remove setup exposure if any appears, force regular-season and playoff franchise launches to no-DH, and change the playoff default away from true for v1.
7. NPC/scouting identity baseline: initialize reporters, managers, scouts, and any required farm/scouting identity fields during Mode 1 handoff, or explicitly mark fields as deferred outside the v1 contract.

## Focused tests to run or add later

- Initializer schedule policy: new franchise with no upload creates zero `scheduledGames`, does not call `generateSchedule`, and creates season metadata without inferred generated totals.
- New season schedule policy: advancing/creating a season does not generate rows and starts with an empty schedule unless reviewed user schedule rows are provided.
- CSV upload/review: uploaded rows are parsed into a review state, invalid rows are rejected with actionable errors, and accepted rows become scoped franchise schedule rows.
- Copy-not-reference immutability: after franchise creation, edits or deletion in League Builder templates do not change franchise teams, players, rules, stadium names, or baselines.
- Team control contract: solo, couch-coop, and custom setups persist `controlledBy` for every team and expose the correct controlled team set in Mode 2.
- Roster baseline: every team must have exactly 22 MLB and 10 FARM players at handoff, or setup must block/repair with explicit user-visible fallback behavior.
- Farm initialization: startup prospect draft creates expected farm records, and skipped/fallback farm setup creates deterministic empty or default records.
- Standings baseline: standings and league views include all franchise teams, including AI teams, with 0-0 records at startup.
- Salary/payroll baseline: copied salary values produce deterministic team payroll baselines and do not depend on later League Builder edits.
- DH v1 hide: Franchise setup has no DH control, regular-season launch passes `useDH: false`, playoff launch also passes `useDH: false`, and no DH lineup is required.
- NPC identity initialization: each team receives exactly one expected reporter/manager/scout identity when the v1 contract includes them.
- Schedule edit scope: manual add/edit/delete/move/swap operations affect only the current franchise and season.
- Regression run after implementation changes: rerun the targeted command listed at the top of this audit, then broaden to the full franchise and schedule test suite if available.
