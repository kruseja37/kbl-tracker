# CONTRACT: FLOORREFIT — the table, not a dashboard (2026-07-09)

**Status:** IN PROGRESS — this file is updated in place as the lane executes. The
prompt below is the verbatim dispatch contract this lane is executing against.

---

## VERBATIM DISPATCH PROMPT

You are a builder lane on KBL Tracker (React+TS+Vite). Work ONLY in your assigned worktree on its branch; commit there; do NOT push or merge. Independent audit follows. node_modules if missing: `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules`. Base: main @ c0a24363 (includes CALLFIX + TAXTEETH).

FIRST COMMIT: write this entire prompt verbatim to spec-docs/contracts/CONTRACT_FLOORREFIT_2026-07-09.md and commit before any code change.

READ FIRST (binding, in your worktree): spec-docs/AUCTION_FLOOR_REFIT_2026-07-09.md — the captain-ratified design you are executing EXACTLY; spec-docs/DRAFT_SKIN_STANDARD_2026-07-08.md §1-§2 (tokens/recipes); spec-docs/DRAFT_COCKPIT_DESIGN_2026-07-08.md §2 (tier IA — unchanged by this lane).

═══ LANE: FLOORREFIT — the table, not a dashboard (both auction floors) ═══
Execute the refit doc's §2 layout precisely. Summary of the six moves (the doc governs on any ambiguity):

