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
