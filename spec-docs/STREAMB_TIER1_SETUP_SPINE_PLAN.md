# Stream-B Tier-1 — setup write spine (#2-6): build plan + OPEN-DECISIONS

> Authored 2026-06-27 by Claude Opus 4.8 (Lane B Captain) from a source-verified per-ticket grounding.
> Companion to `V1_PRE_FREEZE_CHECKLIST.md` Tier-1. All file:line refs are on `claude/v1-draft-ui`.

## Build order (shared-file serialization)
`#2 (seat spine, root)` → `#4+#6 (season-rules home incl. conferences toggle)` → `#3 (shill, independent)`.
- `#2`, `#4`, `#6` all touch `src/types/franchise.ts` + `src/src_figma/app/pages/FranchiseSetup.tsx` → **serialize**.
- `#4` and `#6` share ONE conference config field (`enableConferences`) → **merge into one contract** (define once).
- `#3` touches only `auctionEngineConstants.ts` + the two LeagueBuilder auction pages + `useAuctionDraft.ts` → disjoint.
- Pipeline: build one, ground the next during the build; one Codex at a time per worktree.

## Partition verdicts (all Lane B; NO Lane A edits)
- **#2** seat→owner write: pure setup/config path. Clean.
- **#3** shill: Lane B **with guardrail** — `cpuShillCount` must NOT enter `FranchiseConfig` (Mode-1/Mode-2 boundary); it lives only in the auction session (already persisted via `saveAuctionSession`). It dissolves at auction end.
- **#4** season-rules: config-write is Lane B. **`cadence` is sim-critical** (drives development-checkpoint scheduling, Lane A). SCOPE #4 to the config-write only; the cadence→checkpoint wiring is a deferred Lane-A follow-on.
- **#6** conferences: standings grouping (`useFranchiseData.buildStandings`) is Lane B. The playoff SEEDER needs **no edit** — `franchisePlayoffSeedingReview` reads `conference?` optionally and falls back to a seed-index split when absent (`resolveLeague` line ~104). Lane-B obligation = simply don't pass conference data when the toggle is OFF; the seeder's existing graceful path handles it. NO Lane A file touched.

## OPEN-DECISIONS (conservative defaults taken per AUTH-4; logged for JK; all reversible / §16-tunable)
1. **#2 seat shape** → reuse the existing (currently-dead) `playerAssignments` as `Record<teamId, seatId|'cpu'>`; `buildTeamControlSnapshot` maps seat→`'human'`, `'cpu'`/unmapped→`'ai'`; keep the `selectedTeams` path as a backward-compatible fallback. (No new field, no migration.)
2. **#3 shill scaling formula** → **JK-PENDING (phantom-bidder count, assembly-plan open decision).** Build the MECHANISM (scale-with-size default + override + persist) with a clearly-marked tunable placeholder `max(0, floor(leagueSize/3))`. Override range 0→leagueSize−1 (need ≥1 non-shill). The number is JK's / §16's; the mechanism is what ships.
3. **#3 last-used recall** → do NOT add a separate preference store; `session.config` already persists per auction. (Pre-auction reload reset of the in-memory UI value is the only gap; default to seeding from the scaled default on load.)
4. **#4 cadence/intensity** → persist-as-config-only for v1; DEFER wiring cadence into checkpoint scheduling (Lane A, sim-critical).
5. **#4 checkpoints** → derive-on-read from cadence (pure function), do not store.
6. **#4 extra-innings vocab** → keep the live `Standard`/`Runner on 2nd`/`Sudden Death` enum; map the mock's `play-out`/`runner-2nd` onto it (no third vocabulary).
7. **#4 playoff defaults** → keep the live defaults (4 teams / varied series), not the mock's 6/Bo5.
8. **#6 conferences default** → ON (per Stream-B plan slice 1d). When OFF, accept the existing cosmetic seed-index split for the bracket (a true single-pool bracket is Lane A / v2).

## Sizing corrections vs the checklist
- #2: **M** (not S) — `playerAssignments` is dead; the seat→owner shape must be designed.
- #3: **S** — persistence half already works; only scaling default + reload-seed + override max.
- #4: **M+** — many net-new fields + a handoff-snapshot (`FranchiseRulesSnapshot`) touch + the cadence boundary.
- #6: **S** (not M) — one boolean + one standings-grouping branch; seeder free.
