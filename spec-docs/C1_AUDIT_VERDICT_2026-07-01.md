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

---

# ROUND 2 — re-audit of Fable's fix round (Codex C1-AUDIT-R2 + Opus verification)

**VERDICT: BLOCK (again) — round-1 fixes all CONFIRMED, but 2 NEW CRITICAL edge cases the fixes exposed.** As-of the uncommitted fix diff (trunk `3f3edbdd`). Opus gate still DEFERRED until Codex is clean.

**Round-1 fixes CONFIRMED (Codex + Opus):** F3 (identity path honors `canCover` for backup-C; starting-eight stays primary-only), F4 (pure-first arm split builds the 4-SP+4-SP/RP legal staff), F5 (snipe-test bans the used relief corps for PEN_-boosted archetypes; non-bullpen unaffected), F2 (unknown-primary handling no longer credits invalid 'P'/'TWO-WAY' arms). Value-max machinery behavior-stable (comments/types changed, bodies stable).

## R2-2 — MUST-FIX (CRITICAL): the position strand guard has a hole on the forced no-bid filler path
`bidWouldStrand`/`wouldStrandRoster` is applied to `recordBid` (`auctionStateMachine.ts:335`) and `claimLoneSurvivor` (`:407`), but NOT to the forced no-bid filler: `selectForcedFillerTeam` (`:539-553`) filters eligible teams by `rosterSlotsRemaining > 0` + `auctionMaxBid >= openingAsk` (solvency) only. So a forced sale can hand a team a wrong-position player and complete an ILLEGAL 22-roster in the LIVE auction (Codex counterexample: team at 21/22, one open slot, only one C-coverer, current lot a non-C hitter, all pass). The `:528-530` comment shows the COUNT-strand is handled but not the POSITION-strand.
**Fix:** add the strand guard to `selectForcedFillerTeam`'s eligible filter (prefer a non-stranding team); if EVERY eligible team would strand, leave the lot unsold / flag (the fully-stranded case is a C3 pool-sizing concern, not a force-an-illegal-roster moment). Add a regression test.

## R2-1 — CONFIRMED (CRITICAL per Codex; Opus severity: narrow/advisory): identity builder can't build the Two-Way(C) double-duty shape
`IDENTITY_SLOT_PLAN` (`archetypeBalanceSimulator.ts:492-499`) has a dedicated `backupC` slot AND 4 separate `rp` slots — DISJOINT bodies. `identityEligible` (`:526-531`) lets a Two-Way(C) pitcher fill `backupC`, consuming it, so it can't ALSO fill an `rp` slot. But `isLegalRoster` lets ONE Two-Way(C) satisfy BOTH catcher-depth AND the reliever count simultaneously (14h/8p shape: 4 SP + 3 RP + 1 Two-Way(C) RP that double-covers). So `buildIdentityRoster` returns 21/non-legal and `rankArchettypeDraftability` can mark such an archetype LOCKED though a legal roster exists.
**Opus severity note:** impact is the ADVISORY draftability/embodiment surface (a false LOCKED), NOT an illegal live roster; and it needs a specific pool (a Two-Way(C) needed for double-duty). **JK SCOPE CALL:** fix in round 3 (let a Two-Way(C) satisfy `backupC` AND count toward a reliever slot), OR accept as a documented v1 limitation (advisory-only, narrow) and revisit post-v1.

## PROCESS NOTE
This is the 2nd fix round. R2-2 is a clear correctness must-fix (illegal live roster). R2-1 is a narrow advisory edge — surfaced to JK to avoid an open-ended refinement loop on ever-narrower cases.

## NEXT
1. JK rules R2-1 disposition (fix vs document).
2. Fable round 3: fix R2-2 (+ R2-1 if JK says fix). Same 12-path surface.
3. Codex C1-AUDIT-R3 → Opus full gate (build + suite + L-SIM 60g LAST) → commit → C1B fires.

---

# FABLE-C1B — AUDIT VERDICT (Codex C1B-AUDIT + Opus verification)

