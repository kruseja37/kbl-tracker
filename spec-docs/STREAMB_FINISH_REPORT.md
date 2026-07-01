# STREAMB Finish Playable Draft Report

**Date:** 2026-06-27  
**Branch:** `claude/v1-draft-ui`  
**Verdict:** YES — the draft reliably saves and launches into franchise mode 2 with drafted rosters loaded.

## Evidence

- `NODE_ENV= npm run build` — PASS, exit 0.
- `NODE_ENV= npx vitest run draftPipeline franchiseInitializer franchiseSeatAssignment FranchiseSetup franchiseSetupLaunch archetypeIdentity leagueConstruction auctionLuxuryTax cpuShillBidding` — PASS, exit 0.

Focused suite file-by-file:

- `src/engines/__tests__/leagueConstruction.test.ts` — 26 passed.
- `src/engines/__tests__/cpuShillBidding.test.ts` — 10 passed.
- `src/engines/__tests__/archetypeIdentity.test.ts` — 6 passed.
- `src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts` — 8 passed.
- `src/utils/tests/franchiseInitializer.w1fix.test.ts` — 3 passed.
- `src/utils/tests/franchiseInitializer.test.ts` — 7 passed.
- `src/engines/__tests__/auctionLuxuryTax.test.ts` — 4 passed.
- `src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts` — 3 passed.
- `src/utils/tests/franchiseSeatAssignment.test.ts` — 4 passed.
- `src/src_figma/__tests__/franchiseMode/FranchiseSetup.test.tsx` — 25 passed.
- `src/utils/tests/draftPipeline.integration.test.ts` — 3 passed.

The freeze-to-franchise proof is green: `draftPipeline.integration.test.ts` runs MLB auction → farm auction → `initializeFranchise`, then verifies 4 franchise teams, 128 franchise players, 40 farm records, and every team at 22 MLB + 10 farm players.

## Fixed

- `src/src_figma/app/pages/FranchiseSetup.tsx:443` — when a league is selected, Franchise Setup now seeds selected controlled teams from the Draft Setup hub's saved `team.controlledBy === "human"` ownership choices instead of clearing the selection.
- `src/utils/tests/draftPipeline.integration.test.ts:328` — added a hub-output integration proof that uses `selectTeamArchetype(..., "murderers-row")`, verifies `shiftLuxuryCaps` honors the raw POW/SPD shift, mirrors saved ownership into the freeze handoff, runs the full MLB auction + farm auction + franchise launch, and asserts the configured team is human-controlled with 22 MLB + 10 farm players in the launched franchise.

## Browser Smoke

Skipped with reason. The in-app browser connector failed before setup with `sandboxCwd must be an absolute file URI`; the fallback Playwright navigation call was canceled before any page opened. This was non-gating per the contract. The deterministic integration gate above is the authoritative save/launch proof.

## Left For JK Tuesday

- Manual browser sign-off is still needed for the visible hub route: import MLB, wait for 30 teams, open `/league-builder/draft-config`, choose an archetype, start the draft, and confirm the auction route opens.
- No STOP-IF was hit.
