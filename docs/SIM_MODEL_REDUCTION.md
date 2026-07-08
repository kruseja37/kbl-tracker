# Sim Model Reduction

Generated: 2026-07-06

Source: `docs/GM_INTELLIGENCE_ENGINE_MAP.md`. This is a decision spec, not an implementation. It reduces the evidence map into a minimal sim-modeling contract for the next marginal-value bidder pass.

Status and classification keys:

- Current decision path: `VERIFIED_ACTIVE_DECISION`, `VERIFIED_DISPLAY_ONLY`, `VERIFIED_RECOMMENDATION_ONLY`, `UNKNOWN`, `NEEDS_DECISION`
- Sim field decision: `MUST_MODEL_NOW`, `MODEL_AFTER_CORE_ECONOMY`, `REPORT_ONLY`, `IGNORE_FOR_NOW`, `UNKNOWN`, `NEEDS_DECISION`

## 1. Executive Summary

| Question | Answer | Evidence | Status |
|---|---|---|---|
| What does the current app actually use when making draft/roster decisions? | It uses hard roster law, roster need, completion cost, budget/open slots, IV-based value, archetype fit, scarcity/opponent pressure, and separate CPU/shill bidding rules. | GM map `Plain Bottom Line`; GM map `1. Roster Legality and Seating` with `src/data/rosterConstruction.ts:126-155`, `src/engines/auctionCompletionFloor.ts:443-500`, `src/engines/auctionStateMachine.ts:273-338`; GM map `9. Auction and CPU Bidding Integration` with `src/engines/auctionMarketModel.ts:270-369`, `src/engines/cpuShillBidding.ts:324-395` | VERIFIED_ACTIVE_DECISION |
| What is verified versus unknown? | Verified: roster legality, need, completion floor, IV value, archetype fit, scarcity, CPU bidder personality, and Asst GM chemistry recommendations. Unknown: replacement-level-by-position bidding, player personality as auction price input, chemistry as CPU/market input, auto-fill tax exposure, and unified roster strength. | GM map `2. Positional and Role Intelligence`; GM map `3. Roster Strength Model`; GM map `6. Chemistry Trait-Potencies`; GM map `7. Player Personality`; GM map `8. Salary Cap, Luxury Tax, and Overpay` | VERIFIED/UNKNOWN |
| Which systems are decision-affecting versus display/recommendation-only? | Decision-affecting: hard roster law, roster need, completion ceiling, budget, IV value, archetype fit, scarcity, CPU bidder personality. Recommendation-only today: Draft Guide prose/lights, chemistry premium, chemistry trait pressure, player board tags. Display/report or unresolved: letter grades, projected luxury tax, player personality flavor. | GM map `4. Draft Guide / Asst GM Logic` with `src/engines/rosterIntelligencePayload.ts:238-281`, `src/engines/rosterIntelligencePayload.ts:381-612`; GM map `6. Chemistry Trait-Potencies` with `src/engines/chemistryTierValue.ts:1-18`; GM map `8. Salary Cap, Luxury Tax, and Overpay` with `src/engines/auctionLuxuryTax.ts:10-14` | VERIFIED_ACTIVE_DECISION / VERIFIED_RECOMMENDATION_ONLY / NEEDS_DECISION |
| What must the sim model next to become faithful enough for marginal-value bidding? | Model legality, position/role needs, completion cost/surplus, budget/open slots, IV/base value, archetype-adjusted marginal value, reserve price, and a deterministic walk-away price. Keep chemistry, player personality, tax enforcement, overpay law, and opponent-pressure heuristics out of v1 unless explicitly decided. | GM map `11. Sim Integration Recommendation`; GM map `What the Sim Should Model Next` with `src/data/rosterConstruction.ts:126-155`, `src/engines/rosterNeed.ts:143-214`, `src/engines/auctionCompletionFloor.ts:443-500`, `src/engines/auctionMarketModel.ts:398-438`, `src/engines/archetypeIdentity.ts:49-82` | VERIFIED / NEEDS_DECISION |

## 2. Current Decision-Path Map

