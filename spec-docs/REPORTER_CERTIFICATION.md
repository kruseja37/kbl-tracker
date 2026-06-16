# REPORTER SUBSYSTEM — §18.1 CERTIFICATION READ

**Created:** 2026-06-16
**Author:** Captain (Opus 4.8). Method: a `reporter-certification-read` workflow — 8 parallel dimension-mappers over the subsystem + 5 adversarial verifiers that independently re-derived the decision-critical claims (13 agents, ~1.44M tokens, 326 tool uses). Evidence over assertion throughout: every claim below carries a `file:line` a sub-agent actually read.
**Scope:** Certify exactly what the reporter ("soul anchor") subsystem has BUILT, where it is WIRED, what PERSISTS, and what its CADENCE is — the first of the four `FRANCHISE_V1_LIVING_SEASON_SPEC.md` §18 verification reads. This doc is the source of truth the Phase-2 reporter build tickets consume.
**Status:** CERTIFIED (code facts). Five design rulings for JK remain to "settle cadence" and unblock the build — §I.

> Self-correction logged for honesty: one mapper (prompt-context dimension) wrongly asserted "`narrativeEngine.ts` does not exist anywhere in the repo." That is FALSE — it exists at `src/engines/narrativeEngine.ts` (40,732 bytes). Three verifiers + the accuracy-model mapper independently caught and corrected it. The corrected fact is used below.

---

## A. VERDICT SUMMARY

The spec's framing is **CONFIRMED**: a large reporter system is already built and wired into Exhibition/Elimination, and **franchise is largely a certify-and-connect job, not a from-scratch build** — for the *base* reporter (assignment → live cadence → post-game columns → persistence). The one genuine *build* gap is the **accuracy/inaccuracy model** that relationships-lite (§24.5/§24.7) depends on.

| Claim (adversarially verified) | Verdict | One-line |
|---|---|---|
| **Cadence per mode** | **PARTIAL** | Live cadence = between-inning + post-game only; per-play + preamble orphaned in ALL modes. Franchise cadence is **OFF by omission**. |
| **Franchise wiring = certify-and-connect** | **CONFIRMED** | Downstream engine is franchise-aware with no mode gate; the gap is 3-4 upstream connect tasks, no new engine. |
| **Persistence + backup coverage** | **CONFIRMED** | All 11 reporter stores in shared `kbl-tracker` DB, all backup-covered; the v12 defect does NOT touch reporter data (it drops the v13-15 *franchise-economy* stores). |
| **Accuracy/inaccuracy model exists + is real** | **PARTIAL** | Built on the legacy engine, **flag-only (never distorts text), orphaned at consumption, absent from the live pipeline**. A BUILD gap for relationships-lite. |
| **§5 invariant (LLM narrates, never decides)** | **CONFIRMED** | LLM output is strictly display + persist-as-text; no morale/fame/value/designation writes anywhere. Safe to wire. |

---

## B. THE CRITICAL FACT: TWO REPORTER SYSTEMS COEXIST

The certification must not conflate them. There are **two disjoint reporter clusters**:

1. **LIVE / "living-season" system** (`src/src_figma/app/engines/reporter/*` + `src/types/reporter.ts` + storage). Real LLM generation via Supabase Edge Functions. Persona = `BeatReporter {id, teamId, leagueId, name, personality, voiceStyle, eraFlavor, avatar…, currentMood, moodMomentum}` (`src/types/reporter.ts:79`). Records: `GameStory` (post-game column, `reporter.ts:100`), `CommentaryFeedEntryRecord` (per-play/preamble/between-inning, `reporter.ts:188`, discriminated by `kind`). **This is the system the spec means by "wired into Exhibition/Elimination."** It has **no accuracy/unreliability concept at all**.
2. **LEGACY system** (`src/engines/narrativeEngine.ts`, 40KB). A *second, incompatible* `BeatReporter {firstName,lastName,tenure,reputation,fanMoraleInfluence}` (`narrativeEngine.ts:37`) + `GeneratedNarrative` — **this is the cluster that carries the accuracy model** (`isAccurate`, `InaccuracyType`, `REPORTER_ACCURACY_RATES`). Reached live ONLY via `generateGameRecap` (`narrativeIntegration.ts:50-81`) from the GameTracker end-game handler and **FranchiseHome's `BeatReporterNews`**.

