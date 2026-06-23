# MODE 1 — LEAGUE-BUILD → DRAFT PIPELINE AUDIT

**Date:** 2026-06-20  **Auditor:** Claude Opus 4.8 (Captain)  **Branch:** `codex/franchise-v1-next`
**Type:** READ-ONLY static audit. No build/test run (concurrent-safe with the live L13 build, per mandate). Verification tier = static code reads with `file:line` + verbatim quoted code on every load-bearing claim. Method: 6 parallel investigators + 3 adversarial verifiers (each MISSING claim was attacked by an agent trying to *find* the code), then the Captain **independently re-read** every executive-summary / §4-resolving claim (re-reads are flagged ✔︎CR below).

**Gospel (checked against, in priority order):**
- `spec-docs/MODE1_LEAGUE_BUILD_TO_DRAFT_VISION.md` — the ratified JK decisions (pipeline, two-number freeze, player-instance architecture, auction-primary, name/personality rules). **This audit resolves its §4 open items.**
- `spec-docs/FRANCHISE_V1_LIVING_SEASON_SPEC.md` §3 (frozen anchors) + §4 (designations / Captain handoff).

**Relationship to the prior audit:** `MODE1_TO_MODE2_V1_LAUNCH_READINESS.md` (2026-06-20) covered the franchise-creation **handoff only**. This audit covers the **DRAFT PROCESS** + the **LEAGUE-BUILD seam** feeding it — the pieces the launch audit explicitly skipped. Where this audit refines a prior-audit claim, it is flagged **[REFINES PRIOR]**.

---

## 0. EXECUTIVE SUMMARY

**The pipeline the vision describes (League Build → Lock → IV → Draft → Freeze) is real for its *first three stages on the SNAKE rail* and absent for its *intended v1 rail (auction) and its terminal freeze*.** The league-build seam works: you select branded teams + a tier, assign players, and an explicit **"Register Pool"** button computes per-player IV and snapshots a priced pool. But three structural things the vision asks for are not there, and the v1 draft format does not exist at all:

| Stage | Vision intent | Reality | Verdict |
|---|---|---|---|
| 1. League Build | Pick brandings **+ stadiums/dimensions**; two pool modes | Brandings + tier picked; stadiums flow **by name** (re-derived, not carried); pool modes collapse to **one** mechanism | **PARTIAL** |
| 2. Lock | Freeze the draft pool | "Register Pool" snapshots `{id,iv,salary}` but is **re-runnable / overwritable** — a recompute, not a freeze | **PARTIAL** |
| 3. IV Computation | Pool **× budget tiers** → True Value | Per-player IV computed at registration, but it's the **tier-flat juiced kblIV**; the tier only sets the **cap/budget**, the per-player tier scale is **defined-but-never-applied** | **PARTIAL** |
| 4. Draft | **Auction** (v1 primary) | Auction = **0 lines**; only **snake** is built (the deferred format), plus an **offseason dry-run** preview | **MISSING (auction) / BUILT (snake, deferred)** |
| 5. Freeze | Stamp **both** numbers (IV + settled salary) | **Salary frozen**; **IV baseline stamped NOWHERE** (G1 confirmed at root) | **HALF (one of two numbers)** |

