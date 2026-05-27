# Audit Pass 4: Farm/Roster Movement Boundary

Date: 2026-05-21

Scope: repo-backed audit only. No code implementation, no roster analyzer design, no Pass 5 audit.

Focused verification run:

```bash
npm test -- src/src_figma/__tests__/franchiseMode/franchiseGameTrackerRoster.test.ts src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx src/utils/tests/transactionStorage.mode2v1.test.ts src/utils/tests/franchiseSaveSlotManifest.test.ts
```

Result: 6 test files passed, 25 tests passed.

## Findings

### 1. GameTracker franchise roster launch can include farm/free-agent assigned players once roster movement exists

- Requirement: Active GameTracker rosters in franchise context should build from franchise-owned roster state and include only active MLB roster players. Pass 4 explicitly asks whether active GameTracker rosters always build from franchise DB state and whether future call-up/send-down boundaries are safe (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:392`, `spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:394`, `spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:402`, `spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:406`). The League Builder player assignment model already distinguishes `rosterStatus: 'MLB' | 'FARM' | 'FREE_AGENT'` (`src/utils/leagueBuilderStorage.ts:60`, `src/utils/leagueBuilderStorage.ts:135`, `src/utils/leagueBuilderStorage.ts:138`).
- Repo evidence: `buildFranchiseGameTrackerRoster` correctly switches to `getAllFranchisePlayers`/`getFranchiseTeam` when `franchiseId` is present (`src/src_figma/app/utils/franchiseGameTrackerRoster.ts:195`, `src/src_figma/app/utils/franchiseGameTrackerRoster.ts:208`), but the franchise player filter checks only `teamId` and `leagueId` (`src/src_figma/app/utils/franchiseGameTrackerRoster.ts:209`, `src/src_figma/app/utils/franchiseGameTrackerRoster.ts:211`). It does not require `assignment.rosterStatus === 'MLB'`.
- Tests proving behavior, if present: Existing tests prove franchise launch reads franchise DB snapshots and survives clearing League Builder (`src/src_figma/__tests__/franchiseMode/franchiseGameTrackerRoster.test.ts:206`, `src/src_figma/__tests__/franchiseMode/franchiseGameTrackerRoster.test.ts:330`, `src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts:228`, `src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts:244`). They do not include a franchise player with `rosterStatus: 'FARM'` or `FREE_AGENT`.
- Status: risky.
- Severity: high.
- Recommendation: Before enabling roster movement, make franchise GameTracker roster launch filter to the active MLB roster. Preserve non-franchise behavior, which already uses `getPlayersByTeam` without a franchise id (`src/src_figma/app/utils/franchiseGameTrackerRoster.ts:214`, `src/src_figma/app/utils/franchiseGameTrackerRoster.ts:226`).
- Smallest safe patch if needed: In the franchise branch of `buildFranchiseGameTrackerRoster`, add `assignment.rosterStatus === 'MLB'` to the assignment predicate. Add a test with same-team MLB, FARM, and FREE_AGENT players proving only MLB players launch.

### 2. Farm storage is global, prototype-level, and not safe as franchise roster-movement storage

- Requirement: Farm state must be owned or safely scoped for franchise play, with no cross-franchise bleed. The Farm spec requires regular-season unlimited farm rosters, 22 MLB / 10 Farm enforcement only at Phase 11, three options per player per season, call-up rating reveal, and farm morale/narrative boundary data (`spec-docs/FARM_SYSTEM_SPEC.md:9`, `spec-docs/FARM_SYSTEM_SPEC.md:24`, `spec-docs/FARM_SYSTEM_SPEC.md:30`, `spec-docs/FARM_SYSTEM_SPEC.md:33`, `spec-docs/FARM_SYSTEM_SPEC.md:60`, `spec-docs/FARM_SYSTEM_SPEC.md:78`, `spec-docs/FARM_SYSTEM_SPEC.md:112`). Pass 4 asks whether farm storage is global, franchise-scoped, copied into the franchise DB, or unresolved (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:398`).
- Repo evidence: Current farm storage opens one global `kbl-farm` database and one `farmPlayers` store (`src/utils/farmStorage.ts:36`, `src/utils/farmStorage.ts:40`, `src/utils/farmStorage.ts:68`). The object store key is only `playerId`, with indexes only by `teamId` and `level` (`src/utils/farmStorage.ts:83`, `src/utils/farmStorage.ts:86`). `FarmPlayer` stores only `playerId`, `playerName`, `teamId`, `level`, `assignedAt`, and optional notes (`src/utils/farmStorage.ts:17`, `src/utils/farmStorage.ts:23`). It has no `franchiseId`, `seasonId`, options tracking, rating reveal flag, contract/rookie-salary state, injury/list state, morale factors, relationships, storylines, or milestones. `callUpPlayer` only deletes the farm row (`src/utils/farmStorage.ts:223`, `src/utils/farmStorage.ts:229`) and does not update the franchise player roster assignment, reveal ratings, or log a transaction. The save-slot manifest classifies farm as `deferred-prototype` with deferred export/delete responsibility (`src/utils/franchiseSaveSlotManifest.ts:621`, `src/utils/franchiseSaveSlotManifest.ts:632`), and the architecture decision still marks farm ownership as TBD (`spec-docs/FRANCHISE_STORAGE_ARCHITECTURE_DECISION.md:368`).
- Tests proving behavior, if present: No farm storage tests were found. The focused manifest test expects farm to be skipped (`src/utils/tests/franchiseSaveSlotManifest.test.ts:320`, `src/utils/tests/franchiseSaveSlotManifest.test.ts:324`). Transaction storage tests cover `call_up` and `send_down` type persistence only, not farm movement semantics (`src/utils/tests/transactionStorage.mode2v1.test.ts:16`, `src/utils/tests/transactionStorage.mode2v1.test.ts:63`).
- Status: missing for franchise movement.
- Severity: high.
- Recommendation: Do not use `kbl-farm` as franchise runtime movement storage. Either move farm/roster movement into per-franchise player records or add a scoped global farm store keyed by `franchiseId + seasonId + teamId + playerId`, consistent with the scoped-global hybrid decision.
- Smallest safe patch if needed: Treat current `farmStorage` as non-franchise/prototype only, add a franchise-owned roster movement adapter that updates copied franchise player `leagueAssignments.rosterStatus`, stores options/reveal fields, and logs canonical transactions. Add no-cross-franchise tests before any UI can call it.

