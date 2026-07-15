# CONTRACT — Snake live UI crawl repairs (2026-07-14)

## Authority and scope

This contract closes the defects reproduced during the post-Amendment-9 live
production crawl of the Snake Draft. It is subordinate to the ratified
`rosterConstruction.ts` law, the approved Snake Intelligence contract, team-first
privacy, companion parity, the Help-button law, and JK's browser walk as the only
product-acceptance gate.

Builder and auditor remain different agents. Builders do not edit audit/status
documents, stage, commit, or audit their own changes. No Auction, Legends,
GameTracker, schedule, or unrelated Franchise behavior is in scope.

## Finding 161 — the stock 20-club SML cannot build a legal Snake pool

### Reproduced failure

The live `Super Mega League` Draft Setup loaded every available source card yet
reported zero cards outside the pool and remained short five closers. Static
source proof found fourteen club-assigned CP records plus two free agents. Six
SML clubs have five bullpen arms but their final designated bullpen chair is
stored as RP: Wild Pigs, Sand Cats, Platypi, Grapplers, Heaters, and Overdogs.
The same roster-table convention stores the final bullpen chair as CP for every
other SML club.

The six source corrections produce twenty club closers plus two free agents,
and all twenty stock 22-player rosters then form a disjoint constructive legal
seating. The remaining displayed shortage of five is not a real legality
shortage: `derivePositionSupplyFloorTargets(20)` adds seven competitive-surplus
cards to the twenty-club closer minimum and `snakeSeatingProof.ts` incorrectly
uses that quality target as a hard start gate.

### Required repair

- Correct the six stock records at their source of truth. The designated closer
  records are Hander O'Speciallo, Ice Vainer, Walt Huckster, Meggy Meggles, Huck
  Enduck, and Doug Nerdwerd.
- Preserve the ratified true-CP roster law. RP and SP/RP must not become generic
  closer substitutes.
- Existing IndexedDB installations must migrate those exact stock SMB4 records
  without requiring the user to clear data or re-import. The migration may touch
  only exact SMB4 stock IDs and may not rewrite custom/historical cards.
- A fresh seed and a migrated seed must each expose at least one club-assigned CP
  for all twenty SML clubs. A stock 20-club source universe must clear the hard
  legal closer floor and be able to produce a constructive legal seating.
- Separate hard feasibility from competitive pool quality. The hard Snake
  seating/source-universe floor for closers is exactly
  `teamCount * LEGAL_ROSTER.minClosers`; for twenty clubs it is twenty, not
  twenty-seven. The existing surplus target of twenty-seven may remain a
  production-shape target or visible pool-quality warning, but it may not lock
  or block a draft when constructive legal seating is proven.
- Do not weaken `LEGAL_ROSTER.minClosers = 1`, admit RP as a CP substitute, or
  invent five additional stock closers. Hard feasibility and soft competitive
  depth must be named and tested separately so callers cannot confuse them.
- Salary/IV must be recalculated from the corrected CP position wherever the
  normal import/migration contract requires it; stored locked-draft truth must
  never be silently mutated.

### Allowed paths

- `src/data/playerDatabase.ts`
- `src/utils/leagueBuilderStorage.ts`
- `src/engines/poolFromDemand.ts`
- `src/engines/snakeSeatingProof.ts`
- Focused player-database, storage-migration, pool-demand, Draft Setup, and Snake
  setup tests only

### Finding 161 independent verdict

**VERIFIED — zero major, zero minor.** The independent auditor proved exactly
six source RP-to-CP corrections, twenty club-assigned true closers, all original
stock 22s legal, and 440 unique/disjoint seats from the 506-card source. Hard
feasibility remains twenty CP while competitive shaping remains twenty-seven;
mutations that conflated either caller failed. The guarded v9-to-v10 migration
preserves salary/IV parity, refuses custom/historical collisions, upgrades older
databases, and leaves locked pool/session bytes untouched. The reconstructed
Finding-161 gate passed 181/181 focused tests, exact-path lint, TypeScript,
production build, and diff hygiene. Finding 161 is closed.

## Finding 162 — early full-pool intelligence is not real-time

### Reproduced failure

In a real two-club practice room with 506 available cards, candidate risk rows
remained `CALCULATING` for tens of seconds, the Asst GM Board remained pending,
and a simple browser query was delayed about forty seconds while both workers
ran. After Amendment 10 made the live 22 legal, a fresh first-pick reveal showed
the selected player correctly `ON BOARD`, but the Asst GM Board settled to
`UNAVAILABLE` in about 2.8 seconds; switching back to My Board then missed the
browser click deadline while intelligence work continued. The current realistic performance test starts every club at twenty-one
players, so it exercises the final-seat fast path rather than the actual first
round. The rational worker also revalidates a large constructive certificate
inside repeated candidate probes.

