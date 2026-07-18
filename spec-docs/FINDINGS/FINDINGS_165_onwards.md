# KBL TRACKER AUDIT FINDINGS — FINDING-165 ONWARDS

**Closure (2026-07-14, code commit `f8ca392d`):** FINDING-165 through
FINDING-185 are fixed and independently verified. The closing proof is 686 passed
test files / 10,227 passed tests / zero failures, 17/17 live Snake browser journeys,
strict changed-file lint, TypeScript, production build, and diff integrity. JK's
browser walk remains the sole product-acceptance gate.

### FINDING-165
**Date:** 2026-07-14 | **Phase:** FARM trade-retirement hostile audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `SnakeDraftRoomView.tsx`, FARM room tests
**Evidence:** FARM correctly removes trade controls and trade execution, but the shared club lens still renders `OWNED, TRADEABLE PICKS` and the correction dialog says the latest pick or trade can be undone.
**Impact:** The FARM room advertises a retired action and misstates correction authority.
**Action:** Render `REMAINING PICKS` and pick-only correction copy for FARM; preserve MLB copy and behavior; add explicit absence assertions.

### FINDING-166
**Date:** 2026-07-14 | **Phase:** FARM no-trade persistence/sync audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `leagueBuilderStorage.ts`, `syncEngine.ts`, FARM persistence and sync tests
**Evidence:** Existing FARM sessions can erase `draftPhase` in a proposed save/sync payload and add `trades` or `openTradeOffers`. Current guards inspect only the proposed phase, so the row can fall back to legacy MLB semantics. Generic local writers and inbound sync share the bypass.
**Impact:** Retired FARM trade state can be forged into authoritative storage, and FARM authority can be silently rewritten as MLB.
**Action:** Preserve phase immutability for every existing session, reject trade state when either current or proposed authority is FARM, and adversarially test phase erasure in local save/update and inbound sync.

**Engine addendum:** `snakeGuideTrade` still searches, revalidates, and executes against a FARM session, while `snakeTradeOffers` accepts FARM proposals/nods/closes. A freeze-input test still canonizes a FARM ownership trade. FARM must be rejected at the engine boundary and offer types/writers narrowed to MLB; the freeze proof must preserve absolute-slot salary truth without treating a FARM trade as valid.

### FINDING-167
**Date:** 2026-07-14 | **Phase:** cross-device Snake truth audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `syncConfig.ts`, `syncEngine.ts`, `SnakeDraftRoom.tsx`, `SnakeCompanion.tsx`, sync/room tests
**Evidence:** Full replacement sync omits `scoutProfiles` and `startupDraftSessions`. Main and FARM rooms pull, then derive player/salary/roster truth from the pre-pull hook snapshot; companion recurring refresh pulls only the session. A second device can therefore calculate from stale salaries, players, or scouts after a successful pull.
**Impact:** Cross-device rooms can display or persist incorrect money, roster, fog, and draft-state truth even while claiming freshness.
**Action:** Include both missing stores in full sync and refresh every authoritative dependency after pull before deriving the room or companion model; add stale-before/fresh-after and replacement tests.

### FINDING-168
**Date:** 2026-07-14 | **Phase:** selected-player transaction audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `SelectedPlayerCard.tsx`, `SnakeDraftRoom.tsx`, focused tests
**Evidence:** Production always supplies `onRevert` as a consequence-dismissal callback. After `KEEP ON MY BOARD`, the visible `REVERT` does not restore the prior board and merely hides the consequence; production does not create the exact undo transaction the label promises.
**Impact:** A destructive board refit exposes a false undo control.
**Action:** Treat the pre-commit dismissal as cancel/hide or remove it; render `REVERT` only for a saved exact prior board with matching private identity and revision. Preserve the preview's real exact undo.

### FINDING-169
**Date:** 2026-07-14 | **Phase:** FARM salary property audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `snakeFarmSlots.ts`, FARM slot tests
**Evidence:** Partial starts now use club-local curves, but pristine 0/10 starts retain the old league-wide curve. With unequal valid carryover budgets, the low-budget club can be assigned more than its own wallet can afford. A two-club $287,500/$787,500 case fails despite each club being solvent against its own 75% target.
**Impact:** A valid pristine FARM draft can be impossible to create after MLB carryover, and retired FARM trades can no longer rebalance the slots.
**Action:** Use club-local 75% curves for every FARM start, including pristine; preserve the 3x first-to-last ratio within each club's turns and test unequal budgets.

### FINDING-170
**Date:** 2026-07-14 | **Phase:** responsive preview trade-truth audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `SnakeResponsivePreview.tsx`, preview tests and journey
**Evidence:** Dynamic guide questions use the real guide, but the room seeds a separate canned open offer, transfers it directly, and hard-codes its receipt. The offer can disagree with the package the same guide produces and was not revalidated by the execution engine.
**Impact:** The preview can execute a package its own strategic tool does not verify, making the user-facing trade proof internally contradictory.
**Action:** Seed from an engine-produced package, revalidate through the real execution path, derive all messages/receipts/totals from that package, and assert the initial offer remains executable.

### FINDING-171
**Date:** 2026-07-14 | **Phase:** iPad responsive re-audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `SnakeDraftRoomView.tsx`, responsive journey
**Evidence:** At 1024x768, selecting and scrolling the Player Pool puts the selected-player action strip at y=-17.5 under the sticky team header. The focused journey failed three consecutive runs.
**Impact:** The primary player identity and action disappear during the exact compare/reorder workflow the landscape layout is meant to support.
**Action:** Give the selected pane a stable sticky offset or scoped scroll below the team header and prove the strip remains visible at both iPad orientations without board-scroll loss.

### FINDING-172
**Date:** 2026-07-14 | **Phase:** responsive preview strategic-signal audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `SnakeResponsivePreview.tsx`, preview tests and journey
**Evidence:** Selected-player trade decisions, Activity copy, and prefill keys are hard-coded to pick 19. After pick 19 records or ownership changes, `TRADE TO #19` and `PICK 19 IS AVAILABLE` can remain visible.
**Impact:** The preview surfaces a dead, orphaned strategic action after its target is no longer available.
**Action:** Derive a current reachable target from live order/ownership and the real guide; hide the signal when none exists; add terminal-state absence proof.

### FINDING-173
**Date:** 2026-07-14 | **Phase:** frozen FARM authority audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `leagueBuilderStorage.ts`, `syncEngine.ts`, FARM persistence and sync tests
**Evidence:** FARM slot geometry is validated only at MLB-to-FARM creation. Later generic, atomic, room, and inbound-sync writers can alter `pickOrder` or `farmSlotSalaries` while preserving the phase and manifest envelope.
**Impact:** The supposedly frozen salary/order table can be rewritten during the draft, changing club charges and turn ownership without a legal transition.
**Action:** Freeze the complete FARM creation envelope after creation—order, salaries, seed, setup, pool, clubs, rounds, tier, balance, workflow, and manifest authority—and reject any later mutation byte-unchanged while permitting only live progress, boards, logs, corrections, pause, and revision fields.

### FINDING-174
**Date:** 2026-07-14 | **Phase:** FARM trade-retirement documentation crawl | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** active Snake salary/certification, vision, program, truth, UI-crawl, status, and continuity docs
**Evidence:** Current production direction removes FARM draft pick trades, but several active Snake documents still promise tradeable FARM slots, exact FARM trade affordability, trade-based absolute-slot proof, and a FARM trade in the closing gauntlet. These are not all archived sources.
**Impact:** Fresh builders and auditors can restore a feature JK explicitly removed or treat retired behavior as a required regression.
**Action:** Amend every active Snake authority and status reference to state that FARM pick trades are retired while MLB draft trades and in-season MLB/FARM player trades remain separate and unchanged. Preserve historical records as historical, with a supersession note rather than rewriting past evidence.

### FINDING-175
**Date:** 2026-07-14 | **Phase:** FARM boundary completion audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** FARM transition/commit/handoff integration tests
**Evidence:** Pure creation, transition persistence, and mocked page tests cover zero and one open FARM slots, while a real-storage commit test covers 8 existing + 2 picks. No real-storage journey proves 9 existing + 1 pick or 10 existing + 0 picks through transition, freeze, atomic commit, handoff, and retry.
**Impact:** The two boundary states most likely to expose zero-length writes, player-assignment damage, missing manifest clubs, or non-idempotent retry remain indirectly rather than end-to-end proven.
**Action:** Add real-storage 9+1 and 10+0 integrations. Existing IDs and assignments must remain byte-identical, zero-pick commit must touch no player row, every locked club must remain in the manifest/handoff, and retry must be idempotent.

### FINDING-176
**Date:** 2026-07-14 | **Phase:** independent narrow-companion privacy crawl | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `SnakeResponsivePreview.tsx`, preview tests and responsive journey
**Evidence:** At `/__preview/snake-responsive?surface=companion` on 430x932, selecting Taylor Utility and pinning `OPTIMIZE AROUND`, then covering and returning, rotates `data-private-epoch` and hides the player while covered but restores Taylor and the prior assistant pin immediately in the new epoch. The preview cover callback only changes `privacy.covered`; private selection and assistant-pin reducer state survive untouched.
**Impact:** The frozen companion test drive teaches and visibly demonstrates weaker privacy than production: a passed-around device can reveal the previous GM's insider choices after a cover epoch.
**Action:** Make preview cover invalidate every private-choice surface for the old epoch—selection, assistant pin/optimization state, board undo/keep state, trade prefill, and other private transient state—while preserving durable team boards. Add the exact 430x932 cover→return regression and re-audit independently.

### FINDING-177
**Date:** 2026-07-14 | **Phase:** post-sync independent correction/recap re-audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `SnakeDraftRoom.completion.test.tsx`, production room sync seam
**Evidence:** After the mandatory pull-before-reread repair stabilized, the completion/correction/recap suite fell from green to 0/11. Its storage/hook harness does not provide IndexedDB and does not mock `syncEngine.pull`, so every test now stops at `THE ROOM COULD NOT OPEN — indexedDB is not defined` before exercising the intended path. FARM no-trade remains 5/5.
**Impact:** The full repository gate is red and correction/recap behavior cannot be independently certified. This is a harness seam failure, not evidence that production should skip its freshness pull.
**Action:** Give the completion harness a discriminating successful sync mock (and failure behavior only if the test owns it), preserving production pull-before-use. Re-run all 11 correction/recap cases and the room/page suites; do not weaken production freshness.

### FINDING-178
**Date:** 2026-07-14 | **Phase:** independent clean-device sync authority audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `syncEngine.ts`, FARM bootstrap sync tests, cycle-neutral canonical FARM validator seam
**Evidence:** An actual IndexedDB `applyPage` reproduction with no local season-1 or season-2 authority accepted and stored a noncanonical season-2 FARM row byte-for-byte. The row used the wrong workflow/engine/seed/tier/order, a $999,999,999 slot salary, and unrelated club/prospect ids. Only season-1 rows are routed through protected atomic validation; a current-null season-2 row reaches the ordinary preflight, where no existing envelope exists to compare, then is written.
**Test addendum:** `syncEngine.dynamicElimination.test.ts` both canonizes the gap by accepting a skeletal orphan season-2 manifest “without invoking the MLB pool invariant” and seeds a FARM tombstone case through a now-illegal generic season-2 save. The focused pair is 1 passed / 1 failed before repair.
**Impact:** A clean or replacement-synced companion can bootstrap from internally inconsistent FARM authority and display or preserve draft order, money, club, and prospect truth that the canonical MLB→FARM transition would never create.
**Action:** Treat season-2 FARM authority as protected. Atomically validate it against the matching completed season-1 manifest+handoff using one cycle-neutral canonical transition contract. If prerequisites arrive later, defer without storing; accept a canonical MLB+FARM pair regardless cloud arrival order; reject or indefinitely quarantine orphan/noncanonical FARM authority. Add real `applyPage` proofs, not only pure invariant calls.

