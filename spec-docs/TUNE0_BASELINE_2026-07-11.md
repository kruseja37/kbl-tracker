# TUNE-0 — baseline and one-factor sensitivity ranking

**Date:** 2026-07-11  
**Branch / source:** `integration/living-season-full` at `0be5ea2e` before this TUNE-0 commit  
**Cut line:** targets, baselines, and sensitivity ranking only. This is **not converged tuning**.  
**Decision status:** every target below is **DRAFT FOR JK/CAPTAIN RATIFICATION**.

## Files

- Harness: `test-utils/lsim/tune0.config.ts`, `tune0.scenario.ts`, `tune0Metrics.ts`, `tune0Overrides.ts`, `tune0Sensitivity.ts`, plus the small optional-metrics extension in `feedbackClosure.ts`.
- Raw directory: [`test-utils/lsim/results/tune0/`](../test-utils/lsim/results/tune0/).
- Artifact index and runtime reductions: [`manifest.json`](../test-utils/lsim/results/tune0/manifest.json).
- Full current-default closure baseline: [`baseline-closure.json`](../test-utils/lsim/results/tune0/baseline-closure.json).
- Current-default 24-game smoke baseline: [`baseline-smoke.json`](../test-utils/lsim/results/tune0/baseline-smoke.json).
- Common reduced sensitivity baseline: [`sweep-baseline.json`](../test-utils/lsim/results/tune0/sweep-baseline.json).
- Normalization, per-variant impacts, ranking, inert list, unstable list: [`ranking.json`](../test-utils/lsim/results/tune0/ranking.json).
- Every low/default/high result has its own JSON named `<knob>-<setting>.json`. The manifest enumerates all 31 artifacts.

## T1. BEFORE baseline

The full closure leg uses the FIDELITY-1 slump→recovery regime, seed `lsim-fidelity-1`, 10 games/team, 30 scheduled games, and standard five-checkpoint cadence. It ended at digest `7092877:08fe33f4`. The separate smoke leg uses seed `opus-audit-scaled`, 8 games/team, 24 scheduled games, all Phase-2 flags on, and ended at digest `6463239:5efe000e` with 24/24 games, `stoppedEarly=false`, and zero findings. Sources: `baseline-closure.json` and `baseline-smoke.json`.

Table notation: development is `proposal count / sum of absolute proposed rating deltas`; each age cell is the same `count / absolute delta`; traits are `gain / lose`; fame tiers are `IMMORTAL / GLOBAL / NATIONAL / REGIONAL / LOCAL / UNKNOWN / POLARIZING / NOTORIOUS / DESPISED`; morale is `net delta / absolute delta`; events are `new L10 / new L11`; relationships are `new formation writes / unique formed edges at checkpoint`.

### Closure baseline — per checkpoint

| CP (game) | Development | Age 18–21 | Age 22–24 | Age 25–31 | Age 32–35 | Age 36+ | Traits | Fame min / median / max | Fame tiers | Player morale | Fan morale | L10 / L11 | Relationships |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|---:|---:|---:|---:|
| 1 (6) | 33 / 68 | 0 / 0 | 21 / 44 | 12 / 24 | 0 / 0 | 0 / 0 | 5 / 0 | −10.013 / −0.257 / 48.970 | 2/0/2/9/16/38/8/1/0 | 116 / 256 | −18 / 86 | 10 / 0 | 7 / 7 |
| 2 (12) | 69 / 134 | 0 / 0 | 28 / 59 | 41 / 75 | 0 / 0 | 0 / 0 | 8 / 0 | −17.208 / 3.972 / 48.970 | 2/1/11/21/18/22/13/8/0 | 210 / 456 | 50 / 50 | 10 / 1 | 9 / 11 |
| 3 (18) | 123 / 236 | 0 / 0 | 43 / 95 | 80 / 141 | 0 / 0 | 0 / 0 | 2 / 0 | −22.738 / 5.606 / 48.714 | 4/5/17/27/19/14/9/6/1 | 209 / 275 | 64 / 66 | 9 / 0 | 15 / 21 |
| 4 (24) | 107 / 196 | 0 / 0 | 36 / 71 | 71 / 125 | 0 / 0 | 0 / 0 | 59 / 1 | −20.626 / 7.271 / 50.000 | 5/7/20/26/14/11/12/4/3 | 215 / 289 | 28 / 38 | 13 / 0 | 7 / 23 |
| 5 (30) | 78 / 147 | 0 / 0 | 22 / 49 | 56 / 98 | 0 / 0 | 0 / 0 | 129 / 0 | −20.626 / 7.293 / 48.814 | 6/9/23/23/16/7/8/7/3 | 238 / 260 | 16 / 16 | 17 / 0 | 7 / 25 |

