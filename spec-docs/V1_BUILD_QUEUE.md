# V1 BUILD QUEUE — dependency-ordered execution backlog

**Created:** 2026-06-22 (JK request). **Purpose:** the explicit ordered backlog the autonomous build loops consume.
**Companion to:** `ROADMAP_TO_V1.md` (status/what) — this doc is the **sequence/when**. Per-item detail lives in the cited specs.
**Discipline:** Codex-built → Opus-audited (builder≠auditor) → `NODE_ENV= tsc -b` + full suite, zero-new-reds, branch-only. All magnitudes are §16 sim-tune placeholders.

> ## ⚠ STATUS BANNER (2026-06-26 — the inline ✅ below are PARTLY STALE; the LIVE done-truth = `AUTONOMOUS_RUN_LOG.md` newest block + `CURRENT_STATE.md` + `HANDOFF_NEEDED`).
> **DONE since this doc was written (not all reflected inline):** the ENTIRE trait wave — A-W3 `T-1..T-7` (incl. T-3/T-6/T-7 done 2026-06-26) + A-W3.5 dormant-trait wave `T-9` + `DT-B/C/D/E/F` (+ DT-FIX, BF-MH, CAP-MISS) · the whole `RA-2c` ratings-adjustment arc · `RA-1/RA-5/RA-8/RA-rookie/RA-9/V8/RA-12` · `A1.5a/b/c` · the Mode-1 LANE-MERGE (`87a59ec0`) · the **Lane-C ratings MERGE (`0c2b4a04`, 2026-06-26)** folding A2.5/RA-5/RA-9/V8 into MAIN.
> **CURRENT PHASE = the BUTTON-UP BUILDOUT** (JK ruled 2026-06-26, attended). Remaining BUILD tail (all build-dark, on MAIN): ratings — **§6A convex curve** (A2.5 remainder), **RA-7** park-adjust, **RA-10** bench-IF/OF split, **RA-11** (standalone per JK), **re-grade-per-checkpoint**; living-season — **A1.3a→A1.3b** trade-demand (A1.3b incl. a JK-authorized trackerDb bump), **A1.4** L12-6, **A1.5** L4b, **A1.5d** stadium records; user-visible (flag for JK sign-off) — **A1.5b-2**, **T-6b**. Then the ship gate-chain (L-SIM final → RB-16 → D12 → D13 → flag-flip → F-141).
> **⚠ PAUSED — DO NOT TOUCH/MERGE (JK):** the Mode-1 draft + auction-UX side branches `codex/draft-pipeline-fix` + `codex/auction-draft-ux-rehaul` (a first-principles draft-setup + auction UX redesign that SUPERSEDES parts of the B-W scouting/draft items below). The button-up queue is FILE-DISJOINT from them → safe concurrent (partition proof in the ledger). Treat the B-W tickets that those branches rework as SUPERSEDED-pending-JK, not fresh builds.

## TOPOLOGY — two concurrent branches, one committer each
- **BRANCH A = living-season** — worktree `/Users/johnkruse/Projects/kbl-tracker`, branch `codex/franchise-v1-next`. Owns: Lane 1 (L-stack tail) + Lane 4A (ratings) + Lane 4D (traits) + the **4E DH removal master** (this is the merge target).
- **BRANCH B = Mode-1** — worktree `/Users/johnkruse/Projects/kbl-mode1-b`, branch `codex/mode1-v1-b`. Owns: Lane 2 (RB tail + G1) + Lane 4B (prospect) + Lane 4C (scouting).
- The two are **near file-disjoint** (only 2 overlapping `src/` files today). They build in parallel and **converge once** at the LANE-MERGE → then the gate chain.

## CHOKEPOINTS — single-owner, never parallel-bump (restated)
`TRACKER_DB_VERSION` + store-list pins (one owner bumps; others rebase) · the frozen `iv_oracle.json` (oracle-affecting tickets serialize) · the `Position` type defs (4E DH — done on Branch A, propagated to B) · `prospectScoutingDraftEngine.ts` (Branch B only; 4B then 4C serialize on it).

