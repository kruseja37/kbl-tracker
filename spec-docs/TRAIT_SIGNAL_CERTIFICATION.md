# TRAIT-TO-SIGNAL MAPPING — §18.2 CERTIFICATION READ

**Created:** 2026-06-16
**Author:** Captain (Opus 4.8). Method: a `trait-to-signal-mapping` workflow — 4 ground-truth readers (signal population, the count/pitch-sequence question, the detection inventory, trait machinery) + 5 per-chemistry-type mappers (all 72 traits) + 3 adversarial verifiers (pivotal-signal population, bucket-A demotion audit, bucket-C promotion audit). ~14 agents, ~1.65M tokens. Evidence over assertion: every call carries a `file:line` and the bucketing was independently re-derived against signal-population reality.
**Scope:** The `FRANCHISE_V1_LIVING_SEASON_SPEC.md` §9 "traits-from-reality" foundation — map every SMB4 trait to a measurable GameTracker enrichment signal, with the three-bucket triage (A maps cleanly / B needs a proxy / C needs a new input → JK rules add-input / connect-creatively / cut).
**Status:** CERTIFIED. New-input + cut rulings for JK in §V.

## A. HEADLINE — 12 A / 27 B / 33 C, and the §9 ENGINE IS UNBUILT

Of the 72 traits (`smb4_traits_reference.md`; 75 in `traitPricing.ts`):

| Bucket | Count | Meaning |
|---|---|---|
| **A — maps cleanly** | 12 | keys on an auto-populated signal; buildable today |
| **B — proxy-buildable** | 27 | a proxy can be assembled from populated data (some require a roster join or treat opt-in data as sparse) |
| **C — needs a new input** | 33 | no signal exists; JK rules add-input / connect-creatively / cut |

**The crux finding: `typed ≠ populated`.** The pressure spine (`leverageIndex`, `wpa`, `isClutch`, runners, RBI, scores) is auto-populated on every at-bat (`useGameState.ts` recordAtBat paths) — clean. But almost all *discriminating* enrichment (count, pitch type, pitch location, fielding difficulty, chase, handedness, mojo/fitness) is **absent, typed-but-unwritten, or manual/opt-in.** A handful of missing inputs gate the bulk of bucket C.

**Three §9 engine layers — ALL unbuilt** (this is the build, separate from the input decisions):
1. **Signal reconstruction** — `traitInteractionMatrix.ts` already encodes, per trait, the exact on-field activation predicate (count, pressure, runnersOn, risp, vsHand, pitchType, pitchLocation, fieldingChance, stealAttempt, roundingBase, buntAttempt, comebackerToPitcher…) and a working evaluator exists (`effectiveRatings.ts evaluatePredicate`). **But it evaluates a *forward-looking* GameContext for recommendations — it is NOT reconstructed from the persisted enrichment logs**, and it leaves pitchType/pitchLocation/handedness undefined. This matrix is the single most valuable §9 asset — the build feeds it a log-reconstructed context.
2. **Strength scoring** — §9 requires a continuous "how hard was the reality" score (crushing-in-the-clutch > barely-clearing). **No such primitive exists** (the only scaling is `traitPricing`/`traitPools` chemistry-tier rarity, not measured-difficulty). Must be built.
3. **Grant / write-back** — the real lottery machinery (`traitPools.ts` `getWeightedTraitPool` + S/A/B/C tiers + award→trait map) is **orphaned in an archived component**; the live `AwardsCeremonyFlow.tsx` uses fake placeholder strings and never persists a trait. There is **no live trait-grant write path.** The §11 write-back target is the unified player record's `traits` field (`PlayerTraits {trait1?, trait2?}` — the two-trait cap is structural). Must be built.

## B. BUCKET A — maps cleanly (12, buildable today)

All key on auto-populated signals (verified by the bucket-A audit):

