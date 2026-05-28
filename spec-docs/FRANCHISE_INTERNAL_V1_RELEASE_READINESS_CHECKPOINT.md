# Franchise Internal v1 Release Readiness Checkpoint

Date: 2026-05-28
Branch: `codex/gametracker-live-fixes`
Verified application HEAD before this checkpoint doc commit: `0b59028839f83ab41e56cf00d85e48b5e9d43714`
Short verified HEAD: `0b59028 Add Franchise v1 happy path smoke`

## Go / No-Go Recommendation

Recommendation: **GO for an internal v1 checkpoint build**, not a public or feature-complete Franchise release.

The core internal happy path is now covered by committed implementation and targeted verification: League Builder FARM preparation, Franchise Setup validation/copy, manual schedule behavior, Team Hub FARM visibility, durable lineup/rotation save, FranchiseHome launch, and Franchise GameTracker no-DH launch parity.

The earlier full-suite `PlayerCardModal` expectation mismatch was fixed by updating the stale test to the current substitution callback contract, which includes `incomingPlayerId` before `incomingName`. The full suite now passes.

## Commit / Checkpoint Inventory

Current local stack includes the accepted Franchise v1 baseline and later stabilization slices:

- `bbf15e4` - Checkpoint franchise v1 baseline and schedule policy cutover.
- `2cf79f4` - Harden franchise GameTracker lifecycle completion.
- `4495ec9` - Harden franchise roster farm and manual trade spine.
- `41753c6` - Checkpoint franchise v1 thread 4 value spine.
- `d108dfc` - Stabilize franchise narrative history boundary.
- `b831e90` - Stabilize franchise v1 thread integration.
- `b3aa3a2` - Add franchise manual schedule CSV import.
- `ecd92f2` - Add franchise regular-season transaction desk.
- `5630ba3` - Harden franchise stat truth boundary.
- `2c0eae8` - Harden franchise mode one handoff.
- `3be03cc` - Harden franchise playoff handoff.
- `f4217d6` - Add franchise score-only results.
- `f8c097b` - Gate franchise v1 release surfaces.
- `2439ef6` - Add startup prospect draft for franchise setup.
- `5b86462` - Harden startup prospect draft handoff.
- `1df0ddf` - Add League Builder farm scouting draft foundation.
- `5991b45` - Add Team Hub farm prospect visibility.
- `8d201a1` - Add Team Hub lineup rotation manager.
- `c1e89f2` - Align franchise GameTracker launch with Team Hub rosters.
- `0b59028` - Add Franchise v1 happy path smoke.
- pending checkpoint commit - Update stale `PlayerCardModal` substitution expectations and record final release-readiness verification.

The setup playoff count guard is present in the current tested state. Evidence: focused setup tests passed the `FranchiseSetup.test.tsx` cases under `Step 3 - Playoff Team Count Guard`, including hiding impossible Top 4 qualifiers for a 2-team league and preserving standard options for a 16-team league.

## v1-Ready Surface

- League Builder is the primary startup FARM/scouting owner for v1. The current stack includes deterministic startup FARM/scouting draft foundation and handoff tests: `prospectScoutingDraftEngine.test.ts`, `leagueBuilderStartupFarmDraft.test.ts`, and `leagueBuilderFarmScoutingHandoff.test.ts`.
- Franchise Setup validates and copies prepared league state. It blocks invalid handoff states, keeps generated regular-season schedules out of the v1 path, and preserves the manual/empty schedule policy.
- Existing-roster Franchise setup can create a franchise from a prepared league with 22 MLB + 10 FARM players per team.
- Team Hub can display MLB and FARM players and save durable MLB lineup/rotation state while excluding FARM players from MLB lineup/rotation choices.
- FranchiseHome can launch manually scheduled games from current franchise-owned Team Hub roster state.
- Franchise GameTracker launch parity is covered for no-DH behavior: saved/selected pitcher appears at `P` / #9 and not leadoff, and FARM players are excluded from launch rosters.
- Schedule entry/import, score-only results, regular-season transaction desk, roster movement, manual trades, stat boundary, playoff handoff, and playoff completion have focused passing tests in this checkpoint.
- Build succeeds from the current checked-out source.

## Explicitly Deferred

These areas should not be expanded before the internal v1 checkpoint unless a true blocker is found:

- Fantasy MLB draft.
- Generated regular-season schedules.
- AI season simulation.
- Broad Mode 3/offseason mutation workflows.
- Morale and relationship engine expansion.
- Durable scout assignment/scout profile management beyond the current startup visible-safe scouting handoff.
- Salary system expansion beyond the current baseline/spine.
- Narrative, awards, milestones, and almanac expansion beyond the current guarded/read-only or boundary behavior.
- Custom park-factor and stadium analytics expansion beyond the current identity/factor spine.
- Public-release UX polish outside the tested internal workflow.

