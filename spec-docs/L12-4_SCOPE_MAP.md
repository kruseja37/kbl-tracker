# L12-4 SCOPE MAP — ALL-STAR ROSTER SELECTION ENGINE + 60% LOCK

> Produced by the L12-4 grounding recon (6 readers + synthesis + adversarial critique, 2026-06-19,
> workflow `wf_74ab63b0-55a`). Every file:line re-verified against live code on `codex/franchise-v1-next`
> (TRACKER_DB_VERSION=24). Deepens `L12_SCOPE_MAP.md §3` for the L12-4 sub-ticket now that L12-1 (the store)
> and L12-3 (the race scorer + per-game recompute) have LANDED. BUILD-DARK behind `isFranchisePhase2L12Enabled`
> (default OFF, activate post-D13). Triangle applies: builder ≠ auditor.
>
> **⚠ The prior L12 map predates L12-1/L12-3. Two of its statements are now STALE:** (1) "NEW 8th gate branch
> after processCompletedGame.ts:654" — the L12 flag block ALREADY EXISTS at **:657-663**; L12-4 extends it,
> does NOT insert a new branch. (2) "the franchiseAllStarRosters store decision" — RESOLVED; the dedicated
> store is BUILT (L12-1, v24). No DB/ledger/backup work remains for L12-4.

---

## 1. SUBSYSTEM SURFACE

L12-4 is the **greenfield by-position All-Star selection engine** plus the **60% roster lock**. It (a) groups
qualified players by position, picks one **FAME-LED** starter per position (fan-vote scoring), fills a
**MERIT/WAR-led** reserve block + pitching contingent, and writes the result into the **existing**
`franchiseAllStarRosters` store; and (b) on the completed game that crosses the 60%-scheduled-games mark,
freezes that roster (`locked=true` + `lockedAtGameNumber`) **lock-once-and-forever**.

**v1 = ONE league-wide 26-man team, ANY league size (JK ruling 2026-06-19, refined).** The user-selectable
1-vs-2-teams, the dual-conference 22-man format, AND the flexible per-position min/max roster customization are ALL
**DEFERRED to v2** — for marginal v1 value (v1 All-Star plays no game; it is build-dark until post-D13) against a real
config-UI + constraint-solver + validation cost. v1 ships a **fixed 26-man roster modeled as a config PRESET** (a data
object: slot counts per position + team count) so the v2 League Builder customization (min/max matrix + dual-conference)
drops onto the same engine WITHOUT a rebuild. §3.5 gives the exact v1 roster.

**Clean boundary vs L12-5 (do NOT cross it):** L12-4 *only* PRODUCES the roster + SETS the lock. ALL payouts
are L12-5 — the §22.3 fame reach-floor ratchet (`updateReachFloor`), the All-Star badge/designation, the
player morale boost, the personality-scaled snub morale hit (`MORALE_TAP_REGISTRY.race` fill), the reporter
tap, the emission, and the `allStarSelections` career-counter increment. In L12-4: **do NOT** call
`updateReachFloor`, **do NOT** fill `MORALE_TAP_REGISTRY.race`, **do NOT** increment `allStarSelections`,
**do NOT** emit fame/morale/badges, **do NOT** adopt the archived screen's `+3/+2` fame magnitudes.
(Source: `FRANCHISE_V1_LIVING_SEASON_SPEC.md §22:510-524`; `L12_SCOPE_MAP.md §3` L12-4:136-142 vs L12-5:144-151.)

---

## 2. GREENFIELD (L12-4 builds) vs REUSED (do NOT rebuild)

### GREENFIELD — L12-4 authors these
- **Pure by-position selection engine** — `src/engines/franchiseAllStarSelector.ts` (side-effect-free, mirror
  `src/engines/franchiseTvFamilyScorer.ts:28-53`): combo-position normalizer → per-position fame-led starter →
  merit-reserve fill → pitching contingent → `FranchiseAllStarSelection[]`. No such function exists
  (grep `allstar/selectAllStar/buildAllStar` over `src/` = only the storage file, this map, the archived UI).
