# F-134 / F-135 Discovery Report — Denomination & Season-Metadata Sweep

**Date:** 2026-06-12
**Auditor:** Fable 5 CLI (Discovery Auditor, read-only pass)
**Branch:** codex/franchise-v1-next
**Sources of truth:** FINDINGS_056_onwards.md (F-134 :2241, F-135 :2251), MODE2_SYSTEMS_INTEGRATION_MAP.md §4.4, T5 canonical-dollar state (BRIDGE=300.032521), W1 closure (gamesPerTeam config-sourced; totalGames semantics unchanged).
**Method:** dual-direction wiring audit (top-down App.tsx → route → render gate; bottom-up data layer → hook → component), fresh grep on all four F-134 files (line numbers below are CURRENT, re-verified 2026-06-12), full-`src/` totalGames sweep with per-site caller tracing. No file was edited. No state-writing test was run.

---

## 0. Load-Bearing Reachability Facts (proven first, applied everywhere)

| # | Fact | Evidence |
|---|------|----------|
| R1 | All four F-134 components are imported and rendered ONLY by `FranchiseHome.tsx` | `grep -rn` importers: FranchiseHome.tsx:7 (FreeAgencyFlow), :10 (AwardsCeremonyFlow), :13 (FinalizeAdvanceFlow), :14 (TradeFlow); no other non-test importer in `src/` |
| R2 | FranchiseHome is routed at `App.tsx:241` — `<Route path="/franchise/:franchiseId" element={<FranchiseHome />} />`; `franchiseId` comes from `useParams` (FranchiseHome.tsx:239) and is ALWAYS defined on that route | App.tsx:241; FranchiseHome.tsx:239 |
| R3 | **`FRANCHISE_V1_OFFSEASON_EXECUTION_ENABLED = false`** (FranchiseHome.tsx:148). `canUseOffseasonExecution = seasonPhase === "offseason" && FRANCHISE_V1_OFFSEASON_EXECUTION_ENABLED` (:1159) — **always false today** | FranchiseHome.tsx:148, :1159 |
| R4 | FreeAgencyFlow render gate: `:2535 canUseOffseasonExecution && activeTab === "free-agency"` → render :2547. AwardsCeremonyFlow gate :2580. FinalizeAdvanceFlow gate :2739 (`activeTab === "finalize"`) → render :2750. **All three flows are unreachable while the flag is false.** | FranchiseHome.tsx:2535, :2547, :2580, :2739, :2750 |
| R5 | TradeFlow is NOT flag-gated: rendered on the rosters tab `:1409 <TradeFlow seasonId={activeSeasonId} seasonNumber={currentSeason} franchiseId={franchiseId} />` — **live today** | FranchiseHome.tsx:1409 |
| R6 | `export function TradeFlow` (TradeFlow.tsx:1096) branches: `if (props.franchiseId)` → renders `FranchiseTransactionConsole` (live franchise storage: `getAllFranchiseTeams/getAllFranchisePlayers`, TradeFlow.tsx:349-350). Only when franchiseId is falsy does it `return <ActiveTradeFlow {...props} />` (:1133). Since R2 guarantees franchiseId, **ActiveTradeFlow (which contains every TradeFlow $M site) is unreachable** | TradeFlow.tsx:1096-1133, :349-350 |
| R7 | Data source for all four flows' player.salary: `useOffseasonData` (src/src_figma/hooks/useOffseasonData.ts) → `calculateSalary` from `src/engines/salaryCalculator` (:17-21, :203) over static `playerDatabase` (:15, :292-298). Field is documented `salary: number; // Canonical T5 dollars` (:38). **Salaries entering these components are canonical kblIV dollars, NOT $M units.** | useOffseasonData.ts:15-21, :38, :203, :292-298 |
| R8 | The data is canonical-DOLLAR but stock-LEAGUE: useOffseasonData reads `getAllTeams()/getAllPlayers()` from `../../data/playerDatabase`, not franchise stores — see §4 candidate finding C-1 | useOffseasonData.ts:292-298 |

Classification key (per contract): **LIVE-BROKEN** (reachable now, wired to canonical dollars, math wrong) | **DUMMY-INERT** (reachable, but operates on dummy/local data with no user impact) | **DEAD** (unreachable). Where a DEAD site becomes broken the instant a gate flips, it is marked **DEAD (latent LIVE-BROKEN on \<gate\>)** — this distinction is what the fix queue is ordered by.

