# IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md
*(renamed 2026-06-09 from ROSTER_ANALYZER_ARCHETYPE_ENGINE_SPEC.md — scope grew beyond the original feature pair to the full player-valuation core and all three roster-intelligence surfaces)*
**Version:** 1.1.4 | **Date:** 2026-06-09 | **Status:** CANONICAL — approved by JK in spec session 2026-06-09
**Owner:** JK | **Drafted by:** Claude (Fable 5) from XBL Roster Tool workbook analysis + Billy Yank SMB4 Guide (3rd Ed.) + 10-question design session
**v1.1 (2026-06-09):** added §5.3 tax semantics clarification, §5.4 balanceMode toggle, T3 EV-flatness acceptance criterion, registry entry — per JK archetype-purpose review.
**v1.1.1 (2026-06-09):** §7.3 snake-draft solvency guardrail (hard block) + per-team green/yellow/red/blocked pick signals; `solvencyRedMargin` registry constant — closed gap JK identified (auction solvency rule was not extended to snake draft).
**v1.1.2 (2026-06-09):** auction endgame anti-exploit package (D14): percentile reserve curve, probabilistic hidden-valuation shills (no deterministic floor), declared-budget expectation anchor, collusion sunlight note, pool-size guidance + league-inflation report + nerfed-tail regeneration option — per JK auction-sandbagging review.
**v1.1.3 (2026-06-09):** §13 routing updated for Fable 5 CLI + Codex 5.5 builder/auditor decorrelation pattern; audit gate defined.
**v1.1.4 (2026-06-10):** T1 COMPLETE (Fable 5 built, Codex 5.5 audited: CONFORMS). Audit-confirmed workbook facts folded in: §3.4 sub-min scope note, §3.6 multiplier columns. §13 economic routing pattern (Fable plans/prompts/audits, Codex builds; T2 exception; diff-not-self-report rule; UI-build addendum).

---

## 0. Document Contract

This spec is the single source of truth for:
1. **The IV Engine** (Intrinsic Value) — replaces the base-salary portion of SALARY_SYSTEM_SPEC_UPDATED.md
2. **The Effective Ratings Engine** — context-adjusted player ratings (traits/mojo/fitness/handedness)
3. **Mode 1 League Construction Suite** — tiers, pool registration, team identities, snake draft, farm draft, (v1.5) auction
4. **Mode 2 Roster Analyzer** — Team Hub lineup optimization, call-up/send-down recommendations, season salary ledger
5. **GameTracker Sub Recommendation rebuild** — same engines, third surface

**Source-of-truth inputs (do not re-derive):**
- `Team_Builder_Archetype_Logic_Template.xlsx` (XBL Roster Tool, Season XIX Cup v1.0) — curve parameters, trait rating-equivalents, 44 cap modifications, luxury penalty curves. Committed copy required in `spec-docs/reference/`.
- Billy Yank SMB4 Guide 3rd Ed. — mojo/fitness/chemistry mechanics, trait activation conditions. Committed copy required in `spec-docs/reference/`.
- 440-player SMB4 DB (already in repo as TypeScript).

**Specs this document amends:**
- SALARY_SYSTEM_SPEC_UPDATED.md — IV Engine replaces Steps 1 (base rating salary), 2 (position multiplier), and the flat trait-tier tables in Step 4. SURVIVING UNCHANGED: chemistry potency multipliers (0.5×/1.0×/2.0×), age factor (except rookie-scale override §8.4), performance modifier, fame modifier, personality modifier, True Value percentile machinery, fan morale, FA swap rules, recalc schedule (Phases 3/8/10).
- FARM system salary treatment — draft-slot pricing replaced by scout-obscured IV (§7.4).

**Hard boundaries (must not change):**
- Qualified-league contract into Franchise Setup Wizard: 22 MLB + 10 farm players per team, regardless of construction path. Existing handoff implementation untouched.
- Hidden farm ratings until call-up.
- "No hard salary cap in franchise mode" principle — tier caps are Mode 1 construction-time only; they convert to soft payroll-expectation baselines in Mode 2 (§8.3).

**Named deferred spec (do not build here):** ROSTER_MOVEMENT_GAME_THEORY_SPEC — fan/player morale fallout from demotions, Fan Hopeful interactions, clubhouse churn effects. Until it exists, the dead-money ledger (§8.4) is the only in-season brake on roster-churn exploits.

---

## 1. Architecture Overview

```
                    +-----------------------------------------+
                    |              SHARED CORE                |
                    |                                         |
                    |  +----------+  +--------------------+   |
                    |  | IV Engine|  | Effective Ratings  |   |
                    |  | (sec 3)  |  | Engine (sec 4)     |   |
                    |  +----------+  |  - TraitInteraction|   |
                    |  +----------+  |    Matrix (4.3)    |   |
                    |  | Defensive|  |  - Mojo model      |   |
                    |  | Placement|  |  - Fitness/fatigue |   |
                    |  | Risk(4.5)|  +--------------------+   |
                    |  +----------+                           |
                    +-------+--------------+----------+-------+
                            |              |          |
              +-------------v--+  +--------v-----+  +-v--------------+
              | Mode 1 League  |  | Mode 2 Roster|  | GameTracker    |
              | Construction   |  | Analyzer     |  | Sub Recs (s10) |
              | Suite (sec 7)  |  | (sec 8-9)    |  | (rebuild)      |
              +----------------+  +--------------+  +----------------+
```

Data flow: Pool Registration (§7.2) → IV computed per player → Relative Pricing Layer (existing salary spec relativity) → construction caps (Mode 1) / True Value & ledger (Mode 2) / live sub evaluation (GameTracker).

---

## 2. Decisions Register (from design session, all approved by JK)

| # | Decision |
|---|----------|
| D1 | Archetypes = constraint system AND generative templates, layered (option C) |
| D2 | IV Engine replaces salary spec Steps 1, 2, and trait-tier tables; relativity stack survives |
| D3 | League tiers = pool bell-curve shift AND derived matching cap (option C). Observed stock SMB4 pool ≡ **Juiced**; Standard and Nerfed are leftward shifts |
| D4 | Two Mode 1 construction paths: hand-select 22 + farm draft, OR full snake draft (22 + farm). Same qualified-league output contract |
| D5 | This spec owns farm salary revision: **scout-obscured IV** (option A). True IV internal; displayed as scout-accuracy-dependent range; snaps to truth at call-up |
| D6 | Anti-exploit economy: rookie-scale call-up pricing (0.50× factor REPLACING age factor for call-up season) + season ledger dead money |
| D7 | Dead money default **75%**, league-configurable in Franchise Setup Wizard (`deadMoneyRate`: presets 100/75/50) |
| D8 | Season ledger model: charge = salary × status rate (active 100% / demoted-after-rostered 75% / never-rostered 0%). Re-call-up flips rate back; no stacking. Resets at offseason Phase 3 |
| D9 | Mode 2 optimizer philosophy: NOT a ratings-vs-form blend. Effective Ratings compose deterministically (§4); optimizer maximizes IV of effective ratings. Lineup delta WPA judged against this standard |
| D10 | v1 draft: snake, all-user-controlled, with IV-derived pick value trade chart. Auction = fully-specced v1.5 module incl. optional non-league AI shill bidders |
| D11 | Team identities: two-level (option C). Six Identity Bands on the surface; 44 spreadsheet modifications as composable mechanical vocabulary underneath |
| D12 | GameTracker sub rec engine rebuilt on shared core (replace, not patch) |
| D13 | (v1.1) Luxury tax = budget drain (soft cap), never a hard wall; `balanceMode` league toggle taxed/advisory/off, default taxed; XBL ratios/shapes port, constants re-derived per tier (T3) with EV-flatness verification |
| D14 | (v1.1.2) Auction anti-sandbagging: hard rules bound exploits (reserve curve, solvency, declared-budget anchor), soft agents create texture (probabilistic shills). League talent is SUPPLY-controlled (pool), not price-controlled — no round/grade restrictions |