- **All-Star candidate exporter** preserving `valuePosition` + `currentTeamId` — the L12-3 thin exporter
  `computeFranchiseRaceCandidateRows` returns `{playerId, score, marginToWinner}` and **strips position/team**
  (`franchiseAwardsEngine.ts:101-105`). A new sibling exporter (co-located in `franchiseAwardsEngine.ts` so it
  can call the module-private `meetsQualifier`) keeps `valuePosition`/`currentTeamId`/WAR/qualifier facts intact.
- **Combo-position normalizer** — OF→{LF,CF,RF}, IF→{1B,2B,3B,SS}, 1B/OF & IF/OF→primary, SP/RP kept literal.
  Authored against the **18-member base** `Position` enum (`src/types/game.ts:9`), NOT the 15-member figma enum.
  No normalizer exists today.
- **Configurable-fraction lock-once helper** — `crossesAllStarLockFraction(gameNumber, totalGames, fraction)`
  (default `ALL_STAR_LOCK_FRACTION = 0.6`), **cross-from-below** against `Math.round(totalGames*fraction)`. Pure
  & deterministic. The existing 20%-grid `isCheckpointBoundary` (`franchiseCheckpointSweepCompute.ts:106-114`)
  re-fires every boundary and has no configurable threshold and no latch — do NOT reuse it.
- **Roster-size / count constants** as named §16-tunable placeholders (reserve-bench size, SP/RP contingent
  counts; DH gating) — spec is silent on every number.
- **Persist + lock wrapper** invoked from the existing per-game L12 flag block — load lock guard → build →
  `putFranchiseAllStarRoster` → set lock on the 60% crossing.
- **New tests** — selection determinism, 60%-lock-once idempotency, lock-freeze-on-re-fire, pre-lock-rewrite
  createdAt preservation. (The storage test only pins the persistence round-trip, not selection/lock logic.)

### REUSED — do NOT rebuild
- **Persistence store + row shape** — `src/utils/franchiseAllStarRostersStorage.ts`: selection `:15-23`, row
  `:25-33` (lock fields `:29-30`), id helper `franchiseAllStarRosterId :80-82`, `putFranchiseAllStarRoster :84-95`
  (mirror-sync `:92-94`), `getFranchiseAllStarRoster :97-115`, `getFranchiseAllStarRostersByScope :117-133`.
  **NO DB bump** — `TRACKER_DB_VERSION` already **24** (`trackerDb.ts:17`), store created v24 (`:442-451`),
  mirror-wired (`syncConfig.ts:20`, `backupRestore.ts:176-180`, ledger PIN). The L12-1 ledger/backup cost is spent.
- **Fame-led fan-vote scorer + weights** — `computeFranchiseRaceStanding` (`franchiseRaceStandingScorer.ts:59-126`;
  candidate `:4-9` = `{playerId, meritScore, fameHeat, fameReachFloor}`; output `:20-29` incl. `rank`/`composite`/
  `band`; tie-break composite→meritScore→playerId `:105-108`). `FAN_VOTE_WEIGHTS` (`:45-57`, fameAlwaysOn:true,
  wMerit 0.35 / wFame 0.65 — **currently ORPHAN, built for L12-4**); `MERIT_RACE_WEIGHTS` (`:31-43`).
- **Qualifier floor** — module-private `meetsQualifier` (`franchiseAwardsEngine.ts:281-303`); thresholds
  `awardQualifierThresholds` → PA 502 / IP 162 season-scaled (`franchiseAwardTrust.ts:6-21`); facts assembly
  `qualifierFactsFromStats` (`:549-568`, `gamesStarted` set from pitching rows `:564`). **Existing relaxed
  fractions to REUSE (not reinvent):** `BENCH_PLAYER_QUALIFIER_FRACTION = 0.25` (`:119`), `RELIEVER_QUALIFIER_IP_FRACTION = 0.15` (`:120`).