## Known Warnings / Noise

- React `act(...)` warnings appeared across several component tests, including Franchise setup/home tests.
- `indexedDB is not defined` warnings appeared from offseason/postgame story polling paths in test environment.
- GameTracker live home win probability warnings appeared in the focused launch-state tests: `Cannot read properties of undefined (reading 'current')`. The relevant focused tests still passed.
- Negative-path storage/sync tests log expected errors.
- Substitution modal tests emit React style warnings about mixing shorthand and non-shorthand border properties.
- Production build emits the existing Vite chunk-size warning for large chunks, including `GameTracker`.
- Known excluded dirty files remain present and were not touched by this checkpoint:
  - `package.json`
  - `supabase/.temp/cli-latest`
  - `scripts/exportSmb4GeneratedRosterReport.mjs`
  - `scripts/exportSmb4TeamProfiles.mjs`
  - `spec-docs/data/smb4_standard_team_profiles.csv`
  - `spec-docs/data/smb4_standard_team_profiles.json`
  - `spec-docs/generated/`

## Manual Smoke Coverage

The most recent human-facing setup wizard smoke covered the internal v1 six-step setup flow:

- Existing-roster league path was visible and usable.
- Fantasy draft/generated startup controls were hidden, disabled, or clearly deferred.
- No generated regular-season schedule behavior was observed in the setup path.
- Season length, innings, and playoff setup were understandable; the current checkpoint additionally verifies the playoff count guard with focused tests.
- Farm/scouting readiness messaging identified League Builder as the startup FARM preparation owner.
- Invalid 22 MLB + 10 FARM handoff state was blocked/reported.
- A valid prepared league could create a franchise.
- Created franchise landed in FranchiseHome with empty/manual schedule behavior.

This checkpoint did not rerun the full manual browser walkthrough; it reran the committed seeded browser happy-path smoke.

## Verification Results

### Seeded Playwright Happy Path

Command:

```bash
npx playwright test test-utils/journeys/09-franchise-v1-seeded-happy-path.spec.ts --reporter=list
```

Result: **passed**.

- 1 passed / 1 test.
- Covered: League Builder startup FARM draft to Team Hub save to no-DH GameTracker launch.

### Focused Franchise v1 Suites

Command:

```bash
npm test -- --run src/utils/tests/prospectScoutingDraftEngine.test.ts src/utils/tests/leagueBuilderStartupFarmDraft.test.ts src/utils/tests/leagueBuilderFarmScoutingHandoff.test.ts src/utils/tests/franchiseStartupProspectDraft.test.ts src/src_figma/__tests__/leagueBuilder/LeagueBuilderDraft.test.tsx src/src_figma/__tests__/franchiseMode/FranchiseSetup.test.tsx src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts src/src_figma/__tests__/franchiseMode/TeamHubContent.franchiseReads.test.tsx src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx src/src_figma/__tests__/franchiseMode/FranchiseHome.test.tsx src/src_figma/__tests__/franchiseMode/franchiseGameTrackerRoster.test.ts src/src_figma/__tests__/gameTracker/GameTrackerLaunchState.test.tsx src/src_figma/__tests__/schedule/ScheduleContent.test.tsx src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts src/utils/tests/franchiseScheduleCsv.test.ts src/utils/tests/franchiseRosterMovement.test.ts src/utils/tests/franchiseTradeAdapter.test.ts src/src_figma/__tests__/franchiseMode/TradeFlow.franchiseTransactions.test.tsx src/utils/tests/franchiseStatAttribution.test.ts src/utils/tests/processCompletedGame.statBoundary.test.ts src/src_figma/__tests__/franchiseMode/usePlayoffData.franchiseScope.test.tsx src/src_figma/__tests__/franchiseMode/franchiseSeasonScoping.wave3.test.ts src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts src/src_figma/__tests__/franchiseMode/SeasonSummary.pass5.test.tsx
```

Result: **passed**.

- 25 test files passed.
- 229 tests passed.

### Full Suite

Command:

```bash
npm test -- --reporter=dot
```

Result: **passed**.

- 330 test files passed.
- 6678 tests passed.

The prior stale `PlayerCardModal` expectation mismatch was fixed before this final full-suite run.

### Build

Command:

```bash
npm run build
```

Result: **passed**.

- TypeScript build passed.
- Vite production build passed.
- PWA assets generated.
- Existing chunk-size warning remains.

## Final Recommendation

Proceed with an internal v1 checkpoint build from the current branch after this checkpoint doc and the `PlayerCardModal` test expectation fix are committed.

Push recommendation: push the current branch after this checkpoint commit. Tag recommendation: acceptable for an internal v1 checkpoint tag, with release notes clearly stating that this is not public/feature-complete Franchise and that the deferred systems listed above remain out of scope.
