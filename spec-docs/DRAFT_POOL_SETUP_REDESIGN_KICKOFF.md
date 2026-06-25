# KICKOFF — Mode-1 Draft-Pool Setup: first-principles redesign + clean build

> Paste this into a fresh session. You have NO prior context — this brief is self-contained.
> **Recommended reasoning effort: MAX** for the deep-dive + design (this is a from-first-principles
> UX design grounded in a multi-doc spec + a live codebase — the most reasoning-intensive work).
> Drop to **xhigh** for the mechanical build + cleanup. If you want one setting all session, use **xhigh**.

## YOUR MISSION
The Mode-1 league-build → draft pipeline WORKS at the engine level, but the **draft-pool SETUP UX is a pile of iterative patches** that JK (the product owner) finds too messy. From **FIRST PRINCIPLES**, design and build the RIGHT draft-pool-setup experience inside a league, where the user can:
1. **Easily add/remove players** (bulk, not one-at-a-time across 88+ players),
2. **See exactly who is IN and who is OUT** of the pool at a glance, and
3. **Register the pool and see every player's IV value** (the economy anchor they'll draft against),
then run the draft. **Get the UI/UX right in ONE clean build, then delete what's now obsolete.** Do NOT keep patching.

## THE NON-NEGOTIABLE METHOD (in order)
1. **DEEP DIVE.** Read the spec + the current code + this session's patches. Understand the intended pipeline, the current state, and the gaps. Reason from first principles: *what IS a draft pool, what is the minimal-correct mental model + UX, what logic/UI concepts are we MISSING?*
2. **DESIGN.** Produce a tight design doc — the data model + the screen/flow + the missing concepts + what becomes obsolete. **Surface it to JK for a ruling BEFORE the big build** (UX is his call), but make it complete enough to sign off in one pass.
3. **BUILD it correctly** (one-shot the right UX). REUSE the working engine/storage (auction state machine, IV calc, franchise handoff) — those are fine; do not rebuild them.
4. **CLEAN OUT** the now-obsolete patches *after* the new flow supersedes them — without breaking the auction→franchise pipeline. Build-right → swap → clean (never delete-then-rebuild).

## ORIENTATION — read these FIRST (the spec is the source of truth)
- `spec-docs/MODE1_LEAGUE_BUILD_TO_DRAFT_VISION.md` — the ratified pipeline: **League Build → Lock → IV computation → empty-team AUCTION (MLB + farm) → 4-number freeze → Mode-2 seed.** The TWO pool modes (**a**: use the players already rostered on the selected branded teams; **b**: hand-pick from the player database). **Teams start EMPTY** for the draft; rosters feed the POOL, not the teams. **Auction-only v1** (snake → v1.1). Format is **league-wide** (both MLB + farm). Tier sets the **BUDGET/cap**; **IV is objective** (§7 R7). The "**lock**" freezes the pool.
- `spec-docs/AUCTION_DRAFT_SPEC_V2.md` — auction mechanics + the **4-number freeze** (IV / settled salary / draft-derived player morale / payroll-rank fan morale) that seeds Mode 2.
- `spec-docs/LEAGUE_BUILD_TO_DRAFT_AUDIT.md` — current-state gaps. **NOTE: PARTLY STALE** — it says "auction MISSING," but the auction has been BUILT since. Trust the vision spec + the LIVE code, not this audit's built/missing verdicts.
- `spec-docs/LEAGUE_BUILDER_FIGMA_SPEC.md` + `spec-docs/DRAFT_FIGMA_SPEC.md` — the UI design language + existing screens.

## WHERE YOU'RE WORKING
- **Branch `codex/draft-pipeline-fix`** in worktree **`/Users/johnkruse/Projects/kbl-draftfix`** (isolated off `franchise-v1-next`; own `node_modules`; NOT merged, NOT pushed). Read canonical spec-docs from this worktree.
- Dev server: `cd /Users/johnkruse/Projects/kbl-draftfix && NODE_ENV= npx vite --host --port 5173` (port **5173** is JK's data origin — his real leagues/teams/players live there). If it's down or pointing at another worktree, stop that and re-serve from here.
- **This session's commits (the working-but-messy state you're cleaning up):**
  - `ed6409fc` — fixed a stale auction-session bug; added the engine-level integration test `src/utils/tests/draftPipeline.integration.test.ts` + extracted utils `src/utils/leagueBuilderAuctionPipeline.ts`, `src/utils/leagueBuilderPoolRegistration.ts`.
  - `fea49672` — Phase-1 patches: a **per-player Add/Remove-to-league** button on each row of the Players page (JK found this inadequate); `clearTeamRoster` + "Clear rosters" UI; auction **routing** (`src/src_figma/app/utils/draftRouting.ts` + redirects so an auction league → MLB + farm auction, never snake).
  - `c230872b` — the pool is now the UNION of league-assigned players + the league's **teams' rosters** (mode a); register-before-clear ordering in `useAuctionDraft`.
