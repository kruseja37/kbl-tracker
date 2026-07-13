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

## Final assembly / hostile repo and UI close

The approved slices are now one production path rather than separate demonstrations. Draft Setup
creates the canonical room; the room carries MLB and farm drafts through durable recaps; confirmed
manifests and roster-handoff markers reach staffing and zero-schedule Franchise launch; Living
Season owns later schedule CSV/manual entry.

The hostile close found and repaired:

1. stale, overwrite-prone whole-session writes across picks, trades, corrections, companions, and
   cloud sync;
2. launch paths that trusted completion without exact immutable manifests and roster handoffs;
3. farm privacy leaks or launch omissions involving hidden true value, settled salary, and morale;
4. ranking/plan ambiguity, missing full-pool selection, and incomplete profile/money/fit/chemistry
   consequences;
5. privacy auto-reveal, inaccessible touch/focus states, terminal retry paths, recap correction
   dead ends, and layouts that separated the board from the live decision at iPad width;
6. obsolete POC engine/page ownership, dead routes, unused inputs, debug output, and stale tests;
7. stale stock MLB/FARM assignments that survived recommit and blocked Franchise Setup after a
   real 440+200 draft;
8. MLB and farm first-confirm recap races against background revision writes;
9. ambiguous same-name rows, missing farm prospect search/TOP, stranded Scout Hire errors, and
   narrow-layout overflow; and
10. checksum-only snake launch ownership that could not fail closed on a same-length hash
    collision; ownership now embeds both full canonical immutable manifests.

Final evidence on the assembled diff:

- high-risk recovery gate: 11 files / 89 tests passed;
- complete repository: 674 test files passed, 8 skipped (682 total); 9,955 tests passed, 15 skipped
  (9,970 total), 0 failed;
- TypeScript: clean;
- focused active-path ESLint: clean;
- production build: passed;
- `git diff --check` and static orphan/debug/pronoun crawls: clean;
- automated responsive crawl: no horizontal overflow at 768/1024/1366; 22 board names untruncated;
  live recaps measured 1024/1024 and compact Franchise Setup measured 390/390. The main room remains
  an iPad/desktop surface, while 390px phones use the dedicated covered companion.

An external macOS temporary-directory purge erased the uncommitted worktree during the final
recheck. Recovery used the ten safe branch checkpoints plus the task's retained ordered patch
ledger; all 107 touched files were byte-compared and the high-risk gate was repeated before the
independent audit resumed.

Status: **READY FOR JK BROWSER WALK, NOT PRODUCT-ACCEPTED**. JK's hands-on browser walk is the only
acceptance gate.

## Slice 2E — immutable manifest and franchise launch provenance

Contract: `spec-docs/contracts/CONTRACT_SNAKE_MOCK_2E_2026-07-12.md`

Built:

- Separate backward-compatible MLB and farm manifests frozen before roster commit.
- Strict runtime provenance checks for phase, source session, league/storage season, versions,
  contiguous pick order, unique players, exact teams, active-pool membership, money, and locked
  club identities.
- Full active MLB pool IV snapshot; farm retains no true-IV payload and uses frozen absolute-slot
  salary only.
- Manifest-first recap, roster commit, money, draft-freeze/morale, farm-session creation, and
  franchise initialization.
- Byte-stable confirmation retry and session-mutation immunity.
- Stored MLB+farm franchise provenance with phase-correct MLB/farm archetype identities.
- Zero-row franchise launch with CSV and manual schedule entry preserved inside Living Season.

Independent audit findings fixed:

1. Completed picks could duplicate one absolute pick while omitting another.
2. Locked-club coverage and persisted salary-source relationships were not fully validated.
3. A valid foreign manifest could be attached to another session.
4. Roster and freeze consumers still read mutable completion/phase fields before frozen truth.
5. The initial roster-commit edit placed an MLB settlement cache in the wrong function.
6. An active MLB source-pool member could be frozen without a finite IV.
7. A stale or generic session write could remove or replace an already-persisted manifest.
8. Two simultaneous confirmations could reject forever instead of reusing the first persisted record.
9. Corrupt truthy manifest objects could count as completed drafts.
10. MLB pick salary could disagree with its frozen pool IV.
11. Roster commit did not initially require every frozen pool member in the supplied pool.
12. Farm-session creation copied MLB archetype ids into the farm manifest.

Final verification:

- Independent focused manifest/storage/completion/farm/gauntlet gate: 5 files / 19 tests passed.
- Independent broader snake/companion/performance/auction gate: 42 files / 287 tests passed.
- The formerly hanging real setup-to-room registration integration passed both tests in the broad
  run; the full first-pick ritual completed in 11.2 seconds.
