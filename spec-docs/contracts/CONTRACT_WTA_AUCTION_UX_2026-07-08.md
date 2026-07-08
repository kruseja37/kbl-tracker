Deliver LANE WT-A: two small, related UX-truth fixes on the auction draft floor. Commit in your worktree branch when green; do NOT push, do NOT merge — the captain merges after an adversarial audit.

SETUP (do this first):
1. Your worktree has no node_modules. Clone it: `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules` (APFS clone, fast).
2. Write this entire contract (the full prompt text you received) to spec-docs/contracts/CONTRACT_WTA_AUCTION_UX_2026-07-08.md and include it in your commit.

=== CHANGE 1: Farm scout report — hold-to-reveal → click-to-toggle ===
JK's browser walkthrough found the hold-to-reveal scout report on the farm auction glitches (report flashes and snaps back). Root cause (verified by a tracer): src/src_figma/styles/auction-theme.css:230 has `.auc-root .scout.revealed .cover { display: none; }` — it hides the very button carrying the pointer handlers the instant revealed flips true, so the browser treats it as pointer-leave and self-cancels. JK ruled: convert to click/tap toggle, like the MLB "ASST GM" whisper panel (src/src_figma/app/components/auction/WhisperPanel.tsx:128-131 — onClick toggle on a persistent button, content as a sibling `{open && ...}`).

Do:
a. src/src_figma/app/components/auction/AuctionStage.tsx (~lines 617-627, inside `function Lot`): on the `.cover` <button>, delete onPointerDown/onPointerUp/onPointerLeave (lines ~622-624) and replace with a single `onClick={() => setRevealed((current) => !current)}`. Keep `aria-label="Scout report"` EXACTLY unchanged (tests query by it).
b. Two-state visible label on that button, matching the WhisperPanel voice: covered → "📋 TAP FOR THE SCOUT REPORT", revealed → "📋 COVER IT" (adapt to existing markup/style; keep the retro-announcer tone consistent with the rest of the stage).
c. src/src_figma/styles/auction-theme.css:230: delete/neutralize the `.scout.revealed .cover { display: none; }` rule — the button must stay visible and clickable in the revealed state so the user can re-cover. Leave line ~231 (`.scout.revealed .body { display: block; ... }`) as-is. Adjust styling minimally so the revealed state looks intentional (button above, report below).
d. Tests encoding the old hold behavior — update them (they are current-behavior tests, they MUST change):
   - src/src_figma/app/components/auction/__tests__/AuctionStage.test.tsx:144 — fireEvent.pointerDown → fireEvent.click.
   - src/src_figma/__tests__/pages/LeagueBuilderFarmAuctionDraft.test.tsx:413 (pointerDown → first click, keep the reveal assertions) and :421 (pointerUp → second click, keep the re-cover assertions).
   - HARDENING (required): right after the reveal click, re-assert the trait-name-absence invariants from lines ~404-405 (today privacy is only asserted in the covered state; assert it in the revealed state too).
e. DO NOT TOUCH: the scout VM construction in src/src_figma/app/pages/LeagueBuilderFarmAuctionDraft.tsx:644-664 (it derives only bands/grades — that IS the privacy invariant); the unconditional positions/age/trait-count chips (AuctionStage.tsx:558-573); WhisperPanel.tsx; src/src_figma/app/components/LongPressReveal.tsx and src/src_figma/app/pages/LeagueBuilderDraft.tsx (different screen, separate JK ruling governs its long-press — leave alone); DraftGuideCard/DraftGuidePreview (unrouted).

=== CHANGE 2: PASSED lot overlay — stop lying about "gone for good" ===
Context (verified): since the 2026-07-07 reserve-price feature (JK-approved), an all-pass player in the MLB auction is recycled back into the pool for exactly ONE more chance (src/engines/auctionStateMachine.ts:919 finalizePassedLot; MAX_RESERVE_RENOMINATION_PASSES=2 at :183), at the same price. But the overlay copy at src/src_figma/app/components/auction/AuctionStage.tsx:246 says "GONE — Nobody bid. He's off the board for good." — FALSE on a first pass when reserve pricing is on. The farm auction never sets reserveFractionK (src/src_figma/app/hooks/useFarmAuctionDraft.ts:547 — flatReserveFloor only), so recycling is OFF there and "gone for good" stays true.
JK ruled: keep the recycle behavior as-is (same price, one extra chance), fix the messaging.