| Trait | Signal (file:line) |
|---|---|
| **Clutch** / **Choker** | high-leverage PA + positive/negative outcome — `leverageIndex` + `wpa` populated on every path (`useGameState.ts:6451/6453`) |
| **RBI Hero** / **RBI Zero** | runner on 2B/3B + driven-in-or-not — `runners` + `rbiCount` + `runsScored` populated |
| **Rally Stopper** / **Surrounded** | pitcher facing ≥2 on + good/bad outcome — `runners` + outcome |
| **Rally Starter** | behind + bases empty + reaches — derived from populated state |
| **Meltdown** | 4+ consecutive reach, no out — derived from the event stream (`outsRecorded`) |
| **Stealer** / **Bad Jumps** | `stolen_base` / `caught_stealing` between-play events, runner identity (`useGameState.ts:8407/8450`) |
| **Pinch Perfect** | `batterContext.enteredAs` populated from the live sub log (`useGameState.ts:4053`) |
| **Butter Fingers** | error `'E'` result auto-extracts a `FieldingEvent` (position, `success:false`) — borderline (fielder attribution is opt-in) |

## C. BUCKET B — proxy-buildable (27)

Each needs a proxy from populated data; three sub-classes:

- **Outcome-split proxies (clean):** Tough Out, K Collector, K Neglecter, Whiffer (2-strike behavior via inverse/outcome proxy — count itself absent), Base Rounder / Base Jogger (extra-base advancement from `runnerOutcomes`), Easy Jumps / Pick Officer / Wild Thrower (opponent steal/CS/error events), Ace Exterminator (output vs A-/better pitchers — derived), Bunter (`exitType:'bunt'` auto-stamped for SAC), Utility / Two Way (the auto-populated `FieldingEvent` log at non-primary positions), **Cannon Arm** (auto-derived `outfield_assist` rate — `fieldingEventExtractor.ts:563-568`, *promoted from C*).
- **Require a roster JOIN (handedness is unwritten but `bats`/`throws` exist at `playerDatabase.ts:49-50`):** CON vs LHP, CON vs RHP, POW vs LHP, POW vs RHP, Specialist, Reverse Splits — a join at event-write time makes these B, not a new input.
- **Sparse / opt-in (signal exists but is manual):** Bad Ball Hitter (`chased`), Magic Hands / Dive Wizard (`fieldingDifficulty='DIVING'`, *Magic Hands demoted from A* — discriminating value is opt-in), Sprinter / Slow Poke (steal success-rate proxy, no timing), Wild Thing (no held-pitch field; weak proxy), **Crossed Up** (`passed_ball` events keyed to catcher — *promoted from C, conditional* on users logging PBs).

## D. BUCKET C — needs a new input (33), grouped by the ONE blocking input

| Blocking input | Traits (count) | What's needed |
|---|---|---|
| **Ball-strike count** (ABSENT — no count field; `gameState.balls/strikes` reset every AB, `advanceCount('ball')` has zero callers) | First Pitch Slayer, First Pitch Prayer, Composed, BB Prone, Big Hack, Little Hack, Gets Ahead, Falls Behind (**8**) | persist the count (count-at-contact or per-pitch sequence) |
| **Pitch type** (TYPED_UNWRITTEN — single per-AB string, written `""` live, non-empty only via HR prompt) | Fastball Hitter, Off-Speed Hitter, Elite 4F/2F/CF/FK/SL/CB/CH/SB (**10**) | reliable per-AB/per-pitch pitch-type capture (manual or SMB4-read) |
| **Pitch location** (ABSENT — no zone field) | Low Pitch, High Pitch, Inside Pitch, Outside Pitch (**4**) | add a pitch-location (vertical/horizontal zone) input |
| **Mojo/fitness auto-derivation** (TYPED_UNWRITTEN — manual-only today) | Consistent, Volatile, Stimulated (**3**) | an auto mojo/fitness engine (this is the separate Phase-2 morale/development system, not a standalone trait input) |
| **Durability / injury** (hidden modifiers; no injury accumulator — `games` counter has no discriminating power) | Durable, Injury Prone (**2**) | expose the hidden durability modifier OR auto-injury events |
| **No-proxy / bespoke** | Noodle Arm (arm velocity / runner-advance-vs-OF), Sign Stealer, Mind Gamer, Distractor, Easy Target (comebacker), Metal Head (comebacker recovery) (**6**) | genuinely new mechanic capture — likely cut candidates for v1 |

