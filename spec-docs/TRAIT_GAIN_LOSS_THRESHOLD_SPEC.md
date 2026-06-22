# TRAIT GAIN/LOSS THRESHOLD SPEC — value/scarcity sliding scale

**Status:** DESIGN — core rulings RATIFIED by JK 2026-06-22; one integration fork open (EOS, §8). Build is partly greenfield (§7); the in-season threshold seam is already built.
**Grounds in:** the XBL workbook (IV-engine source of truth), the IV trait-$ ranking (L2), and the kbl-mode1 trait-acquisition engine. Companion to `CHEMISTRY_TRAIT_POTENCY_VALUATION_SPEC.md`.

---

## 1. The idea (one sentence)
A single per-trait **weight** (driven 80% by **$ value**, 20% by workbook **scarcity**) maps every trait to a **tier**; the tier sets three knobs — **gain threshold** (how good you must be to earn it), **loss/retention threshold** (how bad you must get to lose it), and **generation weight** (how rare it is in prospects). Valuable traits are hard to gain + sticky; cheap traits are fluid. The same weight drives prospect rarity. Per-trait overrides sit on top.

## 2. The scale — RULED: 80% value / 20% scarcity blend
- **Value axis** = the IV $ ranking (continuous, all ~73 in-scope traits; Two Way IF +$31,502 → Metal Head +$14; negatives RBI Zero −$2,364 → Meltdown −$308).
- **Scarcity axis** = workbook `TEAM MAX USES` (col 20), 5 levels: 0 (the 3 Two-Ways), 1 (62 traits), 2 (5), 3 (4), 9 (Metal Head).
- They AGREE at the extremes (Two-Way = top value + scarcest; Metal Head = bottom value + commonest) and are orthogonal in the middle (62 traits collapse to MAX USES 1; the priced Elite-pitch traits are all MAX USES 1). So value leads; scarcity reinforces the ends.

```
valueNorm    = rank-normalize(|trait $ value|) over in-scope traits   → 0..1   (rank, NOT raw-$ min-max — the tail would crush the pack)
scarcityNorm = MAX USES → {0:1.0, 1:0.55, 2:0.30, 3:0.15, 9:0.0}      → 0..1   (scarcer = higher)
traitWeight  = 0.8 * valueNorm + 0.2 * scarcityNorm                   → 0..1
```
**`traitWeight` is DERIVED + recomputable** (store the inputs — $ value + MAX USES — regenerate the weight; never hand-hardcode). The $ ranking is one league's L2 IV → recompute per-league if multiple leagues exist (§8 fork 5).

## 3. Tiers — RULED: 4 positive tiers + 3 negative tiers, grouped + tunable, with per-trait overrides

### 3.1 Positive tiers (cut on `traitWeight`)
| Tier | band | members (examples) | gainThreshold | lossThreshold | genWeight |
|---|---|---|---|---|---|
| **Elite** | ≥ 0.85 | Two Way IF/OF/C, Elite 4F, Workhorse, Reverse Splits | 0.92 | 0.12 | 0.05 |
| **Rare** | 0.60–0.84 | Cannon Arm, K Collector, Clutch, Big Hack, Specialist, Ace Exterminator, Rally Stopper | 0.82 | 0.22 | 0.18 |
| **Uncommon** | 0.30–0.59 | Elite pitches, POW/CON vs LHP/RHP, Tough Out, Rally Starter, Durable, Composed, Gets Ahead | 0.70 | 0.30 | 0.50 |
| **Common** | < 0.30 | Base Rounder, Metal Head, low-$ tail | 0.55 | 0.30 | 1.00 |

As value rises: gainThreshold ↑ (harder to earn), lossThreshold ↓ (stickier). Elite = "top ~8% of peers to gain, bottom ~12% to lose"; Common = "above-average to gain, below-average to lose."

### 3.2 Negative tiers (cut on `|$ value|`; thresholds measured on the BADNESS percentile)
| Tier | band | members | gainThreshold (P_bad exceeds) | lossThreshold (P_bad falls to) | genWeight |
|---|---|---|---|---|---|
| **Severe** | ≥ ~$1,500 | RBI Zero, Whiffer, Wild Thing, Wild Thrower, Falls Behind, Noodle Arm | 0.78 | 0.18 | 0.15 |
| **Moderate** | $600–1,500 | Surrounded, Choker, mid negatives | 0.65 | 0.25 | 0.45 |
| **Minor** | < $600 | Meltdown, low-damage tail | 0.55 | 0.30 | 1.00 |

