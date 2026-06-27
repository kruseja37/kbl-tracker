# Session status — 2026-06-26 — three parallel UI streams + the Lineups tab

> Written at session end so a fresh thread can resume any of the three without re-discovery. Each stream
> lives on its **own branch / worktree**; nothing is merged to live. The Lineups tab (§1) is the active
> pickup. Streams A and B (§2, §3) are documented for status — they're paused at clean seams.

## The three workstreams at a glance

| Stream | Worktree | Branch | HEAD this session | State |
|---|---|---|---|---|
| **Lineups tab** (active pickup) | `/Users/johnkruse/Projects/kbl-tracker` (main tree) | `experiment/manager-wpa-window` | `5f79d87a` | Engine seam done+tested; UI next |
| **A — Fenway franchise-lens hub** | `/Users/johnkruse/Projects/kbl-tracker--auction-ux` | `codex/auction-draft-ux-rehaul` | `ca943b7e` | All 11 hub surfaces wired to real data; live swap + lineups/pregame remain |
| **B — draft-setup UI** | `/Users/johnkruse/Projects/kbl-draft-ui` | `codex/draft-setup-ui` | `ea729455` | Archetype picker wired; rest needs 2 JK forks |

**Verification pattern (all streams):** Playwright lives only in the **auction-ux** worktree's `node_modules`
(chromium-1217 in the global `~/Library/Caches/ms-playwright`). Run screenshot scripts with
`NODE_PATH=<auction-ux>/node_modules node …` against a `vite preview`/`npm run dev` of the target worktree.
Do **not** use `preview_start` (serves the main tree). Prefix all vitest/CLI with `NODE_ENV=`.

---

## §1 — LINEUPS TAB (active pickup — `experiment/manager-wpa-window`, main tree)

**Read first:** `spec-docs/HANDOFF_LINEUPS_TAB_UI.md` — the contract: every file:line anchor, the reuse list,
and the hard boundaries. This section is the *progress + grounded-contract* layer on top of it.

### DONE this session (`5f79d87a`)
The **engine seam** both 5b (the tab) and 5c (pregame collapse) consume:
- `src/src_figma/app/utils/franchiseNextGameLineup.ts` — `resolveFranchiseNextGameOptimalLineup(input)`.
  Builds the rotation lookup from franchise teams/players → `resolveOpponentStarterProfile` (rotation-aware
  next SP, full profile) → `optimizeLineupVsStarter` against that specific pitcher → `{ opponentStarter,
  snapshot }`. Snapshot `snapshotId=''` (the lane mints identity at persist, per the locked contract).
- Test `__tests__/franchiseNextGameLineup.test.ts` — 3/3 (rotation-slot derivation, optimizer fires vs the
  resolved SP, null fallback when no rotation). `tsc` clean.
- **Boundary held:** consumes the engine only; does **not** touch `managerWpaGameState.ts`/`pogAwards.ts`/the
  mWAR track, or `lineupVsStarter.ts`/`scoutMove.ts`/`trueValue.ts`/`effectiveRatings.ts`/
  `franchiseRotationResolver.ts`. The optimal lineup is a **scout advisor**, not an mWAR input.

### Grounded contract (so the next thread doesn't re-discover)
- `resolveOpponentStarterProfile(teamId, gamesPlayed, lookup)` — `franchiseRotationResolver.ts:48`. `lookup =
  { getTeam:(id)=>{startingRotation}, getPlayer:(id)=>{id,throws,velocity,junk,accuracy,trait1/2,arsenal,
  armSlot,primaryPosition} }`. Rotation slot = `gamesPlayed % startingRotation.length`. Returns null on no
  rotation / missing pitcher / non-L-R throws.
- `optimizeLineupVsStarter({ teamId, mode, dhEnabled, roster: OptimalLineupCandidate[], opponentStarter })` —
  `lineupVsStarter.ts:37`. `mode: OptimalLineupModeContext = "franchise"`. Returns `OptimalLineupSnapshot`
  (`managerWpa.ts`): `slots: OptimalLineupSlot[]` (playerId, playerName, battingOrderSlot, defensivePosition,
  projectedSlotKblWpa, …), `projectedTeamLineupKblWpa`, `opposingPitcherHand`, `snapshotId=''`.
- `OptimalLineupCandidate` (= `ScoutPlayer`) — `optimalLineup.ts:22-46`.
- **Reuse the mapper:** `toOptimalCandidate(player): OptimalLineupCandidate` is INLINE at
  `TeamHubContent.tsx:983` (uses `getFranchisePlayerName`). EXTRACT to a shared util + reuse in both Team Hub
  and the tab.