Closure totals: 410 rating proposals with 781 absolute rating points proposed; 203 trait gains and 1 loss; player-morale net +988 / absolute 1,536; fan-morale net +140 / absolute 256; 59 L10 events; 1 L11 firing; 45 formation writes, ending on 25 unique formed edges with 2 dissolved. Source: `baseline-closure.json`.

### Smoke baseline — per checkpoint

| CP (game) | Development | Age 18–21 | Age 22–24 | Age 25–31 | Age 32–35 | Age 36+ | Traits | Fame min / median / max | Fame tiers | Player morale | Fan morale | L10 / L11 | Relationships |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|---:|---:|---:|---:|
| 1 (5) | 21 / 39 | 0 / 0 | 13 / 26 | 8 / 13 | 0 / 0 | 0 / 0 | 2 / 0 | −5.476 / 1.776 / 36.736 | 1/2/8/3/4/45/4/0/0 | 123 / 215 | −27 / 85 | 7 / 0 | 11 / 11 |
| 2 (10) | 58 / 107 | 0 / 0 | 25 / 50 | 33 / 57 | 0 / 0 | 0 / 0 | 10 / 0 | −6.011 / 4.513 / 36.736 | 1/2/10/10/32/27/4/0/0 | 51 / 425 | 31 / 35 | 10 / 0 | 7 / 14 |
| 3 (15) | 80 / 164 | 0 / 0 | 30 / 68 | 50 / 96 | 0 / 0 | 0 / 0 | 11 / 0 | −8.668 / 10.791 / 42.736 | 1/2/26/33/22/13/1/0/0 | −24 / 352 | 45 / 45 | 7 / 1 | 15 / 24 |
| 4 (20) | 117 / 255 | 0 / 0 | 43 / 108 | 74 / 147 | 0 / 0 | 0 / 0 | 42 / 0 | −8.678 / 8.365 / 27.940 | 1/3/25/31/25/12/4/0/0 | −8 / 258 | 30 / 30 | 11 / 0 | 5 / 24 |
| 5 (24) | 103 / 220 | 0 / 0 | 37 / 95 | 66 / 125 | 0 / 0 | 0 / 0 | 70 / 1 | −9.061 / 8.498 / 27.940 | 1/3/26/30/28/11/2/1/0 | −67 / 173 | 14 / 24 | 7 / 0 | 11 / 30 |

Smoke totals: 379 rating proposals / 785 absolute points; 135 trait gains / 1 loss; player morale +75 net / 1,423 absolute; fan morale +93 net / 219 absolute; 42 L10 events; 1 L11 firing; 49 formation writes. Source: `baseline-smoke.json`.

The seeded rosters contain only ages 22–31, so all other age-band cells are zero. That is a harness coverage limit, not evidence those bands are inert.

## T2. One-factor sensitivity sweep

Runtime policy is recorded in `manifest.json`. The full T1 baseline stayed at 10 games/team. To keep comparisons bounded, the common sensitivity schedule was reduced uniformly to 4 games/team = 12 scheduled games with the same `lsim-fidelity-1` seed and five standard checkpoints. The 0.5× relationship threshold still ran away at both 12 and 6 scheduled games; it is archived as `UNSTABLE-RUNTIME` with no fabricated numeric summary. Default and high relationship variants remain comparable on the common 12-game schedule.