---

## 1. PART A — Per-Component $M-Scale Site Tables (F-134)

### 1.1 FinalizeAdvanceFlow.tsx
**A1 Reachability:** App.tsx:241 → FranchiseHome → gate FranchiseHome.tsx:2739 `canUseOffseasonExecution && activeTab === "finalize"` → :2750. Gate is false (R3) → **entire component unreachable today**.
**A2 Data:** `useOffseasonData()` at :193 (`const { teams: realTeams, players: realPlayers, hasRealData, isLoading } = useOffseasonData();`) → `convertToLocalPlayer` :236-237 → canonical dollars (R7). Also imports `getAllFranchisePlayers` (:23) for the Phase-11 correction surface (separate, no $M math). Internal roster movement is ADDITIONALLY blocked in franchise context: `isFranchiseContext = Boolean(franchiseId)` (:219); early-returns at :261, :270, :279 (confirmCallUp), :314 (confirmSendDown); move buttons `disabled={isFranchiseContext}` (:783, :835).

| Site | Code (verbatim) | Wiring verdict | Classification | Evidence | Fix direction |
|------|-----------------|----------------|----------------|----------|---------------|
| :130 | `salary: player.salary \|\| 1000000,` | Fallback on canonical-dollar feed; fires only if salary falsy | DEAD (latent LIVE-BROKEN on flag flip — wrong-scale fallback) | R3/R4; useOffseasonData.ts:38 | Replace 1e6 fallback with canonical-scale default (or 0 + UI dash) |
| :376-380 | `"A+": 1500000, … "C+": 1000000, … return salaries[grade] \|\| 1000000;` (calculateRookieSalary) | Written into team state only via :302 `salary: calculateRookieSalary(selectedPlayer.grade)` inside confirmCallUp — gated off at :279 + button :783; displayed :1446, :1486, :1983 inside the same gated modals | DEAD (double-gated: flag + isFranchiseContext) | :279, :302, :783 | Replace table with T5 rookie-scale hook values (canonical dollars) before any reactivation |
| :396-397 | `if (player.salary >= 10000000) risk += 15; else if (player.salary >= 5000000) risk += 10;` (calculateRetirementRisk) | Called at :322 inside confirmSendDown (gated :314); displayed :2063/:2073/:2089 inside gated send-down modal | DEAD (double-gated) | :314, :322, :835 | Re-base thresholds to canonical dollars (~÷300 per BRIDGE) |
| :793 | `${(player.salary / 1000000).toFixed(1)}M • WAR: {player.war.toFixed(1)}` | Roster-list display, no isFranchiseContext gate — renders the moment the flow renders | DEAD (latent LIVE-BROKEN on flag flip — canonical $143,641 renders "$0.1M") | R3/R4 | Use `formatSalary` (salaryCalculator.ts:1337) |
| :2071 | `Salary (${(selectedPlayer.salary / 1000000).toFixed(1)}M): {selectedPlayer.salary >= 10000000 ? "+15%" : … >= 5000000 ? "+10%" : "+0%"}` | Inside send-down modal (unopenable: :835 disabled) | DEAD (double-gated) | :835 | Same as :396 + formatter swap |

**A5 sweep extras vs F-134 known list:** :376-377 (rest of the grade table — same block), :397 (second threshold), and the display call sites :1446/:1486/:1983/:2063/:2073/:2089 (all consume the two functions above; no independent $M literals). No other ≥100000 literal, `1e6`, or `/ 1000` site found (`grep -nE '1000000|1e6|1_000_000|/ 1000|\* 1000|[0-9]{6,}'`).

### 1.2 TradeFlow.tsx
**A1 Reachability:** Live on rosters tab (R5) — but the export branch (R6) routes ALL franchise renders to `FranchiseTransactionConsole`. `ActiveTradeFlow` requires falsy franchiseId, which no caller produces.
**A2 Data:** Console path (live): `getAllFranchiseTeams(franchiseId)/getAllFranchisePlayers(franchiseId)` (:349-350) — live franchise stores, canonical dollars, **no $M math anywhere in the console region (:310-:1060; verified by salary-grep, only hits are the legacy-path lines below)**. Trades execute through `franchiseTradeAdapter`, which passes raw salaries and declares `salaryMatchingApplied: false` (franchiseTradeAdapter.ts:196, :583). Legacy ActiveTradeFlow path: `useOffseasonData()` (:1140) + `useOffseasonState` persistence (:1137).

