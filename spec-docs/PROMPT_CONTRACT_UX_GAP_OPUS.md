# PROMPT CONTRACT: GameTracker UX Gap Analysis
# Target: Claude Code CLI | Opus | direct mode (not plan mode)
# ROUTE: Claude Code CLI | opus

---

## INSTRUCTIONS

This audit is governed by a skill file. Read and follow it exactly:

```
.claude/skills/ux-gap-auditor/SKILL.md
```

That skill file contains:
- Phase 0: Setup (generate extracts, read spec, create output file)
- Phase 1: Layout, Score Bug, Quick Bar (UX-001 through UX-016)
- Phase 2: Lineup Columns, Player Card, Newsboard (UX-017 through UX-033)
- Phase 3: Play Log, Enrichment System (UX-034 through UX-049)
- Phase 4: Runner Outcomes, Subs, Game Flow, Edge Cases (UX-050 through UX-058)
- Phase 5: Self-Verification (mandatory — count entries, verify citations, purge weasel words)
- Phase 6: Spot-Check Anchors (8 known-answer decisions for JK to validate)

Plus: rules of evidence, anti-patterns, failure protocol, and output format.

## EXECUTION

1. Read the skill file FIRST
2. Execute Phase 0 (setup)
3. STOP after Phase 0 and report — wait for JK to confirm before proceeding
4. Execute Phases 1-4 with STOP points between each
5. Execute Phase 5 (self-verification)
6. Execute Phase 6 (spot-check output)

## CRITICAL RULES

- This is a READ-ONLY audit. Do NOT modify any source files.
- Every claim must cite exact file:line with named code elements.
- When unsure, mark UNVERIFIED. Never guess.
- All 58 decisions (UX-001 through UX-058) must be individually evaluated.
- The spec (`spec-docs/GAMETRACKER_UX_SPEC.md`) is the source of truth — not the code.
- Pre-extracted code sections are in `spec-docs/audit-extracts/` — use them to navigate the two largest files (GameTracker.tsx at 6742 lines, useGameState.ts at 6406 lines).
- If an extract doesn't contain what you need, search the original source file directly.

Begin by reading `.claude/skills/ux-gap-auditor/SKILL.md`.
