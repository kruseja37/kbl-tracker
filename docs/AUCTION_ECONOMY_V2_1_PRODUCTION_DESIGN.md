# Auction Economy V2.1 Production Design

Generated: 2026-07-06

Status: production design spec only. This document does not implement production behavior.

Source artifacts:

- `docs/GM_INTELLIGENCE_ENGINE_MAP.md`
- `docs/SIM_MODEL_REDUCTION.md`
- `docs/V2_LIQUIDITY_SIM_RESULTS.md`
- `docs/V2_1_CANDIDATE_VALIDATION.md`

## 1. Executive Summary

The accepted sim candidate is:

- Pool policy: `quotaShapeFromPool`
- Pool size: `n = 110`
- Bidder: `marginalValueV2Liquidity`
- Liquidity penalty weight: `0.95`
- Quality completion target percentile: `0.35`
- Penalty shape: `softplus`
- Reserve price lever: `k = 0`
- Reserve-price rollout: none

The candidate is product-plausible because it solves the original barbell-auction failure in the sim without creating illegal rosters or free auto-fill dependence. It produced:

- spot 11 cash: 27.7%
- final cash: 18.4%
- roster strength spread p90: 3.7%
- high-tail share: 13.0%
- middle-mass share: 74.1%
- free fill: 0
- hard invariants: 0
- middle draft rate: 92.5%
- no illegal rosters
- no elite hoarding
- legal position/role completion

The remaining wart is that late auction picks can still fall to `$0-$1k`. In the validation run this did not create auto-fill or roster-legality failures, but it may still feel too cheap in the browser. That choice needs a JK product decision before production rollout.

## 2. What The App Is Trying To Achieve

The production auction economy should create:

- balanced final rosters
- contested middle-class players
- no free auto-fill exploit
- no elite hoarding
- meaningful budget left at roster spot 11
- legal positional and role completion
- a fun browser auction feel

This is not only a math target. The browser draft should feel like teams are making real tradeoffs: stars are expensive, core players matter, late depth is useful, and nobody is forced to wait for the app to clean up failed rosters.

## 3. Production Behavior Proposal

### Track A: Pool Shape Only

Production behavior:

- Add source-level numeric-grade pool shaping to the production pool-builder path.
- Use `scoreSmb4Player(...).numericScore` as the math source of truth.
- Build a pool with a capped high-end tail, large middle/core mass, and small low-end tail.
- Preserve legal position/role coverage and team-archetype demand.
- Do not change live bidder behavior yet.
- Browser auction still uses current production bidding behavior.
- No reserve-price rollout.

Pros:

- Lowest-risk production step.
- Directly attacks the barbell pool cause.
- Keeps live auction bidding familiar.
- Easier to audit because only pool composition changes.
- Can reuse existing diagnostics: high tail, middle mass, legality, and pool viability.

Risks:

- Current CPU/human bidding may still overspend early even with a healthier pool.
- Humans may exploit the pool differently than the sim bots.
- If source-level pool constraints are tighter than the sim fixture, the target curve may need shortfall handling.
- Pool shape alone may not preserve the 20-35% spot 11 cash target.

Acceptance tests:

- Generated production pool has high-tail share <=15%.
- Generated production pool has middle-mass share >=70%.
- Pool can legally complete all real teams under current roster law.
- No team archetype is stranded by the shape pass.
- Middle-class players are present across role buckets, not only as generic bodies.
- Current auction completes without free auto-fill in deterministic browser/harness runs.
- No production reserve prices are introduced.

### Track B: Pool Shape Plus CPU/Liquidity-Aware Bidding

Production behavior:

- Add the Track A numeric-grade quota pool.
- Add liquidity-aware marginal WTP for CPU and Assistant GM advice.
- CPU/Assistant GM value should account for:
  - marginal roster value
  - legal completion
  - quality completion surplus
  - open roster slots
  - remaining-pool scarcity
  - budget pacing
- Human UI may show budget pacing, walk-away price, or "you can still complete a quality roster" guidance.
- Do not change production reserve prices yet.

Pros:

- Best match to the accepted sim candidate.
- Directly fixes budget pacing, not just pool composition.
- Gives CPU teams a reason to stop bidding before roster quality collapses later.
- Can make Assistant GM advice more useful and less star-drunk.

