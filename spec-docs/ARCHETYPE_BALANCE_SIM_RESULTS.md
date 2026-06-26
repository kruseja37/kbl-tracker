# Archetype Balance Simulator — Methodology & Baseline Results

> Tool: `src/engines/archetypeBalanceSimulator.ts` · Runner/baseline: `src/engines/__tests__/archetypeBalanceSimulator.test.ts`
> Status: v1 built + committed (branch `codex/draft-pipeline-fix`), 2026-06-26. Reusable EV-flatness gate for every archetype add/tweak.

## What it does (the EV-flatness gate)

For each archetype, the sim builds the **best-achievable 22-man roster** it can afford under that archetype's spending rules, then checks whether every archetype lands within a parity band (default **±10%**) of the cross-archetype mean roster value. Any archetype outside the band is a FINDING — soften or drop it before it ships. This is the spec's §5.3 T3 acceptance criterion made runnable.

- **Pool + values:** the frozen IV oracle (`spec-docs/reference/iv_oracle.json`, read-only) — 440 players with canonical kblIV + ratings + position. Value metric = total kblIV; base salary ≈ kblIV, so the budget binds via the luxury tax — an archetype's edge is exactly how much tax it lets you avoid by building to its identity.
- **Engine reuse (no parallel math):** `shiftLuxuryCaps` applies the archetype to the per-stat caps, `luxuryTax` charges over-cap concentration, `computePoolTierCap` is the team budget — the same live construction engine the real draft uses.
- **Roster builder:** a budget-aware hill-climb from two starts (value-first + archetype-fit-first), keeping the better roster. The fit-first start lets the deep-nerf archetypes reach their natural specialist roster, so they aren't scored low merely because their optimum is hard to find. Identical procedure for every archetype → fair comparison. (Heuristic, not a global optimizer — see caveat.)

## Baseline result (33 workbook archetypes, all three tiers)

| Tier | Within ±10% | Max deviation | Outliers |
|---|---|---|---|
| Juiced | 32 / 33 | 35.8% | Lazer Guns −36% |
| Standard | 31 / 33 | 38.1% | Defense First −16%, Lazer Guns −38% |
| Nerfed | 31 / 33 | 29.3% | Defense First −25%, Lazer Guns −29% |

**Verdict: the workbook's calibration mostly transfers to our pool + value engine.** ~94–97% of archetypes are flat (within ±5% at standard). Both outliers fail on the **too-weak** side (not exploitable — the opposite, so no cheating risk), and the failure is stable across a value-first and a fit-first builder start, so it's genuine, not tool noise.

### The two outliers — why
- **Lazer Guns** (hard outlier at every tier): catastrophically nerfs JUNK (rotation −260, bullpen −150) while boosting velocity/accuracy. Our pool's pitchers mostly carry meaningful junk, so they bust the slashed junk cap → heavy tax → no solvent competitive staff. You'd need near-zero-junk power/control pitchers that barely exist.
- **Defense First** (borderline — in band at juiced, out at standard/nerfed): nerfs power/contact (−60/−60) AND all pitching (−40…−60) while boosting fielding/arm/speed. Needs a roster of glove-first, weak-bat, soft-tossing players — too extreme for the pool once the caps tighten below juiced.

## Recommendation
- **Ship the ~31 balanced archetypes** as the basis for the curated set.
- **Lazer Guns + Defense First:** soften their nerf depth (and re-run to confirm they pull into band) OR drop them — there are plenty of other balanced options covering the same play styles (finesse pitching, glove/defense). **JK decision: retune vs drop.**

## Gap-map (play styles covered by a *balanced* option)
Power, contact, speed, glove/defense, power-pitching, finesse-pitching → all covered and balanced. Thin spots (candidates only if we want more variety): a combined **pitching-and-defense** run-prevention identity (nothing boosts both at once), deeper **bullpen** depth (only one option), a richer **small-ball** identity. The baseline says we don't strictly need many new ones.

## Caveat
The roster-builder is a strong heuristic, not a proven optimum. The 31 clustered archetypes are robust; the two outliers are stable across both builder starts (confirming genuine harshness). If we later need to *prove* a tight number for a specific archetype, the builder can be hardened further (random restarts, larger candidate shortlists).
