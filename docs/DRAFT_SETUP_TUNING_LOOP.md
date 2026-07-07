# Draft Setup Tuning Loop

## 1. North Star

A user should be able to start from League Builder, choose Pool-first or Design-first, tune pool balance, quality, source, and cap, and confidently start an auction knowing the pool is legal, understandable, expressive, and draftable.

## 2. Scope

Draft Setup tuning includes:

- Pool-first setup feel.
- Design-first extraction feel.
- Pool Balance: Grounded, Balanced, Juiced.
- Pool Quality: 64, 66, 68, 70, 72, 74, 76.
- Pool Source: Team roster priority and Full player pool.
- Cap Fit and Recommended Neutral Cap diagnostics.
- Pins, user-added players, protected players, and manual exclusions.
- Short auction smoke using Track B bidding and Whisper diagnostics.

## 3. Non-goals

Draft Setup tuning does not include:

- Reserve prices.
- Luxury tax.
- Chemistry.
- New personality modeling.
- Opponent-pressure modeling.
- Broad franchise/value systems.
- Storage or schema changes.
- Broad `npm test` legacy cleanup.
- Root checkout cleanup.

## 4. Standard Fixtures

Use these fixtures repeatedly so tuning work can compare before/after behavior instead of relying on impressions.

| Fixture | Shape | Purpose |
| --- | --- | --- |
| Fixture A | 2 teams, no shills, Design-first | Identity expression |
| Fixture B | 4 teams x legal roster, Pool-first | Curve, source modes, and cap fit |
| Fixture C | Full MLB + SML candidate depth | Pool Quality movement |
| Fixture D | Hard case with pins, manual adds, exclusions | Provenance and protection |
| Fixture E | Short auction smoke | Track B draftability and Whisper sanity |

Each fixture should record the exact league, teams, source mode, preset, quality center, salary cap, generation nonce, and manual edits used.

## 5. Tuning Loop

1. Pick one fixture.
2. Capture baseline diagnostics.
3. State one hypothesis.
4. Change one tuning surface.
5. Run focused tests.
6. Run production-preview browser smoke.
7. Record before/after metrics.
8. Accept, tune again, or revert.

Only change one tuning surface per pass. If a finding points outside the pass, record it as a follow-up instead of widening the current slice.

## 6. Required Scorecard

Capture this scorecard before and after every tuning change:

| Metric | Before | After | Notes |
| --- | --- | --- | --- |
| Final pool size |  |  |  |
| Target quality center |  |  |  |
| Achieved median quality |  |  |  |
| Achieved delta |  |  |  |
| High/middle/low distribution |  |  |  |
| Quality shortfall reason |  |  |  |
| Hard keep overflow |  |  |  |
| Manual exclusion count |  |  |  |
| Missing pinned count |  |  |  |
| Source mode |  |  |  |
| Selected-team final count |  |  |  |
| Full-pool candidate count, if available |  |  |  |
| Identity-critical included count |  |  |  |
| Identity-critical missing count |  |  |  |
| Missing identity reasons |  |  |  |
| Club Check result |  |  |  |
| Current cap |  |  |  |
| Recommended neutral cap |  |  |  |
| Cap fit state |  |  |  |
| Cap ratio |  |  |  |
| Salary cap mutated |  |  | yes/no |
| Regenerate responsiveness |  |  |  |
| Reroll responsiveness |  |  |  |
| Add/remove responsiveness |  |  |  |
| Raw player ID leaks |  |  | yes/no |
| Whisper Max Bid renders |  |  | yes/no |
| Whisper Fill Reserve renders |  |  | yes/no |
| Whisper Room renders |  |  | yes/no |
| Whisper liquidity state renders |  |  | yes/no |
| Reserve-price behavior appears |  |  | must be no |

## 7. Browser Smoke Checklist

Run this in production preview for product-facing tuning passes:

1. Open `/league-builder`.
2. Enter Draft Setup through the real League Builder path.
3. Select the target fixture.
4. Confirm Pool-first or Design-first mode is clear.
5. Confirm Pool Balance, Pool Quality, Pool Source, and THE MONEY controls render.
6. Confirm Cap Fit and Recommended Neutral Cap render.
7. Change the tuned surface and confirm diagnostics update.
8. Confirm the salary cap does not silently mutate.
9. Run Regenerate twice.
10. Run Reroll once.
11. Pin or prioritize one generated player and confirm the display uses a player name, not a raw ID.
12. Add one player and remove/exclude one player.
13. For Design-first, lock designs and re-extract.
14. Confirm Club Check is actionable and does not falsely say identity will not express when eligible identity-critical players are included.
15. Start a short auction when practical.
16. Confirm Whisper renders Max Bid, Fill Reserve, Room, liquidity state, value/fair/stretch/pass read, reason chips, and need/fit.
17. Let CPU bidding advance a few decisions.
18. Confirm no reckless all-in behavior, no reserve-price behavior, and no console/page errors.

## 8. Acceptance Rules

A tuning slice is acceptable only when:

- Same settings plus same nonce are deterministic.
- Reroll produces valid generated turnover.
- Pins, user-added players, and protected players survive.
- Manual exclusions stay excluded unless legality requires re-addition.
- Design-first identity expresses or gives actionable missing reasons.
- Pool Quality moves monotonically when candidate depth allows.
- Cap Fit updates with pool/cap changes but never silently mutates cap.
- Source modes remain distinct.
- No reserve-price behavior appears.
- Short Track B auction smoke remains sane.
- Focused suites pass.

## 9. Tuning Backlog Order

Evaluate product-facing tuning candidates in this order unless browser smoke reveals a sharper blocker.

