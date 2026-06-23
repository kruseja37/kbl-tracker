# STADIUM ANALYTICS & PARK RECORDS — V2 (living-season build spec)

> **Status:** DESIGN — decision-complete (attended JK session 2026-06-23). **Supersedes** `STADIUM_ANALYTICS_SPEC.md` (v1, Jan/Feb 2026) for everything below; v1's statistical park-FACTOR/park-adjusted-WAR model is **deferred to V8** and untouched here.
> **Purpose:** turn ballparks from a read-only inspector into a first-class **living-season participant** — every park record influences and is influenced by fame, morale, fan-morale, reporters, relationships, and the Almanac — by wiring **freebies that already exist**, not building new systems.
> **Companions:** `RATINGS_MEASUREMENT_WORKSHEET.md` (the batted-ball engine, producer-of-record) · `DECISIONS_LOG.md` 2026-06-23 (the rulings) · this doc replaces the stale spray/distance/WAR sections of v1.
> **Magnitudes:** every number marked **§16** is a sim-tune placeholder (shape locked, value tunable). The spec ships zero build-time questions.

---

## §0. Scope + anchor examples
**In v2:** the shared carry converter; the batted-ball convergence (geometry, not statistical factor); the **park-record catalog**; the records→living-season integration (fame / morale / fan-morale / reporter / Almanac / rivalry); the **per-stadium stat-display layer**; and the **fame-model prerequisite fix**.
**Deferred (V8 / v2.x):** statistical park FACTORS + park-adjusted WAR (the v1 §3/§6 home-road model — separately dark, gated on the V8 ruling); exit-velo records; cross-season "career here" scope; WAR-by-stadium splits.

**Anchor examples (the feel):**
- A RHB launches a 478-ft HR — farthest by a righty in this park. His **fame rises**, the home **fans buzz**, the **reporter** writes it, the **Almanac** logs it. Later someone hits 482: the old holder's **fame cools** (he's still a legend — his tier floor holds if he earned one), the new holder's rises, a **rivalry edge** forms between them, the reporter narrates the dethroning.
- A division foe keeps winning at your yard. They become a **home-park rival**: beating them at home thrills your fans (or losing stings) at **2×** a normal result.

---

## §1. PREREQUISITE — the fame-fluctuation fix (its own ticket; gates the record fame swap)
**Problem (verified):** the per-game fame writer ratchets the protection floor on *every* heat peak — `franchiseFameCompute.ts:109` `updateReachFloor(stored.reachFloor, heat)`. So once a player's heat touches a tier, `reachFloor` locks there forever ⇒ fame is effectively **upward-only for everyone**. That contradicts the design.
**Ruling (JK):** fame **fluctuates freely up and down across tiers**; the **only** thing that locks a protection floor is making an **all-star team or winning a major award at season-end**, which protects you at **`REGIONAL_STAR`** (the named tier, `fameModel.ts:10`, heat threshold 8). Otherwise your fame rides the wave.
**Fix (surgical):**
1. **Remove the per-game reachFloor ratchet** (`franchiseFameCompute.ts:109`) — heat fluctuates; the floor is not touched per game.
2. **Only the season-end honor path sets the floor** — the L12-5d honor→reach-floor path already exists; pin its floor to `REGIONAL_STAR` (all-star/major award ⇒ floor = regional-star; it does not climb above that with bigger honors in v1).
3. This is **separate from** the A1.2 WAR-floor *gravity* (the upward-only lift for genuine high-WAR players, which correctly does not drag down "darlings"). The honor floor is the only *hard* downward protection; general heat fluctuates around it.
**Why it gates records:** the polarity sign-law (§6) requires losing fame when overtaken on a positive record — impossible while fame is upward-only. **Build this first.** Build-care: verify how `reachFloor` is consumed (does it floor the effective tier?), the L-SIM `soul.*` fame invariants, and the characterized fame tests before changing; add an L-SIM invariant that a non-honored player's effective tier *can* fall.

---

