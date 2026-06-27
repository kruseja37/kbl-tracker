# Stream B — Draft-Process UI/UX Build Plan (2026-06-27)

> Branch `claude/lineups-fenway-hub`. Built from two evidence-strict deep dives this session
> (draft-engine ground-truth re-verify + archetype→cap mechanics). This is the buildable plan for the
> remaining draft work. Companion: `DRAFT_PROCESS_STREAMB_UIUX_COVERAGE_MAP.md` (the inventory).

## JK rulings (2026-06-27, this session)
- **Setup persistence = HOLD-UNTIL-FREEZE** (carry setup state into `initializeFranchise`; no new
  pre-freeze store). The draft PICKS are already crash-safe per pick (`saveAuctionSession`); only the
  pre-draft setup-screen choices are in-memory until freeze, and that's an acceptable, narrow gap.
- **Optimizer-gated badges = mark "coming", do NOT build.** The roster optimizer ("afford / adds-X-wins"
  brain) is verified GREENFIELD in this tree (re-checked twice). Affordability badge, bargain/trap flag,
  in-season scout win-value all depend on it → leave as "coming with the roster engine."
- **Living-season activation = AFTER the draft** (separate gated task; see the flag-flip note below).

## Engine ground truth (what the UI wires onto)
- **BUILT + usable:** auction session (`useAuctionDraft`/`auctionStateMachine`, live+wired); scout value
  range `perceivedValueRange`/`scoutValueRange.ts`; 20-80 grade `scoreSmb4Player`/`smb4GradeEmulator.ts`;
  true value `computeTrueValue`; cap system `shiftLuxuryCaps`/`identityCapShift` (`leagueConstruction.ts`);
  manager/reporter/scout/shill auto-create. `AuctionStage.tsx` (premium-retro UI) exists, mounted only at
  `/__preview/auction-stage`.
- **NOT built (greenfield):** the roster optimizer. → badges stay "coming."

## Build slices (in order)

### Slice 1 — Setup write spine (hold-until-freeze)
**1a. Archetype→capIdentity converter (foundational, INTRICATE — do with a unit test).**
- Add `mlbArchetypeKey?: string` + `farmArchetypeKey?: string` to `Team` (`leagueBuilderStorage.ts:150`).
- THE VOCAB MISMATCH (the silent-mis-set-caps trap):
  - Archetype `spec`/`boosts`/`nerfs` use `ArchetypeStat`: `POW CON SPD FLD ARM ROT_VEL ROT_JNK ROT_ACC
    PEN_VEL PEN_JNK PEN_ACC` (`historicalArchetypes.ts:11`).
  - `capIdentity` = `{ bandPriorities?, increase: string[], decrease: string[] }` where increase/decrease
    are MOD NAMES validated against `CAP_MODIFICATION_FRACTIONS` (`leagueConstruction.ts:22`;
    `applyIdentitySelection` THROWS on an unknown name — so a wrong-but-invalid name is loud, but a
    wrong-but-VALID name is the silent bug).
  - ModStat vocab (the cap layer): `POW CON SPD FLD ARM RVEL RJNK RACC PVEL PJNK PACC` (`tierParams.ts`).
  - Bridge: `ARCHETYPE_STAT_LUX_KEY[archStat]` → `"${group}/${stat}"` lux key; invert
    `MOD_STAT_TO_LUX` (`leagueConstruction.ts:85`) to go lux key → ModStat. So
    `ArchetypeStat → ModStat` is: POW→POW, CON→CON, SPD→SPD, FLD→FLD, ARM→ARM, ROT_VEL→RVEL,
    ROT_JNK→RJNK, ROT_ACC→RACC, PEN_VEL→PVEL, PEN_JNK→PJNK, PEN_ACC→PVEL... (verify each via the bridge).
  - Then ModStat → a canonical single-stat MOD NAME in `CAP_MODIFICATION_FRACTIONS` (read tierParams to
    confirm a pure per-ModStat mod exists; if a ModStat has no pure mod, use the closest single-stat mod
    and assert the sign/direction in the test). Build `archetypeToIdentity(archetype): IdentityComposition`.
  - `selectTeamArchetype(team, mlbKey, farmKey)` → set `capIdentity` (from `archetypeToIdentity` of the
    MLB archetype), `farmCapIdentity` (farm archetype), `mlbArchetypeKey`/`farmArchetypeKey`; `saveTeam`.
