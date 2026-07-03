# FABLE DESIGN — POOL SIZING DIAL + FIT-FIRST TRIM + BUILDABILITY FLOOR (hard-cap Phase 2, expanded)

**Date:** 2026-07-03 · **Designer:** Fable 5 · **Builder:** Codex · **Auditor:** Opus
**Ruling:** JK approval 2026-07-03 — approved hard-cap Phase 2 AND expanded it into the
pool-sizing feature (five approvals, §0.2). Supersedes/absorbs
`FABLE_HARD_CAP_DESIGN_2026-07-03.md` §3.3 (this doc IS the expanded Phase 2; §3.3's
(a)–(d) survive inside §5 here, with the repair made fit-aware). Also supersedes the
extractor-era "trim-to-target is v1.1" stance (`poolFromDemand.ts` header, lines 17–19) —
JK pulled it into v1.
**Status:** DESIGN COMPLETE — ready to contract. NO code in this doc; Codex builds to it.
**AMENDED 2026-07-03 (JK OVERRIDE — HAND EDITS PRESERVED):** JK overrode §9.3
(DECISIONS_LOG 2026-07-03): manual pool add/removes are PRESERVED automatically across a
recalc, not redone. Reconciliation of the fit-law concern: the §1 law governs the ENGINE's
automatic picks; a hand-edit is the USER's explicit override, so it is legitimately
protected — and the §6 RE-CHECK panel makes any buildability impact visible (visibility is
the safeguard, replacing block/redo). Amended sections are tagged `[AMENDED 2026-07-03]`:
§3.2 (4th protected class), §3.3 (note wording), §4.2/§4.3/§4.5/§4.6 (reconcile step +
additive engine surface), §5.2 (preservation mechanics + notice copy), §5.3, §6.2
(visibility safeguard), §7.1 (tuple), §7.3 (tests 15–17), §8 (2B scope), §9.3 (OVERRIDDEN).
Phase 2A (the engine contract as originally cut) is UNAFFECTED and proceeds as contracted;
the amendment's engine delta is additive and lands with Phase 2B (§8).
**Prereq (verified committed):** hard-cap Phase 1 — `salaryCap` on `LeagueTemplate` +
`resolveLeagueSalaryCap` (`src/utils/leagueBuilderStorage.ts:121,128–130`) + the 7-site
switch (Draft Setup `tierBudget` now reads the resolver, `LeagueBuilderDraftSetup.tsx:647–650`).

---

## §0 — Problem, approvals, scope

### 0.1 The problem

Design-first extraction (`extractPoolFromDemand`, `src/engines/poolFromDemand.ts:139`)
returns the raw union of demand-cell reservations ∪ the C1B archetype-floors pool with
**no size governor** — the header says so explicitly ("the union is NOT trimmed to the
sizing target… trim-to-target is a v1.1 refinement", lines 17–19). Rich universes produce
~2× pools; JK's browser experience: *"a draft with 2× the players on the roster leads to
many players not showing up in time to fill rosters."* Meanwhile every cap-driven
selection that picks bodies by price alone risks JK's other worry: *"the draft-picker
will prioritize cheap players over archetype fit instead of first looking for archetype
fit."*

### 0.2 The five approvals (JK 2026-07-03, binding)

1. **FIT-FIRST is the law, everywhere** — the pool and every cap-driven selection look
   for archetype fit first; cheapest is a tiebreak among equal fits, or a bounded,
   explicit LAST RESORT. Designed so the cheap-over-fit failure can never happen (§1).
2. **A user pool-size DIAL** in Draft Setup — target in the band **1.2×–1.5× of roster
   needs**, default inside the band, **hard ceiling 1.5×** (§2).
3. **The engine RECALCULATES to that target, fit-first** — trim surplus by dropping the
   worst-fit unclaimed extras first; never an identity pick or structural-floor pick.
   Smaller pool = tighter, better-fit pool (§3).
4. **A buildability FLOOR the trim never crosses** — never below what lets EVERY club
   field a legal 22 under the cap; clamp UP with a plain conflict message (§4).
5. **The interactive loop** — recalc → hand add/remove → RE-CHECK → per-club "can every
   club still build a legal 22 under the cap?" verdict, in the exit-gate's own words (§6).

### 0.3 Scope

- IN: the design-first (Mode A) extraction pipeline's size governor; the dial + its
  persistence; the fit-first trim; the G1 constructive buildability floor + fit-aware
  repair; the recalc/re-check interactive loop in Draft Setup; the price-vs-bodies
  shortfall naming (absorbed from hard-cap §3.3c/d).
- OUT (unchanged): `extractDraftPool`'s INTERNAL floors sizing (`oversupply: 1.2`,
  `EXTRACTOR_TUNING`, `draftPoolExtractor.ts:72–81`) — it governs floors *bodies*, the
  outer trim governs *final pool size*; the auction/snake draft flows themselves; the
  farm pool (extracts later through its own structure per the farm relocation ticket);
  luxury taxes (outside G1, per hard-cap §3.0); item-③ settle-from-shills (later build —
  but §1 binds it in advance).

---

## §1 — THE FIT-FIRST LAW (the constitution for every selector)

One sentence, binding on every cap- or size-driven selection in the league-builder
pipeline, present and future (including the later settle-from-shills build):

> **FIT IS A FILTER. PRICE IS THE ORDER *WITHIN* THE FILTER. THE FILTER RELAXES ONLY AS
> AN EXPLICIT, BOUNDED, NOTED LAST RESORT.**

Concretely, every selector is written as: (1) build the candidate set by **eligibility**
(position/role/coverage legality), (2) restrict to **fit-qualified** candidates
(definition per selector, below — always deterministic), (3) order by **salary asc, id
asc** within the qualified set, (4) if and only if the qualified set is empty, fall back
to the eligible set (same price order) AND emit a note naming the relaxation. Price never
outranks fit; fit is never a score that price can outbid — it is a gate.

