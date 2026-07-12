# NOW — Living Season (Mode 2): build COMPLETE, tuning + launch NEXT

## VERIFIED state (git, 2026-07-11 ~21:30)
- Every v1 slice from `spec-docs/LIVING_SEASON_V1_EXECUTION_MAP.md` is built, captain-audited,
  and merged (#78-#99, #101). **PR #100 (SWITCH-3A, per-franchise activation) was rebased
  conflict-free and MERGEABLE at writing** — if it shows merged, the program is 100% on main;
  if not, merging it is step zero.
- Season health on merged main: 60g L-SIM leg 60/60, findings 0, same-seed byte-identical.
- Activation model: a new franchise chooses LIVING SEASON at creation (default OFF, immutable
  for the season, stamped `ls-tune0-2026-07-11` provenance). Legacy franchises stay classic.
  Dev console (`Phase2ActivationConsole`) remains the test override surface above it.

## The launch path, in order (do not reorder)
1. **Ratify targets with JK**: `spec-docs/TUNE0_BASELINE_2026-07-11.md` (+ its R-E addendum) and
   `spec-docs/TUNE1_RELATIONSHIPS_2026-07-11.md`. Binding lens: `DECISIONS_LOG.md` 2026-07-11
   rulings **R-E** (bold dynamics; the ONLY brakes = less-meaningful outcomes or chaotic feel —
   NO magnitude caps as targets) and **R-F** (relationships organic per-game; cadence must have
   ~zero relationship impact). Hold every proposed band to: *meaning floor or courage cap?*
   Keep floors, strike caps.
2. Set knob values (TUNE-2 convergence only if ratification demands it). Ground truth: fame
   decay = most powerful + unstable at 2×; relationship thresholds dominant but unsafe at both
   extremes; activeSlopePerPoint = the everyday relationship dial; sweep-side
   performanceSignalScale is vestigial; **wpaToHeatScale is NOT-SWEEPABLE (module-private) —
   make it harness-injectable BEFORE trusting fame tuning.**
3. 60g season leg green on the tuned values.
4. **JK's browser walk on a FRESH franchise created with the toggle ON — the sole acceptance
   gate. Nothing in this program has been touched by human hands yet.** Walk order suggestion:
   create → play/score 2-3 games → Lens (pulse, Tonight, rival card) → first checkpoint takeover
   (confirm/adjust/reject + the hidden Development log) → fame/relationship surfaces.

## Quirk classes proven live this run — hunt these in anything new
(a) UI-time flag reads outside the pipeline context; (b) monotonicity inversions at
threshold/window edges; (c) harness invariants asserting a retired model; (d) checkpoint-coupling
of anything that should be organic. Full audit lessons: Fable memory `audit-lessons-2026-07-11`
(incl. the stale-base trap: base-verify against CURRENT origin/main, name the SHA).
