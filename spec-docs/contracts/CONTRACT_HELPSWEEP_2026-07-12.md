# CONTRACT — HELPSWEEP (2026-07-12)

**Lane:** codex/snake-helpsweep · base `beaad38f` (current github/main)
**Builder:** Codex 5.6-sol, high. **Auditor:** opus (independent). **Captain cuts all commits — the builder runs NO git write commands.**

CONFIRMED — this contract IS the captain confirmation the session-start ritual requires. Do not
re-run the ritual; do not wait for further confirmation. Work only in /private/tmp/kbl-helpsweep.

## Mission

Enforce the ratified Help-Button UI Law (SESSION_RULES.md "Help-Button UI Law", commit beaad38f)
across the snake-draft product screens: setup, room, board/desk, trade, farm. Explanatory /
instructional text moves behind a per-screen `?` Help affordance; inline copy is limited to
labels, values, states, and one-line action consequences. Plus the density fixes listed below.
Every string ruling below was made by the captain from a full read-only inventory — execute the
rulings as written; do not re-litigate them. If you find an explainer string NOT listed here,
apply the law yourself and list it in your report.

**EXCLUDED FILES (a parallel live lane owns them — do not touch):**
`src/src_figma/app/pages/SnakeCompanion.tsx`, `src/src_figma/app/components/snake/companion/**`,
`src/src_figma/app/components/SyncModal.tsx`. Also: any change you make to desk/trade component
props must be BACKWARD-COMPATIBLE (new props optional with defaults) because SnakeCompanion.tsx
consumes PrivateDesk/SnakeTradeGuide and you may not edit it.

## The Help affordance pattern (mandatory)

Reuse Pattern B — the one `LeagueBuilderDraftSetup.tsx` already has:
- `const [showHelp, setShowHelp] = useState(false)` (line ~1470), `?` PressButton with HelpCircle
  icon + `aria-pressed` (lines ~4107-4114), and the `HelpNote` block component (lines ~5076-5082).
- **Setup:** the snake setup panels (`SnakeDraftSetupPanels`, rendered ~4866-4873) currently
  ignore `showHelp`. Pass `showHelp` down and gate the relocated setup strings with it, using
  `HelpNote`. Also add a snake-format HelpNote at the seam where line ~4876 currently renders
  auction-only help (`showHelp && !isSnakeFormat`), covering the snake flow (versions → lock →
  room check → GO).
