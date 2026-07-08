# CONTRACT: Draft-Available Player Universe (2026-07-08)

You are a builder on the KBL Tracker repo (React+TS+Vite+IndexedDB tracker for Super Mega Baseball 4). You are in an isolated git worktree (your cwd) on your own branch off current main. Deliver the DRAFT-AVAILABLE PLAYER UNIVERSE feature. Commit when green; do NOT push/merge — captain merges after adversarial audit.

## SETUP
1. `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules`
2. Spec: `spec-docs/DRAFT_POOL_UNIVERSE_SPEC_2026-07-08.md` (98 lines, read in full).
3. This contract file, included in the commit.

## JK RULINGS (2026-07-08 — resolve the spec's §10 open questions; where they conflict with older spec prose, the rulings win)
1. Own league IS un-checkable. The additive-only guardrail in the spec is REPLACED by warn-don't-block: (a) empty resolved universe → extraction disabled with a plain one-line hint naming the cause; (b) universe smaller than demand target → extraction proceeds, existing engine top-up (§5 `engineGeneratedCount`) covers the shortfall, UI says plainly how many players were engine-generated.
2. Checkbox list shows ALL leagues in the app — flat list, each with its player-pool count.
3. `sourceLeagueIds` persists ON THE LEAGUE RECORD (`LeagueTemplate`), not sessionStorage.

### CAPTAIN CORRECTION (2026-07-08 post-adversarial-audit — REQUIRED REWORK, supersedes the default-state clauses this contract originally attached to rulings 2/3)
The original clauses "Default: own league checked, others unchecked" and "Absent field = `[ownLeagueId]` semantics" were the captain's contract framing error, NOT JK rulings — JK only ruled list contents, un-checkability, and record persistence. Audit Finding 1: the own-league-only default was not back-compat (a new league's default universe = 0 own members + ~66 free agents, EXCLUDING the ~440 SMB4 `'sml'` seed players; pre-feature behavior draws from ALL players). Corrected semantics, as re-built:
- **Absent/undefined `sourceLeagueIds` = ALL leagues checked = UNFILTERED.** `resolveSourceLeagueIds` returns `null` for "unfiltered" and the universe filter is skipped entirely — provably byte-identical to pre-feature behavior. None of the new gating (empty-universe disable, free-agent info line) applies in the unfiltered state.
- **UI**: absent field renders every league checkbox CHECKED. The first user toggle writes the explicit full list minus/plus the toggled league (an explicit array from then on). Still no write-back on load — only on user action.
- **Explicit array (any content) = curated**, filtered exactly as originally built. Explicit `[]` = unclaimed free agents only.
- **Audit Finding 3 honesty tweak**: explicit `[]` with free agents keeping the universe non-empty → extraction stays enabled (warn-don't-block stands) with the info line "No league sources checked — drafting from unclaimed free agents only." The disable+hint remains for the truly-zero universe.
- **F20 basis comparison is null-aware**: absent-in-basis = unfiltered (a pre-feature record and an untouched default are equivalent), so legacy records never retro-nag; unfiltered↔explicit and explicit↔explicit changes both trip the staleness line.

## VERIFIED FILE:LINE MAP (re-verified from source this session; spec's citations had drifted ~10-15 lines from insertions since capture)
- Universe resolver call sites (both read `players` in scope): `buildModeAResult` → `extractPoolFromDemand(demandUniverseFromPlayers(players), ...)` at `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx:2043-2044`; `buildPoolFirstShapeResult` → same shape at `:2069-2070`.
- `isPlayerInLeaguePool` — `src/utils/leagueBuilderPoolBuilder.ts:51-53`.
- `LeagueTemplate` interface — `src/utils/leagueBuilderStorage.ts:133-164`; `poolExtractedBasis` shape at `:148-153`.
- `Player.leagueAssignments` — `src/utils/leagueBuilderStorage.ts:399`.
- `getAllLeagueTemplates`/`getLeagueTemplate`/`saveLeagueTemplate` — `src/utils/leagueBuilderStorage.ts:907-956`; `normalizeLeagueTemplateRecord` (migration path, does NOT write `sourceLeagueIds` back) at `:681-693`.
- DB version — `DB_VERSION = 8` (`src/utils/leagueBuilderStorage.ts:47`); version bumps in this file are tied ONLY to `createObjectStore`/`createIndex` calls in `onupgradeneeded` (`:801+`). Adding an optional field to the `LeagueTemplate` interface does not touch any object store or index, so **no version bump required**. Version-pin tests (`leagueBuilderStorage.editorialSchema.test.ts:145`, `leagueBuilderStorageV6Migration.test.ts:277/285/319/350`, all asserting `db.version === 8`) stay green untouched.
- `saveLeagueDraftSetup` generic league-patch helper — `LeagueBuilderDraftSetup.tsx:1907-1914` (extend its `Pick<>` union with `"sourceLeagueIds"`).
- `hook.leagues` (ALL leagues, already loaded) — `src/src_figma/hooks/useLeagueBuilderData.ts:87/208-217`; destructured in the page at `LeagueBuilderDraftSetup.tsx:1141`.
- F20 recheck fingerprint — `currentRecheckKey` `LeagueBuilderDraftSetup.tsx:2646-2657`, `recheckStale` at `:2671`.
- F20 design-first basis staleness (the ACTUAL lock-blocking mechanism — `canModeALock` at `:2694-2700` requires `!poolTrailing`, and `poolTrailing` at `:1698` is driven by `basisStale`) — `buildPoolExtractedBasis` `:885-902`, `poolBasisStaleLines` `:904-932`, called at `:1668` (live) and `:2544` (persisted at extract time).
- §5 top-up — `engineGeneratedByBand`/`engineGeneratedCount` already computed by `src/engines/poolFromDemand.ts` (`:297`, `:772-853`) and already logged (not user-facing plain copy) at `LeagueBuilderDraftSetup.tsx:2470` and inside dense diagnostic strips at `:3071`/`:3104`. No design-first equivalent plain copy exists at all today (those two existing usages are pool-first-only).
- §6 fine curation — `poolShuttle` "Remove" button (`handleRemove`, `:2360+`) already calls `removePlayersFromLeaguePool`, which is generic over ANY player regardless of source league. **Already fully wired — verified, zero new code path needed.**

## BUILD ITEMS

### §2 Universe resolver
- Add to `src/utils/leagueBuilderPoolBuilder.ts` (near `isPlayerInLeaguePool`):
  - `resolveSourceLeagueIds(league: Pick<LeagueTemplate,'id'|'sourceLeagueIds'>): string[]` → `league.sourceLeagueIds ?? [league.id]`. Only `undefined` defaults; an explicit `[]` (user unchecked everything, including their own league per ruling 1) stays `[]` — do NOT treat empty array as "reset to default."
  - `isPlayerInSourceUniverse(player: Player, sourceLeagueIds: readonly string[]): boolean` → `sourceLeagueIds.some(id => isPlayerInLeaguePool(player, id))`.
- In `LeagueBuilderDraftSetup.tsx`, add `sourceLeagueIds = useMemo(() => league ? resolveSourceLeagueIds(league) : [], [league])` and `universePlayers = useMemo(() => league ? players.filter(p => isPlayerInSourceUniverse(p, sourceLeagueIds)) : players, [players, league, sourceLeagueIds])`. Replace `demandUniverseFromPlayers(players)` with `demandUniverseFromPlayers(universePlayers)` at BOTH call sites (`:2044`, `:2070`) only — swap `players` → `universePlayers` in the two `useCallback` deps arrays for `buildModeAResult`/`buildPoolFirstShapeResult`. No other `players` usage in the file changes.
- Deliberately UNCHANGED: `foldHandEditLedger`'s `universeIds: players.map(...)` at `:1369` and `:2531-2532` stays scoped to the FULL app player set, not the curated universe — narrowing it would silently prune hand-adds of manually-added out-of-universe players (the shuttle's Add/Remove already work over the full app player list per §6, independent of the checkbox curation). Comment this explicitly at both sites.

