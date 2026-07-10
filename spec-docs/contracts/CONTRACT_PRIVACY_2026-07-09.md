# CONTRACT — PRIVACY lane (2026-07-09)

**Builder:** Codex (xhigh). **Auditor:** independent opus agent (not you). **Captain:** Fable.
**Branch:** codex/privacy-reveal-2026-07-09 (this clone). Base: main @ 69022992 (post-VOICE).
**Binding design:** spec-docs/AUCTION_WALKTHROUGH_WAVE_2026-07-09.md §2 (in this tree) — this
contract restates it; the doc governs on any ambiguity. UNKNOWNs or mid-build surprises are
STOP-and-report, never improvisation. Do not push, do not merge.

## JK's ruling
A team's Asst-GM intel must be hidden from everyone until the GM clicks **their own team
name**; it then reveals in full, and auto-hides after their bid/pass. Rationale: in
pass-the-device play, visible advisor intel leaks a rival's strategy and kills the game
theory.

## Today (traced 2026-07-09; re-verify at current lines — VOICE just renamed strings)
One WhisperPanel instance (AuctionStage.tsx ~:365) auto-follows whoever holds bidding action
(`activeWhisperSeatTeamId`, LeagueBuilderAuctionDraft.tsx ~:1061-1070, duplicated ~:1273-1279).
When action passes between two human teams the panel flips open automatically — no click, no
hide. The roster board mirrors this (`rosterBoardTeamState` ~:955-961); its last fallback grabs
the first human team in array order. No team-name click handler exists in AuctionStage.tsx. No
per-user seat identity exists (only `Team.controlledBy: 'human'|'ai'`).

## Build

**Private (covered by default):** everything advisory — the whisper panel in full (headline,
numbers, chips, why-line, YOUR BOARD, bid-vs-pass) AND the decision-zone wallet numbers
(`Ceiling` / `Slots left`), since a visible ceiling is strategy leakage.
**Public (always visible):** rosters (who each club has won), the lot, market band, log,
on-the-clock banner.

1. **State:** one new `revealedSeatTeamId: string | null`, default `null`. No persistence.
2. **Reveal:** clicking the acting team's name — two affordances, same action: the team name in
   the on-the-clock banner (onTheClockBanner.tsx) and the `ASST GM · {club}` strip (the
   existing `🔒 TAP FOR THE READ` cover becomes the covered default every turn). Reveal is only
   possible for `activeWhisperSeatTeamId` (the human seat holding action) — rival names are not
   reveal targets.
3. **Auto-hide (reset to null):** on bid, on pass, on claim resolution, on lot advance, and on
   any change of `activeWhisperSeatTeamId` or the current lot. Implement inside the
   onBid/onPass handlers plus one effect keyed on (currentLot?.id, activeWhisperSeatTeamId).
4. **While covered:** whisper renders its existing dormant/cover shell; the wallet renders the
   bid controls with numbers masked as `——`; bid/pass controls become operable only after
   reveal (expected flow: click your name → read → bid/pass → auto-cover).
5. **Roster board:** private board content gates identically; drop the `latestWinnerTeamState`
   / first-human-in-array fallbacks for private content (public roster view keeps working).
6. **CPU turns:** unchanged. **Farm auction:** the scout-report cover (AuctionStage
   ~:723-730) adopts the same auto-cover triggers so the two privacy patterns behave
   identically (this is the ONLY farm-side change permitted).
7. **Non-goals:** no per-user accounts/seat identity (the click IS the identity claim in
   honor-system hotseat); no CPU computation changes; no persistence of reveal state; no VOICE
   string changes (that law just merged — do not regress any of its copy).

## Repro-first
Before the fix, commit failing (or currently-passing-but-wrong, marked) tests that characterize
today's leak: the whisper auto-reveals on human turn change without a click. Then the change
flips them to the new law: covered-by-default, reveal-on-click (both affordances), auto-hide on
each trigger (bid / pass / lot advance / seat change), wallet masked while covered, reveal
impossible for a non-acting seat.

## Gates (all must pass in this clone)
1. `npx tsc -b` → clean
2. `npm run build` → exit 0
3. Auction suites: WhisperPanel, AuctionStage, onTheClockBanner (if it has tests),
   LeagueBuilderAuctionDraft, LeagueBuilderFarmAuctionDraft → green
4. ONE full `NODE_ENV= npx vitest run` → any new red anywhere is yours to fix or STOP.
   Known solo-rerun flakes (rerun alone before flagging): AwardsWatchlist,
   franchiseManualSmokeFixture, GameTrackerLaunchState.

## Commit sequence (on codex/privacy-reveal-2026-07-09)
(1) this contract file alone; (2) the repro tests; (3) the change; (4) final report appended to
this file: per-item disposition, gate outputs (summary lines), STOP items. Leave the working
tree clean.

## Final report — STOPPED before build (2026-07-09)

**Disposition:** STOPPED at commit-sequence item 1. No repro tests, product code, or unrelated
files were changed.

**Contract-first checkpoint attempt:** `git add spec-docs/contracts/CONTRACT_PRIVACY_2026-07-09.md`
failed before the index could be updated:

```text
fatal: Unable to create '/private/tmp/kbl-privacy/.git/index.lock': Operation not permitted
```

The active sandbox grants write access to the worktree but read-only access to `.git`, and its
approval policy does not permit escalation. Continuing to tests or implementation without the
required contract-only commit would violate the binding commit sequence, so the contract's
mid-build-surprise STOP condition applies.

**Gate outputs:** not run; the build never began.

**STOP item:** restore Git-metadata write access for this clone, then restart from commit-sequence
item 1 on `codex/privacy-reveal-2026-07-09`. This report itself is uncommitted for the same reason.
