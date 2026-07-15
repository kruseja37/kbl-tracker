# Snake Draft UI Flow Crawl Report

**Date:** 2026-07-12
**Initial verdict:** NOT VERIFIED
**Target device:** iPad landscape, pass-around main device, optional same-room companion devices.

## Crawled path

League Builder -> Draft Setup -> snake room registration -> covered team lens -> private board -> player inspection -> pick -> MLB trade/correction -> MLB recap -> Scout Hire -> farm room (pick corrections, no draft-pick trades) -> farm recap -> staffing -> Franchise Setup -> launch with no schedule -> Living Season schedule entry.

## Broken or illogical paths found

- The primary decision/action and live roster are not simultaneously available at iPad width.
- The active pick disappears in a 176-pick strip.
- COVER THIS DEVICE can automatically reveal private data again.
- Recap removes the final correction path before the user confirms completion.
- Farm correction reports success before durable save and may restore an old board snapshot.
- Error screens for room/staffing/companion writes are terminal or silent instead of retryable.
- Companion setup can produce a seat that cannot authenticate.
- A completed companion room remains claimable and can trap a device in an old draft.
- Post-draft Franchise Setup behaves as a generic pre-draft wizard and contradicts completed draft truth.
- Always-visible explanatory prose violates the Help-Button law on four production surfaces.
- Old snake POC routing and unused pass-cover input remain orphaned.

## Touch / accessibility defects

- Gavel is pointer-only; rank fallbacks and several buttons are undersized for reliable touch.
- Active board tabs, current pick, and selected club lack explicit selected semantics.
- Cover and launch-confirm overlays do not manage focus or inert background content.
- Farm reorder controls are raw triangles with weak affordance.

## Required recrawl gates

1. Clean-origin browser run on current worktree, never a cached PWA origin.
2. 1024x768 and 1180x820 landscape checks.
3. Actual clicks for seat reveal/cover, player inspect, board reorder, draft, correction, trade, recap return/confirm, companion cover/return, and zero-schedule launch.
4. Console errors/warnings captured at each stage.
5. Static focused tests, full relevant test gate, TypeScript, production build, and `git diff --check`.

JK's browser walk is the sole acceptance gate; automation can only make the build ready for that walk.

## Post-repair recrawl — 2026-07-12

**Automated verdict:** READY FOR JK WALK. This is not product acceptance.

- The iPad shell keeps the team board and live decision rail together; the active pick is a
  bounded window instead of a 176-pick wall. At 768, 1024, and 1366 widths the 22 seeded board
  rows showed 0 truncated player names, and the money truth remained a readable 2×2 strip.
- Covered team switching is fail-closed. Cover/leave is durable, a new live pick returns to the
  on-clock team under cover, and companions stay pinned to their authorized team.
- Full-pool search and selection, profile inspection, overall/position ranking, explicit 22-slot
  planning, live roster, Assistant-GM reads, trade/correction, recap return/confirm, MLB→farm,
  staffing, Franchise launch, and later CSV/manual schedule entry are wired.
- Ranking moves alter preference only. Explicit plan membership changes recalculate plan salary,
  tax, fit, chemistry, cushion, and legality. Availability backfill preserves saved rankings.
- Final-pick recap no longer steals the last correction opportunity. Confirm writes one immutable
  manifest and handoff marker; failed or concurrent confirmation remains retryable/fail-closed.
- Farm boards remain fog-safe, with salary fixed to immutable absolute draft slots and no FARM
  draft-pick trades. Hidden farm true-value rows remain excluded while settled salary and morale
  reach Franchise launch.
- The old POC page/engine, unused pass-cover input, and noncanonical route ownership are removed;
  legacy URLs redirect to the shared setup/canonical room.
- Touch targets, selected semantics, focus-managed privacy/confirm overlays, retry states, and
  Help-button placement were repaired on the crawled surfaces.
- The closing hostile walk re-proved both first-click recap confirmations, stale-assignment
  recommit, all 20 clubs `ROSTERS READY`, exact 440 MLB + 200 farm persistence, created-franchise
  entry, and the empty Living Season schedule with `Add Game` and `Review CSV`. MLB/farm recaps
  measured 1024/1024, both Franchise Setup steps measured 390/390, and no console/page errors
  appeared.
- Same-name identity chips and farm `FIND PROSPECT` / `TOP` interactions passed dedicated component
  tests and static wiring review. A disposable unfrozen browser fixture violated the immutable
  handoff contract, so it was discarded rather than misreported as live evidence; these two
  controls remain explicit items for JK's sole acceptance walk.

## Final hostile recrawl — 2026-07-14

**Automated verdict:** VERIFIED WITH ZERO REMAINING FINDINGS. READY FOR JK WALK; not product acceptance.

- The independent UI auditor cleared the production main room and companion at 1180x820 and
  430x932 with no overflow, private-data leak, undersized action, console error, broken control,
  or orphaned state found.
- The final responsive/lifecycle Playwright gate passed 17/17. It covers both iPad orientations,
  the narrow companion privacy epoch, full-pool player choice, persistent My Board and derived
  Asst GM Board, exact MLB trade transfer, duplicate-pick prevention, recap/restart, MLB→FARM,
  immutable no-trade FARM authority, staffing, Franchise launch with zero schedule rows, and
  later manual and CSV schedule entry.
- The final serial repository gate passed 686 files with 8 skipped (694 total): 10,227 tests
  passed, 15 skipped (10,242 total), zero failed. Strict changed-file lint, TypeScript,
  production build, and diff integrity are green on code commit `f8ca392d`.
- FINDING-152 through FINDING-185 in the Snake lane are fixed and independently verified.

JK's own hands-on browser walk remains the sole visual and product acceptance gate.
