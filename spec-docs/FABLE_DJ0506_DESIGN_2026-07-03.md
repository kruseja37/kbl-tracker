# FABLE DESIGN — DJ-05 (design-first pool-lock membership) + DJ-06 (draft-exit legality gate)

**Author:** Fable 5 (design authority) · **Date:** 2026-07-03 · **Status:** BINDING — builder-ready
**Source finding doc:** `spec-docs/FABLE_DRAFT_JOURNEY_AUDIT_2026-07-02.md` §2 (DJ-05, DJ-06)
**Routing:** Codex builds both to this spec; Opus audits the diffs (builder ≠ auditor). Every design
fork below is RULED — the builder makes no design decisions. Where this doc says MUST, it is the
contract; where it says SHOULD, build it unless it costs more than ~15 lines, then flag instead.

Evidence anchors were re-verified against the working tree on 2026-07-03 before writing. Line
numbers are approximate anchors (±10 lines); symbol names are exact.

---

## SECTION 1 — DJ-05: the design-first pool lock must freeze EXACTLY the set the room reviewed

### 1.1 The defect, precisely

Three facts that disagree:

1. **Registration unions two sources.** `registerLeaguePoolForLeague`
   (`src/utils/leagueBuilderPoolRegistration.ts:93-106`) builds membership as
   *league assignments* (Source A, :93-97) **∪** *every league team's `mlbRoster` + `farmRoster`*
   (Source B, :99-106).
2. **The room displays only Source A.** The Draft Setup pool table, the extraction diff
   (`LeagueBuilderDraftSetup.tsx:949-954` — `currentIds` is assignment-filtered), and the axis
   regen (`src/utils/leaguePoolAxisRegenPersist.ts:7-10` — assignment-filtered) all see
   assignments only.
