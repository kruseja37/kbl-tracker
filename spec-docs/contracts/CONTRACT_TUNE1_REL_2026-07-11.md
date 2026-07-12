# CONTRACT TUNE-1-REL — relationship knobs re-swept against the ORGANIC hazard model
ROUTE: Codex 5.6 SOL | xhigh reasoning effort
DATE: 2026-07-11 · Captain: Fable · Worktree: /Users/johnkruse/Projects/kbl-tune1
(branch codex/tune1-relationships, cut from origin/main @ b17561d0 — RELORGANIC is merged; the
TUNE-0 sweep machinery (tune0*.ts) is on main).
AUTH-4 STANDING AUTHORIZATION: unattended run — do not wait; execute to completion.

## Why
TUNE-0's relationship rows (threshold sweep, cadence coupling) measured the RETIRED checkpoint-
batch model — its addendum says so explicitly. RELORGANIC replaced it with a per-game seeded
hazard (`relationshipFormationHazardProbability`, knobs `RELATIONSHIP_FORMATION_TUNING.perGameHazard`).
This contract re-baselines and re-ranks the relationship dials against the LIVE model, with
targets shaped by ruling R-E (meaningfulness/shape criteria, NOT magnitude caps — see
`DECISIONS_LOG.md` 2026-07-11 R-E and the TUNE-0 addendum).

## SCOPE (test-utils/lsim/** + one new spec-doc ONLY)

**T1. Extend the tune0 override injector** for the organic knobs (harness-side mutation of
`RELATIONSHIP_FORMATION_TUNING`, snapshot/restore pattern as tune0Overrides already does):
sweep `activeBase` (0.5×/1×/2×), `activeSlopePerPoint` (0.5×/1×/2×), `activeCap` (0.5×/1×/2×),
and the four `thresholds` (uniform 0.5×/1×/2× as one composite knob, as TUNE-0 did). The
`potential*` knobs are DORMANT on the live path (cross-team pools only) — record them as such,
do not sweep. Same seeds across variants (TUNE-0's comparison discipline: reduced games count OK
if uniform and documented; never reduce seeds mid-comparison).

**T2. Organic-specific metrics** (extend tune0Metrics where needed, additive only):
per-variant record — unique formed edges by type at season end; formation game-number spread
(distinct games, first/last, largest single-game batch); per-team edge counts (min/median/max);
morale cascade totals (the relationshipMoraleDeltas family); runtime per leg.

**T3. Deliverable doc** `spec-docs/TUNE1_RELATIONSHIPS_2026-07-11.md`:
baseline on defaults + per-knob movement + a ranked list; then a DRAFT-FOR-RATIFICATION target
table in R-E SHAPE terms only — e.g. "edges spread across ≥N distinct games (no batch spike)",
"per-team season-end edges in a meaningful band (not saturated: strict subset of candidates)",
"threshold separation: better-compatibility pairs form earlier on average (monotone timing)" —
NO absolute-count ceilings framed as design caps. Verify one CADENCE variant (5 vs 10) shows
near-zero relationship impact (the R-F regression signal — this must now be true; if it is not,
STOP and report, that is a product bug).

**T4. Honest limits** section (same discipline as TUNE-0 T4).

## FENCE
test-utils/lsim/** (new tune1 config/scenario or extended tune0 driver — do NOT modify
production src/**, do NOT touch canonical lsim-h2 baselines), results under
`test-utils/lsim/results/tune1/`, and the ONE spec-doc named above. No full vitest, no season
leg — run only your tune legs + the smoke leg once on defaults (green, findings honest).

## VERIFICATION (paste all)
Build exit 0 (src untouched) · smoke leg green on defaults · every doc number traceable to a
named artifact JSON · cadence-independence variant result stated explicitly · changed-files list.
FORMAT: files → T1-T4 → verification → "TUNE-1-REL complete" or "BLOCKED: <why>".
Commit on branch if sandbox permits; NEVER push.
FAILURE PROTOCOL: knob not injectable harness-side → NOT-SWEEPABLE row, continue; cadence
variant shows relationship movement → STOP with the numbers (product regression, not a tuning row).

Use xhigh reasoning effort. Think step-by-step.
