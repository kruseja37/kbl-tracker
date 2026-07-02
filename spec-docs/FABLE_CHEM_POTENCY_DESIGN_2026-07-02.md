# FABLE CHEM-POTENCY DESIGN — chemistry tipping premium + personality boundary + captain age tilt

**Author:** Fable 5 · **Date:** 2026-07-02 · **Ticket:** handoff §3 #4 (JK rulings 4-6, DECISIONS_LOG
2026-07-02) · **Status:** DESIGN (build follows in this session; cross-model audit after)
**Ground truth read:** `CHEMISTRY_TRAIT_POTENCY_VALUATION_SPEC.md` (the research spec),
`derivedTraitPotency.ts`, `chemistryFitValue.ts`, `trueValue.ts`, `ivEngine.ts` (pricing
internals), `rosterEngineConstants.ts` (POTENCY_SCALE — already canonical 0.5/1.0/3.0),
auction session shapes, live computeIV callers.

---

## §1. WHAT THE RULING REQUIRES (and what it doesn't)

Ruling 4: team chemistry counts → potency tier (L1/L2/L3) → **marginal player value** — the
L1→L2 / L2→L3 **tipping premium** — everywhere roster-construction **intelligence** lives
(pre-draft board, draft/auction advice, in-season analyzer). Single-math: ONE shared
tier-delta calculation.

What it does NOT require (and this design deliberately preserves):
- **The economy stays at L2.** IV, salary, market prices, archetype balance are frozen at the
  L2 standard (oracle G1-G10; the price≠true-value gap is the INTENDED scout edge —
  `trueValue.ts:6-10`). The premium is an intelligence-layer number, never a price mutation.
- **CPU/shill bidding behavior is untouched.** The C2B market calibration and the C3
  completion sweep are behavioral baselines; injecting chemistry into CPU valuations would
  de-calibrate the price model against actual machine behavior. (v2 candidate, own ticket.)

## §2. THE MECHANIC (from the research spec — all CONFIRMED)