| Site | Code (verbatim) | Wiring verdict | Classification | Evidence | Fix direction |
|------|-----------------|----------------|----------------|----------|---------------|
| :128 | `salary: player.salary * 1000000, // Convert from millions to dollars` (convertToLocalPlayer) | Used only by convertToLocalTeam :140, used only by ActiveTradeFlow :1145 | DEAD (unreachable branch, R6) | R6 | Delete legacy ×1e6 (salary already canonical) when branch is removed/reactivated |
| :1185 | `return `$${(amount / 1000000).toFixed(1)}M`;` (formatSalary) | ActiveTradeFlow-local; ~25 call sites :1472-:2293, all in ActiveTradeFlow screens | DEAD (unreachable branch) | R6 | Replace with engine `formatSalary` |
| :1255 | `salaryImpact: 2700000,` (mockAIProposals) | Hardcoded mock object inside ActiveTradeFlow | DEAD (and dummy data regardless) | R6; :1248 `// Mock AI proposals` | Remove with mock-AI block |
| :1340 | `if (Math.abs(trade.salaryImpact.team1) > 5000000) {` (beat-reporter warning) | ActiveTradeFlow trade-warning logic | DEAD (unreachable branch) | R6 | Re-base threshold to canonical (~÷300) if branch ever revived |

**A5 sweep extras:** :1255 was not in the F-134 known list (F-134 listed :128, :1185 only). Nothing else found.
**Note:** ActiveTradeFlow persists trades via `useOffseasonState.addNewTrade` (:1137) — if this branch is ever reached, the ×1e6 salaries flow into trade-matching AND stored trade records. That is why its risk class stays HIGH despite being dead.

### 1.3 AwardsCeremonyFlow.tsx
**A1 Reachability:** Gate FranchiseHome.tsx:2580 `canUseOffseasonExecution && showAwards` → false (R3) → **unreachable today**.
**A2 Data:** `useOffseasonData` (:3) → `convertToAwardPlayer` :116 — canonical dollars in, ×1e6 applied. Award winners persist via `offseasonState.saveAwards(awardWinners)` (:184), but the persisted `AwardWinner` shape carries **no salary field** (offseasonStorage.ts:70-76: awardType/playerId/playerName/teamId/position?/league?) — scale damage is display/vote-math only, not persisted.

| Site | Code (verbatim) | Wiring verdict | Classification | Evidence | Fix direction |
|------|-----------------|----------------|----------------|----------|---------------|
| :116 | `salary: p.salary * 1000000, // Convert from millions` | Feeds every award screen; winner SELECTION uses salary as ranking proxy (:403-:413, :491, :624, :694, :802, :946, :1045, :1167, :1311, :1454, :1740, :1748) — ranking is monotonic so ×1e6 does NOT change winners | DEAD (latent LIVE-BROKEN on flag flip — display/vote math only) | R3/R4 | Delete ×1e6 (salary already canonical) |
| :1335 | `const winnerPct = … Math.round(70 + (winner.salary - runnerUp.salary) / 500000) … : 87;` | Cy Young vote-pct simulation; with ×1e6'd canonical salaries the differential saturates the 55-97 clamp | DEAD (latent broken) | :116 feed | Re-base 500000 divisor to canonical spread (design call) |
| :1480 | `const winnerPct = … Math.round(75 + (winner.salary - runnerUp.salary) / 500000) … : 92;` | MVP variant of same | DEAD (latent broken) | :116 feed | Same |
| :1364 | `${(winner.salary / 1000000).toFixed(1)}M` | Cy Young display; ×1e6 then ÷1e6 cancel → renders the raw canonical number with an "M" suffix ("$143641.0M") | DEAD (latent broken) | :116 + :1364 | `formatSalary` |
| :1513 | `${(winner.salary / 1000000).toFixed(1)}M` | MVP display, same cancel | DEAD (latent broken) | same | `formatSalary` |
| :1800 | `${(bestValue.salary / 1000000).toFixed(1)}M` | Kara Kawaguchi (best value) display | DEAD (latent broken) | same | `formatSalary` |
| :1915 | `${(worstValue.salary / 1000000).toFixed(1)}M` | Bust of the Year display | DEAD (latent broken) | same | `formatSalary` |

**A5 sweep extras vs F-134:** :1335 and :1480 (the /500000 vote-pct divisors) are new. `:1605-1608 totalGames` is a local `wins + losses` (manager records) — not a salary or SeasonMetadata site.