| Knob | Low | Default | High | Injection notes |
|---|---:|---:|---:|---|
| `wpaToHeatScale` | 5 | 10 | 20 | **NOT-SWEEPABLE**: `FAME_INPUT_TUNING` is module-private; varying it requires a forbidden `src/**` edit. Placeholder JSONs record this. |
| Sweep-side `performanceSignalScale` | 100,000 | 200,000 | 400,000 | Mutated `CHECKPOINT_DEV_TUNING.performanceSignalScale`; production sweep consumes pre-normalized signals. |
| Checkpoint cadence | — | 5 | 10 | Harness config injection (`standard` vs `frequent`). |
| Fan dampener strength | 0.3 | 0.6 | 1.2 | `baseStrength` only; `maxDampen=0.9` held. |
| Age-gravity slopes | 0× | 1× | 2× | Scaled every `ageCurveSlopeByBand`; rating-key steepness held. |
| Fame `decayPerUpdate` | 0.425 | 0.85 | 1.70 | Literal 0.5×/1×/2× retention sweep. High is above 1 and intentionally probes instability. |
| Morale personality spread | 0.5× | 1× | 2× | Each multiplier transformed as `1 + (default − 1) × factor`. |
| Relationship formation thresholds | .39/.39/.40/.42 | .78/.78/.80/.84 | 1.56/1.56/1.60/1.68 | Order: rivalry/feud/mentorship/friendship; jitter window .03 held. Low is `UNSTABLE-RUNTIME`. |
| K5 backlash magnitude | 2 | 4 | 8 | `maxFanMorale=100` held; only `maxBacklashMagnitude` varied. |

Representative raw movement versus the common default (`sweep-baseline.json`):

- Fame retention 0.425 / 0.85 / 1.70 moved final mean Heat 6.022 / 9.885 / 18.779 and final median 4.042 / 8.830 / 14.756. At 1.70, p75 hit +50, the minimum hit −30, and Immortal count jumped 8→38. Sources: the three `fame-decay-per-update-*.json` files.
- Relationship thresholds at 2× reduced formation writes 32→7 and final unique formed edges 14→7; player morale moved from +403 net / 1,031 absolute to +275 / 627. The 0.5× leg is the separately archived runtime runaway. Sources: `relationship-formation-threshold-*.json`.
- Cadence 5→10 increased rating proposals 134→153, absolute rating magnitude 245→275, formation writes 32→57, and player-morale movement +403/1,031→+412/1,054. Sources: `checkpoint-cadence-5.json` and `checkpoint-cadence-10.json`.
- Morale personality spread low/default/high moved aggregate player morale +389/+403/+426 net and 1,049/1,031/1,022 absolute; trait gains were 13/14/13. Sources: `morale-personality-spread-*.json`.
- Age gravity 0×/1×/2× moved the young 22–24 band from +55/+67/+91 signed points (121/125/131 absolute), while the prime band stayed +56/+56/+55. Sources: `age-gravity-band-slopes-*.json`.
- Fan dampener low/default/high moved development proposal count 136/134/128 and absolute magnitude 256/245/234; the measured downstream families were unchanged. Sources: `fan-dampener-strength-*.json`.
- K5 backlash and performance-signal scale were byte-identical to the common baseline at every checkpoint. Sources: `k5-backlash-curve-*.json`, `performance-signal-scale-*.json`, and `ranking.json`.

## T3. Ranking, inert list, unstable list, and draft targets

Normalized component impact is `abs(variant − baseline) / max(1, abs(baseline))`. Each output family—development, traits, fame, morale, events, relationships—gets equal weight. A knob's score is the maximum non-default variant impact. Full formula and per-family values live in `ranking.json`.

