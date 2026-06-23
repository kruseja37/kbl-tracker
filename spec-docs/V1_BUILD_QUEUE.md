# V1 BUILD QUEUE — dependency-ordered execution backlog

**Created:** 2026-06-22 (JK request). **Purpose:** the explicit ordered backlog the autonomous build loops consume.
**Companion to:** `ROADMAP_TO_V1.md` (status/what) — this doc is the **sequence/when**. Per-item detail lives in the cited specs.
**Discipline:** Codex-built → Opus-audited (builder≠auditor) → `NODE_ENV= tsc -b` + full suite, zero-new-reds, branch-only. All magnitudes are §16 sim-tune placeholders.

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
| A0.1 | **4E DH removal (master)** | full DH position + league-rule removal; ~9 `Position` defs in lockstep + `ivEngine.ts:205` (same diff) + `yankeesPlayers.ts:70` + lineup/roster/sub + `leagueConfig.ts`. **Oracle-gate** (ivEngine test before+after; zero value moved). Settle Position types BEFORE 4A position-pool hardens. Propagate the type-def commits to Branch B. | `RATINGS_ADJUSTMENT_SPEC §13` |

### A-W1 — Lane 1 tail (the L-SIM blockers first)
| Order | Ticket | What | Blocker it clears |
|---|---|---|---|
| A1.1 | **L13-8** | un-hold the authored contract; flag-gated `processCompletedGame` wiring → L13 fully built-dark | L-SIM blocker |
| A1.2 | **fame→morale wiring** | 3 RULED-v1 taps: wire `applyWarLegitimacyGravity` (`fameModel.ts:161`); add the §20.5 fame→player-morale term to `masterMoraleMatrix.ts:426`; build §20.6 Channel A/B fan-morale producers | L-SIM blocker |
| A1.3 | trade-request propensity wiring | wire `tradeRequestGeneration.ts:77` into L10 `trade_demand` (`franchiseL10EventEngine.ts:~334`); cheap | — |
| A1.4 | L12-6 | race/award/All-Star UI surfacing + `allStarSelections` career counter | — (interleavable) |
| A1.5 | L4b | matrix-sourced season takes over the L4a bus (deps L3+L4a met) | — |

### A-W2 — Lane 4A ratings (RA-1 keystone gates the rest)
| Order | Ticket | What | Note |
|---|---|---|---|
| A2.1 | **RA-1 expected-stats engine (KEYSTONE)** | ratings→expected-per-category curves (`§3A`) | everything in 4A depends on it |
| A2.2 | **RA-8 catcher CS/SB fields** | additive `PlayerSeasonFielding` (no DB bump) | **early — unblocks Branch A T-6** |
| A2.3 | **RA-rookie** | `draftedAsFarmProspect` + `rookieStatus` + window-clear + ROOKIE badge (`§13B`) | additive; gates RA-5's rookie modifier; both worktrees |
| A2.4 | RA-2 / RA-3 / RA-4 | peer-calibrated signal (replaces `valueDelta` `franchiseCheckpointSweepCompute.ts:184`) · per-category fan-out · position-pool calibration | after RA-1; RA-4 after A0.1 (DH) |
| A2.5 | RA-5 / RA-6 / RA-7 | age/edge/equilibrium · season-scaled min-sample+confidence · per-game park-adjust | after RA-1/RA-2 |
| A2.6 | RA-9 / RA-10 / **RA-11** | cadence+trend · bench-IF/OF split · pitcher non-pitching §4A | **RA-11 ⇔ Branch-B B14: spec-pin the shared over-expectation signal** |
| A2.7 | RA-12 | retire Model B/C + award-luck (the "consolidate 4→1") | last in 4A |

### A-W3 — Lane 4D traits (extends built seams)
| Order | Ticket | What | Note |
|---|---|---|---|
| A3.1 | T-1 / T-2 | 80%-value/20%-scarcity `traitWeight` · 4 pos + 3 neg tiers | foundational |
| A3.2 | T-3 | trend factor + SP/RP cohort split w/ min-peer fallback (`§4A`) | — |
| A3.3 | **T-4** | generation weighting `genWeight=1−traitWeight`, neg 0.27, exclude Sign Stealer/Stimulated | **T-4 ⇔ Branch-B B13: build `traitWeight` once, spec-pin** |
| A3.4 | T-5 | resolution layer: value tiers + incumbency β=1.25 + seeded margin likelihood (`§8B`) | — |
| A3.5 | **T-6** | position-mismatch protect+flag; delete Noodle Arm | **AFTER A2.2 (RA-8 catcher CS)** |
| A3.6 | T-7 | EOS supersede (deprecate Trait Wheel Spin; EOS = one more checkpoint) | last |

### A-W4 — Branch-A L-SIM pre-gate
Run the soul-invariant L-SIM after A-W1 + A-W2 + A-W3 land (it now also exercises the new development/trait checkpoints). The **final full-matrix gate** is post-merge (see CONVERGENCE).

---

## BRANCH B — Mode-1 (`codex/mode1-v1-b`)

### B-W0 — foundation
| Order | Ticket | What | Source |
|---|---|---|---|
| B0.1 | **DH types in** | merge/rebase the 4E Position-type commits from Branch A so both trees agree (generator/scouting already operate no-DH at data level). | (propagated from A0.1) |
| B0.2 | **G1 freeze writer** | stamp the distinct draft-IV at AUCTION finalize → a `franchiseTrueValueSnapshots` checkpoint-0 row + additive settledSalary (GREEN seam, no DB bump). Independent of the generator. | `ROADMAP §L-ECON1/G1` · `MODE1_V1_VERIFICATION V12` |

### B-W1 — Lane 4B prospect (serialized on `prospectScoutingDraftEngine.ts`)
| Order | Ticket | What | Note |
|---|---|---|---|
| B1.1 | **B8 age** | seeded skew-young draw (~18–42, μ≈21); delete `PROSPECT_DRAFT_AGE=18`; reveal age in the farm-auction UI | **unblocks 4C S5** |
| B1.2 | B6 | position-appropriate trait pools (DH/closer/two-way carve-outs); fix `Workhorse`; retire orphan `traitPools.ts` | small |
| B1.3 | **B12 archetype layer** | §5.6 large/parametric: families × randomized magnitudes → non-repeating spreads; re-grade in-loop w/ `scoreSmb4Player`; convergence guard | **unblocks 4C S5**; the uniqueness lever |
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