### 1.4 FreeAgencyFlow.tsx
**A1 Reachability:** Gate FranchiseHome.tsx:2535 `canUseOffseasonExecution && activeTab === "free-agency"` → render :2547 → false (R3) → **unreachable today**.
**A2 Data:** `useOffseasonData` (:3) → `convertToLocalPlayer` :69-77 with `salary: player.salary` (**raw canonical dollars — no ×1e6 here**, unlike the other flows). Persistence: `saveAndClose` (:524) writes `offseasonState.saveFreeAgentSignings(signings, declinedPlayers)` (:551) and mutates `leagueBuilderStorage` rosters via `transferPlayer` (:555+), guarded by `shouldBlockFranchiseTemplateMutation(franchiseId)` (:525).

| Site | Code (verbatim) | Wiring verdict | Classification | Evidence | Fix direction |
|------|-----------------|----------------|----------------|----------|---------------|
| :541 | `contractValue: m.player.salary * 1000000, // Convert to full value` | Persisted into FreeAgentSigning records on saveAndClose | DEAD (latent LIVE-BROKEN **with persistence** on flag flip — canonical $143,641 stored as $143.6B) | R3/R4; :551 | Delete ×1e6 |
| :1353-1359 | `const incomingTrueValue = incomingPlayer.salary; const salaryMin = incomingTrueValue * 0.9; const salaryMax = incomingTrueValue * 1.1; … p.salary >= salaryMin && p.salary <= salaryMax` | ±10% return-player matching — **ratio math, scale-invariant: numerically correct under canonical dollars** | DEAD (math OK; labels broken, see next rows) | code read | No math change needed |
| :1457 | `True Value: ${incomingTrueValue.toFixed(1)}M` | Canonical dollars formatted as $M without divide → "$143641.0M" | DEAD (latent broken display) | :75 raw feed | `formatSalary` |
| :1472 | `True Value: ${selectedReturn.salary.toFixed(1)}M` | same | DEAD (latent broken display) | same | `formatSalary` |
| :1495-1496 | `(${salaryMin.toFixed(1)}M - ${salaryMax.toFixed(1)}M)` / `(${closestPlayer?.salary.toFixed(1)}M)` | same | DEAD (latent broken display) | same | `formatSalary` |
| :1508 | `${salaryMin.toFixed(1)}M - ${salaryMax.toFixed(1)}M … ±10% of ${incomingTrueValue.toFixed(1)}M` | same | DEAD (latent broken display) | same | `formatSalary` |
| :1542 | `{player.position} • ${player.salary.toFixed(1)}M` | same | DEAD (latent broken display) | same | `formatSalary` |
| :1587 | `{player.position} • ${player.salary.toFixed(1)}M` | same | DEAD (latent broken display) | same | `formatSalary` |

**A5 sweep extras vs F-134:** F-134 knew only :541. The seven `.toFixed(1)}M`-without-divide sites (:1457, :1472, :1495, :1496, :1508, :1542, :1587) are **new** — caught by M-suffix-formatter grep, invisible to the `1000000` grep. The ±10% block (:1353-1382) is scale-safe math with broken labels. Numeric-literal grep found nothing else (only :97 `DROOPY` false-positive).

### Part A verdict summary
- **LIVE-BROKEN today: 0 sites.** (TeamHubContent, the one live $M consumer, was already fixed under T5-FIX-2 — consistent with F-134.)
- **DEAD, double-gated (flag + isFranchiseContext/disabled buttons): 5 sites** (FinalizeAdvanceFlow :130*, :376-380, :396-397, :2071 — *:130 is single-gated but only fires on falsy salary).
- **DEAD, unreachable legacy branch: 4 sites** (TradeFlow :128, :1185, :1255, :1340).
- **DEAD, flag-gated with latent LIVE-BROKEN on `FRANCHISE_V1_OFFSEASON_EXECUTION_ENABLED = true`: 16 sites** (FinalizeAdvanceFlow :793; AwardsCeremonyFlow :116, :1335, :1364, :1480, :1513, :1800, :1915; FreeAgencyFlow :541 + 7 display sites).
- Highest-consequence latent site: **FreeAgencyFlow :541** — the only one that PERSISTS a wrong-scale dollar value.

---

## 2. PART B — SeasonMetadata.totalGames Consumer Table (F-135)

