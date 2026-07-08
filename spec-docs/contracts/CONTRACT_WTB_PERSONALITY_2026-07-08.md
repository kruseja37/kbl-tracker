# CONTRACT — LANE WT-B: Personality taxonomy bug fixes + weighted distribution (2026-07-08)

You are a builder on the KBL Tracker repo (React+TS+Vite+IndexedDB tracker for Super Mega
Baseball 4). You are working in an isolated git worktree (your cwd) on your own branch off main.
Deliver LANE WT-B: personality taxonomy bug fixes + a JK-ruled weighted personality distribution.
Commit in your worktree branch when green; do NOT push, do NOT merge — the captain merges after
an adversarial audit.

## SETUP (do this first)

1. Your worktree has no node_modules. Clone it:
   `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules` (APFS clone, fast).
2. Write this entire contract to `spec-docs/contracts/CONTRACT_WTB_PERSONALITY_2026-07-08.md` and
   include it in your commit.

## CANONICAL FACTS (tracer-verified)

The 7 canonical personalities are Egotistical, Competitive, Tough, Relaxed, Jolly, Timid, Droopy
(`src/engines/salaryCalculator.ts:51`; uppercase mirror in `src/engines/masterMoraleMatrix.ts:11`
with `CANONICAL_PERSONALITIES` at `:264` and `LEGACY_PERSONALITY_RECONCILIATION` at `:274` —
unknown values fall through to RELAXED at `:575`). The 5 canonical chemistry types are
Competitive, Crafty, Disciplined, Scholarly, Spirited (`src/data/traitPricing.ts:21`). Chemistry
assignment is quota-enforced and correct everywhere — DO NOT touch any chemistry mechanism
(`rebalanceProspectChemistryToTarget`, `buildChemistryAssignments`,
`CHEMISTRY_TARGET_DISTRIBUTION`).

## CHANGE 1 (JK ruling 2026-07-08): weighted personality draw — slight tilt away from Droopy and Timid

JK: "fair random is fine, but we need a slight tilt away from droopy and timid, which are coming
up a bit too often" (they're risky personality types for development/relationships). Ruled design
(captain-specified): weighted random draw (NOT quota-enforced), target weights: Droopy 0.10,
Timid 0.10, and Egotistical/Competitive/Tough/Relaxed/Jolly 0.16 each (sums to 1.00).

Do:

a. Define the weights + a seeded weightedPick helper next to `PERSONALITY_POOL` in
   `src/utils/prospectScoutingDraftEngine.ts` (~line 389; the existing uniform
   `pick(seed, values)` is at `:629` using `randomUnit(seed)` — build the weighted version on the
   same seeded `randomUnit` so results stay deterministic per seed). Export both for reuse.
b. Replace the uniform personality draw at BOTH live assignment sites:
   - `src/utils/prospectScoutingDraftEngine.ts:1525` (buildCandidate:
     `personality = pick(seed, PERSONALITY_POOL)`) → weighted pick.
   - `src/engines/leaguePoolAxisRegen.ts:97` (regenerateLeaguePoolPlayerAxes:
     `personality = pick(seed, PERSONALITY_CHOICES)`) → weighted pick (PERSONALITY_CHOICES =
     PERSONALITY_POOL per `:15`; import the weighted helper).
c. Tests: add a seeded, deterministic distribution test in
   `src/engines/__tests__/leaguePoolAxisRegen.test.ts` (model it on the chemistry tolerance test
   at `:103`): regenerate a large pool (500+ players, fixed seed) and assert Droopy and Timid
   shares each land near 10% and each of the other five near 16%, with a tolerance wide enough to
   be flake-proof under the fixed seed (since it's seeded, you can even assert the exact counts
   you observe — prefer a ±3% band around targets so the test documents intent). Add a matching
   test for the prospect engine path if one doesn't exist.

## CHANGE 2: three taxonomy bugs (mechanical, JK-acknowledged)

a. `src/src_figma/app/pages/Builder.tsx:244` — PERSONALITIES array has only 6 of 7 (missing
   "Competitive"). Add it. Also fix the round-trip guard at `:749`
   (`PERSONALITIES.includes(record.personality) ? record.personality : "Relaxed"`) which currently
   coerces a legitimate stored "Competitive" to "Relaxed" — adding Competitive to the array fixes
   both; verify no other 6-item copies in that file.
b. `src/utils/leagueBuilderStorage.ts:74` — the Personality type is a stray 11-value union (7
   canonical + 4 chemistry words: Crafty, Disciplined, Scholarly, Spirited leaked in). Narrow it
   to the canonical 7. Then fix the two surfaces that inherited the bad list:
   `src/src_figma/app/pages/LeagueBuilderPlayers.tsx:62` (11-item edit dropdown) and
   `src/utils/franchisePlayerProfileEdit.ts:21` (FRANCHISE_PROFILE_PERSONALITIES, feeding
   `TeamHubContent.tsx:3869` and its validator at `franchisePlayerProfileEdit.ts:311`) — both
   become the canonical 7.
   MIGRATION CARE: persisted players may already carry chemistry-word personalities picked from
   the bad dropdowns. On form load/validate, normalize off-list values instead of crashing or
   silently rejecting: reuse the reconciliation idea from masterMoraleMatrix.ts
   LEGACY_PERSONALITY_RECONCILIATION (`:274`) — Crafty/Disciplined/Spirited appear there; anything
   unmapped (e.g. Scholarly) falls back to Relaxed, matching the morale engine's own `:575`
   fallback. Run `npx tsc` early — narrowing the union may surface other compile sites; fix them
   consistently with the canonical 7.
