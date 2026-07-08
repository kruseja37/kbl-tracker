# CONTRACT: RESKIN SWEEP — one premium-retro hard-edge skin, draft journey A-to-Z

**Date:** 2026-07-08 · **Builder:** Claude (reskin lane, isolated worktree) · **Auditor:** pending (adversarial audit before merge)
**Standard:** `spec-docs/DRAFT_SKIN_STANDARD_2026-07-08.md` (binding — §1 token canon, §2 component recipes, §3 conformance map, §4 guardrails, §5 resolved forks, §6 sequencing)
**Merge owner:** captain merges to main after adversarial audit. JK's browser feel-pass is the acceptance gate for this lane.

## Scope
Deliver one premium-retro hard-edge skin across the entire Mode-1 draft journey:
EndOfDraftStaffing → ArchetypePicker → LeagueBuilderDraftSetup → RosterDesigner →
LeagueBuilderAuctionDraft / LeagueBuilderFarmAuctionDraft (chrome + live bidding stage:
AuctionStage + WhisperPanel + auction-theme.css) → cleanup of the orphaned Ballpark
component-kit duplicates.

## Build order (commit sequence)
1. **CANON FIRST** — new tokens in `ballpark-kit.css` (warn-panel/border/text,
   boost-green, sacrifice-red, card-active); `.ballpark-press-gold` → RULED CTA spec
   (brass bg, `#D4B863` hover, `#1A1A1A` text, 5px chalk border, 4px hard shadow,
   active:scale-95); repoint stale exemplars `EndOfDraftStaffing.tsx` +
   `ArchetypePicker.tsx` from pre-flip bare hex to `var(--ballpark-*)`; EndOfDraftStaffing
   inputs upgrade to the standard's input recipe; regenerate the ArchetypePicker snapshot.
2. **CHROME SWEEP** — `LeagueBuilderDraftSetup.tsx` literal debt (color-flip-spec §4.6
   list + warn-banner block + zone-3 accent literals) → tokens; `RosterDesigner.tsx`
   stray literal + border-weight consistency; `LeagueBuilderAuctionDraft.tsx` pre-session
   chrome (page bg, stat tiles, title plate, HANDOFF blue) → tokens; shared warn-banner
   blocks in all three files → the new warn tokens.
3. **THE STAGE CONVERSION** (JK's one-language ruling) — convert the live bidding UI on
   both floors (AuctionStage, WhisperPanel, auction-theme.css) from soft-premium to
   hard-edge: flat surfaces, zero border-radius, 2-4px borders, hard offset shadows.
   Treatments only — no class renames, no DOM restructuring, no copy changes, all
   data-testids and bespoke selectors stay intact.
4. **CLEANUP** — delete the orphaned duplicate Ballpark component kit
   (BallparkShell/Panel/Button/Modal/FeedCard.tsx + their test files); BallparkKit.tsx
   (the live barrel) stays.

## Known test couplings (handle deliberately)
- `LeagueBuilderDraftSetup.test.tsx` asserts the literal token name
  `--ballpark-status-green` in a class string — must survive.
- `ArchetypePicker.test.tsx` B4 does a full-DOM snapshot — regenerate deliberately,
  diff-verify only hex→token substitutions.
- `RosterDesigner.test.tsx` couples to `min-w-0 truncate` layout classes — don't restructure.
- Farm/MLB page tests use `data-testid` hooks — stable, don't touch.

## Forbidden
`FranchiseSetup.tsx` (JK ruled OUT — separate franchise pass), GameTracker/useGameState,
engines, copy/string changes anywhere, DOM restructuring, PlayerProfilePopover internals,
SOT session docs.

## Gates
`npx tsc -b --pretty false`; `npm run build`; focused suites only (not the full baseline):
EndOfDraftStaffing, ArchetypePicker (post-regen), LeagueBuilderDraftSetup (solo — documented
batch flake), RosterDesigner, LeagueBuilderAuctionDraft, LeagueBuilderFarmAuctionDraft,
WhisperPanel, AuctionStage, RankReorderList.