- **THE UNIT TEST (mandatory):** for a known archetype (e.g. `murderers-row`, boosts POW/CON, nerf SPD),
  assert `identityCapShift(selectTeamArchetype(...).capIdentity)` shifts the SAME ModStats in the SAME
  direction as `archetypeCapShift(archetype)` (translated lux→ModStat). i.e. POW/CON up, SPD down, others
  ~0. This catches the silent mis-map.
- **Consumed by** (so it's not orphaned): `shiftLuxuryCaps(pool.luxuryCaps, team.capIdentity)` in
  `LeagueBuilderSnakeDraft.tsx:128`, `useAuctionDraft.ts:120`, `auctionLuxuryTax.ts:27`, `cpuShillBidding.ts:178`.

**1b. Seat assignment** — write `FranchiseConfig.teams.playerAssignments` (currently inits `{}`, never
written: `FranchiseSetup.tsx:38`). Surface from the Draft Setup hub; carry into `initializeFranchise`.
**1c. CPU shill count** — `cpuShillCount` exists+wired; add the scale-with-league-size + override persisted
pre-auction.
**1d. Season rules** — ONE canonical home in `FranchiseConfig` (free-typed games/innings, cadence +
conferences toggle default ON). Fold the `SeasonRulesPreview` mock into the live `FranchiseSetup` steps.

### Slice 2 — Seam fixes (WS-0, small, make the live flow traversable A-Z)
- Farm-draft **"Continue to Franchise Setup"** button (`LeagueBuilderFarmAuctionDraft.tsx:852-859` dead-ends).
- **Freeze-confirmation dialog** before "START FRANCHISE" (`FranchiseSetup.tsx:364`) — "this LOCKS your
  rosters/morale/rules irreversibly."
- Replace the **misleading "two-number freeze (AUC-5.2)"** copy (`LeagueBuilderFarmAuctionDraft.tsx:856`)
  with plain wording (the two numbers = startingMorale + startingFanMorale).
- **Draft recap** — add a `DRAFT_RECAP` narrative type (`narrativeEngine.ts` has GAME_RECAP/TRADE_REACTION/
  CALL_UP but not DRAFT_RECAP); build the deterministic adapter, gate the emission per the reporter
  adapter/emission split. (Reuse an existing NarrativeEventType if the exhaustive Record is painful.)

### Slice 3 — Wire the redesigned screens to the live engines
- **AuctionStage** (premium-retro) → adapt the live `LeagueBuilderAuctionDraft` session into `AuctionStageVM`
  (currently only at `/__preview/auction-stage`).
- **DraftGuideCard** scout halves: `perceivedValueRange` price band + 20-80 grade + confidence (WIRE-NOW;
  affordability/bargain stay "coming").
- **Manager / beat-reporter hire** ceremony screens (`EndOfDraftStaffingPreview` mock → live
  `buildDefaultManagerProfile`/`generateBeatReporter`).
- **My-teams switcher** → the controlled-teams/seat context.
- **Draft Setup hub / Archetype picker / Season rules** screens wired to 1a-1d.

### Slice 4 — Optimizer-gated (DO NOT build the compute)
- Affordability badge, bargain/trap flag, in-season scout win-value: render the slot, label "coming."

## Verification per slice
- 1a: the unit test above + `npm run build`. 2-3: browser-verify the live draft flow end-to-end on the
  worktree dev server (the seam fixes + the wired screens). Commit per slice; preview/live as appropriate
  (the draft flow IS the live setup flow — these are live changes, unlike the Fenway hub).

## The living-season flag-flip (deferred — after the draft)
Flipping the 11 `FRANCHISE_PHASE2_*_ENABLED_DEFAULT` flags (morale/fame/flashpoint/checkpoint/traits/
L10-L14/stadium-records) in `franchisePhase2Flags.ts` to `true` turns the season "live." Probed this
session: the season SIMS clean all-on (the played seed + the L-SIM `forceAllPhase2FlagsOn` design), but
flipping the *default* breaks ~a handful of characterization tests that assert "dark-noop while the flag
is disabled" + live seams that hit IndexedDB in node. Clean activation = flip + force those tests' flags
off (preserve their dark coverage) / fix env + run the ~30-min `seasonRunner.scenario.ts` gate. Also note:
`wpaRuntimeBoundary.test.ts` (2 tests) is a PRE-EXISTING failure on this branch, unrelated.
