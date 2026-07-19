# CURRENT STATE

> ## RIGHT NOW — SNAKE LIVE-ROOM AUTHORITY IS CODE-COMPLETE AND INDEPENDENTLY APPROVED (2026-07-19; branch `codex/snake-live-room-authority`; uncommitted close record). The old companion system used two private-board authorities and routed live claims, picks, trades, and board updates through whole-account backup sync. The repair makes Supabase the live-room authority: Hotseat alone writes public draft state; companions write only their approved private boards and submit pick/trade intent; public and private revisions are independent; events are hints backed by bounded current-state reads; live rooms no longer use generic backup sync. Draft targets now receive new team IDs and empty rosters, so source team rosters cannot be erased or inherited. Final non-builder audit: **APPROVE — Major 0 / Minor 0**. Focused live-room proof is 188 passed / 32 skipped; live/auth 73/73; targeted Snake UI/storage 246/246; generic sync 102 passed / 32 skipped; TypeScript, changed-file lint, production/PWA build, and diff integrity are green. **NEXT:** fetch current `origin/main`, commit this branch, then obtain authority to apply migration 009 and deploy the matching app. After deployment, remove only old Snake test rooms and retired local sync keys. Preserve players, source leagues, teams, archetypes, and pools. **BROWSER VERIFY OUTSTANDING / OPEN PENDING-JK:** JK runs one real Hotseat plus companion walk. No merge, push, remote migration, deploy, or product acceptance has occurred.

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

## Open gates

1. Fetch moving `origin/main` and record the exact base.
2. Commit the audited local repair. Do not push, merge, or deploy without authority.
3. Apply `supabase/migrations/009_snake_live_rooms.sql` to the remote project.
4. Deploy the matching app build.
5. Delete only old Snake live test rooms and retired local sync keys. Do not wipe product data.
6. Run JK's real-device Hotseat and companion draft walk.