- `useFranchiseData().nextGame: NextGameInfo` — `useFranchiseData.ts:72` — `{ id, awayTeam, homeTeam,
  awayRecord, homeRecord, gameNumber, date? }`. **⚠ GOTCHA: `awayTeam`/`homeTeam` are NAMES, not ids**, and
  there's no `opponentTeamId`/`opponentGamesPlayed`. The tab must (a) map the opponent NAME → teamId, and
  (b) derive the opponent's games-played (from standings W+L or a schedule count — `useFranchiseData
  .gamesPlayed` is the *active club's* count). This is the one unresolved wiring detail for 5b.

### NEXT — the UI (in order; ~80% already exists, buried in Team Hub — extract, don't rebuild)
1. **Add the tab** — `FranchiseHome.tsx`: `TabType` union :131, nav arrays :1168/1187, content switch :1415+
   (mirror `activeTab==="team" → <TeamHubContent/>` :1425) → add `activeTab==="lineups" → <LineupsTabContent/>`.
2. **Extract the buried controls to shared subcomponents** (both Team Hub + the tab use them):
   - Accept/adjust advisor (COMPARE/APPLY/RECALC/SET) — `TeamHubContent.tsx:3194-3299` + handlers `:2776-2826`;
     read-only gap card `OptimalLineupComparisonPanel.tsx`.
   - Lineup + rotation editor — `TeamHubContent.tsx:3022-3192` + `handleSaveLineupRotation` `:2680`.
   - Benchmark/readiness — `PregameBenchmarkChecklist.tsx`, `pregameLineupBenchmarks.ts`.
3. **Build `LineupsTabContent`** — `useFranchiseData().nextGame` → resolve opponentTeamId + gamesPlayed →
   `resolveFranchiseNextGameOptimalLineup(...)` (the seam) → display + accept/adjust + manual reorder +
   mojo/fitness edit.
4. **Collapse the pregame layer (5c)** — remove the standalone PRE-GAME LINEUP modal
   (`FranchiseHome.tsx:4255-4370`); "Play Ball" reads the lineup the tab set via `handleLaunchGame`
   (`:3636-3706`) + `withPregameManagerNavigationState` (`pregameNavigationState.ts:19-36`). Keep GameTracker's
   in-game lineup/sub edit as the last-second buffer.

### Gotchas
- **Avoid a trackerDb bump** — reuse the existing optimal-lineup snapshot persistence (a new store needs a
  `TRACKER_DB_VERSION` bump + the `franchiseSeasonLedgerStorage.test.ts` store-list pin).
- Franchise games: `statsScopeId === seasonId`.
- The main tree has JK's uncommitted working files (modified spec-docs + untracked `HANDOFF_DONE_*`) — stage
  only your own files.

---

## §2 — STREAM A: Fenway franchise-lens hub real-data adapter (`codex/auction-draft-ux-rehaul`)

Worktree `/Users/johnkruse/Projects/kbl-tracker--auction-ux`. The hub (`FranchiseLensHub.tsx`) is a **pure
view** fed one `{ teams, active, hub }` bundle; the adapter hook **`src/src_figma/hooks/useFranchiseLensData.ts`**
builds that bundle from the real engines. Non-destructive: behind the parallel route
`/__preview/franchise-lens/:franchiseId`; the live `/franchise` route + the mock route are untouched.

### Commits this session (6)
`6f08945b` Phase 1 spine (teams/active/roster/pulse/standings) · `03d3b9a3` Phase 2 (stadium/schedule/almanac)
· `046cb0d7` Phase 3 (player drawer) · `9bf4bf9c` Phase 4 (newsroom + checkpoint) · `47320458` played-season
seed harness · `ca943b7e` Clubhouse + farm + moments (the 3 gaps).

### State: ALL 11 hub surfaces now have a real source. Verified populated, 0 console errors.
- **Seed harnesses (dev-only routes):** `/__preview/franchise-lens-seed` (a deterministic demo franchise, no
  games) and `/__preview/franchise-lens-seed-played` (seeds + plays ~80% of a season through the **real**
  `processCompletedGame` pipeline with the living-season Phase-2 flags ON — populates standings/WAR/leaders/
  morale/True-Value/fame/checkpoints). The played seed reuses `franchiseLensDemoSeed.ts` +
  `franchiseLensSyntheticGame.ts` (a browser-safe synthetic-game generator; flags enabled AFTER init, run-once
  without a StrictMode cancel flag).

### Known gaps / NOT done
- **Spray charts empty** — the seeder writes box scores, not at-bat events (no spray dots). Stadium + drawer
  spray fill only from real game events.
- **News/recaps sparse** — the reporter's written stories are LLM-gated.
- **WAR runs high** — generous synthetic box scores over a short season (fixture tuning, not a wiring bug).
- **`moments` mostly empty** — only the season-end ceremony (from championships) wires; firing/rebrand/event
  takeovers fire from dark engines.
- **Rival-red renders without red** — this branch predates the home-park-rivalry seam (it's ~83 commits behind
  the engine trunk). `active.rivalId/rivalName` stay undefined; degrades gracefully.
- **The LIVE SWAP is gated, NOT done** — repointing the live `/franchise/:franchiseId` route to the new hub +
  rewriting the frozen tests on the legacy hub. Hard-to-undo; explicitly separate.
- **Lineups tab + pregame consolidation MOVED to the trunk track (§1)** — the keystone optimizer is NOT in
  this worktree (it's on `experiment/manager-wpa-window`). JK redirected: build the Lineups tab there, not by
  rebasing auction-ux.

### To truly "finish" Stream A
Rebase `codex/auction-draft-ux-rehaul` onto the engine trunk (brings the optimizer + the home-park-rivalry
seam for rival-red) → then the live swap. The lineups/pregame piece is now §1's track. Resume docs in the
worktree: `spec-docs/RESUME_FRANCHISE_FENWAY_REDESIGN.md`, `FRANCHISE_LENS_REALDATA_ADAPTER_PLAN.md` (all
phases ✅), `FRANCHISE_LENS_SURFACE_INVENTORY.md`.

---

## §3 — STREAM B: draft-setup UI (`codex/draft-setup-ui`)

Worktree `/Users/johnkruse/Projects/kbl-draft-ui`. Plan + JK's rulings:
**`spec-docs/FRANCHISE_DRAFT_SETUP_REALDATA_PLAN.md`** (JK added the §7 Captain Addendum with the rulings).

### Commit this session (1)
`ea729455` — the **archetype picker now reads the canonical engine module dynamically**. `TEAM_ARCHETYPES` in
`teamArchetypeCatalog.ts` is DERIVED from `HISTORICAL_ARCHETYPES` (`src/data/historicalArchetypes.ts`); the
`TeamArchetype` display shape is preserved so `ArchetypePicker`/preview are untouched. Per the ruling: the
archetype set is being finalized by a parallel thread → read the module, never hardcode. Verified: 15
archetypes render, 0 errors.

### JK's §7 rulings (proceed on these)
Tier = **budget only** (ratings frozen) · shill count **scales with league size + setup override**, persisted
pre-auction (bidding engine already built) · season rules = **one canonical home** (the config the season
consumes) + **free-typed** games & innings (no "Standard" preset) + fix the casing bug · **store the archetype
name** on each team (+ derive cap) · build **preview-first** · archetype list **PENDING → read the module
dynamically** · conferences toggle, default ON. **Scope correction:** scout-hire = **REUSE** the existing
scout-draft engine (`leagueBuilderStartupFarmDraft` + `scoutValueRange` + `leagueBuilderFarmScoutingHandoff`),
finish the ~80% — NOT a new store. **Scope additions (now Stream-B owned):** WS-0 setup→season seams
(farm-draft "continue to setup" dead-end, the lock-franchise confirmation, the misleading freeze copy) and the
scout label-name fix (real SMB4 names, possibly handled first by a separate lane).

### KEY FINDING — `archetype → capIdentity` is engine-coupled (surface before building it)
The "derive the cap from the archetype" ruling is **not a one-liner**: `archetypeCapShift` emits lux-keys like
`hitters/POW`, but the luxury-tax engine's `capIdentity.increase/decrease` use a **different `modStat`
vocabulary** (via `LUX_TO_MOD_STAT` + `identityCapShift` + `shiftLuxuryCaps` in `leagueConstruction.ts`). A
wrong mapping **silently mis-sets every team's salary cap**. Candidate to route to the engine thread that owns
the cap system.

### TWO FORKS PENDING JK (before more Stream-B build)
1. **Archetype→cap translation** — route to the engine thread (recommended) vs nail the `modStat` vocabulary
   myself with a unit test.
2. **Setup-screen writes** — greenlight editing the **live** setup screens (the real home for who-controls /
   GM / seats / season-rules + the seam fixes), vs keep parallel previews (writes stay cosmetic until then).
   Most remaining Stream-B value is in the live-screen fold-in.

### Parked (engine dependency)
The optimizer-gated quarter — draft-guide afford/bargain, in-season scout win-value, lineups-vs-SP framing,
in-game win-% — waits on the greenfield roster-optimizer. (Note: the Lineups *vs-SP* optimizer DOES exist on
the trunk and is being consumed by §1 — but Stream B's worktree is behind the trunk and doesn't have it.)

---

## Recommended resume order
1. **Lineups tab (§1)** — fresh session, on `experiment/manager-wpa-window`; the engine seam is done, start at
   the tab registration + component extraction.
2. **Stream B forks (§3)** — JK to rule the two forks; then the wire-now spine + scout-hire reuse.
3. **Stream A finish (§2)** — the rebase-onto-trunk + live swap (a coordinated, gated chunk).
