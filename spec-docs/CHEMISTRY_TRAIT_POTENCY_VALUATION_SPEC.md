# CHEMISTRY_TRAIT_POTENCY_VALUATION_SPEC

## 1. Purpose & Status

**Status: RESEARCH / UNDERSTANDING DOCUMENT — NOT RATIFIED. No build is implied by this spec.**

This document exists to DOCUMENT, not decide. It maps the complete relationship between four things that are currently entangled in KBL Tracker but were never written down in one place:

1. The SMB4 in-game **chemistry / trait-potency** mechanic (how the actual game works).
2. The **trait value table** (per-level stat deltas, chemistry family, polarity).
3. The **IV / grade engine's Level-2-baseline assumption** — where it came from (an XBL league rule that does not exist in KBL franchise mode) and where it is structurally baked in.
4. The downstream **auction / scout valuation** consequences (over- and under-pricing, the two valuation contexts, the marginal step-value, and the open question of a fully adaptive draft scout).

The goal is to give JK a single surface on which to decide what (if anything) to change. Section 9 is the decision surface. Everything before it is evidence, with CONFIRMED facts separated from INFERENCES and UNKNOWNS.

**Source legend used throughout:**
- `[GUIDE]` = BillyYank Super Mega Baseball Guide 3rd Edition (`reference-docs/BillyYank_Super_Mega_Baseball_Guide_3rd_Edition.docx`) — ground truth for game behavior.
- `[WB]` = Team Builder Archetype Logic Template workbook (`spec-docs/reference/Team_Builder_Archetype_Logic_Template.xlsx`).
- `[CODE]` = kbl-mode1 source (`/Users/johnkruse/Projects/kbl-mode1/...`).
- `[JESTER]` = Jester's SMB Reference V2 workbook (`reference-docs/...`) — stats tracker; holds NO trait/chemistry math.

---

## 2. The SMB4 Chemistry / Trait-Potency Mechanic (Ground Truth)

### 2.1 The five chemistry types — CONFIRMED

Every player belongs to exactly **one** of five color-coded chemistry types:

| Chemistry | Color | Source |
|---|---|---|
| Spirited | yellow | `[GUIDE]` line 72 |
| Competitive | orange | `[GUIDE]` line 72 |
| Disciplined | purple | `[GUIDE]` line 72 |
| Crafty | green | `[GUIDE]` line 72 |
| Scholarly | blue | `[GUIDE]` line 72 |

Codified identically in `[CODE]` `traitPricing.ts:21` (`ChemistryType` union = `'Competitive' | 'Crafty' | 'Disciplined' | 'Scholarly' | 'Spirited'`) and `[CODE]` `chemistryCanonical.ts:10-12` (codes SPI/DIS/CMP/SCH/CRA). The workbook `[WB]` `Traits` sheet `CHEM TYPE` column carries exactly one of these per trait.

**Do not conflate** chemistry *type* (the family — one of 5) with chemistry *level* (the potency tier — 1/2/3). They are orthogonal dimensions.

### 2.2 Each trait carries a chemistry — CONFIRMED

Every one of the 75 traits is tied to exactly one chemistry type `[GUIDE]` line 128; `[WB]` `Traits.CHEM TYPE`. A trait's *eligibility* is NOT restricted by the holder's chemistry — any player may hold any position-appropriate trait `[CODE]` TRAIT_INTEGRATION_SPEC §2.1. Chemistry only governs **potency**.

### 2.3 Potency tier = f(team count of that chemistry) — CONFIRMED (this is the crux)

The single most important mechanic, stated verbatim `[GUIDE]` line 326:

> "The size of the effect of each trait is determined by **how many players on your team have the corresponding Chemistry type**. If there are fewer than three players of any Chemistry, traits of that type will provide a minimal bonus. If there are between three and six players of a given Chemistry, corresponding traits will give a mid-level bonus. If there are seven or more players of a certain Chemistry type, the corresponding traits will have an enormous bonus. The game refers to this system as trait potency... level 1 (0-2 players), level 2 (3-6 players), or level 3 (7+ players)."

**A trait's potency depends on the team count of THAT TRAIT'S OWN chemistry — NOT the chemistry of the player holding the trait.** Worked game example `[GUIDE]` line 1497: a player (Ronero) holding Big Hack (a Scholarly trait) draws more walks because the team has 7+ Scholarly players — Big Hack scales with the Scholarly *player count*, regardless of Ronero's own chemistry.

### 2.4 Canonical thresholds — CONFIRMED (JK-ratified 2026-06-22)

| Level | Players of the trait's chemistry on team | Bonus magnitude `[GUIDE]` wording |
|---|---|---|
| **L1** | 0–2 (fewer than 3) | minimal |
| **L2** | 3–6 | mid-level |
| **L3** | 7+ | enormous |

`[GUIDE]` line 326; restated `[CODE]` `smb4_traits_reference.md:6-8`. JK ratified these exact boundaries on 2026-06-22.

> **THRESHOLD CONFLICT — flag, do not assert code as truth.** The live code uses **off-by-one** boundaries: `[CODE]` `chemistryFitValue.ts:4-5` sets `CHEMISTRY_FIT_L2_MIN=4`, `CHEMISTRY_FIT_L3_MIN=8` → L1=0–3, L2=4–7, L3=8+ (tagged "RB-16 sim-tune"). Separately, `[CODE]` TRAIT_INTEGRATION_SPEC §4 defines a **non-game 4-tier model** (0–3/4–7/8–11/12+, multipliers 1.00/1.25/1.50/1.75) — the game has only 3 levels. **JK ruled the 4/8 code be corrected to 3/7.** That correction is pending (read-only here).

