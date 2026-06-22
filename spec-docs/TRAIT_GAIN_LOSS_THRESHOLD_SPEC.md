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

## 8. Open forks / defaults
- **(FORK — JK, open) §8 the two-system conflict:** the in-season checkpoint adaptive engine (this spec) vs the **EOS "Trait Wheel Spin"** (`EOS_RATINGS_ADJUSTMENT_SPEC.md` §449 — probabilistic award-ceremony: award winners 60% / top 30% / regular 5%, 15% negative, eye-test). These are two different philosophies for season trait change. **DECIDE: does the threshold engine SUPERSEDE the EOS wheel-spin, do they LAYER (in-season threshold drift + an EOS ceremony reveal moment), or is one deprecated?** (Also note the negative-% inconsistency: EOS 15% vs generation 27%.)
- **(default) flat per-tier thresholds first**; a continuous within-tier nudge is a v2 flag.
- **(default) honor the Noodle Arm cut** — it's spec-cut but still in `BUILDABLE_TRAITS` (`traitCandidateBuilder.ts:56`) on a weak proxy; remove from the adaptive set.
- **(default) recompute the scale per-league** (the $ ranking is XBL-L2-derived; don't freeze cross-league).
- All threshold/genWeight numbers are Sim-Gate PLACEHOLDERS (shapes locked, values tunable at RB-16-style sweep).

## 9. Provenance
Workbook scarcity (`TEAM MAX USES`) + value (IV $ ranking) extracted read-only from `reference-docs/IV_ENGINE_SOURCE_OF_TRUTH__XBL_Test_Texas_Rangers.xlsx`. Engine seams cited from kbl-mode1. Design research run `wt1ks3cku`; rulings JK-attended 2026-06-22.
