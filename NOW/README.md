# NOW — start here, always

**This folder is the single entry point for picking up KBL Tracker work on any day.** Everything in it is either this index or a live link to a canonical file — there are NO copies here, so nothing in this folder can rot. If any document in the project disagrees with this index, this index gets fixed the same day (report it); if any document disagrees with `git log`, git wins.

**Pristineness contract:** the scribe updates the underlying files after every landing and verifies this index on every booking pass. Last verified: 2026-07-09 (the tax-coherence program books complete — PRs #37-#43, COPYFIX/GAUNTLET/TAXWIRE/FLAKEFIX/POOLFLOOR/TAXENGINE/SETUPTAX; all 14 links below re-checked against `origin/main` HEAD `6fa97d81` and confirmed resolving; the audit-records line already carried both `SETUP_DRAFT_INTEGRITY_AUDIT_2026-07-09.md` and `COCKPIT_WIRING_AUDIT_2026-07-08.md`, and the binding-standards line already carried `AUCTION_FLOOR_REFIT_2026-07-09.md` — verified current, not re-added; no new canonical doc needed adding or retiring this pass).

**Same-day correction (added before this booking PR itself merged — the board was NOT actually clean at `6fa97d81`, it is genuinely clean now):** the "books complete" line above was written without an independent closing full-vitest run. One was subsequently run against that exact HEAD and found **26 deterministic failures across 4 files**, all traced to PR #41 POOLFLOOR's position-supply floors firing on stale, position-poor test fixtures — **zero product bugs**. Fixed test-only (zero product code) by PR #45 FIXTUREFIX (branch `claude/fixturefix-2026-07-09`, independent audit APPROVE) and **now MERGED to `main`** (`29fc3194`, 2026-07-09) — the full suite is genuinely green: 9451 passed / 0 failed. Full record: `CONTINUITY_CHECKPOINT.md`'s AMENDMENT banner.

## Read order for any new agent (or future you)

| # | File (live link in this folder) | What it is |
|---|---|---|
| 1 | `CURRENT_STATE.md` | LIVE HEADER: phase / last done / next action. The 30-second answer to "where are we?" |
| 2 | `CONTINUITY_CHECKPOINT.md` | The cold-start resume doc: board state, in-flight lanes, open gates, queued work. |
| 3 | `V1_BUILD_STATUS.md` | The v1 status source of truth (13-stage table + changelog). Updated in place with every landing. |
| 4 | `V1_CANON_2026-07-07.md` | §6 = the dated ledger of every JK ruling. Rulings here outrank any other doc. |
| 5 | `JK_BROWSER_CHECKLIST_2026-07-08.md` | JK's current acceptance gate: the screen-by-screen walkthrough checklist. |
| 6 | `MODE1_PUNCHLIST_2026-07-08.md` | The working ticket list: landed items + open tickets. |
| 7 | `SESSION_RULES.md` | Non-negotiable operating rules, roles, the builder/auditor triangle. |
| 8 | `PATHWAY_TO_V1_2026-07-07.md` | The plan of record: phases, gates, runbook. |

## Binding design standards (consult before touching UI or draft systems)

- `DRAFT_COCKPIT_DESIGN_2026-07-08.md` — the ratified Asst GM / draft UX design (principles §1 are law; §2.6/§2.7 amendments landed 2026-07-09).
- `DRAFT_SKIN_STANDARD_2026-07-08.md` — the one skin A-to-Z: tokens, recipes, §7 Text Law + ratified classification.
- `AUCTION_FLOOR_REFIT_2026-07-09.md` — the ratified auction-floor layout ruling (table, not a dashboard); governs the FLOORREFIT build.
- `UI_TRUTH_MAP.md` — what actually renders per route (merged ≠ routed).

## Audit records

- `COCKPIT_WIRING_AUDIT_2026-07-08.md` — the full spec-to-wiring sweep behind the §2.6/§2.7 design amendments (10 confirmed gaps, adversarially re-verified).
- `SETUP_DRAFT_INTEGRITY_AUDIT_2026-07-09.md` — the setup→draft integrity sweep (8 confirmed / 10 downgraded / 4 refuted / 17 safe; feeds the STALEPARITY/COPYFIX/GAUNTLET lanes).

## Side projects (live in other locations — links, not symlinks)

- **Historical Legends** (240 real players → archetype shelves): plan of record at
  `/Users/johnkruse/Projects/kbl-historical-player-archetype-backlog/spec-docs/HISTORICAL_LEGENDS_PLAN_2026-07-08.md`
  (its own repo/worktree; eye-test packets and pilot data live beside it in `spec-docs/`).

## How this folder stays truthful

1. The files linked here are the canonical copies in `spec-docs/` — a link always shows the file as it is right now.
2. The scribe agent refreshes the underlying docs after every landing (standing practice since 2026-07-08) and verifies this index each pass — adding new canonical docs, retiring superseded ones.
3. JK's local checkout auto-syncs from `main`, so this folder is current on disk without any manual step.
4. Superseded documents never linger here: when a doc loses canon status, its link is REMOVED the same day and the successor is linked. History stays in git, not in this folder.
