# L12 LIVING-SEASON RACES + ALL-STAR + PLAYER AWARDS — CONTRACT-READY SCOPE MAP

> Produced by the L12 grounding recon (7 readers + synthesis, 2026-06-19, AUTH-4).
> All structural anchors verified against live code on `codex/franchise-v1-next`
> (TRACKER_DB_VERSION=23; **7 phase-2 flag guards** in processCompletedGame — 1 Morale
> early-return at :379 + **6 dark branches** at :613/:620/:627/:634/:641/:648, last is L11;
> the D9 merit-award engine LIVE at `src/utils/franchiseAwardsEngine.ts` with a pure-WAR
> sort and NO fame term; the L6 dark fame substrate `resolveFameTier` at fameModel.ts:191
> with **ZERO live importers** — L12 is its first live consumer). Build order:
> L12-1 → L12-2 → L12-3 → L12-4 → L12-5 → L12-6. **Build-DARK behind a NEW
> `isFranchisePhase2L12Enabled` flag (clone the L11 block), activate post-D13.**
> Triangle applies (builder ≠ auditor per ticket).
>
> **⚠ PATH CORRECTION (prompt had it wrong):** the award engine + storage live in
> **`src/utils/`** (`src/utils/franchiseAwardsEngine.ts`, `src/utils/franchiseAwardsStorage.ts`),
> NOT `src/engines/`. Only `awardEmblems.ts` is in `src/engines/`. All §5 anchors use the
> verified `src/utils/` paths.

---

## 1. SUBSYSTEM SURFACE

L12 is the Franchise-V1 **"Living Season" race + honors layer**: a per-completed-game **race-standing
system** (a weighted composite of merit-WAR + fame, banded by score-gap clustering) plus the
**All-Star roster** (a fan-voted-starter + merit-reserve by-position record), the **player-award
races** (MVP/CY/SS/GG/RoY + the new BENCH_PLAYER/BOOGER_GLOVE/RELIEVER_OF_YEAR + the TV-family
KK/Bust/Comeback), and the **fame/morale emission** that the marquee honors produce. It is built
on top of the **LIVE D9 merit-award engine** and the **DARK-built L6 fame substrate** — L12 mostly
*reads* fame and *layers* a composite on top; it does not rebuild scoring and it does not own fame.

**Greenfield (L12 builds):**
- the **race-standing composite scorer** (w_merit·WAR + w_fame·fame, weights *per race type*) + **score-gap clustering bands** + the **Q3 close-race fame-tilt** (`|margin| < window` AND both merit > floor) — none of this exists; the live sort is pure WAR (franchiseAwardsEngine.ts:321-325).
- the **All-Star multi-selection roster record** (1 fan-voted starter/position + pitching contingent + merit-reserve block) — the single-winner `FranchiseAwardRow` (franchiseAwardsStorage.ts:40-50) cannot hold it; this is the highest-coupling greenfield store decision.
- the **GoldGlove Q4 defensive-channel-fame share** (fWAR + 20%·defensive-channel-fame) — today GG is pure fieldingWar (eng:252).
- the **TV-family scorers** — KK (league-wide valueDelta rank), Bust (inverted), Comeback (currentTV − season-low gap, JK 2026-06-19); the substrate is 100% live, the scoring math is 100% missing (grep of all three names in the engine = 0).
- the **RELIEVER_OF_YEAR / BENCH_PLAYER / BOOGER_GLOVE** merit bases (no `scoreForCategory` branch exists for them, eng:242-256).
- **award fame/morale EMISSION** (MVP+CY+All-Star emit; rest visibility-only) — zero emission exists; franchiseDesignationEligibility.ts:460 confirms "awards, fame mutation, morale mutation… remain blocked."
- the **L3 race-snub morale row** — the matrix `race` tap is a live no-op (`race: () => NEUTRAL_BASE_CONSEQUENCE`, masterMoraleMatrix.ts:401).
- the **honor → Reach-floor map** feeding the live `updateReachFloor` (fameModel.ts:176).
- the **NEW `isFranchisePhase2L12Enabled` flag** + the 8th gate branch (per-game standings recompute) + the **60% All-Star lock**.

**Reused (do NOT rebuild):**
- the D9 merit engine wholesale — `scoreForCategory` (franchiseAwardsEngine.ts:242-256), the pure-WAR sort + tie-break (:321-325), `meetsQualifier` PA/IP floor (:258-272), `marginToWinner` on every candidate (:347), the GG `goldGloveSplit` (:350-357), and the dormant nullable `voteWeight` (storage.ts:47).
- the **L6 dark fame substrate** — `resolveFameTier` (fameModel.ts:191), `updateReachFloor` (:176), `aggregateDefensiveFame` (:272), `FAME_TUNING` decay/WAR-gravity (:91-137), `FranchiseFameRecordRow` (franchiseFameRecordsStorage.ts:16-24), and the dark per-game writer `persistDarkFameRecordsForCompletedGame` (franchiseFameCompute.ts:73).
- the **TV substrate** — `franchiseTrueValueSnapshots` (per-checkpoint time-series, snapshotsStorage.ts:17-24) + its reader (:141-162), and `franchiseTrueValueRows.valueDelta` (cumulative, storage.ts:41); both already wired into the live pipeline (processCompletedGame.ts:609, ungated).
- the **16-emblem `awardEmblems` system** (engines/awardEmblems.ts:12-17) — all 4 new + 2 deferred categories are already mapped; no emblem work.
- the **emission bus** — `shouldEmitSeasonNews`/`generateSeasonNewsTake` (seasonNewsGenerator.ts:135/147), `SeasonEmissionConfig` with `raceTopN` already present (reporter.ts:148-155; default `raceTopN:3, marqueeOnly:true` at seasonEmissionConfigStorage.ts:9-16), the `seasonNewsItems` store + its backup/sync (already registered).
- the **L10/L11 reporter-adapter template** (`franchiseL11ManagerChangeNewsAdapter.ts`, `franchiseL10NewsAdapter.ts`).
- the **L11 flag block** (franchisePhase2Flags.ts:73-83) + the **processCompletedGame dark-gate pattern** (:613-654) + the **ledger-PIN test** (src/utils/tests/franchiseSeasonLedgerStorage.test.ts).