**Consequence for franchise today:** the franchise hub displays the *legacy* template prose (low-fidelity, throwaway persona), while the *live* GameStory columns the spec wants are never shown in franchise. The two systems must be reconciled — a JK ruling (§I, D-R2).

---

## C. CADENCE — CERTIFIED REALITY

The live firing engine is `useCommentaryFeed`, driven by GameTracker watchers; the LLM clients are stateless and only fire when called. There are **five potential beats; only two fire live in any mode**:

| Beat | Status | Trigger (file:line) | Gate |
|---|---|---|---|
| **Pregame assignment** | on-demand (user click) | `ReporterAssignmentPanel` AUTO/RE-GENERATE | rendered only in Exhibition/Elimination |
| **Pregame preamble** (`firePreamble`) | **ORPHANED** (all modes) | def `useCommentaryFeed.ts:494`; live GT retired it `GameTracker.tsx:5301-5303` | zero live callers |
| **Per-play commentary** (`firePlayCommentary`) | **ORPHANED** (all modes) | def `useCommentaryFeed.ts:603`; callers only in tests | zero live callers |
| **Between-inning summary** (`fireBetweenInningSummary`) | **LIVE** (the only per-inning beat) | `GameTracker.tsx:5308-5352` | `gameState.liveBeatReporterEnabled` (default **false**) |
| **Post-game columns** (`firePostGameColumns`) | **LIVE** (once/game) | `GameTracker.tsx:11701-11724` (primary) + `:5383-5416` (backup) | `gameState.postGameColumnsEnabled` (default **true**) |
| Almanac | read-only, not a generation cadence | `AlmanacNarratives.tsx:88` (list on mount) | — |

- **No scheduled/cron/interval reporter generation exists anywhere.**
- The GameTracker trigger sites are **NOT mode-gated against franchise** — `effectiveReporterGameMode` resolves `'franchise'` (`GameTracker.tsx:1502-1509`), so a franchise game *structurally reaches* the same watchers.
- **Net franchise cadence today = ZERO live reporter output:** `liveBeatReporterEnabled` defaults false and no franchise UI flips it (between-inning never fires); post-game columns default ON but **skip** because `getReporterForTeam` returns null (no franchise assignment UI) → `resolveCallPrerequisites` returns `disabled_reporter` (`useCommentaryFeed.ts:453-454`).

**Once connected, franchise inherits the exact Exhibition/Elimination cadence:** between-inning historical-tidbit summaries (only if the live flag is on) + once-per-game post-game columns. Richer in-game cadence (per-play/preamble) is **not a connect job** — those have zero live callers in any mode and need new GameTracker call sites built.

---

## D. FRANCHISE WIRING STATUS — THE CONNECT-LIST

**Already franchise-ready (live, mode-agnostic, no new engine):** mode resolution + scope identity (`franchiseId/seasonId/seasonNumber`) flow into the hook + persisted records (`GameTracker.tsx:1502-1537, 5232-5233`); the `useCommentaryFeed` cadence engine; persistence (gameStories/commentaryFeedEntries tagged with franchise scope); the LLM client/cost layer; prompt assembly. All reached identically for franchise.