## §2. The shared carry converter (one engine, two consumers)
A deterministic function **`ballLocation{x,y} + ParkDimensions → park-adjusted carry (feet)`**, **air-balls only**.
- Inputs: precise normalized x/y landing (`fieldLocation`/`SprayPoint`, `EnrichmentPanel.tsx:302`) + the park's wall distances (`getParkByName → ParkDimensions {lf/cf/rf + categorical wall}`, `parkLookup.ts`, 23 SMB4 parks).
- **HR distance is NEVER inferred** — it is **user-entered in feet** from the SMB console (`game.ts:242`); the converter infers carry for *every other* air ball. Blank/null HR feet ⇒ ineligible to set a distance record.
- Grounders/pops ⇒ no carry (x/y is the first infield bounce, not distance) ⇒ 0 power, no distance record.
- **Replace** the orphaned random `estimateDistance`/`estimateAngle`/`createStadiumBattedBallEvent` (`fieldZones.ts:735-809`) — they use `Math.random` + schematic coords. Do not reuse.
- Placement: `src/engines/` so BOTH the ratings batted-ball engine (Power = carry × exit-velo) and the stadium records read it.
- **Build-confirm (from the worksheet §7):** tighten the spray tap instruction to *"where it FIRST hit the ground/wall"* (else an OF-fielded grounder reads as a liner and corrupts carry); confirm the live UI populates x/y (not only a coarse zone).

## §3. Batted-ball convergence — geometry ≠ factor (supersedes v1 §4 framing)
- The ratings batted-ball engine is the **producer-of-record**: it characterizes every ball in play as exit-velo (contactType tier), launch (out-code / first-landing), and carry (§2). Stadium analytics is the **same ball viewed from the park side** — one characterization, two consumers.
- **STALE in v1, corrected here:** the 7-zone angular spray model (real capture is **precise x/y**); the `exitVelocity?/launchAngle?/avgDistance?` "optional if tracked" framing (these are now **derived** — tier/class, not mph/degrees); the §6.1 "park-adjusted WAR now fully implemented" claim (it is **dark** — both `calculateBWAR` callers omit the park arg).
- **Geometry vs Factor (keep separate forever):** park **GEOMETRY** = wall distances → carry, what Power + distance records need (data built, converter is §2). Park **FACTOR** = home/road statistical multiplier → WAR adjustment (V8, separately dark). The records/Power work must **never** be gated behind the V8 factor ruling.

---

## §4. Park-record catalog (v1)
A record is keyed `(franchiseId, seasonId, statsScopeId, stadiumId, recordType, recordKey)`; the store already exists (`franchiseStadiumRecordsStorage.ts`, own db `kbl-franchise-stadium-records` — **no trackerDb bump**). Each type has a **polarity** (positive = glory / negative = dubious) driving the sign-law (§6).

**Fame-bearing MAJOR records (move fame meaningfully):**
| Record | Polarity | Notes |
|---|---|---|
| Farthest HR by a **RHB** here | positive | user-entered HR feet; blank-ineligible |
| Farthest HR by a **LHB** here | positive | handedness is per-PA on the spray row |
| Most HRs here **this season** | positive | season-scoped (key embeds season; career here = v2.x) |
| Most HRs **allowed** by a pitcher here | **negative** | a dubious mark → infamy |
| **Highest** cumulative **WPA** here — position player | positive | WPA = the fame primitive; per-game `playerWpaTotals` archived |
| **Lowest** cumulative WPA here — position player | **negative** | the park "house of horrors" |
| **Highest** cumulative WPA here — pitcher | positive | via `pitchingWpa` |
| **Lowest** cumulative WPA here — pitcher | **negative** | |
| **Largest positive single-play WPA swing** here | positive | the clutch moment; **play context attached** |
| **Largest negative single-play WPA swing** here | **negative** | the goat moment; **play context attached** |

**Free on de-orphan (already derived, just never surfaced):** highest-team-runs game · highest-combined-runs game · largest run-differential game · no-hitter / perfect-game thrown here. (Run-differential + spray-event-count = **silent evidence**, not fame-bearing.)