### 2.0 Writer map (context for every consumer verdict)
| Writer | Code | Semantics |
|--------|------|-----------|
| franchiseInitializer.ts:423 | `await createFranchiseSeasonMetadata(franchiseId, 1, 0, config.season.gamesPerTeam);` | New franchise: **totalGames = 0** (schedulePolicy is `empty-manual-user-supplied`, initialScheduleRows 0) |
| franchiseInitializer.ts:464 | `await createFranchiseSeasonMetadata(franchiseId, newSeasonNumber, 0, null);` | Season transition: **totalGames = 0** |
| franchiseInitializer.ts:240-246 → :312 | `deriveSeasonTotalGames = (await getAllGamesByFranchise(franchiseId, seasonNumber)).length` — called ONLY from `repairFranchisePersistence` (:312) | Repair overwrites totalGames with **league-wide schedule ROW COUNT** (ensureFranchiseSeasonMetadata updates whenever `existing.totalGames !== totalGames`, :215). FranchiseHome runs repair on load (FranchiseHome.tsx:272) — so in practice franchise totalGames ≡ current schedule row count: 0 if empty, partial if partially entered, league-total (not per-team!) if full |
| seasonAggregator.ts:159 | `seasonTotalGames ?? milestoneConfig?.gamesPerSeason ?? DEFAULT_TOTAL_GAMES` (create-only; no caller passes seasonTotalGames — grep: defined/destructured only at :128/:151/:159) | Non-franchise create path, config-sourced |
| useSeasonStats.ts:340 / useSeasonData.ts:69,:98 | `getOrCreateSeason(…, DEFAULT_TOTAL_GAMES)` / `initializeSeason(…, totalGames)` | Create-only; `initializeSeason` has **no callers** (grep: only unrelated `useMWARCalculations` local of same name) |

**B3 zero/partial behavior:** `getOrCreateSeason` never overwrites an existing record's totalGames (seasonStorage.ts:519-531), so a franchise season carries 0 until repair backfills the row count; `??` fallbacks downstream do NOT catch 0 (0 is not nullish).

### 2.1 Consumer table