- Production-scale profile remained green: 939 ms reveal, 22 legal-finish calls; guide 432 ms.
- Independent TypeScript, production build, and `git diff --check`: passed.
- Full 8-club gauntlet: 176 MLB picks, 80 farm picks, all 256 morale rows, both immutable
  manifests, copied team-identity parity, and zero schedule rows.

Status: **INDEPENDENTLY APPROVED**. This is engineering-complete and remains browser-pending; JK's walk is the sole acceptance gate.

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

## Slice 2C — money, tax, chemistry, and selected-player truth

Contract: `spec-docs/contracts/CONTRACT_SNAKE_MOCK_2C_2026-07-12.md`

Built:

- Separate real-time drafted-roster and 22-player-plan ledgers with salary, canonical full-roster tax, all-in cost, and money left.
- Public Club Lens drafted ledger and five-family chemistry strip for every club.
- Private plan ledger and five-family chemistry strip sourced from exact 22-slot membership.
- Stable Competitive, Spirited, Crafty, Scholarly, Disciplined counts and potency tiers; unresolved legacy rosters show explicit unknowns.
- Compact inline selected-player card with team logo, positions, age, bats/throws, arm slot, classified player archetype, personality, chemistry, traits, every non-zero rating, arsenal, current tax, true cost, and exact chemistry-family delta.
- Green/yellow/red/unknown team-fit signals using the existing fit thresholds; exact current tax remains a separate number.
- Compact Assistant-GM shape/chemistry row sourced from the canonical roster-need and chemistry models, with explanation behind Help.
- Recorded-pick marginal tax now uses the session-locked archetype identity, matching candidate, plan, and recap truth.
- Canonical legal-finish bill cache shared by public selected-player and private desk consumers.

Independent audit findings fixed:

1. The recorded pick receipt used mutable `Team.capIdentity` while candidate and plan calculations used the frozen session archetype.
2. Missing persisted roster construction could make fit, tax, true cost, chemistry, and legal-finish reads appear exact from a partial roster.
3. The first final-hardening edit declared the legal-finish cache in the farm component, crashing every real MLB room render with `ReferenceError`.
4. The fallback selection path priced the same newly selected player twice, exceeding the production-scale legal-finish call budget.
5. The performance test mixed its direct guide benchmark counter with the page-idle benchmark and could pass or fail by callback timing; the phases now reset explicitly.

Final verification:

- Independent model/card/private-desk/view/real-page/performance gate: 6 files / 49 tests passed.
- Independent recap/completion/farm/companion/desk/auction regression gate: 10 files / 61 tests passed.
- Production-scale reveal: 380 ms, one rational-room calculation, exactly 22 legal-finish calculations.
- Production build: passed on final code.
- `git diff --check`, temporary-trace grep, visible-pronoun grep, and theme review: clean.
- The heavy registration integration still completed its small first test and then produced no output for 60 seconds in a quiet isolated run; it was terminated once. This is recorded as **NOT PASSED**, not treated as a product acceptance gate. The deterministic real page tests above cover the changed seams; JK's browser walk remains the product gate.

Status: **INDEPENDENTLY APPROVED WITH ONE TEST-HARNESS HANG RECORDED**. JK browser acceptance remains the sole product gate.

## Slice 2D — farm board parity under scouting fog

Contract: `spec-docs/contracts/CONTRACT_SNAKE_MOCK_2D_2026-07-12.md`

Built:

- Optional backward-compatible farm seat boards containing prospect ids/order only.
- Per-team scout-conditioned overall and position rankings, including stored secondary/two-way eligibility.
- Deterministic planned farm class, overall/position reorder, and all-seat backfill with rankings byte-stable.
- Team-first covered farm desks with off-clock editing and live-owner-only drafting.
- Separate drafted farm spend and planned frozen-slot obligation ledgers; no invented farm tax.
- Pick-trade refit using frozen absolute slot salaries.
- Legacy in-progress farm sessions seed once; completed sessions do not mutate to create unused boards.

Independent audit findings fixed:

1. Completed farm reload initially seeded private boards before recap/commit, creating an unnecessary post-completion session mutation.
2. The live draft action needed a fail-closed guard until legacy board seeding finished.

Final verification:

- Independent farm board/money/desk/page/completion gate: 5 files / 20 tests passed.
- Independent MLB room/recap/companion/performance/auction regression gate: 7 files / 64 tests passed.
- Production build and `git diff --check`: passed.
- Fog boundary inspection: persisted farm board holds ids/order only; no true grade, rating, IV, or rival scout read is stored or rendered.

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
