# TRAIT DETECTION-SCOPE AUDIT (FINDING-150 follow-up)

**Created:** 2026-06-18 (JK-triggered after the Q1 challenge)
**Method:** workflow `wf_6643e635-9e3` — 7 agents: 1 spec-mapper (§VI resolved model + the
matrix), 5 parallel live-persistence verifiers (one per signal cluster, grep-grounded against
`useGameState.ts` / `eventLog.ts` / `game.ts`), 1 synthesis. ~474K tokens.
**Purpose:** classify every SMB4 trait as **correctly-built / wrongly-dormant / correctly-dormant /
cut** by cross-referencing what §VI says is buildable against which discriminating signals ACTUALLY
persist on the live path — the exact gap list FINDING-150 called for, before any L9b-3a rebuild.

> NOTE on counts: the synthesis agent's summary tallies (16/30/28/1) miscounted; the per-trait
> verdict lists below sum correctly to **75** = **16 correctly-built + 34 wrongly-dormant + 24
> correctly-dormant + 1 cut**.

---

## ⏱ 2026-06-25 STATUS REFRESH + the "what's actually missing" clarification (JK Q&A, attended `/kbl-captain`)

This Jun-18 doc's **34 wrongly-dormant** are now **mostly BUILT** (the R-E→R1→R2→R3 expansion + L9b + T-1..T-5 this session pushed `BUILDABLE_TRAITS` 16→**48** earnable). The live earnable-vs-dormant set is now (Captain-extracted from `BUILDABLE_TRAITS` vs `TRAIT_PRICING`, 2026-06-25): **48 earnable / 27 not-earnable.**