**The four load-bearing conclusions:**
1. **The v1 primary draft format (auction) does not exist** — zero auction/bid/nominate/war-chest code anywhere in `src/` (adversarially confirmed, three independent agents, exhaustive greps). The only built initial draft is **snake**, which the vision **defers to v1.1**. So "auction-only v1" is currently **un-backed by code**. (§2.G's caveat is now answered: the gap is a from-scratch build — see **D5**.)
2. **The two-number freeze freezes one number.** Salary is frozen per-player at launch (`withInitialFranchiseSalary`); the **frozen draft-IV baseline is stamped nowhere** (G1). A per-player IV *is* computed at lock (in the `RegisteredPool`), but it lives in the league-builder DB and is **never carried into the franchise** as the season's anchor. **[REFINES PRIOR: the prior audit said "IV is on the pool, not per-player" — in fact the pool *does* hold a per-player IV; it just never survives the handoff.]**
3. **The player-instance architecture is the *healthy* base-vs-instance pattern (§2.H) in shape, but the "snapshotted pool of player INSTANCES frozen at lock" does not exist.** The lock freezes only `{id, iv, salary}` refs; the base `Player` stays fully mutable after "lock"; the rich instance is the per-franchise deep-copy at creation (which carries salary, not IV).
4. **More draft-process machinery exists than the launch audit credited** — scout hiring + scout guidance (farm draft), in-draft **pick-trade valuation** (wired UI), and CPU auto-pick (offseason DraftFlow + headless farm draft) are all real. But **none of it is auction**, and the MLB snake draft has **no CPU autopick** (every team picks manually).

**Bottom line for JK:** the league-build → lock → IV spine is shippable *plumbing* but is wired only to the **deferred** snake format; the **v1 primary (auction) and the economy anchor (frozen IV) are both unbuilt**. The B/C generator bugs are confirmed and cheap (mostly wiring). The decision the vision flagged — "is auction-only v1 achievable?" — comes down to D5's scope estimate against an empty starting point.

---

## D1 — THE PIPELINE REALITY (League Build → Lock → IV)

### Stage status

| Stage | Status | Anchor evidence |
|---|---|---|
| 1. League Build (brandings + tier) | **BUILT** | `LeagueBuilderLeagues.tsx:228-235` (team toggle) + `:512-526` (tier `<select>`); persisted `leagueBuilderStorage.ts:97,101` |
| 1b. Stadiums/dimensions → Mode 2 | **PARTIAL (name-keyed)** | `franchisePlayerStorage.ts:502-510`, `types/franchise.ts:54-60` |
| 1c. Two player-pool modes | **PARTIAL (one mechanism)** | `useLeagueBuilderData.ts:402-405` |
| 2. Lock the pool | **PARTIAL (snapshot, not freeze)** | `LeagueBuilderLeagues.tsx:216-226`, `leagueBuilderStorage.ts:851-866` |
| 3. IV computation vs budget tiers | **PARTIAL (IV tier-flat; tier→cap only)** | `useLeagueBuilderData.ts:407-417`, `tierParams.ts:36-40` |

### The four specific §4 questions, answered

**§4.1 — Do stadiums + dimensions flow into Mode 2 at franchise creation?**
**PARTIAL — yes, but by NAME, not by value.** The launch snapshot carries only the stadium name + id + a boolean: ✔︎CR
```ts
// src/types/franchise.ts:54-60
export interface FranchiseTeamStadiumSnapshot {
  teamId: string;
  teamName: string;
  stadium?: string;
  stadiumId?: string;
  hasSeedParkFactors: boolean;
}
```
The franchise team record re-derives park factors **from the stadium name** at copy time (`franchisePlayerStorage.ts:354-361` `withFranchiseTeamParkIdentity` → `getDerivedParkFactorsIfAvailable(team.stadium)`), and Mode 2 reads true field dimensions name-keyed via `getParkByName` (`franchiseStadiumFoundation.ts:470,548`, consumed `TeamHubContent.tsx:1794`). **Consequence:** a custom/renamed stadium not in `parkLookup` silently resolves to no dimensions / no park factors. Real dimension *values* are never carried through the snapshot.

**§4.2 — Does a "lock the league" step exist that freezes the draft pool?**
**PARTIAL — a pool *snapshot* exists; a true *lock* does not.** ✔︎CR There is an explicit per-league **"Register Pool"** button:
```ts
// src/src_figma/app/pages/LeagueBuilderLeagues.tsx:216-226
const handleRegisterPool = async (leagueId: string) => {
  setRegisteringPoolId(leagueId);
  try {
    const pool = await registerLeaguePool(leagueId);
    setRegisteredPoolResult(pool);
```
But it is **not a freeze**: `LeagueTemplate` has no `locked/finalized/status` field (`leagueBuilderStorage.ts:91-106`); `saveRegisteredPool` is a plain `store.put(pool)` overwrite (`:851-866`); the button is disabled only while in-flight; and the snake draft **auto-regenerates** the pool if absent — `const nextPool = existingPool ?? await registerLeaguePool(leagueId);` (`LeagueBuilderSnakeDraft.tsx:261,380`). A re-computable, overwritable, live-membership-pulling pool is the **opposite** of a frozen draft-availability lock. (Exhaustive grep `lock|finaliz|commit|freeze|isLocked` across storage + engine + hook + initializer → **0 hits**.)

**§4.3 — Does IV computation run on the locked pool against TEAM BUDGET TIERS?**
**PARTIAL — IV is computed per-player on the pool; the tier sets the *cap/budget*, not the per-player IV value.** ✔︎CR The registration computes per-player IV and stamps the tier cap:
```ts
// src/src_figma/hooks/useLeagueBuilderData.ts:407-417
const registeredPool = registerPool({
  leagueId: league.id,
  tier: league.tier ?? 'juiced',
  ...
  players: leaguePlayers.map((player) => ({
    id: player.id,
    iv: calculateIvBaseSalary(toSalaryPlayer(player)).ivBase,   // ← kblIV, NO tier arg
    salary: player.salary,
  })),
});
// src/engines/leagueConstruction.ts:276 → tierCap: TIER_CAPS[cfg.tier].tierCap
```
The per-player tier transform the spec implies ("players × budget tiers → True Value", vision §1.3) **is defined but never applied**:
```ts
// src/data/tierParams.ts:13 (doc) + :36-40
//   "Multiplicative transform: tierIV = juiced kblIV x scale."
export const TIER_SHIFTS: Record<TierKey, TierShiftParams> = {
  juiced:   { scale: 1.000000, ... },
  standard: { scale: 0.882696, ... },
  nerfed:   { scale: 0.791877, ... },
};
```
`TIER_SHIFTS` / `TIER_RATING_SCALES` are imported/used **nowhere** outside `tierParams.ts` (grep → 0 non-definition hits; `leagueConstruction.ts:10-14` imports only `TIER_CAPS` + types). So the stored pool IV is **always the tier-flat juiced kblIV**; the tier only supplies the spend cap (`TIER_CAPS`) and luxury tables. **Half-wired vs the spec.**

**§4 (pool modes) — Are both player-pool modes built?**
**PARTIAL — there is one mechanism, not two modes.** Pool membership = "any player whose `leagueAssignments` includes this league":
```ts
// src/src_figma/hooks/useLeagueBuilderData.ts:402-405
const allPlayers = await getAllPlayers();
const leaguePlayers = allPlayers.filter((player) =>
  player.leagueAssignments?.some((assignment) => assignment.leagueId === league.id)
);
```
Mode (b) "hand-pick from the database" exists only as **per-player/per-team assignment** in the player/roster editors (`LeagueBuilderPlayers.tsx:363-366`, `LeagueBuilderRosters.tsx:141-162`) — which *is* mode (a). There is **no bulk "import the players already rostered on the selected branded teams" action** and **no `poolMode` toggle** (grep `rostered|importRoster|bulkImport|fromBrandedTeams|poolMode` → 0). The two modes the vision frames as a user choice are not implemented as distinct paths.

---

## D2 — PLAYER-INSTANCE ARCHITECTURE (vision §2.H)

**Verdict: the healthy base-vs-instance pattern is present in *shape*, but the §2.H "snapshotted pool of player INSTANCES frozen at lock time" is NOT implemented.** ✔︎CR

**One canonical base `Player`** (the rich record that drives the pipeline), `src/utils/leagueBuilderStorage.ts:223-295`, with multi-league membership via a thin assignment:
```ts
// leagueBuilderStorage.ts:158-162
export interface LeagueAssignment {
  leagueId: string;
  teamId: string;
  rosterStatus: RosterStatus;   // ← only league-specific field on the base record
}
// leagueBuilderStorage.ts:284
  leagueAssignments?: LeagueAssignment[];
```

**The "instances" that exist, and what each holds:**

| Shape | Role | League-specific fields on it | File |
|---|---|---|---|
| `Player` (rich) | **Base definition** (global, mutable) | only `leagueAssignments[]` (team + rosterStatus) | `leagueBuilderStorage.ts:223-295` |
| `PoolPlayerPriced` (in `RegisteredPool`) | **Lock snapshot** | `{id, iv, salary}` — refs + 2 derived numbers, **not** a frozen player copy | `leagueConstruction.ts:25-43` |
| Per-franchise `Player` (deep copy) | **Mode-2 instance** | frozen `salary` + `salaryCalculationVersion`; **no IV** | `franchisePlayerStorage.ts:560-566` (re-exported type `:45`) |
| `ProspectProfile` / `GeneratedProspectCandidate` | prospect/scouting sidecar | `draftRound/draftPick` | `prospectScoutingDraftEngine.ts:76-109` |
| `src/types/index.ts:10`, figma `index.ts:8`, `playerDatabase.ts:41` | thin view-models / seed row | — | (legacy/seed) |

**Why it's healthy-but-incomplete:**
- ✅ There **is** one canonical base + a real per-franchise snapshot (`deepCopyLeagueToFranchise`, `franchisePlayerStorage.ts:512`, from `franchiseInitializer.ts`). This resolves the prior audit's "multiple player shapes" ambiguity: it is **base-vs-instance, not conflicting schemas**.
- ❌ The **lock does not snapshot instances** — `RegisteredPool.players` is `PoolPlayerPriced = {id, iv, salary}` only, and the underlying base `Player` can still change after "lock" (no immutable instance is taken; no `lockedAt`/`frozenAt`).
- ❌ **League-specific fields do not fully attach to an instance:** IV lives only on the `RegisteredPool` (a side-table keyed by leagueId), never as a `Player` field; **`settledSalary` and `draftStatus` do not exist as player fields** (grep → 0; draft status is session-level, `leagueBuilderStorage.ts:216`).
- ⚠️ **Field-name forks** (cosmetic but real): `hiddenPersonalityModifiers` (canonical `Player:257`) vs `hiddenModifiers` (`types/game.ts:124` — what L13/`processCompletedGame` reads); `firstName/lastName` (canonical) vs single `name` (other shapes); `teamId` flat vs `leagueAssignments[]` (bridged by `buildLeagueAssignmentsFromLegacyPlayer`, `leagueBuilderStorage.ts:536`).

---

## D3 — THE TWO-NUMBER FREEZE (vision §2.A, FRANCHISE_V1 §3)

**Verdict: the draft freezes ONE of the two numbers. Salary ✅, IV baseline ❌ (G1 confirmed at root). The DIVERGE case has no implementation because auction does not exist.** ✔︎CR (both verifiers returned `CONFIRMED_MISSING` after adversarial search)

| The two numbers (§2.A) | Frozen? | Evidence |
|---|---|---|
| **Settled salary** ("what the team paid") | **YES** | `franchiseSalary.ts:303-309` `withInitialFranchiseSalary` writes `salary` + version; called in the launch deep-copy `franchisePlayerStorage.ts:560`. Aggregate proof: `FranchiseSalaryBaselineProof` (`types/franchise.ts:98-105`), carried in the handoff `franchiseInitializer.ts:633`. |
| **Draft-IV baseline** ("the expectation TV is measured against") | **NO — stamped nowhere** | All 12 candidate identifiers (`draftIV/ivBaseline/frozenIV/trueValueBaseline/...`) → **0 hits** in `src/`. No IV/TV field on the Player/instance schema. The launch deep-copy stamps only salary. **G1.** |

**Where IV *does* exist (and why it still fails the spec):** a per-player IV is computed at lock and stored in `RegisteredPool.players[].iv` — but in the **`kbl-league-builder` DB**, and `franchiseInitializer` **never imports the registered pool or reads its IV** (grep of the initializer for `registeredPool/pool.iv/pickValueChart/tierCap` → empty). So the anchor exists for ~one screen and is then discarded at the handoff.

**The consumer expects ONE number, not two:**
```ts
// src/engines/salaryCalculator.ts:1018
const valueDelta = trueValue - player.salary;   // live TV − current salary; no separate IV anchor
```
`valueDelta` (Fan Favorite / Albatross) reads the **contract**, not a frozen IV baseline. So today the system **collapses** the two numbers the vision wants distinct.

**DIVERGE vs MATCH:** In snake, draft salary is the **pre-stored** `player.salary` (`useLeagueBuilderData.ts:415`), not a re-settled price — so there is no settle-vs-IV divergence to capture. In auction (the case that *needs* divergence), there is no code at all. The True Value that *does* run is the **live, in-season** TV (computed from accumulated WAR after each completed game, snapshotted in `franchiseTrueValueSnapshots` — written **only** by `processCompletedGame.ts:616`, keyed on in-season gameNumber/gameId; **no checkpoint-0 / launch / draft snapshot**).

> **Closing G1 requires BOTH** a per-player IV-baseline field on the franchise `Player` **AND** a draft-finalize writer — neither exists, and there is no draft-finalization code path that *could* stamp it today (the live draft surface is a dry-run preview — see D4/D5).

---

## D4 — DRAFT-PROCESS MECHANICS (vision §3 — the launch audit skipped ALL of these)

> **Three real draft surfaces exist, none of them auction:** (1) **MLB snake** (`LeagueBuilderSnakeDraft.tsx`, the only one consuming the registered pool), (2) **startup farm/prospect** (`leagueBuilderStartupFarmDraft.ts`, headless auto-snake), (3) **offseason rookie** (`DraftFlow.tsx`, an explicit **dry-run preview** — `"Preview only - no draft commit"`, `:177-188`).

| §3 mechanic | Status | Evidence |
|---|---|---|
| **Auction mechanics** (budget/bidding/nomination/no-overspend/roster-slot) | **MISSING** (auction); **PARTIAL seeds** | See **D5** + the seed rows below |
| **AI picking — MLB snake** | **MISSING** | `LeagueBuilderSnakeDraft.tsx:400,754` `handleDraftPlayer` fires on a human `onClick`; no `cpu/autopick/ai` (grep 0). Every team is picked manually (440 picks). |
| **AI picking — offseason DraftFlow** | **BUILT (crude)** | `DraftFlow.tsx:698-730`: grade-ordered "best available" + pass logic gated on `Math.random()` (non-deterministic; component-local state). |
| **AI picking — startup farm** | **BUILT (headless)** | seed-deterministic `pick<T>` + best-scouted-grade sort (`leagueBuilderStartupFarmDraft.ts:766,1123`). |
| **Scout hiring at draft start** | **BUILT** | `leagueBuilderStartupFarmDraft.ts:1273-1318,1331`: `saveScoutProfile(hiredScout)` + gate `"Every team must hire two scouts before the prospect draft begins."`; wired `LeagueBuilderDraft.tsx:137,337` ("HIRE SCOUT"). Farm draft only — **not** the MLB snake. |
| **Scout guidance during draft** | **BUILT** | `prospectScoutingDraftEngine.ts:473-489` `scoutProspect` → per-candidate scoutedGrade/confidence, rendered per card `LeagueBuilderDraft.tsx:378-386`. MLB snake has none. |
| **Trade value — in-draft picks** | **BUILT + WIRED** | `validateTrade` (`leagueConstruction.ts:284-300`) vs `pool.pickValueChart` (IV-derived, `:278`); live "TRADE VALIDATOR" UI `LeagueBuilderSnakeDraft.tsx:19,427,626`. ✔︎CR |
| **Trade value — franchise (season)** | **PARTIAL** | `franchiseTradeAdapter.ts` fit-preview/validate (`:842,1026,1660`); `evaluateThreeWayTrade` (`tradeEngine.ts:455-527`) is **orphaned** (0 non-test importers). |
| **Salary-from-IV during draft** | **PARTIAL** | Salary engine derives salary from `ivBase` (`salaryCalculator.ts:776-777`), and IV+salary are shown separately at draft (`useLeagueBuilderData.ts`); but the draft uses the **pre-stored** `player.salary`, not a settle-from-IV step (`:415`). No auction → no IV→settle divergence. |

**[REFINES PRIOR]:** the launch audit listed trade value and scout steps as "unverified / not in scope." They are in fact **built and (for pick-trades + scout hiring/guidance) wired** — just confined to the snake/farm rails, never to auction.

---

## D5 — AUCTION BUILDABILITY VERDICT (informs vision §2.G)

**Finding: auction is a genuine from-scratch build — 0 lines today — but a meaningful set of reusable economic primitives already exists.** Adversarially confirmed: `auction/bidding/outbid/warChest/paddle/gavel/budgetRemaining/'highest bid'` → **0 hits**; `nominat` → 57 hits **all** `denominator`; the draft-config type can't even *express* auction (`mode: 'auto-snake-v1'` literal, `types/franchise.ts:129`); routes are snake-only (`App.tsx:288-291`).

**What's reusable (the head start):**
- `assessSolvency` (`leagueConstruction.ts:364-410`) — budget vs committed + projected tax, **slot reserve** for unfilled roster spots (`cheapestFillCost`, `:351`), `slack`, and a `BLOCKED` signal when overspent. This is the **no-overspend + roster-slot-under-budget** core, already CALLED by the snake draft (`LeagueBuilderSnakeDraft.tsx:123,329`).
- `TIER_CAPS` (`tierParams.ts:65-69`) — per-tier spend ceiling (the war-chest size).
- `pickValueChart` / `validateTrade` / `derivePickValueChart` — IV-anchored value math.
- per-player IV at lock (`RegisteredPool.players[].iv`) — the valuation each CPU max-bid would key off.

**What must be built net-new (none exist):**
1. A **depleting per-team war-chest** budget state (today's `tierCap` is a *static* cap, not a draining balance; `calculateDraftBudget`/`canAffordDraftPick` at `salaryCalculator.ts:1185,1208` are **orphaned** dead code).
2. **Nomination rotation** (who puts a player up, in what order).
3. A **bidding loop** — current high bid, increments, outbid resolution, win-resolution → settled price.
4. **CPU max-bid valuation AI** (use per-player IV + remaining budget + roster needs; `assessSolvency` gates affordability).
5. A **new auction UI surface + route** (no screen, no route, no `format: 'auction'` enum value).
6. The **two-number freeze writer** at auction finalize (settled price → salary, IV → frozen baseline) — which simultaneously **closes G1** (D3).
7. (For a headless end-to-end sim) a **headless bidding simulator**.

**Rough scope:** one new **auction engine** (budget-depletion + nomination + bid-resolution + CPU max-bid, reusing `assessSolvency`/`TIER_CAPS`/`pickValueChart`) + **persistence** (an auction session store mirroring `LeagueBuilderMlbDraftSession`) + **one new UI page/route** + the **finalize-freeze writer** (D3/G1). The economic primitives exist; the **process loop, the AI bidder, the UI, and the freeze are the build.** This is the **largest single build** surfaced across both audits — larger than finishing snake — exactly as §2.G warned. "Auction-only v1" is achievable but is a from-scratch feature, not a wiring task.

---

## D6 — B/C FIX-SCOPE CONFIRMATION (located + priced; NOT fixed)

Both ruled bugs are **CONFIRMED and live**. Scope classified **WIRING** (repoint/pin existing) vs **BUILD** (new logic).

### §2.B — Non-canonical personality → **WIRING**
- **Prospect generator pool** (the franchise path): `prospectScoutingDraftEngine.ts:247` `PERSONALITY_POOL = ['Competitive','Spirited','Crafty','Scholarly','Disciplined','Tough','Relaxed']` — only **3 of 7** are canonical; used at `:549`, flows candidate→player, live via `franchiseStartupProspectDraft.ts:384` + `leagueBuilderStartupFarmDraft.ts:572`.
- **Silent default confirmed:** `normalizePersonality` (`masterMoraleMatrix.ts:525-532`) maps `Spirited→JOLLY`, `Crafty→TOUGH`, `Disciplined→TOUGH` via `LEGACY_PERSONALITY_RECONCILIATION`, and **`Scholarly` is not in the map → silently defaults to `RELAXED`**. So 4 of 7 pool values never reach the matrix as their nominal type.
- **Loose enum:** `leagueBuilderStorage.ts:66-68` `Personality` lists **11** strings (canonical 7 + the 4 legacy), so the type can't statically catch the bug.
- **A FOURTH site** [NEW, beyond prior audit]: `DraftFlow.tsx:30` `PERSONALITIES = ["LEADER","COMPETITIVE","CALM","HOTHEAD"]` (used `:492`), live + persisted via `savePlayer`.
- **Fix scope:** repoint both generator pools to the canonical 7 + drop the 4 legacy members from the enum. **WIRING, small.** (Canonical source: `masterMoraleMatrix.ts:248-256` COMPETITIVE/RELAXED/DROOPY/JOLLY/TOUGH/TIMID/EGOTISTICAL.)

### §2.C source rule — Invented names → mix of **WIRING + small BUILD**
- **Reporters, array #1:** `reporterNameGenerator.ts:3-28` `ERA_REPORTER_NAME_POOLS` — 18 hardcoded full names (e.g. `'"Dutch" Calloway'`, `"Red Kessler"`), live via `reporterAssignment.ts:85` → `FranchiseHome.tsx:120`. **Small BUILD** (replace with seeded SMB4-pool pick).
- **Reporters, array #2** [NEW, beyond prior audit]: `narrativeEngine.ts:398-412` `REPORTER_FIRST_NAMES` (30) × `REPORTER_LAST_NAMES` (30), picked by `pickRandom` (`Math.random`, no dedup), live via `narrativeIntegration.ts:78` + `NarrativeDisplay.tsx:300,322`. **Small BUILD.** ✔︎CR (verbatim re-read)
- **Bridge/startup scouts:** `leagueBuilderStartupFarmDraft.ts:299` `"Startup Farm Scout ${index+1}"` (live via `buildScoutDescriptors`, called `:578`) and `franchiseStartupProspectDraft.ts:211` `"Franchise Setup Bridge Scout ${index+1}"` (live via `buildBridgeScoutDescriptors`, called `:390`), both stamped into `scoutName`. **WIRING** — the correct pattern already sits in the same file (the interactive scout path `:789-803` uses `pick(...SMB4_FIRST_NAMES) pick(...SMB4_LAST_NAMES)`).

### §2.C distribution/repetition bug — **SUBSUMED by the source fix**
- **The repetition is NOT in the player/prospect generator.** `prospectScoutingDraftEngine.ts:261-282` uses an FNV-1a hash + per-candidate-index seed over the **full 2756/2128** pool; empirical sim gave **40/40 unique** names per class with even spread. `DraftFlow.tsx:467-478` uses `Math.random` over the full pool **with a `usedNames` dedup loop** — no within-class repeats.
- **The true repetition source is the reporter generators** — `narrativeEngine` (`Math.random` over 30×30, no dedup) and the 6-name-per-era reporter pool (falls back to `"Howard Kessler 2"`). **Repointing reporters to the 2756/2128 SMB4 pool fixes source AND repetition in one change.**
- **Pools confirmed real + large:** `nameDatabase.ts` `FIRST_NAMES`=2756 / `LAST_NAMES`=2128 (what the draft pipeline already imports, aliased `as SMB4_*`); `smb4NameDatabase.ts` `SMB4_FIRST_NAMES`=2756 / `SMB4_LAST_NAMES`=2135 (imported only by `managerIdentityStorage.ts`).

**Net D6 pricing:** §2.B = **WIRING** (4 sites: 2 generator pools + 1 enum + DraftFlow array). §2.C scouts = **WIRING** (copy the `:800` pattern into 2 builders). §2.C reporters = **small BUILD** (replace 2 invented arrays + non-seeded picks with seeded SMB4-pool selection). The distribution bug needs **no separate fix**.

---

## §4 OPEN-ITEMS RESOLUTION (vision spec)

| # | Open item | Resolution |
|---|---|---|
| 1 | Stadiums/dimensions flow into Mode 2? | **PARTIAL** — flows by **name** (re-derived via `parkLookup`), not by value; unknown names lose park effects (D1 §4.1). |
| 2 | "Lock the league" step exists? | **PARTIAL** — a **"Register Pool"** *snapshot* exists, but it's re-runnable/overwritable with no lock flag — a recompute, not a freeze (D1 §4.2). |
| 3 | IV runs on locked pool vs budget tiers? | **PARTIAL** — per-player IV computed at lock, but **tier-flat** (juiced kblIV); tier sets only the **cap/budget**; `TIER_SHIFTS.scale` defined-but-unapplied (D1 §4.3). |
| 4 | Base-player cleanly separated from instance? | **HEALTHY pattern, incomplete** — one canonical base + per-franchise deep-copy instance (resolves "multiple shapes"), but **no frozen-at-lock instance snapshot**, IV is a side-table, `settledSalary`/`draftStatus` absent (D2). |
| 5 | Which §3 draft mechanics exist? | See **D4** table — scout hiring/guidance + pick-trade value BUILT; MLB autopick MISSING; auction MISSING. |
| 6 | Auction buildable bug-free for v1? | **From-scratch build** — 0 lines today; primitives exist; the loop/AI/UI/freeze are the work (**D5**). |
| 7 | Draft stamps BOTH frozen numbers? | **NO** — salary frozen, **IV baseline nowhere** (G1); divergence case unimplemented (auction absent) (**D3**). |

---

## WAITING_ON_JK (batched — genuine ambiguities the audit cannot resolve from code)

**A. The v1 cut (the load-bearing decision).** Auction is 0 lines and is the v1 *primary*; snake is built but *deferred*. Given D5's scope (new engine + AI bidder + UI + persistence + finalize-freeze), do you want to (a) **build auction for v1** as scoped, (b) **un-defer snake for v1** and move auction to v1.1 (ship the built rail), or (c) **a minimal auction** (manual bidding UI, simple CPU max-bid, reusing `assessSolvency`)? Everything else (G1's natural home, the freeze writer) keys off this.

**B. The economy anchor / G1 (still the one hard MISSING).** The per-player IV that exists at lock (`RegisteredPool.players[].iv`) is discarded at the handoff. To close G1: (1) is the frozen draft-IV baseline a **distinct** number from frozen salary (vision §2.A says yes), and (2) **where is it stamped** — at draft finalize (the natural source, paralleling settled salary) or backfilled in `franchiseInitializer` from the registered pool — and **where stored**: a per-player field on the franchise `Player`, or a `checkpoint-0` row in the existing `franchiseTrueValueSnapshots` store (no DB bump → stays GREEN per the seam map)?

**C. Tier-scaled IV (§1.3).** The pool stores the **tier-flat** juiced kblIV; the per-player tier scale (`TIER_SHIFTS`, juiced 1.0 / standard 0.883 / nerfed 0.792) is defined but never applied. Is **tier-scaled per-player IV** intended for v1 (apply the scale at registration), or is "IV is tier-flat; tier only sets the spend budget" the accepted v1 design?

**D. The "lock" semantics.** Should "Register Pool" become a **true lock** (idempotency guard + `lockedAt` + immutable snapshot of full player fields, blocking re-registration), or is the current recompute-on-demand model acceptable given the deep-copy at franchise creation captures the real instance?

**E. Player-pool modes.** Build a one-click **"use the players already rostered on the selected branded teams"** path (mode a) distinct from per-player hand-pick (mode b), or is the single `leagueAssignments` mechanism acceptable for v1?

**F. Stadium dimensions.** Accept **name-keyed** park re-derivation (custom/unknown stadium names silently lose dimensions/park factors), or carry the actual `parkFactors`/dimensions **by value** through `FranchiseTeamStadiumSnapshot`?

**G. Names — canonical source + the second reporter generator.** (1) Two large pools coexist (`nameDatabase.ts` — already imported by the draft pipeline as `SMB4_*`; `smb4NameDatabase.ts` — used only by managers). Which is the authoritative "Possible Names" source the reporter/scout fixes repoint to (recommend `nameDatabase.ts` for consistency), or consolidate to one? (2) The `narrativeEngine.ts` reporter generator is a **second** live reporter name path — repoint it too, or is it legacy GameTracker-only and to be deprecated?

**H. Personality ↔ modifier pairing (§2.B).** The vision says canonical-7 personalities are "paired with some combination of the 4 hidden modifiers." The generator already emits both independently (`prospectScoutingDraftEngine.ts:520-524`). When pinning to canonical 7, must a specific **pairing rule** be enforced, or is independent generation acceptable for v1?

**I. AI picking parity.** Three draft rails have three different AI behaviors (snake = none/manual; offseason DraftFlow = `Math.random` grade-pick; farm = seeded headless). Should the v1 draft (whichever format wins **A**) have a **single deterministic** CPU picker, or is per-rail behavior acceptable?

---

*End of audit. READ-ONLY; no code changed; no build/test run (concurrent-safe with the live L13 build). Every status carries a `file:line`; all executive-summary, D1 §4-resolving, D3, and the D6 [NEW] claims were independently re-read by the Captain (✔︎CR), and all three MISSING claims (auction, draft-IV baseline, lock/pool-mode-b) survived adversarial refutation attempts. Open items #1–#7 from the vision spec §4 are resolved above; the v1-cut decision (WAITING_ON_JK **A**) gates the rest.*
