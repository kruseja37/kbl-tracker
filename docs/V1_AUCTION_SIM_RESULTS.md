# V1 Auction Sim Results

## Commands Run

- `node --input-type=module -e "import('vite').then(async ({ createServer }) => { const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' }); await server.ssrLoadModule('/scripts/draftEconomyMatrix.ts'); await server.close(); })"`
- `git diff --check`
- ASCII check on changed docs
- `npx tsc -b --pretty false`
- `npm run -s build`
- `NODE_ENV= npx vitest run src/engines/__tests__/auctionSim.test.ts src/engines/__tests__/auctionSimLeverB.test.ts`

## Matrix Setup

- Matrix mode written here: targeted
- Seeds: 1 (seed-1)
- Nomination policies: starFirst
- Bidding policies: rationalBaseline, marginalValueV1
- Pool sizes: 110, 132, 144
- k values: 0, 0.1, 0.2, 0.3, 0.4, 0.5 plus kMaxLeagueAggregate x 0.75/x0.90; k=0.65 only if feasible
- Include infeasible scenarios: no
- Gate spot-11 cash target band: 35.0%-45.0%
- Middle-mass target: 70.0%
- High-tail cap: 15.0%
- Projection search: completion-quote projection with single-pass marginal WTP for matrix rows; exact/binary modes remain available via config for small fixtures.

## Reserve Basis Audit

- Status: RESOLVED
- Basis: IV
- Formula: reservePrice = k x IV, rounded up to the auction increment
- Production reserve prices were not changed.

## Reserve Feasibility Table

| Config | Status | Binding | kMax League Aggregate | kMax Worst Team | Avg Reserve | Median Reserve | League Completion | Method | Reason |
|---|---|---|---:|---:|---:|---:|---:|---|---|
| currentPool n=110 k=0 zero | OK | LEAGUE_AGGREGATE | 0.186 | 0.737 | $0 | $0 | $0 | APPROXIMATE | none |
| currentPool n=110 k=0.1 reserve | OK | LEAGUE_AGGREGATE | 0.186 | 0.737 | $16,482 | $9,000 | $1,125,000 | APPROXIMATE | none |
| currentPool n=110 k=0.13 reserve | OK | LEAGUE_AGGREGATE | 0.186 | 0.737 | $21,318 | $12,000 | $1,455,000 | APPROXIMATE | none |
| currentPool n=110 k=0.16 reserve | OK | LEAGUE_AGGREGATE | 0.186 | 0.737 | $26,109 | $14,000 | $1,779,000 | APPROXIMATE | none |
| currentPool n=110 k=0.2 reserve | TEAM_COMPLETION_UNAFFORDABLE | LEAGUE_AGGREGATE | 0.186 | 0.737 | $32,482 | $18,000 | $2,208,000 | APPROXIMATE | Sirloins approximate completion cost exceeds team budget |
| currentPool n=110 k=0.3 reserve | TEAM_COMPLETION_UNAFFORDABLE | LEAGUE_AGGREGATE | 0.186 | 0.737 | $48,482 | $27,000 | $3,291,000 | APPROXIMATE | Sirloins approximate completion cost exceeds team budget |
| currentPool n=110 k=0.4 reserve | LEAGUE_COMPLETION_UNAFFORDABLE | LEAGUE_AGGREGATE | 0.186 | 0.737 | $64,464 | $35,000 | $4,373,000 | APPROXIMATE | approximate league completion cost exceeds total league budget |
| currentPool n=110 k=0.5 reserve | LEAGUE_COMPLETION_UNAFFORDABLE | LEAGUE_AGGREGATE | 0.186 | 0.737 | $80,436 | $44,000 | $5,453,000 | APPROXIMATE | approximate league completion cost exceeds total league budget |
| quotaShapeFromPool n=110 k=0 zero | OK | LEAGUE_AGGREGATE | 0.545 | 2.099 | $0 | $0 | $0 | APPROXIMATE | none |
| quotaShapeFromPool n=110 k=0.1 reserve | OK | LEAGUE_AGGREGATE | 0.545 | 2.099 | $8,917 | $7,000 | $542,000 | APPROXIMATE | none |
| quotaShapeFromPool n=110 k=0.2 reserve | OK | LEAGUE_AGGREGATE | 0.545 | 2.099 | $17,343 | $14,000 | $1,044,000 | APPROXIMATE | none |
| quotaShapeFromPool n=110 k=0.3 reserve | OK | LEAGUE_AGGREGATE | 0.545 | 2.099 | $25,731 | $21,000 | $1,543,000 | APPROXIMATE | none |
| quotaShapeFromPool n=110 k=0.4 reserve | OK | LEAGUE_AGGREGATE | 0.545 | 2.099 | $34,111 | $28,000 | $2,038,000 | APPROXIMATE | none |
| quotaShapeFromPool n=110 k=0.49 reserve | OK | LEAGUE_AGGREGATE | 0.545 | 2.099 | $41,630 | $34,000 | $2,481,000 | APPROXIMATE | none |
| quotaShapeFromPool n=110 k=0.5 reserve | OK | LEAGUE_AGGREGATE | 0.545 | 2.099 | $42,546 | $35,000 | $2,538,000 | APPROXIMATE | none |
| currentPool n=132 k=0 zero | OK | LEAGUE_AGGREGATE | 0.391 | 1.015 | $0 | $0 | $0 | APPROXIMATE | none |
| currentPool n=132 k=0.1 reserve | OK | LEAGUE_AGGREGATE | 0.391 | 1.015 | $14,576 | $9,000 | $694,000 | APPROXIMATE | none |
| currentPool n=132 k=0.2 reserve | OK | LEAGUE_AGGREGATE | 0.391 | 1.015 | $28,652 | $17,000 | $1,346,000 | APPROXIMATE | none |
| currentPool n=132 k=0.28 reserve | OK | LEAGUE_AGGREGATE | 0.391 | 1.015 | $39,886 | $23,000 | $1,864,000 | APPROXIMATE | none |
| currentPool n=132 k=0.3 reserve | OK | LEAGUE_AGGREGATE | 0.391 | 1.015 | $42,697 | $25,000 | $1,994,000 | APPROXIMATE | none |
| currentPool n=132 k=0.35 reserve | OK | LEAGUE_AGGREGATE | 0.391 | 1.015 | $49,856 | $29,000 | $2,334,000 | APPROXIMATE | none |
| currentPool n=132 k=0.4 reserve | TEAM_COMPLETION_UNAFFORDABLE | LEAGUE_AGGREGATE | 0.391 | 1.015 | $56,750 | $33,000 | $2,642,000 | APPROXIMATE | Sirloins approximate completion cost exceeds team budget |
| currentPool n=132 k=0.5 reserve | TEAM_COMPLETION_UNAFFORDABLE | LEAGUE_AGGREGATE | 0.391 | 1.015 | $70,848 | $41,000 | $3,295,000 | APPROXIMATE | Sirloins approximate completion cost exceeds team budget |
| quotaShapeFromPool n=132 k=0 zero | OK | LEAGUE_AGGREGATE | 0.555 | 2.099 | $0 | $0 | $0 | APPROXIMATE | none |
| quotaShapeFromPool n=132 k=0.1 reserve | OK | LEAGUE_AGGREGATE | 0.555 | 2.099 | $10,060 | $7,000 | $535,000 | APPROXIMATE | none |
| quotaShapeFromPool n=132 k=0.2 reserve | OK | LEAGUE_AGGREGATE | 0.555 | 2.099 | $19,632 | $14,000 | $1,030,000 | APPROXIMATE | none |
| quotaShapeFromPool n=132 k=0.3 reserve | OK | LEAGUE_AGGREGATE | 0.555 | 2.099 | $29,145 | $21,000 | $1,522,000 | APPROXIMATE | none |
| quotaShapeFromPool n=132 k=0.4 reserve | OK | LEAGUE_AGGREGATE | 0.555 | 2.099 | $38,684 | $28,000 | $2,010,000 | APPROXIMATE | none |
| quotaShapeFromPool n=132 k=0.41 reserve | OK | LEAGUE_AGGREGATE | 0.555 | 2.099 | $39,641 | $29,000 | $2,060,000 | APPROXIMATE | none |
| quotaShapeFromPool n=132 k=0.49 reserve | OK | LEAGUE_AGGREGATE | 0.555 | 2.099 | $47,231 | $35,000 | $2,448,000 | APPROXIMATE | none |
| quotaShapeFromPool n=132 k=0.5 reserve | OK | LEAGUE_AGGREGATE | 0.555 | 2.099 | $48,248 | $35,000 | $2,504,000 | APPROXIMATE | none |
| currentPool n=144 k=0 zero | OK | LEAGUE_AGGREGATE | 0.555 | 1.839 | $0 | $0 | $0 | APPROXIMATE | none |
| currentPool n=144 k=0.1 reserve | OK | LEAGUE_AGGREGATE | 0.555 | 1.839 | $13,528 | $8,500 | $543,000 | APPROXIMATE | none |
| currentPool n=144 k=0.2 reserve | OK | LEAGUE_AGGREGATE | 0.555 | 1.839 | $26,514 | $16,500 | $1,040,000 | APPROXIMATE | none |
| currentPool n=144 k=0.3 reserve | OK | LEAGUE_AGGREGATE | 0.555 | 1.839 | $39,528 | $24,000 | $1,542,000 | APPROXIMATE | none |
| currentPool n=144 k=0.4 reserve | OK | LEAGUE_AGGREGATE | 0.555 | 1.839 | $52,500 | $32,000 | $2,034,000 | APPROXIMATE | none |
| currentPool n=144 k=0.41 reserve | OK | LEAGUE_AGGREGATE | 0.555 | 1.839 | $53,840 | $32,500 | $2,090,000 | APPROXIMATE | none |
| currentPool n=144 k=0.49 reserve | OK | LEAGUE_AGGREGATE | 0.555 | 1.839 | $64,222 | $39,000 | $2,483,000 | APPROXIMATE | none |
| currentPool n=144 k=0.5 reserve | OK | LEAGUE_AGGREGATE | 0.555 | 1.839 | $65,549 | $39,500 | $2,537,000 | APPROXIMATE | none |
| quotaShapeFromPool n=144 k=0 zero | OK | LEAGUE_AGGREGATE | 0.555 | 2.099 | $0 | $0 | $0 | APPROXIMATE | none |
| quotaShapeFromPool n=144 k=0.1 reserve | OK | LEAGUE_AGGREGATE | 0.555 | 2.099 | $10,779 | $7,000 | $535,000 | APPROXIMATE | none |
| quotaShapeFromPool n=144 k=0.2 reserve | OK | LEAGUE_AGGREGATE | 0.555 | 2.099 | $21,066 | $14,000 | $1,030,000 | APPROXIMATE | none |
| quotaShapeFromPool n=144 k=0.3 reserve | OK | LEAGUE_AGGREGATE | 0.555 | 2.099 | $31,295 | $21,000 | $1,522,000 | APPROXIMATE | none |
| quotaShapeFromPool n=144 k=0.4 reserve | OK | LEAGUE_AGGREGATE | 0.555 | 2.099 | $41,557 | $28,000 | $2,010,000 | APPROXIMATE | none |
| quotaShapeFromPool n=144 k=0.41 reserve | OK | LEAGUE_AGGREGATE | 0.555 | 2.099 | $42,582 | $29,000 | $2,060,000 | APPROXIMATE | none |
| quotaShapeFromPool n=144 k=0.49 reserve | OK | LEAGUE_AGGREGATE | 0.555 | 2.099 | $50,754 | $35,000 | $2,448,000 | APPROXIMATE | none |
| quotaShapeFromPool n=144 k=0.5 reserve | OK | LEAGUE_AGGREGATE | 0.555 | 2.099 | $51,828 | $35,000 | $2,504,000 | APPROXIMATE | none |

