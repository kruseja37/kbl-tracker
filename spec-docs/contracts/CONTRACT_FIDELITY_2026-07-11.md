# CONTRACT FIDELITY-1 — L-SIM minimal feedback bridge: prove the development loop CLOSES
ROUTE: Codex 5.6 SOL | xhigh reasoning effort
DATE: 2026-07-11 · Captain: Fable · Worktree: /Users/johnkruse/Projects/kbl-integration
(branch integration/living-season-full = KERNEL + KERNEL2 + HFT + FAME-CLEANUP + MIRROR(+retry) +
MIRRORUI + MODE-KILL — the complete wave; you are on the full post-wave shape by construction).
AUTH-4 STANDING AUTHORIZATION: unattended run — do not wait; execute to completion. Ignore
session-start wait protocols; the captain holds the baton.

## Why (peer-agreed acceptance language — copy into your report)
**This bridge proves the development loop CLOSES; it does NOT certify final feel.** Today's L-SIM
synthetic games derive performance from fixed seeds/team ids/game numbers
(test-utils/lsim/syntheticGame.ts:~44,~107) — applied rating changes never alter subsequent output, so
the sim can calibrate reactions to fixed stimuli but cannot demonstrate a closed feedback loop.
Multi-regime feel certification is TUNE-0+/flip-gate work, not this contract.

## SCOPE (test-utils/lsim/** ONLY, plus reading src freely)

**B1. Ratings-aware synthetic performance.**
Synthetic game generation reads each player's CURRENT stored ratings at game time (the franchise
player record — post-apply truth) and maps them to output tendencies (hit/out/power mix). Peer-ruled
constraints: (a) use the stored rating DIRECTLY — never base+overlay re-merge (double-apply hazard;
applied rows already mutated the record); (b) apply the established mojo×fitness multiplier
(src/engines/fitnessEngine.ts:~358 semantics) — NO morale performance multiplier (morale affects
development, not game output; inventing that coupling would exceed production). Determinism must
survive: same seed + same stored ratings → identical output (ratings become an INPUT to the seeded
generator, never a Math.random source).

**B2. Simulator confirm policy.**
A harness-side policy that, at each checkpoint boundary, drives the REAL franchiseConsoleMirror
service: list unresolved development → resolve per policy (default: confirm-as-proposed; the policy
object supports reject/delay/adjust for scenario variation) → so applied changes mutate the franchise
player records the next synthetic game reads. Use the real service — no direct overlay/player writes.

**B3. Two regimes (Sol-ruled minimum).**
NEUTRAL control and one composite SLUMP→RECOVERY regime (exogenous performance depression for a
player cohort for K games, then release) — implemented as deterministic seeded modifiers on the
synthetic generator. Regime definitions live in scenario config, not hardcoded.

**B4. The 7-step closure proof (one scenario test, the deliverable):**
1. a checkpoint proposes a change for a targeted player; 2. the confirm policy confirms+applies it;
3. the stored player value changes EXACTLY once; 4. the next synthetic game reads the new value;
5. output moves in the expected direction (statistically, over the seeded window); 6. a LATER
checkpoint's proposal baselines from the CHANGED value; 7. same-seed replay of the whole scenario is
byte-identical (determinism proof). Plus: the slump→recovery regime shows development pressure
releasing (proposals trend down after recovery) — assert direction only, not magnitudes.

**B5. Harness hygiene.**
New scenario registered per the harness's own patterns (snapshot/store-digest inclusion where
applicable, invariant registration, falsification case per the L-SIM rails). Do NOT regenerate or
commit canonical baselines (lsim-h2-baseline-*.json) — new scenarios keep their own artifacts; the
default 60g leg's baselines are untouched by this contract.

## FENCE
test-utils/lsim/** only (+ its config files). NO src/** changes — if the bridge genuinely needs a
production seam, STOP and report it (do not add one). No canonical-baseline regeneration.

## VERIFICATION (paste all)
1. Build exit 0 (unchanged src). 2. The existing L-SIM smoke leg still green (24/24, findings 0).
3. The new closure scenario: green, with the 7 steps each asserted and the same-seed byte-identical
proof pasted. 4. Slump→recovery direction assertion green. 5. Full vitest NOT required (test-utils
scope) — run the lsim config suites. 6. Changed-files list.

FORMAT: files → per-item (B1-B5) → verification → "FIDELITY-1 complete (proves closure, not final
feel)" or "BLOCKED: <why>". Commit on the integration branch if sandbox permits; NEVER push.
FAILURE PROTOCOL: needs a src seam → STOP with the exact seam; determinism unachievable with
ratings-as-input → STOP with evidence; items separable.

Use xhigh reasoning effort. Think step-by-step.