---

## BRANCH A — living-season (`codex/franchise-v1-next`)

### A-W0 — foundation (do first)
| Order | Ticket | What | Source |
|---|---|---|---|
| A0.1 | ✅ **4E DH FRANCHISE-SEAL DONE** (`2550d3cf`) — Ron Charles→LF + `season.useDH:false` forced in persisted config + playoff `?? false` (latent bug fixed); exhibition/elimination/types/oracle untouched; full suite zero-new-reds. *(was:)* Full removal = ~108 files (Codex blocked the narrow attempt). **v1 = seal the FRANCHISE pipeline only** (Mode 1+2); exhibition keeps DH (verified isolated — no franchise-store writes). **Leak audit → exactly 4 seals:** (1) `franchiseInitializer.ts:143` stamp `useDH:false` for v1 (the single rules-snapshot source → all downstream reads inherit); (2) `FranchiseHome.tsx:937` `playoffUseDH ?? true` → `?? false` ⚠ **REAL latent bug — playoffs default DH ON today**; (3) `yankeesPlayers.ts:70` Ron Charles `DH→LF` (the ONLY stock DH player); (4) hide the DH toggle in franchise league setup (keep in exhibition). LEAVE the inert `'DH'` type member; shared-engine DH branches only fire if a DH exists → never in a sealed franchise. ~6-8 files. Non-blocking. Full type cleanup = post-v1. | `RATINGS_ADJUSTMENT_SPEC §13` + JK 2026-06-22 |

### A-W1 — Lane 1 tail (the L-SIM blockers first)
| Order | Ticket | What | Blocker it clears |
|---|---|---|---|
| A1.1 | ✅ **L13-8 CLOSED** (JK 2026-06-23) | wiring already SUBSUMED by L13-3a..6 (`processCompletedGame.ts:648-664` gates formation[checkpoint]/intensity/morale+charged behind the L13 flag; added by `f737c67e`; orphan-checked all 3 wired). Standalone proof-test WAIVED — L-SIM (flags-on) + per-compute tests + the L-SIM final gate are the proof. | L-SIM blocker CLEARED |
| A1.2 | **fame→morale wiring** | 3 RULED-v1 taps: wire `applyWarLegitimacyGravity` (`fameModel.ts:161`); add the §20.5 fame→player-morale term to `masterMoraleMatrix.ts:426`; build §20.6 Channel A/B fan-morale producers | L-SIM blocker |
| A1.3 | ⚠ **NOT cheap — `large-feature-needs-split` + 5 JK forks** (grounding `wf_8556b1a7`, 2026-06-23) | The propensity engine (`computeTradeRequestPropensity`, orphan), the flashpoint tax (`computeFlashpointGameTax`, kind-agnostic, accepts `trade_demander`), and the `TRADE_DEMAND` morale row (`masterMoraleMatrix.ts:405-407`, unfed) are all PRE-BUILT but UNCONNECTED. **A1.3a** (contained, gable now): wire `computeTradeRequestPropensity` as a post-roll FILTER on L10 `trade_demand` candidates per the engine's `:17` contract — thread **loyalty+teamId** onto the L10 candidate (`franchiseL10EventEngine.ts` type + `franchiseL10SweepCompute.ts resolveL10Candidates`). **A1.3b** (forks-first): define a persisted 'confirmed demander' source (the flashpoint runs at `processCompletedGame.ts:627` BEFORE L10 `:665`, so it reads a PRIOR-game state — **possible trackerDb bump**), fill the `franchiseFlashpointDecayCompute.ts:95` seam, add the `TRADE_DEMAND` morale emitter (`processCompletedGame.ts:382-430` pattern). **5 JK forks:** (1) demander source-of-truth (new store / designation type / applied-overlay) · (2) flashpoint-tax vs one-shot-morale vs BOTH · (3) albatross↔trade_demander row-key collision (`[fr,sn,scope,playerId]`, no `kind`) · (4) resolution/counter-reset event (else tax never ends) · (5) intensity source + shared-vs-split tuning. | deferred — needs JK forks |
| A1.4 | L12-6 | race/award/All-Star UI surfacing + `allStarSelections` career counter | — (interleavable) |
| A1.5 | L4b | matrix-sourced season takes over the L4a bus (deps L3+L4a met) | — |