## 4. Threshold semantics
- **Signal** = the engine's `realityPercentile` (`P`) — player's season-to-date performance vs same-role peers, with bounded personality/morale tilts (`traitAcquisition.ts:314-373`).
- **Window** = cumulative season-to-date aggregate; **cadence** = the 20%-grid checkpoints (`standard=5/season`, `frequent=10`), the SAME boundary as ratings-development; a min-sample valve keeps a trait dormant until enough PA/IP exist.
- **Positives:** gain when `P > gainThreshold`; lose when `P ≤ lossThreshold`; hysteresis dead-band between.
- **Negatives (the inversion) — RULED:** you GAIN a flaw by performing BADLY and LOSE it by performing WELL. Use the badness percentile `P_bad`. **RULED: Severe negatives are HARD to acquire + sticky** — you must be genuinely, persistently terrible to earn "Whiffer," and real improvement to shed it; easy-to-acquire belongs to MINOR negatives. (Not a one-bad-week thing.)
- **RULED: NO age effect in v1** — gain/loss is performance-only. (SMB4 natively drifts skills by age; age-gating is a documented v2 enhancement.)
- **League-config caps honored** (workbook LeagueSettings): max 2 traits/player, ≤3 positives per negative, no 2 negatives on one player, no bench negatives — the existing reconciler skips cap-violating proposals.

## 4A. Measurement — window, trend factor, peer cohorts (RULED 2026-06-22)
**Window — base = season-to-date AGGREGATE.** The base signal `P` is the player's aggregate percentile (stable — what he's done all year). This is the anchor; it's what kept stickiness safe but slow.