**Missing / gated for franchise (the connect tasks, no new engine code):**
1. **No franchise reporter-assignment UI.** `ReporterAssignmentPanel` is rendered ONLY in `ExhibitionGame.tsx:1086` + `EliminationHome.tsx:640`. → render it in a franchise season-setup/pregame surface so `getReporterForTeam` returns a persisted reporter (else every beat silently skips).
2. **Franchise game-launch omits the reporter flags.** Both franchise `navigate()` blocks (`FranchiseHome.tsx:3521` regular, `:974` playoff) omit `liveBeatReporterEnabled/postGameColumnsEnabled`, and FranchiseHome never writes the `kbl-pending-*` sessionStorage keys (Exhibition does at `ExhibitionGame.tsx:703-708`). → pass the flags into both blocks (or write the pending keys) so the user controls the reporter instead of silently inheriting live-OFF/post-ON.
3. **Franchise hub shows divergent legacy prose.** `FranchiseHome.BeatReporterNews` calls `generateGameRecap` WITHOUT a reporter arg (`FranchiseHome.tsx:4461/4480`) → `narrativeIntegration.ts:78` fabricates a throwaway persona, and it reads `getRecentGames`, never the persisted `GameStory` records. → replace/augment it to read the live GameStories (couples to D-R2).
4. **(Build, not connect)** the accuracy model for §24 — see §F.

---

## E. PERSISTENCE + BACKUP — CERTIFIED SAFE FOR REPORTER

All reporter state lives in ONE shared DB `kbl-tracker` (`trackerDb.ts:16-17`, `TRACKER_DB_VERSION=15`), single shared initializer, **no `src/utils` vs `src_figma/utils` duplicate-copy pattern** (the src_figma copies are 1-line re-export stubs).

**11 reporter stores, all keyPaths verified, all in the backup registry:** `reporters` (v9), `gameStories` (v9), `commentaryFeedEntries` (v10), `reporterPlayerAlmanacCaches` / `reporterTeamAlmanacCaches` / `reporterAlmanacEntries` / `reporterLegacySummaryJobs` (v7), `llmUsageLog` (v8), `userPreferences` (v8), `narrativeContext` (v9), `rivalryScores` (v9). `almanacNarrativeArchive.ts` is a read-only aggregator, not its own store.

**The v12 stale-registry defect is CONFIRMED but does NOT touch reporter data.** `STATIC_DATABASE_SCHEMAS['kbl-tracker'].version=12` (`backupRestore.ts:275`) lags trackerDb's v15; the 3 silently-dropped stores are **exclusively** `franchiseTrueValueRows` (v13), `franchiseDesignationRows` (v14), `franchiseSeasonLedgerRows` (v15) — all reporter stores are ≤v12 and present. So reporter data is **NOT at loss-on-export OR loss-on-restore risk** (a destructive recreate-at-v12 restore would survive every reporter store and destroy only the 3 franchise-economy stores).

**Two persistence caveats (not reporter-data-loss, but real):**
- The **entire backup/restore feature is ORPHANED** — `exportAllData/restoreAllData/restoreFromFile` have zero non-test callers; the only "backup" UI (`FranchiseSelector.tsx:97`) is a separate per-franchise export whose own text says restore "is not implemented yet." Reporter (and all) data has **no user-triggerable off-device durability today.**
- The **reporter-almanac legacy-summary write substrate is ORPHANED** — `addReporterAlmanacEntry`/`putPlayerAlmanacCache`/etc. have no live caller (only `summarizer.ts`, itself with no live importer). Franchise's persistent "living-season reporter memory" **never persists** until that writer is connected; it will back up as empty.

> Adjacent (not reporter, but discovered): the v12→v15 defect threatens franchise SALARY/VALUE data on any future restore. Already tracked as the `backupRestore.ts` hardening ticket in CURRENT_STATE — this read independently confirms it.

---

## F. THE ACCURACY / INACCURACY MODEL — A BUILD GAP FOR §24

Relationships-lite (§24.5 pre-move heads-up) and charged matchups (§24.7) are designed to "inherit the reporter's ~10% inaccuracy." **There is no working applied model to inherit.**