### 3. FinalizeAdvanceFlow shows and mutates local roster movement, but franchise transition reads the franchise DB

- Requirement: Phase 11 must enforce exactly 22 MLB / 10 Farm before the new season begins (`spec-docs/OFFSEASON_SYSTEM_SPEC.md:1604`, `spec-docs/OFFSEASON_SYSTEM_SPEC.md:1608`, `spec-docs/OFFSEASON_SYSTEM_SPEC.md:1612`). Mode 3 -> Mode 2 handoff must include updated teams, players, and rosters after FA, draft, trades, retirements, and farm reconciliation (`spec-docs/SPINE_ARCHITECTURE.md:868`, `spec-docs/SPINE_ARCHITECTURE.md:878`, `spec-docs/SPINE_ARCHITECTURE.md:881`). Pass 4 asks for Phase 11 roster validation/lock and future adapter boundaries without auditing full algorithms (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:351`, `spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:356`, `spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:395`).
- Repo evidence: `FinalizeAdvanceFlow` loads display roster data through `useOffseasonData` (`src/src_figma/app/components/FinalizeAdvanceFlow.tsx:129`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:130`), and `useOffseasonData` reads static/global `playerDatabase` teams and players (`src/src_figma/hooks/useOffseasonData.ts:280`, `src/src_figma/hooks/useOffseasonData.ts:288`, `src/src_figma/hooks/useOffseasonData.ts:293`). The flow derives local MLB/farm rosters by slicing the loaded player list (`src/src_figma/app/components/FinalizeAdvanceFlow.tsx:151`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:153`). Call-up and send-down confirmations update local React state and a local transaction list (`src/src_figma/app/components/FinalizeAdvanceFlow.tsx:195`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:206`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:208`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:224`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:260`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:262`). The 22/10 validation reads that local state (`src/src_figma/app/components/FinalizeAdvanceFlow.tsx:347`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:351`). The actual franchise transition uses `createFranchisePlayerStorageAdapter(activeFranchiseId)` and `executeSeasonTransition` (`src/src_figma/app/components/FinalizeAdvanceFlow.tsx:373`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:375`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:390`; `src/engines/seasonTransitionEngine.ts:97`). Therefore the UI can appear to complete roster reconciliation without making those roster moves durable in franchise storage.
- Tests proving behavior, if present: Existing FinalizeAdvanceFlow tests from earlier passes cover transition failure cleanup, but Pass 4 focused tests do not prove franchise-owned roster movement or Phase 11 durable roster lock. The current focused run did not include a FinalizeAdvanceFlow roster-movement test.
- Status: partial/risky.
- Severity: high.
- Recommendation: Keep franchise FinalizeAdvanceFlow roster movement read-only/blocked until a franchise-owned roster adapter exists, or rewire it to load, validate, persist, and log franchise-owned roster movements before season transition.
- Smallest safe patch if needed: In franchise context, block the local call-up/send-down controls with the same prototype guard pattern used by other offseason flows, or gate season transition on persisted franchise roster validation rather than local UI state.

### 4. Canonical transaction identity exists, but production roster-movement writers are not present

- Requirement: Mode 2 v1 transactions include the eight narrowed transaction types, including `release`, `call_up`, `send_down`, and `injury_list` (`spec-docs/MODE_2_V1_FINAL.md:111`, `spec-docs/MODE_2_V1_FINAL.md:407`, `spec-docs/MODE_2_V1_FINAL.md:409`). Spine transaction events require `franchiseId`, `seasonId`, player/team identity, and timestamp (`spec-docs/SPINE_ARCHITECTURE.md:684`, `spec-docs/SPINE_ARCHITECTURE.md:691`, `spec-docs/SPINE_ARCHITECTURE.md:698`). Pass 4 asks whether call-up/send-down transaction events are logged canonically without mutating League Builder (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:393`).
- Repo evidence: `transactionStorage` defines the narrowed Mode 2 v1 set (`src/utils/transactionStorage.ts:56`, `src/utils/transactionStorage.ts:65`), stores optional `franchiseId`, `seasonId`, `statsScopeId`, and `scheduleGameId` (`src/utils/transactionStorage.ts:142`, `src/utils/transactionStorage.ts:151`), creates scoped indexes including `by_franchise_season` (`src/utils/transactionStorage.ts:250`, `src/utils/transactionStorage.ts:256`), and exposes `logMode2V1Transaction` (`src/utils/transactionStorage.ts:310`, `src/utils/transactionStorage.ts:321`). Convenience production helpers currently cover trade, retirement, FA signing, and draft pick (`src/utils/transactionStorage.ts:580`, `src/utils/transactionStorage.ts:609`, `src/utils/transactionStorage.ts:648`, `src/utils/transactionStorage.ts:670`). A repo search found no production `assignToFarm`, `callUpPlayer`, or `logMode2V1Transaction` call-up/send-down movement path outside storage and tests (`src/utils/farmStorage.ts:99`, `src/utils/farmStorage.ts:223`, `src/utils/transactionStorage.ts:310`).
- Tests proving behavior, if present: `transactionStorage.mode2v1.test.ts` proves `call_up` persists, legacy mapping/rejection works, and franchise-season scoped queries isolate identity (`src/utils/tests/transactionStorage.mode2v1.test.ts:14`, `src/utils/tests/transactionStorage.mode2v1.test.ts:32`, `src/utils/tests/transactionStorage.mode2v1.test.ts:61`). It does not prove actual roster movement writes transactions because those movement writers do not exist.
- Status: mostly complete storage, missing production integration.
- Severity: medium-high.
- Recommendation: Add small canonical helper functions for call-up, send-down, release, and injury-list transactions when implementing the roster adapter. Keep old/global callers backward-compatible by making identity optional at the storage layer but required by franchise movement call sites.
- Smallest safe patch if needed: Add transaction helper tests first, then wire helpers inside a franchise movement adapter after the roster storage decision is made.