### Required repair

- Add a production-shape early-draft benchmark: 20 clubs, 440 required seats,
  500+ balanced source cards, no completed picks, a full first-round interval,
  and requested reads for the visible My Board/selected-player surface.
- The page must remain interactive while workers run. A player selection, board
  tab switch, cover, or team switch must render within one animation frame in a
  real browser and must synchronously invalidate prior private output.
- On the repository's reference machine, the first useful Asst GM Board must be
  ready within 2,000 ms and the selected/visible candidate decision read within
  2,500 ms. A full background expansion may continue after those useful results,
  but it may not block input or replace exact results with invented probability.
- A valid, solvent, version-resolved 22 must never collapse to the generic
  unavailable state. Focused production-shape coverage must identify and kill
  the exact engine or response-validator reason seen by the live first-pick room.
- Remove repeated proof work inside one semantic request. A root certificate may
  be validated once and advanced through trusted, mutation-tested internal paths;
  every returned advance must still be a constructive canonical certificate.
- It is permissible to prioritize selected and current-board players before the
  rest of the pool. It is not permissible to hide stale reads as ready, drop the
  full pool from rival choice simulation, weaken legal/affordability proof, or
  manufacture scarcity counts.
- Main and companion must use the same engine truth and cancellation/privacy
  epochs. Multiple open tabs or a companion may not resurrect or overwrite a
  newer semantic request.

### Allowed paths

- `src/engines/snakeRationalRoom.ts`
- `src/engines/snakeSeatingProof.ts`
- `src/engines/snakeAssistantBoard.ts` only if the new benchmark proves an
  independent Asst GM bottleneck
- Snake rational/assistant workers and their three desk hooks
- `src/src_figma/app/pages/SnakeDraftRoom.tsx`
- `src/src_figma/app/pages/SnakeCompanion.tsx`
- Focused engine/hook/page performance and behavior tests only

## Finding 163 — the frozen responsive preview advertises dead behavior

### Reproduced failure

`/__preview/snake-responsive` renders the intended production components but
hard-codes Jovita, sends every selection/reorder/team/trade callback to a no-op,
leaves the Asst GM Board idle forever, and opens the companion with private data
already visible. Live clicks confirmed that selecting Sam, moving a ranking,
switching teams, nodding/executing a trade, and opening the assistant board do
not change the rendered truth.

### Required repair

- Make the preview a deterministic stateful test drive, not a screenshot fixture.
- Main preview must start covered. After reveal, selecting a pool row changes the
  selected profile; reordering changes both rankings and the refitted My Board;
  team switch covers before the new seat can reveal; Asst GM Board has a ready,
  distinct optimized result; trade nods gate execution and execution visibly
  transfers the exact picks.
- Companion preview must start fully covered and remove private desk/profile text
  from the DOM until RETURN. Cover/return must create a fresh private epoch.
- Preview state is local and disposable. It must not write production IndexedDB
  or pretend a mock action reached a live league.
- The green/gold KBL palette, club primary/secondary branding, 44px controls,
  neutral fallbacks, and Help-only explanatory copy are mandatory.

### Allowed paths

- `src/src_figma/app/pages/SnakeResponsivePreview.tsx`
- Preview-only pure fixture/state helpers adjacent to that page
- `tests/snake-responsive.spec.ts` and preview-focused component tests

## Finding 164 — iPad selection separates the board from the player decision

### Reproduced failure

At 1280x720, the full selected-player card occupies the private column's entire
viewport and the My Board tabs begin below it. Every candidate change then calls
`scrollIntoView` on the profile. The repeated job therefore becomes: scroll down
to organize players, tap a player, get pulled back to the profile, then scroll
down again. Existing responsive tests call `scrollIntoViewIfNeeded` before each
control and therefore do not measure this workflow.

### Required repair

- At 1024x768 and wider, keep the currently selected profile/consequence/action
  visible beside the My Board/Asst GM Board/Player Pool workspace. The board must
  have its own stable scroll context; selecting a row may not move the board's
  scroll position.
- At 768x1024, keep a compact selected-player action strip visible while the full
  profile opens and closes without losing the board's scroll position. The full
  card must retain every non-zero rating, positions, traits, personality,
  chemistry, archetypes, fit, salary, tax, true cost, and consequence requested
  by JK. Pronouns remain engine-only and are not displayed.
- Remove unconditional page-level `scrollIntoView` selection choreography.
- The roster/money/chemistry truth and gavel remain reachable without covering
  the player pool. No explanatory copy may be added outside Help.
