# Codex Implementation Plan — Beat Reporter + Fame System v1

**Companion to:** `BEAT_REPORTER_DATA_MODEL_SPEC.md`, `FAME_INTEGRATION_SPEC.md`, `BEAT_REPORTER_VOICE_SPEC.md`
**Status:** Ready for execution
**Last Updated:** 2026-04-14
**Executor:** Codex on High reasoning

---

## Global Guardrails (apply to EVERY prompt in this document)

These constraints override anything that looks permissive in individual prompts below. Codex must adhere to all of them without exception.

1. **DO NOT touch any Franchise-mode files, logic, or surfaces.** Franchise is explicitly out of scope for v1. If a prompt appears to require Franchise work, stop and ask. Relevant areas to avoid: Franchise Home, Fame Hub, season-end rollups, career aggregation UI, trade/release/FA auto-mutation logic. Data-model fields marked "franchise" in the spec are schema-only; do not build their consumers.
2. **The app ingests SMB4 reality; it does not simulate.** Nothing in this implementation may affect on-field probabilities, error rates, or game outcomes. Relationships, fame, and drama are narrative/editorial only.
3. **Every LLM call MUST route through `logLlmCall()`** (available from Phase F1 onward). No direct API calls.
4. **No silent scope expansion.** If a prompt's "Out of scope" list conflicts with what seems necessary, stop and ask.
5. **Proof before advance.** Each prompt is complete only when build output, test output, file:line trace, and screenshot/preview verification are all provided.
6. **Supabase discipline (Phase G onward).** No Supabase schema change lands without an accompanying migration file in `supabase/migrations/` committed in the same change. No direct edits to remote schema. No secret keys in client code — all Claude Sonnet calls go through Edge Functions.
7. **Do NOT modify the existing `FameLevel` type** (`src/types/game.ts:98`) or its consumers in `src/utils/eventLog.ts`. That 6-tier string union belongs to Franchise-mode historical fame (out of scope). Our new editorial 5-tier system is a DISTINCT type named `FameTier`.
8. **Do NOT touch `src/engines/relationshipEngine.ts` or its `MORALE_EFFECTS`.** That engine is Franchise-mode morale mechanics (out of scope). Editorial relationships are deferred to v2. Any v1 editorial work that references "relationships" must stop and ask.
9. **Nothing in v1 may auto-mutate morale, mojo, or any player stat.** The user changes mojo via the GameTracker up/down arrows; no engine write paths. If a prompt seems to require one, stop and ask.
10. **Override layer: extend `leaguePlayerOverrides`** (existing IDB store in `src/utils/leagueBuilderStorage.ts`, registered in `syncConfig.ts`). The Data Model spec's conceptual `RosterPlayerInstance` IS this store. Do not create a second override store.
11. **PlayerCardModal is named `PlayerInstanceCard.tsx`** in the actual code (`src/src_figma/app/pages/PlayerInstanceCard.tsx`). Any prompt referencing "PlayerCardModal" targets this file.

## Effort Tags

Each prompt below carries an effort tag to aid pacing:
- **S** = Small (~30-60 min Codex time, minimal review)
- **M** = Medium (~1-2 hours, moderate review)
- **L** = Large (~2-4 hours, careful review)

---

## How to Use This Document

Each `##` block below is a **single prompt** for Codex, copy-pasteable. Run them in the order shown unless the dependency graph below allows parallelism. After each prompt:

1. Codex produces a commit and proof artifacts (build output, tests, file:line trace, screenshot or preview verification).
2. Review the proof. If anything is missing, reject and ask for completion.
3. Only advance to the next prompt after proof is accepted.

**Scope boundary for v1:** Exhibition + Elimination surfaces only. All Franchise-mode surfaces (Fame Hub, season rollups, career UI) are **explicitly deferred** per `FAME_INTEGRATION_SPEC.md` §3.3.

**Two tracks, hard-gated:**
- **Track 1 (Phases A–F):** Fame v1 + Reporter data/LLM substrate. 17 prompts (v1-lean). Must ship and verify fully before Track 2 starts.
- **Track 2 (Phases G–K):** Reporter Voice — mood, in-game commentary, between-inning summaries, dual post-game columns, light storyline refinement. 14 prompts (v1-lean). Implements `BEAT_REPORTER_VOICE_SPEC.md` §§3–10 + §§12–13.

**Prime directive to enforce in every prompt:** the app ingests SMB4 reality; nothing in this implementation affects on-field probabilities, error rates, or game mechanics.

---

## Dependency & Parallelism Map

**v1 lean scope:** Total prompts: **31** across two tracks. Track 1 (A–F) = 17 prompts (Fame + Reporter substrate). Track 2 (G–K) = 14 prompts (Reporter Voice). Track 2 does NOT start until Track 1 ships.

**v2-deferred items** (listed but not executed in this plan): D2 Team Fame Board, F2 Usage Ticker UI, E2 lineup drama icons (keep the Drama Bar itself), D1 relationships / team affinities / team rivalries tabs (keep D1 identity-only), H4 lull tidbits (keep preamble), J3 AlmanacListView, K1 deterministic storyline detector, K2 rivalry evolution. See "v2 Deferrals" section near end.

```
PHASE A — FOUNDATION  [4 prompts]
├── A1 schema + migration ─────────────────── [L] ──┐
│                                                    ├── A3 effective-value utilities [S]
├── A2 FamePip primitive (parallel w/ A1) ── [M] ──┤
└── A4 gameMode threading (parallel w/ A1) ── [S] ──┘

PHASE B — FAME SURFACES [4 prompts]
├── B1 FamePip in PlayerCardModal header ──── [S]   (needs A2)
├── B2 PlayerFameSection ──────────────────── [M]   (needs A4)  \  parallel after A4
├── B3 FameLeaderboardCard ────────────────── [M]   (needs A4)  /
└── B4 Auto-detections (independent) ──────── [L]   (parallel anytime after A)

PHASE C — ELIMINATION [3 prompts]
├── C1 Run aggregation storage ───── [M] ──┐
│                                            ├── C2 RunStandingsTable     [S]  \  parallel
│                                            └── C3 FamePromotionBanner   [M]  /
PHASE D — LEAGUE BUILDER [1 prompt in v1; was 2]
├── D1 Player + team IDENTITY fields (slim — no relationships/affinities/rivalries) ── [M]
└── D2 Team-level Fame Board tab ──────────────────────────────────────── [M]  🚫 v2

PHASE E — REPORTER SUBSTRATE [3 prompts]
├── E1 buildReporterContext skeleton ────────── [M]
├── E2 MatchupDramaBar (lineup icons deferred) ─ [S]  (needs E1)
└── E3 Almanac cache tables + regen stubs ───── [M]  (independent)

PHASE F — LLM INTEGRATION [2 prompts in v1; was 3]
├── F1 Usage logging + preferences foundation ─ [M]   (includes intensity setting)
├── F2 Usage Ticker UI (League Builder) ─────── [M]  🚫 v2
└── F3 Grok summarizer integration ──────────── [L]   (needs F1, E3)

═══════ TRACK 1 VERIFICATION GATE — A–F must all ship before Track 2 begins ═══════

PHASE G — REPORTER FOUNDATION [5 prompts]   (Track 2 start)
├── G1 Reporter-system migrations (additive) ───── [M]   (Supabase already wired)
├── G2 BeatReporter types + CRUD + name/avatar ── [M]   (needs G1)
├── G3 MoodEngine (deterministic) ─────────────── [M]   (needs G2)
├── G4 LLM proxy Edge Functions (Grok + Claude) ─ [L]   (needs G1, F1)
└── G5 Reporter assignment + pre-game toggle ──── [S]   (needs G2)

PHASE H — IN-GAME COMMENTARY [4 prompts in v1; H4 partial]
├── H1 WPA notability scorer ───────────────── [M]   (needs G3)
├── H2 CommentaryEngine + Grok impl ────────── [L]   (needs G4, E1)
├── H3 <CommentaryFeed /> in NewsBoard ─────── [M]   (needs H2)
└── H4 Game preamble only (lull tidbits 🚫 v2) [S]   (needs H3)

PHASE I — BETWEEN-INNING SUMMARIES [2 prompts]
├── I1 Summary generator + narrative cache ─── [M]   (needs H4)
└── I2 Popup + collapse-into-feed UI ────────── [M]   (needs I1)

PHASE J — POST-GAME NEWSPAPER [2 prompts in v1; was 3]
├── J1 Dual-reporter Claude column generation ── [L]   (needs I2, G4)
├── J2 <NewspaperView /> split page ──────────── [M]   (needs J1)
└── J3 <AlmanacListView /> ──────────────────── [M]  🚫 v2

PHASE K — NARRATIVE EVOLUTION [1 prompt in v1; was 3]
├── K1 Auto-storyline detector ──────────────── [M]  🚫 v2
├── K2 Rivalry evolution engine ─────────────── [M]  🚫 v2
└── K3 Light LLM storyline refinement ─────────── [M]   (needs J1; no player-card summary)
```

**Recommended execution order (serial):**
A1 → A2 → A4 → A3 → B4 → B1 → B2 → B3 → C1 → C2 → C3 → D1 → E3 → E1 → E2 → F1 → F3 → [Track 1 gate] → G1 → G2 → G3 → G4 → G5 → H1 → H2 → H3 → H4 → I1 → I2 → J1 → J2 → K3

**Parallel opportunities (multiple Codex sessions):**
- Phase A: A2 + A4 alongside A1 (3-way parallel; A3 queues after A1)
- After A: B4 can run parallel with B1-B3
- After C1: C2 + C3 simultaneously
- After A + B: D-phase can run in parallel with C-phase
- After E1: (no remaining parallelism in E — consolidated)
- Phase F: mostly serial (F2 and F3 both need F1 first)

**Pacing guidance (approximate total effort):** ~5 S, ~8 M, ~4 L prompts. A power user doing 2-3 prompts/day lands v1 in ~2 weeks of calendar time with review.