**⚠ BOUNDARIES (do NOT re-open):**
- **§20.4 STATUS-FAME LAYER is L6's, NOT L12's [Q8].** The `status` channel slot exists in the union (fameModel.ts:23) but is **fed by nothing** — `channelForFameEventType` only ever returns `defensive`/`role_player`/`iconic_event` (franchiseFameCompute.ts:178-181, VERIFIED). L12 only **consumes the resolved tier**; it must not add any status-channel feeder.
- **Manager-of-the-Year is D9, NOT L12.** L12 carries no manager award.
- **Channel A (fame → fan-morale §20.6) is OUT [Q11].** L12 reads fame for *standings* only.
- **The fame double-ladder live purge is DEFERRED [Q10].** L12's ONLY hard fame requirement: every race/fame-tier read goes through **`resolveFameTier`** (fameModel.ts:191), NEVER the scalar **`getFameTier`** (fameEngine.ts:349, which still carries the forbidden labels `'Fan Favorite'` at :359 and `'Villain'` at :363). The label-purge of `getFameTier` is a **separate pre-L12 cleanup** ruled DEFER-to-post-D13. **No standalone fame-ladder work in L12.**

---

## 2. v1 MECHANIC (FRANCHISE_V1_LIVING_SEASON_SPEC.md §20 fame / §21 race / §23 TV-family; magnitudes SIM-tuned)

**The race primitive.** A *race* is a ranked competition for an honor. Today there is no race
primitive in code at all (grep `raceStanding`/`computeRace`/`standingsComposite` = empty) — the only
honors computation is the D9 award sort fired **once at season-end** from a `FranchiseHome` useEffect
(FranchiseHome.tsx:3303-3322, `isSeasonOver`), not on the per-game spine.

1. **The weighted-composite standing [Q2].** Race standing = a **SINGLE weighted composite**
   `score = w_merit·WAR + w_fame·fame`, **bands by score-gap clustering**, BUT weights **vary per race
   type**: **fame-LED** for fan-vote races (All-Star starters); **merit-DOMINANT** with fame bounded to
   a small close-race nudge for merit awards (preserves RACE-4). Weights = §16 sim-tune. The merit half
   reuses the per-category WAR selector (`scoreForCategory` eng:242-256); the fame half reads
   `resolveFameTier` rank / `row.heat` (NOT the `getFameTier` label). The **Q3** fame tilt fires only
   when `|marginToWinner| < window` AND both players' merit > floor (window/magnitude/floor = sim
   placeholders) — `marginToWinner` (eng:347) is the exact `|margin|` input.

2. **The All-Star fan-vote + reserve roster [Q5].** A **by-position template** mirroring the archived
   screen (`src/archived-components/awards/AllStarScreen.tsx`, positionOrder C..RF,DH,SP,RP; starter/reserve
   split; +3/+2 fame): **1 fan-voted starter per position** (fame-LED standing) + a **pitching contingent**
   + a **merit-reserve block** (WAR-ranked). Performance floor **reuses** the existing
   `minPlateAppearances`/`minInningsPitched` qualifier (`meetsQualifier` eng:258-272). The flag-off live
   UI scaffold already exists (FranchiseHome.tsx:1483-1722, gated `MODE_2_V1_ALL_STAR_UI_ENABLED=false`)
   with empty stub feeders (`getBenchPlayers`/`getStartingPitchers`/`getReliefPitchers` returning `[]`).

3. **The merit award races.** MVP/CY/SS/GG/RoY already compute (D9, live). L12 adds the new race
   slots and the per-game standing on top; **awards keep the existing pure-WAR sort** (RACE-4), and the
   already-ruled merit basis stands: **MVP=totalWAR / CY=pWAR / SS=batWAR / GG=fWAR / RoY=totalWAR+rookie**.
   GG additionally gets the **Q4** defensive-channel-fame share on top of its `goldGloveSplit` base.

4. **The TV-family (KK / Bust / Comeback) [Q7].** TV is OUT of merit awards — it powers ONLY these three.
   **KK** = league-wide `valueDelta` rank (cumulative `franchiseTrueValueRows.valueDelta`, signed,
   `valueDelta = trueValue − salary` at salaryCalculator.ts:1018; positive = undervalued). **Bust** = same
   basis **inverted**. **Comeback** = `currentTV − seasonLow` where currentTV = the player's CURRENT cumulative
   `trueValue` and seasonLow = `min(currentTV, that player's snapshot trueValues)` (**JK ruling 2026-06-19**: the gap AS OF
   NOW, NOT a max-rise-over-checkpoints — a mid-season peak the player later gives back must NOT win). The season-low /
   trough derivation **exists nowhere** and is the new build §23 calls for. Basis stable.

5. **Emission [Q6].** **MVP + Cy Young + All-Star EMIT fame/morale**; all other races are **visibility-only**
   at launch. Top-N depth = sim (the `raceTopN` config field already exists). The emission gate
   (`shouldEmitSeasonNews`) is reused; L12 sets `perEventRate` for the marquee event types > 0 and leaves
   the rest at 0 under `marqueeOnly:true`.

---

## 3. RECOMMENDED SPLIT (risk-ascending)

