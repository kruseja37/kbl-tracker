# Franchise Engine API Map

**Generated:** 2026-06-19 (REFRESH — supersedes `spec-docs/archive/FRANCHISE_API_MAP.md`, 2026-02-08)
**Discovery method:** static analysis (direct read of `processCompletedGame.ts`) + 3 parallel catalog sweeps + executed proof-of-life (`test-utils/seasonSimulator.test.ts` → 4 passed this session).

> **What changed since the Feb-08 map:** that map predates the entire L-stack. It listed
> 18 engines / 31 storage files across SEPARATE IndexedDB databases
> (`kbl-season-stats`, `kbl-career-stats`, `kbl-event-log`). Those are now CONSOLIDATED
> into the single shared **`kbl-tracker` v24** (via `trackerDb.ts`), and ~30 new
> franchise engines/stores were added (True Value, awards/race, fame, morale matrix,
> designations, traits, flashpoint, L10 events, L11 managers, L12 All-Star/races).

> **Confidence marks:** the Pipeline Architecture + Completed-Game Contract + Fan-Out
> (§1–§3) were read DIRECTLY from `src/utils/processCompletedGame.ts` (verified). Engine
> rows in §4 come from broad parallel cataloging; rows marked **†** have function
> signatures that were inferred/partially read — confirm against code before relying on
> an exact signature. Store names + DB versions in §5 were read from `trackerDb.ts`.

---

## 1. Pipeline Architecture Classification

**Game-completion pipeline: B (Orchestrated but Extractable).** ✅ verified

`src/utils/processCompletedGame.ts` exports a single pure async orchestrator,
`processCompletedGame(gameState, options?, leagueId?, archiveOptions?)` (line 521). It
is the **non-React equivalent of `completeGameInternal`** (in `useGameState.ts`). It has
ZERO React dependencies — pure TypeScript over IndexedDB — and is directly callable from
a Node/vitest script with a `fake-indexeddb` shim.

**Implications for testing / the season simulator:**
- All `src/engines/` files are pure TS → directly importable/callable.
- All `src/utils/` storage uses IndexedDB → needs `fake-indexeddb/auto`.
- The season simulator is viable as a **vitest script** (NOT pure Node — no `tsx` in repo).
- **This already exists and passes:** `test-utils/seasonSimulator.test.ts`
  (`generateRoster` → `generateSyntheticGame` → `processCompletedGame`, 48-game
  accumulation). A minimal smoke variant is `test-utils/franchise-proof-of-life.ts`.

---

## 2. Completed-Game Data Contract

**Input type:** `PersistedGameState` — defined `src/utils/gameStorage.ts:67`. Produced by
`useGameState.completeGameInternal` (live) or `generateSyntheticGame` (sim). Key fields
the downstream engines actually READ:

```ts
interface PersistedGameState {
  id: 'current'; gameId: string; savedAt: number;
  inning, halfInning, outs, homeScore, awayScore, bases, currentBatterIndex, atBatCount;
  awayTeamId/homeTeamId/awayTeamName/homeTeamName: string;
  seasonNumber: number;
  // scope/competition routing (read by the fan-out for franchise vs playoff vs exhibition):
  seasonId?, statsScopeId?, franchiseId?, competitionType?, competitionId?, competitionName?;
  playoffId?, playoffSeriesId?, playoffGameNumber?, isEliminationGame?, scheduleGameId?;
  // batting (per playerId):
  playerStats: Record<string, { playerName, teamId, pa, ab, h, singles, doubles, triples,
    hr, rbi, r, bb, hbp, k, sb, cs, sf, sh, gidp, putouts, assists, fieldingErrors,
    grandSlams?, d3kOutcomes?, divingCatches?, robberies?, nutshots? }>;
  // pitching (accumulated array):
  pitcherGameStats: Array<{ pitcherId, pitcherName, teamId, isStarter, entryInning,
    outsRecorded, hitsAllowed, runsAllowed, earnedRuns, walksAllowed, strikeoutsThrown,
    decision?, ... }>;
  awayLineup/homeLineup, awayLineupState/homeLineupState; // → lineup positions for WAR
  playerRatingsSnapshots?; // written by the pipeline (capturePlayerRatingsSnapshots)
}
```

**Option params (also part of the contract):**
- `options?: GameAggregationOptions & AdaptiveStandardsConfigInput` — carries `seasonId`,
  `detectMilestones`, `gamesPerTeam`/`gamesPerSeason`/`milestoneConfig` (season-length
  for WAR scaling), etc.
