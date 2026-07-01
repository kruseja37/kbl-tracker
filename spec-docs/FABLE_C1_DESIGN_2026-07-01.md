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