**Trend factor — RULED: moderate.** A multiplicative tilt from **recent form (since the last checkpoint) vs the aggregate**: trending UP (recent > aggregate) → eases gain + resists loss; trending DOWN → eases loss + resists gain. Moderate, bounded multiplier (sim-tunable). **Neutral at checkpoint 1** (no prior checkpoint to compare) ⇒ cannot worsen early loss. This is the responsiveness layer over the stable aggregate: a genuinely *declining* star can eventually shed a trait (so it's not impossibly sticky) and a *surging* youngster earns one faster — without cheap single-streak flips.

**Peer cohorts — the percentile basis.** `P` ranks the player within a ROLE-APPROPRIATE pool (the scorer is cohort-agnostic; the caller supplies the pool):
- **Hitters vs hitters, pitchers vs pitchers — never mixed** (role-eligibility + role-specific signal pools). CONFIRMED already built.
- **Cross-role signals use the player's OWN role cohort:** Two-Way = the pitcher's batting wOBA vs the **PITCHER** pool (already built, `traitCandidateBuilder.ts:101-107`) — an elite-hitting pitcher stands out *among pitchers* (the Shohei case), not drowned by every hitter. No artificial inflation, bar not impossibly high.
- **RULED — separate SP vs RP cohorts:** pitching-trait percentiles rank starters vs starters and relievers (SP/RP-with-no-starts + RP + CP) vs relievers, so short-burst reliever rate stats aren't compared to starter workloads. **Fall back to the full pitcher pool when a league's SP or RP cohort is below the min-peer-pool valve** (avoids noisy small-cohort percentiles). (Today pitchers are ONE cohort — this is the refinement.)

**Early-loss protection (validates "don't lose drafted traits cheaply"):** the **min-sample valve** keeps a held trait DORMANT until enough PA/IP — at CP1 (20%) most players haven't cleared it → no early loss; valuable tiers have a low loss bar (Rare bottom-22%, Elite bottom-12% — needs a near-total collapse); loss is probabilistic; the trend factor is neutral at CP1. Net: drafted valuable traits are safe through the early season but not impossibly sticky over a real decline.

**Build:** trend factor = a new multiplicative term in `buildProposalBase` (alongside the existing personality/morale tilts), sourced from a NEW since-last-checkpoint vs season-aggregate signal (the engine must track the recent window). SP/RP split = filter the peer-pool construction in the candidate builder/caller by pitcher sub-role (gamesStarted) with the min-peer-pool fallback. Both additive; the aggregate base + role cohorts already exist.

## 5. Generation rarity — the same scale weights prospect trait selection
Replaces the current **uniform** pick. `genWeight = (1 − traitWeight)` (per-tier values in §3). Two-Way `traitWeight ≈ 1.0` → `genWeight ≈ 0.05` (Elite floor) ⇒ **rare top-end, NOT excluded** (JK 2026-06-22). Selection = weighted random over the eligible pool (respect the workbook hitter/pitcher/both eligibility gate), two passes: (1) polarity per slot at `NEGATIVE_TRAIT_FRACTION = 0.27`; (2) weighted draw within polarity. Excluded entirely (priced for salary, no gain/loss, never generated): **Sign Stealer, Stimulated**.

## 6. Tunable config shape (one table a non-engineer edits)
`src/data/traitTierConfig.ts` (or extend `rosterEngineConstants.ts`):
```ts
export const TRAIT_TIERS_POSITIVE = {
  COMMON:   { weightMin: 0.00, gainThreshold: 0.55, lossThreshold: 0.30, genWeight: 1.00 },
  UNCOMMON: { weightMin: 0.30, gainThreshold: 0.70, lossThreshold: 0.30, genWeight: 0.50 },
  RARE:     { weightMin: 0.60, gainThreshold: 0.82, lossThreshold: 0.22, genWeight: 0.18 },
  ELITE:    { weightMin: 0.85, gainThreshold: 0.92, lossThreshold: 0.12, genWeight: 0.05 },
} as const;
export const TRAIT_TIERS_NEGATIVE = {
  MINOR:    { absDollarMin:    0, gainThreshold: 0.55, lossThreshold: 0.30, genWeight: 1.00 },
  MODERATE: { absDollarMin:  600, gainThreshold: 0.65, lossThreshold: 0.25, genWeight: 0.45 },
  SEVERE:   { absDollarMin: 1500, gainThreshold: 0.78, lossThreshold: 0.18, genWeight: 0.15 },
} as const;
export const TRAIT_WEIGHT_BLEND = { valuePart: 0.8, scarcityPart: 0.2 } as const;
export const SCARCITY_FROM_MAX_USES = { 0: 1.0, 1: 0.55, 2: 0.30, 3: 0.15, 9: 0.0 } as const;
export const NEGATIVE_TRAIT_FRACTION = 0.27;
export const ELITE_GEN_FLOOR = 0.05;            // Two-Way stays possible, never excluded
export const TRAIT_OVERRIDES: Record<string, Partial<{tier; gainThreshold; lossThreshold; genWeight}>> = {
  'Two Way (IF) (+)': { genWeight: 0.04 }, 'Two Way (OF) (+)': { genWeight: 0.04 }, 'Two Way (C) (+)': { genWeight: 0.04 },
};
export const TRAIT_ADAPTIVE_EXCLUDED = ['Sign Stealer (+)', 'Stimulated (+)'] as const;
```
Tier assignment is derived at load (compute `traitWeight`, bucket by `weightMin`). Knobs: "rares harder to earn" → bump `RARE.gainThreshold`; "Two-Way rarer" → lower its override `genWeight`; "more flaws on prospects" → raise `NEGATIVE_TRAIT_FRACTION`; "whole system stickier" → raise every `lossThreshold`.

## 7. Built vs greenfield
- **BUILT (cheap to extend):** reality scorer + sample valve (`traitRealityScorer.ts`); candidate builder (`traitCandidateBuilder.ts`, build-dark); acquisition engine with the gain/loss threshold seam already a tuning arg (`traitAcquisition.ts:91-92, 285-295` — widen scalar→tier-lookup, swap the 2 comparisons, NO new wiring); per-checkpoint sweep flag-gated + wired (`franchiseTraitGrantCompute.ts` → `processCompletedGame.ts:643`); cap/displacement reconciler.
- **GREENFIELD (bounded):** the `traitWeight` scale + tier config + override map; the negative badness-percentile inversion path + negative tier table; the generation-rarity weighted draw (replaces uniform).
- **DEFERRED / separate (post-D13):** the confirmation UI that promotes pending→applied (`franchiseTraitConfirmApply.ts` is orphaned — zero callers, so nothing changes a real player yet) + the Phase-2 flag flip (default OFF).

## 8. Resolved + defaults
- **✅ RULED (JK 2026-06-22) — the threshold engine SUPERSEDES the EOS "Trait Wheel Spin"; the award-based luck model is DEPRECATED.** The end-of-season profile change becomes simply **one more checkpoint** of the same adaptive engine: at season end, run the trait gain/loss thresholds (this spec) AND the ratings-development pass one final time → that determines the player's profile going into next season. NO separate probabilistic award-ceremony spin, award-winner-60%/top-30%/regular-5% weighting, eye-test ranking, or 15%-negative EOS rule. ⇒ `EOS_RATINGS_ADJUSTMENT_SPEC.md` §449 (the award-luck EOS model, Feb 2026) is **superseded for v1**; the negative-% inconsistency dissolves (one system). **Mode-3 (offseason) is OUT of v1 scope** — redesigned post-v1; for v1 the season-end checkpoint is the only offseason profile-change mechanism. Net cadence = 5 in-season checkpoints + 1 season-end checkpoint, all the same adaptive engine (traits + ratings).
- **(default) flat per-tier thresholds first**; a continuous within-tier nudge is a v2 flag.
- **(default) honor the Noodle Arm cut** — it's spec-cut but still in `BUILDABLE_TRAITS` (`traitCandidateBuilder.ts:56`) on a weak proxy; remove from the adaptive set.
- **(default) recompute the scale per-league** (the $ ranking is XBL-L2-derived; don't freeze cross-league).
- All threshold/genWeight numbers are Sim-Gate PLACEHOLDERS (shapes locked, values tunable at RB-16-style sweep).

## 8B. Resolution / selection layer — when multiple qualify (RULED 2026-06-22)
The threshold (§4) answers "does each trait individually qualify." This layer answers "given several qualifiers + the 2-slot cap, which land + how incumbents defend their slots." It **EXTENDS the already-built `reconcileGainProposals`** (`traitAcquisition.ts:375-437`) — which today handles the 2-cap, displacement, hysteresis, opposite-pairs, and re-evaluate-to-drop, but is **purely performance-P with NO value term and NO incumbency** — by threading the §2 value tiers + an incumbency bonus.

**Likelihood — RULED: probabilistic, not deterministic.** Clearing a threshold makes a trait *eligible*; whether it actually fires is a **seeded** probability that scales with the **margin past the threshold** (and tier — higher tiers slightly harder), so a borderline qualifier may wait a checkpoint while a standout almost always fires. Loss is symmetric (probability scales with how far below the loss bar). Seeded-deterministic (same seed → same outcome; reproducible for L-SIM/tests). Exact curve = sim-tune placeholder; shape = monotonic in margin. (Today the code is a deterministic `P ≥ 0.75` switch — this adds the roll.)

**Scoring — value + incumbency:**
- `gainScore(new)  = P × traitWeight`
- `keepScore(held) = P_held × traitWeight × β`  — **β = 1.25 (RULED, moderate incumbency)**
where `traitWeight` = the §2 value/scarcity weight (Common→Elite).

**Algorithm (additive to the built reconciler):**
1. Compute P per candidate (built); eligible gains (P≥gain) + losses (P≤lose) with hysteresis (built).
2. Roll the seeded likelihood per eligible gain/loss → the **firing set** (NEW).
3. Losses fire first → free cap slots (built; same-pass via `heldAfterLosses`).
4. **Rank firing gains by `gainScore` desc** (NEW — replaces arrival-order admission).
5. Admit best-first into open slots; `maxTraits = 2` becomes a **tunable constant** (today a hard literal `>= 2`).
6. At cap: duel `gainScore(new) > keepScore(weakestHeld)` → admit-with-displacement, else block `cap_no_displacement`; **recompute weakest after each displacement** (FIXES the double-displacement collision bug where two gains both target the same held slot).
7. Honor opposite-pair + role-eligibility + LeagueSettings caps (no 2 negatives, no bench negatives) (built).

**Satisfies JK's requirements:** value-weighted selection among multiple qualifiers (R2/R4a); "deserves to keep a Rare over gaining a Common" (via `traitWeight`); **"deserves to keep more than qualifies to gain"** (via β incumbency, R4b); probabilistic likelihood of gain AND loss (R1); fixes the cap-collision bug.

**Build cost:** additive to the tested P pipeline — ~4 line edits at the comparison points (`:407` compare score, `:415` `maxTraits`, `:428` score duel, `:439-447` `keepScore` comparator) + 1 ranking block (replaces `:418-434`, also fixes the bug) + the seeded likelihood roll + 2 new `TRAIT_ACQUISITION_TUNING` constants (`maxTraits=2`, `incumbencyBeta=1.25`) + the `traitWeight(trait)` fn (from §2/§6). Also closes the displacement-currency seam (`PROMPT_CONTRACTS.md:10246` — put both sides on recomputed `P × weight`). Write-back (`franchiseTraitGrantCompute.ts`) unchanged. **Prior spec lineage:** `FRANCHISE_V1_LIVING_SEASON_SPEC §9` (original cap+displacement+hysteresis), `TRAIT_SIGNAL_CERTIFICATION §VI.0`, `TRAIT_MEASUREMENT_SPEC §0.1` (P-currency) — this layer adds the value + incumbency the prior model lacked.

## 9. Provenance
Workbook scarcity (`TEAM MAX USES`) + value (IV $ ranking) extracted read-only from `reference-docs/IV_ENGINE_SOURCE_OF_TRUTH__XBL_Test_Texas_Rangers.xlsx`. Engine seams cited from kbl-mode1. Design research runs `wt1ks3cku` / `wlfqzli7h`; rulings JK-attended 2026-06-22.

## Appendix A — Worked examples (illustrative; thresholds are placeholders)
Read a score: **gainScore = P × traitWeight**; **keepScore = P × traitWeight × 1.25** (incumbency). `P` = the player's percentile in *that trait's* skill this checkpoint (role-appropriate cohort; see §4A). traitWeight ≈ tier (Elite ~1.0, Rare ~0.77, Uncommon ~0.42, Common ~0.15).

1. **Several qualify, 2 slots → value ranks them.** Rookie OF, 0 traits, CP2 qualifies for Cannon Arm (Rare, P 0.84 → gainScore 0.65), Tough Out (Uncommon, P 0.75 → 0.32), Sprinter (Common, P **0.90** → 0.14). Top-2 win = Cannon Arm + Tough Out; Sprinter — *highest raw P* — knocks on the door. Value beats raw performance.
2. **"Deserves to keep > qualifies to gain."** Holds Cannon Arm (Rare), arm quiet (P 0.55, above the 0.22 loss bar). CP3 qualifies for Sprinter (Common, P 0.88). At cap: keepScore(Cannon Arm)=0.55×0.77×1.25=**0.53** vs gainScore(Sprinter)=0.88×0.15=**0.13** → Sprinter blocked, Cannon Arm holds. Keeps the elite arm over hot-but-common speed.
3. **A real upgrade breaks through.** Holds Metal Head (Common, weight ~0) + Sprinter. CP4 qualifies for K Collector (Rare, P 0.86 → gainScore 0.69) ≫ weakest keepScore (Metal Head ≈0) → displaces Metal Head. Junk yields to genuine value.
4. **Probabilistic firing.** Qualifies for Clutch (Rare, bar 0.82) at CP2 with P 0.83 (barely over) → ~20% roll → doesn't fire ("almost had it"). By CP4 he's crushing clutch, P 0.95 → ~85% → fires. Rare traits are earned over time, not flipped at the line; a Common at P 0.90 fires near-certainly.
5. **Good-bat-bad-glove checkpoint (pos+neg compete).** Slugging 1B holds Rally Starter (Uncommon, P 0.40). CP3 qualifies to gain Big Hack (Rare, P 0.85) AND Butter Fingers (Minor flaw). 1 open slot: Big Hack (gainScore 0.65) takes it → now full; Butter Fingers (gainScore 0.09) duels weakest keepScore (Rally Starter 0.21) → blocked. The big bat lands; the minor flaw bounces off a full roster. (A *Severe* flaw — high weight — would muscle in.)
6. **One ace's season told by his 2 slots.** CP1 dominating Ks → gains K Collector. CP2 Elite SB (0.36) > weakest Composed keepScore (0.13) → displaces Composed. CP3 K-rate dips to P 0.50 — above the 0.22 loss bar → K Collector holds through the slump (Rare = sticky). CP4 control problem → Wild Thing (Severe flaw, high weight, gainScore ~0.68) > Elite SB keepScore (0.31) → the flaw displaces the lesser positive. EOS checkpoint locks K Collector + Wild Thing into next season.

**Throughline:** every checkpoint the 2 slots are a contest of `P × value (× 1.25 if held)`. Cheap traits churn with form; valuable traits are hard to win, defend their slots, and yield only to something genuinely better; flaws must be *strong* to crash a full roster.