### FINDING-179
**Date:** 2026-07-14 | **Phase:** final full-repository certification | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `SnakeDraftRoom.performance.test.tsx`, `CompanionAuthFlow.test.tsx`
**Evidence:** Both suites mock the hook-owned room/session view but not the direct fresh storage rereads introduced by FINDING-167. Every case now falls into real IndexedDB and stops on `indexedDB is not defined`: 0/2 performance cases and 0/3 companion-auth cases when run alone.
**Impact:** Production-scale call-count and two-origin companion privacy/auth behavior are no longer exercised by the repository gate; the tests fail before their owned assertions.
**Action:** Keep the production pull-plus-fresh-reread contract. Extend each harness with discriminating storage reads backed by its existing fixture/cloud device, then prove all five cases independently and in the full suite.

### FINDING-180
**Date:** 2026-07-14 | **Phase:** final full-repository certification | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `backupRestore.ts`, `leagueBuilderStorage.editorialSchema.test.ts`
**Evidence:** League Builder storage is version 10, while the manual backup/restore schema still declares version 9 and the editorial migration test still asserts version 9. The isolated gates fail 7/10 restore cases and 1/4 editorial cases; restore rejects a live version-10 database instead of restoring it.
**Impact:** Manual backup restore can fail after the current League Builder migration, and the full suite cannot certify the actual database version.
**Action:** Make the backup schema and migration assertion use the current version-10 authority, prove restore/export of the newly synchronized stores, and rerun both suites plus the full gate.

### FINDING-181
**Date:** 2026-07-14 | **Phase:** final full-repository certification | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `FranchiseSetup.test.tsx`
**Evidence:** The League Builder storage mock omits the shared `FARM_SNAKE_SESSION_NUMBER` export. `snakeFarmSlots` therefore re-exports `undefined`; the supposed season-2 FARM read silently defaults back to season 1, and the completed FARM fixture is never read. The isolated badge case is 0/1 even though the mocked MLB row itself validates complete.
**Impact:** The setup-to-franchise badge regression test reports a false product failure and does not prove the required completed MLB-plus-FARM handoff.
**Action:** Restore the shared season-number constant in the test seam and assert the season-2 read so future export drift fails explicitly; do not weaken the production two-leg gate.

### FINDING-182
**Date:** 2026-07-14 | **Phase:** independent final-suite tail audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `backupRestore.ts`, canonical League Builder v10 migration seam, backup migration tests
**Evidence:** Declaring League Builder version 10 in the generic backup schema lets backup export/restore consume a v9→v10 database upgrade by creating store shape only. The stock-closer content correction runs only inside `initLeagueBuilderDatabase`; after the generic opener raises the version to 10, the canonical opener sees no upgrade and never repairs the row. An independent real IndexedDB v9 `wpg-ospeciallo` RP reproduction remains RP after backup-open then canonical-open (0/1; expected CP).
**Impact:** Merely exporting or restoring a current backup can permanently skip a required content migration and leave stock draft truth incorrect while the database advertises the latest version.
**Action:** Make canonical League Builder storage the sole owner of its content-bearing upgrade before backup reads/writes, or share the exact migration in a cycle-safe single authority. Add the adversarial v9→backup-open→canonical-open proof and preserve version-10 seven-store round-trip and fail-closed validation.

### FINDING-183
**Date:** 2026-07-14 | **Phase:** independent Repair-22 lifecycle audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `backupRestore.ts`, canonical League Builder migration/open seam, `backupRestore.elimination.test.ts`
**Evidence:** Repair-22 makes the exact valid-v9 stock-closer adversarial pass in isolation, but the full backup suite deterministically hangs after the helper opens the cached canonical League Builder singleton and never releases that connection. The sixth case times out with `Delete blocked for kbl-league-builder`; later cleanup hooks cascade-timeout. The same case passes alone, proving an order-dependent retained-connection regression rather than a corrected lifecycle.
**Impact:** A backup-owned migration check can retain app storage indefinitely, block database replacement or cleanup, and leave backup/restore behavior dependent on call order even though the content migration itself is correct.
**Action:** Keep one canonical content-migration owner, but give backup a cycle-safe uncached connection that is always closed and never closes or replaces the app-owned singleton. Preserve the exact v9 migration assertion and require the entire backup suite plus adjacent schema/migration matrix to finish cleanly.

### FINDING-184
**Date:** 2026-07-14 | **Phase:** final production-build gate | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** Snake guide-recommendation worker entry/import graph and Vite worker build seam
**Evidence:** The required production build reaches 2,714 transformed modules, then fails at `useSnakeGuideRecommendation.ts` with `Invalid value "iife" for option "worker.format" - UMD and IIFE output formats are not supported for code-splitting builds`. TypeScript and focused worker tests do not exercise the production worker bundle format.
**Impact:** The Snake Draft tree cannot produce a deployable build even though its source and focused tests pass; the assistant guide worker is therefore not shippable.
**Action:** Repair the worker bundle/import seam narrowly, preserve module-worker runtime behavior and privacy validation, add or retain focused hook/worker proof, and require a real production build. Do not make a global build-format change unless the worker graph proves it necessary.

### FINDING-185
**Date:** 2026-07-14 | **Phase:** final strict changed-file lint gate | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `draftPipeline.integration.test.ts`, `13-snake-production-lifecycle.spec.ts`
**Evidence:** The full repository suite, TypeScript, production build, and live browser journey are green, but strict lint rejects the changed tree: one destructured `_lastModified` value is never used, and two browser-seeding calls erase their storage input contracts with explicit `any` assertions.
**Impact:** The final certification is not clean, and the browser lifecycle fixture can drift from real `saveTeam` or `savePlayer` input types without compile-time detection.
**Action:** Remove the unused binding without changing snapshot semantics and bind both browser-seeding objects to the imported storage function parameter types. Re-run the exact integration tests, lifecycle browser journey, strict changed-file lint, TypeScript, build, and diff check.

### FINDING-186
**Date:** 2026-07-14 | **Phase:** JK Snake browser walk | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `useSnakeAssistantBoard.ts`, `SnakeDraftRoom.tsx`
**Evidence:** Changing rankings or pressing Optimize Around could blink and hang because request-key changes wrote React state during render while late worker callbacks could restore superseded results.
**Impact:** A GM could lose control of the private desk and escape only through Undo.
**Action:** Move request lifecycle to ordered effect epochs, ignore stale worker callbacks, clear private state on Cover/null, and prove rapid request churn plus repeated live Optimize clicks settle.

### FINDING-187
**Date:** 2026-07-14 | **Phase:** JK Snake browser walk | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `deskRoomModel.ts`, `useSnakeAssistantBoard.ts`
**Evidence:** Older Snake setup rows without a Snake-specific archetype id fell to Balanced even when the team already had an MLB archetype, producing weak fit and unavailable Assistant GM output.
**Impact:** Player/team fit and the optimized 22 could be misleading or absent for valid teams.
**Action:** Fall back to the team's saved MLB archetype while preserving an explicit Balanced choice; retain fail-closed worker validation.

### FINDING-188
**Date:** 2026-07-14 | **Phase:** JK Snake browser walk | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `SnakeDraftRoom.tsx`, `deskRoomModel.ts`, `RankingsView.tsx`, `BoardView.tsx`, `DeskCandidateRow.tsx`
**Evidence:** Drafted players remained in Player Pool, own picks were treated as gone instead of committed, and the first repair computed an own committed player's marginal tax by adding that player to a roster that already contained the pick.
**Impact:** Boards gave false availability/advice and could display false money truth.
**Action:** Remove every drafted card from Player Pool, retain own picks as COMMITTED, remove/backfill rival picks, and calculate a committed player's current tax contribution against the roster without that player. The independent audit rejected the double-count and approved the repair.

### FINDING-189
**Date:** 2026-07-14 | **Phase:** JK Snake browser walk | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `SnakeDraftRoom.tsx`, `SnakeDraftRoomView.tsx`
**Evidence:** Recent Picks omitted pick numbers and received only the latest eight results.
**Impact:** The commissioner could not reconstruct a complete pick-by-pick draft log.
**Action:** Feed all completed picks and render exact `PICK #N · TEAM SELECTED PLAYER` entries in the expandable log; apply numbered truth to FARM.

### FINDING-190
**Date:** 2026-07-14 | **Phase:** JK Snake browser walk | **Status:** LOCAL FIX VERIFIED — EXTERNAL SERVICE OPEN
**Files:** `CompanionApprovalCard.tsx`, `companionJoinUrl.ts`, `CompanionClaimScreen.tsx`, `CompanionSignInScreen.tsx`, Vite companion-address plugin
**Evidence:** The displayed companion address was stale/manual, Vite was not reliably advertised for LAN use, room codes were not URL-prefilled, and Safari surfaced raw `Load failed`. The configured Supabase hostname does not resolve; the connected account exposes no project.
**Impact:** iPad/iPhone could load a black page or fail login with a false local diagnosis.
**Action:** Bind Vite on all interfaces, discover/publish the actual network origin, include/prefill room code, and map network auth failure to honest UI. Real account login remains blocked until an active Supabase project URL/key exists.

### FINDING-191
**Date:** 2026-07-14 | **Phase:** JK Snake companion walk | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `snakeRoomFreshness.ts`, `companionFreshness.ts`, `SnakeDraftRoom.tsx`, `SnakeCompanion.tsx`
**Evidence:** Main and companion refresh cycles could overlap, reread more storage than the room needed, and mark every visible player `CALCULATING` even when the expensive advice request did not include that player.
**Impact:** Physical companion devices felt laggy and player rows could display a permanent false calculation state.
**Action:** Serialize refreshes, reread only live session truth on the recurring path, preserve semantic snapshot identity, and limit calculation status to player ids actually requested. Focused and full Snake suites plus a live Mac preview show zero false `CALCULATING` rows.

### FINDING-192
**Date:** 2026-07-14 | **Phase:** Snake roster-economy audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `snakeLuxuryTax.ts`, `snakeEconomics.ts`, `snakeAssistantBoard.ts`, `SnakeDraftRoom.tsx`, Snake production-shape tests
**Evidence:** Snake tax paths still normalized rating caps by draft-room team count, even though luxury tax is a property of one team's projected roster. My Board could consequently show zero or different projected tax solely because the room had 2, 8, or 20 clubs.
**Impact:** Team salary, projected tax, true cost, and player fit risk could be wrong for the same 22-player roster.
**Action:** Give Snake one explicit roster-local cap authority, use it for My Board, Assistant GM Board, candidate consequences, setup, seating proof, and rational-room economics, and prove identical results for the same roster at 2/8/20 seats plus a positive-tax production-shaped roster.

### FINDING-193
**Date:** 2026-07-14 | **Phase:** Snake archetype-fit audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `archetypeIdentity.ts`, `archetypeBalanceSimulator.ts`, `SnakeDraftRoom.tsx`, fit tests
**Evidence:** Fit classification did not consistently consume the team's exact `rawShift` identity or role-aware rotation/bullpen need. Nasty Boys could therefore classify high-velocity RP/CP cards below strong fit.
**Impact:** A team's player pool and both 22-player boards could give misleading fit and future-tax warnings.
**Action:** Resolve exact archetype band weights from the saved team identity, apply pitcher-role need to the fit score, and regression-pin a high-velocity relief arm as a Nasty Boys strong fit while preserving one systematic algorithm for every team.

### FINDING-194
**Date:** 2026-07-14 | **Phase:** Assistant GM availability audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `useSnakeAssistantBoard.ts`, `snakeAssistantBoard.ts`, Assistant hook/production tests
**Evidence:** A missing or failed Web Worker made the Assistant GM Board unavailable even though the same deterministic engine was locally callable. The first fallback proposal also omitted the worker path's unpinned baseline proof for ambiguous Optimize Around failures.
**Impact:** Valid teams could lose their optimized 22-player board or remain stuck in a calculation state depending on browser/device worker transport.
**Action:** Run the same validated engine locally when worker transport is absent or fails, perform the same conditional unpinned baseline proof, catch all local failures, and fail closed. Eight distinct private archetype seats now return independent, valid boards through one system.

### FINDING-195
**Date:** 2026-07-14 | **Phase:** Companion pick-authority audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `leagueBuilderStorage.ts`, `SnakeCompanion.tsx`, `CompanionApprovalCard.tsx`, `SnakeDraftRoom.tsx`
**Evidence:** Companion desks had no pick-submission path. A safe implementation required that companion action remain intent only and that Hotseat approval not trust a claim or draft revision that had changed after submission.
**Impact:** GMs had to repeat their choice on the shared device, while a naive direct-pick design could advance the authoritative room from stale private-device state.
**Action:** Add one seat-bound pending request, permit submission only for the approved on-clock MLB seat, and require the Hotseat's atomic pick transaction to revalidate request, player, pick, team, device, claim id, approval status, and exact revision. Decline clears intent only; FARM remains no-trade/no-companion-pick.

