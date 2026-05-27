# SMB4 Grade Residual Audit

Status: Investigative
Created: 2026-05-19

## Question

After the V2 calibrated grade mapping, `53 / 440` stock SMB4 players are still non-exact and `1 / 440` is outside one grade. This audit asks whether the remaining misses are explainable by reusable logic rather than one-off patches.

## Direct Answers

### Is Bella Mietballe's arsenal count accounted for?

Yes. The current pitcher model includes both:

- `arsenal_count`: `+1.0091` per unique pitch
- individual pitch flags: `4F`, `2F`, `CB`, `CF`, `CH`, `FK`, `SB`, `SL`

Bella Mietballe has five pitches: `4F, 2F, CB, SL, CH`.

Her arsenal contributes approximately:

- five-pitch count: `+5.05`
- pitch flags: `+0.93` net
- total arsenal-related contribution: about `+5.98`

She still scores `47.04`, which maps to `D`; her actual grade is `C`. Under the calibrated thresholds she needs about `+7.25` more score to land in `C`. That means Bella is not simply a forgotten pitch-count case. Plausible explanations are:

- SMB4 has a nonlinear floor/bonus for very low-rating starting pitchers with five pitches.
- `Meltdown` may be penalized less than the fitted model assumes in this specific low-rating SP context.
- The source row may have some extraction or roster-data anomaly.

I would not promote a Bella-specific correction from one player. I would only use her as evidence for a broader low-rating-SP-plus-five-pitches rule if more examples support it.

### What did Handley Dexterez teach us?

Handley Dexterez is correctly predicted as `S`, and his score shows several context layers working together:

- switch hitter: `+4.51`
- two positive traits generic count: `+1.93`
- `Fastball Hitter`: `+2.45`
- `Utility` plus `IF/OF` secondary interaction: `+1.34` from `vers_util`, plus `+0.60` from versatility and `+0.63` from squared versatility

This supports the idea that the model must value handedness, trait quality, and secondary-position context together. It also suggests remaining hitter misses should be checked for similar interactions rather than only raw ratings.

## Residual Size

Most misses are boundary cases.

| Needed score adjustment to become exact | Misses |
|---:|---:|
| `<= 0.50` | 12 |
| `<= 0.75` | 23 |
| `<= 1.00` | 33 |
| `<= 1.25` | 40 |
| `<= 1.75` | 45 |
| `<= 2.50` | 49 |
| `<= 5.00` | 52 |
| `> 5.00` | 1 |

Interpretation: `45 / 53` are close enough that a small reusable interaction term could flip them. Bella is the only deep miss.

## Reusable Explanation Families

The two strongest non-boundary families cover exactly `27 / 53` misses:

| Family | Covered misses | Directional read |
|---|---:|---|
| Hitter has secondary position plus offensive/situational batting trait | 18 | Mostly underscored |
| Pitcher has positive pitching trait | 9 | Mixed, but several are near-boundary role/trait cases |

Broader reusable families cover `41 / 53` misses:

| Family | Covered misses |
|---|---:|
| Hitter secondary + offensive trait | 18 |
| Hitter left/switch batter + offensive trait | 13 |
| Pitcher positive pitching trait | 9 |
| Pitcher negative pitching trait | 6 |
| Hitter secondary + defensive trait | 6 |
| Hitter running trait | 4 |
| Pitcher five-pitch arsenal | 4 |
| Pitcher two-pitch arsenal | 2 |

These overlap, but the unique coverage is `41` of the `53` non-exact players.

## Candidate Logic Worth Keeping For Generation

These should be treated as generation priors and uncertainty warnings before they become scoring patches.

### 1. Hitter secondary plus offensive trait

This is the clearest group. Examples include:

- Gina Torrens
- Evan Chukov
- Walker Runs
- Raise Ruffo
- Slapper Glute
- Stan Elyve
- Gustav Gustavson
- Dolf Steak
- Lloyd Cook
- Harmony Straus
- Rosy Hardman

Hypothesis:

```text
offensive_trait_value is context-sensitive:
  higher when paired with useful secondary-position coverage
  especially for L/S batters
```

Generation implication:

