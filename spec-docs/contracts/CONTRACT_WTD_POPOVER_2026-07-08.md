# CONTRACT WT-D — Clickable won players + farm on-the-block profile popover (2026-07-08)

You are a builder on the KBL Tracker repo (React+TS+Vite+IndexedDB tracker for Super Mega
Baseball 4). You are working in an isolated git worktree (your cwd) on your own branch off
current main. Deliver LANE WT-D: make already-won (rostered) players clickable on both auction
floors, opening the existing player-profile popover. JK request 2026-07-08: "rostered players
that were already won in the auction are not clickable; they should show player popover with
player profile data so GMs can see player details that will inform roster construction going
forward." Commit when green; do NOT push, do NOT merge — captain merges after adversarial audit.

SETUP (first):
1. `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules`
2. Write this entire contract to `spec-docs/contracts/CONTRACT_WTD_POPOVER_2026-07-08.md` and
   include it in the commit.

TRACER-VERIFIED GROUND TRUTH (line numbers are from just before a small merged change to
AuctionStage.tsx — expect slight shifts; verify each before editing):
- The reuse component: `src/src_figma/app/components/shared/PlayerProfilePopover.tsx` (props
  `{player: Player, revealFull: boolean, children: ReactNode}`). It renders name/meta/archetype/
  chemistry/personality chips + full ratings grid when revealed, OR scout-band-only view — its
  internal gate (`buildDraftProfileModel`'s `shouldReveal`, `src/utils/draftProfileModel.ts:59-63`)
  respects `player.ratingRevealState` even when `revealFull=true`. Already used 3x on this exact
  screen: `AuctionStage.tsx` ~:552 (MLB on-the-block lot name — the pattern to copy),
  `WhisperPanel.tsx` :304 and :422.
- Target 1 — roster board slots: `AuctionStage.tsx` ~:348-364 renders `s.who` as a plain `<div>`,
  no onClick. `RosterSlotVM` (~:94-104) carries only who/chip strings. The VM builders discard
  the player id: `buildStageRosterSlots` (`LeagueBuilderAuctionDraft.tsx` ~:333-345, from
  `AuctionBoardSeat.player` which is `{playerId, salary, name, chip}` per
  `src/engines/auctionBoardFrame.ts:21-26`) and `buildFarmStageSlots`
  (`LeagueBuilderFarmAuctionDraft.tsx` ~:212-226, doesn't carry any id).
- Target 2 — overflow rail: `AuctionStage.tsx` ~:370-382 renders `vm.board.overflow` entries
  (`{playerId, name, chip}` per interface ~:111) as plain `<span>`.
- Target 3 — farm on-the-block name: the farm lot VM literal
  (`LeagueBuilderFarmAuctionDraft.tsx` ~:636-668) never sets `player:`, so the current
  prospect's name has no popover on farm, unlike MLB (`player: stageLotPlayer` at
  `LeagueBuilderAuctionDraft.tsx` ~:1445).
- Both pages already hold the lookup map: `playerById` at `LeagueBuilderAuctionDraft.tsx` ~:636
  and `LeagueBuilderFarmAuctionDraft.tsx` ~:320. This is plumbing, not new data.

DO:
1. Add `player?: Player | null` to `RosterSlotVM` and to the overflow entry type in
   `AuctionStage.tsx`, mirroring the existing `LotVM.player` pattern (~:39).
2. Populate it in `buildStageRosterSlots` (MLB) and `buildFarmStageSlots` (farm) via the
   in-scope `playerById` maps. Handle missing lookups gracefully (leave undefined → renders as
   today).
3. In `AuctionStage.tsx`, wrap the roster-slot `who` text and overflow entries in
   `PlayerProfilePopover` when `player` is present (copy the existing lot-name usage's
   `revealFull` semantics per tier: match how this screen already passes `revealFull` for MLB;
   for farm, match the existing farm popover usages so the fog gate holds). Plain text unchanged
   when player is absent. Add a hover affordance consistent with `auction-theme.css`
   (cursor-pointer + a subtle existing-style hover treatment; keep the premium-retro look, no new
   visual language).
4. Farm on-the-block: set `player` on the farm lot VM (resolve via `playerById`) so the current
   prospect's name gets the same popover MLB already has — verify the popover renders scout bands
   only for unrevealed prospects (`ratingRevealState` gate). DO NOT touch the scout-report
   cover/reveal block (a different feature, just shipped).
5. PRIVACY (hard invariant, JK-ruled): a farm prospect's popover must NEVER show true ratings or
   trait names while his `ratingRevealState` says hidden — bands/ranges only. Do not modify
   `PlayerProfilePopover`'s gate; rely on it, and TEST it.
6. Tests: extend `src/src_figma/app/components/auction/__tests__/AuctionStage.test.tsx` and both
   page suites: (a) clicking a won player's name in the roster board opens a popover showing
   profile data (MLB: real ratings); (b) same on farm shows scout bands and asserts at least one
   true-rating/trait-name string is ABSENT; (c) overflow entry clickable; (d) slots without a
   resolvable player render as plain text without crashing.
7. OUT OF SCOPE — do not touch: the lot log (`LogItemVM` — needs a `resultText` refactor,
   deferred to the cockpit wave), `WhisperPanel.tsx`, any engine file, the scout cover/reveal
   block, spec docs other than your contract file, session SOT docs
   (SESSION_LOG/CURRENT_STATE/V1_BUILD_STATUS/UI_TRUTH_MAP/MODE1_PUNCHLIST/DECISIONS_LOG).

GATES (all must pass; paste tails): `npx tsc -b --pretty false`; `npm run build`;
`NODE_ENV= npx vitest run` on `AuctionStage.test.tsx` + `LeagueBuilderAuctionDraft.test.tsx` +
`LeagueBuilderFarmAuctionDraft.test.tsx` (find exact paths). Do NOT run the full suite.

Commit message:
`feat(auction): clickable won players + farm on-the-block profile popover [WT-D]` with trailer
`Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

REPORT (final message): branch + worktree path + commit hash; file:line per change; how
revealFull/fog semantics were matched per tier and the privacy test's exact assertions; verbatim
gate tails; surprises. If the code contradicts this contract anywhere, STOP that item and report
the discrepancy instead of improvising.

---

## Build notes (filled in during execution)

### Ground-truth deviations found during verification

- **Farm prospects are NOT `Player` objects.** `playerById` on the farm page
  (`LeagueBuilderFarmAuctionDraft.tsx` ~:320) maps `leagueData.players`, which is the **MLB**
  player pool only (used elsewhere to resolve MLB-won players for the roster analyzer). Farm
  prospects live in a completely separate pool (`auction.pool.prospects`, typed
  `LeagueBuilderProspectPlayerDto` from `src/utils/prospectScoutingDraftEngine.ts`), resolved via
  the page's existing `prospectById` map (~:321-324), NOT `playerById`. `LeagueBuilderProspectPlayerDto`
  is a structurally different DTO from `Player` (narrower/wider unions on `arsenal`, `personality`,
  `chemistry`, `primaryPosition`, etc., and no `createdDate`/`lastModified`), so it cannot be
  passed to `PlayerProfilePopover` directly. Built a page-local, presentational-only adapter
  `prospectToProfilePlayer()` in `LeagueBuilderFarmAuctionDraft.tsx` that maps the DTO's fields onto
  a `Player`-shaped object for popover consumption only (never persisted, never fed to any engine).
  This is safe specifically because `LeagueBuilderProspectPlayerDto.ratingRevealState` is the
  literal `'hidden'` — `buildDraftProfileModel`'s `shouldReveal` gate short-circuits to the
  scout-band branch for every prospect regardless of what `revealFull` is passed or what junk data
  ends up in the adapter's widened fields (arsenal/personality-cast, etc.), since those fields are
  only read on the (never-taken) revealed branch.
- **Farm overflow does not exist.** `AuctionBoardFrame.overflow` (Target 2) is built by
  `buildAuctionBoardFrame` (`src/engines/auctionBoardFrame.ts`), which is MLB-only — the farm
  page's `board` VM never sets an `overflow` field at all. Target 2 (overflow rail) was
  implemented in `AuctionStage.tsx`/`LeagueBuilderAuctionDraft.tsx` (MLB) only; there is no farm
  overflow to wire.
- Confirmed via `src/utils/prospectScoutingDraftEngine.ts`'s `VisibleSafeProspectReport` type
  (the pre-existing "safe fields" contract for prospects) that `chemistry`/`personality` are
  intentionally in the safe-to-show bucket (visible SMB4 card traits, unlike hidden numeric
  ratings) — consistent with `DraftProfileBase` always rendering those chips regardless of reveal
  state. Did not relitigate this; it's baked into the unmodified shared component.

### revealFull semantics per tier

- MLB roster-board slots + overflow: pass `revealFull` (JSX shorthand for `true`), same as
  `WhisperPanel.tsx`'s established pattern for already-resolved roster names. Safe because MLB
  players' `ratingRevealState` is `undefined`/`'revealed'`, never `'hidden'`.
- Farm roster-board slots + on-the-block lot: also pass `revealFull` unconditionally `true` (same
  pattern) — it does not matter, because the adapted prospect's `ratingRevealState` is always the
  literal `'hidden'`, so `shouldReveal` returns `false` regardless of the `revealFull` argument.
  The privacy invariant is enforced entirely by the per-player field, not by a tier-conditional
  boolean at the call site — matching how `WhisperPanel.tsx` already relies on the same gate.

### Files changed

- `src/src_figma/app/components/auction/AuctionStage.tsx` — `RosterSlotVM.player`,
  `BoardVM.overflow[].player`, popover wiring for roster-board `who` + overflow entries, `.who-clickable` class.
- `src/src_figma/styles/auction-theme.css` — `.who-clickable:hover` affordance.
- `src/src_figma/app/pages/LeagueBuilderAuctionDraft.tsx` — `buildStageRosterSlots(frame, playerById)`,
  new `buildStageOverflow(frame, playerById)`, wired into the VM.
- `src/src_figma/app/pages/LeagueBuilderFarmAuctionDraft.tsx` — `prospectToProfilePlayer()` adapter,
  `buildFarmStageSlots(entries, prospectById)`, farm lot VM `player` field.
- Tests: `AuctionStage.test.tsx` (+4 tests), `LeagueBuilderAuctionDraft.test.tsx` (+1 test),
  `LeagueBuilderFarmAuctionDraft.test.tsx` (extended the existing end-to-end test).
