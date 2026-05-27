# Franchise Mode Implementation Roadmap

Status: Waves 1-3 complete.  
Scope: Mode 2 v1 franchise mode. Roster analyzer/recommendation engine is future work and is not yet implemented.

Source context:
- `spec-docs/FRANCHISE_MODE_REPO_AUDIT.md`
- `spec-docs/MODE_2_V1_FINAL.md`
- `spec-docs/MODE_2_SECTION_MAP.md`

## Completed Waves

### Wave 1: Persistence Foundation

Status: Complete.

Delivered:
- Canonical franchise persistence contract: `src/utils/franchisePersistenceContract.ts`.
- Fresh setup copies League Builder teams/players into the franchise DB: `src/utils/franchiseInitializer.ts:270-289`, `src/utils/franchisePlayerStorage.ts:270`.
- Canonical season metadata is created at setup and new-season schedule generation: `src/utils/franchiseInitializer.ts:88-130`, `src/utils/franchiseInitializer.ts:289`, `src/utils/franchiseInitializer.ts:351`.
- Schedule rows and hooks support franchise scoping: `src/utils/scheduleStorage.ts:529-649`, `src/src_figma/hooks/useScheduleData.ts:80-119`.
- Completed/current games preserve `franchiseId` and `scheduleGameId`: `src/utils/gameStorage.ts:236-239`, `src/utils/gameStorage.ts:705-763`.
- Legacy repair is conservative and only backfills empty/missing core franchise DB stores: `src/utils/franchiseInitializer.ts:169-219`.
- Setup rollback cleans up partial franchise metadata, season metadata, and franchise DB: `src/utils/franchiseInitializer.ts:146-166`.
- Mode 2 v1 synthetic simulation is disabled/guarded: `src/src_figma/app/pages/FranchiseHome.tsx:105`, `src/src_figma/app/pages/FranchiseHome.tsx:920`, `src/src_figma/app/pages/FranchiseHome.tsx:3260`, `src/src_figma/app/pages/FranchiseHome.tsx:3593-3612`.

Tests:
- `src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts`
- `src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts`
- `src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts`
- `src/src_figma/__tests__/persistence/completedGameIdentity.test.ts`

### Wave 2: Mode 2 v1 Surface Cleanup

Status: Complete.

Delivered:
- Franchise regular-season action surface now exposes v1-supported actions and keeps sim hidden/guarded.
- Transaction surface narrowed to the canonical eight Mode 2 v1 transaction types: `src/utils/transactionStorage.ts:56-67`.
- Legacy transaction mapping is explicit and unsupported broad categories are rejected in v1 writes: `src/utils/transactionStorage.ts:121-136`, `src/utils/transactionStorage.ts:280-295`.
- GameTracker correction policy requires version bump and `editHistory` for result changes: `src/utils/eventLog.ts:971-999`, `src/utils/eventLog.ts:1235-1299`.

Tests:
- `src/utils/tests/transactionStorage.mode2v1.test.ts`
- `src/src_figma/__tests__/gameTracker/atBatOutcomeImmutability.test.ts`
- `src/src_figma/__tests__/gameTracker/betweenPlayEventVersioning.test.ts`
- `src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx`

Important clarification:
- GameTracker is not strict append-only for corrections. The current v1 policy is audited mutation: a result change must include a version bump and edit history. That should be preserved or explicitly revised in the next spec pass.

### Wave 3: Franchise Season Correctness

Status: Complete.

