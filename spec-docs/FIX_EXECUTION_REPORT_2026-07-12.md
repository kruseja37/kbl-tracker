# Snake Mock-Draft Fix Execution Report — 2026-07-12

## Baseline

- Base: `origin/main` `ea66830e0305d999f4140a101d452417f7d9152e`
- Clean implementation worktree: `/private/tmp/kbl-snake-mock`
- Production build: passed before changes.
- Full baseline suite: 659 files / 9,795 tests passed; two Draft Setup timing tests failed in the full concurrent run and both passed immediately in isolated reruns. These files are outside the snake-room build fence.

## Slice 1A — choose, inspect, draft

Contract: `spec-docs/contracts/CONTRACT_SNAKE_MOCK_1A_2026-07-12.md`

Built:

- Select an exact available MLB player from the 22-slot board or position rankings.
- Keep the private desk revealed while browsing players.
- Show an unambiguous brass selected state.
- Open the existing full player profile with ratings, positions, traits, archetype, personality, and chemistry.
- Use `DRAFT PLAYER` to cover and arm; the existing one-second gavel remains the write confirmation.
- Persist the exact selected id, registered-pool frozen IV, marginal tax, and correction receipt.
- Repair selection at the next turn or when a player becomes unavailable/illegal.
- Fail loudly rather than showing a false recorded pick when the selected player cannot be saved.
- Remove visible hardcoded player pronouns from both MLB and farm snake-room copy while retaining engine gender data.
- Preserve the farm `COVER & ARM` ritual and auction behavior.

Independent audit findings fixed:

1. Hardcoded `him` copy remained in the MLB desk and risk reads.
2. The real ritual test did not initially pin frozen IV and the correction snapshot.
3. Missing/stale player data could return silently and falsely allow `PICK RECORDED`.
4. Farm scout copy still contained `KEEP HIM` after MLB was corrected.

Final verification:

- Slice gate: 5 files / 30 tests passed.
- Farm/profile/auction regression gate: 3 files / 27 tests passed.
- Performance profile: 2 tests passed; 250-player/8-club reveal measured 517 ms in the independent run.
- Farm model/private-desk/page gate: 3 files / 8 tests passed.
- Production build: passed after the final audited fix.
- `git diff --check`: clean.
- Whole snake production-path pronoun/theme grep: clean.

Status: **INDEPENDENTLY APPROVED**. JK browser acceptance remains the sole product gate and will occur after the complete mock-draft program is assembled.

## Slice 2B — team-first private seats and off-clock boards

Contract: `spec-docs/contracts/CONTRACT_SNAKE_MOCK_2B_2026-07-12.md`

Built:

- Separate live-pick ownership from the selected private desk on the shared main device.
- Select any club from the branded room controls; every switch removes the prior private DOM and opens the next club covered.
- Allow off-clock player inspection, overall/position reorder, 22-slot refit, what-if work, and a fixed-buyer private trade guide while withholding the draft action.
- Keep exact-player selection scoped per club and repair it when that club, player availability, or stored player data changes.
- Return the main device to the new on-clock club, covered, whenever the live pick advances.
- Give approved companions Slice 2A overall/position/secondary/refit parity under the existing claimed-team and stale-write guards.
- Surface stale/revoked companion write failures instead of silently storing the message off-screen.
- Remove the remaining visible hardcoded player pronouns from the companion risk read.

Independent audit findings fixed:

1. A stale or revoked companion board save updated internal message state but the pinned companion frame never rendered it, producing a silent failure.
2. The controlled MLB team-switch cancellation also fired for the farm room's public-only Club Lens, so merely viewing another public roster could cancel an armed farm pick.
3. A controlled team switch during `ANNOUNCE` cleared the hold timer but left the reducer stuck on `KEEP HOLDING`; the switch now releases the gavel before returning to review.

Final verification:

