# L-SIM Phase 1 — Build Grounding (source of truth for the harness contract)

**Produced:** 2026-06-19 by Opus 4.8 (Captain), from a direct-read parallel map of the REAL
`src/utils/processCompletedGame.ts` fan-out + every dark Phase-2 branch (workflow `wf_bebe9d6c-9b6`,
7 readers re-reading signatures from source per the †-reverify rule). This is the build contract's
source of truth. Enacts `L_SIM_ARCHITECTURE_AND_INVARIANTS_SPEC.md` §7 Phase 1 + §11 steps 2–3.

> **Why this doc exists:** the existing sim (`test-utils/seasonSimulator.test.ts`) imports the
> STRIPPED `test-utils/processCompletedGame.ts` (aggregate + archive only) — it fires ZERO soul layer.
> The L-SIM harness MUST drive the REAL `src/utils/processCompletedGame.ts` with all flags forced ON,
> and the soul layer only fires when a strict gate-chain is satisfied. This doc is that chain + the
> setup it requires.

---

## §A — The non-negotiable GATE-CHAIN (the #1 thing the harness must satisfy)

Dark branches execute **only** when ALL of these hold (read from `processCompletedGame.ts:577-683`):

1. `shouldAggregateToRegularSeasonStats(gameState, archiveOptions) === true` — i.e. NOT playoff/
   elimination: `competitionType ∉ {playoff, elimination}` AND no `playoffId`/`playoffSeriesId`/
   `playoffGameNumber` AND `isEliminationGame !== true`. (`:428`)
2. `aggregateGameToSeason` succeeds (throws on failure → Step 1 is the only fatal step). (`:579`)
3. **`warScope ≠ null`** — needs a resolvable `seasonId` (`options.seasonId ?? archiveOptions.seasonId
   ?? gameState.statsScopeId ?? gameState.seasonId`) AND a resolvable `seasonGames`
   (`seasonMetadata.gamesPerTeam`, else explicit `options.gamesPerTeam`/`gamesPerSeason`, else WAR
   warns + returns null). (`:216`, `:189`)
4. **`trueValueScope ≠ null` AND `result.persisted === true`** — needs `franchiseId`
   (`archiveOptions.context.franchiseId ?? gameState.franchiseId ?? (competitionType==='franchise' ?
   competitionId)`) AND integer `gameState.seasonNumber > 0` AND True Value actually persists. TV
   persists only if ≥1 MLB player has a finite salary baseline AND finite seasonWAR AND its position
   **peer-pool ≥ 4** (`franchiseTrueValueStorage.ts:489`). Empty rows ⇒ `persisted:false` ⇒ all dark
   branches skip. (`:257`)
5. Each dark branch then checks its OWN `isFranchisePhase2*Enabled()` flag independently. (`:616-669`)

**Every dark branch is try/caught + non-fatal** (warn + continue). So a flags-ON run that silently
does nothing means the gate-chain failed upstream (no franchiseId, TV didn't persist, no
scheduleGameId) — NOT that the engines ran. The preflight proof (§3 of the spec) exists precisely to
catch this: it must assert soul-state CHANGED, not just that the call returned.

---

## §B — Pre-loop SETUP CONTRACT (must run before the per-game loop)

1. **Reset both IndexedDB databases** (there are TWO): `resetTrackerDbForTests()`
   (`trackerDb.ts:458`, the `kbl-tracker` v24 DB) AND `resetFranchiseMoraleDatabaseForTests()`
   (`franchiseMoraleState.ts:90`, the SEPARATE `kbl-franchise-morale` v1 DB). Import
   `'fake-indexeddb/auto'` before anything that touches IndexedDB.
2. **Disable cloud sync:** `syncEngine.setEnabled(false)` (`syncEngine.ts:924`). (It already no-ops
   without `supabase`, but disable explicitly.)
