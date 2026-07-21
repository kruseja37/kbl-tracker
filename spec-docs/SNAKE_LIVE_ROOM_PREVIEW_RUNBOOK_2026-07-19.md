# Snake Live Room Preview Runbook

**Date:** 2026-07-19
**Thread:** SNAKE_DRAFT
**Implementation commit:** `fd07bba0`
**Independently audited branch head:** `cedf96ee` — **APPROVE, Major 0 / Minor 0**
**Deployed branch head:** `d2ac79d7d58c5e30c47e2af27979da96401b74a2`
**Rule:** Preview only. Do not promote to production before JK accepts the real device walk.

## Current remote state

- Configured Supabase project: `vmpvfswmnhpiiontwnjc`.
- Supabase Auth is online. Migration 009 is installed and recorded in remote migration history.
- All nine `snake_live_*` tables exist with RLS enabled.
- Direct grants expose only authenticated SELECT on `snake_live_events`; anonymous RPC execution is
  false for every public live-room RPC.
- Only `snake_live_events` is in the `supabase_realtime` publication.
- Rollback-only remote checks proved owner create/read and cross-account hiding. They left zero test
  room rows.
- Vercel project: `kbl-tracker`, project ID `prj_lUo6rUNcZ6g96VuQni0yuyrEH6co`.
- Current production deployment is commit `ba7f97d68fd84e44c365c0e795f2431f6e25cbbc`.
- Preview deployment `dpl_4THxvqPDazfwcAzTd1yeXaHoHkQb` is READY at exact commit `d2ac79d7`.
- Build metadata reports `d2ac79d7d58c`; root and `/snake-companion` return HTTP 200 after the
  preview access link sets its cookie. The bundle contains the configured Supabase project ref.
- Supabase advisors report no Snake live-room performance warning. The security advisor reports the
  intentional authenticated SECURITY DEFINER RPC boundary; direct table access is revoked, every
  entry RPC checks account ownership plus host/device capability, and anonymous execution is off.
  Existing project warnings for leaked-password protection and older generic-sync RLS policies are
  outside migration 009.

## Safe preview sequence

1. **DONE:** Apply `supabase/migrations/009_snake_live_rooms.sql` to the configured Supabase project.
   The migration adds new live-room tables and RPCs. The current production app does not call them.
2. **DONE:** Confirm migration 009 is listed.
3. **DONE:** Confirm all nine `snake_live_*` tables exist, RLS is on, and only `snake_live_events` has direct
   authenticated SELECT access.
4. **DONE:** Run Supabase security and performance advisors. Resolve or record any migration-related warning before the
   preview opens.
5. **DONE:** Confirm an anonymous user cannot read a live-room table or execute a live-room RPC.
6. **DONE:** Confirm an authenticated user can create and read only a room owned by that same account.
7. **DONE:** Deploy the audited branch head that contains implementation commit `fd07bba0` and the final audit
   record as a Vercel preview. Record the exact deployed hash. Do not promote it.
8. **DONE:** Confirm the preview uses the configured Supabase project.
9. Run the real browser test below.

## JK browser test

1. Open the preview on the Hotseat Mac.
2. Open the same preview on one companion Mac mini/Neo or laptop.
3. Sign both devices into the same account.
4. On the Hotseat, create a new Snake draft and open its companion room. Keep this browser profile
   open for the full test. Do not clear its League Builder or live-capability storage after this step.
5. Submit one claim. Confirm the Hotseat receives it without a manual cloud sync.
6. Approve the claim. Confirm only that companion can open that team's private board.
7. Change the private board. Confirm the Hotseat cannot read it.
8. Submit a pick request. Confirm the Hotseat must approve it before public state changes.
9. Confirm both devices advance to the same pick and remove the drafted player.
10. Complete one trade and confirm both devices update.
11. Reload each device and confirm the room, roster, picks, trade, and private board converge.
12. Repeat with three companion devices controlling eight teams. A companion can control more than
    one team.
13. For a full 176-pick and Scout Hire test, keep the original Hotseat profile and its canonical
    player data intact through final roster handoff.

## Narrow clean start before the acceptance room

- Delete old test rows only from `snake_live_rooms`; child rows cascade. Do this before creating the
  new room. Do not delete live-room rows during a draft.
- Delete retired local sync keys only:
  - `kbl-sync-queue`
  - `kbl-sync-local-queue`
  - `kbl-sync-store-write-bases`
  - `kbl-sync-local-write-bases`
  - `kbl-sync-write-base-owner`
  - `kbl-sync-deferred-snake-protected-rows`
- Delete only the dedicated `kbl-snake-live-capabilities` IndexedDB database before starting the
  final clean acceptance draft. Do not clear it after the Hotseat opens the new room.
- Do not delete `kbl-sync-outbox`. It can contain unrelated durable or quarantined account changes
  and is no longer involved in companion live-room entry.
- Keep Supabase Auth data, device identity, players, source leagues, teams, archetypes, registered
  pools, and any non-test product data.

## Rollback

- If the preview fails, stop using that preview URL. Production remains on `ba7f97d6`.
- Keep migration 009 installed because it is additive and unused by the old app.
- Close or delete only test live rooms. Do not drop the tables during diagnosis.
- Fix the preview branch, repeat the independent gate, and redeploy a new preview.

## Known controlled-preview boundary

- Public draft state, claimed companion private boards, claims, and pick/trade intent are
  cloud-authoritative. Unclaimed Hotseat boards remain local.
- The Hotseat still discovers and rejoins the cloud room from its local League Builder session plus
  the small host capability key. Cloud room state alone cannot cold-boot a wiped Hotseat profile.
- Final freeze and roster handoff still use the Hotseat's local canonical private player records.
- This preview covers the MLB Snake live room. FARM Snake still uses the Hotseat's local League
  Builder and generic sync path; FARM companion live drafting is not part of this preview.
- Therefore, pin the original Hotseat browser profile for the full run. A completely cloud-only
  League Builder and final handoff is a separate migration, not part of this preview.

## Production gate

Promote only the exact preview that JK accepts. JK's browser walk is the sole product gate.