### FINDING-196
**Date:** 2026-07-14 | **Phase:** Snake responsive-layout audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `SnakeDraftRoomView.tsx`, `SnakeCompanionFrame.tsx`, `ballpark-kit.css`, responsive tests
**Evidence:** The iPad-oriented nested pane scrollers remained active on fine-pointer Mac/laptop screens, creating a trackpad maze despite enough vertical page space.
**Impact:** Desktop GMs had to hunt through multiple independent scroll areas to compare a profile, board, and roster.
**Action:** Use one document scroll on wide fine-pointer devices while retaining bounded touch panes for iPad. Live 1440x1000 proof has no horizontal overflow and no nested desktop pane scrolling; the iPad contract remains regression-covered.

### FINDING-197
**Date:** 2026-07-14 | **Phase:** no-clock room-control audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `SnakeDraftRoomView.tsx`, `SnakeDraftRoom.tsx`, room view tests
**Evidence:** The room exposed a normal Pause/Resume button despite having no draft clock. Removing it outright would have stranded automatic plan-broken stops and old saved paused sessions.
**Impact:** The normal Pause action was purposeless, while a blanket deletion would make safety-stopped rooms unrecoverable.
**Action:** Remove ordinary Pause from every active room. Render only a contextual `RESUME ROOM` when persisted safety state is actually stopped; keep automatic stop behavior and prove an active room has neither Pause nor Resume.

### FINDING-198
**Date:** 2026-07-14 | **Phase:** independent sync safety audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `SyncModal.tsx`, `useSyncStatus.ts`, `syncEngine.ts`, sync replacement tests
**Evidence:** Full `UPLOAD TO CLOUD` could replace non-empty cloud data without an explicit replacement choice, and the confirmed replacement path deleted cloud rows before upload without retaining a recoverable prior snapshot.
**Impact:** A failed replacement upload could leave the account's cloud state partially erased.
**Action:** Require an explicit confirmed replacement, preflight local reads, snapshot prior cloud store/localStorage rows, keep that snapshot until cloud verification succeeds, and restore it on pre-verification failure. Independent audit and a forced upload-failure test confirm rollback.

### FINDING-199
**Date:** 2026-07-15 | **Phase:** JK Snake tax walkthrough | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `snakeEconomics.ts`, legal-finish tests
**Evidence:** The legal-finish engine constructs the salary-cheapest legal membership first and only then calculates that roster's nonlinear tax. It never searches a slightly more expensive salary completion whose lower tax produces a cheaper all-in 22.
**Impact:** A first-round candidate can be marked `BLOCKED` even though a legal, affordable finish exists in the live pool.
**Action:** Legal finish now searches exact roster membership against all-in salary plus signed tax, canonical legality, version uniqueness, and roster-local caps. A hard `BLOCKED` result is emitted only when the exact search completes without an affordable finish; a bounded production search that cannot finish returns `OPEN`, never a false rejection. Adversarial local-minimum, floating-boundary, and TAXSWING-refund cases are permanent regressions.

### FINDING-200
**Date:** 2026-07-15 | **Phase:** JK Snake fit walkthrough | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `archetypeIdentity.ts`, `deskRoomModel.ts`, `snakeDeskIntelligenceModel.ts`
**Evidence:** `STRONG FIT` consumes only ratings named by the archetype's raw shift plus role need. Ratings in unshifted tax rows do not affect the label, even when the projected 22-player board pays tax for them.
**Impact:** A card can look safely aligned with one archetype lever while quietly creating tax pressure elsewhere.
**Action:** Pool labels now include the worst applicable full-cap pressure across every taxed rating group, including the correct rotation/bullpen treatment for swing arms. Selected-player consequences use exact before/after 22-player tax and downgrade a superficially aligned card when its full roster cost is harmful.

### FINDING-201
**Date:** 2026-07-15 | **Phase:** JK Assistant GM walkthrough | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `snakeDeskIntelligenceModel.ts`, `best22Target.ts`, Assistant GM tests
**Evidence:** Default design output calls the backup catcher slot `BACKUPC`; the canonical board renderer reads `BACKUP_C`. Assistant slot ordering also uses the optimizer's adjusted advice value rather than frozen IV.
**Impact:** A ready 22 can visibly show `BACKUP_C MISSING`, and SP/RP/C depth can display out of objective-value order.
**Action:** The desk boundary normalizes `BACKUPC`/`BACKUP_C`, and equivalent legal depth slots are presentation-sorted by frozen IV across catcher, SP, RP, and same-position starter/flex groups without changing membership, pins, or money. Assistant engine, worker validation, and display all use the same Snake money law, so an affordable sub-cent boundary cannot become `ASST GM UNAVAILABLE`.

### FINDING-202
**Date:** 2026-07-15 | **Phase:** integrated Legends/Snake walkthrough | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `draftProfileModel.ts`, profile-model tests
**Evidence:** The shared profile display always appends a nonempty nickname, even when the imported nickname normalizes to the player's full name.
**Impact:** Cards render redundant names such as `Eric Gagne \"Eric Gagne\"` throughout the draft.
**Action:** The shared profile model suppresses only a normalized full-name duplicate at display time; stored records and real distinct nicknames are preserved.

### FINDING-203
**Date:** 2026-07-15 | **Phase:** JK Snake navigation walkthrough | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `SnakeDraftRoom.tsx`, `SnakeDraftRoomView.tsx`, room-view tests
**Evidence:** The shared room header has Help, sound, correction, trade, and companion controls but no route back to app home.
**Impact:** The user can enter the draft room but cannot leave it through the visible interface.
**Action:** The shared header exposes the established compact Super Mega Baseball mark as a 44px home control wired by the route-owning page.

### FINDING-204
**Date:** 2026-07-15 | **Phase:** unified draft setup walkthrough | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `LeagueBuilderDraftSetup.tsx`, `SnakeDraftSetupAdapter.tsx`, unified setup tests
**Evidence:** Draft method can only be changed outside Draft Setup. The Snake branch then bypasses the Auction branch's source-league and club-archetype controls even though both methods consume the same pool and saved teams. Snake exposes a local version picker and manual shuttle, but the user must leave and re-enter setup to assemble the complete input state.
**Impact:** A user can build the right player universe or club identities in one method and still have no direct, visible way to finish the same setup for Snake. The backtracking makes shared data look disconnected and invites stale or missing archetype inputs.
**Action:** Draft Setup now saves AUCTION/SNAKE in place and shares source leagues, the unrestricted manual player shuttle, grouped Career/Peak/Draft versions, and canonical MLB/farm `ArchetypePicker` controls. Pool lock freezes method and shared inputs. Unlock restores only versions retired by the current lock, so a later explicit GM removal is never resurrected across repeated lock/unlock cycles.

### FINDING-205
**Date:** 2026-07-15 | **Phase:** independent Snake money-law audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `snakeMoney.ts`, `snakeSeatingProof.ts`, `snakeAssistantBoard.ts`, `snakeRationalRoom.ts`, main/companion desk and setup validators
**Evidence:** Independent adversarial cases found multiple affordability seams using stricter `0` or `1e-9` comparisons than the canonical nonlinear settlement tolerance. The drift could falsely block a signed tax-refund finish, hide a rational candidate, reject setup board seeding, label an Assistant board unavailable, or show companion-only `$0 over budget` copy.
**Impact:** Identical legal money truth could disagree across seating, Assistant GM, strategy, setup, main, and companion surfaces.
**Action:** A cycle-free `snakeMoney` module now owns the shared `1e-6` affordability law, signed overage, and harmless residual normalization. Every Snake affordability gate and verifier consumes it; main and companion share one over-budget copy helper. Exact `-5e-7`/`+5e-7` boundaries and signed TAXSWING refunds are regression-covered. Final independent audit: APPROVE, zero blocker/major/minor findings.

### FINDING-206
**Date:** 2026-07-15 | **Phase:** Legends draft-source walkthrough | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `historicalLegendsLibraries.ts`, `historicalLegendsLibraryProvisioner.ts`, `historicalLegendsImport.ts`, `LeagueBuilderDraftSetup.tsx`, `LeagueBuilderLeagues.tsx`
**Evidence:** Historical Legends existed as hundreds of unassigned version cards. Draft Setup could distinguish versions card by card but could not select a complete Career, Draft, or Peak cohort as a source.
**Impact:** Building a historical draft pool required meticulous one-player-at-a-time work and made the original roster groupings unusable.
**Action:** Import now provisions read-only Career/Draft/Peak source libraries. The original 242 identities occupy the same eleven deterministic 22-player cohorts in every version; later additions stay selectable free agents in their matching library. Draft Setup can combine libraries, unassigned players, and manual add/remove without making source shelves playable leagues. Reimport is operationally idempotent.

### FINDING-207
**Date:** 2026-07-15 | **Phase:** personality pipeline audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `leaguePoolAxisRegen.ts`, `leaguePoolAxisRegenPersist.ts`, `historicalLegendsImport.ts`, draft-pool registration paths
**Evidence:** Draft registration had no explicit Legend/non-Legend personality contract. Re-randomizing a Legend would erase authored identity; leaving ordinary imports untouched would prevent the approved draft-specific personality initialization.
**Impact:** Living Season personality truth could be inconsistent across card versions, drafts, reloads, or player sources.
**Action:** Legends keep authored visible personality and person-level curated hidden modifiers; missing hidden truth gets one stable person-seeded fallback shared by all versions. Other non-Legends without draft initialization receive a seeded visible personality and hidden-modifier set once. Custom visible choices and already-complete FARM prospects are preserved. Hidden modifier values never enter Snake UI, workers, logs, recaps, or manifests.

### FINDING-208
**Date:** 2026-07-15 | **Phase:** Snake draft-to-season morale audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `draftFreezeInputs.ts`, `draftFreeze.ts`, `SnakeDraftRoom.tsx`, `snakeDraftManifest.ts`, `franchiseInitializer.ts`
**Evidence:** Snake players inherited auction-oriented draft morale assumptions even though Snake salary is set rather than bid. The first FARM repair ranked only drafted prospects and franchise launch could recompute from mutable state instead of the completed room truth.
**Impact:** MLB/FARM player morale could respond to a nonexistent bid-price signal, misread draft expectations, or change between recap and Living Season launch.
**Action:** Both Snake phases classify actual overall pick against frozen full-source-pool talent rank, keep pay neutral, then freeze only the final personality-scaled player outcome. FARM expectation uses the complete frozen 3× prospect pool. Franchise initialization consumes the signed result idempotently.

### FINDING-209
**Date:** 2026-07-15 | **Phase:** Snake fan-morale design/wiring audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `snakeDraftAlignment.ts`, `SnakeDraftRoom.tsx`, `SnakeCompanion.tsx`, `draftFreeze.ts`, `franchiseInitializer.ts`
**Evidence:** Auction fan morale is spend-based, but Snake has no comparable bidding signal and exposed no cumulative room-relative team-archetype draft grade.
**Impact:** Snake clubs received no draft-specific fan consequence and GMs could not see whether their drafted roster was aligning with the club identity relative to the room.
**Action:** One shared role-aware fit law averages every club's completed picks, grades Strong/Solid/Weak, competition-ranks ties identically, and maps best-to-worst alignment onto a bounded fan-morale curve. Main and companion show only the selected club's private grade/rank; the final public outcome is frozen for franchise launch.

### FINDING-210
**Date:** 2026-07-15 | **Phase:** independent FARM fog audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `SnakeDraftRoom.tsx`, `draftFreezeInputs.ts`, `snakeDraftManifest.ts`, `leagueBuilderStorage.ts`
**Evidence:** The first correct full-pool FARM expectation repair serialized an exact `prospectId → true talent rank` map for every prospect in the immutable manifest.
**Impact:** A draft artifact exposed the hidden ordering that FARM scouting fog is designed to protect.
**Action:** Completion still calculates against the frozen full 3× pool, but the FARM manifest stores only drafted-player `slotClass` and final morale outputs. FARM validation rejects any nonempty talent-rank map. Independent delta audit: **APPROVE**, no residual findings.