---

## 3. IV Engine (Intrinsic Value)

### 3.1 Concept
IV = absolute, pool-independent on-field worth of a player, in dollars, computed from ratings + traits + pitch arsenal + handedness + secondary positions through position-specific per-attribute curves. IV is the **list price**; the surviving relativity stack turns it into league-contextual salary.

### 3.2 Two-Segment Attribute Curve (core primitive)
Each (position, attribute) pair has parameters `{min, curve1, mid, midSal, curve2, sal100}` from the workbook's `Salary Cap` sheet.

```typescript
interface AttributeCurve {
  min: number;      // rating floor where cost begins
  curve1: number;   // exponent, segment 1 (min->mid)
  mid: number;      // rating where segments meet
  midSal: number;   // $ at mid
  curve2: number;   // exponent, segment 2 (mid->100)
  sal100: number;   // $ at rating 100
}

function attributeCost(r: number, c: AttributeCurve): number {
  const seg1 = c.midSal * Math.pow(Math.max(r - c.min, 0), c.curve1)
             / Math.pow(c.mid - c.min, c.curve1);
  const topCoef = c.sal100 - c.midSal * Math.pow(Math.max(100 - c.min, 0), c.curve1)
             / Math.pow(c.mid - c.min, c.curve1);
  const seg2 = topCoef * Math.pow(Math.max(r - c.mid, 0), c.curve2)
             / Math.pow(100 - c.mid, c.curve2);
  return seg1 + seg2;   // ROUNDUP at player-total level, not per attribute
}
```
This is an exact decode of the workbook formula (verified against cached values, e.g. PitchCalcs costs match Roster cells).

### 3.3 Verified curve sample (C and 1B share params in source; full table extraction is Build Task T1)
| Pos | Attr | min | curve1 | mid | midSal | curve2 | sal100 |
|---|---|---|---|---|---|---|---|
| C | POW | 0 | 1 | 50 | 8000 | 1.5 | 56000 |
| C | CON | 0 | 1 | 55 | 7000 | 2 | 31500 |
| C | SPD | 0 | 1 | 55 | 5500 | 3 | 34000 |
| C | FLD | 0 | 1 | 60 | 1400 | 2 | 5600 |
| C | ARM | 0 | 1 | 60 | 2550 | 2 | 10200 |

Position→row mapping in workbook (Lists!AN2:AO19): C→5, 1B→11, 2B→17, SS→23, 3B→29, LF→35, CF→41, RF→47, IF→53, OF→59, IF/OF→65, "-"→71, SP→77, SP/RP→85, RP→93, CP→101, 1B/OF→109, EXTRA→117. Hitters carry 5 attribute rows (POW/CON/SPD/FLD/ARM); pitchers 7 (POW/CON/SPD/FLD/VEL/JNK/ACC). The formula's row-offset gates (`<77` → ARM applies, `>72` → VEL/JNK/ACC apply) implement hitter-vs-pitcher attribute sets.

### 3.4 Sub-Minimum Reverse Curve (pitchers)
For pitcher attributes below `min`, the workbook prices a MIRRORED curve using columns I–N of the position block (a second `{min,curve1,mid,midSal,curve2,sal100}` set applied to the reflected rating `100 − 100·(r − min2)/(mid2 − min2)`). **Design meaning (per JK):** very low velocity disrupts hitter timing and has genuine positive value. Implement exactly as the workbook's `AE`-column formula. This is a P1 fidelity requirement, not an optional nicety.
**Workbook reality (T1-verified, 2026-06-10):** sub-min I–N curve params exist ONLY on the VEL rows of SP `{0,1.2,30,7500,1.3,18000}`, SP/RP `{0,1.2,30,20000,1.3,50000}`, RP `{0,1.2,30,9000,1.3,20000}`, CP `{0,1.2,30,7000,1.3,17000}` — no other attribute carries them; `subMin` is optional in the type accordingly. Also T1-verified: the EXTRA block (row 117) is PITCHER-shaped (7 attrs incl. VEL/JNK/ACC, nonzero min floors) — T4 `computeIV` must expect both facts. Source of truth for all curve values: `src/data/ivCurves.ts` (generated by `scripts/extract-iv-data.py`).

### 3.5 Trait Marginal Pricing
Each trait carries per-attribute **rating-equivalents** (workbook `Traits` sheet, values = Chemistry Level 2). Trait cost = Σ over affected attributes of `attributeCost(rating + Δ) − attributeCost(rating)` + flat fee + multiplier terms `(attrCost × mult − attrCost)`. Negative traits refund by the same mechanism. Consequence (intended): the same trait costs more on an already-elite player (convexity), and trait values are wildly unequal — Cannon Arm ≈ +45 ARM vs Sprinter ≈ +5 SPD.

Chemistry potency scales the Δ before pricing: **L1 0.5× / L2 1.0× / L3 2.0×** (consistent with game's x1/x2/x4 and salary spec's tiers; workbook values are L2 baseline — verified via LeagueSettings "Restrict to Level 2 Chemistry = True").

### 3.6 Trait Rating-Equivalents Table (extracted & verified from workbook; L2 values)
Columns: POW/CON/SPD/FLD/ARM/VEL/JNK/ACC rating-deltas, FLAT = flat $ fee. Blank source cells noted `·` — treat as 0 but verify in Build Task T1.