### 2.5 The per-level value scale — ⚠ CODE-vs-SOURCE DISCREPANCY at the strong tier (VALIDATED 2026-06-22)

**The canonical valuation source — `XBL Test Texas Rangers.xlsx` `ImportedTraits` (byte-identical to the repo template; see Provenance) — encodes the per-level ramp as `0.5 / 1.0 / 3.0` relative to L2.** VALIDATED cell-for-cell across many traits (raw Block1/Block2/Block3, relative to Block2):

| Trait | Pol | L1 (×L2) | L2 | L3 (×L2) | Raw |
|---|---|---|---|---|---|
| Cannon Arm | + | 0.51 | 1.0 | **3.0** | 23 / 45 / 135 |
| Tough Out | + | 0.50 | 1.0 | **3.0** | 5 / 10 / 30 |
| Big Hack | + | 0.55 | 1.0 | **3.0** | 6 / 11 / 33 |
| Sprinter | + | 0.60 | 1.0 | **3.0** | 3 / 5 / 15 |
| Whiffer / Noodle / Choker / Wild Thrower (neg, columns reversed) | − | **3.0** (harshest @ L1) | 1.0 | 0.5 (mildest @ L3) | e.g. Whiffer 8/15/45 |

So the workbook ramp is **positive: L1 0.5× / L2 1.0× / L3 3.0×; negative (inverted by chemistry level): L1 3.0× / L2 1.0× / L3 0.5×.** Confirmed direction matches the game (negatives get milder as chemistry rises).

**The CODE disagrees at the strong tier.** `[CODE]` `rosterEngineConstants.ts:41-48` `POTENCY_SCALE` = positives `{L1:0.5, L2:1.0, L3:2.0}`, negatives/standardInverted `{L1:2.0, L2:1.0, L3:0.5}`:

| Tier | Code positives | **Workbook positives** | Code negatives | **Workbook negatives** |
|---|---|---|---|---|
| L1 | 0.5 | 0.5 ✓ | 2.0 | **3.0** ✗ |
| L2 | 1.0 | 1.0 ✓ | 1.0 | 1.0 ✓ |
| L3 | **2.0** | **3.0** ✗ | 0.5 | 0.5 ✓ |

The code's extreme tier is **2.0×**; the canonical workbook's is **3.0×** — the code **undershoots strong-tier potency (positive L3 and negative L1) by ~33%.** The `2.0` was set to match the BillyYank guide's loose "×1/×2/×4" wording (`[GUIDE]` 339/348/363), which normalizes to L3=2.0×L2; but the **guide's prose and the workbook's actual per-trait columns disagree** (guide L3 ≈ 2× L2, workbook L3 = 3× L2). `IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md:144` repeats the 0.5/1.0/2.0 "game-faithful" claim — it is faithful to the *guide wording*, NOT to the canonical valuation workbook. **This is a real fix candidate (§9.7), now validated against the source JK identified.** (Currently DORMANT: all live IV callers run at L2, so L3/L1 potency is not yet computed in production — but any potency-true valuation or scout L1/L3 adjustment must use the canonical 3.0×, not 2.0×.)

**Negative-trait inversion direction is REAL in the game** (not just a KBL ruling): K Neglecter VEL −30→−15→−8 `[GUIDE]` line 382; Whiffer CON −50→−25→−12 `[CODE]` `smb4_traits_reference.md:30`. Negatives get *less* harmful as the matching chemistry count rises, so the code's `standardInverted` direction is correct; only its strong-tier magnitude (2.0 vs the workbook's 3.0) is off.

> **Empirical IV behavior (prior run wqv2dgtiz):** a positive trait ~halves at L1 and ~doubles at L3 (L2→L3 ≈ +112–115%; L2→L1 ≈ −48–52%); the L1↔L3 *input* spread is ~4x; the *dollar* output is super-linear (convex marginal curve). The scale applies to the rating-equivalent **deltas only** — never to the `flatFee`/`multiplier` columns.

### 2.6 What the reference docs did NOT confirm (UNKNOWNS)

- **Self-inclusion edge case** is guide-IMPLIED, not guide-EXPLICIT. The guide says "how many players on your team have the corresponding Chemistry type"; whether the trait-holder counts toward his own trait's potency is spelled out only in `[CODE]` TRAIT_INTEGRATION_SPEC §2.3 (it does count — the holder is a player on the team). Treat as spec-asserted, guide-implied.
- **The chemistry denominator.** `[GUIDE]` says "the 22 players on your roster" — strongly implies the full active roster, but does NOT pin whether it is the 22-man active roster, the in-game 9, or includes DH-only/pitcher subsets/two-way players. UNKNOWN.
- **Exact negative-scaling rule.** The guide gives discrete per-trait numbers (−30/−15/−8) rather than a uniform multiplier; whether every negative is exactly x1/x0.5/x0.25 of its L1 value or trait-specific is not uniformly specified.
- **`[JESTER]` holds no trait/chemistry math** — it is a stats/awards tracker. Its CODES "BATTER TRAITS" column is a 75-name dropdown with no values. Do not cite it for the mechanic.
- **`[CODE]` `TRAIT_MEASUREMENT_SPEC.md` is about KBL trait *acquisition*** (awarding traits via performance proxies), NOT in-game potency. Do not cite for the mechanic.