### FINDING-211
**Date:** 2026-07-15 | **Phase:** Snake pitcher-hitting identity independent audit | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED
**Files:** `archetypeIdentity.ts`, `auctionMarketModel.ts`, `archetypeIdentity.test.ts`, `snakeAssistantBoard.test.ts`
**Evidence:** The first role-specific identity adapter returned `null` both when an identity was absent and when a real identity had no axis applicable to the player's role. The downstream value engine interprets `null` as permission to use its legacy generic-band fit, so a Flamethrowers RP/CP could inherit a Rotation reward or penalty even though that identity changes rotation axes only.
**Impact:** My Board, Companion, Assistant GM, and Rational Room could contradict the exact tax/archetype contract for role-neutral relievers.
**Action:** Preserve `null` only for a missing exact identity; return exact neutral `1` when an identity exists but has no role-applicable axis. Unit coverage carries the neutral value through the downstream factor engine, and a production Assistant regression proves contradictory generic Rotation/Bullpen weights cannot change Flamethrowers reliever ordering or roster membership. Independent delta re-audit: **APPROVE**, no residual finding.

### FINDING-212
**Date:** 2026-07-15 | **Phase:** Snake pitcher-hitting identity close | **Status:** CONFIRMED-OPEN (PRE-EXISTING)
**Files:** `vite.config.ts`, `src/src_figma/app/components/snake/desk/useSnakeRationalRisks.ts`
**Evidence:** A clean `env -u NODE_ENV npm run build` typechecks and transforms 2,726 modules, then Vite/PWA rejects the default `worker.format = iife` because the rational-room worker graph uses code splitting. The failing file and Vite config have no diff between the pre-batch parent `7bf1b6fc` and the independently approved identity commit `9e5901d7`.
**Impact:** Production packaging is red on this branch even though the revised identity engine's focused tests, TypeScript, and changed-file lint are green. The dev server and browser walk are not blocked by this packaging failure.
**Action:** Give worker packaging its own bounded build-plumbing repair and independent audit; do not entangle it with the approved archetype/tax behavior change.

### FINDING-214
**Date:** 2026-07-16 | **Phase:** JK Draft Setup browser gate | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED — JK BROWSER RE-WALK OPEN
**Files:** `LeagueBuilderDraftSetup.tsx:4063-4074`, `LeagueBuilderDraftSetup.tsx:4608-4749`, `LeagueBuilderDraftSetup.tsx:5650-5662`
**Evidence:** Snake's Edit Profile control sets shared edit state, but the Snake render returns before the edit modal, which exists only inside Auction's later return.
**Impact:** The visible control deterministically does nothing in Snake Draft Setup.
**Action:** Mount the canonical editor in Snake's return and regression-test open, save, refresh, and lock behavior without changing Auction semantics.
**Builder evidence:** Shared modal rendered in both format returns; the Snake save/refresh/locked-state component regressions are green. The repaired-tree behavioral matrix passes 187/187. Independent re-audit remains pending.

### FINDING-215
**Date:** 2026-07-16 | **Phase:** JK Draft Setup browser gate | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED — JK BROWSER RE-WALK OPEN
**Files:** `poolFromDemand.ts:5-18`, `poolFromDemand.ts:2046-2055`, `LeagueBuilderDraftSetup.tsx`
**Evidence:** Sizing mode computes the selected-archetype extraction but uses it only as verdict/fit input; its identity claims are not protected in shaped membership.
**Impact:** A chosen club identity can become gray after the app builds a nominally Competitive pool, contradicting the pool guarantee and hiding the actual missing role/axis from the user.
**Action:** Treat selected identities as hard pool constraints, preserve their minimum claims, run the exact all-club proof, grow above the nominal target when needed, and expose a specific one-line source blocker plus one recovery action when the source is impossible.
**Builder evidence:** Snake shaping preserves chosen-identity claims, and one BUILD auto-widens through larger presets and then the full selected source while persisting the actual result. SUCCESS requires a disjoint unique-person chosen-identity certificate plus legal 22, exact Snake money, canonical value floor, and strict positive embodiment; bounded identity-search exhaustion after ordinary legal proof is UNKNOWN, not a fabricated shortfall. Manual changes invalidate the receipt and recompute proof; confirmed source failures name the baseball role/axis. Auction keeps the shared extractor's legacy default. Independent re-audit remains pending.
**Second-audit repair evidence:** Full Sources now removes every restored hard keep from the actual and persisted removal ledger, so removals `b,c` plus hard keep `c` yield pool `a,c` and only persisted removal `b`. UNKNOWN copy keys off persisted `poolAssemblyMode`, remaining correct after reload and after a receipt-clearing manual edit. Independent re-audit remains pending.

### FINDING-216
**Date:** 2026-07-16 | **Phase:** JK Draft Setup browser gate | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED — JK BROWSER RE-WALK OPEN
**Files:** `SnakeDraftSetupAdapter.helpers.ts:172-216`, `SnakeDraftSetupAdapter.helpers.ts:260-305`, `deskModel.ts:103-159`
**Evidence:** The setup adapter drops secondary positions, roster shape, source ID, and version group when materializing board candidates, then can reject the exact assignment certificate and append its success message to a failure.
**Impact:** The user sees the contradictory `Could not seed ...: EVERY CLUB CAN FINISH A LEGAL 22` error and cannot distinguish a product invariant defect from an insufficient pool.
**Action:** Preserve canonical eligibility/shape/version fields, seed consistently from the certificate, and make the defensive invariant failure honest and slot-specific.
**Builder evidence:** Board candidates retain secondary/two-way coverage, roster shape, source, and version group. Assistant recommendations retain sibling alternatives, while the roster search keeps cross-position sibling edges and reserves one person in the final 22. The repaired-tree Assistant engine/hook tests pass 36/36 and the seating-proof tests pass 14/14. Independent re-audit remains pending.
**Second-audit repair evidence:** The unweighted sibling representative pass is removed. All cards enter the weighted optimizer under an exact one-capacity version-group assignment; the padded A/B/C alternating cycle produces the 293 optimum rather than the legal 198 collapse. Assistant passes 21/21, while default Best 22 and archetype callers remain green. Independent re-audit remains pending.
**Third-audit repair evidence:** The additive assignment is now only a deterministic seed. A separately bounded arbitrary-length simple-cycle pass evaluates actual full-roster legality, exact nonlinear tax, value floor, and fit across all relevant unpinned occupied groups, including singleton intermediaries. Exhausted neighborhoods may report complete; a node, candidate, or improvement-pass cap reports incomplete and Assistant fails closed with `INCOMPLETE_BOARD`. Nonlinear two-cycle and four-cycle regressions are green. Callers without exclusive grouping again use the literal frozen `rosterFitScore(players)` comparison, with nonzero preference/rank omitted-option parity pinned. Independent re-audit remains pending.
**Fourth-audit repair evidence:** Completion now ANDs every executed value/fit baseline start and both identity starts instead of inheriting only the winning board's flag. Real Assistant regressions cover a capped secondary baseline start and a capped unselected identity start; both fail closed with `INCOMPLETE_BOARD`. Independent re-audit remains pending.

### FINDING-217
**Date:** 2026-07-16 | **Phase:** JK Draft Setup browser gate | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED — JK BROWSER RE-WALK OPEN
**Files:** `SnakeDraftSetupAdapter.tsx:69-89`, `deskModel.ts:173-247`, `SNAKE_DRAFT_VISION_2026-07-10.md:141-160`
**Evidence:** Setup forces one version before lock although the ratified design allows all selected versions and retires siblings on the first pick; board matching reserves card IDs but not human/version groups during search.
**Impact:** Users must hand-curate hundreds of cards before entry, and enabling the intended all-version room can false-fail or double-count a person.
**Action:** Lock all manually retained cards, count unique people in every proof/plan, make matching version-group-aware, and retain the existing first-pick retirement plus correction restoration law.
**Builder evidence:** New sessions carry all remaining cards with an empty setup-selection map; matching and Assistant plans reserve version groups. Setup is compact, unsaved legacy one-card locks restore/reprice/reprove/relock before Ready, saved sessions retain their frozen path, and the neutral pick ticker disappears on undo with the restored sibling snapshot. Independent re-audit remains pending.
**Third-audit repair evidence:** Version-group optimization no longer treats an additive assignment as proof of the nonlinear 22-player objective. Deterministic arbitrary-length cycle search either exhausts its declared neighborhood or marks the result incomplete; incomplete Assistant boards are never exposed as ready. Independent re-audit remains pending.
**Fourth-audit repair evidence:** An incomplete executed search start now propagates even when a different completed roster wins selection. Assistant cannot present READY by discarding the cap state of an unselected baseline or identity start. Independent re-audit remains pending.

**Final independent evidence:** The non-builder auditor returned **APPROVE** with zero actionable findings. Its 48/48 narrow tests and diff-integrity check independently verified completion aggregation, Assistant fail-closed behavior, and absence of diagnostic/test-only production seams. JK's browser re-walk remains the sole product-acceptance gate.

### FINDING-218
**Date:** 2026-07-16 | **Phase:** JK Draft Setup browser re-walk | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED — JK BROWSER RE-WALK OPEN
**Files:** `LeagueBuilderDraftSetup.tsx`, `LeagueBuilderDraftSetup.setup.test.tsx`
**Evidence:** An identity-card pick persists the changed team and applies it through `replaceTeamsLocal`, then falls through the generic action wrapper's default full league-data and registered-pool refreshes. Neither refresh can change the just-saved identity or the unchanged pool.
**Impact:** Selecting an MLB or farm archetype looks and feels like a page reload, restarting setup-derived work and leaving the screen unresponsive on a real Legends-sized setup.
**Action:** Keep the durable save and immediate local state replacement, but opt identity picks out of both redundant refreshes. A regression asserts the persisted local update occurs while neither full setup-data nor pool loading runs.
**Independent evidence:** A separate non-builder auditor returned APPROVE with zero findings after verifying the identity save/local replacement remain durable and neither full data nor pool refresh is needed for team metadata.

### FINDING-219
**Date:** 2026-07-16 | **Phase:** JK Draft Setup browser re-walk | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED — JK BROWSER RE-WALK OPEN
**Files:** `LeagueBuilderDraftSetup.tsx`, `LeagueBuilderDraftSetup.setup.test.tsx`
**Evidence:** The browser gate reproduced a newly created league briefly rendering `Select a league first`, followed by a long unresponsive tab. The preview commit resolved `activeLeagueId` only in a post-render effect and also introduced an automatic first-pool effect that invoked the full BUILD path on mount. That path can synchronously shape and certify Competitive, wider presets, and Full Sources across a Legends-sized universe before any user action.
**Impact:** The durable league appears missing during the handoff, then the browser main thread stalls while hidden pool optimization runs. The league eventually reappears, making the failure look intermittent even though the mount path is deterministic.
**Action:** Resolve the requested league synchronously from the loaded route/data, and never run the expensive multi-candidate BUILD transaction implicitly on mount. BUILD remains an explicit user action with its existing identity/legal/money guarantees. Regressions pin both the no-false-empty handoff and the no-auto-build mount contract.
**Independent evidence:** A separate non-builder auditor returned APPROVE with zero findings. It verified the removed effect was the only implicit BUILD caller, the visible BUILD transaction remains wired and covered, and the route/no-auto regressions plus TypeScript and diff checks pass.

### FINDING-220
**Date:** 2026-07-16 | **Phase:** Snake Draft browser walkthrough wave 2 | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED — JK BROWSER RE-WALK OPEN
**Files:** `deskModel.ts`, `snakeAssistantBoard.ts`, main/companion board call sites
**Evidence:** My Board gives CP a dedicated slot, while the Assistant's RP scope also admits CP. Neither path consistently reserves the highest-IV committed closer for CP or prevents an available second closer from entering a completed plan after a closer is already owned.
**Impact:** A drafted closer can remain outside CP, a lower-value closer can own CP, or a recommendation can spend a scarce roster slot on an unnecessary second closer.
**Action:** Make committed roster truth the first constraint on both boards: highest-IV owned CP occupies CP, additional owned CPs remain legal committed depth, and no available extra CP enters either 22 unless the GM explicitly optimizes around that player.
**Independent evidence:** The first read-only audit found one persisted-board bypass; repair `8a2602eb` routes complete but incorrectly assigned boards through the same canonical refit. The same auditor then returned APPROVE with zero findings after 40/40 desk tests, the exact Assistant closer test, and diff-integrity proof.

