> ⚠️ **SUPERSEDED (2026-07-01).** The single v1 source of truth is **`spec-docs/V1_BUILD_STATUS.md`** (see its §5). This doc predates the 2026-06-30 draft re-design + the 24-archetype lock; its status / branch-map / scope claims are stale. Kept for history — do not plan from it.

# MODE 1 — V1 VERIFICATION PASS (V1–V12 + costed build queue)

**Date:** 2026-06-20  **Auditor:** Claude Opus 4.8 (Captain)  **Branch:** `codex/franchise-v1-next`
**Type:** READ-ONLY static audit. No code changed; no build/test run (concurrent-safe with the live L13-6 build). Verification tier = static code reads with `file:line` + verbatim quoted code on every load-bearing claim. Method: 12 parallel read-only investigators (one per item), each given the prior-audit anchor + the relevant spec section and required to (a) quote the actual lines, (b) adversarially grep before declaring MISSING, and (c) confirm/update the cited prior finding against the current tree. The Captain independently grounded the synthesis against both prior audits, vision §§1–8, `IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md` §§1–7, and the park-factor / prospect-generation / personality / scout-checkpoint specs.

**Gospel (checked against):**
- `MODE1_LEAGUE_BUILD_TO_DRAFT_VISION.md` §§1–8 (ratified JK decisions incl. R1–R10 + §8 additions).
- `IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md` (IV engine, tiers §5, identity/archetype §6, drafts §7).
- Subsystem specs per item: `STADIUM_ANALYTICS_SPEC.md`, `PARK_FACTOR_SEED_SPEC.md`, `PROSPECT_GENERATION_SPEC.md`, `SMB4_PLAYER_GENERATION_ENGINE_SPEC.md`, `PERSONALITY_SYSTEM_SPEC.md`.

**Relationship to the two prior audits:** this pass **builds on** `LEAGUE_BUILD_TO_DRAFT_AUDIT.md` and `MODE1_TO_MODE2_V1_LAUNCH_READINESS.md` — it does **not** re-derive what they nailed. It resolves only the items they left PARTIAL/VERIFY/open plus the new §8 VERIFY items. Each finding flags **CONFIRM / UPDATE / REFINE** against the cited prior finding.

---

## 0. EXECUTIVE SUMMARY

**Verdict slate (12 items):**

| # | Item | Status | Scope to close | Confirms prior? |
|---|---|---|---|---|
| **V1** | Player-instance clean separation / frozen-at-lock instance | **PARTIAL** | BUILD | CONFIRM (D2) |
| **V2** | "Lock the league" true freeze | **MISSING** | BUILD | CONFIRM (§4.2) |
| **V3** | Reporter re-path state (assigned at exhibition pre-game) | **BUILT** (pre-game, not creation) | WIRING | REFINE (§3.5) |
| **V4** | Snake-farm symmetry + format toggle | **PARTIAL** (symmetry ✅ / toggle ❌) | BUILD (gated on auction) | UPDATE (R1/R2) |
| **V5** | Franchise three-way trade-evaluator orphan | **PARTIAL** (orphaned; not v1-needed) | NONE for v1 | CONFIRM+ (D4) |
| **V6** | Archetypes → draft / budgets | **BUILT** (core wired) | WIRING (residual) | new |
| **V7** | Prospect names from SMB4 pool | **BUILT** | NONE | CONFIRM (D6/2A) |
| **V8** | Stadium analytics depth (park → WAR + Team Hub) | **WIRING-GAP** (seeded+displayed, NOT consumed by WAR) | WIRING | REFINE |
| **V9** | Farm generation up to spec | **PARTIAL** (generates; distribution unvalidated + diverges) | BUILD | new |
| **V10** | R10 morale = 50 seed | **WIRING-GAP** (implicit 50 fallback, no explicit creation seed) | WIRING | new |
| **V11** | R7 tier model (IV objective) | **BUILT / R7-COMPLIANT** | BUILD (farm only) | CONFIRM (D1/§4.3) |
| **V12** | G1 freeze surface (IV + settled salary) | **MISSING** | BUILD (= L-ECON1) | CONFIRM (G1) |

**The four load-bearing conclusions:**

1. **The economy spine is the same hole both prior audits found, now pinned to its writer home.** The two-number freeze freezes **one** number (salary), and the draft-IV baseline is stamped **nowhere** (V12, 0 hits adversarially). The IV exists at lock (`RegisteredPool.players[].iv`) but in the **`kbl-league-builder` DB** and is discarded at the handoff. V12 identifies the exact L-ECON1 home: stamp **both** numbers as a **checkpoint-0 row in the existing `franchiseTrueValueSnapshots` store** (`trackerDb.ts:370`, DB v25) — additive `settledSalary` field, **no DB-version bump → GREEN seam**.

2. **The v1 PRIMARY (auction) is still 0 lines, and snake's v1 survival is conditioned on a toggle that cannot exist until auction does.** V4 confirms snake already snakes BOTH tiers (R1 satisfied for snake leagues), but the format type literally cannot express a choice (`mode: 'auto-snake-v1'`), there is no selector UI, and the auction half is unbuilt. R2's fallback is therefore live: **defer the snake-toggle and ship auction-only, or build auction first and re-expose snake behind a selector.**

3. **The archetype/budget system is real and wired — the biggest positive update of this pass.** V6: `composeIdentity` + `shiftLuxuryCaps` + `luxuryTax` + `assessSolvency` are live in the snake-draft board (per-team GREEN/YELLOW/RED/BLOCKED signals + hard-block), 24/24 engine tests incl. a `composeIdentity` golden oracle. R7's relationship holds in code: tier sets the **budget cap**; archetype shifts the **luxury caps within** the tier; **IV stays objective** (V11 — `TIER_SHIFTS` inert, 0 callers; wiring it into IV would VIOLATE R7).