Risks:

- CPU bidders may feel too conservative if the liquidity penalty is too strong.
- Assistant GM advice may feel overbearing if every lot becomes a budget lecture.
- Human users may exploit the model differently than bots.
- More production files are touched, so audit surface is larger.
- The late `$0-$1k` wart may still need a separate product decision.

Acceptance tests:

- All Track A pool-shape tests pass.
- CPU teams preserve spot 11 cash in the 20-35% band in deterministic test drafts.
- Final cash and quality surplus are non-negative.
- Roster strength spread p90 <=7%.
- Free fill remains 0.
- CPU teams do not hoard cash while leaving obvious value on the board.
- Middle players receive real bids.
- Assistant GM advice names budget pacing without blocking human choice.
- No production reserve-price rollout.

## 4. Exact Sim Candidate Mapping

| Sim concept | Production concept | Mapping / production meaning |
|---|---|---|
| `quotaShapeFromPool` | Production pool-builder change | Candidate evidence points toward a source-level numeric-grade pool shaper. In production this likely maps to design-first extraction and maybe a future pool-first rebuild action. It should not be a post-hoc trim of an already-broken barbell pool. |
| `numericGrade` | `scoreSmb4Player(...).numericScore` | Numeric analyzer grade is the modeling source of truth. Letter grade remains display/report-only. |
| `highTailShare` / `middleMassShare` | Production pool diagnostics | These should become production pool health signals. Target: high tail <=15%, middle mass >=70%. |
| `marginalValueV2Liquidity` | CPU bidding / Assistant GM model | In production, this maps to CPU/Assistant GM valuation, not mandatory human bid control. |
| `qualityCompletionSurplus` | Draft guide / bidder diagnostic | This answers whether a team can still finish with acceptable core-quality players after a bid. |
| `softplus liquidity penalty` | Bidder utility only | This belongs in CPU/Assistant GM utility, not pool composition and not reserve price. |
| `k = 0` | No reserve price change yet | The accepted candidate does not require production reserve prices. Reserve prices remain a later decision. |

## 5. Files Likely Involved

The list below is based on verified paths in `GM_INTELLIGENCE_ENGINE_MAP.md` and `SIM_MODEL_REDUCTION.md`.

| Path | Status | Why |
|---|---|---|
| `src/engines/smb4GradeEmulator.ts` | READ_ONLY_IMPORT | Source of `scoreSmb4Player` numeric score. Do not change grade math in this production pass. |
| `src/data/rosterConstruction.ts` | READ_ONLY_IMPORT | Canonical legal roster law. Production work should reuse it, not rewrite it. |
| `src/engines/rosterNeed.ts` | READ_ONLY_IMPORT | Position/role need model for legal completion and bidder diagnostics. |
| `src/engines/auctionCompletionFloor.ts` | READ_ONLY_IMPORT | Production legal completion and completion ceiling logic. |
| `src/engines/poolFromDemand.ts` | LIKELY_CHANGE | Design-first extraction likely needs source-level numeric-grade quotas here. |
| `src/utils/leagueBuilderPoolBuilder.ts` | NEEDS_DECISION | Pool-first currently imports/edits/locks membership; changing this would require a separate pool-first rebuild design. |
| `src/engines/rosterDesignFeasibility.ts` | READ_ONLY_IMPORT | Existing seating and demand feasibility should inform quota shortfalls and archetype fit. |
| `src/engines/auctionPoolSizing.ts` | READ_ONLY_IMPORT | Existing market-clearing pool sizing should remain an input, not be replaced silently. |
| `src/engines/auctionMarketModel.ts` | LIKELY_CHANGE | Track B may add liquidity-aware own-value/walk-away concepts or consume shared utility outputs. |
| `src/engines/cpuShillBidding.ts` | LIKELY_CHANGE | Track B CPU bidding would likely route through liquidity-aware WTP here. |
| `src/engines/rosterIntelligencePayload.ts` | LIKELY_CHANGE | Track B Assistant GM advice may expose quality surplus, pacing, and walk-away price. |
| `src/engines/auctionStateMachine.ts` | READ_ONLY_IMPORT | Bid ceilings, strand guards, backfill, and completion law should remain authoritative. Avoid changing state-machine behavior unless a later audit proves it is necessary. |
| `src/src_figma/app/hooks/useAuctionDraft.ts` | FORBIDDEN | No live auction hook changes in this design pass. Future Track B may touch it only through a separate implementation contract. |
| `src/src_figma/app/pages/LeagueBuilderAuctionDraft.tsx` | FORBIDDEN | No UI changes in this design pass. Future Assistant GM display changes need their own UX contract. |
| `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx` | FORBIDDEN | No UI/pool setup changes in this design pass. Future pool-shape diagnostics may touch it separately. |
| `src/engines/auctionLuxuryTax.ts` | FORBIDDEN | Luxury tax is a non-goal for this pass. |
| `src/engines/chemistryTierValue.ts` | FORBIDDEN | Chemistry pricing is a non-goal for this pass. |
| `src/utils/leagueBuilderStorage.ts` | FORBIDDEN | No storage/schema changes. |
| `src/engines/auctionSim/` | READ_ONLY_IMPORT | Sim harness remains for evidence and regression comparison. Do not remove it. |