What exists (`src/engines/narrativeEngine.ts`, the legacy engine):
- `REPORTER_ACCURACY_RATES` per-personality 0.65–0.95 (`:351-362`; "~10%" is a rough midpoint, not a literal constant — the real rate depends on assigned personality).
- `determineStoryAccuracy` = **unseeded** `Math.random() < rate` (`:553-555`).
- `generateNarrative` actually computes + stamps `isAccurate/confidenceLevel/inaccuracyType/requiresRetraction` (`:1030, :1042-1057`), live at game-end via `generateGameRecap`.

Why it is NOT real:
- **It never distorts the text.** `generateHeadline/Body/Quote` (`:920/944/977`) take only `(personality, context)` — they never receive `isAccurate`. An "inaccurate" story reads identically to an accurate one. It is a flag, not an unreliable-narrator.
- **The flag is discarded everywhere live.** The only renderer (`NarrativeDisplay.tsx:204`) is imported only by its own test (orphaned/unrouted). `FranchiseHome.tsx:4471-4493` cherry-picks headline/body/quote/name and **drops** the accuracy fields. The persisted `GameStory` type has **no accuracy field.** The live `commentaryEngine/promptBuilder/useCommentaryFeed` pipeline has **zero** accuracy concept (and `promptBuilder.ts:514-529` *forbids* invention).
- Retraction/credibility logic (`:659, :714`) is fully orphaned; there is no `narrativeEngine.test.ts`.

**Implication:** §24 must treat this as a **BUILD**, not a connect: a reusable, **seeded** inaccuracy primitive (parameterized by edge-intel, not by `NarrativeEventType`), a decision on what "inaccuracy" *means* (distort content / hedge confidence / flag only — current code only flags), a persisted accuracy field on the relevant record, and new cadence hooks at roster-move-finalize + pregame (the legacy roll only fires at game-recap). None of the §24 consumer code exists yet.

---

## G. THE §5 INVARIANT — CONFIRMED, SAFE TO WIRE

The "matrix is the math; the reporter is the words; the LLM never decides an outcome" firewall **holds, structurally and mode-independently.** Traced every path out of all four generation surfaces (`grokClient`, `claudeClient`, `GrokCommentaryEngine`, legacy `narrativeEngine`):
- Clients return only `{text, inputTokens, outputTokens, raw}` (`grokClient.ts:139-145`, `claudeClient.ts:122-128`).
- Every consumer in `useCommentaryFeed` sinks text into exactly two places: React display state (`setCommentaryEntries`) and dedicated reporter IDB stores (`persistEntryRecord`/`persistGameStory`). Zero `setGameState/updateMorale/saveTrueValue/setDesignation` calls in the reporter cluster.
- Reverse trace: no morale/value/designation engine imports `GameStory`/`CommentaryFeedEntryRecord`; `fanMoraleEngine`/`useFanMorale` are driven by deterministic game results, not reporter output.
- Legacy path output flows only into `navigate({state})` for display (`GameTracker.tsx:11748-11749`).

**Forward caution for §24:** if a future franchise feature ever *gates* a GM/value/designation decision on reporter-emitted (possibly-wrong) intel, that is the first place §5 could break — the relationship-intel layer must surface unreliable intel as **display only**, never as an input to deterministic state.

---

## H. OTHER NOTABLE FINDINGS

