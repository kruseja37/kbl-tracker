# CONTRACT — SNAKE POOL ASSEMBLY

**Date:** 2026-07-15
**Role:** Snake Draft pool-assembly builder
**Status:** COMPLETE — independent re-audit APPROVE; JK browser walk remains the acceptance gate

## Goal

Make Snake Draft Setup build the chosen player universe honestly: either the exact union of selected
sources or a team-shaped pool at one of three explicit competition depths, while preserving manual
adds/removes and proving that every club can still finish a legal, affordable, archetype-credible 22.

## Source of truth

- `spec-docs/NOW/SNAKE_DRAFT.md`
- `spec-docs/SNAKE_DRAFT_VISION_2026-07-10.md`
- `spec-docs/DECISIONS_LOG.md` — 2026-07-14 roster-local Snake tax ruling
- JK's attended rulings in this task:
  - selected source leagues define the candidate universe;
  - `FULL SOURCES` means the exact source union, with no curve;
  - shaped pools honor hand-adds as hard includes and hand-removes as hard excludes;
  - a later reshape reforms only the unprotected remainder;
  - roster strength is constrained by each team's salary/tax law, not draft-room size;
  - for eight clubs, provide tight, competitive, loose, and unrestricted choices.

## Product contract

1. An eight-club room has 176 required MLB roster slots.
2. The shaped size guide is:
   - `TIGHT`: 1.20x demand = 212 players;
   - `COMPETITIVE`: 1.35x demand = 238 players (recommended starting point);
   - `LOOSE`: 1.50x demand = 264 players.
3. `FULL SOURCES` has no count ceiling. Its membership is:
   `(selected source union - hand removals) + hand additions + active hard pins`.
4. Shaped membership is produced by the existing demand/archetype curve from the same selected
   source union, at the selected size multiplier, with the same manual/pin override law.
5. Manual override intent survives reload and switching between exact and shaped assembly.
6. Source, assembly, size, curve, quality, cap, and team-identity changes make a locked basis stale.
7. Count is never the readiness guarantee. Snake's simultaneous seating proof remains authoritative
   and uses each club's exact roster-local luxury-tax caps; the number of clubs never rescales them.
8. The UI shows controls and consequences only. Explanations remain behind the ratified Help button.
9. Auction behavior remains unchanged.

## Owned files

- `src/engines/snakePoolAssembly.ts` (new)
- `src/engines/draftabilityRanker.ts`
- `src/utils/leagueBuilderStorage.ts`
- `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx`
- `src/src_figma/app/pages/LeagueBuilderLeagues.tsx`
- focused tests under `src/engines/__tests__/` and `src/src_figma/__tests__/`
- session truth documents required by `spec-docs/SESSION_RULES.md`

## Do not touch

- frozen IV/salary calculation
- live Snake pick settlement
- Auction pool generation semantics
- FARM draft-pick trade policy
- hidden Legend personality modifiers
- Living Season schedule ownership

## Verification

1. Pure membership/preset tests prove exact union, override precedence, and 212/238/264 counts.
2. An eight-team production-source simulation runs the simultaneous legal/tax seating proof for all
   three shaped presets and records actual output sizes and readiness.
3. Focused Draft Setup tests prove persistence, Full Sources, shaped rebuild, and Auction isolation.
4. Focused Snake, tax, and draftability regression suites pass.
5. TypeScript, changed-file ESLint, production build, and `git diff --check` pass.
6. A live browser crawl verifies source selection, all four assembly choices, manual edits, lock/GO
   readiness, Help-law compliance, and Mac/iPad layout.
7. A builder-not-auditor independent review attacks persistence, tax normalization, source leakage,
   and orphaned controls. Any finding is repaired and re-audited before handoff.

## Closing evidence

- Eight-club production-source runs hit the exact targets: Tight 212, Competitive 238, Loose 264.
  Every preset passed the simultaneous roster-law proof and produced tax-aware legal 22-player
  finishes for all eight tested archetypes.
- The focused closing suite passed 15 files / 252 tests. TypeScript, changed-file ESLint, the
  production build, and diff integrity passed on the final tree.
- Playwright passed the exact/shaped setup journey on Mac 1440×1000 and iPad 1024×768 (2/2), plus
  the complete responsive Snake room journey across main/companion surfaces (16/16).
- The Assistant GM objective is explicit and enforced: legality/solvency first, archetype identity
  second, then contextual value, with literal frozen IV held to at least 90% of the best-IV legal
  build. My Board remains the GM's own order.
- The first independent audit halted on six defects; all six were repaired. The re-audit then found
  one incomplete source-player fingerprint; the repair fingerprints every roster/IV adapter input
  and proves the stale visible verdict disappears before recomputation. Final verdict: **APPROVE**.
- Pitcher POW/CON/SPD/FLD tax treatment was verified but not changed: current ratified canon includes
  those ratings in the base top-four rotation and top-four bullpen rows. Pitcher ARM is excluded;
  archetype shifts apply only to hitter rows and pitcher VEL/JNK/ACC rows.

## Failure protocol

- If a nominal size cannot seat every club, report the source/role/economy blocker; never call it ready.
- If exact sources contain fewer than 176 legal bodies, do not silently manufacture players.
- If the change alters Auction behavior, stop and repair the seam.
- If the auditor finds a product judgment not already ruled above, stop for JK rather than inventing it.