Where the law ALREADY holds (verified — reuse, don't rebuild):

| Selector | Fit filter | Price role | Evidence |
|---|---|---|---|
| Demand-cell reservation | `demandCellMatches` shape filter | salary-asc among matches + `priceSpread` | `poolFromDemand.ts:109–116, 176–186` |
| Design evaluator fill | slot-preference matching frame | cheapest-first among matches ("feasibility maximizes leftover budget") | `rosterDesignFeasibility.ts:207, 276–` |
| Extractor cap eviction | evicts by LOWEST max-fit (fit ordering, not price) | none | `draftPoolExtractor.ts:318–331` |
| Identity seeds / round-robin fill | `archetypeFitScorer` best-fit | none | `draftPoolExtractor.ts:272–312` |

Where THIS design applies the law: the trim (§3 — fit-ordered eviction), the G1 repair
injection (§4 — fit-qualified-then-cheapest), and the dial recalc (§5 — composition of
the two). Where it will apply LATER: settle-from-shills selects the fitting body for the
short club first, cheapest among fits — that build cites this section.

---

## §2 — The size-target model (the dial)

### 2.1 Roster needs and the band

- **`demandBase` = teams × 22 + expectedShillWins** — the number of bodies the draft
  will actually consume: real seats (`teams × LEGAL_ROSTER.size`) plus the players shills
  are expected to walk off with (`poolDemandModel(...).expectedShillWins`,
  `src/engines/auctionPoolSizing.ts:127` — `shills × winsPerShill`, winsPerShill = 10).
  With **shills = 0 this is exactly JK's "roster needs = teams × 22"** (and JK's current
  workaround runs shill-count 0, so his league reads literally as approved). Rationale
  for including shill wins when shills exist: shill-won players leave the market, so a
  band computed on real seats alone would deliver a pool effectively *thinner* than the
  chosen multiplier. Flagged for ratification in §9.1 — recommendation: keep.
