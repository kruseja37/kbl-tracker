# ROADMAP TO FRANCHISE V1 (tracked)
**Created:** 2026-06-18 (JK request). **Method:** verification workflow `wf_8d42a490-383` — 3 evidence-grounded status readers (L-stack / D-stack / economy+gates, every status backed by a commit hash or spec file:line; unconfirmable → flagged, not guessed) + synthesis. Re-run that workflow to refresh.
**Sources of truth:** `FRANCHISE_V1_LIVING_SEASON_DSTACK.md` (L-stack) · `FRANCHISE_PLAYABLE_V1_DEFINITION.md` (D-stack D1–D13) · `TRAIT_MEASUREMENT_SPEC.md` (L9b rebuild) · `DECISIONS_LOG.md`.

**Status:** 22 done · 20 outstanding · 1 unverified.

> **What v1 is:** ONE release = the Phase-1 **D-stack (D1–D13)** + the Phase-2 **L-stack (L1–L14 + L-SIM)** + the **economy track (L-ECON1–3)** (LSD-6). **D13 ('Playable-V1') is an INTERNAL checkpoint, NOT the ship** — the real v1 exit is the post-flag-flip **iPad playtest (F-141)**. All Phase-2 work is built **DARK** (flags OFF) and **activates only after D13**.

---

## CRITICAL PATH
Finish L9b trait-reality REBUILD (R-E→R1→R2→R3) → L10 Q5/Q8 rework → L11 → L12(a/b/c) → L13 → L14 → L-ECON1 → extend L-SIM with per-engine sub-checkpoints + final hard gate → D12 iPad smoke → D13 sign-off → Phase-2 flag-flip ACTIVATION (post-D13) → F-138 + offseason flag → F-141 iPad playtest exit gate (ship).

**➡ IMMEDIATE NEXT:** Begin the L9b trait-reality REBUILD R-E enabling pieces per TRAIT_MEASUREMENT_SPEC.md §0.4: thread ratings/grades into the candidate-builder input, add the charisma factor to the combiner, and implement the re-evaluate-to-drop model (build-DARK, build→audit→host-gate→commit).

> Long pole (DSTACK §E): the value chain **D6 → L7/L12c**. L-SIM gates last. Nothing Phase-2 goes live until after D13.

---

## PHASED ROADMAP

### Phase 0 — D-stack value chain & awards (built)
- D1 done — adaptive-standards confirmed, 162 hardcode closed (752882f1)
- D2 done — backup/restore parity, 3 franchise stores registered (2fab709f)
- D3 done — browser-verify backlog cleared (CONFIRM-ONLY, JK signed)
- D5 done — TEAM_MVP/ACE warConsumerTrust contract verified (51/51)
- D6 done — True Value TRUST PROMOTION gate, frozen artifact (4a1bd36 + 6559a196)
- D7 done — Designations LIVE + dual-path reconcile + DesignationEvent (013d8861 + abfa1671)
- D8 done — Award-trust gate, trustedForAwards/finalWarTrusted computed (14c90fd4)
- D9 done — Real awards 6 categories + AwardsWatchlist (…c229733)
- D10 done — Mode-2 season summary/manifest finalization (51e487a)
- D11 done — UI live-label sweep, D-stack UI de-gated (5eaf9d96) — LAST D-stack code ticket

### Phase 1 — Tier-0 soul-layer substrate (built, build-dark)
- L1 done — personality & hidden-modifier substrate (d48ab3ce)
- L1.5 done — Captain initial assignment at Mode-1 finalization (2f4f3e56)
- L2 done — franchise-instance mutable layer + two-tier confirm (L2a/b/c; trackerDb v21)
- L4a done — reporter base-connect + publish-bus foundation (0cf4ca29 + 80749764)
- L9a done — traits enrichment CAPTURE surface (L9a-1..4)

### Phase 2 — Morale / fame / designations / ratings (built, build-dark)
- L3 done — Master Morale Matrix + morale ledgers (5b1431dc + d46a0710)
- L5 done — fan-morale teeth: dampener/flashpoint-decay/trade-requests/reporter-heat (L5a..d)
- L6 done — Fame system nine-tier Heat/Reach four-layer wiring (L6a + L6b-1/2)
- L7 done — Designations Phase-2: Fan Favorite/Captain/Fan Hopeful (L7a..d-3)
- L8 done — ratings checkpoints, first real WRITER through L2 (cfdd7752 + cd8a4589)
- L9b done — initial trait-from-reality engine, 16 traits (L9b-1..3c)