| Step | Current classification | What is currently true | Evidence |
|---|---|---|---|
| Player candidate | VERIFIED_ACTIVE_DECISION | Auction runs from a locked pool/session candidate set. Pool-first is manual/import/lock; design-first has re-extract. | GM map `Current Draft Decision Paths`; GM map `10. Remaining-Pool and Scarcity Intelligence`; `src/src_figma/app/hooks/useAuctionDraft.ts:584-664`; `src/utils/leagueBuilderPoolBuilder.ts:239-265`; `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx:1368-1398` |
| Candidate -> roster legality | VERIFIED_ACTIVE_DECISION | Bid legality and exit reporting depend on canonical roster law and strand/completion checks. | GM map `1. Roster Legality and Seating`; `src/data/rosterConstruction.ts:126-155`; `src/engines/auctionStateMachine.ts:404-453`; `src/engines/auctionExitGate.ts:85-130` |
| Legality -> roster/position need | VERIFIED_ACTIVE_DECISION | Needs are position/role-aware and feed hard requirement checks, CPU need override, and Asst GM board tags. | GM map `2. Positional and Role Intelligence`; `src/engines/rosterNeed.ts:143-214`; `src/engines/rosterNeed.ts:262-287`; `src/engines/cpuShillBidding.ts:291-322`; `src/engines/rosterIntelligencePayload.ts:312-334` |
| Need -> value calculation | VERIFIED_ACTIVE_DECISION | IV and need multipliers drive market, own value, and CPU valuation. | GM map `3. Roster Strength Model`; GM map `9. Auction and CPU Bidding Integration`; `src/engines/auctionMarketModel.ts:270-369`; `src/engines/auctionMarketModel.ts:398-438`; `src/engines/cpuShillBidding.ts:179-191` |
| Value -> archetype adjustment | VERIFIED_ACTIVE_DECISION | Archetype fit affects perceived value, CPU bidding, Asst GM identity advice, and shifted cap exposure. | GM map `5. Archetype Model`; `src/engines/auctionMarketModel.ts:191-198`; `src/engines/cpuShillBidding.ts:224-235`; `src/engines/rosterIntelligencePayload.ts:576-607`; `src/engines/auctionLuxuryTax.ts:15-20` |
| Value -> chemistry/personality | NEEDS_DECISION | Chemistry is recommendation-only today; player personality is not proven as auction price input; CPU bidder personality is active but separate from player personality. | GM map `6. Chemistry Trait-Potencies`; GM map `7. Player Personality`; `src/engines/chemistryTierValue.ts:1-18`; `src/engines/rosterIntelligencePayload.ts:238-281`; `src/engines/rosterDesignFeasibility.ts:197-212`; `src/engines/cpuShillBidding.ts:28-48` |
| Value -> cap/tax | NEEDS_DECISION | Salary/budget/completion are active. Projected tax can be computed, but tax is not proven as a hard bid gate. | GM map `8. Salary Cap, Luxury Tax, and Overpay`; `src/engines/auctionLuxuryTax.ts:10-14`; `src/engines/auctionStateMachine.ts:273-338`; `src/engines/leagueConstruction.ts:405-460` |
| Value -> auction bid / recommendation / shill behavior | VERIFIED_ACTIVE_DECISION / VERIFIED_RECOMMENDATION_ONLY | CPU/shill behavior is active. Asst GM recommendations are advisory. Market estimate/opponent pressure informs both advice and bidding context, but a v1 sim bidder should not start with UI prose. | GM map `4. Draft Guide / Asst GM Logic`; GM map `9. Auction and CPU Bidding Integration`; `src/engines/cpuShillBidding.ts:324-395`; `src/engines/rosterIntelligencePayload.ts:267-281`; `src/engines/auctionMarketModel.ts:687-803` |
| Bid -> roster assignment / completion / exit gate | VERIFIED_ACTIVE_DECISION | State machine assignment, passed-lot backfill, and exit gate report enforce/describe completion. | GM map `1. Roster Legality and Seating`; GM map `10. Remaining-Pool and Scarcity Intelligence`; `src/engines/auctionStateMachine.ts:455-483`; `src/engines/auctionStateMachine.ts:606-691`; `src/engines/auctionExitGate.ts:57-130` |

