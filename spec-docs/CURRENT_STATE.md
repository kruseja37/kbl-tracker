# CURRENT STATE

> ## RIGHT NOW — SNAKE BROWSER-FEEDBACK REPAIR IS BUILDER-VERIFIED; SEPARATE AUDIT REMAINS (2026-07-19; branch `codex/snake-live-room-authority`). JK completed the four-team preview draft. The bounded repair makes each position board control its starting slot, adds distinct public-pick and companion-submit cues, renders `LIKELY GONE` in red, removes ordinary pitcher FLD from tax while keeping its salary/IV value, and lets proven public completion finish local roster handoff even if live-room cleanup is late. Focused UI/economy/live-room checks, TypeScript, changed-file lint, the 2,744-module production/PWA build, and the full production-shape gauntlet are green. The scale gate completed both four- and eight-team rooms, all 176 eight-team picks, every Standard/Nerfed pool preset, and a ready Assistant GM on every turn. **NEXT:** freeze the exact diff, obtain a separate non-builder audit, then create one authorized preview for JK's browser re-walk. The prior `d2ac79d7` preview is stale for this repair. Production remains on `ba7f97d6`; no merge or promotion occurred.

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

1. Freeze the exact FINDING-246 diff.
2. Obtain a separate non-builder audit.
3. With explicit authority, update one preview and run JK's Hotseat plus companion re-walk.

The exact remote sequence and rollback boundary are in
`spec-docs/SNAKE_LIVE_ROOM_PREVIEW_RUNBOOK_2026-07-19.md`. Migration 009 and the one authorized
Vercel preview are complete. Vercel production remains on `ba7f97d6`.