| Trait | Chem | POW | CON | SPD | FLD | ARM | VEL | JNK | ACC | FLAT |
|---|---|---|---|---|---|---|---|---|---|---|
| Ace Exterminator (+) | Scholarly | 10 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Bad Ball Hitter (+) | Crafty | 15 | 12 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Bad Jumps (-) | Crafty | · | 0 | -7 | 0 | 0 | 0 | 0 | 0 | 0 |
| Base Jogger (-) | Disciplined | 0 | 0 | -5 | 0 | 0 | 0 | 0 | 0 | 0 |
| Base Rounder (+) | Disciplined | 0 | 0 | 2.5 | 0 | 0 | 0 | 0 | 0 | 0 |
| BB Prone (-) | Disciplined | 0 | 0 | 0 | 0 | 0 | 0 | 0 | -3 | 0 |
| Big Hack (+) | Scholarly | 11 | · | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Bunter (+) | Scholarly | 0 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| Butter Fingers (-) | Disciplined | 0 | 0 | 0 | -15 | 0 | 0 | 0 | 0 | 0 |
| Cannon Arm (+) | Competitive | 0 | 0 | 0 | 0 | 45 | 0 | 0 | 0 | 0 |
| Choker (-) | Spirited | -2 | -2 | -2 | -2 | -2 | -2 | -2 | -2 | 0 |
| Clutch (+) | Spirited | 2.5 | 2.5 | 2.5 | 1 | 1 | 5 | 4 | 4 | 0 |
| Composed (+) | Disciplined | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 0 |
| CON vs LHP (+) | Spirited | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| CON vs RHP (+) | Spirited | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Consistent (+) | Disciplined | 0.4 | 0.4 | 0.4 | 0.4 | 0.4 | 0.4 | 0.4 | 0.4 | 0 |
| Crossed Up (-) | Scholarly | · | 0 | 0 | 0 | 0 | -2.5 | -2.5 | -4 | 0 |
| Distractor (+) | Crafty | 0 | 0 | 3.5 | 0 | 0 | 0 | 0 | 0 | 0 |
| Dive Wizard (+) | Spirited | 0 | 0 | 0 | 7 | 5 | 0 | 0 | 0 | 0 |
| Durable (+) | Competitive | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 0 |
| Easy Jumps (-) | Crafty | 0 | 0 | 0 | 0 | 0 | -2 | -2 | -2 | 0 |
| Easy Target (-) | Crafty | -2 | -3 | 0 | 0 | 0 | · | · | · | 0 |
| Elite 2F (+) | Scholarly | 0 | 0 | 0 | 0 | 0 | · | · | · | 500 |
| Elite 4F (+) | Scholarly | 0 | 0 | 0 | 0 | 0 | · | · | · | 22000 |
| Elite CB (+) | Scholarly | 0 | 0 | 0 | 0 | 0 | · | · | · | 500 |
| Elite CF (+) | Scholarly | 0 | 0 | 0 | 0 | 0 | · | · | · | 500 |
| Elite CH (+) | Scholarly | 0 | 0 | 0 | 0 | 0 | · | · | · | 3000 |
| Elite FK (+) | Scholarly | 0 | 0 | 0 | 0 | 0 | · | · | · | 500 |
| Elite SB (+) | Scholarly | 0 | 0 | 0 | 0 | 0 | · | · | · | 500 |
| Elite SL (+) | Scholarly | 0 | 0 | 0 | 0 | 0 | · | · | · | 500 |
| Falls Behind (-) | Scholarly | 0 | 0 | 0 | 0 | 0 | 0 | 0 | -7 | 0 |
| Fastball Hitter (+) | Disciplined | 3 | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| First Pitch Prayer (-) | Competitive | -2 | -4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| First Pitch Slayer (+) | Competitive | 2 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Gets Ahead (+) | Scholarly | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 0 |
| High Pitch (+) | Disciplined | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Injury Prone (-) | Competitive | -1 | -1 | -1 | -1 | -1 | -0.9 | -1 | -1 | 0 |
| Inside Pitch (+) | Disciplined | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| K Collector (+) | Competitive | 0 | 0 | 0 | 0 | 0 | 9 | 9 | 4 | 2000 |
| K Neglector (-) | Competitive | 0 | 0 | 0 | 0 | 0 | -5 | -4 | 0 | 0 |
| Little Hack (+) | Scholarly | · | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Low Pitch (+) | Disciplined | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Magic Hands (+) | Disciplined | 0 | 0 | 0 | 5 | 7 | 0 | 0 | 0 | 0 |
| Meltdown (-) | Spirited | 0 | 0 | 0 | 0 | 0 | 0 | 0 | -2 | 0 |
| Metal Head (+) | Disciplined | · | · | 0 | 0 | 0 | 0.03 | 0.03 | 0.03 | 0 |
| Mind Gamer (+) | Crafty | 2 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Noodle Arm (-) | Competitive | 0 | 0 | 0 | 0 | -25 | 0 | 0 | 0 | 0 |
| Off-Speed Hitter (+) | Disciplined | 3 | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Outside Pitch (+) | Disciplined | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Pick Officer (+) | Crafty | 0 | 0 | 0 | 0 | 0 | 1.5 | 1.5 | 1.5 | 0 |
| Pinch Perfect (+) | Disciplined | 6 | 6 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| POW vs LHP (+) | Spirited | 6 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| POW vs RHP (+) | Spirited | 6 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Rally Starter (+) | Spirited | 0 | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Rally Stopper (+) | Spirited | · | · | · | · | · | 5 | 3 | 3 | 2000 |
| RBI Hero (+) | Spirited | 7 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| RBI Zero (-) | Spirited | -10 | -6 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Reverse Splits (+) | Crafty | 0 | 0 | 0 | 0 | 0 | · | · | · | 8000 |
| Sign Stealer (+) | Crafty | 15 | 12 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Slow Poke (-) | Competitive | 0 | 0 | -5 | 0 | 0 | 0 | 0 | 0 | 0 |
| Specialist (+) | Crafty | 0 | 0 | 0 | 0 | 0 | · | · | · | 4000 |
| Sprinter (+) | Competitive | 0 | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| Stealer (+) | Crafty | 0 | 0 | 7 | 0 | 0 | 0 | 0 | 0 | 0 |
| Stimulated (+) | Crafty | 2 | 2 | 2 | 2 | 2 | 4 | 4 | 4 | 0 |
| Surrounded (-) | Spirited | 0 | 0 | 0 | 0 | 0 | -4 | -4 | -4 | 0 |
| Tough Out (+) | Competitive | 0 | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Two Way (C) (+) | Spirited | 15 | 15 | 15 | · | 0 | 0 | 0 | 0 | 0 |
| Two Way (IF) (+) | Spirited | 15 | 15 | 15 | 10 | 0 | 0 | 0 | 0 | 0 |
| Two Way (OF) (+) | Spirited | 15 | 15 | 20 | 0 | · | 0 | 0 | 0 | 0 |
| Utility (+) | Scholarly | 0 | 0 | 0 | 6 | 6 | 0 | 0 | 0 | 0 |
| Volatile (+) | Disciplined | 1.2 | 1.2 | 1.2 | 1.2 | 1.2 | 1.2 | 1.2 | 1.2 | 0 |
| Whiffer (-) | Competitive | 0 | -15 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Wild Thing (-) | Spirited | 0 | 0 | 0 | 0 | 0 | 0 | 0 | -10 | 0 |
| Wild Thrower (-) | Crafty | 0 | 0 | 0 | 0 | -30 | 0 | 0 | · | 0 |
| Workhorse (+) | Competitive | 0 | 0 | 0 | 0 | 0 | 14 | 14 | 14 | 2000 |

Auxiliary pricing rows (same mechanism): Switch hitter (S): +5 POW/+5 CON. Pitch types: flat $500 each (4F/2F/CF/SL/CB/SB/CH/FK). Secondary positions: C +1 FLD/+2 ARM; 1B +1 FLD; 2B +1.5/+1; SS +1.5/+1.5; 3B +1/+1.5; LF/CF/RF +1 SPD/+1 FLD/+1 ARM; IF +15 FLD/+10 ARM; OF +10 SPD/+5 FLD/+10 ARM; IF/OF +10/+20/+20; 1B/OF +10 SPD/+7 FLD/+10 ARM. Arm angle: Sub = flat $4000; High/Mid/Low = 0.
Bullpen arsenal tax (total pitches across pen): 8→−12000, 9→−10000, 10→−7000, 11→−4000, 12→−2000, 13→−1000, 14→0, 15→+2000, 16→+5000, 17→+8000, 18→+13000, 19→+18000, 20→+24000.

**MULTIPLIER COLUMNS (v1.1.4 — T1 discovery, Codex-audit-confirmed complete across all 75 rows):** the table above omits workbook cols L–S, which carry `(attrCost × mult − attrCost)` pricing terms per §3.5. Non-1 multipliers (×VEL/×JNK/×ACC): Elite 2F 1.18/1.45/1.1 · Elite 4F 1.9/1/1.1 · Elite CB 1.1/1.48/1.1 · Elite CF 1.18/1.45/1.1 · Elite CH 1.25/1.05/1.1 · Elite FK 1.1/1.1/1.1 · Elite SB 1.05/1.6/1.1 · Elite SL 1.05/1.4/1.1 · Reverse Splits 1.45/1.4/1.4 · Specialist 1.3/1.4/1.3 · Rally Stopper 1.15/1/1. Pitch types also carry multipliers (e.g. 4F VEL×1.13 ACC×1.035; SB JNK×1.4 ACC×1.035). Sub arm angle: flat $4000 + VEL×1.075/JNK×1.2. All other traits: all-1 (no-op). Authoritative values: `src/data/traitPricing.ts`.

### 3.7 Player IV Assembly
```typescript
interface IVResult { totalIV: number; attributeIV: Record<Attr, number>;
  traitIV: number[]; pitchIV: number; auxIV: number; }

function computeIV(p: Player, curves: CurveTable, traits: TraitTable,
                   potency: ChemistryPotencyMap): IVResult
// totalIV = SUM attributeCost(rating_i) [+ subMin reverse terms for pitchers]
//         + SUM traitMarginalCost(trait_j x potencyScale)
//         + SUM pitchCost(pitch_k, role) + arsenalTax(role)
//         + auxCost(handedness, secondaryPos, armAngle)
```
Pure function. No React imports. Lives in `src/engines/ivEngine.ts`. Per-player ROUNDUP applied at component sums exactly as workbook does.

