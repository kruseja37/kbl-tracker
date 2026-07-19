# Snake Live Room Preview Runbook

**Date:** 2026-07-19
**Thread:** SNAKE_DRAFT
**Code commit:** `d86e8fca755cd0a073b7d784f053d7f33c54e6aa`
**Rule:** Preview only. Do not promote to production before JK accepts the real device walk.

## Current remote state

- Configured Supabase project: `vmpvfswmnhpiiontwnjc`.
- Supabase Auth is online. The authenticated health request returned HTTP 200.
- Migration 009 is not installed. A read-only request for `public.snake_live_events` returned
  `PGRST205` and HTTP 404.
- Vercel project: `kbl-tracker`, project ID `prj_lUo6rUNcZ6g96VuQni0yuyrEH6co`.
- Current production deployment is commit `ba7f97d68fd84e44c365c0e795f2431f6e25cbbc`.
- No deployment contains commit `d86e8fca`.

## Safe preview sequence

1. Apply `supabase/migrations/009_snake_live_rooms.sql` to the configured Supabase project.
   The migration adds new live-room tables and RPCs. The current production app does not call them.
2. Confirm migration 009 is listed.
3. Confirm all seven `snake_live_*` tables exist, RLS is on, and only `snake_live_events` has direct
   authenticated SELECT access.
4. Run Supabase security and performance advisors. Resolve any migration-related warning before the
   preview opens.
5. Confirm an anonymous user cannot read a live-room table or execute a live-room RPC.
6. Confirm an authenticated user can create and read only a room owned by that same account.
7. Deploy exact commit `d86e8fca` as a Vercel preview. Do not promote it.
8. Confirm the preview uses the same Supabase URL and publishable key as the configured app.
9. Run the real browser test below.

## JK browser test

1. Open the preview on the Hotseat Mac.
2. Open the same preview on one companion Mac mini/Neo or laptop.
3. Sign both devices into the same account.
4. Create a new Snake draft and open its companion room.
5. Submit one claim. Confirm the Hotseat receives it without a manual cloud sync.
6. Approve the claim. Confirm only that companion can open that team's private board.
7. Change the private board. Confirm the Hotseat cannot read it.
8. Submit a pick request. Confirm the Hotseat must approve it before public state changes.
9. Confirm both devices advance to the same pick and remove the drafted player.
10. Complete one trade and confirm both devices update.
11. Reload each device and confirm the room, roster, picks, trade, and private board converge.
12. Repeat with three companion devices controlling eight teams. A companion can control more than
    one team.

## Narrow cleanup after the preview works

- Delete old test rows only from `snake_live_rooms`; child rows cascade.
- Delete retired local sync keys only:
  - `kbl-sync-queue`
  - `kbl-sync-local-queue`
  - `kbl-sync-store-write-bases`
  - `kbl-sync-local-write-bases`
  - `kbl-sync-write-base-owner`
  - `kbl-sync-deferred-snake-protected-rows`
- Delete the old local IndexedDB databases `kbl-snake-live-capabilities` and `kbl-sync-outbox` only
  when starting the final clean acceptance draft.
- Keep Supabase Auth data, device identity, players, source leagues, teams, archetypes, registered
  pools, and any non-test product data.

## Rollback

- If the preview fails, stop using that preview URL. Production remains on `ba7f97d6`.
- Keep migration 009 installed because it is additive and unused by the old app.
- Close or delete only test live rooms. Do not drop the tables during diagnosis.
- Fix the preview branch, repeat the independent gate, and redeploy a new preview.

## Production gate

Promote only the exact preview that JK accepts. JK's browser walk is the sole product gate.
