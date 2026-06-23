# MODE 1 → MODE 2 — V1 LAUNCH-READINESS AUDIT

**Date:** 2026-06-20  **Auditor:** Claude Opus 4.8 (Captain)  **Branch:** `codex/franchise-v1-next`
**Type:** READ-ONLY static audit. No build/test was run (concurrent-safe with the live L13-4 build, per mandate). Verification tier = static code reads with `file:line` + quoted evidence on every load-bearing claim; the highest-stakes claims were independently re-read by the Captain (not just relayed from sub-agents).
**Method:** v1 target was DERIVED — from `FRANCHISE_V1_LIVING_SEASON_SPEC.md` §0–24 + the Mode-2 code — not taken from the obsolete Mode-1 specs. Evidence-over-assertion: "looks built" was traced to an actual caller/write or marked MISSING.

> **SUPERSEDES** `spec-docs/FRANCHISE_MODE1_MODE2_PLAYABLE_V1_GAP_ANALYSIS.md` (2026-06-09) as the v1 launch-readiness target. That doc predates the L1–L13 stack; it excludes things that are now v1 (relationships, final True Value, the draft) and its "advanced systems are inert" claims are stale. Use it only as a historical snapshot of what was built circa 2026-06-09.

---

## 0. EXECUTIVE SUMMARY — CAN MODE 1 LAUNCH MODE 2?

**Mostly yes — the structural launch handoff is real and live, and the DSTACK's two cited "BLOCKERs" are already closed in code.** The franchise-creation path (`FranchiseSetup.tsx:171` → `initializeFranchise()` at `franchiseInitializer.ts:570-680`) deep-copies rosters/teams/stadiums/salaries into the per-franchise DB and **does** stamp the launch inputs the planning docs said were missing.

**The DSTACK is STALE on the current tree (verified):**
- DSTACK BLOCKER #2 ("zero Captain assignment at handoff") — **REFUTED.** `assignTeamCaptains()` runs at `franchiseInitializer.ts:660`, writing `team.captainPlayerId`.
- DSTACK BLOCKER #3 ("hidden modifiers mis-named + un-persisted") — **REFUTED.** The generator emits the **canonical** `loyalty/ambition/resilience/charisma` (`prospectScoutingDraftEngine.ts:518-525`), and they are persisted at launch via the backfill at `franchiseInitializer.ts:658`. The mis-named `leadership/volatility/adaptability/pressure` tokens appear **nowhere** as fields (the DSTACK pointer to `fameEngine.ts` resolves only to Triple-Crown comments).

**The genuinely OPEN launch gaps (the real work):**