### 3.8 Integration Seam with SALARY_SYSTEM_SPEC (D2 — exact replacement map)
| Salary spec component | Disposition |
|---|---|
| Step 1 calculateBaseRatingSalary (3:3:2:1:1 & 1:1:1 weights, ^2.5 global curve, batting bonuses, two-way premium) | **REPLACED** by computeIV. Two-way/batting value emerges from per-attribute pricing of all attributes + Two Way trait deltas |
| Step 2 POSITION_MULTIPLIERS | **RETIRED** (position value lives in the curves). Keep table as tuning knobs defaulted 1.0 |
| Step 4 trait tier tables (ELITE/GOOD/MINOR ±%) | **RETIRED**, replaced by marginal trait pricing §3.5 |
| Chemistry potency 0.5/1.0/2.0 | **KEPT** — now scales trait Δ before marginal pricing |
| Age, Performance, Fame, Personality modifiers; True Value; fan morale; FA swaps; recalc schedule | **KEPT UNCHANGED**, applied multiplicatively downstream of IV |
| DH-aware batting bonus | **RETIRED as a special case**; DH context becomes a usage-weighting on pitcher batting-attribute IV (tunable constant `pitcherBattingUsageWeight`, default 0.25 non-DH) |

Updated pipeline: `salary = computeIV(p) × ageFactor × perfMod × fameMod × personalityMod(FA only)`, then relativity/True Value exactly per existing spec.

---

## 4. Effective Ratings Engine

### 4.1 Core Composition (D9 — this DISSOLVES "ratings vs form")
Mojo/fitness/traits are deterministic rating modifiers, not vibes. All three surfaces consume:

```typescript
interface GameContext {
  count?: { balls: number; strikes: number };
  pressure: 'none' | 'high' | 'extreme';
  runnersOn: boolean; risp: boolean;
  opposingHand: 'L' | 'R';
  opposingPlayer?: PlayerRef;        // for trait-vs-trait & tier-conditional traits
  inning: number; isSubstitutionAB?: boolean;
}

function effectiveRatings(p: Player, state: PlayerState, ctx: GameContext): Ratings {
  return baseRatings(p)
    .plus(traitDeltas(p, ctx, potencyTier(p, team)))      // 4.3 matrix
    .plus(opponentImposedDeltas(ctx.opposingPlayer, ctx))  // e.g. their Mind Gamer hits OUR ACC
    .plus(mojoModifier(state.mojo, ctx.pressure))          // 4.2
    .minus(fatigueDecay(state.fitness, p.role, state.workload)) // 4.4
    .plus(handednessBonus(p, ctx.opposingHand));
}
```

### 4.2 Mojo Model
Six states: Rattled < Tense < Normal < Locked In < On Fire < Jacked.
- Movement events (batters): hits ↑ (XBH ↑↑), steals ↑; outs ↓ (K ↓↓), errors ↓, CS ↓. Pitchers: outs/K ↑; BB/H/R ↓.
- **JK addendum (canonical, not in guide):** fielding moves mojo — successful dive/jump/slide catches ↑; missed attempts ↓; errors of any kind ≈ always one step ↓.
- Role-misuse penalties: SP relieving ↓; RP starting ↓; CP entering before 8th ↓; SP/RP immune.
- Trait modulation: Volatile = faster transitions both ways; Consistent = slower both ways.
- Higher mojo slows fatigue decay (couples 4.2 → 4.4).
- Pressure amplifies the rating effect of current mojo state.

**Honest constraint:** exact per-state rating deltas are NOT published. They are tunable constants (`MOJO_DELTAS`, registry §12) with documented initial estimates: Rattled −10, Tense −5, Normal 0, Locked In +5, On Fire +10, Jacked +15 (all attributes), pressure multiplier ×1.5 high / ×2 extreme. Calibrate during playtest; never present these as game-truth in UI copy.
Between tracked games, **last-3-games performance is KBL's observable proxy for mojo trajectory** (Mode 2 one-button optimize input).

### 4.3 TraitInteractionMatrix (the insight engine)
Every trait = `{ predicate over GameContext, target self|opponent, deltaVector, perTierScale }`. Shipped as a DATA TABLE consumed by all surfaces (`src/data/traitInteractionMatrix.ts`). Magnitudes: workbook L2 values (§3.6) where conditional traits exist there; guide-explicit values where published (e.g. K Collector +8/+15/+30 VEL&JNK at L1/L2/L3 on 2-strike counts; First Pitch Slayer +5POW+8CON / +10+15 / +20+30 on 0-0). Predicates per guide: Ace Exterminator (opposing pitcher A− tier or better, persists vs fatigue), Specialist (same-handed batter), Mind Gamer (target=OPPONENT pitcher, −ACC), Pinch Perfect (substitution AB), Rally Stopper (runners on), Clutch/Choker (pressure, doubled at extreme), Tough Out/Little Hack/K Collector/K Neglector (2-strike), splits traits (handedness), Stimulated (random Juiced fitness final 2.5 innings — model as expected value), Durable/Injury Prone (fitness decay rate, §4.4), Workhorse (stamina), Sprinter (run-out-of-box SPD), Bunter synergy, Bad Ball Hitter + First Pitch Slayer synergy. Trait-vs-trait collisions resolve by summing both sides' active deltas (our Tough Out vs their K Collector at 0-2 is a computable standoff).
**Build Task T2 = exhaustively enumerate all ~75 traits into this schema** (tedious-for-human, mechanical-for-engine; guide text is the predicate source of truth).

### 4.4 Fitness / Fatigue
- Fitness decays with overplay; catchers fastest (~1-in-4 rest per guide). Durable slows decay/injury; Injury Prone accelerates.
- Pitcher stamina by role: SP ~70 pitches on full rest, 3-game recovery; SP/RP ~45; RP ~25, fast recovery; CP ~20, fastest. Fatigue applies rating decay past threshold; higher mojo reduces decay.
- `fatigueDecay()` constants in registry §12; KBL tracks fitness state per player already (stable input).

### 4.5 DefensivePlacementRisk (JK addendum — fielding mojo makes placement dynamic)
```typescript
function defensivePlacementRisk(p: Player, pos: Position): {
  chanceFrequency: number;          // positional traffic: SS/C/CF high, LF/1B low (constants)
  errorLikelihood: number;          // low FLD (with secondary/tertiary position penalties), ARM for throws
  spectacularLikelihood: number;    // high FLD/SPD range plays (mojo generators)
  expectedMojoDriftPerGame: number; // freq x (specLik x up - errLik x down)
}
```
Consequences the optimizer must honor: a low-FLD player at a high-traffic position is a mojo time bomb dragging his OWN hitting down; positional value is a VECTOR across eligible positions (primary full FLD, secondary small penalty, other severe penalty per guide), not a scalar. Hiding a bad glove at 1B vs 3B becomes quantifiable.

---

## 5. League Tier System (D3)

### 5.1 Tiers
| Tier | Definition |
|---|---|
| **Juiced** | Grade distribution of observed stock SMB4 pool (the 440-player DB ≈ the Super Mega League rosters JK referenced). Arcade-y by design |
| **Standard** | Bell curve shifted left ~1 grade step (target mean ≈ B− if Juiced ≈ B) |
| **Nerfed** | Shifted further left (target mean ≈ C) |

Exact shift parameters come from **Build Task T3**: compute IV + grade distribution of the 440-player DB empirically; do NOT hand-pick the means. Generated players (existing Player Generator feature) fill density the real pool lacks at lower tiers.

### 5.2 Cap Derivation (self-calibrating)
```
tierCap = max( maxObservedPoolIV / starBudgetShare,        // a generational player ~ starBudgetShare of cap
               22 x medianPoolIV x rosterHeadroom )         // average roster fits with star room
```
Defaults: `starBudgetShare = 0.33`, `rosterHeadroom = 1.15` (registry §12). Per-team budgets may be set BELOW tier cap by league config (parity ceiling, voluntary floor). Recompute per registered pool.

