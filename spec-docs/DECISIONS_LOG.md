# KBL Tracker - Decisions Log

> **Purpose**: Record of key decisions made during development with context and rationale
> **Format**: Reverse chronological (newest first)

---

## June 2026

### 2026-06-27 (REBRAND/RELOCATION): engine is built-dark and complete — left dark for v1 (JK ruling)

Grounding finding (Captain, 2026-06-27): the rebrand/relocation circuit-breaker (§14 / LS-20) is ALREADY fully built-dark, more complete than the soul-gap queue implied. Built: the dwell trigger detection (materialize-on-read via `getRebrandOffer`→`computeRebrandDwell` off the team-fan morale history — no per-game write needed), and the entire reset cascade `executeRebrandCascade` (`franchiseRebrandApply.ts`): L11 manager auto-fire with the player ripple, team-wide trade-style fame reset, badge clear, fan-hopeful reseed, stadium-change event, fan morale hard-set to `REBRAND_RESET_MORALE`~70, the `teamHistory` relocation marker appended to franchise-team metadata (the field EXISTS: `leagueBuilderStorage.ts:154`), and idempotency keyed on the marker. L14 flag default OFF. NOT wired: nothing calls `getRebrandOffer`/`acceptRebrandOffer` in production (UI) and the L-SIM does not exercise it. CRITICAL: this is NOT a missing "dark per-game wire" like the rivalry edges — it is GM-GATED + needs user-entered new city/name (`ExecuteRebrandCascadeInput.newTeamName/newCity`), so it fires only from an on-screen GM action and cannot auto-fire in the headless L-SIM (so it does NOT "re-bake" the baseline, correcting the earlier handoff assumption). The two real remaining jobs are (a) the on-screen GM offer + relocation input flow (UI, JK-acceptance-gated) and (b) an optional L-SIM integration leg that force-drives a rebrand to prove the soul invariants survive the reset. **JK RULING 2026-06-27: leave it built-dark for v1** — defer both (a) and (b) to a dedicated session. The soul-gap rivalry-lane work ends here with the three ENVY tickets + OVERTAKE banked.

### 2026-06-27 (RIVALRY-ENVY-2B): All-Star snub forms a mid-season RIVALRY edge — "first guy out resents last guy in"

JK ruled 2026-06-27 the All-Star snub pairing: the player who just missed the team forms a lasting `RIVALRY` edge against the player who just made it, **per slot**. Hitters (one starter per position): the top non-selected at a position resents the starter at that position. Pitchers (a staff): the top non-selected of a kind (SP / RP) resents the marginal — lowest-merit — selected pitcher of that kind. Bounded ≤ ~10 edges/season. ADDITIVE (the All-Star snub morale is untouched). Because the lock is **mid-season**, these edges go through the per-game intensity lifecycle (unlike the finalize award edges), so they use a NEW `formationSource:'asg-snub'` that is event-driven for the formation partition but is NOT given the `'envy'` intensity carve-out — their formation intensity is computed from the REAL lock-game charged state (the tap has the gameState), matching the lifecycle invariant at every checkpoint. Create-if-absent semantics; a later overtake on the same pair may relabel the edge (benign, invariant-clean).

### 2026-06-27 (RIVALRY-ENVY-2A): race-snub (morale hit + rivalry edge) extended to Rookie of the Year + Reliever of the Year

JK ruled 2026-06-27 to extend snubs to the Rookie of the Year and Reliever of the Year races. Both awards already exist and are engine-computed with the same row shape (winner + close-loser candidates) as MVP/CY, so each close-loser now takes the personality-scaled morale hit AND forms a `RIVALRY` edge against the winner, reusing the ENVY-1 machinery (`applyFranchiseRaceSnubMorale` + `persistRaceSnubRivalryEdges`). Implemented **SNUB-ONLY** (per JK's "snubs" wording): no winner-side news emission or fame reach-floor for ROY/Reliever winners — those have no `FranchiseHonorTier` and the magnitude is an un-tuned §20.3 decision. **OPEN-DECISION (deferred):** whether ROY/Reliever WINNERS should also receive the winner-side honor treatment (news + reach-floor fame), and at what magnitude. The MVP/CY winner-payout path is unchanged (the snub+envy block was extracted to a behavior-identical shared helper). All-Star envy pairing now ruled (snubbed 2nd-at-position → starter-at-position) and queued as RIVALRY-ENVY-2B.

### 2026-06-27 (RIVALRY-ENVY-1): race-snub rivalry edge is additive

RIVALRY-ENVY-1 builds the MVP/Cy Young race-snub → persisted `RIVALRY` edge as an ADDITIVE extension: the existing morale-only snub remains intact, while spec §22.4/§24.10/ASG-3/RACE-2 mandate the relationship edge; F2/F7 scope the morale tap victim set and no-double-count rule only, and are silent on relationship edges. All-Star envy is DEFERRED as an OPEN-DECISION because the pairing is ambiguous. Envy edge intensity is the L13 lifecycle seed baseline, not an author knob; envy uses create-if-absent semantics so an existing pair edge is preserved untouched after finalize.

### 2026-06-26 (attended Hybrid via `/kbl-captain`): Butter Fingers ⇄ Magic Hands — diametrically-opposed FIELDING counter-trait pair

**JK ruling:** Butter Fingers is the **counter-trait to Magic Hands** — they must be scored over the SAME fielding event set and count in **diametrically opposed ways**, so a Magic Hands qualifier CANNOT also be a Butter Fingers qualifier.
- **Magic Hands** (+ / good hands) = SUCCESSFUL spectacular catches (the web-gem plays — diving/leaping/sliding/robbed-HR).
- **Butter Fingers** (− / bad hands) = MISSED spectacular catches **+ FIELDING errors** — explicitly **NOT throwing or mental errors** (those stay with Wild Thrower [throwing, per DT-FIX-1] and Noodle Arm [mental]).
- Rationale (JK): a player who attempts many spectacular catches and MISSES them is proving he deserves Butter Fingers AND putting himself out of the running for Magic Hands. Because the two count complementarily over the shared event set, qualifying for one excludes the other.
- **Dive Wizard** (the arm-gated, arm>80 variant that rides the same web-gem signal) inherits the same spectacular-catch quality — the opposed framework applies to the shared web-gem rate.

**Implication (current state):** TODAY both Magic Hands and Butter Fingers use an ALL-fielding-events denominator (a routine putout dilutes both), so they are only directionally — not diametrically — opposed; and Butter Fingers currently counts ANY failed fielding play / `playType==='error'` (it does not yet separate fielding-vs-throwing/mental errors, and does not yet credit/debit MISSED spectacular catches as a distinct thing). The redesign tightens both to the opposed spectacular-attempt + fielding-error event set.

**Build (queued as a MAIN trait ticket, serializes after DT-F2/DT-F3; build-dark, no DB bump):** rework `addWebGemSignals` (Magic Hands/Dive Wizard) + `addButterFingersSignals` so they share the opposed event framework: Magic Hands = made gems / (made gems + missed gems + fielding errors); Butter Fingers = (missed gems + fielding errors) / (same denominator) — complementary numerators ⇒ inverted percentile ⇒ never-both. Fielding-vs-throwing/mental error separation per the DT-FIX-1 partition. **Implementation grounding in progress** (`wf_*`): the data-model crux is how a missed spectacular catch vs a fielding error is recorded on `FieldingEvent` (and whether a missed-dive-that's-also-an-error double-counts) — exact denominator + dedup pinned from source before the contract. (Connects to DT-FIX-1's "Butter Fingers owns muffs" + the fielding/throwing/mental three-way error split.)

**⚠ DESIGN-PASS FINDING (`wf_6ddb6bc2-53e`, adversarially verified, HIGH confidence) — MISSED SPECTACULAR CATCHES ARE NOT RECORDED TODAY → a CAPTURE PREREQUISITE.** Three source-verified facts: (1) `makeEvent` hardcodes `success: playType !== 'error'` (`fieldingEventExtractor.ts:433`) → a missed spectacular attempt cannot be a `success:false` non-error row; (2) `normalizeSavedBasesSpecialPlayType` converts `'Missed Dive'→'Diving'` / `'Missed Leap'→'Leaping'` (`:121-132`) → a TAGGED missed dive is persisted as a SUCCESSFUL gem (it inflates Magic Hands today — arguably a live bug); (3) the `type:'hit'` branch only emits a FieldingEvent on `savedRun` (`:573-592`) → a missed dive on a plain hit emits NOTHING. Net: "missed spectacular catches" reads ZERO from persisted data. The plumbing EXISTS (SpecialPlayType `Missed Dive`/`Missed Leap`, `missed_dive`/`missed_leap` fieldingPlayType, UI capture at `EnrichmentPanel.tsx:1397-1412`, fwarCalculator cases) — but the extractor drops/relabels it. Also: `FieldingEvent` carries NO error-subtype → fielding-vs-throwing/mental for Butter Fingers must CROSS-REFERENCE `ErrorAttribution.type==='fielding'` (the value DT-FIX-1 reserved). **never-both is ALREADY enforced** by the existing `OPPOSITE_PAIRS ['Magic Hands','Butter Fingers']` acquisition duel (`traitAcquisition.ts:334` + reconcile 590-608) — needs no change.

**JK RULING 2026-06-26 (path): FIX THE RECORDING FIRST, then build the pair.** Sequence: (1) **CAPTURE FIX** (live game path — `fieldingEventExtractor.ts`): persist a tagged missed Dive/Leap/Robbery as a MISS (`success:false` + the missed `specialPlayType`), and STOP normalizing `Missed Dive→Diving` into a successful gem; emit a FieldingEvent for a missed spectacular attempt even on a plain hit. **USER-FACING → BV (browser sign-off) REQUIRED** (not build-dark; changes what a tagged miss persists). (2) **THEN the opposed-pair redesign** (`addWebGemSignals` + `addButterFingersSignals`): shared spectacular-attempt denominator, Magic Hands = made/attempts, Butter Fingers = (missed + fielding-errors)/attempts; fielding-errors via the `ErrorAttribution.type==='fielding'` cross-ref + per-`atBatEventId` dedup (missed-gem wins over fielding-error on the same AB). Capture-fix grounding next.

### 2026-06-26 (attended Hybrid via `/kbl-captain`): Park→WAR (V8) — §9.D re-confirmed; build the SEED-park→WAR wiring

**Context:** the v1 audit listed "V8 park→WAR" as an OPEN/conflicted question. A grounded + adversarially-verified investigation (`wf_2355914a-e2e`, 6 agents) found **it is NOT a live conflict** — it is a snapshot artifact. The apparent disagreement (STADIUM_ANALYTICS §1.0 "park factors preview-only / defer WAR consumers" vs the Mode-1 vision §8.8 "stadium depth v1-critical, WAR consumes park") is about two DIFFERENT factor types: §1.0 defers only the **ADAPTIVE (archive-derived/measured)** layer; **SEED/STATIC (geometry-derived)** factors were always permitted. **§9.D already ruled this IN** ("v1 WAR consumes seed/static park factors; adaptive stay deferred", committed `a9584566` 2026-06-20, ratified DECISIONS_LOG 2026-06-23/24). The audit that re-listed V8 "open" (`V1_DELTA_AUDIT_FINDINGS`) anchored on a roadmap boundary captured **54 minutes BEFORE** the §9.D commit → it physically never saw the resolution (verifier confirmed via commit timestamps).

**JK ruling 2026-06-26 (attended):** **§9.D STANDS — v1 WAR uses the simple built-in (seed/geometry) park factors; the measured/adaptive ones wait.** Build the full seed-park→WAR wiring (Option 1) as a near-term ratings-lane ticket. JK accepts the interim hitter-side approximation (below).

**Scope of the build (V8 = "park→WAR seed wiring"; small, build-dark-safe, Lane-C-disjoint):**
- **bWAR:** thread seed park factors into `calculateBWAR` (the consumption branch already exists at `bwarCalculator.ts:229-243` but is DEAD — every live caller passes park-blind args; callers `warOrchestrator.ts:216` / `useWARCalculations.ts:208` / the Simplified season path). **Keep the homePA-only scoping** (`:239-240`) — the genuine double-count hazard is a per-park adjustment stacked on the already-park-blended league wOBA baseline (0.329); homePA-scoping contains it.
- **pWAR:** ADD an `options.parkFactor` to `calculatePWAR` (none today, `pwarCalculator.ts:289-296`) and call the already-built `applyPitcherParkFactor` (`:537`), park-adjusting FIP BEFORE the leagueFIP−pitcherFIP diff (`:324`→`:329`). This side is net-new param threading (greenfield call-site), not a flip-on.
- Wire the 40%-of-season activation gate (`parkFactorDeriver.ts:129`); seed factors derive from geometry on the fly (`:78-93`).
- **NO frozen-oracle touch, NO `TRACKER_DB_VERSION` bump, NO new store.** Touches only WAR call-sites/engines + tests. Does NOT double-count with RA-7/A2.5 (that park-adjusts the ratings PRODUCTION signal, a different quantity; WAR is computed from counting stats — verified zero rating/grade/checkpoint refs in the WAR orchestrator).
- **ADAPTIVE layer stays deferred** (the `adaptiveParkFactorPersistenceAllowed`/`parkAdjustedWarAllowed` records-store flags stay false; they have ZERO WAR-engine consumers so the seed wiring neither reads nor flips them — a policy-consistency nit to reconcile later, not a blocker).

**⚠ Known interim approximation (JK accepted):** the bWAR park leg needs home-vs-road plate-appearance counts; `homePA` is **never populated** in any live path (only the type field + the engine's own `Math.floor(pa/2)` fallback) → the bWAR adjustment runs on a 50/50 home/road guess until the separate **§9.D data-retention item** lands (durably persist per-game batted-ball + handedness; an OWED GameTracker/stats-lane item). The pWAR park leg is exact. All build-dark → no live effect until the flag flip, by which point the data item may have landed.

### 2026-06-25 (attended Hybrid via `/kbl-captain`, session-end): DT-x refinement rulings — web-gem set, error-trait cohort, Wild Thrower scope, Volatile valence

JK reviewed the 4 OPEN-DECISIONS the dormant-trait wave surfaced this session (DT-C2 `44ababfb` / DT-D `6d88b228` / DT-E `2a44cc2a`, all build-dark, committed). Rulings (each = a follow-up edit to already-committed build-dark code; queued, NOT built in the saturated session):
1. **Web-gem set (Magic Hands / Dive Wizard — DT-C2):** ADD `Robbed HR` → web-gem set = `{Diving, Leaping, Sliding, Robbed HR}`. Robbing a HR at the wall is the signature defensive highlight + the in-app `GEM_PLAY_TYPES` already includes it. (`Over Shoulder` / `Wall Catch` still excluded.) Reverses the DT-C2 conservative default. → edit `WEB_GEM_PLAY_TYPES` in `traitCandidateBuilder.ts` + tests.
2. **Error-trait cohort (Wild Thrower / Noodle Arm — DT-D):** WIDEN the peer pool from error-makers-only to ALL fielders (league-wide) — emit a 0-rate signal for every fielder with games (iterate `gamesByPlayer`/`seasonFieldingByPlayer` like `addArmSignals`) so the true league-leader stands out (matches the "league-leader earns" §0.6b reading). Reverses the DT-D conservative default. → edit `addErrorSignals` + tests.
3. **Wild Thrower scope (DT-D):** THROWING errors ONLY — drop `'fielding'` from Wild Thrower's numerator (Butter Fingers already owns fielding muffs; no double-count; matches the name). Noodle Arm stays `mental`-only. → edit the `addErrorSignals` type partition + tests.
4. **Volatile valence (DT-E):** Volatile is POSITIVE, not negative — KEEP the positive pricing, FIX THE LABEL: move `Volatile` from `NEGATIVE_IMAGE_TRAITS` to `POSITIVE_IMAGE_TRAITS` in `traitAcquisition.ts` (high-variance = high-ceiling = an exciting/positive trait). ⚠ PRE-EXISTING-wiring flip (Volatile was negative-image before this session) → the implementer MUST grep ALL Volatile-valence consumers (fame / narrative / morale / image) + existing tests and update them in the SAME diff; scope the ripple before building.

Queued as **DT-FIX-1** (rulings 1-3, `traitCandidateBuilder.ts`) + **DT-FIX-2** (ruling 4, `traitAcquisition.ts`, ripple-scoped), to run on `codex/franchise-v1-next` BEFORE DT-F (same trait files). Build-dark; no DB bump. *(Not decisions — confirmed no-action: A2.5/RA-5 §16 age magnitudes = sim-tune placeholders; Dive Wizard personality driver = none/neutral.)*

### 2026-06-25 (attended Hybrid via `/kbl-captain`): DORMANT-TRAIT ENABLEMENT — JK ruled the proxy for ~22 of the 27 not-earnable traits (the "dormant trait wave")

Following the inventory + the capture-exists/threshold-exists/logic-missing clarification (DECISIONS_LOG entry below + `TRAIT_DETECTION_SCOPE_AUDIT.md` 2026-06-25 table), JK supplied the measurement method for nearly every dormant trait. **These fill the empty §0.6 proxy rows; difficulty is already auto-derived (assignTier); the only build is the signal + min-sample valve (opt-in — fires only on user-tagged data).** All build-dark (live post-D13). Captain to verify each signal's data source exists before contracting, design the A/B scoring formula, and sequence the build wave (template = elite pitches / T-9).

- **A — pitch-type (user tags pitch on big hits / Ks / BBs; `enrichment.pitchType`):** **Fastball = {4F, 2F, CF}; Off-speed = any OTHER pitch ({FK, CB, SL, CH, SB}).** *Elite-<pitch>* (pitcher) = **NET quality on that pitch, NOT raw K count** (⚠ JK 2026-06-25: a pitch that Ks a lot but ALSO walks a lot is NOT elite) — Ks **CREDIT**, **BBs + big-hits-allowed DEBIT** on that pitch's tagged ABs, rate vs pitcher peers (T-9). *Fastball Hitter / Off-Speed Hitter* (hitter) = batting performance on fastball- vs off-speed-tagged pitches, rate vs hitter peers. **RECOMMENDED FORMULA (Captain, ratified shape):** per pitch-bucket, a **net-outcome score** over the user-tagged ABs — for a HITTER: big hit **+**, RBI **+**, BB mild **+** (discipline), out 0, K **−**; for a PITCHER (elite-pitch): K **+**, out mild **+**, BB **−**, hit-allowed **−−**, **HR-allowed −−− (the HEAVIEST debit — a HR off the pitch is far worse than a walk, JK 2026-06-25; counted against ALL elite pitches)** — averaged per tagged AB, **min-sample-gated**, percentile-ranked vs role peers. The selective tagging (good AND bad outcomes — incl. the HRs the user already tags as big hits) IS the signal. *(Mirror for the HITTER pitch-traits: a HR is the BEST outcome, i.e. the symmetric heaviest CREDIT.)*
- **B — pitch-location (`enrichment.pitchLocation` low/high/inside/outside; user tags on big hits / Ks / BBs / RBIs incl. sac flies + RBI groundouts):** *High/Low/Inside/Outside Pitch* (hitter) = batting performance on pitches tagged in that zone. **Tagging is SPARSE-BY-INTENT — the user only tags when it matters, so every tagged AB is a signal; the engine must read the OUTCOME CONTEXT of those tagged ABs to separate players.** **Captain to RECOMMEND the per-location scoring** (all data is present; design the proxy).
- **C — fielding-difficulty / chase:** *Magic Hands* = web gems (diving/jumping/sliding plays) for a fielder with **fielding rating < 80**. *Dive Wizard* = web gems for a fielder with **arm rating > 80**. **A player CAN earn BOTH** (arm > 80 AND fielding < 80) — they're not mutually exclusive; the seeded firing roll decides if they win their slots over other qualifiers. ⇒ **NEW mechanism: rating-gated trait eligibility** (the trait engine currently uses performance signals only — add an arm/fielding-rating gate). *Bad Ball Hitter* = unusual **hit-rate on CHASES** (the chase button registers a chase) — **counterbalanced by outs-while-chasing** (denominator includes chase-outs so a player can't game it by always chasing).
- **D — errors:** *Wild Thrower* = throwing/fielding errors (already auto-tracked — ~1-line BUILDABLE add). ***Noodle Arm — RE-ADDED (reverses the 2026-06-18 cut), REINTERPRETED: tied to MENTAL ERRORS*** (already tracked, no trait consumes them yet). League-leading mental-error rate → a chance to acquire (not guaranteed but relatively common for the top mental-error player; mental errors are rare so the leader stands out). *(Note: this redefines Noodle Arm as a mental-error trait, NOT a literal-arm trait — its prior cut reason "no clean arm signal" no longer applies.)*
- **E — mojo volatility:** *Volatile* = MANY relative mojo changes; *Consistent* = FEW. Signal = the count/rate of a player's mojo changes (JK: already measured in GameTracker / roster team-hub — Captain to confirm the source).
- **F — bespoke:** *Base Jogger* = **the OPPOSITE of Base Rounder — REVERSE its logic** (deep hits that only net a single / advancing fewer bases than expected on the bases). *Metal Head* = a **PITCHER** trait (⚠ CORRECTED 2026-06-25 — NOT a batter trait): the pitcher who is the **VICTIM** of killed-pitcher (comebacker → **fitness↓**) + nut-shot (→ **mojo↓**) events. The league-leading victim earns a chance at it as **protection against those future fitness/mojo hits** (a battle-tested toughness trait). Signal keyed on the **pitcher's `pitcherId`** (the victim) on those events — NOT the batter who delivered them. *(Confirms with the data: Metal Head is in the PITCHER pool + the scope-audit "comebacker/KP/nut-shot" note. JK 2026-06-25: the killed-pitcher + nut-shot events are **buttons in the ENRICHMENT PANEL, tied to the pitcher** — so the pitcher-victim attribution is THERE [the verification workflow `wh9in5sah` couldn't pin the exact storage; resolved by JK — it's enrichment, pitcher-keyed]. Still take a closer look at the exact field at build time.)* *Wild Thing* = wild pitches that advance baserunners (the between-at-bat WP events) + dropped-third-strike-WP (the `D3K_WP` quickbar button), rate vs pitcher peers. *Workhorse* = an **ELITE** trait tied to relatively-high **innings-pitched-per-game** for either starters OR relievers (role-split rate vs peers).
- **G — CUT (confirmed):** *Sign Stealer* + *Stimulated* stay cut/dormant (no re-add).

**Engineering forks/notes the Captain surfaced (to settle as the wave builds):** (1) the A/B outcome-scoring formula = a Captain recommendation (JK delegated); (2) C's rating-gate is a new mechanism in the trait engine; (3) Noodle Arm's reinterpretation drops its prior cut rationale; (4) per-signal data-source verification pending (mojo-change source, killed-pitcher/nut-shot events, web-gem/diving tags, mental-error field, chase-out counting, between-AB WP, `D3K_WP`, sac-fly/RBI-groundout). Difficulty/thresholds already derived (Captain-verified via assignTier 2026-06-25): e.g. Elite 4F 0.92 / most elite-pitch RARE 0.82 / pitch-location RARE 0.82 / Workhorse ELITE 0.92 / Bad Ball Hitter RARE 0.82.

**DT-C clarifications (JK 2026-06-25, attended, mid-build):**
- **Rating-gate = COHORT FILTER, not post-hoc eligibility (Magic Hands / Dive Wizard).** The fielding<80 / arm>80 threshold must filter the COMPARISON COHORT (the peer pool) *before* players are percentile-compared — NOT compute the web-gem percentile against the full fielder population and then exclude the gated-out players. **Rationale (JK):** if the elite fielders (high rating, naturally many web-gems) are in the pool, a *lower-rated OVERPERFORMER* (a sub-80 fielder making web-gems they "shouldn't") gets percentile-buried beneath them and is overlooked — defeating the trait, which is meant to reward overperformance relative to rating. **Implementation (Captain-verified from source):** gate at SIGNAL EMISSION — only emit the web-gem signal for a fielder that passes its rating gate; `buildPeerPools` (traitCandidateBuilder.ts:1647-1652) pools ONLY players who emitted a signal for that trait, so the Magic Hands percentile is computed among sub-80 fielders only (and Dive Wizard among arm>80 fielders only). A fielder absent from the ratings map → dormant. This is the DT-C2 build.
- **Easy Target ↔ Mind Gamer are the opposite pair (corrects the stale 2026-06-16 TS-8 framing).** Easy Target IS a v1 trait; its opposite is **Mind Gamer** (the plate-discipline / chase-frequency axis), NOT Bad Ball Hitter. The 2026-06-16 TS-8 note ("Easy Target = chase-for-OUTS, negative mirror of Bad Ball Hitter, same signal split by outcome") is SUPERSEDED — Bad Ball Hitter (DT-C) stands alone (no opposite pair; it measures hit-rate ON chases, an outcome-success signal), while Easy Target/Mind Gamer are their own discipline-axis pair and are OUT of DT-C scope. (Surfaced during DT-C grounding because TS-8 wrongly tied Easy Target to Bad Ball Hitter, which DT-C builds; flagged so the stale note doesn't mis-wire a future ticket.)

### 2026-06-25 (attended Hybrid via `/kbl-captain`): Elite-pitch traits BECOME EARNABLE in-season (opt-in via pitch-type tags) — reverses the dormant-park

JK challenged the current state ("a miss on the traits work — elite pitches should be earnable if a pitcher gets an elite number of strikeouts with a certain pitch") and asked whether the spec included the concept. **Grounding (`wf_5b2d4ae8-aa1`, 3 readers) found:** the trait-VALUE spec DOES list the 8 Elite-pitch traits (Elite {2F,4F,CB,CF,CH,FK,SB,SL}) in its UNCOMMON tier table (so they're conceptually in the gain/loss system), but the trait-MEASUREMENT spec (`TRAIT_MEASUREMENT_SPEC §0.6`) **deliberately PARKED them as dormant** — they are NOT among the 47 earnable v1 traits, held back as part of the ~24 "correctly-dormant" set that gate on a missing input. The blocker (`TRAIT_DETECTION_SCOPE_AUDIT.md`): **per-pitch-type strikeout capture** — every current pitcher trait signal is whole-arsenal (total K-rate/BB-rate; `traitCandidateBuilder.ts:600-611`), NOTHING buckets by pitch type. The data field EXISTS (`enrichment.pitchType`, `eventLog.ts:437`, set via the EnrichmentPanel) + the `ELITE_TRAIT_TO_PITCH` map (`prospectScoutingDraftEngine.ts:401-410`), but it's optional manual enrichment (usually empty in normal play) and no aggregator counts Ks by pitch. So it was a **documented deferral on a measurement gap, not a silent oversight** — but JK's intent is valid and buildable.

**JK RULED: BUILD IT — elite pitches earnable, opt-in via pitch tags.** Wire the 8 elite pitches into the earnable set, sourcing the signal from the existing `enrichment.pitchType` tag: a pitcher earns "Elite <pitch>" when enough of his strikeouts are tagged with that pitch (a **min-sample valve** so it never fires on noise and stays dormant if the user doesn't tag pitches → zero added burden, honoring the non-user-intensive philosophy). Chosen over "keep draft-only for v1." **Consequence:** the "max 1 Elite-pitch per player" rule (T-4c) now ALSO applies to the gain/loss engine (a pitcher could earn a 2nd) — the elite-pitch group becomes a mutual-exclusion set in `reconcileGainProposals`, not just generation. → new ticket **T-9** (per-pitch-type K aggregator + BUILDABLE wiring + per-pitch signal + min-sample + engine-side max-1); supersedes the earlier "GENERATION-ONLY / gain-loss unaffected" framing of T-4c. Build-dark like the rest of the traits rebuild (live post-D13).

### 2026-06-25 (attended Hybrid via `/kbl-captain`): Prospect generation MAY spawn negative traits (flaws) — §5 NEG 0.27 ratified for v1

Building T-4 (§5 rarity-weighted prospect trait generation), the Captain surfaced a genuine visible-gameplay fork: today's prospect trait pools are **positive-only**, so the spec's `NEGATIVE_TRAIT_FRACTION = 0.27` (≈1 in 4 generated trait slots is a flaw) is defined but never exercised — turning it on lets drafted prospects spawn with weaknesses (a Whiffer, a Wild Thing). **JK ruled: YES — flaws allowed (the ratified spec default).** Rationale: matches real rosters + adds draft strategy (weigh a flaw against the upside); and severe flaws stay uncommon **automatically** because the same genWeight rarity weighting makes them rare (Severe genWeight 0.15 vs Minor 1.0), so no separate "no severe flaws" guard is needed. JK chose this over the offered softer options ("mild/moderate flaws only" / "flaw-free v1"). **Engineering guardrail (Captain-owned, not surfaced to JK):** the negative pass shifts the trait mix downward, so the §3.2 prospect-grade-distribution test (`§13`, ±1.72pp) is the make-or-break — if the per-prospect rating anchor can't absorb the flaws and the distribution drifts, T-4b STOPs and the §3.2 target is NOT silently re-baselined (a calibration decision returns to JK). **T-4 SPLIT:** T-4a = positive rarity-weighting (`095717d6`, §3.2 held); T-4b = this negative-polarity pass (new hitter-10 / pitcher-8 negative pools, no-2-negatives, opposite-safe slot 2). Pool composition (which negatives, hitter/pitcher eligibility) taken as a documented conservative default from the negative buildable set filtered by `isTraitEligibleForRole`.

### 2026-06-24 (attended Hybrid via `/kbl-captain`): Priority-2 TRAITS rebuild — 4 forks RULED (grounding `wf_ac7d4425-435`)

Kicking off the traits rebuild (T-1..T-7 + L9b-2). Grounding (6 readers + synthesis) confirmed: the engine is structurally there (signal → peer percentile → personality-tilted gain/lose prob → ONE flat 0.75/0.35 threshold for every trait → pending overlay rows, flag-OFF/dark); the **16→47 buildable expansion is ALREADY DONE** (R1/R2/R3 built-dark) so L9b-2 is just the Noodle Arm cut; the rebuild threads a derived trait-value weight (80% value + 20% scarcity) through a 7-tier threshold table + generation + the slot duel. 4 genuine soul-layer forks surfaced; JK ruled all 4 (with the Captain's recommendation each):

1. **FORK-A — trait value table = FREEZE one league's ranking for v1** (not per-league recompute). The value/scarcity weight is a one-time baked table; per-league recompute is a cheap later add. Only changes where the snapshot is taken, no formula change. → unblocks T-1.
2. **FORK-C — pitching traits = SPLIT starters vs relievers** into separate peer pools (fold SP-RP and CP into relievers; fall back to the whole pitcher pool when a group is too small). A closer's short-burst rates no longer get benchmarked against a starter's full-game workload. → T-3 cohort split greenlit (the trend-tilt half can ship first if sequencing wants).
3. **FORK-D — catcher arm = PROTECTION-ONLY in v1.** Add the position-mismatch protection map (stop out-of-position infielders from unfairly losing an arm trait) NOW; the re-earnable catcher-arm trait (a new earnable trait + per-game catcher writer wiring the orphaned CS aggregator) is a SEPARATE follow-on. Keeps T-6 contained (no new trait, lighter pipeline touch).
4. **FORK-E — season-end thresholds = SAME as in-season.** EOS is literally one more run of the same checkpoint engine (5 in-season + 1 season-end), retiring the award-luck Trait Wheel Spin; no distinct year-end threshold table. Add distinct EOS difficulty only if a later sim shows year-end needs to differ.

**FORK-B (negative-tier dollar boundaries, ~$1,500 Severe cut) = NOT a JK fork** — the tier SHAPE is ratified, the exact cut values are explicit §16 sim-tune placeholders (tuned at the RB-16/L-SIM sweep); flagged only so they're not mistaken for ratified constants. **Ticket order (dependency):** L9b-2-cleanup → T-1 (shared weight) → T-2 (tiers) ∥ T-4 (generation) → T-5 (reconcile) → T-3 (trend+cohort) / T-6 (protection) → T-7 (EOS). T-6/T-7 wire into the checkpoint/processCompletedGame sweep ⇒ FULL-suite gate; the rest are pure/dark (build + trait-engine tests). Everything stays build-dark (flag OFF, apply path orphaned) — going live is post-D13. Full ticket detail in `AUTONOMOUS_RUN_LOG.md`.

### 2026-06-24 (attended Hybrid via `/kbl-captain`): Priority-1 ratings cleanup — keep HR-rate in the category migration

Resuming the v1 functional build with the one-model ratings cleanup (RA-12 + the worksheet-retired box-score category drop), JK ruled the one genuine fork. **Drop the 4 clearly-retired box-score categories** (`powerIso`, `contactAverage`, `contactOnBase`, `pitchingFipPrevention`) from the live expected-stats set, but **KEEP `powerHomeRunRate` (HR-rate)** as Power's second leg for now. Rationale: Power's native-SMB4 replacement (park-adjusted carry × exit-velo) is BLOCKED behind A1.5b-2 (the EnrichmentPanel SVG re-derivation + JK browser sign-off), so dropping HR-rate too would leave Power resting on SLG alone with no native signal available — every other rating has a native or retained leg, Power would be the only thin one. Keeping HR-rate means no rating goes thin in the interim; restore the native carry measure (and reconsider the 5th drop) when A1.5b-2 ships. Grounding `wf_2a88b63d-c15` (6 readers + synthesis) verified every rating keeps ≥1 surviving category under the 4-drop, and that the per-rating signal is an equal-weight mean of finite categories (a rating with zero surviving categories is silently omitted — so the 4-drop set is the safe boundary).

### 2026-06-24 (attended, dedicated session): LANE-MERGE EXECUTED — `codex/mode1-v1-b` → `codex/franchise-v1-next`

The lane-merge ruled in the path-forward entry below (Captain/Opus owns it) was executed in a dedicated session with JK present, per the safety protocol (assess conflicts → side branch → full gate → JK confirm → fast-forward; branch-only, never push). Result: **`codex/franchise-v1-next` fast-forwarded to `87a59ec0`** — the entire Mode-1 build (auction + prospect-gen + scout + draft-freeze + draft-morale + GM entity + roster board) now lives on the living-season branch alongside the L/D-stack.

**Mechanics:** merge-base `549f9832`; franchise +272 / mode1-b +91 commits. Ran the merge on side branch `merge/mode1-into-franchise` in an isolated worktree with an APFS-cloned `node_modules` (deps byte-identical on both tips, so the clone was valid) — keeping the live franchise worktree (which held a concurrent doc-worker's uncommitted edits) completely untouched. After gate + JK confirm, fast-forwarded `franchise-v1-next` from the main worktree (`merge --ff-only`), removed the temp worktree, deleted the redundant side branch. Nothing pushed.

**Conflict surface (a real read-only 3-way merge predicted it exactly):** 8 files changed on both sides, **only 2 truly conflicted** — and neither was production source:
- `franchiseInitializer.test.ts` — each lane had ADDED a different test at the same spot. **Resolution: kept BOTH** (franchise's "no-DH seal" test + mode1's "draft-baseline true-value rows" test) + union of imports.
- `PROMPT_CONTRACTS.md` — append collision in the contract log. **Resolution: base-aware union** (`git merge-file --union`), no duplication of shared base content.
The 6 auto-merged files included the real code (`masterMoraleMatrix.ts`, `franchiseInitializer.ts`, `franchiseMoraleState.ts`, `leagueBuilderStorage.ts`). mode1-b's legacy deletions (`traitPools.ts`, `PlayerNameWithMorale.tsx`, `TraitLotteryWheel.tsx`) applied cleanly — grep confirmed zero dangling references.

**Gate on the merged tree (all green):** `npm run build` exit 0 · full suite **8,228 pass / 1 fail** where the lone fail is the pre-existing `wpaRuntimeBoundary` "allowlisted" hard fail, **proven byte-identical on the pre-merge franchise tip** (`franchiseAnalyticsTrust.ts` untouched by either lane) ⇒ **ZERO new reds** · frozen IV oracle byte-identical (`a0b501b1…`) across merged + both lanes · `TRACKER_DB_VERSION` = 25 on all three, store list identical (no double-bump) · L-SIM smoke (flags-on 24-game season) ALL CRITICAL invariants green (2 non-blocking `fame-war-legitimacy-floor` INVESTIGATE notes, not merge-caused — to be looked at in the full L-SIM-final run).

**Branch hygiene (step-6 rulings applied):** the eventLog box-score fix (`875e4368`) folded in via cherry-pick of the single code-fix commit (its 3 design-doc commits were already duplicated on franchise-v1-next). The ~26 stray `codex/*` branches are all Feb–May 2026 (pre-V1) ⇒ confirmed stale; left untouched (unmerged ≠ deleted), out of v1.

**➡ Next in the gate chain:** L-SIM final (full-season, regenerates the committed baselines) → RB-16 → D12 → D13 → flag-flip → F-141. Resume all building on the single combined `codex/franchise-v1-next` tree.

---

### 2026-06-24 (attended): path-forward rulings — 5 open calls + re-grade cadence + grade-display design spun off

JK cleared the path-to-v1 open decisions:

1. **One-model ratings cleanup — APPROVED, do it NOW while dark (zero-risk).** (a) Drop the worksheet-retired box-score categories from the live ratings blend (Contact: AVG/OBP/K%; Junk: HR-suppression where superseded; Accuracy: FIP; Power: ISO/HR-rate), per `RATINGS_MEASUREMENT_WORKSHEET.md`, and finish wiring the new SMB4-native measures for Power/Speed/Fielding (the A1.5 aggregators built-dark). (b) Execute roadmap **RA-12**: delete the legacy offseason **Model B** (`computeNetChange`, `RatingsAdjustmentFlow.tsx`) + retire **Model C** (`agingEngine` random-walk) UI usage, so the new over-expectation **Model A** is the ONLY rating-mutation engine. **Must land before the offseason flag (`FRANCHISE_V1_OFFSEASON_EXECUTION_ENABLED` / F-138) flips** — that flag currently lights up Model B. Audit `wf_4a384de0-eeb` confirmed: both engines flag-dark today, two separate flags = the live-coexistence trap.

2. **Peer-group structure — RULED position-PURE base + same-position bench.** A position is compared to itself PLUS its own bench (catchers + backup catchers; CF + backup CF; SS to SS-and-its-bench; etc.). The cross-position groups (middleIF/cornerIF/cornerOF, all-IF/all-OF, all-hitters) become FALLBACK rungs only, used when a position is genuinely thin. **Supersedes** the current `RatingsPoolKey` base merges (2B+SS / 1B+3B / LF+RF as the base). Rationale: bigger N is cleanest when added SAME-position (zero positional bias) vs cross-position (adds fielding/arm bias); the roster-agnostic season-total pool makes ~16/position viable; position-pure mean + borrowed spread keeps even ~10 reliable.

3. **D-7c-2 RESOLVED — a player's SEASON SALARY = the winning auction bid the team paid to sign him.** True for BOTH the MLB and Farm drafts. The winning bid carries into Mode-2 as cap/payroll (not a separate frozen number).

4. **v1 SCOPE confirmed IN:** park-factor → WAR (**V8**), pitcher game-score stat (**§8.5**), beat-reporter standout Q&A (**§8.6** + §8.1 pronoun prereq), and **full DH removal**. All four are v1, not deferred.

5. **LANE-MERGE — Captain (Opus) OWNS it; sequence as the next big build step.** ⚠ Execute in a DEDICATED session at a clean seam — NOT concurrently with the active build sessions (the merge is delicate; two committers in one tree is the known collision risk). Not started in this thread (low context).

**RE-GRADE CADENCE (JK):** the player evaluation GRADE re-computes at **each checkpoint** — both ratings changes and trait changes feed the grade, so the grade must re-derive off the then-current ratings + traits every checkpoint (same cadence as ratings-dev + traits).

**GRADE-DISPLAY DESIGN — spun off to a new thread (JK):** explore converting player grades from LETTERS to NUMBERS for more nuance in player evaluation. Prompt handed to JK; a separate design thread will produce the spec + rulings.

### 2026-06-24 (attended Hybrid via `/kbl-captain`): RA-2c-2 qualifier model — the three sample gates + flat floors RULED

**Context:** Building RA-2c-2 (the checkpoint-sweep live-wiring), JK interrogated the "what qualifies a player to be in the peer pool and to have ratings adjusted" measurement. Grounded the adapter (`expectedStatsCategoryRates.ts` emits raw rate + per-category sample; gating is downstream) + the engine gate (`expectedAndSignal` per-category `peerPoolSize`/`sample` checks). Result = a THREE-GATE qualifier model with FLAT (not season-scaled) floors. This is a soul-layer measurement (ratings development) — extracted verbatim from JK, not inferred. Supersedes the §3B "season-scaled min-sample gate" language (purge-on-supersede in the RA-2c-2b build).

**The three gates (plain language):**
- **Gate 1 — peer-pool membership** ("enough sample to be a fair yardstick"): a player counts toward his position group's MEAN/SPREAD for a skill only if his season-to-date sample in *that skill* clears the flat floor. Roster-agnostic (his data stays in everyone's comparison even after he's demoted — the anti-gaming bit).
- **Gate 2 — own-move trust** ("enough sample to trust HIS number"): the SAME flat floor applied to the player himself — below it, that skill doesn't move this checkpoint. Gate 1 == Gate 2 (same cumulative floor, applied as peer vs. subject).
- **Gate 3 — window-active** ("actually played recently"): even when Gates 1&2 pass on cumulative stats, ratings move this checkpoint ONLY if the player accumulated qualifying play SINCE the last checkpoint (no stale re-hit of a benched/injured/demoted player). Compute method = **Option 1: read the games since the last checkpoint on the fly** (NO new persistence, no DB bump). Default threshold = appeared at all (≥1 PA hitter / ≥1 BF pitcher) in the window; §16-tunable. A window-inactive player STAYS a Gate-1 pool member (his data still anchors the comparison) — he just isn't moved.

**FLAT per-category floors (Gate 1 == Gate 2; NOT season-scaled — JK ruled flat; confidence-weighting handles early-season magnitude separately):**
| Rating | Category sample | Flat floor |
|---|---|---|
| Power (ISO/SLG/HR-rate) | plate appearances | **10 starter / 5 bench** |
| Contact (AVG/OBP/K-avoid) | plate appearances | **10 starter / 5 bench** |
| Contact-quality | tracked balls-in-play | **10** (prior ruling) |
| Speed (SB+3B rate) | **speed events = SB + CS + triples** | **≥2** |
| Fielding (FLD%/range) | fielding chances (PO+A+E) | **≥5** |
| Pitching (velo/junk/acc; FIP on outs) | batters faced (FIP: outs) | **≥10** (all pitchers, SP+RP) |

- **Starter/bench split (10/5) applies ONLY to the PA-gated batting categories** (power, contact). Speed (2 events), fielding (5 chances), contact-quality (10 BIP), pitching (10 BF) use single flat floors regardless of starter/bench. Starter vs bench is the player's pool classification (benchIF/benchOF pools = bench floor).
- **Defense-only / glove-first players accounted for:** fielding gates on fielding CHANCES (not PA) — JK ruled Option 1 — so a low-PA defensive specialist's GLOVE still develops on his actual fielding plays, while his batting ratings sit (correct). The 5-PA bench floor mops up their light batting.
- **Reliever fix:** the old 20-BF ('combined' scaled) floor was too high for relievers (~3-4 BF/outing) — dropped to a flat 10 BF for all pitchers.
- **Speed = steal attempts + triples** (JK ruled): gating purely on steal attempts would wrongly exclude a fast triples-hitter who doesn't run; so speed events = SB+CS+triples. Requires changing the adapter's `speedStealTripleRate` sample from PA → (SB+CS+triples).

**DEFERRED — RA-2c-3 (the very next ticket, before the flag-flip):** baserunning ADVANCEMENT in the speed model (first-to-third on a single, second-to-home, first-to-home on a double = UBR). The full speed model is `SB% + UBR + BEAT_THROW`; A1.5c-2 built `ubrAggregator.ts` but it is fully DARK (no season store, no live writer, no consumers). Wiring it needs its OWN data layer (additive season advancement-count fields + a per-game live writer + un-dorm `speedBaserunningRate` in the adapter + fold extra-base events into the speed gate) — the RA-2CQ stack pattern. JK ruled DEFER to RA-2c-3 (keeps the RA-2c-2 soul-layer wiring diff clean + isolates the saved-shape change); both land before the flag-flip so the player never sees the intermediate state.

**Confidence-weighting (distinct from the flat gate):** the move MAGNITUDE scales by `clamp(accumulatedSample / scaledFullSeasonSample, 0,1)`; `scaledFullSeasonSample` IS season-length-aware via `scaledThreshold` (§3B). The flat-floor decision is about the GATE (qualify y/n); the confidence denominator is about magnitude (season-scaled) — no conflict.

**Build split (build-then-wire):** **RA-2c-2a** (engine-layer, pure/build-dark): the adapter speed-sample change (PA→SB+CS+triples) + the flat per-category sample-floor gating (Gates 1&2, starter/bench-aware via poolKey) added to `computeCheckpointRatingSignals` in `checkpointRatingSignal.ts`, with the engine's internal `minSample` zeroed in `CHECKPOINT_EXPECTED_STATS_TUNING` so the flat floors are the SOLE sample gate (minPeerPool stays 6 from RA-2c-1a). **RA-2c-2b** (the live-dark wiring): `franchiseCheckpointSweepCompute.ts` — roster-agnostic fetch + effective-position report, build members, Gate-3 window-eligibility (read games since last checkpoint), confidence-weighting, fan out 1→N overlays, bypass `normalizePerformanceSignal` (do NOT delete — L10 uses it), delete `selectDevelopmentRatingKey`, relax the MLB filter (:139) + teamId guard (:144) + trueValueRow guard (:141-142); + purge-on-supersede rewrite of RATINGS_ADJUSTMENT_SPEC §9 (MLB-only→roster-agnostic) AND §3B (season-scaled gate→flat floors). NO trackerDb bump; reuse `franchiseRatingsOverlays` (cardinality 1→N). The sweep is ALREADY called from `processCompletedGame.ts:1080` — wire the INTERIOR, no new call site.

**Grounding:** recon `wf_a93cad4a-288` (7 readers + synthesis + adversarial critique; verdict SOUND, critique re-verified the load-bearing anchors + caught the already-wired-call-site framing + the teamId-guard miss). Supersedes nothing in the prior 2026-06-24 peer-pool ruling below (this REFINES the sample-gate detail it left as "the sample gate").

### 2026-06-24 (attended): prospect generator — generate pitcher ARM SLOT at the 440-pool empirical rates (B-armSlot)

**Context:** JK noticed arm slot is absent from the player generators. Confirmed from source: both `smb4PlayerGenerator.ts:827` and `prospectScoutingDraftEngine.ts:1518` hard-emit `armSlot: null`; every downstream path is a passthrough (`?? null`). The ONLY real arm slots live on the 440 hand-curated stock players (`playerDatabase.ts`, field comment :71 "pitcher arm slot from SMB4 source roster"). So generated/drafted pitchers have no arm slot and miss its IV pricing component (the `'Sub'` premium etc.).

**RULING (JK):** generate pitcher arm slot in the prospect generator **at the same rates seen in the 440 stock pool.** Measured distribution among the **179 stock pitchers** (= the arm-slot-bearing set; armSlot is pitcher-only): **High 65 (36.3%) · Mid 65 (36.3%) · Low 44 (24.6%) · Sub 5 (2.8%)** — weights 65/65/44/5.

**Scope (B-armSlot, Lane 4B, worktree mode1-v1-b):** seeded weighted draw (`pickWeightedValue` at the gen seed, RB-14 pattern); **PITCHERS ONLY** (incl. two-way; pure position players stay `null`). **Interaction:** armSlot is priced in IV → generated pitchers gain IV parity with stock pitchers; generated prospects are NOT in the frozen `iv_oracle.json`, so no oracle re-bless expected (verify at build). Optional realism refinement (defer): condition `Sub` on RP role (n=5 → global default per JK's "same rates"). Small ticket; added to the ROADMAP_TO_V1 Lane-4B index.

### 2026-06-24 (attended, design discussion): RA-2 ratings-adjustment — peer-pool, eligibility & signal model RULED

**Context:** JK interrogated the RA-2c pool/fallback design via the demote+rookie pool-shrinkage scenario (a starter sent down + a rookie called up shrinks the position peer pool, especially across teams in a small league). Grounded via workflows `wf_1c09a82b-ea3` + `wayq6m143` (+ a critique that caught two Captain errors, below). Six rulings:

1. **Fallback ladder reality (confirmed, not changed):** the built `CHECKPOINT_POOL_LADDER` (RA-2c-1) climbs position-pure → **similar-position group** (middleIF↔cornerIF = all-IF; cornerOF↔CF = all-OF; C→C+IF) → all-hitters; pitchers isolated (SP/RP only, never mixed with hitters). The similar-position grouping JK described already exists as Rung 1; Rung 0 already pools 2B+SS (middleIF), 1B+3B (cornerIF), LF+RF (cornerOF) — only **C and CF** are single-position Rung-0 pools.

2. **§4:65 conflict in committed RA-2c-1 → FIX (Q1 = "suppress when thin"):** the critique caught that `resolvePoolMeanMembers` widens the **MEAN** to all-hitters below the floor, but §4:65 rules the MEAN stays **position-pure** (catcher-vs-catcher) and only the **SPREAD/SD** borrows from a wider reference. **RULING: revise RA-2c-1** — the MEAN stays at the position-group (Rung 0); the SPREAD borrows Rung 1; and when even the position-group mean pool is below ~5-6 real peers, **SUPPRESS that category's move this checkpoint** (it moves next checkpoint when data thickens; confidence-weighting already makes thin moves tiny). Reaffirms §4:65; no spec change.

3. **Peer pool = ALL qualifying players, ROSTER-AGNOSTIC (the keystone — JK's idea):** the comparison pool draws from all teams' 32-man rosters (MLB **and** farm), filtered by the existing **sample/qualification gate** (e.g. the ≥10-contact gate) — NOT "current MLB roster." A recently-demoted player's season stats stay in the pool (he qualifies); a just-called-up rookie / never-played farmhand falls out automatically (fails the sample gate). Grounded feasible: season stats are roster-agnostic (one store keyed by player+season, `seasonStorage.ts:364`); the MLB-only filter is one line (`franchiseCheckpointSweepCompute.ts:139`). **This SUPERSEDES the §9 MLB-roster-only eligibility valve** (spec text to be rewritten in the RA-2c-2 build — purge-on-supersede). KEYSTONE anti-gaming: a GM can no longer shift the position MEAN by demoting a player — his data stays in everyone's comparison, so nobody else is unfairly hit by his exit.

4. **Move eligibility = window-qualified (active since last checkpoint):** a player is adjusted this checkpoint iff he accumulated enough NEW data since the last checkpoint. An inactive window isn't scored → no double-penalty on stale/frozen data, no re-hit. Roster-agnostic. (The window concept lives HERE — on eligibility — not on the signal.)

5. **SIGNAL = cumulative season-to-date base RETAINED — NOT window-only (Captain over-steer CORRECTED).** The Captain first recommended superseding §3B:70/§8:154 to a window-only signal; **JK's clarifying question caught it.** Cumulative is the STRONGER anti-gaming choice: a slumping star's bad start stays in the season-cumulative and **follows him**, so he can't shed it by sitting out a window and returning hot — whereas a pure-window signal lets him wash out the bad stretch (a new gaming vector). The "everyone-else-hurt" harm is fixed by the broad pool (#3, signal-agnostic); the "star dodges his own hit" harm is fixed by keeping the bad stretch in the cumulative. **Recent-form responsiveness = a MODERATE recent tilt on the cumulative base (§8 blend) = a §16 sim-tune FOLLOW-ON** (pure-window too gameable; pure-cumulative too anchored; cumulative-base + tilt is the right balance and it's the spec's). **No supersede of §3B/§8** — cumulative stays.

6. **Confidence-weighting NOW (Q3):** scale the move by accumulated-sample / full-season-sample (clamped 0–1) — early/thin checkpoints move gently, full moves land late. Also bounds the small-league thin-pool noise. **Pitcher-symmetric throughout:** window qualifier = IP / batters-faced (not PA), peer groups SP/RP, pitching categories.

**Build impact:** **RA-2c-1** gets the mean-pure + suppress-when-thin revision (point 2; the committed `9ae54ef3` ladder is build-dark so no live harm yet). **RA-2c-2** = cumulative signal + confidence-weighting + the roster-agnostic window-qualified pool + the wiring; the one genuinely-new piece is window-stat/eligibility computation (snapshot-extend of `franchiseTrueValueSnapshots` vs per-game aggregation of completed games — decide at build; per-game path needs no new persistence). Spec §9 eligibility text to be rewritten in the RA-2c-2 build. Recent-form tilt = documented §16 follow-on. **Anti-gaming, complete:** broad pool (everyone-else-harm) + cumulative signal (bad start follows) + window-eligibility (no stale re-hit) together close the send-down-to-protect-a-slumping-star exploit.

### 2026-06-24 (attended Hybrid via `/kbl-captain`): RA-2c — SMB4-asset gate APPROVED + 4 forks RULED

**Context:** RA-2c live-wires the RA-1 expected-stats engine + RA-2a category rates + RA-2b pool aggregator + the contact-quality signal into the checkpoint sweep — replacing the crude `valueDelta` performance signal at `franchiseCheckpointSweepCompute.ts:184` with a peer-relative per-skill signal + a weighted per-category→per-attribute fan-out (§16 equal-weight default), feeding the EXISTING linear development move. Touches a protected SMB4 soul-layer (ratings development) → the attended SMB4-asset gate applies. Recon `wf_742c834c-7d9` (6 agents) + the adversarial critique both VERIFIED in source that the sweep is **triple-gated dark**: (1) `isFranchisePhase2CheckpointEnabled()` defaults FALSE (`franchisePhase2Flags.ts:37`), (2) every overlay is written `confirmationStatus:'pending'` and the merge drops non-`confirmed` (`ratingsOverlayMerge.ts:50`), (3) the merge consumer has ZERO live callers. So RA-2c is **compute-live, display-dark** — no player sees any rating change; the §6A reward-curve + park-adjust (A2.5) remain the hard blocker before any flag-flip.

**GATE APPROVAL (JK, AskUserQuestion):** **APPROVED — build RA-2c-core now** with the recommended defaults. Legacy move math (`ratingsDevelopment.ts`) untouched; bypass `normalizePerformanceSignal` (its ÷200000 would crush the already −1..1 signal); fan out to one overlay per MOVED rating (the deterministic id already keys on `ratingKey` → collision-free); NO `trackerDb` bump (reuse the registered `franchiseRatingsOverlays` store; only row CARDINALITY changes 1→N). Builder=Codex, auditor=Opus (mandatory for a soul layer).

**4 forks RULED:**
- **Fork A (hitter start-share numerator)** = reuse `franchiseEffectivePosition.startsShare` (`currentTeamStarts/teamCompletedGames`, starting-lineup-based) — the SAME raw number TV uses; the ratings 55% is a threshold swap on it (decoupled from TV's 0.40).
- **Fork B (hitter position source)** = the same report's `effectivePosition`/`poolPosition`; `player.primaryPosition` fallback when the report has no entry.
- **Fork C (hysteresis state)** = **OFF in v1** — `classifyStarterRole` called with NO `priorRole` (dead-band→'bench', the ruled conservative default); no prior-cohort persistence. Real hysteresis = a small follow-up when a state store is sanctioned (anti-flicker is invisible while dark).
- **Fork D (fallback ladder)** = explicit rung-enum reusing `franchiseEffectivePosition`'s INFIELD/OUTFIELD scopes (position-pure → position-group → all-hitters/all-pitchers floor), NOT the salary merge groups; sim-tunable §16.

**Build split (build-then-wire, same scope):** **RA-2c-1** = pure `src/utils/checkpointRatingSignal.ts` (classify poolKey + the ladder + per-pool aggregate + `expectedAndSignal` + blend-by-ratingKey → per-player `signalByRatingKey`), build-dark, exhaustively unit-tested incl. the Fork-4 anchor identity. **RA-2c-2** = the thin wiring (fetch season rows + the effective-position report, call the engine, change `CheckpointRosterEntry.performanceSignal`→per-rating, delete `selectDevelopmentRatingKey`, fan out the persist loop, update the sweep test). v1 simplifications (documented sim-tune): pool-level (not per-category) ladder; `curveBlock` omitted (uses each category's `defaultCurveBlock`); `ageBand` passed but inert (age-blind per the RA-2 ruling).

### 2026-06-24 (attended Hybrid via `/kbl-captain`): A2.4 RA-2b scope — pure cohort-math; grouping + hysteresis-memory deferred to RA-2c

**Context:** RA-2b = the §4 peer-pool aggregator feeding the expected-stats engine's peer comparison. Recon (`wf_59db11e8-354`, 6 agents) found §4's sticky-starter grouping needs data the season BATTING row does not carry (no `gamesStarted`, no position — pitchers have `gamesStarted`, hitters don't) AND the promote-60/demote-45 **hysteresis** implies a STORED prior-cohort, which no current store holds and which the RA-2 ruling forbids (no DB bump, reuse `franchiseRatingsOverlays`). Per the soul-layer no-inference + "surface ambiguous phrasings" rules, surfaced the scope fork rather than picking a reading.

**RULING (JK, AskUserQuestion):** **RA-2b = pure cohort-math only.** New pure module `src/engines/expectedStatsPoolAggregator.ts`, NO live caller (RA-2c wires it), NO DB bump, reuses the existing `winsorizedStandardDeviation` (exported, not duplicated):
- `aggregatePoolStats(members, spreadReference?)` → `poolMeanByCat` (position-pure mean of finite member rates) + `poolSdByCat` (winsorized SD, borrowed from the wider `spreadReference` per §4:65) + `peerPoolSize` (per-category finite count) + `peerValuesByCat` (sorted echo). Feeds the engine's `resolvePoolMeanProduction`/`resolvePeerSd`/`resolvePeerPoolSize` 1:1 (provided-maps path). `poolMeanRating` stays RA-2c's (it is ratings data, not production).
- `classifyStarterRole(startShare, priorRole?)` — the §4:80 sticky dead-band: promote ≥0.60 / demote <0.45, dead-band retains `priorRole` (hysteresis); thresholds are §16 sim-tune defaults.
- `isPeerPoolBelowFloor(count, min=TRUE_VALUE_MIN_PEER_POOL_SIZE=6)` — the thin-pool floor-check (RA-2c climbs the §4:85 ladder).
- `RatingsPoolKey` enum (§4-named: C/cornerIF/middleIF/cornerOF/CF/benchIF/benchOF/SP/RP) — **DECOUPLED** from `salaryCalculator`'s TV `TrueValuePoolKey` (the ruled correctness issue: reusing the TV 0.40 pool hands platoon players unearned rating gains).

**DEFERRED TO RA-2c (explicit forks to surface THEN — RA-2b takes them as inputs so none block it):** (1) the hitter start-share **numerator** (what counts as a hitter "start"; batting row has none — needs fielding/roster); (2) the hitter **position source** for pool assignment (`PlayerSeasonFielding.gamesByPosition` vs roster); (3) hysteresis **state persistence** (the dead-band needs a saved prior-cohort — direct tension with the no-DB-bump ruling, resolve at RA-2c); (4) the §4:85 fallback-ladder **membership** composition (which broader set RA-2c hands `members` per rung, incl. the under-specified "widen position group" order).

**Defaults taken (engineering / §16 — not JK forks):** winsor cut reuses the engine's pinned 5/95 percentile (a §16 sim-tune candidate, flagged); min-pool checked per-category; classifier dead-band with NO `priorRole` → `'bench'` (conservative, §4-aligned: the everyday bar is not granted to an unproven part-time player). Fork-4 ruling honored: RA-2b ships the cheap anchor-identity test (`expected@pool-mean-rating ≈ pool-mean-production`).

### 2026-06-24 (attended Hybrid via `/kbl-captain`): RA-2CQ-2c contact-quality SIGNAL layer — min-sample floor RULED

**Context:** RA-2CQ-2c wires the already-shipped contact-quality season counts (RA-2CQ-2a/2b: `contactQualityGood/Tracked` on `PlayerSeasonBatting`, `weakContactInduced/Tracked` on `PlayerSeasonPitching`) into the expected-stats SIGNAL layer — a new `contactQualityRate` category (batter Contact) + un-dorming `pitchingWeakContactRate` (pitcher Junk). The ticket said "min-sample gate, default 10." Recon (workflow `wf_1a3733a2-fbf`, 6 agents) found the gate is NOT in the adapter — it lives in `expectedStatsEngine.ts` via each category's `basis`: `scaledMinSampleFor('none')` → `minSampleRate` = **10 unscaled** (`expectedStatsEngine.ts:310-315`); `'season'` → 50 scaled; `'combined'` → 20 scaled. The three EXISTING `contact` categories (AVG/OBP/K-avoidance) all use `basis: 'season'` (=50). So the ticket's literal "10" requires `basis: 'none'`, which DEVIATES from the sibling contact categories. Per the soul-layer no-inference rule, surfaced to JK rather than baking the deviation silently.

**RULING (JK, AskUserQuestion):** **`contactQualityRate` = `basis: 'none'` → fixed min-sample floor of 10 ("count early").** Quality-of-contact starts counting toward the Contact signal after ~10 tracked balls-in-play — sooner than AVG/OBP (which need ~50), on a smaller sample. It is a §16 sim-tunable dial, re-validated at RB-16 / L-SIM.

**Defaults taken (not JK forks — clean engineering / no-inference):**
- **Sample denominator = the rate denominator.** `contactQualityRate` sample = `contactQualityTracked` (not PA); pitcher sample = `weakContactTracked` (not BF) — so the gate population == the rate population (good/tracked). Prevents clearing the gate on PA while having ~0 tracked balls.
- **`pitchingWeakContactRate` keeps its existing `basis: 'combined'` (gate ~20).** Its siblings (K-rate, walk-avoidance, HR-suppression) are all `'combined'`, so it is already self-consistent; the "default 10" applies only to the new batter category. The dormant META entry's basis is NOT changed.
- **`SMB4_EXPECTED_STATS_BASELINES` left untouched** — no ratified SMB4 league-mean for quality-of-contact% or weak-contact% exists; will NOT invent one (matches the dormant-category precedent, e.g. `armThrowingRate` has no baseline). Expected falls back to the IV-curve path.

**Build-dark proof (grep):** `toExpectedStatsCategoryRates` + `EXPECTED_STATS_CATEGORY_META` + `expectedAndSignal` have ZERO non-test consumers — adding the category + un-dorming computes a rate but nothing renders/persists it. NO `trackerDb` bump; `iv_oracle.json` disjoint (byte-unchanged by construction).

### 2026-06-23 (attended Hybrid via `/kbl-captain`): Contact-quality measurement — 2 forks RULED + the full classification

**Context:** RA-2CQ-1 (the contact-quality data+signal layer feeding hitter Contact + pitcher Junk). The spec ruled the STRUCTURE (hard > normal > weak; hard PO → neutral-not-negative; FLO graded by hardness; symmetric hitter/pitcher) but left the measurement SHAPE open. Per the no-inference rule, surfaced to JK rather than inferred.

1. **SHAPE = a RATE** (not a continuous 0–1 quality score). JK asked "which is more trustworthy?"; Captain reasoned: the game emits only 5 coarse contact tags, so a continuous average just launders arbitrary per-bucket weights (false precision + a second scale to calibrate); the rate has one knob (the hard/not-hard cut), sits on the same percentile currency as the other rate stats (AVG/OBP/K%), and is symmetric with the already-named `pitchingWeakContactRate` field. → RATE.
2. **GOOD-contact cut = HARD ONLY (strict).** hard = good, normal = neutral, weak + bloop = weak, bunt = excluded.

**Resulting full classification (Captain-derived from the rulings + the already-ruled direction; pure build-dark engine `src/engines/contactQualityAggregator.ts`, RA-2CQ-1 `d97504dd`):** per ball — `excluded` if a strikeout/walk/HBP/SAC-bunt (`K/Kc/Ꝁ/D3K/WP_K/PB_K/BB/IBB/HBP/SAC`) OR a non-contact/bunt tag; `PO` → hard=neutral / else=weak; `FLO` → hard=good / normal=neutral / weak,bloop=weak; all other balls in play (incl. `ITPHR/GRD/SF/FC/E`) → hard=good / normal=neutral / weak,bloop=weak. Hitter `contactQualityRate = good/(good+neutral+weak)`; pitcher `weakContactRate = weak/(good+neutral+weak)`; null below min-sample (default 10, §16-tunable). Shipped as the pure classifier + 2 rate aggregators (the A1.5c pattern); season fields + live writer + meta/adapter signal wiring are bounded follow-ups (mirrors A1.5c → RA-8 → A1.5c-4).

### 2026-06-23 (attended Hybrid via `/kbl-captain`): A2.3 rookie-window + S7b band-source — 2 forks RULED

**Context:** fresh Hybrid session resuming the dual-branch build loop (Branch A `codex/franchise-v1-next` = A2.3 RA-rookie; Branch B `codex/mode1-v1-b` = S7b scout-range re-anchor). Grounding surfaced two genuine forks; JK ruled inline (AskUserQuestion) so the builds dispatch on no guesses.

1. **A2.3 — rookie window = DEBUT SEASON ONLY.** A drafted farm prospect becomes a ROOKIE on first call-up and keeps the development edge only for that season; clears at the next-season rollover. §13B left this open ("next-season rollover OR after N games/AB/IP"). **Captain implementation note (engineering, documented):** implemented as a READ-TIME season comparison — store `rookieStatus.activatedSeasonId`, treat a player as a rookie only when `activatedSeasonId === currentSeasonId` (pure `isPlayerRookie`); **no explicit rollover-clear mutation** (mirrors the season-keyed `rookieScaleActiveBySeason` model; avoids touching the ~20-file rollover path). The `draftedAsFarmProspect` stamp lands on the Branch-A-safe auto-snake wrapper (`franchiseStartupProspectDraft.ts`); the Mode-1 auction-path stamp (`prospectScoutingDraftEngine.ts`, a Branch-B chokepoint) is a deferred Branch-B follow-up. Additive, no `TRACKER_DB_VERSION` bump. RA-5 modifier consumer = future work; A2.3 = field + stamp + badge only.

2. **S7b — band source = RE-DERIVE ON THE AUCTION PAGE.** The farm-auction scout range is re-anchored to the current bidder's scout's overall grade band (band-is-range × chemFit, drop `perceivedValueRange` on this path). **Grounding discovery:** `overallGradeBand` is NOT on `ProspectProfile`/the DTO — it lives only on the report types in the separate `/league-builder/draft` board flow. **RULED:** re-derive the band inline at the auction call site from `prospect.prospectProfile.trueGrade` + the bidding scout's `scoutTierForPosition` tier + a deterministic seed (reusing exported `scoutOverallGradeBand`/`gradeBandToPriceRange`); do NOT persist a band onto the record. The auction band is the bidding scout's own deterministic view and is **not required to byte-match the separate draft-board** (different page, different scout) — the consistency worry dissolved once grounding showed they're distinct flows. No saved-shape change, no DB bump.

### 2026-06-23 (attended): V1 BUILD-SURFACE FORK SWEEP — 11 pre-AUTH-4 decisions RULED (minimize unattended defaults)

**Context:** before an unattended AUTH-4 run, JK pre-answered every genuine STRUCTURAL/scope fork the audit (`wf_b0b25400`) surfaced — so the overnight loop guesses on nothing that matters. §16 magnitudes + build-confirms stay Captain-defaulted (designed-to-be-swept). Rulings:
1. **A1.3 trade-request:** build only the contained **A1.3a propensity filter**; **DEFER A1.3b to an attended session** (it risks a `TRACKER_DB_VERSION` bump + a golden-tested morale-matrix collision — never unattended).
2. **Contact-quality partition:** a **hard contactType-tag OVERRIDES the pop-out penalty** (a genuinely hard PO → neutral, not negative). **FLO is NOT capped** — foul-outs grade on contactType (hard/normal/weak): a hard foul liner ≠ a sky-high foul pop. (FLO → CONTACT by hardness, no power.) Worksheet updated.
3. **Pitcher arm:** SMB4 pitchers have **NO arm rating** (only 7 categories: VEL/JNK/ACC + POW/CON/SPD/FLD). Pitcher non-pitching = **4-tool parity, arm excluded** (RA-1 already null-gates it).
4. **RA-2a:** scoped **REBUILD** to the batted-ball model — power/contact/fielding/speed become categories-of-record; the box-score formulas **retired but left DORMANT in the META schema** (not deleted — reversible).
5. **Fame honor-floor:** fame **fluctuates across tiers** (incl. down; trades nudge one tier toward neutral, `reachFloorAfterTrade:0` already resets the floor); an **all-star/major award flat-pins `reachFloor = max(existing, REGIONAL_STAR)`** — never below regional-star after, live heat still floats higher. JK confirmed it's encodable + not risky; the ONE risk = it inverts a shipped L-SIM "upward-only" soul-invariant → the contract **MANDATES updating that invariant in the same diff + re-running L-SIM.**
6. **First-landing:** tap copy → *"Tap where the ball FIRST hit the ground or wall"* (grep the enrichment-copy tests before the string edit). **IF/OF is NOT a guessed radius** — the spray is already a marker-anchored POLAR model (`EnrichmentPanel.tsx:227`: r=0 home plate · **r=0.45 IF/OF boundary** · r=1.0 fence · foul lines = angular bounds), so IF/OF split = `r<0.45` and carry ≈ `r × park fence-distance(direction)`. **FIELD-LEAK GATE (JK — historical problem): the carry contract MUST verify the drawn field image's markers (IF arc/fence/foul lines) align with the polar model + the viewBox transform (a tap "at the fence" → r≈1.0) before trusting any distance.** Separate historical leak flagged for the A1.5c fielding aggregator: misattribution-through-substitution (`GAMETRACKER_INVARIANTS_FAILURE_MODES_AUDIT.md:127`) — resolve the fielder from the play's event-time position-context, not a late re-map.
7. **Stadium overtake rivalry:** use the **HISTORY** edge slot (narrative/Almanac, **morale-inert**) — NOT RIVALRY (which would double-count the morale the fame-swap already moves). Conditional on the logic/display working.
8. **Swing-record play context:** `{inning, half, outs, base-state, score before→after, batter, pitcher, outcome, wpaSwing}` — reporter composes the sentence, no stored prose.
9. **Lane-merge:** merge Branch B → Branch A, after A-W2 + B-W2, before RB-16/final-L-SIM, **loop pre-assigned as owner.** **+ AUDIT all open branches with unmerged commits before merging** (JK — there are ~28 stray `codex/*` branches with commits; see CURRENT_STATE).
10. **RB-13b:** engineering routing fix (no design call) — route the draft by the selected league's persisted `draftFormat` + a minimal explicit active-league id (not `leagues[0]`); land before the lane-merge.
11. **APPROVED the new A-W1.5 wave** (fame-fix → carry converter → 4 aggregators → stadium records) + the 4 new contracts authored before the run.

**Captain-defaults (NOT asked):** all §16 magnitudes (fielding-ladder weights, fame deltas, 2× rivalry, carry/barrel thresholds, Kc split, blend weights — tier STRUCTURE is ruled, numbers swept in RB-16); build-confirms (x/y populated, per-play WPA, BR/BT coverage, policy-block test-characterization, SVG IF/OF arc); mechanical (build-dark flags, additive no-DB-bump, clone targets, builder≠auditor gate). **No A-W1.5 work bumps `TRACKER_DB_VERSION`** — the only bump risk is the DEFERRED A1.3b.

### 2026-06-23 (attended): STADIUM ANALYTICS V2 — park records as living-season participants + the fame-fluctuation fix — RULED → `STADIUM_ANALYTICS_SPEC_V2.md`

**Context:** JK directed turning ballparks into a first-class living-season system (records/milestones/contextual data tied to parks + players-across-parks, all feeding fame/morale/fan-morale/reporters/relationships/Almanac), and creating a clean v2 spec with NO build-time questions (v1 `STADIUM_ANALYTICS_SPEC.md` is Jan/Feb-2026 stale). Two deep-dives: `wf_c018fc5d` (stadium code reality vs spec + the ratings convergence) + `wf_7e1f0783` (the living-season engine seams = the freebies). Verdict: ~90% freebies. **Full decision-complete spec = `spec-docs/STADIUM_ANALYTICS_SPEC_V2.md`.** Rulings:

- **THE FAME-FLUCTUATION FIX (prerequisite, its own ticket).** Verified the per-game fame writer ratchets the protection floor on EVERY heat peak (`franchiseFameCompute.ts:109` `updateReachFloor(stored.reachFloor, heat)`) ⇒ fame is effectively UPWARD-ONLY for everyone. **RULED:** fame fluctuates freely up AND down; the ONLY thing that locks a floor is an all-star team / major award at season-end, pinning `REGIONAL_STAR` (the tier exists, `fameModel.ts:10`, heat 8). Fix = remove the per-game ratchet; only the L12-5d honor path sets the floor (pinned to regional-star). Separate from the A1.2 WAR-floor *gravity* (upward lift for genuine high-WAR players — unchanged). This GATES the record fame swap (you can't lose fame on an overtake while fame is upward-only). Build-care: verify reachFloor consumption + L-SIM fame invariants + characterized tests first.
- **Carry converter (geometry, NOT factor).** `x/y landing × ParkDimensions → park-adjusted carry feet`, air-balls only, in `src/engines/`, feeding BOTH ratings Power and stadium distance records. **HR distance is USER-ENTERED in feet (SMB console), NEVER inferred** (JK); the converter infers every OTHER air ball. Replace the orphaned random `estimateDistance` (`fieldZones.ts:735`). Park GEOMETRY (carry, what Power needs — built data, missing converter) is DECOUPLED from park FACTOR (statistical home/road → WAR, V8-deferred, separately dark) — never gate the Power/records work behind the V8 factor ruling.
- **Record catalog v1 + the POLARITY SIGN-LAW.** Fame-bearing MAJOR records: farthest-HR by RHB/LHB · most-HRs-here-this-season · most-HRs-ALLOWED (negative) · pos-player + pitcher highest/lowest cumulative WPA here · **largest positive/negative single-PLAY WPA swing here, with play context** (WPA = the fame primitive). Free-on-de-orphan: single-game team-runs/run-diff/no-hitter/perfect-game. Deferred: exit-velo (field not threaded), career-HRs (cross-season scope), WAR-by-stadium (→V8). **Sign-law (JK):** each record has polarity `s` (+ glory / − dubious); SET/BREAK `newΔ=+B·s`; OVERTAKE `newΔ=+B·s`, `oldΔ=−B·s` ⇒ lose a positive record → you drop / new holder rises; **passed on a negative record → you RISE (relieved), new holder drops.** §16 defaults `B_set 2.0 / B_break 1.5 / B_overtaken 1.0` (asymmetric). Double-count guard: pride lives in fame only (the morale row carries fan+teammate, self-0).
- **Two rivalry flavors, both in v1.** (a) PLAYER rivalry — an overtake stamps a persisted relationship edge (old↔new holder, `putFranchiseRelationshipEdge`, RIVALRY/HISTORY slot) — reverses my earlier defer. (b) HOME-PARK team/fan rivalry — derive each visiting team's W-L at your park from the archive; any opponent **>.500 at your park** (multiple allowed) becomes a home-park rival; flip the existing `vsRival` flag → the fan-morale engine's built-in `rivalMultiplier`/`RIVALRY_SWEEP`/`SWEPT_BY_RIVAL` amplify; **set 2×** for this type (freebie infra, `fanMoraleEngine.ts:250,374,405`).
- **Per-stadium stat-display layer (display-only, NOT fame-bearing).** Per-game player stats are archived with `stadiumId` (`playerGameStats`, `gameStorage.ts:43,115`) → per-stadium OPS/ERA/AVG/HR/K splits are a bounded aggregation; surface all park-tied data in the Team Hub stadium tab, filterable by stadium. "Interesting to include," distinct from the fame-bearing records.
- **Mostly freebies + build-dark.** The fame→morale swap path, the morale matrix's native self+fan+teammate output, the records store (orphaned — own db, NO trackerDb bump), the reporter/almanac infra, and the rival fan-morale amplifier all EXIST. New = the detection tap + small injectors. New `isFranchisePhase2StadiumRecordsEnabled()` flag (L14 taken). The records store's `moraleMutationAllowed:false` policy block is likely test-characterized → make the flip flag-conditional, grep tests first.

**Build order:** (1) fame-fluctuation fix → (2) carry converter → (3) Stadium v2 (records→fame/morale/fan/reporter/almanac/rivalry + stat layer). Status: design converged + captured; magnitudes are §16 sim-tune; not yet built.

### 2026-06-23 (attended): RATINGS MEASUREMENT MODEL — full first-principles rebuild (SMB4-native, low-noise) — RULED → `RATINGS_MEASUREMENT_WORKSHEET.md`

**Context:** JK directed a first-principles rebuild of HOW every SMB4 rating is measured from GameTracker data (not box-score defaults), "push back until we find the signal among the noise." Deep-dive (`wf_f6c0aee0`, 12 agents) + adversarial noise-skeptic + a long JK push-back session that materially improved the model (and corrected several of my agents' conclusions). **Full model + complete outcome map + open build-confirms = `spec-docs/RATINGS_MEASUREMENT_WORKSHEET.md` (authoritative).** Headline rulings:

- **One batted-ball-quality engine, two consumers.** Every ball in play is characterized in 3 dims from existing capture — **exit-velo** (`contactType`: hard/normal/weak/bloop), **launch** (out-code `GO/LO/FO/PO/FLO`; hits inferred from **first-landing** IF/OF + tag), **distance/carry** (precise **x/y** `fieldLocation`/`SprayPoint` × `ParkDimensions` → park-adjusted feet; `hrDistance` for HRs) — then read by BOTH the batter (power/contact) and the pitcher (velo/junk), each z-scored vs its own pool.
- **POWER = park-adjusted carry × exit-velo, CONTINUOUS, AIR-balls only** (grounder x/y = first bounce, not carry → 0 power). **CONTACT = squared-up (exit-velo), launch-AGNOSTIC.** ⇒ hard grounder = max contact / 0 power; hard line-OUT = max contact / high power (flat launch costs carry — a robbed near-barrel, don't let the out hide it); pop-up = neither. Drops raw AVG (BABIP-inverted), HR-rate + ISO (park/pull-luck, speed-leaked via 3B). Distance estimated for non-HR air balls from x/y + park; `hrDistance` grades HR power (moonshot ≫ wall-scraper).
- **Outcome map (every button), principle = grade the BALL not the situational outcome:** **FC/DP/TP = ground-outs by contactType** (out-consequence is situational noise, NO extra penalty — JK); **E = grade the ball** (error is the fielder's); **Kc(batter) = APPROACH negative** (took a strike), not a bat-to-ball whiff; IBB/SAC excluded; 3B/ITPHR = ball-carry→POWER + legs→SPEED (split).
- **VELO = contact-SUPPRESSION** (whiffs + weak-AIR induced + foul-offs), **NOT the hardness of allowed contact** (physics — velo makes contact hard-when-hit but rarer; JK caught this). Barrel-rate-allowed = peer-relative SECONDARY negative only (the pool baselines the physics). **JUNK = weak-GROUND induced + ground-rate + chase→weak.** **No velo/junk double-count:** velo's weakness is in the AIR (late/under), junk's on the GROUND (fooled/on-top) — every weak-contact event routes to ONE rating by trajectory; whiffs→velo, chase/rollover→junk. **`Kc` → BOTH junk + accuracy at partial/shared weight** (a backwards K requires command + movement — the junkballer; correlated, not collapsed). **ACCURACY = walk-avoidance (BB only; IBB/HBP carved) + Kc(corner-paint) + per-batter pitch economy.** Drops FIP (cross-contaminates all 3). Fly-ball ruling: pop-up/weak-fly = velo CREDIT (overpowered), deep/hard fly = velo debit — not blanket fly-rate.
- **SPEED = SB% + extra-base take-rate (`calculateUBR`, built-but-never-called → needs the aggregator) + BEAT_THROW** (out-of-box infield-hit vs the IF arm). SB% saturates (send-discipline confound) → lean on UBR. **ARM: IF UNFROZEN (JK)** — `BEAT_RUNNER/(BEAT_RUNNER+BEAT_THROW)` on close plays isolates the throw from range; OF = assists+held/(+extra-bases); catcher = CS%-with-pitcher-discount. **FIELDING = zone+difficulty range** (spray-inferred fielder, needs the *ByPosition aggregator) + GemScore overlay; high-difficulty-only fielder-confirm prompt.
- **PITCHER NON-PITCHING = full 5-tool parity vs the pitcher pool** (NOT a light build — same engine, the sample gate just fires more often). **First-pitch IS trackable** (`pitchCount==1`) → the slayer/prayer TRAIT + Contact's capped approach term (I was wrong that it needs a per-pitch layer). **Reticle/dot mechanic** = why over-expectation is the right SMB4 signal (the rating sizes the reticle, so squaring up beyond the rating IS the signal).
- **Verified data facts:** spray = precise normalized x/y (NOT 7 bands — stale code); park dimensions exist; spray+contactType on hits AND outs; K vs Kc distinct buttons; BEAT_THROW(hits)/BEAT_RUNNER(outs). **Latent bugs spawned as a task:** `eventLog.ts:2174` omits ITPHR/GRD from hits; `:2180` K-counter omits Ꝁ/D3K.
- **OPEN build-confirms (§16/build):** (1) the **first-landing** tap semantic (spec still says "landed OR fielded" — must tighten the instruction, else grounders-through corrupt trajectory/distance); (2) confirm the live spray UI populates x/y; (3) barrel/carry threshold; (4) Kc split weight; (5) IF-arm BR/BT coverage + fielder-tagging; (6) does SMB4 give pitchers a non-zero arm; (7) all weights = §16 sim-tune. **Disclosed confounds:** opponent-quality unnormalized · SB% send-discipline.

**Status:** model converged + captured; thresholds/weights pending §16 tuning; not yet built (RA-2b/RA-2c + the aggregators + the contact-quality data layer all consume this).

### 2026-06-23 (attended): RA-2 follow-ups — TV threshold STAYS decoupled · CONTACT-QUALITY included in v1 — RULED

Two JK measurement questions raised mid-RA-2 (while RA-2a built):

**(1) "Do we update TV logic to match the new ratings start-threshold?" → NO. TV's `RESERVE_STARTS_SHARE_THRESHOLD = 0.40` STAYS; the ratings ~55-60% threshold is DECOUPLED (already the §4 ruling: "decoupled from the TV 0.40, which stays").** The two answer different questions — TV 0.40 = "is he a valued contributor at this position?" (salary / designation eligibility / trade value / race standings / manager firing); ratings ~55% = "should his ratings climb toward everyday-starter level?" (development). The asymmetry is a FEATURE: a 45% platoon player is paid as a useful piece (TV) but rated vs BENCH peers (ratings), so raking-vs-part-timers earns the §4 "played his way into the lineup" promotion. Implementation has ZERO coupling to fix — RA-2 reuses only the granular position + the raw `startsShare` number from the `franchiseEffectivePosition` report and applies its own 55%; it never consumes TV's reserve classification. Changing TV's 0.40 would ripple through a shipped, golden-tested system (salary/designations/trades/oracle) for no ratings benefit. If 0.40 is independently suspect for VALUE purposes, that is its OWN ticket with its own blast radius — NOT folded into RA-2.

**(2) "Should contact QUALITY weigh into the Contact rating peer comparison/curve?" → YES, INCLUDED IN v1 (JK ruled), sequenced BEFORE RA-2c's fan-out.** Grounding correction: contact quality PARTIALLY exists — per-event `exitType` (`ground_ball|fly_ball|line_drive|popup|bunt`) is captured in the ENRICHMENT layer (`eventLog.ts:409`, the EnrichmentPanel), the `clutchCalculator` already has a canonical `contactQuality` map (line_drive 0.85, HR=barrel, etc.), and JK sketched the quality/weak split in `GAMETRACKER_UX_TRANSCRIPT.md:966`. It is OPTIONAL (sparse/inconsistent coverage) and NOT aggregated to a season rate today. **Design (RULED symmetric):** build the quality-contact season stat ONCE and feed BOTH the hitter **Contact** rating AND the pitcher **Junk** rating (the dormant `pitchingWeakContactRate` un-dorments — it is the SAME signal from opposite sides). **Decomposes into:**
- **DATA LAYER** (additive, no DB bump per §3B precedent): new season fields — a hitter quality-contact rate on `PlayerSeasonBatting` + a weak-contact-allowed rate on `PlayerSeasonPitching` (credited to the pitcher facing the weak contact), each with a **separate enriched-batted-ball DENOMINATOR** so the rate's reliability is gated on enrichment coverage (NOT PA). Aggregation wires `exitType` → these fields in `seasonAggregator`, reusing the `clutchCalculator` exitType→quality classification (quality = line-drive / hard grounder / hard fly; weak = popup / bloop / weak grounder).
- **SIGNAL LAYER**: ADD a `contactQualityRate` category to `EXPECTED_STATS_CATEGORY_META` (ratingKey `contact`, additive — RA-1's `expectedAndSignal` iterates categories generically; relies on the live pool mean, no static SMB4 baseline needed); the pitcher `pitchingWeakContactRate` (already in the meta) un-dorments via the new field; extend the RA-2a adapter to map both. The weighted-blend (JK's aggregation ruling) absorbs the new terms with their own §16 weights — zero engine rework.
- **RELIABILITY:** strong min-sample gating on the enriched-event denominator (a player with few enriched batted balls → quality category null-gated; inert for casual non-enriching users — acceptable, the existing AVG/OBP/K% Contact signal still carries).
- **SEQUENCING:** RA-2a (existing-field adapter, in flight) finishes as-is; then the quality data+signal layer; then RA-2b (pool aggregator, picks up the new categories' pool means automatically) → RA-2c (wiring + fan-out). The DORMANT note in the RA-2a contract for `pitchingWeakContactRate` is superseded (now v1-via-quality, not permanently dormant).

### 2026-06-23 (attended): RA-2 (wire RA-1 expected-stats engine live → replace `valueDelta`) — 4 forks RULED

**Context:** Resuming A2.4/RA-2 ("wire RA-1 `expectedStatsEngine.ts` live; replace the single `valueDelta`-driven rating move at `franchiseCheckpointSweepCompute.ts:184`; + a sim-tune curvature check — NEW subsystem, needs fresh grounding"). Grounding workflow `wf_1598c5dc-ad2` (5 readers + adversarial critic) + a Captain direct-read of `ratingsDevelopment.ts:106-149` established: (1) RA-1 is a **pure calculator with no live data plumbed** — to feed it RA-2 must BUILD the keystone that exists nowhere today: a live per-category **position-pool mean/SD/mean-rating** calculator (no module computes a per-category rate mean for a position pool; `calculateLeagueWOBA` is single-blended, `salaryCalculator` percentiles are WAR/$-only). (2) **VERIFIED** the dev-math `computeCheckpointRatingDevelopment` is still the legacy linear Model-A move (`baseScale·signal·morale`, capped ±6, symmetric 0.75 dead-band) with **NONE** of the ratified §6A shape (no convex γ gate, no δ edge-compression, no equilibrium, no confidence weighting) — those are A2.5. (3) `normalizePerformanceSignal` divides by 200 000 → feeding RA-1's already-[-1,1] signal through it crushes it to ~0, so that step must be **bypassed**, not reused. (4) The whole sweep is already doubly-dark (flag `isFranchisePhase2CheckpointEnabled` default OFF + overlays written `'pending'`, merge consumer drops non-`'confirmed'`) → wiring RA-2 changes nothing player-visible until the post-D13 flag-flip. A2.4 row bundles RA-2/RA-3/RA-4: grounding showed they are not cleanly separable (consuming the per-category vector REQUIRES dropping `selectDevelopmentRatingKey` + per-key fan-out = RA-3; the engine's peer-calibration IS RA-4's math) — so "RA-2" = signal + minimal fan-out + live position-pool inputs.

**RULED (JK, AskUserQuestion):**
- **Scope/sequencing = wire the new signal into the EXISTING simple move NOW (dark); §6A curve = the NEXT ticket (A2.5), hard-gated before the flag-flip.** RA-2 stays a bounded plumbing ticket (live signal + pool-calc + weighted fan-out → the legacy linear engine, all behind the off-switch). The §6A range model (convex gate, edge-compression, equilibrium, confidence) + the curvature sim-check + L-SIM are **BLOCKING prerequisites of D13 / the flag-flip** — no displayed rating may change until A2.5 lands. (Chose bounded-ticket over build-both-together.)
- **Per-category → per-attribute aggregation = WEIGHTED BLEND** (soul-layer measurement, spec was silent → JK ruled). A rating's move = a weighted blend of its categories' over/under-performance scores (e.g. Contact ← w₁·AVG + w₂·OBP + w₃·K%-avoid). **Weights are §16 sim-tune dials.** Captain default taken (dark, reversible): **weights default to EQUAL** until the sim pass tunes them (structure/dials exist now, values later — non-equal weights are NOT invented). Each rating moves independently on its own blend; one overlay row per moved rating; preserve the deterministic overlay id `…:${ratingKey}:${sourceEventId}`.
- **Peer group = BUILD the stricter ratings-specific grouping** (~55-60% sticky starter cutoff with hysteresis, ratings-only, DECOUPLED from the True-Value 40% pool — reusing 40% hands platoon players unearned rating gains, a soul-layer correctness issue). Thin pool (< ~6 peers, `TRUE_VALUE_MIN_PEER_POOL_SIZE`=6 governs over RA-1's default 3) → climb the §4 fallback ladder / borrow a winsorized SD from a wider reference, fall to `SMB4_BASELINES` only at the floor. Winsor quantile + per-category normalization scales stay §16 sim-tune.
- **Curvature check = a SIM-GATE before the flag-flip, not before the build** (+ a cheap anchor-identity unit test in RA-2). The meaningful check (borrowed IV dollar-curve SLOPES keep `expected` unbiased for off-mean ratings on LIVE pools across 40/60/80g) needs the live pool RA-2 itself builds, so it cannot precede the build; the roadmap phrase "curvature check before live-wiring" reads as "before the flag-flip" (part of the RB-16/L-SIM gate). RA-2 ships the cheap regression assert `expected@pool-mean-rating ≈ pool-mean-production`.

**Captain v1 boundaries (documented defaults, dark + reversible — surfaced to JK, not silently reduced):**
- **In-place replacement at `:184`** — no new flag (redundant behind an already-OFF flag), no new store, **NO `TRACKER_DB_VERSION` bump** (reuse the existing `franchiseRatingsOverlays` store; only row CARDINALITY changes via fan-out — keep the deterministic id formula exact so idempotent-replay + `soul.ratings-overlay-validity` stay green). The standard 60g L-SIM leg runs LAST (baseline-cadence trap).
- **Arm category stays DORMANT (gated-null) until RA-8** adds the catcher caught-stealing fields — a clean null-gate, not a half-build (RA-1 already nulls categories with no data). **Pitcher non-pitching categories EXCLUDED** → deferred to the co-designed RA-11/B14 (queue cross-pin #2).
- **RA-2 ships age/rookie-BLIND** — the age modifier/curve + rookie modifier are §6A/A2.5 (and RA-rookie/A2.3) work; `ageBand` is passed to the engine but inert (RA-1 doesn't consume it). **Park-adjust (RA-7/A2.5) deferred** → the first live signal is knowingly park-unfair but dark; park-adjust joins §6A as a blocking-before-flag-flip prereq.

**Build:** RA-2 SPLIT (size + clean audit): **RA-2a** = pure build-dark (season-row → per-category-rate adapter [the ISO/HR-rate/K%/BB%/etc. helpers + sample sizes] + the live position-pool aggregator with the §4 stricter sticky peer grouping + thin-pool ladder) → **RA-2b** = the live integration into `franchiseCheckpointSweepCompute` (fetch rows, build pools, derive age band + adaptive config, call `expectedAndSignal`, weighted-blend the per-category `rByCat` per rating, fan out into `computeCheckpointRatingDevelopment` bypassing `normalizePerformanceSignal`, emit one overlay per moved rating, delete `selectDevelopmentRatingKey`; + the anchor unit test). Codex-built → Opus-audited (builder≠auditor) → full host gate, zero-new-reds, branch-only.

### 2026-06-23 (attended): L13-8 CLOSED — relationship wiring already subsumed by L13-3a..6; standalone proof-test WAIVED (L-SIM is the proof) — RULED

**Context:** Resuming A1.1/L13-8 ("flag-gated `processCompletedGame` wiring → L13 fully built-dark; L-SIM blocker"), the dagger anchor re-verify (the contract's `processCompletedGame.ts:616-680` + `franchiseCheckpointSweepCompute.ts` anchors had drifted) found the wiring **ALREADY EXISTS**: `processCompletedGame.ts:648-664` gates all 3 relationship dark computes — `persistDarkRelationshipFormationForCompletedGame` (self-gates on `isCheckpointBoundary`, `franchiseRelationshipFormationCompute.ts:123`), `...Intensity...` (per-game decay), `...Morale...` (per-game, incl. the L13-6 charged-matchup) — behind `isFranchisePhase2L13Enabled()`. Branch added by `f737c67e` (L13-3a — the "was §3's L13-8 wiring" breadcrumb). Orphan-checked: exactly 3 computes, **all wired**. ⇒ the L-SIM blocker was already cleared. The only remaining L13-8 deliverable was a flag-gating proof-test — but a faithful one (flag-off→no writes / flag-on+checkpoint→formation / flag-on+non-checkpoint→only decay+charged) needs to drive `processCompletedGame` through the full gate-chain with per-store DB inspection = **L-SIM-harness work**, not the billed "small" unit test.

**RULED (JK):** Close L13-8 — wiring DONE; the standalone proof-test is **WAIVED**. The L-SIM (flags-on, which exercises the L13 branch) + the per-compute tests + the L-SIM final gate on the merged tree are the proof. (Scope surfaced before adjusting, per scope discipline — not silently reduced.)

### 2026-06-23 (attended): FAME→MORALE taps (A1.2 legs) — §20.5 = CHANGE-ONLY, §20.6 = CHANNELS A+B — RULED

**Context:** A1.2 (the fame→morale wiring, an L-SIM blocker) was SPLIT after grounding (workflow `wf_023e81ed-68a`): **leg-a** = the fame WAR-floor gravity patch (fork-free, ratified continuous/upward-only — DONE, commit `bc24dff4`); **leg-b** = the §20.5 fame→player-morale tap; **leg-c** = the §20.6 fame→fan-morale producers. The two later legs each carried a soul-layer fork the grounding surfaced; JK ruled both (attended).

**RULED (JK):**
- **§20.5 fame→player-morale signal = CHANGE ONLY (per-game `heatDelta`), NOT level+change.** The tap reacts to fame RISING/FALLING (a rising unknown gets a boost; a fading star takes a hit), scaled by the existing personality + hidden-modifier multipliers (`composeMoraleConsequence` applies the tilt for free). JK chose the leaner model over the spec-faithful "level + change" recommendation. **SCALAR (JK 2026-06-23): `heatDelta` = NET heat movement (`heat − prior heat`, INCLUDES the per-game decay haircut), NOT raw fame earned this game** — matches the literal "heatDelta" + the §20.5 both-directions text (rises AND fades). **PRODUCER = Option B:** `persistDarkFameRecordsForCompletedGame` returns per-player `{playerId, heatDelta}`; a NEW emitter in `processCompletedGame` after the fame compute reuses the designation-morale plumbing (`resolveHiddenModifiers`/`currentMoraleValue`/`composeMoraleConsequence`→`applyFranchiseMoraleMatrixConsequence`) → fame stays morale-free, avoids the L12-3b/4d transitive-import mock-break. Contract = `A1.2b-FAME-PLAYER-MORALE-TAP`. ⚠ This INTENTIONALLY DROPS, for v1, the §20.5 prose "chronic low fame is a standing morale drag for an Egotistical player" (a fame-LEVEL standing term) → **deferred to v1.1.** **SPEC FOLLOW-UP OWED (purge-on-supersede):** annotate `FRANCHISE_V1_LIVING_SEASON_SPEC.md §20.5` "v1 = change-only; standing-level drag deferred" when leg-b is authored. Producer placement = inside `persistDarkFameRecordsForCompletedGame` (heatDelta cheaply available there). Plumbing default taken: extend the `MoraleMatrixEvent` `kind:'fame'` variant with a typed `heatDelta` field (cheap, in-pattern — mirrors relationship's `chargedMatchupResult`).
- **§20.6 fame→fan-morale scope = CHANNELS A + B (both).** **Channel A** = fame-as-VOLUME amplifies the existing per-GAME crowd swing (`createGameMoraleEvent` finalImpact — there is no per-play fan-morale pipeline in v1), attributed to the game's STANDOUT (hero/goat), × the already-built designation tilt (`applyDesignationSwingTilt`: Fan-Favorite ups hit harder, Albatross downs hit harder). **Channel B** = a steady per-game warmth drip for a team's HELD Fan-Favorite (`computeDesignationSteadyFanSentiment`, engine exists but orphaned), gated `isFranchisePhase2MoraleEnabled`, idempotent via a game-keyed sourceEventId; Albatross steady stays 0 (the §13 flashpoint system owns that irritation — double-count guard). Channel C (designation→fame +2/−1 naming seed, §20.4) already built (L7b), OUT of A1.2. **STANDOUT (JK 2026-06-23)** = each team's BEST player that game (per-team top `totalWpa` from `gameState.playerWpaTotals` / the POG `overall`), NOT the fame-event headliner. **VOLUME (JK 2026-06-23) = BOTH fame AND infamy amplify** — volume = NOTABILITY off |fame| (U-shaped, min at neutral; the designation tilt still supplies direction), spec-faithful (§20.6 "an Immortal Legend's heroics thrill the crowd; a Despised player's gaffe enrages it"). **Defaults taken (non-soul):** CONTINUOUS curve (not tier-stepped — consistent with the continuous fame-floor ruling); **DOUBLE-DARK fame read** (author `computeFameVolume` + the `getFranchiseFameRecord` read, flip NO flag — with fame dark the volume floors to 1.0, so Channel A = base×tilt until the fame flag flips post-D13); matrix-wrapper apply (`applyFranchiseMoraleMatrixConsequence`, flag+idempotency for free). **Structural note:** the per-game base swing (`createGameMoraleEvent`) is currently figma-EPHEMERAL only (not in the dark Phase-2 path) — leg-c wires it into `processCompletedGame` for the first time as new `persistDarkChannelA/BFanMorale…` writers (re-derive `GameResult` + standout from `gameState`). leg-c size = MODERATE, build-dark, gated `isFranchisePhase2MoraleEnabled` (grounding `wf_5d8a9786`).
- **All §20.5/§20.6 magnitudes** (gravity strength, channel weights, the fame-volume curve, decay) stay §16 sim-tune placeholders — L-SIM owns them.

**Build:** A1.2-leg-a DONE (`bc24dff4`, upward-only gravity, full-suite zero-new-reds). **leg-b** (§20.5 change-only morale tap) + **leg-c** (§20.6 A+B fan producers) = the next fame tickets, build-DARK behind the Phase-2 morale/fame flags. Grounding open sub-items for the leg-b/leg-c contracts: §20.5 needs new `kind:'fame'` event plumbing + a builder/caller; §20.6 Channel A needs the fame-volume multiplier defined (new) + the standout-attribution wired onto the per-game producer.

### 2026-06-22 (attended): SCOUTING v2 — per-tool confidence bands + scout draft (SUPERSEDES the overall-grade model) — RULED → `SCOUTING_SYSTEM_SPEC.md §1A`

**Context:** JK redesigned scouting accuracy. Audit `wzhrggi4m`: current model is a single OVERALL-grade Gaussian fuzz + one IV-range width + a 20-80 overall — NOT per-tool, gameable (jitter centered on truth, 2 scouts average toward it). Scout ENTITY already exists with `accuracyByPosition` (the hook).

**RULED (JK):**
- **Reveal ACCURATELY:** name, age, primary + secondary position, **archetype** (the §5.6 family — gives shape; requires B12 to persist it on the prospect).
- **Traits = COUNT only (0/1/2), identities + pos/neg HIDDEN** until call-up (part of the hidden profile). ⚠ Change from current build (which reveals trait1/trait2 names) → replace with `traitCount`. The trait effect is already in the true grade, so the grade-band reflects it without naming them.
- **OVERALL grade = a LETTER-GRADE band**, width by confidence: HIGH 3 / MEDIUM 5 / LOW 7 grade-bands; true grade uniform-random in the band.
- **Each TOOL = a 0–99 numeric band in groups of 10**, width by confidence: HIGH 30 / MEDIUM 50 / LOW 70 pts; true value uniform-random in the band. 5 hitter tools (POW/CON/SPD/FLD/ARM), **7 pitcher (VEL/JNK/ACC + POW/CON/SPD/FLD, no arm)**.
- **Un-gameable:** uniform-in-band placement (`L ∈ [max(0,true−W), min(true,99−W)]`), deterministic seed; NOT always mid/top/bottom.
- **Derived overall + auction price** from the banded overall (off the scouted, never true, grade).
- **ONE scout per team via a SCOUT DRAFT** (pool = 3× teams) BEFORE the MLB draft. Each scout = exactly **2 specialty (HIGH) + 2 blind-spot (LOW) positions, rest MEDIUM**; confidence for a prospect = the scout's tier for that prospect's primary position. Strategic risk: commit the scout pre-MLB-draft; straying from his specialties makes him less useful by farm-draft (intentional fun). One scout ⇒ no triangulation.
- **⚠ SUPERSEDES** SCOUTING_SYSTEM_SPEC §2.1/§3/§4 + IV §7.4 + AUCTION_DRAFT_SPEC_V2 §3.1/§3.4. **Build must REPLACE the old overall-grade fuzz / single IV-range / 20-80-off-letter, not add alongside** — explicit dead-code cleanup so the old model can't leak (JK directive). Build = S1–S7 (§1A.4); reusable scaffolding = scout entity + accuracyByPosition, seeded RNG, GRADES ladder, PlayerArchetype type, reveal ceremony, secondaryPosition.

### 2026-06-22 (attended): PROSPECT pitcher batting — varied + real-anchored, decoupled from grade shift (no uniform-worthless pitchers) — RULED → `PROSPECT_GENERATION_SPEC.md §5.7/B14`

**Context:** JK flagged that pitchers must not be generated as uniform-worthless hitters (they bat/run/field in our no-DH franchise; good-hitting/two-way should emerge). Audit `wdsaa71bp` found a real gap:
- The generator DOES draw pitcher batter ratings, but the grade solver's uniform shift moves **all 8 attributes together** → pitcher bat/run/field is **grade-coupled** (low-grade → floored ~20, high-grade → dragged up), predictable, no texture; centers ~2× too high (power/contact 35 vs real 15.8/16.3); **arm drawn ~55, should be 0**; σ=7 symmetric can't reproduce the real skew.
- Real 205-pitcher anchor: power 15.8/σ15 (median 11, tail→77), contact 16.3/σ16 (→99), speed 26.5/σ21, fielding 56.3/σ22, **arm=0 ALL 205**, **3/205 two-way bats**.

**RULED:** (1) decouple — grade shift applies to velocity/junk/accuracy ONLY for pitchers (bat/run/field/arm stay at independently-drawn base); (2) re-anchor the pitcher batter draw to the real skewed distribution (low-median/long-tail), arm forced 0; (3) regression test vs the anchor (means/σ, arm=0, ~1.5% two-way emergence). Generator-only, no DB change. Build task B14. (The 20/20/20 in the verified examples was analyzer-isolation, NOT the target.)

### 2026-06-22 (attended): PROSPECT GENERATOR uniqueness audit — ratings OK, traits/age are the sameness; add LARGE archetype layer — RULED → `PROSPECT_GENERATION_SPEC.md §5.5b/§5.6/§14`

**Context:** JK worried prospects are too similar at a grade. Deep dive `we2bpqsw7` RAN the live generator (n=400).
- **Ratings are NOT cookie-cutter (better than feared):** canonical kbl-mode1 uses generate-score-correct (independent per-tool σ=7 draw + a single uniform grade-hitting shift that PRESERVES shape). Empirical grade-B hitters: avg within-player tool SD 9.2; real archetypes emerge (power+arm corner POW76/ARM81/SPD47 vs contact+glove CON72/FLD77 vs balanced). B1/B9 BUILT. But variety is MODEST (σ=7 low end, symmetric, fixed position bias) → no deliberate specialists.
- **The real sameness = TRAITS + AGE:** traits drawn FLAT uniform over the 29/17 pool with NO grade/scarcity link (an A as likely as a D to roll a rare trait) + 30% have 0 / 50% have 1 → thin AND interchangeable. AGE is a DEAD axis — ruled (§10) to be generated skew-young but code STILL hard-codes 18 (B8 unbuilt) → every prospect reads 18.
- **Other axes GOOD:** handedness, secondary position, chemistry, personality (canonical-7 in mode1), arsenal all genuinely varied (several pinned to real-440).

**RULINGS (JK):**
- **Archetype layer (§5.6, B12):** add archetypes — but a **LARGE/parametric set** (recognizable families × randomized per-instance magnitudes → effectively non-repeating spreads; genuine specialists allowed; position-weighted not forced). Applied as an extra bias before the grade solve. **SAFE not because "grade ignores shape" (it doesn't — `scoreSmb4Player` weights by position, nonlinearly; JK caught the bad shorthand) but because the §5.2 loop RE-GRADES the finished profile with the real analyzer and corrects the level until it matches** (the generator is tied to the analyzer in-loop; B9 asserts the round-trip). ⚠ Guard: extreme archetypes near grade extremes can clamp-bind before convergence → re-draw/scale (taper bias near A/D). σ=7 noise stays on top.
- **Grade/scarcity-weight traits (§5.5b, B13 — biggest lever):** replace the flat uniform trait draw with grade+scarcity weighting (reuse the analyzer's per-trait impact coefficients + `genWeight=1−traitWeight`); optionally lift the count split for high grades.
- **Build age (B8):** the §10 age ruling is unbuilt — implement the skew-young draw (currently dead at 18).
- Hygiene: §14 build checklist is STALE re: which copy (kbl-mode1 already built B1–B9); retire/sync the stale kbl-tracker generator copy (non-canonical personality pool).

### 2026-06-22 (attended): Snake draft STAYS user-selectable in v1 — the §9.A-vs-§9:411 tension RESOLVED (RB-13 / RB-13b)

**Context:** During the AUTH-4 RB-wrapper run, the Captain flagged a spec contradiction (D-13a-2): `auctionEngineConstants.ts`'s header comment says "auction is the v1 primary and ONLY format; snake = v1.1 fallback," while `AUCTION_DRAFT_SPEC_V2.md` §9:411 says "the league setup lets the GM choose auction (default) vs snake." RB-13a shipped the picker offering BOTH (default auction), leaving the question of whether snake should be selectable in v1.

**RULING (JK):** **Snake IS user-selectable in v1.** §9:411 wins — the format picker keeps both Auction (default) and Snake options. The §9.A "auction is the v1 only format" comment is superseded; a follow-up should soften/correct that `auctionEngineConstants.ts` comment so it stops implying auction-only. **Consequence:** RB-13a's picker (offers both, persists `draftFormat`) is CONFIRMED correct. **RB-13b is therefore a real ticket** (not moot): it must wire the hub/draft flow to route auction-vs-snake by the selected league's `draftFormat`. The remaining RB-13b ENGINEERING fork (no global active-league anchor — both draft pages self-pick `leagues[0]`, and the draft routes are static no-param paths) is left to the RB-13b builder to resolve with a documented default (e.g. per-league "Draft" actions in the CURRENT LEAGUES list that route by that league's `draftFormat`, threading the leagueId to the draft page).

### 2026-06-22 (attended): RATINGS cohort — bench-vs-bench (mostly built) + pitcher hitting/fielding (no arm) — RULED → `RATINGS_ADJUSTMENT_SPEC.md §4/§4A`

Two cohort extensions, both verified (`w0jtczz20`):
- **BENCH cohort:** cohort = position-group × ROLE (starter/bench). The starter/bench split ALREADY EXISTS + is the live cohort key (`franchiseEffectivePosition.ts` RESERVE pool, derived per-checkpoint, never stored); bench is ALREADY scored vs bench, and auto-promotion (start-share crosses the line → leaves RESERVE → measured vs starters) is existing behavior. GREENFIELD = split the single all-bench RESERVE pool into **bench-IF / bench-OF** (per-position too thin for the 6-peer floor).
- **THRESHOLD raised (RULED):** the TV `RESERVE_STARTS_SHARE_THRESHOLD = 0.40` is TOO LOW for ratings — a 40%-of-games player is a weak-side platoon/timeshare guy whose rates are matchup-context-inflated; promoting him to the everyday bar = unearned gains. Use a **ratings-specific ~55–60% threshold** (decoupled from the TV 0.40) + **role hysteresis** (promote ~60%, demote <~45%) so platoon guys stay in the bench cohort and don't flip pools. **Rate stats** (per-PA) already mean volume isn't the issue — context is. Handedness/platoon-context expectation = v2 (park-factor data carries handedness splits). Numbers sim-tunable.
- **PITCHERS HIT, RUN, AND FIELD (no arm) — fielding is DEFENSE, not batting (JK correction):** a pitcher's non-pitching ratings = HIT (power/contact, from batting) + RUN (speed, from baserunning) + FIELD (fielding, a DEFENSIVE rating from his fielding plays *while pitching* — comebackers/covers → `PlayerSeasonFielding`, NOT a batting stat). All calibrated within the PITCHER pool, all move at checkpoints; **no arm** (all 205 have `arm=0`). SP/RP split for the pitching ratings; hit/run/field self-gate via min-sample (RPs barely bat). Substrate present; GREENFIELD = per-rating decomposition (power/contact from batting, speed from baserunning, fielding from fielding events) + SP/RP keying + wiring. ⚠ Build must confirm the tracker credits the pitcher on comebacker putouts/assists.

### 2026-06-22 (attended): RATINGS measurement verified — catcher CS tracked (my earlier intel WRONG), park factors exist-but-unwired, season-scaling needs min-sample+confidence — RULED → `RATINGS_ADJUSTMENT_SPEC.md §3B`

Three verifications (`wp4etx4cc`), all changing the design:
- **CATCHER THROWING IS TRACKED — earlier "credited to pitcher" REFUTED.** Every CS/SB event carries `catcherId`+`pitcherId`; the WPA layer already splits **CS catcher 95% / pitcher 5%**, **SB-allowed pitcher 55% / catcher 45%** (`kblWpaAttribution.ts:1374-1378`) — exactly JK's target. → **catcher arm HAS a v1 signal** (inelastic per JK); add stored `caughtStealingAgainst`/`stolenBasesAllowed` to `PlayerSeasonFielding` (field-add, NO DB bump). **Removes catcher from the trait §8C position-mismatch list**; residual mismatch = **IF arm only** (assists ≠ arm strength). Per-position arm: OF=assists/baserunnersHeld (stored), C=CS-split, IF=weak-proxy.
- **PARK FACTORS exist + per-game-known but are NOT applied to WAR** (orphaned/deliberately build-dark "preview-only, consumers blocked"). JK's "they impact WAR" is half-right (machinery there, not wired). → for the ratings signal, **park-adjust production per-game ourselves (v1, net-new)**: normalize each game's per-category stats by that game's `parkFactors[category]`. Prevents bandbox over-credit. (WAR un-blocking = its own future ticket.)
- **SEASON-SCALING:** cadence is exact (~8 games/cp: 40g→standard, 80g→frequent, verified) and `franchiseAdaptiveStandards` scales WAR/awards/traits — but the ratings sweep imports NEITHER it NOR any min-sample gate, and cp1 samples are thin (SP only 1–2 starts). → **RULED: season-scaled min-sample gate** (`scaledThreshold`, the `traitRealityScorer` precedent; below floor → no move) **+ confidence weighting** (move magnitude × `accumulatedSample/scaledFullSeasonSample`). Early checkpoints nudge, late move fully — uniform cap preserved. Cadence guidance = pick to keep ~8 games/cp.
- **Small pools (JK correction): keep the comparison position-pure** (catcher-vs-catcher — a raking catcher matters BECAUSE catchers can't hit); do NOT shrink toward all-hitters. Only borrow a stable SPREAD (SD) for thin pools; robust-SD/winsorize the SD estimate (never caps the player's own credit). Milestones/historic games → FAME, not ratings (confirmed).
- **ARM = most inelastic category (RULED):** small steps everywhere; **C + OF only**. Catcher moves (best data, CS split). OF *can* move but the min-sample gate decides per-player (sparse assists → most OF won't clear the floor in short seasons — fine). **IF arm FROZEN v1**; JK's BR/BT (beat-runner/beat-throw) close-play signal DEFERRED to v2 (overkill for an inelastic category). Confidence/nudge ramp CONFIRMED. Short-season robustness validated via revised archetype arcs (phenom 40g→72 / 60g→76 / 80g→80 — scales with length, all meaningful).

### 2026-06-22 (attended): RATINGS SIGNAL — performance vs PEER-CALIBRATED EXPECTATION (the "fixed absolute"); equilibrium bound replaces the grade-cap — RULED → `RATINGS_ADJUSTMENT_SPEC.md §3/§3A/§6A`

**Context:** JK pushed back on the one-grade-per-season cap (harder to do well the lower your baseline → a C-rookie can't easily outperform peers; there should be an outsized reward when he does, enabling him to sustain it). Proposed using **expected performance from ratings** (power/contact/speed/fielding/arm → expected stats) vs ACTUAL to measure how impressive a performance is, plus an **inverse relationship between ratings and growth-rate**, performance still the gate. Asked if this is the "absolute" I'd floated + a better compromise.

**RULING (JK) — refines the earlier "relative percentile" signal (does NOT revert to naive absolute):**
- **Signal = ACTUAL vs PEER-CALIBRATED EXPECTED, per attribute category** — the *fixed* version of "absolute": expectation is peer/position/league-calibrated so it can't inflate, while capturing over-expectation MAGNITUDE + the inverse-with-baseline reward that raw peer-percentile threw away. Beats pure-absolute (inflates) and pure-percentile (flat).
- **Inverse ratings↔growth-rate via EDGE COMPRESSION (both ends) = the primary governor:** cheap points down low, expensive toward 99 (hard to lose near 0). Low-rated overperformer leaps; elite player only meeting his high bar barely moves.
- **DROP the flat one-grade seasonal cap → EQUILIBRIUM bound:** as a rating rises its expectation rises, the gap closes, it converges to the performance-justified level (a 58 hitting like a 90 → ~90, not 99). Only a far-out ~25-pt safety rail remains, non-binding.
- **Performance still the gate:** met-expectation = dead-band = no move; the rare bad-tools-good-production breakout is what's rewarded.
- **Feasibility (`w1yg079a5`): buildable, ~70% plumbing present** (actual per-category stats fresh each checkpoint; position-peer percentile engine; live league-mean normalizers; per-attribute curve shapes). GREENFIELD keystone = ratings→expected-per-category model (none exists; all engines run actual→value) + per-category signal fan-out (today: one TV-$ scalar → one hash-picked attribute, `franchiseCheckpointSweepCompute.ts:184`) + live-league-mean wiring + min-sample guard.
- Examples recalibrated (Appendix A): phenom 58→82 (+24, was +13); ace flat; aggression concentrated at low baselines.

### 2026-06-22 (attended): RATINGS RANGE — aggressive-when-warranted convex curve, both-end edge compression, ~~soft seasonal damping~~ → equilibrium bound (refined above) — RULED → `RATINGS_ADJUSTMENT_SPEC.md §6/§6A`

**Context:** JK on the volatility tension — want one season to FEEL like multiple (meaningful growth/decline) without erratic checkpoint-to-checkpoint ping-pong. Current engine (`ratingsDevelopment.ts`): `maxAbsDelta:6`/checkpoint, SYMMETRIC dead-band `0.75`, morale mult 0.5–1.5, but **no seasonal bound + no anti-reversal** → both too-erratic and too-much-cumulative (10 cps × ±6 = ±60/season possible).

> ⚠ The "soft seasonal damping / one-grade backstop" bullet below was SUPERSEDED the same day by the RATINGS SIGNAL entry above — the grade-cap is dropped in favor of the equilibrium bound. The convex curve, both-end edge compression, and anti-ping-pong rulings stand (the convex curve now acts on the over-expectation gap, not a raw percentile).

**RULING (JK):**
- **Aggressive WHEN WARRANTED, not small.** ±1–2 "may as well be zero" (traits + mojo already swing the profile that much). A truly-elite-vs-peers, SUSTAINED season can move a key attribute **~a full grade level**; a marginally-above-peers player barely moves. Symmetric for collapse (→ demotion/trade-bait). The leap must be EARNED but is possible.
- **Convex reward curve on the relative signal** (`Δ = sign(r)·baseScale·((|r|−startBar)/(1−startBar))^γ`, γ>1): marginal performers get tiny moves, only the deep tail (elite/collapsing) approaches the per-checkpoint cap. The grade-level leap requires staying in the tail across MANY checkpoints (per-checkpoint capped → must accumulate). *Worked feel:* average SS playing elite-vs-SS → special climb; power RF marginally > RF peers → little power movement.
- **Edge compression at BOTH ends:** harder to gain near 99 AND harder to lose near 0 (extends the earlier near-99-only rule). Elite tiers need genuinely elite sustained play; floor players resist cratering. Great arcs from undeveloped bases; hard for already-great players to go elite→elite+ in one year.
- **Soft seasonal damping (not a hard cap):** cumulative same-direction movement adds progressive resistance + a hard backstop ≈ one grade level. Organic deceleration; **cadence-independent** (season total binds → more checkpoints = smoother, not bigger).
- **Anti-ping-pong:** directional hysteresis (reversal needs a higher bar than continuation) + slow aggregate-base signal + asymmetric dead-band.
- All numbers = §16 sim-tune placeholders; calibrate the grade-level backstop against the `smb4GradeEmulator` band width.

**TRADE / "change of scenery" (RULED §6B): accumulator reset ONLY.** On a trade, reset only the seasonal cumulative-movement accumulator (keeps current ratings, regains room-to-move → faster recovery IF earned via the relative gate). Full rating reset rejected; temp recovery boost NOT built in v1 (revisit post-v1 only if sim shows it's too weak). Win-win deadline-trade incentive; performance-gated so not a free win. Wiring: trade/roster-movement path zeroes the §6A(c) counter; no new store.

### 2026-06-22 (attended): PROSPECT AGE — generate real age (skew-young, full-range, revealed) — RULED (REVERSES prior removal) → `PROSPECT_GENERATION_SPEC.md §10`

**Context:** JK: farm rosters span low-A→AAA, so prospects can be **any age** — they must NOT all be young vs the 440 MLB pool, but should **skew young**. Age should be a draft factor revealed to GMs ("do I want a 40yo who may regress on arrival, or a younger player all else equal?") for more dynamic farm teams + a more interesting limited-info draft. Verified (`wmehpv790`): the canonical generator hard-codes `age: 18` for EVERY prospect (`prospectScoutingDraftEngine.ts:1116`, const `:414`); `PROSPECT_GENERATION_SPEC §10` (+ C5/B8) explicitly REMOVED age (a Captain default 2026-06-21); the canonical farm-auction UI doesn't even render age. MLB pool ages: 19–42, mean 28.9, median 29 (veteran-skewed).

**RULING (JK — reverses the prior removal):**
- **Generate a real age — WIDE band, skew young:** band-weighted over the §5 age bands so the MAJORITY (~70%) fall in the two youngest (18–24) but a real tail reaches 32+ (~12%) and into the 40s. Placeholder weights (sim-tunable): 18–21≈40 / 22–24≈30 / 25–31≈18 / 32–35≈8 / 36+≈4. Deterministic/seeded; band-weighted (not a clamped normal). *(Refined 2026-06-22: widened from the earlier μ≈21,σ≈4 to honor "wide band, majority young".)*
- **Age is INDEPENDENT of ratings/traits/grade at generation (RULED):** no age term in generation → stars (and busts) at ANY age band. "Most prospects young AND undeveloped vs MLB" = two independent facts (youth from the age dist; undeveloped from the §3.2 grade dist) — do NOT correlate.
- **Reveal age to GMs** in the canonical farm-auction draft (`LeagueBuilderFarmAuctionDraft.tsx`, currently not rendered); age is VISIBLE (a rare hard fact since ratings/IV are obscured).
- **Age affects post-arrival TRAJECTORY only:** an old prospect regresses via the ratings §5 age curve once on the MLB roster — this never touches the (age-independent) generated ratings. Makes the GM trade-off real (old star = great now but regresses).
- Build: replace the fixed const + delete the `§10` gate comment; fix `DraftFlow.tsx` dummy ages; `yearsInMinors` stays dropped. (Spec §10/C5/B8 updated.)

### 2026-06-22 (attended): ROOKIE vs FAN HOPEFUL — distinct; don't reuse the salary marker — RULED → `RATINGS_ADJUSTMENT_SPEC.md §13B`

**Context:** JK corrected a conflation. **Fan Hopeful** = per-TEAM, team-singular farm designation (the headline prospect fans are excited about; drives fan morale) — already built/live (`computeTeamFanHopefuls` → `team.fanHopefulPlayerId`, top-3-by-visible-grade seeded pick), **leave as-is**. **Rookie** = per-PLAYER: **every player drafted in the farm prospect draft, upon FIRST call-up** — but **NOT** an MLB veteran sent down (to make room) then recalled. Orthogonal concepts (a Fan Hopeful on the farm is never a rookie).

**RULING (JK):** my earlier §13B reuse of `rookieScaleActiveBySeason` is WRONG — verified (`wmehpv790`) it fires on EVERY call-up incl. recall (`franchiseRosterMovement.ts:347-350`) and is never cleared → a recalled veteran wrongly gets it. Correct model:
- New first-class **`draftedAsFarmProspect`** flag stamped at prospect creation (not the brittle `sourceDatabase` string).
- New **`rookieStatus`** set true ONLY when `firstCallUp===true` AND `draftedAsFarmProspect===true` AND no prior activation (firstCallUp already excludes recalled vets + stock-MLB players). Add a **rookie-window clear** (none exists today).
- Visible ROOKIE **badge** via the existing badge `<span>`; do NOT add `ROOKIE` to `FranchiseDesignationType` or the team-singular designation store.
- Risk LOW: per-franchise Player DB is schema-free → no DB bump; update `franchiseRosterMovement.test.ts` (+ a new recalled-vet-isn't-rookie test).

### 2026-06-22 (attended): Trait POSITION-MISMATCH — protect + flag, don't prevent — RULED

**Context:** JK flagged that a player could lose a trait at a position whose stats can't defend it (catcher with Cannon Arm). Analysis `wfzg5s1tu` CONFIRMED it (build-dark, latent): the arm signal is OF-assists-only (catcher CS isn't tracked → credited to pitcher; IF throws log as assist/DP), so a regular catcher/IF reads "artificial weak arm" → unfair loss + can't re-earn. Blast radius is NARROW — only the arm family (Cannon Arm/Noodle Arm); all batting/pitching/baserunning signals are universal-by-role. → `TRAIT_GAIN_LOSS_THRESHOLD_SPEC.md §8C`.

**RULING (JK):** protect strongly + make it transparent; do NOT build the schema-level cure.
- Canonical `POSITION_MISMATCH_UNREGAINABLE` (trait × position) map (v1: arm family at C/1B/2B/3B/SS). (DH dropped — position removed.)
- Held mismatch traits = **much harder to lose, NOT impossible**: suppress the artificial-zero-signal self-loss (treat as no-signal), + a strong keepScore boost / much-higher displacement bar (a far-stronger trait can still rarely bump it).
- Accept un-regainable (no valid signal at that position) — do NOT build the catcher-CS-event / per-position-cohort cure (avoids a trackerDb bump).
- **Scout draft flag:** "this player has a unique trait that could be lost and not regained — heads up." **Roster Analyzer:** must NOT undervalue un-regainable-trait players; surface the flag.
- Generation NOT restricted (a catcher with Cannon Arm is a valuable flagged feature). DELETE the spec-cut Noodle Arm from BUILDABLE_TRAITS (separate cleanup).

### 2026-06-22 (attended): RATINGS adjustment — one engine, RELATIVE signal, integrated age model — RULED → spec `RATINGS_ADJUSTMENT_SPEC.md`

**Context:** Applied the trait-design treatment to ratings. Research `wy351xzbq` found **FOUR divergent rating-mutation models, none implementing the spec, and NO canonical age curve**: (A) in-season dev-math `ratingsDevelopment.ts` (own-TV×morale, ±6 cap, dead-band 0.75 — built but triple-dark); (B) EOS `computeNetChange` war×1.5+crude-age (built+WIRED+persisted, ignores spec); (C) `agingEngine.ts` phase random-walk (orphaned/display); (D) the spec's peer-median×grade-asymmetry math (implemented by nobody). Full RATINGS spec to be authored.

**FOUNDATIONAL RULINGS:**
- **Consolidate onto ONE adaptive engine** — in-season checkpoints + EOS as the final checkpoint (mirrors the trait EOS ruling). Retire B (war×1.5) + C (random aging walk) as live paths; deprecate award-luck. Everything else builds on this.
- **⚠ REVERSED → RELATIVE, then FURTHER REFINED** (see the 2026-06-22 "RATINGS SIGNAL" entry at top): first reversed from naive absolute → RELATIVE peer-percentile (absolute own-vs-expected inflates a strong league); then refined to **actual vs PEER-CALIBRATED EXPECTED per category** — the *fixed* absolute, which keeps the anti-inflation property (peer-calibrated) AND restores over-expectation magnitude + the inverse-with-baseline reward that raw percentile dropped. Net signal of record = peer-calibrated over-expectation.
- **Deterministic** (NOT seeded-probabilistic like traits) — ratings are continuous, so magnitude is the gradation; clear the dead-band → move. Reproducible.
- **Integrated relative model (RULED — the four combine):** PRIMARY = percentile vs **position group** (C / corner-IF / middle-IF / corner-OF / CF; SP / RP; **NO DH** — removed, see below; fallback ladder when thin), **age-tier weighted SECONDARY** to position group ("position group matters most, age brings it into focus" — not a co-equal comparison) + **rookie modifier** (resist loss + faster development) + the **age curve**. **ONE 5-band age structure** drives BOTH the modifier (a weight/band) AND the curve (a slope/band): 18-21 strong-develop / 22-24 mild-develop / 25-31 peak-flat / 32-35 mild-decline / 36+ steep-decline; modifier = most-benefit-of-doubt at the extremes, strictest at 25-31. (Supersedes the earlier 3-phase curve — that was the 5-vs-3 inconsistency JK flagged; no ruling ever pinned the curve to 3 phases.) **Modifier = comparison-fairness; curve = aging gravity** — complementary; calibrate so old-age benefit-of-doubt doesn't cancel the curve (average aging player still trends gently down). Per-attribute realism (speed/field/arm erode faster); age+performance combine. **All relevant attributes can move** per checkpoint. **Cadence (RULED):** USER-SETTABLE — default every 10% / option every 20% (mirrors traits, defaults to 2×); uniform steps; **overlap is FINE** — every other ratings checkpoint coincides with a trait checkpoint, requiring only a fixed eval order + a shared pre-checkpoint performance snapshot so they don't feed each other. (Reverses the earlier wrong "offset so they never coincide.")
- **DH removed ENTIRELY — pitchers bat (RULED):** the DH concept is gone — no DH *position* AND no DH *rule*; **pitchers always bat** (pitcher fills the 9th lineup slot, no designated hitter ever). Consistent w/ the 2026-06-20 "no DH/UTIL" Mode-1 ruling. Verified (`wenf4w3ee`): the FROZEN `iv_oracle.json` has ZERO DH (DH→1B is value-neutral) → **no re-bless**. Scope = a separate build ticket: position model (~9 Position type defs in lockstep + `ivEngine.ts:205` keystone + the one DH player `yankeesPlayers.ts:70` + lineup/sub plumbing + ~38 test pins) **+ the league rule** (`leagueConfig.ts usesDesignatedHitter`/`dhPercentage` collapse to permanent no-DH; `dhEnabled` branches collapse to pitcher-bats; no UI offers a DH option). **DATA DEPENDENCY:** pitchers batting in-sim need `batterRatings` — the ~89/178 stock-pitcher gap was reportedly closed by DB1 (2026-06-10); the ticket MUST verify 100% coverage + that the sim exercises pitcher offense.
- **Rookie = visible designation + code-readable flag (RULED):** rookie = recently called up from farm → reuse the existing persisted `Player.rookieScaleActiveBySeason` flag (no DB bump) for the ratings modifier; surface a ROOKIE badge via the existing badge renderer. NOT a row in the team-singular designation store, and NOT a new `FranchiseDesignationType` member.
- **Adopt a canonical age curve** (greenfield — none existed): develop <25, peak 25–32, decline 33+ (steepening); age + performance COMBINE (a 35yo who plays great can net positive); speed/fielding/arm erode faster than power/contact; deterministic, folded into the one engine. Numbers = sim-tune placeholders.
- **Per-attribute diminishing returns** (harder to raise a 90 than a 50; high ratings sticky on decline) = the trait "valuable=hard+sticky" principle applied to ratings. **DROP** the spec's separate whole-player grade/salary asymmetry (avoid double-counting).

**TRANSFER-DEFAULTS (reconciled with the locked model):** R2 asymmetric hysteresis dead-band (vs symmetric 0.75) — KEPT; ~~R3 probabilistic~~ → **DETERMINISTIC** (reversed; ratings move on magnitude, no roll); R4 season-aggregate base + moderate trend tilt (neutral at CP1) — KEPT (adds the dynamism JK wants); ~~R9 rookie downside shield~~ → folded into the **rookie MODIFIER** (resist loss + faster development); R10 per-position ATTRIBUTE-relevance weighting DEFERRED v2 (distinct from the position-GROUP cohort, now the v1 primary signal). Full design → `RATINGS_ADJUSTMENT_SPEC.md`.

### 2026-06-22 (attended): Trait MEASUREMENT — window, trend factor, peer cohorts — RULED

**Context:** JK validated the stickiness/early-loss balance + asked about the measurement basis. → `TRAIT_GAIN_LOSS_THRESHOLD_SPEC.md §4A`.
- **Window = season-to-date AGGREGATE base** + a **MODERATE trend tilt** (recent-since-last-checkpoint vs aggregate): trending up → easier gain/harder loss; down → vice versa. Neutral at CP1 (no prior) so it can't worsen early loss. (Anchor = aggregate; responsiveness = trend.)
- **Peer cohorts:** hitters-vs-hitters / pitchers-vs-pitchers ALREADY built (never mixed); **Two-Way already ranks the pitcher's bat vs the PITCHER pool** (the Shohei case — `traitCandidateBuilder.ts:101-107`), no artificial inflation. **NEW: separate SP-vs-SP / RP-vs-RP** (RP = SP/RP-no-starts + RP + CP) for pitching-trait percentiles, with **all-pitcher fallback** when a cohort is below the min-peer-pool valve.
- **Early-loss validated SAFE:** min-sample valve keeps held traits dormant at CP1 (no early loss); valuable tiers need a near-total collapse (Rare bottom-22% / Elite bottom-12%); loss probabilistic; trend neutral at CP1. Drafted valuable traits protected early, not impossibly sticky over a real decline.

### 2026-06-22 (attended): Trait RESOLUTION / selection layer — value-weighted, probabilistic, incumbency — RULED

**Context:** JK flagged that the threshold model only answers "does each trait qualify" — missing the SELECTION layer (which traits land when several qualify + the 2-cap; how incumbents defend slots). Dig `wlfqzli7h` confirmed the layer is BUILT (`reconcileGainProposals`, `traitAcquisition.ts:375-437`) + was SPECCED (Fable-era `FRANCHISE_V1_LIVING_SEASON_SPEC §9` → `TRAIT_SIGNAL_CERTIFICATION §VI.0` → `TRAIT_MEASUREMENT_SPEC §0.1`), but is **purely performance-P with NO value term and NO incumbency**, plus a real cap-collision bug. → design folded into `TRAIT_GAIN_LOSS_THRESHOLD_SPEC.md §8B`.

**RULINGS:**
- **Probabilistic gain/loss (not deterministic):** clearing a threshold = ELIGIBLE; firing is a **seeded** probability scaling with the margin past the bar (+ tier). Borderline qualifiers may wait a checkpoint; standouts almost always fire. (Today the code is a deterministic `P≥0.75` switch — adds the roll; stays seed-reproducible.)
- **Value + incumbency scoring:** `gainScore = P × traitWeight`; `keepScore = P × traitWeight × β`, **β = 1.25 (moderate incumbency)**. ⇒ value defends the slot (keep Rare > gain Common) AND tenure defends it (deserves-to-keep > qualifies-to-gain).
- **Resolution:** rank firing gains by gainScore, admit best-first into open slots; at cap duel gainScore vs weakest keepScore (recompute weakest after each displacement → FIXES the double-displacement bug). `maxTraits=2` becomes a tunable constant. Opposite-pair + role + no-2-negatives caps honored.
- **Build:** additive to the built+tested P pipeline (~4 line edits + 1 ranking block + the seeded roll + 2 tuning constants + the `traitWeight` fn from the threshold spec); also closes the displacement-currency seam (`PROMPT_CONTRACTS.md:10246`).

### 2026-06-22 (attended): Trait gain/loss threshold system — value/scarcity sliding scale — RULED

**Context:** JK's design question — what thresholds gate trait gain/loss over a season; group/scale them by trait value/scarcity; leverage the XBL workbook. Research run `wt1ks3cku`. Full design → `spec-docs/TRAIT_GAIN_LOSS_THRESHOLD_SPEC.md`.

**RULINGS:**
- **One trait `traitWeight` = 80% $ value (IV ranking) + 20% scarcity (workbook `TEAM MAX USES`)**, rank-normalized. Drives BOTH in-season gain/loss thresholds AND prospect generation rarity (the unifying scale).
- **4 positive tiers (Common/Uncommon/Rare/Elite) + 3 negative tiers (Minor/Moderate/Severe)**, grouped + tunable, with per-trait overrides. Valuable → higher gain threshold + lower loss threshold (harder to earn, stickier). Example positives: Elite gain 0.92/loss 0.12; Common 0.55/0.30.
- **Negatives inverted:** gain a flaw by performing badly, lose by performing well. **Severe negatives = HARD to acquire + sticky** (only the persistently terrible; easy-to-acquire = Minor). 
- **NO age effect in v1** — performance-only (age-gating = documented v2).
- **Generation rarity:** `genWeight = 1 − traitWeight`; weighted draw (not uniform) at ~27% negative; Two-Way = Elite floor `genWeight≈0.05` (RARE, never excluded); Sign Stealer + Stimulated excluded from the adaptive engine entirely (still priced).
- **Build:** the in-season threshold seam is BUILT (`traitAcquisition.ts` gain/loss already a tuning arg — widen scalar→tier-lookup); the scale/tier config + negative inversion + generation weighting are bounded greenfield; the visible in-game gain/loss needs the deferred confirmation UI + Phase-2 flag (post-D13).

**✅ EOS FORK RESOLVED (JK 2026-06-22):** the threshold engine **SUPERSEDES** the EOS "Trait Wheel Spin" — the award-based luck model (`EOS_RATINGS_ADJUSTMENT_SPEC.md` §449) is **DEPRECATED for v1**. The end-of-season profile change is just **one more checkpoint** of the same adaptive engine (trait thresholds + ratings-development run once at season end → next-season profile). NO award-ceremony spin / 60-30-5 weighting / eye-test / 15%-negative rule. **Mode-3 (offseason) is OUT of v1 scope** (redesigned post-v1; the season-end checkpoint is v1's only offseason profile-change). Net cadence: 5 in-season + 1 season-end checkpoint, one engine. *(This also means the broader EOS RATINGS adjustment = a final ratings-dev checkpoint, not the award-luck model.)*

### 2026-06-22 (attended, cont.): Prospect-generator audit + trait/CPU-scout rulings — RULED

**Context:** A logic audit of the Mode-1 prospect generator (`prospectScoutingDraftEngine.ts` + `smb4PlayerGenerator.ts`) surfaced real bugs + a spec conflict. JK ruled the open forks. Fixes execute on `codex/mode1-v1` (attended thread's chemistry/trait/prospect/draft cluster).

**RULINGS:**
- **Prospect traits — negatives ARE IN (overrides the 2026-06-20 "positive-only at generation" ruling).** JK: "we need all possible positive AND negative traits in the prospect generator; this shouldn't have happened — a gap in our spec." So prospects roll from ALL 75 traits EXCEPT exactly two: **Sign Stealer, Stimulated** (both cut from the in-season adaptive engine — TS-7/TS-9 + 2026-06-18). **Two Way (C/IF/OF) is NOT excluded — it is RARE (JK 2026-06-22, revising the 2026-06-18 "never generated" call):** as the most VALUABLE traits (#1/#2/#4 in the IV ranking) they sit at the top of the trait value/scarcity scale → lowest generation frequency. Rarity falls out of the scarcity weighting (below), not a hard exclusion. ⇒ trait selection must become SCARCITY-WEIGHTED (not uniform), which ties into the trait gain/loss threshold design. Safe: the grade inverse-solver (`buildRatings`) re-solves to the target grade AFTER traits, so negatives don't distort the §3.2 grade distribution (the old "neg_count lowers grade unpredictably" rationale is obsolete given the solve loop). **SPEC RECONCILIATION REQUIRED:** update `PROSPECT_GENERATION_SPEC.md` §3.4/§5.5/§15.B (currently mandate positive-only) before/with the pool change.
- **Pos:neg trait MIX = match the real SMB4 pool (~27% negative)** (55 positive : 20 negative trait types ≈ 73/27). Realistic; busts feel earned.
- **CPU bidders bid on a SCOUT-ESTIMATED value, NOT raw true IV (H2 fix).** Today `cpuShillBidding.ts:166` bids on raw `player.iv` → CPUs have perfect info + never misjudge busts/steals. Fix so CPUs use their own scout's noisy read (same uncertainty the human faces). ⇒ `cpuShillBidding.ts` is now attended-owned; **RB-10 reclaimed from the parallel lane** (coupled to this scout-value work).
- **Snake-draft chemistry drift (M3) = DEFERRED** with the snake-draft feature (RB-13). The v1 auction path preserves chemistry correctly; fix snake when the snake picker ships.
- **K Neglecter spelling = canonical "K Neglector"** (with an *o*) — verified against the XBL workbook (`Traits`/`ImportedTraits` = "K Neglector (-)") + the frozen oracle + `traitPricing.ts`. Fix the *typo* instances ("K Neglecter") in `smb4_traits_reference.md`, the generation NEG pool, and 4 FA entries in `playerDatabase.ts` → "K Neglector". No oracle risk.

**AUDIT PUNCH LIST (fix on `codex/mode1-v1`):**
- **H1 (HIGH) — `normal()` is a broken Gaussian.** `prospectScoutingDraftEngine.ts:439` Box-Muller fed by two stateless FNV hashes of suffix-differing strings (`seed:u1`/`seed:u2`) → correlated → right-skewed, low tail truncated at ~−1.2σ (200k-draw repro). Corrupts EVERY rating + hidden modifier (low-end tools + low loyalty/ambition/etc. unreachable). Fix: seed a proper advancing PRNG (mulberry32 from `hashString(seed)`, draw 2 independent uniforms) — deterministic, as `smb4PlayerGenerator` already does.
- **H2 (HIGH) — CPU true-value leak** (see CPU ruling above).
- **H3 + M2 (HIGH/MED) — POSITION_POOL broken:** missing `SP/RP` entirely (the RB-14 gap → 0% swingmen) + off-oracle weights (coarse 16-slot array: SP 25% vs §3.3 18%, CF 12.5% vs 7%…). Fix: drive position selection from the §3.3 weight table via `pickWeighted`.
- **M1 (MED) — latent crash + missing grade:** dead `['A+',0]` in the `pickWeighted` float-safety fallback (`A+` ∉ GRADES → `targetAnalyzerScore` throws if ever hit); `D+` never generated. Fix: remove the `['A+',0]` row, make the fallback a real grade.
- **L2 (LOW) — delete orphaned `gradeEngine.generateArsenal`** (the retired forced-4F+2F path; zero non-test callers).
- **DEFERRED:** M3 (snake chemistry, above); L1 (two parallel generators — tech-debt, consolidate later); L3 (RNG fragility — subsumed by the H1 fix).
- **VERIFIED CORRECT (do not touch):** grade/ratings inverse-solver hits §3.2; auction-path chemistry balance; handedness; trait-count 30/50/20; no cross-position/duplicate traits; Two Way correctly excluded; no DH/UTIL; arsenal rules; determinism; canonical-7 personality pool.

### 2026-06-22 (attended): RB-7/8/9 open-decision review — rulings (auction economy, fan morale, GM scope, defense identity, scout trait-potency) — RULED

**Context:** After the AUTH-4 run closed RB-9a + RB-9b, JK reviewed the accumulated open decisions (RB-7/8/9 defaults + the backlog) in an attended pass. Several rulings change already-shipped tickets → tracked as follow-ups. Magnitudes marked sim-tune/pending where noted.

**MAJOR (the four highest-impact forks):**
- **D-7c-2 — Auction price CARRIES into the season.** The auction winning bid (`settledSalary`) becomes the player's Mode-2 salary / cap hit — NOT the attribute-recalculated value (`withInitialFranchiseSalary`). *Rationale:* the auction economy + luxury tax + carryover must have season-long consequences (overpays haunt you, bargains stay cheap; the bidding "fingerprint" survives day 1). *Rework:* overrides `withInitialFranchiseSalary` for auction-drafted players (a focused RB follow-up).
- **D-7a-2 — Fan morale from payroll is an ASYMMETRY (MLB vs farm, both count, different shapes).** MLB = the existing RB-6 **U-curve / pressure** (top-quartile payroll → expectations skyrocket → morale sags until they win; bottom-quartile → low hope → also sags; mid = neutral). Farm = **monotonic / hope** (higher farm spend = brighter future = higher morale, straight up; bottom-quartile = lower hope = lower), rank-vs-league input, NO win-now penalty because the farm pays off later. JK confirmed the logic; Captain confirmed it's coherent + orthogonal. *Rework:* RB-6 follow-up adds the farm monotonic contribution alongside the built MLB U-curve.
- **D-9b-2 (REVERSED) — Defense IS a 6th identity category.** The farm-archetype hole-weighting tilt must run on the **6-band archetype (Power/Contact/Speed/Defense/Rotation/Bullpen) broken into the 44 archetype elements**, NOT the 5-category smb4 profile that lacks defense. *Rationale:* defense is a first-class identity choice. *Rework:* RB-9b follow-up — the tilt consumes the 6-band archetype directly (the `bandPrioritiesToTargetProfile` 5-category bridge was the wrong target; rebuild the tilt on the bands/elements). MUST land before RB-9c consumes it.
- **D-8a-3 (REVISED) — ONE GM per team, human OR CPU.** Human-controlled GMs enter their own name (blank → auto SMB4 name); CPU-controlled GMs are auto-assigned from the SMB4 player-names DB. *Rework:* RB-8 follow-up — CPU-team GM auto-naming (RB-8 shipped single-user-GM only).

**MINOR / CLARIFIED:**
- **#2 (D-7b-2) — MLB over/underpaid morale should compare vs the KNOWN value, not a scout-fuzzed range.** Confirmed at source (`draftFreezeInputs.ts:31-32`): the freeze currently applies `perceivedValueRange(iv, accuracy 70)` to BOTH tiers uniformly. RULING DIRECTION: farm = scout range (hidden value, accuracy belongs); MLB = known IV (tight/no fuzz). PENDING one spec check (is MLB true value actually visible to the GM at auction, or still behind the scout's uncovered report?) before finalizing. *Rework:* freeze-input follow-up.
- **#3 (D-7c-1) — pull farm settled-salary FORWARD + persist draft data per player.** Stamp the winning bid + draft data (slot, tier, scout grade/range) onto every drafted player (MLB AND farm) at the freeze, persisted in franchise mode, for the future **Almanac baseball-card draft history**. Persisting the displayed scout range also gives #2 its bulletproof path. *Rework:* extend the RB-7c settledSalary stamp to farm + add draft-data fields.
- **#4 (D-9a-1 REVERSED) — show roster + salary + holes TOGETHER on the draft board.** Better cost-aware UX. The board shows each won player's salary + running payroll + remaining wallet, and the analyzer's salary check is wired to the **actual wallet cap** so it can flag "filling this hole pushes you over." Folds into RB-9c.
- **#13 (O-9 RESOLVED) — chemistry → trait potency tiers = canonical SMB4: 0–2 same-chemistry = L1, 3–6 = L2, 7+ = L3** (3 bumps to L2, 7 to L3). Pins the RB-1b count→tier cut-points + the broader potency model.
- **#14 (O-7/O-8 CLARIFIED) — the chemistry/personality rebalance runs AMONG the user-assembled draft pool.** The "free agents" = 66 unrostered players (`teamId 'free-agent'`, league `freeAgentPoolId`). The draft pool includes them **IF the user adds them at league setup**; the rebalance + fresh personality/modifier generation runs over **whatever players the user included**, all at once. The .21/.20/.20/.20/.19 target is just the near-uniform REFERENCE shape (440-measured; negligible vs 506). *Verify:* the wiring passes the FULL user pool (incl. user-added FAs) to `regenerateLeaguePoolPlayerAxes` (research wqv2dgtiz).

**NEW REQUIREMENT — scout perceived-value must account for trait POTENCY LEVEL (the L2-baseline problem):**
- The IV engine prices traits **as if every trait is Level 2.** So the scout's perceived value should nudge **DOWN** for a player whose traits will be **L1** on the joining team (team lacks the same-chemistry count to reach L2 for his traits) and **UP** when the GM is locking in **L3** (7+ same-chemistry). "Not huge, but the L1↔L3 spread is actually large." Research COMPLETE (runs wqv2dgtiz + w4pmdw4ry; source re-verified 2026-06-22 against JK's canonical `XBL Test Texas Rangers.xlsx`). VALIDATED: the canonical workbook's `ImportedTraits` per-level ramp = **positive 0.5×/1.0×/3.0×; negative 3.0×/1.0×/0.5×** (cell-for-cell: Cannon Arm 23/45/135, Tough Out 5/10/30, Whiffer 8/15/45…). The CODE's `POTENCY_SCALE` uses **2.0×** at the strong tier — **undershoots the canonical 3.0× by ~33%** (the 2.0 matched the BillyYank guide's loose "×1/×2/×4" prose, not the actual workbook columns the IV logic was built from). Fix candidate: `POTENCY_SCALE` L3/L1 2.0→3.0 (DORMANT today — all callers run L2; oracle pins only L2 so NO re-bless needed). The L2 assumption traces to the XBL `Restrict Teams to Level 2 Chemistry = TRUE` rule, absent in franchise mode. SOURCE CONFIRMED: the `XBL Test Texas Rangers.xlsx` valuation tabs are byte-identical to the repo's `Team_Builder_Archetype_Logic_Template.xlsx`; only the Roster sheet (the Rangers anchors) differs — so no re-extraction needed. **→ FULL findings + the 11-point decision surface housed in the dedicated `spec-docs/CHEMISTRY_TRAIT_POTENCY_VALUATION_SPEC.md` (research/understanding doc, NOT ratified).** JK to work the decision surface (§9) before any build. *Open:* engine-route vs scout-route, price-vs-flag, model the call-up ripple, un-pin-hitter-raw vs keep-oracle-frozen, the workbook-vs-game L3 ramp, the adjustment magnitude (sim-tune RB-16).

**FOLLOW-UP QUEUE (tracked; not built in this review):** (1) Defense→6-band tilt [RB-9b follow-up, before RB-9c] · (2) CPU GM auto-naming [RB-8 follow-up] · (3) auction price→season salary [override withInitialFranchiseSalary] · (4) fan-morale farm monotonic [RB-6 follow-up] · (5) MLB over/underpaid vs known IV [pending spec check] · (6) farm settled-salary + draft data persist [Almanac] · (7) salary-on-board + wallet cap [RB-9c] · (8) chemistry tiers 3/7 [pin] · (9) verify FA/full-pool rebalance coverage · (10) scout L1/L3 trait-potency adjustment [magnitude pending research].

### 2026-06-20 (attended): Mode-1 draft/farm v1 design forks — 13 rulings + a new scout-report privacy requirement — RULED

**Context:** Two read-only concurrent sessions authored `PROSPECT_GENERATION_SPEC.md` (v2, farm-prospect generation) and
`AUCTION_DRAFT_SPEC.md` (the hot-seat auction), each closing with batched WAITING_ON_JK forks (prospect A–E, auction
Q1–Q8). JK ruled all 13 in one attended pass; a code-grounded check of two ("A" grade-model, "E" positions) was run first.

**Prospect rulings (→ `PROSPECT_GENERATION_SPEC.md` §15 + body §3.3/§8/§5.1):**
- **A — grade oracle = `scoreSmb4Player`** (`smb4GradeEmulator.ts`, the Player-Analyzer fitted model: ratings + handedness
  + traits + secondary + arsenal), NOT the simple 3:3:2:1:1 `gradeEngine`. Code fact verified: **nothing reverse-engineers
  a profile from salary/IV** (grep-confirmed zero) — both graders are forward ratings→grade; `gradeEngine` only feeds
  `franchiseRatingsSalaryAdapter` (version `…grade-salary-only`), which computes grade + salary from ratings as siblings and
  DEFERS True Value/IV. Retire the `gradeEngine` prospect-generator path; build on the `scoreSmb4Player`/`smb4PlayerGenerator`
  family. *Rationale:* the draft must show the grade reflecting the whole player (matching what the Builder Analyzer shows).
- **B — keep trait counts 30/50/20** (vs the real pool's 16/63/21). *Rationale:* prospects = undeveloped upside that grows
  into traits via development.
- **C — defer position-conditioned handedness** (league-wide bats/throws split for v1). *Rationale:* small realism gain
  (`thr_L` scores only −0.66); not worth the complexity now.
- **D — pitcher arsenal:** every pitcher ≥1 fastball `{4F,2F,CF}` + ≥1 off-speed `{SL,CB,CH,FK,SB}`, **no forced 4F+2F**;
  arsenal size = real-pool **role tapers (SP & SP/RP 3–5, RP 2–4, CP 2–3) scaled by junk**. Adopt `smb4PlayerGenerator.buildArsenal`
  (already encodes this rule + vocab at `:409-411`); retire `gradeEngine.generateArsenal` (`:382`, force-pairs 4F+2F = the bug).
- **E — NO DH/UTIL in the farm class** (neither is a valid SMB4 primary or secondary position — `DH` is a lineup slot only;
  `UTIL` is in no `Position` type). Fielders: primary + **optional** secondary, both from the 8 fielding positions
  {C,1B,2B,3B,SS,LF,CF,RF}. Pitchers: **one of {SP, SP/RP, RP, CP}, no secondary** — `SP/RP` is a single combined swingman
  role (NOT SP-primary + RP-secondary; `PITCHER_POSITIONS=["SP","RP","CP","SP/RP"]`, `smb4PlayerGenerator.ts:134`). A 1B with
  no secondary is functionally DH-like but rostered at 1B.

**Auction rulings (→ `AUCTION_DRAFT_SPEC.md` §6):**
- **Q1** fixed cyclic nomination rotation, seeded at setup · **Q2** nomination = put-up-only (no obligation) + tap-to-claim
  for the lone solvent survivor · **Q3** flat increment scaled to cap, per-turn timer OFF by default · **Q4** pass = out for
  this lot · **Q5** §2.2.2 progress-guard re-nomination (re-nominatable only after another player SELLS; → FA tail after 2
  passes w/o intervening sale; no immediate re-nominate of one you just caused to pass) · **Q6** farm card shows a grade
  RANGE + scout-driven confidence · **Q7** nerfed walled-off farm wallet, auto-sizing cap · **Q8** REQUIRE every team to hire
  a scout before the draft can start (removes the no-scout widest-range fallback).

**NEW requirement — scout-report privacy on the shared device (→ `AUCTION_DRAFT_SPEC.md` §6.1):** JK caught that passing one
iPad around the draft room exposes each GM's private scouting report (Q6 range + confidence, per-team via their own scout).
**Default COVERED; reveal via long-press (re-covers on release). Scope = scout reports ONLY** (budgets/target lists/max-bid
stay visible). Farm auction + scouting/prep phase; MLB-auction grades are public (no cover). *Rationale:* asymmetric paid-for
info must not be free-ridden.

**Routing note:** these specs are the source for the upcoming Mode-1 v1 build branch; committed on `codex/franchise-v1-next`
so the Mode-1 branch inherits the ruled specs.

---

### 2026-06-19 (L-SIM Phase 1 audit): L12-race "missing merit category" = VALID SPARSITY, with a teeth-keeping refinement — RULED (attended)

**Context:** The Opus step-4 audit of the L-SIM-H2 invariant suite ran an INDEPENDENT scaled reproduction (24-game
flags-ON season) that tripped `soul.l12-race-no-nan-resolve-tier` CRITICAL at season-end — a merit category had ZERO
eligible candidates while the race math was sound (status `computed`, no NaN). Codex's single 60-game leg did not expose
it. Surfaced to JK.

**DECISION (JK 2026-06-19):** An empty merit category at season-end is NOT a failure by itself — a category legitimately
has zero qualifiers in tiny/edge leagues and short seasons. Keep the invariant **CRITICAL** (the severity is right); what
changes is the DEFINITION of failure:
1. **KEEP** enforcing (the real corruption guards, unchanged): no NaN anywhere in race composites/percentiles; every
   category resolves to a valid `computed` status; fame contributes via `resolveFameTier` rank only.
2. **CHANGE** — when a category's candidate list is empty, check that category's **ELIGIBILITY POOL** (count of roster
   players satisfying its eligibility predicate — Reliever = pure relievers `gamesStarted===0` above the relief-IP floor;
   Bench = reserves by totalWar; Booger = position players by −fieldingWar; etc.): pool empty → **PASS** (valid sparsity,
   nobody qualified); pool NON-empty but category empty → **FAIL** (corruption: eligible candidates existed but were
   dropped).
3. This **SUBSUMES** the season-length concern (short seasons → fewer players clear IP/PA floors → pool legitimately
   empty → emptiness passes); no separate season-length rule needed.

**FALLBACK** (only if reaching the eligibility predicate from the harness is disproportionate): assert every standard
category is non-empty in a full-size/full-length (standard config) league, accept emptiness in sub-threshold/edge legs.
Coarser (keys off league size, not actual eligibility) — prefer the eligibility-pool check; use the heuristic only if
wiring the predicate is genuinely costly.

**Routing:** H3 **harness** work (correcting an INVARIANT, NOT a production change), builder ≠ auditor. Distinct from the
two fixes the H2 audit already applied inline (mechanical auditor corrections): the All-Star-lock invariant
`Math.ceil`→`Math.round` to match `franchiseAllStarLock.ts` (masked at 60 games where 60×0.6=36 is exact, exposed at 24
where 24×0.6=14.4), and renaming `seasonRunner.test.ts`→`.scenario.ts` out of the default suite. This eligibility-pool
refinement is build-scale → queued for H3 with the reach-floor-ratchet strengthening + the deferred §5.3 season-finalize
checks. Pipeline behavior unchanged throughout.

### 2026-06-19 (L13 grounding recon + A/B/C rulings + build-contract authoring): JK ruled the 3 code-grounded forks (attended)

**Context:** the read-only L13 grounding recon (`spec-docs/L13_SCOPE_MAP.md`, Opus 4.8, AUTH-4) resolved the pivotal
sequencing question and surfaced 3 genuinely-new code-grounded forks the L11–L14 ruling pass did not close. JK ruled
all three and authorized authoring the L13-1..8 build contracts (builds HELD until JK is sole mutator on the repo).

**PIVOTAL (recon finding, ratified):** L13 is **SIM-CRITICAL, not narrative-only.** Relationships write the morale
channel (the L3 matrix `relationship` tap, `masterMoraleMatrix.ts:408`, currently a neutral stub) and through it the
**value** channel: the live wired loop is **relationship → player morale → ratings-development → True Value →
standings/fame** (`ratingsDevelopment.ts:15-16,106` consumed by `franchiseCheckpointSweepCompute.ts:179,251` at 20%
checkpoints). ⇒ L13 must land **before** the comprehensive L-SIM Phase-4 run; the L-SIM needs §5 relationship
invariants. The morale→in-game-performance (mojo/fitness/WAR) leg is **unwired and intentionally deferred** (Fork C).

- **Fork A — storage = NEW `kbl-tracker` store. APPROVED.** `rivalryScores` is team↔team + dormant
  (`reporter.ts:175-186`) and **cannot** carry a player-edge record, so L13-Q12's fallback fires. Build to the FULL
  persistence discipline: **`TRACKER_DB_VERSION` 24→25**, the `franchiseSeasonLedgerStorage.test.ts` store-list PIN
  updated **in the same ticket** (the L6b-1 failure mode — must not lag), backup-parity + migration-survival proven by
  test, `KBL_BACKUP_VERSION` handled, store ships **dark/empty behind the L13 flag**. **Isolate the store as its own
  first sub-ticket (L13-1)** with its own audit + a v24→v25 migration test, exactly like the L9b/L10/All-Star store
  tickets. **Batched browser-verify item (migration + round-trip), prioritized.**
- **Fork B — cadence = MIXED. CONFIRMED.** **Edge formation fires at the 20% checkpoint** (needs the
  accumulated-interaction sample, same as traits + ratings-dev); **edge decay + charged-matchup effects fire
  per-game.** Fold the **intensity into the edge record** (not a second indexed store/field) → **no second PIN**.
- **Fork C — morale→in-game-performance stays OUT of L13. CONFIRMED + spec fixed.** L13's value-channel effect is
  morale → **ratings-development** (built+wired), NOT morale → in-game WAR/mojo (intentionally dormant). §24.10 + REL-9
  corrected this pass to match the code; the L-SIM relationship invariants assert morale→development, **never**
  morale→WAR. The morale→in-game-performance leg is **explicitly deferred — not v1.**

**Standing build constraints (carried into every L13 contract):** (1) preserve the **double-count guard** — Captain
Charisma ×2 morale routing (`captainMoraleRouter.ts:24-64`) must **not** also flow through the §24.9 leadership
composite (Q8); (2) **leave the LI revenge/romance multipliers alone** (`leverageCalculator.ts:606-654` — an
independent pre-existing feature; do not delete, do not extend); (3) one morale-WRITE path = the matrix
(relationshipEngine supplies the base delta only, per L13-Q7).

**Build split RULED (contracts authored in `PROMPT_CONTRACTS.md`, build-DARK, builder ≠ auditor, persistence first):**
**L13-1** new edge store + record type + 6-edge enum + v24→v25 migration/PIN/backup + L13 flag · **L13-2** 9→6 taxonomy
map + retire surplus literals · **L13-3** formation engine (per-type threshold gate + triggers + romance/gender +
Captain composite; **checkpoint** cadence) · **L13-4** intensity lifecycle (scalar + lapse-decay + hysteresis;
**per-game**; folded into the edge record) · **L13-5** matrix relationship-tap authoring (the feedback write) ·
**L13-6** charged-matchup morale amplification (**per-game**) · **L13-7** reporter integration (REP-4 inaccuracy +
pre-move intel + news adapter + SEA-2-gated fan-morale nudge) · **L13-8** flag + processCompletedGame gate wiring
(checkpoint branch for formation, per-game branch for decay/charged-matchup). Doc-hygiene applied this pass: §24.10/REL-9
correction (Fork C); the two `FRANCHISE_MODE2_MORALE_RELATIONSHIP_*` docs stamped **SUPERSEDED-BY-§24** (L13-Q11).

### 2026-06-18 (L11–L14 ruling pass): L11 forks RATIFIED + L14↔L11 contract & hot-seat surface RULED (JK attended)

**Context**: JK ran a ruling pass over the consolidated open-questions worksheet
`spec-docs/L11_L14_OPEN_QUESTIONS.md` (built from `L11_SCOPE_MAP.md §7` + workflow `wf_1f3e2c10-e94`, which brought
L12/L13/L14 to the L11 §7 decision-ready standard with an adversarial auditor per ticket). Starting with L11 (the
next ticket). JK confirmed the Captain defaults and ruled the two genuinely-new items.

**RATIFIED** (promoted from "Defaults TAKEN" in the kickoff entry below to JK-ruled):
- **L11-Q7 — manager-personality field** = the canonical **7-personality enum on the IDENTITY `ManagerProfile`**
  (`kbl-manager-identity`), NOT the D9-retired `mwarCalculator` career-stats type.
- **L11-Q8 — successor on firing** = **auto-generate a default identity** (`buildDefaultManagerProfile`, "new voice").
- **L11-Q9 — legacy persistence** = **ride the existing morale/identity stores** (NO new L11 store, NO trackerDb
  bump); `ManagerTeamTenureAggregate` gains hire/fire dates + an end-reason (fired/resigned/relocated).
- **L11-Q10 — L1 sequencing** = **build DARK against the `HiddenModifiers` type now**; L1 persisting
  loyalty/resilience is an ACTIVATION prerequisite (post-D13), not a build blocker.
- *(Confirmed already-ruled in the kickoff entry: clubhouse touch flat −1 [Q5]; ONE fan-write per firing [Q6]; MOY
  OUT of L11 [Q12].)*

**NEW RULINGS:**
- **L11-Q11 / L14-Q8 — the L14↔L11 firing call contract.** L14's rebrand invokes the ONE shared resolver as
  `fireManager({teamId, reason:'rebrand', skipUserConfirm:true, suppressFanReliefBump:true})`: the **per-player
  ripple STILL applies** (players react to the regime change) but the **team-fan RELIEF bump is SUPPRESSED**, because
  the rebrand's ~70 hard-set is the authoritative fan-morale outcome. ⇒ **This also settles the L14 cascade order**
  (L14-Q4): the relief bump is NOT emitted-then-overwritten — it is skipped. Pin this signature in BOTH the L11 and
  L14 contracts so the triangle audit checks both sides.
- **L11-Q13 — GM hot-seat surface in v1 = MINIMAL.** A minimal "Fire Manager" GM action ships in v1 (required by the
  trigger=BOTH ruling anyway); the full hot-seat pressure/mandate framing is DEFERRED past v1. Keeps L11 build-focused.

⇒ **L11 is fully ruled** (kickoff 4 forks + this pass). Remaining L11 work is pure build (L11-1..5, build-DARK,
activate post-D13). The L11–L14 worksheet status column is updated to match.

**— L12 (Race system + All-Star + player Awards) — RULED (JK, same pass):**
- **L12-Q1 — award-category extension = SEASON-RACE SLOTS NOW, DEFER THE 2 ONE-SHOTS** (override of "all 6"). Extend
  the persistable `FranchiseAwardCategory` with `ALL_STAR` / `BENCH_PLAYER` / `BOOGER_GLOVE` / `RELIEVER_OF_YEAR`
  now (All-Star modeled as a **multi-selection roster record**, not a single-winner row); **defer `PLATINUM_GLOVE` +
  `WORLD_SERIES_MVP`** (season-end one-shots; WS MVP depends on playoffs) to a later slot. ⇒ accepts TWO ledger
  bumps (the C4 backup DoD + the `franchiseSeasonLedgerStorage.test.ts` store-list pin must be in-ticket each time).
- **L12-Q2 — race standing = SINGLE WEIGHTED COMPOSITE with PER-RACE-TYPE WEIGHTS** (override of "merit spine + tilt",
  then reconciled). Standing = `w_merit·WAR + w_fame·fame`, bands by score-gap clustering — BUT the weights vary by
  race type: **fame-LED for fan-vote races (All-Star starters); merit-DOMINANT with fame bounded to a small
  close-race nudge for merit awards.** The per-race-type split is what preserves the ratified **RACE-4**
  (fame is a tilt-not-driver on merit awards) inside the weighted-composite form. Weights = §16 SIM-TUNE.
- **L12-Q5 — All-Star roster = BY-POSITION TEMPLATE mirroring the archived screen.** 1 fan-voted starter per position
  + a pitching contingent + a merit-reserve block; performance floor reuses the existing `minPlateAppearances` /
  `minInningsPitched` qualifier. Counts/floor sim-nudgeable.
- **L12-Q7 — TV-family = valueDelta-RANK / INVERTED / SWING.** KK = league-wide `valueDelta` (value-vs-expectation,
  the "league-wide Fan Favorite"); Bust = same metric inverted (bottom-3 inverted race); Comeback =
  `max(currentTV − own running season-low)` over the TV snapshots. Basis stable; only any normalization constant is sim.
- **L12-Q8 — status-fame layer = L6 OWNS THE WHOLE LAYER** (override of "league-leader→L12"). The entire §20.4 status
  layer (draft seed / call-up / send-down / bench 0.5× / league-leader) is **fame-internal, owned by the fame layer
  (an L6 follow-up — L6 is already built dark)**; **L12 only CONSUMES the resulting tier.** Status fame is NOT L12 scope.
- **L12-Q10 — fame double-ladder collapse = SEPARATE PRE-L12 CLEANUP ticket.** A dedicated ticket retires the legacy
  `getFameTier` (forbidden "Fan Favorite"/"Villain" labels). HARD prerequisite: races read the new `resolveFameTier`
  and the forbidden-label ladder is gone **before any race goes live**.
- **L12-Q13 — All-Star lock = at the 60% scheduled-games mark** (override of 50%), configurable; race standings
  recompute per completed game off the existing spine; All-Star roster locks at the 60% checkpoint; award races
  finalize at season end.
- **L12-Q3/Q4/Q6/Q9 — structural FORMS confirmed, magnitudes = §16 placeholders:** Q3 fame tilts only when
  `|margin| < window` AND both players' merit > floor; Q4 GoldGlove = `fWAR + share·defensive-channel-fame` (seed
  **20%**, never total fame); Q6 **MVP + Cy Young + All-Star EMIT** fame/morale, all other races visible-only at
  launch; Q9 honor→Reach-floor map (bigger honor → higher permanent floor, via the built `updateReachFloor`) + the
  snub morale hit personality-scaled through a new L3 race-snub row.
- **L12-Q11 — channel A stays OUT of L12** (confirmed): L12 READS fame for standings only; the §20.5/20.6
  fame→fan-morale plug stays the L6-ruled dark seam.
- **L12-Q12 — NO L12 ruling** (DEFER): Heat `decayPerUpdate` + WAR-floor gravity strength are §16 sim placeholders
  already in `FAME_TUNING`; L12 consumes the live config.

**— L13 (Relationships-lite + reporter accuracy) — RULED (JK, same pass):**
- **L13-Q1 — taxonomy = §24 SIX AFFECT-EDGES canonical** (Rivalry / Feud / Mentorship / Friendship / Romance /
  History). Map the code's 9 literal types into them (Romance←DATING/MARRIED/DIVORCED/CRUSH; Feud←BULLY_VICTIM;
  Rivalry←RIVALS/JEALOUS; Friendship←BEST_FRIENDS; Mentorship←MENTOR_PROTEGE) + add History; retire the surplus. The
  worksheet's 7 ENTITY-edges are a different axis (who-to-whom) → fold into edge endpoints, NOT edge types.
- **L13-Q2 — formation gate = PER-TYPE bar.** Each of the 6 types declares its own input-modifier set (per §24.2
  recipes) AND its own threshold constant. Thresholds = §16 SIM-TUNE (target ~1-3 live edges/team).
- **L13-Q3 — triggers = the EXISTING player `age` field for 'young' + a NEW co-rostered-games counter for 'extended
  time'.** ⚠ FIELD CORRECTION: `age` IS a real persisted player field (`age:number` 18-49, `playerDatabase.ts:47` /
  `unifiedPlayerStorage.ts:41` / `leagueBuilderStorage.ts:229` + the Builder UI) — the workflow's "no age field" gap
  was WRONG (it checked `HiddenModifiers`/`ManagerProfile`). So 'young' reads real age (sim-tuned cutoff); only the
  games-together counter is new. No new age field, no L1 age dependency.
- **L13-Q4 — edges have a STRENGTH that grows + fades** (not on/off). Scalar intensity [0..1] + lapse-decay (mirror
  the L5 flashpoint-decay primitive) + a hysteresis band (anti-flicker). Magnitudes = §16. (Needed for the
  "troublemaker traded → victim recovers" loop to have a quantity to recover.)
- **L13-Q5 — reporter inaccuracy = FLAT ~10%, HEDGE/FLAG only.** Relationship intel is inaccurate at a flat ~10%
  (the §24.5 number); "inaccurate" = mark the take "unconfirmed", NEVER distort the underlying edge; seeded FNV-1a
  off franchise+season+moveId. RECONCILE BY SCOPE: the live per-personality `REPORTER_ACCURACY_RATES` (0.65-0.95)
  stays as in-game-take VOICE flavor; it is NOT the relationship-intel rate. Content-distortion → v1.1.
- **L13-Q6 — charged matchup amplifies MORALE** (REL-6), built fresh, personality-scaled, keyed off the §24 History
  edge + former-team flag. The existing code's LEVERAGE-INDEX revenge/romance multipliers
  (`relationshipIntegration.ts` / `leverageCalculator.ts`) stay as an INDEPENDENT pre-existing in-game feature — do
  NOT delete, do NOT extend; Q1's taxonomy retirement eventually orphans them.
- **L13-Q7 — per-edge morale: KEEP the flat base constants + apply personality scaling via the MATRIX.**
  relationshipEngine's `MORALE_EFFECTS` is retained as the per-edge BASE magnitude (relationship domain data), but
  the morale **WRITE** routes through the L3 master matrix (`composeMoraleConsequence`), which applies the
  personality/modifier cross. ⇒ BOUNDARY (so this is NOT the FINDING-150 scatter): ONE morale-application path (the
  matrix); relationshipEngine no longer writes morale directly — it only supplies the base delta the matrix scales.
- **L13-Q8 — Captain effectiveness = `w1·Charisma + w2·Loyalty + w3·Resilience − w4·Ambition`, normalized [0..1]**;
  suppression = a multiplier on negative-edge deltas, catalysis = a boost to positive-edge formation odds. Weights +
  magnitudes = §16. (Distinct from the Charisma×2 morale-routing — no double-count, per REL-8.)
- **L13-Q9 — romance reads the EXISTING player `gender` field** (`'M'|'F'`, the `Gender` type in
  `playerDatabase`/`unifiedPlayerStorage`/`leagueBuilderStorage` + the League Builder UI). ⚠ FIELD CORRECTION: the
  workflow's "no gender field" gap was WRONG (same cause as Q3). Base-rate structure = friendship-rate ≫ romance-rate
  + a same-gender multiplier keyed on the pair's genders; magnitudes = §16. No new field, no L1 gender dependency.
- **L13-Q10 — relationship→fan-morale: ONLY REPORTED drama nudges fans directly.** The indirect path
  (drama → player morale → performance → fan morale) is always on; a small DIRECT fan-morale nudge fires only for
  edges that clear the SEA-2 emission gate (reporter-amplified = the §24.10 "visible drama"). Coefficient = §16.
- **L13-Q11 — SUPERSEDE the stale cross-ref docs.** §24/REL-1..9 are the sole L13 authority; stamp the two
  `FRANCHISE_MODE2_MORALE_RELATIONSHIP_*` docs (approval-matrix + decision-worksheet) **SUPERSEDED-BY-§24**. Closes
  the exact FINDING-150 mechanism (a builder reading "awaiting approval"/"blocked" and stalling L13).
- **L13-Q12 — storage = REUSE the reserved `rivalryScores` store in the shared `kbl-tracker` DB** IF its schema can
  carry `{player1, player2, type, intensity, formed/dissolved, accuracy}`; if it can't, a new `kbl-tracker` store
  forces the full C4 backup DoD + the `franchiseSeasonLedgerStorage.test.ts` store-list pin in THIS ticket.
  **REJECT** the separate `kbl-relationships` DB (reopens the DSTACK-item-8 backup-parity hole) and **retire that
  DSTACK wording** as superseded by SEA-3. (Decide schema-fit before build so the store-mirror scope is known.)
- **L13-Q13 — build DARK against the `HiddenModifiers` type now; L1 persisting charisma/loyalty/resilience is the
  ACTIVATION prerequisite** (post-D13), not a build blocker. Gender + age already exist (Q3/Q9) → NOT L1 additions;
  L1's only L13 prerequisite is the four hidden modifiers.

**— L14 (Rebrand circuit-breaker) — RULED (JK, same pass):**
- **L14-Q1 — trigger = a NEW dwell counter + GM-GATED.** Build a "consecutive games at rock-bottom fan morale"
  counter (the existing `trendStreak` is "same-direction changes", the WRONG primitive — a real new counter is
  needed). Once it trips, the rebrand is **OFFERED to the GM as an action** (not auto-forced). The morale band +
  window length = §16 SIM-TUNE.
- **L14-Q2 — badge reset = clear the 4 team/fanbase badges + clear the OLD Fan Hopeful, then RE-SEED a NEW Fan
  Hopeful chosen by the new fanbase** (the existing random-top-3-prospects mechanic). **Exempt Captain only** — it
  travels with the player's leadership. Because stats persist, the value-based badges re-assign to the same players
  at the next designation checkpoint, so "clear" = drop the current badge + let the engine re-derive.
- **L14-Q3 — rebrand RESETS the whole roster's fame** (override of "fame persists") **via the EXISTING trade-style
  fame reset applied team-wide** (Heat cools + Reach floor drops toward Unknown). ⇒ **rebrand becomes a SECOND
  fame-reset valve alongside trade — AMEND FAME-7** ("trade is the only reset valve" → "trade OR rebrand"). No new
  fame math; reuse the per-player trade reset across the roster. *(Spec-doc edit required: §14 + §20.3 + FAME-7.)*
- **L14-Q4 — cascade ORDER (deterministic, single fan-morale write):** (1) fire manager + apply the player morale
  ripple [fan-relief bump SUPPRESSED per L11-Q11]; (2) clear all NON-CAPTAIN badges (KEEP Captain) + re-seed the new
  Fan Hopeful; (3) relocate the stadium; (4) reset the roster fame (trade-style, team-wide); (5) wipe dead money
  (stub, Q6); (6) HARD-SET fan morale to `REBRAND_RESET_MORALE` (~70) **LAST** so nothing overwrites it.
- **L14-Q5 — new identity = USER enters the new name/city; persist a relocation history record.** Append
  `{formerTeamName, formerStadiumName, relocatedAtSeason, relocatedAtGame}` to a NEW `teamHistory` array on the
  franchise-team metadata (no such field today) so the Almanac renders "formerly known as X." Wrap the already-ruled
  LSD-5 pool-pick in a user-facing stadium picker (excluding the current park). Colors optional/deferred.
- **L14-Q6 — dead-money wipe = STUB in L14, real wipe in the ECONOMY TRACK.** L14 ships a clearly-labeled
  `clearCarriedDeadMoney(teamId)` hook; the persisted carried-balance ledger + the real wipe are built by the economy
  track (which IS in v1 per LSD-6). Until that lands, the wipe is a documented no-op. (LSD-4 cut next-season budget
  PRESSURE but not the in-season carry ledger — that's economy-track scope.)
- **L14-Q7 — reset value = named constant `REBRAND_RESET_MORALE = 70`** (sim-nudgeable). Structure fixed (a fresh
  fanbase lands upper-CONTENT, ~70); the exact integer is §16-tunable. (70 is inside CONTENT 55-74; EXCITED starts at 75.)
- **L14-Q8 — ALREADY RULED = L11-Q11.** L14 invokes the shared resolver as
  `fireManager({teamId, reason:'rebrand', skipUserConfirm:true, suppressFanReliefBump:true})`; pinned in both contracts.

⇒ **The L11–L14 ruling pass is COMPLETE.** Every SAFE-NOW + MIXED-structural question is ruled; only sim magnitudes
(the §16 placeholders) remain deferred. **Spec-doc reconciliation follow-ups generated by this pass** (doc-hygiene,
to apply before/at each ticket's build): (a) **amend FAME-7** for the rebrand fame-reset valve (L14-Q3); (b) stamp
the two `FRANCHISE_MODE2_MORALE_RELATIONSHIP_*` docs **SUPERSEDED-BY-§24** (L13-Q11); (c) **retire the DSTACK
`kbl-relationships` DB wording** as superseded by SEA-3 (L13-Q12); (d) reconcile the **stale DSTACK** so no builder
rebuilds the now-built fame/awards engines; (e) the **fame double-ladder collapse** as a pre-L12 cleanup ticket
(L12-Q10). The L11–L14 worksheet status is updated to RULED.

### 2026-06-18 (L11 manager-firings kickoff): trigger + ripple + relief rulings (JK attended)

**Context**: L11 (manager firings) grounding recon (workflow `wf_107b9eb5-faf`, 5 readers) → `spec-docs/L11_SCOPE_MAP.md`.
Captain-verified: the `MANAGER_FIRED` morale-matrix row (self −2 / fan bump / clubhouse −1, masterMoraleMatrix.ts:24/148/375)
+ the `ManagerAssignment.fired`/`endDate` fields (managerWpa.ts:86) + the Manager Almanac page ALREADY EXIST — but the row
has ZERO emitters and nothing ever writes `fired:true`. ⇒ **L11 is the missing PRODUCER + the two consequence-writes, not
a new subsystem.** MOY stays OUT (Phase-1 D9 award). Captain surfaced 4 forks; JK ruled (richer/scaled across the board):

**Rulings (JK, 2026-06-18):**
- **Trigger = BOTH + L14.** A firing fires via (a) a manual GM action (the §12 "valve the GM spends"), (b) an AUTO
  backstop roll on sustained low fan morale (revives the orphaned `managerFireProbability` 0.05–0.15-by-payroll,
  salaryCalculator.ts:1278-1294, as the backstop probability), AND (c) the L14 rebrand auto-cascade — all routed through
  ONE shared firing resolver. The "sustained low fan morale" arming threshold/duration is §16 SIM-TUNE (no such
  measurement exists today; conservative placeholder + the payroll-band probs).
- **Personality ripple = BUILD FULL NOW, dark vs the types.** Build the COMPLETE mechanic incl. the personality half
  against the type defs; it stays inert until L1 wires player loyalty/resilience + a new manager-personality field. ⇒ L11
  ADDS a manager-personality field (default home: the IDENTITY `ManagerProfile`, managerWpa.ts:68, `kbl-manager-identity`;
  reuse the canonical 7-personality enum — NOT the career-stats `mwarCalculator` type, which D9 retires). The ripple
  DIRECTIONS come VERBATIM from §12 ("a loyal player takes a morale hit, a resilient one shrugs it off, a producing
  egotist barely notices"); magnitudes are §16 SIM-TUNE.
- **Performance gate = SCALED by how underwater.** A net-positive True-Value player is untouchable (zero ripple); a
  net-negative player's morale hit SCALES with how negative their True Value is (gradient, not a cliff). Source = the LIVE
  season-to-date True Value (`FranchiseTrueValueRow.valueDelta`), NOT the D6 frozen artifact.
- **Fan-relief bump = SCALED by how bad it is.** The relief pop is NOT flat (both +4 and +15 rejected) — it scales with
  team struggle (lower fan morale / worse record → bigger relief). §16 SIM-TUNE scale; emitted ONCE per firing, not
  per-player.

**Defaults TAKEN (Captain, not asked — low-stakes; flagged for any later JK override):** MOY OUT (no manager
fame/award/ceremony — do not touch `mwarCalculator`/`AwardsCeremonyFlow`/`AwardsWatchlist`); ONE fan-write per firing;
successor = auto-generate a default identity (`buildDefaultManagerProfile`, "new voice"); the Almanac tenure aggregate
gains hire/fire dates + an end-reason ("fired"/"resigned"/"relocated"); RIDE the existing morale/identity stores (NO new
L11 overlay store, NO trackerDb bump) — all writes gated by a new default-OFF `isFranchisePhase2L11Enabled` flag
(doubly-dark with the morale flag). Clubhouse touch stays flat −1 in v1. **Build order:** L11-1 pure firing+ripple engine
→ L11-2 manager-personality field + legacy/tenure write → L11-3 flag + the shared resolver/hook (manual + auto-backstop +
L14 entry) → L11-4 Almanac surfacing → L11-5 reporter tap. All build-DARK, activate post-D13.

### 2026-06-18 (R1 proxy derivations): the gap rulings for the R1 build (JK attended)

**Context**: R1 grounding surfaced 6 implementation gaps where §0.6's proxy needed a computation ruling (the
scorer takes ONE signalValue + one peer pool). JK ruled. Full buildable derivations now in
`TRAIT_MEASUREMENT_SPEC.md §0.9`.

- **Documented default:** all R1 rates are **per plate appearance (PA)** (the conventional reading of "rate").
- **Big Hack / Little Hack = OPTION B (percentile-merge):** percentile HR-rate and AVG separately vs peers, then
  **Big Hack = (HR-rate %ile + (1 − AVG %ile)) / 2** (Little Hack = mirror). Both inputs on the 0–1 percentile
  scale → fair blend (no unit mismatch). JK: "yes, gap 1 = option B."
- **Two Way = ONE earn-signal** (elite hitting = pitcher wOBA/PA vs the pitcher pool); C/IF/OF = random fielding
  position assigned AT GRANT, not three candidates. JK: "yep."
- **Base Rounder = advances beyond the forced minimum** (1st→3rd on a single, scoring from 2nd on a single, etc.)
  over advancement opportunities (from `runnerOutcomes`). JK: "yes."
- **Distractor — REFINED by JK:** success = the batter **reaches base (hit OR walk OR HBP)** while the
  Distractor-owner is the runner on 1B/2B; denominator = PAs with the owner on 1B/2B; credited to the runner.
  JK: "i like it but should we also add hits while on first or second? the key here is that the pitcher is failing
  at a higher rate because of the runner on base" → broadened from walks-only to all reach-base.
- **Crossed Up = passed balls per batters-faced; Bunter = successful sacs per bunt attempt** (both opt-in). JK: "yes."
- **Utility** = fielding perf at a non-primary position → thread a `primaryPositionByPlayer` map into the builder
  input (mechanical). JK: "yep."

**Build split:** R1-a (clean, no-gap: strikeout family + Slow Poke/Sprinter/Mind Gamer + Pick Officer/Easy Jumps +
K Neglector acq delta) DISPATCHED; R1-b (the 6 ruled-gap traits above) next, after R1-a commits (same files).

### 2026-06-18 (latest): No personality-only traits + spec-integrity fix (JK attended, R-E kickoff)

**Context**: At the R-E (trait rebuild enabling pieces) kickoff, the Captain re-surfaced
Big/Little Hack + the count-family as "personality-primary (no data proxy)" — reverting to the
SUPERSEDED §C/§D table language and losing JK's ratified §0.2 data proxies (HR-AVG, walks-allowed).
3rd recurrence of the soul-layer inference pattern. Root cause diagnosed: `TRAIT_MEASUREMENT_SPEC.md`
is internally CONTRADICTORY — the ratified §0 decisions sit on top of un-updated §B/§C/§D tables that
still say "personality-primary (no data proxy specified)" (e.g. `:125` BB Prone, `:168` Composed,
`:172` Big Hack, `:175` Little Hack). Every fresh read risks anchoring on the stale half.

**Rulings (JK, 2026-06-18 latest):**
- **NO trait may be earned in v1 from personality ALONE.** Every earnable trait MUST have a documented
  performance/data/ratings proxy; personality is influence (a tilt) on top. A trait with no proxy is
  left dormant/out — never personality-only. Reason: only with a real proxy can a trait's acquisition
  probability P be compared on the same currency as every other performance-based, personality-influenced
  trait. (This REAFFIRMS the §0.2 data-proxy model and SUPERSEDES the "personality-primary" framing of
  Q12/§VI.3:122/§C/§D wherever it implied a proxy-less trait. "Personality-primary" now means personality
  is the DOMINANT influence over a real proxy floor — not the only input.)
- **Stimulated → OUT of v1** (dormant until the mojo auto-derivation engine exists — it has no proxy today).
- **First Pitch Slayer / First Pitch Prayer → IN for v1**, measured by **first-pitch hits/outs** (the
  outcome on logged first-pitch PAs, `pitchesInAtBat==1`). If the user hasn't logged enough first-pitch
  data to clear the min-sample threshold, they DON'T trigger — exactly like every other enrichment-gated
  trait. So they are a data-proxy trait gated on opt-in enrichment, NOT personality-earnable.
- **Player grades recompute on ANY profile change** — ratings, traits, handedness, primary/secondary
  positions — APP-WIDE, not just for the Ace Exterminator trait. This is its own ticket (the displayed
  grade card can currently go stale). The trait engine uses a freshly-recomputed grade so it is never stale.
- **Charisma mirrors Resilience** in the acquisition combiner (E2); K Neglector's driver = **low Charisma
  + Timid/Droopy** (restoring the Timid/Droopy half).
- **Two-layer personality model CONFIRMED:** Layer 1 (universal, EVERY trait) — a positive-image trait gets a
  high-Ambition tilt, a negative-image trait gets a low-Resilience tilt (`§VI.3:114`); Layer 2 (the image axes,
  `§VI.3:116-122`) stacks on top. Personality is ALWAYS a tilt over a real proxy, NEVER an eligibility gate.
- **Two Way:** tilt = **high Ambition + Egotistical** (`§VI.3:118`); ANY personality is eligible — it's earned by
  a pitcher *hitting elite for a pitcher* (performance is the gate, not personality). [CORRECTION after the
  reconciliation: the CODE is already right — "Ambitious" is the Layer-1 Ambition modifier (fires via
  positive-image membership) and `IMAGE_DRIVER_SETS['Two Way (*)']=['EGOTISTICAL']` supplies Layer 2, so the code
  already does ↑Amb + Egotistical. Only my §0.6 draft had dropped the ↑Amb half; no code change needed for Two Way.]
- **Two Way gateway → REMOVED (JK ruling 2026-06-18 latest):** Two Way is **pitcher-only**, and a two-way player
  **can only ever hold pitcher traits — there is NO gateway into the position-player (batting) trait pool.** This
  REVERSES the prior model (`§VI.2:111` / TS-9: "hits elite → everyday player → eligible for batting traits"). The
  on-grant random IF/OF/C fielding-position assignment still applies (defensive roster only). **Proxy RULED (JK):**
  Two Way is earned by **elite HITTING for a pitcher** = high percentile of **wOBA per PA vs the PITCHER peer pool**,
  valve-gated → naturally super-rare. **NOT fielding.** (The "fielding perf at non-primary positions" proxy belongs to
  the distinct **Utility** trait — a position player fielding well at secondary spots.) The (C)/(IF)/(OF) label is just
  the random fielding position assigned on grant, not a separate earning signal.
- **Noodle Arm → CUT from v1 (dormant).** No clean reality signal exists: ARM rating alone is single-rating
  (banned by §0.0); the OF-assist / runner-advance proxies are conflated/suspect (a low rate ≠ weak arm — could
  just mean untested). Re-add only if throw-velocity or reliable per-throw fielder attribution is captured. Cannon
  Arm stays (a HIGH assist rate is a defensible positive signal; only the negative end is ambiguous).
- **Spec-over-code precedence (the recurring-miss fix):** when sources disagree, **§0.2 (latest ruling) > §VI.3 >
  the code's `IMAGE_DRIVER_SETS`.** The code is known to be NARROWER than the spec (omits the Layer-1 universal
  tilt; missing §0.2's added image drivers) and must be FIXED to match the spec — never the reverse. Root cause of
  the two R-E-kickoff misses: the Captain sourced the personality data from the code instead of §VI.3 + decisions.

**Action (spec-integrity, before any R-E build):** rewrite `TRAIT_MEASUREMENT_SPEC.md` so the §0 rulings
are folded INTO each trait's row and the stale "personality-primary / no data proxy" language is DELETED —
ONE consistent source, no contradiction left to misread. Verify every earnable trait names its proxy.

**Process lessons** → written to the SESSION_RULES pending pen (Write-First): (1) when the spec is
internally inconsistent, treat the ratified/latest section as authoritative AND purge the superseded text
in the same pass — never present stale framing as the measurement; (2) when JK ratifies a decision that
supersedes existing spec text, delete/rewrite the superseded text in the same pass.

### 2026-06-18 (later): L9b trait-from-reality MEASUREMENT model — RATIFIED (JK attended)

**Context**: FINDING-150 found the trait detection scope was wrong; JK demanded "100% certain
of how we are measuring these." Captain consolidated a per-trait measurement spec (51 traits,
workflow `wf_368f24d0-78d`); 15 needed rulings. JK ruled them + corrected the model. Full spec:
`TRAIT_MEASUREMENT_SPEC.md §0`.

**Architectural ruling — the acquisition model:**
- **P (acquisition probability) is the single comparison currency** for displacement AND lose-low.
- **Re-evaluate-to-drop:** every HELD trait re-emits a candidate each cycle, recomputing P from its
  best-available signal in priority **data > ratings > personality**. Personality earns when evidence
  is thin; contradicting evidence/ratings can REVOKE → no trait permanently sticky. (Resolves JK's
  concern that personality-driven traits would never drop + the cross-basis comparison question.)
- Personality is a TILT on the data/ratings signal, PRIMARY only where no data/ratings exists.

**Per-trait measurement rulings:**
- Strikeout family (K Collector/Neglector, Whiffer, Tough Out): build now on strikeout-rate-vs-peers.
- Pitcher count-family (BB Prone/Composed/Gets Ahead/Falls Behind): **walks-allowed rate** + personality
  (Composed/Gets Ahead = low-walks inverse → Composed reclassified buildable, no count needed).
- **Big Hack = high HR-rate + low AVG; Little Hack = low HR-rate + high AVG** (JK's performance proxy,
  replaces the static POW/CON ratings ratio — performance-earned + droppable).
- **Slow Poke = GIDP (DP) rate; Sprinter = FC rate** (JK's idea; auto-persisted, no new capture).
  beat_throw is dead because the BT button is hook-state-only (no log row) — fixable later as a
  complementary signal, not needed for v1.
- **Noodle Arm = ARM rating < 11 + Droopy/Timid + low Ambition → probability** (JK; ratings/personality-
  driven, replaces the suspect bWAR proxy).
- **Ace Exterminator = wire the opposing-pitcher-grade join** (by `atBat.pitcherId`) — JK: "we need this
  in v1."
- First Pitch Slayer/Prayer: personality-earned when no pitch-count data, refined by opt-in `pitchesInAtBat`.
- IMAGE_DRIVER: K Neglector → low Charisma + Timid/Droopy (adds a CHARISMA factor — new); Big Hack→
  Egotistical, Little Hack→Tough, First Pitch Slayer→Competitive/Egotistical, First Pitch Prayer→Timid/Droopy.

**Enabling pieces (build first):** E1 thread player ratings/grades into the builder input; E2 charisma
factor in the combiner; E3 the re-evaluate-to-drop model. Then the proxy families (R1 clean outcomes,
R2 data-proxy+personality, R3 ratings-gated). Sequence in `TRAIT_MEASUREMENT_SPEC.md §0.4`.

**Process note (ratified into SESSION_RULES pending pen):** soul-layer measurement comes from spec
verbatim, never inference — origin: the Captain inferred trait proxies twice before going to spec.

### 2026-06-18: L10 §7 + L9/trait open-question rulings (JK attended session, Q1–Q12)

**Context**: After L10 (random events) was built (5/5, build-DARK), the Captain
surfaced all outstanding design forks — the L10 §7 questions (built on AUTH-4
defaults) and the accumulated L9a/L9b trait DEFAULTS-TAKEN. JK ruled in plain
language. Several rulings OVERRIDE what was already built and trigger rework.

**Rulings (JK, 2026-06-18):**
- **Q2 — Random events build-now/activate-later:** AGREED. Compute everything but
  change nothing in the save until a post-D13 "switch on" step. (Confirms the
  build-DARK model for L10-3/4/5.)
- **Q3 — Personality-shift events:** AGREED — excluded from the random roll
  (personality shifts are arc-earned, not dice).
- **Q4 — Trade-demand ownership:** AGREED — L10 only *surfaces/triggers*; the
  propensity math stays in `tradeRequestGeneration.ts`.
- **Q5 — Cadence: OVERRIDE.** Random events do NOT batch at the 20%-of-season
  checkpoint. Traits are ongoing and can fire *any time*; other random events
  should feel similar and fire **randomly/continuously**, so changes don't all
  land at once every 20%. → reshapes the L10 firing model (L10-1 roll cadence +
  L10-3 hook trigger, currently gated on `isCheckpointBoundary`).
- **Q6 — Stadium change on the user's team:** AGREED — your team IS eligible, but
  suppressed when fans are happy.
- **Q7 — Cosmetic changes while dark:** AGREED — write to overlay, never render
  pre-launch.
- **Q8 — Name change: OVERRIDE.** Name-change IS included in v1 (not deferred);
  L10 currently excludes it. (Per Q2 it stays dark until activation; the opt-in
  nature is honored by the confirm step, not by omitting it.)
- **Q9 — `Workhorse` trait:** CONFIRMED pitcher-only.
- **Q10 — `TRAIT_OPPOSITES`:** CONFIRMED — the 14 authored pairs stand (First
  Pitch Slayer↔Prayer, Cannon↔Noodle, Clutch↔Choker, RBI Hero↔Zero, Magic
  Hands↔Butter Fingers, Tough Out↔Whiffer, Big↔Little Hack, Sprinter↔Slow Poke,
  Base Rounder↔Jogger, Stealer↔Bad Jumps, Consistent↔Volatile, Durable↔Injury
  Prone, Gets Ahead↔Falls Behind, K Collector↔Neglector).
- **Q11 — Trait reality signal:** CONFIRMED — outcome-weighted SUCCESS-RATE model
  (not bare predicate fire-count).
- **Q12 — Personality-primary exception: OVERRIDE.** Build it in v1 (was
  deferred). Personality DRIVES the trait when the measured signal is thin
  (Stimulated, Gets Ahead/Falls Behind, Big/Little Hack) — this is the §VI.3:122
  mechanism and the key to the count-family traits.
- **Q1 — The 8 "count" traits:** the per-pitch ball-strike count (L9a-2) is a
  PRECISION input, NOT a hard gate (corrects the superseded §D framing; see
  FINDING-150). First Pitch Slayer/Prayer come free from `pitchesInAtBat==1`;
  the multi-count family is personality-primary + walks/ratings proxies. JK ruling:
  **defer the per-pitch count for v1** (it only sharpens 4 traits). Triggered a
  trait-detection-scope audit (FINDING-150) before any L9b-3a rebuild.

**Consequences (rework queued, build was paused by JK):**
1. **FINDING-150** — L9b-3a built ~16 of ~39+ §VI-buildable traits (inherited the
   stale §D triage). Foundations sound; detection scope incomplete.
2. Q5 → L10 firing cadence redesign (continuous, not 20%-batched).
3. Q8 → add name-change to L10's v1 catalog (dark).
4. Q12 → build the L9b-2 personality-primary exception.
5. Q1 → L9a-2 reframed precision-only; expand L9b-3a buildable set
   (`pitchesInAtBat` first-pitch, L9a-3 handedness platoon splits, outcome
   proxies, personality-primary count-family).

### 2026-06-14: T8 (Mode 1 League Construction Suite) — scope rulings + split (JK)

**Context**: Opening the T8 ticket (IV spec §5/§6/§7 — pool registration, snake
draft, pick chart + trade validator, identity composition UI, scout-obscured farm
pricing, luxuryTax + balanceMode). Captain mapped scope across 6 surfaces
(`T8_SCOPE_MAP.md`) and surfaced 4 genuine decisions; JK ruled.

**Decisions (JK, 2026-06-14):**
1. **Split** — T8 ships as **four engine-first sub-tickets** (mirrors T6→T7):
   **T8a** pure `leagueConstruction.ts` engine + §12 constants → **T8b** tier/luxuryTax/
   balanceMode wiring + RegisteredPool persistence (`kbl-league-builder` v5→v6) + Path A
   IV re-pricing → **T8c** identity-composition UI → **T8d** snake draft (Path B) + pick
   chart + trade validator + solvency signals + potency overlay + farm scout-obscured IV.
2. **Pool scope** — T8 supports the **stock 440-pool only**; in-app custom/non-stock
   tier derivation is **deferred to T12** (Pool Recalibration Tool). T8 consumes the
   precomputed `tierParams.ts` (Juiced/Standard/Nerfed); spec §13 favors this.
3. **Identity composition — decreases are OPTIONAL, maximize customizability.** JK:
   "allow all-increase but also allow decreases … less requirements, better to allow
   the user to customize league texture." So `composeIdentity` does NOT force 2
   decreases (the §6.3 reference impl already defaults decreases to none); the T8c UI
   lets the creator freely edit the increase/decrease stack within the §6.2 envelope
   (≤2 increase + ≤2 decrease). The luxury tax + tier cap remain the balancers.
   Supersedes the open ID-9 design flag in `analyze-pool.py:1185-1188`.
4. **Identity band-priority input** — **point-allocation** (the spec'd input), not
   rank-order.

**Rationale**: Engine-first isolates the highest-correctness-risk surface (a port of
the spec-faithful Python oracle `analyze-pool.py`) for hard audit before any consumer
wires onto it; the data layer (`tierParams.ts`) already exists and is the first
production consumer here. Stock-only keeps T8 bounded and avoids duplicating T12.
Optional decreases makes identity a creative texture tool rather than a forced
trade-off, per JK's product taste.

**Trade-offs**: Optional decreases means a rational creator may take pure-upside
identities; the luxury concentration tax (not the identity stack) is then the sole
balancer of those gains — acceptable and intended. Custom-pool leagues are not
tier-calibrated until T12.

**Routing**: each sub-ticket Codex 5.5 | very high → Opus 4.8 audit (Fable unavailable;
auditor ≠ builder). T8b/T8c/T8d persistence/UI audits non-negotiable per §13.

**T8b rulings + scope refinement (2026-06-14):**
- (a) **Migration is ADDITIVE-ONLY** (JK): the `kbl-league-builder` v5→v6 upgrade adds
  `tier`/`balanceMode` (optional, on `LeagueTemplate`) + a `RegisteredPool` store; existing
  saved leagues are NOT re-priced — re-pricing applies to new construction only. No data rewrite.
- (b) **balanceMode lives in the League Builder only** (JK); the Franchise Setup Wizard
  INHERITS it (no wizard control — honors §7.1 "no wizard changes").
- (c) **SCOPE FINDING (Captain, first-hand verified):** "Path A IV re-pricing" is LARGELY
  ALREADY DONE. T5/D15 rebuilt `calculateSalary` on `computeIV().kblIV`
  (`salaryCalculator.ts:739-776`; `leagueBuilderStorage.computeInitialSalary → calculateSalary`
  at `:1653-1680`). Pool salaries are already IV-based AND tier-invariant (a player's IV never
  changes with tier; tier only shifts caps + the generated-player nerf). So T8b shrinks to:
  `registerPool` assembly (IV + tierCap + luxuryCaps + pickValueChart + balanceMode) + additive
  v5→v6 persistence + tier/balanceMode League-Builder UI — NOT a salary rewrite. The mapping
  agent's "pool priced by the OLD salaryCalculator" was imprecise; corrected here.

---

### 2026-06-14: AI-team setup reconciliation (Captain pass over Codex's setup)

**Context**: Codex built the shared operating setup (entry below). A Captain
review against existing canon (SESSION_RULES + AUDIT_PLAN + the prompt-contract
pipeline) found it ~85% aligned, with one conflict, stale facts, and three new
policies needing a JK ruling. Reconciled in one session; committed with the
setup.

**Decisions (JK-ruled 2026-06-14)**:
1. **One session-start ritual.** CLAUDE.md's startup block was reading 3 files
   (CURRENT_STATE/SESSION_LOG/DECISIONS); corrected to the canonical 5
   (SESSION_RULES → AUDIT_LOG → AUDIT_PLAN → SESSION_LOG → CURRENT_STATE) so
   every runtime boots identically. AI_TEAM_OPERATING_MODEL's build-loop opener
   aligned to the same list.
2. **Stale facts purged from CLAUDE.md.** useGameState.ts corrected to ~12,585
   lines (both prior figures — 4,647 and 2,344 — were wrong); test count no
   longer hardcoded (pointed at CURRENT_STATE live baseline, currently
   7,140/383); skill counts de-hardcoded (dirs are source of truth).
3. **Browser-verification gate.** Codex pre-checks via Playwright and reports,
   but JK's manual sign-off on real data is the SOLE closing gate. A browser
   pre-check never closes a ticket on its own.
4. **Self-Improvement Loop uses a pending-ratification pen.** Agents WRITE the
   proposed rule immediately into a `Lessons Learned (pending JK ratification)`
   section of SESSION_RULES (Write-First), but it is a PROPOSAL until JK says
   "ratify." No agent promotes its own rule or edits ratified rules without JK.
   (Chosen over fully-automatic to prevent unsupervised edits to the governing
   rulebook — the canon-drift failure mode.)
5. **Subagent strategy kept as-is** (low-risk, no conflict).
6. **CURRENT_STATE split.** The 693-line file became a ~40-line live header +
   CURRENT_STATE_HISTORY.md (full arc trail, verified byte-identical on split).
   Session-end protocol updated to match (append outgoing snapshot to history,
   rewrite live header in place).

**Rationale**: The existing system is mature; the goal was to close drift, not
add a framework. The conflict (#1) was the only true partnership-breaker — a
fresh runtime would otherwise skip its own rules file. The footgun blocks
(NODE_ENV= prefix + characterized baseline; builder-reporting completeness)
were folded into SESSION_RULES because they had been living only in scattered
CURRENT_STATE notes.

**Implications**:
- Three docs now agree on the session-start ritual; no second source of truth.
- Roles/routing/loops live in AI_TEAM_OPERATING_MODEL.md (resolves the stale
  3-role table in SESSION_RULES' Accountability section by reference).
- The current Codex session that authored the setup is now stale (files changed
  underneath it); T6 should start in a FRESH Codex session reading committed
  canon — this is a sanctioned exception to "continue long sessions" (arc
  boundary).

---

### 2026-06-14: Shared Codex / Claude Opus 4.8 Operating Model (initial setup)

**Context**: JK wants Codex, Claude Opus 4.8, and himself working as a tighter build/audit team on KBL Tracker, with less setup drift and stronger handoffs.

**Decision**: Keep `CLAUDE.md` as the canonical repo instruction file. Add `AGENTS.md` as a short Codex bridge, add `spec-docs/AI_TEAM_OPERATING_MODEL.md` as the shared team protocol, mirror selected Claude/project skills into `.agents/skills/` by symlink for Codex discovery, and mirror Playwright MCP into `.codex/config.toml`.

**Rationale**: One canonical instruction source prevents Claude/Codex drift. Symlinked skills let both runtimes share workflow definitions without copying. Separate MCP configs let both runtimes use browser tooling. The builder/auditor triangle keeps speed from eroding verification quality.

**Implications**:
- Future Codex sessions should read `AGENTS.md`, then `CLAUDE.md`, then the team operating model for multi-agent work.
- Future Claude sessions should treat Codex as the default builder/local verifier unless JK routes otherwise.
- Claude Opus 4.8 can audit Codex work when Fable is unavailable, but no agent audits its own diff.
- New shared skills should be added to the source skill folder and mirrored into `.agents/skills/` when Codex should discover them.

---

## Deferred Technical Debt Register
> Items explicitly deferred during Phase 1/2 audit (2026-02-18). Each has a trigger condition — the event that makes it worth picking up.

| ID | Finding | Item | Trigger to Re-open |
|----|---------|------|--------------------|
| DEFER-001 | F-107 | **franchiseId scoping** — seasonStorage, gameStorage, offseasonStorage have no franchiseId scope. Stats are seasonId-scoped only. Single-franchise constraint masks the gap today. | **Multi-franchise support.** When a second franchise is added, stats will bleed across franchises without this fix. Must be resolved before multi-franchise ships. |
| DEFER-002 | F-109 | **Career stats idempotency** — incremental write pattern (accepted over derive-on-read). Risk: mid-pipeline failure causes career ↔ season drift. | Any reported career stat discrepancy, OR when a write-failure bug is found in the aggregation pipeline. Add transaction-level guard at that point. |
| DEFER-003 | F-115 | **Salary service time** — age-based salary calc accepted as KBL design. No service time, no contract eligibility tiers. | If KBL adds free agency, arbitration, or contract negotiation features that require eligibility gating. |
| DEFER-004 | F-121 | **Player Dev Engine** — no 10-factor growth model exists. Design deferred. | Phase 2 design session with JK. Implement season-close development pass once model is defined. |
| DEFER-005 | F-101C | **Fan morale localStorage → IndexedDB** — will be fixed in same pass as Bug A/B per Phase 2 plan. Listed here for completeness. | Included in Phase 2 FIX-CODE execution. Not a future defer. |

> **DEFER-001 is the most important.** Multi-franchise is a planned feature. When it's on the roadmap, pull F-107 immediately — it requires touching storage, hooks, and every stats display that reads season data.

---

## February 2026

### 2026-02-18: Phase 2 Fix Queue Decisions (11 FIX-DECISION items resolved)

**Context**: Phase 1 audit complete. 11 FIX-DECISION items required JK calls before Phase 2 fix execution could begin.

**Decisions Made**:
| # | Finding | Decision |
|---|---------|----------|
| 1 | F-101C | Fan morale localStorage → IndexedDB: **same pass** as Bug A/B fix |
| 2 | F-107 | franchiseId scoping: **DEFER** — see DEFER-001 above |
| 3 | F-109 | Career stats model: **accept incremental write** + add idempotency guard |
| 4 | F-113 | Playoff stats write path: **wire it** — GameTracker → PLAYOFF_STATS during playoff games |
| 5 | F-114 | Mojo auto-update: **stay manual**. Persistence between games: **YES** (IndexedDB) |
| 6 | F-115 | Salary service time: **accept age-based** as KBL design — see DEFER-003 |
| 7 | F-119 | Relationships system: **re-enable** (add persistence + wire to LI + dev rate) |
| 8 | F-120A | Narrative persistence: **persist recaps to IndexedDB** |
| 9 | F-120B | Headline engine: **wire it** into the pipeline |
| 10 | F-121 | Player Dev Engine: **defer design** — JK has idea, define in Phase 2 before implement |
| 11 | F-122 | Record Book: **wire oddityRecordTracker AND build standard record book** |



### 2026-02-05: D3K (Dropped Third Strike) Confirmed in SMB4

**Context**: Spec documents (`RUNNER_ADVANCEMENT_RULES.md` line 23, `archive/SMB4_GAME_MECHANICS.md` line 16) incorrectly stated "Dropped 3rd Strike: ❌ NO". However, `RUNNER_ADVANCEMENT_RULES.md` line 253 correctly described D3K rules, creating an internal contradiction. The `recordD3K()` function was already fully implemented in `useGameState.ts` and fires via specific 2-3 fielding sequence detection.

**Decision**: D3K **exists** in SMB4. Updated all spec docs to reflect ✅ YES. Code implementation (`recordD3K`) is correct and requires no changes.

**Rationale**: User confirmed from direct gameplay experience that D3K is a real mechanic in Super Mega Baseball 4. The original spec entries were wrong.

**Files Changed**:
- `spec-docs/RUNNER_ADVANCEMENT_RULES.md` — Line 23: ❌ NO → ✅ YES
- `spec-docs/archive/SMB4_GAME_MECHANICS.md` — Line 16: ❌ NO → ✅ YES

**Implications**: The existing `recordD3K()` code in `useGameState.ts` is correct as-is. D3K detection via 2-3 fielding sequence can remain active.

---

### 2026-02-03: Testing Plan Expanded to Cover Complete Figma UI

**Context**: Testing Implementation Plan originally focused heavily on GameTracker and calculation engines. User requested comprehensive coverage of ALL Figma UI components.

**Decision**: Expand testing plan from 6 phases to 11 phases, covering every page and component in the Figma codebase.

**Rationale**:
- Original plan would leave 60+ UI components untested
- League Builder, Franchise Mode, Exhibition, and Playoffs all have significant business logic
- Offseason flows (Trade, Draft, Free Agency, etc.) have complex state management
- Complete coverage ensures no orphaned or broken UI code

**Phases Added**:
| Phase | Coverage | Tests |
|-------|----------|-------|
| Phase 6 (Expanded) | GameTracker UI Components | 50+ |
| Phase 7 | League Builder (7 pages) | 40+ |
| Phase 8 | Franchise Mode (15 components, 6 hooks) | 80+ |
| Phase 9 | Exhibition Mode | 15+ |
| Phase 10 | Playoff/World Series | 25+ |
| Phase 11 | Navigation | 10+ |

**Sprint Plan Extended**:
- 5 sprints → 8 sprints
- Sprint 5-8 cover Phases 6-11

**Target Changes**:
- Test files: 55+ → 120+
- Passing tests: 1800+ → 3000+

**Intentionally Skipped**:
- 45 shadcn/ui primitive components (library code, not business logic)
- DragDropFieldDemo.tsx (demo component)
- SubstitutionModalBase.tsx (tested via derived modals)

**Document Updated**: `spec-docs/TESTING_IMPLEMENTATION_PLAN.md`

---

### 2026-02-03: Legacy↔Figma Codebase Reconciliation Complete

**Context**: Build was failing with 42 TypeScript errors after Phase 1 & 2 Figma buildout.

**Decision**: Fix API mismatches in integration wrappers rather than rewriting integrations.

**Rationale**:
- Root cause was AI-generated integration files that hallucinated API signatures
- Integration wrappers assumed different function signatures than actual legacy engines
- Fixing to match actual APIs is faster and preserves existing architecture

**Root Cause Pattern Identified**:
```
Integration file assumed: processEndOfSeasonAging(age, rating)
Actual legacy API:       processEndOfSeasonAging(age, {overall: rating}, fame, modifier)
```

**Files Fixed**: 7 integration/hook files
**Files Created**: 2 stub files for missing franchiseStorage

**Special Case**: `useFanMorale.ts` was stubbed out (not imported anywhere, 21 errors)

---

## January 2026

### 2026-01-25: SMB4 UI Cleanup - Removed Balk Button

**Context**: User manual testing revealed Balk button was still present in GameTracker despite balks not being possible in SMB4.

**Decision**: Remove BALK from event buttons entirely.

**Rationale**:
- SMB4 does not have balks as a game mechanic
- "Too many throws over" IS possible but is not a balk
- The button was creating confusion and wasting UI space
- Per SMB4_GAME_MECHANICS.md - only real baseball rules that SMB4 implements should have buttons

**Files Changed**:
- `src/components/GameTracker/AtBatButtons.tsx` - Removed 'BALK' from eventButtons array

---

### 2026-01-25: Added Position Switch Feature

**Context**: User feedback that there was no way to change a defensive player's position without first removing them from the game (Def Sub → new player at new position).

**Decision**: Add POS_SWITCH event type allowing position swaps between players on field.

**Rationale**:
- In baseball, managers can move players to different positions without substitution
- Example: Move SS to 2B and 2B to SS (defensive realignment)
- This is common for defensive positioning based on batter handedness or late-game situations

**Files Created/Changed**:
- `src/types/game.ts` - Added 'POS_SWITCH' to GameEvent, PositionSwitchEvent interface
- `src/components/GameTracker/PositionSwitchModal.tsx` - New modal component
- `src/components/GameTracker/AtBatButtons.tsx` - Added "Pos Switch" button
- `src/components/GameTracker/index.tsx` - Wired up modal

---

### 2026-01-25: Day 3 Spec Contradiction Resolution

**Context**: NFL audit identified 5 spec contradictions that appeared to conflict but actually represented intentional dual-purpose systems.

**Decisions** (per user):

1. **Mojo Jacked (WAR 0.90x vs Stat 1.18x)**: **Keep both** - These serve different purposes. The 0.90x WAR credit is for attribution (luck factor), while 1.18x stat boost is for simulated performance.

2. **Juiced Fitness (Fame 0.5x vs Stat 1.20x)**: **Keep both** - Fame credit (0.5x) applies to all games as PED stigma, stat boost (1.20x) primarily for simulated games. Clarifying note added to spec.

3. **Strained Fitness (WAR 1.10x vs Fame 1.15x)**: **Use both values** - Different contexts. WAR credit 1.10x for stat attribution, Fame credit 1.15x for achievement recognition ("playing through pain").

4. **Rattled Mojo (Clutch 1.30x vs WAR 1.15x)**: **Use both values** - Clutch 1.30x applies to leverage-weighted situations, WAR 1.15x for general attribution. Both reward overcoming adversity.

5. **FIP Constant (3.10 vs 3.15)**: **Use 3.15 for spec examples** - Updated PWAR_CALCULATION_SPEC.md. Actual SMB4 implementation uses 3.28 (calibrated from league data per ADAPTIVE_STANDARDS_ENGINE_SPEC.md).

**Rationale**: The apparent contradictions are intentional design - a nuanced system where stat performance, WAR attribution, Fame recognition, and clutch evaluation each have their own appropriate modifiers.

**Implications**:
- Clarifying notes added to MOJO_FITNESS_SYSTEM_SPEC.md
- FIP constant guidance updated in PWAR_CALCULATION_SPEC.md
- MASTER_SPEC_ERRATA.md should be updated to mark these as resolved

---

## January 2025

### 2025-01-21: Adaptive Learning Architecture

**Context**: Building fielding inference system - need probability matrices for which fielder handles balls by direction/type. No perfect MLB data source exists for exact percentages.

**Decision**: Implement "reasonable defaults + learn over time" architecture across ALL statistical systems, not just fielding.

**Design**:
1. Start with sensible defaults based on MLB research/first principles
2. Track expected vs. actual outcomes for every inference
3. Store historical data to refine probabilities over time
4. Apply learning to: fielding assignments, park factors (HR distance), batted ball outcomes, etc.

**Rationale**:
- Avoids over-engineering upfront with fake precision
- Real usage data from YOUR games is more relevant than MLB averages
- Creates a system that gets smarter the more you use it
- Allows for player-specific tendencies (e.g., "this CF has exceptional range to left-center")

**Implications**:
- Data persistence becomes even more critical (must store historical data)
- Need schema design that supports expected/actual tracking
- Future features: "confidence intervals" on inferences, anomaly detection

---

### 2025-01-21: UI/UX Deferred Until Feature Complete

**Context**: Current UI is functional but rough. Question arose: design now or later?

**Decision**: Complete all backend logic/features first, then do comprehensive UI/UX pass.

**Rationale**:
- Designing before features are complete risks rework
- One coherent design pass is better than incremental patches
- Well-documented specs make future design a "translation" exercise
- Risk of designing wrong thing > cost of designing later

**Implications**: Current UI will remain rough during development phase.

---

### 2025-01-21: UI Testing Protocol Established

**Context**: Needed to verify that code logic worked correctly through the actual UI, not just unit tests.

**Decision**: Established comprehensive UI testing protocol using browser automation to click through all scenarios.

**Rationale**: Unit tests verify logic in isolation, but UI tests catch:
- Modal interaction bugs
- State not updating correctly
- Button enable/disable issues
- Visual feedback problems

**Outcome**: 17 UI test scenarios documented in WORST_CASE_SCENARIOS.md

---

### 2025-01-21: Video Game Tracker Clarification

**Context**: Initial edge case list included real-baseball scenarios like catcher interference, kids league rules.

**Decision**: Removed inapplicable scenarios. This is a VIDEO GAME tracker (MLB The Show style), not real baseball.

**Implications**:
- No umpire judgment calls needed
- No catcher interference, balk detection by system
- User manually inputs all outcomes (game tells them what happened)
- DH rules still apply (can be removed mid-game)
- Substitution rules still apply

**Rationale**: User clarified the use case. Real baseball has scenarios that don't occur or matter in video games.

---

### 2025-01-21: DP Out Counting Fix

**Context**: DP was adding 3 outs instead of 2 (DP result + runner marked as out).

**Decision**: DP result adds exactly 2 outs. Runner outcomes during DP that show "Out" are part of the DP, not additional outs.

**Code Change**: Modified `handleAtBatFlowComplete` to not double-count runner outs on DP.

**Test**: Verified with bases loaded, 1 out. DP should result in exactly 3 outs (1+2), not 4.

---

### 2025-01-21: Base Clearing Bug Fix

**Context**: When R2 scored, wrong base was being cleared (third instead of second).

**Decision**: Fixed line 183 in index.tsx to clear `second` base, not `third`.

**Root Cause**: Copy-paste error during initial implementation.

---

### 2025-01-21: Extra Events Processing Fix

**Context**: Extra events (SB, WP, PB, Balk) recorded during at-bat weren't being processed when at-bat completed.

**Decision**: Added `extraEvents` processing in `handleAtBatFlowComplete`.

**Rationale**: Events during an at-bat need to be applied to game state before moving to next batter.

---

### 2025-01-XX: RBI Exclusion Rules

**Context**: Needed to define when RBIs should NOT be credited.

**Decision**: No RBI credited for:
- Runs scored on errors (E)
- Runs scored on double plays (DP)
- Runs scored on wild pitches (WP)
- Runs scored on passed balls (PB)
- Runs scored on balks

**Rationale**: Follows MLB Official Scoring Rules. These are not "driven in" by the batter.

---

### 2025-01-XX: Force Play Logic

**Context**: Needed to determine when runners are forced to advance.

**Decision**: Implemented `getMinimumBase()` function with rules:
- Walk/HBP: Only force if all bases behind are occupied
- Single: R1 forced to 2B minimum
- Double: R1/R2 forced to 3B minimum
- Triple/HR: All runners must score

**Rationale**: Follows baseball rules - a runner is forced when the batter (or another forced runner) takes their base.

---

### 2025-01-XX: 3rd Out on Force Play Rule

**Context**: If 3rd out is a force play, runs that crossed plate before the out do NOT count.

**Decision**: Implemented check in scoring logic - if 3rd out is force, nullify any runs scored on that play.

**Rationale**: MLB Rule 5.08 - run cannot score if third out is force out at any base.

---

## Template for New Entries

```markdown
### YYYY-MM-DD: [Brief Title]

**Context**: [What situation led to this decision?]

**Decision**: [What was decided?]

**Alternatives Considered**: [Optional - what else was considered?]

**Rationale**: [Why this choice?]

**Implications**: [What does this affect going forward?]

**Outcome**: [Optional - what happened as a result?]
```

---

*Add new decisions at the top of this document.*
## Feb 15, 2026 — Park Dimensions as Canonical Data

**Decision:** Use Billy Yank's Guide to Super Mega Baseball (3rd Edition) as the canonical source for all SMB4 park dimensions (fence distances and wall heights).

**Context:** The app needs real park dimensions for two features: (1) HR distance validation during at-bat recording, and (2) park factor derivation for WAR calculations. The existing ParkFactors interface in src/types/war.ts had abstract multipliers but no connection to actual stadium geometry.

**Rationale:** Billy Yank's Guide is the most comprehensive community resource for SMB4 data. The fence distances were manually compiled from in-game measurements across all 23 stadiums. Wall heights are categorized as low/medium/high.

**Implementation:** src/data/smb4-parks.json + src/data/parkLookup.ts. Consumed by upcoming R2 (park factor derivation) and B3 (stadium association + HR validation).

**Trade-offs:** The dimensions are representative, not pixel-perfect. Parks have variable geometry that a simple LF/CF/RF + wall height model doesn't fully capture (e.g., Lafayette Corner's frequent wall height variations, Stade Royale's unusual outfield shape). This is acceptable for v1; refinement is deferred.

---

## Feb 15, 2026 — Shim Modules for src_figma Imports

**Decision:** Create re-export shim modules in src/src_figma/utils/ rather than mass-renaming import paths.

**Context:** The src_figma directory tree had stale imports pointing to ../../utils/gameStorage etc. that broke when the root utils modules were restructured. The options were: (a) fix every import path in src_figma, or (b) create thin shim modules that re-export from the correct locations.

**Rationale:** Shims minimize churn and risk. Changing dozens of import paths across components and tests is high-risk for a non-functional change. Shims achieve the same result with 4 small files.

**Trade-offs:** Adds a layer of indirection. If src_figma is ever consolidated into the main source tree, the shims should be removed and imports updated directly.

---

## Feb 15, 2026 — Archived Code Excluded from Build

**Decision:** Exclude src/archived-pages/ and src/archived-tests/ from TypeScript compilation via tsconfig.app.json rather than deleting them.

**Context:** 16 of 26 pre-existing build errors came from archived files referencing modules that no longer exist. These files are not used by the running application.

**Rationale:** Excluding preserves git history and allows future reference. Deleting would be cleaner but irreversible without git archaeology.

**Trade-offs:** The files still exist on disk and could confuse future contributors. A comment in tsconfig.app.json explains why they're excluded.

---

## Jun 14, 2026 — Recommendation surfaces may never consume hidden information (no-oracle-leak principle)

**Decision:** Any KBL recommendation surface (Mode 2 call-up/send-down recs = T7b; in-game sub recs = T9; any future advisory surface) may consume ONLY scout-visible / user-visible information when valuing a player whose true ratings are hidden. Farm prospects are valued from `scoutedGrade` + `scoutConfidence` (the scouted view), NEVER from true ratings / true IV. MLB players (known commodities) use the true TV2 value.

**Context:** Drafting T7b (§8.3 call-up/send-down recs), the proposed v1 valued farm prospects on their internal trueIV. JK caught that this leaks: a rec built on true value is an oracle — an astute user back-calculates relative value, and thereby the hidden ratings, regardless of scouting accuracy.

**Rationale:** (1) Preserves §7.4 (scout-obscured farm IV) — the rec adds no information the user doesn't already have. (2) Preserves the risk/reward asymmetry: MLB players are KNOWN (true value); farm prospects are UNCERTAIN (scouted estimate carries noise w = scoutNoiseBase × (1 − scoutAccuracy)) — so calling up a prospect is a genuine gamble and sending down a known commodity is the certain side. (3) Preserves call-up excitement: true ratings reveal ONLY at call-up; the rec never knew them.

**Trade-offs:** The rec is only as good as the scouting (it can be wrong) — which is the intended design, not a defect. A richer scouted-distribution / expected-value model (vs the v1 scouted point-estimate + confidence label) is a flagged follow-up. Governs T7b; cite in T9.

---

## Jun 14, 2026 — T8d scope rulings (snake-draft suite)

**Decision (4 rulings, JK via AskUserQuestion):** For T8d (the §7.3 snake-draft surface):
1. **Solvency budget source = tierCap for every team.** No new per-team budget field is added in v1.
   `budget` in the §7.3:491 solvency inequality = `TIER_CAPS[tier].tierCap`. Per-team divergence in the
   GREEN/YELLOW/RED/BLOCKED signals comes ONLY from identity-shifted luxury caps + each team's drafted
   roster, not from per-team budgets. (§5.2's "budgets may be set below tier cap" is NOT implemented in v1.)
2. **`cheapestFillCost` = position-agnostic for v1.** The reserve term is `slotsRemaining × (cheapest
   available salary in the live remaining pool)`, ignoring the 22-man positional skeleton (which the spec
   never enumerates). Luxury tax + tier cap remain the real balancers.
3. **Potency overlay (R12) DEFERRED to a fast-follow.** The chemistry count→tier (L1/L2/L3) numeric
   mapping is undefined anywhere (not §12, not constants, not any SMB4 reference doc). Building it now would
   mean inventing thresholds (a spec-discipline violation). T8d ships without the potency overlay; R12
   returns once the SMB4 in-game thresholds are known. Note: the prior `T8_SCOPE_MAP.md` claim that an
   `effectiveRatings.potencyTier` function exists is FALSE — `potencyTier` is a TYPE only
   (`rosterEngineConstants.ts:11`); the resolver function must be built when R12 is undeferred.
4. **Farm scope = MLB board only; §7.4 scout-obscured farm IV (R9) DEFERRED to a fast-follow.** T8d builds
   ONLY the 22-man MLB snake board. The existing farm/prospect draft (`LeagueBuilderDraft.tsx`, scoutedGrade
   model) stays exactly as-is, protecting the working farm-scouting handoff. The §7.4 trueIV-range display
   becomes a clean follow-on (which will then resolve the scoutedGrade-vs-trueIV-range model collision).

**Context:** Captain mapped T8d via a 7-agent decorrelated fan-out (`T8d_SCOPE_MAP.md`). Four design forks
genuinely gated the build (no defensible default existed). JK ruled all four to the recommended (leanest)
option.

**Implications:** T8d collapses from 4 sub-tickets to **3**: T8d-1 (snake + solvency engine, pure),
T8d-2 (draft-session persistence v6→v7 + snake-board shell + dual-write + handoff verify), T8d-3 (board
overlays: pick chart + trade validator + per-team signals). R9 + R12 are tracked fast-follows. Two
constants enter the registry now (`solvencyRedMargin` 0.10; `solvencySevereTaxFrac` ≈ 0.20 Captain default
for the RED "severe tax" band, proceed-unless-vetoed); `scoutNoiseBase` defers with R9.

**Trade-offs:** Position-agnostic `cheapestFillCost` can theoretically let a team overspend and be unable
to fill a specific position — acceptable for v1 (tax+cap are the real guardrails; revisit if playtest shows
position starvation). MLB-first defers the farm IV-range, leaving two farm-value models un-unified until R9.

---

## Jun 14, 2026 — T9 scope rulings (GameTracker sub-recommendation rebuild)

**Decision (4 rulings, JK via AskUserQuestion):** For T9 (IV spec §10 — rebuild the in-game
`generateManagerRecommendations` placeholder onto effectiveRatings, the "third surface"):
1. **Delta metric = IV-of-effectiveRatings (kblIV).** `delta = computeIV(effectiveRatings(sub)).kblIV −
   computeIV(effectiveRatings(current)).kblIV`, identical to T7a `optimizeLineup` / §8.1 — "one truth,
   three surfaces." Leverage enters via pressure→mojo amplification inside effectiveRatings; the dedicated
   leverage-weighted surface is T10 (Lineup Delta WPA), kept separate.
2. **`subRecThreshold` = per-type** (pinch-hit / defensive-replacement / pitcher-change), in kblIV-dollar
   units, CALIBRATE/playtest-tunable. (kblIV magnitudes differ by rec type, so a single global threshold
   would over/under-fire by type.)
3. **New pure engine module** `src/engines/subRecommendations.ts` (`recommendSubs` → neutral
   `SubRecommendation[]`); `managerWpaRecommendations.ts` becomes a thin adapter mapping
   `SubRecommendation → ManagerRecommendation`. Matches §11's pure-engine boundary.
4. **Split = 2 tickets** (engine-first): **T9a** pure engine (+ `subRecThreshold`), exhaustively unit-tested,
   standing auto-commit; **T9b** GameTracker integration (widen the call-site mapping, derive the pressure
   band, rebuild the 3 generators to call the engine, rewrite generation tests) — user-visible +
   GameTracker-state → audit non-negotiable + JK surface before commit.

**Context:** Captain mapped T9 via a 4-agent decorrelated fan-out (`T9_SCOPE_MAP.md`). Decisive finding:
full ratings + traits are ALREADY in live state (the rec call-site just strips them), so T9 needs no deep
`useGameState` plumbing — only a widened call-site mapping + a derived pressure band + `subRecThreshold`.

**Implications:** T9a is a clean isolated engine addition (new file + additive type exports + an
`activeTraitNames` helper on effectiveRatings.ts for justification naming + the per-type constant);
rosterAnalyzer/T7 stays byte-unchanged (the scorer is reimplemented and the audit diffs it for
equivalence vs `rosterAnalyzer.ts:535-571`). The `ManagerRecommendation` output type + watch/decision
plumbing + NewsBoard UI are preserved by T9b.

**Captain defaults (proceed-unless-vetoed):** pressure band none<1.5≤high<3.0≤extreme (builds on the
existing isClutch LI≥1.5 precedent, CALIBRATE); role-misuse applied as a mojo-LEVEL down-shift on the
candidate before scoring (CP early-entry inning derived from totalInnings); defensive-sub folds
DefensivePlacementRisk into the kblIV delta (mirrors T7a `assignmentEntry`) AND surfaces it as
justification; no-oracle-leak N/A for T9 (active known 22-man roster).

**Trade-offs:** kblIV for a pitcher-change compares two pitchers' arsenal-dominated kblIV — a coarse but
consistent in-game signal; refine via T10 if playtest shows need. Reimplementing the scorer duplicates ~15
lines of clamp+assemble mapping (audit-diffed) rather than refactoring T7 — chosen to keep T9a isolated.

**T9b firing-gate addendum (JK 2026-06-14):** in-game sub recs fire on a **PURE IV-delta gate** — emit
whenever the best sub's per-type IV-delta > `SUB_REC_THRESHOLD[type]`, with NO separate situational
pre-filter. The rebuild REMOVES the placeholder's situational firing heuristics entirely (leverage floor,
batting-order 7-9 pinch-hit gate, pitcher meltdown triggers: consecutive baserunners / runs-allowed-in-
inning). Rationale (JK): fatigue is baked into the tiring player's effectiveRatings and leverage amplifies
via mojo/pressure, so the IV-delta self-limits — spec-literal "replace, do not patch." Accepted tradeoff: a
situational meltdown with no ratings drop (e.g. a pitcher walking the bases loaded) won't trigger a rec, and
recs may surface in low-leverage spots; revisit in playtest if the firing cadence feels off. (Captain had
recommended a situational-gate + IV-delta hybrid; JK chose the pure gate.)

---

## Jun 15, 2026 — T10 scope rulings (Lineup Delta WPA standard + constants snapshotting)

**Context:** Captain mapped T10 (IV §9 Lineup Delta WPA standard + §12 per-season constants snapshot) via a
6-agent decorrelated fan-out + 2 critics (`T10_SCOPE_MAP.md`). All decision-determining claims independently
Captain-verified (file:line). Decisive findings: (1) the §8.1 optimizer (`optimizeLineup`) and the lineup-lock
snapshots are already built; (2) the LITERAL §9 delta already exists but display-only —
`summarizeLineupSnapshotComparison` (`optimalLineup.ts:416-429`) returns
`projectedOpportunityCostTotal = chosen.projectedTeamLineupKblWpa − optimal.projectedTeamLineupKblWpa`; (3) the
ALREADY-PERSISTED `ManagerLineupDeltaRecord.managerWpa` (`managerWpaGameState.ts:929-941`) is a DIFFERENT
number — realized-vs-projected (`actualChosenKblWpa` realized in-game WPA − projected IV), a unit mix; (4)
"WPA" is a misnomer — per D9 the values are IV-of-effectiveRatings dollars rescaled by a ÷10,000,000 divisor
(`rosterEngineConstants.ts:260`); (5) no constants-snapshot mechanism exists (greenfield); (6) a pre-existing
defect: `backupRestore.ts` is stale at v12 and silently drops the v13/v14/v15 stores (separate ticket).

**JK rulings (3 forks, recommendations adopted):**
1. **§9 semantics = IV-of-effectiveRatings (NOT literal win-probability).** Per D9 + all shipped code. "WPA"
   is legacy branding; the misnomer is documented in spec + code comment, and any field rename is DEFERRED to
   a v2 ticket (renaming would touch persisted records + ~30 readers).
2. **The §9 standard = the LITERAL pure projected-vs-projected scalar, persisted additively; the existing
   realized-vs-projected `managerWpa` is KEPT SEPARATE and UNTOUCHED.** They measure two legitimately
   different things (ex-ante opportunity cost vs ex-post manager credit). The new §9 scalar is sourced from
   `summarizeLineupSnapshotComparison` and persisted as a NEW, additive, audit-only field — it does NOT fold
   into the `managerValue` rollup (would double-count the per-slot deltas already summed there) and MUST NOT
   regress any of the 5 live surfaces or `almanacManagerWpa.test.ts`.
3. **Constants snapshot = full-dependency CONTENT HASH stamped on `SeasonMetadata`; single "high" T10 ticket.**
   Hash the full optimizer dependency set — the optimizer subset of `rosterEngineConstants` + `ivCurves` +
   `traitPricing` + `traitInteractionMatrix`; **`tierParams` EXCLUDED** (not imported by any of the 3 optimizer
   engines, verified). Stamp `optimizerConstantsVersion`/`optimizerConstantsHash` additively on `SeasonMetadata`
   (precedent: `gamesPerTeam`; no DB bump; travels in backup since `seasonMetadata` IS registered). Mechanism =
   prove-no-change (hash + version), NOT a value-copy blob (the per-game §9 scalar is already persisted, so the
   value is recoverable; the snapshot only certifies WHICH constants produced it). Write-once per season,
   assert-immutable with a LOUD warn on divergence (never silent overwrite).

**Split (auto-resolved by ruling 3):** single **T10** build ticket — Codex 5.5 | high → Opus 4.8 audit
(auditor ≠ builder). NOT split, because the SeasonMetadata-hash mechanism adds NO DB migration. (Would have
split T10a/T10b only if a dedicated season store or value-copy had been chosen.)

**Captain default (proceed-unless-vetoed, Q5):** persist the §9 scalar whenever an optimizer baseline is
computed (all modes that lock a lineup); require/stamp the season constants snapshot only for games carrying a
`seasonId`; for snapshot-less modes (exhibition/elimination) record the live constants `version` string so the
delta stays traceable.

**Asset gate:** T10 reads mojo/fitness/traits only as optimizer INPUTS and snapshots constants READ-ONLY — it
modifies none of the SMB4-protected engines. No asset-gate approval required beyond these rulings.

**Persistence note:** T10 adds new persisted fields (per-game §9 summary + per-season constants hash) → it is a
persistence / saved-data-shape change → per the risk-scoped ruling it SURFACES to JK before commit (NOT
auto-commit) and is prioritized in the browser-verify batch.

---

### 2026-06-16: Reporter (§18.1 verification read) — franchise wiring rulings (JK)

**Context**: First of the four `FRANCHISE_V1_LIVING_SEASON_SPEC.md` §18 verification reads. Captain ran a
`reporter-certification-read` workflow (8 dimension-mappers + 5 adversarial verifiers; full doc
`spec-docs/REPORTER_CERTIFICATION.md`). Certified: the base reporter is a **certify-and-connect** job for
franchise (downstream engine is already franchise-aware, no mode gate), with one genuine **build** gap (the
accuracy model). Key facts behind the forks: (a) only two of five cadence beats fire live in any mode —
between-inning summaries + post-game columns; per-play + preamble are orphaned everywhere; (b) TWO reporter
systems coexist — the live `GameStory`/`PostGameColumns` system (wired into Exhibition/Elimination) vs the
legacy `narrativeEngine.ts` template that FranchiseHome's hub actually shows; (c) assignment + lookup key on
`leagueId` only, but franchise scope is `franchiseId/seasonId`; (d) the ~10% inaccuracy model §24.5/§24.7 needs
exists only on the legacy engine — flag-only (never distorts text), orphaned at consumption, absent from the
live pipeline. §5 invariant (LLM narrates, never decides) CONFIRMED safe; reporter persistence CONFIRMED
backup-safe (the v12 defect drops only the v13-15 franchise-economy stores, not reporter data).

**Decisions (JK, 2026-06-16):**
1. **REP-1 — Franchise reporter cadence v1 = POST-GAME COLUMNS ONLY.** Leaner than the Captain's "match
   Exhibition/Elimination" recommendation: franchise v1 skips live in-game commentary entirely (no
   between-inning summaries, no per-play, no preamble) — the reporter speaks only after the game. Implication:
   the `liveBeatReporterEnabled` flag is not needed for franchise; only `postGameColumnsEnabled` must be set on
   franchise launch. Smallest connect surface + lowest LLM cost.
2. **REP-2 — Canonical franchise news = the LIVE `GameStory`/`PostGameColumns` system.** Rewrite
   `FranchiseHome.BeatReporterNews` to read the persisted `GameStory` records; retire the legacy
   `generateGameRecap` template path for franchise. One system, the real reporter columns.
3. **REP-3 — Franchise reporters keyed by `franchiseId`** (stable across the franchise's life, not per-season).
   Avoids collision with Exhibition reporters that share `teamId+leagueId`. Requires reconciling
   assignment/`getReporterForTeam` (currently `leagueId`-keyed) to a `franchiseId` scope for franchise games.
4. **REP-4 — The ~10% inaccuracy model is BUILT FRESH inside the §24 relationships-lite ticket, not the base
   reporter-connect ticket.** Base reporter ships WITHOUT it. The §24 build adds a reusable **seeded**
   inaccuracy primitive + a persisted accuracy field; meaning recommended as hedge/flag in v1 with
   content-distortion deferred (final meaning ruled when §24 is drafted). Unblocks the base reporter now.

**Non-blocking (noted, not gating cadence):** the whole backup/restore feature + the reporter-almanac
"living-memory" writer are both orphaned (no user trigger today); Claude column spend has no client-side rail
(Grok-only 500/day); the reporter is server-key/network-dependent (no offline fallback). Bump the
`backupRestore` v12 pin → 15 remains a separate tracked ticket.

**Asset gate:** none required — this is a read + design ruling; no SMB4-protected engine is touched. The build
tickets these rulings unblock are persistence/user-visible → they SURFACE to JK before commit per the
risk-scoped rule.

---

### 2026-06-16: Reporter SEASON-LONG cadence (§18.1b) — publish-bus model + rulings (JK)

**Context**: JK flagged that the REP-1 ruling settled only the IN-GAME cadence (post-game columns); the
SEASON-LONG narrative cadence — how the reporter tells the morale / relationship / race / designation story
BETWEEN games — was never addressed (logged as a scoping lesson in SESSION_RULES pen). Captain ran a second
read (`reporter-season-cadence-read` workflow, 7 mappers + 5 adversarial verifiers; full doc
`REPORTER_CERTIFICATION.md` Part 2 §K-O). **Decisive finding:** unlike the in-game half (certify-and-connect),
the season-long narrative is **overwhelmingly UNBUILT** and is a downstream consumer of nearly every Phase-2
system — the reporter narrates what the deterministic matrix produces, and most of those event SOURCES (live
designations/flips, races, random events §10, the auto/logged morale ledger, relationships, manager firings)
ARE the unbuilt Phase-2 features. Certified gaps: no season-news record type (only game-bound `GameStory` +
`CommentaryFeedEntryRecord`); the season-memory substrate (almanac/legacy-summary) is half-wired (read-back
live, write/regen orphaned → prompt input always empty); no sim-tunable emission gate; pre-action hooks
(§24.5/§24.7) are build-from-scratch (the revenge substrate in `tradeEngine.ts`/`headlineEngine.ts` exists but
orphaned; relationship data source empty). Today only game-end drives a take; trade/roster moves fire as bare
transactions with morale/relationship riders hardcoded `false`.

**Decisions (JK, 2026-06-16):**
1. **SEA-1 — Accept the PUBLISH-BUS cadence model; build the reporter foundation EARLY.** The season-long
   cadence is event-driven, not a clock: a Phase-2 system produces a narratable outcome → emits a
   `NarrativeEvent` → a sim-tunable emission gate (marquee-only default) decides if it warrants a take → the
   canonical reporter renders it into a persisted `SeasonNewsItem` → seeds reporter season-memory → surfaces on
   the franchise hub feed + Almanac. The foundation (news record + emission gate + a non-game generation method
   on the canonical live reporter + hub season-feed + wiring the orphaned season-memory) is built EARLY as
   Phase-2 infrastructure; each later soul-layer system then adds its event tap as it lands. The reporter is
   near the FRONT of the Phase-2 dependency order, not a late standalone ticket.
2. **SEA-2 — Separate season-emission-config.** The sim-tunable emission gate is a NEW config keyed by the
   season-event taxonomy (per-event-type base rate + per-race Top-N depth + global marquee-only flag),
   sim-writable, kept DISTINCT from the player-facing in-game `narrativeIntensity` dial. (The season analog of
   the in-game `notabilityScorer`; emission volume settled by the Simulation Gate §16 per the 2026-06-16
   "let the sim decide" ruling.)
3. **SEA-3 (deferred to data-model design)** — whether to fold season news into one `SeasonNewsItem` vs reuse
   the two reserved-but-dead stores (`narrativeContext` for storyline/momentum state, `rivalryScores` for §24
   relationship-edge state). Captain lean: one `SeasonNewsItem` for news + `rivalryScores` for relationship
   edges; finalized when the record is designed.
4. **SEA-4 (Captain reconciliation, JK did not veto) — pre-move heads-up is ADVISORY, never a hard gate.**
   §24.5 ("a pre-commit heads-up, NEVER a hard gate") supersedes the older `FARM_SYSTEM_SPEC` blocking-modal
   wording (FINDING-133, which has zero code anyway).
5. **SEA-5 (Captain reconciliation, JK did not veto) — REP-2 holds for season takes.** Generation lives on the
   canonical LIVE reporter; the orphaned legacy `generateTradeNarrative`/`generateMilestoneNarrative` templates
   are NOT revived — their `NarrativeEventType` vocabulary is reused, the generation is rebuilt on the live
   system.

**Status:** §18.1 (reporter) verification read is now COMPLETE — both the in-game cadence (REP-1..4) and the
season-long narrative cadence (SEA-1..5) are settled. The reporter-foundation build ticket + the per-source
event taps fold into the Phase-2 "living-season D-stack" sequencing the Captain drafts after the remaining §18
reads. Asset gate: none (read + design only).

---

### 2026-06-16: Traits-from-reality (§18.2 / §9) — full trait→signal model (JK)

**Context**: Second §18 verification read. Captain ran a `trait-to-signal-mapping` workflow (4 ground-truth readers
+ 5 per-chemistry mappers covering all 72 traits + 3 adversarial verifiers) → `TRAIT_SIGNAL_CERTIFICATION.md`.
Certified the crux (`typed ≠ populated`): the pressure spine (leverage/WPA/clutch/runners/RBI) is auto-populated,
but the discriminating signals (count, pitch type, pitch location, fielding difficulty, chase, handedness, mojo)
are absent / typed-but-unwritten / manual-opt-in. Initial triage 13 A / 24 B / 35 C; then a JK design session
worked the 33-deep C bucket down to **1 cut + everything else buildable**. Also certified: the §9 *engine* (3
layers — log-reconstructed activation context, strength scoring, trait grant/write-back) is entirely UNBUILT, but
`traitInteractionMatrix.ts` already encodes every activation predicate (the foundation).

**Decisions (JK, 2026-06-16):**
1. **TS-1 — Acquisition formula:** P(gain/lose) = f(reality-percentile-vs-peers, personality-tilt, current-morale),
   min-sample gated, gain-high/lose-low hysteresis, 2-trait cap (strength-ranked displacement, no offsetting pair).
2. **TS-2 — Peer-relative is mandatory** for both valences (anti-dilution + it IS the strength score; rides the
   Adaptive Standards machinery; auto-scales by season length + pool talent).
3. **TS-3 — Min-sample safety valve** ⇒ enrichment is opt-in ("Franchise-lite"); thin data = trait dormant, never
   flickers; also guards against confirmation spam (trait changes are confirmed per §11).
4. **TS-4 — Season-length-scaled thresholds** for count-based triggers (mirrors WAR's `RUNS_PER_WIN` scaling;
   percentile model handles most for free). E.g. Injury Prone: 40g→2 injuries, 80g→3, 120g→4.
5. **TS-5 — Personality weighting** in two layers: universal (Ambition↑ positive-gain, low-Resilience↑
   negative-catch) + four "image" axes (Composure / Hustle / Big-game / Approach — see cert §VI.3). Personality is
   PRIMARY where the measured signal is thin (Stimulated, Gets Ahead/Falls Behind, Big/Little Hack), a TILT where
   strong. Mechanical splits (vs L/RHP, Specialist, Reverse Splits, Pick Officer, K Neglecter, Utility) = no
   personality image.
6. **TS-6 — Role eligibility (crystal):** 24 pitcher-only, 40 position-player-only (25 batting / 7 baserunning /
   8 fielding), 7 universal (Clutch, Choker, Durable, Injury Prone, Consistent, Volatile, Stimulated), 1 cut.
   Full lists in cert §VI.2. Two Way is pitcher-only and the GATEWAY (a pitcher who hits elite-for-a-pitcher →
   everyday player → then eligible for batting traits). Captain-default edge cases (veto open): Wild Thrower +
   Pinch Perfect = position-player-only.
7. **TS-7 — Sign Stealer CUT** entirely, including from draft-class generation (least-valuable, no signal).
8. **TS-8 — Reclassified from C via JK rulings:** Easy Target = chase-for-OUTS (negative mirror of Bad Ball
   Hitter = chase-for-HITS, same signal split by outcome); the steal-vulnerability trait is **Easy Jumps**
   (SB-allowed/IP percentile, pitcher); Metal Head = pitcher hit by KP+nut-shot ≥2 combined → protective grant;
   Mind Gamer = high walk + pitch-grinding rate (batter); Distractor = high rWAR (baserunner); Crossed Up =
   passed-ball-on-advance (catcher); Wild Thing = wild-pitch-on-advance (pitcher); Consistent/Volatile =
   mojo-change frequency vs peers; Stimulated = late-game performance vs peers + PED-personality.
9. **TS-9 — Two Way corrected** to pitcher-batting-excellence (super-rare); Dive Wizard += `beat_runner`;
   Sprinter += `beat_throw`, Slow Poke += `beat_runner`; Sprinter/Slow Poke stay event-driven (not profile).
10. **TS-10 — Big/Little Hack** = the one "not earned from a log event" trait: profile-weighted (POW/CON ratio) +
    personality, probabilistically applied.
11. **TS-11 — Capture surface:** net-new = pitch zone, OF extra-base-credit (bWAR expected-extra-bases), injury
    accumulator (folds into fitness/dev engine); everything else reuses existing fields/events; handedness JOIN
    (`bats`/`throws`) is a low-cost win unlocking 6 split traits.
12. **TS-12 — Build the §9 engine on `traitInteractionMatrix`** (log-reconstructed context + peer-relative
    strength scorer + grant/write-back to the franchise-instance `traits` field). All thresholds/bands/weights →
    Simulation Gate (§16).

13. **TS-13 — Role-eligibility corrections + refinements (JK, same session):** **Crossed Up is PITCHER-ONLY**
    (a pitcher trait whose effect manifests as the catcher dropping the pitch — attribute the passed-ball signal
    to the PITCHER). Revised counts: **25 pitcher-only / 39 position-player-only (25 batting / 7 baserunning /
    7 fielding) / 7 universal / 1 cut.** Wild Thrower + Pinch Perfect confirmed position-player-only. **Two-Way
    grant** (evolution or generation) randomly assigns the pitcher a two-way fielding position (IF / OF / C).
    **Roster-role tilt:** bench classification raises acquisition likelihood for **Pinch Perfect** and **Utility**
    (starter lowers it) — a role input separate from personality.

**Status:** §18.2 (traits-from-reality) verification read COMPLETE. Asset gate: none yet (read + design); the
build ticket touches the SMB4-protected trait/mojo/fitness systems → SURFACES to JK per the asset rule when drafted.
Next: §18 read (3) — draft/salary/farm economics.

---

### 2026-06-16: Draft/Salary/Farm economics (§18.3) — DSF rulings (JK)

**Context**: Third §18 read (`draft-salary-farm-economics-read` workflow; full doc `DRAFT_SALARY_FARM_CERTIFICATION.md`).
Certified (salary core 3-way corroborated; the 2 dedicated salary mappers + verifiers 529'd mid-run and are
re-running to harden): 22-man salary = IV-based + tier-invariant; farm-prospect = a flat 4-row draft-round table
(CALIBRATE bridge), unchanged at call-up (F-127); rookie scale = absolute 0.50× age-replacement — so the two
scales are DISCONNECTED today. The pick-value chart is already relative-to-pool but MLB-22-only and unconsumed by
salary; the IVs it ranks are RAW (the tier-scale constants TIER_SHIFTS/FARM_NERF_SCALES exist in tierParams.ts but
are ORPHANED); pick-trade execution does NOT exist (validateTrade is advisory-only); per-draft grade distribution
has no knob (round-keyed, tier-independent). Startup drafts (LeagueBuilderSnakeDraft MLB-22 + LeagueBuilderDraft
farm-10) + scout-obscuring (R9) are LIVE; the in-season franchise draft is dry-run only.

**Decisions (JK, 2026-06-16):**
1. **DSF-1 — UNIFY on the tier-scaled pool anchor.** Connect TIER_SHIFTS[tier].scale into the pool-IV feed
   (useLeagueBuilderData.ts:414) so pickValueChart[0] becomes tier-sensitive; then peg BOTH 22-man rookie pricing
   AND farm-prospect pricing to that tier-scaled pool top, tapering down the slots — REPLACING the absolute 0.50×
   rookie factor AND the flat farm-round table. One coherent relative-to-pool, tier-sensitive scale (nerfed pool →
   lower top-slot price; "is this pick worth it?" stays live).
2. **DSF-2 — Tradeable asset = DRAFT PICKS (order positions).** Build a pick-ownership model + a pick-trade
   executor that mutates/persists pickOrder (gated behind validateTrade), and extend derivePickValueChart +
   validateTrade to the farm round. (Not roster-vacancies, not the prospects-via-player-trade.)
3. **DSF-3 — Farm grade mode = MULTIPLICATIVE SHIFT.** Add farmGradeMode (Juiced/Standard/Nerfed) that skews the
   existing round-keyed roundGradeWeights tables via FARM_NERF_SCALES, independent of the 22-man pool tier
   (enables nerfed-22-man + juiced-farm). Reuses the validated bell curve; sim-tunable.
4. **DSF-4 (Captain default, not vetoed) — in-season annual draft DEFERRED to the offseason (post-v1, per LS-1).**
   The League Builder startup draft suffices for v1; the dry-run franchiseDraftAdapter apply path is post-v1.

**Status:** §18.3 verification read COMPLETE (salary verification hardening re-running post-529). Asset gate: none
(read + design); the build ticket touches salary/tier economics (not an SMB4-protected engine) but is
persistence/economics → SURFACES to JK per the risk rule when drafted. Next: §18 read (4) — Manager WPA
reconciliation for MOY (the last §18 read).

---

### 2026-06-16: Manager-WPA / Manager-of-the-Year (§18(4) + AWARD-7) — MOY rulings (JK + Captain)

**Context**: Fourth and LAST §18 read (`moy-reconciliation-read` workflow — 5 mappers + 3 adversarial verifiers + a
completeness critic; full doc `MANAGER_WPA_MOY_CERTIFICATION.md`). Certified: the v2 Manager-WPA truth-layer is real,
live-wired, and persisted — decision-WPA = a true team win-probability delta × per-type manager share
(`managerWpaDerivation.ts:1734-1747`). The three §23.7 reconciliations are all real and all UNIMPLEMENTED. The read
forced three corrections to AWARD-7's framing: (i) the live composite is FOUR quantities (tactical decision-WPA +
**deployment-WPA** + lineup-delta), not three, and **team record is not in the live sum at all**; (ii) MOY is NOT
greenfield — `pogAwards.ts:589-590` ships a live, persisted, displayed per-game `best_manager` award on the exact
composite (gated `MIN_POSITIVE_WPA = 0.005`), so season MOY is a season-grain aggregation of it; (iii) a name/scale
trap — the live composite sums the CAPPED REALIZED record `delta.managerWpa`, while §23.7 literally names the T10
`ManagerLineupDeltaSummary.lineupDeltaWpaStandard` (built + persisted but **orphaned**, read nowhere). The deprecated
salary MOY (`calculateMOYVotes`, `getExpectedWinPct = 0.35 + salaryScore×0.30`) is dead-gated behind
`FRANCHISE_V1_OFFSEASON_EXECUTION_ENABLED = false` → retiring it re-points, never breaks.

**Decisions — JK (the design/scope forks):**
1. **MOY-1 — Input set = FOUR.** Season MOY = decision-WPA + deployment-WPA + lineup-delta + team record. Deployment
   kept as a distinct scored term (already built/capped/shown); team record ADDED as the new fourth input. (Closes
   AWARD-7's undercount.)
2. **MOY-2 — Lineup quantity DEFERRED to build time.** Capped realized record (`delta.managerWpa`, the live composite
   input) vs T10's pure projected `lineupDeltaWpaStandard` (the §23.7-named, currently-orphaned Summary field) is
   resolved when the MOY engine is drafted, both on the table; structure locked around the open slot. (Realized record
   is already aggregated + commensurate; the T10 standard needs a new aggregator + denomination fix.)
3. **MOY-3 — Record term = EXPECTATION-RELATIVE on the D6 trusted-value artifact.** Wins-above-roster-strength-
   expectation, expectation = the D6/D8 trusted True-Value projection (NOT raw W-L, NOT the untrusted
   `franchiseExpectedWinsPreview`). Drops the salary-based expectation per (c). **HARD-couples the MOY build to D6** —
   consistent with the D-stack order (D9 → D8 → D6); MOY cannot be built before the value-trust gate.
4. **MOY-4 — No fame tilt for v1.** MOY is a PURE truth-layer computation; managers sit outside the player fame
   economy; legacy = the Almanac record. (Diverges deliberately from §21/RACE-4's player merit-award fame tilt.)
   Manager-fame is a post-v1 revisit.

**Decisions — Captain (engineering / architecture / sim-deferred; JK-overridable):**
5. **MOY-5 (architecture) — Build as a season aggregation of the existing `pogAwards` per-game composite.** Reuse
   `PogManagerValueTotal` → extend to season grain; wrap in the absent `franchiseAwardsEngine`/`franchiseAwardsStorage`;
   NOT a parallel engine. Retire `calculateMOYVotes` + the deprecated `mwarCalculator` salary path + the orphaned
   `useMWARCalculations` hooks. Re-point `AwardsCeremonyFlow`/`RatingsAdjustmentFlow` off `calculateMOYVotes` BEFORE any
   offseason flag flip.
6. **MOY-6 (common-scale, reconciliation a) — Pool-relative normalization for the SEASON award.** Normalize each of the
   4 inputs across the manager pool (rank/z-score) BEFORE weighting — dissolves the denomination mismatch without
   inventing an IV→WP constant or touching the frozen value layer. The per-game `pogAwards` raw-sum + caps stay unchanged.
7. **MOY-7 (weighting, reconciliation b — sim-deferred) — Composite weights → Simulation Gate (§16).** Lock structure
   now (4 pool-normalized inputs, record expectation-relative on D6); the weight split (the 60/40's 4-way successor) is
   a sim-tuned starting guess.

**Status:** §18(4) verification read COMPLETE → **all four §18 reads DONE.** Asset gate: none (read + design); the MOY
build ticket is greenfield awards + persistence + a D6 dependency → SURFACES to JK per the risk rule when drafted, and
sequences POST-D6/D8 inside D9. Next: Captain drafts the Phase-2 "living-season D-stack" sequencing (fold in the §18-
unblocked tickets; reconcile the D9/D7 couplings) for JK ratification.

---

### 2026-06-16: Phase-2 "Living-Season D-stack" (the L-stack) — sequencing draft + five fork rulings (JK)

**Context**: Captain drafted the dependency-ordered Phase-2 build sequence (`FRANCHISE_V1_LIVING_SEASON_DSTACK.md`,
tickets L1–L14 + L-SIM + an economy track) from `FRANCHISE_V1_LIVING_SEASON_SPEC.md` §5–§24 + the four §18 certs,
then hardened it with a 12-agent decorrelated verification workflow (`wf_b5734e06-e2c`: 7 grounding code-readers +
5 adversarial ordering critics, ~1.26M tokens). The audit forced structural corrections folded into the doc:
**(i)** MOY is a Phase-1 **D9** sub-ticket (the §18(4) read specifies the D9 manager-award contract — MOY-1..7), NOT
a Phase-2 ticket (MOY-4 bars manager fame → no Phase-2 layer); removed from L12c. **(ii)** New ticket **L1.5** (Team
Captain initial assignment at Mode-1 league finalization) closes a BLOCKER gap — the handoff is unbuilt in both
stacks (`franchiseInitializer.ts:335-433` has zero Captain assignment; CAPTAIN hard-blocked at
`franchiseDesignationEligibility.ts:151-157`). **(iii)** L1's hidden modifiers are generated mis-named + un-persisted
(`prospectScoutingDraftEngine.ts:542-547` emits leadership/volatility/adaptability/pressure, not loyalty/ambition/
resilience/charisma) → L1 is a real build. **(iv)** Reporter base split out (L4a, no morale-matrix dep) + hoisted to
Tier 0 per SEA-1; trait-capture (L9a) hoisted to Tier 0 (longest data lead). **(v)** DSF-1 is COUPLED to the value/IV
spine (re-prices the frozen draft-IV anchor) → sequence before the v1 franchise's draft/salary freeze. **(vi)** Backup
parity escalated — the D2 guard covers only `kbl-tracker`; Phase-2 stores land in separate DBs; export/restore is
orphaned + a stale-pin restore destroys newer stores → re-scope the guard to all DBs + a prerequisite hardening ticket
+ a per-ticket backup DoD. **(vii)** Floating TV is built but overwrites one cumulative row → KK/Comeback need a NEW
`franchiseTrueValueSnapshots` store captured from game 1. **Parallelism rule:** BUILD Phase-2 foundations dark in
parallel with the late D-stack, ACTIVATE strictly after D13 (the §5 "no phantom morale" + D12 smoke gate).

**Five fork rulings (JK, 2026-06-16):**

1. **LSD-1 (F1) — D9 fame-ready seam checklist RATIFIED; build the award engine ONCE.** Fame IS in full v1 (Phase-2
   L6), but the award *engine* is built at the Phase-1 checkpoint before fame exists, so build it once with the fame
   hooks left empty and let L12 fill them — no rebuild. The four seams baked into the D9 contract NOW: (1) store
   per-award **candidate margins** (not winner-only) for the close-race fame tilt; (2) store the **fWAR vs total-WAR
   split** on Gold Glove for the later defensive-fame blend (~15–25%); (3) make the ceremony **vote-weight field
   pluggable/nullable** (salary→fame swap without migration); (4) reserve the **KK/Bust/Comeback award-type slots +
   the `franchiseTrueValueSnapshots` store**, capturing TV from game 1 (or season-1 Comeback data is lost). Fame's
   award role is a **merit-led TILT** (§21.4 — flips only a genuinely-close race), **defensive-fame** on Gold Glove,
   **fame-weighted** ceremony votes (replacing salary), **fame-led** All-Star *starters* (the one exception); the
   TV-family runs on True Value, not fame; awards pay fame+morale+badge only (no rating rewards). *(Captain rec'd (a);
   (b) build-then-rework = two builds, (c) hold-D9-for-fame reopens the D0 "real awards in Phase-1" ruling — both declined.)*
2. **LSD-2 (F2) — FA-attraction DEFERRED to v1.1; FA-gravity struck from §13 "live teeth."** Keep only the in-season
   **trade-request generation** (loyalty/morale-scaled roster destabilization) in L5 (+ an L10 event tap + an L13
   trade-demander flashpoint). Free-agent attraction/destination weighting is an offseason concept incompatible with
   the one-season v1 (LS-1) → v1.1.
3. **LSD-3 (F3) — Cornerstone CUT from v1.** Matches the D0 deferral; L7 drops it. ("Last season's MVP; accumulates"
   is structurally impossible in a single-season v1.) Revisit at the offseason/multi-season bridge.
4. **LSD-4 (F4) — Budget pressure CUT from v1.** The §13 "optional/capped" tooth is next-season spending room =
   offseason = post-v1. Revisit v1.1.
5. **LSD-5 (F5) — Stadium change = pick from the EXISTING Super Mega stadium pool in League Builder; NO custom
   stadiums.** On relocation (L14) the user chooses from the built-in stadium list; the build must **pull the full
   stadium record (dimensions, name, park factors) into the franchise** so stadium analytics recompute correctly
   after the move. The L10 independent random-event stadium-change leg (fan-morale-suppressed rate) uses the same
   pool-pick mechanism. (No custom-stadium entry — consistent with the standing hard exclusion.)

**Status:** Phase-2 sequencing DRAFTED + all 5 forks RULED + folded into `FRANCHISE_V1_LIVING_SEASON_DSTACK.md`
(Status: PROPOSED). No product code, nothing committed (JK commits). Asset gate: none (design/docs only) — each L-ticket
re-gates when contracted (Codex builds → Opus audits → JK browser sign-off). Remaining ratification gates before any
build contract: (a) JK explicit sign-off on the L-stack structure; (b) D0 ratification (still PROPOSED). First Tier-0
critical-path opener to contract = **L1** (personality/modifier substrate). Living-season spec §4/§13/§14 carry
amendment notes for the cuts (Cornerstone, FA-attraction, budget pressure, stadium pool-pick).

---

### 2026-06-16 (follow-up): Release-boundary ruling — the living season IS part of v1 (LSD-6)

**Context**: With the L-stack sequenced + LSD-1..5 ruled, JK was asked whether (a) Phase-1 "Playable-V1" (the
D-stack, soul-layer-excluded) ships as a standalone milestone with the living season as a true follow-on, or (b)
the living season is part of "v1" proper — v1 isn't done until both stacks + the sim gate complete. This reconciles
the D0 doc's older "Phase-2 automation → v1.1" deferral language with the week's living-season design.

**Ruling — JK (2026-06-16): (B).** The living season (Phase-2 L-stack) is **PART OF v1**, not v1.1.
- **v1 = Phase-1 (D-stack D1–D13) + Phase-2 (L-stack L1–L14 + economy track) + the L-SIM gate.** One release — the
  full living, playable season (draft → champion *with* the soul layer).
- **"Playable-V1" (D0's D13) is reframed as an INTERNAL Phase-1 checkpoint**, NOT the v1 release. D13 approves the
  value-spine-live milestone; the v1 release sign-off comes after the L-stack + the L-SIM gate.
- **Sequencing UNCHANGED:** the D-stack still builds first; Phase-2 foundations build dark in parallel; the soul
  layer activates after D13; every magnitude is sim-gated.
- **D0's "Phase-2 automation → v1.1" deferral is SUPERSEDED for the soul layer** — morale / fame / development /
  traits / relationships / managers / rebrand / the morale-gated designations are **v1** (Phase-2), not v1.1.
- **Genuinely post-v1 / v1.1 (unchanged):** the offseason / Season-2 bridge (LS-1); the three LSD cuts (Cornerstone
  LSD-3, FA-attraction LSD-2, budget pressure LSD-4); the tracked JK-gated fast-follows (R9, R12, FINDING-148).
- **The v1 exit gate (iPad playtest) is of the FULL living season** (after L-stack + L-SIM), not the stats-only D13
  checkpoint; the offseason flag stays FALSE throughout v1 (offseason remains post-v1).

**Status:** Release boundary RULED. Reconciliation notes added to `FRANCHISE_PLAYABLE_V1_DEFINITION.md` (D0),
`FRANCHISE_V1_LIVING_SEASON_DSTACK.md`, and `CURRENT_STATE.md`. No code impact (labeling/scope-boundary only).

---

### 2026-06-17: Skipped-step forks cleared — OD-2..5 + D4 RULED (attended session, JK present)

**Context**: A fresh attended session resumed at D10 after the overnight AUTH-4 run closed D9. The five open design
forks the Captain had left at documented conservative defaults during the unattended run (OD-2..5 + the D4 scope
snag) were walked one-by-one and ruled by JK. (OD-1 was already resolved 2026-06-16.) These settle the L-stack
design + D4 scoping ahead of need; none blocked D10.

**OD-2 — economy scale (L-ECON1 / DSF-1), the rookie/farm/draft IV pricing — NOT True Value.** First clarified a
Captain conflation: there are THREE separate systems — **IV** (ratings-based intrinsic $, `ivEngine.computeIV().kblIV`
→ drives salary + the pick-value chart), **TV** (performance-based, persisted WAR peer-compared at the actually-played
position, `franchiseValueInputs.ts` → the D6 frozen artifact) and the **pick-value chart** (pool IVs sorted→slots).
Verified in code: `franchiseValueInputs.ts` consumes `totalWar` stat rows and does **not** import `computeIV` — TV is
100% performance-based and OD-2 does not touch it. OD-2 is ONLY the pricing of players with no game performance yet
(22-man pool at construction, rookies, draft picks, farm prospects).
- **A — scope: NEW-LEAGUE-CONSTRUCTION-ONLY, no retroactive.** JK: none of the currently-loaded leagues are
  in-progress (they're templates to pull from); franchises will be deleted/recreated to browser-test the new features.
  So nothing is re-priced retroactively; the new scale applies at construction for franchises built after it lands.
- **B — ruler: reuse the existing pick-value chart, same machinery / different anchor.** 22-man-rookie/draft anchor =
  `pickValueChart[0]` scaled by the league **tier** (`TIER_SHIFTS[tier].scale`); **farm anchor = that ×
  `FARM_NERF_SCALES[tier]`** (§7.4 "one grade step left of the league tier") then tapered by slot/grade. This RESOLVES
  JK's "will farm price like the 22-man?" concern: a juiced league's farm pool prices at 0.8827 = exactly the standard
  tier — farm sits ~one grade-tier below its MLB pool, systematically. Only boundary overlap (elite A-prospect ≈
  low-end MLB roster player) remains, which is realistic. `farmGradeMode` (DSF-3) skews farm grades further,
  independent of the MLB tier. `FARM_NERF_SCALES`/`TIER_SHIFTS`/`TIER_RATING_SCALES` already exist in `tierParams.ts`
  but are orphaned — the build wires them in. Replaces the absolute 0.50× rookie factor AND the flat 4-row farm table.
- **C — tier sensitivity applied by scaling raw IVs BEFORE the chart (not a `computeIV` input)** so the frozen IV
  oracle (`iv_oracle.json`) stays byte-untouched. Approach confirmed. The *build* therefore remains a watched /
  safety-walled ticket (adjacent to the frozen anchor); this ruling settles only the design.
- All magnitudes (nerf depth, taper steepness, grade skew) → Simulation Gate (§16).

**OD-3 — L2 mutable ratings layer, confirmation UX.** (A) pending ratings/trait changes **queue quietly + clearly,
async/non-blocking** — never gate the next game; users learn to check the queue before each game and confirm once
they've applied the change in the SMB4 console so engine and console match. (B) edit instructions in **plain text**
("Raise Joe's Power 65→70"). (C) temporary-overlay expiry = **game-count** (re-evaluated on load), not wall-time.
(D) overlays **season-scoped** (reset each season, no carry-forward).

**OD-4 — team-tied NPC assignment.** (A) league-vs-franchise reporter scope = **franchiseId-precedence cascade**
(franchise reporter wins for franchise games; already shipped in L4a-connect). (B) **manager + reporter are assigned
on the team-edit page in League Builder. SCOUTS are NOT** — scouts are **drafted during the league draft process**
(they're unique to the *farm* draft; they add nothing functional to the 22-man), then **reflected/displayed on the
team page** once drafted. **Scout drafting is FRONT-LOADED to before the 22-man draft** (better UX than mid-process:
one front-office staffing step, then uninterrupted 22-man→farm drafting). This unlocks a **cosmetic** win: the scout's
name rides each team's 22-man **draft-guide insider info** ("intel from your scout") — flavor only; scout
abilities/specialties still apply only to the farm draft. NOTE: today scouts are hired *inside* the farm-draft flow
(`LeagueBuilderDraft.tsx`), so this is a **re-sequence** of the League-Builder flow and shifts the 22+10+2-scout
handoff-gate ordering → capture in the League-Builder draft-flow spec. (C) `SeasonNewsItem.facts` schema defined at
first event-tap build.

**OD-5 — L9a trait enrichment capture (live game path).** (A) **manual/opt-in capture, never forced** — but where
the data IS present, it absolutely determines whether performance-warranted traits are granted; traits whose data is
absent simply aren't awarded. **All performance-related (vs personality-weighted) trait determination needs
GameTracker data → this requires OPTIONAL ZONE INPUTS for pitching/hitting in the GameTracker** (the net-new capture).
(B) injury accumulator = **cumulative season running tally** (injuries are already tracked in the GameTracker, so the
tally rides on top) → feeds Durable / Injury-Prone.

**D4 — salary-live UI de-gate: RE-SCOPED, fold into D11.** The original snag (salary live but the True Value/Expected
Wins preview still D6-gated on the combined `TeamHubContent.tsx:4623-4648` panel) is **MOOT** now that D6–D9 landed —
the value preview is trusted/frozen, nothing left to gate. **Ruling: the whole combined panel goes live; fold the
salary de-gate into D11** (the UI live-label sweep already covers salary / True Value / designations / awards on
exactly this surface). D4 is no longer a standalone ticket.

**Status:** OD-2..5 + D4 RULED. No product code this turn (decisions/docs only). OD-2 + OD-5 builds remain
watched/safety-walled per their notes; the rest fold into their L-stack tickets. CURRENT_STATE "OPEN PENDING-JK" and
AUTONOMOUS_RUN_LOG "OPEN DECISIONS" updated to reflect closure. Next action: **D10**.

---

### 2026-06-17: DESIG-RECON — team-designation model reconciled + ruled (attended session, JK present)

**Context**: While scoping D10's awards/designation display, JK flagged possible drift in the committed D6/D7
designation work. A 3-reader reconciliation workflow (`wf_a7edf687-814`: as-built code / spec / coverage) mapped the
team-designation system against the spec (MODE_2_V1_FINAL §17 = canonical; DYNAMIC_DESIGNATIONS_SPEC /
FAN_FAVORITE_SYSTEM_SPEC / PERSONALITY_SYSTEM_SPEC = gospel) and JK's intra-team six-per-team model.

**Reconciliation finding (no bug on the axis JK worried about):** ALBATROSS is built INTRA-TEAM in both selection
paths (`franchiseDesignations.ts:426` `selectLowest` inside the `byTeam` loop; eligibility candidateKey
`teamId:type`) — it is the worst net Value-Delta player on the player's OWN team, NEVER a cross-team comparison. The
"≥2 MLB peers" rule (`FRANCHISE_TRUSTED_VALUE_PEER_POOL_MIN_THRESHOLD=2`) is a True-Value RELIABILITY/trust gate
(is this player's TV number even computable from enough peers), used only as a candidacy FILTER — it is NOT a
selection rule and NOT a league ranking. Code does not conflate the two. v1 reality before this ruling: only 3 of 6
were live (MVP/Ace/Albatross); FF projected-only, Captain assigned-but-no-badge, Fan Hopeful unbuilt, Cornerstone
cut-but-lingering.

**JK RULINGS (2026-06-17) — the full v1 team-designation set is SIX per team, ALL in v1 (LSD-6: the living season
is v1, so "lights up with the Phase-2 morale layer" = later in v1, not deferred out of v1). Selection is always
INTRA-TEAM. Designation EFFECTS (fame/morale/fan-happiness) stay DORMANT until the Phase-2 morale/fame layer.**

1. **Team MVP** — LIVE (unchanged). Highest total WAR on team; games floor max(5, 20%). Intra-team.
2. **Ace** — LIVE (unchanged). Highest pWAR among team pitchers; appearances floor max(4, 20%); pWAR ≥ 0.5.
3. **Albatross** — LIVE, **spec guards RESTORED into the live path**: most-negative Value-Delta on team **AND**
   salary ≥ 2× league minimum ("can't blame the cheap guy") **AND** materially overpaid (~≥25%) **AND** value-trusted
   (≥2-peer); games floor 10%. **Can be null.** The 2×-salary + materiality gates currently exist only in the ORPHAN
   `fanFavoriteEngine.ts` and must be ported into the live `franchiseDesignations.ts` path. −1 fame DORMANT.
4. **Fan Favorite** — **PROMOTED to LIVE**: highest POSITIVE Value-Delta on team, **NO salary floor** (deliberate
   asymmetry vs Albatross — JK ruling: the underpaid overperformer, e.g. Brock Purdy, is the *best* fan-favorite
   story, so a floor would exclude exactly the players fans love); value-trusted (≥2-peer); games floor 10%. Add to
   `ACTIVE_PROMOTION_TYPES` + `LIVE_DESIGNATION_BADGES` + de-gate eligibility for SELECTION/BADGE (drop the
   morale-block on the badge; +2 fame/morale effect stays DORMANT until Phase-2).
5. **Captain** — **LIVE BADGE**: highest combined (Loyalty + Charisma), **NO minimum** (every team gets one) —
   remove L1.5's `charisma ≥ 70` gate (a stale-spec import; canonical §17.6 says no minimum); tiebreak more seasons
   on team, then current-season WAR. **Clear the reveal-safety block** (the badge shows the ROLE, not the numeric
   hidden modifier). Reconcile the split brain: Captain currently lives only as `team.captainPlayerId`
   (`franchiseInitializer.ts`) and is NOT in the designation engine union → the build must surface it as a badge
   (either fold CAPTAIN into the designation surface, or render directly from `team.captainPlayerId` on the team hub).
   Charisma-double-morale effect DORMANT until Phase-2.
6. **Fan Hopeful** — **BUILD it (visible-safe)**: each team's Fan Hopeful = a RANDOM pick from its top-3 farm
   prospects ranked by **SCOUTED grade** (never hidden true ratings — clears the old hidden-farm-truth block);
   assigned at season start, one per team, badge live; +5 morale boost DORMANT until Phase-2.

**Cornerstone** — **fully CUT** (LSD-3): remove the blocked policy-matrix entry + the blocked-truth UI row + stale
stubs (do not leave dead entries).

**Cross-cutting rulings:**
- **≥2-peer trust filter KEPT** on the value-delta designations (Albatross + Fan Favorite) as a candidacy filter —
  don't brand a player on an unreliable TV number; accept the rare null (≥2 peers is near-always satisfied in a full
  stock-MLB league). It is a reliability gate, NOT a league ranking.
- **Albatross 15% trade discount → DORMANT/DEFERRED** (NOT "fixed to 15%"). JK: with all trades MANUAL and no AI
  trade valuation in v1, the discount modifier has no live consumer; revisit if/when a trade-valuation surface
  exists. (The 30% in `FAN_FAVORITE_SYSTEM_SPEC` is superseded regardless; the canonical value is 15% when it
  reactivates.)
- **Spec hygiene:** reconcile DYNAMIC_DESIGNATIONS_SPEC / PERSONALITY_SYSTEM_SPEC / FAN_FAVORITE_SYSTEM_SPEC to the
  canonical MODE_2_V1_FINAL §17 (Captain = Loyalty+Charisma, no minimum; Team MVP is INTRA-TEAM not "league-wide" —
  the league-wide WAR-MVP is the separate D9 AWARDS system; Albatross discount deferred; Cornerstone removed). After
  porting Albatross's salary/materiality gates into the live path, the orphan `fanFavoriteEngine.ts` should be
  deleted (single source of truth) unless a reason to keep surfaces at build time.

**Sequencing (JK ruling D):** **D10 (league-awards season summary) ships FIRST** — unblocked, self-contained, and
the league awards (MVP/Cy Young/etc. via `franchiseAwardsEngine`) are a SEPARATE system from team designations.
Then a dedicated **team-designations build ticket ("DESIG-RECON build")** does items 3–6 + Cornerstone removal +
spec reconciliation + the **year-end team-designation DISPLAY on the TEAM HUB** (placement ruling D: team hub, a
compact per-team designation strip — NOT inline with league awards, NOT a separate team-by-team season-summary page).
D10 still includes the manifest **active-designations canonical-source fix** (read `franchiseDesignationRows`, not the
stale embedded `player.franchiseDesignations`) so the handoff-manifest COUNT is accurate; the user-facing designation
DISPLAY is the team-hub ticket.

**Status:** DESIG-RECON RULED. No product code this turn. Affected spec docs to be reconciled to canonical §17 as part
of the DESIG-RECON build ticket (DECISIONS_LOG is the authority until then). Next action: **draft + dispatch the D10
build** (league awards inline via AwardsWatchlist + manifest canonical-source fix + page copy + pass5 test update),
then the DESIG-RECON build ticket.

---

### 2026-06-17: DESIG-RECON build split + fork rulings (attended; build map `wf_9ea0e360-d00`)

D10 shipped (`51e487a`); the DESIG-RECON build was mapped (4 readers) and split into **4 tickets**:
- **DR-1** (engine logic, no forks) — Albatross spec-guards ported INLINE (2× salary floor via injected
  `salaryCalculator.MIN_SALARY`; 25% materiality `valueDelta/contractValue ≤ -0.25`) into BOTH selection +
  eligibility; Fan Favorite promoted to live (ACTIVE_PROMOTION_TYPES + LIVE_DESIGNATION_BADGES + eligibility de-gate,
  NO salary floor, +≥2-peer trust); Cornerstone fully removed (+4 stale stubs, NOT the FAME `FRANCHISE_CORNERSTONE`
  in teamMVP/legacyDynastyTracker); delete the orphan `fanFavoriteEngine.ts`. Effects stay dormant (firewall flags
  false). DISPATCHED to Codex.
- **DR-2** (assignment logic) — remove Captain's `charisma ≥ 70` gate (`franchiseInitializer`, canonical §17.6 =
  no minimum); build Fan Hopeful season-start assignment (random top-3 by SCOUTED grade, visible-safe).
- **DR-3** (display) — the compact six-designation strip on the team hub. Depends on DR-1/DR-2.
- **DR-4** (docs) — reconcile DYNAMIC_DESIGNATIONS_SPEC / PERSONALITY_SYSTEM_SPEC / FAN_FAVORITE_SYSTEM_SPEC to
  MODE_2_V1_FINAL §17.

**Fork rulings (JK, attended 2026-06-17):**
- **Team-hub strip placement = under the 'team' tab**, below the "Currently viewing: <team>" card (the at-a-glance
  team-identity row; leaves the analytic 'roster' panels untouched).
- **Fan Hopeful persistence = a `team.fanHopefulPlayerId` field** on the Team record (mirrors `captainPlayerId`;
  simplest, naturally one-per-team; single-season v1, overwritten each season like Captain) — NOT a new store.
- **Captain wiring = render directly from `team.captainPlayerId`** with a UI-only badge (option a) — Captain is
  personality-based/assigned-at-init, so it does NOT fold into the WAR-ranked designation engine (1 file vs ~6).
- **Year-end semantics = always-visible strip** with a "projected mid-season / final" caption — true season-end
  locking is an unbuilt later slice; gating on it now would render an empty/cosmetic "final."

---

### 2026-06-17: SOUL-LAYER "BUILD TO SPEC" GREENLIGHT (JK, attended) — the L-stack opens

**Context**: D11 closed the autonomously-buildable D-stack (D1–D11 done; D12 manual smoke + D13 checkpoint are JK
gates). JK was asked the next arc and **greenlit the soul layer (the Phase-2 L-stack)**.

**Ruling — JK (2026-06-17):** GREENLIT. Build the Phase-2 soul-layer engines (L3 morale matrix → L5/L6 fan-teeth/fame
→ L7 designation effects → L8/L9b development → L10–L14) **to the ratified living-season spec** (`FRANCHISE_V1_
LIVING_SEASON_SPEC.md` §5–§24 + the L-stack sequence in `FRANCHISE_V1_LIVING_SEASON_DSTACK.md`), with **sim-tunable
placeholder magnitudes** and **documented conservative defaults where the spec is silent**. This satisfies the
standing "SOUL-LAYER BUILD TO SPEC GREENLIGHT" pending-JK item.

**Constraints (unchanged, from the L-stack rules):**
- **Build DARK, activate strictly after D13** (§E parallelism rule): Phase-2 foundations build behind a Phase-2 flag;
  NO live morale/relationship consumer rides alongside D7 (the §5 "no phantom morale" invariant + the D12 smoke gate).
- Per-ticket: Codex builds → Opus audits (auditor ≠ builder) → JK browser sign-off batched. Every store-creating
  ticket carries the C-4 backup DoD (register byte-mirrored + version pin + KBL_BACKUP_VERSION bump + all-DB
  parity-guard + syncConfig + round-trip test).
- The LSD-1..5 forks stay ruled; LSD-6 (the living season IS v1) governs; safety walls hold (L-ECON1 stays
  watched/oracle-adjacent per OD-2; L9a is live-game-path).

**Starting point:** the critical path is `{L1✓, L1.5✓, L4a✓, L2, L9a, L-ECON1} → L3 → {L5,L6} → …`. **L3 (Master
Morale Matrix)** is the spine, depends only on L1 (done), and is the first soul-layer build. Mapping L3 now; structural
decisions (matrix representation, ledger store shape, the event taxonomy/default-neutral taps) surface to JK before the
build contract.

**L3 STRUCTURAL RULINGS (JK, attended 2026-06-17; map `wf_04a84b30-ef5`, 4 readers):**
- **Matrix engine = a FRESH clean engine that IS the one table** (`NEW src/engines/masterMoraleMatrix.ts`): an
  event-keyed base table + a pure composer function (personality×4-modifier multipliers → player+fan morale deltas +
  cross-effects). It subsumes the fan event taxonomy but leaves the reporter's word-generation OUT (firewall: math
  only) — NOT a literal widen of the 1,366-line narrative-laden `fanMoraleEngine`. Magnitudes = a single SIM-TUNED
  `MORALE_TUNING` config (Sim Gate owns the numbers). §8 dampener is L5's, not L3's.
- **Morale store = REUSE the existing `franchiseMoraleState` (`kbl-franchise-morale`)** — it already models player +
  fan + per-change history. Add a new non-confirmation `sourceKind` ('matrix-auto') + an automatic+logged apply path
  (the LS-9 reversal), idempotent dedupe kept. NOT a second store (avoids the two-sources-of-truth hazard §5 warns of).
  Verified the store is ALREADY in `backupRestore.ts:637` + `syncConfig.ts:108` (backed up + synced); the only gap is
  the parity-GUARD test covers only `kbl-tracker` — **L3 extends the parity guard to cover `kbl-franchise-morale`**
  (closes the C-4 deficit for this DB). Likely no DB version bump (new sourceKind is a value, not a schema change).
- **Defaults (consensus, conservative): one ledger discriminated by player/fan (reuse the existing model); a typed
  default-neutral tap interface** (fame/designation/race/relationship return neutral until their owners land);
  **subscribe to the D7 `DesignationEvent` stream** at the current void-ignore site (`processCompletedGame.ts:303`);
  **build DARK behind a Phase-2 flag** (compute + dark-ledger only; NO live morale mutation/consumer until after D13 —
  the §5 no-phantom-morale invariant); **firewall** (engine imports no reporter/LLM); reconcile the non-canonical
  personality names (playerMorale.ts GRUMPY/FIERY/SPIRITED → the canonical 7).
- **UI cleanup (JK ask, tracked): remove the endless confirmation gates from the Team Hub roster tab** and replace
  with the morale log/history view. This is the USER-VISIBLE half of LS-9; it **pairs with L3 ACTIVATION (post-D13)**
  because auto+logged delivery replaces the gates (removing them before the replacement is live would strand the
  current morale path). A standalone earlier UX ticket is possible if JK wants gate relief sooner.
- **L3 SPLIT: L3a** = the pure matrix engine (math; testable; no store/wiring/narrative) → **L3b** = reuse+un-gate the
  store + D7 subscription (dark) + build-dark flag + parity-guard extension.

**L3 COMPLETE** (L3a `5b1431d` + L3b `d46a071`, 2026-06-17). **L3 ACTIVATION FOLLOW-UP (tracked):** the roster-tab
confirmation-gate UI removal + the morale fame/race/relationship tap fills pair with post-D13 activation.

---

### 2026-06-17: L6 (Fame) plan + defaults (attended; map `wf_d44466a5-632`, greenlight covers it — no new fork)

Next soul-layer ticket after L3 (JK "keep rolling"). §20 is LOCKED design; the L6 map (3 readers) found STRONG
consensus and NO genuine design fork (every choice resolves to §20 + the established build-dark/pure-then-wire
patterns), so proceeding under the soul-layer greenlight with documented conservative defaults:
- **Split L6a (pure engine) / L6b (store + dark wiring)** — mirrors L3a/L3b + ivEngine (pure→audited→wired).
- **L6a (pure, no IO):** the canonical §20.7 **nine-tier ladder** (ONE type + threshold table — Immortal Legend >
  Global Superstar > National Icon > Regional Star > Local Hero · Unknown · Polarizing > Notorious > Despised —
  collapsing the 3 debt ladders) + the pure **Heat** (recency exponential decay) / **Reach** (integer floor that
  ratchets up, never erodes in-season; trade resets it + pulls Heat toward Unknown) / **tier = Heat floored at Reach**
  + the **WAR-legitimacy-floor gravity** (pulls Heat toward a WAR-justified level; not a direct contributor) + the
  **fame-vs-merit** (snub/bust/darling) classifier + the **fame-by-attribution-channel breakdown** (defensive-fame
  sub-aggregate for Gold Glove §23.2 + role-player fame for the bench award — an explicit L6 deliverable per the
  DSTACK). All magnitudes (decay rate, WAR-floor gravity, tier thresholds, channel weights) in a SIM-TUNED
  `FAME_TUNING` config (§20.9 owns the numbers).
- **RETAIN (reuse, not extend, §20.8):** `FAME_VALUES` iconic-event catalog + `calculateFame`/`getLIMultiplier`/
  `getPlayoffMultiplier` (the √LI bump scoring) + `kblWpaAttribution` (the layer-1 WPA spine) + POG. **DEBT (collapse,
  don't extend):** `getFameTier` (cumulative 9-tier), `FameLevel` (6-tier), reporter `FameTier` (5-tier),
  `eliminationRunFameStorage`, `applyChampionshipFame` flat +1.
- **L6b:** a NEW parity-guarded `franchiseFameRecords` store in **trackerDb v18→v19** (keyPath
  [franchiseId,seasonId,statsScopeId,playerId] + by_scope; the C-4 backup DoD + PIN-TRAP update + KBL_BACKUP_VERSION
  bump) — storing one decayed running Heat float + the integer Reach floor + wasNegative (+ the channel sub-aggregates);
  decay-on-write per game; the dark per-game compute wired into the post-game spine behind a Phase-2 fame flag (reuse
  the `franchisePhase2Flags` pattern). **Parallel-run:** the LIVE cumulative fame (`aggregateFameEvents`,
  `salaryCalculator` `player.fame` read, the GameTracker/`useFameTracking` display) is NOT disturbed — reconcile/retire
  post-D13. **The L3 `fame` morale tap stays DARK** (the §20.5/§20.6 fame→morale plug is a deferred post-D13
  integration; note the seam, don't fill).

---

### 2026-06-18: R1-b Base Rounder measurement rulings (attended; L9b trait-reality rebuild)

Building R1-b (the 6 ruled-gap traits per `TRAIT_MEASUREMENT_SPEC.md §0.9`), the Captain surfaced the two measurement
details §0.9's Base Rounder line left open (the soul-layer discipline: surface gaps, never infer). JK ruled:
- **Denominator — count thrown-out tries.** Every recorded advancement (safe OR out) is a "chance"; safely taking the
  extra base is the success. Most literal to §0.9 ("over the runner's advancement opportunities, from `runnerOutcomes`").
  A runner gunned down trying for extra counts as a non-success opportunity (lightly drags the rate); a held runner
  (`toBase:'end'`) is not a chance.
- **Scope — include batter stretches.** Base Rounder also credits the batter-runner for taking extra bases on their own
  batted ball (single→double, etc.), not only true baserunners already on base. The batter's forced minimum = the base
  the result entitles them to (1B→1st, 2B/GRD→2nd, 3B→3rd, HR/ITPHR→home, BB/IBB/HBP/E/FC/D3K/WP_K/PB_K→1st).
Folded into §0.9 verbatim. (The forced-minimum baseball model itself is mechanical — port `isRunnerForced`/
`getMinimumAdvancement` from `atBatLogic.ts` into the engine, not a JK fork.) Distractor + Big/Little Hack (Option B
percentile-merge) were already fully pinned by §0.9 — no rulings needed.

---

### 2026-06-18: R1-b2 scope + Bunter measurement rulings (attended; L9b trait-reality rebuild)

Grounding R1-b2 (Two Way / Utility / Crossed Up / Bunter), the Captain surfaced two genuine forks. JK ruled:
- **Two Way → its own ticket (NOT R1-b2).** §0.9 pins the SIGNAL (a pitcher's elite hitting = wOBA percentile vs the
  pitcher pool) cleanly, but Two Way also needs the "random C/IF/OF fielding position assigned AT GRANT" mechanic, which
  is NEW logic in the already-built L9b-3c grant/confirm writer — beyond the pure signal-builder. So Two Way spans
  builder + grant-path and is split out (R1-b3 / pairs with R3's grant/ratings work). **R1-b2 = Utility + Crossed Up +
  Bunter** (3 clean pure-builder traits).
- **Bunter = volume/frequency, not a success rate.** signalValue = successful sacrifice bunts (`result==='SAC'`) per PA
  (position batters), percentiled vs the position pool; failures don't drag it (numerator = SAC only). Side effect: this
  reads the standard `SAC` result, so Bunter is **no longer enrichment-gated/OPT-IN**. JK accepted "rewards frequency,
  not execution skill."
- **Captain FINDING flagged (non-blocking):** the rate-signal family inherits a `getPercentile`-on-mostly-zeros property
  — when a signal is sparse league-wide (no one logs it), every player's 0-rate maps to a HIGH percentile (all peers ≤ 0),
  mass-inflating acquisitions. Acute for the sparsest signals (Bunter, Crossed Up). A §16 sim-tune / pooling-convention
  concern for the WHOLE family (R1-a + R1-b), not an R1-b2 fix; build-DARK + the sim gate contain it. Logged here for a
  future tuning ticket.
Distractor + Big/Little Hack (R1-b1) and the §0.9 derivations for Utility (fielding success-rate at non-primary
positions) + Crossed Up (PB/batters-faced) were already pinned — built to documented defaults.

---

### 2026-06-18: R2 scope + measurement rulings (attended; L9b trait-reality rebuild)

JK ruled "do ALL of R2 now" (count-family + First-Pitch pair + the 6 handedness splits; the handedness half builds DARK +
dormant until the handedness join is wired). Measurement rulings (folded into §0.10 verbatim):
- **Count-family** (BB Prone / Composed / Gets Ahead / Falls Behind): walks-allowed rate = (BB+IBB)/batters-faced;
  BB Prone/Falls Behind = rate (high), Composed/Gets Ahead = 1−rate (low). Personality tilt differentiates the pairs.
- **First Pitch Slayer / Prayer**: **HIT vs OUT** on logged first-pitch PAs (`pitchesInAtBat===1`). Slayer = hits/(hits+outs),
  Prayer = 1−Slayer. First-pitch HBP / reached-on-error excluded (neither hit nor out).
- **Handedness splits** (DORMANT until the handedness join is fed — thread `pitcherHandByPlayer` + `batterHandByPlayer`
  maps into the input, mirror Utility): **CON vs LHP/RHP** = 1−K/PA vs that-handed pitchers; **POW vs LHP/RHP** = ISO vs
  that-handed pitchers; **Specialist** = 1−BAA vs SAME-handed batters; **Reverse Splits** = 1−BAA vs OPPOSITE-handed.
  **JK CHOSE BAA over K-rate for the pitcher splits** ("better measure and doesn't get conflated with K Collector").
  Switch hitters excluded from same/opposite cohorts.
- **Structural note:** the handedness data is NOT currently persisted on AtBatEvent (`opposingHand` hardcoded `'R'`; the
  "L9a-3 join" was never wired). R2 threads optional handedness maps (deferred-wiring seam, like Utility's
  primaryPositionByPlayer) so the splits build now but stay dormant until a hook populates them.

---

### 2026-06-18: R1-b3 Two Way v1 scope ruling (attended; L9b trait-reality rebuild)

Grounding R1-b3 (Two Way) surfaced a real architectural tension: the earn-signal (a pitcher's batting wOBA percentile
vs the pitcher pool) requires all two-way pitchers to share ONE peer pool AND to re-evaluate stably each cycle — but
the trait data is a triplet (Two Way C/IF/OF). Per-variant candidate names would fragment the pool into ~⅓ sizes AND
make the just-built re-evaluate-to-drop see a held `Two Way (OF)` with no matching candidate → re-randomize/drop the
position every checkpoint. Honoring "random C/IF/OF at grant" properly needs "treat the 3 variants as one family"
plumbing across the scorer + acquisition — beyond the pure builder. JK ruled **"earn-signal now, defer C/IF/OF":**
- **R1-b3 builds the earn-signal only:** per PITCHER-role player, compute batting wOBA (`calculateWOBA`), emit ONE
  candidate under a single representative variant **`Two Way (C)`** (v1 label; all three variants share EGOTISTICAL +
  POSITIVE so the choice is cosmetic for earning), sampleSize = batting PA, percentiled vs the pitcher pool.
- **DEFERRED to a later ticket:** the random C/IF/OF defensive-position assignment + the family plumbing (shared pool +
  joint re-evaluation), to land with the post-D13 grant flow / roster wiring.
No acquisition or grant-path change in R1-b3 (Two Way (C) is already in POSITIVE_IMAGE_TRAITS + IMAGE_DRIVER_SETS).

---

### 2026-06-18: R3 Ace Exterminator ruling (attended; L9b trait-reality rebuild — the last earnable trait)

Grounding R3 showed it is NOT blocked: `smb4GradeEmulator.ts` already provides `SMB4_FULL_GRADE_SCALE` (incl. "A-") +
`SMB4_GRADE_TO_INDEX` for the "A− or better" threshold, and Ace Exterminator is already POSITION + POSITIVE +
COMPETITIVE/EGOTISTICAL in acquisition (no change). The builder half is cleanly buildable now via the established
deferred-map pattern; the grade-freshness external dependency bites only at the deferred hook, decoupled from the pure
builder. JK ruled the one measurement gap:
- **Ace Exterminator success = REACHED BASE (hit/walk/HBP) vs A−-or-better opposing pitchers.** Denominator = PAs vs
  A−+ pitchers; numerator = reached-base PAs. Same reach set as Distractor.
- **E1 plumbing:** thread an OPTIONAL `pitcherGradeByPlayer?: ReadonlyMap<string, Smb4Grade>` into the input (mirror the
  handedness maps); the grade-deriving/refreshing hook is the DEFERRED app-wide grade-freshness step → Ace Exterminator
  stays dormant until then. No acquisition or grant-path change. This is the LAST earnable v1 trait (→ 47/47).

---

### 2026-06-18: W1 — wire the dormant-trait input maps live-dark (attended; L9b post-rebuild)

With the 47/47 earnable trait set built, the handedness splits + Utility + Ace Exterminator are DORMANT — their optional
`SeasonTraitCandidateInput` maps (`pitcherHandByPlayer`/`batterHandByPlayer`/`primaryPositionByPlayer`/
`pitcherGradeByPlayer`) go unpopulated by the grant hook. Grounding (Explore map) confirmed the data is all on the
franchise `Player` record (`leagueBuilderStorage.ts`: `bats`, `throws`, `primaryPosition`, `velocity/junk/accuracy`) and
the hook (`franchiseTraitGrantCompute.ts` `resolveTraitGrantRoster`) already loads the full roster. JK ruled **"wire all
4 now"** — including the grade map, computed on-demand via the canonical pure `scoreSmb4Player` (the same function the
app-wide grade-freshness ticket would use, so no divergence; on-demand from current ratings is itself fresh). This
OVERRIDES the §0.4 grade-freshness DEFERRAL (the grade-freshness ticket may later add caching/unification). Everything
stays flag-gated (`isFranchisePhase2TraitsEnabled` default OFF) → build-DARK, zero live effect until post-D13. W1 =
extend `TraitGrantRosterEntry` with bats/throws/primaryPosition/grade, capture them in `resolveTraitGrantRoster`, and
build the 4 maps at the `computeSeasonTraitCandidates` call site.

---

### 2026-06-18: PRE-ACT-TRAITS — named pre-activation trait-seam gate (JK directive; attended)

JK elevated (post-FINDING-150 close) the risk that the ~9 newly-built traits behind dormant data seams could "ship dead
at activation." STATUS (verified, not asserted): **W1 (`6a934a9e`) already wired the DATA seams** — it populates all 4
optional `SeasonTraitCandidateInput` maps on the SOLE production path (`processCompletedGame` →
`persistDarkTraitGrantForCompletedGame` → `computeSeasonTraitCandidates`; grep-confirmed no second caller). So Utility
(`primaryPositionByPlayer`) + the 6 handedness splits (`pitcherHandByPlayer`/`batterHandByPlayer`) + Ace Exterminator
(`pitcherGradeByPlayer`) are wired (8 of 9). The `opposingHand='R'` hardcode does NOT block the handedness splits —
they read the THREADED maps, not `ctx.opposingHand` (which feeds only the matrix probe, whose traits are not
handedness-conditional). **Remaining pre-activation work (the named gate, so it doesn't slip):**
- **PRE-ACT-TRAITS-1:** Two Way (IF)/(OF) random-position-at-grant + the 3-variant "family" plumbing (builder currently
  emits one representative `Two Way (C)`). The one genuinely-still-deferred seam (= item B).
- **PRE-ACT-TRAITS-2:** END-TO-END activation verification — W1 is UNIT-verified only (its hook test stubs the seam; the
  builder tests use synthetic maps). Before the flag flips, verify on REAL franchise data that all 47 traits — especially
  the 9 newly-wired/sparse ones — produce sane candidates (browser/integration; pairs with the F-141 D0/flag-flip gate).
- **PRE-ACT-TRAITS-3 (standing note):** un-hardcode `opposingHand` in `reconstructAtBatContext` ONLY IF a
  matrix-handedness trait is ever added to the v1 set (not needed for the current 47).
This gate clears BEFORE the L9b flag-flip / D13 activation. JK directive: name it explicitly so it is not lost.

## 2026-06-19 (AUTH-4) — L12-Q10 fame double-ladder collapse: SCOPE ruling (defer live purge, constrain races)
**Context:** §20.8 (FRANCHISE_V1_LIVING_SEASON_SPEC.md:423-439) says all 3 fame classification schemes (6-tier geographic
`FameLevel`, 9-tier scalar `getFameTier()` in fameEngine.ts, 5-tier reporter `FameTier`) collapse to the single §20.7
canonical Heat/Reach ladder (`resolveFameTier`/`heatToFameTier`: IMMORTAL_LEGEND..DESPISED); thresholds are TBD/sim-tuned
("do NOT import existing code's thresholds"). The legacy scalar `getFameTier(totalFame)` (forbidden labels "Fan
Favorite":359 / "Villain":363) is still LIVE in the UI (`fameIntegration.ts:556` PlayerFameSummary.tier +
`useFameTracking` re-export). The canonical Heat/Reach model is build-DARK (only flashpoint/processCompletedGame
flag-gated paths) — its live per-player heat/reachFloor data does NOT exist until the post-D13 fame activation.
**The fork the Captain surfaced (rather than auto-build a protected SMB4 asset on the live path — the
no-inference/soul-layer-verbatim rule holds under AUTH-4):** §20.8 describes the post-activation TARGET but does not
resolve the pre-activation scope — (a) defer the live label-purge to post-D13 activation + only constrain the build-DARK
L12 race code to read `resolveFameTier`; (b) narrow-relabel the live scalar ladder now (user-visible, browser-verify,
semantic mismatch); (c) other.
**JK RULING (a):** DEFER the live `getFameTier` label-purge to the post-D13 fame-activation ticket (when the live UI
migrates to the Heat/Reach model anyway). L12-Q10 has NO standalone build now. Its only HARD requirement folds into the
L12 build: **every L12 race / fame-tier read MUST go through `resolveFameTier`, NEVER the scalar `getFameTier`.** Add the
live-`getFameTier` label-purge to the post-D13 activation checklist (alongside the L9b/L10/L11 flag-flips).
**Rationale:** lowest risk; no risky live-display change on a protected asset before the data model is live; satisfies the
"races read the canonical ladder before any race goes live" requirement directly in the L12 build; no browser-verify
needed now.

## 2026-06-19 (AUTH-4 overnight) — L12-1 kickoff rulings (3 micro-forks the recon surfaced) + the L12 recon
**Context:** the L12 grounding recon (`spec-docs/L12_SCOPE_MAP.md`, committed `58129601`) decomposed L12 into a 6-piece
split and surfaced 3 micro-forks that gate L12-1 (the dark landing-infra ticket) but were NOT in the already-ruled 13 L12
questions. JK present (a manual session); the Captain surfaced them rather than take AUTH-4 defaults on a costly-to-change
persistence decision.
**JK RULINGS:**
- **(1) Proceed = contract L12-1 NOW** (the dark landing infra: the `isFranchisePhase2L12Enabled` flag + the
  `FranchiseAwardCategory` +4-slot widening + the new All-Star roster store), mirroring the L11 recon→build cadence.
- **(2) All-Star / standings persistence = DEDICATED STORE(S)** (override of "no new store / extend the award row"). The
  All-Star roster persists as its own `franchiseAllStarRosters` IndexedDB store (it cannot fit the single-winner award
  row); this is the FIRST of the "TWO ledger bumps" Q1 budgeted (trackerDb v23→24 + the C4 backup DoD + the
  `franchiseSeasonLedgerStorage.test.ts` store-list PIN, in-ticket). The SECOND bump (a race-standings store, v24→25) is
  DEFERRED to L12-3 — decide persist-vs-recompute-only when the composite shape is designed (default: recompute-only
  unless the Almanac needs standings history).
- **(3) The 3 new merit-award BASES = ACCEPT THE RECON DEFAULTS** (these were undefined in the live `scoreForCategory`
  switch and not in the already-ruled basis list): **RELIEVER_OF_YEAR = relief-WAR / leverage; BOOGER_GLOVE = inverse-fWAR
  (worst qualified fielder); BENCH_PLAYER = best reserve / role-player WAR.** Pure scoring, §16-tunable, easily revised.
  These bind at **L12-3** (the scoring extension), NOT L12-1 — L12-1 only makes the 4 categories PERSISTABLE (the storage
  union), it does NOT extend `FranchiseWarAwardCategory`/`scoreForCategory` (the second compile coupling; that is L12-3).
**Process note:** a 2nd concurrent AUTH-4 worker produced a divergent 7-piece L12 recon in parallel (~08:16Z); JK ruled
TAKE OVER + RECONCILE — the 6-piece adversarially-verified map is canonical (see SESSION_LOG / AUTONOMOUS_RUN_LOG
2026-06-19). Keep exactly ONE AUTH-4 worker active.

## 2026-06-19 (AUTH-4) — L12-Q7 Comeback Player measurement CLARIFIED (current gap, not max-rise)
**Context:** the L11–L14 ruling-pass text + the L12 scope map both phrased the Comeback Player of the Year score as
`max(currentTV − own running season-low)`. Drafting the L12-2 contract, the Captain read that as the **max rise above the
running minimum at any checkpoint** (interpretation B) and was about to dispatch it. JK CAUGHT it before dispatch.
**JK RULING:** the Comeback award measures **the player with the CURRENT biggest gap between their season-low and their
current TrueValue** — i.e. `score = currentTV − seasonLow`, where currentTV = the player's current cumulative `trueValue`
and seasonLow = `min(currentTV, that player's per-checkpoint snapshot trueValues)`. **A player who has a great middle of
the season but FALLS APART by season-end must NOT win** (their current TV is back near their low → small gap). This is
NOT the max-rise-over-checkpoints reading (which would still reward a mid-season recovery the player later gave back).
**Consequences:** simpler engine (a `min` is order-independent → no checkpoint ordering needed). Applied to the L12-2
contract (CHANGES A + the test, BEFORE dispatch) + `L12_SCOPE_MAP.md` (§1/§2/§3/§4 Q7) corrected.
**Lesson (Captain):** when a spec measurement is phrased ambiguously (here "max(... running ...)"), SURFACE the fork for a
JK ruling rather than pick a reading and bake it into a build — even for award/value metrics (not just the soul-layer
traits). The ambiguity was caught only because JK happened to be watching the dispatch.

## 2026-06-19 (AUTH-4) — L12-3 race-standing persistence: RECOMPUTE-ONLY (no new store)
**Context:** the L12-1 kickoff deferred the race-standings persistence decision to L12-3 (the "deferred 2nd ledger bump"):
persist the per-game standings in a new `franchiseRaceStandings` store (trackerDb v24→v25 + the C4 backup DoD + the
store-list PIN) so the Almanac could replay how a race evolved, OR recompute standings live each game with no store.
**JK RULING:** **RECOMPUTE-ONLY** — no new store. The per-game race standings are recomputed from the live TV/WAR/fame
spine each completed game; the Almanac shows final race results, not the standing-by-standing history. ⇒ **L12-3 adds NO
store, NO trackerDb bump (stays v24), NO ledger-PIN churn** — the "deferred 2nd ledger bump" is NOT spent (the only L12
store remains the L12-1 `franchiseAllStarRosters`). **Consequence:** L12-3 is a pure compute layer (engine + the
per-completed-game gate branch consumes it; no persistence).
**Pacing:** JK ruled a FRESH session does L12-3 (the design-heavy ticket) with clean context; this session checkpointed at
the L12-1+L12-2 clean seam (3 commits) without auto-spawning a handoff worker (JK is closing the extra sessions first).

## 2026-06-19 (attended) — L12-3 new-merit-award BASES re-ruled on the grounded data reality (Bench / Reliever / WPA-vs-LI)
**Context:** the L12-1 kickoff "accepted the recon defaults" for the 3 new merit bases (RELIEVER_OF_YEAR = relief-WAR/
leverage; BOOGER_GLOVE = inverse-fWAR; BENCH_PLAYER = best reserve WAR), binding deferred to L12-3. At L12-3 the Captain
grounded the data (workflows `wf_5c81df46-7b6` + `wf_9b1fd965-927`) and surfaced — per the no-inference / award-measurement
rule — that the recon bases assumed data that partly does NOT exist: **BOOGER ✅** (`warPreviewValues.fieldingWar` present),
**BENCH ⚠️→✅** (`trueValuePositioning.isReserve` [startsShare<0.4, franchiseEffectivePosition.ts:289-292] is a clean
PERSISTED designation; the award IS specced — FRANCHISE_V1_LIVING_SEASON_SPEC §23.6 / AWARD-5 "positive Top-3 fame on-ramp
for role players"), **RELIEVER ❌** (the ruled "leverage" basis is NEVER persisted per-season — gmLI is transient only,
`PlayerSeasonPitching` has zero LI fields; LI is also partially obsolete: **FINDING-099 dual-value defect** + the orphaned
relationship-LI modifiers; per-player WPA exists only per-GAME [`CompletedGameRecord.playerWpaTotals`], not season-rolled,
not relief-isolated).
**JK RULINGS:**
- **(1) BENCH_PLAYER = best TOTAL WAR among designated reserves** (`isReserve`). Confirms the recon basis with the WAR
  flavor pinned to `totalWar` (parity with MVP; spec said "best reserve WAR" without a flavor). The reserve award needs its
  own LOWER qualifier (reserves never reach the ~502-PA starter floor) — §16-tunable, applied in L12-3b's candidate assembly.
- **(2) RELIEVER_OF_YEAR = WPA, NOT leverage** (override of the recon "relief-WAR/leverage" default). LI is not viable as a
  season-award basis (not persisted; obsolete-tinged). WPA is the basis.
- **(3) WPA via a NEW SEASON FIELD** (override of recompute-summing the game-level totals): add `pitchingWpa` + `reliefWpa`
  to `PlayerSeasonPitching`, accumulated by the season aggregator from each game's `playerWpaTotals`; **relief isolation is
  EXACT and cheap** — a pitcher either starts or relieves in a given game, so `reliefWpa` = Σ that game's pitching-WPA over
  games where he did NOT start (the per-game `isStarter` flag) — NO per-pitch attribution surgery. This is a **LIVE aggregator
  + saved-shape change** (ungated substrate write, matching the existing TrueValue-snapshot precedent so the award has full
  history when the flag flips). Reliever filtered by `gamesStarted` (usage, not profile).
**Captain decomposition (within JK's "proceed"):** L12-3 SPLIT into **L12-3a** (pure composite engine + Bench/Booger
selectors — VERIFIED + committed this session), **L12-3b** (the dark recompute gate branch), **L12-3R** (the live WPA
season-rollup + Reliever — isolated so the live/saved-shape change gets its own audit + browser-verify; it is the ONLY
non-dark piece of L12-3). **Note:** L12-3R touches `PlayerSeasonPitching` + the season aggregator (LIVE) — flag it for the
per-ticket engineering audit + the browser-verify batch (saved-shape, prioritized).

## 2026-06-19 (attended) — L12-3R Reliever-of-Year eligibility = PURE RELIEVERS ONLY (gamesStarted === 0)
**Context:** L12-3R binds RELIEVER_OF_YEAR off a WPA basis (JK earlier ruled WPA-not-LI). Grounding (`wf_509658cd-6fe`)
confirmed `reliefWpa = Σ(pitchingWpa over !isStarter games)` is exactly computable, which would let a swingman (mostly-
relief but some starts) compete on his relief-only WPA. The Captain SURFACED the eligibility fork (per the surface-don't-
infer rule, since it's an award-measurement choice): (A) relievers by usage+volume [swingmen compete on relief WPA], (B)
PURE relievers only [gamesStarted===0], (C) anyone with relief work.
**JK RULING: (B) PURE RELIEVERS ONLY** — eligible iff `gamesStarted === 0`, ranked by pitching-WPA, above a relief-innings
floor. **Consequence (Captain-flagged):** for a 0-start pitcher, relief-WPA == total pitching-WPA, so the relief-isolation
(`reliefWpa` + the per-game `!isStarter` split) is REDUNDANT and is **DROPPED** — L12-3R persists only ONE new field,
`pitchingWpa` (total pitching WPA), and filters to 0-start pitchers at scoring time. Simpler + lower-risk live change.
**Build:** SPLIT **L12-3R-1** (LIVE — `pitchingWpa?` on PlayerSeasonPitching + ungated aggregator accumulation; additive-
optional, no DB churn; browser-verify batched) + **L12-3R-2** (dark Reliever binding — scoreForCategory pitchingWpa, a
`gamesStarted > 0 → null` filter, a relief-IP-floor qualifier `minIP × RELIEVER_QUALIFIER_IP_FRACTION` 0.15 §16; the
orchestrator's 8th category; `WAR_AWARD_CATEGORIES` stays the 5 → D9 finalize byte-neutral). The relief-IP-floor + the
0-start cutoff are §16 sim placeholders.

---

## 2026-06-19 (attended) — L12-4 All-Star roster: format + exact rosters + DH + two-way RULED
**Context:** L12-4 grounding recon (`wf_74ab63b0-55a`, 6 readers + synthesis + adversarial critique →
`spec-docs/L12-4_SCOPE_MAP.md`). L12-4 = the greenfield by-position All-Star **selection engine + 60% lock**, writing into
the already-built `franchiseAllStarRosters` store (L12-1, trackerDb v24 — **no DB/schema work**) and reading the already-
built fan-vote scorer (L12-3, `FAN_VOTE_WEIGHTS`). The recon's adversarial critique caught the Captain about to re-open the
already-RULED by-position-starters question (Q5) and re-confirm Q2/Q13 — corrected before surfacing. The genuinely spec-
silent forks went to JK via an AskUserQuestion pass. **Boundary:** L12-4 PRODUCES the roster + sets the lock ONLY; all
payouts (reach-floor ratchet, badge, morale, snub, career All-Star counter) are L12-5.

**JK RULINGS (AskUserQuestion pass, THEN the v1-simplify refinement below):**
- **Q3 — DH = NEVER included.** The 8 position slots are C/1B/2B/3B/SS/LF/CF/RF; no DH slot, no `config.useDH` gate.
- **Q4 — Two-way players compete on the STRONGER SIDE ONLY** (bat vs mound, whichever scores higher) — one slot, never both.
- **Captain defaults (confirmed):** the `allStarSelections` career counter is NOT written by L12-4 (it's a payout → L12-5/
  season-end; zero live writer today); the per-game recompute stays pure (a thin sibling `persistFranchiseAllStarRoster…`
  wrapper does the write inside the existing `processCompletedGame.ts:657-663` L12 flag block).

**v1-SIMPLIFY REFINEMENT (JK, same session — supersedes the AskUserQuestion Q1/Q2 dual-format answers):** JK weighed a
flexible user-configurable roster builder (per-position min/max reserve eligibility in League Builder) vs fixed rosters and
ruled **SIMPLIFY for v1**, because v1 All-Star plays no game and is build-dark — the config-UI + constraint-solver +
validation cost is not worth it yet. **v1 = ONE league-wide 26-man team, any league size:**
- **25 base** = 8 fame-led position starters (`FAN_VOTE_WEIGHTS`) + 5 family-grouped MERIT backups (1 C · 1 corner-IF [1B/3B]
  · 1 middle-IF [2B/SS] · 2 OF) = 13 position players; + 4 SP + 1 backup SP + 5 RP + 2 backup RP = 12 pitchers (SP by
  `pitchingWar`, RP by `pitchingWpa`; reliever = `gamesStarted===0`).
- **+ 1 FAN WILDCARD** (the 26th) = **fame-led**, any position, the highest-fame **qualified** player not already selected
  (`position:'WILDCARD'`, `role:'starter'`). Fame split (JK: "at least the starters' weighting, could be 100% fame"): dark
  default **100% fame** (`WILDCARD_WEIGHTS` wMerit 0/wFame 1, qualifier floor still applies so never a scrub), §16-tunable
  down to the 65% starter floor.
- Encode the slot in `position`, the headliner-vs-depth tier in the binary `role` — **no selection-shape widening**.
- **DEFERRED to v2** (NOT built in L12-4): user-selectable 1-vs-2 teams; the dual-conference 22-man format + conference
  resolution; the per-position min/max reserve-eligibility customization in League Builder. v1 models the roster as a config
  **preset** so v2's customization edits the same config WITHOUT an engine rebuild.
**Build SPLIT (build-DARK, builder≠auditor):** L12-4a pure selection engine (single 26-man) · L12-4b All-Star candidate
exporter (retains position/team) · L12-4c lock-once helper (60%) · L12-4d orchestrator wiring + persistence (NO conference
resolution in v1). No trackerDb bump (store at v24). Full scope/seams/anchors in `spec-docs/L12-4_SCOPE_MAP.md`.

---

## 2026-06-19 (attended) — L12-5 award/All-Star EMISSION + snub morale + reach-floor: 3 forks RULED
**Context:** L12-5 grounding recon (`wf_23cc345d-df4`, 6 readers + synthesis + adversarial critique →
`spec-docs/L12-5_SCOPE_MAP.md`). L12-5 = the PAYOUT layer: it reads the already-built award rows / locked All-Star roster /
standings and fires emission + snub-morale + reach-floor for the marquee honors (MVP/CY/All-Star — Q6). The critique caught +
the Captain verified two live correctness traps: (1) the L3 race morale tap fires ONLY when the event carries `kind:'race'`
(the designation template builds `{type}` with no kind → hits the event table, bypassing the tap) AND the resolver must return
a NEW non-neutral object (the `base === NEUTRAL_BASE_CONSEQUENCE` ref-check skips personality scaling); (2) the honor→reach-floor
ratchet needs a THIRD flag — `isFranchisePhase2FameEnabled` — because the `FranchiseFameRecordRow` it ratchets is only produced
by the per-game dark fame writer (so the effect no-ops cleanly if Fame is off). Two trigger edges: All-Star pays at the 60%
LOCK (per-game spine); MVP/CY at SEASON-END finalize (extract a PURE `emitFranchiseHonors(scope)`, NOT inline in the React effect).

**JK RULINGS (AskUserQuestion):**
- **F2 — snub = the CLOSE LOSERS only** (NOT everyone). The caller derives the set: MVP/CY = top runner(s)-up by smallest
  `marginToWinner`; All-Star = the highest-scoring non-selected qualified player at the contested slot. Closeness threshold/top-N
  = §16 sim.
- **F7 — the new race tap = SNUB ONLY.** Leave the legacy positive `ALL_STAR_SELECTION` nod row (masterMoraleMatrix.ts:324)
  untouched; `MORALE_TAP_REGISTRY.race` carries ONLY the negative snub. No double-count (routing the nod through the tap is rejected).
- **F9 — reach-floor: WHOLE TEAM, starters get MORE.** Everyone selected (starters + reserves + wildcard) gets a permanent
  reach-floor bump; starters + wildcard get a BIGGER bump than reserves. `honorHeatBump` ladder = `mvp ≥ cyYoung ≥ allStarStarter
  ≥ allStarReserve` (§16 magnitudes); the ratchet iterates ALL selections by role; the `allStarSelections` career counter
  increments at the lock (any selection).
- **Captain engineering defaults (taken):** ONE new `NarrativeEventType` `AWARD_RESULT` (discriminate honor via `facts`, 1
  forced `hedgingModifier` entry); `perEventRate=1` (boolean gate); MVP/CY overcounting valve = `listSeasonNewsItemsByEvent`
  read-guard + fire-once across the two FranchiseHome paths; MVP/CY payout in a PURE module not the React effect; flat snub
  resolver keyed off `type` (graded-snub = v2); the non-decaying `applyHonorHeatBump` helper lands in `fameModel.ts`
  (additive math, no fame-behavior change); per-checkpoint race narration DEFERRED to v2.
**Build SPLIT (build-DARK, builder≠auditor):** L12-5a pure reporter adapter + `AWARD_RESULT` union/Record · L12-5b emission
config ON-switch + emitter wiring at both edges · L12-5c L3 snub row (`kind:'race'` event + close-losers set + apply loop, L12+Morale
double-gate) · L12-5d honor→reach-floor (non-decaying helper + `honorHeatBump` tiers + write-back at both edges, L12+Fame gate).
No trackerDb bump. Full scope/seams/anchors/risks in `spec-docs/L12-5_SCOPE_MAP.md`.


---

## 2026-06-19 (attended) — UI cleanup: theme.css/tailwind.css are DEAD v4 orphans; franchise tokenization uses v3 CSS-vars (Fork C); v4 migration DEFERRED
**Context:** Phase 1 of the franchise-hub UI cleanup (Fork C = keep the franchise green, tokenize it, then de-jargon +
de-densify) surfaced a discrepancy vs the `UI_CLEANUP_PLAN.md` premise. The Phase-1 builder (Claude Code, opus) flagged it;
the Captain independently verified via the live import chain. **Tailwind is v3.4.19 (JIT/PostCSS).**
`src/src_figma/styles/theme.css` + `styles/tailwind.css` use **v4-only syntax** (`@theme inline`, `@import 'tailwindcss'`,
`@custom-variant`) and are **NOT in the runtime import chain.** The live global stylesheet is **`src/index.css`** (v3
`@tailwind base/components/utilities` + Vite-default base + a `:root` `Press Start 2P` font + 4 typewriter/scoreboard
font-faces); it does NOT import theme.css, and theme.css's v4 directives would not function under v3 regardless.
**Origin (Captain error corrected):** the Captain had earlier asserted theme.css was "the live design system, unambiguously
live app-wide" — inferred from the file's contents (global font + CRT block) WITHOUT checking the import chain. The builder's
import-chain check disproved it; the Captain confirmed by reading `src/index.css`. The one piece that IS live: the global
pixel font comes from `src/index.css`'s `:root`, so the retro typographic baseline is real — it is the SNES color tokens +
CRT overlay in theme.css that are dead.

**FINDING (supersedes the UI_CLEANUP_PLAN premise):**
1. **There is NO live design-token system.** theme.css's SNES color tokens + CRT overlay are inert/dead orphaned
   Figma-export artifacts. App colors are all hardcoded arbitrary Tailwind values (`bg-[#…]`) per component; the franchise
   hub is the heaviest concentration. (`theme.css` + `tailwind.css` = deletion / "orphaned-artifact" candidates so no future
   session re-mistakes them for the live system.)
2. **Scope correction:** the franchise green = **~70 distinct hexes / ~2,178 occurrences across 5 files**
   (FranchiseHome 982 · TeamHubContent 888 · ScheduleContent 154 · SeasonSummary 112 · AwardsWatchlist 42) — NOT the
   "~9 colors / ~1,250 across 4 files" the UI_CLEANUP_PLAN estimated. `SeasonSummary.tsx` IS in scope (hub-reachable);
   `FranchiseV1VisualSmokeSeed.tsx` EXCLUDED (dev-only route behind `enableFranchiseVisualSmokePreviewRoute`).

**DECISION (JK 2026-06-19):**
- **Fork C tokenization uses the v3-correct mechanism:** the franchise green as ~30 semantic CSS vars scoped under a
  `.franchise-hub` wrapper, consumed as `bg-[var(--franchise-*)]` arbitrary values — byte-identical render, never leaks.
  NOT the `@theme inline`/v4 path. (Built in Phase 1: `src/src_figma/styles/franchise-theme.css`.)
- **Do NOT migrate the app to Tailwind v4.** A v4 migration is a separate, large, app-wide build-system project (CSS-first
  config + breaking utility changes across every screen) — out of scope for the cosmetic franchise cleanup, and a separate
  post-v1 decision if ever taken. theme.css's commented-out `@theme inline` block stays as a future-v4 breadcrumb only.
- **Excluded from the byte-safe sweep** (data/illustration, not chrome): the stadium spray-chart SVG art
  (`TeamHubContent.tsx ~5480+`), the JS data-color maps (news-category/role/grade colors feeding `style`/SVG, e.g.
  `FranchiseHome.tsx:4630`), and sub-3-use one-off tints. ~30 tokens cover ~95% of uses; the ~5% tail stays literal/flagged,
  never invented around.

**Implications / future:**
- There is **no app-wide design system to "match franchise mode to"** — the whole app is hardcoded. App-wide visual
  consistency, if ever wanted, is a future (post-v1) project; `franchise-theme.css` is the natural seed to extend the same
  v3 CSS-var pattern outward.
- **Phase 1 deliverables:** `src/src_figma/styles/franchise-theme.css` (~30 scoped vars, byte-exact) +
  `instructions/franchise-design-system.md` (hex→token map, density scale, copy-voice + banned-words, punch list, Phase-2
  wiring). Only those 2 new files created (empty diff verified on all 5 UI files + theme.css).
- **Phase 2 (the sweep) is GATED** on a clean L12 commit + sole-mutator; MUST do the density + copy passes (not just
  hex→token), handle portaled content rendered outside `.franchise-hub` (scoped vars won't resolve there), and keep
  genuinely-inactive families' honest "not yet" wording per D11 #14/#15 (only promote families that are actually live).

---

## 2026-06-21 — RB-1 (Mode-1 scout value model) SPLIT + RB-1b chemistry-fit model RULED (JK attended)

**Context:** RB-1 (`AUCTION_REBUILD_PLAN.md` Phase-1) rewrites the scout value layer (AUC-5.1a/5.1b). Source-grounded this
session (workflow `wf_c1a73726-c46`, 5 readers + Captain source-verify in the `kbl-mode1` worktree). Finding: RB-1 has a
clean MECHANICAL half + an under-specified, internally-CONFLICTING soul-layer half (the chemistry-MIX → potency-TIER rule).
That rule is doubly-defined + conflicting across specs AND fenced by a hard guardrail (IV stays potency-neutral at L2
forever; the frozen IV oracle is untouchable).

**DECISION 1 — RB-1 is SPLIT (JK):**
- **RB-1a (build NOW):** the mechanical scout value re-anchor — the displayed band centered on the scout's *biased price
  opinion* (NOT exact true IV) + a 20–80 numeric overall grade; true IV stays hidden. Captain's documented defaults below.
- **RB-1b (build after; model ruled now):** the chemistry-fit → potency-tier scout price bump.

**DECISION 2 — RB-1b chemistry-fit model = PER-TRAIT COUNT · 3-TIER · PERCEPTION-LAYER (JK):**
- **Model = the EOS_RATINGS_ADJUSTMENT_SPEC + IV_ENGINE §7.3 draft-board "marginal synergy" model**, NOT the per-player-
  chemistry-axis reading of V2 §3.7: each of a prospect's traits is potency-scaled by the COUNT of the GM's already-rostered
  players sharing **THAT TRAIT's** chemistry type (`EOS_RATINGS_ADJUSTMENT_SPEC.md:478-489`: `getChemistryTier(teamChemistryCount)`).
  Rationale: it matches how `computeIV` trait pricing + `effectiveRatings` already work (per-trait `ChemistryType`), and the
  existing §7.3 overlay concept ("this Spirited pick takes you 2→3, upgrading N traits a tier").
- **3 tiers L1/L2/L3 — resolves the logged CAR-003 conflict.** EOS `getChemistryTier` returns 1–4, but
  `PotencyTier`/`POTENCY_SCALE`/`effectiveRatings` are all hard-wired to 3 tiers; the 4-tier is the stale outlier. Canon = L1/L2/L3.
- **Perception-layer ONLY — reconciles the guardrail.** The chemistry-fit bump lives in the SCOUT'S PRICE OPINION (RB-1b),
  NEVER in canonical IV/salary. Satisfies V2 §3.7 ("scout prices chemistry-fit") AND IV_ENGINE §3.5/D15 ("IV stays L2-reference
  forever; salary NEVER reprices for chemistry potency"). Implementation = run trait pricing at the chemistry-derived fit tier,
  take the delta vs the L2 baseline, surface as a price nudge on the scout's opinion. The frozen IV oracle + `computeIV`'s L2
  default stay byte-untouched.
- **OPEN for the RB-1b build:** the exact same-chemistry-COUNT → L1/L2/L3 thresholds are unpinned in spec ("SMB4 count→tier
  thresholds" flagged needed). Captain takes a documented conservative default at RB-1b build + flags for sim-tune (RB-16),
  unless JK pins them first.
- CONFLICT-001 (chemistry TYPE list, 4-vs-5) is already resolved by RB-0a (5 canonical codes SPI/DIS/CMP/SCH/CRA).

**RB-1a Captain defaults (per JK "build RB-1a with your defaults"):**
1. **Band anchor = the scout's biased price opinion** = `trueIV × (1 + bias)`, where `bias` is a per-(scout, prospect)
   seeded offset scaled by `(1 − accuracy/100)` and floored so it is NEVER exactly 0 → the displayed `[low,high]` midpoint no
   longer reveals exact true IV (the V1 leak: `perceivedValueRange(auctionPlayer.iv,…)` made midpoint = true IV exactly).
   On-scale (trueIV-relative). **NOT `FARM_SCOUTED_GRADE_PROJECTED_VALUE`** — verified a DIFFERENT/smaller scale (the
   analyzer's rookie-scaled "scout-visible salary" at `rosterAnalyzer.ts:356`, not the auction kblIV scale).
2. **20–80 grade** = linear map of the 12-letter `Grade` ladder (S=80 … D=20) off the SCOUTED letter grade (never the true
   `scoreSmb4Player` numericScore — that would leak truth).
3. Width unchanged (reuse `perceivedValueRange` keyed on `scoutAccuracy`).
4. MLB tier untouched (public IV by design).
- **Deferred from RB-1a (flagged in `MODE1_REBUILD_JK_BACKLOG.md`):** (a) the farm Opening/reserve still derives from true IV
  (`reservePriceCurve(ivPct)×iv`) — a secondary back-solvable leak → folded into **RB-2** (nomination/reserve rework, which
  already touches the state machine); (b) per-bidder scouted GRADE (§3.6 rival-disagreement) → folded into **RB-11** (scout privacy).

### 2026-06-21 (later, JK attended → then AUTH-4) — RB-1b chemistry-fit REFINED: boundary-aware MARGINAL value + bidirectional

JK chose **roster scope = MLB roster (22, set pre-farm-auction) + farm picks-so-far** (NOT farm-picks-only — that would be hollow
early). AND added a model refinement that supersedes the flat "tier(count)" framing of DECISION 2 above (latest ruling wins):

**The chemistry value is BOUNDARY-AWARE + BIDIRECTIONAL, because the roster is fixed-size (a call-up forces a send-down):**
- **Level-up value (full):** adding a player of chemistry category C when the count is one below a tier boundary (count 3→L2, or
  7→L3) raises the whole category a tier → upgrades every C-chemistry trait on the roster (§7.3 "this Spirited pick takes you 2→3").
- **Buffer value (partial — "not as much as leveling up but still value", JK verbatim):** when a category sits at its tier FLOOR
  (count = 4 [L2 floor] or 8 [L3 floor]), it is "one player from dropping down to a lower level" on the next send-down; adding a
  player of that type INSURES against that demotion. Real value, smaller than a level-up.
- **Neutral:** adding deep within a tier (no boundary proximity) = no chemistry value.
- **BIDIRECTIONAL (JK directive, primarily for RB-9):** the same boundary logic must run the REMOVE direction — a send-down that
  drops a category below a tier floor is a COST. The in-season **recommendation engine (RB-9) MUST consume this both ways** so it
  doesn't only see "adding type X helps" but also "sending down type X here drops you a tier." → flagged for RB-9 in the backlog.

**Implementation (Captain default under AUTH-4 — isolated, no frozen-oracle risk):** grounding (wf_bf11fd00-b60) showed exact
per-trait $ pricing would need a NEW `ivEngine` export (the uniform-tier `computeIV` delta is **$0 for hitters** — raw layer is
L2-pinned at ivEngine.ts:349). Touching the frozen-oracle engine for a perception nudge is rejected. Instead RB-1b is an
**isolated per-category fit multiplier** on the scout price opinion (a NEW module; canonical IV/salary/`computeIV`/oracle byte-
untouched): `multiplier = 1 + marginalChemistryAddValue(count of prospect's chemistry category on the MLB+farm roster) × CAP`,
where `marginalChemistryAddValue` = LEVEL_UP (full) / BUFFER (~0.4× of level-up) / 0, computed via a **bidirectional pure primitive
`marginalChemistryValue(count, direction:'add'|'remove')`** reused by RB-9. CAP (≈0.08), the buffer fraction (≈0.4), and the tier
cut-points are sim-tunable (RB-16).

**3-tier cut-points (grounded default, NOT invented):** collapse the only concrete table `TRAIT_INTEGRATION_SPEC.md:159-173`
(4-tier at counts 4/8/12) to 3 by preserving its own 4 and 8 boundaries → **L1 = count ≤3, L2 = 4–7 (NEUTRAL default), L3 = ≥8**.
Roster math: an even 22-man spread (~4–5 per chemistry of 5) lands at L2 by default (no free bump); reaching L3 needs deliberate
~36%+ stacking. L2 = 1.0× neutral (POTENCY_SCALE) MUST remain the default so the bump is 0 for a typical roster.

**Vocabulary bridge:** trait `ChemistryType` words ↔ player `ChemistryCode` (SPI/DIS/CMP/SCH/CRA) via `normalizeToChemistryCode`
(handles 3-letter codes, Title-case words, UPPER+legacy FIERY/GRITTY). Count every roster player's chemistry through it.

**DEFERRED (documented fast-follows, not dropped):** (i) per-trait amplification of the prospect's OWN traits by the roster (the
literal DECISION-2 per-trait effect — second-order; v1 uses the prospect's chemistry-category marginal value, which §7.3 frames as
the dominant "upgrades N existing traits" effect); (ii) weighting the level-up by N = existing roster traits of that category;
(iii) RB-9's actual bidirectional consumption (its own ticket — requirement flagged now). RB-1b SPLIT: **RB-1b-1** pure engine
(the boundary-aware primitive + the fit multiplier + tests) → **RB-1b-2** the MLB+farm roster-chemistry feed (hook) + page wire.

---

## 2026-06-21 (attended) — RB-2 (engine nomination + one-chance) JK rulings + RB-2a built

**Context:** RB-2a (the PURE build-dark one-chance auction engine) shipped (`2b7e894d`, WAVE 57) — `selectNextNominee`
(seeded weighted reveal ∝ (ivPercentile/100)^k, Efraimidis–Spirakis) + `surfaceNextPlayer` + `resolveLot`/
`passLoneSurvivorOut`/`advanceLot` (no-bid → permanently out), additive/build-dark alongside the old GM-nomination
path. RB-2 SPLIT into RB-2a (engine) + RB-2b (wire the hooks/pages/persistence + strip the old machinery). On
resume JK ruled the four RB-2b forks:

- **RB-2-Q1 — Farm auction opening/reserve floor (§4.4; closes the D-6 rank-leak): FLAT = the farm/league MINIMUM
  SALARY.** RB-2a's `surfaceNextPlayer` currently uses the MLB percentile-reserve curve `reservePriceCurve(ivPct)×iv`
  for BOTH tiers — correct for MLB (§4.4 percentile curve), but for FARM a per-prospect % LEAKS the hidden true-value
  rank via the opening price. RB-2b switches the FARM opening to a FLAT floor = `LEAGUE_MINIMUM_SALARY` (same opening
  for every prospect → zero rank leak; lowest floor → most bid back-and-forth, consistent with the 2026-06-21 "start
  low" reserve ruling). MLB keeps the percentile curve. Sim-tunable (RB-16). *(Rejected: a fraction of class-average
  value — also leak-free but JK chose the simpler fixed minimum.)*
- **RB-2-Q2 — Roster-fill guarantee at the tail (§2.3): HARD GUARANTEE via forced fillers.** Under one-chance a
  no-bid player is gone forever, so the pool drains and a GM could theoretically be stranded. RB-2b makes a softlock
  IMPOSSIBLE BY CONSTRUCTION: once a GM's open roster slots == affordable players remaining, the engine force-surfaces
  cheap fillers that CANNOT go no-bid-out (the player must be claimable). *(Rejected: trust pool-surplus sizing alone
  — leaves a small residual stranding risk; JK chose the runtime guarantee since a softlocked draft is a hard
  player-facing failure.)*
- **RB-2-Q3 — Nomination weight exponent k per tier: MLB = 2, FARM = 3.** Public-IV MLB → lower k adds order-randomness
  → sharpens the fight-now-vs-save gamble + makes "drafted early" a real §6 slot-morale commitment signal; hidden-value
  FARM → higher k doubles as a soft quality hint in the fog. RB-2b sets `config.nominationWeightExponent` per tier (the
  RB-2a default 2.5 applies only if a tier doesn't set it). Sim-tunable (RB-16). *(Rejected: equal 2.5 both tiers.)*
- **RB-2-Q4 — New-league draft format default (backlog O-1 RESOLVED): AUCTION.** VISION §9.A makes auction the v1
  primary; new leagues default to `draftFormat: 'auction'` (snake stays available via the RB-13 format picker). RB-2b
  (or RB-13) flips the `DEFAULT` from `snake` → `auction`. *(Rejected: keep snake back-compat default.)*

All four are durable RB-2b build inputs; baked into HANDOFF_NEEDED. k + reserve + filler magnitudes are RB-16
sim-tune dials, none block the build.

## 2026-06-23 — RA-8 build-dark + S7 grade-band guidance (fresh Hybrid /kbl-captain session)

- **RA-8 (A2.2) catcher CS/SB-allowed = BUILD-DARK field-add (JK ruling, Hybrid inline surface).** Add optional
  `caughtStealingAgainst?`/`stolenBasesAllowed?` to `PlayerSeasonFielding` + seed 0; NO per-game writer. The spec
  assigns the field-ADD to RA-8 and the READER to A1.5c-4 but is SILENT on the writer; the aggregator has zero catcher
  plumbing, so live-populate is real build-work (csMap/sbMap from BETWEEN_PLAY_EVENTS + undo-exclusion + empty-catcherId
  bucketing) best landed WITH its reader at A1.5c-4. Canonical names = `caughtStealingAgainst`/`stolenBasesAllowed` (NOT
  the decoupled test mirror's `caughtStealing`). No DB bump; season-only. Committed `0edf060a`. *(Rejected: live-populate
  now — would bloat the run's first saved-shape ticket + front-load untested edge cases.)*
- **Branch-B S7 bidding guidance = GRADE-BAND + chemistry-fit nudge (JK ruling).** The S4-pt2 price re-anchor makes the
  bidding GUIDANCE range come from the scout's overall grade band (S4-pt1 `scoutOverallGradeBand`) → price range,
  REPLACING the true-IV `scoutRangeForProspect` (LeagueBuilderFarmAuctionDraft.tsx:114-123) as the guidance SOURCE — per
  the prior "scout's grade range, not true value" ruling. AND the RB-1b boundary-aware chemistry-fit multiplier (≤+8%
  when a prospect would level-up/buffer the GM's roster) STAYS on that guidance, now applied to the grade-band range
  instead of the true-IV range. The won bid still becomes the stamped going-into-season salary (the missing FARM piece
  S7 also wires). *(Rejected: pure grade-band-only guidance with no chemFit signal.)*

## 2026-06-23 — A1.5c-4 catcher-arm rate constant k = 0.45 (JK ruling, Hybrid surface)

- **Catcher caught-stealing RATE = `(CS×0.95)/((CS×0.95)+(SB_allowed×0.45))`, null at 0 denominator (JK ruling).** The
  SOURCE spec (`RATINGS_MEASUREMENT_WORKSHEET.md:100`) names two percentages ("CS 95% catcher / SB-allowed 55% pitcher;
  surface the discounted rate, never raw CS%") but writes NO formula — so the rate form was a propagated Captain inference
  in the header/queue/ledger, surfaced to JK per the soul-layer no-inference rule. **k = 0.45 = the catcher's OWN SB blame
  share** (`kblWpaAttribution.ts:1378`, `catcher ? 0.45`), symmetric with crediting him 0.95 of a caught-stealing (both
  terms use the catcher's own responsibility share). *(Rejected: k = 0.55, the pitcher-share the spec sentence names —
  less internally consistent with the 0.95 CS credit.)* No sample-size gate for v1 (mirrors `outfieldArmRate`; a MIN gate
  would be a §16 sim-tune). Career parity deferred (season-only). Built in A1.5c-4 (writer + pure rate fn).

## 2026-06-23 — S7 design forks RULED (Branch B price re-anchor; JK, Hybrid surface)

- **S7a price range = MIDPOINT-to-MIDPOINT** off the canonical `GRADE_SALARY_BOUNDS` (`ratingsAdjustmentEngine.ts:149`,
  T5-calibrated; EXPORT it, do not duplicate). `gradeBandToPriceRange({best,worst}) = {low: midpoint(worst), high:
  midpoint(best)}`, `midpoint = (floor+ceiling)/2`. *(Rejected: floor-to-ceiling full span — too wide for actionable
  guidance.)* The `C`/`C-` + `D+`/`D` midpoint overlaps are a documented T5-bridge artifact, out of S7a scope.
- **S7b guidance = the band IS the displayed range** (chemFit-scaled ≤+8%); DROP `perceivedValueRange`'s IV-noise
  widening from the auction guidance path entirely (the grade band already carries the spread → no double-widening).
  *(Rejected: band-center + a width helper.)*
- **S7c salary stamp = ALL real winners** (human + CPU-controlled farm winners get their won bid stamped as the
  going-into-season `Player.salary`; shill/dissolved teams stay excluded per RB-10). Consistent Mode-2 league economics.
  *(Rejected: human-GM only.)*
- **Defaults TAKEN (correctness, noted not asked):** (1) S7d KEEPS `perceivedValueRange`/`scoutValueRange.ts` — the
  Mode-2 freeze calls it directly (`draftFreezeInputs.ts:81`→`franchiseInitializer.ts:739`); deleting it breaks the
  freeze→Mode-2 morale pipeline. Only `scoutPriceOpinion` (auction-only) is retired. (2) `gradeToTwentyEighty` is
  RELOCATED to a surviving module before `scoutPriceOpinion.ts` is deleted, so the live 20-80 reveal persists.

## 2026-06-26 — Keystone optimizer kickoff: tier ruling + build routing (JK)

- **Tier scales BUDGET ONLY (JK ruling).** Picking a difficulty tier (juiced/standard/nerfed) scales only the team
  budget (`computePoolTierCap(pool.ivs, tier)`); players keep their stock (juiced-workbook) ratings/IV. This is the
  canonical absolute-IV architecture (IV spec T12: "player IVs never change with the pool — only the league-environment
  constants recalibrate"), and it is ALREADY the live behavior — the sim/feasibility read stock ratings; tier enters
  only via the budget. `TIER_RATING_SCALES` (defined in `tierParams.ts`) stays **dormant/unused** for the sim +
  feasibility. *Resolves the OPEN line from commit e6488888 ("does picking a tier weaken ratings or only the budget").*
  *(Rejected: faithful-tier rating-scaling — kept as provenance in ARCHETYPE_BALANCE_SIM_RESULTS, not adopted. Note:
  the verdict of the pool-feasibility check is composition-driven, so it is tier-robust either way; budget-only is the
  simpler, canon-aligned choice.)*
- **Build routing (JK): Codex builds on `codex/draft-pipeline-fix`; Captain (Opus) audits.** The keystone-optimizer
  builds (pool-feasibility → fielding-corrected true-value → the two manager-lane contract functions) are dispatched to
  Codex via a contract in `PROMPT_CONTRACTS.md`, preserving cross-model build/audit separation. Pool-feasibility first
  (handoff seam c66d680f). Design spec: `POOL_FEASIBILITY_SPEC.md`.

## 2026-06-26 — Step 2 true-value: chemistry-scale semantics + directional v1 (JK)

- **Chemistry trait-potency scale RESOLVED (no code change).** The live `POTENCY_SCALE` is ALREADY workbook-correct
  (positives 0.5/1.0/3.0, inverted 3.0/1.0/0.5) — JK corrected 2.0→3.0 on 2026-06-22. A stale "2.0×" comment in
  `traitInteractionMatrix.ts` (never updated at that correction) misled a mapping agent and produced a false "2 vs 3"
  question; corrected the comment to match the constant. **JK semantic model:** L1 = the default/lowest every trait
  gets (no chemistry support); L2 = a chemistry "fit" = the level the frozen IV is founded on (prices at); L3 = max fit,
  rare. So the optimizer's true-value re-leans each trait vs the L2 "fit" baseline the frozen IV already assumes.
- **True-value v1 = DIRECTIONAL, not exact (JK ruling 2026-06-26).** `trueValue = frozen kblIV + bounded chemistry lean
  + conservative fielding nudge`, reducing EXACTLY to kblIV at the neutral baseline (clean additive layer; frozen
  economy never touched). Magnitudes are conservative PROVISIONAL constants, calibrated empirically in Mode-2 — matches
  spec D17 ("fit a correction ONLY if data demands / do not overengineer"). *(Rejected: exact per-trait re-pricing
  through the IV engine now — bigger build, and the precision is un-calibratable until Mode-2 season data exists.)*
  Built as `derivedTraitPotency.ts` (TRUEVAL-1) + `trueValue.ts` (TRUEVAL-2), build-dark. Documented build-dark
  assumptions (flagged, retunable, spec §2.6 leaves them open): chemistry counts over the FULL active roster, and a
  player's chemistry self-counts toward its own traits' potency.

## 2026-07-01 — JK ratifies the Fable v1 plan (Wave 0 fire order) + two product rulings

**Context:** Fable 5's planning session produced `V1_PLAN_FABLE_2026-07-01.md` (assembly-FIRST
correction + wave sequencing + budget routing). JK ratified all five decisions:

1. **Assembly fires now** (Wave 0, Opus executes `ASSEMBLY_PLAN_2026-07-01.md`).
2. **`main` advances** right after assembly (clean FF, local only, never pushed).
3. **FABLE-C2A routes to Codex-xhigh** (protect Fable's capped budget for C1/C2B/C3).
4. **Two pulled-forward Codex tickets approved:** in-season legal-roster enforcement (audit
   ISAGM-04/05) + the per-league team-instance shadow store (S2 foundation) — both parallel to C1.
5. **Conference editor is IN v1 scope** (see ruling B); divisions are NOT.

**Ruling A — backup-catcher legality counts SECONDARY positions (JK 2026-07-01):** a player whose
SECONDARY position is C satisfies the required backup-catcher slot for roster legality. This RELAXES
the canonical `rosterConstruction.ts` (JK-confirmed 2026-06-30), whose header + `isLegalRoster` count
primary-C only ("a second primary-C") and whose `RosterSlotPlayer` shape carries no secondary
position. Strategy caveat JK stated: secondary-position ratings are NERFED in play unless the player
has the level-3 UTILITY trait (rare) — so the advisor should treat the slot as legally filled but may
surface a quality/strategy note. **OPEN SUB-QUESTION (surfaced to JK, not yet ruled):** does the
secondary-position relaxation extend to the eight STARTING field spots, or only the backup-C slot?
(Fable's recommendation: starting eight stay primary-only per the confirmed module; only backup-C
relaxes.) Consumers to update once ruled: `rosterConstruction.ts` (shape + rule + header),
FABLE-C1's own_need model, the in-season enforcement ticket, the advisor/market need logic.
**Builder verification note:** confirm the secondary-position field + the UTILITY-trait nerf
exemption actually exist in the player data model before wiring (don't assume — deep-dive rule).

**Ruling B — conference assignment is v1 league-setup scope (JK 2026-07-01):** when setting up a
league, users must be able to assign each team to a conference. NO division editor in v1. Fold the
conference-editor UI into the S2/league-setup work (it resolves the S1 open question in
`V1_BUILD_STATUS.md`).

## 2026-07-01 — Ruling A EXPANDED (JK, second pass): full roster-legality semantics + Fable's proposed model

**JK's expanded ruling (verbatim-faithful):**
- **Starting eight:** ≥1 player with a PRIMARY position matching each of the 8 field positions
  (primary positions can ONLY be one of the 8; ratifies keeping the starting eight primary-only).
- **Backup catcher:** at least one bench player OR a starter at another position needs AT LEAST their
  SECONDARY position at C.
- **Secondary-position vocabulary:** any specific position, or the groups IF / OF / IF/OF / 1B/OF.
- **Two-way pitchers:** a pitcher with Two Way (IF) / (OF) / (C) can pitch AND cover any IF / OF
  position / catch respectively. A roster with only ONE dedicated position player who can catch is
  VALID if a pitcher has Two Way (C) — risky strategy but must stay viable.
- **Veteran depth heuristic (not stated as legality):** long-time SMB4 users keep ≥2 players able to
  play EVERY position (combining primaries + secondaries across the roster) — why IF/OF is the most
  valuable secondary, with IF / OF / 1B/OF close behind.
- **Pitcher roles:** SP, SP/RP, RP, CP. Mojo drops ONE LEVEL if an SP relieves, an RP starts, or a CP
  enters BEFORE the second-to-last inning. SP/RP swings both ways with NO penalty (a real
  flexibility premium for valuation).
- JK is open to Fable's recommendation on how to construct the bench-position legality logic.

**Fable's proposed legality model (recommended; JK to ratify the hard/soft split):**
- **HARD legality (a roster is illegal without it):** (1) the existing 22 / 13–14 hitters / 8–9
  pitchers / ≥4 startable / ≥4 relievable frame; (2) ≥1 primary at each of the 8 field positions;
  (3) CATCHER DEPTH ≥2: two distinct players who can play C — primary-C, secondary-C, or a
  Two Way (C) pitcher — at least one being the primary-C starter.
- **SOFT (advisor risk tiers, NOT legality):** DEPTH-2-EVERYWHERE — for each of the 8 positions, ≥2
  players who can cover it (primary; exact secondary; group secondaries expand IF→{1B,2B,3B,SS},
  OF→{LF,CF,RF}, IF/OF→both, 1B/OF→{1B}+OF; Two Way pitchers count for their group). Any position
  <2-deep → advisor red WARNING with the secondary-play ratings-nerf caveat (exempt: level-3
  UTILITY). Rationale: JK explicitly wants risky-but-viable builds legal (the Two Way (C) example);
  the depth rule is a veteran discipline heuristic, so it lives in the advisor, while legality stays
  the floor of "fieldable at all."
- **Valuation note for C1/C2B:** SP/RP no-penalty flexibility and coverage-group secondaries
  (IF/OF > IF ≈ OF ≈ 1B/OF > exact) are pricing inputs, not legality inputs.

**Code grounding (verified this session):** `secondaryPosition?: Position` exists
(`playerDatabase.ts:55`) with the full group vocabulary in the `Position` type (`game.ts:9`);
Two Way (IF)/(OF)/(C) variants exist in the trait engine (`traitCandidateBuilder` tests); role-misuse
mojo penalties exist (`subRecommendations.ts:169-171` — ROLE_MISUSE_MOJO_PENALTY). **Two verify
items for the builder:** (a) `rosterConstruction.ts`'s `RosterSlotPlayer` carries neither
secondaryPosition nor traits — the shape must widen; (b) the code's CP penalty keys on "CP starting"
(`!enteringInRelief`) which is CRUDER than JK's "enters before the second-to-last inning" — flag for
a GameTracker/mojo verification pass, do not silently change.

**Ruling 2 clarification (JK, same message):** the GM sets per-position priorities/player-type
preferences in the TEAM-SETUP UI BEFORE the Assistant GM generates the initial draft boards +
player rankings by position. Confirmed compatible with the ratified plan (the S2 per-league store
holds the inputs; C1 consumes them; C4 surfaces them; the Move-2 taxonomy design session follows
the market brain, with SIMPLIFIED priorities as the v1 fallback).

## 2026-07-01 — RATIFIED: the two-tier legality model + JK's expanded Assistant-GM brain requirements

**RATIFIED (JK: "ratify"):** Fable's hard/soft legality split from the 2026-07-01 Ruling-A-expanded
entry is now canon — HARD legality = 22-frame + 8 primaries + catcher-depth-2 (counting secondary-C
and Two Way (C) pitchers, ≥1 primary-C) + pitcher minimums; the veteran depth-2-everywhere rule =
SOFT advisor warning tier, never a block. JK also confirmed ("correct") the CP mojo-timing
discrepancy finding (code punishes CP *starting*; the rule is CP entering *before the second-to-last
inning*) — parked for a GameTracker/mojo verification pass.

**JK direction (same message) — the Assistant-GM brain's success criteria (expands C1/C3 scope):**
1. **Constructibility proof:** prove rosters CAN be built within the salary caps across ALL 24
   archetypes while staying TRUE to the archetypal identity (not just value-equal). Caveat JK
   states: the 24 are value-equal per the IV engine only; fielding is KNOWN-undervalued by IV; true
   sim-balance is unprovable without an SMB4-logic sim, so the IV engine is the best equality proof
   available — treat parity as unproven from a roster-construction standpoint.
2. **Pool→archetype draftability ranking (one click):** for a given draft pool, rank-order the
   archetypes' draftability; UNDRAFTABLE archetypes are marked ineligible for that league; the rest
   ranked best→worst fit.
3. **Archetype→pool extraction (one click, reverse direction):** select the archetypes desired
   eligible for a league → the engine EXTRACTS a draft pool from a much larger source set (e.g.
   240+ from 1000+) that supports them. (Elevates the auto-curate line that existed in DRAFT
   CONTRACT 3 but was dropped from FABLE-C3's final text — now first-class.)
4. **Live private draft boards:** the Assistant GM maintains dynamic draft boards updating in real
   time during the draft (GM's eyes only), tracking salary-cap + luxury-tax implications as bids
   rise and as players come off the board (on-board or off-board).
5. **The dependability guarantee (the point of it all):** the GM must NEVER be stranded unable to
   finish a complete, legal roster aligned with their chosen archetype. Uniquely intelligent AND
   dependable — strategic fun without the stranding failure mode.

**Fable's planned response (design-level, logged for the record):** the draftability RANKER
(uncontested form) folds into FABLE-C1's all-24 constructibility proof (same builder, run per-pool);
the pool EXTRACTOR becomes a small follow-on Fable ticket (C1B) before the market model; FABLE-C3
later upgrades both with contention-aware completion probability + shill count + FS-3. A
fielding-sensitivity ROBUSTNESS SWEEP (re-rank draftability with fielding IV scaled up ~1.15×/1.3×,
report rank stability) addresses the known fielding undervaluation without an SMB4 sim. Four scope
questions surfaced to JK (cutoff philosophy, contention staging, extractor scope/fairness, picker
gating) — answers to be logged when ruled.

## 2026-07-01 — Draftability/extractor rulings (JK, four-question round)

- **Contention staging: TWO-STAGE ratified.** The one-click draftability button ships on uncontested
  feasibility first; the contention-aware completion-probability layer is added when the market model
  (C2B/C3) lands. Until then, the RESILIENCE buffer (below) is the explicit hedge for "a rival
  snipes your key player."
- **Picker gating: LOCKED-WITH-REASON ratified.** Ineligible archetypes show grayed-out with the
  plain cause (e.g. "this pool can't field it"); they cannot be picked for that league.
- **Ineligibility definition: OPEN — JK raised the single-point-of-failure problem** (a legal+
  affordable roster that depends on winning ONE specific player is not really draftable) and
  proposed tax-based flags (no-tax-needed = green; tax-required = flag) and/or requiring X
  solutions under the cap + X solutions over-cap-but-under-max-tax. Fable to propose the concrete
  buffer/robustness metric (see next entry when ruled).
- **Extractor: MLB+FARM BALANCED ratified, CONDITIONAL on an architecture change JK pre-approved:**
  farm prospects are today generated AFTER the MLB draft; to extract both pools in one click,
  prospect GENERATION MOVES EARLIER into the league-builder/extraction step, with generated
  prospects HIDDEN (GMs see only the grade distribution for pool validation — consistent with the
  standing hidden-vs-revealed rule: scout grade/range only until call-up). Any code assuming
  post-MLB-draft generation timing must be rerouted when this lands (C1B/C3 scope).

## 2026-07-01 — RATIFIED: the snipe-test draftability formula (JK: "yes on the snipe-test formula")

Deletion-resilience is canon for the draftability verdict: build the archetype's best identity-true
roster → ban the players it leaned on at scarce/boosted positions → rebuild, repeated (K successive
successful rebuilds, capped ~3). Verdict bands (defaults §16-tunable): **GREEN** = ≥2 no-tax builds;
**YELLOW** = buildable but fragile (K<2) OR tax-required, shown with the named reason on the card;
**LOCKED** = cannot complete a legal roster within max tax. Ranker sorts by (band, K,
identity-embodiment margin, tax headroom). The snipe test doubles as the pre-market-model contention
hedge (two-stage ruling). Full formulation: FABLE_C1_DESIGN_2026-07-01.md §2 D7. C1 is now
zero-open-questions.

## 2026-07-01 — Browser sign-off DEFERRED (batched) + auditor topology for the Fable math builds

- **Wave-0 browser sign-off: DEFERRED, not waived (JK):** JK cannot meaningfully click through the
  assembled app yet — the draft flow is a mixed legacy-8-bit/new-soft UI, the hub is unreachable
  without a full draft, and the post-draft FRANCHISE-SETUP surface carries obsolete legacy
  rules/quirks. Per the batched-browser-verification convention: the engineering gate (build +
  suite + byte-identical L-SIM) stands as the ADOPTION evidence; the full
  league-setup→draft→hub click-through is logged BROWSER-VERIFY OUTSTANDING, batched to after the
  v1 setup/draft surface is built (post-C4). Browser sign-off remains the sole real-world
  ACCEPTANCE gate — batched, never waived.
- **Missing-spec flag (JK):** the UI-change/league-rule specs from JK↔Opus conversations over the
  last week (franchise-setup rework) may not be fully captured in spec-docs — a DEDICATED
  spec-recovery/design session on the league-setup/franchise-setup surface is queued after the
  current priorities. Until then: no Codex UI work against the legacy franchise-setup surface.
- **Auditor topology for FABLE-C1/C2B (Fable's call, JK delegated):** Opus stays AUDITOR-OF-RECORD
  (independent gate rerun + L-SIM + commit). ADDED: a Codex cross-model ADVERSARIAL REVIEW pass on
  the C1 and C2B diffs before Opus's gate. Rationale: builder≠auditor holds either way (Fable
  builds), but Fable and Opus share a model family — the ratified decorrelation lesson cuts the
  other way when Claude is the builder, so Codex supplies the different-blind-spots screen on the
  novel math while Opus keeps the practiced gate/commit machinery. C3 gets the Codex pass only if
  C1/C2B findings warrant.

## 2026-07-01 — Ruling A clarification 2 (JK): pitcher primaries are EXACTLY {SP, SP/RP, RP, CP}

- **No pitcher may carry 'P' (or 'TWO-WAY') as a primary position.** Two-way is a TRAIT on a
  pitcher-first player, not a position: a two-way player counts toward the PITCHER minimums per
  their primary (SP/SP-RP/RP/CP) AND toward the catcher minimum when the trait is Two Way (C).
  (JK permits, without requiring, primary-SP + secondary-RP as an alternative SP/RP representation —
  NOT adopted; the single 'SP/RP' label stays.)
- **Code reality (evidence):** `franchisePlayerProfileEdit.ts:14-16` offers 'TWO-WAY' (and 'DH') in
  FRANCHISE_PROFILE_PRIMARY_POSITIONS — now-invalid states per this ruling, same legacy surface as
  the recon's DH landmine. **Follow-up ticket (Wave-1 cleanup, out of C1 scope):** purge
  'TWO-WAY'/'P'/'DH' from assignable primaries; map imported SMB4 two-way designations to
  (pitcher primary + Two Way trait); audit existing saved players.
- **C1 consequence:** `rosterNeed.ts`'s unknown-role handling (audit F2) is DEFENSIVE handling of
  invalid data only — credit no staff minimum, still occupy pitcher headcount. Well-formed two-way
  arms already count toward both minimums via their primary role + canCover('C'), exactly per this
  ruling.

## 2026-07-01 — R2-1 ruled: DOCUMENT-AND-DEFER (JK; known v1 limitation)

Audit round-2 finding R2-1 (identity BUILDER can't credit a Two Way (C) arm for catcher depth AND a
bullpen slot simultaneously — a separate backup-C body is reserved — so exactly-enough-arms pools can
show a FALSE LOCKED on the advisory board): JK ruled the fix is not worth builder time now.
Confirmed semantics that made deferral acceptable: the two-way arm is ALWAYS counted as a PITCHER
per his primary (never as a position player), and `isLegalRoster` correctly credits him for both
jobs — the law is right; only the builder's slot layout under-credits, advisory-only. Documented as
a KNOWN v1 LIMITATION; revisit if C3's extractor pools trip it. R2-2 (forced no-bid filler missing
the strand guard) is FIXED with a regression pair in `rosterNeed.test.ts`.

## 2026-07-01 — FARM-POOL ruling (JK): no archetype guarantees; ~50% fit-targeting; fair supply

The farm pool does NOT meet archetype needs the way the MLB pool does. JK: unpredictability is the
point; teams have NO archetype-specific roster requirements at the farm level — each team just
drafts 10 prospects from a FAIR amount of options. The scout targets archetypes but nothing
guarantees them; aim to meet archetype-fit at ROUGHLY 50% (a §16-tunable) so good matching options
exist, accepting that the lower talent level + weaker distribution make tight fits unlikely anyway.
→ Farm extraction semantics (for the farm-generation relocation ticket): fair-supply sizing
(options per team for 10 picks), ~50% archetype-fit targeting, NO balance/roster guarantees, no
farm legality verification against the 22-man law. The C1B engine's farm seam now carries a LOUD
guard citing this ruling (audit C1B-3) instead of silently applying MLB rules.

Also JK (same message): shill-count sizing for 4-human and 8-human leagues + the end-checkpoint
(draft ends when all non-shill rosters are full) + sandbagging risk — CONFIRMED as C3's core
questions (the sim-backed shill recommendation is contracted there); Fable to provide the
analytical frame now, C3 to prove the numbers.

## 2026-07-01 — JK (C2B kickoff): the LIVE auction solvency floor is BROKEN — teams cannot finish the draft

JK, greenlighting FABLE-C2B: "the current auction floor logic is broken, which disallows teams to
finish the draft every time." This upgrades audit AUC-2/RCI-04 from "crude/imprecise cap" to a
LIVE COMPLETION-BLOCKING DEFECT. The suspect mechanism (to be confirmed during the C2B build):
`auctionMaxBid` reserves a generic `(slotsRemaining−1)×minSalary` + a phantom `projectedTax`,
but the true cost of finishing is each remaining lot's OPENING ASK (`reservePriceCurve(pctile)×iv`,
which exceeds `minSalary`) at each still-required position — so the cap is simultaneously too
permissive early (lets a team spend past the point where it can still afford real remaining
players) and too restrictive late (prices teams out of every remaining lot, forced-filler skips
them, slots strand, `isAuctionComplete` never satisfied / pool exhausts with open slots).
→ C2B's completion-based floor (cheapest players ACTUALLY LEFT per remaining required position,
per C1's position model; phantom tax reservation stripped) is a BUG FIX to live behavior, not just
an accuracy upgrade. C2B must include a root-cause repro (a regression test demonstrating the
un-finishable draft under the old floor, finishing under the new one).

## 2026-07-02 — C2B AUDIT VERDICT + JK rulings: BLOCK → fix-now round, then commit

Opus audit of the FABLE-C2B diff (cross-model Codex pass + independent Opus 8-lens Workflow with
per-finding skeptic verification + Opus full read + the gate). Full record:
`spec-docs/C2B_AUDIT_VERDICT_2026-07-02.md`. Gate independently confirmed GREEN: build exit 0; full
suite zero-new-reds (the characterized pair only; smoke-fixture solo-passes 4/4); calibration in the
85-90% window (value aggregate ≈0.872), matching Fable's numbers. The chartered bug fix (completion
floor + 6-site rewire) is CORRECT on adversarial attack — it fixes the common-case defect that blocked
every draft.

**ONE residual defect (F1, must-fix):** the completion floor's arm selection (`cheapestArmPicks`) is
coverage-blind — it picks required rotation/bullpen arms by price only and never prefers a Two-Way(C)
arm. In a narrow endgame (a team one catcher short whose ONLY coverer is a Two-Way(C) arm that is also
a required arm, with tight slots), it returns spurious INFEASIBLE though a legal 22 exists → falls back
to the scalar reserve, which UNDER-reserves (minSalary < real opening asks) → allows an overspend that
strands the roster and re-opens the "draft can't finish" bug on a narrow trigger. The builder's
safe-direction proof (design §6b item 7) is one-directional and invalid: it proves no false REJECTION
but the actual hazard is the too-permissive under-reserve. Found by the Opus deep review (3 independent
skeptics confirmed); MISSED by the single Codex pass — the multi-lens adversarial approach earned its
keep here. Plus three prediction-layer polish items: F2 own_need over-rates off-role pitchers
(class-blind `pitcherNeed`); F3 bid-vs-pass can suggest legality-blocked targets; F4 the internal
`modeledSecondPrice` could equal a single rival's ceiling (Opus skeptic refuted it as a live leak —
model's own inference, never displayed — but see ruling 2).

**JK RULINGS (2026-07-02):**
1. **Fix the strand corner NOW before committing** (not document-and-defer). Precedent for defer existed
   (C1 R2-1 Two-Way(C) builder limit was deferred), but JK chose fix-now because it is the charter's
   core promise ("the draft must finish").
2. **Fold the prediction-layer polish (F2/F3/F4) into the same fix round** — including walling
   `modeledSecondPrice` off the GM-facing type entirely so a future draft screen can never display it
   (keep it for the calibration harness via a separate/internal channel).

→ FABLE-C2B-FIX contract routes the fix to Fable (builder≠auditor). Opus re-audits the delta (Codex
re-pass + Opus verify), runs the gate + L-SIM, then commits branch-only. Then FABLE-C3.

## 2026-07-02 — FABLE-C3 completion-guarantee decisions — **ALL THREE RATIFIED BY JK (same day)**

JK ratified 1 (pool-aware strand law), 2 (exhaustion cleanup backfill), and 3 (shill win cap),
with one rider on 3: **the cap must be factored into pool-size requirements/recommendations** —
CONFIRMED already true as built: `poolDemandModel.targetSize` adds exactly `winsPerShill × S`
bodies, and the live Draft Setup sufficiency gate's hard floor is `teams×22 + winsPerShill × S`
(`evaluatePoolDemandSufficiency`); the cap constant and the sizing budget are the SAME
`SIZING_TUNING.winsPerShill` number by construction, so they cannot drift apart.

Original decision record (as flagged for ratification) ↓

The C3 sizing sweep exposed a cascade of real full-CPU draft-completion failures (each fix
uncovered the next; full arc in `FABLE_C3_DESIGN_2026-07-02.md` §5b). Three of the fixes are
DESIGN DECISIONS beyond the contract's letter, applied under its charter ("the draft must
finish"), and need explicit ratification:

1. **POOL-AWARE STRAND LAW (affects ALL bidders incl. humans).** The count-only strand guard
   assumes need-sharing players exist in the pool; when they don't, a team can legally buy itself
   into a roster NO remaining player can complete (canonical wedge: one catcher, no Two-Way arm,
   one open slot, two needs). `bidWouldStrand` now also requires a verified-legal completion to
   exist from the players ACTUALLY left. Rationale: spec §6's floor "fires only at true
   impossibility" — pool-impossibility IS true impossibility. Trade-off: a heuristic
   spurious-infeasible would wrongly block a bid (the completion builder is two-attempt +
   law-verified; the F1-audited corners are covered), flagged for adversarial attack.
2. **EXHAUSTION CLEANUP BACKFILL (bends one-chance ONLY in the otherwise-failed state).** Pool
   empty + a completing team unfilled used to be a silently broken draft (the 22/10 launch
   validation throws later). `advanceLot` now backfills unfilled teams from the PASSED lots at
   LEAGUE-MINIMUM salary (zero-demand players; floor price; affordable by construction since the
   ceiling always retains minimum-salary money per open slot).
3. **SHILL WIN CAP (additive `shillMaxWins`, default 10 via `SIZING_TUNING.winsPerShill`).**
   Sweep-measured: uncapped end-checkpoint shills hoard ~21 wins (a whole roster). The cap keeps
   shills price-pressure, not competing franchises, and pool sizing budgets cap×S extra bodies.
   HONEST SIM FINDING attached: capped shills DON'T materially raise real-team prices (±4%) in
   CPU-vs-CPU play — the shill count is a product-feel choice; completion-safe at S=0..4.

Also in the round (contract-scope, no ruling needed): the end-checkpoint (`nonCompletingTeamIds`,
additive config — JK's queued question, now implemented), opt-in need-aware CPU bidding + exact
class-scarcity grabs + anti-starve politeness (humans never blocked), the load-bearing pass-out
guard, the demand model/table, per-archetype completion outlooks surfaced in Draft Setup, and the
FS-3 launch regression. Sweep gate: S=0..4 × 20 runs at target sizing = zero shortfalls; all 24
archetypes ≥ 0.9 legal-completion at the recommended config.

## 2026-07-02 — C3 AUDIT VERDICT: BLOCK (1 CRITICAL + 3 MAJOR + 1 MINOR) — fixes routed to Fable, NOT yet dispatched (JK holds)

Opus audit of the uncommitted FABLE-C3 diff (builder≠auditor). Method: an independent Opus 7-finder
multi-lens Workflow (each candidate re-verified by 3 refuters) + Opus own full read + the gate. The
cross-model Codex pass HUNG on the model API for 30 min and was watchdog-killed (rc=137) with zero
analysis — documented, not hidden. Full record: `spec-docs/C3_AUDIT_VERDICT_2026-07-02.md`.

**Gate independently confirmed GREEN** (build exit 0; targeted 132/132; sweep 0-shortfall S=0..4 with
the ±4% honest inflation reproduced; C2A/C2B calibration byte-stable; full suite 2 failed/8682 passed =
the characterized pair, zero new reds). **L-SIM: orthogonal, documented not run** (import-graph proof:
L-SIM imports no auction modules; freeze imports only unchanged/type symbols; rosterNeed diff additive-
only; the auction→freeze seam is covered by the full-suite draft-pipeline integration + the FS-3
regression). The automated gate is green but structurally cannot catch F1-F4 (the sweep runs the CPU
path with the opt-in need-aware politeness the LIVE hook does not pass).

**The chartered work is directionally right.** Pool sizing reproduces the C1B ~202 evidence exactly; the
end-checkpoint, the shill cap, and — critically — the **pool-aware strand law (the #1 flagged risk) are
CORRECT** (the strand law was cleared by an 11M-shape fuzz vs a brute-force legality oracle: zero
spurious-infeasibles). The defects are in the cascade's ECONOMICS + force-fill affordability + one UI gate.

**CONFIRMED DEFECTS (each survived 3 refuters; each crux re-verified by Opus):**
- **F1 CRITICAL — the ratified exhaustion backfill's affordability-by-construction is FALSE in live MLB.**
  Live MLB opening asks are `reservePriceCurve(0.5–0.7)×iv` with NO `flatReserveFloor` (only farm floors),
  so cheap players' asks fall BELOW `minSalary=1666.49`. The enriched `sessionBidCeiling` reserves at those
  sub-minSalary asks (not min'd against the minSalary scalar), so a team can hit pool-exhaustion with
  `budgetRemaining < openSlots×minSalary`; the backfill (priced at minSalary) then skips it → strand →
  `validateV1RosterHandoff` throws at launch — the exact break the backfill exists to prevent. (The ratified
  DESIGN intent stands; the affordability PROOF was invalid and the pricing/reserve must be reconciled.)
- **F2 MAJOR — `loadBearingTeam` Criterion 1 force-fills without the affordability guard Criterion 2 has**
  → force-sell at openingAsk can drive a team's budget negative (tier-cap violation).
- **F3 MAJOR (partly pre-existing; C3 widens it) — a live CPU `bid-strands-roster` rejection throws via
  `transitionOrThrow` and HALTS the auto-advancing draft** (no pass-fallback; the sweep harness has one).
- **F4 MAJOR (bounded) — the Start-Draft sufficiency hard floor (`baseSlots+expectedShillWins`=196 at
  T=8/S=2) green-lights a pool the design's OWN sweep proves strands 20/20**; the model's `feasibilityFloor`
  (202)/`targetSize` (264) are ignored by the gate. Bounded by a downstream 220 re-gate. (Threshold has a
  product nuance — flagged for JK.)
- **F5 MINOR — stale backfill comment ("opening-ask prices" vs the actual minSalary pricing).**

**ROUTING:** `FABLE-C3-FIX` contract written in `PROMPT_CONTRACTS.md` (F1 must-fix + F2/F3/F4/F5).
Per JK (2026-07-02): **do NOT dispatch Fable yet** — JK is handing the findings to Fable for review in a
separate thread first. Nothing committed (BLOCK). The three ratified C3 design decisions are NOT reversed;
F1 is an implementation/pricing bug inside the ratified backfill.

## 2026-07-02 — C3-FIX round-2 delta audit: F1-F5 CORRECT, but F4 left INCOMPLETE (F6) + 2 minors — 2nd small round to Fable, then commit

Opus re-audit of the FABLE-C3-FIX delta (builder≠auditor). Method: Opus own read + a 4-finder adversarial
delta Workflow (3 refuters each) + a Codex cross-model delta re-pass (completed cleanly this time, rc=0).
Full record: `C3_AUDIT_VERDICT_2026-07-02.md` "ROUND 2".

**The 5 prior fixes (F1-F5) are all CONFIRMED CORRECT** (triangulated: Opus read + Codex CLEAN + Workflow
attackedAndHolds). The round-1 CRITICAL (backfill affordability) is genuinely closed — the minSalary reserve
floor holds inductively across every acquisition path, and the PASSED-vs-AVAILABLE crux is closed because the
backfill reprices every pick flat at minSalary. Gate re-run GREEN (targeted 147/147; sweep 0-shortfall S=0..4;
C2A/C2B byte-stable; full suite 8692 passed / 2 characterized fails, smoke solo 4/4 → zero new reds; L-SIM
orthogonality reconfirmed).

**New from the delta pass (Opus-verified):**
- **F6 MAJOR — the F4 gate reconciliation was left INCOMPLETE.** `LeagueBuilderAuctionDraft.tsx:866` (the live
  auction-start gate) is the sole remaining caller of the OLD `evaluatePoolSufficiency`; the two setup screens
  were migrated to `evaluatePoolDemandSufficiency`. At S≥3 the auction page over-demands (242 vs 232) → blocks a
  pool the setup screens green-lit — the exact inconsistency F4 targeted, left on a third gate. Bounded (S≥3 is
  off the default S=2 path; class-feasible; F1 backfill prevents a launch throw). FIX: migrate `:866` to the same
  demand-model call.
- **F7 MINOR — the F2 regression test doesn't exercise the F2 guard** (it hits the pre-existing
  `selectForcedFillerTeam` guard because `remainingPool < totalOpenSlots` at Lot 2); F2 code is correct but
  untested + a misattributed comment. FIX: add a real Criterion-1 test.
- **F8 MINOR — dead `canCover` import** in `auctionMarketModel.ts:25` after the relocation. FIX: remove it.

**ROUTING:** `FABLE-C3-FIX-2` (F6 must + F7/F8 minor) written in `PROMPT_CONTRACTS.md`, `high` effort (small,
mechanical). Per JK's standing directive this round, HELD for JK to hand to Fable in the other thread — not
auto-dispatched. Nothing committed. After the small round: Opus re-runs the gate + a light delta check, then
commits branch-only on JK's go. NOTE: F1-F5 are locked-correct — do not reopen them.

## 2026-07-02 — JK RULINGS: post-C3 direction (shills, UI mandate, Asst-GM rescope, chemistry/potency, personality/captain, taxonomy)

1. **Shill default = 2** for an 8-team league (accepting the C3 sim finding that shills are
   texture, not a price lever; completion-safe at 0-4). `SIZING_TUNING.shillRecommendationByLeagueSize`
   already carries 2 at size 8 — no change needed.
2. **PRIORITIES:** Franchise mode / draft / living season is the app's #1 priority; the ALMANAC is
   #2; EVERYTHING else is back-burner and must not be prioritized over these.
3. **UI/UX MANDATE — Fable is the UI boss** with total freedom across league setup → team setup →
   draft setup → draft → handoff-to-season → Fenway hub: kill leftover UI that doesn't serve the
   franchise experience; fix redundancies (e.g. team name on banner AND tabs; duplicated
   standings); one coherent premium look and UX end-to-end; the GameTracker is the design
   REFERENCE (its UI is SET — do not change it); anything tutorial/informational hides behind the
   help button; every on-screen element must earn its place; the companions (Assistant GM, scout,
   beat reporter) are the helpful through-line. Known gaps JK named: hub missing recent builds +
   partially unwired; CSV schedule upload → live schedule/Play Ball unverified; no Asst-GM surface
   yet (new build).
4. **ASSISTANT-GM RESCOPE (intelligence-first):** the FEATURE is advice quality that stays right
   again and again — NOT one-click enforcement. GMs may make manual roster changes so long as UI
   exists for it; do NOT wire legality blocks into every button (only where trivial and already
   part of the analyzer logic that keeps advice correct). JK is not concerned about users breaking
   rosters in v1. → The queued in-season legal-roster enforcement ticket is RESCOPED to: analyzer
   adopts the canonical rules (never advise an illegal move) + manual-move UI exists.
5. **CHEMISTRY / TRAIT-POTENCY IN ROSTER INTELLIGENCE (new math requirement).** VERIFIED ABSENT
   2026-07-02: zero chemistry awareness in the builder/market/pool/shill intelligence stack;
   potency exists only in ivEngine and runs dormant at L2. Required: team chemistry counts →
   potency tier (L1/L2/L3) → marginal player value, so a player who tips a team L1→L2 or L2→L3 is
   worth a premium over his statistical twin — EVERYWHERE roster-construction intelligence lives
   (pre-draft board, draft/auction advice, in-season analyzer). Single-math: one shared
   tier-delta calculation feeding all consumers.
6. **PERSONALITY VISIBILITY + HIDDEN-MODIFIER TIMING:** the Asst GM sees PRIMARY personality only
   (it influences development/regression and captain selection); hidden modifiers stay hidden
   from it. Hidden modifiers should be GENERATED AND APPLIED when the draft roster/pool is
   generated (today they're generated at season-freeze; generation is deterministic per player id,
   so moving the point earlier is consistent). Exact timing to be settled in the ticket.
7. **CAPTAIN SELECTION — age tilt:** add a small five-tier age-curve tilt to captain odds;
   charisma + loyalty remain the main drivers (today it's loyalty+charisma only — verified).
8. **PLAYER-ARCHETYPE TAXONOMY (Move 2)** was blocked by the market brain — now unblocked and
   confirmed in the forward plan (feeds C4's ROBUST priority dropdowns).

## 2026-07-02 — UX NORTH STAR authored (Fable, under the ruling-3 UI mandate): the binding design rulings

`spec-docs/UX_NORTH_STAR.md` is now the BINDING design bible for every UI build on league
setup → draft → handoff → Fenway hub (C4-B/C execute against it; §9 is the conformance
checklist every UI diff self-reports). Top-line rulings made under the delegated authority
(evidence: 4 code-read audits, 2026-07-02):

1. **The design language is the GameTracker's ACTUAL idiom** — "chalk-and-ash Fenway
   scoreboard" (Moms/Tox Typewriter machine-vs-human voice split, chalk cream on field greens
   over ash tan, brass-gold accent semantics, hard offset shadows, chalk texture, team colors
   as tints) — NOT the pixel/SNES style, which the finished GameTracker deliberately overrides.
   Two zones: the Cartridge (AppHome only, stays SNES) and the Ballpark (every other journey
   screen converges on the chalk-and-ash language). AuctionStage's pixel lot names are ruled in
   as the one "jumbotron marquee" exception.
2. **IA rulings R-IA1..7:** home links to the League Builder (Builder demoted to a Lab tab
   inside it); the two draft-setup screens merge into one (the live screen named "Preview" gets
   renamed; seat/GM names must persist — C4-A spine dependency); draft rooms never ask setup
   questions (seed/CPU/increment inputs leave player screens); the farm auction folds onto
   AuctionStage (highest-leverage fix — the stage already implements the farm fog); snake
   dead-ends get completion CTAs; FranchiseLensHub is confirmed the destination hub (aligns
   C4-C); all `/__preview/*` routes gate behind DEV (~17 dev screens currently ship to players).
3. **Companion pattern:** at most ONE voiced advisor per screen (auction's three overlapping
   voices consolidate under the hired scout); voices are named characters (the lens' named
   reporter with mood is the standard); the lens' `?`-toggle help layer is the app-wide pattern
   for ALL tutorial/mechanics text; §6 bans engineering vocabulary from player-facing copy
   (≥15 verified leaks listed).

Not unilaterally executed: everything lands via the ticketed builds (quick-wins / shared-kit /
C4-B / C4-C per §8). JK's browser sign-off remains the closing acceptance gate.

## 2026-07-02 — FABLE CHEM-POTENCY ticket (#4) design decisions — for JK ratification

Implementing rulings 4-6 (design: `FABLE_CHEM_POTENCY_DESIGN_2026-07-02.md`). Three specifics
were mine to choose; JK may retune any of them:

1. **The tipping premium is INTELLIGENCE-ONLY, priced in exact IV dollars.** New shared engine
   (`chemistryTierValue`) computes TeamLift (a crossing re-tiers every matching-family trait on
   the existing roster, priced per holder through the IV engine's own curves via a new additive
   `traitPotencyDollarDelta` export) + OwnContext (the candidate's own traits repriced from the
   L2 assumption to the joined roster's real tier). The economy stays frozen at L2 — IV, salary,
   market prediction, CPU/shill bidding, trueValue all byte-stable (oracle + calibration + sweep
   gates re-run as proof). Premiums are uncapped and can exceed the tipper's own IV — game-true
   (the 6→7 crossing is "enormous" by design). Send-down ripple (`chemistryRemovalImpact`)
   included — the research spec's unmodeled gap, now modeled.
2. **Hidden-modifier timing (ruling 5) resolves to POOL-LOCK, not a new generation system.**
   Grounding showed pool-time generation already existed on both major paths; `lockLeaguePool`
   now runs the same league-scoped axis regen, making the lock the guaranteed generation point
   for BOTH draft formats. Auction leagues: byte-identical values (same seed — the auction-init
   regen becomes an idempotent re-stamp). Snake leagues: deterministic value drift (league-scoped
   seed replaces the bare-id freeze backfill). The freeze backfill survives as a no-op guard.
   The §5 open decision (pool-creation vs league-creation) closes with NO JK fork needed.
3. **Captain age tilt (ruling 6) bands:** ≤22: −6 · 23-26: −2 · 27-30: 0 · 31-34: +4 · 35+: +6 —
   monotonic seniority, 12-point span vs the 0-200 loyalty+charisma scale (breaks near-ties
   toward the veteran; cannot override a clear leadership gap). Living-season spec amended.
   Also executed: the standing 2026-06-22 ruling correcting the farm-scout fit tiers 4/8 → the
   canonical 3/7 (single-math delegation to derivedTraitPotency).

**Deliberately NOT wired (named consumers per the handoff):** the auction-advice + pool-panel
rendering belongs to C4-B (screens execute against the UX north star); the analyzer wiring
waits for CODEX-ASSTGM-LEGALITY to land (same-file collision), then a one-line follow-up.

## 2026-07-02 — ASST-GM product rulings (JK) + the roster-brain v1/v1.1 split (planning session)

**JK rulings (binding):**
1. The Assistant GM is HIRED at the post-draft staffing screen (a named companion like
   manager/reporter/scout).
2. Delivery: in-season PULL-ONLY (click-driven insights: roster intelligence, moves, lineup
   optimization vs the upcoming starter) — EXCEPT the auction room, where he reacts to every
   lot event but whispers only to his own GM: the per-seat pass-the-device perspective, with
   his insights + private draft board/rankings behind a click-to-reveal.
3. v1 advice scope: roster moves + scorecard + lineup-vs-upcoming-starter + farm call-up
   candidates. Trades/fatigue/slump-aware/pushes = v1.1.
4. MOCK-DRAFT TOGGLE CUT from v1 — replaced by RUN-IT-BACK (re-run the draft, same league +
   pool + settings; franchises are deep-copy snapshots and are untouched). NO draft save
   slots — franchise slots are the permanent record; the league holds one draft state.
5. Two-Way trait counts toward BOTH cohorts where ratings qualify (Opus-verified undercount,
   not an exploit) — fold into the v1.1 economy re-calibration batch, not a standalone fix.

**Roster-brain sequencing (locked with JK):** v1 = payload contract → wire chemistry+market
brain (C4-B) → handedness balance (advice-only). v1.1 = ONE economy re-calibration campaign
riding C5: flexibility-as-value (completion-floor deltas) + Two-Way cohorts + the IV gaps
(scarcity multipliers at 1.00, throws unpriced, live-path potency at L2) + the full composed
synergy score. Scorecard = FIVE LIGHTS (SHAPE/IDENTITY/CHEMISTRY/BALANCE/BUDGET), composed
not monolithic — full design in `spec-docs/ASST_GM_DESIGN.md` (binding for C4-B slice 2 +
C4-C), incl. the verified gaps: CONFERENCE-SURFACE (model built, editor missing) and
STAFF-CARRY-THROUGH (hired staff never reach the franchise).

## 2026-07-02 — TAXONOMY rider (JK): the classifier consumes the WHOLE player profile

The player-archetype classifier's inputs are the full profile — primary AND secondary
position (the combo is an input, e.g. SS/2B vs SS-only are different assets), bats/throws
handedness, ratings, traits, arsenal, age — not just ratings + traits. Design consequence
(Fable): archetype = a tool-SHAPE class + orthogonal PROFILE TAGS (handedness incl. switch
and LHP, flexibility/utility from the position combo, Two-Way, platoon traits, age band)
rather than multiplying classes combinatorially — menus stay small, labels compose
("Lefty glove-first SS/2B").

## 2026-07-02 — TAXONOMY riders 2+3 (JK): personality tilts at key roles + exhaustive menu

1. **Personality tilts:** GMs can specify positive/neutral/negative personality preferences at
   key roles ("nobody wants a Droopy or Timid SP1 or starting SS"). Design (Fable): a NEW
   personality-VALENCE tag over the 11 visible personalities (proposed: positive =
   Competitive/Tough/Spirited/Disciplined · neutral = Crafty/Scholarly/Relaxed/Jolly ·
   negative = Egotistical/Timid/Droopy — MAP PENDING JK RATIFICATION), distinct from the
   free-agency salary-demand modifiers; per-slot tilt = a soft preference the board/builder
   weight, never a hard filter (thin-pool anti-starve); visible primary personality only
   (ruling-5 boundary intact).
2. **Exhaustive menu:** the shape menu must exceed the generator's 17 so GMs can get specific
   — Fable's design opens the sweep at 19 hitter + 12 pitcher shapes via a systematic
   tool-combination-lattice enumeration (every 1-strong and 2-strong region named where the
   pool has presence; empty regions documented as swept-and-empty; the parity/coverage sims
   prune per position). Full design: FABLE_PLAYER_TAXONOMY_DESIGN_2026-07-02.md.

## 2026-07-02 — CORRECTION (JK): the Personality union is polluted with chemistry types

JK correction to the taxonomy rider above: Crafty, Scholarly, Competitive, Disciplined,
Spirited are CHEMISTRY types; the persisted `Personality` union (11 values) wrongly absorbed
four of them via the legitimate Competitive crossover. **The canonical personality set is 7:
Competitive, Tough, Relaxed, Egotistical, Jolly, Timid, Droopy** (code-verified: the prospect
generator's PERSONALITY_POOL and the FA salary PERSONALITY_MODIFIERS both already use exactly
these 7 — the pollution lives in the type union + the profile editor's 11-value list, i.e.
imported/hand-edited players). Supersedes the valence proposal above; corrected proposal over
the 7: positive = Competitive, Tough · neutral = Relaxed, Jolly · negative = Egotistical,
Timid, Droopy (Egotistical = the flagged judgment call). NEW TICKET: PERSONALITY-CANON
(narrow the union, normalize-on-read for polluted records, fix the editor list, check the
import mapping) — spec in FABLE_PLAYER_TAXONOMY_DESIGN_2026-07-02.md §2.2. Containment: the
lock-time axis regen already re-stamps draft-league players from the canonical 7.

## 2026-07-02 — CORRECTION 2 (JK: "never assume") — personality groups now DERIVED from the engines

JK caught the valence proposal being built from intuition instead of mechanics. The corrected
design reads the grouping off the four in-season systems (morale matrix per-personality
multipliers, fan-morale dampener, relationship clash/compatibility/mentor sets, trait
image-drivers), with file:line evidence in FABLE_PLAYER_TAXONOMY_DESIGN_2026-07-02.md §2.2.
Result — 4 derived groups, which OVERTURN the intuited 3-bucket map: **STEADY** = Tough,
Jolly, Relaxed (the code's own steady/mentor set — Jolly/Relaxed had been mis-bucketed
"neutral") · **FIRED-UP** = Competitive (spiky-positive amplifier, not steady) · **VOLATILE**
= Egotistical (high-variance + clash-toxic, NOT flatly negative) · **FRAGILE** = Timid,
Droopy (mechanically confirmed exactly as JK said). Tilt options: prefer-steady /
avoid-fragile (key-role default) / any / embrace-volatility. Where an engine already defines
a set, the taxonomy derives membership from it (single-math). Lesson written to
SESSION_RULES pending pen ("derive semantic data from mechanics, never intuition").

## 2026-07-02 — JK RULING: DH is not part of the app — eradicate wherever found

Context: the taxonomy build briefly added a DH position menu (accommodating the legacy 'DH'
member in the generator's DraftPosition union) — wrong direction; JK's 2026-06-20 fork ruling
already excluded DH/UTIL from the draft position model. EXECUTED NOW (Fable): 'DH' removed
from TaxonomyPosition + menus + a no-DH pin test added; the generator's affinity lookup
neutralizes a DH input (never drawn; the union member survives only to type polluted legacy
data). SCOPE NOTE (Fable's reading, for JK to correct if wrong): this eradicates DH as a
PLAYER POSITION (draft, taxonomy, profile editor primaries, position multipliers). The
lineup-RULE DH (useDH game setting, lineupWithDH/lineupWithoutDH, GameTracker DH handling)
is a real SMB4 game setting and a different concept — NOT touched. TICKET: DH-PURGE — extend
the standing Wave-1 purge ('P'/'TWO-WAY'/'DH' primaries in the profile editor) to an
app-wide position-DH sweep: the DraftPosition union member + defensive branches,
POSITION_MULTIPLIERS.DH, resolveHitterPosition's DH mapping, any DH primary in imports/UI.
Codex builds, Opus sequences.

## 2026-07-02 — JK RE-SYNC: player archetypes need NO value parity — feasibility-and-feedback instead

JK ruling: player archetypes are the GM's design lever — shapes come in all strengths and
weaker-but-cheaper is the POINT (the price system prices the difference). Only the TEAM
archetypes (a closed competing menu) need parity. The planned S3 choice-parity sim is
DROPPED; replaced by the FEASIBILITY-AND-FEEDBACK loop, per JK's flow: GM sets per-slot
player-archetype targets across the 22 roster spots → the Asst GM calculates whether the
design is satisfiable from the actual draft pool, within budget, honoring the team
archetype's cap identity → if not, plain-language blockers name what's in the way → the GM
adjusts and iterates → once feasible, the Asst GM builds the draft board across the 22 slots
and ranks the entire pool by position against the requested archetypes. S5 rescoped to
"honest highlights" (aligned shapes must verifiably be cheaper under the identity; never
presented as raw value). Design doc §4 updated. The feasibility evaluator is the next build
(Fable): it extends the completion-feasibility machinery (C2B/C3) with design-aware slots.

## 2026-07-02 — JK RULING: two pool-construction modes (league-level toggle) — POOL-FROM-DEMAND + pool-first gray-out

JK ruled the two-mode pool system: **Mode A (design-first):** once every GM locks team
archetype + per-position player-archetype preferences, the engine EXTRACTS the requisite
pool from a much larger uploaded universe (thousands of players) to meet the league's
aggregated designs — user add/subtract edits → lock → each hub re-checks its own design
against the final pool and shows drift. **Mode B (pool-first):** lock the pool, then the
team-setup hubs gray out team archetypes (draftability ranker verdicts) and player-archetype
menu entries (pool presence) that the locked pool cannot support. Selectable per league.
Confirmed design stances: completion is guaranteed, design satisfaction stays COMPETITIVE
(contested asks provisioned with multiplicity, not exclusivity); extraction is machine-side
(no GM sees another's asks); CPU teams get auto-derived designs from their archetypes; the
manual shuttle survives as the edit layer in both modes. Sequencing: Mode B rides C4-B
(wiring on built math); Mode A = the POOL-FROM-DEMAND ticket (Fable design §6 of
FABLE_PLAYER_TAXONOMY_DESIGN_2026-07-02.md; build after the taxonomy polish leg).

## 2026-07-02 — AGE rider (JK-agreed): advice-layer now, economy in the v1.1 batch

Verified: the market brain / draft intelligence is age-BLIND while the (build-dark)
development engine carries a real age-gravity curve (young pulled up, 36+ pulled down;
speed/fielding/arm decay fastest), and an ORPHANED age salary curve (`calculateAgeFactor`,
zero callers) sits in the salary engine. Agreed split: (1) NOW — the advice payload surfaces
age band + a dev-outlook direction note (copy only; ASST_GM_DESIGN §6 updated); (2) the v1.1
ECONOMY RE-CALIBRATION BATCH gains a fourth item: price development runway + reconcile-or-
delete the orphaned age salary curve against the dev gravity (ONE age model, no
double-counting). Batch now = Two-Way cohorts · flexibility-as-value · IV gaps · AGE economy
— one sim campaign riding C5.

## 2026-07-02 — JK RULING (browser look): page ground goes GREEN, not ash — + the designer legality bug diagnosed

Two items from JK's first look at the Draft Room designer (:5199 screenshot):

**(1) Ground color ruling.** The chalk-and-ash flip landed with the page ground at ash tan
(`--ballpark-page-bg #CBB89C`) per the GameTracker reference. JK: "the ash color in the
background is quite distracting; we may want to go with a shade of green instead." Fable
(design authority) concurs and rules: **page ground = the well green `#243028`** — the
darkest value in the existing palette, so panels (`#3d4a42`/`#3d5240`) still lift off it and
recessed wells read as "cut through to the ground" (coherent, no new color invented). Ash
tan stays in the kit as an accent-only token (chalk-adjacent surfaces, never the page
ground). One-line token change in `ballpark-kit.css`; FABLE_C4B_CHECKPOINT §1.1 amended.

**(2) The "FILLS · NOT A LEGAL 22" bug — diagnosed + repro'd (Fable).** JK's design fills
all 22 slots within budget but the verdict says not-legal. Root cause (proven by a minimal
repro, since deleted): `rosterDesignFeasibility.eligibleForSlot` fills the eight field-
position slots by COVERAGE (`canCover` — secondary positions count) while `isLegalRoster`
requires a PRIMARY at each of the eight spots. Cheapest-first ordering + the cost-improvement
pass actively steer toward cheap secondary-coverage players, so the assembled 22 can lack a
primary (repro: both C and backupC filled by 1B/secondary-C bodies; the real catcher left
out) — reporting ILLEGAL even though a legal assembly exists in the same pool. The canned
blocker copy ("most often the pitcher-staff ceiling…") then misleads. Fix design (Fable, to
build on JK go): (a) pos-slot eligibility → primary-position match only (matches both the
legality rule and the design intent of a positional ask); (b) backupC stays coverage-based
(the C slot now guarantees the primary-C for catcher-depth); (c) one tighten-and-retry pass
if final legality still fails on the 8–9 pitcher band (Two-Way(C)-at-backupC + arm-at-SWING
= 10 arms); (d) the legality blocker names the ACTUAL failed rule instead of the canned
guess.

## 2026-07-02 — DRAFT-JOURNEY AUDIT (xhigh, three lenses) + the two ruled fixes LANDED

JK go: build the two known fixes, then audit the whole setup→design→pool→draft→launch
journey on three lenses (seams / intent-conformance / UI truth) at xhigh. DONE, same day:
**Fixes (Fable, built+tested, uncommitted):** the legality-by-construction rebuild of the
design-feasibility solver (primary-only field slots + 10-arms retry pass + explainIllegality
honest blockers + 4 regression tests), the deletion of the designer UI's PRIVATE copy of the
eligibility rules (now imports the engine's `countEligibleForAsk` — one rule set, one
owner), and the page-ground flip ash→well green. Gates: build 0 · affected suites 30/30 ·
full suite 8,780 pass / 3 characterized-or-solo-green.
**Audit:** five parallel evidence agents, ~50 raw findings deduplicated into
`FABLE_DRAFT_JOURNEY_AUDIT_2026-07-02.md` (IDs DJ-00..DJ-28): 7 P0s before JK's playthrough
(illegal roster-board frame incl. a DH slot; CPU valuation leak; CPU club identity re-roll;
universe-vs-pool budget basis; design-first lock membership drift; no draft-exit legality
gate; post-lock design staleness), the intent cluster (cheapest-fill dollars as "plan",
fit-first ranking engine orphaned, whisper board lacking identity/need terms → the BEST-22
spec is Fable's next design), and a minors batch. Routing in audit §6. One JK ruling
requested: price-basis unification v1 vs v1.1 (rec: v1.1 given DJ-04(1)).

## 2026-07-02 — JK RULING: price-basis unification (DJ-04(2)) → the v1.1 economy batch

JK agreed (token-conscious, conditional on the auction staying fully as specced — condition
HOLDS, see below): DJ-04(1) (budget computed from the candidate pool, not the universe) is
v1 NOW; full price-basis unification (stored salary vs pure-IV cap scale vs reserveCurve×IV
ask — one currency end-to-end) joins the v1.1 ECONOMY RE-CALIBRATION BATCH (now: Two-Way
cohorts · flexibility-as-value · IV gaps · AGE economy · PRICE-BASIS UNIFICATION). What v1
keeps: the auction room itself is untouched and fully specced — its pricing, asks, budgets,
and bidding all already run on one basis (IV-derived). What v1 defers: precision of the
PRE-DRAFT planning estimates only (the designer's dollar figures can skew for age/fame-heavy
designs vs what the room will ask). No auction functionality is lost.

## 2026-07-03 — Opus cross-model audit of the legality-fix delta: committed + one PRE-EXISTING defect ticketed (DJ-29)

Opus audited Fable's legality-by-construction delta (builder≠auditor): build 0, feasibility
13/13, full suite green modulo 5 characterized flakes, 4-lens adversarial pass (17 HOLDS).
The delta fixes the stated "FILLS · NOT A LEGAL 22" browser bug with zero regression →
COMMITTED (a20ff1a6). The adversarial pass found ONE new defect, verified by reproduction
against the real engine and PROVEN pre-existing on base HEAD 7109524a (identical output with
the delta stashed):

**DJ-29 (MAJOR, pre-existing, owner Fable):** the design-feasibility FRAME is a rigid
22-slot bijection (4 dedicated SP + 4 dedicated RP + a distinct backupC) and is STRICTER than
the set-based isLegalRoster (which lets a Two-Way(C) arm double as backup catcher AND stay in
the staff, and an SP/RP count toward both floors). When a pool's only backup-catcher body is
a Two-Way(C) arm the staff also needs for its 4th reliever, the frame strands an RP slot and
reports a LEGAL 22 as infeasible (RP4 no-match). Direction is one-way: it only OVER-rejects a
legal roster — the final isLegalRoster gate still blocks any illegal assembly, so no
illegal-approved risk. Edge case for JK's browser pass (needs a pool with NO second catcher).
Not introduced by the committed delta. Fix is a Fable design call (honor role double-counting
in the feasibility check). Full repro + evidence in FABLE_DRAFT_JOURNEY_AUDIT_2026-07-02.md §7.

## 2026-07-03 — JK RULING: HARD SALARY CAP in league settings (supersedes pool-relative for the draft budget)

JK's browser test hit the design-first budget reading ~$1.55M ("EST $1,050,537 OF $1,547,961") instead
of a cap he expected from league settings. Opus diagnosed: there is NO absolute salary-cap setting today;
the only economy lever is the TIER (juiced/standard/nerfed), and the team budget is computePoolTierCap —
POOL-RELATIVE by the 2026-06-25 "Option B" ruling (cap = max(maxIV/starShare, meanIV×22) × tierScale).
JK's curated design-first pool skews talent-rich → the cap floats up to fit it, so the budget is nearly
non-binding in design-first mode ("buildable ✓" is hollow — the cap grew to afford the designs).

**RULING (JK, 2026-07-03): move to a HARD salary cap set in league settings** — an absolute dollar
ceiling the GM types; the pool extraction must be CAP-AWARE (pick players so a legal 22 is buildable
under it); the designer + auction display and enforce THAT number. This SUPERSEDES the 2026-06-25
pool-relative "Option B" ruling for the draft/design budget. **DJ-04(1) (budget-basis consistency) is
SUBSUMED** — designer and auction share the one settings cap by construction. DJ-04(2) price-basis
unification (v1.1) revisited under the new model. Owner: **Fable designs the economy change** (settings
field + persistence + cap-aware extraction + how/whether tier still scales player ratings vs the cap +
migration for leagues with no cap field); Codex builds; Opus audits. Priority: pre-playthrough (it blocks
JK's browser read of the budget). Full diagnosis: this session's audit trail.

## 2026-07-03 — JK RULINGS: hard-cap §6 open questions (all ratified per Fable's recommendations)

JK ruled the three FABLE_HARD_CAP_DESIGN_2026-07-03.md §6 open items — all confirming the current design,
so NO code change (the hard-cap Phase 1 already implements each):

1. **Farm draft budget stays POOL-RELATIVE (leave as-is).** No farm salary-cap field in v1; the farm economy
   was deliberately talent-proportional and no farm-budget surprise has surfaced. Revisit only in the v1.1
   economy batch if desired.
2. **Tier stays a STARTING SUGGESTION, not a budget/ratings law.** With the hard cap in settings, tier only
   (a) seeds the default cap and (b) keys the luxury-cap tables. Player ratings/IVs stay UNTOUCHED by tier
   (reaffirms the 2026-06-26 canon). The dormant TIER_RATING_SCALES path stays dormant — reactivating it
   would be a separate, later JK fork.
3. **Salary-cap edits take effect at the NEXT lock/draft, never retroactively inside a live session.** A
   mid-draft cap change does not touch a crash-safe session's per-team budgets (avoids force-sell negatives).
   The cap set before a draft is the cap for that draft.

These ratify decisions already built into Phase 1; recorded so they are canon and not re-litigated.
FABLE_HARD_CAP_DESIGN §6 items 1-3 are now CLOSED.

## 2026-07-03 — JK RULINGS: pool-sizing design (FABLE_POOL_SIZING_DESIGN §9 open items)

JK ruled the three §9 open items:
1. **Count shill wins in the band base (keep Fable's rec).** demandBase = teams×22 + expectedShillWins;
   with JK's shill-count-0 setup this is exactly teams×22.
2. **Default dial stop = 1.35× (keep Fable's rec).** Mid-band; user retunes per league via the dial.
3. **PRESERVE hand-edits automatically across a recalc (OVERRIDES Fable's "rebuild + re-confirm" rec).**
   JK wants his manual add/removes kept when the size dial changes. Reconciliation (so this does NOT
   reintroduce the "ghost past the fit law" risk Fable raised): a hand-edit is the USER'S EXPLICIT override,
   so it is legitimately protected — the fit-first law governs the ENGINE's automatic picks, not the user's
   deliberate hand-picks — and the RE-CHECK panel makes any buildability impact visible. Fable to amend
   §5.2 for Phase 2B: on recalc, hand-ADDs are re-applied AND protected from the trim; hand-REMOVEs persist;
   then the buildability check runs and the re-check panel surfaces any club that the edits made unbuildable.
   This is a Phase 2B (§5.2) concern — Phase 2A (the trim/floor engine, which takes protectedIds as a param)
   is unaffected and proceeds as designed.