---

## 3. The Trait-Value Table (L1 / L2 / L3)

### 3.1 Where the values live — CONFIRMED

The workbook stores trait values in **two forms** `[WB]`:
- **`Traits` sheet** = a SINGLE value per trait. Cell-for-cell comparison proves this single value **IS the Level-2 value** (`Traits` stat cols == `ImportedTraits` L2 block, **0 mismatches across all 600 cells** = 75 traits × 8 attrs).
- **`ImportedTraits` sheet** = explicit per-level L1/L2/L3 blocks. Banner r0 labels: Block1 = "POSITIVE 1 NEGATIVE 3", Block2 = "POSITIVE 2 NEGATIVE 2", Block3 = "POSITIVE 3 NEGATIVE 1".

The reason the live model (`[CODE]` `traitPricing.ts`, header :1-17) reads only the single L2 value is the league rule **"Restrict Teams to Level 2 Chemistry = TRUE"** `[WB]` `LeagueSettings` r20-21 (see §5).

> **Negative-level numbering is INVERTED** in the `ImportedTraits` banner: a negative trait's harshest (x3) penalty sits in the block *labeled* L1 ("NEGATIVE 3"). Read the banner, not the column position, when wiring negatives.

### 3.2 The L2 baseline table (codified) — CONFIRMED 75 traits

The live codified L2 baseline is `[CODE]` `traitPricing.ts:32-483` — exactly 75 entries. **Polarity: 55 positive / 20 negative.** Two pricing mechanisms coexist:
- **65 traits** carry rating-equivalent stat deltas (orderable by Σ|deltas|).
- **10 traits** have all deltas = 0 and are priced ENTIRELY via `flatFee` + per-attr `multiplier` (the Elite-pitch traits + Reverse Splits + Specialist). These are NOT comparable on the delta scale.
- **3 traits are HYBRID** (deltas AND flatFee/multiplier): Workhorse, K Collector, Rally Stopper.

**Full L2 baseline, ordered by value-signal** (Σ|deltas| within the 65 delta traits, ranks 1–65; the 10 pure-$ traits appended ranks 66–75 by `flatFee`). Chemistry families: SPI=Spirited, DIS=Disciplined, SCH=Scholarly, CMP=Competitive, CRA=Crafty.

