# Manager-WPA Metric — Consolidated Build Plan (3:2:1 net-from-zero)

**Date:** 2026-06-26 · **Branch:** `experiment/manager-wpa-window`
**Status:** design LOCKED · interface LOCKED · **lineup_delta retirement JK-CONFIRMED 2026-06-26.**
**Companions:** `MANAGER_WPA_WINDOW_AUDIT.md` (truth-map + rulings), `SITUATIONAL_ADVISOR_AND_OPTIMAL_LINEUP_DEEPDIVE.md`,
`MANAGER_WPA_OPTIMIZER_INTERFACE_CONTRACT.md` (the scout seam).

## Principle
The manager metric **ships first and independent** — it scores on real per-play win-probability, needs neither the
keystone optimizer nor the fielding-corrected true-value. Rung 2 (conscious keep-in) is **wired-but-dark** until the
optimizer's `evaluateScoutMove` lands. The simmable deliverable = **Step 1 + Step 4** (per-game metric → season numbers).

## Build approach (team protocol)
Captain (Opus) authors each step's contract in `PROMPT_CONTRACTS.md` + audits the diff; **Codex builds** (default builder);
the builder≠auditor triangle holds. Gate every step on: `npm run build` exit 0 → full vitest (respect the documented
baseline; a new RED not in the characterized set = regression) → **L-SIM season** (`test-utils/lsim`, drives the REAL
`src/utils` `processCompletedGame` flags-on) → hand-trace one known game.

---

## STEP 1 — Core 3:2:1 net-from-zero metric  ⟶ the simmable core
**Files:** `managerWpaGameState.ts` (primary), `managerDecisionRegistry.ts`, `types/managerWpa.ts`, downstream consumers.

1a. **Every-player stint.** Open a deployment stint for **each starter at game start** (new role `untouched_starter`) in
    addition to the existing sub/keep stints; close on removal / role-change / game-end. Net-from-zero = sum the player's
    **real per-play WPA** (the `kblWpaAttribution` credits) across the open→close window. Extend
    `deriveManagerDeploymentStintRecords` (`managerWpaGameState.ts:319-570`).
1b. **Un-filter roles.** `getManagerDeploymentCreditWeight` (`:101-139`) must count the player's **whole game**
    (batting + fielding + baserunning + catching + arm) for the duration of his stint — not only the role that matched the
    deployment. This is what makes a defensive sub's later *hit* count.