### 5. Franchise player snapshots are copy-not-reference, but the shared player contract lacks farm/options/reveal fields needed for movement

- Requirement: Spine player records include shared contract, status, traits, chemistry/visibility-related fields, salary, contract, and ownership across modes (`spec-docs/SPINE_ARCHITECTURE.md:78`, `spec-docs/SPINE_ARCHITECTURE.md:102`, `spec-docs/SPINE_ARCHITECTURE.md:130`). Farm spec adds options tracking, call-up rating reveal, farm ratings/potential, years in minors, morale factors, relationships, storylines, and milestones (`spec-docs/FARM_SYSTEM_SPEC.md:33`, `spec-docs/FARM_SYSTEM_SPEC.md:60`, `spec-docs/FARM_SYSTEM_SPEC.md:78`, `spec-docs/FARM_SYSTEM_SPEC.md:112`).
- Repo evidence: League Builder/franchise player shape has roster assignment, traits, personality, chemistry, morale, fame, salary, and optional contract years (`src/utils/leagueBuilderStorage.ts:135`, `src/utils/leagueBuilderStorage.ts:180`, `src/utils/leagueBuilderStorage.ts:171`, `src/utils/leagueBuilderStorage.ts:173`, `src/utils/leagueBuilderStorage.ts:178`, `src/utils/leagueBuilderStorage.ts:179`). It does not define options used/dates/out-of-options, ratings-revealed/scouted-vs-true rating state, injury/list fields, years-in-minors, farm relationships, farm storylines, or farm milestones (`src/utils/leagueBuilderStorage.ts:142`, `src/utils/leagueBuilderStorage.ts:187`). Franchise setup copies the current player shape into the per-franchise DB (`src/utils/franchisePlayerStorage.ts:270`, `src/utils/franchisePlayerStorage.ts:294`, `src/utils/franchisePlayerStorage.ts:301`, `src/utils/franchisePlayerStorage.ts:307`, `src/utils/franchisePlayerStorage.ts:327`).
- Tests proving behavior, if present: `franchiseInitializer.test.ts` and `franchiseSetupLaunch.integration.test.ts` prove setup creates per-franchise copies and that launch survives later League Builder clearing (`src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts:228`, `src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts:244`). No tests cover options, rating reveal, injuries/list status, or farm morale state.
- Status: partial.
- Severity: medium.
- Recommendation: Reconcile the additive player fields before implementing roster/farm movement. This can be a narrow schema extension, not a roster analyzer design.
- Smallest safe patch if needed: Add optional fields to the copied franchise player model for `optionsUsedBySeason`, `ratingsRevealed`, roster/list status, and farm metadata placeholders; leave old records backward-compatible.

