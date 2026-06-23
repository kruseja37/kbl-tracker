# KBL Prospect Generation Specification

**Version**: 2.0
**Status**: CANONICAL (v1 farm-prospect generation) — supersedes v1.0 §5 grade/rating model
**Last Updated**: 2026-06-20

---

## 0. v2 (2026-06-20) REVISION SUMMARY — what changed & why

This revision is the resolution of **V9** (`MODE1_V1_VERIFICATION.md`: "farm generation generates but its distribution diverges from this spec and was never validated") under the ratified rulings in **`MODE1_LEAGUE_BUILD_TO_DRAFT_VISION.md §9.E`** (the authoritative source for this spec). It anchors generation to the two oracles §9.E mandates and validates the result against the real analyzer grade function.

| # | Change | Why |
|---|---|---|
| **C1** | **§5 rating model SUPERSEDED.** The v1.0 "uniform ratings at a grade-center + σ=8 Gaussian, no re-scoring" model is replaced by an **analyzer-anchored generate-score-correct** model. | §9.E: the generator must be the **inverse of the League-Builder Player Analyzer's grade function**. The v1.0 model was never round-tripped through any grade function (neither is the live code). Validation (§13) shows the v1.0 model misses §3.2 by **~70 percentage points**; the anchored model reproduces it within **1.72 pp**. |
| **C2** | **GRADE ORACLE located and named** = `scoreSmb4Player` (`src/engines/smb4GradeEmulator.ts:671`), the V2 fitted SMB4-emulation model surfaced by the Player Analyzer (`Builder.tsx:1302`). The simple 3:3:2:1:1 `gradeEngine` grader is **not** the analyzer oracle. | §9.E: "locate it in league-builder code." The analyzer scores ratings **+ handedness + traits + secondary position + arsenal** → a calibrated grade. |
| **C3** | **DISTRIBUTION ORACLE numbers added** (§6/§7/§3.5), derived empirically from the real stock pool. | §9.E: derive secondary-position transitions, handedness split, chemistry frequencies from the **real 440**, not uniform assumptions. |
| **C4** | **§3.2 grade table KEPT as the v1 STANDARD anchor.** Juiced/nerfed shift of the *generation* distribution **DEFERRED to L-ECON3 (`farmGradeMode`)**. | §9.E: "STANDARD distribution ONLY for v1." |
| **C5** | **NEW**: secondary positions (§6), handedness (§7), pitcher arsenal spec (§8), positions-visible/ratings-hidden (§9). ~~REMOVED: age / development curve~~ → **REVERSED 2026-06-22 (JK): age IS generated — skew-young, full-range, revealed to GMs (§10).** | §9.E net-new; age-drop reversed per §10. |
| **C6** | **§3.5 chemistry ~20%-even VALIDATED** against the real pool (and clarified: chemistry ≠ personality — the canonical-7 personality is a separate axis). | §9.E: "validate the assumption." |

**Authoritative inputs:** `MODE1_LEAGUE_BUILD_TO_DRAFT_VISION.md §9.E` (rulings), `src/engines/smb4GradeEmulator.ts` (grade oracle), `src/data/playerDatabase.ts` (the real stock pool — distribution oracle), `GRADE_ALGORITHM_SPEC.md`, `SMB4_GRADE_V3_OBJECTIVE_AUDIT.md`, `TRAIT_INTEGRATION_SPEC.md §5.2`.

---

## 1. Overview

