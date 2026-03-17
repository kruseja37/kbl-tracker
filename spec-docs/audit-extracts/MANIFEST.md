# Audit Extract Manifest

These files contain pre-extracted, line-numbered code sections from the two largest GameTracker source files (GameTracker.tsx at 6742 lines and useGameState.ts at 6406 lines). They are organized by audit phase to prevent the need for repeated full-file searches.

## Extract Files

| File | Source | Lines | Purpose |
|------|--------|-------|---------|
| extract_GT_structure.txt | GameTracker.tsx | 454 | First 300 + last 150 lines — imports, types, JSX render |
| extract_GS_structure.txt | useGameState.ts | 454 | First 300 + last 150 lines — imports, types, hook return |
| extract_layout_scorebug.txt | Both | 765 | §2-§3: Layout grid, score bug, scoreboard, Fenway |
| extract_quickbar.txt | Both | 1858 | §4: Quick Bar buttons, outcomes, overflow, phases, disabling |
| extract_lineup.txt | GameTracker.tsx | 2028 | §5: Lineup columns, player cards, enrichment mode |
| extract_newsboard.txt | GameTracker.tsx | 394 | §6: Newsboard, beat reporter, matchup, milestones |
| extract_playlog.txt | Both | 1612 | §7: Play log entries, runner sub-entries, badges |
| extract_enrichment.txt | Both | 1691 | §8: All enrichment types — spray, catch, contact, fielding seq, modifiers |
| extract_subs.txt | Both | 3824 | §9: Substitutions, popovers, mojo, fitness, manager moments, between-play |
| extract_gameflow.txt | Both | 2098 | §10: Game phases, half-inning transitions, end game, resume |
| extract_visual.txt | GameTracker.tsx | 528 | §11: Visual theme, animations, audio, backwards K |
| extract_edgecases.txt | Both | 911 | §12: Undo, locking, autosave, resume, recovery |

## How to use

Each extract preserves original line numbers from the source file. When you find relevant code in an extract, the line number in the extract IS the line number in the original source file.

Example: If extract_quickbar.txt shows `1847: const OUTCOME_BUTTONS = [...]`, that code is at line 1847 in GameTracker.tsx.

Grep separator lines (`--`) indicate non-contiguous sections — the lines between separators come from different parts of the file.

## IMPORTANT

These extracts are SUPPLEMENTARY. They make the large files navigable but they are NOT complete. If you need to verify something that doesn't appear in an extract, you MUST search the original source file directly. Never assume something is MISSING just because it's not in an extract — the extract might not have captured it.
