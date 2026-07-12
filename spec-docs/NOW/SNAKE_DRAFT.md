# NOW — Snake Draft: mainly built, messy edges (NOT Fable-living-season thread's surface)

**This thread belongs to the snake-draft captain line — its bookings live in the standard docs
(`SESSION_LOG.md` 2026-07-11 entries, `CURRENT_STATE.md`, `DECISIONS_LOG.md`), landed via commit
`d6c7ec49` "walkthrough wave 1". This brief is a POINTER, not the authority.**

## VERIFIED (git, 2026-07-12 post-midnight)
- Walkthrough wave 1 merged as PRs #90-#98: unified setup (UNIFYSETUP), room performance
  (PERFROOM: room-code write-once + field-patch persistence; 217,865→1 proofs), route bridge,
  room fixes. Design/plan of record: `spec-docs/SNAKE_DRAFT_VISION_2026-07-10.md` +
  `spec-docs/SNAKE_DRAFT_V1_PROGRAM_2026-07-10.md` (lanes S0-S7).
- The snake POC flag was deliberately retired (compiles OFF — "the real snake draft shipped");
  its test/descriptor mismatch on main was fixed by the snake thread itself (#96-#98 era) and
  the living-season thread's SWITCH-3A rebase adopted that truth.
- **Help-button UI law RATIFIED into `SESSION_RULES.md` non-negotiables** (commit `beaad38f`,
  2026-07-12) — explanatory copy behind a per-screen `?` Help affordance, inline text limited to
  labels/values/states/one-line consequences, decision-critical warnings stay inline; density
  corollary rides with it.
- **Wave 1.5 MERGED to `main`:** **PR #110 COMPANIONAUTH** (merge `3116ddc9`) — the companion
  page (`/snake-companion`) now has a real fail-closed sign-in gate, honest empty/pulling states,
  account email + sign-out, AND a captain-found cross-device clobber fix (companion claim/board
  saves were whole-session-row writes against a row-last-write-wins cloud store; now atomic
  field-patches with pull-before-write). **PR #111 HELPSWEEP** (merge `d6c988e9`, current `main`
  tip) — applies the ratified help-button law across every snake screen (13 strings relocated,
  2 deleted, price chart collapsed by default) plus JK's ruled **board-first room layout**
  (team's own draft board is now the primary column; commissioner/ceremony panel compacted into
  a sticky ~400px right rail). Both opus-audited APPROVE-WITH-NOTES, all notes resolved; full
  suites 100% green (659/9,774 and 658/9,770 respectively). Contracts:
  `spec-docs/contracts/CONTRACT_COMPANIONAUTH_2026-07-12.md`,
  `spec-docs/contracts/CONTRACT_HELPSWEEP_2026-07-12.md`.

## CARRIED from Fable memory — re-verify before acting
- **Companion cross-device flow is now BUILT + MERGED but UNVERIFIED on real hardware.** The
  sign-in gap fix (PR #110 above) has not yet been proven on an actual second physical device —
  JK's own phone-to-Mac round-trip (`http://192.168.68.54:5173/snake-companion`, same Wi-Fi, same
  account) is the morning's first gate. Do this before anything else.
- After the phone round-trip: continue JK's walkthrough wave 2 (farm snake, trades, season
  handoff — still unwalked; he'll see the new board-first room layout live for the first time).
- A smaller ticketed finding: the Draft Setup "can't legally seat every club at 22 under the cap"
  blocker message misdirects (an SML-import repro found raising the cap 1.2M→10M changed
  nothing — the real constraint is position-supply shape, not the cap number).
- The snake draft is the ruled v1 flagship draft path; the auction stays routed/testable,
  frozen for v2.
- General state: "code-complete but messy" — expect polish/wiring gaps found by walkthrough,
  not missing systems. JK walkthrough findings drive the queue.

## ADDENDUM (2026-07-12 early AM) — EXECUTED, see VERIFIED above
JK held a paste-ready walkthrough prompt (delivered in the living-season thread's chat) that
opened with the now-RATIFIED help-button law + density corollary (SESSION_RULES canon) and
ordered a pre-walkthrough explainer-text sweep of every snake screen, then the companion
sign-in fix, then the wave protocol. **Both pieces of that order are now done and merged** —
PR #111 HELPSWEEP (the explainer sweep + board-first layout) and PR #110 COMPANIONAUTH (the
sign-in fix) — see the VERIFIED section above for the git-checked detail. If a fresh prompt is
ever needed again: reconstruct from SESSION_RULES "Help-Button UI Law" + this folder's briefs.
