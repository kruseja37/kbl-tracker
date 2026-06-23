# AUCTION REBUILD PLAN (Mode-1 finish) — execution sequence

**Source of truth:** `AUCTION_DRAFT_SPEC_V2.md` (ratified by JK 2026-06-21). **Mode:** AUTH-4 captain
loop (`/kbl-captain`) — Claude writes the plan + contracts + audits; Codex builds; full Mode-1 suite
gate, zero-new-reds. **Worktree:** `/Users/johnkruse/Projects/kbl-mode1` [`codex/mode1-v1`]. Branch-only.
**Ordering (JK-approved):** value+nomination spine FIRST → archetype/budgets → morale/GM/freeze bridge →
scouting/UX/shill wrappers → sim-tune. Each RB ticket is grounded-at-source + contracted by the fresh
session per the loop (split further as the grounding warrants).

> **What survives the V1 build (reuse, do NOT rebuild):** the §2 OPEN_BIDDING round-robin + bid-rotation
> (AUC-4.2), the CPU shill bid engine (AUC-2.2), the wallet/solvency math (AUC-5.1c), persistence
> (AUC-3.1 + farm namespace 5.1d-2), the hot-seat device UX + page shells (4.1b / 5.1e-2), the farm
> hook/session-builder (5.1d-1/5.1e-1). The **value layer** and **nomination/resolve** are the rewrites.

---

## Phase 0 — FOUNDATION (personality model)

| # | Ticket | V2 § | Class | What | Survives/Rewrites |
|---|---|---|---|---|---|
| **RB-0** | 3-axis personality model + pre-draft assignment | §3.7 | engine/data | Pin the **3 independent axes** (1: primary personality, 7 types, VISIBLE; 2: hidden modifiers, 4×0–100, HIDDEN forever; 3: chemistry, 5 types, VISIBLE). **Regenerate ALL THREE axes FRESH before the draft for every MLB-pool player** (the pool is HETEROGENEOUS — stock + user-created — analyzed as a whole; prospects already done); MOVE hidden-mod creation from the franchise-init backfill to pre-draft. **Rebalance chemistry (MLB regen + farm gen) to MATCH the 440-base-pool distribution** (one pass computes the target then matches it). **GROUNDED 2026-06-21 (adversarially verified):** the 440 dist = **SPI 21.1 / DIS 20.0 / CMP 20.0 / SCH 20.0 / CRA 18.9%** — near-UNIFORM; data 100% populated as 3-letter codes on the **`PLAYERS` record** (NOT `src/data/players/mlb/`). Freeze it as a `CHEMISTRY_TARGET_DISTRIBUTION` constant = **SPI 21 / DIS 20 / CMP 20 / SCH 20 / CRA 19 (JK RESOLVED 2026-06-21: honor the exact 440 shape, do NOT snap to flat-20; enforce as ±tolerance band)**; tighten `PlayerData.chemistry` `string`→5-literal union; centralize the code↔word form; rule FA treatment. **Do NOT rebuild `PERSONALITY_BASELINES` — `masterMoraleMatrix` already has canonical 7 + reconciliation; the baselines file is DEAD LEGACY (see RB-17).** Feeds RB-1 (scout chemistry-fit), RB-5 (morale), RB-7 (freeze persists all 3). | clarifies the conflated code; the morale engine itself is already built |

## Phase 1 — THE SPINE (value + nomination)

| # | Ticket | V2 § | Class | What | Survives/Rewrites |
|---|---|---|---|---|---|
| **RB-1** | Scout value model | §3 | engine/data | scout output = **price range + 20–80 grade** (true IV hidden, used only for budget scale + call-up); reuse `perceivedValueRange` anchored on the scout price, not IV; class-strength budget scale; the scout's price factors **chemistry-fit → trait potency** (§3.7; VERIFY/BUILD the chemistry-mix→potency-tier rule) | **REWRITES** AUC-5.1a (pool pricing) + 5.1b (anchor) |
| **RB-2** | Engine nomination + one-chance | §2.1/§2.2 | core engine (careful) | NOMINATION → engine **weighted-random** (∝ percentile^k, k≈2–3 seeded); RESOLVE no-bid → **out forever**; no re-nomination; roster-fill guarantee + tail | **REWRITES** AUC-2.1 nomination/resolve; keeps OPEN_BIDDING/CPU/wallet |