- **No offline/templated fallback.** The reporter is a **server-key, network-dependent** feature: clients POST to Supabase Edge Functions (`grok-commentary`, `claude-column`) that hold `GROK_API_KEY`/`ANTHROPIC_API_KEY` server-side. With no Supabase project configured, clients throw → engine returns skipped/null → **reporter produces zero text in every mode.** (Keys are never client-env-injected nor user-entered.)
- **Claude column spend is unbounded client-side.** The daily rail (`isWithinDailyCallLimit`, 500/day) counts `provider==='grok'` only; Claude post-game columns are not rate-limited — over a long franchise season, column spend has no client-side budget gate. Cost-aggregation functions (`getUsageMonthToDate`, etc.) are orphaned (no UI).
- **Reporter mood is static.** `INITIAL_MOOD_STATE` is never recomputed from game momentum; the MOOD STATE prompt block is effectively constant. **Fan morale is not a prompt input** — §13 "turn up the heat" is only partially realized (via `dramaticWeight = leverage+fame`, not mood/fan-morale).
- **`narrativeIntensity` thresholds largely unconsumed.** The spec'd per-intensity cadence knobs (`expectedGrokCallsPerGame`, `commentaryWpaThreshold`) are not wired into the live notability gate; only `low=off` is honored. Live per-play threshold is a fixed `BASE_NOTABILITY_THRESHOLD=0.05`.
- **`MatchupDramaBar` is orphaned** — rendered only by its preview page + tests, never in GameTracker/PostGameSummary/franchise.
- **`HISTORICAL_FACT_BANK` is real-MLB-only** (14 hardcoded entries); no in-universe/franchise almanac milestone facts are wired into between-inning selection.
- **Reporter-facing `FameTier` (5-tier, `reporter.ts:8`)** is deliberately distinct from franchise `FameLevel` (6-tier, `game.ts:106`) — and neither matches the §20.7 nine-tier living-season ladder. Fame reconciliation (§20.8) is a separate Phase-2 concern, flagged here for the coupling.

---

## I. JK RULINGS (2026-06-16 — cadence SETTLED; logged in DECISIONS_LOG)

The four forks below were ruled by JK on 2026-06-16. Recommendations were the Captain's; the **RULING** line is authoritative.