| Rank | Knob | Impact | Measured movement | Disposition |
|---:|---|---:|---|---|
| 1 | Fame decay/retention | 0.287438 | Fame 1.544116; morale .126457; traits .035714; development .018340 at 2× | **UNSTABLE high-side clamp saturation** |
| 2 | Relationship formation threshold | 0.077380 | High: relationships .320313, morale .127961, development .016004; low timed out twice | **UNSTABLE runtime runaway** |
| 3 | Checkpoint cadence | 0.060381 | Relationships .195313; morale .102869; development .061371; fame .002730 | Active tuning dial |
| 4 | Morale personality spread | 0.013564 | Morale .036471; traits .035714; development .009200 | Active but low aggregate sensitivity |
| 5 | Age-gravity slopes | 0.004911 | Development .029463 only | Active, targeted age effect |
| 6 | Fan dampener strength | 0.003952 | Development .023711 only | Active, narrow effect |
| 7 | K5 backlash curve | 0 | No measured movement | **INERT in this event mix; freeze candidate, coverage caveat** |
| 8 | Sweep-side performance scale | 0 | Exact checkpoint match at .5×/1×/2× | **INERT/vestigial in this caller; freeze candidate** |

**INERT list:** `performanceSignalScale` and K5 backlash. The first is expected: the real checkpoint caller consumes already-normalized signals. K5's zero is weaker evidence because the one L11 firing did not exercise the beloved-manager/high-fan-morale backlash branch. Freeze the K5 magnitude only after a targeted firing fixture proves the curve separately.

**NOT-SWEEPABLE list:** `wpaToHeatScale`. Do not interpret absence from the numeric ranking as low importance.

**UNSTABLE list:** fame decay/retention at 2× (both Heat clamps and upper-quartile saturation) and relationship threshold at 0.5× (combinatorial runtime runaway even after two game-count reductions).

### DRAFT FOR JK/CAPTAIN RATIFICATION — proposed target metrics

| Ranked knob | Proposed target metric | Draft acceptable band | Grounding |
|---|---|---|---|
| Fame decay/retention | Final Heat distribution and clamp share | p75 12–24; Immortal 5–15% of tracked players; neither clamp contains >10% | Default p75 19.106 and 8/102 Immortals; 2× produced p75=50 and 38/102 Immortals. |
| Relationship threshold | Unique formed edges and execution bound | 4–10 relationship endpoints per team by season end; no one-factor leg >120 s; no checkpoint adds >2× prior unique edges | Full baselines ended with 25–30 unique edges across 6 teams; 0.5× was operationally runaway. |
| Checkpoint cadence | Total proposal load and movement across five checkpoints | 120–170 rating proposals and 220–300 absolute points in the 12-game harness; trait volume no more than +25% vs standard | Standard 134/245; frequent 153/275; traits stayed 14. |
| Morale personality spread | Aggregate motion plus personality-cohort separation | Aggregate player net +350..+450 and absolute 900..1,150 in this harness; add a future cohort metric targeting strongest/weakest personality mean-absolute-delta ratio 1.2–1.8 | Default +403/1,031; low +389/1,049; high +426/1,022. Cohort spread is not yet emitted. |
| Age-gravity slopes | Young-vs-prime signed development and star arc | 22–24 mean signed proposal +0.8..+1.4 above neutral; prime +0.5..+1.0; a full-season star gains +3..+6 total rating points across five checkpoints | Default short-run means: young 67/61=+1.10; prime 56/73=+0.77. |
| Fan dampener strength | Counter-trend proposal volume/magnitude | 120–145 proposals and 220–270 absolute points in this harness; no change outside development | Low/default/high counts 136/134/128 and absolute 256/245/234. |
| K5 backlash curve | Targeted beloved-manager firing response | At fan morale 75: −1..−3 fan morale; at 100: −3..−5; zero aggregate effect when no beloved firing occurs | Current default curve implies −2 at 75 and −4 at 100; this harness did not exercise it. |
| Sweep-side performance scale | Caller coherence | Exactly zero effect while the production path consumes pre-normalized signals; freeze/remove the vestigial knob unless intentionally rewired | Every .5×/1×/2× checkpoint summary was byte-identical. |

Once `wpaToHeatScale` becomes harness-injectable, its first target should be judged against the fame target row above, not tuned independently.

### ADDENDUM 2026-07-11 (same day) — JK ruling R-E reframes these targets; R-F invalidates one knob's premise