## Phase 2 — BUDGETS (archetype + carryover)

| # | Ticket | V2 § | Class | What |
|---|---|---|---|---|
| **RB-3** | Dual archetypes + MLB luxury tax | §4.2 | engine + wiring | **The archetype algorithm + soft tax are RATIFIED (V2 §4.2 sources: composeIdentity = IV_ENGINE §6.3 + DECISIONS_LOG §520; the leeway tax = the ratified D13 soft convex budget-drain; caps/42-mod-fractions = T3 §R4/tierParams.ts).** RB-3 = (a) **WIRE** the ratified tax into the auction (un-stub `projectedTax:0`; per-bid marginal tax like the snake's `pickMarginalTax`) — do NOT redesign it; (b) **ADD the NET-NEW dual identity** (separate MLB archetype → tax, farm archetype → §3.5 scout-priority tilt). **Acceptance gate = §5.3 EV-flatness (no identity >10% advantaged).** |
| **RB-4** | MLB→farm carryover | §4.5 | data/logic (small) | one-way valve: unspent MLB × 50% → farm wallet; timing-enforced |

## Phase 3 — MORALE / IDENTITY / THE MODE-2 BRIDGE

| # | Ticket | V2 § | Class | What |
|---|---|---|---|---|
| **RB-5** | Player morale from draft | §6/§3.7 | **mostly REUSE** | **The morale engine is ALREADY BUILT** (`masterMoraleMatrix.composeMoraleConsequence`, build-dark): per-personality reactivity multipliers (EGOTISTICAL reacts huge, RELAXED/TOUGH shrug, DROOPY/TIMID crushed by bad), ambition/resilience/charisma/loyalty modifier roles, relationship contagion, legacy reconciliation. **Corrected 2026-06-21 — NOT net-new.** RB-5 = (a) define the DRAFT as morale EVENTS (a "drafted-early/high" event, an "overpaid/underpaid vs scout range" event; early=commitment dominates), (b) feed them through `composeMoraleConsequence` with the player's personality+modifiers, (c) seed the result as starting morale at the freeze (§10, RB-7). Figures tunable in `MORALE_TUNING`. |
| **RB-6** | Fan morale from payroll | §7 | new engine | payroll-rank vs median; exponential both ends (high 2× = win-now; low = anti-tank); one-time at draft-end |
| **RB-7** | **Freeze → Mode 2 (4-number bridge)** = AUC-5.2 expanded | §10 | **careful saved-shape / franchise-bridge** | checkpoint-0 stamps trueValue + **settledSalary** + **starting player morale (RB-5)** + **starting fan morale (RB-6)**; franchise-init **seeds Mode-2 morale from the freeze, overriding defaults**. trackerDb + `franchiseInitializer` (additive `settledSalary?` + morale fields; verify NO trackerDb bump + version-pin) |
| **RB-8** | GM identity entity | §8 | new entity | parallel to the manager profile, **above** it, **fire-manager authority**, named (user=GM); reporter names GM on roster/draft, manager on in-game |

## Phase 4 — SCOUTING / UX / SHILLS (wrappers)

| # | Ticket | V2 § | Class | What |
|---|---|---|---|---|
| **RB-9** | Scout-as-bridge + roster board | §3.5/§9 | **mostly REUSE** | **Hole-detection = the already-built+wired Roster Analyzer Engine** (`src/engines/rosterAnalyzerEngine.ts`, live in TeamHub + LeagueBuilderRosters; already scout-aware) — add a `draft_prep` surface + a thin draft adapter feeding the GM's in-progress MLB+farm roster; weight holes by the farm-archetype team profile (`smb4TeamProfileEngine`). The scout layer (§3) values the fillers (the JOIN). Roster board renders the analyzer findings. Spec: `ROSTER_ANALYZER_RECOMMENDATION_ENGINE_SPEC.md`. Do NOT build a parallel hole-detector. |
| **RB-10** | CPU shill ↔ CPU-team split + dissolve | §5 | rework | separate pure-pressure shills (dissolve-to-pool, exclude-from-league actually built) from opt-in CPU-controlled franchise teams |
| **RB-11** | Scout-privacy UI | §3.6/§6.1 | new UI | default COVERED, **long-press REVEALS** own report, re-covers on release; farm + prep only |
| **RB-12** | Guided first-person UX | §9 | new UI (light) | reporter "coach" line at each phase transition; deepen later |
| **RB-13** | Format-picker UI | §9 | UI | setup choice auction(default)/snake, league-wide (the deferred 5.1d-3 follow-up) |
| **RB-14** | POSITION_POOL §3.3 fix | — | fix | prospect-generator position distribution (add SP/RP, correct weights) at `prospectScoutingDraftEngine.ts:260` |
| **RB-15** | Resume = persist DTOs+storylines | §12 | persistence (small) | switch farm resume from regenerate-on-seed to persist (bulletproof; additive, no DB bump) |
| **RB-17** | Deprecate `playerMorale.ts` (SPLIT) | §3.7 | cleanup | **GROUNDED 2026-06-21 (adversarially verified):** DEAD in live franchise UX — sole importer = the UNROUTED `src/components/GameTracker/PlayerNameWithMorale.tsx:10` (not rendered by its own `index.tsx`; only a mocked test runs); ZERO `src/src_figma/app` import path. **Retire** the dead `PERSONALITY_BASELINES` (private, non-canonical) + `getBaselineMorale` + `getPlaceholderMorale` (superseded by `masterMoraleMatrix` `LEGACY_PERSONALITY_RECONCILIATION:265`). **PRESERVE** the 4 display helpers `toSuperscript`/`getMoraleColor`/`getMoraleState`/`getMoraleDisplay` — NO `masterMoraleMatrix` equivalent (grep=0); they're the morale render layer. **JK RESOLVED 2026-06-21: YES — surface morale in the live lineup (see RB-18).** Port the 4 helpers to a `src_figma` UI util, THEN delete the dead file + `PlayerNameWithMorale.tsx` + its test. |
| **RB-18** | Lineup morale indicator (live UI) | §3.7/§9 | new UI | **JK 2026-06-21:** render each player's current morale **UNDER the player-name line, near the per-player game line-score**, in the **full nine-man lineup**. Must **STAND OUT** — use the ported `getMoraleColor` band color as a compact colored value/chip (NOT a faint superscript) — yet **PRESERVE the lineup's row spacing across all 9** (fixed-height element, ZERO reflow when morale shows/changes). Reuses the RB-17-ported display helpers (`getMoraleDisplay`/`getMoraleColor`/`getMoraleState`). **Dependency:** real per-player morale needs the live morale path (D13/post-flag; `useGameState` game-end subscriber). Until morale is live, render the baseline/placeholder (`getPlaceholderMorale`) so the slot + spacing are correct NOW and only the value swaps in later. |

## Phase 5 — VALIDATION

| # | Ticket | What |
|---|---|---|
| **RB-16** | Sim-tune sweep + draft-economy validation | sweep the §11 dials (carryover %, reserve, nomination k, archetype tax curve, shill params, morale magnitudes, payroll curve); validate no juicing (TV economy honest), roster-fill always succeeds, morale distributions sane. L-SIM-style harness over a synthetic draft → franchise hand-off |

---

## Phase 6 — INTEGRATION (the LANE-MERGE) — **#1 structural prerequisite, surfaced by the 2026-06-22 V1 delta audit**

> **The problem:** the ENTIRE Mode-1 build (auction + prospect-gen + draft-freeze + draft-derived morale + GM entity + roster board) lives ONLY on `codex/mode1-v1-b`. The living-season branch `codex/franchise-v1-next` has **ZERO auction code** (grep-confirmed: `LeagueBuilderAuctionDraft`/`useAuctionDraft`/`cpuTeamRoles`/`useFarmAuctionDraft`/`auctionStateMachine` all absent). **No Mode-1 closure reaches Mode-2 until these lanes merge.** This gates **D12** (the iPad smoke needs both halves on one tree). Until the audit, no ticket owned this.

| # | Ticket | What | Evidence / grounding |
|---|---|---|---|
| **RB-MERGE** | **Merge `codex/mode1-v1-b` → the integration line (`codex/franchise-v1-next`)** | bring the auction/prospect/freeze/morale build onto the branch that carries the L/D-stack living season, so D12 can smoke the full Mode-1 → Mode-2 path on one tree | **Mechanically tractable** (audited 2026-06-22): merge-base `549f9832` (2026-06-20 23:32); franchise-v1-next +170 / mode1-v1-b +63; **only 2 overlapping `src/` files** touched on BOTH sides → the rest of the auction lane lands as clean ADDITIONS |

**Conflict surface (the only two-sided `src/` files — both additive, low-risk):**
- `src/utils/leagueBuilderStorage.ts` — mode1-v1-b added `pool?: FarmAuctionPool` (RB-15, +2 lines) + draft fields; franchise-v1-next touched it too. Expect a trivial additive reconcile (already flagged in `PARALLEL_LANE_LOG.md` WAVE P2 merge-note).
- `src/utils/franchiseMoraleState.ts` — the morale store, touched by L3 (franchise side) and RB-5/RB-7 morale-seed (mode1 side). Reconcile the seed/baseline writers.

**Mandatory verification on the merged tree (NON-NEGOTIABLE):**
1. `NODE_ENV= tsc -b` exit 0 on the merged tree.
2. **trackerDb version reconcile** — confirm both lanes' `TRACKER_DB_VERSION` + store lists agree (neither side double-bumped); run the version-pin + migration-survival tests.
3. **Frozen IV oracle byte-unchanged** (`iv_oracle.json`) — the merge must not perturb it.
4. Full suite green = the UNION of both characterized baselines; **zero NEW reds** beyond each lane's known characterized fails (`wpaRuntimeBoundary` + the order-flakes).
5. Re-run the L-SIM gate on the merged tree (it now sees both the L-stack AND the auction-derived freeze).

**OPEN-FOR-JK:** (a) branch/strategy — merge mode1-v1-b INTO franchise-v1-next, or cut a fresh `codex/v1-integration` and merge both? (b) sequencing — before or after the remaining build tickets (RB-13b/16/18 + G1 + fame-wiring) land? (merging earlier shrinks future cross-lane drift; merging later means fewer re-merges). (c) ownership — who runs it. **This ticket is the gate to D12; it cannot be skipped.**

---

## Discipline (every RB ticket)
1. Ground anchors **at source** (never trust this plan's line refs blindly).
2. Contract → `PROMPT_CONTRACTS.md` (markers); make-or-break + STOP-IF explicit; `xhigh`.
3. Dispatch **Codex** (stdin-from-contract, bg, `model_reasoning_effort=xhigh` — NOT very-high).
4. **Audit the diff** (builder≠auditor); only contracted files; frozen oracle untouched.
5. **Gate:** `NODE_ENV= tsc -b` + full Mode-1 suite; **zero NEW reds** (baseline: 1 hard fail
   `wpaRuntimeBoundary`; `franchiseManualSmokeFixture` conditional-solo flake). Saved-shape tickets
   (RB-7) also verify NO trackerDb bump + version-pin + migration-survival.
6. Commit branch-only (never push); log a WAVE bullet in `AUTONOMOUS_RUN_LOG.md`.

## Sim-tunables to sweep (RB-16) — all default-set, none block the build
carryover % (50) · reserve floor (MLB 0.5–0.7 curve / farm flat low) · nomination `k` (2–3) ·
archetype luxury-tax curve (gentle/convex) · shill interest+personality · player-morale (±15/±10) ·
fan-morale payroll curve (exp past 75/25 pctile, high 2×).

## Open verification items (resolve within the build, not blockers)
RB-2 roster-fill tail · RB-3 the tax-curve "cost not wall" calibration · RB-7 the additive morale
fields don't bump trackerDb · RB-8 GM↔manager fire-authority path.
