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
