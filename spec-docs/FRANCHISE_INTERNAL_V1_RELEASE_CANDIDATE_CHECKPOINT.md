# Franchise Internal v1 Release-Candidate Checkpoint

Date: 2026-05-29
Branch: `codex/franchise-v1-next`
Checkpoint base commit: `2d82986 Add 16-team Franchise v1 smoke journey`

## Executive Summary

Franchise internal v1 is product-ready as an internal release candidate. The release-candidate verification pass is green: focused Franchise v1 tests passed, the seeded browser happy path passed, the 16-team browser smoke passed, the full Vitest suite passed, and the production build passed.

No release-blocking Franchise v1 regression was found in this audit. The current branch contains the accepted GameTracker parity, setup/handoff, manual schedule/score-only, startup farm draft, Team Hub farm/lineup/rotation, transaction desk, playoff, stat-boundary, result-reporting, transaction-history discoverability, reporting-gate work, and 16-team browser smoke coverage visible in the latest commit stack.

## Findings

### Blockers

- No Franchise v1 product blocker was found in the inspected release-candidate surfaces.
- The earlier full-suite verification blocker was resolved by restoring the generated SMB4 standard team-profile artifacts:
  - `spec-docs/data/smb4_standard_team_profiles.json`
  - `spec-docs/data/smb4_standard_team_profiles.csv`
- A full-suite race in `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx` was fixed by waiting for the actual ceremony reveal button before clicking it.
- Final full-suite verification is green.

### Non-Blocking Notes

- Regular-season League Leaders no longer presents awards/voting as active. It now labels the surface as `SEASON 1 LEAGUE LEADERS`, says `REAL BATTING AND PITCHING LEADERBOARDS`, and shows an `AWARDS AND VOTING DEFERRED` notice.
  - Evidence: `src/src_figma/app/pages/FranchiseHome.tsx:4040-4233`.
- Team Hub now exposes scoped transaction-history rows as read-only roster context while keeping Roster & Trades as the canonical mutation surface.
  - Evidence: `src/src_figma/app/components/TeamHubContent.tsx:880-925`, `src/src_figma/app/components/TeamHubContent.tsx:1963-2039`.
- Team Hub roster reporting no longer displays deferred Morale, True Value, or value-delta columns as if they were canonical v1 outputs.
  - Evidence: `src/src_figma/app/components/TeamHubContent.tsx:1721-1748`.
- FranchiseHome next-game story and head-to-head preview modules are gated as deferred instead of showing empty aspirational accordions.
  - Evidence: `src/src_figma/app/pages/FranchiseHome.tsx:3766-3771`.
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
- A larger 16-team browser smoke now covers the internal-v1 workflow shape with League Builder FARM draft, no-DH franchise initialization, manual schedule rows, GameTracker launch, score-only results, Team Hub FARM and transaction-history visibility, roster movement/trade storage paths, playoff seeding, and no-DH playoff configuration.
  - Evidence: `test-utils/journeys/10-franchise-v1-16-team-realistic-smoke.spec.ts`.

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
- Completed GameTracker schedule rows link to Game Detail; score-only rows are labeled schedule/standings only.
- Roster movement, manual trade execution, transaction logging, and transaction history desk.
- Read-only Team Hub transaction-history visibility for trades, call-ups, and send-downs.
- Regular-season vs playoff stat boundary.
- Franchise playoff creation from franchise-owned snapshots and stored playoff/rules metadata.
- Reporting gates for awards/voting, global Museum scope, and offseason execution.
- Browser smoke coverage for both the original seeded happy path and a larger 16-team internal-v1 fixture.

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

- `git push origin codex/franchise-v1-next`
  - Result: passed.
  - Pushed `codex/franchise-v1-next` from `3dd7bb7` to `3060873`.
- Focused Franchise v1 verification:
  - Command covered startup farm/scouting, League Builder draft, Franchise Setup, setup launch, Team Hub reads/transactions, GameTracker roster launch, FranchiseHome, schedule, playoffs, SeasonSummary, stat boundary, and almanac narrative archive tests.
  - Result: passed.
  - Summary: `18` test files, `178` tests.
- `npx playwright test test-utils/journeys/09-franchise-v1-seeded-happy-path.spec.ts --reporter=list`
  - Result: passed.
  - Summary: `1 passed`.
- `npx playwright test test-utils/journeys/10-franchise-v1-16-team-realistic-smoke.spec.ts --reporter=list`
  - Result: passed.
  - Summary: `1 passed`.
  - Coverage boundary: the journey launches GameTracker in-browser, then completes the archived game through the existing `processCompletedGame` and schedule-storage path instead of manually clicking through a full at-bat game to final out. It is a system smoke, not a full human-input gameplay simulation.
- `npm test -- --reporter=dot`
  - Result: passed.
  - Final summary: `330` test files, `6694` tests.
  - Expected noise observed during the run: React `act(...)` warnings, `indexedDB is not defined` warnings in mocked component tests, GameTracker live-WPA diagnostic warnings, style shorthand warnings in modal tests, PostGame story polling warnings in mocked tests, and expected sync-engine diagnostic errors.
- `npm run build`
  - Result: passed.
  - Note: Vite reported large chunk warnings for several bundles, including `GameTracker` and `FranchiseHome`.
- `git diff --check`
  - Result: passed before this checkpoint doc update.

## Go / No-Go Recommendation

Product/internal RC go: yes, with the current Franchise v1 scope and deferred-system gates.

Strict repository verification go: yes. The final full-suite rerun is green after restoring the SMB4 standard team-profile artifacts and tightening the retirement ceremony test wait.

Recommended release note: internal Franchise v1 is a manually scheduled, existing-roster franchise flow. It supports prepared League Builder leagues, startup FARM readiness, manual/CSV schedules, score-only results, GameTracker games, standings, scoped stats, Team Hub roster/FARM/lineup/rotation, transaction-history visibility, transactions, trades, roster movement, and playoffs. It now has both a tight seeded happy-path smoke and a larger 16-team browser smoke. It does not include generated schedules, AI sim, fantasy startup draft, full offseason execution, franchise-scoped Museum, morale/relationships, custom park-factor workflows, or awards systems.