| # | Trait | Chem | Pol | L2 value-signal |
|---|---|---|---|---|
| 1 | Two Way (IF) | SPI | + | POW+15 CON+15 SPD+15 FLD+10 (Σ55) |
| 2 | Two Way (OF) | SPI | + | POW+15 CON+15 SPD+20 (Σ50) |
| 3 | Cannon Arm | CMP | + | ARM+45 |
| 4 | Two Way (C) | SPI | + | POW+15 CON+15 SPD+15 (Σ45) |
| 5 | Workhorse | CMP | + | VEL+14 JNK+14 ACC+14 (Σ42) + flatFee $2000 |
| 6 | Wild Thrower | CRA | − | ARM−30 |
| 7 | Bad Ball Hitter | CRA | + | POW+15 CON+12 |
| 8 | Sign Stealer | CRA | + | POW+15 CON+12 |
| 9 | Noodle Arm | CMP | − | ARM−25 |
| 10 | Clutch | SPI | + | POW/CON/SPD+2.5 FLD/ARM+1 VEL+5 JNK/ACC+4 (Σ22.5) |
| 11 | K Collector | CMP | + | VEL+9 JNK+9 ACC+4 + flatFee $2000 |
| 12 | Stimulated | CRA | + | all-attr +2 / VEL/JNK/ACC+4 (Σ22) |
| 13 | Choker | SPI | − | −2 to all 8 (Σ16) |
| 14 | RBI Zero | SPI | − | POW−10 CON−6 |
| 15 | Butter Fingers | DIS | − | FLD−15 |
| 16 | Whiffer | CMP | − | CON−15 |
| 17 | Ace Exterminator | SCH | + | POW+10 CON+3 |
| 18 | Dive Wizard | SPI | + | FLD+7 ARM+5 |
| 19 | Magic Hands | DIS | + | FLD+5 ARM+7 |
| 20 | Pinch Perfect | DIS | + | POW+6 CON+6 |
| 21 | RBI Hero | SPI | + | POW+7 CON+5 |
| 22 | Surrounded | SPI | − | VEL−4 JNK−4 ACC−4 |
| 23 | Utility | SCH | + | FLD+6 ARM+6 |
| 24 | Big Hack | SCH | + | POW+11 |
| 25 | Rally Stopper | SPI | + | VEL+5 JNK+3 ACC+3 + VEL×1.15 + flatFee $2000 |
| 26 | Fastball Hitter | DIS | + | POW+3 CON+7 |
| 27 | High Pitch | DIS | + | POW+5 CON+5 |
| 28 | Inside Pitch | DIS | + | POW+5 CON+5 |
| 29 | Low Pitch | DIS | + | POW+5 CON+5 |
| 30 | Off-Speed Hitter | DIS | + | POW+3 CON+7 |
| 31 | Outside Pitch | DIS | + | POW+5 CON+5 |
| 32 | Rally Starter | SPI | + | CON+10 |
| 33 | Tough Out | CMP | + | CON+10 |
| 34 | Wild Thing | SPI | − | ACC−10 |
| 35 | Volatile | DIS | + | +1.2 to all 8 (Σ9.6) |
| 36 | Crossed Up | SCH | − | VEL−2.5 JNK−2.5 ACC−4 |
| 37 | K Neglector | CMP | − | VEL−5 JNK−4 |
| 38 | Durable | CMP | + | +1 to all 8 |
| 39 | Injury Prone | CMP | − | −1 most / VEL−0.9 (Σ7.9) |
| 40 | Bad Jumps | CRA | − | SPD−7 |
| 41 | Falls Behind | SCH | − | ACC−7 |
| 42 | POW vs LHP | SPI | + | POW+6 CON+1 |
| 43 | POW vs RHP | SPI | + | POW+6 CON+1 |
| 44 | Stealer | CRA | + | SPD+7 |
| 45 | Easy Jumps | CRA | − | VEL−2 JNK−2 ACC−2 |
| 46 | First Pitch Prayer | CMP | − | POW−2 CON−4 |
| 47 | First Pitch Slayer | CMP | + | POW+2 CON+4 |
| 48 | Base Jogger | DIS | − | SPD−5 |
| 49 | CON vs LHP | SPI | + | CON+5 |
| 50 | CON vs RHP | SPI | + | CON+5 |
| 51 | Easy Target | CRA | − | POW−2 CON−3 |
| 52 | Mind Gamer | CRA | + | POW+2 CON+3 |
| 53 | Slow Poke | CMP | − | SPD−5 |
| 54 | Sprinter | CMP | + | SPD+5 |
| 55 | Pick Officer | CRA | + | VEL+1.5 JNK+1.5 ACC+1.5 |
| 56 | Bunter | SCH | + | CON+2 SPD+2 |
| 57 | Composed | DIS | + | ACC+4 |
| 58 | Gets Ahead | SCH | + | ACC+4 |
| 59 | Distractor | CRA | + | SPD+3.5 |
| 60 | Consistent | DIS | + | +0.4 to all 8 (Σ3.2) |
| 61 | BB Prone | DIS | − | ACC−3 |
| 62 | Little Hack | SCH | + | CON+3 |
| 63 | Base Rounder | DIS | + | SPD+2.5 |
| 64 | Meltdown | SPI | − | ACC−2 |
| 65 | Metal Head | DIS | + | VEL/JNK/ACC+0.03 (Σ0.09) |
| 66 | Elite 4F | SCH | + | deltas 0 — flatFee **$22000**; VEL×1.9 ACC×1.1 |
| 67 | Reverse Splits | CRA | + | deltas 0 — flatFee $8000; VEL×1.45 JNK×1.4 ACC×1.4 |
| 68 | Specialist | CRA | + | deltas 0 — flatFee $4000; VEL×1.3 JNK×1.4 ACC×1.3 |
| 69 | Elite CH | SCH | + | deltas 0 — flatFee $3000; VEL×1.25 JNK×1.05 ACC×1.1 |
| 70 | Elite SB | SCH | + | deltas 0 — flatFee $500; VEL×1.05 JNK×1.6 ACC×1.1 |
| 71 | Elite 2F | SCH | + | deltas 0 — flatFee $500; VEL×1.18 JNK×1.45 ACC×1.1 |
| 72 | Elite CF | SCH | + | deltas 0 — flatFee $500; VEL×1.18 JNK×1.45 ACC×1.1 |
| 73 | Elite CB | SCH | + | deltas 0 — flatFee $500; VEL×1.1 JNK×1.48 ACC×1.1 |
| 74 | Elite SL | SCH | + | deltas 0 — flatFee $500; VEL×1.05 JNK×1.4 ACC×1.1 |
| 75 | Elite FK | SCH | + | deltas 0 — flatFee $500; VEL×1.1 JNK×1.1 ACC×1.1 |

> **Ordering caveats:** (a) Σ|deltas| is a PROXY, not dollars — per-attr cost curves in the IV engine vary sharply (ARM/VEL carry premiums), so two equal-sum traits are NOT equal in price. (b) Ranks 66–75 are NOT "cheapest" — Elite 4F at $22000 is the single most expensive trait in the set; the pure-$ traits are priced on a different axis. (c) The 3 hybrids (5, 11, 25) are *understated* by their delta rank because their flatFee/multiplier is not in the Σ.

### 3.3 Deriving L1 / L3 from the L2 baseline

Because the live data is L2-only, L1 and L3 are derived by the §2.5 scale applied to the **deltas only**:

- **Positive trait:** `L1_delta = 0.5 × L2_delta`, `L3_delta = 2.0 × L2_delta`.
- **Negative trait:** `L1_delta = 2.0 × L2_delta` (harshest), `L3_delta = 0.5 × L2_delta` (mildest).
- **`flatFee` / `multiplier` columns: NOT scaled by the IV potency machinery** — they pass through unchanged.

The workbook `ImportedTraits` sheet provides an INDEPENDENT cross-check of the derived L1/L3. The workbook's own L3 is **exactly 3× its L2** for most traits (e.g. Cannon Arm ARM 23/45/135; Clutch L2→L3 ≈ 3×), and its L1 ≈ L2. **This does NOT match the 0.5/2.0 scale** — the workbook encodes a *different* per-level ramp than the IV engine's potency scale. This is a real discrepancy to surface (§9).

> **Off-pattern traits — flagged, NOT corrected.** Several `ImportedTraits` rows break monotonic L1<L2<L3: Consistent (L1=1.0, L2=0.4, L3=2.0), Metal Head (L1=1.0, L2=0.03, L3=1.0), Volatile (L2=1.2), Injury Prone (L2 VEL=−0.9). Reported verbatim; need a JK ruling before any engine consumes them.