## Feasibility Skip Summary

Skipped 12/94 scenarios before auction execution.
By status: TEAM_COMPLETION_UNAFFORDABLE: 8; LEAGUE_COMPLETION_UNAFFORDABLE: 4.
- currentPool:rationalBaseline:n110:k02:reserve: TEAM_COMPLETION_UNAFFORDABLE: Sirloins approximate completion cost exceeds team budget
- currentPool:rationalBaseline:n110:k03:reserve: TEAM_COMPLETION_UNAFFORDABLE: Sirloins approximate completion cost exceeds team budget
- currentPool:rationalBaseline:n110:k04:reserve: LEAGUE_COMPLETION_UNAFFORDABLE: approximate league completion cost exceeds total league budget
- currentPool:rationalBaseline:n110:k05:reserve: LEAGUE_COMPLETION_UNAFFORDABLE: approximate league completion cost exceeds total league budget
- currentPool:marginalValueV1:n110:k02:reserve: TEAM_COMPLETION_UNAFFORDABLE: Sirloins approximate completion cost exceeds team budget
- currentPool:marginalValueV1:n110:k03:reserve: TEAM_COMPLETION_UNAFFORDABLE: Sirloins approximate completion cost exceeds team budget
- currentPool:marginalValueV1:n110:k04:reserve: LEAGUE_COMPLETION_UNAFFORDABLE: approximate league completion cost exceeds total league budget
- currentPool:marginalValueV1:n110:k05:reserve: LEAGUE_COMPLETION_UNAFFORDABLE: approximate league completion cost exceeds total league budget

## kMax Estimates

- `kMaxLeagueAggregate`: largest reserve fraction where the approximate league-wide legal completion cost fits total league budget.
- `kMaxWorstTeam`: largest reserve fraction where every team can independently complete a legal roster under its own budget.
- `kMaxBindingReason`: which side binds first: `LEAGUE_AGGREGATE`, `WORST_TEAM`, or `LEGALITY`.

