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
