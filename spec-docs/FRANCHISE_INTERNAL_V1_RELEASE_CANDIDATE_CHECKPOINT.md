# Franchise Internal v1 Release-Candidate Checkpoint

Date: 2026-05-28
Branch: `codex/franchise-v1-next`
Checkpoint base commit: `8310aec Gate Franchise v1 reporting surfaces`

## Executive Summary

Franchise internal v1 is product-ready as an internal release candidate. The release-candidate audit initially found one verification exception: `src/engines/__tests__/smb4TeamProfileEngine.test.ts` expected the generated/exported artifact `spec-docs/data/smb4_standard_team_profiles.json`, which was not present in the clean worktree. The missing SMB4 team-profile artifacts were restored into the repository as part of this checkpoint, a retirement ceremony test wait was tightened to remove a full-suite race, and the final full suite now passes.

No release-blocking Franchise v1 regression was found in this audit. The current branch contains the accepted GameTracker parity, setup/handoff, manual schedule/score-only, startup farm draft, Team Hub farm/lineup/rotation, transaction desk, playoff, stat-boundary, and reporting-gate work visible in the latest commit stack.

## Findings

### Blockers

- No Franchise v1 product blocker was found in the inspected release-candidate surfaces.
- The initial full-suite verification blocker was resolved by restoring the generated SMB4 standard team-profile artifacts:
  - `spec-docs/data/smb4_standard_team_profiles.json`
  - `spec-docs/data/smb4_standard_team_profiles.csv`
- A full-suite race in `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx` was fixed by waiting for the actual ceremony reveal button before clicking it.
- Final full-suite verification is green.

### Non-Blocking Notes

- Regular-season League Leaders no longer presents awards/voting as active. It now labels the surface as `SEASON 1 LEAGUE LEADERS`, says `REAL BATTING AND PITCHING LEADERBOARDS`, and shows an `AWARDS AND VOTING DEFERRED` notice.
  - Evidence: `src/src_figma/app/pages/FranchiseHome.tsx:4040-4233`.
- Museum remains reachable but is clearly labeled as global and not franchise-scoped in internal v1.
  - Evidence: `src/src_figma/app/pages/FranchiseHome.tsx:1525-1536`.
- Offseason mutation tabs are release-gated. With `FRANCHISE_V1_OFFSEASON_EXECUTION_ENABLED = false`, the offseason tab set is limited to the release gate and Museum, and direct phase-dot clicks return to the gate.
  - Evidence: `src/src_figma/app/pages/FranchiseHome.tsx:98-101`, `src/src_figma/app/pages/FranchiseHome.tsx:1011-1040`, `src/src_figma/app/pages/FranchiseHome.tsx:1196-1204`.
- SeasonSummary playoff creation now preserves stored no-DH/rules metadata instead of hardcoding DH.
  - Evidence: `src/src_figma/app/pages/SeasonSummary.tsx:538-554`.
- FranchiseHome playoff creation and `usePlayoffData` also derive playoff `useDH` from stored franchise rules/season metadata.
  - Evidence: `src/src_figma/app/pages/FranchiseHome.tsx:575-589`, `src/src_figma/hooks/usePlayoffData.ts:461-472`.
- Generated franchise schedules are not reachable in the seeded v1 path. The seeded Playwright journey explicitly fails if `initializeFranchise` creates schedule rows, and that journey passed.
  - Evidence: `test-utils/journeys/09-franchise-v1-seeded-happy-path.spec.ts:263`.

## Current RC Coverage

Confirmed by commit stack and focused code/test evidence:

- GameTracker launch parity from franchise-owned Team Hub lineups and rotations.
- No-DH GameTracker launch with pitcher in the P/#9 slot, not leadoff.
- FARM players excluded from GameTracker launch rosters.
- League Builder-owned startup FARM draft path with hidden true ratings and visible-safe scouting details.
- Franchise Setup handoff/copy path with no generated schedule rows.
- Team Hub MLB roster visibility, FARM visibility, and durable lineup/rotation save.
- Manual schedule, CSV import, and final-score-only schedule result paths.
- Score-only results updating schedule/standings without creating player stats or game archives.
- Roster movement, manual trade execution, transaction logging, and transaction history desk.
- Regular-season vs playoff stat boundary.
- Franchise playoff creation from franchise-owned snapshots and stored playoff/rules metadata.
- Reporting gates for awards/voting, global Museum scope, and offseason execution.

## Known Deferred Systems

The following remain intentionally deferred or gated for internal v1:

- Generated franchise schedules.
- AI simulation/synthetic sim buttons.
- Fantasy MLB startup draft.
- AI trades.
- Offseason mutation execution: awards ceremony, ratings adjustment, expansion, retirements, free agency, draft, farm reconciliation, chemistry, spring training, and season rollover execution.
- Morale, relationships, awards, custom park factors, scouting persistence, broad narrative/random-event systems, and Mode 3 expansion.
- Franchise-scoped Museum/history ownership. Museum is visible only with a global/not-franchise-scoped notice.

## Verification Results

Commands run:

- `git status --short --branch`
  - Result: clean branch, `## codex/franchise-v1-next`.
- `git log --oneline -10`
  - Top commit: `8310aec Gate Franchise v1 reporting surfaces`.
  - Recent stack also includes the internal v1 checkpoint, seeded happy path, GameTracker parity, Team Hub lineup/rotation, FARM visibility, and League Builder farm/scouting foundation commits.
- `npm test -- src/engines/__tests__/smb4TeamProfileEngine.test.ts --reporter=dot`
  - Result: passed.
  - Summary: `1` test file, `6` tests.
- `npm test -- src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx --reporter=dot`
  - Result: passed.
  - Summary: `1` test file, `24` tests.
- `npm test -- --reporter=dot`
  - Result: passed after artifact restoration and test wait stabilization.
  - Final summary: `330` test files, `6685` tests.
  - Initial audit result before artifact restoration: `1 failed | 329 passed` test files, `1 failed | 6684 passed` tests.
  - Initial failure: missing `spec-docs/data/smb4_standard_team_profiles.json`.
  - Additional expected noise observed during the run: React `act(...)` warnings, `indexedDB is not defined` warnings in mocked component tests, GameTracker live-WPA diagnostic warnings, and expected sync-engine diagnostic errors.
- `npx playwright test test-utils/journeys/09-franchise-v1-seeded-happy-path.spec.ts --reporter=list`
  - Result: passed.
  - Summary: `1 passed`.
- `npm run build`
  - Result: passed.
  - Note: Vite reported large chunk warnings for several bundles, including `GameTracker` and `FranchiseHome`.
- `git diff --check`
  - Result: run after this checkpoint doc was created; see final assistant report for the exact result.

## Go / No-Go Recommendation

Product/internal RC go: yes, with the current Franchise v1 scope and deferred-system gates.

Strict repository verification go: yes. The final full-suite rerun is green after restoring the SMB4 standard team-profile artifacts and tightening the retirement ceremony test wait.

Recommended release note: internal Franchise v1 is a manually scheduled, existing-roster franchise flow. It supports prepared League Builder leagues, startup FARM readiness, manual/CSV schedules, score-only results, GameTracker games, standings, scoped stats, Team Hub roster/FARM/lineup/rotation, transactions, trades, roster movement, and playoffs. It does not include generated schedules, AI sim, fantasy startup draft, full offseason execution, franchise-scoped Museum, morale/relationships, custom park-factor workflows, or awards systems.