4. **The remaining gaps split clean into cheap-wiring vs needs-a-ruling.** Cheap wiring: V3 reporter re-path, V10 explicit morale seed, plus the already-known personality→7 / names→SMB4 / R8 two-scout→one / R9 stadium-lock. Needs-a-JK-ruling: V8 (a real spec conflict — `STADIUM_ANALYTICS §1.0` keeps park→WAR "preview-only/blocked" for v1, yet vision §8.8 marks it v1-critical) and V9 (the generator's grade distribution **diverges from `PROSPECT_GENERATION_SPEC` and has never been validated** — JK must pick the canonical grade model before the farm tier-shift can be built).

**Bottom line for JK:** nothing in V1–V12 contradicts the two prior audits — every CONFIRM held verbatim. The pass adds three things they didn't have: (a) the archetype→budget chain is verified BUILT+WIRED (not a gap), (b) the G1 freeze writer now has a precise, GREEN-seam home, and (c) two genuine spec conflicts surfaced (V8 park→WAR v1 boundary; V9 grade-model + the stale captain-charisma-floor item) that need rulings before their builds are scoped.

---

## V1 — PLAYER-INSTANCE clean separation / frozen-at-lock instance (§2.H) — **PARTIAL** · BUILD

**Verdict:** the healthy base-vs-instance pattern is present **in SHAPE only**; the §2.H "snapshotted pool of player INSTANCES frozen at lock time" is **NOT** implemented. **CONFIRM** of `LEAGUE_BUILD_TO_DRAFT_AUDIT.md` D2 — holds verbatim on the current tree.

- The lock persists a **thin price ref**, not a rich instance snapshot: `export type PoolPlayerPriced = { id: string; iv: number; salary: number };` — `src/engines/leagueConstruction.ts:25`.
- The lock write is exactly `{ id, iv, salary }` per player, no freeze stamp — `src/src_figma/hooks/useLeagueBuilderData.ts:412-419`.
- The base `Player` carries **no IV, no `lockedAt`/`frozenAt`/`isLocked`, no `settledSalary`, no `draftStatus`** — only salary fields (`src/utils/leagueBuilderStorage.ts:260-267`). `LeagueTemplate` likewise has no lock/freeze field (`:91-106`).
- The rich per-franchise instance is the deep copy at creation, which stamps **salary but NOT IV**: `withInitialFranchiseSalary` (`src/utils/franchiseSalary.ts:303-309`) called inside `deepCopyLeagueToFranchise` (`src/utils/franchisePlayerStorage.ts:560-566`).
- **Adversarial grep:** `settledSalary`, `draftStatus`, `lockedAt|frozenAt|isLocked|finalized` → **0 matches** in `leagueBuilderStorage.ts` / `leagueConstruction.ts` / types.

**Build scope (BUILD):** a real lock-time instance snapshot — (a) a frozen marker (`lockedAt`/`isLocked`), (b) the registered pool persists a **full player instance** at lock (not just the `{id,iv,salary}` ref) so post-lock base mutation can't retroactively change the locked pool, (c) the §2.H instance fields (IV, `draftStatus`, `settledSalary`) attach to that instance. Touches `leagueConstruction.ts` (`PoolPlayerPriced`/`RegisteredPool`), `useLeagueBuilderData.registerLeaguePool`, `saveRegisteredPool`, the franchise deep-copy stamp; likely a store/version bump on the league-builder DB. **Sequenced with V2 (lock) and V12 (freeze writer).**

---

## V2 — "LOCK THE LEAGUE" true freeze (§4.2) — **MISSING** · BUILD

**Verdict:** there is no true lock. The only mechanism is a **re-runnable pool snapshot** ("Register Pool"). **CONFIRM** of `LEAGUE_BUILD_TO_DRAFT_AUDIT.md` D1 §4.2 — verbatim.

- `handleRegisterPool` → `registerLeaguePool` → `saveRegisteredPool`, a plain `store.put` overwrite — `src/utils/leagueBuilderStorage.ts:851-862`. Button labeled "Register Pool" (`LeagueBuilderLeagues.tsx:358-368`).
- Neither `LeagueTemplate` (`leagueBuilderStorage.ts:91-106`) nor `RegisteredPool` (`leagueConstruction.ts:33-43`) has a `locked/finalized/status/frozen` field.
- Snake draft **auto-regenerates** the pool when absent: `const nextPool = existingPool ?? await registerLeaguePool(leagueId)` (`LeagueBuilderSnakeDraft.tsx:261`); Start Draft repeats it (`:380`). `registerLeaguePool` re-derives from the live player set with no lock guard (`useLeagueBuilderData.ts:407-420`).
- **Adversarial grep** for `isLocked|finaliz|freeze|lockedAt|isFrozen|lockPool|freezePool` → **0 genuine pool-lock hits** (every "finaliz" is the unrelated offseason "Finalize & Advance"/awards; every "lock"/"block" is JSX `block`, a `BLOCKED` draft signal, or `isLockedAtBatResult`).

**Build scope (BUILD):** add a lock field (`lockedAt`/`frozen` on `RegisteredPool` preferred), guard `registerLeaguePool`/`saveRegisteredPool` to refuse re-registration once locked, change the two snake-draft fallbacks to read the frozen pool, surface a distinct "Lock the League" action. `REGISTERED_POOLS` is an existing store → additive field is non-breaking. **Foundational for V1.** See **WAITING_ON_JK B** for freeze semantics.

---

## V3 — REPORTER re-path state (§3.5) — **BUILT** (at pre-game, not creation) · WIRING

**Verdict:** reporter assignment is a **pre-game** trigger today, **not** a franchise-creation trigger — exactly as §3.5 states. **REFINE** of the prior pointers (correct direction; nuance added).

- Exhibition pre-game renders `ReporterAssignmentPanel` on the setup screen (has START GAME + "before first pitch") — `ExhibitionGame.tsx:1086-1093` (also `EliminationHome.tsx:640`). Panel actions call `autoGenerateReporterForTeam`/`assignReporterToTeam` (`ReporterAssignmentPanel.tsx:97,111`).
- In franchise mode, reporters are generated **lazily at game-launch**, not at creation: `ensureFranchiseReporterForTeam` (idempotent on `getReporterForTeam`) is called from `handleLaunchGame` (`FranchiseHome.tsx:3638-3664`) and `handlePlayPlayoffGame` (`:1010`), delegating to `autoGenerateReporterForTeam(..., franchiseId)` (`:117-128`).
- `franchiseInitializer.initializeFranchise` runs 10 numbered steps and assigns **zero** reporters (`:657-673`; case-insensitive grep for reporter/beat/narrative → only incidental `newSeasonNumber`). `FranchiseSetup.tsx` (the creation component) does not import `reporterAssignment`.
- The persistence store already supports `franchiseId` scoping (`reporterStorage.ts:75-82,120-123`) — **no new store needed**.

**Re-path scope (WIRING, small):** add one step to `initializeFranchise` (after step 6 / before step 10, where `franchiseId`/`leagueId`/teams are in scope) that loops teams and calls `autoGenerateReporterForTeam({id,name,colors}, leagueId, franchiseId)` guarded by `getReporterForTeam` — i.e. lift the existing `ensureFranchiseReporterForTeam` logic up to creation time. Keep the game-launch lazy call as an idempotent safety net (or remove post-verify). Pairs with the §2.C reporter **name** fix + §8.1 pronoun fix (same generator surface). See **WAITING_ON_JK F**.

---

## V4 — SNAKE-FARM symmetry + FORMAT-TOGGLE (R1/R2, §6 V1–V2) — **PARTIAL** · BUILD (gated on auction)

**Verdict:** (a) snake-farm **symmetry is BUILT**; (b) the **format-toggle is MISSING and cannot be expressed today**. **UPDATE** of vision §6 open items V1/V2.

- **(a) symmetry — YES:** the farm/prospect draft is already snake-ordered by the same round-parity reverse across all three engines — `leagueBuilderStartupFarmDraft.ts:550-551`, `franchiseStartupProspectDraft.ts:364` (version `startup-prospect-draft-v1-auto-snake` `:27`), identical to the MLB `buildSnakeOrder` (`leagueConstruction.ts:305-310`). An existing snake league already snakes both tiers → R1 met for snake.
- **(b) toggle — NO:** the config type hard-codes a single literal: `mode: 'auto-snake-v1'` (`src/types/franchise.ts:126-131`) — no `auction|snake` union. The MLB draft session also carries no format field (`leagueBuilderStorage.ts:205-220`). MLB snake and the farm draft are **separate routes** (`/snake-draft` vs `/draft`, `App.tsx:288-292`). **Adversarial grep:** `auction` appears **only in spec-docs** — the auction half a toggle must route to is **0% built**.

**Build scope (BUILD, gated):** the snake side is small (widen `mode` to `'snake'|'auction'`, add a league-wide `draftFormat` both rails read, branch both rails) — but a **clean** toggle is impossible until the **auction side (greenfield)** exists. Per R2's explicit fallback this points to **defer the snake-toggle / ship auction-only**, or build auction first and re-expose snake behind the selector. See **WAITING_ON_JK A**.

---

## V5 — FRANCHISE trade-evaluator orphan — **PARTIAL** (orphaned; not v1-needed) · NONE for v1

**Verdict:** the franchise three-way evaluator is orphaned; the live v1 trade paths are different code and already wired. **CONFIRM + STRENGTHEN** of D4.

- `evaluateThreeWayTrade` (`src/engines/tradeEngine.ts:455`) has **zero importers anywhere** — and the **entire `tradeEngine.ts` module is dead** (no callers in `src/` or `test-utils/`, **no test file** exists).
- In-draft pick validation `validateTrade` (`leagueConstruction.ts:284-300`) **is wired** into the routed snake-draft "TRADE VALIDATOR" UI (`LeagueBuilderSnakeDraft.tsx:427` call, `:626` UI, routed `App.tsx:291`).
- Franchise player trades run through `franchiseTradeAdapter.ts` (fit-preview/dry-run/execute, `:1660-1662`), wired via the routed `FranchiseHome → TradeFlow` (`TradeFlow.tsx:349,719`; `FranchiseHome.tsx:1482`).

**Build scope (NONE for v1):** the draft is served by the live in-draft validator; franchise trades by the live adapter. `evaluateThreeWayTrade` is a WAR-differential AI auto-accept evaluator no v1 surface consumes, and is out of scope under auction-primary v1. (If a future version wants AI multi-team negotiation, the engine exists but would need a caller + UI + tests from scratch.) **No JK question.**

---

## V6 — ARCHETYPES → draft / budgets (§8.3 VERIFY) — **BUILT** (core wired) · WIRING (residual)

**Verdict:** **SPECCED** (`IV_ENGINE` §6 Team Identity + §5.3 Luxury Concentration) **and BUILT/WIRED** for the v1 budget-relevant path. This is a positive update — the archetype→budget chain is not a gap.

- `composeIdentity` (§6.3 greedy band-tag selection) — `leagueConstruction.ts:156-174`; `shiftLuxuryCaps` applies the identity cap-mod deltas to the tier luxury caps (`:217-224`); `luxuryTax` is the §5.3 concentration layer (top-N vs cap, convex penalty as budget drain, `balanceMode` short-circuits the charge not the computation, `:247-261`).
- **LIVE wiring:** the snake-draft board shifts each team's caps by its `capIdentity` and feeds them into `assessSolvency` per candidate (`LeagueBuilderSnakeDraft.tsx:317-339`), renders per-team `GREEN/YELLOW/RED/BLOCKED` (`:710-717`), and **hard-blocks** unaffordable picks. `composeIdentity` is wired to the Team Identity UI persisting `capIdentity` (`LeagueBuilderTeams.tsx:715-728`). 24/24 engine tests incl. a `composeIdentity` golden oracle.
- **R7 relationship in code:** `TIER_CAPS` sets the tier budget (`tierParams.ts:65-68`); `CAP_MODIFICATION_FRACTIONS` shift the luxury caps **within** the tier — i.e. tier=budget, archetype=shape-within-budget, IV untouched (consistent with V11).

**Residual NOT in v1 (WIRING / deferred):** (b) draft-board **recommendation re-ranking** by identity is absent — candidates sort by **raw IV** (`LeagueBuilderSnakeDraft.tsx:343`); identity-weighted ordering + positional-scarcity weighting is net-new wiring over existing `assessSolvency`. (c) AI-bidder `archetypeFit` (§7.6 shills) is 0-hit — but the spec marks it the **v1.5 auction module**, explicitly not v1-gating → roadmap, not a v1 gap. Minor: `CAP_MODIFICATION_FRACTIONS` has 41 keyed entries (40 mods + the `--` null row) vs the spec's "42" label — count reconcile (the routing mechanic is golden-tested). See **WAITING_ON_JK C**.

---

## V7 — PROSPECT NAMES from SMB4 pool (§8.4 VERIFY) — **BUILT** · NONE

**Verdict:** farm **prospect** names are generated from the real SMB4 name pool, seeded, test-locked. **CONFIRM** of the prior finding (two precision corrections, immaterial to verdict).

- `firstName: pick(\`${seed}:first\`, SMB4_FIRST_NAMES), lastName: pick(\`${seed}:last\`, SMB4_LAST_NAMES)` — `src/utils/prospectScoutingDraftEngine.ts:540-541`. Those aliases import `FIRST_NAMES`/`LAST_NAMES` from `src/data/nameDatabase.ts` ("Auto-generated from … names_database.json // 2756 first names, 2128 last names", `:1-2`).
- Selection is deterministic FNV-1a (offset `2166136261`, prime `16777619`, `>>>0`) over a per-candidate-index seed (`${input.seed}:candidate:${index}`) — `:261-272,528`. Engine is wired (called by `franchiseStartupProspectDraft.ts`, `leagueBuilderStartupFarmDraft.ts`, `franchiseInitializer.ts`), not orphaned.
- Test-locked: SMB4-pool membership + `>40` unique first/last + full-name uniqueness + determinism — `src/utils/tests/prospectScoutingDraftEngine.test.ts:147-151`.

**Build scope (NONE).** Two prior-audit doc-hygiene corrections: the file is `src/utils/` (not `src/engines/`), and `smb4NameDatabase.ts` is **not** byte-identical to `nameDatabase.ts` (it's an unused sibling; the prospect engine imports `nameDatabase.ts`). Scope boundary: this covers **prospects only** — the known reporter/bridge-scout name violators are a **different generator** (in the build queue). **No JK question.**

---

## V8 — STADIUM ANALYTICS depth (§8.8 VERIFY, v1-critical) — **WIRING-GAP** · WIRING

**Verdict:** park factors are **real and seeded** and Team Hub **surfaces them at moderate depth**, but **no WAR calculator consumes them** — computed-but-not-consumed. **REFINE.**

- **Seeded + non-neutral:** 23 SMB4 parks with real dimensions (`src/data/smb4-parks.json:2-5`); the deriver computes non-neutral factors from fence ratio + wall height (`parkFactorDeriver.ts:78-93`) — not 1.0 stubs.
- **Team Hub surfacing (moderate depth):** dimensions + seed `Runs/HR/Overall/Confidence` + spray inspector — `TeamHubContent.tsx:5266-5267`.
- **NOT consumed by WAR:** the bWAR park branch exists (`bwarCalculator.ts:237-241`) but **every live caller omits the options** so `parkAdjustment` stays 0 — `warOrchestrator.ts:216`, `useWARCalculations.ts:208`; season-level uses `calculateBWARSimplified` which passes **no options** (`bwarCalculator.ts:273-278`). `calculatePWAR` has **no park parameter at all** and a neutral stub table (`pwarCalculator.ts:289-296,521-530`). `applyParkFactor`/`applyMultiTeamParkFactor`/`applyPitcherParkFactor` are **orphaned** (0 live callers).
- Team Hub itself states the gap: *"Adaptive factors are preview-only. Park-adjusted WAR/value consumers remain blocked."* (`TeamHubContent.tsx:5272-5273`).

**SPEC CONFLICT (must reconcile):** `STADIUM_ANALYTICS_SPEC §1.0` (Mode-2 v1 resync) **deliberately** keeps **archive-derived adaptive** park factors "preview-only until a later audit approves persistence and final value/WAR consumers" while preserving **seed/static** factors — i.e. the spec itself defers WAR consumption for v1. Vision §8.8 marks Stadium Analytics **v1-critical** and §6.1 claims `applyParkFactor` is "now fully implemented" (misleading — the function exists but no live WAR path calls it).

**Build scope (WIRING, if JK wants it in v1):** thread `stadiumName + batterHand (+ homePA split)` into `calculateBWAR` options at `warOrchestrator.ts:216` / `useWARCalculations.ts:208` (consumption machinery already exists); add an `options.parkFactor` to `calculatePWAR` and call the already-built `applyPitcherParkFactor`/`getParkAdjustedERA`; wire the 40%-of-season activation gate (`parkFactorDeriver.ts:129`, per `PARK_FACTOR_SEED_SPEC §2`). Depends on handedness + home/road PA splits reaching the WAR input. See **WAITING_ON_JK D** (the seed-vs-adaptive v1-boundary ruling).

---

## V9 — FARM GENERATION up to spec (§8.9 VERIFY, important) — **PARTIAL** · BUILD

**Verdict:** the generator is built + wired and uses a **Gaussian bell-curve primitive**, but the **grade distribution diverges from `PROSPECT_GENERATION_SPEC` and has never been validated**; the R7 tier-shift is absent.

- Ratings are Box-Muller normal around a grade-keyed center, σ≈7, clamped `[20,99]` — `prospectScoutingDraftEngine.ts:382-384`. Trait split 30/50/20 **matches** spec §2.2/§3.4 (`:534-535`).
- **Grade distribution DIVERGES:** the code uses **three round-keyed weight tables** with a **`D+` grade and no `A+`/`S`** (`:233,316-330`), whereas `PROSPECT_GENERATION_SPEC §3.2` specifies **one fixed A–D table** (A 2% … D 8%, no `D+`) (`spec:60-71`). Grade centers and σ also differ (code σ=7 vs spec σ=8). Position model is a flat hardcoded pool (uniform, **no DH/UTIL**, `:234-245`) vs spec §3.3's weighted map.
- **Never validated:** the 335-line test asserts determinism / no-DH / salary / scout-accuracy but has **zero** grade-histogram or proportion checks (`prospectScoutingDraftEngine.test.ts:58-90`).
- **R7 tier-shift MISSING:** the generator imports no tier param (`:1-8`); `FARM_NERF_SCALES` (`tierParams.ts:51-55`) and `farmGradeMode` (DSF-3/L-ECON3) are defined/contracted but have **zero consumers** (`ROADMAP_TO_V1.md:83` "L-ECON3 not-started").

**Build scope (BUILD, two parts):** (1) **Validation** — add a distribution test sampling a large class and asserting grade histogram + trait split + position spread vs spec targets within tolerance (forces the spec-vs-code grade-model decision). (2) **R7 tier-shift** — thread a `farmGradeMode` param into `generateProspectScoutingDraft` so the round-keyed grade tables / centers skew by `FARM_NERF_SCALES`, reaching both call sites (`leagueBuilderStartupFarmDraft.ts:572,1171`; `franchiseStartupProspectDraft.ts:384`) — **never touching the objective per-player IV** (V11). See **WAITING_ON_JK E** (canonical grade model).

---

## V10 — R10 MORALE = 50 seed — **WIRING-GAP** · WIRING

**Verdict:** `franchiseInitializer` **never seeds morale at creation** — 50 exists only as a lazy read-fallback. The contract is met **in effect** (neutral midpoint, and it does **not** default to 0), but **not** by an explicit creation-time write.

- `initializeFranchise` steps 1–10 contain **no** morale reference (grep `-i morale` → empty); step 8 backfills hidden modifiers + captains/fan-hopefuls, no morale (`franchiseInitializer.ts:657-661`).
- The `50` lives in `createSnapshot` (`baselineValue:50, currentValue:50`, `franchiseMoraleState.ts:200-201`), which fires **only** lazily inside `applyFranchiseMoraleEffect` via `existing ?? createSnapshot` (`:287-288`) — i.e. on first applied effect, never at creation. With no snapshot, `getFranchiseMoraleSnapshot` returns `null` (`:217`); the display util `getBaselineMorale` falls back to `?? 50` (`playerMorale.ts:100-102`); `clampFranchiseMorale` returns 50 for non-finite (`:106-107`).
- **Adversarial:** no init/create file calls `applyFranchiseMoraleEffect`; deep copy + captain/fan-hopeful assignment have zero morale references.

**Build scope (WIRING, small):** add an explicit creation-time seed in `initializeFranchise` (alongside step 8) writing a 50/50 player snapshot per roster player via a new exported seed helper (`applyFranchiseMoraleEffect` requires a non-zero delta + `sourceEventId`, unsuitable for a pure seed). Separate DB (`kbl-franchise-morale` v1) → **no trackerDb pin involved**; `franchiseMoraleState.test.ts` would need updating. **Contract-explicitness gap, not a wrong-value bug.** See **WAITING_ON_JK G**.

---

## V11 — R7 TIER MODEL (IV objective) — **BUILT / R7-COMPLIANT** · BUILD (farm only)

**Verdict:** **R7-COMPLIANT** — IV is computed objectively, the tier drives the cap only, and **no `TIER_SHIFTS`→IV wiring exists** (no violation). **CONFIRM** of D1 §4.3, reframed under R7 as correct-by-design.

- `calculateIvBaseSalary(player)` takes **only a player**, no tier arg (`salaryCalculator.ts:740`); the IV path is structurally tier-blind. The tier is passed **separately** into `registerPool`, never into the IV calc (`useLeagueBuilderData.ts:407-416`).
- `TIER_SHIFTS` / `TIER_RATING_SCALES` have **0 callers** outside `tierParams.ts:36-44` (defined-but-inert) → stored pool IV is the tier-flat juiced kblIV exactly as R7 requires.
- `TIER_CAPS` **is** consumed for the budget cap (`leagueConstruction.ts:276`) — the R7-compliant budget lever.

**Build scope (BUILD, farm only):** the **MLB IV-tier-flat** decision is settled-correct (reconciles launch-readiness #9/#11). The one unmet R7 requirement is the **farm IV-distribution tier-shift**: `FARM_NERF_SCALES` (`tierParams.ts:50-55`) is orphaned; wiring it into the farm/prospect generation (overlaps **V9**) is a contained build. **Explicit guard: do NOT wire `TIER_SHIFTS`/`TIER_RATING_SCALES` into `calculateIvBaseSalary` — that would VIOLATE R7.** See **WAITING_ON_JK E**.

---

## V12 — G1 FREEZE SURFACE (§2.A; = L-ECON1's home) — **MISSING** · BUILD

**Verdict:** the draft-IV / settled-salary baseline is stamped **nowhere**; the freeze-writer home is identified. **CONFIRM** of G1, with the writer surface pinned and a GREEN-seam storage target.

- **Adversarial grep:** `draftIV|draft-IV|ivBaseline|frozenIV|trueValueBaseline|frozenAnchor|baselineIV` → **0 hits** (incl. tests); `auctionFinaliz|finalizeDraft|settledSalary|...` → **0 hits** (no auction/draft finalize step exists).
- **Salary IS frozen** at launch: `withInitialFranchiseSalary` (`franchiseSalary.ts:303-309`) inside `deepCopyLeagueToFranchise` (`franchisePlayerStorage.ts:512,560`), invoked by `initializeFranchise` (`franchiseInitializer.ts:570,592`).
- **IV exists at lock but is discarded:** `RegisteredPool.players[].iv` (`leagueConstruction.ts:25,37`) lives in the `kbl-league-builder` DB (`leagueBuilderStorage.ts:38`), never carried into the franchise. In-season TV snapshots are written **only** by `processCompletedGame.ts:315-333`, per-game-keyed (no checkpoint-0 row).
- **GREEN-seam target identified:** `franchiseTrueValueSnapshots` store is already registered (`trackerDb.ts:370-373`, DB **v25**), keyed `[franchiseId, seasonId, statsScopeId, playerId, checkpoint]` where `checkpoint: string|number` (`franchiseTrueValueSnapshotsStorage.ts:15-24`). The row has `trueValue` but **no `settledSalary`** field.

**Build scope (BUILD = L-ECON1):** the freeze writer's home today is the **launch deep-copy** (`deepCopyLeagueToFranchise:512-570`, the same per-player loop that runs `withInitialFranchiseSalary`) — or a sibling step in `initializeFranchise` right after the copy. Stamp **both** numbers at `checkpoint = 0/'launch'`: (1) settled salary (already computed), (2) the IV baseline — read via `getRegisteredPool(leagueId)`, joined by player id. **Storage (recommended, GREEN):** write a checkpoint-0 row per player into `franchiseTrueValueSnapshots` via `saveFranchiseTrueValueSnapshotRows`, adding **one additive `settledSalary?: number` field** to `FranchiseTrueValueSnapshotRow` (a stored value, **not** a keyPath member → **no `TRACKER_DB_VERSION` bump**). **Note:** under auction-primary v1, the *canonical* freeze trigger is the **auction finalize** (unbuilt) — so V12's ultimate home is decided by **WAITING_ON_JK A**. See also **WAITING_ON_JK B**.

---

## CROSS-SPEC RECONCILIATIONS (surfaced this pass — not in the V-list)

1. **Captain Charisma≥70 floor is STALE (likely a no-op build item).** `MODE1_TO_MODE2_V1_LAUNCH_READINESS.md` G4 flags the missing Charisma≥70 captain floor, citing `FRANCHISE_V1_LIVING_SEASON_SPEC §4`. But `PERSONALITY_SYSTEM_SPEC.md §5.3` (updated **2026-06-17**, canonical `MODE_2_V1_FINAL §17.6`) says captain = highest `Loyalty+Charisma` with **"NO minimum … every team with ≥1 MLB player gets a Captain"** and explicitly supersedes the prior tenure/charisma gate ("the captain is assigned at franchise creation … so a tenure minimum can't apply"). The current code (top `loyalty+charisma`, no floor) is therefore **correct per the newer canonical ruling** — the "captain floor" build item is contradicted by a 2026-06-17 reconciliation. **JK ruling needed only to confirm which spec wins** (see WAITING_ON_JK H).

2. **Stadium park→WAR v1 boundary is a genuine spec conflict** (V8): `STADIUM_ANALYTICS §1.0` keeps adaptive park→WAR "preview-only/blocked" for v1; vision §8.8 marks it v1-critical. The reconciliation hinges on **seed/static (preserved for v1) vs adaptive (deferred)** — JK must say whether v1 requires WAR to consume the **seed** factors now (WIRING-GAP to close) or accept read-only surfacing (acceptable-as-built). (WAITING_ON_JK D.)

---

## COSTED MODE-1 BUILD QUEUE

Scope tags: **WIRING** (repoint/pin/guard existing) · **BUILD** (new logic on existing rails) · **GREENFIELD** (from scratch). Items from V1–V12 plus the already-known items carried from the two prior audits + the R-rulings. Ordered by dependency, not by size.

### Lane 1 — ECONOMY SPINE (sequenced; gated by the auction decision)

| # | Item | Scope | Depends on | Notes |
|---|---|---|---|---|
| 1.1 | **Auction draft (PRIMARY v1)** | **GREENFIELD** | WAITING_ON_JK A | 0 lines today. Per `LEAGUE_BUILD_TO_DRAFT_AUDIT` D5: new auction engine (depleting war-chest + nomination rotation + open-ascending bid loop + CPU max-bid, reusing `assessSolvency`/`TIER_CAPS`/`pickValueChart`) + persistence (mirror `LeagueBuilderMlbDraftSession`) + new UI page/route + R6 hot-seat pass-around UX spec (the one net-new spec to author) + R3 farm-auction (scout-obscured ranges §7.4 + walled-off farm budget). **Largest single build across all audits.** |
| 1.2 | **G1 / L-ECON1 freeze writer** (V12) | **BUILD** | 1.1 (or launch deep-copy if snake) | Stamp IV + settled salary at finalize. Home = auction finalize (canonical) or `deepCopyLeagueToFranchise` (launch fallback). Storage = checkpoint-0 row in existing `franchiseTrueValueSnapshots` + additive `settledSalary` field → **no DB bump (GREEN)**. |
| 1.3 | **True "lock the league"** (V2) | **BUILD** | — | Lock field on `RegisteredPool` + guard re-registration + read-frozen-pool in draft. Foundational for 1.4. |
| 1.4 | **Frozen-at-lock player instance** (V1) | **BUILD** | 1.3 | Persist full instance at lock (not the `{id,iv,salary}` ref); attach IV/`draftStatus`/`settledSalary` to the instance. League-builder store/version bump likely. |
| 1.5 | **Format-toggle (auction OR snake, both tiers)** (V4) | **BUILD** | 1.1 | Snake-farm symmetry already done; widen `mode` to `'snake'\|'auction'` + league-wide `draftFormat`. **Cannot wire clean until 1.1 exists** → R2 fallback may defer this and ship auction-only. |

### Lane 2 — GENERATOR / NAME / PERSONALITY HYGIENE (mostly parallel, low-risk; test-characterized — grep tests before editing copy)

| # | Item | Scope | Source | Notes |
|---|---|---|---|---|
| 2.1 | **Personality → canonical 7** | **WIRING** | prior D6 §2.B | Repoint `prospectScoutingDraftEngine.ts:247` `PERSONALITY_POOL` + `DraftFlow.tsx:30` `PERSONALITIES` to the canonical 7; drop the 4 legacy members from the `Personality` enum (`leagueBuilderStorage.ts:66-68`). Morale-spine input (G2). |
| 2.2 | **Reporter + bridge-scout names → SMB4 pool** | **BUILD (reporters, small) + WIRING (scouts)** | prior D6 §2.C | Reporters: replace `reporterNameGenerator.ts:3-28` (18-name array) **and** the second path `narrativeEngine.ts:398-412` (`REPORTER_FIRST/LAST_NAMES`) with seeded SMB4-pool picks. Scouts: copy the existing `:800` SMB4 pattern into `leagueBuilderStartupFarmDraft.ts:299` + `franchiseStartupProspectDraft.ts:211`. Fixes source **and** repetition in one change. |
| 2.3 | **Reporter pronouns** (§8.1) | **BUILD (small)** | vision §8.1 | Thread player gender into the narrative generator; no "They/Them" for singular. Same surface as 2.2. **Prereq for the §8.6 personality-voiced Q&A** (living-season lane, not Mode-1). |
| 2.4 | **Farm-generation distribution validation + grade-model reconcile** (V9) | **BUILD** | WAITING_ON_JK E | Add distribution test; align code or bless the round-keyed model in spec. |
| 2.5 | **Farm IV-distribution tier-shift** (V9 / V11 R7) | **BUILD** | 2.4, WAITING_ON_JK E | Wire orphaned `FARM_NERF_SCALES` / `farmGradeMode` into farm generation. **Never touches objective MLB IV.** |

### Lane 3 — STAFF / LAUNCH-CONTRACT WIRINGS (small, mostly independent)

| # | Item | Scope | Source | Notes |
|---|---|---|---|---|
| 3.1 | **Reporter re-path to franchise creation** (V3) | **WIRING** | V3 | Add one step to `initializeFranchise` looping teams → `autoGenerateReporterForTeam(..., franchiseId)`. Store already franchiseId-scoped. |
| 3.2 | **Explicit morale = 50 seed** (V10) | **WIRING** | V10 | Add a creation-time 50/50 snapshot per player in `initializeFranchise` (new seed helper). No trackerDb pin. |
| 3.3 | **Two-scout → one-scout** (R8) | **WIRING** | vision R8, `FRANCHISE_INTERNAL_V1_SCOUT_PROSPECT_DRAFT_CHECKPOINT.md` | Current: two hired scouts per team before the farm draft; reduce to one, same scout for draft + ongoing Mode-2 scouting. |
| 3.4 | **Stadium picker lock to stock SML stadiums** (R9) | **WIRING** | vision R9 | Constrain the option set so an unknown/renamed stadium can never reach the snapshot — makes name-keyed re-derivation safe (the by-value carry, launch-readiness #7, becomes unnecessary). |
| 3.5 | **Managers → structured entity + attributes** (§3.5) | **BUILD (type upgrade)** | vision §3.5; launch-readiness #17 | Partially present: the launch handoff already seeds a per-team manager profile with real SMB4 names (`managerIdentityStorage.ts:175-181`). Gap = the **League-Builder team-edit text field** → structured entity + attributes (Charisma/Loyalty-like) authored via the franchise/draft flow. **Re-verify scope** before building (carried from prior audit + memory L11, not independently re-traced this pass). |

### Lane 4 — RULING-GATED / OPTIONAL POLISH

| # | Item | Scope | Source | Notes |
|---|---|---|---|---|
| 4.1 | **Park factors → WAR consumption** (V8) | **WIRING** | WAITING_ON_JK D | Thread stadium/handedness into `calculateBWAR` + add park param to `calculatePWAR`; wire the 40% activation gate. **Only if JK rules park→WAR is in v1** (spec conflict). |
| 4.2 | **Identity-weighted draft-board re-ranking** (V6 b) | **WIRING** | WAITING_ON_JK C | Re-rank candidates by composed identity + positional scarcity (today sorts raw IV). Optional v1 polish; the per-team solvency signal already surfaces archetype. |
| 4.3 | **Captain charisma-floor** (G4) | **likely NO-OP** | Cross-recon 1 | Newer canonical ruling (`PERSONALITY_SYSTEM_SPEC §5.3`, 2026-06-17) says **no minimum** — current code is correct. Confirm-and-close, don't build, unless JK reinstates the floor. |

**Dependency summary:** Lane 1 is the critical path and the auction decision (WAITING_ON_JK A) gates 1.1/1.2/1.5. Lanes 2–3 are largely independent of Lane 1 and can proceed in parallel (mind the test-characterized franchise copy — grep tests before editing strings). V9/V11 farm tier-shift (2.5) is gated on the V9 grade-model ruling (E). V8 (4.1) and the captain item (4.3) are ruling-gated.

---

## WAITING_ON_JK (batched — genuine ambiguities the code cannot resolve)

**A. The v1 draft cut (gates Lane 1).** Auction is 0 lines and is the v1 *primary*; snake is built but the format-toggle to keep it can't wire cleanly until auction exists (V4). Build auction for v1 (1.1) and either (a) re-expose snake behind the new selector or (b) take R2's fallback and **ship auction-only, defer the snake-toggle**? This also fixes the canonical home of the G1 freeze writer (V12): auction-finalize vs launch deep-copy.

**B. "Lock" + freeze semantics (V1/V2/V12).** Should "lock" (i) make the registered pool immutable and refuse re-registration, (ii) also freeze underlying roster/player edits, (iii) be one-way or reversible? And for the IV+salary freeze: stamp a **checkpoint-0 row in `franchiseTrueValueSnapshots`** (additive `settledSalary`, no DB bump — recommended) vs new frozen fields on the franchise `Player` (touches the type + every copy)?

**C. Archetype draft surface (V6).** Is identity-weighted draft-board **re-ranking** (§6.3 b) in v1 scope, or is the current **raw-IV sort + per-team GREEN/YELLOW/RED solvency signal** the intended v1 archetype surfacing? And: does the archetype/luxury-cap budget effect extend into **Mode-2 ongoing budgets**, or stay Mode-1 construction-only (where it is today)?

**D. Stadium park → WAR v1 boundary (V8 — spec conflict).** `STADIUM_ANALYTICS §1.0` keeps adaptive park→WAR "preview-only/blocked" for v1; vision §8.8 marks it v1-critical. For v1, must WAR **consume the seed/static park factors now** (close the WIRING-GAP) or is read-only seeding + Team Hub surfacing the accepted v1 scope (WAR consumption deferred)?

**E. Farm grade model + tier-shift (V9/V11).** The generator's grade distribution (round-keyed tables, `D+` grade, no `A+`/`S`, σ=7) **does not match** `PROSPECT_GENERATION_SPEC §3.2/§5.1` (single fixed A–D, σ=8). Which is canonical — bless the round-keyed generator (update the spec) or realign the code? And is the **farm IV-distribution tier-shift** (`FARM_NERF_SCALES`/`farmGradeMode`) in v1 scope or deferred? (The MLB IV-tier-flat decision is settled-correct per R7.)

**F. Reporter re-path details (V3).** After moving assignment to creation, remove the game-launch lazy `ensureFranchiseReporterForTeam` calls or keep them as an idempotent safety net? And should **existing** franchises get a one-time backfill, or only new franchises?

**G. Morale seed explicitness (V10).** Does R10 require an **explicit persisted** 50/50 snapshot per player at creation, or is the current implicit neutral-50 fallback (materialized on first morale effect; never defaults to 0) acceptable as "neutral midpoint"?

**H. Captain floor spec winner (cross-recon 1).** `FRANCHISE_V1_LIVING_SEASON_SPEC §4` (Charisma≥70 floor) vs the newer `PERSONALITY_SYSTEM_SPEC §5.3` / `MODE_2_V1_FINAL §17.6` (NO minimum, 2026-06-17). The newer ruling makes the current code correct and the launch-readiness G4 build item a no-op — confirm the newer ruling stands so G4 can be closed without a build.

---

*End of verification. READ-ONLY; no code changed; no build/test run (concurrent-safe with the live L13-6 build). Every status carries a `file:line` + verbatim quote; all 12 items were investigated by independent agents that adversarially grepped before any MISSING claim and reconciled against the cited prior-audit finding. The auction decision (WAITING_ON_JK A) gates the economy-spine lane; the V8 and V9/E spec conflicts gate their builds.*