- `archiveOptions?: { finalScore?, inningScores?, seasonId?, context? }` — `context`
  carries the franchise/playoff routing (`competitionType`, `franchiseId`, `playoffId`,
  `scheduleGameId`, `leagueId`, …) and OVERRIDES the gameState fields when present.

---

## 3. Fan-Out Topology (read directly from `processCompletedGame.ts`) ✅ verified

Sequential `await`s (NOT React side-effects). Idempotency guards first
(`getCompletedGameById`, `getGameHeader().aggregated`). The regular-season branch is
gated by `shouldAggregateToRegularSeasonStats()` (skips `competitionType` playoff/
elimination + any playoff ids). **Every downstream branch is try/caught and NON-FATAL
(warn + continue) EXCEPT aggregation (Step 1), which throws.**

```
processCompletedGame(gameState, options, leagueId, archiveOptions)
│
├─ [gate] shouldAggregateToRegularSeasonStats? ── no ─▶ skip to archive (Step 2/3)
│
├─ 1. aggregateGameToSeason(gameState, options)            seasonAggregator.ts  [THROWS on fail]
│       └▶ season batting/pitching/fielding + milestones + fame (regular-season stores)
│
├─ 2. persistSeasonWarAfterAggregation                     → warOrchestrator.calculateAndPersistSeasonWAR
│       (resolves seasonGames via getSeasonMetadata/adaptive; participantIds; positions)
│       └▶ if warScope:
│          ├─ 3. persistTrueValueAfterWar                  → franchiseTrueValueStorage
│          │      .calculateAndPersistFranchiseTrueValueForSeason
│          │     └▶ if trueValueScope:
│          │        ├─ persistTrueValueSnapshotsForCompletedGame  → franchiseTrueValueSnapshotsStorage
│          │        ├─ [flag isFranchisePhase2FameEnabled]        persistDarkFameRecordsForCompletedGame
│          │        ├─ [flag …FlashpointEnabled]                  persistDarkFlashpointDecayForCompletedGame
│          │        ├─ [flag …CheckpointEnabled]                  persistDarkCheckpointSweepForCompletedGame
│          │        ├─ [flag …TraitsEnabled]                      persistDarkTraitGrantForCompletedGame
│          │        ├─ [flag …L10Enabled]                         persistDarkL10ForCompletedGame
│          │        ├─ [flag …L11Enabled]                         persistDarkL11AutoBackstopForCompletedGame
│          │        ├─ [flag …L12Enabled]   recomputeFranchiseL12StandingsForCompletedGame
│          │        │                      + persistFranchiseAllStarRosterForCompletedGame
│          │        └─ persistProjectedDesignationsAfterTrueValue → franchiseDesignationStorage
│          │              └─ [flag …MoraleEnabled] persistDesignationMoraleConsequencesAfterTrueValue
│          │                    → masterMoraleMatrix.composeMoraleConsequence
│          │                    → franchiseMoraleState.applyFranchiseMoraleMatrixConsequence
│
├─ markGameAggregated(gameId)                              eventLog
├─ capturePlayerRatingsSnapshots(gameState, leagueId)      (writes playerRatingsSnapshots)
├─ 2'. archiveCompletedGame(...)                           gameStorage → completedGames store
└─ 3'. registerCompletedGameForAlmanac()                   registerAlmanacPlayers → almanacCanonicalPlayers
```

**Async/timing:** all branches are synchronous-sequential awaits within the one call —
no useEffect, no deferred render. The 7 "dark" branches are behind
`isFranchisePhase2*Enabled` flags (default OFF → no-ops in normal play).

---

## 4. Engine Maps by Domain

`src/engines/` (pure TS, React-coupled: **NO** throughout) + `src/src_figma/app/engines/`
integration wrappers. (Rows from parallel cataloging; **†** = signature not fully verified.)

> **⚠ HARNESS-BUILD RULE (explicit instruction, not a caveat):** §1–§3, the §5 store/
> version data, and the §7 WAR dimensions were direct-read and are trustworthy. The §4
> engine rows marked **†** had their signatures inferred from broad parallel cataloging,
> NOT a direct read. When the sim-harness build reaches for a **†** signature, it MUST
> re-read that signature from the engine source at the moment of use and never trust the
> map's version. State this in the harness-build dispatch contract — do not leave it as an
> assumption. A wrong † signature sends the builder down a hallucinated path.