### 6. TeamHub still displays franchise roster/stat rows from global/static offseason data

- Requirement: Visible franchise reads should use franchise-owned team/player snapshots where available, and Pass 4 asks whether any Team Hub or roster UI still reads/writes global/template storage (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:397`). Pass 1 architecture accepted scoped-global storage only when records are explicitly scoped, not when franchise UI shows mutable template/global data as runtime state (`spec-docs/FRANCHISE_STORAGE_ARCHITECTURE_DECISION.md:52`, `spec-docs/FRANCHISE_STORAGE_ARCHITECTURE_DECISION.md:57`).
- Repo evidence: `TeamHubContent` loads `useOffseasonData` at component entry (`src/src_figma/app/components/TeamHubContent.tsx:303`, `src/src_figma/app/components/TeamHubContent.tsx:305`), while `useOffseasonData` reads static/global `playerDatabase` (`src/src_figma/hooks/useOffseasonData.ts:280`, `src/src_figma/hooks/useOffseasonData.ts:293`). TeamHub does load franchise team/players for optimal lineup state (`src/src_figma/app/components/TeamHubContent.tsx:393`, `src/src_figma/app/components/TeamHubContent.tsx:407`, `src/src_figma/app/components/TeamHubContent.tsx:414`), but the visible roster and stats tables still derive from `realPlayers`/`realTeams` (`src/src_figma/app/components/TeamHubContent.tsx:443`, `src/src_figma/app/components/TeamHubContent.tsx:450`, `src/src_figma/app/components/TeamHubContent.tsx:481`, `src/src_figma/app/components/TeamHubContent.tsx:497`). Saving optimal lineup correctly writes the franchise team only (`src/src_figma/app/components/TeamHubContent.tsx:556`, `src/src_figma/app/components/TeamHubContent.tsx:564`).
- Tests proving behavior, if present: Current focused tests cover franchise GameTracker roster builder and offseason mutation guards, not TeamHub visible roster rows.
- Status: partial/risky visible read.
- Severity: medium.
- Recommendation: For franchise routes, derive TeamHub roster/stat display from `franchiseRosterPlayers` and scoped season stats. Keep static/global fallback only for non-franchise or damaged legacy contexts.
- Smallest safe patch if needed: Switch `rosterData`/`statsData` source selection to franchise-owned players when `franchiseId` is present; add a component test with changed League Builder/static data proving the franchise TeamHub display uses the copied snapshot.

### 7. Offseason prototype mutation guardrails are present for major template-mutating flows

- Requirement: Prototype offseason flows should not mutate League Builder/template storage in franchise context (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:358`, `spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:360`, `spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:396`).
- Repo evidence: The central guard blocks when `franchiseId` is present and shows a direct warning message (`src/src_figma/app/utils/franchiseOffseasonGuards.ts:1`, `src/src_figma/app/utils/franchiseOffseasonGuards.ts:5`). Component tests prove FreeAgency, Retirement, RatingsAdjustment, and Draft do not call League Builder/template mutation functions in franchise context (`src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:148`, `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:175`, `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:181`, `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:201`, `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:206`, `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:218`, `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:224`, `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:256`).
- Tests proving behavior, if present: The focused run included `franchiseOffseasonGuards.component.test.tsx` and all four guard tests passed.
- Status: complete for the tested prototype mutation flows.
- Severity: low.
- Recommendation: Keep these guards until franchise-owned offseason roster adapters exist. Add FinalizeAdvanceFlow to the same guard strategy if it remains local-only in franchise context.
- Smallest safe patch if needed: Add a FinalizeAdvanceFlow-specific franchise guard test and block local roster-movement controls pending real adapters.

