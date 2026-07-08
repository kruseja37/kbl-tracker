# CONTRACT M1G — F13: FARM DRAFT MUST NEVER CPU-CONTROL A HUMAN TEAM

## Role
Senior implementation engineer. Build exactly this contract. If a stated assumption proves false, STOP and write BLOCKED.md instead of improvising.

## Working directory
`/private/tmp/kbl-m1g-farmshill` (git worktree, branch `lane/m1g-farmshill`, based on current origin/main which already includes the M1a nomination-seed changes in the same files — preserve them).

## The bug (diagnosed 2026-07-08, root cause verified — do not re-diagnose)
JK (Friday): the farm draft CPU-took-over one of his human teams — it silently bid and won players. Root cause chain (all file:line verified on main):
- The farm page defaults `cpuCount = scaledShillDefault(leagueTeams.length)` (LeagueBuilderFarmAuctionDraft.tsx:258, control at :254-259, passed at :465-471) and `initFarmAuction` writes it straight into `config.cpuShillCount` (useFarmAuctionDraft.ts:~484, clamped to real-team count).
- The farm builds NO synthetic shill seats and never populates `cpuShills` (farmAuctionSession.ts:39-75).
- `deriveFarmCpuTeamIds` (useFarmAuctionDraft.ts:99-119) therefore falls into the legacy `nominationOrder.slice(-cpuShillCount)` branch (:111-116) — real clubs, ownership never consulted → any human club landing in the last N shuffled seats becomes a CPU auto-bidder (autoAdvanceCpu at :292, :307-325; lone-survivor at :329-340). `resolveSessionShill` (cpuShillBidding.ts:499-505) synthesizes a shill personality for it.
- The MLB side was already hardened against exactly this: useAuctionDraft.ts:647-649 hard-zeroes `config.cpuShillCount` ("so real clubs are never borrowed") and uses explicit synthetic `__auction_shill__*` entities instead. The farm never got that hardening.
- LATENT MLB HOLE: sessions persisted BEFORE that hardening still carry `cpuShillCount > 0`; on resume `deriveBaseShillCandidateIds` (cpuTeamRoles.ts:62-77) borrows the last N real clubs and `deriveShillTeamIds` (cpuTeamRoles.ts:31-34) excludes only AI clubs, never human ones.

## Design ruling (Fable, 2026-07-08 — binding)
The farm draft has NO shills in v1. It is a prospect draft among real clubs: human clubs are controlled by humans, AI clubs (`controlledBy === "ai"`) bid via CPU. The MLB draft's synthetic-shill mechanism stays exactly as is.

## Deliverables
1. **initFarmAuction** (useFarmAuctionDraft.ts): hard-zero `config.cpuShillCount` for new farm sessions, mirroring the MLB comment/pattern at useAuctionDraft.ts:647-649.
2. **deriveFarmCpuTeamIds** (useFarmAuctionDraft.ts:99-119): remove the `nominationOrder.slice(-cpuShillCount)` branch entirely. CPU set = `controlledBy === "ai"` clubs ∪ `cpuShills` keys (which stay empty on farm). A `controlledBy === "human"` team must NEVER enter the set.
3. **Resume healing** (loadFarmAuction's existing heal step, useFarmAuctionDraft.ts:378-455): persisted farm sessions carrying `cpuShillCount > 0` heal to 0 on load, so old saves stop re-triggering the hijack.
4. **Belt-and-braces in cpuTeamRoles.ts**: exclude `controlledBy === "human"` teams from the legacy borrow path (`deriveBaseShillCandidateIds` / `deriveShillTeamIds` / `deriveAllCpuBidderTeamIds`) so even a legacy-resumed MLB session can never classify a human club as a shill. MLB synthetic `__auction_shill__*` entities are not human teams — they must keep working unchanged.
5. **Farm page UI** (LeagueBuilderFarmAuctionDraft.tsx:254-259, 465-471): remove the shill/cpuCount control and its plumbing (per the ruling there is nothing for it to configure). Keep the page's visual register; leave everything else on the page alone.

## DO NOT TOUCH (concurrent lane M1D owns these)
`scoutRangeForProspect` (LeagueBuilderFarmAuctionDraft.tsx:112-134), the lot-card scout/band display region (~:673-694), prospectScoutingDraftEngine.ts, ScoutHire, draftStaffingPersistence. Also untouchable: auction engine pricing/reserve logic, pool generation, schemas/stores.

## Required regression tests
a. 6-team league, 2 human clubs, seeds that previously landed a human club in the last-2 nomination seats → human club is NEVER in the farm CPU set and never auto-bids.
b. Persisted farm session with `cpuShillCount: 2` in its saved config → after load, heals to 0; no team outside `controlledBy === "ai"` auto-bids.
c. cpuTeamRoles: legacy MLB config with `cpuShillCount > 0` and 2 human clubs → no human club classified as shill; synthetic `__auction_shill__*` entities still classified correctly.
d. AI clubs still auto-bid on farm (the fix must not lobotomize CPU opponents).
e. Existing M1a seed tests stay green (same files).

## Gates (paste real output in M1G_DONE.txt or the final report)
`npx tsc -b --pretty false` · `npm run build` · focused suites: useFarmAuctionDraft, LeagueBuilderFarmAuctionDraft page, cpuTeamRoles, useAuctionDraft (MLB unchanged-behavior check) · full `NODE_ENV= npx vitest run` zero-new-reds (known flakes: LeagueBuilderDraftSetup CUT2-2/order-sensitive block, AwardsWatchlist, franchiseManualSmokeFixture, GameTrackerLaunchState — rerun solo if red in the big batch).

## Commit protocol
Commit `fix(farm-auction): never CPU-control human teams; farm has no shills [F13]`. On git EPERM: leave dirty + write M1G_DONE.txt (summary, files, gate outputs). Do NOT push.
