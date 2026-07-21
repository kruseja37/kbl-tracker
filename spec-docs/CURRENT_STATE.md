# CURRENT STATE

> ## RIGHT NOW — FINDING-253 INDEPENDENTLY APPROVED; REPLACEMENT PREVIEW PENDING (2026-07-20; branch `codex/snake-live-room-authority`). JK's preview showed 835 valid Career, Draft, and Peak cards for 345 people, but every normal four-team build widened to unresolved Full Sources and could not Lock. Named pools now count one person once, shape first, and certify the exact finished membership. The first non-builder audit blocked frozen commit `7960b043`, Major 1 / Minor 1: protected sibling cards still counted twice in position floors and curve accounting, and the contract had trailing whitespace. Repaired commit `1bac2cfe` closes both findings. A separate calibration also exposed a proof-scheduler boundary that made a safe four-team 440-player room use bounded search; the generic scheduler now selects exact or bounded search from source-by-club work. Exact production data proves 132 distinct people for four-team Loose, 264 for eight-team Loose, balanced curve limits, independent final validation, all 24 Legends identities, and all 24 four-team SMB4 identities. The same auditor returned **APPROVE — Major 0 / Minor 0** after an independent 163/163 core gate and 4/4 exact-440 calibration. Builder TypeScript, lint, diff integrity, and the 2,744-module production/PWA build are green. FINDING-249 FARM companion authority and FINDING-250/252 remain integrated. Migration `20260720213000_farm_snake_live_catalog.sql` remains applied. **NEXT:** publish one replacement preview for JK's browser walk. Production is unchanged.

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

1. Publish one exact replacement branch preview from approved head `1bac2cfe` plus its audit record.
2. JK runs the Legends-source, four/eight-team setup, and FARM Hotseat-plus-companion walks.

The exact remote sequence and rollback boundary are in
`spec-docs/SNAKE_LIVE_ROOM_PREVIEW_RUNBOOK_2026-07-19.md`. Migration 009 and the corrected Vercel
preview are complete for MLB. The previous farm-identity preview is
`https://kbl-tracker-20p586qnl-kruseja37s-projects.vercel.app`. Vercel production remains on
`ba7f97d6`. That older preview does not contain FINDING-249 or FINDING-250; the required FARM catalog
migration is now installed for the next integrated preview.