- **L12-1 — dark landing infra (flag + category widening + store).** Clone the L11 flag block
  (franchisePhase2Flags.ts:73-83) → `isFranchisePhase2L12Enabled` (default OFF). Widen the
  `FranchiseAwardCategory` Extract<> (franchiseAwardsStorage.ts:16-27) with **ALL_STAR / BENCH_PLAYER /
  BOOGER_GLOVE / RELIEVER_OF_YEAR** (Q1; DEFER PLATINUM_GLOVE + WORLD_SERIES_MVP) — **type-only, no DB
  bump** for the single-winner slots (category is a composite-key field of the existing `franchiseAwardsRows`
  store). **HARD COMPILE COUPLING:** `AWARD_FULL_LABELS` at src/src_figma/app/components/AwardsWatchlist.tsx:26 is
  `Record<FranchiseAwardCategory, string>` (exhaustive) — the build breaks until all 4 keys are added there
  too; **grep for every `Record<FranchiseAwardCategory, …>` before widening.** Create the **All-Star
  multi-selection roster store** (FranchiseAwardRow can't hold a 12+-player roster) → **TRACKER_DB_VERSION
  23→24** + the **C-4 backup DoD** (backupRestore trackerStores entry + `KBL_BACKUP_VERSION` bump at :64 +
  `STATIC_DATABASE_SCHEMAS['kbl-tracker'].version` at :353 + round-trip test) + the **ledger store-list PIN**
  (alpha-insert into `expectedTrackerStores` + both `toBe(23)→24` at :276/:296 + a v23→v24 migration test).
  Add the empty gated `persistDarkL12…ForCompletedGame` branch after processCompletedGame.ts:654.
  **Risk: medium** (touches the pinned test — the L6b-1 dispatch-breaker; the PIN MUST be in-ticket).
  **Mirror obligations:** flag clone, trackerDb v-bump + onupgradeneeded block, ledger PIN, backup, sync, gate branch.

- **L12-2 — TV-family scorers (KK + Bust + Comeback).** Pure engines over **already-live** substrate.
  KK/Bust = rank over `getFranchiseTrueValueRows(scope).valueDelta` (no new store, no DB/ledger bump,
  visibility-only per Q6). Comeback = `currentTV − seasonLow` (currentTV from the cumulative `values` row; seasonLow =
  `min(currentTV, the player's snapshot trueValues)`; **JK 2026-06-19 — the CURRENT gap, NOT max-rise**), rank desc. The
  three TV-family categories are **already** persistable
  (storage.ts:24-26) and emblem-mapped — **zero ledger cost**. **Risk: low.**
  **Mirror obligations:** none new (rides the L12-1 flag + gate).

- **L12-3 — race-standing composite + bands + Q3 tilt + Q4 GG share.** The genuinely-new design logic:
  the per-race-type weighted composite (`scoreForCategory` WAR × w_merit + `resolveFameTier`-derived fame ×
  w_fame), score-gap clustering bands, the `|marginToWinner| < window` conditional tilt, and the GoldGlove
  fWAR + 20%·defensive-channel-fame consumer (reads `aggregateDefensiveFame` / `row.defensiveFame`). All
  reads route through `resolveFameTier` (Q10). **Risk: medium-high** (new math; consumes verified seams; gated).
  **Mirror obligations:** none new; must add a grep/lint guard proving no `getFameTier` import.

- **L12-4 — All-Star roster builder + 60% lock.** The greenfield by-position selection engine (qualified-
  player floor reuse + fame-led starter pick + merit-reserve fill + pitching contingent), persisting into the
  L12-1 roster store. Plus the **60% All-Star lock** checkpoint (override of 50%, configurable, lock-once-and-
  freeze) — the existing 20%-grid `isCheckpointBoundary` (franchiseCheckpointSweepCompute.ts:106-114) only
  yields 20/40/60/80/100% and re-fires every boundary, so a configurable fraction + a persisted "locked"
  flag is greenfield. **Risk: high** (multi-selection persistence + new lock semantics).
  **Mirror obligations:** if the roster needs a 2nd store, a 2nd v-bump + ledger PIN pass (the "TWO ledger bumps").

- **L12-5 — emission (SEA-2) + L3 race-snub row + honor→Reach-floor + reporter tap.** Set `perEventRate`
  so MVP/CY/All-Star emit and the rest stay visibility-only (Q6); Top-N selection reads the existing
  `raceTopN`. Fill `MORALE_TAP_REGISTRY.race` with the negative snub resolver (personality scaling is
  automatic via `composeMoraleConsequence`). Map honor → heat → `updateReachFloor` on a WIN (Q9). Build the
  pure race-resolution → `SeasonNewsEvent` adapter mirroring `franchiseL11ManagerChangeNewsAdapter.ts`. If a
  new `NarrativeEventType` is added, it MUST get a matching `hedgingModifier` entry (narrativeEngine.ts:590-603,
  exhaustive Record — the L10/L11 precedent). **Risk: medium** (touches the exhaustive Record + the live morale tap).
  **Mirror obligations:** the new `NarrativeEventType` ↔ `hedgingModifier` pairing.

- **L12-6 — Almanac / UI surfacing (last).** Add the 4 new categories to `AWARD_ORDER` (src/src_figma/app/components/AwardsWatchlist.tsx:17)
  and the TV-family three (currently labelled but omitted from `AWARD_ORDER`), feed the flag-off All-Star UI
  (FranchiseHome.tsx:1483-1722) from the real builder, surface standings/bands. Extends existing surfaces; does
  not build new ones. **Risk: low-med.** **Mirror obligations:** none new.

---

## 4. FORKS — ✅ RULED (this is the decision record, not open questions)

> **JK RULINGS (2026-06-18/19 L11–L14 ruling pass + the 2026-06-19 L12-Q10 entry).** Embedded below as the
> citation map. Magnitudes (window/floor/share/weights/Top-N depth) are §16 sim placeholders throughout.

- **Q1 — RULED.** Extend `FranchiseAwardCategory` (storage.ts:16-27) with **ALL_STAR / BENCH_PLAYER /
  BOOGER_GLOVE / RELIEVER_OF_YEAR** NOW; **All-Star = a MULTI-SELECTION ROSTER RECORD**, not a single-winner
  row. **DEFER PLATINUM_GLOVE + WORLD_SERIES_MVP.** Accepts **TWO ledger bumps** (the C-4 backup DoD + the
  `src/utils/tests/franchiseSeasonLedgerStorage.test.ts` store-list PIN, **in-ticket EACH time** a store is added). All 6
  candidate categories are already in `AwardType` (awardEmblems.ts:12-17), so the type widening is additive.

- **Q2 — RULED (structural form).** Race standing = a **SINGLE weighted composite** (w_merit·WAR + w_fame·fame),
  banded by score-gap clustering, weights **per race type** (fame-LED fan-vote / merit-dominant + bounded fame
  nudge merit). Weights = sim-tune. Awards keep the pure-WAR sort (RACE-4 preserved).

- **Q3 — RULED (structural form).** Fame tilts only when `|margin| < window` AND both players' merit > floor.
  window/magnitude/floor = sim placeholders. Consumes `marginToWinner` (eng:347).

- **Q4 — RULED (structural form).** GoldGlove = fWAR + share·**defensive-CHANNEL fame** (NOT total fame);
  seed share **20%** (sim). Reads `aggregateDefensiveFame` (fameModel.ts:272) / `row.defensiveFame`
  (franchiseFameRecordsStorage.ts:23), built on the existing `goldGloveSplit` base.

- **Q5 — RULED.** All-Star roster = by-position template (1 fan-voted starter/position + pitching contingent +
  merit-reserve block) mirroring the archived screen; performance floor reuses `minPlateAppearances`/`minInningsPitched`.

- **Q6 — RULED.** MVP + Cy Young + All-Star EMIT fame/morale; all other races visibility-only at launch.
  Top-N depth = sim (`raceTopN` field exists).

- **Q7 — RULED** (Comeback formula CLARIFIED by JK 2026-06-19). TV-family: KK = league-wide `valueDelta` rank; Bust = same
  inverted; **Comeback = `currentTV − seasonLow`** (currentTV = current cumulative `trueValue`; seasonLow = min over the
  player's snapshots incl. current) — the CURRENT gap from the season trough, NOT the max-rise-at-any-checkpoint (a
  mid-season peak later given back must NOT win). Basis stable.

- **Q8 — RULED.** §20.4 status-fame layer is **L6's** (draft seed/call-up/send-down/bench 0.5x/league-leader).
  L12 ONLY consumes the resolved tier. **Code already matches** (status channel fed-by-nothing). NOT L12 scope.

- **Q9 — RULED (structural form).** honor → Reach-floor map (bigger honor → higher permanent floor via the built
  `updateReachFloor`) + snub morale hit personality-scaled through a **NEW L3 race-snub matrix row**
  (`MORALE_TAP_REGISTRY.race`, currently no-op). Magnitudes defer.

- **Q10 — RULED (2026-06-19).** Every race/fame-tier read goes through **`resolveFameTier`**, NEVER the scalar
  **`getFameTier`**. The live `getFameTier` label-purge is a **separate pre-L12 cleanup, DEFERRED to post-D13
  activation.** **No standalone fame-ladder work in L12.**

- **Q11 — RULED.** Channel A (fame → fan-morale §20.6) stays OUT of L12.

- **Q12 — RULED.** Heat `decayPerUpdate` (fameModel.ts:94 = 0.85) + WAR-floor gravity strength (:111 = 0.2) are
  §16 sim placeholders; L12 **consumes live config**, never re-tunes.

- **Q13 — RULED.** All-Star race runs opening-day → the **60% scheduled-games checkpoint and LOCKS there**
  (override of 50%, configurable); award races run all season + finalize at season end; standings recompute
  per completed game off the existing spine.

**ALREADY-RULED (do NOT re-open):** merit basis MVP=totalWAR / CY=pWAR / SS=batWAR / GG=fWAR / RoY (live);
TV out of merit awards; ratings never gate/tilt awards; award rewards = fame+morale+badge only; ceremony at
season-end; the whole §20 fame ladder is built dark in `fameModel.ts` + `franchiseFameCompute.ts`; award/race
badges ride the 16-emblem `awardEmblems` system.

### Genuinely-still-open micro-forks (AUTH-4 defaults taken)

- **All-Star persistence shape:** **extend `FranchiseAwardRow` with an `allStarRoster[]` payload on the
  ALL_STAR category row (option A, no store add)** vs **a dedicated `franchiseAllStarRosters` store (option B,
  v-bump + ledger PIN + backup DoD)**. Q1's explicit "accepts TWO ledger bumps" strongly implies **option B / a
  separate store**. *(Default: a dedicated store — the cleaner shape, and Q1 budgeted the ledger cost.)*
- **Race-standings persistence:** does the per-game composite standing **persist** as a snapshot store (a 2nd
  new store → the 2nd of the two ledger bumps → v25) or is it **recompute-only**? *(Default: recompute-only at
  launch unless the Almanac needs standings history; if the "TWO ledger bumps" = All-Star store + race-standings
  store, then a 2nd store lands.)*
- **`NarrativeEventType` for award/race emission:** reuse `PLAYOFF_RACE` (narrativeEngine.ts:85) vs add a new
  `AWARD_RESULT`/`RACE_RESULT` member (which forces a new `hedgingModifier` Record entry). *(Default: add a new
  member, matching the L10/L11 precedent.)*
- **`ALL_STAR` category-vs-storage:** if All-Star lives in its own roster store, `ALL_STAR` is a
  `FranchiseAwardCategory` member that never appears as a `franchiseAwardsRows.category` — confirm whether it
  should be in the award-row union at all or use a separate roster type. *(Default: keep it in the union for the
  badge/emblem ride, route the data to the roster store.)*
- **RELIEVER_OF_YEAR / BENCH_PLAYER / BOOGER_GLOVE merit bases:** undefined in the live `scoreForCategory` switch.
  Likely RELIEVER_OF_YEAR = relief-WAR/leverage off the existing `pitchingWar` selector; BOOGER_GLOVE = inverse-fWar;
  BENCH_PLAYER = reserve-block. *(Default: needs an explicit basis ruling per category — NOT in the already-ruled list.)*

---

## 5. SEAMS + FILE:LINE ANCHORS (✅ = verified on codex/franchise-v1-next)

**D9 merit-award engine (reuse wholesale) — `src/utils/` NOT `src/engines/`:**
- merit basis selector `scoreForCategory` `franchiseAwardsEngine.ts:242-256` ✅ (MVP/RoY=totalWar, CY=pitchingWar, GG=fieldingWar, SS=battingWar).
- pure-WAR sort + tie-break `franchiseAwardsEngine.ts:321-325` ✅ (the RACE-4 ordering awards preserve).
- `meetsQualifier` PA/IP floor `franchiseAwardsEngine.ts:258-272` ✅ (Q5 All-Star floor reuse); thresholds `awardQualifierThresholds` (franchiseAwardTrust.ts:14-21, PA=502/IP=162 baselines, season-scaled).
- `marginToWinner = rounded(score − winnerScore)` `franchiseAwardsEngine.ts:347` ✅ (the Q3 tilt input; also computed at :480 for the MOY path).
- GG `goldGloveSplit` `franchiseAwardsEngine.ts:350-357` ✅ (fWar=fieldingWar, totalWar=preview; the Q4 base).
- live finalize caller `computeAndPersistFranchiseWarAwards` (FranchiseHome.tsx:3303-3322, `isSeasonOver` useEffect; :3346 `checkSeasonComplete`) ✅ — **season-end-only, NOT a per-game spine.**

**Award storage (Q1 extension point):**
- `FranchiseAwardCategory` Extract<> `franchiseAwardsStorage.ts:16-27` ✅ (9 live members; the 4 targets MISSING from the union but PRESENT in `AwardType`).
- **TWO DISTINCT award-category types (a SECOND compile coupling):** the merit selector `scoreForCategory` switches on a SEPARATE 5-member `FranchiseWarAwardCategory` `Extract<>` `franchiseAwardsEngine.ts:38-41` ✅ (= MVP/CY/RoY/GG/SS), **exhaustive with no `default`** (:245-255) — NOT the 9-member storage `FranchiseAwardCategory`. ⇒ widening the STORAGE union for ALL_STAR/BENCH_PLAYER/BOOGER_GLOVE/RELIEVER_OF_YEAR does NOT touch this switch, but giving any new MERIT category (e.g. RELIEVER_OF_YEAR) a WAR basis means extending `FranchiseWarAwardCategory` (:38) **and** the exhaustive switch — a second hard compile break to expect.
- `FranchiseAwardRow` single-winner shape `franchiseAwardsStorage.ts:40-50` ✅ (`winnerPlayerId` + `candidates[]`; cannot hold a by-position roster).
- nullable `voteWeight` `franchiseAwardsStorage.ts:47` ✅ — **write-null-only** (eng:358, :486; NO read site, VERIFIED). Dormant; fan-vote races are first consumer.
- `franchiseAwardsRows` store `trackerDb.ts:360-367` ✅ (keyPath `[franchiseId,seasonId,statsScopeId,category]` + `by_scope`); backup `backupRestore.ts:339-343` ✅, sync `syncConfig.ts:14` ✅.
- **HARD COMPILE COUPLING:** `AWARD_FULL_LABELS = Record<FranchiseAwardCategory,string>` `src/src_figma/app/components/AwardsWatchlist.tsx:26` ✅ (exhaustive — breaks build until all 4 keys added); `AWARD_ORDER` `src/src_figma/app/components/AwardsWatchlist.tsx:17` ✅ (omits the TV-family three today, so they never render).

**Emblems (free ride):**
- `AwardType` 16-member union `awardEmblems.ts:12-17` ✅ — ALL_STAR/BENCH_PLAYER/BOOGER_GLOVE/RELIEVER_OF_YEAR + the 2 deferred all present; `AWARD_EMBLEMS`/`AWARD_SHORT_LABELS`/`AWARD_PRIORITY` :34-94. KK/CB/BUST emblems `:44-47`.

**L6 dark fame substrate (read surface — L12 is its FIRST live consumer):**
- `resolveFameTier(heat, reachFloor, config) → FameTier` `fameModel.ts:191` ✅ — **ZERO live importers** (grep non-test = empty, VERIFIED). The ONLY sanctioned tier read (Q10).
- forbidden scalar `getFameTier` `fameEngine.ts:349` ✅ with labels `'Fan Favorite'` :359, `'Villain'` :363. **L12 must NOT call it.** Live call site `fameIntegration.ts:556`; re-export chain `fameIntegration.ts:23/57`, `app/engines/index.ts:67`, `useFameTracking.ts:22/316/335`, `engines/index.ts:440` (imports/re-exports, one true call site).
- `updateReachFloor` `fameModel.ts:176-189` ✅ (Q9 honor→floor ratchet; live caller franchiseFameCompute.ts:102).
- `aggregateDefensiveFame` `fameModel.ts:272` ✅ (Q4 defensive-channel read; persisted as `row.defensiveFame` franchiseFameRecordsStorage.ts:23, produced at franchiseFameCompute.ts:115).
- `FAME_TUNING` decay `fameModel.ts:94` (0.85) + warGravity `:111` (0.2) ✅ (Q12 live config).
- `FranchiseFameRecordRow` `franchiseFameRecordsStorage.ts:16-24` ✅ (heat/reachFloor/byChannel/defensiveFame read surface).
- dark writer `persistDarkFameRecordsForCompletedGame` `franchiseFameCompute.ts:73` (gated `isFranchisePhase2FameEnabled` :78) ✅.
- **`status` channel fed-by-nothing (confirms Q8):** slot in union `fameModel.ts:23`; `channelForFameEventType` returns only defensive/role_player/iconic_event `franchiseFameCompute.ts:178-181` ✅ (no `status` literal, VERIFIED).
- D9 engine reads NO fame (grep `fame`/`resolveFameTier`/`getFameTier` in franchiseAwardsEngine.ts = 0) ✅.

**TV-family substrate (half-built, live-feeding):**
- snapshot store `franchiseTrueValueSnapshots` row `franchiseTrueValueSnapshotsStorage.ts:17-24` ✅ (checkpoint :19, trueValue :20, valueDelta :21 — the Comeback trough source).
- snapshot reader `getFranchiseTrueValueSnapshotRowsByScope` `franchiseTrueValueSnapshotsStorage.ts:141-162` ✅ (sorted by checkpoint :156-161).
- snapshot writer wired **UNGATED** at `processCompletedGame.ts:609` ✅ (inside `if(trueValueScope)` block opening :607, *before* the `isFranchisePhase2FameEnabled` gate at :612 — VERIFIED).
- cumulative `franchiseTrueValueRows.valueDelta` (signed) `franchiseTrueValueStorage.ts:41` ✅ (KK/Bust pool); `valueDelta = trueValue − salary` `salaryCalculator.ts:1018` ✅.
- TV-family categories already persistable `franchiseAwardsStorage.ts:24-26` ✅; store mirror-wired (trackerDb v18 `:370`, sync `syncConfig.ts:20`, backup `backupRestore.ts:344-348`, ledger PIN `src/utils/tests/franchiseSeasonLedgerStorage.test.ts:46`) ✅ — **no ledger cost for the TV-family scorers.**
- **Comeback running-season-low derivation: MISSING** (grep season-low for TV = 0; only an unrelated `fanMoraleEngine` seasonLow) — greenfield.
- TV-family scorers: **MISSING** (grep KK/Comeback/Bust in the engine = 0, VERIFIED).

**Emission bus + reporter (reuse):**
- `shouldEmitSeasonNews` `seasonNewsGenerator.ts:135` ✅ (perEventRate gate; orphaned-pending, no live production caller); `generateSeasonNewsTake` :147.
- `SeasonNewsEvent` adapter contract `seasonNewsGenerator.ts:11-19` ✅ (id/createdAt minted downstream).
- `SeasonEmissionConfig` with `raceTopN` `reporter.ts:152` ✅; default `{marqueeOnly:true, perEventRate:{}, raceTopN:3}` `seasonEmissionConfigStorage.ts:9-16` ✅.
- `seasonNewsItems` store `trackerDb.ts:334-341`; persist/list `seasonNewsStorage.ts:39/65/92`; backup `backupRestore.ts:328/335`, sync `syncConfig.ts:45/47` ✅.
- reporter-adapter template `franchiseL11ManagerChangeNewsAdapter.ts` (3731 B, Jun 19) + `franchiseL10NewsAdapter.ts` ✅; adapter test mirror `src/src_figma/__tests__/reporter/`.
- `hedgingModifier` exhaustive `Record<NarrativeEventType,number>` `narrativeEngine.ts:590-603` ✅; `PLAYOFF_RACE` union member :85 + Record :598; NO `AWARD_RESULT`/`RACE_RESULT` member — a new one forces a Record entry (the L10/L11 precedent at :601-602).

**L3 morale matrix (Q9 snub seam):**
- `MoraleMatrixTapKind` includes `'race'` `masterMoraleMatrix.ts:71` ✅; `MORALE_TAP_REGISTRY.race: () => NEUTRAL_BASE_CONSEQUENCE` `masterMoraleMatrix.ts:401` ✅ — **live no-op placeholder, L12 fills it.**
- `composeMoraleConsequence` (personality scaling, routes `kind!=='event'` through the tap) :413-487.
- existing positive precedent `ALL_STAR_SELECTION` row :324-326 (the snub is the new negative counterpart).

**Dark-build mirror (clone L11):**
- flag block `franchisePhase2Flags.ts:73-83` ✅ (default false + override + getter + test-setter).
- gate stack `processCompletedGame.ts:613-654` ✅ — **6 dark branches** (Fame :613, Flashpoint :620, Checkpoint :627, Traits :634, L10 :641, L11 :648), last is L11 whose **branch if-block closes at :654** (VERIFIED — brace at :654); L12 inserts the 8th branch **after :654, before the un-gated designation `try` block that opens at :655** (NOT "after :648" — that lands mid-L11-block). Flag imports :58-64. (Plus the separate Morale early-return at :379 = the 7th flag guard overall.)
- `TRACKER_DB_VERSION = 23` `trackerDb.ts:17` ✅; most-recent store-add pattern (franchiseL10Overlays) `trackerDb.ts:430-440`.
- **ledger PIN** `src/utils/tests/franchiseSeasonLedgerStorage.test.ts` ✅ — `expectedTrackerStores` array `:28` (pins `franchiseAwardsRows` :36, `franchiseTrueValueSnapshots` :46), `toBe(23)` at **:276 AND :296** (both must bump), array compared :279/:297. **The L6b-1 dispatch-breaker — must be in-ticket per store add.**
- `KBL_BACKUP_VERSION` `backupRestore.ts:64` (=2) + `STATIC_DATABASE_SCHEMAS['kbl-tracker'].version` `:353` (must equal TRACKER_DB_VERSION — easy to miss).
- awards trackerDb-only enforcement test `franchiseAwardsStorage.test.ts:133-138` (getTrackerDb-only; does NOT pin the store-list — only the ledger test traps a missing PIN).

**All-Star roster scaffold (reuse for shape; greenfield logic):**
- archived `AllStarScreen.tsx:46-58` ✅ (by-position template; NOT routed/imported — reference only).
- flag-off live UI `FranchiseHome.tsx:1483-1722` (gated `MODE_2_V1_ALL_STAR_UI_ENABLED=false` :181); stub feeders `getBenchPlayers` :609, `getStartingPitchers`/`getReliefPitchers` :610-611 (all `=> []`).
- career `allStarSelections` counter `careerStorage.ts:72` (fed into HOF/milestone/fame) — **write path MISSING** (grep found reads/inits only; read input `seasonEndProcessor.ts:95` — **UNVERIFIED that any live site increments it**; the nod→counter write is itself greenfield).
- 60% All-Star break `calendarEngine.ts:108-112` (`allStarGame = round(totalGames*0.6)`, `gameThreshold:0.6`).
- `Position` enum with combo roles `game.ts:9` (OF/IF/SP/RP/IF/OF/1B/OF — normalization rule for combo positions is greenfield).

**Cadence helpers (reuse):**
- `isCheckpointBoundary` 20%-grid `franchiseCheckpointSweepCompute.ts:106-114` ✅ — yields 20/40/60/80/100% only (hardcoded `*5`); **a configurable 60% + lock-once needs a new helper.**
- cadence denominator `totalGames` read `franchiseCheckpointSweepCompute.ts:220`; gameNumber resolver `resolveCheckpointGameNumber` `:286-303`; `getSeasonMetadata` already imported into processCompletedGame.ts:36.

**UNVERIFIED / MISSING (called out, not papered over):**
- race-standing input spine: **MISSING** (grep `raceStanding`/`computeRace`/`standingInput` = 0). Wholly greenfield.
- `allStarSelections` increment write-path: **UNVERIFIED** — no live writer found (only reads/inits/fixtures).
- whether v1 teams carry populated Eastern/Western conference data (`franchise.ts:138 conferences:N`): **UNVERIFIED** — builder must decide single-pool vs two-league.
- `checkpoint` is `string | number` (gameId-string fallback at processCompletedGame.ts:294-305) — a non-scheduled game sorts lexically out of true order; flag for the Comeback trough walk.

---

## 6. TRIGGER / CADENCE MODEL

**Two distinct cadences, both doubly-dark (L12 flag + the substrate flags they read).**

```
Per completed game (NEW 8th gate branch, after processCompletedGame.ts:654, inside if(trueValueScope)):
  if (isFranchisePhase2L12Enabled()) {
    persistDarkL12StandingsForCompletedGame(gameState, trueValueScope, archiveOptions)
      1. recompute every race's standing off the existing TrueValue→WAR→fame spine (Q13):
           - award races (MVP/CY/SS/GG/RoY + BENCH/BOOGER/RELIEVER): composite, all season
           - TV-family (KK/Bust/Comeback): single-signal rank over live TV rows/snapshots
           - All-Star: fame-led starter standing + merit reserves
      2. All-Star LOCK: when the completed game crosses the 60% scheduled-games checkpoint
           (override of 50%, configurable) → freeze the roster, set a persisted "locked" flag,
           skip All-Star recompute thereafter. (60% via a NEW configurable-fraction helper.)
      3. emission gating (Q6): compute ALL standings (cheap visibility) but EMIT fame/morale
           only for MVP + Cy Young + All-Star (perEventRate>0); everything else visibility-only.
  }

Season end (existing FranchiseHome.tsx:3303-3322 isSeasonOver effect):
  - award races FINALIZE (the pure-WAR sort persists; the composite is the live race view).
  - ceremony fires; honors emit fame/morale + ride awardEmblems.
  - honor → updateReachFloor ratchet (Q9); snub → L3 race-snub morale row.
```

- **Standings recompute is per-completed-game** off the existing spine — the snapshot/TV/fame writers already run there (processCompletedGame.ts:609/612), so the L12 branch is the next sibling.
- **All-Star locks at 60%** [Q13] (override of 50%, configurable) and freezes; award races run all season and finalize at season end.
- **Only MVP/CY/All-Star emit** [Q6]; the rest are visibility-only standings reads. The emission gate (`shouldEmitSeasonNews`) defaults to nothing (marqueeOnly:true + empty perEventRate), so L12 explicitly turns on the three marquee event types.
- **Doubly-dark gating:** the L12 flag defaults OFF; fame reads go through the L6 dark substrate (also flag-gated). No L12 consumer goes live until **post-D13 activation**.

---

## 7. OPEN QUESTIONS FOR JK (most are RULED — these are the genuine remaining unknowns)

> **Q1–Q13 are all RULED** (see §4 + DECISIONS_LOG "L11–L14 ruling pass" + the 2026-06-19 L12-Q10 entry).
> The below are the residual micro-forks and the sim-magnitude placeholders only.

1. **All-Star persistence shape (option A vs B).** Extend `FranchiseAwardRow` with an `allStarRoster[]`
   payload on the ALL_STAR row (no store add) **vs** a dedicated `franchiseAllStarRosters` store (v23→24 +
   ledger PIN + backup DoD). Q1's "accepts TWO ledger bumps" reads as **a dedicated store** — confirm.
2. **Does the per-game race standing PERSIST** (a 2nd store → the 2nd ledger bump → v25) **or is it
   recompute-only**? This determines whether the "TWO ledger bumps" = (All-Star store) + (race-standings store).
3. **Merit bases for RELIEVER_OF_YEAR / BENCH_PLAYER / BOOGER_GLOVE** — undefined in the live switch and NOT in
   the already-ruled basis list. Likely relief-WAR/leverage, reserve-block, inverse-fWar respectively. Needs a basis ruling.
   *(Any WAR-based merit category must ALSO be added to the 5-member `FranchiseWarAwardCategory` + the exhaustive
   `scoreForCategory` switch — `franchiseAwardsEngine.ts:38-41` / `:245-255` — a compile coupling beyond the storage union.)*
4. **`NarrativeEventType` for award/race emission** — reuse `PLAYOFF_RACE` vs add a new member (forces a
   `hedgingModifier` Record entry). Default: add a new member.
5. **All-Star roster-size constants + DH inclusion + single-pool vs Eastern/Western** — undefined anywhere; the
   archived template includes DH but the field layout omits it; v1 conference data population is UNVERIFIED. Sim/spec-gap.
6. **The fan-vote source for All-Star starters** — `voteWeight` is the dormant seam, but the fan-vote derivation
   (presumably the fame-LED Q2 composite) needs an explicit pin.

**Sim-magnitude placeholders (§16, NOT rulings — L12 consumes live config):** the per-race-type weights
(w_merit/w_fame), the Q3 tilt window/magnitude/merit-floor, the Q4 defensive-fame share (seed 20%), the Top-N
emission depth (`raceTopN` default 3), the honor→Reach-floor and snub-morale magnitudes (Q9), and the 60% lock
fraction (Q13, configurable). All are sim-tuned, all defer.

---

## 8. BUILD-ORDER / DARK-BUILD CHECKLIST (footer)

```
L12-1 dark landing  →  L12-2 TV-family  →  L12-3 composite/bands/tilt/GG-share
                    →  L12-4 All-Star roster + 60% lock  →  L12-5 emission/snub/honor/reporter
                    →  L12-6 Almanac/UI surfacing

PER TICKET (dark-build mirror discipline):
□ Clone the L11 flag block (franchisePhase2Flags.ts:73-83) → isFranchisePhase2L12Enabled, default FALSE.
□ Widen FranchiseAwardCategory (+4 slots) AND fix the exhaustive AWARD_FULL_LABELS Record (src/src_figma/app/components/AwardsWatchlist.tsx:26)
    — grep every Record<FranchiseAwardCategory,…> first; type-only, no DB bump.
□ PER NEW STORE (All-Star roster; race-standings if persisted): TWO ledger bumps EACH —
    □ TRACKER_DB_VERSION 23→24 (→25 if 2 stores) at trackerDb.ts:17 + a guarded onupgradeneeded block.
    □ C-4 backup DoD: backupRestore trackerStores entry + KBL_BACKUP_VERSION (:64) + STATIC_DATABASE_SCHEMAS.version (:353) + round-trip test.
    □ Ledger store-list PIN: alpha-insert into expectedTrackerStores + BOTH toBe(23)→24 (:276,:296) + a v23→v24 migration test.  ← the L6b-1 dispatch-breaker.
    □ syncConfig keyPath entry.
□ Insert the 8th gate branch after processCompletedGame.ts:654 (per-game standings recompute), flag-gated + try/catch.
□ Every race/fame-tier read goes through resolveFameTier (fameModel.ts:191) — NEVER getFameTier (fameEngine.ts:349); add a grep/lint guard.
□ Any new NarrativeEventType ↔ a matching hedgingModifier Record entry (narrativeEngine.ts:590-603).
□ Builder ≠ auditor per ticket (the triangle). Contracts in PROMPT_CONTRACTS.md before handoff.
□ NO L12 consumer goes live — activate post-D13 only.
```

**Two highest-coupling sub-tickets to isolate:** the **award-category union widening** (the exhaustive
`AWARD_FULL_LABELS` Record will break the build) and the **All-Star multi-selection roster persistence**
(the only genuinely-new store + the ledger-PIN trap). Land the schema (L12-1) frozen first, before any
standings/All-Star compute.

---

**Document path:** `spec-docs/L12_SCOPE_MAP.md`. Written by the Captain after applying the recon's adversarial-critique corrections (5 fixes: the ledger-PIN test path → `src/utils/tests/`, the 8th-branch insertion line → after :654 (independently re-verified: the L11 if-block closes at :654, the designation try opens at :655), the `AwardsWatchlist.tsx` path → `src/src_figma/app/components/`, the `channelForFameEventType` cite → :178-181, and the second `FranchiseWarAwardCategory` compile coupling).

**Verification note:** every anchor in §5 was re-checked against live code on `codex/franchise-v1-next`. Confirmed corrections to the slice inputs: (1) the award engine/storage are in **`src/utils/`** not `src/engines/` (prompt was wrong); (2) there are **6 dark branches** (:613-648) not 7 — the 7th flag guard is the separate Morale early-return at :379, last dark branch is L11 at :648, L12 inserts after; (3) `resolveFameTier` has **zero live importers** (L12 is first consumer); (4) the `status` channel is **fed by nothing** (confirms Q8); (5) `voteWeight` is **write-null-only** with no read site; (6) `getFameTier`'s forbidden labels are at fameEngine.ts:359/:363. UNVERIFIED items explicitly flagged: the `allStarSelections` increment write-path (no live writer found), v1 conference-data population, and the absence of any race-standing spine.