- The integration test (`draftPipeline.integration.test.ts`) proves the engine pipeline end-to-end (curate → empty teams → MLB auction → farm auction → franchise launch). **KEEP IT GREEN** and extend it for the new UX.

## THE CURRENT SETUP UX (what's messy + why JK rejected it)
Pool-building is scattered with no single "draft setup" home:
- **Players page** (`src/src_figma/app/pages/LeagueBuilderPlayers.tsx`): a per-player **Add/Remove** button + a league dropdown + "Create Player". Per-player is tedious (88+ players); you can't see the pool as a whole; **no IV view**.
- **Leagues page** (`LeagueBuilderLeagues.tsx`): a "**Register Pool**" button that shows a player COUNT + a surplus warning AFTER registering — **not a per-player IV view**; + a "Clear rosters" action.
- **Teams page** (`LeagueBuilderTeams.tsx`): a "Clear rosters" action.
- `registerLeaguePoolForLeague` (`src/utils/leagueBuilderPoolRegistration.ts`) computes each player's IV (`calculateIvBaseSalary → ivBase`, `src/engines/salaryCalculator.ts`) but **the user never SEES the per-player values.**
- **JK's verdict:** too messy; no clean "draft setup"; can't see who's in/out at a glance; can't see the IV values of the pool.

## THE FIRST-PRINCIPLES DESIGN QUESTIONS (answer these in the deep dive)
- What IS a draft pool, conceptually? (A league-scoped, lockable set of player INSTANCES available to draft, each with a computed IV — per §2.H the league owns a snapshotted pool of instances.)
- What is the RIGHT single screen/flow to build it? (A dedicated "Draft Setup" / "Pool Builder" inside the league?)
- How does the user see IN vs OUT clearly and at a glance? (Candidate list ↔ pool list? two panes? toggles with obvious state? a running pool-count-vs-slots indicator?)
- How do the three player sources compose — branded-team rosters (mode a), free agents, hand-picked/created (mode b)? How does the user start from one and adjust?
- Where + when does IV show? (A pool table with each player's IV — sortable/filterable — so the user sees the values they're drafting against; ideally live as they build, and definitively on register/lock.)
- The **lock/freeze** concept: how does the user finalize the pool before the draft (and what does locking guarantee — immutability of the instances)?
- The slots-vs-pool relationship (need a SURPLUS over teams × slots, e.g. 4 teams × 22 = 88 MLB slots): how is sufficiency surfaced?
- What logic/UI concepts are MISSING that the spec implies but the code lacks?

## BUILD + CLEANUP
- Build the designed UX. REUSE the working engine/storage: `auctionStateMachine.ts`, `registerPool`/IV calc, the franchise handoff (`franchiseInitializer.ts`) — these work; do not rebuild them.
- THEN remove the obsolete patches (the scattered per-player Add/Remove, any redundant clear/routing hacks) once the new flow supersedes them — without breaking the auction→franchise pipeline.
- Extend `draftPipeline.integration.test.ts` to prove the new flow at the logic level; full suite stays **zero-new-reds** (sole characterized hard fail on this lineage = `wpaRuntimeBoundary`; re-run any suspected new red SOLO).

## GUARDRAILS
- Branch-only on `codex/draft-pipeline-fix`. **NEVER push.** The spec is the source of truth; reason from first principles within it.
- Do NOT touch frozen artifacts: `src/data/playerDatabase.ts`, `spec-docs/reference/iv_oracle.json`. No `TRACKER_DB_VERSION` bump unless genuinely required (then STOP and flag — it updates store-list test pins). `src/utils/leagueBuilderStorage.ts` is a cross-branch overlap file — additive-only; flag any edit.
- If you dispatch Codex to build: `cd /Users/johnkruse/Projects/kbl-draftfix && cat <contract> | NODE_ENV= ~/.local/bin/codex exec -C /Users/johnkruse/Projects/kbl-draftfix --skip-git-repo-check -s workspace-write -c model_reasoning_effort=xhigh -o /tmp/<id>.out -` (run in background; macOS has no `timeout`). Codex CANNOT commit in this worktree (sandboxed `.git`) — YOU audit the real diff (builder≠auditor) + gate (`NODE_ENV= npm run build` + `NODE_ENV= npx vitest run`) + commit. Read the VITEST SUMMARY (failed-file list), not the exit code.
- **DO NOT touch the Phase-2 freeze** (carrying IV / draft-derived morale into Mode 2) — JK de-scoped it; the franchise launch + captain/fan-favorite tagging already work. Stay in the draft-pool-SETUP lane.

## DELIVERABLES, in order
1. A short **DESIGN doc** (data model + the draft-setup screen/flow + the missing concepts + what gets removed). **Surface to JK for sign-off before building.**
2. The **clean build** (the right UX).
3. The **cleanup** (remove obsolete patches) + the extended, green integration test.

After reading + deep-diving, RESTATE your understanding of the intended pipeline + the current mess + your proposed design direction, and WAIT for JK's sign-off before the big build.