### Phase 3 — ACTIVE: trait rebuild + random-events rework (in-progress)
- L9b-2 in-progress — trait-reality REBUILD: R-E→R1→R2→R3, expands 16→~50 traits, build-DARK, NOT started (CHECKPOINTED HERE per FINDING-150)
- L10 done — random events engine/store/hook/resolver/reporter (L10-1..5) but on OLD 20%-checkpoint cadence
- L10-rework in-progress — Q5 continuous cadence (refactor L10-1 + L10-3) + Q8 name-change in dark catalog; not yet started

### Phase 4 — Remaining L-stack subsystems (not-started)
- L4b not-started — matrix-sourced season takes; reporter narrates L3 events over L4a bus (deps L3+L4a met)
- L11 not-started — manager firings: fan-relief bump, morale ripple, Almanac legacy, GM pressure-valve (deps L5+L3 met)
- L12 not-started — L12a races / L12b All-Star / L12c player awards+fame; needs C5 TV-snapshot store; dark-build, activate post-D13
- L13 not-started — relationships-lite + reporter accuracy model (6 edges, governors, charged matchups, pre-move intel); blocked by L12
- L14 not-started — rebrand circuit-breaker: relocation/morale-reset/badge-reset/fire-manager/dead-money-wipe; blocked by L11

### Phase 5 — Economy spine (not-started; L-ECON1 may gate before salary freeze)
- L-ECON1 not-started — unified relative-to-pool salary scale (DSF-1); SET-ASIDE safety wall (oracle-adjacent); scope decision pending: new-league-only vs land before draft/salary freeze
- L-ECON2 not-started — tradeable draft picks (DSF-2); orthogonal, post-L-ECON1
- L-ECON3 not-started — farmGradeMode multiplicative Juiced/Standard/Nerfed skew (DSF-3); orthogonal, post-L-ECON1
- D4 not-started — salary-live UI de-gate; needs JK scope clarification on presentation in D6-gated panel

### Phase 6 — Hardening, sim gate & magnitude tuning (in-progress/not-started)
- C4 in-progress — backup-parity hardening: re-scope guard to all ~22 DBs, reconcile syncConfig/manifest, wire export/restore UI, per-ticket backup DoD
- §16 / L-SIM in-progress — Simulation-Gate magnitude tuning; per-engine sub-checkpoints (after L8/L10/L7/L14); all placeholder magnitudes await this
- L-SIM not-started — extend simulator scaffold (test-utils/seasonSimulator162.test.ts + syntheticGameFactory.ts) to full matrix; FINAL hard gate before Phase-2 flag-flip; cannot start until L10-rework done + L11/L12/L13/L14 built

### Phase 7 — Phase-1 gates: manual smoke & playable-V1 checkpoint (not-started)
- BROWSER-VERIFY in-progress — 23 items, batched single-pass before D0/flag-flip; persistence/data-shape items #16/#21/#23 lead (L2a/L9b/L10 store migrations)
- D12 not-started — full Phase-1 iPad manual smoke (salary/designations/trades/farm/WPA/spray/playoffs/awards/summary live); JK browser gate; blocks D13
- D13 not-started — Playable-V1 internal checkpoint; needs D12 complete + JK explicit sign-off on expanded cut line
- D13-signoff not-started — confirmed NOT yet reached; D11 was last code ticket; D12 is the gap

### Phase 8 — Post-D13 activation & v1 ship (unverified/not-started)
- post-D13-activation unverified — Phase-2 flag-flip + activation seams (trait-confirm UI, ratings-confirm UI, stadium-apply, reporter-emission, morale/fame/designation-effects wiring); spec exists, NO implementation started (by design, dark-build parallel)
- F-138 not-started — offseason data-source ticket (flag-flip precondition); FRANCHISE_V1_OFFSEASON_EXECUTION_ENABLED stays FALSE until it lands
- v1-exit-playtest (F-141) not-started — iPad playtest exit gate of FULL living season; strictly after D13 + L-stack + L-SIM + F-138/flag-flip; THE SHIP