**R-E (dynamics philosophy — `DECISIONS_LOG.md` 2026-07-11):** the living season is designed to feel
like multiple seasons compressed into one; ratings move up and down as performance dictates, with
**no magnitude caps as design targets**. The only legitimate brakes are (1) less-meaningful outcomes
(e.g. 38/102 Immortals — clamp saturation destroying the fame band's meaning) and (2) a chaotic,
cause-unreadable feel. Consequences for the table above:

- **Age-gravity row:** the "+3..6 total rating points per star per season" band is **WITHDRAWN** —
  it was a magnitude cap. Replacement target shape: young-vs-prime **separation stays readable**
  (young mean signed proposal remains above prime's at every slope setting — direction, not
  ceiling), star trajectories remain **distinguishable** from median players, and no rating clamps
  saturate. Total movement is unbounded by design.
- **Checkpoint-cadence + fan-dampener rows:** the proposal-count/absolute-point bands become
  **descriptive baselines, not acceptance ceilings**. The acceptance criterion is
  cause-readability + distribution shape, not volume.
- **Fame row STANDS** — it is already a shape/meaningfulness target (tier separation, clamp share),
  which is exactly R-E's kind of brake. The Immortal 5–15% band is a meaning floor, not a
  conservatism cap.
- **Morale-spread row:** the cohort-separation half stands (shape); the aggregate net/absolute band
  becomes descriptive.

**R-F (organic relationships — `DECISIONS_LOG.md` 2026-07-11):** the relationship-threshold and
cadence rows measured a formation writer that is checkpoint-batch-gated — which JK ruled a defect
(formation must be organic per-game; contract `CONTRACT_RELORGANIC_2026-07-11.md`). After
RELORGANIC lands: (a) checkpoint cadence must show **near-zero** relationship-family impact (its
0.195 relationship impact above becomes a regression signal, not a dial), and (b) the
relationship-threshold knob must be re-swept against the per-game hazard model — its current
numbers describe the batch model and do not carry over.

## T4. Honest limits

- This is one deterministic synthetic seed per variant, not a variance study. Ranking is repeatable, not confidence-interval robust.
- Sensitivity variants use a short 12-game schedule. The full T1 closure and smoke baselines remain 30 and 24 games, but numeric impacts are not cross-season convergence evidence.
- The relationship-low leg has no fabricated distribution: it exceeded six minutes at both 12 and 6 games and is recorded as runtime instability. Its numeric magnitude is unknown.
- Seeded players cover ages 22–31 only. The 18–21, 32–35, and 36+ age slopes remain unmeasured here.
- The slump→recovery regime is one performance shape. It cannot establish feel under stars-only, scrubs-only, injury-heavy, trade-heavy, or balanced real leagues.
- Synthetic games do not reproduce the real GameTracker event mix, user corrections, confirmation/rejection choices, lineup usage, or narrative cadence. L10/L11/K5 conclusions are especially event-mix dependent.
- The harness sees one season only. It cannot validate cross-season fame floors, relationship arcs, manager legacies, aging accumulation, or multi-season oscillation.
- The normalized score equal-weights six output families. That is a transparent ranking convention, not a product-value judgment.
- These targets are draft measurement bands. No production knob value is ratified or changed by TUNE-0.

## Verification

- Preflight production build: exit 0; `src/**` untouched.
- Untouched default closure: green; all seven FIDELITY-1 closure steps passed, same-seed replay byte-identical.
- Untouched default smoke: green; 24/24 games, zero findings, all non-waived CRITICAL invariants green.
- TUNE-0 harness: 1/1 test passed; 31 JSON artifacts; 8 ranked knobs; 2 inert; 2 unstable; 1 NOT-SWEEPABLE.
- Every numeric table above traces to a named JSON in `test-utils/lsim/results/tune0/`; `manifest.json` is the complete file index.
- Canonical `test-utils/lsim/results/lsim-h2-baseline-*.json` files were not written or changed.

**TUNE-0 complete.**