| # | Consumer site | Code (verbatim) | Wiring verdict | Classification | Evidence | Fix direction |
|---|---------------|-----------------|----------------|----------------|----------|---------------|
| B-1 | src/hooks/useSeasonStats.ts:331 | `const seasonGames = seasonMetadata?.totalGames ?? DEFAULT_TOTAL_GAMES;` → toBattingLeaderEntry :411 / toPitchingLeaderEntry :432 → `calculateBWARSimplified(…, seasonGames)` :212, `calculateRWARSimplified` :219, `calculatePWARSimplified` :251 | **LIVE**: consumed by TeamHubContent.tsx:1202, pages/SeasonSummary.tsx:230 (routed App.tsx:64), useFranchiseData.ts:368 → FranchiseHome leaders tab | **CONFIG-TRUTH-NEEDED** (highest priority). Two failure modes: (a) totalGames=0 → `runsPerWinForSeason(0)` = baseline × 0/162 = 0 (franchiseAdaptiveStandards.ts:177 + :116-117, no zero-guard) → `bWAR = runsAboveReplacement / runsPerWin` (bwarCalculator.ts:252) = ±Infinity — the :212 guard checks `isNaN` only, 0 passes; (b) full schedule → totalGames is LEAGUE-TOTAL rows while WAR scaling expects PER-TEAM season length → ~(numTeams/2)× mis-scale | quoted | Read gamesPerTeam (config truth, W1 field) with explicit fallback + zero-guard |
| B-2 | src/hooks/useSeasonStats.ts:366 | `calculatePreferredFWARFromPersistedFieldingSet(…, metadata?.totalGames ?? DEFAULT_TOTAL_GAMES, …)` | Same LIVE chain as B-1 | **CONFIG-TRUTH-NEEDED** (same two failure modes for fWAR) | quoted | Same as B-1 |
| B-3 | src/src_figma/hooks/useFranchiseData.ts:580 | `const totalGames = seasonData.seasonMetadata?.totalGames ?? 64;` → :606 `totalGames: totalGames` (nextGame info), :643 hook return | LIVE hook (FranchiseHome.tsx:264, SeasonSummary.tsx:228) — but no found consumer renders the totalGames VALUE: FranchiseHome reads only `nextGame?.awayRecord/homeRecord` (:3896, :3906); SeasonSummary page reads standings/config (gamesPerTeam at :558). Downstream display of this field: **none found** | **CONFIG-TRUTH-NEEDED (low impact — value computed, apparently un-rendered)** | quoted | Source from gamesPerTeam when the field gains a renderer; candidate for removal |
| B-4 | src/utils/franchiseValueInputs.ts:393 | `buildSeasonContext(…, scheduleRows.length, seasonMetadata?.totalGames ?? null)` → stored as `seasonMetadataTotalGames` diagnostic with `scheduleRowsUsedAsSeasonLength: false`; season length comes from config gamesPerTeam (:375-379) | LIVE (W1 spine). Field consumed nowhere else (grep: only :57/:176/:187 — declaration/param/assignment) | **ROW-COUNT-CORRECT** (deliberate W1 diagnostic snapshot; no scaling use) | quoted | None |
| B-5 | src/hooks/useWARCalculations.ts:292, :309, :334, :371, :410 | `setSeasonGames(activeSeason.totalGames)` + `calculate*Simplified(…, activeSeason.totalGames)` | Hook consumed ONLY by src/components/GameTracker/{PlayerCard.tsx:152, SeasonSummary.tsx:86, WARDisplay.tsx:83+} — and those three components have **zero importers** (global grep matches only archived-tests; no relative imports inside components/GameTracker; "WARDisplay" hits elsewhere are unrelated MWARDisplay) | **DEAD** (orphaned hook+components) | quoted | Cleanup candidate; if revived, same fix as B-1 |
| B-6 | src/components/GameTracker/SeasonSummary.tsx:175 | `{metadata.gamesPlayed} / {metadata.totalGames} games played` | Same orphaned component set as B-5 | **DEAD** | B-5 evidence | None |
| B-7 | src/src_figma/app/components/SeasonEndFlow.tsx:69, :464, :585 | `totalGames: number;` / `Total Games: {archive.totalGames}` / `{archive.totalGames.toLocaleString()}` | `grep -rn "SeasonEndFlow"` outside its own file: **no importers** | **DEAD** (orphaned component) | quoted | None |
| B-8 | src/utils/franchiseSeasonSummaryStorage.ts:721 | `schedule: { …, totalGames: scheduleGames.length, gameIds: …, completedGameIds: …, … }` (+ :717 deep-clones seasonMetadata as-is) | LIVE summary snapshot writer | **ROW-COUNT-CORRECT** — the field describes the schedule snapshot itself; row count IS the truth here. (Cloned seasonMetadata inherits whatever totalGames holds — informational) | quoted | None |
| B-9 | src/utils/almanacQueries.ts:2360 | `console.log('[M4-1] getPlayerExhibitionStats query', { …, totalGames: games.length, … })` | Debug log counting actual exhibition game records | **ROW-COUNT-CORRECT** (counting real games is the intent) | quoted | None |
| B-10 | src/utils/scheduleStorage.ts:192-193 | `totalGamesScheduled: games.length, totalGamesCompleted: games.filter(g => g.status === 'COMPLETED').length` | Different fields (own-store stats); not SeasonMetadata.totalGames | **ROW-COUNT-CORRECT** | quoted | None |
| B-11 | src/engines/calibrationService.ts:290 | `totalGames: sum(seasons, s => s.totalGames)` | `grep -rn "calibrationService"` non-test: **zero references** (not even engines/index) | **DEAD** (orphaned engine) | quoted | None |
| B-12 | src/utils/franchiseManager.ts:61 | `export interface FranchiseStats { totalGames: number; … }` | `grep -rn "FranchiseStats"` non-test: only the definition line | **DEAD** (unused type) | quoted | None |
| B-13 | src/engines/tradeEngine.ts:76-87 | `getTradeDeadlineGame(totalGames) = floor(totalGames * 0.65)`, `isTradeWindowOpen`, `isTradeDeadlineApproaching` | No callers anywhere outside tradeEngine.ts (grep) | **DEAD** (orphaned functions; parameter, not a metadata read) | quoted | When wired, feed gamesPerTeam — NOT metadata.totalGames |
| B-14 | src/engines/calendarEngine.ts:59-133 | totalGames params (all-star :109, deadline :115, season-end :121, progress :131 with `totalGames <= 0` guard) | `grep -rn "calendarEngine"` importers: **none** | **DEAD** (orphaned engine) | quoted | Same note as B-13 |
| B-15 | src/engines/fanMoraleEngine.ts:629-645 | `calculateExpectedWins(…, totalGames = MLB_BASELINE_GAMES)` | Only re-exported by fanMoraleIntegration.ts:55/:121; no call site passes a value | **DEAD** (un-called with respect to totalGames) | quoted | Same note as B-13 |
| B-16 | src/engines/mwarCalculator.ts:613-625 | `calculateOverperformance(…, totalGames)` → `overperformanceWins = overperformance * totalGames` | Live caller AwardsCeremonyFlow.tsx:1605-1608 passes `totalGames = wins + losses` (actual games played — correct semantics for over-performance attribution); flow itself flag-dead (R3) | **ROW-COUNT-CORRECT** (parameter fed by actual W+L, not metadata) | quoted | None |
| B-17 | src/utils/franchiseStorage.ts:153-156 | `isLeaderTrackingActive(currentGame, totalGames, …) => currentGame >= totalGames * 0.1` | Both call sites pass `config.gamesPerSeason` (milestoneAggregator.ts:714, dual copies) — config truth already | **ROW-COUNT-CORRECT** (param name is stale; value is config-sourced) | quoted | Optional rename only |
| B-18 | src/archived-components/SeasonProgressTracker.tsx, src/archived-pages/SeasonDashboard.tsx, ScheduleGenerationHub.tsx | various | archived-* dirs are not imported (CLAUDE.md) | **DEAD** (archived) | path | None |