### FINDING-221
**Date:** 2026-07-16 | **Phase:** Snake Draft browser walkthrough wave 2 | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED — JK BROWSER RE-WALK OPEN
**Files:** `DeskCandidateRow.tsx`, `BoardView.tsx`, `PrivateDesk.tsx`
**Evidence:** The data model distinguishes a player's own roster from another club's drafted player, but the board row does not use the active club's branding and drafted state is easy to miss among undrafted board entries.
**Impact:** GMs cannot scan their 22 and immediately separate committed roster from future targets.
**Action:** Keep own drafted players locked in both private 22s with team color plus an explicit `ROSTER` label; remove rival-drafted players from actionable boards and the Player Pool while retaining the public activity record.
**Independent evidence:** The separate auditor verified main/companion active-team ownership, `ROSTER` treatment, team-color wiring, and rival removal. Combined main/companion proof passes 45/45.

### FINDING-222
**Date:** 2026-07-16 | **Phase:** Snake Draft browser walkthrough wave 2 | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED — JK BROWSER RE-WALK OPEN
**Files:** `DeskCandidateRow.tsx`, `BoardView.tsx`, `useSnakeRationalRisks.ts`
**Evidence:** Each candidate row repeats `RISK UNAVAILABLE` when the optional risk worker cannot certify an answer, even though unavailable risk is not a player property or an actionable decision.
**Impact:** A room-level telemetry state becomes dozens of false player warnings and crowds out useful board information.
**Action:** Show only actionable row risk (`AT RISK` or `LIKELY GONE`). Collapse unavailable risk into one compact board-level state with details behind Help; keep the internal fail-closed reason.
**Independent evidence:** The separate auditor verified row lifecycle noise is absent while compact board-level unavailable state remains covered. Lifecycle and responsive-preview proof passes 36/36.

### FINDING-223
**Date:** 2026-07-16 | **Phase:** Snake Draft browser walkthrough wave 2 | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED — JK BROWSER RE-WALK OPEN
**Files:** `RankingsView.tsx`, desk candidate model and tests
**Evidence:** Position and Overall views support manual rank changes and search, but the remaining pool cannot be filtered by fit or viewed by IV, marginal tax, true cost, or a specific rating. In Snake, frozen IV is the salary, making separate IV and Salary sorts redundant.
**Impact:** GMs must visually hunt for the strongest available match and cannot compare the immediate team-specific financial effect of taking a player now.
**Action:** Add view-only Fit, IV, `TAX IF PICKED`, `TRUE COST`, and rating sorts plus Strong/Solid/Weak filtering. Do not add Salary. Sorting/filtering must be local memoized view state with no engine, persistence, worker, or board recalculation. `TOP` must still persist the chosen player to the top of the current Overall or position board.
**Independent evidence:** The separate auditor verified memoized child-local sorting, no Salary option, signed active-team tax and true cost, and no persistence/engine/worker call before `TOP`. Live Mac/iPad probes measured sorts at 38-61 ms and fit filters at 22-83 ms with no console error.

### FINDING-224
**Date:** 2026-07-16 | **Phase:** Snake Draft browser walkthrough wave 2 | **Status:** FIXED-AND-INDEPENDENTLY-VERIFIED — JK BROWSER RE-WALK OPEN
**Files:** `PrivateDesk.tsx`, `BoardView.tsx`, `SelectedPlayerCard.tsx`
**Evidence:** The live desk still exposes implementation copy (`ARCHETYPE FIRST`, `>=90% FROZEN IV`), a large plan-unavailable panel, and a dead selected-player placeholder.
**Impact:** Methodology and non-actions compete with the live GM decisions the page exists to support.
**Action:** Reduce the visible Assistant title to `ASST GM 22`, remove the dead placeholder, keep only compact state/consequence copy, and move methodology or diagnostic explanation behind Help.
**Independent evidence:** The separate auditor verified the visible title and removal of the selected-card, plan-truth, and board-consequence placeholders. Methodology remains available through Help.

### FINDING-225
**Date:** 2026-07-17 | **Phase:** Snake Draft browser walkthrough correctness follow-up | **Status:** IMPLEMENTED — INDEPENDENTLY VERIFIED; JK BROWSER GATE PENDING
**Files:** `src/src_figma/app/components/snake/desk/deskRoomModel.ts`, `src/engines/archetypeIdentity.ts`, `src/engines/snakeLuxuryTax.ts`
**Evidence:** JK's 440-player browser walk produced only two or three STRONG FIT players and roughly 85% WEAK FIT. The live `fitWord` path first classifies the exact archetype multiplier at `>= 1.04` / `<= 0.96`, then can replace that identity result with WEAK FIT solely because `snakePlayerTaxPressure` crosses an absolute/price-relative threshold. Tax If Picked and True Cost are already separate visible decision fields. The characterized desk test explicitly requires a one-lever archetype fit to render WEAK when an unshifted row creates tax pressure, confirming this is live intended code behavior rather than a stale path. A real-data Vitest diagnostic seeded the canonical 20-team/440-player SMB4 roster and exhausted all 24 archetypes across Juiced, Standard, and Nerfed. At Standard, the displayed label marks 304-366 of 440 players WEAK (69.1%-83.2%) and only 2-28 STRONG (0.5%-6.4%). The identity-only result on the same exact cards is 11-196 WEAK (2.5%-44.5%) and 18-164 STRONG (4.1%-37.3%). For Flamethrowers at Standard, 15 of 18 identity-strong and 155 of 226 identity-solid cards are overwritten to WEAK, leaving the exact reported two STRONG cards.
**Impact:** FIT does not answer the label's user-facing question. A player can match the selected team identity yet render as a weak fit because the card is expensive under the tax table, saturating the board with misleading red labels and making archetype-first team building guesswork.
**Action:** Keep FIT identity-only at the already-shared `>= 1.04` / `<= 0.96` thresholds and leave tax consequences in the existing Tax If Picked and True Cost fields. Pin the semantic separation plus the canonical 440-player distribution bounds with regressions. Do not retune the 24 archetypes to compensate for the mislabeled tax overlay.
**Resolution evidence:** `fitWord` now reports only the shared exact archetype multiplier at the
existing thresholds; no archetype, tax, IV, or salary math changed. The permanent real-data
regression seeds exactly the 440 assigned SMB4 players and checks all 24 archetypes at Juiced,
Standard, and Nerfed. Every displayed label equals its raw identity label, every archetype has at
least 10 STRONG cards, and none has 50% WEAK cards. Desk, engine, exact-data, TypeScript, lint,
production-build, and diff-integrity gates passed. A separate non-builder auditor returned APPROVE
with zero Major and zero Minor findings. JK's real browser walk remains the acceptance gate.

### FINDING-226
**Date:** 2026-07-17 | **Phase:** Snake Draft browser walkthrough correctness follow-up | **Status:** IMPLEMENTED — INDEPENDENTLY VERIFIED; COMBINED PREVIEW/JK GATES PENDING
**Files:** `src/engines/poolFromDemand.ts`, `src/engines/snakeEarlyDraftSeating.ts`, `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx`
**Evidence:** JK reports that a four-team archetype selection over the 440-player SMB base can leave a chosen identity grayed out and that LOOSE, despite its 50%-surplus target, can still fail the legal/archetype finish gate. Existing production-shape coverage proves one fixed eight-archetype set and deliberately treats count presets as guides rather than universal readiness guarantees; it does not exhaust all 24 identities or all selected-team combinations. A first real-data stress repeated each of the 24 identities across four clubs. Competitive, Loose, and Full Sources all produced a simultaneous legal/solvent finish with no LOCKED verdict. However, Competitive's 119-card guide expanded to 177-182 cards and Loose's 132-card guide expanded to 185-190 because selected-identity claims are hard-kept. The run emitted all 72 scenario verdicts but crossed its 300-second harness timeout after the final result. The checked-in eight-club production-shape test also seeds and proves all 506 SMB4 records, while JK's selected stock-team source contains exactly 440 assigned players and excludes the 66 unassigned free agents. Re-running that exact eight-identity room against the selected 440 produces simultaneous legal/solvent finishes with no LOCKED identities, but Competitive expands from its 238-card guide to 336 and Loose from 264 to 344. Full Sources is 440. The current branch therefore avoids the old lock by retaining 72%-76% of Full Sources and overshooting the named curves by 80-98 players, not by building a sufficient pool near the requested competition level. The live cause is explicit: Snake callers set `preserveSelectedIdentityClaims`; `extractPoolFromDemand` turns every `extractDraftPool` identity seed id and every structural-floor id into `protectedIds`, inserts every floor player before numeric shaping, and permits those protected classes to exceed the target. `extractDraftPool` independently builds one best 22 for every selected identity plus oversupplied structural/cheap-depth floors, even though those independent rosters are neither disjoint nor the final simultaneous club assignment.
**Impact:** A target-sized shaped pool can appear generous while omitting the role-specific identity depth needed by the selected clubs; after the prior repair, the opposite failure is also possible—the preset silently grows by roughly 40%-50% beyond its guide. Existing green proof can mask the browser source selection by relying on 66 cards the user did not include.
**Additional diagnostic:** The Full Sources simultaneous proof for the checked-in eight-club room returns exactly 176 disjoint support players. Feeding only those certificate ids as protected input, instead of every independent identity seed and structural floor, reduces Competitive from 336 to 257 while preserving no LOCKED identity and the exact simultaneous legal/solvent finish. Loose reduces from 344 to 274 with the same guarantees. The 19-card Competitive and 10-card Loose overages are added by the separate post-shape position-supply floor; they are not part of the 176-player proof certificate.
**Floor and receipt trace:** The extra floor is intentional anti-hoarding depth, not redundant legality: for eight teams it requires the legal per-team minimum plus three spare bodies in every field-position, catcher-depth, starter, closer, and reliever class. A diagnostic pre-seeded the seven extra cards needed to make the 176-player identity certificate satisfy every competitive position floor before numeric fill. The final Competitive/Loose pools still became 260/276. Receipt fields prove the growth did not come from downstream repair: G1 held at round 0; G1 additions/swaps were 0; sizing injected ids were 0; every position floor had zero missing. Only 183 ids were protected, leaving 55/81 open slots inside the 238/264 targets, yet the numeric shaper itself returned 22/12 excess cards and emitted the inaccurate generic claim that every excess card was protected by asks/identity/floors/hand-picks. This is an independent target-enforcement/reporting defect inside numeric shaping.
**Action:** Replace all-claim preservation with a sufficient, disjoint identity-support selection plus the existing anti-hoarding position-floor support, then make numeric shaping enforce its target whenever protected ids do not exceed it. Preserve grade/role quotas as preferences with explicit shortfalls, not additive permission to exceed the preset. The existing final simultaneous roster proof remains authoritative; do not weaken identity, legality, solvency, version-group, 22-slot, or position-slack laws. If the selected target truly cannot be met, widen explicitly to the smallest preset/proven size and report the actual mode plus actionable role/stat deficits behind Draft Setup Help. Add real 440-player coverage so unselected free agents cannot mask the contract.
**Resolution evidence:** Shaped Snake BUILD now proves the exact selected Full Sources membership,
protects only its disjoint assignment certificate plus the existing anti-hoarding position floor,
and accepts a candidate only when its final proof passes inside the named preset's actual bound.
Unprotected quota overfill is trimmed deterministically; protected excess and remaining preference
shortfalls are reported honestly. The exact 440-player eight-club regression returns certified pools
of exactly 238 Competitive and 264 Loose, preserves all 176 certificate players, and reports no
LOCKED club. Auto-widen tries only wider named presets and persists the accepted actual preset;
Full Sources is the honest last fallback. RESET EDITS clears hand edits, retains that persisted
preset, and rebuilds through the same Full Sources certificate and final proof path. The first
independent audit exposed a reset-path bypass and an injection-receipt omission; both were repaired.
A production-state-honest reset regression then exposed and clarified the persisted-preset contract.
The final separate re-audit returned APPROVE with zero Major and zero Minor findings. Proof
scheduling, search law, workers, caching, refresh, cancellation, and latency behavior were not
changed; those remain the separate performance lane. JK's real browser walk remains the acceptance
gate.