---

## 4. The Teammate-vs-Self Value Dynamic (the Key Relationship)

### 4.1 The rule — CONFIRMED

A player's chemistry type contributes **+1 to the team count of HIS chemistry**. That count boosts the potency of **every trait on the team whose chemistry matches his** — held by anyone. So:

- A player's chemistry **primarily benefits his TEAMMATES** — specifically, teammates holding traits of his chemistry.
- A player's chemistry benefits **his own traits only IF his own traits share his own chemistry type**.
- There is **no special own-trait coupling**: the count is roster-wide and chemistry-typed. His chemistry helps his own matching-chemistry trait *exactly as much* as it helps a teammate's matching-chemistry trait — each is +1 to the same team count `[CODE]` TRAIT_INTEGRATION_SPEC §2.2–2.3.

### 4.2 Worked examples

**Example A — chemistry-aligned star (immense value).** A player whose two traits are both Two Way (IF) and Cannon Arm (the two highest-value positive traits), whose chemistry is the SAME family as those traits, AND whose addition takes the team from 6→7 of that chemistry (L2→L3):
- His own two traits jump to L3 (2.0× deltas).
- *Every* teammate's trait of that chemistry also jumps L2→L3.
- He improves himself AND every same-chemistry teammate simultaneously. This is the maximal-value archetype.

**Example B — chemistry-aligned but negative traits.** Same chemistry-alignment and same L2→L3 team transition, but his own traits are negative:
- His own production stays **net-negative** (negatives invert: at L3 his flaws are *mildest*, 0.5×, but still negative).
- He STILL lifts every same-chemistry teammate's *positive* trait from L2→L3.
- Net: a liability to himself, an asset to his teammates. His value is almost entirely a **team-composition lever**, not personal production.

**Example C — chemistry-misaligned holder.** A Spirited player holding a Scholarly trait:
- His Spirited chemistry does **nothing** for his own Scholarly trait.
- It only boosts the team's Spirited traits held by others.
- His own trait's potency is set by the team's **Scholarly** count, which he does not contribute to.

**Implication:** the value of a player is not separable from roster context. The same player is worth different amounts on different rosters depending on (a) whether his chemistry pushes a count across a 3 or 7 threshold, and (b) whether his own traits share his chemistry.

---

## 5. The IV-Engine L2-Baseline MISMATCH Problem

### 5.1 The XBL-mandate origin — CONFIRMED

The workbook can assume all traits are Level 2 because the **XBL league RULES mandate it**: `[WB]` `LeagueSettings` r20-21 **"Restrict Teams to Level 2 Chemistry = TRUE"**. Under that rule every team must hold ≥3 and <7 of every chemistry, pinning every trait to L2. That is exactly why the single-value `Traits` sheet equals the L2 block (§3.1).

**KBL franchise mode has NO such rule.** Therefore trait potency genuinely varies across L1/L2/L3 in franchise play, and the IV engine's L2 assumption is **structurally wrong for franchise mode**.

### 5.2 Where the L2 assumption is baked in — CONFIRMED (file:line)

| Path | Potency live? | Pin site |
|---|---|---|
| **Raw layer, ALL players** | NO — hard-pinned L2 | `scaledDeltas(entry,'L2')` `[CODE]` `ivEngine.ts:349` (the `potency` param is threaded in at :308/:645 but **unconsumed** in the raw loop — cosmetic) |
| **Hitter kbl layer** | NO — clone of raw | `kbl = cloneBreakdown(raw)` `[CODE]` `ivEngine.ts:648` |
| **Pitcher kbl layer** | **YES** | `scaledDeltas(entry, potency)` `[CODE]` `ivEngine.ts:592`; `twoWayTraitComponent(...potency)` :585 |
| **OVR / 20-80 grade (any player)** | NO — potency absent entirely | `ovrCalculator.ts` never imports PotencyTier; chemistry enters only as a fixed OLS grade offset :181-187 / :234-240 |

`scaleDelta` short-circuits to identity at L2 (`if (value === 0 || potency === 'L2') return value`, `[CODE]` `ivEngine.ts:231`), so L2 is the neutral tier.

**Reality of the potency machinery:**
- It is **live for exactly ONE population: pitchers' kblIV.** For hitters, `computeKblLayer` is never entered — the hitter kblIV is a verbatim clone of the L2-pinned raw. Oracle proof: hitter bee-balmer rawIV === kblIV === 33250.
- `computeIV(player, curves, traitEntries, potency='L2')` `[CODE]` `ivEngine.ts:638-643` — `potency` is **one scalar per whole player**, applied uniformly to trait1 AND trait2. There is **no per-trait potency** anywhere; `IVPlayerInput.traits` (:47) is name-only with no chemistry/team-count carrier.
- **All four live callers pass the default L2** (no potency arg): `salaryCalculator.ts:742`, `rosterAnalyzer.ts:571`, `subRecommendations.ts:157`, `scripts/t5-denomination-bridge.ts:181`. So even the pitcher potency machinery is **currently inert in production** — everything runs at L2 neutrality.
- The **20-80 grade is potency-BLIND** (`smb4GradeEmulator scoreSmb4Player`, traits flat) → a player's grade is fixed across all teams; only *price* should ever move with chemistry.