- **Merit selectors** — `scoreForCategory` (`franchiseAwardsEngine.ts:258-279`): `totalWar` (position-player
  reserves), `pitchingWar` (SP), `pitchingWpa` (RP). The exhaustive `FranchiseWarAwardCategory` switch **already
  covers `BENCH_PLAYER` + `RELIEVER_OF_YEAR`** (added in L12-3c/3R-2) — **no new compile break** for L12-4's reuse.
  RP pool already excludes `gamesStarted>0`. **`pitchingWpa` is `number|null`** (`franchiseValueInputs.ts:37`) —
  RP ranking MUST null-guard (mirror `categoryCandidateRows`'s `finiteNumber(score)` filter `:328`).
- **Per-player position/team carrier** — `FranchiseValueInputRow` (`franchiseValueInputs.ts:70-119`): `valuePosition:78`,
  `currentTeamId:80`, `trueValuePositioning.isReserve`; built by `buildFranchiseValueInputRows` (defined `:386`;
  `valuePosition` derivation `:566` = `trueValuePositioning?.valuePosition ?? player.primaryPosition ?? null`).
  **This is the ONLY seam carrying position + team + reserve flag together** — start the candidate pool here.
- **Fame signals** — `getFranchiseFameRecordRowsByScope` (`franchiseFameRecordsStorage.ts:142-158`; row `:16-26`),
  joined by playerId for `fameHeat`/`fameReachFloor`.
- **Per-game L12 flag block** — existing `if (isFranchisePhase2L12Enabled())` at `processCompletedGame.ts:657-663`
  (flag import `:65`). L12-4 extends THIS block.
- **Cadence inputs** — `getSeasonMetadata(seasonId).totalGames` denominator (`franchiseCheckpointSweepCompute.ts:220-227`;
  `SeasonMetadata.totalGames` `seasonStorage.ts:165`); gameNumber resolver `resolveCheckpointGameNumber` (`:286-303`).
- **L12 flag** — `isFranchisePhase2L12Enabled` (`franchisePhase2Flags.ts:89`).

---

## 3. THE SELECTION ALGORITHM

Pipeline (the SELECTION core is a PURE engine; the persist/lock is the impure wrapper in §4):

1. **Load candidate pool with position+team intact.** From `buildFranchiseValueInputRows(scope).rows` (defined
   `franchiseValueInputs.ts:386`) — the only seam carrying `valuePosition` + `currentTeamId` + `isReserve`. Do
   **NOT** start from `computeFranchiseRaceCandidateRows` (drops position/team).

2. **Apply the qualifier floor (reuse).** `qualifierFactsFromStats(battingRows, pitchingRows)` → factsByPlayerId →
   `meetsQualifier(category, facts, minPA, minIP)` with `awardQualifierThresholds(...)`. Because `meetsQualifier`
   is module-private, **co-locate the new All-Star exporter inside `franchiseAwardsEngine.ts`** (preferred) rather
   than exporting the qualifier. **Reserve/contingent floors REUSE the existing relaxed fractions** — bench reserves
   `minPA × 0.25` (`BENCH_PLAYER_QUALIFIER_FRACTION`), relief contingent `minIP × 0.15` (`RELIEVER_QUALIFIER_IP_FRACTION`).

3. **Normalize each player to exactly one canonical slot** via the greenfield combo-position normalizer over
   `valuePosition` (18-member base enum). **Two-way trap:** `valuationMode==='two-way-composite'` players carry a
   bat anchor (C/2B/CF) AND a pitching role — eligibility is a JK fork (§6 Fork 4).

4. **FAME-LED STARTER pick — per position bucket.** For each position group:
   `computeFranchiseRaceStanding({ candidates: positionCandidates, weights: FAN_VOTE_WEIGHTS })`, each candidate =
   `{ playerId, meritScore: position-appropriate WAR (totalWar / pitchingWar / pitchingWpa), fameHeat, fameReachFloor }`
   joined from the fame store. **Run per-bucket** so percentiles are within-position (the scorer percentile-ranks the
   pool over only the candidates passed — `:71-92` — a catcher must not be ranked vs a CF). **Starter = `rank===1`**;
   its `.composite` → `selection.selectionScore`; emit `role:'starter'`.
   **Small-N note (verified):** with 1–2 candidates `getPercentile` saturates (≈1.0) and `fameAlwaysOn` keeps the
   fame term live, so the composite degenerates — but the rank-1 pick stays **deterministic** via the composite→
   meritScore→playerId tie-break (`:105-108`). Pin "starter = rank 1 of the per-bucket `RaceStanding[]`" in the contract.

5. **MERIT-RESERVE fill.** From qualified non-starters, rank descending by `scoreForCategory`'s WAR basis (`totalWar`
   for position players). Take the configured reserve count; emit `role:'reserve'` with the raw merit score as
   `selectionScore`. The "rescue the snub" behavior emerges naturally — a high-WAR low-fame player who loses the fan
   vote is picked up here.