## E. NEW-INPUT LEVERAGE (what each input unlocks)

| New input | Traits unlocked | Cost | Note |
|---|---|---|---|
| **Persist ball-strike count** | **+8** | LOW — persist one field per AB (the count already exists transiently; `advanceCount('ball')` just needs to be wired + the value logged) | **highest leverage per unit cost** |
| **Auto-capture pitch type** | **+10** | MED/HIGH — needs reliable per-pitch SMB4 capture (or mandated manual entry) | highest raw count; not a proxy |
| **Add pitch location** | **+4** | MED — new field + a capture UI/flow | |
| **Auto mojo/fitness derivation** | **+3** | HIGH — but this IS the separate morale/development engine | folds into that system |
| **Join handedness (already B)** | strengthens 6 split traits | LOW — thread `bats`/`throws` into `buildContextSnapshot` | not a new input, a join |

The first three inputs together would move **22** traits from C → buildable. The final ~8 (Noodle Arm + durability pair + 5 invisible mechanics) have no proxy and need bespoke capture or a cut.

## F. METHOD & CORRECTIONS

Independently verified by adversarial verifiers. Corrections applied: **Magic Hands A→B** (discriminating fielding-difficulty signal is opt-in, not auto-written); **Cannon Arm C→B** (auto-derived outfield-assist proxy); **Crossed Up C→B conditional** (passed-ball events, but manual-logged). One mapper note corrected: `managerBuntIntent` is typed-but-unwritten (Bunter's real signal is the auto `exitType:'bunt'`). The orphaned `detectionFunctions.ts` prompt tier (promptWebGem/promptRobbery/etc.) is NOT the live signal source — live fielding/fame signals come from `fameAutoDetections.ts` + `FieldingEvent` + manual fame quick-buttons.

---

## V. OPEN DECISIONS FOR JK (§9 traits-from-reality scope)

The §9 feature ambition is set by **which new inputs to add** (each unlocks a C-cluster) and **which no-proxy traits to cut.** Recommendations are the Captain's.

- **TS-1 — Which new inputs to add for §9 v1?** (each independent)
  - *Ball-strike count* (+8 traits, LOW cost) — *strongly recommend ADD*: cheapest input, biggest leverage-per-cost, and count is baseball-fundamental.
  - *Pitch type* (+10 traits) — recommend ADD only if SMB4 pitch-type capture can be made reliable (else it's manual-entry burden; consider sparse/opt-in).
  - *Pitch location* (+4) — recommend DEFER unless the 4 zone traits are wanted; highest cost-per-trait.
- **TS-2 — The ~8 no-proxy traits** (Noodle Arm, Durable, Injury Prone, Sign Stealer, Mind Gamer, Distractor, Easy Target, Metal Head): CUT from *earnable*-traits-from-reality for v1 (they still exist as static seed/priced traits — just not earned/lost via play), or commit to bespoke inputs? *Recommend CUT from earnable for v1.*
- **TS-3 — Build the §9 engine (3 layers) on `traitInteractionMatrix`.** The matrix already encodes every activation predicate; the build = (1) reconstruct the GameContext from persisted enrichment logs (vs the forward-looking recommendation context), (2) a measured-difficulty strength-scoring primitive, (3) the grant/write-back to the franchise-instance `traits` field with the two-trait cap + §9 gain/loss buffer. *Recommend confirm — this is the §9 build ticket; the input decisions (TS-1) just set how many traits it can serve.*
- **TS-4 (free win) — Join handedness** (`bats`/`throws` → `buildContextSnapshot`): a LOW-cost join that moves 6 split traits from "needs handedness" to clean B. *Recommend ADD regardless.*

---

## VI. RESOLVED §9 MODEL (JK design session, 2026-06-16 — SUPERSEDES §V's open framing)

JK + Captain worked the full triage to a buildable model. Decisions logged as TS-1..12 in `DECISIONS_LOG.md`.

### VI.0 The acquisition formula (the unification)

> **P(gain / lose a trait) = f( reality-percentile-vs-peers , personality-tilt , current-morale )** — gated by a **min-sample safety valve**, with **gain-high / lose-low hysteresis**, under the **2-trait cap** (strength-ranked displacement; no offsetting pos/neg pair held at once). All magnitudes **sim-tuned (§16)**.

Three pillars, mostly already in the app: **peer-relative percentiles** (the Adaptive Standards / WAR-baseline machinery — this also *is* the §9 "strength score" and auto-scales by season length + pool talent), **personality/morale weighting** (§6 modifiers), and the **min-sample valve** (below).

### VI.1 The min-sample safety valve (the Franchise-lite toggle)

A trait cannot fire until its underlying signal clears a minimum sample — thin/missing enrichment ⇒ the trait stays dormant, never flickering on noise. This makes enrichment **opt-in**: skip it and you're playing "Franchise-lite" (pitch-detail traits dormant, everything else works). It also protects against **confirmation spam** — trait changes are *confirmed* (console + DB, §11), unlike morale (silent). Franchise-lite still earns the outcome/profile/personality traits (Clutch, RBI Hero, Stealer, injury, mojo, the personality-primary ones); only the enrichment-detail traits (zone, pitch-type, chase) go dark.

### VI.2 Role eligibility (CRYSTAL — who can earn each trait)

- **PITCHER-ONLY (25):** Gets Ahead, Falls Behind, Composed, BB Prone, K Collector, K Neglecter, Rally Stopper, Surrounded, Meltdown, Specialist, Reverse Splits, Pick Officer, Easy Jumps, Wild Thing, Metal Head, **Crossed Up** *(a pitcher trait that manifests as the catcher dropping the pitch — attribute the passed-ball signal to the PITCHER, not the catcher)*, Two Way, Elite 4F/2F/CF/FK/SL/CB/CH/SB.
- **POSITION-PLAYER-ONLY (39):** *Batting (25):* First Pitch Slayer, First Pitch Prayer, Tough Out, Whiffer, Big Hack, Little Hack, Bad Ball Hitter, Easy Target, RBI Hero, RBI Zero, Rally Starter, CON/POW vs LHP/RHP (4), Ace Exterminator, Bunter, Fastball Hitter, Off-Speed Hitter, Low/High/Inside/Outside Pitch (4), Mind Gamer, Pinch Perfect. *Baserunning (7):* Stealer, Bad Jumps, Sprinter, Slow Poke, Base Rounder, Base Jogger, Distractor. *Fielding (7):* Cannon Arm, Noodle Arm, Magic Hands, Butter Fingers, Dive Wizard, Utility, Wild Thrower.
- **UNIVERSAL / either (7):** Clutch, Choker (all-skills pressure), Durable, Injury Prone (Durable most-detectable for catchers), Consistent, Volatile (mojo), Stimulated (late-game ratings juice).
- **CUT (1):** Sign Stealer (removed incl. from draft-class generation).
- **Gateway interaction + Two-Way position:** Two Way is pitcher-only, earned from a pitcher *hitting elite for a pitcher*; earning it makes him an everyday player, eligible thereafter for the position-player batting traits. On grant (trait evolution OR player generation), assign the pitcher a **random two-way fielding position (IF / OF / C)** so he can take the field.
- **Edge cases RULED (JK 2026-06-16):** Wild Thrower + Pinch Perfect = position-player-only (confirmed). Crossed Up corrected to **pitcher-only** (the pitcher crosses up his catcher; signal attributed to the pitcher).

### VI.3 The four personality "image" axes (Layer 2 on top of the universal Ambition↑-positive / low-Resilience↑-negative rule)

- **Composure** (steady ↔ cracks): **+** Clutch, RBI Hero, Rally Starter, Pinch Perfect, Magic Hands, Rally Stopper ← Tough/Competitive/Composed, high Resilience · **−** Choker, RBI Zero, Butter Fingers, Wild Thrower, Surrounded, Meltdown ← Timid/Droopy/Volatile, low Resilience. (Butter Fingers is *doubly* sensitive: universal low-Resilience + the Timid/Volatile flavor.)
- **Hustle/aggression:** **+** Stealer, Sprinter, Base Rounder ← Competitive/Tough/Ambitious · **−** Bad Jumps, Slow Poke, Base Jogger ← Relaxed/Droopy, low Ambition.
- **Big-game/spotlight:** Ace Exterminator, K Collector ← Competitive/Egotistical; Two Way ← Ambitious/Egotistical; Stimulated ← Ambitious/Tough/Egotistical (PED logic).
- **Approach/discipline:** Tough Out, Bunter ← Disciplined (grinder/selfless); Whiffer ← Egotistical/Volatile (free-swinger); Consistent ← high Resilience, Volatile ← low Resilience.
- **No personality image (universal tilt only):** the platoon/mechanical-skill traits — CON/POW vs LHP/RHP, Specialist, Reverse Splits, Pick Officer, K Neglecter, Utility.
- **Roster-role tilt (a separate input from personality):** **bench** classification *raises* acquisition likelihood for the bench/utility-image traits — **Pinch Perfect** and **Utility** (a bench / multi-position player is their natural carrier); a **starter** classification lowers it.
- **Personality is PRIMARY where the measured signal is thin** (Stimulated, Gets Ahead/Falls Behind, Big/Little Hack) and a light TILT where it's strong — this is §2's "engine of divergence" made mechanical.

### VI.4 The capture surface (what to build vs reuse)

- **Net-new (3):** pitch **zone** (low/high/inside/outside, net of chases-for-outs at 2×); **OF extra-base-credit** (borrow bWAR expected-extra-bases; credit the fielder) for Cannon/Noodle Arm; an **injury accumulator** (folds into the fitness/dev engine, season-scaled thresholds) for Durable/Injury Prone.
- **Reuse existing fields/events:** chase (`chased`), pitch type (`pitchType`, net + peer-relative for Elite/Fastball/Off-Speed), `pitchesInAtBat` (==1 ⇒ first-pitch; high ⇒ grinder), PB/WP-on-advance between-play events (Crossed Up / Wild Thing), KP/nut-shot quick-buttons (Metal Head = hit 2× combined ⇒ protective grant), mojo-change events (Consistent/Volatile = change frequency), `beat_throw`/`beat_runner` play types (Sprinter/Slow Poke/Dive Wizard), leverage/WPA (Clutch/Choker), SB-allowed/IP (Easy Jumps), rWAR (Distractor), walks + pitch-grinding (Mind Gamer), inning (late-game split for Stimulated).
- **Handedness join (TS-4):** thread `bats`/`throws` onto the event context → unlocks CON/POW vs LHP/RHP + Specialist + Reverse Splits.

### VI.5 The §9 engine (still to build — the actual ticket)

Build on `traitInteractionMatrix.ts` (already encodes every activation predicate): (1) reconstruct the activation context **from the persisted enrichment logs** (vs the forward-looking recommendation context it uses today); (2) the peer-relative strength/percentile scorer (rides Adaptive Standards); (3) the grant/write-back to the franchise-instance `traits` field (`PlayerTraits {trait1?,trait2?}`, two-trait cap, hysteresis, no offsetting pair, role-eligibility gate from VI.2). All thresholds/bands/weights → Simulation Gate.
