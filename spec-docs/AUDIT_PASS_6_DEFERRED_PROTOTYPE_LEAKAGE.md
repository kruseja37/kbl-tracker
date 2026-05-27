# Audit Pass 6: Deferred/Prototype Leakage

Date: 2026-05-22

Scope: Cross-spec franchise traceability Pass 6 only. This audit checks whether deferred/prototype systems are visible, reachable, mutating, or writing durable records in Mode 2 v1 franchise flows. It does not implement code, add roster analyzer work, design the roster analyzer/recommendation engine, replace deferred systems with production versions, or start another pass.

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
- `spec-docs/AUDIT_PASS_5_DERIVED_FLAVOR_SYSTEMS.md`
- `spec-docs/FRANCHISE_STORAGE_ARCHITECTURE_DECISION.md`

Focused tests run:

```bash
npm test -- src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx src/utils/tests/modeCompetitionScope.test.ts src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts
```

Result: 3 test files passed, 13 tests passed. The run emitted the expected wrong-season playoff warning from the franchise season summary tests.

## Findings

### 1. Offseason TradeFlow is an active franchise v1 prototype surface that can persist durable trade records from global/static offseason data

Requirement:

- Pass 6 requires deferred/prototype route/tab surfaces, including trade workflows, not to be exposed as active franchise v1 workflows unless they are explicitly guarded/read-only.
- Prototype offseason flows must not mutate League Builder/global template storage in franchise context, and dormant prototype code should not write durable franchise/global records.
- The Pass 6 plan explicitly names all-star, trade, contraction, expansion, AI simulation, and roster analyzer/recommendation surfaces as exposure risks (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:543-550`).

Repo evidence:

- Regular-season transaction UI is flag-hidden, but offseason tabs always include `TRADES` (`src/src_figma/app/pages/FranchiseHome.tsx:1073-1075`, `src/src_figma/app/pages/FranchiseHome.tsx:1093-1119`).
- The offseason phase map routes `TRADES` directly to the `rosters` tab (`src/src_figma/app/pages/FranchiseHome.tsx:384-397`).
- `FranchiseHome` renders `TradeFlow` for any active `rosters` tab and passes `franchiseId` (`src/src_figma/app/pages/FranchiseHome.tsx:1330-1332`).
- `TradeFlow` wires `useOffseasonState(seasonId, 1, { franchiseId })`, hardcoding `seasonNumber` to `1` instead of accepting the canonical season number (`src/src_figma/app/components/TradeFlow.tsx:128-136`).
- `TradeFlow` loads teams and players through `useOffseasonData`, which reads static/global `playerDatabase` data, not franchise-owned snapshots (`src/src_figma/app/components/TradeFlow.tsx:137-146`, `src/src_figma/hooks/useOffseasonData.ts:9-21`, `src/src_figma/hooks/useOffseasonData.ts:269-297`).
- Completing a trade calls `addNewTrade`, then clears the builder even if persistence fails (`src/src_figma/app/components/TradeFlow.tsx:196-234`).
- `useOffseasonState.addNewTrade` writes to offseason storage by `seasonId` (`src/src_figma/hooks/useOffseasonState.ts:371-390`).
- `offseasonStorage.addTrade` appends and saves a durable `trades-${seasonId}` record (`src/utils/offseasonStorage.ts:727-794`).

Tests proving behavior:

- No test covers franchise `TradeFlow` mutation guard, hidden/read-only state, hardcoded season-number behavior, or global/static data leakage.
- The existing franchise offseason guard tests cover FreeAgency, Retirement, RatingsAdjustment, Draft, and FinalizeAdvanceFlow, but not TradeFlow (`src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:150-279`).

Status: risky.

Severity: high.

Recommendation:

- Treat TradeFlow as deferred for franchise Mode 2 v1 until a durable franchise roster/trade adapter exists.
- Hide the offseason `TRADES` tab in franchise context or render a read-only guarded placeholder.
- If the component remains mountable, block `handleTradeComplete` when `franchiseId` is present and show the same clear guard message used by other prototype mutation flows.
- If retained for non-franchise/prototype contexts, add a `seasonNumber` prop and remove the hardcoded `1`.

Smallest safe patch:

- In `FranchiseHome`, omit the offseason `rosters`/`TRADES` tab for franchise Mode 2 v1 or render a non-mutating guarded placeholder.
- In `TradeFlow`, add a franchise guard before `addNewTrade`, accept `seasonNumber`, and add tests proving `addNewTrade` is not called with `franchiseId`.

Recommended disposition: hidden for franchise v1; guarded if the component is directly mounted; keep active only for non-franchise/prototype contexts.

### 2. Franchise double-switch UI path is guarded, but the lower-level substitution hook can still execute `double_switch` if called in franchise context

Requirement:

- Mode 2 v1 defers the atomic double-switch operation; users should achieve the same result through supported pitching change and batting-order/position moves (`spec-docs/MODE_2_V1_FINAL.md:942-945`).
- Pass 6 requires double-switch UI/handlers to be hidden or safely guarded for franchise Mode 2 v1 and asks whether unsupported substitution internals can mutate franchise game state.

Repo evidence:

- `LineupCard` still includes `double_switch` in the substitution payload type (`src/src_figma/app/components/LineupCard.tsx:63-71`).
- `GameTracker.handleLineupCardSubstitution` returns early for `effectiveFranchiseId && sub.type === "double_switch"` (`src/src_figma/app/pages/GameTracker.tsx:6182-6193`).
- The non-franchise branch remains capable of sending `subType: "double_switch"` to `makeSubstitution` (`src/src_figma/app/pages/GameTracker.tsx:6361-6383`), preserving exhibition/elimination behavior when no franchise id is present.
- `useGameState.makeSubstitution` accepts `subType: "double_switch"` and does not check `franchiseIdRef.current` before pre-game or in-game lineup mutation (`src/src_figma/hooks/useGameState.ts:9204-9233`, `src/src_figma/hooks/useGameState.ts:9408-9532`, `src/src_figma/hooks/useGameState.ts:9535-9661`).
- The hook has franchise identity refs available (`src/src_figma/hooks/useGameState.ts:2457-2463`, `src/src_figma/hooks/useGameState.ts:4124-4139`), so a hook-level franchise guard can be added without changing the public API.

Tests proving behavior:

- The standalone `DoubleSwitchModal` is tested for behavior, but those tests are not franchise negative tests (`src/src_figma/__tests__/gameTracker/DoubleSwitchModal.test.tsx`).
- No test proves a franchise GameTracker or `useGameState` path rejects `subType: "double_switch"` before state mutation.

Status: partial.

Severity: high.

Recommendation:

- Keep the GameTracker UI/handler guard.
- Add a second guard inside `makeSubstitution` that returns `{ success: false }` when `franchiseIdRef.current` exists and normalized `subType` is `double_switch`.
- Preserve exhibition/elimination behavior by applying the guard only when franchise identity is present.

Smallest safe patch:

- Add the hook-level guard immediately after `normalizeLiveSubstitutionType`.
- Add a focused hook or component test proving franchise `double_switch` returns failure and leaves lineup/game state unchanged, plus a non-franchise test proving existing behavior is still callable.

Recommended disposition: guarded in franchise; keep supported where already supported outside franchise.

### 3. Contraction/expansion and several offseason prototype tabs are visible as active franchise workflows even when their bodies are placeholders or guarded

Requirement:

- OFFSEASON v1 removes contraction and keeps expansion optional (`spec-docs/OFFSEASON_SYSTEM_SPEC.md:34-58`, `spec-docs/OFFSEASON_SYSTEM_SPEC.md:675-677`).
- Pass 6 requires unsupported tabs and route surfaces to be hidden, read-only, guarded, or deferred/deleted rather than exposed as active workflows.
- Farm narrative/mechanical effects and analyzer-like recommendations must remain boundary/placeholders only (`spec-docs/FARM_SYSTEM_SPEC.md:918-921`).

Repo evidence:

- Franchise offseason tabs expose `CONTRACT/EXPAND`, `FARM SYSTEM`, `CHEMISTRY`, `TRADES`, and `SPRING TRAINING` as normal tab buttons (`src/src_figma/app/pages/FranchiseHome.tsx:1093-1119`).
- The contraction tab copy still describes fan-morale-driven contraction risk, contraction rolls, voluntary sales, protection selections, expansion draft, player disposal, and defunct-team museum entries (`src/src_figma/app/pages/FranchiseHome.tsx:2684-2744`).
- `ContractionExpansionFlow` itself is skip-only and writes only phase advancement through `completeCurrentPhase` (`src/src_figma/app/components/ContractionExpansionFlow.tsx:1-70`).
- Farm reconciliation and chemistry tabs are read-only placeholders with "Coming Soon" copy and no local mutation beyond the global phase-advance control (`src/src_figma/app/pages/FranchiseHome.tsx:2469-2552`).
- `SpringTrainingFlow` reads global/static offseason data and shows projections from `agingEngine`; its complete button only calls `onComplete` (`src/src_figma/app/components/SpringTrainingFlow.tsx:9-17`, `src/src_figma/app/components/SpringTrainingFlow.tsx:133-184`, `src/src_figma/app/components/SpringTrainingFlow.tsx:339-357`).
- The shared phase button can complete/advance placeholder phases, which is expected for v1 progression but also means visible placeholder tabs are not purely inert (`src/src_figma/app/pages/FranchiseHome.tsx:399-420`, `src/src_figma/app/pages/FranchiseHome.tsx:1233-1249`).

Tests proving behavior:

- No test proves contraction is hidden/read-only in franchise v1.
- No test proves the visible placeholder tabs cannot write anything except phase advancement.

Status: risky for UX/spec exposure; mostly safe for durable mutation except the separate TradeFlow blocker.

Severity: medium-high.

Recommendation:

- Hide contraction wording entirely or rename Phase 4 to the v1-safe optional expansion/skip surface.
- Keep Farm System and Chemistry as read-only placeholders if product wants them visible, but make their copy honest that no algorithm runs and only phase skipping is supported.
- Ensure Spring Training remains read-only/projection-only unless/until its data source is franchise-owned.

Smallest safe patch:

- Change franchise Mode 2 v1 tab construction to omit or guarded-render unsupported tabs, starting with `contraction` and `rosters`.
- Replace contraction copy with a v1-safe "Expansion is deferred/skip phase" message if the phase must remain visible for state-machine continuity.
- Add negative component tests for franchise tabs: no active contraction workflow, no TradeFlow mount, no analyzer/recommendation tab.

Recommended disposition: contraction hidden or guarded/read-only; farm and chemistry read-only placeholders; spring training read-only until franchise data-backed.

### 4. Synthetic simulation is disabled and visibly unreachable, but lacks a negative test proving no franchise action path can create synthetic completed games

Requirement:

- Mode 2 v1 supports played, scored, and skipped paths only; SIMULATED status and AI game simulation are deferred (`spec-docs/MODE_2_SECTION_MAP.md:225-235`, `spec-docs/MODE_2_V1_FINAL.md:2889-2891`).
- The storage architecture decision allows synthetic sim code to remain only if disabled/unreachable in Mode 2 v1 (`spec-docs/FRANCHISE_STORAGE_ARCHITECTURE_DECISION.md:392-395`).

Repo evidence:

- `FranchiseHome` imports the synthetic game factory and `processCompletedGame`, so dormant production code remains present (`src/src_figma/app/pages/FranchiseHome.tsx:24-32`).
- `MODE_2_V1_SYNTHETIC_SIM_ENABLED` is a hardcoded `false` flag (`src/src_figma/app/pages/FranchiseHome.tsx:104-109`).
- Playoff simulation handler returns immediately when the flag is false (`src/src_figma/app/pages/FranchiseHome.tsx:995-1001`).
- Regular-season single-game simulation and batch simulation handlers return immediately when the flag is false (`src/src_figma/app/pages/FranchiseHome.tsx:3340-3343`, `src/src_figma/app/pages/FranchiseHome.tsx:3443-3446`).
- Visible SIM buttons and simulation overlays are gated by the same flag (`src/src_figma/app/pages/FranchiseHome.tsx:1776-1783`, `src/src_figma/app/pages/FranchiseHome.tsx:1873-1880`, `src/src_figma/app/pages/FranchiseHome.tsx:1931-1938`, `src/src_figma/app/pages/FranchiseHome.tsx:2341-2352`, `src/src_figma/app/pages/FranchiseHome.tsx:3667-3693`, `src/src_figma/app/pages/FranchiseHome.tsx:3828-3851`, `src/src_figma/app/pages/FranchiseHome.tsx:3877-3886`).
- Search found no other production importer of `syntheticGameFactory` outside `FranchiseHome` and UI overlay/test-adjacent code (`src/utils/syntheticGameFactory.ts:271`, `src/src_figma/app/components/SimulationOverlay.tsx:2-11`, `src/src_figma/app/components/BatchOperationOverlay.tsx:2-10`).
- `FranchiseHome` active tab is local React state, with no query-param or route-state tab router found in this component (`src/src_figma/app/pages/FranchiseHome.tsx:176-202`).

Tests proving behavior:

- No focused negative test asserts that a franchise user cannot render/click a SIM action or that `generateSyntheticGame`/`processCompletedGame` are not called from franchise sim handlers.

Status: mostly complete.

Severity: medium.

Recommendation:

- Keep the flag and early returns.
- Add a negative action-surface test that renders franchise regular season and playoff contexts and proves SIM controls are absent and synthetic game creation is not invoked.

Smallest safe patch:

- Add component tests around `FranchiseHome` asserting no SIM buttons/overlays in franchise regular-season and playoff modes.

Recommended disposition: hidden.

### 5. Guarded offseason prototype mutation flows are mostly safe from League Builder writes, but remain interactive and global-data-backed in franchise context

Requirement:

- Prototype FreeAgencyFlow, DraftFlow, RetirementFlow, RatingsAdjustmentFlow, TradeFlow, ContractionExpansionFlow, and related components must not mutate League Builder/global template storage in franchise context.
- League Builder remains the Mode 1 template source and damaged-legacy fallback, not active franchise state (`spec-docs/FRANCHISE_STORAGE_ARCHITECTURE_DECISION.md:392-395`).

Repo evidence:

- `franchiseOffseasonGuards` blocks template mutation when a `franchiseId` is present (`src/src_figma/app/utils/franchiseOffseasonGuards.ts:1-6`).
- FreeAgencyFlow checks the guard before saving offseason signings or calling `transferPlayer`/`retirePlayer` (`src/src_figma/app/components/FreeAgencyFlow.tsx:390-454`).
- DraftFlow checks the guard before saving draft results or calling League Builder `savePlayer`/`saveTeamRoster` (`src/src_figma/app/components/DraftFlow.tsx:435-528`).
- RetirementFlow checks the guard before saving retirement decisions or calling `retirePlayer` (`src/src_figma/app/components/RetirementFlow.tsx:218-264`).
- RatingsAdjustmentFlow checks the guard before saving ratings adjustments or calling `getPlayer`/`savePlayer` (`src/src_figma/app/components/RatingsAdjustmentFlow.tsx:395-460`).
- These components still load visible teams/players through `useOffseasonData`, which reads static/global `playerDatabase` (`src/src_figma/hooks/useOffseasonData.ts:9-21`, `src/src_figma/hooks/useOffseasonData.ts:269-297`).
- AwardsCeremonyFlow saves awards to scoped offseason state and uses `useOffseasonData`; it does not mutate League Builder, but it is still an active prototype-style derived workflow (`src/src_figma/app/components/AwardsCeremonyFlow.tsx:129-155`, `src/src_figma/app/components/AwardsCeremonyFlow.tsx:174-194`).

Tests proving behavior:

- `franchiseOffseasonGuards.component.test.tsx` proves FreeAgencyFlow, RetirementFlow, RatingsAdjustmentFlow, and DraftFlow do not call mocked League Builder mutation functions in franchise context (`src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:150-260`).
- The same test proves FinalizeAdvanceFlow blocks local-only roster movement controls in franchise context (`src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:264-279`).
- Tests do not cover AwardsCeremonyFlow, TradeFlow, ContractionExpansionFlow, or SpringTrainingFlow as franchise prototype surfaces.

Status: mostly complete for League Builder mutation; partial for active-surface/read-only boundaries.

Severity: medium.

Recommendation:

- Keep the existing guard.
- Add coverage for TradeFlow and the remaining visible prototype surfaces.
- Consider making guarded franchise flows read-only from the start instead of allowing users to progress through a prototype and only blocking at final save.

Smallest safe patch:

- Add missing negative tests for TradeFlow, AwardsCeremonyFlow persistence intent, ContractionExpansionFlow skip-only behavior, and SpringTrainingFlow no roster mutation.
- If product wants stricter Pass 6 closure, hide or read-only render all global-data-backed prototype flows in franchise context.

Recommended disposition: guarded/read-only for franchise; active only outside franchise or after production adapters exist.

### 6. Regular-season all-star and transaction tabs are hidden; roster analyzer/recommendation surfaces are not mounted in FranchiseHome

Requirement:

- Pass 6 requires all-star, AI simulation, roster analyzer/recommendation, and unsupported transaction surfaces not to be exposed as active franchise v1 workflows.
- Mode 2 Section Map defers the roster analyzer and AI game engine (`spec-docs/MODE_2_SECTION_MAP.md:31-42`).

Repo evidence:

- `MODE_2_V1_TRANSACTION_UI_ENABLED` and `MODE_2_V1_ALL_STAR_UI_ENABLED` are hardcoded false (`src/src_figma/app/pages/FranchiseHome.tsx:104-109`).
- Regular-season tabs include Trades and All-Star only behind those flags (`src/src_figma/app/pages/FranchiseHome.tsx:1066-1080`).
- There is still dormant All-Star rendering for `activeTab === "allstar"`, but no visible regular-season tab path reaches it while the flag is false (`src/src_figma/app/pages/FranchiseHome.tsx:1333-1573`).
- Search found builder/analyzer tests and recommendation-like commentary kinds outside FranchiseHome, but no mounted franchise roster analyzer tab in `FranchiseHome` (`src/src_figma/__tests__/builder/Builder.test.tsx:59-184`, `src/src_figma/app/components/CommentaryFeed.tsx:33-88`).

Tests proving behavior:

- No negative component test proves the tabs are absent in franchise runtime.

Status: mostly complete.

Severity: low-medium.

Recommendation:

- Keep flags false.
- Add a negative action-surface test for regular-season franchise tabs: no All-Star, no regular-season Trades, no roster analyzer/recommendation workflow, no SIM.

Smallest safe patch:

- Add assertions to an existing `FranchiseHome` render test or a new Pass 6 action-surface test.

Recommended disposition: hidden.

### 7. Automatic deferred effects are not durably triggered during franchise finalization, but fan/farm flavor systems remain prototype-only

Requirement:

- Mode 2 v1 uses a user-only mojo/fitness paradigm; the engine must not initiate mojo/fitness changes (`spec-docs/MODE_2_V1_FINAL.md:1808-1817`).
- Pass 6 requires no automatic mojo/fitness regression/decay/reset during franchise finalization and no automatic durable activation of fan favorite/albatross, fan morale, farm narrative/mechanical effects, or adaptive/prototype systems.
- Farm mechanical effects such as morale-driven mojo hits must not leak into v1 runtime until implemented deliberately (`spec-docs/FARM_SYSTEM_SPEC.md:918-921`).

Repo evidence:

- FinalizeAdvanceFlow passes `skipMojoReset: true` and `skipLegacyLocalStorageMarkers: true` for franchise transitions (`src/src_figma/app/components/FinalizeAdvanceFlow.tsx:412-430`).
- FranchiseHome finalization callback skips global `kbl-current-season` mutation when `franchiseId` exists (`src/src_figma/app/pages/FranchiseHome.tsx:2576-2587`).
- The direct-start path uses the same franchise transition boundary from previous waves; `saveCurrentSeasonNumber` is still localStorage-backed but only used for non-franchise paths (`src/src_figma/app/pages/FranchiseHome.tsx:168-173`, `src/src_figma/app/pages/FranchiseHome.tsx:2576-2587`).
- GameTracker fan morale updates in the `src_figma` path are in-memory hook updates and are not durable franchise history (`src/src_figma/app/pages/GameTracker.tsx:2069-2072`, `src/src_figma/app/pages/GameTracker.tsx:11290-11361`, `src/src_figma/app/hooks/useFanMorale.ts:1-13`, `src/src_figma/app/hooks/useFanMorale.ts:98-170`).
- The root legacy fan morale hook still persists by team-only localStorage key if activated elsewhere (`src/hooks/useFanMorale.ts:62-86`, `src/hooks/useFanMorale.ts:92-127`), but TeamHub keeps fan morale unimplemented/empty in franchise UI (`src/src_figma/app/components/TeamHubContent.tsx:572-573`, `src/src_figma/app/components/TeamHubContent.tsx:848-858`).
- Farm reconciliation and chemistry tabs are placeholders and do not apply farm morale/mechanical effects (`src/src_figma/app/pages/FranchiseHome.tsx:2469-2552`).

Tests proving behavior:

- Wave 4 season summary/finalization tests are still green in the focused run and cover franchise transition guardrails (`src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts`).
- No test proves legacy root `useFanMorale` cannot be activated from a franchise route.
- No test proves farm morale/mechanical-effect code is unreachable, though current visible farm/chemistry tabs are placeholders.

Status: mostly complete.

Severity: medium-low.

Recommendation:

- Keep franchise finalization skipping automatic mojo reset.
- Keep fan morale and farm flavor visible only as placeholders until canonical franchise-scoped storage exists.
- Add a negative test before activating any fan/farm flavor UI that proves legacy team-only storage is not used in franchise context.

Smallest safe patch:

- Add tests documenting no automatic mojo reset/global marker mutation in franchise finalization if not already covered by current Wave 4 assertions.
- Add a manifest/test note that root `kbl-fan-morale-${teamId}` remains non-franchise legacy storage.

Recommended disposition: guarded/deferred; fan/farm flavor read-only placeholder only.

## Deferred/Prototype Surface Disposition Map

| Surface | Current state | Risk | Recommended disposition |
|---|---|---:|---|
| Synthetic regular-season sim | Code present, flag false, handler early-return, buttons hidden | Medium test gap | Hidden |
| Synthetic playoff sim | Code present, flag false, handler early-return, buttons hidden | Medium test gap | Hidden |
| Double switch | GameTracker handler blocks franchise, hook internals still accept it | High | Guarded at UI and hook |
| Regular-season Trades tab | Flag-hidden | Low | Hidden |
| Offseason TradeFlow | Visible and writes durable trade records | High | Hidden for franchise v1; guarded if mounted |
| All-Star tab | Flag-hidden in regular season; dormant branch remains | Low-medium | Hidden |
| Contraction/Expansion | Visible; skip-only component, but contraction copy is active/misleading | Medium-high | Hidden or guarded/read-only; remove contraction language |
| FreeAgencyFlow | Interactive; final save guarded before League Builder mutation | Medium | Guarded/read-only |
| DraftFlow | Interactive; final save guarded before League Builder mutation | Medium | Guarded/read-only |
| RetirementFlow | Interactive; final save guarded before League Builder mutation | Medium | Guarded/read-only |
| RatingsAdjustmentFlow | Interactive; final save guarded before League Builder mutation | Medium | Guarded/read-only |
| AwardsCeremonyFlow | Active scoped persistence; global-data-backed derived prototype | Medium | Guarded/read-only or persisted-summary-backed only |
| Farm reconciliation | Visible placeholder, no algorithm mutation | Low-medium | Read-only placeholder |
| Chemistry rebalancing | Visible placeholder, no algorithm mutation | Low-medium | Read-only placeholder |
| Spring Training | Read-only projection from global/static data; phase completion only | Medium | Read-only until franchise-data-backed |
| AI roster management in FinalizeAdvanceFlow | UI animation/local validation helper; local roster movement blocked in franchise | Low-medium | Guarded/local-only |
| Roster analyzer/recommendation engine | Not mounted as franchise workflow | Low | Hidden/deferred |
| Fan morale/farm morale/mechanical effects | Not durable in franchise UI; legacy fan morale store exists outside v1 | Medium-low | Deferred/read-only placeholder |
| Automatic mojo/fitness reset/decay | Franchise finalization skips reset; user-only paradigm preserved | Low | Guarded/user-only |

## Required Tests Before Future Feature Work

- Franchise action-surface test: regular-season and playoff FranchiseHome render no SIM controls, no All-Star tab, no regular-season Trades tab, and no roster analyzer/recommendation workflow.
- Synthetic sim negative test: clicking all visible franchise game actions cannot call `generateSyntheticGame` or synthetic `processCompletedGame`.
- Franchise double-switch negative test: GameTracker/hook rejects `double_switch` when franchise identity is present and leaves lineup/game state unchanged; non-franchise path remains supported.
- TradeFlow guard test: with `franchiseId`, `addNewTrade` is not called and no durable `trades-${seasonId}` row is written.
- Contraction/expansion exposure test: franchise v1 does not show active contraction workflow/copy, or renders only a skip/read-only guard.
- Prototype surface tests: FreeAgency, Draft, Retirement, Ratings, Awards, Contraction, SpringTraining, Farm, Chemistry either no-op/read-only or guard all durable writes in franchise context.
- Legacy fan morale guard test before activating fan morale UI: franchise route does not use team-only `kbl-fan-morale-${teamId}` storage.

## Safe to proceed beyond Pass 6?

No.

The repo is close on the original Waves 1-5 boundaries, but Pass 6 should not close while:

1. Offseason TradeFlow remains visible and can write durable franchise-scoped trade records from global/static data with a hardcoded `seasonNumber` of `1`.
2. `useGameState.makeSubstitution` still accepts and can apply `double_switch` internally even when franchise identity is present.
3. Contraction/expansion remains exposed with v1-inaccurate contraction copy.

## Top blockers

1. Hide or guard franchise offseason TradeFlow and remove its hardcoded season number.
2. Add a hook-level franchise guard for `double_switch`.
3. Replace or hide active contraction workflow/copy in franchise Mode 2 v1.
4. Add negative action-surface tests for synthetic sim, unsupported tabs, double-switch, and TradeFlow.

## Recommended next implementation prompt

```text
Recommended reasoning: High

Please implement the Pass 6 deferred/prototype leakage blocker patch.

Scope:
- Implement only the smallest runtime guardrails needed to close Pass 6.
- Do not add roster analyzer work.
- Do not design the roster analyzer/recommendation engine.
- Do not replace deferred systems with production versions.
- Preserve non-franchise/exhibition/elimination behavior.

Fix:
1. Franchise offseason TradeFlow exposure
   - Hide the offseason TRADES tab in franchise Mode 2 v1 or replace it with a non-mutating guarded/read-only placeholder.
   - Add a direct TradeFlow guard so that if the component is mounted with `franchiseId`, `addNewTrade` is not called.
   - Remove the hardcoded `seasonNumber = 1` assumption by accepting/passing canonical seasonNumber where the component remains used.

2. Franchise double-switch internals
   - Keep the existing GameTracker handler guard.
   - Add a `useGameState.makeSubstitution` guard that rejects normalized `double_switch` when franchise identity is present, before any pre-game or in-game lineup/game-state mutation.
   - Preserve non-franchise double-switch behavior.

3. Contraction/expansion v1 exposure
   - Remove active contraction language from franchise Mode 2 v1.
   - Either hide the contraction tab/workflow in franchise context or render a skip-only/read-only v1 message that does not imply contraction rolls, contraction risk, protection lists, or expansion drafts are active.

Tests:
- Add focused negative tests proving:
  - franchise offseason TradeFlow cannot write trades;
  - franchise GameTracker/useGameState rejects double_switch and leaves state unchanged;
  - non-franchise double_switch behavior remains available;
  - franchise tabs/action surface do not expose synthetic sim, all-star, regular-season trades, roster analyzer/recommendation, or active contraction workflow;
  - existing guarded offseason flows still do not call League Builder mutation functions in franchise context.

After implementation, run the focused Pass 6 tests plus the existing Pass 1-5 focused guardrail tests.
```
