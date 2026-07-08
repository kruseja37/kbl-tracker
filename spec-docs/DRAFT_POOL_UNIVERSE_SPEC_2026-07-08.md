# Draft-Available Player Universe — Spec Draft (BUILDING)

**BUILDING (2026-07-08) — JK ruled all three §10 forks the same day this spec was captured; see the rulings recorded at the top of §10 below. Single-seam verdict (both extraction modes converge on one adapter call, LeagueBuilderDraftSetup.tsx ~:2029/:2055 at capture time, re-verified at ~:2043/:2069 at build time); size: small-to-moderate (the anticipated dedup problem doesn't exist — players are shared global rows with multi-league leagueAssignments). Build lane: CONTRACT_UNIVERSE_2026-07-08.md.**

Status: **parked feature**, captured 2026-07-08 per JK so context isn't lost. Not scheduled to any lane. Grounded against `main` as of this session; re-verify file:line citations before build (this area — Draft Setup / pool extraction — moves fast).

---

## 1. Concept + JK intent

Today, when a league extracts its draft pool (either pool-first or design-first), the candidate universe is drawn from every player in the app's shared player database, with no way to say "only pull from these leagues." JK's ask: put a checkbox next to each **league** on Draft Setup, so the user can pick which leagues' player pools feed the extraction — e.g. build one curated "all-legends" league and a "friends-import" league, then check both boxes when setting up a new competitive league to draft from exactly that combined talent pool. No new organizing concept is introduced — leagues (a primitive that already exists) are the unit of curation. Coarse selection is the checkboxes; fine selection (drop five specific guys) rides the pool review screen that already exists, via a per-player exclude toggle.

## 2. The universe resolver — current seam + the change

**Current seam (single, confirmed):** both extraction paths call the same adapter function on the same source array:

- Design-first: `buildModeAResult` → `extractPoolFromDemand(demandUniverseFromPlayers(players), ...)` — `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx:2029-2030`
- Pool-first: `buildPoolFirstShapeResult` → `extractPoolFromDemand(demandUniverseFromPlayers(players), ...)` — `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx:2055-2056`
- Adapter: `demandUniverseFromPlayers(sourcePlayers)` — `src/src_figma/app/engines/leaguePlayerAdapter.ts:86-88`, maps each `Player` via `demandPlayerFromLeaguePlayer` (same file, `:54-84`).

`players` is component state populated once from `getAllPlayers()` in the data hook — `src/src_figma/hooks/useLeagueBuilderData.ts:211` (initial load) and `:304` (refresh) — which returns **every player row in the app**, with **no league filter applied before it reaches the resolver**. That is the surprising-but-verified baseline: today, any league can already extract any player in the database into its own pool; `isPlayerInLeaguePool` (`src/utils/leagueBuilderPoolBuilder.ts:51-53`) is only used to split "already a member of THIS league" from "everything else," not to gate the universe by source league.

**The change:** insert one filter step before `demandUniverseFromPlayers(players)` is called at both of the two call sites above:

```
universe = players.filter(p =>
  (league.sourceLeagueIds ?? [league.id]).some(id => isPlayerInLeaguePool(p, id))
)
demandUniverseFromPlayers(universe)   // same call, filtered input
```

Both `buildModeAResult` and `buildPoolFirstShapeResult` read from the same `players` variable already in scope (`useCallback` deps at `:2046` and `:2076` both list `players`), so this is a one-place change replicated at two call sites, not two divergent implementations — the resolver stays single-seam. Nothing downstream of `extractPoolFromDemand` changes for either mode.

## 3. Dedup rule

**Finding that reshapes this section:** player identity in this app is **not** per-league. `Player.id` (`src/utils/leagueBuilderStorage.ts:307-308`) is a single global row; league membership is carried as `leagueAssignments?: LeagueAssignment[]` **on that one row** (`:372`), and the array already supports a player belonging to several leagues at once — `isPlayerInLeaguePool` is an `.some()` check (`src/utils/leagueBuilderPoolBuilder.ts:51-53`), and edits to a player (`handleSaveEditedPlayer` → `updatePlayer`, `LeagueBuilderDraftSetup.tsx:2570-2595`) mutate that single shared row for every league that references it. There is no existing import path that forks a player into per-league copies (no `importPlayers`/CSV-import utility found in the codebase).

Consequence: merging `sourceLeagueIds[]` via `Set` union on `player.id` produces **zero identity collisions under the current data model** — "Babe Ruth" checked in from both the legends league and a friends-import league is either (a) the same row, appearing once, trivially, or (b) two genuinely different rows (two separate manually-created players who happen to share a name), which is not a collision at all — they are different entities and both correctly appear.

The "most-recently-updated league wins" rule the captain specified therefore has **no live case to resolve today** — it would only matter if a future feature forked player ratings per league (out of scope here, no such primitive exists). Recommendation: keep the rule stated as a forward-compatibility placeholder only, and mark it **SIM-TUNE/JK-adjustable / not yet load-bearing** — do not build reconciliation logic for a conflict that cannot occur under the current single-row model. If a future "per-league player fork" primitive is ever added, this rule becomes real and needs its own spec.

## 4. Version/snapshot rule

Precedent already exists for "freeze the current values, don't live-link": `registerLeaguePoolForLeague` (`src/utils/leagueBuilderPoolRegistration.ts:86-129`) reads `getAllPlayers()` fresh and computes `iv`/`salary` **once**, at lock time (`:120-124`: `players: leaguePlayers.map(player => ({ id, iv: calculateIvBaseSalary(...).ivBase, salary: player.salary }))`), then persists that computed snapshot via `saveRegisteredPool` (`:127`). The registered pool is not re-derived after lock; `lockLeaguePool` (`src/utils/leagueBuilderPoolBuilder.ts:287-293`) calls this exact function.

Because the underlying player rows are shared (§3), "snapshot" for this feature doesn't need to copy attribute values — it only needs to snapshot **which player ids** were pulled in, at the moment of extraction. That already happens: `handleExtractPool` (`LeagueBuilderDraftSetup.tsx:2507-2538`) stamps `modeAExtractedIds`, `poolExtractedAt`, `poolExtractedBasis` onto the league record (`:2529-2531`) and the design-first re-extract effect only fires reactively off hand-edit ledger state, not off a live universe recompute loop. Recommendation: `sourceLeagueIds[]` selection resolves the universe **at the moment Extract Pool is clicked**; if a source league's roster changes later (someone edits a legends-league player, or adds a new one), that does NOT retroactively change an already-extracted pool — the user must re-extract (existing re-extract confirm flow, `runModeAReExtract`, `:2697-2703`) to pick up source-league changes. This matches existing user-facing behavior for every other pool input (team designs, tier budget, etc.) — no new UX concept needed.

## 5. Supply top-up

Existing machinery already synthesizes players when the candidate set undersupplies target roster demand — `extractPoolFromDemand`'s `engineGeneratedPlayers` (`src/engines/poolFromDemand.ts:729`, filled at `:1104`, `:1938`, `:1967` from `players.filter(player => !protectedIds.has(player.id))`), counted and surfaced back to the UI as `engineGeneratedCount` (`LeagueBuilderDraftSetup.tsx:2456`) and broken out by demand band as `engineGeneratedByBand`/`finalPoolByBand` (`poolFromDemand.ts:297`, `LeagueBuilderDraftSetup.tsx:2471-2472`).

This machinery does not need new plumbing to serve the curated-universe case — it already exists to fill exactly this kind of gap, and it will trigger more often when a curated `sourceLeagueIds[]` set is small relative to `budgetPerTeam × teams` demand. Requirement: the existing UI surface for `engineGeneratedCount` must read honestly as **"N generated players added to meet demand"** wherever the mode-A report renders that count (currently a bare number in the report object — verify at build time whether the review screen already prints copy for this or just the count; if just the count, this is a small copy addition, not new logic).

## 6. Fine curation (per-player exclude)

Rides existing hand-edit ledger machinery — no new store, no new UI surface class:

- **Design-first**: `HandEditLedger { handAdds, handRemoves }` (`LeagueBuilderDraftSetup.tsx:308`), folded by `foldHandEditLedger` (`src/utils/leagueBuilderPoolBuilder.ts:59-92`) against `league.modeAHandAdds` / `league.modeAHandRemoves` / `league.modeAExtractedIds` (persisted at `:2531-2533`). A per-player exclude on the review pane already produces a `handRemove` through this exact path — the "except these 5 guys" case is index-for-index the same operation already wired for "I manually pulled a guy out of the extracted design-first pool."
- **Pool-first**: `PoolProvenanceState.manualExcludedIds` (`LeagueBuilderDraftSetup.tsx:310-316`), persisted to session (`loadPoolProvenanceFromSession`/`savePoolProvenanceToSession`, `:665-698`) and consumed as `excludedIds` in `buildPoolFirstShapeResult` (`:2070`).

Both ledgers are keyed by `player.id`, so a curated-universe player excluded via either path behaves identically to an excluded native-league player today — the exclude toggle needs zero new code path, only a UI affordance in the existing "IN THE POOL" / "AVAILABLE" pane pair (`poolShuttle`, `:2705+`).

## 7. UI sketch

Placement: a checkbox list of leagues sits with the existing pool-source controls on Draft Setup — the same visual neighborhood as `poolSourceMode` (team-roster-priority vs full-pool, session-persisted at `:700-713`) and the reserve-price dial (`ReservePriceDial`, `:758+`). Suggested label: "Draft pool sources" with the active league pre-checked and locked-on (can't uncheck your own league), plus one row per other existing league template, each with a checkbox.

**Default = current behavior, byte-identical for untouched setups**: `sourceLeagueIds` defaults to `[league.id]` only. A league record with no explicit `sourceLeagueIds` (every existing league today) resolves to exactly the current universe-filter no-op, so this ships with zero behavior change until a user actively checks a second box.

## 8. Interactions

- **F20 (lock silently re-extracts the design-first pool)** — flagged as an open post-walkthrough fix in `spec-docs/MORNING_PACKET_2026-07-08.md:17` and `spec-docs/CONTINUITY_CHECKPOINT.md:54`. The closest existing "did the reviewed set drift from what's about to lock" guard is the recheck-staleness pair: `currentRecheckKey` (`LeagueBuilderDraftSetup.tsx:2632-2643`, a JSON fingerprint of pool ids + cap + team ids + dial + shills + design lock state) vs `recheckStale` (`:2657`, true when the fingerprint has moved since the last recheck). `sourceLeagueIds` must be added to that fingerprint — changing which leagues feed the universe is exactly the kind of change this guard exists to catch, and today's fingerprint has no field for it.
- **Determinism / seed context** — extraction and axis regen are already deterministic in `${leagueId}:${player.id}` (`lockLeaguePool` comment, `src/utils/leagueBuilderPoolBuilder.ts:279-286`). A universe-composition hash (e.g. hash of sorted `sourceLeagueIds`) should join that seed context so two leagues with identical `sourceLeagueIds` + identical downstream inputs reproduce the same locked pool — worth stating explicitly since it's cheap and prevents a subtle non-determinism if build order of the filter ever varies.
- **Reserve pricing** — unaffected. Reserve price (`reservePriceK`, session-persisted at `:737-756`) is a per-extraction dial applied after the universe is resolved; it has no coupling to which leagues sourced the universe.
- **23-CP / closer-supply consideration at larger source sets** — `LEGAL_ROSTER.minClosers` (referenced at `src/engines/auctionBoardFrame.ts:70`, `auctionCompletionFloor.ts:123`, `auctionPoolSizing.ts:253`, `draftPoolExtractor.ts:69`, `rosterDesignFeasibility.ts:322`, `rosterNeed.ts:131,140,171`) sets closer demand at 1/team; when a curated universe is thin on closers (e.g. an all-legends league built without regard for modern bullpen roles), the existing closer-deficit generation top-up (`rosterNeed.ts:131`, `auctionCompletionFloor.ts:123`) already covers the gap — same top-up machinery as §5, just worth naming explicitly since closer scarcity is a known trouble spot (per `require-a-closer-and-cp-valuation` memory) and a curated multi-league universe is a new way to accidentally produce it.

## 9. Size estimate + lane split

| Section | Work | Size |
|---|---|---|
| §2 Universe resolver filter | Insert filter before both `demandUniverseFromPlayers` call sites; add `sourceLeagueIds` to `LeagueTemplate` type + storage read/write | S |
| §3 Dedup | No runtime logic needed under current model (see finding); just document the placeholder rule | XS |
| §4 Snapshot | No new logic — confirm existing extract-on-click semantics cover it; maybe one comment/test | XS |
| §5 Supply top-up copy | UI copy for `engineGeneratedCount` if not already present | XS–S |
| §6 Fine curation | UI-only: surface exclude toggle for curated-universe players in the existing pool review pane (ledger logic already exists) | S |
| §7 UI checkbox list | New Draft Setup UI: league checkbox list + session/league persistence for `sourceLeagueIds` | M |
| §8 F20 fingerprint + seed hash | Add field to `currentRecheckKey`; add universe hash to lock seed context | S |

**Suggested lane split**: one lane for data/resolver plumbing (§2–§5, mostly non-UI, touches `LeagueTemplate` type + `leagueBuilderPoolBuilder.ts`/`leaguePlayerAdapter.ts`), one lane for Draft Setup UI (§6–§7, all in `LeagueBuilderDraftSetup.tsx`). §8 is small enough to ride whichever lane lands second, since it depends on `sourceLeagueIds` existing.

## 10. Open questions for JK — RULED 2026-07-08

**JK rulings (2026-07-08), resolving all three forks below; where a ruling conflicts with the recommendation prose underneath it, the ruling wins:**

1. **Own league IS un-checkable.** JK's use case: a user keeps their own league's teams purely for branding, un-checks their own league, and checks other league(s) as the player source — so they never have to strip placeholder players off their branded rosters. The additive-only guardrail recommended below is REPLACED by warn-don't-block: (a) if the resolved universe is EMPTY → extraction disabled with a plain one-line hint naming the cause; (b) if the universe is smaller than the demand target → extraction proceeds, the existing engine top-up path (§5 `engineGeneratedCount`) covers the shortfall, and the UI says plainly how many players were engine-generated.
2. **The checkbox list shows ALL leagues in the app** — flat list, each with its player-pool count. Default state: own league checked, others unchecked (preserves today's behavior exactly for existing leagues).
3. **`sourceLeagueIds` persists ON THE LEAGUE RECORD** (`LeagueTemplate`), not sessionStorage. Absent field = `[ownLeagueId]` semantics (back-compat for every existing league).

Original open-question framing (superseded by the rulings above, kept for context):

1. **Can a user un-check their own league?** Recommended default: no — the active league is always implicitly included and its checkbox is locked on, so "curate from others" is additive-only and can never produce an empty/self-excluding universe. Confirm this is the intended guardrail.
2. **Does the checkbox list show ALL leagues in the app, or only leagues the current user/profile owns?** No existing multi-user/ownership scoping was found on `LeagueTemplate` in this pass — if leagues are already single-profile-scoped elsewhere, that answers it; if not, this is a real UX decision (a long unfiltered list vs. some grouping).
3. **Should `sourceLeagueIds` live on the `LeagueTemplate` record (persists with the league forever) or in the same per-poolMode `sessionStorage` pattern as `poolSourceMode`/`reservePriceK` (§7, §2)?** Recommendation: on the league record, since it's a structural decision about pool composition that should survive a session/browser close the same way `modeAExtractedIds` does — but this is a genuine fork versus the Lever-A session pattern the mission asked me to weigh, so flagging rather than deciding.

---

**Seam verdict:** single seam. Both pool-first and design-first extraction already converge on one call shape — `extractPoolFromDemand(demandUniverseFromPlayers(players), ...)` — at two call sites in `LeagueBuilderDraftSetup.tsx` (`:2029-2030` design-first, `:2055-2056` pool-first) that both read the same `players` variable. One filter, inserted before that shared call, covers both modes with no divergent logic.