- If generating a hitter with a secondary position and an offensive trait, treat the player as more grade-volatile near thresholds.
- Prefer leaving a small score buffer inside the target grade instead of sitting on the lower boundary.

### 2. Left/switch batter plus offensive trait

The old Handley investigation already pointed here. The current model has large `bat_L` and `bat_S` coefficients, but residuals still show left/switch hitters with offensive traits as common misses.

Hypothesis:

```text
handedness is not only a flat bonus;
it interacts with offensive trait value
```

Generation implication:

- Switch hitters and lefty hitters with offensive traits should be generated with extra caution around grade edges.
- This does not mean every L/S hitter gets a flat score bonus; the effect appears trait-contextual.

### 3. Workhorse and stamina/role traits

`Workhorse` appears in three misses:

- Ansel Carouse
- Kerwin Arches
- Gerry Rawner

A simple `Workhorse +1.0` test fixed all three without breaking any previously exact players in the training fixture.

Hypothesis:

```text
Workhorse may deserve a specific pitcher trait adjustment beyond generic positive-trait count
```

Generation implication:

- Treat `Workhorse` as a higher-value SP trait than a generic positive trait.
- Avoid placing generated `Workhorse` pitchers barely below the target grade boundary.

### 4. Wild Thing and negative pitcher traits

`Wild Thing` appears in two misses:

- Meat Commonly
- Huck Enduck

A simple `Wild Thing -2.0` test fixed both, but broke one exact player.

Hypothesis:

```text
Wild Thing may be more punitive than the generic negative pitcher trait value,
but the effect is not stable enough to hard-code yet
```

Generation implication:

- Treat `Wild Thing` as a high-risk negative trait.
- Use larger rating buffers when targeting a precise grade with `Wild Thing`.

### 5. Arsenal count is probably nonlinear

The current model gives every extra pitch about the same additive count value, plus individual pitch flags. The misses suggest this may be too simple:

- five-pitch misses: 4
- two-pitch misses: 2
- Bella is the extreme five-pitch low-rating SP case

Hypothesis:

```text
arsenal value may depend on pitcher role and rating tier:
  five pitches may matter more for low-rating SPs
  two pitches may be less punitive for CPs than for SPs
```

Generation implication:

- Enforce SMB4-valid arsenals: 2-5 pitches, at least one fastball, at least one offspeed.
- Prefer 4-5 pitches for SP, 3-4 for RP, 2-3 for CP.
- Treat low-rating SPs with five pitches as grade-volatile rather than simply bad.

## Tinkering Results

I tested a small set of hand-readable residual corrections. One greedy pass found this training-only correction set:

```text
Workhorse +1.0
lefty hitter + offensive trait +1.5
Little Hack -1.0
Cannon Arm -1.5
two-pitch pitcher +1.0
Surrounded +1.0
switch hitter + offensive trait +2.0
Wild Thing -2.0
```

Training result:

- exact matches improved from `387 / 440` to `400 / 440`
- `18` old misses fixed
- `5` previously exact players broke

This is useful evidence, not production-ready logic. The corrections are plausible but too fitted to the current fixture until validated more carefully.

## Skeptical Audit

What I trust:

- Handley confirms that handedness, traits, and secondary-position value must be modeled together.
- Bella confirms that linear arsenal count is not enough to explain every pitcher.
- At least half the miss ledger has reusable trait/secondary/arsenal explanations.
- Most misses are very near thresholds, so small interaction terms can matter.

What I do not trust yet:

- A hard-coded Bella fix.
- Separate hitter/pitcher calibrated thresholds; they fit the roster better but overfit more.
- Trait-specific patches for every miss.
- Training accuracy improvements that lower cross-validation reliability.

Recommended next step:

Build a V3 candidate as an explainable residual layer, but keep it behind an option until it survives validation. The first candidate features should be:

- hitter offensive trait × secondary coverage
- hitter offensive trait × batting hand
- hitter defensive trait × secondary coverage
- pitcher role × arsenal count
- pitcher low-rating tier × arsenal count
- `Workhorse`
- `Wild Thing`
- `Surrounded`
- `Meltdown`