| Config | kMax League Aggregate | kMax Worst Team | Binding | Blowfish | Crocodons | Moonstars | Sirloins |
|---|---:|---:|---|---:|---:|---:|---:|
| currentPool n=110 k=0 zero | 0.186 | 0.737 | LEAGUE_AGGREGATE | 0.737 | 0.737 | 0.737 | 0.737 |
| currentPool n=110 k=0.1 reserve | 0.186 | 0.737 | LEAGUE_AGGREGATE | 0.737 | 0.737 | 0.737 | 0.737 |
| currentPool n=110 k=0.13 reserve | 0.186 | 0.737 | LEAGUE_AGGREGATE | 0.737 | 0.737 | 0.737 | 0.737 |
| currentPool n=110 k=0.16 reserve | 0.186 | 0.737 | LEAGUE_AGGREGATE | 0.737 | 0.737 | 0.737 | 0.737 |
| currentPool n=110 k=0.2 reserve | 0.186 | 0.737 | LEAGUE_AGGREGATE | 0.737 | 0.737 | 0.737 | 0.737 |
| currentPool n=110 k=0.3 reserve | 0.186 | 0.737 | LEAGUE_AGGREGATE | 0.737 | 0.737 | 0.737 | 0.737 |
| currentPool n=110 k=0.4 reserve | 0.186 | 0.737 | LEAGUE_AGGREGATE | 0.737 | 0.737 | 0.737 | 0.737 |
| currentPool n=110 k=0.5 reserve | 0.186 | 0.737 | LEAGUE_AGGREGATE | 0.737 | 0.737 | 0.737 | 0.737 |
| quotaShapeFromPool n=110 k=0 zero | 0.545 | 2.099 | LEAGUE_AGGREGATE | 2.099 | 2.099 | 2.099 | 2.099 |
| quotaShapeFromPool n=110 k=0.1 reserve | 0.545 | 2.099 | LEAGUE_AGGREGATE | 2.099 | 2.099 | 2.099 | 2.099 |
| quotaShapeFromPool n=110 k=0.2 reserve | 0.545 | 2.099 | LEAGUE_AGGREGATE | 2.099 | 2.099 | 2.099 | 2.099 |
| quotaShapeFromPool n=110 k=0.3 reserve | 0.545 | 2.099 | LEAGUE_AGGREGATE | 2.099 | 2.099 | 2.099 | 2.099 |
| quotaShapeFromPool n=110 k=0.4 reserve | 0.545 | 2.099 | LEAGUE_AGGREGATE | 2.099 | 2.099 | 2.099 | 2.099 |
| quotaShapeFromPool n=110 k=0.49 reserve | 0.545 | 2.099 | LEAGUE_AGGREGATE | 2.099 | 2.099 | 2.099 | 2.099 |
| quotaShapeFromPool n=110 k=0.5 reserve | 0.545 | 2.099 | LEAGUE_AGGREGATE | 2.099 | 2.099 | 2.099 | 2.099 |
| currentPool n=132 k=0 zero | 0.391 | 1.015 | LEAGUE_AGGREGATE | 1.015 | 1.015 | 1.015 | 1.015 |
| currentPool n=132 k=0.1 reserve | 0.391 | 1.015 | LEAGUE_AGGREGATE | 1.015 | 1.015 | 1.015 | 1.015 |
| currentPool n=132 k=0.2 reserve | 0.391 | 1.015 | LEAGUE_AGGREGATE | 1.015 | 1.015 | 1.015 | 1.015 |
| currentPool n=132 k=0.28 reserve | 0.391 | 1.015 | LEAGUE_AGGREGATE | 1.015 | 1.015 | 1.015 | 1.015 |
| currentPool n=132 k=0.3 reserve | 0.391 | 1.015 | LEAGUE_AGGREGATE | 1.015 | 1.015 | 1.015 | 1.015 |
| currentPool n=132 k=0.35 reserve | 0.391 | 1.015 | LEAGUE_AGGREGATE | 1.015 | 1.015 | 1.015 | 1.015 |
| currentPool n=132 k=0.4 reserve | 0.391 | 1.015 | LEAGUE_AGGREGATE | 1.015 | 1.015 | 1.015 | 1.015 |
| currentPool n=132 k=0.5 reserve | 0.391 | 1.015 | LEAGUE_AGGREGATE | 1.015 | 1.015 | 1.015 | 1.015 |
| quotaShapeFromPool n=132 k=0 zero | 0.555 | 2.099 | LEAGUE_AGGREGATE | 2.099 | 2.099 | 2.099 | 2.099 |
| quotaShapeFromPool n=132 k=0.1 reserve | 0.555 | 2.099 | LEAGUE_AGGREGATE | 2.099 | 2.099 | 2.099 | 2.099 |
| quotaShapeFromPool n=132 k=0.2 reserve | 0.555 | 2.099 | LEAGUE_AGGREGATE | 2.099 | 2.099 | 2.099 | 2.099 |
| quotaShapeFromPool n=132 k=0.3 reserve | 0.555 | 2.099 | LEAGUE_AGGREGATE | 2.099 | 2.099 | 2.099 | 2.099 |
| quotaShapeFromPool n=132 k=0.4 reserve | 0.555 | 2.099 | LEAGUE_AGGREGATE | 2.099 | 2.099 | 2.099 | 2.099 |
| quotaShapeFromPool n=132 k=0.41 reserve | 0.555 | 2.099 | LEAGUE_AGGREGATE | 2.099 | 2.099 | 2.099 | 2.099 |
| quotaShapeFromPool n=132 k=0.49 reserve | 0.555 | 2.099 | LEAGUE_AGGREGATE | 2.099 | 2.099 | 2.099 | 2.099 |
| quotaShapeFromPool n=132 k=0.5 reserve | 0.555 | 2.099 | LEAGUE_AGGREGATE | 2.099 | 2.099 | 2.099 | 2.099 |
| currentPool n=144 k=0 zero | 0.555 | 1.839 | LEAGUE_AGGREGATE | 1.839 | 1.839 | 1.839 | 1.839 |
| currentPool n=144 k=0.1 reserve | 0.555 | 1.839 | LEAGUE_AGGREGATE | 1.839 | 1.839 | 1.839 | 1.839 |
| currentPool n=144 k=0.2 reserve | 0.555 | 1.839 | LEAGUE_AGGREGATE | 1.839 | 1.839 | 1.839 | 1.839 |
| currentPool n=144 k=0.3 reserve | 0.555 | 1.839 | LEAGUE_AGGREGATE | 1.839 | 1.839 | 1.839 | 1.839 |
| currentPool n=144 k=0.4 reserve | 0.555 | 1.839 | LEAGUE_AGGREGATE | 1.839 | 1.839 | 1.839 | 1.839 |
| currentPool n=144 k=0.41 reserve | 0.555 | 1.839 | LEAGUE_AGGREGATE | 1.839 | 1.839 | 1.839 | 1.839 |
| currentPool n=144 k=0.49 reserve | 0.555 | 1.839 | LEAGUE_AGGREGATE | 1.839 | 1.839 | 1.839 | 1.839 |
| currentPool n=144 k=0.5 reserve | 0.555 | 1.839 | LEAGUE_AGGREGATE | 1.839 | 1.839 | 1.839 | 1.839 |
| quotaShapeFromPool n=144 k=0 zero | 0.555 | 2.099 | LEAGUE_AGGREGATE | 2.099 | 2.099 | 2.099 | 2.099 |
| quotaShapeFromPool n=144 k=0.1 reserve | 0.555 | 2.099 | LEAGUE_AGGREGATE | 2.099 | 2.099 | 2.099 | 2.099 |
| quotaShapeFromPool n=144 k=0.2 reserve | 0.555 | 2.099 | LEAGUE_AGGREGATE | 2.099 | 2.099 | 2.099 | 2.099 |
| quotaShapeFromPool n=144 k=0.3 reserve | 0.555 | 2.099 | LEAGUE_AGGREGATE | 2.099 | 2.099 | 2.099 | 2.099 |
| quotaShapeFromPool n=144 k=0.4 reserve | 0.555 | 2.099 | LEAGUE_AGGREGATE | 2.099 | 2.099 | 2.099 | 2.099 |
| quotaShapeFromPool n=144 k=0.41 reserve | 0.555 | 2.099 | LEAGUE_AGGREGATE | 2.099 | 2.099 | 2.099 | 2.099 |
| quotaShapeFromPool n=144 k=0.49 reserve | 0.555 | 2.099 | LEAGUE_AGGREGATE | 2.099 | 2.099 | 2.099 | 2.099 |
| quotaShapeFromPool n=144 k=0.5 reserve | 0.555 | 2.099 | LEAGUE_AGGREGATE | 2.099 | 2.099 | 2.099 | 2.099 |

