You are a builder lane on KBL Tracker (React+TS+Vite). Work ONLY in your assigned worktree on its branch; commit there; do NOT push or merge. Independent audit follows. node_modules if missing: `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules`. Base: main @ 50da7ad4.

FIRST COMMIT: write this entire prompt verbatim to spec-docs/contracts/CONTRACT_TEAMIDGUARD_2026-07-09.md and commit before any code change.

═══ LANE: TEAMIDGUARD — one writer for tax identity (captain ruling 2026-07-09) ═══
CONFIRMED BUG (tracer-proven, file:line): the luxury-tax identity chain is archetype-precise on the designed path — archetypeCapShift (src/data/historicalArchetypes.ts:178-184) → archetypeToCapIdentity (src/engines/archetypeIdentity.ts:31-47) → selectTeamArchetype persists team.capIdentity + team.mlbArchetypeKey (:84-103) → tax engine consumes capIdentity per lot. BUT src/src_figma/app/pages/LeagueBuilderTeams.tsx hosts a legacy "Team Identity (Cap)" editor (:1677-1750) whose handleSave (:579-654) UNCONDITIONALLY rebuilds and overwrites capIdentity on EVERY save — even a name/color-only edit — via the coarser composeIdentity/CAP_MODIFICATION_FRACTIONS vocabulary (src/data/tierParams.ts:158-201), and the object it writes (:593-600) drops rawShift; normalizeCapIdentity (:147-156) also drops rawShift when seeding the form (:417). Result: saving a team on that page after an archetype was picked silently replaces the precise archetype tax shifts with a coarse approximation, while the displayed archetype label (reads mlbArchetypeKey only) stays correct. Known-class finding PDS-06 (spec-docs/AUDIT_PREDRAFT_TO_SEASON_2026-07-01.md:56). With the TAXTEETH lane (merging in parallel — file-disjoint from you; you must NOT touch any file it owns: src/engines/auctionStateMachine.ts, auctionLuxuryTax.ts, rosterIntelligencePayload.ts, useAuctionDraft.ts, LeagueBuilderAuctionDraft.tsx), this divergence would charge real dollars.

THE RULING (build exactly this):
1. **Archetype-owned teams (team.mlbArchetypeKey set): the archetype is the SOLE writer of capIdentity.**
   - The Teams-page identity section renders READ-ONLY for such teams: show the archetype name + its actual cap shifts (derive display from the existing capIdentity/rawShift — do NOT recompute via the coarse table), plus one short line: "Set by archetype — change it in Draft Setup." (ALWAYS-class copy under the Text Law; keep it to one line, hard-edge skin tokens.)
   - handleSave for archetype-owned teams must preserve the stored capIdentity BYTE-IDENTICAL (deep-equal, including rawShift) no matter what else on the form is edited.
2. **Non-archetype teams keep the legacy editor**, but with a dirty-guard: handleSave rebuilds capIdentity ONLY if the identity form fields were actually changed by the user this session; an untouched identity section → stored capIdentity object preserved verbatim (including any rawShift, which normalizeCapIdentity must stop dropping — carry unknown fields through instead of reconstructing the object).

