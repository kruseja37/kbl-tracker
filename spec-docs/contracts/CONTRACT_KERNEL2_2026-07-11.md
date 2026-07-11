# CONTRACT KERNEL2 — completion-pipeline follow-up: JK rulings + crash-window idempotency (6 items)
ROUTE: Codex 5.6 SOL | xhigh reasoning effort
DATE: 2026-07-11 · Captain: Fable · Worktree: TBD at dispatch (branch codex/living-kernel2)
**DISPATCH GATE: only after KERNEL-TRUTH-1 has MERGED to main — this contract edits the same files and
must be grounded on the post-KERNEL shapes (especially the archive-early outcome ledger).**

## Authority
JK rulings R-B/R-D (2026-07-11, `LIVING_SEASON_V1_EXECUTION_MAP.md` §4b) + Sol-r3 fix-now flips +
hunt/deep-pass confirmations. Re-read every anchor on the POST-KERNEL code; mismatch → STOP.

## SCOPE

**K1. Innings-aware CG detection + walk-off truth** (`deriveCompletedGameResultContext`,
processCompletedGame.ts ~:883-941 pre-KERNEL numbering):
- No-hitter/shutout: replace `outsRecorded >= 27` with scheduled-innings-aware outs
  (`scheduledInnings × 3` — reuse the same source `seasonAggregator.isCompleteGameByContext` uses; the
  DEFAULT config is 7 innings, so today's code never detects either in a default league). Extra-inning
  shutout credit must follow the pitcher's TEAM, not the winner.
- Walk-off: require home win AND bottom-half ending AND the home team having taken the lead in that
  final bottom half (derive from inning scores / final-play context available on the game state; a
  mercy/blowout bottom-half ending is NOT a walk-off). If the state genuinely cannot distinguish, STOP
  with what IS available.
- Tests: 7-inning CG shutout detected; 9-inning unchanged; extra-inning shutout credited to the right
  team; blowout bottom-half ending ≠ walk-off; genuine walk-off still detected.

**K2. Fame honor-bump crash-window idempotency** (`franchiseFameCompute.ts` bump-only loop, ~:159-192):
existing rows are rewritten WITHOUT advancing `updatedAtCheckpoint` and the loop has no per-checkpoint
guard — a replay after a mid-branch crash re-applies the bump. Fix: bump path advances
`updatedAtCheckpoint` and skips when already at this checkpoint (matching the first loop's guard).
Test: same-game re-run applies the bump exactly once.

**K3. L11 execution identity + expected-manager CAS** (`franchiseManagerAutoBackstop.ts` +
`franchiseManagerFiring.ts`): the deterministic roll re-fires on replay and `fireManager` acts on
whichever manager is CURRENT — a crash between the firing and the outcome-ledger receipt can fire the
successor on retry. Fix: (a) a game-scoped execution guard — persist the fired-game identity on the
tenure/assignment record (or an equivalent existing field — find one, no new store) and no-op when this
gameId already fired; (b) `fireManager` takes an expectedManagerId and no-ops (with a typed result)
when the current assignment doesn't match. Tests: replay after successful firing → no second firing;
replay with successor installed → no-op.

**K4. Decay-only fame deltas do not move morale (JK R-B).** In `franchiseFameCompute`, split the heat
delta: `moraleRelevantDelta = heat_after_all_inputs − (stored.heat × decayPerUpdate)` (i.e., game
inputs + gravity + bumps; pure decay excluded). `persistFameMoraleConsequencesAfterFame` consumes ONLY
the morale-relevant delta. Return both deltas so the ledger stays complete. Tests: quiet game (no
events/WPA, no gravity target change) → zero morale events; eventful game → morale event sized by the
non-decay component.

**K5. Beloved-manager firing backfire (JK R-D).** `franchiseL11FiringEngine.ts:~66-76`: relief floors
at `reliefBase` (4) for ANY firing. Fix: fan morale ≥ 50 at firing time → relief 0 or negative
(backlash), scaling continuously (no cliff at 50); misery still scales relief up as today. Export the
backlash constants as named tunables (TUNE-0 dials). Tests: fan morale 80 firing → negative shift;
morale 25 → positive, unchanged magnitude class vs today.

**K6. Development-confidence denominator uses per-team games (confirmed 3× suppression).**
`franchiseCheckpointSweepCompute.ts:196-211` passes league-wide `totalGames` as `gamesPerSeason` into
`ratingConfidence` thresholds. Fix: use the season's frozen `gamesPerTeam` (metadata; same source WAR
uses). Checkpoint BOUNDARY math (which is league-game-number based) is NOT in scope — only the
confidence denominator. Test: 6-team/20-games-per-team league → confidence denominators scale to 20,
not 60; single-team-equivalent invariance across team counts.

## FENCE
Only: processCompletedGame.ts (K1 function only), franchiseFameCompute.ts (K2/K4),
franchiseManagerAutoBackstop.ts + franchiseManagerFiring.ts (K3), franchiseL11FiringEngine.ts (K5),
franchiseCheckpointSweepCompute.ts (K6 confidence fn only) + tests. Do NOT touch the KERNEL-1
archive-early/outcome-ledger machinery beyond consuming it; no UI, no storages schema, no flags, no
test-utils/lsim.

## VERIFICATION (paste all)
1. `NODE_ENV= npm run build` exit 0. 2. FULL `NODE_ENV= npx vitest run` (summary; known 2 flakes
baseline). 3. Proving tests per K1-K6 (fail-before/pass-after). 4. L-SIM smoke in-memory compare — the
fame-floor upward-only invariant and WPA conservation must stay green; expected diffs labeled.
5. Changed-files list.

FORMAT: files → per-item → verification → "KERNEL2 complete" or "BLOCKED: <why>". Branch-only, never push.
FAILURE PROTOCOL: anchor mismatch post-KERNEL → STOP that item; walk-off state insufficiency (K1) →
STOP with findings; items separable.

Use xhigh reasoning effort. Think step-by-step.