### 8. Mode 1 -> Mode 2 copy-not-reference setup is solid for current player/team snapshots

- Requirement: Franchise setup must copy initial teams, players, and rosters from Mode 1 into franchise-owned storage and not keep references to League Builder templates (`spec-docs/SPINE_ARCHITECTURE.md:793`, `spec-docs/SPINE_ARCHITECTURE.md:803`, `spec-docs/SPINE_ARCHITECTURE.md:804`, `spec-docs/SPINE_ARCHITECTURE.md:808`). Pass 4 includes copy-not-reference player/team roster data (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:384`, `spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:385`).
- Repo evidence: `franchisePlayerStorage` opens a per-franchise `kbl-franchise-{franchiseId}` DB and creates `players` and `teams` stores (`src/utils/franchisePlayerStorage.ts:116`, `src/utils/franchisePlayerStorage.ts:123`, `src/utils/franchisePlayerStorage.ts:133`, `src/utils/franchisePlayerStorage.ts:137`). `deepCopyLeagueToFranchise` reads League Builder teams/players once, filters assignments to the selected league, clears existing franchise records, and writes player/team copies (`src/utils/franchisePlayerStorage.ts:270`, `src/utils/franchisePlayerStorage.ts:276`, `src/utils/franchisePlayerStorage.ts:301`, `src/utils/franchisePlayerStorage.ts:303`, `src/utils/franchisePlayerStorage.ts:320`, `src/utils/franchisePlayerStorage.ts:327`, `src/utils/franchisePlayerStorage.ts:331`).
- Tests proving behavior, if present: `franchiseSetupLaunch.integration.test.ts` clears League Builder data and still builds launch rosters from the copied franchise DB (`src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts:228`, `src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts:244`). The focused run passed this test.
- Status: mostly complete for current snapshot shape.
- Severity: low.
- Recommendation: Preserve this pattern when adding farm/options fields. Do not reintroduce template writes or runtime references.
- Smallest safe patch if needed: None for current setup; future schema migration should be additive and backward-compatible.

## Contract Coverage Matrix

| Requirement area | Status | Evidence |
|---|---|---|
| Per-franchise player/team copy ownership | Mostly complete | Per-franchise DB stores players/teams (`src/utils/franchisePlayerStorage.ts:116`, `src/utils/franchisePlayerStorage.ts:139`) and setup copies League Builder snapshots (`src/utils/franchisePlayerStorage.ts:270`, `src/utils/franchisePlayerStorage.ts:331`). |
| Roster level/status model | Partial | `leagueAssignments.rosterStatus` exists (`src/utils/leagueBuilderStorage.ts:135`, `src/utils/leagueBuilderStorage.ts:138`), but GameTracker franchise launch does not filter by it (`src/src_figma/app/utils/franchiseGameTrackerRoster.ts:209`, `src/src_figma/app/utils/franchiseGameTrackerRoster.ts:211`). |
| Farm storage ownership | Missing/risky | `kbl-farm.farmPlayers` is global and keyed by `playerId` only (`src/utils/farmStorage.ts:36`, `src/utils/farmStorage.ts:84`); manifest marks it deferred (`src/utils/franchiseSaveSlotManifest.ts:621`, `src/utils/franchiseSaveSlotManifest.ts:632`). |
| Three-options-per-season | Missing | Farm spec defines options tracking (`spec-docs/FARM_SYSTEM_SPEC.md:33`, `spec-docs/FARM_SYSTEM_SPEC.md:44`); repo farm/player model has no options fields (`src/utils/farmStorage.ts:17`, `src/utils/leagueBuilderStorage.ts:142`). |
| Call-up rating reveal | Missing | Spec requires rating reveal (`spec-docs/FARM_SYSTEM_SPEC.md:60`, `spec-docs/FARM_SYSTEM_SPEC.md:68`); repo `callUpPlayer` only deletes a farm row (`src/utils/farmStorage.ts:223`, `src/utils/farmStorage.ts:229`). |
| Canonical transaction identity | Mostly complete storage, missing movement integration | Storage supports identity and indexes (`src/utils/transactionStorage.ts:148`, `src/utils/transactionStorage.ts:256`); production movement writers are absent (`src/utils/farmStorage.ts:223`, `src/utils/transactionStorage.ts:310`). |
| Phase 11 roster validation | Partial/risky | UI validates 22/10 local state (`src/src_figma/app/components/FinalizeAdvanceFlow.tsx:347`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:351`), but transition reads franchise DB (`src/src_figma/app/components/FinalizeAdvanceFlow.tsx:373`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:390`). |
| Prototype offseason guards | Complete for tested flows | Guard helper exists (`src/src_figma/app/utils/franchiseOffseasonGuards.ts:1`, `src/src_figma/app/utils/franchiseOffseasonGuards.ts:5`); tests assert mutation functions are not called (`src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:175`, `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:256`). |
| Future roster analyzer dependencies | Partial data only | Basic player ratings, traits, salary, morale, and assignments exist (`src/utils/leagueBuilderStorage.ts:159`, `src/utils/leagueBuilderStorage.ts:178`, `src/utils/leagueBuilderStorage.ts:180`); options, reveal, injury/list, farm morale/storyline fields are absent (`src/utils/farmStorage.ts:17`, `src/utils/leagueBuilderStorage.ts:142`). |

## Data Ownership Map

| Domain | Current owner/storage | Franchise safety |
|---|---|---|
| Franchise players | `kbl-franchise-{franchiseId}.players` (`src/utils/franchisePlayerStorage.ts:116`, `src/utils/franchisePlayerStorage.ts:134`) | Safe copy owner for current player shape. |
| Franchise teams/lineups | `kbl-franchise-{franchiseId}.teams` (`src/utils/franchisePlayerStorage.ts:137`, `src/utils/franchisePlayerStorage.ts:222`) | Safe copy owner for current team shape and optimal lineup snapshots. |
| Active GameTracker roster launch | Franchise DB when `franchiseId` exists (`src/src_figma/app/utils/franchiseGameTrackerRoster.ts:195`, `src/src_figma/app/utils/franchiseGameTrackerRoster.ts:208`) | Reads correct owner but lacks active-MLB filter. |
| Farm rows | Global `kbl-farm.farmPlayers` (`src/utils/farmStorage.ts:36`, `src/utils/farmStorage.ts:40`) | Unsafe/unresolved for franchise. |
| Offseason prototype roster displays | `useOffseasonData` static/global playerDatabase (`src/src_figma/hooks/useOffseasonData.ts:280`, `src/src_figma/hooks/useOffseasonData.ts:293`) | Not franchise-owned; mutation guards mitigate some flows. |
| Transactions | Global scoped `kbl-transactions.transactions` (`src/utils/transactionStorage.ts:268`, `src/utils/transactionStorage.ts:277`) | Safe for scoped identity; movement integration missing. |
| Save-slot manifest | Manifest entry for farm is deferred (`src/utils/franchiseSaveSlotManifest.ts:621`, `src/utils/franchiseSaveSlotManifest.ts:632`) | Honest classification, but not enough for feature work. |

## Required Tests Before Roster/Farm Movement Implementation

1. `buildFranchiseGameTrackerRoster` excludes same-team `FARM` and `FREE_AGENT` assignment rows in franchise context, while preserving non-franchise behavior.
2. Franchise roster movement adapter updates only copied franchise player records and never League Builder/global player records.
3. Call-up logs `call_up` with `franchiseId`, canonical `seasonId`, `statsScopeId`, `seasonNumber`, source/destination team, and player id.
4. Send-down logs `send_down`, increments options for the canonical franchise season, blocks the fourth option, and leaves state unchanged on failure.
5. First call-up flips rating visibility/reveal state and does not re-trigger reveal on later call-ups.
6. Two franchises with the same team/player ids or same season number cannot see each other's farm/options state.
7. Phase 11 validation uses persisted franchise roster state, not local prototype arrays, and blocks transition when persisted rosters are not exactly 22 MLB / 10 Farm.
8. TeamHub franchise route displays copied franchise roster rows, not static/global `useOffseasonData` rows.
9. FinalizeAdvanceFlow either blocks local prototype movement controls in franchise context or proves durable franchise adapter writes before season transition.

## Future Roster Analyzer Dependencies

This audit does not design or recommend a roster analyzer. If implemented later, it would need reliable inputs that do not yet fully exist:

- Canonical active MLB vs farm roster status per franchise/player/season.
- Options used and option dates by canonical franchise season.
- Rating visibility/reveal state and scouted-vs-true ratings.
- Injury/list availability state.
- Contract, salary, years of service, and rookie salary source.
- Farm morale factors, relationships, storylines, and milestones.
- Canonical transaction history for call-ups, send-downs, releases, injury-list moves, trades, FA signings, draft picks, and retirements.
- Season stats and snapshots keyed by `statsScopeId`/canonical `seasonId`.

## Safe to proceed to Pass 5?

No.

Pass 5 audits derived/flavor systems that should consume canonical events, stats, and roster state (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:457`). Pass 4 found that canonical roster/farm state is not yet safe enough for farm narratives, dynamic designation inputs, fan-morale roster implications, or roster-derived flavor work. A Pass 5 audit would mostly inherit known bad inputs rather than validate derived-system boundaries cleanly.

