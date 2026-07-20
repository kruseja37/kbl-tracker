# CURRENT STATE

> ## RIGHT NOW — FINDING-247 COMPLETED ROOM RECOVERY AND ATOMIC MLB FINALIZATION ARE INDEPENDENTLY APPROVED; NEW PREVIEW READY; JK WALK PENDING (2026-07-20; branch `codex/snake-live-room-authority`, approved recovery head and deployed source `56d1ab81`). JK completed every pick in room 4352. The first corrected preview fixed the recap transaction but could not expose recovery when the browser retained the league and lost the local pool/session. Recovery now appears in that exact state and explicitly reloads the restored league, pool, and session before navigation, including when the URL already names the same league. The same auditor rejected `05f7f6b0` for the same-URL dead end, then approved repaired head `56d1ab81`, **Major 0 / Minor 0**. Builder proof is 38/38 focused recovery/room tests plus TypeScript, changed-file lint, diff integrity, and the 2,744-module production/PWA build; independent proof is 17/17. Preview deployment `dpl_CgSik9sUesdxpb2a9pBUGwzUJhpm` is READY at `https://kbl-tracker-abdv24x2r-kruseja37s-projects.vercel.app`. **NEXT:** sign in, restore room 4352, reach MLB Draft Recap, and confirm the completed draft. Production remains on `ba7f97d6`; no merge or promotion occurred.

## Current product law

- SNAKE_DRAFT is the active thread.
- JK's browser and real-device walk is the sole product acceptance gate.
- Builder and auditor remain separate.
- Help-button law is ratified canon.
- Live Snake room authority is cloud-first. Browser storage is auth/device state plus disposable cache,
  not public draft authority.
- The host owns public picks, trades, corrections, order, and completion.
- A companion owns only its approved private team board and sends pick/trade intent.
- One companion device can control more than one team. One Hotseat plus three companions supports an
  eight-team room.
- Mac mini/Neo and laptop are the primary companion layouts. iPad is a fallback, not this gate.
- Each field-position ranking controls its starting slot. Overall breaks ties for cross-position
  flex and depth. Drafted players remain in the projected 22.
- Ordinary pitcher FLD is not a luxury-tax input. It remains salary/IV value. Hitter FLD remains
  active, including a true Two Way player's position-player job.

## Open gates

1. Run JK's room 4352 completed-draft confirmation walk.
2. After that succeeds, run the broader Hotseat plus companion re-walk.

The exact remote sequence and rollback boundary are in
`spec-docs/SNAKE_LIVE_ROOM_PREVIEW_RUNBOOK_2026-07-19.md`. Migration 009 and the corrected Vercel
preview are complete. Vercel production remains on `ba7f97d6`.
