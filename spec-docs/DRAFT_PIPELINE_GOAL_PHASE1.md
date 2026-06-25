<!-- ===== GOAL: DRAFT-PIPELINE-PHASE1 ===== -->
## GOAL LOOP (Phase 1): let the user CURATE a pool, EMPTY team rosters, and run the MLB AUCTION draft → launch a franchise

**ROUTE:** Build + commit in THIS worktree `/Users/johnkruse/Projects/kbl-draftfix`, branch `codex/draft-pipeline-fix` (HEAD `ed6409fc` — pass 1 fixed the stale-auction-session bug + added `draftPipeline.integration.test.ts`). Branch-only — do NOT push, do NOT touch any other worktree. The Captain (Opus) audits your real diff after the pass; Codex cannot commit here (sandboxed `.git`) — leave changes in the working tree.

**ROLE:** Builder. Goal-driven loop: iterate (reproduce → fix → test) until the GOAL test is green + `npm run build` is exit 0.

**SPEC SOURCE OF TRUTH (ratified, read first):** `spec-docs/MODE1_LEAGUE_BUILD_TO_DRAFT_VISION.md` (§1 the two pool modes + "Teams START EMPTY for the draft"; §6 R1 the league-wide format applied to BOTH MLB and farm; §9.A auction-only v1; §R3 the farm auction) + `spec-docs/AUCTION_DRAFT_SPEC_V2.md`. The pipeline is: **League Build → curate/lock the pool → empty-team AUCTION (MLB + farm) → franchise.**