| Candidate | Value | Risk | Likely files touched | Pass type |
| --- | --- | --- | --- | --- |
| Cap Fit formula/copy tuning | Helps users understand whether the current cap and generated pool are auction-draftable before they start. Highest immediate confidence gain because the diagnostic already exists and is visible in the setup flow. | Medium. Formula changes can imply salary-cap behavior changes if not kept advisory. Copy can blur "recommended cap" into "automatic cap." | `src/engines/poolAffordabilityDiagnostic.ts`, `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx`, focused tests for cap diagnostic and Draft Setup. | Audit-first |
| Design-first identity weighting tuning | Improves whether locked designs feel expressive and trustworthy. Especially valuable for users who start with team identity rather than pool shape. | Medium-high. Identity protection can accidentally become hard-keep inflation or override manual exclusions. | `src/engines/poolFromDemand.ts`, `src/src_figma/app/components/leagueBuilder/RosterDesigner.tsx`, Draft Setup and RosterDesigner tests. | Audit-first |
| Pool Quality / Balance feel tuning | Improves the main quality knob and preset feel. High product value once baseline diagnostics are trusted. | High. Changes touch pool generation behavior and can move accepted Track A.2 semantics. | `src/engines/poolFromDemand.ts`, pool tests, Draft Setup tests. | Audit-first |
| Draft Setup diagnostics polish | Reduces confusion, raw IDs, and unclear warnings without changing generation math. | Low-medium. Mostly copy/layout, but can hide important failure modes if over-simplified. | `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx`, maybe component-level tests. | Implementation-first if copy-only |
| Explicit Apply Recommended Cap button | Makes the advisory cap actionable while preserving "no silent mutation." | Medium-high. It changes user workflow and salary-cap mutation path, so it must be explicit, reversible, and tested. | Draft Setup page, salary cap input helpers, Draft Setup tests. | Audit-first |

Recommended next slice: **Cap Fit formula/copy tuning**.

Goal: make Cap Fit explain whether the current generated pool and salary cap are draftable without implying automatic cap mutation.

Hypothesis: users will trust Draft Setup more if the diagnostic separates "current cap health," "recommended neutral cap," and "why the recommendation moved" using the generated pool's actual economy and Track B fill-reserve logic.

Likely files touched:

- `src/engines/poolAffordabilityDiagnostic.ts`
- `src/engines/__tests__/poolAffordabilityDiagnostic.test.ts`
- `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx`
- `src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.test.tsx`

Metrics to capture:

- Current cap.
- Recommended neutral cap.
- Cap fit state.
- Cap ratio.
- Legal roster completion baseline.
- Star/headroom guard, if exposed by the helper.
- Achieved median quality and quality delta.
- Final pool size and high/middle/low distribution.
- Whether salary cap mutated.
- Whether copy avoids reserve-price and auto-apply language.

Browser smoke fixture: Fixture B first, then Fixture C if the recommendation swings with Pool Quality.

Tests to run:

- `git diff --check`
- `npx tsc -b --pretty false`
- `npm run -s build`
- `NODE_ENV= npx vitest run src/engines/__tests__/poolAffordabilityDiagnostic.test.ts`
- `NODE_ENV= npx vitest run src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.test.tsx`
- Relevant pool and auction smoke suites if the helper starts consuming more pool diagnostics.

Risks:

- Accidentally turning an advisory recommendation into silent salary-cap mutation.
- Copy that sounds like reserve-price behavior.
- Formula overfitting to one fixture.
- Cap Fit becoming noisy when candidate depth prevents quality targets.

Non-goals:

- No Apply Recommended Cap button in the first Cap Fit tuning pass.
- No salary-cap behavior change.
- No storage/schema change.
- No pool generation change.
- No Track B bidding change.
- No reserve-price, tax, chemistry, personality, or opponent-pressure behavior.

Implementation should not start immediately. Run an audit-only Cap Fit pass first to inspect the current formula, UI copy, diagnostic payload, and fixture behavior.

## 10. Stop-and-report Conditions

Stop and report before continuing if any of these occur:

- Pool grows on repeated Regenerate.
- Pinned or protected player disappears.
- Design-first shows identity candidates but extraction omits them without reason.
- Cap Fit silently changes cap.
- Source mode becomes cosmetic only.
- Pool Quality movement is non-monotonic without diagnostic explanation.
- Browser route 404s.
- Broad unrelated repo-health failure tempts scope creep.
- Any code path touches reserve, tax, chemistry, personality, or opponent-pressure behavior.

## 11. Validation Commands

For docs-only updates:

```bash
git diff --check
```

For implementation tuning passes, use the smallest focused set that covers touched behavior:

```bash
git diff --check
npx tsc -b --pretty false
npm run -s build
NODE_ENV= npx vitest run src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.test.tsx
NODE_ENV= npx vitest run src/src_figma/__tests__/components/RosterDesigner.test.tsx
NODE_ENV= npx vitest run src/engines/__tests__/poolFromDemand.test.ts
NODE_ENV= npx vitest run src/engines/__tests__/poolAffordabilityDiagnostic.test.ts
NODE_ENV= npx vitest run src/engines/__tests__/auctionSim.test.ts src/engines/__tests__/auctionSimLeverB.test.ts
NODE_ENV= npx vitest run src/engines/__tests__/liquidityAwareBidding.test.ts
NODE_ENV= npx vitest run src/engines/__tests__/cpuShillBidding.test.ts
NODE_ENV= npx vitest run src/engines/__tests__/rosterIntelligencePayload.test.ts src/src_figma/app/components/auction/__tests__/WhisperPanel.test.tsx
```

Run production-preview browser smoke for any product-facing implementation pass:

```bash
npm run -s build
npm run preview -- --host 127.0.0.1 --port 4173
```