## 3. Sim Field Decision Table

| Field | Production source | Current verified use | Sim classification | Reason | Risks if omitted | Design decision needed? |
|---|---|---|---|---|---|---|
| `playerId` | GM map `11. Sim Integration Recommendation`; `src/engines/auctionSim/types.ts:21-37` | Identity and deterministic tie-breaks | MUST_MODEL_NOW | Needed for repeatable picks, logs, and comparison. | Non-deterministic results; impossible audits. | No |
| `position eligibility` | GM map `1`; `src/data/rosterConstruction.ts:75-124` | Legal coverage and hard requirements | MUST_MODEL_NOW | Position coverage is part of legality and completion. | Teams can buy illegal or blocked rosters. | No |
| `role eligibility` | GM map `1`; `src/data/rosterConstruction.ts:83-96`; `src/engines/rosterNeed.ts:102-127` | Starter/reliever/closer law | MUST_MODEL_NOW | Pitching-role law is active. | Roster completion costs lie. | No |
| `roster slot fit` | GM map `2`; `src/engines/rosterDesignFeasibility.ts:70-80`; `src/engines/rosterDesignFeasibility.ts:224-255` | Design seating and fit checks | MUST_MODEL_NOW | Marginal value must understand the slot a player fills. | Duplicate/blocked roster purchases. | No |
| `IV` | GM map `3`; `src/engines/auctionMarketModel.ts:270-369`; `src/engines/auctionSim/metrics.ts:49-78` | Market value, CPU valuation, sim strength | MUST_MODEL_NOW | It is the common value primitive. | Bidder loses the main strength signal. | No |
| `salary` | GM map `8`; `src/engines/auctionCompletionFloor.ts:329-441`; `src/engines/auctionStateMachine.ts:46-53` | Budget and completion economics | MUST_MODEL_NOW | Completion surplus depends on cost. | Budget collapse cannot be detected or prevented. | No |
| `numericGrade` | GM map `Sim Harness Bridge`; `src/engines/smb4GradeEmulator.ts:81-90`; `src/engines/auctionSim/poolDiagnostics.ts:72-90` | Lever B diagnostics and pool shape | MUST_MODEL_NOW | Pool-shape experiments are numeric-grade based. | Reintroduces letter-bucket modeling error. | No |
| `letterGrade` | GM map `11`; `src/engines/auctionSim/poolDiagnostics.ts:192-199` | Report/display summary | REPORT_ONLY | Letter is derived display. | Human reports get less readable. | No |
| `baseValue` | GM map `9`; `src/engines/auctionMarketModel.ts:398-438` | Own value before optional modifiers | MUST_MODEL_NOW | Needed before archetype and scarcity. | No marginal bidder foundation. | No |
| `archetypeAdjustedValue` | GM map `5`; `src/engines/auctionMarketModel.ts:191-198`; `src/engines/cpuShillBidding.ts:224-235` | Active market/CPU/advice value adjustment | MUST_MODEL_NOW | Archetype fit is already decision-affecting. | CPU/Asst GM divergence from production. | Yes, exact optimization target |
| `chemistryTraits` | GM map `6`; `src/engines/chemistryTierValue.ts:1-18`; `src/utils/chemistryIntelligence.ts:43-56` | Recommendation-only | REPORT_ONLY | Keep visible for later, do not price in v1. | Explanations lose chemistry context. | Yes, if pricing later |
| `chemistryPotencies` | GM map `6`; `src/engines/derivedTraitPotency.ts:51-83` | Potency/advice data, not CPU/market price | MODEL_AFTER_CORE_ECONOMY | Needs product ruling before value impact. | If active later, v1 underprices chemistry. | Yes |
| `personality` | GM map `7`; `src/utils/leagueBuilderStorage.ts:304-380`; `src/engines/rosterDesignFeasibility.ts:197-212` | Stored, design-soft/morale; not proven as bid price | REPORT_ONLY | Player personality should not affect first bidder. | Explainability gap only. | Yes, if pricing later |
| `auctionPrice` | GM map `8`; `src/engines/auctionStateMachine.ts:455-483`; `src/src_figma/app/hooks/useAuctionDraft.ts:459-475` | Transaction price/persistence | MUST_MODEL_NOW | Needed to update budget and final salary. | Economy metrics become meaningless. | No |
| `reservePrice` | GM map `11`; `src/data/rosterEngineConstants.ts:312-326`; `src/engines/auctionSim/types.ts:48-61` | Opening/auto-fill pricing lever | MUST_MODEL_NOW | Reserve experiments are core to current sim. | Cannot compare Lever 0/reserve scenarios. | Yes, formula choice |
| `capHit` | GM map `8`; `src/engines/auctionLuxuryTax.ts:10-14`; `src/engines/leagueConstruction.ts:405-460` | Salary/tax-adjacent, unresolved as bid gate | MODEL_AFTER_CORE_ECONOMY | Track after core salary economics works. | Tax experiments need a later adapter. | Yes |
| `salaryCap` | GM map `8`; `src/utils/leagueBuilderStorage.ts:106-140`; `src/engines/leagueConstruction.ts:291-309` | League/tier cap context | MUST_MODEL_NOW | Completion and later tax need the cap. | Hard to compare capped scenarios. | No |
| `luxuryTax` | GM map `8`; `src/engines/auctionLuxuryTax.ts:10-14`; `src/engines/leagueConstruction.ts:252-280` | Computed/reportable; hard gate unresolved | NEEDS_DECISION | Cannot decide hard/soft/report behavior from code. | Wrong bidder if tax is active law. | Yes |
| `overpayAmount` | GM map `8`; `src/engines/leagueConstruction.ts:252-280`; `src/engines/auctionMarketModel.ts:423-438` | Not encoded as current tax law | NEEDS_DECISION | Overpay basis is a product concept, not current law. | Could invent a tax/economy rule. | Yes |
| `auctionCash` | GM map `11`; `src/engines/auctionStateMachine.ts:46-53`; `src/engines/auctionSim/types.ts:48-61` | Budget pacing and legality | MUST_MODEL_NOW | The failure being studied is budget collapse. | Cannot measure or prevent collapse. | No |
| `completionCost` | GM map `11`; `src/engines/auctionCompletionFloor.ts:329-464` | Future legal roster cost | MUST_MODEL_NOW | Main guardrail against stranded rosters. | Bidder spends through legal completion. | No |
| `completionSurplus` | GM map `11`; `src/engines/auctionStateMachine.ts:273-338`; `src/engines/leagueConstruction.ts:405-460` | Remaining spend after completion protection | MUST_MODEL_NOW | Converts completion cost into bid ceiling. | Bids can be legal-looking but insolvent. | No |
| `rosterStrength` | GM map `3`; `src/engines/auctionSim/metrics.ts:49-78`; `src/engines/archetypeBalanceSimulator.ts:298-332` | Sim metric and balance output, not unified production function | MUST_MODEL_NOW | Needed to score spread and compare scenarios. | No acceptance metric for balance. | Yes, exact formula later |
| `marginalRosterValue` | GM map `11`; `src/engines/auctionMarketModel.ts:398-438`; `src/engines/rosterNeed.ts:262-287` | Need-aware own value | MUST_MODEL_NOW | This is the next bidder's core. | Bidder stays star-rank driven. | No |
| `marginalArchetypeValue` | GM map `11`; `src/engines/auctionMarketModel.ts:191-198`; `src/engines/cpuShillBidding.ts:224-235` | Active archetype fit value | MUST_MODEL_NOW | Existing behavior prices fit. | Archetype teams act generic. | Yes, generic vs archetype objective |
| `marginalChemistryValue` | GM map `11`; `src/engines/chemistryTierValue.ts:1-18`; `src/engines/rosterIntelligencePayload.ts:238-281` | Asst GM premium only | MODEL_AFTER_CORE_ECONOMY | Do not let advice-only chemistry distort first bidder. | If JK wants chemistry bids, v1 under-models it. | Yes |
| `marginalPersonalityValue` | GM map `11`; `src/engines/rosterDesignFeasibility.ts:197-212`; `src/engines/auctionMarketModel.ts:270-369` | Not proven as auction price input | IGNORE_FOR_NOW | No production price law to mirror. | None for core economy. | Yes, if added later |
| `scarcityValue` | GM map `10`; `src/engines/auctionMarketModel.ts:440-570`; `src/engines/auctionStateMachine.ts:795-922` | Remaining-pool/tight-class behavior | MUST_MODEL_NOW | Position/role scarcity changes rational value. | Teams pass last viable options. | No |
| `opponentPressure` | GM map `9`; `src/engines/auctionMarketModel.ts:270-369`; `src/engines/auctionMarketModel.ts:687-803` | Market/advice pressure signal | MODEL_AFTER_CORE_ECONOMY | Useful, but can obscure whether marginal roster value fixed the core economy. | v1 may understate bidding wars. | Yes |
| `recommendedBid` | GM map `4`; `src/engines/rosterIntelligencePayload.ts:267-281` | Human advice output | REPORT_ONLY | Sim bidder should output walk-away/decision values first. | Less direct UI parity. | Yes, if Asst GM parity is target |
| `walkAwayPrice` | GM map `11`; `src/engines/rosterIntelligencePayload.ts:259-281`; `src/engines/auctionStateMachine.ts:273-338` | Worth capped by completion/legal ceiling | MUST_MODEL_NOW | Needed for deterministic bidding. | No rational stopping point. | No |

