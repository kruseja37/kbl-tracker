# CONTRACT — Step 5a: rotation-aware next-starter resolver (the lineups-tab foundation)

**Lane:** manager-WPA (`experiment/manager-wpa-window`). **Builder:** Codex. **Auditor:** Opus. **Scope:** SMALL — engine/integration
helper + launch wiring + the opponent-next-SP resolver. No UI (that's 5b). No new store, no DB version bump.

## THE RULE
A team's starting pitcher for a game **cycles through its `startingRotation`** as games are played (auto-advance), and the
lineups tab (5b) needs to know **the opponent's next starter's full profile**. Model the rotation position as **DERIVED**:
`rotationIndex = gamesPlayed % startingRotation.length` (idempotent — re-processing a game never double-advances; no persisted
pointer to drift). Manual rotation reorder is honored automatically (the index indexes into the user-reordered array).

## GROUND ANCHORS (Captain + discovery-verified 2026-06-26)
- Team record carries `startingRotation: string[]` (ordered SP ids, ROTATION_SIZE=4): `leagueBuilderStorage.ts:157,394,2313`;
  also on the roster (`franchisePlayerStorage.ts:380`).
- **Launch picks `startingRotation[0]` today** (NOT rotation-aware): `franchiseGameTrackerRoster.ts:330-334`
  (`rotationStarter = storedTeam?.startingRotation...`) + the default-starter selection at `:204`,
  `FranchiseHome.tsx:3416-3417` (`handlePlayGame` default = first `isStarter`).
- Game-completion hook (for "games played" + where the cycle effectively advances): `processCompletedGame.ts:1242` (+ schedule
  via `getScheduledGame` :54, standings carry per-team wins+losses = games played).
- The merged optimizer needs `OpponentStarterProfile` (lineupVsStarter.ts:10-23): pitcherId, pitcherName, throws, velocity/
  junk/accuracy, trait1/trait2/traits, arsenal, armSlot, pitcherRole. The opponent SP's full ratings live on the franchise
  player/roster record.

## CHANGES
1. **Derived rotation resolver (engine helper).** Add a pure helper, e.g.
   `getRotationStarterId(startingRotation: string[], gamesPlayed: number): string | null` =
   `startingRotation.length ? startingRotation[((gamesPlayed % len) + len) % len] : null` (guard empty + negative). Place it in
   a shared util (e.g. a new `src/utils/rotationRotationResolver.ts` or alongside the roster builder) — pure, unit-testable.
2. **Opponent-next-SP profile resolver.** Add
   `resolveOpponentStarterProfile(teamId, gamesPlayed, rosterLookup): OpponentStarterProfile | null` — picks the SP id via (1),
   then maps that pitcher's full franchise ratings/traits/arsenal/armSlot/role into `OpponentStarterProfile` (the shape
   `optimizeLineupVsStarter` consumes). This is what 5b's lineups tab calls for "who I face next + optimize against him."
3. **Make launch rotation-aware.** At `franchiseGameTrackerRoster.ts:330` (and the `handlePlayGame` default-starter pick),
   select `getRotationStarterId(startingRotation, teamGamesPlayed)` instead of `startingRotation[0]` — so each scheduled game
   uses the next pitcher in the rotation. `teamGamesPlayed` = the team's completed-game count from standings/schedule at launch.
   **This is an intended behavior change** (games now cycle the rotation rather than always starting `[0]`); the existing
   game-only starter-override (`FranchiseHome.tsx:4290-4314`) still wins when the user overrides.
4. **Fallback (note, do not build unless needed):** if a reliable per-team `gamesPlayed` is NOT cleanly available at a resolver
   call site, fall back to a persisted `rotationIndex` on the team record advanced **idempotently** (keyed on gameId so
   re-processing doesn't double-advance) in `processCompletedGame`. Prefer DERIVED. If you take the fallback, a team-record
   field is NOT a new store → no version bump; confirm.

## CONSTRAINTS
- Do NOT edit `lineupVsStarter.ts` / `scoutMove.ts` / `trueValue.ts` / `effectiveRatings.ts` / `playerDatabase.ts`.
- No new trackerDb store / no DB version bump.
- No UI changes (5b owns the tab). The resolver is consumed by 5b later; for now wire only the launch starter selection.

## VERIFICATION (run locally; paste actual output)
1. `npm run build` exit 0.
2. `npm test` for the affected area (the new resolver's unit tests + `franchiseGameTrackerRoster` tests + any launch/pregame
   tests) — pass vs the documented baseline; no new characterized RED.
3. Unit-test the resolver: gamesPlayed 0→rotation[0], 1→[1], 3→[3], 4→[0] (wrap), empty rotation→null, reordered rotation honored.
4. Hand-confirm: a franchise team's 5th game selects `startingRotation[0]` again (4-man wrap), and `resolveOpponentStarterProfile`
   returns the correct next SP's full profile.

## FAILURE PROTOCOL (STOP-IF — emit `BLOCKED` and STOP)
- `teamGamesPlayed` is not reliably derivable at the launch site AND the persisted-fallback would require a trackerDb store add
  / version bump — STOP and report.
- Making launch rotation-aware breaks a characterized test in a way that implies a real behavior regression (not just an
  updated expectation) — STOP and report.
