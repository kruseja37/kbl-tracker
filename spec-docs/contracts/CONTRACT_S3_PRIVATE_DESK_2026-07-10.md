# CONTRACT S3 — THE PRIVATE DESK (rankings, THE BOARD, the advisor LOG)
Captain: Fable · Builder: Codex gpt-5.6-sol high · Date: 2026-07-10
Branch: codex/snake-s3-desk · Base: main @ ec80b15a (S1a+S1b+S2 merged)

## AUTHORITY (read in this order)
1. spec-docs/SNAKE_DRAFT_VISION_2026-07-10.md — design of record: THE DRAFT BOARD (the
   core object), POSITIONAL RANKINGS, THE ADVISOR/LOG, EVERY CARD SHOWS THE FALLOUT,
   MONEY-in-words, First Law. Layered doc — later sections supersede earlier.
2. spec-docs/SNAKE_DRAFT_V1_PROGRAM_2026-07-10.md — S3 lane + CODE-TRUTH ANSWERS
   (CT1 BINDS COPY: the tax view says "top-N bullpen arms" — NO CP line) + appendix.
3. spec-docs/contracts/CONTRACT_S1A_FOUNDATIONS_ENGINE_2026-07-10.md — engines + audit.
4. spec-docs/contracts/CONTRACT_S2_THE_ROOM_2026-07-10.md — the room you plug into
   (reveal surfaces, reducer, carry-forward notes).
5. spec-docs/DRAFT_SKIN_STANDARD_2026-07-08.md — tokens, retro voice.

## LAWS (REJECT criteria)
- FIRST LAW (the heart of this lane): it's the GM's BOARD. The desk computes money,
  legality, risk, scarcity — it NEVER ranks for the GM beyond the advisor SEED the GM
  confirms, never reorders a hand-touched ranking, never recommends a board move. The
  WHAT-IF sandbox evaluates a hypothetical and reports consequences — it NEVER searches,
  suggests, or optimizes. If you find yourself writing a "best swap" — STOP.
- FROZEN-TOUCH LAW: any hand-placed ranking or board slot NEVER moves silently. The
  ONLY auto-motion is backfill on unavailability (drafted/retired-version), which
  promotes YOUR next-ranked player at that slot's position — and says so.
- ADVISORY ≡ SETTLEMENT: all money via the S1a engines (two bills, marginal tax,
  legal-finish). No hand-rolled math. NO PERCENTAGES anywhere.
- PRIVACY: the desk renders ONLY inside reveal-gated surfaces (useSeatReveal / the S2
  private pane) — never on the shared frame uninvited. Rational-room reads come from
  the public-inputs engine; the desk never leaks another seat's privates because none
  are readable.
- COPY LAW: 14-year-old readable. CT1: bullpen tax copy = "top-N bullpen arms", no CP
  line. AUCTION FROZEN. ENGINES ARE DONE (gaps = STOP).

## FILE SURFACE (no concurrent lane, but stay tight)
- NEW: src/src_figma/app/components/snake/desk/ (new subdir: BoardView, RankingsView,
  AdvisorLog, WhatIfSandbox, cards) + tests · optional small page-level integration
  edits to src/src_figma/app/pages/SnakeDraftRoom.tsx and components/snake/
  SnakeDraftRoomView.tsx (plug the desk into the EXISTING reveal-gated private pane —
  minimal diff, do not restructure the ritual/reducer).
- Storage: per-seat board/rankings persist via the S1a session fields (seatBoards) and
  boardRankOverrides pattern — through EXISTING helpers. If a helper is missing → STOP.
- FORBIDDEN: engines edits, auction files, App.tsx, flags, leagueBuilderStorage.ts
  schema, snakesetup/, the reducer's ritual states.

## SCOPE
### D1. POSITIONAL RANKINGS (prep, live during draft as EDIT TARGETS destination)
Rank candidates BY POSITION across the 22 roster-slot taxonomy. Advisor SEEDS an order
from fit-adjusted worth (assembleBoard w/ the seat's locked archetype); every card: one
archetype chip + one coarse fit word + TRUE COST (IV + YOUR marginal tax). GM drags to
reorder (RankReorderList — the existing generic component); hand-touches frozen forever
(boardRankOverrides pattern). Drafted names strike through; survivors never re-sort
under your feet.

### D2. THE DRAFT BOARD (the core object)
22 slots keyed by the roster taxonomy, each holding your top target for that slot —
seeded FROM your rankings, never from thin air. Board membership (not slot arrangement)
drives PLAN COST / PLAN TAX / PLAN CUSHION (S1a two-bills engine) — render the two
bills with their distinct names, in words. Tax tap-down: category view per CT1
("YOUR TOP 8 HITTERS BY POWER…", "TOP-4 BULLPEN ARMS…" — no CP line).
- BACKFILL: when a board name becomes unavailable (drafted elsewhere / version
  retired), YOUR next-ranked available player at that position steps up, with a private
  notification line ("DEXTEREZ GONE — MURASKI STEPS UP AS YOUR SS PLAN"). If your
  ranking list for that position is exhausted: the slot flags PLAN BROKEN — no
  invented candidates.
- Slot health: depth-degradation renders plainly ("YOUR SS SLOT IS DOWN TO DEPTH — 2
  STARTERS LEFT YOU'VE RANKED").
- WHAT-IF: drag players between board slots / swap in a candidate → live recompute of
  both bills → KEEP or REVERT. Consequences only (First Law).

### D3. RISK READS + THE ADVISOR LOG
Per board/ranking card: the rational-room read for YOUR next pick (SAFE TO WAIT /
AT RISK / LIKELY GONE — the S1a categorical engine, never re-derived). The LOG: a
private, chronological feed of advisor lines — actionability leash (a line appears
ONLY when actionable: scarcity threat to YOUR board, plan-break, backfill events);
one sentence each; expiry semantics (a line about a player leaves when he's drafted /
the condition clears). Optional LLM dressing of the ONE displayed sentence via the
ADVISORCOLOR pattern (flag-gated, template fallback, validation gate) — the facts
adapter is pure and tested; if wiring the LLM connector is heavy, ship the template
path and leave the emission seam labeled (JK's connector decision can land later).

### D4. EVERY CARD SHOWS THE FALLOUT
One candidate card = one decision fully priced: fit chip + word · TRUE COST · the
consequence line from the legal-finish engine ("AFTER RESERVING A LEGAL 22: $X LEFT" /
the block reason) · board fallout ("FITS YOUR BOARD — SS SLOT" / "OFF-BOARD: taking him
bumps your CF plan to depth" — the what-if recompute, one line).

## TESTS
Frozen-touch (hand-touch never moves; backfill only on unavailability, promotes
next-ranked, PLAN BROKEN on exhaustion) · two bills render distinct + engine-sourced ·
what-if keep/revert round-trip + no-optimizer tripwire (assert no API surface returns a
suggested move) · risk reads match the engine verbatim · LOG actionability + expiry ·
CT1 copy (no CP line) · reveal-gating (desk absent while covered) · per-seat
persistence round-trip via session seatBoards.

## GATES (paste real output)
1. `npx tsc --noEmit` clean. 2. `npm run build` exit 0. 3. Owned suites green.
4. Auction suites green (28 files). 5. ONE full `npx vitest run` (known solo-flakes:
LeagueBuilderDraftSetup family, franchiseManualSmokeFixture — verify solo if red).

## PROTOCOL
No git write commands (captain cuts commits). UNKNOWN/surprise = STOP and report.
Builder report appended here: file:line, REAL gate outputs, STOPs, auditor attack list.