## 4. Minimal Faithful Sim Model V1

V1 should answer one question: if each team bids from legal completion plus marginal roster/archetype value, does budget pacing and roster-strength spread improve before we add richer psychology, tax, or advice prose?

Evidence basis: GM map `What the Sim Should Model Next`; hard legality from `src/data/rosterConstruction.ts:126-155`, needs from `src/engines/rosterNeed.ts:143-214`, completion from `src/engines/auctionCompletionFloor.ts:443-500`, own value from `src/engines/auctionMarketModel.ts:398-438`, and archetype priorities from `src/engines/archetypeIdentity.ts:49-82`.

```ts
interface SimPlayerV1 {
  id: string;
  positions: string[];
  roles: string[];
  iv: number;
  salary: number;
  numericGrade: number | null;
  baseValue: number;
  capHit: number;
  reservePrice: number;
}

interface SimTeamV1 {
  id: string;
  archetype: string | null;
  auctionCash: number;
  salaryCap: number;
  currentSalary: number;
  taxExposure: null;
  roster: SimPlayerV1[];
  openSlots: number;
  positionalNeeds: Record<string, number>;
  roleNeeds: Record<string, number>;
}

interface SimDecisionV1 {
  legalToBid: boolean;
  maxLegalBid: number;
  completionCost: number;
  completionSurplus: number;
  rosterValueIfPass: number;
  rosterValueIfWin: number;
  marginalValue: number;
  taxDelta: null;
  walkAwayPrice: number;
}
```