**Mid-execution audit gate:** after completing A1 through B3, pause and reassess. If D-phase turns out to be more granular than expected, split D1 at that point — don't pre-optimize now.

---

## Standard Prompt Template (for reference)

Every prompt below uses this shape. Codex must fill in the "Proof" section before marking complete.

```
Objective: [what success looks like, not how]
Context files to read first: [specs + authoritative code]
Acceptance criteria: [measurable checks]
Proof required: [build output, test output, file:line trace, screenshot/preview]
Out of scope: [explicit don't-do list]
Commit prefix: [conventional-commits style]
```

---

# PHASE A — FOUNDATION

## A1 — Schema types & IndexedDB migration  `[L]`

**Objective:**
Add all new type definitions and IndexedDB schema changes needed by the Beat Reporter data model. No UI, no behavior — only types, storage schema, and the migration.

**Context files to read first:**
- `spec-docs/BEAT_REPORTER_DATA_MODEL_SPEC.md` §1 (full data model), §1.5 (instance overrides)
- `spec-docs/FAME_INTEGRATION_SPEC.md` §0 (two Fame concepts)
- `src/types/game.ts` (existing Player type, FameEventType)
- `src/types/franchise.ts` (if Team type lives here)
- `src/utils/trackerDb.ts` (shared IndexedDB initializer)
- `src/utils/leagueBuilderStorage.ts` or equivalent (where Player/Team are persisted in League Builder)
- `CLAUDE.md` (shared architecture facts)

**Acceptance criteria:**
- [ ] `FameTier` (numeric 1–5, default 3 = Veteran — DISTINCT from existing `FameLevel` in `src/types/game.ts:98`), `FAME_TIER_LABEL`, `PlayerArchetype`, `EraFlavor` types all exported from the canonical types module
- [ ] `Player` extended with `backstory?`, `nicknames?`, `archetype?`, `signatureMoment?`, `baseFameTier` (default 3). **Do NOT add `relationships` or `teamAffinities` — deferred to v2 per Guardrail #8.**
- [ ] `Team` extended with `backstory?`, `era?` (EraFlavor), `cityVibe?`, `ballparkNickname?`. **Do NOT add `rivalries` — deferred to v2.**
- [ ] **Extend existing `leaguePlayerOverrides` IDB store** (`src/utils/leagueBuilderStorage.ts`) per Guardrail #10 with `fameTierOverride?` editorial field. Do NOT create a new `RosterPlayerInstance` store.
- [ ] IndexedDB migration runs on existing saved data without data loss — existing players default to `baseFameTier: 3` (Veteran); no relationships/affinities fields written
- [ ] All 5,653+ existing tests still pass
- [ ] Build exits 0

**Proof required:**
- Full output of `npm run build`
- Full output of `npm test` showing pass count
- File:line citations for every new type and every field added to existing types
- Migration verification: load an existing saved game/franchise, confirm defaults applied correctly, report what was observed
- Grep output for `baseFame` usage showing the migration is the only writer so far