### FINDING-227
**Date:** 2026-07-17 | **Phase:** Snake Draft Setup performance follow-up | **Status:** IMPLEMENTED — INDEPENDENTLY VERIFIED; JK BROWSER GATE PENDING
**Files:** `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx`, Snake setup proof transport
**Evidence:** Adapter, BUILD, Reset, and legacy restore evaluated the expensive seating proof on the
browser thread; successful pool writes then broadly refreshed League Builder data. Full Sources could
therefore freeze the tab before its busy state painted.
**Action:** Contract `SNAKE-DRAFT-SETUP-PERFORMANCE-35` moves production proof to one cancellable,
fingerprinted ES-module worker client with in-flight/resolved reuse, stale rejection, fail-closed
transport, no duplicate Snake legacy diagnostic, and narrow local membership patches.
**Builder evidence:** Combined gates pass 109/109 UI/runtime, 95/95 surrounding engine, exact
production-stock calibration 4/4, TypeScript, changed-file ESLint, a 2,730-module production build
with the proof worker emitted, and diff integrity. Earlier production Mac/iPad probes stayed
responsive through the roughly 19-second Full Sources proof. Practice restart now obtains its fresh
empty-room certificate through the same worker before rebuilding boards.
**Independent evidence:** A separate non-builder auditor returned **APPROVE — Major 0 / Minor 0** on
the exact combined integration. It passed 134 focused tests, TypeScript, combined changed-file ESLint,
the 2,730-module production build with proof worker, and both diff checks; it also proved the approved
correctness and performance runtime blobs remained byte-identical through integration.

### FINDING-228
**Date:** 2026-07-17 | **Phase:** Combined Snake correctness/performance browser gate | **Status:** IMPLEMENTED — INDEPENDENTLY VERIFIED; COMBINED PREVIEW/JK GATES PENDING
**Files:** `src/engines/__tests__/snakeFitPoolCalibration.test.ts`,
`test-utils/journeys/14-snake-pool-assembly.spec.ts`,
`src/src_figma/app/components/snake/setup/SnakeDraftSetupAdapter.helpers.ts`
**Evidence:** The exact-440 calibration's `prove` helper supplies each club's `capIdentity` but omits
the `identityArchetype` that production Draft Setup always adds through `buildSnakeSetupProofInput`.
Its exact 238/264 result therefore proves legal/cap seating, not the UI's required strict chosen-
identity certificate. The real eight-club Draft Setup journey ends at honest 440 Full Sources with
`identity-proof-unknown` instead of its expected 238. A separate two-club Standard room using
Murderers Row and Whiteyball reproduces the same honest 440 fallback. Running the unchanged engine
synchronously on the exact real-browser 440 input returns the same UNKNOWN result, excluding worker
transport, serialization, scheduling, and cache behavior as the cause. Correcting the permanent
calibration to supply `identityArchetype` reproduces the same failure at Full Sources in 26.35s.
**Impact:** The independently approved claim that the real named browser build certifies every chosen
identity at 238/264 is not covered by the cited calibration, and the existing browser journey is red.
Performance is repaired, but a normal Standard Snake setup can remain unable to lock because Full
Sources cannot mint the required identity-aware certificate.
**Action:** Use the exact production `buildSnakeSetupProofInput` in permanent real-data calibration,
then repair only the bounded identity-certificate construction while preserving its independent
validator and every legal, money, value-floor, strict-embodiment, version, and disjointness law. Do
not weaken readiness, hide UNKNOWN, remove `identityArchetype`, or fold this correctness change into
FINDING-227.
**Builder evidence:** The bounded certifier now tries deterministic disjoint canonical identity
builds before the generic slot matcher. Each club consumes exact version groups; a later club builds
from the remaining versions/people, but its IV floor stays anchored to Full Sources. A candidate can
return SUCCESS only after the unchanged independent validator recomputes unique people, legal 22,
exact settlement money, Full Sources IV floor, strict positive embodiment, and every assignment bill.
The exact production adapter calibration passes Full Sources plus exact 238/264 for the mixed
eight-club room, the reported two-club Murderers Row/Whiteyball room, and four simultaneous clubs for
each of all 24 archetypes on the exact 440. The existing synthetic bounded-UNKNOWN case stays UNKNOWN.
Builder gates: 107/107 proof/adapter/pool/desk; 49/49 Draft Setup; 4/4 exact-440 calibration;
TypeScript, changed-file ESLint, 2,729-module production build/PWA, and diff integrity green.
**Independent evidence:** A separate non-builder auditor returned APPROVE with zero Major and zero
Minor findings. It independently reran the exact production-input calibration 4/4 in 278.32s,
seating proof 14/14, adapter proof 12/12, TypeScript, changed-file ESLint, the 2,729-module production
build, and diff integrity. Its source trace confirmed four bounded deterministic orders, immutable
Full Sources IV-floor translation, identity-specific Legend version choice with whole-person
consumption, unchanged exact billing/legality/strict-embodiment validation, and the honest UNKNOWN
tail. Performance integration and JK's browser walk remain downstream gates.

### FINDING-229
**Date:** 2026-07-17 | **Phase:** Snake room compatibility performance | **Status:** DOCUMENTED — DEFERRED HARDENING
**Files:** `src/src_figma/app/pages/SnakeDraftRoom.tsx`, `src/engines/snakeGuideTrade.ts`
**Evidence:** New rooms persist and refresh the setup certificate. A legacy or malformed saved room
whose certificate is absent or invalid can still schedule the unchanged compatibility proof through
`requestIdleCallback`/`setTimeout`, which defers but does not move that recovery proof off-thread.
**Impact:** Current new Draft Setup and Practice paths are repaired; only old or damaged saved-room
recovery retains this possible stall.
**Action:** Keep this outside the current release repair unless legacy saved-session recovery becomes
a release gate. A later ticket can route it through the worker without changing validation or
fail-closed room behavior.

### FINDING-230
**Date:** 2026-07-17 | **Phase:** Snake browser gate / League Builder recovery | **Status:** FIXED — INDEPENDENTLY APPROVED
**Files:** `src/src_figma/app/pages/LeagueBuilder.tsx`, `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx`, `src/utils/historicalLegendsImport.ts`, `src/utils/leagueBuilderStorage.ts`
**Evidence:** A partial legacy Legends import left exact `hl:` cards owned by `League Builder` and
assigned to the closed SML source, making the SML count 1,341 and blocking the verified three-library
import. Draft Setup could also route through a Legends source library instead of the user's real
four-team league. The first audit pass additionally proved that naive stock refresh could prune a
user league's reused stock team, player assignment, roster, pool, or draft-session truth.
**Impact:** JK could neither repair the Legends libraries nor trust that recovery would preserve the
four-team draft already under test.
**Action:** Permit repair only when every conflicting payload-owned card has stock-source-only
SML/MLB assignments; strip only those stock assignments and keep all user assignments protected.
Exclude source libraries from draft targets, keep the selected target in the URL, refresh exact stock
records without cascading deletes, and derive protected reused teams from authoritative user league
templates. Regression proof freezes the user template, player assignment, shared roster, registered
pool, and all four draft-session stores.
**Verification:** Separate non-builder audit returned **APPROVE — Major 0 / Minor 0** after three
data-preservation findings were repaired. Focused 115/115, TypeScript, changed-file ESLint, the
2,730-module production build/PWA, and diff integrity passed. JK's real IndexedDB browser repair is
the remaining product gate; no merge, push, or deploy is authorized.