KBL generates farm prospects for the franchise farm draft. **v1 draft format is AUCTION** (`§9.A`): prospects are generated **as a pool** with scout-obscured value, and GMs bid on perceived value. This spec defines **what a generated prospect IS** — its grade, ratings, position(s), handedness, traits, chemistry, and (for pitchers) arsenal — such that the generated player is **consistent with the analyzer**: feeding a generated prospect back through the Player Analyzer returns the grade it was assigned (the generator is the analyzer's **inverse**).

**Two oracles govern generation:**
1. **GRADE ORACLE** — `scoreSmb4Player` (`src/engines/smb4GradeEmulator.ts:671`). The source of truth for grade computation (§5.1).
2. **DISTRIBUTION ORACLE** — the real stock pool (`src/data/playerDatabase.ts`, 440 SML players). The source of truth for empirical distributions: secondary-position transitions (§6), handedness (§7), chemistry (§3.5).

---

## 2. Initial League Population

### 2.1 Source: SMB4 stock database

The stock SML pool (20 teams × 22 = 440 players) is the initial real pool; subsequent farm classes are **generated** per this spec. (For the MLB-side league build, the construction pool is governed by `IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md`.)

### 2.2 Two independent personality axes (do not conflate)

Every generated player carries **two separate** attributes — the v1.0 spec and the live code conflated them:
- **Personality** — one of the **canonical 7** (`COMPETITIVE/RELAXED/DROOPY/JOLLY/TOUGH/TIMID/EGOTISTICAL`, `PERSONALITY_SYSTEM_SPEC.md §2`) + 4 hidden modifiers (Gaussian μ=50, σ=20). Read by the morale matrix. **Cross-ref the §2.B / G2 fix** — the live generator's `PERSONALITY_POOL` (`prospectScoutingDraftEngine.ts:247`) is non-canonical (only 3 of 7); it must be pinned to the canonical 7.
- **Chemistry** — one of the **5 SMB4 chemistry types** (`Competitive/Crafty/Disciplined/Spirited/Scholarly`). Distinct from personality; distribution in §3.5.

---

## 3. Draft Class Generation

### 3.1 Draft Class Size

```typescript
const DRAFT_CLASS_CONFIG = {
  baseSize: 40,    // ~2 picks per team for 20 teams
  scaleFactor: 2,  // multiplier × number of teams
  calculateDraftClassSize(numTeams: number): number {
    return Math.max(this.baseSize, numTeams * this.scaleFactor);
  }
};
```
**Auction note (§9.A / R3):** the pool must be ≥ the slots being filled (auction budget-scarcity requires surplus). There are **no draft rounds** in an auction — the entire pool is generated from the **single STANDARD distribution** below (the v1.0 round-keyed tables in `gradeEngine.ts`/`prospectScoutingDraftEngine.ts` were a snake-draft artifact and do not apply to auction; they are removed for v1 — see §14).

### 3.2 Grade Distribution — **STANDARD anchor (KEPT, §9.E)**

The v1 STANDARD farm class follows this distribution (the analyzer-grade distribution of a generated class):

| Grade | Percentage | Notes |
|-------|-----------|-------|
| A+ | 0% | Never in draft (too unrealistic) |
| A | 2% | Generational talent |
| A- | 5% | Elite prospect |
| B+ | 10% | Very good prospect |
| B | 15% | Good prospect |
| B- | 15% | Average prospect |
| C+ | 15% | Below average |
| C | 18% | Filler/depth |
| C- | 12% | Long shot |
| D | 8% | Organizational player |

This is deliberately **a step down from the stock pool** (the stock 440 is "Juiced" per R7; its real analyzer-grade distribution peaks higher — `T3_POOL_ANALYSIS.md §R1`: of 440, B+ 78, B 76, B- 86, A- 45, A 18, S 6, D 2 ≈ 18% B+, 10% A-, ~0.5% D). The STANDARD class being leaner than stock is exactly the R7 "standard = a step down from stock=juiced" relationship.

**Mapping §3.2 labels → the GRADE ORACLE's calibrated score bands** (`smb4GradeEmulator.ts:150-163`), which the generator targets (§5.2):

| §3.2 grade | Analyzer numericScore band | Target (band center) |
|---|---|---|
| A | [84.733, 88.958) | 86.85 |
| A- | [79.630, 84.733) | 82.18 |
| B+ | [74.143, 79.630) | 76.89 |
| B | [69.611, 74.143) | 71.88 |
| B- | [65.035, 69.611) | 67.32 |
| C+ | [59.797, 65.035) | 62.42 |
| C | [54.293, 59.797) | 57.05 |
| C- | [49.611, 54.293) | 51.95 |
| D | < 49.611 (analyzer D+ and below) | ~46.0 |

> **Label reconciliation:** the analyzer has finer low-end bands (`D+ ≥ 47.45`, `D ≥ 39.5`, …). §3.2's single **"D"** bucket = **every analyzer grade below C-** (D+, D, D-, …). The standard class never targets analyzer S or A+ (so A is the ceiling, 2%). This resolves the v1.0-vs-`gradeEngine` band mismatch (the `gradeEngine` 12-band threshold table is **not** the analyzer and is not used here).

### 3.3 Position Distribution — **RULED 2026-06-20 (E): NO DH/UTIL; pitchers = {SP, SP/RP, RP, CP}**

```typescript
const POSITION_WEIGHTS = {
  'SP': 18, 'SP/RP': 6, 'RP': 13, 'CP': 4,         // pitcher roles — SP/RP is a single combined swingman role
  'C': 9, '1B': 7, '2B': 8, 'SS': 7, '3B': 6,
  'LF': 8, 'CF': 7, 'RF': 7,                         // the 8 SMB4 fielding positions
};
```
**Ruling E (JK 2026-06-20):** `DH` and `UTIL` are **removed** — neither is a valid SMB4 primary *or* secondary position (`DH` is a lineup slot only, `rosterAnalyzer.ts:27-28`; `UTIL` exists in no `Position` type). Pitchers draw **one of {SP, SP/RP, RP, CP}** as a unit — `SP/RP` is the combined swingman role, **NOT** SP-primary + RP-secondary (`PITCHER_POSITIONS=["SP","RP","CP","SP/RP"]`, `smb4PlayerGenerator.ts:134`), and pitchers carry **no secondary** (`historicalPlayerConverter` sets `secondaryPosition:''`). A fielder with no secondary plays only their primary (functionally DH-like, but rostered at their fielding spot). Weights track the real-pool primary spread (distribution oracle): SP 18.0%, RP 13.2%, C 9.1%, LF 8.4%, 2B 7.7%, 1B/RF 7.0%, CF/SS 6.8%, 3B 6.4%, SP/RP 5.9%, CP 3.6% (≈ 41% pitchers / 59% position players).

### 3.4 Trait-Count Distribution — **KEPT 30/50/20 (§9.E)**

- ~30% of the class: 0 traits · ~50%: 1 trait · ~20%: 2 traits (schema caps at 2).
- Traits are **position-appropriate** (§5.5) and **positive/neutral only** for prospects.

> **Distribution-oracle divergence (flagged, not changed):** the real stock pool is more trait-rich than 30/50/20 — `playerDatabase.ts` gives **0/1/2 = 15.9%/62.7%/21.4%** (the v2 markdown export differs again at 8.2%/38.0%/53.9%, confirming the two snapshots are not identical). §9.E rules **KEEP 30/50/20** for v1 (young prospects are reasonably less developed than the established pool). See **WAITING_ON_JK B**.

### 3.5 Chemistry Distribution — **~20%-even VALIDATED (§9.E)**

Chemistry types distributed ~evenly across SMB4's 5 actual types. **Validated against the real 440** (distribution oracle, `playerDatabase.ts` `chemistry` field, codes SPI/DIS/CMP/SCH/CRA, 0 unknowns):

| Chemistry | Real count / 440 | Real % |
|---|---|---|
| Spirited (SPI) | 93 | 21.1% |
| Competitive (CMP) | 88 | 20.0% |
| Disciplined (DIS) | 88 | 20.0% |
| Scholarly (SCH) | 88 | 20.0% |
| Crafty (CRA) | 83 | 18.9% |

The spread is 83–93 (a ±2.2pp band around the even 88-split). **The "~20% even" assumption holds** — generate uniformly across the 5 (a small bias toward Spirited / away from Crafty is optional and immaterial).

---

## 4. Inactive Player Database

Unchanged from v1.0 — released/retired/cut players enter the inactive pool and may optionally be re-added to a draft class (pre-draft prompt). See `FARM_SYSTEM_SPEC.md`.

---

## 5. Rating Generation — **SUPERSEDED (analyzer-anchored inverse; the V9 resolution)**

> **This section replaces v1.0 §5 in full.** The v1.0 model (uniform ratings at a `GRADE_RATING_CENTER` + σ=8 Gaussian, no re-scoring) does **not** reproduce §3.2 when scored by the real analyzer (off by ~70pp — see §13). The generator must instead be the **inverse of the analyzer**.

### 5.1 The GRADE ORACLE — `scoreSmb4Player`

The canonical grade function is `scoreSmb4Player(input)` — `src/engines/smb4GradeEmulator.ts:671` — the **V2 fitted SMB4-emulation model** the user-facing Player Analyzer renders (`Builder.tsx:1302` `scoreSmb4Player(player)` → `:1430` `{score.grade}`; the editor writes the grade back via the same fn at `:1596-1600`). It is a **linear model on features** → numericScore → **calibrated thresholds** (`SMB4_CALIBRATED_GRADE_THRESHOLDS`, `:150-163`):

- **Hitter score** = `intercept 10.5965` + `0.2826·POW + 0.2807·CON + 0.2027·SPD + 0.1148·FLD + 0.0915·ARM` − `0.0088·(POW·CON/100)` − `0.0336·(SPD·FLD/100)` + handedness (`bat_L +2.85`, `bat_S +4.51`, `thr_L −0.66`) + versatility (`vers`, `vers²`, `vers_util`) + `pos_count·(+0.97)` − `neg_count·(1.75)` + primary-position dummies (`pos_C +2.30`, `pos_2B +0.83`, `pos_3B −1.27`, …) + secondary-position dummies + specific trait flags (`tr_Fastball Hitter +2.45`, `tr_Mind Gamer +1.50`, …).
- **Pitcher score** = `intercept 16.5945` + `0.2530·VEL + 0.2666·JNK + 0.2633·ACC` + small batting terms + `jnk_acc` interaction + `arsenal_count·(+1.01)` + handedness + `pos_count`/`neg_count` + role dummies (`pos_SP +0.24`, `pos_SP/RP −1.01`) + trait & pitch-type flags.

**Two consequences that break the naive model and force the inverse:**
1. The rating coefficients **sum to ≈ 0.972** (not 1.0), there is a **+10.6 / +16.6 intercept**, and there are **negative interaction terms** — so a "uniform-73 → grade B" assumption (v1.0) is simply wrong against the analyzer (uniform-73 1B scores ≈ B+/A-).
2. **Non-rating features move the grade by up to a full band**: a switch-hitter is **+4.51** (~one band), a catcher **+2.30**, each positive trait **+0.97**, each negative **−1.75**, each extra pitch **+1.01**. The grade therefore **cannot** be set from ratings alone.

### 5.2 GRADE → RATINGS mapping (generate-score-correct)

For each prospect, generate in this order so the grade is exact:

1. **Assign the target grade** `G` by sampling §3.2.
2. **Generate all non-rating, grade-affecting features FIRST** (so nothing perturbs the grade afterward): primary position (§3.3), secondary position (§6), handedness (§7), chemistry (§3.5), personality (canonical 7), trait count + the specific traits (§3.4/§5.5), and — for pitchers — the arsenal (§8).
3. **Compute the feature-only score** `F` = `scoreSmb4Player(features with ratings = 0)` (everything except the 5/3 ratings and their interactions).
4. **Solve the ratings** so that `scoreSmb4Player(prospect)` lands in `G`'s band (§3.2 table). Because the score is **monotonic increasing** in every rating, a uniform shift `δ` added to a position-biased, per-tool-noised base profile is **binary-searched** until the analyzer score equals the **band center** (target column in §3.2). Then **re-score with the full analyzer and apply a final correction** so the realized grade equals `G`. Clamp ratings to the §5.4 range.

This makes the round-trip **exact by construction**: every prospect's analyzer grade equals its assigned grade, so the realized class distribution reproduces §3.2 (validated §13). **Target the band center, not the edge** (`SMB4_GRADE_V3_OBJECTIVE_AUDIT.md` rec #4: "avoid placing generated players exactly on grade boundaries") so the small score contributions of any downstream attribute change cannot flip the grade.

### 5.3 Per-tool spread (σ) — a TOOL-DIVERSITY knob, NOT a grade knob

The per-rating noise σ controls how *lumpy* a prospect's tool profile is (a B prospect can be 70-POW/45-CON or a balanced 60/60), **not** the grade. The validation (§13) shows **σ=7 and σ=8 produce identical grade distributions** — because the grade is set by the weighted score + the §5.2 correction, not by the raw σ. This **resolves the V9 "σ=7 vs σ=8 divergence"**: it is immaterial to the grade distribution. **Recommended σ ≈ 7–8** for realistic within-grade tool spread; calibrate against the real pool's within-grade rating SD if desired (not v1-gating).

### 5.4 Clamp range

Clamp generated ratings to **[20, 99]** (matches the live generator and the real-pool rating range). Every §3.2 band A→D is reachable inside [20, 99] (A needs uniform ≈ 80; D needs low ratings). (The v1.0 `gradeEngine` [15, 85] clamp made the top of the A band tight; use [20, 99].)

### 5.5 Position-appropriate traits

Traits must be **position-appropriate** per `TRAIT_INTEGRATION_SPEC.md §5.2`: position players (non-DH) → Hitting/Baserunning/Fielding; DH → Hitting/Baserunning (no fielding traits); SP/RP → Pitching; CP → Pitching (closer-eligible); Two-Way → Hitting/Baserunning/Pitching. **Today `traitPools.ts` only encodes a binary `batter|pitcher|both` split (and is orphaned from the live path), and the live generator uses two hardcoded pools with no DH/closer carve-out** — see §14. Prospect trait pools are **positive/neutral only** (no negative traits at generation — `neg_count` would lower the grade unpredictably; negatives belong to the established-player layer).

### 5.5b Traits must be GRADE/SCARCITY-WEIGHTED, not flat uniform — **RULED (audit `we2bpqsw7`)**
**The biggest sameness culprit (audit finding):** the live generator draws `trait1`/`trait2` **uniformly** over the flat 29-trait (hitter) / 17-trait (pitcher) pool with **no link to grade or scarcity** — so an A prospect is exactly as likely to roll a rare, high-impact trait as a D, and stars share a 1/29 collision with filler. Combined with the §3.4 count split (30% zero / 50% one / 20% two), trait flavor is both thin AND interchangeable across quality tiers.
- **RULED:** weight the trait draw so **higher-graded prospects are more likely to roll rarer/higher-impact traits.** Reuse the analyzer's existing per-trait **impact coefficients** as the impact weighting (`smb4GradeEmulator` already prices each trait, e.g. Fastball Hitter +2.45, Mind Gamer +1.50) and the **generation scarcity** `genWeight = 1 − traitWeight` from `TRAIT_GAIN_LOSS_THRESHOLD_SPEC §5` (rarer = less likely overall, but grade lifts the odds for the elite). Optionally bump the 30/50/20 count weights upward for A/A−/B+ so stars carry more flavor.
- Net: an A prospect's traits feel distinct from a C's; rare/impactful traits cluster (probabilistically) on the better players. (Build task B13.)

### 5.6 Player ARCHETYPES — large/parametric, for non-repeating tool spreads — **RULED (JK 2026-06-22; audit `we2bpqsw7`)**
The audit confirmed the rating *algorithm* is sound (independent per-tool σ=7 + a uniform grade-hitting shift that preserves shape → real lumpy/balanced variety, NOT cookie-cutter), but variety is **modest/symmetric** — pure Gaussian noise + a fixed per-position bias produces no deliberate specialists and the spreads can feel repetitive at a grade. JK: add archetypes, **but a LARGE/parametric set so we don't see the same spreads over and over for similar grades.**
- **Mechanism:** before `buildBaseRatings`, draw a **per-tool archetype bias vector** and apply it as an *additional* bias (reusing the existing `bias` arg that `POSITION_STAT_BIAS` already proves works); the §5.2 generate-score-correct loop then **re-scores the biased profile with the real `scoreSmb4Player` analyzer and adjusts the overall level (the uniform shift + fine scan) until the analyzer returns the target grade.**
- **Why it can't mis-grade (corrected — NOT "grade ignores shape"):** the grade is NOT invariant to tool spread — `scoreSmb4Player` weights attributes by position and nonlinearly, so a glove-heavy SS and a bat-heavy 1B with identical raw numbers grade differently. What makes archetypes SAFE is that the generator is **tied to the analyzer in the loop**: it lets the analyzer grade the *finished* profile and corrects until it matches. B9 asserts `scoreSmb4Player(prospect).grade === targetGrade` for the whole class, so no archetype can silently mis-grade.
- **⚠ Convergence guard (RULED):** an EXTREME archetype near a grade extreme can hit the [20,99] clamp before the level-adjustment reaches the target (e.g. a max-power slugger aimed at A needs power past 99). The build MUST detect non-convergence and **re-draw or scale the archetype down** (and B9 catches any that slip through). Archetype bias magnitude should taper as the target grade approaches the A / D extremes.
- **Large + non-repeating (the key requirement):** NOT a small fixed list of ~5 clichés. Use **archetype FAMILIES** (recognizable for scouting flavor — e.g. Slugger, Pure-Power, Power-Speed, Five-Tool, Speedster, Slap-Hitter, Contact-Glove, Defensive-Wizard, Cannon-Corner, Project/raw-tools, Balanced, …) **× randomized per-instance magnitudes** (jitter the bias size + which secondary tool is emphasized/de-emphasized), so the space of realized spreads is effectively continuous — every "slugger" is a *distinct* slugger. (Equivalent framing: parametrically draw a primary-strength tool + optional secondary-strength + a weakness, with random bias magnitudes — a near-infinite spread space with recognizable families.)
- **Specialists allowed:** bias magnitudes large enough to produce genuine specialists (e.g. 80-power/45-speed corner masher) — that's the point.
- **Position-weighted, not forced:** archetype odds lean position-appropriate (Sluggers → corners, Gloves → up-the-middle) but surprises are allowed (a slugging SS) for emergent variety. Position bias still applies underneath.
- σ=7 per-tool noise stays ON TOP, so even two same-family same-magnitude prospects differ. (Build task B12.)

**ANALYZER-VERIFIED examples (full profiles; grades are actual `scoreSmb4Player` output, run `wtms0nucj`, round-trip re-scored).** Hitters = POW/CON/SPD/FLD/ARM; pitchers = VEL/JNK/ACC + arsenal (pitchers also carry batter ratings POW/CON/SPD = 20).
| Family | Pos (2nd) | B/T | Ratings | Traits | Score → Grade |
|--------|-----------|-----|---------|--------|---------------|
| Slugger | 1B (LF) | R/R | 76/58/42/58/64 | Big Hack, RBI Hero | 70.1 → B |
| Slugger | RF (1B) | L/L | 80/66/62/62/80 | Big Hack, Cannon Arm | 80.2 → A− |
| Slugger | 3B (1B) | R/R | 73/73/49/69/69 | Big Hack, Bad Ball Hitter | 74.3 → B+ |
| Speedster | CF (LF) | L/L | 41/63/75/63/57 | Sprinter, Stealer | 70.4 → B |
| Speedster | 2B (SS) | S/R | 30/46/64/46/46 | Stealer | 60.5 → C+ |
| Speedster | LF (CF) | L/L | 57/75/75/57/41 | Sprinter, Bad Ball Hitter | 74.4 → B+ |
| Def. Wizard | SS (2B) | R/R | 45/61/67/79/79 | Magic Hands, Cannon Arm | 69.9 → B |
| Def. Wizard | C (—) | R/R | 54/54/38/72/72 | Magic Hands, Cannon Arm | 65.3 → B− |
| Def. Wizard | CF (RF) | L/L | 58/58/76/76/64 | Magic Hands, Dive Wizard | 74.6 → B+ |
| Power Ace | SP | R/R | VEL76/JNK62/ACC62 · 4F,CH,SL,CB | K Collector, Workhorse | 79.6 → A− |
| Crafty | SP | R/L | VEL26/JNK62/ACC62 · 2F,CH,CB,SL,CF | Specialist, Gets Ahead | 70.4 → B |
| Flamethrower | CP | R/R | VEL83/JNK59/ACC55 · 4F,SL | K Collector | 74.9 → B+ |

**Analyzer input contract (for the B12/B13 builder — `smb4GradeEmulator.ts`):** input = a single `Smb4PlayerInput`; **traits are scalar `trait1`/`trait2` (NOT an array)**; handedness = `bats`/`throws` (`R` baseline, `L`/`S` add terms); `primaryPosition`+`secondaryPosition` (1B/DH are the zero-baseline hitter positions); pitcher role is INFERRED from `primaryPosition ∈ {SP,RP,CP,SP/RP}` (CP has no position term); `arsenal` = string[] of {2F,4F,CB,CF,CH,FK,SB,SL}; **pitchers must pass low `power/contact/speed` batter ratings**; default mapping = the **calibrated** grade thresholds (no options). The generate-score-correct solve (§5.2) must score with THIS contract.

Within a family the through-line tool is constant but position/grade/secondary/magnitude vary (no repeated spreads); across families the *same* grade yields very different players (the B 1B-slugger vs B CF-speedster vs B SS-wizard).

---

## 6. Secondary Positions — **NEW (pool-derived transition map, §9.E)**

Every position-player prospect is assigned a secondary position from a **pool-derived transition distribution** `P(secondary | primary)` (distribution oracle, `playerDatabase.ts`, schema = a single optional `secondaryPosition`). **Pitchers get no secondary** (100% of the real 179 pitchers have none). Among real position players, **~85% carry exactly one secondary**, ~15% none — so generate "no secondary" ~15% of the time, else draw from:

| Primary | P(secondary \| primary) — from the real 440 (raw counts in parentheses) |
|---|---|
| **C** | 1B 43% (17) · RF 10% (4) · LF 8% (3) · 3B 5% (2) · IF/OF 3% (1) · none 33% (13) |
| **1B** | 3B 23% (7) · C 16% (5) · LF 13% (4) · RF 6% (2) · 2B 3% (1) · none 39% (12) |
| **2B** | SS 44% (15) · 3B 26% (9) · IF 12% (4) · IF/OF 6% (2) · none 12% (4) |
| **3B** | SS 39% (11) · 1B 29% (8) · IF 11% (3) · 2B 7% (2) · none 14% (4) |
| **SS** | 2B 47% (14) · 3B 13% (4) · IF 13% (4) · IF/OF 13% (4) · OF 3% (1) · none 10% (3) |
| **LF** | OF 43% (16) · RF 22% (8) · C 14% (5) · 1B/OF 8% (3) · 1B 5% (2) · none 8% (3) |
| **CF** | OF 77% (23) · 1B/OF 20% (6) · none 3% (1) |
| **RF** | OF 32% (10) · C 32% (10) · LF 23% (7) · 1B/OF 6% (2) · none 6% (2) |

(The data uses composite secondary labels `IF`, `OF`, `IF/OF`, `1B/OF` alongside discrete positions; the analyzer's `secondaryVersatility` map already scores these — `smb4GradeEmulator.ts:175-182`.) This map prevents nonsensical pairings (a CF never gets a 2B secondary; the map keeps CF → OF/1B-OF). **Secondary contributes to the analyzer grade** (`sec_*` + `vers` terms) and is therefore fixed in §5.2 step 2 **before** the rating solve.

---

## 7. Handedness — **NEW (pool-anchored, §9.E)**

The analyzer takes handedness as input (`bat_L +2.85`, `bat_S +4.51`, `thr_L −0.66`), so it must be generated. Anchor to the real 440 split:

- **Bats:** R **51.6%** · L **41.4%** · S(switch) **7.0%**
- **Throws:** R **77.0%** · L **23.0%** (no switch-throwers; `ThrowHand = L|R`)
- **Correlation (use a conditional draw):** throws-L correlates strongly with bats-L. Joint frequencies: R/R 46.4%, L/R 25.0%, L/L 16.4%, S/R 5.7%, R/L 5.2%, S/L 1.4%. Practically: if bats-L → throws-L ~40%; if bats-R → throws-L ~10%; if switch → throws-L ~19%. (Position-conditioning — e.g. throws-L is rare at C/2B/SS/3B — is a later refinement; v1 may apply the league-wide split. See **WAITING_ON_JK C**.)

Handedness is fixed in §5.2 step 2 before the rating solve.

---

## 8. Pitcher Arsenal — **NEW (spec the role/junk rules, §9.E "verify")**

Arsenal generation exists in the live engine (`prospectScoutingDraftEngine.ts:420-428`) but is **unspecced** (`FARM_SYSTEM_SPEC.md` has zero arsenal rules) and **diverges** from an orphaned second implementation (`gradeEngine.generateArsenal`). Canonicalize for v1:

- **RULED 2026-06-20 (D):** every pitcher gets **≥1 fastball** from `{4F, 2F, CF}` **+ ≥1 off-speed** from `{SL, CB, CH, FK, SB}`. **Do NOT force both `4F` and `2F`** — the fastball is drawn from the 3-member fastball set (the live `gradeEngine.generateArsenal` hardcodes `['4F','2F']`; that force-pairing is the bug this fixes).
- **Arsenal size = real-pool role tapers, scaled by junk within the role's range:** **SP & SP/RP 3–5 · RP 2–4 · CP 2–3** (higher junk → upper end of the role's range). (`SP/RP` taper = derive from the real pool at build time; default SP-like 3–5.)
- **Adopt `smb4PlayerGenerator.buildArsenal`** (`src/engines/smb4PlayerGenerator.ts:567`) — it already encodes exactly this rule with the canonical vocabulary `FASTBALL_PITCH_TYPES=["4F","2F","CF"]` / `OFFSPEED_PITCH_TYPES=["SL","CB","CH","FK","SB"]` (`:409-411`) and a ≥1-fastball/≥1-off-speed guard (`:584-590`). **Retire `gradeEngine.generateArsenal`** (`gradeEngine.ts:382`, the orphaned force-`4F`+`2F` impl). This matches the §5.1/A decision to anchor on the `scoreSmb4Player`/`smb4PlayerGenerator` family.
- **Arsenal feeds the grade** (`arsenal_count +1.01/pitch`, `pitch_*` flags) → fix the arsenal in §5.2 step 2 before the rating solve.

---

## 9. Positions Visible / Ratings Hidden — **R3 refinement (§9.E)**

During the farm prospect draft (auction), **primary + secondary positions are ALWAYS shown** to GMs; **only ratings and value are scout-obscured**. GMs must be able to draft for positional need — hiding position would kill draft strategy. The scout-obscured **value RANGE** (per `IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md §7.4`, scout-noise band that snaps to truth at call-up) applies to **ratings/IV only, never position**. This is a hard display rule for the R3 farm-auction surface.

---

## 10. Age — skew-young, full-range, revealed to GMs — **RULED (JK 2026-06-22; REVERSES the prior removal)**

> ⚠ **Supersedes** the earlier "No Age / Development Curve — REMOVED" ruling (a Captain default 2026-06-21) and the change-log C5 / build-task B8 "drop age" lines. JK reversed it: prospects **do** carry a real, varied age.

**Why:** farm rosters span low-A through AAA, so prospects can be **any age** — they must NOT all be young relative to the 440-player MLB pool. A real age makes the draft more dynamic and gives GMs a genuine trade-off on limited info: *"do I take the 40-year-old who may regress on arrival, or the younger player when all else is equal?"*

**Rules:**
1. **Generate a real age — WIDE band, skew young.** Draw over the **same 5 age bands as the ratings §5 age structure** (18–21 / 22–24 / 25–31 / 32–35 / 36+), weighted so the **majority of rookies fall in the two youngest bands (18–24)** but the band is genuinely WIDE — a real tail reaches the 30s and into the 40s (full envelope ~18–42, matching the MLB pool's 19–42). Placeholder band weights (sim-tunable): **18–21 ≈ 40% · 22–24 ≈ 30% · 25–31 ≈ 18% · 32–35 ≈ 8% · 36+ ≈ 4%** (uniform within a band), so ~70% are ≤24 yet ~12% are 32+. **Deterministic/seeded.** (Band-weighted, not a clamped normal — avoids piling everyone at 18.)
2. **Age is INDEPENDENT of ratings/traits/grade at generation (RULED).** Age has **nothing to do** with a prospect's generated ratings, traits, or grade — there is **no age term** anywhere in generation. So there can be **stars at any age band** (a 40-year-old phenom or an 18-year-old phenom are both possible) and **busts at any age band**. The fact that *"most prospects are young AND undeveloped vs MLB"* is **two independent facts**: youth comes from this age distribution; "undeveloped" comes from the §3.2 grade distribution (prospects grade below MLB). Do NOT correlate them.
3. **Reveal age to GMs.** Age is shown on the scout-facing prospect card / draft board in the **canonical farm-auction draft** (`LeagueBuilderFarmAuctionDraft.tsx` — currently does not render it) so it factors into bidding. Age is a **visible** fact, not scout-obscured (unlike ratings/IV — §9). `VisibleSafeProspectReport.age` already carries it. Because ratings/IV are obscured, age is one of the few HARD facts a GM drafts on.
4. **Age affects the post-arrival TRAJECTORY only, never the generated ratings.** Once a drafted player is on the MLB roster, the ratings **§5 age curve** governs his trajectory: an old prospect (32–35 mild / 36+ steep decline band) regresses over the season; a young one develops. This is purely the post-arrival ratings engine reading the carried age — it does NOT change the (age-independent) generated ratings. This is what makes the GM trade-off real: a 40-year-old star is great NOW but will regress; an 18-year-old star is rarer-but-rising. (CPU scout/bidder age-discounting = separate scout-logic question; default GMs judge the revealed age themselves.)

**Build notes (greenfield/reversal):** the canonical generator currently hard-codes `age: PROSPECT_DRAFT_AGE = 18` (`prospectScoutingDraftEngine.ts:1116`, const `:414`) — replace with the seeded draw and delete the `PROSPECT_DRAFT_AGE` constant + its §10 gate comment (`:413`). The `age` field already exists on `LeagueBuilderProspectPlayerDto` (`:179`) and `VisibleSafeProspectReport` (`:160`). Also fix the non-canonical `DraftFlow.tsx` dummy ages (`:490` `randBetween(19,22)`, `:517`) to match. `yearsInMinors` stays dropped (not part of this reversal).

---

## 11. Names — cross-reference §2.C

Names are **not** re-specced here. Per `MODE1_LEAGUE_BUILD_TO_DRAFT_VISION.md §2.C`: all generated names draw first/last from the SMB4 "Possible Names" pool (never invented) with **true randomization** (no clustering). Prospect names already comply (`V7` BUILT: `prospectScoutingDraftEngine.ts:540-541`, FNV-1a seeded over the 2756/2128 pool). The known violators (reporters, bridge-scouts) are a separate generator — out of scope here.

---

## 12. Tier Distribution — STANDARD-only for v1; juiced/nerfed deferred

**v1 ships ONE validated distribution: STANDARD = the §3.2 table.** The **juiced/nerfed shift of the generation distribution** is **DEFERRED to L-ECON3 (`farmGradeMode`)** (§9.E; `ROADMAP_TO_V1.md:83` "L-ECON3 not-started"). When added, `farmGradeMode` is a **multiplicative skew layer over §3.2** (shift the grade-sampling weights toward better grades for juiced, leaner for nerfed) — it does **not** change the analyzer-anchored §5 mapping, only the §3.2 sampling weights. The orphaned `FARM_NERF_SCALES`/`TIER_SHIFTS` (`tierParams.ts`) are the intended inputs.

**Keep two levers SEPARATE (§9.E):** the **farm BUDGET tier** (the walled-off auction wallet, R3) **MAY be tiered in v1**; only the prospect-**generation** distribution is fixed at STANDARD for v1. Generation quality ≠ budget size.

---

## 13. VALIDATION (round-trip against the real oracle — NFL, not asserted)

**Method:** a faithful replica of `scoreSmb4Player` (HITTER_MODEL/PITCHER_MODEL coefficients + `SMB4_CALIBRATED_GRADE_THRESHOLDS`, verbatim from `smb4GradeEmulator.ts`) was run over **40,000** generated prospects (grades sampled per §3.2; ~41% pitchers; handedness/secondary/traits from the oracle priors). Two generators were compared:
- **ANCHORED** = the §5.2 generate-score-correct model (solve ratings so `scoreSmb4Player` lands in the §3.2 band).
- **NAIVE** = the v1.0 / current-code model (set ratings at the grade center + σ Gaussian, **no** oracle re-scoring).

**Result** (realized analyzer-grade distribution; target §3.2 in the header):

```
TARGET §3.2:  A 2%  A- 5%  B+ 10%  B 15%  B- 15%  C+ 15%  C 18%  C- 12%  D 8%

ANCHORED:     A 1.9% A- 5.0% B+ 9.8% B 14.9% B- 14.8% C+ 15.3% C 17.8% C- 12.5% D 8.1%
NAIVE:        A 16.5% A- 15.3% B+ 18.5% B 16.5% B- 15.0% C+ 10.7% C 5.5% C- 1.7% D 0.3%

ANCHORED total abs deviation from §3.2:  1.72 pp   ✅ reproduces §3.2
NAIVE    total abs deviation from §3.2: 69.78 pp   ❌ shoved up ~2 grades
```

**Conclusions:**
1. **The §3.2 STANDARD distribution IS reproducible** — but only via the analyzer-anchored §5.2 model (within **1.72 pp** total, every grade within ~0.5pp).
2. **The naive model fails by ~70 pp** — a "B"-intended uniform-73 prospect scores B+/A-/A under the real analyzer (handedness/position/trait points + the intercept/coefficient structure), so 16% of intended-§3.2 prospects come out **A**. This is the concrete V9 "diverges / never validated" failure.
3. **σ is irrelevant to the grade** (σ=7 ≡ σ=8 in the ANCHORED rows) — it only sets tool diversity (§5.3).

*(Validation script: self-contained Node replica of the emulator coefficients; run read-only in `/tmp`, no repo files touched. Reproducible by re-deriving `F` per prospect and binary-searching the rating shift against `scoreSmb4Player`.)*

---

## 14. WHAT THE GENERATOR CODE MUST CHANGE (build-delta checklist — spec-only; do NOT change code here)

> ⚠ **CHECKLIST IS STALE re: which copy (audit `we2bpqsw7`, 2026-06-22).** B1–B9 below were written against the OLD `kbl-tracker/src/utils/prospectScoutingDraftEngine.ts` copy. The **canonical kbl-mode1 copy has already BUILT most of them**: B1 (generate-score-correct via `scoreSmb4Player` + uniform shift — verified, with round-trip test), B2 (STANDARD weights), B3 (secondary map), B4 (handedness split + L/L correlation), B5 (canonical-7 personality — *mode1 only*; the tracker copy is still non-canonical), B7 (role/junk/trait arsenal), B9 (distribution test) are **DONE in kbl-mode1**. **Real remaining gaps:** **B8** (age — still hard-coded `18`, confirmed dead), **B12** (archetypes — new), **B13** (grade/scarcity-weighted traits — new, the biggest sameness lever), **B6** (DH/closer carve-out + retire `Workhorse`/orphan `traitPools.ts`), and **retire/sync the stale kbl-tracker copy** (its non-canonical personality pool must not leak).

Concrete deltas between the live generator and this analyzer-anchored spec. Costed for the later build:

| # | Delta | Where (current) | Scope |
|---|---|---|---|
| **B1** | **Anchor grading to `scoreSmb4Player`.** Replace the "pick `trueGrade` then derive ratings forward from `gradeCenter`, stamp `overallGrade = trueGrade`" flow (`:531-532, :632`) with the §5.2 **generate-score-correct** loop: fix features → solve ratings so `scoreSmb4Player(prospect).grade == targetGrade`. Import `scoreSmb4Player` from `smb4GradeEmulator`. | `prospectScoutingDraftEngine.ts:386-418, 531-532, 632` | **BUILD** (core) |
| **B2** | **Replace the round-keyed grade tables with the single §3.2 STANDARD distribution** (auction has no rounds). Remove `roundGradeWeights`/round hints. | `prospectScoutingDraftEngine.ts:316-357, 531` | **WIRING** |
| **B3** | **Add secondary-position generation** via the §6 `P(secondary\|primary)` map (currently prospects get no secondary). | new in `prospectScoutingDraftEngine.ts` | **BUILD** |
| **B4** | **Add handedness generation** (bats/throws) per §7 (currently not generated; analyzer needs it). | new | **BUILD** |
| **B5** | **Pin personality to the canonical 7** (the §2.B/G2 fix); keep chemistry on the 5 SMB4 types (§3.5). | `prospectScoutingDraftEngine.ts:247` (`PERSONALITY_POOL`), `:246` (`CHEMISTRY_POOL` ok) | **WIRING** |
| **B6** | **Position-appropriate trait pools** per §5.5 / `TRAIT_INTEGRATION_SPEC §5.2` (DH/closer/two-way carve-outs); fix `Workhorse` (not in the trait registry) and the orphaned `traitPools.ts`. | `prospectScoutingDraftEngine.ts:248-249, 533-535`; `traitPools.ts` | **BUILD** (small) |
| **B7** | **Canonicalize arsenal** (§8): single role/junk rule, resolve the `4F` vs `{4F,2F}` fastball-seed discrepancy, enforce role-plausible counts; retire the orphaned `gradeEngine.generateArsenal`. | `prospectScoutingDraftEngine.ts:420-428`; `gradeEngine.ts:381-401` (orphan) | **WIRING** |
| **B8** | **Generate a real age** (§10, REVERSED): replace fixed `age: PROSPECT_DRAFT_AGE = 18` (`:1116`, const `:414`) with a seeded skew-young/full-range draw (~18–42, μ≈21, σ≈4); delete the `PROSPECT_DRAFT_AGE` const + `:413` gate comment; fix `DraftFlow.tsx:490/:517` dummy ages. Keep `yearsInMinors` dropped. **+ reveal age** in the canonical farm-auction draft UI (`LeagueBuilderFarmAuctionDraft.tsx` / `useFarmAuctionDraft.ts` — add an Age column/line; `VisibleSafeProspectReport.age` already carries it). | `prospectScoutingDraftEngine.ts:413-414, 1116`; `DraftFlow.tsx:490,517`; `LeagueBuilderFarmAuctionDraft.tsx` | **BUILD** (small) |
| **B9** | **Add a distribution-validation test** asserting the generated class's analyzer-grade histogram matches §3.2 within tolerance (≈±1.5pp), plus trait-split + position-spread checks (none exists today). | new test | **BUILD** (test) |
| **B10** | **(Deferred, L-ECON3)** add `farmGradeMode` as a multiplicative skew over §3.2 weights for juiced/nerfed; wire the orphaned `FARM_NERF_SCALES`. **Not v1.** | new; `tierParams.ts:51-55` | **BUILD** (post-v1) |
| **B11** | Retire/leave the orphaned `gradeEngine.generateFullProspect/generateProspectRatings` (test-only) — not part of the live path. | `gradeEngine.ts:303, 417` | none (note) |
| **B12** | **Archetype layer (§5.6) — large/parametric.** Before `buildBaseRatings`, draw an archetype-family + randomized per-tool bias magnitudes (recognizable families × continuous magnitude → non-repeating spreads, genuine specialists allowed), position-weighted-not-forced; apply as an extra `bias` vector; the §5.2 loop **re-grades the finished profile with `scoreSmb4Player` and adjusts the level until it matches** (NOT "grade ignores shape" — the analyzer is the in-loop oracle; B9 verifies). **Guard non-convergence at grade extremes** (clamp-bound → re-draw/scale the archetype; taper bias magnitude near A/D). Keep σ=7 noise on top. | new (`bias` plumbing + `applyRatingShift`/`buildRatings` reused) `prospectScoutingDraftEngine.ts:597-636, 779-848` | **BUILD** |
| **B13** | **Grade/scarcity-weight traits (§5.5b).** Replace the flat uniform `trait1`/`trait2` draw (`:1007-1012`) with a grade- and scarcity-weighted draw: reuse the analyzer per-trait impact coefficients (`smb4GradeEmulator`) + `genWeight = 1 − traitWeight` (`TRAIT_GAIN_LOSS_THRESHOLD_SPEC §5`); optionally lift the 30/50/20 count split for A/A−/B+. Rare/impactful traits cluster on better prospects. | `prospectScoutingDraftEngine.ts:1007-1012`; `smb4GradeEmulator` (coeffs) | **BUILD** (biggest sameness lever) |

**Dependency order:** B5/B7/B8 are independent low-risk wirings (can land first). B3/B4 (features) must precede B1 (the solve consumes the features). B2 precedes B1. B9 validates the whole. B10 is post-v1.

---

## 15. WAITING_ON_JK — ✅ ALL RESOLVED (JK 2026-06-20, attended)

**A. Grade-model authority — ✅ use the Analyzer's `scoreSmb4Player`.** Confirmed canonical (vs the simpler 3:3:2:1:1 `gradeEngine`). Code fact established this pass: NOTHING reverse-engineers a profile from salary/IV — both graders are forward ratings→grade; `gradeEngine` merely feeds `franchiseRatingsSalaryAdapter` (version `…grade-salary-only`), which computes grade + salary from ratings as siblings and DEFERS True Value/IV. Retire the `gradeEngine` prospect-generator path; build on the `scoreSmb4Player`/`smb4PlayerGenerator` family.

**B. Trait-count distribution — ✅ keep 30/50/20** (leaner than the real pool's 16/63/21; prospects = undeveloped upside that grows into traits via development).

**C. Position-conditioned handedness — ✅ defer** (league-wide bats/throws split for v1; the realism gain is small — `thr_L` scores only −0.66).

**D. Arsenal — ✅** every pitcher ≥1 fastball `{4F,2F,CF}` + ≥1 off-speed `{SL,CB,CH,FK,SB}`, **no forced 4F+2F**; arsenal size = real-pool role tapers (SP/SP-RP 3–5, RP 2–4, CP 2–3) scaled by junk; adopt `smb4PlayerGenerator.buildArsenal`, retire `gradeEngine.generateArsenal` (§8).

**E. DH & UTIL — ✅ NO DH/UTIL** (neither is a valid SMB4 primary or secondary position). Fielders: primary + optional secondary from the 8 fielding positions; pitchers: one of {SP, SP/RP, RP, CP}, no secondary. A 1B with no secondary is functionally DH-like but rostered at 1B. §3.3 updated.

---

## 16. Cross-References

| Spec | Relevance |
|------|-----------|
| `MODE1_LEAGUE_BUILD_TO_DRAFT_VISION.md §9.E` | **Authoritative rulings** for this revision |
| `src/engines/smb4GradeEmulator.ts` | The GRADE ORACLE (`scoreSmb4Player`) |
| `src/data/playerDatabase.ts` | The DISTRIBUTION ORACLE (real 440 stock pool) |
| `GRADE_ALGORITHM_SPEC.md` | The 3:3:2:1:1 base-weighted component (not the analyzer grade) |
| `SMB4_GRADE_V3_OBJECTIVE_AUDIT.md` | Confirms V2 calibrated thresholds canonical; generation-prior guidance (rec #4) |
| `TRAIT_INTEGRATION_SPEC.md §5.2` | Position-appropriate trait categories (§5.5) |
| `IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md §7.4` | Scout-obscured farm value ranges (R3, §9) |
| `MODE1_V1_VERIFICATION.md` (V9) | The finding this revision resolves |
| `FARM_SYSTEM_SPEC.md` | Where drafted prospects live (no arsenal rules today — §8) |
| `PERSONALITY_SYSTEM_SPEC.md §2` | Canonical-7 personality (separate axis from chemistry, §2.2) |

---

*v2.0 (2026-06-20): analyzer-anchored grade model (`scoreSmb4Player` inverse), empirical distribution oracles, validated round-trip (§13), build-delta checklist (§14). Supersedes v1.0 §5. Authored from `MODE1_LEAGUE_BUILD_TO_DRAFT_VISION.md §9.E`.*