## Top Blockers

1. Franchise GameTracker launch must filter to active MLB roster assignments.
2. Farm storage must be scoped or moved into franchise-owned state before roster movement is enabled.
3. FinalizeAdvanceFlow franchise roster movement must be blocked or made durable against franchise-owned storage before it can gate new-season transition.
4. Production call-up/send-down/release/injury-list movement writers and canonical transaction helpers are missing.
5. TeamHub franchise roster/stat display still uses static/global offseason data instead of copied franchise players.

## Recommended Next Implementation Prompt

Recommended reasoning: High

Please implement the smallest Pass 4A roster/farm boundary guard patch.

Scope:
- Do not start Pass 5.
- Do not design or implement the roster analyzer.
- Do not implement full farm algorithms, free agency, draft, retirement, or trade algorithms.
- Keep changes narrowly focused on runtime guardrails and tests.

Goals:
1. GameTracker franchise roster launch
   - Update `buildFranchiseGameTrackerRoster` so franchise context includes only players whose matching `leagueAssignments` row has `rosterStatus: "MLB"`.
   - Preserve existing non-franchise/global behavior.
   - Add a focused test with same-team MLB, FARM, and FREE_AGENT players proving only MLB players launch.

2. Franchise farm storage boundary
   - Prevent current global `farmStorage` helpers from being used as franchise runtime movement storage, either by documentation/guard naming or a small explicit franchise guard.
   - Do not migrate data yet.
   - Add tests or manifest assertions proving farm remains deferred/prototype and cannot be mistaken for scoped franchise storage.

3. FinalizeAdvanceFlow franchise guard
   - In franchise context, block or disable local prototype call-up/send-down roster mutations unless/until a franchise-owned adapter exists.
   - Ensure new-season transition is not gated on local prototype roster movement as if it were durable franchise state.
   - Add a component test proving franchise context does not persist or rely on local-only roster movement.

4. TeamHub visible franchise read
   - For franchise routes, prefer copied franchise players for visible roster/stat rows where available.
   - Keep fallback only for non-franchise or clearly damaged legacy contexts.
   - Add a component or utility test proving global/static player data does not override copied franchise roster rows.

Output:
- Findings addressed with file references.
- Tests run and results.
- Any remaining Pass 4B work needed before Pass 5.

