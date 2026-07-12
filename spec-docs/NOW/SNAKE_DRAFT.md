# NOW — Snake Draft: mainly built, messy edges (NOT Fable-living-season thread's surface)

**This thread belongs to the snake-draft captain line — its bookings live in the standard docs
(`SESSION_LOG.md` 2026-07-11 entries, `CURRENT_STATE.md`, `DECISIONS_LOG.md`), landed via commit
`d6c7ec49` "walkthrough wave 1". This brief is a POINTER, not the authority.**

## VERIFIED (git, 2026-07-11 night)
- Walkthrough wave 1 merged as PRs #90-#98: unified setup (UNIFYSETUP), room performance
  (PERFROOM: room-code write-once + field-patch persistence; 217,865→1 proofs), route bridge,
  room fixes. Design/plan of record: `spec-docs/SNAKE_DRAFT_VISION_2026-07-10.md` +
  `spec-docs/SNAKE_DRAFT_V1_PROGRAM_2026-07-10.md` (lanes S0-S7).
- The snake POC flag was deliberately retired (compiles OFF — "the real snake draft shipped");
  its test/descriptor mismatch on main was fixed by the snake thread itself (#96-#98 era) and
  the living-season thread's SWITCH-3A rebase adopted that truth.

## CARRIED from Fable memory — re-verify before acting
- **Known-broken first fix: companion cross-device flow** — a sign-in gap on `/snake-companion`
  (second device can't join). Memory tags it "tomorrow's first fix." Verify by walking the
  companion flow on two origins before building anything else.
- The snake draft is the ruled v1 flagship draft path; the auction stays routed/testable,
  frozen for v2.
- General state: "code-complete but messy" — expect polish/wiring gaps found by walkthrough,
  not missing systems. JK walkthrough findings drive the queue.

## ADDENDUM (2026-07-12 early AM)
JK holds a paste-ready walkthrough prompt (delivered in the living-season thread's chat) that
opens with the now-RATIFIED help-button law + density corollary (SESSION_RULES canon) and orders
a pre-walkthrough explainer-text sweep of every snake screen, then the companion sign-in fix,
then the wave protocol. If the prompt is lost: reconstruct from SESSION_RULES "Help-Button UI
Law" + this folder's briefs.