3. **The reconciler that closes the gap runs in one mode only.** The auto-import effect that
   pushes rostered players into assignments ("the pool the user SEES equals the pool the lock
   FREEZES") early-returns on `poolMode !== "pool-first"` (`LeagueBuilderDraftSetup.tsx:751`).

Consequence in **design-first**: a player who sits on some branded team's roster but holds no
league assignment (a "stray") is invisible to the room, invisible to the extraction diff, and
skipped by hidden-modifier regen — yet `lockLeaguePool`
(`src/utils/leagueBuilderPoolBuilder.ts:241-247`) freezes him into the auction snapshot via the
Source-B union. Unreviewed body in the draft + un-regenerated axes. Double breach.

There is also a **latent pool-first variant** nobody ticketed: the auto-import runs once per
league per page-open (`autoImportedRef`, :749-753). A player added to a team roster *after* that
import (another screen, another session) and before LOCK is unioned into the frozen pool without
regen — because `lockLeaguePool` regens FIRST (assignment set), REGISTERS second (union). The
structural fix below closes this class in both modes.

### 1.2 The ruling — membership law, Option A (reviewed-set-only), NOT refuse-to-lock

**RULED: In design-first mode, the frozen pool is the league-assignment set, exactly.** The
Source-B roster union does not apply. `See == Freeze` becomes an identity by construction, not an
invariant policed at lock time.

Why Option A and not refuse-to-lock-while-strays-exist:

- **Refuse-to-lock dead-ends the user.** The stray lives on a `TeamRoster` record that the
  design-first screen never surfaces and has no editor for. A blocking hint would demand roster
  surgery the mode's UI cannot perform — a hard stop on invisible state. That violates the north
  star (every element earns its place; no dead ends before the playthrough).
- **The mode's own semantics already say so.** Design-first extraction REPLACES membership — the
  diff at :949-954 removes non-extracted players (`toRemove`), and `removePlayersFromLeaguePool`
  even strips team rosters to fight the union (`leagueBuilderPoolBuilder.ts:157-197`, comment
  explicitly names the union as the adversary). The union is a pool-first concept that leaked
  across the mode boundary.
- **Silent-exclusion is honest here, not sneaky.** The pool table the user reviews IS the frozen
  set, byte-for-byte. Nothing the user ever saw disappears; something the user never saw stays
  out. A one-line notice (§1.5) covers the "where did Smith go" case without blocking anything.

Pool-first behavior is UNCHANGED: the importer keeps rosters ⊆ assignments, and the union stays
as belt-and-suspenders for legacy/direct-entry paths.

### 1.3 The regen guarantee — structural, both modes

**RULED: hidden-modifier regen at lock MUST cover the frozen membership itself — not a proxy
set.** Today regen covers "players with assignments" and hopes that equals the pool. Make it take
the pool's actual ids.

This closes the design-first hole AND the latent pool-first hole in one move, and it makes the
CHEM-POTENCY ruling ("hidden modifiers are generated when the draft pool is generated — the lock
is the common chokepoint") literally true instead of approximately true.

### 1.4 Exact changes (five, all small)

**(1) `registerLeaguePoolForLeague` — mode-aware union.**
File: `src/utils/leagueBuilderPoolRegistration.ts` (:99-106). The function already loads the
league template (:86). Wrap the Source-B roster-union loop:

```ts
const includeRosterUnion = (league.draftPoolMode ?? 'pool-first') !== 'design-first';
if (includeRosterUnion) {
  for (const teamId of league.teamIds) { /* existing union loop, unchanged */ }
}
```

`draftPoolMode` is `LeagueTemplate.draftPoolMode?: DraftPoolMode`
(`src/utils/leagueBuilderStorage.ts:99,117`), default `'pool-first'` — so every existing league
and every pool-first league keeps today's behavior bit-for-bit.

**(2) `regenerateAndPersistLeaguePoolAxes` — explicit membership parameter.**
File: `src/utils/leaguePoolAxisRegenPersist.ts`. New optional second parameter:

```ts
export async function regenerateAndPersistLeaguePoolAxes(
  leagueId: string,
  playerIds?: readonly string[],
): Promise<{ regeneratedCount: number }>
```

When `playerIds` is provided: membership = `getAllPlayers()` filtered to that id-set (ignore
assignments). When absent: today's assignment filter, unchanged (legacy callers keep working).
The regen itself (`regenerateLeaguePoolPlayerAxes`) is untouched — it is already deterministic in
`${leagueId}:${player.id}`.

**(3) `lockLeaguePool` — register first, regen the registered set, then stamp.**
File: `src/utils/leagueBuilderPoolBuilder.ts` (:241-247). New order:

```ts
export async function lockLeaguePool(leagueId: string): Promise<RegisteredPool> {
  const pool = await registerLeaguePoolForLeague(leagueId);            // membership decided
  await regenerateAndPersistLeaguePoolAxes(
    leagueId,
    pool.players.map((p) => p.id),                                     // regen ≡ frozen set
  );
  const locked: RegisteredPool = { ...pool, locked: true, lockedAt: Date.now() };
  await saveRegisteredPool(locked);
  return locked;
}
```

Reorder safety is already documented in the function's own header: "Axes do not feed IV, so the
IV registration is unaffected by ordering." Update that header comment to describe the new order
and the membership-coverage guarantee (and fix the module header at
`leagueBuilderPoolBuilder.ts:6-7`, which claims membership is "Source A ∪ Source B" — now
"Source A always; ∪ Source B in pool-first only").

**(4) The reconcile gate — UNCHANGED, comment updated.**
File: `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx` (:744-763). The
`poolMode !== "pool-first"` early return at :751 STAYS — with change (1), design-first no longer
needs reconciliation because the union no longer applies. Rewrite the comment block (:744-748) to
state the two-mode invariant explicitly:
*"See == Freeze holds in pool-first via this importer + the registration union, and in
design-first via mode-aware registration (assignments ARE the membership — DJ-05)."*

**(5) `useAuctionDraft.initAuction` re-stamp — pass the locked ids (SHOULD).**
File: `src/src_figma/app/hooks/useAuctionDraft.ts` (:506-513). When a locked pool exists, call
`regenerateAndPersistLeaguePoolAxes(leagueId, existingPool.players.map(p => p.id))`. This is a
hardening, not a bugfix: regen is deterministic, so lock-time stamps already persist; passing ids
merely makes the re-stamp cover the same set. Order note: the current code regens BEFORE loading
the pool — either load the pool first, or keep the parameterless call when no locked pool exists
(the unlocked/legacy branch registers fresh anyway, whose membership equals the assignment set in
design-first post-fix).

### 1.5 The notice (non-blocking, design-first only)

New read-only helper in `src/utils/leagueBuilderPoolBuilder.ts`:

```ts
/** Players on this league's team rosters that hold NO league assignment (design-first strays). */
export async function listRosteredButUnassigned(
  leagueId: string,
): Promise<{ id: string; name: string }[]>
```

(Reads league template + team rosters + players; pure read, no writes; returns `[]` for
pool-first callers too — the caller gates by mode.)

Draft Setup, design-first zone 4, directly under the pool sufficiency line, ONLY when the list is
non-empty and the pool is not yet locked — one line, kit small-print (`--ballpark-chalk` at 70%
opacity, `--ballpark-font-chrome`, no border, no icon):

> `{n} rostered players aren't part of this pool — a drawn pool contains only what the draw picked. ({first two names}{, +k more})`

No post-lock surface (the pool table already tells the truth), no confirm step, no blocker.

### 1.6 Regression tests (REQUIRED with the diff)

File: `src/utils/tests/leagueBuilderPoolMembership.dj05.test.ts` (new; follow the fixture
patterns of `src/utils/tests/poolDemandSufficiency.test.ts` / neighboring storage tests — seeded
IndexedDB fake or the existing storage test harness).

- **T1 — design-first excludes the union.** League with `draftPoolMode:'design-first'`; player A
  assignment-only; player B roster-only (on a team `mlbRoster`, no assignment); player C on a
  `farmRoster` only. `registerLeaguePoolForLeague` → membership `{A}` exactly.
- **T2 — pool-first unchanged.** Same fixture, `draftPoolMode:'pool-first'` (and a second run
  with the field absent) → membership `{A, B, C}`.
- **T3 — regen covers the frozen set (the latent pool-first hole).** Pool-first fixture with
  roster-only player B; `lockLeaguePool` → B is IN the locked pool AND B's axes were stamped
  (assert `savePlayer` saw B / B carries the regenerated axis fields). Design-first same fixture:
  B is OUT and untouched.
- **T4 — See == Freeze identity (design-first).** Arbitrary assignment set S at lock time →
  `lockLeaguePool(...).players` ids === S (order-insensitive).
- **T5 — `listRosteredButUnassigned`** returns exactly the roster-only players, `[]` when the
  importer has reconciled (pool-first happy path).

Gates: `npm run build` exit 0; the new file green; full vitest with no NEW reds beyond the
characterized set in `CURRENT_STATE.md`. Note for the auditor: `LeagueBuilderDraftSetup.test`
has a known load-flake in big batches — verify solo before calling it a regression.

---

## SECTION 2 — DJ-06: the draft-exit legality gate ("THE HANDOFF CHECK")

### 2.1 The defect, precisely

Nothing between the last gavel and the franchise wizard ever asks `isLegalRoster`:

- The commit writes whatever `AUCTION_COMPLETE` holds
  (`src/utils/leagueBuilderAuctionPipeline.ts:228-270`) — and it fires automatically inside
  `persist()` the moment the session completes (`useAuctionDraft.ts:378-384`), before the user
  even sees the complete screen.
- The franchise-side check is count-only 22/10 and THROWS mid-wizard with no repair path
  (`src/utils/franchisePlayerStorage.ts:400-437`).
- The C4-A guard is state-only (`src/utils/franchiseInitializer.ts:109-125`).

Companions (audit §2 DJ-06): `AUCTION_COMPLETE` can leave a club SHORT — the exhaustion backfill
(`auctionStateMachine.ts:564-579`, `backfillFromPassedLots` :615) no-ops entirely on
position-blind sessions and skips clubs whose completion is positionally impossible ("the
shortfall then surfaces downstream"); and position-blind RESUMED sessions play the whole draft
with `bidWouldStrand` disarmed, so an illegal 22 is reachable.

### 2.2 The ruling — a per-club verdict panel ON the complete screen, gating the FARM door

**RULED:** Build a pure exit-verdict engine + a HANDOFF CHECK panel on the MLB-auction-complete
screen. The FARM DRAFT transition (both call sites) requires **every controlled club legal, or an
explicit armed override**. The gate guards the NAVIGATION — the commit stays exactly where it is
(it is league-builder bookkeeping, idempotent, and the farm draft reads those rosters; do NOT
move or condition it). The franchise-side validation stays as the last-resort invariant and is
upgraded from count-only to the same law (§2.7), so the wizard can never be reached illegally
even by routes this page doesn't own.

**Uncertainty policy reversal — deliberate, stated:** in-flight, missing position info stands the
guard DOWN (a wrong rejection costs a live lot — `rosterNeed.ts` header). At the EXIT the cost
asymmetry flips: waving through an unverifiable roster guarantees a mid-wizard crash later. So at
the exit, **unknown = blocked** (with the override available). This is the position-blind-resume
companion fix: the exit verdict reads positions fresh from STORED player records (the same
`playerById → toRosterSlotPlayer` mapping the live board already uses,
`LeagueBuilderAuctionDraft.tsx:610-622`), never from the session's enrichment — a session that
played blind still gets a fully-sighted exit read.

### 2.3 The verdict engine (new, pure)

New file: `src/engines/auctionExitGate.ts`. Pure, deterministic, no storage, no React.

```ts
import type { RosterPositionMap, RosterNeedBreakdown } from './rosterNeed';

export interface ExitClubInput {
  teamId: string;
  rosterIds: readonly string[];   // = session.teams[i].roster.map(a => a.playerId)
}

export interface ExitClubVerdict {
  teamId: string;
  rosterCount: number;            // rosterIds.length
  target: number;                 // LEGAL_ROSTER.size (22)
  known: boolean;                 // every rosterId resolved in the position map
  legal: boolean;                 // known && rosterCount === 22 && isLegalRoster(shapes)
  need: RosterNeedBreakdown | null; // teamRosterNeed(rosterIds, positions) — null iff !known
  blockers: string[];             // plain sentences, law voice (§2.4); [] iff legal
}

export interface AuctionExitReport {
  clubs: ExitClubVerdict[];       // caller passes CONTROLLED clubs only (shills pre-excluded)
  allLegal: boolean;              // clubs.every(c => c.legal)
  blockedCount: number;
}

export function buildAuctionExitReport(
  clubs: readonly ExitClubInput[],
  positions: RosterPositionMap,
): AuctionExitReport;
```

**Law reuse — the whole point.** `legal` MUST be computed by `isLegalRoster`
(`src/data/rosterConstruction.ts:125`) on the resolved shapes plus the exact-22 count; `need`
MUST come from `teamRosterNeed` (`src/engines/rosterNeed.ts:241`). No re-derived rules, no
parallel thresholds — the same single law the in-flight guard and the board frame
(`src/engines/auctionBoardFrame.ts`) already derive from. The anti-drift test E7 (§2.9) pins
this: `verdict.legal === (count===22 && isLegalRoster(shapes))` by construction AND by test.

**Shill exclusion is the caller's job** using the SAME classifier the commit uses:
`deriveShillTeamIds(session, leagueTeams)` (the exclusion at `useAuctionDraft.ts:382`). Human
seats and CPU-controlled clubs are all gated; pure-pressure shills never are.

### 2.4 Blocker copy — one voice with the board

Port the sentence set of `buildLawNeedLine` / `buildLawNeedLine`'s law half
(`LeagueBuilderAuctionDraft.tsx:207-227`) into the engine as an exported helper, and return ALL
applicable sentences in this order (the live board shows only the first; the exit shows the full
bill). Copy precedent for engine-owned strings: `gapLabel` in `auctionBoardFrame.ts`,
`explainIllegality` in `rosterDesignFeasibility.ts`.

```ts
export function describeRosterLawGaps(
  rosterCount: number,
  need: RosterNeedBreakdown,
): string[];
```

Sentences (exact strings; `{n}` pluralized with the page's `plural()` pattern):

1. count ≠ 22 → `Short {n} bodies — {count} of 22.` (count < 22; count > 22 is unreachable —
   the machine caps at 22 — but emit `Over 22 — {count} rostered.` defensively.)
2. `need.missingPrimaries` non-empty → `Still needs a starting {POS[, POS…]}.`
3. `need.catcherCoverNeed > 0` → `Needs a second catcher — a backup C or a Two Way (C) arm.`
4. rotation/bullpen (class-aware, from `need.pitcherNeed`/`rotationDeficit`/`bullpenDeficit`
   after swing allocation — mirror the seat-counting the board frame does) →
   `Needs {n} more starter(s).` / `Needs {n} more reliever(s).`
5. floors → `Needs {n} more position player(s).` / `Needs {n} more pitcher(s).`
6. unknown (`known === false`; emitted alone, before all others are skipped) →
   `Can't read {n} player(s)' positions — legality can't be verified.`

**Drift-kill (DJ-15 class):** after the engine helper exists, `buildLawNeedLine` on the auction
page MUST delegate its law sentences to `describeRosterLawGaps` (render sentence 1 of the list +
its existing advisor line). One sentence set, one owner. This is in scope for this ticket.

### 2.5 Panel design — THE HANDOFF CHECK (chalk-and-ash kit)

**Placement.** The live surface is the AuctionStage (`components/auction/AuctionStage.tsx`); at
`AUCTION_COMPLETE` it currently shows a vestigial lot card ("MLB auction complete"). Add an
optional VM field `complete?: AuctionCompleteVM` to `AuctionStageVM`; when present (page sets it
only at `AUCTION_COMPLETE`), the stage renders the HANDOFF CHECK panel **in place of the
lot-card + move-panel region** (board, log, status strip stay). The legacy complete banner at
`LeagueBuilderAuctionDraft.tsx:1610-1620` is DJ-25 kill-list UI — until that lands, its button
uses the same gate predicate (`handleStagePrimary`'s complete branch, see §2.6); do not build a
second panel there.

```ts
interface AuctionCompleteVM {
  clubs: {
    teamId: string;
    name: string;
    primary: string; secondary: string;   // team colors (existing teamNameById/colors plumbing)
    countLabel: string;                   // "22 of 22"
    legal: boolean;
    blockers: string[];                   // [] when legal
  }[];
  allLegal: boolean;
  blockedCount: number;
  summary: string;                        // §2.5 copy
  onProceed: () => void;                  // navigation (already gated by the page)
  overrideArmed: boolean;
  onArmOverride: () => void;
  onConfirmOverride: () => void;
}
```

**Layout (kit tokens only — no new tokens, no hex):**

- Panel: `background: var(--ballpark-panel)`, 4px border `var(--ballpark-panel-border)`, the
  standard hard shadow. Header strip in `--ballpark-font-chrome`, chalk text:
  **`MLB DRAFT COMPLETE — THE HANDOFF CHECK`**.
- One row per controlled club, on `var(--ballpark-well)` strips, 2-col grid
  `[club | verdict]`: left = team color chip + club name (`--ballpark-font-human`) + `countLabel`
  in chalk 70%; right = verdict lamp — legal: `✓ LEGAL 22` in `--ballpark-status-green` /
  blocked: `BLOCKED` in `--ballpark-status-red-bright` with the blocker sentences beneath in
  chalk small-print (`--ballpark-font-chrome`, one per line). Rows sorted: blocked clubs first,
  then legal, each group in nomination order.
- Footer, all-legal: summary line `Every club fields a legal 22. The farm draft is next.` +
  the existing gold `PressButton` (variant `gold`, size `lg`): **`FARM DRAFT →`**.
- Footer, blocked: summary line in `--ballpark-status-warn`:
  `{blockedCount} of {clubCount} clubs can't field a legal 22.` + repair guidance line (§2.8) +
  the override affordance (§2.6). NO gold button while blocked.
- Mobile: rows stack to one column; the footer buttons full-width. No horizontal scroll.

### 2.6 The exact gating condition + override

Page-side (all in `LeagueBuilderAuctionDraft.tsx`):

```
exitReport = useMemo(() =>
  session?.state === "AUCTION_COMPLETE"
    ? buildAuctionExitReport(controlledClubs(session, leagueTeams), exitPositionMap)
    : null, …)
```

where `exitPositionMap` is built from STORED records for every rostered player across all
controlled clubs (generalize the :610-622 pattern from the focus team to the union of controlled
rosters), and `controlledClubs` = `session.teams` minus `deriveShillTeamIds(session, leagueTeams)`.

**Gate predicate:** `canProceedToFarm = exitReport !== null && (exitReport.allLegal || overrideConfirmed)`.

- `handleStagePrimary` complete-branch (:1181-1183): navigate ONLY when `canProceedToFarm`;
  otherwise focus/scroll the HANDOFF CHECK panel.
- Stage primary label (:1074): `allLegal` → `FARM DRAFT`; blocked → `REVIEW ROSTERS` (enabled —
  it drives attention to the panel, it just doesn't leave the room).
- Legacy banner button (:1614): same predicate, same labels, until DJ-25 removes it.

**Override (JK's explicit escape hatch)** — the existing two-step arm pattern (`lockConfirm`
precedent on Draft Setup): a quiet ghost button under the blocked footer, chalk 70%:
`PROCEED ANYWAY` → arms → replaced inline by confirm copy + two buttons:

> `This hands off {blockedCount} club(s) that can't field a legal 22. The franchise wizard will refuse them until they're fixed. Proceed?`
> `[ YES — HAND OFF AS-IS ]  [ STAY ]`

Confirm navigates (`overrideConfirmed` is transient page state — never persisted; a reload
re-gates). Disarm on outside-pointer-down, same as `lockConfirm` (:821-831).

### 2.7 Franchise-side invariant upgrade (defense in depth — same law, second lock)

`validateV1RosterHandoff` (`src/utils/franchisePlayerStorage.ts:400-437`) — per team, AFTER the
existing count check, resolve the team's 22 MLB players through `toRosterSlotPlayer` and run
`isLegalRoster`. On failure, push a plain issue reusing the engine copy:

> `{team.name}: roster is not a legal 22 — {first sentence from describeRosterLawGaps}. Re-run the MLB draft for this league.`

The throw STAYS (it is the last-resort invariant; the exit gate makes it unreachable in the
normal journey). No new repair machinery in the wizard — the repair surface is the auction exit.

### 2.8 Repair paths (plain, honest to what exists TODAY)

Per blocked class, the guidance line under the club's blockers:

- **SHORT (pool exhausted; backfill couldn't heal):**
  `The pool ran dry before this club reached 22. Add more players in Draft Setup and run the draft again.`
  Honesty note (binding on copy, not on build): the one-click re-run is the open RUN-IT-BACK
  ticket (DJ-18) — until it lands the practical path is the override or a fresh league, and this
  gate must NOT grow a re-run button of its own. The lock-time sufficiency floor
  (`evaluatePoolDemandSufficiency` hard floor incl. expected shill wins) plus DJ-13's fix makes
  this class rare by construction.
- **ILLEGAL at 22 (reachable only via position-blind resumed sessions — armed sessions are legal
  by construction via `bidWouldStrand`/`claimAtReserve`/verified backfill):**
  `This roster can't take the field as drafted. Re-run the draft — positions now read correctly — or hand off anyway and fix it before the season.`
- **UNKNOWN:** `Some player records are missing position data. Check THE POOL in Draft Setup.`

**Explicitly OUT of v1 (ruled, not forgotten):** an in-room repair mechanic
(release-and-claim swap, or **SETTLE FROM THE SHILLS** — letting a short club force-claim
shill-held bodies at league-minimum, the zero-real-demand clearing price, cheapest-verified-legal
via `cheapestLegalCompletion`, nomination order, deterministic). That is a state-machine surface;
the reachable population post-DJ-13 is too small to buy it before the playthrough. Opus: ticket
it as `AUCTION-SETTLE-FROM-SHILLS` (v1.1 economy batch), spec-ready from this paragraph.

### 2.9 Acceptance tests (REQUIRED with the diff)

Engine — new `src/engines/__tests__/auctionExitGate.test.ts`:

- **E1** legal 22 (8 primaries, 2 C-coverers, 4 SP, 4 RP, 13/9 split) → `legal:true`,
  `blockers:[]`.
- **E2** 21 bodies → blocked, sentence `Short 1 body — 21 of 22.` (singular path exercised).
- **E3** 22 with one C-coverer → blocked, catcher sentence.
- **E4** 22 with 3 relievable arms → blocked, `Needs 1 more reliever.`
- **E5** one unresolved id → `known:false`, blocked, ONLY the unknown sentence.
- **E6** caller-side: shill club with an illegal roster excluded from inputs → `allLegal` true
  when all real clubs are legal (page-level pairing in P-tests).
- **E7 — the law-identity pin:** for a table of ≥10 rosters (legal and illegal, incl. the
  Two-Way(C) double-count composition ratified in `rosterConstruction.ts` and DJ-29's repro
  shapes A/B): `verdict.legal === (ids.length===22 && isLegalRoster(shapes))` for every row.
  (DJ-29 is a FEASIBILITY-frame defect; the exit gate uses `isLegalRoster` directly, so these
  compositions MUST pass here — this test proves the gate does not inherit DJ-29.)

Page — extend the auction page/stage tests:

- **P1** `AUCTION_COMPLETE`, all clubs legal → panel shows all-green, primary `FARM DRAFT`,
  click navigates to `farmDraftRouteForLeague`.
- **P2** one blocked club → primary `REVIEW ROSTERS`, no navigation on click; arm override →
  confirm → navigates. Outside click disarms.
- **P3** resumed session whose `session.players[*].pos` are absent but stored records complete →
  the gate still renders full verdicts (position source = stored records, not enrichment).
- **P4** shill club left illegal/short → never rendered as a row, never blocks.

Storage — extend `franchisePlayerStorage` tests: a 22-count-correct but illegal roster now
throws with the law sentence (count-only fixture stays green).

Gates: build exit 0; new suites green; full vitest no NEW reds beyond the characterized set;
JK's browser pass remains the acceptance gate for the panel itself.

---

## Companion notes for Opus (sequencing)

- DJ-05 and DJ-06 are independent diffs — either can land first; both before the playthrough.
- DJ-06's panel makes DJ-01's board fix MORE visible (same complete screen) — land DJ-01 first
  if possible so the board behind the panel isn't lying while the panel tells the truth.
- New tickets to file from this doc: `AUCTION-SETTLE-FROM-SHILLS` (§2.8, v1.1) and the DJ-25
  reminder that the legacy complete banner now carries gate logic that dies with it.
