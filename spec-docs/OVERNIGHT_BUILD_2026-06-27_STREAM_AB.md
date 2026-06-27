# Overnight build — Stream A finish + Stream B (2026-06-27)

> Branch `claude/lineups-fenway-hub` (worktree `/Users/johnkruse/Projects/kbl-lineups-fenway`).
> JK rulings 2026-06-27: **complete on PREVIEW routes (no live swap — flip after JK's morning review);
> v1 = draft-setup → draft → launch → regular season → playoffs → trades (offseason DEFERRED);
> optimizer-gated numbers marked "coming" (don't build the roster-optimizer).** Everything wired to real
> data, served on a preview port for JK's morning review. The live fold-in stays gated on JK.

## Priority order (highest value / most reviewable first)
1. **Stream B setup write spine** (the plan's Phase 1 — "high-value setup milestone"). Wire the 3 preview
   pages already on this branch to real data:
   - **Draft Setup hub** (`DraftSetupHubPreview`): write `controlledBy` (human/ai) + GM name (`managerName`)
     + seat→team (`FranchiseConfig.teams.playerAssignments`) + shill count (scales w/ league size + override,
     persisted pre-auction).
   - **Archetype picker** (`DraftSetupArchetypePreview`): store the chosen archetype NAME on `Team` (+ derive
     `capIdentity`/`farmCapIdentity` via `archetypeCapShift` → the cap `modStat` vocab — do CAREFULLY with a
     unit test; the modStat mismatch silently mis-sets caps). Read the canonical archetype module dynamically.
   - **Season rules** (`SeasonRulesPreview`): ONE canonical home (`FranchiseConfig` the season consumes),
     FREE-TYPED games-per-season + innings-per-game (no "Standard" preset), fold in cadence + conferences
     (toggle, default ON), fix the casing bug.
2. **Stream A: playoffs + trades surfaces in the Fenway hub** (`FranchiseLensHub` + `useFranchiseLensData`).
   New tabs reading the trunk's playoff (bracket/series) + transaction (trades) data. v1 per JK.
3. **Stream B secondary** (bring the remaining preview pages over from `codex/draft-setup-ui`, wire the
   achievable halves): construction-rail freeze CTA → `initializeFranchise`; end-of-draft staffing hire;
   scout-hire = REUSE the existing scout-draft engine; draft-guide scout price-range + 20-80 grade (the
   non-optimizer halves); WS-0 setup→season seams; real scout names.
4. **Optimizer-gated (DO NOT build)**: draft-guide affordability/bargain, in-season scout win-value, in-game
   win-% — wire the screens but label those specific numbers "coming with the roster engine."

## Discipline
- Preview-first (parallel `/__preview/*` routes); live screens untouched. Build gate after each slice
  (`npm run build` + the franchiseMode/seam suites). Prefer reusing existing fields over new trackerDb
  stores (avoid the v25→trunk bump). Commit per slice. Leave a clear morning status doc.

## Progress log
- (started) plan written.
- ✅ Stream A: Playoffs + Trades surfaces in the Fenway hub (`b3bff7c7`).
- ✅ Two deep-dive audits (multi-agent, evidence-strict) → two committed maps:
  `LIVING_SEASON_UIUX_COVERAGE_MAP.md` (`9d847548`) + `DRAFT_PROCESS_STREAMB_UIUX_COVERAGE_MAP.md` (`450eddbf`).
- ✅ Fixed the TWO hidden/revealed v1 blockers the new hub introduced (`0f44cbcf`): hidden personality
  modifiers no longer displayed; farm-prospect grades gated to scout-perceived until call-up.

---

## ▶ RESUME HERE (new session 2026-06-27) — read this first

**Branch:** `claude/lineups-fenway-hub`, worktree `/Users/johnkruse/Projects/kbl-lineups-fenway`. Working tree
CLEAN, all work committed. = engine trunk `experiment/manager-wpa-window` + Stream-A Fenway hub +
the Lineups surface + Playoffs/Trades + the 2 blocker fixes. Everything is PREVIEW-only (no live `/franchise`
swap — JK flips after his morning review). Serve for review: `npx vite` in the worktree → open
`/__preview/franchise-lens/<franchiseId>` (grab the id from the legacy `/franchise/:franchiseId` URL).

**Read first:** the two coverage maps above (the no-assumptions source of truth) + memories
[[hidden-vs-revealed-ui-rule]] + [[dont-assume-features-deep-dive]].

**NEXT BUILD (unblocked — do these):**
1. **Roster moves into the hub** (JK "fold it in"): wire the existing LIVE engines — `callUpFranchisePlayer`
   (`franchiseRosterMovement.ts:715`, the "Call up" button `FranchiseLensHub.tsx:864` has NO onClick),
   `sendDownFranchisePlayer` (`:552`), `executeManualFranchiseTrade` (`franchiseTradeAdapter.ts:1718`). Add a
   confirm modal + reload via the `useFranchiseLensData` hook. Broaden the Trades tab → a **Moves** ledger
   (trades + call_up + send_down + release). All engines enforce the hidden-prospect gates already.
2. **Wire UI-present/data-empty** in `useFranchiseLensData` `buildStandingsVM`: races
   (`computeFranchiseRaceCandidateRows`), playoff picture, award frontrunners; + a fitness chip.

**TWO JK FORKS (gate the rest — surfaced, awaiting JK):**
- **A. Pre-freeze persistence** (draft-process map §0): there is NO store for draft-setup choices before
  `initializeFranchise`. Wiring the Stream-B setup spine needs a new `DraftSetupConfig` store OR
  hold-until-freeze. Decide before building draft-setup persistence.
- **B. Flip the living-season "on" switch** (living-season map §3): morale/fame/traits/checkpoints/records are
  BUILT-DARK (flags default off). Flipping them = the "v1 is living" activation (a JK call, not a build).

**DE-SCOPED (JK ruling — mark "coming", don't build):** the roster-optimizer (verified greenfield) → the
draft-guide affordability badge + bargain/trap + in-season scout win-value.

**ARCHETYPE→CAP converter:** still must be ASSEMBLED carefully (no active-path fn) — `selectTeamArchetype` +
`Team.archetype` name field; reuse `archetypeCapShift` + the cap system, add an equivalence unit test.
