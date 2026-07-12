# TUNE-1-REL — organic relationship-hazard re-sweep

**Date:** 2026-07-11  
**Source:** `codex/tune1-relationships` from `origin/main` at `b17561d0`  
**Decision status:** measurement and ranking complete; target table is **DRAFT FOR RATIFICATION**  
**Scope:** harness/results only plus this report; production `src/**` is untouched

## Files and artifact map

- Harness: `test-utils/lsim/tune1.config.ts`, `tune1.scenario.ts`, extended `tune0Overrides.ts`, additive organic metrics in `tune0Metrics.ts`, and the additive metrics call in `feedbackClosure.ts`.
- Result index and comparison discipline: [`manifest.json`](../test-utils/lsim/results/tune1/manifest.json).
- Default baseline: [`baseline-default.json`](../test-utils/lsim/results/tune1/baseline-default.json).
- Cadence regression: [`cadence-comparison.json`](../test-utils/lsim/results/tune1/cadence-comparison.json), with its two named variants [`checkpoint-cadence-5.json`](../test-utils/lsim/results/tune1/checkpoint-cadence-5.json) and [`checkpoint-cadence-10.json`](../test-utils/lsim/results/tune1/checkpoint-cadence-10.json).
- Sensitivity ranking and formula: [`ranking.json`](../test-utils/lsim/results/tune1/ranking.json).
- Dormant-potential disposition: [`potential-hazard-dormant.json`](../test-utils/lsim/results/tune1/potential-hazard-dormant.json).
- Per-knob rows: every `relationship-<knob>-<low|default|high>.json` in [`results/tune1/`](../test-utils/lsim/results/tune1/).

All numeric tuning legs use seed `lsim-fidelity-1`, 4 games/team, 12 scheduled games, and standard five-checkpoint cadence. The only intentional comparison difference outside a one-factor knob is the cadence regression leg, which changes standard/5 to frequent/10. The common 1× leg is reused for every default row; seeds and game count were never reduced mid-comparison. Source: `manifest.json`.

## T1. Organic override injection

The existing snapshot/restore injector now mutates these exported live values harness-side, one at a time:

| Composite knob | 0.5× | 1× | 2× | Held fixed |
|---|---:|---:|---:|---|
| `perGameHazard.activeBase` | 0.01 | 0.02 | 0.04 | slope, cap, thresholds |
| `perGameHazard.activeSlopePerPoint` | 1.5 | 3.0 | 6.0 | base, cap, thresholds |
| `perGameHazard.activeCap` | 0.175 | 0.35 | 0.70 | base, slope, thresholds |
| four `thresholds` together | .39/.39/.40/.42 | .78/.78/.80/.84 | 1.56/1.56/1.60/1.68 | hazard shape, seeded window |

Each artifact records the injected values. The injector restores the full tuning object after every leg. `potentialBase`, `potentialSlopePerPoint`, and `potentialCap` are **DORMANT-LIVE-PATH**, not swept: the live writer groups MLB players by team before scoring, and same-team candidates always have `potential=false`; cross-team pools are the only potential branch. Source: `potential-hazard-dormant.json`.

## T2. Organic metrics and default baseline

The additive metrics capture, per variant:

- unique organic formed edges and type split at the final game;
- distinct formation games, first/last game, largest same-game batch, and the full game→batch map;
- per-team edge count min/median/max plus every team value;
- live above-threshold candidate coverage and whether formed edges remain a strict subset;
- compatibility-margin terciles with unformed candidates censored at game 13, so timing compares the full candidate universe rather than only successes;
- the full `relationshipMoraleDeltas` summary family;
- wall-clock runtime per actual leg.

The candidate reader reuses production scoring. Harness-only probability 1 exposes every active above-threshold candidate, then the current variant's hazard values are restored immediately; no production formula is copied.

### Defaults, 12-game comparison schedule