V1 inclusions:

- Legal completion and strand protection: GM map `1. Roster Legality and Seating`; `src/engines/auctionStateMachine.ts:404-453`; `src/engines/auctionCompletionFloor.ts:443-500`.
- Position/role-aware need: GM map `2. Positional and Role Intelligence`; `src/engines/rosterNeed.ts:143-214`; `src/engines/rosterNeed.ts:262-287`.
- IV/base value and archetype-adjusted marginal value: GM map `9. Auction and CPU Bidding Integration`; `src/engines/auctionMarketModel.ts:398-438`; `src/engines/cpuShillBidding.ts:224-235`.
- Numeric grade as pool-shape/reporting input, not as the only bidder value: GM map `Sim Harness Bridge`; `src/engines/auctionSim/poolDiagnostics.ts:72-90`; `src/engines/auctionSim/poolDiagnostics.ts:174-260`.
- Reserve price as configurable sim lever: GM map `11. Sim Integration Recommendation`; `src/data/rosterEngineConstants.ts:312-326`; `src/engines/auctionSim/types.ts:48-61`.

## 5. What To Exclude From V1

| Exclude from first marginal-value bidder | Why | Evidence | Classification |
|---|---|---|---|
| Draft Guide prose/explanation text | It is human-facing explanation, not the bidder law. | GM map `4. Draft Guide / Asst GM Logic`; `src/engines/rosterIntelligencePayload.ts:381-612` | REPORT_ONLY |
| Chemistry flavor labels and chemistry premium | Chemistry is advice-only today and explicitly excluded from CPU/market/IV/salary. | GM map `6. Chemistry Trait-Potencies`; `src/engines/chemistryTierValue.ts:1-18`; `src/engines/rosterIntelligencePayload.ts:238-281` | MODEL_AFTER_CORE_ECONOMY |
| Player personality flavor labels | Player personality is stored and used by design/morale, but not proven as auction price input. | GM map `7. Player Personality`; `src/engines/rosterDesignFeasibility.ts:197-212`; `src/engines/draftMorale.ts:62-78`; `src/engines/auctionMarketModel.ts:270-369` | IGNORE_FOR_NOW |
| UI-only badges/lights | They explain the recommendation; they should not drive the first bidder. | GM map `4. Draft Guide / Asst GM Logic`; `src/engines/rosterIntelligencePayload.ts:401-612` | REPORT_ONLY |
| Opponent-pressure heuristics | They are real market/advice signals, but v1 should first isolate roster/completion marginal value. | GM map `9. Auction and CPU Bidding Integration`; `src/engines/auctionMarketModel.ts:270-369`; `src/engines/auctionMarketModel.ts:687-803` | MODEL_AFTER_CORE_ECONOMY |
| Luxury-tax enforcement and overpay tax | Current code computes projected tax, but hard/soft/report behavior is unresolved. | GM map `8. Salary Cap, Luxury Tax, and Overpay`; `src/engines/auctionLuxuryTax.ts:10-14`; `src/engines/auctionStateMachine.ts:273-338` | NEEDS_DECISION |
| Any archetype logic that is display-only | Archetype value fit is active and included; display-only identity copy is not. | GM map `5. Archetype Model`; `src/engines/rosterIntelligencePayload.ts:576-607`; `src/engines/auctionMarketModel.ts:191-198` | REPORT_ONLY |