Excluded as not-totalGames-consumers (same-named locals over actual W/L or schedule targets): AwardsCeremonyFlow.tsx:1605 (`wins + losses`), seasonStorage.ts:979 (`team.wins + team.losses`), scheduleGenerator.ts:50 (`(gamesPerTeam * numTeams) / 2` — config-derived target).

### 2.2 B3 answers
- **deriveSeasonTotalGames call sites:** exactly one — franchiseInitializer.ts:312 inside `repairFranchisePersistence` (definition :240-246). Repair runs from FranchiseHome on load (:272), so the row-count value continuously re-asserts itself.
- **Breaks on totalGames=0:** YES — B-1/B-2: `runsPerWinForSeason(0) = 0` (no guard, franchiseAdaptiveStandards.ts:116-117/:177) → `bWAR = RAR / 0 = ±Infinity` (bwarCalculator.ts:252; the isNaN-only guard at :212 passes 0). Live surface: leaders WAR columns in TeamHubContent, SeasonSummary page, FranchiseHome leaders.
- **Breaks on partial counts:** YES — repair overwrites totalGames with the partial row count (:215 update condition), so leader WAR mis-scales continuously as a manual schedule is being entered.
- **Breaks on FULL counts too (new sharpening of F-135):** totalGames is league-wide rows; WAR season-scaling expects per-team games. Even a complete schedule yields a ~(numTeams/2)× scale error in B-1/B-2. gamesPerTeam is the only correct source.

---

## 3. Fix Queue — Proposed Codex 5.5 | high Tickets (ordered)

| # | Ticket | File scope | Risk class | Why this order |
|---|--------|-----------|------------|----------------|
| 1 | **F135-T1: useSeasonStats season-length source** — replace `seasonMetadata?.totalGames` (:331, :366) with gamesPerTeam-first resolution + zero-guard; regression tests for totalGames=0, partial, league-total | src/hooks/useSeasonStats.ts (+ test) | **HIGH** (live WAR display on three routed surfaces) | Only LIVE defect found in the whole sweep |
| 2 | **F134-T1: FreeAgencyFlow canonical pass** — delete ×1e6 at :541; swap 7 raw-`M` formatters to `formatSalary` (salaryCalculator.ts:1337); leave ±10% ratio math | FreeAgencyFlow.tsx | **HIGH** (FA persistence: saveFreeAgentSignings + leagueBuilderStorage transferPlayer) | Worst latent site — persists wrong-scale dollars the day the offseason flag flips |
| 3 | **F134-T2: AwardsCeremonyFlow canonical pass** — delete ×1e6 (:116); re-base /500000 vote divisors (:1335, :1480) to canonical spread (needs one JK design ruling on intended vote sensitivity); formatter swap (:1364, :1513, :1800, :1915) | AwardsCeremonyFlow.tsx | MEDIUM (display + simulated votes; persisted AwardWinner carries no salary) | Latent, no persistence |
| 4 | **F134-T3: FinalizeAdvanceFlow canonical pass** — fallback :130; rookie grade table :376-380 → T5 rookie-scale values (JK design hook exists per T5 contract); thresholds :396-397 ÷BRIDGE; formatters :793, :2071 | FinalizeAdvanceFlow.tsx | MEDIUM-HIGH (file hosts season-transition trigger; the $M sites themselves are roster-UI only) | Latent, double-gated |
| 5 | **F134-T4: TradeFlow legacy-branch disposition** — recommend DELETE ActiveTradeFlow (+convertToLocalPlayer/convertToLocalTeam/mock blocks) rather than re-denominate; it is unreachable and duplicates the live console | TradeFlow.tsx | **HIGH-by-rule** (trade state file) though code is dead | Last: pure cleanup, biggest diff |
| 6 | **F135-T2: dead-consumer cleanup batch** (optional, JK call) — orphans: useWARCalculations + GameTracker WARDisplay/PlayerCard/SeasonSummary trio, SeasonEndFlow, calendarEngine, calibrationService, FranchiseStats type, tradeEngine deadline fns, useSeasonData.initializeSeason; plus useFranchiseData:580 `?? 64` re-source | multiple | LOW | No behavior change today |

