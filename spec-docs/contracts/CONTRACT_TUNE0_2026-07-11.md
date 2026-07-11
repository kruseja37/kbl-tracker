# CONTRACT TUNE-0 — tuning targets + baseline + one-factor sensitivity ranking (NOT converged tuning)
ROUTE: Codex 5.6 SOL | xhigh reasoning effort
DATE: 2026-07-11 · Captain: Fable · Worktree: /Users/johnkruse/Projects/kbl-integration
(branch integration/living-season-full @ 0be5ea2e — the full wave incl. the FIDELITY-1 closure
harness you will drive).
AUTH-4 STANDING AUTHORIZATION: unattended run — do not wait; execute to completion.

## Deliverable (Sol-agreed cut-line: targets, baselines, sensitivity RANKING — convergence is later)
A committed doc `spec-docs/TUNE0_BASELINE_2026-07-11.md` + raw artifacts under
`test-utils/lsim/results/tune0/` containing:

**T1. Baseline.** Run the closure scenario (closure.config.ts) and the smoke leg on the current
knob values; record per-checkpoint distributions: development proposals (count/magnitude by age
band), trait grants/losses, fame heat distribution + tier counts, morale deltas, L10/L11 event
counts, relationship formations. These are the BEFORE numbers for all future tuning.

**T2. One-factor sensitivity sweep.** From `spec-docs/LIVING_SEASON_KNOBS.md`'s highest-risk
shortlist sweep ONE knob at a time (low/default/high = 0.5x/1x/2x unless the registry documents a
domain): wpaToHeatScale, performanceSignalScale (sweep-side), CHECKPOINT cadence 5 vs 10,
FAN_DAMPENER_TUNING strength, age-gravity band slopes (0x/1x/2x — JK ruling R-C says mechanism
stays, magnitude is the dial), fame decayPerUpdate, morale personality multiplier spread,
relationship formation threshold, K5 backlash curve constants. Same seeds across variants. Record
the same distributions as T1 per variant.

**T3. Ranking + inert list.** Rank knobs by normalized output impact (which distributions moved,
how much); flag INERT knobs (no measurable effect in this harness — candidates for freezing) and
UNSTABLE knobs (small change → runaway/oscillation across checkpoints 1..5). Draft a target table:
for each ranked knob, a PROPOSED target metric + acceptable band (e.g. "a full-season star gains
+3..6 total rating points across 5 checkpoints") — clearly labeled DRAFT FOR JK/CAPTAIN RATIFICATION,
grounded in what the baseline actually shows.

**T4. Honest limits.** State what this harness CANNOT see (single-regime feel, cross-season arcs,
real-GameTracker event mix) so the ranking is not over-trusted.

## FENCE
test-utils/lsim/** (sweep driver + configs; reuse the closure/feedback machinery — do NOT modify
production src/**, do NOT touch canonical lsim-h2 baselines), the new results dir, and the ONE new
spec-docs file named above. Knob OVERRIDES must be harness-side parameter injection — if a knob
cannot be varied without editing src, record it as NOT-SWEEPABLE in the doc and move on (do not edit
engines).

## VERIFICATION
Build exit 0 (src untouched); closure + smoke legs green on defaults; every sweep variant's summary
JSON archived; the doc's every number traceable to an artifact file. FORMAT: files → T1-T4 →
verification → "TUNE-0 complete" or "BLOCKED: <why>". Commit on the branch; NEVER push.
FAILURE PROTOCOL: a knob not injectable → NOT-SWEEPABLE row, continue; runtime too long → reduce
variant games (document), never reduce seeds mid-comparison.

Use xhigh reasoning effort. Think step-by-step.
