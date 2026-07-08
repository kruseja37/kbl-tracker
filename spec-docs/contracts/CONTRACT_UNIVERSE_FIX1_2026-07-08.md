# CONTRACT: UNIVERSE-FIX1 — archetype auto-fit leak past the draft pool universe (2026-07-08)

JK found in his live browser walk: "the players who are auto-selected by position for each
team's archetypal fit are pulled from the entire player database, instead of from the selected
league(s)." This is a fix lane against the just-merged draft-available player universe feature
(`spec-docs/DRAFT_POOL_UNIVERSE_SPEC_2026-07-08.md`, `CONTRACT_UNIVERSE_2026-07-08.md`).

## SETUP
1. `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules`
2. Read `spec-docs/DRAFT_POOL_UNIVERSE_SPEC_2026-07-08.md` and `spec-docs/contracts/CONTRACT_UNIVERSE_2026-07-08.md`.
3. This contract, included in the commit.

## CONTEXT (what already exists on main)
The universe feature filters players by each league's `sourceLeagueIds` (absent field = null =
UNFILTERED, same array reference; explicit array = curated; explicit `[]` = unclaimed free
agents only). The page computes `universePlayers` (`LeagueBuilderDraftSetup.tsx` ~:1419-1428)
and both EXTRACTION call sites (`buildModeAResult` ~:2131-2151, `buildPoolFirstShapeResult`
~:2153-2183) consume it correctly. The manual hand-add shuttle/ledger (`availablePlayers`,
`foldHandEditLedger`'s `universeIds`) deliberately stays UNRESTRICTED (explicit user action) —
a ratified judgment call, unchanged by this lane.

## THE BUG
Automatic candidate-sourcing paths OTHER than the two extraction calls still read the raw,
unfiltered `players` array (the whole app player database via `getAllPlayers()`,
`useLeagueBuilderData.ts:211`). THE RULE (captain ruling, matches JK's intent): every AUTOMATIC
selection/suggestion/ranking path in Draft Setup must respect the universe; only explicit manual
hand-adds may reach outside it.

## EXHAUSTIVE TRACE — every consumer of raw `players`, classified

| Path | Location | Classification | Action |
|---|---|---|---|
| Archetype auto-fit **candidate feed** (`sourcePlayers`/`simPool`/`target.picks` shown per slot) | `RosterDesigner.tsx:390` (`sourcePlayers = mode==="design-first" && !lockedPool ? (allPlayers ?? players) : players`), fed `allPlayers={players}` from the page at `LeagueBuilderDraftSetup.tsx:3684` (pre-fix line) | **AUTOMATIC** — this is the exact bug JK saw (`SlotGroup`/`SlotEditor` render `targetPick.playerName` per position, `RosterDesigner.tsx:831-833`) | Fixed — new `candidatePlayers` prop, top priority in the fallback chain, fed `universePlayers` from the page |
| Pin **name lookup** (`labelPlayers`/`fullPlayerById`) | `RosterDesigner.tsx:392-393` | MANUAL-adjacent lookup — must resolve ANY pinned player's display name even if a later universe toggle excludes them (proven by the existing "resolves orphaned pin names" test) | Unchanged — stays `allPlayers ?? players` (full app set) |
| `rosterDesignerPlayers` (unlocked design-first branch) → feeds roster-design feasibility tone, archetype draftability ranking (idle-callback effect → `ArchetypePicker`'s `draftability` prop), `resolveIdentityDraftability` (→ identity auto-fill/reroll) | `LeagueBuilderDraftSetup.tsx:1608` (was `poolMode==="design-first" && !locked ? players : inPoolPlayers`) | **AUTOMATIC** — feasibility tone and archetype draftability ranking are automatic computed feedback | Fixed — unlocked-design-first branch now returns `universePlayers`; locked/pool-first branch unchanged (`inPoolPlayers`, already-committed membership) |
| `designFirstIdentityCriticalPlayerIds(humanTeams, players, ...)` — re-derives `buildBest22Target` for LOCKED designs to compute extraction `designPriorityIds` | `LeagueBuilderDraftSetup.tsx:619-653` (def), call site `:1652` | **AUTOMATIC** — same auto-fit algorithm, feeding extraction priority hints | Fixed — call site now passes `universePlayers` |
| `poolFirstManualShapeDiagnostics.fullPoolEligibleCandidateCount` | `LeagueBuilderDraftSetup.tsx:1719` (live diagnostic) and `:2567` (console.info fallback in `regenerateProductionPool`) | Diagnostic count, not currently rendered in the UI, but the SAME field the real extraction engine computes from the filtered universe (`poolFromDemand.ts:1944/1973`) — inconsistent otherwise | Fixed — both now use `universePlayers.length` |
| `teamRosterPlayers(input.players, activeLeagueId, teamId)` inside `buildIdentityAutoAssignPlan` (identity auto-fill/reroll roster-fit heuristic) | `LeagueBuilderDraftSetup.tsx:439-448` (def), called from `handleAutoFillRemainingIdentities`/`handleRerollTeamIdentities` (`:2382`/`:2411` pre-fix lines) with raw `players` | **NOT a universe consumer** — filters by exact `leagueAssignments.leagueId === activeLeagueId && teamId === teamId` match; a player already on THIS team's roster in THIS league must stay visible for the roster-fit heuristic regardless of the source-league checkboxes (own league is un-checkable per JK ruling 1, but existing roster membership must not vanish) | Unchanged — kept raw `players`, documented as membership-based not candidate-sourcing |
| `selectedTeamRosterIds` (`players.filter(playerBelongsToSelectedTeamRoster(...))`) | `LeagueBuilderDraftSetup.tsx:1476-1479` | **NOT a universe consumer** — exact `league.teamIds` roster-assignment match, same reasoning as above | Unchanged |
| `modeAHandLedger`'s `universeIds: players.map(...)` and `handleExtractPool`'s hand-edit-ledger fold `universeIds`/`currentMemberIds` | `LeagueBuilderDraftSetup.tsx:1392`, `:2627` (pre-fix lines) | **MANUAL-adjacent** — already explicitly documented in-code (pre-existing comment) as deliberately unrestricted: validates hand-add/hand-remove ledger entries reference a real player in the app, not scoped to the curated universe | Unchanged (pre-existing, not touched) |
| `availablePlayers` (manual shuttle "AVAILABLE" pane) | `LeagueBuilderDraftSetup.tsx:1404-1405` | **MANUAL-EXPLICIT** — the ratified judgment call from the original spec (§6/§7): fine curation stays unrestricted | Unchanged |
| `leaguePlayerCounts` (per-league player count for the checkbox list itself) | `LeagueBuilderDraftSetup.tsx:1446-1452` | **NOT a candidate feed** — must count membership across ALL leagues shown in the checkbox UI, by construction needs the full player set | Unchanged |
| `focusedPlayer` lookup, `ivById` cache, `playerByIdForDiagnostics` (identity-critical-missing-reason name lookup) | `LeagueBuilderDraftSetup.tsx:1461-1462`, `:1472-1474`, `:3127` (pre-fix lines) | **LOOKUP, not candidate sourcing** — `playerByIdForDiagnostics` in particular MUST stay full-set: it resolves names for players the extraction reported as `'not in eligible player universe'`, i.e., exactly the out-of-universe ids that would break if narrowed | Unchanged |
| `registerLeaguePoolForLeague` / `lockLeaguePool` (pool lock/snapshot) | `leagueBuilderPoolRegistration.ts:86-129` | **NOT a fresh selection** — snapshots players ALREADY carrying a `leagueAssignments` entry for this league (i.e., already committed via prior extraction or manual add); membership was already correctly decided upstream | Unchanged, verified read-only |
| `evaluatePoolComposition` | `leagueBuilderPoolBuilder.ts:495-525` | Reads the already-registered/locked pool (`getRegisteredPool`), not raw players | Unchanged |
| `inPoolPlayers`, `inPoolClassifiedDemandPlayers`, `poolFirstManualShapeDiagnostics`'s `demandPlayers`, `targetByTeamId` effect's `simPool`, `buildRecheckReport`'s `poolPlayers` | Various, all keyed off `inPoolPlayers` | **NOT raw-players consumers** — already scoped to "already a member of this league's pool," orthogonal to universe curation, correct pre-fix | Unchanged |
| `extractPoolFromDemand(demandUniverseFromPlayers(universePlayers), ...)` (both call sites) | `LeagueBuilderDraftSetup.tsx:2135`, `:2163` | Already fixed by the original UNIVERSE lane | Unchanged (verified still correct) |

## THE FIX

1. **`RosterDesigner.tsx`**: added a new optional prop `candidatePlayers?: readonly Player[]`,
   given TOP priority in the `sourcePlayers` fallback chain (`candidatePlayers ?? allPlayers ??
   players`), used ONLY for the unlocked-design-first auto-fit candidate feed. `allPlayers`
   keeps its original full-app-set semantics for `labelPlayers`/`fullPlayerById` (pin name
   resolution) — a deliberately SEPARATE channel, since a manually-pinned player must still
   resolve its display name even after a universe toggle excludes them (existing orphan-pin
   behavior, now correctly reported as "LEFT THE POOL" rather than silently including them
   as an active shortlist candidate).
2. **`LeagueBuilderDraftSetup.tsx`**:
   - `rosterDesignerPlayers`: unlocked-design-first branch now returns `universePlayers` instead
     of raw `players` (locked/pool-first branch unchanged, still `inPoolPlayers`).
   - `designFirstIdentityCriticalIds`: call site now passes `universePlayers`.
   - RosterDesigner render: added `candidatePlayers={universePlayers}` alongside the unchanged
     `players={rosterDesignerPlayers}` / `allPlayers={players}`.
   - `poolFirstManualShapeDiagnostics.fullPoolEligibleCandidateCount` and its console.info
     fallback in `regenerateProductionPool`: both now use `universePlayers.length`.

## F20/staleness interplay
No new interplay: every auto-fit output fixed here (`designFirstIdentityCriticalIds`, the
RosterDesigner live target/shortlist, draftability ranking) is either (a) not part of the
persisted `poolExtractedBasis` at all (draftability/shortlist are live-only, recomputed every
render, never persisted), or (b) already covered — `designPriorityIds` feeds
`extractPoolFromDemand`, whose universe input (`sourceLeagueIds`) is already in the basis
fingerprint (`buildPoolExtractedBasis`, `poolBasisStaleLines`, `LeagueBuilderDraftSetup.tsx:898-938`,
built by the original UNIVERSE lane, untouched here).

## TESTS ADDED
- `src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.test.tsx`:
  - "UNIVERSE-FIX1: design-first identity-critical auto-fit target only draws candidates from
    the checked source-league universe" — curated `sourceLeagueIds`, asserts every
    `buildBest22Target` call's `simPool` argument excludes a player belonging only to an
    unchecked league, while at least one call still saw substantive in-universe candidates.
  - "UNIVERSE-FIX1: absent sourceLeagueIds stays unfiltered — identity-critical auto-fit sees
    the same candidates as pre-fix" — regression lock: default/absent field still includes the
    other-league player, proving the fix didn't silently narrow the unfiltered default.
- `src/src_figma/__tests__/components/RosterDesigner.test.tsx`:
  - "UNIVERSE-FIX1: candidatePlayers scopes the auto-fit shortlist to the draft universe;
    allPlayers still resolves orphaned pin names" — component-level proof that `candidatePlayers`
    outranks `allPlayers` for the shortlist while pin-name label resolution is unaffected.

`LeagueBuilderDraftSetup.test.tsx` is a documented batch-flake — judged SOLO throughout.

## GATES (all run solo/focused, not the full suite)
- `npx tsc -b --pretty false` — clean, no output.
- `npm run build` — exit 0.
- `RosterDesigner.test.tsx` — 20/20 passed (solo).
- `LeagueBuilderDraftSetup.test.tsx` — 70/70 passed (solo).
- `leagueBuilderPoolUniverse.test.ts`, `leagueBuilderPoolBuilder.handEditLedger.test.ts`,
  `leagueBuilderPoolMembership.dj05.test.ts`, `poolFromDemand.test.ts`, `seatAllClubs.test.ts`
  — 90/90 passed (engines untouched, confirmed still green).

## ALLOWED SURFACE used
`LeagueBuilderDraftSetup.tsx`, `RosterDesigner.tsx` (prop addition only, no redesign), both
test files, this contract. No changes to `leagueBuilderPoolBuilder.ts`,
`leagueBuilderStorage.ts`, engine math (`best22Target.ts`, `poolFromDemand.ts`,
`draftabilityRanker.ts`), or the manual shuttle/hand-add behavior.

## Commit
`fix(draft-setup): all automatic candidate paths respect the player universe (archetype
auto-fit leak) [UNIVERSE-FIX1]` + trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