### A-W1.5 — SMB4-native ratings infra + fame-fix + stadium records (NEW, 2026-06-23 — hard dependency order)
**Source:** `RATINGS_MEASUREMENT_WORKSHEET.md` (§9) + `STADIUM_ANALYTICS_SPEC_V2.md` (§1/§2/§4-10) + `DECISIONS_LOG` 2026-06-23 (the model rulings + the 11-fork sweep). All build-dark, no `TRACKER_DB_VERSION` bump. **Author the 4 contracts in `PROMPT_CONTRACTS.md` before dispatch.**
| Order | Ticket | What | Hard gate |
|---|---|---|---|
| A1.5a | **FAME-FLUCTUATION FIX** (do FIRST) | remove the per-game `updateReachFloor` ratchet (`franchiseFameCompute.ts:109`); flat-pin the honor floor `= max(existing, REGIONAL_STAR)` (`franchiseHonorReachFloor.ts:33`); **UPDATE the L-SIM fame soul-invariants in the SAME diff** (retire "upward-only-for-everyone", add "non-honored tier can fall") + re-run L-SIM. Confirm trade→neutral nudge. | gates stadium records + the final L-SIM |
| A1.5b | **CARRY CONVERTER** (shared) | `src/engines/` deterministic `ballLocation{x,y} + ParkDimensions → park-adjusted carry feet`, air-balls-only; **HR distance is user-entered, NEVER inferred**; **one infield-dirt radius CALIBRATED to the SVG field image** (IF/OF split + grounder-carry=0); REPLACE the random `estimateDistance` (`fieldZones.ts:735-809`). | feeds ratings Power AND stadium distance records |
| A1.5c | **4 SEASON AGGREGATORS** (zero new capture) | UBR (RunnerSubEntry→AdvancementStats; `calculateUBR` unfed at `rwarCalculator.ts:458`) · *ByPosition difficulty-weighted fielding (RULED play-type ladder, `eventLog.ts:413-427`) · extraBasesAllowed (OF arm) · catcher-CS-with-discount (reconcile w/ RA-8). | light Speed/Fielding/Arm signals; alongside RA-2b |
| A1.5d | **STADIUM RECORDS** (LAST) | the §4 catalog + the 6 living-season hops (changes[] upsert → fame-swap polarity → fan-morale + home-park-rival 2× → reporter → Almanac → HISTORY rivalry edge) + the §8 stat-display layer (parallelizable). New `isFranchisePhase2StadiumRecordsEnabled` (default false). | needs A1.5a + A1.5b + WPA archive (own db, no DB bump) |