## Reserve Feasibility Read

k=0.65 was not part of the generated targeted matrix because preflight did not mark it feasible for the probed pool/cap shapes.

## Invariant Failure Breakdown

Before fixes: the previous report counted final roster completion/gate failures as generic invariant failures in 12/12 scenarios, so it did not identify a hard invariant name. The suspected real bugs were unaffordable zero-price wins and silent auto-fill repair when no legal completion existed.

After fixes:

No hard invariant failures were recorded after fixes.

## Fixed Invariant Bugs

- `maxLegalBidForPlayer` now treats a bid as infeasible when the team cannot afford the cheapest verified completion even at price zero.
- Auto-fill no longer silently falls back to cheapest bodies when no verified legal completion exists.
- Auto-fill refuses unaffordable reserve picks instead of creating negative cash.
- Final roster incompletion and final completion surplus are reported as gates, not hard invariants.

## Performance Profile

Before/after focused profile:

| Profile | Before | After | Delta |
|---|---:|---:|---:|
| slowest scenario runtime | 44950 ms | 121 ms | 44829 ms |
| completion search calls | 1808553 | 64473 | 1744080 |
| bestProjectedRosterValue calls | 6754 | 8888 | -2134 |

After profile details:

- Slowest scenario: currentPool:marginalValueV1:n144:k0:zero at 121 ms
- bestProjectedRosterValue calls: 8888
- bestProjectedRosterValue cache hits/misses: 0/8888
- completion search calls: 64473
- completion candidate count: 2661784
- completion cache hits/misses: 16442/48031
- WTP evaluations: 19504

## Matrix Summary Table