### 5.3 Luxury Concentration Layer (constraint half of D1)
Port the workbook's luxury system as the balance enforcer WITHIN a tier: per stat group, sum top-N effective base ratings on roster vs a cap; overage taxed `penaltyPer100 × (overage/100)^penaltyCurve + minAdder` against budget. Caps are SHIFTED by the team's composed identity (§6). Verified parameters (workbook `Luxury Cap` A:F):

| Group (top-N) | Stat | curve | cap | $/100 over | min adder |
|---|---|---|---|---|---|
| Hitters (8) | POW | 1.5 | 500 | 1,500,000 | 3000 |
| Hitters (8) | CON | 1.8 | 545 | 1,000,000 | 2000 |
| Hitters (8) | SPD | 1.8 | 550 | 1,000,000 | 2000 |
| Hitters (8) | FLD | 2.0 | 585 | 700,000 | 600 |
| Hitters (8) | ARM | 1.8 | 565 | 900,000 | 900 |
| Rotation (4) | POW | 1.0 | 120 | 2,000,000 | 3000 |
| Rotation (4) | CON | 1.0 | 160 | 1,200,000 | 2500 |
| Rotation (4) | SPD | 2.0 | 300 | 1,000,000 | 2500 |
| Rotation (4) | FLD | 2.0 | 396 | 650,000 | 1000 |
| Rotation (4) | VEL | 1.5 | 100 | 1,500,000 | 2000 |
| Rotation (4) | JNK | 2.0 | 260 | 400,000 | 1000 |
| Rotation (4) | ACC | 1.9 | 260 | 800,000 | 1200 |
| Bullpen (4) | POW | 1.0 | 120 | 2,100,000 | 5000 |
| Bullpen (4) | CON | 1.0 | 120 | 1,300,000 | 3000 |
| Bullpen (4) | SPD | 2.0 | 260 | 1,100,000 | 3000 |
| Bullpen (4) | FLD | 2.0 | 396 | 750,000 | 1000 |
| Bullpen (3) | VEL | 1.1 | 65 | 3,000,000 | 5000 |
| Bullpen (3) | JNK | 2.0 | 150 | 500,000 | 1000 |
| Bullpen (3) | ACC | 1.9 | 165 | 1,000,000 | 3000 |