### A-W2 — Lane 4A ratings (RA-1 keystone gates the rest)
| Order | Ticket | What | Note |
|---|---|---|---|
| A2.1 | ✅ **RA-1 expected-stats engine DONE** (`81c9fe25`) | pure build-dark `src/engines/expectedStatsEngine.ts` — multiplicative (JK-confirmed) `poolMean × curve-ratio` + peer-SD z-score + min-sample gating; no consumer; full suite zero-new-reds. **RA-2 must add a sim-tune curvature check before wiring live.** | everything in 4A depends on it |
| A2.2 | **RA-8 catcher CS/SB fields** | additive `PlayerSeasonFielding` (no DB bump) | **early — unblocks Branch A T-6** |
| A2.3 | **RA-rookie** | `draftedAsFarmProspect` + `rookieStatus` + window-clear + ROOKIE badge (`§13B`) | additive; gates RA-5's rookie modifier; both worktrees |
| A2.4 | RA-2 / RA-3 / RA-4 | peer-calibrated signal (replaces `valueDelta` `franchiseCheckpointSweepCompute.ts:184`) · per-category fan-out · position-pool calibration. **GROUNDED + 4 forks RULED 2026-06-23** (DECISIONS_LOG; `wf_1598c5dc`) → SPLIT: **RA-2a ✅** (`64addf71` category-rate adapter) → **contact-quality data+signal layer** (JK ruled INTO v1; `wf_99285199`) → **RA-2b** (pure pool aggregator, §4 ~55% sticky grouping + winsorized SD + ladder) → **RA-2c** (live wiring + weighted fan-out, in-place/no-flag/no-DB-bump). RULED: signal→existing linear move now (dark), §6A=A2.5 blocking-before-flag-flip, weighted-blend (§16 default-equal), TV 0.40 decoupled-stays. | after RA-1; RA-4 after A0.1 (DH) |
| A2.5 | RA-5 / RA-6 / RA-7 | age/edge/equilibrium · season-scaled min-sample+confidence · per-game park-adjust | after RA-1/RA-2 |
| A2.6 | RA-9 / RA-10 / **RA-11** | cadence+trend · bench-IF/OF split · pitcher non-pitching §4A. **RA-9 SPLIT: RA-9a ✅** (`c56d1c8e` trend-tilt engine foundation — recent-signal blend, default-identity/build-dark) → **RA-9b** (sweep recent-window category-rate aggregation that supplies the recent signal — needs a NEW windowed event aggregator; no DB bump). | **RA-11 ⇔ Branch-B B14: spec-pin the shared over-expectation signal** |
| A2.8 | **V8 park→WAR (seed wiring)** | thread SEED/geometry park factors into bWAR (dead consumption branch `bwarCalculator.ts:229-243`, keep homePA-only guard) + ADD an `options.parkFactor` to `calculatePWAR` calling `applyPitcherParkFactor` (FIP-adjust before the leagueFIP diff) + the 40%-season gate. **§9.D re-confirmed JK 2026-06-26** (DECISIONS_LOG); NO oracle/DB/store touch; Lane-C-disjoint. ⚠ bWAR uses a `floor(pa/2)` 50/50 home/road approximation until the per-game home/road data-retention item lands (JK accepted); pWAR exact; adaptive layer stays deferred. | after RA-9b; the "conflict" was a stale snapshot artifact, not live |
| A2.7 | RA-12 | retire Model B/C + award-luck (the "consolidate 4→1") | last in 4A |

### A-W3 — Lane 4D traits (extends built seams)
| Order | Ticket | What | Note |
|---|---|---|---|
| A3.1 | T-1 / T-2 | 80%-value/20%-scarcity `traitWeight` · 4 pos + 3 neg tiers | foundational |
| A3.2 | ✅ **T-3 DONE** (SP/RP split `3ecbc6c0` + trend engine `0df09fda` + trend sweep `e3b7e76d`, 2026-06-26) | trend factor + SP/RP cohort split w/ min-peer fallback (`§4A`) — build-dark, zero-new-reds | — |
| A3.3 | **T-4** | generation weighting `genWeight=1−traitWeight`, neg 0.27, exclude Sign Stealer/Stimulated | **T-4 ⇔ Branch-B B13: build `traitWeight` once, spec-pin** |
| A3.4 | T-5 | resolution layer: value tiers + incumbency β=1.25 + seeded margin likelihood (`§8B`) | — |
| A3.5 | ✅ **T-6a DONE** (`31afa050`, 2026-06-26) | position-mismatch protect (Cannon Arm at IF; suppress self-loss + keepScore boost). ⚠ **Did NOT delete Noodle Arm** — that line is SUPERSEDED by DT-D (re-added as mental-error). **T-6b (scout/analyzer flag display) = the remaining user-visible half**, deferred to a browser-verified pass. | **(RA-8 already done)** |
| A3.6 | ✅ **T-7 DONE** (`7340ca18`, 2026-06-26) | EOS = one more checkpoint — Captain-verified ALREADY-SATISFIED in engine (final game is always the last grid checkpoint, test-pinned); doc reconciliation + superseded Trait Wheel Spin. No engine change. | last |

