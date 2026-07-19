# CURRENT STATE

> ## RIGHT NOW — SNAKE LIVE-ROOM PREVIEW IS READY FOR JK'S REAL-DEVICE GATE (2026-07-19; implementation `fd07bba0`; independently audited head `cedf96ee`; deployed head `d2ac79d7`; branch `codex/snake-live-room-authority`). Migration 009 is installed on Supabase project `vmpvfswmnhpiiontwnjc`. All nine `snake_live_*` tables have RLS, only `snake_live_events` has direct authenticated SELECT and Realtime publication, anonymous RPC execution is off, and rollback-only owner/cross-account checks passed with no rows left behind. The exact branch head is pushed and Vercel preview deployment `dpl_4THxvqPDazfwcAzTd1yeXaHoHkQb` is READY. Build metadata reports `d2ac79d7d58c`; the root and `/snake-companion` return HTTP 200 through the preview access link; the built bundle contains the configured Supabase project. Production remains on `ba7f97d6`; no merge or promotion occurred. **NEXT / OPEN PENDING-JK:** use the preview access link on the Hotseat and companion devices, then run the real Hotseat plus companion walk. JK's walk remains the only product acceptance gate.

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

1. Delete only old Snake live test rooms and retired local sync keys if a device needs a clean start. Do not wipe product data or
   the account-owned `kbl-sync-outbox`.
2. Run JK's real-device Hotseat and companion draft walk.

The exact remote sequence and rollback boundary are in
`spec-docs/SNAKE_LIVE_ROOM_PREVIEW_RUNBOOK_2026-07-19.md`. Migration 009 and the one authorized
Vercel preview are complete. Vercel production remains on `ba7f97d6`.