1. **ON THE CLOCK banner** (left column, above the lot): acting team's Team.colors.primary bg + secondary 5px hard border, hard offset shadow, zero radius; text auto-contrast via relative luminance (chalk on dark, near-black on light — write one tiny helper, test it at both extremes). Copy: "{TEAM NAME} IS ON THE CLOCK" (bid turn) / "{TEAM NAME} TO NOMINATE" (nomination) / "YOU'RE UP — {TEAM NAME}" for the viewer's seat with ONE 300ms scale beat on turn arrival (CSS animation, plays once, no loop; respect prefers-reduced-motion). CPU turns render the existing calm-wait copy INSIDE the band. FALLBACK: if the floor's team record lacks populated colors, brass-on-ink band, same geometry — VERIFY which team record the floors actually hold and whether league-builder clubs carry populated colors; state the finding in the contract; ship the fallback path either way (tested).
2. **Uncage the whisper**: delete BOTH height clamps in WhisperPanel.tsx (the `max-height: min(56vh, 480px); overflow-y: auto` block and the internal `max-height: 190px; overflow-y: auto` board clamp — locate by content, line numbers have drifted). The whisper becomes the right column's natural flow; THE CALL tier gets `position: sticky; top: <sensible offset>` within the column. RESULT LAW: one scroll context — the page; zero nested `overflow-y: auto` on the floor (grep-proof it in the contract).
3. **Delete the duplicated stage seat strip**: the stage-level band(s) above the whisper that render verdict/number/fit + bid-pass ledger/next-odds/grade-band/lights duplicate whisper tiers. ATOM-BY-ATOM protocol (mandatory table in the contract): list every atom the strip renders; map each to its whisper-tier twin (per the wiring audit most already exist in THE CALL/THE READ); any atom with NO twin MOVES into its correct tier (relocation, not deletion — losing information is a REJECT). Then delete the strip surface. Tier-1 of the whisper must render whenever a human seat is active (it IS the call surface now).
4. **High-bid holder swatch**: the holder name next to HIGH BID gains a 4px left border swatch in the holding team's primary color + team abbreviation (fallback: no swatch, name as today).
5. **Market line consolidation**: the three unlabeled public-market boxes + reserve chip become ONE quiet mono line: "MARKET $lo · $mid · $hi — RESERVE $r", CONTESTED chip stays to its right. No number lost.
6. **Roster fill board moves left**: the seat's "N of 22 / gaps" board relocates from the right column's bottom to the LEFT column under the bid controls (today's dead space). Move, don't rebuild.

Both floors (MLB LeagueBuilderAuctionDraft + farm LeagueBuilderFarmAuctionDraft share AuctionStage/WhisperPanel — farm keeps its ratified tier divergences; it gets the banner, uncaging, and layout moves identically).

═══ GUARDRAILS ═══
- LAYOUT ONLY: zero information-architecture changes to whisper tiers (cockpit §2 stands); THE LIVE CALL single-source law untouched (consume worth.liveCall, never re-derive); fog law untouched; no engine files in the diff.
- Skin: ballpark tokens exclusively; the ONLY non-token colors are Team.colors.* used as data.
- Tests: this restructures DOM — testids MOVE WITH their elements (no renames/deletions); update selectors/assertions to the new structure WITHOUT weakening what they assert (every changed assertion justified in the contract); the known getByText-across-siblings pattern may need the textContent-matcher approach used by prior lanes.
- Copy: only the new banner strings above (ALWAYS-class, Text Law); no other copy changes.
- Known batch flake: LeagueBuilderDraftSetup.test.tsx — you should not touch that file; if a change forces it, judge SOLO.

═══ GATES (paste real outputs) ═══
npx tsc -b clean; npm run build exit 0; focused suites: WhisperPanel, AuctionStage, LeagueBuilderAuctionDraft (+ computeBoardAutoAdvanceLine), LeagueBuilderFarmAuctionDraft, plus the new banner/contrast-helper tests. NOT the full suite.

═══ DELIVERABLE ═══
Contract-first commit; then a commit per move (1-6) or sensible grouping; final commit updates the contract with: the atom-by-atom strip table, the colors-populated finding, the nested-scroll grep proof, per-move file:line evidence, gate outputs, honestly-flagged deviations. Final message: summary + hashes + surprises. JK's eye is the acceptance gate — a real browser pass happens after merge; your job is structural fidelity to the ratified doc. UNKNOWN mid-build = STOP and report.

---

## EXECUTION LOG

**Base:** main @ c0a24363 (CALLFIX + TAXTEETH included). **Branch:** `worktree-agent-a4c90074affcd9d1d`.

**Commits (in order):**
1. `c6126303` -- docs(contract): FLOORREFIT dispatch contract, verbatim (this file, first commit)
2. `6f7db2df` -- feat(auction): FLOORREFIT Moves 1+4+5+6 -- the table, not a dashboard
3. `36367515` -- fix(auction): FLOORREFIT Move 2 -- uncage the whisper
4. `b70889ff` -- test(auction): FLOORREFIT gate coverage for Moves 1/4/5/6
5. *(this commit)* -- docs(contract): FLOORREFIT final evidence

---

### Move 3 -- the atom-by-atom strip audit (VERIFICATION FINDING, not a code change)

Per the contract's mandatory protocol, before touching anything I built the full atom table and
grepped the entire floor tree for a second copy of any of it.

**Finding: at the current base (c0a24363), there is no separate stage-level seat-strip surface left
to delete.** CALLFIX (merged at 88c34d30, the design doc's own grounding commit) already promoted
every atom the doc names into WhisperPanel's Tier 1 (`WhisperVerdictStrip`, WhisperPanel.tsx:486-538)
and Tier 2 (`whisper-tier2` section, WhisperPanel.tsx:314-326) -- both rendered always-visible, above
the collapsible `whisper-strip` toggle, exactly matching the design doc's post-refit description
("THE CALL tier ... is the one and only call surface" / "Tier-1 of the whisper must render whenever a
human seat is active -- it IS the call surface now").

Atom-by-atom table:

| Strip atom (per the contract's list) | Twin location | Status |
|---|---|---|
| verdict (PUSH/CAP $X/WALK/ON TOP) | `WhisperVerdictStrip` -> `whisper-tier1-verdict`, WhisperPanel.tsx:499,514-516 | Tier 1, present |
| number (YOUR NUMBER + TRUE COST) | `WhisperVerdictStrip` -> `whisper-tier1-number`/`-truecost`, WhisperPanel.tsx:517-524 | Tier 1, present |
| fit | `WhisperVerdictStrip` -> `whisper-tier1-fit` chip, WhisperPanel.tsx:525-530 | Tier 1, present |
| bid-vs-pass ledger | `CompactBidVsPass`, WhisperPanel.tsx:316,567-582 | Tier 2, present |
| next-position odds | `NominationOddsChip`, WhisperPanel.tsx:321,591-599 | Tier 2, present |
| grade-band ("normal for a B+") | `GradeSanityChip`, WhisperPanel.tsx:322,602-611 | Tier 2, present |
| lights (SHAPE/IDENTITY/CHEMISTRY/BUDGET) | `renderLights("mlb")`, WhisperPanel.tsx:324,247-297 | Tier 2, present |

Grep proof (zero occurrences of any of these components outside WhisperPanel.tsx, across the whole
`src/` tree, tests excluded): `grep -rln "WhisperVerdictStrip\|CompactBidVsPass\|NominationOddsChip\|
GradeSanityChip" src/ --include="*.tsx" --include="*.ts" | grep -v __tests__` -> one file:
`src/src_figma/app/components/auction/WhisperPanel.tsx`. No duplicate strip band exists in
AuctionStage.tsx, the page toolbars, or anywhere else. The AuctionStage `statusbar`'s small
`.team-now` "Now: X" label (AuctionStage.tsx:251-259, pre-refit) is a *different* thing -- the design
doc's own §3 ledger names it explicitly ("Added: one color banner ... previously a small top-right
label") as the surface Move 1's banner replaces/augments, not the Move 3 strip.

**Action taken:** none -- nothing to delete. The Tier-1 visibility rule ("whenever a human seat is
active, tier 1 renders") is already satisfied by the existing `isMlb && worth &&` gate,
WhisperPanel.tsx:306-308. Move 2's sticky positioning (below) is the only further work this tier
needed for the refit.

---

### Move 1 -- colors-populated finding

Verified whether league-builder team records actually carry populated `colors.{primary,secondary}`
(the contract required this before deciding whether the fallback band is the common path or a true
edge case):

- `Team.colors` is a **non-optional** `{ primary: string; secondary: string; accent?: string }` field
  on the canonical Team type, `src/utils/leagueBuilderStorage.ts:196-200`.
- Every construction path populates both fields with real hex, never leaves them undefined: the
  manual "Add Team" form in `LeagueBuilderTeams.tsx` defaults new teams to `#FF6600`/`#000000`
  (line 169-170) and writes `colors: { primary: formData.primaryColor, secondary:
  formData.secondaryColor }` on save (line 618-620); the SMB4-import path's `convertTeam()`
  (`src/utils/leagueBuilderStorage.ts:2309`) pulls `team.primaryColor`/`team.secondaryColor` straight
  from source data.
- **Conclusion:** the design doc's "colors missing/unpopulated" trigger essentially never fires for a
  real league-builder club -- colors are always a valid hex pair (possibly a repeated default if the
  GM never customized it, but never empty/undefined). The fallback band is still built and unit-
  tested (both in `onTheClockBanner.test.tsx` and `AuctionStage.test.tsx`) because the banner's own
  contract is "ship the fallback path either way, tested" -- it fires today only for the genuine edge
  case where no acting/focus team can be resolved at all (status.teamPrimary/teamSecondary then falls
  through to the pre-existing `"var(--ballpark-brass)"`/`"var(--ballpark-chalk)"` defaults, which the
  banner's own hex-validity check (`parseHexColor`) correctly treats as "not real team colors").

---

### Move 2 -- nested-scroll grep proof

Both clamps deleted (`WhisperPanel.tsx` `.whisper-body` max-height/overflow-y at the old
:1317-1318, and `.whisper-board-well` max-height/overflow-y at the old :1781-1782 -- line numbers had
drifted slightly from the design doc's grounding, located by content instead). `.whisper-tier1` (THE
CALL, also reused by the farm bridge strip, rule block WhisperPanel.tsx:1187-1205) gained
`position: sticky; top: 12px; z-index: 3;` (WhisperPanel.tsx:1202-1204).

Full-tree grep after the change -- zero nested scroll containers remain anywhere on the floor:
```
grep -rn "overflow-y\|overflow:\s*auto" \
  src/src_figma/app/components/auction/AuctionStage.tsx \
  src/src_figma/app/components/auction/WhisperPanel.tsx \
  src/src_figma/app/components/auction/onTheClockBanner.tsx \
  src/src_figma/styles/auction-theme.css \
  src/src_figma/app/components/shared/RankReorderList.tsx \
  src/src_figma/app/components/shared/PlayerProfilePopover.tsx

-> src/src_figma/app/components/auction/WhisperPanel.tsx:1787:  /* FLOORREFIT Move 2: ... zero nested
   overflow-y:auto ...  (a code COMMENT, not a live declaration)
```
The only remaining `overflow` rules anywhere in the tree are `overflow: hidden` (clipping on `.lot`,
`.meter`, `.scout`) and `overflow-wrap`/`text-overflow` (word-wrap/ellipsis, not scrolling) --
confirmed by a broader `grep -n "overflow"` pass across the same file set. The page (`.wrap`) is the
one remaining scroll context, per §1.1.

---

### Per-move file:line evidence (the remaining moves)

**Move 1 (ON THE CLOCK banner):**
- New module: `src/src_figma/app/components/auction/onTheClockBanner.tsx` -- `parseHexColor` (:14),
  `onTheClockTextTone` (:34, WCAG relative-luminance), `onTheClockCopy` (:66, the 4-branch ladder),
  `OnTheClockBanner` component (:83).
- Rendered above the lot: `AuctionStage.tsx:269` (`<OnTheClockBanner status={vm.status} />`), inside
  the non-complete fragment only (absent on the handoff-check screen -- nothing is "on the clock"
  there; test-covered).
- VM extension: `AuctionStageVM.status.turnKind?: "bid" | "nomination"` (AuctionStage.tsx:187) and
  `.actingTeamIsCpu?: boolean` (AuctionStage.tsx:191), inside the `status` block (interface starts
  :177).
- MLB page wiring: `nowTeam` extended to resolve during NOMINATION via
  `session.nominationOrder[session.nominationIndex]` (`LeagueBuilderAuctionDraft.tsx:1106-1112`,
  `nominatingTeam`); `nowTeamIsCpu` (:1117) and `nowTurnKind` (:1118-1121) computed independently of
  `move.cpuTurnName`; both threaded into `status` at :1854-1855.
- Farm page wiring: `nowTurnKind` (`LeagueBuilderFarmAuctionDraft.tsx:733-736`),
  `stageFocusTeamIsCpu` (:769, reusing the floor's existing `stageFocusTeam` concept rather than
  inventing a new "who's acting" signal for a floor that never distinguished one); threaded into
  `status` at :836-837.
- CSS: `.otc-banner`/`.otc-team`/`.otc-ink-text` + the `otcArrive` keyframe,
  `auction-theme.css` (new block after `.stage`, ~line 92-121).

**Move 4 (holder swatch):**
- `LotVM.highBid` extended with optional `byTeamPrimary`/`byAbbreviation`, AuctionStage.tsx (LotVM
  interface, ~line 57-64).
- Render: `AuctionStage.tsx:758-773` (the `.by` div, swatch class at :758 + `<b className="by-abbr">`
  at :769, both conditional on `byTeamPrimary`/`byAbbreviation` being present -- absent renders the
  name exactly as before).
- MLB wiring: `LeagueBuilderAuctionDraft.tsx:1877-1878`. Farm wiring:
  `LeagueBuilderFarmAuctionDraft.tsx:881-882`. Both read `teamById.get(lot.highBidder)?.colors.primary`
  / `?.abbreviation`.
- CSS: `.highbid .by.swatch` / `.highbid .by-abbr`, `auction-theme.css` (after `.highbid .by`).

**Move 5 (market line consolidation):**
- `AuctionStage.tsx:673-708` (the `Lot()` function): the 3-box `.market-band` grid + "Public market"
  eyebrow replaced by one `.market-line` div (`aria-label` preserved) reading
  `MARKET $lo · $mid · $hi`, folding in `— {RESERVE label} {reserve $}` (the label isolated in its
  own `<b>` so exact-text test queries for "RESERVE" still resolve) whenever `lot.publicMarket`
  exists; the standalone `.reserve-ask` chip (unchanged JSX) is now gated on `!lot.publicMarket` so a
  reserve with no public-market read (farm) still shows its number.
- CSS: old `.market-band` rules deleted, replaced by `.market-line`/`.market-line-reserve`,
  `auction-theme.css` (~line 99-103).

**Move 6 (roster board relocation):**
- New shared subcomponent `RosterBoardCard` (`AuctionStage.tsx:426`, right after the `AuctionStage`
  function) -- the exact prior board JSX, testids, and classes, lifted once instead of tripled.
- Normal placement: `AuctionStage.tsx:356`, inside the left column's non-complete fragment, after
  `.move` (the bid controls).
- Complete-screen carve-out: `AuctionStage.tsx:365` (`{vm.complete && <RosterBoardCard .../>}`) --
  this exists because the board rendered **independent of `vm.complete`** in the original
  right-column placement (a dedicated WT-D test asserts a rostered player's popover works on the
  complete/handoff screen); nesting it only inside the non-complete fragment broke that behavior on
  first pass -- caught by the pre-existing test suite (see Deviations below), fixed by rendering it a
  second time, keyed off `vm.complete`, rather than losing the coverage.

---

### Gate outputs (paste real, this session)

**`npx tsc -b --clean && npx tsc -b`** -- exit 0, zero output (clean):
```
$ npx tsc -b --clean
$ npx tsc -b
$ echo $?
0
```

**`npm run build`** -- exit 0:
```
$ npm run build
...
✓ 2644 modules transformed.
...
✓ built in ~10-11s
PWA v1.2.0
mode      generateSW
precache  185 entries (5326.29 KiB)
files generated
  dist/sw.js
  dist/workbox-1d305bb8.js
$ echo $?
0
```
(The only build warnings -- chunk-size-over-500kB and a franchisePlayerStorage.ts dynamic/static
dual-import notice -- are pre-existing and unrelated to this diff; unchanged from baseline.)

**Focused suites** (`AuctionStage.test.tsx`, `WhisperPanel.test.tsx`, `onTheClockBanner.test.tsx`,
`LeagueBuilderAuctionDraft.test.tsx`, `LeagueBuilderAuctionDraft.computeBoardAutoAdvanceLine.test.ts`,
`LeagueBuilderFarmAuctionDraft.test.tsx`) -- run together, NOT the full suite, per the contract:
```
 Test Files  6 passed (6)
      Tests  129 passed (129)
```
Baseline (before any FLOORREFIT change, same 5 files minus the not-yet-created
onTheClockBanner.test.tsx): 99 passed. Delta: +30 -- 20 new in onTheClockBanner.test.tsx, 10 new in
AuctionStage.test.tsx (banner x4, swatch x2, market-line x3, board-placement x1); zero tests were
deleted, zero were skipped, zero pre-existing assertions were dropped (two were retargeted at new
but equally-precise DOM content -- see below).

---

### Deviations, honestly flagged

1. **Move 3 produced a verification finding, not a diff.** Documented above in full -- the duplicate
   strip the contract describes had already been consolidated into WhisperPanel's Tier 1/2 by
   CALLFIX before this lane started. Nothing was deleted because there was nothing left to delete;
   the atom-by-atom table and grep proof are the deliverable for this move instead of a commit.
2. **The banner's "generic" (non-viewer, non-CPU) copy branches are real but currently unreachable in
   production.** The app's data model only distinguishes human vs. CPU/shill-controlled teams (no
   separate "this browser's own seat" identity distinct from "whichever human is currently holding
   the device" -- confirmed by WhisperPanel's own HELP_LINE convention: "the club on the clock" already
   means "you" for any human turn). Both floor pages therefore always call the ladder with
   `isViewerSeat: !actingTeamIsCpu`, so `"{TEAM} IS ON THE CLOCK"` / `"{TEAM} TO NOMINATE"` never fire
   today -- every human turn reads "YOU'RE UP." The ladder function itself takes `isViewerSeat` as an
   independent parameter (not derived internally) specifically so it stays correct and unit-testable
   end-to-end if a genuine multi-viewer distinction is ever added, rather than hard-coding the
   collapse. Flagged here rather than silently narrowing the implementation to 2 branches.
3. **Two test assertions were retargeted, not weakened**, both a direct, disclosed consequence of
   Move 5's DOM restructuring (3 boxes -> 1 line): `LeagueBuilderAuctionDraft.test.tsx`'s
   `getByText(/Public market/i)` (an eyebrow that no longer exists -- "MARKET" is the inline label
   now) became `getByText(/^MARKET \$/)`; the CALLFIX Item 5(d) byte-identical band regression guard's
   hardcoded string was updated from the old concatenated-boxes text to the new consolidated-line
   text (same three numbers, same reserve figure this fixture already carried, still an exact
   `.toBe()` match -- re-derived by running the test and reading the actual new `textContent`, not
   guessed).
4. **Roster-board complete-screen carve-out was a real, caught-in-flight regression**, not a design
   choice from the ratified doc's text alone. The doc says the board moves "under the bid controls,"
   which only exist pre-complete; a naive move would have hidden the board on the handoff/complete
   screen, where a dedicated pre-existing WT-D test proved it must stay visible. Fixed by keeping the
   board's render call independent of `vm.complete` (via the shared `RosterBoardCard`), matching prior
   behavior exactly, rather than silently dropping that test's coverage.
5. **No browser-level visual verification was performed by this lane**, per the contract's own scope
   line ("a real browser pass happens after merge; your job is structural fidelity to the ratified
   doc"). Sticky positioning, the arrival animation, and real-world color contrast are asserted
   structurally (CSS present, correct classes/props, luminance math unit-tested) but not eyeballed in
   a live browser by this lane -- that is explicitly JK's gate, not mine.

---

### Summary for the merge/audit pass

Six moves, five commits (contract-first, structural, whisper-uncage, tests, this evidence update).
tsc clean, build green, the six required suites green at 129/129 (up from a 99/99 baseline, zero
regressions, zero deletions). Move 3's "duplicate to delete" turned out to already be gone (CALLFIX
got there first) -- verified with an atom table and a full-tree grep rather than assumed. One real
regression (roster board vanishing from the complete screen) was caught by the pre-existing test
suite mid-build and fixed with a shared subcomponent instead of losing coverage. Team colors are
confirmed always-populated for real league-builder clubs, so the banner's team-colored path is the
common case in practice and the brass-on-ink fallback is defensive, not decorative.

---

## REWORK R1-R3 (captain bounce-back 2026-07-09, post-audit APPROVE-WITH-NOTES)

**Rework commits (on top of the original five):**
- `782c4cb3` -- fix(auction): FLOORREFIT R1 -- retire the duplicated who's-up pill
- `d3d38322` -- fix(auction): FLOORREFIT R2+R3 -- contrast by direct comparison; nomination copy reachable
- *(this commit)* -- docs(contract): R1-R3 evidence

### R1 -- the duplicated who's-up pill is retired

- **Deleted markup:** the `<span className="now team-now">... Now: {nowText}</span>` pill from the
  AuctionStage statusbar (was AuctionStage.tsx:251-259). The pill carried no other content, so the
  whole element is gone per the ruling; an explanatory comment marks the site
  (AuctionStage.tsx:248-252). The phase/lot/roster pills (not who's-up content, not team-colored)
  stay.
- **Deleted CSS (all pill-only, grep-verified before deletion):** `.statusbar .now`, `.team-now`,
  `.team-now span:last-child`, `.live`, and the `aucPulse` keyframe
  (auction-theme.css, replaced by the R1 comment block at :79-82).
- **VM unchanged:** `status.nowText`/`teamName`/`teamPrimary`/`teamSecondary` all remain -- the
  banner consumes every one of them (nowText is the CPU calm-wait copy).
- **Grep proof (post-change):** `grep -rn "team-now|className=\"live\"|aucPulse|statusbar .now"`
  across the auction component tree + auction-theme.css -> only the R1 explanatory CSS comment.
  Team-color surfaces remaining on the floor: the banner (`--otc-bg`, otc CSS block) and the
  high-bid holder swatch (`--holder-color`, auction-theme.css:152-153) -- exactly the two the
  ruling names.
- **Test relocations (relocation-class, not weakenings; both forced by the pill deletion):**
  - `LeagueBuilderAuctionDraft.test.tsx` ("renders open bidding..."): the post-bid waitFor read the
    pill's `/Page (Caps|Keys) — raise or pass/` -- now asserts the same turn-moved information on
    the banner (`YOU'RE UP — PAGE (CAPS|KEYS)` regex, same either-team looseness as before) and
    keeps its second clause (Let-him-go enabled) untouched.
  - `LeagueBuilderFarmAuctionDraft.test.tsx` (obscured-flow test): the post-bid waitFor read the
    pill's `/Farm Keys — raise or pass/` (exact team) -- now asserts
    `YOU'RE UP — FARM KEYS` on the banner, preserving the exact-team specificity.
- **Explicitly out of scope, flagged for the delta audit (three pre-existing surfaces the ruling's
  text could be read against but which are NOT who's-up announcers):**
  1. The SETUP screen's HANDOFF panel "Now: {team} — {action}" line
     (LeagueBuilderAuctionDraft.tsx:~2092): renders only when the stage does NOT (pre-auction setup,
     no banner exists there), styled in ballpark tokens with zero team colors -- it is pass-the-
     device guidance, not a stage duplicate. Untouched.
  2. The complete-screen `handoff-chip` club dots (AuctionStage.tsx:524, auction-theme.css:193):
     club identity on the legality report rows, not turn identity; the complete screen has no
     banner and nobody on the clock. Untouched.
  3. The whisper's seat-color left border (`--whisper-team` on `.whisper-tier1`/`.whisper-strip`):
     marks whose ADVISOR the panel is (cockpit-era seat identity), not who is acting; whisper IA is
     explicitly frozen by this lane's guardrails. Untouched.
  If the captain wants law §1.3 enforced against (2) or (3) as well, that is a separate ruling --
  deliberately not improvised here.

### R2 -- auto-contrast by direct comparison

- **The fix (onTheClockBanner.tsx):** `onTheClockTextTone` (:64-69) now computes the WCAG contrast
  ratio of BOTH candidate tones against the band color and returns the higher --
  `contrastRatio(band, ink) >= contrastRatio(band, chalk) ? "ink" : "chalk"`. The old
  `luminance > 0.5` threshold is gone. New exports: `TEXT_TONE_RGB` (:34 -- ink #1A1A1A / chalk
  #E8E8D8, the literal values behind the `.otc-ink-text` / `.otc-team` CSS, kept in one place so
  the math and the CSS can't drift apart silently), `relativeLuminance` (:40), `contrastRatio`
  (:49, order-independent 1..21).
- **Behavior flips this causes (the point of the ruling):** #FF6600 (the app's DEFAULT team color)
  chalk->ink (~2.4:1 -> ~5.9:1); #4CAF50 chalk->ink (~2.6:1 -> ~6.3:1). Dark navy #001489, white,
  black: unchanged (the threshold happened to get the extremes right).
- **Tests (onTheClockBanner.test.tsx):** a `test.each` palette -- #FF6600, #4CAF50, mid-blue
  #005A9C, pure white, pure black -- asserts for EACH color that (a) the chosen tone's COMPUTED
  contrast ratio >= the rejected tone's (the direct-comparison law itself) and (b) the chosen
  ratio >= 4.5 (WCAG AA, "no unreadable band ever"). Plus WCAG anchor tests (white/black = 21:1
  order-independent, self = 1:1, white lum = 1.0 / black = 0.0) locking the underlying math, the
  named flip cases, and a component-level render asserting #FF6600 now gets `otc-ink-text`.
- **Note on the mid-blue choice:** #005A9C. An earlier candidate (#3B7DD8, the floor's HANDOFF
  blue) fails 4.5:1 against BOTH tones (ink ~4.2:1, chalk ~3.3:1) -- no two-tone system can clear
  AA on every conceivable band color; the palette test asserts the ruling's named palette, and the
  direct-comparison law guarantees the best available tone everywhere else.

### R3 -- nomination copy reachable for humans

- **The fix (onTheClockBanner.tsx:90-95):** the ladder is now three branches, first match wins:
  CPU/unresolvable-name -> calm-wait `nowText` (unchanged); human + `turnKind === "nomination"` ->
  `YOU'RE UP — {TEAM} — NOMINATE`; human otherwise -> `YOU'RE UP — {TEAM}`. The old non-viewer
  branches (`{TEAM} IS ON THE CLOCK` / `{TEAM} TO NOMINATE`) and the `isViewerSeat` parameter are
  DELETED -- they were human-unreachable (every caller passed `isViewerSeat = !actingTeamIsCpu`)
  and the ruling says delete what remains dead. `OnTheClockCopyInput` shrinks accordingly; the
  original contract's deviation note 2 (the unreachable-branches finding) is RESOLVED by this
  ruling.
- **Wiring:** zero page changes needed -- `turnKind: "nomination"` was already threaded on both
  floors in the original build (MLB `nowTurnKind`, LeagueBuilderAuctionDraft.tsx:1118-1121; farm
  `nowTurnKind`, LeagueBuilderFarmAuctionDraft.tsx:733-736), so the NOMINATE variant is live the
  moment a human nomination turn renders.
- **Tests:** both human variants at the ladder level (bid -> `YOU'RE UP — PAGE CAPS`, nomination ->
  `YOU'RE UP — PAGE CAPS — NOMINATE`, no-turnKind -> plain bid form) and a component-level render
  of the NOMINATE variant; CPU copy asserted unchanged for BOTH turnKinds.

### Rework gate outputs (paste real, this session)

**`npx tsc -b`** (after `tsc -b --clean` in the same session) -- exit 0, zero output:
```
$ npx tsc -b
$ echo $?
0
```

**`npm run build`** -- exit 0:
```
$ npm run build
...
BUILD_EXIT=0
PWA v1.2.0
mode      generateSW
precache  185 entries (5325.44 KiB)
files generated
  dist/sw.js
  dist/workbox-1d305bb8.js
```

**The six focused suites** (AuctionStage, WhisperPanel, onTheClockBanner, LeagueBuilderAuctionDraft,
computeBoardAutoAdvanceLine, LeagueBuilderFarmAuctionDraft), run together:
```
 Test Files  6 passed (6)
      Tests  138 passed (138)
```
(Was 129 before the rework: the banner suite grew 20 -> 29 -- the contrast-palette matrix, the WCAG
anchors, and the NOMINATE variants -- and net zero elsewhere: the two relocated page assertions and
the reworked ladder tests replace their predecessors one-for-one.)
