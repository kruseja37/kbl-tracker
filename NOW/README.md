# NOW — start here, always

**This folder is the single entry point for picking up KBL Tracker work on any day.** Everything in it is either this index or a live link to a canonical file — there are NO copies here, so nothing in this folder can rot. If any document in the project disagrees with this index, this index gets fixed the same day (report it); if any document disagrees with `git log`, git wins.

**Pristineness contract:** the scribe updates the underlying files after every landing and verifies this index on every booking pass. Last verified: 2026-07-09 (this pass — all 14 links resolve; TAXPRECISION/FLOORREFIT/STALEPARITY/ARCHLOCK booked into the underlying docs; no new canonical doc needed adding or retiring this pass).

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