- **The Room:** `SnakeDraftRoomView.tsx` has NO Help affordance. Add one `?` button to the room
  header (same PressButton/HelpCircle style, `aria-pressed`), one `showHelp` state at the room
  view level, and gate relocated room/desk/trade strings behind it (a `HelpNote`-equivalent local
  component is fine; keep styling consistent with the ballpark kit). Desk/trade components
  receive `showHelp` as an OPTIONAL prop defaulting to `false` (companion consumes them without
  the prop — relocated strings there simply stay hidden until the companion lane wires its own
  Help, which is that lane's job).
- Inline `<details>/<summary>` blocks count as progressive disclosure and SATISFY the law —
  leave existing ones (e.g. DeskCandidateCard's WHY THIS READ?, BoardView's YOUR TAX CORE) as-is.

## String rulings — Setup (`src/src_figma/app/components/snake/setup/SnakeDraftSetupAdapter.tsx` + panels)

| Location | String | Ruling |
|---|---|---|
| :420 | "Pick one card for each real person before you lock the pool." | RELOCATE → Help |
| :302 | "Choose each player version, then LOCK POOL. The room check runs on those locked players and prices." | RELOCATE → Help; replace inline with nothing (the panel labels carry the state) |
| :303 | "Checking whether every club can finish a legal 22 with its chosen team identity." | SHORTEN inline to `CHECKING THE ROOM…`; full sentence → Help |
| :413-414 | "{team} picks twice at one turn. {team} picks twice at the next." | RELOCATE → Help (the `R1: 1→n · R2: n→1` state line at :472 stays and is sufficient inline) |
| :435 | "No duplicate player versions in this pool." | KEEP (empty state) |
| :436 | "UNLOCK THE POOL TO CHANGE VERSIONS." | KEEP (one-line action consequence; also test-pinned at `SnakeDraftRoom.registration.integration.test.tsx:236` — do not touch) |
| :480 | "LOCK THE POOL TO CHECK THE ROOM." | KEEP |
| :304, :299, :306 | room-check failed / checking saved draft / finish order first | KEEP (states / one-line consequences) |

## String rulings — Room (`SnakeDraftRoom.tsx`, `SnakeDraftRoomView.tsx`)

| Location | String | Ruling |
|---|---|---|
| SnakeDraftRoom.tsx:280 | "THE FARM PICK TRADE IS RECORDED — SLOT SALARIES STAY WITH THE PICKS." | SPLIT: keep "THE FARM PICK TRADE IS RECORDED." inline; "SLOT SALARIES STAY WITH THE PICKS." → Help |
| SnakeDraftRoom.tsx:504 | "THIS PLAYER CAME FROM YOUR SAVED BOARD ORDER." | RELOCATE → Help |
| SnakeDraftRoom.tsx:635-638 | FITS YOUR BOARD / NOT ON YOUR BOARD variants | KEEP all three (value tag + one-line consequences — decision-critical at pick time) |
| SnakeDraftRoom.tsx:686 | "YOUR {slot} PLAN IS BROKEN — YOUR RANKING HAS NO AVAILABLE NAME." | KEEP (actionable warning) |
| SnakeDraftRoomView.tsx:237 | "PRACTICE MODE — PAUSE AND CORRECTION WORK THE SAME." | SPLIT: keep the `PRACTICE MODE` badge/label inline; the explainer clause → Help |
| SnakeDraftRoomView.tsx:275 | "THE SHARED ROOM STAYS COVERED UNTIL THE CLUB ARMS ITS PICK." | RELOCATE → Help |
| SnakeDraftRoomView.tsx:318 | "ONLY THE LATEST PICK OR TRADE CAN BE UNDONE." | KEEP (one-line action consequence beside the undo control) |
| SnakeDraftRoomView.tsx:346 | "OPEN YOUR BOARD AND CHOOSE A PLAYER." | KEEP (empty-state nudge) |
| :89, :142/:144, :494/:496, :782 | recovery/error/consequence lines | KEEP |

## String rulings — Desk (`src/src_figma/app/components/snake/desk/*`)

| Location | String | Ruling |
|---|---|---|
| BoardView.tsx:39 | "PLAN CUSHION IS THE MONEY LEFT IF THESE 22 ARE STILL THERE." | RELOCATE → Help (term definition) |
| WhatIfSandbox.tsx:44 | same sentence, verbatim duplicate | DELETE (its Help copy lives once, from BoardView's relocation) |
| WhatIfSandbox.tsx:30 | "CHOOSE ONE CHANGE. THE DESK SHOWS THE MONEY. YOU DECIDE." | RELOCATE → Help |
| BoardView.tsx:27 | depth warning "YOUR {slot} SLOT IS DOWN TO DEPTH — {n} LEFT YOU'VE RANKED" | KEEP (actionable warning) |
| BoardView.tsx:44 | tax-core line inside `<details>` | KEEP as-is (already progressive disclosure) |
| DeskCandidateCard.tsx:19,21 | WHY THIS READ details / choose-a-slot line | KEEP as-is |
| AdvisorLog.tsx:11 | "NO ACTION NEEDED RIGHT NOW." | KEEP |

## String rulings — Trade (`src/src_figma/app/components/snake/trade/*`)

| Location | String | Ruling |
|---|---|---|
| SnakeCommissionerTrade.tsx:67 | "BOTH GMS AGREE IN THE ROOM. THE COMMISSIONER CHECKS THE GUIDE, THEN MAKES THE TRADE OR SAYS NO." | RELOCATE → Help |
| SnakeTradeGuide.tsx:39 | "CHOOSE A PICK. THE GUIDE CHECKS THE PRICE AND MAKES SURE BOTH CLUBS CAN STILL FINISH THEIR TEAMS." | RELOCATE → Help |
| SnakeTradeGuide.tsx:52 | "ENTER THE PICK NUMBER YOU WANT." | DELETE (restates the adjacent label) |

## Density fixes (all in-scope)

1. `SnakeTradeGuide.tsx:69` — remove the hardcoded `open` attribute on the FULL POSTED PRICE
   CHART `<details>` (collapsed by default).
2. Setup order panel — resolved by relocating :413-414 (the R1/R2 state line stays alone).
3. Desk BOARD tab — resolved by the BoardView relocation + WhatIfSandbox duplicate deletion.
4. Room double-wired trade guide (PrivateDesk GUIDE tab + commissioner room tool): LEAVE AS-IS
   (they never render simultaneously; captain ruling). The companion-side duplicate is the other
   lane's fix.
5. Farm desk: no changes (both lines KEEP).

## Gates (run and paste real output)

1. `npx tsc --noEmit` clean; `npm run build` exit 0.
2. Owned suites green: every snake test file (`SnakeDraftRoomView.test.tsx`,
   `SnakeTradeGuide.test.tsx`, `LeagueBuilderSnakeDraft.test.tsx`, `SnakeDraftRoom.*.test.tsx`,
   `SnakeDraftSetupAdapter.test.tsx`, `SnakeDraftSetup.route.test.tsx`,
   `LeagueBuilderDraftSetup*` family) — note the LeagueBuilderDraftSetup family is
   characterized-flaky under machine load: any of ≤3 solo attempts fully green counts, for those
   PRE-EXISTING files only, never for tests you add/change.
3. Add at least one test proving the new Room `?` Help toggle: relocated string absent by
   default, present after toggling help on (querying with the toggle activated).
4. One full `npx vitest run` at the end (same flake protocol, characterized files only:
   LeagueBuilderDraftSetup family, franchiseManualSmokeFixture, franchiseOffseasonGuards,
   RosterDesigner, EliminationTeamHub).
5. AUCTION FIREWALL: zero behavior change on the auction path — the auction setup/room suites
   must be green untouched; you may not edit any auction-only file.

## Report format

Append `## BUILDER REPORT` to THIS file: complete relocated-string list (before-location →
after-surface), density fixes applied, files touched, gate outputs pasted (real terminal text),
uncertainties. Then print `HELPSWEEP-COMPLETE-$(hostname -s)` as the last line of your run.

## STOP rules

Mid-build surprise, a string whose relocation breaks a test not listed here, or any need to touch
excluded files = STOP and report under `## BUILDER STOP`; do not improvise.

## BUILDER REPORT

**Status:** COMPLETE. The contracted Help-Button UI Law sweep is implemented in this tree. No git
write commands were run. No excluded file or auction-only file was edited. The pre-existing untracked
`run_lane.sh` remains untouched.

### Relocated strings (before location → Help surface)

- `SnakeDraftSetupAdapter.tsx` VERSIONS inline → setup `showHelp` / `HelpNote`:
  `Pick one card for each real person before you lock the pool.`
- `SnakeDraftSetupAdapter.tsx` readiness inline → setup VERSIONS `showHelp` / `HelpNote`:
  `Choose each player version, then LOCK POOL. The room check runs on those locked players and prices.`
  The unlocked readiness explainer is now absent inline.
- `SnakeDraftSetupAdapter.tsx` checking inline → setup READINESS `showHelp` / `HelpNote`:
  `Checking whether every club can finish a legal 22 with its chosen team identity.` Inline now reads
  `CHECKING THE ROOM…`.
- `SnakeDraftSetupAdapter.tsx` ORDER inline → setup ORDER `showHelp` / `HelpNote`:
  `{team} picks twice at one turn. {team} picks twice at the next.`
- `LeagueBuilderDraftSetup.tsx` snake entry seam → setup `showHelp` / `HelpNote`: added the mandated
  snake-flow sequence covering versions → lock → room check → GO.
- `SnakeDraftRoom.tsx` farm trade receipt → Room Help note:
  `SLOT SALARIES STAY WITH THE PICKS.` Inline receipt now reads
  `THE FARM PICK TRADE IS RECORDED.`
- `SnakeDraftRoom.tsx` candidate private note → Room Help note:
  `THIS PLAYER CAME FROM YOUR SAVED BOARD ORDER.`
- `SnakeDraftRoomView.tsx` practice banner clause → Room Help note:
  `PAUSE AND CORRECTION WORK THE SAME.` Inline keeps only `PRACTICE MODE`.
- `SnakeDraftRoomView.tsx` review-state explainer → Room Help note:
  `THE SHARED ROOM STAYS COVERED UNTIL THE CLUB ARMS ITS PICK.`
- `BoardView.tsx` inline term definition → private desk Help:
  `PLAN CUSHION IS THE MONEY LEFT IF THESE 22 ARE STILL THERE.`
- `WhatIfSandbox.tsx` inline explainer → private desk Help:
  `CHOOSE ONE CHANGE. THE DESK SHOWS THE MONEY. YOU DECIDE.`
- `SnakeCommissionerTrade.tsx` inline explainer → Room Help-propagated commissioner tool Help:
  `BOTH GMS AGREE IN THE ROOM. THE COMMISSIONER CHECKS THE GUIDE, THEN MAKES THE TRADE OR SAYS NO.`
- `SnakeTradeGuide.tsx` inline explainer → Room Help-propagated guide Help:
  `CHOOSE A PICK. THE GUIDE CHECKS THE PRICE AND MAKES SURE BOTH CLUBS CAN STILL FINISH THEIR TEAMS.`

No additional unlisted explainer string requiring relocation was found in the contracted surfaces.
Existing `<details>` progressive-disclosure copy was left in place as instructed.

### Density fixes applied

- Deleted the duplicate PLAN CUSHION definition from `WhatIfSandbox.tsx`; the definition now lives
  once in Board Help.
- Deleted `ENTER THE PICK NUMBER YOU WANT.` from `SnakeTradeGuide.tsx`.
- Removed the hardcoded `open` attribute from FULL POSTED PRICE CHART, so it starts collapsed.
- Setup ORDER now leaves the R1/R2 state line alone inline; the double-pick explanation is Help-only.
- Left the non-simultaneous room/desk trade-guide wiring and farm desk copy unchanged per captain ruling.

### Files touched

- `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx`
- `src/src_figma/app/pages/SnakeDraftRoom.tsx`
- `src/src_figma/app/components/snake/SnakeDraftRoomView.tsx`
- `src/src_figma/app/components/snake/__tests__/SnakeDraftRoomView.test.tsx`
- `src/src_figma/app/components/snake/setup/SnakeDraftSetupAdapter.tsx`
- `src/src_figma/app/components/snake/desk/PrivateDesk.tsx`
- `src/src_figma/app/components/snake/desk/BoardView.tsx`
- `src/src_figma/app/components/snake/desk/WhatIfSandbox.tsx`
- `src/src_figma/app/components/snake/trade/SnakeTradeGuide.tsx`
- `src/src_figma/app/components/snake/trade/SnakeCommissionerTrade.tsx`
- `spec-docs/contracts/CONTRACT_HELPSWEEP_2026-07-12.md` (this report only)

Desk/trade `showHelp` props are optional and default false. Room content slots remain backward-compatible:
existing React nodes still render unchanged, while the main room may supply a help-aware render function.

### Gate outputs (real terminal text)

`npx tsc --noEmit` and diff hygiene:

```text
TSC_EXIT=0
DIFF_CHECK_EXIT=0
```

`npm run build`:

```text
dist/assets/LeagueBuilderDraftSetup-BzZtlT29.js             164.43 kB │ gzip:  45.84 kB
dist/assets/GameTracker-CTitIF3-.js                         722.09 kB │ gzip: 195.40 kB
dist/assets/index-77XURVuv.js                             1,157.29 kB │ gzip: 253.67 kB
✓ built in 28.80s

PWA v1.2.0
mode      generateSW
precache  200 entries (5551.14 KiB)
files generated
  dist/sw.js
  dist/workbox-1d305bb8.js
```

Required Room Help-toggle proof plus directly affected suites:

```text
✓ src/src_figma/app/components/snake/trade/__tests__/SnakeTradeGuide.test.tsx (3 tests)
✓ src/src_figma/app/components/snake/desk/__tests__/PrivateDesk.test.tsx (2 tests)
✓ src/src_figma/app/components/snake/__tests__/SnakeDraftRoomView.test.tsx (15 tests)
✓ src/src_figma/__tests__/pages/SnakeDraftSetupAdapter.test.tsx (4 tests)

Test Files  4 passed (4)
     Tests  24 passed (24)
```

Owned snake + LeagueBuilderDraftSetup batch:

```text
Test Files  2 failed | 32 passed (34)
     Tests  2 failed | 224 passed (226)
Duration  128.06s
```

Both failures were timeouts in characterized pre-existing LeagueBuilderDraftSetup files. Each file
then passed fully green solo, satisfying the contract's any-of-≤3-solo-attempts rule:

```text
Test Files  1 passed (1)
     Tests  16 passed (16)
Duration  52.28s

Test Files  1 passed (1)
     Tests  21 passed (21)
Duration  57.65s
```

Auction firewall (auction files untouched):

```text
Test Files  5 passed (5)
     Tests  77 passed (77)
Duration  7.25s
```

Final full suite:

```text
Test Files  1 failed | 657 passed | 8 skipped (666)
     Tests  1 failed | 9768 passed | 15 skipped (9784)
Duration  249.44s
```

The one full-suite failure was in the explicitly characterized
`LeagueBuilderDraftSetup.poolLock.test.tsx` family. Its complete 21/21 solo-green output above is the
contracted pass. A later additional solo retry under machine load flaked a different test in the same
file (`1 failed | 20 passed`); this does not invalidate the earlier fully green solo attempt under the
captain's stated rule, and it is disclosed here for the auditor.

### Uncertainties / residual notes

- No product-behavior uncertainty found. The only residual is the already-characterized
  LeagueBuilderDraftSetup machine-load flakiness described above.
- Vite emitted its existing large-chunk warning; the build completed and generated the PWA assets.
- Browser/manual visual verification was not a contracted gate; independent Opus audit and JK
  acceptance remain outside this builder report.

## AMENDMENT 1 (captain, 2026-07-12) — ROOM LAYOUT INVERSION (JK ruling; build as pass 2)

JK ruling (verbatim intent): the commissioner/ceremony panel dominates the room page horizontally
and stretches down the page; unacceptable. THE TEAM'S DRAFT BOARD IS THE FOCUS OF THE PAGE — it
gets the primary real estate and must be easily viewed and manipulated.

Current defect (`SnakeDraftRoomView.tsx:264-376`): the grid is `xl:grid-cols-[1.5fr_1fr]` with the
"Draft ritual" section (the shared announce/ceremony stage) in the 1.5fr PRIMARY column, while the
ENTIRE private desk (PrivateDesk: board, rankings, candidates, what-if, guide) plus the club lens
are crammed into the 1fr aside. Below `xl` it collapses to one column with the ritual FIRST,
pushing the desk below the fold.

Captain's design (execute exactly):
1. **Invert the grid:** `xl:grid-cols-[1fr_400px]` (desk primary ~70%+, rail fixed ≈400px).
   - PRIMARY (left): the "YOUR PRIVATE DRAFT DESK" section (reveal/cover semantics unchanged —
     when covered it is the full-width panel with the REVEAL button).
   - RAIL (right): the Draft ritual panel (compacted, below) THEN the Club lens panel.
2. **DOM order = desk first** so the sub-`xl` single-column flow shows the board at the top and
   the ritual/lens below it.
3. **Make the rail sticky and self-sized:** the rail wrapper gets `xl:sticky xl:top-4 self-start`
   so the ceremony panel no longer stretches to match the desk's height ("extends down the page
   as you scroll").
4. **Compact the ritual panel** (it is a status/ceremony card now, not a stage): reduce
   `min-h-64`/`min-h-80` to ~`min-h-36`/`min-h-44`, the 24×24 ritual logo to ~14×14 (h-14 w-14),
   headline text sizes down one step (3xl→xl, 4xl→2xl, 2xl→lg), and the oversized paddings
   (p-8→p-4). ALL phase logic, button behavior, copy, and test-pinned strings stay byte-identical
   — this is layout/sizing only.
5. **No change** to: header controls row, draft-order strip, room-tool toggle section, recent-picks
   ticker, pass-cover overlay, reveal/cover privacy semantics.
6. Preserve pass-1 (help-button/density) work — this builds ON TOP of your pass-1 tree.

Gate additions: re-run tsc/build + the room suites (`SnakeDraftRoomView.test.tsx`,
`SnakeDraftRoom.*.test.tsx`); update any layout-structural test expectations deliberately and list
them. Append `## BUILDER REPORT 2` and print the marker `HELPSWEEP2-COMPLETE-$(hostname -s)`.

## BUILDER REPORT 2

**Status:** COMPLETE. The room layout inversion is implemented on top of the pass-1 Help sweep.
No git write commands were run. No excluded, auction-only, companion, or pass-1-owned behavior was
changed.

### Room layout inversion

- Made `YOUR PRIVATE DRAFT DESK` the first DOM child and primary left column, so it also renders
  before the ritual on sub-`xl` single-column screens.
- Changed the wide-room grid from `xl:grid-cols-[1.5fr_1fr]` to
  `xl:grid-cols-[1fr_400px]`.
- Moved Draft ritual above Club lens in the right rail and made the rail self-sized and sticky with
  `self-start xl:sticky xl:top-4`.
- Compacted the ritual review state from `min-h-64` / `text-3xl` to
  `min-h-36` / `text-xl`.
- Compacted the ARM / ANNOUNCE / RECORDED card from `min-h-80 p-8` to
  `min-h-44 p-4`, reduced the ritual logo from `h-24 w-24` to `h-14 w-14`, reduced the selection
  headline from `text-2xl` to `text-lg`, and reduced the recorded player headline from `text-4xl`
  to `text-2xl`.
- Compacted the correction card from `py-8` / `text-2xl` to `py-4` / `text-lg`.
- Preserved all phase logic, controls, copy, Help behavior, draft-order strip, room-tool section,
  recent-picks ticker, pass-cover overlay, and reveal/cover semantics.

### Files touched in pass 2

- `src/src_figma/app/components/snake/SnakeDraftRoomView.tsx`
- `src/src_figma/app/components/snake/__tests__/SnakeDraftRoomView.test.tsx`
- `spec-docs/contracts/CONTRACT_HELPSWEEP_2026-07-12.md` (this report only)

### Deliberate structural test update

Added one `SnakeDraftRoomView.test.tsx` regression test proving the private desk precedes the ritual
in DOM order, the wide grid is `1fr / 400px`, the rail is sticky and self-sized, and the review / ritual
card uses the amended compact dimensions. No pre-existing expectation needed alteration.

### Gate outputs (real terminal text)

`npx tsc --noEmit`:

```text
EXIT_CODE=0
```

Room suites (`SnakeDraftRoomView.test.tsx` and every `SnakeDraftRoom.*.test.tsx`):

```text
✓ src/src_figma/app/components/snake/__tests__/SnakeDraftRoomView.test.tsx (16 tests) 1170ms
✓ src/src_figma/__tests__/pages/SnakeDraftRoom.farm.test.tsx (1 test) 277ms
✓ src/src_figma/__tests__/pages/SnakeDraftRoom.performance.test.tsx (2 tests) 1003ms
✓ src/src_figma/__tests__/pages/SnakeDraftRoom.registration.integration.test.tsx (2 tests) 5701ms

Test Files  4 passed (4)
     Tests  21 passed (21)
Duration  8.44s
EXIT_CODE=0
```

`npm run build`:

```text
dist/assets/SnakeDraftRoom-Bh3j2FX3.js                       50.31 kB │ gzip:  15.69 kB
dist/assets/LeagueBuilderDraftSetup-DrbYJnNK.js             164.43 kB │ gzip:  45.84 kB
dist/assets/GameTracker-BXJBlEsd.js                         722.09 kB │ gzip: 195.40 kB
dist/assets/index-rUebF3Fx.js                             1,157.29 kB │ gzip: 253.67 kB
✓ built in 20.39s

PWA v1.2.0
mode      generateSW
precache  200 entries (5551.21 KiB)
files generated
  dist/sw.js
  dist/workbox-1d305bb8.js
EXIT_CODE=0
```

Diff hygiene and pass-1 preservation grep:

```text
git diff --check: clean
old room grid / ritual sizing tokens: absent
new desk-first grid / sticky rail / compact ritual tokens: present
pass-1 Room Help strings: present
EXIT_CODE=0
```

### Uncertainties / residual notes

- No product-behavior uncertainty found in the contracted scope.
- Vite emitted its existing Browserslist age, mixed dynamic/static import, and large-chunk warnings;
  the build completed successfully and generated the PWA assets.
- Browser/manual visual acceptance was not an Amendment 1 gate; independent audit and JK browser
  acceptance remain outside this builder report.
