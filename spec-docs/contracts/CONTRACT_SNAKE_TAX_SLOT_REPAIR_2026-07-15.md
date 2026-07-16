# CONTRACT — Snake tax, fit, and slot-truth repair (2026-07-15)

## Authority and scope

This contract repairs the defects reproduced in JK's two-team Snake walkthrough.
It remains subordinate to canonical 22-player roster construction, roster-local
Snake tax, one-person/one-version, team-first privacy, the Help-button law, and
JK's browser walk as the only acceptance gate. The builder and auditor must be
different agents.

In scope: Snake legal-finish economics, player-fit truth, Assistant GM slot
wiring and display order, redundant nickname display, and draft-room home
navigation. Auction behavior, schedule behavior, Legends authoring, and visual
redesign are out of scope.

## Required outcomes

1. `evaluateSnakeLegalFinish` must return the least all-in legal completion it
   can construct from the live pool, not salary-cheapest membership with tax
   added afterward. A candidate cannot be blocked while a verified legal,
   affordable 22-player completion exists. A hard block requires completed
   exact proof; a bounded search that cannot finish reports `OPEN`.
2. A fit label must consume the team's exact cap identity and every rating row
   that can create roster tax. Raw archetype alignment alone cannot earn
   `STRONG FIT` when the same card creates material unshifted-category tax
   pressure. Selected-player consequence truth must use the exact before/after
   22-player board tax.
3. Assistant GM output must translate design slot `BACKUPC` to canonical desk
   slot `BACKUP_C`. A ready 22 cannot render a missing backup catcher because of
   a key mismatch.
4. Repeated role slots are presentation-sorted by frozen IV without changing
   selected membership, salary, tax, pin ownership, or legality. SP1/SP2/etc.,
   RP1/RP2/etc., starting C/backup C when mutually legal, and same-position
   starter/flex occupants show the highest-IV legal occupant first.
5. A nickname equal to the player's full name is not rendered a second time.
   The stored source record remains unchanged.
6. The shared Snake room exposes the established compact `SUPER MEGA BASEBALL`
   mark as a 44px home button. It returns to app home without adding always-on
   explanatory text.
7. Every Snake affordability consumer uses one cycle-free signed money law:
   seating, legal finish, Assistant GM, rational strategy, setup board seeding,
   decision facts, main room, and companion. A TAXSWING refund is never clamped
   away, and sub-cent nonlinear residue cannot create contradictory truth.

## Verification

- Red-first engine/component tests for each reproduced defect.
- Focused Snake economics, Assistant GM, desk, profile, and room-view suites.
- TypeScript and production build.
- Live Mac and iPad-width UI crawl of the affected controls and board state.
- Independent auditor returns no major or minor finding.
- Exact adversarial regressions cover a global local minimum, `OPEN` bounded
  search, signed TAXSWING refund, and positive/negative `5e-7` boundaries.
- JK's browser walk remains the sole product-acceptance gate.

## Final evidence

Builder: 23 focused files / 370 tests, typecheck, changed-file ESLint,
production build (2,724 modules), and `git diff --check`. Independent frozen-tree
audit: APPROVE, 22 files / 327 tests, zero blocker/major/minor findings.