### A-W3.5 — Lane 4D-W2 DORMANT-TRAIT ENABLEMENT (NEW, JK-ruled 2026-06-25; matrix = `TRAIT_MEASUREMENT_SPEC §0.6b`, rulings = `DECISIONS_LOG` 2026-06-25)
> Moves **25** previously-dormant traits → earnable. Capture + difficulty (`assignTier`) already exist; each group = **write the signal builder + min-sample valve + BUILDABLE wiring** (template = T-9 elite pitches). ALL build-dark, **opt-in** (fires only on user-tagged data), **FULL suite** (the candidate builder feeds `franchiseTraitGrantCompute`→`processCompletedGame` mock-load). Status: ✅ **THE WHOLE A-W3.5 DORMANT-TRAIT WAVE IS DONE** (2026-06-26) — T-9 (a `a7932007`/b `6f3fc727`/c `e95aba07`) + DT-B `2596b2c8` + DT-C1 `e33aed1e`/C2 `44ababfb` + DT-D `6d88b228` + DT-E `2a44cc2a` + DT-F1 `1d74050c`/F2 `ed9e003e`/F3 `40cdf4c1` + DT-FIX-1 `22786153`/2 `71727e5b` + BF-MH `80586ce0` + CAP-MISS `41cb5a66`; T-4c gen-side `7956eee9`. All build-dark / zero-new-reds.