6. **PITCHING CONTINGENT.** Top-N SP by `pitchingWar`, top-M RP by `pitchingWpa` (null-guarded; RP pool already
   excludes `gamesStarted>0`). Split SP vs RP via the `gamesStarted` qualifier fact (threaded on `qualifierByPlayerId`,
   NOT on the value row). **Encode pitchers by `position` string ('SP'/'RP'), not a new role** — keep the binary
   `role` union; rank-0 of each = `'starter'`, remainder `'reserve'`. (The `trueValuePositioning.profilePitcherRole`
   field mentioned as a fallback is **UNVERIFIED** — builder must confirm it exists before relying on it.)

7. **Assemble + persist.** One `FranchiseAllStarRosterRow` with `id = franchiseAllStarRosterId(scope)` (use the
   exported helper, do NOT hand-build the string), `selections[]` mapping `currentTeamId→teamId`, `valuePosition→position`,
   score→`selectionScore`. **Caller owns ALL timestamps** (the storage module never injects `Date.now`, test-guarded at
   `franchiseAllStarRostersStorage.test.ts:181`): on a pre-lock rewrite, **read the existing row and PRESERVE its
   `createdAt`, set `updatedAt`** — a naive rebuild that stamps a fresh `createdAt` violates the caller-timestamp contract.
   Call `putFranchiseAllStarRoster(row)`.

   `selectionScore` carries a **mixed scale** (0–1 fame-led composite for starters; raw merit for reserves/contingent) —
   document this in a builder comment so L12-5 reads it correctly. A single field suffices; do NOT split into fameScore/meritScore.

---

## 3.5 ROSTER CONSTRUCTION (RULED — JK 2026-06-19, the EXACT v1 26-man, ONE league-wide team)

The 8 position-player slots in a **no-DH** league = **C, 1B, 2B, 3B, SS, LF, CF, RF** (DH never included — JK ruled).
The combo-position normalizer must split generic `OF`→{LF,CF,RF} and `IF`→{1B,2B,3B,SS} so each of the 8 slots can be filled.

**THE v1 ROSTER — ONE league-wide team, 26-man (25 + 1 wildcard):**
- **8 position starters** — one FAME-LED starter per position (`FAN_VOTE_WEIGHTS`), league-wide pool. `role:'starter'`.
- **5 position backups, position-FAMILY grouped** (MERIT/WAR-ranked within family), `role:'reserve'`:
  **1 C · 1 corner IF (best of 1B/3B) · 1 middle IF (best of 2B/SS) · 2 OF (best of LF/CF/RF)** → 8 + 5 = **13 position players**.
- **Pitchers (12):** **4 SP** (`role:'starter'`) **+ 1 backup SP** (`role:'reserve'`) **+ 5 RP** (`role:'starter'`)
  **+ 2 backup RP** (`role:'reserve'`) → SP ranked by `pitchingWar`, RP by `pitchingWpa` (null-guarded). **Reliever = 0
  starts** (`gamesStarted===0`, per L12-3R); a starter-eligible pitcher = `gamesStarted≥1`.
- **1 FAN WILDCARD** — the **fame-led** 26th: the highest-fame **qualified** player NOT already selected, **any position**.
  Encode `position:'WILDCARD'`, `role:'starter'` (fan-voted tier), `selectionScore` = its fame-led composite.
  **Fame split (JK: "at least the starters' weighting, could be 100% fame"):** dark default = **100% fame**
  (a dedicated `WILDCARD_WEIGHTS` = wMerit 0 / wFame 1 / fameAlwaysOn) with the qualifier floor still applying so it is
  never a scrub; **§16-tunable down to the starter's 65% fame floor** (`FAN_VOTE_WEIGHTS`). 25 + 1 = **26-man**.

**Role/position encoding (no shape widening):** `position` carries the slot string (`C`/`1B`/…/`RF`/`SP`/`RP`/`WILDCARD`);
`role` (binary `'starter'|'reserve'`) carries the headliner-vs-depth tier (8 fan-voted starters + core pitching + wildcard =
`'starter'`; backups = `'reserve'`).