- **D-R1 / REP-1 — Franchise reporter cadence v1 = POST-GAME COLUMNS ONLY.** *(Captain recommended "match Exhibition/Elimination"; JK ruled leaner.)* **RULING:** franchise v1 fires **only post-game columns** — no between-inning summaries, no per-play, no preamble. The reporter speaks after the game only. ⇒ `liveBeatReporterEnabled` is not needed for franchise; only `postGameColumnsEnabled` must be set on launch. Smallest connect surface, lowest LLM cost.
- **D-R2 / REP-2 — Canonical franchise news = the LIVE GameStory/PostGameColumns system.** **RULING (matches recommendation):** rewrite `FranchiseHome.BeatReporterNews` to read persisted `GameStory` records; retire the legacy `generateGameRecap` template path for franchise.
- **D-R3 / REP-3 — Franchise reporters keyed by `franchiseId`.** **RULING (matches recommendation):** scope by `franchiseId` (stable across the franchise's life, NOT per-season). Reconcile assignment + `getReporterForTeam` (currently `leagueId`-keyed) to a `franchiseId` scope for franchise games — prevents collision with Exhibition reporters sharing `teamId+leagueId`.
- **D-R4 / REP-4 — Accuracy/inaccuracy model built FRESH in the §24 ticket.** **RULING (matches recommendation):** the base reporter-connect ticket ships WITHOUT it. The §24 relationships-lite ticket builds a reusable **seeded** inaccuracy primitive + a persisted accuracy field; meaning recommended as hedge/flag in v1, content-distortion deferred (final meaning ruled when §24 is drafted). Base reporter is unblocked now.
- **D-R5 — Non-blocking hardening (NOT gating cadence):** the whole backup/restore feature + the reporter-almanac "living-memory" writer are both orphaned (no user trigger today); Claude column spend has no client-side rail (Grok-only 500/day); reporter is server-key/network-dependent (no offline fallback). Bump the `backupRestore` v12 pin → 15 remains a separate tracked ticket.

### Resulting franchise reporter-connect scope (post-rulings)

A single **base reporter-connect ticket** (no new engine), gated by the rulings above:
1. Render `ReporterAssignmentPanel` (or an auto-assign) in a franchise season-setup/pregame surface, keyed by **`franchiseId`** (REP-3), so `getReporterForTeam` resolves for franchise teams.
2. Pass **`postGameColumnsEnabled`** into both franchise `navigate()` blocks (`FranchiseHome.tsx:3521`, `:974`) — `liveBeatReporterEnabled` intentionally stays off (REP-1).
3. Rewrite `FranchiseHome.BeatReporterNews` to read persisted `GameStory` records; retire the legacy template for franchise (REP-2).
4. Confirm the `leagueId`/`franchiseId` the franchise launch passes into GameTracker matches the assignment scope.

The **§24 relationships-lite ticket** separately owns the seeded inaccuracy primitive + persisted accuracy field (REP-4).

---

## J. METHOD & EVIDENCE NOTE

All `file:line` citations above were read by sub-agents during the workflow and the most decision-critical were independently re-derived by adversarial verifiers (not trusted from a single read). Full per-dimension maps + per-claim verdicts are in the workflow transcript (`wf_b13006c5-031`). The one mapper error (the false "`narrativeEngine.ts` does not exist") was caught by cross-verification and corrected here.

---
---

# PART 2 — §18.1b: THE SEASON-LONG NARRATIVE CADENCE

**Added:** 2026-06-16. Method: a second workflow `reporter-season-cadence-read` — 7 dimension-mappers + 5 adversarial verifiers (12 agents, ~1.18M tokens). Trigger: JK flagged that PART 1 / REP-1 settled only the **in-game** cadence (post-game columns); the **season-long** narrative cadence — how the reporter tells the morale / relationship / race / designation story *between* games — was never addressed. This is the soul-anchor half.

## K. HEADLINE: SEASON-LONG ≠ CERTIFY-AND-CONNECT. IT IS A BUILD, AND IT IS THE PHASE-2 "PUBLISH BUS."

The in-game reporter was a connect job. The season-long narrative is **overwhelmingly UNBUILT**, and — critically — **it cannot be specced as a standalone ticket** because it is a *downstream consumer of nearly every Phase-2 system.* The reporter narrates what the deterministic matrix (§5) produces; most of those matrix event **sources are themselves the unbuilt Phase-2 features** (live designations, races, random events, morale ledger, relationships, manager firings). So the season-long cadence is not a clock — it is **event-driven, where the events ARE the Phase-2 build**.

| Decision-critical claim (adversarially verified) | Verdict | One-line |
|---|---|---|
| **Season-news record exists** | **CONFIRMED gap** | No persisted record for a non-game news item. Only `GameStory` (recaps) + `CommentaryFeedEntryRecord` (in-game), both `gameId`-bound. Must BUILD a `SeasonNewsItem`. |
| **Event sources mostly unbuilt** | **PARTIAL (refined)** | 5 of 9 sources genuinely UNBUILT; the 4 that fire (game-end, milestone, trade, call-up/send-down) fire as **bare data/transactions** — only game-end drives a take; trade/roster riders are hardcoded `false`. |
| **Season-memory substrate orphaned** | **CONFIRMED (half-wired)** | The almanac/legacy-summary memory's READ-back is live (feeds the prompt) but the WRITE/REGEN is test-only → the prompt input is **structurally always empty** ("No legacy summary supplied."), and read-back is in-game-only. |
| **Pre-action intel hooks** | **CONFIRMED build** | §24.5 pre-move heads-up = pure BUILD (no seam; reserved slots are literal-`false` stubs). §24.7 charged-matchup = CONNECT-the-orphan (revenge substrate exists in `tradeEngine.ts`/`headlineEngine.ts`, orphaned) + BUILD the empty relationship data source. FINDING-133 has zero code. |
| **Sim-tunable emission gate** | **CONFIRMED build** | No per-event-type, sim-drivable emission gate. Only the in-game WPA `notabilityScorer` (fixed threshold) + user-facing `narrativeIntensity` (`setNarrativeIntensity` has zero live callers). The §21.5 marquee valve must be built. |

> Digest corrections caught by verifiers (logged for honesty): the event-sources mapper wrongly called **trade** and **call-up/send-down** "blocked/unbuilt." They DO fire live via `TradeFlow.tsx:310/311/349` (rendered at `FranchiseHome.tsx:1409`); the "blocked until Phase 11" string is a *different* path (`FinalizeAdvanceFlow.tsx:263`). Corrected below.

## L. CERTIFIED EVENT-SOURCE READINESS (what the cadence can subscribe to)

| Source | State | Evidence |
|---|---|---|
| Game completion | **BUILT-AND-FIRES** (drives the only live take) | `useGameState.ts:11177` → `seasonAggregator.ts:179`; recap via `generateGameRecap` |
| Milestone | BUILT-AND-FIRES (data only, **no take**) | detection at `seasonAggregator.ts:179`; `generateMilestoneNarrative:1201` ORPHANED |
| Trade | BUILT-AND-FIRES (**rider hardcoded false**) | `TradeFlow.tsx:349` `dryRun:false`; `franchiseTradeAdapter.ts:225` `relationshipMutationApplied:false`; `generateTradeNarrative:1142` ORPHANED |
| Call-up / send-down | BUILT-AND-FIRES (**rider false, no take, no heads-up**) | `TradeFlow.tsx:310/311`; `franchiseRosterMovement.ts:98-99` literal-false |
| Designation flip | **UNBUILT** (v1-readonly, no live recompute, no flip event) | `franchiseDesignationEligibility.ts:8` contract `v1-readonly` |
| Manager firing | **UNBUILT** (only a dead scalar) | `salaryCalculator.ts:1306` `managerFireProbability`, 0 consumers; `calculateFanExpectations` orphaned |
| Random event (§10) | **UNBUILT** (the existing generator is a fan-morale *prompt* system, different) | grep `d20\|chaos roll\|rollEvent` = 0 |
| Ratings checkpoint (20%) | **UNBUILT** scheduler / offseason-only engine | `ratingsAdjustmentEngine.ts:1-15` "end of season", 0 callers |
| Race standings (§21) | **UNBUILT** | grep `RaceStanding\|mvpRace\|honorRace` = 0 |
| Morale ledger | **PARTIAL** (confirmation-gated fan-morale prompt only, not the auto/logged §5 ledger) | `franchiseRandomEventGenerator.ts` → `TeamHubContent.tsx:127` |
| Relationships | **UNBUILT as a populated source** (`Relationship[]` never written) | `useRelationshipData.ts:90` defaults empty |

**Takeaway:** in v1 the reporter can subscribe *today* only to game-end (+ milestone/trade/roster-move once their take + rider are wired). Every richer beat is gated on building the Phase-2 source first.

## M. THE PROPOSED SEASON-LONG CADENCE MODEL (the "publish bus")

The cadence is not a schedule — it is an **event-driven emission pipeline** that every Phase-2 system publishes into. Six pieces:

- **(A) The bus contract — BUILD.** When a Phase-2 system's deterministic matrix produces a narratable outcome, it emits a structured `NarrativeEvent {eventType, scope (franchiseId/seasonId), subjectIds, facts, dramaticWeight}` (the §5 "matrix is the math" output). Reuse the `NarrativeEventType` *vocabulary* (the enum values), generation on the canonical live system.
- **(B) The emission gate — BUILD (§21.5, sim-tunable).** A new emission-config keyed by event type decides which events get a take: **marquee-only default, sim-writable, shallow Top-N for races.** The season analog of the in-game `notabilityScorer`. (Per JK 2026-06-16: emission is a sim-tunable knob — the Simulation Gate §16 settles volume.)
- **(C) The reporter — BUILD (on the canonical live system, REP-2).** A new non-game generation method (`generateSeasonNewsTake` + prompt builder) renders the gated event into a persisted **`SeasonNewsItem`** record, via the existing Grok/Claude transport, fed facts per §5. (The canonical live reporter has only 4 game-bound methods today.)
- **(D) Memory — CONNECT.** Each take seeds the already-built almanac/legacy-summary substrate (`addReporterAlmanacEntry` + the 5-event regen drain) so future takes carry season context. Substrate is built; the writer tap + a regen scheduler + a between-games read surface are the connect work.
- **(E) Surfaces — BUILD/CONNECT.** The franchise hub **season feed** (rewrite `BeatReporterNews` to read `SeasonNewsItem`s — REP-2) + the **Almanac** archive (already routed) + per-event cards. The orphaned `listGameStoriesForFranchiseSeason` / `listCommentaryFeedEntriesForFranchiseSeason` aggregators get a consumer here.
- **(F) Pre-action register — BUILD (with §24).** The same bus, fired at the *action moment* (pre-move heads-up §24.5; charged-matchup pregame §24.7) rather than post-hoc. **Advisory only** — §24.5 says "a pre-commit heads-up, NEVER a hard gate," which *supersedes* the older `FARM_SYSTEM_SPEC` "blocking modal" wording (FINDING-133). Couples to the §24 relationship data source + the REP-4 accuracy model.

**The cadence "schedule" = the union of the registers:** per-game recap (built, REP-1) · per-event take (built incrementally with each Phase-2 source) · per-checkpoint take (when ratings-shift/races land) · pre-action intel (with §24) · season-arc summary (late — `SEASON_SUMMARY` rollup).

## N. SEQUENCING IMPLICATION (the key planning takeaway)

The reporter foundation = **(A) record + (B) emission gate + (C) non-game generation + (D) memory wiring + (E) hub feed** — is **independently buildable now** and should be built **EARLY** as the Phase-2 publish bus. Then **each later Phase-2 system adds its event tap** as it lands (designations-live → a flip take; races → a standings take; trades → flip the false rider + a trade take; §24 → relationship beats + pre-action intel). The reporter is therefore **not a standalone late ticket** — it is soul-layer infrastructure that the whole living season emits into, so it belongs near the front of the Phase-2 dependency order.

## O. JK RULINGS (2026-06-16 — season-long cadence SETTLED; logged in DECISIONS_LOG)

- **SEA-1 — RULED: accept the publish-bus model; build the foundation (A–E) EARLY.** The reporter foundation (news record + sim-tunable emission gate + non-game generation on the canonical live reporter + hub season-feed + wiring the orphaned season-memory) goes near the FRONT of the Phase-2 dependency order as the infrastructure every soul-layer system emits into; each later system adds its event tap as it lands.
- **SEA-2 — RULED: separate season-emission-config.** A new config keyed by the season-event taxonomy (per-event-type base rate + per-race Top-N + marquee-only flag), sim-writable, kept distinct from the player-facing in-game `narrativeIntensity` dial.
- **SEA-3 — DEFERRED to data-model design:** fold season news into one `SeasonNewsItem` vs reuse the reserved dead stores (`narrativeContext` for storyline state, `rivalryScores` for §24 relationship edges). Captain lean: one `SeasonNewsItem` for news + `rivalryScores` for relationship edges.
- **SEA-4 — RULED (Captain reconciliation, not vetoed): pre-move heads-up is ADVISORY, never a hard gate** — §24.5 supersedes the older `FARM_SYSTEM_SPEC` blocking wording.
- **SEA-5 — RULED (Captain reconciliation, not vetoed): REP-2 holds** — season takes are generated on the canonical LIVE reporter; the orphaned legacy templates are not revived (vocabulary reused, generation rebuilt on the live system).

**§18.1 reporter read COMPLETE** — both the in-game cadence (REP-1..4, §I) and the season-long cadence (SEA-1..5) are settled. The reporter-foundation ticket + per-source event taps fold into the Phase-2 "living-season D-stack" sequencing.