## 6. Design Decisions Needed From JK

| Decision | Why it matters | Options | Recommendation | Consequence for sim | Evidence |
|---|---|---|---|---|---|
| Should auction bidders optimize generic roster strength or archetype-adjusted strength? | Archetype fit already affects value, but the exact optimization target is not unified. | Generic IV; archetype-adjusted IV; hybrid with capped archetype lift | Use hybrid: legal/marginal roster value first, capped archetype lift second. | Determines `marginalArchetypeValue` formula. | GM map `5. Archetype Model`; GM map `12. JK Design Decisions Needed`; `src/engines/auctionMarketModel.ts:191-198`; `src/engines/cpuShillBidding.ts:224-235` |
| Is luxury tax a hard gate, soft penalty, or post-draft report? | Tax exists, but current bid ceiling is salary/completion-first. | Hard bid illegality; soft value penalty; report-only | Keep report-only until marginal bidder works. | `taxDelta` remains null/report-only in v1. | GM map `8. Salary Cap, Luxury Tax, and Overpay`; `src/engines/auctionLuxuryTax.ts:10-14`; `src/engines/auctionStateMachine.ts:273-338` |
| Is tax based on total salary, overpay, archetype-adjusted overpay, or something else? | Current luxury tax is rating/cap-row based, not explicit overpay. | Current rating caps; salary over cap; auction price over base value; price over archetype value | Do not invent overpay tax in sim. | `overpayAmount` stays `NEEDS_DECISION`. | GM map `8`; `src/engines/leagueConstruction.ts:252-280`; `src/engines/auctionMarketModel.ts:423-438` |
| Should reserve prices use IV, salary, numeric grade, archetype-adjusted value, or a blend? | Reserve price strongly changes auto-fill and pacing experiments. | IV curve; salary; numeric grade; archetype-adjusted value; blend | Keep configurable k/reserve curve for sim, report sensitivity. | `reservePrice` remains a required strategy parameter. | GM map `11`; `src/data/rosterEngineConstants.ts:312-326`; `src/engines/auctionSim/types.ts:48-61` |
| Should chemistry affect actual bid value or only recommendations? | Chemistry is currently advice-only, but Asst GM adds a positive premium. | Recommendation-only; human advice only; CPU and human bidders; full market price | Keep recommendation-only for v1. | `marginalChemistryValue` deferred. | GM map `6`; `src/engines/chemistryTierValue.ts:1-18`; `src/engines/rosterIntelligencePayload.ts:238-281` |
| Should player personality affect actual bid value or only recommendations/morale? | Player personality is not proven as bid price input; CPU bidder personality is separate. | Ignore in auction; recommendation/morale only; CPU strategy only; all bidders | Ignore player personality in v1. | `marginalPersonalityValue` is ignored. | GM map `7`; `src/engines/rosterDesignFeasibility.ts:197-212`; `src/engines/cpuShillBidding.ts:28-48` |
| Should CPU bidding and Asst GM use the same valuation model? | They share primitives but currently diverge. | Separate; shared core plus separate wrappers; fully unified | Shared core marginal value, separate presentation/behavior wrappers. | Implementation should put common math in `rosterValue`/`completionValue`, not UI. | GM map `4`; GM map `9`; `src/engines/rosterIntelligencePayload.ts:238-281`; `src/engines/cpuShillBidding.ts:324-395` |
| Should opponent-pressure bidding exist in CPU behavior or only user advice? | Current market read uses opponent pressure, but first bidder should prove core value first. | Advice only; CPU only; both; later module | Defer to v1.1 after core bidder results. | V1 may under-model bidding wars but is easier to diagnose. | GM map `9`; `src/engines/auctionMarketModel.ts:270-369`; `src/engines/auctionMarketModel.ts:687-803` |

