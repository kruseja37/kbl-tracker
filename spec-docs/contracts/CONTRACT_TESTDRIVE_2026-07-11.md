# CONTRACT TESTDRIVE-1 — the living-season walkthrough accelerator (dev-only synthetic game driver)
ROUTE: Codex 5.6 SOL | xhigh reasoning effort
DATE: 2026-07-11 · Captain: Fable · Worktree: /Users/johnkruse/Projects/kbl-testdrive
(branch codex/test-drive, cut from origin/main — post-#100/#102 merged main).
AUTH-4 STANDING AUTHORIZATION: unattended run — do not wait; execute to completion.

## Why (JK's stated blocker, verbatim intent)
Real living-season testing costs an hour of SMB4 console play per game — "too costly to be wrong
about any of the UI/UX and math." This page lets JK drive a switch-ON franchise through synthetic
games IN THE BROWSER in minutes: checkpoints fire, the takeover asks for confirmations, fame and
relationships move — all through the REAL pipeline. **SCOPE GUARD: the product 'simulate season'
feature remains CUT from v1 (FranchiseHome's simulate stays OFF/deleted); this is a DEV FIXTURE
SURFACE like `Phase2ActivationConsole`, not product nav. State this in the page header copy.**

## SCOPE

**T1. The synthetic driver** (`src/src_figma/app/dev/devSyntheticGameDriver.ts`, new):
- For a given franchiseId: resolve the NEXT scheduled, uncompleted franchise game
  (scheduleStorage — the same lookup the product uses); load both rosters' CURRENT stored
  franchise players; generate a deterministic synthetic completed game **adapted from
  `test-utils/lsim/syntheticGame.ts` semantics** (read it first; replicate: stored ratings as
  the input, established mojo×fitness multiplier, NO morale performance multiplier, seeded by
  (franchiseId, scheduleGameId) — Math.random FORBIDDEN). Do NOT import test-utils from src —
  adapt into the dev module with a header comment naming the source of truth.
- Assemble a `PersistedGameState` + `CompletedGameArchiveOptions` shaped EXACTLY as a real
  scored franchise game produces (read the real completion path's shape and the L-SIM harness's
  fixture assembly — mirror, don't invent; franchise identity, scheduleGameId, statsScopeId
  invariant, civil-date stamping all as production).
- Call the REAL `processCompletedGame` — zero modifications to it.
- Stamp the archive record `devSynthetic: true` (additive OPTIONAL field on the archive record
  type — the SWITCH-3A precedent; no store version bump; legacy reads unaffected) so synthetic
  games are forever distinguishable from hand-scored ones.

**T2. The page** (`src/src_figma/app/pages/LivingSeasonTestDrive.tsx`, new; route registered in
`App.tsx` lazily, EXACTLY the `Phase2ActivationConsole` gating/routing pattern):
- Franchise picker (switch-ON franchises only; a legacy franchise renders an explanation, not
  controls). Shows: current game number / season length, next scheduled game, the seed.
- Controls: **PLAY NEXT GAME** · **FAST-FORWARD TO NEXT CHECKPOINT** · **FAST-FORWARD N GAMES**
  (numeric input, hard-capped at regular-season end; sequential processing with a progress
  indicator; stops cleanly on the first failure with the error surfaced).
- Refusal guards: no schedule / next game already completed / non-franchise → plain explanatory
  copy, never a throw. Season end reached → says so (finalize/rollover stays DEFERRED per R4 —
  do not wire season-end machinery).
- **T2b. The under-the-hood receipt panel (JK's transparency window):** after each processed
  game, render that game's `livingSeasonProcessing` ledger from the archive record (accessor
  exists in `gameStorage.ts`): overall status + one chip per branch — plain-English branch names
  ("Fame", "Morale", "Development checkpoint", "Relationships"...), color-coded
  SUCCESS=green / NO_EVENT=gray "nothing to do" / OFF=dim / FAILED=red with the receipt reason.
  Plus the game line (away–home, score, civil date). This panel is the non-engineer's X-ray of
  the backend — copy in plain language, no enum strings.
- UI style: ballpark-kit premium-retro, consistent with the dev console page — clean, no new
  design system.

**T3. Determinism + honesty tests:** same seed + same stored state → byte-identical synthetic
game and identical receipts; a rating change between games (simulate a mirror confirm) changes
subsequent output (the FIDELITY closure property, asserted once at this seam); fast-forward N =
N sequential single plays (same end state); refusal guards each proven; `devSynthetic` stamped;
a hand-scored-style game (fixture) remains unstamped.

## FENCE
The two new files + `App.tsx` (route block only) + the one optional archive-record field + tests.
Do NOT touch: `processCompletedGame.ts`, engines, GameTracker files, Lens/Hub components,
schedule semantics, L-SIM harness, flags, `FranchiseHome` (the cut simulate stays cut).

## VERIFICATION (paste all)
1. Build exit 0. 2. Focused: the new test files + a full-suite run of `processCompletedGame`'s
test files (import-graph safety). 3. Changed-files list. 4. OPTIONAL browser pre-check (dev
server, drive 3 games + a checkpoint, screenshot) — report it, but it closes nothing; the
captain and JK walk it.

FORMAT: files → T1-T3 → verification → "TESTDRIVE-1 complete" or "BLOCKED: <why>".
Commit on branch if sandbox permits; NEVER push.
FAILURE PROTOCOL: the real completion shape has a hard dependency the driver can't satisfy
without touching fenced files → STOP with the exact seam; schedule model surprises → STOP with
evidence; items separable.

Use xhigh reasoning effort. Think step-by-step.
