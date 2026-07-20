# CURRENT STATE

> ## RIGHT NOW — FINDING-249 FARM COMPANION AUTHORITY IS INDEPENDENTLY APPROVED (2026-07-20; branch `codex/snake-live-room-authority`). JK's recovered four-team league reached the FARM room and proved that FARM had no companion controls. The generic repair now extends the same cloud-authority model through FARM: Hotseat owns public picks and completion; an approved companion owns only its private fogged scout board and can send a pick request for Hotseat confirmation. Two separate-audit rounds found and drove closure of five Major findings. The final frozen code head `7a44d2b6` received **APPROVE — Major 0 / Minor 0** from the same read-only auditor. Independent verification passed 33/33 focused tests, 227/227 broad Snake live-room tests, TypeScript, changed-file lint, diff integrity, and the 2,744-module production/PWA build. The known live-reconnect result remains identical to the verified base and is not introduced here. **NEXT:** with explicit authority, apply migration `20260720213000_farm_snake_live_catalog.sql`, push the audited branch, and create one matching preview. JK's real FARM companion browser walk remains the product gate. No migration, push, preview, merge, or production promotion is authorized yet.

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

1. With explicit authority, apply the FARM catalog migration, push the audited branch, and create
   one matching preview.
2. JK runs a FARM Hotseat-plus-companion walk, then the broader new-league Snake re-walk.

The exact remote sequence and rollback boundary are in
`spec-docs/SNAKE_LIVE_ROOM_PREVIEW_RUNBOOK_2026-07-19.md`. Migration 009 and the corrected Vercel
preview are complete for MLB. The current farm-identity preview is
`https://kbl-tracker-20p586qnl-kruseja37s-projects.vercel.app`. Vercel production remains on
`ba7f97d6`. That preview does not contain FINDING-249 or its required FARM catalog migration.