**Two-way players (JK ruled):** compete on the **stronger side only** (bat vs mound, whichever scores higher) — one slot,
never both. The normalizer resolves a `two-way-composite` player to its higher-scoring side before bucketing.

**Modeled as a config PRESET:** the roster shape (slot counts per position/family + team count + the wildcard rule) is a
data object the v1 engine reads hardcoded — so v2's League Builder customization (per-position min/max + dual-conference)
edits the same config without an engine rebuild.

**DEFERRED to v2 (NOT built in L12-4):** user-selectable 1-vs-2 teams; the dual-conference 22-man format (8+5 flat bench
+4 SP+4 RP+1 any-pitcher) + its conference resolution; the per-position min/max reserve-eligibility matrix in League Builder.

---

## 4. THE 60% LOCK

**Anchor (reference only):** `calendarEngine.ts:109-112` already computes `allStarGame = Math.round(totalGames*0.6)`
with `gameThreshold:0.6`, but it emits a calendar **event** via `getSpecialEvents` (`:97`, zero callers outside the
engine + tests) and uses **exact-equality** `gameNumber === allStarGame` (`:110`) — replay-fragile. Not a reusable trigger.

**Greenfield helper:** `crossesAllStarLockFraction(gameNumber, totalGames, fraction = ALL_STAR_LOCK_FRACTION)` —
**cross-from-below**: `(gameNumber-1) < anchor && gameNumber >= anchor` where `anchor = Math.round(totalGames*fraction)`.
NOT exact-equality, so a skipped/replayed/out-of-order anchor game still locks on the first game at-or-past the boundary.
Pure & deterministic (no `Date.now`, no IndexedDB). `ALL_STAR_LOCK_FRACTION = 0.6` (override of the original 0.5; named
§16 constant).

**Lock-once-and-freeze** (fields already exist, `franchiseAllStarRostersStorage.ts:29-30`):
- Each completed game: `getFranchiseAllStarRoster(scope)`. If `row?.locked === true` → **return early** (`locked-noop`),
  skip all All-Star recompute/rebuild.
- Else build/refresh selections; if `crossesAllStarLockFraction(...)` → set `locked=true` + `lockedAtGameNumber=<resolved gameNumber>`, persist once.
- **Branch only on `locked`** (single source of truth); `lockedAtGameNumber` is provenance/telemetry.
- **Pre-lock window:** every completed game rebuilds + re-puts the roster (selections churn until lock) — intended;
  preserve `createdAt` across rewrites (§3.7).

**Cadence inputs:** `totalGames` via `getSeasonMetadata(scope.seasonId).totalGames` (guard `<=0` → dark-noop); league-wide
gameNumber via the `resolveCheckpointGameNumber` logic (`franchiseCheckpointSweepCompute.ts:220-227`, `:286-303`).
Unresolved gameNumber/totalGames → dark-noop, never throw.

---

## 5. RECOMMENDED SPLIT (risk-ordered)

| Sub-step | Scope | Risk | Touches |
|---|---|---|---|
| **L12-4a** | **Pure selection engine** `src/engines/franchiseAllStarSelector.ts` (mirrors `franchiseTvFamilyScorer.ts`): combo-position normalizer + per-position fame-led starter (FAN_VOTE_WEIGHTS) + merit-reserve fill + pitching contingent → `FranchiseAllStarSelection[]`. Imports only the scorer + `getPercentile`. + determinism unit tests. | **MED** | New engine file + tests. No storage/flag/I-O. |
| **L12-4b** | **All-Star candidate exporter** — new sibling in `franchiseAwardsEngine.ts` reusing `buildFranchiseValueInputRows` + `meetsQualifier` + `qualifierFactsFromStats`, RETAINING `valuePosition`/`currentTeamId`/WAR/facts. Do NOT widen `FranchiseRaceCandidateScore`. | **MED** | `franchiseAwardsEngine.ts` (additive export) + test. |
| **L12-4c** | **Lock helper** `crossesAllStarLockFraction` + `ALL_STAR_LOCK_FRACTION` + unit tests (lock-once, cross-from-below, freeze). | **LOW** | New pure helper + tests. |
| **L12-4d** | **Orchestrator wiring + persistence + lock** — thin `persistFranchiseAllStarRosterForCompletedGame` invoked **inside the existing `processCompletedGame.ts:657-663` L12 block** (sibling to the recompute call): load exporter rows + fame → call the pure engine → lock-once guard → `putFranchiseAllStarRoster` → set lock on crossing. Try/catch dark-noop. + integration tests. | **HIGH** | `processCompletedGame.ts` (1 site, additive), All-Star store write. |