c. `src/src_figma/app/components/DraftFlow.tsx:808-809` — at draft-commit time every prospect is
   saved with personality AND chemistry hardcoded to "Competitive" (the on-screen personality
   words at `:31` are a fake 4-item list: LEADER/COMPETITIVE/CALM/HOTHEAD). This flow is currently
   dark (`FranchiseHome.tsx:181` FRANCHISE_V1_OFFSEASON_EXECUTION_ENABLED=false) but must not ship
   broken: replace the hardcodes with real draws — personality via the new weighted pick,
   chemistry via a seeded uniform pick from the canonical 5 (this dark flow doesn't need the quota
   system). Fix or remove the fake display list at `:31` so what's shown matches the canonical
   taxonomy (simplest correct move: display the actually-assigned canonical personality). Keep the
   change minimal — this flow is deferred; correctness over polish.

## GATES (all must pass before commit; paste real output in your report)

1. `npx tsc -b --pretty false` — exit 0.
2. `npm run build` — exit 0.
3. Focused suites: `NODE_ENV= npx vitest run src/engines/__tests__/leaguePoolAxisRegen.test.ts`
   plus the prospectScoutingDraftEngine test suite, plus any suites covering Builder.tsx /
   LeagueBuilderPlayers.tsx / franchisePlayerProfileEdit / DraftFlow (grep src for their test files
   and run them). Some franchise copy is test-characterized — if a characterization test locks the
   old 11-item list, update the test to the canonical 7 and say so in your report.

DO NOT run the full vitest suite (captain runs it once post-merge; three lanes share this
machine).

Commit message:
`fix(personality): canonical-7 taxonomy everywhere + weighted draw tilting away from Droopy/Timid [WT-B]`
with trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## REPORT

Report back (final message): branch + worktree path + commit hash; per-change file:line summary;
the exact observed distribution from your seeded test; every compile site the union-narrowing
touched and how you resolved each; verbatim gate outputs (tails fine); surprises. If anything in
this contract contradicts the code you find, STOP that item and report the discrepancy instead of
improvising.

---

## AS-BUILT NOTES (added by the builder, 2026-07-08)

- Reused the engine's existing private `pickWeighted<T extends string>` helper (was already used
  for bats/throws/arm-slot draws) rather than writing a new weighted-pick implementation — added
  `export` to it and added `PERSONALITY_WEIGHTS` + a `pickWeightedPersonality(seed)` convenience
  wrapper next to `PERSONALITY_POOL`. Both are exported per the contract's "export both for reuse."
- `leaguePoolAxisRegen.ts` now imports `PERSONALITY_WEIGHTS` + `pickWeighted` directly (cast to
  `Array<[Personality, number]>`, same pattern the file already used for the old
  `PERSONALITY_CHOICES` cast) since that call site needs the canonical-typed return, not the
  loosely-typed `string` the convenience wrapper returns.
- `normalizeStoredPersonality()` (new export on `leagueBuilderStorage.ts`) reuses
  `masterMoraleMatrix.normalizePersonality()` + `LEGACY_PERSONALITY_RECONCILIATION` directly (one
  source of truth for the reconciliation table) rather than re-deriving a second mapping table —
  it just translates the UPPERCASE `CanonicalPersonality` result back to the storage layer's
  Title-Case `Personality` values.
- Applied the same migration-care normalization at load time in `LeagueBuilderPlayers.tsx`'s
  `playerToFormData` and `TeamHubContent.tsx`'s `buildProfileEditForm` (not just the
  franchise-profile-edit validator named in the contract) — same class of stale-value display
  glitch on the sibling surface, one-line fix, no behavior risk.
- `DraftFlow.tsx`'s `PrototypeDraftFlow` has a loop variable literally named `pick`
  (`for (const pick of picks)`) that shadows the engine's `pick` export — imported it as
  `pick as pickSeeded` to avoid the collision rather than renaming the loop variable.
- A pre-existing golden-hash characterization test
  (`§10 age draw is isolated from all non-age generated prospect output` in
  `prospectScoutingDraftEngine.test.ts`) broke because it snapshots the entire non-age draft
  output — personality values are now legitimately different under the weighted draw. Verified by
  reverting only the personality-draw line that this is not an isolation regression (the hash
  reverts to the old golden value), then updated the pinned hash to the new baseline with a
  dated comment explaining why.
- Three additional pre-existing tests asserted the OLD broken taxonomy state and were updated
  (contract explicitly authorized this): `franchisePlayerProfileEdit.test.ts` (personality used to
  be reject-on-invalid, now normalizes), and two in `Builder.test.tsx` (a "safe defaults" fixture
  used `personality: "Competitive"` to exercise the fallback path — that value is now legitimate,
  so the fixture was changed to `"Scholarly"` to keep testing the fallback; and an option-list
  assertion was missing "Competitive").