**VERDICT: BLOCK — 2 must-fix + 1 fix-or-guard + 1 contain.** As-of the uncommitted C1B diff (trunk `c3259686`). `archetypeBalanceSimulator` confirmed structurally additive (buildBestRoster/buildIdentityRoster/frozen machinery untouched). L-SIM N/A (draftPoolExtractor has no live consumer; not in the season path). Opus build/suite gate deferred until Codex-clean.

## C1B-2 — MUST-FIX (single-math violation, the core contract): the exported scorer ≠ the builder's scorer
`archetypeFitScorer` (`archetypeBalanceSimulator.ts:741-746`) returns `makeFitScore(archetypeCaps(archetype, tier), tier)`, but `buildIdentityRoster` maximizes `makeFitScore(weightedCaps(caps, tier, params.boostFitWeight), tier)` (`:679`). The extractor builds `fitScorers` WITHOUT posture (`draftPoolExtractor.ts:193`) and uses them for round-robin fill/eviction while the seeds use `buildIdentityRoster(..., { posture })`. For any non-default posture (aggressive `boostFitWeight`=1.25) the fill ranks players DIFFERENTLY than the builder it claims to reuse — the docstring's "the SAME fit math the identity climb maximizes" is false. **Fix:** make the exported scorer take the posture/`boostFitWeight` (return `makeFitScore(weightedCaps(...), tier)`) and thread `posture` into `fitScorers`, OR have the extractor obtain the builder's exact scorer — so fill and seeds share ONE scoring rule.

## C1B-1 — MUST-FIX (or explicitly scope to C3): structural floor undercounts total roster bodies
`structuralFloor` (`draftPoolExtractor.ts:122-168`) reserves per-position primaries + C-coverage + startable arms (`:159`) + relievable arms (`:160`) — all into one dedup `Map`. It never reserves TOTAL pitcher bodies (teams × 8-9) or TOTAL position-player bodies (teams × 13-14). Because an SP/RP satisfies both `canStart` and `canRelieve`, a source of ~39 SP/RP arms fills BOTH arm floors for 8 teams at 1.2× as ~39 bodies, when the league needs ≥64 pitcher bodies to field 8 legal staffs. The ranker only proves one archetype builds one roster, so an infeasible-for-the-league pool passes. **Fix:** add total-body floors (pitchers = teams × `minPitchers` × oversupply; position players = teams × `minPositionPlayers` × oversupply) to the structural reservation. If Fable/JK judge league-feasibility to be C3's job, then EXPLICITLY document that C1B does NOT guarantee it and C3 owns it (don't leave it silently under-reserved).

## C1B-3 — FIX-OR-GUARD (MAJOR): the farm seam is not clean
The structural floor loops MLB `LEGAL_ROSTER.fieldPositions` (`:132`) and final verification is hardwired to `rankArchetypeDraftability` (`:258`, MLB legality). A future caller passing a farm `PoolStructure` still gets MLB field-position floors + MLB roster verification — a MISLEADING seam, not a clean placeholder. Farm is a JK-pre-approved companion ticket + not wired yet (latent). **Fix:** drive the floor/verification off the passed `structure` (not hardcoded MLB), OR make the farm path fail loudly / carry an explicit "MLB-only until the farm-legality ticket" guard so a farm caller can't silently get MLB rules.

## C1B-4 — CONTAIN (MEDIUM): determinism is input-order-dependent
C1B passes raw `source` into `buildIdentityRoster` (`:204`); C1's equal-score greedy keeps input order (`archetypeBalanceSimulator.ts:231`) and shortlist sorts lack id tie-breaks (`:573`). So C1B repeats on identical-order input (the oracle test), but the SAME player SET in a different upstream order can yield different seed claims → different cap-protected pool membership. **Fix (contain in C1B):** sort `source` by a stable id key before seeding/fill, so extraction is order-independent (cheapest fix; keeps it out of the frozen C1 greedy). (Or add id tie-breaks in C1 — larger blast radius.)

## NEXT
Fable round: C1B-2 + C1B-1 (must); C1B-3 (fix-or-guard); C1B-4 (contain). Same C1B surface. → Codex C1B-AUDIT-R2 → Opus gate (build + FULL suite; L-SIM N/A) → commit → then C2A/C2B chain.
