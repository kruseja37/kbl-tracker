# CONTRACT STAKES-1-CORE — pre-game stakes vector (narrative math build order #1; compute only)
ROUTE: Codex 5.6 SOL | xhigh reasoning effort
DATE: 2026-07-11 · Captain: Fable · Worktree: /Users/johnkruse/Projects/kbl-stakes
(branch codex/stakes-core, cut from origin/main — post-#103, the design doc is on main).
AUTH-4 STANDING AUTHORIZATION: unattended run — do not wait; execute to completion.

## Authority
`spec-docs/LIVING_SEASON_NARRATIVE_MATHEMATICS_2026-07-11.md` §1 (read it first — implement §1
EXACTLY; §4's selection shape governs the top-K rule) + §8 build order. This lane is COMPUTE
ONLY: no UI, no reporter wiring, no App.tsx — the Tonight-card consumption lands later (a
concurrent lane owns the Lens files).

## SCOPE — new files only
**S1. `src/utils/franchiseStakesCompute.ts`** — `computePregameStakes(scope, scheduleGameId)`:
resolve the scheduled game + both rosters, then compute the six component families from EXISTING
stores (read-only; every read via existing accessors):
- milestoneProximity (per rostered player: nearest career/season milestone, prox = 1 −
  remaining/window; stake if ≥ 0.6);
- recordProximity (park + league records reachable tonight — stadium-records store);
- grudgeLines (relationship edges whose two players are on opposing rosters tonight; carry
  intensity + formationSource; overtake-source vs tonight's opponent = revenge flavor);
- racePressure (L12 race deltas involving tonight's rosters, gap ≤ the configured swing band);
- hotSeat (fan morale within hotSeatBand of the L11 firing threshold, either manager);
- liveStreaks (team/player streaks decidable tonight, from completed-game rows).
Each component normalized to [0,1] with a named tuning block `STAKES_TUNING` (§16 SIM-TUNE
placeholder convention: windows, bands, floors — every constant named, none inline).
**S2. Selection:** `selectTonightStakes(vector, k=2)` — score = component value × the family
weight in STAKES_TUNING, tie-broken deterministically (scope+gameId+family seed, existing
stable-hash family; Math.random FORBIDDEN); returns ≤ k items each with
`{family, playerIds/teamIds, value, oneLineFacts}` — oneLineFacts = STRUCTURED FACTS (numbers,
names), NOT prose (copy is the reporter/UI's job later; the help-button law applies there).
**S3. Graceful darkness:** every family reads through the SAME flag gates its source system uses
(a dark store → that family contributes zero, never throws). A legacy (non-living-season)
franchise yields an empty vector. Missing schedule/game → typed null, no throw.
**S4. Tests:** fixture-driven per family (one proving fixture each); budget proof (never > k);
determinism (same state → byte-identical vector + selection); darkness proofs (flag off → family
zero); the read-only proof (no store writes — assert via a storeDump digest unchanged around the
call, the L-SIM pattern).

## FENCE
The new compute file + its test file ONLY. Do NOT touch: Lens/Hub/components, reporter engines,
App.tsx, processCompletedGame, any storage/engine module, flags, L-SIM harness.

## VERIFICATION (paste all)
Build exit 0 · the new test file green (list each proof) · changed-files list (must be 2).
No full suite needed (pure additive leaf — captain runs the union gate at integration).
FORMAT: files → S1-S4 → verification → "STAKES-1-CORE complete" or "BLOCKED: <why>".
Commit on branch if sandbox permits; NEVER push.
FAILURE PROTOCOL: a family's source store lacks a needed accessor → implement that family as
NOT-YET-READABLE (returns zero, documented + tested) and report the missing seam — do NOT add
storage accessors in this lane; items separable.

Use xhigh reasoning effort. Think step-by-step.