**Deferred:** highest exit-velo here (the exit-velo field isn't threaded into the stadium rows yet) → v2.x; career-HRs-here (cross-season scope) → v2.x; WAR-by-stadium → V8.

**Build-confirms:** (a) thread `hrDistance` + `handedness` onto `FranchiseSprayChartRow`; (b) the single-play WPA-swing records need **per-play WPA + the at-bat context** reconstructible at the per-game tap (WPA attribution is per-play; confirm the per-game tap can surface the game's max/min-swing play + context vs the stored stadium record).

---

## §5. Integration flow (the hops; seam + gate per hop)
A completed game reaches the dark-write tap chain (`processCompletedGame.ts:1048-1095`). New `persistDarkStadiumRecordsForCompletedGame`, gated by a **new `isFranchisePhase2StadiumRecordsEnabled()`** (L14 is taken — `franchiseRebrandOffer.ts:47`; follow the `franchisePhase2Flags.ts` pattern, default false, build-dark, go-live post-D13).

1. **DETECT** — build the franchise-season foundation report for this game (`buildFranchiseStadiumFoundationReport`), read prior records (`listFranchiseStadiumRecords`) **before** upserting, then `upsertFranchiseStadiumRecordsFromFoundationReport` **extended to return `changes[]`** (`{stadiumId, recordType, recordKey, priorValue, priorLeaderPlayerIds, newValue, newLeaderPlayerIds}`). New identity = SET; `newValue` beats a different sole holder = OVERTAKE (`priorLeaderPlayerIds` = dethroned). Ties extend co-leadership silently (only a strict new **sole** holder fires the swap). *(Accepted cost: the per-game report rebuild is real hot-path compute; bounded.)*
2. **FAME swap** (centerpiece, §6) — build the polarity-signed `heatDeltas` and **concat onto the existing `fameResult.playerHeatDeltas`** already piped to `persistFameMoraleConsequencesAfterFame` (`:1051` → `resolveFameTap`). Moves both holders' heat **and** their player morale, sign-preserving, for free. Gate: `isFranchisePhase2FameEnabled` + per-bump sentinel `park-record:{stadiumId}:{recordType}:{recordKey}:{checkpoint}:{holderId}`.
3. **FAN morale** (§7) — `resolveFameTap` hard-zeros fan morale, so the home-crowd buzz is a separate compose: a named `PARK_RECORD_SET` base-row (clone of `PLAYER_MILESTONE`, fan delta only) via `composeMoraleConsequence → applyFranchiseMoraleMatrixConsequence`, team = stadium **home** team, gated `isFranchisePhase2MoraleEnabled` + `sourceEventId` dedup.
4. **REPORTER** — a new `franchiseStadiumRecordEmission` (clone `franchiseRelationshipFlareEmission.ts`) builds a `SeasonNewsEvent` via a new `franchiseStadiumRecordNewsAdapter` (clone the L12 award adapter), `eventType: 'STADIUM_RECORD'` (new `NarrativeEventType`), facts = {recordType, stadiumName, newValue, oldValue, overtakenHolderId, batterHand, **playContext** for swing records}, then `generateSeasonNewsTake` (LLM, **best-effort — never blocks** the record/fame/morale). Dedup on (stadiumId, recordType, recordKey, newValue).
5. **ALMANAC** — the change maps 1:1 to a new `'park-record'` `AlmanacNarrativeArchiveEntry` (same scope keys), and the standing record embeds in the persisted season summary so the franchise-season Almanac houses it **independent of the LLM take**.
6. **PLAYER RIVALRY edge** (v1 — JK) — an overtake stamps a persisted `RelationshipEdgeRow` (old↔new holder) via `putFranchiseRelationshipEdge` (a new event-spark writer bypassing the attribute-only formation engine; use the `RIVALRY` or unused `HISTORY` slot), gated `isFranchisePhase2L13Enabled`.

---

## §6. Fame swap — the polarity sign-law (centerpiece)
Each record has **polarity sign** `s` (+1 positive / −1 negative) and a base magnitude `B` (§16):
- **SET / BREAK (new sole holder):** `newHolderΔ = +B · s` (positive record set → +fame; negative record set → −fame/infamy).
- **OVERTAKE:** `newHolderΔ = +B · s`; **`oldHolderΔ = −B · s`** (dethroned). ⇒ lose a *positive* record → you drop, new holder rises; passed on a *negative* record → **you rise (relieved), new holder drops**. (JK's law.)
- **§16 defaults:** `B_set ≈ 2.0`, `B_break ≈ 1.5`, `B_overtaken ≈ 1.0` (asymmetric — you lose less than the breaker gains, "still a legend"); farthest-HR + single-play-swing weighted above most-HRs-here; the single-play **swing** records are iconic → slightly higher `B`.
- **reachFloor:** untouched here — post-§1 fix, heat fluctuates and the honor floor (if earned) protects regardless; an overtake drop simply cools heat. Infamy uses the fame system's existing U-shaped volume (both fame and infamy register).
- **Double-count guard:** the holder's pride lives **only** in the fame heat path (which moves self-morale via the bridge); the `PARK_RECORD_SET` morale row carries **only** fan + teammate deltas (self-delta 0) — mirrors the §13 Albatross guard.

## §7. Fan morale — home buzz + the home-park rivalry
- **Record-set buzz:** the stadium **home team's** fans get a lift (§16 ≈ +3–4, reuse `PLAYER_MILESTONE` fan delta) only when the new holder is on the home team; a *visitor* who sets a record here still earns his own fame but no home-crowd buzz; **no negative** to the overtaken team's fans in v1 (a celebration, not a grievance).
- **Home-park rivalry (JK):** derive, per stadium, each visiting team's **W-L at your park** from the archive (stadiumId + opponent + result — all archived). Any opponent **over .500 at your park** becomes a **home-park rival** (multiple allowed). For games vs that rival at home, flip the existing **`vsRival`** flag → the fan-morale engine's built-in `RIVALRY_SWEEP/SWEPT_BY_RIVAL` + `rivalMultiplier` amplify the fan swing. **Set the multiplier to 2×** for this rivalry type (§16; vs the generic 1.5× — they own your building). Both a home win (finally beat them) and a home loss (double sting) hit fan morale at 2×. Net-new = one archive aggregation + flag-flip + the 2× dial; the amplifier infra is a **freebie** (`fanMoraleEngine.ts:250,374,405`).

## §8. Per-stadium stat-display layer (interesting, NOT fame-bearing)
Per-game player stats are archived with the stadium (`playerGameStats` store + `stadiumId`, `gameStorage.ts:43,115`). So per-stadium **OPS / ERA / AVG / HR / K** splits are a **bounded aggregation** grouped by `(player, stadium)` — same projection pattern the spray foundation uses. Display all stadium-tied data in the **Team Hub stadium-analytics tab, filterable by stadium**. This layer is **display-only** ("interesting to include"), distinct from the fame-bearing records of §4. (WAR-by-stadium needs re-running WAR on the stadium subset → V8/v2.x.)

---

## §9. Gating, idempotency, cadence
- **New flag** `isFranchisePhase2StadiumRecordsEnabled()` (default false, build-dark, go-live post-D13). The records store's policy booleans (`moraleMutationAllowed: false` etc., `:22-25`) flip to flag-gated **only** when enabled — and they are likely **test-characterized**, so make the flip flag-conditional and **grep the tests first** (the franchise-hub-copy gotcha).
- **De-orphan at both sites:** season-finalize (`franchiseSeasonSummaryStorage.ts:701`, for the season-summary Almanac snapshot) **and** per-game (the §5 tap, so the reporter narrates the overtake that night).
- **Idempotency:** per-record sentinel (§5.2) for fame/morale; emission dedup on (stadiumId, recordType, recordKey, newValue); store overwrite-safe via the unique `by_identity` index; record-change fires once per checkpoint via the `updatedAtCheckpoint` guard pattern.

## §10. Wiring map (insertion points)
`processCompletedGame.ts:~1095` (the new tap) · `franchiseSeasonSummaryStorage.ts:701` (de-orphan) · `franchiseFameCompute.ts:109` (remove the per-game reachFloor ratchet, §1) · `franchiseHonorReachFloor.ts` (pin the honor floor to REGIONAL_STAR, §1) · `masterMoraleMatrix.ts` (PARK_RECORD_SET row + the `satisfies Record<MasterMoraleEventType>` completeness) · `narrativeEngine.ts:77/592/640` (STADIUM_RECORD type + the hedging/highStakes exhaustiveness maps) · `fanMoraleEngine.ts` (the home-park-rival 2× hook) · `franchiseStadiumRecordsStorage.ts` (return `changes[]`; new record-type literals; flag-gate the policy block) · `putFranchiseRelationshipEdge` (the overtake rivalry edge) · `FranchiseSprayChartRow` (+hrDistance, +handedness) · the carry converter in `src/engines/`.

## §11. §16 sim-tune dials (documented defaults — zero build-time questions)
Fame `B_set 2.0 / B_break 1.5 / B_overtaken 1.0`, swing/farthest-HR weighted +; fan-buzz +3–4; home-park-rival multiplier **2×**; home-park-rival threshold **>.500 at the park**; honor floor = REGIONAL_STAR. All tunable in the L-SIM/RB-16 sweep; shapes are the rulings.

## §12. Test plan (L-SIM)
Overtake swap fires **once** per checkpoint, sign correct per polarity (positive: new+/old−; negative: new−/old+); **fame fluctuates down** for a non-honored player; honor floor holds at REGIONAL_STAR; double-count guard (pride once); home-park-rival 2× applies only to home games vs an over-.500 visitor; records persist + Almanac houses even when the LLM take is null; policy-block flip is flag-conditional (characterized-string safe); NarrativeEventType + MasterMoraleEventType exhaustiveness compile.

## §13. v2.x / V8 backlog
Exit-velo records (thread the batted-ball exit-velo field onto the stadium row) · cross-season "career here" scope · WAR-by-stadium splits · statistical park FACTORS + park-adjusted WAR (V8) · overtaken-team fan negative · standing-infamy ongoing term for holding a negative record · heat-map / distance-ring spray rendering · tiered honor floors above regional-star.