## 6. Explicit Non-Goals

- No luxury tax modeling in this production pass.
- No chemistry/personality modeling in this production pass.
- No opponent-pressure bidding.
- No reserve price rollout.
- No storage/schema changes unless separately approved.
- No multiplayer/user-vs-user modeling.
- No live auction behavior changes from this spec.
- No UI changes from this spec.
- No production pool-builder change from this spec.
- Do not remove the sim harness.

## 7. Late `$0-$1k` Pick Decision

Observed wart:

- The accepted sim candidate can still produce late auction picks at `$0-$1k`.
- In validation, this did not create free auto-fill, illegal rosters, elite hoarding, or failed completion.
- It may still feel cheap in the browser.

Options:

| Option | Behavior | Pros | Risks |
|---|---|---|---|
| A. Accept as auction flavor | Allow very cheap late depth if rosters are legal and no auto-fill exploit exists. | Preserves auction dynamics and rewards patience. | May still feel like the draft falls asleep late. |
| B. Add tiny minimum bid floor | Require a small non-zero bid for sold lots. | Removes `$0` optics without full reserve pricing. | Could be arbitrary and may mask a deeper pacing problem. |
| C. Add reserve floor later | Use a formal reserve-price design after more testing. | Economically principled if tuned correctly. | Earlier sim showed reserve pricing can become structurally unaffordable. |
| D. Add UI warning only | Keep math unchanged, but tell user the player is depth/near-free. | No economy risk. | Does not fix cheap-feeling picks. |

Recommendation: `NEEDS_JK_DECISION`.

Do not silently implement any of these. If the product accepts cheap late depth as long as there is no free auto-fill exploit, Track B can proceed without a minimum floor. If the browser feel is bad, start with Option B or D before reviving reserve prices.

## 8. Acceptance Gates

### Sim Gate

- hard invariants = 0
- free fill = 0
- roster strength spread p90 <=7%
- high tail <=15%
- middle mass >=70%
- spot 11 cash 20-35%
- final cash/surplus non-negative

### Browser Feel Gate

- Human can complete draft without weird dead zones.
- Middle players receive real bids.
- No team feels stacked by roster spot 11.
- Late picks feel like depth, not exploit.
- Assistant GM advice feels useful but not overbearing.

## 9. Future Codex Implementation Contracts

These are future contracts only. Do not execute them from this spec pass.

### Contract 1: Production Numeric-Grade Pool Shaping

Role: Codex as production pool-economy implementer.

Goal:

Implement source-level numeric-grade pool shaping for production draft-pool extraction, preserving legal roster completion and archetype demand.

Source of truth:

- `docs/AUCTION_ECONOMY_V2_1_PRODUCTION_DESIGN.md`
- `docs/GM_INTELLIGENCE_ENGINE_MAP.md`
- `docs/SIM_MODEL_REDUCTION.md`
- `docs/V2_1_CANDIDATE_VALIDATION.md`

Allowed files:

