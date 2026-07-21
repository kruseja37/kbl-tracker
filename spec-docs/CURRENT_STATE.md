# CURRENT STATE

> ## RIGHT NOW — FINDING-252 REPAIRS THE DRAFT SETUP SOURCE/OUTPUT LOOP (2026-07-20; branch `codex/snake-live-room-authority`). JK's preview proved that the active target league could read its own generated pool back as a source: `test` reported 835 source players, all 835 were already in the pool, and zero were available. The target is now output-only. Draft Setup lists external source leagues, ignores the target id in legacy selections, strips target assignments from source membership, and keeps the expensive proof stable across unrelated team edits. FINDING-249 FARM companion authority and FINDING-250 four/eight-team certification remain integrated and independently approved. Migration `20260720213000_farm_snake_live_catalog.sql` remains applied. **NEXT:** publish one exact replacement preview, then JK rechecks Legends source selection and the four/eight-team setup paths. Independent audit remains separate. Production is unchanged.

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

1. Publish the exact FINDING-251/252 repair to one replacement branch preview.
2. Independent read-only audit checks the frozen source/output repair.
3. JK runs the Legends-source, four/eight-team setup, and FARM Hotseat-plus-companion walks.

The exact remote sequence and rollback boundary are in
`spec-docs/SNAKE_LIVE_ROOM_PREVIEW_RUNBOOK_2026-07-19.md`. Migration 009 and the corrected Vercel
preview are complete for MLB. The previous farm-identity preview is
`https://kbl-tracker-20p586qnl-kruseja37s-projects.vercel.app`. Vercel production remains on
`ba7f97d6`. That older preview does not contain FINDING-249 or FINDING-250; the required FARM catalog
migration is now installed for the next integrated preview.
