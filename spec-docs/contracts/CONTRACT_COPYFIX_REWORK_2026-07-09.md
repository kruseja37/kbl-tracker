# CONTRACT ADDENDUM: COPYFIX REWORK — the load-time heal is REJECTED; replace with read-time tolerance

**Verdict being executed:** adversarial audit REJECTED Item 1 part (ii) only. Items 2/3/4 and the delete-time prune are APPROVED as-built — do not touch them. Same worktree, commit on top; the same auditor delta-audits.

## THE DEFECT (auditor-proven, probe-executed)
useLeagueBuilderData.ts:164-181 + :236-243: the load-time heal filters league/division teamIds against getAllTeams() and PERSISTS changes — but cannot distinguish "team deleted" from "team not loaded yet." Proven: empty teams table → persisted teamIds=[] (league gutted); partial table → legitimate team silently dropped. Production-reachable: kbl-league-builder syncs BOTH leagueTemplates and globalTeams (syncConfig.ts:53-55); sync applies page-by-page in separate transactions (syncEngine.ts:1342-1449) and destructive pulls clear-then-repopulate (:501-502) — mounting the League Builder mid-window fires the heal against an incomplete table. Amplifier: syncEngine._suppressSync (:278) is a dead flag never set true, so every heal-persist cloud-echoes.

## THE REWORK (captain ruling)
1. DELETE the persisting heal entirely: no load-path write to league.teamIds, ever. (Remove the :236-243 persist + the normalize-and-save; the normalizeLeagueTeamMembership helper may remain ONLY if repurposed per 2/3 below.)
2. READ-TIME TOLERANCE instead: wherever ghost ids would break behavior, filter AT CONSUMPTION without persisting — specifically duplicateLeague skips ids whose team lookup fails (with a console.warn naming them) instead of dying, which un-bricks the Duplicate button on already-damaged leagues; and any display counts that would show phantoms filter in-memory only.
3. The delete-time prune (leagueBuilderStorage.ts:1136-1143) stays — it is the correct, precise writer (removes only the specific deleted id).
4. PERMANENT REGRESSION TESTS from the auditor's probe: (a) empty teams table + load → league record on disk UNCHANGED (byte-equal), zero saveLeagueTemplate calls, zero syncEngine.upsert calls (mock isSuppressed → false so the echo path is what's tested); (b) partial teams table → same invariants; (c) ghosted league + duplicate → succeeds with ghost skipped (copy contains only real teams) and no error banner unless the duplicate genuinely fails.
5. Update the Item 1 error-banner behavior to match: with read-time tolerance the "Team not found: ghost-team" hard error should no longer occur on duplicate — keep the banner wiring for GENUINE failures (storage throw), adjust its test accordingly (assert tolerance, not the old error).

## OUT OF SCOPE (ticketed separately by the captain — do not touch)
The dead _suppressSync flag in syncEngine.ts — a latent product landmine beyond this lane's surface.

## GATES (paste real outputs)
tsc -b clean; npm run build exit 0; the 3 contract suites + full leagueBuilder folder sweep green; the new regression tests red-first where meaningful (the persist-suppression assertions must FAIL against the current heal-persisting code — commit that red run, then the fix). Final contract update with evidence. Final message: summary + hashes.

## BUILDER RESULT (Codex, 2026-07-09)

### Red-first evidence
Commit: `e4944687` — `test(copyfix): lock rejected load-heal regressions`

Command:
`NODE_ENV= npx vitest run src/src_figma/hooks/__tests__/useLeagueBuilderData.test.tsx --reporter=verbose`

Pre-fix result against the rejected load-time heal:
- Exit 1.
- `Test Files  1 failed (1)`
- `Tests  3 failed | 7 passed (10)`
- Failures proved the rejected behavior:
  - Empty teams table load returned persisted/in-memory `teamIds=[]` instead of `['team-a', 'team-b']`.
  - Partial teams table load returned `['team-a']` instead of `['team-a', 'team-b']`.
  - Ghosted duplicate mutated the source league by pruning `ghost-team` before copy.

### Code changes
- Removed the load-time membership normalizer and all load-path `saveLeagueTemplate()` calls from `src/src_figma/hooks/useLeagueBuilderData.ts`.
- Changed `duplicateLeague()` to resolve teams at consumption time, skip missing team ids, and `console.warn` the skipped ids without mutating the source league.
- Filtered League Builder list team counts against loaded in-memory teams in `src/src_figma/app/pages/LeagueBuilderLeagues.tsx`; no persistence.
- Updated the duplicate-page tests so the old `Team not found: ghost-team` banner is no longer expected, while genuine duplicate failures still surface.
- Left the approved delete-time prune in `src/utils/leagueBuilderStorage.ts` untouched.
- Left approved COPYFIX Items 2/3/4 untouched.

### Green evidence
Command:
`npx tsc -b --clean && npx tsc -b --pretty false`

Result:
- Exit 0.
- No compiler output.

Command:
`npm run build`

Result:
- Exit 0.
- `✓ built in 10.34s`
- PWA generated `183 entries`.
- Existing warnings only: Browserslist data age, one dynamic/static import chunking warning for `franchisePlayerStorage.ts`, and chunk-size warnings.

Command:
`NODE_ENV= npx vitest run src/src_figma/hooks/__tests__/useLeagueBuilderData.test.tsx --reporter=verbose`

Result:
- Exit 0.
- `Test Files  1 passed (1)`
- `Tests  10 passed (10)`

Command:
`NODE_ENV= npx vitest run src/src_figma/__tests__/leagueBuilder/LeagueBuilderLeagues.test.tsx --reporter=verbose`

Result:
- Exit 0.
- `Test Files  1 passed (1)`
- `Tests  40 passed (40)`
- Expected stderr from the genuine-failure banner test: `Failed to duplicate league: Error: Storage unavailable`.

Command:
`NODE_ENV= npx vitest run src/src_figma/hooks/__tests__/useLeagueBuilderData.test.tsx src/src_figma/__tests__/leagueBuilder/LeagueBuilderLeagues.test.tsx src/src_figma/__tests__/leagueBuilder/LeagueBuilderTeams.test.tsx --reporter=verbose`

Result:
- Exit 0.
- `Test Files  3 passed (3)`
- `Tests  83 passed (83)`
- Existing React `act(...)` warnings still print in Teams page tests.

Command:
`NODE_ENV= npx vitest run src/src_figma/__tests__/leagueBuilder src/src_figma/hooks/__tests__/useLeagueBuilderData.test.tsx src/utils/tests/leagueBuilderFarmScoutingHandoff.test.ts src/utils/tests/leagueBuilderPoolUniverse.test.ts src/utils/tests/leagueBuilderPoolBuilder.handEditLedger.test.ts src/utils/tests/leagueBuilderPoolMembership.dj05.test.ts src/utils/tests/leagueBuilderStartupFarmDraft.test.ts src/utils/tests/leagueBuilderStorageV6Migration.test.ts --reporter=verbose`

Result:
- Exit 0.
- `Test Files  17 passed (17)`
- `Tests  279 passed (279)`
- Existing React `act(...)` warnings still print in Teams/Players page tests.