- **Band:** multiplier `m ∈ {1.20, 1.25, 1.30, 1.35, 1.40, 1.45, 1.50}` — seven discrete
  stops, no free typing (deterministic, no validation edge-cases). **Default `1.35`**
  (mid-band: tighter than today's `identityHeadroom` 1.5 recommendation, which is the
  point — JK's complaint is bloat; the user can push to 1.5).
- **`requestedTarget` = ceil(m × demandBase)`. **Hard ceiling** = `ceil(1.5 × demandBase)`
  — the dial physically cannot ask for more (the ~2× bloat is unreachable by
  construction).

### 2.2 The floor, and the one case where the floor beats the ceiling

- **Static floor** (cheap, always computed): `hardFloor` =
  `max(baseSlots, feasibilityFloor) + expectedShillWins` — exactly the green-light floor
  `evaluatePoolDemandSufficiency` already enforces
  (`src/utils/leagueBuilderPoolBuilder.ts:344–348`). Below it the pool provably cannot
  field every archetype/seat.
- **Constructive floor** (the real §4 guarantee): whatever size the G1 repair loop lands
  on. Not precomputed — discovered by running trim-then-repair (§4.3 order of
  operations).
- **`effectiveTarget` = max(requestedTarget, hardFloor)`; the final pool size after §4 =
  `max(effectiveTarget, size the G1 repair needed)`.
- **Floor beats ceiling** (extends approval #4): if `hardFloor` (or the G1-repaired size)
  exceeds the 1.5× ceiling, the floor WINS — a pool that can't seat legal rosters is
  strictly worse than exceeding the band — and the conflict is said plainly (§2.4).
  With shills folded into `demandBase` (§2.1) this is rare (it requires the archetype
  feasibility floor to outrun 1.5× of total demand), but the rule must exist.

### 2.3 Persistence + mode scoping (RULED)

- **`poolSizeMultiplier?: number`** on `LeagueTemplate`
  (`src/utils/leagueBuilderStorage.ts:106–126`), directly after `salaryCap`. One of the
  seven stops; absent → 1.35. **Additive, schemaless record ⇒ NO DB bump** — the exact
  `salaryCap` precedent. Persisted through the existing `saveLeagueTemplate` path (the
  Draft Setup page already patches the template via `saveLeagueDraftSetup`,
  `LeagueBuilderDraftSetup.tsx:719–726` — widen the patch type to include
  `poolSizeMultiplier`).
- **Design-first (Mode A):** the dial is LIVE — extraction/recalc trims to
  `effectiveTarget` (§3–§5).
- **Pool-first (RULED):** the dial sets the same target as *guidance only* — the
  sufficiency line's "recommended N" (`LeagueBuilderDraftSetup.tsx:1199`) and the
  over-supply warning re-key to the dial target instead of the C3 `targetSize`
  (`evaluatePoolDemandSufficiency` gains an additive `targetOverride?` param used for
  `overSupplyWarning` + a surfaced `recommended` field; the HARD FLOOR logic is
  untouched). NO auto-trim in pool-first — the user IS the trim there; the §6 RE-CHECK
  panel works in both modes. Rationale: never have the engine silently delete players
  from a hand-curated pool.
- The C3 `targetSize` recommendation and the dial would otherwise be two competing
  numbers on one screen; RULED: the dial target is the ONE surfaced recommendation
  (`poolDemandModel` keeps computing `targetSize` internally for `hardFloor` math and
  the offline harness; the UI shows the dial's number).

### 2.4 The clamp message (plain, one line, kit-toned)

When `effectiveTarget > requestedTarget` (floor clamped up):
> "You asked for a {m}× pool ({requestedTarget}); fielding every club's roster under
> your ${cap} needs {finalSize} ({m_effective}×). Sized up to {finalSize}."
`m_effective` = finalSize / demandBase rounded to 2 decimals. Same shape when the G1
repair pushes past the ceiling. No modal, no block — an amber (`--ballpark-status-warn`)
line in the extraction report area. Deeper explanation behind the help button per the
UI rules.

---

## §3 — The fit-first TRIM (approval #3)

### 3.1 Where it lives

A new **step 5.5 inside `extractPoolFromDemand`** (`poolFromDemand.ts`, after the union
at :205–212, before the design re-verify at :214; `[AMENDED 2026-07-03]` and after the
§4.3-step-5 hand-edit reconcile, which slots between the union and this trim), plus an
exported pure helper so the
engine and tests share one implementation:

- `trimPoolToTarget(players, protectedIds, fitOf, target)` → `{ kept, evicted }` — pure,
  deterministic, no I/O. (Exact export name for Codex: `trimPoolToTarget`.)

The extractor's INTERNAL `enforceCap` (`draftPoolExtractor.ts:318–331`) is untouched —
it governs the floors sub-pool during C1B assembly; this trim governs the FINAL union.
Same fit metric, one level up.

### 3.2 Protected sets (never trimmed — approval #3's "NEVER" list)

1. **Demand-cell reservations** — `reservedIds` (`poolFromDemand.ts:174, 185`). These
   are the users' explicit asks; they ARE fit.
2. **Identity-seed claims** — every id `buildIdentityRoster` claimed for any selected
   archetype (`draftPoolExtractor.ts` `claimed`, :281–288 + repair :367–370).
3. **Structural-floor picks** — `floorIds` (`draftPoolExtractor.ts:317`).
4. **[AMENDED 2026-07-03] Hand-picks** — `pinnedIds` (§4.6): the user's explicit manual
   adds, derived at recalc time from persisted membership vs the last extraction snapshot
   (§5.2 mechanics). Per the JK override: the §1 fit law governs the engine's AUTOMATIC
   picks; a hand-add is the user's deliberate override and is NEVER trimmed. Its
   buildability consequences surface in the §6 RE-CHECK panel — visibility is the
   safeguard, not eviction.

(2) and (3) are today PRIVATE to `extractDraftPool`. **Additive contract change:**
`ExtractedPool` (`draftPoolExtractor.ts:97–108`) gains two readonly fields —
`claimedIds: string[]` and `floorIds: string[]` (sorted id-asc) — populated from the
existing sets at return. No behavior change inside the extractor; existing tests
untouched; the union trim consumes them.

### 3.3 The eviction order (fit-first, price-second — the law applied)

Among UNPROTECTED pool members only, evict repeatedly until `size ≤ effectiveTarget`
or only protected members remain, ordered by:

1. **`maxFit` ascending** — `maxFit(p)` = max over the selected archetypes of
   `archetypeFitScorer(archetype, tier, posture)(p)` — the SAME single-math scorer the
   seeds/fill/eviction already use (`draftPoolExtractor.ts:272–274, 324`). Worst fit
   goes first. Fit is the primary key: a cheap bad-fit is evicted before an expensive
   good-fit, always.
2. **`salary` descending** among equal fits — among equally-poor fits, the EXPENSIVE
   filler goes first, because keeping the cheaper equal-fit body is free buildability
   insurance under the cap (this is the only place price appears, and only as the
   within-fit tiebreak — the law's shape).
3. **`id` ascending** — the repo's determinism convention.

Fit-score ties use the same `1e-9` epsilon convention as the extractor's fill loop
(`draftPoolExtractor.ts:304`). If the trim stops early because only protected members
remain above target, emit the existing-style note ("pool exceeds the {target} target by
{K}: every remaining player is claimed by an ask, an identity build, a structural floor,
or your own hand-picks" — pattern of `draftPoolExtractor.ts:375–379`; hand-picks clause
`[AMENDED 2026-07-03]`, present only when `pinnedIds` members are among the survivors).
This same note covers the case where the user's pins alone push the pool past the target
or even the 1.5× ceiling — that is the user's own explicit choice, said plainly, never
silently trimmed away.

### 3.4 Why the cheap-over-fit failure cannot happen (the JK guarantee, mechanically)

- Selection INTO the pool: cells filter by shape THEN price (`:180–184`); floors/seeds/
  fill select by fit scorer with no price term (`draftPoolExtractor.ts`).
- Selection OUT of the pool (this trim): ordered by fit ascending; price appears only
  within an exact fit-tie.
- Selection into a failing club's repair (§4): fit-qualified filter, THEN price.
- There is no selector anywhere in the pipeline whose primary key is price. §7 pins this
  with adversarial tests (a dirt-cheap zero-fit body must lose to a pricier fitting one
  in every path).

---

## §4 — The buildability floor: G1 constructive check + fit-aware repair (approvals #1, #4)

### 4.1 G1 (unchanged definition, absorbed from hard-cap §3.3a)

**G1 = the pool contains N disjoint legal 22s, each salary-sum ≤ cap** (N = real teams;
cap = `resolveLeagueSalaryCap(league)` — the Phase-1 number, already threaded into
extraction as `budgetPerTeam`, `LeagueBuilderDraftSetup.tsx:820`). Constructive check:
run the design-feasibility matching frame with an **all-no-ask 22-slot design**
(`seedRosterDesignSlots()` with empty preferences — the evaluator is already
cheapest-first-among-eligible, `rosterDesignFeasibility.ts:207`, and already verifies
legality via `isLegalRoster`, :462–468) N times, REMOVING each assembled 22 from the
candidate set before the next pass. Pass k fails ⇒ record the failing groups (the
evaluator's blockers name them) and the overrun if it filled but busted the cap.
Return the N assemblies in the result for tests/audit (assert on assemblies, not a
boolean).

### 4.2 Fit-aware repair (the §3.3b amendment JK ordered)

On G1 failure, inject from the UNIVERSE (players not in the pool), per failing group,
per round, ONE body chosen by the law:

1. **Eligibility filter:** legal for the failing group — position primaries via the
   roster-law shapes, C-coverage via `canCover`, arms via `canStart`/`canRelieve`
   (`src/data/rosterConstruction.ts` — the same predicates the floors use), AND
   **cap-bearable**: `salary ≤ cap − 21 × poolMinSalary` (the true single-slot bound —
   hard-cap §3.3c's arithmetic; an unbearable body can never help a legal-22-under-cap).
2. **Fit qualification:** `maxFit(candidate) ≥ min maxFit over current pool members` —
   plainly: *never inject a body that would instantly be the pool's worst fit.*
   Deterministic, self-scaling, no magic constant.
3. **Order within the qualified set:** `salary asc, id asc` — cheapest-among-fit,
   exactly JK's law (the repair's whole job is affordability; fit already gated).
4. **LAST RESORT (bounded + noted):** qualified set empty ⇒ take the eligible set
   (same price order) and append a note: "no affordable {group} body also fits your
   league's identities — added the cheapest legal option ({name})." This is the only
   sanctioned relaxation, and it is visible.

**[AMENDED 2026-07-03] Hand-removes are out of bounds for repair:** the injection
candidate set is the universe MINUS the pool MINUS `excludedIds` (§4.6 — the user's
hand-removes). Repair never resurrects a player the user explicitly removed. If repair
exhausts for a group AND an excluded hand-removed player would have qualified (passes the
eligibility filter, the fit qualification, and the cap-bearable bound above), the
league-level shortfall line (§4.4) appends one sentence naming the cheapest such
candidate: "…{name}, whom you removed by hand, would qualify — re-add them to close this
gap." One name max; plain visibility per the override ruling, never a silent resurrection
and never a silent dead-end.

Then re-run G1. **Bounded rounds:** `maxRepairRounds` mirroring `EXTRACTOR_TUNING`
(default 6; §16-tunable). **Additive-only invariant:** repair never evicts anyone —
cell reservations, seeds, floors, and previously-trimmed survivors all persist; the trim
(§3) ran BEFORE and never runs again after repair (so repair size gains stand — that IS
the constructive floor beating the target, §2.2). Rounds exhausted or universe exhausted
⇒ ship the pool anyway with the league-level shortfall named (§4.4) — extraction never
hard-fails.

### 4.3 Order of operations (the whole recalc, deterministic)

Inside `extractPoolFromDemand`, `budgetPerTeam` finite (always true in the live flow
post-Phase-1):

1. Classify universe (existing step 1).
2. Demand cells → reservations (existing steps 2–3).
3. C1B floors extraction (existing step 4).
4. Union, reservation-first (existing step 5).
5. **[AMENDED 2026-07-03] NEW — hand-edit reconcile:** drop `excludedIds` from the union
   AND from the §4.2 repair candidate universe; force-include `pinnedIds` into the union
   (resolved against the classified universe; unresolvable ids skipped silently — a
   deleted player is not an error). Runs BEFORE sizing so the trim, G1, and the design
   re-verify all see the reconciled membership — the buildability guarantee is computed
   on the pool the user will actually draft from, never on a pre-hand-edit fiction.
6. **NEW — sizing:** compute `demandBase`, `requestedTarget`, `hardFloor`,
   `effectiveTarget` (§2); **trim** to `effectiveTarget` (§3) with protected =
   reservations ∪ `claimedIds` ∪ `floorIds` ∪ `pinnedIds`. Pins consume room WITHIN the
   target: a pinned hand-add displaces the worst-fit unprotected automatic pick rather
   than inflating the pool (unless only protected members remain — §3.3 early-stop note).
7. **NEW — buildability:** G1 check (§4.1) → fit-aware repair loop (§4.2, `excludedIds`
   out of bounds).
8. Design re-verify against the FINAL pool (existing step 6 — unchanged; it now sees
   the reconciled+trimmed+repaired membership).
9. **NEW — report:** `sizing` + `g1` result fields (§4.5).

`Infinity`/absent budget ⇒ steps 5–6 still run the RECONCILE + TRIM (both are
budget-independent) but skip G1/repair (nothing to guarantee) — keeps the engine
meaningful for capless test fixtures while never regressing existing suites (which don't
pass a dial and get `effectiveTarget` from the default 1.35 only when a multiplier/teams
context is provided; with no `teams` option and no multiplier, sizing is SKIPPED
entirely — today's behavior byte-for-byte. Codex: gate step 6 on
`options.sizeTarget !== undefined || options.poolSizeMultiplier !== undefined`;
`[AMENDED 2026-07-03]` gate step 5 independently on
`options.pinnedIds?.length || options.excludedIds?.length` — both absent ⇒ step 5 is a
no-op and results are byte-identical to the pre-amendment engine, pinned by test 12).

### 4.4 Shortfall naming (absorbed hard-cap §3.3c/d, unchanged)

- **Price-vs-bodies:** an ask is cap-unbearable when every matching candidate's salary
  > `cap − 21 × poolMinSalary` ⇒ price-worded shortfall ("…every candidate costs more
  than a ${cap} cap can carry"), distinct from the bodies-count wording
  (`poolFromDemand.ts:188–195`).
- **League-level:** repair exhaustion ⇒ one plain line naming the group(s) still short.
- **priceSpread pin (§3.3d):** regression test pinning that index 0 = the cheapest
  match is always reserved per cell (`poolFromDemand.ts:130–137` + sort at :182) — now
  load-bearing; no behavior change.

### 4.5 New result surface (additive on `PoolFromDemandResult`, `poolFromDemand.ts:76–86`)

- `sizing?: { demandBase, requestedMultiplier, requestedTarget, hardFloor,
  effectiveTarget, finalSize, trimmedCount, evictedIds, injectedIds, ceilingTarget,
  clamped: boolean, messages: string[], pinnedHandPicks: string[],
  excludedHandRemoves: string[] }` — the last two fields `[AMENDED 2026-07-03]`: the
  resolved pins actually present in the final pool and the excludes actually withheld
  (sorted id-asc), so the UI's kept-notice (§5.2) and tests assert against what the
  engine DID, not what the wiring asked for.
- `g1?: { holds: boolean, assemblies: string[][] /* N id-arrays when holds */,
  failing?: { pass: number, blockers: string[], overrun?: number },
  repairRounds: number }`

Both optional ⇒ every existing consumer/test compiles untouched.

### 4.6 New options (additive on the `extractPoolFromDemand` options)

`poolSizeMultiplier?: number` (one of the seven stops; the UI passes the persisted
dial), `sizeTarget?: number` (absolute override for tests/harness), `maxRepairRounds?`,
`posture?` (forwarded to the fit scorers; default `'optimal'`, matching the extractor).
`[AMENDED 2026-07-03]` plus `pinnedIds?: string[]` (force-included in the union at §4.3
step 5 and joined to the trim's protected set — the engine is agnostic to WHY they're
pinned; the wiring feeds it the hand-add ledger, §5.2) and `excludedIds?: string[]`
(withheld from the union and from the repair candidate universe — the wiring feeds it
the hand-remove ledger). Both are part of the pure-function input tuple (§7.1); both
absent ⇒ byte-identical behavior (test 12).

---

## §5 — Draft Setup wiring: the dial + recalc (approval #2, #3)

### 5.1 The dial UI

Placement: the pool panel header in `LeagueBuilderDraftSetup.tsx`, on the same row as
the sufficiency line (whose "recommended N" it replaces, :1199). Form: **seven-stop
segmented stepper** labeled `POOL SIZE`, stops rendered as `1.2× … 1.5×`, the active
stop filled `--ballpark-brass` on `--ballpark-well`, chrome font
(`--ballpark-font-chrome`), with a live absolute readout:
`{effectiveTarget} PLAYERS · {teams} CLUBS × 22{shills > 0 ? ` + {shills} SHILLS` : ``}`.
When the floor clamps the request, the readout carries the amber §2.4 message tone
(`--ballpark-status-warn`); normal state `--ballpark-chalk`. Disabled (with the existing
muted treatment) while the pool is locked or a saved draft exists — same gates as every
other pool mutation (`assertPoolCanMutate`, :855–859).

Changing the stop persists `poolSizeMultiplier` via `saveLeagueDraftSetup` immediately
(it is a league setting, like the seats), but does NOT itself mutate the pool — the
pool changes only on extract/recalc (design-first) and never automatically (pool-first).

### 5.2 RECALC semantics (design-first)

- Extraction and recalc are the SAME pure call: `buildModeAResult`
  (`LeagueBuilderDraftSetup.tsx:804–822`) passes
  `poolSizeMultiplier: league.poolSizeMultiplier ?? 1.35` alongside the existing
  `teams`/`budgetPerTeam`. Deterministic: same universe set + designs + archetypes +
  tier + cap + dial + teams ⇒ same pool (C1B-4 extended — the trim/repair orderings are
  all id-tiebroken).
- **[AMENDED 2026-07-03 — JK OVERRIDE; supersedes the original RULED redo semantics and
  §9.3] Hand edits are PRESERVED automatically across every recalc.** A hand-add stays
  in (protected from the §3 trim as protected class 4, §3.2); a hand-remove stays out
  (excluded from the rebuilt union AND from §4.2 repair). Rationale (JK ruling,
  DECISIONS_LOG 2026-07-03): a hand-edit is the user's explicit override — the fit law
  governs the engine's automatic picks, not the user's deliberate hand-picks — and the
  §6 RE-CHECK panel makes any buildability impact visible; visibility is the safeguard.
  Builder-ready mechanics:

  **Tracking (persisted, schemaless — NO DB bump; the `salaryCap` precedent):** three
  additive optional fields on `LeagueTemplate` (`leagueBuilderStorage.ts:106–126`),
  design-first only:
  - `modeAExtractedIds?: string[]` — the FINAL pool membership of the last
    extraction/recalc (post-reconcile/trim/repair = `result.players` ids, sorted
    id-asc), written alongside `poolExtractedAt` at the apply site
    (`LeagueBuilderDraftSetup.tsx:977–978`).
  - `modeAHandAdds?: string[]` / `modeAHandRemoves?: string[]` — the cumulative
    hand-edit ledgers (sorted id-asc, invariantly disjoint).
  All three are cleared at the same site that clears `poolExtractedAt` on a switch to
  pool-first (`LeagueBuilderDraftSetup.tsx:868`). Pool-first never reads or writes them
  — no auto-trim there, the user IS the trim (§2.3).

  **The fold (new pure helper, wiring layer — `foldHandEditLedger` in
  `leagueBuilderPoolBuilder.ts`; exact export name for Codex):** inputs
  `{ previousAdds, previousRemoves, lastExtractedIds, currentMemberIds, universeIds }`,
  returns `{ handAdds, handRemoves }`:
  - Since-last deltas: `dAdd = currentMemberIds − lastExtractedIds`,
    `dRem = lastExtractedIds − currentMemberIds`, where `currentMemberIds` is the live
    assignment set (`isPlayerInLeaguePool` over the universe, the same read the apply
    site already does at :972). The assignment set IS the persisted membership, so
    deltas are DERIVED from it — no handler instrumentation, and an edit made through
    ANY pathway (shuttle, player deletion, roster ops) is captured.
  - `handAdds = ((previousAdds ∪ dAdd) − dRem) ∩ universeIds`
  - `handRemoves = ((previousRemoves ∪ dRem) − dAdd) ∩ universeIds`
  Cancellation falls out of the algebra: add-then-remove (or remove-then-re-add) of the
  same player nets to no delta; a previously-pinned add the user later removes migrates
  to the removes ledger (their mind changed — it now stays out); a previously-excluded
  remove the user re-adds migrates to the adds ledger (now pinned); deleted players
  drop off both. Invariants: `handAdds ∩ handRemoves = ∅`; after a recalc,
  `handAdds ⊆ pool` and `handRemoves ∩ pool = ∅`.

  **Recalc order of operations (replaces the redo semantics):**
  1. **Fold:** compute `{handAdds, handRemoves}` via the helper. When
     `modeAExtractedIds` is absent (the FIRST design-first extraction), both ledgers
     are EMPTY — first extraction stays the clean-slate convergence it is today, and
     pool-first leftovers are never mistaken for hand-adds.
  2. **Engine:** `buildModeAResult` (:804–822) passes `pinnedIds: handAdds` and
     `excludedIds: handRemoves` alongside the dial/teams/cap. The engine reconciles at
     §4.3 step 5, protects pins from the trim, keeps excludes out of union and repair,
     and runs G1 on the reconciled pool.
  3. **Converge membership** to `result.players` exactly as today (:971–976) — pins
     survive because they're IN the result; excludes stay out because they're NOT.
  4. **Persist** `modeAExtractedIds := result.players` ids + the folded ledgers,
     alongside `poolExtractedAt`.
  Pins consume room WITHIN `effectiveTarget` (each displaces the worst-fit unprotected
  automatic pick); pins alone above target ⇒ the §3.3 early-stop note. G1 and the §6
  RE-CHECK always see the reconciled pool, so a hand-add that busts a club's build or a
  hand-remove that strands the league surfaces in the panel — never silently blocked,
  never silently passed.

  **`modeAManualEdits` becomes DERIVED, not volatile state:** replace the boolean
  (:453, set at :947/:955) with the live fold's
  `handAdds.length + handRemoves.length > 0`. This also fixes the latent bug where a
  page reload lost the flag and the confirm affordance silently vanished.

- **[AMENDED 2026-07-03] Confirm kept; copy flips from warning to notice.** The
  **RE-EXTRACT confirm** affordance stays (the `reExtractConfirm` pattern, :824–853,
  gated at :1078 — now gated on the derived flag). With hand edits present the added
  sentence becomes reassurance, not a warning, in chalk tone (`--ballpark-chalk`, not
  warn): "Recalc rebuilds the automatic picks to your dial. Your {A} hand-add{s} stay
  in; your {R} hand-remove{s} stay out." Zero-count clauses are omitted ({A}=0 ⇒ only
  the removes clause, and vice versa); singular/plural per count.
- The extraction report area (where shortfalls/design verdicts already render from
  `modeAReport`, :824–841) additionally renders `sizing.messages` (clamp line, trim
  note, last-resort notes) and the trimmed/injected counts in one plain line:
  "Sized to {finalSize} ({m_effective}×): trimmed {trimmedCount} worst-fit extras,
  added {injectedIds.length} for affordability." `[AMENDED 2026-07-03]` When
  `pinnedHandPicks.length + excludedHandRemoves.length > 0`, the line gains a trailing
  sentence built from the ENGINE's report (not the wiring's request): "Kept your {A}
  hand-adds and {R} hand-removes." (same zero-count omission rule).

### 5.3 Hand add/remove (both modes)

Unchanged machinery: the existing pool shuttle backed by
`addPlayersToLeaguePool` / `removePlayersFromLeaguePool`
(`src/utils/leagueBuilderPoolBuilder.ts:141–198`), still lock-gated. The dial does not
gate the shuttle; the shuttle does not move the dial. The RE-CHECK panel (§6) is how
the user learns whether their edits broke buildability. `[AMENDED 2026-07-03]` The
shuttle handlers need NO changes for preservation: hand edits land in the assignment
set as ever, and the §5.2 fold derives the ledgers from membership at the next recalc —
the shuttle stays dumb, the fold stays smart.

---

## §6 — The RE-CHECK loop: per-club verdict panel (approval #5)

### 6.1 The single-law rule (binding)

The re-check speaks EXACTLY the laws the designer, the extraction re-verify, and the
handoff check already speak — never a parallel rule:

- **Per designed club:** `evaluateRosterDesign(club's locked design slots, current pool,
  resolveLeagueSalaryCap(league))` — the same call the live designer verdicts already
  make (`LeagueBuilderDraftSetup.tsx:678–690`) and the same `DesignFeasibilityResult`
  vocabulary (BUILDS / short at slot X / OVER BUDGET $K over).
- **League seatability (all clubs incl. CPU):** the §4.1 G1 constructive check over the
  CURRENT pool membership (N disjoint legal-22s-under-cap). Failure wording built from
  `describeRosterLawGaps` (`src/engines/auctionExitGate.ts:57–82`) — the DJ-06
  exit-gate's own sentences ("Still needs a starting C.", "Needs 2 more starters.") —
  so the pre-draft check and the post-draft handoff check are verbatim the same voice.
  Legality itself is `isLegalRoster`/`LEGAL_ROSTER` in every path (designer evaluator
  :462–468, exit gate `auctionExitGate.ts:107–111`) — one law, three doors.

### 6.2 The panel

A `RECHECK` block in the pool section (both modes), visible once the league has teams
with identities and ≥1 pooled player:

- **Header row:** `CAN EVERY CLUB BUILD A LEGAL 22 UNDER ${cap}?` + a `RE-CHECK` button
  (kit action style, `--ballpark-action-green`) + a stale chip (`--ballpark-status-warn`
  dot + "pool changed — re-check") whenever pool membership, the dial, designs, or the
  cap changed since the last run.
- **Verdict rows, one per club:** club name · seat/CPU tag · verdict. Pass =
  `--ballpark-status-green` check + "BUILDS" (designed clubs add "· ${headroom} to
  spare" from the evaluator). Fail = `--ballpark-status-red-bright` cross + the plain
  blocker list (§6.1 wording), e.g. "✗ RIVER CATS — Still needs a starting C. Needs 1
  more reliever." For the G1 league-level failure that isn't attributable to a specific
  designed club (a later pass ran out of cheap bodies), attribute to the pass's club
  when seat-ordered, else one league row: "✗ LEAGUE — after {k} clubs build, the pool
  can't seat club {k+1}: {blockers}."
- **Run points:** auto after extraction/recalc and on lock; manual via the button after
  hand edits (a stale panel never silently lies — the chip). Computation is the pure §4
  check over in-memory rows the page already holds — no new storage.
- **[AMENDED 2026-07-03] The panel is the safeguard the JK override designates.**
  Preserved hand-edits flow into G1 like any other membership fact: a preserved
  hand-add that busts a club's build shows as that club's red row; a preserved
  hand-remove that strands the league shows in the league-level row, carrying the §4.2
  "…would qualify — re-add them" note when a hand-removed player was the missing piece.
  The auto-run after every recalc guarantees a kept hand-edit's buildability impact is
  on screen in the same breath as the kept-notice — never a silent block, never a
  silent pass. This visibility is what replaced the old redo/block behavior.

### 6.3 What RE-CHECK never does

Never mutates the pool (read-only law check), never blocks the shuttle, never replaces
the DJ-06 handoff gate (that stays at draft exit) and never replaces JK's manual
browser acceptance.

---

## §7 — Determinism, migration, acceptance tests

### 7.1 Determinism

- Every new ordering is fully keyed (fit, salary, id — §3.3, §4.2) with the epsilon
  convention; the whole recalc is a pure function of (universe SET, designs, selected
  archetypes, tier, cap, teams, shills, dial, and — `[AMENDED 2026-07-03]` —
  pinnedIds + excludedIds, both as SETS). Extend the C1B-4 invariance test to
  `extractPoolFromDemand` with sizing on: same input set, shuffled array order ⇒
  identical pool, identical `sizing`/`g1` reports.
- G1 pass order = seat order (the league's `teamIds` order) — documented, stable.

### 7.2 Migration

- `poolSizeMultiplier` absent ⇒ 1.35. NO DB bump, NO backfill (the `salaryCap`
  precedent — schemaless record). Already-extracted pools are untouched until the next
  extract/recalc/lock. Locked pools: dial disabled (§5.1); membership frozen as ever.
- No new IndexedDB store ⇒ the 4–5-registry rule is not triggered; backup/sync/L-SIM
  surfaces untouched. L-SIM: draft/auction modules remain outside the L-SIM import
  graph (documented orthogonality) — Codex re-runs the import-graph grep and documents
  it; no L-SIM leg required.

### 7.3 Acceptance tests (Codex writes; Opus audits adversarially)

1. **Dial mapping:** 8 teams, 0 shills, m=1.35 ⇒ `requestedTarget` = ceil(1.35×176) =
   238; m=1.5 ⇒ 264; with 3 shills ⇒ demandBase 206, targets scale; shills=0 equals
   teams×22 semantics exactly.
2. **Hard ceiling:** no input can produce `requestedTarget` > ceil(1.5 × demandBase);
   the seven stops are the only accepted multipliers.
3. **Trim, fit-first:** fixture with a dirt-cheap zero-fit filler and an expensive
   good-fit filler over target ⇒ the cheap zero-fit is evicted FIRST (pins approval #1
   against the exact failure JK named).
4. **Trim protections:** no cell-reserved id, no `claimedIds` member, no `floorIds`
   member, and `[AMENDED 2026-07-03]` no `pinnedIds` member is ever evicted;
   over-target-with-only-protected emits the note (hand-picks clause included when
   pins are among the survivors), evicts nothing.
5. **Trim tiebreak:** two equal-fit fillers ⇒ the expensive one goes first; equal fit
   and salary ⇒ id asc.
6. **Floor clamp:** m=1.2 request below `hardFloor` ⇒ `effectiveTarget` = hardFloor,
   `sizing.clamped` true, message matches §2.4 shape.
7. **G1 constructive:** cap-tight fixture ⇒ `g1.assemblies` = N disjoint id-sets, each
   a legal 22 with sum ≤ cap (assert the assemblies, not the boolean).
8. **Fit-aware repair:** pool trimmed unaffordable; universe holds (a) a cheap zero-fit
   body and (b) a slightly pricier fitting body for the failing group ⇒ (b) is
   injected (fit filter beats price); with only (a) available ⇒ (a) injected AND the
   last-resort note present.
9. **Repair invariants:** additive-only (no eviction during repair); bounded rounds;
   exhaustion ⇒ extraction still returns with the league-level shortfall.
10. **Ceiling-vs-floor:** fixture where repair pushes finalSize past the 1.5× ceiling ⇒
    floor wins, clamp message present.
11. **Price-shortfall wording:** cap-unbearable ask ⇒ price-worded message; bodies
    wording unchanged elsewhere. **priceSpread pin** (§4.4).
12. **No-sizing no-regression:** existing `extractPoolFromDemand` fixtures without dial
    options ⇒ byte-identical results (sizing skipped, `sizing`/`g1` undefined).
    `[AMENDED 2026-07-03]` Same pin for the amendment surface: no
    `pinnedIds`/`excludedIds` passed ⇒ §4.3 step 5 is a no-op and results are
    byte-identical to the pre-amendment engine.
13. **Determinism:** §7.1 shuffled-input invariance.
14. **Re-check law identity:** the panel's blocker strings for a hand-broken pool ===
    `describeRosterLawGaps` output for the same gap (string-equality pins the
    single-law rule).
15. **[AMENDED 2026-07-03] Recalc preserves hand edits** (REPLACES the retired "recalc
    redoes hand edits" expectation): fixture with a persisted `modeAExtractedIds`
    snapshot + a membership carrying (a) one poor-fit hand-add — the pool's WORST fit,
    the trim's first victim if unprotected — and (b) one hand-remove the cells/floors
    would otherwise re-pick ⇒ recalc at a SMALLER dial stop: (a) is in the final pool
    (never evicted), (b) is absent (not re-picked by union OR repair),
    `sizing.pinnedHandPicks`/`excludedHandRemoves` name exactly them, and the
    kept-notice counts match the engine report.
16. **[AMENDED 2026-07-03] Pins displace, excludes stay dead:** (a) pool at exact
    target + 1 pin ⇒ the worst-fit UNPROTECTED member is evicted and size holds at
    target; pins alone above target ⇒ §3.3 early-stop note (hand-picks wording),
    nothing protected evicted. (b) repair fixture where the ONLY qualifying injection
    candidate is hand-removed ⇒ repair does NOT inject them, the league-level
    shortfall line carries the "…whom you removed by hand, would qualify" name.
17. **[AMENDED 2026-07-03] Ledger fold** (pure `foldHandEditLedger` unit tests):
    add-then-remove nets to zero; remove-then-re-add migrates removes→adds; a
    previously-pinned add later hand-removed migrates adds→removes; ids absent from
    the universe drop from both ledgers; ledgers always disjoint; absent snapshot
    (first extraction) ⇒ both ledgers empty — pre-existing pool-first leftovers are
    NOT pinned.
18. **Gates:** `npm run build` exit 0 + FULL vitest run (count/copy rule — never a
    filtered run; `historicalArchetypes.test` flakes verify solo per the known note).

---

## §8 — Phasing (RECOMMENDED SPLIT — two Codex contracts)

**Phase 2A — the engine (first contract):** §2 target math + `poolSizeMultiplier`
persistence + resolver-of-target, §3 trim (+ `ExtractedPool.claimedIds/floorIds`
additive export), §4 G1 + fit-aware repair + shortfall naming + result surface, §7.3
tests 1–13, 18 (gates; `[AMENDED 2026-07-03]` renumbered from 15 when tests 15–17 were
added — 2A's contracted scope is unchanged). Wiring limited to `buildModeAResult` passing the persisted dial and the
extraction report area printing `sizing.messages` (plain text — no new components).
Surfaces: `poolFromDemand.ts`, `draftPoolExtractor.ts` (additive fields only),
`leagueBuilderStorage.ts` (one optional field), `leagueBuilderPoolBuilder.ts`
(`targetOverride` on sufficiency), `LeagueBuilderDraftSetup.tsx` (options + messages
only), tests.

**Phase 2B — the interactive loop (second contract, after 2A lands audited):** §5.1
dial control, §5.2 recalc confirm copy, §6 RE-CHECK panel + stale chip + per-club
verdict rows + kit styling, §7.3 test 14 + a UI smoke.
**[AMENDED 2026-07-03]** Phase 2B additionally carries the whole hand-edit preservation
amendment: the three `LeagueTemplate` fields + `foldHandEditLedger` + the derived
`modeAManualEdits` + the notice copy (§5.2), the §6.2 safeguard rows, AND a small
additive ENGINE delta — `pinnedIds`/`excludedIds` options, §4.3 step 5, the 4th
protected class, the repair exclusion + would-qualify note, the two `sizing` report
fields — gated by the same no-regression shape (options absent ⇒ byte-identical,
test 12) plus tests 15–17. Phase 2A is UNAFFECTED as contracted; if 2A has not merged
when 2B is cut, the 2B contract rebases these as additive edits on 2A's landed code —
never a change to 2A's contracted behavior.

Why the split: 2A is a pure, headless, adversarially-testable engine change — exactly
the shape the builder/auditor triangle handles best, and it carries ALL the correctness
risk (fit ordering, protections, determinism, the three C4-class adapter traps live
here). 2B is presentation over an audited seam with zero new math; batching them would
put pixel review and invariant review in one diff and slow both. 2A alone already
delivers JK's core ask (right-sized, fit-first pools with the floor guarantee) on the
very next extraction; 2B delivers the dial-in-hand experience.

Per the adapter-fidelity lesson (three C4 bugs lived in hand-built engine inputs):
2A's `buildModeAResult` change must thread the PERSISTED multiplier and the RESOLVED
cap — never recompute either locally — and Opus audits that seam specifically.

---

## §9 — Open items for JK (plain decisions, with recommendations)

1. **Shill seats in the band's base** (§2.1): when shills exist, the pool target counts
   their expected wins as demand (your 1.2–1.5× then multiplies what the draft actually
   consumes). With your current shill-count-0 setup nothing changes at all.
   Recommendation: keep — otherwise shill leagues get thinner pools than the dial says.
2. **Default stop 1.35×** (§2.1): the middle of your band, tighter than the old
   recommendation. Recommendation: keep; you can push any league to 1.5× with one tap.
3. **Recalc redoes hand edits** (§5.2) — **OVERRIDDEN BY JK 2026-07-03** (DECISIONS_LOG
   2026-07-03). Original design (retired, kept for the record): "changing the dial after
   hand-editing re-derives the pool and asks you to confirm first; your add/removes are
   re-applied by hand afterward (the verdict panel makes that quick). Recommendation:
   keep — preserving hand edits through a resize silently is how ghost players sneak
   past the fit law." JK's ruling: hand edits are PRESERVED automatically across a
   recalc — see the amended §5.2 for the mechanics. The fit-law concern is reconciled,
   not dropped: the §1 law governs the ENGINE's automatic picks; a hand-edit is the
   USER's explicit override and is legitimately protected — and nothing is silent about
   it: the kept-notice names the counts and the §6 RE-CHECK panel surfaces any
   buildability impact in the same breath. Visibility replaces the redo.
