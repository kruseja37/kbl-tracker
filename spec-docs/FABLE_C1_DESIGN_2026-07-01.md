# FABLE-C1 DESIGN NOTE — roster-construction intelligence (pre-build, 2026-07-01)

> **Author:** Fable 5 (builder). **Status:** design settled while Wave-0 assembly runs; file stays
> UNCOMMITTED until the assembled branch lands (trunk-freeze during the merge). Opus audits the
> eventual diff. Contract: FABLE-C1 in `PROMPT_CONTRACTS.md` + the §7 amendment below.
> **Depends on:** the assembled trunk (draft-ui's `archetypeIdentity.ts` merges in) + JK's ratify of
> the hard/soft legality split (DECISIONS_LOG 2026-07-01, Ruling A expanded — recommended model).

---

## §1. GROUNDED INVENTORY (all read this session, post-`08342e7b`)

- `archetypeBalanceSimulator.ts` — `objective()` = `Σiv − 4×over-budget` (the value-maximizer);
  `makeFitScore()` already derives per-player archetype fit from the shifted-vs-base cap fractions;
  `climb()` hill-climbs slot swaps on `objective`; `buildBestRoster()` climbs from two starts
  (value-first, fit-first) but judges BOTH by `objective` → fit is a seed, never the criterion.
- `auctionStateMachine.ts` — position-blind: `recordBid`/`claimLoneSurvivor` guard on
  `rosterSlotsRemaining <= 0`; `finalizeSoldLot` decrements the scalar. `AuctionPlayer` =
  `{playerId, iv, ivPercentile}`; roster entries = `{playerId, salary}`. **No positions anywhere in
  the session state** (and the session is crash-safe-persisted per pick).
- `leagueBuilderAuctionPipeline.ts` — seeds `rosterSlotsRemaining = 22 − rostered` (`:23,:86`).
- `rosterConstruction.ts` — `RosterSlotPlayer = {isPitcher, position, role?}` (no secondary, no
  traits); `isLegalRoster` counts primary-C only. Ruling A (expanded) requires widening.
- Pool `Player` (`leagueBuilderStorage.ts:248`) — has `primaryPosition` + `secondaryPosition?`
  (full group vocabulary `IF|OF|IF/OF|1B/OF` in the `Position` type). Two-Way trait variants exist
  in the trait engine (`Two Way (IF)/(OF)/(C)`, `traitCandidateBuilder` tests). **Build-time
  verify:** where traits live on the pool/auction player record.
- Draft-ui (merges in Wave 0): `archetypeIdentity.ts` — `archetypeToCapIdentity()` +
  `selectTeamArchetype()` persists `mlbArchetypeKey/capIdentity` (+farm) onto the Team. The bridge
  EXISTS after assembly; C1's job is consumption + 24-verification, not creation.

## §2. DESIGN DECISIONS

**D1 — Objective: constrained-fit, not weighted-blend.** Replace "maximize Σiv" with:
maximize `Σ fitScore(p)` **subject to** (i) `isLegalRoster` (hard), (ii) budget/solvency (hard),
(iii) `Σiv ≥ floor × baselineIV` where `baselineIV` = the value-maximizer's own best build on the
same pool (computed first, one extra climb) and `floor` comes from the POSTURE dial. A weighted
`fit + λ·iv` blend is rejected — wrong λ collapses back to the value-slop; a floor CONSTRAINT
cannot. Climb acceptance rule becomes: swap accepted iff legal ∧ solvent ∧ floor-respecting ∧ fit
strictly improves (with an initial repair phase to reach feasibility). `makeFitScore` is reused
as-is — it already prices boosted/nerfed bands correctly.

**D2 — Posture dial = the floor + reach parameters (§16-tunable defaults):**
Conservative `floor=0.95`, Optimal `0.90`, Aggressive `0.82` (placeholder values, tagged
`§16-tunable`); Aggressive additionally over-weights the boosted bands in fit (×1.25). Include a
plan-DISTINCTNESS assertion (the three postures must not produce identical rosters on the
reference pool) — the V1_PLAN 7b requirement, basic form now.

**D3 — own_need = a pure DERIVED view; nothing new persisted.** A new module
(`src/engines/rosterNeed.ts`) computes, from `(roster playerIds, positionMap)`:
per-position `required − filled` (8 primaries + catcher-depth per Ruling A + 4 SP + 4 relievers +
bench flex), `isFull(team)`, and `wouldStrand(team, player)` — "winning this player leaves more
required slots than open slots." The `positionMap` (playerId → {primary, secondary?, role,
twoWayVariant?}) is built from the POOL at session build/load and injected via the machine's
config — **never persisted**, so the crash-safe saved-session shape is untouched (the C1 STOP-IF
on saved shapes stays un-tripped; old sessions rehydrate by rebuilding the map from the pool).