- Focused privacy/main-page/companion gate: 5 files / 35 tests passed.
- Completed snake, recap, desk, companion, farm, performance, trade, and auction regression gate: passed.
- Final main/farm/companion ritual gate after audit repairs: 4 files / 33 tests passed.
- Production build: passed before the final narrow ritual repair; final post-repair build is part of the checkpoint gate.
- `git diff --check`: clean.

Status: **INDEPENDENTLY APPROVED**. JK browser acceptance remains the sole product gate.

## Slice 1B — final recap and durable handoff

Contract: `spec-docs/contracts/CONTRACT_SNAKE_MOCK_1B_2026-07-12.md`

Built:

- Auto-advance after the non-final recorded-pick beat; no manual next-pick control.
- Final MLB/farm picks stop at `VIEW DRAFT RECAP`.
- Completed saved sessions reopen directly on the recap after reload.
- Shared public recap lists every team and persisted pick with team branding, roster count, salary, tax, and all-in truth; farm omits tax and hidden prospect detail.
- Explicit `CONFIRM MLB DRAFT` and `CONFIRM FARM DRAFT` gates before existing roster commit functions run.
- MLB success routes to Scout Hire; farm success routes to Staff Hire; failure stays retryable and does not navigate.
- Concurrent confirmation is locked to one in-flight commit.
- Missing legacy money values display as unknown, not fabricated `$0`; explicit zero and signed negative tax remain exact.

Independent audit findings fixed:

1. A trade of the next live pick during the recorded beat canceled the auto-advance timer but left the reducer latched in `RECORDED`, creating a permanent dead end.
2. Undefined legacy salary/tax values were reduced into false `$0` totals.

Final verification:

- View/recap/completion gate: 3 files / 25 tests passed.
- Real setup -> room -> non-default gavel integration: 2 tests passed in 7.2 seconds on the independent quiet run. Two prior loaded-machine attempts timed out before entering any 1B code.
- Draft pipeline + zero-row franchise initialization + Living Season schedule affordances: 3 files / 28 tests passed.
- Route/Scout Hire/Franchise Setup gate: 3 files / 37 tests passed.
- Performance/private-desk gate: 2 files / 5 tests passed; 250-player/8-club reveal measured 356 ms.
- Production build: passed after audited fixes.
- `git diff --check`: clean.

Status: **INDEPENDENTLY APPROVED**. The remaining approved board, roster-intelligence, chemistry, team-first, farm-parity, and manifest slices are not claimed complete here.

## Slice 2A — one board, secondary eligibility, all-seat backfill

Contract: `spec-docs/contracts/CONTRACT_SNAKE_MOCK_2A_2026-07-12.md`

Built:

- One persisted overall board with compact position views of the same player universe.
- Primary plus valid secondary-position eligibility in rankings, slots, what-if legality, refit, and backfill.
- Deterministic 22-slot refit after either overall or position reorder, feeding the existing plan cost, tax, cushion, depth, and legal-finish displays.
- Feasibility-preserving assignment that protects scarce catcher and swing-pitcher supply rather than consuming it in a more flexible slot.
- Slot-role-first backfill when a drafted player qualified through a secondary position.
- One hidden all-seat reconciliation pass and one persisted session write after player availability changes; no private board reveal.
- Byte-stable saved rankings during automatic backfill and retained per-seat advisor events for later reveal.

Independent audit findings fixed:

1. The initial display-order greedy refit could falsely break a legal 22-player plan by assigning the only remaining catcher-eligible player to first base before `BACKUP_C`.
2. The same greedy path could consume the only `SP/RP` in a flexible slot before the required `SWING` slot.

Final verification:

- Focused model/private-desk/page gate: 4 files / 27 tests passed.
- Completed snake, recap, farm, performance, and auction regression gate: 7 files / 55 tests passed.
- Production build: passed after the audited assignment fix.
- `git diff --check`: clean.

Status: **INDEPENDENTLY APPROVED**. JK browser acceptance remains the sole product gate and will occur after the complete mock-draft program is assembled.