JK note honored: these XBL numbers may feel "nerfed" — they are TIER-SCALED in KBL (caps scale with the tier's pool distribution in T3, not used raw). What ports from XBL is the RATIOS AND SHAPES (which stats are precious, penalty convexities, relative modification magnitudes) — proven under multi-season adversarial min-maxing in a competitive human league. The calibration is re-derived per tier: T3 sets each neutral cap at a percentile (default 65th, `luxuryCapPercentile` in registry §12) of the pool's best-plausible top-N sum distribution, and modification deltas rescale proportionally ("+337 FLD" becomes "+X% of tier FLD cap"). All values in registry §12.

**Tax semantics (D13, clarified 2026-06-09):** the tax is a BUDGET DRAIN, not a hard wall. Construction constraint: `Σ salaries + Σ luxuryTaxes ≤ teamBudget`. Overage never blocks a pick; it converts to dollars via the convex penalty curve — a soft cap with exponentially stiffening resistance (20 over ≈ pocket change; 200 over ≈ a bullpen). Balance mechanism: same total budget per team, different SHAPE of resistance per composed identity → parity in total strength, divergence in identity; no two teams can affordably build the same roster shape from the same pool. Anti-hack property: win-deterministic stats (POW/VEL) are doubly expensive (steep salary curves AND stiffest tax parameters) while less win-deterministic stats (FLD) get cheap curves and generous allowances — asymmetric pricing of win-equity flattens expected value across archetypes so no single "optimal archetype" exists. **T3 acceptance criterion:** VERIFY EV-flatness against the actual pool — simulate the best-achievable roster per composed identity; flag any identity whose optimal roster total IV deviates >10% from the cross-identity mean and adjust tier scaling before release.

### 5.4 balanceMode (D13 — league config, League Builder + Franchise Setup Wizard)
`balanceMode: 'taxed' | 'advisory' | 'off'` — default `taxed`.
- **taxed**: full system as specced; §5.3 taxes drain budget during construction.
- **advisory**: archetypes still drive draft recommendations and identity display; cap overages shown as warnings with would-be tax amounts; $0 actually charged.
- **off**: pure tier cap; archetypes purely generative (recommendation weights and identity display only).
Implementation: the tax is one function at the pipeline end; advisory/off short-circuit the CHARGE, never the COMPUTATION (UI must always be able to show what would be taxed). Playtest taxed vs advisory before locking the default recommendation in user docs.

---

## 6. Team Identity System (D11 — two-level)

### 6.1 Surface: Six Identity Bands
Power / Contact / Speed / Defense / Rotation / Bullpen. User expresses priorities across bands (UI: point-allocation, spec'd in §7; rank-order acceptable alternate flagged for JK).

### 6.2 Vocabulary: 44 Cap Modifications (verified, workbook `Luxury Cap` AT:BE)
Each = 11 deltas (POW CON SPD FLD ARM RotVEL RotJNK RotACC PenVEL PenJNK PenACC) applied to luxury caps. Team composition: up to 2 INCREASE + 2 DECREASE selections; net per stat = inc1+inc2−dec1−dec2 (exact workbook mechanic). Deltas rescale proportionally with tier-derived caps per §5.3.

| Modification | POW | CON | SPD | FLD | ARM | RVEL | RJNK | RACC | PVEL | PJNK | PACC |
|---|---|---|---|---|---|---|---|---|---|---|---|
| -- | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| POW | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| CON | 0 | 25 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| SPD | 0 | 0 | 25 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| FLD | 0 | 0 | 0 | 130 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ARM | 0 | 0 | 0 | 0 | 50 | 0 | 0 | 0 | 0 | 0 | 0 |
| VEL | 0 | 0 | 0 | 0 | 0 | 20 | 0 | 0 | 15 | 0 | 0 |
| JNK | 0 | 0 | 0 | 0 | 0 | 0 | 150 | 0 | 0 | 100 | 0 |
| ACC | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 80 | 0 | 0 | 70 |
| Arm Wrestlers | 0 | 0 | 0 | -100 | 90 | 0 | 0 | 0 | 0 | 0 | 0 |
| Big and Clumsy | 40 | 0 | -15 | -265 | -50 | 0 | 0 | 0 | 0 | 0 | 0 |
| Big D | 0 | 0 | 0 | 140 | 50 | 0 | 0 | 0 | 0 | 0 | 0 |
| Bionic Arms | 0 | 0 | 0 | 0 | 50 | 12 | 0 | 0 | 10 | 0 | 0 |
| Bloop Hitters | -20 | 50 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Bullpen Boost | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 45 | 35 |
| Call Your Shot | 50 | -20 | -20 | -20 | -20 | -20 | -20 | -20 | -20 | -20 | -20 |
| Catch the Ball! | -10 | -10 | -10 | 207 | 120 | -10 | -10 | -10 | -10 | -10 | -10 |
| Con-Artists | -20 | 90 | -20 | -20 | -20 | -20 | -20 | -20 | -20 | -20 | -20 |
| Dart Throwers | 0 | 0 | 0 | 0 | 45 | 0 | 0 | 40 | 0 | 0 | 40 |
| Defense Boost | 0 | 0 | 15 | 90 | 40 | 0 | 0 | 0 | 0 | 0 | 0 |
| Defense First | -60 | -60 | 110 | 337 | 150 | -40 | -60 | -45 | -30 | -60 | -40 |
| Do You Even Lift? | 5 | 0 | 0 | 0 | 35 | 8 | 0 | 0 | 5 | 0 | 0 |
| Fence Swingers | 20 | -30 | -20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Fireballers | 0 | 0 | 0 | 0 | 0 | 50 | 0 | -120 | 30 | 0 | -90 |
| Flash Leather | 0 | 0 | 25 | 120 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Fundamentals | 0 | 10 | 0 | 60 | 0 | 0 | 0 | 20 | 0 | 0 | 10 |
| Great Bambino | 30 | 0 | -100 | 0 | 0 | 15 | 0 | 0 | 10 | 0 | 0 |
| Junk Ballers | 0 | 0 | 0 | 0 | 0 | 0 | 80 | 50 | 0 | 80 | 40 |
| Lazer Guns | 0 | 0 | 0 | 0 | 0 | 18 | -260 | 50 | 12 | -150 | 40 |
| Offense Boost | 5 | 8 | 15 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Pine Tar | 5 | 10 | 0 | 0 | 0 | 0 | 0 | 20 | 0 | 0 | 10 |
| Pinpoint Pitchers | -12 | -12 | -12 | -12 | -12 | -12 | -12 | 120 | -12 | -12 | 90 |
| Rotation Boost | 0 | 0 | 0 | 0 | 0 | 20 | 50 | 45 | 0 | 0 | 0 |
| Run Like the Wind | -10 | -25 | 65 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Run n' Gun | 0 | 0 | 20 | -80 | 60 | 0 | 0 | 0 | 0 | 0 | 0 |
| Slap Hitters | -10 | 25 | 18 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Small Ballers | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Torpedo Bats | 8 | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Track Stars | -20 | -20 | 100 | -20 | -20 | -20 | -20 | -20 | -20 | -20 | -20 |
| Warning Track | -80 | 55 | 70 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| We Got Gas | -25 | -25 | -25 | -25 | -25 | 60 | -25 | -25 | 32 | -25 | -25 |
| Well Rounded | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 |

### 6.3 Composition
Band tags derive from each modification's delta signature (e.g. Fence Swingers→Power; Defense First→Defense; Lazer Guns→Rotation; Bullpen Boost→Bullpen; Run n' Gun→Speed+Defense cross). `composeIdentity(bandPriorities) → {increase: [m1,m2], decrease: [m3,m4]}` selects the modification stack best matching priorities (greedy over band-tag scores; ties broken by delta magnitude). Output drives (a) shifted luxury caps §5.3, (b) draft/builder recommendation weights, (c) AI bidder archetypeFit (§7.6).

---

## 7. Mode 1 — League Construction Suite

### 7.1 Construction Paths (D4)
Path A: hand-select 22-man rosters per team from registered pool + prospect draft for 10-man farms (existing flow, now IV-priced).
Path B: full snake draft for 22-man rosters + prospect draft for farms.
Either path emits the SAME qualified-league shape (22 MLB + 10 farm per team) consumed by the existing Franchise Setup Wizard. **No wizard changes.**

### 7.2 Pool Registration
```typescript
interface RegisteredPool {
  leagueId: string; tier: 'juiced'|'standard'|'nerfed';
  players: PoolPlayer[];           // real (440 DB) + generated, each with computed IV
  tierCap: number;                  // 5.2
  pickValueChart: PickValue[];      // 7.3, derived from THIS pool
  luxuryCaps: LuxuryCapTable;       // 5.3 tier-scaled
  balanceMode: 'taxed'|'advisory'|'off';  // 5.4
}
```
Registration computes IV for every pool player once; relative pricing layer (existing relativity) runs over the pool to produce salaries/expectations.
**Pool-size guidance (v1.1.2):** league talent is SUPPLY-controlled — total rostered IV is pinned by the pool, not by auction prices (440 slots drafting a ~440-player pool roster every player regardless of price; deals redistribute talent between teams, they cannot inflate the league). Tier targets are guaranteed at `poolSize ≈ totalSlots × 1.0–1.2` (`poolSurplusMax`); registration UI warns when surplus exceeds this, since surplus pools let cheap prices skim the top of a larger distribution. Grade-ranges-tied-to-rounds REJECTED (D14): price-side fix for a supply-side question; would kill nomination strategy, bargain-hunting, and stars-and-scrubs.

### 7.3 Snake Draft + Pick Value Trade Chart (D10, v1)
- Snake order, all teams user-controlled, no AI.
- **Pick value chart derives empirically**: value(pickN) = expected IV of best-available at pick N given this pool's sorted IV distribution (Jimmy Johnson shape, grounded in actual pool; steeper for Juiced, flatter for Nerfed). Regenerated per league.
- Trade validator: Σ pickValue(side A) vs Σ pickValue(side B); flag if imbalance > `tradeToleranceBand` (default 15%, registry §12). ADVISORY — sunlight, not enforcement; users may override with confirmation.
- Draft board recommendations weighted by team's composed identity (§6.3) + positional scarcity in remaining pool. In taxed/advisory balanceMode the board shows per-pick cap headroom or would-be tax for YOUR team specifically.
- **Draft solvency guardrail (v1.1.1):** before pick confirmation, enforce `committedSalaries + projectedTaxes + pickCost + pickMarginalTax <= budget - (slotsRemaining x cheapestFillCost)`, where `cheapestFillCost` = actual minimum-cost player satisfying each remaining positional need IN THE LIVE REMAINING POOL (recomputed per pick). Strict violations are HARD-BLOCKED with an explanation. NOTE: snake-draft players cost full IV-derived salary (no bidding); the 0.5x auctionFloor applies to auction opening bids only.
- **Per-team pick signals (v1.1.1):** GREEN = identity fit, no meaningful tax, solvency safe. YELLOW = triggers tax; display actual $ figure + post-pick budget/floor math. RED = severe tax relative to remaining budget OR within `solvencyRedMargin` of the solvency line (warning, pickable). BLOCKED = strict solvency violation (not confirmable). Signals are PER TEAM (same player can be green for one team, red for another) — this is the archetype system surfacing in UI.

### 7.4 Prospect / Farm Draft — Scout-Obscured IV (D5)
- True IV salary computed and stored internally for every farm player; used in all engine math.
- DISPLAYED salary = range `[trueIV × (1−w), trueIV × (1+w)]` where width `w` shrinks with scout accuracy: `w = scoutNoiseBase × (1 − scoutAccuracy)`, default `scoutNoiseBase=0.6` (registry §12). Range midpoint jittered per-player (seeded) so midpoint ≠ truth.
- Salary display snaps to true IV at call-up.
- Farm draft pool generation NERFED (already-agreed): generated prospects' IV distribution shifted so immediate-star call-ups are rare (T3 defines the shift).
- Recommendation leak rule: Mode 2 call-up recs may say "projects as positive-surplus replacement" but NEVER display hidden ratings or true IV pre-call-up.

### 7.5 Auction Draft — v1.5 module (fully specced, not v1-gating)
- Budget = team budget (≤ tierCap). Nomination in rotating order. Opening bid = `reservePriceCurve(ivPercentile) × IV` — the reserve scales 0.5 (pool bottom) → 0.7 (top decile) by IV percentile within the registered pool, so generational players can never sell below ~70% of IV while scrubs stay cheap. Kills the endgame-heist exploit structurally; a star at 70–85% remains a LEGAL, satisfying bargain (rewarded skill, not a heist).
- **Winning bid BECOMES the player's actual salary** — auction is the salary negotiation; overpays flow into True Value/Albatross/fan expectations natively.
- Solvency rule enforced every bid: `maxBid = remainingBudget − (slotsRemaining − 1) × minSalaryByPosition`.
- Live advisory UI: paid-vs-IV per team; post-draft league balance report (total IV per $).
- Convex curves + solvency mathematically prevent fleece-bankruptcy; collusion mitigated by sunlight, not enforcement.
- **Sunlight remedy (defined):** live UI shows every team's running paid-vs-IV ratio; post-draft balance report ranks rosters by total IV per dollar with per-player receipts. Collusion is displayed, not blocked; enforcement stays social (league's people decide). Honest residual: zero-shill all-human rooms keep soft collusion as a social problem — this is the realistic ceiling without sterilizing the auction.
- **League-inflation report line:** post-draft report compares total rostered IV vs the tier's expected band; flags drift (e.g. "drafted 14% hot — plays closer to Juiced than Standard") and OFFERS optional regeneration of the undrafted-tail/FA/farm replacement pool one notch nerfed. Information and a knob, not a rule. Note: relativity stack (True Value/expectations/designations are league-percentile-based) self-corrects the internal experience of a hot league; only absolute feel vs SMB4 difficulty shifts.

