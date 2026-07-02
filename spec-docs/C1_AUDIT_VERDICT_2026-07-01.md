# FABLE-C1 AUDIT VERDICT — 2026-07-01 (Codex adversarial review [ruling 5b] + Opus verification)

> **VERDICT: BLOCK — 2 must-fix + 1 should-fix + 1 confirm; 1 dismissed.** As-of the UNCOMMITTED C1 diff on trunk `aa87ee93`. Auditor: Opus (of-record) + Codex (cross-model adversarial pass, ruling 5b). Builder: Fable — this goes back to Fable to fix (builder ≠ auditor; Opus does not hand-fix the math). Opus's build/suite/L-SIM gate is DEFERRED until the fixes land (running it on the current diff only re-confirms the green suite — which is precisely the blind spot these findings live in).

**Scope + safety (Opus, already verified):** the diff is exactly the 12 C1 paths + the design note; NO frozen oracle / golden / snapshot touched; the auction save-shape change is additive-optional. The AUCTION path (`rosterNeed` via `canCover`) IS Ruling-A-correct — the confirmed gaps are all in the IDENTITY-BUILDER / DRAFTABILITY path, which did not adopt the same legality.

**Codex overall:** Property 1 (the legality module `isLegalRoster`/`canCover` in isolation) is CLEAN — primary-only starting eight, secondary-C/Two-Way(C) counted for catcher depth, depth-2-elsewhere advisory. The defects are downstream consumers that don't honor that same model.

---

## MUST-FIX (block C1 landing)

### F3 — identity builder + draftability require a SECOND PRIMARY catcher (contradicts Ruling A) — CONFIRMED
`src/engines/archetypeBalanceSimulator.ts:120` adds a second `{ kind:'pos', position:'C' }` slot, and `eligible()` for `pos` (`:139`) returns `free.filter(p => !p.isPitcher && p.position === slot.position)` — PRIMARY-position equality. So the backup-C slot only accepts a second **primary-C**; it rejects a secondary-C hitter or a Two-Way(C) pitcher that `rosterConstruction.isLegalRoster`/`canCover` accept (DECISIONS_LOG Ruling A). The code comments (`:109`, `:114`) still say "a 2nd primary-C … HARD" — the stale 2026-06-30 model. `draftabilityRanker` builds on this → can mark an archetype `LOCKED` when a legal roster exists via secondary-C/Two-Way(C).
**Why it's a block:** C1's own make-or-break (RCI-02) was to make `rosterConstruction` the single legality source its consumers CALL. The identity builder is a consumer, in this same diff, re-deriving a stricter/stale rule instead of calling `canCover`/`isLegalRoster`.
**Fix:** the backup-C slot eligibility (and draftability lock logic) must use `canCover(p, 'C')` (secondary-C + Two-Way(C)) — not primary equality; reconcile the comments to Ruling A. Add a test with a pool whose only backup-C is a secondary-C hitter / Two-Way(C) pitcher.

### F4 — SP/RP swing assignment can miss a legal roster — CONFIRMED (plausible)
`SLOT_PLAN` fills 4 `sp` slots (`eligible`=`canStart`, includes SP/RP) BEFORE 4 `rp` slots (`canRelieve`). Greedy-by-value can consume the SP/RP swing arms as starters, then leave pure-SP for the `rp` slots (pure SP can't relieve) → `rp` slots unfillable though a legal assignment exists (pure SP start, SP/RP relieve). The climb only SWAPS existing picks, so skipped slots aren't recovered. Counterexample: 4 pure SP + 4 SP/RP + no RP/CP.
**Fix:** assign the more-constrained slots first, or do a proper SP/RP matching for the swing; add a test with the 4-pure-SP + 4-SP/RP pool.

---

## SHOULD-FIX

### F5 — snipe-test doesn't ban boosted BULLPEN targets — MAJOR
`src/engines/draftabilityRanker.ts` `banSnipeTargets` bans catchers, startable arms, and boosted hitters, but not boosted RP/CP. For bullpen-boosted archetypes (e.g. `nasty-boys`, `the-opener`, `historicalArchetypes.ts:97-109`) a rebuild can re-snipe the same elite bullpen core → overstates resilience vs the ratified snipe-test intent (DECISIONS_LOG snipe-test formula; FABLE_C1_DESIGN §; boosted scarce positions are banned).
**Fix:** extend the ban to boosted bullpen slots for archetypes that boost the bullpen.

---

## CONFIRM (not a hard block — documented, but verify)

### F2 — unknown-role pitcher counted as swing in need math, illegal in legality — documented permissive policy
`rosterNeed.ts:45-66` gives a `primaryPosition:'P'`/`'TWO-WAY'` pitcher `role:undefined`; `pitcherAdditionsNeeded` (`:94`) counts unknown role as a swing arm; but `isLegalRoster` only counts explicit SP/RP/CP. The module header (`:16-19`) documents this as a DELIBERATE permissive policy ("a wrong rejection is worse than a missed guard"), and the counterexample is a *missed* guard (the accepted direction). **Confirm:** does `buildAuctionPlayersWithPositions` ever emit a bare `'P'`/`'TWO-WAY'` primary with undefined role? Mode-1 pitchers are {SP, SP/RP, RP, CP}. If bare 'P' can't occur in the enriched pool, F2 is moot; otherwise align the swing-count with the legality role set.

---

## DISMISSED

### F1 — strand guard not pool/budget aware — NOT a C1 defect
`rosterNeed.ts:13-14, 142-143` explicitly scope the economic completion floor (cheapest players actually left, budget-aware) to **C2B**, not C1. C1's guard is the position/legality forced-filler by design. This is the intended C1/C2B split (matches the FABLE-C2B contract).

---

## NEXT (the loop)
1. Fable fixes F3 + F4 (must), addresses F5, confirms/resolves F2. Same diff, same 12-path scope.
2. Re-run the Codex adversarial pass (C1-AUDIT) on the fixed diff.
3. Opus runs the full gate (build + FULL suite ZERO-NEW-REDS + L-SIM legs, 60g LAST, byte-identical) on the fixed diff.
4. On clean Codex + clean gate → Opus commits C1 (branch-only). Then Fable's C1B (pool extractor) fires.
