# CURRENT STATE

> ## RIGHT NOW — FINDING-248 MLB-TO-FARM IDENTITY AND PROSPECT FLOW IS INDEPENDENTLY APPROVED; NEW PREVIEW READY; JK WALK PENDING (2026-07-20; branch `codex/snake-live-room-authority`, approved code head `914e35e9`). JK completed and confirmed room 4352, then reached Scout Reveal. That exposed a generic flow bug: Snake setup and recovery did not preserve each club's farm identity, so Scout Reveal built false Generalist scouts. New sessions now freeze both identities; the live catalog, recovery, and farm transition carry and cross-check them; missing legacy truth stops with a generic Snake-only repair. The production farm pool is proven to use the exact canonical Standard curve, not Juiced legacy logic, and true prospect grades and ratings remain hidden. Builder proof is 92/92 plus an exact N=500 zero-deviation distribution run, TypeScript, lint, diff integrity, and the 2,744-module production/PWA build. The separate auditor approved the exact head, **Major 0 / Minor 0**. Preview `dpl_3ZkmY2ZVujBS2K5xbX6v7G9mtNk9` is READY at `https://kbl-tracker-20p586qnl-kruseja37s-projects.vercel.app`; authenticated HTTP, deployed-bundle, and Chrome checks pass with no app console warning or error. **NEXT:** JK tests one new Snake league and one recovered legacy league through Scout Reveal and farm transition. Production remains on `ba7f97d6`; no merge or promotion occurred.

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

1. JK runs one new Snake league through Scout Reveal and one recovered legacy league through repair.
2. After those succeed, run the broader Hotseat plus companion re-walk.

The exact remote sequence and rollback boundary are in
`spec-docs/SNAKE_LIVE_ROOM_PREVIEW_RUNBOOK_2026-07-19.md`. Migration 009 and the corrected Vercel
preview are complete. The current farm-identity preview is
`https://kbl-tracker-20p586qnl-kruseja37s-projects.vercel.app`. Vercel production remains on
`ba7f97d6`.
