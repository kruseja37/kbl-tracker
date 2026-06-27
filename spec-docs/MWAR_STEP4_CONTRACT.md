# CONTRACT — Manager-WPA Step 4: point the MOY ceremony at the LIVE award (surface re-point only)

**Lane:** manager-WPA (`experiment/manager-wpa-window`). **Builder:** Codex. **Auditor:** Opus (Captain).
**Scope (JK-ruled 2026-06-26): MINIMAL — fix the one broken surface.** The season/career manager number, the Almanac
manager leaderboard, the in-season MOY race (AwardsWatchlist), and the MOY *computation* all already exist and are
Step-1-correct. **Do NOT build a roll-up engine, a new store, or a processCompletedGame hook.** This is a one-screen data-source swap.

## THE RULE
The end-of-season **Manager-of-the-Year ceremony screen** must show the REAL winner from the LIVE awards engine (the new
single-layer metric), instead of the **dead legacy store** it reads today.

## GROUND ANCHORS (Captain-verified from source 2026-06-26)
- **The break:** `src/src_figma/app/components/AwardsCeremonyFlow.tsx:177-181` loads `getAllManagerSeasonStatsForSeason(seasonId)`
  from the orphaned legacy `managerStorage` (the `kbl-manager` DB, **never written** in production) into
  `managerSeasonStats: ManagerSeasonStats[]` (the deprecated `mwarCalculator` shape). `ManagerYearScreen` (`:1610`) renders
  from it and, because it's always empty, shows **"No manager data — play a season first"** (`:~1655`) even after a full season.
  It also does legacy mWAR vote math (`m.mWAR` / `m.overperformanceWins`).
- **The live source (use this):** the season-finalize path already computes AND persists the MOY as a
  `FranchiseAwardRow` of category `MANAGER_OF_YEAR`. Engine: `franchiseAwardsEngine.ts`
  `computeFranchiseManagerOfYear(input): FranchiseAwardRow | null` (`:545`) →
  `computeAndPersistFranchiseWarAwards` (`:595`, persists via `replaceFranchiseAwardRowsForScope :666`). Persisted rows live
  in `franchiseAwardsStorage.ts` (the shared `kbl-tracker` DB; `FranchiseAwardRow` `:45`). Find the reader in
  `franchiseAwardsStorage.ts` that pairs with `replaceFranchiseAwardRowsForScope` (a `get…ForScope` getter) and read the
  `MANAGER_OF_YEAR` row for the ceremony's scope.
- **`FranchiseAwardRow` fields for the render:** `winnerPlayerId` (holds the **managerId** for manager awards),
  `winnerTeamId`, `candidates: FranchiseAwardCandidate[]` (the ranked race / runners-up), `managerActualWins`,
  `managerExpectedWins`, `voteWeight`, `finalized`, `computedAt`. Scope is `FranchiseAwardsScopeInput`
  (`franchiseId`, `seasonId`, `statsScopeId`) — and for franchise games `statsScopeId === seasonId` (guaranteed invariant).
- **Name resolution precedent:** `AwardsWatchlist.tsx:116` resolves managerId → display name via
  `listManagerProfiles()` (`managerIdentityStorage` — the LIVE identity DB). Mirror it; do NOT use the legacy embedded names.

## CHANGES (AwardsCeremonyFlow.tsx ONLY — plus removing the dead import)
1. **Replace the dead load** (`:177-181`): instead of `getAllManagerSeasonStatsForSeason`, read the persisted
   `MANAGER_OF_YEAR` `FranchiseAwardRow` for the scope `{ franchiseId, seasonId, statsScopeId: seasonId }` via the
   `franchiseAwardsStorage` reader — **`getFranchiseAwardRow(scope, 'MANAGER_OF_YEAR')`** (single-row getter, verified
   present at `:178`; `getFranchiseAwardRowsByScope` `:160` is the multi-row alternative).
2. **Re-render `ManagerYearScreen`** from the `FranchiseAwardRow`: winner = `winnerPlayerId` (which holds the **managerId** —
   verified `winnerPlayerId: winner.managerId`), resolved to a display name via `listManagerProfiles()` (mirror
   `AwardsWatchlist`). **NOTE: `winnerTeamId` is `null` on the MOY row** (verified) — resolve the winner's team from the
   manager profile (or omit team if the profile lacks it), do NOT render the null `winnerTeamId`. Also show `managerActualWins`
   / `managerExpectedWins` and the `candidates` ranking (each carries `playerId`=managerId + `marginToWinner`) for the
   runner-up votes. Drop the legacy `m.mWAR` vote math.
3. **Empty/not-finalized state:** if no `MANAGER_OF_YEAR` row exists or `finalized !== true`, show a sensible state
   (e.g. "Manager of the Year not finalized yet") — NOT the misleading "play a season first" when a season WAS played.
4. **Remove the dead dependencies** from this component: the `getAllManagerSeasonStatsForSeason` import (from
   `managerStorage`) and the `ManagerSeasonStats` type import (from the deprecated `mwarCalculator`), and any now-unused
   legacy MOY-vote helper. Do NOT delete those source modules themselves (out of scope) — only stop this component using them.

## CONSTRAINTS
- **Surface re-point ONLY.** Do NOT touch the awards ENGINE (`franchiseAwardsEngine` is Step-1-correct), the Almanac, the
  metric, or any storage shape. No new store, no trackerDb version bump, no processCompletedGame hook.
- Do NOT revive `managerStorage` (legacy mWAR) or `mwarCalculator`.

## VERIFICATION (run locally; report exact output)
1. `npm run build` exit 0.
2. `npm test` for the affected tests: `AwardsCeremonyFlow` / `ManagerYearScreen` render tests (and `PostGameSummary.test`,
   `AwardsWatchlist.test`, any awards-ceremony test that touches the manager screen). Update expectations to the live
   FranchiseAwardRow source; report pass/fail vs the documented baseline; no new characterized RED outside the documented set.
3. State plainly that **JK's browser sign-off (the ceremony actually showing the right Manager of the Year on real data) is
   the acceptance gate** — a passing render test is not a substitute.

## FAILURE PROTOCOL (STOP-IF — emit `BLOCKED: <reason>` and STOP)
- No persisted-award-row reader exists in `franchiseAwardsStorage` and the only way to get the MOY is to recompute it
  on-demand (needs standings + the frozen trusted-value artifact the ceremony may not have) — if so, STOP and report the
  options rather than guessing a recompute path.
- The `winnerPlayerId`-as-managerId assumption is wrong for manager awards (verify against how `computeFranchiseManagerOfYear`
  sets the winner) — if it stores the manager elsewhere, STOP and report.