Keep the **pure engine (4a/4c) strictly separate** from the **impure orchestrator/persistence (4d)** per the dark-build
pattern. 4d is the only ticket touching the live game-completion flow.

---

## 6. FORKS — ✅ ALL RULED (JK 2026-06-19; this is the decision record)

> **From the L12 ruling pass** (`L12_SCOPE_MAP.md §4`): starters = **by-position, 1 fan-voted starter per position**
> (Q5); starter selection = **fame-led `FAN_VOTE_WEIGHTS` composite + performance floor** (Q2/Q5); reserves =
> **merit/WAR-led** (Q5); lock at the **60% checkpoint, configurable** (Q13 — overrides the stale "50%" still printed at
> `L11_L14_OPEN_QUESTIONS.md:251`); all payouts (reach-floor/badge/morale/snub/counter) = **L12-5**; every fame read via
> **`resolveFameTier`** (Q10).

**From this L12-4 recon (JK rulings 2026-06-19, AskUserQuestion pass + the 2026-06-19 v1-simplify refinement):**

1. **v1 = ONE league-wide 26-man team, any league size.** The user-selectable 1-vs-2 teams + the dual-conference 22-man
   format + the per-position min/max customization are **DEFERRED to v2** (marginal v1 value vs real config-UI + solver +
   validation cost; v1 All-Star plays no game and is build-dark). v1 ships a **fixed 26-man roster modeled as a config
   preset** (forward-compatible — v2's customization edits the same config, no engine rebuild). **No conference resolution
   in v1** (single league-wide pool). *(Conference data IS reachable for v2 when needed: `LeagueTemplate.divisions[]` →
   `{conferenceId, teamIds[]}` `leagueBuilderStorage.ts:79-84` via `getLeagueTemplate` `:787`.)*
2. **Roster = RULED EXACT v1 26-man** (§3.5): 8 fame-led position starters + 5 family-grouped merit backups (1 C / 1 corner-IF
   / 1 middle-IF / 2 OF) + 12 pitchers (4 SP + 1 backup SP + 5 RP + 2 backup RP) + **1 fame-led FAN WILDCARD** (any position,
   highest-fame qualified non-selected; `position:'WILDCARD'`). Wildcard fame split: dark default 100% fame
   (`WILDCARD_WEIGHTS`), §16-tunable to the 65% starter floor. (Counts are fixed, not sim.)
3. **DH — NEVER included** (JK). The 8 position slots are the no-DH set; do NOT add a DH slot, do NOT gate on `config.useDH`.
4. **Two-way players — STRONGER SIDE ONLY** (JK). Resolve a `two-way-composite` player to its higher-scoring side (bat vs
   mound) before bucketing; one slot, never both. Combo-position normalization: prefer concrete `valuePosition`,
   deterministic fallback when itself a combo (OF→ one of LF/CF/RF, IF→ one of the 4), dedupe to one slot per player.
5. **`allStarSelections` career-counter — NOT L12-4** (Captain default, confirmed safe): zero live writer
   (`careerStorage.ts:72` zero-init; `seasonEndProcessor.ts:93-97` consumes pre-supplied). It's a payout → L12-5/season-end.
6. **Recompute-only contract (Captain engineering default):** keep `recomputeFranchiseL12StandingsForCompletedGame` pure;
   add a **thin sibling `persistFranchiseAllStarRosterForCompletedGame`** in the same L12 flag block (reuse the assembled
   candidate+fame spine where feasible to avoid a second `buildFranchiseValueInputRows` pass).

**Sim-magnitude placeholders (§16, consume live config):** `FAN_VOTE_WEIGHTS`/`MERIT_RACE_WEIGHTS`, the qualifier fractions
(0.25 / 0.15), `ALL_STAR_LOCK_FRACTION` (0.6), and the FORMAT-A "+1 pitcher" tiebreak metric. (Roster COUNTS are now fixed, not sim.)

---

## 7. DARK-BUILD CHECKLIST

- ☐ Gate **every** new path behind `isFranchisePhase2L12Enabled()` (`processCompletedGame.ts:657`; `franchisePhase2Flags.ts:89`). No live reader until **post-D13**.
- ☐ **NO `TRACKER_DB_VERSION` bump · NO new store · NO ledger PIN · NO backup DoD** — all spent in L12-1 (store at v24).
- ☐ **Extend the existing L12 flag block** at `processCompletedGame.ts:657-663` — do NOT insert a new branch (old map §6 is stale).
- ☐ **`resolveFameTier`-only** for fame reads; touch no fame mutation/payout path.
- ☐ Write via `putFranchiseAllStarRoster`; **caller owns timestamps**, preserve prior `createdAt` on pre-lock rewrites.
- ☐ **Do NOT widen** `FranchiseAllStarSelection`/`FranchiseAllStarRosterRow` or `FranchiseRaceCandidateScore` — shape changes cascade into pinned fixtures (storage, ledger-PIN, manifest, parity ×2).
- ☐ Dark-safety: unresolved gameNumber/totalGames → dark-noop (not throw); wrap build+lock in try/catch with a `[L12] dark all-star …` warn (mirror `processCompletedGame.ts:660-661`), so a selector failure never blocks game completion.
- ☐ **Triangle: builder ≠ auditor.** Surface §6 forks (single-pool/sizes/DH/combo/two-way) to JK **before** baking defaults (no-inference rule; attended session).

---

## 8. RISKS (top build risks)

1. **Position/team plumbing gap (HIGHEST).** The L12-3 thin exporter drops `valuePosition`+`currentTeamId`
   (`franchiseAwardsEngine.ts:101-105`) — by-position grouping AND `FranchiseAllStarSelection.teamId/position`
   population are impossible from it. Mitigation: new exporter from `buildFranchiseValueInputRows`; do NOT widen the
   merit-race shape (ripples into all 8 merit races / RACE-4 ordering).
2. **Lock-once correctness.** Re-fire / exact-equality risks a permanently-unlocked roster (skipped/replayed anchor)
   or repeated re-locks. Mitigation: cross-from-below + branch solely on the persisted `locked` flag.
3. **Combo-position normalization.** No normalizer exists; the two `Position` enums diverge (base 18 vs figma 15). A
   wrong rule double-counts a player at multiple slots or mis-buckets two-way players. Mitigation: deterministic
   normalizer on the 18-member base enum, dedupe to one starter slot, explicit two-way ruling.
4. **Conference / single-pool fork.** Two-league needs a team→conference resolver the dark path does NOT load.
   Mitigation: ship single-pool v1; persist a conference tag for forward-compat.
5. **Mixed-scale `selectionScore` + null `pitchingWpa`.** Starters carry a 0–1 fame composite, reserves raw merit;
   RP `pitchingWpa` is nullable. Mitigation: document the mixed scale for L12-5; null-guard the RP ranking (finite filter).
6. **Pre-lock idempotency.** The unlocked window re-puts the roster every game — preserve `createdAt`, set `updatedAt`,
   else the caller-timestamp test contract breaks.

---

**Document path:** `spec-docs/L12-4_SCOPE_MAP.md`. Written by the Captain after applying the adversarial critique's
corrections (Fork 2 reframed — by-position starters are RULED, not a fork; Fork 6 demoted to a Q2/Q13 confirmation;
the small-N per-bucket note; the existing relaxed-qualifier-fraction reuse; the `pitchingWpa` null-guard; the
pre-lock createdAt-preservation; anchor fixes: `getFranchiseAllStarRostersByScope :117-133`, `buildFranchiseValueInputRows`
defined `:386`, `calendarEngine :109-112`). UNVERIFIED items explicitly flagged: seeded `config.useDH` default,
`trueValuePositioning.profilePitcherRole` existence, and LeagueTemplate access at recompute time (confirmed NOT loaded → single-pool v1).