- 5 chemistry families; every trait carries ONE family; potency of a trait = f(team count of
  the TRAIT's family): L1 = 0-2, L2 = 3-6, L3 = 7+ (JK-ratified 3/7).
- Value scale (canonical workbook, already in code): positives ×0.5/×1.0/×3.0; negatives
  inverted ×3.0/×1.0/×0.5 (high chemistry dampens flaws).
- A player's chemistry adds +1 to HIS family's count, boosting every matching-family trait on
  the team — teammates' and (only if same-family) his own. No single player swings L1→L3.
- Therefore player value is roster-contextual, and the marginal value of a +1 is
  **level-up (2→3, 6→7) ≫ buffer (3-6) ≫ floor (~0)** — the draft-timing emergence
  ("the 7th Scholarly player is gold") falls out with no special-casing.

## §3. THE SHARED CALCULATION (the novel math)

### 3.1 The dollar primitive — new additive ivEngine export

`traitPotencyDollarDelta(holder, traitName, fromTier, toTier)` — the exact engine-currency
value of re-tiering one trait on one holder:

```
delta = pricedComponent(scaledDeltas(entry, toTier), no-mult, flat=0, holderRatings, block, …)
      − pricedComponent(scaledDeltas(entry, fromTier), no-mult, flat=0, holderRatings, block, …)
```

- Reuses `scaledDeltas` + `pricedComponent` + the holder's real curve block/ratings — the
  engine's own marginal-curve pricing, so the premium is in the same dollars as IV.
- `flatFee`/`multipliers` are potency-invariant by spec (§2.5/§3.3) — excluded from the
  difference (they cancel; excluding avoids re-round artifacts).
- The SP/RP negative-trait deltaBlock rule is reused verbatim (ivEngine:343-345).
- Signedness: positives price the deltas directly; negatives price their (scaled) negative
  deltas — moving a negative trait L1→L2→L3 yields a POSITIVE delta (the malus shrinks).
  No polarity hand-flipping: the priced deltas carry the sign.
- ADDITIVE EXPORT ONLY. `computeIV`, both layers, and every live caller stay byte-identical —
  the frozen oracle (G1-G10) is untouched by construction. (Known approximation, documented:
  for pitchers this prices tier deltas at raw-layer semantics; the kbl layer's usage-weighted
  trait treatment is not reproduced. Advice-grade fidelity; the oracle pins nothing here.)

### 3.2 The marginal model — new engine `src/engines/chemistryTierValue.ts`

For candidate P joining roster R (counts computed by the existing `countRosterChemistry`,
self-count semantics preserved):

```
tipPremium(P, R) = TeamLift(P, R) + OwnContext(P, R)

TeamLift  = 0 unless count[chem(P)] crosses 2→3 or 6→7 with P's +1.
            On a crossing: Σ over every trait t held by R's EXISTING players with
            family(t) == chem(P):  traitPotencyDollarDelta(holder(t), t, oldTier, newTier)

OwnContext = Σ over P's own traits t:
            traitPotencyDollarDelta(P, t, 'L2', tier(count_after[family(t)]))
            — reprices P's own traits from the L2 assumption baked into his IV to the tier
            the joined roster actually gives them (his own +1 included for his own family;
            other families use R's count as-is).

Partition: the candidate appears ONLY in OwnContext (his own crossing traits price there);
TeamLift covers existing roster players only — nothing double-counts (pinned by test).
```

Plus two informational (non-dollar) outputs for advice copy: `distanceToNextTier` per family
("2 more Scholarly for L3") and `atRiskTier` ("losing a Disciplined drops the team to L1").

- **No buffer fudge-constant in the dollars.** The marginal model prices real crossings and
  real own-trait context only; buffer/progress is expressed as the informational outputs, not
  as an invented fraction. (The existing 0.4 buffer stays confined to the farm-scout
  multiplier until §3.4.)
- **The removal direction** (`tipLoss` — send-down/call-up ripple, spec §6.3) is the same
  function with a −1: implemented and exported (the analyzer will want it), consumed v1 only
  by advice surfaces that already have both rosters in hand.
- Magnitudes are honest: tipping 6→7 on a trait-rich family can exceed the tipper's own IV
  (game-true — spec §4.2 Example B). No cap; budget ceilings already bound what a GM can pay.

### 3.3 Single-math consolidation (the tier-function conflict)

`chemistryFitValue.ts` still runs the off-by-one 4/8 thresholds ("RB-16 sim-tune") that JK
ruled to canonical 3/7 on 2026-06-22 (research spec §2.4/§9.1 — correction pending). This
ticket executes that ruling: `chemistryFitTier` delegates to `derivedPotencyTier` (3/7), and
the fit engine's tier math becomes a re-export of the shared primitive. The ±8% scout-price
multiplier SHAPE stays (it's the farm-fog perception seam, a different axis from the dollar
premium). Blast radius: farm-auction scout price fixtures may shift at counts 3 and 7 —
verified against the existing farm tests; any shifted pin is reported, not silently updated.

`trueValue.ts` already consumes the shared `traitPotencies` (same tiers/factors/counts) — its
IV-fraction envelope (coef 0.02, cap ±12%) is a deliberately-tuned, L-SIM-characterized
surface with dozens of live franchise consumers. It is NOT rebuilt in this ticket (blast
radius = the soul baselines). Convergence note: trueValue prices "P in place," the new model
prices "the margin of adding/removing P" — same primitives, different quantities. If JK later
wants trueValue on exact dollars, that's a C5-adjacent retune with L-SIM re-baselining.

## §4. CONSUMERS WIRED THIS TICKET

| Surface | What it gets | Mechanism (AS BUILT) |
|---|---|---|
| **Auction advice (MLB room)** | "Worth to you" premium + tier-distance/crossing copy inputs — advice path only; the market-price prediction stays chemistry-free | `chemistryAdviceForCandidate(lotPlayer, teamRosterPlayers)` in the new `src/utils/chemistryIntelligence.ts`. `auctionMarketModel.ts` is deliberately UNTOUCHED (byte-stable for the calibration gate); **C4-B renders this** — screen wiring intentionally not done here (C4-B replaces the old advisory against the UX north star; wiring now would be built twice). |
| **Pre-draft board (Draft Setup)** | Pool chemistry supply: per-family counts/tiers/trait supply (informational; no gate changes) | `chemistryProfileForPlayers(poolPlayers)` — same module; C4-B renders. |
| **Farm auction scout** | canonical 3/7 tiers (JK's 2026-06-22 correction executed) | §3.3 delegation, live immediately (the farm page already calls `chemistryFitPriceMultiplier`). |
| **In-season analyzer** | call-up premium (`chemistryAdviceForCandidate`) + send-down ripple (`chemistryRemovalAdvice` — the research spec's unmodeled §6.3 gap, now modeled) | pure functions ready; **wiring deferred until CODEX-ASSTGM-LEGALITY lands** (same-file collision avoidance), then a one-line consumption follow-up. |
| **CPU bidders / shills / market prediction / completion floor / sizing gates / IV / salary / trueValue** | **UNCHANGED** (byte-stable; oracle + sweep + calibration gates re-run as proof) | — |

**Orphan-prevention note:** the advice functions ship consumer-less by PLAN, not accident —
C4-B (auction screen) and the analyzer follow-up are their named consumers in the handoff
sequence, mirroring the established reporter-adapter pattern (pure adapter now, surface later).
The §7 gates + this section are the audit trail for that intent.

## §5. PERSONALITY BOUNDARY + HIDDEN-MODIFIER TIMING (ruling 5) — grounded + AS BUILT

**The grounding overturned the ruling's premise in a good way:** hidden modifiers were
already generated at pool time on BOTH major paths — farm prospects at candidate-build
(`prospectScoutingDraftEngine.buildCandidate`, league-scoped seed) and the MLB pool via the
league-scoped axis regen at every auction init (`useAuctionDraft` → `leaguePoolAxisRegen`,
seed `${leagueId}:${player.id}`, deterministic FNV-1a → Box-Muller, no franchise inputs).
The freeze-time site JK flagged (`franchiseInitializer` backfill, bare `player.id` seed) is
only a SAFETY NET that fills players missing modifiers.

**The move as built:** `lockLeaguePool` now runs the same axis regen before registering —
the pool LOCK is the common chokepoint both draft formats pass through, so generation is
guaranteed at draft-pool time universally:
- Auction leagues: values are BYTE-IDENTICAL to before (same league-scoped seed; the
  auction-init regen becomes an idempotent re-stamp). Zero behavior change.
- Snake leagues: NEW — they now get league-scoped axes at lock (previously bare-id backfill
  values at freeze). Deterministic drift, flagged for the audit; no test pinned those values.
- The freeze backfill stays as the guard for leagues that never pass through a draft
  (JK's §5 open-decision "pool-creation vs league-creation" resolves to POOL-LOCK with the
  backfill guard — no fork needs a ruling; noting it here per the handoff instruction).
- No persisted-shape change (the field already lives on Player in both DBs).

**Privacy boundary (verified, not just asserted):** advice/UI surfaces block the field today
(profile-edit sensitivity list, random-event evidence exclusion, scout-report privacy test
`prospectScoutingDraftEngine.test.ts:1348-1369`, zero src_figma reads). The new chemistry
math reads chemistry + traits + ratings ONLY — `chemistryIntelligence.ts` never touches
personality or hiddenPersonalityModifiers, so ruling 5 holds by construction.

## §6. CAPTAIN AGE TILT (ruling 6) — grounded + AS BUILT

Grounding: selection = `computeTeamCaptains` (franchiseInitializer), loyalty+charisma 1:1,
no floor, tiebreak charisma then id; runs once at freeze; `Player.age` is present on the
input shape; pinned by `franchiseInitializer.test.ts`; canonical spec =
`FRANCHISE_V1_LIVING_SEASON_SPEC.md` (LS-6 family — amended below per the ruling).

As built: score = loyalty + charisma + `captainAgeTilt(age)` with the five-tier band
`CAPTAIN_AGE_TILT_TIERS` = ≤22: −6 · 23-26: −2 · 27-30: 0 · 31-34: +4 · 35+: +6
(monotonic seniority curve; span 12 points vs the 0-200 primary scale — breaks near-ties
toward the veteran, never overrides a clear leadership gap; non-finite age → 0). Tiebreaks
unchanged. Existing pins unaffected (all fixtures age 28 → uniform 0 tilt); three new tests
pin the bands, a near-tie flip, a clear-gap non-flip, and a rookie malus flip.
The (dark) captain morale ROUTER (charisma ×2) and the §24.9 leadership composite are
untouched — the ruling amends selection only.

## §7. GATES (all must hold before handoff to audit)

1. `NODE_ENV= npm run build` exit 0.
2. New unit batteries: tier-delta pricing (incl. SP/RP negative block rule, flat/multiplier
   exclusion, hitter/pitcher parity at L2→L2 = 0), tip-premium crossings (2→3, 6→7, no-cross
   = OwnContext only, removal direction), analyzer adapter purity.
3. **Oracle safety:** `ivEngine.test.ts` G1-G10 byte-green (no re-bless).
4. **Behavioral baselines:** C2B calibration gate re-PASS; C3 sweep S=0..4 re-PASS zero
   shortfalls (proves CPU path untouched); farm-auction tests re-run — 3/7 shifts reported.
5. Full suite: zero new reds vs the characterized set (wpaRuntimeBoundary + the
   franchiseManualSmokeFixture order-flake, solo-verified).
6. Captain tilt + hidden-modifier timing each carry their own pinned tests.
7. **L-SIM: verified ORTHOGONAL, explicitly not run** (the C2B-precedent standard, not a
   silent skip): the L-SIM sandbox hard-seeds `captainPlayerId: mlbPlayers[0]` directly
   (`test-utils/lsim/sandbox.ts:390`) and never calls `initializeFranchise`/
   `computeTeamCaptains` (that seam IS the future freeze-bridge spike); no other touched
   module (`lockLeaguePool`, `chemistryFitValue`, `chemistryTierValue`,
   `chemistryIntelligence`, the ivEngine additive export) appears anywhere in `test-utils/`
   (grep-verified 2026-07-02). Transitive-import safety is covered by the green build +
   full suite. When the freeze-bridge spike lands, the captain age tilt enters the L-SIM
   surface and gets exercised there.