**Out of scope:**
- UI for editing any new field
- Any effective-value resolution logic (that's A3)
- FamePip rendering (that's A2)
- Any reporter logic

**Commit prefix:** `feat(schema): add beat reporter data model types and IndexedDB migration`

---

## A2 — `<FamePip />` primitive component  `[M]`

**Objective:**
Build the reusable 5-tier Fame visual used in every downstream surface. One SVG-based React component, three sizes, rendered faithfully to the vintage-baseball-card aesthetic.

**Context files to read first:**
- `spec-docs/BEAT_REPORTER_DATA_MODEL_SPEC.md` §7.4 (visual spec per tier)
- `src/assets/chalk-bg.png`, `src/assets/chalk-border.png` (for Superstar backing if needed)
- Existing LineupPreview.tsx for theme conventions
- `~/.claude/projects/-Users-johnkruse-Projects-kbl-tracker/memory/color_palette.md` (canonical palette)

**Acceptance criteria:**
- [ ] Component at `src/src_figma/app/components/FamePip.tsx`
- [ ] Props: `{ tier: FameLevel; size?: 'sm'|'md'|'lg'; showCount?: boolean }`
- [ ] Renders inline SVG (not emoji) for star shapes
- [ ] Tier 1 Unknown: hollow Road Gray circle
- [ ] Tier 2 Prospect: outlined star, Dark Cream
- [ ] Tier 3 Veteran: filled star, Hist. Yellow
- [ ] Tier 4 Captain: filled star, Hist. Yellow with Marquee Red inner border
- [ ] Tier 5 Superstar: gold fill, red dashed baseball-stitch border ring, subtle chalk-smudge backing
- [ ] `showCount` renders "N/5" in Mom's Typewriter beneath the pip
- [ ] Unit test suite verifying each tier renders the correct SVG structure
- [ ] Build passes

**Proof required:**
- Build + test output
- Preview-tool screenshot showing all 5 tiers rendered at each of 3 sizes (a small Storybook-style test page is acceptable — can be a temporary route or a new test file with visual regression)
- File:line trace: component location, test location

**Out of scope:**
- Wiring into any consuming component (that's B1, D1, D5)
- Animation or interaction behavior beyond pure render

**Commit prefix:** `feat(ui): add FamePip component with vintage baseball-card styling`

---

## A3 — Effective-value utilities  `[S]`

**Objective:**
Implement the resolution utility that downstream surfaces use to read effective Fame given a player + optional instance context.

**Context files to read first:**
- `spec-docs/BEAT_REPORTER_DATA_MODEL_SPEC.md` §1.5 (resolution contract)
- `spec-docs/FAME_INTEGRATION_SPEC.md` §0 (two Fame concepts — do not conflate)
- Output of A1

**Acceptance criteria:**
- [ ] `getEffectiveFame(player, instance?)` — returns `FameTier`, falls back to `baseFameTier` (default 3)
- [ ] Lives in a single utility module (`src/utils/effectiveValues.ts` or similar — Codex picks location following existing conventions)
- [ ] Comprehensive unit tests: base-only, override-present, override-absent, null-safe, default fallbacks
- [ ] Tests verify the override **replaces** rather than merges (consistent with ratings-override pattern)
- [ ] Build passes, all tests pass

**Deferred to v2 (per Guardrail #8):** `getEffectiveRelationships()` and `getEffectiveTeamAffinities()` — editorial relationships and team affinities are v2-scoped, so their resolution helpers ship with them.

**Proof required:**
- Build + test output
- File:line for each utility + its tests
- Confirmation the pattern matches the existing ratings-override logic (cite that file:line too)

**Out of scope:**
- Any consumer code calling these utilities (later prompts wire them in)
- Filtering/sorting logic (belongs in `buildReporterContext`, prompt E1)

**Commit prefix:** `feat(utils): add effective-fame resolution utility`

---

## A4 — Thread `gameMode` into `useFameTracking`  `[S]`

**Objective:**
Close the gap identified in the Fame audit — GameTracker currently passes `gameMode` but `useFameTracking` never receives it, so elimination/playoff multipliers silently don't apply.

**Context files to read first:**
- `spec-docs/FAME_INTEGRATION_SPEC.md` §2 (audit findings), §7 (data flow trace)
- `src/src_figma/app/hooks/useFameTracking.ts`
- `src/src_figma/app/engines/fameIntegration.ts`
- `src/src_figma/app/pages/GameTracker.tsx` (find where `useFameTracking` is called and where `gameMode` is defined)

**Acceptance criteria:**
- [ ] `useFameTracking` signature accepts `gameMode` (typed to the existing enum: `'exhibition' | 'franchise' | 'playoff' | 'elimination'`)
- [ ] GameTracker passes the live `gameMode` value
- [ ] `fameIntegration.recordFameEvent` applies the correct multiplier based on mode:
  - exhibition: 1.0x (no playoff multiplier)
  - elimination: 1.25x (tunable constant, document it)
  - playoff: per existing logic (do not regress)
  - franchise: per existing logic (do not regress)
- [ ] Unit tests: same event in different modes produces expected multiplier
- [ ] Regression: existing Fame tests still pass
- [ ] Build passes

**Proof required:**
- Build + test output including new mode-multiplier tests
- File:line trace: where gameMode is defined in GameTracker → passed to hook → consumed by integration → applied in calculation
- Call out the previous broken path so the fix is obvious in review

**Out of scope:**
- Any UI changes
- Any new mode types — stick to the 4 existing ones
- Changing the numeric multipliers beyond what's needed for elimination

**Commit prefix:** `fix(fame): thread gameMode into useFameTracking for correct mode multipliers`

---

# PHASE B — FAME SURFACES IN GAMETRACKER

## B1 — Fame Tier pip row in PlayerCardModal header  `[S]`

**Objective:**
Add a Fame Tier pip row to the PlayerCardModal header that reads the effective Fame for the player in the current mode context.

**Context files to read first:**
- `spec-docs/FAME_INTEGRATION_SPEC.md` §3.1, §3.2 (Exhibition + Elimination surfaces)
- `src/src_figma/app/components/PlayerCardModal.tsx` (or wherever the active player card lives — confirm via routing)
- Output of A2 (`<FamePip />`) and A3 (effective-value utilities)

**Acceptance criteria:**
- [ ] Pip row rendered in modal header beneath player name
- [ ] Reads `getEffectiveFame(player, instance)` where instance is provided in Elimination; absent in Exhibition
- [ ] Visual: use `<FamePip size="md" />` with `showCount` off
- [ ] Renders correctly whether override exists or not
- [ ] No regressions to existing modal content
- [ ] Build passes, existing PlayerCardModal tests still pass

**Proof required:**
- Build + test output
- Preview-tool screenshot of modal in Exhibition mode (base fame) and Elimination mode (with override if any)
- File:line trace: header render location, utility call, FamePip usage

**Out of scope:**
- Game Fame events section (that's B2)
- Editing Fame from the modal (editorial paths are Phase D)

**Commit prefix:** `feat(fame): display fame tier pip in player card header`

---

## B2 — `<PlayerFameSection />` in PlayerCardModal  `[M]`

**Objective:**
Add a mode-aware Fame section to PlayerCardModal body showing game events + running total, plus run-to-date total in Elimination mode.

**Context files to read first:**
- `spec-docs/FAME_INTEGRATION_SPEC.md` §3.1, §3.2, §5.3 (component spec)
- `src/src_figma/app/engines/fameIntegration.ts` — specifically `getPlayerGameFame()` and `getPlayerGameEvents()` (currently orphaned — finally use them)
- Output of A4 (mode threading)

**Acceptance criteria:**
- [ ] New component `src/src_figma/app/components/PlayerFameSection.tsx`
- [ ] Renders in PlayerCardModal body
- [ ] Exhibition mode: Game Fame total + list of events (icon, label, value, timestamp)
- [ ] Elimination mode: Game Fame + Run-to-date Fame (stub the run-total call — it gets its real implementation in C1; use a placeholder function that returns 0 and TODO-comments clearly)
- [ ] Franchise mode: render disabled placeholder "Franchise Fame rollup — coming soon" (per spec §3.3 scope exclusion)
- [ ] Dark chalkboard theme matching existing PlayerCardModal styling
- [ ] Tests: component renders correctly for each mode; consumes `getPlayerGameFame()` output
- [ ] Build passes

**Proof required:**
- Build + test output
- Preview-tool screenshots: Exhibition with 2+ Fame events, Elimination stubbed, Franchise disabled placeholder
- File:line trace: component, consumer (PlayerCardModal), data source (fameIntegration)

**Out of scope:**
- Real run-to-date aggregation (C1)
- Any career/season rollups (Franchise, v1 non-goal)

**Commit prefix:** `feat(fame): add player fame section to card modal`

---

## B3 — `<FameLeaderboardCard />` in Post-Game Summary  `[M]`

**Objective:**
Add a Fame Leaderboard card to Post-Game Summary showing top 3 Fame earners per side with event breakdown.

**Context files to read first:**
- `spec-docs/FAME_INTEGRATION_SPEC.md` §3.1, §3.2, §5.4
- `src/src_figma/app/pages/PostGameSummary.tsx`
- Output of A4

**Acceptance criteria:**
- [ ] New component `src/src_figma/app/components/FameLeaderboardCard.tsx`
- [ ] Renders in PostGameSummary, styled consistently with existing dark chalkboard theme
- [ ] Two columns (away team | home team), each showing top-3 Fame earners this game
- [ ] Each entry: player name (Tox Typewriter), total Fame, event count, expandable event list
- [ ] Mode-aware subtitle: "This Game" (exhibition), "This Game — Run total: X/Y/Z" (elimination; stub run totals if C1 not yet merged), "This Game — Season top-10" (franchise, but deferred — render placeholder)
- [ ] Tests: correct ranking, handles ties, handles 0-event games gracefully
- [ ] Build passes

**Proof required:**
- Build + test output
- Preview-tool screenshot of a played-through game's Post-Game Summary showing the leaderboard populated
- File:line trace

**Out of scope:**
- Run standings table (that's C2)
- Season top-10 implementation (Franchise v1 exclusion)

**Commit prefix:** `feat(fame): add fame leaderboard card to post-game summary`

---

## B4 — Fame auto-detection: Triple Play, Blown Save, TOOTBLAN, Back-to-Back HRs, Walk-off HR  `[L]`

**Objective:**
Implement the next 5 highest-narrative-value auto-detection functions per `FAME_SYSTEM_TRACKING.md`. These fire during gameplay and produce Fame events automatically.

**Context files to read first:**
- `spec-docs/archive/FAME_SYSTEM_TRACKING.md` (unimplemented functions catalog)
- `spec-docs/SPECIAL_EVENTS_SPEC.md` (canonical event definitions + values)
- `src/hooks/useFameDetection.ts` (existing auto-detection patterns)
- `src/src_figma/hooks/useGameState.ts` (where play outcomes are recorded — detection hooks into this flow)

**Acceptance criteria:**
- [ ] Triple Play: detected when 3 outs are recorded on a single play; fires for each fielder involved
- [ ] Blown Save: detected per SMB4 save rules when the save situation is lost by the pitcher in question
- [ ] TOOTBLAN (Thrown Out On The Basepaths Like A Nincompoop): detected when a runner is out on the basepaths in a context spec-defined as "stupid"; minimum check = caught stealing not on a hit-and-run, picked off, or out advancing after the play
- [ ] Back-to-Back HRs: two consecutive HRs by different batters in same inning
- [ ] Walk-off HR: HR in bottom of 9th+ that ends the game with the batting team ahead
- [ ] Each detection wired into the recording flow and produces a Fame event with the correct type + LI-adjusted value via existing `fameIntegration`
- [ ] Unit tests per detection covering positive case + negative case (avoids false positives)
- [ ] Regression: existing 6 auto-detections still fire correctly
- [ ] Build passes

**Proof required:**
- Build + test output
- For each detection: a unit test that sets up the game state and confirms the event fires (or does not fire in negative cases)
- File:line trace per detection: trigger point → detection call → Fame event produced

**Out of scope:**
- All other unimplemented detections (ship these 5, leave catalog entries in place for future)
- Any UI changes (toasts already handle new events via existing code path)
- Fame tier promotion logic (C3)

**Commit prefix:** `feat(fame): implement auto-detections for triple play, blown save, TOOTBLAN, back-to-back HRs, walk-off HR`

---

# PHASE C — ELIMINATION-SPECIFIC

## C1 — Run aggregation: storage + `getPlayerRunFame()`  `[M]`

**Objective:**
Implement elimination-run-scoped Fame aggregation. Each elimination run tracks cumulative Fame across its games; readable by downstream surfaces.

**Context files to read first:**
- `spec-docs/FAME_INTEGRATION_SPEC.md` §8 (storage), §7 (data flow)
- Existing elimination storage module (Codex to locate — likely `src/utils/eliminationStorage.ts` or similar)
- Existing season aggregation pattern in `src/utils/seasonAggregator.ts` (reference but do NOT reuse — elimination is a different scope)

**Acceptance criteria:**
- [ ] New IndexedDB store or store extension: `EliminationRunFameAggregate` per spec §8
- [ ] Write path: at end of each elimination game, append that game's Fame events to the run aggregate
- [ ] Read utility: `getPlayerRunFame(runId, playerId)` returns `{ totalFame, events, gamesPlayed }`
- [ ] Read utility: `getRunFameStandings(runId)` returns sorted list for all players who earned Fame this run
- [ ] Handles run-start (empty aggregate), multi-game runs, and player substitutions across games
- [ ] Unit tests covering: first game of run, multi-game accumulation, player not in current game but has prior-game Fame
- [ ] Migration safe for any existing elimination saves (defaults to empty aggregate)
- [ ] Build passes

**Proof required:**
- Build + test output
- File:line trace: write path in end-game handler → storage module → read utilities
- Migration verification with an existing elimination save (report what happened)

**Out of scope:**
- UI consumers (C2 RunStandingsTable, C3 promotion detection)
- Cross-run aggregation (every run is standalone)

**Commit prefix:** `feat(elimination): add run-scoped fame aggregation storage`

---

## C2 — `<RunStandingsTable />` in Post-Game Summary  `[S]`

**Objective:**
Display the cumulative Fame standings across the current elimination run in Post-Game Summary.

**Context files to read first:**
- `spec-docs/FAME_INTEGRATION_SPEC.md` §3.2, §5.6
- `src/src_figma/app/pages/PostGameSummary.tsx`
- Output of C1

**Acceptance criteria:**
- [ ] New component `src/src_figma/app/components/RunStandingsTable.tsx`
- [ ] Renders in PostGameSummary ONLY when mode is `'elimination'`
- [ ] Consumes `getRunFameStandings(runId)`
- [ ] Columns: rank, player name (Tox Typewriter), team, total Fame, games played
- [ ] Highlights players from the current game
- [ ] Dark chalkboard theme
- [ ] Handles empty state (first game of run = current game only)
- [ ] Tests: mode-gating, sort order, empty state
- [ ] Build passes

**Proof required:**
- Build + test output
- Preview screenshot in an elimination game's Post-Game Summary
- Verification: same Post-Game Summary in an exhibition game does NOT render this table

**Out of scope:**
- Cross-run history
- Editing Fame from this table

**Commit prefix:** `feat(elimination): add run standings table to post-game summary`

---

## C3 — `<FamePromotionBanner />` + tier-promotion write path  `[M]`

**Objective:**
After each elimination game, detect any player who crossed a Fame-Tier promotion threshold during this run and surface a Promotion Banner letting the user accept per-player. Accepting writes `fameOverride` to the elimination instance.

**Context files to read first:**
- `spec-docs/FAME_INTEGRATION_SPEC.md` §4 (thresholds + behavior), §5.5
- `spec-docs/BEAT_REPORTER_DATA_MODEL_SPEC.md` §1.5 (instance override contract)
- Output of A1, A3, C1

**Acceptance criteria:**
- [ ] Detection: after game-end, for every player with Fame earned this run, compare run-total to threshold table in spec §4
- [ ] Promotion candidate list includes only players who crossed *into* a higher tier since start of run (not already-there players)
- [ ] New component `src/src_figma/app/components/FamePromotionBanner.tsx`
- [ ] Shows: player name, current tier → proposed tier, run Fame total, Accept / Dismiss buttons
- [ ] Accept writes `fameOverride` to the elimination instance's `RosterPlayerInstance`
- [ ] Dismiss persists a "dismissed this run" flag so banner doesn't re-surface next game
- [ ] Baseline player (League Builder) is NEVER mutated
- [ ] Tests: threshold math, no-re-prompt after dismiss, override-write correctness, base-untouched verification
- [ ] Build passes

**Proof required:**
- Build + test output
- Preview: simulate an elimination game ending with a promotion-eligible player; screenshot banner
- File:line trace: detection call → banner render → accept handler → write path → instance storage
- Before/after check: baseline `baseFame` unchanged after accepting a promotion

**Out of scope:**
- Demotions (non-goal v1)
- Season-end promotion suggestions (Franchise, deferred)
- Visual effects / animations beyond static render

**Commit prefix:** `feat(elimination): add fame tier promotion banner with instance-override write path`

---

# PHASE D — LEAGUE BUILDER EDITORIAL SURFACES

## D1 — League Builder editorial: player + team identity (slim)  `[M]`

**Objective:**
Add identity-level editorial fields to the League Builder player edit surface (backstory, nicknames, archetype, signature moment, FameTier) and the team edit surface (backstory, era, city vibe, ballpark nickname). **v1 scope is identity only — relationships, team affinities, and team rivalries are deferred to v2** because they collide conceptually with the existing `relationshipEngine.ts` franchise-mode system and need a separate design pass.

**Context files to read first:**
- `spec-docs/BEAT_REPORTER_DATA_MODEL_SPEC.md` §1.1 (player identity fields), §1.4 (team identity fields), §7.1 (player edit UI)
- `src/src_figma/app/pages/LeagueBuilderPlayers.tsx` (existing player edit — extend in place)
- Existing team edit surface (Codex to locate)
- `src/utils/leagueBuilderStorage.ts` — `leaguePlayerOverrides` store (extend schema with new optional fields)
- Output of A1 (FameTier type + override-schema extension), A2 (FamePip)

**Acceptance criteria — Player edit Identity section:**
- [ ] Backstory textarea (300-char soft cap, live counter)
- [ ] Nicknames tag-input array
- [ ] Archetype dropdown (all `PlayerArchetype` enum values, default blank)
- [ ] Signature moment single-line text
- [ ] FameTier: interactive 5-pip `<FamePip />` selector; tap to set (default tier 3 = Veteran)

**Acceptance criteria — Team edit Identity section:**
- [ ] Backstory textarea (500-char soft cap)
- [ ] Era dropdown (`EraFlavor` enum — defined in A1)
- [ ] City vibe single-line
- [ ] Ballpark nickname single-line

**Execution guardrail (this prompt only):**
Implement one surface at a time, commit after each. Order: Player Identity → Team Identity. Each surface must build + test green before moving on.

**Shared:**
- [ ] All fields round-trip through `leaguePlayerOverrides` (player) and the equivalent team-override store
- [ ] Dark chalkboard theme consistent with existing editor UX
- [ ] Tests: CRUD round-trip per field, char-cap enforcement, FamePip click-writes
- [ ] Build passes
- [ ] DO NOT touch `src/engines/relationshipEngine.ts`
- [ ] DO NOT add any relationship, team affinity, or team rivalry UI — deferred to v2

**Proof required:**
- Full build + test output
- Preview walkthrough: edit a player identity + a team identity, save, reload, verify
- File:line trace for every new field's render → state → save handler → storage path

**Out of scope (and deferred to v2):**
- Editorial relationships tab (collides with existing `relationshipEngine.ts`; v2 design work)
- Team affinities tab
- Team rivalries tab
- Team-level Fame Board (was D2 — deferred)
- Auto-mutation from franchise events
- Icons in lineup UI (that's Phase E — Drama Bar only, no per-player lineup icons)
- Any Franchise-mode surfaces

**Commit prefix:** `feat(league-builder): add identity editorial fields for player and team (v1 slim)`

---

## D2 — Team-level Fame Board tab  `[M]`  ⚠️ **DEFERRED TO v2 — DO NOT EXECUTE**

> v1 scope: per-player FameTier editing via D1 is sufficient. Mass-edit UI is a v2 polish.

**Objective:**
Add a new Fame Board tab at team-level in League Builder for mass-editing Fame tiers across a team's roster. Separate from D1 because it's a different surface (team roster view, not player/team editor) and benefits from its own focused review.

**Context files to read first:**
- `spec-docs/BEAT_REPORTER_DATA_MODEL_SPEC.md` §7.3
- Output of A2, A3, D1

**Acceptance criteria:**
- [ ] New tab on team page: "Fame Board"
- [ ] Two-column list: batters | pitchers
- [ ] Each row: player name, interactive 5-pip row for effective Fame, base-fame indicator if different, "Reset to base" button
- [ ] Header bulk actions: "Set all Unknowns to Prospect", "Reset all overrides"
- [ ] "INSTANCE" badge when viewed within a franchise/elimination context; writes go to `fameOverride`
- [ ] Base-level writes go to `baseFame`
- [ ] Tests: bulk actions, instance-vs-base write routing, reset-to-base semantics
- [ ] Build passes

**Proof required:**
- Build + test output
- Preview at both base level and within an elimination instance; verify correct write routing
- File:line trace for all write paths

**Out of scope:**
- Franchise-only promotion suggestions (v1 non-goal)
- Cross-team views

**Commit prefix:** `feat(league-builder): add team fame board with mass-edit controls`

---

# PHASE E — REPORTER RUNTIME SUBSTRATE

## E1 — `buildReporterContext()` skeleton  `[M]`

**Objective:**
Implement the central data-assembly function every reporter surface will call. Returns the full `ReporterContext` shape with real data for fields we have; stub the `legacySummary` fields with empty strings (F4 fills them in).

**Context files to read first:**
- `spec-docs/BEAT_REPORTER_DATA_MODEL_SPEC.md` §4, §3, §5
- Output of A1, A3

**Acceptance criteria:**
- [ ] New module `src/src_figma/app/engines/reporter/buildReporterContext.ts`
- [ ] Function signature per spec §4
- [ ] Returns full `ReporterContext` shape with all fields populated from real data EXCEPT `legacySummary` fields (return empty strings with a TODO comment pointing at F4)
- [ ] Filtering: `activeOpposingRelationships` includes only pairs where *both* players are in the current lineup
- [ ] Filtering: `activeWithinTeamRelationships` surfaces without being included in `dramaticWeight` math
- [ ] Filtering: `recentAlmanac` capped at 5 entries per entity (for now, pull from `gameState.fameEvents` as a proxy — almanac cache tables come in E3)
- [ ] `dramaticWeight` computed per spec §3 formula
- [ ] No LLM calls
- [ ] Comprehensive unit tests: filtering, weight math, empty-state handling, within-team exclusion from weight
- [ ] Build passes

**Proof required:**
- Build + test output
- File:line: function location, every data source it pulls from
- Sample output snapshot from a test game state (dump as JSON in test output)

**Out of scope:**
- Any LLM calls (F3, F4)
- Almanac cache substrate (E3)
- UI consumption (E2, E3)

**Commit prefix:** `feat(reporter): add buildReporterContext data assembly seam`

---

## E2 — `<MatchupDramaBar />` (Drama Bar only — lineup icons deferred to v2)  `[S]`

**Objective:**
Add the Matchup Drama Bar above the (future) beat reporter feed in GameTracker. Consumes `buildReporterContext()`. **Lineup icons are deferred to v2** (they depend on editorial relationships which are also v2). This prompt builds the Drama Bar only — it can render without relationship data by showing fame tiers, current scoreboard tension, and team rivalry from D1 team identity (era/city/ballpark).

**Context files to read first:**
- `spec-docs/BEAT_REPORTER_DATA_MODEL_SPEC.md` §7.5 (Drama Bar), §7.6 (lineup icons)
- `src/src_figma/app/components/BattingLineupColumn.tsx`, `DefensiveLineupColumn.tsx`
- Output of A2 (FamePip), E1 (buildReporterContext)

**Acceptance criteria — MatchupDramaBar:**
- [ ] New component `src/src_figma/app/components/MatchupDramaBar.tsx`
- [ ] Renders at top of GameTracker, above the space reserved for future reporter feed
- [ ] Shows `<FamePip>` for pitcher + batter with team-color pip coloring
- [ ] Icons per spec table (family, romantic, ex, crush, feud, mentor, ex-team, friend)
- [ ] **Within-team relationships NOT shown** (per spec §3)
- [ ] Tap icon → tooltip with relationship note
- [ ] Dims when no drama is active
- [ ] Reads from `buildReporterContext()` — single source of truth

**Acceptance criteria — Lineup icon indicators:**
- [ ] Icons rendered inline next to opposing-lineup player names (12px)
- [ ] Uses the SAME icon vocabulary as Drama Bar (shared `<DramaIcon />` helper component; do not duplicate)
- [ ] Tap shows relationship note
- [ ] Stack max 2, then "+N"
- [ ] No layout regression in lineup columns

**Shared:**
- [ ] Tests: Drama Bar icon selection, intensity threshold (>40 for feud), dim state, lineup-icon presence rules
- [ ] Build passes

**Proof required:**
- Build + test output
- Preview: set up test roster with rich relationships, enter a game
  - Screenshot Drama Bar populated
  - Screenshot lineup column with icons
  - Screenshot Drama Bar dim state (no active drama)
- File:line for both components + shared icon helper

**Out of scope:**
- Actual beat reporter feed (Voice Spec — future)
- Within-team icons (v1 non-goal)

**Commit prefix:** `feat(reporter): add matchup drama bar and opposing-lineup drama icons`

---

## E3 — Almanac cache tables  `[M]`

**Objective:**
Add the IndexedDB cache tables for `PlayerAlmanacCache` and `TeamAlmanacCache`, plus the write-path regen trigger. **Do NOT implement the actual LLM summarization yet** — that's F3.

**Context files to read first:**
- `spec-docs/BEAT_REPORTER_DATA_MODEL_SPEC.md` §5

**Acceptance criteria:**
- [ ] Two new IndexedDB stores per schema in spec §5.1
- [ ] Write-path hook: when a new almanac entry lands (Codex to identify the write points — likely on Fame event save, end-of-inning events, game-end events), check regen trigger
- [ ] Regen trigger: if `currentEventCount - summaryFromEventCount >= 5`, enqueue a regen job via a stub function `queueSummaryJob(entity, id)` that simply logs "would regen" for now
- [ ] `buildReporterContext` (E1) updated to read `legacySummary` from cache (empty string for entities with no cache entry)
- [ ] Migration safe for existing saves
- [ ] Tests: cache read/write, trigger threshold, no-crash when cache absent
- [ ] Build passes

**Proof required:**
- Build + test output
- File:line for cache module, write hooks, trigger logic, and E1 integration
- Migration verification report

**Out of scope:**
- Actual LLM summarization (F4)
- Usage logging (F1 — although hook the regen stub so F4 can route through logger later)

**Commit prefix:** `feat(reporter): add almanac cache tables and regen trigger substrate`

---

# PHASE F — LLM INTEGRATION

## F1 — Usage logging + preferences foundation  `[M]`

**Objective:**
Build the cost-tracking + user-preferences foundations together. Both are small, independent, no-consumer modules that every downstream LLM work depends on. Shipping as one prompt because they're naturally correlated (intensity is a preference, cost tracking is also preference-adjacent, and together they form the "metadata" layer that F2 and F3 consume).

**Context files to read first:**
- `spec-docs/BEAT_REPORTER_DATA_MODEL_SPEC.md` §8.1 (intensity), §8.2 (usage log)
- Existing app settings surface (Codex to locate)

**Acceptance criteria — Usage logging:**
- [ ] New IndexedDB store `llmUsageLog` per spec §8.2 "Data sources"
- [ ] `logLlmCall(entry)` exported from `src/src_figma/app/engines/reporter/usageLogger.ts`
- [ ] Pricing module `src/src_figma/app/engines/reporter/pricing.ts` with Grok + Claude Sonnet rates (Codex verifies current rates)
- [ ] `logLlmCall` computes cost from tokens × pricing
- [ ] Query utilities: `getUsageMonthToDate()`, `getUsagePerGameAverage(mode?)`, `getUsagePerIntensity(intensity)`, `getRecentGamesUsage(n)`
- [ ] Safety rail utility: `isWithinDailyCallLimit()` returning boolean (500/day cap)
- [ ] API key storage field added to preferences for Grok (validated before use)

**Acceptance criteria — Preferences + Intensity:**
- [ ] User preferences IndexedDB store (new or extension of existing)
- [ ] Preferences shape includes `narrativeIntensity: 'low'|'medium'|'high'` (default `'medium'`), `grokApiKey?: string`, `softMonthlyBudget: number` (default 5)
- [ ] Settings UI exposes: 3-option segmented control for intensity with descriptions from spec §8.1, API key input, soft budget slider
- [ ] Threshold constants module keyed by intensity (commentary triggers, regen deltas) per spec §8.1 table
- [ ] Readers: `getNarrativeIntensity()`, `getGrokApiKey()`, `getSoftMonthlyBudget()`
- [ ] Writers with immediate persistence

**Shared:**
- [ ] Unit tests: cost math, aggregation correctness, empty-state, intensity default on first launch, persistence round-trip, threshold lookup, safety rail threshold behavior
- [ ] Build passes

**Proof required:**
- Build + test output
- Preview: open Settings, change intensity + API key + soft budget, reload, verify persisted; verify Medium default on fresh install
- File:line for every module and export
- Sample log entry dump showing expected shape

**Out of scope:**
- Any caller of `logLlmCall` (F3)
- Usage Ticker UI (F2)
- Auto-downshift (v1 non-goal)

**Commit prefix:** `feat(reporter): add llm usage logging, pricing, and user preferences foundation`

---

## F2 — LLM Usage Ticker (League Builder)  `[M]`  ⚠️ **DEFERRED TO v2 — DO NOT EXECUTE**

> v1: F1 logging is sufficient for cost safety (intensity gating enforced at call time). A UI-level cost browser is polish; users can inspect `llm_usage_log` via Supabase dashboard if needed.

**Objective:**
Surface the LLM cost/usage data in the League Builder — compact header ticker + expandable detail panel per spec §8.2.

**Context files to read first:**
- `spec-docs/BEAT_REPORTER_DATA_MODEL_SPEC.md` §8.2
- Output of F1 (query utilities)
- Existing League Builder surface

**Acceptance criteria:**
- [ ] Compact ticker rendered in League Builder header: `⚡ This month: $X • Avg/game: $Y • Intensity: [level]`
- [ ] Amber state when month-to-date > soft budget
- [ ] Red state when projected month > 2× soft budget
- [ ] Tap expands detail panel
- [ ] Detail panel sections per spec: This month, Per-game averages (by mode), Per-intensity comparison, Recent games log, Soft budget slider
- [ ] Per-intensity comparison table shows user's own historical averages at each setting they've used, plus synthetic estimates for untried settings
- [ ] Soft budget control: slider persists to preferences store (F2 extension)
- [ ] Empty state handling (new install with zero usage)
- [ ] Tests: ticker state transitions, budget threshold logic, empty state rendering
- [ ] Build passes

**Proof required:**
- Build + test output
- Preview: seed `llmUsageLog` with sample entries, screenshot ticker in green/amber/red states, screenshot detail panel with all sections populated
- File:line

**Out of scope:**
- Auto-downshift toggle (deferred)
- Per-event cost drilldown (deferred to v2)

**Commit prefix:** `feat(reporter): add llm usage ticker to league builder`

---

## F3 — Grok summarizer integration  `[L]`

**Objective:**
Implement the actual LLM summarization for `legacySummary` fields, routed through `logLlmCall()`. First real LLM call in the system.

**Context files to read first:**
- `spec-docs/BEAT_REPORTER_DATA_MODEL_SPEC.md` §5.3, §8.1, §8.2
- Output of E3 (cache + queue stub), F1 (logger + preferences)

**Acceptance criteria:**
- [ ] Summarizer module `src/src_figma/app/engines/reporter/summarizer.ts`
- [ ] Replaces the stub `queueSummaryJob()` from E3 with real implementation
- [ ] Calls Grok with prompt assembled from: existing summary + recent almanac entries since last regen
- [ ] Output: ~150 word replacement summary
- [ ] ALL calls routed through `logLlmCall()` with correct metadata (model, tokens, gameId, mode, intensity, purpose='legacy_summary')
- [ ] Intensity-gated: regen delta from spec §8.1 table (Low=10, Medium=5, High=3)
- [ ] 500-call safety rail enforced: if today's call count >= 500, skip and log a warning
- [ ] Budget-aware prioritization: when multiple regens queued, players with high-WPA events in recent memory go first (read `recentAlmanac` for that signal)
- [ ] `buildReporterContext` (E1) now returns real `legacySummary` values
- [ ] API key sourcing: user-provided Grok API key from preferences (Codex: add key field to F2 prefs if not already present; validate presence before first call; clear error UI when missing)
- [ ] Unit tests with mocked Grok: summarizer call shape, logger routing, rate-limit enforcement, intensity-gating
- [ ] Build passes

**Proof required:**
- Build + test output
- Demonstration of a real Grok call (use a test key in a non-commit environment) with the resulting log entry captured; OR a thorough mocked test showing the entire flow works and the logger received the expected entry
- File:line for every piece of the call chain
- Screenshot of Usage Ticker after at least one real/mocked call showing the entry reflected

**Out of scope:**
- Post-game column generation (Claude Sonnet work — that's a future Voice Spec phase)
- In-game commentary (Voice Spec phase)

**Commit prefix:** `feat(reporter): integrate grok summarizer with usage logging and rate limits`

---

═══════════════════════════════════════════════════════════════════════════════
# TRACK 2 — REPORTER VOICE (Phases G–K)

**Do not begin any Track 2 prompt until all 19 Track 1 prompts (A–F) are shipped, verified, and merged.** Track 2 implements `BEAT_REPORTER_VOICE_SPEC.md` Phases 1–5 (Voice §14); Phase 6 polish is deferred.

Supabase is **already wired** (as of this plan's writing):
- `@supabase/supabase-js` v2.91 installed
- Client singleton at `src/supabase.ts` (reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`; returns `null` if unconfigured)
- Auth at `src/hooks/useAuth.ts`
- Offline-first sync engine at `src/utils/syncEngine.ts` mirrors IndexedDB stores to Supabase as JSONB (last-write-wins via `changed_at`, per-user RLS)
- Registry at `src/utils/syncConfig.ts` lists which IDB stores sync
- Migration `supabase/migrations/001_sync_tables.sql` defines `kbl_stores`, `kbl_sync_meta`, `kbl_local_storage`

**Architectural decision for Track 2 (v1):** reporter data rides the **existing sync engine** as new IndexedDB stores, NOT native Supabase tables. Rationale:
- Almanac browse UI (J3) is deferred to v2, so we don't need queryable columns yet
- Rivalry evolution (K2) is deferred to v2, so no cross-game rivalry joins
- Each game just attaches two blobs (home + away columns) to itself for display on PostGameSummary — a perfect fit for the existing `kbl_stores` sync pattern
- Offline-safe: reporter writes complete locally even if user is offline, sync when online
- v2 will promote `game_stories` / `narrative_context` / `rivalry_scores` / `reporters` to native Supabase tables when Almanac + K1/K2/K3 full scope ships

Edge Functions (G4) still sit in Supabase to proxy LLM calls (API key protection, billing control). They return text to the client; the client persists to IDB which syncs automatically.

Guardrail #6 applies to every Phase G–K prompt.
═══════════════════════════════════════════════════════════════════════════════

## G1 — Reporter-system IndexedDB stores + sync registry  `[S]`

**Objective:**
Add four new IndexedDB stores for reporter-system data and register them with the existing sync engine so they mirror to Supabase as JSONB via `kbl_stores`. No new Supabase tables, no migration `002`.

**Context files to read first:**
- `BEAT_REPORTER_DATA_MODEL_SPEC.md` §1 (types for reporter entities)
- `src/utils/trackerDb.ts` (existing IDB initializer — extend)
- `src/utils/syncConfig.ts` (existing `SYNC_REGISTRY` — add new entries)
- `src/utils/syncEngine.ts` (read for context — do NOT modify)

**Acceptance criteria:**
- [ ] Four new IDB stores added via `trackerDb.ts` version bump: `reporters`, `gameStories`, `narrativeContext`, `rivalryScores`
- [ ] Schema bump handled cleanly (existing users don't lose data — test against a pre-populated IDB)
- [ ] TypeScript interfaces for each entity in `src/types/reporter.ts`: `BeatReporter`, `GameStory`, `NarrativeContext`, `RivalryScore`
- [ ] `SYNC_REGISTRY` updated with the four stores, each with its keyPath
- [ ] `changed_at` and `deleted` fields supported (per sync engine requirements)
- [ ] Build passes; migration test green

**Proof required:**
- Build + test output
- IDB schema inspection (browser devtools screenshot or jest IDB mock verification) showing four new stores
- File:line trace of each new store + registry entry

**Out of scope:**
- Any reporter logic / CRUD functions (G2 handles)
- Native Supabase tables (deferred to v2 when Almanac/K1/K2 ship)
- Edge Functions (G4)
- Editorial relationship or team affinity storage (deferred to v2)

**Commit prefix:** `feat(reporter): IDB stores + sync registry entries for reporter-system data`

---

## G2 — `BeatReporter` types + CRUD + era-name generator + avatar derivation  `[M]`

**Objective:**
Define the `BeatReporter` TypeScript type, implement Supabase CRUD, generate era-appropriate names, and derive avatar colors from team primary/secondary colors. Still no UI surface.

**Context files to read first:**
- `BEAT_REPORTER_VOICE_SPEC.md` §3 (reporter object, lifecycle), §3.3 (era-appropriate names), §3.4 (visual avatar)
- Team color source (Codex to locate — check `src/types/` and League Builder team storage)
- G1 output (Supabase client)

**Acceptance criteria:**
- [ ] `BeatReporter` type in `src/types/reporter.ts` matching §3.1 and spec §12 schema
- [ ] `reporterStorage.ts` (IndexedDB via `trackerDb.ts`, auto-synced via existing engine) with `createReporter`, `getReporterForTeam`, `updateReporterMood`, `listReporters`. Do NOT call `src/supabase.ts` directly — sync is handled by the engine.
- [ ] `generateEraReporterName(era: EraFlavor): string` — name pools per era (classic/modern/future per spec), avoid duplicates within league
- [ ] `deriveReporterAvatarPalette(team): { primary, secondary, silhouetteVariant }` with 3 silhouette variants (fedora/headset/cap)
- [ ] Unit tests: CRUD round-trip, name generator produces distinct names per era, avatar derivation deterministic per team
- [ ] Build passes

**Proof required:**
- Build + test output
- Console log trace showing a created reporter round-tripped through Supabase
- File:line trace

**Out of scope:**
- Mood engine (G3)
- Reporter UI assignment flow (G5)
- Pixel art portraits (deferred)

**Commit prefix:** `feat(reporter): BeatReporter type, Supabase CRUD, era-name generator, avatar palette`

---

## G3 — `MoodEngine` deterministic implementation  `[M]`

**Objective:**
Implement the mood drift / momentum engine per Voice spec §4. No LLM calls — this is pure TypeScript that reads game events and outputs `MoodState`.

**Context files to read first:**
- `BEAT_REPORTER_VOICE_SPEC.md` §4 (mood drift core principle, triggers, momentum, implementation)
- G2 output (BeatReporter type)

**Acceptance criteria:**
- [ ] `MoodState` and `MoodEngine` in `src/engines/moodEngine.ts`
- [ ] Pure functions: `applyDriftTriggers(state, event) → state`, `decayMomentum(state) → state`, `resolveMood(state) → MoodLabel`
- [ ] 80/20 true-to-form baseline per spec
- [ ] Comprehensive unit tests: each trigger type, momentum decay across N events, boundary conditions at mood-label cutoffs
- [ ] Build passes

**Proof required:**
- Build + test output (show mood engine test count)
- File:line trace

**Out of scope:**
- Wiring mood into commentary (H2)
- Persisting mood to Supabase mid-game (in-memory only until game end → persisted via G2 updateReporterMood)

**Commit prefix:** `feat(reporter): MoodEngine with drift triggers and momentum decay`

---

## G4 — LLM proxy Edge Functions (`grok-commentary` + `claude-column`)  `[L]`

**Objective:**
Build two Supabase Edge Functions that wrap Grok and Claude Sonnet API calls. Every LLM call from client code must go through these proxies. Both enforce intensity gating and log usage via the F1 substrate.

**Context files to read first:**
- `BEAT_REPORTER_VOICE_SPEC.md` §11 (LLM engine architecture), §11.3 (system prompt structure)
- `BEAT_REPORTER_DATA_MODEL_SPEC.md` §8.1 (intensity thresholds), §8.2 (usage ticker)
- F1 output (`logLlmCall()`, intensity preference read path)

**Acceptance criteria:**
- [ ] `supabase/functions/grok-commentary/index.ts`: accepts `{ reporterContext, promptPayload, intensity }`; calls Grok; returns `{ text, tokensIn, tokensOut, cost }`; logs to `llm_usage_log`
- [ ] `supabase/functions/claude-column/index.ts`: accepts `{ reporterContext, playByPlay, narrativeContext, intensity }`; calls Claude Sonnet; returns `{ headline, body, tokensIn, tokensOut, cost }`; logs to `llm_usage_log`
- [ ] Both reject calls that would exceed intensity daily cap (returns structured error client can surface in Usage Ticker)
- [ ] Secrets (GROK_API_KEY, ANTHROPIC_API_KEY) stored in Supabase Vault, never in client
- [ ] Client wrapper in `src/utils/llmProxy.ts` with typed requests
- [ ] Integration tests hit local Edge Functions with mocked API responses
- [ ] Build + tests pass

**Proof required:**
- Build + test output
- Screenshot of Supabase dashboard showing deployed functions
- Terminal output of a `supabase functions invoke grok-commentary` hello-world call returning valid JSON and logging to `llm_usage_log`
- File:line trace of client wrapper and both functions

**Out of scope:**
- Actual reporter prompts (H2, J1)
- Season recap function (deferred — franchise-only)

**Commit prefix:** `feat(llm): Edge Function proxies for Grok commentary + Claude columns with intensity gating`

---

## G5 — Reporter assignment + pre-game toggle  `[S]`

**Objective:**
Wire reporter assignment UI into Exhibition and Elimination pre-game setup. User can auto-generate a reporter per team or pick from existing reporters. Pre-game `beatReporterEnabled` toggle governs whether commentary runs during the game.

**Context files to read first:**
- `BEAT_REPORTER_VOICE_SPEC.md` §3.2 (assignment & persistence), §5.6 (pre-game toggle)
- Exhibition and Elimination pre-game setup pages (Codex to locate)
- G2 output (reporter CRUD)

**Acceptance criteria:**
- [ ] Pre-game setup UI shows per-team reporter: current assignment or "Auto-generate"
- [ ] Generate button creates reporter via G2 flow, assigns to team, persists
- [ ] `beatReporterEnabled` boolean stored on game state (default: true if intensity ≠ Off)
- [ ] Reporter assignment persists across sessions (Supabase)
- [ ] Tests: round-trip assignment, toggle gates later phases
- [ ] Build passes

**Proof required:**
- Build + test output
- Preview screenshot of pre-game setup with reporter section
- File:line trace

**Out of scope:**
- Commentary output (Phase H)
- Manual reporter editing in League Builder (could be a D-phase follow-up; not in v1)

**Commit prefix:** `feat(reporter): pre-game reporter assignment + toggle`

---

## H1 — WPA-based notability scorer  `[M]`

**Objective:**
Deterministic scorer that decides whether a play triggers commentary. Per Voice spec §5.2 — WPA-based with bypass rules for HRs, errors, streaks, first AB.

**Context files to read first:**
- `BEAT_REPORTER_VOICE_SPEC.md` §5.2 (notability scoring)
- `src/engines/leverageCalculator.ts` (reuse WPA calc — do NOT touch LI itself per Guardrail #2)
- G3 output (mood state — affects thresholds)

**Acceptance criteria:**
- [ ] `src/engines/notabilityScorer.ts` with `scoreNotability(play, gameState, mood) → { score: 0..1, shouldComment: boolean, reason: string }`
- [ ] Bypass rules per spec: HRs, errors, streaks, first AB, walk-offs
- [ ] Mood-aware threshold scaling (Jacked reporter comments more, Tense comments less)
- [ ] Extensive unit tests against fixture plays covering all bypass paths and WPA boundaries
- [ ] Build passes

**Proof required:**
- Build + test output (list test cases)
- File:line trace
- No modifications to `leverageCalculator.ts`

**Out of scope:**
- Invoking Grok (H2)
- Lull detection (H4)

**Commit prefix:** `feat(reporter): WPA-based notability scorer`

---

## H2 — `CommentaryEngine` interface + `GrokCommentaryEngine` + `gameNarrativeSoFar`  `[L]`

**Objective:**
Build the commentary engine that turns a notable play into a reporter line via the G4 Grok proxy. Include the rolling `gameNarrativeSoFar` in-memory summary that every call consumes and updates.

**Context files to read first:**
- `BEAT_REPORTER_VOICE_SPEC.md` §5 (commentary system), §11.3 (system prompt structure), §9.3 (gameNarrativeSoFar management)
- E1 output (`buildReporterContext()`)
- G4 output (llmProxy)
- H1 output (notability scorer)

**Acceptance criteria:**
- [ ] `CommentaryEngine` interface in `src/engines/commentaryEngine.ts` (pluggable for future Ollama)
- [ ] `GrokCommentaryEngine` implementation that calls G4 proxy
- [ ] Prompt builder composing: reporter identity + voice guide + era guide + current mood + reporter context (from E1) + `gameNarrativeSoFar` + current play
- [ ] `useGameNarrativeSoFar` hook or store: rolling 2–3 sentence summary in-memory, updated by each commentary call's return
- [ ] Retry / timeout / error handling with graceful fallback (skip commentary, log failure, continue game)
- [ ] Tests with mocked proxy
- [ ] Build passes

**Proof required:**
- Build + test output
- Sample prompt payload logged to console (redact API key path)
- File:line trace

**Out of scope:**
- Feed UI (H3)
- Between-inning summaries (I1)
- Post-game columns (J1)

**Commit prefix:** `feat(reporter): CommentaryEngine + Grok impl + gameNarrativeSoFar`

---

## H3 — `<CommentaryFeed />` in NewsBoard  `[M]`

**Objective:**
Render live commentary in NewsBoard column 1 with typewriter effect, half-inning dividers, reverse-chrono order. Reuse existing audio toggle.

**Context files to read first:**
- `BEAT_REPORTER_VOICE_SPEC.md` §6 (feed display), §6.2 (visual differentiation), §6.3 (typewriter), §6.4 (sound control)
- `src/src_figma/app/components/NewsBoard.tsx` (stub — extend, don't replace)
- Existing `beatReporterSoundsOn` toggle (Codex to locate — likely in ScoreBug)
- H2 output

**Acceptance criteria:**
- [ ] `<CommentaryFeed />` renders stream from H2 commentary engine into NewsBoard column 1
- [ ] Reverse chronological with half-inning divider labels (`─── T4 ───`)
- [ ] Typewriter effect (word-by-word, ~100–150ms) — reuse any existing typewriter component; if none, build a minimal one
- [ ] Audio toggle wired to existing `beatReporterSoundsOn`; retro key sound on each char
- [ ] Dark chalkboard theme matches existing NewsBoard styling
- [ ] Tests for feed rendering, ordering, divider placement
- [ ] Build passes

**Proof required:**
- Build + test output
- Preview screenshot + short recording (or snapshot sequence) showing typewriter animation
- File:line trace

**Out of scope:**
- Preamble / tidbits (H4)
- Between-inning popup (I2)
- Pixel avatar art (deferred — use G2 silhouette)

**Commit prefix:** `feat(reporter): CommentaryFeed with typewriter + half-inning dividers`

---

## H4 — Game preamble + lull-tidbit detector  `[M]`  ⚠️ **PARTIAL DEFER — build preamble only; defer lull tidbits to v2**

> v1: Game preamble on Start Game click only. Lull-tidbit detection (extra LLM calls during slow stretches, more edge cases) defers to v2. Rewrite acceptance criteria to drop all lull-detector work before executing.

**Objective:**
Fire a one-shot preamble on Start Game. During long low-notability stretches, fire a lull tidbit so the feed doesn't go silent.

**Context files to read first:**
- `BEAT_REPORTER_VOICE_SPEC.md` §5.3 (lull tidbits), §5.4 (preamble)
- H2 + H3 output

**Acceptance criteria:**
- [ ] `gamePreamble(reporterContext)` fired on Start Game click, result prepended to feed
- [ ] Lull detector: after N consecutive plays (N=3 default, tune in tests) below notability threshold, fire a tidbit call
- [ ] Lull state resets on next notable play
- [ ] Tests including edge cases: game-ends mid-lull, extra-innings lull, reporter sick/off
- [ ] Build passes

**Proof required:**
- Build + test output
- Preview demonstrating both preamble and at least one lull tidbit in a simulated low-action stretch
- File:line trace

**Out of scope:**
- Post-game column (J1)

**Commit prefix:** `feat(reporter): game preamble + lull tidbit detection`

---

## H — Phase Verification Gate

Before starting Phase I, confirm:
- [ ] Full exhibition game playable end-to-end with reporter on
- [ ] All Grok calls appear in `llm_usage_log` with non-null cost
- [ ] No console errors during 9-inning playthrough
- [ ] Intensity setting correctly throttles (test at Low and High)
- [ ] Feed visually matches dark chalkboard theme

If any item fails, STOP and fix before I1.

---

## I1 — Between-inning summary generator  `[M]`

**Objective:**
At each half-inning change, call Grok to produce (a) a short summary for popup display and (b) an updated `gameNarrativeSoFar` that replaces the in-memory cache.

**Context files to read first:**
- `BEAT_REPORTER_VOICE_SPEC.md` §5.5 (between-inning summaries), §9.3 (narrative cache management)
- H2 output

**Acceptance criteria:**
- [ ] `betweenInningSummary()` function calling G4 proxy; single call returns `{ popupText, updatedNarrativeSoFar }`
- [ ] Triggered on half-inning transition hook in GameTracker
- [ ] Narrative cache is replaced (not appended) per spec
- [ ] Graceful fallback if LLM fails (skip popup, preserve narrative)
- [ ] Tests with mocked proxy
- [ ] Build passes

**Proof required:**
- Build + test output
- Console trace showing `gameNarrativeSoFar` before/after an inning change
- File:line trace

**Out of scope:**
- Popup UI (I2)

**Commit prefix:** `feat(reporter): between-inning summary generator`

---

## I2 — Popup + collapse-into-feed animation  `[M]`

**Objective:**
Show the I1 summary as a centered popup; on dismiss (auto timeout or tap) it collapses into the feed as a differentiated entry.

**Context files to read first:**
- `BEAT_REPORTER_VOICE_SPEC.md` §6.2 (visual differentiation for inning summaries)
- I1 output, H3 feed component

**Acceptance criteria:**
- [ ] Popup overlay component with chalkboard styling; auto-dismiss after M seconds (M=6 default)
- [ ] On dismiss: entry enters feed with italic/different-color styling + divider
- [ ] Tap-to-dismiss accelerates collapse
- [ ] Accessibility: focus trap while popup shown, restored after
- [ ] Tests for trigger, auto-dismiss, tap-dismiss, feed-entry persistence
- [ ] Build passes

**Proof required:**
- Build + test output
- Preview screenshots: popup → mid-collapse → feed-entry
- File:line trace

**Out of scope:**
- Reporter voice variation (handled in I1 prompt)

**Commit prefix:** `feat(reporter): between-inning popup with collapse-into-feed`

---

## I — Phase Verification Gate

Before starting Phase J, confirm:
- [ ] Popup fires exactly once per half-inning transition in a test game
- [ ] `gameNarrativeSoFar` visibly updates after each popup
- [ ] Feed entries differentiate visually from play commentary
- [ ] No double-firing on edge cases (inning ends on double play, walk-off)

---

## J1 — Dual-reporter post-game columns via Claude Sonnet  `[L]`

**Objective:**
On game end, call the G4 `claude-column` Edge Function twice (home reporter + away reporter), passing full play-by-play + reporter identity + team DNA + active storylines. Persist both to `game_stories`.

**Context files to read first:**
- `BEAT_REPORTER_VOICE_SPEC.md` §7 (post-game columns), §11.3 (system prompt)
- G4 output (claude-column), K1-K3 dependencies (active storylines may be empty on first game — handle gracefully)

**Acceptance criteria:**
- [ ] `generatePostGameColumns(gameId)` invoked in PostGameSummary mount
- [ ] Dual invocation: home and away reporter each get their own column
- [ ] Writes two rows to `game_stories` (reporter_id, team_id, opponent_team_id, headline, body, players_mentioned[], game_date)
- [ ] Retry logic with user-visible progress state ("Reporters filing stories…")
- [ ] Handles intensity=Off by skipping generation, surfacing a "Columns disabled" note
- [ ] Tests with mocked function
- [ ] Build passes

**Proof required:**
- Build + test output
- End-to-end: play a full game → verify two rows appear in `game_stories` with distinct content
- File:line trace

**Out of scope:**
- UI rendering (J2)
- Almanac list (J3)

**Commit prefix:** `feat(reporter): dual-reporter post-game column generation via Claude`

---

## J2 — `<NewspaperView />` split-page on PostGameSummary  `[M]`

**Objective:**
Render the two columns from J1 side-by-side on PostGameSummary in a newspaper aesthetic: byline + reporter avatar + headline + multi-paragraph body.

**Context files to read first:**
- `BEAT_REPORTER_VOICE_SPEC.md` §7.2 (newspaper display)
- `src/src_figma/app/pages/PostGameSummary.tsx`
- G2 avatar palette, A2 FamePip (bylines may show reporter fame-tier pip)

**Acceptance criteria:**
- [ ] `<NewspaperView />` component: left=home, right=away; responsive to tablet landscape
- [ ] Byline: "By {reporterName} · {teamShortName}" + avatar silhouette + FamePip
- [ ] Headline large + serif-era styling per reporter era
- [ ] Body: multi-paragraph, drop cap on first paragraph
- [ ] Loading / error states match J1 retry signals
- [ ] Tests for render + responsive breakpoints
- [ ] Build passes

**Proof required:**
- Build + test output
- Preview screenshots at desktop and iPad landscape widths
- File:line trace

**Out of scope:**
- Almanac navigation (J3)

**Commit prefix:** `feat(reporter): NewspaperView split-page on PostGameSummary`

---

## J3 — `<AlmanacListView />`  `[M]`  ⚠️ **DEFERRED TO v2 — DO NOT EXECUTE**

> v1: dual columns render on PostGameSummary via J2. A browse-by-archive UI is v2 scope — requires native Supabase tables with queryable columns (currently stories live as JSONB via sync engine).

**Objective:**
Filterable list of all `game_stories` rows. Detail view reuses `<NewspaperView />`.

**Context files to read first:**
- `BEAT_REPORTER_VOICE_SPEC.md` §8 (almanac vision)
- E3 output (player/team almanac caches — reuse where alignment exists)
- J2 output

**Acceptance criteria:**
- [ ] New route / nav entry in app (Codex decides placement — likely alongside Exhibition history)
- [ ] List: headline + date + teams + mode (exhibition / elimination)
- [ ] Filters: by team, by opponent, by mode, by date range, free-text search on headline+body
- [ ] Clicking row opens `<NewspaperView />` detail
- [ ] Pagination or virtual scroll if >50 entries
- [ ] Tests: filter combinations, detail open, empty state
- [ ] Build passes

**Proof required:**
- Build + test output
- Preview showing list with filters and a detail open
- File:line trace

**Out of scope:**
- Season summaries (deferred)
- Player baseball card backstory surfaces (K3 handles card AI summary)

**Commit prefix:** `feat(reporter): AlmanacListView with filters and detail reuse`

---

## J — Phase Verification Gate

Before starting Phase K, confirm:
- [ ] Full game → both columns generated within 30s
- [ ] Columns persist to Supabase and reload correctly after page refresh
- [ ] Almanac list shows the entry and filters by team + mode correctly
- [ ] Intensity=Off correctly skips with clear UI state

---

## K1 — Auto-storyline detector (deterministic)  `[M]`  ⚠️ **DEFERRED TO v2 — DO NOT EXECUTE**

> v1: K3 (kept, light form) uses LLM-only storyline identification. Deterministic detection + upsert into `narrative_context` defers to v2 once rivalry evolution and Almanac surfaces ship.

**Objective:**
Pure-code detector that scans recent `game_stories` + play-by-play for qualifying patterns and upserts rows into `narrative_context`.

**Context files to read first:**
- `BEAT_REPORTER_VOICE_SPEC.md` §9.2 (dual storyline detection — deterministic half)
- `src/utils/seasonAggregator.ts` + `milestoneAggregator.ts` for existing streak logic (reuse where possible)

**Acceptance criteria:**
- [ ] `src/engines/storylineDetector.ts` with deterministic detectors: hit streaks, pitcher dominance stretches, head-to-head records, milestone proximity, W/L streaks
- [ ] Upsert (not insert — replace where team × mode × storylineKind matches) into `narrative_context`
- [ ] Unit tests with fixture game data per detector
- [ ] Build passes

**Proof required:**
- Build + test output
- Supabase Studio snapshot showing `narrative_context` rows after 3-game test series
- File:line trace

**Out of scope:**
- LLM refinement (K3)
- Consuming storylines in commentary (H2 already reads reporterContext; K1 just writes to the table E1 already reads)

**Commit prefix:** `feat(reporter): deterministic storyline detector writing to narrative_context`

---

## K2 — Rivalry evolution engine  `[M]`  ⚠️ **DEFERRED TO v2 — DO NOT EXECUTE**

> v1: team rivalries are static (seeded in D1 team identity via era/city/ballpark narrative; no cross-game numeric evolution). Asymmetric evolution defers to v2 alongside editorial relationships.

**Objective:**
Post-game engine that updates `rivalry_scores` asymmetrically based on game result per Voice spec §10.3. Clamp 0–10.

**Context files to read first:**
- `BEAT_REPORTER_VOICE_SPEC.md` §10 (rivalry system)
- Team rivalry data stored in League Builder (D1)

**Acceptance criteria:**
- [ ] `src/engines/rivalryEvolution.ts`: `applyGameToRivalry(gameResult) → updates`
- [ ] Asymmetric: winner's score toward loser differs from loser's toward winner
- [ ] Clamped 0–10 (spec says 0–10; Fame is 1–5 separate)
- [ ] Triggered on game end after J1 completes (sequencing matters — columns reference current rivalry, evolution runs AFTER column gen this game but BEFORE next game's commentary)
- [ ] Tests: blowout, close game, extra innings, new rivalry starting at 0
- [ ] Build passes

**Proof required:**
- Build + test output
- Supabase snapshot showing `rivalry_scores` evolving across a 3-game series
- File:line trace

**Out of scope:**
- UI for rivalry scores (D1 handled editing; surfacing evolved scores is covered implicitly via E2 Matchup Drama Bar rivalry intensity field read)

**Commit prefix:** `feat(reporter): rivalry evolution engine`

---

## K3 — LLM storyline refinement (light, v1 kept)  `[M]`

**Objective:**
Post-game Claude pass that identifies higher-order storylines from recent `gameStories` (revenge arcs, breakouts, callbacks) and appends them to `narrativeContext` for future games to consume via `buildReporterContext()`. **Player-card AI summary defers to v2** (requires a separate UI surface on PlayerInstanceCard and adds more LLM calls). K1 (deterministic detector) and K2 (rivalry evolution) are deferred, so K3 runs on LLM identification alone.

**Context files to read first:**
- `BEAT_REPORTER_VOICE_SPEC.md` §9.2 (LLM storyline detection half)
- G4 output (claude-column Edge Function — reuse OR add a sibling `claude-storyline` function if prompt structure warrants)
- J1 output (`gameStories` IDB store with `players_mentioned` array field)
- E1 output (`buildReporterContext()` — which reads `narrativeContext`)

**Acceptance criteria:**
- [ ] `refineStorylinesLLM(gameId)` runs after J1 completes; reads last N `gameStories` for this team pair + current `narrativeContext`; calls Claude; parses returned storylines array; upserts into `narrativeContext` IDB store
- [ ] Upsert keyed by `(team_id × opponent_team_id × storyline_kind)` — replaces matching key, appends new
- [ ] Intensity-aware: skip at Low; run at Medium+ (hook into F1 intensity read)
- [ ] Graceful failure: if Claude returns malformed JSON, log warning and continue — no throwing
- [ ] Tests with mocked proxy: verify upsert keying, intensity gating, fallback
- [ ] Build passes

**Proof required:**
- Build + test output
- 3-game fixture: verify `narrativeContext` gains LLM-identified storylines after game 2; game 3's `buildReporterContext()` returns them; test prompt string includes the storyline text
- File:line trace

**Out of scope (deferred to v2):**
- Player-card AI summary block on PlayerInstanceCard
- Season-long recap (franchise only)
- Regeneration on demand
- Cross-team storylines (only team-pair for v1)

**Commit prefix:** `feat(reporter): LLM storyline refinement writing to narrativeContext (light)`

---

## K — Phase Verification Gate (ships v1 Reporter Voice)

Before declaring Track 2 complete, confirm across a 3-game exhibition series between the same two teams:
- [ ] `narrativeContext` accumulates LLM-identified storylines from K3 (K1 deterministic half deferred; K2 rivalry evolution deferred)
- [ ] Game 3's in-game commentary references a storyline established in games 1-2 (read via `buildReporterContext()` → H2 prompt)
- [ ] `llm_usage_log` totals reasonable (Medium-intensity projection)
- [ ] Between-inning popups fired correctly each half-inning (I1+I2 verification)
- [ ] Dual columns on PostGameSummary for all 3 games
- [ ] No Franchise-mode surfaces appeared
- [ ] No writes to morale, mojo, or any player stat from reporter code
- [ ] `relationshipEngine.ts` untouched

If all green, v1 Reporter Voice ships.

---

## Post-v1 Deferrals (reference list)

Do NOT prompt Codex to build these in this plan. They are spec'd but explicitly out of scope:

- Franchise Fame Hub tab
- Franchise season-end tier promotion suggestions
- Franchise auto-mutation of team affinities (trade/release/FA events)
- Career Fame rollup UI
- MVP / All-Star voting UI integration
- Tier demotion suggestions
- Per-event LLM cost drilldown
- Auto-downshift on soft budget exceeded
- Within-team rival/friend icons in News Board
- **Ollama local LLM engine** (Voice Spec §11.4) — keep CommentaryEngine interface pluggable in H2 so Ollama can slot in later
- **Season summary generator** (Voice Spec §8.4) — requires franchise mode, out of v1
- **8-bit pixel portrait art** (Voice Spec §14 Phase 6 polish) — ship Phase G with simple team-colored silhouettes
- **Promoting game-tracking stores from JSONB sync blobs to native Supabase tables** — game/lineup/box score currently sync to Supabase as opaque JSONB via `kbl_stores` (see `src/utils/syncEngine.ts` + `src/utils/syncConfig.ts`). This is sufficient for v1 because reporter tables reference `game_id` as a TEXT column (the IDB UUID string). Promoting to relational tables with queryable columns would be a future refactor for server-side analytics, not a v1 requirement.
- **D1 editorial tabs — player relationships, team affinities, team rivalries** (Data Model Spec §§2–3). Deferred because editorial relationships collide with existing `relationshipEngine.ts` (Franchise-mode morale). v1 keeps identity fields only.
- **D2 Team-level Fame Board tab** — deferred to reduce D-phase scope.
- **F2 LLM Usage Ticker UI** (League Builder) — logging foundation ships in F1; surface UI deferred.
- **E2 lineup drama icons** — Drama Bar ships; per-player lineup icons deferred.
- **H4 lull tidbits** — preamble ships in H4; low-notability filler deferred.
- **J3 `<AlmanacListView />`** — post-game NewspaperView renders J2 columns inline; list/filter view deferred.
- **K1 deterministic storyline detector & K2 rivalry evolution engine** — K3 light LLM refinement ships; deterministic detectors and rivalry score persistence deferred.
- **Player-card AI summary block** (Voice Spec §13) — fed by storyline aggregation; deferred alongside K1/K2.

All appear in their respective source specs. When those phases arrive, write a successor plan doc.

---

## Review Checklist Between Prompts

Before marking any prompt complete and advancing:

- [ ] Codex pasted actual terminal output of `npm run build` exiting 0
- [ ] Codex pasted actual test output with pass/fail counts
- [ ] Codex provided file:line trace for all modified paths
- [ ] Codex provided screenshot OR explicit "cannot verify — user should test: [steps]" for any visual change
- [ ] Commit message follows the specified prefix
- [ ] No scope drift — Codex did not implement anything from the "Out of scope" list
- [ ] No Franchise-mode surfaces appeared anywhere