- `src/engines/poolFromDemand.ts`
- focused tests for production pool extraction
- read-only imports from `src/engines/smb4GradeEmulator.ts`, `src/data/rosterConstruction.ts`, `src/engines/rosterDesignFeasibility.ts`, and existing diagnostics helpers

Do not touch:

- live auction flow
- UI
- storage/schema
- reserve-price behavior
- chemistry/personality/tax/opponent-pressure
- `src/engines/auctionSim/` except for test comparison imports if explicitly needed

Expected behavior:

- Production design-first extraction uses numeric analyzer grade as the curve source.
- Target pool shape has high tail <=15% and middle mass >=70% when candidate supply allows it.
- Position/role and team-archetype coverage remain viable.
- Quota shortfalls are explicit diagnostics, not silent star/scrub backfills.
- Letter grades remain report/display only.

Verification:

- `git diff --check`
- ASCII check on changed docs if any
- `npx tsc -b --pretty false`
- `npm run -s build`
- focused pool extraction tests
- focused auction/draft tests if any integration path is touched

Hard stop:

- Stop if the change requires pool-first rebuild semantics.
- Stop if production candidate supply cannot satisfy the target curve without a JK decision.
- Stop if implementation would require storage/schema changes.

### Contract 2: Production CPU/Assistant GM Liquidity-Aware Bidding

Role: Codex as production auction-bidding implementer.

Goal:

Add liquidity-aware marginal WTP for CPU bidding and Assistant GM advice, using legal completion and quality completion surplus. Preserve human control and do not change reserve prices.

Source of truth:

- `docs/AUCTION_ECONOMY_V2_1_PRODUCTION_DESIGN.md`
- `docs/GM_INTELLIGENCE_ENGINE_MAP.md`
- `docs/SIM_MODEL_REDUCTION.md`
- `docs/V2_1_CANDIDATE_VALIDATION.md`

Allowed files:

- shared pure bidder/value helper file if needed
- `src/engines/auctionMarketModel.ts`
- `src/engines/cpuShillBidding.ts`
- `src/engines/rosterIntelligencePayload.ts`
- focused tests for CPU bidding and Assistant GM advice

Read-only imports:

- `src/data/rosterConstruction.ts`
- `src/engines/rosterNeed.ts`
- `src/engines/auctionCompletionFloor.ts`
- `src/engines/auctionStateMachine.ts`
- `src/engines/smb4GradeEmulator.ts`

Do not touch:

- production pool builder
- storage/schema
- reserve-price behavior
- chemistry/personality/tax/opponent-pressure
- live UI presentation unless a separate UX contract is approved

Expected behavior:

- CPU WTP drops when winning would create negative quality completion surplus with many open roster slots.
- Assistant GM can report pacing/walk-away context without blocking human bids.
- Human bid legality remains governed by existing state-machine ceilings.
- Same input and seed produce the same CPU decisions.
- No production reserve-price rollout.

Verification:

- `git diff --check`
- ASCII check on changed docs if any
- `npx tsc -b --pretty false`
- `npm run -s build`
- focused CPU bidding tests
- focused auction state-machine tests if touched

Hard stop:

- Stop if the bidder needs chemistry/personality/tax behavior to pass tests.
- Stop if the implementation changes human bid legality.
- Stop if UI changes are required to make the math safe.

## 10. Risks

- The sim may not match browser feel.
- CPU bidder may feel too conservative.
- Humans may exploit differently than bots.
- Late `$0-$1k` picks may still feel cheap.
- Production pool builder may have constraints not represented by the sim.
- Source-level pool shaping may reveal quota shortfalls in real SMB4/league data.
- Assistant GM advice may become noisy if pacing warnings appear too often.
- Pool-only production work may improve roster balance but leave budget pacing unsolved.
- Bidder-only production work may improve pacing but still inherit bad pool composition.

## Recommendation

Recommended implementation track: Track B, but split into two commits/contracts.

1. Ship Track A first as a production pool-shape gate.
2. Then ship Track B CPU/Assistant GM liquidity-aware bidding.

This keeps the rollout auditable. Pool shape addresses the known source of the barbell failure; liquidity-aware WTP addresses the pacing failure. Reserve prices stay out until JK explicitly reopens that design.