Delivered:
- Franchise season data scopes through canonical `{franchiseId}-season-{n}` IDs: `src/utils/franchisePersistenceContract.ts:18-36`, `src/src_figma/hooks/useFranchiseData.ts:239`.
- FranchiseHome and SeasonSummary derive current season from franchise metadata instead of global current season: `src/src_figma/app/utils/franchiseRouteSeason.ts:22-23`, `src/src_figma/app/pages/FranchiseHome.tsx:177-236`, `src/src_figma/app/pages/SeasonSummary.tsx:55-81`.
- Playoff hooks/storage boundaries carry franchise identity: `src/src_figma/hooks/usePlayoffData.ts:105-159`, `src/src_figma/hooks/usePlayoffData.ts:257-365`, `src/src_figma/hooks/usePlayoffData.ts:456-463`.
- Offseason state is keyed by canonical season ID and can carry franchise identity: `src/utils/offseasonStorage.ts:56-58`, `src/utils/offseasonStorage.ts:301-319`, `src/src_figma/hooks/useOffseasonState.ts:116-128`.
- GameTracker identity is centralized and restored from navigation state, restored context, GameState, then fallback: `src/src_figma/app/utils/gameTrackerIdentity.ts:4-117`, `src/src_figma/app/pages/GameTracker.tsx:1457-1477`.
- `useGameState` persists/restores franchise identity through initial state, snapshot restore, durable-log/header restore, archive/end-game processing, and playoff context: `src/src_figma/hooks/useGameState.ts:776-785`, `src/src_figma/hooks/useGameState.ts:4108-4230`, `src/src_figma/hooks/useGameState.ts:4659-4677`, `src/src_figma/hooks/useGameState.ts:5035-5049`, `src/src_figma/hooks/useGameState.ts:5624-5638`, `src/src_figma/hooks/useGameState.ts:10887-11093`.
- GameTracker uses restored `scheduleGameId` for schedule completion and restored team IDs for winner/loser identity on direct-entry restored games: `src/src_figma/app/pages/GameTracker.tsx:1250-1457`, `src/src_figma/app/pages/GameTracker.tsx:11317-11402`.
- Franchise offseason prototype mutations are blocked from touching League Builder/template storage: `src/src_figma/app/utils/franchiseOffseasonGuards.ts:1-12`, `src/src_figma/app/components/FreeAgencyFlow.tsx:392-393`, `src/src_figma/app/components/RetirementFlow.tsx:220-221`, `src/src_figma/app/components/RatingsAdjustmentFlow.tsx:397-398`, `src/src_figma/app/components/DraftFlow.tsx:437-438`.

Tests:
- `src/src_figma/__tests__/franchiseMode/franchiseSeasonScoping.wave3.test.ts`
- `src/src_figma/__tests__/franchiseMode/franchiseWave3Blockers.test.ts`
- `src/src_figma/__tests__/gameTracker/gameTrackerRestoredFranchiseScope.test.tsx`
- `src/src_figma/__tests__/gameTracker/GameTrackerLaunchState.test.tsx`
- `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`

## Remaining Risks

1. Full franchise-owned offseason mutation adapters are not implemented.
   - Current franchise offseason behavior is safe by blocking prototype mutations, not complete.
   - Needed adapters: ratings, retirements, free agency, draft, trades, farm reconciliation, chemistry, spring training.

2. Legacy global markers remain.
   - `FranchiseHome` still writes `kbl-current-season` for compatibility/sync (`src/src_figma/app/pages/FranchiseHome.tsx:149-151`).
   - `franchiseRouteSeason` still reads the legacy marker as fallback (`src/src_figma/app/utils/franchiseRouteSeason.ts:4-17`).

3. Broad full-suite status needs a dedicated pass.
   - Focused Wave 1-3 suites and `npm run build` were green after Wave 3.
   - A prior review noted an unrelated `managerWpaGameState.test.ts` precision mismatch; treat that separately from franchise blockers unless it reproduces as a current failure.

4. GameTracker correction policy is audited mutation.
   - This is stronger than silent mutation but different from strict append-only immutability.
   - Future spec wording should decide whether audited mutation remains acceptable.

5. Synthetic sim code remains present but disabled.
   - `src/utils/syntheticGameFactory.ts` and sim handlers/imports still exist.
   - Mode 2 v1 guards keep those paths unavailable.

6. Export/import is not yet a full franchise manifest.
   - The next persistence hardening pass should include schedule, event log, completed games, season stats, playoffs, offseason state, and transactions for one franchise.