---

## FLAGS / DECISIONS NEEDED
- ❓ post-D13-activation: status 'unverified' PRESERVED (not upgraded). Spec is fully written (FRANCHISE_V1_LIVING_SEASON_DSTACK.md §E + embedded per-L-ticket contracts) but NO implementation work has started — every activation seam (trait-confirm UI, ratings-confirm UI, stadium-apply, reporter-emission, morale/fame/designation-effects wiring) is explicitly deferred until after D13 sign-off, by design (build-dark parallel with late D-stack). To CONFIRM: grep for any flag-flip caller wiring the dark L-stack flags to true and for any live caller of the orphaned confirm/applier modules (e.g. franchiseTraitConfirmApply, L10 stadium resolver, franchiseL10NewsAdapter); CURRENT_STATE.md confirms all remain orphaned/flag-OFF as of 2026-06-18, so status correctly stays unverified rather than done.
- ⬜ **D4 (salary-live UI de-gate)** — NOT started, needs a JK scope/presentation ruling: JK scope clarification needed: presentation decision how to show live-salary in otherwise-D6-gated panel

---

## FULL PER-TICKET STATUS (evidence-backed)

| Ticket | St | Title | Evidence / Outstanding |
|---|:--:|---|---|
| D1 | ✅ | Adaptive-standards confirm + close 162 hardcode | AUTONOMOUS_RUN_LOG.md (2026-06-16): D1 committed; `752882f1` useSeasonStats.ts 162→MLB_BASELINE_GAMES |
| D10 | ✅ | Mode-2 season summary/manifest finalization (with awards + active designations) | AUTONOMOUS_RUN_LOG.md (2026-06-17): D10 committed `51e487a`; Codex-built → Opus-audited VERIFIED (tsc 0 / build 0 / suite 7,289 pass); SeasonSummary LEAGUE awards + manifest active-designation canonical fix |
| D11 | ✅ | UI live-label sweep (remove preview/READ-ONLY vocabulary from salary/True Value/designations/awards) | git log: `5eaf9d96` D11 committed; AUTONOMOUS_RUN_LOG.md (2026-06-17): UI sweep + smart-label D4 value panel; Codex-built → Opus-audited VERIFIED |
| D2 | ✅ | Backup/restore parity: register 3 franchise stores + parity-guard | AUTONOMOUS_RUN_LOG.md (2026-06-16): D2 committed; `2fab709f` backupRestore pin 12→15; parity-guard green |
| D3 | ✅ | Browser-verify backlog clearance (EP1, TV2, T7a/b/c, T8b/c, T8d-2/3, T9, T10, farm/trade/WPA/spray/playoffs) | AUTONOMOUS_RUN_LOG.md: all prior tickets complete; marked CONFIRM-ONLY; JK browser sign-off on real data |
| D5 | ✅ | 1.2.5 trust confirm — TEAM_MVP/ACE warConsumerTrust contract verify | AUTONOMOUS_RUN_LOG.md (2026-06-16): D5 CONFIRMED (confirm-only, no build); warConsumerTrust green 51/51 tests |
| D6 | ✅ | True Value/value-delta TRUST PROMOTION gate (frozen artifact, peer-pool audit, frozen-snapshot rule) | AUTONOMOUS_RUN_LOG.md: D6a committed `4a1bd36` (live half peer-pool audit); D6b committed `6559a196` (season-end freeze); both Codex-built → Opus-audited VERIFIED |
| D7 | ✅ | Designations LIVE + reconcile dual path + Albatross + DesignationEvent + effects (Captain/Fan Favorite/Fan Hopeful) | AUTONOMOUS_RUN_LOG.md: D7 split into D7a `013d8861` + D7b `abfa1671` + L7c/L7d; D7a/D7b committed on 2026-06-17; all Codex-built → Opus-audited VERIFIED |
| D8 | ✅ | Award-trust gate (1.8.5): promote trustedForAwards/finalWarTrusted via frozen D6 artifact | AUTONOMOUS_RUN_LOG.md (2026-06-17): D8 committed `14c90fd4`; Codex-built → Opus-audited VERIFIED; award-trust booleans now COMPUTED |
| D9 | ✅ | Real awards (1.9): 6 categories MVP/Cy Young/RoY/Gold Glove/Silver Slugger/Mgr of Year + AwardsWatchlist | AUTONOMOUS_RUN_LOG.md (2026-06-17): D9 split D9a→D9d-2; all committed through `c229733`; includes franchiseAwardsEngine + franchiseAwardsStorage + AwardsWatchlist.tsx + mode-2 awards-aware manifest; all Codex-built → Opus-audited VERIFIED |
| L1 | ✅ | Personality & hidden-modifier substrate (rename/remap/schema/persist) | d48ab3ce (2026-06-16) — COMMITTED; AUTONOMOUS_RUN_LOG.md §SESSION_SUMMARY; CURRENT_STATE.md line 3 references L1 as part of completed chain |
| L1.5 | ✅ | Captain initial assignment at Mode-1 league finalization | 2f4f3e56 (2026-06-16) — COMMITTED as L1.5+OD-1; AUTONOMOUS_RUN_LOG.md lists 21 unit + 33 integration tests; CURRENT_STATE.md chain includes L1.5 |
| L10 | ✅ | Random events (pure engine, store, flag+hook, stadium resolver, reporter tap) | L10-1 (607fa015), L10-2 (a830a61f), L10-3 (8a33d9d3), L10-4 (057340ed), L10-5 (52db0ade) — all COMMITTED (2026-06-18); CURRENT_STATE.md line 18 'L10 COMPLETE (1-5), all build-DARK' + line 156 explicit '⇒ L10 (random events) COMPLETE: L10-1..5' |
| L2 | ✅ | Franchise-instance mutable layer + two-tier confirmation infra | L2a (6fdeba11), L2b (e8ec0908), L2c (a77e0ed5) — all COMMITTED; CURRENT_STATE.md line 77 'L2 COMPLETE' + line 502 explicit closure; trackerDb v21 |
| L3 | ✅ | Master Morale Matrix + morale ledgers | L3a (5b1431dc), L3b (d46a0710) — both COMMITTED; CURRENT_STATE.md 'L3 COMPLETE' + git log confirms both commits |
| L4a | ✅ | Reporter base-connect + publish-bus foundation (split from L4; hoisted to Tier 0) | 0cf4ca29 (2026-06-16) L4a-connect + 80749764 (2026-06-16) L4a-bus — both COMMITTED; AUTONOMOUS_RUN_LOG.md SESSION_SUMMARY lists both; CURRENT_STATE.md confirms build-dark store (SeasonNewsItem, v17) |
| L5 | ✅ | Fan morale teeth (dampener, flashpoint-decay, trade-requests, reporter-intensity) | L5a (428f7cb), L5b (5ebb148), L5c (8cd2cc1), L5d (e061e51) — all COMMITTED; CURRENT_STATE.md line 94 'L5 COMPLETE (a–d: dampener / flashpoint-decay / trade-requests / reporter-heat)' + git log confirms all four |
| L6 | ✅ | Fame system (nine-tier, Heat/Reach, four-layer wiring, attribution channels) | L6a (7359cbf), L6b-1 (3b36d35), L6b-2 (5a7685a) — all COMMITTED; CURRENT_STATE.md line 87 'L6 (Fame) COMPLETE' + git log confirms all three |
| L7 | ✅ | Designations Phase-2 completion (Fan Favorite, Captain, Fan Hopeful) | L7a (0a59a24), L7b (77feeda3), L7c (886d1dce), L7d-1 (f61dcae0), L7d-2 (aec5db99) + L7d-3 doc — all COMMITTED; CURRENT_STATE.md line 77 'L7 COMPLETE' + line 472 explicit listing all 5 parts |
| L8 | ✅ | Ratings checkpoints (20%-of-games league sweep, consumes L5 dampener, console log) | L8a (cfdd7752), L8b (cd9e4589) — both COMMITTED; CURRENT_STATE.md line 73 'L8 COMPLETE' + line 503 explicit 'L8 COMPLETE (ratings development — the first real WRITER through L2)' |
| L9a | ✅ | Traits enrichment capture surface (ball-strike count, pitch-zone, handedness, OF extra-base, injury, pitch-type) | L9a-1 (e28706e9), L9a-2 (32244393), L9a-3 (acce899c) — all COMMITTED; CURRENT_STATE.md line 517 'L9a — net-new reality CAPTURE layer (§9 / OD-5 / TS-1..13) — effectively COMPLETE' + L9a-4 (acce899c) adds OF-credit & injury tally |
| L9b | ✅ | Traits-from-reality engine (scorer, acquisition, candidate-builder, store, hook, confirm/write) | L9b-1 (398533d1), L9b-2 (f616373a), L9b-3a (54fae510 + 4e3ad01d), L9b-3b-i (0cd75d9a), L9b-3b-ii (e08be415), L9b-3c (e8afc08d) — all COMMITTED; CURRENT_STATE.md line 3 '✅ L9b COMPLETE' + line 257 explicit 'L9b (trait-from-reality engine) COMPLETE' |
| BROWSER-VERIFY | 🔧 | BROWSER-VERIFY outstanding items (JK manual sign-off gate) | BATCHED per SESSION_RULES — cleared in one pass before D0/flag-flip/playtest gate; persistence/data-shape items prioritized. Items: (1) EP1 effective-position pooling on real franchise data; (2) TV2 TeamHub projected badges; (3) T7a optimal-lineup recommendations by IV-of-effectiveRatings; (4) T7b c |
| C4 | 🔧 | Backup-parity hardening — all-DB parity guard + export/restore UI wiring | (a) Re-scope the guard to ALL ~22 backed-up DBs (registry store-set + keyPaths + indexes === live opener) as failing CI assertion; (b) reconcile `syncConfig.ts` + `franchiseSaveSlotManifest.ts` to one canonical DB list; (c) wire export/restore to real tested UI trigger + fail-closed on version misma |
| L10-rework | 🔧 | L10 Q5/Q8 rework (continuous cadence, name-change catalog) | Refactor L10-1 (franchiseL10EventEngine.ts) to fire continuously instead of checkpoint-batched; refactor L10-3 hook to trigger per-game instead of checkpoint-boundary; add name-change event to L10 dark catalog |
| L9b-2 | 🔧 | L9b trait-measurement rebuild (measurement model ratified, now building R-E → R3 enabling pieces) | R-E enabling pieces (thread ratings/grades into builder input; charisma factor in combiner; re-evaluate-to-drop model) → R1 (clean outcome proxies) → R2 (data-proxy+personality) → R3 (ratings-gated: Noodle Arm, Ace Exterminator). Expands v1 trait set from 16 → ~50. Build-DARK; then L10 Q5/Q8 rework  |
| §16 | 🔧 | Simulation-Gate magnitude tuning (L-SIM) | Per-engine sub-checkpoints (dampener after L8, event rates after L10, Fan Hopeful after L7, rebrand after L14) so final §16 gate is confirmation, not first encounter. Extends the working scaffold to drive the matrix. Placeholder magnitudes exist in: `RATINGS_DEVELOPMENT_TUNING` (L8a), `DESIGNATION_F |
| post-D13-activation | ❓ | Post-D13 ACTIVATION state: the Phase-2 flag-flip that turns dark L-stack live | Post-D13 activation spec exists (detailed in FRANCHISE_V1_LIVING_SEASON_DSTACK.md §E and embedded in each L-ticket contract) but NO IMPLEMENTATION WORK HAS STARTED. Phase-2 flag flips + activation seams (trait-confirm UI, ratings-confirm UI, stadium-apply, reporter-emission, morale-wiring, fame-wiri |
| D12 | ⬜ | Full Phase-1 manual smoke (iPad): salary/designations/trades/farm/WPA/spray/playoffs/awards/summary all live; zero hardcoded-162; all events emitted | iPad manual smoke gate; JK browser verification required; no automated testing (browser-pending scenario #12+) |
| D13 | ⬜ | Playable-V1 approval — JK's explicit sign-off that the expanded cut line is met | Requires: (1) D12 iPad manual smoke complete + JK sign-off; (2) JK explicit sign-off on expanded cut line met; (3) triggers post-D13 soul-layer ACTIVATION (L-stack dark features go live) |
| D13-signoff | ⬜ | Has D13 'Playable-V1 sign-off' happened yet? | NO, D13 sign-off has NOT happened yet. D11 was the last D-stack ticket completed. D12 (iPad manual smoke) is the blocking gate, followed by D13 JK sign-off. The post-D13 deferrals in CURRENT_STATE (trait-confirm UI, ratings-confirm UI, stadium-apply, reporter-emission wiring) all confirm D13 has not |
| D4 | ⬜ | Salary-live UI de-gate (remove PREVIEW/READ-ONLY chips; salary impact preview in trade UI) | JK scope clarification needed: presentation decision how to show live-salary in otherwise-D6-gated panel |
| F-138 | ⬜ | Offseason data-source ticket (flag-flip precondition) | F-138 scoped post-D0 ratification; F-134/F-135 closure confirmed no flag-flip ready; FRANCHISE_V1_OFFSEASON_EXECUTION_ENABLED must stay FALSE until F-138 lands |
| L-ECON1 | ⬜ | Unified relative-to-pool salary scale (DSF-1) — coupled to value/IV spine | Connect `TIER_SHIFTS` into pool-IV feed; derive `(tier, pickValueChart, draftSlot)→price`; replace the 0.50× rookie factor + flat farm table; scale raw IVs pre-chart so frozen IV oracle stays byte-untouched. BLOCKING condition: must land BEFORE the v1 franchise's draft/salary freeze (ahead of D4/D6) |
| L-ECON2 | ⬜ | Tradeable draft picks (DSF-2) | Build pick-ownership model + executor (mutates+persists `pickOrder`); extend pick-value chart + validator to the farm round. NOT blocking L-ECON1 (orthogonal per spec). Deferred to post-L-ECON1. |
| L-ECON3 | ⬜ | farmGradeMode (DSF-3) — multiplicative Juiced/Standard/Nerfed skew | Implement multiplicative Juiced/Standard/Nerfed skew of round-keyed grade tables, independent of 22-man tier. Deferred to post-L-ECON1. |
| L-SIM | ⬜ | Simulation Gate harness (extend scaffold, per-engine sub-checkpoints, final hard gate before Phase-2 flag flip) | Extend the working simulator scaffold to drive the full matrix with per-engine sub-checkpoints (dampener after L8, event rates after L10, Fan Hopeful after L7, rebrand after L14). Final hard gate before Phase-2 flag flip. Cannot start until L10-rework complete and L11/L12/L13/L14 built |
| L11 | ⬜ | Manager firings (fan-relief bump, performance×personality ripple, Almanac legacy, GM pressure-valve) | Build L11 manager-firing engine with fan-relief bump, player morale ripple via L3 matrix, manager Almanac legacy capture, and GM pressure-release valve mechanics |
| L12 | ⬜ | Race system + All-Star + player Awards (L12a/L12b/L12c: races, All-Star, awards+fame) | Build L12a (race primitive), L12b (All-Star mid-season), L12c (player awards with TV-family KK/Bust/Comeback, Platinum Glove, WS MVP). Requires C5 TV-snapshot store per design. All engine logic can be dark-built; activation deferred post-D13 |
| L13 | ⬜ | Relationships-lite + reporter accuracy model (six edges, Captain/Charisma governors, charged matchups, pre-move intel) | Build L13 relationship edges (6 threshold-gated: potential vs active), Captain/Charisma governors, charged matchups §24.7, pre-move intel §24.5, seeded inaccuracy primitive (REP-4), persisted accuracy field, pre-action register |
| L14 | ⬜ | Rebrand circuit-breaker (relocation, fan morale reset, badge reset, manager firing, dead money wipe, history marker) | Build L14 rebrand trigger logic (sustained bottom fan morale), morale reset (~70), badge reset (except Captain), auto-fire manager, relocation from SMB stadium pool, dead-money wipe, stat/record/development persistence, one continuous history with relocation marker |
| L4b | ⬜ | Matrix-sourced season takes (reporter narrates L3 matrix events) | Build the L4b tap that connects L3 morale matrix events to the L4a reporter narrative generation (depends on L3 event inputs, L4a bus infrastructure complete) |
| v1-exit-playtest | ⬜ | iPad playtest exit gate (v1 release verification after L-stack + L-SIM) | v1 exit playtest is strictly AFTER: (1) D13 sign-off (Phase-1 checkpoint); (2) L-stack + L-SIM gate complete (Phase-2 full build + sim validation); (3) F-138 + flag flip (offseason data source, though offseason itself stays out of v1). Currently 4+ weeks of L-stack build ahead before this gate opens |
