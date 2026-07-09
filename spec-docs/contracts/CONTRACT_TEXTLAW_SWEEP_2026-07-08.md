LANE: TEXTLAW-SWEEP (JK ruling 2026-07-08, escalated to immediate: "hide it behind the help button and i'll click help if i want to know the details; clean up the page, it's hideous with all that explanatory text")

## ITEM A — The Text Law sweep (the ratified classification in DRAFT_SKIN_STANDARD §7 is the spec; execute it exactly)

IMPORTANT: the line numbers in §7 were captured before a later change grew LeagueBuilderDraftSetup.tsx by ~216 lines. Locate every string BY CONTENT, not by line number. Copy relocates VERBATIM — this is relocation, never rewording. Test-characterized (LOCKED) strings keep byte-identical content; their test assertions update to assert in the help-open state.

A1. GATE BEHIND HELP (move each string so it renders ONLY when the screen's Help is open):
- src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx: the universe-sources explainer; the pool-quality explainer (LOCKED); the room-check explainer (LOCKED); both Cap Fit methodology lines (LOCKED). If the DraftSetup screen has no Help affordance, it gains ONE top-right Help button (consistent journey-wide placement); gated content renders in the help-open state, grouped sensibly by section.
- src/src_figma/app/components/ArchetypePicker.tsx (or its actual path — find it): both identity explainer paragraphs (~:172-174). Wire the PARENT's existing showHelp prop through — do NOT add a second Help button on the picker itself.
- src/src_figma/app/components/auction/AuctionStage.tsx: the farm fog line (~:649) and both scout-band legend lines (~:619 and ~:708) — ruled Help-class; NO new collapse mechanism.
- src/src_figma/app/components/EndOfDraftStaffing.tsx (find actual path): the instruction banner (~:216) moves behind Help; this page GAINS its own top-right Help button.

A2. SPLIT (dynamic number stays visible; static lecture clause gates behind Help):
- The Cap Fit fused line: the dynamic {summary} stays put; the static "Pool quality and salary cap are separate…" clause moves behind Help.
- The design-first stray notice: the dynamic {N}+names warning stays put; the "a drawn pool contains only what the draw picked" explanation clause moves behind Help.

A3. REVERSE FIX: the AuctionStage phase-label pill (~:220) is ALWAYS-class content wrongly hidden behind Help today — make it permanently visible.

A4. DO NOT TOUCH (ruled ALWAYS — stay exactly where they are): hub card subtitles (the hub gets NO Help button); all state-triggered warnings/banners (overflow rail, stale-pool, legality, settle/handoff confirmations including their rule clauses); CPU-turn fallback text; the farm need-line; empty states; and the new draft-readiness panel (data-testid="draft-readiness-panel") — that panel is ALWAYS-class by ruling.

A5. NO situational/collapse mechanism anywhere this sweep. Tutorial → Help; always → visible; nothing gets a new expander.

Help button visual: follow the skin standard — hard-edge, ballpark tokens (§2 recipes; link affordance = 11px brass + hover:underline, or a small hard-edge button consistent with existing Help affordances on the auction stage — match whatever the journey already uses, don't invent a third style).

## ITEM B — whisper-board-* CSS (fold-in)
The live draft-room board (WhisperPanel THE BOARD tier) shipped with whisper-board-* class names that have NO CSS rules yet (search src/src_figma/styles/auction-theme.css and the component). Style them to the hard-edge standard: ballpark-kit.css vars ONLY (`var(--ballpark-*)`), thick borders, hard offset shadows, zero border-radius, per DRAFT_SKIN_STANDARD §1/§2. No bare hex. Keep class names and DOM exactly as-is — CSS only.

## ITEM C — cross-club pending-rank save race (audit finding fold-in, repro-first MANDATORY)
In src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx, pendingBoardRankOverrides is a single slot with a ~500ms debounce. Bug: reorder club A's board → switch clubs → reorder club B within the debounce window → B's pending overwrites A's unflushed pending and the effect cleanup clears A's timer → A's last edit is silently never persisted.
- FIRST write the failing test (edit A, switch, edit B inside the window → assert BOTH clubs' overrides persist) and run it to show it fails on unmodified code. Capture that output in the contract file.
- THEN fix: flush the outgoing club's pending before accepting a different club's pending (the sibling RosterDesigner already does this — see its passing test "flushes an edited outgoing club before loading another club"; mirror that pattern).
- Do NOT touch the debounce timing, the flush-on-unmount/tab-hide paths, or the live auction page's pending (it's single-seat, not affected).

## GUARDRAILS
- No engine/math changes. rosterIntelligencePayload.ts and all src/engines/** are OFF-LIMITS.
- No DOM restructuring beyond what relocation requires; existing data-testid hooks stable (new Help affordances may add new testids).
- The ArchetypePicker full-DOM snapshot WILL change — regenerate it deliberately and say so in the contract (this is a documented mandatory step, not a fixup).
- Known batch flake: LeagueBuilderDraftSetup.test.tsx must be judged SOLO (run alone), never in a batch.

## GATES (all must pass; paste real output in the contract file)
1. npx tsc -b — clean
2. npm run build — exit 0
3. Focused suites: RankReorderList, RosterDesigner, WhisperPanel, LeagueBuilderAuctionDraft (+ computeBoardAutoAdvanceLine), LeagueBuilderFarmAuctionDraft, RankYourBoardZone, ArchetypePicker (with regenerated snapshot), EndOfDraftStaffing tests if they exist, and LeagueBuilderDraftSetup.test.tsx SOLO.
Do NOT run the full vitest suite — the captain runs one full pass post-merge.

## DELIVERABLE
Everything committed on your worktree branch (contract first, then work; logical commits fine). Final commit updates the contract file with: per-item file:line evidence, the Item C failing-then-passing repro output, gate outputs (exit codes + pass counts), and any deviations honestly flagged. Your final message: summary + commit hash(es) + any surprises. A surprise or UNKNOWN mid-build = STOP and report, do not improvise scope.

---

## EXECUTION EVIDENCE (2026-07-08, post-build)

Commits on this worktree branch (`worktree-agent-aa929ccdf455e9315`, based on `fb3c9fd9`):
1. `fe3d98d3` — contract landed first.
2. `93317821` — Item C fix (repro-first).
3. `72a3a9b2` — Item A (Text Law sweep).
4. `712126b2` — Item B (whisper-board CSS).

### ITEM C — repro-first evidence

**Failing run on unmodified code** (test added at `LeagueBuilderDraftSetup.test.tsx`, describe block "BOARDFIX2: instant reorders with debounced persistence (Item C)", test name "TEXTLAW-SWEEP Item C repro: an unflushed edit from an outgoing club must not be dropped when a different club's edit lands inside the same debounce window"):

```
 FAIL  src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.test.tsx > LeagueBuilderDraftSetup > BOARDFIX2: instant reorders with debounced persistence (Item C) > TEXTLAW-SWEEP Item C repro...
AssertionError: expected "vi.fn()" to be called with arguments: [ ObjectContaining{…} ]

Received:
  1st vi.fn() call:
  [
-   ObjectContaining {
+   {
+     "abbreviation": "TEAM-B",
      "boardRankOverrides": {
        "global": [
          "star-ss",
-         "mid-ss",
          "high-ss",
          "low-ss",
+         "mid-ss",
          "weak-ss",
        ],
      },
-     "id": "team-a",
+     "id": "team-b",
      ...
    },
  ]
Number of calls: 1
```
saveTeam was called exactly ONCE, only for team-b -- team-a's edit was silently dropped, exactly as the bug predicts. (Full raw terminal output captured during the session; reproduced here verbatim minus fixture noise.)

**After the fix** (same test, unmodified assertions):
```
 ✓ src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.test.tsx (88 tests | 86 skipped) 1303ms
     ✓ a burst of 5 rapid moves calls saveTeam ONCE after the debounce settles, not once per move 769ms
     ✓ TEXTLAW-SWEEP Item C repro: an unflushed edit from an outgoing club must not be dropped when a different club's edit lands inside the same debounce window 533ms
 Test Files  1 passed (1)
      Tests  2 passed | 86 skipped (88)
```
Both the repro AND the sibling "5 rapid moves = 1 save" regression test pass -- no double-flush regression introduced.

**Fix mechanism**: `LeagueBuilderDraftSetup.tsx:2769-2802`. `pendingBoardRankOverridesRef.current = pendingBoardRankOverrides` moved from inside a `useEffect` to a plain statement in the render body (line 2775) -- mirrors `RosterDesigner.tsx:339`'s `renderedTeamIdRef.current = team.id` pattern, so the ref is current-as-of-THIS-render by the time any effect cleanup runs in the same commit. The debounce effect's cleanup (line 2796-2801) now checks that ref: if it points at a pending edit for a DIFFERENT club than the outgoing effect instance closed over, it flushes the outgoing club's edit immediately instead of silently discarding it. Guarded with an explicit non-null + team-id compare so the normal self-clear-after-successful-save path (ref becomes null) does not trigger a duplicate flush.

### ITEM A — per-sub-item file:line evidence (post-edit line numbers; content-located per the contract's own warning about stale §7 line numbers)

| Sub-item | File:line | Class |
|---|---|---|
| Universe-sources explainer | `LeagueBuilderDraftSetup.tsx:3755` | Help-gated |
| Pool-quality explainer (LOCKED) | `LeagueBuilderDraftSetup.tsx:4503` | Help-gated, byte-identical |
| Room-check explainer (LOCKED) | `LeagueBuilderDraftSetup.tsx:3565` | Help-gated, byte-identical |
| Cap Fit methodology line 1 (LOCKED) | `LeagueBuilderDraftSetup.tsx:3525` | Help-gated, byte-identical |
| Cap Fit methodology line 2 (LOCKED) | `LeagueBuilderDraftSetup.tsx:3528` | Help-gated, byte-identical |
| Cap Fit fused line (SPLIT) | `LeagueBuilderDraftSetup.tsx:3533-3534` | `{summary}` always-visible; static clause Help-gated |
| Design-first stray notice (SPLIT) | `LeagueBuilderDraftSetup.tsx:3705-3706` | `{N} + names` always-visible; explanation clause Help-gated |
| ArchetypePicker identity paragraphs | `ArchetypePicker.tsx:175-181` | Help-gated via new `showHelp` prop (parent-wired, `LeagueBuilderDraftSetup.tsx:4163`), no second Help button |
| AuctionStage farm fog line | `AuctionStage.tsx:653-657` | Help-gated via existing local `helpOpen`, threaded to `Lot` |
| AuctionStage scout-band legend (public market) | `AuctionStage.tsx:621-624` | Help-gated |
| AuctionStage scout-band legend (scout report) | `AuctionStage.tsx:713-715` | Help-gated via `helpOpen` threaded to `ScoutBody` |
| AuctionStage phase-label pill (REVERSE FIX) | `AuctionStage.tsx:222` | Always-visible (was `{helpOpen && ...}`, now unconditional) |
| EndOfDraftStaffing instruction banner + new Help button | `EndOfDraftStaffing.tsx:87, 218-226, 230-234` | New `showHelp` state + top-right Help button; banner Help-gated |

DO-NOT-TOUCH items (A4) verified untouched: hub card subtitles, all state-triggered warnings/banners (overflow rail, stale-pool, legality, settle/handoff confirmations), CPU-turn fallback text, farm need-line, empty states, `draft-readiness-panel` (still unconditionally rendered per its own gate, no `showHelp` involvement).

No situational/collapse mechanism was added anywhere (A5) -- every relocation is either always-visible or Help-gated boolean, nothing new is expandable/retractable.

### Test updates required by the sweep (and why)

- `LeagueBuilderDraftSetup.test.tsx`: three existing tests ("renders the advisory Cap Fit diagnostic...", "renders RE-CHECK with roster-law blocker wording" -- the room-check text assertion, "renders Pool Quality stops with the 68 baseline default") now open Help (`fireEvent.click(screen.getByRole("button", { name: "?" }))`) before checking the now-gated LOCKED strings; assertions are otherwise byte-identical to the original strings.
- `LeagueBuilderAuctionDraft.test.tsx`: the MLB phase-label assertion (`"MLB auction"`) no longer needs a Help click to appear -- updated to assert presence before AND after the click (reverse fix, A3).
- `LeagueBuilderFarmAuctionDraft.test.tsx`: "Farm auction" now renders twice on that page (the page's own always-visible toolbar chip, unchanged, plus the now-always-visible AuctionStage phase-label pill, same text by coincidence) -- assertion changed from `getByText` (which throws on multiple matches) to `getAllByText(...).length > 0`. This is a pre-existing toolbar chip the sweep did not touch; the reverse fix simply makes the same phrase appear from a second source now that both are unconditional.
- `ArchetypePicker.test.tsx.snap`: regenerated deliberately (B4 test) -- diff is exactly the removal of the identity-explainer `<div>` (5 lines), nothing else changed.

### GATES — full evidence

**1. `npx tsc -b`** — clean, exit 0, zero output.

**2. `npm run build`** — exit 0. Final lines:
```
✓ built in 10.15s
PWA v1.2.0
mode      generateSW
precache  185 entries (5320.32 KiB)
files generated
  dist/sw.js
  dist/workbox-1d305bb8.js
```
(Only the pre-existing "chunks larger than 500kB" advisory warning, unrelated to this diff.)

**3. Focused suites** (all run and passing):
- `RankReorderList.test.tsx` — 21/21 passed
- `RosterDesigner.test.tsx` — 22/22 passed (includes "flushes an edited outgoing club before loading another club" -- the sibling pattern this lane's Item C fix mirrors)
- `WhisperPanel.test.tsx` — 38/38 passed
- `LeagueBuilderAuctionDraft.test.tsx` — 20/20 passed
- `LeagueBuilderAuctionDraft.computeBoardAutoAdvanceLine.test.ts` — 16/16 passed
- `LeagueBuilderFarmAuctionDraft.test.tsx` — 2/2 passed
- `LeagueBuilderDraftSetup.RankYourBoardZone.test.tsx` — 7/7 passed
- `ArchetypePicker.test.tsx` — 5/5 passed (snapshot regenerated)
- `EndOfDraftStaffing.test.tsx` — 1/1 passed
- `AuctionStage.test.tsx` — 10/10 passed (not explicitly in the contract's gate list but directly touched by this lane; run as an extra check)
- `LeagueBuilderDraftSetup.test.tsx` — run SOLO per the known-flake rule — 88/88 passed

Total: 230/230 passed across all touched/gated suites. Full vitest suite intentionally NOT run (captain runs one full pass post-merge per the contract).

### Deviations from the literal contract text (all minor, flagged honestly)

1. The Cap Fit fused-line split kept "Advisory guidance only." grouped with the static clause that moves behind Help (the contract named only the "Pool quality and salary cap are separate…" clause explicitly) -- treated as one continuous static sentence-group following the dynamic `{summary}`, since splitting mid-sentence would have been worse relocation hygiene. Flagging for JK's eye per the reskin-lane precedent ("JK's eye gates the result").
2. The design-first stray notice's Help-gated clause capitalization changed from "a drawn pool..." to "A drawn pool..." (lowercase to uppercase) because it now starts a new sentence when visible standalone after the always-visible clause's period -- the only textual change anywhere in this sweep, and it is not test-characterized.
3. AuctionStage's `ScoutBody` eyebrow ("Scout's price range — narrow band = confident") was gated as a WHOLE line (not split into an always-visible label + Help-gated hint) since the contract calls both AuctionStage instances "legend lines" (plural, full-line) rather than SPLIT items, matching how the sibling "Scout band: low / expected / stretch" line was treated.