| Measure | Default result |
|---|---:|
| Unique organic formed edges | 4 |
| Type split RIVALRY / FEUD / MENTORSHIP / FRIENDSHIP | 0 / 1 / 3 / 0 |
| Formation games | 1, 6, 10, 12 |
| Distinct games / first / last / largest batch | 4 / 1 / 12 / 1 |
| Per-team min / median / max | 0 / 0 / 3 |
| Eligible candidates / formed / share | 11 / 4 / 0.363636 |
| Marginal / middle / strong censored mean formation game | 13 / 11.25 / 9 |
| Compatibility timing monotone | yes |
| Relationship hits / recoveries / charged-matchup deltas | 46 / 0 / 2 |
| Hit / recovery / charged delta totals | +94 / 0 / 0 |
| Duplicate morale sources / morale→WAR leaks | 0 / 0 |
| Runtime | 46,564.097 ms |

Source: `baseline-default.json`. This is an organic, non-batched result—each of four formations occurred on a different game—but it is uneven across clubs: only teams 03 and 05 formed edges in this short seed, so median team count remains zero.

### Runtime per leg

| Actual leg | Runtime |
|---|---:|
| baseline defaults / cadence 5 | 46,564.097 ms |
| cadence 10 | 60,469.166 ms |
| active base 0.5× / 2× | 66,095.671 / 37,665.733 ms |
| active slope 0.5× / 2× | 34,416.910 / 43,556.475 ms |
| active cap 0.5× / 2× | 42,502.413 / 44,196.894 ms |
| thresholds 0.5× | **UNSTABLE-RUNTIME; >360,000 ms lower bound, terminated without numbers** |
| thresholds 2× | 38,761.686 ms |

Sources: each named variant JSON; attempted/completed counts are in `manifest.json`. The threshold-low artifact explicitly contains `relationships: null`; no numeric outcome is fabricated.

## T3. Movement, ranking, and draft targets

Normalized impact is the equal-weight mean of four families—volume, spread, compatibility timing, and morale cascade. Within a family, each metric is `abs(variant − baseline) / max(1, abs(baseline))`; a knob takes the maximum completed non-default variant. Runtime-unstable knobs rank before numerically completed knobs without inventing an impact for the timed-out leg. Source: `ranking.json`.

| Rank | Knob | Impact | Low → default → high movement | Disposition |
|---:|---|---:|---|---|
| 1 | Thresholds | 0.667749 on completed high leg | **runtime runaway** → 4 → 0 formed; candidates unknown → 11 → 0; hits unknown → 46 → 0 | Highest leverage and unsafe at both extremes: low is operationally runaway; high erases the eligible universe. |
| 2 | Active slope | 0.192633 | 2 → 4 → 5 formed; 2 → 4 → 4 distinct games; team max 2 → 3 → 4; hits 30 → 46 → 80 | Strongest usable organic dial; 2× moves strong candidates earlier while preserving strict-subset and monotone timing shape. |
| 3 | Active base | 0.105575 | 3 → 4 → 4 formed; 3 → 4 → 4 distinct games; hits 32 → 46 → 46 | Secondary dial. The high leg is exact-match in this one seed because no extra seeded roll crosses the probability change. |
| 4 | Active cap | 0 | 4 → 4 → 4 formed; all recorded organic/cascade metrics exact-match | Inert over this candidate range. The largest default threshold margin is 0.0444, yielding hazard 0.1532, below even the 0.5× cap of 0.175; the cap never binds. |

Sources: `ranking.json` plus the corresponding low/default/high artifacts. The threshold-high leg still reports two charged-matchup entries because those event-driven edges are outside organic formation; organic hits are zero.

### Cadence-independence regression gate — PASS

Cadence 5 versus 10 produced:

- exact organic-core equality;
- normalized relationship impact `0` against the `0.01` near-zero limit;
- 4 formed edges in both legs, same type split, same games 1/6/10/12, same per-team distribution, same compatibility timing, and the same morale cascade totals.

This is the required R-F signal: checkpoint cadence no longer controls relationship volume. Source: `cadence-comparison.json`. A future non-zero core diff or impact above 0.01 is a product regression, not a tuning movement.

### DRAFT FOR RATIFICATION — R-E shape targets only

These are meaning/shape tests, not magnitude caps. They deliberately do not impose a maximum number of season relationships.

