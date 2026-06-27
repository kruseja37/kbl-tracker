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
