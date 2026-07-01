# Draft-Process / Stream B UI/UX Coverage Map — evidence-based audit (2026-06-27)

> **Method:** 7 parallel evidence-strict auditors → adversarial existence re-verification (14 first-pass
> classifications corrected) → synthesis. 68 distinct elements across setup → draft → launch. Every claim
> carries file:line evidence. Source run: `wxs6bjfbr` (one verify-cell failed to return structured output;
> covered by siblings). Worktrees: `lineups-fenway` (engine trunk) + `kbl-draft-ui` (the 11 preview mocks).
>
> **v1 scope (JK 2026-06-27):** the ENTIRE draft process is v1 — draft-setup → draft → season launch.
> **Existence:** live / built-dark / enum-only / partial / absent. **uiStatus:** live-wired / preview-mock /
> partial / missing.

---

## 0. THE PIVOTAL FINDING — no pre-freeze persistence (corrected: live → ABSENT)

`FranchiseSetup.tsx:70` holds ALL setup choices in React `useState<FranchiseConfig>` only; the ONLY write is
`initializeFranchise(config)` (`FranchiseSetup.tsx:171` → `saveFranchiseConfig`, `franchiseInitializer.ts:703`)
which runs AFTER the franchise is created (the freeze). **There is no intermediate draft-setup store** — a
refresh mid-setup loses everything; nothing persists the archetype/shill/seat choices between the setup
screens and the auction.