**D4 — Machine wiring:** `team-full` guards → `need.isFull(team)`; the scalar decrement stays (it
is persisted + harmless) but stops being the *authority*; `recordBid`/`claimLoneSurvivor` gain the
`wouldStrand` rejection (`bid-strands-roster`) — the position-aware version of the forced-filler.
Nomination/CPU paths keep working (they read the scalar only for display).

**D5 — Legality v2 (Ruling A expanded, pending JK "ratify"):** widen `RosterSlotPlayer` with
`secondaryPosition?` + `twoWayVariant?`; add `canCover(p, pos)` with group expansion
(IF→{1B,2B,3B,SS}, OF→{LF,CF,RF}, IF/OF→both, 1B/OF→{1B}∪OF, Two Way (IF)/(OF)/(C) pitchers count
for their group/C). HARD: 22-frame + 8 primaries + catcher-depth-2 (≥2 can-cover-C, ≥1 primary-C)
+ pitcher minimums. SOFT: `depthReport()` — per-position can-cover count, <2 → advisor red warning
(consumed by the advisor/enforcement tickets, built here so there is ONE counting brain).

**D6 — Vocab bridge (rescoped per plan §2.1):** consume draft-ui's `archetypeToCapIdentity` —
auction session build reads the team's persisted `capIdentity` (via `selectTeamArchetype`'s
output) into `shiftLuxuryCaps`; add a 24-coverage test (every locked archetype converts without
throwing and shifts ≥1 cap row); the display catalog stays QUICK-WIN's job.