| Run | Config | Pool | Bidder | k | Feasibility | Gate | Hard Inv | Spot11 Cash | Spot11 Surplus | Final Cash | Final Surplus | Spread p90 | High Tail | Middle | Free Fill max | Unsold med | Runtime ms | Score | Fail Reasons |
|---|---|---:|---|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| completed | currentPool n=110 | 110 | rationalBaseline | 0 | OK | FAIL | 0 | 0.0% | 0.0% | 0.0% | 0.0% | 47.6% | 43.6% | 56.4% | 0 | 7 | 49 | 1.831 | spot11CashRemainingRatio outside 35.0%-45.0%; rosterStrengthSpread p90 above 5%; highTailShare above 15.0% |
| completed | currentPool n=110 | 110 | rationalBaseline | 0.1 | OK | FAIL | 0 | 6.3% | -1.7% | 0.1% | -100.0% | 30.7% | 43.6% | 56.4% | 0 | 67 | 61 | 1.599 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=110 | 110 | rationalBaseline | 0.13 | OK | FAIL | 0 | 7.9% | -3.0% | 0.4% | -100.0% | 36.0% | 43.6% | 56.4% | 0 | 72 | 56 | 1.635 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=110 | 110 | rationalBaseline | 0.16 | OK | FAIL | 0 | 9.8% | -4.1% | 0.3% | -100.0% | 19.5% | 43.6% | 56.4% | 0 | 72 | 56 | 1.452 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| skipped | currentPool n=110 | 110 | rationalBaseline | 0.2 | TEAM_COMPLETION_UNAFFORDABLE | SKIPPED | 0 | n/a | n/a | n/a | n/a | n/a | 43.6% | 56.4% | n/a | n/a | n/a | n/a | TEAM_COMPLETION_UNAFFORDABLE: Sirloins approximate completion cost exceeds team budget |
| skipped | currentPool n=110 | 110 | rationalBaseline | 0.3 | TEAM_COMPLETION_UNAFFORDABLE | SKIPPED | 0 | n/a | n/a | n/a | n/a | n/a | 43.6% | 56.4% | n/a | n/a | n/a | n/a | TEAM_COMPLETION_UNAFFORDABLE: Sirloins approximate completion cost exceeds team budget |
| skipped | currentPool n=110 | 110 | rationalBaseline | 0.4 | LEAGUE_COMPLETION_UNAFFORDABLE | SKIPPED | 0 | n/a | n/a | n/a | n/a | n/a | 43.6% | 56.4% | n/a | n/a | n/a | n/a | LEAGUE_COMPLETION_UNAFFORDABLE: approximate league completion cost exceeds total league budget |
| skipped | currentPool n=110 | 110 | rationalBaseline | 0.5 | LEAGUE_COMPLETION_UNAFFORDABLE | SKIPPED | 0 | n/a | n/a | n/a | n/a | n/a | 43.6% | 56.4% | n/a | n/a | n/a | n/a | LEAGUE_COMPLETION_UNAFFORDABLE: approximate league completion cost exceeds total league budget |
| completed | currentPool n=110 | 110 | marginalValueV1 | 0 | OK | FAIL | 0 | 2.9% | 2.9% | 0.0% | 0.0% | 5.9% | 43.6% | 56.4% | 0 | 0 | 121 | 1.384 | spot11CashRemainingRatio outside 35.0%-45.0%; rosterStrengthSpread p90 above 5%; highTailShare above 15.0% |
| completed | currentPool n=110 | 110 | marginalValueV1 | 0.1 | OK | FAIL | 0 | 6.6% | 0.0% | 0.1% | -100.0% | 25.7% | 43.6% | 56.4% | 0 | 59 | 79 | 1.546 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | currentPool n=110 | 110 | marginalValueV1 | 0.13 | OK | FAIL | 0 | 8.1% | -3.0% | 0.5% | -100.0% | 16.8% | 43.6% | 56.4% | 0 | 68 | 80 | 1.441 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=110 | 110 | marginalValueV1 | 0.16 | OK | FAIL | 0 | 10.2% | -3.5% | 0.5% | -100.0% | 38.1% | 43.6% | 56.4% | 0 | 68 | 77 | 1.634 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| skipped | currentPool n=110 | 110 | marginalValueV1 | 0.2 | TEAM_COMPLETION_UNAFFORDABLE | SKIPPED | 0 | n/a | n/a | n/a | n/a | n/a | 43.6% | 56.4% | n/a | n/a | n/a | n/a | TEAM_COMPLETION_UNAFFORDABLE: Sirloins approximate completion cost exceeds team budget |
| skipped | currentPool n=110 | 110 | marginalValueV1 | 0.3 | TEAM_COMPLETION_UNAFFORDABLE | SKIPPED | 0 | n/a | n/a | n/a | n/a | n/a | 43.6% | 56.4% | n/a | n/a | n/a | n/a | TEAM_COMPLETION_UNAFFORDABLE: Sirloins approximate completion cost exceeds team budget |
| skipped | currentPool n=110 | 110 | marginalValueV1 | 0.4 | LEAGUE_COMPLETION_UNAFFORDABLE | SKIPPED | 0 | n/a | n/a | n/a | n/a | n/a | 43.6% | 56.4% | n/a | n/a | n/a | n/a | LEAGUE_COMPLETION_UNAFFORDABLE: approximate league completion cost exceeds total league budget |
| skipped | currentPool n=110 | 110 | marginalValueV1 | 0.5 | LEAGUE_COMPLETION_UNAFFORDABLE | SKIPPED | 0 | n/a | n/a | n/a | n/a | n/a | 43.6% | 56.4% | n/a | n/a | n/a | n/a | LEAGUE_COMPLETION_UNAFFORDABLE: approximate league completion cost exceeds total league budget |
| completed | quotaShapeFromPool n=110 | 108 | rationalBaseline | 0 | OK | FAIL | 0 | 0.0% | 0.0% | 0.0% | 0.0% | 18.4% | 13.0% | 74.1% | 0 | 4 | 33 | 0.635 | spot11CashRemainingRatio outside 35.0%-45.0%; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=110 | 108 | rationalBaseline | 0.1 | OK | FAIL | 0 | 0.4% | -5.8% | 0.1% | -100.0% | 33.1% | 13.0% | 74.1% | 0 | 61 | 53 | 0.778 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | quotaShapeFromPool n=110 | 108 | rationalBaseline | 0.2 | OK | FAIL | 0 | 2.3% | 0.0% | 0.3% | -100.0% | 12.0% | 13.0% | 74.1% | 0 | 72 | 50 | 0.548 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=110 | 108 | rationalBaseline | 0.3 | OK | FAIL | 0 | 3.1% | 0.0% | 0.5% | -100.0% | 31.8% | 13.0% | 74.1% | 0 | 72 | 50 | 0.738 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=110 | 108 | rationalBaseline | 0.4 | OK | FAIL | 0 | 3.9% | 0.0% | 0.5% | -100.0% | 32.2% | 13.0% | 74.1% | 0 | 73 | 48 | 0.734 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=110 | 108 | rationalBaseline | 0.49 | OK | FAIL | 0 | 4.6% | 0.0% | 0.5% | -100.0% | 11.6% | 13.0% | 74.1% | 0 | 74 | 48 | 0.520 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=110 | 108 | rationalBaseline | 0.5 | OK | FAIL | 0 | 4.8% | 0.0% | 0.8% | -100.0% | 11.4% | 13.0% | 74.1% | 0 | 73 | 48 | 0.517 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=110 | 108 | marginalValueV1 | 0 | OK | FAIL | 0 | 3.0% | 3.0% | 0.0% | 0.0% | 6.9% | 13.0% | 74.1% | 0 | 4 | 99 | 0.490 | spot11CashRemainingRatio outside 35.0%-45.0%; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=110 | 108 | marginalValueV1 | 0.1 | OK | FAIL | 0 | 0.3% | -5.8% | 0.1% | -100.0% | 15.1% | 13.0% | 74.1% | 0 | 62 | 75 | 0.599 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | quotaShapeFromPool n=110 | 108 | marginalValueV1 | 0.2 | OK | FAIL | 0 | 1.6% | -5.5% | 0.3% | -100.0% | 9.8% | 13.0% | 74.1% | 0 | 65 | 72 | 0.533 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | quotaShapeFromPool n=110 | 108 | marginalValueV1 | 0.3 | OK | FAIL | 0 | 1.6% | -8.5% | 0.1% | -100.0% | 16.2% | 13.0% | 74.1% | 0 | 67 | 68 | 0.597 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | quotaShapeFromPool n=110 | 108 | marginalValueV1 | 0.4 | OK | FAIL | 0 | 3.9% | 0.0% | 0.3% | -100.0% | 8.2% | 13.0% | 74.1% | 0 | 70 | 66 | 0.493 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=110 | 108 | marginalValueV1 | 0.49 | OK | FAIL | 0 | 4.6% | 0.0% | 0.5% | -100.0% | 10.7% | 13.0% | 74.1% | 0 | 71 | 60 | 0.511 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=110 | 108 | marginalValueV1 | 0.5 | OK | FAIL | 0 | 4.8% | 0.0% | 0.9% | -100.0% | 10.6% | 13.0% | 74.1% | 0 | 71 | 61 | 0.509 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | currentPool n=132 | 132 | rationalBaseline | 0 | OK | FAIL | 0 | 0.0% | 0.0% | 0.0% | 0.0% | 53.3% | 36.4% | 62.1% | 0 | 11 | 37 | 1.603 | spot11CashRemainingRatio outside 35.0%-45.0%; rosterStrengthSpread p90 above 5%; highTailShare above 15.0% |
| completed | currentPool n=132 | 132 | rationalBaseline | 0.1 | OK | FAIL | 0 | 4.5% | -2.8% | 0.1% | -100.0% | 48.6% | 36.4% | 62.1% | 0 | 87 | 72 | 1.512 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=132 | 132 | rationalBaseline | 0.2 | OK | FAIL | 0 | 8.2% | -6.5% | 0.5% | -100.0% | 21.7% | 36.4% | 62.1% | 0 | 90 | 69 | 1.206 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=132 | 132 | rationalBaseline | 0.28 | OK | FAIL | 0 | 10.3% | -9.6% | 0.8% | -100.0% | 16.2% | 36.4% | 62.1% | 0 | 93 | 69 | 1.129 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=132 | 132 | rationalBaseline | 0.3 | OK | FAIL | 0 | 11.7% | -9.4% | 0.8% | -100.0% | 13.8% | 36.4% | 62.1% | 0 | 93 | 68 | 1.091 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=132 | 132 | rationalBaseline | 0.35 | OK | FAIL | 0 | 13.6% | -11.1% | 1.0% | -100.0% | 26.9% | 36.4% | 62.1% | 0 | 93 | 67 | 1.203 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| skipped | currentPool n=132 | 132 | rationalBaseline | 0.4 | TEAM_COMPLETION_UNAFFORDABLE | SKIPPED | 0 | n/a | n/a | n/a | n/a | n/a | 36.4% | 62.1% | n/a | n/a | n/a | n/a | TEAM_COMPLETION_UNAFFORDABLE: Sirloins approximate completion cost exceeds team budget |
| skipped | currentPool n=132 | 132 | rationalBaseline | 0.5 | TEAM_COMPLETION_UNAFFORDABLE | SKIPPED | 0 | n/a | n/a | n/a | n/a | n/a | 36.4% | 62.1% | n/a | n/a | n/a | n/a | TEAM_COMPLETION_UNAFFORDABLE: Sirloins approximate completion cost exceeds team budget |
| completed | currentPool n=132 | 132 | marginalValueV1 | 0 | OK | FAIL | 0 | 2.9% | 2.9% | 0.0% | 0.0% | 5.9% | 36.4% | 62.1% | 0 | 0 | 117 | 1.099 | spot11CashRemainingRatio outside 35.0%-45.0%; rosterStrengthSpread p90 above 5%; highTailShare above 15.0% |
| completed | currentPool n=132 | 132 | marginalValueV1 | 0.1 | OK | FAIL | 0 | 4.5% | -2.8% | 0.2% | -100.0% | 25.5% | 36.4% | 62.1% | 0 | 87 | 94 | 1.281 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=132 | 132 | marginalValueV1 | 0.2 | OK | FAIL | 0 | 8.8% | -2.8% | 0.3% | -100.0% | 87.5% | 36.4% | 62.1% | 0 | 84 | 87 | 1.857 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=132 | 132 | marginalValueV1 | 0.28 | OK | FAIL | 0 | 11.0% | -8.6% | 0.3% | -100.0% | 38.4% | 36.4% | 62.1% | 0 | 93 | 83 | 1.344 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=132 | 132 | marginalValueV1 | 0.3 | OK | FAIL | 0 | 10.8% | -10.2% | 0.9% | -100.0% | 31.1% | 36.4% | 62.1% | 0 | 96 | 80 | 1.273 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=132 | 132 | marginalValueV1 | 0.35 | OK | FAIL | 0 | 12.5% | -12.0% | 1.3% | -100.0% | 12.7% | 36.4% | 62.1% | 0 | 94 | 83 | 1.072 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| skipped | currentPool n=132 | 132 | marginalValueV1 | 0.4 | TEAM_COMPLETION_UNAFFORDABLE | SKIPPED | 0 | n/a | n/a | n/a | n/a | n/a | 36.4% | 62.1% | n/a | n/a | n/a | n/a | TEAM_COMPLETION_UNAFFORDABLE: Sirloins approximate completion cost exceeds team budget |
| skipped | currentPool n=132 | 132 | marginalValueV1 | 0.5 | TEAM_COMPLETION_UNAFFORDABLE | SKIPPED | 0 | n/a | n/a | n/a | n/a | n/a | 36.4% | 62.1% | n/a | n/a | n/a | n/a | TEAM_COMPLETION_UNAFFORDABLE: Sirloins approximate completion cost exceeds team budget |
| completed | quotaShapeFromPool n=132 | 117 | rationalBaseline | 0 | OK | FAIL | 0 | 0.0% | 0.0% | 0.0% | 0.0% | 6.2% | 17.9% | 70.1% | 0 | 11 | 35 | 0.561 | spot11CashRemainingRatio outside 35.0%-45.0%; rosterStrengthSpread p90 above 5%; highTailShare above 15.0% |
| completed | quotaShapeFromPool n=132 | 117 | rationalBaseline | 0.1 | OK | FAIL | 0 | 1.4% | -2.3% | 0.1% | -100.0% | 103.2% | 17.9% | 70.1% | 0 | 72 | 54 | 1.517 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | quotaShapeFromPool n=132 | 117 | rationalBaseline | 0.2 | OK | FAIL | 0 | 1.3% | -4.8% | 0.4% | -100.0% | 80.8% | 17.9% | 70.1% | 0 | 79 | 53 | 1.295 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | quotaShapeFromPool n=132 | 117 | rationalBaseline | 0.3 | OK | FAIL | 0 | 3.1% | 0.0% | 0.9% | -100.0% | 38.4% | 17.9% | 70.1% | 0 | 79 | 54 | 0.853 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=132 | 117 | rationalBaseline | 0.4 | OK | FAIL | 0 | 3.9% | 0.0% | 1.0% | -100.0% | 15.6% | 17.9% | 70.1% | 0 | 81 | 54 | 0.616 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=132 | 117 | rationalBaseline | 0.41 | OK | FAIL | 0 | 4.0% | 0.0% | 1.6% | -100.0% | 13.9% | 17.9% | 70.1% | 0 | 80 | 54 | 0.598 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=132 | 117 | rationalBaseline | 0.49 | OK | FAIL | 0 | 4.6% | 0.0% | 1.2% | -100.0% | 17.9% | 17.9% | 70.1% | 0 | 83 | 54 | 0.632 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=132 | 117 | rationalBaseline | 0.5 | OK | FAIL | 0 | 4.8% | 0.0% | 1.3% | -100.0% | 23.0% | 17.9% | 70.1% | 0 | 82 | 53 | 0.681 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=132 | 117 | marginalValueV1 | 0 | OK | FAIL | 0 | 0.0% | 0.0% | 0.0% | 0.0% | 4.6% | 17.9% | 70.1% | 0 | 11 | 101 | 0.549 | spot11CashRemainingRatio outside 35.0%-45.0%; highTailShare above 15.0% |
| completed | quotaShapeFromPool n=132 | 117 | marginalValueV1 | 0.1 | OK | FAIL | 0 | 0.2% | -6.0% | 0.2% | -100.0% | 20.0% | 17.9% | 70.1% | 0 | 74 | 77 | 0.697 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | quotaShapeFromPool n=132 | 117 | marginalValueV1 | 0.2 | OK | FAIL | 0 | 1.1% | -6.2% | 0.1% | -100.0% | 5.6% | 17.9% | 70.1% | 0 | 80 | 72 | 0.543 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | quotaShapeFromPool n=132 | 117 | marginalValueV1 | 0.3 | OK | FAIL | 0 | 3.1% | 0.0% | 1.0% | -100.0% | 19.1% | 17.9% | 70.1% | 0 | 81 | 71 | 0.659 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=132 | 117 | marginalValueV1 | 0.4 | OK | FAIL | 0 | 3.9% | 0.0% | 0.6% | -100.0% | 39.1% | 17.9% | 70.1% | 0 | 81 | 66 | 0.851 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=132 | 117 | marginalValueV1 | 0.41 | OK | FAIL | 0 | 4.0% | 0.0% | 0.8% | -100.0% | 14.9% | 17.9% | 70.1% | 0 | 80 | 68 | 0.608 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=132 | 117 | marginalValueV1 | 0.49 | OK | FAIL | 0 | 4.6% | 0.0% | 0.4% | -100.0% | 27.8% | 17.9% | 70.1% | 0 | 81 | 67 | 0.731 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=132 | 117 | marginalValueV1 | 0.5 | OK | FAIL | 0 | 4.8% | 0.0% | 1.0% | -100.0% | 30.3% | 17.9% | 70.1% | 0 | 80 | 69 | 0.754 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | currentPool n=144 | 144 | rationalBaseline | 0 | OK | FAIL | 0 | 0.0% | 0.0% | 0.0% | 0.0% | 34.5% | 33.3% | 56.9% | 0 | 0 | 39 | 1.375 | spot11CashRemainingRatio outside 35.0%-45.0%; rosterStrengthSpread p90 above 5%; highTailShare above 15.0% |
| completed | currentPool n=144 | 144 | rationalBaseline | 0.1 | OK | FAIL | 0 | 1.6% | -2.9% | 0.3% | -100.0% | 112.2% | 33.3% | 56.9% | 0 | 92 | 80 | 2.136 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=144 | 144 | rationalBaseline | 0.2 | OK | FAIL | 0 | 0.7% | -10.7% | 0.6% | -100.0% | 51.2% | 33.3% | 56.9% | 0 | 106 | 77 | 1.535 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=144 | 144 | rationalBaseline | 0.3 | OK | FAIL | 0 | 1.2% | -15.5% | 0.6% | -100.0% | 21.8% | 33.3% | 56.9% | 0 | 109 | 75 | 1.236 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=144 | 144 | rationalBaseline | 0.4 | OK | FAIL | 0 | 3.5% | -10.8% | 0.9% | -100.0% | 27.1% | 33.3% | 56.9% | 0 | 110 | 74 | 1.267 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=144 | 144 | rationalBaseline | 0.41 | OK | FAIL | 0 | 4.0% | -10.9% | 1.0% | -100.0% | 29.3% | 33.3% | 56.9% | 0 | 109 | 76 | 1.284 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=144 | 144 | rationalBaseline | 0.49 | OK | FAIL | 0 | 4.5% | -13.2% | 0.5% | -100.0% | 19.7% | 33.3% | 56.9% | 0 | 109 | 76 | 1.183 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=144 | 144 | rationalBaseline | 0.5 | OK | FAIL | 0 | 4.8% | -13.1% | 1.1% | -100.0% | 23.0% | 33.3% | 56.9% | 0 | 108 | 77 | 1.213 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=144 | 144 | marginalValueV1 | 0 | OK | FAIL | 0 | 2.9% | 2.9% | 0.0% | 0.0% | 5.9% | 33.3% | 56.9% | 0 | 0 | 121 | 1.060 | spot11CashRemainingRatio outside 35.0%-45.0%; rosterStrengthSpread p90 above 5%; highTailShare above 15.0% |
| completed | currentPool n=144 | 144 | marginalValueV1 | 0.1 | OK | FAIL | 0 | 1.3% | -5.1% | 0.1% | -100.0% | 53.3% | 33.3% | 56.9% | 0 | 97 | 104 | 1.551 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=144 | 144 | marginalValueV1 | 0.2 | OK | FAIL | 0 | 0.9% | -11.1% | 0.2% | -100.0% | 44.8% | 33.3% | 56.9% | 0 | 103 | 101 | 1.469 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=144 | 144 | marginalValueV1 | 0.3 | OK | FAIL | 0 | 3.0% | -7.8% | 0.6% | -100.0% | 81.6% | 33.3% | 56.9% | 0 | 102 | 90 | 1.817 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=144 | 144 | marginalValueV1 | 0.4 | OK | FAIL | 0 | 3.6% | -9.7% | 0.8% | -100.0% | 71.5% | 33.3% | 56.9% | 0 | 109 | 87 | 1.710 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=144 | 144 | marginalValueV1 | 0.41 | OK | FAIL | 0 | 1.1% | -20.4% | 0.5% | -100.0% | 36.1% | 33.3% | 56.9% | 0 | 111 | 88 | 1.380 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=144 | 144 | marginalValueV1 | 0.49 | OK | FAIL | 0 | 4.5% | -13.1% | 0.9% | -100.0% | 19.7% | 33.3% | 56.9% | 0 | 109 | 89 | 1.183 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | currentPool n=144 | 144 | marginalValueV1 | 0.5 | OK | FAIL | 0 | 4.3% | -13.9% | 1.1% | -100.0% | 22.3% | 33.3% | 56.9% | 0 | 109 | 90 | 1.211 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | quotaShapeFromPool n=144 | 122 | rationalBaseline | 0 | OK | FAIL | 0 | 0.0% | 0.0% | 0.0% | 0.0% | 40.0% | 21.3% | 67.2% | 0 | 0 | 36 | 1.000 | spot11CashRemainingRatio outside 35.0%-45.0%; rosterStrengthSpread p90 above 5%; highTailShare above 15.0% |
| completed | quotaShapeFromPool n=144 | 122 | rationalBaseline | 0.1 | OK | FAIL | 0 | 1.5% | -0.4% | 0.3% | -100.0% | 122.0% | 21.3% | 67.2% | 0 | 79 | 56 | 1.805 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | quotaShapeFromPool n=144 | 122 | rationalBaseline | 0.2 | OK | FAIL | 0 | 2.5% | 0.2% | 0.5% | -100.0% | 83.5% | 21.3% | 67.2% | 0 | 84 | 57 | 1.409 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=144 | 122 | rationalBaseline | 0.3 | OK | FAIL | 0 | 3.1% | 0.0% | 0.4% | -100.0% | 46.8% | 21.3% | 67.2% | 0 | 88 | 56 | 1.036 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=144 | 122 | rationalBaseline | 0.4 | OK | FAIL | 0 | 3.9% | 0.0% | 0.9% | -100.0% | 13.2% | 21.3% | 67.2% | 0 | 86 | 57 | 0.692 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=144 | 122 | rationalBaseline | 0.41 | OK | FAIL | 0 | 4.0% | 0.0% | 0.1% | -100.0% | 11.4% | 21.3% | 67.2% | 0 | 87 | 56 | 0.673 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=144 | 122 | rationalBaseline | 0.49 | OK | FAIL | 0 | 4.6% | 0.0% | 0.6% | -100.0% | 17.3% | 21.3% | 67.2% | 0 | 86 | 57 | 0.727 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=144 | 122 | rationalBaseline | 0.5 | OK | FAIL | 0 | 4.8% | 0.0% | 0.7% | -100.0% | 18.4% | 21.3% | 67.2% | 0 | 87 | 57 | 0.735 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=144 | 122 | marginalValueV1 | 0 | OK | FAIL | 0 | 0.0% | 0.0% | 0.0% | 0.0% | 16.2% | 21.3% | 67.2% | 0 | 14 | 104 | 0.761 | spot11CashRemainingRatio outside 35.0%-45.0%; rosterStrengthSpread p90 above 5%; highTailShare above 15.0% |
| completed | quotaShapeFromPool n=144 | 122 | marginalValueV1 | 0.1 | OK | FAIL | 0 | 0.4% | -5.8% | 0.1% | -100.0% | 14.9% | 21.3% | 67.2% | 0 | 75 | 86 | 0.745 | spot11CashRemainingRatio outside 35.0%-45.0%; spot11CompletionSurplusRatio below 0; finalCompletionSurplusRatio below 0 |
| completed | quotaShapeFromPool n=144 | 122 | marginalValueV1 | 0.2 | OK | FAIL | 0 | 2.3% | 0.0% | 0.6% | -100.0% | 13.9% | 21.3% | 67.2% | 0 | 81 | 78 | 0.715 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=144 | 122 | marginalValueV1 | 0.3 | OK | FAIL | 0 | 3.1% | 0.0% | 0.2% | -100.0% | 26.5% | 21.3% | 67.2% | 0 | 82 | 77 | 0.833 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=144 | 122 | marginalValueV1 | 0.4 | OK | FAIL | 0 | 4.7% | 0.8% | 1.8% | -100.0% | 52.6% | 21.3% | 67.2% | 0 | 83 | 69 | 1.079 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=144 | 122 | marginalValueV1 | 0.41 | OK | FAIL | 0 | 4.0% | 0.0% | 0.4% | -100.0% | 28.9% | 21.3% | 67.2% | 0 | 88 | 71 | 0.849 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=144 | 122 | marginalValueV1 | 0.49 | OK | FAIL | 0 | 4.6% | 0.0% | 1.3% | -100.0% | 30.5% | 21.3% | 67.2% | 0 | 86 | 71 | 0.858 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |
| completed | quotaShapeFromPool n=144 | 122 | marginalValueV1 | 0.5 | OK | FAIL | 0 | 4.8% | 0.0% | 1.4% | -100.0% | 29.0% | 21.3% | 67.2% | 0 | 87 | 70 | 0.841 | spot11CashRemainingRatio outside 35.0%-45.0%; finalCompletionSurplusRatio below 0; rosterStrengthSpread p90 above 5% |

