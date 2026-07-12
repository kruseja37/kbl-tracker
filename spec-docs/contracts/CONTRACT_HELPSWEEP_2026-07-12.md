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