### Stats / utility
| File | Purpose | Primary export |
|---|---|---|
| `engines/percentile.ts` | percentile rank for standings/merit | `getPercentile(value, sortedArray)` ✅ |
| `engines/notabilityScorer.ts` † | play notability for commentary | `calculateNotability(playContext)` |
| `engines/parkFactorDeriver.ts` † | park factors from team stats | `deriveParkFactors(teamStats)` |

### Calculation engines (WAR) — testable dimensions in §7
| File | Primary export |
|---|---|
| `engines/bwarCalculator.ts` | `calculateBWAR` (200), `calculateBWARSimplified` (273), `calculateBWARBatch` (288) ✅ |
| `engines/pwarCalculator.ts` | `calculateFIP` (125), `calculatePWAR` (289), `calculatePWARSimplified` (376) ✅ |
| `engines/fwarCalculator.ts` | `calculatePreferredFWARFromPersistedFieldingSet` (798) ✅ |
| `engines/rwarCalculator.ts` | `calculateRWARSimplified` (494) ✅ |
| `engines/mwarCalculator.ts` † | `calculateSeasonMWAR`, `createManagerDecision`, `resolveDecision` |
| `engines/wpaCalculator.ts`, `wpaV2.ts`, `winExpectancyTable.ts`, `mlbSavantWinExpectancy.ts`, `winExpectancyModelV2.ts` † | WPA / win-expectancy substrate |
| `src_figma/app/engines/warOrchestrator.ts` | `calculateAndPersistSeasonWAR` — orchestrates all 5 WAR calcs (called by the pipeline §3) ✅ |

### Economy / Salary / Value
| File | Primary export |
|---|---|
| `engines/salaryCalculator.ts` | `calculateSalary` (853), `calculateSalaryWithBreakdown` (764) ✅ |
| `engines/ivEngine.ts` † | Integrated Value (kblIV) — `computeIV` |

### Mojo / Fitness
| File | Primary export |
|---|---|
| `engines/mojoEngine.ts` † | `applyMojoChange`, `processMojoTriggers`, stat multipliers |
| `src_figma/app/engines/playerStateIntegration.ts` | re-exports mojo/fitness/clutch |

### Franchise / Standings / Awards
| File | Primary export |
|---|---|
| `engines/franchiseRaceStandingScorer.ts` | `computeFranchiseRaceStanding({…})` (59); `MERIT_RACE_WEIGHTS`, `FAN_VOTE_WEIGHTS` ✅ |
| `engines/franchiseTvFamilyScorer.ts` † | `computeFranchiseTvFamilyRaces()` (KK/Bust/Comeback) |
| `engines/franchiseAllStarSelector.ts` † | `selectAllStarRoster(candidates, config)` |
| `engines/franchiseAwardsEngine.ts` † | `scoreForCategory` / award category scoring |
| `engines/hofEngine.ts`, `playoffEngine.ts`, `leagueConstruction.ts` † | HOF / playoff bracket / league+schedule |

### Morale / Fame / Designation
| File | Primary export |
|---|---|
| `engines/masterMoraleMatrix.ts` | `composeMoraleConsequence(...)` — personality tilt + player/fan deltas (called by pipeline §3) ✅ |
| `engines/fanMoraleEngine.ts` † | `processMoraleEvent`, `calculateExpectedWins`, 7 states |
| `engines/fanMoraleDampener.ts` † | dampener primitive (L5 owns; L8 consumes) |
| `engines/fameEngine.ts`, `fameModel.ts` † | fame accrual + `resolveFameTier`/`FAME_TIER_RANK` |
| `engines/designationFanMorale.ts`, `designationFameNudge.ts` † | designation→sentiment / fame nudge |
| `src_figma/app/engines/{fameIntegration,fameAutoDetections,famePromotion,fanMoraleIntegration}.ts` | UI wrappers |

### Trait
| File | Primary export |
|---|---|
| `engines/traitAcquisition.ts`, `traitRealityScorer.ts`, `traitOverlayConfirmation.ts` † | trait gain/loss proposals, reality percentile, confirmation |

