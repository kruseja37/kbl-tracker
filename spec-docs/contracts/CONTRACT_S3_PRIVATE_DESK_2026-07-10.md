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

---

## FINAL BUILDER REPORT — Codex S3 (2026-07-10) — COMPLETE

### Outcome

S3 is complete from the upheld STOP seam. The private desk is wired into the live snake
room with the captain-authored player-band adapter, GO-locked club archetypes, engine-backed
rational-room reads, the two distinct money bills, per-seat board persistence, frozen-touch
backfill, actionable/expiring LOG lines, slot-depth warnings, and consequence-only WHAT-IF
KEEP/REVERT. No git write command was run. The prior BLOCKED report remains above as the trail.

No auction file, engine file, storage schema/version, route, flag, snake-setup file, or ritual
reducer was edited. `src/engines/snakePlayerBands.ts` and its captain-authored test are
byte-untouched. The pre-existing untracked operator files `DISPATCH_PROMPT.txt`, `run_lane.sh`,
and `sentinel.sh` were read only for the lane command context and were not modified.

### Amendment 1 and page-level wiring

- `src/src_figma/app/components/snake/desk/deskRoomModel.ts:42-74` is the one page adapter:
  every stored-player row calls `derivePlayerBandWeights`; missing required ratings emit a loud
  `console.warn` and set `fitKnown=false`. `fitWord` renders `FIT UNKNOWN` instead of silently
  accepting the neutral market fallback (`:98-115`).
- `deskRoomModel.ts:76-157` resolves each seat from the archetype locked in
  `session.snakeSetup`, builds the real picked roster/spend state, and delegates the categorical
  read verbatim to `playSnakeRationalRoom`. The desk never reads rival boards or rankings.
- `src/src_figma/app/pages/SnakeDraftRoom.tsx:100-150` restricts the live room to the
  GO-selected/version-trimmed `snakeSetup.poolPlayerIds`, projects stored ratings/position shape,
  and constructs every rational-room row through that adapter.
- `SnakeDraftRoom.tsx:219-382` assembles fit-adjusted advisor worth through the existing
  `computeOwnValue` + `assembleBoard` seams; computes TRUE COST, LEGAL-FINISH CUSHION, PLAN
  COST/TAX/CUSHION, rational risk/reasons, board fallout, depth, CT1 tax-core rows, backfills,
  PLAN BROKEN, and the actionable LOG from the existing engines and persisted session state.
- `SnakeDraftRoom.tsx:384-419` seeds/backfills and persists only the active seat's `seatBoards`
  record through the existing `saveMlbDraftSession` helper; rank edits increment the seat record,
  preserve every other seat, and stamp touched player IDs as frozen.
- `SnakeDraftRoom.tsx:421-455` plus
  `src/src_figma/app/components/snake/desk/WhatIfSandbox.tsx:5-49` price only the GM's chosen
  move, show both PLAN and engine-backed LEGAL-FINISH consequences, reject an illegal slot KEEP,
  and expose no optimizer/search/suggested-move API.
- `SnakeDraftRoom.tsx:498-540` mounts the full desk as the existing private-pane child.
  `src/src_figma/app/components/snake/SnakeDraftRoomView.tsx:298-319` renders that child only
  after the current seat is revealed; covered/shared states never mount its content.

### Frozen-touch / First-Law behavior

- `src/src_figma/app/components/snake/desk/deskModel.ts:68-126` seeds unique 22-player boards
  from positional advisor rankings, recognizes SP/RP swing eligibility for both staff classes,
  and contains no optimization entrypoint.
- `deskModel.ts:128-184` backfills only an unavailable slot from the GM's own persisted order;
  every surviving placement and the ranking record stay unchanged, with PLAN BROKEN on exhaustion.
- The Board, Rankings, candidate fallout, tax-core tap-down, depth warning, LOG, and WHAT-IF UI
  live entirely under `src/src_figma/app/components/snake/desk/` and use the two-bill/copy names
  required by the contract. Bullpen tax copy is always `top-N bullpen arms`; no CP tax line exists.

### Adversarial test evidence

- `deskRoomModel.test.ts:100-152`: captain adapter weights are non-neutral; changing only a
  rival's locked archetype changes the same power-skewed player's read from `LIKELY_GONE` to
  `SAFE_TO_WAIT`; missing ratings warn + show `FIT UNKNOWN`; a seat-board update preserves the
  other seat; later team edits cannot replace the session's locked archetype.
- `deskModel.test.ts:43-126`: 22 unique slots, no-optimizer tripwire, SP/RP dual eligibility,
  illegal WHAT-IF rejection, frozen survivor/backfill, PLAN BROKEN, LOG expiry, and CT1 copy.
- `PrivateDesk.test.tsx:26-60`: distinct PLAN bill, engine legal-finish bill, risk/fallout,
  slot consequence, and KEEP/REVERT controls.
