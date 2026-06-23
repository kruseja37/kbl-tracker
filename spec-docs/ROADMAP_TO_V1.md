# ROADMAP TO FRANCHISE V1 (tracked)
**Created:** 2026-06-18 (JK request). **Refreshed:** 2026-06-22 (V1 DELTA AUDIT full refresh — evidence in `V1_DELTA_AUDIT_FINDINGS.md`; supersedes the 2026-06-20 status). *(Prior: 2026-06-20 status re-run + auction scope-change + Mode-1/handoff blind-spot closed.)*
> **🔄 2026-06-22 V1 DELTA REFRESH (boundary `84d0adf4`):** the 9-reader comb-through + Captain re-verification found the roadmap materially stale on two fronts — **Mode-1 AUCTION is BUILT-LIVE** (was "0 lines/UNBUILT") and **L14 is BUILT-DARK COMPLETE** (was "MISSING, largest unbuilt L-system"); **L13-6/L13-7** are built too. The genuinely-open v1 work is now gated by the **LANE-MERGE** (auction code lives ONLY on `codex/mode1-v1-b`; `codex/franchise-v1-next` has zero auction code — the #1 unowned structural gap). **G1 draft-IV freeze is NOT closed by RB-7** (settledSalary+morale frozen, but no distinct draft-IV). Full evidence + per-line re-status: `V1_DELTA_AUDIT_FINDINGS.md`.
**Method:** evidence-grounded status read — every status backed by a commit hash or spec file:line; unconfirmable → flagged, not guessed. The 2026-06-20 refresh re-verified the L-stack against git + CURRENT_STATE.md, folded in the auction→v1 scope change (`MODE1_LEAGUE_BUILD_TO_DRAFT_VISION.md` §6), and added the Mode-1 → Mode-2 launch-readiness lane sourced from the on-disk audits.
**Sources of truth:** `FRANCHISE_V1_LIVING_SEASON_DSTACK.md` (L-stack) · `FRANCHISE_PLAYABLE_V1_DEFINITION.md` (D-stack D1–D13) · `TRAIT_MEASUREMENT_SPEC.md` (L9b rebuild) · `DECISIONS_LOG.md` · **economy foundation:** `IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md` + the **T-stack (T1–T12)** (IV engine, tiers, luxury caps, all three drafts, auction logic §7.5/§7.6) · **Mode-1 launch lane:** `MODE1_TO_MODE2_V1_LAUNCH_READINESS.md`, `LEAGUE_BUILD_TO_DRAFT_AUDIT.md`, `MODE2_V1_COMPLETENESS.md`, `MODE1_LEAGUE_BUILD_TO_DRAFT_VISION.md`.

**Status (2026-06-22):** L-stack built-dark through **L14** (L11/L12-1..5/L13-5/L13-6/L13-7/L14 all done) · **Mode-1 auction BUILT-LIVE** (RB-0..RB-15,RB-17; prospect-gen B1–B9 + AUC-5.1 complete; `tsc -b` clean) · **three outstanding lanes:** (1) living-season tail (L13-8 → fame→morale wiring → trade-req wiring → L12-6 → L4b → L-SIM final gate), (2) Mode-1 finish (RB-13b routing + RB-16 sim-tune + RB-18 lineup-morale UI + B8 age-reversal + launch-contract wirings incl. **G1 freeze writer**), and (3) the **LANE-MERGE** (bring mode1-v1-b into franchise-v1-next — unowned) · plus the net-new §8.5/§8.6 + DH-removal + rookie-flag scope · 1 unverified (post-D13 activation).

> **What v1 is:** ONE release = the Phase-1 **D-stack (D1–D13)** + the Phase-2 **L-stack (L1–L14 + L-SIM)** + the **economy track (L-ECON1–3 + the AUCTION draft)** (LSD-6 + the 2026-06-20 auction elevation) + the **Mode-1 → Mode-2 launch contract**. **D13 ('Playable-V1') is an INTERNAL checkpoint, NOT the ship** — the real v1 exit is the post-flag-flip **iPad playtest (F-141)**. All Phase-2 work is built **DARK** (flags OFF) and **activates only after D13**.

> **🔧 RECONCILIATION NOTE (2026-06-20):** This roadmap was originally L-stack / economy-spine anchored and **under-counted the Mode-1 → Mode-2 handoff** — it tracked the living-season subsystems but never enumerated what Mode-1 must PRODUCE at franchise creation, nor the draft PROCESS that stamps the economy anchor. JK flagged the blind spot. It is now closed: see **§ MODE-1 → MODE-2 LAUNCH READINESS** below. Two further reconciliations: (a) the prior audits never referenced `IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md` (the IV/tier/luxury/auction foundation) — now flagged as a source of truth; (b) **auction is elevated v1.5 → v1** (JK deliberate), making it the largest single Mode-1 build.

---

## CRITICAL PATH (two lanes, converging at the D12/D13 gate)

**LANE 1 — Living-season tail (L-stack):** *(L11/L12-1..5/L13-5/L13-6/L13-7/L14 all BUILT-DARK as of 2026-06-22.)*
**L13-8 (build HELD — contract authored)** → **fame→morale wiring (§20.5 + §20.6 A/B + WAR-legitimacy floor — 3 RULED-v1 orphan gaps)** ∥ **trade-request propensity wiring (cheap)** ∥ **L12-6 (race/award/All-Star UI surfacing + allStarSelections counter)** ∥ **L4b (matrix-sourced season takes)** → extend L-SIM with per-engine sub-checkpoints + the final hard gate. *(The L9b trait-reality REBUILD + L10-rework + the in-season ratings/trait checkpoint models are **SET-ASIDE — owned by the ratings/trait/chemistry redesign thread**, not this roadmap's critical path.)*

**LANE 2 — Mode-1 / economy / handoff:** *(AUCTION is BUILT-LIVE on `codex/mode1-v1-b` — RB-0..RB-15,RB-17; prospect-gen B1–B9 + AUC-5.1 complete; `tsc -b` clean.)*
Remaining build: **RB-13b (route draft flow by `draftFormat` — design-gated)** + **RB-16 (sim-tune sweep + draft-economy validation harness, Captain-run)** + **RB-18 (live lineup-morale UI)** + **B8 (§10 prospect-age reversal — generate skew-young revealed age)** → **Mode-1 launch-contract wirings:** **G1 draft-IV True-Value freeze writer** (build against auction finalize — a `franchiseTrueValueSnapshots` checkpoint-0 row + additive settledSalary, GREEN seam) · SMB4 names for reporters + bridge-scouts · SCHOLARLY personality reconcile · **manager entity** (text→entity) · true **league-lock** + frozen-at-lock instance · stadium picker-lock (R9). These must land **before/with the v1 franchise's draft/salary freeze**.

**LANE 3 — THE LANE-MERGE (#1 structural prerequisite — UNOWNED):** bring the entire `codex/mode1-v1-b` build (auction + prospect-gen + draft-freeze + draft-derived morale) into `codex/franchise-v1-next`. `franchise-v1-next` has **zero** auction code today; no Mode-1 closure reaches Mode-2 until this lands. See the lane-merge ticket in `AUCTION_REBUILD_PLAN.md`.

**NET-NEW v1 SCOPE since the boundary (specced-intent-only / unbuilt):** §8.5 pitcher game score (stats lane) · §8.6 beat-reporter standout Q&A + §8.1 pronoun prereq (reporter lane) · R6 auction hot-seat UX spec · DH-removal (pitchers always bat) · rookie≠Fan-Hopeful flags.

**CONVERGE →** D12 iPad smoke → D13 sign-off → Phase-2 flag-flip ACTIVATION (post-D13) → F-138 + offseason flag → **F-141 iPad playtest exit gate (ship)**.

**➡ IMMEDIATE NEXT:** (Lane 1) L13-8 (un-hold) + the 3 fame-wiring orphan taps (the explicit L-SIM blockers). (Lane 2) RB-13b/RB-16/RB-18 + the G1 freeze writer. (Lane 3) scope + own the lane-merge — it gates D12.

> Long poles: Lane 1 = fame-wiring + L13-8 (the last L-SIM blockers); Lane 2 = RB-16 sim-tune + the G1 freeze writer; **Lane 3 = the lane-merge (the structural gate to D12)**. L-SIM gates last. Nothing Phase-2 goes live until after D13.

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
- L2 done — franchise-instance mutable layer + two-tier confirm (L2a/b/c; trackerDb v21) — ⚠ overlay read-loop closure deferred post-D13 (mergeRatingsOverlays has no live reader yet)
- L4a done — reporter base-connect + publish-bus foundation (0cf4ca29 + 80749764)
- L9a done — traits enrichment CAPTURE surface (L9a-1..4)

### Phase 2 — Morale / fame / designations / ratings (built, build-dark)
- L3 done — Master Morale Matrix + morale ledgers (5b1431dc + d46a0710)
- L5 done — fan-morale teeth: dampener/flashpoint-decay/trade-requests/reporter-heat (L5a..d)
- L6 done — Fame system nine-tier Heat/Reach four-layer wiring (L6a + L6b-1/2) — ⚠ 3 fame-wiring taps still open (see Phase 4 fame-wiring)
- L7 done — Designations Phase-2: Fan Favorite/Captain/Fan Hopeful (L7a..d-3)
- L8 done — ratings checkpoints, first real WRITER through L2 (cfdd7752 + cd8a4589)
- L9b done — initial trait-from-reality engine, 16 traits (L9b-1..3c)
- **checkpoint-cadence-config done** — binary Standard/Frequent shared checkpoint cadence as a league setting (additive, build-dark) (39f65a17, verified-complete 0aac83e9) — NEW since the 2026-06-18 roadmap; the SHARED cadence used by ratings-dev + traits + L13 edge formation

### Phase 3 — ACTIVE: trait rebuild + random-events rework (in-progress)
- L9b-2 in-progress — trait-reality REBUILD: R-E→R1→R2→R3, expands 16→~50 traits, build-DARK, NOT started (CHECKPOINTED per FINDING-150)
- L10 done — random events engine/store/hook/resolver/reporter (L10-1..5) but on OLD 20%-checkpoint cadence
- L10-rework in-progress — Q5 continuous cadence (refactor L10-1 + L10-3) + Q8 name-change in dark catalog; not yet started

### Phase 4 — Remaining L-stack subsystems
- **L11 done** ✅ — manager firings: fan-relief bump, perf×personality ripple, Almanac tenure legacy, GM pressure-valve, per-game auto-backstop (L11-1..5: 46c3c761/1821ad21/4c59ecbd/7268f9f1/3e718e4f/f77b3c75; `franchiseL11FiringEngine.ts` + `franchiseManagerFiring.ts` + `franchiseManagerAutoBackstop.ts`; wired `processCompletedGame.ts:666`) — build-dark **[was 'not-started' — STALE]**
- **L12 done (L12-1..5)** ✅ — races/All-Star/awards PAYOUT layer FULLY BUILT (L12-1 e9f43132 trackerDb v24 · L12-2 79da652b TV-family · L12-3 a/b/c/R · L12-4 a–d All-Star · L12-5 a–e emission/snub/reach-floor, COMPLETE fb120400) — build-dark **[was 'not-started' — STALE]**
  - **L12-6 not-started** ⬜ — the LAST L12 piece: race/award/All-Star UI surfacing (feed flag-off All-Star UI from the real builder; surface race standings + new categories in `AwardsWatchlist`) + the deferred `allStarSelections` career counter
- **L13 in-progress** 🔧 — relationships-lite + reporter accuracy. **Built-dark:** L13-1 (7b9c92fc, browser-verified) · L13-2 (b18031b7) · L13-3a (f737c67e) · L13-4 (915dbf6d) · **L13-5 keystone VERIFIED-COMPLETE (c724fc7f, afe6edc4=HEAD)** — relationship→morale tap is LIVE in the matrix (`masterMoraleMatrix.ts:420` real `resolveRelationshipTap`, producer wired `processCompletedGame.ts:660`); the "relationships are INERT" finding is now obsolete. **Remaining:** L13-3b (deferred-logged), L13-6 / L13-7 / L13-8 (contracts authored in PROMPT_CONTRACTS.md) **[was 'not-started, blocked by L12' — both STALE: L12 is built, L13 is well underway]**
- L4b not-started — matrix-sourced season takes; reporter narrates L3 events over L4a bus (deps L3+L4a met)
- **L14 done** ✅ — rebrand/relocation circuit-breaker: **BUILT-DARK COMPLETE** (L14-1 dwell `9f848296` · L14-2a cascade transforms `79cb7a7c` · L14-2b orchestrator `ed1cf4ef` · L14-3 GM-offer reader+accept `a13deb5f`, all 2026-06-21). Flag `FRANCHISE_PHASE2_L14_ENABLED_DEFAULT=false` (`franchisePhase2Flags.ts:109`); modules `franchiseRebrand{Dwell,Cascade,Apply,Offer}.ts`. **No live consumer in `processCompletedGame` or UI — pure build-dark, activates post-D13.** **[was '⬜ MISSING, largest unbuilt L-system' — STALE; flipped in the 2026-06-22 V1 delta refresh.]**
- **fame→morale wiring not-started** ⬜ (NEW line — 3 RULED-v1 gaps from MODE2_V1_COMPLETENESS §2.3): (a) WAR-legitimacy floor `applyWarLegitimacyGravity` (`fameModel.ts:161-174`) ORPHANED — wire into per-game compute; (b) §20.5 fame→player-morale tap MISSING from `masterMoraleMatrix.ts`; (c) §20.6 Channel A/B fan-morale channels MISSING (Channel C built). RULED v1 — WIRE before flag-flip.
- **trade-request propensity wiring not-started** ⬜ (NEW line — MODE2_V1_COMPLETENESS §2.4): `tradeRequestGeneration.ts:77-130` complete but ORPHANED; L10 emits a flat dice-split `trade_demand` (`franchiseL10EventEngine.ts:331`). Priced as WIRING (cheap: +loyalty field + import + branch swap), not BUILD. RULED v1.

### Phase 5 — Economy spine + the AUCTION draft (Lane 2 core)
- L-ECON1 not-started — unified relative-to-pool salary scale (DSF-1); SET-ASIDE safety wall (oracle-adjacent). **Reconciled at the 2026-06-22 refresh:** the **draft-IV True-Value freeze (launch gap G1) is STILL OPEN** — RB-7 stamped settledSalary + player/fan morale at franchise-init (`franchiseInitializer.ts:736-754`) but **NOT a distinct draft-IV** (`draftFreeze.ts` has no `iv` field; no `franchiseTrueValueSnapshots` checkpoint-0 row; `valueDelta=trueValue−salary` still collapses TV+salary at `salaryCalculator.ts:1019`). G1 = build the freeze writer **against auction finalize** (a checkpoint-0 row + additive settledSalary, GREEN seam, no DB bump). The **tier-IV scale (`TIER_SHIFTS`) is NOT-A-GAP per R7** — IV is objective, tier scales the budget cap + farm-generation distribution only; leaving stored IV tier-flat is correct-by-design. Only residual = the FARM IV-distribution tier-shift (`FARM_NERF_SCALES` orphaned), gated on the V9 grade-model ruling.
- **AUCTION draft done** ✅ — **BUILT-LIVE + routed on `codex/mode1-v1-b`** (RB-0..RB-15,RB-17; `tsc -b` exit 0 whole-lane). State machine (`auctionStateMachine.ts`), two hooks (`useAuctionDraft.ts`/`useFarmAuctionDraft.ts`), two routed pages (`App.tsx:304-309`), CPU-shill market (`cpuShillBidding.ts` + RB-10 split/dissolve `cpuTeamRoles.ts`), per-lot luxury tax (`auctionLuxuryTax.ts`), MLB→farm carryover (RB-4), roster board (`DraftRosterBoard.tsx`), scout-privacy (`LongPressReveal.tsx`), guided coach (`AuctionCoachBanner.tsx`), format picker (RB-13a), one-chance engine-nomination (RB-2). Prospect-gen B1–B9 + AUC-5.1 farm-auction COMPLETE. **[was '⬜ 0 lines, the largest single Mode-1 build' — STALE; flipped in the 2026-06-22 V1 delta refresh.]** **Remaining:** RB-13b (route by `draftFormat`), RB-16 (sim-tune harness), RB-18 (lineup-morale UI), the **G1 freeze writer** (the one §10 number NOT yet stamped — see L-ECON1/G1).
  - **R1** — format is a LEAGUE-WIDE choice (auction OR snake) applied symmetrically to BOTH MLB and farm drafts (no mixing).
  - **R2** — SNAKE = a CONDITIONAL v1 OPTION, not deferred: largely built (`LeagueBuilderSnakeDraft.tsx`, IV-priced, audit-confirmed); KEEP + add format-selector IF the farm-snake path + the toggle wire cleanly (VERIFY); FALLBACK = defer snake, ship auction-only.
  - **R3** — FARM AUCTION (new): scout-obscured value RANGES (§7.4 scout-range) + a SEPARATE walled-off farm budget (tiered juiced/standard/nerfed), distinct from the MLB wallet.
  - **R4** — SNAKE farm = existing slotted/tier-scaled prospect pricing (DSF). **R5** — bidding = OPEN ASCENDING. **R6** — INTERACTION MODEL: single iPad PASSED AROUND the room (hot-seat) — §7.5/§7.6 cover LOGIC not this UX → **the ONE genuinely net-new spec to author** (a focused UX spec).
- L-ECON2 not-started — tradeable draft picks (DSF-2); orthogonal, post-L-ECON1
- L-ECON3 not-started — farmGradeMode multiplicative Juiced/Standard/Nerfed skew (DSF-3); orthogonal, post-L-ECON1
- D4 not-started — salary-live UI de-gate; needs JK scope clarification on presentation in D6-gated panel

### Phase 6 — Hardening, sim gate & magnitude tuning
- **§16 / L-SIM HARNESS BUILT + HARDENED** ✅🔧 — the H1→H2→H3 sim-hardening arc is DONE (H1 8fbf08c3 · H2 58740327 · H3 820becfc/405506c1/49c60266/51f94ff7). The harness exists (`test-utils/lsim/seasonRunner.ts`, `soul.ts`, `falsification.ts`, `seasonRunner.scenario.ts`) and **caught + drove the fix of a real PRODUCTION bug** (95b4533d: season-end honor payouts were gated behind the cosmetic LLM nod via an early `continue`, so a transient reporter failure permanently skipped durable fame/morale game-state effects). **[was 'not-started' — STALE].** Caveat: no npm script; soul-invariant count drifts as L-tickets add invariants. **The FINAL full-matrix hard gate still pends — but 2 of 3 blockers are now cleared** (L13 tail L13-6/L13-7 + **L14** are BUILT-DARK as of 2026-06-21). **Remaining blockers: fame→morale wiring + L13-8.** ⚠ `SEASON_SIMULATION_REPORT.md` (2026-06-19) is **STALE** — it predates L13-6/L13-7/L14 and must be re-run (incl. the deferred multi-season / edge-league legs) after fame-wiring + L13-8 land.
- C4 in-progress — backup-parity hardening: re-scope guard to all ~22 DBs, reconcile syncConfig/manifest, wire export/restore UI, per-ticket backup DoD

### Phase 7 — Phase-1 gates: manual smoke & playable-V1 checkpoint (not-started)
- BROWSER-VERIFY in-progress — batched single-pass before D0/flag-flip; persistence/data-shape items (L2a/L9b/L10/L13-1 store migrations) lead
- D12 not-started — full Phase-1 iPad manual smoke (salary/designations/trades/farm/WPA/spray/playoffs/awards/summary live); JK browser gate; blocks D13
- D13 not-started — Playable-V1 internal checkpoint; needs D12 complete + JK explicit sign-off on expanded cut line
- D13-signoff not-started — confirmed NOT yet reached; D11 was last code ticket; D12 is the gap

### Phase 8 — Post-D13 activation & v1 ship (unverified/not-started)
- post-D13-activation unverified — Phase-2 flag-flip + activation seams (trait-confirm UI, ratings-confirm UI, stadium-apply, reporter-emission, morale/fame/designation-effects wiring); spec exists, NO implementation started (by design, dark-build parallel)
- F-138 not-started — offseason data-source ticket (flag-flip precondition); FRANCHISE_V1_OFFSEASON_EXECUTION_ENABLED stays FALSE until it lands
- v1-exit-playtest (F-141) not-started — iPad playtest exit gate of FULL living season; strictly after D13 + L-stack + L-SIM + auction + F-138/flag-flip; THE SHIP

---

## MODE-1 → MODE-2 LAUNCH READINESS (verify-or-build) — the closed blind spot

What Mode-1 must PRODUCE at franchise creation for the living season to run correctly. Sourced from the on-disk audits; each item carries status + file:line + which audit found it. **Legend:** BUILT = stamped/working · PARTIAL = present but wrong/incomplete · MISSING = absent · VERIFY = needs a code/design confirmation.

| # | Launch-contract / draft-process item | Status | Evidence (file:line) | Source audit |
|---|---|:--:|---|---|
| 1 | **Draft-IV True-Value baseline freeze (gap G1)** — the economy anchor; reconcile to **L-ECON1** (same IV-spine work — flag, do NOT double-count) | **OPEN (NOT closed by RB-7)** | RB-7 stamped settledSalary + player/fan morale at init (`franchiseInitializer.ts:736-754`) but **no distinct draft-IV**: `draftFreeze.ts` has no `iv` field, no `franchiseTrueValueSnapshots` checkpoint-0 row, `valueDelta=TV−salary` still collapses the two (`salaryCalculator.ts:1019`). Build the freeze writer against AUCTION finalize (checkpoint-0 row + additive settledSalary, GREEN seam) | Launch-readiness G1 · Draft-audit D3 · V1-delta-audit |
| 2 | **Personality taxonomy → canonical 7** (generator currently non-canonical → morale matrix silent-defaults) | **MOSTLY-CLOSED by RB-0** | generated prospects now emit full canonical-7 (`prospectScoutingDraftEngine.ts:291`, RB-0 B5 `0136598c`) — the `:247`/3-of-7 claim is STALE. Residual: STOCK/edited `SCHOLARLY` players silent-default RELAXED (`masterMoraleMatrix.ts:547`) while `useOffseasonData.ts:135` maps SCHOLARLY→TIMID → add SCHOLARLY + reconcile (small) | Launch-readiness G2 · Draft-audit D6 §2.B · V1-delta-audit |
| 3a | **Name SOURCE — SMB4 pool for ALL entities** (players/managers/GM/operating-scouts ✅; reporters + bridge-scouts ✗) | **OPEN (pure repoint)** | reporters invented at `narrativeEngine.ts:399-465` (⚠ roadmap's `reporterNameGenerator.ts:3-28` cite is WRONG — that file does NOT exist); bridge scouts `"Startup Farm Scout N"` (`leagueBuilderStartupFarmDraft.ts:299`), `"Franchise Setup Bridge Scout N"` (`franchiseStartupProspectDraft.ts:211`) → repoint to `data/smb4NameDatabase.ts` (already used by GM + operating scout) | Launch-readiness G3 · Draft-audit D6 §2.C · V1-delta-audit |
| 3b | **Name DISTRIBUTION — true randomization** (names repeat) | **PARTIAL** | repetition source = reporter generators (`Math.random`, no dedup); **subsumed by the source fix** (repoint to the 2756/2128 SMB4 pool fixes both) | Draft-audit D6 §2.C |
| 4 | **Staff re-pathing — Managers** (bare text field → ENTITY with attributes; a TYPE change, not just a wire move) | **NEEDS-BUILD/VERIFY** | manager = text field in League-Builder team-edit; Mode-2 L11 needs an entity w/ attributes + SMB4-pool name | Vision §3.5 (not in draft-audit body — VERIFY in code) |
| 5 | **Staff re-pathing — Reporters** (exhibition pre-game → FRANCHISE CREATION) | **NEEDS-VERIFICATION** | mechanism exists; re-path the trigger from exhibition pre-game → franchise creation (+ the §2.C name fix) | Vision §3.5 |
| 6 | **Staff re-pathing — Scouts** (draft-start hiring vs ongoing Mode-2 use — same or distinct?) | **NEEDS-VERIFICATION** | hiring + guidance BUILT on the FARM rail (`leagueBuilderStartupFarmDraft.ts:1273`, `prospectScoutingDraftEngine.ts:473`); MLB snake has none; the same-vs-distinct question is open | Vision §3.5 · Draft-audit D4 |
| 7 | **Stadiums — lock picker to stock SML set (R9)** *(re-scoped from "by VALUE")* | **OPEN (WIRING, by-value build moot)** | per R9 the by-value carry is UNNECESSARY — lock the free-text input (`LeagueBuilderTeams.tsx:1151-1159`) to the stock Super-Mega-League set so name-keyed re-derivation is safe (`parkFactorDeriver.ts:117-120` returns undefined for unknown names → silent loss today) | Draft-audit D1 §4.1 · R9 · V1-delta-audit |
| 8 | **Player-instance architecture** (one base + league-snapshotted instances, frozen at lock) | **PARTIAL** | healthy base-vs-instance shape via deep-copy (`franchisePlayerStorage.ts:512,560-566`), but lock freezes only `{id,iv,salary}` refs (`leagueConstruction.ts:25-43`); base Player stays mutable post-lock; no `lockedAt`/frozen instance | Draft-audit D2 |
| 9 | **Tier-IV scale defined-but-never-applied** (latent) | **NOT-A-GAP per R7** | IV is objective; tier scales the budget cap + farm-generation distribution, NOT per-player IV. `TIER_SHIFTS` unused on IV is correct-by-design. Only residual = FARM IV-distribution tier-shift (`FARM_NERF_SCALES` orphaned), gated on V9 grade-model ruling | Draft-audit D1 §4.3 · R7 · V1-delta-audit |
| 10 | **"Lock the league" step** freezing the draft pool | **PARTIAL** | "Register Pool" is re-runnable/overwritable, no lock flag (`leagueBuilderStorage.ts:851-866`; snake auto-regenerates `LeagueBuilderSnakeDraft.tsx:261`) | Draft-audit D1 §4.2 |
| 11 | **IV computation on locked pool vs budget tiers** | **NOT-A-GAP per R7** | per-player IV is objective + tier-flat by design (`useLeagueBuilderData.ts:407-417`); tier sets the cap, not the per-player transform — this is the intended model (see #9) | Draft-audit D1 §4.3 · R7 · V1-delta-audit |
| 12 | **Captain Charisma ≥70 floor** | **RESOLVED** | code was right; the spec was stale and has been corrected — no code change | Launch-readiness G4 · MODE2-completeness §2.5 |
| 13 | **Fame seed at launch** | **BY-DESIGN (v1 neutral)** | `fame:0` / modifier `1.0` (`franchiseSalary.ts:171,286`) — fame is an L6 Phase-2 system; confirm neutral-at-launch is the intended contract | Launch-readiness G5 |
| 14 | **AI/CPU picking** | **MIXED** | MLB snake MISSING (440 manual picks, `LeagueBuilderSnakeDraft.tsx:754`); farm startup BUILT (seeded headless); offseason DraftFlow BUILT but crude (`Math.random`) | Draft-audit D4 |

### PART D — "DID-THIS-SLIP?" CHECKLIST (JK gut-check)
Scan this and add anything still missing. Tags: **✅ VERIFIED-BUILT** · **🔨 NEEDS-BUILD** · **🔍 NEEDS-VERIFICATION**.

**Launch contract (what Mode-1 stamps at creation):**
- ✅ VERIFIED-BUILT — rosters/teams/stadium-snapshot/team-identity/ratings/salary-freeze deep-copied at launch (`franchiseInitializer.ts:570-680`)
- ✅ VERIFIED-BUILT — 4 hidden modifiers (canonical) backfilled + persisted at launch (`:658`)
- ✅ VERIFIED-BUILT — Captain assigned at launch (`:660`; Charisma-floor question RESOLVED)
- ✅ VERIFIED-BUILT — Fan Hopeful structural assignment (`:661`); checkpoint cadence persisted (`:664-670`)
- 🔨 NEEDS-BUILD — **draft-IV True-Value baseline freeze (G1)** [= L-ECON1 + the auction freeze writer]
- ✅ MOSTLY-CLOSED — **personality → canonical 7** (RB-0: generated prospects emit canonical-7 `prospectScoutingDraftEngine.ts:291`); residual = SCHOLARLY stock-player reconcile (small)
- 🔨 NEEDS-BUILD — **names: SMB4 pool for reporters + bridge-scouts** (pure repoint to `data/smb4NameDatabase.ts`; reporter path is `narrativeEngine.ts:399-465`, not the non-existent `reporterNameGenerator.ts`)
- 🔍 NEEDS-VERIFICATION — **fame seed neutral-at-launch** is the intended v1 contract
- 🔍 NEEDS-VERIFICATION — **stadium dimensions/park-factors by VALUE** (or accept name-keyed re-derivation)
- 🔍 NEEDS-VERIFICATION — **player-instance clean separation** + a frozen-at-lock instance

**Staff (consumed by Mode-2, must be assigned in Mode-1):**
- 🔨 NEEDS-BUILD — **Managers → entity with attributes** (TYPE change, not just re-path)
- 🔍 NEEDS-VERIFICATION — **Reporters re-pathed** exhibition pre-game → franchise creation
- 🔍 NEEDS-VERIFICATION — **Scouts**: draft-start hiring == ongoing Mode-2 need, or distinct?

**Draft process (the difference between STARTING and FUNCTIONING):**
- ✅ VERIFIED-BUILT — **AUCTION** (primary v1 format): war-chest budget, nomination, open-ascending bidding, CPU max-bid AI, UI/route/enum, headless sim — **BUILT-LIVE on mode1-v1-b** (RB-0..RB-15,RB-17; `tsc -b` 0). *(The two-number freeze writer's draft-IV half = G1, still owed.)*
- 🔨 NEEDS-BUILD — **hot-seat iPad pass-around UX spec (R6)** — the one net-new spec to author
- 🔨 NEEDS-BUILD — **LANE-MERGE** mode1-v1-b → franchise-v1-next (the #1 structural prerequisite — none of the above reaches Mode-2 without it)
- ✅ RESOLVED — **snake stays user-selectable in v1** (JK 2026-06-22); RB-13a picker BUILT; remaining = RB-13b routing
- 🔍 NEEDS-VERIFICATION — **symmetric format (R1)** applies to BOTH MLB + farm; **farm-auction (R3)** scope
- 🔨 NEEDS-BUILD — **MLB CPU autopick** (snake) if snake stays v1
- 🔍 NEEDS-VERIFICATION — **"lock the league"** true freeze; **tier-scaled IV** (or accept tier-flat); **salary-from-IV settle** during draft
- 🔍 NEEDS-VERIFICATION — **trade-value logic** (in-draft validator BUILT on snake rail; franchise three-way evaluator ORPHANED)

---

## FLAGS / DECISIONS NEEDED

> See **WAITING_ON_JK** below for the full batched set (the v1 draft cut is the load-bearing one).

- ❓ post-D13-activation: status 'unverified' PRESERVED — spec fully written (DSTACK §E + per-L-ticket contracts) but NO implementation started by design (build-dark parallel); all activation seams remain orphaned/flag-OFF as of 2026-06-20.
- ⬜ **D4 (salary-live UI de-gate)** — needs a JK presentation ruling for live-salary in the D6-gated panel.

---

## WAITING_ON_JK (batched — 2026-06-20 refresh)

> **2026-06-22 V1-DELTA UPDATE — resolved + newly-surfaced:** Item 1 (v1 draft cut) RESOLVED = AUCTION built + **snake stays user-selectable** (JK 2026-06-22). **Now-open decisions the delta audit surfaced:** (a) **lane-merge ownership/sequence** (the #1 structural gap — unowned); (b) **D-7c-2** — does the winning auction bid carry into Mode-2 cap/payroll? (most consequential economy call); (c) **D-10b-1** — shill-exclusion won-order denominator; (d) **V8** — park→WAR v1 boundary (STADIUM_ANALYTICS §1.0 "preview-only" vs vision §8.8 "v1-critical"); (e) **V9** — farm grade-model (round-keyed vs `PROSPECT_GENERATION_SPEC §3.2`), gates B9-equivalent farm validation + `FARM_NERF_SCALES`; (f) confirm the net-new §8.5/§8.6/DH/rookie scope into v1. ⚠ **`FRANCHISE_MODE1_MODE2_PLAYABLE_V1_GAP_ANALYSIS.md` is WHOLLY SUPERSEDED** (body last committed `9d586c10` 2026-06-09; every gap contradicted by the live L1–L13 stack + the auction build) — do NOT use it as a gap source.

> **STATUS UPDATE (2026-06-20, later session — Part-D walk + auction confirmation):** Several items below are now RESOLVED; the full roadmap refresh is intentionally DEFERRED to after the Mode-1 verification pass (`MODE1_V1_VERIFICATION.md`) lands (it will flip the launch-readiness rows to file:line BUILT/MISSING + add the costed Mode-1 build queue, so refreshing now = double churn). Resolved this session, captured in `MODE1_LEAGUE_BUILD_TO_DRAFT_VISION.md` §7–§8 (committed `2bd14763`/`02d11379`):
> - **Item 1 (v1 DRAFT CUT): AUCTION for v1** (JK confirmed).
> - **Tier model → R7:** IV stays OBJECTIVE; the tier scales the BUDGET cap + (farm) the generation distribution, NOT the per-player IV. REFRAMES launch-readiness #9/#11 — leaving IV tier-flat is CORRECT-by-design, not a bug.
> - **Scouts → R8:** ONE scout per team, same for draft + ongoing; fix the current two-scout-before-farm-draft bug.
> - **Stadiums → R9:** lock to the stock Super Mega League set → launch-readiness #7 collapses to a picker-lock (name-keyed re-derivation is then safe), no value-schema build.
> - **Morale → R10:** seeds at 50 (flagged NEEDS-VERIFICATION).
> - **NEW v1 scope (vision §8.5/§8.6):** pitcher game score (stats lane) + beat-reporter standout Q&A (living-season reporter lane).
> Until the refresh, treat vision §7/§8 as the live source for these decisions.

1. **THE v1 DRAFT CUT (load-bearing — gates G1's home + the freeze writer):** build AUCTION for v1 as scoped (vision §6), OR un-defer snake for v1 + auction → v1.1, OR a minimal auction (manual bidding UI + simple CPU max-bid reusing `assessSolvency`)? (`LEAGUE_BUILD_TO_DRAFT_AUDIT` WAITING_ON_JK A.)
2. **G1 economy anchor:** is frozen draft-IV a number DISTINCT from frozen salary (vision §2.A says yes)? Stamped at draft-finalize vs backfilled in `franchiseInitializer`? Stored as a per-player field vs a `checkpoint-0` row in `franchiseTrueValueSnapshots` (no DB bump → stays GREEN per the seam map)? And does G1's work fold into L-ECON1 or sequence separately?
3. **Tier-IV scale (latent):** apply the `TIER_SHIFTS` per-player IV transform for v1, or accept tier-flat IV (tier only sets spend budget)?
4. **Staff re-pathing scope:** confirm managers need a TYPE change (text → entity); confirm the reporter exhibition→franchise re-path; resolve scouts draft-start-vs-ongoing (same or distinct).
5. **Stadium by value:** carry actual `parkFactors`/dimensions through the snapshot, or accept name-keyed re-derivation (silent loss on unknown/renamed stadiums)?
6. **Names:** which pool is authoritative (`nameDatabase.ts` vs `smb4NameDatabase.ts`, or consolidate)? Repoint the 2nd reporter path (`narrativeEngine`) too, or deprecate as legacy GameTracker-only? Enforce a personality↔modifier pairing rule when pinning to canonical 7, or independent generation for v1?
7. **IV_ENGINE §-tags:** ratify the v1.5→v1 retag of `IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md` §7.5/§7.3 to make auction v1 official in the source spec.

---

## FULL PER-TICKET STATUS (evidence-backed)

| Ticket | St | Title | Evidence / Outstanding |
|---|:--:|---|---|
| D1 | ✅ | Adaptive-standards confirm + close 162 hardcode | `752882f1` useSeasonStats.ts 162→MLB_BASELINE_GAMES |
| D2 | ✅ | Backup/restore parity: register 3 franchise stores + parity-guard | `2fab709f` backupRestore pin 12→15; parity-guard green |
| D3 | ✅ | Browser-verify backlog clearance | marked CONFIRM-ONLY; JK browser sign-off on real data |
| D5 | ✅ | TEAM_MVP/ACE warConsumerTrust contract verify | warConsumerTrust green 51/51 |
| D6 | ✅ | True Value/value-delta TRUST PROMOTION gate | D6a `4a1bd36` + D6b `6559a196`; both Opus-audited VERIFIED |
| D7 | ✅ | Designations LIVE + reconcile + DesignationEvent | D7a `013d8861` + D7b `abfa1671` + L7c/L7d |
| D8 | ✅ | Award-trust gate (trustedForAwards/finalWarTrusted) | `14c90fd4`; award-trust booleans COMPUTED |
| D9 | ✅ | Real awards 6 categories + AwardsWatchlist | D9a→D9d-2 through `c229733` |
| D10 | ✅ | Mode-2 season summary/manifest finalization | `51e487a`; SeasonSummary LEAGUE awards + manifest fix |
| D11 | ✅ | UI live-label sweep (de-gate D-stack UI) | `5eaf9d96` — LAST D-stack code ticket |
| L1 | ✅ | Personality & hidden-modifier substrate | `d48ab3ce` |
| L1.5 | ✅ | Captain initial assignment at Mode-1 finalization | `2f4f3e56` (L1.5+OD-1) |
| L2 | ✅ | Franchise-instance mutable layer + two-tier confirm | L2a `6fdeba11` / L2b `e8ec0908` / L2c `a77e0ed5`; trackerDb v21 (overlay read-loop closure deferred post-D13) |
| L3 | ✅ | Master Morale Matrix + morale ledgers | L3a `5b1431dc` / L3b `d46a0710` |
| L4a | ✅ | Reporter base-connect + publish-bus foundation | `0cf4ca29` + `80749764`; SeasonNewsItem store v17 |
| L5 | ✅ | Fan morale teeth (dampener/flashpoint/trade-req/reporter-heat) | L5a..d `428f7cb`/`5ebb148`/`8cd2cc1`/`e061e51` |
| L6 | ✅ | Fame system (nine-tier, Heat/Reach, four-layer) | L6a `7359cbf` / L6b-1 `3b36d35` / L6b-2 `5a7685a` (3 fame-wiring taps still open — see fame-wiring row) |
| L7 | ✅ | Designations Phase-2 (Fan Favorite/Captain/Fan Hopeful) | L7a..L7d-2 `0a59a24`…`aec5db99` |
| L8 | ✅ | Ratings checkpoints (first real WRITER through L2) | L8a `cfdd7752` / L8b `cd9e4589` |
| L9a | ✅ | Traits enrichment capture surface | L9a-1..4 `e28706e9`/`32244393`/`acce899c` |
| L9b | ✅ | Traits-from-reality engine (16 traits) | L9b-1..3c `398533d1`…`e8afc08d` |
| L10 | ✅ | Random events (engine/store/hook/resolver/reporter) | L10-1..5 `607fa015`…`52db0ade` (OLD checkpoint cadence — see L10-rework) |
| checkpoint-cadence | ✅ | Binary Standard/Frequent shared cadence as a league setting | `39f65a17` (verified-complete `0aac83e9`); additive, build-dark; shared by ratings-dev + traits + L13 |
| L11 | ✅ | Manager firings (relief bump, ripple, Almanac legacy, GM valve, auto-backstop) | L11-1..5 `46c3c761`/`1821ad21`/`4c59ecbd`/`7268f9f1`/`3e718e4f`/`f77b3c75`; wired `processCompletedGame.ts:666`; build-dark **[was ⬜]** |
| L12 (1–5) | ✅ | Race system + All-Star + player Awards PAYOUT layer | L12-1 `e9f43132` (v24) · L12-2 `79da652b` · L12-3 a/b/c/R · L12-4 a–d · L12-5 a–e (COMPLETE `fb120400`); build-dark **[was ⬜]** |
| L12-6 | ⬜ | Race/award/All-Star UI surfacing + allStarSelections counter | LAST L12 piece: feed flag-off All-Star UI from real builder; surface races + new categories in AwardsWatchlist; deferred career counter |
| L13 | 🔧 | Relationships-lite + reporter accuracy (tail in-progress) | Built-dark L13-1 `7b9c92fc` / L13-2 `b18031b7` / L13-3a `f737c67e` / L13-4 `915dbf6d` / **L13-5 keystone `c724fc7f`** (morale tap LIVE `masterMoraleMatrix.ts:434`) / **L13-6 `6dd00141`** (charged-matchup morale, built-live flag-dark) / **L13-7 `34bdd76e`** (reporter integration, build-dark). **Remaining: L13-8 (contract AUTHORED, build HELD — `PROMPT_CONTRACTS.md:14049`) + L13-3b (deferred-logged)** **[L13-6/7 were 'contracts authored' — now BUILT]** |
| L14 | ✅ | Rebrand/relocation circuit-breaker | **BUILT-DARK COMPLETE** — L14-1 `9f848296` / L14-2a `79cb7a7c` / L14-2b `ed1cf4ef` / L14-3 `a13deb5f` (2026-06-21). Flag `franchisePhase2Flags.ts:109`; `franchiseRebrand{Dwell,Cascade,Apply,Offer}.ts`; no live consumer (activates post-D13) **[was ⬜ MISSING — STALE]** |
| fame→morale wiring | ⬜ | Fame layer-2/§20.5/§20.6 A/B taps (3 RULED-v1 gaps) | `applyWarLegitimacyGravity` ORPHANED (`fameModel.ts:161`); no fame term in masterMoraleMatrix; Channel A/B producers MISSING. RULED v1 — WIRE before flag-flip (MODE2_V1_COMPLETENESS §2.3) |
| trade-req propensity | ⬜ | Wire `tradeRequestGeneration` into L10 `trade_demand` | Engine complete but ORPHANED (`tradeRequestGeneration.ts:77`); L10 flat dice-split (`franchiseL10EventEngine.ts:331`). WIRING (cheap) not BUILD (MODE2_V1_COMPLETENESS §2.4) |
| L4b | ⬜ | Matrix-sourced season takes (reporter narrates L3 events) | L3 + L4a bus deps met |
| L-ECON1 | ⬜ | Unified relative-to-pool salary scale (DSF-1) + tier-IV scale + G1 draft-IV freeze | Connect `TIER_SHIFTS` (latent `tierParams.ts:36-40`) into pool-IV; derive `(tier,pickValueChart,draftSlot)→price`; stamp the frozen draft-IV baseline (G1). Must land BEFORE the v1 draft/salary freeze |
| AUCTION | ✅ | Auction draft (PRIMARY v1 format) | **BUILT-LIVE + routed on `codex/mode1-v1-b`** (RB-0..RB-15,RB-17; prospect-gen B1–B9 + AUC-5.1 complete; `tsc -b` exit 0). `auctionStateMachine.ts`, `useAuctionDraft.ts`/`useFarmAuctionDraft.ts`, `App.tsx:304-309`, shill market, luxury tax, MLB→farm carryover, roster board, scout-privacy, coach UX, format picker, one-chance nomination **[was ⬜ 0 lines — STALE]**. Remaining: RB-13b, RB-16, RB-18, the G1 freeze writer + R6 hot-seat UX spec |
| LANE-MERGE | ⬜ | **Merge `codex/mode1-v1-b` → `codex/franchise-v1-next` (#1 structural prerequisite — UNOWNED)** | `franchise-v1-next` has ZERO auction code (grep-confirmed); the entire auction/prospect/freeze/morale build lives ONLY on mode1-v1-b. NO merge ticket in roadmap or `AUCTION_REBUILD_PLAN` until now. Gates D12. See the lane-merge ticket in `AUCTION_REBUILD_PLAN.md` |
| RB-13b | ⬜ | Route the draft flow by `draftFormat` | design-gated: `draftFormat` persisted but inert (`getLeagueDraftFormat` 0 prod callers); no global active-league anchor; both pages self-pick `leagues[0]`. Snake-stays-selectable RULED 2026-06-22; only the routing model fork remains |
| RB-16 | ⬜ | Sim-tune sweep + draft-economy validation harness | Captain-run, large. No sim-tune file exists; all §11/§13 dials default-set, unswept; absorbs deferred §5.3 EV-flatness + §2.3 surplus checks. Mode-1 economic confidence depends on it |
| RB-18 | ⬜ | Live lineup-morale UI | `moraleDisplay.ts` shipped build-dark (RB-17), imported by nothing until RB-18; gated on the live morale path (post-flag) |
| B8 | ⬜ | Prospect age generation (§10 reversal) | fixed-age B8 shipped `87331ae0` (age=18); JK's 2026-06-22 §10 reversal — generate skew-young revealed age — UNBUILT (`prospectScoutingDraftEngine.ts:416,1118` still hardcodes 18) |
| NET-NEW v1 | ⬜ | §8.5 pitcher game score · §8.6 beat-reporter standout Q&A (+§8.1 pronoun) · R6 hot-seat UX spec · DH-removal · rookie≠Fan-Hopeful flags | all specced-intent-only / unbuilt (grep across both worktrees = 0). §8.5 = stats lane; §8.6 = reporter lane; DH-removal = pitchers always bat; rookie flag set on first call-up of a farm-drafted player |
| snake (R2) | 🔧 | Snake as user-selectable v1 option (RULED 2026-06-22) | Snake STAYS selectable (JK 2026-06-22; §9:411 wins the §9.A tension). Largely built (`LeagueBuilderSnakeDraft.tsx`, IV-priced); RB-13a format picker BUILT (`aa1bf805`). Remaining = RB-13b routing-by-`draftFormat` + MLB CPU autopick if snake chosen |
| Mode-1 launch contract | 🔨 | Personality→canonical-7, SMB4 names (reporters/scouts), stadium-by-value, player-instance, staff re-pathing | See § MODE-1 → MODE-2 LAUNCH READINESS table + checklist for per-item status/file:line/source |
| L-ECON2 | ⬜ | Tradeable draft picks (DSF-2) | post-L-ECON1, orthogonal |
| L-ECON3 | ⬜ | farmGradeMode multiplicative skew (DSF-3) | post-L-ECON1, orthogonal |
| §16 / L-SIM | 🔧 | Simulation Gate harness (BUILT + hardened; final gate pends L14) | H1 `8fbf08c3` / H2 `58740327` / H3 `820becfc`+`405506c1`+`49c60266`+`51f94ff7`; caught prod bug `95b4533d`. Files `test-utils/lsim/*`. Final full-matrix gate cannot close until L13 tail + L14 + fame-wiring built **[was ⬜]** |
| C4 | 🔧 | Backup-parity hardening (all-DB guard + export/restore UI) | re-scope guard to ~22 DBs; reconcile syncConfig/manifest; wire UI; per-ticket DoD |
| L10-rework | 🔧 | L10 Q5/Q8 rework (continuous cadence + name-change catalog) | refactor L10-1/L10-3 to fire continuously; add name-change to dark catalog |
| L9b-2 | 🔧 | L9b trait-measurement REBUILD (R-E→R3; 16→~50 traits) | thread ratings/grades into builder; charisma in combiner; re-evaluate-to-drop; build-DARK |
| BROWSER-VERIFY | 🔧 | Manual sign-off gate (batched single pass) | persistence/data-shape items lead (L2a/L9b/L10/L13-1 migrations) |
| post-D13-activation | ❓ | Phase-2 flag-flip + activation seams | spec exists; NO implementation started (by design); all seams orphaned/flag-OFF |
| D12 | ⬜ | Full Phase-1 iPad manual smoke | JK browser gate; blocks D13 |
| D13 | ⬜ | Playable-V1 approval (JK sign-off) | needs D12 + sign-off; triggers post-D13 activation |
| D13-signoff | ⬜ | Has D13 sign-off happened? | NO — D11 last code ticket; D12 is the gap |
| D4 | ⬜ | Salary-live UI de-gate | JK presentation ruling needed |
| F-138 | ⬜ | Offseason data-source ticket (flag-flip precondition) | OFFSEASON_EXECUTION_ENABLED stays FALSE until it lands |
| v1-exit-playtest (F-141) | ⬜ | iPad playtest exit gate (THE SHIP) | after D13 + L-stack + L-SIM + auction + F-138/flag-flip |