Shared precondition for tickets 2-4: the canonical formatter already exists — `formatSalary` (src/engines/salaryCalculator.ts:1337), already adopted by TeamHubContent (T5-FIX-2, TeamHubContent.tsx:163).

---

## 4. Out-of-Scope Candidate Findings (logged, NOT chased)

| ID | Candidate | Evidence |
|----|-----------|----------|
| C-1 | **useOffseasonData serves the STOCK league, not franchise data**: all four offseason flows read `getAllTeams()/getAllPlayers()` from static `playerDatabase` (useOffseasonData.ts:292-298) — when the offseason flag flips, FinalizeAdvance/Awards/FA will show stock rosters regardless of franchise state. A denomination fix alone does not make these flows correct. | useOffseasonData.ts:15, :292-298 |
| C-2 | useOffseasonData synthesizes display stats from salary: `war: salary / 20_000`, `careerStats` derived from salary arithmetic (:233-238) — dummy-data pattern inside a "real data" hook | useOffseasonData.ts:233-238 |
| C-3 | FinalizeAdvanceFlow fabricates `war: 1.0 + Math.random() * 4` and `chemistry: 50 + Math.floor(Math.random() * 30)` per render-convert (:132, :233) | FinalizeAdvanceFlow.tsx:132, :233-241 |
| C-4 | useFranchiseData hardcodes `?? 64` as the totalGames fallback (:580) — magic number, disagrees with useSeasonStats' 162 fallback | useFranchiseData.ts:580 |
| C-5 | Dual `milestoneAggregator` copies both call isLeaderTrackingActive (src/utils/ + src/src_figma/utils/, :714 in each) — known dual-copy hazard class | both files :45/:714 |
| C-6 | AwardsCeremonyFlow uses salary as a universal WAR/merit proxy for every award (B-16 table rows :403-:1454) — award integrity issue independent of denomination | AwardsCeremonyFlow.tsx:403-413 etc. |
| C-7 | Dead duplicate hook: src/src_figma/app/hooks/useSeasonStats.ts (214 lines, "MAJ-01" header) — zero importers (Captain grep 2026-06-12, all 7 import sites resolve to src/hooks/useSeasonStats.ts); no totalGames reference, so carries no F-135 defect. Fold into F135-T2 cleanup. | Captain verification batch, post-report |

---

## 5. Classification Counts

**Part A (25 $M-scale sites across 4 files):** LIVE-BROKEN 0 · DUMMY-INERT 0 · DEAD 25 — of which 16 are latent-LIVE-BROKEN behind `FRANCHISE_V1_OFFSEASON_EXECUTION_ENABLED` (1 with persistence: FreeAgencyFlow:541), 4 dead behind the TradeFlow franchiseId branch, 5 double-gated. 10 sites are NEW vs the F-134 known list (TradeFlow:1255; Awards:1335/:1480; FreeAgency:1457/:1472/:1495/:1496/:1508/:1542/:1587).
**Part B (18 consumer clusters):** CONFIG-TRUTH-NEEDED 3 (B-1, B-2 live — the only live defect; B-3 low) · ROW-COUNT-CORRECT 6 (B-4, B-8, B-9, B-10, B-16, B-17) · DEAD 9 (B-5, B-6, B-7, B-11, B-12, B-13, B-14, B-15, B-18) · UNVERIFIED 0.

**DISCOVERY COMPLETE**