| Shape | Draft target | Default status |
|---|---|---|
| Organic spread | Formations occupy at least half as many distinct games as formed edges; no single game contains a majority of all formations. | PASS: 4 distinct games for 4 edges; largest batch 1. |
| Club coverage without saturation | At least half of clubs finish with one or more organic edges, while formed edges remain a strict subset of eligible candidates. | **MISS on coverage:** 2/6 clubs; PASS on strict subset: 4/11. |
| Compatibility separation | Censored mean timing is monotone: strong forms no later than middle, middle no later than marginal. | PASS: 9 ≤ 11.25 ≤ 13. |
| Candidate meaningfulness | The eligible universe is non-empty, at least one organic edge forms, and not every eligible candidate forms. | PASS at default; 2× thresholds fail by producing zero candidates. |
| Type readability | More than one organic relationship type appears; one type may lead but cannot be the entire season story. | PASS narrowly: FEUD + MENTORSHIP; short seed contains no RIVALRY/FRIENDSHIP. |
| Cascade integrity | Relationship morale sources remain unique; recovery nets to zero when recovery is exercised; charged effects preserve sign diversity; no relationship morale leaks into WAR. | Partial coverage: uniqueness/sign diversity/no-WAR-leak pass; recovery is unexercised. |
| Cadence independence | Five and ten checkpoints retain exact organic core, with relationship-family normalized impact ≤0.01. | PASS exactly: impact 0. |

Recommendation for the next tuning pass: treat active slope as the primary usable dial, active base as a secondary seeded-probability dial, and leave cap frozen until a roster/threshold range actually reaches it. Do not ratify either threshold extreme; narrow threshold probes require a bounded or analytically sampled harness before another full-pipeline low-side run.

## T4. Honest limits

- This is one deterministic synthetic seed, not a variance or confidence-interval study. A high-base exact match means no seeded roll crossed in this seed, not general inertness.
- Numeric comparisons use 12 scheduled games. They establish local sensitivity and organic shape, not full-season convergence or final magnitude.
- Threshold 0.5× exceeded six minutes on the uniform schedule and was terminated. Its direction is operationally dangerous, but its edge/cascade magnitude is unknown.
- The default candidate universe is only 11 edges, and club distribution is sparse (median zero). The proposed coverage target therefore remains unratified and currently missed.
- Compatibility timing uses terciles of threshold margin and censors unformed candidates at game 13. This avoids success-only bias, but the tiny terciles (3/4/4 candidates) are not statistically robust.
- The sandbox's eligible organic types are FEUD and MENTORSHIP in the observed defaults; RIVALRY and FRIENDSHIP receive no default formation sample. Type balance is under-covered.
- Recovery deltas remain zero in every numeric leg. The morale cascade measurements cover hits and charged matchups, not the recovery branch.
- Potential hazard knobs are genuinely dormant on this same-team live path. This sweep says nothing about a future cross-team potential pool.
- Wall-clock runtime includes IndexedDB and whole completion-pipeline work and will vary with machine load. It is operational evidence, not a performance benchmark.
- Candidate discovery forces only harness-side active probability to 1 to expose production-scored candidates. It restores variant values immediately and does not write production state, but it remains a measurement technique rather than a user-season event.

## Verification

### TUNE-1 leg

```text
NODE_ENV= npx vitest run -c test-utils/lsim/tune1.config.ts --reporter=verbose
✓ test-utils/lsim/tune1.scenario.ts ... 414708ms
Test Files  1 passed (1)
Tests       1 passed (1)
Duration    421.82s
```

### Defaults-only smoke

```text
NODE_ENV= npx vitest run -c test-utils/lsim/smoke.config.ts --reporter=verbose
[OPUS-AUDIT] gamesSimulated 24 of 24
[OPUS-AUDIT] findings []
soul.l13-relationship-formation-organic: pass 24 / fail 0
soul.l13-relationship-morale-development-boundary: pass 24 / fail 0
✓ test-utils/lsim/smoke.scenario.ts ... 72336ms
Test Files  1 passed (1)
Tests       1 passed (1)
Duration    76.07s
```

### Build

```text
NODE_ENV= npm run build
> tsc -b && vite build
✓ 2687 modules transformed.
✓ built in 12.32s
PWA v1.2.0 — files generated
exit 0
```

### Fence and changed files

- `src/**`: no changes.
- Canonical `test-utils/lsim/results/lsim-h2-baseline-*`: no changes.
- No full Vitest suite and no season leg were run, per contract.
- Changed paths are limited to the five harness files, 19 JSON artifacts under `results/tune1/`, and this one spec doc.

TUNE-1-REL complete.