3. **Seed a League Builder league** (`leagueBuilderStorage`): N teams, each with EXACTLY **22 MLB +
   10 farm** players (`V1_MLB_PLAYERS_PER_TEAM=22`, `V1_FARM_PLAYERS_PER_TEAM=10`,
   `leagueBuilderFarmScoutingHandoff.ts:19-20`) — `deepCopyLeagueToFranchise` HARD-VALIDATES these
   counts and throws on mismatch (`franchisePlayerStorage.ts:428`). Use ≥4 teams so position
   peer-pools clear the TV ≥4 threshold. **Players MUST carry VARIED `personality` (canonical 7) +
   `hiddenPersonalityModifiers {loyalty, ambition, resilience, charisma}` (0–100) + `salary` +
   `primaryPosition`** — else the soul layer defaults to neutral (50/50/50/50) and produces no signal.
   `getPlayerRosterStatusForLeague`/`getPlayerTeamIdForLeague` derive from `player.leagueAssignments`
   (`leagueBuilderStorage.ts:447,451`), so set `leagueAssignments:[{leagueId, teamId, rosterStatus}]`.
   (Model on `franchiseManualSmokeFixture.ts` `seedMlbLeague`, but vary personality/modifiers.)
4. **Create the franchise:** `deepCopyLeagueToFranchise(franchiseId, leagueId, {seasonNumber})`
   (`franchisePlayerStorage.ts:512`) — populates the per-franchise player store + team store +
   salary baselines (`withInitialFranchiseSalary`) + farm records. (Requires the league's startup
   farm/scout draft prepared, à la `franchiseManualSmokeFixture.runStartupFarmAndScoutDraft`.)
   *Alternative leaner path:* write franchise players directly via `saveFranchisePlayer(franchiseId,
   player)` AND league players via `leagueBuilderStorage.savePlayer` with matching ids/teamIds/
   `leagueAssignments` — full control + skips the draft, but the builder MUST verify TV still persists
   (salary baseline path) and the dark branches resolve roster status. **Builder picks whichever
   path makes the preflight green; document the choice.**
5. **Write `seasonMetadata` with `gamesPerTeam` BEFORE the first game** (`saveSeasonMetadata`,
   `seasonStorage.ts`). `seasonId = getFranchiseSeasonId(franchiseId, seasonNumber)`; use that same id
   for `statsScopeId`. Without `gamesPerTeam` set, WAR resolves it via adaptive standards (guess) —
   pre-set it (e.g. the season length under test) so the 20% checkpoint cadence is exact.
6. **Seed `scheduleStorage`** with one scheduled-game record per game carrying a positive integer
   `gameNumber` (1..N). **Checkpoint (L8b), Traits (L9b), L10, L11 ALL dark-noop without a
   `scheduleGameId → gameNumber`** — this is the single most common silent no-op. The per-game
   `gameState.scheduleGameId` (or `archiveOptions.context.scheduleGameId`) must point at these.
7. **(Optional, §5.6)** pre-seed a True Value baseline so TV anchors to a fixed draft-IV baseline and
   never re-baselines. For Phase 1 the natural first-game anchor is acceptable; the determinism +
   multi-season legs catch drift.
8. Morale snapshots auto-create at baseline 50 on first effect — no pre-seed required (optional for
   non-neutral starts).

---

## §C — Per-game SYNTHETIC CONTRACT (what each generated game must carry)

Extend `syntheticGameFactory.generateSyntheticGame` (deterministic, seeded) to produce a
`PersistedGameState` carrying:

- **Franchise routing:** `competitionType:'franchise'`, `franchiseId`, `seasonId`, `statsScopeId`,
  integer `seasonNumber ≥ 1`, `scheduleGameId` (→ a seeded schedule row), `homeTeamId`/`awayTeamId`
  **matching the franchise/league team ids** (CRITICAL namespace match — see §F).
