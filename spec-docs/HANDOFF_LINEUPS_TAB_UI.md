# HANDOFF → UI/UX thread: the franchise Lineups Tab (Step 5b) + pregame collapse (5c)

> Self-contained. The engine + the manager-WPA metric are DONE; you own the UI on top. Build on branch
> `experiment/manager-wpa-window` (it has the manager metric, the merged keystone-optimizer lane, and the rotation engine —
> base your UI work on it or merge it in; HEAD includes commit `d4165afc` rotation engine + merge `f119ae48`).

## What you're picking up
Build the **franchise Lineups tab** and **collapse the separate pregame layer**. JK's vision: a tab that reads the team's
NEXT game + opponent + the opponent's NEXT starting pitcher, and optimizes your lineup against **that specific pitcher's full
profile** (his real ratings/traits/handedness — not just lefty/righty), with **accept-or-adjust**, manual reorder of
lineup/rotation, and mojo/fitness edits right there. Then fold the standalone pregame screen into it so "Play Ball" just reads
what you set.

## CRITICAL boundary (do not cross)
The optimal lineup is a **scout-driven ADVISOR** (accept/adjust). It is **NOT** a manager-WPA input. The manager metric
(mWAR / the 3:2:1) is a separate, completed track that scores on real per-play win-probability — **do NOT wire the optimal
lineup into it, and do NOT touch** `managerWpaGameState.ts` / `pogAwards.ts` / the manager metric. Also do NOT edit the
optimizer engine files (`lineupVsStarter.ts`, `scoutMove.ts`, `trueValue.ts`, `effectiveRatings.ts`) or
`franchiseRotationResolver.ts` — you CONSUME them.

## The engine seams you consume (all DONE + tested)
1. **Opponent's next starter (full profile):**
   `resolveOpponentStarterProfile(teamId: string, gamesPlayed: number, rosterLookup: OpponentStarterRosterLookup): OpponentStarterProfile | null`
   — `src/utils/franchiseRotationResolver.ts:48`. (Rotation position is DERIVED: `gamesPlayed % startingRotation.length`.)
2. **The rotation-aware starter id** (already wired into launch):
   `getRotationStarterId(startingRotation: string[], gamesPlayed: number): string | null` — `franchiseRotationResolver.ts:36`.
3. **The optimizer** (the orphaned engine you wire into the tab):
   `optimizeLineupVsStarter(input: OptimizeLineupVsStarterInput): OptimalLineupSnapshot` — `src/engines/lineupVsStarter.ts:37`.
   Input: `{ teamId, mode: OptimalLineupModeContext, instanceId?, dhEnabled?, roster: ScoutPlayer[], opponentStarter:
   OpponentStarterProfile, chosenLineup?: {playerId, battingOrderSlot, defensivePosition}[] }`. Returns the EXISTING
   `OptimalLineupSnapshot` shape (drops into the existing snapshot plumbing). `ScoutPlayer = OptimalLineupCandidate`
   (`src/utils/optimalLineup.ts:22-46`). **v1 limitation:** it RE-SCORES the hand-based base slots on the starter's full true
   value; it does NOT yet re-ASSIGN who plays which position — fine for the advisor's "compare/gap" UX.
   **`snapshotId`/`sourceConfidence` are minted by YOU (the lane) at persist time** — the engine returns content with identity
   unset (per the locked interface contract).

**The chain the tab runs:** `resolveOpponentStarterProfile(opponentTeamId, opponentGamesPlayed, lookup)` → build
`OptimizeLineupVsStarterInput` (your roster mapped to `ScoutPlayer[]`, the resolved `opponentStarter`, mode/dhEnabled) →
`optimizeLineupVsStarter(...)` → `OptimalLineupSnapshot` → display + accept/adjust + persist the chosen lineup. (Today the
optimal lineup is hand-only via `buildOptimalLineupSnapshot`; your job is to point the UI at `optimizeLineupVsStarter` for the
*specific* next SP.)

## What to build
**5b — the Lineups tab.** New franchise-hub sub-tab beside TEAM HUB:
- Placement: `FranchiseHome.tsx` — `TabType` union :131, nav arrays :1168/1187, content switch :1415+ (mirror
  `activeTab === "team" → <TeamHubContent/>` :1425). Add `activeTab === "lineups" → <LineupsTabContent/>`.
- It reads `useFranchiseData().nextGame` for the opponent, runs the chain above against their next SP, and shows the
  accept/adjust advisor, manual lineup + rotation reorder, mojo/fitness edit, and benchmark/readiness status.

**5c — collapse the pregame layer.** Remove the standalone PRE-GAME LINEUP modal (`FranchiseHome.tsx:4255-4370`) as the
finalization step. "Play Ball" reads the lineup/rotation already set on the Lineups tab and passes through via
`handleLaunchGame`'s nav assembly (`FranchiseHome.tsx:3636-3706` + `withPregameManagerNavigationState`,
`pregameNavigationState.ts:19-36`). Keep GameTracker's in-game lineup/sub + mojo/fitness edit as the last-second buffer.

## REUSE — don't rebuild (these exist + work today, just buried in Team Hub)
- **Accept/adjust advisor controls:** the COMPARE/APPLY/RECALC/SET row + handlers — `TeamHubContent.tsx:3194-3299` (panel),
  `:2776-2826` (handlers); the read-only gap card `OptimalLineupComparisonPanel.tsx`.
- **Manual lineup + rotation editor:** `TeamHubContent.tsx:3022-3192` (slot selects + UP/DN, rotation UP/DN, `handleSaveLineupRotation`
  :2680).
- **Benchmark/readiness status:** `PregameBenchmarkChecklist.tsx`, `pregameLineupBenchmarks.ts` (`buildPregameBenchmarkRows`,
  `selectOptimalLineupForOpposingPitcher`).
- These currently live INLINE in `TeamHubContent.tsx` — extract to shared subcomponents so both Team Hub and the Lineups tab
  use them.
- **Launch nav assembly:** `handleLaunchGame` (`FranchiseHome.tsx:3636-3706`).

## Reference docs (full detail)
- `spec-docs/SITUATIONAL_ADVISOR_AND_OPTIMAL_LINEUP_DEEPDIVE.md` (the optimal-lineup/advisor deep-dive + Part B UX guidance:
  make the optimal an auto-default with one-tap accept; don't add in-game per-AB re-optimization).
- `spec-docs/MANAGER_WPA_BUILD_PLAN.md` §"STEP 5" (the 5a/5b/5c breakdown).
- `spec-docs/MANAGER_WPA_OPTIMIZER_INTERFACE_CONTRACT.md` (the locked optimizer interface — units, identity minting, the
  matchup-substrate optional-field future hook).
- `spec-docs/MWAR_STEP5A_CONTRACT.md` (the rotation resolver you consume).

## Gotchas
- The optimizer is WPA-denominated content but the *optimal lineup* itself is an advisor — don't conflate with mWAR.
- A new trackerDb store needs a `TRACKER_DB_VERSION` bump + the `franchiseSeasonLedgerStorage.test.ts` store-list pin update —
  avoid if you can reuse the existing optimal-lineup snapshot persistence.
- For franchise games `statsScopeId === seasonId` (use the franchise seasonId for the scope).