## 7. Proposed Next Implementation Contract

Do not execute this from this spec pass. This is the Codex-ready implementation plan for the next branch step.

1. Add `src/engines/auctionSim/economyAdapter.ts`.
   - Purpose: convert current `AuctionSimPlayer`/team inputs into v1 modeling inputs without importing UI or production pool-builder behavior.
   - Must remain sim-only.

2. Add `src/engines/auctionSim/rosterValue.ts`.
   - Purpose: compute roster value, marginal roster value, position/role need value, and archetype lift from sim inputs.
   - Evidence target: GM map `What the Sim Should Model Next`; `src/engines/auctionMarketModel.ts:398-438`; `src/engines/archetypeIdentity.ts:49-82`.

3. Add `src/engines/auctionSim/completionValue.ts`.
   - Purpose: compute legal completion cost, completion surplus, and max legal bid in sim terms.
   - Evidence target: GM map `1. Roster Legality and Seating`; `src/engines/auctionCompletionFloor.ts:443-500`; `src/engines/auctionStateMachine.ts:273-338`.

4. Add `src/engines/auctionSim/marginalValueBidder.ts`.
   - Purpose: choose bid/walk-away values from legal completion plus marginal roster/archetype value.
   - Must not include chemistry price, player personality price, tax enforcement, UI prose, or opponent-pressure heuristics in v1.

5. Add tests.
   - Hard legality: cannot bid into stranded roster states.
   - Completion cost: protects enough cash to finish 22.
   - Position-aware marginal value: a scarce legal need beats a duplicate luxury.
   - Archetype value: fit lift is deterministic and capped.
   - Reserve price: deterministic under the same k.
   - Determinism: same seeds produce same bids and rosters.
   - Tax: only add if JK activates hard or soft tax behavior.

Acceptance for the implementation step:

- Existing tests pass.
- `npx tsc -b --pretty false` passes.
- `npm run -s build` passes.
- New tests cover the adapter, roster value, completion value, and marginal bidder.
- No production auction flow, UI, storage/schema, or pool-builder behavior changes.

## 8. Acceptance For This Spec Pass

- Created `docs/SIM_MODEL_REDUCTION.md`.
- Claims cite `docs/GM_INTELLIGENCE_ENGINE_MAP.md` section names and original file:line evidence from that map.
- No production behavior changes.
- No live auction changes.
- No UI changes.
- No storage/schema changes.
- No pool-builder changes.
- No `auctionSim` behavior changes.
