# Franchise Internal v1 Scout + Prospect Draft Checkpoint

Commit: `764ea6e Implement League Builder scout and prospect draft`

## Included Behavior

- League Builder owns startup farm/scouting preparation for Franchise v1.
- Normal League Builder draft flow runs a scout draft first, with two hired scouts per team from a deterministic pool.
- Prepared durable scout/FARM state blocks normal destructive scout draft restart in v1.
- Prospect draft is pick-by-pick, fills FARM vacancies only, and preserves existing FARM players.
- Prospect board/report surfaces are visible-safe and do not expose true ratings, true grade, or hidden personality modifiers.
- Prospect pick confirmation validates durable scout state before writes.
- Scout hire and prospect pick persistence paths include rollback coverage for session-save failures.
- Franchise Setup validates and copies prepared League Builder state; it does not run the legacy auto-fill bridge from normal UI.

## Verification Results

- `git status --short`: clean before creating this checkpoint doc.
- `git log --oneline -5`: confirmed `764ea6e` at `HEAD`.
- `npm test -- src/utils/tests/prospectScoutingDraftEngine.test.ts src/utils/tests/leagueBuilderStartupFarmDraft.test.ts src/utils/tests/leagueBuilderFarmScoutingHandoff.test.ts src/src_figma/__tests__/leagueBuilder/LeagueBuilderDraft.test.tsx src/src_figma/__tests__/leagueBuilder/LeagueBuilderRosters.test.tsx src/src_figma/__tests__/franchiseMode/FranchiseSetup.test.tsx src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts --reporter=dot`: passed, 7 files / 87 tests. Known React `act(...)` warnings remain in `FranchiseSetup.test.tsx`.
- `npx playwright test test-utils/journeys/10-franchise-v1-16-team-realistic-smoke.spec.ts --reporter=list`: passed, 1 test in about 2.0 minutes.
- `npm run build`: passed. Existing Vite large chunk warnings remain.
- `git diff --check`: passed.

## Known Deferred Items

- No generated Franchise regular-season schedules.
- No fantasy MLB startup draft.
- No AI simulation, AI trades, or expanded trade automation.
- No Mode 3/offseason execution beyond guarded/deferred surfaces.
- No morale, relationships, awards, custom park factors, scouting persistence expansion, or narrative/random-event expansion.
- No normal v1 reset/restart flow for prepared startup scout/FARM state; reset remains deferred/manual.

## Verdict

Safe for internal Franchise v1 scout/prospect draft release-candidate checkpoint: **yes**.