- **`playerWpaTotals?: KblWpaPlayerTotal[]`** (`gameStorage.ts:213`; type at
  `kblWpaAttribution.ts:57`): `{playerId, playerName, teamId, totalWpa, battingWpa, pitchingWpa,
  catchingWpa, fieldingWpa, baserunningWpa, managingWpa}`. **CURRENTLY ABSENT — must inject.**
  `totalWpa` feeds the L6 fame WPA-spine; `pitchingWpa` feeds the L12-3R Reliever-of-Year season
  rollup (`aggregatePitchingStats` reads it). Vary it (clutch/blowup/quiet games).
- **`fameEvents[]`** `{playerId, playerName, playerTeam, fameType:'bonus'|'boner', fameValue}` plus
  defensive/role-player event types (for `defensiveFame`/`rolePlayerFame` channels). Optional but
  needed for non-WPA fame signal.
- **`playerStats`** (batting + fielding incl. `putouts/assists/fieldingErrors/divingCatches/
  robberies/nutshots`) and **`pitcherGameStats`** (incl. `decision`, `save/hold/blownSave`,
  `isStarter`, `gamesStarted` source) — as today, but with `gamesStarted===0` pure relievers present
  (Reliever race needs them).
- **`awayLineup`/`homeLineup` (+ lineup state)** with positions — WAR reads these for positional WAR.
- `totalInnings` (achievement thresholds), `savedAt` (All-Star timestamps).
- **Call shape:** `processCompletedGame(gameState, options, leagueId, archiveOptions)` where
  `options = {seasonId, gamesPerTeam, detectMilestones, franchiseId, currentGame, currentSeason, ...}`,
  `leagueId` = the seeded league (so `getEffectivePlayer` resolves positions + ratings snapshots), and
  `archiveOptions = {context:{competitionType:'franchise', franchiseId, scheduleGameId, leagueId,
  competitionId, statsScopeId}}`.

Vary optional fields across games (present in some, absent in others). Match the contract type EXACTLY
— if a field can't be filled realistically, that's a finding, not license to invent.

---

## §D — Dark-branch quick map (flag · fires-when · soul-state proof)

| Branch | Flag | Fires | Soul-state proof (preflight asserts) |
|---|---|---|---|
| `persistDarkFameRecordsForCompletedGame` (`franchiseFameCompute.ts:73`) | Fame | every game | `franchiseFameRecords` row: `heat≠0`, `reachFloor≥0` (monotonic), `channelByChannel.wpa_spine>0` if `totalWpa>0` |
| `persistDarkFlashpointDecayForCompletedGame` (`franchiseFlashpointDecayCompute.ts:104`) | Flashpoint | every game, only if team has an **active/locked Albatross** | `franchiseFlashpointDecay` row: `consecutiveGamesUnresolved≥1`, `lastGameTax≤0`, clamped ≥ `-3.0` |
| `persistDarkCheckpointSweepForCompletedGame` (`franchiseCheckpointSweepCompute.ts:198`) | Checkpoint | at the **5 × 20% boundaries** only | `franchiseRatingsOverlays` row: `source='ratings-development'`, `confirmationStatus='pending'`, `kind='permanent'`, `delta≠0` |
| `persistDarkTraitGrantForCompletedGame` (`franchiseTraitGrantCompute.ts:158`) | Traits | at the same 20% boundaries | `franchiseTraitOverlays` row: `source='trait-grant'`, `confirmationStatus='pending'`, `applied=false`, `valence∈{gain,lose}`, ≤2 held-trait cap |
| `persistDarkL10ForCompletedGame` (`franchiseL10SweepCompute.ts:175`) | L10 | every game (continuous cadence) | `franchiseL10Overlays` row: `source='l10-random-event'`, `confirmationStatus='pending'` |
| `persistDarkL11AutoBackstopForCompletedGame` (`franchiseManagerAutoBackstop.ts:91`) | L11 | every game, fires only if team-fan morale **< 25** AND seeded roll `< 0.004` | `managerAssignments.fired=true` + tenure record + successor; relief/ripple morale |
| `recomputeFranchiseL12StandingsForCompletedGame` (`franchiseRaceStandingsCompute.ts:89`) | L12 | every game (DARK — returns, no IDB write) | `RecomputeL12Result.status='computed'`, 8 merit races + TV-family, no NaN |
| `persistFranchiseAllStarRosterForCompletedGame` (`franchiseAllStarRosterCompute.ts:38`) | L12 | every game; **locks at 60%** → payouts | `franchiseAllStarRosters` row; `locked=true` iff `gameNumber ≥ 0.6·totalGames`; at lock → reach-floor + snub + emit |
| `persistProjectedDesignationsAfterTrueValue` (`processCompletedGame.ts:332`) | (inline) + Morale for the consequence | every game | `franchiseDesignationRows` row (6 slots ≤1 holder); if Morale ON, `moraleSnapshots` row |

