# MERGE CERTIFICATION — 2026-07-08
**Answers JK's question "are we certain we don't have v1 builds/specs on orphaned branches — are we fully merged?" Method: `git rev-list` ancestry over 124 branches + 42 worktrees, then function-level content tracing (not ancestry alone) for every branch with commits ahead of origin/main, cross-referenced against V1_CANON §5 anti-scope and §6 rulings. Full evidence in the sweep transcript; this doc records the verdict + residuals + recovery register.**

## Verdict: NOT fully merged — 4 pockets of genuinely stranded v1 code found
71/124 branches are literal ancestors of main (fully merged). The old draft-economy trunk (PRs #4–18), the Manager-WPA/Optimal-Lineup rebuild lineage, and the liquidity-bidding experimental cluster are all confirmed ON main via the documented ports or richer independent rebuilds. Elimination/playoffs/offseason/legends branches are out-of-v1 per canon §5/§6. But:

## Stranded v1 residuals (recovery register — update Status column in place as lanes land)
| ID | What's stranded | Where | Size | Status |
|---|---|---|---|---|
| R1 | ~30 real GameTracker bug fixes: roster-designation typo silently dropping a player (`bos-ocharijo` vs `bos-ocherio`), reporter double-assignment guard, undo not restoring mojo/fitness/position edits, end-game pitch-count-dismiss abandoning instead of archiving, Franchise Simulate never checking `processCompletedGame` success (silent aggregation failures), POG stat-role breakdown display, pitching-substitution WPA-tracking/replay fixes, bench/bullpen pregame-lineup fixes, one mislabeled shared-GameTracker stale-roster fix (`373804db`) | 8 local `codex/gt-*` branches + `codex/gt-elim-integrated-repair` (non-elim parts) | LARGE — needs per-branch reconcile against main's evolved GameTracker, not literal merge | STRANDED — re-port lane(s) queued after current wave |
| R2 | 4 data-safety fixes: League Builder source-data missing from backup export (`franchiseSaveSlotManifest.ts:769` still `'exclude'`), config-linked-franchise detection (`loadAllFranchiseConfigs`), `RestorePlan` validate-before-write, `/league-builder/draft` redirect | `codex/eod-data-safety` (4 unique commits) | SMALL | STRANDED — high priority (Phase-6 ship gate depends on backup integrity) |
| R3 | 4 season-scope fixes: `persistCurrentSeasonGlobally` multi-franchise isolation, `PostGameSummary` franchiseId fallback, `FranchiseHome` tab-param validation (+1) | `codex/eod-season-scope` (4 of 14 unique; playoff/offseason parts OUT-OF-V1) | SMALL | STRANDED |
| R4 | Post-draft league-copy leak fix: `copyLeaguePoolMembership()` — copying a drafted pool-first league leaks draft output into the copy's draftable pool (this is the already-ticketed AUTH-4 "post-draft-copy leak", now located) | `codex/iter-copy-postdraft` (`84a0a162`) | SMALL | STRANDED |
| R5 | PWA update-check race (reload before new service worker staged) — `SyncModal.tsx` on main is byte-identical to the PRE-fix state | `a87e6da1` on `codex/elimination-lineup-roster-fix` (mislabeled, not elim-scoped) | TINY | STRANDED |
| R6 | D3K error-cause + fielder-position tracking — real scoring-granularity gap, but branch is 5 months stale vs main's rewritten D3K flow | `codex/d3k-fix` | JK JUDGMENT — re-implement fresh for v1, or defer | AWAITING JK |
| R7 | 2 unreachable commits (draft-economy tuning scripts, content superseded, scripts unique) on a detached-HEAD codex worktree | was detached at `cfe3cc8d` | — | RESCUED 2026-07-08: branch `archive/draft-economy-tuning-scripts-e9db` |

## Certified-clean notes (do not re-litigate)
- Main checkout (`~/Projects/kbl-tracker`) sits on stale `codex/auction-economy-clean-pr` with dirty/untracked files — all confirmed byte-identical-or-older vs main, including pre-JK-ruling shill logic JK overruled 2026-07-07. Harmless artifacts; leave alone.
- `wip/mode1-auction-draft-2026-06-30` (reflog-only): superseded by main's forced-fill system (FABLE-C1/C2B/C3).
- `fix/eventlog-boxscore-undercount` code commit: present verbatim on main under `87a59ec0`.
- Five stale Feb-2026 `codex/*` GameTracker branches: superseded by main's rebuilt systems (spot-verified).
- Lane worktrees (`kbl-m1a`…`kbl-m2a`, `kbl-m1d`): live in-flight work, not residue.
