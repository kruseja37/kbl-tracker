# Captain's Deep Pass — Living Season (2026-07-11)

Fable's own-eyes read of the living-season spine, per JK directive ("take your own deep pass").
Files personally read IN FULL: `processCompletedGame.ts`, `useFranchiseLensData.ts`,
`ratingsDevelopment.ts`, `fameModel.ts`, `franchiseFameCompute.ts`,
`franchiseCheckpointSweepCompute.ts` (boundary/sweep sections). Parallel 12-lane adversarially-verified
hunt covers the rest (results merge here when complete).

## New findings (not in any prior survey)

### Critical / major
1. **Checkpoint labels use the GAME NUMBER as the checkpoint ordinal.**
   `franchiseCheckpointSweepCompute.ts:527` writes `sourceEventId = checkpoint-${gameNumber}` (league
   game number, e.g. 24), and `useFranchiseLensData.ts:1134-1186` parses that number as the ordinal →
   the takeover renders "Checkpoint 24 of 5 — the 480% mark" on a 60-game season. The previously-known
   "hardcoded N of 5" bug is the SHALLOW half; the number itself is wrong. Fix belongs with the
   MIRROR/UI work: carry ordinal + boundary game number separately.
2. **Fame honor-bump rows dodge the idempotency guard.** `franchiseFameCompute.ts:159-192`: the
   stadium-bump-only loop pushes `{...storedRow, heat}` WITHOUT updating `updatedAtCheckpoint`, and has
   no per-checkpoint skip → any re-run re-applies the bump. Latent today (games process once), becomes
   LIVE the moment KERNEL's partial-failure re-processing lands. Must be covered by KERNEL's
   branch-level SUCCESS skip — flag to the KERNEL auditor explicitly.
3. **Player-drawer milestones are read from the GLOBAL career store with no franchise scope.**
   `useFranchiseLensData.ts:1794` (`getRecentMilestones(5000)`) + `buildMilestones` never filter by
   franchise/season → two franchises built from the same league (shared playerIds) bleed each other's
   milestones into the drawer. Cross-save truth leak.
4. **Clubhouse pulse averages STALE `player.morale`** (`useFranchiseLensData.ts:633`) while the drawer
   beside it reads canonical snapshots (`:492`). Same-screen contradiction once morale is live. Same
   stale-source class as the KERNEL-D development seam, UI side.
5. **No-hitter/shutout detection hardcodes 27 outs** (`processCompletedGame.ts:897`,
   `outsRecorded >= 27` + `isStarter`). Leagues with shorter innings-per-game never detect either (fan
   morale events silently absent); extra-inning edge credits the shutout to the wrong team.

### Major / tuning-fork
6. **Walk-off flag = "home won && ended in a bottom half"** (`processCompletedGame.ts:907`): a
   mercy-rule/blowout ending in the bottom half mislabels as walk-off → wrong fan-morale event weight.
7. **Fame decay alone fires negative morale events.** `franchiseFameCompute.ts:128` decays heat ×0.85
   per update; a star with a quiet-but-fine game nets a negative heatDelta →
   `persistFameMoraleConsequencesAfterFame` sends his morale DOWN for playing normally. Ruling needed:
   should decay-only deltas feed morale? (Rec: no — only event/WPA-driven deltas.)
8. **WAR gravity lifts NEGATIVE heat toward 0 even at 'low' merit** (`fameModel.ts:182`, max(0,...)
   with target 0) — a hated low-WAR villain automatically drifts toward UNKNOWN each game. The
   upward-only direction is the RULED behavior for earned fame (do not "fix"), but villainy-erosion
   rate is a tuning fork.
9. **Reach floor ratchets on |tier rank|** (`fameModel.ts:226-227`): DESPISED (rank −3) sets floor 3 →
   later modest positive heat resolves as NATIONAL_ICON. "Reach is reach" may be intended — needs a JK
   taste ruling + an L-SIM invariant either way.
10. **Age gravity moves ratings with ZERO performance signal** (`ratingsDevelopment.ts:165-174` +
    non-zero band slopes): every 18-21 player drifts up (+0.8×steepness ≥ shiftThreshold 0.75), every
    36+ drifts down, at every checkpoint, regardless of play. Plausibly intended (age curve) but it
    means ~+1 per rating per checkpoint for teens — must be an explicit tuning target, not a surprise.
11. **Checkpoint confidence denominator may mix league-total and per-team game counts.**
    `franchiseCheckpointSweepCompute.ts:553` passes season `totalGames` (league-wide) as
    `gamesPerSeason` into sample thresholds; if `CHECKPOINT_FULL_SEASON_SAMPLE` is per-player/per-team
    calibrated, confidence deflates by the team-count factor → all development shrunk. VERIFY.
12. **Checkpoint boundaries recompute from live metadata `totalGames`** — schedule edits mid-season
    shift/skip boundaries (a passed boundary can silently never fire). Consider freezing the boundary
    plan at season start.

### Critical / major (continued)
19. **Undo never rewinds fame.** `useGameState.ts:5768-5806` (undoLastAction) undoes the event-log row
    and reloads, but `fameEventsRef` (:3365-3376) is only ever restored from the currentGame snapshot
    (:4850) or reset on new game (:4166) — an undone play's fame event stays in the accumulator and
    ships to the archive. Record a web gem, undo the play → the +0.75 fame survives forever. Ledger
    and fame diverge. (Also: undo+refresh path re-saves the over-counted snapshot via the debounce.)

### Minor
13. `unknownBand: 2.999` in FAME_TUNING is a dead knob (never read).
14. Trade cards: a result with no winningTeamId renders as an away win (`useFranchiseLensData.ts:1061`).
15. Reporter fallback can pick another franchise's reporter for the same teamId (`:1531-1534`).
16. `getRecentMilestones(5000)` global cap: heavy multi-franchise saves silently truncate history.
17. `fanMoraleTimestamp.date` holds an epoch-ms string or a raw gameId (`processCompletedGame.ts:879`)
    — civil-date work should sweep this too.
18. Designation 'lost' transitions produce NO morale event (`processCompletedGame.ts:398`) — losing
    Team MVP / shedding Albatross is emotionally free. Product question.

## Cross-checks against in-flight work
- KERNEL-TRUTH-1: findings 2 (fame idempotency) and 5/6 (result-context detection) touch its files —
  hand findings 5/6 to a follow-up, do NOT amend mid-build; finding 2 goes to the KERNEL auditor.
- MIRROR-1 (held, not dispatched): finding 1 (ordinal vs gameNumber) must be added to the UI contract;
  the service contract is unaffected.
- Tuning registry: findings 7-12 are tuning-target inputs (LIVING_SEASON_KNOBS.md cross-refs).