## Gate Summary

No completed scenario passes all hard gates. Top failure reason: spot11CashRemainingRatio outside 35.0%-45.0% (82/82 completed scenarios).

## Top 5 By Objective Score

1. quotaShapeFromPool:marginalValueV1:n110:k0:zero - objectiveScore 0.490, gate FAIL, hardInv 0, spot11 3.0%, surplus 3.0%, spread p90 6.9%, free fill max 0
2. quotaShapeFromPool:marginalValueV1:n110:k04:reserve - objectiveScore 0.493, gate FAIL, hardInv 0, spot11 3.9%, surplus 0.0%, spread p90 8.2%, free fill max 0
3. quotaShapeFromPool:marginalValueV1:n110:k05:reserve - objectiveScore 0.509, gate FAIL, hardInv 0, spot11 4.8%, surplus 0.0%, spread p90 10.6%, free fill max 0
4. quotaShapeFromPool:marginalValueV1:n110:k049:reserve - objectiveScore 0.511, gate FAIL, hardInv 0, spot11 4.6%, surplus 0.0%, spread p90 10.7%, free fill max 0
5. quotaShapeFromPool:rationalBaseline:n110:k05:reserve - objectiveScore 0.517, gate FAIL, hardInv 0, spot11 4.8%, surplus 0.0%, spread p90 11.4%, free fill max 0