### Event / Milestone / Manager
| File | Primary export |
|---|---|
| `engines/franchiseL10EventEngine.ts` † | last-10 narrative events |
| `engines/franchiseL11FiringEngine.ts` † | manager firing eval |
| `engines/managerWpaRecommendations.ts` † | in-game sub recs (T9 — wiring `recommendSubs`) |
| `engines/narrativeEngine.ts` † | beat-reporter / storyline generation |

### Other (in-game substrate, mostly GameTracker-adjacent)
`leverageCalculator`, `ratingsAdjustmentEngine`, `ratingsDevelopment`, `agingEngine`,
`relationshipEngine`, `effectiveRatings`, `subRecommendations`, `calendarEngine`,
`h2hTracker`, `fanHopefulCushion` + figma wrappers (`agingIntegration`,
`relationshipIntegration`, `d3kTracker`, `inheritedRunnerTracker`, `saveDetector`,
`mwarIntegration`). †

**Orphan scan:** the engines agent grepped importers and found **no fully-orphaned**
engine files (each has ≥1 importer). Not re-verified per-file here.

---

## 5. Storage & Type Layer (`src/utils/`, `src/types/`)

**Primary DB: `kbl-tracker` v24** via `src/utils/trackerDb.ts` (single shared
initializer — `getTrackerDb`/`TRACKER_DB_VERSION`). Other DBs: `kbl-schedule` v2
(`scheduleStorage`), `kbl-league-builder` (`leagueBuilderStorage`),
`kbl-franchise-morale-daily-snapshots` v1, and a per-franchise morale store
(`franchiseMoraleState`).

**Key franchise stores (kbl-tracker), with the version they were added:**
`franchiseSeasonSummaries` (v12) · `franchiseSeasonLedgerRows` (v15) · `seasonNewsItems` +
`seasonEmissionConfig` (v16) · `franchiseTrustedValueArtifacts` (v17) ·
`franchiseAwardsRows` + `franchiseTrueValueSnapshots` (v18) · `franchiseFameRecords` (v19)
· `franchiseFlashpointDecay` (v20) · `franchiseRatingsOverlays` (v21) ·
`franchiseTraitOverlays` (v22) · `franchiseL10Overlays` (v23) · `franchiseAllStarRosters`
(v24). Core stat stores: `playerSeason{Batting,Pitching,Fielding}`, `seasonMetadata`,
`playerCareer{Batting,Pitching,Fielding}`, `careerMilestones`, `completedGames`,
`franchiseTrueValueRows`, `franchiseDesignationRows`, `almanacCanonicalPlayers`.

**Aggregation:** `seasonAggregator.ts` (game→season; THROWS on fail) ·
`milestoneAggregator.ts` + `milestoneDetector.ts` (milestone detection — both have FULL
duplicate copies in `src/src_figma/utils/`, not re-exports).

**Known dual-copy gotcha:** `gameStorage` / `seasonStorage` / `careerStorage` exist in
BOTH `src/utils/` and `src/src_figma/utils/` (the figma ones are re-exports);
`milestoneAggregator` / `milestoneDetector` are FULL copies. Keep in sync.

**Types:** `src/types/{game,war,franchise,index}.ts` + `managerWpa.ts`, `reporter*.ts`
(plus figma mirrors under `src/src_figma/app/types/`). `war.ts` carries `SMB4_BASELINES`,
`SEASON_GAMES`, linear weights.

---

## 6. Hooks (React-coupled by definition)

`src/hooks/`: `useSeasonStats` (on-the-fly bWAR/pWAR/fWAR/rWAR via the calculators +
`seasonStorage`) · `useMWARCalculations` · `useClutchCalculations` · `useDataIntegrity`
(startup re-aggregation via `seasonAggregator`) · `useCareerStats` · `useLiveStats` ·
`useFanMorale` · `useFameDetection` · `useGamePersistence` · `useSeasonData` ·
`useRelationshipData` · `useAgingData` · `useOffseasonPhase`.

`src/src_figma/hooks/` (franchise UI bridges): **`useFranchiseData`** (season + standings
+ leaderboards → FranchiseHome; null until games played) · `usePlayoffData`
(`playoffEngine` + `playoffStorage`) · `useScheduleData` (`scheduleStorage`) ·
`useMuseumData` · `useOffseasonState`/`useOffseasonData` · `useLeagueBuilderData`.

---

## 7. WAR Testable Dimensions (from code + spec docs)