**Implication for wiring Stream B:** the redesigned setup screens can't just "save to FranchiseConfig"
(it doesn't exist pre-freeze). Two options: (a) a new `DraftSetupConfig`/draft-setup store that the auction +
freeze consume, or (b) hold-until-freeze (the screens carry state into `initializeFranchise`, like the live
wizard does). `Team.capIdentity`/`archetype` CAN persist now (teams exist in the league builder pre-freeze,
written via `saveTeam`). **This is a JK design fork** — flag before building the setup write spine.

---

## 1. SETUP — choices + persistence

| Element | Existence | uiStatus | Evidence |
|---|---|---|---|
| **Seat → team assignment** (couch-coop) | enum-only | missing | `FranchiseConfig.teams.playerAssignments` defined (`franchise.ts:38,180`) but **NEVER written** (`FranchiseSetup.tsx:38` inits `{}`, never populates). Only surface is the `DraftSetupHubPreview` "WHO'S PLAYING" mock |
| **Pre-freeze setup store** | absent | missing | (§0) — needs a store or hold-until-freeze |
| **Team archetype (MLB+farm) → cap** | partial | preview-mock | cap-identity system LIVE (`Team.capIdentity`/`farmCapIdentity` `leagueBuilderStorage.ts:150-151`; manual band editor live `LeagueBuilderTeams.tsx:~658-798`). 15 `HISTORICAL_ARCHETYPES` + `archetypeCapShift` exist but only for pool-feasibility. Named quick-pick is mock |
| **Archetype → capIdentity converter** | partial/MISSING | partial | `composeIdentity`/`applyIdentitySelection` (`leagueConstruction.ts:167-200`) + `archetypeCapShift` (`historicalArchetypes.ts:129-135`) exist, but **no `archetypeId→Team.capIdentity` function in the active path**. Must assemble `selectTeamArchetype(team, mlbKey, farmKey)` (carefully — modStat vocab) + add `mlbArchetypeKey`/`farmArchetypeKey` to `Team` |
| **CPU shill count** | **live** (corrected) | — | `cpuShillCount` exists + wired; the count/scaling/persistence is the Stream-B piece (per JK: scale w/ league size + override, persist pre-auction) |
| **Season rules screen** | live (engine) | preview-mock | `SeasonRulesPreview` is a routable mock; the LIVE persisted rules editor is `FranchiseSetup` steps 2-3. JK ruled: one canonical home, free-typed games/innings, fold cadence+conferences |
| **Construction rail** (8 stages) | live (shell) | preview-mock | `ConstructionRailPreview` mock stage-advance; no real state machine. Should be the spine routing league→pool→setup→draft→farm→staff→freeze→season |
| **Scout-hire** | partial | preview-mock | `ScoutHirePreview` is a static mock; the REAL hire is LIVE — `draftLeagueBuilderScout()` (`leagueBuilderStartupFarmDraft.ts:1293-1338`, persists via `saveScoutProfile`). Wire the redesign to the live fn (JK: REUSE, don't rebuild) |

---

## 2. DRAFT — the auction + the guide

| Element | Existence | uiStatus | Evidence |
|---|---|---|---|
| **AuctionStage** (premium-retro UI) | **live** (corrected) | preview-mock | `AuctionStage.tsx` (335 lines, lot/bid/board/log + long-press scout fog) is complete; mounted only on `/__preview/auction-stage`. WIRE: adapt the live `LeagueBuilderAuctionDraft` session → `AuctionStageVM` |
| **Scout value range** (perceivedValueRange) | built-dark (corrected) | preview-mock | `perceivedValueRange(trueIV, accuracy)` LIVE + used at freeze (`draftFreezeInputs.ts:81-85`); NOT wired to the live-draft display. WIRE-NOW to `DraftGuideCard.scout` |
| **20-80 SMB4 grade** (scoreSmb4Player) | live | partial | `smb4GradeEmulator.ts` LIVE + used in pool grading (`leagueBuilderPoolBuilder.ts:92-113`); the draft-guide `GradeGauge` is mock-fed. WIRE-NOW |
| **Scout accuracy → range/confidence** | live | preview-mock | `scoutValueRange.ts:21-26` (better scout → tighter range); confidence label is mock. WIRE-NOW |
| **Draft Guide card** (composition) | partial | preview-mock | `DraftGuideCard`/`DraftGuidePreview` exist ONLY in `kbl-draft-ui`; UI production-ready (long-press reveal works). Scout-read halves WIRE-NOW; affordability/bargain are optimizer-gated ↓ |
| **Affordability badge** | enum-only | preview-mock | **OPTIMIZER-GATED.** UI ready; no compute. `canAffordDraftPick` (`salaryCalculator.ts:1209`) is a one-line budget check with ZERO callers — not an optimizer. **Mark "coming"** (JK ruling) |
| **Bargain/Trap flag** | enum-only | preview-mock | **OPTIMIZER-GATED.** UI ready; no engine emits player-level bargain/trap. **Mark "coming"** |
| **Roster Optimizer** ("afford / adds-X-wins" brain) | **absent — VERIFIED greenfield** | missing | `optimizerConstantsSnapshot.ts` is only a constants HASH; `rosterAnalyzer` is diagnostic hole-gap only; `trueValue.ts:1` comment calls itself "PROVISIONAL v1 magnitudes for the optimizer" (aspirational). No marginal-wins/affordability ranking exists. **Gates the 3 items above → de-scope to advisory/BLOCKED for v1** |
| **LineupsTab (pregame)** | live (engine) | preview-mock | superseded by the Lineups surface already built in the Fenway hub |
| **My-teams switcher** | live (data) | preview-mock | `controlledTeams` live; wire to the seat/ownership context |

---

## 3. LAUNCH — freeze + staffing + the seam gaps

| Element | Existence | uiStatus | Evidence |
|---|---|---|---|
| **computeDraftFreeze** (morale/IV snapshot) | live | missing (silent) | `draftFreeze.ts:64-154` → `FranchiseTrueValueRow[]` (startingMorale `:109`, startingFanMorale `:150`); called `franchiseInitializer.ts:756`; immutable once saved. Correct as silent — but the user is never told it locks |
| **FranchiseModeHandoffContract** | live | missing | `franchise.ts:113-124`, saved `franchiseInitializer.ts:674-685`. No UI explains the lock |
| **Manager hire** | live | preview-mock | `buildDefaultManagerProfile`/`saveManagerAssignment`/`seedManagerAssignmentsForTeams` (`managerIdentityStorage.ts:173-575`) LIVE; `EndOfDraftStaffingPreview` is mock; FranchiseHome auto-ensures a default — no ceremonial hire screen wired |
| **Beat reporter hire** | live | preview-mock | `generateBeatReporter`/`autoGenerateReporterForTeam` (`narrativeEngine.ts:459`, `reporterAssignment.ts:78-130`) LIVE + auto-create; the choose-your-reporter screen is mock. HIDDEN: reporter.personality/voiceStyle |
| **End-of-draft → staffing routing** | partial | partial | engine pieces exist; the draft-complete → staffing-screen ROUTING is missing |
| **Draft recap** (DRAFT_RECAP) | **absent** | preview-mock | `generateNarrative` (`narrativeEngine.ts:1016-1066`) has GAME_RECAP/TRADE_REACTION/CALL_UP but NO `DRAFT_RECAP` type. Add the type (or reuse one per the [[reporter-adapter-pure-emission-llm-split]] pattern) + wire the recap toggle; emission LLM-gated |
| **Farm-draft → setup progression** | **absent** | partial | `LeagueBuilderFarmAuctionDraft.tsx:852-859` shows "draft complete" but NO continue button — only the back arrow (`:489-495`). UX dead-end. Add "Continue to Franchise Setup" |
| **Freeze-confirmation dialog** | **absent** (corrected) | missing | `FranchiseSetup` Step6 (`:1295-1450`) reviews settings but NO warning that rosters/morale/rules freeze irreversibly; "START FRANCHISE" (`:364`) doesn't explain the lock. Add a pre-commit "this LOCKS your franchise" dialog |
| **Misleading "two-number freeze" copy** | live (bug) | partial | `LeagueBuilderFarmAuctionDraft.tsx:856` references "two-number freeze (AUC-5.2)" — opaque. The two numbers = startingMorale + startingFanMorale (`draftFreeze.ts:109,150`). Replace with plain copy |

---

## 4. HIDDEN vs REVEALED — the draft rule

**The "scout as draft guide" privacy model (CORRECT reference impl):** true IV (`computeIV.kblIV`) + hidden
personality modifiers stay HIDDEN; the scout reveals a PERCEIVED 20-80 grade + a price RANGE
`[trueIV*(1-w), trueIV*(1+w)]` where `w` shrinks with scout accuracy (`scoutValueRange.ts:21-26`), gated by
**press-and-hold** to the interacting user only (`AuctionStage.tsx:~270`, `DraftGuideCard`). MLB players are
uncovered; farm/draft prospects are fogged. This is the same gate the living-season hub must honor for farm
prospects ([[hidden-vs-revealed-ui-rule]], and the two v1 blockers in `LIVING_SEASON_UIUX_COVERAGE_MAP`).

---

## 5. v1 BUILD PRIORITY (draft process)

1. **JK fork first:** pre-freeze persistence — new `DraftSetupConfig` store vs hold-until-freeze. Decides how
   the setup write spine is wired.
2. **Setup write spine** (after the fork): the archetype→capIdentity converter (+ `Team.archetype` name),
   seat-assignment write, shill persistence, season-rules canonical home — the redesigned hub/screens wired.
3. **Wire the live engines to their redesigned UIs:** AuctionStage → live auction; scout price-range + 20-80
   grade → DraftGuideCard; manager/reporter hire screen; my-teams switcher.
4. **Seam fixes (WS-0):** farm-draft "Continue to Setup" button, the freeze-confirmation dialog, the
   misleading "two-number" copy, the draft-recap (DRAFT_RECAP narrative).
5. **De-scope / "coming" (optimizer-gated):** affordability badge, bargain/trap, in-season scout win-value —
   the roster optimizer is verified greenfield (JK ruling: mark "coming").
