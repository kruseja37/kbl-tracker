# SMB4 Trait Report

## Core distinction
There are two different concepts:
- gameplay usefulness
- hidden-grade marginal value in the fitted roster-grade emulator

Use this report only for hidden-grade marginal value.

## Generic trait value

### Hitters
- generic positive trait: `+0.9657`
- generic negative trait: `-1.7518`

### Pitchers
- generic positive trait: `+1.2139`
- generic negative trait: `-1.1653`

## Highest-impact hitter traits in the emulator
These totals already include the generic positive or negative trait effect.

| Trait | Total effect |
|---|---:|
| `Fastball Hitter` | `+3.4199` |
| `Mind Gamer` | `+2.4671` |
| `First Pitch Slayer` | `+1.6643` |
| `Rally Starter` | `+0.7658` |
| `Big Hack` | `+0.7464` |
| `Sprinter` | `+0.6840` |
| `Utility` | `+0.6605 + 0.1909 * versatility` |
| `Bad Ball Hitter` | `+0.5064` |
| `Cannon Arm` | `+0.4239` |
| `Magic Hands` | `+0.1346` |
| `Little Hack` | `-0.3051` |
| `Whiffer` | `-2.4899` |

All other recognized hitter positive traits default to `+0.9657`.

All other recognized hitter negative traits default to `-1.7518`.

## Highest-impact pitcher traits in the emulator
These totals already include the generic positive or negative trait effect.

| Trait | Total effect |
|---|---:|
| `Specialist` | `+3.3679` |
| `Gets Ahead` | `+2.2459` |
| `K Collector` | `+2.1226` |
| `Elite CF` | `+1.9718` |
| `Elite FK` | `+1.6993` |
| `Elite 4F` | `+1.6306` |
| `Elite CB` | `+0.9819` |
| `Elite 2F` | `+0.6858` |
| `Volatile` | `+0.4863` |
| `Crossed Up` | `+0.3976` |
| `Rally Stopper` | `+0.0810` |
| `Falls Behind` | `-2.1629` |

All other recognized pitcher positive traits default to `+1.2139`.

All other recognized pitcher negative traits default to `-1.1653`.

## Position and context effects

### Most traits are not primary-position-specific
In the emulator, most traits do not have separate coefficients by primary position. They usually only differ by hitter vs pitcher.

### Utility is context-sensitive
`Utility` adds:

```text
Utility total effect = 0.6605 + 0.1909 * versatility
```

Common totals:
- no secondary: `+0.6605`
- single secondary: `+0.8514`
- `OF`: `+1.2332`
- `IF` or `1B/OF`: `+1.4241`
- `IF/OF`: `+1.9968`

### Pitcher elite traits and arsenal are separate
An elite pitch trait and the matching pitch in the arsenal are separate additions.

Examples:
- `Elite CF` + `CF` pitch = `+1.9718 + 0.4593 = +2.4311`
- `Elite 4F` + `4F` pitch = `+1.6306 + 0.6322 = +2.2628`
- `Elite FK` + `FK` pitch = `+1.6993 - 0.4883 = +1.2110`

## Important warning
Some gameplay-negative traits still carry positive net hidden-grade value in the emulator.

Examples:
- `Volatile`
- `Crossed Up`

Also, one gameplay-positive trait can be slightly negative in the fitted hidden-grade model:
- `Little Hack`

Interpretation:
- Use Billy Yank style advice for gameplay.
- Use this report for fitted roster-grade emulation.