### 5.3 The over/under-valuation consequence — INFERENCE from confirmed mechanics

Because franchise players are priced at a false L2 standard:
- **Players whose traits actually end at L1 are OVER-valued** — held to an L2 standard they don't reach; their true positive value is lower (and for them, true value is harder to push positive).
- **Players whose traits end at L3 are UNDER-valued** — held to a lower standard than they actually deliver.

Whether this mispricing is a **bug or a feature** for team-building is an OPEN QUESTION (§9): a market that prices everyone at L2 rewards the GM who *knows* a prospect will reach L3 on his roster (information edge), but it also means the listed IV is not the player's true value on any specific roster.

### 5.4 The frozen-oracle constraint — CONFIRMED (what cannot change without re-bless)

`iv_oracle.json` is locked by `[CODE]` `ivEngine.test.ts` G1–G10 at the **default L2 potency** (the oracle JSON stores NO `potency` field). FROZEN and immutable without a re-bless:

- (a) every player's **rawIV** (G1 anchors ±$0; G2 all-440) — the L2-pinned raw trait pricing for BOTH populations;
- (b) **hitter kblIV** (= clone of raw, identical lock);
- (c) **pitcher kblIV at default L2** (G3 named caps: crc-fenomeno 143641, bee-pastimm 199126, wpg-drake 101003, blf-bradwick 58417);
- (d) the **L2-neutrality invariant** itself (G10: raw is potency-invariant; pitcher kbl IS potency-sensitive).

**FREE to change (NOT oracle-protected):** pitcher kblIV at **L1/L3** (the oracle only pins L2). **CANNOT change without re-bless:** making L2 raw pricing team-count-dependent, or making hitter kblIV potency-sensitive (would break G1/G2/G3). `ovrCalculator` does NOT feed the oracle and is unconstrained by it — but it is also **ORPHANED** (zero callers in src/ or scripts/), so it is not a vehicle for live potency today.

---

## 6. Valuation Contexts: MLB-Now vs Farm-Call-Up

### 6.1 Two contexts — CONFIRMED

| Context | Chemistry-count source | Live? | Chemistry-fit applied? |
|---|---|---|---|
| **MLB auction** | n/a | — | **NO** — zero chemistry code (`useAuctionDraft.ts`, grep empty) |
| **Farm auction (baseline)** | completed MLB roster, `getRoster().mlbRoster` | fixed snapshot at load | YES `[CODE]` `useFarmAuctionDraft.ts:171-198` |
| **Farm auction (live)** | `session.teams[].roster` (won prospects) | reactive on `session` | YES `[CODE]` `LeagueBuilderFarmAuctionDraft.tsx:133-145, 224-232` |

**Asymmetry (confirms the design framing):**
- **MLB picks affect chemistry NOW** — they join the active roster, so their chemistry counts immediately. (Yet today the MLB auction does NO chemistry re-pricing at all.)
- **Farm picks affect the MLB team only IF called up.** The farm auction prices a prospect's marginal fit against the *completed MLB roster* (fixed snapshot) merged with prospects already won in the live farm auction.

### 6.2 The chemistry-fit engine — CONFIRMED

`[CODE]` `chemistryFitValue.ts`: tier from count (`chemistryFitTier` :17-22), `marginalChemistryValue` (add/remove, :24-47), and the live price function `chemistryFitPriceMultiplier = 1 + addValue × 0.08` (BUMP_MAX, :49-57). **Note: this is a DIFFERENT axis from the IV potency scale** — it is a small, capped (+8%) headcount nudge on perceived price, using the off-by-one 4/8 thresholds (§2.4), NOT the 0.5/1.0/2.0 trait-delta scale.

Live scout seam: `[CODE]` `LeagueBuilderFarmAuctionDraft.tsx:93-94` — `scoutPriceOpinion(...) × chemFit → perceivedValueRange`.

### 6.3 The call-up replacement ripple — UNMODELED

A call-up REPLACES a roster player. Removing that player removes his chemistry, which can drop a chemistry count below a threshold and **re-tier every trait of that chemistry DOWN** for the whole team.

| Mechanic | Primitive exists? | Live caller? | Site |
|---|---|---|---|
| Add chemistry → up-tier (price bump) | YES | YES (current lot only) | `chemistryFitValue.ts:28-38`; `tsx:93` |
| Remove chemistry → down-tier ripple | YES (`'remove'`) | **NO (orphaned)** | `chemistryFitValue.ts:41-46`; only ref is the type at :9 |
| Call-up recomputes team chemistry | NO | NO | `franchiseRosterMovement.ts:712-849` (zero chemistry refs) |

Two call-up implementations exist and **neither touches chemistry**: `franchiseRosterMovement.ts:712 callUpFranchisePlayer` (full path — ledger + transaction, flips rosterStatus FARM→MLB) and `farmStorage.ts:223 callUpPlayer` (deletes farm record only). The `'remove'` down-tier primitive is buildable from existing parts but is **not wired**, and `chemistryFitPriceMultiplier` is **add-only** (`'add'` hardcoded :55) — so even a per-pool scout would price only the upside of adding chemistry, never the call-up-replacement downside. The `rosterAnalyzerEngine` lumps MLB+farm into one chemistry bag (:604) and emits advisory balance notes only (:909-929), with NO L1/L2/L3 re-tiering.

> UNKNOWN: whether a call-up even *forces* a same-transaction send-down (the "must REPLACE" premise) is itself unmodeled — the call-up functions add a player and respect a roster cap but do not pair the call-up with a specific removal.

