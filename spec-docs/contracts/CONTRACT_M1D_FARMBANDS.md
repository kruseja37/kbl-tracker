# CONTRACT M1D — F2/F3: FARM BANDS FROM ARCHETYPE + SCOUT AUTO-SPECIALIZATION

**DO NOT DISPATCH until M1b (prospect-curve lane) has merged to origin/main and this worktree is rebased — both lanes touch `src/utils/prospectScoutingDraftEngine.ts`.**

## Role
You are a senior implementation engineer. You build exactly what this contract specifies — no scope additions, no "improvements" outside the listed surfaces. If a listed assumption proves false in the code, STOP and write the discrepancy to `BLOCKED.md` in the repo root instead of improvising.

## Working directory
`/private/tmp/kbl-m1d-farmbands` (git worktree, branch `mode1/f2f3-farm-bands`). Work ONLY here.

## Source of truth (already in your tree — read it FIRST, in full)
`spec-docs/FARM_ARCHETYPE_SCOUT_CONFIDENCE_2026-07-08.md` — the RATIFIED archetype→per-area scout-confidence table (24 archetypes × 8 areas, bands 3/5/7) plus captain rulings §8. Commit this spec file with your work. Its §5/§6 name the exact code surfaces; grounding references: `src/data/historicalArchetypes.ts` (archetype ids + boosts/nerfs), `src/utils/prospectScoutingDraftEngine.ts:1152-1229` (scoutTierForPosition / SCOUT_TOOL_BAND_WIDTHS / scoutToolBands / HITTER_SCOUT_TOOLS / PITCHER_SCOUT_TOOLS).

## Why (context, do not re-litigate)
JK Friday findings F2/F3 (spec-docs/MODE1_PUNCHLIST_2026-07-08.md §1): farm lots show no per-specialty grade bands, and the bands' source is wrong — they must derive from the team's FARM ARCHETYPE, not from a hired scout's generic specialty tags. The scouting spec's §11 deprecation of the scout-hire choice is hereby executed: once bands come from the archetype, the hire choice is decorative.

## Deliverables

### 1. New pure data module: `src/data/farmArchetypeScoutConfidence.ts`
- Pattern-match `src/data/historicalArchetypes.ts` (typed data, no React, no side effects).
- Transcribe the §4 table EXACTLY — all 24 rows, keyed by `HistoricalArchetype.id` strings (`murderers-row`, `bomba-squad`, …). Include each row's rationale string.
- Types per spec §5: `ScoutArea` (8 areas), `ScoutConfidenceBand = 3 | 5 | 7`, `FarmArchetypeScoutConfidenceRow`, the `FARM_ARCHETYPE_SCOUT_CONFIDENCE` record, and `scoutConfidenceBandForArea(farmArchetypeKey: string | undefined, area: ScoutArea): ScoutConfidenceBand` with fallback **5** for missing/unknown archetype.
- Derive `ScoutArea` from the engine's tool tuples (export the type from `prospectScoutingDraftEngine.ts` or derive via `typeof HITTER_SCOUT_TOOLS[number] | typeof PITCHER_SCOUT_TOOLS[number]`) so the vocabulary cannot drift.
- Add a unit test asserting: every key in `FARM_ARCHETYPE_SCOUT_CONFIDENCE` exists in `historicalArchetypes`' id set AND vice versa (all 24, bijective); every band value ∈ {3,5,7}; fallback returns 5.

### 2. Engine: per-area bands (`src/utils/prospectScoutingDraftEngine.ts`)
- `scoutToolBands` (~line 1216-1229): replace the single `const tier = scoutTierForPosition(...)` stamped on every tool with a per-tool lookup inside the loop — each tool's tier comes from the team's farm-archetype table row (3→high/tight, 5→medium, 7→low/wide, mapped onto the existing `SCOUT_TOOL_BAND_WIDTHS` tiers). Do NOT change `SCOUT_TOOL_BAND_WIDTHS` values.
- Overall grade band (currently fed by `scoutTierForPosition`): per captain ruling §8.4, the overall tier = MEAN of the prospect's applicable per-area bands (hitter set or pitcher set), rounded to nearest of {3,5,7}, exact midpoints → 5. Retire or narrow `scoutTierForPosition` accordingly; do not leave dead code.
- Signature threading: the band functions need the team's farm archetype key. Resolve it at the call sites (below) from the SAME persisted field Draft Setup writes for a team's farm archetype — find the real field name in the Team/league-builder types (spec draft calls it `Team.farmArchetypeKey`; VERIFY, do not invent; if teams store archetype differently, use the actual field and note it in the commit message).

### 3. Call sites (both already have teamId in scope)
- `src/utils/leagueBuilderStartupFarmDraft.ts:1079-1085` (`buildBoardForSession`, `pickSlot.teamId` in scope).
- `src/src_figma/app/pages/LeagueBuilderFarmAuctionDraft.tsx:126` (`scoutRangeForProspect(teamId, ...)`).
- Thread `teamId → team farm archetype key → per-area bands`. No other call-site changes.