| # | Gap | Severity | Where |
|---|---|---|---|
| **G1** | **Frozen draft-IV True-Value baseline is stamped NOWHERE at launch.** Spec §3 names three frozen states; only the contract/salary is frozen. The "expectation the season is measured against" has no field and no freeze step. | **HIGH** (economy anchor) | `franchiseInitializer.ts:580-674` (absent) |
| **G2** | **Personality taxonomy is non-canonical.** Generator/schema use an 11-value SMB set incl. `Spirited/Crafty/Scholarly/Disciplined`; spec §7 + the live morale matrix key on the canonical 7. Bridged only by a normalizer that silently defaults on a miss. | **HIGH** (morale spine input) | `prospectScoutingDraftEngine.ts:247`; `leagueBuilderStorage.ts:66-68` |
| **G3** | **Dummy names — hard-rule violation.** Reporters draw from an invented 18-name array; two non-interactive scout-bridge paths stamp `Startup Farm Scout N` / `Franchise Setup Bridge Scout N`. (Players, prospects, managers, and interactive scouts use the real SMB4 pool.) | **HIGH** (announcer can't voice invented names) | `reporterNameGenerator.ts:3-28`; `leagueBuilderStartupFarmDraft.ts:299`; `franchiseStartupProspectDraft.ts:211` |
| **G4** | **Captain Charisma≥70 floor omitted.** Spec §4 gates Captain on Charisma≥70; code picks top `loyalty+charisma` unconditionally (test literally named "no charisma floor"; a charisma-69 player wins). | MED | `franchiseInitializer.ts:227-257` |
| **G5** | **Fame is intentionally neutralized for v1** (`fame:0`, modifier `1.0`); no Heat/Reach pair, no draft-position seed. May be the intended v1 contract (confirm) — fame is an L6 Phase-2 system. | MED (likely by-design) | `franchiseSalary.ts:171,286` |
| **G6** | **No auction draft exists.** Snake/startup drafts are built; auction is spec-only (`MODE_1_LEAGUE_BUILDER_FINAL.md:850`). Snake has no per-position roster-limit enforcement and no MLB CPU autopick. | depends on v1 scope | see §3 |

**Bottom line:** Mode 1 *can* launch Mode 2 today and the morale/relationship/designation spine has its core launch inputs (modifiers, personality field, captain, rosters, cadence). The four things that block a *correct* living season are G1 (the economy can't measure value-delta against the intended anchor), G2 (the morale matrix can mis-key personalities), G3 (invented names reach the announcer), and — if traditional+auction are both v1 — the draft gaps in §3.

---

## DELIVERABLE 1 — THE LAUNCH CONTRACT + RECONCILIATION

**The launch contract** = the data a Mode-2 living-season system READS that must EXIST at franchise creation. Derived from the spec, then reconciled against what the Mode-1 → franchise handoff (`initializeFranchise`, `franchiseInitializer.ts:570-680`, wired live from `FranchiseSetup.tsx:171`) actually produces.

Legend: **PRESENT** = stamped at launch · **PARTIAL** = stamped but wrong/incomplete · **MISSING** = not stamped · **N/A-accrual** = legitimately in-season, starts empty.

| # | Mode-2 launch requirement (spec) | Mode-1 provides? | Evidence / gap |
|---|---|---|---|
| 1 | **Frozen draft-IV True-Value baseline** per player (§3:49,58 — "frozen at the draft", the bar TV is measured against all season) | **MISSING** | No field, no freeze step. `grep draftIV\|draft-IV\|frozenAnchor src/` → 0 non-test hits. Initializer freezes only `salaryBaseline`. `franchiseInitializer.ts:580-674`. **G1.** |
| 2 | **Frozen contract / salary** per player (§3:57,61 — drives Fan Favorite/Albatross delta) | **PRESENT** | `withInitialFranchiseSalary` → `franchiseSalary.ts:303-309`; baseline proof on handoff+config `franchiseInitializer.ts:633,646`. |
| 3 | **Base value oracle** (§3:56 — locked reference, pre-existing) | **PRESENT** | Pre-existing locked oracle in the value spine; not stamped per-franchise (`ivEngine.ts` + frozen oracle JSON). |
| 4 | **Personality type** (one of canonical 7, §7:122) — read by §5 matrix, §8 dampener, §13, §24 | **PARTIAL** | Field stamped & rides the deep copy (`leagueBuilderStorage.ts:255`), but enum is the **11-value non-canonical** set (`:66-68`); generator pool also non-canonical (`prospectScoutingDraftEngine.ts:247`). Morale matrix keys on the 7 (`masterMoraleMatrix.ts:4-11`) via `normalizePersonality` (`:495`). **G2.** |
| 5 | **Four hidden modifiers** Loyalty/Ambition/Resilience/Charisma on every player (§6:106-113) | **PRESENT** | Generated canonical (`prospectScoutingDraftEngine.ts:518-525`); backfilled + persisted at launch via `saveFranchisePlayer` (`franchiseInitializer.ts:658,213-217`). Unit-tested `franchiseInitializer.test.ts:107-120`. **Refutes DSTACK #3.** |
| 6 | **Team Captain** assigned per team at end of Mode-1 finalization (§4:85 — explicit Mode-1→franchise handoff) | **PARTIAL** | Structural `captainPlayerId` IS assigned (`assignTeamCaptains` `:660`, `computeTeamCaptains :227-257`, persisted `:280-283`). **Refutes DSTACK #2.** Gap: no **Charisma≥70** floor (`:233-238`; test "no charisma floor" `franchiseInitializer.test.ts:129,159`). Also the CAPTAIN *designation event* stays blocked (`franchiseDesignationEligibility.ts:163-173`). **G4.** |
| 7 | **Rosters** (22-man + farm prospects) per team (§4:85, §10:190, §24.4:608) | **PRESENT** | `deepCopyLeagueToFranchise` writes `STORES.PLAYERS` (`franchisePlayerStorage.ts:619-621`); integration test `franchiseSetupLaunch.integration.test.ts:382-400`. |
| 8 | **Team identity** (name/city/colors/control) (§14:253, §13:235) | **PRESENT** | Teams deep-copied with `controlledBy` (`franchisePlayerStorage.ts:623-624`); test `:368-374`. |
| 9 | **Stadium record** (dimensions/name/park factors) per team (§14:254, LSD-5) | **PRESENT** | `buildTeamStadiumSnapshots` (`franchisePlayerStorage.ts:502-510`); stored `franchiseInitializer.ts:632,645`; test `:357-366`. |
| 10 | **Player ratings** (hitter + pitcher + arsenal) (§9:155, §3 baseline) | **PRESENT** | Ride the deep copy (`leagueBuilderStorage.ts:242-251`; copied `franchisePlayerStorage.ts:560-566`). |
| 11 | **Starting traits** (≤2) (§9:156,160) | **PARTIAL** | Trait strings ride the copy (`leagueBuilderStorage.ts:253-254`), but **no per-trait strength score / gain-loss buffer** (§9:161-164) — the strength-ranked two-slot displacement is unrepresentable. |
| 12 | **Fame seed** (draft-position-seeded tier; Heat + Reach + was-negative, §20.3/20.4) | **PARTIAL / by-design?** | `Player.fame` + `baseFameTier` fields exist & ride the copy, but salary path forces `fame:0` / modifier `1.0` (`franchiseSalary.ts:171,286`). No Heat/Reach pair (§20.8 tech-debt = single cumulative scalar); no draft-position seed. Fame is an L6 Phase-2 system → likely intended neutral at launch. **G5.** |
| 13 | **Designation inputs** (Captain identity, Fan Hopeful call-up, WAR/TV for MVP/Ace/FF/Albatross) (§4) | **PARTIAL** | Structural `captainPlayerId` + `fanHopefulPlayerId` stamped (`franchiseInitializer.ts:660-661`). Designation *events* CAPTAIN/FAN_HOPEFUL blocked (`franchiseDesignationEligibility.ts:163-177`). Dynamic WAR/TV inputs = N/A-accrual (dotted→locked). |
| 14 | **Checkpoint cadence** (ratings checkpoint every 20% of games, §9:155) | **PRESENT** | `normalizeCheckpointCadence(leagueTemplate.checkpointCadence)` → season metadata (`franchiseInitializer.ts:664-670`). Sourced from the **league template**, not a setup-wizard field (see WAITING_ON_JK). |
| 15 | **Season length** (drives cadence + event interval + RPW scaling, §1:21) | **PRESENT** | Read from league template into season metadata (`franchiseInitializer.ts:605-611`). |
| 16 | **Random-events intensity dial** (Juiced/Standard/Nerfed, §10:192) | **MISSING / unspecified** | No launch step collects an intensity default. Spec silent on default + who sets it. L10 is Phase-2; flagged as a launch-config to define. |
| 17 | **Manager per team** as a tracked entity (§12:211) | **PRESENT** | `buildDefaultManagerProfile` stamps a per-team manager (real SMB4 names) via `ensureDefaultManagerProfile`/`seedManagerAssignmentsForTeams` (`managerIdentityStorage.ts:175-181`). |
| 18 | **Starting fan-morale value** per team (§8 dampener reads it from checkpoint 1) | **Spec-silent** | No launch stamp found; spec never states the launch value (§14 sets rebrand to ~70). Likely needs a defined neutral start. See WAITING_ON_JK. |
| 19 | **Draft pick / position** persisted on the player record (fame seed §20.4, IV baseline §3) | **PARTIAL** | `draftRound/draftPick` exist on `ProspectProfile` (`prospectScoutingDraftEngine.ts:78-82`) but **not** on the core Mode-1 Player; the existing-roster path stamps no draft slot. |
| 20 | Season-end / accrual stores (TV snapshots, relationship edges, race standings, fame Heat/Reach, manager WPA, designation dotted→lock) | **N/A-accrual** | Legitimately start empty; their **inputs** (#1–#19) are the launch contract. TV-snapshot store built + captured from game 1 (`processCompletedGame.ts:296-333`, `trackerDb.ts:370`). |

**Reconciliation verdict:** 11 PRESENT, 6 PARTIAL, 2 MISSING, 1 spec-silent (of the launch-time inputs; accrual row excluded). The single hard MISSING with no design ambiguity is **#1 (frozen draft-IV baseline)**. The PARTIALs that block correctness are **#4 (personality taxonomy)** and **#6 (captain floor)**. #16/#18 are spec-silent launch configs needing a JK ruling.

---

## DELIVERABLE 2 — PLAYER GENERATOR + SMB4 NAMES + PROFILE ATTRIBUTES

### 2A. Generator inventory

There are **two** generators; only the first is on the franchise path.

**(1) `prospectScoutingDraftEngine.ts` — the franchise prospect / farm-draft generator (THE franchise path).** Consumed by `franchiseStartupProspectDraft.ts:384` and `leagueBuilderStartupFarmDraft.ts:572`, and by the live `DraftFlow.tsx`.

| Attribute | Produced? | Evidence |
|---|---|---|
| 4 hidden modifiers (canonical) | ✅ | `:518-525` (loyalty/ambition/resilience/charisma, 50±20 clamped) |
| Names (first + last) | ✅ real SMB4 pool | `:540-541` `pick(...SMB4_FIRST_NAMES/SMB4_LAST_NAMES)` |
| Ratings / age / salary / traits / handedness / arsenal | ✅ | `:518-640` |
| Personality | ⚠️ **non-canonical** | `:247` `PERSONALITY_POOL = ['Competitive','Spirited','Crafty','Scholarly','Disciplined','Tough','Relaxed']` |
| Two-way flag | ❌ | not emitted |
| armSlot | ❌ null | inert |
| Draft pick on core Player | ⚠️ on `ProspectProfile` only | `:78-82` |
| Field-name fork | ⚠️ | emits `hiddenPersonalityModifiers`; L13 reads `player.hiddenModifiers` (`processCompletedGame.ts`) — two names for the same data |

**(2) `smb4PlayerGenerator.ts` — the Builder custom-roster tool (NOT a franchise path; only consumer is `Builder.tsx`).**

| Attribute | Produced? | Evidence |
|---|---|---|
| Ratings / positions / traits / handedness / arsenal | ✅ | `:536-675` |
| Names | ❌ **template** | `:817` `"Generated SS 1"` — no name pool imported |
| Personality / hidden modifiers / age / salary / fame / two-way | ❌ | `:57-65` unset; synthesized in `Builder.tsx`; modifiers absent |
| armSlot | ❌ null | `:827` |

> If a Builder-generated roster can be saved into a real league that then launches a franchise, those players carry **template names** and **rely entirely on the launch backfill** for modifiers. (See WAITING_ON_JK.)

### 2B. SMB4 names verdict (HARD requirement — names can never be invented)

The real SMB4 pool lives in **two duplicate files**: `src/data/smb4NameDatabase.ts` (`SMB4_FIRST_NAMES` 2756 / `SMB4_LAST_NAMES` 2128) and `src/data/nameDatabase.ts` (`FIRST_NAMES`/`LAST_NAMES`) — both auto-generated from `spec-docs/data/names_database.json`, **byte-identical in content and order** (verified). The draft engines import `nameDatabase` under a *misleading* `as SMB4_*` alias — harmless to data, a clarity/drift hazard.

| Entity type | Verdict | Evidence |
|---|---|---|
| **Players / prospects** | ✅ **real SMB4 pool** | `prospectScoutingDraftEngine.ts:540-541`; delegated by `franchiseStartupProspectDraft.ts:384`, `leagueBuilderStartupFarmDraft.ts:572`; live UI `DraftFlow.tsx:476` |
| **Managers** | ✅ **real SMB4 pool** (imports `smb4NameDatabase` directly) | `managerIdentityStorage.ts:1,175-176` |
| **Scouts — interactive draft** | ✅ **real SMB4 pool** | `leagueBuilderStartupFarmDraft.ts:800` |
| **Scouts — non-interactive bridges** | ❌ **DUMMY** | `Startup Farm Scout N` `leagueBuilderStartupFarmDraft.ts:299`; `Franchise Setup Bridge Scout N` `franchiseStartupProspectDraft.ts:211` → stamped into `prospectProfile.scoutName` (`:334`, `:260`) → surfaces in the farm-draft UI. **Most likely source of JK's sighting.** |
| **Reporters** | ❌ **DUMMY (hard-rule violation)** | Hardcoded 18-name era array; invented names e.g. `"Ashley Chen"`, `"Priya Shah"`, `'"Dutch" Calloway'` (`reporterNameGenerator.ts:3-28`); live via `reporterAssignment.ts:85` |
| Players — Builder tool | ❌ template (off-path) | `smb4PlayerGenerator.ts:817` |

**Confirm/deny JK's "FARM prospect draft uses DUMMY names":** **Denied for the prospect player names themselves** (real pool), **confirmed for the scout labels** shown alongside them in the non-interactive/bridge farm draft, and **confirmed for reporters** globally. The dummy strings JK saw are the scout placeholders and/or reporter bylines.

### 2C. Attribute-gap list (what Mode-2 reads that the schema/generator under-provides)

> Schema note: the task-named `src/types/game.ts` / `src/types/franchise.ts` do **not** declare a Player. The real schemas are `src/types/index.ts:10-20` (thin), `src/utils/leagueBuilderStorage.ts:223-295` (rich, the franchise Player), and `src/data/playerDatabase.ts:41-72`. **Which is Mode-2's source of truth is itself an open question** (WAITING_ON_JK).

1. **Fame Heat + Reach + was-negative** — spec §20.3 requires two new fields; schema has a single cumulative `fame:number` (§20.8 tech debt). (L6.)
2. **Canonical personality** — schema 11-value vs canonical 7; relies on `normalizePersonality` not silently defaulting (**G2**).
3. **Draft pick/position on the core Player** — needed for fame seed + IV baseline; only on `ProspectProfile`.
4. **Captain badge / §24.9 four-modifier effectiveness composite** — no field; only `Team.captainPlayerId`.
5. **Per-trait strength score + gain/loss buffer** (§9) — not representable.
6. **§11 frozen-base vs franchise-overlay vs temp-overlay separation** — Player has flat mutable rating numbers; the temp auto-expiring overlay has no home (L2 territory).
7. **Frozen draft-IV baseline value** — no field on the player (**G1**).
8. **Schema reconciliation seams** (generation must normalize): name shape (`firstName/lastName` vs single `name`), `teamId` (flat vs `leagueAssignments[]`), Grade enums (3 variants), chemistry coding (words vs 3-letter), Mojo tiers (5 vs 6), `hiddenPersonalityModifiers` (optional) vs `HiddenModifiers` (required).

---

## DELIVERABLE 3 — DRAFT DEEP-DIVE (traditional + auction)

Three real draft surfaces exist; **all snake-order**. The only order builder is `buildSnakeOrder` (`leagueConstruction.ts:305`).

### 3A. Traditional / Snake

| Component | Status | Evidence / gap |
|---|---|---|
| Pick-order (snake reversal) | **BUILT** | `leagueConstruction.ts:305-318`; test `:295-303` |
| LeagueBuilder MLB draft UI + persistence | **BUILT** | `LeagueBuilderSnakeDraft.tsx:400-419`; test `:289-311` |
| Best-available IV board | **PARTIAL** | board renders (`LeagueBuilderSnakeDraft.tsx:343`) but **no auto-select** |
| Roster-constraint enforcement | **PARTIAL** | roster scaffold (`:331`) but **no per-position limits** |
| MLB CPU autopick | **MISSING** | 440 picks are **manual** (`:754`) |
| Startup farm/prospect draft (the one JK believes exists) | **BUILT** | auto-snake + best-scouted + flat salary (`leagueBuilderStartupFarmDraft.ts:384,495-503,735`) |
| Franchise Mode-2 rookie draft (`franchiseDraftAdapter`/`DraftFlow`) | **MISSING/dry-run** | adapter dry-run only (`franchiseDraftAdapter.ts:370-385`); `PrototypeDraftFlow` dead |
| **Stamps the draft-IV True-Value baseline?** | **MISSING** | No draft stamps a frozen IV anchor. IV is on the **pool**, not per-player at draft time (`useLeagueBuilderData.ts:407-419`; salary frozen at `salaryCalculator.ts` commit, no IV). **Cross-cuts G1.** |

### 3B. Auction

**Does not exist.** Confirmed via tree-wide grep (`auction`/`nominate`/`nomination`/`bid`/`bidding`/`outbid`/`bid increment` → 0 genuine hits; noisy matches were `denomination`/`forbidden`/`bidirectional`).

| Component | Status | Evidence |
|---|---|---|
| Auction format anywhere | **MISSING** | spec-only: `MODE_1_LEAGUE_BUILDER_FINAL.md:850`, `LEAGUE_BUILDER_SPEC.md:532`; code `format` is a loose string (`franchise.ts:37`) |
| Per-team war-chest budget | **MISSING** | snake has a salary/luxury-tax cap (`leagueConstruction.ts:387`), not a depleting bid budget |
| Nomination order | **MISSING** | no concept |
| Bidding loop / increments | **MISSING** | no bid/increment/high-bid state |
| No-overspend enforcement | **PARTIAL (reusable seed)** | snake solvency `leagueConstruction.ts:394-404` — keyed off chosen pick salary, not a live bid |
| Roster-slot satisfaction under budget | **PARTIAL (reusable seed)** | `assessSolvency` slot-reserve `:377-390` |
| CPU bidding AI | **MISSING** | DraftFlow CPU is grade-based sequential picking (`DraftFlow.tsx:698-730`) |
| Auction UI | **MISSING** | no screen/route |
| Stamps draft-IV baseline | **MISSING** | n/a (auction absent) |

> Note: `calculateDraftBudget` (`salaryCalculator.ts:1185`) is a snake spending ceiling **and is orphaned** (no callers).

### 3C. Gap-to-functional

- **Snake (v1-functional):** add per-position roster-limit enforcement + an MLB CPU autopick (so AI teams can draft), and **stamp the per-player frozen draft-IV baseline at draft completion** (closes G1 at its natural source).
- **Auction (if v1):** a whole new track — nomination rotation, per-lot bidding loop with increments + win-resolution, depleting war-chest budget (reuse `assessSolvency`/`tierCap` primitives), CPU max-bid valuation AI, and a new UI surface. **This is the largest single build in the audit.**

---

## DELIVERABLE 4 — MODE-1 ↔ L-STACK SHARED-SURFACE SEAM MAP

For a parallel `mode-1` branch alongside the L13 stack on `codex/franchise-v1-next`. L13-4 owns: `relationshipIntensity.ts`, `franchiseRelationshipIntensityCompute.ts`, `franchiseRelationshipEdgesStorage.ts`, the `franchiseRelationshipEdges` store, and edits to `processCompletedGame.ts`. Mode-1 owns: the league builder, the generator, names, the draft, the launch handoff/initializer, and (new) the frozen anchor.

| Surface | Color | Why / coordination |
|---|---|---|
| **`trackerDb` stores + `TRACKER_DB_VERSION` (v25)** | **RED if Mode-1 adds a `kbl-tracker` store; GREEN if not** | Both sides edit one `onupgradeneeded` + one version constant. If Mode-1 stores the frozen draft-IV baseline in a **new** `kbl-tracker` store, it collides with any L-stack v26 bump. `trackerDb.ts:17,453-465`. **This is the one place Mode-1's natural implementation (G1) forces a RED.** |
| **Pinned store-list / migration tests** | **RED** | `franchiseSeasonLedgerStorage.test.ts:278,298` hard-pin `25` + the full sorted store array; `backupRestore` schema parity. Any version bump/store add must move all in lockstep. Serialize. |
| **League settings record** (`leagueBuilderStorage.ts`, DB `kbl-league-builder` v7) | **GREEN** | Separate DB with its own pinned migration test; L13 never imports it. |
| **Shared Player record / `HiddenModifiers` type** | **YELLOW** | Shared type; disjoint writers. L13 reads only edge fields + `playerId/teamId`, never `hiddenModifiers`. Coordinate only on a shape change. |
| **True-Value artifact / snapshots** | **YELLOW** | Shared stores; disjoint writers (in-season `persistTrueValueAfterWar` + a new Mode-1 baseline writer). L13 does not touch them. |
| **`franchiseInitializer.ts`** | **GREEN** | Never imports `trackerDb`/`processCompletedGame`/TV writers/edge store. Disjoint from L13-4. |
| **`processCompletedGame.ts`** | **GREEN (RED only if Mode-1 wires a launch step here)** | This is L13-4's edit target; Mode-1 must not edit it. A draft-IV baseline stamped at **launch** belongs in the initializer, not here — keep it out of `processCompletedGame`. |

**Parallelization verdict:** Safe to run Mode-1 and L13-4 in parallel **except** for the trackerDb version/store-list (serialize any DB bump) and shape changes to the shared Player/TV types (coordinate). The cleanest way to avoid the one RED: stamp the frozen draft-IV baseline as a **checkpoint-0 row in the existing `franchiseTrueValueSnapshots` store** (no new store, no version bump) rather than a new store — pending the §3 design ruling.

---

## FORWARD NOTE — what an end-to-end (create-league → draft → full-simmed-season) sim engine needs

Scoping only (do not build). From each deliverable:

- **From D1:** the sim's "create league → launch" leg can reuse `initializeFranchise` as-is for 11/19 inputs. It must first resolve **G1** (or the sim has no frozen anchor to measure value-delta) and **G2** (or personalities mis-key the morale matrix). The existing L-SIM harness (`test-utils/lsim/`) already drives the *post-launch* season; this audit defines its *pre-launch* setup contract.
- **From D2:** the sim needs a deterministic, seedable generator that stamps **all** launch attributes incl. canonical personality + the field-name reconciliation. `prospectScoutingDraftEngine` is seed-driven and suitable; the Builder generator is not.
- **From D3:** an end-to-end sim needs a **headless draft driver** — the snake startup draft already runs headless (`leagueBuilderStartupFarmDraft` auto-snake), but it must be extended to stamp the draft-IV baseline. Auction would need a headless bidding simulator (does not exist).
- **From D4:** the sim writes to `kbl-tracker` — it must serialize against L-stack DB bumps and use the existing snapshot store (no new store) to stay GREEN.

---

## WAITING_ON_JK (batched — genuine ambiguities, mostly where the spec is silent on a launch-time input)

**A. Economy anchor (G1) — the one hard MISSING:**
1. §3 names a draft-IV expectation baseline *distinct* from the contract, but code computes `valueDelta = TV − contract/salary` (`salaryCalculator.ts:1018`). Is the draft-IV baseline a **different** number than the frozen salary, or are the two intended to collapse (in which case code already satisfies it and §3 needs only a wording reconcile)?
2. If distinct: **who stamps it** — the Mode-1 draft (per-pick expectation, paralleling the fame draft-seed) or `franchiseInitializer` from the just-drafted roster? And **where** — a `checkpoint-0` row in the existing `franchiseTrueValueSnapshots` store (no DB bump, stays GREEN) or a new store (RED)?

**B. Personality taxonomy (G2):** Pin the generators + schema to the canonical 7 (COMPETITIVE/RELAXED/DROOPY/JOLLY/TOUGH/TIMID/EGOTISTICAL), or keep the 11-value SMB set and guarantee `normalizePersonality` maps every value (no silent default)? Today the generator emits `Spirited/Crafty/Scholarly/Disciplined`, which are not the canonical 7.

**C. Names (G3) — hard rule:**
3. **Reporters** draw from an invented 18-name array. Make reporters draw `firstName`+`lastName` from the SMB4 pool like the other three entities, or is the curated era-flavored set an intentional exception? (Several current names are not in the SMB4 pool.)
4. **Bridge/auto scout names** (`Startup Farm Scout N`, `Franchise Setup Bridge Scout N`) surface in the farm draft — repoint them to the SMB4 pool like the interactive scout path?
5. Collapse the two duplicate name DBs (`nameDatabase.ts` ≡ `smb4NameDatabase.ts`) to one source and rename the misleading `as SMB4_*` alias?

**D. Captain (G4):** Enforce the spec §4 **Charisma≥70** floor (team with no ≥70 player gets `captainPlayerId=null`), or is the current unconditional top-`loyalty+charisma` pick the intended v1 behavior? (Test is named "no charisma floor.")

**E. Fame (G5):** Is `fame:0` / modifier `1.0` the intended v1 launch contract (fame is L6 Phase-2), or should Mode-1 stamp a draft-position fame seed at launch?

**F. Spec-silent launch configs:**
6. **Starting fan-morale value** per team at creation — define it (spec only states the §14 rebrand value ~70)?
7. **Random-events intensity dial** default (Juiced/Standard/Nerfed) + who selects it at setup?
8. **Checkpoint cadence** is inherited from the league template, not collected in the FranchiseSetup wizard — is league-template inheritance the intended design, or should setup offer per-franchise cadence?

**G. Draft scope (G6):** Is **auction** a v1 launch format or a deferred V2 (spec lists it; code implements only snake)? And for snake v1, are **per-position roster-limit enforcement** + an **MLB CPU autopick** required for v1?

**H. Schema source of truth:** Which Player schema is Mode-2's canonical source — `src/types/index.ts`, `leagueBuilderStorage.ts`, or `playerDatabase.ts`? This routing affects every attribute claim and the field-name fork (`hiddenPersonalityModifiers` vs `hiddenModifiers`).

**I. Doc hygiene:** Should the DSTACK BLOCKER table / L1.5 ticket be marked verified-complete now that #2 and #3 are closed in code (`franchiseInitializer.ts:658-661`)?

---

*End of audit. READ-ONLY; no code changed; build/test not run per the concurrent-safe mandate. Every status above carries a file:line; the executive-summary claims (G1–G6, DSTACK refutations) were independently re-read by the Captain.*