**USER-CONFIRMED SCOPE (JK, do EXACTLY these three; do NOT expand):** The only confirmed blockers are (1) cannot curate/load a draft pool, (2) cannot empty team rosters, (3) cannot run the MLB AUCTION draft (teams aren't empty + the entry falls through to snake). **DE-SCOPE — do NOT touch:** the "Phase-2 freeze" (IV-baseline carry / draft-derived player+fan morale). The franchise launch already works and correctly tags a captain + fan-favorite, so leave the freeze/seed layer ALONE unless a test proves it broken.

**THE GOAL (your stopping condition):** Extend `src/utils/tests/draftPipeline.integration.test.ts` (or add a sibling) with a deterministic, headless test that proves the curated-pool → empty-team → auction flow at the LOGIC level, AND build the supporting UI (for the user's browser verification). The test must:
1. Seed real SMB4 players. CURATE a pool that includes players who are NOT on the chosen teams' branded rosters (prove a player can be added to a league as a FREE AGENT from the global pool, and removed) — i.e. exercise the pool-curation path that backs the new UI.
2. Start the chosen teams with NON-empty rosters, then EMPTY them via the new clear-roster path, and assert they are empty.
3. Register the pool from the curated set, run the MLB AUCTION to real completion (≥1 sold, rosters filled), run the FARM AUCTION (not snake), launch the franchise, assert the drafted players are present.
4. Be deterministic (mock clock/RNG like the existing test) and re-run identically.

**THE THREE FIXES (grounded anchors — re-read each before editing):**

**FIX 1 — POOL CURATION (the "Add Player" capability).** `src/src_figma/app/pages/LeagueBuilderPlayers.tsx` already lists ALL players (`getAllPlayers`, `leagueBuilderStorage.ts:1006`) and has a "CREATE PLAYER" button (`:806`). A player is tied to a league via `leagueAssignments` (`{leagueId, teamId, rosterStatus: 'MLB'|'FARM'|'FREE_AGENT'}`, `leagueBuilderStorage.ts:172`); the save path forces `FREE_AGENT` when `teamId` is empty (`LeagueBuilderPlayers.tsx:592-604`). `registerLeaguePoolForLeague` builds the pool from every player whose `leagueAssignments` includes the league (`leagueBuilderPoolRegistration.ts:83-106`).
- ADD a per-player **"Add to this league" / "Remove from league"** quick action in the Players list (next to / consistent with "CREATE PLAYER"): "Add" appends a `{leagueId: activeLeagueId, teamId: '', rosterStatus: 'FREE_AGENT'}` assignment (via `savePlayer`); "Remove" strips that league's assignment. The list already spans every league's players (on teams or FAs) + the DB, so the user can FIND any player and add/remove it. Keep "Create Player" (a created player can be added too).
- The pool then = whatever the user curated (the existing `registerLeaguePoolForLeague` is correct — it reads the league's assignments). "all free agents auto-included is fine" per JK — the requirement is ADD/REMOVE/CREATE control, not a filter change.

**FIX 2 — EMPTY TEAM ROSTERS.** `TeamRoster` (`leagueBuilderStorage.ts:384`) holds `mlbRoster: string[]` + `farmRoster: string[]`; there is NO per-team clear (only `clearAllLeagueBuilderData`). `initializeFranchise` copies league rosters as-is (`franchiseInitializer.ts` `deepCopyLeagueToFranchise`), so pre-rostered teams carry in and the auction has no open slots.
- ADD `clearTeamRoster(teamId)` (or `emptyTeamRoster`) to `leagueBuilderStorage.ts` that sets `mlbRoster=[]`, `farmRoster=[]` (and the derived lineup/rotation/depth fields to empty, mirroring the test's `emptyRoster` helper). NOTE: `leagueBuilderStorage.ts` is a cross-branch overlap file — this ADDITIVE function is fine on this isolated branch (reconcile at merge); do NOT change existing signatures.
- ADD a **"Clear rosters"** UI action (per-team on the Teams page and/or per-league on the leagues row) so the user can empty teams before drafting. The branded rosters should feed the POOL (the user curates), NOT pre-populate the teams. Ensure teams are EMPTY when the auction begins (either via the user clearing + a guard, and/or clearing at draft setup) so the MLB auction actually runs.

**FIX 3 — AUCTION ROUTING (auction league → MLB auction + farm auction, never snake).** The routing helpers `draftRouteForFormat`/`draftRouteForLeague` + `getLeagueDraftFormat` (`leagueBuilderStorage.ts:115`, default 'auction') exist and the per-league "Draft" button (`LeagueBuilderLeagues.tsx:397`) already routes by format. But the user still reached SNAKE — so OTHER entry points bypass it: the hub button `LeagueBuilder.tsx:211` `navigate("/league-builder/draft")` (generic), and the farm path. TRACE every draft entry (the hub cards, `/league-builder/draft`, the MLB→farm transition `LeagueBuilderAuctionDraft.tsx:696`) and make ALL of them honor the league's `draftFormat`: an auction league must route to the MLB AUCTION and the FARM AUCTION, never snake/the snake-startup farm. (v1 is auction-only; do NOT delete the snake code — just stop auction leagues from falling into it.) If `/league-builder/draft` (the farm-startup page) is the snake farm path the user hit, route auction leagues to the farm auction instead.

**CONSTRAINTS / GUARDRAILS:**
- Branch-only on `codex/draft-pipeline-fix`. Do NOT push. Do NOT touch other worktrees.
- Do NOT modify frozen artifacts (`src/data/playerDatabase.ts`, `spec-docs/reference/iv_oracle.json`).
- NO `TRACKER_DB_VERSION` bump (all changes are additive UI + existing storage shapes). If you think you need one, STOP and flag.
- Determinism preserved (the draft is seeded; the test mocks clock/RNG).
- STAY in scope: pool curation + empty rosters + auction routing. Do NOT touch the IV/morale freeze, ratings, traits, WPA, etc.
- Keep the suite green: ZERO NEW REDS vs the characterized baseline (sole hard fail on this lineage = `wpaRuntimeBoundary`; re-run any suspected new red SOLO).

**VERIFICATION (every pass; paste raw output):**
1. `NODE_ENV= npm run build` → exit 0.
2. `NODE_ENV= npx vitest run src/utils/tests/draftPipeline.integration.test.ts` (+ any UI test you add) → GREEN, with the curation + empty-roster + auction-routing assertions.
3. `NODE_ENV= npx vitest run` (FULL suite) → failed-file list; zero NEW reds.
4. `git --no-pager diff --stat` → only pool-curation + roster-clear + routing files + tests.

**REPORT (end of pass):** (a) the three fixes with file:line; (b) the integration-test additions + what they assert; (c) which UI pieces need the user's BROWSER verification (the "Add Player" action, the "Clear rosters" action, the routing); (d) anything still failing + why; (e) whether the GOAL is met.

**FAILURE PROTOCOL / STOP-IF:** STOP and report if: (a) a cited anchor differs (re-read + report); (b) the goal needs a DB bump or a frozen-file/Phase-2-freeze change; (c) emptying rosters or routing cleanly requires a product decision you can't default (state the options). A correct STOP with precise reasons + partial progress is success.

Use xhigh reasoning effort. Think step-by-step. Reproduce before you fix; let the integration test be the logic oracle; the UI is for the user's browser check.
<!-- ===== END GOAL: DRAFT-PIPELINE-PHASE1 ===== -->
