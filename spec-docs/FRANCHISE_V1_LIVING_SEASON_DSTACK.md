# FRANCHISE V1 — LIVING-SEASON (PHASE-2) BUILD SEQUENCE — "THE L-STACK"

**Status:** PROPOSED — pending JK ratification. Structure + couplings drafted by Captain (Opus 4.8) from
`FRANCHISE_V1_LIVING_SEASON_SPEC.md` §5–§24 + the four §18 certifications, then hardened by a 12-agent
decorrelated verification workflow (`wf_b5734e06-e2c`: 7 grounding code-readers + 5 adversarial ordering
critics). All five forks (§F) **RULED by JK 2026-06-16** (LSD-1..5 in `DECISIONS_LOG.md`, folded into the tickets
below). Remaining ratification gates: JK explicit sign-off on the structure + D0 ratification (still PROPOSED).
**Created:** 2026-06-16
**Branch:** codex/franchise-v1-next
**Naming note:** "L-stack" (Living-season), tickets L1–L14 + L-SIM + an economy track, deliberately distinct
from the Phase-1 D-stack (D1–D13 in `FRANCHISE_PLAYABLE_V1_DEFINITION.md`) and the LS-N decision-log ids.
Final naming is JK's call.

> **⚠️ TREE-RECONCILE (ruling pass 2026-06-19) — this DSTACK predates the L1–L10 build.** Tickets **L1–L10 are
> BUILT** (build-dark, committed on `codex/franchise-v1-next`); in particular **fame (L6 / `fameModel.ts` +
> `franchiseFameCompute.ts`)** and **awards (D9 / `franchiseAwardsEngine.ts`, live)** EXIST — treat any "build X"
> wording below for them as **reconcile-to-tree, do NOT rebuild** (readiness-audit cross-cutting #1). **L11–L14 are
> RULED** (ruling pass, JK 2026-06-19 — see `DECISIONS_LOG.md` + `L11_L14_OPEN_QUESTIONS.md`) and pending build; only
> sim magnitudes remain deferred. The separate `kbl-relationships` DB named below is **RETIRED** (L13 reuses
> `rivalryScores` in the shared `kbl-tracker` DB per SEA-3 / L13-Q12).

> **Relationship to Phase-1.** Phase-1 = the D-stack (D1–D13), the value-spine-LIVE + real-awards cut line,
> ships FIRST. Phase-2 = this L-stack, the in-season "soul" layer, layers on top. Per F-141 the D-stack still
> ships first; the rule (§E) is **BUILD Phase-2 foundations dark in parallel with the late D-stack, ACTIVATE
> them strictly after D13** — the §5 "no phantom morale" invariant + the D12 smoke gate forbid any live
> morale/relationship consumer riding alongside D7.
>
> **The L-stack IS part of v1 (LSD-6, JK 2026-06-16).** v1 = the D-stack + this L-stack + the L-SIM gate, one
> release. D0's "Playable-V1" (D13) is an INTERNAL Phase-1 checkpoint, not the v1 release; the v1 exit playtest is
> of the full living season. (The soul layer is v1-Phase-2, not v1.1; only the offseason + the LSD cuts are post-v1.)

---

## A. WHAT THE VERIFICATION WORKFLOW CHANGED (vs the Captain's first pass)

Every item below is grounded in a `file:line` a sub-agent read; the decision-critical ones were
independently re-derived by adversarial verifiers.

| # | Catch | Severity | Effect on the stack |
|---|---|---|---|
| 1 | **MOY is a Phase-1 D9 ticket, NOT a Phase-2 L-ticket.** `FRANCHISE_PLAYABLE_V1_DEFINITION.md:90` lists "Mgr of Year" as a D9 award; the MOY ruling says it sequences "POST-D6/D8 **inside D9**"; MOY-4 bars manager fame → there is **no** Phase-2 MOY fame layer to justify an L-ticket. | BLOCKER | **MOY removed from L12c.** It stays in Phase-1 D9; the §18 MOY read (MOY-1..7) just *hardens the D9 manager-award contract*. See §D. |
| 2 | **The Team Captain has no assignment step in EITHER stack.** §4/LS-6 require it set at Mode-1 league finalization; `franchiseInitializer.ts:335-433` has zero Captain assignment; `franchiseDesignationEligibility.ts:151-157` hard-blocks CAPTAIN. | BLOCKER | **New ticket L1.5** (Mode-1 handoff: assign each team's Captain) added as a prerequisite of L7. |
| 3 | **Hidden modifiers are generated but mis-named + un-persisted.** `prospectScoutingDraftEngine.ts:542-547` emits leadership/volatility/adaptability/pressure (NOT loyalty/ambition/resilience/charisma); they're absent from the Player schema + not on the franchise instance. | HIGH | **L1 is a real build** for §7 (rename/remap + schema + persist), thin connect for §6 (visible personalities ARE populated). |
| 4 | **L4 (reporter) was over-sequenced behind L3.** The publish-bus base subscribes to game-end, which is live today (`useGameState.ts:11177`) — it needs NO morale matrix. | HIGH | **Split L4 → L4a** (foundation, `depends:—`, hoisted to Tier 0 per SEA-1) **+ L4b** (matrix-sourced season takes, `depends:L3`). |
| 5 | **L9a enrichment capture has no named GameTracker owner + is the longest-lead data dependency.** `advanceCount('ball')` has zero callers; pitch-zone/injury fields don't exist (`eventLog.ts:410-437`). "Typed-but-unwritten = lost." | HIGH | **L9a hoisted to Tier 0**, scoped to own explicit GameTracker.tsx/useGameState capture edits each verified to PERSIST. Starts at D0-ratify so L9b + L-SIM get a season of sample. |
| 6 | **DSF-1 (unified salary scale) is NOT orthogonal** — it re-prices the same `computeIV` curve-block the §3 frozen draft-IV baseline + D4 salary + D6 trusted-value all read (`salaryCalculator.ts:380, :33-36`; `franchiseTrueValuePreview.ts:145-146`). | HIGH | **L-ECON1 re-labeled "coupled to the value/IV spine"** and sequenced **before the v1 franchise's draft/salary freeze** (or scoped to new-league construction only). DSF-2/DSF-3 stay genuinely orthogonal. |
| 7 | **C1 "no-rework hybrid" is unverified without 4 explicit D9 seams**, and is FORCED (fame is a Phase-1 hard exclusion, `:38`) — not a choice. | HIGH | **C1 reframed** as resolved-by-constraint + a **D9 fame-ready seam checklist** to ratify now (§F-1). |
| 8 | **The D2 backup parity-guard only covers the shared `kbl-tracker` DB**; Phase-2 stores land in separate DBs (`kbl-franchise-morale`, `kbl-relationships`, …) the guard never inspects; `syncConfig.ts` + `franchiseSaveSlotManifest.ts` already diverge; the whole export/restore feature is orphaned (zero non-test callers) and a stale-pin restore DESTROYS newer stores. | BLOCKER (persistence) | **C4 escalated**: re-scope the guard to ALL DBs, per-ticket backup DoD, + a **prerequisite hardening ticket** (wire export/restore to a real UI + fail-closed on version mismatch). |
| 9 | **Floating True Value IS built (live row), but overwrites a single cumulative row — no trough history** (`franchiseTrueValueStorage.ts`). | MEDIUM | C5 confirmed: Fan Favorite/Albatross work off the live row; **KK + Comeback need a NEW TV-snapshot store captured from game 1** (start-early, or season-1 Comeback data is lost forever). |
| 10 | **~8 sub-feature scope leaks** (FA-gravity, flashpoint-decay accumulator, Platinum Glove + WS MVP, Gold Glove defensive-fame channel, stadium dual-path, Cornerstone single-season, budget pressure, reporter-intensity tooth). | MIXED | Owners assigned below; the ones needing a product decision are §F forks. |

**Positive controls (the audit confirmed sound):** every major §5–§24 system + every ruling FAMILY maps to a
clean owner; no true circular dependency; no Phase-1 ticket is reverse-blocked by a Phase-2 system (the
"Phase-1 first" premise holds); L-SIM is correctly a growing parallel track + final gate (the simulator
scaffold genuinely exists — `test-utils/seasonSimulator162.test.ts` + `syntheticGameFactory.ts`); the
named high-risk mechanics (charged matchups §24.7, the six edge types, the TV-award family, All-Star "no
game played", the rebrand reset) are all owned.

---

## B. THE L-STACK (dependency-ordered, audit-hardened)

Routing per ticket: Codex 5.5 | very-high (state/persistence/matrix) or high (pure engine) → Opus 4.8 audit
(auditor ≠ builder) → JK browser sign-off (batched). Every store-creating ticket carries the §C-4 backup DoD.

### TIER 0 — Build-dark foundations (start at D0-ratify, parallel to the late D-stack; ACTIVATE after D13)

| # | Ticket | §refs | Class | Depends |
|---|---|---|---|---|
| **L1** | Personality & hidden-modifier substrate. §6 visible 7 = thin connect/confirm (already populated). §7 hidden 4 = **BUILD**: rename/remap the mis-generated `leadership/volatility/adaptability/pressure` → `loyalty/ambition/resilience/charisma`, add to the Player schema, persist per franchise instance. | §6,§7 / LS-10 | BUILD | — |
| **L1.5** | **Captain initial assignment at Mode-1 league finalization** (NEW — closes the BLOCKER gap). Write each team's Captain (highest Loyalty+Charisma, Charisma≥70) into the franchise instance before the season. A Mode-1/handoff ticket. | §4 / LS-6 | BUILD (small) | L1 |
| **L2** | Franchise-instance mutable layer + two-tier confirmation infra (greenfield). Mutable overlay over frozen base ratings (permanent persisted + temporary **absolute-trigger** auto-expiry re-evaluated on load), console+DB confirmation, and the read-path that merges overlays onto base ratings for value/designation/morale. Oracle stays locked. | §11 / LS-17 | BUILD | — |
| **L4a** | **Reporter base-connect + publish-bus foundation** (split out, hoisted per SEA-1). franchiseId-keyed assignment + `postGameColumns` on launch + `BeatReporterNews`→live `GameStory`; **+** `SeasonNewsItem` record (resolve SEA-3 here) + sim-tunable season-emission-config (SEA-2) + non-game `generateSeasonNewsTake` + memory writer/regen scheduler + hub season feed. **+ D-R5 hardening** (Claude-column spend rail + offline skip). Game-end is the live first subscriber → **no L3 dep.** | REP-1..4, SEA-1..5 | BUILD | — |
| **L9a** | **Traits enrichment capture surface** (hoisted — longest data-accrual lead). Owns explicit GameTracker.tsx/useGameState edits each **verified to PERSIST**: ball-strike count (wire `advanceCount`, 0 callers today), pitch-zone capture, handedness join at event-write (TS-4), OF extra-base credit, injury accumulator, pitch-type. | §9 / TS-1,4,11 | BUILD | — |
| **L-ECON1** | Unified relative-to-pool salary scale (DSF-1). **COUPLED to the value/IV spine** (not orthogonal): connect `TIER_SHIFTS` into the pool-IV feed; `(tier, pickValueChart, draftSlot)→price`; replace the absolute 0.50× rookie factor + flat farm table. **Must land before the v1 franchise's draft/salary freeze** (ahead of D4/D6) or be scoped to new-league construction only. | §18.3 / DSF-1 | BUILD | — |

### TIER 1 — The morale spine + fan teeth + fame (activate after D13)

| # | Ticket | §refs | Class | Depends |
|---|---|---|---|---|
| **L3** | Master Morale Matrix + morale ledgers. ONE deterministic event×personality×4-modifier×player/fan-morale lookup; auto/logged morale (NO confirm — reverses current build); player+fan morale ledgers + history log; pluggable **default-neutral** event inputs (fame/designation/race/relationship taps fill in later). **Subscribes to the D7 `DesignationEvent` stream** (does not re-derive designations). | §5,§6 / LS-8,9 | BUILD | L1 |
| **L4b** | Matrix-sourced season takes — the reporter narrates L3 matrix events; each later system adds its event tap. | SEA-1 / §M | BUILD | L3, L4a |
| **L5** | Fan morale teeth. Connect the built `fanMoraleEngine` + BUILD the teeth. **Owns the §8 dampener PRIMITIVE** (L8 consumes it). **Owns the flashpoint-decay accumulator** (new store; inputs = L7 Albatross + L10/L13 trade-demander). Reporter-intensity tooth → wire fan-morale into the post-game column prompt (with L4). **In-season trade-request generation** (loyalty/morale-scaled destabilization) only — FA-attraction DEFERRED to v1.1 (LSD-2); budget pressure CUT (LSD-4). | §8,§13 / LS-11,19 | BUILD | L1, L3 |
| **L6** | Fame system. Collapse 3 conflicting ladders → the single §20.7 nine-tier; build Heat (recency) + Reach (ratchet); wire the 4 layers (WPA spine, WAR floor, retained `FAME_VALUES` catalog, status layer); Elimination→franchise scope. **Owns a fame-by-attribution-channel breakdown** (defensive-fame sub-aggregate for Gold Glove §23.2 + role-player fame for the bench award). | §20 / FAME-1..14 | BUILD | WPA/WAR (built) |

### TIER 2 — Designations completion + development

| # | Ticket | §refs | Class | Depends |
|---|---|---|---|---|
| **L7** | Designations Phase-2 completion. **Fan Favorite** (D6 value-half **+** L5 morale-half — double dependency), **Captain** (consumes L1.5 + router effects: Charisma×2 to teammates + amplified swings on his performance), **Fan Hopeful** (call-up timed cushion: fixed window/lift/cushion/expiry). **Cornerstone CUT from v1** (LSD-3 — single-season; revisit at the offseason bridge). Designation→fame nudges + →fan-morale channels (§20.6 B/C). | §4 / LS-5,6,7 | BUILD | D6, D7, L1, L1.5, L3, L5, L6 |
| **L8** | Ratings checkpoints. every-20%-of-games league sweep; **CONSUMES the L5 §8 dampener** (does not re-build it) × personality × Ambition/Resilience; per-team console change log via the L2 two-tier confirm. Team performance → ratings only (never traits). | §8,§9 / LS-12 | BUILD | L2, L3, L5, L1 |
| **L9b** | Traits-from-reality engine. On `traitInteractionMatrix`: log-reconstructed context + peer-relative strength scorer (rides Adaptive Standards) + grant/write-back (2-trait cap, hysteresis, no offsetting pair, role-eligibility VI.2, acquisition = reality-percentile×personality×morale, min-sample valve). **Explicitly incl.**: TS-10 Big/Little Hack non-log path; TS-13 Two-Way gateway (assign random IF/OF/C on grant); Crossed-Up passed-ball attributed to the PITCHER; Wild Thrower/Pinch Perfect position-only. Cut Sign Stealer. | §9 / TS-1..13 | BUILD | L9a, L2, L3, L1 |
| **L10** | Random events. New engine — **do NOT extend `franchiseRandomEventGenerator.ts`** (a different fan-morale-prompt system). Morale/personality-weighted, reporter-surfaced, light-chaos; cadence in games; Juiced/Standard/Nerfed rate; league sweep. Owns the **independent stadium-change event** (fan-morale-suppressed rate) = **pick from the existing SMB stadium pool** (LSD-5, pull the full stadium record). Wildcard/cosmetic/role/team layer on top of L8/L9 earned changes. | §10 / LS-16 | BUILD | L3, L2, L4, L8, L9 |

### TIER 3 — Managers / races-awards / relationships / rebrand

| # | Ticket | §refs | Class | Depends |
|---|---|---|---|---|
| **L11** | Manager firings. Fan-relief bump + (performance×personality) player ripple via the matrix; manager Almanac legacy (mostly exists). GM pressure-release valve. | §12 / LS-18 | BUILD | L5, L3 |
| **L12** | Race system + All-Star + **player** Awards. **L12a** race primitive (WAR+fame standing, Visibility-vs-Emission gate §21.5 coupled to SEA-2, payouts = fame reach-ratchet + badge + morale; `depends:L6` explicit). **L12b** All-Star (mid-season; starters fan-vote fame-led / reserves merit; reach-floor payout; envy→L13). **L12c** player awards (merit races fame-tilt close-race guardrail; **TV-family KK/Bust/Comeback** — needs the C5 TV-snapshot store; negative inverted races; bench award) **+ Platinum Glove + WS MVP** (season-end one-shots; WS MVP depends on playoffs). Ceremony decoupled to season-end + fame-weighted + mechanical rewards removed. **MOY is NOT here → Phase-1 D9 (§D).** | §21-23 / RACE/ASG/AWARD | BUILD | L6, D6, D8; reconciles with D9 seams |
| **L13** | Relationships-lite + reporter accuracy model. Six threshold-gated edges (potential vs active), Captain/Charisma governors, charged matchups §24.7, pre-move intel §24.5 (advisory). **Owns the seeded inaccuracy primitive (REP-4)** + persisted accuracy field + the pre-action register. | §24 / REL-1..9, REP-4 | BUILD | L1, L3, L12(envy), L4, L1.5/L7, L6 |
| **L14** | Rebrand circuit-breaker. Trigger on sustained bottom fan morale; reset fan morale ~70 + all badges except Captain + auto-fire manager + **relocate (user picks from the existing SMB stadium pool — NO custom; pull dimensions/name/park-factors into the franchise so stadium analytics recompute, LSD-5)** + wipe dead money; persist stats/record/development; one continuous history w/ relocation marker. Couples to the stadium-analytics/park-factor system. | §14 / LS-20 | BUILD | L5, L7, L11(firing), economy(dead money), stadium-analytics |

### CROSS-CUTTING / PARALLEL

| # | Ticket | §refs | Notes |
|---|---|---|---|
| **L-SIM** | Simulation Gate harness. Extend the working scaffold (`test-utils/seasonSimulator*.test.ts` + `syntheticGameFactory.ts`) to drive the matrix. **Per-engine sub-checkpoints** (dampener after L8, event rates after L10, Fan Hopeful after L7, rebrand after L14) so the final §16 gate is a confirmation, not a first encounter. **Final hard gate before the Phase-2 flag flips.** | §16 / LS-22 | parallel track + final gate |
| **L-ECON2** | Tradeable draft picks (DSF-2): pick-ownership model + executor (mutates+persists `pickOrder`); extend pick-value chart + validator to the farm round. | DSF-2 | genuinely orthogonal |
| **L-ECON3** | farmGradeMode (DSF-3): multiplicative Juiced/Standard/Nerfed skew of the round-keyed grade tables, independent of the 22-man tier. | DSF-3 | genuinely orthogonal |
| (—) | In-season annual draft = **DEFERRED post-v1** (DSF-4 / LS-1). | DSF-4 | not in v1 |

---

## C. COUPLINGS TO PHASE-1 (corrected)

1. **C1 — D9 awards: HYBRID is FORCED, not chosen.** Fame is a Phase-1 standing hard exclusion
   (`FRANCHISE_PLAYABLE_V1_DEFINITION.md:38`), so D9 *structurally cannot* carry any fame behavior
   (close-race tilt, Gold-Glove defensive-fame, fame-weighted ceremony, the KK/Bust/Comeback TV-family).
   "Adopt-now" is spec-illegal; "build-then-rework" overstates the cost. **Action → §F-1: ratify the D9
   fame-ready seam checklist now** so L12 is purely additive.
2. **C2 — Fan Favorite = D6 value-half + L5 morale-half** (a clean but DOUBLE dependency; modeled in L7).
3. **C3 — D6/D8 trusted value gates:** MOY record term (D9), Fan Favorite value-half (L7), and KK/Comeback
   value basis (L12c) all sit POST-D6/D8.
4. **C4 — Backup parity GROWS, and is already in deficit.** `backupRestore.ts:275` pins v12 while
   `trackerDb.ts:17` is v15 → 3 franchise-economy stores already silently drop. The D2 parity-guard covers
   only the shared `kbl-tracker` DB; Phase-2 stores in separate DBs (`kbl-franchise-morale`,
   `kbl-relationships` [RETIRED — L13 reuses the `rivalryScores` store in the shared `kbl-tracker` DB per SEA-3 / L13-Q12, ruling pass 2026-06-19; no separate relationships DB], fame Heat/Reach, race standings) are guarded by nothing. **Action:** (a) re-scope the
   guard to ALL ~22 backed-up DBs (registry store-set + keyPaths + indexes === live opener) as a failing CI
   assertion; (b) reconcile `syncConfig.ts` + `franchiseSaveSlotManifest.ts` to one canonical DB list;
   (c) a **prerequisite hardening ticket**: wire export/restore to a real tested UI trigger + fail-closed on
   version mismatch (the feature is orphaned today and a stale-pin restore destroys newer stores);
   (d) per-ticket backup DoD (below).
   **Per-ticket backup Definition-of-Done** (every store-creating L-ticket — L2/L3/L4a/L5/L6/L12/L13):
   (1) store registered in `backupRestore` mirroring its opener byte-for-byte; (2) version pin +
   `KBL_BACKUP_VERSION` bumped; (3) all-DB parity-guard green; (4) `syncConfig.ts` entry added;
   (5) round-trip export→restore test (incl. a restore-after-expiry test for L2's temp overlays).
5. **C5 — Floating TV is built; trough history is not.** TV recomputes after every game but overwrites a
   single cumulative row. Fan Favorite/Albatross work off the live row (no new build). **KK + Comeback need a
   NEW `franchiseTrueValueSnapshots` store** (dedicated keyPath incl. checkpoint, NOT an array on the
   D6-frozen `franchiseTrueValueRows`), **captured from game 1** — a start-early data dependency, or
   season-1 Comeback data is permanently lost.

---

## D. MOY — A PHASE-1 D9 CONTRACT REFINEMENT (not a Phase-2 ticket)

The §18(4) read (MOY-1..7) does **not** create a Phase-2 ticket; it **specifies the D9 "Mgr of Year"
sub-ticket**, which already exists in the Phase-1 D-stack and sequences POST-D6/D8 inside D9:
- Build = season aggregation of the live `pogAwards` per-game `best_manager` composite into the (absent)
  `franchiseAwardsEngine`/`franchiseAwardsStorage`; **4 inputs** (decision-WPA + deployment-WPA + lineup-delta
  + team record); **pool-relative normalization** (MOY-6) dissolves the denomination; **record term =
  wins-above-D6-expectation** (MOY-3 → hard D6 couple); **no fame tilt** (MOY-4); weights → Sim Gate (MOY-7).
- Retire `mwarCalculator`/`calculateMOYVotes` + re-point the dead-gated `AwardsCeremonyFlow`/
  `RatingsAdjustmentFlow` **before any offseason flag flip** (MOY-5).
- MOY-2 (capped-realized record vs T10's orphaned `lineupDeltaWpaStandard`) is resolved at build time.

This is folded into the **D9 contract**, alongside the §F-1 player-award fame-ready seams.

---

## E. THE PARALLELISM RULE (build-dark / activate-after-D13) + CRITICAL PATH

- **Rule:** Phase-2 foundations may be **BUILT dark** (populate substrate, create stores, author the matrix
  table, ship behind a Phase-2 flag) in parallel with the late D-stack — but **NO morale/relationship
  consumer goes LIVE until after D13.** The §5 "no phantom morale" non-negotiable + D12's manual-smoke
  assertion ("no phantom morale") forbid L3-live riding alongside D7. Build in parallel; **activate strictly
  after D13.**
- **Critical path (D0-ratified → sim-gated playable Phase-2):**
  `[D0] → {L1, L1.5, L2, L4a, L9a, L-ECON1-before-freeze}` (all start immediately, off the L3 path)
  `→ L3 → {L5, L6} → {L7, L8, L9b, L10} → {L11, L12, L13, L14}`, with **L-SIM tuning continuously and
  gating last.** The true long-pole is the **value chain D6 → L7/L12c** (TV-delta designations + TV-award
  family), **not** the reporter and **not** the economy track — pulling L4a, L9a, and L-ECON1 off the spine
  shortens wall-clock without touching the real critical path.

---

## F. FORK RULINGS (JK 2026-06-16 — LSD-1..5; all RESOLVED)

- **F1 → LSD-1 — RULED (a): D9 fame-ready seam checklist RATIFIED; build the award engine ONCE.** Fame IS in
  full v1 (Phase-2 L6) — the award *engine* is just built at the Phase-1 checkpoint before fame exists, so
  build it once with the fame hooks empty and let L12 fill them (no rebuild). Bake into the D9 contract NOW:
  (1) per-award **candidate margins** (not winner-only) for the close-race tilt; (2) the **fWAR vs total-WAR
  split** on Gold Glove for the later defensive-fame blend (~15–25%); (3) a **pluggable/nullable** ceremony
  vote-weight field (salary→fame swap without migration); (4) reserved **KK/Bust/Comeback slots + the
  `franchiseTrueValueSnapshots` store**, capturing TV from game 1 (start-early per C5). Fame's award role =
  a merit-led TILT (§21.4, flips only a close race), defensive-fame on Gold Glove, fame-weighted ceremony
  votes, fame-led All-Star *starters* only; TV-family runs on True Value; awards pay fame+morale+badge only.
- **F2 → LSD-2 — RULED (a): FA-attraction DEFERRED to v1.1; struck from §13 "live teeth."** L5 keeps only the
  in-season **trade-request generation** (loyalty/morale-scaled destabilization), with an L10 event tap + an
  L13 trade-demander flashpoint. FA attraction/destination weighting (offseason concept) → v1.1.
- **F3 → LSD-3 — RULED (a): Cornerstone CUT from v1.** L7 drops it (matches the D0 deferral); revisit at the
  offseason/multi-season bridge.
- **F4 → LSD-4 — RULED (a): Budget pressure CUT from v1** (next-season spending = offseason); revisit v1.1.
- **F5 → LSD-5 — RULED (a): Stadium change = pick from the EXISTING Super Mega stadium pool in League Builder;
  NO custom stadiums.** On relocation (L14) the user chooses from the built-in list; the build **pulls the
  full stadium record (dimensions, name, park factors)** into the franchise so stadium analytics recompute
  correctly post-relocation. The L10 independent stadium-change leg uses the same pool-pick mechanism.

---

## G. PROVENANCE

Sequence drafted by Captain from `FRANCHISE_V1_LIVING_SEASON_SPEC.md` §5–§24 + `FRANCHISE_PLAYABLE_V1_
DEFINITION.md` + the four §18 certs (REPORTER / TRAIT_SIGNAL / DRAFT_SALARY_FARM / MANAGER_WPA_MOY).
Hardened by workflow `wf_b5734e06-e2c` (12 decorrelated agents, ~1.26M tokens, 284 tool uses): 7 grounding
code-readers (modifier population, the mutable layer, fan-morale state, floating-TV, Captain handoff, the sim
harness, a full DECISIONS_LOG mine) + 5 adversarial ordering critics (dependency-graph, Phase-1↔Phase-2
coupling, spec/ruling completeness, persistence/backup parity, critical-path/parallelism). All decision-
critical claims carry a `file:line`; the most material were independently re-derived. Nothing committed
(JK commits); no product code this session.