- Add a real browser workflow at both iPad viewports that selects at least three
  different players, reorders one position and the overall board, opens the Asst
  GM Board, returns to My Board, and proves the board scroll anchor remains
  stable and every critical action is visible without horizontal overflow.

### Allowed paths

- `src/src_figma/app/components/snake/SnakeDraftRoomView.tsx`
- `src/src_figma/app/components/snake/desk/SelectedPlayerCard.tsx`
- `src/src_figma/app/components/snake/desk/PrivateDesk.tsx`
- Narrow adjacent Snake desk presentation components only if required for the
  responsive split; no engine/storage behavior changes in this batch
- Focused room/desk tests and `tests/snake-responsive.spec.ts`

## Combined gates

1. Red-first direct regressions for all four findings.
2. Focused source/migration, early-draft performance, privacy, preview-action,
   main/companion parity, selected-player, board-refit, and responsive suites.
3. Exact changed-file ESLint with `--no-inline-config`, zero errors/warnings and
   no new disable comments.
4. Full Snake matrix and responsive Playwright at 1024x768 and 768x1024.
5. TypeScript project check and production build.
6. Full serial repository Vitest and `git diff --check origin/main...HEAD`.
7. Separate auditor returns VERIFIED with zero major and zero minor findings.
8. Fresh production browser crawl completes setup -> live MLB Snake -> recap ->
   scout hire -> farm -> franchise handoff with no schedule required.
9. Frozen build remains running for JK's manual browser walk. Only that walk can
   accept the product.

## Findings 163/164 first independent audit rejection

The first independent responsive-preview/iPad audit returned **NOT VERIFIED —
seven major, two minor** even though the builder's focused tests and responsive
Playwright were green. The repair must close all of the following as one
state-machine and workflow correction, not as cosmetic assertions:

1. Selected-player consequences must execute the exact same legal refit as
   Keep. Displayed board salary, tax, all-in, fit, chemistry, moved slots, and
   legal-finish truth must match the actual resulting board byte-for-byte. A
   no-op refit is not a ready action.
2. Only the active seat that owns the current live pick may draft. `recordPick`
   must credit that exact on-clock owner. An off-clock revealed desk may inspect
   and reorganize but can never expose an enabled gavel.
3. Initial and newly drafted players are unavailable everywhere: pool, My
   Board, Asst GM Board, selection, and gavel. Every completed pick refits both
   boards around the updated availability/version set. Duplicate drafting is
   impossible.
4. Executed trades must update the live order owner as well as owned-pick lists,
   receipts, next-pick text, and trade revision. The public live window and
   private seat must agree immediately.
5. Main and companion must derive roster players, salary, marginal tax, total
   tax, all-in, and money left from one shared local fixture truth. No hardcoded
   divergent salary or zero-tax ledger is permitted.
6. At 768x1024 the compact selected-player action strip must remain visibly
   reachable while the GM scrolls the independent board workspace; it cannot be
   trapped inside an off-screen sibling. Companion must meet the same
   side-by-side landscape and persistent compact-action portrait workflow as
   main, with independent board scroll and preserved anchor.
7. The preview must enter a visible local recap after its final pick. Companion
   SIGN OUT must cover and clear its private epoch; FORGET ROOM must reset every
   local private board/selection/history/assistant/trade/offer value. No visible
   terminal control may be a no-op.
8. REVERT may undo only the displayed selected-player Keep/refit transaction. It
   must never restore an unrelated prior ranking action. Hide it when no exact
   reversible transaction exists.
9. Regression tests must assert the action strip is actually inside the
   viewport while organizing, exact consequence-versus-result truth for every
   off-board candidate, on-clock gavel ownership, drafted-player removal and
   duplicate refusal, live-order transfer, main/companion finance equality,
   companion layout/workflow at both iPad orientations, complete recap, and
   terminal reset semantics. Green control counts without these outcomes do not
   satisfy the gate.

Allowed files remain the Finding-163/164 paths, the adjacent preview fixture,
`SnakeCompanionFrame.tsx` only for the required responsive presentation, and
focused preview/room/companion tests. Production draft storage/engine semantics
remain out of scope for this repair.

## Final verdict — 2026-07-14

**VERIFIED — zero remaining findings.** The responsive preview and production
Snake lifecycle are independently green. Final live gate: 17/17 across 1024x768,
768x1024, and 430x932, including exact trade transfer, private epoch rotation,
MLB→no-trade-FARM→staffing→zero-schedule Franchise launch, and later manual/CSV
schedule entry. Final serial repository gate: 686 passed files / 10,227 passed
tests / zero failures. Strict changed-file lint, TypeScript, production build,
and diff integrity are green on code commit `f8ca392d`. JK's browser walk remains
the sole product-acceptance gate.