7. Roster analyzer/recommendation engine is future work.
   - It should consume the per-franchise DB and emit read-only recommendations first.
   - It should not mutate rosters until franchise-owned offseason adapters exist.

## Recommended Next Paths

### Path 1: Test Hardening

Why it matters: the focused Wave suites are good, but this codebase has many intersecting systems and a broad full-suite pass may reveal unrelated fragility before Wave 4.

Suggested order:
1. Run the full test suite and record failures by domain.
2. Separate unrelated precision/UI failures from franchise blockers.
3. Add tests for franchise export/import, delete cleanup, old-save repair, direct-entry playoff restore, and post-game return navigation.
4. Add browser-level smoke coverage for setup -> hub -> GameTracker -> post-game -> hub.

Likely files:
- `src/src_figma/__tests__/franchiseMode/**`
- `src/src_figma/__tests__/gameTracker/**`
- `src/utils/tests/**`
- `src/src_figma/__tests__/persistence/**`

### Path 2: Remaining Mode 2 Spec Completion

Why it matters: Waves 1-3 stabilized identity and source-of-truth boundaries, but several Mode 2 outputs are still partial.

Suggested order:
1. Build a finalization manifest around `buildFranchiseSeasonHandoff`.
2. Scope news/narrative history and award inputs to franchise season artifacts.
3. Stabilize milestone/fame/fan morale season-summary inputs.
4. Remove or contain legacy global season markers.

Likely files:
- `src/utils/franchisePersistenceContract.ts`
- `src/src_figma/app/pages/SeasonSummary.tsx`
- `src/src_figma/app/pages/FranchiseHome.tsx`
- `src/utils/seasonStorage.ts`
- `src/utils/gameStorage.ts`
- `src/utils/gameStoriesStorage.ts`
- `src/engines/fanMoraleEngine.ts`

### Path 3: Roster Analyzer Integration Planning

Why it matters: the roster analyzer should plug into the now-canonical franchise-owned roster state, not the mutable League Builder template.

Suggested order:
1. Define a read-only analyzer contract over `franchisePlayerStorage`.
2. Add recommendation payload types for roster holes, launch readiness, lineup/bullpen, farm pressure, and offseason needs.
3. Add non-mutating Team Hub and offseason preview UI.
4. Only later wire recommendations into mutation flows after adapters exist.

Likely files:
- `src/utils/franchisePlayerStorage.ts`
- `src/src_figma/app/components/TeamHubContent.tsx`
- `src/src_figma/app/utils/franchiseGameTrackerRoster.ts`
- future analyzer utility/module under `src/engines` or `src/utils`

### Path 4: Franchise-Owned Offseason Adapters

Why it matters: this is the largest remaining functional gap. Current guards protect data integrity, but users cannot yet run real franchise offseason mutations.

Suggested order:
1. Define adapter interfaces for player/team mutations in the franchise DB.
2. Implement ratings and retirements first because they primarily mutate player state.
3. Implement draft/free agency next because they change rosters and require farm/assignment semantics.
4. Implement trades, farm reconciliation, chemistry, and spring training after roster movement primitives are stable.
5. Replace guard-only behavior one flow at a time.

Likely files:
- `src/src_figma/app/components/RatingsAdjustmentFlow.tsx`
- `src/src_figma/app/components/RetirementFlow.tsx`
- `src/src_figma/app/components/FreeAgencyFlow.tsx`
- `src/src_figma/app/components/DraftFlow.tsx`
- `src/src_figma/hooks/useOffseasonState.ts`
- `src/utils/offseasonStorage.ts`
- `src/utils/franchisePlayerStorage.ts`

## Do Not Start Yet

- Do not add roster analyzer features before its read-only contract is documented.
- Do not re-enable synthetic simulation for Mode 2 v1.
- Do not expand offseason feature depth until franchise-owned mutation adapters exist.
- Do not treat League Builder as mutable franchise state after setup.
