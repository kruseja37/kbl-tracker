<!-- ===== GOAL: DRAFT-POOL-MODE-A ===== -->
## GOAL LOOP (Phase 1b): the draft pool must include the league's TEAMS' rosters (spec mode a), not just free agents

**ROUTE:** Build + commit in THIS worktree `/Users/johnkruse/Projects/kbl-draftfix`, branch `codex/draft-pipeline-fix` (HEAD `fea49672`). Branch-only — do NOT push, do NOT touch other worktrees. Codex cannot commit here (sandboxed `.git`) — leave changes in the working tree; the Captain audits + commits.

**ROLE:** Builder. Iterate (reproduce → fix → test) until the GOAL test is green + `npm run build` is exit 0.

**THE BUG (verified):** A league with 4 teams (88 MLB slots) starts its auction with only ~45 players — just free agents — NOT the branded teams' roster players. ROOT CAUSE: `registerLeaguePoolForLeague` (`src/utils/leagueBuilderPoolRegistration.ts:83-106`) builds the pool ONLY from players whose `leagueAssignments` includes this league. But branded-team roster players have `leagueAssignments` pointing at their ORIGIN league (e.g. 'sml'), so they are filtered out — only the league's free agents remain. SECOND BUG: `useAuctionDraft` (`src/src_figma/app/hooks/useAuctionDraft.ts` ~:382) clears every team's roster and THEN re-registers the pool — so it re-registers from EMPTY rosters, dropping any roster-derived players.

**SPEC (ratified, `spec-docs/MODE1_LEAGUE_BUILD_TO_DRAFT_VISION.md` §1):** pool mode (a) = "use the players already rostered on the selected branded teams." Teams then start EMPTY and draft from that pool. So the league's teams' rosters MUST feed the pool.

**THE FIX (do exactly these two; keep it minimal):**

**FIX A — `registerLeaguePoolForLeague` includes the league's teams' roster players.** In `src/utils/leagueBuilderPoolRegistration.ts`, build the pool from the UNION of:
- (existing) players whose `leagueAssignments` includes `league.id`, AND
- (NEW) players listed on the `mlbRoster` + `farmRoster` of every team in `league.teamIds` — read via `getTeamRoster(teamId)` (`leagueBuilderStorage.ts:1404`, returns `TeamRoster | null` with `mlbRoster: string[]` / `farmRoster: string[]`). Dedupe by player id (a `Set<string>`), then map to the existing `{id, iv: calculateIvBaseSalary(toSalaryPlayer(player)).ivBase, salary}` pool-player shape. Import `getTeamRoster` from `../utils/leagueBuilderStorage` (do NOT edit leagueBuilderStorage — read-only use). Skip any roster id with no matching `getAllPlayers()` record (defensive). NOTHING else in `registerPool`/tier/cap logic changes.

**FIX B — register the pool BEFORE clearing the rosters in `useAuctionDraft`.** In the auction-init path that currently does `for (team) clearRoster(team.id, leagueId)` then `registerLeaguePool(leagueId)`: REORDER so the pool is registered FIRST (while the rosters are still populated, so FIX A captures them), THEN clear the team rosters (so the teams are empty for the auction). The end state must be: pool captured (with the teams' roster players) AND teams empty. Keep `regenerateAndPersistLeaguePoolAxes` before the register. Do NOT change the clear logic itself (it correctly empties the roster + returns league-assigned players to FREE_AGENT).

**THE GOAL (your stopping condition):** Extend `src/utils/tests/draftPipeline.integration.test.ts` (or add a focused sibling test) to prove FIX A + B: set up a league whose TEAMS have NON-EMPTY `mlbRoster`s of real players whose `leagueAssignments` do NOT include this league (simulate the branded-team case — assignments point elsewhere or are empty). Register the pool and assert the pool's player ids INCLUDE those team-roster players (not just the league's free agents) — i.e. pool size ≈ (teams × 22) + free agents, comfortably ≥ the 88 slots. Then drive the existing MLB auction → farm auction → franchise flow to completion (still deterministic). Keep the prior assertions (curation add/remove, empty teams, sold counts) green.

**CONSTRAINTS / GUARDRAILS:**
- Branch-only. No push. No other worktree.
- Do NOT modify frozen artifacts (`src/data/playerDatabase.ts`, `spec-docs/reference/iv_oracle.json`). Do NOT edit `leagueBuilderStorage.ts` (read `getTeamRoster` only). NO `TRACKER_DB_VERSION` bump.
- Determinism preserved (mock clock/RNG like the existing test).
- STAY scoped to the pool-composition + the register/clear ordering. Do NOT touch the IV/morale freeze (Phase 2), ratings, traits, etc.
- ZERO NEW REDS vs the characterized baseline (sole hard fail = `wpaRuntimeBoundary`; re-run any suspected new red SOLO).

**VERIFICATION (paste raw output):**
1. `NODE_ENV= npm run build` → exit 0.
2. `NODE_ENV= npx vitest run src/utils/tests/draftPipeline.integration.test.ts` → GREEN, with the pool-includes-team-rosters assertion.
3. `NODE_ENV= npx vitest run` (FULL suite) → failed-file list; zero NEW reds.
4. `git --no-pager diff --stat` → only `leagueBuilderPoolRegistration.ts` + `useAuctionDraft.ts` + the test.

**REPORT:** the two fixes with file:line; the new pool-size assertion (what count it proves vs the 88 slots); whether the GOAL is met; anything still failing.

**FAILURE PROTOCOL / STOP-IF:** STOP and report if a cited anchor differs, if the fix needs a DB bump / a frozen-file or leagueBuilderStorage edit, or if registering-before-clearing breaks an existing assertion you can't reconcile without a product decision. A precise STOP + partial progress is success.

Use xhigh reasoning effort. Think step-by-step. Reproduce the ~45-vs-88 gap in the test first, then fix.
<!-- ===== END GOAL: DRAFT-POOL-MODE-A ===== -->
