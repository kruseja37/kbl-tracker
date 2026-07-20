# CURRENT STATE

> ## RIGHT NOW — FINDING-249 SECOND AUDIT BLOCKERS ARE REPAIRED; FINAL RE-AUDIT PENDING (2026-07-20; branch `codex/snake-live-room-authority`). JK's recovered four-team league reached the FARM room and proved that FARM had no companion controls. The generic repair now extends the same cloud-authority model through FARM: Hotseat owns public picks and completion; an approved companion owns only its private fogged scout board and can send a pick request for Hotseat confirmation. The first separate audit blocked commit `256962dd` with Major 3 / Minor 0. The same auditor then blocked first repair `1e53eb8f` with Major 2 / Minor 0: SQL still accepted object values in public FARM identity fields, and a raw host could label an arbitrary public-state rewrite as `PICK_RECORDED`. The second repair requires exact JSON scalar types and one exact next-pick transition. It rejects changes to pause, trades, order, version state, or any other immutable session field. A 33-test delta gate and a 241-test MLB/FARM live-room gate are green. TypeScript, changed-file lint, diff integrity, and the 2,744-module production/PWA build are green. **NEXT:** freeze this repair and send it to the same read-only auditor. Migration `20260720213000_farm_snake_live_catalog.sql` must be applied with the matching app before a real FARM companion browser walk. It has not been applied. No push, preview, merge, or production promotion is authorized.

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

1. Same-auditor final read-only recheck of the frozen FINDING-249 second repair.
2. With explicit authority, apply the FARM catalog migration, push the audited branch, and create
   one matching preview.
3. JK runs a FARM Hotseat-plus-companion walk, then the broader new-league Snake re-walk.

The exact remote sequence and rollback boundary are in
`spec-docs/SNAKE_LIVE_ROOM_PREVIEW_RUNBOOK_2026-07-19.md`. Migration 009 and the corrected Vercel
preview are complete for MLB. The current farm-identity preview is
`https://kbl-tracker-20p586qnl-kruseja37s-projects.vercel.app`. Vercel production remains on
`ba7f97d6`. That preview does not contain FINDING-249 or its required FARM catalog migration.
