# CONTRACT: COPYFIX — league lifecycle integrity (ghost ids · stranded copy fix · rankOverrides · farm guard)

**Lane:** codex/copyfix-2026-07-09 (worktree /private/tmp/kbl-copyfix, base main @ 0fcb2cf7 — includes FLOORREFIT + STALEPARITY).
**Builder:** Codex (medium). **Rules:** work ONLY in this worktree; commit here; do NOT push or merge; an independent auditor reviews after. Any UNKNOWN or mid-build surprise = STOP and report; do not improvise scope. Repro-first on every item: the failing test is committed BEFORE its fix.

## WHY (adversarially-verified integrity sweep, 2026-07-09 — full record: spec-docs/SETUP_DRAFT_INTEGRITY_AUDIT_2026-07-09.md + raw evidence spec-docs/data/integrity-sweep-2026-07-09-raw.json)
Four confirmed league-lifecycle hazards, one of which has an already-audited fix stranded off main.

## ITEM 1 — ghost team ids (sweep SEATS-02 + SEATS-01)
Deleting a team never prunes it from `league.teamIds`. Consequences: (a) `duplicateLeague` consumes the raw list, `getTeam` returns null for the ghost, and the Duplicate League button becomes a PERMANENT silent dead button (no error surfaced); (b) the phantom club inflates the team count feeding the pool-affordability diagnostics.
Fix: (i) team deletion prunes the id from every league's teamIds; (ii) league LOAD normalizes: filter teamIds against actually-existing teams (heals already-damaged leagues); (iii) duplicateLeague failure paths surface a real user-visible error instead of silently doing nothing.
Repro: create league → delete a member team → assert teamIds still contains the ghost (fails post-fix inverted: write the test asserting the CORRECT behavior, show it red first); duplicate-league on a ghosted league → assert it either succeeds (post-normalize) or errors visibly, never silent no-op.

## ITEM 2 — port the stranded post-draft copy fix (sweep SEATS-06)
Duplicating a league whose pool-first draft is COMPLETE contaminates the copy's draftable pool with the source draft's won MLB players and minted farm prospects (degenerate pool). The fix was ALREADY BUILT AND AUDITED but never reached main: commit **84a0a162** (exists in the local object store — `git log --all --oneline | grep 84a0a162` / `git show 84a0a162` to inspect). Port it faithfully onto current main: cherry-pick if clean; otherwise manual port preserving its audited semantics exactly. If its semantics conflict with anything that landed since (check `useLeagueBuilderData.ts:402,506` deliberate basis-clears from STALEPARITY-era and the current duplicateLeague shape), STOP and report rather than guessing.
Repro: complete-ish pool-first league fixture → duplicate → assert the copy's pool contains NO source-draft-won players / minted prospects (red pre-port).

## ITEM 3 — copies keep GM board preferences (sweep F5)
`duplicateLeague` hand-reconstructs each copied team's `rosterDesign`, silently dropping `rankOverrides` (the GM's per-slot ranking preferences that feed buildBest22Target's slot-preference bonus). Fix: carry `rankOverrides` through the copy. KEEP the `lockedAt` drop (intentional — a fresh copy shouldn't start pre-locked); add a comment saying so.
Repro: team with rankOverrides → duplicate → assert overrides present in the copy (red pre-fix).

## ITEM 4 — the farm-session guard hole (sweep SEATS-04)
The saved-auction mutation guard used on the Teams/Leagues/Players pages checks only the MLB auction session — a live FARM auction (saved, not AUCTION_COMPLETE) blocks nothing: teams/leagues/players are freely editable mid-farm-draft, including the very identity fields the farm floor prices off. Fix: extend the guard to treat an in-progress FARM session exactly like an MLB one (same message pattern; find the guard util and every page consuming it). Do NOT change what the guard blocks — only WHEN it engages.
Repro: fixture an in-progress farm session → assert Teams-page mutation is blocked (red pre-fix).

## GUARDRAILS
File surface expectation: src/utils/leagueBuilderStorage.ts (+ its tests), src/src_figma/app/pages/LeagueBuilderLeagues.tsx, the mutation-guard util + its consuming pages (LeagueBuilderTeams.tsx guard WIRING only — do not touch the TEAMIDGUARD identity logic), src/src_figma/hooks/useLeagueBuilderData.ts if the load-normalize lands there. NOT in scope: any auction engine, floor pages, DraftSetup, the gauntlet worktree. If Item 2's port drags in more surface, STOP and report. Known batch flake: LeagueBuilderDraftSetup.test.tsx — you should not touch it; judge SOLO if somehow forced. Storage changes must respect the established norms: spread-based normalization (never field-by-field reconstruction that drops unknown fields), and check whether teamIds pruning interacts with the save-slot/backup registries (memory: new stores need registry entries; you are NOT adding stores, only mutating within existing ones — verify no registry impact and say so).

## GATES (paste real outputs into this contract)
1. npx tsc -b clean; 2. npm run build exit 0; 3. Focused suites: every leagueBuilder* test file (the folder sweep, ~209+ tests), LeagueBuilderLeagues/Teams page tests, useLeagueBuilderData tests if present, and the new repro tests. Do NOT run the full vitest suite.

## DELIVERABLE
Commits in order: contract update (this file already committed by captain — extend, don't delete) → per-item failing-repro commit(s) BEFORE each fix → fixes → final contract update with per-item file:line evidence, repro red→green outputs, the Item 2 port provenance (cherry-pick vs manual + any adaptation), gate outputs, honestly-flagged deviations. Final message: summary + hashes + surprises.
