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

## Phase 1 — THE SPINE (value + nomination)

| # | Ticket | V2 § | Class | What | Survives/Rewrites |
|---|---|---|---|---|---|
| **RB-1** | Scout value model | §3 | engine/data | scout output = **price range + 20–80 grade** (true IV hidden, used only for budget scale + call-up); reuse `perceivedValueRange` anchored on the scout price, not IV; class-strength budget scale | **REWRITES** AUC-5.1a (pool pricing) + 5.1b (anchor) |
| **RB-2** | Engine nomination + one-chance | §2.1/§2.2 | core engine (careful) | NOMINATION → engine **weighted-random** (∝ percentile^k, k≈2–3 seeded); RESOLVE no-bid → **out forever**; no re-nomination; roster-fill guarantee + tail | **REWRITES** AUC-2.1 nomination/resolve; keeps OPEN_BIDDING/CPU/wallet |

## Phase 2 — BUDGETS (archetype + carryover)

| # | Ticket | V2 § | Class | What |
|---|---|---|---|---|
| **RB-3** | Dual archetypes + MLB luxury tax | §4.2 | engine + wiring | two archetypes per team (MLB + farm); wire the **gentle convex** marginal luxury tax into `auctionMaxBid` (un-stub `projectedTax:0`) for MLB; farm archetype → scout-priority tilt. ⚠ leeway-not-a-wall calibration |
| **RB-4** | MLB→farm carryover | §4.5 | data/logic (small) | one-way valve: unspent MLB × 50% → farm wallet; timing-enforced |

## Phase 3 — MORALE / IDENTITY / THE MODE-2 BRIDGE

| # | Ticket | V2 § | Class | What |
|---|---|---|---|---|
| **RB-5** | Player morale from draft | §6 | new engine | slot (when surfaced/won) + over/underpay (vs scout range) matrix; early=commitment dominates; personality-tilted; feeds TV |
| **RB-6** | Fan morale from payroll | §7 | new engine | payroll-rank vs median; exponential both ends (high 2× = win-now; low = anti-tank); one-time at draft-end |
| **RB-7** | **Freeze → Mode 2 (4-number bridge)** = AUC-5.2 expanded | §10 | **careful saved-shape / franchise-bridge** | checkpoint-0 stamps trueValue + **settledSalary** + **starting player morale (RB-5)** + **starting fan morale (RB-6)**; franchise-init **seeds Mode-2 morale from the freeze, overriding defaults**. trackerDb + `franchiseInitializer` (additive `settledSalary?` + morale fields; verify NO trackerDb bump + version-pin) |
| **RB-8** | GM identity entity | §8 | new entity | parallel to the manager profile, **above** it, **fire-manager authority**, named (user=GM); reporter names GM on roster/draft, manager on in-game |

## Phase 4 — SCOUTING / UX / SHILLS (wrappers)

| # | Ticket | V2 § | Class | What |
|---|---|---|---|---|
| **RB-9** | Scout-as-bridge + roster board | §3.5/§9 | UI + logic | scout reads MLB holes weighted by farm archetype → "fill these"; persistent glanceable MLB+farm roster board w/ gaps |
| **RB-10** | CPU shill ↔ CPU-team split + dissolve | §5 | rework | separate pure-pressure shills (dissolve-to-pool, exclude-from-league actually built) from opt-in CPU-controlled franchise teams |
| **RB-11** | Scout-privacy UI | §3.6/§6.1 | new UI | default COVERED, **long-press REVEALS** own report, re-covers on release; farm + prep only |
| **RB-12** | Guided first-person UX | §9 | new UI (light) | reporter "coach" line at each phase transition; deepen later |
| **RB-13** | Format-picker UI | §9 | UI | setup choice auction(default)/snake, league-wide (the deferred 5.1d-3 follow-up) |
| **RB-14** | POSITION_POOL §3.3 fix | — | fix | prospect-generator position distribution (add SP/RP, correct weights) at `prospectScoutingDraftEngine.ts:260` |
| **RB-15** | Resume = persist DTOs+storylines | §12 | persistence (small) | switch farm resume from regenerate-on-seed to persist (bulletproof; additive, no DB bump) |

## Phase 5 — VALIDATION

| # | Ticket | What |
|---|---|---|
| **RB-16** | Sim-tune sweep + draft-economy validation | sweep the §11 dials (carryover %, reserve, nomination k, archetype tax curve, shill params, morale magnitudes, payroll curve); validate no juicing (TV economy honest), roster-fill always succeeds, morale distributions sane. L-SIM-style harness over a synthetic draft → franchise hand-off |

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