REPRO-FIRST (MANDATORY): before any fix, write the failing test — a team with archetype-derived capIdentity (build it via the real archetypeToCapIdentity, not a hand mock) is loaded into the Teams page, the user edits ONLY the team name and saves → assert stored capIdentity is deep-equal to the original INCLUDING rawShift. Run it, capture the failure output (showing the clobber) into the contract. Then fix, then it passes. Additional tests: (a) archetype team + attempted identity-section interaction → section is read-only (no inputs / disabled), save preserves; (b) non-archetype team, name-only save → capIdentity preserved verbatim; (c) non-archetype team, genuine identity edit → rebuilt exactly as today (byte-compare to current behavior's output for the same inputs — no regression in the legacy vocabulary); (d) rawShift survives a load→save round-trip.

GUARDRAILS: touch ONLY LeagueBuilderTeams.tsx + its test file(s) + (if strictly needed for rawShift carry-through) the local normalize helper — nothing in src/engines/, nothing the TAXTEETH or FLOORREFIT lanes own. No copy changes beyond the one new read-only line. Existing data-testids stable. Check for test-characterized strings before touching any existing copy (grep the test tree). If the Teams page has NO existing test file, create one scoped to these behaviors.

GATES (paste real outputs into the contract): npx tsc -b clean; npm run build exit 0; the Teams-page test file(s) green; grep proof that no TAXTEETH-owned file is in your diff (git diff --name-only against 50da7ad4). NOT the full suite.

DELIVERABLE: contract-first commit; failing-repro commit BEFORE the fix; final commit updates the contract with evidence + gate outputs. Final message: summary + hashes + surprises. UNKNOWN mid-build = STOP and report.

═══════════════════════════════════════════════════════════════════
EVIDENCE (appended post-build, 2026-07-09)
═══════════════════════════════════════════════════════════════════

## Commit sequence

| Commit | Contents |
|---|---|
| `229af08f` | contract-first commit (this file, verbatim prompt) |
| `950ba2ae` | failing-repro commit — new/updated tests only, source UNCHANGED |
| `3fd25300` | fix commit — source change, all tests green |

To produce the repro evidence honestly (source was already fixed in the working
tree when the tests were written), the source file was temporarily reverted to
HEAD via `git checkout -- src/src_figma/app/pages/LeagueBuilderTeams.tsx`
(patch saved first), the test suite run against the ORIGINAL (buggy) source,
output captured below, then the source fix was re-applied via `git apply` on
the saved patch before the fix commit.

## REPRO: test run against pre-fix source (5 failing)

```
 ✓ ... Header > renders TEAMS title
 ✓ ... Header > renders back button
 ✓ ... Header > back button navigates to league builder
 ✓ ... Create Button > renders CREATE NEW TEAM button
 ✓ ... Create Button > clicking CREATE NEW TEAM opens modal
 ✓ ... Teams List > renders team names
 ✓ ... Teams List > renders team abbreviations
 ✓ ... Teams List > renders location info
 ✓ ... Teams List > renders edit buttons for each team
 ✓ ... Teams List > renders delete buttons for each team
 ✓ ... Edit Team > clicking edit button opens modal
 ✓ ... Edit Team > modal shows team name input with value
 ✓ ... Edit Team > shows League Builder stadium source guidance for unmatched custom stadium names
 ✓ ... Edit Team > shows matched SMB4 stadium dimensions as the seed source
 ✓ ... Edit Team > round-trips team editorial identity fields through updateTeam
 × ... Edit Team > round-trips farm cap identity independently through updateTeam
 ✓ ... Edit Team > allows team abbreviations longer than four characters in edit mode
 ✓ ... Edit Team > blocks edits to league teams while a saved auction is in progress
 ✓ ... Delete Team > clicking delete shows confirmation buttons
 ✓ ... Delete Team > clicking cancel hides confirmation buttons
 ✓ ... Delete Team > clicking confirm delete calls removeTeam
 ✓ ... Modal > modal has close button
 ✓ ... Modal > modal shows form fields
 ✓ ... Modal > enforces the team backstory character cap with a live counter
 ✓ ... Loading State > shows loading indicator when isLoading
 ✓ ... Error State > shows error message when error occurs
 ✓ ... Empty State > shows empty message when no teams exist
 × ... Cap Identity Guard (archetype-owned teams) > REPRO: name-only save on an archetype-owned team preserves capIdentity byte-identical (including rawShift)
 × ... Cap Identity Guard (archetype-owned teams) > (a) archetype-owned team renders a read-only cap identity section with the actual archetype shift
 × ... Cap Identity Guard (archetype-owned teams) > (b) non-archetype team: name-only save preserves capIdentity verbatim (undefined stays undefined)
 ✓ ... Cap Identity Guard (archetype-owned teams) > (c) non-archetype team: a genuine MLB identity edit rebuilds capIdentity via the existing legacy math
 × ... Cap Identity Guard (archetype-owned teams) > (d) non-archetype team: rawShift on a stored capIdentity survives an untouched load-save round trip

 Test Files  1 failed (1)
      Tests  5 failed | 27 passed (32)
```

The REPRO test's failure diff (against pre-fix `handleSave`) showed the actual
saved `capIdentity` had been rebuilt to `{ increase: [...], decrease: [...] }`
via the coarse `CAP_MODIFICATION_FRACTIONS` vocabulary with `rawShift` absent
entirely — confirming the clobber described in the bug report. Note (c)
already PASSED pre-fix: the legacy genuine-edit math path was never broken,
only the archetype/untouched-preserve behavior was missing.

## Fix verification: same suite against fixed source (32/32 green)

```
 Test Files  1 passed (1)
      Tests  32 passed (32)
   Duration  3.61s
```

## GATES

**`npx tsc -b`** (tsconfig.app.json excludes `src/**/*.test.tsx`, so this
gate covers the source file only, not the test file):
```
$ rm -f node_modules/.tmp/tsconfig.app.tsbuildinfo node_modules/.tmp/tsconfig.node.tsbuildinfo
$ npx tsc -b
TSC_EXIT=0
```
(no diagnostic output — clean)

**`npm run build`**:
```
$ npm run build
...
dist/assets/LeagueBuilderTeams-BcPHKBuv.js   44.98 kB │ gzip: 9.96 kB
...
✓ built in 10.09s
PWA v1.2.0
mode      generateSW
precache  186 entries (5324.70 KiB)
files generated
  dist/sw.js
  dist/workbox-1d305bb8.js
BUILD_EXIT=0
```

**Teams-page test file(s) green:**
```
$ npx vitest run src/src_figma/__tests__/leagueBuilder/LeagueBuilderTeams.test.tsx
 Test Files  1 passed (1)
      Tests  32 passed (32)
```

**Extra due-diligence (not a required gate, run anyway to rule out cross-file
mock pollution from the new `mockReturnValue` overrides):**
```
$ npx vitest run src/src_figma/__tests__/leagueBuilder/
 Test Files  10 passed (10)
      Tests  209 passed (209)
```

**No TAXTEETH-owned file touched:**
```
$ git diff --name-only 50da7ad4 -- src/engines/auctionStateMachine.ts \
    src/engines/auctionLuxuryTax.ts src/engines/rosterIntelligencePayload.ts \
    src/src_figma/hooks/useAuctionDraft.ts \
    src/src_figma/app/pages/LeagueBuilderAuctionDraft.tsx
(no output)
```

**Full diff surface (against base `50da7ad4`) — exactly the two files the
guardrail scoped, plus this contract:**
```
$ git diff --name-only 50da7ad4
spec-docs/contracts/CONTRACT_TEAMIDGUARD_2026-07-09.md
src/src_figma/__tests__/leagueBuilder/LeagueBuilderTeams.test.tsx
src/src_figma/app/pages/LeagueBuilderTeams.tsx
```

## Scope notes / surprises

- **farmCapIdentity / farmArchetypeKey are OUT of scope and untouched.** The
  bug report and ruling text are both scoped to `capIdentity` (the MLB
  section, `:1677-1750` in the original file). `selectTeamArchetype` also
  writes a `farmCapIdentity` when a farm archetype key is passed, and the
  Farm Identity (Cap) section has the identical unconditional-rebuild pattern
  — but no farm-side clobber was named in the bug report, so it was left
  exactly as-is (still unconditionally rebuilt on every save, no dirty-guard,
  no archetype guard). This is a real analogous gap if farm archetypes are
  ever wired to a tax-consuming engine the same way MLB capIdentity is — flag
  for a future ticket if that turns out to matter.
- **One pre-existing test needed its expectation updated**, not just new
  tests added: `Edit Team > round-trips farm cap identity independently
  through updateTeam` (team-1, no stored capIdentity, only farm fields
  touched) previously asserted the untouched MLB section still got rebuilt
  to a default all-zero object. That was exactly the coupling this ruling
  fixes — under the new dirty-guard, an untouched MLB section preserves
  `editingTeam.capIdentity` verbatim, which for team-1 is `undefined`, not a
  rebuilt object. Updated the assertion to `capIdentity: undefined` with an
  inline comment explaining why. No other existing test's capIdentity
  behavior was exercised/asserted, so nothing else needed changing.
- **`identityCapShift` already short-circuits on `rawShift`** (leagueConstruction.ts) — the
  archetype read-only preview reuses this untouched engine function rather
  than adding new math. The bug was purely that `normalizeCapIdentity` (Teams
  page, local) dropped `rawShift` when seeding the edit form, and
  `handleSave` never preserved it. Fixed at the local-file level per the
  guardrail (no `src/engines/` touch).
- **Dirty-guard granularity is MLB-only, matching the ruling text literally.**
  The tracked ref (`capIdentityTouchedRef`) is set only by the three MLB-side
  mutators (`updateCapIdentityPriority`, `updateCapIdentityMod`,
  `suggestCapIdentityFromPriorities`); the farm mutators do not touch it, so
  a farm-only edit does not count as "touching" the MLB identity section.
- No UNKNOWNs hit; no scope renegotiation needed.
