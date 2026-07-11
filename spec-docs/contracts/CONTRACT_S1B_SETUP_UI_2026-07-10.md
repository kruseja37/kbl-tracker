# CONTRACT S1B — SNAKE DRAFT SETUP (UI assembly)
Captain: Fable · Builder: Codex gpt-5.6-sol medium · Date: 2026-07-10
Branch: codex/snake-s1b-setup · Base: main @ 0529888e (S1a foundations merged)

## AUTHORITY (read in this order)
1. spec-docs/SNAKE_DRAFT_VISION_2026-07-10.md — design of record (SETUP section: four
   cards; v5.1 versions addendum; copy law).
2. spec-docs/SNAKE_DRAFT_V1_PROGRAM_2026-07-10.md — S1b lane + appendix rulings 14, 15.
3. spec-docs/contracts/CONTRACT_S1A_FOUNDATIONS_ENGINE_2026-07-10.md — the engines you
   consume (read the builder report + audit notes; N1 binds YOU).
4. spec-docs/DRAFT_SKIN_STANDARD_2026-07-08.md — visual tokens (ballpark-kit.css).

## LAWS (REJECT criteria)
- COPY LAW: every user-visible string readable by a 14-year-old. No jargon, no
  percentages, no engineer-speak. Plain retro voice, ALL-CAPS chrome per skin standard.
- FIRST LAW: setup helps the commissioner assemble a fair room; it never recommends
  which players belong in the pool beyond surfacing the seating proof's facts.
- AUCTION FROZEN: no edits to any auction page/flow/component. The existing Draft Setup
  page (LeagueBuilderDraftSetup.tsx) is NOT touched — this is a NEW page.
- ENGINES ARE DONE: consume src/engines/snake* as-is. If an engine seems wrong or
  missing something → STOP and report; do not patch engines.

## PARALLEL-LANE FILE PARTITION (hard boundary — violations = REJECT)
Lane S2 runs concurrently in another tree. YOUR files:
- NEW: src/src_figma/app/pages/SnakeDraftSetup.tsx (+ any setup-only subcomponents in
  src/src_figma/app/components/snakesetup/ — a NEW dir) + tests.
- OWNED EDITS: src/App.tsx (add BOTH routes: /snake-setup → your page AND /snake-room →
  a placeholder import path `@/app/pages/SnakeDraftRoom` guarded so a missing module
  never breaks the build — use React.lazy with the flag check, and if that can't be made
  build-safe while the file doesn't exist, add ONLY your own route and leave a
  `// S2 route lands at merge` comment) · src/utils/franchisePhase2Flags.ts (add ONE
  flag: isSnakeDraftV1Enabled, default OFF).
- FORBIDDEN: src/src_figma/app/components/snake/ (S2's dir), any SnakeDraftRoom file,
  sounds, AuctionStage, leagueBuilderStorage.ts, any src/engines/* edit.

## SCOPE — the four-card setup on a NEW page
CARD 1 — POOL: pick source leagues → everyone in them is draftable; hand add/remove
trim list. Players grouped BY HUMAN with version pickers (one-per-human, vision v5.1):
choosing versions happens HERE at pool build. The supply line renders the seating
proof's verdict: "ALL 8 CLUBS CAN SEAT A LEGAL 22 ✓" or the engine's named shortfall in
copy-law words (the engine gives structured reasons — render, don't re-derive).
CARD 2 — CLUBS: one-line rows (expand-in-place): seat, human, companion-vs-hotseat
declaration, team archetype, GM name. (GM name + archetype finally get their setup
surface.)
CARD 3 — ORDER: seeded shuffle with VISIBLE seed · tap-two-to-swap · snake preview
"R1: 1→8 · R2: 8→1" + endpoint back-to-back callouts.
CARD 4 — GO: readiness line + button. Any pool/seat/order change marks GO "CHECKING…"
and re-runs the proof; GO enables only from the latest revision (appendix 15). GO
creates the session via the S1a session model and navigates to the room route.
NO curves, NO dials, NO sizing, NO reserves — if you find yourself building a knob,
STOP.

## N1 — THE LOUD SEAM (audit carry-forward, mandatory)
The S1a versions engine (snakeVersioning.ts) falls back SILENTLY to card identity when
no source identity is supplied — which would quietly defeat one-per-human dedupe. YOU
own the wiring seam: when assembling pool inputs, thread each player's historical
source identity (`sourceId` from the historical adapter path) into
deriveVersionGroupId's input. Add a LOUD guard: if a pool contains players whose names
collide in a version-group-like way but carry no source identity, surface a visible
setup warning (copy-law words: "TWO CARDS NAMED BABE RUTH — TREATED AS DIFFERENT
PEOPLE. REBUILD THE POOL FROM THE LEGENDS LIBRARY TO LINK THEM."), and log a console
warning. Test this seam explicitly (a historical two-version pool dedupes; a
stripped-identity pool warns).

## TESTS
Component tests for: four cards render + copy-law strings · proof verdict + named
shortfall render from engine output · version picker retires siblings at pool level ·
GO staleness (edit after check → CHECKING… → re-enable) · N1 loud-seam cases · flag OFF
= route hidden.

## GATES (paste real output)
1. `npx tsc --noEmit` clean. 2. `npm run build` exit 0. 3. Owned suites green.
4. Auction suites green (28 files). 5. ONE full `npx vitest run` (known solo-flakes:
LeagueBuilderDraftSetup, franchiseManualSmokeFixture — verify solo if red).

## PROTOCOL
No git write commands (captain cuts commits). UNKNOWN/surprise = STOP and report.
Builder report appended to this file: what was built (file:line), REAL gate outputs,
STOPs, what the auditor should attack first.