### FINDING-231
**Date:** 2026-07-17 | **Phase:** Snake browser gate / initial private-board materialization | **Status:** FIXED — INDEPENDENTLY APPROVED
**Files:** `src/src_figma/app/components/snake/desk/deskModel.ts`, `src/src_figma/app/components/snake/desk/BoardView.tsx`, `src/src_figma/__tests__/pages/SnakeDraftSetupAdapter.test.tsx`
**Evidence:** A new four-team room had an empty owned roster and a legal 14-hitter/8-pitcher setup
certificate whose second catcher coverer was a Two Way starting pitcher. The fixed 22-row board
matcher forced that pitcher into `BACKUP_C`, leaving only seven players for the eight staff rows and
falsely reporting `SP4` (and, in JK's browser state, `SWING`) as broken. Full Sources produced the
same result, excluding pool scarcity as the cause.
**Impact:** JK could not start the Snake draft from an otherwise legal new-league setup. Rebuilding
the league or expanding the pool could not repair the representation mismatch.
**Action:** Keep the unchanged roster-wide two-catcher law authoritative. Let the stored fifth bench
row accept an ordinary position player only when the final canonical 22-player validator proves the
roster still has two distinct catcher coverers elsewhere. Keep Two Way pitchers in staff rows and
render that ordinary bench row as `FLEX5` on both My Board and Assistant GM Board. Catcher-ranked
candidates remain preferred; unique player and version-group laws remain unchanged.
**Verification:** Separate non-builder audit returned **APPROVE — Major 0 / Minor 0**. It independently
passed 13 affected files / 154 tests, TypeScript, changed-file ESLint, the 2,730-module production
build/PWA, and diff integrity. Exact adapter and desk regressions prove a unique legal 22 with the
Two Way catcher retained in the staff. JK's browser retry is the remaining product gate.

### FINDING-232
**Date:** 2026-07-17 | **Phase:** Snake browser gate / certified-board role materialization | **Status:** FIXED — INDEPENDENTLY APPROVED
**Files:** `src/src_figma/app/components/snake/desk/deskModel.ts`, `src/src_figma/app/components/snake/desk/deskRoomModel.ts`, `src/src_figma/app/components/snake/setup/SnakeDraftSetupAdapter.helpers.ts`
**Evidence:** JK's same four-team setup still failed after FINDING-231, first for Sirloins with
`RP3, SWING` broken and then for Herbisaurs with `SP3, SP4, SWING` broken. Replacing the drafting
club moved the failure, proving it follows the assigned 22-player configuration rather than a team
record or pool-size shortage. Code trace confirms the simultaneous certificate validates aggregate
canonical roster law, where SP/RP can satisfy both starter and reliever minima and the ninth pitcher
may be a surplus starter or closer. The board matcher instead consumes one distinct player per rigid
SP/RP/CP display row and restricts `SWING`, so some legal certified sets have no display matching.
**Impact:** One club in an otherwise valid new room can be prevented from starting; changing clubs,
expanding the pool, or rebuilding the league merely moves or reshuffles the false blocker.
**Action:** Treat the certified legal 22 as authoritative roster membership and deterministically
materialize that exact set into stable board-storage rows. Preserve four startable rows and the
highest-ranked closer row where possible, then use the remaining pitcher rows as display depth
without inventing a second legality law. The unchanged canonical whole-roster validator remains the
final gate. Do not alter the certificate, pool, FIT, tax, archetype, salary, or roster law.
The adapter now fails closed unless the exact certified 22 materializes and remains affordable; it
never substitutes an outside player. Room reconciliation preserves a pre-draft surplus closer, but
once the club owns a closer the highest-IV owned closer still controls CP and an undrafted extra is
removed. A ninth pure starter can backfill SWING only when final whole-board validation succeeds.
**Verification:** Separate non-builder verdict: **APPROVE — Major 0 / Minor 0**. Exhaustive tests
cover every supported legal 13/9 and 14/8 SP–SP/RP–RP–CP distribution, exact player/person
membership, the two prior live-room regressions, and fail-closed unaffordable membership. Final
gates: 13 files / 160 tests, TypeScript, changed-file ESLint, production build, and diff integrity
green. JK's same four-team browser retry remains the only product-acceptance gate.

### FINDING-233
**Date:** 2026-07-17 | **Phase:** Snake browser gate / companion entry | **Status:** FIXED — INDEPENDENTLY APPROVED — JK BROWSER VERIFIED
**Files:** `src/src_figma/app/components/LoginForm.tsx`, `src/supabase.ts`, `src/src_figma/__tests__/app/SyncModal.test.tsx`, `src/src_figma/__tests__/app/supabaseAuthStorage.test.ts`
**Evidence:** After Draft Setup passed JK's browser gate, the home Cloud Sync form appeared to do
nothing when he pressed Sign In. Browser reproduction proved the current Supabase project and submit
handler are reachable: a deliberately invalid account returned `Invalid login credentials`. Code
trace found that a rejected or indefinitely pending `onSignIn` promise is not rendered by the shared
home form; `finally` only clears its loading state, so the button silently returns to `SIGN IN`.
JK's Chrome retry then exposed the exact rejected operation: Supabase successfully reached
`signInWithPassword`, but `_saveSession` threw `QuotaExceededError` while writing only its own
`sb-...-auth-token` key to Chrome's full `localhost` local storage. The same account working in a
different browser confirms that this is origin-local storage exhaustion, not an account, project,
provider, room, or draft failure.
**Impact:** A rejected, stalled, or locally unpersistable Auth request blocks main-device
authentication and therefore companion entry. Clearing all site storage would risk unrelated league
and draft data and is not an acceptable repair.
**Action:** Preserve local storage as Supabase Auth's normal persistent store. When and only when its
token write throws a quota error, store that token in same-tab session storage instead; read the
fallback token first and remove only the same Supabase token key from both stores on sign-out. Never
clear, overwrite, enumerate, or inspect league/draft keys. Also bound the shared form's wait, map
thrown network failures to existing account-service copy, render a timeout, preserve provider-returned
credential errors, and never log, retain, or inspect credentials.
**Verification:** JK's Chrome retry signed in successfully with the same account after one hard
refresh. Separate non-builder verdict: **APPROVE — Major 0 / Minor 0**. Independent proof passed
9 files / 51 tests, TypeScript, changed-file ESLint, the 2,730-module production build/PWA, and diff
integrity. Ordinary local persistence, quota-only tab fallback, fresh-token precedence, key-scoped
sign-out, and non-quota rejection are all pinned.

### FINDING-234
**Date:** 2026-07-17 | **Phase:** Snake browser gate / companion admission | **Status:** FIXED — INDEPENDENTLY APPROVED — JK RETEST PENDING
**Files:** `src/src_figma/app/components/snake/companion/CompanionClaimScreen.tsx`, `src/src_figma/app/components/snake/SnakeDraftRoomView.tsx`, `src/src_figma/app/pages/SnakeDraftRoom.tsx`, focused companion/room tests
**Evidence:** After Chrome sign-in passed, companion devices skipped the room-code form and waited
forever while Hotseat showed no approval notice. Code trace found two exact UI seams. A recovered
pending claim makes `CompanionClaimScreen` return a waiting-only surface, so a stale or missed request
cannot be corrected or resent without finding a separate fixed-position Forget control. Independently,
`SnakeDraftRoomView` renders the COMPANIONS button identically for zero or many pending claims and
intentionally keeps the approval panel closed, so Hotseat receives no visible pending state.
**Impact:** A prior pending attempt can strand a companion before room entry, and a valid current
attempt can remain unnoticed on the main device even though approval data exists.
**Action:** Keep private content covered and keep approval explicit. A pending device retains the
room/GM form and can resend instead of entering a dead-end waiting screen. Hotseat's existing
COMPANIONS control displays the current pending claim count and alert styling without auto-opening
private or approval content. Do not change claim identity, account, room-code validation, sync,
capacity, approval authority, privacy, or pick/trade behavior.
**Verification:** Separate non-builder verdict: **APPROVE — Major 0 / Minor 0**. Independent proof
passed 10 files / 93 tests, TypeScript, delta ESLint, the 2,730-module production build/PWA, and diff
integrity. The auditor confirmed the unchanged privacy gate, atomic claim patch, validation/version/
capacity model, exact pending count, zero-count styling, and explicit-open-only approval details.
JK's same-device admission retry remains the product gate.

### FINDING-235
**Date:** 2026-07-17 | **Phase:** Snake browser gate / companion live room | **Status:** FIXED — INDEPENDENTLY APPROVED — JK RETEST PENDING
**Files:** `src/utils/leagueBuilderStorage.ts`, `src/src_figma/app/pages/SnakeDraftRoom.tsx`, focused storage/room/sync tests
**Evidence:** JK completed a legal pick trade on Hotseat, but no companion room reflected the new
pick ownership, including the club that traded back. Code trace found that an independent companion
board patch writes its board row locally but also queues the companion's embedded whole-session copy
to `mlbDraftSessions`. The authoritative Hotseat pick and trade writers then save locally and only
queue their newer session row for the ordinary drain. The older companion whole-session write can
therefore move cloud authority first and stale-reject the Hotseat row. Companion polling is healthy,
but it has no newer accepted room row to download.
**Impact:** Hotseat can show a successful pick or trade while every companion retains the old on-clock
club, pick ownership, roster, activity, and private planning context. Retrying the same action would
risk a duplicate or a contradictory room.
**Action:** Keep companion boards independently synced: update the embedded copy only for local
coherence, and queue only the standalone `snakeSeatBoards` row. After every completed Hotseat MLB
pick, trade, or correction, immediately flush queued authority and expose a precise saved-here/
not-published notice if cloud publication fails. Include authoritative MLB/FARM board revision
signatures in live snapshot equality so already-open devices adopt standalone-board-only changes.
Preserve the existing freshness loop and all draft,
trade, privacy, financial, and board laws.
**Verification:** A separate non-builder auditor returned **APPROVE — Major 0 / Minor 0** after the
live-open board-revision repair. Independent gates passed 8 focused files / 230 tests, TypeScript,
changed-file ESLint, the 2,730-module production build/PWA, and diff integrity. JK's same-room
one-trade, one-pick, and one-companion-board-move walk remains the product gate.

### FINDING-236
**Date:** 2026-07-17 | **Phase:** Snake browser gate / existing-room companion recovery | **Status:** FIXED — INDEPENDENTLY APPROVED — JK RETEST PENDING
**Files:** `src/utils/syncEngine.ts`, `src/utils/leagueBuilderStorage.ts`, `src/src_figma/app/pages/SnakeDraftRoom.tsx`, `src/src_figma/app/components/snake/companion/CompanionApprovalCard.tsx`, focused sync/companion tests
**Evidence:** JK refreshed every open device after FINDING-235, but companions still showed the old
pick order. The Hotseat visibly retained the completed trade. Contract 42 prevents new stale room
writes; it cannot retroactively publish a Hotseat room whose older queued write was already rejected
against the cloud row. An ordinary refresh correctly preserves that local room instead of silently
overwriting either side.
**Impact:** Starting a new draft would discard valid progress, while repeating the trade could create
a duplicate or contradictory room. Full-cloud upload is much broader than the failed record and is
not an acceptable recovery.
**Action:** Add explicit Hotseat `SYNC COMPANIONS`. It revision-guards and marks only the current
room, then atomically republishes that exact `mlbDraftSessions` record using its current cloud
`received_at/id` as the one-record write base. The result is re-read and content-verified before
success. On affected companions, only a superseded legacy whole-room write with matching independent
board evidence and no unpublished claim, pick request, offer, pick, or trade is retired. Normal
conflicts and unrelated queues remain intact.
**Audit correction:** The first non-builder audit blocked the Hotseat-only implementation because a
companion's own pre-Contract-42 whole-room queue would still reject the republished row on every
poll. The repair adds explicit room-scoped publication authority plus a second-device regression.
**Builder verification:** The combined affected matrix passes 9 files / 250 tests. The exact
second-device reproduction adopts the trade and pick order, preserves the private board, and retains
an unrelated pending write; negative tests preserve an unpublished pick request and trade decline,
and refuse to overwrite a newer cloud-side companion request.
TypeScript, changed-file ESLint, the 2,730-module production build/PWA, and diff integrity are green.
The separate non-builder auditor returned **APPROVE — Major 0 / Minor 0** after independently checking
the exact-cloud intent guard, atomic write base, post-write verification, marker-backed queue
retirement, rollback on queue-persistence failure, and the Hotseat control. JK's same-room click
remains the product gate.

### FINDING-237
**Date:** 2026-07-17 | **Phase:** Snake full-draft browser gate / late-draft decision truth | **Status:** FIXED — INDEPENDENTLY APPROVED — JK EIGHT-TEAM WALK PENDING
**Files:** `src/engines/snakeAssistantBoard.ts`, `src/engines/snakeSeatingProof.ts`, `src/src_figma/app/pages/SnakeDraftRoom.tsx`, `src/src_figma/app/pages/SnakeCompanion.tsx`, Snake desk hooks/workers and focused tests
**Evidence:** In JK's first complete four-team room walk, two seats lost their Assistant GM several
rounds before the end and one club reached 19/22 with no discoverable legal pick despite a positive
current-roster money balance. Code trace proves the Assistant is local and independent of Auth or
network idle state. It returns `INCOMPLETE_BOARD` when a bounded preferred-board search is incomplete
and `INSOLVENT_BOARD` when that preferred 22 is over budget, even though the separate exact
legal-finish engine may still prove an affordable completion. The hook deliberately hides those
generic reasons behind `ASST GM 22 UNAVAILABLE`. Candidate rows expose current-roster marginal tax,
but only the selected player runs the legal-finish calculation, so the GM must open candidates one
at a time to discover `BLOCKED`. Drafted-board rows reuse signed remove-and-reinsert tax deltas as
`TRUE COST`; role reassignment can make that delta negative and larger than salary, producing the
observed negative player costs even though no player has negative salary.
**Impact:** A valid four- or eight-team draft can become operationally unfinishable before round 22:
the engine may still have a legal completion, but the Assistant disappears and the UI does not name
the safe players. Tax can appear after the pick without the corresponding pre-pick projected finish
bill, creating a bait-and-switch. The current row labels also misstate nonlinear tax-removal deltas
as player prices.
**Action:** Keep identity FIT unchanged and separate. Make the legal-finish engine the fallback source
of a valid Assistant 22 whenever the preferred identity optimizer cannot produce one; never call a
proved legal room unavailable merely because preference optimization is incomplete. Compute stable
pick-level finish state off the render path and surface `DRAFTABLE`, `OPEN`, or `BLOCKED` plus
projected final tax/money before selection, with a filter that always exposes the legal options.
Label current roster salary and tax truth literally; do not render signed removal deltas as player
cost. Prove full 22-round completion for four and eight teams, with eight-team latency gates.
**Builder result:** The Assistant now consumes the room's independently validated simultaneous
completion certificate and revalidates ownership, unique people, roster law, exact tax, salary, and
slot materialization before using it as a fallback. Current drafted rows show settled salary and
actual tax-core contributions; selectable rows expose separate identity FIT and finish safety, while
the selected card quotes the exact projected final salary, tax, all-in cost, and money left. The GM
can filter to guaranteed `DRAFTABLE` choices. The same desk adds private zero-interest, CSS rating
bars, chemistry trait counts, a clickable full draft log, and on-clock companion colors. The
Assistant worker is storage/Auth-free and 98.07 kB, and 20-row paging prevents a 506-card render.
**Audit correction:** The first separate auditor returned **BLOCK — Major 2 / Minor 1**. Zero-interest
was filtered before the legal fallback, visible finish status only distinguished certificate IDs
from generic `OPEN`, and the completion journey selected directly from the certificate without
independently requiring a current Assistant recommendation or rechecking final people, roster,
salary, tax, and money truth. The repair makes zero-interest preference-only; an exact legal fallback
may restore the sole legal card. A valid preferred Assistant plan that does not intersect the club's
current simultaneous completion yields to that exact completion, so the live Assistant always names
at least one room-safe choice. A storage/Auth-free worker now validates the current proof once and
progressively classifies every candidate by constructive reservation rewrite, with canonical solver
fallback. Selected-player and scarcity replacement consequences run in a separate cancellable,
fingerprinted worker instead of React's render path.
**Repaired builder verification:** Exact production-shape simulations completed 88/88 four-team and
176/176 eight-team picks. Every turn selected from the intersection of the current Assistant and the
current club certificate; every final roster was independently rechecked for unique people, legal
22-player shape, salary, tax, all-in cost, and certificate money left. Slowest Assistant calculation
was 1.611 s in the engine journey. The full 506-player eight-team finish classifier took 185 ms total
and 18 ms for the first 24 rows. The real browser used 506 players / 176 picks: room 860 ms, desk
283 ms, Player Pool 423 ms, sort 247 ms, FIT filter 223 ms, finish filter 850 ms, selection 304 ms,
pick persistence 1.274 s, and reload on pick 2 in 928 ms with no console errors. The two long exact
production suites pass 12/12 and the controlled-concurrency surrounding Snake matrix passes 602/602,
for 614/614 cumulative. TypeScript, changed-file ESLint, the 2,734-module production build/PWA,
emitted-worker Auth/storage scan, and diff integrity are green. Re-audit and JK's browser walk remain
open. No push, merge, or deploy.
**Second audit correction:** The re-auditor returned **BLOCK — Major 3 / Minor 0**. A bounded
simultaneous solver rejection could be presented as authoritative `BLOCKED`; the module cache key
omitted base caps and player/roster construction; and Main plus Companion still called the heavy
single-club legal-finish engine from render while the row worker emitted 24-card progress updates.
The repair reserves `BLOCKED` for unavailable cards or independently necessary roster/supply
failure, keeps bounded uncertainty `OPEN`, and lets an `OPEN` companion request reach the unchanged
Hotseat mutation validator. The cache now covers caps, tier, versions, identities, committed
construction, and every roster/pool player's shape and construction. Worker progress no longer
causes React state churn, and scarcity uses the current shared certificate rather than recomputing a
finish on the UI thread.
**Second-repair verification:** Fresh focused engine/worker/performance proof is 53/53; Main,
Companion, and registration/gavel pages are 53/53; the exact production-scale suite is 8/8 and again
completes 88/88 plus 176/176 picks. Full 506-card classification is 186 ms total / 18 ms first chunk.
The fresh browser run uses eight teams / 506 cards / 176 picks and measures room 898 ms, desk 223 ms,
pool 335 ms, sort 214 ms, FIT 37 ms, finish filter 553 ms, selection 237 ms, saved pick 1 in 1.278 s,
and reload on pick 2 in 934 ms with the Assistant available and no console errors. TypeScript,
changed-file ESLint, the 2,734-module production build/PWA, and diff integrity pass. Final re-audit
and JK's browser walk remain open. No push, merge, or deploy.
**Third audit correction:** The next read-only pass returned **BLOCK — Major 2 / Minor 0**. The new
active-club hard gate still used one cheapest version per person plus a constructive heuristic, so a
cheaper SP version could hide the same person's necessary CP version. The cache also omitted proof
feasibility, assignment salary/tax, and message. The repair deletes that heuristic hard gate; only an
already-full illegal 22 is blocked there, while earlier bounded uncertainty stays `OPEN`. The key now
hashes the complete proof receipt. Fresh focused proof is 20/20, exact 506-card classification is
184 ms, TypeScript/lint/build pass, and the eight-team browser again advances and reloads cleanly
with the Assistant available and no console errors. Final re-audit remains open.
**Approved-minor regression and deeper repair:** The subsequent frozen audit returned **APPROVE —
Major 0 / Minor 1**: the code no longer false-blocked mixed-version people, but no exact regression
locked that boundary. Adding the auditor's cheaper-SP / only-legal-CP case failed red because the
final-round certificate still chose one representative card per person before role matching. A new
bounded zero-or-one-open-seat matcher keeps every version's actual role, matches unique people across
all eight clubs, computes exact salary and shifted-cap tax, and cannot mint SUCCESS without the
unchanged constructive validator. Exact one-club and eight-club sibling tests pass.
**Final audit:** A separate non-builder audited frozen commit `12efdbdf` and returned **APPROVE —
Major 0 / Minor 0**. It independently inspected the bounded final-round matcher, unique-person
augmenting paths, exact shifted-cap tax and affordability edges, unchanged final validator, complete
semantic proof fingerprint, and retained OPEN/Assistant/zero-interest behavior. Its focused 8-file /
113-test matrix, TypeScript, changed-file ESLint, production build, and diff checks are green. JK's
real eight-team browser walk remains the sole product-acceptance gate.
**Live-loop correction:** The final browser gate then caught DRAFTABLE rows blinking out for 20–40 ms
at a time. Trace proved that advisor-log-only session revisions recreated an identical seating input;
the effect cleared its valid proof, changed advisor state, wrote another log revision, and repeated.
Main now keys proof lifecycle to the complete canonical seating input rather than object identity.
An 80-sample / 800 ms live trace kept all 20 safe rows continuously. Clean browser timings are room
863 ms, desk 234 ms, pool 377 ms, sort 44 ms, FIT 14 ms, DRAFTABLE 26 ms, selection 185 ms, pick save
1.267 s, and pick-two reload 922 ms, with no console errors and the Assistant available. The full
real-player oracle passes 8/8 including 176/176 picks; the non-production Snake matrix passes 609/609.
Final non-builder audit and JK's walk remain open. No push, merge, or deploy.

### FINDING-238
**Date:** 2026-07-18 | **Phase:** Eight-team Snake Draft Setup / large selected sources | **Status:** FIXED — INDEPENDENTLY APPROVED — JK WALK PENDING
**Files:** `src/engines/snakeSeatingProof.ts`, `src/engines/poolFromDemand.ts`, `src/src_figma/app/components/snake/setup/SnakeDraftSetupAdapter.helpers.ts`, `src/src_figma/app/components/snake/setup/snakePoolShapeClient.ts`, `src/src_figma/app/workers/snakePoolShape.worker.ts`, `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx`
**Evidence:** JK selected nearly 2,000 cards for an eight-team Snake room and Draft Setup still could
not certify a pool. The exact production repro combines 506 SML cards, 660 MLB cards, and 835
Draft/Career/Peak Legends cards: 2,001 cards and more than 1,500 distinct people for 176 picks. The
old bounded proof returned `identity-proof-unknown` after roughly three minutes. Seven clubs were
legal, solvent, and identity-positive; the final chosen identity missed only the source-relative
strict-positive embodiment gate. The source was not scarce. Adding the large source also made the
pool shaper synchronously rerun every club's identity optimizer after Full Sources had already been
certified, which held the browser main thread.
**Impact:** More source cards could make an otherwise valid room slower and eventually look
impossible. Full Sources and named Tight/Competitive/Loose builds could leave the user waiting with
misleading source advice even though 176 legal, affordable, identity-valid people existed.
**Action:** For sources above the bounded small-source path, derive a deterministic room-scaled union
of high-IV, high-fit, and affordable role candidates while retaining the immutable Full Sources
population as the identity reference. Construct each chosen identity from whole-person version
groups, permit a bounded strict-embodiment rescue, and allow SUCCESS only through the unchanged
independent whole-room validator. Carry the exact disjoint Full Sources assignments into shaped
builds; shaped membership must retain those 176 cards and remains independently validated against
Full Sources. Skip the duplicate identity extraction only when that authoritative support receipt is
present. Run numeric shaping in a module worker, never on the UI thread. Keep FIT thresholds, tax,
caps, roster law, named counts, and honest UNKNOWN unchanged.
**Builder result:** The real 2,001-card room now certifies Full Sources and completes all 176 trusted
picks with eight distinct legal, solvent 22s. Tight/Competitive/Loose build exact 212/238/264 pools,
retain all 176 support cards, and independently pass source-relative identity validation. Isolated
large-source proof passes 3/3 in 101 seconds and covers all 24 selectable identities across three
eight-club rooms. The Snake setup/room/companion/storage matrix passes 619/619. Playwright passes
17/17 responsive, 1/1 complete production lifecycle, 3/3 pool assembly, and 2/2 Mac/iPad latency.
Worst large-build main-thread gaps are 415/327 ms instead of an unresponsive page. TypeScript,
changed-file ESLint, 2,735-module production/PWA build, and diff integrity are green. Separate audit
and JK's real browser walk remain open. No push, merge, or deploy.

**First audit and repair:** Frozen builder commit `17a3ec8b` received **BLOCK — Major 3 / Minor 0**.
Both construction and validation had reduced the Full Sources IV baseline to the bounded candidate
union; raw support assignments/ids were reusable without an independently validated source-bound
receipt; and the page left pool shaping alive after navigation. The repair exposes one canonical
Full Sources value-baseline calculation, requires an independent exact-source certificate before
support reuse, binds numeric shaping to that same source plus all shaping inputs, and owns one abort
signal through proof, shaping, and the post-worker write seam. Regressions prove that a shortlist
cannot manufacture the 90% floor, changed Full Sources or IV invalidates the receipt, raw ids do not
skip identity extraction, and unmount cancels the worker without writes. Exact large-source, named
preset, 176-pick, 625-test Snake, build, and production-browser setup gates remain green. Final
re-audit and JK's real browser walk remain open.

**Second audit and repair:** First-audit repair `6d45f11f` received **BLOCK — Major 2 / Minor 0**.
Its receipt bound Full Sources but not the separate assignment array, and abort during a pending add
could still fall through into remove and setup persistence. The receipt now fingerprints its exact
assignments together with source authority and rejects any payload change before reuse. Both shaped
and Full Sources mutation paths recheck the owned signal between every awaited add/remove/save
stage. Regressions alter only assignments and pause both paths inside add before unmount; altered
support returns honest UNKNOWN and neither abandoned path begins a later remove or setup save.
Focused proof is 58/58 and exact 2,001-source eight-team proof remains 3/3. Final re-audit and JK's
real browser walk remain open.

**Final audit:** Frozen second repair `1ae9c0a4` received **APPROVE — Major 0 / Minor 0**. The
auditor independently confirmed exact source-plus-assignment receipt binding, assignment-only
tamper rejection, cancellation after every awaited add/remove stage and around save, 58/58 focused
tests, exact production 2,001-source 3/3, TypeScript, changed-file lint, production build, clean diff,
and clean worktree. Engineering verification is closed; JK's browser walk remains the sole product
gate. No push, merge, or deploy.

### FINDING-239
**Date:** 2026-07-18 | **Phase:** Snake draft decision truth / archetype tax visibility | **Status:** FIXED — INDEPENDENTLY APPROVED — JK WALK PENDING
**Files:** `src/engines/leagueConstruction.ts`, `src/src_figma/app/components/snake/desk/deskModel.ts`, `src/src_figma/app/components/snake/desk/BoardView.tsx`, `src/src_figma/app/components/snake/desk/PrivateDesk.tsx`, `src/src_figma/app/pages/SnakeDraftRoom.tsx`, `src/src_figma/app/pages/SnakeCompanion.tsx`
**Evidence:** The engine already settled 19 exact luxury rows with archetype-shifted caps, top-N
cohorts, pitcher role-use weights, single SP/RP group assignment, and Two Way exceptions. The draft
desk exposed only contributor names and row tax, so a GM could not see how many rating points were
used, how much room remained, or how far a roster had crossed the threshold. The Assistant board
hid this breakdown entirely.
**Impact:** GMs could see tax after it appeared but could not trace the accumulating rating pressure
that created it. A row over the limit did not expose the full accumulated total or each player's
weighted contribution, weakening the practical value of team archetype and tax intelligence.
**Action:** Extract one canonical per-row usage ledger and make `luxuryTax` consume it. Render the
same uncapped USED / archetype-adjusted LIMIT / LEFT-or-OVER truth on both My Board and Asst GM
Board, with exact contributing players and points, row tax, and selected-player contribution when
the selected player is in that top-N core. Keep the panel collapsed by default and methodology
behind Help. Add no pool scan, worker, persistence, or network work.
**Builder result:** Focused engine/desk proof is 85/85; broad Snake is 63 files / 628 tests; the exact
eight-team oracle completes 176/176 picks with every Assistant available. Playwright is 23/23 across
responsive desks, companion privacy/sync, complete franchise launch, exact 2,001-source setup, and
Mac/iPad latency. TypeScript, changed-file ESLint, the 2,735-module production/PWA build, and diff
integrity are green.
**Final audit:** Frozen commit `a036b839` received **APPROVE — Major 0 / Minor 0**. The auditor
independently confirmed exact ledger/settlement parity, uncapped USED and exact LEFT/OVER/tax,
canonical contributors and role weights, CP bullpen inclusion, SP/RP and Two Way behavior, shifted
team limits, selected-player truth, separate My/Assistant inputs on Main and Companion, help-law
compliance, responsive layout, and no new heavy data path. Independent proof passed 85/85 focused
tests, 17/17 responsive/privacy browser journeys, changed-file lint, TypeScript plus production/PWA
build, diff integrity, and clean worktree. Engineering verification is closed; JK's browser walk
remains the sole product gate. No push, merge, or deploy.