---

## 7. The Marginal Step-Value Model

### 7.1 The model — derived from confirmed mechanics

Potency is **count-based**, so the value of adding one player of chemistry X is the **transition that +1 causes given the current count of X**:

| Current count of X | +1 effect | Marginal value |
|---|---|---|
| 0,1 → next | stays L1 | **~0 (L1 floor — L1 is the default; ~no lift)** |
| 2 → 3 | L1 → L2 **level-up** | **HIGH** (every X-trait on team jumps 0.5→1.0) |
| 3,4,5 → next | stays L2 (buffer) | **low (buffer)** — protects against future loss but no immediate lift |
| 6 → 7 | L2 → L3 **level-up** | **HIGH** (every X-trait jumps 1.0→2.0) |
| 7+ → next | stays L3 | **~0 (capped)** |

So the value ranking of a +1 is: **level-up (2→3 or 6→7) ≫ buffer (3–5 within L2) ≫ L1-floor (~0)**. `[CODE]` `chemistryFitValue.ts` encodes a version of this (level-up = +1, buffer = +0.4) but at the off-by-one 4/8 thresholds.

### 7.2 No single player swings L1→L3 — CONFIRMED design point

Going from L1 to L3 for one chemistry requires **5 adds** (2→7). No single pick does it. This is why value is intrinsically marginal/contextual.

### 7.3 Draft-timing emergence — INFERENCE (falls out automatically)

Because value is count-based and threshold-driven, the **"low value early / high value late"** draft behavior **emerges with no special-casing**: early in a build most chemistries sit at L1 (a +1 just floors at ~0 or sits in buffer), but as a chemistry approaches 3 or 7, the *next* pick of that chemistry triggers a level-up and spikes in value. The GM who has stacked 6 of a chemistry suddenly values the 7th enormously. This is the correct, desired behavior and requires only that the scout read the **current** count.

---

## 8. The Adaptive-Per-Pick Scout

### 8.1 Requirement

A fully adaptive draft scout would **recompute every available prospect's chemistry/trait value after each pick**, as the roster's chemistry counts change — so a prospect that was floor-value early becomes a level-up trigger later, automatically.

### 8.2 Current state — CONFIRMED partial

Today the page recomputes counts and re-prices **only the CURRENT auction lot**: `scoutRangeForProspect` is called once (`tsx:233`, `currentLotRange`) and rendered once (`tsx:519`). `availablePoolCandidates` (`tsx:305`) is used only for blocker counts, NOT valuation. The won-prospect roster IS live and reactive (`session.teams[].roster`, memoized at `tsx:216`, dependency includes `session`).

### 8.3 Feasibility — CONFIRMED no architectural blocker

Per-pick adaptivity is a **straightforward extension, not a rebuild**:
- **Hook point:** the existing `useMemo` at `tsx:224-240`, extended to a `Map<prospectId, ScoutValueRange>` over `availablePoolCandidates`, keyed on `session` (already a dependency).
- **Cost:** counts recompute is O(roster) per prospect; over the pool it is O(pool × roster) — trivial at league scale (tens of prospects × ~25 roster).

> **GOTCHA — adaptivity vs the call-up ripple (§6.3).** A *true* adaptive scout for farm prospects should also model that winning a prospect could later force a call-up that REMOVES a chemistry and down-tiers traits. But `chemistryFitPriceMultiplier` is **add-only**, so even a per-pool loop prices only the upside. The downside primitive (`marginalChemistryValue 'remove'`) exists but is not exposed through any price function. A complete adaptive scout needs the `'remove'` branch surfaced.

---

## 9. Open Questions / Decision Surface for JK

Each item below is a decision, not a recommendation. CONFIRMED facts are cited; the choice is JK's.

### 9.1 Thresholds — correct the code to canonical 3/7
JK already ruled (2026-06-22) the code's 4/8 (`chemistryFitValue.ts:4-5`) be corrected to the game-canonical 3/7. **Decision: confirm scope** — does the correction also retire the non-game 4-tier model in TRAIT_INTEGRATION_SPEC §4 (which has an impossible 12+ Tier 4)?

### 9.2 Is the L2 mispricing a bug or a feature?
Franchise prices everyone at L2; L1-ending players are over-valued, L3-ending under-valued (§5.3). **Decision:** (a) accept it as an information-edge market (the GM who knows a prospect will hit L3 on his roster gets a bargain), or (b) make IV potency-true so listed value reflects the player's actual tier on the target roster.

### 9.3 Engine change vs scout-layer-only
Two ways to make valuation reflect real potency:
- **Engine route (deep):** per-trait potency in the IV engine — requires (1) a trait-with-chemistry input carrier (today `IVPlayerInput.traits` is name-only, `ivEngine.ts:47`), (2) a `(chemistry, sameChemistryCount) → tier` derivation step (none exists; tier is always hand-passed), (3) per-trait `scaledDeltas` in every trait loop, (4) team-context threading into all four computeIV callers (IV becomes roster-dependent, not pure-per-player).
- **Scout route (shallow):** leave the IV engine at L2 and adjust only the **perceived** value at the scout seam (`tsx:93`) via the chemistry-fit multiplier and an adaptive per-pick loop (§8). No oracle risk.

**Decision: which layer carries potency?** The scout route is far cheaper and oracle-safe; the engine route makes *every* IV consumer (salary, roster analyzer, subs) potency-true.

