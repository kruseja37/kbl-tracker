# Production Pool Shape Validation

Generated: 2026-07-06

Branch: `codex/production-numeric-pool-shaping`

## Scope

This validates the tuned production numeric-grade pool shaping against the sim-only quota pool and the accepted V2.1 reference candidate before production Track B bidding work.

No live auction, UI, storage/schema, CPU bidding, Assistant GM, reserve-price, tax, chemistry, personality, or opponent-pressure behavior was changed for this validation.

## Method

The replay used one deterministic 180-player synthetic source with three views:

- `production numeric shape`: production `extractPoolFromDemand`, analyzer-scored SMB4-like profiles, numeric source shaping, and G1 legal/cap preflight.
- `sim-only quotaShapeFromPool`: sim policy using the analyzer-scored numeric view of the same source rows.
- `accepted V2.1 reference`: sim policy using the explicit numeric-oracle grades from the accepted V2.1 fixture.

The V2.1 liquidity bidder was run for 12 seeds with:

- `marginalValueV2Liquidity`
- `liquidityPenaltyWeight = 0.95`
- `qualityCompletionTargetPercentile = 0.35`
- `penaltyShape = softplus`
- `k = 0`
- `autoFillPriceMode = zero`
- `nominationPolicy = starFirst`

## Pool Diagnostic Table

| Pool | Size | Demand | Slack | Median | p10 | p25 | p75 | p90 | High | Middle | Low | Barbell | Legal | Shortfalls | G1 Adds | G1 Swaps | Curve Violations |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| production numeric shape | 110 | 88 | 1.25 | 68.7 | 57.7 | 61.2 | 73.2 | 80.8 | 12.7% | 74.5% | 12.7% | -49.1% | true | 7 | 0 | 0 | none |
| sim-only quotaShapeFromPool | 103 | 88 | 1.17 | 68.7 | 55.9 | 61.1 | 72.8 | 78.9 | 13.6% | 72.8% | 13.6% | -45.6% | n/a | 7 | 0 | 0 | none |
| accepted V2.1 reference | 108 | 88 | 1.23 | 67.3 | 54.5 | 60.9 | 73.1 | 77.9 | 13.0% | 74.1% | 13.0% | -48.1% | n/a | 2 | 0 | 0 | none |

## Pre-Repair vs Post-Repair

| Stage | Size | Slack | Median | High | Middle | Low | Barbell |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| pre-G1 repair | 110 | 1.25 | 68.7 | 12.7% | 74.5% | 12.7% | -49.1% |
| post-G1 repair | 110 | 1.25 | 68.7 | 12.7% | 74.5% | 12.7% | -49.1% |

G1 did not need to grow or swap the tuned production pool in this replay. The previous failure mode, where G1 inflated the pool to 132 and added a cheap low-tail arm pile, is no longer present.

## G1 Additions and Swaps

| Kind | Count | Detail |
| --- | ---: | --- |
| G1 additions | 0 | none |
| G1 swaps | 0 | none |
| low-tail G1 additions | 0 | none |
| removals | 0 | none |

The repair code now records additions/removals by role/window when repair is needed, but this validation run completed without repair mutation.

## Curve Violation Summary

| Check | Result |
| --- | --- |
| high tail <= 15% | PASS, 12.7% |
| middle mass >= 70% | PASS, 74.5% |
| low tail <= 18% | PASS, 12.7% |
| slack near 1.25x | PASS, 1.25x |
| legal completion | PASS |
| deterministic output | Covered by focused test |
| curve violations | none |

## V2.1 Replay Comparison

| Pool | Spot11 Cash | Final Cash | Spread p90 | Free Fill Max | Hard Inv | Middle Draft Rate | Elite Conc p90 | Late <=$1k p90 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| production numeric shape | 33.1% | 21.9% | 10.4% | 0 | 0 | 89.0% | 42.9% | 11 |
| sim-only quotaShapeFromPool | 27.5% | 20.1% | 10.2% | 0 | 0 | 96.0% | 42.9% | 5 |
| accepted V2.1 reference | 27.7% | 18.4% | 3.7% | 0 | 0 | 92.5% | 28.6% | 7 |

## Representative Production Roster Summary

| Team | Strength | Final Cash | Elite | Strong | Core | Filler | Legal | Thin |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Blowfish | $1,662,458 | $74,000 | 3 | 9 | 10 | 0 | yes | none |
| Crocodons | $1,410,368 | $222,000 | 3 | 7 | 12 | 0 | yes | none |
| Moonstars | $1,600,675 | $216,000 | 6 | 7 | 8 | 1 | yes | none |
| Sirloins | $1,348,111 | $398,000 | 2 | 9 | 11 | 0 | yes | none |

## Interpretation

The production pool now passes the pool-only gate. It is right-sized, legal, deterministic, high-tail capped, middle-heavy, and not dependent on G1 cheap-tail stuffing.

The full auction replay still misses the roster-spread gate: 10.4% p90 versus the <=7% moderate target and 3.7% accepted reference. That remaining spread is not the old G1 repair bug. It appears in both the tuned production pool and the analyzer-backed sim-only quota pool, while the explicit numeric-oracle accepted reference remains much better. The remaining risk is auction/bidder behavior against the production analyzer distribution and elite concentration, not pool-size bloat.

## Recommendation

Recommendation: ACCEPT_WITH_BROWSER_SMOKE_ONLY.

Treat production numeric pool shaping as Step 1 viable, but do not claim the full auction economy is fixed. The next production-design step can start Track B bidding/liquidity work, with one browser smoke pass first to confirm draft setup produces a right-sized, legal, middle-heavy pool and no obvious dead-zone setup behavior.

## Forbidden Surface Check

No forbidden production surface was touched by this validation or tuning pass.