| Calc | Primary fn | Key constants (SMB4) | NaN/∞ edge cases | Tolerance |
|---|---|---|---|---|
| bWAR | `calculateBWAR` | leagueWOBA 0.329, wobaScale 1.7821, replacement −12.0/600PA; wOBA weights uBB .69/HBP .72/1B .87/2B 1.25/3B 1.58/HR 2.01 | PA=0 → wOBA/wRAA/bWAR 0 (clamp div-by-0); IBB-in-denominator off-by-one | ±0.001 |
| pWAR | `calculateFIP`/`calculatePWAR` | leagueFIP 4.04, fipConstant 3.28; coeffs HR 13, (BB+HBP) 3, K −2; repl SP .12 / RP .03 per 9; gamesPerTeam scales RPW | IP=0 → FIP 0; <3 IP high variance | ±0.01 |
| fWAR | `calculatePreferredFWARFromPersistedFieldingSet` | run values (PO .03–.05, A .04–.08, DP .08–.12, E −.15/−.20/−.25); pos mult C 1.3…1B .7; difficulty routine 1.0→robbedHR 5.0; pos adj/48g C +3.7…DH −5.2 | gamesPlayed=0 → 0; 1B/DH neg adj | ±0.01 |
| rWAR | `calculateRWARSimplified` | SB +0.20, CS −0.45; advancement .40–.55; thrown-out −0.65; GIDP −0.44 | SB=CS=GIDP=0 → 0 | ±0.001 |
| mWAR | `calculateSeasonMWAR` | decisionWAR 0.60 / overperfWAR 0.40; manager credited ~30% of overperformance; √LI weighting | decisionCount=0 → 0 | ±0.01 |

**Critical scaling reminder:** `runsPerWin = 10 × (seasonGames / 162)` — the pipeline
resolves `seasonGames` from `seasonMetadata.gamesPerTeam` / adaptive standards
(`resolveSeasonGamesForWar`). Never the 17.87 Pythagorean value.

---

## 8. React Coupling Summary

| Layer | React-coupled | Extractable for sim? |
|---|---|---|
| `src/engines/*` (all) | **NO** | ✅ call directly |
| `src/utils/*` storage + `processCompletedGame` + aggregators | NO (IndexedDB only) | ✅ with `fake-indexeddb/auto` |
| `useGameState.completeGameInternal` (live pipeline driver) | **YES** | use `processCompletedGame` instead (its non-React twin) |
| `src/hooks/*`, `src/src_figma/hooks/*` | YES | not needed for engine/pipeline sim |

---

## 9. Proof-of-Life Results (EXECUTED this session)

- **`test-utils/seasonSimulator.test.ts` → 4 passed (1.85s).** `generateRoster` →
  `generateSyntheticGame` → `processCompletedGame` runs the full fan-out in vitest +
  `fake-indexeddb`; the "48 games accumulate across batting, pitching, fielding, and
  milestone branches" test passes. **This is the canonical executed proof that the Type-B
  pipeline + downstream engines are callable outside React.**
- **`test-utils/franchise-proof-of-life.ts`** — minimal single-game smoke variant (pure
  `getPercentile` call + single `processCompletedGame` round-trip). It is intentionally a
  `.ts` (NOT `.test.ts`) file, so the default suite never auto-discovers it — it stays OUT
  of the characterized baseline. It is a **spare on-demand diagnostic** ("can I still call
  each engine / the pipeline in isolation?"), separate from the full sim.
  **Invoke manually (verified this session → 1 file, 2 tests pass):**
  ```
  NODE_ENV= npx vitest run -c test-utils/franchise-proof-of-life.config.ts
  ```
  The dedicated `franchise-proof-of-life.config.ts` sets `include` to only that file and
  replicates the base test env (jsdom + `src/test-setup.ts` + the `@` alias). Output:
  `getPercentile(7,[1,3,5,7,9])=0.8`; `aggregation.success=true`; `18 season batting rows`,
  `gamesPlayed=1`.

---

## 10. Recommendations for Simulator Architecture

Pipeline is **Type B** → the simulator is a **vitest script with `fake-indexeddb/auto`**,
driving `processCompletedGame` per synthetic game (the existing
`seasonSimulator.test.ts` / `seasonSimulator162.test.ts` are the reference
implementation). To exercise the dark L-stack branches (fame/morale/traits/L10–L12),
flip the relevant `isFranchisePhase2*Enabled` flags in the harness before the loop —
otherwise they no-op. No pure-Node path (no `tsx` in the repo).
