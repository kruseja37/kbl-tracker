# CONTRACT HUNTFIX-ENGINE-1 — engine & compute truth batch (8 verified defects)
ROUTE: Codex 5.6 SOL | xhigh reasoning effort
DATE: 2026-07-11 · Captain: Fable · Worktree: /Users/johnkruse/Projects/kbl-hfe (branch codex/huntfix-engine)

## Authority
Living-season program (`OBSERVER_GROUNDWORK_BRIEF_2026-07-11.md` §5). Every defect below was found by
an adversarially-verified hunt (2 independent opus verifiers each) on main @ e5f4213c and routed by the
captain (`LIVING_SEASON_V1_EXECUTION_MAP.md`). Re-read every anchor before editing; mismatch → STOP.

## SCOPE

**E1 (CRITICAL — product math, will get a dedicated opus audit). fWAR positional adjustment is
inversely proportional to season length.** `src/engines/fwarCalculator.ts:475-481` (+ duplicate at
`:539-544`): `positionalAdjustment = POSITIONAL_ADJUSTMENTS[pos] × (gamesPlayed/seasonGames)` then
`÷ runsPerWin(seasonGames)`. The constants are calibrated per-48-games (C=3.7 ≈ 12.5-per-162 MLB
value — verify the calibration comment in source). Full-time catcher: 50-game season → +1.20 fWAR;
162-game → +0.37; 24-game → +2.50. Every OTHER WAR run term scales with playing time and cancels the
runsPerWin season-scaling; this flat constant does not. FIX: positional runs must scale with actual
games played against the 48-game calibration base (posRuns = C × gamesPlayed/48), making full-time
positional WAR season-length-invariant (~+1.25 catcher). Verify the intended semantic against the
calibration comments + `spec-docs` WAR references before choosing the final formula — if the spec
contradicts the 48-game base, STOP and report. Fix BOTH copies. Tests: same player/participation at
24/50/162 games yields the same positional WAR (±rounding); relative positional ordering (C > SS > CF
… < DH) preserved.

**E2. resolveFameTier discards the reach floor's magnitude.** `src/engines/fameModel.ts:245-247`: the
`reachFloor > 0 && heatRank === UNKNOWN` branch hardcodes `'LOCAL_HERO'`. A REGIONAL_STAR-or-higher
floor (rank 2-5) with cooled heat resolves BELOW its own floor — violating §20.3 "displayed tier floors
heat at reach" (`FRANCHISE_V1_LIVING_SEASON_SPEC.md` ~L381-386). FIX: return
`FAME_TIER_BY_RANK[reachFloor]`. Test: floor 2 + heat 1 → REGIONAL_STAR; floor 5 + heat 0 →
IMMORTAL_LEGEND; floor 0 unchanged.

**E3. A trait being LOST still blocks gaining its opposite.** `src/engines/traitAcquisition.ts:640`:
the offsetting-pair guard checks unfiltered `heldNames`, while the elite-pitch (:662-664) and capacity
(:682) passes correctly exclude `lossNames`. Lose-Choker + gain-Clutch at one checkpoint drops the gain
(reason `offsetting_pair_held`) and permanently blocks the flip. FIX: exclude traits in `lossNames`
from the offsetting-pair check, matching the sibling passes. Test: the clean flip (lose Choker → gain
Clutch same checkpoint) produces both proposals.

**E4. WPA defensive budget silently dropped on SB/CS rows missing fielder ids.**
`src/utils/kblWpaAttribution.ts:~1373` (`deriveBetweenPlayCredits`): caught_stealing/stolen_base (and
symmetric wild_pitch/passed_ball/pickoff/advance rows) with neither catcherId nor pitcherId produce an
empty defensive credit list — the play budget is not conserved. FIX per the module's own conservation
convention: route the orphaned defensive share to the fielding TEAM's current pitcher when resolvable
from the row/game context; if truly unresolvable, assign to the team-level bucket the module already
uses for unattributed credit (find it — do not invent a new one; if none exists, STOP and report).
Credit-conservation tests must cover the missing-id path. The L-SIM manager/WPA conservation proof must
stay green.

**E5. Flashpoint "consecutive" counter is actually cumulative.**
`src/utils/franchiseFlashpointDecayCompute.ts:~150`: `consecutiveGamesUnresolved` never resets when a
player's flashpoint turns off; a resolved-then-retriggered flashpoint resumes the old count and
compounds a larger tax than a fresh one. FIX: reset the counter when the flashpoint is not active for a
processed game (true consecutive semantics). Test: on→off→on yields a restarted count.

**E6. Event-driven RIVALRY edges are blindly overwritten.**
`src/utils/franchiseRelationshipOvertakeCompute.ts:71-97` and
`src/utils/franchiseRelationshipFormationCompute.ts:135-137` put-overwrite the deterministic edge id
without the `if (existing) continue` guard their honor-lock sibling uses — wiping formation
source/history when the same pair re-forms via a different trigger. FIX: add the same existing-edge
guard (preserve the original formationSource/formedAtGameNumber; intensity updates stay the
intensity-compute's job). Tests: overtake-then-checkpoint-formation preserves the original edge row;
snub-lock survives a later overtake.

**E7 (dark fix). classifyFameVsMerit 'bust' tests magnitude, not rank.**
`src/engines/fameModel.ts:278-281`: uses `fameMagnitude` (abs) so a DESPISED low-merit player
classifies 'bust' (= overrated darling). FIX: test `fameRank >= config.classifier.highFameMinRank`
(positive-rank semantics, matching the snub/darling branches). No production consumer today — pure
function + tests only.

**E8. Delete the dead INNING_MULTIPLIERS table.** `src/engines/leverageCalculator.ts:~140`: defined,
never read, and contradicts the live inning factor. Remove it (and any doc-comment references in the
file). Captain updates the knob registry separately — do not touch spec-docs.

## FENCE
Only the files named above (+ their test files). Do NOT touch: processCompletedGame.ts,
seasonAggregator.ts, franchiseFameCompute.ts, franchiseStadiumRecordsTap.ts, scheduleStorage.ts,
GameTracker.tsx, careerStorage.ts (KERNEL lane); useGameState.ts (TRACKER lane); overlay storages /
franchiseTraitConfirmApply / ratingsOverlayConfirmation / ratingsOverlayMerge (MIRROR lane);
useFranchiseLensData.ts / FranchiseLensHub.tsx (UI lane); test-utils/lsim/** except reading; no flag
changes; no new stores.

## VERIFICATION (paste all)
1. `NODE_ENV= npm run build` exit 0 (tail).
2. `NODE_ENV= npx vitest run` FULL suite — read the summary; the two known solo-green batch flakes are
   baseline; machine may be running sibling lanes — a NEW red must be retried solo before you own it.
3. Proving tests per item E1-E7 (fail-before/pass-after; state file names).
4. E1: paste the 24/50/162-game positional-WAR invariance table.
5. Changed-files list.

FORMAT: files changed → per-item result → verification → "HUNTFIX-ENGINE-1 complete" or "BLOCKED: <why>".
Commit on branch if sandbox permits; NEVER push.
FAILURE PROTOCOL: anchor mismatch / spec contradiction / missing team-credit bucket (E4) → STOP +
report that item, finish the others (items are separable).

Use xhigh reasoning effort. Think step-by-step.