**D7 — Draftability verdict = RESILIENCE × TAX BAND (JK 2026-07-01 buffer-zone direction;
concrete metric = Fable's proposal, pending JK nod).** Counting raw "solutions" is meaningless
(trivial swaps inflate it); the meaningful buffer is DELETION-RESILIENCE: build the archetype's
best identity-true roster, then BAN the players it used at its scarce/boosted positions (not the
abundant fillers) and rebuild; repeat. `K` = successive successful rebuilds (capped at 3).
Tax dimension per build: NO-TAX (fits under cap) vs TAXED (needs tax, under max) vs FAIL.
Verdict bands (defaults `§16-tunable`): **GREEN** ≥2 no-tax builds; **YELLOW** buildable but
fragile (K<2) or only-with-tax — shown with the specific reason; **LOCKED** cannot complete a
legal roster within max tax even once. The ranker sorts by (band, K, identity-embodiment margin,
tax headroom). This resilience buffer is ALSO the explicit pre-market-model hedge for contention
(two-stage ruling): "still draftable after your favorites get sniped" approximates rivalry until
C3's real completion-probability lands.

**D8 — One-click surfaces + the extractor (C1 delivers the ranker; C1B the extractor):**
- RANKER (in C1): run the D1 builder + D7 verdict for all 24 against a given pool → ranked list
  with GREEN/YELLOW/LOCKED + reasons; picker consumes it as LOCKED-with-reason (JK-ratified).
- FIELDING ROBUSTNESS SWEEP (in C1's report): re-rank with fielding IV scaled ×1.15/×1.30; report
  rank stability (addresses the known IV fielding undervaluation without an SMB4 sim).
- EXTRACTOR (FABLE-C1B, new small ticket after C1): select desired archetypes → extract an
  MLB+FARM pool from a larger source set, BALANCED so every selected archetype lands in a similar
  draftability band. Requires the JK-pre-approved architecture change: farm-prospect generation
  moves to league-builder/extraction time, generated prospects stored HIDDEN (grade-distribution-
  only validation surface). C3 later upgrades ranker+extractor with contention probability.

## §3. TEST PLAN (Fable runs; Opus re-runs + L-SIM)

1. Identity-embodiment: all 24 archetypes — built roster's boosted-stat z-score above pool mean
   (the contract's required extension), before/after numbers reported for 2–3 archetypes.
2. Legality v2 properties: Two-Way(C)-as-backup roster LEGAL; zero-primary-C roster ILLEGAL;
   secondary-C bench backup LEGAL; group-secondary coverage counted; depth report flags <2.
3. own_need: strand-rejection cases (last slots must fill required positions); group secondaries
   satisfy need; full-team rejection parity with the old scalar on position-complete rosters.
4. Posture distinctness (D2). 5. Bridge 24-coverage (D6). 6. Build exit 0 + FULL suite
   ZERO-NEW-REDS vs the characterized baseline.

## §4. RISKS / OPEN

- **JK ratify pending** on the hard/soft legality split (recommended model logged 2026-07-01).
- **Trait location** on pool/auction players — verify at build; if traits aren't on the pool
  record, Two-Way coverage enters via the positionMap adapter with a documented fallback (treat as
  absent → stricter, never looser).
- **CP mojo-timing discrepancy** (code: "CP starting"; JK: "before second-to-last inning") — NOT
  C1 scope; logged for a GameTracker/mojo verification pass.
- The strand-check is the *legality* floor only; the *economic* completion floor (cheapest players
  actually left per position) stays C2B scope — do not build it twice.

## §5. CONTRACT AMENDMENT (fold into FABLE-C1 before dispatch, post-assembly)

Append to the C1 GOAL: *"(d-rescope) the vocabulary bridge = consume + 24-verify the merged
`archetypeIdentity.ts` (`archetypeToCapIdentity`/`selectTeamArchetype`), wiring the auction's cap
shift to the persisted pick — do NOT author a second converter. (e) Legality per Ruling A EXPANDED
(DECISIONS_LOG 2026-07-01): widen `RosterSlotPlayer` (secondary + two-way), catcher-depth-2 hard
rule counting Two Way (C), group-secondary coverage expansion, and the soft `depthReport` tier.
own_need must be a derived view over an injected position map — no saved-shape change."*

---

## §6. AS-BUILT ADDENDUM (same day — for the Codex adversarial review + the Opus gate)

Built exactly to §2 with two DOCUMENTED deviations and one factory lesson:

1. **D3 deviation — position info rides ON the session, not through an injected context.**
   `AuctionPlayer` gains an OPTIONAL `pos?: RosterSlotPlayer`, populated by the new
   `buildAuctionPlayersWithPositions()` (pipeline) from stored Player records at init. Rationale:
   the per-call injected-map design required editing both src_figma hooks' every transition call
   (outside the contract file surface); the optional field keeps the guard's authority INSIDE the
   machine, needs a 1-line hook change, and stays additive — pre-C1 saved sessions lack the field
   and fall back to scalar behavior (no migration, no version bump; the STOP-IF stays honored).
   The farm auction is deliberately NOT enriched (10-man farm legality ≠ LEGAL_ROSTER-22).
2. **Coverage-sharing correction in the minimal-additions math** (self-caught): the extra
   C-coverer must SHARE a body with any other required addition (a floor hitter with secondary-C /
   a required Two Way (C) arm) — a dedicated coverage body is counted only beyond every shareable
   addition. Without this the guard over-strands (false bid rejections — the forbidden direction).
3. **Synthetic-pool lesson (ranker tests):** stats must be DECORRELATED (profile-shaped players)
   or nerf-heavy fit scores invert on stars and any-22-players bust flat-price pools. The oracle
   pool needs no such care (real shapes). Ranker mechanics are tested on shaped synthetics;
   identity embodiment for ALL 24 is gated on the real oracle pool.

**Result highlights (oracle pool, standard tier, optimal posture):** mean boostZ gain
(value-objective → identity-objective) = **+0.40** across the 24, keeping 91–99% of the value-max
baseline IV. Exemplars: HDH Royals −0.44→+1.00 · Cannon Corps +0.10→+1.06 · Whiteyball +0.13→+0.91
· Big Red Machine −0.20→+0.52. All 24: legal ∧ solvent ∧ floor-met ∧ boostZ>0. Carried assembly red
(`archetypeIdentity.test`) reconciled → 7/7 green solo.

**C2A note for the Codex contract:** `scripts/auctionTuningSim.test.ts` exists but is UNTRACKED on
trunk (never committed) — the C2A builder must not assume it's in git history.

---

## §7. FIX ROUND (same day — response to `C1_AUDIT_VERDICT_2026-07-01.md`, BLOCK verdict)

All four findings addressed; the frozen value-max machinery (`SLOT_PLAN`/`eligible`/`greedyStart`/
`climb`/`buildBestRoster`) stays byte-stable — the identity path got its OWN Ruling-A machinery:

- **F3 (must):** new `IDENTITY_SLOT_PLAN` + `identityEligible` — the backup-C slot accepts any
  covering HITTER via `canCover` (primary- or secondary-C), falling back to a Two Way (C) arm under
  the 9-pitcher ceiling (the 13/9 shape); swing slot goes LAST with a pitcher-count context so the
  ceiling can't be busted at start; the climb's violation term now INCLUDES `isLegalRoster` (illegal
  swaps never accepted from a legal state). Stale "2nd primary-C" comments reconciled. The value
  baseline re-seeds into the identity plan via an index remap.
- **F3 follow-through (self-caught during fix verification):** the final two-candidate chooser
  treated feasibility as solvent+floor only — a SHORTER/illegal candidate with higher raw fit could
  out-rank the legal 22 build. Feasible now = legal-22 ∧ solvent ∧ floor.
- **F4 (must):** identity greedy assigns arms PURE-FIRST (sp slots spend pure SPs before swings;
  rp slots spend pure RP/CP before swings) — equivalent to the optimal swing split, so a legal
  staff is always found when one exists (the 4-pure-SP + 4-SP/RP counterexample now builds).
- **F5 (should):** `banSnipeTargets` bans the used RELIEF corps when the archetype boosts any
  PEN_ stat, and C-coverage banning now uses `canCover` (secondary-C + Two Way (C) included).
- **F2 (confirm → fixed):** CONFIRMED reachable — `franchisePlayerProfileEdit.ts:18` allows
  'TWO-WAY' as an assignable primary. Aligned: unknown-role arms count toward pitcher HEADCOUNT
  only (neither staff minimum), matching `isLegalRoster` exactly; policy header updated.
- **New tests:** F3a (secondary-C-only backup → legal + not LOCKED), F3b (Two Way (C)-only backup →
  legal 13/9), F4 (pure+swing-only staff), F5 (pen-boost archetype loses its pen on the rebuild;
  hitter archetype doesn't), F2 (bare-'P' arms credit no staff minimum; still hit the ceiling).
- **Residual round (post-fix verification):** the remaining synthetic failures were knife-edge
  identity-z artifacts (Murderers' Row at z=−0.03 on a pool with no POW+CON profile; the Opener at
  z=0.000 exactly when a 5-arm pool pen IS the roster pen). Engine re-proven on the ORACLE pool
  post-fix: all 24 legal ∧ solvent ∧ floor ∧ z>0, mean gain +0.31 (vs +0.40 pre-fix — the honest
  cost of refusing illegal-but-fitter candidates). Resolution: the identity-true floor became a
  §16-tunable dial (`DRAFTABILITY_TUNING.minEmbodimentZ`, default 0 = the strict product gate,
  oracle-proven); verdict-MECHANICS tests inject a lower floor to decouple resilience/tax machinery
  from small-pool z noise; a 'masher' profile joined the synthetic factory.
- **ROUND 3 (R2 verdict response):** **R2-2 FIXED** — `selectForcedFillerTeam` now applies
  `bidWouldStrand` (the guard's missing third call site); when every otherwise-eligible team would
  strand, the existing no-taker fallback (permanent pass-out) fires. Regression pair in
  `rosterNeed.test.ts` (strander passes out, roster unchanged; coverage-carrier still force-sells).
  **R2-1 DEFERRED by JK ruling** (DECISIONS_LOG 2026-07-01): known v1 limitation — the builder
  reserves a separate backup-C body and so under-credits a Two Way (C) arm's double duty on
  exactly-enough-arms pools (false LOCKED, advisory-only; the LAW counts him correctly for both).
  Revisit if C3's extractor pools trip it.
- **JK Ruling A clarification 2 folded in (2026-07-01):** pitcher primaries are EXACTLY
  {SP, SP/RP, RP, CP}; two-way is a TRAIT on a pitcher-first player (counts toward its staff minimum
  via primary role AND catcher depth via Two Way (C) — which the well-formed path already did). The
  F2 handling is now framed as DEFENSIVE-only for invalid data; purging 'P'/'TWO-WAY'/'DH' from
  assignable primaries (`franchisePlayerProfileEdit.ts:14-16`) is a Wave-1 cleanup ticket.

---

## §8. FABLE-C1B AS-BUILT (same day — the pool extractor; contract in PROMPT_CONTRACTS.md)

`src/engines/draftPoolExtractor.ts` + its test suite. Deterministic orchestration over C1's
committed machinery (single-math rule: seeds = `buildIdentityRoster`, verdicts =
`rankArchetypeDraftability`, fill ranking = the exported `archetypeFitScorer`): structural floors
(league-scaled per-position/coverage/arms minimums, source shortfalls NAMED) → per-archetype
identity seeds (eviction-protected) → round-robin balanced fill → snipe-test verify → repair loop
(feed the worst archetype its missing pieces; idempotent cap eviction of unclaimed filler — hoisted
after a probe showed seeds alone can exceed the target and an early break skipped the in-loop
eviction). MLB structure wired from LEGAL_ROSTER; the FARM structure is a deliberate config seam
(farm legality ungrounded; the JK-pre-approved farm-gen relocation is the companion plumbing
ticket). `EXTRACTOR_TUNING` = §16-tunable placeholder (oversupply 1.2, resilience spread 1,
repair rounds 6, repair batch 6).

**Oracle probe (8 teams, 4 disparate identities, standard tier):** source 440 → pool 214/212
(2 over, named: claimed by builds/floors); verdicts all YELLOW — none LOCKED, resilience 3/3/2/1;
**every build needs the luxury tax at 1.2× sizing** — a real market-economics signal (tight pools
price identity into the tax), surfaced plainly per the tax-band ruling and squarely C3-sizing
subject matter. balanced=false under the default resilience-spread tolerance (spread 2) —
faithfully reported, not forced.

### §8b. C1B FIX ROUND (response to the C1B BLOCK verdict, same day)

- **C1B-2 FIXED (single-math):** `archetypeFitScorer` now takes the POSTURE and returns the
  builder's exact posture-weighted fit (`weightedCaps` × `boostFitWeight`); the extractor threads
  its posture into the fill/eviction scorers. One scoring rule for seeds, fill, and eviction.
- **C1B-1 FIXED (total bodies):** `PoolStructure` gains `minPitchers`/`minPositionPlayers`;
  `structuralFloor` tops up TOTAL pitcher and position-player BODIES (capability floors dedup —
  one SP/RP body satisfied both arm floors). Shortfalls named ("short on pitcher bodies: 20 for 64
  needed league-wide"). Regression: an all-swing 20-arm source pulls every body + names the gap.
- **C1B-3 FIXED (farm guard, grounded by the NEW JK farm ruling):** non-MLB structures now FAIL
  LOUDLY, the error citing the ruled farm semantics (fair supply for 10 picks/team, ~50%
  archetype-fit targeting §16-tunable, NO roster/balance guarantees — DECISIONS_LOG 2026-07-01).
  Farm wiring lands with the farm-generation relocation ticket.
- **C1B-4 FIXED (determinism):** the extractor canonicalizes source order (id sort) at entry —
  extraction is a function of the player SET (reversed-input regression asserts identical output).
- **DESIGN REFINEMENT the fixes exposed (for the R2 re-review):** embodiment-z was POOL-relative,
  so the new feasibility body floors mechanically raised the identity bar (a stuffed candidate pool
  → higher cohort mean → false LOCKED for Bomba on the oracle at both 1.2× and 1.5×). Extraction
  verdicts now judge identity against the FIXED SOURCE universe: additive optional
  `embodimentReference` threaded `BuildIdentityOptions` → `RankDraftabilityOptions` → the extractor
  passes its canonical source. Default behavior (reference = the build pool) is unchanged for the
  original C1 surfaces — the oracle all-24 gate re-proven green.
- **Sizing truth surfaced (C3 seed):** with honest body floors, 8 teams' feasibility floor ≈ 202
  bodies — at 1.2× (target 212) the pool is feasibility-DOMINATED (near-zero identity discretion);
  identity-roomy extraction on the 440-source needed 1.5×+. The tight default dial now NAMES its
  squeeze (test-asserted) instead of hiding it. This + the all-taxed finding = C3's opening inputs.

### §8c. C1B ROUND 3 (response to C1B-R2, same day)

- **C1B-R2-1 FIXED:** the primary-catcher shortfall note escaped the `else`-branch C could never
  reach — `structuralFloor`'s C branch now names PRIMARY-C body shortfalls separately from coverage
  ("short on primary catchers: 6 for 8 needed (one starter per team)"), per Ruling A's primary-C
  starter requirement. Regression: 6 primary + 10 secondary-C coverers → primary note fires,
  coverage note correctly silent.
- **C1B-R2-2 FIXED:** the non-MLB guard is now STRUCTURAL identity (every field equals
  MLB_POOL_STRUCTURE), not a slot-count test — a 22-slot non-MLB shape fails loudly; a field-equal
  clone passes (value identity). Regression pair added.