### §3 Dedup — no runtime logic (finding confirmed: single global player row + multi-league `leagueAssignments`, zero identity collisions possible under current model). Document as forward-compat placeholder comment next to the new filter.

### §4 Snapshot semantics — confirm-only: extraction is on-click (`handleExtractPool`), not live-linked; add one test proving a source-league edit after extraction does not retroactively change the already-extracted pool.

### §5 Top-up copy
Add ONE plain-language line, shown whenever the resolved engine-generated count > 0: `"{N} player(s) were engine-generated to help fill the roster demand."` Cover BOTH modes (design-first has no existing equivalent; pool-first's existing diagnostics only show a bare number in a dense strip). Compute via the existing `activePoolShapeReport?.numericShape?.engineGeneratedByBand` sum, falling back to `poolProvenance.engineGeneratedIds.size` for pool-first pre-extraction state (matches the existing pattern at `:3071`/`:3104`).

### §6 Fine curation — VERIFIED already fully wired via the generic Remove button in `poolShuttle`. No code change. Add one comment confirming this + one test asserting a curated-universe (non-own-league) player can be excluded via the same path as a native player.

### §7 UI — league checkbox list
- New JSX block `sourceLeaguesPanel`, styled to match the existing "POOL BALANCE"/"POOL SOURCE"/"POOL QUALITY" boxes (`border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] px-3 py-2`), listing every league in `leagues` (hook state, already loaded — no new fetch) with: checkbox (checked = membership in `sourceLeagueIds`), league name (mark the active league distinctly, e.g. "(this league)"), player-pool count (`players.filter(p => isPlayerInLeaguePool(p, candidate.id)).length`, memoized once over `players`+`leagues`).
- Own league checkbox is NOT locked/disabled (ruling 1). All checkboxes disabled when `poolEditingBlocked || busy` (matches sibling extraction-input controls).
- Toggle handler persists the FULL next `sourceLeagueIds` array to the league record via `saveLeagueDraftSetup({ sourceLeagueIds })` (extend its Pick union).
- Render `{sourceLeaguesPanel}` as the FIRST element inside BOTH the design-first branch (`:3543+`) and the pool-first branch (`:3775+`) of the "4 · THE POOL" panel — visible in both modes, at every sub-state.
- Empty-universe hint (ruling 1a): when `sourceLeagueIds.length === 0` OR the resolved `universePlayers.length === 0` with sources checked, show a plain one-line cause ("no sources checked" vs "checked league(s) have no players") inside the panel, AND disable: design-first Extract Pool button + both RE-EXTRACT variants; pool-first Regenerate/Reroll buttons. Do NOT gate Import-from-branded-teams or the manual shuttle Add/Remove (unrelated to curated universe, per §6 finding).

### §8 Staleness integrity
- Add `sourceLeagueIds` (sorted) to `currentRecheckKey` (`:2646-2657`) + its deps array — the advisory recheck signal.
- Add `sourceLeagueIds?: string[]` to `LeagueTemplate.poolExtractedBasis` (`leagueBuilderStorage.ts:148-153`). Extend `buildPoolExtractedBasis`'s param type to `Pick<LeagueTemplate,"teamIds"|"poolSizeMultiplier"|"id"|"sourceLeagueIds">`, populate `sourceLeagueIds: resolveSourceLeagueIds(league)` in its return. Extend `poolBasisStaleLines` to push a line (matching the existing tone/style, e.g. "THE DRAFT POOL SOURCES CHANGED — RE-EXTRACT TO PULL FROM THE NEW SET.") when the sorted extracted vs live `sourceLeagueIds` differ. **This is the load-bearing one** — `canModeALock` requires `!poolTrailing`, and `poolTrailing` is driven by `basisStale`, so this is what actually blocks a stale re-lock in design-first (the literal F20 bug: "lock silently re-extracts"). The `currentRecheckKey` change alone would NOT block re-lock.
- Pool-first has no equivalent auto-block-on-stale-input for ANY existing knob (poolBalancePreset/poolSourceMode/poolQualityCenter don't block Lock either) — do not add new blocking behavior there; consistent with "the same way other knobs do."
- Seed-context ask (spec §8 "Determinism/seed context" paragraph): the per-player axis seed is `${leagueId}:${player.id}` (`leagueBuilderPoolBuilder.ts:279-286` comment), independent of universe composition or filter build order — determinism already holds with ZERO changes needed. Do NOT inject a `sourceLeagueIds` hash into the axis regen seed: (a) `leaguePoolAxisRegen.ts` is engine math (forbidden surface), and (b) doing so would perturb every player's axis values on every source-league toggle even when membership doesn't change — a pure downside vs. the current per-player-key determinism. Document this as a judgment call, not a silent scope cut.

### Spec upkeep (same lane)
Flip `DRAFT_POOL_UNIVERSE_SPEC_2026-07-08.md` header PARKED → BUILDING (this lane), record the three JK rulings in §10 with today's date.

## ALLOWED SURFACE
`LeagueBuilderDraftSetup.tsx`; `src/utils/leagueBuilderStorage.ts` (LeagueTemplate type + persistence ONLY — do not touch Personality types/normalization); `src/utils/leagueBuilderPoolBuilder.ts`; `src/src_figma/app/engines/leaguePlayerAdapter.ts` (read-only reference, no changes expected — `demandUniverseFromPlayers` signature is untouched, callers just pass a pre-filtered array); the universe spec doc; tests; this contract.

FORBIDDEN: auction floor pages/components; `rosterIntelligencePayload.ts`; engines' math (including `leaguePoolAxisRegen.ts`); session SOT docs.

## MIGRATION CARE
Every read path treats an absent `sourceLeagueIds` as `[ownLeagueId]` (via `resolveSourceLeagueIds`) without writing anything back until the user touches the checkbox control. `normalizeLeagueTemplateRecord` is NOT touched (no write-back on read). DB version stays 8 — no object store/index change (evidence above).

## TESTS
Universe filter honors checked set incl. own-league-unchecked; back-compat default (absent field ⇒ current behavior byte-identical); empty-universe disables extraction with a cause-naming hint; small-universe top-up plain copy; persistence round-trip on the league record; F20 basis fingerprint invalidates re-lock on source change; both extraction modes covered. `LeagueBuilderDraftSetup.test.tsx` is a documented batch-flake — judge it SOLO.

## GATES
`npx tsc -b --pretty false`; `npm run build`; focused suites: `LeagueBuilderDraftSetup` (solo), `leagueBuilderPoolBuilder` tests, `leagueBuilderStorage` tests (incl. editorialSchema/V6Migration), anything covering extraction. Do NOT run the full suite.

## Commit
`feat(draft-setup): draft-available player universe — per-league source checkboxes, warn-don't-block, record-persisted [UNIVERSE]` + trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
