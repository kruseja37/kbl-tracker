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

---

## BUILDER REPORT — Codex S3 (2026-07-10) — BLOCKED / CONTRACT STOP

### Outcome

STOPPED at the required `UNKNOWN = STOP` boundary before page-level data wiring and before
Gates 1→5. No git write command was run. No auction file, engine, storage schema, route,
flag, snake-setup file, or ritual reducer was edited. The tree remains intentionally dirty
for the captain.

### Blocking UNKNOWN — rational-room player fit input is absent

S3 must display the S1a rational-room risk verbatim, and the program says that playout is
driven by every rival's locked archetype. `playSnakeRationalRoom` can do that only when each
`SnakeRationalPlayer` carries `archetypeWeights`; it passes that field to `computeOwnValue`
at `src/engines/snakeRationalRoom.ts:153-166`. The fit engine explicitly falls back to a
neutral multiplier of `1` when the field is absent at
`src/engines/auctionMarketModel.ts:419-431`.

The snake room's registered pool contains only id/IV rows, stored `Player` has no band-weight
field, and no S1a-approved rating→band adapter exists in the contract surface. Therefore:

- passing `undefined` would produce a risk badge that is not the required collective-archetype
  read;
- inventing rating→band math in this UI lane would be new engine/math work and violate
  `ENGINES ARE DONE (gaps = STOP)`;
- importing auction-session private/flow state to obtain weights would violate the frozen-auction
  and public-input laws.

Captain must provide one of: (1) the canonical existing adapter and path S3 is authorized to
consume, or (2) an amended engine/data contract that supplies public per-player band weights to
the snake pool. Work must resume from this seam; do not substitute neutral risk copy.

### Spec-first work completed before the STOP

- First-Law/frozen-touch model scaffolding:
  `src/src_figma/app/components/snake/desk/deskModel.ts:11-209` — positional advisor seed,
  unique 22-slot seed, unavailable-only backfill, PLAN BROKEN, actionable LOG expiry, and CT1
  top-N bullpen-arms tax-core copy. It exposes no optimizer/search/recommendation API.
- Desk UI scaffolding:
  `src/src_figma/app/components/snake/desk/PrivateDesk.tsx:13-43` plus BoardView,
  RankingsView using the existing `RankReorderList`, candidate fallout cards, AdvisorLog, and
  consequence-only WHAT-IF KEEP/REVERT controls.
- Fail-closed S2 seam:
  `src/src_figma/app/components/snake/SnakeDraftRoomView.tsx:43-64,300-318` accepts the desk as
  a private child and renders it only inside the existing `useSeatReveal` branch.
- Spec-first tests:
  `deskModel.test.ts`, `PrivateDesk.test.tsx`, and the added reveal-gating case in
  `SnakeDraftRoomView.test.tsx`.

The required initial red proof was real:

```text
FAIL  .../desk/__tests__/PrivateDesk.test.tsx
Error: Failed to resolve import "../PrivateDesk"

FAIL  .../desk/__tests__/deskModel.test.ts
Error: Failed to resolve import "../deskModel"

FAIL  .../snake/__tests__/SnakeDraftRoomView.test.tsx
ReferenceError: renderRoom is not defined

Test Files  3 failed (3)
Tests       1 failed | 10 passed (11)
```

Focused implementation proof at the STOP seam:

```text
RUN  v4.0.18 /private/tmp/kbl-s3

✓ .../desk/__tests__/PrivateDesk.test.tsx (1 test) 152ms
✓ .../desk/__tests__/deskModel.test.ts (5 tests) 5ms
✓ .../snake/__tests__/SnakeDraftRoomView.test.tsx (11 tests) 838ms

Test Files  3 passed (3)
Tests       17 passed (17)
Duration    1.93s
```

`NODE_ENV= npx tsc --noEmit` also exited 0 with no compiler output after that focused run.
This is not Gate 1 completion: the binding 1→5 sequence was deliberately not started after
the UNKNOWN was confirmed.

### Gates

- Gates 1→5: **NOT RUN — contract STOP before final integration.**
- Auction preservation gate: **NOT RUN — no auction file was touched, but the contract still
  requires the real 28-file gate after the blocker is resolved.**
- Full suite: **NOT RUN — must remain the single Gate-5 invocation after Gates 1→4.**

### Auditor / captain: attack these first after unblock

1. Prove the supplied player-band adapter is canonical, public, and makes rival locked
   archetypes materially affect `playSnakeRationalRoom`; neutral `1` is a reject.
2. Attack the initial 22-slot seed for positional legality and the First Law: it may seed once,
   but no hand-touched survivor may ever move except unavailable-slot backfill.
3. Verify page persistence uses only the existing `saveMlbDraftSession` helper and per-seat
   `seatBoards`, with no schema/version change.
4. Verify the desk subtree never mounts while covered, including pick/trade/lens/seat auto-cover.
5. Verify every candidate's TRUE COST, legal-finish line, risk, and board fallout is engine-sourced
   after the missing adapter is supplied; no neutral/fabricated fallback may ship.

---

## AMENDMENT 1 (captain ruling on the STOP, 2026-07-10) — the canonical player→band adapter

The STOP is upheld and the finding is bigger than S3: player-side `archetypeWeights`
has NEVER been populated anywhere in the live app — even the auction ran player-band
fit at neutral 1. The captain (math authority) has authored the missing adapter
directly in this tree:

- `src/engines/snakePlayerBands.ts` — `derivePlayerBandWeights(input)`: rating/99
  linear weights, role-masked (hitters → Power/Contact/Speed/Defense with
  Defense=(FLD+ARM)/2; pitchers → Rotation/Bullpen per role, SP/RP carries both,
  mirroring the cap tables; unknown role degrades to both pens, never to zero).
- `src/engines/__tests__/snakePlayerBands.test.ts` — 6 tests, green; tsc clean.

Binding on S3 (resume from this seam):
1. EVERY fit consumption in this lane derives weights through `derivePlayerBandWeights`
   — never hand-built at a call site (the adapter-reuse law). This includes the
   rational-room pool assembly in SnakeDraftRoom.tsx (thread real weights into
   `SnakeRationalPlayer.archetypeWeights`) and any desk card fit chip/word.
2. Build the room's pool rows from the stored Player ratings + pos shape (both already
   loaded on the page path); `isPitcher`/`role` come from the same shape projection the
   page already computes.
3. Neutral fallback is FORBIDDEN in S3 surfaces: a pool row missing ratings is a loud
   console.warn + the card renders "FIT UNKNOWN" (copy-law words), never a silent 1.
4. The auditor's attack list item 1 stands: rival locked archetypes must materially
   change `playSnakeRationalRoom` output in your tests (two different archetype rooms
   → different risk reads for a band-skewed player).
5. Do not modify the adapter. If it proves insufficient → STOP again.
