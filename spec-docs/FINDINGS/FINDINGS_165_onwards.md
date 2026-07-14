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