**THE KEY CLARIFICATION (corrects the loose "gate on missing inputs" framing for groups A–C):** for the enrichment-gated dormant traits the **capture input ALREADY EXISTS** as an optional `AtBatEvent.enrichment` field — it is NOT a "go build the capture" problem. What is missing is the **measurement LOGIC** (the `§0.6` proxy row + the `traitCandidateBuilder` signal that reads the field). And — verified by running `assignTier` 2026-06-25 — **the gain/loss DIFFICULTY is ALSO already present** for every priced dormant trait (the T-1/T-2 value-tier system derives a threshold from each trait's $-value). So the ONLY gap is the signal.

| Group | Capture field (exists?) | Difficulty/threshold (assignTier) | Signal logic (§0.6 row + builder) |
|---|---|---|---|
| **A pitch-type** (8 elite pitches + Fastball/Off-Speed Hitter, 10) | ✓ `enrichment.pitchType` (`eventLog.ts:437`) | ✓ Elite 4F ELITE 0.92 · most RARE 0.82 · Elite FK/Fastball/Off-Speed UNCOMMON 0.70 | ✗ EMPTY |
| **B pitch-location** (High/Low/Inside/Outside Pitch, 4) | ✓ `enrichment.pitchLocation: 'low'\|'high'\|'inside'\|'outside'\|'outOfZone'` (`eventLog.ts:438`) | ✓ all RARE 0.82 | ✗ EMPTY |
| **C difficulty/chase** (Magic Hands, Dive Wizard, Bad Ball Hitter, 3) | ✓ `FieldingEvent.difficulty` + `enrichment.chased` | ✓ Magic Hands/Dive Wizard COMMON 0.55 · Bad Ball Hitter RARE 0.82 | ✗ EMPTY |
| **D miss** (Wild Thrower, 1) | ✓ FieldingEvent error (already auto-tracked) | ✓ MODERATE 0.65 (neg) | ✗ EMPTY — a genuine slip (signal exists, never added to BUILDABLE) |
| **E mojo** (Consistent, Volatile, 2) | ✗ mojo auto-derivation UNBUILT (genuine missing input) | ✓ Consistent COMMON 0.55 · Volatile UNCOMMON 0.70 | ✗ EMPTY |
| **F bespoke** (Base Jogger, Metal Head, Wild Thing, Workhorse, 4) | ✗ no clean SMB4 signal | ✓ derived (Workhorse ELITE 0.92 · Wild Thing SEVERE 0.78 · …) | ✗ no viable proxy |
| **G cut** (Sign Stealer, Stimulated, Noodle Arm, 3) | — | Sign Stealer/Stimulated THROW (excluded from weighting); Noodle Arm derives MODERATE | deliberately cut/parked |

**Net:** groups **A+B+C (17 traits)** are NOT blocked on capture or difficulty — both exist — only on **writing the proxy logic** (the elite-pitch/T-9 shape, repeated; opt-in + min-sample-gated). **D (Wild Thrower)** is a 1-line BUILDABLE add (signal already auto-tracked). **E/F/G** need real new work or are intentional. **PENDING: JK is providing the per-group tracking methods (the proxy definitions) → fill the §0.6 rows → move A–C earnable.**

---

## HEADLINE

The candidate builder (`BUILDABLE_TRAITS`) emits **16** traits. **~34 more are buildable now** —
from data that already persists live, from a join we already added (handedness, L9a-3), or as
personality-primary under JK's Q12 ruling. So the recommended v1 buildable set is **~50** traits;
the build delivered 16. Roughly **two-thirds of the achievable v1 trait set was wrongly dormant**,
because L9b-3a used the superseded §D "needs a new input" triage instead of the resolved §VI model.

The remaining **24** are *correctly* dormant — they gate on genuinely-missing inputs (pitch-type
capture, pitch-location zones, fielding-difficulty tags, mojo auto-derivation, stamina) — and Sign
Stealer is **cut**. The deferred ball-strike count (Q1) only blocks **1** trait that isn't otherwise
covered (Composed); everything else in the "count family" earns via personality (Q12).

---

## THE 34 WRONGLY-DORMANT — buildable now, grouped by what it takes

### Tier 1 — clean, signal already auto-persists (just add + derive; ~13)
AB-outcome proxies and event proxies that fire on data written on every record path:
- **Easy Target** (all-skills AB-outcome proxy), **Base Rounder** (extra-base advancement from `runnerOutcomes`)
- **Strikeout family:** **K Collector**, **K Neglector**, **Tough Out**, **Whiffer** (the K *outcome* persists independent of count precision)
- **Steal/error event proxies:** **Pick Officer**, **Easy Jumps**, **Slow Poke** (SB-allowed/CS events), **Wild Thrower** (FieldingEvent error)
- **Mind Gamer** + **Distractor** (walk-rate half persists; pitch-grinding half is opt-in — build the walk half)

### Tier 2 — needs the handedness join actually fed (6)
The platoon splits — **CON vs LHP/RHP, POW vs LHP/RHP, Specialist, Reverse Splits**. L9a-3 wired the
join, but the audit flags handedness only populates when `handednessById` is supplied at game init.
→ **Action item: verify the franchise game path actually feeds roster handedness** (if yes, these are free).

### Tier 3 — needs the Q12 personality-primary mechanism (6)
**BB Prone, Big Hack, Falls Behind, Gets Ahead, Little Hack, Stimulated** — earn from personality even
when the measured (count/mojo) signal is thin. This is the §VI.3:122 mechanism JK's Q12 override now
mandates for v1. Build it once → all 6 light up.

### Tier 4 — Two Way (3; pitcher-only, NO batting gateway)
**Two Way (C)/(IF)/(OF)** — `FieldingEvent.position` at non-primary spots persists; earn the trait from a
pitcher's fielding performance there. **CORRECTED (JK 2026-06-18): Two Way is pitcher-only and a two-way
player holds ONLY pitcher traits — do NOT build a gateway that opens the position-player trait pool.** The
on-grant random IF/OF/C fielding-position assignment still applies (defensive roster only).

### Tier 5 — conditional/opt-in (build, but only fires when the player logs the enrichment; ~4)
- **First Pitch Slayer / First Pitch Prayer** — `pitchesInAtBat==1` (opt-in via EnrichmentPanel)
- **Crossed Up** — `passed_ball` event (only if the user logs PBs)
- **Bunter** — `exitType='bunt'` (auto-stamps on SAC only; bunt-for-hit not captured)

### Flagged-uncertain — need a JK micro-ruling (2)
- **Sprinter** — ⚠️ the named `beat_throw`/`beat_runner` play types are **never written** (dead signal). Buildable only via an infield-single AB-outcome proxy instead. *Confirm the proxy is acceptable, or leave dormant.*
- **Ace Exterminator** — needs an opponent-pitcher-grade roster join that's **unverified**. Buildable only if that join is wired.

---

## TWO REVERSE-FINDINGS (currently BUILT, but suspect)
- **Noodle Arm** — IS in `BUILDABLE_TRAITS`, but §VI calls it a bespoke no-proxy mechanic; it's likely
  firing on a **weak/borrowed bWAR proxy**. May belong in cut or correctly-dormant. **Re-examine.**
- **Meltdown** — built, but there's **no persisted consecutive-baserunner field**; the candidate
  approximates from `outsRecorded`/reach events. Works, but it's an approximation, not the spec metric.
  Accuracy caveat (not dormancy).

---

## THE 24 CORRECTLY-DORMANT — genuinely blocked, grouped by the missing input
- **Pitch-type capture (typed-but-empty live):** Elite 4F/2F/CF/FK/SL/CB/CH/SB (8), Fastball Hitter, Off-Speed Hitter (**10**)
- **Pitch-location zones (net-new / opt-in):** Low Pitch, High Pitch, Inside Pitch, Outside Pitch (**4**) — NOTE: L9a-1 added zone *capture* but it is opt-in, not auto-populated
- **Chase + zone (both opt-in):** Bad Ball Hitter (**1**)
- **Fielding-difficulty='DIVING' (opt-in):** Magic Hands, Dive Wizard (**2**)
- **Ball-strike count precision (Q1-deferred), not personality-primary:** Composed (**1**)
- **Mojo auto-derivation (Phase 2, unbuilt):** Consistent, Volatile (**2**)
- **Bespoke / no proxy:** Base Jogger (durability/rounding), Metal Head (comebacker/KP/nut-shot), Wild Thing (held-pitch — cut candidate), Workhorse (stamina) (**4**)

## CUT (1)
- **Sign Stealer** — removed per §VI.2:110 (incl. from draft-class generation).

---

## RECOMMENDED v1 REBUILD SCOPE (sequence)
> NOTE: the AUTHORITATIVE build sequence is now `TRAIT_MEASUREMENT_SPEC.md §0.4` (R-E → R1 → R2 → R3) and the
> earnable set + proxies are §0.6. This earlier list is retained for the per-tier trait groupings only; where it
> conflicts with §0.4/§0.6 (e.g. "personality-primary mechanism" is now "personality-tilt over a data proxy"; the
> Two-Way gateway is removed; Noodle Arm is cut; Stimulated is dormant), §0.4/§0.6 win.
1. **L9b-3a expansion — Tier 1 (the cheap ~13):** add the AB-outcome / steal-error / Base-Rounder proxies to `BUILDABLE_TRAITS` + their signal derivations. No new mechanism. Biggest bang for buck.
2. **L9b-2 personality-primary mechanism (Q12) → Tier 3 (6):** the one new engine piece; unblocks the count-family without the count.
3. **Tier 2 platoon (6):** verify the franchise path feeds handedness, then add the 6 splits.
4. **Tier 4 Two Way (3; pitcher-only — NO batting gateway, JK 2026-06-18):** add the 3 fielding-perf signals; do NOT build a position-player-trait gateway. The on-grant random IF/OF/C fielding-position assignment is defensive-roster only.
5. **Tier 5 conditional (4):** add, documented as "fires only when the enrichment is logged."
6. **Resolve the 2 reverse-flags** (Noodle Arm keep/cut; Meltdown approximation OK?) + the 2 uncertain (Sprinter proxy; Ace Exterminator join) — JK micro-rulings.
7. **Leave the 24 correctly-dormant** pending their inputs (pitch-type, zone, difficulty, mojo-auto, stamina) — aligns with the Q1-deferred count + future enrichment work.

This makes the v1 earnable-trait set ~50 (from 16) using almost entirely data we already capture.

---

## FULL PER-TRAIT VERDICT TABLE

| Trait | Role | Verdict | Built? | Signal source | Persists | Note |
|---|---|---|---|---|---|---|
| Clutch | universal | correctly-built | ✓ | leverageIndex+wpa | yes | |
| Choker | universal | correctly-built | ✓ | leverageIndex+wpa | yes | |
| RBI Hero | position | correctly-built | ✓ | runners+rbiCount+runsScored | yes | |
| RBI Zero | position | correctly-built | ✓ | runners+rbiCount | yes | |
| Rally Stopper | pitcher | correctly-built | ✓ | runners+outcome | yes | |
| Surrounded | pitcher | correctly-built | ✓ | runners+outcome | yes | |
| Rally Starter | position | correctly-built | ✓ | teamLosing+basesEmpty | yes | |
| Meltdown | pitcher | correctly-built | ✓ | outsRecorded (consecutive reach) | yes* | approximation, no persisted consecutive-reach field |
| Stealer | position | correctly-built | ✓ | stolen_base + runner id | yes | |
| Bad Jumps | position | correctly-built | ✓ | SB/CS events | yes | |
| Pinch Perfect | position | correctly-built | ✓ | batterContext.enteredAs | yes | |
| Butter Fingers | position | correctly-built | ✓ | FieldingEvent error | yes | |
| Cannon Arm | position | correctly-built | ✓ | outfield_assist rate | yes | |
| Noodle Arm | position | correctly-built | ✓ | OF extra-base-credit | weak | ⚠️ bespoke/weak proxy — re-examine |
| Durable | universal | correctly-built | ✓ | injury accumulator | yes | |
| Injury Prone | universal | correctly-built | ✓ | injury accumulator | yes | |
| Easy Target | position | wrongly-dormant | — | AB-outcome proxy | yes | Tier 1 |
| Base Rounder | position | wrongly-dormant | — | runnerOutcomes | yes | Tier 1 |
| K Collector | pitcher | wrongly-dormant | — | strikeout outcome | yes | Tier 1 |
| K Neglector | pitcher | wrongly-dormant | — | strikeout-avoidance outcome | yes | Tier 1 |
| Tough Out | position | wrongly-dormant | — | strikeout-avoidance outcome | yes | Tier 1 |
| Whiffer | position | wrongly-dormant | — | strikeout outcome | yes | Tier 1 |
| Pick Officer | pitcher | wrongly-dormant | — | steal/CS events | yes | Tier 1 |
| Easy Jumps | pitcher | wrongly-dormant | — | SB-allowed/IP rate | yes | Tier 1 |
| Slow Poke | position | wrongly-dormant | — | SB success-rate | yes | Tier 1 (sparse) |
| Wild Thrower | position | wrongly-dormant | — | FieldingEvent error | yes | Tier 1 |
| Mind Gamer | position | wrongly-dormant | — | walks (+grind opt-in) | yes | Tier 1 (walk half) |
| Distractor | position | wrongly-dormant | — | walks/rWAR (+grind opt-in) | yes | Tier 1 (walk half) |
| CON vs LHP | position | wrongly-dormant | — | handedness join | opt-in | Tier 2 |
| CON vs RHP | position | wrongly-dormant | — | handedness join | opt-in | Tier 2 |
| POW vs LHP | position | wrongly-dormant | — | handedness join | opt-in | Tier 2 |
| POW vs RHP | position | wrongly-dormant | — | handedness join | opt-in | Tier 2 |
| Specialist | pitcher | wrongly-dormant | — | handedness join | opt-in | Tier 2 |
| Reverse Splits | pitcher | wrongly-dormant | — | handedness join | opt-in | Tier 2 |
| BB Prone | pitcher | wrongly-dormant | — | personality-primary | personality | Tier 3 (Q12) |
| Big Hack | position | wrongly-dormant | — | personality-primary | personality | Tier 3 (Q12) |
| Falls Behind | pitcher | wrongly-dormant | — | personality-primary | personality | Tier 3 (Q12) |
| Gets Ahead | pitcher | wrongly-dormant | — | personality-primary | personality | Tier 3 (Q12) |
| Little Hack | position | wrongly-dormant | — | personality-primary | personality | Tier 3 (Q12) |
| Stimulated | universal | wrongly-dormant | — | personality-primary (+inning) | personality | Tier 3 (Q12) |
| Two Way (C) | pitcher | wrongly-dormant | — | FieldingEvent.position | yes | Tier 4 (+gateway) |
| Two Way (IF) | pitcher | wrongly-dormant | — | FieldingEvent.position | yes | Tier 4 (+gateway) |
| Two Way (OF) | pitcher | wrongly-dormant | — | FieldingEvent.position | yes | Tier 4 (+gateway) |
| Utility | position | wrongly-dormant | — | FieldingEvent.position | yes | Tier 4-adjacent |
| First Pitch Slayer | position | wrongly-dormant | — | pitchesInAtBat==1 | opt-in | Tier 5 |
| First Pitch Prayer | position | wrongly-dormant | — | pitchesInAtBat==1 | opt-in | Tier 5 |
| Crossed Up | pitcher | wrongly-dormant | — | passed_ball event | opt-in | Tier 5 |
| Bunter | position | wrongly-dormant | — | exitType='bunt' | partial (SAC) | Tier 5 |
| Sprinter | position | wrongly-dormant | — | beat_throw (DEAD) | no | ⚠️ named signal dead; needs infield-single proxy |
| Ace Exterminator | position | wrongly-dormant | — | opponent pitcher grade | unverified | ⚠️ needs roster join |
| Fastball Hitter | position | correctly-dormant | — | pitchType | typed-empty | needs pitch-type capture |
| Off-Speed Hitter | position | correctly-dormant | — | pitchType | typed-empty | needs pitch-type capture |
| Elite 4F/2F/CF/FK/SL/CB/CH/SB | pitcher | correctly-dormant | — | pitchType | typed-empty | needs pitch-type capture (8) |
| Low/High/Inside/Outside Pitch | position | correctly-dormant | — | pitchLocation zone | opt-in/net-new | needs zone capture (4) |
| Bad Ball Hitter | position | correctly-dormant | — | chase+zone | opt-in | both signals opt-in |
| Magic Hands | position | correctly-dormant | — | fieldingDifficulty=DIVING | opt-in | |
| Dive Wizard | position | correctly-dormant | — | fieldingDifficulty=DIVING | opt-in | |
| Composed | pitcher | correctly-dormant | — | 3-ball count | opt-in | NOT personality-primary → needs count (Q1-deferred) |
| Consistent | universal | correctly-dormant | — | mojo auto-derivation | thin | Phase 2 mojo engine |
| Volatile | universal | correctly-dormant | — | mojo auto-derivation | thin | Phase 2 mojo engine |
| Base Jogger | position | correctly-dormant | — | durability/rounding | no | net-new |
| Metal Head | pitcher | correctly-dormant | — | comebacker/KP/nut-shot | no | quick-button not persisting |
| Wild Thing | pitcher | correctly-dormant | — | held-pitch | no | cut candidate |
| Workhorse | pitcher | correctly-dormant | — | stamina | no | stamina unbuilt |
| Sign Stealer | cut | cut | — | — | n/a | removed §VI.2:110 |