| Wave | Ticket | What | Notes / gate |
|---|---|---|---|
| 4D-W2 | **T-9 (A pitch-type)** — START HERE (template) | per-pitch net-quality aggregator (K+ / BB− / hit−− / **HR−−−**) from `enrichment.pitchType`, on-the-fly from at-bat events **(NO DB bump)** → wire 8 Elite pitches + Fastball{4F,2F,CF}/Off-Speed{rest} Hitter into `BUILDABLE_TRAITS` + per-pitch reality signal + min-sample valve + **engine-side max-1 Elite-pitch mutual-exclusion** in `reconcileGainProposals` | grounded `wf_54f5c51e-b82`; SPLIT a (aggregator) / b (signal+BUILDABLE) / c (engine max-1 + shared `ELITE_PITCH_TRAITS` const, refactor T-4c's set to import it) |
| 4D-W2 | **DT-B (pitch-location)** | net-outcome on `enrichment.pitchLocation` (low/high/inside/outside) tagged ABs → High/Low/Inside/Outside Pitch (hitter) | reuses the A net-outcome scorer |
| 4D-W2 | **DT-C (diving/chase)** | Magic Hands (web-gem + **fielding<80**) · Dive Wizard (web-gem + **arm>80**, co-holdable) · Bad Ball Hitter (hits-on-chase ÷ hits+outs-on-chase) | ⚠ NEW **rating-gate** mechanism (engine is performance-only today) |
| 4D-W2 | **DT-D (errors)** | Wild Thrower (throwing errors) · **Noodle Arm RE-ADDED** = mental errors (`enrichment.errors[] type:'mental'`, league-leader) | reverses the §0.6 Noodle-Arm cut |
| 4D-W2 | **DT-E (mojo)** | Volatile (many mojo changes) / Consistent (few) | confirm `mojoEngine`/team-hub exposes a per-player change count |
| 4D-W2 | **DT-F (bespoke)** | Base Jogger (REVERSE `addBaseRounderSignals`) · Metal Head (**pitcher**-victim of KP/nut-shot, protective) · Wild Thing (WP-advance + `WP_K`) · Workhorse (IP/game, ELITE, SP/RP-split) | Metal Head: verify the pitcher-keyed enrichment KP/nut-shot field at build |

> **CUT (no work):** Sign Stealer, Stimulated. **A/B scoring formula** ratified (DECISIONS_LOG 2026-06-25 / §0.6b). **Note:** ✅ A-W3 (T-1/T-2/T-3/T-4/T-5/T-6/T-7) is COMPLETE (2026-06-26). T-6 = T-6a (engine protect, done) + T-6b (scout/analyzer flag display, deferred to a browser pass). Noodle Arm was KEPT (DT-D re-add), not deleted.

### A-W4 — Branch-A L-SIM pre-gate
Run the soul-invariant L-SIM after A-W1 + A-W2 + A-W3 land (it now also exercises the new development/trait checkpoints). The **final full-matrix gate** is post-merge (see CONVERGENCE).

---

## BRANCH B — Mode-1 (`codex/mode1-v1-b`)

### B-W0 — foundation
| Order | Ticket | What | Source |
|---|---|---|---|
| B0.1 | **DH types in** | merge/rebase the 4E Position-type commits from Branch A so both trees agree (generator/scouting already operate no-DH at data level). | (propagated from A0.1) |
| B0.2 | ✅ **G1 freeze writer DONE** (`40f876d7`) | draft-baseline `franchiseTrueValueSnapshots` row per drafted player — MLB roster **+ farm prospects** (`statsScopeId:'draft-baseline'`, trueValue=iv, valueDelta=iv−settledSalary, warPercentile=0). NO trackerDb bump (version-pin green). Full suite zero-new-reds. **Closes launch-gap G1.** | `ROADMAP §L-ECON1/G1` · `MODE1_V1_VERIFICATION V12` |

### B-W1 — Lane 4B prospect (serialized on `prospectScoutingDraftEngine.ts`)
| Order | Ticket | What | Note |
|---|---|---|---|
| B1.1 | ✅ **B8 age DONE** (`30359ae4`) | seeded band-weighted draw (`PROSPECT_AGE_BANDS` .40/.30/.18/.08/.04, own seed namespace `:age:band`/`:age:within` — RNG-isolated, B9+chemistry goldens unchanged); reveal in farm-auction UI. Focused gate PASS (histogram on-spec, age-grade corr 0.0037); full suite confirming | **unblocks 4C S5** |
| B1.2 | B6 | position-appropriate trait pools (DH/closer/two-way carve-outs); fix `Workhorse`; retire orphan `traitPools.ts` | small |
| B1.3 | ✅ **B12 archetype layer DONE** (`7d817965`) | §5.6 archetype-bias families × randomized magnitudes, own `:archetype:*` seed (RNG-isolated → B9 round-trip + §13 distribution + chemistry invariants all green); solver re-grades; convergence-guard re-draw; `archetypeFamily` persisted. Full suite zero-new-reds. *(1-iter BLOCK→fix golden regen, RB-14 pattern)* | **unblocks 4C S5**; the uniqueness lever |
| B1.4 | **B13 grade/scarcity traits** | §5.5b weighted draw, reuse analyzer impact coeffs | **B13 ⇔ Branch-A T-4: shared `traitWeight`** |
| B1.5 | **B14 pitcher non-pitching** | decouple grade shift (VEL/JNK/ACC only); re-anchor batter draw; force arm=0 | **B14 ⇔ Branch-A RA-11: shared signal** |
| B1.6 | tracker-copy sync | retire/sync the stale `kbl-tracker` generator copy (non-canonical personality must not leak) | before the lane-merge |

### B-W2 — Lane 4C scouting v2 (same generator file → AFTER B-W1)
| Order | Ticket | What | Note |
|---|---|---|---|
| B2.1 | S1 / S2 | scout-draft phase (1/team, 3×-pool, `STARTUP_SCOUTS_PER_TEAM` 2→1) · fixed 2-high/2-low specialty (no DH) | — |
| B2.2 | S3 / S4 | per-tool 0–99 bands (30/50/70) · overall grade band (3/5/7) + derive auction price range | — |
| B2.3 | **S5 reveal** | archetype (via B12) + secondary + age (B8) into the report; `trait1/trait2` → `traitCount` (0/1/2), identities hidden until call-up | **AFTER B1.1 (B8) + B1.3 (B12)** |
| B2.4 | S6 | draft-board UI (per-tool + overall bands; default-covered / long-press reveal) | — |
| B2.5 | **S7 supersede + cleanup** | breaking overall→per-tool schema change across the generator + 2 startup-draft files + UIs + tests; retire old Gaussian/IV-range/20-80 | **LAST on this branch — the wide breaking change after B settles** |

### B-W3 — Lane 2 finish
| Order | Ticket | What | Note |
|---|---|---|---|
| B3.1 | RB-13b | route the draft flow by `draftFormat` (active-league anchor) | design-gated; anytime |
| B3.2 | RB-18 | live lineup-morale UI (placeholder now; live value post-flag) | uses RB-17 `moraleDisplay.ts` |
| B3.3 | **RB-16 sim-tune sweep** | §11 dials + draft-economy validation harness | **run on the MERGED tree (post-convergence)** |

---

## CROSS-BRANCH COORDINATION (spec-pin so the two halves agree at merge)
1. **`traitWeight`** — Branch-A **T-4** and Branch-B **B13** both use `genWeight = 1−traitWeight`. Pin the formula from `TRAIT_GAIN_LOSS_THRESHOLD_SPEC §2/§6`; both implement to the same spec; reconcile to one module at the merge.
2. **Pitcher over-expectation signal** — Branch-A **RA-11** (§4A) and Branch-B **B14** (§5.7) share the texture. Pin the per-category model once; co-design.
3. **Catcher CS** — Branch-A **T-6** catcher re-earnability depends on **RA-8** catcher-CS counting (both Branch A — order RA-8 before T-6).
4. **DH Position types** — done on Branch A (A0.1), propagated to Branch B (B0.1) so the shared type files don't conflict at the merge.
5. **Scouting reveal** — Branch-B **S5** depends on **B12** (archetype persisted) + **B8** (age) — both Branch B, ordered.

---

## CONVERGENCE → GATES → SHIP
1. **LANE-MERGE (Lane 3)** — merge `codex/mode1-v1-b` → `codex/franchise-v1-next` once both branches reach a coherent checkpoint (recommend after A-W2 + B-W2 land, **before RB-16 + the final L-SIM**). Reconcile: the 2 overlapping files (`leagueBuilderStorage.ts`, `franchiseMoraleState.ts`) + `TRACKER_DB_VERSION` + the cross-coupled formulas + DH types. **Verify:** `tsc -b` 0 on the merged tree · DB version-pin + migration-survival · `iv_oracle.json` byte-unchanged · suite = union of both characterized baselines, zero new reds. (See `AUCTION_REBUILD_PLAN.md` Phase 6 RB-MERGE.)
2. **L-SIM final full-matrix gate** — on the merged tree (now sees both the L-stack soul layer AND the auction-derived freeze + the new development/trait checkpoints). Re-run the deferred multi-season / edge-league legs. `SEASON_SIMULATION_REPORT.md` (2026-06-19) is stale — regenerate.
3. **RB-16 sim-tune sweep** — on the merged tree (validates the whole economy + new development is honest, no juicing, roster-fill always succeeds).
4. **D12** — full Phase-1 iPad manual smoke (JK browser gate) — needs the merged tree.
5. **D13** — Playable-V1 internal checkpoint + JK sign-off ("no phantom morale").
6. **flag-flip** (Phase-2 activation) ∥ **F-138** (offseason flag).
7. **F-141** — post-flag-flip iPad playtest of the full living season = **THE SHIP**.

---

## START HERE (the first dispatch on each branch)
- **Branch A:** `A0.1` 4E DH removal (settle Position types) → then `A1.1` L13-8 + `A1.2` fame-wiring (the L-SIM blockers) → `A2.1` RA-1 keystone.
- **Branch B:** `B0.2` G1 freeze writer (independent, high-value) ∥ `B1.1` B8 age + `B1.3` B12 archetype (the uniqueness levers + S5 unblockers).
- **Cadence:** integrate the branches frequently (keep the 2-file overlap from growing); the lane-merge converges before D12.