Do:
a. Extend the lot overlay model with an 'unsold' variant alongside 'gone' (find where the overlay union/state is defined — LeagueBuilderAuctionDraft.tsx:1507 sets `overlay: session.state === 'PASSED' ? 'gone' : ...`).
b. In src/src_figma/app/pages/LeagueBuilderAuctionDraft.tsx, when a lot resolves PASSED: if reserve pricing is enabled for the session AND this was the player's FIRST pass (i.e., he was recycled back into the pool — read the session's pass-count state; the engine tracks pass counts, verify the exact field, likely passCountByPlayerId or similar in auctionStateMachine.ts's session/state shape), set overlay 'unsold'; only a second pass (or reserve pricing off) gets 'gone'. Verify the exact semantics from finalizePassedLot at auctionStateMachine.ts:919 — align the UI predicate with what the engine actually does (recycled vs permanently out). If the needed state isn't exposed to the page, thread it through minimally (no engine behavior change — read-only exposure is fine).
c. AuctionStage.tsx overlay copy: 'unsold' → "UNSOLD — Nobody bid at that price. He'll get one more look later." (keep the existing He's/She's gender handling pattern used by the 'gone' copy); 'gone' → keep existing copy.
d. Farm page (src/src_figma/app/pages/LeagueBuilderFarmAuctionDraft.tsx) keeps 'gone' — verify its overlay path and leave semantics unchanged.
e. Add/extend a focused test asserting: first-pass-with-reserve shows the UNSOLD copy, second pass (or reserve off) shows the GONE copy.

=== CHANGE 3: spec-doc sync (auction docs only) ===
Update the now-stale long-press references for THIS screen only: spec-docs/AUCTION_DRAFT_SPEC_V2.md:28,150 and spec-docs/AUCTION_DRAFT_SPEC.md:513 and spec-docs/AUCTION_DRAFT_UX_REDESIGN.md:254,288,312 and spec-docs/IPAD_TEST_BACKLOG.md:32 and spec-docs/UX_NORTH_STAR.md:287 — change the auction-floor scout-report interaction to click/tap-toggle (JK ruling 2026-07-08). Also in AUCTION_DRAFT_SPEC_V2.md §2.2 ("One-chance resolution", ~line 71): add a dated note that for the MLB tier this is superseded by the 2026-07-07 reserve-price design (one recycle at same price, then gone; farm tier remains one-chance). Do NOT touch DECISIONS_LOG.md, SESSION_LOG.md, CURRENT_STATE.md, V1_BUILD_STATUS.md, MODE1_PUNCHLIST — captain/scribe-owned. Do NOT touch the separate S6/RB-11 long-press ruling for LeagueBuilderDraft.tsx anywhere.

=== GATES (all must pass before commit; paste real output in your report) ===
1. `npx tsc -b --pretty false` — exit 0.
2. `npm run build` — exit 0.
3. Focused suites: `NODE_ENV= npx vitest run src/src_figma/app/components/auction/__tests__/AuctionStage.test.tsx src/src_figma/__tests__/pages/LeagueBuilderFarmAuctionDraft.test.tsx` plus whichever suite covers LeagueBuilderAuctionDraft overlay logic (find it; if none exists, your new test from 2e covers it).
DO NOT run the full vitest suite (captain runs it once post-merge; three lanes share this machine).

Commit message: `fix(auction): scout report click-toggle + truthful UNSOLD/GONE pass copy [WT-A]` with trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

REPORT back (this is your final message): branch name + worktree path + commit hash; per-change file:line summary of what you edited; the engine field you used for the recycled-vs-permanent predicate and why it's correct per finalizePassedLot; verbatim gate outputs (tail is fine); any surprises. If anything in this contract contradicts what you find in the code, STOP that item and report the discrepancy instead of improvising.