### 7.6 AI Shill Bidders — v1.5, inside auction module
- Config: "Include N AI bidders; exclude from league ✓" (exclusion is the only v1.5 mode; AI-in-league explicitly deferred).
- **Bid policy (v1.1.2 — probabilistic, NOT a floor):** each shill holds a PRIVATE hidden valuation per player: `IV × archetypeFit(randomIdentity) × personalityBias × noise(±12%)` — different per shill, per draft, never displayed. Bargains trigger INTEREST PROBABILITY (via `bargainInterestCurve`: scales with depth-below-value, shill's remaining budget, roster needs, aggression personality), not guaranteed bids. A 60%-of-IV star draws shill fire USUALLY — not always.
- Shills obey solvency and have real depletable budgets: a spender shill that burned out early is genuinely absent from the endgame, and humans can scout that and exploit it (nomination-as-weapon counterplay is intended design).
- Personalities are read-able tendencies: sniper (lurks, strikes late), spender (overpays early, dies), zealot (overvalues own archetype, ignores rest).
- **HARD REQUIREMENT: shills must NOT implement a deterministic price floor.** The reserve curve is the law; shills are the market. A known floor produces zero strategy; unknown, lumpy, depletable opposition produces tension on every nomination.
- On auction end, AI rosters dissolve to pool (future FA pool hook noted, NOT built).

---

## 8. Mode 2 — Roster Analyzer (Team Hub)

### 8.1 Optimal Lineups vs RHP / LHP
Two persistent recommended lineups (vs R, vs L) computed by maximizing Σ IV-of-effectiveRatings over lineup slots, where effectiveRatings uses: handedness context, trait matrix (splits, count-state traits at expected-value weights), current mojo state, fitness/fatigue, and DefensivePlacementRisk for the defensive arrangement. Defensive assignment and batting arrangement solved jointly (assignment problem; greedy + local-swap is acceptable v1, exact Hungarian optional).
Batting-order logic (slot weighting constants) drafted by Claude in implementation tickets, flagged for JK review — tabled item from session, NOT yet user-approved.

### 8.2 One-Button Re-Optimize
Team Hub button: recompute §8.1 using current mojo/fitness states + last-3-games performance proxy (mojo trajectory). Output = recommended lineup deltas with per-swap justification strings citing the dominant factor ("Tense mojo + 0-for-9", "Tier 3 POW vs RHP active", "fitness 41%, catcher rest rule").

### 8.3 Call-Up / Send-Down Recommendations
Trigger: on-demand (v1 = button; proactive notification hook stubbed, default off — flagged for JK).
Logic: for each MLB roster player, surplus = TrueValue − salary (existing machinery). For each farm player, internal projected surplus = projectedTrueValue(trueIV, hidden ratings) − rookieScaleSalary. Recommend swaps where farm surplus − MLB surplus > `calloutThreshold` AND positional fit holds, ranked. Display respects §7.4 leak rule. Includes the JK scenario natively: low-cost high-surplus prospect replacing high-cost season-long underperformer.

### 8.4 Season Salary Ledger (D6–D8)
```typescript
type LedgerStatus = 'active' | 'deadMoney' | 'unrostered';
interface LedgerEntry { playerId: string; salary: number; status: LedgerStatus; }
// capCharge = salary x (active: 1.0, deadMoney: deadMoneyRate, unrostered: 0)
```
- First call-up puts player on books; demotion → deadMoney at `deadMoneyRate` (default 0.75; wizard presets 100 "Hardline" / 75 "Standard" / 50 "Rebuilder-friendly"); re-call-up flips to active, same salary, NO stacking or per-transaction charges.
- Rookie scale: called-up prospect pays `rookieScaleFactor` (0.50) × IV salary for remainder of call-up season; **REPLACES age factor** that season (no double discount). Reprices at next offseason Phase 3.
- Ledger resets at Phase 3 recalc.
- Tier cap converts to soft payroll-expectation baseline in Mode 2; existing payroll-percentile → win-expectation → fan-morale machinery delivers consequences. NO hard cap enforcement in-season.
- **Expectation anchor (v1.1.2):** the payroll-expectation baseline anchors to the team's DECLARED BUDGET, not realized spend. Sandbagging an auction does not lower the bar fans hold you to (closes the double-reward where a cheap winning bid = low salary = low expectations); unspent budget is never free expectation relief.
- Session-verified scenario math (75%): gutting two stars saves only ~5.4% payroll; busted call-up lingers ≈ rookie-scale-sized dead weight; honest churn moves differ <$2M between rate presets.

---

## 9. Lineup Delta WPA Standard
The consistent standard for judging managerial lineup decisions: `lineupDeltaWPA = expectedValue(actualLineup) − expectedValue(optimizerLineup)` computed at lineup-lock using §8.1 machinery with identical context inputs. Persisted per game; feeds existing WPA delta surfaces. The optimizer output is the auditable benchmark — never silently change its constants mid-season (constants snapshot stored with each season).

---

## 10. GameTracker Sub Recommendation Rebuild (D12)
Current logic = placeholder; REPLACE, do not patch. In-game sub recs consume LIVE GameContext (count, pressure, runners, opposing player incl. their traits, inning) → effectiveRatings for every eligible sub vs current player → recommend when delta exceeds `subRecThreshold`, with justification strings (trait activations, mojo, fatigue, DefensivePlacementRisk for defensive subs, pinch-hit traits like Pinch Perfect, trait-vs-trait standoffs). Pitcher-change recs honor role-misuse mojo penalties (§4.2) and stamina model (§4.4). Same matrix/data tables as §4 — one truth, three surfaces.

---

## 11. Typed Interface Summary (engine boundary contracts)
```typescript
// src/engines/ivEngine.ts
computeIV(p: Player, curves: CurveTable, traits: TraitTable, potency: ChemistryPotencyMap): IVResult

// src/engines/effectiveRatings.ts
effectiveRatings(p: Player, state: PlayerState, ctx: GameContext): Ratings
defensivePlacementRisk(p: Player, pos: Position): PlacementRisk

// src/engines/leagueConstruction.ts
registerPool(cfg: PoolConfig): RegisteredPool
derivePickValueChart(pool: RegisteredPool): PickValue[]
validateTrade(sideA: Pick[], sideB: Pick[], chart: PickValue[]): TradeVerdict
composeIdentity(priorities: BandPriorities): IdentityComposition
luxuryTax(roster: Roster, caps: LuxuryCapTable, mode: BalanceMode): TaxResult  // mode short-circuits charge, not computation

// src/engines/rosterAnalyzer.ts
optimizeLineup(team: Team, vs: 'L'|'R', states: PlayerStates): LineupRecommendation
recommendRosterMoves(team: Team, farm: FarmRoster, league: LeagueContext): MoveRecommendation[]
ledgerCapCharge(entries: LedgerEntry[], rate: number): number

// src/engines/subRecommendations.ts
recommendSubs(game: LiveGameState, ctx: GameContext): SubRecommendation[]
```
All engines: pure functions, no React imports, unit-testable outside the app (engine-discovery / season-simulator skill compatible).

---

## 12. Tunable Constants Registry (single file: src/data/rosterEngineConstants.ts)
| Constant | Default | Source |
|---|---|---|
| MOJO_DELTAS (6 states) | −10/−5/0/+5/+10/+15 | estimate — CALIBRATE |
| pressureMultiplier | 1.5 high / 2.0 extreme | guide-structural, estimate magnitude |
| potencyScale | 0.5 / 1.0 / 2.0 | game-verified (x1/x2/x4 normalized to L2) |
| starBudgetShare | 0.33 | design choice (session) |
| rosterHeadroom | 1.15 | design choice |
| deadMoneyRate | 0.75 (100/75/50 presets) | D7 |
| rookieScaleFactor | 0.50, replaces age factor | D6 |
| scoutNoiseBase | 0.6 | design choice |
| reservePriceCurve | 0.5→0.7 by IV percentile | D14 (replaces flat auctionFloor) |
| bargainInterestCurve / shillNoise | TBD T11 / ±12% | D14, playtest |
| poolSurplusMax | 1.2 × totalSlots | D14, design choice |
| leagueInflationBand | tier-expected total IV ±10% | D14, report flag threshold |
| tradeToleranceBand | 0.15 | design choice |
| pitcherBattingUsageWeight | 0.25 non-DH | salary spec rotation factor |
| balanceMode | 'taxed' (taxed/advisory/off) | D13 |
| luxuryCapPercentile | 0.65 | D13, design choice — CALIBRATE in T3 |
| evFlatnessTolerance | 0.10 | D13, T3 acceptance criterion |
| solvencyRedMargin | 0.10 of remaining budget | v1.1.1, design choice |
| subRecThreshold / calloutThreshold | TBD in T6/T7 | playtest |
| Luxury caps & penalty curves | §5.3 table, tier-scaled | workbook-verified |
| Pick chart / tier shift params | derived (T3) | empirical |

Every constant snapshot-versioned per season for WPA-standard auditability (§9).

---

## 13. Build Sequence & Routing
Per SESSION_RULES Prompt Contract template (spec-docs/PROMPT_CONTRACTS.md) for every ticket. NFL applies at every step; browser/JK verification before ticket close.

**Builder/auditor decorrelation pattern (v1.1.3, refined v1.1.4):** builder and auditor are DIFFERENT model families on every task — two independent error distributions; same-model self-audit tends to find its own choices plausible. **Economic routing (v1.1.4):** Fable 5 does ALL planning, prompt-contract writing, and auditing (low token volume, high judgment density); Codex 5.5 does ALL building (high volume, contract-specified) — EXCEPT T2, which stays a Fable 5 build because the TraitInteractionMatrix artifact IS the judgment (predicates derived from guide prose have no mechanical verification anchor to catch a subtly wrong predicate). Role inversion is permitted (T1 was Fable-built, Codex-audited: CONFORMS) — decorrelation, not direction, is the requirement.
**Audit discipline (v1.1.4):** the auditor reads the `git diff` and reruns verification itself — NEVER grades the builder's self-report (a claim, not evidence). Audits include a mandatory "disagreements with builder report" section. Precedent: T1 audit corrected the builder's "4 pre-existing test failures" claim to 2 reproducible + 1 suite-order flake + 1 non-reproducing.
**UI-build addendum (v1.1.4):** UI tickets require assertion-style acceptance criteria (testable, not adjectives), design-system token references, and named component patterns in the contract. Audit covers what code can prove: token compliance, modal-dumbing (dispatch-only components), engine/reducer wiring, Playwright assertions, plus a screenshot pass fed to the auditor for gross layout breakage. JK browser verification remains the only test of visual taste — non-waivable on UI tickets. **Audit gate (required before JK browser verification on T4–T11):** (1) golden tests pass, (2) NFL protocol run with documented falsification attempts, (3) section-by-section spec conformance check against this document, (4) state/persistence tasks additionally audited for migration safety and IndexedDB key-scope discipline. Reasoning-effort rule unchanged: anything touching game state, persistence, or reducers = very high / max effort; pure-function engines = high.

| # | Task | ROUTE |
|---|---|---|
| T1 ✅ COMPLETE 2026-06-10 | Extract FULL Salary Cap curve table (all 18 position blocks, A:N incl. sub-min I–N columns) + verify trait-table blanks from workbook → `src/data/ivCurves.ts`, `src/data/traitPricing.ts` | Fable 5 CLI built; Codex 5.5 audit: CONFORMS (PROMPT_CONTRACTS T1 + T1-AUDIT) |
| T2 | TraitInteractionMatrix: enumerate all ~75 traits {predicate, target, deltas, perTierScale} from guide + workbook → `src/data/traitInteractionMatrix.ts` | ROUTE: Claude Code CLI \| Fable 5 \| max (cross-source reasoning vs guide+workbook; the audit-critical data table) |
| T3 | Empirical pool analysis: IV + grade distribution of 440-player DB; derive tier shift params, tier caps (percentile method §5.3), luxury cap scaling, farm-draft nerf params; **EV-flatness verification across composed identities (±10%, §5.3)** → analysis doc + `src/data/tierParams.ts` | ROUTE: Claude Code CLI \| Fable 5 \| max (analysis-heavy; EV-flatness verification) |
| T4 | IV Engine (`ivEngine.ts`) incl. sub-min reverse curve + golden tests against workbook cached values (Eovaldi $54,582; deGrom $71,609; PitchCalcs rows) | ROUTE: Codex 5.5 \| very high → Fable 5 CLI audit (core engine, golden-test gated) |
| T5 | Salary spec integration seam (replace Steps 1/2/trait-tiers; wire potency; rookie-scale override) + regression tests on True Value/designations | ROUTE: Codex 5.5 \| very high → Fable 5 CLI audit (persistence-adjacent salary state; audit non-negotiable) |
| T6 | Effective Ratings Engine + DefensivePlacementRisk + constants registry | ROUTE: Codex 5.5 \| high → Fable 5 CLI audit |
| T7 | Mode 2 Analyzer: lineups vs L/R, one-button optimize, call-up/send-down recs, season ledger | ROUTE: Codex 5.5 \| very high → Fable 5 CLI audit (reducer/persistence: ledger state; audit non-negotiable) |
| T8 | Mode 1 suite: pool registration, snake draft, pick chart + trade validator, identity composition UI, scout-obscured farm pricing, luxuryTax + balanceMode wiring | ROUTE: Codex 5.5 \| very high → Fable 5 CLI audit (persistence: pool/league state; audit non-negotiable) |
| T9 | GameTracker sub rec rebuild on shared engines | ROUTE: Codex 5.5 \| very high → Fable 5 CLI audit (GameTracker state integration; audit non-negotiable) |
| T10 | Lineup Delta WPA standard wiring + constants snapshotting | ROUTE: Codex 5.5 \| high → Fable 5 CLI audit |
| T11 (v1.5) | Auction module + AI shill bidders | ROUTE: Codex 5.5 \| high → Fable 5 CLI audit |

Order: T1→T2→T3 (parallel-safe) → T4 → T5 → T6 → {T7, T8} → T9 → T10. T11 on green-light.

---

## 14. Explicitly Deferred (post-v1 / out of scope)
1. ROSTER_MOVEMENT_GAME_THEORY_SPEC (named dependency): fan/player morale fallout for demotions, Fan Hopeful interplay, clubhouse churn. Until it lands, 50% deadMoneyRate preset carries an in-spec warning.
2. AI teams that JOIN leagues with coherent rosters (only auction-shill AI is in scope, v1.5).
3. FA pool seeded from dissolved AI auction rosters (hook noted only).
4. Proactive call-up/send-down notifications (hook stubbed, default off).
5. d20 random event system (separate, per existing v1 plan).
6. Mojo-delta empirical calibration tooling (playtest phase).

## 15. Flagged for JK Review During Build (small, non-blocking)
1. Band-priority UI input: point-allocation (specced) vs rank-order.
2. Batting-order slot weighting constants (§8.1) — Claude drafts, JK approves.
3. Trait-table blank cells (§3.6 `·`) — verify against workbook in T1.
4. Mojo delta estimates (§4.2) — playtest calibration.
5. (v1.1) balanceMode default — `taxed` specced; revisit after T3 EV-flatness results and first construction playtest.

---
*End IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md v1.1.4*