## Top 5 By Gate Closeness

1. quotaShapeFromPool:marginalValueV1:n110:k0:zero - gateClosenessScore 0.339, gate FAIL, hardInv 0, spot11 3.0%, surplus 3.0%, spread p90 6.9%, free fill max 0
2. quotaShapeFromPool:marginalValueV1:n132:k0:zero - gateClosenessScore 0.379, gate FAIL, hardInv 0, spot11 0.0%, surplus 0.0%, spread p90 4.6%, free fill max 0
3. quotaShapeFromPool:rationalBaseline:n132:k0:zero - gateClosenessScore 0.391, gate FAIL, hardInv 0, spot11 0.0%, surplus 0.0%, spread p90 6.2%, free fill max 0
4. quotaShapeFromPool:rationalBaseline:n110:k0:zero - gateClosenessScore 0.484, gate FAIL, hardInv 0, spot11 0.0%, surplus 0.0%, spread p90 18.4%, free fill max 0
5. quotaShapeFromPool:marginalValueV1:n144:k0:zero - gateClosenessScore 0.553, gate FAIL, hardInv 0, spot11 0.0%, surplus 0.0%, spread p90 16.2%, free fill max 0

## Top Configs By Gate Closeness Among Invariant-Clean Scenarios

1. quotaShapeFromPool:marginalValueV1:n110:k0:zero - gateClosenessScore 0.339, gate FAIL, hardInv 0, spot11 3.0%, surplus 3.0%, spread p90 6.9%, free fill max 0
2. quotaShapeFromPool:marginalValueV1:n132:k0:zero - gateClosenessScore 0.379, gate FAIL, hardInv 0, spot11 0.0%, surplus 0.0%, spread p90 4.6%, free fill max 0
3. quotaShapeFromPool:rationalBaseline:n132:k0:zero - gateClosenessScore 0.391, gate FAIL, hardInv 0, spot11 0.0%, surplus 0.0%, spread p90 6.2%, free fill max 0
4. quotaShapeFromPool:rationalBaseline:n110:k0:zero - gateClosenessScore 0.484, gate FAIL, hardInv 0, spot11 0.0%, surplus 0.0%, spread p90 18.4%, free fill max 0
5. quotaShapeFromPool:marginalValueV1:n144:k0:zero - gateClosenessScore 0.553, gate FAIL, hardInv 0, spot11 0.0%, surplus 0.0%, spread p90 16.2%, free fill max 0

