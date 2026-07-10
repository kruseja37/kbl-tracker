# NOW — start here, always

**What this is:** KBL Tracker is a companion franchise/season tracker for the video game Super Mega Baseball 4 (SMB4) — league setup, live game tracking, and franchise/season stats for real SMB4 play, not a game in itself.

**This folder is the single entry point for picking up KBL Tracker work on any day.** Everything in it is either this index or a live link to a canonical file — there are NO copies here, so nothing in this folder can rot. If any document in the project disagrees with this index, this index gets fixed the same day (report it); if any document disagrees with `git log`, git wins.

**Pristineness contract:** the scribe updates the underlying files after every landing and verifies this index on every booking pass. Last verified: 2026-07-10 (the draft-viability experiment books delivered — PRs #55-#58, D1/SHILLTAX/SNAKE POC/AUCTION REBUILD+CAPFIX; all 14 links below re-checked against `origin/main` HEAD `0b7bfd09` and confirmed resolving; no new canonical doc needed adding or retiring this pass, though `TRADITIONAL_DRAFT_PROGRAM_2026-07-09.md`'s own status note now flags D2-D7 as suspended).

**Same-day update (2026-07-10, scribe booking pass): THE DRAFT-VIABILITY EXPERIMENT IS DELIVERED.** JK ruled the original auction "not viable as-is" after his live test hit a mid-draft biddability collapse (a shill ending at −$400k) and greenlit a two-track experiment. Four PRs now deliver it, all JK-clicked, builder≠auditor held on every lane — full detail: `CONTINUITY_CHECKPOINT.md`'s new top banner. **D1** (#55) made a snake draft settle honestly and be recognized everywhere the auction was. **SHILLTAX** (#56) diagnosed and fixed the collapse itself (shills untaxed, wallets can't go negative). **SNAKE POC** (#57) stood up JK's isolated traditional-draft viability room behind a new Draft Setup Panel-5 button. **AUCTION REBUILD + CAPFIX** (#58) rebuilt the auction to JK's own sequential-nomination design and fixed the small-league cap math that was deadlocking it, landing a verified GO 6/6. Each lane's own pre-merge suite came back clean; a reported post-merge combined-suite certification number could not be independently git-verified by this pass and is deliberately not booked as fact (see `CONTINUITY_CHECKPOINT.md`'s top banner). **The only remaining gate: JK's own side-by-side browser verdict** — play both formats and rule auction / snake / both (`JK_BROWSER_CHECKLIST_2026-07-08.md` §11). The traditional-draft program's D2-D7 lanes are explicitly SUSPENDED, not queued, pending that call; after it, JK has already named the living season as the next priority. See the refreshed "Open JK rulings/questions" list below for the full item set.

**Prior update (2026-07-09, wave-close scribe pass, preserved for history): THE AUCTION WALKTHROUGH WAVE IS COMPLETE.** All five JK-walkthrough lanes (design of record `spec-docs/AUCTION_WALKTHROUGH_WAVE_2026-07-09.md`) shipped as JK-clicked PRs #47-#53 (SETUPHELP, VOICE, PRIVACY, STAKES, ADVISORCOLOR), builder≠auditor held on every lane. Full vitest stayed green throughout (9,451 → 9,504 over the wave); a captain closing-certification run on merged `main` (`68fa54dc`) subsequently finished, board certified GREEN.

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
| 9 | `AI_TEAM_OPERATING_MODEL.md` | The canonical team-protocol doc: JK/Opus/Codex roles, the builder≠auditor triangle, model routing, default-routing rules. |

## Binding design standards (consult before touching UI or draft systems)

- `DRAFT_COCKPIT_DESIGN_2026-07-08.md` — the ratified Asst GM / draft UX design (principles §1 are law; §2.6/§2.7 amendments landed 2026-07-09).
- `DRAFT_SKIN_STANDARD_2026-07-08.md` — the one skin A-to-Z: tokens, recipes, §7 Text Law + ratified classification.
- `AUCTION_FLOOR_REFIT_2026-07-09.md` — the ratified auction-floor layout ruling (table, not a dashboard); governs the FLOORREFIT build.
- `UI_TRUTH_MAP.md` — what actually renders per route (merged ≠ routed).

## Audit records

- `COCKPIT_WIRING_AUDIT_2026-07-08.md` — the full spec-to-wiring sweep behind the §2.6/§2.7 design amendments (10 confirmed gaps, adversarially re-verified).
- `SETUP_DRAFT_INTEGRITY_AUDIT_2026-07-09.md` — the setup→draft integrity sweep (8 confirmed / 10 downgraded / 4 refuted / 17 safe; feeds the STALEPARITY/COPYFIX/GAUNTLET lanes).

## Open JK rulings/questions

- **THE side-by-side draft verdict (new, 2026-07-10, THE open decision).** JK's own browser walk of the rebuilt auction AND the isolated snake-draft POC room, per `JK_BROWSER_CHECKLIST_2026-07-08.md` §11: does the small-league auction feel like an auction end to end; does the tax feel right at 4 vs 8 vs 20 clubs; does the ~1.5×-seat pool regeneration feel snappy and useful; does the snake room (entered only via the Panel-5 START SNAKE DRAFT (POC) button) feel like the better traditional-draft experience. His ruling decides the league format going forward — auction, snake, or both. Nothing in the traditional-draft program continues (D2-D7 stay SUSPENDED) until he rules.
- **New tickets from the draft-viability arc (2026-07-10), all non-blocking:** gate the viability GO as a hard test assertion (currently verified-but-logged, not CI-enforced); remove the leftover debug `console.info` in `LeagueBuilderDraftSetup.tsx` + harden one timing-fragile pool-lock test; broaden the viability harness's seed base over time; a positional-feasibility pre-check for the snake POC's URL-entry edge (bypassing the Panel-5 button on a positionally-thin pool could dead-end late); reframe the snake board's STEAL label as personalized value to your build, not a market-surplus claim. (`CONTINUITY_CHECKPOINT.md` §2/§4, PR #57/#58 audit notes)
- **HDH Royals archetype feel-check** — ARCHLOCK corrected a stale reference-sheet number; the underlying game numbers were already correct and deliberate. Open question is a pure feel gut-check: does HDH Royals feel balanced at its current strength? (`JK_BROWSER_CHECKLIST_2026-07-08.md` §8)
- **Blue-accent tokenization call** — three Draft Setup spots (the arsenal-toggle buttons, the player-edit-panel Save button, the Available Players column accent) are still the app's pre-reskin blue; JK rules per-spot whether to tokenize to the canon palette or keep blue as a deliberate signal color. (`CONTINUITY_CHECKPOINT.md` §3, `MODE1_PUNCHLIST_2026-07-08.md`)
- **Default-orange banner readability check** — a contrast bug on the ON THE CLOCK banner for teams using the app's default orange was found and fixed; JK's eye on a real default-orange team during the walkthrough is the final check. (`JK_BROWSER_CHECKLIST_2026-07-08.md` §8)
- **Historical Legends — eye-test packet #2** — a second round of sample "eye-test" cards for JK to react to is still being prepared, not ready yet. (`JK_BROWSER_CHECKLIST_2026-07-08.md`, "Two open JK rulings elsewhere")
- **Historical Legends — shelf-ceiling / rating-scale question** — parked alongside the eye-test packet; no action needed from JK right now. (`JK_BROWSER_CHECKLIST_2026-07-08.md`, "Two open JK rulings elsewhere")
- **Farm-privacy-parity feel-check (new, wave-close)** — the PRIVACY reveal law only fully covers the MLB advisor whisper; the farm whisper is half-covered per JK's standing farm carve-out. Open question is whether that asymmetry feels right in the browser, or whether it should be pulled forward into a build. (`JK_BROWSER_CHECKLIST_2026-07-08.md` §10, PR #51 audit notes)
- **SETUPHELP legality-line placement check (new, wave-close)** — an embedded legality warning on Draft Setup is also gated behind Help, redundantly covered by the readiness panel; JK's eye confirms the redundancy reads as fine, not as a missing warning. (`JK_BROWSER_CHECKLIST_2026-07-08.md` §10, PR #47 audit notes)
- **Advisor-color tightening nit (new, wave-close)** — ADVISORCOLOR's zero-numbers policy blocks digits but not multiplicative opinion-words ("twice," "double," etc.); an optional tightening pass is queued, not urgent. (`CONTINUITY_CHECKPOINT.md` new top banner, PR #53 residual)
- **Two stray "Room up to" strings (new, wave-close)** — VOICE's money-language law missed two out-of-scope sibling strings outside the auction floor itself: `LeagueBuilderFarmAuctionDraft.tsx` and `AuctionStagePreview.tsx`. Ticketed, not blocking. (`CONTINUITY_CHECKPOINT.md` new top banner, PR #48 audit notes)

## Side projects (live in other locations — links, not symlinks)

- **Historical Legends** (240 real players → archetype shelves): plan of record at
  `/Users/johnkruse/Projects/kbl-historical-player-archetype-backlog/spec-docs/HISTORICAL_LEGENDS_PLAN_2026-07-08.md`
  (its own repo/worktree; eye-test packets and pilot data live beside it in `spec-docs/`).

## How this folder stays truthful

1. The files linked here are the canonical copies in `spec-docs/` — a link always shows the file as it is right now.
2. The scribe agent refreshes the underlying docs after every landing (standing practice since 2026-07-08) and verifies this index each pass — adding new canonical docs, retiring superseded ones.
3. JK's local checkout auto-syncs from `main`, so this folder is current on disk without any manual step.
4. Superseded documents never linger here: when a doc loses canon status, its link is REMOVED the same day and the successor is linked. History stays in git, not in this folder.