### 4. F2 UI: render the banded reads on farm lots
- On BOTH farm draft surfaces (startup farm draft board + farm auction lot card), the per-area grade-number bands and the overall grade band must be VISIBLE, sourced from the new per-area computation. Reuse the existing fog/range display components and card layout — minimal, additive markup only. Different archetypes must visibly produce different band widths on the same prospect.

### 4b. F7: fix the farm lot "Scout value" estimate (same function you are restructuring)
`scoutRangeForProspect` (`LeagueBuilderFarmAuctionDraft.tsx:112-134`) currently prices "Scout value" from the static `GRADE_SALARY_BOUNDS` letter-grade table (`ratingsAdjustmentEngine.ts:149-162`) — an unrelated, self-documented build-dark formula that disagrees with the real opening ask rendered beside it (`calculateIvBaseSalary`, `farmAuctionPool.ts:108-114`). Replace the source: **scout value = the true opening-ask number with archetype-band fog applied** — the displayed range's width comes from the prospect's per-area confidence (use the overall grade-band tier from ruling §8.4 to pick the fog width; tight tier = narrow range around the true ask, wide tier = wide range). The center of the range must be derived from (and never wildly contradict) the same IV pipeline that sets the opening ask. Add a test: for any prospect, the true opening ask lies WITHIN the displayed scout-value range, and a 3-tier read yields a strictly narrower range than a 7-tier read of the same prospect.

### 4c. F10 hardening: scouting must not depend on the ScoutHire screen having been visited
Band computation and scout identity must derive from the team's farm ARCHETYPE at draft time. If ScoutHire (the reveal) was never visited, the farm draft still shows real archetype-derived bands — never "N/A". Only a team with NO farm archetype set falls back to all-5 (medium) bands. Remove/neutralize the `loadOptionalFarmScouts`-missing → "N/A" path for archetype-bearing teams. Add a test: farm board for a league that never touched ScoutHire renders banded ranges (not "N/A") for teams with archetypes.

### 5. F3: ScoutHire auto-specialization (`src/src_figma/app/pages/ScoutHire.tsx` + `src/src_figma/app/utils/draftStaffingPersistence.ts`)
- Kill the generic 6-entry choice pool as a user choice. Each team's scout is AUTO-derived from its farm archetype row: `specialties` = the row's 3-band areas, `weaknesses` = the row's 7-band areas, `specialtyLabel`/`summary` phrased from the row rationale; keep whatever name generator exists.
- The ScoutHire page becomes a no-choice "meet your scout" reveal/confirmation for the user's team (CPU teams auto-assigned silently, deterministically — same league+team in ⇒ same scout out; no `Date.now()`/`Math.random()` seeds).
- **Persistence record SHAPE unchanged**: write the same fields the hire flow wrote (`draftStaffingPersistence`), so downstream staff readers keep working. No schema/store-name/key changes.
- Journey position of the ScoutHire step: DO NOT move it (separate ticket P11).

## Untouchables
Prospect GENERATION/pool-shaping math (M1b's lane — if you find yourself editing generation curves, STOP) · IV/salary engines · grade oracle (`scoreSmb4Player`) · MLB auction engine/UI · GameTracker · IndexedDB schemas/store names · routing.

## Gates (all must pass; paste real output in DONE.txt)
1. `npx tsc -b --pretty false` clean.
2. `npm run build` exit 0.
3. Focused suites green: prospectScoutingDraftEngine tests, leagueBuilderStartupFarmDraft tests, LeagueBuilderFarmAuctionDraft page tests, ScoutHire/draftStaffingPersistence tests, plus your new tests.
4. New regression tests (required):
   a. A Web Gems team's read on one hitter: fielding+arm bands tight (high tier) AND power+contact bands wide (low tier) on the SAME prospect.
   b. Two teams with different archetypes get DIFFERENT band widths for the same prospect+area.
   c. Team with no farm archetype set → all areas medium (band 5 fallback).
   d. Overall grade band = mean-rounded rule (test one hitter case, one pitcher case, one exact-midpoint→5 case).
   e. Scout auto-assign determinism: same league+team ⇒ identical scout identity across two builds; different archetypes ⇒ different specialties.
5. Full `NODE_ENV= npx vitest run`: zero NEW reds (known flaky: LeagueBuilderDraftSetup order-sensitive block, AwardsWatchlist, franchiseManualSmokeFixture timeout — rerun those solo if they fail in the big batch).

## Commit protocol
Try normal commits (conventional messages, e.g. `feat(farm): per-area scout bands from farm archetype [F2]`, `feat(farm): scout auto-specialization [F3]`). If git index writes fail with EPERM (sandbox), leave the tree dirty and write `DONE.txt` at repo root with: summary, file list, gate outputs, and the discrepancy notes. Do NOT push.