## Pick-Log Observations

Failing representative run:

```text
currentPool:rationalBaseline:n110:k0:zero / seed-1 / starFirst
first picks: matrix-player-001 Crocodons $499,000, matrix-player-002 Crocodons $494,000, matrix-player-003 Moonstars $488,000, matrix-player-004 Moonstars $481,750, matrix-player-005 Blowfish $472,000
late picks: 45:matrix-player-045 Blowfish $0, 46:matrix-player-046 Blowfish $0, 47:matrix-player-047 Blowfish $0, 48:matrix-player-048 Blowfish $0, 49:matrix-player-054 Blowfish $0
unsold=7, freeAutoFill=0, hardInvariantFailures=0
model warnings: none
```

Best-performing representative run:

```text
quotaShapeFromPool:marginalValueV1:n110:k0:zero / seed-1 / starFirst
first picks: matrix-player-006 Blowfish $318,000, matrix-player-009 Blowfish $314,000, matrix-player-017 Blowfish $275,000, matrix-player-025 Crocodons $232,000, matrix-player-027 Moonstars $234,000
late picks: 45:matrix-player-075 Sirloins $6,000, 46:matrix-player-074 Sirloins $6,000, 47:matrix-player-073 Sirloins $6,000, 48:matrix-player-090 Blowfish $1,000, 49:matrix-player-089 Blowfish $1,000
unsold=4, freeAutoFill=0, hardInvariantFailures=0
model warnings: PASS:SIM_APPROXIMATION completion-quote roster projection used for matrix performance | PASS:SIM_APPROXIMATION completion solver used deterministic beam/greedy approximation | WIN:SIM_APPROXIMATION completion-quote roster projection used for matrix performance | WIN:SIM_APPROXIMATION completion solver used deterministic beam/greedy approximation | WIN:SIM_APPROXIMATION single-pass marginal WTP used for matrix performance | WIN:SIM_INVALID team roster is already full | WIN:SIM_INFEASIBLE candidate cannot be seated with a legal completion
```

## UNKNOWN / NEEDS_DECISION Items

- Salary and cap-hit fallbacks remain sim-only where source data does not provide canonical values.
- Tax exposure remains null/deferred; no tax behavior was introduced.
- Chemistry, personality, and opponent-pressure bidding remain out of V1.

## Material Improvement Read

currentPool: marginalValueV1 gate-closeness delta 0.337, spot11 cash delta 2.9%, spread p90 improvement 28.6%.
quotaShapeFromPool: marginalValueV1 gate-closeness delta 0.052, spot11 cash delta 3.0%, spread p90 improvement -0.8%.

## Broader Sweep Status

This document was generated from the V1.5 targeted matrix: n=110,132,144 with feasibility-gated k rows. n=88 is reserved for stress mode unless explicitly requested.