L12-5 payout layer (`runFranchiseAllStarLockPayouts` `franchiseAllStarLockPayouts.ts:69`;
`emitFranchiseSeasonEndHonors` `franchiseSeasonEndHonors.ts:69`) fires at the All-Star LOCK (60%) and
at season-finalize respectively — NOT per game. Reach-floor needs BOTH L12 + Fame flags on.

---

## §E — †-REVERIFY corrections (verified from source — fold into FRANCHISE_API_MAP §4/§5)

The map's †-marked rows were re-read; corrections:

- **Fame:** `resolveFameTier(heat, reachFloor, config?): FameTier` lives at **`src/engines/fameModel.ts:205`**
  (with `FAME_TIER_RANK` at `:66`, `applyHeatUpdate` at `:145`, `updateReachFloor` at `:190`). The
  scalar `getFameTier` in `fameEngine.ts:349` is the RETIRED label ladder and is **unused by the
  pipeline** — races/standings read `resolveFameTier` only. (Map §4 row attributed these to
  `fameEngine.ts`.)
- **Flashpoint:** `computeFlashpointGameTax(input, tuning?)` at `src/engines/flashpointDecay.ts:74`;
  `FlashpointKind = 'albatross' | 'trade_demander' | null`; `trade_demander` seam still empty (L7/L10/L13).
- **L10 engine:** `computeFranchiseL10Events(input, config?): FranchiseL10EventReport` at
  `src/engines/franchiseL10EventEngine.ts:175` (pure, FNV-1a seeded; personality-shift family excluded).
- **L11 engine:** `computeFranchiseL11Firing(input, tuning?): FranchiseL11FiringReport` at
  `src/engines/franchiseL11FiringEngine.ts:66` (net-positive `valueDelta` ⇒ untouchable; `managerSelfDelta=-2` hardcoded, unused in v1).
- **Storage/DB (map §5 corrections):** all the old separate DBs (`kbl-season-stats`/`kbl-career-stats`/
  `kbl-event-log`) are OBSOLETE — consolidated into `kbl-tracker` **v24** via `trackerDb.ts`. The morale
  DB is **`kbl-franchise-morale` v1** (single shared, scope-scoped), NOT the map's
  `kbl-franchise-morale-daily-snapshots`.
- **L12 scorers/payouts** signatures all verified (`computeFranchiseRaceStanding`
  `franchiseRaceStandingScorer.ts:59`; `computeFranchiseTvFamilyRaces` `franchiseTvFamilyScorer.ts:28`;
  `computeFranchiseAllStarRoster` `franchiseAllStarSelector.ts:89`; `runFranchiseAllStarLockPayouts`
  `franchiseAllStarLockPayouts.ts:69`).

---

## §F — Gotchas that WILL bite the build

- **Team-id namespace:** `gameState.homeTeamId/awayTeamId` (completed-game ids) must equal the
  franchise/league team ids the dark branches resolve via `getPlayerTeamIdForLeague`. Mismatch ⇒
  morale/L10/L11 silently key the wrong team. Make them identical in the seed.
- **`scheduleGameId` is mandatory** for the checkpoint-cadence branches (checkpoint/traits/L10/L11) —
  they dark-noop without a resolvable `gameNumber`. Seed `scheduleStorage`.
