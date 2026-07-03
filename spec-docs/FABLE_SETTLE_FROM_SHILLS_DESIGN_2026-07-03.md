# FABLE DESIGN — AUCTION-SETTLE-FROM-SHILLS (in-draft roster repair, item ③)

**Author:** Fable 5 (design authority) · **Date:** 2026-07-03 · **Status:** BINDING — builder-ready
**Ticket:** `AUCTION-SETTLE-FROM-SHILLS` (filed from `FABLE_DJ0506_DESIGN_2026-07-03.md` §2.8)
**Routing:** Codex builds to this spec; Opus audits the diff (builder ≠ auditor). Every design fork
below is RULED — the builder makes no design decisions. MUST = contract; SHOULD = build unless it
costs more than ~15 lines, then flag.
**Binding law:** `FABLE_POOL_SIZING_DESIGN_2026-07-03.md` §1 (JK approval #1, 2026-07-03) binds
this build BY NAME: *"settle-from-shills selects the fitting body for the short club first,
cheapest among fits — that build cites this section."* This doc is that citation.

Evidence anchors re-verified against the working tree on 2026-07-03. Line numbers are approximate
(±10); symbol names exact.

---

## §0 — What settle is, in one breath

When the MLB auction ends with a controlled club SHORT of 22, the DJ-06 HANDOFF CHECK
(`src/engines/auctionExitGate.ts`, panel in
`src/src_figma/app/components/auction/AuctionStage.tsx:398`) blocks the farm door and today
offers exactly two exits: the override (hand off broken) or a fresh league. SETTLE FROM THE
SHILLS is the third, ACTIVE exit: one explicit action that fills every short club's empty seats
from the draft's zero-real-demand leftovers — the bodies pure-pressure shills walked off with plus
the lots everyone passed on — at league-minimum salary, picking for each seat the **best-fitting
legal body** (fit first; price only inside the fit), verified by the one roster law
(`isLegalRoster`), so the gate turns green **legitimately**, not by bypass.

Why these bodies are the honest source: shill rosters are discarded at the commit
(`useAuctionDraft.ts:382` excludes `deriveShillTeamIds`; the pipeline skip at
`leagueBuilderAuctionPipeline.ts:239-243`), and passed lots cleared the market at zero demand.
Neither carries a real claim. League minimum is their honest clearing price — the same pricing
ruling the C3 exhaustion backfill already ratified (`auctionStateMachine.ts:604-613`, F5 header).

Why the existing backfill can't do this: `backfillFromPassedLots` (`auctionStateMachine.ts:615`)
re-offers **PASSED lots only** — never shill-HELD bodies — reads positions only from
`session.players[*].pos` (so it no-ops entirely on position-blind sessions), and runs exactly once,
inside `advanceLot`, before `AUCTION_COMPLETE`. Settle runs AT the complete screen, sees the shill
rosters, and reads positions from stored records — the same fully-sighted exit read DJ-06 ruled.

---

## §1 — Rulings index (every fork, one line each)

| # | Fork | RULING |
|---|------|--------|
| R1 | Manual action vs auto-settle | **Manual** — an explicit, armed affordance on the HANDOFF CHECK panel. Never automatic. (§3.1) |
| R2 | Per-club buttons vs one league pass | **One panel-level action** settling ALL short controlled clubs in nomination order. (§3.2) |
| R3 | Composition with the gate | Settle mutates the session; the exit report **recomputes from the settled session** and passes on its own merits. The override is untouched and remains the fallback. (§3.3) |
| R4 | Which bodies | **Shill-HELD ∪ still-PASSED** ("the leftovers"), both zero-real-demand. Pure shills only — `deriveShillTeamIds`, the commit's own classifier — never CPU-controlled clubs. (§4.1) |
| R5 | Price | **`team.minSalary`** per seat (defaults `LEAGUE_MINIMUM_SALARY`, `rosterEngineConstants.ts:316`) — the backfill's ratified zero-demand clearing price. Full salary-cap/budget accounting, no special case. (§4.2) |
| R6 | Fit vs cheap | **FIT-FIRST LAW applied literally**: requirement-class legality is the filter (via `cheapestLegalCompletion`'s class structure); within the filter, order = archetype band-fit DESC, opening ask ASC, id ASC. Charged price is uniform league-minimum, so "cheapest" can never outbid fit — by construction. (§5) |
| R7 | Filter relaxation | **No relaxation rung exists** — softer-than-legality would defeat the purpose. The law's "noted last resort" for settle IS the existing override. (§5.4) |
| R8 | Engine home | **New pure module** `src/engines/auctionSettleFromShills.ts`; not a lot-flow transition, so it does not join the `AuctionTransitionResult` family. (§6) |
| R9 | State transition | Operates **within `AUCTION_COMPLETE`** (state unchanged), one atomic pass over all short clubs. No new `AuctionState`. (§6.3) |
| R10 | Session bookkeeping | **Full double-entry**: club pays and fills; source shill refunds and vacates; results rewritten with an additive `settled: true` provenance flag; `saleCount` +1 for passed→sold only. (§6.4) |
| R11 | Positions source | **Stored player records only** (the DJ-06 exit principle) — an external `RosterPositionMap` built by the caller; `session.players[*].pos` is never read for settle decisions. Unreadable CLUB → skipped (stays blocked); unreadable CANDIDATE → dropped from the pool. (§6.2) |
| R12 | Persistence | One pure transition → one `persist()` (the hook's existing path). Crash-safe by atomicity; the idempotent complete-state commit re-runs and refreshes league rosters with the settled players. No per-pick saves needed. (§7) |
| R13 | Action owner | **The hook** (`useAuctionDraft`) exposes `settleShortClubs()`; it builds positions + fit table itself (it has `leagueData.players`, session archetype weights, `leagueTeams`). The page only renders. (§7.2) |
| R14 | Clubs settled | Every **non-shill** club (human AND CPU-controlled) that is short. Illegal-at-22 clubs are NOT touched — settle fills empty seats, it never releases players (release-and-claim swap stays out of scope, per §2.8). (§4.3) |
| R15 | v1 or v1.1 | **v1.1** (the §2.8 ruling stands; reachable population is small by construction post pool-sizing floor + DJ-13). Doc is contract-ready whenever the v1.1 economy batch opens. (§10) |

---

## §2 — Read-first for the builder

1. `FABLE_DJ0506_DESIGN_2026-07-03.md` §2 (the gate this composes with) + §2.8 (the seed).
2. `FABLE_POOL_SIZING_DESIGN_2026-07-03.md` §1 (the fit-first law — the constitution here).
3. `src/engines/auctionExitGate.ts` (whole file, 129 lines — verdicts + `describeRosterLawGaps`).
4. `src/engines/auctionCompletionFloor.ts` — `cheapestLegalCompletion` (:349), `CompletionCandidate` (:33), the class-structured constructive assembly (:234-342).
5. `src/engines/auctionStateMachine.ts` — `backfillFromPassedLots` (:615-689, the mutation pattern to mirror), `AuctionResult` (:100), `AuctionTeamState` (:46), `lotOpeningAsk` (:265).
6. `src/engines/rosterNeed.ts` — `RosterPositionMap`, `toRosterSlotPlayer` (:47).
7. `src/engines/cpuTeamRoles.ts` — `deriveShillTeamIds` (:24).
8. `src/engines/cpuShillBidding.ts` — `CpuShillAuctionPlayer.archetypeWeights` (:50-52), `bandFitMultiplier`, `bandLiftFromPriorities` (exported; consumed by `auctionMarketModel.ts:38-39`).
9. `src/engines/auctionMarketModel.ts:689-690` — the own-demand archetype-fit expression this build reuses; `MEAN_PERSONALITY_SPREAD` (:228, module-private today).
10. `src/src_figma/app/hooks/useAuctionDraft.ts` — `persist` (:370-386), `runAction` (:436), the commit exclusion (:382).
11. `src/src_figma/app/pages/LeagueBuilderAuctionDraft.tsx` — `exitPositionMap` (:574), `exitReport` (:591), `auctionExitRepairGuidance` (:214), `buildMarketBandPrioritiesByTeamId` (:447), override effects (:598-619).
12. `src/src_figma/app/components/auction/AuctionStage.tsx` — `AuctionCompleteVM` (:110-128), `HandoffCheckPanel` (:398-478).

---

## §3 — Where it sits, and how it composes with the gate

### 3.1 Manual, never automatic (R1)

Auto-settle on reaching `AUCTION_COMPLETE` is REJECTED for three reasons: (a) it would rewrite
rosters the user never agreed to buy — the settle bodies are dregs, and a re-run
(DJ-18 RUN-IT-BACK, when it lands) or a pool edit may genuinely be the better play; (b) the
HANDOFF CHECK's whole honesty contract is *show the verdict, then offer the exits* — an auto-heal
hides the shortfall it repairs; (c) JK's north star: explicit elements that earn their place, no
silent state changes. Settle is an armed, two-step, plainly-worded choice.

### 3.2 One action for the whole room (R2)

The leftover pool is SHARED and scarce. Per-club buttons would make the outcome depend on the
user's click order (who clicks first gets the best leftover backup catcher) — a determinism breach
and a hidden gotcha with CPU clubs in the room. RULED: **one panel-level action** that settles
every short controlled club in **nomination order** (`session.nominationOrder` — the same
precedence the C3 backfill uses, `auctionStateMachine.ts:632`). Same inputs → same rosters, always,
regardless of who clicks or when.

### 3.3 Settle makes the gate pass, it never bypasses it (R3)

The action mutates the SESSION (rosters, budgets, results). The page's `exitReport` memo
(`LeagueBuilderAuctionDraft.tsx:591`) recomputes from the new session and the same stored-record
position map — the settled club is legal because `isLegalRoster` says so on its actual 22, not
because a flag said "settled". `canProceedToFarm` (:596) is UNCHANGED. The override affordance is
UNCHANGED and remains the documented fallback for whatever settle cannot fix. **The gate predicate
gains no new terms.** (Anti-drift: test P3, §9.)

---

## §4 — The leftover pool, the price, the clubs

### 4.1 Which bodies (R4)

`leftovers = shillHeld ∪ passedUnclaimed`, where:

- `shillHeld` = every `AuctionRosterAssignment.playerId` on teams in the caller-supplied
  `shillTeamIds` — which MUST be `deriveShillTeamIds(session, leagueTeams)`
  (`cpuTeamRoles.ts:24`), **the exact classifier the commit uses for exclusion**
  (`useAuctionDraft.ts:382`). One classifier, two call sites, zero drift: settle can never pull
  from a roster that commits, and never miss a roster that doesn't. CPU-controlled clubs
  (`controlledBy === 'ai'`) are real clubs — never a source.
- `passedUnclaimed` = `session.results` rows still `disposition === 'PASSED'` at settle time
  (whatever the C3 backfill consumed is already `SOLD` and gone).

Why passed lots are IN despite the ticket's name: both sets cleared the market at zero real
demand (nobody bid / only a fake bidder bid); both are priced identically (§4.2); and including
them heals the position-blind-resume case the backfill provably could not (its `pos` no-op,
`auctionStateMachine.ts:624`), because settle reads stored records (R11). Excluding them would
strand a fixable club for naming purity. The marquee name stays SETTLE FROM THE SHILLS.

### 4.2 Price and money (R5)

- Each settled seat costs **`team.minSalary`** (the buying club's configured minimum,
  `normalizeTeam` default `LEAGUE_MINIMUM_SALARY = 1666.49`,
  `auctionStateMachine.ts:1058`, `rosterEngineConstants.ts:316`) — identical to the backfill's
  ratified pricing (F5 header, :604-613). The price a shill once "paid" is fake demand and is
  irrelevant to the club's cost.
- **Budget law**: total settle cost is deducted from `budgetRemaining`. Affordable by
  construction — `sessionBidCeiling` reserved ≥ minSalary per open slot on every live acquisition
  (the F1 reserve floor, cited at :609-610) — but the engine still checks
  `cost ≤ budgetRemaining` and reports `insufficient-budget` defensively rather than trusting the
  invariant (the backfill does the same, :659).
- **Salary cap**: in-draft, the auction budget IS the cap instrument (hard-cap Phase 1 feeds
  `tierBudget`). Settle salaries enter `team.roster` assignments like any sale and flow into every
  downstream payroll/tax read unchanged. No exemption, no special case.

### 4.3 Which clubs get settled (R14)

Every club in `session.teams` NOT in `shillTeamIds` whose `roster.length < 22` — human and
CPU-controlled alike (both commit, both cross the same handoff). Clubs at exactly 22 (legal OR
illegal) are untouched: settle fills empty seats; it never releases a rostered player. The
ILLEGAL-at-22 class keeps its §2.8 guidance (re-run or override) — unchanged by this build.

---

## §5 — THE MECHANIC: fit-first selection, law-verified (R6, R7)

### 5.1 The law, applied to settle

Pool-sizing §1, verbatim: **"FIT IS A FILTER. PRICE IS THE ORDER WITHIN THE FILTER. THE FILTER
RELAXES ONLY AS AN EXPLICIT, BOUNDED, NOTED LAST RESORT."** JK's stated worry, verbatim: don't
prioritize cheap over archetype fit.

At settle, every candidate CHARGES the same league minimum — so if we fed real prices to a
cheapest-first picker, "price" would carry zero information and id-order would silently pick the
seats. And if we fed opening asks, price could outrank fit. Both fail the law. The construction
below makes the law hold **by construction**:

1. **The FILTER = the requirement class.** `cheapestLegalCompletion`
   (`auctionCompletionFloor.ts:349`) is already a class-structured constructive picker: missing
   primaries take exact-position bodies, rotation/bullpen deficits take exact-role enumerations
   (swing-aware), catcher depth takes C-coverers, floors take side-eligible bodies — and the
   assembled 22 is verified by `isLegalRoster` (:334-335), never trusted. That class structure IS
   the fit gate. A body that can't legally take the seat is never considered for it.
2. **The ORDER within the filter = the fit key.** Per club, candidates are sorted by
   `(fitScore DESC, openingAsk ASC, id ASC)` and their **sort rank (0,1,2,…) is fed to
   `cheapestLegalCompletion` as the `price` field**. The picker's "cheapest-first with id
   tiebreak" semantics (`byPriceThenId`, :50-52) then mean "best-fit-first" at every single pick
   step, including inside the arm enumeration (which now minimizes total fit-rank among
   same-count legal combinations) and the coverage-biased fills. Zero changes to
   `auctionCompletionFloor.ts`; the quote's `cost` (a rank sum) is discarded — real cost is
   `picks × team.minSalary` (§4.2).

This is exactly the parent directives reconciled: **best-fit body per seat** (fit rank leads),
**cheapest only as the within-fit tiebreak** (opening ask breaks fit-score ties), **never pure
cheapest** (ask can never leapfrog a better-fit body).

### 5.2 The fit score — single-math, the market brain's own number

`fitScore(club, player)` MUST be the market model's own-demand archetype-fit expression
(`auctionMarketModel.ts:689-690`):

```
bandFitMultiplier( normalizeBandWeights(player.archetypeWeights),
                   bandLiftFromPriorities(clubBandPriorities),
                   MEAN_PERSONALITY_SPREAD )
```

- `player.archetypeWeights` sits on the session's own player records
  (`CpuShillAuctionPlayer.archetypeWeights`, `cpuShillBidding.ts:50-52`) — no external lookup.
- `clubBandPriorities` = `resolveClubBandPriorities(team)` (`archetypeIdentity.ts`; the page
  already builds the map at `LeagueBuilderAuctionDraft.tsx:447-456`).
- `MEAN_PERSONALITY_SPREAD` is module-private today (`auctionMarketModel.ts:228`). The builder
  MUST NOT duplicate the expression: export one tiny helper from `auctionMarketModel.ts` —
  `export function clubArchetypeFit(archetypeWeights, priorities): number` — wrapping exactly the
  :689-690 call, and consume it from the settle adapter. One math, one owner (the DJ-15/§2.4
  drift-kill pattern).

**Fallbacks (deterministic, no relaxation):** a player with no/empty `archetypeWeights` or a club
with no resolvable priorities gets `fitScore = 0` — such candidates simply sort after every
positive-fit body and among themselves by `(ask ASC, id ASC)`, which is the §1 recipe's own
default order. Legality filtering is unaffected.

### 5.3 Determinism (the whole pass)

Same session + same stored records ⇒ same result, always:

- Clubs in `session.nominationOrder` (R2). Consumed candidates leave the shared pool before the
  next club is processed.
- Candidate order: `fitScore DESC → lotOpeningAsk ASC → id ASC (localeCompare)`. Opening ask is
  `lotOpeningAsk(session.players[id], session.config)` (`auctionStateMachine.ts:265`) — pure in
  (iv, config). Fit is pure in (session weights, league archetype). No randomness, no Date, no
  caller-order dependence (`cheapestLegalCompletion` re-sorts internally anyway, :360).
- Known asymmetry, accepted: earlier nominators settle first and may take the better-fit leftover.
  Same rule as the C3 backfill; by this stage these are league-minimum dregs, and ANY other rule
  (e.g. global optimization across clubs) buys complexity the population doesn't justify.

### 5.4 No relaxation rung (R7)

The settle filter is legality itself — there is nothing softer that still lands a legal 22. When a
seat class has no qualified candidate, the club's outcome is `no-legal-completion` (§6.1) and the
panel says so plainly; the law's "explicit, bounded, noted last resort" for settle is the
already-built OVERRIDE, which stays exactly where DJ-06 put it.

---

## §6 — The engine contract (R8, R9, R10, R11)

### 6.1 New pure module — `src/engines/auctionSettleFromShills.ts`

Pure, deterministic, no storage, no React, no Date. Imports: state-machine types +
`lotOpeningAsk`, `cheapestLegalCompletion`/`CompletionCandidate`, `LEGAL_ROSTER`,
`RosterPositionMap`.

```ts
export interface SettleFitTable {
  /** teamId → playerId → fit score (higher = better fit). Sparse; missing = 0. */
  readonly [teamId: string]: Readonly<Record<string, number>>;
}

export interface SettleFromShillsInput {
  session: AuctionSession;              // MUST be state === 'AUCTION_COMPLETE'
  positions: RosterPositionMap;         // STORED-record shapes (R11) — clubs' rosters + all leftover ids
  shillTeamIds: readonly string[];      // MUST be deriveShillTeamIds(session, leagueTeams) — the commit's set
  fitScores?: SettleFitTable;           // §5.2; absent ⇒ all 0 ⇒ (ask ASC, id ASC) order
}

export type SettleClubStatus =
  | 'settled'                // filled to 22; legality re-verified by construction
  | 'already-complete'       // roster.length ≥ 22 — untouched (illegal-at-22 included, R14)
  | 'unreadable'             // ≥1 of the club's OWN rostered ids unresolved in `positions`
  | 'no-legal-completion'    // no verified-legal completion exists from the remaining leftovers
  | 'insufficient-budget';   // defensive (§4.2) — cost exceeds budgetRemaining

export interface SettleClubOutcome {
  teamId: string;
  status: SettleClubStatus;
  seatsFilled: number;                  // = pickIds.length; 0 unless 'settled'
  pickIds: readonly string[];
  cost: number;                         // seatsFilled × team.minSalary
}

export interface SettleFromShillsResult {
  ok: boolean;                          // true iff ≥1 club settled (session !== input.session)
  rejected?: 'expected-auction-complete';
  session: AuctionSession;              // updated when ok, otherwise the input session unchanged
  outcomes: readonly SettleClubOutcome[]; // ALL non-shill clubs, nomination order (legal ones as 'already-complete')
}

export function settleFromShills(input: SettleFromShillsInput): SettleFromShillsResult;
```

**Per-club algorithm** (clubs = `session.teams` minus `shillTeamIds`, iterated in
`nominationOrder`; teams not in the order are skipped exactly as the backfill skips them, :633-634):

1. `openSlots = LEGAL_ROSTER.size − team.roster.length`; `≤ 0` → `already-complete`.
2. Resolve the club's roster shapes through `positions` ONLY. Any miss → `unreadable` (the exit
   gate already shows that club as UNKNOWN-blocked; settle must not guess — DJ-06's
   unknown-equals-blocked stance).
3. Build candidates from the remaining leftover pool (§4.1 minus ids consumed by earlier clubs):
   shape from `positions` (a candidate miss DROPS the candidate, never blocks the club), fit key
   per §5.2/§5.3, `price = sortRank`.
4. `quote = cheapestLegalCompletion(rosterShapes, rankedCandidates, openSlots)`. Infeasible →
   `no-legal-completion`.
5. `cost = openSlots × team.minSalary`; `cost > budgetRemaining` → `insufficient-budget`.
6. Apply the double-entry mutation (§6.4), consume `quote.pickIds` from the pool, record
   `settled`.

### 6.2 Positions: the stored-record read (R11)

The engine never reads `session.players[*].pos` for decisions — the whole point is that a
position-blind resumed session (DJ-06 §2.1 companion) still gets a fully-sighted settle. The
caller builds `positions` from stored player records via `toRosterSlotPlayer`
(the `exitPositionMap` pattern, `LeagueBuilderAuctionDraft.tsx:574-589`) but covering the UNION of
(a) every non-shill club's rostered ids and (b) every leftover id (§7.2).

### 6.3 State machine posture (R9)

Settle is **not** a lot-flow transition: no new `AuctionState`, no `AuctionRejectionReason`
additions, no change to `advanceLot`/`resolveLot`/the backfill. It is a complete-state repair pass
that takes `AUCTION_COMPLETE` in and returns `AUCTION_COMPLETE` out. Guard: any other state →
`{ ok: false, rejected: 'expected-auction-complete', session, outcomes: [] }`. It lives in its own
module (R8) so `auctionStateMachine.ts` (1,136 lines) doesn't grow and the audit surface stays
one file. Re-invocation after a full settle is a natural no-op (`ok: false`, every club
`already-complete`/unchanged) — idempotent at the fixpoint.

### 6.4 Session bookkeeping — full double-entry (R10)

For each settled pick, mirroring the backfill's mutation shape (:661-686):

- **Buying club:** `budgetRemaining −= minSalary`; `rosterSlotsRemaining` decremented (floor 0);
  `roster += { playerId, salary: team.minSalary }`.
- **Source shill** (shill-held picks only): assignment removed from `roster`;
  `budgetRemaining += assignment.salary` (refund — keeps any budget-conservation invariant whole);
  `rosterSlotsRemaining += 1`. Shills are discarded at commit, but the SESSION stays
  double-entry-consistent for tests, resume, and the Almanac.
- **Result row** (the player's existing `AuctionResult`): `disposition: 'SOLD'`,
  `winnerTeamId: clubId`, `salary: team.minSalary`, plus a new **additive optional** provenance
  flag on `AuctionResult`: `settled?: true` (same additive pattern as `bidderSet`/`bidLog` —
  pre-settle sessions never carry it; no migration). `bidderSet`/`underbidder`/`numBidders` are
  left AS-IS — they describe the live market that lot actually saw, which remains true; `settled`
  carries the route. (The prior shill winner stays recoverable from the lot's `bidLog`.)
- **`saleCount`:** +1 per passed→SOLD pick (mirrors backfill :684). Shill-held picks were counted
  at their original sale — reassignment does not increment.

---

## §7 — Wiring: hook action, persistence, crash safety (R12, R13)

### 7.1 Persistence law

The hook's existing `persist()` (`useAuctionDraft.ts:370-386`) is the ONLY write path: one
`saveAuctionSession` (crash-safe atomically — the settle either persisted or it didn't; no partial
settle can exist because the engine pass is one pure computation), followed by the complete-state
commit re-run (:378-384). `commitCompletedMlbAuctionSessionToLeagueRosters` overwrites each
non-excluded team's MLB roster from the session (`leagueBuilderAuctionPipeline.ts:239-251`), so
the re-run **is the mechanism** that lands settled players on league rosters — no new commit code.
Settled players sit on club rosters (not shill rosters), so the exclusion list drops nothing that
matters. Per-pick persistence (the live auction's crash posture) is unnecessary: this is one
transition, not a sequence.

### 7.2 The hook action (R13)

New action on `useAuctionDraft`: `settleShortClubs(): Promise<SettleClubOutcome[] | null>`, built
on `runAction` (:436) like every other action:

1. Guard `session?.state === 'AUCTION_COMPLETE'` (else return null).
2. `shillTeamIds = deriveShillTeamIds(session, leagueTeams)` — the SAME call the commit makes.
3. Build `positions` from `leagueData.players` via `toRosterSlotPlayer` over the §6.2 union.
4. Build `fitScores` from `resolveClubBandPriorities(team)` per non-shill club ×
   `session.players[id].archetypeWeights` per leftover, through the §5.2 helper.
5. `const result = settleFromShills({ session, positions, shillTeamIds, fitScores })`.
6. If `result.ok`: `await persist(result.session, context)`; return outcomes; the page's
   `exitReport` recomputes downstream (R3).

The page additionally computes a **dry-run preview** in a memo (same pure call, same inputs —
cheap: the leftover pool is small) to decide whether the affordance renders and what the confirm
copy promises (§8.2). Preview and action MUST call the same function with the same inputs —
never two implementations (drift-kill).

### 7.3 Position-blind-resume caveat — restated

A session that played blind (resumed without enrichment, `bidWouldStrand` disarmed all game) is
precisely the population most likely to need settle. Both the verdicts (DJ-06) and settle (this
doc) read stored records, so the whole repair works on such sessions. The one truly stuck class:
stored records THEMSELVES missing position data → club `unreadable`, panel keeps the §2.8 UNKNOWN
guidance ("Check THE POOL in Draft Setup"), override remains.

---

## §8 — UX: the affordance, the confirm, the result (chalk-and-ash kit)

### 8.1 Where it renders

Inside `HandoffCheckPanel`'s **blocked footer** (`AuctionStage.tsx:444-476`), ABOVE the override
block, ONLY when the dry-run preview reports ≥1 club `settled`-able. Extend `AuctionCompleteVM`
(additive):

```ts
settle?: {
  seatTotal: number;                       // total seats the preview will fill
  perClubLabel: string;                    // "Ironclads 2 seats · Comets 1 seat"
  partial: boolean;                        // true when some short club still can't be fixed
  armed: boolean;
  onArm: () => void;
  onConfirm: () => void;
  onStay: () => void;
  resultLine: string | null;               // §8.3 — non-null once the session carries settled picks
}
```

### 8.2 The interaction — the panel's own two-step arm pattern

- Idle: one `PressButton` (default variant, size `md` — **gold stays reserved for FARM DRAFT**):
  **`SETTLE FROM THE SHILLS`**. Wrapped in a `[data-auction-settle]` container with the same
  outside-pointer-down disarm the override uses (:610-619 pattern).
- Armed (replaces the button inline, mirrors the override confirm block):

  > `Settle {seatTotal} empty seat{s} from the leftovers at league minimum — {perClubLabel}. Best fit first; money only breaks ties.`
  >
  > `[ SETTLE {seatTotal} SEAT{S} ]  [ STAY ]`

  When `partial`, one more chalk-70% line before the buttons:
  `{Club} still can't reach a legal 22 from what's left — settle the rest, then use the override or re-run.`
- Confirm → `settleShortClubs()` → session persists → `exitReport` recomputes → rows flip green →
  the all-legal footer (gold `FARM DRAFT →`) takes over naturally. No bespoke success state.
- While a settle is in flight, the panel disables the settle buttons (the hook's existing
  `isWorking` flag) — no double-fire; the engine's fixpoint idempotence (§6.3) backstops anyway.

### 8.3 The result line — read from the session, not from transient state

`resultLine` renders whenever the session's results contain `settled: true` rows (count = n):
`Settled {n} seat{s} from the shills at league minimum.` — kit small print, chalk 70%, under the
footer summary. Because it derives from the SESSION, it survives reload/resume and keeps the
handoff honest forever (the Almanac sees the same flag). No toast, no timer.

### 8.4 Guidance-line update (one string change)

`auctionExitRepairGuidance` (`LeagueBuilderAuctionDraft.tsx:214-222`), SHORT branch, becomes
settle-aware: when the preview reports ≥1 settleable club →
`The pool ran dry before this club reached 22. Settle the empty seats from the shills below, or add players in Draft Setup and re-run.`
Otherwise the existing SHORT string stands unchanged. UNKNOWN and ILLEGAL branches untouched.
(Franchise hub copy is D11-test-characterized; this page's exit strings are NOT in that set, but
the builder greps tests before editing copy regardless — standing rule.)

### 8.5 Mobile

The settle block stacks full-width above the override, same as the existing footer rules
(DJ-06 §2.5). No horizontal scroll.

---

## §9 — Acceptance tests (REQUIRED with the diff)

Engine — new `src/engines/__tests__/auctionSettleFromShills.test.ts`:

- **S1 — happy path.** One club short 3 (missing SS primary, 1 reliever, 1 floor hitter);
  leftovers hold qualified bodies → `settled`, 3 picks, roster hits legal 22
  (`isLegalRoster` true), cost = 3 × minSalary, budget debited, shill roster/budget double-entry
  restored, result rows `SOLD` + `settled: true`.
- **S2 — THE FIT-LAW PIN (the JK worry, falsified).** A seat with two qualified candidates:
  cheaper ask + lower fit vs pricier ask + higher fit → the HIGHER-FIT body is picked. Same
  fixture with EQUAL fit scores → the cheaper ask wins. Same fixture with equal fit AND ask → the
  lower id wins. Three assertions, one fixture family.
- **S3 — fit never breaks the filter.** The highest-fit leftover is a 1B when the club's hole is
  SS → the SS body is picked regardless of fit gap (eligibility gates, fit only orders).
- **S4 — passed ∪ shill-held.** A club fixable ONLY by mixing one passed lot + one shill-held
  body → settles; `saleCount` +1 (passed only); shill-held pick's original sale not re-counted.
- **S5 — shared-pool determinism.** Two short clubs wanting the same lone catcher → nomination
  order decides; full pass re-run on the same inputs is byte-identical (deep-equal sessions);
  candidate INPUT order shuffled → identical output.
- **S6 — no-legal-completion.** No relievable arm anywhere in the leftovers, club short a
  reliever → that club `no-legal-completion`, untouched; a second fixable club in the same pass
  still settles (`ok: true`, mixed outcomes).
- **S7 — unreadable asymmetry.** Club roster id missing from `positions` → `unreadable`,
  untouched. Candidate id missing → candidate dropped, club still settles from the rest.
- **S8 — guards.** Non-complete state → `rejected`. All clubs full → `ok: false`, all
  `already-complete`. Illegal-at-22 club → `already-complete`, untouched (R14). Re-run after a
  full settle → `ok: false`, session unchanged (fixpoint).
- **S9 — budget defense.** Artificially drained budget → `insufficient-budget`, untouched.
- **S10 — the law-identity pin (E7's sibling).** For every `settled` outcome across the S-suite:
  `buildAuctionExitReport` on the settled session reports that club `legal: true, blockers: []` —
  settle satisfies the SAME gate it unblocks, by law not by flag.

Hook/page — extend the auction page/hook suites:

- **P1** complete + short + settleable preview → settle block renders (button label, per-club
  copy); arm → confirm → hook persists (`saveAuctionSession` called once; commit re-run called),
  panel re-renders all-green, primary flips to `FARM DRAFT`, result line shows from session.
- **P2** reload after settle → result line still renders (session-derived), gate still green.
- **P3 — gate-purity pin.** `canProceedToFarm` is computed from `exitReport`/override ONLY — no
  settle-flag term (assert the blocked→green flip happens via report recomputation on a fixture
  where settle fails: gate stays blocked).
- **P4** position-blind resumed session with complete stored records → settle works end-to-end
  (the §7.3 population).
- **P5** preview says nothing settleable → no settle block; guidance line = today's SHORT string.

Gates: `npm run build` exit 0; new suites green; full vitest with no NEW reds beyond the
characterized set in `CURRENT_STATE.md`; JK's browser pass remains the acceptance gate for the
panel. (L-SIM note: this diff is auction-module-only — per the standing import-graph rule, grep
the graph, document it, and skip the L-SIM leg.)

---

## §10 — v1 or v1.1 (R15) + sizing

**Recommendation: v1.1** — schedule it in the v1.1 economy batch, unchanged from §2.8's own
ruling. The reachable short-exit population is now small **by construction**: the pool-sizing
buildability floor (approval #4 — never below what lets every club field a legal 22 under the
cap), the lock-time sufficiency hard floor incl. expected shill wins, DJ-13, and the C3 backfill
all sit upstream. What v1 ships already refuses to hand off a broken club (the gate) and already
has an escape hatch (the override). Settle is the quality-of-life third door — worth building,
not worth delaying the playthrough for. This doc is contract-ready whenever Codex picks it up;
JK's build approval stands, so it can also be pulled forward into any idle builder window without
further design work.

Build size honestly: one new engine file (~180 lines) + one exported fit helper (~6 lines) + hook
action (~40 lines) + panel block (~60 lines) + tests. No DB change, no migration, no new state,
no new tokens.

## Companion notes for Opus (audit lens)

- The three adversarial checks that matter most: (1) **fit-law pin S2** actually exercises the
  fit-vs-ask conflict (a fixture where cheapest-first would pick differently — if S2 passes with
  rank-encoding removed, the fixture is too weak); (2) **double-entry** — sum of all team budgets
  + all result salaries conserved across the pass; (3) **classifier identity** — the settle call
  site passes the SAME `deriveShillTeamIds` result the commit uses, not a re-derivation.
- Adapter-fidelity lens (the C4 lesson, three same-class bugs): the hook's input assembly (§7.2
  steps 2-4) is hand-built plumbing — audit it against the engine contract field by field.
- DJ-25 note: the settle block lives ONLY in `HandoffCheckPanel`; the legacy complete banner
  (`LeagueBuilderAuctionDraft.tsx:1610-1620`) gets NOTHING — it dies with DJ-25.