1c. **3:2:1 shares.** `MANAGER_DEPLOYMENT_SHARE_BY_ROLE` (`:54-67`): active sub/move **0.30**; conscious keep-in
    (`kept_*_in`) **0.20**; `untouched_starter` **0.10**. (Retune from today's 0.10–0.20.)
1d. **Caps.** Loosen the per-role + team caps (today calibrated for a small overlay). Start generous; tighten empirically
    after watching sim — the *ratio* (3:2:1) is fixed, the absolute dial is calibration.
1e. **Retire lineup_delta.** Drop `deriveTeamLineupDeltasFromOptimalSnapshot`'s contribution to the manager total; update
    the consumers so they no longer sum `lineupDeltaWpa`: `almanacQueries.ts`, `franchiseAwardsEngine.ts`, `pogAwards.ts`,
    `teamImpact.ts`, `ManagerWpaOverlay.tsx`, `TeamImpactLeaderboardsPanel.tsx`, `ManagerAlmanac.tsx`, `types/managerWpa.ts`.
    **Keep the `optimalLineup` snapshot machinery** (the lineups-tab consumer still uses it) — only unhook it from mWAR.
1f. **Enforce `doubleCountingExclusions` as real subtraction** (`managerDecisionRegistry.ts:140-273`): `player_kbl_wpa`,
    `deployment_stints`, `deployment_initial_pa` become actual net-outs so the manager share never re-credits WPA already in
    the player bucket or a tactical window.

**Verify:** build green; full vitest; L-SIM season shows manager total = **sum of stints only**, no double-count, downstream
screens recompute cleanly; hand-trace one game (a sub who later homers earns the manager his 30% slice; an untouched starter
earns 10% of his net game; a benched-then-net-negative player dings the manager). No trackerDb store add expected → no
version-pin churn (confirm before assuming).

## STEP 2 — Rung-2 seam (stub, wired-but-dark)
Define the consumption seam where the keep-in detector will call `evaluateScoutMove` (per the locked interface). Stub returns
`recommend:false` → rung 2 produces **zero** until the optimizer lands, but the keep-in record path + the seam are in place
so Step 3 is a swap, not a rebuild. Headless decline-policy hook stubbed for sim.

## STEP 3 — Rung-2 live  *(gated on the optimizer thread)*
When `evaluateScoutMove` + the fielding-corrected win-value scorer land: swap the stub for the real scout call; **hoist the
live-state assembly out of React** (`GameTracker.tsx:10243-10495`) into a pure helper shared by live + sim; give the
auto-manager a **decline policy** so sim exercises rung 2. Triangle: optimizer thread builds the scorer; we wire it.

**Status note (2026-06-26):** Step 1 ships the metric as TWO live tiers only — active 30% / untouched 10%. The **20%
conscious-keep-in tier is defined-but-DARK** (the share is in the table; the engine opens NO keep-in stints — unit tests
confirm `kept_*_in` stints stay `[]`). **JK ruled the 20% keep-in crediting is verified together with rung-2 here, NOT
de-risked separately now.** This step must therefore: (a) RE-ENABLE keep-in stint generation wired to the new scout's
"declined a good rec" signal, and (b) add the end-to-end test proving the 20% credit + the **starter→keep-in handoff**
(the untouched_starter window closing cleanly as the keep-in window opens, no double-count).

## STEP 4 — Season roll-up  *(can run alongside Step 1)*
Wire the orphaned aggregation (`managerStorage.ts` `aggregateManagerGameToSeason` / `saveManagerSeasonStats` /
`updateManagerCareer` — zero callers today) so per-game manager WPA rolls into a **season + career** number for MOY /
leaderboards. Needed for JK to watch a season play out. Mind the trackerDb version-pin test trap if a store is added.

## STEP 5 — Lineups tab + rotation pointer  *(optimizer merged in; broken into 5a/5b/5c, discovery 2026-06-26)*
Discovery findings: optimal-lineup UI today is buried in **Team Hub** (`TeamHubContent.tsx` — "OPTIMAL LINEUP BENCHMARKS"
COMPARE/APPLY/RECALC/SET panel :3194-3299 + the "DURABLE LINEUP + ROTATION" manual editor :3022-3192), **hand-based only**
(`buildOptimalLineupSnapshot` takes opposingPitcherHand R/L). The merged `optimizeLineupVsStarter` (specific-SP) is **ORPHANED**
(zero callers). **No living-season rotation pointer exists** — teams have a `startingRotation` order but launch just picks
`startingRotation[0]`; only the synthetic batch-sim has an advancing `rotationIndex`. Pregame = a standalone PRE-GAME LINEUP
modal (`FranchiseHome.tsx:4255-4370`, lineup NOT editable there — set in Team Hub) → `handleLaunchGame` (:3636-3706) navigates
to GameTracker with `optimalLineupSnapshots`.

- **5a — Rotation pointer (foundation; storage + engine, minimal UI).** A persisted per-team rotation pointer (index into
  `startingRotation`) that **auto-advances on real game completion** (hook the post-game pipeline / `processCompletedGame`),
  exposes "next SP" for a team, + an opponent-next-starter resolver (opponent rotation + pointer → SP playerId → full
  `OpponentStarterProfile`). Store on the existing franchise team record (no new store / version bump — confirm). + manual
  rotation reorder respected.
- **5b — Lineups tab (the big UI; needs JK browser sign-off).** New franchise-hub sub-tab `LineupsTabContent` next to TEAM HUB
  (`FranchiseHome.tsx` TabType :131, nav :1168/:1187, switch :1415+). REUSE the Team-Hub panels (the COMPARE/APPLY/RECALC/SET
  advisor + `OptimalLineupComparisonPanel`, the manual reorder editor, the benchmark checklist) — extract them to shared
  subcomponents. NEW: call `optimizeLineupVsStarter` against the opponent's ACTUAL next SP (via 5a) instead of hand-only;
  mojo/fitness edit on the tab; persist the accepted/adjusted chosen lineup. Lane mints snapshotId/sourceConfidence.
- **5c — Pregame collapse (flow cleanup).** Remove the standalone PRE-GAME LINEUP modal as the finalization step; "Play Ball"
  reads the lineup/rotation already set on the Lineups tab and passes through (reuse `handleLaunchGame` nav assembly :3636-3706);
  keep GameTracker's in-game lineup/sub + mojo/fitness as the last-second buffer.

Sequence: 5a (foundation) → 5b (the tab) → 5c (collapse). The optimal-lineup is a **scout-driven advisor** (accept/adjust),
NOT a manager-WPA input (the manager metric is real-WPA based + already complete).

---

## Step-1 model refinement — from the contract stress-test (2026-06-26)

The adversarial pass surfaced that the metric is only **coherent + double-count-free** as a **single pure-stint
layer**, not as stint + the legacy tactical layer side-by-side:

- **Retire the TACTICAL layer too, not only lineup_delta.** If the every-player stint credits a player's FULL net
  WPA (un-filtered), the legacy tactical narrow-window scores (pitching_change first-PA, pinch_hit entry-PA,
  steal/bunt/IBB) would **double-count** — every play they score is already inside the actor's stint. So the
  headline manager number = **Σ(player net WPA over stint × engagement share, capped)**, ONE layer.
  "Tactics absorbed into player WPA" (JK) taken to its clean end. ⟶ **JK CONFIRMED 2026-06-26: "one number, retire the old."**
- **Two LIVE tiers in Step 1; the middle is dark.** Active move (sub-in/PH/PR/def-sub/pitching-change) = **30%**;
  untouched starter = **10%**. The conscious keep-in **20%** tier stays **defined-but-dark** until the scout lands
  (it needs the recommendation engine, unavailable in sim) — exactly the agreed rung-2 sequencing. This also
  **dissolves the untouched→keep transition hole** (no keep tier in Step 1 → the only stint close is on removal).
- **Starting pitcher:** gets an `untouched_starter` stint for his appearance (his pitching WPA, 10%); closes when
  pulled; the reliever opens a 30% active stint. With the tactical layer retired there is **no first-PA
  double-count** and the exclusion machinery is removed (not needed without a tactical layer).
- **Concrete provisional caps** (sim-calibrated later): per-player ±0.20, team ±0.60. Replaces "generous TBD."
- **MOY degeneracy fix (required):** when a retired term collapses to 0 for all managers, `scaleToUnitRange`
  returns 0.5 for everyone → a constant offset, not zero. Drop retired terms from
  `MANAGER_OF_YEAR_SIM_GATE_PLACEHOLDER_WEIGHTS` and re-normalize the survivors, OR accept the offset — **JK weight
  ruling needed** before regenerating MOY expectations.
- **Shape-stability (recommended):** engine emits **empty/zero** for retired layers but **keeps the type members**
  (`ManagerLineupDeltaRecord`, `lineupDeltaWpa`/`tacticalManagerWpa` on totals, the registry entries inert) so
  persisted/archived games and all ~15 consumers stay shape-stable at 0 — minimizes blast radius.
- **Full consumer/test sweep** (from the stress-test map): ~15 non-test consumers (`pogAwards`, `almanacQueries`,
  `franchiseAwardsEngine`, `managerValueTrace`, `teamImpact`, `franchiseSeasonSummaryStorage`, `ManagerWpaOverlay`,
  `TeamImpactLeaderboardsPanel`, `ManagerAlmanac`, `TeamPage`, `GameDetail`, `EliminationTeamHub`, …) + ~13 test
  files that hard-pin shares/caps/lineup-delta/manager-totals. Codex updates the EXPECTATIONS, not the engine.
  No trackerDb version-pin risk (the two pin tests don't touch manager terms). The L-SIM season scenario WRITES
  the canonical baseline JSONs → regenerate them last, deliberately.

## Cross-lane dependencies (recap)
- Steps 1, 2, 4 are **100% manager-lane** — no dependency on the optimizer thread. **This is what ships first + sims.**
- Step 3 waits on the optimizer's `evaluateScoutMove` (win-value scorer).
- Step 5 waits on the optimizer + the rotation pointer.
- Shared-file rule: the manager lane does **not** edit `effectiveRatings.ts` / `playerDatabase.ts` (potency + true-value are
  the draft lane's shared builds). The manager metric doesn't touch them at all.