- **Re-entry guards:** fame/flashpoint/checkpoint/traits skip silently if
  `storedRow.updatedAtCheckpoint === checkpoint`. Never process the same `(gameId/gameNumber)` twice in
  a run — but DO replay it deliberately for the idempotency invariant (§5.1) and assert no dup rows.
- **Two DBs to reset** (tracker + morale). Forgetting morale leaks state across legs.
- **TV anchor (§5.6):** TV anchors on first compute and must not re-baseline across the season /
  across seasons. Watch for drift in the multi-season leg.
- **`detectMilestones`:** the old sim used `false` to dodge a v2/v3 conflict that v24 consolidation
  fixed — the harness can try `true`; if it surfaces an IDB issue that's itself a finding.
- **Fame writes only to `playerSeasonBatting`** even for pitchers — don't assert fame on pitching rows.

---

## §G — Setup-recipe sources (mine these existing tests; do NOT reinvent)

These already flip the relevant flags + seed franchise/season/TV/fame state per-branch — copy their
setup patterns:
- `src/utils/tests/franchiseFameCompute.test.ts` (fame seed + flag)
- `src/utils/tests/franchiseCheckpointSweepCompute.test.ts` (checkpoint/roster seed)
- `src/utils/tests/franchiseRaceStandingsCompute.test.ts` (L12 seed)
- `src/utils/tests/franchiseAllStarRosterCompute.test.ts` (All-Star + lock)
- `src/utils/tests/franchiseRaceSnubMorale.test.ts`, `franchiseHonorReachFloor.test.ts` (payouts)
- `src/src_figma/__tests__/aggregation/processCompletedGame.almanac.test.ts` (drives the REAL orchestrator)

---

## §H — Phase-1 invariant subset (which §5 checks apply NOW, vs deferred)

Phase 1 covers **what is built (D-stack + L1–L12)**. Apply now: the skill's 12 stats checks + §5.1
(fame finite + reach-monotonic + heat-fickle + race no-NaN + `resolveFameTier`-only), §5.1 morale
bounds + flashpoint clamp, §5.1 designation slots + Albatross gate, §5.1 L10 cadence, §5.1 L11
backstop, §5.1 idempotency, §5.2 checkpoint-cadence-exactly-5 + ratings-overlay validity + trait
2-slot/no-offset/hysteresis, §5.3 All-Star 60% lock + reach-floor ratchet + emission/snub, §5.4
migration + backup round-trip + real-export check, §5.5 determinism meta-check, §5.6 cross-system
double-count + channel separation + TV fixed-baseline. **Defer:** §5.3 awards-off-frozen-artifact
requires season finalize (include if the harness finalizes a season); the **L13 relationship** checks
(L13 not yet built) — skip + flag, non-blocking. The fame double-ladder collapse (L12-Q10) is deferred
post-D13; the dark race code already reads `resolveFameTier`, so §5.1 fame checks validate the right
ladder in the sandbox — note it where it bites.

---

## §I — Codex build/audit requirements (JK directives 2026-06-19 — MUST carry into the contract)

1. **†-reverify rule goes VERBATIM into the Codex build contract** (not only into this grounding
   synthesis, or it gets lost on the way into the prompt). The contract CONSTRAINTS must state:
   *"Any †-marked signature in `spec-docs/FRANCHISE_API_MAP.md` is UNVERIFIED — read it from code
   before use; never trust the map's version."* (Matches `L_SIM_ARCHITECTURE…SPEC.md` §12 + the §4
   HARNESS-BUILD RULE.)
2. **The §5-invariant AUDIT must FALSIFY each invariant, not just confirm build+run.** For every §5
   check, the auditor injects a KNOWN-BAD input/mutated state and confirms the invariant trips RED —
   then restores. A passing assertion that can never fail proves nothing, and the preflight proof
   CANNOT catch this (it only proves the pipeline fires, not that the checks would catch a regression).
   This is a per-invariant adversarial spot-check, mandatory before the §5 suite is accepted. Build the
   harness so each invariant is independently callable on an injected state to make this cheap.