- `SnakeDraftRoomView.test.tsx:32-38`: private desk content is absent while covered and appears
  only after reveal; the existing auto-cover/pause/trade/correction tests remain green.

The NFL caught one real omission after the first green pass: WHAT-IF showed only the plan bill
and allowed an illegal slot KEEP. That pass was invalidated, the narrow correction above was
made, and Gates 1→5 were restarted from Gate 1. Only the restarted outputs below are final.

### Final Gates 1→5 — real terminal output

**Gate 1 — `NODE_ENV= npx tsc --noEmit`**

```text
FINAL_GATE1_EXIT=0
(no compiler output)
```

**Gate 2 — `NODE_ENV= npm run build`**

```text
✓ built in 10.53s
PWA v1.2.0
precache  197 entries (5445.98 KiB)
files generated
  dist/sw.js
  dist/workbox-1d305bb8.js
FINAL_GATE2_EXIT=0
```

Vite emitted only its existing chunk-size/dynamic-import warnings.

**Gate 3 — owned S3 suites + captain adapter suite**

```text
Test Files  5 passed (5)
Tests       29 passed (29)
Duration    1.98s
FINAL_GATE3_EXIT=0
```

**Gate 4 — auction preservation**

The repo currently has 36 auction-named test files, so the final run used all 36 as a strict
superset of the contract's historical 28-file gate.

```text
FINAL_GATE4_FILE_COUNT=36
Test Files  36 passed (36)
Tests       452 passed (452)
Duration    70.06s
FINAL_GATE4_EXIT=0
```

**Gate 5 — one full final `npx vitest run` after the restart**

```text
Test Files  635 passed | 8 skipped (643)
Tests       9619 passed | 15 skipped (9634)
Duration    235.33s
FINAL_GATE5_EXIT=0
```

There were zero red files, so no solo-flake rerun was needed.

Final hygiene: `git diff --check` exited 0 with no output; adapter diff was empty; auction-path
diff was empty.

### STOPs / surprises

- No unresolved UNKNOWN or contract STOP remains.
- The live page had been reading the full registered pool rather than the version-trimmed pool
  locked at GO. S3's rational-room assembly now consumes the session-selected IDs, within the
  allowed page integration surface.
- The first Gate-2 capture returned a still-running terminal session before its exit marker;
  the final restarted Gate 2 was polled to its real exit 0 and is the only build evidence above.

### Auditor attack-first list

1. Run an 8-club real browser draft with sharply different locked archetypes and confirm the
   same target's risk changes without exposing any rival private board/ranking data.
2. Attack mid-draft reload and two-seat edits against IndexedDB: each seat's `seatBoards` record,
   frozen rankings, revision, backfills, and selected version pool must round-trip unchanged.
3. Draft/retire a board target and an SP/RP version: only its slot may backfill, the next hand-ranked
   eligible name must promote, and exhaustion must show PLAN BROKEN without moving a survivor.
4. Try WHAT-IF with an off-board member, a board-to-board swap, and an illegal hitter→SP slot:
   tax must depend only on membership, both bills must update, illegal KEEP must stay disabled,
   and REVERT must restore byte-identical saved board state.
5. Verify every private surface auto-covers on pick advance, public-lens change, pause/trade ritual
   changes, and reload; no desk name, LOG line, risk reason, or sound may leak to the shared frame.

---

## AUDIT — opus, independent, 2026-07-10 — VERDICT: APPROVE-WITH-NOTES
Gates re-run independently (tsc clean · 5 owned suites 29/29 · 8 auction spot suites
green incl. production gauntlet · S2 room suites green). All eight attack vectors PASS:
First Law holds under auditor-authored probes (no-op reconcile returns the same object
reference; rival-worth inversion never re-sorts; backfill promotes the GM's own order,
not advisor-best) · neutral-fit ban enforced (adapter byte-identical to the captain
commit; archetype sensitivity proven non-decorative: LIKELY_GONE vs SAFE_TO_WAIT under
different locked rivals) · locked-at-GO honored against live-state edits · frozen-touch/
backfill/PLAN BROKEN exact · two bills distinct + membership-only tax + what-if
consequences-only w/ byte-identical REVERT · zero percentages · CT1 copy (no CP line) ·
privacy unmount-not-hide + LOG leash + partition clean.
NOTES (non-blocking): spurious first-open backfill LOG lines on mid-draft first open
(cosmetic); boards persist for CPU/on-clock seats (harmless extra writes); startWhatIf
lacks try/catch on an unreachable two-version case.
CARRY-FORWARDS: S4 — reuse the privateDesk seam + consequences-only pattern; no
"suggested trade" surface ever. TAXSWING — deskModel belongs()/buildTaxCoreRows
hand-rolls the swing-arm grouping for the tax-core NAME LIST (dollars are engine-
sourced and stay correct); the TAXSWING merge must re-check the explainer grouping so
names match the new settled tax.
