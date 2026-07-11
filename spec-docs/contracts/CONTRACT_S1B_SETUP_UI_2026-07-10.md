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

---

## BUILDER REPORT — Codex S1B (2026-07-10) — BLOCKED

### Outcome

**BLOCKED by a contract-level UNKNOWN.** I stopped before the ordered gate sequence and
did not run any git write command. The partial tree is intentionally dirty for the
captain to inspect or amend. No auction page/flow/component, `src/engines/*`,
`leagueBuilderStorage.ts`, S2-owned component, sound, or room file was edited.

### Partial build present in the tree

- A new four-card setup page is present at
  `src/src_figma/app/pages/SnakeDraftSetup.tsx:28-389`: source-league pool selection,
  source-identity-threaded version grouping, version picker, hand removal, S1a seating
  proof rendering, expandable club rows, visible seeded shuffle, tap-two swap, snake
  preview/turn callouts, revision-safe `CHECKING…`, and a draft-session creation attempt.
- N1 is wired at `SnakeDraftSetup.tsx:62-98,111-121,203-244`: carried `sourceId` reaches
  `deriveVersionGroupId`; stripped same-name cards show the contract's loud warning and
  emit `console.warn`.
- The default-OFF v1 flag is in `src/utils/franchisePhase2Flags.ts:160-172`; the guarded
  `/snake-setup` route and required S2 merge comment are in `src/App.tsx:409-412`.
- Spec-first component coverage is in
  `src/src_figma/__tests__/pages/SnakeDraftSetup.test.tsx`; the default-OFF route check is
  in `SnakeDraftSetup.route.test.tsx`.

### Spec-first red evidence

The owned test was run before the page existed:

```text
 RUN  v4.0.18 /private/tmp/kbl-s1b

 ❯ src/src_figma/__tests__/pages/SnakeDraftSetup.test.tsx (0 test)

 FAIL  src/src_figma/__tests__/pages/SnakeDraftSetup.test.tsx
Error: Failed to resolve import "../../app/pages/SnakeDraftSetup"

 Test Files  1 failed (1)
      Tests  no tests
```

### Verification completed before the STOP

Focused owned tests plus the bare TypeScript check were run together. The test output was:

```text
 RUN  v4.0.18 /private/tmp/kbl-s1b

 ✓ src/src_figma/__tests__/pages/SnakeDraftSetup.route.test.tsx (1 test) 410ms
 ✓ src/src_figma/__tests__/pages/SnakeDraftSetup.test.tsx (5 tests) 307ms

 Test Files  2 passed (2)
      Tests  6 passed (6)
   Start at  18:06:02
   Duration  1.98s (transform 1.11s, setup 94ms, import 1.50s, tests 717ms, environment 604ms)
```

The following `npx tsc --noEmit` in the same `&&` command exited 0 with no output.

The formal Gate 1→5 sequence was **not** started after the STOP. Therefore there is no
build, auction-28, or full-suite claim in this report.

### Binding STOP / UNKNOWN

`LeagueBuilderMlbDraftSession` has no S1b setup fields for:

- selected pool player IDs / selected version card per human;
- club GM name;
- companion-vs-hotseat declaration;
- locked team archetype.

The partial GO handler at `SnakeDraftSetup.tsx:282-305` can persist only seed, pick order,
and the pre-existing S1a session fields. Proceeding would silently throw away Card 1's
version/pool decisions and Card 2's room decisions before navigation. Adding those fields
requires an additive edit to `src/utils/leagueBuilderStorage.ts` and a session-model ruling;
that file is outside S1b's owned surface, and the contract says engines/session foundations
are done. Encoding them into an unrelated existing field would be improvisation.

The stored `Player` interface also does not guarantee the historical adapter's `sourceId`.
The partial page correctly threads it when carried and warns loudly when stripped, but a
durable adapter-to-storage handoff remains dependent on the captain's intended source path.

### Captain decision needed before resume

Amend S1a/S1b authority with the exact additive session fields (and ownership for the
storage edit), or name the already-existing durable record that S2 will read for all four
setup decisions. Once resolved, the builder should first add a GO-persistence test proving
that S2 receives the chosen version/pool and club declarations, then finish hand add/remove,
run Gates 1→5 in order, and replace this BLOCKED report with final evidence.

### Auditor / captain: attack first

1. Confirm the setup-to-room data contract; do not accept a session that preserves only
   order and seed.
2. Confirm the historical adapter source identity survives into the actual stored pool,
   not only injected component fixtures.
3. Review the partial REMOVE behavior before continuation: it currently removes the first
   card in a rendered group and the hand-ADD restore surface is not yet implemented.
4. Re-run all ordered gates only after the authority amendment; no auction-preservation or
   full-suite evidence exists for this blocked partial tree.

---

## AMENDMENT 2 (captain ruling on the STOP, 2026-07-10) — the setup record

The STOP is upheld: the session must durably carry all four setup decisions. Ruling:

1. OWNERSHIP GRANT: S1b may make ONE additive-only edit to
   `src/utils/leagueBuilderStorage.ts` — extend `LeagueBuilderMlbDraftSession` with a
   single new OPTIONAL field. No store renames, no DB version change, no edits to any
   existing field or its semantics. (The concurrent S2 lane is forbidden from this file,
   so the partition holds.)
2. THE FIELD (exact shape; keep names):
   ```ts
   snakeSetup?: {
     /** Final trimmed pool: the chosen version card per human, plus all non-versioned picks. */
     poolPlayerIds: string[];
     /** versionGroupId -> chosen playerId (only groups with >1 card). */
     versionSelections: Record<string, string>;
     /** Per seat, locked at GO. */
     clubs: Array<{
       teamId: string;
       gmName?: string;
       hotseat: boolean;          // companion-vs-hotseat declaration
       archetypeId?: string;      // the LOCKED-at-GO archetype (rational room input)
     }>;
     /** The visible shuffle seed shown on the ORDER card. */
     orderSeed: string;
   }
   ```
3. GO writes it atomically with the session creation; it is the setup→room data
   contract. Downstream (S2/S3) reads locked archetypes and hotseat declarations from
   here — never from live league state (locked means locked).
4. Required new test: GO-persistence — create a session through the real storage path
   and assert a reader gets back the full snakeSetup record (pool, versions, clubs,
   seed) plus the S1a fields.
5. sourceId durability: keep the current thread-it-through + loud-warning behavior;
   the durable adapter-to-storage handoff is EXPLICITLY deferred to the legends-library
   thread (do not widen Player storage here). Note it in your report.
6. Then: finish REMOVE/hand-ADD per the report's own note 3, and run Gates 1→5 in
   order, replacing the BLOCKED report with final evidence.