### 9.4 Price-vs-flag
**Decision:** should chemistry potency move the **dollar value** (price), or just **flag** to the GM ("this prospect is L1 on your roster — discount it / will be L3 if you add 2 more Scholarly")? Flagging preserves a stable market price while informing the human; pricing bakes context into the number.

### 9.5 Model the call-up replacement ripple?
The down-tier ripple on call-up is unmodeled; the `'remove'` primitive exists but is orphaned, and call-up functions ignore chemistry entirely (§6.3). **Decision:** model the ripple (wire `'remove'` + recompute chemistry on call-up/send-down), or leave it as known-not-modeled. Also unresolved: does a call-up even force a paired send-down?

### 9.6 Un-pin the hitter raw layer, or keep the oracle frozen?
Today hitters are L2-only (raw clone, `ivEngine.ts:648`); only pitcher kblIV can express potency, and even that is inert (all callers default L2). Making hitter kblIV potency-sensitive **breaks G1/G2/G3 and requires an oracle re-bless** (§5.4). **Decision:** (a) keep the oracle frozen and express all potency at the scout/perception layer only (no re-bless), or (b) give hitters a real kbl layer and re-bless the oracle. Note: pitcher kblIV at L1/L3 is *already* free (not oracle-pinned); only L2 and hitters are locked.

### 9.7 Workbook ramp vs IV scale discrepancy — VALIDATED against the canonical source (the likely-correct fix)
The canonical valuation workbook (`XBL Test Texas Rangers.xlsx` `ImportedTraits`, byte-identical to the repo template — see Provenance) encodes the strong tier as **3.0× L2** (positive L3 and negative L1), validated cell-for-cell (§2.5). The CODE's `POTENCY_SCALE` uses **2.0×** there — undershooting by ~33%. The `2.0` matches the BillyYank guide's loose "×1/×2/×4" prose, NOT the workbook columns the IV logic was actually built from. **Decision:** correct `POTENCY_SCALE.positives.L3` 2.0→3.0 and `standardInverted.L1` 2.0→3.0 to match the canonical source? (Worked impact: at L3 the IV engine would price Cannon Arm ARM as +135 not +90.) This is DORMANT today — all live callers run L2 — so the fix is safe to make now and only takes effect once potency goes live, but it must be settled before any potency-true valuation or scout L1/L3 adjustment (whose magnitude should anchor to 3.0×, not 2.0×). NOTE: the frozen oracle pins only L2, so changing the L3/L1 multipliers does NOT require an oracle re-bless (§5.4).

### 9.8 Off-pattern trait values
Consistent (L2=0.4), Metal Head (L2=0.03), Volatile (L2=1.2), Injury Prone (L2 VEL=−0.9) break monotonicity (§3.3). **Decision:** authoritative, or spreadsheet typos to normalize?

### 9.9 Elite-pitch traits — pure salary flag?
Elite 2F/4F/CB/CF/CH/FK/SB/SL, Specialist, Reverse Splits carry ZERO stat deltas — only `flatFee` (+ multipliers). **Decision:** confirm intended behavior is "pure salary / pitch-quality flag, no rating change," or are their effects modeled elsewhere (in-game pitch quality not in the sheet)?

### 9.10 Chemistry denominator
UNKNOWN whether the game counts chemistry over the full active roster, the in-game 9, or includes DH-only/two-way players (§2.6). **Decision / research:** pin the denominator before any potency-true valuation, since it changes every count.

### 9.11 Re-export the live source?
The workbook is an xlsx snapshot of a live Google Sheet (`[WB]` `Link` sheet, gid 223114768). **Decision:** re-export to confirm current canonical values before building anything on the extracted numbers.

---

**Provenance note (updated 2026-06-22 after JK identified the canonical source):**
- **The canonical valuation source is `XBL Test Texas Rangers.xlsx`** (a populated XBL league workbook; JK-supplied, currently at `~/Downloads/`). Its **valuation tabs are BYTE-IDENTICAL to the repo's `spec-docs/reference/Team_Builder_Archetype_Logic_Template.xlsx`** — verified 0 differing rows on `ImportedTraits`, `Traits`, `Cap Modifiers Reference`, `Lists`, `DynamicDropdown`. The only meaningful difference is the **`Roster` sheet** (the XBL file carries the real Texas Rangers — Eovaldi, deGrom, Leiter, Corbin… — the 21 dollar-anchors `T3_POOL_ANALYSIS.md` reproduces to ±$0). So the trait/rating/position/handedness/archetype tables this spec cites are the canonical ones; the template is a same-lineage copy.
- **The codified `traitPricing.ts` L2 values = the workbook `Traits` (= `ImportedTraits` L2) sheet** (T3-authoritative; reproduces the Rangers anchors ±$0). So the L2 trait table in §3.2 is canonical.
- **⚠ Open hygiene item (§9.11):** the canonical source lives only in `~/Downloads/`, not the repo. The repo holds the byte-identical template + the codified `traitPricing.ts`. RECOMMEND committing `XBL Test Texas Rangers.xlsx` (or a sanitized copy) into `reference-docs/` as the durable canonical source-of-truth, since it is "the source for how we value traits/ratings/positions/handedness/profile pieces."
- Extraction was read-only via openpyxl (no file modified). Code citations are from `kbl-mode1`.
- The Jester reference (`reference-docs/Jester's…xlsx`) is a stats/awards tracker only — NO trait/chemistry math; not a valuation source.
